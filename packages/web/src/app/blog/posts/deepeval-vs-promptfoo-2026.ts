import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'DeepEval vs Promptfoo (2026): Which LLM Eval Tool to Pick',
  description:
    'A hands-on DeepEval vs Promptfoo comparison for 2026: install, first eval, metrics catalog, CI integration, red-teaming, RAG support, and license. With real code.',
  date: '2026-06-19',
  category: 'Guide',
  content: `
# DeepEval vs Promptfoo: The Complete 2026 Comparison

If you are shipping anything backed by a large language model in 2026, "it looked fine in the demo" is no longer an acceptable quality gate. You need repeatable, scored, regression-proof evaluation that runs in CI on every pull request — the same way unit tests do for traditional code. Two open-source tools dominate this space: **DeepEval** and **Promptfoo**. Both are free, both are widely adopted, and both solve the same high-level problem — but they approach it from opposite ends of the engineering stack.

DeepEval is **pytest-native**. It treats LLM evaluation as a testing problem, gives you Python assertions with 14+ research-backed metrics (faithfulness, answer relevancy, hallucination, bias, toxicity, G-Eval, and more), and slots directly into the test suite you already run. Promptfoo is **CLI-first and config-driven**. It treats evaluation as a declarative matrix: you describe prompts, providers, and test cases in a YAML file, run \`promptfoo eval\`, and get a side-by-side comparison grid — plus a first-class adversarial **red-team** mode for security testing.

This guide runs both tools head to head. We cover installation, your first eval in each, the full metrics catalog, CI integration, red-teaming, RAG support, and licensing — with real, runnable code for both. By the end you will know exactly which one belongs in your stack, or whether (as many teams do) you should run both. If you are evaluating RAG pipelines specifically, pair this with our [DeepEval vs Ragas comparison](/blog/deepeval-vs-ragas-rag-evaluation-2026) and the [complete Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide).

## TL;DR: The 30-Second Verdict

Choose **DeepEval** if your team thinks in code, lives in pytest, and wants component-level metrics (per-retrieval-node faithfulness, contextual recall) wired into the same CI gate as your unit tests. Choose **Promptfoo** if you want a fast, language-agnostic way to compare prompts and models in a matrix, want red-teaming out of the box, and prefer declarative YAML over Python. Many teams run **both**: DeepEval for granular quality gates in Python services, Promptfoo for prompt/model selection and security scanning.

| Decision factor | Winner | Why |
|---|---|---|
| You already use pytest | DeepEval | Native \`assert_test\` integration |
| Comparing many prompts/models fast | Promptfoo | Declarative matrix in one YAML |
| Adversarial security testing | Promptfoo | Built-in red-team plugins |
| Component-level RAG metrics | DeepEval | Per-node contextual metrics |
| Non-Python codebase | Promptfoo | Language-agnostic CLI |
| Self-explaining metric scores | DeepEval | G-Eval reasoning traces |

## Installation and Setup

DeepEval installs as a Python package and is driven entirely through pytest or its own \`deepeval test run\` wrapper.

\`\`\`bash
# DeepEval
pip install -U deepeval

# Set the judge model key (DeepEval uses an LLM-as-judge under the hood)
export OPENAI_API_KEY="sk-..."

# Optional: log in to Confident AI for hosted dashboards
deepeval login
\`\`\`

Promptfoo installs as a Node package (or runs zero-install via npx) and is driven from the command line against a YAML config.

\`\`\`bash
# Promptfoo — run without installing
npx promptfoo@latest init

# Or install globally
npm install -g promptfoo

# Set provider keys
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
\`\`\`

The philosophical split is visible from the first command: DeepEval asks you to write Python, Promptfoo asks you to write YAML. Neither requires a hosted account to run locally, though both offer optional cloud dashboards (Confident AI for DeepEval, Promptfoo Cloud for Promptfoo).

## Your First Eval in DeepEval

DeepEval test cases are Python objects. You construct an \`LLMTestCase\`, pick one or more metrics, and assert. Here is a minimal answer-relevancy and faithfulness check for a RAG answer.

\`\`\`python
# test_rag_answer.py
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric


def test_support_bot_answer():
    test_case = LLMTestCase(
        input="What is the refund window for digital orders?",
        actual_output="Digital orders can be refunded within 14 days of purchase.",
        retrieval_context=[
            "Refunds for digital goods are available within 14 days.",
            "Physical goods have a 30-day return policy.",
        ],
    )

    answer_relevancy = AnswerRelevancyMetric(threshold=0.7)
    faithfulness = FaithfulnessMetric(threshold=0.8)

    assert_test(test_case, [answer_relevancy, faithfulness])
\`\`\`

Run it like any pytest suite:

\`\`\`bash
deepeval test run test_rag_answer.py
# or simply
pytest test_rag_answer.py
\`\`\`

Each metric returns a 0–1 score and a natural-language reason. If a score falls below its threshold, the test fails — exactly like \`assert response.status_code == 200\`. This is what "pytest-native" means in practice: zero new mental model for anyone who has written a Python test.

## Your First Eval in Promptfoo

Promptfoo's unit of work is the config file. You declare prompts, providers, and tests, then run the CLI. Here is a \`promptfooconfig.yaml\` that compares two models on the same prompt with assertions.

\`\`\`yaml
# promptfooconfig.yaml
description: 'Support bot prompt comparison'

prompts:
  - 'Answer the customer question concisely: {{question}}'

providers:
  - openai:gpt-4o-mini
  - anthropic:claude-3-5-haiku-20241022

tests:
  - vars:
      question: 'What is the refund window for digital orders?'
    assert:
      - type: contains
        value: '14 days'
      - type: llm-rubric
        value: 'The answer is polite and directly addresses the refund window'
      - type: latency
        threshold: 3000
  - vars:
      question: 'Do you offer phone support?'
    assert:
      - type: not-contains
        value: 'I cannot help'
\`\`\`

Run the matrix and open the visual diff:

\`\`\`bash
promptfoo eval -c promptfooconfig.yaml
promptfoo view
\`\`\`

The \`promptfoo view\` web UI renders a grid: rows are test cases, columns are providers, cells show pass/fail per assertion. This side-by-side matrix is Promptfoo's signature strength — choosing between three models across twenty prompts is a single config edit, not twenty Python files.

## Metrics Catalog Compared

DeepEval ships a deep library of research-backed metrics. Promptfoo ships a broad set of assertion types, including its own LLM-rubric grader. The table below maps the most common evaluation needs to each tool.

| Evaluation need | DeepEval metric | Promptfoo assertion |
|---|---|---|
| Answer relevance | \`AnswerRelevancyMetric\` | \`llm-rubric\` / \`answer-relevance\` |
| Faithfulness / grounding | \`FaithfulnessMetric\` | \`context-faithfulness\` |
| Hallucination | \`HallucinationMetric\` | \`llm-rubric\` |
| Contextual precision | \`ContextualPrecisionMetric\` | \`context-relevance\` |
| Contextual recall | \`ContextualRecallMetric\` | \`context-recall\` |
| Bias | \`BiasMetric\` | red-team \`bias\` plugin |
| Toxicity | \`ToxicityMetric\` | red-team \`harmful\` plugins |
| Custom rubric | \`GEval\` | \`llm-rubric\` |
| Exact/substring match | \`assert keyword\` | \`equals\` / \`contains\` |
| JSON schema validity | custom | \`is-json\` / \`javascript\` |
| Latency budget | external | \`latency\` |

DeepEval's standout is **G-Eval** — a metric where you describe evaluation criteria in plain English and it uses chain-of-thought LLM scoring with a transparent reasoning trace.

\`\`\`python
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

correctness = GEval(
    name="Correctness",
    criteria="Determine whether the actual output is factually "
    "correct and complete based on the expected output.",
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    threshold=0.7,
)

case = LLMTestCase(
    input="Capital of Australia?",
    actual_output="The capital of Australia is Sydney.",
    expected_output="The capital of Australia is Canberra.",
)
correctness.measure(case)
print(correctness.score, correctness.reason)
\`\`\`

Promptfoo's equivalent is the \`llm-rubric\` assertion — same idea (LLM judges against your criteria), expressed in YAML rather than Python.

## CI Integration

Both tools are built for continuous integration, but the wiring differs.

DeepEval, being pytest-native, plugs into any CI that runs pytest. A GitHub Actions job looks like a normal Python test job:

\`\`\`yaml
# .github/workflows/llm-eval.yml
name: LLM Eval
on: [pull_request]
jobs:
  deepeval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -U deepeval pytest
      - name: Run DeepEval suite
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: deepeval test run tests/ --use-cache
\`\`\`

Promptfoo runs as a CLI step and can fail the build when assertions regress. It also outputs JSON for artifact storage.

\`\`\`yaml
# .github/workflows/promptfoo.yml
name: Promptfoo Eval
on: [pull_request]
jobs:
  promptfoo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Run Promptfoo
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: |
          npx promptfoo@latest eval -c promptfooconfig.yaml \\
            --output results.json --no-progress-bar
      - uses: actions/upload-artifact@v4
        with:
          name: promptfoo-results
          path: results.json
\`\`\`

The practical difference: DeepEval fits teams that want LLM checks alongside unit tests in one pytest gate. Promptfoo fits teams that want a dedicated prompt-quality stage with stored matrix artifacts they can diff over time.

## Red-Teaming and Adversarial Testing

This is where the tools genuinely diverge in capability. Promptfoo ships a first-class **red-team** mode that auto-generates adversarial inputs across dozens of attack categories — prompt injection, jailbreaks, PII leakage, harmful content, and more.

\`\`\`yaml
# redteam.yaml
description: 'Adversarial scan of support bot'

targets:
  - id: openai:gpt-4o-mini
    label: support-bot

redteam:
  purpose: 'A customer support assistant for an e-commerce store'
  numTests: 10
  plugins:
    - harmful:hate
    - pii:direct
    - prompt-injection
    - jailbreak
  strategies:
    - jailbreak
    - prompt-injection
\`\`\`

\`\`\`bash
promptfoo redteam run -c redteam.yaml
promptfoo redteam report
\`\`\`

Promptfoo generates attacks, runs them, and produces a vulnerability report graded by severity. For a deep dive on this workflow, see our dedicated [Promptfoo red-teaming guide](/blog/promptfoo-red-teaming-guide-2026).

DeepEval addresses adversarial concerns through dedicated safety metrics (\`BiasMetric\`, \`ToxicityMetric\`, and the DeepTeam companion library) rather than an auto-generating attack engine. If security scanning is a primary requirement, Promptfoo is the stronger out-of-the-box choice; if you want safety metrics expressed as pass/fail pytest gates, DeepEval fits more naturally.

## RAG Pipeline Support

For retrieval-augmented generation, granularity matters. DeepEval offers the **RAG triad** plus component-level metrics that score each stage of the pipeline independently:

- \`ContextualPrecisionMetric\` — are the most relevant chunks ranked highest?
- \`ContextualRecallMetric\` — did retrieval surface everything needed?
- \`ContextualRelevancyMetric\` — is the retrieved context on-topic?
- \`FaithfulnessMetric\` — does the answer stay grounded in context?

\`\`\`python
from deepeval.metrics import (
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    FaithfulnessMetric,
)
from deepeval.test_case import LLMTestCase

case = LLMTestCase(
    input="When was the company founded?",
    actual_output="The company was founded in 2014.",
    expected_output="2014",
    retrieval_context=["Acme Corp was founded in 2014 in Berlin."],
)

metrics = [
    ContextualPrecisionMetric(threshold=0.7),
    ContextualRecallMetric(threshold=0.7),
    FaithfulnessMetric(threshold=0.8),
]
for m in metrics:
    m.measure(case)
    print(m.__class__.__name__, round(m.score, 2))
\`\`\`

Promptfoo supports RAG through context-aware assertions (\`context-recall\`, \`context-relevance\`, \`context-faithfulness\`) attached to test cases. It is fully capable for end-to-end RAG quality gating, but DeepEval's per-component decomposition gives you sharper diagnostics when a pipeline regresses. For metric theory across tools, our [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) is a useful companion.

## Pricing and License

Both tools are genuinely open source and free to self-host.

| Aspect | DeepEval | Promptfoo |
|---|---|---|
| License | Apache 2.0 | MIT |
| Core cost | Free, open source | Free, open source |
| Language | Python | Node.js / CLI (any language target) |
| Hosted option | Confident AI (paid tiers) | Promptfoo Cloud (paid tiers) |
| Judge model cost | You pay your LLM provider | You pay your LLM provider |
| Lock-in risk | Low — runs fully local | Low — runs fully local |

The only running cost in either tool is the LLM-as-judge API spend, since both rely on a judge model to score subjective metrics. You can reduce this with caching (\`--use-cache\` in DeepEval, automatic caching in Promptfoo) or by pointing the judge at a cheaper or local model.

## Dataset Management and Synthetic Data

Real evaluation needs real test cases, and both tools help you build and manage datasets — though they take different routes. DeepEval ships an \`EvaluationDataset\` abstraction plus a synthetic data generator (the \`Synthesizer\`) that produces test cases from your documents, so you can bootstrap a golden dataset without hand-writing hundreds of inputs.

\`\`\`python
from deepeval.dataset import EvaluationDataset
from deepeval.synthesizer import Synthesizer

# Generate synthetic test cases from source documents
synthesizer = Synthesizer()
goldens = synthesizer.generate_goldens_from_docs(
    document_paths=["docs/refund_policy.pdf", "docs/shipping.md"],
    max_goldens_per_context=3,
)

dataset = EvaluationDataset(goldens=goldens)
dataset.push(alias="support-bot-v1")  # optional: store on Confident AI
\`\`\`

Promptfoo manages datasets through its config: test cases live inline in YAML, or you load them from CSV, JSON, or a generated dataset via the \`tests\` key pointing at a file or a \`generate\` directive. This keeps your dataset version-controlled next to the prompts it exercises.

\`\`\`yaml
# Load test cases from an external file
tests: file://tests/support_cases.csv

# Or generate adversarial variations
tests:
  - vars:
      question: '{{ sample }}'
    options:
      transform: file://transforms/paraphrase.js
\`\`\`

The practical takeaway: DeepEval is stronger when you want programmatic, document-grounded synthetic generation in Python; Promptfoo is stronger when you want your dataset to be a plain, diffable file living beside the config. Either way, version your datasets — an eval is only as trustworthy as the cases it runs against.

## Observability and Tracing

Scoring a single output is useful, but production debugging needs traces. DeepEval integrates with observability via its tracing decorators, letting you capture nested LLM calls, tool invocations, and retrieval steps, then attach metrics to spans. This means you can evaluate not just the final answer but each component of an agentic flow. Promptfoo focuses its observability on the eval matrix itself — the \`promptfoo view\` dashboard and JSON output give you a durable, comparable record of every run, which you can diff across commits to spot regressions over time. If your priority is per-span agent debugging, DeepEval's tracing wins; if it is comparing eval runs across model and prompt versions, Promptfoo's matrix artifacts are the better fit.

## When to Choose Which

Use **DeepEval** when:

- Your evaluation logic lives in Python services and you want it in the same pytest gate as unit tests.
- You need component-level RAG metrics to pinpoint where a pipeline regressed.
- You value G-Eval's self-explaining reasoning traces for debugging score changes.

Use **Promptfoo** when:

- You are choosing between prompts or models and want a fast comparison matrix.
- Security and red-teaming are first-class requirements.
- Your codebase is not Python, or you want zero-install evaluation via npx.

Run **both** when you want prompt/model selection and security scanning from Promptfoo, plus granular quality gates from DeepEval. They are complementary, not mutually exclusive. To find ready-made evaluation skills for your AI agents, browse the [QASkills directory](/skills).

## Frequently Asked Questions

### Is DeepEval or Promptfoo better for beginners?

Promptfoo has a gentler on-ramp for non-developers because a useful eval is a single YAML file and \`npx promptfoo eval\` — no Python project required. DeepEval is friendlier for engineers already comfortable in pytest, since the mental model is identical to writing unit tests. Pick based on whether your team prefers config or code.

### Can I use DeepEval and Promptfoo together?

Yes, and many teams do. A common pattern is Promptfoo for prompt and model selection plus red-team security scans, and DeepEval for fine-grained pass/fail quality gates inside Python services. They share no state and do not conflict, so you can adopt one first and add the other later without rework.

### Do these tools need an OpenAI API key to run?

Both default to an LLM-as-judge for subjective metrics, which requires a provider key. However, you can point either tool at any provider — Anthropic, open-weight models via Ollama, or Azure — so you are not locked to OpenAI. Deterministic assertions like substring matching or JSON validity need no judge model at all.

### How much does it cost to run LLM evals in CI?

The tools themselves are free and open source. Your only cost is the judge model's token spend, which scales with the number of test cases times metrics. Caching repeated inputs, using a cheaper judge model, and limiting evals to changed prompts keep typical CI runs to a few cents per pull request.

### Which tool is best for RAG evaluation?

DeepEval has the edge for deep RAG diagnostics because it scores retrieval precision, recall, relevancy, and faithfulness as separate components, so you can see exactly which stage broke. Promptfoo handles end-to-end RAG gating well via context assertions but offers less per-component granularity. Compare approaches in our [DeepEval vs Ragas guide](/blog/deepeval-vs-ragas-rag-evaluation-2026).

### Does Promptfoo support red-teaming that DeepEval doesn't?

Promptfoo ships an auto-generating adversarial engine that creates attacks across categories like prompt injection, jailbreaks, and PII leakage, then grades a vulnerability report. DeepEval covers safety through metrics like bias and toxicity and its DeepTeam companion, but does not auto-generate the same breadth of attacks out of the box. For security-first work, Promptfoo is stronger.

### Are DeepEval and Promptfoo really free?

Yes. DeepEval is Apache 2.0 and Promptfoo is MIT — both fully open source and self-hostable with no feature paywall on the core evaluation engine. Each offers an optional paid cloud dashboard for teams that want hosted reporting, but you never need it to run evaluations locally or in CI.

### How do I add LLM eval gates to my existing pytest suite?

With DeepEval you install the package, build \`LLMTestCase\` objects, attach metrics, and call \`assert_test\` inside ordinary pytest functions. Run with \`deepeval test run\` or plain \`pytest\`. Because it reuses pytest's collection and reporting, it drops into your current CI job with no extra runner — just add the dependency and a secret for the judge model key.

## Conclusion

DeepEval and Promptfoo are the two strongest open-source LLM evaluation tools in 2026, and the choice comes down to your workflow rather than capability gaps. DeepEval wins for pytest-native, component-level quality gates with self-explaining metrics. Promptfoo wins for fast prompt and model comparison matrices and built-in red-teaming. For most serious teams, the answer is not "either/or" but "both, for different jobs."

Whichever you adopt, the principle is the same: treat LLM behavior as testable, scored, and regression-gated — never vibes. Ready to operationalize this? Explore curated evaluation and testing skills for your AI coding agents in the [QASkills directory](/skills), and deepen your RAG evaluation knowledge with our [complete Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide).
`,
};
