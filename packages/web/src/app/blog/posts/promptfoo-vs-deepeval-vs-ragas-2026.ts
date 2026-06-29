import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Promptfoo vs DeepEval vs RAGAS: LLM Eval Tools (2026)',
  description:
    'A hands-on 2026 comparison of Promptfoo, DeepEval, and RAGAS: install, runnable Python and YAML examples, CI/CD gating, judge-token cost, and when to pick each.',
  date: '2026-06-29',
  category: 'Comparison',
  content: `
# Promptfoo vs DeepEval vs RAGAS: Choosing an LLM Eval Framework in 2026

If you ship anything backed by a large language model in 2026, "it looked fine in the demo" is no longer an acceptable quality bar. Prompts drift, models get silently upgraded by your provider, retrieval pipelines rot as your knowledge base grows, and a one-line change to a system prompt can quietly tank faithfulness across half your traffic. The only way to catch this before your users do is to evaluate LLM output the same way you test any other software: automatically, repeatably, and inside CI.

Three open-source frameworks dominate that space today: **Promptfoo**, **DeepEval**, and **RAGAS**. They overlap enough that teams constantly ask which one to adopt, but they were each designed around a different center of gravity. Promptfoo is a CLI-and-YAML tool built for rapidly comparing prompts and models side by side and for red-teaming. DeepEval brings a pytest-style developer experience with a deep catalog of metrics like Answer Relevancy, Faithfulness, Hallucination, and G-Eval. RAGAS is the specialist: the deepest open metric library for retrieval-augmented generation, with faithfulness, context precision, context recall, and noise sensitivity.

This guide walks through what each tool is actually for, how to install it, runnable examples you can paste into a project today, how to gate a CI pipeline on each, and the cost of the judge-model tokens these evaluations burn. By the end you will know which to reach for, and why most serious teams in 2026 end up running two of them rather than picking just one. If you are assembling a broader QA stack for AI systems, browse the [QA skills directory](/skills) for agent-ready testing skills that complement these frameworks.

## The 30-Second Summary

| Tool | Primary job | Interface | Sweet spot | Language |
|---|---|---|---|---|
| Promptfoo | Compare prompts/models, red-team | CLI + YAML config | Pre-production prompt iteration, security probing | YAML (+ JS/Python hooks) |
| DeepEval | Unit-test LLM outputs | pytest-style Python | App-level assertions in CI, broad metric catalog | Python |
| RAGAS | Measure RAG quality | Python library | Retrieval pipelines, context-grounded metrics | Python |

A useful mental model: Promptfoo is the spreadsheet you use to decide which prompt and model to ship. DeepEval is the test suite that keeps the shipped behavior from regressing. RAGAS is the microscope you point at your retrieval layer when answers are wrong but you do not yet know whether the prompt or the documents are at fault.

## What Promptfoo Is For

Promptfoo treats evaluation as a declarative config problem. You describe your prompts, the providers (models) you want to run them against, the test cases, and the assertions, all in a single YAML file. Then \`promptfoo eval\` runs the full matrix and \`promptfoo view\` opens a web UI that shows you a side-by-side grid: every prompt-by-model-by-test combination, pass/fail, latency, and token cost. For the "which model should we use" and "did my new prompt make things better or worse" questions, nothing else is as fast.

### Installing Promptfoo

Promptfoo ships as an npm package and runs as a CLI, so no global install is strictly required:

\`\`\`bash
# Run without installing
npx promptfoo@latest init

# Or install globally
npm install -g promptfoo
promptfoo --version
\`\`\`

### A runnable Promptfoo config

Create \`promptfooconfig.yaml\`. This compares two prompts across two models and asserts on the output:

\`\`\`yaml
description: 'Customer support tone and accuracy'

prompts:
  - 'You are a support agent. Answer concisely: {{question}}'
  - 'You are a friendly support agent. Be warm and helpful: {{question}}'

providers:
  - openai:gpt-4o-mini
  - anthropic:messages:claude-3-5-haiku-20241022

tests:
  - vars:
      question: 'How do I reset my password?'
    assert:
      - type: contains
        value: 'reset'
      - type: llm-rubric
        value: 'The answer explains the password reset steps clearly'
      - type: latency
        threshold: 3000

  - vars:
      question: 'Do you offer refunds?'
    assert:
      - type: not-contains
        value: 'I cannot help'
      - type: llm-rubric
        value: 'The answer is polite and does not refuse to help'
\`\`\`

Run it:

\`\`\`bash
promptfoo eval -c promptfooconfig.yaml
promptfoo view
\`\`\`

The \`llm-rubric\` assertion is a judge-model call: Promptfoo asks a model to grade whether the output satisfies your plain-English rubric. \`contains\`, \`not-contains\`, \`latency\`, \`cost\`, and regex assertions are deterministic and free.

### Red-teaming with Promptfoo

Promptfoo's standout feature in 2026 is built-in red-teaming. It generates adversarial inputs (jailbreaks, prompt injection, PII extraction attempts, harmful-content probes) and reports which ones your system fails:

\`\`\`bash
promptfoo redteam init
promptfoo redteam run
promptfoo redteam report
\`\`\`

This overlaps with the security mindset covered in our guide to [security testing AI-generated code](/blog/security-testing-ai-generated-code) — adversarial input generation is how you find the failure modes a static prompt review will never surface.

## What DeepEval Is For

DeepEval is "Pytest for LLMs." If your team already writes Python tests, DeepEval feels instantly familiar: you write \`test_\` functions, build an \`LLMTestCase\`, choose metrics, and call \`assert_test\`. It ships a large catalog of ready metrics and lets you define custom ones with G-Eval, where you describe evaluation criteria in natural language and DeepEval turns them into a scored judge.

### Installing DeepEval

\`\`\`bash
pip install -U deepeval

# DeepEval uses an LLM judge; set your key
export OPENAI_API_KEY="sk-..."
\`\`\`

### A runnable DeepEval test

Save this as \`test_chatbot.py\` and run it with \`deepeval test run test_chatbot.py\` or plain \`pytest\`:

\`\`\`python
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    HallucinationMetric,
)


def test_password_reset_answer():
    test_case = LLMTestCase(
        input="How do I reset my password?",
        actual_output=(
            "Go to Settings, click Security, then 'Reset password'. "
            "You'll get an email with a reset link valid for one hour."
        ),
        retrieval_context=[
            "Users reset passwords under Settings > Security. "
            "Reset links are emailed and expire after 60 minutes."
        ],
    )

    answer_relevancy = AnswerRelevancyMetric(threshold=0.7)
    faithfulness = FaithfulnessMetric(threshold=0.8)
    hallucination = HallucinationMetric(threshold=0.3)

    assert_test(test_case, [answer_relevancy, faithfulness, hallucination])
\`\`\`

Each metric is scored 0 to 1 by a judge model; \`threshold\` decides pass or fail. \`FaithfulnessMetric\` checks the answer is grounded in \`retrieval_context\`, \`AnswerRelevancyMetric\` checks the answer actually addresses the input, and \`HallucinationMetric\` flags claims not supported by context.

### Custom criteria with G-Eval

When the built-in metrics do not capture your domain rule, G-Eval lets you write the rubric directly:

\`\`\`python
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams, LLMTestCase
from deepeval import assert_test

professionalism = GEval(
    name="Professionalism",
    criteria=(
        "Determine whether the response stays professional and never "
        "blames the user or uses sarcasm."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
    ],
    threshold=0.8,
)


def test_tone():
    case = LLMTestCase(
        input="Your app deleted my files!",
        actual_output="I'm sorry for the trouble. Let's recover them together.",
    )
    assert_test(case, [professionalism])
\`\`\`

DeepEval is where most teams write their day-to-day LLM assertions. For a deeper, focused walkthrough see our [DeepEval LLM testing framework guide](/blog/deepeval-llm-testing-framework-guide).

## What RAGAS Is For

RAGAS exists for one reason: measuring the quality of retrieval-augmented generation rigorously. When your chatbot answers from a vector store, "is the answer good" decomposes into several independent questions. Did retrieval fetch the right chunks? Did the model use them faithfully or invent details? Was relevant information missing? RAGAS gives each of these its own metric, and that decomposition is its superpower.

### RAGAS metrics in plain English

| Metric | What it measures | What a low score means |
|---|---|---|
| Faithfulness | Are answer claims grounded in retrieved context? | The model is hallucinating |
| Answer Relevancy | Does the answer address the question? | The answer wanders off-topic |
| Context Precision | Are the top-ranked chunks the relevant ones? | Retriever ranking is poor |
| Context Recall | Was all needed context retrieved? | Chunks/embeddings miss key docs |
| Noise Sensitivity | Does irrelevant context corrupt the answer? | Pipeline is fragile to distractors |

### Installing RAGAS

\`\`\`bash
pip install ragas datasets
export OPENAI_API_KEY="sk-..."
\`\`\`

### A runnable RAGAS evaluation

\`\`\`python
from ragas import evaluate
from ragas.dataset_schema import EvaluationDataset
from ragas.metrics import (
    Faithfulness,
    ResponseRelevancy,
    LLMContextPrecisionWithReference,
    LLMContextRecall,
)

dataset = EvaluationDataset.from_list(
    [
        {
            "user_input": "When do password reset links expire?",
            "retrieved_contexts": [
                "Reset links are emailed and expire after 60 minutes.",
                "Users can change their display name under Profile.",
            ],
            "response": "Password reset links expire after 60 minutes.",
            "reference": "Reset links expire 60 minutes after being sent.",
        }
    ]
)

result = evaluate(
    dataset=dataset,
    metrics=[
        Faithfulness(),
        ResponseRelevancy(),
        LLMContextPrecisionWithReference(),
        LLMContextRecall(),
    ],
)

print(result)
# {'faithfulness': 1.00, 'answer_relevancy': 0.93,
#  'context_precision': 0.50, 'context_recall': 1.00}
\`\`\`

Notice the \`context_precision\` of 0.50 in the output: the retriever pulled one relevant chunk and one irrelevant one ("display name"). RAGAS caught a retrieval problem that an end-to-end "is the answer right" check would have missed entirely, because the final answer was still correct. That is exactly the diagnostic value RAGAS adds.

## CI/CD Gating: Making Evals Block the Merge

An eval that runs only on your laptop is a science experiment. The value lands when a regression blocks a pull request. Here is how each tool plugs into a pipeline.

### Promptfoo in CI

Promptfoo exits non-zero when assertions fail, so a GitHub Actions step is enough:

\`\`\`yaml
name: LLM Eval
on: [pull_request]

jobs:
  promptfoo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Run promptfoo eval
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: npx promptfoo@latest eval -c promptfooconfig.yaml --no-progress-bar
\`\`\`

### DeepEval in CI

Because DeepEval is pytest under the hood, you already know the recipe:

\`\`\`yaml
      - name: Run DeepEval
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: |
          pip install -U deepeval
          deepeval test run test_chatbot.py
\`\`\`

### RAGAS in CI

RAGAS returns scores rather than pass/fail, so you assert thresholds yourself:

\`\`\`python
# eval_gate.py
import sys
from ragas import evaluate
# ... build dataset and call evaluate() as above ...

scores = evaluate(dataset=dataset, metrics=metrics)
THRESHOLDS = {"faithfulness": 0.85, "context_recall": 0.80}

failed = [
    f"{k}={scores[k]:.2f} < {v}"
    for k, v in THRESHOLDS.items()
    if scores[k] < v
]
if failed:
    print("RAGAS gate failed:", ", ".join(failed))
    sys.exit(1)
print("RAGAS gate passed")
\`\`\`

The broader principle here is the same one we cover in [building a CI/CD testing pipeline with GitHub Actions](/blog/cicd-testing-pipeline-github-actions): an eval is only a quality gate if a failure stops the merge. Keep a small, deterministic "smoke" subset that runs on every PR and a larger judge-heavy suite that runs nightly to control cost.

## The Cost of Judge Tokens

The expensive truth about LLM evaluation is that most meaningful metrics are themselves LLM calls. Every Faithfulness, Answer Relevancy, G-Eval, or llm-rubric check sends your output plus context to a judge model and pays for those tokens. Run a 200-case suite with five judge-based metrics and you have made 1,000 judge calls per CI run.

| Strategy | Effect on cost | Trade-off |
|---|---|---|
| Use a cheap judge (e.g. a mini/haiku model) | 5-15x cheaper per call | Slightly noisier scores |
| Cache judge results on unchanged cases | Skips repeat calls | Needs stable case IDs |
| Split smoke (per-PR) vs full (nightly) | Big CI savings | Slower feedback on edge metrics |
| Prefer deterministic asserts where possible | Free | Only works for exact/regex checks |
| Sample N cases per PR, full set nightly | Linear savings | Some regressions caught later |

Concrete guidance for 2026: default your judge to a small, cheap model for routine gating and reserve a frontier model for the nightly full run or for metrics where score stability matters. Promptfoo, DeepEval, and RAGAS all let you configure the judge model independently of the model under test, so you can mix a frontier model under test with a cheap judge. Always exclude deterministic assertions (\`contains\`, regex, latency, JSON-schema) from your token budget — lean on them heavily because they are free and fast.

## How They Overlap, and Why Teams Run Two

There is genuine overlap. Both DeepEval and RAGAS compute Faithfulness and Answer Relevancy, and Promptfoo's \`llm-rubric\` can approximate many DeepEval metrics. But the tools are optimized for different moments in the lifecycle:

- **Choosing what to ship** is a Promptfoo job. The YAML matrix and side-by-side UI make model and prompt selection a five-minute exercise.
- **Keeping shipped behavior from regressing** is a DeepEval job. Its pytest ergonomics and metric breadth make it the natural home for app-level assertions in CI.
- **Diagnosing RAG specifically** is a RAGAS job. Nothing else decomposes retrieval quality as finely, and context precision/recall point you straight at whether the bug is in retrieval or generation.

A very common 2026 stack is Promptfoo for pre-production iteration and red-teaming, plus DeepEval for the CI gate, plus RAGAS pulled in when the product is RAG-heavy and you need to debug the retriever. If you are also testing autonomous agents rather than single-turn LLM calls, pair these with the patterns in our [AI agent testing workflows comparison](/blog/ai-agent-testing-workflows-comparison).

## Decision Guide: Which Should You Pick?

| If you... | Start with |
|---|---|
| Need to pick a model/prompt fast | Promptfoo |
| Want red-teaming/security probes | Promptfoo |
| Already write pytest, want assertions in CI | DeepEval |
| Need many metrics + custom G-Eval rubrics | DeepEval |
| Build RAG and answers are subtly wrong | RAGAS |
| Must debug retrieval vs generation | RAGAS |
| Want one tool to start and grow | DeepEval, add others later |

If you can only adopt one tool this quarter and you are unsure, choose DeepEval: it has the broadest applicability, the gentlest learning curve for Python teams, and it covers both general LLM output testing and a solid subset of RAG metrics. Add Promptfoo the moment you are comparing models, and add RAGAS the moment retrieval quality becomes the thing you are debugging.

## Frequently Asked Questions

### Is Promptfoo, DeepEval, or RAGAS better for RAG evaluation?

RAGAS is purpose-built for RAG and offers the deepest retrieval-specific metrics, including context precision, context recall, and noise sensitivity, so it is the best choice for debugging a retrieval pipeline. DeepEval also covers Faithfulness and contextual metrics and integrates more smoothly into a pytest CI gate. Many teams use DeepEval for gating and RAGAS for deep retrieval diagnosis.

### Do these LLM eval tools cost money to run?

The frameworks themselves are free and open source, but most meaningful metrics call a judge LLM, so you pay for those judge tokens. Deterministic assertions like contains, regex, latency, and JSON-schema checks are free. Control cost by using a cheap judge model for routine gating, caching results on unchanged cases, and reserving a frontier judge for nightly full runs.

### Can I use DeepEval and RAGAS together?

Yes, and many teams do. They are independent Python libraries with no conflict, so you can run DeepEval for general output assertions and tone checks in your pytest suite, then invoke RAGAS specifically on RAG cases to measure context precision and recall. The main thing to manage is total judge-token spend, since both rely on LLM-based scoring.

### Does Promptfoo support Python, or is it YAML only?

Promptfoo is primarily configured through YAML, which is its strength for quick model comparison, but it supports JavaScript and Python hooks for custom providers, custom assertions, and dynamic test generation. You can wire in a Python function to call your own application logic or to score outputs with custom code, so it is not strictly limited to declarative YAML.

### Which framework is easiest for a team that already writes pytest?

DeepEval is the most natural fit because it mirrors the pytest experience: you write test functions, build an LLMTestCase, attach metrics with thresholds, and run with pytest or the deepeval CLI. The mental model of assert_test maps directly onto assert, so adoption is fast for any team that already runs Python unit tests in CI.

### How do I gate a CI pipeline on LLM eval results?

Promptfoo and DeepEval both exit non-zero when assertions fail, so a single GitHub Actions step blocks the merge automatically. RAGAS returns numeric scores, so you compare them against thresholds in a small script and call sys.exit(1) on failure. Run a fast deterministic smoke subset on every pull request and a larger judge-heavy suite nightly to balance coverage against token cost.

### Which judge model should I use for evaluation?

Use a small, cheap judge model for routine per-PR gating and reserve a frontier model for nightly runs or for metrics where score stability is critical. All three frameworks let you configure the judge independently of the model under test, so you can evaluate a frontier production model with an inexpensive judge. This typically cuts evaluation cost by five to fifteen times with only a minor increase in scoring noise.

### Can these tools red-team or security-test an LLM app?

Promptfoo has built-in red-teaming that generates adversarial inputs such as jailbreaks, prompt injection, and PII extraction attempts, then reports which ones your system fails. DeepEval and RAGAS focus on quality metrics rather than adversarial generation, though you can add adversarial cases manually. For security-focused probing, Promptfoo is the clear starting point among the three.

## Conclusion

Evaluating LLM applications is no longer optional in 2026, and the good news is that the open-source ecosystem has matured into three excellent, complementary tools. Reach for Promptfoo when you are deciding what to ship and when you want to probe for security failures. Reach for DeepEval when you want pytest-style assertions that block regressions in CI. Reach for RAGAS when retrieval quality is the thing you need to measure and debug. Most teams that take quality seriously end up running two of the three, with DeepEval as the dependable backbone of the CI gate.

Whichever you adopt, wire it into your pipeline so a failing eval actually blocks a merge, lean on free deterministic assertions wherever you can, and keep your judge-token budget under control by splitting smoke from full runs. Ready to round out your AI testing stack? Explore the [QA skills directory](/skills) for agent-ready testing skills that drop straight into Claude Code and other AI coding agents.
`,
};
