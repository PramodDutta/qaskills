import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Deleted Tests Weakened Assertions: QA Risk',
  description:
    'Review release risks in the deleted tests weakened assertions category, trace removed checks to behavior, require proof, and issue fail-closed verdicts.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Guide',
  primaryKeyword: 'deleted tests weakened assertions',
  keywords: [
    'deleted tests weakened assertions',
    'test evidence removal',
    'assertion weakening review',
    'deleted test release risk',
    'Git test diff audit',
    'replacement test evidence',
    'fail closed quality gate',
    'AI Release Guardian review',
  ],
  relatedSlugs: [
    'empty-related-test-set-release-blocker',
    'changed-line-coverage-diff-hunks-gate',
    'uncovered-changed-lines-blocker-waiver-debt',
    'git-diff-behavior-risk-blast-radius-map',
  ],
  sources: [
    'https://git-scm.com/docs/git-diff',
    'https://jestjs.io/docs/cli',
    'https://vitest.dev/guide/cli',
    'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches',
  ],
  content: `
The deleted tests weakened assertions category identifies release risks when a diff removes the only runnable proof for an important flow, narrows an expected outcome, or converts a precise check into a permissive one. Treat these changes as High-priority findings until new tests prove the same flow at the exact judged HEAD and each configured gate passes.

The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) makes deleted or weakened tests a first-class Stage 1 finding. A green remaining suite cannot prove that removed proof was redundant. The Guardian recommends GO, GO WITH WAIVERS, or NO-GO, but it never merges, approves, tags, or deploys.

This guide shows how to detect items, map removed checks to flow, compare new proof, and publish an auditable verdict. The phrase deleted tests weakened assertions should map to one stable finding type in both report formats. Use the [behavior and blast-radius mapping guide](/blog/git-diff-behavior-risk-blast-radius-map) for the product side of the same change.

## Why Is Test Evidence Removal a Release Risk?

Test evidence removal is a release risk because it can erase the only check for a key product rule. A deleted spec, lost table row, loose object match, or truthy check may prove less even when product code does not change. Review the lost claim before trusting the green suite.

The report category deleted tests weakened assertions covers two related but different changes. Deletion removes a whole test file or case. Weakening retains runnable code but checks less flow, accepts more outcomes, omits a side effect, or stops proving rejection.

| Test diff | Possible proof loss | Required review |
| --- | --- | --- |
| Test file deleted | Each flow unique to that file | Map all cases to new proof |
| Test case or table row removed | One state, edge, role, or error path | Find the removed case and reason |
| Exact value becomes truthy check | Contract precision and wrong-value detection | Compare accepted outcome sets |
| Object equality becomes partial match | Omitted fields or extra fields may pass | Find which contract fields still matter |
| Error check removed | Failure type, status, message, or no-write guarantee | Prove rejection and side effects elsewhere |
| Snapshot updated or removed | Changed rendered or serialized contract | Review meaning difference, not file size |

Do not assume each check edit is weakening. Replacing a brittle code check with a public-flow check may improve proof. Splitting one large test into focused cases may delete lines while increasing clarity. Labeling requires meaning comparison, not a check-count threshold.

The [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) helps teams find flows that deserve strong proof before a pressured pull request. The Guardian then checks whether the diff preserves that agreed release bar.

A deleted-test finding starts at High priority because the protected flow may be High risk. The final label should name that flow, blast radius, new test, and gate effect. Unknown flow ownership remains NO-GO until review resolves it.

## How Do You Scope a Git Test Diff Audit?

A Git test diff audit uses the same base and HEAD as product risk, test choice, and line coverage. Save removed content from the base because it no longer exists at HEAD. A file name list is not enough because it cannot show which cases or checks went away.

Follow these steps:

1. Resolve the target reference, merge base, and full HEAD SHA.
2. Save rename-aware name-status and full patches for source and test paths.
3. Extract deleted test files from the base into read-only files.
4. Record modified test hunks with enough function context to find each case.
5. Map removed tests and checks to flow before reading the author's rationale.
6. Search HEAD for new proof, then run it at the judged revision.
7. Reject stale runs, missing files, and unreviewed equivalence as NO-GO proof gaps.

Git documents status filtering for deleted paths and rename detection based on similarity. It also provides function context, word diff, pickaxe string search, and regex search over patch text ([Git diff documentation](https://git-scm.com/docs/git-diff)). These tools locate items; they do not judge check meaning.

\`\`\`bash
set -eu

BASE_REF=origin/main
HEAD_SHA=$(git rev-parse HEAD)
MERGE_BASE=$(git merge-base "$BASE_REF" "$HEAD_SHA")

mkdir -p artifacts/test-risk
git diff --no-color --find-renames --name-status \
  "$MERGE_BASE" "$HEAD_SHA" -- '*test*' '*spec*' \
  > artifacts/test-risk/name-status.txt
git diff --no-color --find-renames --function-context \
  "$MERGE_BASE" "$HEAD_SHA" -- '*test*' '*spec*' \
  > artifacts/test-risk/test-changes.diff
git diff --no-color --diff-filter=D --name-only \
  "$MERGE_BASE" "$HEAD_SHA" -- '*test*' '*spec*' \
  > artifacts/test-risk/deleted-test-paths.txt

printf '%s\n' "$HEAD_SHA" > artifacts/test-risk/head-sha.txt
printf '%s\n' "$MERGE_BASE" > artifacts/test-risk/merge-base.txt
\`\`\`

Repo naming varies, so globs are only one input. Test projects may live under custom folders, use framework-specific suffixes, or generate cases from data files. Include configured test roots, runner projects, fixtures, snapshots, contract examples, and evaluation datasets in the list.

A deleted tests weakened assertions audit should retain rename metadata. A renamed test with unchanged flow differs from deletion, while a rename paired with case removal needs both facts. Do not let similarity detection hide changed checks inside a moved file.

## Detect Deleted Test Release Risk

Start with deleted paths, then inspect removed cases within surviving files. A test file can remain while its only authorization denial case disappears. Table-driven suites can lose one edge row without changing any test declaration.

For each deleted file, list test names, nested groups, parameter rows, fixtures, snapshots, and helper checks from the base. Map them to product edges such as routes, services, events, schemas, database effects, and user journeys. Group only cases that prove the same observable flow.

Search HEAD for new test names and flow, not just copied text. A case may move from a unit test to an API contract test with different naming. Conversely, a similarly named test may exercise another route or omit the removed side effect.

Jest officially supports listing the test files selected by arguments and running exact paths. Its JSON mode prints test results while other output goes to standard error ([Jest CLI documentation](https://jestjs.io/docs/cli)). Use these capabilities to capture new runs, but retain the checks and flow mapping that explain relevance.

Vitest documents a list command for matched test names and a related command that follows static imports but not dynamic expressions ([Vitest CLI documentation](https://vitest.dev/guide/cli)). A missing relationship can explain why static selection found nothing; it cannot prove a deleted case is safely replaced.

Record each item in a stable shape:

\`\`\`typescript
type TestEvidenceChange = {
  kind: 'deleted-file' | 'removed-case' | 'assertion-change';
  basePath: string;
  headPath: string | null;
  baseTestName: string;
  removedExpectation: string;
  behaviorProtected: string | null;
  surface: 'high' | 'medium' | 'low' | 'unknown';
  replacementTests: string[];
  replacementRunId: string | null;
  equivalenceReviewed: boolean;
  evidence: string[];
};
\`\`\`

Keep behaviorProtected null until a reviewer establishes it. Null is unknown and blocks, while an empty string can be mistaken for no flow. The [empty related-test set guide](/blog/empty-related-test-set-release-blocker) applies the same fail-closed discipline when new test selection returns zero.

The combined deleted tests weakened assertions finding should list deleted cases separately from changed product hunks. Connect them through flow identifiers so reviewers can see which proof protected which release risk.

Inspect deleted shared test helpers before assuming only plumbing changed. A helper may contain the check that each caller relied on, such as checking an audit record after each request. If HEAD callers still invoke a renamed helper, compare implementations and prove the check moved. A new test that performs only setup can leave dozens of apparently unchanged tests weaker at once.

Snapshots and data-driven inputs can hold cases outside test source. Removing a fixture row, deleting an inline snapshot field, or changing a golden response may reduce proof without deleting a test declaration. List configured snapshot and case-data locations, then connect each removed value to the consuming test and flow. Built case files should point back to their generator inputs and review rules.

## How Does Assertion Weakening Review Work?

Assertion weakening review compares what the base test rejected with what the HEAD test now accepts. A check is weaker when valid outcomes grow without a cited rule change, or when a key result is no longer observed. The reviewer must decide whether the product contract supports that change.

Examples require context. Exact equality to a full response may be overly coupled when only selected fields are contractual. Partial matching may be correct after that review. However, dropping status, error code, ownership, amount, ordering, or absence of extra writes can remove meaningful protection.

Review these check dimensions:

- **Value precision:** exact value, range, pattern, truthiness, or existence.
- **Shape precision:** full object, selected fields, array membership, or snapshot.
- **Cardinality:** exact count, minimum, maximum, nonempty, or no duplicate items.
- **Ordering:** stable sequence, partial order, or unordered membership.
- **Failure contract:** error type, status, code, message shape, and rejected side effects.
- **Time flow:** completion, retry count, timeout, eventual state, and no late write.
- **Security flow:** allowed actor, denied actor, redaction, and audit proof.

Automated checks can flag removed check calls, matcher changes, deleted snapshots, fewer table rows, and changed expected literals. They cannot reliably determine meaning strength across custom matchers, helper functions, built tests, or changed rules. Use automated detection to focus human review, not to emit GO.

When reporting deleted tests weakened assertions, quote only compact expectation summaries and cite the base hunk. The full source remains in the file. Explain the accepted-outcome difference in ordinary language, such as "the test now accepts any nonempty status instead of requiring refunded."

Inspect test setup and teardown too. Removing a factory override can stop exercising an admin role even when checks remain unchanged. Removing cleanup verification can hide residue. Changing a mock from rejection to success can erase a failure path without deleting its test name.

Asynchronous tests need special review. Removing an await, returned promise, rejection matcher, or eventual-state poll can let the test finish before the meaningful check runs. A passing process result then provides little proof about the delayed flow. Verify that the runner observes the async chain and that failures inside it reach the reported test result.

Negative checks deserve the same care as positive values. Checks for no write, no duplicate event, no secret in output, and no unauthorized access often protect the most damaging outcomes. Replacing them with a successful response check broadens the accepted system state. Record the absent side effect explicitly so new tests know what must remain unobserved after the action.

The [test data management guide](/blog/test-data-management-strategies) covers isolation strategy. For schema-derived factories and relational cleanup, use the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) rather than copying product records into a quick new test.

## Map Removed Checks to Product Behavior

A removed expectation becomes a release risk through the flow it protected. Trace the tested public edge to the changed or unchanged product path, then describe the observable failure and blast radius. Do not stop at "orders spec lost one check."

For example, a deleted check that no ledger entry exists after a rejected refund protects atomicity, not merely database row count. Its blast radius includes each rejected refund and downstream reconciliation. New proof should drive the rejection through the public API and assert both response and absence of the write.

Use this flow statement pattern:

**The removed check proved [observable rule] when [actor or event] performed [action]. Without equivalent proof, [population or system] could experience [failure].**

Map one caller level for any helper or exported function referenced by the removed test. The product code may have several callers with different risk. A unit case for one caller does not automatically replace contract proof for all routes.

The [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) helps find suites connected to changed files. The [diff-hunk coverage tutorial](/blog/changed-line-coverage-diff-hunks-gate) shows whether new runs execute changed product lines. Neither proves that the new test checks the same rule.

Classify the flow surface using the Guardian defaults. Money, auth, data shape, and public contracts begin High. Business logic and stateful interface flow begin Medium.

Presentation-only proof may be Low after hunk review. Unknown ownership or reach blocks until resolved.

The report category deleted tests weakened assertions should also include tests removed while product code stays unchanged. Proof erosion can create release risk for the next unnoticed regression, and a current dependency or config change may already affect that flow through hidden reach.

## What Counts as Replacement Test Evidence?

Replacement test evidence counts only when a new test proves the same product rule, rejects the same wrong outcomes, and checks the same side effects at the judged HEAD. A refactor may keep the same cases under a clearer edge. A cited rule change may also retire an old check, but each path needs proof.

| Disposition | Proof required | Gate result |
| --- | --- | --- |
| Equivalent new test | Same flow, outcomes, side effects, HEAD run, reviewed checks | Close finding |
| Stronger new test | Original rule plus clearer public edge or added outcomes | Close and document improvement |
| Pure test refactor | Case matrix preserved, no check loss, exact run proof | Close after review |
| Approved rule change | Cited contract choice and updated positive or negative proof | Evaluate remaining gates |
| Proof erosion | Flow still required but check removed or broadened | Blocker |
| Unknown equivalence | New test, rule, or run proof incomplete | NO-GO |

Compare case matrices rather than raw counts. One parameterized test can replace ten separate cases, and ten shallow tests can replace one meaningful integration test without preserving flow. Rows should identify the actor, precondition, action, expected output, expected side effect, and failure path.

Rule changes need a repo-visible contract or review file. A pull request description saying "no longer needed" is rationale, not authoritative flow proof. Update API schemas, acceptance criteria, rule set, or other source of truth, then add tests for the new contract.

A deleted tests weakened assertions review should ask whether new proof is independent of the code under test. A helper that computes expected output by calling the changed code can make each result agree. Prefer clear expectations or separately derived reference logic appropriate to the domain.

When replacing a test because it is flaky, preserve the protected flow while repairing synchronization, isolation, data, or environment causes. Deletion is not quarantine, and quarantine is not closure. Required rule set should expose new skips and quarantined failures rather than hiding them.

Run the original base test when practical to understand its proof, but do not compare base and HEAD results across incompatible application contracts without explanation. The useful comparison is the case and rule, not simply both commands returning success. Preserve base output, new test output, and the rule that connects them, especially when framework migration changes reporter formats.

New tests should fail for a controlled violation of the protected rule during test review when repo rule set permits such validation. This mutation can be a temporary local change rather than committed code. It demonstrates that the check detects the wrong outcome instead of merely executing. Record the reviewed result without allowing altered product code into release files.

Use the [gap classification guide](/blog/uncovered-changed-lines-blocker-waiver-debt) if new test coverage still leaves zero-hit lines. Proof erosion is usually a Blocker; a narrow Low item can become a named waiver only under the same owner and acceptance rules as other gaps.

## Keep Coverage and Selection in Their Proper Roles

Coverage can show that new tests execute product lines. It cannot show that checks remain meaningful. A test with no checks can produce line hits, while a precise contract test may validate flow through an edge without covering each internal branch.

Related-test choice has a similar limit. A selected path proves the runner associated a test with changed source according to its strategy. It does not prove the removed case exists inside that file. Keep test list, check review, run result, and coverage as separate proof fields.

Use coverage to answer these questions:

1. Did new tests execute the changed flow at the judged HEAD?
2. Which changed runnable lines remain uncovered or unknown?
3. Did removed tests uniquely cover a branch that now has zero hits?
4. Do required suites add run proof beyond narrow selection?
5. Are source maps, includes, excludes, and merged shards valid?

Use check review to answer different questions: which outcome was checked, which wrong outcomes would fail, which side effects were observed, and which rules justify broader acceptance. Do not collapse both reviews into a single percentage.

When findings in the deleted tests weakened assertions category coincide with high changed-line coverage, keep the proof-loss finding open until equivalence is proven. A new suite may reach each line while accepting an incorrect amount, role, status, or event shape.

Required suites still run even when focused new tests pass. Selection orders fast feedback, while configured suites guard against hidden coupling and mapping errors. A missing suite at the judged HEAD is NO-GO under the Guardian report contract.

The [release readiness scorecard guide](/blog/ai-release-readiness-scorecard-2026) presents coverage and proof-removal findings beside static, data, security, and process gates. Separate rows make it clear why one green metric does not cancel another failed gate.

## Enforce a Fail Closed Quality Gate

Add a proof-preservation gate beside test, coverage, static, data, and process gates. The rule set should block unresolved High findings, unknown equivalence, missing new runs, and new test skips beyond the configured limit.

\`\`\`yaml
gates:
  tests:
    required_suites: [unit, integration, e2e-smoke]
    max_new_skips: 0
    unresolved_deleted_test_findings: 0
    unresolved_weakened_assertion_findings: 0
  coverage:
    changed_line_blockers: 0
  static:
    lint_errors: 0
    type_errors: 0
    new_security_findings: 0
  process:
    risk_map_reviewed: true
    test_evidence_changes_reviewed: true
\`\`\`

The two added fields are a repo extension to the Guardian starter, so document their semantics and schema. Do not bury them in one workflow condition. A stable rule set makes local review and CI verdict calculation agree.

GitHub documents that enabled required status checks must pass before collaborators can merge into a protected branch and can require an expected App source ([GitHub protected branches documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)). Expose the final Guardian verdict as a required check while preserving detailed proof files.

The JSON report should include each removed or weakened item, protected flow, blast radius, new proof, reviewer, gate status, and fix. Markdown should present the same facts in a compact table. CI recomputes the verdict and rejects disagreement.

Give each finding a stable identifier derived from base path, test name, expectation summary, and base hunk proof. Line numbers alone shift during refactoring. Stable identity lets CI show whether a finding closed through a new test or a changed label, or vanished unexpectedly. If an item disappears because analyzer logic changed, require an analyzer-version note and rerun review.

Preserve report transitions. A deleted tests weakened assertions item may move from unknown to Blocker after flow mapping, then close after new proof. Store each transition with HEAD, reviewer, reason, and files. This history prevents a later generated report from making an unresolved finding appear as though it never existed.

Use a direct NO-GO entry: "Refund rejection test removed, and no new test checks for ledger writes." Mark the money surface High and ask for a public-edge rejection test. This gives the owner a clear path to GO without overstating what coverage proves.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) covers file dependencies. Ensure the verdict job fails closed when the test-diff analyzer, base extraction, new run, or reviewer record is missing.

## Complete the AI Release Guardian Review

Review test proof after product risk mapping and before the final verdict. This ordering reveals whether a removed case protected one of the changed flows, while still catching proof erosion in unchanged code.

Use this final checklist:

1. Base, merge base, and full HEAD match each patch, run, coverage file, and review.
2. Deleted paths, removed cases, table rows, snapshots, fixtures, and check changes were inventoried.
3. Each item maps to a flow, surface, blast radius, and source-of-truth rule.
4. Automated detection only generated items; reviewers assessed semantic equivalence explicitly.
5. New tests ran at HEAD and assert the original outputs and side effects.
6. Coverage supports run proof without substituting for check intent.
7. New skips, quarantine changes, deleted cleanup, and failure-path changes remain visible.
8. Markdown and JSON derive the same verdict from repo-owned rule set.

Regenerate the audit after each commit. A later change can restore a check, remove another case, alter a new test, or change the product flow that gives the test meaning. Bind human review to the report file and judged HEAD.

Findings should close through proof, not wording. If a test is intentionally obsolete, cite the changed contract and prove the new one. If proof moved, cite and run the new test. If protection disappeared, keep NO-GO until a reviewed test restores it.

Test the audit tooling with repo fixtures. Include full-file deletion, case deletion, removed parameter row, renamed test, exact-to-partial matcher, missing async await, snapshot field removal, helper check removal, equivalent framework migration, and malformed base extraction. Assert item identity and unknown states, but keep final meaning label in a reviewed proof record.

Browse the [QASkills directory](/skills), install AI Release Guardian, and run the test-proof audit on a pull request that modifies tests. Require reviewed flow equivalence and exact-HEAD new runs before allowing the release verdict to report GO.

## Frequently Asked Questions

### Does deleting a test always block a release?

It creates a High-priority finding, not an automatic permanent blocker. Close it when a reviewed new test proves the same or stronger flow at the judged HEAD, or when a cited contract change makes the old rule obsolete and new proof proves the updated rule. Unknown equivalence remains NO-GO.

### Can assertion counts detect weakening automatically?

No. Counts and matcher changes can find items, but meaning strength depends on accepted outcomes, public contracts, helpers, setup, side effects, and rule changes. One precise check may outperform several shallow checks. Use automation to focus review, then record the human-reviewed flow difference and runnable new proof.

### Is a passing snapshot update sufficient evidence?

No. A snapshot update records acceptance of changed output but does not explain whether the change is correct. Review the meaning difference, map it to the key contract, and retain focused checks for critical fields or flows. Large automatic snapshot updates deserve especially careful inspection.

### What if the test moved to another framework?

Map the original case matrix to the new test, inspect its checks, run it at the same HEAD, and cite its result. Framework migration can preserve or improve proof, but a similar name or line count is insufficient. Required suites and changed-line coverage still follow repo rule set.

### Can high coverage cancel a weakened assertion finding?

No. Coverage proves execution, not the correctness of expectations. A test may hit each changed line while accepting the wrong status, amount, role, ordering, or side effect. Close the finding only when reviewed checks prove the protected flow and the new run passes at the judged revision.

### Who reviews whether evidence is equivalent?

Use the named human required by repo rule set, ideally someone who understands the flow and test edge. AI Release Guardian can list changes and propose mappings, but it does not provide formal approval. Record reviewer identity, HEAD, report file, rationale, and the proof used for the choice.
`,
};
