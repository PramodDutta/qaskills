import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Rhesis AI: An Open-Source LLM Testing Guide for 2026',
  description:
    'A practical 2026 guide to Rhesis AI, the open-source LLM application testing framework: generate test sets, run metrics, red-team for robustness, and gate CI.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Rhesis AI: An Open-Source LLM Testing Guide for 2026

Most teams building on large language models can generate outputs faster than they can test them. Writing test cases by hand does not scale to the number of edge cases an LLM application can hit, and copy-pasting prompts into a spreadsheet is not a repeatable process. Rhesis AI is an open-source framework built to close that gap: it helps you generate structured test sets for LLM applications, run metrics against your system, and turn the results into a repeatable quality gate.

This guide covers what Rhesis is in 2026, how test generation works, the kinds of metrics you can apply, how to run a test suite, how to approach red-teaming and robustness, and how to wire the whole thing into CI. Where a specific API detail could drift between releases, this guide describes the concept and points you at the official docs rather than inventing a method name, so the mental model stays correct even as the library evolves.

## What Rhesis AI Is

Rhesis AI is an open-source toolkit for testing LLM applications. Its central premise is that good LLM testing starts with good test data: you cannot evaluate a system fairly without a diverse, representative set of inputs, and generating that set by hand is the bottleneck. Rhesis focuses on producing test sets programmatically, then evaluating your application against them with configurable metrics.

Being open source matters here for the same reasons it matters in the rest of the QA tooling world. You can read the code, run it entirely on your own infrastructure, keep sensitive prompts and outputs off third-party servers, and extend it when your domain needs a metric that does not ship in the box. That positions Rhesis alongside libraries like DeepEval and Ragas rather than hosted platforms, and the same conceptual vocabulary carries across all three.

At a high level, a Rhesis workflow has three moving parts:

- **Test sets**: collections of test cases, each typically holding a prompt or input, optional context, and metadata such as a category, behavior, or expected property.
- **Metrics**: the scoring logic that judges whether an application response is acceptable for a given test case.
- **Test suites and runs**: the harness that executes your application against a test set, applies the metrics, and produces a result you can inspect and gate on.

## Why Test Generation Matters

The quality of any LLM evaluation is capped by the quality of its inputs. If your test set only contains happy-path questions, a passing score tells you nothing about how the system behaves on ambiguous phrasing, adversarial prompts, out-of-scope requests, or the long tail of real user language. Manually authoring that variety is slow and biased toward the cases the author already thought of.

Rhesis addresses this by generating test cases that span behaviors and categories you specify. Instead of writing 200 support questions by hand, you describe the application and the properties you care about, and the framework produces a structured, diverse set you can review, edit, and version. The human stays in the loop as a curator rather than an author, which is a far more scalable division of labor.

This is the same insight that drives golden-dataset practice in [DeepEval](/blog/deepeval-llm-testing-guide-2026) and RAG evaluation in [Ragas](/blog/ragas-rag-evaluation-guide): the dataset is the product. Rhesis simply makes building that dataset a first-class, automatable step rather than an afterthought.

## Installing and Getting Started

Rhesis is distributed as a Python package. Install it into a virtual environment and configure any provider keys the generation and metric steps need through environment variables, never hard-coded in source.

\`\`\`bash
python -m venv .venv
source .venv/bin/activate
pip install rhesis
\`\`\`

Because generation and LLM-as-judge metrics call a model under the hood, set the relevant provider key in your environment. Keep it out of version control:

\`\`\`bash
export OPENAI_API_KEY="your_key_here"     # or another supported provider
# never commit keys; load them from a secret manager in CI
\`\`\`

From there the flow is: describe or generate a test set, point it at your application, run the metrics, and read the results. The exact class and method names live in the official Rhesis documentation; the sections below use representative names and note where you should confirm against the current release.

## Generating Test Sets

Test-set generation is the feature most teams adopt Rhesis for. Conceptually you provide a description of the system under test and the dimensions you want coverage across (topics, behaviors, difficulty, adversarial variants), and Rhesis produces a collection of test cases. You then review and persist that set so it becomes a stable, versioned artifact.

A representative generation flow looks like this. Confirm the exact API against the docs for your installed version:

\`\`\`python
from rhesis.sdk import TestSet  # confirm import path in your version

# Describe the application and the coverage you want.
test_set = TestSet.generate(
    description=(
        "A customer support assistant for a SaaS billing product. "
        "It answers questions about invoices, refunds, and plan changes."
    ),
    behaviors=["factual accuracy", "policy compliance", "refusal of out-of-scope"],
    num_cases=100,
)

# Persist so the set is reviewable and versioned.
test_set.save("test_sets/billing_support_v1.json")

print(f"Generated {len(test_set)} cases")
\`\`\`

Treat the generated file as source you review, not output you trust blindly. Read a sample, prune cases that do not match your domain, and add known-hard examples and past incidents by hand. A test set that combines machine breadth with human-curated depth is far stronger than either alone. Commit the file so every run tests against the same inputs until you deliberately bump the version.

## Metric Types

A test set only becomes an evaluation when you attach metrics. Rhesis supports several families of metrics, and the right mix depends on what your application does. The table below groups the common types.

| Metric type | Question it answers | Good for |
| --- | --- | --- |
| Reference-based | Does output match an expected answer? | Closed-form Q&A |
| LLM-as-judge | Does output satisfy a natural-language rubric? | Open-ended quality |
| Grounding / faithfulness | Is output supported by provided context? | RAG systems |
| Safety | Is output free of harmful content? | User-facing bots |
| Behavioral | Does output show a required behavior? | Policy, tone, refusals |
| Statistical | String or embedding similarity score | Regression thresholds |

Reference-based metrics are strict and cheap but only work when there is a single correct answer. LLM-as-judge metrics handle the open-ended majority of real applications, at the cost of needing a judge model and careful rubric design. Grounding metrics are the RAG workhorse, checking that responses do not drift from retrieved context. Most production suites combine two or three types so that no single metric's blind spot goes unchecked.

## Running a Test Suite

With a test set and metrics chosen, a test suite ties them to your application and runs. The pattern is: define a function that calls your system, attach the metrics, execute against the test set, and collect results. A representative run looks like this:

\`\`\`python
from rhesis.sdk import TestSet, TestSuite, metrics  # confirm names in your version

test_set = TestSet.load("test_sets/billing_support_v1.json")

# Your application under test: any callable that maps input -> output.
def my_app(test_case):
    prompt = test_case["input"]
    context = test_case.get("context")
    return call_my_llm_app(prompt, context=context)

suite = TestSuite(
    test_set=test_set,
    target=my_app,
    metrics=[
        metrics.Faithfulness(),
        metrics.AnswerRelevance(),
        metrics.Safety(),
    ],
)

results = suite.run()

print(results.summary())        # pass rate per metric
results.save("results/billing_support_v1_run.json")
\`\`\`

The result object is the artifact you actually act on. It carries a per-metric pass rate, per-case scores, and the explanations from judge metrics so you can open any failure and see why it failed. Save the run so you can diff it against the next one; run-over-run comparison is what makes this a regression suite instead of a one-time score. That discipline mirrors the observability-plus-evaluation loop described in the [Langfuse observability guide](/blog/langfuse-llm-observability-guide-2026).

## Red-Teaming and Robustness

Correctness on well-formed inputs is only half the job. A robust LLM application also has to hold up under adversarial input: prompt injection, jailbreak attempts, requests to leak system instructions, and inputs engineered to produce unsafe or off-policy output. Rhesis supports generating adversarial and robustness-focused test cases so you can probe these weaknesses systematically rather than discovering them in production.

The approach mirrors normal generation, but the behaviors you request target failure modes instead of features:

\`\`\`python
red_team_set = TestSet.generate(
    description="Customer support assistant for a SaaS billing product.",
    behaviors=[
        "prompt injection resistance",
        "refusal of requests to reveal system prompt",
        "no disclosure of another user's data",
        "jailbreak resistance",
    ],
    adversarial=True,   # confirm flag name in your version
    num_cases=60,
)

suite = TestSuite(
    test_set=red_team_set,
    target=my_app,
    metrics=[metrics.Safety(), metrics.PolicyCompliance()],
)

report = suite.run()
print("Robustness pass rate:", report.summary().pass_rate)
\`\`\`

Run the red-team suite on a schedule, not just once. New jailbreak patterns appear constantly, and a suite that passed last quarter can fail against this quarter's techniques. Feed any real incident straight back into the set as a permanent regression case. The table below outlines a practical robustness checklist.

| Robustness category | What to probe | Example behavior tag |
| --- | --- | --- |
| Prompt injection | Instructions hidden in user input | "ignore prior instructions" resistance |
| System prompt leakage | Attempts to extract hidden instructions | refusal to reveal system prompt |
| Data exfiltration | Requests for other users' data | no cross-user disclosure |
| Jailbreak | Roleplay or encoding to bypass safety | jailbreak resistance |
| Toxic elicitation | Coaxing harmful content | safe refusal |
| Out-of-scope | Off-domain requests | graceful scope refusal |

If robustness testing is a big part of your remit, browse the [QA skills catalog](/skills) for installable red-teaming and adversarial-testing recipes that plug into an agent workflow.

## CI Integration

The point of a repeatable test set and scripted metrics is that they can run automatically. Put a Rhesis run in CI so that a change to prompts, retrieval, or model config cannot merge without passing the evaluation gate. The pattern is the same as any test gate: run the suite, read the pass rate, exit non-zero below a threshold.

\`\`\`python
# ci_eval.py
import sys
from rhesis.sdk import TestSet, TestSuite, metrics

test_set = TestSet.load("test_sets/billing_support_v1.json")

def my_app(test_case):
    return call_my_llm_app(test_case["input"], context=test_case.get("context"))

suite = TestSuite(
    test_set=test_set,
    target=my_app,
    metrics=[metrics.Faithfulness(), metrics.AnswerRelevance(), metrics.Safety()],
)

summary = suite.run().summary()
THRESHOLD = 0.9

print(f"pass_rate={summary.pass_rate:.3f} threshold={THRESHOLD}")
if summary.pass_rate < THRESHOLD:
    print("Rhesis eval gate failed", file=sys.stderr)
    sys.exit(1)
\`\`\`

Wire it into a workflow that triggers whenever the LLM-facing code changes:

\`\`\`yaml
name: rhesis-eval-gate
on:
  pull_request:
    paths:
      - "prompts/**"
      - "src/**"
      - "test_sets/**"
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install rhesis
      - run: python ci_eval.py
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
\`\`\`

Keep the CI test set small enough to finish in a few minutes so it does not slow every pull request, and run the full and adversarial sets nightly. Store run artifacts so a failing build links straight to the failing cases and their explanations, which is what makes the gate actionable instead of just red.

## Rhesis vs Other LLM Testing Tools

Rhesis, DeepEval, Ragas, and Promptfoo overlap, but each has a center of gravity. Rhesis leans hardest into test-set generation and behavior-driven coverage; the others emphasize assertions, RAG metrics, or prompt matrices. The table sketches the differences.

| Tool | Center of gravity | Test generation | RAG metrics | Adversarial focus |
| --- | --- | --- | --- | --- |
| Rhesis | Generated test sets, behaviors | First-class | Yes | Strong |
| DeepEval | Pytest-style assertions | Some | Yes | Some |
| Ragas | RAG metric suite | Limited | Deep | Limited |
| Promptfoo | Prompt and model matrices | Config-driven | Some | Some |

These are complementary, not mutually exclusive. A common setup uses Rhesis to generate and maintain the test sets, then runs those cases through whatever assertion or metric library the team already knows. If you are weighing the assertion-first tools against each other, the [Promptfoo vs DeepEval comparison](/blog/promptfoo-vs-deepeval-2026) and the [Arize Phoenix evaluation guide](/blog/arize-phoenix-llm-evaluation-guide) cover that ground in detail.

## Best Practices

A few habits make Rhesis pay off. Version your test sets like code and review generated cases before trusting them; machine breadth needs human judgment on top. Combine metric types so no single blind spot passes silently, and prefer LLM-as-judge metrics with explicit rubrics over vague ones so results are explainable. Feed every production incident back into the set as a permanent case, run robustness suites on a schedule rather than once, and keep the CI subset fast while reserving the full and adversarial runs for nightly jobs. Finally, keep provider keys in a secret manager and out of source control, since both generation and judge metrics call a model.

Above all, resist the urge to chase a single headline number. A 92 percent pass rate means little without knowing which cases fail and why. The value of a framework like Rhesis is not the score; it is the structured, growing library of test cases and the explanations behind each failure, which together let a team reason about LLM quality the way they already reason about ordinary software.

## Frequently Asked Questions

### Is Rhesis AI free and open source?

Yes, Rhesis is an open-source LLM application testing framework distributed as a Python package. You can run it on your own infrastructure, read and extend the source, and keep sensitive prompts and outputs off third-party servers. Note that test generation and LLM-as-judge metrics call a model under the hood, so you will incur normal model-provider costs for those steps even though the framework itself is free.

### What is the main thing Rhesis does that other tools do not?

Rhesis makes test-set generation a first-class step. Instead of writing test cases by hand, you describe your application and the behaviors you want covered, and it produces a diverse, structured set you review and version. Other libraries focus more on assertions or RAG metrics and assume you already have a dataset. Rhesis targets the bottleneck of building that dataset in the first place.

### Can Rhesis test RAG applications?

Yes. You generate test cases that include context, then apply grounding or faithfulness metrics that check whether the response is supported by the provided context. This catches the classic RAG failure where retrieval works but generation drifts or invents facts. The concept is the same as faithfulness scoring in Ragas and DeepEval, applied to test sets that Rhesis can help you generate rather than author by hand.

### How does Rhesis support red-teaming?

Rhesis can generate adversarial and robustness-focused test cases, targeting behaviors like prompt injection resistance, refusal to reveal system prompts, and jailbreak resistance. You run those cases through safety and policy metrics to see where the application breaks. Because new attack patterns emerge constantly, run robustness suites on a schedule and add any real incident back into the set as a permanent regression case.

### Do I need a specific model provider to use Rhesis?

No, Rhesis is model-agnostic for the system under test: your application can call any provider. Generation and LLM-as-judge metrics do call a model, so you configure a provider key for those steps. Set it through an environment variable and keep it out of source control. You can point the judge and generation steps at whichever supported provider your team already uses.

### How is Rhesis different from DeepEval?

DeepEval centers on pytest-style assertions you write against outputs, ideal for developers who want LLM checks in a familiar test-runner idiom. Rhesis centers on generating and managing the test sets themselves and on behavior-driven coverage. They complement each other: many teams generate cases with Rhesis and run assertions or metrics with DeepEval, since the two solve different halves of the same problem.

### Should the API names in this guide be trusted exactly?

Treat the class and method names here as representative rather than exact. Rhesis is an evolving open-source project, and specific signatures can change between releases. The concepts, generate a test set, attach metrics, run a suite, gate CI, are stable, but confirm the precise import paths and arguments against the official documentation for the version you install before relying on them in production code.
`,
};
