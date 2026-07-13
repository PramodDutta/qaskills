import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Multilingual RAG Retrieval Quality',
  description:
    'Test multilingual RAG retrieval quality with language-pair recall, ranking, grounding, translation variants, and production-focused failure analysis.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing Multilingual RAG Retrieval Quality

The Spanish query asks how to rotate an API key, while the only authoritative procedure is an English runbook. A fluent Spanish answer is worthless if retrieval surfaced an old Portuguese forum post instead. Multilingual RAG testing therefore begins before generation: which evidence was found, in what language, at what rank, and with what authority?

A single aggregate retrieval score conceals the failures users actually experience. Build slices for query language, document language, cross-language direction, script, locale, and domain terminology. Then evaluate answer grounding against the retrieved evidence without confusing polished translation with factual support.

## Treat language direction as part of the test case

"Multilingual" is not one capability. English query to German document may behave differently from German query to English document. Closely related languages can create false friends. Languages sharing a script can compete lexically, while transliterated queries introduce another representation entirely.

Represent every case with at least these fields:

| Field | Example | Why it matters |
| --- | --- | --- |
| Query locale | \'es-MX\' | Vocabulary and regional usage differ |
| Query text | "¿Cómo giro una clave de API?" | Exact user phrasing is the input |
| Relevant document IDs | \'runbook-key-rotation-v4\' | Retrieval needs explicit judgments |
| Document languages | \'en\' | Defines cross-language direction |
| Relevance grade | 3 for current runbook, 1 for overview | Ranking metrics can reward graded evidence |
| Must-not-retrieve IDs | Revoked v2 procedure | Detects dangerous obsolete evidence |
| Terminology tags | security, credential, rotate | Supports domain-level slicing |

Locale belongs beside language. Brazilian and European Portuguese share a language code but may use different product terms. Chinese scripts, Serbian scripts, and transliterated Arabic or Hindi deserve explicit representation if real users produce them. Do not manufacture equal coverage for languages the product does not support; publish the supported matrix and test it deeply.

Queries should come from sanitized search logs, support tickets, native-speaking subject matter experts, and deliberate adversarial variations. Machine translation can expand a seed set, but it cannot be the sole source because translated text often looks cleaner than user language and mirrors the translator's preferred terminology.

## Build judgments around evidence, not translated wording

For each query, identify every document passage that would support a correct answer. A single canonical relevant ID makes recall easy to calculate but can penalize an equally authoritative equivalent passage. Use graded judgments where multiple sources differ in completeness.

Judges need the document version and effective date. Multilingual corpora often contain lagging translations. A French policy from last year may be linguistically perfect but operationally obsolete. Mark authority and freshness in relevance judgments rather than assuming any topical match is acceptable.

Create negative sets with intent:

- Same keywords, wrong product edition.
- Correct procedure, wrong jurisdiction.
- Superseded translation still indexed.
- Forum discussion that quotes only half the rule.
- A document about creating rather than rotating a key.
- Cross-lingual false friends that produce lexical similarity.

The evaluation unit should match the retriever unit. If production indexes 500-token chunks, judgments should point to chunk IDs or map documents to acceptable chunks. Document-level relevance can hide a chunker that splits the critical warning from the procedure.

The [RAG retrieval testing best practices](/blog/rag-retrieval-testing-best-practices-2026) provide additional guidance on corpus construction, hard negatives, chunking, and evaluation leakage.

## Run a reproducible cross-language retrieval harness

This Python example uses the real Sentence Transformers API with a multilingual model, normalized embeddings, and dot product, which equals cosine similarity for normalized vectors. The tiny corpus is an executable smoke test, not a benchmark. A production evaluation should load versioned judgments and the same chunks used by the service.

\`\`\`python
from dataclasses import dataclass
from sentence_transformers import SentenceTransformer
import numpy as np


@dataclass(frozen=True)
class Passage:
    id: str
    language: str
    text: str


corpus = [
    Passage(
        "key-rotation-en",
        "en",
        "To rotate an API key, create the replacement, update clients, verify traffic, then revoke the old key.",
    ),
    Passage(
        "password-reset-es",
        "es",
        "Para restablecer una contraseña, solicita un enlace temporal desde la pantalla de acceso.",
    ),
    Passage(
        "key-creation-de",
        "de",
        "Ein neuer API-Schlüssel kann im Bereich Anmeldedaten erstellt werden.",
    ),
]

queries = [
    {
        "id": "es-to-en-rotation",
        "language": "es",
        "text": "¿Cuál es el orden seguro para rotar una clave de API?",
        "relevant": {"key-rotation-en"},
    },
    {
        "id": "de-to-en-rotation",
        "language": "de",
        "text": "Wie rotiere ich einen API-Schlüssel ohne Ausfall?",
        "relevant": {"key-rotation-en"},
    },
]

model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
document_vectors = model.encode(
    [passage.text for passage in corpus],
    normalize_embeddings=True,
    convert_to_numpy=True,
)


def retrieve(text: str, k: int = 2) -> list[tuple[str, float]]:
    query_vector = model.encode(
        [text], normalize_embeddings=True, convert_to_numpy=True
    )[0]
    scores = document_vectors @ query_vector
    order = np.argsort(-scores)[:k]
    return [(corpus[index].id, float(scores[index])) for index in order]


for query in queries:
    ranked = retrieve(query["text"], k=2)
    retrieved_ids = {doc_id for doc_id, _ in ranked}
    assert query["relevant"] & retrieved_ids, (query["id"], ranked)
    print(query["id"], ranked)
\`\`\`

Pin the model revision and package versions in a real harness. Model names can resolve to updated repository contents unless a revision is fixed through the model distribution workflow. Record embedding dimension, normalization choice, chunker version, and corpus snapshot with every run.

Do not adopt the example's top-2 threshold as a universal target. Select K from the number of passages sent to generation and the latency/token budget. Recall at 20 can look impressive while the generator receives only the top 5.

## Calculate metrics per language pair

Recall@K answers whether at least one or all judged relevant items appeared, depending on the chosen definition. MRR emphasizes the rank of the first relevant passage. NDCG supports graded relevance and discounts lower ranks. Report the formula used because "recall" is sometimes implemented as hit rate.

For operational triage, keep raw ranked IDs and scores. A metric drop tells you there is a regression; the ranking shows whether the cause is a mistranslated query, a dominant language bias, a duplicated chunk, or a narrow score margin.

The next runnable function groups hit rate and reciprocal rank by query-to-document language direction. It accepts results from any retriever, so the production service can replace the local model.

\`\`\`python
from collections import defaultdict
from statistics import mean


def score_cases(cases, ranked_by_query, language_by_document, k=5):
    slices = defaultdict(lambda: {"hits": [], "rr": []})

    for case in cases:
        ranked = ranked_by_query[case["id"]][:k]
        relevant = set(case["relevant"])
        relevant_languages = sorted(
            {language_by_document[doc_id] for doc_id in relevant}
        )
        direction = f"{case['language']}->{'+' .join(relevant_languages)}"

        ranks = [
            rank
            for rank, doc_id in enumerate(ranked, start=1)
            if doc_id in relevant
        ]
        slices[direction]["hits"].append(1.0 if ranks else 0.0)
        slices[direction]["rr"].append(1.0 / min(ranks) if ranks else 0.0)

    return {
        direction: {
            "cases": len(values["hits"]),
            "hit_rate_at_k": mean(values["hits"]),
            "mrr_at_k": mean(values["rr"]),
        }
        for direction, values in sorted(slices.items())
    }


language_by_document = {passage.id: passage.language for passage in corpus}
ranked_by_query = {
    query["id"]: [doc_id for doc_id, _ in retrieve(query["text"], k=3)]
    for query in queries
}
report = score_cases(queries, ranked_by_query, language_by_document, k=2)
assert all(row["cases"] > 0 for row in report.values())
print(report)
\`\`\`

The expression constructing \'direction\' is ordinary Python and can be simplified in a production codebase for readability. More importantly, report sample counts. A perfect score on two queries is not comparable to a score on two hundred. Use confidence intervals or paired resampling when deciding whether a candidate changed quality, especially for small language slices.

## Compare retrieval architectures, not just models

Multilingual quality can be achieved through several pipelines. Evaluate the complete path that production will run.

| Architecture | Retrieval path | Strength | Failure to target |
| --- | --- | --- | --- |
| Multilingual dense | Query and documents embedded in shared vector space | Direct cross-language semantic matching | Dominant-language bias and opaque score calibration |
| Query translation | Translate query into corpus language, then retrieve | Reuses a strong monolingual index | Translation drops product terms or named entities |
| Per-language lexical | Detect language and search an analyzer-specific index | Precise exact terminology within a language | Cannot reach documents in another language directly |
| Hybrid dense plus lexical | Fuse semantic and token rankings | Handles concepts plus exact identifiers | Fusion weights favor languages with higher score scales |
| Parallel translated corpus | Index original and translated document variants | Broadens lexical reach | Duplicate results and stale translations |

Language detection is itself a dependency. Short queries such as product names, error codes, or "no funciona" can be ambiguous. Test detection confidence and fallback behavior. A wrong detector route can make an excellent retriever appear broken.

Translation pipelines need preservation checks for code, CLI flags, identifiers, URLs, and negation. "Do not revoke the old key before traffic moves" is unsafe if negation disappears. Store the translated query used for retrieval in evaluation artifacts so reviewers can separate translation defects from ranking defects.

Hybrid fusion requires per-language analysis. Dense and BM25-like scores are not directly comparable, and score distributions may vary across scripts. Rank-based fusion can reduce scale problems but still needs tests for duplicates and tie handling.

## Include mixed-language and transliterated user behavior

Real queries switch languages mid-sentence: "factura export kaise karein", "erreur timeout en checkout", or a local-language sentence containing an English product feature. A benchmark of professionally translated monolingual sentences misses this traffic.

Create paired variants of the same intent:

- Native script with localized product terminology.
- Native grammar with English technical nouns.
- Romanized or transliterated form.
- Misspellings produced by mobile keyboards.
- Copied error text plus a question in another language.
- Locale-specific synonyms used by support teams.

Pairs enable consistency checks. They need not produce identical rankings, but the same authoritative evidence should remain reachable. If the English variant finds a runbook at rank 1 and the code-switched variant misses it entirely, the gap is actionable even when aggregate metrics stay flat.

Do not use automatic transliteration as the gold reference without native review. Multiple transliterations can be legitimate, and pronunciation-driven spellings vary. Collect actual forms when possible.

## Evaluate chunking separately for each script

Token budgets do not map evenly to characters or words across languages. A fixed character chunk can split Thai text poorly, separate combining marks, or produce substantially different semantic density across scripts. A tokenizer associated with the embedding model may also truncate some languages sooner.

Record pre-tokenization character length, model token count, truncation, and chunk boundaries. Add cases where the answer-bearing sentence falls just before and just after a boundary. Compare retrieval for the full source, production chunks, and a boundary-adjusted variant. If full-source embedding succeeds while production chunks fail, replacing the embedding model alone is unlikely to solve the issue.

Translated document pairs should not be forced into identical chunk offsets. Sentence and paragraph structure changes during translation. Preserve stable source relationships through metadata, not positional assumptions. When retrieval returns a translated chunk, citations should resolve to the appropriate user-visible source without claiming that two passages are character-aligned.

## Separate retrieval relevance from answer grounding

A multilingual generator can answer from prior knowledge even when retrieval is wrong. Conversely, correct evidence may be retrieved but the model can mistranslate a number or omit a warning. Score the stages separately.

| Layer | Primary question | Useful evidence |
| --- | --- | --- |
| Retrieval | Did the correct passage reach top K? | Ranked IDs, relevance grades, scores |
| Context assembly | Was evidence retained and ordered in the prompt? | Final context IDs and token truncation |
| Grounding | Are claims supported by supplied passages? | Claim-to-citation judgments |
| Language quality | Is the answer natural for the requested locale? | Native reviewer rubric |
| Safety and policy | Did warnings, scope, and prohibitions survive? | Critical-fact checklist |

For the full metric landscape, consult the [RAG evaluation metrics guide](/blog/rag-evaluation-metrics-complete-2026). Do not collapse grounding, fluency, and retrieval into a single model-judge score. A high composite can conceal a zero on a critical safety fact.

Build answer checks around atomic claims. For the key-rotation example: create replacement first, update clients, verify traffic, then revoke old key. Each claim should cite an authoritative retrieved passage. A native reviewer should assess whether sequence and negation remain correct in the answer language.

LLM judges can scale review, but calibrate them against bilingual humans and preserve prompts, model versions, and raw judgments. Judge language proficiency varies, and a judge may reward fluent unsupported content.

## Set gates that respect low-volume languages

A global mean weights high-volume slices heavily. Use a portfolio of gates: an overall paired comparison, minimum floors for supported languages with enough cases, and zero-tolerance checks for critical dangerous negatives.

For small slices, avoid reacting to one query as if it were a stable percentage. Review the case, expand the set, and use paired analysis because baseline and candidate evaluate the same queries. Report wins, losses, ties, and severe regressions. A candidate that improves common English queries while removing the only relevant result for a supported minority language should not pass unnoticed.

Production monitoring can track no-click reformulations, language-specific abandonment, citation opening, and retrieval score distributions, but these are behavioral signals, not automatic relevance labels. Privacy review is essential because queries may contain personal or confidential information.

Keep a fixed release set for comparability and a rotating discovery set to resist overfitting. New support incidents should become regression cases only after relevance labels and data handling are reviewed.

## Diagnose a failing language slice

When \'ar->en\' recall falls, inspect cases in a consistent order:

1. Verify query language and script metadata.
2. Inspect normalization, Unicode handling, and accidental lowercasing rules.
3. Check model token count and truncation.
4. Compare full document with indexed chunk.
5. Review nearest irrelevant passages for lexical or language dominance.
6. Compare score margins, not only rank.
7. Run translated-query and lexical baselines to localize the weakness.
8. Confirm the relevant passage was present in the evaluated corpus snapshot.

This prevents model replacement from becoming the default answer to ingestion defects. Missing translations, wrong access filters, stale aliases, and duplicate chunks often look like embedding failures from the outside.

## Protect access filters across languages

Language fallback must never broaden authorization. If a Spanish query searches an English fallback index, tenant, role, region, embargo, and document-state filters must remain identical. Build paired queries for an allowed and denied principal in every retrieval route, then assert denied chunk IDs never enter the candidate set, reranker, prompt, citations, or debug payload.

Translated copies need the same access metadata as their source and a revocation path that removes every language variant. Test a source document whose permission changes after translations were indexed. A stale translated clone is a security defect, not merely an indexing delay.

Also inspect language-aware caching. Cache keys must include authorization scope, corpus version, locale-sensitive pipeline choices, and query representation where required. A cached English fallback result from one tenant must not be served for a similar query in another tenant.

## Review named entities and numbers as lossless tokens

Product names, regulation codes, error identifiers, dates, decimal separators, and units often carry more retrieval value than surrounding grammar. Build cases where translation should preserve them exactly and where localized formatting is intentional. A query containing \'ERR-4297\' should still find the passage that names that code even if the rest of the query is Japanese.

Inspect Unicode normalization for visually similar characters and composed forms. Security-sensitive identifiers should use an explicit canonicalization policy rather than fuzzy language matching. Pair semantic retrieval with a lexical branch for exact codes, then verify fusion does not demote the exact hit behind merely topical passages.

## Frequently Asked Questions

### Must every query retrieve a document in the same language?

No. The authoritative evidence may exist only in another language. Test same-language and cross-language directions separately, then ensure generation communicates the source faithfully.

### Can machine-translated queries serve as the evaluation set?

They are useful variants, not sufficient ground truth. Add native-written, code-switched, misspelled, and transliterated queries from supported user populations.

### Which K should multilingual recall use?

Use the number of passages the generator actually receives or a clearly justified retrieval stage cutoff. Report multiple K values for diagnosis, but gate the operational cutoff.

### How do we test a language with very few judged queries?

Publish the small sample count, use paired case review, prioritize critical intents, and expand judgments with native experts. Avoid presenting a volatile percentage as a stable population estimate.

### Does a multilingual embedding model remove the need for language detection?

Not always. Detection may still control analyzers, translation, locale filters, or answer language. Test ambiguous short queries and define a fallback rather than assuming detection is perfect.
`,
};
