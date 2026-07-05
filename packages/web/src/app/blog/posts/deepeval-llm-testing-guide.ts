import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'DeepEval: LLM Testing with Pytest, The Complete 2026 Guide',
  description:
    'Learn DeepEval, the open-source pytest-style framework for LLM evaluation. Metrics, LLMTestCase, assert_test, CI gating, red teaming, and synthetic datasets.',
  date: '2026-07-05',
  category: 'Tutorial',
  content: `
# DeepEval: LLM Testing with Pytest in 2026

If you ship anything built on top of a large language model -- a RAG chatbot, an agent, a summarizer, a classification pipeline -- you eventually hit the same wall: how do you know it still works after you change the prompt, swap the model, or update the retrieval index? Traditional unit tests assume deterministic outputs. LLMs do not give you that. The same input can produce different phrasing every run, so \`assert output == "expected"\` is useless. This is exactly the gap DeepEval fills.

DeepEval is an open-source LLM evaluation framework that behaves like "pytest for LLMs." You write test cases in plain Python, pick from a library of research-backed metrics (answer relevancy, faithfulness, hallucination, contextual precision/recall, toxicity, bias, and fully custom criteria), and run them with the exact same \`pytest\` command your team already uses. It plugs into GitHub Actions so a bad prompt fails the build the same way a bad function fails a unit test. This tutorial walks through installation, the core \`LLMTestCase\` abstraction, every important metric, the \`deepeval test run\` CLI, synthetic dataset generation, red teaming, the optional Confident AI platform, and how to gate CI. Every code block is runnable. By the end you will be able to add a regression-proof evaluation suite to any LLM feature. If you are new to evaluating model outputs generally, our [AI agent evaluation and testing guide](/blog/ai-agent-eval-testing-guide) sets the broader context first.

---

## What DeepEval Is and Why It Exists

DeepEval treats an LLM output like a system under test. Instead of asserting exact strings, you assert that the output *satisfies measurable properties*. Each property is a **metric** that returns a score between 0 and 1 plus a human-readable reason. You set a threshold, and the test passes when the score clears it.

The design goals that matter in practice:

- **Pytest-native.** Tests are ordinary \`test_*.py\` functions. No new runner to learn, no new CI wiring.
- **Self-explaining failures.** Every metric can emit a reason string, so when a test fails you see *why* the answer was judged irrelevant or unfaithful, not just a number.
- **LLM-as-a-judge under the hood.** Most metrics use a judge model (GPT-4 class by default) to grade outputs, with techniques like G-Eval and QAG to reduce noise. See our deeper explainer on the [LLM-as-a-judge pattern](/blog/llm-as-a-judge-evaluation-guide).
- **Local or platform.** It runs entirely locally, or you can push results to Confident AI for dashboards, regression tracking, and dataset management.

---

## Installing DeepEval and First Run

DeepEval targets Python 3.9+. Install it with pip:

\`\`\`bash
pip install -U deepeval
\`\`\`

Most metrics call a judge model. By default that is OpenAI, so export a key:

\`\`\`bash
export OPENAI_API_KEY="sk-..."
\`\`\`

You can point DeepEval at any model instead -- Anthropic Claude, a local Ollama model, Azure OpenAI, or a custom \`DeepEvalBaseLLM\` subclass -- which we cover later. Verify the install:

\`\`\`bash
deepeval --version
\`\`\`

Create your first test file, \`test_first.py\`:

\`\`\`python
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric


def test_answer_relevancy():
    test_case = LLMTestCase(
        input="What is the capital of France?",
        actual_output="The capital of France is Paris.",
    )
    metric = AnswerRelevancyMetric(threshold=0.7)
    assert_test(test_case, [metric])
\`\`\`

Run it exactly like any pytest suite:

\`\`\`bash
deepeval test run test_first.py
\`\`\`

You will get a pass/fail table with scores and reasons. \`deepeval test run\` is a thin wrapper over pytest that adds caching, parallelism, and a results summary.

---

## The LLMTestCase: The Unit of Evaluation

Everything in DeepEval revolves around \`LLMTestCase\`. Which fields you populate depends on which metrics you plan to run.

| Field | Type | Required for | Meaning |
|---|---|---|---|
| \`input\` | str | almost all metrics | The prompt or user query |
| \`actual_output\` | str | almost all metrics | What your LLM actually produced |
| \`expected_output\` | str | reference-based metrics | The ideal/reference answer |
| \`context\` | list[str] | hallucination | Ground-truth facts the model should not contradict |
| \`retrieval_context\` | list[str] | RAG metrics | Chunks your retriever returned |
| \`tools_called\` | list | agentic metrics | Tools the agent invoked |

A fully populated RAG test case looks like this:

\`\`\`python
from deepeval.test_case import LLMTestCase

test_case = LLMTestCase(
    input="How many vacation days do full-time employees get?",
    actual_output="Full-time employees receive 20 paid vacation days per year.",
    expected_output="Full-time employees get 20 vacation days annually.",
    retrieval_context=[
        "Full-time staff are entitled to 20 days of paid vacation each year.",
        "Part-time staff accrue vacation on a pro-rata basis.",
    ],
)
\`\`\`

The golden rule: a metric can only run if the test case has the fields it needs. \`FaithfulnessMetric\` requires \`retrieval_context\`; \`AnswerRelevancyMetric\` only needs \`input\` and \`actual_output\`.

---

## Core Metrics: Relevancy, Faithfulness, Hallucination

These three are the workhorses of most LLM evaluation suites.

**AnswerRelevancyMetric** measures whether the output actually addresses the input, penalizing rambling or off-topic content:

\`\`\`python
from deepeval.metrics import AnswerRelevancyMetric

metric = AnswerRelevancyMetric(threshold=0.7, model="gpt-4o", include_reason=True)
metric.measure(test_case)
print(metric.score)   # e.g. 0.92
print(metric.reason)  # why it scored that way
\`\`\`

**FaithfulnessMetric** is the key RAG metric. It checks whether the \`actual_output\` is grounded in the \`retrieval_context\` -- i.e., the model did not invent claims beyond what retrieval supplied:

\`\`\`python
from deepeval.metrics import FaithfulnessMetric

faithfulness = FaithfulnessMetric(threshold=0.8)
faithfulness.measure(test_case)  # needs retrieval_context
\`\`\`

**HallucinationMetric** compares the output against a ground-truth \`context\` (not retrieval chunks) and scores how much of the answer contradicts known facts. Lower is better here, so it is inverted internally to fit the threshold model:

\`\`\`python
from deepeval.metrics import HallucinationMetric
from deepeval.test_case import LLMTestCase

case = LLMTestCase(
    input="Who wrote Hamlet?",
    actual_output="Hamlet was written by Charles Dickens in 1600.",
    context=["Hamlet is a tragedy written by William Shakespeare."],
)
HallucinationMetric(threshold=0.3).measure(case)  # will fail: contradicts context
\`\`\`

---

## RAG Metrics: Contextual Precision and Recall

For retrieval pipelines, faithfulness alone is not enough -- you also need to know whether the *retriever* did its job. DeepEval ships a full RAG triad.

- **ContextualPrecisionMetric** -- are the relevant chunks ranked above the irrelevant ones in \`retrieval_context\`?
- **ContextualRecallMetric** -- does \`retrieval_context\` contain everything needed to produce the \`expected_output\`?
- **ContextualRelevancyMetric** -- what fraction of retrieved chunks are actually relevant?

\`\`\`python
from deepeval.metrics import (
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    ContextualRelevancyMetric,
)
from deepeval import assert_test

def test_rag_pipeline():
    metrics = [
        ContextualPrecisionMetric(threshold=0.7),
        ContextualRecallMetric(threshold=0.7),
        ContextualRelevancyMetric(threshold=0.6),
    ]
    assert_test(test_case, metrics)  # test_case must have retrieval_context + expected_output
\`\`\`

Reading the triad together tells you where a RAG failure lives: low recall means your retriever missed context; low faithfulness with high recall means the generator ignored good context; low precision means noisy chunks are drowning the signal.

---

## Custom Criteria with GEval

Real products have domain rules that no off-the-shelf metric captures: "must include a citation," "must not give medical advice," "tone must stay professional." \`GEval\` lets you define an arbitrary judged criterion in natural language. It is DeepEval's implementation of the G-Eval paper, which uses chain-of-thought plus form-filling to produce stable scores.

\`\`\`python
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

correctness = GEval(
    name="Correctness",
    criteria="Determine whether the actual output is factually correct "
    "and does not omit any key detail present in the expected output.",
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    threshold=0.8,
)
\`\`\`

You can also supply explicit \`evaluation_steps\` instead of free-form \`criteria\` when you want the judge to follow a precise rubric, which improves reproducibility. GEval is the escape hatch that covers everything the named metrics do not.

---

## Safety Metrics: Toxicity and Bias

Two metrics guard the outputs users actually see.

**ToxicityMetric** flags harmful, hateful, or abusive language in \`actual_output\`. **BiasMetric** detects gender, racial, political, or other bias. Both are judge-based and return a reason, which is essential for triaging a failure.

\`\`\`python
from deepeval.metrics import ToxicityMetric, BiasMetric
from deepeval import assert_test

def test_output_is_safe():
    assert_test(test_case, [
        ToxicityMetric(threshold=0.5),
        BiasMetric(threshold=0.5),
    ])
\`\`\`

Wire these into every user-facing suite. They are cheap insurance against a model regression that starts emitting unsafe content after a prompt tweak.

---

## Running Suites with the deepeval CLI

\`deepeval test run\` adds capabilities plain pytest lacks. The most useful flags:

\`\`\`bash
# Run in parallel across 4 workers
deepeval test run test_suite.py -n 4

# Cache passing results so unchanged cases are skipped on re-runs
deepeval test run test_suite.py -c

# Repeat each test to smooth out judge variance
deepeval test run test_suite.py -r 2

# Stop on first failure
deepeval test run test_suite.py -x
\`\`\`

For evaluating a whole dataset outside pytest, use the \`evaluate\` function, which is handy in notebooks and scripts:

\`\`\`python
from deepeval import evaluate
from deepeval.metrics import AnswerRelevancyMetric

evaluate(
    test_cases=[test_case_1, test_case_2, test_case_3],
    metrics=[AnswerRelevancyMetric(threshold=0.7)],
)
\`\`\`

---

## Synthetic Dataset Generation

You rarely start with a labeled evaluation set. DeepEval's \`Synthesizer\` generates realistic test inputs (called goldens) from your source documents or contexts, so you can build a benchmark without hand-writing hundreds of cases.

\`\`\`python
from deepeval.synthesizer import Synthesizer

synthesizer = Synthesizer()
goldens = synthesizer.generate_goldens_from_docs(
    document_paths=["docs/handbook.pdf", "docs/faq.md"],
)

# Each golden has an input (and optionally expected_output + context)
for golden in goldens[:3]:
    print(golden.input)
\`\`\`

You can also evolve simple questions into harder, multi-hop variants to stress-test retrieval. Store the generated goldens as a dataset and reuse them across every CI run so your benchmark stays stable while your system changes.

---

## Red Teaming for LLM Safety

Beyond correctness, you need adversarial testing. DeepEval's red-teaming module (packaged as \`deepteam\`) probes for jailbreaks, prompt injection, PII leakage, and unsafe content by generating attack prompts and scoring how your model responds.

\`\`\`bash
pip install deepteam
\`\`\`

\`\`\`python
from deepteam import red_team
from deepteam.vulnerabilities import Bias, PIILeakage
from deepteam.attacks.single_turn import PromptInjection

def model_callback(prompt: str) -> str:
    # call your actual LLM app here
    return my_llm_app(prompt)

risk_assessment = red_team(
    model_callback=model_callback,
    vulnerabilities=[Bias(), PIILeakage()],
    attacks=[PromptInjection()],
)
\`\`\`

Run red teaming on a schedule, not on every commit -- it is expensive -- but treat any new high-severity finding as a release blocker. For a broader look at securing model-generated systems, see our [security testing for AI-generated code](/blog/security-testing-ai-generated-code) guide.

---

## Gating CI with GitHub Actions

The payoff is a build that fails when quality drops. Because \`deepeval test run\` exits non-zero on failure, wiring it into CI is trivial:

\`\`\`yaml
name: LLM Eval
on: [pull_request]

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -U deepeval
      - name: Run LLM evaluations
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: deepeval test run tests/ -n 4
\`\`\`

Practical tips: pin metric thresholds conservatively so ordinary judge variance does not cause flakes, use \`-r 2\` to average out noise on critical tests, and keep the CI dataset small (20-50 goldens) so runs stay fast and cheap. Push results to Confident AI if you want per-PR regression diffs.

---

## Using a Custom Judge Model

You are not locked into OpenAI. To judge with Anthropic Claude, subclass \`DeepEvalBaseLLM\`:

\`\`\`python
from deepeval.models.base_model import DeepEvalBaseLLM
from anthropic import Anthropic

class ClaudeJudge(DeepEvalBaseLLM):
    def __init__(self):
        self.client = Anthropic()

    def load_model(self):
        return self.client

    def generate(self, prompt: str) -> str:
        msg = self.client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text

    async def a_generate(self, prompt: str) -> str:
        return self.generate(prompt)

    def get_model_name(self):
        return "Claude Sonnet 4.5"

metric = AnswerRelevancyMetric(threshold=0.7, model=ClaudeJudge())
\`\`\`

Choosing a strong judge matters: a weak judge produces noisy scores and unstable thresholds. Match the judge to a frontier-class model even when the system under test is smaller and cheaper.

---

## DeepEval vs Ragas vs Promptfoo

DeepEval is not the only option. Here is how the three most common open-source tools compare.

| Feature | DeepEval | Ragas | Promptfoo |
|---|---|---|---|
| Primary interface | Pytest / Python | Python / notebooks | YAML config + CLI |
| Best for | Regression suites, agents, RAG | RAG-specific metrics | Prompt A/B comparison |
| Metric library | 20+ (incl. custom GEval) | RAG-focused set | Assertions + LLM rubric |
| Custom criteria | GEval (natural language) | Limited | \`llm-rubric\` |
| Synthetic data | Yes (Synthesizer) | Yes (TestsetGenerator) | Limited |
| Red teaming | Yes (deepteam) | No | Yes (redteam) |
| CI integration | Native pytest exit codes | Manual | Native CLI exit codes |
| Platform/dashboard | Confident AI | Optional | Promptfoo cloud |

Rule of thumb: pick **DeepEval** when you want a code-first, pytest-native regression suite for a RAG app or agent; pick **Ragas** when you live in notebooks and want RAG metrics fast; pick **Promptfoo** when your main job is comparing prompt/model variants side by side. Many teams run DeepEval for gating and Promptfoo for exploration. For the wider landscape, our [best AI testing tools of 2026](/blog/best-ai-testing-tools-2026) roundup covers adjacent options.

---

## Testing Agents and Tool Calls

Modern LLM applications are rarely a single prompt-and-response. They are agents that plan, call tools, retrieve context, and loop. DeepEval extends its test case model to cover these multi-step traces so you can evaluate the *process*, not just the final answer.

For agentic systems, populate \`tools_called\` on the test case and use metrics that inspect them. The **ToolCorrectnessMetric** checks whether the agent invoked the tools you expected in the right order, which catches regressions where a prompt change makes the agent skip a critical step:

\`\`\`python
from deepeval.test_case import LLMTestCase, ToolCall
from deepeval.metrics import ToolCorrectnessMetric

case = LLMTestCase(
    input="What is the weather in Paris and should I bring an umbrella?",
    actual_output="It is raining in Paris, so yes, bring an umbrella.",
    tools_called=[ToolCall(name="get_weather"), ToolCall(name="reasoning")],
    expected_tools=[ToolCall(name="get_weather")],
)
ToolCorrectnessMetric().measure(case)
\`\`\`

DeepEval also supports component-level evaluation with the \`@observe\` decorator, letting you attach metrics to individual spans inside an agent run -- the retriever, the generator, each tool call -- so a failure points at the exact component that broke rather than the whole pipeline. This is the difference between "the agent gave a bad answer" and "the retriever returned irrelevant chunks on hop two." Trace-level evaluation is what makes DeepEval viable for production agents rather than just single-turn chatbots.

---

## A Recommended Suite Structure

A maintainable evaluation suite mirrors a good unit-test suite: fast, deterministic where possible, and organized by concern. A structure that scales well:

| Layer | Runs when | Contents |
|---|---|---|
| Smoke evals | Every PR | 10-20 goldens, cheap metrics, tight thresholds |
| Full regression | Nightly | Full dataset, all metrics, repeated runs |
| Red team | Weekly | deepteam adversarial probes |
| Exploration | On demand | Notebook \`evaluate()\` for new prompts |

Keep goldens in version control next to the code they test, name metrics after the behavior they protect, and treat a threshold change like a code review: it should be deliberate and explained. When a genuine improvement raises your baseline, ratchet the threshold up so quality never silently regresses back to the old level. This discipline turns evaluation from a one-off experiment into a durable safety net your whole team relies on.

---

## Frequently Asked Questions

### What is DeepEval used for?

DeepEval is an open-source framework for evaluating large language model outputs. It is used to build regression test suites for RAG systems, agents, chatbots, and any LLM feature. You define test cases and metrics -- like answer relevancy, faithfulness, hallucination, and custom criteria -- then run them with pytest so quality is measured automatically on every code change.

### Is DeepEval free and open source?

Yes. The core DeepEval library is free and open source under the Apache 2.0 license, and you can run every metric locally with your own model API key. Confident AI is the optional paid cloud platform that adds dashboards, dataset management, and regression tracking on top of the open-source library, but you never need it to run evaluations.

### How is DeepEval different from pytest?

DeepEval is built on top of pytest, not a replacement for it. Regular pytest asserts exact, deterministic outputs, which does not work for LLMs. DeepEval adds LLM-specific metrics that score non-deterministic outputs against thresholds, an LLM-as-a-judge engine, caching, and result summaries. You still run everything with a familiar \`deepeval test run\` command that wraps pytest.

### Does DeepEval require OpenAI?

No. OpenAI is the default judge model, but you can use Anthropic Claude, Azure OpenAI, Google Gemini, local Ollama models, or any custom model by subclassing \`DeepEvalBaseLLM\`. Choose a strong, frontier-class judge model regardless of which model powers your actual application, since judge quality directly affects how reliable your scores are.

### What is the difference between faithfulness and hallucination metrics?

FaithfulnessMetric checks whether the output is grounded in the \`retrieval_context\` your RAG pipeline returned, so it tests the generator against retrieved chunks. HallucinationMetric compares the output against a ground-truth \`context\` you supply as known facts, scoring contradictions. Use faithfulness for RAG grounding and hallucination for factual accuracy against a trusted reference set.

### Can DeepEval run in CI/CD?

Yes, and that is its main strength. Because \`deepeval test run\` returns a non-zero exit code when any test fails, you drop it straight into GitHub Actions or any CI system to block merges when quality drops. Keep the CI dataset small, pin thresholds conservatively, and use the repeat flag to smooth judge variance so runs stay fast and non-flaky.

### How do I reduce flaky LLM eval results?

Judge models are stochastic, so scores wobble. Reduce flakiness by using a strong judge model, running each test multiple times with the \`-r\` flag to average scores, setting thresholds with a safety margin below your observed baseline, providing explicit \`evaluation_steps\` in GEval instead of vague criteria, and caching passing results so you only re-run what changed.

### What is red teaming in DeepEval?

Red teaming is adversarial testing that probes your LLM for safety failures like jailbreaks, prompt injection, PII leakage, bias, and toxic output. DeepEval provides it through the companion \`deepteam\` package, which generates attack prompts, sends them to your model, and scores the responses against defined vulnerabilities. Run it on a schedule and treat new high-severity findings as release blockers.

---

## Conclusion

DeepEval turns LLM evaluation from a vague, manual chore into an automated, pytest-native discipline. You get research-backed metrics for relevancy, faithfulness, hallucination, RAG quality, and safety; a natural-language escape hatch via GEval for domain-specific rules; synthetic data generation to build benchmarks fast; red teaming for adversarial coverage; and clean CI gating so a bad prompt fails the build like a bad function. Start small -- one metric, one test case, one \`deepeval test run\` -- then grow the suite as your product does.

Ready to add evaluation skills to your AI coding agent? Browse the curated, agent-ready testing skills at [qaskills.sh/skills](/skills) and drop DeepEval-powered evaluation into your workflow today.
`,
};
