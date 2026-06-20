import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Comet Opik LLM Evaluation Guide 2026: Tracing + Metrics',
  description:
    'Comet Opik guide for 2026: install Opik, trace LLM apps with the @track decorator, run evaluate with datasets and metrics, use G-Eval, and wire eval into CI/CD.',
  date: '2026-06-20',
  category: 'Guide',
  content: `
# Comet Opik LLM Evaluation Guide 2026: Tracing and Metrics

Opik is an open-source LLM evaluation and observability platform built by Comet. It gives you two tightly integrated capabilities in one tool: *tracing*, which records every prompt, response, tool call, and span your LLM application produces, and *evaluation*, which scores those outputs against datasets using a library of metrics including LLM-as-judge. Because Opik is open source you can self-host it for free or use Comet's managed cloud, and because tracing and evaluation share the same data model, the production traffic you capture in production becomes the test data you evaluate against in development.

Opik matters because LLM applications fail in ways traditional software does not. A model can hallucinate a fact, drift off topic, leak unsafe content, or quietly degrade after a prompt tweak, and none of that shows up in a stack trace. You need observability to see what your application actually did on real inputs, and you need evaluation to quantify whether outputs are good. Opik unifies both: you instrument your app with a single \`@track\` decorator, inspect runs in the Opik dashboard, build datasets from the traces that failed, and then run \`evaluate()\` with metrics like Hallucination, AnswerRelevance, ContextPrecision, ContextRecall, Moderation, and GEval to measure quality at scale.

This guide covers what Opik is, installation and configuration, tracing with the \`@track\` decorator, the \`evaluate()\` function with datasets and metrics, the built-in metric library, LLM-as-judge and G-Eval, the Opik dashboard, framework integrations for OpenAI, LangChain, and LlamaIndex, CI/CD integration, the choice between self-hosting and cloud, and how Opik compares to LangSmith and Langfuse. Opik moves quickly, so treat the code as accurate usage patterns and confirm exact names against the official Opik docs before pinning a version. If you want a broader grounding in LLM evaluation first, the [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026) pairs well with this one.

## What Opik is

Opik is an open-source platform for evaluating, testing, and monitoring LLM applications, maintained by Comet. It combines three things most teams otherwise stitch together from separate tools: a tracing layer that captures the full execution of an LLM app as nested spans, an evaluation engine that scores outputs against datasets using configurable metrics, and a dashboard that visualizes both. The design goal is a single loop: observe production, capture failing examples into datasets, evaluate fixes against those datasets, and ship with confidence.

Tracing in Opik records *traces* (one per top-level request) made of *spans* (individual steps like a retrieval, an LLM call, or a tool invocation). Each span carries inputs, outputs, latency, token usage, and metadata. Evaluation runs a *task* over a *dataset* and applies *metrics*, logging an *experiment* you can compare against previous runs. Because both halves share the same backend, the boundary between observing and testing nearly disappears.

That unification is the conceptual heart of Opik and worth dwelling on. In most teams, observability and evaluation are separate worlds owned by different tools and often different people. The on-call engineer watches production logs and traces, while the ML engineer maintains a folder of evaluation scripts and golden datasets that slowly drift out of sync with what users actually send. Opik collapses that gap. The same trace you inspect to debug a production incident can be promoted into an evaluation dataset with its inputs and expected behavior, so the bug you just fixed becomes a permanent regression test. Over time this turns your evaluation suite into a living record of every real-world failure mode your application has encountered, which is far more valuable than a hand-written dataset that only reflects what an engineer imagined might go wrong. The result is a feedback loop where production teaches your tests and your tests protect production.

## Installation and configuration

Opik installs from PyPI as a Python SDK with a companion CLI configuration step:

\`\`\`bash
pip install opik
\`\`\`

After installing, run the interactive configuration command, which stores your connection details (whether you use Comet Cloud or a self-hosted instance):

\`\`\`bash
opik configure
\`\`\`

For non-interactive environments such as CI, configure Opik with environment variables instead:

\`\`\`bash
export OPIK_API_KEY="your_key_here"
export OPIK_WORKSPACE="your_workspace"
# For a self-hosted instance, also set the base URL:
export OPIK_URL_OVERRIDE="http://localhost:5173/api"
\`\`\`

Many metrics use an LLM judge, so set your model provider key as well:

\`\`\`bash
export OPENAI_API_KEY="your_key_here"
\`\`\`

With configuration in place, the SDK knows where to send traces and evaluation results, and they appear in the Opik dashboard.

## Tracing with the @track decorator

The fastest way to start with Opik is tracing. Decorate any function with \`@opik.track\` and Opik records its inputs, outputs, and timing as a span. Nested decorated functions automatically build a tree, so you see the full structure of a request.

\`\`\`python
import opik

@opik.track
def retrieve(question: str) -> list[str]:
    # Your retrieval logic; return a list of context chunks.
    return ["Paris is the capital of France."]

@opik.track
def generate(question: str, context: list[str]) -> str:
    # Your LLM call, using the retrieved context.
    return "The capital of France is Paris."

@opik.track
def answer(question: str) -> str:
    context = retrieve(question)
    return generate(question, context)

print(answer("What is the capital of France?"))
\`\`\`

Each call to \`answer\` produces one trace in the Opik dashboard with nested spans for \`retrieve\` and \`generate\`, including the arguments passed, the values returned, and the latency of each step. This is the same observability you would expect from an APM tool, specialized for the prompt-and-response shape of LLM apps. When something goes wrong in production, you open the trace and see exactly what context was retrieved and what the model did with it.

You can enrich traces beyond the automatic capture. Inside a tracked function you can attach feedback scores, tags, and metadata to the current span, which is how you correlate runtime context with quality later. For example, you might tag each trace with the model name, the prompt version, and the user's tenant, then filter the dashboard to see whether one prompt version hallucinates more than another, or whether a particular customer segment triggers slower responses. You can also record a user thumbs-up or thumbs-down against the trace as a feedback score, giving you real human signal alongside automated metrics. Because these annotations live on the same trace objects your evaluation runs against, the metadata you collect in production flows naturally into the datasets and experiments you build later, with no separate plumbing to maintain.

## The evaluate() function with datasets and metrics

Tracing tells you what happened; evaluation tells you whether it was good. Opik's \`evaluate()\` function runs an *evaluation task* over a *dataset* and applies a list of *metrics*, logging the result as an experiment.

\`\`\`python
import opik
from opik.evaluation import evaluate
from opik.evaluation.metrics import AnswerRelevance, Hallucination

client = opik.Opik()

# Create or load a dataset of examples.
dataset = client.get_or_create_dataset(name="capitals-eval")
dataset.insert([
    {"input": "What is the capital of France?", "context": "Paris is the capital of France."},
    {"input": "What is the capital of Japan?", "context": "Tokyo is the capital of Japan."},
])

# The task maps a dataset item to the fields the metrics need.
def evaluation_task(item: dict) -> dict:
    output = my_llm_app(item["input"])  # your application under test
    return {
        "input": item["input"],
        "output": output,
        "context": [item["context"]],
    }

result = evaluate(
    dataset=dataset,
    task=evaluation_task,
    scoring_metrics=[AnswerRelevance(), Hallucination()],
)

print(result)
\`\`\`

Opik runs \`evaluation_task\` over every dataset item, applies each metric to the produced output, and aggregates the scores into an experiment visible in the dashboard. Because the dataset is a first-class, versioned object, you can grow it over time by inserting the very traces that failed in production.

## Built-in metrics

Opik ships a library of metrics covering hallucination, relevance, retrieval quality, and safety. You import them from \`opik.evaluation.metrics\` and pass instances into \`scoring_metrics\`.

| Metric | What it measures | Needs context? | Needs reference? |
| --- | --- | --- | --- |
| \`Hallucination\` | Whether the answer contains claims unsupported by context | Yes | No |
| \`AnswerRelevance\` | Whether the answer is relevant to the question | No | No |
| \`ContextPrecision\` | Whether retrieved context is relevant to the question | Yes | Optional |
| \`ContextRecall\` | Whether the context covers the information needed to answer | Yes | Yes |
| \`Moderation\` | Whether the output contains unsafe or policy-violating content | No | No |
| \`GEval\` | A custom LLM-as-judge metric defined by your own rubric | Flexible | Flexible |

A typical RAG evaluation combines several of these:

\`\`\`python
from opik.evaluation.metrics import (
    Hallucination,
    AnswerRelevance,
    ContextPrecision,
    ContextRecall,
    Moderation,
)

metrics = [
    Hallucination(),
    AnswerRelevance(),
    ContextPrecision(),
    ContextRecall(),
    Moderation(),
]
\`\`\`

The ContextPrecision and ContextRecall metrics map directly onto the retrieval-quality concepts used across RAG evaluation tooling. If you want a deeper treatment of those, our [Ragas RAG evaluation metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) explains precision, recall, and faithfulness in detail.

## LLM-as-judge and G-Eval

Many quality dimensions are subjective and cannot be checked by code. Opik's LLM-as-judge metrics use a strong model to grade outputs, and the most flexible of these is \`GEval\`, an implementation of the G-Eval technique. You describe the criteria in natural language and Opik builds a judge that scores each output against them.

\`\`\`python
from opik.evaluation.metrics import GEval

helpfulness = GEval(
    name="Helpfulness",
    task_introduction=(
        "You are judging whether an assistant's answer is genuinely helpful "
        "to the user who asked the question."
    ),
    evaluation_criteria=(
        "Award a high score when the answer is accurate, directly addresses "
        "the question, and is easy to act on. Penalize vague, evasive, or "
        "off-topic answers."
    ),
)

result = evaluate(
    dataset=dataset,
    task=evaluation_task,
    scoring_metrics=[helpfulness],
)
\`\`\`

G-Eval returns a normalized score plus a chain-of-thought rationale, so you can read *why* an output was rated low. As with any LLM-as-judge approach, validate the judge against a handful of human-labeled examples before treating its scores as a release gate, and lean on cheaper deterministic metrics wherever a hard rule can express the requirement.

## The Opik dashboard

The Opik dashboard is where tracing and evaluation come together visually. Traces appear as a searchable, filterable list; click one to see its nested spans, inputs, outputs, latency, and token cost. Evaluation experiments appear as runs you can compare, with per-metric aggregate scores and per-example breakdowns so you can find exactly which inputs regressed.

The dashboard also lets you turn observations into datasets directly: when you find a trace that produced a bad answer, you add it to an evaluation dataset with a click, closing the loop between production monitoring and offline testing. Online evaluation rules can score live traces automatically as they arrive, so you can alert on a rising hallucination rate in production rather than waiting for a scheduled offline run.

## Integrations: OpenAI, LangChain, LlamaIndex

Opik integrates with the major LLM frameworks so tracing requires little or no manual instrumentation. For the OpenAI SDK, wrap the client and every call is traced automatically:

\`\`\`python
from openai import OpenAI
from opik.integrations.openai import track_openai

client = track_openai(OpenAI())

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "What is the capital of France?"}],
)
\`\`\`

For LangChain, attach the Opik callback handler so every chain and agent step is captured:

\`\`\`python
from opik.integrations.langchain import OpikTracer

opik_tracer = OpikTracer()
result = my_chain.invoke({"question": "What is the capital of France?"}, config={"callbacks": [opik_tracer]})
\`\`\`

LlamaIndex integrates similarly through Opik's callback so RAG pipelines built on LlamaIndex are traced end to end. These integrations mean you usually get full traces by adding one wrapper or callback, without rewriting your application logic.

## CI/CD integration

The real value of evaluation appears when it runs automatically on every change. Run \`evaluate()\` in a script, read an aggregate metric from the result, and fail the build when it drops below a threshold. This gives prompts and models the same regression protection you already give code with [pytest](/blog/what-is-pytest-python-explained).

\`\`\`python
# ci_eval.py
import sys
import opik
from opik.evaluation import evaluate
from opik.evaluation.metrics import Hallucination, AnswerRelevance

client = opik.Opik()
dataset = client.get_or_create_dataset(name="capitals-eval")

result = evaluate(
    dataset=dataset,
    task=evaluation_task,
    scoring_metrics=[Hallucination(), AnswerRelevance()],
)

# Aggregate the per-example relevance scores into a mean.
scores = [s.value for r in result.test_results for s in r.score_results
          if s.name == "answer_relevance_metric"]
mean_relevance = sum(scores) / len(scores) if scores else 0.0

THRESHOLD = 0.8
if mean_relevance < THRESHOLD:
    print(f"FAIL: relevance {mean_relevance:.2f} below {THRESHOLD}")
    sys.exit(1)
print(f"PASS: relevance {mean_relevance:.2f}")
\`\`\`

Wire that into GitHub Actions so it runs on every pull request:

\`\`\`yaml
name: opik-eval
on: [pull_request]
jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install opik openai
      - run: python ci_eval.py
        env:
          OPIK_API_KEY: \${{ secrets.OPIK_API_KEY }}
          OPIK_WORKSPACE: \${{ secrets.OPIK_WORKSPACE }}
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
\`\`\`

Now a pull request that increases hallucination or drops relevance below the bar fails CI before it can merge, the same way a broken unit test would.

## Self-hosting vs cloud

Because Opik is open source, you choose where it runs. The self-hosted option deploys the full stack locally or on your own infrastructure, typically via Docker or a Helm chart, keeping all trace and evaluation data inside your network at zero license cost. The Comet Cloud option is fully managed: you sign up, get an API key, and Comet runs the backend, storage, and dashboard for you.

| Aspect | Self-hosted Opik | Comet Cloud Opik |
| --- | --- | --- |
| Cost | Free (you pay infrastructure) | Managed tiers, free tier available |
| Data residency | Stays in your network | Hosted by Comet |
| Setup effort | Run Docker/Helm yourself | Sign up, get a key |
| Maintenance | You patch and scale it | Comet handles it |
| Best for | Strict data-privacy needs | Fast start, no ops overhead |

A common pattern is to start on the cloud free tier to validate the workflow, then move to self-hosting once data-privacy or volume requirements justify running your own instance. The SDK code is identical either way; only the configuration target changes.

## Opik vs LangSmith vs Langfuse

Opik sits in a crowded space of LLM observability and evaluation tools. The closest comparisons are LangSmith and Langfuse, and the right choice depends on openness, framework ties, and how much evaluation depth you need.

| Tool | Open source | Self-host | Framework neutral | Eval depth | Best for |
| --- | --- | --- | --- | --- | --- |
| Opik | Yes | Yes | Yes | Strong metric library + G-Eval | Teams wanting OSS eval + tracing in one |
| LangSmith | No | Limited | LangChain-centric | Strong | Teams deep in the LangChain ecosystem |
| Langfuse | Yes | Yes | Yes | Good, growing | OSS observability with prompt management |

Opik's distinguishing strengths are its open-source license with a genuinely free self-host path and its built-in metric library including G-Eval, which makes it easy to score outputs without bolting on a separate evaluation tool. LangSmith is the natural pick if your stack is already built on LangChain. Langfuse is a strong open-source alternative with excellent prompt management. For RAG-heavy teams comparing dedicated metric suites, our [DeepEval vs Ragas guide](/blog/deepeval-vs-ragas-rag-evaluation-2026) covers the metric side of the decision.

## Frequently Asked Questions

### What is Comet Opik used for?

Opik is an open-source LLM evaluation and observability platform from Comet. It is used to trace LLM applications (capturing every prompt, response, tool call, and span), to evaluate outputs against datasets with metrics like Hallucination and AnswerRelevance, and to monitor applications in production. Tracing and evaluation share one backend, so production traffic becomes test data for offline evaluation.

### How do I install and configure Opik?

Install with \`pip install opik\`, then run \`opik configure\` to store your connection details interactively. For CI or headless environments, set environment variables instead: \`OPIK_API_KEY\`, \`OPIK_WORKSPACE\`, and for self-hosting \`OPIK_URL_OVERRIDE\`. Because many metrics use an LLM judge, also set your model provider key such as \`OPENAI_API_KEY\` before running evaluations.

### What does the @track decorator do in Opik?

The \`@opik.track\` decorator instruments a Python function so Opik records its inputs, outputs, and latency as a span. When you decorate nested functions, Opik builds a trace tree automatically, showing the full structure of a request including retrieval and generation steps. Each call produces one searchable trace in the Opik dashboard with per-step timing and token usage.

### What metrics does Opik provide?

Opik ships metrics including Hallucination, AnswerRelevance, ContextPrecision, ContextRecall, Moderation, and the customizable G-Eval. Hallucination flags claims unsupported by context, AnswerRelevance checks the answer addresses the question, ContextPrecision and ContextRecall measure retrieval quality for RAG, Moderation catches unsafe content, and GEval lets you define an LLM-as-judge metric from a natural-language rubric.

### What is G-Eval in Opik?

G-Eval is an LLM-as-judge technique exposed in Opik through the \`GEval\` metric. You describe a task introduction and evaluation criteria in natural language, and Opik builds a judge that scores each output against them, returning a normalized score plus a chain-of-thought rationale. It is ideal for subjective dimensions like helpfulness or tone that hard-coded rules cannot capture.

### Can I self-host Opik or use the cloud?

Both. Opik is open source, so you can self-host the full stack via Docker or Helm at no license cost, keeping all data in your own network. Alternatively, Comet Cloud offers a managed version with a free tier where you sign up and get an API key. The SDK code is identical either way; only the configuration target changes, so you can migrate later.

### How does Opik compare to LangSmith and Langfuse?

Opik is open source with a free self-host path and a strong built-in metric library including G-Eval, making it good for teams wanting evaluation and tracing in one open tool. LangSmith is proprietary and LangChain-centric, ideal if your stack is built on LangChain. Langfuse is open source with excellent prompt management. The choice hinges on openness, framework ties, and evaluation depth.

## Conclusion

Opik gives you tracing and evaluation in a single open-source tool, which makes the loop from production observation to offline testing genuinely tight. Instrument your app with \`@opik.track\`, capture failing traces into versioned datasets, run \`evaluate()\` with metrics like Hallucination, AnswerRelevance, ContextPrecision, ContextRecall, Moderation, and G-Eval, and gate releases in CI/CD so quality regressions never merge. Start by adding the decorator to one critical function, watch a few traces land in the dashboard, then build your first evaluation dataset from the examples that matter most.

Want more tools to round out your AI testing stack? Browse the [QASkills directory](/skills) for installable evaluation and testing skills for AI coding agents, and pair Opik with solid Python test hygiene from our [pytest fixtures and conftest guide](/blog/pytest-fixtures-conftest-complete-guide-2026) to ship reliable LLM applications.
`,
};
