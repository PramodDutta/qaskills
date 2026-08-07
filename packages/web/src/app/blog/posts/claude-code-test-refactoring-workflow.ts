import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Claude Code Test Refactoring Workflow: Preserve Behavior While Cutting Test Debt',
  description: 'Follow a claude code test refactoring workflow that characterizes behavior, limits semantic drift, validates each slice, and safely removes test debt.',
  date: '2026-08-07',
  category: 'AI Testing',
  content: `
# Claude Code Test Refactoring Workflow: Preserve Behavior While Cutting Test Debt

A safe claude code test refactoring workflow begins by freezing observable behavior, classifying each test's purpose, and setting a narrow change boundary. Ask Claude Code to inspect before editing, create a characterization map, refactor one smell at a time, and run both focused and broader verification after every slice. Review semantic changes separately from mechanical changes so a cleaner suite does not quietly become a weaker suite.

Claude Code is well suited to test refactoring because it can search a repository, edit multiple files, run commands, and interpret failures in one loop. Those capabilities also increase the blast radius of an underspecified request. "Clean up these tests" can produce renamed cases, shared fixtures, new mocks, deleted coverage, production changes, and snapshot updates at once. The workflow must make preservation constraints explicit before the agent touches code.

The process below uses a Vitest service suite, then extends the same reasoning to browser and integration tests. It treats refactoring as behavior-preserving unless a separately reviewed correction is approved. For a wider model of how coding agents fit into QA, consult the [agentic AI testing guide for 2026](/blog/agentic-ai-testing-guide-2026).

## Define what refactoring is allowed to change

Test refactoring changes the way a suite expresses and provisions checks without intentionally changing the product contract. That definition excludes adding a new behavior, changing an expected result, accepting a previously rejected input, or modifying production code to make the new test arrangement easier. Those may be valuable changes, but mixing them into the same pass destroys review clarity.

Create a change charter before starting:

| Dimension | Allowed in a refactor slice | Requires separate approval |
|---|---|---|
| Test names | Clarify behavior and conditions | Change the claimed product outcome |
| Setup | Extract equivalent builders and fixtures | Introduce different default records |
| Assertions | Remove duplication while preserving strength | Loosen exact values or delete side-effect checks |
| Mocks | Consolidate equivalent boundary stubs | Replace a real owned dependency with a mock |
| Timing | Use existing fake clock or deterministic wait | Increase timeout to conceal slowness |
| Production code | None by default | Any seam, export, or behavior change |

Tell Claude Code that this charter is authoritative for the session. The agent should stop and report when a desirable edit crosses the boundary. A blocked refactor is useful information: it may expose a missing production seam or an undocumented contract that deserves its own change.

## Give Claude Code durable repository instructions

Claude Code reads project instructions from \`CLAUDE.md\`, and its documentation recommends using that file for project conventions, build commands, and architecture decisions. Keep always-loaded guidance concise. Put the one-off refactor scope in the conversation or a reusable skill, not in a permanent file that affects unrelated work.

A repository instruction can establish preservation rules:

\`\`\`markdown
# Test maintenance

- Treat test-only refactors as behavior-preserving unless the task explicitly says otherwise.
- Do not change production files, snapshots, timeouts, retries, or skipped-test state to obtain green results.
- Use test builders from test/support when they exist.
- Preserve assertions about persistence, emitted events, authorization, and absence of side effects.
- Run the narrowest changed suite first, then the package test and typecheck scripts.
- Report commands actually run and checks left unexecuted.
\`\`\`

Do not turn \`CLAUDE.md\` into a complete testing manual. Claude Code's current documentation explains that large always-loaded context can dilute instruction adherence. Put detailed fixture references close to the relevant package or load them only for the workflow.

| Instruction home | Suitable content | Loading cost | Maintenance owner |
|---|---|---:|---|
| Root \`CLAUDE.md\` | Universal preservation and evidence policy | Every session | Repository maintainers |
| Nested instruction file | Package-specific test commands and boundaries | When that area is used | Package team |
| Reusable skill | Multi-step refactor procedure and checklists | On demand | QA platform team |
| Task prompt | Exact files, exclusions, and current objective | Current session only | Change author |

Official behavior and configuration can evolve, so verify current details at https://code.claude.com/docs/en/overview and the linked configuration references rather than copying old examples blindly.

## Inventory the suite before removing duplication

Duplication in tests is sometimes accidental and sometimes diagnostic. Three tests may repeat setup because each needs a slightly different account state. Extracting that setup into a builder with permissive defaults can erase the distinction. Ask Claude Code to inventory the suite without editing.

\`\`\`text
Inspect src/subscriptions/change-plan.test.ts, the subject under test, and every helper
the spec imports. Do not modify files.

Return:
1. A table of test name, behavior, precondition, action, and durable assertions.
2. Setup that is byte-for-byte repeated versus setup that is only superficially similar.
3. State shared across tests, including clocks, mocks, environment variables, and records.
4. Assertions that protect persistence, events, authorization, or error identity.
5. Existing package scripts that can verify a refactor.
\`\`\`

Compare the inventory with the code. The model may merge two cases because both end in a conflict response, even though one protects billing state and the other protects authorization privacy. Mark these semantic distinctions before extraction.

Use a characterization map:

| Existing case | Behavior protected | Unique setup fact | Must-preserve oracle | Candidate cleanup |
|---|---|---|---|---|
| Upgrade active plan | Price increases at next renewal | Active subscription | New plan plus billing date | Extract customer setup |
| Reject archived plan | Archived target is unavailable | Target plan archived | Error code, no write | Share plan builder only |
| Hide foreign subscription | Tenant mismatch | Subscription belongs elsewhere | Not found, no event | Keep explicit tenant IDs |
| Repeat same-plan request | Target equals current plan | Same plan ID | No duplicate event | Parameterize only if clarity improves |

This map becomes a guardrail against accidental test deletion. Every original behavior should either map to a refactored test or be called out as an intentional change awaiting approval.

## Capture a clean baseline and recognize existing failures

Run the focused suite before editing. A baseline distinguishes refactor regressions from pre-existing failures and exposes environment dependencies while the code is still familiar. Record command, exit status, and relevant failures.

If the repository scripts are \`test:unit\` and \`typecheck\`, the baseline might use:

\`\`\`bash
npm run test:unit -- src/subscriptions/change-plan.test.ts
npm run typecheck
git diff -- src/subscriptions/change-plan.test.ts
\`\`\`

Use only scripts that actually exist. The final diff command should be empty before work unless the user already has changes. Claude Code must preserve user modifications and avoid attributing them to the refactor.

When the baseline is red, do not automatically fix it. Classify the failure:

| Baseline result | Safe response | Unsafe response |
|---|---|---|
| Fully green | Proceed with small slices | Refactor the whole directory at once |
| Deterministic existing failure | Record it and preserve failure signature | Change expectation inside cleanup |
| Intermittent failure | Reproduce and isolate cause first | Add retry or timeout |
| Environment service missing | Limit local claim and rely on documented CI | Mock the service without approval |
| Type failure unrelated to target | Note exact scope and continue cautiously | Claim repository verification passed |

A behavior-preserving refactor cannot be proven by "green before and after" when the starting point is already red. It can still proceed, but the evidence and confidence must be narrower.

## Ask for a sequence of reversible slices

Claude Code should propose edits small enough to review and revert independently. A good sequence removes one source of ambiguity at a time:

1. Rename misleading tests without changing bodies.
2. Extract a pure data builder with explicit defaults.
3. Replace repeated setup in two representative tests.
4. Run the focused suite and inspect the diff.
5. Migrate remaining equivalent setup.
6. Consolidate cleanup without broadening deletion scope.
7. Consider parameterization only after behavior remains visible.

Prompt for a plan that names files and preservation evidence:

\`\`\`text
Propose a test-only refactor plan in reversible slices.
For each slice, state:
- exact files touched,
- smell removed,
- behavior that could accidentally change,
- focused command to run,
- diff evidence I should review.

Do not include production edits. Keep tenant identity and event assertions explicit.
Wait for approval before implementing the first slice.
\`\`\`

This forces the agent to surface risk before acting. If a slice says "replace integration repository with a mock to make tests faster," reject or separate it because it changes the tested boundary.

## Extract builders without hiding the important preconditions

Builders are a common refactor target. A builder improves tests when it centralizes valid noise and lets each case state its relevant differences. It harms tests when its defaults contain the behavior under examination.

Consider repetitive inline objects:

\`\`\`ts
const subscription = {
  id: 'subscription-17',
  tenantId: 'tenant-a',
  customerId: 'customer-3',
  planId: 'starter',
  status: 'active' as const,
  renewsAt: '2026-09-01T00:00:00.000Z',
};
\`\`\`

A typed builder can keep valid defaults while requiring identity to be visible:

\`\`\`ts
type Subscription = {
  id: string;
  tenantId: string;
  customerId: string;
  planId: string;
  status: 'active' | 'paused' | 'cancelled';
  renewsAt: string;
};

export function buildSubscription(
  identity: Pick<Subscription, 'id' | 'tenantId' | 'customerId'>,
  overrides: Partial<Omit<Subscription, keyof typeof identity>> = {},
): Subscription {
  return {
    ...identity,
    planId: 'starter',
    status: 'active',
    renewsAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}
\`\`\`

Requiring identity prevents a cross-tenant test from silently receiving the same tenant for both actors. The plan and status remain overridable because tests frequently vary them. Whether this exact tradeoff fits a repository depends on its domain risks.

Ask Claude Code to migrate two tests first. Review object equality, default timestamps, and mutation behavior. If production or fixtures mutate input objects, a shared object instance can create order dependence. Builders should return a fresh object every call.

## Consolidate assertions without weakening the oracle

Assertion helpers should communicate a domain outcome and keep failure messages useful. Avoid helpers named \`expectSuccess\` that accept \`unknown\` and check only a truthy field. They hide which values matter and can make unrelated results pass.

Compare two patterns:

\`\`\`ts
// Too weak for a billing transition.
function expectChanged(result: { ok?: boolean }) {
  expect(result.ok).toBe(true);
}

// Narrow domain helper with explicit contract fields.
function expectPlanChanged(
  result: ChangePlanResult,
  expected: { subscriptionId: string; planId: string; renewsAt: string },
) {
  expect(result).toEqual({ kind: 'changed', ...expected });
}
\`\`\`

Even the stronger helper should not absorb every assertion. Persistence and event checks belong in the test when they are central to that behavior. Reading the case should reveal that a rejected change produces no write and no event.

What people get wrong is measuring refactor success by line-count reduction. Parameterizing four tests into a table can save lines while hiding distinct setup and failure semantics. A test suite is operational documentation. Prefer lower cognitive load and stronger failure localization over the smallest file.

## Parameterize only genuinely identical behavior

Table-driven tests are effective when the arrange, act, and assertion shape is identical and only values change. They are poor when each row needs a comment to explain a different business rule.

| Case family | Parameterize? | Rationale |
|---|---:|---|
| Several archived plan IDs return the same code | Yes, if IDs are meaningful equivalence representatives | Same branch and oracle |
| Missing plan versus foreign-tenant plan | Usually no | Same result may protect different risks |
| Currency rounding boundaries | Yes | Inputs and exact outputs form a clear table |
| Success versus database failure | No | Different setup, effects, and diagnostics |
| Browser roles with different visible controls | Maybe | Keep separate if failures need role-specific context |

A safe numeric boundary table remains explicit:

\`\`\`ts
import { describe, expect, it } from 'vitest';

describe('prorated amount', () => {
  it.each([
    { label: 'less than half a minor unit', raw: 1200.004, expected: 1200 },
    { label: 'exactly half a minor unit', raw: 1200.005, expected: 1201 },
    { label: 'more than half a minor unit', raw: 1200.006, expected: 1201 },
  ])('rounds $label', ({ raw, expected }) => {
    expect(toMinorUnits(raw)).toBe(expected);
  });
});
\`\`\`

Before accepting a generated table, ask whether each row reaches the same production decision. If not, separate the cases even when the matcher syntax is similar.

## Keep test seams distinct from production seams

During cleanup, Claude Code may discover that deterministic testing is difficult because production code reads current time directly or creates a network client internally. That is a design concern, not permission to expand the refactor silently.

When this happens, stop the test-only slice and produce a seam proposal:

- The exact nondeterministic dependency.
- The smallest interface or injection point that would expose it.
- Production callers affected.
- Tests enabled by the change.
- Compatibility and rollout risk.

Review and land that production change separately, then resume test cleanup. This preserves causal clarity if behavior changes. It also prevents exporting private functions solely because an agent wants an easier assertion.

MCP connections can add another seam by giving an agent access to external systems. Use them for evidence gathering only when the repository workflow needs it. The [MCP servers for test automation guide](/blog/mcp-servers-test-automation-2026) explains how to constrain tools, credentials, and side effects. A database connection does not authorize Claude Code to rewrite shared test data.

## Diagnose the realistic failure: semantic drift hidden by green tests

Suppose the original suite has two error tests. One expects \`not-found\` for a foreign tenant and asserts that no audit event exists. Another expects \`not-found\` for an unknown subscription. Claude Code parameterizes both into one table, creates all records through a default builder, and retains only the result assertion. The suite stays green and loses the privacy and side-effect oracle.

Diagnose the drift by comparing the characterization map, not just test counts:

1. The foreign-tenant row requires an existing subscription owned by a different tenant.
2. The unknown row requires no subscription at all.
3. Only the first row exercises tenant-scoped lookup against real data.
4. The missing audit assertion allowed a privacy-sensitive side effect to disappear from coverage.

Restore separate cases or use a table that owns explicit setup functions and assertions, though separate cases are clearer here. Then challenge the foreign-tenant test with a local mutation that removes the tenant filter. The test should fail on the result or side-effect assertion. Revert the mutation and inspect the diff.

Green status did not prove preservation because both the setup and oracle drifted in matching directions. This is the central test-refactoring hazard: the test can change what it asks while production remains untouched.

## Verify each slice with code, tests, and diff evidence

After a slice, use three evidence channels:

1. Execution: the focused suite and appropriate broader checks pass.
2. Structural comparison: the characterization map still maps every original behavior.
3. Diff review: only approved files and transformations changed.

Ask Claude Code for a compact report:

\`\`\`text
Review the completed slice without editing.
Report:
- changed files,
- original behavior rows and their new test locations,
- commands run with pass or fail status,
- any changed assertion value, mock boundary, timeout, retry, skip, or snapshot,
- remaining assumptions.

If any semantic value changed, mark the slice as requiring manual approval.
\`\`\`

Do not accept "tests pass" as the whole report. Search the diff for deleted assertions, changed expected values, skipped tests, retry settings, and production files. Static checks cannot determine whether the new setup still represents the same business state.

## Finish with a refactor-specific review gate

Before merging, review the complete branch independently of the incremental conversation. Long sessions accumulate assumptions, and an agent can become anchored to its own earlier interpretation. A fresh review should receive the charter and final diff, not the entire reasoning transcript.

Use this final gate:

- Every original behavior maps to a final test or an approved deletion.
- Test names state conditions and outcomes without overclaiming.
- Builders keep risk-relevant fields visible.
- Assertion helpers retain exact stable contract values.
- Negative cases still prove forbidden writes and events are absent.
- No test depends on order, shared mutable data, live time, or uncontrolled networks.
- No production file, snapshot, retry, timeout, or skip changed unexpectedly.
- Focused, package, type, and CI results are reported at their actual scope.

Claude Code can remove substantial test debt quickly when the task is bounded by observable behavior and frequent verification. The successful unit of work is not "a cleaner file." It is a reversible slice whose behavior mapping, execution evidence, and diff all tell the same story.

## Measure the result without rewarding deletion

Evaluate the refactor with signals that describe maintenance and diagnostic quality. Raw line count, test count, and execution time can be useful, but none should be optimized alone. Deleting a slow integration test improves all three while removing the only check of a real persistence boundary.

Capture the before and after values that match the original smell. If setup dominated each case, compare the number of risk-irrelevant fields a reader must scan. If failures were obscure, deliberately break one shared helper in a temporary local change and compare the resulting test names and messages. If runtime motivated the work, use several comparable runs in the same environment and preserve the boundary being tested.

| Refactor objective | Useful observation | Misleading shortcut |
|---|---|---|
| Reduce setup noise | Important preconditions remain visible near each action | Lowest possible line count |
| Improve failure diagnosis | A deliberate defect points to one behavior and useful values | Fewer test files |
| Remove order dependence | Random or parallel execution remains reliable | One passing serial run |
| Speed up the suite | Same behavioral boundary runs faster across comparable samples | Replacing owned persistence with mocks |

Ask Claude Code to explain any metric improvement in behavioral terms. "Removed 90 lines" is not an outcome. "Centralized valid address defaults while every fraud-risk field remains explicit" is reviewable. The same standard applies to execution speed: document which work was eliminated and why that work was redundant, rather than accepting a faster suite whose confidence boundary silently narrowed.

## Keep an escape hatch for abstractions that do not hold

Some duplication is evidence that two scenarios only look alike today. During a migration, Claude Code may discover that one case needs a different clock, authorization boundary, cleanup order, or error oracle. Do not force it through the new helper merely to finish the planned extraction. Define an escape hatch in the task: preserve the explicit test, report the difference, and stop that migration slice.

Review the exception by asking whether the distinction represents product risk or incidental syntax. A tenant-denied request and an unknown-record request may both return the same status, yet the first protects an information-disclosure boundary. Keeping separate setup and assertions makes that purpose obvious. Conversely, two tests that differ only in irrelevant builder fields can usually share construction safely.

An escape hatch also protects reviewability when a helper signature starts accumulating flags. Boolean options such as include authorization, skip cleanup, expect event, and use legacy clock signal that unrelated scenarios are being compressed into one abstraction. Revert the latest migration, split the helper by responsibility, or leave the test explicit. The right response is rarely another option whose combinations nobody validates.

Record exceptions in the refactoring map, not as silent unfinished work. State which test remained explicit, the semantic difference, and whether follow-up design is needed. This gives the next maintainer context without turning the current patch into an architecture project. A refactor succeeds when the resulting structure tells the truth about commonality. Allowing a proposed abstraction to fail is part of that success, because it prevents cleaner-looking code from hiding distinct contracts.

## Frequently Asked Questions

### Should Claude Code refactor production code while cleaning tests?

Not by default. Start with a test-only charter so reviewers can judge behavioral preservation. If the cleanup exposes a missing clock, repository, or network seam, pause and propose the smallest production design change separately. That change deserves its own compatibility analysis and verification. Mixing it into test cleanup makes a green result ambiguous because both the subject and its oracle moved. After the seam is reviewed and landed, resume the test refactor against the new explicit boundary.

### How large should one Claude Code refactoring slice be?

A slice should be small enough that a reviewer can explain every changed assertion and setup default without relying on the agent's summary. Renaming cases, introducing one builder, migrating two representative tests, or consolidating one cleanup path are useful sizes. Run the focused suite after each slice and a broader check when shared helpers change. If the diff combines fixture extraction, parameterization, snapshot updates, and production edits, split it before deciding whether behavior was preserved.

### Are passing tests before and after enough proof of a safe refactor?

No. A test can stay green while its setup and expectation drift together, or while a critical assertion is deleted. Add a characterization map that connects original behaviors to final tests, inspect the diff for semantic values and side effects, and challenge high-risk cases with plausible mutations. Baseline and final execution are necessary evidence, but they answer only whether each version passed its own tests. They do not prove that both versions tested the same contract.

### When should duplicated tests remain duplicated?

Keep separate tests when the cases protect different risks, require materially different setup, or need distinct failure diagnostics. A foreign-tenant lookup and an unknown ID may return the same result while exercising different privacy guarantees. Likewise, two browser roles may share steps but need readable role-specific assertions. Extract noisy construction where helpful, but keep risk-relevant preconditions visible. Duplication is cheaper than an abstraction that hides why a case exists or makes failures harder to localize.
`,
};
