import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Ragas Faithfulness, Context Precision, Recall Reference 2026',
  description:
    'Complete 2026 Ragas reference: faithfulness, answer relevancy, context precision, context recall and entity recall with runnable Python and score interpretation.',
  date: '2026-06-11',
  category: 'Reference',
  content: `
# Ragas Faithfulness, Answer Relevancy, Context Precision and Recall Reference (2026)

Ragas is the most widely adopted open-source framework for evaluating retrieval-augmented generation (RAG) pipelines, and in 2026 its metric suite is the practical standard for answering the question every RAG team eventually asks: "is my system actually grounded in the documents it retrieved, and did it retrieve the right documents in the first place?" Where a unit test asserts that a string equals another string, Ragas decomposes an LLM answer into atomic claims, checks each claim against the retrieved context, and returns a continuous score between 0 and 1 that you can track over time, gate in continuous integration (CI), and slice by query type. Crucially, Ragas separates the two failure surfaces of any RAG system: the **retriever** (did we fetch the relevant chunks?) and the **generator** (did the model faithfully use what it fetched?). Mixing those two failure modes together is the single most common reason teams cannot improve their RAG systems, and Ragas exists to keep them apart.

This reference is written for QA engineers, ML engineers, and developers who need one authoritative place to look up exactly what each Ragas metric measures, what fields it requires, how it is computed, and how to interpret the resulting score. We cover installation and judge/embeddings setup, the \\\`SingleTurnSample\\\` and \\\`EvaluationDataset\\\` objects everything revolves around, the four core metrics (faithfulness, answer/response relevancy, context precision, context recall) plus context entity recall and noise sensitivity, the \\\`evaluate()\\\` API, choosing your judge LLM and embedding model, and how to read the per-sample results to drive real fixes. Every code block below is real, runnable Python that you can paste into a fresh virtual environment. By the end you will know which Ragas metric maps to which failure mode and how to wire the whole thing into an automated quality gate. If you also use other evaluators, see our companion [DeepEval RAG evaluation metrics reference](/blog/deepeval-rag-evaluation-metrics-reference-2026) and the [DeepEval metrics complete guide](/blog/deepeval-metrics-complete-guide-2026).

## Installing Ragas and Configuring the Judge LLM and Embeddings

Ragas is a pure Python package. Almost every Ragas metric is LLM-assisted: a judge model extracts claims, verifies them, or generates hypothetical questions, and several metrics additionally need an embedding model for semantic similarity. Install Ragas alongside the LangChain OpenAI bindings that wrap your models.

\\\`\\\`\\\`bash
pip install -U ragas langchain-openai
export OPENAI_API_KEY="sk-..."
\\\`\\\`\\\`

In modern Ragas (0.2+), you wrap your provider model in a \\\`LangchainLLMWrapper\\\` and your embeddings in a \\\`LangchainEmbeddingsWrapper\\\`. This indirection is what lets you swap OpenAI for Azure, Anthropic, Gemini, or a local model without touching metric code.

\\\`\\\`\\\`python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper

evaluator_llm = LangchainLLMWrapper(ChatOpenAI(model="gpt-4o-mini"))
evaluator_embeddings = LangchainEmbeddingsWrapper(OpenAIEmbeddings(model="text-embedding-3-small"))
\\\`\\\`\\\`

A practical tip: use a small, cheap, deterministic judge (temperature 0) for routine CI runs and reserve a stronger judge for periodic deep audits. The judge model is the largest cost and latency driver of any Ragas run, and faithfulness in particular fires multiple LLM calls per sample.

## The SingleTurnSample and EvaluationDataset Objects

Everything in Ragas revolves around a sample. A single-turn RAG interaction is described by a \\\`SingleTurnSample\\\`, which carries up to five fields depending on which metrics you intend to run.

\\\`\\\`\\\`python
from ragas import SingleTurnSample

sample = SingleTurnSample(
    user_input="When was the Eiffel Tower completed and how tall is it?",
    response="The Eiffel Tower was completed in 1889 and stands about 330 metres tall.",
    retrieved_contexts=[
        "The Eiffel Tower was completed in 1889 for the World's Fair in Paris.",
        "The Eiffel Tower is approximately 330 metres tall including antennas.",
    ],
    reference="The Eiffel Tower was completed in 1889 and is about 330 metres tall.",
)
\\\`\\\`\\\`

The fields map onto the parts of a RAG pipeline: \\\`user_input\\\` is the question, \\\`retrieved_contexts\\\` are the chunks your retriever returned, \\\`response\\\` is what your generator produced, and \\\`reference\\\` is the ground-truth answer you wrote when building the test set. Not every metric needs every field, which is exactly why understanding the field requirements (next section) saves you from confusing errors. To evaluate a whole test set, collect samples into an \\\`EvaluationDataset\\\`.

\\\`\\\`\\\`python
from ragas import EvaluationDataset

dataset = EvaluationDataset(samples=[sample, sample])  # add as many as you like
print(len(dataset))
\\\`\\\`\\\`

You can also build a dataset from a list of dictionaries or a Hugging Face dataset, which is convenient when your evaluation data already lives in a JSON file or a pandas DataFrame.

\\\`\\\`\\\`python
data = [
    {
        "user_input": "What is the capital of France?",
        "response": "The capital of France is Paris.",
        "retrieved_contexts": ["Paris is the capital and most populous city of France."],
        "reference": "Paris",
    }
]
dataset = EvaluationDataset.from_list(data)
\\\`\\\`\\\`

## The Metric Reference Table: Formula Intuition and Range

Each Ragas metric returns a score in the range 0 to 1 (higher is better), but each is computed differently and requires a different combination of fields. The table below is the cheat sheet you will return to most often.

| Metric | What it measures | Computation intuition | Required fields | Range |
|---|---|---|---|---|
| Faithfulness | Is the answer grounded in the retrieved context? | Decompose response into atomic claims, then fraction of claims supported by context | user_input, response, retrieved_contexts | 0-1 |
| Answer (Response) Relevancy | Does the answer address the question asked? | Generate N questions from the answer, mean cosine similarity to the original question | user_input, response, retrieved_contexts | 0-1 |
| Context Precision | Are relevant chunks ranked at the top? | Mean of precision@k over ranks weighted by whether each chunk is useful | user_input, retrieved_contexts, reference (or response) | 0-1 |
| Context Recall | Was all needed info actually retrieved? | Fraction of reference (ground-truth) claims attributable to the retrieved context | user_input, retrieved_contexts, reference | 0-1 |
| Context Entity Recall | Were the key entities retrieved? | Fraction of entities in reference that also appear in retrieved context | retrieved_contexts, reference | 0-1 |
| Noise Sensitivity | How often do irrelevant chunks cause wrong claims? | Fraction of response claims that are incorrect given relevant vs irrelevant context | user_input, response, retrieved_contexts, reference | 0-1 (lower better) |

Note the one exception to "higher is better": noise sensitivity is a robustness metric where a lower score is better, because it measures how easily distractor chunks corrupt your answer.

## Faithfulness: Is the Answer Grounded in Retrieved Context?

Faithfulness is the flagship anti-hallucination metric. It works in two passes. First the judge LLM breaks the generated \\\`response\\\` into a list of standalone factual claims. Then, for each claim, it asks whether the claim can be inferred from the \\\`retrieved_contexts\\\`. The final score is the number of supported claims divided by the total number of claims, so a response where every statement is backed by the context scores 1.0, and a response that invents a fact the context never mentioned is penalised in proportion to how many such claims it makes.

\\\`\\\`\\\`python
import asyncio
from ragas.metrics import Faithfulness

scorer = Faithfulness(llm=evaluator_llm)
score = asyncio.run(scorer.single_turn_ascore(sample))
print(f"Faithfulness: {score:.2f}")
\\\`\\\`\\\`

Because faithfulness compares the answer only against the retrieved context (not against ground truth), a high faithfulness score does not mean the answer is correct in the real world. It means the answer is consistent with what was retrieved. If your retriever pulled a wrong document and the model faithfully repeated it, faithfulness will be high but the answer wrong. That is the whole point of separating retriever and generator metrics: faithfulness audits the generator, while the context metrics audit the retriever.

## Answer (Response) Relevancy: Does the Answer Address the Question?

Response relevancy (historically "answer relevancy") measures whether the answer is on-topic and complete, penalising responses that are evasive, padded with filler, or only partially address the question. The computation is clever: the judge generates several artificial questions that the given answer would be a good response to, embeds them, and compares their cosine similarity to the embedding of the original \\\`user_input\\\`. If the answer truly addresses the question, the reverse-engineered questions will be semantically close to the real one.

\\\`\\\`\\\`python
from ragas.metrics import ResponseRelevancy

scorer = ResponseRelevancy(llm=evaluator_llm, embeddings=evaluator_embeddings)
score = asyncio.run(scorer.single_turn_ascore(sample))
print(f"Response relevancy: {score:.2f}")
\\\`\\\`\\\`

This is the one core metric that needs both a judge LLM and an embedding model. Because it uses embeddings, the choice of embedding model matters: a weak embedding model will produce noisy similarity scores. Note that response relevancy does not measure factual correctness at all; an answer can be completely wrong yet perfectly relevant, which is exactly why you run it alongside faithfulness rather than instead of it.

## Context Precision: Are the Relevant Chunks Ranked at the Top?

Context precision evaluates the retriever's ranking quality. A good retriever does not just return relevant chunks somewhere in the result set; it returns them near the top, because the generator pays most attention to the highest-ranked context. Context precision computes precision@k at every rank and averages it, weighted by whether each chunk is actually useful for answering. The result rewards systems that put the signal first and the noise last.

\\\`\\\`\\\`python
from ragas.metrics import LLMContextPrecisionWithReference

scorer = LLMContextPrecisionWithReference(llm=evaluator_llm)
score = asyncio.run(scorer.single_turn_ascore(sample))
print(f"Context precision: {score:.2f}")
\\\`\\\`\\\`

Ragas offers several context precision variants. \\\`LLMContextPrecisionWithReference\\\` judges usefulness against your ground-truth \\\`reference\\\`, which is the most reliable option when you have labelled data. There is also a reference-free variant that judges usefulness against the \\\`response\\\`, and a non-LLM variant that compares retrieved contexts against a list of known-relevant reference contexts using string similarity, useful when you want a cheap, deterministic check with no judge calls.

## Context Recall: Did You Retrieve Everything You Needed?

Context recall is the counterpart to precision and arguably the most important retriever metric, because a chunk you never retrieved is information the generator can never use. Recall asks: of all the claims in the ground-truth \\\`reference\\\` answer, what fraction can be attributed to the \\\`retrieved_contexts\\\`? The judge breaks the reference into claims and checks whether each one is supported by the retrieved chunks. A low recall means your retriever is leaving necessary evidence on the table, no matter how faithfully the generator behaves.

\\\`\\\`\\\`python
from ragas.metrics import LLMContextRecall

scorer = LLMContextRecall(llm=evaluator_llm)
score = asyncio.run(scorer.single_turn_ascore(sample))
print(f"Context recall: {score:.2f}")
\\\`\\\`\\\`

Context recall is the only core metric that strictly requires a ground-truth \\\`reference\\\`, so it is the one that forces you to invest in a labelled test set. That investment pays off: precision tells you whether you retrieved junk, while recall tells you whether you missed gold, and you need both to know which way to tune your chunk size, top-k, and reranker.

## Context Entity Recall and Noise Sensitivity

Two additional metrics round out the suite. **Context entity recall** is a sharper, entity-focused version of recall that is especially valuable for fact-heavy domains like finance, medicine, or tourism, where the right answer hinges on specific named entities (dates, drug names, account numbers). It computes the fraction of entities present in the reference that also appear in the retrieved context.

\\\`\\\`\\\`python
from ragas.metrics import ContextEntityRecall

scorer = ContextEntityRecall(llm=evaluator_llm)
score = asyncio.run(scorer.single_turn_ascore(sample))
print(f"Context entity recall: {score:.2f}")
\\\`\\\`\\\`

**Noise sensitivity** measures robustness: how often does the system make an incorrect claim when the retrieved set includes irrelevant (distractor) chunks? It requires \\\`user_input\\\`, \\\`response\\\`, \\\`reference\\\`, and \\\`retrieved_contexts\\\`, and unlike the others, a lower score is better because you want a system that ignores noise rather than parroting it.

\\\`\\\`\\\`python
from ragas.metrics import NoiseSensitivity

scorer = NoiseSensitivity(llm=evaluator_llm)
score = asyncio.run(scorer.single_turn_ascore(sample))
print(f"Noise sensitivity (lower is better): {score:.2f}")
\\\`\\\`\\\`

## Running evaluate() Across a Full Dataset

For real evaluation you rarely score one sample at a time. The \\\`evaluate()\\\` function takes an \\\`EvaluationDataset\\\` and a list of metrics, runs them all concurrently, and returns an object you can convert into a pandas DataFrame for slicing and reporting.

\\\`\\\`\\\`python
from ragas import evaluate
from ragas.metrics import (
    Faithfulness,
    ResponseRelevancy,
    LLMContextPrecisionWithReference,
    LLMContextRecall,
)

result = evaluate(
    dataset=dataset,
    metrics=[
        Faithfulness(),
        ResponseRelevancy(),
        LLMContextPrecisionWithReference(),
        LLMContextRecall(),
    ],
    llm=evaluator_llm,
    embeddings=evaluator_embeddings,
)

print(result)                 # aggregate mean per metric
df = result.to_pandas()       # per-sample scores for every metric
print(df.head())
\\\`\\\`\\\`

Passing \\\`llm\\\` and \\\`embeddings\\\` to \\\`evaluate()\\\` sets the defaults for any metric you did not configure individually, which keeps your judge consistent across the whole run. The aggregate print gives you a one-line dashboard, while \\\`to_pandas()\\\` is where the real debugging happens, because you can sort by faithfulness ascending and immediately read the worst-grounded answers.

## Mapping Metrics to Failure Modes

The reason to run several metrics together is that each one isolates a different failure. This second table is the diagnostic key: when a metric drops, it tells you precisely where to look.

| If this metric is low | The likely failure is | Where to fix it |
|---|---|---|
| Faithfulness | Generator hallucinates beyond the context | Prompt the model to answer only from context; lower temperature |
| Response relevancy | Answer is evasive, padded, or off-topic | Tighten the answer prompt; remove filler instructions |
| Context precision | Retriever ranks junk above signal | Add or tune a reranker; reduce top-k; improve chunking |
| Context recall | Retriever misses needed evidence | Increase top-k; improve embeddings; revisit chunk size/overlap |
| Context entity recall | Key named entities are not retrieved | Entity-aware chunking; hybrid (keyword + vector) search |
| High noise sensitivity | Distractor chunks corrupt the answer | Stronger reranking; instruct model to ignore irrelevant context |

The diagnostic logic is simple: if your retriever metrics (precision, recall, entity recall) are healthy but faithfulness is low, fix the generator. If faithfulness is fine but recall is low, fix the retriever. This separation is what makes Ragas actionable rather than just a vanity score. For a complementary toolkit that wraps these ideas into a triad dashboard, compare with [Arize Phoenix LLM observability and evaluations](/blog/arize-phoenix-llm-observability-tracing-evaluations-2026), and to add adversarial pressure to your pipeline see our [Promptfoo red-teaming guide](/blog/promptfoo-red-teaming-guide-2026).

## Choosing Your Judge LLM and Embedding Model

Because Ragas wraps every model in a LangChain interface, swapping providers is a one-line change. To use Azure OpenAI, Anthropic via LangChain, Google Gemini, or a local Ollama model, instantiate the corresponding LangChain chat model and pass it to \\\`LangchainLLMWrapper\\\`.

\\\`\\\`\\\`python
# Example: local model via Ollama for the judge, OpenAI embeddings for similarity
from langchain_community.chat_models import ChatOllama
from langchain_openai import OpenAIEmbeddings
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper

local_judge = LangchainLLMWrapper(ChatOllama(model="llama3.1"))
embeddings = LangchainEmbeddingsWrapper(OpenAIEmbeddings(model="text-embedding-3-small"))
\\\`\\\`\\\`

Three rules of thumb keep your scores trustworthy. First, set the judge temperature to 0 so scores are reproducible across runs. Second, pin the judge model version in CI; an upgrade from one judge version to another can shift absolute scores even with no change to your app, so freeze it and only re-baseline deliberately. Third, prefer a stronger judge than the model under test where budget allows, because a weak judge is itself a source of evaluation noise. To turn these scores into install-once skills for your own agents, browse the QA evaluation [skills directory](/skills).

## Frequently Asked Questions

### What is the difference between context precision and context recall in Ragas?

Context precision measures ranking quality: are the relevant chunks placed near the top of the retrieved set? Context recall measures completeness: did the retriever fetch all the information the ground-truth answer needs? Precision punishes retrieving junk; recall punishes missing gold. You need both, because a retriever can score high on one and fail badly on the other.

### Does a high Ragas faithfulness score mean my answer is correct?

No. Faithfulness only checks whether the answer is consistent with the retrieved context, not whether it is true in the real world. If your retriever returned a wrong document and the model faithfully repeated it, faithfulness will be high but the answer wrong. Pair faithfulness with context recall and a ground-truth reference to catch factual errors.

### Which Ragas metrics require a ground-truth reference answer?

Context recall and context entity recall strictly require a ground-truth \\\`reference\\\`, and \\\`LLMContextPrecisionWithReference\\\` and noise sensitivity also use it. Faithfulness and response relevancy do not need a reference; they compare the answer against the retrieved context and the question respectively, which makes them usable on unlabelled production traffic.

### What score range does Ragas use and what counts as good?

Every Ragas metric returns a score from 0 to 1. For most metrics higher is better, and teams commonly gate CI at 0.8 or above for faithfulness and context recall. The exception is noise sensitivity, where lower is better. Always set thresholds by baselining your own system rather than copying numbers, since absolute scores depend on the judge model.

### Why does Ragas need both a judge LLM and an embedding model?

Most metrics use a judge LLM to extract and verify claims. Response relevancy additionally needs an embedding model because it works by generating questions from the answer and measuring their cosine similarity to the original question. A weak embedding model produces noisy relevancy scores, so choose a current embedding model and keep it fixed across runs for comparability.

### Can I run Ragas on production traffic without ground-truth labels?

Yes, partially. Faithfulness, response relevancy, and the reference-free context precision variant all work without labels, so you can monitor grounding and relevancy on live traffic. To measure context recall, entity recall, or noise sensitivity you still need a labelled test set, so most teams run reference-free metrics in production and the full suite on a curated offline dataset.

### How do I reduce the cost and latency of a Ragas evaluation run?

Use a small, cheap judge model at temperature 0 for routine CI and reserve a stronger judge for periodic audits. Faithfulness is the most expensive metric because it fires several LLM calls per sample, so run it on a sampled subset if needed. Non-LLM context precision and string-based metrics add deterministic, zero-cost checks alongside the LLM-judged ones.

## Conclusion and Next Steps

Ragas gives RAG teams a principled, score-based way to separate the two things that can go wrong in a retrieval pipeline: the retriever fetching the wrong context, and the generator failing to use the right context faithfully. Faithfulness and response relevancy audit the generator; context precision, context recall, and entity recall audit the retriever; and noise sensitivity stress-tests robustness against distractors. Run them together with \\\`evaluate()\\\`, read the per-sample results with \\\`to_pandas()\\\`, and use the failure-mode table above to turn a dropping score into a concrete fix. Pin your judge model, keep temperature at 0, and re-baseline only on purpose.

Ready to operationalise this? Install the QA evaluation [skills](/skills) for your AI coding agent so it can scaffold Ragas test sets and CI gates for you, and pair this reference with the [DeepEval RAG evaluation metrics reference](/blog/deepeval-rag-evaluation-metrics-reference-2026) to cross-check scores across frameworks, or with the [LLM guardrails testing guide](/blog/llm-guardrails-testing-guide-2026) to add runtime safety checks on top of offline evaluation.
`,
};
