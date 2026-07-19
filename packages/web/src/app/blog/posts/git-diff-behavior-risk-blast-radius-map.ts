import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Git Diff Behavior Risk Map: QA Guide',
  description:
    'Build a git diff behavior risk map that traces changed hunks to user-facing outcomes, callers, blast radius, selected tests, and auditable CI evidence.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Guide',
  primaryKeyword: 'git diff behavior risk map',
  keywords: [
    'git diff behavior risk map',
    'software change risk analysis',
    'blast radius mapping',
    'diff hunk review',
    'static caller tracing',
    'test impact selection',
    'release readiness evidence',
    'AI Release Guardian review',
  ],
  relatedSlugs: [
    'empty-related-test-set-release-blocker',
    'changed-line-coverage-diff-hunks-gate',
    'uncovered-changed-lines-blocker-waiver-debt',
    'deleted-tests-weakened-assertions-release-risk',
  ],
  sources: [
    'https://git-scm.com/docs/git-diff',
    'https://jestjs.io/docs/cli',
    'https://vitest.dev/guide/cli',
    'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches',
  ],
  content: `
A git diff behavior risk map translates each meaningful hunk into the user-facing outcome that could fail, the callers that expose it, the affected users or systems, and the proof required before release. It should block when scope, caller tracing, test choice, or required files are missing, because unknown impact cannot support GO.

The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) performs this translation before selecting tests or measuring changed-line hit data. It recommends a release verdict but never merges, approves, tags, or deploys. Each map claim must cite a hunk, reference, test, line hits record, or review file from the exact judged HEAD.

This guide complements the [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026). The broader strategy defines agreed surfaces and gates; the per-change map applies them to the code that will actually enter the release.

## Why Does Software Change Risk Analysis Start with Behavior?

Software change risk analysis starts with flow because a file list shows location, not user impact. It cannot say what users may lose, which clients may reject a payload, or whether a data change affects each read path. A flow map links the Git patch to test proof and a clear release risk.

Avoid scoring risk from extension, folder, or line count alone. A one-line permission inversion can affect each administrative request. A large built snapshot may have no independent flow. Read each hunk, understand its role, and retain exclusions with reasons rather than deleting them from the report.

| Diff observation | Weak interpretation | Flow-focused interpretation |
| --- | --- | --- |
| Auth predicate changed | One TypeScript file modified | Some callers may admit or deny the wrong role |
| Response enum gained a value | Small schema edit | Clients may reject or mishandle the new state |
| Data change adds a non-null field | Data store file changed | Old application instances may fail during rolling rollout |
| Click handler condition changed | Component logic changed | Users may submit twice or lose a disabled-state guard |
| Test check removed | Test-only change | A previously checked outcome may now regress silently |

The Guardian uses a simple surface baseline. Money, auth, permissions, data shapes, public contracts, data changes, and sensitive rollout config are High. Business logic and stateful interface flow are Medium.

Display-only changes are usually Low. Deleted or weakened tests are High findings regardless of their folder.

A git diff behavior risk map can raise or explain that baseline with concrete reach. It should not average High impact down because a patch is short or easy to revert. Rollback ease may inform blast radius and human choices, but it never turns missing proof into a pass.

The [deleted-test risk guide](/blog/deleted-tests-weakened-assertions-release-risk) handles proof removal in detail. Keep that finding attached to the flow it once protected instead of treating it as routine test maintenance.

## How Do You Set Scope for Diff Hunk Review?

Diff hunk review needs one fixed base, merge base, and full HEAD SHA. The map is valid only for that stated comparison. Prefer the pull request diff because it best reflects what will merge. If you use a commit range, record both ends and build all later proof from that exact HEAD.

Git officially supports comparisons between working trees, indexes, commits, blobs, and merge results. Its three-dot form compares the second endpoint with the common ancestor, while merge-base options provide related forms ([Git diff documentation](https://git-scm.com/docs/git-diff)). Choose based on the release event rather than copying a command without its semantics.

Follow these steps:

1. Resolve the target reference, merge base, and full release HEAD.
2. Save rename-aware name-status, normal-context patch, function-context patch, and diff statistics.
3. Mark built, vendored, binary, and lock files, recording each exclusion rationale.
4. Inventory additions, modifications, deletions, renames, copies, and type changes.
5. Reject stale test evidence, line-hit evidence, or review evidence that names another HEAD.
6. Restart mapping after any new commit, because hunks and callers may have changed.

\`\`\`bash
set -eu

BASE_REF=origin/main
HEAD_SHA=$(git rev-parse HEAD)
MERGE_BASE=$(git merge-base "$BASE_REF" "$HEAD_SHA")

mkdir -p artifacts/risk-map
git diff --no-color --find-renames --name-status \
  "$MERGE_BASE" "$HEAD_SHA" > artifacts/risk-map/name-status.txt
git diff --no-color --find-renames --unified=3 \
  "$MERGE_BASE" "$HEAD_SHA" > artifacts/risk-map/release.diff
git diff --no-color --find-renames --function-context \
  "$MERGE_BASE" "$HEAD_SHA" > artifacts/risk-map/function-context.diff
git diff --stat "$MERGE_BASE" "$HEAD_SHA" > artifacts/risk-map/stat.txt

printf '%s\n' "$HEAD_SHA" > artifacts/risk-map/head-sha.txt
printf '%s\n' "$MERGE_BASE" > artifacts/risk-map/merge-base.txt
\`\`\`

Git documents rename detection as similarity-based and notes a default similarity index. Preserve both old and new paths in your map because path ownership, build inputs, and test conventions can change even when content remains similar ([Git diff documentation](https://git-scm.com/docs/git-diff)).

The git diff behavior risk map should list files excluded from semantic review. A lockfile may be summarized separately, yet a dependency update still needs changelog review for APIs the repo uses. Built files may point back to a schema or generator that owns the actual flow.

Scope review must also account for submodule pointers, binary assets, file-mode changes, and deleted paths that cannot be opened at HEAD. These changes may not provide ordinary text hunks, so route them to a clear owner and state what proof can be inspected. A missing text diff is an input limitation, not proof of Low flow risk.

Record the release unit when a repo deploys many services independently. One pull request may contain shared-library changes consumed by services outside the immediate rollout. The map should distinguish code entering this release from callers affected in later releases, while still documenting compatibility obligations during mixed-version rollouts. Unknown rollout ordering remains an open risk question.

## Classify Every Changed Surface

A surface label creates a repeatable first question: what kind of failure could this hunk introduce? It is not the final verdict; caller reach, data flow, existing controls, and test proof refine the record afterward.

Use these practical surfaces:

| Surface | Common proof | Default risk question |
| --- | --- | --- |
| Money | prices, refunds, balances, billing events | Can value move or display incorrectly? |
| Auth and permissions | sessions, roles, rules, secret checks | Can the wrong actor gain or lose access? |
| Data shape | data changes, schemas, ORM models, serializers | Can stored or transmitted data become incompatible? |
| Public contract | routes, exports, webhooks, events | Can a consumer receive or send an invalid shape? |
| Business logic | services, calculations, workflows | Can a supported outcome change? |
| Stateful UI | handlers, reducers, form state | Can user action produce the wrong state or side effect? |
| Config and infrastructure | CI, flags, setup, rollout | Can execution, security, or rollout flow change? |
| Display | static copy, styles, nonbehavioral assets | Is any interactive or contractual flow actually touched? |

Do not classify data changes as Low. Ask whether a down path exists and whether old application instances tolerate the new schema during rollout. Do not classify a config file as Medium automatically when it controls secrets or rollout. Read the setting and its clients.

Data declarations deserve cross-layer review. A TypeScript type may say string while data store DDL enforces a length, enum, nullability, or unique constraint. The [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) prioritizes DDL and data changes over ORM, API schema, and language types when they disagree.

The git diff behavior risk map should record disagreement as a finding, not silently choose the most convenient declaration. Use the [OpenAPI test-suite generation guide](/blog/openapi-spec-to-test-suite-generation) when changed API schemas need positive, boundary, and negative contract cases.

Deleted tests and check removals enter as a proof surface. Their product risk depends on the flow previously checked, but their initial review priority is High. A green remaining suite cannot prove the deleted expectation was redundant without replacement proof.

## How Does Static Caller Tracing Find Risk?

Static caller tracing finds risk by following each changed export into the code that calls it. First read the added and removed lines with enough context to see conditions, state changes, calls, returns, and error paths. File summaries can guide review, but the patch is the source of truth.

For each changed exported function, route handler, component interface, event, or schema, trace at least one caller level. The risk often appears in the caller's assumption. A parser return change may affect a validator, API response, and background worker even when the parser itself remains locally correct.

Caller tracing can use language references, repo search, import graphs, route registration, event subscriptions, or built-client usage. Record the method and unresolved runtime edges. Runtime registries, reflection, dependency injection, and computed imports may require maintained mappings or broader tests.

Follow re-exports and aliases rather than counting them as terminal callers. An index module may expose one changed function to many packages without invoking it directly. Similarly, interface implementations and callback registration can hide concrete reach behind a shared type. Record these indirections and find the runtime binding that determines which code users receive.

Caller search can return stale examples, fixtures, dead code, and type-only imports. Separate runnable production reach from docs and test references, then cite the proof for that separation. If build config or feature flags decide whether a caller ships, include their current values and owners rather than assuming each textual match executes.

\`\`\`bash
# Examples only; adapt names to symbols found in the reviewed hunks.
rg -n "authorizeRefund|RefundDecision" src packages tests
rg -n "POST /refunds|/api/refunds|refund.created" src packages tests
rg -n "from ['\"].*refund|import\(.*refund" src packages tests
\`\`\`

Do not stop at the first matching test. Find production callers first, then connect tests to the resulting flow. Searching only test names encourages a false map where a similarly named spec appears key without reaching the changed path.

Record unresolved reach as unknown. If a public function is loaded through a runtime plugin manifest that the analyzer cannot resolve, expand selection or require an explicit mapping. The [empty related-test set guide](/blog/empty-related-test-set-release-blocker) explains why zero discovered tests on a Medium or High flow blocks rather than passes.

A git diff behavior risk map should distinguish direct from transitive callers. Direct reach is easier to prove, while transitive reach often defines the wider customer impact. Keep the map concise by grouping callers that expose the same flow, not by hiding the chain entirely.

## Write Plain-Language Behavior Statements

Each Medium or High entry needs one sentence a product manager can understand. Name the user or system action, the expected outcome, and the possible failure. Avoid code-only phrases such as "service method changed" or "branch lacks line hits."

Use this pattern:

**When [actor or system] performs [action or event], [observable outcome] may [fail or change] because [key changed choice].** Keep this statement tied to one hunk and one observed result.

For example: "When a support agent refunds an eligible order, the request may be denied." The role predicate now excludes delegated agents. The hunk cites that predicate, callers cite the refund route, and tests should show both allowed and denied outcomes.

One hunk can produce many flow statements. A new order status may affect checkout display, filtering, webhook clients, and reporting exports. Split entries when different owners, test suites, or blast-radius dimensions apply. Group only when the observable flow and proof are genuinely shared.

Flow statements also prevent low-quality remediation. "Add unit tests" does not prove the refund route works. "Add a request-level test for delegated-agent refund success and an authorization test for unrelated roles" follows directly from the mapped outcomes.

Write an invariant beside important flow statements. The refund example might require that authorized agents receive success, unauthorized actors receive denial, the order changes exactly once, and an audit event records the actor. Invariants turn a broad concern into observable proof and expose when one passing check covers only part of the mapped risk.

Include failure handling when the changed code can throw, time out, retry, or partially write. A happy-path sentence alone misses state left behind after interruption. State whether retries are idempotent, whether errors cross a public boundary, and whether a failed operation preserves prior data. Those details often determine the integration test and cleanup proof required.

When creating a git diff behavior risk map, pair each flow with the smallest stable public boundary available. Internal unit line hits can explain branches, while an API, event, data store, or interface check proves the contract visible to clients. Required suites still run according to rule set.

Avoid claiming that an unchanged caller is safe. The changed callee may alter its result for each existing caller. Similarly, an unchanged schema file does not guarantee safe version mix when serialization logic changes. Map consequences from data and control flow, not only touched paths.

## How Does Blast Radius Mapping Size Risk?

Blast radius mapping sizes risk by naming who or what could encounter the fault introduced by the change. It is not another word for severity; a severe bug may affect one admin task, while a mild format bug may appear on each order page. Reach and harm need separate labels.

Assess these dimensions:

- **Population:** all users, one role, one tenant, one region, or internal operators.
- **Path reach:** one endpoint, shared middleware, each read path, or a scheduled worker.
- **Data reach:** new records, past records, one table, each event consumer, or cached state.
- **Time reach:** immediate, rollout-only, data change window, retry window, or persistent until repair.
- **Rollback ease:** feature flag, code rollback, data repair, contract coordination, or irreversible action.
- **Detection:** synchronous error, silent wrong value, delayed alert, audit discrepancy, or customer report.

Replace vague labels with concrete phrases. "Large blast radius" is weaker than "each authenticated API route uses the changed session validator." "Small impact" is weaker than "only administrators invoking manual invoice resend can reach this branch."

Dependencies can expand reach beyond repo boundaries. A webhook payload change affects external clients, while an event schema can affect independently deployed workers. Name those clients when repo proof finds them. If ownership is unknown, record unknown external reach and request contract review.

For data changes, include rollout overlap and rollback. New code may work against the new schema while old pods fail during a rolling rollout. Past rows may need backfill, and rollback may not restore dropped data. These are distinct dimensions that require separate proof.

The git diff behavior risk map should also state limits. A disabled feature flag, isolated tenant, or read-only path can limit reach when its config is proven at the judged release. Limits support human choices but do not replace required tests or turn unknown proof into GO.

Limits claims need files. Cite the flag definition, rollout value, setup target, default flow, and permission controlling changes. A flag that operators can enable immediately still bounds current exposure, but it also creates a future activation obligation. The report should say whether tests cover both states and whether the release process prevents activation before proof exists.

Detection is not prevention. An alert may shorten exposure after a wrong value appears, yet it does not prove a destructive write can be repaired. Record alert ownership, triggering condition, and expected signal only when repo or operational proof supports them. Do not lower the mapped risk from an assumed dashboard that the release reviewer cannot inspect.

Use the [database testing automation guide](/blog/database-testing-automation-guide) for data store-specific checks. Schema-derived deterministic fixtures are preferable to copied production rows, which the Secure Test Data Engineer explicitly forbids.

## Connect Risks to Test Impact Selection

Test choice begins from mapped flow, not merely adjacent filenames. The Guardian prefers per-test line hits when available, then import graphs, co-located conventions, folder suites, and mapped end-to-end flows. It records which tests were selected and why.

Jest documents findRelatedTests as a way to find and run tests covering passed source files, and it can combine that selection with line hits ([Jest CLI documentation](https://jestjs.io/docs/cli)). Vitest documents its related command as following static imports while not supporting runtime import expressions ([Vitest CLI documentation](https://vitest.dev/guide/cli)). Those limits belong in selection proof.

For each risk-map row, record:

1. Selected unit, integration, contract, or end-to-end tests and the selection reason.
2. Required suites that provide a broader safety net regardless of narrow selection.
3. Changed runnable lines and whether selected or required tests executed them.
4. New branches or outcomes that line hits alone cannot prove.
5. Missing mappings, empty sets, skipped tests, flakes, and stale files.

Add check intent to the connection. A selected file can execute the changed module while checking an unrelated output. Name the check that demonstrates each invariant, and mark partial proof when a test covers only one outcome. This traceability prevents line hits or familiar test names from standing in for flow proof.

Use one proof row for each distinct suite run rather than merging local, pull request, and past results into a vague pass. The row should identify the revision, command, setup, result, and retained file. If many suites jointly prove the flow, explain each contribution and require all configured producers before closing the finding.

The [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) covers selection design. The [changed-line coverage tutorial](/blog/changed-line-coverage-diff-hunks-gate) shows the exact hunk-to-JSON intersection, and the [gap classification guide](/blog/uncovered-changed-lines-blocker-waiver-debt) separates blockers, waivers, debt, and unknown proof.

A git diff behavior risk map remains useful when tests are absent because it finds the exact flow to add. It should never invent confidence from a test name or global percentage. Require run identifiers, HEAD provenance, checks, line hits locations, and gate results.

Selection accelerates first feedback but does not replace configured suites. A mapping error is always possible, and broad required checks provide a safety net. A missing required suite is NO-GO even when each selected test passes.

## Emit Release Readiness Evidence

The human map should be brief enough to review and detailed enough to challenge. Include change, flow at risk, blast radius, surface, risk, selected proof, gaps, and owner. Link each entry to files retained by CI.

\`\`\`markdown
| Change | Behavior at risk | Blast radius | Surface | Risk | Evidence |
| --- | --- | --- | --- | --- | --- |
| refund role predicate | delegated support agents may be denied eligible refunds | all delegated-agent refund requests | auth | high | diff hunk, API test run, changed-line report |
| refund debug field | operators may lose one diagnostic value | refund troubleshooting only | low | low | diff hunk, named waiver review |
\`\`\`

The JSON form should carry the same rows under risk_map and connect them to selected_tests, line hits, gate_results, blockers, waivers, and to_reach_go. CI should derive the verdict from those records and reject disagreement between Markdown claims and machine status.

Keep gates in repo config. The Guardian starter requires named suites, zero Blocker-class changed-line gaps, no new lint or type errors, no new security findings, data change rollback proof, and human risk-map review. Team rule set may add fields, but it should not disappear into workflow code.

GitHub states that enabled required status checks must pass before collaborators can merge into a protected branch, and it can restrict the expected source of a required check ([GitHub protected branches documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)). Publish the final Guardian verdict as a stable required check while retaining its proof.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) covers execution wiring, and the [release readiness scorecard](/blog/ai-release-readiness-scorecard-2026) presents the map beside other gates. A green badge alone is insufficient; the report must state exactly what ran and what remains open.

The git diff behavior risk map is complete only when each Medium and High hunk has a flow statement, blast radius, proof path, and disposition. Unknown scope, missing tests, stale line hits, or unreviewed risk keep the verdict NO-GO.

Have the reviewer sign off on the map version rather than the pull request description generally. Store reviewer identity, timestamp, HEAD, and the risk-map file checksum or run identifier. A new commit invalidates that acknowledgment because flow, callers, tests, or limits may have changed. Regenerate the map first, then request a fresh review.

## Complete the AI Release Guardian Review

Use a named reviewer for the map because semantic impact requires product and code context. The Guardian can collect references and propose classifications, but it cannot be the human acknowledgment required by the process gate.

Apply this final checklist:

1. Scope records one base, merge base, and full HEAD across all files.
2. Each path status, exclusion, built input, and deleted test remains visible.
3. Each Medium or High hunk maps to user-facing flow in plain language.
4. Changed exports trace at least one caller level, with runtime edges marked unknown.
5. Blast radius names population, path, data, time, rollback ease, and detection where key.
6. Selected tests, required suites, line hits, and checks connect to each mapped flow.
7. Gaps are blockers, accepted named waivers, proven debt, or unknown, never unlabeled.
8. Markdown and JSON reports derive the same verdict from repo gates.

Rebuild the map whenever HEAD changes. A later commit can add a caller, remove a test, alter limits, or close a blocker. Preserve report history so reviewers can see why the verdict changed rather than only seeing the latest label.

Install or review [AI Release Guardian in the QASkills directory](/skills), then map one real pull request from hunk to flow, blast radius, test, and gate proof. Require a named human risk-map review before allowing the final check to report GO.

## Frequently Asked Questions

### Is a file-level risk label enough?

No. One file can contain a High permission choice, Medium business logic, and Low diagnostics. Map meaningful hunks to observable flow and split entries when owners or proof differ. File labels can route review, but they cannot replace caller tracing, blast-radius review, or outcome-specific tests.

### How far should caller tracing go?

Trace at least one level for each changed export, then continue when that caller reveals shared middleware, public routes, events, or contracts. Stop only when the flow and exposed boundary are clear. Mark runtime-computed or external reach unknown rather than pretending repo search proved completeness.

### Does a large diff always mean High risk?

No. Size affects review confidence and may exceed the Guardian's honest review budget, but flow determines product risk. A large built update can be mechanically low, while one authorization condition can be High. Very large source diffs should be split when reviewers cannot analyze them honestly.

### Can automated dependency graphs create the whole map?

They can find static reach and help select tests, but they do not explain user-facing outcomes, mixed-version safety during data changes, external consumer assumptions, or acceptable limits. Use graphs as cited proof, then add semantic flow statements and human review. Missing runtime edges must remain visible.

### What if no related test is found?

For Medium or High flow, record the empty selection as a blocker unless another named suite demonstrably exercises the path at the judged HEAD. For reviewed Low display work, repo rule set may allow zero tests. Never describe a zero-test result as all related tests passing.

### Who makes the final release decision?

A human release owner does. AI Release Guardian recommends GO, GO WITH WAIVERS, or NO-GO from configured gates and cited proof. It never merges, deploys, tags, approves, or softens missing proof. The human may act with urgency, but the report should preserve the factual verdict.
`,
};
