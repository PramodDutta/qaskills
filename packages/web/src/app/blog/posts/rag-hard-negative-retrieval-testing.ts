import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'RAG hard negative retrieval testing',
  description:
    'RAG hard negative retrieval testing: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'RAG hard negative retrieval testing',
  keywords: [
    'RAG hard negative retrieval testing',
    'how to rag hard negative retrieval testing',
    'rag hard negative retrieval testing example',
    'RAG hard negative dataset',
    'near match retrieval fixture',
    'semantic search false positive test',
  ],
  relatedSlugs: [
    'ragas-rag-evaluation-metrics-complete-guide',
    'rag-regression-testing-guide-2026',
    'rag-retrieval-testing-best-practices-2026',
    'retrieval-relevance-testing-guide-2026',
  ],
  sources: [
    'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-rank-eval.html',
    'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/',
    'https://arxiv.org/abs/2309.15217',
  ],
  repoEvidence: [
    'seed-skills/rag-evaluation-metrics/SKILL.md',
    'seed-skills/rag-regression-testing/SKILL.md',
  ],
  content: `RAG hard negative retrieval testing starts with one reviewed answer source and several likely texts that share its terms but use the wrong name, date, product, or rule. A sound search tool ranks the labeled source above each set distractor, keeps every query label, and reports any near match that enters the accepted result set.

## What must RAG hard negative retrieval testing prove?

RAG hard negative retrieval testing must prove rank choice, not merely source recall. The expected source must outrank every labeled near match for each reviewed query.

A hard wrong source looks useful because it shares key words, shape, or subject matter. It stays wrong because one key fact makes it unable to back the requested answer.

For a refund query, change only the product class, country, start date, or allowed state. This design keeps word overlap high while giving readers a clear reason it fails.

The fixture needs one clear right ID and ordered wrong IDs for every query. Labels must stay beside the query instead of being guessed later from found text.

The golden data in \`seed-skills/rag-evaluation-metrics/SKILL.md\` stores a question, reference answer, and source contexts. That shape supports a clear add-on with source IDs, wrong labels, and set change fields.

The gate should inspect ranks before any answer generator can hide a retrieval mistake. A fluent answer cannot repair a source list that placed an incorrect policy above the approved policy.

The [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) explains broad search scores. This narrow check owns word and meaning distractors whose wrong facts are known before a run.

Keep one control query with an easy right source so the harness proves basic search still works. Then use hard pairs to show whether name, time, scope, and reversed facts affect rank.

The [Ragas paper](https://arxiv.org/abs/2309.15217) splits search context quality from answer quality in its test frame. That split supports a release signal based on ranked proof rather than generated wording.

Browse the [AI testing skills](/skills) for wider test flows, but keep this gate focused. Its pass rule is a full set of query-level rank choices with no bad support label.

## Which repository behavior defines the test contract?

The repo contract begins with saved test data, then makes clear ranks and a case report. It does not begin with a model response or an average score.

Lines 39 through 72 of \`seed-skills/rag-evaluation-metrics/SKILL.md\` define a golden sample with a question, ground truth, and reference contexts. Those fields show what a correct source must support before search runs.

Extend that record without replacing its meaning. Add \`case_id\`, \`positive_id\`, and a list of wrong sources with one source ID plus a clear fail reason.

The input also needs one fixed data version and one search setup. Record the vector model, index version, rank-step version, and \`top_k\` value with every result report.

A run returns ordered source IDs and scores for each case. The harness gets the right rank, wrong ranks, accepted IDs, and any label mismatch from that stable output.

Lines 27 and 28 of \`seed-skills/rag-regression-testing/SKILL.md\` require an approved base path and a hold for hard samples. A hard case thus stays shown when it becomes unstable instead of leaving the full count.

A hold is a state with an owner, reason, and end date, not a silent skip. CI should report held cases on their own and refuse a run where the active case count changes without review.

The [RAG retrieval practices guide](/blog/rag-retrieval-testing-best-practices-2026) covers broad rank drift. Here, the base stores per-query labels and expected order so one bad match cannot hide inside a healthy mean.

Repo facts and outside rules have distinct roles. The repo supplies the data shape and review rule, while the [Elastic rank evaluation API](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-rank-eval.html) shows rated requests and per-query rank facts.

The final report should hold the setup ID, data ID, case counts, ordered results, and exact check states. Those fields let a reader replay the fault without trusting a summary line.

## How to rag hard negative retrieval testing?

To learn how to rag hard negative retrieval testing, begin with fact changes that readers can explain in one line. Each wrong source should vary from the right source on one answer-bearing point when possible.

Start from a policy passage that answers a stable query. Create sibling passages for the wrong region, an expired date, another product tier, and a sentence where negation reverses eligibility.

Keep length, repeated terms, and layout close across siblings. If the wrong source is shorter or uses other words, a passing result may prove only an easy word match.

Give every passage a fixed ID and a clear label. Useful labels include \`wrong_entity\`, \`wrong_date\`, \`wrong_product\`, \`wrong_policy\`, and \`negated_fact\`.

The first real example follows the golden-sample idea in \`seed-skills/rag-evaluation-metrics/SKILL.md\`. It tests supplied ranks, so it stays fixed and never calls a vector service.

\`\`\`python
from dataclasses import dataclass


@dataclass(frozen=True)
class RetrievalCase:
    case_id: str
    positive_id: str
    hard_negative_ids: tuple[str, ...]


def assert_positive_leads(case: RetrievalCase, ranked_ids: list[str]) -> None:
    assert len(ranked_ids) == len(set(ranked_ids))
    assert case.positive_id in ranked_ids
    positive_rank = ranked_ids.index(case.positive_id)
    negative_ranks = [
        ranked_ids.index(doc_id)
        for doc_id in case.hard_negative_ids
        if doc_id in ranked_ids
    ]
    assert all(positive_rank < rank for rank in negative_ranks)


def test_refund_policy_ranking() -> None:
    case = RetrievalCase(
        case_id="refund-digital-us",
        positive_id="policy-digital-us-2026",
        hard_negative_ids=(
            "policy-physical-us-2026",
            "policy-digital-eu-2026",
            "policy-digital-us-2024",
        ),
    )
    assert_positive_leads(
        case,
        [
            "policy-digital-us-2026",
            "policy-digital-eu-2026",
            "policy-physical-us-2026",
        ],
    )
\`\`\`

The check covers unique IDs, presence, and relative order instead of one score threshold. It also allows an absent wrong source outside the requested result window while keeping exact accepted IDs.

Store the source text and change note beside each source, but compare IDs in the gate. Text checks can break after safe layout edits and hide a swapped ID.

Use the [retrieval relevance guide](/blog/retrieval-relevance-testing-guide-2026) for broad qrel design. This fixture tests whether likely wrong facts displace a known right source.

Run the same cases against a simple word-match base and the live search code. The base helps tag a hard sample, while only the live result controls release.

## Rag hard negative retrieval testing example: scenario and assertion matrix

A rag hard negative retrieval testing example should include a clean base, an exact edge, and a broken order. Repeat runs and service errors complete the proof needed for CI.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Baseline | One positive plus wrong region, date, and product siblings | Positive identifier ranks first and labels remain complete | Any negative outranks the positive | \`seed-skills/rag-evaluation-metrics/SKILL.md\` |
| Exact boundary | Positive at rank two with accepted \`top_k\` of two | Positive is accepted only when the policy allows rank two | Positive falls outside the declared window | [Elastic rank evaluation](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-rank-eval.html) |
| Negative mutation | Wrong policy receives the positive label | Label validator rejects the case before scoring | Mislabeled evidence enters the accepted set | \`seed-skills/rag-regression-testing/SKILL.md\` |
| Repeated execution | Same corpus and pinned configuration run three times | Ordered identifiers and counts remain equal | Rank order or denominator changes | [Ragas metrics](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/) |
| Dependency failure | Retriever raises a controlled timeout for one case | Report marks one error and remains incomplete | Partial results are reported as a pass | \`seed-skills/rag-regression-testing/SKILL.md\` |

The edge row must match the product rule rather than a broad ideal. If the app accepts two sources, require the right source inside two and each known wrong source below it.

Do not use equal match scores without a written tie breaker. An unstable tie can swap IDs and make a stable fixture appear flaky.

Record the full ranked list needed by the check, not only the winning passage. The losing order often shows whether one change family caused the fault.

The [RAG retrieval practices guide](/blog/rag-retrieval-testing-best-practices-2026) provides surrounding suite advice. This matrix remains useful because each row has one controlled input and one stable failure signal.

## What failures expose RAG hard negative dataset?

A RAG hard negative dataset exposes faults when a likely wrong passage gains rank for the wrong reason. The test must split search behavior, label faults, and a missed run.

First, swap the right and one wrong label without changing text. A first check should reject repeat right labels, unknown source IDs, and any wrong source also marked as proof.

Next, push the right source just outside the accepted window. The report should show its exact rank and the IDs that displaced it rather than returning only \`false\`.

Then remove one result case from the runner output. Case counts must compare expected, done, failed, and held IDs before any rollup can pass.

The second example follows the hold rule in \`seed-skills/rag-regression-testing/SKILL.md\`. It keeps every case result and rejects a false pass caused by partial results.

\`\`\`python
def build_gate_report(expected_ids: set[str], rows: list[dict]) -> dict:
    seen_ids = [row["case_id"] for row in rows]
    missing = sorted(expected_ids.difference(seen_ids))
    duplicates = sorted(
        case_id for case_id in set(seen_ids) if seen_ids.count(case_id) > 1
    )
    failed = sorted(
        row["case_id"]
        for row in rows
        if row["status"] == "complete" and row["positive_rank"] != 1
    )
    return {
        "expected": len(expected_ids),
        "completed": len(rows),
        "missing": missing,
        "duplicates": duplicates,
        "failed": failed,
        "pass": not missing and not duplicates and not failed,
    }


def test_partial_run_cannot_pass() -> None:
    report = build_gate_report(
        {"refund-us", "refund-eu"},
        [{"case_id": "refund-us", "status": "complete", "positive_rank": 1}],
    )
    assert report["missing"] == ["refund-eu"]
    assert report["completed"] == 1
    assert report["pass"] is False
\`\`\`

Also inject a search timeout after one successful case. The report should keep both results, mark the run not complete, and return a failing process status.

Test a stale data ID by running current labels against an older index version. The harness should stop before ranking because source IDs may no longer describe the indexed text.

Repeat a case with the same ID and new query text. Reject that input in the first check, since repeated IDs make trend reports and ownership unclear.

The [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) describes base score work. An approved update may change labels, but a routine run must never repair failed data on its own.

## How should near match retrieval fixture run in CI?

A near match retrieval fixture should run with committed data, pinned retrieval settings, and isolated output. CI must know the expected case count before the first query executes.

Keep fixture sources in a versioned folder and build a fresh test index for the job. Shared staging indexes can change during a run and make sound rank proof void.

Pin the vector model, text rules, rank step, \`top_k\`, and tie-break settings where the platform allows it. Save the set values because a default can change without a fixture diff.

Use a focused timeout for each search and a separate timeout for the whole suite. A timed-out case is a clear error, not an empty result that can satisfy an absence check.

Create one report folder per run ID. Write the setup, data digest, labels, raw ranks, and final choices before the process returns its gate status.

Run fixed first checks on each pull request, then choose a sound plan for slower remote search. The [blog index](/blog) links broad CI and test isolation advice.

Parallel workers may read one fixed data set, but they should write separate case files. Merge results by sorted case ID so finish timing cannot change report order.

Check cleanup by proving that the short-lived index and output staging area no longer exist. Keep only the saved report needed for review, with secrets and query keys removed.

Block release for wrong order, bad support labels, missing cases, repeat cases, stale data IDs, or an unhandled service error. Hold changes need a clear approved data diff.

The final CI line should state active, passed, failed, errored, and held counts. A green job with no active cases is false even when each number check is true.

## Which assertions verify semantic search false positive test?

A semantic search false positive test needs exact order, count, source, and state checks. An existence-only check can pass while the right source sits below an accepted distractor.

Assert that the result list has unique source IDs and the set max length. Repeat chunks can fill the window and hide a missing source without changing raw match scores.

Assert that the right ID exists and record its one-based rank. Then compare that rank with each present wrong source from the same case.

Assert the accepted set contains no ID tagged wrong. This direct rule catches a bad match even when the right source also appears in the result window.

Check label origin by storing the fixture version and data digest in each case result. A correct rank against unknown data is not valid proof for the reviewed contract.

Check state by requiring each expected case to end as passed, failed, errored, or held. Pending, skipped, and absent states must prevent a release choice.

Check score values for finite numbers when the search code shows them, but do not assume scores compare across systems. Relative order and IDs provide the stable contract here.

Check side effects by proving the test index is gone and the live index name was never opened for writes. This keeps the test from changing shared search state.

Use the [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) when adding context precision or recall. Keep the bad-match check shown even if a wider score also fails.

Treat context precision as a supporting diagnostic, while per-query source identity remains the release oracle. Aggregate retrieval metrics can describe broad movement, but they cannot replace deterministic provenance, ordering, and case-completeness checks for this targeted failure mode.

Preserve similarity scores as secondary telemetry because their scale may change across retriever implementations. The release decision should still use labeled document provenance and relative ranking, which stay interpretable when model-specific score calibration shifts.

A strong failure message names the case, right rank, wrong source, change reason, data version, and search version. That detail directs triage without generating or judging an answer.

## Step-by-step test implementation

Implement RAG hard negative retrieval testing as a six-step path from reviewed proof to a saved CI choice. Each step should leave a small report that the next step can check.

1. Read \`seed-skills/rag-evaluation-metrics/SKILL.md\` and \`seed-skills/rag-regression-testing/SKILL.md\`, then record the golden sample fields, baseline policy, and quarantine rule.
2. Create isolated query cases with one positive and controlled negatives for entity, date, product, policy, and negation changes, using immutable document identifiers.
3. Build a fresh test index, pin the retrieval configuration, and save the corpus digest before executing any case against the deterministic harness.
4. Run every active case, capture ordered identifiers and scores, and assert that the positive outranks each present hard negative inside the accepted window.
5. Inject label swaps, stale corpus identity, missing output, duplicate output, and a dependency timeout, then require explicit failing states and complete accounting.
6. Run the focused suite in CI, publish sorted case evidence, remove temporary state, and assign each failure to its data, retrieval, harness, or platform owner.

Start with ten well-reviewed cases instead of hundreds of weak changes. A reader should be able to explain why each wrong source cannot answer its paired query.

Add new cases from real search misses and keep their first proof. The [QA skills directory](/skills) can support related work, while this suite remains the source of rank truth.

Do not update expected ranks in the same change that alters search behavior without review. Separate diffs make a product fix distinct from a relaxed gate.

After local success, run one clean CI job and one set failing branch. Confirm that the report survives failure and gives the same case order in both runs.

## Failure triage and regression ownership

Triage starts with the saved IDs and setup, not the generated answer. First confirm that the expected case count, data digest, and fixture version match the approved base.

If labels are missing, repeated, or at odds, the data owner fixes the fixture. Search owners should not tune ranks against a bad fit contract.

If labels are valid but the wrong source ranks higher, compare change families. A rise across wrong-date cases points to other work than a rise limited to product-name siblings.

If order changes only after a vector model or rank-step version, assign the fault to search setup. Keep both old and new ranked lists in the review report.

If the same inputs produce new ties, inspect score detail, tie breakers, and index order. The harness owner should make result sorting clear before changing thresholds.

If one case is absent or repeated, inspect worker output and merge logic. A complete mean cannot make up for a lost case ID.

If the search code timed out, keep the partial facts but mark the run not complete. Platform owners can inspect delay without letting a partial report approve release.

If only a held case fails, check its owner and end date before accepting the run. An expired hold should fail because unfixed hard examples cannot stay hidden forever.

The [retrieval relevance guide](/blog/retrieval-relevance-testing-guide-2026) can help read broad rank moves. This choice path stays tied to one right source, named wrong sources, and saved ranks.

Close triage with one owner and one proof link per failure. Avoid a vague RAG issue when the report already names data, rank, run, or platform.

## Frequently Asked Questions

### How do you curate near-match documents that share vocabulary but contain the wrong entity, date, product, or policy for RAG retrieval tests?

Start from one reviewed source passage, then change a single answer-bearing fact while preserving topic, length, and key terms. Label each change with its wrong point and fixed ID. A reader must explain why it cannot support the query before the source enters the fixture.

### What fixture best tests how to rag hard negative retrieval testing?

Use a committed case with one right source and several set siblings covering name, date, product, policy, and reversed facts. Store expected IDs, fail reasons, data version, and search settings. Run it against an isolated index so other source changes cannot alter the result.

### Which failure signal proves rag hard negative retrieval testing example?

The clearest signal is a named hard negative ranking above the right source or entering the accepted result set. Report both ranks, IDs, labels, and the change reason. Also fail when the right source is missing, labels clash, or the case never reaches a final state.

### How should CI report RAG hard negative dataset?

CI should report expected, active, passed, failed, errored, and held counts with sorted case IDs. Each failed case needs the right rank and wrong source. The report must include data and search versions, and any missing or repeat case should make the whole run not complete.

### When should near match retrieval fixture block a release?

Block when a wrong source outranks the right source, enters the accepted set, receives a support label, or hides a missing source. Also block stale data IDs, a partial run, expired holds, and service errors. An approved hold may defer one case, but it must remain counted and owned.

### How can teams keep semantic search false positive test repeatable?

Commit the data and labels, pin search settings, build an isolated index, and sort merged results by case ID. Save data digests and the set setup with every run. Set service faults and cleanup checks should produce the same final states without touching live data or services.

## Conclusion

RAG hard negative retrieval testing is ready to gate release when each reviewed right source outranks its likely wrong siblings, case counts are complete, and the report keeps labels, ranks, and setup. Missing cases, stale data, false support, and service errors must remain clear failures.

Open the [AI testing skills directory](/skills) to choose a focused test flow. Then read the [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) before adding this fault gate to CI.`,
};
