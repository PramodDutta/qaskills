import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'RAG query rewrite regression testing',
  description:
    'RAG query rewrite regression testing: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'RAG query rewrite regression testing',
  keywords: [
    'RAG query rewrite regression testing',
    'how to rag query rewrite regression testing',
    'rag query rewrite regression testing example',
    'RAG rewritten query contract',
    'query expansion regression suite',
    'retrieval query semantic preservation',
  ],
  relatedSlugs: [
    'ragas-rag-evaluation-metrics-complete-guide',
    'rag-regression-testing-guide-2026',
    'rag-retrieval-testing-best-practices-2026',
    'rag-regression-testing-cicd-2026',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/retrieval',
    'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-rank-eval.html',
    'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/',
  ],
  repoEvidence: [
    'seed-skills/rag-regression-testing/SKILL.md',
    'seed-skills/rag-evaluation-metrics/SKILL.md',
  ],
  content: `RAG query rewrite regression testing compares each rewritten query with checked meaning facts from its source request before search begins. It must keep names, constraints, the word "not," time scope, and user intent, while adding only listed search terms. The gate rejects dropped restrictions, changed identities, broader access, stale rewrites, missing cases, and unreviewed additions.

## What must RAG query rewrite regression testing prove?

RAG query rewrite regression testing must prove that a rewrite keeps every required fact and introduces only an approved term for search. The check runs before document ranking, so a favorable search score cannot excuse a changed name, lost negation, altered date range, or broadened access scope.

A rewrite is an intermediate request, not merely hidden prompt text. It determines which documents become candidates and can change the question that later reply appears to answer.

Define source semantics as checked fixture data. Record required names, products, places, dates, numeric bounds, negated concepts, access rules, language, intent, and any extra terms the case permits.

Use one row for each case and give that row a short, fixed case key. Put the same key on the source text, the new text, each rule, and the pass or fail note.

Mark each fact as must stay, may shift, or may be added to aid search. This small tag set keeps the rule clear when two good forms use a new word order.

Do not require exact string equality for valid paraphrases. Instead, combine exact checks for must-keep facts with case-specific allowed forms and a checked expected rewrite where the application promises fixed output.

The [OpenAI retrieval guide](https://platform.openai.com/docs/guides/retrieval) documents meaning search over vector stores and query-driven result ranking. A rewrite test stays before that boundary and verifies the query supplied to search.

The [Elasticsearch rank test API](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-rank-eval.html) evaluates ranked search results against rated documents. Use it after rewrite validity passes, because rank metrics cannot tell whether a changed query still represents the user's request.

The [Ragas metric list](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/) describes metrics for search and reply quality. Those measures add downstream proof but should not replace fixed checks for must-keep query facts.

Keep this contract split from returned-document analysis. The [RAG retrieval testing guide](/blog/rag-retrieval-testing-best-practices-2026) covers ranking and context, while this test owns the text and filter fields passed into search.

Use the [RAG regression guide](/blog/rag-regression-testing-guide) for the larger suite and the [skills directory](/skills) for adjacent checks. A rewrite must pass meaning preservation before any downstream score is fit for release comparison.

## Which repository behavior defines the test contract?

The first repository anchor is \`seed-skills/rag-regression-testing/SKILL.md\`. Lines 63-68 identify the prompt version, search tool version, dataset path, and baseline path inside a frozen test setup.

Those fields make the pre-search stage traceable. Add a tool version, rewrite prompt rev, rule-set rev, and fixture rev so every saved rewritten query identifies the logic that produced it.

The second anchor is \`seed-skills/rag-evaluation-metrics/SKILL.md\`. Lines 21-28 state that search and reply are split subsystems and assign different metrics to each side.

The same separation applies one step earlier. Query rewriting needs its own pass or fail record because a downstream search tool may compensate for one changed word on an easy dataset while failing elsewhere.

Execute the contract in a fixed order. Load the source case, run the tool, parse any filter output, compare must-keep facts, record allowed extra terms, and only then invoke search.

Save both raw and normalized text. Raw text supports reproduction, while normalized tokens and set facts make stable assertions possible without losing the original proof.

Each result should contain case ID, source query, rewritten query, filter fields, tool version, expected facts, observed facts, extra-term diff, and pass state. Downstream result IDs must link to that same case and rewrite rev.

The [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) explains later search and answer measures. This article adds a preceding contract so those scores describe the requested task rather than an altered one.

The [RAG CI guide](/blog/rag-regression-testing-guide) can orchestrate both stages. Keep rewrite proof in its own artifact so owners can stop the pipeline before paying for search and reply.

## How to rag query rewrite regression testing?

To learn how to rag query rewrite regression testing, build a table of checked source queries, expected rewrites, must-keep facts, and approved added terms. Run a fixed fake first, then apply the same assertions to captured outputs from the production tool.

Start with cases that make one meaning feature obvious. Include a named item, a not clause, a date bound, an access rule, a quoted phrase, and a follow-up query whose context must be resolved.

For each case, identify facts that must match exactly and terms that may vary. A product code or tenant ID needs exact preservation, while a known acronym may permit one checked expanded form.

The positive fixture below follows the versioned search tool setup pattern in \`seed-skills/rag-regression-testing/SKILL.md\`. It adds checked rewrite facts and blocks search until the contract passes.

\`\`\`python
from dataclasses import dataclass

@dataclass(frozen=True)
class RewriteCase:
    case_id: str
    source: str
    expected: str
    required_entities: tuple[str, ...]
    required_negations: tuple[str, ...]
    required_filters: dict[str, str]
    allowed_expansions: tuple[str, ...]

def test_rewrite_preserves_reviewed_semantics():
    case = RewriteCase(
        case_id="rewrite-44",
        source="EU invoices for ACME-17 after 2025, not canceled",
        expected="ACME-17 EU invoices after 2025 excluding canceled invoices",
        required_entities=("ACME-17", "EU"),
        required_negations=("canceled",),
        required_filters={"after_year": "2025", "status_not": "canceled"},
        allowed_expansions=("invoices",),
    )
    result = run_rewriter(case.source, version="rewrite-v4")
    grade = grade_rewrite(case, result)

    assert result.text == case.expected
    assert grade.passed is True
    assert grade.missing_facts == []
    assert grade.unapproved_expansions == []
    assert result.filters == case.required_filters
    assert retrieval_calls == []
\`\`\`

The exact expected string is appropriate only because this fixture's fake tool promises fixed output. Production captures can allow checked paraphrases while retaining exact names, not clauses, filters, and case accounting.

Keep fact extraction independent from the tool under test. If both use the same prompt and model, one interpretation error can appear as agreement rather than a defect.

Use simple fixed extractors where formats permit them. IDs, quoted phrases, dates, enum rules, comparison operators, and explicit not markers often support direct checks.

For natural-language intent, store a human-checked label and allowed rewrite set. Add a calibrated meaning check only as supporting proof, never as permission to alter must-keep facts.

Run the rewrite stage without a search tool in the positive contract. The assertion that \`retrieval_calls\` stays empty proves invalid rewrites cannot consume downstream services.

The [retrieval best practices guide](/blog/rag-retrieval-testing-best-practices-2026) can consume fit rewritten queries next. This first fixture remains small enough for a reviewer to compare every fact by eye.

## Rag query rewrite regression testing example: scenario and assertion matrix

This rag query rewrite regression testing example isolates common meaning changes with checked facts and stable failure codes. Each row stops before search when its rewrite contract fails.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Baseline rewrite | Entity, date, region, and negation | All protected facts retained with one approved expansion | Missing fact or unapproved term | \`seed-skills/rag-regression-testing/SKILL.md\` |
| Empty follow-up | Blank turn with no usable history | Named insufficient-context result and no retrieval | Stale prior query reused | OpenAI retrieval guide |
| Negation loss | "not canceled" becomes "canceled" | Contract fails before rank evaluation | Polarity change or removed exclusion filter | \`seed-skills/rag-evaluation-metrics/SKILL.md\` |
| Repeated execution | Same case and rewriter version twice | Equal rewrite record and separate attempt IDs | Drift, duplicate case, or shared mutable output | Rewrite fixture ledger |
| Rewriter outage | Dependency times out after no output | Bounded incomplete result with source preserved | Empty rewrite passed to retrieval | Ragas metric list |

The empty follow-up row should not invent context. If chat history cannot resolve the request, return a named insufficient-context state rather than reusing another user's or earlier case's query.

The negation row compares both text and filter fields. A rewrite can keep the word "not" in prose while accidentally sending an inclusive status rule to the search tool.

For repeated execution, compare the full meaning record rather than generated wording alone. The same version and fixture should preserve facts, rules, allowed added terms, and pass state.

The outage row needs a complete case record with no rewrite output and zero search calls. Missing work should not disappear from the denominator or become an empty search.

Add one dependency recovery case with a known retry policy. Attempt IDs should differ, but the logical case, source query, and final meaning contract must remain unchanged.

Use the [RAG regression guide](/blog/rag-regression-testing-guide) for larger datasets. This matrix should grow from observed rewrite defects, with one controlled meaning feature added per case.

## What failures expose RAG rewritten query contract?

A RAG rewritten query contract fails when a must-keep fact is absent, changed, reversed, or attached to another field. It also fails when added term introduces an unreviewed name, broader time range, wider tenant scope, or a new intent.

Inject failures by changing fixture outputs, not production prompts. Drop a not clause, replace one name, shift a date, remove a rule, add a broader category, reuse stale context, or return a partial filter object.

The negative grader below compares case facts before search. It returns stable reason lists and keeps the original source and rewrite rev for diagnosis.

\`\`\`python
def grade_rewrite(case: RewriteCase, result: RewriteResult) -> RewriteGrade:
    missing = [
        value for value in case.required_entities
        if value not in result.text
    ]
    changed_filters = {
        key: {"expected": value, "actual": result.filters.get(key)}
        for key, value in case.required_filters.items()
        if result.filters.get(key) != value
    }
    extra = sorted(set(result.expansions) - set(case.allowed_expansions))
    reasons = []
    if missing:
        reasons.append("required entity missing")
    if changed_filters:
        reasons.append("protected filter changed")
    if extra:
        reasons.append("unapproved expansion")

    return RewriteGrade(
        passed=not reasons,
        reasons=reasons,
        missing_facts=missing,
        changed_filters=changed_filters,
        unapproved_expansions=extra,
        retrieval_eligible=not reasons,
    )
\`\`\`

Add an explicit negation field instead of relying only on substring checks. Terms can remain present while polarity changes, so the fixture should compare normalized include and exclude facts.

Add a wrong-name case where the replacement is valid in the corpus. Search may return strong documents for that name, making downstream precision look good while answering another request.

Add an access case that removes a tenant or region rule. This is a release-blocking meaning change even when all returned documents are relevant to the broader query.

Add a partial-output case with valid text but missing filter fields. If production search consumes both channels, the contract must compare both before pass state.

Add a skipped case and require complete planned IDs. A suite that grades only emitted rewrites can report a perfect pass after the tool silently drops difficult inputs.

The [Ragas metrics article](/blog/ragas-rag-evaluation-metrics-complete-guide) can diagnose downstream quality after these checks. Never use a higher search score to waive a must-keep meaning mismatch.

## How should query expansion regression suite run in CI?

A query added term regression suite should pin tool code, prompt rev, model or rule version, fixture rev, text rules rules, search tool version, and package locks. It should execute against a frozen checked dataset with no production search calls.

Split fixed contract cases from live-model sampling. Pull requests can run fake and captured-output tests, while a scheduled job records fresh rewrites for review under the same fact schema.

Set deadlines for each rewrite and the full suite. A timeout should retain source facts, attempt IDs, dependency status, and zero search calls rather than producing a blank fit query.

Artifact records should include source query, chat context allowed by policy, raw rewrite, normalized facts, filter fields, extra-term diff, tool identity, pass state, planned case list, and cleanup status. Redact sensitive fixture values before upload.

Fail release on changed names, lost negation, widened rules, shifted bounds, unapproved extra terms, stale context, missing cases, partial outputs, search before pass state, or incomplete cleanup. Use stable reason codes with field-level differences.

Run cases in isolated context stores. Chat rewrite tests are especially vulnerable to prior turns or another worker's history leaking into the current source query.

After the contract passes, downstream jobs may run rank test and RAG metrics. Carry the rewrite case ID and rev into those artifacts so a reviewer can trace a score back to its exact fit query.

Use the [RAG CI guide](/blog/rag-regression-testing-guide) for orchestration and the [skills directory](/skills) for broader checks. The rewrite gate should finish first and stop invalid cases before search cost begins.

## Which assertions verify retrieval query semantic preservation?

Query meaning checks need exact rules for must-keep facts plus checked flexibility for paraphrase. Existence-only checks miss reversed negation, a changed comparison operator, a wider date interval, or a named item copied into the wrong rule.

Assert required name values with boundary-aware matching or set fields. A product ID inside another token should not count, and normalized case rules should be explicit for each identifier type.

Represent include and exclude facts separately. Compare polarity, target, and scope so "exclude canceled invoices" cannot pass after becoming "include canceled invoices."

Compare numeric bounds with operators, units, and time zones where relevant. The number 30 is not preserved when days become hours or an after-date becomes a before-date.

Compare access and tenant rules exactly. These constraints should never be softened by a meaning match score or an added term intended only to improve recall.

Compute added terms as the checked difference between source facts and rewritten facts. Require every added concept to appear in the case allowlist and reject another name or intent even when related.

Assert one result for every planned case and no search call for an unfit result. Then join each fit search request to the exact rewrite record and filter fields that passed.

The [retrieval testing guide](/blog/rag-retrieval-testing-best-practices-2026) can assert ranked documents after this point. Meaning preservation must pass first because downstream relevance is measured relative to the query it receives.

## Step-by-step test implementation

Build the gate from checked facts and a strict search boundary rather than from output match alone. These six steps keep source meaning, rewrite proof, failures, and downstream pass state visible.

1. Read \`seed-skills/rag-regression-testing/SKILL.md\` lines 63-68 and \`seed-skills/rag-evaluation-metrics/SKILL.md\` lines 21-28, then record version fields and the pre-retrieval ownership boundary.
2. Create isolated fixtures for how to rag query rewrite regression testing and its example matrix, with source queries, context, required facts, protected filters, and allowed expansions.
3. Build deterministic fact checks, a fake or captured-output rewriter, plain result records, complete case accounting, a retrieval-call guard, deadlines, and verified context cleanup.
4. Run the expected path and assert entities, constraints, negation, time scope, intent, filters, approved expansions, result shape, provenance, and zero early retrieval calls.
5. Inject dropped, changed, reversed, widened, stale, partial, repeated, and timed-out rewrites, then require stable field diffs and ineligible downstream status.
6. Run the focused pytest suite in CI, retain sanitized rewrite artifacts, clean context stores, and assign fixture, rewriter, parser, policy, retrieval-boundary, or harness failures.

Keep the first dataset small and varied rather than large and repetitive. One case per meaning feature makes a failed field easy to review and reduces accidental overlap between assertions.

Re-run the baseline after all injected failures. Equal facts, rules, and pass state prove that stale chat context and fake dependency state did not leak across cases.

The [blog index](/blog) lists related RAG testing layers. Preserve this gate as a standalone stage so search and reply teams receive only semantically fit requests.

## Failure triage and regression ownership

Begin with the source fixture and raw rewrite. A wrong source or expected fact belongs to dataset review, while a correct source with changed meaning belongs to the tool, prompt, model, or rule setup.

If raw text preserves meaning but filter fields differ, route the issue to parsing or request assembly. The search tool may consume the faulty rule even though the readable query looks correct.

If fixed facts pass but added term is rejected, inspect the case allowlist and tool policy. Approve a new synonym only after review confirms it adds search terms without changing name, scope, or intent.

If an unfit query reaches search, assign the defect to orchestration or boundary enforcement. The meaning grader found the problem, but the pipeline ignored its pass state result.

If downstream rank metrics fall while the rewrite contract passes, inspect the search tool, index, corpus, embeddings, and ranking setup. Do not broaden rewrite assertions to own document failures outside this stage.

If only CI fails, compare tool versions, fixture checksums, locale, token text rules, worker context, package locks, and execution order. Retain raw values so owners can reproduce text rules exactly.

If production sampling finds a new valid paraphrase, add it through checked fixture data. Avoid lowering all checks or replacing must-keep facts with one broad match threshold.

Use the [RAG regression guide](/blog/rag-regression-testing-guide) to assign wider pipeline owners. Within this contract, reviewers own facts, tool owners preserve meaning, parser owners preserve rules, and orchestration owners enforce pass state.

## Frequently Asked Questions

### How do you test whether a query rewriter preserves entities, constraints, negation, and user intent before retrieval runs?

Store checked source facts, must-keep rules, and allowed added terms for each case, then grade the raw and set rewrite before invoking search. Compare exact IDs, polarity, operators, bounds, tenant scope, and intent labels. Mark any mismatch unfit and assert that no downstream search call occurred.

### What fixture best tests how to rag query rewrite regression testing?

Use a small checked table with one clear meaning feature per case: named item, not clause, date bound, access rule, acronym term, and contextual follow-up. Pair fixed fake or captured rewrites with fixed fact checks, a search-call guard, stable versions, isolated chat state, and complete planned case IDs.

### Which failure signal proves rag query rewrite regression testing example?

Report the case, source, raw rewrite, tool rev, expected fact, observed fact, and stable mismatch code. Include filter differences, unapproved extra terms, and search pass state. This proof distinguishes tool, parser, fixture, policy, and orchestration defects without waiting for noisy document rankings or generated answers.

### How should CI report RAG rewritten query contract?

CI should retain sanitized source queries, allowed context, raw rewrites, normalized facts, filter fields, extra-term diffs, tool and fixture versions, planned case accounting, pass state, search-call ledger, and cleanup proof. Stable case IDs should link later rank and answer artifacts only for rewrites that passed this contract.

### When should query expansion regression suite block a release?

Block on changed or missing names, reversed negation, shifted bounds, widened access rules, new intent, unapproved concepts, stale context, partial output, missing cases, or search before pass state. Also block when versions or cleanup proof are absent. Better downstream recall cannot excuse a rewrite that changed the request.

### How can teams keep retrieval query semantic preservation repeatable?

Pin tool, prompt, rule, fixture, and text rules revisions; isolate chat stores; and use checked facts instead of one match score. Run fixed captured-output cases on pull requests, save fresh samples for scheduled review, and re-run the baseline after mutations to prove no stale context crossed case boundaries.

## Conclusion

RAG query rewrite regression testing makes the pre-search query an explicit release contract. It rejects changed names, lost negation, wider scope, shifted bounds, stale context, partial output, missing cases, and new terms that lack review before rank metrics can hide the meaning defect.

Open the [QA skills directory](/skills) to choose an AI testing skill, then read the [Ragas evaluation metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) before implementing this regression gate. Start with one checked fact table and enforce pass state before the first search call.`,
};
