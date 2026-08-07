import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Feature Flag Testing Combinatorial Coverage Without Exploding CI',
  description: 'Plan feature flag testing combinatorial coverage that catches risky interactions while keeping CI fast, diagnosable, and release-ready for teams.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Feature Flag Testing Combinatorial Coverage Without Exploding CI

Feature flag testing combinatorial coverage is the discipline of choosing which flag combinations to test when multiple toggles can interact. The naive answer is to test every on/off state. That works for two or three flags and collapses as soon as a service has ten active flags, role gates, environment gates, migration switches, and kill switches. The useful answer is to combine risk-based testing, pairwise coverage, explicit forbidden states, and a small number of end-to-end journeys that prove the release path.

For QA engineers, the job is not to make a spreadsheet of every theoretical combination. The job is to identify the combinations that can break users, make those states reproducible in tests, and keep the failures readable. A good feature-flag coverage plan tells you whether a new checkout flow works with the old pricing engine, whether a disabled migration flag still preserves data, whether a role-gated experiment leaks UI, and whether the rollback path remains safe.

This guide shows a runnable TypeScript approach that turns a flag catalog into selected test cases. It also covers how to split checks across unit, integration, API, and browser tests so CI does not spend hours proving unimportant states. Since flag-heavy suites can become noisy in pull requests, pair this strategy with [canceling stale E2E runs on new commits](/blog/ci-cancel-stale-e2e-runs-on-new-commit) and with [GitLab CI JUnit reports for flaky tests](/blog/gitlab-ci-junit-report-flaky-tests) when you need failure history that points to the exact flag state.

## Start With a Flag Catalog That Tests Can Read

Combinatorial testing fails when the source of truth is tribal memory. The test suite needs a catalog that names each flag, its allowed values, owner, default state, expiry date or review date, rollout type, and known dependencies. The catalog can live in code, YAML, JSON, or your flag platform if it exposes reliable export APIs. What matters is that tests can read a stable snapshot.

Do not treat every flag as boolean. Many real systems have variants such as \`control\`, \`treatment\`, \`off\`, \`shadow\`, or \`read_only\`. Others are numeric thresholds, tenant allow lists, or percentage rollouts. For combinatorial coverage, convert each test-relevant flag into a finite set of named states. If a percentage flag is 17 percent in production, tests usually need states such as \`off\`, \`forced_on\`, and \`bucketed_user\`, not every possible percentage.

| Catalog field | Example | Why QA needs it |
|---|---|---|
| \`key\` | \`new_checkout\` | Stable reference in tests and reports |
| \`states\` | \`off\`, \`on\` | Defines the combination search space |
| \`defaultState\` | \`off\` | Supports baseline and rollback tests |
| \`owner\` | \`payments-platform\` | Routes failures and expiry cleanup |
| \`risk\` | \`high\` | Drives deeper coverage for dangerous flags |
| \`dependsOn\` | \`pricing_v2\` | Prevents impossible or misleading combinations |
| \`expiresOn\` | \`2026-09-30\` | Stops stale flags from bloating suites |

A typed catalog gives both application code and tests a shared vocabulary:

\`\`\`ts
export type FlagState = 'off' | 'on' | 'control' | 'treatment' | 'shadow';

export type FeatureFlagDefinition = {
  key: string;
  states: FlagState[];
  defaultState: FlagState;
  risk: 'low' | 'medium' | 'high';
  owner: string;
  dependsOn?: Array<{ key: string; state: FlagState }>;
  cannotCombineWith?: Array<{ key: string; state: FlagState }>;
};

export const featureFlags: FeatureFlagDefinition[] = [
  {
    key: 'new_checkout',
    states: ['off', 'on'],
    defaultState: 'off',
    risk: 'high',
    owner: 'payments-platform',
    dependsOn: [{ key: 'pricing_v2', state: 'on' }],
  },
  {
    key: 'pricing_v2',
    states: ['off', 'on', 'shadow'],
    defaultState: 'off',
    risk: 'high',
    owner: 'pricing',
  },
  {
    key: 'receipt_redesign',
    states: ['control', 'treatment'],
    defaultState: 'control',
    risk: 'medium',
    owner: 'growth',
  },
];
\`\`\`

The catalog should be reviewed like test data. If a flag has no owner or no planned removal, the suite will carry it forever. Stale flags are not only product debt. They multiply the test state space and make failures harder to interpret.

## Calculate the Size of the Problem Before Arguing About Coverage

Before choosing a strategy, calculate how many states exist. Five boolean flags produce 32 combinations. Ten produce 1,024. Ten flags with three states each produce 59,049. Add user roles, locales, payment methods, and browser engines, and full Cartesian testing becomes absurd.

\`\`\`ts
export function countCartesianCombinations(flags: FeatureFlagDefinition[]) {
  return flags.reduce((total, flag) => total * flag.states.length, 1);
}

console.log(countCartesianCombinations(featureFlags));
\`\`\`

That number is a teaching tool. It helps stakeholders understand why \`test every combination\` is not responsible when every run requires seeded data, browser setup, and downstream calls. The right target is not mathematical completeness at every layer. The right target is enough coverage to catch likely and severe interactions while keeping feedback fast enough for developers to use.

| Flag count and states | Full combinations | Practical interpretation |
|---|---:|---|
| 4 boolean flags | 16 | Full coverage may be reasonable in API or unit tests |
| 8 boolean flags | 256 | Full E2E coverage is usually too expensive |
| 10 boolean flags | 1,024 | Use pairwise plus targeted high-risk triples |
| 6 flags with 3 states | 729 | Collapse nonessential states and test by layer |
| 12 flags with mixed states | Often thousands | Partition by domain and ownership |

Calculate per domain rather than across the whole company. Checkout flags, search ranking flags, and admin-dashboard flags rarely need to be combined in one browser journey. Partitioning by user workflow and service boundary reduces meaningless combinations.

## Use Pairwise Coverage for Interaction Bugs

Pairwise coverage means every pair of flag states appears together in at least one selected test case. It is not magic, and it does not prove every three-way interaction. It is useful because many configuration bugs are caused by two settings interacting: new UI with old API, shadow pricing with old receipt, migration on with cache off. Pairwise gives broad interaction coverage with far fewer tests than the full Cartesian set.

A simple greedy selector can build a pairwise suite from a small flag set:

\`\`\`ts
type FlagAssignment = Record<string, FlagState>;

function cartesian(flags: FeatureFlagDefinition[]): FlagAssignment[] {
  return flags.reduce<FlagAssignment[]>(
    (rows, flag) =>
      rows.flatMap((row) =>
        flag.states.map((state) => ({ ...row, [flag.key]: state })),
      ),
    [{}],
  );
}

function pairKey(a: string, aState: string, b: string, bState: string) {
  return [a, aState, b, bState].join('::');
}

function requiredPairs(flags: FeatureFlagDefinition[]) {
  const pairs = new Set<string>();

  for (let i = 0; i < flags.length; i += 1) {
    for (let j = i + 1; j < flags.length; j += 1) {
      for (const leftState of flags[i].states) {
        for (const rightState of flags[j].states) {
          pairs.add(pairKey(flags[i].key, leftState, flags[j].key, rightState));
        }
      }
    }
  }

  return pairs;
}
\`\`\`

This first part generates all possible assignments and all required pairs. For very large catalogs, use a proven covering-array generator or split by domain. For a service-level suite with a dozen finite states, a greedy script is often enough.

\`\`\`ts
function coveredPairs(row: FlagAssignment, flags: FeatureFlagDefinition[]) {
  const pairs = new Set<string>();

  for (let i = 0; i < flags.length; i += 1) {
    for (let j = i + 1; j < flags.length; j += 1) {
      pairs.add(
        pairKey(
          flags[i].key,
          row[flags[i].key],
          flags[j].key,
          row[flags[j].key],
        ),
      );
    }
  }

  return pairs;
}

export function selectPairwiseRows(flags: FeatureFlagDefinition[]) {
  const allRows = cartesian(flags).filter((row) => isAllowed(row, flags));
  const uncovered = requiredPairs(flags);
  const selected: FlagAssignment[] = [];

  while (uncovered.size > 0) {
    const best = allRows
      .map((row) => ({
        row,
        newCoverage: [...coveredPairs(row, flags)].filter((pair) =>
          uncovered.has(pair),
        ).length,
      }))
      .sort((a, b) => b.newCoverage - a.newCoverage)[0];

    if (!best || best.newCoverage === 0) break;

    selected.push(best.row);
    for (const pair of coveredPairs(best.row, flags)) {
      uncovered.delete(pair);
    }
  }

  return selected;
}
\`\`\`

The missing function, \`isAllowed\`, is where production reality enters. You do not want tests for impossible states. If \`new_checkout = on\` requires \`pricing_v2 = on\`, a pairwise generator should not select a row that violates the dependency and then fail for an irrelevant reason.

## Encode Forbidden and Required States Explicitly

Dependencies are not comments. They are part of the test model. A generator that ignores them creates false failures and trains engineers to distrust coverage. Encode required states and forbidden pairings before selecting combinations.

\`\`\`ts
export function isAllowed(
  row: FlagAssignment,
  flags: FeatureFlagDefinition[],
) {
  for (const flag of flags) {
    for (const dependency of flag.dependsOn ?? []) {
      if (row[flag.key] !== 'off' && row[dependency.key] !== dependency.state) {
        return false;
      }
    }

    for (const forbidden of flag.cannotCombineWith ?? []) {
      if (
        row[flag.key] !== flag.defaultState &&
        row[forbidden.key] === forbidden.state
      ) {
        return false;
      }
    }
  }

  return true;
}
\`\`\`

You may need a richer rule model for enterprise platforms, but keep the first version readable. QA engineers should be able to explain why a combination exists. If the rule engine becomes too clever, a failed test may require debugging the generator before debugging the product.

## Choose the Right Test Layer for Each Combination

Not every combination deserves a browser test. Browser journeys are expensive and often slow to diagnose. Push as much combinatorial coverage as possible down to unit, component, service, and API tests. Use E2E tests for critical user flows and for states that can only be verified through the integrated system.

| Layer | Good flag coverage target | Example assertion | Avoid |
|---|---|---|---|
| Unit | Pure decision logic across many combinations | Price calculator chooses correct rule set | Mocking so much that integration risks disappear |
| Component | UI variants for role and flag states | Button appears only in treatment | Full backend setup for every visual state |
| API or service | Pairwise domain flags with seeded data | Endpoint honors old and new workflow contracts | Combining unrelated product domains |
| E2E | Release path, rollback path, highest-risk pairings | User completes checkout under selected states | Cartesian coverage across all active flags |
| Observability | Flag state appears in logs or trace attributes | Failure report includes flag snapshot | Logging personal data or secrets |

This split matters because feature flags change often. A unit-level pairwise suite can run on every commit. A browser-level matrix might run on pull requests for high-risk changes and nightly for broader coverage. The model should produce the selected states once, then each test layer can consume the subset it owns.

## Make Flag State Visible in Test Names and Reports

A failed test named \`checkout works\` is useless when it ran under eight flags. Include the relevant flag state in the test title, JUnit properties, trace metadata, or screenshot name. The failure should be routeable to the right owner without rerunning the suite.

\`\`\`ts
function describeFlags(row: FlagAssignment) {
  return Object.entries(row)
    .map(([key, state]) => key + '=' + state)
    .sort()
    .join(', ');
}

const selectedRows = selectPairwiseRows(featureFlags);

describe.each(selectedRows)('checkout flags: %s', (row) => {
  it('creates an order with ' + describeFlags(row), async () => {
    await applyFlagState(row);
    const order = await createCheckoutOrder();
    expect(order.status).toBe('confirmed');
  });
});
\`\`\`

The \`describe.each\` title above is illustrative; different runners format parameterized names differently. The important part is that the flag snapshot is visible in the report. If your test runner supports attachments, add a JSON file containing the exact flag assignment for each failure.

## Build a Deterministic Flag Override Mechanism

Tests need a reliable way to force flag states. Percentage rollout bucketing is appropriate for production traffic, but it is a poor default for deterministic tests. Use one of these mechanisms: environment-specific flag configuration, test account targeting, request headers accepted only in non-production environments, local flag provider stubs, or dependency injection at the service boundary.

The override mechanism must be protected. Never allow arbitrary public clients to set privileged flags by header in production. In a test environment, make the mechanism auditable and resettable.

\`\`\`ts
export async function applyFlagState(row: FlagAssignment) {
  await fetch('http://localhost:4010/test-flags/reset', {
    method: 'POST',
  });

  await fetch('http://localhost:4010/test-flags/apply', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ flags: row }),
  });
}
\`\`\`

This example assumes a local test-only service. If your architecture uses a hosted flag platform, use its documented test targeting or environment APIs instead of creating unofficial database writes. Direct writes to a flag database can bypass cache invalidation and produce a state that no real application instance would observe.

## Test the Rollback Contract, Not Only the Launch Contract

Feature flags exist partly so teams can turn features off. QA often tests \`off\` before launch and \`on\` during launch, but misses \`on then off after data exists\`. Rollback is a state transition, not a static combination.

For a checkout migration, the rollback test might create a cart with \`new_checkout = on\`, complete part of the flow, switch the flag off, and confirm the user can still recover or complete through the old path. For a database migration, it might write data under the new path and read it under the old path if backward compatibility is required.

\`\`\`ts
it('preserves cart recovery when new checkout is rolled back', async () => {
  await applyFlagState({ pricing_v2: 'on', new_checkout: 'on' });
  const cart = await createCartWithItems(['sku-basic-plan']);
  await startCheckout(cart.id);

  await applyFlagState({ pricing_v2: 'on', new_checkout: 'off' });
  const recovered = await recoverCart(cart.id);

  expect(recovered.items).toHaveLength(1);
  expect(recovered.canCompleteCheckout).toBe(true);
});
\`\`\`

This is where full pairwise coverage is less useful than a targeted scenario. Rollback bugs usually involve sequence, persistence, cache, and event processing. Put those in named tests with realistic data.

## Include Observability in the Coverage Contract

When a flag combination fails in production, support and engineering need to know which flags were active. Tests should verify that critical logs, traces, or error reports include a safe flag snapshot. Do not log entire user targeting rules or personal data. Log the evaluated state that affected behavior.

\`\`\`json
{
  "event": "checkout_failed",
  "requestId": "req_test_123",
  "userIdHash": "user_hash_example",
  "featureFlags": {
    "new_checkout": "on",
    "pricing_v2": "shadow",
    "receipt_redesign": "treatment"
  }
}
\`\`\`

An observability assertion can read the emitted test log or trace fixture and confirm the expected keys are present. This is especially valuable for intermittent failures, because rerunning under the wrong flag state can hide the original defect.

## Diagnose a Realistic Failure Mode: Cache and Targeting Drift

A common failure mode is flag cache drift between services. The web app evaluates \`new_checkout = on\`, but the API still has a cached \`pricing_v2 = off\` decision. The browser test shows a checkout button, the API rejects the order, and the failure looks like a business-rule defect. The root cause is inconsistent flag evaluation across boundaries.

Diagnose it by recording the flag snapshot at each boundary. Add the client-evaluated state to test attachments, log the API-evaluated state under the same request ID, and compare them when a failure occurs. If the states differ, inspect cache TTL, environment key, user targeting attributes, and propagation delay. In CI, prefer deterministic local overrides that update all participating services before the journey starts.

Another version appears when tests set flags by account but forget that the worker reuses a session from a previous test. The UI carries a cached assignment. The API sees the new assignment. The report is confusing until you attach both snapshots.

## What Teams Get Wrong About Pairwise Testing

The first mistake is calling pairwise coverage complete testing. Pairwise is a sampling strategy. It is strong for two-way interactions and weak for stateful sequences, data migrations, concurrency, permissions, and rollout transitions. Use pairwise as the broad net, then add targeted tests for high-risk triples and lifecycle flows.

The second mistake is generating combinations without domain ownership. A global pairwise suite across every active flag becomes a mystery tour through unrelated product areas. Partition by workflow, service, or bounded context. Checkout tests need checkout, pricing, discount, tax, and receipt flags. They probably do not need admin-table-density experiments.

The third mistake is leaving old flags in the catalog after launch. Every stale flag multiplies combinations and creates false choices that no user should see. Add an expiry check to CI so expired flags produce a cleanup task or test failure.

\`\`\`ts
export function findExpiredFlags(
  flags: Array<FeatureFlagDefinition & { expiresOn?: string }>,
  today: string,
) {
  return flags.filter(
    (flag) => flag.expiresOn !== undefined && flag.expiresOn < today,
  );
}

const expired = findExpiredFlags(
  featureFlags.map((flag) => ({ ...flag, expiresOn: '2026-09-30' })),
  '2026-10-01',
);

expect(expired.map((flag) => flag.key)).toEqual([]);
\`\`\`

This example uses lexical date comparison with ISO-style dates. If your dates include time zones or non-ISO formats, parse them with a deliberate date library or platform API instead of relying on string order.

## Turn Selected Combinations Into Owned Test Charters

The generator should not be a black box that drops a hundred rows into CI. Convert selected combinations into named charters: baseline behavior, launch behavior, rollback behavior, incompatible dependency guard, role isolation, observability, and data migration. Each charter has an owner and a layer.

| Charter | Flag state pattern | Best layer | Owner |
|---|---|---|---|
| Baseline still works | All defaults | E2E smoke plus API | Feature owner |
| Launch path | High-risk feature on with dependencies | E2E and service | Release owner |
| Pairwise service coverage | Selected domain pairings | API or integration | Service team |
| Rollback after write | On, create data, off, recover | Integration or E2E | Platform and feature |
| Forbidden state guard | Invalid dependency pair | Unit or config validation | Flag owner |
| Expiry cleanup | Expired active flags | CI policy check | Team lead |

This structure makes review easier. A product manager can understand the release path. A backend engineer can inspect service-level pairings. A QA engineer can tune the generator without hiding what user behavior is protected.

## A Practical Rollout Workflow

Start every feature flag with a test plan before the flag ships. Add the flag to the catalog. Define default and launch states. Mark dependencies. Decide which combinations belong in unit, service, API, and E2E suites. Generate pairwise rows for the domain. Add targeted sequence tests for rollback and migration. Make the flag state visible in reports. Set an expiry date. Remove the flag and its combinations when the rollout is complete.

For teams using ready-made agent workflows, this is the kind of repeatable QA routine that can be packaged as a skill and installed from qaskills.sh with the qaskills CLI. The human judgment still matters: the skill can scaffold the matrix, but the team must decide which risks deserve release gates.

Feature flag coverage is successful when a failed test tells you three things quickly: which user workflow broke, which flag state was active, and whether the defect affects launch, rollback, or a stale configuration. That is a much higher bar than \`we tested the flag on and off\`.

## Frequently Asked Questions

### Is pairwise coverage enough for feature flags?

Pairwise coverage is often enough for broad interaction screening, but it is not enough for every risk. Add targeted tests for high-risk triples, rollback sequences, migrations, permission boundaries, and concurrency. A useful rule is to use pairwise for breadth at lower layers and named scenario tests for release-critical behavior at higher layers. If a defect would require three specific flags and a specific data history, pairwise alone is unlikely to catch it.

### Should feature flag combinations run in E2E tests?

Only selected combinations should run in E2E tests. Put the full or pairwise matrix at unit, component, service, or API layers when possible. Browser E2E should focus on all-defaults, launch state, rollback state, and the riskiest interactions that require the integrated system. This keeps CI usable and makes failures diagnosable. If every flag row runs through a browser checkout, engineers will eventually ignore the suite because feedback is too slow.

### How do we prevent stale flags from bloating coverage?

Require owner, expiry or review date, and removal criteria in the flag catalog. Add a CI check that fails or reports expired flags. During rollout completion, delete the flag states, remove targeting rules, simplify code paths, and remove obsolete tests. Stale flags are not harmless. They multiply combinations, preserve dead branches, and make production incidents harder to reason about because nobody remembers which states are still possible.

### What should a test report show for a flag failure?

At minimum, show the test name, workflow, exact flag assignment, user role, environment, request ID, and failing assertion. For integrated tests, attach the evaluated flag state from each service boundary when possible. A screenshot alone is not enough because the visual state may not reveal backend flags. The report should let the owner reproduce the same state without reverse-engineering the generator or rerunning unrelated combinations.
`,
};
