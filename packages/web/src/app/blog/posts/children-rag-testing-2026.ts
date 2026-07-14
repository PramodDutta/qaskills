import type { SeoClusterArticle } from './seo-cluster-article';

export const ragTestingChildren2026: SeoClusterArticle[] = [
  {
    slug: 'rag-retrieval-vs-generation-failure-diagnosis-2026',
    clusterId: 'rag-testing',
    post: {
      title: 'How to Tell Whether a RAG Failure Comes from Retrieval or Generation',
      description:
        'Localize RAG defects with controlled context substitutions, claim evidence, retrieval labels, and release checks that separate retrieval from generation.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/rag-testing.png',
      imageAlt:
        'Diagnostic split showing retrieved evidence and generated claims in a controlled RAG evaluation workflow',
      primaryKeyword: 'rag retrieval vs generation failure',
      keywords: [
        'rag retrieval vs generation failure',
        'rag failure diagnosis',
        'retrieval augmented generation testing',
        'rag controlled substitution test',
        'rag retrieval debugging',
        'rag generation debugging',
        'rag evidence trace',
        'rag evaluation workflow',
      ],
      contentKind: 'child',
      pillarSlug: 'rag-evaluation-metrics-complete-2026',
      relatedSlugs: [
        'rag-evaluation-metrics-complete-2026',
        'rag-context-precision-recall-guide-2026',
        'rag-high-relevance-low-faithfulness-diagnosis-2026',
        'rag-synthetic-testset-generation-ragas-guide-2026',
      ],
      sources: [
        'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/',
        'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/',
        'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/',
        'https://www.promptfoo.dev/docs/guides/evaluate-rag/',
        'https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/',
      ],
      content: `A RAG retrieval vs generation failure cannot be localized from a bad final answer alone. The answer is downstream evidence: it may be wrong because the retriever omitted the governing passage, ranked noise above it, applied the wrong metadata filter, or supplied correct evidence that the generator ignored, distorted, or supplemented from unsupported memory. A reliable diagnosis changes one stage at a time, preserves every input and version, and compares the resulting claims against the same evidence contract.

Start with the [complete RAG evaluation metrics guide](/blog/rag-evaluation-metrics-complete-2026), then use the companion guides on [context precision, recall, and relevancy](/blog/rag-context-precision-recall-guide-2026), [high relevance with low faithfulness](/blog/rag-high-relevance-low-faithfulness-diagnosis-2026), and [synthetic RAG testset generation](/blog/rag-synthetic-testset-generation-ragas-guide-2026). For the broader LLM quality model, read [testing LLM applications](/blog/testing-llm-applications-guide); for an existing production pattern, use the [RAG regression testing guide](/blog/rag-regression-testing-guide). Teams can also browse reusable QA instructions in [/skills](/skills) and automate browser evidence collection with the [Playwright CLI skill](/skills/Pramod/playwright-cli).

## The Diagnostic Question Is Causal, Not Merely Statistical

A low aggregate metric tells you that a system missed an expectation. It does not prove which component caused the miss. Retrieval and generation are coupled: generation quality depends on what retrieval supplied, while retrieval may be judged through a generated reference or an LLM evaluator. If the observation crosses both stages, it is not yet a component diagnosis.

The practical question is counterfactual: **would the same generator answer correctly if it received a verified evidence bundle, and would the production retriever return that evidence without help?** Those are separate experiments. The first holds generation configuration constant and substitutes context. The second bypasses generation and evaluates ranked retrieval output against labeled evidence.

| Observation | Plausible cause | Evidence still needed | Do not conclude yet |
|---|---|---|---|
| Correct answer with gold context, wrong answer end to end | Retrieval path is implicated | Production trace, relevant document IDs, filter and ranking output | That the vector database itself is broken |
| Wrong answer with gold context | Generation path or fixture is implicated | Claim trace, prompt, model settings, gold-context review | That retrieval is healthy in production |
| Required document retrieved below the context cutoff | Ranking or packing can cause omission | Full ranked list and final prompt context | That embedding quality alone caused it |
| Correct document and passage reach the prompt, unsupported claim appears | Generation is strongly implicated | Exact prompt, response, claim support labels | That every answer defect is hallucination |
| Both isolated stages pass but end-to-end fails | Integration or transformation defect | Serialized prompt, truncation, deduplication, ordering | That metrics are inconsistent |

This table is a triage map, not a theorem. A mislabeled reference can make a healthy retriever look wrong. A stale source can make a faithful generator return an answer that is no longer operationally correct. A grader can disagree with human reviewers. Diagnosis requires raw artifacts, not only scores.

## Version and Reproducibility Baseline

This guide was checked on July 14, 2026. The current PyPI release is Ragas 0.4.3. Its modern metrics live under \`ragas.metrics.collections\`, accept direct keyword arguments, and return a \`MetricResult\` whose numeric result is available through \`.value\`. The Ragas migration guide recommends experiment-oriented workflows instead of new uses of the legacy \`evaluate()\` and sample-based metric methods.

Promptfoo's current RAG guide also recommends testing document retrieval separately from generated output. Its context assertions can read static test context or extract context from a provider response with \`contextTransform\`. These tools support the workflow below, but neither library knows your authoritative document set, access policy, freshness rule, harm model, or release tolerance. Pin tool, model, prompt, corpus, index, and fixture versions in every result.

Record at least this run identity:

\`\`\`json
{
  "case_id": "leave-policy-effective-date-014",
  "query": "When does the revised parental leave policy apply?",
  "corpus_revision": "hr-handbook-2026-07-01",
  "index_revision": "hr-prod-shadow-2026-07-13.2",
  "retriever_config": "hybrid-v7-top20-rerank5-pack3",
  "prompt_revision": "answer-with-citations-v12",
  "generator": "provider/model-version",
  "grader": "provider/model-version",
  "expected_source_ids": ["hr-leave-2026-section-2"],
  "run_id": "ci-8421-case-014"
}
\`\`\`

Do not replace an immutable model identifier with a marketing alias if the provider exposes a pinned version. If only an alias is available, save the date, provider response metadata, and repeated-run distribution. Reproducibility means another reviewer can reconstruct the conditions and evidence, not that a probabilistic output must be byte-identical.

## Define an Evidence Contract Before Running Metrics

Each diagnostic fixture needs more than a question and an expected sentence. Define the facts that must be supported, the sources that are allowed to support them, the sources that are relevant but insufficient, and the response behavior when evidence is absent or contradictory.

For a policy question, a useful fixture includes:

1. A stable case ID and user-visible query.
2. The authoritative source document IDs, revisions, and relevant spans.
3. Required atomic facts, such as effective date, eligible population, and exception.
4. Acceptable alternate wording, without requiring one exact generated sentence.
5. Distractor documents that are topically close but superseded, regional, or incomplete.
6. Expected filters, permissions, and tenant boundaries.
7. The desired abstention or clarification behavior when required evidence is unavailable.
8. A risk label that determines whether a miss blocks a release or starts an investigation.

| Fixture field | Retrieval use | Generation use | Failure it exposes |
|---|---|---|---|
| Relevant document IDs | Calculate deterministic top-k inclusion and rank | Confirm citations point to allowed evidence | Missing, misranked, or fabricated sources |
| Required claim list | Identify passages needed for coverage | Check every answer claim and required answer element | Partial context or incomplete answer |
| Superseded distractors | Test ranking and freshness filters | Test resistance to conflicting old text | Stale-source preference |
| Access labels | Test metadata and authorization filters | Prevent use of unauthorized context | Cross-tenant or role leakage |
| No-answer expectation | Verify empty or insufficient retrieval | Verify abstention instead of invention | Confident answer without evidence |

Human reviewers should validate the evidence contract independently of the system under test. If the reference answer was generated from the same RAG pipeline, it can preserve the same omission or false claim and create circular approval.

## Capture the End-to-End Trace First

Run the failing case once without modifying the system. Capture every boundary so later substitutions are comparable:

- Original user input after conversation resolution.
- Query rewrites, decomposed subqueries, and filters.
- Candidate IDs with raw retrieval scores.
- Reranked IDs and scores, if a reranker is used.
- Chunks after deduplication, packing, and token-budget truncation.
- Exact context delivered to the generator, in order.
- System instruction, answer prompt, tool output, and generation settings.
- Final answer, citations, latency, token usage, and evaluator results.

Do not log restricted text indiscriminately. Store access-controlled references or approved redacted snippets when the corpus contains personal, regulated, or confidential data. The requirement is traceability, not uncontrolled duplication.

Separate the candidate list from the final prompt context. A relevant chunk can appear at rank three and still disappear because a parent-document expansion, deduplicator, tokenizer estimate, or context packer removed it. Calling that a retrieval success hides the integration defect that the generator actually experienced.

## Run the Controlled Substitution Matrix

Use four runs with the same fixture. Keep temperature, seed when supported, prompt revision, model identifier, output parser, and evaluator configuration fixed.

| Run | Context source | Generator | What it isolates |
|---|---|---|---|
| A: production | Production retrieval and packing | Production generator | Reproduces user-visible behavior |
| B: gold-context substitution | Human-verified minimal evidence | Same generator and prompt | Whether generation can use sufficient evidence |
| C: retrieval-only | Production ranked output | No answer generation | Rank, coverage, filters, freshness, authorization |
| D: context perturbation | Gold context plus controlled distractor or missing span | Same generator and prompt | Sensitivity to noise, conflicts, and absent evidence |

Run B must replace the exact final context payload, not merely insert a desired document earlier in the pipeline. Otherwise a later transform may still remove it. Keep the gold bundle minimal but sufficient: include every required supporting span and the metadata the prompt normally receives, without leaking the expected final wording into an artificial instruction.

Run C should use deterministic labels where possible. Check whether every required source ID appears within the operational cutoff, its rank, whether an explicitly irrelevant source precedes it, and whether filters removed an authorized source. An LLM relevance grader may complement those labels for semantic edge cases, but a known document ID does not need a probabilistic judge.

Run D tests the response contract. Remove one required span and expect abstention or a bounded partial answer. Add a superseded but topically similar passage and expect the system to prefer the current source or expose the conflict. Add irrelevant text without changing relevant evidence and observe whether the answer acquires unsupported claims.

## Implement a Framework-Neutral Diagnostic Harness

The component boundary should return structured data. The following Python uses dependency injection rather than a library-specific RAG API, so adapters can wrap any retriever and generator. It records both the production run and a gold-context substitution under the same configuration.

\`\`\`python
from dataclasses import dataclass
from typing import Callable, Sequence


@dataclass(frozen=True)
class Chunk:
    source_id: str
    text: str
    rank: int


@dataclass(frozen=True)
class Case:
    case_id: str
    query: str
    required_source_ids: frozenset[str]
    gold_context: tuple[Chunk, ...]


def diagnose(
    case: Case,
    retrieve: Callable[[str], Sequence[Chunk]],
    generate: Callable[[str, Sequence[Chunk]], str],
) -> dict:
    retrieved = tuple(retrieve(case.query))
    production_answer = generate(case.query, retrieved)
    gold_answer = generate(case.query, case.gold_context)
    retrieved_ids = {chunk.source_id for chunk in retrieved}

    return {
        "case_id": case.case_id,
        "required_sources_retrieved": sorted(
            case.required_source_ids.intersection(retrieved_ids)
        ),
        "missing_required_sources": sorted(
            case.required_source_ids.difference(retrieved_ids)
        ),
        "retrieved": [chunk.__dict__ for chunk in retrieved],
        "production_answer": production_answer,
        "gold_context_answer": gold_answer,
    }
\`\`\`

This harness deliberately does not assign a root cause. It creates evidence for a reviewer or a separate assertion layer. Add claim-support labels, required-answer checks, and run identity outside the adapter. Do not infer that \`gold_context_answer\` is correct merely because it differs from production; evaluate it against the same claim contract.

For stochastic generators, run each condition several times and retain every output. Compare failure rates or score distributions rather than selecting the best answer. The number of repeats should follow observed variance and release risk, not a universal constant.

## Add Metric Evidence without Letting It Replace the Experiment

Ragas context precision assesses whether relevant chunks are ranked ahead of irrelevant chunks. Context recall evaluates whether retrieved context supports the claims in a reference. Faithfulness evaluates whether claims in the response are supported by retrieved context. These metrics answer different questions, and their model-assisted variants inherit evaluator variance.

A useful evidence bundle includes both deterministic and model-assisted results:

| Evidence | Preferred method | Why it matters | Limitation |
|---|---|---|---|
| Required source in top k | ID comparison | Directly tests known retrieval expectation | Requires curated source labels |
| Required claim represented in context | Human label or context recall | Detects evidence coverage gaps | Depends on reference completeness |
| Relevant chunks ranked early | Context precision plus rank inspection | Detects noisy ordering | Relevance labels or judge can be wrong |
| Answer claims supported | Faithfulness plus claim ledger | Detects unsupported generation | Does not prove source truth or freshness |
| Answer addresses user intent | Answer relevancy or rubric | Detects evasive or incomplete answers | Does not prove factual correctness |

Promptfoo can keep retrieval and answer checks in one reviewable configuration while still treating them separately. This example assumes the provider returns an object with \`answer\` and \`documents\`; adapt paths to the real response shape and calibrate thresholds on labeled local data.

\`\`\`yaml
tests:
  - description: revised leave policy uses current evidence
    vars:
      query: When does the revised parental leave policy apply?
    assert:
      - type: javascript
        value: |
          const ids = output.documents.map((doc) => doc.id);
          return ids.includes('hr-leave-2026-section-2');
      - type: context-recall
        value: The revised policy applies from 1 September 2026.
        contextTransform: output.documents.map((doc) => doc.text).join('\\n\\n')
        threshold: 0.9
      - type: context-faithfulness
        contextTransform: output.documents.map((doc) => doc.text).join('\\n\\n')
        threshold: 0.9
      - type: answer-relevance
        threshold: 0.8
\`\`\`

The numbers above illustrate configuration syntax, not recommended defaults. Establish release values by comparing metric outcomes with independent human labels, measuring evaluator repeatability, and assigning different tolerances to different risk slices. A single global threshold can conceal a serious failure in a small but regulated slice.

## Interpret Controlled Outcomes

If production retrieval misses required evidence and the same generator succeeds with gold context, the retrieval path is the leading cause. Inspect query rewriting, embedding input, lexical and vector fusion, metadata filters, tenant scope, freshness, reranking, deduplication, and context packing in that order. Preserve the failing trace before rebuilding an index, because rebuilding can destroy evidence.

If gold context still produces an unsupported or incomplete answer, inspect generation. Verify that the context is actually serialized into the prompt, the instruction defines how to handle conflicts and absent facts, the output parser retains citations, and the model is not asked to combine incompatible sources. Create an atomic claim ledger and identify exactly which required claim was omitted or which answer claim lacked support.

If retrieval-only labels pass and gold-context generation passes but end-to-end fails, focus on the seam. Common defects include escaping that empties a context field, token truncation, wrong chunk ordering, a stale cache, mismatch between retrieved IDs and fetched bodies, a prompt variable bound to another case, or an authorization layer replacing content after evaluation.

If both isolated stages fail, log two defects unless evidence shows a shared cause. A stale corpus can create both missing retrieval labels and an incorrect reference. A malformed query can impair retrieval and misstate the user's intent to generation. Fixing only the visible answer may leave the retrieval regression intact.

## Use the Diagnosis in CI and Release Decisions

CI should run a small deterministic localization set on every relevant change and a larger distributional suite on scheduled or release jobs. Tag fixtures by component, source, language, role, query complexity, freshness, and harm. Run impacted slices when a chunker, embedding model, reranker, filter, prompt, generator, or corpus revision changes.

Block immediately on hard invariants such as unauthorized source retrieval, missing required source IDs for critical policy cases, fabricated citations, or unsupported high-risk claims. Treat model-assisted score movement as an investigation signal until calibrated. Require the candidate to beat or match the baseline by slice, not only in a global average.

Store the substitution result with the failure. A CI message that says "faithfulness 0.62" forces the next engineer to reconstruct the experiment. A useful message says that the required source disappeared after reranking, gold context restored all required claims in four of five repeated generations, and the index revision changed in the candidate build.

## Common Diagnostic Mistakes

**Judging retrieval from the final answer.** A generator may answer from prior knowledge even when retrieval failed, or ignore good context. Inspect ranked sources directly.

**Calling any relevant chunk a retrieval pass.** Retrieval must provide enough evidence inside the final context budget, not merely one topically related paragraph somewhere in the candidate list.

**Using the expected answer as hidden context.** Gold context should contain source evidence, not a sentence crafted to force the expected wording. Otherwise the substitution tests prompt leakage rather than generation ability.

**Changing multiple variables during substitution.** Switching the model, prompt, temperature, and context together destroys causal value. Change one boundary at a time.

**Treating faithfulness as correctness.** A response can faithfully repeat an outdated or incorrect source. Validate source authority, revision, and business truth separately.

**Assuming a score names the defect.** Context recall can fall because a reference has unsupported claims. Context precision can vary with relevance judgments. Read the reasons and raw examples.

**Ignoring permissions.** Gold evidence that the production identity is not allowed to retrieve is not a valid expected source for that user. Authorization belongs in fixture design.

## Limits of This Method

Controlled substitution localizes a failure to an operational boundary; it does not automatically find the underlying line of code. It is weaker when retrieval and generation are jointly trained, when generation invokes tools or additional retrieval, or when conversation memory silently changes the query. Expand the trace to every evidence-producing step in those systems.

Gold context also has limits. Human reviewers may omit a necessary passage, disagree about source authority, or encode hindsight into the fixture. Review high-impact fixtures with domain owners and version them like code. Model-based metrics can reduce review effort but cannot establish the ground truth they are asked to judge.

## Diagnostic Checklist

- [ ] Reproduce the failure with pinned corpus, index, retriever, prompt, model, and grader identities.
- [ ] Save query rewrites, filters, ranked candidates, packed context, prompt, response, and citations.
- [ ] Label required source IDs, required claims, distractors, access rules, and no-answer behavior.
- [ ] Evaluate retrieval without generation.
- [ ] Replace final context with a verified minimal evidence bundle while holding generation fixed.
- [ ] Remove required evidence and add controlled distractors to test expected degradation.
- [ ] Trace every answer claim to a supplied span or label it unsupported.
- [ ] Calibrate model-assisted metrics against human judgments by risk slice.
- [ ] Report the localized boundary and evidence, not a score-only root-cause claim.
- [ ] Add the case to component and end-to-end regression suites after the defect is fixed.

## FAQ: RAG Failure Diagnosis

### Can answer correctness alone distinguish retrieval from generation failure?

No. A correct answer can come from model memory despite failed retrieval, and an incorrect answer can appear despite perfect evidence. Inspect retrieval output directly and rerun the same generator with verified context.

### What is the strongest evidence that retrieval caused the failure?

The production trace lacks required authorized evidence, retrieval-only checks confirm the omission or misranking, and the unchanged generator reliably succeeds when the final context is replaced with validated evidence. This implicates the retrieval path but still requires inspection of rewriting, filtering, reranking, and packing to find the implementation cause.

### What if the required document was retrieved but the answer is wrong?

Confirm that the relevant span survived fetching, deduplication, ordering, and token packing into the exact prompt. If it did, trace answer claims against that span and inspect generation. A document ID in an early candidate list is not proof that the model received usable evidence.

### Does low faithfulness always mean a generation defect?

It means the evaluator found answer claims unsupported by the supplied context. The cause may be generation, a malformed context extraction, an incomplete trace, ambiguous claims, or grader error. Review the claim-level evidence before assigning ownership.

### Should gold context contain only one chunk?

Only if one chunk supports every required fact and preserves necessary qualifiers. Prefer the smallest sufficient bundle, but do not remove definitions, exceptions, dates, or provenance that a reasonable answer needs.

### How many repeated generations are enough?

There is no universal count. Measure variance for the model and case type, then choose repetitions that can detect a release-relevant change within budget. Retain all outputs and avoid selecting only the best run.

### Can Promptfoo or Ragas identify the root cause automatically?

They can produce retrieval, context, response, and faithfulness evidence. Root-cause localization still depends on controlled substitutions, trustworthy fixtures, raw traces, and knowledge of the system boundary. A metric name is not a causal diagnosis.

### When should this become a blocking CI test?

Make deterministic safety, authorization, required-source, and citation invariants blocking as soon as they are stable. Promote model-assisted thresholds only after calibration shows acceptable agreement and variance for the relevant slice.

## Conclusion

Diagnosing a RAG failure is an experiment-design problem. Capture the full trace, evaluate ranked retrieval against labeled evidence, replace the final context with a verified bundle, and hold generation constant. Then trace each answer claim back to supplied text. That sequence separates missing or mispacked evidence from a generator that fails to use evidence, while preserving enough detail to find the real defect and prevent its return.
`,
    },
  },
  {
    slug: 'rag-context-precision-recall-guide-2026',
    clusterId: 'rag-testing',
    post: {
      title: 'Contextual Precision vs Recall vs Relevancy for RAG Testing',
      description:
        'Compare RAG context precision, recall, and relevancy without conflating ranking, evidence coverage, or focus, using reproducible fixtures and CI checks.',
      date: '2026-03-24',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/rag-testing.png',
      imageAlt:
        'Three-axis RAG test dashboard separating ranked precision, evidence recall, and contextual focus',
      primaryKeyword: 'rag context precision recall relevancy',
      keywords: [
        'rag context precision recall relevancy',
        'contextual precision vs recall',
        'rag context relevancy testing',
        'rag retrieval metrics',
        'ragas context precision',
        'ragas context recall',
        'ragas context relevance',
        'rag evaluation metrics',
      ],
      contentKind: 'child',
      pillarSlug: 'rag-evaluation-metrics-complete-2026',
      relatedSlugs: [
        'rag-evaluation-metrics-complete-2026',
        'rag-retrieval-vs-generation-failure-diagnosis-2026',
        'rag-high-relevance-low-faithfulness-diagnosis-2026',
        'rag-synthetic-testset-generation-ragas-guide-2026',
      ],
      sources: [
        'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/',
        'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/',
        'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/nvidia_metrics/',
        'https://docs.ragas.io/en/stable/howtos/migrations/migrate_from_v03_to_v04/',
        'https://www.promptfoo.dev/docs/guides/evaluate-rag/',
        'https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/context-recall/',
      ],
      content: `RAG context precision recall relevancy testing needs three separate questions: are useful chunks ranked early, is the necessary evidence present, and is the delivered context focused on the user's request? Precision describes ordering quality, recall describes coverage against a reference, and relevancy describes pertinence or focus. Combining them into one vague "retrieval quality" score removes the information a QA team needs to diagnose a regression.

Use the [complete RAG evaluation metrics guide](/blog/rag-evaluation-metrics-complete-2026) as the cluster reference, then compare the [retrieval-versus-generation diagnostic workflow](/blog/rag-retrieval-vs-generation-failure-diagnosis-2026), the [high-relevance, low-faithfulness investigation](/blog/rag-high-relevance-low-faithfulness-diagnosis-2026), and the [Ragas synthetic testset tutorial](/blog/rag-synthetic-testset-generation-ragas-guide-2026). The [LLM application testing guide](/blog/testing-llm-applications-guide) provides the broader quality model, while the existing [top-k context precision test guide](/blog/testing-rag-context-precision-top-k) goes deeper on rank cutoffs. Reusable QA workflows live in [/skills](/skills), including the [Playwright CLI skill](/skills/Pramod/playwright-cli) for browser-based evidence.

## The Short Comparison

The terms overlap in ordinary language, but the metrics do not.

| Dimension | Operational question | Data it needs | A low result suggests | It cannot prove |
|---|---|---|---|---|
| Context precision | Are relevant chunks placed ahead of irrelevant chunks? | Ordered retrieved contexts plus a relevance basis | Useful evidence is buried among noise | That all required evidence was retrieved |
| Context recall | Does retrieved context support the required reference claims? | Retrieved contexts plus a reference or reference contexts | Necessary evidence is missing | That the returned list is concise or well ordered |
| Context relevance | Is supplied context pertinent to the user input? | User input plus retrieved contexts | Context is off-topic, mixed, or weakly focused | That every reference fact is covered |

A result can have high precision and low recall. Imagine two returned chunks, both highly relevant, but a third necessary policy exception is absent. The ranking is clean; coverage is incomplete. Another result can have high recall and low precision: all required facts are present, but dozens of irrelevant chunks precede or surround them. The evidence exists, yet noise may consume the prompt budget or distract generation.

High contextual relevance does not guarantee either metric. Every retrieved chunk may discuss parental leave, so the context is topically focused, while none contains the newly effective exception required by the reference. Conversely, a context can include the exact required paragraph and several unrelated passages, yielding strong coverage with poor focus.

## Terminology and Current Ragas Baseline

Searchers often say "contextual precision," but current Ragas documentation names the metric **Context Precision**. In Ragas 0.4.3, the collections-based \`ContextPrecision\` evaluates whether contexts useful for answering the query are ranked higher. The documented reference-based scorer receives \`user_input\`, \`reference\`, and ordered \`retrieved_contexts\`.

Ragas \`ContextRecall\` asks whether claims in a reference can be attributed to retrieved context. A reference is required for that LLM-based calculation because recall needs a denominator: the information that should have been present. The documentation also describes alternatives based on reference contexts or document IDs. If a fixture has authoritative document IDs, deterministic ID recall is often easier to explain than an LLM judgment.

The current Ragas collections catalog also documents \`ContextRelevance\` in its NVIDIA metric group. It uses independent judge calls to assess how pertinent retrieved contexts are to \`user_input\`. That is not the same calculation as Context Precision and should not be renamed precision in reports.

This article was verified on July 14, 2026 against Ragas 0.4.3. Modern metrics are imported from \`ragas.metrics.collections\`; \`.score()\` and \`.ascore()\` return \`MetricResult\`, with the numeric value in \`.value\` and an optional explanation in \`.reason\`. The v0.4 migration documentation recommends these collections APIs rather than legacy \`SingleTurnSample\` examples. Pin Ragas and evaluator versions because imports, result structures, prompts, and model behavior can change.

## Design a Fixture That Can Support All Three Questions

A query-and-answer pair is not enough. Build a retrieval fixture containing source-level truth and claim-level truth:

- \`user_input\`: the exact resolved query sent to retrieval.
- \`reference\`: a reviewed answer or set of required claims.
- \`reference_context_ids\`: documents or chunks that legitimately support those claims.
- \`required_claims\`: atomic facts that the returned evidence must cover.
- \`retrieved_contexts\`: ordered text exactly as the generator receives it.
- \`retrieved_context_ids\`: stable IDs in the same order.
- \`relevance_labels\`: independent labels for each result, ideally with reviewer rationale.
- \`slice_tags\`: language, source type, role, freshness, query class, and risk.

Do not create a reference by copying the current generated answer. That makes recall circular and can legitimize the same omission being tested. The reference should come from approved source material and domain review. When policy permits multiple correct answers, store required facts and acceptable alternatives instead of one fragile exact string.

The relevance label also needs a clear rule. A chunk may be topically related but not useful for answering the specific question. For "When does the revised policy begin?", a history of parental leave is related to the topic but irrelevant to the requested effective date. Define relevance at the task level.

\`\`\`json
{
  "case_id": "benefits-effective-date-022",
  "user_input": "When does the revised parental leave policy begin?",
  "reference": "The revised policy begins on 1 September 2026.",
  "required_claims": [
    {"id": "effective-date", "text": "Start date is 1 September 2026"}
  ],
  "reference_context_ids": ["leave-2026-section-2"],
  "retrieved_context_ids": [
    "leave-history",
    "leave-2026-section-2",
    "benefits-index"
  ],
  "relevance_labels": [0, 1, 0],
  "slice_tags": ["hr-policy", "date", "high-impact"]
}
\`\`\`

This fixture gives precision an ordered relevance sequence, recall a required claim or source set, and relevance the query-context relationship. It also exposes why one score is insufficient: the required source is present, but it is not first and the list contains noise.

## Measure Ranking with Context Precision

Context Precision is sensitive to order. Moving the same relevant item upward should improve or preserve ranking quality; adding irrelevant chunks ahead of it should not improve the result. This makes the metric useful for comparing retrievers, rerankers, fusion weights, and top-k policies.

Before using an LLM-based scorer, calculate transparent rank evidence:

1. Mark each retrieved context relevant or irrelevant according to the fixture rule.
2. Record the first relevant rank.
3. Record the ranks of every required source.
4. Calculate a deterministic ranking measure suitable for your product, such as precision at an operational cutoff or reciprocal rank for single-target lookups.
5. Inspect cases individually when an aggregate changes.

Ragas Context Precision can complement this record by judging usefulness against a reference. It cannot replace source labels where exact IDs matter, and it does not establish whether every required fact was retrieved. A perfectly ordered list containing only one of two necessary sources may still be incomplete.

Be explicit about the cutoff. Users and generators experience only the contexts actually packed into the prompt. A metric over top 50 candidates may look healthy while the context packer keeps only top 4. Evaluate the candidate ranking for retriever engineering and the packed ranking for end-to-end risk.

## Measure Coverage with Context Recall

Recall asks what is missing. Ragas' LLM-based Context Recall breaks the reference into claims and checks whether each can be attributed to retrieved context. That makes reference quality decisive. If the reference omits an exception, the metric has no basis for requiring that exception. If it includes a disputed claim, a good retriever may be penalized.

Use source-ID recall when the authoritative support set is known. Use claim attribution when multiple passages can support the same fact or when stable chunk IDs change after reindexing. Keep both for high-impact fixtures: IDs reveal source-level regressions, while claims tolerate legitimate rechunking.

| Recall approach | Best fit | Strength | Main risk |
|---|---|---|---|
| Required document or chunk IDs | Stable curated corpus | Deterministic and explainable | Rechunking or equivalent sources can create false failures |
| Reference-context comparison | Reviewed evidence passages | Tests evidence coverage directly | Requires costly reference curation |
| Reference-answer claim attribution | Reviewed answers with atomic facts | Works when exact source spans vary | Judge and reference errors affect the result |
| Required-field assertions | Structured policy or product facts | Clear release invariants | Covers only facts explicitly modeled |

Do not interpret low recall as poor ranking. A missing source might have been excluded by permissions, absent from the index, filtered by date, or not requested by query decomposition. Ranking cannot promote a candidate that never entered the set. Use traces to locate the stage.

## Measure Focus with Context Relevance

Context relevance asks whether the context is pertinent to the user input. It is useful when retrieval returns semantically related but unhelpful material, when query rewriting drifts, or when broad parent documents flood the prompt with tangential content.

Ragas' current Context Relevance implementation uses discrete LLM judgments normalized into a score. Promptfoo's current RAG guide similarly describes context relevance as how much retrieved context is necessary for the query. These are model-assisted judgments, so record the evaluator, run repeated grading on borderline cases, and retain explanations.

Relevance is not coverage. A short passage can be perfectly focused yet omit the requested exception. Relevance is not faithfulness either: it evaluates context against the query, not answer claims against context. A generator can invent a date even when every supplied paragraph is on topic.

Use direct labels for obvious distractors and LLM judgments for ambiguous semantic cases. A navigation footer, duplicate header, or unrelated product page does not need an expensive judge. A technical passage that supports a multi-hop inference may need domain review.

## Run Current Ragas Metrics without Mixing Inputs

The following example follows the documented Ragas 0.4 collections pattern. It assumes \`OPENAI_API_KEY\` is configured for the \`AsyncOpenAI\` client and uses an evaluator model shown in current Ragas examples. Pin an approved model in CI rather than relying on an alias indefinitely.

\`\`\`python
import asyncio
from openai import AsyncOpenAI
from ragas.llms import llm_factory
from ragas.metrics.collections import ContextPrecision, ContextRecall, ContextRelevance


async def score_retrieval() -> None:
    client = AsyncOpenAI()
    llm = llm_factory("gpt-4o-mini", client=client)

    user_input = "When does the revised parental leave policy begin?"
    reference = "The revised policy begins on 1 September 2026."
    retrieved_contexts = [
        "The organization introduced parental leave in 2018.",
        "The revised parental leave policy applies from 1 September 2026.",
        "Benefits documents are listed on the employee portal.",
    ]

    precision = await ContextPrecision(llm=llm).ascore(
        user_input=user_input,
        reference=reference,
        retrieved_contexts=retrieved_contexts,
    )
    recall = await ContextRecall(llm=llm).ascore(
        user_input=user_input,
        reference=reference,
        retrieved_contexts=retrieved_contexts,
    )
    relevance = await ContextRelevance(llm=llm).ascore(
        user_input=user_input,
        retrieved_contexts=retrieved_contexts,
    )

    print({
        "context_precision": precision.value,
        "context_recall": recall.value,
        "context_relevance": relevance.value,
    })


asyncio.run(score_retrieval())
\`\`\`

Do not copy the resulting values into a universal pass rule. First run reviewed examples, compare scores with labels, repeat grading to estimate variance, and choose release behavior by risk slice. Preserve \`.reason\` when the metric supplies it; disagreement is easier to investigate with rationale than with a number alone.

## Cross-Check with Promptfoo

Promptfoo's current context assertions can extract documents from a structured provider response. This is useful when the system under test returns \`answer\` plus retrieved \`documents\`. The \`contextTransform\` expression receives the provider output directly, even if another transform extracts only the answer for output assertions.

\`\`\`yaml
tests:
  - description: leave effective date retrieval coverage and focus
    vars:
      query: When does the revised parental leave policy begin?
    options:
      transform: output.answer
    assert:
      - type: javascript
        metric: required-source-present
        value: |
          return output.documents.some(
            (doc) => doc.id === 'leave-2026-section-2'
          );
      - type: context-recall
        value: The revised policy begins on 1 September 2026.
        contextTransform: output.documents.map((doc) => doc.text).join('\\n\\n')
        threshold: 0.9
      - type: context-relevance
        contextTransform: output.documents.map((doc) => doc.text).join('\\n\\n')
        threshold: 0.8
\`\`\`

These thresholds are syntax examples. Promptfoo requires threshold values for context-based assertions, but the correct values are empirical. Also retain the deterministic source assertion; an LLM judge should not be the only evidence that a required regulated source was returned.

## Interpret Metric Combinations as Hypotheses

| Precision | Recall | Relevance | Likely pattern | Next inspection |
|---|---|---|---|---|
| High | High | High | Clean, sufficient, focused context | Check generation faithfulness and correctness |
| High | Low | High | Few focused results but missing required evidence | Candidate generation, filters, corpus coverage |
| Low | High | Low | Evidence present amid noise | Ranking, reranking, deduplication, top-k |
| Low | Low | High | Topically focused but insufficient and poorly ordered | Query decomposition and source coverage |
| High | High | Low | Required evidence present, but context contains broad tangents | Packing, parent expansion, duplicate removal |
| Low | High | High | Relevant set covers facts but the best items are buried | Ordering and operational cutoff |

These patterns narrow investigation; they do not assign root cause automatically. Inspect actual examples. A high recall value can be produced by one dense chunk containing all reference claims, even if the source is unauthorized or stale. A high relevance value can come from multiple passages repeating the same fact while another required fact is absent.

## Build Metamorphic Tests Around Expected Direction

Metamorphic tests alter one retrieval property and assert the expected direction rather than one exact model-assisted score.

- Move a labeled relevant chunk above an irrelevant chunk; precision should not worsen.
- Remove the only passage supporting a required reference claim; recall should not improve.
- Add clearly unrelated text ahead of the same evidence; relevance should not improve.
- Replace a current source with a superseded source; freshness and source-policy assertions should fail even if topic relevance remains high.
- Increase top-k while preserving required evidence; recall may improve, while precision or relevance may fall.
- Apply the correct tenant filter; unauthorized-source count must fall to zero without losing authorized required evidence.

Directional checks are still subject to evaluator noise. For deterministic labels, make them hard assertions. For LLM metrics, repeat the comparison and investigate inconsistent direction rather than automatically retrying until it passes.

## Use Separate Release Gates

Do not average precision, recall, and relevance into a single score unless the product has explicitly accepted compensation among them. A high ranking score should not cancel missing evidence for a critical answer. Strong recall should not excuse unauthorized or massively noisy context.

A safer release policy has independent gates:

1. **Hard retrieval invariants:** required source IDs for critical cases, zero unauthorized sources, no deleted documents, valid revisions.
2. **Coverage gate:** required claims or reference evidence represented by slice.
3. **Ranking gate:** no material regression at the operational context cutoff.
4. **Focus gate:** bounded irrelevant-context rate or calibrated relevance result.
5. **End-to-end gate:** answer faithfulness, required fields, citations, abstention, and safety.

Compare candidates with a fixed baseline corpus snapshot before comparing production traffic. If both corpus and retriever change, keep a factorial test that runs old and new retrieval configurations against old and new snapshots. That reveals whether a score moved because the system improved or because the evidence set changed.

## Common Mistakes

**Calling precision "percentage of relevant text."** Ragas Context Precision is rank-aware. A separate context relevance or utilization measure may assess focus, but the names are not interchangeable.

**Calculating recall without a reference.** Recall requires a target set or target information. Without one, you can measure similarity or relevance, not what was missed.

**Using answer relevance as context relevance.** Answer relevance compares response to user intent. Context relevance compares retrieved context to user input. A fluent answer can be relevant despite poor evidence.

**Ignoring order.** Passing an unordered set to a rank-aware metric discards the behavior being tested. Preserve retriever and packed-context order.

**Treating chunks as independent.** Parent-child retrieval, overlapping chunks, and duplicates can inflate apparent evidence. Track source lineage and deduplicate for analysis without changing the actual prompt trace.

**Publishing one threshold for every slice.** Short factual queries, multi-hop questions, multilingual corpora, and scanned documents have different variance and risk. Calibrate and report by slice.

**Letting an LLM judge define authority.** A judge can decide that a passage sounds relevant; it cannot determine which internal policy revision is legally authoritative without reliable metadata and fixture rules.

## Limits

Metric definitions are implementation-specific. A paper, Ragas, Promptfoo, and an internal dashboard may use similar names for different calculations. Document the tool, class or assertion type, inputs, evaluator, version, and cutoff beside every result.

Model-assisted metrics are probabilistic and can be sensitive to language, prompt, answer length, and evaluator changes. Deterministic source labels are expensive to maintain and can become stale after rechunking. Use both, review disagreements, and keep a small adjudicated anchor set for detecting evaluator drift.

No retrieval metric proves that the underlying source is true, current, authorized, or safe to reveal. Add source governance and access tests. No retrieval metric proves the final answer uses context faithfully. Add claim-level generation checks.

## Precision, Recall, and Relevancy Checklist

- [ ] Define each metric in the repository using its exact tool and version.
- [ ] Preserve ordered candidates and ordered final prompt contexts separately.
- [ ] Curate references, required claims, source IDs, distractors, and access labels.
- [ ] Use deterministic rank and ID checks where source truth is known.
- [ ] Use current Ragas collections APIs and retain \`MetricResult\` values and reasons.
- [ ] Calibrate Promptfoo or Ragas thresholds against independent human labels.
- [ ] Report precision, recall, and relevance independently by risk slice.
- [ ] Run directional perturbations for ordering, omission, noise, freshness, and filters.
- [ ] Keep retrieval gates separate from faithfulness and answer-correctness gates.
- [ ] Revalidate fixtures and evaluators after corpus, chunking, model, or package changes.

## FAQ: Context Metrics

### Can context precision be high while context recall is low?

Yes. The retriever can return a short, perfectly ordered list of relevant chunks while omitting another source required to answer fully. Precision rewards the clean ranking; recall exposes missing evidence.

### Does high context recall mean retrieval is good?

It means the tested context covers the chosen reference or target set. The list may still be noisy, poorly ordered, unauthorized, stale, or too large for the generator. Inspect the other dimensions and governance rules.

### Is context relevancy the same as context precision?

No. Relevancy asks whether context is pertinent to the query. Precision is rank-aware and asks whether relevant items are placed ahead of irrelevant ones. Tool vendors may use terms differently, so cite the exact implementation.

### Why does Context Recall require a reference?

Recall measures how much of a target set was recovered. A reference answer, reference contexts, required claims, or source IDs provide that target. Without a denominator, the system cannot know what it missed.

### Should I use reference text or source IDs?

Use IDs for stable, curated retrieval expectations and reference claims when equivalent sources or rechunking make exact IDs brittle. High-impact suites often retain both because they reveal different regressions.

### Is 0.8 a safe universal threshold?

No. A score depends on the metric implementation, evaluator, fixture distribution, language, and risk. Calibrate thresholds against reviewed outcomes and recheck them when any evaluator component changes.

### Can I average all three metrics into one KPI?

You can calculate an internal summary for observation, but do not let it hide blocking failures. Missing critical evidence, unauthorized retrieval, or severe ranking regressions should remain independent gates rather than being offset by another high score.

### Which metric should run first during triage?

Start with deterministic source inclusion and the raw ranked list. Then inspect recall for missing evidence, precision for ordering, and relevance for focus. Finally evaluate whether generation used the delivered context faithfully.

## Conclusion

Context precision, recall, and relevancy form three diagnostic axes. Precision explains ranking, recall explains evidence coverage, and relevance explains focus. Preserve their distinct inputs and limitations, combine model-assisted results with source labels, and gate releases on independent risks. The result is not merely a better dashboard; it is a retrieval test suite that tells engineers where to look next.
`,
    },
  },
  {
    slug: 'rag-high-relevance-low-faithfulness-diagnosis-2026',
    clusterId: 'rag-testing',
    post: {
      title: 'High Answer Relevance but Low Faithfulness: Diagnose Wrong RAG Answers',
      description:
        'Diagnose fluent, on-topic RAG answers that are unsupported by retrieved evidence using atomic claim tracing, controlled context tests, and release gates.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/rag-testing.png',
      imageAlt:
        'Claim-level evidence map revealing an on-topic RAG answer with unsupported factual statements',
      primaryKeyword: 'high relevance low faithfulness rag',
      keywords: [
        'high relevance low faithfulness rag',
        'rag answer relevance faithfulness',
        'wrong rag answer diagnosis',
        'rag hallucination testing',
        'ragas answer relevancy',
        'ragas faithfulness metric',
        'rag claim tracing',
        'rag grounded answer testing',
      ],
      contentKind: 'child',
      pillarSlug: 'rag-evaluation-metrics-complete-2026',
      relatedSlugs: [
        'rag-evaluation-metrics-complete-2026',
        'rag-retrieval-vs-generation-failure-diagnosis-2026',
        'rag-context-precision-recall-guide-2026',
        'rag-synthetic-testset-generation-ragas-guide-2026',
      ],
      sources: [
        'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/answer_relevance/',
        'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/',
        'https://docs.ragas.io/en/stable/howtos/migrations/migrate_from_v03_to_v04/',
        'https://www.promptfoo.dev/docs/guides/evaluate-rag/',
        'https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/context-faithfulness/',
        'https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/answer-relevance/',
      ],
      content: `A high relevance low faithfulness RAG result is not contradictory. It describes an answer that addresses the user's topic and intent but includes claims that the retrieved context does not support. Fluency, specificity, and directness can raise relevance while a remembered date, invented exception, merged policy, or unjustified inference lowers faithfulness. Diagnose the mismatch by splitting the answer into atomic claims and tracing every claim to the exact context the model received.

The metric relationships are mapped in the [complete RAG evaluation metrics guide](/blog/rag-evaluation-metrics-complete-2026). Use the [retrieval-versus-generation failure workflow](/blog/rag-retrieval-vs-generation-failure-diagnosis-2026), the [context precision, recall, and relevancy comparison](/blog/rag-context-precision-recall-guide-2026), and the [synthetic RAG testset tutorial](/blog/rag-synthetic-testset-generation-ragas-guide-2026) for adjacent work. The broader [LLM application testing guide](/blog/testing-llm-applications-guide) explains evaluator design, while the existing [Ragas faithfulness test guide](/blog/testing-rag-faithfulness-with-ragas) provides a direct implementation reference. QA teams can browse [/skills](/skills) and use the [Playwright CLI skill](/skills/Pramod/playwright-cli) when the answer and citations must be verified through a browser.

## Relevance and Faithfulness Ask Different Questions

Answer relevance asks whether the response addresses the user input. Faithfulness asks whether the response's claims are supported by retrieved context. Neither property implies the other.

| Answer pattern | Relevance | Faithfulness | Example |
|---|---|---|---|
| Direct and fully supported | High | High | Gives the requested effective date found in the supplied policy |
| Direct but unsupported | High | Low | Gives a plausible date absent from every supplied passage |
| Supported but off-target | Low | High | Accurately summarizes policy history instead of answering the date question |
| Off-target and unsupported | Low | Low | Discusses unrelated benefits and invents an approval rule |

The dangerous quadrant is high relevance with low faithfulness because it feels useful. The answer repeats the user's vocabulary, adopts the expected format, and may include convincing citations. A user has fewer surface cues that the factual basis is missing.

Ragas' current \`AnswerRelevancy\` metric compares the user input with artificial questions generated from the response through embeddings. Its documentation says the metric focuses on alignment with intent and does not assess factual accuracy. The resulting score usually falls between zero and one, but the docs note that cosine similarity is mathematically capable of negative values. Do not describe it as a factuality probability.

Ragas \`Faithfulness\` extracts claims from the response, judges whether each can be inferred from retrieved context, and reports the supported proportion. It does not compare the context with external truth. A response can faithfully repeat a stale, malicious, or factually incorrect source. Faithfulness is evidence adherence, not source correctness.

## Version Baseline and Required Inputs

This guide was verified on July 14, 2026 against Ragas 0.4.3. New code should use collections metrics from \`ragas.metrics.collections\`, direct keyword arguments, and the \`MetricResult\` returned by \`.score()\` or \`.ascore()\`. Read the numeric value from \`.value\` and retain \`.reason\` when available. The migration documentation discourages new dependencies on the legacy sample-based APIs.

The two metrics require different inputs:

| Metric | Minimum conceptual inputs | What must be preserved | Major dependency |
|---|---|---|---|
| Answer relevancy | User input and response | Resolved query, exact answer, evaluator and embeddings | Question generation and embedding similarity |
| Faithfulness | Response and retrieved contexts | Exact packed context in order, exact answer, evaluator | Claim extraction and context attribution |

Do not feed the full candidate retrieval list to faithfulness if the generator saw only the packed top-k context. That would credit evidence unavailable during generation. Conversely, do not evaluate a post-processed answer if the user saw another version. The test must use the actual boundary artifacts.

## Reconstruct the User-Visible Failure

Start with a case that a domain reviewer has marked wrong or unsupported. Capture:

1. The user input after conversation resolution.
2. Query rewrites and filters.
3. The final context payload delivered to the model.
4. Source IDs, revisions, titles, and character or token spans.
5. System and answer prompts.
6. Model identifier and decoding settings.
7. Raw answer before and after output processing.
8. Citations and the mapping from citation labels to sources.
9. Relevance and faithfulness evaluator identities and repeated results.

Save the packed context, not just links. Documents can change after the run, and a URL does not prove which revision or excerpt the model received. Apply access controls and redaction appropriate to the source data; evaluation traces can contain confidential text and user queries.

## Turn the Answer into an Atomic Claim Ledger

The most useful diagnostic artifact is a claim ledger. Split compound statements so each row can be supported or rejected independently. Preserve qualifiers such as dates, populations, regions, exceptions, quantities, and modal verbs. "Employees receive 16 weeks from September" contains at least a duration claim and an effective-date claim.

\`\`\`json
{
  "case_id": "leave-duration-031",
  "user_input": "How much parental leave applies from September?",
  "response": "All employees receive 16 paid weeks from 1 September 2026.",
  "claims": [
    {
      "id": "c1",
      "claim": "The policy grants 16 paid weeks.",
      "supporting_spans": ["policy-2026#p12:l4-l6"],
      "verdict": "supported"
    },
    {
      "id": "c2",
      "claim": "The policy applies to all employees.",
      "supporting_spans": [],
      "verdict": "unsupported"
    },
    {
      "id": "c3",
      "claim": "The effective date is 1 September 2026.",
      "supporting_spans": ["policy-2026#p2:l1-l2"],
      "verdict": "supported"
    }
  ]
}
\`\`\`

The ledger explains a low faithfulness result better than a scalar. It shows that the answer is on topic and mostly plausible, but overgeneralizes eligibility. It also supports remediation: improve the prompt's qualification rule, retrieve the eligibility section, or require abstention on the population clause.

Use three support labels at minimum: supported, contradicted, and not found. A contradicted claim is stronger evidence than missing support. Add ambiguous when the passage requires domain interpretation, but require adjudication rather than letting ambiguous become an automatic pass.

## Trace Claims to Context, Not to Model Memory

For each claim, ask whether a reasonable reviewer can infer it from the supplied context without outside knowledge. Exact wording is unnecessary; valid paraphrase and straightforward entailment count. Do not allow the grader to fill missing facts from common knowledge.

| Claim condition | Faithfulness label | Additional check |
|---|---|---|
| Explicitly stated in current supplied source | Supported | Verify citation points to that source |
| Directly entailed by multiple supplied statements | Supported with rationale | Record all spans and inference step |
| Topically plausible but absent | Unsupported | Search packed context, then full corpus separately |
| Conflicts with supplied source | Contradicted | Mark severity and source authority |
| Present only in a source retrieved but not packed | Unsupported for generation | Investigate context packing |
| Present in stale or unauthorized source | May be faithful to supplied text | Fail freshness or authorization rule separately |

This distinction prevents a common mistake: searching the entire corpus after the answer and declaring a claim grounded because some document contains it. Faithfulness concerns the context used for that response. Corpus truth, source authority, and retrieval coverage are separate tests.

## Run Controlled Context Variants

After the ledger is reviewed, rerun the same query and generator with controlled context changes.

**Gold-context run:** Supply a minimal verified bundle containing every required fact. If unsupported claims persist, generation instructions or model behavior are implicated.

**Evidence-removal run:** Remove the span supporting one fact. The answer should omit that fact, qualify uncertainty, or abstain according to product policy. If the same claim remains, the model is likely relying on prior knowledge or pattern completion.

**Contradiction run:** Insert two clearly versioned passages with conflicting dates and metadata naming the current source. Expect conflict handling or preference for the authoritative revision, not silent selection.

**Distractor run:** Add topically similar but irrelevant material while preserving the valid evidence. Unsupported claims should not appear merely because nearby concepts are mentioned.

**Citation-swap run:** Keep answer text fixed in a test double and alter the cited source mapping. Citation alignment must fail even if answer relevance remains high.

| Variant outcome | Evidence | Leading hypothesis | Next action |
|---|---|---|---|
| Claim disappears when evidence is removed | Generation responds to context | Original support mapping may be valid | Check source truth and citations |
| Claim remains without evidence | Prior knowledge or prompt-induced completion | Generation faithfulness defect | Tighten evidence rule and add abstention test |
| Gold context fixes claim | Missing or noisy production context | Retrieval or packing defect | Use component localization workflow |
| Gold context does not fix claim | Generator ignores or misreads evidence | Prompt/model/output defect | Inspect instructions and claim complexity |
| Contradictory source selected silently | Authority metadata unused | Prompt and source-policy defect | Make revision precedence explicit |

Keep all other variables fixed. A new model plus new prompt plus gold context is a candidate solution test, not a causal diagnosis.

## Score with Current Ragas Collections Metrics

The example below follows current Ragas 0.4.3 documentation. It uses the same answer for both metrics but supplies only the inputs each metric needs. The OpenAI model names mirror current documentation examples; production suites should pin approved evaluator and embedding versions and record cost and latency.

\`\`\`python
import asyncio
from openai import AsyncOpenAI
from ragas.embeddings.base import embedding_factory
from ragas.llms import llm_factory
from ragas.metrics.collections import AnswerRelevancy, Faithfulness


async def evaluate_answer() -> None:
    client = AsyncOpenAI()
    llm = llm_factory("gpt-4o-mini", client=client)
    embeddings = embedding_factory(
        "openai",
        model="text-embedding-3-small",
        client=client,
    )

    user_input = "How much parental leave applies from September?"
    response = "All employees receive 16 paid weeks from 1 September 2026."
    retrieved_contexts = [
        "Eligible primary caregivers receive 16 paid weeks.",
        "The revised policy takes effect on 1 September 2026.",
    ]

    relevancy = await AnswerRelevancy(
        llm=llm,
        embeddings=embeddings,
    ).ascore(user_input=user_input, response=response)

    faithfulness = await Faithfulness(llm=llm).ascore(
        response=response,
        retrieved_contexts=retrieved_contexts,
    )

    print({
        "answer_relevancy": relevancy.value,
        "faithfulness": faithfulness.value,
        "faithfulness_reason": faithfulness.reason,
    })


asyncio.run(evaluate_answer())
\`\`\`

The expected qualitative finding is that the response directly answers the question but overstates eligibility. Do not hard-code an expected numeric score from this article: evaluator models and prompts are probabilistic, and Ragas does not define one universal release threshold.

Run repeated evaluations for borderline or high-impact cases. If claim-level human labels remain stable while scores vary widely, treat the metric as an investigation aid rather than a blocking gate until the evaluator is improved.

## Add Promptfoo Assertions at the System Boundary

Promptfoo's current RAG documentation distinguishes answer relevance from context faithfulness and allows \`contextTransform\` to extract evidence from a structured response. The following configuration assumes the provider returns \`answer\` and \`documents\`.

\`\`\`yaml
tests:
  - description: leave answer remains within retrieved evidence
    vars:
      query: How much parental leave applies from September?
    options:
      transform: output.answer
    assert:
      - type: answer-relevance
        threshold: 0.8
      - type: context-faithfulness
        contextTransform: output.documents.map((doc) => doc.text).join('\\n\\n')
        threshold: 0.9
      - type: llm-rubric
        value: >
          Every population qualifier in the answer must be explicitly supported
          by the supplied policy context. Do not infer that "eligible primary
          caregivers" means "all employees".
      - type: javascript
        metric: citations-resolve
        value: |
          return output.citations.every((citation) =>
            output.documents.some((doc) => doc.id === citation.source_id)
          );
\`\`\`

The example values demonstrate syntax only. Calibrate answer-relevance and faithfulness thresholds with independently reviewed cases. The targeted rubric and deterministic citation check make the release rule more specific than one aggregate metric.

## Find the Actual Source of Unsupported Claims

Unsupported claims can enter at several points:

**Retrieval omission.** The generator needs an eligibility qualifier, but the packed context contains only duration and date. This is a retrieval or packing coverage failure followed by unsafe generation behavior. Track both defects.

**Noisy context fusion.** One chunk says "all employees" about another benefit, and the answer incorrectly attaches it to parental leave. Improve chunk boundaries, metadata, ordering, and prompt source separation.

**Stale source preference.** An old policy supports the answer, while the current policy contradicts it. Faithfulness may look high if stale text was supplied. Add version authority and deletion tests.

**Prompt pressure.** Instructions demand a definitive answer even when evidence is incomplete. Replace unconditional helpfulness with explicit partial-answer, clarification, and abstention rules.

**Model prior.** The model completes a familiar pattern from training. Evidence removal tests expose this because the claim persists when its supporting text is absent.

**Citation post-processing.** The answer is generated without citation alignment, then a separate component attaches the nearest source. Evaluate claim support and citation alignment independently.

**Judge error.** The evaluator overlooks a qualifier or treats topical similarity as entailment. Keep claim ledgers and adjudicated anchor cases to audit the grader.

## Design CI and Release Gates

Create separate gates for separate risks:

1. **Required-claim coverage:** the answer contains mandatory fields when evidence exists.
2. **Unsupported-claim limit:** zero unsupported high-risk claims; calibrated tolerance for low-risk explanatory text if the product allows it.
3. **Contradiction block:** no answer claim may contradict authoritative supplied context.
4. **Citation alignment:** each citation resolves to a delivered source and supports its associated claim.
5. **Abstention behavior:** missing evidence produces a bounded response rather than invention.
6. **Answer relevance:** the response still addresses the user after faithfulness controls are tightened.

Do not optimize faithfulness by returning empty or evasive answers. A response with no factual claims can avoid unsupported claims while failing the user. Pair faithfulness with answer completeness, relevance, and task-specific required fields.

Compare candidate and baseline by slice. Unsupported claims about greetings and unsupported claims about eligibility, dosage, payment, or legal obligations do not carry equal harm. High-risk slices need deterministic review and stricter blocking behavior.

Store claim-level diffs in CI artifacts. Reviewers should see which claim changed, what context was supplied, and why the grader labeled it unsupported. A dashboard average cannot support a safe release decision by itself.

## Common Mistakes

**Equating on-topic with true.** Relevance rewards addressing the question. It does not validate facts, evidence, or source authority.

**Evaluating against the whole corpus.** Faithfulness must use the context delivered for that answer. Searching later changes the question from "was it grounded?" to "could it be supported somewhere?"

**Treating citations as proof.** A citation can exist, resolve, and still fail to support the adjacent claim. Verify semantic alignment at claim level.

**Ignoring qualifiers.** Dates, regions, eligibility groups, exceptions, and confidence language often contain the actual defect. Split them into separate claims.

**Using one judge run as ground truth.** Repeat model-assisted grading, retain reasons, and adjudicate important disagreements.

**Raising faithfulness by deleting useful content.** Pair faithfulness with relevance, completeness, and required-answer checks so empty answers do not win.

**Letting stale context pass.** Faithfulness is relative to supplied evidence. Add separate checks for source revision, authorization, and truth.

## Limits

Claim extraction is not perfectly objective. Reviewers can disagree on whether a sentence contains one claim or several, and whether an inference is sufficiently direct. Define annotation rules and measure agreement on high-impact fixtures.

Ragas and Promptfoo metrics depend on evaluator models and prompts. Scores can drift when providers update models, even if the application is unchanged. Pin when possible, maintain anchor examples, and rerun calibration after upgrades.

Faithfulness cannot detect a source that is itself false. Answer relevancy cannot detect an unauthorized disclosure. Neither metric establishes completeness unless the fixture defines required content. Treat them as parts of a quality system, not a replacement for domain truth and security testing.

## Investigation Checklist

- [ ] Capture the exact query, packed context, prompt, model, answer, and citations.
- [ ] Split every factual statement into atomic claims with qualifiers preserved.
- [ ] Map each claim to exact supplied spans as supported, contradicted, absent, or ambiguous.
- [ ] Verify source authority, revision, and access separately from faithfulness.
- [ ] Repeat generation with gold context, removed evidence, conflicts, and distractors.
- [ ] Run current collections-based answer relevancy and faithfulness metrics.
- [ ] Calibrate evaluator thresholds and retain reasons and repeated outcomes.
- [ ] Test citation resolution and claim-to-citation alignment deterministically.
- [ ] Gate unsupported high-risk claims independently of aggregate relevance.
- [ ] Add the reviewed failure and perturbations to the regression suite.

## FAQ: Relevance and Faithfulness

### How can an answer be highly relevant but unfaithful?

It can directly answer the user's question while adding a date, amount, exception, or population claim that no supplied passage supports. Relevance concerns intent alignment; faithfulness concerns evidence support.

### Does low faithfulness prove the model hallucinated?

Not by itself. The context extraction may be incomplete, the claim may be ambiguous, or the evaluator may be wrong. Review atomic claims against the exact packed context before assigning a generation defect.

### Can a faithful answer still be wrong?

Yes. If the supplied source is stale, incorrect, poisoned, or unauthorized, a response can accurately repeat it and remain faithful. Source truth and governance require separate checks.

### Should citations automatically increase faithfulness?

No. Citation presence does not prove support. Resolve each citation, confirm it was supplied to the model, and verify that the cited span entails the associated claim.

### What should happen when context lacks one required fact?

The product policy should define whether to give a partial answer, ask for clarification, or abstain. The model should not fill the gap from memory when the application promises evidence-grounded answers.

### Is a perfect faithfulness score enough for release?

No. The answer can be faithful but irrelevant, incomplete, unsafe, or based on a stale source. Keep independent gates for relevance, required content, correctness, authorization, freshness, and citations.

### Why keep a manual claim ledger if Ragas extracts claims?

The ledger is an auditable ground truth for important cases and helps evaluate the evaluator. Automated extraction scales review, but it should be compared with adjudicated examples before it blocks releases.

### How should stochastic grading be handled in CI?

Pin evaluator configuration, repeat borderline cases, store every result and reason, and use deterministic invariants for high-risk claims. Do not retry silently until a desired score appears.

## Conclusion

High relevance with low faithfulness is a warning that usefulness and evidence have diverged. Preserve the exact context, break the answer into atomic claims, trace support span by span, and rerun controlled context variants. Pair current Ragas or Promptfoo metrics with deterministic citation and source rules. The goal is not to maximize one score; it is to ensure every important claim is both responsive to the user and defensible from authorized, current evidence.
`,
    },
  },
  {
    slug: 'rag-synthetic-testset-generation-ragas-guide-2026',
    clusterId: 'rag-testing',
    post: {
      title: 'Generate Synthetic RAG Testsets with Ragas and Your Documents',
      description:
        'Generate, validate, and govern synthetic RAG testsets with current Ragas concepts while controlling leakage, sampling bias, privacy, and held-out use.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Tutorial',
      image: '/blog/pillars/rag-testing.png',
      imageAlt:
        'Document knowledge graph feeding a reviewed and privacy-safe synthetic RAG evaluation testset',
      primaryKeyword: 'rag synthetic testset generation',
      keywords: [
        'rag synthetic testset generation',
        'ragas testset generator',
        'synthetic rag evaluation dataset',
        'ragas knowledge graph',
        'ragas query synthesizers',
        'rag test data validation',
        'held out rag testset',
        'rag evaluation dataset privacy',
      ],
      contentKind: 'child',
      pillarSlug: 'rag-evaluation-metrics-complete-2026',
      relatedSlugs: [
        'rag-evaluation-metrics-complete-2026',
        'rag-retrieval-vs-generation-failure-diagnosis-2026',
        'rag-context-precision-recall-guide-2026',
        'rag-high-relevance-low-faithfulness-diagnosis-2026',
      ],
      sources: [
        'https://pypi.org/project/ragas/',
        'https://docs.ragas.io/en/latest/getstarted/rag_testset_generation/',
        'https://docs.ragas.io/en/stable/concepts/test_data_generation/',
        'https://docs.ragas.io/en/stable/references/synthesizers/',
        'https://docs.ragas.io/en/stable/howtos/migrations/migrate_from_v03_to_v04/',
        'https://www.promptfoo.dev/docs/guides/evaluate-rag/',
      ],
      content: `RAG synthetic testset generation turns a reviewed document collection into candidate questions, reference material, and scenario metadata that can exercise retrieval and generation. Ragas can build those candidates from documents through a knowledge graph, transforms, scenarios, and query synthesizers. The generated rows are not ground truth by default: validate them, remove leakage, measure sampling bias, protect document privacy, and reserve a held-out portion before using results for release decisions.

Use the [complete RAG evaluation metrics guide](/blog/rag-evaluation-metrics-complete-2026) to choose scorers, then connect the generated set to the [retrieval-versus-generation diagnostic workflow](/blog/rag-retrieval-vs-generation-failure-diagnosis-2026), the [context precision, recall, and relevancy guide](/blog/rag-context-precision-recall-guide-2026), and the [high-relevance, low-faithfulness investigation](/blog/rag-high-relevance-low-faithfulness-diagnosis-2026). The [LLM application testing guide](/blog/testing-llm-applications-guide) covers evaluator reliability, while the existing [RAG benchmark dataset guide](/blog/rag-benchmark-dataset-guide-2026) helps frame benchmark governance. Browse reusable workflows in [/skills](/skills) and use the [Playwright CLI skill](/skills/Pramod/playwright-cli) when test cases must be replayed through a browser UI.

## What Ragas Generates and What It Does Not

Ragas describes synthetic test data generation as a way to reduce the manual work of curating diverse evaluation samples. Its current RAG testset documentation presents two main operations:

1. Build a \`KnowledgeGraph\` from source documents and enrich it with transforms.
2. Generate scenarios and test samples from that graph with query synthesizers.

The documented default synthesizer family includes single-hop specific, multi-hop abstract, and multi-hop specific queries. These categories help vary reasoning structure. They do not guarantee representation of your production languages, user roles, security boundaries, rare policy exceptions, malformed queries, or real distribution.

| Output | Useful for | Must still be validated | Not guaranteed |
|---|---|---|---|
| Synthetic user query | Expanding scenario coverage | Naturalness, answerability, persona fit | Production frequency |
| Reference answer or expected information | Context recall and answer checks | Accuracy, completeness, qualifiers | Independent ground truth |
| Reference contexts or source lineage | Retrieval labels and provenance | Correct revision, authorization, exact support | Safe disclosure |
| Synthesizer or scenario metadata | Slice analysis | Correct classification | Balanced sampling |
| Knowledge graph relationships | Multi-hop scenario construction | Domain validity and privacy | Business-authoritative ontology |

A generated testset is best treated as a candidate pool. Human-reviewed production failures and domain-authored critical cases remain essential. Synthetic generation is valuable because it can broaden combinations and expose neglected document relationships, not because it replaces subject-matter review.

## July 2026 Version Baseline

This tutorial was verified on July 14, 2026. PyPI lists Ragas 0.4.3 as the current release and requires Python 3.9 or newer. Pin \`ragas==0.4.3\` in a reproducible environment for these examples, then review migration and testset documentation before upgrading.

Ragas 0.4 changed metric APIs substantially: collections metrics return structured \`MetricResult\` objects and experiment-oriented workflows replace new uses of the legacy evaluation path. Testset generation uses a different surface. Current official testset documentation still shows \`TestsetGenerator\`, \`generate_with_langchain_docs\`, \`KnowledgeGraph\`, \`default_transforms\`, and \`default_query_distribution\`. Do not infer that metrics migration names apply to testset classes.

There is also a documentation detail worth making explicit: a rendered getting-started example shows one default query distribution, while the current synthesizer reference implementation builds an equal distribution across compatible default synthesizers and can filter them when a knowledge graph is supplied. Do not hard-code weights copied from a screenshot or prose example. Inspect the distribution returned by the pinned version, choose an intentional distribution for your dataset, and save it with the run manifest.

## Prerequisites and Data Authorization

Before installing a package or sending a document to a generator model, answer these questions:

- Which corpus snapshot is approved for evaluation generation?
- Does the selected LLM or embedding provider permit this data classification and region?
- May document text leave the environment, and what retention terms apply?
- Which fields contain personal, customer, credential, contractual, or regulated information?
- Which user roles are allowed to see each source?
- Who can validate generated questions and references?
- Which production traffic slices must the candidate pool represent?
- Which split will remain held out from prompt, retriever, and threshold tuning?

Use synthetic or redacted documents for initial pipeline development. A local-looking Python process can still send text to remote LLM and embedding providers. Review every adapter, endpoint, logging path, cache, trace, notebook, and exported dataframe.

Create a clean virtual environment and pin dependencies in a lock file. The minimal Ragas command is:

\`\`\`bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install "ragas==0.4.3"
python -m pip freeze > requirements.lock.txt
\`\`\`

Provider and document-loader packages depend on your approved stack. Install only the integration used by the code, and pin it too. Never place provider keys in notebooks, generated datasets, test prompts, or source documents.

## Build a Corpus Manifest Before Loading Documents

Every document needs lineage. At minimum, record source ID, revision, checksum, classification, authorization labels, language, document type, effective dates, and inclusion reason. Exclude duplicate, superseded, unauthorized, malformed, and out-of-scope material before generation.

\`\`\`json
{
  "corpus_id": "support-policies-2026-07-01",
  "documents": [
    {
      "source_id": "refund-policy-us-v4",
      "revision": "2026-06-28",
      "sha256": "replace-with-real-content-checksum",
      "language": "en-US",
      "classification": "internal-test-approved",
      "allowed_roles": ["support-agent"],
      "effective_from": "2026-07-01",
      "supersedes": "refund-policy-us-v3"
    }
  ],
  "generation_policy": {
    "remote_processing_approved": false,
    "redaction_profile": "policy-text-no-personal-data-v2"
  }
}
\`\`\`

The placeholder checksum must be replaced by the pipeline; it is not a valid content hash. A manifest makes it possible to regenerate a candidate set, remove cases derived from a withdrawn source, and prove that a held-out benchmark was not silently refreshed with tuned material.

Avoid using live production chat logs as source documents without a separate privacy and consent process. Even when names are removed, combinations of account details, issue descriptions, and timestamps can identify users. Production intent can be represented through approved aggregate labels and separately governed examples.

## Use the Document Convenience Workflow

The current Ragas getting-started guide documents \`generate_with_langchain_docs\` for LangChain documents and a corresponding method for LlamaIndex documents. The following wrapper accepts already approved and configured generator objects rather than assuming one provider. That keeps credentials and data-routing policy outside the tutorial.

\`\`\`python
from pathlib import Path
from ragas.testset import TestsetGenerator


def generate_candidate_pool(
    docs,
    generator_llm,
    generator_embeddings,
    testset_size: int,
    output_path: Path,
):
    generator = TestsetGenerator(
        llm=generator_llm,
        embedding_model=generator_embeddings,
    )
    testset = generator.generate_with_langchain_docs(
        docs,
        testset_size=testset_size,
    )
    frame = testset.to_pandas()
    frame.to_json(output_path, orient="records", lines=True)
    return frame
\`\`\`

The wrapper is reproducible only if the caller records the document manifest, Ragas version, provider adapter versions, generator model, embedding model, prompt or synthesizer configuration, and random controls exposed by those components. The exported rows still need validation before entering an evaluation suite.

Start with a small, non-sensitive sample. Inspect every field and several source-to-question traces. Confirm that the generated question is answerable from its assigned evidence and that the reference does not add facts from model memory.

## Understand the Knowledge Graph Workflow

For more control, the official guide constructs a \`KnowledgeGraph\`, adds document nodes, applies \`default_transforms\`, saves and reloads the graph, then creates a \`TestsetGenerator\` with that graph. This exposes the intermediate representation for inspection.

\`\`\`python
from ragas.testset import TestsetGenerator
from ragas.testset.graph import KnowledgeGraph, Node, NodeType
from ragas.testset.synthesizers import default_query_distribution
from ragas.testset.transforms import apply_transforms, default_transforms


def generate_from_graph(docs, generator_llm, generator_embeddings, size: int):
    graph = KnowledgeGraph()
    for doc in docs:
        graph.nodes.append(
            Node(
                type=NodeType.DOCUMENT,
                properties={
                    "page_content": doc.page_content,
                    "document_metadata": doc.metadata,
                },
            )
        )

    transforms = default_transforms(
        documents=docs,
        llm=generator_llm,
        embedding_model=generator_embeddings,
    )
    apply_transforms(graph, transforms)

    distribution = default_query_distribution(generator_llm, kg=graph)
    generator = TestsetGenerator(
        llm=generator_llm,
        embedding_model=generator_embeddings,
        knowledge_graph=graph,
    )
    return generator.generate(
        testset_size=size,
        query_distribution=distribution,
    )
\`\`\`

This follows the current reference signature that accepts an optional knowledge graph when selecting compatible synthesizers. Before operational use, save the graph to an access-controlled artifact, print and record the returned distribution, and validate that the selected synthesizers match the graph. If a version raises because no synthesizer is compatible, fix corpus transforms or choose an explicit supported synthesizer; do not catch the error and silently generate another dataset.

Knowledge graph persistence can increase privacy exposure because enriched nodes and relationships may reveal information not obvious in individual documents. Apply the same or stronger classification, access, and retention controls as the source corpus.

## Choose a Query Distribution from Risk and Traffic

A default distribution is a starting point, not a production model. Design the final mix from two views:

1. **Traffic representation:** common query types, languages, channels, roles, and source families.
2. **Risk representation:** rare but harmful failures, access boundaries, superseded policies, conflicts, unanswerable questions, and multi-hop evidence.

| Slice | Why include it | Sampling risk | Validation focus |
|---|---|---|---|
| Single-hop specific | Tests direct retrieval of one fact | Can dominate because it is easy to generate | Source and qualifier correctness |
| Multi-hop specific | Tests joining explicit evidence | Synthetic joins may be unnatural | Every hop and relationship validity |
| Multi-hop abstract | Tests conceptual synthesis | Judge may reward vague references | Answerability and reference specificity |
| No-answer or missing evidence | Tests abstention | Generators tend to invent an answer | Confirm evidence is genuinely absent |
| Conflicting revisions | Tests authority handling | Both sources may look equally valid | Effective date and supersession labels |
| Permission boundary | Tests authorization-aware retrieval | Generated query may imply forbidden role | User role and allowed-source contract |

Do not infer production performance from an intentionally balanced risk set without reweighting or separate reporting. Balanced datasets are useful for finding defects; traffic-weighted datasets estimate user exposure. Publish both views and label them.

## Prevent Training and Evaluation Leakage

Leakage occurs when information from the test set influences the system or decision rule being evaluated. Synthetic generation does not prevent it.

Common leakage paths include:

- Generating questions from the same chunks used to tune chunk size and selecting only cases that improve the chosen configuration.
- Including reference answers in prompts, retrieval indexes, few-shot examples, or reranker training data.
- Repeatedly editing prompts against held-out failures until they pass.
- Choosing thresholds after inspecting the final benchmark.
- Deduplicating by exact text while near-duplicate documents span train and held-out sets.
- Regenerating a failed held-out case and replacing it with an easier variant.

Split by source lineage or topic group, not only random rows. Questions derived from adjacent overlapping chunks can be near duplicates. If one appears in tuning and another in held-out evaluation, the apparent independence is weak.

Use three named partitions:

| Partition | May tune system? | May tune thresholds? | Primary use |
|---|---|---|---|
| Development | Yes | Preliminary only | Debug prompts, retrievers, fixtures, evaluators |
| Validation | Limited model selection | Yes, with recorded procedure | Compare candidates and calibrate gates |
| Held-out test | No | No | Final release estimate and audit |

After a held-out set materially influences a fix, retire or demote affected cases to regression and create a newly governed held-out set. Keep the failure as a deterministic regression; do not continue describing it as unseen evidence.

## Detect Sampling Bias

Synthetic generators reflect the input corpus, transform behavior, model preferences, and synthesizer configuration. They may overproduce well-structured English prose, named entities, short factual questions, or documents with rich metadata. Messy tables, scanned pages, minority languages, fragmented policies, and ambiguous user phrasing may be underrepresented.

Compare candidate and target distributions across:

- Source family and document length.
- Language, locale, and writing quality.
- Query length and linguistic complexity.
- Single-hop versus multi-hop structure.
- Answerable, partially answerable, contradictory, and unanswerable cases.
- User role and authorization level.
- Freshness, effective date, and superseded-source status.
- Tables, lists, images, OCR text, and plain prose.
- Common traffic versus rare high-risk workflows.

Do not hide gaps in one aggregate coverage percentage. Publish counts for every required slice and reject a candidate pool that has zero examples for a critical class. Add domain-authored cases where synthesis cannot produce realistic behavior.

## Validate Every Candidate in Stages

Validation should be stricter than metric scoring because it defines the evidence metrics will later consume.

**Stage 1: schema validation.** Require a stable ID, query, source lineage, reference, scenario type, generator manifest, split, and review status. Reject empty or malformed fields.

**Stage 2: source validation.** Verify that every referenced source exists in the approved corpus revision and that its authorization labels permit the intended test identity.

**Stage 3: answerability validation.** A reviewer confirms that supplied source spans support every reference claim and that no outside fact is required.

**Stage 4: naturalness validation.** Review whether a plausible user in the declared persona would ask the query without access to hidden document wording.

**Stage 5: uniqueness validation.** Detect exact and semantic near duplicates across all splits, grouped by source lineage.

**Stage 6: adversarial validation.** Add absent-evidence, conflicting-source, stale-source, distractor, permission, and prompt-injection cases deliberately.

**Stage 7: pilot execution.** Run baseline retrieval and generation, inspect score distributions and grader disagreements, and correct fixtures rather than automatically deleting hard cases.

\`\`\`yaml
case_id: refund-window-multihop-018
split: held-out
query: Which refund window applies to an annual plan renewed after July 1?
scenario: multi-hop-specific
source_ids:
  - billing-terms-2026-section-4
  - renewal-policy-2026-section-2
required_claims:
  - id: renewal-date-rule
    reviewer_status: approved
  - id: annual-plan-window
    reviewer_status: approved
privacy_review: approved-no-personal-data
leakage_group: annual-refund-policy-2026
review:
  answerable: true
  natural: true
  source_authorized: true
  reference_supported: true
\`\`\`

The schema is an example governance contract, not a Ragas package type. Store it beside exported Ragas fields or transform it into your repository's dataset format.

## Protect Document and Testset Privacy

Generated questions can reveal source details even when they do not quote text. A question about an unreleased product, employee case, customer incident, or confidential contract can itself be sensitive. References and knowledge graph relationships can expose more.

Apply these controls:

1. Classify source documents before loading.
2. Redact or replace personal and secret values at the source.
3. Use approved model and embedding endpoints for the classification.
4. Disable or govern provider retention and tracing according to policy.
5. Encrypt stored corpora, graphs, datasets, and run artifacts.
6. Restrict access by role and preserve source authorization labels.
7. Set retention and deletion procedures, including derived rows.
8. Scan generated output for secrets and personal data before export.
9. Use synthetic identifiers and accounts in executable fixtures.
10. Prevent test reports from publishing context or references to public CI logs.

Deletion needs lineage. If a source is withdrawn, locate graph nodes, generated questions, references, embeddings, cached prompts, and evaluation traces derived from it. A source ID and corpus manifest make that possible.

## Connect the Testset to Evaluation and CI

After review and splitting, execute the RAG system on each query and preserve retrieved contexts plus answers. Promptfoo's current RAG guide recommends evaluating retrieval separately from output generation. That matches the dataset design: source IDs and references support retrieval checks; response and delivered context support faithfulness and relevance checks.

Run a small development subset on pull requests, impacted source slices when documents change, and the held-out set only at controlled release points. Avoid exposing held-out expected answers in routine developer logs. Store results by immutable dataset revision.

Release reporting should include:

- Dataset and corpus revision.
- Count by split and required slice.
- Human validation and rejection rates.
- Duplicate and leakage-group results.
- Retrieval, generation, and end-to-end outcomes separately.
- Candidate versus baseline differences with confidence or repeated-run context.
- Grader and application versions.
- Known coverage gaps and privacy constraints.

Do not report a synthetic testset score as production accuracy. It measures performance on a generated and reviewed distribution. Production monitoring and sampled human audits remain necessary.

## Common Mistakes

**Accepting generated references as truth.** The same model that writes a question can invent a reference. Require source-level support review.

**Using only default synthesis.** Defaults do not know product traffic, risk, permissions, languages, or document formats. Design explicit slices.

**Hard-coding displayed default weights.** Current docs and reference behavior can evolve. Inspect and save the actual distribution for the pinned version.

**Random row splitting.** Overlapping chunks and related documents can leak near-duplicate facts across partitions. Split by source lineage or semantic group.

**Sending confidential documents to an unapproved endpoint.** Local code does not imply local processing. Audit LLM, embedding, logging, and cache destinations.

**Tuning on the held-out set.** Once failures guide changes, the set is no longer unseen. Preserve cases as regression tests and refresh held-out evidence under governance.

**Deleting every difficult case.** Hard cases may reveal fixture defects, but they may also expose real weaknesses. Adjudicate before removal and record the reason.

**Confusing diversity with representativeness.** A wide variety of synthetic questions can still badly misrepresent real traffic or high-risk scenarios.

## Limits

Synthetic generation is bounded by source quality. Missing, stale, contradictory, or biased documents produce weak candidates. Knowledge graph transforms and model-generated relationships can add errors. Human review reduces but does not eliminate them.

Ragas API behavior and documentation can change. Pin package and adapter versions, use current official references, and compile a small canary generation job before upgrading. Do not assume a migration in metric APIs changes testset generation identically.

No synthetic set can enumerate open-ended user behavior. Production failures, adversarial research, domain expertise, and privacy review must continue to feed the evaluation program. The best dataset is a governed portfolio, not one generated file.

## Synthetic Testset Checklist

- [ ] Pin Ragas, provider adapters, models, embeddings, and loaders.
- [ ] Approve corpus scope, classification, data route, retention, and reviewers.
- [ ] Build a lineage manifest with stable IDs, revisions, checksums, and access labels.
- [ ] Generate a small candidate pool and inspect source-to-question traces.
- [ ] Record knowledge graph transforms and the actual query distribution.
- [ ] Add traffic, risk, language, role, source, and answerability slices explicitly.
- [ ] Validate schema, source authority, answerability, naturalness, and uniqueness.
- [ ] Scan documents, graph artifacts, questions, references, and logs for sensitive data.
- [ ] Split by source lineage into development, validation, and held-out sets.
- [ ] Keep held-out results out of routine tuning and rotate compromised cases.
- [ ] Evaluate retrieval and generation separately before end-to-end scoring.
- [ ] Version the dataset and publish limitations with every release result.

## FAQ: Synthetic RAG Testset

### Does Ragas-generated data count as ground truth?

No. It is candidate evaluation data derived through documents, transforms, graph relationships, and generator models. Review source support, answerability, naturalness, privacy, and lineage before treating a row as an approved fixture.

### Which Ragas version does this tutorial assume?

It assumes Ragas 0.4.3, listed by PyPI as current on July 14, 2026. Pin the package and integrations, then recheck official testset and migration documentation before upgrading.

### Should I use the default query distribution unchanged?

Usually not. Inspect what the pinned version returns, then design a distribution around production traffic and high-risk gaps. Save the actual synthesizer classes and weights with the dataset manifest.

### How do I prevent leakage between tuning and testing?

Split by source lineage or semantic group, keep references out of prompts and indexes, reserve a held-out set before tuning, and retire held-out cases once they materially guide a change. Exact row-level random splitting is insufficient for overlapping documents.

### Can confidential documents be used safely?

Only under an approved data-processing design. Review LLM and embedding endpoints, provider retention, logging, caches, storage, access, and deletion. Prefer redacted or synthetic documents when possible and never assume that a local script keeps data local.

### How many synthetic cases should I generate?

There is no universal number. Choose enough reviewed cases to cover required traffic and risk slices and to support the release decisions being made. More unvalidated rows can increase false confidence rather than evidence.

### Should synthetic tests replace production examples?

No. Combine them with domain-authored critical cases, real failures, adversarial cases, and governed samples of production behavior. Each source covers a different part of the risk surface.

### What should happen when a source document changes?

Use lineage to identify affected graph nodes and test rows, revalidate or retire them, rerun impacted slices, and preserve the old dataset revision for audit. Do not silently mutate references under the same version.

## Conclusion

Ragas can efficiently transform documents into a broad candidate RAG testset through knowledge graphs, transforms, scenarios, and synthesizers. The engineering value appears only after governance: pin versions, trace every row to approved sources, validate references, measure sampling bias, protect private data, prevent leakage, and preserve a truly held-out set. Treat generation as the beginning of test design, not the end.
`,
    },
  },
];
