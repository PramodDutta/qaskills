import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'DeepEval Metrics: The Complete 2026 Reference Guide',
  description:
    'Master all 50+ DeepEval metrics in 2026: G-Eval, answer relevancy, faithfulness, hallucination, agentic and conversational metrics with runnable pytest code.',
  date: '2026-06-08',
  category: 'Reference',
  content: `
# DeepEval Metrics: The Complete 2026 Reference Guide

DeepEval has become the de facto open-source framework for evaluating large language model (LLM) applications, and in 2026 it ships more than 50 research-backed metrics covering everything from retrieval-augmented generation (RAG) to autonomous agents and multi-turn conversational systems. If you have ever written a unit test with Pytest, DeepEval will feel instantly familiar: it treats every LLM output as something you can assert against, score, and gate in continuous integration (CI). The difference is that instead of comparing strings byte-for-byte, DeepEval uses LLM-as-a-judge scoring, statistical methods, and natural language inference (NLI) models to measure fuzzy qualities like relevancy, faithfulness, hallucination, bias, and tool-calling correctness.

This reference is written for QA engineers, ML engineers, and developers who need a single, comprehensive place to look up what each metric measures, which fields it requires, and how to run it. We cover installation and model setup, the \`LLMTestCase\` object that everything revolves around, the flagship \`GEval\` custom-criteria metric, the full suite of RAG metrics, safety metrics (hallucination, bias, toxicity), agentic metrics (\`ToolCorrectnessMetric\`, \`TaskCompletionMetric\`), conversational metrics, the \`assert_test\` and \`evaluate\` APIs, running everything under Pytest with \`deepeval test run\`, datasets and goldens, thresholds and reasoning, choosing your evaluation model, CI integration, and the free hosted Confident AI cloud tier. Every code block below is real, runnable Python that you can paste into a fresh virtual environment. By the end you will know exactly which metric to reach for in any evaluation scenario and how to wire it into an automated quality gate.

## Installing DeepEval and Setting Up Your Model

DeepEval is a pure Python package. Install it with pip and you immediately get the metrics library, the Pytest integration, and the \`deepeval\` command-line interface (CLI).

\`\`\`bash
pip install -U deepeval
\`\`\`

Most DeepEval metrics use an LLM as the judge, so you need to tell DeepEval which model to use. By default it uses OpenAI, so the simplest setup is to export your key:

\`\`\`bash
export OPENAI_API_KEY="sk-..."
\`\`\`

You can also pin a specific judge model globally from the CLI, which is handy in CI so every metric uses the same evaluator:

\`\`\`bash
deepeval set-model gpt-4o
\`\`\`

If you prefer to set it in code, pass the model name (or a custom model object) directly to any metric. We will cover swapping in Anthropic, Gemini, Ollama, or a local model in the "Choosing Your Evaluation Model" section below.

\`\`\`python
from deepeval.metrics import AnswerRelevancyMetric

metric = AnswerRelevancyMetric(threshold=0.7, model="gpt-4o", include_reason=True)
\`\`\`

That single line previews the three knobs you will use constantly: \`threshold\` (the pass/fail cutoff), \`model\` (the judge), and \`include_reason\` (whether DeepEval explains its score in plain English).

## The LLMTestCase Object: The Unit of Evaluation

Almost everything in DeepEval flows through the \`LLMTestCase\`. It is a plain data container that holds the inputs and outputs of a single interaction so a metric can score it. Understanding its fields is the single most important thing for using the library correctly, because each metric requires a specific subset of them.

\`\`\`python
from deepeval.test_case import LLMTestCase

test_case = LLMTestCase(
    input="What is the refund window for a damaged product?",
    actual_output="You can request a refund within 30 days of delivery for damaged items.",
    expected_output="Damaged items are eligible for a refund within 30 days of delivery.",
    retrieval_context=[
        "Our return policy allows refunds within 30 days of delivery.",
        "Damaged or defective products qualify for a full refund.",
    ],
    context=["Refunds for damaged goods are processed within 30 days."],
    tools_called=[],
)
\`\`\`

Here is what each field means and when you populate it:

| Field | Type | What it holds | Used by |
|---|---|---|---|
| \`input\` | str | The prompt or query sent to your LLM app | Almost every metric |
| \`actual_output\` | str | What your LLM app actually returned | Almost every metric |
| \`expected_output\` | str | The ideal/reference answer | G-Eval, correctness checks |
| \`retrieval_context\` | list[str] | Chunks your retriever actually fetched | RAG metrics |
| \`context\` | list[str] | The ideal ground-truth context | Hallucination, contextual recall |
| \`tools_called\` | list[ToolCall] | Tools the agent invoked | Agentic metrics |
| \`expected_tools\` | list[ToolCall] | Tools that should have been called | ToolCorrectnessMetric |

The crucial distinction many newcomers miss: \`retrieval_context\` is what your system *did* retrieve, while \`context\` is the ground-truth knowledge it *should* have used. RAG metrics judge your retriever using \`retrieval_context\`; the hallucination metric judges factual grounding against \`context\`.

## G-Eval: Custom Criteria With Any Rubric

\`GEval\` is DeepEval's most flexible metric. Based on the G-Eval research paper, it uses chain-of-thought prompting to turn a plain-English criterion (or a list of explicit evaluation steps) into a reliable 0-1 score. Reach for it whenever no built-in metric captures the quality you care about: tone, factual correctness against a reference, professionalism, JSON schema adherence, you name it.

\`\`\`python
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

correctness = GEval(
    name="Correctness",
    criteria="Determine whether the actual output is factually correct based on the expected output.",
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    threshold=0.5,
)

test_case = LLMTestCase(
    input="What is the capital of France?",
    actual_output="The capital of France is Paris.",
    expected_output="Paris is the capital of France.",
)

correctness.measure(test_case)
print(correctness.score)   # e.g. 0.9
print(correctness.reason)  # natural-language justification
\`\`\`

For tighter, more deterministic scoring, supply \`evaluation_steps\` instead of free-form \`criteria\`. Explicit steps reduce variance because the judge is not re-deriving the rubric on every run:

\`\`\`python
professional_tone = GEval(
    name="Professional Tone",
    evaluation_steps=[
        "Check whether the response avoids slang and casual filler words.",
        "Penalize any rudeness, sarcasm, or dismissive phrasing.",
        "Reward clear, polite, and respectful language.",
    ],
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.8,
)
\`\`\`

Because G-Eval is so adaptable, it is the metric most teams customize first. If you are comparing frameworks for this kind of flexibility, our [DeepEval vs RAGAS comparison](/blog/deepeval-vs-ragas-rag-evaluation-2026) breaks down how each handles custom rubrics.

## RAG Metrics: Measuring Retrieval and Generation Quality

RAG pipelines have two failure surfaces: the retriever can fetch the wrong chunks, and the generator can ignore or contradict the chunks it was given. DeepEval ships five metrics that pinpoint exactly where a RAG system breaks. They form the "RAG triad" plus two retriever-ranking metrics.

\`\`\`python
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    ContextualRelevancyMetric,
)
from deepeval.test_case import LLMTestCase

test_case = LLMTestCase(
    input="How long do I have to return a damaged item?",
    actual_output="You have 30 days from delivery to return a damaged item.",
    expected_output="Damaged items can be returned within 30 days of delivery.",
    retrieval_context=[
        "Returns for damaged goods are accepted within 30 days of delivery.",
        "Store credit is issued for opened software.",
    ],
)

metrics = [
    AnswerRelevancyMetric(threshold=0.7),
    FaithfulnessMetric(threshold=0.7),
    ContextualPrecisionMetric(threshold=0.7),
    ContextualRecallMetric(threshold=0.7),
    ContextualRelevancyMetric(threshold=0.7),
]

for metric in metrics:
    metric.measure(test_case)
    print(f"{metric.__class__.__name__}: {metric.score:.2f} -> {metric.reason}")
\`\`\`

Here is what each RAG metric catches and which fields it needs:

| Metric | What it catches | Required fields |
|---|---|---|
| AnswerRelevancyMetric | Output that wanders off-topic or adds irrelevant filler | input, actual_output |
| FaithfulnessMetric | Output that contradicts or hallucinates beyond the retrieved chunks | input, actual_output, retrieval_context |
| ContextualPrecisionMetric | Relevant chunks ranked below irrelevant ones (bad reranking) | input, expected_output, retrieval_context |
| ContextualRecallMetric | Retriever missing chunks needed to answer fully | input, expected_output, retrieval_context |
| ContextualRelevancyMetric | Retriever pulling noisy, off-topic chunks | input, retrieval_context |

A practical workflow: if \`AnswerRelevancyMetric\` and \`FaithfulnessMetric\` are high but \`ContextualRecallMetric\` is low, your generator is good but your retriever is dropping important documents. If faithfulness is low while the contextual metrics are high, your generator is hallucinating despite having the right context. This decomposition is why teams pick DeepEval over single-score tools. We go deeper into RAG benchmarking in our guide on [DeepEval vs RAGAS for RAG evaluation](/blog/deepeval-vs-ragas-rag-evaluation-2026).

## Hallucination, Bias, and Toxicity: Safety Metrics

Beyond correctness, you usually need safety gates. DeepEval bundles three referenceless-or-context-based safety metrics that you can run on any output.

The \`HallucinationMetric\` differs from faithfulness: faithfulness checks the answer against the *retrieved* context, while hallucination checks it against the ground-truth \`context\` you supply. A higher hallucination score means *more* hallucination, so you generally want it below a threshold.

\`\`\`python
from deepeval.metrics import HallucinationMetric
from deepeval.test_case import LLMTestCase

test_case = LLMTestCase(
    input="Describe the company's headquarters.",
    actual_output="The company is headquartered in a 40-story tower in Tokyo.",
    context=["The company is headquartered in a small office in Austin, Texas."],
)

hallucination = HallucinationMetric(threshold=0.3)
hallucination.measure(test_case)
print(hallucination.score)   # high -> contradicts the context
print(hallucination.reason)
\`\`\`

Bias and toxicity are referenceless: they only need \`actual_output\` (and \`input\` for context). They are ideal for red-teaming and safety regression suites.

\`\`\`python
from deepeval.metrics import BiasMetric, ToxicityMetric
from deepeval.test_case import LLMTestCase

test_case = LLMTestCase(
    input="Describe a great software engineer.",
    actual_output="A great software engineer is detail-oriented, curious, and collaborative.",
)

bias = BiasMetric(threshold=0.5)
toxicity = ToxicityMetric(threshold=0.5)

bias.measure(test_case)
toxicity.measure(test_case)
print("Bias:", bias.score, "| Toxicity:", toxicity.score)
\`\`\`

For both safety metrics, lower is better. Set strict thresholds (for example \`0.0\` or \`0.1\`) when you want any detectable bias or toxicity to fail the build.

## Agentic Metrics: Tool Correctness and Task Completion

As LLM apps evolve into autonomous agents that call tools, you need to evaluate the *trajectory* of actions, not just the final text. DeepEval's agentic metrics inspect the \`tools_called\` and \`expected_tools\` fields.

\`ToolCorrectnessMetric\` is deterministic (it does not call an LLM judge) and compares the tools your agent invoked against the tools it should have invoked.

\`\`\`python
from deepeval.metrics import ToolCorrectnessMetric
from deepeval.test_case import LLMTestCase, ToolCall

test_case = LLMTestCase(
    input="What's the weather in Paris and convert 100 USD to EUR?",
    actual_output="It's 18C in Paris, and 100 USD is about 92 EUR.",
    tools_called=[
        ToolCall(name="get_weather"),
        ToolCall(name="currency_convert"),
    ],
    expected_tools=[
        ToolCall(name="get_weather"),
        ToolCall(name="currency_convert"),
    ],
)

tool_correctness = ToolCorrectnessMetric()
tool_correctness.measure(test_case)
print(tool_correctness.score)  # 1.0 when the called tools match expected
print(tool_correctness.reason)
\`\`\`

\`TaskCompletionMetric\` is the higher-level companion: it uses an LLM judge to decide whether the agent actually accomplished what the user asked, given the full trace of tools and outputs.

\`\`\`python
from deepeval.metrics import TaskCompletionMetric
from deepeval.test_case import LLMTestCase, ToolCall

test_case = LLMTestCase(
    input="Book a table for two at an Italian restaurant tonight at 8pm.",
    actual_output="I booked a table for two at Trattoria Roma tonight at 8:00 PM.",
    tools_called=[
        ToolCall(name="search_restaurants", input_parameters={"cuisine": "Italian"}),
        ToolCall(name="create_reservation", input_parameters={"party_size": 2, "time": "20:00"}),
    ],
)

task_completion = TaskCompletionMetric(threshold=0.7, model="gpt-4o")
task_completion.measure(test_case)
print(task_completion.score)
print(task_completion.reason)
\`\`\`

Together these two answer the two questions every agent QA needs: did it use the right tools, and did it finish the job? Browse our [QA skills directory](/skills) for ready-made agent-testing patterns you can drop into a project.

## Conversational Metrics: Evaluating Multi-Turn Chats

Single-turn metrics miss problems that only appear across a dialogue: forgetting earlier context, breaking persona, or going in circles. For chatbots, use the \`ConversationalTestCase\`, which wraps an ordered list of turns, and the conversational metrics that score the dialogue as a whole.

\`\`\`python
from deepeval.test_case import ConversationalTestCase, Turn
from deepeval.metrics import (
    ConversationalGEval,
    KnowledgeRetentionMetric,
)

convo_test_case = ConversationalTestCase(
    turns=[
        Turn(role="user", content="Hi, my order number is A123."),
        Turn(role="assistant", content="Thanks! How can I help with order A123?"),
        Turn(role="user", content="When will it arrive?"),
        Turn(role="assistant", content="Order A123 is scheduled to arrive Friday."),
    ]
)

retention = KnowledgeRetentionMetric(threshold=0.7)
retention.measure(convo_test_case)
print(retention.score, retention.reason)

professionalism = ConversationalGEval(
    name="Professionalism",
    criteria="Evaluate whether the assistant stays polite and helpful across all turns.",
    threshold=0.8,
)
professionalism.measure(convo_test_case)
print(professionalism.score)
\`\`\`

\`KnowledgeRetentionMetric\` flags when the assistant forgets facts the user already provided (like order number A123). \`ConversationalGEval\` lets you apply any custom rubric across the whole conversation, mirroring how \`GEval\` works for single turns. Other conversational metrics include role adherence and conversation completeness, all following the same \`measure(convo_test_case)\` pattern.

## Running Evaluations: assert_test and evaluate

DeepEval gives you two execution styles. Use \`assert_test\` inside Pytest test functions when you want a hard pass/fail that fits an existing test suite. Use \`evaluate\` for batch, notebook, or script-based runs where you want a results report rather than an exception.

\`\`\`python
from deepeval import assert_test
from deepeval.metrics import AnswerRelevancyMetric
from deepeval.test_case import LLMTestCase

def test_relevancy():
    test_case = LLMTestCase(
        input="What's the capital of Japan?",
        actual_output="Tokyo is the capital of Japan.",
    )
    assert_test(test_case, [AnswerRelevancyMetric(threshold=0.7)])
\`\`\`

The \`evaluate\` function runs a list of test cases against a list of metrics and returns structured results without raising:

\`\`\`python
from deepeval import evaluate
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric
from deepeval.test_case import LLMTestCase

test_cases = [
    LLMTestCase(
        input="What's the capital of Japan?",
        actual_output="Tokyo.",
        retrieval_context=["Tokyo is the capital of Japan."],
    ),
    LLMTestCase(
        input="What's the capital of Italy?",
        actual_output="Rome.",
        retrieval_context=["Rome is the capital of Italy."],
    ),
]

results = evaluate(
    test_cases=test_cases,
    metrics=[AnswerRelevancyMetric(threshold=0.7), FaithfulnessMetric(threshold=0.7)],
)
\`\`\`

The \`evaluate\` API is the workhorse for offline benchmarking and for sweeping a whole dataset of goldens, which we cover next.

## Running Under Pytest With deepeval test run

DeepEval was designed to feel like Pytest, and it ships its own test runner that adds caching, parallelism, and rich reporting on top of standard Pytest. Write your tests exactly as above, then invoke them with the DeepEval CLI instead of plain \`pytest\`.

\`\`\`bash
deepeval test run test_chatbot.py
\`\`\`

You can parallelize across processes and reuse cached metric results between runs, which matters because LLM-judge calls cost money and time:

\`\`\`bash
deepeval test run test_chatbot.py -n 4 -c
\`\`\`

Here \`-n 4\` runs four workers in parallel and \`-c\` uses the cache so unchanged test cases are not re-scored. You can also iterate the same test case multiple times to measure metric stability, and mark hyperparameters for logging:

\`\`\`python
import deepeval
from deepeval import assert_test
from deepeval.metrics import AnswerRelevancyMetric
from deepeval.test_case import LLMTestCase

def test_with_repeats():
    test_case = LLMTestCase(
        input="Summarize the refund policy.",
        actual_output="Refunds are issued within 30 days.",
    )
    assert_test(test_case, [AnswerRelevancyMetric(threshold=0.7)])

@deepeval.log_hyperparameters(model="gpt-4o", prompt_template="v3")
def hyperparameters():
    return {"temperature": 0.0, "chunk_size": 512}
\`\`\`

If you are newer to the underlying test runner, our [Pytest official reference cheatsheet](/blog/pytest-official-reference-cheatsheet-2026) covers fixtures, markers, and parametrization that compose neatly with DeepEval tests.

## Datasets and Goldens: Scaling Beyond Single Cases

A "golden" is a saved test case template before your app has produced output. You collect goldens into an \`EvaluationDataset\`, run your application over each one to fill in \`actual_output\`, and then evaluate. This separates your test data from your application code, which is exactly how you scale to hundreds of cases.

\`\`\`python
from deepeval.dataset import EvaluationDataset, Golden
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric
from deepeval import evaluate

goldens = [
    Golden(input="What is the return window?"),
    Golden(input="Do you ship internationally?"),
    Golden(input="How do I reset my password?"),
]

dataset = EvaluationDataset(goldens=goldens)

# Run your LLM app over each golden to produce test cases.
def your_llm_app(query: str) -> str:
    return f"Answer to: {query}"

for golden in dataset.goldens:
    test_case = LLMTestCase(
        input=golden.input,
        actual_output=your_llm_app(golden.input),
    )
    dataset.add_test_case(test_case)

evaluate(test_cases=dataset.test_cases, metrics=[AnswerRelevancyMetric(threshold=0.7)])
\`\`\`

You can also iterate a dataset directly inside a Pytest parametrized test, so every golden becomes its own reported test case:

\`\`\`python
import pytest
from deepeval import assert_test
from deepeval.dataset import EvaluationDataset, Golden
from deepeval.metrics import AnswerRelevancyMetric
from deepeval.test_case import LLMTestCase

dataset = EvaluationDataset(goldens=[Golden(input="What is the return window?")])

@pytest.mark.parametrize("golden", dataset.goldens)
def test_dataset(golden):
    test_case = LLMTestCase(input=golden.input, actual_output="Within 30 days.")
    assert_test(test_case, [AnswerRelevancyMetric(threshold=0.7)])
\`\`\`

## Choosing Your Evaluation Model

The judge model directly affects score quality and cost. DeepEval supports OpenAI, Azure OpenAI, Anthropic, Google Gemini, Ollama, and any custom model you wrap. Set it globally via the CLI for consistency, or per-metric for fine-grained control.

\`\`\`bash
# Global defaults via CLI
deepeval set-model gpt-4o
deepeval set-ollama llama3.1        # local, free, offline
\`\`\`

To use a custom or local model in code, subclass \`DeepEvalBaseLLM\`:

\`\`\`python
from deepeval.models import DeepEvalBaseLLM

class CustomJudge(DeepEvalBaseLLM):
    def __init__(self, model):
        self.model = model

    def load_model(self):
        return self.model

    def generate(self, prompt: str) -> str:
        return self.model.invoke(prompt)

    async def a_generate(self, prompt: str) -> str:
        return self.model.invoke(prompt)

    def get_model_name(self):
        return "custom-judge"
\`\`\`

A practical rule: use a strong frontier model (such as \`gpt-4o\` or an equivalent) for production gates where score reliability matters, and a cheaper or local model for fast iteration. Mixing judges across runs makes scores incomparable, so pick one per benchmark. If you are weighing DeepEval against config-driven tools, our [Promptfoo vs DeepEval comparison](/blog/promptfoo-vs-deepeval-2026-comparison) contrasts how each handles model selection.

## CI Integration and the deepeval CLI

Because DeepEval tests are Pytest tests, they slot directly into any CI provider. The pattern is: install dependencies, set the judge model and API key as secrets, then run \`deepeval test run\` with caching and parallelism. A failing metric returns a non-zero exit code and fails the pipeline.

\`\`\`yaml
name: LLM Evals
on: [push, pull_request]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -U deepeval
      - name: Run DeepEval
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
          CONFIDENT_API_KEY: \${{ secrets.CONFIDENT_API_KEY }}
        run: deepeval test run tests/ -n 4 -c
\`\`\`

Use \`include_reason=True\` on your metrics so that when a gate fails in CI, the logs explain *why*. This turns a red build into an actionable bug report instead of an opaque number. For teams coming from generic eval harnesses, our [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026) shows how the CI flow compares.

## Confident AI: The Free Hosted Cloud Tier

DeepEval is built by Confident AI, which offers a hosted cloud platform with a free tier. Logging in connects your local runs to a dashboard where you get persistent test reports, regression tracking across runs, side-by-side comparisons of prompt or model changes, dataset management, and shareable results for non-technical stakeholders.

\`\`\`bash
deepeval login
\`\`\`

After logging in, every \`deepeval test run\` and \`evaluate\` call automatically streams results to your project on the cloud. Nothing changes in your test code; the same metrics and thresholds you already wrote now produce historical trends and visual reports. This is the fastest way to move from "evals pass on my laptop" to "the whole team can see eval quality over time." You can keep everything local if you prefer, but the hosted dashboard removes the work of building your own reporting layer.

## Metric Selection Quick Reference

When you are unsure which metric to grab, this grouped table maps the common evaluation goal to the right metric and the fields it needs.

| Category | Metric | What it measures | Key fields |
|---|---|---|---|
| Custom | GEval / ConversationalGEval | Any rubric you define | depends on params |
| RAG | AnswerRelevancyMetric | Answer stays on-topic | input, actual_output |
| RAG | FaithfulnessMetric | Answer grounded in retrieved chunks | + retrieval_context |
| RAG | ContextualPrecisionMetric | Relevant chunks ranked first | + expected_output |
| RAG | ContextualRecallMetric | All needed chunks retrieved | + expected_output |
| RAG | ContextualRelevancyMetric | Retrieved chunks are on-topic | + retrieval_context |
| Safety | HallucinationMetric | Output contradicts ground truth | + context |
| Safety | BiasMetric | Discriminatory or skewed output | actual_output |
| Safety | ToxicityMetric | Harmful or offensive language | actual_output |
| Agentic | ToolCorrectnessMetric | Correct tools invoked | tools_called, expected_tools |
| Agentic | TaskCompletionMetric | Agent finished the task | input, actual_output, tools_called |
| Conversational | KnowledgeRetentionMetric | Remembers earlier turns | turns |

## Best Practices for Reliable Evaluations

A few habits separate flaky eval suites from trustworthy ones. First, always set explicit \`threshold\` values that reflect your real quality bar rather than accepting defaults; a metric without a meaningful threshold is just a dashboard, not a gate. Second, enable \`include_reason=True\` during development so you can read why a score is low and fix the right thing. Third, prefer \`evaluation_steps\` over free-form \`criteria\` in G-Eval for production gates, because explicit steps cut score variance dramatically.

Fourth, pin one judge model per benchmark and keep the judge temperature at zero so scores are comparable across runs. Fifth, use the \`-c\` cache flag and run repeated iterations on a handful of cases to measure metric stability before trusting a single number. Sixth, separate your goldens (test data) from your application code using \`EvaluationDataset\`, so QA can grow the suite without touching the app. Finally, gate only the metrics that matter for the change at hand: running all 50 metrics on every commit is slow and noisy, while a focused set of three to five high-signal metrics keeps CI fast and meaningful. You can find reusable evaluation patterns and starter suites in the [QA skills directory](/skills).

## Frequently Asked Questions

### What are the main DeepEval metrics?

DeepEval ships over 50 metrics across categories: RAG metrics (answer relevancy, faithfulness, contextual precision, recall, and relevancy), safety metrics (hallucination, bias, toxicity), agentic metrics (tool correctness, task completion), conversational metrics (knowledge retention, role adherence), and the flexible G-Eval metric for any custom rubric. Most use an LLM judge, while a few like tool correctness are deterministic.

### How does DeepEval G-Eval work?

G-Eval turns a plain-English criterion or list of evaluation steps into a 0-1 score using chain-of-thought prompting with an LLM judge. You define what good looks like in natural language, specify which test-case fields to consider, and set a threshold. It is the most flexible metric because it can evaluate qualities no built-in metric covers, such as tone, schema adherence, or domain-specific correctness.

### What is the difference between answer relevancy and faithfulness in DeepEval?

AnswerRelevancyMetric checks whether the output actually addresses the input question without irrelevant filler, using only input and actual_output. FaithfulnessMetric checks whether the output stays grounded in the retrieved_context without contradicting or hallucinating beyond it. Relevancy is about staying on topic; faithfulness is about not making things up relative to your retrieved documents.

### How is the DeepEval hallucination metric different from faithfulness?

HallucinationMetric compares the output against the ground-truth \`context\` you provide, while FaithfulnessMetric compares it against the \`retrieval_context\` your system actually fetched. Use hallucination when you have a reference truth and want to detect contradictions; use faithfulness to test whether your generator respects whatever the retriever supplied, even if that retrieval was imperfect. Note that a higher hallucination score means more hallucination.

### How do I run DeepEval with Pytest?

Write standard Pytest functions that build an \`LLMTestCase\` and call \`assert_test(test_case, [metric])\`. Then run them with the DeepEval CLI: \`deepeval test run test_file.py\`. Add \`-n 4\` for parallel workers and \`-c\` to cache results between runs. A failing metric raises an assertion, so the build fails just like any other test, making it ideal for CI gates.

### Is DeepEval free to use?

Yes. DeepEval is open source and free to run entirely locally; you only pay for the LLM judge calls to whatever provider you choose, and you can avoid even that by using a local model through Ollama. Confident AI, the company behind DeepEval, also offers a free hosted cloud tier with dashboards, regression tracking, and dataset management via \`deepeval login\`.

### Which model should I use as the DeepEval judge?

Use a strong frontier model such as \`gpt-4o\` for production quality gates where score reliability matters, and a cheaper or local model (via Ollama) for fast iteration. Set it globally with \`deepeval set-model\` for consistency, or per metric with the \`model\` argument. Always keep one judge per benchmark and temperature at zero so scores stay comparable across runs.

### Can DeepEval evaluate AI agents and tool use?

Yes. ToolCorrectnessMetric deterministically compares the tools your agent called against the tools it should have called using the \`tools_called\` and \`expected_tools\` fields. TaskCompletionMetric uses an LLM judge to decide whether the agent actually accomplished the user's goal given its full action trace. Together they evaluate both the trajectory of tool calls and the final outcome of an agentic workflow.

## Conclusion

DeepEval gives you a Pytest-native, research-backed way to measure LLM quality across every architecture that matters in 2026: RAG pipelines, autonomous agents, and multi-turn chatbots. The pattern is always the same: build an \`LLMTestCase\`, choose the metrics that catch your specific failure mode, set thresholds with \`include_reason\` turned on, and gate it in CI with \`deepeval test run\`. Start with three to five high-signal metrics, layer in G-Eval for anything custom, and connect Confident AI when you want historical trends for the whole team.

Ready to put these metrics to work? Explore the [QA skills directory](/skills) for ready-to-use evaluation suites, then compare your options with our [DeepEval vs RAGAS guide](/blog/deepeval-vs-ragas-rag-evaluation-2026), [Promptfoo vs DeepEval comparison](/blog/promptfoo-vs-deepeval-2026-comparison), and [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026). Pick one metric, write one test, and ship your first quality gate today.
`,
};
