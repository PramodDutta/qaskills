import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "BLEU vs ROUGE vs BERTScore: LLM Metrics Reference (2026)",
  description: "BLEU vs ROUGE vs BERTScore vs semantic similarity for LLM evaluation: formulas, when to use each, code, and limits. A 2026 reference for SDETs.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# BLEU vs ROUGE vs BERTScore: LLM Metrics Reference (2026)

**BLEU, ROUGE, BERTScore, and embedding-based semantic similarity** are the four most common automatic metrics for comparing generated text against a reference. BLEU measures n-gram *precision* (how much of the candidate appears in the reference) and is the classic machine-translation metric. ROUGE measures n-gram *recall* (how much of the reference is covered) and is the standard for summarization. BERTScore compares contextual token embeddings, so it credits paraphrases that share no exact words. Embedding cosine similarity compares whole-sentence vectors for a single overall closeness score. The rule of thumb: BLEU for translation, ROUGE for summarization, BERTScore or embedding similarity when wording can legitimately vary.

This reference gives the formula, a code snippet, the right use case, and the real limits of each — plus a head-to-head table and a verdict on which to reach for in 2026.

## Quick comparison

| Metric | Measures | Best for | Catches paraphrase? | Range | Needs a reference? |
|---|---|---|---|---|---|
| BLEU | N-gram precision + brevity penalty | Machine translation | No | 0–100 (or 0–1) | Yes (1+) |
| ROUGE | N-gram recall (and F1) | Summarization | No | 0–1 | Yes |
| BERTScore | Contextual embedding token match (P/R/F1) | Paraphrase-tolerant generation | Yes | ~0–1 | Yes |
| Embedding similarity | Sentence-vector cosine | Semantic closeness, dedup, RAG relevance | Yes | -1–1 (usually 0–1) | Yes (or compare two outputs) |
| LLM-as-judge | Model-graded against a rubric | Open-ended quality, faithfulness | Yes | rubric-defined | Optional |

All four "automatic" metrics need a gold reference. When you have no reference — open-ended chat, creative writing, faithfulness to a source — none of these fully apply and you move to LLM-as-judge or rubric scoring (covered at the end).

## BLEU — n-gram precision for translation

**What it measures.** BLEU computes the precision of n-grams (typically 1- through 4-grams) in the candidate that also appear in the reference, then multiplies by a *brevity penalty* that punishes outputs shorter than the reference (otherwise a one-word output could score perfect precision).

**Formula, conceptually.** BLEU = BP × exp(Σ wₙ log pₙ), where pₙ is the *clipped* n-gram precision for order n (clipped so repeating a word does not inflate the count beyond its reference occurrences), wₙ are weights (usually uniform, 0.25 each for n=1..4), and BP is the brevity penalty (1 if the candidate is at least as long as the reference, otherwise exp(1 − reference_len/candidate_len)).

**Code.** Use sacreBLEU, the standardized implementation that fixes tokenization so scores are comparable across papers:

\`\`\`python
from sacrebleu import corpus_bleu

candidates = ["the cat sat on the mat"]
references = [["the cat is on the mat"]]  # list of reference lists

bleu = corpus_bleu(candidates, references)
print(bleu.score)  # 0–100 scale
\`\`\`

**When to use it.** Machine translation, and any task with a tight reference where exact wording matters. It is the historical standard, so reporting BLEU keeps you comparable with prior work.

**Limits.** BLEU is surface-level: "the film was great" and "the movie was excellent" score near zero against each other despite identical meaning. It correlates poorly with human judgment at the sentence level (it was designed for corpus-level scoring). It ignores recall — it will not notice that the candidate dropped half the reference's content as long as what it *did* say overlaps. And raw BLEU is tokenization-sensitive, which is exactly why sacreBLEU exists.

## ROUGE — n-gram recall for summarization

**What it measures.** ROUGE flips BLEU's emphasis to recall: how much of the *reference* is captured by the candidate. The common variants:

- **ROUGE-N** — overlap of n-grams (ROUGE-1 = unigrams, ROUGE-2 = bigrams).
- **ROUGE-L** — longest common subsequence, rewarding in-order overlap without requiring contiguity.

Most implementations report precision, recall, and F1 for each. For summarization, recall is the headline because you care whether the summary covered the source's key points.

**Formula, conceptually.** ROUGE-N recall = (count of reference n-grams that also appear in the candidate) / (total reference n-grams). ROUGE-L uses LCS length divided by reference length for recall, candidate length for precision, then combines into F1.

**Code.** The \`rouge-score\` package is the standard:

\`\`\`python
from rouge_score import rouge_scorer

scorer = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=True)
scores = scorer.score(
    "the cat is on the mat",          # reference
    "the cat sat on the mat",         # candidate
)
print(scores["rougeL"].fmeasure)
\`\`\`

**When to use it.** Summarization, headline generation, and any task where covering the reference's content matters more than precise phrasing. It is the summarization-paper standard, so it keeps you comparable.

**Limits.** Same fundamental weakness as BLEU — it is lexical. A summary that perfectly paraphrases the source can score low because it shares few exact n-grams. It rewards extractive summaries (copy-paste) over abstractive ones (genuine rewriting), which can push you toward worse summaries if you optimize ROUGE blindly. It also says nothing about factual correctness: a fluent, on-topic summary that invents a fact scores well.

## BERTScore — embeddings that forgive paraphrase

**What it measures.** BERTScore embeds every token of the candidate and reference with a pretrained transformer (originally BERT, now often a stronger encoder), then greedily matches each candidate token to its most similar reference token by cosine similarity. It aggregates these matches into precision, recall, and F1. Because it works in embedding space, "movie" and "film" are nearly identical, so paraphrases score high.

**Formula, conceptually.** For recall, each *reference* token is matched to its most-similar *candidate* token and the similarities are averaged; for precision, the direction flips; F1 combines them. An IDF weighting can down-weight common words so content words dominate.

**Code.** The \`bert-score\` package:

\`\`\`python
from bert_score import score

P, R, F1 = score(
    cands=["the movie was excellent"],
    refs=["the film was great"],
    lang="en",
)
print(F1.mean().item())  # high, despite near-zero word overlap
\`\`\`

**When to use it.** Any generation task where wording can legitimately vary — paraphrase, abstractive summarization, translation where you want to credit synonyms, or comparing model outputs that say the same thing differently. It correlates with human judgment substantially better than BLEU/ROUGE on such tasks.

**Limits.** It is far slower and heavier than BLEU/ROUGE (it runs a transformer over every pair). The absolute score is hard to interpret — values cluster in a narrow band, so you compare *relatively* rather than reading an absolute "0.92 is good." It depends on the chosen encoder and its baseline rescaling, so report which model you used. And like the others, it measures *similarity*, not *truth*: a fluent paraphrase of a wrong answer can still score high if it is topically close.

## Embedding similarity — one number for semantic closeness

**What it measures.** Encode the whole candidate and the whole reference (or two candidates) into a single sentence vector each with a model like a sentence-transformer, then take the cosine of the angle between them. One scalar in roughly [0, 1] for how close two texts are in meaning.

**Code.**

\`\`\`python
from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer("all-MiniLM-L6-v2")
a = model.encode("the movie was excellent", convert_to_tensor=True)
b = model.encode("the film was great", convert_to_tensor=True)
print(util.cos_sim(a, b).item())  # ~0.8+
\`\`\`

**When to use it.** Deduplication, semantic search and RAG relevance, clustering, and lightweight regression checks ("did the new answer drift far from the old one?"). It is cheaper than BERTScore (one vector per text instead of token-level matching) and gives a single threshold-able number.

**Limits.** Coarser than BERTScore — collapsing a sentence to one vector loses token-level detail, so it can miss that a candidate dropped a critical clause. Thresholds are dataset-dependent and must be calibrated against human labels. It rewards topical similarity, so an on-topic but factually wrong answer can score high — never use it alone to verify correctness.

## When none of these fit: LLM-as-judge

All four metrics above need a reference and measure *surface or semantic similarity to that reference*. For open-ended outputs with no single correct answer — a chatbot reply, a creative draft, an explanation graded for faithfulness to a source — you move to **LLM-as-judge**: prompt a strong model with the input, the candidate, and explicit criteria, and ask for a rubric score. It handles nuance no n-gram or embedding metric can, but it costs tokens, can be inconsistent run-to-run, and carries position and verbosity bias. For choosing between these approaches on a real task, see our [comparison guides](/compare), and browse ready-made eval setups in the [skills directory](/skills).

## Verdict: which metric in 2026

- **Machine translation** → sacreBLEU (for comparability), with COMET or BERTScore alongside for a meaning-aware second opinion.
- **Summarization** → ROUGE-1/2/L (the field standard), plus BERTScore to credit good abstractive summaries ROUGE unfairly penalizes.
- **Paraphrase-tolerant generation** → BERTScore F1, or embedding cosine when you need it cheap and fast.
- **Semantic search / RAG / dedup** → embedding cosine similarity, calibrated to your data.
- **Open-ended quality or faithfulness** → LLM-as-judge with a tight rubric; no automatic similarity metric measures correctness.

The honest takeaway: BLEU and ROUGE are fast, cheap, reproducible, and comparable to prior work, but they are lexical and miss paraphrase. BERTScore and embedding similarity fix paraphrase at higher cost and lower interpretability. None of them measure truth — for that you need a reference you trust or a judge. Use the cheapest metric that captures what you care about, and never optimize a surface metric so hard that you degrade the actual output. Pairing a fast lexical metric with one meaning-aware metric is the pragmatic default in 2026.

## Frequently Asked Questions

### What is the difference between BLEU and ROUGE?
BLEU measures n-gram precision — how much of the generated text appears in the reference — and adds a brevity penalty, making it the standard for machine translation. ROUGE measures n-gram recall — how much of the reference is covered by the generated text — which is why it is the standard for summarization. Both are lexical, so neither credits paraphrases that share meaning but not exact words.

### Is BERTScore better than BLEU and ROUGE?
For tasks where wording can legitimately vary, yes — BERTScore compares contextual embeddings, so it credits synonyms and paraphrases that BLEU and ROUGE score near zero, and it correlates better with human judgment on those tasks. The trade-offs are that it is much slower (it runs a transformer over every pair), its absolute scores are hard to interpret, and it still measures similarity rather than factual truth.

### Which metric should I use for summarization?
ROUGE is the field standard for summarization, specifically ROUGE-1, ROUGE-2, and ROUGE-L recall, because they measure how much of the source's key content the summary captured. Pair it with BERTScore, because ROUGE unfairly penalizes good abstractive summaries that paraphrase well, and neither metric checks factual accuracy — for that you need a faithfulness judge.

### Can these metrics detect hallucinations or factual errors?
No. BLEU, ROUGE, BERTScore, and embedding similarity all measure closeness to a reference, not truth. A fluent, on-topic answer that invents a fact can score well on every one of them because it is lexically or semantically similar to the reference. Detecting hallucinations requires a faithfulness check against a source, typically an LLM-as-judge or a dedicated factuality evaluator.

### When should I use embedding similarity instead of BERTScore?
Use sentence-embedding cosine similarity when you need a single, cheap, threshold-able number for semantic closeness — deduplication, semantic search, RAG relevance, or a quick regression check on output drift. BERTScore is the better choice when you need token-level precision and recall, since collapsing a whole sentence into one vector can miss a dropped clause that token-level matching would catch.

### Do I always need a reference answer to compute these metrics?
Yes for BLEU, ROUGE, BERTScore, and reference-based embedding similarity — all four compare a candidate against a gold reference. When you have no reference, such as open-ended chat or creative writing, none of them apply directly and you switch to LLM-as-judge or rubric scoring, which grade quality against criteria rather than against a single correct answer.
`,
};
