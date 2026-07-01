import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Ragas Evaluation: The Complete RAG Metrics Tutorial (2026)',
  description:
    'Learn Ragas evaluation for RAG in Python: faithfulness, answer relevancy, and context precision metrics with runnable code in this 2026 tutorial.',
  date: '2026-07-01',
  category: 'Guide',
  content: `
# Ragas Evaluation: The Complete RAG Metrics Tutorial (2026)

Retrieval-augmented generation (RAG) has become the default architecture for grounding large language models in your own data, but shipping a RAG pipeline without measuring it is flying blind. A retriever that fetches the wrong chunks, a prompt that lets the model hallucinate, or an answer that drifts off-topic will all pass a smoke test and then quietly wreck your users' trust in production. Ragas is the open-source Python framework that turns "it looks fine" into hard numbers. It gives you a battery of reference-free and reference-based metrics such as faithfulness, answer relevancy, and context precision that score each stage of the pipeline independently, so you can tell whether a bad answer came from retrieval or from generation.

This tutorial is a practical, code-first walkthrough of Ragas evaluation as it stands in 2026. You will install Ragas, build an evaluation dataset, run the core RAG evaluation metrics, wire the results into CI, and interpret the scores so they drive real decisions. Every snippet is runnable Python against the current Ragas API. If you are the person responsible for quality on an LLM feature, whether you call yourself an SDET, an ML engineer, or an AI QA specialist, this is the workflow that keeps your RAG system honest. For a broader view of how these skills fit into an AI-first testing practice, see our guide to [vibe testing](/blog/vibe-testing-ai-first-qa-guide) and the growing catalog of [QA skills](/skills) for coding agents.

## What Is Ragas and Why RAG Needs Its Own Metrics

Traditional NLP metrics like BLEU and ROUGE compare generated text against a single reference string using n-gram overlap. That works for machine translation, but it is close to useless for RAG, where two completely different wordings can both be correct and a fluent-sounding answer can be entirely fabricated. Ragas takes a different approach: it uses an LLM as a judge to decompose answers into claims, check whether each claim is supported by the retrieved context, and measure how well the retrieval and generation stages line up with the user's actual question.

The key insight is that a RAG pipeline has two failure surfaces. The retriever can bring back irrelevant or incomplete context, and the generator can ignore good context or invent facts. A single end-to-end accuracy number cannot tell these apart. Ragas splits the diagnosis into component metrics so you always know which knob to turn.

| Metric | What it measures | Needs ground truth? | Stage diagnosed |
|---|---|---|---|
| Faithfulness | Are answer claims grounded in the context? | No | Generation |
| Answer Relevancy | Does the answer address the question? | No | Generation |
| Context Precision | Are relevant chunks ranked highly? | Yes (or ref-free) | Retrieval |
| Context Recall | Was all needed context retrieved? | Yes | Retrieval |
| Answer Correctness | Is the answer factually right vs. ground truth? | Yes | End-to-end |

## Installing Ragas and Setting Up Your Environment

Ragas runs on Python 3.10 or newer and needs an LLM plus an embedding model to act as the judge. The most common setup uses OpenAI, but any LangChain-compatible model works, including local models served through Ollama.

\`\`\`bash
python -m venv .venv
source .venv/bin/activate
pip install "ragas>=0.2" datasets langchain-openai
export OPENAI_API_KEY="sk-your-key-here"
\`\`\`

Verify the install and configure the judge LLM and embeddings. In modern Ragas you wrap your models once and pass them into the metrics or the \`evaluate\` call.

\`\`\`python
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

evaluator_llm = LangchainLLMWrapper(ChatOpenAI(model="gpt-4o-mini"))
evaluator_embeddings = LangchainEmbeddingsWrapper(OpenAIEmbeddings())

print("Ragas judge configured")
\`\`\`

Pick a cheaper, fast model for the judge (like \`gpt-4o-mini\`) when you run large evaluation suites, and reserve a stronger model for spot-checks. The judge model quality directly affects metric reliability, so keep it fixed across runs to make scores comparable over time.

## Building Your Evaluation Dataset

Ragas evaluates a dataset where each row represents one interaction: a user question, the contexts your retriever returned, the answer your pipeline generated, and optionally a ground-truth reference. In current Ragas you assemble these as \`SingleTurnSample\` objects or an \`EvaluationDataset\`.

\`\`\`python
from ragas import EvaluationDataset
from ragas.dataset_schema import SingleTurnSample

samples = [
    SingleTurnSample(
        user_input="What is the free tier request limit on the API?",
        retrieved_contexts=[
            "The free tier allows 1,000 API requests per month.",
            "Paid plans start at 50,000 requests per month.",
        ],
        response="The free tier includes 1,000 API requests per month.",
        reference="The free tier allows 1,000 requests per month.",
    ),
    SingleTurnSample(
        user_input="Which regions are supported for data residency?",
        retrieved_contexts=[
            "Data residency is available in the EU and US regions.",
        ],
        response="Data residency is offered in the EU, US, and Asia regions.",
        reference="Data residency is available in the EU and US regions.",
    ),
]

dataset = EvaluationDataset(samples=samples)
print(f"Loaded {len(dataset)} evaluation samples")
\`\`\`

Notice the second sample deliberately adds "Asia" to the answer, which the context does not support. This is exactly the kind of hallucination faithfulness will catch. Aim for at least 50 to 100 curated samples that cover your real query distribution, including edge cases, ambiguous questions, and questions your docs genuinely cannot answer.

## Measuring Faithfulness: Catching Hallucinations

Faithfulness is the flagship RAG evaluation metric. It breaks the generated answer into individual claims and checks what fraction of those claims can be inferred from the retrieved context. A score of 1.0 means every statement is grounded; a lower score means the model added unsupported information.

\`\`\`python
from ragas import evaluate
from ragas.metrics import Faithfulness

result = evaluate(
    dataset=dataset,
    metrics=[Faithfulness(llm=evaluator_llm)],
)

print(result)
df = result.to_pandas()
print(df[["user_input", "faithfulness"]])
\`\`\`

The second sample will score low on faithfulness because "Asia" is not in the context. Faithfulness is reference-free, which means you can run it in production against live traffic where you have no ground truth. That makes it the single most valuable guardrail metric for detecting hallucination regressions after a model or prompt change.

## Measuring Answer Relevancy

An answer can be perfectly faithful and still be useless if it rambles or answers a different question. Answer relevancy measures how directly the response addresses the original question. Ragas computes it by asking the judge LLM to generate several questions that the answer would satisfy, then measuring the cosine similarity between those synthetic questions and the real one using embeddings.

\`\`\`python
from ragas.metrics import ResponseRelevancy

result = evaluate(
    dataset=dataset,
    metrics=[
        ResponseRelevancy(
            llm=evaluator_llm,
            embeddings=evaluator_embeddings,
        )
    ],
)

print(result.to_pandas()[["user_input", "answer_relevancy"]])
\`\`\`

Low relevancy scores usually point at a prompt problem: the system prompt may be encouraging verbose, hedged, or off-topic responses. Because this metric needs embeddings, always pass the same embedding model you configured earlier so scores stay consistent across runs.

## Measuring Context Precision and Context Recall

The two previous metrics diagnose generation. Context precision and context recall diagnose retrieval. Context precision asks whether the relevant chunks were ranked near the top of the retrieved set, which matters because most pipelines only feed the top-k chunks to the model. Context recall asks whether everything needed to answer the question was actually retrieved at all.

\`\`\`python
from ragas.metrics import LLMContextPrecisionWithReference, LLMContextRecall

result = evaluate(
    dataset=dataset,
    metrics=[
        LLMContextPrecisionWithReference(llm=evaluator_llm),
        LLMContextRecall(llm=evaluator_llm),
    ],
)

cols = ["user_input", "llm_context_precision_with_reference", "context_recall"]
print(result.to_pandas()[cols])
\`\`\`

Here is how to read the combinations, which is where Ragas earns its keep as a diagnostic tool rather than a report card.

| Context Precision | Context Recall | Diagnosis | Fix |
|---|---|---|---|
| High | High | Retrieval is healthy | Focus on generation |
| Low | High | Right chunks retrieved but ranked poorly | Improve reranking |
| High | Low | Top chunks relevant but missing info | Increase top-k or chunk size |
| Low | Low | Retriever is failing broadly | Revisit embeddings and indexing |

## Running a Full Multi-Metric Evaluation

In practice you run all the metrics together in one pass so you get a complete diagnostic per row. Ragas parallelizes the judge calls and returns a single result object you can export to a DataFrame or CSV.

\`\`\`python
from ragas import evaluate
from ragas.metrics import (
    Faithfulness,
    ResponseRelevancy,
    LLMContextPrecisionWithReference,
    LLMContextRecall,
)
from ragas.run_config import RunConfig

metrics = [
    Faithfulness(llm=evaluator_llm),
    ResponseRelevancy(llm=evaluator_llm, embeddings=evaluator_embeddings),
    LLMContextPrecisionWithReference(llm=evaluator_llm),
    LLMContextRecall(llm=evaluator_llm),
]

result = evaluate(
    dataset=dataset,
    metrics=metrics,
    run_config=RunConfig(max_workers=8, timeout=120),
)

scores = result.to_pandas()
scores.to_csv("ragas_report.csv", index=False)
print(scores.mean(numeric_only=True))
\`\`\`

The aggregate means at the bottom give you your dashboard numbers, while the per-row DataFrame lets you drill into the worst offenders. Sort by faithfulness ascending and you have an instant queue of the answers most likely to be hallucinating.

## Integrating Ragas Into CI/CD

Numbers in a notebook do not stop regressions; a failing build does. Wrap your evaluation in a test that asserts thresholds and run it in your pipeline on every change to prompts, retrieval config, or the model itself. This is the same shift-left discipline we cover in [testing AI generated code](/blog/testing-ai-generated-code-sdet-playbook).

\`\`\`python
import sys
from ragas import evaluate
from ragas.metrics import Faithfulness, ResponseRelevancy

THRESHOLDS = {"faithfulness": 0.85, "answer_relevancy": 0.80}

def test_rag_quality():
    result = evaluate(
        dataset=dataset,
        metrics=[
            Faithfulness(llm=evaluator_llm),
            ResponseRelevancy(llm=evaluator_llm, embeddings=evaluator_embeddings),
        ],
    )
    means = result.to_pandas().mean(numeric_only=True)
    failures = [
        f"{m}: {means[m]:.3f} < {t}"
        for m, t in THRESHOLDS.items()
        if means[m] < t
    ]
    if failures:
        print("RAG quality gate failed:\\n" + "\\n".join(failures))
        sys.exit(1)
    print("RAG quality gate passed")

if __name__ == "__main__":
    test_rag_quality()
\`\`\`

Set thresholds slightly below your current baseline so the gate catches regressions without blocking normal noise. If your evaluation dataset is large, sample a representative subset for the fast PR gate and run the full suite nightly. For teams standardizing this kind of automation, our roundup of [AI test automation tools](/blog/ai-test-automation-tools-2026) covers where Ragas fits alongside other frameworks.

## Generating Synthetic Test Data With Ragas

Curating an evaluation dataset by hand is the biggest bottleneck teams hit, because writing dozens of realistic questions with correct reference answers is slow and requires domain knowledge. Ragas includes a test set generator that reads your source documents and produces diverse question-answer pairs automatically, spanning simple factual lookups, multi-hop reasoning, and conditional queries. This gives you a broad starting dataset in minutes that you can then curate rather than author from scratch.

\`\`\`python
from ragas.testset import TestsetGenerator
from langchain_community.document_loaders import DirectoryLoader

docs = DirectoryLoader("./knowledge_base", glob="**/*.md").load()

generator = TestsetGenerator.from_langchain(
    llm=evaluator_llm,
    embedding_model=evaluator_embeddings,
)
testset = generator.generate_with_langchain_docs(docs, testset_size=30)

df = testset.to_pandas()
print(df[["user_input", "reference"]].head())
\`\`\`

The generator classifies questions by type so your suite is not all easy lookups, which is exactly the diversity that surfaces retrieval and reasoning weaknesses. Treat the output as a first draft: review the generated questions, discard any that are malformed or trivial, and correct the reference answers where the generator drifted. A synthetic-then-curated workflow gets you to a strong dataset far faster than starting from a blank page, and it scales as your knowledge base grows.

## Tracking Ragas Scores Over Time

A single evaluation snapshot tells you where you stand today, but the real value comes from trend lines. Persist the aggregate scores from each run alongside the commit hash and the configuration that produced them, so you can plot how a prompt rewrite, a chunking change, or a model upgrade moved each metric. A dip in context precision after a retriever change, or a drop in faithfulness after a prompt edit, becomes immediately visible instead of surfacing weeks later as user complaints.

\`\`\`python
import json, subprocess, datetime

means = result.to_pandas().mean(numeric_only=True).to_dict()
record = {
    "timestamp": datetime.datetime.utcnow().isoformat(),
    "commit": subprocess.check_output(
        ["git", "rev-parse", "--short", "HEAD"]
    ).decode().strip(),
    "scores": {k: round(float(v), 4) for k, v in means.items()},
}
with open("ragas_history.jsonl", "a") as f:
    f.write(json.dumps(record) + "\\n")
print("Logged:", record)
\`\`\`

Appending each run to a JSON lines file is the simplest durable log, and you can later load it into a notebook or dashboard to chart every metric against your commit history. This turns Ragas from a one-off audit into a continuous quality signal that grows more useful with every release.

## Ragas vs Other LLM Evaluation Frameworks

Ragas is not the only option, and choosing the right tool depends on what you are testing. Ragas specializes in RAG pipelines, while frameworks like DeepEval and promptfoo cast a wider net over general LLM behavior. Many teams run more than one.

| Framework | Best for | RAG metrics | Config style |
|---|---|---|---|
| Ragas | RAG pipeline diagnostics | Deep, built-in | Python |
| DeepEval | Unit-test-style LLM assertions | Some | Python (pytest) |
| promptfoo | Prompt A/B testing and red-teaming | Basic | YAML + CLI |
| TruLens | Observability and feedback functions | Yes | Python |

If your primary problem is retrieval quality and hallucination, Ragas is the sharpest tool. If you are comparing prompt variants or running adversarial tests, pair it with promptfoo. To connect these evaluators to live agents and tools, see [MCP for QA engineers](/blog/mcp-for-qa-engineers-guide).

## Measuring Answer Correctness Against Ground Truth

Faithfulness tells you an answer is grounded in the context, but it cannot tell you the answer is actually right if the retrieved context itself was wrong or incomplete. That is where answer correctness comes in. It compares the generated response against a human-written reference answer, blending factual overlap with semantic similarity to produce an end-to-end quality score. Use it on a curated, labeled dataset when you want a single number that reflects true correctness rather than mere groundedness.

\`\`\`python
from ragas.metrics import AnswerCorrectness

result = evaluate(
    dataset=dataset,
    metrics=[
        AnswerCorrectness(
            llm=evaluator_llm,
            embeddings=evaluator_embeddings,
        )
    ],
)

print(result.to_pandas()[["user_input", "answer_correctness"]])
\`\`\`

Answer correctness is stricter than faithfulness because it penalizes both hallucinated statements and missing facts relative to the reference. A pipeline can score a perfect faithfulness of 1.0 yet a mediocre answer correctness if it faithfully reports incomplete context. Reading the two metrics together is powerful: high faithfulness with low correctness almost always points at a retrieval gap rather than a generation flaw, which loops you straight back to context recall.

## Evaluating With Local Models via Ollama

You do not have to send your evaluation data to a hosted API. Ragas accepts any LangChain-compatible model, so you can run the judge entirely on your own hardware with Ollama. This matters for teams with privacy constraints or those who want to keep evaluation costs at zero while iterating quickly.

\`\`\`python
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_ollama import ChatOllama, OllamaEmbeddings

local_llm = LangchainLLMWrapper(ChatOllama(model="llama3.1"))
local_embeddings = LangchainEmbeddingsWrapper(
    OllamaEmbeddings(model="nomic-embed-text")
)

result = evaluate(
    dataset=dataset,
    metrics=[Faithfulness(llm=local_llm)],
)
print(result.to_pandas()[["user_input", "faithfulness"]])
\`\`\`

The trade-off is judgment quality. Smaller local models produce noisier scores and occasionally misparse the structured judging prompts Ragas uses, so validate a local judge against a hosted one on a sample before trusting it for gating decisions. A pragmatic hybrid is to iterate locally for speed during development, then run the final CI gate with a stronger hosted judge for reliability.

## Common Pitfalls and How to Avoid Them

The most frequent mistake is treating a single evaluation run as ground truth. LLM-judge metrics have variance, so run each evaluation two or three times and look at the spread, not just one number. The second common trap is using a weak or inconsistent judge model, which produces noisy, unreproducible scores; pin the judge model and version. Third, teams often build tiny datasets of ten happy-path questions and declare victory, then get blindsided in production; invest in a dataset that reflects real query diversity, including unanswerable questions. Finally, do not chase a perfect 1.0 on every metric. A faithfulness of 0.9 with good coverage beats a 1.0 on a trivial dataset. Treat the metrics as a compass, not a scoreboard.

## Frequently Asked Questions

### What is Ragas used for in RAG evaluation?

Ragas is an open-source Python framework for evaluating retrieval-augmented generation pipelines. It uses an LLM as a judge to score answers on metrics like faithfulness, answer relevancy, context precision, and context recall. This lets you separately diagnose whether problems come from retrieval or generation, so you can fix the right component instead of guessing.

### How does Ragas measure faithfulness?

Ragas measures faithfulness by breaking the generated answer into individual factual claims, then checking what fraction of those claims can be inferred from the retrieved context. The score ranges from 0 to 1, where 1 means every claim is grounded. Because it needs no ground-truth reference, faithfulness works on live production traffic to catch hallucinations.

### Do I need ground-truth answers to use Ragas?

Not for every metric. Faithfulness and answer relevancy are reference-free, so you can run them without labeled data, even in production. Context recall and answer correctness require ground-truth references. A practical approach is to run reference-free metrics continuously on live traffic and reference-based metrics on a curated dataset during CI.

### Which LLM should I use as the Ragas judge?

Use a capable but cost-effective model like gpt-4o-mini for large evaluation runs, and pin it to a specific version so scores stay comparable over time. Stronger models give more reliable judgments but cost more per evaluation. The most important rule is consistency: changing the judge model changes your baseline, so keep it fixed across comparison runs.

### How is Ragas different from BLEU or ROUGE?

BLEU and ROUGE measure n-gram overlap against a reference string, which fails for RAG because correct answers can be worded many ways and fluent answers can still be fabricated. Ragas uses an LLM judge to check semantic grounding, relevance, and retrieval quality. This captures whether an answer is actually correct and supported, not just textually similar.

### Can I run Ragas in a CI/CD pipeline?

Yes. Wrap the evaluate call in a test that asserts minimum thresholds on your key metrics and exits non-zero when they drop. Run a sampled subset on every pull request for speed, and the full evaluation dataset nightly. This turns RAG quality into an automated gate that blocks regressions before they reach users.

### How many samples do I need for reliable Ragas scores?

Start with at least 50 to 100 curated samples that reflect your real query distribution, including edge cases and unanswerable questions. Smaller sets produce noisy aggregate scores and miss failure modes. Because LLM-judge metrics have variance, also run each evaluation a few times and track the spread rather than trusting a single number.

## Conclusion

Ragas turns RAG quality from a matter of opinion into a set of measurable, actionable numbers. By separating faithfulness and answer relevancy on the generation side from context precision and recall on the retrieval side, you always know which part of the pipeline to fix. Install it, build a representative evaluation dataset, run the full multi-metric suite, and wire the results into CI so regressions fail the build instead of surprising your users. Start small, iterate on your dataset, and treat the scores as a compass that points you toward the weakest link.

Ready to level up your AI testing practice? Explore the full library of [QA skills](/skills) for coding agents to plug Ragas, prompt testing, and RAG evaluation directly into your development workflow.
`,
};
