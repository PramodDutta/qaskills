import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Map Git Diffs to Behavior and Blast Radius',
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
    'caller tracing',
    'test impact selection',
    'release readiness evidence',
    'AI Release Guardian',
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
A git diff behavior risk map translates each meaningful hunk into the user-facing outcome that could fail, the callers that expose it, the affected users or systems, and the evidence required before release. It should block when scope, caller tracing, test selection, or required artifacts are missing, because unknown impact cannot support GO.

The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) performs this translation before selecting tests or measuring changed-line coverage. It recommends a release verdict but never merges, approves, tags, or deploys. Every map claim must cite a hunk, reference, test, coverage record, or review artifact from the exact judged HEAD.

This guide complements the [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026). Strategy defines agreed surfaces and gates; the per-change map applies them to the code that will actually enter the release.

## Map Behavior Instead of Counting Files

A file list tells reviewers where text changed. It does not say what customers can no longer do, which contract consumers may reject a payload, or whether a migration affects every read path. Behavior mapping supplies that missing layer between source control and test evidence.

Avoid scoring risk from extension, directory, or line count alone. A one-line permission inversion can affect every administrative request. A large generated snapshot may have no independent behavior. Read each hunk, understand its role, and retain exclusions with reasons rather than deleting them from the report.

| Diff observation | Weak interpretation | Behavior-focused interpretation |
| --- | --- | --- |
| Auth predicate changed | One TypeScript file modified | Some callers may admit or deny the wrong role |
| Response enum gained a value | Small schema edit | Clients may reject or mishandle the new state |
| Migration adds a non-null field | Database file changed | Old application instances may fail during rolling deployment |
| Click handler condition changed | Component logic changed | Users may submit twice or lose a disabled-state guard |
| Test assertion removed | Test-only change | A previously checked outcome may now regress silently |

The Guardian uses a simple surface baseline. Money, auth, permissions, data shapes, public contracts, migrations, and sensitive deployment configuration are High. Business logic and stateful interface behavior are Medium. Presentation-only changes are usually Low. Deleted or weakened tests are High findings regardless of their directory.

A git diff behavior risk map can raise or explain that baseline with concrete reach. It should not average High impact down because a patch is short or easy to revert. Reversibility may inform blast radius and human decisions, but it never turns missing evidence into a pass.

The [deleted-test risk guide](/blog/deleted-tests-weakened-assertions-release-risk) handles evidence removal in detail. Keep that finding attached to the behavior it once protected instead of treating it as routine test maintenance.

## Establish One Exact Release Scope

The map is valid only for a defined comparison. Prefer the pull request diff because it most closely represents what will merge. When using a commit range, record the base reference, merge base, and full HEAD SHA, then generate every downstream artifact from that HEAD.

Git officially supports comparisons between working trees, indexes, commits, blobs, and merge results. Its three-dot form compares the second endpoint with the common ancestor, while merge-base options provide related forms ([Git diff documentation](https://git-scm.com/docs/git-diff)). Choose based on the release event rather than copying a command without its semantics.

Follow this procedure:

1. Resolve the target reference, merge base, and full release HEAD.
2. Save rename-aware name-status, normal-context patch, function-context patch, and diff statistics.
3. Mark generated, vendored, binary, and lock artifacts, recording every exclusion rationale.
4. Inventory additions, modifications, deletions, renames, copies, and type changes.
5. Reject stale test, coverage, or review evidence that names another HEAD.
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

The git diff behavior risk map should list files excluded from semantic analysis. A lockfile may be summarized separately, yet a dependency update still needs changelog review for APIs the repository uses. Generated files may point back to a schema or generator that owns the actual behavior.

Scope review must also account for submodule pointers, binary assets, executable-bit changes, and deleted paths that cannot be opened at HEAD. These changes may not provide ordinary text hunks, so route them to an explicit owner and state what evidence can be inspected. A missing text diff is an input limitation, not proof of Low behavior risk.

Record the release unit when a repository deploys several services independently. One pull request may contain shared-library changes consumed by services outside the immediate deployment. The map should distinguish code entering this release from callers affected in later releases, while still documenting compatibility obligations between versions. Unknown deployment ordering remains an open risk question.

## Classify Every Changed Surface

Surface classification creates a repeatable first question: what kind of failure could this hunk introduce? It is not the final verdict. Caller reach, data flow, existing controls, and test evidence refine the record afterward.

Use these practical surfaces:

| Surface | Common evidence | Default risk question |
| --- | --- | --- |
| Money | prices, refunds, balances, billing events | Can value move or display incorrectly? |
| Auth and permissions | sessions, roles, policies, secret checks | Can the wrong actor gain or lose access? |
| Data shape | migrations, schemas, ORM models, serializers | Can stored or transmitted data become incompatible? |
| Public contract | routes, exports, webhooks, events | Can a consumer receive or send an invalid shape? |
| Business logic | services, calculations, workflows | Can a supported outcome change? |
| Stateful UI | handlers, reducers, form state | Can user action produce the wrong state or side effect? |
| Config and infrastructure | CI, flags, environment, deployment | Can execution, security, or rollout behavior change? |
| Presentation | static copy, styles, nonbehavioral assets | Is any interactive or contractual behavior actually touched? |

Do not classify migrations as Low. Ask whether a down path exists and whether old application instances tolerate the new schema during deployment. Do not classify a configuration file as Medium automatically when it controls secrets or deployment. Read the setting and its consumers.

Data declarations deserve cross-layer review. A TypeScript type may say string while database DDL enforces a length, enum, nullability, or unique constraint. The [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) prioritizes DDL and migrations over ORM, API schema, and language types when they disagree.

The git diff behavior risk map should record disagreement as a finding, not silently choose the most convenient declaration. Use the [OpenAPI test-suite generation guide](/blog/openapi-spec-to-test-suite-generation) when changed API schemas need positive, boundary, and negative contract cases.

Deleted tests and assertion removals enter as an evidence surface. Their product risk depends on the behavior previously checked, but their initial review priority is High. A green remaining suite cannot prove the deleted expectation was redundant without replacement evidence.

## Read Hunks and Trace One Caller Level

Read the actual added and removed lines with enough context to identify conditions, state changes, calls, returns, and error handling. File summaries and pull request descriptions can orient review, but they are not authoritative evidence for what changed.

For every changed exported function, route handler, component interface, event, or schema, trace at least one caller level. The risk often appears in the caller's assumption. A parser return change may affect a validator, API response, and background worker even when the parser itself remains locally correct.

Caller tracing can use language references, repository search, import graphs, route registration, event subscriptions, or generated-client usage. Record the strategy and unresolved dynamic edges. Runtime registries, reflection, dependency injection, and computed imports may require maintained mappings or broader tests.

Follow re-exports and aliases rather than counting them as terminal callers. An index module may expose one changed function to several packages without invoking it directly. Similarly, interface implementations and callback registration can hide concrete reach behind a shared type. Record these indirections and identify the runtime binding that determines which implementation users receive.

Caller search can return stale examples, fixtures, dead code, and type-only imports. Separate executable production reach from documentation and test references, then cite the evidence for that separation. If build configuration or feature flags decide whether a caller ships, include their current values and owners rather than assuming every textual match executes.

\`\`\`bash
# Examples only; adapt names to symbols found in the reviewed hunks.
rg -n "authorizeRefund|RefundDecision" src packages tests
rg -n "POST /refunds|/api/refunds|refund.created" src packages tests
rg -n "from ['\"].*refund|import\(.*refund" src packages tests
\`\`\`

Do not stop at the first matching test. Identify production callers first, then connect tests to the resulting behavior. Searching only test names encourages a false map where a similarly named spec appears relevant without reaching the changed path.

Record unresolved reach as unknown. If a public function is loaded through a runtime plugin manifest that the analyzer cannot resolve, expand selection or require explicit mapping. The [empty related-test set guide](/blog/empty-related-test-set-release-blocker) explains why zero discovered tests on Medium or High behavior blocks rather than passes.

A git diff behavior risk map should distinguish direct from transitive callers. Direct reach is easier to prove, while transitive reach often defines the wider customer impact. Keep the map concise by grouping callers that expose the same behavior, not by hiding the chain entirely.

## Write Plain-Language Behavior Statements

Each Medium or High entry needs one sentence a product manager can understand. Name the user or system action, the expected outcome, and the possible failure. Avoid implementation-only phrases such as "service method changed" or "branch lacks coverage."

Use this pattern:

**When [actor or system] performs [action or event], [observable outcome] may [fail or change] because [relevant changed decision].**

For example: "When a support agent refunds an eligible order, the request may be denied because the role predicate now excludes delegated agents." The hunk cites the predicate, callers cite the refund route, and tests should demonstrate both authorized and unauthorized outcomes.

One hunk can produce several behavior statements. A new order status may affect checkout display, filtering, webhook consumers, and reporting exports. Split entries when different owners, test suites, or blast-radius dimensions apply. Group only when the observable behavior and evidence are genuinely shared.

Behavior statements also prevent low-quality remediation. "Add unit tests" does not prove the refund route works. "Add a request-level test for delegated-agent refund success and an authorization test for unrelated roles" follows directly from the mapped outcomes.

Write an invariant beside important behavior statements. The refund example might require that authorized agents receive success, unauthorized actors receive denial, the order changes exactly once, and an audit event records the actor. Invariants turn a broad concern into observable evidence and expose when one passing assertion covers only part of the mapped risk.

Include failure handling when the changed code can throw, time out, retry, or partially write. A happy-path sentence alone misses state left behind after interruption. State whether retries are idempotent, whether errors cross a public boundary, and whether a failed operation preserves prior data. Those details often determine the integration test and cleanup evidence required.

When creating a git diff behavior risk map, pair each behavior with the smallest stable public boundary available. Internal unit coverage can explain branches, while an API, event, database, or interface assertion proves the contract visible to consumers. Required suites still run according to policy.

Avoid claiming that an unchanged caller is safe. The changed callee may alter its result for every existing caller. Similarly, an unchanged schema file does not guarantee compatibility when serialization logic changes. Map consequences from data and control flow, not only touched paths.

## Size Blast Radius with Concrete Dimensions

Blast radius describes who or what could experience the changed failure. It is not a dramatic synonym for severity. A severe defect may affect one administrative operation, while a moderate formatting defect may appear on every order page.

Assess these dimensions:

- **Population:** all users, one role, one tenant, one region, or internal operators.
- **Path reach:** one endpoint, shared middleware, every read path, or a scheduled worker.
- **Data reach:** new records, historical records, one table, every event consumer, or cached state.
- **Time reach:** immediate, rollout-only, migration window, retry window, or persistent until repair.
- **Reversibility:** feature flag, code rollback, data repair, contract coordination, or irreversible action.
- **Detection:** synchronous error, silent wrong value, delayed alert, audit discrepancy, or customer report.

Replace vague labels with concrete phrases. "Large blast radius" is weaker than "every authenticated API route uses the changed session validator." "Small impact" is weaker than "only administrators invoking manual invoice resend can reach this branch."

Dependencies can expand reach beyond repository boundaries. A webhook payload change affects external consumers, while an event schema can affect independently deployed workers. Name those consumers when repository evidence identifies them. If ownership is unknown, record unknown external reach and request contract review.

For migrations, include rollout overlap and rollback. New code may work against the new schema while old pods fail during a rolling deployment. Historical rows may need backfill, and rollback may not restore dropped data. These are distinct dimensions that require separate evidence.

The git diff behavior risk map should also state containment. A disabled feature flag, isolated tenant, or read-only path can limit reach when its configuration is proven at the judged release. Containment supports human decisions but does not replace required tests or turn unknown evidence into GO.

Containment claims need artifacts. Cite the flag definition, rollout value, environment target, default behavior, and permission controlling changes. A flag that operators can enable immediately still bounds current exposure, but it also creates a future activation obligation. The report should say whether tests cover both states and whether the release process prevents activation before evidence exists.

Detection is not prevention. An alert may shorten exposure after a wrong value appears, yet it does not prove a destructive write can be repaired. Record alert ownership, triggering condition, and expected signal only when repository or operational evidence supports them. Do not lower the mapped risk from an assumed dashboard that the release reviewer cannot inspect.

Use the [database testing automation guide](/blog/database-testing-automation-guide) for database-specific checks. Schema-derived deterministic fixtures are preferable to copied production rows, which the Secure Test Data Engineer explicitly forbids.

## Connect Risks to Tests and Coverage

Test selection begins from mapped behavior, not merely adjacent filenames. The Guardian prefers per-test coverage when available, then import graphs, co-located conventions, directory suites, and mapped end-to-end flows. It records which tests were selected and why.

Jest documents findRelatedTests as a way to find and run tests covering passed source files, and it can combine that selection with coverage ([Jest CLI documentation](https://jestjs.io/docs/cli)). Vitest documents its related command as following static imports while not supporting dynamic import expressions ([Vitest CLI documentation](https://vitest.dev/guide/cli)). Those limits belong in selection evidence.

For each risk-map row, record:

1. Selected unit, integration, contract, or end-to-end tests and the selection reason.
2. Required suites that provide a broader safety net regardless of narrow selection.
3. Changed executable lines and whether selected or required tests executed them.
4. New branches or outcomes that line coverage alone cannot prove.
5. Missing mappings, empty sets, skipped tests, flakes, and stale artifacts.

Add assertion intent to the connection. A selected file can execute the changed module while checking an unrelated output. Name the assertion that demonstrates each invariant, and mark partial evidence when a test covers only one outcome. This traceability prevents coverage hits or familiar test names from standing in for behavior proof.

Use one evidence row for each distinct suite run rather than merging local, pull request, and historical results into a vague pass. The row should identify revision, command, environment, result, and retained artifact. If several suites jointly prove the behavior, explain each contribution and require all configured producers before closing the finding.

The [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) covers selection design. The [changed-line coverage tutorial](/blog/changed-line-coverage-diff-hunks-gate) shows the exact hunk-to-JSON intersection, and the [gap classification guide](/blog/uncovered-changed-lines-blocker-waiver-debt) separates blockers, waivers, debt, and unknown evidence.

A git diff behavior risk map remains useful when tests are absent because it identifies the exact behavior to add. It should never invent confidence from a test name or global percentage. Require run identifiers, HEAD provenance, assertions, coverage locations, and gate results.

Selection accelerates first feedback but does not replace configured suites. A mapping error is always possible, and broad required checks provide a safety net. A missing required suite is NO-GO even when every selected test passes.

## Emit the Map as Release Evidence

The human map should be brief enough to review and detailed enough to challenge. Include change, behavior at risk, blast radius, surface, risk, selected evidence, gaps, and owner. Link every entry to artifacts retained by CI.

\`\`\`markdown
| Change | Behavior at risk | Blast radius | Surface | Risk | Evidence |
| --- | --- | --- | --- | --- | --- |
| refund role predicate | delegated support agents may be denied eligible refunds | all delegated-agent refund requests | auth | high | diff hunk, API test run, changed-line report |
| refund debug field | operators may lose one diagnostic value | refund troubleshooting only | low | low | diff hunk, named waiver review |
\`\`\`

The JSON form should carry the same rows under risk_map and connect them to selected_tests, coverage, gate_results, blockers, waivers, and to_reach_go. CI should derive the verdict from those records and reject disagreement between Markdown claims and machine status.

Keep gates in repository configuration. The Guardian starter requires named suites, zero Blocker-class changed-line gaps, no new lint or type errors, no new security findings, migration rollback evidence, and human risk-map review. Team policy may add fields, but it should not disappear into workflow code.

GitHub states that enabled required status checks must pass before collaborators can merge into a protected branch, and it can restrict the expected source of a required check ([GitHub protected branches documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)). Publish the final Guardian verdict as a stable required check while retaining its evidence.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) covers execution wiring, and the [release readiness scorecard](/blog/ai-release-readiness-scorecard-2026) presents the map beside other gates. A green badge alone is insufficient; the report must identify exactly what ran and what remains open.

The git diff behavior risk map is complete only when every Medium and High hunk has a behavior statement, blast radius, evidence path, and disposition. Unknown scope, missing tests, stale coverage, or unreviewed risk keeps the verdict NO-GO.

Have the reviewer sign off on the map version rather than the pull request description generally. Store reviewer identity, timestamp, HEAD, and the risk-map artifact checksum or run identifier. A new commit invalidates that acknowledgment because behavior, callers, tests, or containment may have changed. Regenerate the map first, then request a fresh review.

## Review the Workflow and Produce a Verdict

Use a named reviewer for the map because semantic impact requires product and code context. The Guardian can collect references and propose classifications, but it cannot be the human acknowledgment required by the process gate.

Apply this final checklist:

1. Scope records one base, merge base, and full HEAD across all artifacts.
2. Every path status, exclusion, generated input, and deleted test remains visible.
3. Every Medium or High hunk maps to user-facing behavior in plain language.
4. Changed exports trace at least one caller level, with dynamic edges marked unknown.
5. Blast radius names population, path, data, time, reversibility, and detection where relevant.
6. Selected tests, required suites, coverage, and assertions connect to each mapped behavior.
7. Gaps are blockers, accepted named waivers, proven debt, or unknown, never unlabeled.
8. Markdown and JSON reports derive the same verdict from repository gates.

Rebuild the map whenever HEAD changes. A later commit can add a caller, remove a test, alter containment, or close a blocker. Preserve report history so reviewers can see why the verdict changed rather than only seeing the latest label.

Install or review [AI Release Guardian in the QASkills directory](/skills), then map one real pull request from hunk to behavior, blast radius, test, and gate evidence. Require a named human risk-map review before allowing the final check to report GO.

## Frequently Asked Questions

### Is a file-level risk label enough?

No. One file can contain a High permission decision, Medium business logic, and Low diagnostics. Map meaningful hunks to observable behavior and split entries when owners or evidence differ. File labels can route review, but they cannot replace caller tracing, blast-radius analysis, or outcome-specific tests.

### How far should caller tracing go?

Trace at least one level for every changed export, then continue when that caller reveals shared middleware, public routes, events, or contracts. Stop only when the behavior and exposed boundary are clear. Mark runtime-computed or external reach unknown rather than pretending repository search proved completeness.

### Does a large diff always mean High risk?

No. Size affects analysis confidence and may exceed the Guardian's honest review budget, but behavior determines product risk. A large generated update can be mechanically low, while one authorization condition can be High. Very large source diffs should be split when reviewers cannot analyze them honestly.

### Can automated dependency graphs create the whole map?

They can identify static reach and help select tests, but they do not explain user-facing outcomes, migration compatibility, external consumer assumptions, or acceptable containment. Use graphs as cited evidence, then add semantic behavior statements and human review. Missing dynamic edges must remain visible.

### What if no related test is found?

For Medium or High behavior, record the empty selection as a blocker unless another named suite demonstrably exercises the path at the judged HEAD. For reviewed Low presentation work, repository policy may allow zero tests. Never describe a zero-test result as all related tests passing.

### Who makes the final release decision?

A human release owner does. AI Release Guardian recommends GO, GO WITH WAIVERS, or NO-GO from configured gates and cited evidence. It never merges, deploys, tags, approves, or softens missing evidence. The human may act with urgency, but the report should preserve the factual verdict.
`,
};
