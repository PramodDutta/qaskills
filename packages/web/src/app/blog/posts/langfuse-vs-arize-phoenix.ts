import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Langfuse vs Arize Phoenix: Open-Source LLM Observability (2026)',
  description:
    'Langfuse vs Arize Phoenix for 2026: tracing model, evals, local-first vs self-host, OTel and OpenInference, datasets, RAG debugging, dashboards, and Python SDK examples compared.',
  date: '2026-07-13',
  category: 'Comparison',
  content: `
# Langfuse vs Arize Phoenix: Open-Source LLM Observability (2026)

Two open-source projects dominate the conversation when engineers want to trace, debug, and evaluate LLM applications without handing data to a closed SaaS: Langfuse and Arize Phoenix. Both are free to run yourself, both capture traces, and both offer evaluation tooling. But they were born from different places. Langfuse grew as a full LLM engineering platform (tracing, prompt management, datasets, evals, dashboards) with a paid cloud alongside the open core. Phoenix grew out of Arize's ML observability heritage as a local-first, notebook-friendly tool built tightly around OpenTelemetry and the OpenInference semantic conventions.

This guide compares them across the dimensions that decide adoption in 2026: the tracing model, evals, local-first versus self-host, OpenTelemetry and OpenInference support, dataset and experiment workflows, dashboards, RAG debugging, Python SDK ergonomics, and how each integrates with DeepEval and Ragas. Both projects iterate quickly, so treat the code as accurate patterns and verify exact names against current docs.

## What each tool is

Langfuse is an LLM engineering platform with an MIT-licensed core. It captures traces (spans and generations), manages versioned prompts, stores datasets, runs LLM-as-judge and human evaluations, and renders customizable dashboards. It ships a Python and a JS/TS SDK and ingests OpenTelemetry spans. You can use Langfuse Cloud or self-host the full stack. Its center of gravity is being the single pane of glass for an LLM product across dev and production. See our [Langfuse observability guide](/blog/langfuse-llm-observability-guide-2026) for a deeper single-tool walkthrough.

Arize Phoenix is an open-source observability and evaluation tool that runs locally in a notebook, a container, or as a self-hosted server. It is built on OpenTelemetry and OpenInference from the ground up, so any instrumented framework emits traces Phoenix can read. Phoenix leans into experimentation and debugging: it ships strong RAG-analysis views, an evals library, and tight loops for iterating in a Jupyter environment. It is backed by Arize AI, which also sells a production-scale commercial platform, but Phoenix itself is free and open. Our [Arize Phoenix evaluation guide](/blog/arize-phoenix-llm-evaluation-guide) covers its eval library in depth.

The short framing: Langfuse is a batteries-included platform you host as a service; Phoenix is a local-first, OTel-native debugging and eval tool that scales up to a self-hosted server.

## Feature matrix

| Dimension | Langfuse | Arize Phoenix |
| --- | --- | --- |
| License | MIT core plus paid cloud | Open source (Elastic-family license) |
| Primary strength | Full platform, prompt and dataset mgmt | Local-first tracing and RAG debugging |
| Tracing standard | OpenTelemetry ingest, own SDK | OpenTelemetry and OpenInference native |
| Local-first | Cloud or self-host | Runs in a notebook or laptop instantly |
| Prompt management | Yes, versioned with labels | Prompt playground, lighter management |
| Datasets and experiments | Yes | Yes, experiment-centric |
| Evals | LLM-judge, human, code | Phoenix Evals library plus custom |
| Dashboards | Customizable dashboards | Trace and experiment views |
| RAG debugging | Trace tree plus retrieval spans | Purpose-built retrieval and embedding views |
| Deployment | Docker, Helm, Kubernetes | pip install, Docker, self-host server |

## Tracing model

Langfuse models a trace as a tree of spans and generations, each carrying model, input, output, token usage, cost, and latency. You instrument with the SDK decorator or context managers, or you point existing OpenTelemetry instrumentation at Langfuse and it ingests the spans.

\`\`\`python
from langfuse import observe, get_client

langfuse = get_client()

@observe()
def rag_answer(question: str) -> str:
    docs = retrieve(question)
    with langfuse.start_as_current_generation(
        name="answer", model="gpt-4o", input=question
    ) as gen:
        out = call_llm(question, docs)
        gen.update(output=out, usage_details={"input": 1200, "output": 180})
    return out
\`\`\`

Phoenix models traces using OpenTelemetry spans that follow the OpenInference conventions, which define semantic attributes specific to LLM work (retriever spans, embedding spans, tool spans, LLM spans). Because of that, you usually do not hand-write spans; you register an auto-instrumentor for your framework and Phoenix receives structured traces.

\`\`\`python
import phoenix as px
from phoenix.otel import register

px.launch_app()
tracer_provider = register(project_name="rag-app", auto_instrument=True)

# Any OpenInference-instrumented library now emits spans Phoenix reads.
answer = my_rag_chain.invoke("How do refunds work?")
\`\`\`

The practical difference: Phoenix is more standards-native, so if your stack already emits OpenInference spans you get rich, correctly-typed traces with almost no glue code. Langfuse also ingests OpenTelemetry but its richest features assume its own SDK. If you want vendor-neutral instrumentation that any backend can read, Phoenix's OpenInference-first stance is a plus.

It helps to understand why this matters beyond ideology. When instrumentation is standards-based, swapping the backend becomes a configuration change rather than a rewrite. A team that instruments with OpenInference can send the same spans to Phoenix during local debugging, to a self-hosted collector for archival, and to a commercial backend for production, all without touching application code. That optionality is genuinely valuable as tooling churns, and LLM observability tooling churns fast. Langfuse does not preclude this (it accepts OpenTelemetry), but because some of its most useful features (prompt linking, dataset runs, certain score attributions) are richest through its own SDK, teams that adopt Langfuse fully tend to write Langfuse-specific instrumentation. That is a reasonable trade for the platform features, but it is a trade, and it is worth naming before you commit.

## Evaluations

Both ship eval tooling, and both support LLM-as-judge.

Phoenix provides an evals library with pre-built templates (hallucination, relevance, toxicity, QA correctness, retrieval relevance) that run over a dataframe of traces, returning labels and explanations you can merge back into your trace data.

\`\`\`python
from phoenix.evals import HallucinationEvaluator, llm_classify, OpenAIModel
import pandas as pd

df = pd.DataFrame({
    "input": ["What is our refund window?"],
    "reference": ["Refunds are allowed within 30 days."],
    "output": ["You can get a refund within 60 days."],
})

model = OpenAIModel(model="gpt-4o")
results = llm_classify(
    dataframe=df,
    template=HallucinationEvaluator(model).template,
    model=model,
    rails=["factual", "hallucinated"],
)
\`\`\`

Langfuse runs evals as UI-configured LLM-as-judge evaluators that automatically score incoming traces, plus code-defined and human annotation scores.

\`\`\`python
from langfuse import get_client

langfuse = get_client()

def relevance(output: str, reference: str) -> float:
    return grade_with_judge(output, reference)  # your judge call

langfuse.score(trace_id=trace_id, name="relevance", value=relevance(out, ref))
\`\`\`

Phoenix leans toward dataframe-driven, notebook-run evals, which is ergonomic for experimentation and offline analysis. Langfuse leans toward continuous online evaluation of production traffic plus human annotation queues. Choose Phoenix if your evals live in notebooks and pipelines; choose Langfuse if you want judges running automatically against live traffic in a hosted UI. For framework-level comparisons, see [Promptfoo vs DeepEval](/blog/promptfoo-vs-deepeval-2026).

## Local-first versus self-host

This is the sharpest philosophical split.

Phoenix is local-first. One \`pip install arize-phoenix\` and \`px.launch_app()\` gives you a running trace viewer on your laptop in seconds, ideal for a notebook debugging session. When you outgrow local, the same Phoenix runs as a self-hosted server in Docker. There is no mandatory cloud account to start.

Langfuse is service-first. You either sign up for Langfuse Cloud or stand up the self-hosted stack (web, worker, Postgres, ClickHouse, Redis, object storage). It is not designed to spin up inside a notebook for a five-minute look. The upside is that once running it is a durable multi-user platform, not an ephemeral local app.

| Concern | Langfuse | Arize Phoenix |
| --- | --- | --- |
| Time to first trace | Minutes (cloud) or a stack (self-host) | Seconds (notebook) |
| Notebook-native | Not really | Yes |
| Durable multi-user server | Yes | Yes (self-host server) |
| Zero external dependency to start | Only if self-hosted | Yes, runs on laptop |
| Team dashboards out of the box | Yes | Yes on server, lighter locally |

## OpenTelemetry and OpenInference support

Both speak OpenTelemetry, but the depth differs. Phoenix is built on OTel and OpenInference as its native format, so retriever, embedding, tool, and LLM spans carry correctly typed attributes automatically when you use an OpenInference instrumentor. That means a rich, standards-based trace with retrieval documents and scores captured properly.

Langfuse ingests OpenTelemetry spans and maps them into its trace model, and it also has first-party instrumentation for many SDKs. It works well, but a few of its richest features assume the Langfuse SDK rather than raw OTel. If your organization has standardized on OpenTelemetry and wants to avoid any SDK lock-in, Phoenix aligns more tightly with that goal. If you want the platform features and are willing to adopt the Langfuse SDK, the OTel path is still fully supported.

## Dataset and experiment workflows

Both let you build datasets and run experiments (a task over a dataset, scored by evaluators).

Phoenix's experiment API is compact and notebook-friendly:

\`\`\`python
import phoenix as px
from phoenix.experiments import run_experiment

client = px.Client()
dataset = client.upload_dataset(
    dataframe=my_df, dataset_name="refund-qa",
    input_keys=["question"], output_keys=["answer"],
)

def task(example):
    return my_rag_chain.invoke(example.input["question"])

def correctness(output, expected):
    return 1.0 if expected["answer"].lower() in output.lower() else 0.0

run_experiment(dataset, task, evaluators=[correctness])
\`\`\`

Langfuse's dataset run pattern loops items and links outputs to a named run:

\`\`\`python
from langfuse import Langfuse

langfuse = Langfuse()
dataset = langfuse.get_dataset("refund-qa")

for item in dataset.items:
    with item.run(run_name="rag-v3") as span:
        out = my_rag_chain.invoke(item.input["question"])
        span.score_trace(name="correct", value=grade(out, item.expected_output))
\`\`\`

Phoenix experiments feel like running a benchmark cell in a notebook and inspecting a results table. Langfuse dataset runs feel like production code that also records to a durable platform. Both are valid; the choice tracks whether your workflow is exploratory (Phoenix) or productionized (Langfuse).

## Dashboards and RAG debugging

For RAG specifically, Phoenix has a heritage advantage. Its retrieval views let you inspect which documents were retrieved for a query, their relevance scores, and embedding-space visualizations that help you spot clusters where retrieval fails. That embedding and retrieval analysis, inherited from Arize's ML observability roots, is genuinely useful when diagnosing why a RAG system returns off-topic answers.

Langfuse shows the full trace tree with retrieval spans, inputs, outputs, token usage, and latency, and its dashboards let you build custom metrics and charts over time (cost per day, latency percentiles, score trends). It is excellent for ongoing operational monitoring and cost tracking across a whole product.

| RAG and dashboard need | Langfuse | Arize Phoenix |
| --- | --- | --- |
| Retrieved-document inspection | Yes, via spans | Yes, purpose-built |
| Embedding-space visualization | Limited | Strong |
| Cost and token dashboards over time | Strong | Present, lighter |
| Custom metric dashboards | Yes | More limited |
| Continuous production monitoring | Strong | Better with the commercial Arize tier |

The read: Phoenix for deep RAG and embedding debugging during development, Langfuse for durable product-wide operational dashboards. Teams building retrieval-heavy systems often start in Phoenix to diagnose, then run Langfuse in production for monitoring. For test discipline around retrieval quality, the [DeepEval testing guide](/blog/deepeval-llm-testing-guide) pairs well with either.

A concrete debugging scenario shows the split. Suppose a RAG assistant confidently answers a refund question with the wrong policy. In Phoenix you would open the trace, look at the retriever span to see which chunks were pulled, notice the correct policy document was never retrieved, and then jump to the embedding view to see that the query landed in a sparse region far from the policy chunk, pointing at a chunking or embedding-model problem. In Langfuse you would open the same trace, see the retrieved chunks and the generation, and confirm the wrong context was passed, which is enough to know retrieval failed, but you would not get the embedding-space picture that explains why. If your failures are mostly retrieval-quality problems, Phoenix shortens the diagnosis. If your failures are mostly operational (latency spikes, cost creep, an upstream model regression), Langfuse's dashboards surface them faster.

## Integrations with DeepEval and Ragas

Both interoperate with the popular eval libraries rather than replacing them.

Phoenix integrates naturally with Ragas: you compute Ragas metrics (faithfulness, answer relevancy, context precision, context recall) over your dataset and log the scores back onto Phoenix traces, so retrieval spans and scores sit together. DeepEval metrics can likewise be run over Phoenix-captured data.

\`\`\`python
from ragas.metrics import faithfulness, answer_relevancy
from ragas import evaluate
from datasets import Dataset

ragas_result = evaluate(
    Dataset.from_dict({
        "question": questions,
        "answer": answers,
        "contexts": contexts,
        "ground_truth": truths,
    }),
    metrics=[faithfulness, answer_relevancy],
)
# Log ragas_result scores back onto Phoenix spans for a unified view.
\`\`\`

Langfuse similarly supports pushing DeepEval or Ragas scores onto traces through its scoring API, and it documents integrations for running these evaluators against Langfuse datasets. In both cases the pattern is the same: use DeepEval or Ragas as the metric engine, and use Langfuse or Phoenix as the store and viewer for the resulting scores and traces. Neither observability tool forces you to abandon a framework you already trust.

This composability is a strong argument for not overthinking the choice. Because your metric definitions live in DeepEval or Ragas (or in plain functions you own), they are portable across observability backends. If you keep the metric logic in your own repository and treat Phoenix or Langfuse as the score sink and viewer, you can dual-run both for a week, compare their trace views and dashboards on your real workload, and pick the one your team actually reaches for, without rewriting a single evaluator. The lesson repeated across mature LLM stacks in 2026 is to decouple the three layers (instrumentation, metrics, and the viewing backend) so that swapping any one of them stays cheap.

## When to pick which

| If you... | Lean toward |
| --- | --- |
| Debug in notebooks and want traces in seconds | Arize Phoenix |
| Need durable, multi-user production dashboards | Langfuse |
| Have standardized on OpenTelemetry and OpenInference | Arize Phoenix |
| Want prompt management and datasets in one platform | Langfuse |
| Do deep RAG retrieval and embedding analysis | Arize Phoenix |
| Need continuous online evaluation of live traffic | Langfuse |
| Must self-host the entire stack with no vendor tie | Langfuse (MIT core) |
| Prefer running Ragas or DeepEval and viewing results | Either, both integrate |

## Recommendation

Choose Arize Phoenix when your work is local-first and experimental: you live in notebooks, you debug RAG retrieval and embeddings, and you value OpenInference-native, vendor-neutral traces you can start in seconds. Choose Langfuse when you need a durable production platform: prompt versioning, datasets, human annotation, cost dashboards, and continuous online evals, all in one self-hostable service.

A very common 2026 setup uses both: Phoenix during development to diagnose retrieval and iterate on prompts in a notebook, and Langfuse in production for monitoring, cost tracking, and online evaluation. Since both speak OpenTelemetry, instrumenting once and sending to either is realistic. Prototype your real pipeline in each for a day, then decide. To equip your coding agents with reusable evaluation and testing playbooks, browse the [QA skills catalog](/skills).

## Frequently Asked Questions

### Are both Langfuse and Phoenix free to self-host?

Yes, both can be run at no license cost. Langfuse has an MIT-licensed core you can self-host fully, and Phoenix is open source and runs locally or as a self-hosted server. You pay only your own infrastructure. Both also have commercial paths: Langfuse Cloud, and Arize's larger commercial platform beyond Phoenix. Check each project's current license terms before deploying, since open-source licenses can evolve.

### Which is faster to try for the first time?

Phoenix, by a wide margin, for a quick look. A single \`pip install arize-phoenix\` and \`px.launch_app()\` gives you a running trace viewer in a notebook in seconds, with no account. Langfuse needs either a cloud sign-up or standing up its multi-service stack, which takes longer. If you just want to eyeball traces from a script this afternoon, start with Phoenix, then evaluate Langfuse when you need a durable team platform.

### Does Phoenix support production monitoring like Langfuse?

Phoenix can run as a self-hosted server and capture production traces, but its center of gravity is development and debugging, and heavy production-scale monitoring is where Arize's commercial platform is aimed. Langfuse is purpose-built for durable production observability with cost dashboards, custom metrics, and online evaluators over live traffic. For long-running production monitoring with team dashboards, Langfuse is the stronger open-source choice out of the box.

### Can I use both together?

Yes, and many teams do. A typical split is Phoenix in notebooks during development for RAG and embedding debugging, and Langfuse in production for monitoring and online evals. Because both speak OpenTelemetry, you can instrument once and route spans to either backend. Keep your datasets and eval logic in your own repo so switching or dual-running stays cheap and you avoid tying all your workflow to one tool's UI.

### How do they handle RAG debugging differently?

Phoenix shines here: it offers retrieval-span inspection, per-document relevance, and embedding-space visualizations inherited from Arize's ML observability roots, which help you find query clusters where retrieval fails. Langfuse shows retrieval spans inside its trace tree with inputs, outputs, and scores, which is enough to trace a bad answer, but it lacks Phoenix's dedicated embedding visualizations. For deep retrieval diagnosis, Phoenix; for operational RAG monitoring over time, Langfuse.

### Do they replace DeepEval or Ragas?

No. Both are stores and viewers for traces and scores, not replacements for metric libraries. You typically run DeepEval or Ragas as the metric engine (faithfulness, relevancy, context precision) and log the resulting scores onto traces in Phoenix or Langfuse for a unified view. Both document integrations for exactly this. Treat the observability tool and the eval framework as complementary layers rather than competing choices.

### Which aligns better with OpenTelemetry?

Phoenix, because it is built on OpenTelemetry and the OpenInference semantic conventions natively, so retriever, embedding, tool, and LLM spans carry correctly typed attributes automatically. Langfuse ingests OpenTelemetry spans and supports them well, but a few of its richest features assume the Langfuse SDK. If avoiding SDK lock-in and staying purely standards-based is a priority, Phoenix aligns more tightly with an OpenTelemetry-first architecture.

### What are the operational costs of self-hosting each?

Phoenix is lighter to run: a single service you can start with pip or a container, suitable for one engineer or a small team. Langfuse self-hosted is heavier, running the web app, an async worker, Postgres, ClickHouse, Redis, and object storage, which means real ops time for upgrades, scaling, and backups. Budget accordingly: Phoenix for low-overhead debugging, Langfuse when you need a durable multi-user platform and can staff its operations.
`,
};
