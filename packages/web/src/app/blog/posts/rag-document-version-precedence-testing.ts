import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'RAG document version precedence testing',
  description:
    'RAG document version precedence testing: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'AI Testing',
  primaryKeyword: 'RAG document version precedence testing',
  keywords: [
    'RAG document version precedence testing',
    'how to rag document version precedence testing',
    'rag document version precedence testing example',
    'RAG stale policy version test',
    'vector index version precedence',
    'RAG current document selection',
  ],
  relatedSlugs: [
    'ragas-rag-evaluation-metrics-complete-guide',
    'rag-regression-testing-guide-2026',
    'rag-retrieval-testing-best-practices-2026',
    'testing-rag-deleted-document-tombstones',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/retrieval',
    'https://docs.ragas.io/en/latest/references/evaluate/',
    'https://www.w3.org/TR/prov-o/',
  ],
  repoEvidence: [
    'seed-skills/rag-regression-testing/SKILL.md',
    'seed-skills/rag-evaluation-metrics/SKILL.md',
  ],
  content: `RAG document version precedence testing indexes old and current policy chunks under one source identity, then queries each rollout state with fixed metadata. A pass requires retrieval to rank only the approved current version for answer support and cite that version explicitly. Any stale winner, mixed-version answer, or missing provenance fails.

## What must RAG document version precedence testing prove?

This test must show which file wins when old and new files are both in the store. It does not delete the old file, since both must stay in place for the check. The chosen text and link must name the same new file.

- The primary invariant joins every revision through one stable source identity. Each chunk also carries a unique document version, approval status, effective time, ingestion run, and content hash, so two copies cannot be merged by a shared file name or close rank score alone.

- During a rollout, the current approved revision must outrank or exclude the older revision for present-time policy questions. The returned citation must expose the same version that supplied the answer, and the saved row must keep both its source ID and exact chunk ID for review.

- Historical queries can use a separate as-of policy when the product supports them. Do not let that valid feature weaken the default current-policy test or hide an unset effective time.

- The fixture needs conflicting facts because duplicate wording cannot prove precedence. For example, version one can state a 14-day window while version two states a 30-day window.

- The repository guidance in seed-skills/rag-regression-testing/SKILL.md names index rebuilds and retriever versions as sources of silent quality drift. It also tags reports with prompt, retriever, and judge versions for later diagnosis.

- Seed-skills/rag-evaluation-metrics/SKILL.md separates retrieval quality from answer faithfulness and relevance. That split lets this test locate a stale selection before generation turns it into fluent prose.

- The [RAG regression guide](/blog/rag-regression-testing-guide) covers broad metric drift. This article owns temporary coexistence, revision metadata, current selection, and citation-version agreement.

- A pass therefore requires exact IDs and metadata, not merely a correct-looking answer. The system can state the new policy by chance while citing or retrieving the old revision.

## Which repository behavior defines the test contract?

The repo sets the rule in two clear parts. It warns that a store build or rank change can harm answers, then asks each run to save key tool versions. Add the file version and chosen chunk to that same proof.

- In seed-skills/rag-regression-testing/SKILL.md, prompt changes, chunking changes, and index rebuilds can degrade results while code tests remain green. A coexistence fixture directly controls two of those inputs: indexed chunks and retriever policy.

- The report shape in that file includes prompt version, retriever version, and judge model. Add index build ID, source ID, selected document version, and citation version for this narrower contract.

- The [OpenAI retrieval guide](https://platform.openai.com/docs/guides/retrieval) describes file attributes and attribute filtering before semantic search. It supports comparison and compound filters that can represent status or effective-date policies.

- Filtering is only one implementation option. A reranker can apply precedence after broad recall, but the test must still observe candidates before policy, candidates after policy, and final rank.

- The [Ragas evaluate reference](https://docs.ragas.io/en/latest/references/evaluate/) documents evaluation over a dataset with selected metrics and runtime configuration. Use those metrics after deterministic version assertions, not as a replacement for exact provenance.

- The [PROV-O recommendation](https://www.w3.org/TR/prov-o/) defines revision as a form of derivation and supplies a relation for revised entities. A simpler product schema can still preserve the same source-to-revision idea.

- Seed-skills/rag-evaluation-metrics/SKILL.md requires a golden set and metric thresholds. This fixture extends each golden sample with expected source and expected current version.

- The [RAG evaluation metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) explains the wider score set. Current-version correctness remains a deterministic prerequisite before those aggregate scores are trusted.

## How to rag document version precedence testing?

Write two short files with one source ID and facts that clash. Mark each file with its version, state, start time, run ID, and text hash. Load both, fix the clock, and ask the same small set of questions.

- Use a fixed clock or pass an as-of time into the precedence function. Reading wall-clock time makes an effective-date boundary change depending on when CI runs.

- Represent approval as an enumerated status rather than a missing or truthy field. Values such as draft, approved, superseded, and withdrawn make malformed metadata easier to reject.

- Capture candidates before precedence so the fixture proves coexistence. Then capture eligible candidates, ranked chunks, selected context, generated answer, and citations as separate stages, with a fixed case ID joining all stage rows when CI writes the final store sheet.

- The first code example follows the versioned retriever principle in seed-skills/rag-regression-testing/SKILL.md. It tests an owned policy function with production-shaped metadata before any vector service is involved.

\`\`\`python
from dataclasses import dataclass
from datetime import datetime, timezone

import pytest


@dataclass(frozen=True)
class Chunk:
    chunk_id: str
    source_id: str
    version: int
    status: str
    effective_at: datetime
    text: str


def select_current(chunks: list[Chunk], as_of: datetime) -> Chunk:
    eligible = [
        chunk
        for chunk in chunks
        if chunk.status == "approved" and chunk.effective_at <= as_of
    ]
    if not eligible:
        raise ValueError("no-approved-version")
    source_ids = {chunk.source_id for chunk in eligible}
    if len(source_ids) != 1:
        raise ValueError("mixed-source")
    return max(eligible, key=lambda chunk: (chunk.effective_at, chunk.version))


NOW = datetime(2026, 7, 25, tzinfo=timezone.utc)
POLICIES = [
    Chunk("refund-v1-c1", "refund-policy", 1, "approved", datetime(2025, 1, 1, tzinfo=timezone.utc), "Refunds close after 14 days."),
    Chunk("refund-v2-c1", "refund-policy", 2, "approved", datetime(2026, 7, 1, tzinfo=timezone.utc), "Refunds close after 30 days."),
]


def test_current_revision_wins_while_both_exist() -> None:
    selected = select_current(POLICIES, NOW)
    assert selected.chunk_id == "refund-v2-c1"
    assert selected.source_id == "refund-policy"
    assert selected.version == 2
    assert "30 days" in selected.text
\`\`\`

- This pure function proves the precedence rule but not the vector index. Add an integration fixture that searches the controlled index and compares its observed candidate IDs with the same expected record.

- Use the [retrieval testing practices](/blog/rag-retrieval-testing-best-practices-2026) for ranking checks around the fixture. Keep the current-version oracle exact even when semantic scores vary slightly.

- The [deleted-document tombstone guide](/blog/testing-rag-deleted-document-tombstones) covers removal behavior. Here, version one remains available as a valid prior entity but cannot support a present-time answer.

## Rag document version precedence testing example: scenario and assertion matrix

The case grid should cover the time just before a new rule starts, the start time, and the time just after. Add a draft, a bad date, a copied chunk, and a link that names the wrong file.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Before effective time | Approved v1 plus future approved v2 | v1 is selected and cited | Future policy appears early | [OpenAI retrieval guide](https://platform.openai.com/docs/guides/retrieval) |
| Coexistence boundary | Approved v1 and effective approved v2 | v2 supplies context and citation | v1 outranks or mixes with v2 | seed-skills/rag-regression-testing/SKILL.md |
| Draft revision | Approved v1 plus newer draft v3 | Approved current version remains selected | Newest number wins despite draft status | seed-skills/rag-evaluation-metrics/SKILL.md |
| Repeated ingestion | Same v2 chunk arrives twice with one content hash | One logical chunk enters context | Duplicate text fills top ranks | seed-skills/rag-regression-testing/SKILL.md |
| Citation conflict | Answer uses v2 fact but citation names v1 | Gate fails with version mismatch | Correct prose creates a false pass | [PROV-O](https://www.w3.org/TR/prov-o/) |

- The before-effective row guards premature activation. Freeze the clock one instant before and at the effective boundary, then state whether equality activates the revision.

- The coexistence row is the main release case. Both revisions should appear in pre-policy candidates, while only the approved current one appears in selected answer context.

- The draft row proves that version number alone does not define authority. Approval and effective time must be applied before the tie-breaker chooses the newest eligible revision.

- The repeated-ingestion row protects ranking capacity. Duplicate chunks can crowd out useful context even when they contain the right current fact.

- The citation row separates generated truth from provenance truth. A response that says 30 days but points to version one is internally inconsistent and must fail.

- The [RAG regression guide](/blog/rag-regression-testing-guide) can add aggregate recall and faithfulness checks after this matrix. Preserve each scenario as a named case in the retained report.

## What failures expose RAG stale policy version test?

Fault tests should make the old file score best, make a draft look new, drop a date, or mix two sets of facts. A last test should give the right answer with the wrong link. Each fault needs one clear ID.

- Inject a higher semantic score for the stale chunk. The precedence layer must still enforce approved-current policy rather than treating vector similarity as the final authority.

- Inject a newer draft with a higher version number. A naive maximum-version rule should fail because draft content is not yet approved for user answers.

- Remove effective time from one revision and require a metadata error. Defaulting missing dates to the newest or oldest extreme creates an undocumented policy choice.

- Duplicate the current chunk under two ingestion IDs but one content hash. The test should either deduplicate or report the duplicate explicitly before context assembly.

- Generate a correct v2 answer while attaching a v1 citation. This mutation proves the citation assertion can catch a false pass based on answer text alone.

- The second code example verifies selected context, answer support, and citation version together. It extends the report identity required by seed-skills/rag-regression-testing/SKILL.md.

\`\`\`python
from dataclasses import dataclass


@dataclass(frozen=True)
class RagResult:
    answer: str
    context_chunk_ids: tuple[str, ...]
    citation_source_id: str
    citation_version: int
    retriever_version: str


def assert_current_result(result: RagResult) -> None:
    assert result.answer == "The refund window is 30 days."
    assert result.context_chunk_ids == ("refund-v2-c1",)
    assert result.citation_source_id == "refund-policy"
    assert result.citation_version == 2
    assert result.retriever_version == "precedence-v2"


def test_mixed_or_stale_evidence_is_rejected() -> None:
    stale = RagResult(
        answer="The refund window is 30 days.",
        context_chunk_ids=("refund-v2-c1", "refund-v1-c1"),
        citation_source_id="refund-policy",
        citation_version=1,
        retriever_version="precedence-v2",
    )
    with pytest.raises(AssertionError):
        assert_current_result(stale)
\`\`\`

- Add an answer claim extractor only if exact output is not stable. The core assertions should still name the selected chunk and citation version without relying solely on an evaluator.

- The [RAG evaluation metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) can score answer quality after exact checks. A judge should not decide whether version two is newer than version one.

## How should vector index version precedence run in CI?

Build a tiny new store from checked files in each CI run. Fix the time, load order, query text, rank size, and due chunk IDs. The job should save the rows seen both before and after the file rule.

- Build the index during the job rather than reusing a shared staging collection. Shared indexes can contain unrelated revisions and turn a contract failure into unexplained rank noise.

- Run each rollout state against a fresh namespace or reset index. Include before activation, exact activation, coexistence, draft, duplicate ingestion, and malformed metadata.

- Record index build ID, embedding model, chunker version, retriever version, filter policy, fixed clock, and fixture hash. These fields explain changed candidates without requiring the original service state, while the saved load order and store name let a reviewer rebuild the same small index from scratch.

- Set deterministic limits for top-k and returned context count. A larger top-k can reintroduce stale chunks even when the first rank remains current.

- Fail on an unexpected candidate, wrong selected version, duplicate content hash, mixed context, citation mismatch, missing report, or zero executed queries. Empty retrieval evidence cannot count as a clean current-policy result.

- Keep provider-backed generation optional in the fast job. A deterministic formatter can create the expected answer and citation from selected context, while a later suite evaluates natural language.

- The [RAG CI guide](/blog/rag-regression-testing-guide) can apply broader score floors. Run exact provenance checks first because no aggregate mean should excuse a stale policy answer.

- Retain candidate and selection manifests even on success. A future retriever upgrade can then show whether score changes altered policy outcomes or only ranking details.

## Which assertions verify RAG current document selection?

Check the source ID, file version, state, date, rank, chosen text, answer fact, and link. Also show that both files were in the store during the test. Finding the new file somewhere in the list is not enough.

- Assert one stable source ID across all revisions in the fixture. A changed source ID creates parallel documents and bypasses a precedence rule designed for revisions.

- Assert unique chunk IDs, document versions, content hashes, approval statuses, and effective times. Reject missing or malformed fields before semantic search enters the decision, and list each bad chunk ID so the load owner can fix data without rerunning the model step.

- Assert pre-policy candidates contain both versions during coexistence. This distinguishes a successful precedence rule from an index that accidentally omitted the stale version.

- Assert post-policy context contains only eligible current chunk IDs for a present-time query. When several current chunks exist, require every one to share the expected document version.

- Assert citation source and version against the context that supports each answer claim. A generic file name without version metadata cannot prove current provenance.

- Assert retriever, index, prompt, and judge versions in the result artifact. Repository evidence already treats these versions as necessary context for regression diagnosis.

- Assert unchanged index contents after querying. A read path should not mark stale revisions deleted merely to make the test pass.

- Use the [retrieval best practices guide](/blog/rag-retrieval-testing-best-practices-2026) for score and rank checks. Keep the authority policy separate from any claim that the highest semantic score is always correct.

## Step-by-step test implementation

Build from file IDs out to the final link. First prove both files exist, then apply the state and time rule, choose the due chunks, form the answer, and check its link. Save each step in the run log.

1. Read seed-skills/rag-regression-testing/SKILL.md and seed-skills/rag-evaluation-metrics/SKILL.md, then define source identity, version, approval, effective-time, rank, context, and citation fields.
2. Write conflicting v1 and v2 policy documents plus future, draft, malformed, duplicate, and historical variants under one stable source ID.
3. Build a disposable index with a fixed clock, explicit attributes, pinned chunking, and captured pre-policy candidates for every rollout state.
4. Apply the current-version rule, assert selected chunk IDs and metadata, then produce an answer and citation from only that chosen context.
5. Inject stale-score wins, newer drafts, missing dates, duplicate ingestion, mixed context, and citation conflicts, then require precise failures.
6. Run the focused pytest suite in CI, retain versioned manifests, clean its namespace, and release broader Ragas scoring only after exact checks pass.

- Start with one chunk per revision so rank and policy are easy to inspect. Add multi-chunk documents after the single-source contract behaves correctly.

- Freeze time through a passed value rather than monkey-patching several libraries. One explicit clock makes equality at the effective instant clear in code and artifacts.

- Build tests around source and version IDs before tuning embeddings. A stronger embedding model cannot solve approval or effective-date ambiguity in missing metadata.

- Use the [AI testing skills directory](/skills) to find RAG harness patterns, then keep the product's precedence rule beside its index adapter. Reviewers should not infer authority from a generic metric name.

- After deterministic selection passes, add Ragas faithfulness or context checks. Those scores provide wider evidence while exact citation assertions retain ownership of version truth.

- The [deleted-document guide](/blog/testing-rag-deleted-document-tombstones) is the next check when old data should disappear. Do not conflate that lifecycle state with temporary valid coexistence.

## Failure triage and regression ownership

Start with the store sheet and the list seen before the file rule. If the new file is gone, check load work, wait time, store name, and saved tags. If it is present but loses, check the rule and rank step.

- If both versions appear but version one survives policy, inspect approval, effective time, source grouping, and comparator logic. Record the rejected and accepted metadata side by side, including fixed clock time and rule version, so a rank change cannot be confused with a date check fault.

- If version two is selected first but stale context remains, context assembly or top-k trimming owns the defect. A correct top result cannot compensate for mixed evidence passed to generation.

- If context is current but the answer states an old fact, prompt or model behavior owns the result. The deterministic source evidence allows a faithfulness test to focus on generation.

- If answer and context agree but citation names version one, citation mapping owns the failure. Link citations to selected chunk IDs rather than searching file names after generation.

- If repeated ingestion crowds the candidate set, idempotency or deduplication owns the issue. Preserve ingestion IDs and content hashes so the duplicate source can be traced.

- If only CI fails, compare fixed clock, index readiness, embedding version, and namespace cleanup. The [RAG regression guide](/blog/rag-regression-testing-guide) can help separate infrastructure drift from quality drift.

- If historical queries fail while current queries pass, review the explicit as-of policy separately. Do not loosen present-time rules to repair a different product mode.

- Any intentional precedence change needs data and product owners. Updating expected version numbers without an approval record can normalize a stale-policy defect.

## Frequently Asked Questions

### How do you prove a RAG system prefers the current document version when old and new policy chunks coexist during an index rollout?

Index conflicting revisions under one source ID with explicit version, status, and effective-time metadata. Freeze the query time, capture candidates before and after policy, and assert selected chunk IDs. Then require the answer fact and citation version to match the approved current revision exactly.

### What fixture best tests how to rag document version precedence testing?

Use two short policy revisions with contradictory facts, plus future, draft, malformed, duplicate, and historical variants. Keep one source ID and unique chunk IDs. The fixture should expose pre-policy candidates, selected context, answer claims, citations, index build, retriever version, and fixed query time.

### Which failure signal proves rag document version precedence testing example?

The clearest signal names expected and observed revision evidence, such as expected v2 but selected chunk refund-v1-c1. Also report context IDs and citation version. A low aggregate metric is less useful because it cannot distinguish missing ingestion, bad filtering, mixed context, generation, or citation mapping.

### How should CI report RAG stale policy version test?

CI should retain fixture hash, fixed time, index build, candidate IDs, policy decisions, selected context, answer claim, citation source and version, and tool versions. It must fail on missing queries, stale selection, mixed revisions, duplicate content, or citation conflict, even when generated prose appears correct.

### When should vector index version precedence block a release?

Block when the approved effective revision is absent, stale content survives selection, a draft wins, duplicate chunks crowd context, versions mix, provenance is missing, or citation disagrees with support. Also block empty runs and unready indexes because neither provides evidence that current policy will answer users.

### How can teams keep RAG current document selection repeatable?

Commit tiny conflicting documents, freeze time, pin chunking and embeddings, build a disposable namespace, and assert exact IDs before model scoring. Record all version tags and content hashes. Run each rollout state independently, then compare retained candidate and selection manifests across retriever or index changes.

## Conclusion

RAG document version precedence testing is sound when valid revisions coexist yet only the approved effective version supplies current context and citations. The gate should reject stale rank wins, drafts, missing metadata, duplicate ingestion, mixed evidence, and citation conflicts before aggregate RAG scores are considered.

A small test set works best here. One short old rule and one short new rule make each wrong rank easy to spot. Keep both files with the run log so the same check can run after each store change.

Run it once just before the new rule starts and once at its start time. Those two runs show whether the time check uses the right edge. They also keep clock bugs apart from rank bugs.

Open the [RAG testing skills directory](/skills) to choose a focused evaluation skill, then read the [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) before implementing this regression gate. Keep the first store sheet as the base for each later rank change.`,
};
