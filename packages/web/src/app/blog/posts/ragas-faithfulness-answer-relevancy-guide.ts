import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Ragas Faithfulness & Answer Relevancy: 2026 Guide',
  description:
    'A practical 2026 guide to Ragas faithfulness and answer relevancy metrics: definitions, runnable Python code, context precision/recall, thresholds, CI gating, and pitfalls.',
  date: '2026-06-27',
  category: 'Guide',
  content: `
# Ragas Faithfulness & Answer Relevancy: The 2026 Guide

If you are evaluating a RAG (retrieval-augmented generation) system, two questions matter more than any others: is the answer actually grounded in the documents you retrieved, and does the answer actually address what the user asked? Ragas answers exactly these with two of its flagship metrics, **Faithfulness** and **Answer Relevancy**, and it does so *reference-free*, meaning you do not need a human-written gold answer for every question. That last point is what makes Ragas usable at scale. Writing a perfect reference answer for thousands of evaluation questions is expensive and slow; Ragas instead uses the retrieved context and the question itself as the ground truth, letting an LLM judge decide whether each claim in the answer is supported and whether the answer is on-topic.

This guide is a hands-on walkthrough. You will install Ragas, configure the judge LLM and embeddings, and compute Faithfulness, Answer Relevancy, Context Precision, and Context Recall on real samples with runnable Python. We will cover how each metric is computed under the hood, because understanding *why* faithfulness decomposes an answer into atomic claims (and *why* answer relevancy reverse-generates questions from the answer) is what lets you debug a low score instead of just staring at it. Then we will build a full evaluation dataset, run \`evaluate()\` over it, read the results dataframe, set thresholds, and turn the whole thing into a CI regression gate that blocks a merge when quality drops. Finally we will cover the pitfalls that bite teams in production, judge-model variance, cost, context formatting, hallucinated claims, with concrete mitigations, and touch on Ragas's newer support for agentic workflows, SQL, and multimodal evaluation. If you want the broader metric landscape first, our [RAG evaluation metrics guide](/blog/rag-evaluation-metrics-complete-2026) and the [DeepEval vs Ragas vs Promptfoo comparison](/blog/deepeval-vs-ragas-vs-promptfoo-2026) give useful context, but this article stands on its own.

## Why Reference-Free Evaluation Matters

Traditional NLP evaluation compares model output against a human-written reference: BLEU, ROUGE, exact match. For RAG, that approach falls apart. There are many correct ways to phrase a faithful answer, exact-match scoring punishes valid paraphrases, and most importantly, producing a gold reference for every test question is a labeling project you will never finish. A 2,000-question regression set would need 2,000 hand-written reference answers, kept up to date as your knowledge base changes.

Ragas's reference-free metrics sidestep this. Faithfulness checks the answer against the *retrieved context* (which you already have), not against a gold answer. Answer Relevancy checks the answer against the *original question*, also already in hand. No human labels required for either. This is the single biggest practical reason Ragas is adopted for RAG: you can evaluate thousands of questions using only the data your pipeline already produces. (Context Recall, covered later, *does* benefit from a reference or ground-truth context, so it sits slightly apart, but the headline triad of faithfulness, answer relevancy, and context precision is reference-free.)

## Install and Setup

Installation is two packages. Ragas itself, plus \`datasets\` for the HuggingFace dataset format Ragas consumes.

\`\`\`bash
pip install ragas datasets
\`\`\`

Ragas runs metrics using a judge LLM and an embeddings model. You configure both explicitly so your evaluation is reproducible and you control cost. Here we wrap an OpenAI chat model and embeddings, but any LangChain-compatible model works (you can point the judge at a cheaper or local model).

\`\`\`python
# setup.py
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

# The judge model scores faithfulness/relevancy. Use a capable but
# affordable model; the judge runs once per metric per sample.
judge_llm = LangchainLLMWrapper(
    ChatOpenAI(model="gpt-4o-mini", temperature=0)  # temperature 0 = more stable scores
)

# Embeddings power answer relevancy (cosine similarity of generated
# questions to the original) and some context metrics.
judge_embeddings = LangchainEmbeddingsWrapper(
    OpenAIEmbeddings(model="text-embedding-3-small")
)
\`\`\`

Setting \`temperature=0\` on the judge is deliberate: it reduces run-to-run variance so a score change reflects a real change in your system, not judge randomness. We return to variance in the pitfalls section.

## The Faithfulness Metric

**Faithfulness measures whether the claims in the generated answer are supported by the retrieved context.** A faithful answer invents nothing; every factual statement traces back to a retrieved document. This is your primary hallucination detector for RAG.

Here is how Ragas computes it under the hood, which is worth understanding because it explains the failure modes:

1. **Decompose** the generated answer into a set of atomic claims (short, self-contained statements). For example, "Refunds are issued within 14 days and require an order ID" becomes two claims: "Refunds are issued within 14 days" and "Refunds require an order ID."
2. **Verify** each claim against the retrieved context using the judge LLM: can this claim be inferred from the provided context, yes or no?
3. **Score** = (number of claims supported by context) / (total number of claims).

A score of 1.0 means every claim is grounded; 0.5 means half the answer is unsupported (likely hallucinated or pulled from the model's parametric memory rather than your documents). Here is a runnable single-sample computation.

\`\`\`python
# faithfulness_demo.py
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import Faithfulness
from setup import judge_llm, judge_embeddings

sample = {
    "question": ["What is the refund window for digital products?"],
    "answer": [
        "Refunds for digital products are issued within 14 days of purchase, "
        "and you must provide your order ID to request one."
    ],
    "contexts": [[
        "Digital product refunds are processed within 14 days of the original "
        "purchase date. A valid order ID is required to start a refund request."
    ]],
}

dataset = Dataset.from_dict(sample)

result = evaluate(
    dataset,
    metrics=[Faithfulness()],
    llm=judge_llm,
    embeddings=judge_embeddings,
)
print(result)            # e.g. {'faithfulness': 1.0}
print(result.to_pandas()[["question", "faithfulness"]])
\`\`\`

Both claims (14-day window, order ID required) are directly supported by the context, so faithfulness is 1.0. If the answer had added "and refunds are credited to store credit only," a claim absent from the context, the score would drop to roughly 0.67 (two of three claims supported).

## The Answer Relevancy Metric

**Answer Relevancy measures whether the answer actually addresses the question that was asked,** independent of factual grounding. An answer can be perfectly faithful to the context yet relevancy-poor if it is evasive, padded with irrelevant detail, or only partially responsive.

The computation is clever and reference-free:

1. Using the judge LLM, **generate several questions** that the given answer would be a good response to (reverse-engineering the question from the answer).
2. **Embed** those generated questions and the original question.
3. **Score** = mean cosine similarity between each generated question's embedding and the original question's embedding.

The intuition: if the answer is on-topic, the questions you could reconstruct from it should look a lot like the question actually asked. If the answer wandered off, the reconstructed questions diverge and similarity drops. Ragas also penalizes answers flagged as noncommittal ("I don't know"), pulling their score down.

\`\`\`python
# answer_relevancy_demo.py
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import AnswerRelevancy
from setup import judge_llm, judge_embeddings

sample = {
    "question": ["How do I reset my account password?"],
    "answer": [
        "To reset your password, click 'Forgot password' on the login screen, "
        "enter your registered email, and follow the secure link we send you."
    ],
    "contexts": [[
        "Password resets begin from the login page via the 'Forgot password' link. "
        "Users enter their email to receive a one-time secure reset link."
    ]],
}

result = evaluate(
    Dataset.from_dict(sample),
    metrics=[AnswerRelevancy()],
    llm=judge_llm,
    embeddings=judge_embeddings,
)
print(result.to_pandas()[["question", "answer_relevancy"]])  # ~0.9+
\`\`\`

The answer directly and completely addresses the question, so relevancy is high. An answer like "Passwords are important for security" would be faithful-ish to a security doc but score low on relevancy because it does not tell the user how to reset anything.

## Context Precision and Context Recall

The two metrics above grade the *answer*. The next two grade *retrieval*, did your retriever surface the right documents, and did it rank them well? Bad retrieval is the most common root cause of bad RAG, so these matter.

**Context Precision** measures whether the relevant chunks appear at the *top* of the retrieved list. Retrieval often returns 5–10 chunks; precision rewards systems that put the chunk containing the answer first rather than buried at position 8. It is computed as a rank-weighted score over which retrieved chunks are relevant to producing the answer.

**Context Recall** measures whether *all* the information needed to answer was actually retrieved. It checks each statement in the ground-truth answer and asks: can this be attributed to the retrieved context? A high recall means retrieval did not miss necessary documents. Context Recall typically uses a reference/ground-truth answer, so it is the one metric in this group that is not strictly reference-free.

\`\`\`python
# context_metrics_demo.py
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import LLMContextPrecisionWithReference, LLMContextRecall
from setup import judge_llm, judge_embeddings

sample = {
    "question": ["Which regions support same-day payouts?"],
    "answer": ["Same-day payouts are available in the US, UK, and Canada."],
    "contexts": [[
        "Same-day payouts are supported in the United States, United Kingdom, and Canada.",
        "Standard payouts take 2-3 business days in all other regions.",
    ]],
    # ground-truth reference used by precision-with-reference and recall
    "reference": ["Same-day payouts are available in the US, UK, and Canada."],
}

result = evaluate(
    Dataset.from_dict(sample),
    metrics=[LLMContextPrecisionWithReference(), LLMContextRecall()],
    llm=judge_llm,
    embeddings=judge_embeddings,
)
print(result.to_pandas()[["context_precision", "context_recall"]])
\`\`\`

If the answer-bearing chunk is ranked first, precision is high; if every fact in the reference is found in the retrieved chunks, recall is high. Together, low faithfulness with high context recall points at a *generation* problem (the model had the docs but ignored or distorted them), while low context recall points at a *retrieval* problem (the docs were never fetched). This decomposition is exactly why you run all four metrics.

## The Ragas Metric Suite at a Glance

Here is the core suite summarized. "Needs reference?" indicates whether a human-written ground-truth answer is required.

| Metric | What it measures | Needs reference? | Range | A low score means |
|---|---|---|---|---|
| **Faithfulness** | Answer claims grounded in retrieved context | No | 0–1 | Hallucination; answer invents facts |
| **Answer Relevancy** | Answer addresses the question asked | No | 0–1 | Evasive, padded, or off-topic answer |
| **Context Precision** | Relevant chunks ranked near the top | Optional | 0–1 | Retriever returns noise above signal |
| **Context Recall** | All needed info was retrieved | Yes | 0–1 | Retrieval missed necessary documents |
| **Noise Sensitivity** | Robustness to irrelevant retrieved chunks | Yes | 0–1 | Model misled by distractor passages |
| **Multimodal Faithfulness** | Grounding for image+text answers | No | 0–1 | Claims about images unsupported |

The first four are the workhorses. Noise Sensitivity and Multimodal Faithfulness are part of Ragas's newer additions, covered briefly at the end.

## Building an Evaluation Dataset and Running evaluate()

Single samples are for learning; real evaluation runs over a dataset. The Ragas dataset is a dictionary (or HuggingFace \`Dataset\`) with parallel lists: \`question\`, \`answer\`, \`contexts\` (a list of strings per row), and optionally \`reference\`. You build this by running your actual RAG pipeline over a set of evaluation questions and recording what it produced.

\`\`\`python
# run_eval.py
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    Faithfulness, AnswerRelevancy,
    LLMContextPrecisionWithReference, LLMContextRecall,
)
from setup import judge_llm, judge_embeddings
from app.rag import answer_question, retrieve_context  # your pipeline

EVAL_QUESTIONS = [
    {"q": "What is the refund window for digital products?",
     "ref": "Digital product refunds are issued within 14 days."},
    {"q": "How do I rotate my API key?",
     "ref": "Rotate keys from Settings > API Keys > Rotate."},
    {"q": "Which regions support same-day payouts?",
     "ref": "Same-day payouts cover the US, UK, and Canada."},
]

rows = {"question": [], "answer": [], "contexts": [], "reference": []}
for item in EVAL_QUESTIONS:
    contexts = retrieve_context(item["q"])      # list[str]
    answer = answer_question(item["q"], contexts)
    rows["question"].append(item["q"])
    rows["answer"].append(answer)
    rows["contexts"].append(contexts)
    rows["reference"].append(item["ref"])

dataset = Dataset.from_dict(rows)

result = evaluate(
    dataset,
    metrics=[
        Faithfulness(),
        AnswerRelevancy(),
        LLMContextPrecisionWithReference(),
        LLMContextRecall(),
    ],
    llm=judge_llm,
    embeddings=judge_embeddings,
)

df = result.to_pandas()
print(df[["question", "faithfulness", "answer_relevancy",
          "context_precision", "context_recall"]])
print("\\n--- Aggregate scores ---")
print(df[["faithfulness", "answer_relevancy",
          "context_precision", "context_recall"]].mean())
\`\`\`

The results dataframe has one row per question plus a column per metric, so you can sort by \`faithfulness\` ascending to find your worst hallucinations, or filter \`answer_relevancy < 0.7\` to see off-topic answers. The aggregate means at the bottom are what you track over time and gate on.

## Thresholds and CI Gating

A dataframe nobody looks at protects nobody. To turn Ragas into a regression gate, define per-metric thresholds and fail the build when the aggregate falls below them. Add this to the script above, or run it as a pytest test.

\`\`\`python
# gate.py  (continues from run_eval.py)
import sys

THRESHOLDS = {
    "faithfulness": 0.85,        # hallucination is the worst failure -> strict
    "answer_relevancy": 0.80,
    "context_precision": 0.75,
    "context_recall": 0.80,
}

means = df[list(THRESHOLDS)].mean()
failures = []
for metric, floor in THRESHOLDS.items():
    score = float(means[metric])
    status = "PASS" if score >= floor else "FAIL"
    print(f"{metric:20s} {score:.3f}  (floor {floor})  {status}")
    if score < floor:
        failures.append((metric, score, floor))

if failures:
    print(f"\\nGATE FAILED: {len(failures)} metric(s) below threshold")
    sys.exit(1)   # non-zero exit -> CI job fails -> merge blocked
print("\\nGATE PASSED")
\`\`\`

Wire it into CI so it runs on pull requests that touch your prompts or retrieval code.

\`\`\`yaml
# .github/workflows/ragas-gate.yml
name: Ragas RAG Gate
on:
  pull_request:
    paths: ['app/rag/**', 'app/prompts/**', 'eval/**']
jobs:
  ragas:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install ragas datasets langchain-openai
      - env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: python eval/run_eval.py && python eval/gate.py
\`\`\`

Set thresholds from a baseline run, not from wishful thinking: run the eval on your current main branch, see where you actually land, and set floors slightly below that so genuine regressions trip the gate while normal noise does not. For more on gating patterns across frameworks, see the [DeepEval testing framework guide](/blog/deepeval-llm-testing-framework-guide) and the [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026).

## Pitfalls and Mitigations

Ragas is powerful but it is LLM-graded, which introduces failure modes you must manage. Here are the big ones with fixes.

| Pitfall | Why it happens | Mitigation |
|---|---|---|
| **Judge-model variance** | The judge is itself an LLM; scores wobble run to run | Set \`temperature=0\`; average over a larger dataset; pin the judge model version |
| **Cost** | Each metric calls the judge once per sample; four metrics x thousands of rows adds up | Use a cheaper judge (gpt-4o-mini); sample the dataset for PR runs, full run nightly |
| **Context formatting** | Passing one giant blob instead of a list of chunks distorts precision | Keep \`contexts\` as a real list of retrieved chunks, in retrieval rank order |
| **Hallucinated claims slip through** | Faithfulness only checks claims it extracts; sloppy decomposition can miss some | Use a strong judge for faithfulness specifically; spot-check low-confidence rows manually |
| **Reference quality** | Context Recall depends on your reference answers; weak references give misleading scores | Review references; keep them concise and factual, not stylistic |
| **Judge bias toward verbosity** | Longer answers can game relevancy | Combine with a conciseness check; inspect outliers |

The throughline: trust aggregate trends over individual scores, keep the judge deterministic and pinned, and always eyeball your lowest-scoring rows before acting on them. A single 0.6 might be judge noise; a sustained drop in the mean across a hundred rows is real.

## Agentic, SQL, and Multimodal Extensions

Ragas in 2026 is no longer RAG-only. The same reference-free philosophy now extends to:

- **Agentic workflows and tool use:** metrics that evaluate whether an agent called the right tools, in a sensible order, and whether its final response reflects the tool outputs. This is essential as RAG systems grow into multi-step agents that retrieve, call APIs, and reason.
- **SQL / text-to-SQL:** metrics for evaluating generated SQL against an execution result or a reference query, checking whether the query is semantically correct, not just string-similar.
- **Multimodal:** **Multimodal Faithfulness** extends grounding checks to answers that reference images, verifying that claims about visual content are supported, and **Noise Sensitivity** measures how easily irrelevant retrieved chunks mislead the generator. These matter as RAG pipelines ingest screenshots, diagrams, and scanned documents alongside text.

The takeaway is that the faithfulness and answer-relevancy intuitions you learned here, decompose into claims, verify against context, reverse-generate the question, generalize directly to these newer surfaces. If you can read a faithfulness score, you can read a multimodal faithfulness score.

## Frequently Asked Questions

### What is faithfulness in Ragas?
Faithfulness measures whether the claims in a generated answer are supported by the retrieved context. Ragas decomposes the answer into atomic claims, then uses a judge LLM to verify each claim against the context. The score is the fraction of claims that are grounded. A score of 1.0 means nothing was hallucinated; a lower score means the answer asserted facts your retrieved documents do not support.

### How is answer relevancy calculated in Ragas?
Answer relevancy is computed reference-free by reverse-engineering questions from the answer. The judge LLM generates several questions the answer would be a good response to, embeds them, and measures their cosine similarity to the original question. High similarity means the answer is on-topic; low similarity means it wandered. Noncommittal answers like "I don't know" are penalized. It grades responsiveness independently of factual grounding.

### What does reference-free evaluation mean in Ragas?
Reference-free means you do not need a human-written gold answer for every question. Faithfulness checks the answer against the retrieved context you already have, and answer relevancy checks it against the original question. Neither requires hand-labeled references, which is what makes Ragas practical at scale, you can evaluate thousands of questions using only the data your pipeline already produces.

### What is the difference between context precision and context recall?
Context precision measures whether the relevant chunks are ranked near the top of your retrieved results, rewarding retrievers that surface the answer-bearing document first. Context recall measures whether all the information needed to answer was actually retrieved at all. Low precision means noise above signal; low recall means missing documents. Precision is rank quality; recall is completeness of retrieval.

### How do I set thresholds for Ragas metrics in CI?
Run the evaluation on your current main branch to establish a baseline, then set each metric's floor slightly below where you actually land, so real regressions trip the gate but normal judge noise does not. Faithfulness usually gets the strictest floor (around 0.85) because hallucination is the worst failure. Have your script exit non-zero when any aggregate falls below its floor to block the merge.

### Is Ragas only for RAG, or does it support agents and SQL?
Ragas started as a RAG evaluation library but in 2026 supports agentic workflows and tool use, text-to-SQL, and multimodal inputs. It adds metrics like Multimodal Faithfulness and Noise Sensitivity. The same reference-free approach, decomposing answers into claims and verifying them, extends to these surfaces, so the faithfulness and relevancy concepts transfer directly to agents and multimodal pipelines.

### How much does it cost to run Ragas evaluation?
Cost depends on your judge model and dataset size, since each metric calls the judge once per sample. Four metrics over thousands of rows adds up. Control it by using an affordable judge like gpt-4o-mini, setting temperature to 0 for stable scores, sampling the dataset for fast pull-request runs, and running the full suite nightly. This keeps per-PR cost low while preserving thorough coverage.

## Conclusion

Faithfulness and answer relevancy are the two questions that decide whether a RAG system is trustworthy: is the answer grounded, and is it on-topic? Ragas computes both reference-free, no gold answers required, by decomposing answers into verifiable claims and reverse-generating questions, and it pairs them with context precision and recall so you can tell a generation problem from a retrieval problem. Wire these four metrics into an \`evaluate()\` run, set thresholds from a real baseline, and gate your CI on them, and you have a RAG quality system that catches regressions before users do.

Want to add Ragas evaluation to your AI coding agent without wiring it from scratch? Browse the curated, agent-ready [RAG and LLM evaluation skills](/skills) on QASkills.sh and drop a working faithfulness-and-relevancy gate into your pipeline today.
`,
};
