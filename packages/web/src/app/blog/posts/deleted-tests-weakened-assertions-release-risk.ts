import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Deleted Tests and Weakened Assertions',
  description:
    'Review deleted tests weakened assertions as release risk, trace removed checks to behavior, require replacement evidence, and issue fail-closed verdicts.',
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
    'AI Release Guardian',
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
Deleted tests weakened assertions are release risks when a diff removes the only executable proof for important behavior, narrows an expected outcome, or converts a precise check into a permissive one. Treat them as High-priority findings until replacement tests prove the same behavior at the exact judged HEAD and every configured gate passes.

The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) makes deleted or weakened tests a first-class Stage 1 finding. A green remaining suite cannot prove that removed evidence was redundant. The Guardian recommends GO, GO WITH WAIVERS, or NO-GO, but it never merges, approves, tags, or deploys.

This guide shows how to detect candidates, map removed checks to behavior, compare replacement evidence, and publish an auditable verdict. Use the [behavior and blast-radius mapping guide](/blog/git-diff-behavior-risk-blast-radius-map) for the production side of the same change.

## Treat Test Diffs as Release-Scope Changes

Tests are executable evidence about intended behavior. Removing a spec, deleting one case from a table, loosening an expected object, or replacing an exact error with a truthiness check can reduce that evidence even when production code is untouched.

The report category deleted tests weakened assertions covers two related but different changes. Deletion removes a whole test artifact or scenario. Weakening retains executable code but checks less behavior, accepts more outcomes, omits a side effect, or stops proving rejection.

| Test diff | Possible evidence loss | Required review |
| --- | --- | --- |
| Test file deleted | Every behavior unique to that file | Map all cases to replacement evidence |
| Test case or table row removed | One state, boundary, role, or error path | Identify the removed scenario and reason |
| Exact value becomes truthy check | Contract precision and wrong-value detection | Compare accepted outcome sets |
| Object equality becomes partial match | Omitted fields or extra fields may pass | Identify which contract fields still matter |
| Error assertion removed | Failure type, status, message, or no-write guarantee | Prove rejection and side effects elsewhere |
| Snapshot updated or removed | Changed rendered or serialized contract | Review semantic difference, not file size |

Do not assume every assertion edit is weakening. Replacing a brittle implementation check with a public-behavior assertion may improve evidence. Splitting one large test into focused cases may delete lines while increasing clarity. Classification requires semantic comparison, not an assertion-count threshold.

The [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) helps teams identify behaviors that deserve strong evidence before a pressured pull request. The Guardian then checks whether the diff preserves that agreed release bar.

Deleted test evidence begins High because its protected behavior may be High. Final classification should name that behavior, blast radius, replacement, and gate effect. Unknown behavior ownership remains NO-GO until analysis resolves it.

## Pin Scope and Preserve Both Sides

Review test changes against the same base and HEAD used for production risk, selection, and coverage. Preserve removed content from the base revision because it no longer exists in the HEAD checkout. A name-only list cannot show which scenarios or assertions disappeared.

Follow this procedure:

1. Resolve the target reference, merge base, and full HEAD SHA.
2. Save rename-aware name-status and full patches for source and test paths.
3. Extract deleted test files from the base into read-only artifacts.
4. Record modified test hunks with enough function context to identify each case.
5. Map removed tests and assertions to behavior before reading the author's rationale.
6. Search HEAD for replacement evidence, then run it at the judged revision.
7. Reject stale runs, missing files, and unreviewed equivalence as NO-GO evidence gaps.

Git documents status filtering for deleted paths and rename detection based on similarity. It also provides function context, word diff, pickaxe string search, and regex search over patch text ([Git diff documentation](https://git-scm.com/docs/git-diff)). These tools locate candidates; they do not judge assertion meaning.

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

Repository naming varies, so globs are only one input. Test projects may live under custom directories, use framework-specific suffixes, or generate cases from data files. Include configured test roots, runner projects, fixtures, snapshots, contract examples, and evaluation datasets in the inventory.

A deleted tests weakened assertions audit should retain rename metadata. A renamed test with unchanged behavior differs from deletion, while a rename paired with scenario removal needs both facts. Do not let similarity detection hide changed assertions inside a moved file.

## Detect Deleted Tests and Removed Cases

Start with deleted paths, then inspect removed cases within surviving files. A test file can remain while its only authorization denial case disappears. Table-driven suites can lose one boundary row without changing any test declaration.

For every deleted file, inventory test names, nested groups, parameter rows, fixtures, snapshots, and helper assertions from the base. Map them to product boundaries such as routes, services, events, schemas, database effects, and user journeys. Group only cases that prove the same observable behavior.

Search HEAD for replacement names and behavior, not just copied text. A scenario may move from a unit test to an API contract test with different naming. Conversely, a similarly named test may exercise another route or omit the removed side effect.

Jest officially supports listing the test files selected by arguments and running exact paths. Its JSON mode prints test results while other output goes to standard error ([Jest CLI documentation](https://jestjs.io/docs/cli)). Use these capabilities to capture replacement runs, but retain the assertions and behavior mapping that explain relevance.

Vitest documents a list command for matched test names and a related command that follows static imports but not dynamic expressions ([Vitest CLI documentation](https://vitest.dev/guide/cli)). A missing relationship can explain why static selection found nothing; it cannot prove a deleted scenario is safely replaced.

Record each candidate in a stable shape:

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

Keep behaviorProtected null until a reviewer establishes it. Null is unknown and blocks, while an empty string can be mistaken for no behavior. The [empty related-test set guide](/blog/empty-related-test-set-release-blocker) applies the same fail-closed discipline when replacement selection returns zero.

The combined deleted tests weakened assertions finding should list deleted cases separately from changed production hunks. Connect them through behavior identifiers so reviewers can see which evidence protected which release risk.

Inspect deleted shared test helpers before assuming only plumbing changed. A helper may contain the assertion that every caller relied on, such as checking an audit record after each request. If HEAD callers still invoke a renamed helper, compare implementations and prove the assertion moved. A replacement that performs only setup can leave dozens of apparently unchanged tests weaker at once.

Snapshots and data-driven inputs can hold scenarios outside test source. Removing a fixture row, deleting an inline snapshot field, or changing a golden response may reduce evidence without deleting a test declaration. Inventory configured snapshot and case-data locations, then connect each removed value to the consuming test and behavior. Generated case files should point back to their generator inputs and review rules.

## Inspect Assertion Changes Semantically

Assertion weakening means the accepted outcome set became broader or an important observation disappeared. Determine what the base test rejected, what the HEAD test accepts, and whether the changed application contract justifies that difference.

Examples require context. Exact equality to a full response may be overly coupled when only selected fields are contractual. Partial matching may be correct after that review. However, dropping status, error code, ownership, amount, ordering, or absence of extra writes can remove meaningful protection.

Review these assertion dimensions:

- **Value precision:** exact value, range, pattern, truthiness, or existence.
- **Shape precision:** full object, selected fields, array membership, or snapshot.
- **Cardinality:** exact count, minimum, maximum, nonempty, or no duplicate items.
- **Ordering:** stable sequence, partial order, or unordered membership.
- **Failure contract:** error type, status, code, message shape, and rejected side effects.
- **Time behavior:** completion, retry count, timeout, eventual state, and no late write.
- **Security behavior:** allowed actor, denied actor, redaction, and audit evidence.

Automated checks can flag removed assertion calls, matcher changes, deleted snapshots, fewer table rows, and changed expected literals. They cannot reliably determine semantic strength across custom matchers, helper functions, generated tests, or changed requirements. Use candidate automation to focus human review, not to emit GO.

When reporting deleted tests weakened assertions, quote only compact expectation summaries and cite the base hunk. The full source remains in the artifact. Explain the accepted-outcome difference in ordinary language, such as "the test now accepts any nonempty status instead of requiring refunded."

Inspect test setup and teardown too. Removing a factory override can stop exercising an admin role even when assertions remain unchanged. Removing cleanup verification can hide residue. Changing a mock from rejection to success can erase a failure path without deleting its test name.

Asynchronous tests need special review. Removing an await, returned promise, rejection matcher, or eventual-state poll can let the test finish before the meaningful assertion runs. A passing process result then provides little evidence about the delayed behavior. Verify that the runner observes the async chain and that failures inside it reach the reported test result.

Negative assertions deserve the same care as positive values. Checks for no write, no duplicate event, no secret in output, and no unauthorized access often protect the most damaging outcomes. Replacing them with a successful response check broadens the accepted system state. Record the absent side effect explicitly so replacement tests know what must remain unobserved after the action.

The [test data management guide](/blog/test-data-management-strategies) covers isolation strategy. For schema-derived factories and relational cleanup, use the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) rather than copying production records into a quick replacement test.

## Map Removed Checks to Product Behavior

A removed expectation becomes release risk through the behavior it protected. Trace the tested public boundary to the changed or unchanged production path, then describe the observable failure and blast radius. Do not stop at "orders spec lost one assertion."

For example, a deleted check that no ledger entry exists after a rejected refund protects atomicity, not merely database row count. Its blast radius includes every rejected refund and downstream reconciliation. Replacement evidence should drive the rejection through the public API and assert both response and absence of the write.

Use this behavior statement pattern:

**The removed check proved [observable invariant] when [actor or event] performed [action]; without equivalent evidence, [population or system] could experience [failure].**

Map one caller level for any helper or exported function referenced by the removed test. The production code may have several callers with different risk. A unit case for one caller does not automatically replace contract evidence for all routes.

The [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) helps identify suites connected to changed files. The [diff-hunk coverage tutorial](/blog/changed-line-coverage-diff-hunks-gate) shows whether replacement runs execute changed production lines. Neither proves the replacement assertion checks the same invariant.

Classify the behavior surface using the Guardian defaults. Money, auth, data shape, and public contracts begin High. Business logic and stateful interface behavior begin Medium. Presentation-only evidence may be Low after hunk review. Unknown ownership or reach blocks until resolved.

The report category deleted tests weakened assertions should also include tests removed while production code stays unchanged. Evidence erosion can create release risk for the next unnoticed regression, and a current dependency or configuration change may already affect that behavior through hidden reach.

## Distinguish Replacement, Refactor, and Erosion

Not every deleted test blocks permanently. A replacement can provide equivalent or stronger evidence, a refactor can preserve the same cases under clearer boundaries, or a requirement change can deliberately remove an obsolete invariant. Each path needs proof.

| Disposition | Evidence required | Gate result |
| --- | --- | --- |
| Equivalent replacement | Same behavior, outcomes, side effects, HEAD run, reviewed assertions | Close finding |
| Stronger replacement | Original invariant plus clearer public boundary or added outcomes | Close and document improvement |
| Pure test refactor | Scenario matrix preserved, no assertion loss, exact run evidence | Close after review |
| Approved requirement change | Cited contract decision and updated positive or negative evidence | Evaluate remaining gates |
| Evidence erosion | Behavior still required but check removed or broadened | Blocker |
| Unknown equivalence | Replacement, requirement, or run evidence incomplete | NO-GO |

Compare scenario matrices rather than raw counts. One parameterized test can replace ten separate cases, and ten shallow tests can replace one meaningful integration test without preserving behavior. Rows should identify actor, precondition, action, expected output, expected side effect, and failure path.

Requirement changes need a repository-visible contract or review artifact. A pull request description saying "no longer needed" is rationale, not authoritative behavior evidence. Update API schemas, acceptance criteria, policy, or other source of truth, then add tests for the new contract.

A deleted tests weakened assertions review should ask whether replacement evidence is independent of the code under test. A helper that computes expected output by calling the changed implementation can make every result agree. Prefer explicit expectations or separately derived reference logic appropriate to the domain.

When replacing a test because it is flaky, preserve the protected behavior while repairing synchronization, isolation, data, or environment causes. Deletion is not quarantine, and quarantine is not closure. Required policy should expose new skips and quarantined failures rather than hiding them.

Run the original base test when practical to understand its evidence, but do not compare base and HEAD results across incompatible application contracts without explanation. The useful comparison is the scenario and invariant, not simply both commands returning success. Preserve base output, replacement output, and the requirement that connects them, especially when framework migration changes reporter formats.

Replacement tests should fail for a controlled violation of the protected invariant during test review when repository policy permits such validation. This mutation can be a temporary local change rather than committed code. It demonstrates that the assertion detects the wrong outcome instead of merely executing. Record the reviewed result without allowing altered production code into release artifacts.

Use the [gap classification guide](/blog/uncovered-changed-lines-blocker-waiver-debt) if replacement coverage still leaves zero-hit lines. Evidence erosion is usually a Blocker; a narrow Low item can become a named waiver only under the same owner and acceptance rules as other gaps.

## Keep Coverage and Selection in Their Proper Roles

Coverage can show that replacement tests execute production lines. It cannot show that assertions remain meaningful. A test with no assertions can produce line hits, while a precise contract test may validate behavior through a boundary without covering every internal branch.

Related-test selection has a similar limit. A selected path proves the runner associated a test with changed source according to its strategy. It does not prove the removed scenario exists inside that file. Keep test inventory, assertion review, run result, and coverage as separate evidence fields.

Use coverage to answer these questions:

1. Did replacement tests execute the changed behavior at the judged HEAD?
2. Which changed executable lines remain uncovered or unknown?
3. Did removed tests uniquely cover a branch that now has zero hits?
4. Do required suites add execution evidence beyond narrow selection?
5. Are source maps, includes, excludes, and merged shards valid?

Use assertion review to answer different questions: which outcome was checked, which wrong outcomes would fail, which side effects were observed, and which requirements justify broader acceptance. Do not collapse both reviews into a single percentage.

When deleted tests weakened assertions coincide with high changed-line coverage, keep the evidence-loss finding open until equivalence is proven. A replacement suite may reach every line while accepting an incorrect amount, role, status, or event shape.

Required suites still run even when focused replacement tests pass. Selection orders fast feedback, while configured suites guard against hidden coupling and mapping errors. A missing suite at the judged HEAD is NO-GO under the Guardian report contract.

The [release readiness scorecard guide](/blog/ai-release-readiness-scorecard-2026) presents coverage and evidence-removal findings beside static, data, security, and process gates. Separate rows make it clear why one green metric does not cancel another failed gate.

## Enforce the Finding in Gates and Reports

Add an evidence-preservation gate beside test, coverage, static, data, and process gates. The policy should block unresolved High findings, unknown equivalence, missing replacement runs, and new skipped coverage beyond the configured limit.

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

The two added fields are a repository extension to the Guardian starter, so document their semantics and schema. Do not bury them in one workflow condition. A stable policy makes local review and CI verdict calculation agree.

GitHub documents that enabled required status checks must pass before collaborators can merge into a protected branch and can require an expected App source ([GitHub protected branches documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)). Expose the final Guardian verdict as a required check while preserving detailed evidence artifacts.

The JSON report should include each removed or weakened item, protected behavior, blast radius, replacement evidence, reviewer, gate status, and remediation. Markdown should present the same facts in a compact table. CI recomputes the verdict and rejects disagreement.

Give every finding a stable identifier derived from base path, test name, expectation summary, and base hunk evidence. Line numbers alone shift during refactoring. Stable identity lets CI show whether a finding closed through replacement, changed classification, or vanished unexpectedly. If a candidate disappears because analyzer logic changed, require an analyzer-version note and rerun review.

Preserve report transitions. A deleted tests weakened assertions item may move from unknown to Blocker after behavior mapping, then close after replacement evidence. Store each transition with HEAD, reviewer, reason, and artifacts. This history prevents a later generated report from making an unresolved finding appear as though it never existed.

Use a NO-GO entry such as: "refund rejection test removed; no replacement asserts absence of ledger writes; High money surface; add a public-boundary rejection test." This gives an owner a concrete path to GO without overstating what coverage proves.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) covers artifact dependencies. Ensure the verdict job fails closed when the test-diff analyzer, base extraction, replacement run, or reviewer record is missing.

## Complete the Audit Before Release

Review test evidence after production risk mapping and before the final verdict. This ordering reveals whether a removed case protected one of the changed behaviors, while still catching evidence erosion in unchanged code.

Use this final checklist:

1. Base, merge base, and full HEAD match every patch, run, coverage file, and review.
2. Deleted paths, removed cases, table rows, snapshots, fixtures, and assertion changes were inventoried.
3. Every candidate maps to a behavior, surface, blast radius, and source-of-truth requirement.
4. Automated detection remained candidate generation, with semantic equivalence reviewed explicitly.
5. Replacement tests ran at HEAD and assert the original outputs and side effects.
6. Coverage supports execution evidence without substituting for assertion intent.
7. New skips, quarantine changes, deleted cleanup, and failure-path changes remain visible.
8. Markdown and JSON derive the same verdict from repository-owned policy.

Regenerate the audit after every commit. A later change can restore an assertion, remove another case, alter a replacement, or change the production behavior that gives the test meaning. Bind human review to the report artifact and judged HEAD.

Findings should close through evidence, not wording. If a test is intentionally obsolete, cite the changed contract and prove the new one. If evidence moved, cite and run the replacement. If protection disappeared, keep NO-GO until a reviewed test restores it.

Test the audit tooling with repository fixtures. Include full-file deletion, case deletion, removed parameter row, renamed test, exact-to-partial matcher, missing async await, snapshot field removal, helper assertion removal, equivalent framework migration, and malformed base extraction. Assert candidate identity and unknown states, but keep final semantic classification in a reviewed evidence record.

Browse the [QASkills directory](/skills), install AI Release Guardian, and run the test-evidence audit on a pull request that modifies tests. Require reviewed behavior equivalence and exact-HEAD replacement runs before allowing the release verdict to report GO.

## Frequently Asked Questions

### Does deleting a test always block a release?

It creates a High-priority finding, not an automatic permanent blocker. Close it when a reviewed replacement proves the same or stronger behavior at the judged HEAD, or when a cited contract change makes the old invariant obsolete and new evidence proves the updated requirement. Unknown equivalence remains NO-GO.

### Can assertion counts detect weakening automatically?

No. Counts and matcher changes can identify candidates, but semantic strength depends on accepted outcomes, public contracts, helpers, setup, side effects, and requirement changes. One precise assertion may outperform several shallow checks. Use automation to focus review, then record the human-reviewed behavior difference and executable replacement evidence.

### Is a passing snapshot update sufficient evidence?

No. A snapshot update records acceptance of changed output but does not explain whether the change is correct. Review the semantic difference, map it to the relevant contract, and retain focused assertions for critical fields or behaviors. Large automatic snapshot updates deserve especially careful inspection.

### What if the test moved to another framework?

Map the original scenario matrix to the new test, inspect its assertions, run it at the same HEAD, and cite its result. Framework migration can preserve or improve evidence, but a similar name or line count is insufficient. Required suites and changed-line coverage still follow repository policy.

### Can high coverage cancel a weakened assertion finding?

No. Coverage proves execution, not correctness of expectations. A test may hit every changed line while accepting the wrong status, amount, role, ordering, or side effect. Close the finding only when reviewed assertions prove the protected behavior and the replacement run passes at the judged revision.

### Who reviews whether evidence is equivalent?

Use the named human required by repository policy, ideally someone who understands the behavior and test boundary. AI Release Guardian can inventory changes and propose mappings, but it does not provide formal approval. Record reviewer identity, HEAD, report artifact, rationale, and the evidence used for the decision.
`,
};
