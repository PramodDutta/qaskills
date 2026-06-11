import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'TruLens RAG Triad: Groundedness, Context, Answer Relevance',
  description:
    'Complete 2026 TruLens RAG Triad reference: groundedness, context relevance and answer relevance with runnable Python, feedback selectors and the dashboard.',
  date: '2026-06-11',
  category: 'Reference',
  content: `
# TruLens RAG Triad: Groundedness, Context Relevance and Answer Relevance (2026)

TruLens is an open-source library for evaluating and tracing large language model (LLM) applications, and its signature contribution to the field is the **RAG Triad**: three feedback functions that, taken together, can detect virtually every failure mode of a retrieval-augmented generation (RAG) pipeline without needing a ground-truth answer for every query. The triad is elegantly simple. Context relevance asks whether the retrieved context is relevant to the question. Groundedness asks whether the generated answer is actually supported by that retrieved context. Answer relevance asks whether the final answer addresses the user's original question. If all three pass, you have strong evidence the response is both correct and grounded; if any one fails, the failing leg of the triad tells you exactly which part of the pipeline to fix. Because none of the three requires a labelled reference answer, the RAG Triad is one of the few rigorous evaluation methods you can run directly on live production traffic.

This reference is written for QA engineers, ML engineers, and developers who need a single authoritative place to understand and implement the TruLens RAG Triad. We cover installation and the feedback provider setup (OpenAI or LiteLLM), instrumenting an app with \\\`TruApp\\\` (and the framework-specific \\\`TruChain\\\` and \\\`TruLlama\\\` recorders), defining the three feedback functions, the crucial topic of **selectors** (\\\`Select.RecordCalls\\\`, \\\`on_input\\\`, \\\`on_output\\\`, and selecting the retrieved context), aggregation across multiple chunks, running the instrumented app inside a recording context, and launching and reading the TruLens dashboard. Every code block below is real, runnable Python. By the end you will be able to wire the RAG Triad onto your own RAG app, see per-record scores in the dashboard, and reason about which leg of the triad to chase when a score drops. If you also evaluate with other frameworks, see our companion [DeepEval RAG evaluation metrics reference](/blog/deepeval-rag-evaluation-metrics-reference-2026) and the [DeepEval metrics complete guide](/blog/deepeval-metrics-complete-guide-2026).

## Installing TruLens and Setting Up the Feedback Provider

TruLens (the modern package is simply \\\`trulens\\\`, with provider integrations in \\\`trulens-providers-openai\\\` and \\\`trulens-providers-litellm\\\`) is a pure Python library. The feedback functions that implement the triad are LLM-graded, so you need a **feedback provider**: an LLM that acts as the judge for each feedback function.

\\\`\\\`\\\`bash
pip install -U trulens trulens-providers-openai
export OPENAI_API_KEY="sk-..."
\\\`\\\`\\\`

You then instantiate a provider. The OpenAI provider is the default choice, but the LiteLLM provider lets you route to Anthropic, Azure, Gemini, Bedrock, or a local model through one interface.

\\\`\\\`\\\`python
from trulens.providers.openai import OpenAI

provider = OpenAI(model_engine="gpt-4o-mini")
\\\`\\\`\\\`

\\\`\\\`\\\`python
# Alternative: route any model through LiteLLM
from trulens.providers.litellm import LiteLLM

provider = LiteLLM(model_engine="anthropic/claude-3-5-sonnet-latest")
\\\`\\\`\\\`

Finally, every TruLens session needs a backing store for recorded traces and feedback results. The \\\`TruSession\\\` object manages that database (SQLite by default), and you can reset it during development.

\\\`\\\`\\\`python
from trulens.core import TruSession

session = TruSession()
session.reset_database()  # clears prior runs during development
\\\`\\\`\\\`

## A Minimal RAG App to Instrument

To make the selectors concrete, we need an app with a clear retrieve step and a generate step. Here is a tiny, self-contained RAG class with a vector-free in-memory retriever so the example runs anywhere.

\\\`\\\`\\\`python
from openai import OpenAI as OpenAIClient
from trulens.core.otel.instrument import instrument

oai = OpenAIClient()

CORPUS = [
    "The Eiffel Tower was completed in 1889 for the World's Fair in Paris.",
    "The Eiffel Tower is approximately 330 metres tall including antennas.",
    "The Louvre is the world's most-visited art museum, located in Paris.",
]

class RAG:
    @instrument()
    def retrieve(self, query: str) -> list:
        # naive keyword retriever for the example
        return [c for c in CORPUS if any(w in c.lower() for w in query.lower().split())][:2]

    @instrument()
    def generate(self, query: str, contexts: list) -> str:
        prompt = f"Answer using only this context:\\\\n{contexts}\\\\n\\\\nQuestion: {query}"
        resp = oai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.choices[0].message.content

    @instrument()
    def query(self, query: str) -> str:
        contexts = self.retrieve(query)
        return self.generate(query, contexts)

rag = RAG()
\\\`\\\`\\\`

The \\\`@instrument()\\\` decorator is what makes each method's inputs and outputs visible to TruLens selectors. Without it, TruLens cannot reach inside \\\`retrieve\\\` to grab the chunks it returned.

## The RAG Triad Metric Reference

The three legs of the triad each target a distinct part of the pipeline, take different inputs, and return a score from 0 to 1 where higher is better. This is the table to keep open while you wire up the feedback functions.

| Triad leg | Question it answers | Inputs (selectors) | Targets | Range |
|---|---|---|---|---|
| Context Relevance | Is the retrieved context relevant to the question? | question (on_input) + each retrieved chunk | Retriever | 0-1 |
| Groundedness | Is the answer supported by the retrieved context? | retrieved context + final answer (on_output) | Generator | 0-1 |
| Answer Relevance | Does the answer address the user's question? | question (on_input) + final answer (on_output) | End-to-end | 0-1 |

The diagnostic value comes from reading the three together. Low context relevance means your retriever is fetching the wrong chunks. High context relevance but low groundedness means the retriever did its job but the generator hallucinated beyond the context. High groundedness but low answer relevance means the answer is faithful to context yet still does not answer the question that was asked.

## Defining the Three Feedback Functions

A feedback function in TruLens is a \\\`Feedback\\\` object that wraps a provider method, names itself, and declares which parts of the recorded trace it reads via selectors. We will define all three legs.

\\\`\\\`\\\`python
import numpy as np
from trulens.core import Feedback
from trulens.core.feedback.selector import Selector

# Answer relevance: question vs final answer
f_answer_relevance = (
    Feedback(provider.relevance_with_cot_reasons, name="Answer Relevance")
    .on_input()
    .on_output()
)

# Groundedness: retrieved context vs final answer
f_groundedness = (
    Feedback(
        provider.groundedness_measure_with_cot_reasons,
        name="Groundedness",
    )
    .on({"source": Selector(function_name="RAG.retrieve", collect_list=True)})
    .on_output()
)

# Context relevance: question vs each retrieved chunk, aggregated by mean
f_context_relevance = (
    Feedback(provider.context_relevance_with_cot_reasons, name="Context Relevance")
    .on_input()
    .on({"context": Selector(function_name="RAG.retrieve", collect_list=False)})
    .aggregate(np.mean)
)
\\\`\\\`\\\`

Three things to notice. First, every provider method comes in a \\\`_with_cot_reasons\\\` variant that returns chain-of-thought explanations alongside the score, which is invaluable for debugging in the dashboard. Second, groundedness collects the retrieved chunks into a single list (\\\`collect_list=True\\\`) so the answer is checked against all context at once. Third, context relevance scores each chunk individually (\\\`collect_list=False\\\`) and then aggregates with \\\`np.mean\\\`, because relevance is a property of each chunk, not the bundle.

## Understanding Selectors: The Heart of TruLens

Selectors are the single concept that confuses newcomers most, so they deserve their own section. A selector tells a feedback function where in the recorded execution trace to read a value from. The two shortcut selectors cover the common cases, and explicit selectors handle the rest.

| Selector | Reads | Typical use |
|---|---|---|
| \\\`.on_input()\\\` | The main app input (the user's question) | Answer relevance, context relevance question side |
| \\\`.on_output()\\\` | The main app's final output (the answer) | Groundedness, answer relevance answer side |
| \\\`Selector(function_name="RAG.retrieve", collect_list=True)\\\` | Return value of the \\\`retrieve\\\` method as one list | Groundedness source context |
| \\\`Selector(function_name="RAG.retrieve", collect_list=False)\\\` | Each retrieved chunk separately | Per-chunk context relevance |
| \\\`Select.RecordCalls.<method>.rets\\\` | Return value of a named instrumented method | Legacy / fine-grained access to any step |

The classic mistake is pointing a selector at the wrong method or forgetting \\\`@instrument()\\\`, which yields empty feedback. If a feedback score is suspiciously always 0 or never appears, the first thing to check is whether the selector path matches an actually-instrumented method. The \\\`collect_list\\\` flag is the second most common trip-up: set it to \\\`True\\\` when the judge should see all chunks together (groundedness) and \\\`False\\\` when each chunk should be scored on its own (context relevance).

## Wrapping the App with TruApp and Recording Runs

With the feedback functions defined, wrap the app in a recorder. The general-purpose recorder is \\\`TruApp\\\`; if you built your app with LangChain use \\\`TruChain\\\`, and for LlamaIndex use \\\`TruLlama\\\`. They all attach the feedback functions and a stable app identifier so you can compare versions over time.

\\\`\\\`\\\`python
from trulens.apps.app import TruApp

tru_rag = TruApp(
    rag,
    app_name="RAG",
    app_version="v1",
    feedbacks=[f_answer_relevance, f_groundedness, f_context_relevance],
)
\\\`\\\`\\\`

To evaluate, run your normal application code inside the recorder's context manager. TruLens captures the full trace, computes every feedback function, and writes the scores to the session database, all without changing how your app behaves.

\\\`\\\`\\\`python
questions = [
    "When was the Eiffel Tower completed and how tall is it?",
    "What is the most-visited art museum in Paris?",
]

with tru_rag as recording:
    for q in questions:
        answer = rag.query(q)
        print(answer)
\\\`\\\`\\\`

For LangChain and LlamaIndex apps the pattern is identical, only the recorder class changes. The framework-specific recorders auto-instrument the chain or index so you usually do not need to add \\\`@instrument()\\\` yourself.

\\\`\\\`\\\`python
# LangChain
from trulens.apps.langchain import TruChain
tru_chain = TruChain(my_lc_chain, app_name="RAG", app_version="v1",
                     feedbacks=[f_answer_relevance, f_groundedness, f_context_relevance])

# LlamaIndex
from trulens.apps.llamaindex import TruLlama
tru_llama = TruLlama(my_query_engine, app_name="RAG", app_version="v1",
                     feedbacks=[f_answer_relevance, f_groundedness, f_context_relevance])
\\\`\\\`\\\`

## Running and Reading the TruLens Dashboard

TruLens ships a Streamlit dashboard that visualises every recorded run, the three triad scores per record, and the chain-of-thought reasons behind each score. Launch it from the same session.

\\\`\\\`\\\`python
from trulens.dashboard import run_dashboard

run_dashboard(session)  # opens a local Streamlit app, e.g. http://localhost:8501
\\\`\\\`\\\`

You can also pull the results programmatically as a pandas DataFrame, which is what you would wire into a CI gate: assert that the mean of each triad leg stays above a threshold you baselined, and fail the build if a regression drops one of them.

\\\`\\\`\\\`python
records, feedback_cols = session.get_records_and_feedback(app_ids=[])
print(feedback_cols)             # ['Answer Relevance', 'Groundedness', 'Context Relevance']
print(records[feedback_cols].mean())
\\\`\\\`\\\`

In the dashboard, the leaderboard view compares app versions side by side, so when you change your chunk size or swap a reranker you can label it \\\`v2\\\` and see immediately whether context relevance improved without regressing groundedness. The per-record drill-down shows the exact chunks retrieved and the judge's reasoning, which turns an abstract score into a concrete, fixable observation.

## Interpreting the Triad: Which Leg to Chase

The whole point of three feedback functions instead of one overall score is that the failing leg localises the bug. Read the triad as a decision tree. If context relevance is low, the retriever is the problem: tune chunking, increase or rerank top-k, or switch to hybrid search. If context relevance is healthy but groundedness is low, the generator is hallucinating; tighten the prompt to answer only from context and lower the temperature. If groundedness is high but answer relevance is low, the model is faithfully summarising the wrong thing, so revisit the answer prompt and check that the right context is actually being passed through. This is the same retriever-versus-generator split that frameworks like Ragas formalise; for that perspective see our [Ragas faithfulness and context precision reference](/blog/ragas-faithfulness-answer-relevancy-context-precision-recall-reference-2026), and for tracing the underlying spans see [Arize Phoenix LLM observability](/blog/arize-phoenix-llm-observability-tracing-evaluations-2026).

Because the triad needs no ground-truth labels, you can run it continuously on production traffic and alert when any leg drifts below baseline. Pair that online monitoring with offline adversarial testing from our [Promptfoo red-teaming guide](/blog/promptfoo-red-teaming-guide-2026) and runtime safety from the [LLM guardrails testing guide](/blog/llm-guardrails-testing-guide-2026), and you have evaluation covering offline, online, and adversarial surfaces. To make your AI coding agent set this up for you, install the relevant QA evaluation [skills](/skills).

## Aggregation, Thresholds and Comparing App Versions

A subtle but important detail is how multi-chunk feedback gets reduced to a single number. When you select retrieved chunks with \\\`collect_list=False\\\`, context relevance produces one score per chunk, and you must tell TruLens how to combine them with \\\`.aggregate()\\\`. The default and most common choice is \\\`np.mean\\\`, which reports the average relevance across all retrieved chunks, but the choice encodes a real product decision. If you care that at least one strongly relevant chunk was retrieved, \\\`np.max\\\` is more informative; if you want to penalise any irrelevant chunk in the set, \\\`np.min\\\` is harsher. There is no universally correct aggregator, so pick the one that matches how your generator actually consumes context, and keep it fixed so historical scores stay comparable.

\\\`\\\`\\\`python
import numpy as np
from trulens.core import Feedback
from trulens.core.feedback.selector import Selector

# Reward retrieving at least one strongly relevant chunk
f_context_relevance_max = (
    Feedback(provider.context_relevance_with_cot_reasons, name="Context Relevance (max)")
    .on_input()
    .on({"context": Selector(function_name="RAG.retrieve", collect_list=False)})
    .aggregate(np.max)
)
\\\`\\\`\\\`

Once aggregation is settled, the next discipline is thresholds. Do not copy thresholds from a blog post; baseline your own application first by running the triad on a representative sample and recording the mean of each leg. Set your CI gate a little below that baseline so normal variance does not flake the build, then tighten it as your system improves. The TruLens leaderboard makes version comparison the natural unit of work: tag each experiment with a distinct \\\`app_version\\\`, run the same question set through each, and read the three triad means side by side. A change that lifts context relevance but quietly drops groundedness is exactly the kind of regression the triad is designed to surface, and the leaderboard makes it impossible to miss.

## Cost, Latency and Production Monitoring Patterns

Every leg of the triad is an LLM call, and groundedness can fire several calls per record because it decomposes the answer into claims and verifies each one. On a high-traffic production app, grading every single request is rarely necessary or affordable. The standard pattern is sampling: instrument all requests for tracing but compute feedback on a representative percentage, which keeps cost bounded while still giving you a statistically meaningful drift signal. Use a small, fast feedback provider at a low temperature for continuous monitoring, and reserve a stronger judge for periodic deep audits of the worst-scoring records surfaced by the cheap pass.

\\\`\\\`\\\`python
# Deferred / sampled feedback: record now, grade a subset later
from trulens.core import TruSession
from trulens.apps.app import TruApp

session = TruSession()
tru_rag = TruApp(
    rag,
    app_name="RAG",
    app_version="prod",
    feedbacks=[f_answer_relevance, f_groundedness, f_context_relevance],
    feedback_mode="deferred",  # queue feedback to run out of the request path
)
\\\`\\\`\\\`

Running feedback in \\\`deferred\\\` mode is the key to keeping evaluation off the critical path: the user gets their answer immediately, and a separate evaluator process drains the queue and writes scores asynchronously. This is what makes the RAG Triad practical as live monitoring rather than just an offline gate. Combine it with alerting on rolling means, so that if groundedness drifts down after a model upgrade or a corpus refresh, you find out from a dashboard rather than from a user complaint. The same data also feeds regression triage: filter the dashboard to records where any leg fell below threshold, read the chain-of-thought reasons, and you have a ranked list of concrete failures to reproduce and fix.

## Frequently Asked Questions

### What are the three metrics in the TruLens RAG Triad?

The RAG Triad is context relevance, groundedness, and answer relevance. Context relevance checks whether the retrieved chunks match the question, groundedness checks whether the answer is supported by those chunks, and answer relevance checks whether the answer addresses the original question. Passing all three is strong evidence the response is both grounded and on-topic, and any failing leg pinpoints which part of the pipeline to fix.

### Does the TruLens RAG Triad need ground-truth answers?

No. All three feedback functions are reference-free: context relevance compares the question to the context, groundedness compares the answer to the context, and answer relevance compares the answer to the question. None requires a labelled correct answer, which is why you can run the RAG Triad directly on live production traffic, not just a curated offline test set.

### What is a selector in TruLens and why does it matter?

A selector tells a feedback function where in the recorded execution trace to read a value. \\\`on_input()\\\` reads the user's question, \\\`on_output()\\\` reads the final answer, and explicit \\\`Selector(function_name=...)\\\` selectors read the return value of an instrumented method like \\\`retrieve\\\`. Wrong selectors or a missing \\\`@instrument()\\\` decorator are the top cause of empty or always-zero feedback scores.

### What is the difference between groundedness in TruLens and faithfulness in Ragas?

They measure the same thing under different names: whether the generated answer is supported by the retrieved context. Both decompose the answer into claims and check each against the context, returning a 0-to-1 score. TruLens calls it groundedness and surfaces chain-of-thought reasons in its dashboard; Ragas calls it faithfulness. You can use either to audit generator hallucination.

### How do I view TruLens results after running an evaluation?

Call \\\`run_dashboard(session)\\\` to open the Streamlit dashboard, which shows a leaderboard of app versions, per-record triad scores, and the judge's chain-of-thought reasoning behind each score. For automation, use \\\`session.get_records_and_feedback()\\\` to pull the scores as a pandas DataFrame and assert thresholds in CI to fail the build on a regression.

### Should I use TruApp, TruChain, or TruLlama?

Use \\\`TruApp\\\` for any custom Python app where you add \\\`@instrument()\\\` decorators yourself. Use \\\`TruChain\\\` for LangChain chains and \\\`TruLlama\\\` for LlamaIndex query engines; these auto-instrument the framework so you rarely need manual decorators. All three attach the same feedback functions and an app name plus version, so you can compare versions in the dashboard regardless of which recorder you chose.

### What does it mean when context relevance is high but groundedness is low?

It means your retriever fetched the right context but the generator went beyond it, hallucinating facts the context never stated. The fix is on the generation side: instruct the model to answer using only the provided context, lower the temperature, and consider a more capable generator. High context relevance rules out a retrieval problem and points the blame squarely at the prompt or model.

## Conclusion and Next Steps

The TruLens RAG Triad is the fastest way to get rigorous, label-free evaluation onto a RAG application. Three feedback functions, context relevance, groundedness, and answer relevance, cover the retriever, the generator, and the end-to-end answer, and reading them together turns a single dropping score into a precise diagnosis of which component to fix. Instrument your app with \\\`@instrument()\\\` and a recorder, point selectors at the question, the answer, and the retrieved context, run your app inside the recording context, and read the per-record scores and reasons in the dashboard. Because the triad needs no ground truth, you can run it offline in CI and online on production traffic alike.

Ready to wire it in? Install QA evaluation [skills](/skills) so your AI coding agent can scaffold the RAG Triad and CI gates for you, and cross-check your scores against the [Ragas faithfulness and context precision reference](/blog/ragas-faithfulness-answer-relevancy-context-precision-recall-reference-2026) and the [DeepEval RAG evaluation metrics reference](/blog/deepeval-rag-evaluation-metrics-reference-2026) so a single judge model is never your only signal.
`,
};
