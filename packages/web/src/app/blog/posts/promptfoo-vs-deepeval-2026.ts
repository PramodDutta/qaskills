import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Promptfoo vs DeepEval 2026: LLM Eval Tools Compared',
  description:
    'Promptfoo vs DeepEval in 2026 — YAML-driven prompt testing and red-teaming vs pytest-style LLM assertions and metrics. Compare CI, metrics, and workflow with examples.',
  date: '2026-06-21',
  category: 'Comparison',
  content: `
# Promptfoo vs DeepEval 2026: LLM Eval Tools Compared

Choosing an evaluation framework for an LLM application in 2026 usually comes down to two of the most popular open-source options: Promptfoo and DeepEval. They solve overlapping problems — measuring whether your prompts, models, and RAG pipelines actually produce good output — but they approach the problem from opposite ends of the spectrum. Promptfoo is a configuration-first, YAML-driven CLI built around comparing prompts and models in a side-by-side matrix, and it ships with a serious red-teaming and security-scanning engine. DeepEval is a Python-first, pytest-native framework that treats evaluation like unit testing, with a deep catalog of research-backed metrics such as G-Eval, faithfulness, answer relevancy, and hallucination detection.

If you have ever asked "should I write my evals as YAML config or as Python test functions?" then this comparison is for you. The answer depends on who is writing the evals, what you are evaluating, and how the results need to flow through your CI pipeline. A prompt engineer iterating on system prompts across five models wants a fast feedback loop and a visual diff. A backend team shipping a RAG chatbot wants metrics they can assert on inside the same pytest suite that already gates their deploys. Both tools can be pushed into the other's territory, but each has a clear sweet spot.

This guide gives you a 30-second answer first, then a detailed side-by-side across language and configuration model, assertion style, metric coverage, RAG support, red-teaming and security, CI integration, dataset management, dashboards, and JavaScript/TypeScript support. You will see a complete runnable promptfooconfig.yaml and a complete runnable DeepEval pytest file so you can judge the developer experience for yourself. We close with concrete guidance on when to pick which — and why many mature teams end up running both. If you want hands-on building blocks while you read, browse the QA skills directory at [/skills](/skills) for evaluation and testing skills you can drop into your agent workflow.

## The 30-Second Answer

If you only have half a minute, this table captures the decision. Both are free and open source, both run locally, and both integrate with CI. The split is about workflow philosophy.

| Question | Promptfoo | DeepEval |
|---|---|---|
| Primary interface | YAML config + CLI | Python + pytest |
| Best for | Prompt/model A/B comparison, red-teaming | Metric-driven unit tests for LLM apps |
| Who writes the evals | Prompt engineers, PMs, QA | Backend/ML engineers |
| Killer feature | Eval matrix + security scanning | G-Eval and RAG metric suite |
| Learning curve | Low (write YAML, run CLI) | Medium (know pytest + metrics) |
| Native language | Node.js (also JS/TS API) | Python |

In short: reach for **Promptfoo** when the question is "which prompt or which model is better, and is my app safe from jailbreaks?" Reach for **DeepEval** when the question is "does my LLM output meet a measurable quality bar, asserted inside my test suite?"

## What Is Promptfoo?

Promptfoo is an open-source CLI and library for testing and evaluating LLM outputs. Its mental model is a **matrix**: rows are test cases (each with input variables), and columns are providers (a provider is a model plus its configuration). You define everything in a single \`promptfooconfig.yaml\`, point it at one or more prompts and providers, attach assertions, and run \`promptfoo eval\`. The result is a graded grid you can open in a local web viewer with \`promptfoo view\`, where every cell shows the output, pass/fail status, and score.

Promptfoo's assertions cover deterministic checks (contains, equals, regex, JSON schema validation, latency, cost) and model-graded checks (\`llm-rubric\`, \`answer-relevance\`, \`factuality\`, \`g-eval\`, \`context-faithfulness\`). It also has a first-class **red-teaming** mode: \`promptfoo redteam\` generates adversarial inputs across dozens of plugins — prompt injection, jailbreaks, PII leakage, harmful content, hijacking, and more — and reports which attacks succeeded. This makes it as much a security scanner as an eval harness.

Because the config is declarative, non-engineers can read and edit it, and the same config runs identically on a laptop and in CI. Promptfoo ships as a Node package (\`npx promptfoo@latest\`) but is language-agnostic in what it tests — your application under test can be a Python script, an HTTP endpoint, or a raw model call.

## What Is DeepEval?

DeepEval is an open-source Python framework that brings the feel of \`pytest\` to LLM evaluation. The core object is the \`LLMTestCase\`, which holds the \`input\`, the \`actual_output\` your app produced, an optional \`expected_output\`, and an optional \`retrieval_context\` for RAG. You then run one or more **metrics** against the test case. Each metric returns a score between 0 and 1 and a pass/fail decision based on a threshold, plus a natural-language reason explaining the verdict.

DeepEval's metric catalog is its standout feature. It includes \`AnswerRelevancyMetric\`, \`FaithfulnessMetric\`, \`HallucinationMetric\`, \`ContextualPrecisionMetric\`, \`ContextualRecallMetric\`, \`ContextualRelevancyMetric\`, and the flexible \`GEval\` metric, which lets you define custom evaluation criteria in plain English and have an LLM judge score against them. Most metrics are "LLM-as-judge" — they call an evaluator model (the judge) to reason about correctness rather than relying on brittle string matching.

DeepEval plugs directly into pytest via \`assert_test()\` and the \`deepeval test run\` CLI, so an eval suite looks and behaves like any other test file. It also provides \`EvaluationDataset\`, \`Golden\` objects for storing expected examples, and a bulk \`evaluate()\` function for running many cases at once. It pairs with the Confident AI cloud platform for dashboards, but the framework runs fully offline.

## Side-by-Side: Configuration and Assertion Style

The clearest difference is how you express an eval. Promptfoo wants declarative YAML; DeepEval wants imperative Python. The table below maps the core concepts so you can translate between them.

| Concept | Promptfoo | DeepEval |
|---|---|---|
| Unit of evaluation | Test case row in YAML | \`LLMTestCase\` object |
| Define expected behavior | \`assert\` block with types | Metric + threshold |
| Deterministic checks | \`contains\`, \`equals\`, \`regex\`, \`is-json\` | Custom Python in test body |
| Model-graded checks | \`llm-rubric\`, \`g-eval\`, \`factuality\` | \`GEval\`, \`AnswerRelevancyMetric\`, etc. |
| Run command | \`promptfoo eval\` | \`deepeval test run\` or \`pytest\` |
| Compare models | Add providers (columns) | Loop over models in code |
| Reusable logic | YAML anchors, \`defaultTest\` | Python functions, fixtures |
| Who can edit it | Engineers and non-engineers | Engineers comfortable with pytest |

Promptfoo shines when you want to compare the *same* prompt across many models with minimal ceremony — each provider is just another line in a list. DeepEval shines when your eval needs real logic: branching, data preprocessing, calling your actual application code, or composing several metrics with custom thresholds per case.

## A Complete Promptfoo Example

Here is a working \`promptfooconfig.yaml\` that compares two models on a customer-support summarization task. It mixes a deterministic assertion (the summary must mention the order ID) with a model-graded \`g-eval\` rubric, and it runs the same test cases against both providers so you get a side-by-side grid.

\`\`\`yaml
# promptfooconfig.yaml
description: Support ticket summarization — model A/B

prompts:
  - |
    Summarize the following support ticket in 2 sentences.
    Always include the order ID if present.
    Ticket: {{ticket}}

providers:
  - id: openai:gpt-5
  - id: anthropic:claude-opus-4-8

defaultTest:
  assert:
    - type: g-eval
      value: |
        Summary is faithful to the ticket and includes no invented facts.
      threshold: 0.7

tests:
  - vars:
      ticket: >
        Order #A-4821 has not arrived. Customer ordered on June 1,
        tracking shows it stuck in transit for 9 days.
    assert:
      - type: contains
        value: "A-4821"
      - type: latency
        threshold: 4000

  - vars:
      ticket: >
        The mobile app crashes on launch after the 3.2 update on Android.
    assert:
      - type: llm-rubric
        value: Mentions the app crash and the 3.2 Android update
\`\`\`

Run it and open the viewer:

\`\`\`bash
npx promptfoo@latest eval -c promptfooconfig.yaml
npx promptfoo@latest view
\`\`\`

The viewer renders a grid: two columns (gpt-5 and claude-opus-4-8), two rows (the two tickets), each cell color-coded pass/fail with the model output and the g-eval reasoning. To turn this into a CI gate, run \`promptfoo eval\` with a non-zero exit code on failure, which it does by default when any assertion fails.

## A Complete DeepEval Example

Here is the equivalent intent expressed in DeepEval. We define a custom \`GEval\` metric for faithfulness, add the built-in \`AnswerRelevancyMetric\`, build an \`LLMTestCase\` from the app output, and assert inside a pytest function. This file runs with \`deepeval test run test_support.py\` or plain \`pytest\`.

\`\`\`python
# test_support.py
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from deepeval.metrics import GEval, AnswerRelevancyMetric


def summarize(ticket: str) -> str:
    # Replace with your real application call.
    return f"Order A-4821 has not arrived; it has been stuck in transit for 9 days."


faithfulness = GEval(
    name="Faithfulness",
    criteria="The summary must not invent facts not present in the ticket.",
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
    ],
    model="gpt-5",
    threshold=0.7,
)

relevancy = AnswerRelevancyMetric(threshold=0.7, model="gpt-5")


@pytest.mark.parametrize(
    "ticket",
    [
        "Order #A-4821 has not arrived. Tracking shows it stuck for 9 days.",
    ],
)
def test_summary_quality(ticket):
    output = summarize(ticket)
    test_case = LLMTestCase(input=ticket, actual_output=output)
    assert_test(test_case, [faithfulness, relevancy])
\`\`\`

Run it:

\`\`\`bash
deepeval test run test_support.py
\`\`\`

Notice the difference in feel. In DeepEval you call your real \`summarize()\` function, parametrize over inputs the pytest way, and compose metrics as objects. The judge model is set per metric, and every metric exposes a \`.reason\` you can log. For a deeper, dedicated walkthrough of DeepEval, see our [DeepEval tutorial](/blog/deepeval-llm-testing-guide).

## Metric Coverage Compared

Both tools can run model-graded evaluations, but DeepEval's catalog is broader and more research-aligned, while Promptfoo's strength is that its assertions live inline with comparison. The table summarizes what each offers out of the box.

| Metric / capability | Promptfoo | DeepEval |
|---|---|---|
| Exact match / regex / JSON schema | Yes (built-in assert types) | Via custom Python |
| LLM rubric (free-form judge) | Yes (\`llm-rubric\`) | Yes (\`GEval\`) |
| G-Eval style criteria | Yes (\`g-eval\`) | Yes (\`GEval\`, native) |
| Answer relevancy | Yes (\`answer-relevance\`) | Yes (\`AnswerRelevancyMetric\`) |
| Faithfulness / groundedness | Yes (\`context-faithfulness\`) | Yes (\`FaithfulnessMetric\`) |
| Hallucination | Partial (via rubric) | Yes (\`HallucinationMetric\`) |
| Contextual precision/recall | Partial | Yes (dedicated metrics) |
| Latency / cost assertions | Yes (native) | Via custom code |
| Toxicity / bias | Via red-team plugins | Yes (\`ToxicityMetric\`, \`BiasMetric\`) |

For pure assertion variety on RAG quality and safety dimensions, DeepEval has more named, ready-to-use metrics. Promptfoo covers the common cases inline and leans on its red-team engine for adversarial safety, which DeepEval does not natively replicate.

## RAG Support

Both frameworks support Retrieval-Augmented Generation evaluation, but they model retrieval differently. DeepEval treats \`retrieval_context\` as a first-class field on the test case and offers the full RAG triad — answer relevancy, faithfulness, and contextual relevancy/precision/recall — to diagnose whether failures come from retrieval or from generation. You pass the retrieved chunks directly and the metrics reason about them.

Promptfoo supports RAG by letting you inject retrieved context as a variable in the prompt and then applying \`context-faithfulness\` and \`context-recall\` assertions, often with a \`context\` var resolved by a custom provider or a Python hook. It works well, but it is more "bring your retrieved context into the prompt" than DeepEval's explicit retrieval-context modeling.

If your core problem is diagnosing a RAG pipeline — is retrieval the bottleneck, or is the generator hallucinating despite good context? — DeepEval's metric decomposition is more precise. If your RAG work is one part of a broader prompt-and-model comparison, Promptfoo keeps it in the same matrix as everything else.

## Red-Teaming and Security

This is where Promptfoo pulls clearly ahead. The \`promptfoo redteam\` command auto-generates adversarial test cases across a large plugin library covering prompt injection, jailbreaks, PII and secret leakage, harmful content, competitor mentions, hijacking, and policy violations. It runs them against your application, scores which attacks succeeded, and produces a security report you can hand to a risk reviewer. For teams that need to demonstrate LLM safety posture or satisfy a security review, this is a substantial built-in capability.

\`\`\`bash
npx promptfoo@latest redteam init
npx promptfoo@latest redteam run
npx promptfoo@latest redteam report
\`\`\`

DeepEval has safety-oriented metrics (toxicity, bias) and a separate companion library for red-teaming, but its core framework is oriented toward quality measurement rather than adversarial generation. If automated security and jailbreak testing is a hard requirement, Promptfoo is the more complete answer out of the box.

## CI Integration and Dataset Management

Both integrate cleanly with CI. Promptfoo exits non-zero when assertions fail, so a GitHub Actions step that runs \`promptfoo eval\` will fail the build on regression; you can also output JSON or JUnit XML for reporting. DeepEval, being pytest-native, slots into any existing pytest CI job — \`deepeval test run\` or \`pytest\` produces standard test output, and failures fail the pipeline.

For datasets, Promptfoo reads test cases from the YAML \`tests\` block or from external CSV/JSON/Google Sheets, which makes it easy for non-engineers to maintain large case lists in a spreadsheet. DeepEval uses \`EvaluationDataset\` and \`Golden\` objects in Python, optionally synced to Confident AI, which is better when your dataset is generated or transformed programmatically. The general pattern: Promptfoo for human-curated spreadsheets, DeepEval for code-managed datasets.

## Dashboards and JS/TS Support

Promptfoo includes a built-in local web viewer (\`promptfoo view\`) that needs no external account, plus an optional hosted sharing feature. Because it is a Node package, it has native JavaScript/TypeScript usage — you can call it programmatically from a TS test, and your application under test can be JS, Python, or an HTTP endpoint.

DeepEval pairs with **Confident AI**, a hosted platform for dashboards, dataset management, regression tracking over time, and team collaboration. The framework itself is Python-only; there is no native TypeScript API. If your stack is TypeScript-heavy and you want evals in the same language, Promptfoo is the natural fit. If you are in Python and want rich historical dashboards, DeepEval plus Confident AI is compelling.

## When to Pick Which (and Using Both)

Choose **Promptfoo** if your main activity is comparing prompts and models, your team includes non-engineers who should read and edit evals, you need built-in red-teaming and security scanning, or your stack is JavaScript/TypeScript. Choose **DeepEval** if you want metric-driven evaluation expressed as Python unit tests, you are diagnosing a RAG pipeline with the full triad, you want a broad catalog of named metrics including hallucination and contextual precision/recall, or you already gate deploys with pytest.

Many mature teams run **both**, and the two compose well. A common pattern: use Promptfoo during prompt and model selection to quickly A/B candidates and to run the red-team suite before launch, then use DeepEval as the ongoing regression gate in CI, asserting on faithfulness and answer relevancy for every pull request. The tools are not mutually exclusive — they cover different phases of the LLM development lifecycle. For more context on how these fit alongside other eval stacks, compare with our [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026) and, if you also test behavior-driven specs, our [BDD frameworks comparison](/blog/comparing-popular-bdd-frameworks-2026-complete-guide).

## Frequently Asked Questions

### Is Promptfoo or DeepEval better for beginners?
Promptfoo has the gentler entry point because evals are declarative YAML and you run a single CLI command to see a color-coded grid. You do not need to know pytest or write Python. DeepEval is friendlier if you already write Python tests, since its API mirrors pytest. For a non-engineer or a quick prompt comparison, start with Promptfoo; for an engineer embedding evals in a test suite, DeepEval feels natural.

### Can I use Promptfoo and DeepEval together?
Yes, and many teams do. They cover different phases: Promptfoo excels at prompt/model A/B comparison and red-teaming during development and pre-launch, while DeepEval works well as a per-commit regression gate inside your pytest CI. Because Promptfoo is YAML/CLI and DeepEval is Python, they do not conflict. Run Promptfoo for selection and security, then keep DeepEval metrics asserting quality on every pull request.

### Does DeepEval support JavaScript or TypeScript?
No. DeepEval is a Python-only framework, so its metrics, test cases, and pytest integration all live in Python. If your application is in TypeScript you can still test it by exposing an endpoint or calling it from Python, but there is no native TS API. If you want evals written in the same language as a TypeScript app, Promptfoo, which is a Node package, is the better fit.

### Which tool is better for RAG evaluation?
DeepEval is generally stronger for diagnosing RAG because it models \`retrieval_context\` explicitly and offers the full RAG triad — answer relevancy, faithfulness, and contextual precision/recall — letting you separate retrieval failures from generation failures. Promptfoo supports RAG via context variables and faithfulness assertions, which is fine when RAG is one part of a broader matrix, but DeepEval gives more precise, decomposed diagnostics.

### Does Promptfoo do security and red-teaming?
Yes, and this is one of its strongest features. The \`promptfoo redteam\` command auto-generates adversarial inputs across many plugins — prompt injection, jailbreaks, PII leakage, harmful content, hijacking — runs them against your app, and reports which attacks succeeded. It effectively doubles as an LLM security scanner. DeepEval has toxicity and bias metrics plus a companion red-team library, but Promptfoo's built-in coverage is broader.

### Are Promptfoo and DeepEval free and open source?
Yes. Both are open-source and run entirely on your own machine at no licensing cost. You only pay for the model API calls used during evaluation — particularly for LLM-as-judge metrics, which call an evaluator model. Both offer optional hosted layers: Promptfoo has a sharing feature and DeepEval pairs with Confident AI for dashboards, but neither hosted layer is required to use the core framework.

### How do I choose the judge model for evals?
Use a capable, consistent model as the judge for any LLM-graded metric, and keep it fixed so scores stay comparable across runs. In Promptfoo you set the grading provider in config; in DeepEval you pass \`model=\` to each metric. A stronger judge gives more reliable verdicts but costs more, so many teams use a mid-tier judge for routine CI and a top-tier judge for release gating, and always pin the version.

### Which is faster to run in CI?
Deterministic assertions (Promptfoo's contains/regex/JSON checks or DeepEval custom Python) are nearly instant. The cost in both tools comes from LLM-as-judge metrics, which add a model call per evaluation. To keep CI fast, minimize judge-based metrics on every commit, run them on a curated subset, and reserve the full suite for nightly or release builds. Both tools parallelize, so wall-clock time depends mostly on your model API throughput.

## Conclusion

Promptfoo and DeepEval are not really competitors so much as two halves of a complete LLM evaluation strategy. Promptfoo gives you a fast, declarative, non-engineer-friendly way to compare prompts and models and to harden your app against attacks with built-in red-teaming. DeepEval gives you a metric-rich, pytest-native way to assert measurable quality — G-Eval, faithfulness, hallucination, and the RAG triad — directly inside the test suite that already protects your deploys. Pick Promptfoo for selection and security, DeepEval for regression and RAG diagnosis, and consider running both across the development lifecycle.

Ready to put evaluation into practice? Explore the [QA skills directory](/skills) on QASkills.sh for ready-to-install evaluation, prompt-testing, and RAG-quality skills that drop straight into your AI coding agent — so your team can ship LLM features with confidence instead of guesswork.
`,
};
