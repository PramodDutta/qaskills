import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing RAG Faithfulness with Ragas',
  description:
    'Test RAG faithfulness with the current Ragas API, calibrate groundedness thresholds, diagnose unsupported claims, and build reliable evaluation gates.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing RAG Faithfulness with Ragas

The retriever returns a policy saying refunds are allowed within 30 days. The generated answer says 45 days and adds that return shipping is free. Its wording is excellent, its topic is relevant, and both claims are unsupported. Faithfulness testing asks whether the answer's claims can be inferred from the retrieved context, not whether the prose sounds plausible.

Ragas operationalizes that question with a judge model. Its faithfulness metric decomposes a response into claims, checks each against retrieved contexts, and reports the supported fraction from 0 to 1. That number is useful only when the dataset, evaluator, threshold, and failure inspection are treated as test engineering decisions.

## Define the unit being judged

A faithfulness sample needs \`user_input\`, \`response\`, and \`retrieved_contexts\`. The response is the RAG system's generated answer. Retrieved contexts are the exact chunks supplied to generation, after filtering and reranking, not every document in the corpus. Supplying a broader knowledge base lets the judge support claims the model never saw.

| Field | Correct source | Frequent contamination |
|---|---|---|
| \`user_input\` | Actual user question | Rewritten search query only |
| \`response\` | Final answer shown to user | Draft before post-processing |
| \`retrieved_contexts\` | Chunks passed into the generator | Entire source document or corpus |
| Metadata | Trace ID, corpus version, model settings | Sensitive user content in unrestricted logs |

Faithfulness is reference-free in the sense that it does not require a gold answer. It is not context-free. If retrieval omitted the correct return period, a cautious “the context does not specify the period” can be faithful, while a factually correct 30-day answer sourced from the model's memory is unfaithful to that RAG execution.

## Score one sample with the current collections API

Current Ragas documentation recommends the collections-based metric API. Create an async model client, adapt it with \`llm_factory\`, construct \`Faithfulness\`, then call \`ascore\`.

\`\`\`python
import asyncio
import os

from openai import AsyncOpenAI
from ragas.llms import llm_factory
from ragas.metrics.collections import Faithfulness


async def main() -> None:
    client = AsyncOpenAI(api_key=os.environ['OPENAI_API_KEY'])
    evaluator_llm = llm_factory('gpt-4o-mini', client=client)
    scorer = Faithfulness(llm=evaluator_llm)

    result = await scorer.ascore(
        user_input='How long do I have to return an unopened router?',
        response='You can return an unopened router within 30 days of delivery.',
        retrieved_contexts=[
            'Unopened networking equipment may be returned within 30 calendar days '
            'of confirmed delivery when accompanied by the original receipt.'
        ],
    )

    print(f'faithfulness={result.value:.3f}')


if __name__ == '__main__':
    asyncio.run(main())
\`\`\`

This uses the documented \`ragas.metrics.collections.Faithfulness\` class and \`ascore\` arguments. Ragas also provides synchronous \`score()\`. The older \`SingleTurnSample\` with \`single_turn_ascore\` appears in legacy documentation, but new suites should not begin on an API scheduled for removal.

## Read the score as claim coverage

Conceptually, Ragas calculates supported claims divided by total claims. A response with four extracted claims and three supported claims receives 0.75. The judge performs both claim decomposition and entailment, so the result depends on evaluator behavior as well as the text.

| Response pattern | Likely faithfulness effect | What it does not tell you |
|---|---|---|
| Every claim directly supported | High | Whether answer addresses the question |
| One unsupported detail among several facts | Partial score | Business severity of that detail |
| Correct refusal due to missing context | Potentially high | Whether retrieval should have found evidence |
| Vague answer with few claims | Can score high | Usefulness or completeness |
| Citation points to wrong chunk | Depends on claim support in supplied contexts | Citation placement quality |

Do not market a faithfulness score as “accuracy.” A response can faithfully repeat an incorrect source. It can also be faithful but irrelevant. Pair it with retrieval, relevance, and task-quality measures described in the [complete Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide).

## Build cases that expose hallucination modes

Random production questions are valuable for monitoring, but a release gate needs curated cases with known risk. Include unsupported numeric details, combinations across chunks, contradictions, empty retrieval, distractor chunks, and instructions embedded in documents.

\`\`\`python
from dataclasses import dataclass


@dataclass(frozen=True)
class FaithfulnessCase:
    case_id: str
    question: str
    response: str
    contexts: list[str]
    minimum: float


CASES = [
    FaithfulnessCase(
        case_id='supported-return-window',
        question='When can an unopened router be returned?',
        response='An unopened router can be returned within 30 calendar days.',
        contexts=['Unopened routers are returnable within 30 calendar days.'],
        minimum=0.9,
    ),
    FaithfulnessCase(
        case_id='unsupported-shipping-claim',
        question='When can an unopened router be returned?',
        response='It can be returned within 30 days, and return shipping is free.',
        contexts=['Unopened routers are returnable within 30 calendar days.'],
        minimum=0.9,
    ),
]
\`\`\`

The second case is expected to fall below a strict threshold because the shipping claim lacks support. In a true regression suite, do not hand author the system response indefinitely. Run the actual RAG pipeline for candidate configurations, persist the exact contexts and answer, then evaluate them. Static cases are useful to validate evaluator configuration and demonstrate sensitivity.

## Calibrate thresholds against reviewed judgments

There is no universal production threshold. Claim granularity, evaluator model, prompt language, domain, answer length, and context formatting all influence scores. Begin with a labeled calibration set reviewed by domain experts. For each response, record whether every material claim is supported and which unsupported claims are high severity.

Evaluate candidate thresholds by false acceptance and false rejection. In a medical or financial assistant, one unsupported dosage or amount can be unacceptable even if nine minor claims are supported, producing a numeric score of 0.9. Add hard-case review or claim-level severity rather than trusting an average.

| Gate style | Advantage | Risk |
|---|---|---|
| Per-case minimum | Protects critical scenarios | Judge variance can block on borderline items |
| Dataset mean | Tracks broad regression | Severe failure can be averaged away |
| Percentile target | Exposes tail quality | Needs enough stable samples |
| Zero critical unsupported claims | Aligns with business harm | Requires claim review or specialized classifier |
| Relative comparison to baseline | Useful during model change | Both versions may be below acceptable quality |

Store thresholds with a rationale, dataset version, evaluator model, and calibration date. Changing the judge invalidates direct historical comparison until the calibration set is rescored.

## Run a batch gate without hiding individual failures

Keep case-level results even when CI ultimately uses an aggregate rule. The following runner calls the documented scorer for each case and fails if any score is below its case threshold.

\`\`\`python
import asyncio
from collections.abc import Sequence

from ragas.metrics.collections import Faithfulness


async def evaluate_cases(
    scorer: Faithfulness,
    cases: Sequence[FaithfulnessCase],
) -> list[tuple[FaithfulnessCase, float]]:
    results: list[tuple[FaithfulnessCase, float]] = []
    for case in cases:
        score = await scorer.ascore(
            user_input=case.question,
            response=case.response,
            retrieved_contexts=case.contexts,
        )
        results.append((case, float(score.value)))
    return results


def assert_thresholds(
    results: list[tuple[FaithfulnessCase, float]],
) -> None:
    failures = [
        f'{case.case_id}: {value:.3f} < {case.minimum:.3f}'
        for case, value in results
        if value < case.minimum
    ]
    if failures:
        raise AssertionError('Faithfulness gate failed:\\n' + '\\n'.join(failures))
\`\`\`

Sequential scoring is easiest to reason about. For a large suite, use bounded concurrency that respects evaluator rate limits. Do not launch an unbounded \`gather\` over thousands of samples. Capture retry counts and API failures separately from low faithfulness so infrastructure outages are not reported as model regressions.

## Preserve traces needed for diagnosis

A score alone cannot tell the RAG team what to fix. Persist a controlled evaluation record containing case ID, user input, generated response, ordered context chunks, document identifiers, retriever and reranker versions, generator configuration, evaluator version, numeric result, and timestamp.

When a case drops, inspect it in this order:

1. Were the recorded contexts exactly those sent to generation?
2. Did retrieval include evidence needed for the user question?
3. Did the answer add a claim absent from all chunks?
4. Did chunk truncation remove a qualifier or exception?
5. Did the evaluator split or interpret claims unexpectedly?
6. Is the threshold near the judge's normal repeatability range?

This separates retrieval defects from generation defects. If context lacks the answer, improve indexing, query transformation, or fallback behavior. If context contains it but generation invents details, adjust prompting, context formatting, decoding, or model. If a clearly supported statement is marked unsupported, examine judge configuration before changing the product.

## Control evaluator variance and cost

LLM judges are probabilistic services. Keep evaluator model and prompts pinned where the Ragas API permits, use conservative generation settings through the model adapter, and measure repeatability on calibration cases. A score that flips around the release threshold needs a guard band or human review, not blind retries until green.

Cache only when the complete evaluation input and evaluator configuration match. Include response, ordered contexts, metric version, prompt version, and judge model in the cache key. Reusing a score after context ordering or evaluator changes corrupts comparisons.

Cost scales with samples, answer length, context volume, and multiple judge calls. Use a small critical gate on every change and a broader scheduled evaluation for coverage. Sample production traces only with privacy controls and retention rules. Contexts may contain proprietary or personal data, and sending them to an external evaluator is a data-processing decision.

## Compare faithfulness with adjacent evaluators

Groundedness terminology differs across frameworks. The engineering question is consistent: can the answer be supported by supplied evidence? Compare implementation behavior, judge support, tracing, and integration rather than assuming identically named metrics are interchangeable.

| Option | Focus | Practical distinction |
|---|---|---|
| Ragas Faithfulness | Claims supported by retrieved context | Open-source evaluation workflow with RAG-specific metrics |
| TruLens groundedness | Statement support against context | Often used within the RAG triad and app instrumentation |
| DeepEval FaithfulnessMetric | Answer consistency with retrieval context | Test-framework style assertions and metric threshold |
| Custom claim checker | Domain-specific support rules | More control, substantial calibration work |
| Human annotation | Expert judgment on material support | Highest context sensitivity, slow and costly |

For a focused comparison of the related framework concepts, read [TruLens RAG triad groundedness and context relevance](/blog/trulens-rag-triad-groundedness-context-relevance-2026).

## Add adversarial and abstention coverage

Faithfulness suites should reward appropriate abstention. When retrieval is empty or contradictory, the answer should state the limitation instead of filling the gap from model memory. Create cases where a relevant-looking distractor includes a different product, country, or policy date.

Prompt injection inside retrieved documents is another groundedness risk. A chunk may tell the model to ignore previous instructions and invent a discount. The content is “in context,” but following its instruction is not the same as answering from factual evidence. Combine faithfulness evaluation with security tests that distinguish document data from executable instructions.

Multilingual cases require calibration in each supported language. Translation can alter claim boundaries, dates, negation, and evaluator performance. Do not infer quality for one locale from an English-only dataset.

## Treat the gate as evidence, not an oracle

Run deterministic checks before the judge: empty response, missing contexts, citation format, forbidden disclosures, and schema validity. Then use Ragas for semantic support that string assertions cannot capture. Route borderline or high-risk failures to review with the full trace.

A mature release decision might require all critical cases above their individual threshold, no significant decline in a larger benchmark, and no evaluator infrastructure errors. Keep factual correctness and answer relevance separate. That makes the failure actionable instead of producing one composite score nobody can diagnose.

## Evaluate long answers without rewarding verbosity

Long responses produce more candidate claims and more opportunities for unsupported detail. That is appropriate, but score comparisons can become confounded when one model answers in one sentence and another writes five paragraphs. Include answer length, extracted-claim behavior where available, and product style requirements in analysis.

Do not instruct the generator to become vague solely to improve faithfulness. A one-line answer that omits required exceptions can score well because its only claim is supported. Pair the metric with completeness or answer-relevance evaluation and explicit critical-fact checks. For regulated content, assert required disclaimers or escalation language deterministically.

Chunk boundaries also affect apparent support. A qualifier in the next chunk may reverse a rule. Preserve chunk order and document separators given to the generator. If the generation prompt concatenates title, body, and metadata, pass the same usable text to evaluation rather than an abbreviated body.

## Test citations as a separate contract

An answer may be globally faithful while attaching a citation to the wrong sentence. Faithfulness across all retrieved contexts does not prove that citation marker 2 supports the adjacent claim. Build a separate citation test that maps claims to referenced chunk IDs and checks entailment against only those cited chunks.

Check citation validity deterministically first: every marker resolves, no hidden chunk is cited, and URLs or document IDs follow the output schema. Then use semantic judging for citation correctness. This distinction gives better diagnoses than lowering the overall faithfulness score when the prose is supported but attribution is misplaced.

When the application exposes quoted passages, verify the quote as normalized text against its cited source. Do not ask an LLM judge to decide exact quotation when a string or token comparison can do so more reliably.

## Version the evaluation dataset

An evaluation case is a controlled artifact. Give it a stable ID, risk category, owner, language, expected behavior, and source policy version. Review corpus-dependent cases when documents change. A once-correct answer can become unfaithful after a policy update even if the RAG code is unchanged.

Keep a small sentinel set with deliberately supported and unsupported answers. Run it when changing Ragas, the evaluator adapter, or judge model. If the evaluator cannot distinguish those sentinels, stop before interpreting product scores.

Do not edit failing benchmark answers until they pass. Preserve the old dataset version, explain whether the product specification or test was wrong, and publish a new version. Otherwise historical improvements may be dataset drift.

## Design a human-review loop for disagreements

Route low scores and a sample of high scores to reviewers with context, answer, and judge rationale if available. Reviewers should label each material claim as supported, unsupported, contradicted, or not verifiable. Capture domain severity separately from evaluator agreement.

Use disagreements to improve the dataset and calibrate the judge, not to override every inconvenient failure. A reviewer may discover missing context logging, ambiguous policies, or claim splitting that treats a compound sentence inconsistently. Keep adjudication instructions concise and test inter-reviewer agreement on a subset.

Once the judge is calibrated, monitor drift through the sentinel set and reviewed production samples. An evaluation system is itself software with dependencies, prompts, and failure modes. Give it ownership, change review, and incident diagnostics.

## Frequently Asked Questions

### Does a faithfulness score of 1 mean the answer is factually correct?

No. It means the evaluator found the response's claims supportable from the supplied contexts. If a source document is wrong, a perfectly grounded answer can repeat that error. Use source-quality controls and factual evaluation where the domain requires them.

### Should retrieved_contexts include the full source documents?

Use the exact chunks made available to the generator. Adding unseen document text gives the evaluator evidence the RAG model did not have and inflates the apparent faithfulness of that execution.

### What threshold should block a RAG release?

Calibrate one using reviewed examples from your domain and model configuration. Protect critical cases individually and inspect false acceptance, not only the mean. Recalibrate when the evaluator model, metric prompts, language, or answer style changes.

### Why can the same sample receive slightly different scores?

Claim extraction and entailment are judged by an LLM, so some variance is possible. Pin configuration, measure repeatability, keep borderline scores out of a brittle hard boundary, and investigate persistent disagreement with human labels.

### Can Ragas tell whether retrieval or generation caused the failure?

The metric identifies unsupported answer content, but diagnosis requires the trace. If required evidence was absent, retrieval or corpus coverage is implicated. If evidence was present and the answer contradicted or embellished it, generation behavior is the stronger suspect.
`,
};
