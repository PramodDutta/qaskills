import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Arize Phoenix: LLM Tracing + Evaluations Guide 2026',
  description:
    'Arize Phoenix guide: launch the app, auto-instrument tracing with OpenInference, run evaluations with phoenix.evals, and log eval results back onto spans.',
  date: '2026-06-11',
  category: 'Reference',
  content: `
# Arize Phoenix: LLM Tracing and Evaluations Guide 2026

Arize Phoenix is the open-source observability and evaluation platform for large language model (LLM) applications. It does two things exceptionally well, and you will use both: it captures distributed traces of every LLM call, retrieval, and agent step through OpenTelemetry and OpenInference auto-instrumentation, and it runs LLM-based evaluations on those traces with the \`phoenix.evals\` library. The result is a single local-or-self-hosted tool where you can see exactly what your application did, score the quality of what it did, and attach those quality scores right back onto the traces so you can sort, filter, and debug by evaluation result.

Phoenix runs entirely on your machine with a single function call — no API keys, no cloud account, no vendor lock-in. You launch the app, point your existing LLM framework at it through one of the OpenInference instrumentors (LangChain, LlamaIndex, OpenAI, and many more), and traces stream into a browser UI in real time. From there you pull spans into a pandas DataFrame, run evaluators such as \`HallucinationEvaluator\`, \`QAEvaluator\`, and \`RelevanceEvaluator\` over them with \`run_evals\` or the lower-level \`llm_classify\`, and log the labeled results back to Phoenix so the trace UI shows a hallucination or relevance verdict next to every span.

This reference is written for QA engineers, ML engineers, and developers who want a practical, runnable walkthrough of the full Phoenix loop: launch, instrument, trace, evaluate, and log results back. We cover \`px.launch_app()\` versus a standalone Phoenix server, the OpenTelemetry and OpenInference instrumentation model, capturing spans and reading them in the UI, the \`phoenix.evals\` evaluator catalog, logging evaluations onto spans, and the datasets-and-experiments workflow for offline, repeatable testing. Every code block is real, runnable Python.

## Installing Phoenix and the Instrumentors

Phoenix is a Python package. Install the core library plus the OpenTelemetry helper and whichever OpenInference instrumentor matches your stack.

\`\`\`bash
pip install arize-phoenix openinference-instrumentation-openai opentelemetry-sdk
# add the instrumentor for your framework, e.g.:
pip install openinference-instrumentation-langchain
pip install openinference-instrumentation-llama-index
\`\`\`

The \`arize-phoenix\` package bundles the trace collector, the web UI, and the \`phoenix.evals\` evaluation library. The \`openinference-instrumentation-*\` packages are thin auto-instrumentors that hook into the framework you already use and emit OpenInference-flavored OpenTelemetry spans. You only install the instrumentors for the frameworks you actually run.

## Launching Phoenix: px.launch_app vs the Server

The fastest way to start is \`px.launch_app()\`, which boots an in-process Phoenix collector and UI and returns a session object with the local URL. This is ideal for notebooks and local development.

\`\`\`python
import phoenix as px

session = px.launch_app()
print(session.url)  # e.g. http://localhost:6006 — open this in your browser
\`\`\`

For long-running services, CI, or team use, run Phoenix as a standalone server instead so traces persist independently of your application process. Start it from the CLI or with Docker, then point your app's exporter at its endpoint:

\`\`\`bash
# CLI server
phoenix serve

# or Docker
docker run -p 6006:6006 -p 4317:4317 arizephoenix/phoenix:latest
\`\`\`

The server listens on port 6006 for the UI and 4317 for the OpenTelemetry gRPC collector. In application code you then register a tracer provider that exports to that collector rather than launching an in-process app. Use \`launch_app()\` while exploring and the standalone server once you want traces to outlive a single script.

## Instrumenting Your App with OpenInference

Phoenix uses OpenTelemetry as its transport and OpenInference as its semantic convention for LLM spans. The \`register()\` helper from \`phoenix.otel\` wires up a tracer provider pointed at Phoenix in one line, and each instrumentor patches its framework so every call is captured automatically — you do not write any manual span code.

\`\`\`python
from phoenix.otel import register
from openinference.instrumentation.openai import OpenAIInstrumentor

# Point traces at the local Phoenix collector
tracer_provider = register(project_name="my-rag-app", endpoint="http://localhost:6006/v1/traces")

# Auto-instrument the OpenAI SDK — every call now emits a span
OpenAIInstrumentor().instrument(tracer_provider=tracer_provider)

# Any OpenAI call from here on is traced automatically
from openai import OpenAI
client = OpenAI()
client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Summarize OpenTelemetry in one sentence."}],
)
\`\`\`

Swap the instrumentor to match your framework. The pattern is identical: register once, instrument the framework, then run your app normally.

### Instrumentation Reference

| Framework | Instrumentor package | Instrumentor class |
|---|---|---|
| OpenAI SDK | openinference-instrumentation-openai | \`OpenAIInstrumentor\` |
| LangChain | openinference-instrumentation-langchain | \`LangChainInstrumentor\` |
| LlamaIndex | openinference-instrumentation-llama-index | \`LlamaIndexInstrumentor\` |
| Anthropic | openinference-instrumentation-anthropic | \`AnthropicInstrumentor\` |
| DSPy | openinference-instrumentation-dspy | \`DSPyInstrumentor\` |
| Bedrock | openinference-instrumentation-bedrock | \`BedrockInstrumentor\` |

Calling \`.instrument(tracer_provider=tracer_provider)\` on any of these patches the underlying library so chains, retrievers, tool calls, and completions all show up as nested spans with the right OpenInference attributes (input, output, token counts, retrieval documents).

## Capturing Spans and Traces

Once instrumented, every operation produces a span, and related spans roll up into a trace. A single RAG request, for example, becomes one trace containing a retriever span (with the documents it fetched) and an LLM span (with the prompt and completion). Here is a LangChain example whose entire execution is captured without any manual tracing code.

\`\`\`python
from phoenix.otel import register
from openinference.instrumentation.langchain import LangChainInstrumentor

tracer_provider = register(project_name="langchain-demo")
LangChainInstrumentor().instrument(tracer_provider=tracer_provider)

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([("user", "Explain {topic} in two sentences.")])
chain = prompt | ChatOpenAI(model="gpt-4o-mini")

result = chain.invoke({"topic": "vector databases"})
# This invocation produced a trace: prompt span -> chat model span
print(result.content)
\`\`\`

Each span records latency, inputs, outputs, token usage, and any errors. Because the instrumentation follows the OpenInference spec, Phoenix knows which spans are LLM calls versus retrievals versus tool invocations, which is what makes the next step — evaluation — possible without you labeling span types by hand.

## Exploring Traces in the Phoenix UI

Open the session URL (typically http://localhost:6006) and you land in the trace UI. Each trace is a waterfall of spans; click one to inspect its input prompt, output completion, retrieved documents, token counts, and latency. You can filter by project, search span content, and drill from a slow or failing trace down to the exact span that caused the problem.

The UI is also where evaluation results surface. After you run evals and log them back (covered below), each span gains an annotation column showing its hallucination, relevance, or QA-correctness label, so you can sort the table to find every hallucinated answer or every irrelevant retrieval at a glance. This tight loop — see what happened, then see how good it was, in the same view — is the core value of Phoenix and why it is worth pairing with a broader [LLM guardrails testing](/blog/llm-guardrails-testing-guide-2026) strategy.

## Pulling Spans into a DataFrame for Evaluation

To evaluate traces, you first pull them out of Phoenix as a pandas DataFrame using a span query. Phoenix provides helper query builders that select the fields evaluators expect — for example the input, output, and retrieved reference text.

\`\`\`python
import phoenix as px
from phoenix.trace.dsl import SpanQuery

client = px.Client()

# Select LLM spans and project their input/output into evaluator-friendly columns
query = SpanQuery().where("span_kind == 'LLM'").select(
    input="input.value",
    output="output.value",
)

spans_df = client.query_spans(query, project_name="my-rag-app")
print(spans_df.head())
\`\`\`

The DataFrame is the bridge between tracing and evaluation: rows are spans, columns are the fields your evaluators read. For RAG you typically also project the retrieved \`reference\` text so hallucination and relevance evaluators have context to judge against.

## Running Evaluations with phoenix.evals

The \`phoenix.evals\` library provides ready-made, prompt-engineered evaluators that classify each row with an LLM judge. You define the judge model once, then pass a list of evaluators and your spans DataFrame to \`run_evals\`. The output is one labeled DataFrame per evaluator.

\`\`\`python
from phoenix.evals import (
    OpenAIModel,
    HallucinationEvaluator,
    QAEvaluator,
    RelevanceEvaluator,
    run_evals,
)

judge = OpenAIModel(model="gpt-4o")

hallucination_eval = HallucinationEvaluator(judge)
qa_eval = QAEvaluator(judge)
relevance_eval = RelevanceEvaluator(judge)

# spans_df must contain the columns each evaluator needs
# (input, output, reference for hallucination/QA; input, reference for relevance)
hallucination_df, qa_df = run_evals(
    dataframe=spans_df,
    evaluators=[hallucination_eval, qa_eval],
    provide_explanation=True,
)

print(hallucination_df.head())  # label: "factual"/"hallucinated" + explanation
\`\`\`

Setting \`provide_explanation=True\` makes each evaluator return a natural-language rationale alongside the label, which is what you want in a debugging workflow. \`run_evals\` runs evaluators concurrently and is the high-level entry point most teams use.

### phoenix.evals Evaluator Reference

| Evaluator | Judges | Reads columns | Output labels |
|---|---|---|---|
| \`HallucinationEvaluator\` | Is the answer grounded in the reference? | input, output, reference | factual / hallucinated |
| \`QAEvaluator\` | Is the answer correct for the question? | input, output, reference | correct / incorrect |
| \`RelevanceEvaluator\` | Is the retrieved doc relevant to the query? | input, reference | relevant / unrelated |
| \`ToxicityEvaluator\` | Is the output toxic? | input | toxic / non-toxic |
| \`SummarizationEvaluator\` | Is the summary faithful and complete? | input, output | good / bad |

Each evaluator is a prompt template plus a label rail tuned for its task. They are intentionally narrow and composable: run as many as you need over the same DataFrame in one \`run_evals\` call.

## llm_classify: The Custom Evaluation Primitive

When the built-in evaluators do not match your criterion, drop down to \`llm_classify\`, the primitive they are built on. You supply a prompt template with placeholders, a list of allowed output labels (the "rails"), and the DataFrame, and Phoenix returns a labeled DataFrame. This is how you build domain-specific evals — tone, compliance, citation style — without leaving Phoenix.

\`\`\`python
from phoenix.evals import OpenAIModel, llm_classify

TEMPLATE = '''
You are grading whether an answer cites its sources.
Question: {input}
Answer: {output}
Respond with exactly one word: "cited" or "uncited".
'''

result_df = llm_classify(
    dataframe=spans_df,
    model=OpenAIModel(model="gpt-4o"),
    template=TEMPLATE,
    rails=["cited", "uncited"],
    provide_explanation=True,
)

print(result_df["label"].value_counts())
\`\`\`

The \`rails\` argument constrains the judge to a fixed label set, which makes results machine-readable and easy to aggregate. \`llm_classify\` is the open-ended escape hatch that keeps Phoenix from boxing you into its built-in evaluator catalog.

## Logging Evaluation Results Back onto Spans

The payoff of the whole loop is logging eval labels back to Phoenix so they appear on the spans in the UI. You attach the span IDs to the eval DataFrame and call \`log_evaluations\` with a \`SpanEvaluations\` object named after the metric.

\`\`\`python
import phoenix as px
from phoenix.trace import SpanEvaluations

# The eval DataFrame must be indexed by span_id so Phoenix knows which span to annotate
hallucination_df = hallucination_df.set_index(spans_df.index)

px.Client().log_evaluations(
    SpanEvaluations(eval_name="Hallucination", dataframe=hallucination_df),
)
# Refresh the Phoenix UI: every span now shows a Hallucination label column
\`\`\`

After logging, the trace table gains a sortable column for that evaluation. You can now filter to every hallucinated answer, jump straight to the offending span, and read both the model's output and the judge's explanation side by side. That is the complete observability-plus-evaluation loop that defines Phoenix.

## Datasets and Experiments for Repeatable Testing

Live tracing tells you what is happening in production, but for regression testing you want a fixed set of inputs you can re-run after every change. Phoenix datasets and experiments provide exactly that. You upload a dataset of examples, define a task function that runs your app on each example, attach evaluators, and Phoenix records every run as a versioned experiment you can compare over time.

\`\`\`python
import phoenix as px
from phoenix.experiments import run_experiment
from phoenix.experiments.evaluators import create_evaluator

client = px.Client()

dataset = client.upload_dataset(
    dataset_name="rag-regression-v1",
    inputs=[{"question": "What is OpenTelemetry?"}, {"question": "What is a span?"}],
    outputs=[{"answer": "A tracing framework."}, {"answer": "A unit of work in a trace."}],
)

def task(example):
    # Call your real RAG app here and return its answer
    return my_rag_app(example.input["question"])

@create_evaluator(name="contains_keyword")
def keyword_check(output, expected) -> float:
    return 1.0 if expected["answer"].split()[0].lower() in output.lower() else 0.0

experiment = run_experiment(dataset, task=task, evaluators=[keyword_check])
print(experiment)  # scores per example, comparable across experiment runs
\`\`\`

Experiments turn evaluation into a repeatable, versioned process: change a prompt, re-run the experiment, and Phoenix shows whether scores improved or regressed against the same dataset. This is the offline counterpart to live tracing and the piece that makes Phoenix a genuine testing tool, not just a viewer. Compare this workflow with the [OpenAI agent evals datasets guide](/blog/openai-agent-evals-datasets-workflow-guide-2026) and browse evaluation patterns in the [QA skills directory](/skills).

## Choosing and Configuring the Judge Model

Every \`phoenix.evals\` evaluator delegates its verdict to an LLM judge, so the model you pick directly determines how trustworthy your scores are. Phoenix wraps each provider behind a thin model class — \`OpenAIModel\`, \`AnthropicModel\`, \`VertexAIModel\`, \`BedrockModel\`, and \`LiteLLMModel\` for everything else — and you pass an instance to the evaluator or to \`llm_classify\`. The judge is completely independent of the model your application uses to generate answers, so you can run a small, cheap model in production and still grade its output with a strong reasoning model offline.

\`\`\`python
from phoenix.evals import OpenAIModel, AnthropicModel, LiteLLMModel

# A strong reasoning model as the judge
openai_judge = OpenAIModel(model="gpt-4o", temperature=0.0)

# Or Anthropic
anthropic_judge = AnthropicModel(model="claude-3-5-sonnet-20241022")

# Or anything LiteLLM supports, including local Ollama models
ollama_judge = LiteLLMModel(model="ollama/llama3")
\`\`\`

Set \`temperature=0.0\` on the judge so classifications are deterministic and reproducible across runs — you do not want a span flipping between "factual" and "hallucinated" on identical input. For high-stakes domains, validate the judge against a small hand-labeled set first: run the evaluator over examples you have graded yourself and confirm the judge agrees before trusting it on thousands of unlabeled spans. A miscalibrated judge produces confident but wrong labels, which is worse than no labels at all, so this calibration step is the single most important reliability decision in the entire Phoenix evaluation loop.

## Putting It Together: The Full Trace-to-Eval Loop

It helps to see the five stages as one continuous pipeline rather than separate features. The loop is: launch Phoenix, instrument your framework, run your application to capture traces, query the spans into a DataFrame, evaluate them, and log the results back onto the spans. The script below stitches the whole thing together end to end so you can run it as a single file and watch labeled traces appear in the UI.

\`\`\`python
import phoenix as px
from phoenix.otel import register
from phoenix.trace.dsl import SpanQuery
from phoenix.trace import SpanEvaluations
from phoenix.evals import OpenAIModel, HallucinationEvaluator, run_evals
from openinference.instrumentation.openai import OpenAIInstrumentor

# 1. Launch + instrument
session = px.launch_app()
tp = register(project_name="loop-demo")
OpenAIInstrumentor().instrument(tracer_provider=tp)

# 2. Run the app (every call is now traced)
from openai import OpenAI
OpenAI().chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "When was the Eiffel Tower completed?"}],
)

# 3. Query spans into a DataFrame
client = px.Client()
spans_df = client.query_spans(
    SpanQuery().where("span_kind == 'LLM'").select(
        input="input.value", output="output.value", reference="output.value"
    ),
    project_name="loop-demo",
)

# 4. Evaluate
judge = OpenAIModel(model="gpt-4o", temperature=0.0)
(hallucination_df,) = run_evals(
    dataframe=spans_df,
    evaluators=[HallucinationEvaluator(judge)],
    provide_explanation=True,
)

# 5. Log results back onto the spans
client.log_evaluations(
    SpanEvaluations(eval_name="Hallucination", dataframe=hallucination_df),
)
print("Open", session.url, "to see labeled traces")
\`\`\`

Run this once and the Phoenix UI shows a trace whose LLM span carries a Hallucination label and the judge's explanation. That is the entire value proposition in one screen: you can see what your application did and how good it was, in the same place, and you can repeat the loop after every code change to catch regressions early. Pair this live loop with the offline experiments workflow above and you have both production observability and pre-merge regression testing covered by a single open-source tool.

## Frequently Asked Questions

### What is the difference between px.launch_app and the Phoenix server?

\`px.launch_app()\` starts an in-process Phoenix collector and UI inside your Python session, which is perfect for notebooks and quick local debugging but disappears when the process ends. The standalone server, started with \`phoenix serve\` or Docker, runs independently on ports 6006 and 4317 so traces persist across application restarts and can be shared by a team or used in CI.

### How does Phoenix auto-instrumentation work?

Phoenix uses OpenTelemetry for transport and OpenInference for LLM semantic conventions. You call \`register()\` to create a tracer provider pointed at Phoenix, then call \`.instrument()\` on an OpenInference instrumentor such as \`LangChainInstrumentor\` or \`OpenAIInstrumentor\`. The instrumentor patches the framework so every chain, retriever, tool call, and completion emits a span automatically, with no manual tracing code in your application.

### Which evaluators does phoenix.evals provide?

The built-in catalog includes \`HallucinationEvaluator\`, \`QAEvaluator\`, \`RelevanceEvaluator\`, \`ToxicityEvaluator\`, and \`SummarizationEvaluator\`, among others. Each is a prompt template plus a fixed label rail tuned for one task. You run any combination of them over a spans DataFrame with \`run_evals\`, and for criteria the catalog does not cover you use the lower-level \`llm_classify\` primitive with your own template and rails.

### How do I get evaluation labels to show up on traces?

Run your evaluators to produce a labeled DataFrame, index it by span ID, wrap it in a \`SpanEvaluations\` object with an \`eval_name\`, and call \`px.Client().log_evaluations(...)\`. Refresh the Phoenix UI and each span gains a sortable column for that evaluation, letting you filter directly to hallucinated or irrelevant spans and read the judge's explanation next to the output.

### What are Phoenix datasets and experiments used for?

Datasets are fixed collections of input/output examples, and experiments run your application's task function over a dataset with attached evaluators, recording each run as a versioned result. Together they give you repeatable regression testing: change a prompt or model, re-run \`run_experiment\`, and Phoenix compares the new scores against previous runs over the identical inputs so you can catch quality regressions before shipping.

### Does Phoenix require a cloud account or API key?

No. Phoenix is fully open source and runs locally with a single \`px.launch_app()\` call or as a self-hosted server via \`phoenix serve\` or Docker, with no Phoenix account required. You only need an LLM provider key (such as OpenAI or Anthropic) for the judge model used by \`phoenix.evals\`, since evaluations rely on an LLM-as-a-judge to classify outputs.

### Can Phoenix trace frameworks other than LangChain?

Yes. OpenInference ships instrumentors for OpenAI, LangChain, LlamaIndex, Anthropic, DSPy, Bedrock, and more. The pattern is identical for each: install the matching \`openinference-instrumentation-*\` package, call \`register()\`, then call \`.instrument()\` on the instrumentor. You can also instrument multiple frameworks at once if your app combines them, and all spans land in the same Phoenix project.

## Conclusion and Next Steps

Arize Phoenix closes the loop between observability and evaluation for LLM applications. Launch it with one function call, auto-instrument your stack through OpenInference, watch traces stream into the UI, pull spans into a DataFrame, score them with \`phoenix.evals\` evaluators or a custom \`llm_classify\` template, and log the labels back so the trace UI becomes a quality dashboard. Add datasets and experiments and you have repeatable regression testing on top of live tracing.

Start small: instrument one framework, capture a few traces, and run \`HallucinationEvaluator\` over them. Once that loop feels natural, add experiments for regression coverage and compare your approach with the [DeepEval RAG evaluation metrics reference](/blog/deepeval-rag-evaluation-metrics-reference-2026), the [TruLens RAG triad guide](/blog/trulens-rag-triad-groundedness-context-relevance-2026), and the [promptfoo red teaming guide](/blog/promptfoo-red-teaming-guide-2026). Browse runnable evaluation skills in the [QA skills directory](/skills) to ship LLM observability this week.
`,
};
