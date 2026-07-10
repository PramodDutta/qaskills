import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Phoenix RAG Tracing and Evaluation Guide',
  description:
    'Phoenix RAG tracing and evaluation guide for retrieval spans, session metadata, document relevance checks, eval annotations, and regressions.',
  date: '2026-07-10',
  category: 'AI Testing',
  content: `
# Phoenix RAG Tracing and Evaluation Guide

The answer looks confident, the source links look plausible, and the user still says it is wrong. Without a trace, the team debates the prompt. With a Phoenix trace, you can see the retrieval query, the documents returned, the generation call, the latency, and the exact span where the response stopped being grounded.

Arize Phoenix is useful for RAG testing because it connects observability and evaluation. Traces show what happened in one run. Evals annotate whether retrieval and response quality were acceptable. Datasets and experiments let teams compare changes to prompts, chunking, models, and retrievers without relying on anecdotal chat transcripts.

This guide focuses on Phoenix users testing RAG traces, retrieval spans, and eval annotations. For the wider tracing setup, read the [Arize Phoenix observability guide](/blog/arize-phoenix-llm-observability-tracing-evaluations-2026). For evaluator selection and quality measurement, the [Phoenix LLM evaluation guide](/blog/arize-phoenix-llm-evaluation-guide-2026) goes deeper.

## Trace the retrieval path before judging the answer

A RAG answer is downstream of several decisions: query rewrite, embedding, search, reranking, context assembly, generation, and response post-processing. If you only evaluate final text, every failure looks like a model problem. Phoenix tracing helps separate "retrieved the wrong document" from "retrieved the right document but ignored it" from "answered well but cited badly."

Good RAG traces include spans for retrieval and generation, plus metadata that lets you slice failures later. Project name, session ID, user segment, corpus version, prompt version, retriever name, top-k, and model name are all useful. Do not add private user data as raw span attributes. Use identifiers and redacted metadata.

| RAG stage | Phoenix trace signal | Testing question |
|---|---|---|
| Query rewrite | Input and rewritten query attributes | Did the rewrite preserve intent? |
| Retriever | Retrieved document IDs, scores, latency | Did relevant evidence appear in top results? |
| Reranker | Before and after rank positions | Did ranking improve or bury evidence? |
| Context builder | Chosen chunks and token budget | Was useful context included in the prompt? |
| Generator | Prompt, model, output, timing | Did the model answer from supplied context? |
| Citation mapper | Source IDs in final response | Do citations point to supporting chunks? |

The first governance decision is naming. If every span is called \`run\`, Phoenix will store data but humans will struggle. Use names that match the RAG pipeline: \`rewrite_query\`, \`retrieve_policy_docs\`, \`assemble_context\`, and \`generate_answer\`.

## Manual instrumentation for a small RAG pipeline

Phoenix can ingest OpenTelemetry traces, and the \`phoenix.otel\` package provides a practical registration path. The example below is intentionally framework-light. It instruments a minimal RAG flow with session and metadata context so Phoenix can group traces by experiment conditions.

\`\`\`python
from opentelemetry import trace
from phoenix.otel import register, using_metadata, using_session

tracer_provider = register(
    project_name="support-rag-contracts",
    endpoint="http://localhost:6006/v1/traces",
)
tracer = trace.get_tracer(__name__)


def retrieve_documents(query: str) -> list[dict]:
    with tracer.start_as_current_span("retrieve_policy_docs") as span:
        docs = [
            {
                "id": "refund-policy-v3",
                "score": 0.87,
                "text": "Refunds are available within 30 days for annual plans.",
            },
            {
                "id": "billing-faq-v2",
                "score": 0.64,
                "text": "Invoices are generated at the start of each billing cycle.",
            },
        ]
        span.set_attribute("retrieval.query", query)
        span.set_attribute("retrieval.top_k", len(docs))
        span.set_attribute("retrieval.documents.0.id", docs[0]["id"])
        span.set_attribute("retrieval.documents.0.score", docs[0]["score"])
        return docs


def generate_answer(query: str, docs: list[dict]) -> str:
    with tracer.start_as_current_span("generate_grounded_answer") as span:
        context = "\\n".join(doc["text"] for doc in docs)
        answer = "Annual plan refunds are available within 30 days."
        span.set_attribute("llm.prompt_template", "Answer from refund policy context.")
        span.set_attribute("llm.context_length_chars", len(context))
        span.set_attribute("llm.output", answer)
        return answer


def answer_question(session_id: str, query: str) -> str:
    with using_session(session_id), using_metadata({"corpus": "help-center-v3"}):
        with tracer.start_as_current_span("rag_question") as span:
            span.set_attribute("input.value", query)
            docs = retrieve_documents(query)
            answer = generate_answer(query, docs)
            span.set_attribute("output.value", answer)
            return answer
\`\`\`

This is not a full RAG application. It shows the testing shape. Retrieval spans record query and top document facts. Generation spans record the context size and output. The root span connects input and output. In a real pipeline, you would add the vector store, reranker, and model calls, or use Phoenix-supported auto-instrumentation for frameworks where available.

## What to evaluate on retrieval spans

Retrieval evaluation should happen before answer evaluation. If the right document never appears in the retrieved set, a grounded answer is unlikely. If the right document appears at rank eight and your context builder uses top four, the retriever technically found it but the generator never saw it.

For RAG testing, keep retrieval labels concrete. A query should have expected document IDs or expected facts. "Relevant" is too vague unless a judge rubric defines it. For deterministic regression tests, a gold set of expected document IDs is often more useful than an LLM judge. For broad quality sweeps, Phoenix Evals can score document relevance over a DataFrame.

| Retrieval metric | Useful when | Watch out for |
|---|---|---|
| Expected document in top-k | You have labeled query-document pairs | Multiple docs may contain the same fact |
| Mean reciprocal rank | Rank position matters | Hard to explain to non-technical reviewers |
| Document relevance eval | You need semantic review at scale | Judge model consistency and cost |
| Empty retrieval rate | Monitoring corpus or embedding failures | Some questions should intentionally retrieve nothing |
| Latency by retriever | Comparing index or reranker changes | Fast wrong retrieval is still wrong |

The trace is the debugging surface. The eval score is the triage surface. A failed relevance eval should link to the trace where a human can inspect retrieved chunks.

## Running Phoenix Evals over RAG rows

Phoenix Evals can evaluate DataFrames with built-in evaluators. For document relevance, shape the rows so each query-document pair can be judged. The exact DataFrame columns must match the evaluator input schema. The example below uses \`DocumentRelevanceEvaluator\`, which expects an input query and an output document.

\`\`\`python
import os
import pandas as pd
from phoenix.evals import LLM, evaluate_dataframe
from phoenix.evals.metrics import DocumentRelevanceEvaluator

os.environ["OPENAI_API_KEY"] = "set-this-in-ci-secret-store"

df = pd.DataFrame(
    [
        {
            "input": "Can I get a refund for an annual plan after two weeks?",
            "output": "Refunds are available within 30 days for annual plans.",
            "document_id": "refund-policy-v3",
        },
        {
            "input": "Can I get a refund for an annual plan after two weeks?",
            "output": "Invoices are generated at the start of each billing cycle.",
            "document_id": "billing-faq-v2",
        },
    ]
)

llm = LLM(provider="openai", model="gpt-4o")
evaluator = DocumentRelevanceEvaluator(llm=llm)

results_df = evaluate_dataframe(
    dataframe=df,
    evaluators=[evaluator],
)

failed = results_df[results_df["label"] == "irrelevant"]
print(failed[["document_id", "explanation"]])
\`\`\`

In a CI setting, do not hard-code secrets as shown in the placeholder. Use your secret store. Also avoid running expensive judge evals on every commit unless the dataset is small. Many teams run deterministic retrieval checks per pull request and judge-based Phoenix evals nightly or before release.

## Annotating traces so failures are searchable

Phoenix becomes more valuable when traces can be filtered by the conditions that caused failures. Add metadata for corpus version, chunking strategy, embedding model, prompt version, retriever implementation, and experiment ID. When a regression appears, you can compare traces from \`chunker=recursive-v2\` against \`chunker=semantic-v1\` instead of reading random examples.

Do not overload tags. Tags are useful for broad slicing: \`release-candidate\`, \`nightly-eval\`, \`refund-domain\`. Metadata should carry structured details. Span attributes should carry stage-specific facts. Consistency matters more than volume.

If your trace attributes include document text, apply retention and privacy rules. For internal policy documents, full chunks may be acceptable. For customer tickets, store IDs and redacted snippets, then link to secure systems for authorized reviewers.

## Regression datasets from real traces

The best RAG regression sets often come from production traces that were reviewed and labeled. A user asks a real question. The system retrieves documents. A support analyst or QA engineer labels whether the answer was grounded and whether the retrieved evidence was sufficient. That example becomes part of the next evaluation run.

Keep the dataset balanced. If it contains only failures, it is useful for debugging but poor for release comparison. If it contains only easy happy paths, it will miss the edge cases users care about. Include ambiguous queries, short queries, domain-specific terms, multi-hop questions, and questions where the correct behavior is refusing to answer.

Version the dataset. A change in corpus can make an old expected document obsolete. When that happens, update the example with a note. Silent dataset changes destroy trust in trend comparisons.

## Interpreting Phoenix eval results without overclaiming

LLM-as-judge evaluations are signals, not verdicts. A relevance evaluator can help prioritize suspicious retrievals, but it can be inconsistent on borderline cases. Use rubrics, spot checks, and stable judge settings. Track explanations alongside labels so reviewers can inspect why a document was marked irrelevant.

For release gates, combine deterministic and judge-based checks. Deterministic checks catch known requirements: expected document appears, answer contains required citation, no answer is given when no evidence exists. Judge evals cover semantic quality: relevance, groundedness, completeness, and harmful hallucination risk.

Do not reduce RAG quality to one number. A release can improve answer tone while hurting retrieval recall. Phoenix traces let you see that split if you keep stage-level data.

## Span naming conventions for RAG teams

Phoenix can display whatever spans you send, so naming discipline matters. A team should be able to scan a trace and understand the RAG pipeline without reading code. Use verbs for actions and domain nouns for retrieval sources. \`retrieve_refund_policy\` is clearer than \`vector_search\` when the corpus matters. \`rerank_help_articles\` is clearer than \`step_2\`.

Keep names stable across releases. If the retriever implementation changes from one vector database to another, the span can keep the same logical name and add implementation details as metadata. That gives you trend continuity. If every implementation change renames spans, dashboards and saved filters become stale.

Use child spans where latency can hide. A root \`rag_question\` span that takes eight seconds is not enough. Split retrieval, reranking, context assembly, model call, and citation mapping. When latency regresses, Phoenix should show which stage moved. This is especially important when retrieval and generation are owned by different teams.

## Attaching evals back to traces

Evaluation results are most useful when they can be connected to the exact trace they judged. Store trace IDs or span IDs in your eval DataFrame when exporting examples. After evaluation, log labels and explanations back to Phoenix or keep a linked report. A spreadsheet of failed rows without trace links creates manual reconstruction work.

For retrieval evals, attach labels at the document or retrieval span level. For answer groundedness, attach labels to the generation span or root trace. That placement helps reviewers navigate directly to the failed stage. If a document relevance eval fails, the retrieval span is the first place to inspect. If answer correctness fails while retrieval passed, start with the generation span.

Use consistent label names. Pick \`relevant\` and \`irrelevant\`, or \`pass\` and \`fail\`, but avoid mixing terms across evaluators without a mapping. Inconsistent labels make trend charts and filters harder to trust.

## Corpus changes need their own test lane

RAG quality can regress when application code does not change at all. A new help-center article, a removed policy, a chunking update, or an embedding model change can alter retrieval. Phoenix traces are a strong way to debug that, but the test plan must include corpus-change runs.

When content changes, run a retrieval-focused evaluation against queries tied to the affected domain. If refund policy documents changed, run refund queries. If authentication docs changed, run login and account recovery queries. Do not rerun only a generic benchmark and call it complete.

Keep corpus version in metadata so old and new traces can be compared. If your vector index has a build ID, record it. If chunking parameters changed, record them. Without that metadata, a failing trace may tell you what happened but not which content release caused it.

## Human review loops for Phoenix failures

Not every failed eval should automatically block a release. Some failures reveal bad labels, outdated expected documents, or judge disagreement. Build a review loop where QA or domain experts inspect a sample of failures, correct labels, and decide whether the release risk is real.

The review loop should feed the dataset. If a failure is real and important, add it as a regression example. If it is a bad expected answer, update the dataset with a note. If the judge is unreliable for a category, adjust the rubric or use deterministic assertions for that category.

This is where Phoenix is strongest as a workflow tool. It does not only show scores; it gives reviewers traces, spans, and context needed to turn failures into better tests.

## Comparing experiments without losing trace detail

RAG teams often compare several changes at once: a new embedding model, different chunk size, reranker on or off, and a revised answer prompt. Phoenix can support that comparison, but only if experiments are labeled cleanly. Change one major variable per experiment when possible. If you must bundle changes, record each variable as metadata so reviewers can still interpret the result.

Use paired examples for comparison. Run the same query set through the old and new pipeline, then compare retrieval ranks, selected chunks, answer labels, and latency. Aggregate scores are useful, but the trace pair is where the engineering decision happens. A new retriever may improve average relevance while failing the top ten refund queries that support cares about most.

Keep experiment output reproducible. Store dataset version, corpus version, prompt version, and model settings with the run. If temperature, top-k, or reranker thresholds change, record them. Without reproducibility metadata, a Phoenix experiment can become a pretty dashboard that nobody can rerun.

## Alerting from eval trends

Phoenix evals can inform monitoring, but be cautious with alerting. A single judge failure should rarely page anyone. Trend changes are more useful: retrieval relevance drops after a corpus publish, groundedness failures increase for one domain, or latency rises for a specific retriever. These are product quality signals, not only infrastructure signals.

Route alerts to the owning team. Retrieval relevance for billing documents should go to the team that owns billing content and RAG behavior. Generic "RAG score low" alerts become noise quickly. Include links to representative traces so the alert starts with evidence.

## Frequently Asked Questions

### Should every RAG span include retrieved document text?

Not always. Include text when reviewers need it and privacy rules allow it. Otherwise store document IDs, scores, ranks, and redacted snippets.

### Are Phoenix Evals suitable for pull request gates?

Small deterministic or low-cost eval sets can run in pull requests. Larger judge-based evaluations are often better as nightly or pre-release jobs because of cost, latency, and judge variability.

### What is the most useful Phoenix metadata for RAG debugging?

Corpus version, prompt version, retriever name, embedding model, chunking strategy, session ID, and experiment ID are usually high value.

### How do I know whether a failure is retrieval or generation?

Inspect the retrieval span first. If supporting evidence is absent or ranked outside the context window, it is retrieval or context assembly. If evidence is present and the answer ignores it, focus on generation.

### Can Phoenix replace offline golden datasets?

No. Phoenix helps collect, inspect, and evaluate traces. You still need curated datasets with expected behavior for repeatable regression decisions.
`,
};
