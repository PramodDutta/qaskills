import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Feature Flag Exposure Testing: Assignment, Exposure Events, and Guardrails',
  description:
    'Learn feature flag exposure testing: assignment vs exposure events, schemas, sticky bucketing, and guardrails that protect experiment integrity in CI.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Feature Flag Exposure Testing: Assignment, Exposure Events, and Guardrails

Feature flag exposure testing checks whether the people who actually saw a treatment are the ones counted in your experiment, not merely the people your SDK assigned to a bucket. Assignment is the decision of which variant a subject would receive. Exposure (sometimes called an impression) is the recorded fact that the subject encountered the experience under test. Guardrails are automated checks that stop bad traffic mixes, kill-switch miswires, and sample-ratio failures from reaching analysis. If you only assert that \`evaluate()\` returned \`treatment\`, you are testing assignment. Feature flag experiment testing that stops there routinely ships biased results because assignment can fire on cold starts, prefetch, bots, and admin paths that never render the change.

This guide is for QA and test-automation engineers who own the integrity of experiments behind flags. It covers the assignment versus exposure distinction, the event schema fields that belong in assertions, deduplication rules, who gets counted, sticky bucketing tests, and how to wire unit, integration, and journey checks into release pipelines. The same mental model applies when you A/B test UI copy, pricing modules, or LLM prompt variants. For prompt-specific experiment design, pair this data-model work with the [A/B testing LLM prompts guide](/blog/ab-testing-llm-prompts-guide).

## Assignment Is Not Exposure

Assignment answers: given this subject key, experiment key, and targeting rules, which variation would the system select? Exposure answers: did that subject actually experience the variation in a way that should enter the analysis set?

Those two events often diverge. A server-side evaluator may assign a visitor during middleware so downstream services can read a consistent bucket. The visitor may bounce before the homepage module mounts. An edge worker may assign for cache keying. A mobile client may assign on launch while the feature screen is three taps away. In every case, assignment happened and exposure did not. If your analytics pipeline joins conversion metrics to assignment rows, bounce traffic dilutes both arms and can hide a real lift or invent a false one.

What people get wrong is treating "the flag evaluated to on" as proof the user saw the treatment. Product managers ask for a screenshot of the toggle. Engineers point at the evaluation log. Analysts build a cohort from the evaluation table. Nobody checks whether an exposure event fired with the same subject, experiment, and variation identifiers. The cohort then includes support impersonation sessions, synthetic monitors that hit authenticated APIs, and users who received the flag payload but rendered a fallback because a dependency timed out.

A useful test vocabulary separates three moments:

1. **Eligibility**: the subject matches targeting (country, plan, attribute).
2. **Assignment**: a stable variation is chosen and preferably persisted (sticky bucketing).
3. **Exposure**: the product surface that carries the experiment is shown or otherwise delivered.

Eligibility without assignment happens when a holdout or prerequisite flag blocks enrollment. Assignment without exposure happens on prefetch and partial journeys. Exposure without a prior local assignment can happen when a secondary device reads a shared account cookie and logs an impression before the local SDK has hydrated. Your suite should make each of those states observable.

| Moment | What to assert in tests | Common false pass |
|---|---|---|
| Eligibility | Targeting attributes produce include or exclude as specified | Hard-coded test user always eligible, production rules never checked |
| Assignment | Same subject key yields same variation across retries under sticky rules | Asserting only that some variation string is non-empty |
| Exposure | Impression event emitted once when UI or API surface is delivered | Counting SDK init or flag fetch as exposure |

When you design feature flag experiment testing around exposure, you also decide who is in the denominator. Most teams want "users who saw the experiment surface," not "users for whom the SDK could have returned a value." Write that decision into the test plan as a sentence. If two teams disagree, the pipeline will disagree with the dashboard later.

Assignment-only testing also fails closed in the wrong way for negative paths. Suppose treatment should be impossible for free-tier accounts. An assignment test that seeds a free user and expects \`control\` or \`not_in_experiment\` can pass while the billing page still renders a paid-only module because a second flag key was evaluated with different attributes. Exposure testing on the billing surface would catch the stray module; assignment testing on the first key would not. Cross-flag interactions are ordinary in mature catalogs, so your exposure assertions should name the surface and the experiment key together rather than assuming one evaluation represents the whole page.

Bots and monitors deserve an explicit policy. Synthetic checks that authenticate as a shared QA user will enroll that user in sticky buckets and emit exposures that land in warehouse tables unless you tag them. Either exclude those subject keys from analysis fixtures and production metrics, or run synthetics with a \`subjectType\` and attribute that every downstream job filters. Leaving them in silently shifts SRM and conversion rates toward whatever arm the monitor happens to draw.

## The Exposure Event Data Model Testers Should Lock

Testers should treat the exposure event as a contract. Vendor consoles differ, but the fields that matter for integrity testing are stable across systems. Lock a vendor-agnostic shape in your repository and assert against it whether you emit to your warehouse, a CDP, or an experiment platform.

A practical TypeScript contract looks like this:

\`\`\`typescript
export type ExperimentExposure = {
  eventName: 'experiment_exposure';
  eventId: string;
  occurredAt: string;
  subjectKey: string;
  subjectType: 'user' | 'anonymous' | 'account';
  experimentKey: string;
  variationKey: string;
  assignmentId?: string;
  isHoldout: boolean;
  exposureSurface: string;
  sdkName?: string;
  sdkVersion?: string;
  attributes?: Record<string, string | number | boolean | null>;
};

export function assertExposureContract(event: ExperimentExposure): void {
  if (event.eventName !== 'experiment_exposure') {
    throw new Error(\`unexpected eventName: \${event.eventName}\`);
  }
  if (!event.eventId || !event.subjectKey || !event.experimentKey) {
    throw new Error('exposure missing identity fields');
  }
  if (!event.variationKey) {
    throw new Error('exposure missing variationKey');
  }
  if (!/^\\d{4}-\\d{2}-\\d{2}T/.test(event.occurredAt)) {
    throw new Error(\`occurredAt must be ISO-8601, got \${event.occurredAt}\`);
  }
  if (!event.exposureSurface) {
    throw new Error('exposureSurface required for analysis joins');
  }
}
\`\`\`

Field intent matters more than names. \`eventId\` supports deduplication when clients retry. \`subjectKey\` must match the key used for assignment and for outcome metrics. \`experimentKey\` and \`variationKey\` must match the configuration the analysis job reads. \`assignmentId\` (when present) links an exposure back to a sticky assignment record so you can detect orphan impressions. \`isHoldout\` marks subjects reserved as a pure control outside the experiment arms. \`exposureSurface\` records where the experience was delivered (\`checkout_sidebar\`, \`pricing_api\`, \`onboarding_step_2\`) so you do not mix surfaces that share one experiment key by accident.

Deduplication belongs in the model and in the tests. Clients double-fire on React Strict Mode, on page restore from bfcache, and on flaky network retries. Warehouse jobs that count raw rows inflate exposure. A good rule for product analytics is: unique on \`(experimentKey, subjectKey, exposureSurface)\` per calendar day, or unique on \`eventId\` when the producer guarantees idempotent IDs. Pick one rule and encode it in a helper so unit tests and pipeline tests cannot drift.

\`\`\`typescript
export type DedupRule = {
  strategy: 'eventId' | 'subjectExperimentSurfaceDay';
};

export function dedupeExposures(
  events: ExperimentExposure[],
  rule: DedupRule,
): ExperimentExposure[] {
  const seen = new Set<string>();
  const out: ExperimentExposure[] = [];

  for (const event of events) {
    const day = event.occurredAt.slice(0, 10);
    const key =
      rule.strategy === 'eventId'
        ? event.eventId
        : \`\${event.subjectKey}|\${event.experimentKey}|\${event.exposureSurface}|\${day}\`;

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(event);
  }

  return out;
}

export function countExposuresByVariation(
  events: ExperimentExposure[],
  experimentKey: string,
): Record<string, number> {
  const deduped = dedupeExposures(events, {
    strategy: 'subjectExperimentSurfaceDay',
  });

  return deduped
    .filter((e) => e.experimentKey === experimentKey && !e.isHoldout)
    .reduce<Record<string, number>>((acc, event) => {
      acc[event.variationKey] = (acc[event.variationKey] ?? 0) + 1;
      return acc;
    }, {});
}
\`\`\`

Who gets counted in analysis should be an explicit filter, not an implicit join. Typical exclusions: holdout subjects, internal allowlisted emails, synthetic monitor subject keys, subjects exposed only through admin impersonation, and exposures that arrived after the experiment end timestamp. Typical inclusions: anonymous subjects later stitched to a user if your identity graph is trustworthy, and server-delivered exposures for API-only treatments. Write fixtures for each inclusion and exclusion. If the analysis SQL and the test helper disagree, trust neither until they match on the same fixture file.

Holdouts deserve their own assertions. A holdout subject should remain eligible for observation metrics but must not receive treatment variations and must emit \`isHoldout: true\` (or an equivalent marker) when an exposure surface is hit. Teams that reuse the control variation key for holdouts without a marker cannot separate "saw control as part of the experiment" from "was excluded from the experiment." That breaks long-running holdout reads used to measure cumulative launch impact.

Schema evolution is part of the testing job. When you add \`exposureSurface\` months after an experiment started, historical rows lack the field. Warehouse jobs that suddenly require it will drop early traffic or null-fill incorrectly. Version the contract (\`schemaVersion: 1\`) or treat new fields as optional with explicit defaults in both producers and test helpers. Add a migration test that reads a fixture file of v1 events and a file of v2 events through the same normalization function so analysis and QA agree on how missing fields behave.

Clock skew shows up in \`occurredAt\`. Client devices with wrong clocks create exposures "after" experiment end or "before" assignment. Prefer server-received timestamps for analysis joins when you can, and keep client timestamps as diagnostic metadata. Tests should include one fixture where client \`occurredAt\` is wildly wrong and assert your pipeline still attributes the event using the trusted clock. If you only unit-test happy-path ISO strings, you will discover clock issues in the weekly experiment review instead of in CI.

## Guardrails That Belong in Automated Suites

Guardrails are not dashboards you glance at on Fridays. They are assertions that fail a build, a canary, or a nightly integrity job when the traffic shape cannot support a trustworthy readout.

Three guardrails earn a permanent place in automated suites:

1. **Sample ratio mismatch (SRM)**: observed exposure counts across variations diverge from configured weights beyond a statistical threshold.
2. **Kill switch wiring**: turning the experiment off (or forcing everyone to control) must stop treatment exposure within a bounded time and must not continue to log treatment impressions from cached clients without a version bump story.
3. **Max exposure percentage**: a rollout capped at 10% must not expose 40% of eligible sessions because a targeting rule was inverted or a secondary entry point bypassed the percentage gate.

| Guardrail | Signal to assert | Failure mode if skipped |
|---|---|---|
| Sample ratio mismatch | Chi-square or exact multinomial check on exposure counts vs weights | Invisible bucketing bug; one arm starved; decision based on noise |
| Kill switch | After disable, new exposures are control-only or zero treatment | Treatment keeps shipping from stale config caches |
| Max exposure % | Exposed eligible / eligible within tolerance of configured percent | Accidental full rollout during "10% canary" |

A compact SRM helper for tests (illustrative threshold, not a stats package replacement) can fail CI when a fixture or live sample is obviously broken:

\`\`\`typescript
export function assertSampleRatioRoughlyMatches(
  observed: Record<string, number>,
  expectedWeights: Record<string, number>,
  options: { minTotal?: number; maxAbsoluteResidual?: number } = {},
): void {
  const minTotal = options.minTotal ?? 200;
  const maxAbsoluteResidual = options.maxAbsoluteResidual ?? 0.08;
  const total = Object.values(observed).reduce((a, b) => a + b, 0);

  if (total < minTotal) {
    throw new Error(\`not enough exposures for SRM check: \${total}\`);
  }

  const weightSum = Object.values(expectedWeights).reduce((a, b) => a + b, 0);
  for (const variation of Object.keys(expectedWeights)) {
    const expectedShare = expectedWeights[variation] / weightSum;
    const observedShare = (observed[variation] ?? 0) / total;
    const residual = Math.abs(observedShare - expectedShare);
    if (residual > maxAbsoluteResidual) {
      throw new Error(
        \`SRM guardrail failed for \${variation}: observed \${observedShare.toFixed(
          3,
        )} vs expected \${expectedShare.toFixed(3)}\`,
      );
    }
  }
}
\`\`\`

Kill-switch tests should exercise the real config path you use in staging. Stubbing a boolean in memory proves nothing about CDN-cached flag payloads. Prefer: flip the switch through the same Admin or API your on-call uses, wait for the documented propagation window, then drive a fresh browser context through the exposure surface and assert the exposure event stream. If your clients cache assignments locally, assert either that treatment exposure stops or that a forced re-fetch path exists and is covered.

Max exposure percentage is where teams get surprised by multiple entry points. The homepage may honor 10%, while a deep link from email opens a dedicated route that evaluates the flag without the percentage gate. Journey tests that only hit the homepage will green while CRM traffic bleeds treatment to a biased segment. Map every exposure surface in \`exposureSurface\` and run the percentage assertion per surface and in aggregate.

Ready-made QA skills for CI wiring and assertion patterns install from qaskills.sh with the qaskills CLI when you want agents to scaffold these checks instead of pasting helpers by hand.

Guardrail thresholds need product agreement, not only engineering taste. An 8% absolute residual on a 50/50 experiment is a coarse CI tripwire meant to catch inverted weights and missing arms, not a substitute for a proper sequential testing framework. Document that distinction next to the helper so nobody treats a green SRM unit test as statistical proof of balance under low sample sizes. Nightly jobs can tighten thresholds once staging generators produce thousands of exposures; pull-request jobs should stay coarse and deterministic on fixtures.

Kill switches also interact with sticky stores. Disabling an experiment in the remote config does not erase local sticky records. Decide whether disabled experiments should: (a) stop evaluating and fall back to default UX without new exposures, (b) continue serving sticky variations but mark exposures with an experiment-status attribute, or (c) actively reassign everyone to control and emit a final exposure. Option (c) contaminates long-run analyses if you are not careful. Encode the chosen behavior in a journey test that assigns treatment, disables the experiment, relaunches a fresh context with the same subject key, and asserts both UI and event stream against the written policy.

## Sticky Bucketing and Reroll Failures

Sticky bucketing means a subject who was assigned to variation A keeps seeing A across sessions for the life of the experiment (or until sticky state expires), even if targeting weights change. Without stickiness, a user can flip arms between visits, contaminating both experience and metrics. With stickiness implemented badly, a user can still flip when the sticky store is ignored, keyed incorrectly, or cleared too eagerly.

Reroll failures show up as:

- Same \`subjectKey\`, different \`variationKey\` across two assignments inside the sticky window.
- Sticky record written under \`user_id\` while exposure fires under \`anonymous_id\` before login merge.
- Sticky record keyed by device while outcomes are keyed by account, so one account accumulates multiple arms across phones.
- Tests that set a forced variation in QA and forget to clear sticky state, poisoning the next run.

Unit-level sticky tests should not need a vendor SDK. Persist an assignment record the way your app does (cookie, local store, server table), then re-evaluate:

\`\`\`typescript
type StickyAssignment = {
  subjectKey: string;
  experimentKey: string;
  variationKey: string;
  assignedAt: string;
  expiresAt: string;
};

export function readSticky(
  store: Map<string, StickyAssignment>,
  subjectKey: string,
  experimentKey: string,
  nowIso: string,
): StickyAssignment | undefined {
  const row = store.get(\`\${subjectKey}::\${experimentKey}\`);
  if (!row) return undefined;
  if (row.expiresAt <= nowIso) {
    store.delete(\`\${subjectKey}::\${experimentKey}\`);
    return undefined;
  }
  return row;
}

export function assignWithSticky(args: {
  store: Map<string, StickyAssignment>;
  subjectKey: string;
  experimentKey: string;
  chooseVariation: () => string;
  nowIso: string;
  ttlMs: number;
}): StickyAssignment {
  const existing = readSticky(
    args.store,
    args.subjectKey,
    args.experimentKey,
    args.nowIso,
  );
  if (existing) return existing;

  const assigned: StickyAssignment = {
    subjectKey: args.subjectKey,
    experimentKey: args.experimentKey,
    variationKey: args.chooseVariation(),
    assignedAt: args.nowIso,
    expiresAt: new Date(Date.parse(args.nowIso) + args.ttlMs).toISOString(),
  };
  args.store.set(\`\${args.subjectKey}::\${args.experimentKey}\`, assigned);
  return assigned;
}

// example unit assertion
export function expectStickyAcrossRerolls(): void {
  const store = new Map<string, StickyAssignment>();
  let calls = 0;
  const chooseVariation = () => {
    calls += 1;
    return calls === 1 ? 'treatment' : 'control';
  };

  const first = assignWithSticky({
    store,
    subjectKey: 'user_1',
    experimentKey: 'checkout_copy_v3',
    chooseVariation,
    nowIso: '2026-08-27T10:00:00.000Z',
    ttlMs: 7 * 24 * 60 * 60 * 1000,
  });
  const second = assignWithSticky({
    store,
    subjectKey: 'user_1',
    experimentKey: 'checkout_copy_v3',
    chooseVariation,
    nowIso: '2026-08-28T10:00:00.000Z',
    ttlMs: 7 * 24 * 60 * 60 * 1000,
  });

  if (first.variationKey !== 'treatment' || second.variationKey !== 'treatment') {
    throw new Error('sticky bucketing rerolled the subject');
  }
  if (calls !== 1) {
    throw new Error('chooser should not run when sticky record exists');
  }
}
\`\`\`

Identity merge is the sticky failure that escapes unit tests. Anonymous subject \`anon_9\` gets treatment on day one. On day two they log in as \`user_42\`, which already has a sticky control assignment from a prior desktop session. Which arm wins? Product needs a written rule. QA needs a fixture for both "anonymous first" and "authenticated first." Exposure events after merge must carry the subject key your analysis uses post-stitch, or you will double-count one human as two subjects in opposite arms.

TTL edge cases deserve fixtures too. A sticky row that expires between page load and checkout submit can reroll mid-funnel if the client re-evaluates on each step. Users experience a control sidebar and a treatment payment module, while metrics attribute the whole session to whichever arm the last exposure recorded. Journey tests should advance the clock (or inject an expired sticky record) between steps and assert either stable sticky renewal or a hard rule that funnel steps reuse the first exposure's variation without re-choosing.

Shared devices in retail and support environments break naive sticky cookies. A kiosk or shared tablet may accumulate dozens of subject keys, or one sticky cookie may be reused across customers. Prefer server-side sticky keyed by authenticated account for high-stakes experiments, and keep anonymous sticky short-lived. Tests for shared-device flows should clear client storage between personas and prove that account B does not inherit account A's treatment from leftover browser state.

## Test Layers: Unit, Integration, and Journey Checks

Feature flag exposure testing works when each layer owns a different risk.

**Unit tests** own pure functions: targeting predicates, sticky read/write, dedupe, SRM residuals, exposure contract validation, and "shouldEmitExposure" decisions (for example, do not emit on prefetch-only flag reads).

**Integration tests** own the glue: flag config fetch, assignment persistence, event producer, and the repository or queue that stores exposures. Use a real local store or Testcontainers-backed database when the sticky table is shared across services. Mock only the remote config service if its contract is separately tested.

**Journey (e2e) checks** own the human-visible path: open the surface, prove the UI for the forced variation, and prove exactly one exposure event left the browser or server for that subject and surface.

A Playwright-style journey that captures exposure payloads without inventing proprietary SDK APIs can listen for your own beacon:

\`\`\`typescript
import { test, expect } from '@playwright/test';

type Beacon = {
  eventName: string;
  subjectKey: string;
  experimentKey: string;
  variationKey: string;
  exposureSurface: string;
  isHoldout: boolean;
};

test('checkout sidebar exposure fires once for forced treatment', async ({
  page,
}) => {
  const exposures: Beacon[] = [];

  await page.route('**/events/experiment_exposure', async (route) => {
    const body = route.request().postDataJSON() as Beacon;
    exposures.push(body);
    await route.fulfill({ status: 204, body: '' });
  });

  // Force variation through your documented QA override header or cookie.
  await page.context().setExtraHTTPHeaders({
    'x-experiment-override': 'checkout_copy_v3:treatment',
  });

  await page.goto('/checkout');
  await expect(page.getByTestId('checkout-sidebar-treatment')).toBeVisible();

  await expect.poll(() => exposures.length).toBe(1);
  expect(exposures[0]).toMatchObject({
    eventName: 'experiment_exposure',
    experimentKey: 'checkout_copy_v3',
    variationKey: 'treatment',
    exposureSurface: 'checkout_sidebar',
    isHoldout: false,
  });

  await page.reload();
  await expect(page.getByTestId('checkout-sidebar-treatment')).toBeVisible();
  await expect.poll(() => exposures.length).toBeLessThanOrEqual(2);

  const dedupKey = (b: Beacon) =>
    \`\${b.subjectKey}|\${b.experimentKey}|\${b.exposureSurface}\`;
  const unique = new Set(exposures.map(dedupKey));
  expect(unique.size).toBe(1);
});
\`\`\`

Keep overrides explicit and environment-scoped. An override header that works in production is an incident waiting to happen. Assert in a separate test that production configurations reject override headers from non-allowlisted principals.

Unit tests for "assignment without exposure" prevent a class of silent bias:

\`\`\`typescript
import { describe, expect, it } from 'vitest';

type FlagRead = { reason: 'prefetch' | 'render' | 'api_delivery' };

export function shouldEmitExposure(read: FlagRead): boolean {
  return read.reason === 'render' || read.reason === 'api_delivery';
}

describe('exposure emission rules', () => {
  it('does not emit on prefetch assignment reads', () => {
    expect(shouldEmitExposure({ reason: 'prefetch' })).toBe(false);
  });

  it('emits when the experiment surface renders', () => {
    expect(shouldEmitExposure({ reason: 'render' })).toBe(true);
  });

  it('emits for API-delivered treatments', () => {
    expect(shouldEmitExposure({ reason: 'api_delivery' })).toBe(true);
  });
});
\`\`\`

If your architecture cannot tell prefetch from render, fix the instrumentation seam before you scale traffic. No amount of warehouse cleanup restores a clean exposure definition when the producer cannot know what happened.

Integration tests should verify the round trip: forced assignment in, exposure row out, readable by the same query shape the warehouse uses. A pattern that works well is to write exposures to a local table or log sink during the test, then run the dedupe and count helpers against that sink rather than against mocked arrays only. When the producer writes JSON slightly different from the TypeScript type (string \`"true"\` instead of boolean \`true\` for \`isHoldout\`, for example), pure unit fixtures stay green and staging integrity goes red. Contract tests on the serialized payload catch that class of drift.

Layer ownership also decides failure triage. A red unit test on dedupe is a library fix. A red Playwright exposure assertion is usually product instrumentation or override wiring. A red nightly SRM with green journeys often means traffic generators, bot filters, or a second surface you forgot to map. Put those triage hints in the job summary so on-call does not debug the SDK when the generator is at fault.

## Experiment Integrity Failures in Staging

A realistic failure story from a checkout experiment: staging looked perfect. Forced treatment showed the new sidebar. Assignment logs showed a 50/50 split on synthetic traffic. The product team greenlit a 20% production rollout. Three days later, the dashboard showed a catastrophic conversion drop on treatment, SRM alerts fired, and the experiment was paused.

Symptom: treatment conversion 18% relative below control, with treatment receiving only 31% of exposures despite a 50/50 configuration (illustrative figures).

Wrong theory: "The new sidebar copy is toxic; ship a rewrite." Design started new variants while data science investigated.

Actual cause: the treatment bundle lazy-loaded a secondary analytics package that blocked the exposure beacon on slow networks. Control had no such dependency, so control exposures recorded reliably. Treatment users who converted quickly on fast networks were over-represented in the treatment exposure set relative to all users who saw treatment, and many treatment viewers never entered the denominator at all. Separately, a prefetch on the order-status page assigned users to arms without rendering checkout, and those assignment rows were still joined in an older dashboard, double-confusing the readout.

Fix: move exposure emission to the server when the sidebar HTML is delivered, keep a client beacon as a duplicate only after paint, dedupe on \`eventId\`, stop joining outcomes to bare assignment tables, and add a staging integrity job that compares assignment counts to exposure counts per variation with a maximum allowable gap.

The organizational failure underneath the technical one was incentives. Engineering was graded on shipping the flag. Design was graded on iterating copy. Analytics was graded on declaring a winner by a date. Nobody owned "exposure equals analysis denominator." Once that sentence had an owner, the integrity job and the PR checklist stopped being optional polish. If your team argues about tools first, pause and assign ownership of the cohort definition. Tool choice is secondary to agreeing who is counted.

Staging should reproduce that class of failure on purpose. Build a "integrity drama" suite:

| Scenario | Setup | Expected catch |
|---|---|---|
| Prefetch-only assignment | Hit a route that evaluates flags without rendering the surface | Assignments increment, exposures do not |
| Beacon blocked on treatment | Inject a client fault only for treatment bundle | SRM or exposure-gap guardrail fails |
| Override leak | Call production-like config with QA override header | Override ignored or request rejected |
| Holdout mislabel | Enroll holdout subject and open surface | Exposure marked holdout; variation is control; analysis excludes from arms |
| Sticky clash on login | Assign anon treatment, login to user with sticky control | Documented winner wins; single subject key thereafter |

Do not run integrity drama only against mocks. The failures that matter are timing, caching, and identity. Staging data volume can be small; the shapes must be real. When LLM-backed surfaces are part of the experiment (prompt variants, ranked answers), reuse the same exposure contract and keep model-eval scores out of the exposure table. Decision quality for prompts still needs the assignment versus exposure split described in the [A/B testing LLM prompts guide](/blog/ab-testing-llm-prompts-guide), because token-level evals on assigned-but-unseen prompts waste budget and skew human review samples.

## Wiring Assertions Into Release Pipelines

Exposure assertions belong in more than one gate:

1. **Pull request**: unit tests for contract, dedupe, sticky, and emission rules. Fast, no network.
2. **Staging deploy**: Playwright journeys for each active experiment surface with forced variations, plus kill-switch smoke.
3. **Nightly integrity**: aggregate assignment versus exposure gaps, SRM on staging traffic generators, max-exposure percentage against configured caps.
4. **Production canary**: read-only monitors that alert on SRM and exposure gaps without failing customer deploys unless you explicitly choose to.

A minimal CI job sketch (names illustrative) keeps the helpers honest:

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import {
  assertExposureContract,
  countExposuresByVariation,
  type ExperimentExposure,
} from '../exposure';
import { assertSampleRatioRoughlyMatches } from '../guardrails';

const fixture: ExperimentExposure[] = [
  {
    eventName: 'experiment_exposure',
    eventId: 'evt_1',
    occurredAt: '2026-08-27T12:00:00.000Z',
    subjectKey: 'u1',
    subjectType: 'user',
    experimentKey: 'checkout_copy_v3',
    variationKey: 'control',
    isHoldout: false,
    exposureSurface: 'checkout_sidebar',
  },
  {
    eventName: 'experiment_exposure',
    eventId: 'evt_2',
    occurredAt: '2026-08-27T12:01:00.000Z',
    subjectKey: 'u2',
    subjectType: 'user',
    experimentKey: 'checkout_copy_v3',
    variationKey: 'treatment',
    isHoldout: false,
    exposureSurface: 'checkout_sidebar',
  },
];

describe('pipeline exposure fixtures', () => {
  it('accepts contract-valid fixtures', () => {
    for (const event of fixture) {
      expect(() => assertExposureContract(event)).not.toThrow();
    }
  });

  it('counts variations after dedupe', () => {
    const counts = countExposuresByVariation(fixture, 'checkout_copy_v3');
    expect(counts).toEqual({ control: 1, treatment: 1 });
  });

  it('fails obvious weight violations on larger samples', () => {
    const observed = { control: 900, treatment: 100 };
    expect(() =>
      assertSampleRatioRoughlyMatches(observed, {
        control: 0.5,
        treatment: 0.5,
      }),
    ).toThrow(/SRM guardrail failed/);
  });
});
\`\`\`

Release notes for flag changes should list: experiment key, surfaces, sticky TTL, exposure producer (client, server, or both), dedupe rule, and analysis cohort definition. QA signs off when the automated suite covers those statements, not when someone toggled a switch once on a laptop.

Ownership prevents drift. Platform engineering owns the contract library and SRM helper. Product QA owns journey coverage per surface. Data engineering owns the warehouse dedupe matching the test helper. If any of those three edits the rule alone, integrity regresses quietly.

When you add a new experiment, require a checklist in the PR template: exposure surface name, forced-override method for QA, sticky identity key, holdout behavior, kill-switch path, and the pipeline job that will catch SRM. Experiments that cannot answer those lines are not ready for traffic, regardless of how good the screenshot looks.

Artifact discipline keeps flaky exposure journeys diagnosable. On failure, store the network log of exposure beacons, the sticky store contents (cookie or local entry), the flag config version hash your client received, and the subject key used. Without those four pieces, "exposure count was 0" becomes a guess among override failure, ad blocker, wrong surface, or config not propagated. Attach them the same way you already attach Playwright traces for UI failures.

Environment parity matters more for flags than for ordinary UI tests. Developers often run against a local boolean override file that never exercises remote targeting, percentage rollouts, or holdouts. Require at least one CI job against a staging config that mirrors production rules with reduced traffic, not only against local overrides. Local overrides remain useful for fast feedback on treatment UI, but they are not feature flag experiment testing in the integrity sense.

Finally, retire experiments deliberately. When an experiment concludes and the winning variation becomes the default product behavior, remove the experiment key from exposure producers or mark it \`status: concluded\` so stale clients do not keep sending arms into live dashboards. Add a scheduled test that fails if production emits exposures for concluded keys above a tiny residual threshold (old mobile clients). Residual noise from concluded experiments is a common reason analysts distrust the entire exposure table.

## Frequently Asked Questions

### What is the difference between feature flag assignment and exposure?

Assignment is the bucketing decision for a subject under an experiment key. Exposure is the recorded delivery of that experience to the subject on a real surface. You can assign during middleware, prefetch, or app launch without the user ever seeing the change. Analysis should default to exposure-based cohorts, because assignment-only cohorts include people who never experienced the treatment or control UI. Tests must emit and assert both events, then prove they diverge in prefetch scenarios so the team learns the difference before production traffic encodes the mistake.

### Why does testing only assignment miss experiment integrity issues?

Assignment tests prove the SDK or evaluator returned a variation. They do not prove the beacon fired, the UI rendered, dedupe worked, holdouts were marked, or weights matched observed traffic. Integrity bugs live in those gaps: blocked treatment beacons, deep links bypassing percentage rollouts, sticky identity mismatches on login, and dashboards joining conversions to assignment tables. A green assignment unit test with a broken exposure producer will still ship a biased experiment. Pair assignment checks with exposure contract tests, journey beacons, and SRM guardrails.

### Which fields belong in an experiment exposure event for reliable analysis?

At minimum: a stable event name, unique \`eventId\`, ISO timestamp, \`subjectKey\`, \`subjectType\`, \`experimentKey\`, \`variationKey\`, holdout marker, and \`exposureSurface\`. Optional but valuable fields include \`assignmentId\`, SDK name and version, and a small attributes map used for debugging targeting. Dedup keys should be documented beside the schema. If subject identity can change (anonymous to user), record how post-merge exposures are keyed so warehouse joins and test helpers stay aligned.

### How should sticky bucketing be tested across sessions and devices?

Assert that within the sticky TTL, re-evaluation does not call the chooser again and returns the same \`variationKey\` for the same sticky identity key. Add fixtures for expiry, for anonymous-to-authenticated merge conflicts, and for multi-device access to one account. Journey tests should restart the browser context, reuse the same subject key, and confirm both UI and exposure events remain on the original arm. Clear QA overrides and sticky stores between tests so forced variants do not leak into later cases and create false rerolls.
`,
};
