import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'OpenAI Evals Complete Guide 2026: Setup, Graders, Datasets',
  description:
    'A complete guide to OpenAI Evals in 2026. Covers installation and CLI setup, building eval datasets, configuring string, model-based, and Python graders, running suites against GPT-5 and o-series models, interpreting results, CI integration, cost optimization, and production patterns for LLM evaluation at scale.',
  date: '2026-05-21',
  category: 'Guide',
  content: `
OpenAI Evals has matured into one of the most widely used evaluation frameworks for large language model applications. What began as an internal tool at OpenAI for measuring model quality is now a production-grade system used by thousands of engineering teams to validate prompts, score agent outputs, prevent regressions, and benchmark new models before deployment. In 2026, with the release of GPT-5, the o-series reasoning models, and a wave of multimodal capabilities, the need for structured evaluation has become a hard requirement rather than a nice-to-have.

This guide walks through everything you need to know to start using OpenAI Evals effectively: how to install and configure the framework, how to build datasets that surface real failures, how to choose between string graders, model-based graders, and Python graders, how to run evaluations against the latest models, how to interpret and act on results, and how to integrate evals into your CI pipeline so quality regressions are caught before they reach production.

## Key Takeaways

- OpenAI Evals provides a structured framework for measuring LLM quality with reproducible datasets, configurable graders, and detailed result reporting
- Three grader categories serve different needs: string graders for exact matches, model graders for nuanced quality assessment, and Python graders for custom logic
- Effective evals start with a small, high-signal golden dataset of 50 to 200 examples before scaling up
- CI integration with the Evals CLI catches prompt regressions and model drift on every commit
- Cost discipline matters: a poorly designed eval can spend hundreds of dollars per run, while a well-designed one stays under five dollars
- The 2026 platform supports trace-level grading, multi-turn agent evals, and reasoning-token cost accounting natively

---

## What OpenAI Evals Is and Is Not

OpenAI Evals is a framework for systematic measurement of language model behavior. You define a dataset of inputs, specify an ideal output or grading criteria, run your prompt or agent against each input, and the framework compares the actual output to your criteria. The result is a quantitative score that you can track over time, compare across model versions, and use to gate deployments.

It is not a hallucination detector, a safety classifier, or a benchmark suite. Those tools exist on top of evals or alongside them. Evals is the plumbing: the dataset format, the grading infrastructure, the runner, and the reporting layer.

In 2026, the framework supports three distinct surfaces:

1. **The open-source \`openai-evals\` Python package** for running evals locally or in your own CI infrastructure
2. **The OpenAI Platform Evals UI** for managing datasets, configuring graders, and visualizing results in a web interface
3. **The Evals API** for programmatic dataset management, eval runs, and result retrieval

Each surface uses the same underlying concepts: datasets, graders, eval configurations, and runs. The difference is the interface you use to interact with them.

---

## Installation and First Run

Setting up Evals takes a few minutes. You will need a Python environment with 3.10 or higher and an OpenAI API key.

\`\`\`bash
# Install the Evals package
pip install openai-evals

# Set your API key
export OPENAI_API_KEY=sk-...

# Verify installation
oaievals --version
\`\`\`

The CLI exposes commands for creating datasets, running evals, and viewing results. The simplest possible eval looks like this:

\`\`\`python
from openai_evals import Eval, StringGrader

eval = Eval(
    name="capital-cities",
    dataset=[
        {"input": "What is the capital of France?", "ideal": "Paris"},
        {"input": "What is the capital of Japan?", "ideal": "Tokyo"},
        {"input": "What is the capital of Brazil?", "ideal": "Brasilia"},
    ],
    grader=StringGrader(match_type="contains"),
    model="gpt-5",
)

results = eval.run()
print(f"Accuracy: {results.accuracy:.1%}")
\`\`\`

This snippet defines a three-example dataset, runs it against GPT-5, and grades each response using substring matching. In practice you will use larger datasets and more sophisticated graders, but the pattern stays the same.

The TypeScript equivalent uses the official Node SDK:

\`\`\`typescript
import { Evals, StringGrader } from '@openai/evals';

const evaluation = new Evals({
  name: 'capital-cities',
  dataset: [
    { input: 'What is the capital of France?', ideal: 'Paris' },
    { input: 'What is the capital of Japan?', ideal: 'Tokyo' },
    { input: 'What is the capital of Brazil?', ideal: 'Brasilia' },
  ],
  grader: new StringGrader({ matchType: 'contains' }),
  model: 'gpt-5',
});

const results = await evaluation.run();
console.log(\`Accuracy: \${(results.accuracy * 100).toFixed(1)}%\`);
\`\`\`

---

## Dataset Design

The dataset is the foundation of an eval. A small, well-curated dataset is more valuable than a large, noisy one. Aim for 50 to 200 examples that cover the failure modes you actually care about.

### Sourcing Examples

The best examples come from real user traffic. Pull anonymized requests from production logs, look for cases where the agent failed or produced low-confidence responses, and convert them into eval examples. Synthetic examples generated by another LLM can supplement real data but should not replace it entirely.

### Dataset Schema

Each example is a JSON object. At minimum you need an \`input\` field and either an \`ideal\` field (the expected output) or grading metadata that lets the grader assess quality without an explicit gold answer.

\`\`\`json
{
  "input": "Summarize the Q3 earnings call in three bullet points",
  "ideal": "- Revenue up 12% year-over-year\\n- Operating margin expanded to 28%\\n- Guidance raised for FY2026",
  "context": "Acme Corp Q3 2026 earnings call transcript...",
  "tags": ["finance", "summarization", "structured-output"]
}
\`\`\`

Tags are critical. They let you filter results and identify which categories of inputs are performing well or poorly.

### Dataset Versioning

Datasets evolve. Track them in version control alongside your code. The Evals platform supports dataset versioning natively, but exporting to JSONL and committing the file gives you better diff visibility during code review.

\`\`\`bash
# Export a dataset to JSONL
oaievals dataset export capital-cities --format jsonl > datasets/capital-cities.jsonl

# Import after editing
oaievals dataset import datasets/capital-cities.jsonl
\`\`\`

---

## Grader Types in Depth

The grader determines how the framework converts a raw model output into a numeric score. Choosing the right grader is the most important decision in eval design.

### String Graders

String graders apply deterministic rules to the model output. They are fast, cheap, and produce stable results, but they only work when the expected output has a clean textual form.

| Match Type | Behavior | Use Case |
|------------|----------|----------|
| exact | Output must equal ideal exactly | Single-token classifications |
| contains | Ideal must be a substring of output | Open-ended answers with required content |
| regex | Output must match a regex | Format validation |
| starts_with | Output begins with ideal | Structured prefixes |
| fuzzy | Levenshtein distance below threshold | Minor formatting tolerance |

\`\`\`python
from openai_evals import StringGrader

# Strict equality
grader = StringGrader(match_type="exact")

# Required substring
grader = StringGrader(match_type="contains", case_sensitive=False)

# Regex match for JSON-like output
grader = StringGrader(match_type="regex", pattern=r"^\\{.*\\}$")
\`\`\`

### Model Graders

Model graders use another LLM to judge the response. This is the right choice when quality is multidimensional or when the correct answer can be expressed in many ways.

\`\`\`python
from openai_evals import ModelGrader

grader = ModelGrader(
    model="gpt-5",
    prompt=(
        "You are grading a customer support response.\\n"
        "Rate the response from 1-5 on helpfulness, accuracy, and tone.\\n"
        "Return JSON: {\\"score\\": <1-5>, \\"reasoning\\": \\"<explanation>\\"}\\n\\n"
        "Question: {{input}}\\n"
        "Response: {{output}}\\n"
        "Ideal: {{ideal}}"
    ),
    pass_threshold=4.0,
)
\`\`\`

Model graders are powerful but expensive. A grading model call can cost as much as the original generation call, sometimes more if you use a stronger model for grading. Budget accordingly.

### Python Graders

Python graders give you arbitrary code execution. Use them when you need to verify behavior that cannot be expressed in a prompt: syntactic validity of code, structured JSON parsing, tool call correctness, or numerical accuracy with tolerance.

\`\`\`python
from openai_evals import PythonGrader
import json

class JsonSchemaGrader(PythonGrader):
    def grade(self, sample, output):
        try:
            parsed = json.loads(output)
        except json.JSONDecodeError:
            return {"score": 0.0, "reason": "invalid JSON"}

        required = sample.get("required_fields", [])
        missing = [f for f in required if f not in parsed]
        if missing:
            return {"score": 0.5, "reason": f"missing: {missing}"}

        return {"score": 1.0, "reason": "all required fields present"}
\`\`\`

---

## Running Evals Against GPT-5 and o-Series Models

The 2026 platform supports the full GPT-5 family and the o-series reasoning models. Each has different cost and latency characteristics that matter for eval design.

| Model | Input cost/1M | Output cost/1M | Best for |
|-------|---------------|----------------|----------|
| gpt-5 | $5 | $20 | Production graders, general evals |
| gpt-5-mini | $0.40 | $1.60 | High-volume datasets, quick iteration |
| gpt-5-nano | $0.10 | $0.40 | Cheap smoke tests |
| o3 | $15 | $60 | Reasoning-heavy graders, math/code |
| o3-mini | $1.50 | $6.00 | Mid-tier reasoning, planning |

For most eval workloads, gpt-5-mini provides the best cost-quality balance. Use gpt-5 when you observe the smaller model disagreeing too often with human judgment.

### Reasoning Token Accounting

The o-series models emit internal reasoning tokens that count against your output budget but are not visible in the response. Evals 2026 surfaces these costs explicitly:

\`\`\`python
result = eval.run(model="o3-mini")
print(f"Visible tokens: {result.output_tokens}")
print(f"Reasoning tokens: {result.reasoning_tokens}")
print(f"Total cost: \${result.cost:.4f}")
\`\`\`

If reasoning tokens dominate your bill, switch to a cheaper grading model or reduce the number of reasoning passes per item.

---

## Multi-Turn and Agent Evals

Single-turn evals miss most agent failures. Real agent failures emerge from context degradation, tool misuse, and instruction drift across many turns. The 2026 platform supports trajectory evals natively.

\`\`\`python
from openai_evals import TrajectoryEval, TrajectoryGrader

eval = TrajectoryEval(
    name="customer-support-multiturn",
    dataset=[
        {
            "conversation": [
                {"role": "user", "content": "I need a refund for order 12345"},
                {"role": "user", "content": "It was damaged on arrival"},
            ],
            "expected_tools": ["lookup_order", "issue_refund"],
            "expected_outcome": "refund_issued",
        }
    ],
    grader=TrajectoryGrader(
        check_tool_sequence=True,
        check_final_state=True,
    ),
)
\`\`\`

The grader verifies the tools the agent called, the order it called them in, and whether the final conversation state matches the expected outcome.

---

## CI Integration

The real value of evals shows up when they run on every commit. The Evals CLI returns non-zero on failure, which makes it trivial to wire into GitHub Actions, GitLab CI, or any other runner.

\`\`\`yaml
name: LLM Quality Gate
on: [pull_request]

jobs:
  evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Evals
        run: pip install openai-evals

      - name: Run smoke evals
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: |
          oaievals run smoke-suite \\
            --threshold 0.85 \\
            --report-json results.json

      - name: Upload eval results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: eval-results
          path: results.json
\`\`\`

The threshold flag is the gate. If accuracy drops below 0.85, the run fails and the PR is blocked from merging.

---

## Cost Discipline

Evals can spiral in cost if you are not careful. A 500-item dataset with a gpt-5 grader runs in the tens of dollars per execution. Over a week of active development, that adds up.

### Tiered Eval Suites

Structure your evals in tiers:

- **Smoke tier**: 20 to 50 examples, runs on every PR, costs less than $0.50
- **Standard tier**: 200 to 500 examples, runs nightly, costs $2 to $10
- **Full tier**: 1000 plus examples, runs weekly or before releases, costs $20 to $100

\`\`\`python
import os

tier = os.getenv("EVAL_TIER", "smoke")
dataset_path = f"datasets/{tier}.jsonl"
\`\`\`

### Cheaper Grading Models

Use gpt-5-mini or gpt-5-nano as the grader for cost-sensitive runs. Reserve gpt-5 for cases where the cheaper model disagrees with human judgment more than 10 percent of the time.

### Sampling

For very large datasets, sample randomly on each run rather than running every example. Track sample seeds to keep results reproducible.

\`\`\`python
eval.run(sample_size=100, sample_seed=42)
\`\`\`

---

## Interpreting Results

Eval results need more than a single accuracy number. The platform produces a structured report with per-example outcomes, per-tag aggregates, and per-failure-mode breakdowns.

\`\`\`python
results = eval.run()

print(f"Overall accuracy: {results.accuracy:.1%}")
print(f"Total cost: \${results.cost:.2f}")
print(f"Mean latency: {results.mean_latency_ms}ms")

# Per-tag breakdown
for tag, score in results.by_tag.items():
    print(f"  {tag}: {score:.1%}")

# Failure analysis
for failure in results.failures[:10]:
    print(f"  Input: {failure.input[:80]}...")
    print(f"  Expected: {failure.ideal[:80]}...")
    print(f"  Got: {failure.output[:80]}...")
    print(f"  Reason: {failure.reason}")
\`\`\`

The per-tag breakdown is often the most actionable signal. If your overall accuracy is 87 percent but the "edge-case" tag is at 42 percent, you know exactly where to focus improvement work.

---

## Production Patterns

Once you have evals working in CI, the next step is integrating them into production operations.

### Pre-Deployment Gates

Block deploys when eval scores regress. The pattern is straightforward: run the full eval suite against the candidate version of your prompt or agent, compare against the production baseline, and fail the deploy if the delta exceeds a threshold.

\`\`\`python
baseline = load_baseline("production-v1.json")
candidate = eval.run()

delta = candidate.accuracy - baseline["accuracy"]
if delta < -0.02:
    raise DeploymentBlocked(f"Accuracy regressed by {abs(delta):.1%}")
\`\`\`

### Drift Detection

Schedule daily eval runs against your production traffic sample. Plot accuracy over time and alert when it drops more than two standard deviations below the baseline.

### A/B Testing

Run evals against multiple prompt variants simultaneously. The framework supports parallel runs:

\`\`\`python
variants = {
    "control": "You are a helpful assistant. Answer concisely.",
    "v2": "You are a precise assistant. Answer in one paragraph.",
}

for name, prompt in variants.items():
    eval.system_prompt = prompt
    result = eval.run()
    print(f"{name}: {result.accuracy:.1%}")
\`\`\`

---

## Common Pitfalls

### Tiny Datasets

A 10-example dataset has too much noise to detect anything but the most dramatic regressions. Aim for at least 50 examples per scenario you care about.

### Stale Datasets

Datasets that never change become decoupled from production reality. Refresh at least 10 percent of examples each quarter with new traffic.

### Grader Drift

Model graders change behavior when you upgrade them. Pin grader model versions explicitly and treat upgrades as events that require recalibration.

\`\`\`python
grader = ModelGrader(model="gpt-5-2026-04-15", ...)
\`\`\`

### Confusing Correlation with Causation

A higher eval score does not always mean a better user experience. Periodically validate that improved eval scores correlate with improved user metrics like task completion, satisfaction ratings, or downstream conversion.

---

## When to Use OpenAI Evals vs Alternatives

OpenAI Evals is the strongest choice when you are primarily evaluating OpenAI models. The integration is tight, the cost accounting is precise, and the platform features for reasoning tokens, agent trajectories, and multi-modal inputs are first-class.

For multi-provider evaluation, frameworks like Promptfoo or DeepEval may be a better fit because they treat OpenAI as one provider among many. For research-grade benchmarking with academic dataset requirements, lm-eval-harness remains the standard.

---

## Getting Started with QA Agent Skills

Add LLM evaluation patterns directly to your AI coding agent with QA skills:

\`\`\`bash
# Install LLM evaluation and testing skills
npx @qaskills/cli add llm-evaluation
npx @qaskills/cli add ai-agent-testing
npx @qaskills/cli add openai-evals
\`\`\`

Browse 450+ QA skills at [qaskills.sh/skills](/skills) to build a comprehensive evaluation strategy for your LLM applications.
`,
};
