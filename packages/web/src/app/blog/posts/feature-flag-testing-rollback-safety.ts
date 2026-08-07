import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Feature Flag Testing for Rollback Safety: A Practical QA Playbook',
  description: 'Feature flag testing rollback safety workflows for QA teams: matrix coverage, kill-switch drills, and CI gates that keep deploys reversible.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Feature Flag Testing for Rollback Safety: A Practical QA Playbook

Feature flag testing rollback safety is not a soft skill exercise. It is the difference between shipping a dark launch that you can reverse in minutes and shipping a half-on, half-off product that cannot be turned off without a full redeploy. If your team treats flags as a convenience switch rather than a first-class test surface, you will eventually ship a flag that cannot be flipped cleanly, evaluates inconsistently across services, or leaves data in a state that no kill switch can repair.

This guide is for QA and test-automation engineers who already ship with LaunchDarkly, Unleash, Flagsmith, OpenFeature, or a home-grown flag service, and who want concrete workflows: state matrices, contract checks between flag evaluation and UI behavior, Playwright scenarios for dual-path UX, CI jobs that fail when a "safe rollback" claim is false, and drills that prove the kill switch works under load. You will leave with a repeatable test strategy, sample TypeScript and YAML you can adapt, and a diagnosis path for the failure modes that burn teams most often.

The core idea is simple: every flag that can change production behavior must be testable in every state you claim to support, including the state you will use when something goes wrong. Rollback safety is a property of the system under every combination of flag values, defaults, stale caches, and partial rollouts. It is not a property of a single boolean in a dashboard.

## How Feature Flags Create Rollback Paths (and How They Break Them)

A feature flag improves rollback safety when three conditions hold at once. First, the new code path is gated so that flipping the flag off restores the previous user-visible behavior without a code deploy. Second, shared state (database rows, caches, event schemas, feature entitlements) remains compatible with both paths, or the migration is explicitly irreversible and labeled as such. Third, every service that evaluates the flag agrees on identity, targeting, and default when the flag service is slow or unavailable.

Those conditions fail in predictable ways:

1. **Deploy-coupled flags.** The "off" path was deleted in the same PR that introduced the flag, so turning the flag off hits dead code or a 500.
2. **Data-shape coupling.** The "on" path writes a new column or event field that the "off" path cannot read, so rollback leaves corrupt or unreadable records.
3. **Split-brain evaluation.** The edge evaluates \`new-checkout=true\` while the payments service still sees \`false\`, so users see a UI that cannot complete a charge.
4. **Sticky client caches.** The SPA bundled an old SDK snapshot, so operators flip the flag in the console but browsers keep the previous branch for hours.
5. **Default-on disasters.** A missing flag key defaults to \`true\` in one service and \`false\` in another. Outages look like "random" flakes until you compare evaluation logs.

Rollback safety testing exists to catch those five classes before production. Unit tests alone will not do it. You need matrix coverage, integration with a real or simulated flag provider, end-to-end paths for both branches, and explicit kill-switch drills.

## Flag Taxonomy for Testers: What You Must Cover Differently

Not every flag deserves the same test investment. Classify each flag before you write cases.

| Flag type | Typical use | Rollback claim | Minimum test depth |
| --- | --- | --- | --- |
| Release toggle | Ship dark code, enable later | Off restores old path without deploy | Full dual-path E2E + API matrix |
| Experiment / A-B | Measure conversion | Either variant is supported; stop assigns new users | Variant isolation + metrics correctness |
| Ops / kill switch | Instantly disable expensive or risky behavior | Off stops the risky path within SLA | Latency drill + dependency mock |
| Permission / entitlement | Gate plan features | Off hides and blocks server-side | Authz matrix, never UI-only |
| Migration / progressive | Percentage rollout of schema-aware feature | Partial cohorts coexist safely | Cohort consistency + dual-read/write checks |
| Config flag (non-boolean) | Tune timeouts, limits, copy | Config reverts to safe defaults | Bounds tests + default-on-provider-down |

**What people get wrong:** treating every boolean as a "release toggle" and only testing the \`true\` path right before launch. Experiments need statistical and assignment correctness. Kill switches need time-to-effect SLAs. Entitlements need server enforcement. Migration flags need dual-read proofs. If your ticket only says "add tests for the new flag," demand the type first.

## The Dual-Path Contract: Behavior Specs Before Clicks

Before you open Playwright, write a dual-path contract for each release toggle. The contract is a short, testable document (or typed fixture) that states what must hold when the flag is off, on, and when the provider fails.

\`\`\`ts
// flags/contracts/newCheckout.ts
export type FlagState = 'off' | 'on' | 'provider-down';

export interface DualPathContract {
  flagKey: string;
  owner: string;
  /** Milliseconds until clients must observe a flip under normal load. */
  maxPropagationMs: number;
  claims: {
    /** Can ops restore pre-change behavior without a deploy? */
    rollbackWithoutDeploy: boolean;
    /** Does the on-path mutate storage the off-path cannot read? */
    dataCompatibleBothWays: boolean;
    /** Safe evaluation when the SDK cannot reach the control plane. */
    defaultWhenUnavailable: 'off' | 'on';
  };
  scenarios: Array<{
    state: FlagState;
    userVisible: string[];
    apiInvariants: string[];
    forbidden: string[];
  }>;
}

export const newCheckoutContract: DualPathContract = {
  flagKey: 'new-checkout-v2',
  owner: 'payments-qa',
  maxPropagationMs: 60_000,
  claims: {
    rollbackWithoutDeploy: true,
    dataCompatibleBothWays: true,
    defaultWhenUnavailable: 'off',
  },
  scenarios: [
    {
      state: 'off',
      userVisible: ['legacy cart stepper', 'single-page payment form'],
      apiInvariants: ['POST /checkout uses schema v1', 'no client_secret_v2 field'],
      forbidden: ['express-pay widget', 'split shipment UI'],
    },
    {
      state: 'on',
      userVisible: ['express-pay widget', 'address autocomplete'],
      apiInvariants: ['POST /checkout accepts schema v1 or v2', 'idempotency-key required'],
      forbidden: ['legacy cart stepper'],
    },
    {
      state: 'provider-down',
      userVisible: ['legacy cart stepper'],
      apiInvariants: ['evaluation falls back to off', 'no 5xx from flag middleware'],
      forbidden: ['hard dependency on flag HTTP in request path'],
    },
  ],
};
\`\`\`

Drive automated checks from this contract. When a product manager claims "we can kill it instantly," that claim is a boolean in \`claims.rollbackWithoutDeploy\` plus a timed drill, not a slide deck promise.

## Building a Flag State Matrix in Unit and Integration Tests

Start at the pure evaluation layer. Given a context (user id, plan, country, percentage bucket), assert the flag service returns the expected value. Then assert application code maps that value to the correct branch.

\`\`\`ts
// flags/newCheckout.eval.test.ts
import { describe, it, expect, vi } from 'vitest';
import { evaluateNewCheckout, type FlagClient } from './newCheckout';

function mockClient(value: boolean | null): FlagClient {
  return {
    boolVariation: vi.fn(async (_key: string, _ctx: unknown, defaultValue: boolean) => {
      if (value === null) return defaultValue;
      return value;
    }),
  };
}

describe('new-checkout-v2 evaluation mapping', () => {
  it('routes to legacy when flag is false', async () => {
    const result = await evaluateNewCheckout(mockClient(false), {
      userId: 'u-1',
      plan: 'pro',
    });
    expect(result.branch).toBe('legacy');
    expect(result.schemaVersion).toBe(1);
  });

  it('routes to v2 when flag is true', async () => {
    const result = await evaluateNewCheckout(mockClient(true), {
      userId: 'u-1',
      plan: 'pro',
    });
    expect(result.branch).toBe('v2');
    expect(result.schemaVersion).toBe(2);
  });

  it('uses safe default when provider returns null-like failure path', async () => {
    // Application default must match contract: defaultWhenUnavailable = off
    const result = await evaluateNewCheckout(mockClient(null), {
      userId: 'u-1',
      plan: 'pro',
    });
    expect(result.branch).toBe('legacy');
  });
});
\`\`\`

Integration tests should hit a real in-memory or containerized flag backend when your stack supports it. If you use OpenFeature with a provider, boot the provider against a test harness and flip keys between cases. Do not only mock at the outermost HTTP boundary if the bug you fear is "two services evaluate differently."

### Percentage and cohort consistency

Percentage rollouts are a classic source of false confidence. Unit tests that always force \`true\` never exercise the bucketing function. Add property-style checks:

- Same user id + same flag salt always maps to the same side of the percentage gate.
- Changing only an unrelated attribute does not reshuffle membership (unless that attribute is in the targeting rules).
- Sticky bucketing survives process restarts if you claim stickiness.

\`\`\`ts
// flags/bucketing.consistency.test.ts
import { describe, it, expect } from 'vitest';
import { inRollout } from './bucketing';

describe('percentage rollout stickiness', () => {
  it('is deterministic for a fixed user and salt', () => {
    const a = inRollout({ userId: 'user-42', flagKey: 'new-checkout-v2', percent: 25 });
    const b = inRollout({ userId: 'user-42', flagKey: 'new-checkout-v2', percent: 25 });
    expect(a).toBe(b);
  });

  it('does not flip membership when percent stays constant across calls', () => {
    const samples = Array.from({ length: 50 }, () =>
      inRollout({ userId: 'user-42', flagKey: 'new-checkout-v2', percent: 25 }),
    );
    expect(new Set(samples).size).toBe(1);
  });

  it('monotonicity: raising percent never removes users already included', () => {
    // Only valid for pure percentage gates without additional rules.
    const at10 = inRollout({ userId: 'user-99', flagKey: 'new-checkout-v2', percent: 10 });
    const at50 = inRollout({ userId: 'user-99', flagKey: 'new-checkout-v2', percent: 50 });
    if (at10) expect(at50).toBe(true);
  });
});
\`\`\`

If your vendor documents a specific hashing algorithm, prefer their SDK in tests over reimplementing the hash. Reimplementation drift is a production incident waiting to happen.

## End-to-End Dual-Path Coverage with Playwright

UI tests must run twice (or thrice with provider-down) for release toggles that change screens. Prefer injecting flag state at a seam you control: test headers, a bootstrapped evaluation endpoint, or a local provider file, rather than clicking through a vendor UI in every CI run.

\`\`\`ts
// e2e/checkout.flag-matrix.spec.ts
import { test, expect } from '@playwright/test';

const states = [
  { name: 'flag-off', header: 'off', expectLegacy: true },
  { name: 'flag-on', header: 'on', expectLegacy: false },
] as const;

for (const state of states) {
  test.describe(\`checkout dual-path: \${state.name}\`, () => {
    test.use({
      extraHTTPHeaders: {
        // App middleware maps this header to a forced evaluation in non-prod.
        'x-test-flag-new-checkout-v2': state.header,
      },
    });

    test('renders the branch claimed by the dual-path contract', async ({ page }) => {
      await page.goto('/checkout');
      if (state.expectLegacy) {
        await expect(page.getByTestId('legacy-cart-stepper')).toBeVisible();
        await expect(page.getByTestId('express-pay')).toHaveCount(0);
      } else {
        await expect(page.getByTestId('express-pay')).toBeVisible();
        await expect(page.getByTestId('legacy-cart-stepper')).toHaveCount(0);
      }
    });

    test('completes purchase on the active branch', async ({ page }) => {
      await page.goto('/checkout');
      await page.getByLabel('Card number').fill('4242424242424242');
      await page.getByRole('button', { name: 'Pay now' }).click();
      await expect(page.getByText('Order confirmed')).toBeVisible();
    });
  });
}
\`\`\`

Use stable locators (\`getByRole\`, \`getByTestId\`) so dual-path suites do not double your flake budget. For locator patterns that stay maintainable as UI branches diverge, pair this work with [Playwright best practices for locators](/blog/playwright-best-practices-locators-2026). When both branches share some components, extract those into shared steps so you are not maintaining two full copies of payment filling logic.

### Server enforcement, not only UI hiding

A frequent security and rollback bug: the UI hides a button when the flag is off, but the API still accepts the new payload. Add API-level tests for both states.

\`\`\`ts
// api/checkout.flag-enforcement.test.ts
import { describe, it, expect } from 'vitest';
import { createTestApp } from '../test/app';

describe('checkout API flag enforcement', () => {
  it('rejects v2-only fields when flag is off', async () => {
    const app = await createTestApp({ flags: { 'new-checkout-v2': false } });
    const res = await app.request('POST', '/checkout', {
      body: { schemaVersion: 2, expressPay: true, amount: 1000 },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/schemaVersion|expressPay/i);
  });

  it('accepts v1 when flag is on (backward compatible path)', async () => {
    const app = await createTestApp({ flags: { 'new-checkout-v2': true } });
    const res = await app.request('POST', '/checkout', {
      body: { schemaVersion: 1, amount: 1000 },
    });
    expect(res.status).toBe(200);
  });
});
\`\`\`

Rollback safety without server enforcement is theater. The kill switch must close the server door, not only the front door.

## Data Compatibility: The Silent Rollback Killer

Behavioral dual-path tests pass while production rollback still fails when the "on" path wrote incompatible data. Test storage contracts explicitly.

| Data change pattern | Safe with instant flag-off? | Required tests | Notes |
| --- | --- | --- | --- |
| Additive nullable column | Usually yes | Off-path reads rows with null and with values | Prefer null over magic defaults |
| New required column without backfill | No | Migration dry-run + dual-write | Flag-off alone cannot fix missing data |
| Dual-write old+new fields | Yes during transition | Compare writers; dual-read equality samples | Remove dual-write only after full rollout |
| Event schema v2 only | Risky | Consumers handle v1 after flag-off | Version envelopes beat flag-only gating |
| Irreversible encrypt/transform | No | Treat as migration, not toggle | Label flag type honestly |

\`\`\`sql
-- Example assertion dataset for dual-read compatibility (run in test DB)
-- Orders written under flag=on must remain readable under flag=off app code.
SELECT id, schema_version, payload_v1 IS NOT NULL AS has_v1
FROM orders
WHERE created_under_flag = 'on'
  AND schema_version = 2;

-- Expectation for rollback-safe design: has_v1 is true for every row,
-- or payload_v2 is convertible by a pure function used by the off-path.
\`\`\`

If you cannot dual-write, your rollback plan is "forward fix" or "restore from backup," not "flip the flag." Document that in the contract and stop calling the flag a kill switch.

## Kill-Switch Drills: Measuring Time-to-Safe

A kill switch that works in staging after five minutes of manual dashboard clicking is not proven. Automate a drill:

1. Enable the risky path for a canary cohort (or all of staging).
2. Generate synthetic traffic that exercises the risky branch.
3. Flip the flag to off via API (prefer API over UI for repeatability).
4. Measure time until N consecutive requests evaluate off and stop calling the risky dependency.
5. Fail the drill if time exceeds \`maxPropagationMs\` from the contract.

\`\`\`bash
#!/usr/bin/env bash
# scripts/kill-switch-drill.sh
set -euo pipefail

FLAG_KEY="new-checkout-v2"
BASE_URL="\${STAGING_URL:?}"
API_TOKEN="\${FLAG_API_TOKEN:?}"
MAX_MS="\${MAX_PROPAGATION_MS:-60000}"

# Force ON for drill cohort (exact API depends on your vendor; use theirs).
curl -sS -X PUT "\${FLAG_ADMIN}/flags/\${FLAG_KEY}/enable" \\
  -H "Authorization: Bearer \${API_TOKEN}"

# Warm traffic
for i in \$(seq 1 20); do
  curl -sS -o /dev/null -H "x-user-id: drill-\$i" "\${BASE_URL}/checkout/health"
done

START_MS=\$(node -e 'console.log(Date.now())')
curl -sS -X PUT "\${FLAG_ADMIN}/flags/\${FLAG_KEY}/disable" \\
  -H "Authorization: Bearer \${API_TOKEN}"

# Poll until evaluations report off
while true; do
  BODY=\$(curl -sS -H "x-user-id: drill-1" "\${BASE_URL}/debug/flags/\${FLAG_KEY}")
  NOW=\$(node -e 'console.log(Date.now())')
  ELAPSED=\$((NOW - START_MS))
  if echo "\$BODY" | grep -q '"value":false'; then
    echo "Kill switch observed off in \${ELAPSED}ms"
    if [ "\$ELAPSED" -gt "\$MAX_MS" ]; then
      echo "FAILED: exceeded maxPropagationMs=\${MAX_MS}"
      exit 1
    fi
    exit 0
  fi
  if [ "\$ELAPSED" -gt "\$MAX_MS" ]; then
    echo "FAILED: still on after \${ELAPSED}ms"
    exit 1
  fi
  sleep 1
done
\`\`\`

Run this drill on a schedule (weekly) and as a release gate for new kill switches. Store timings in CI artifacts so regressions in SDK polling intervals are visible.

## Multi-Service Agreement Tests

When more than one service evaluates the same key, add a cross-service agreement job:

\`\`\`yaml
# .github/workflows/flag-agreement.yml
name: flag-agreement
on:
  pull_request:
  schedule:
    - cron: '0 6 * * 1'

jobs:
  agree:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Compare evaluations across services
        env:
          FLAG_KEY: new-checkout-v2
          CONTEXTS_FILE: ./qa/flag-contexts.json
        run: npm run test:flag-agreement
\`\`\`

\`\`\`ts
// qa/flag-agreement.ts
import { readFileSync } from 'node:fs';

type Ctx = { userId: string; plan: string };
type EvalResult = { service: string; value: boolean };

async function evalService(serviceUrl: string, ctx: Ctx, flagKey: string): Promise<boolean> {
  const res = await fetch(\`\${serviceUrl}/internal/flags/evaluate\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ flagKey, context: ctx }),
  });
  if (!res.ok) throw new Error(\`\${serviceUrl} status \${res.status}\`);
  const json = (await res.json()) as { value: boolean };
  return json.value;
}

async function main() {
  const flagKey = process.env.FLAG_KEY ?? 'new-checkout-v2';
  const contexts = JSON.parse(readFileSync(process.env.CONTEXTS_FILE!, 'utf8')) as Ctx[];
  const services = [
    process.env.EDGE_URL!,
    process.env.CHECKOUT_URL!,
    process.env.PAYMENTS_URL!,
  ];

  const failures: string[] = [];
  for (const ctx of contexts) {
    const results: EvalResult[] = [];
    for (const url of services) {
      results.push({ service: url, value: await evalService(url, ctx, flagKey) });
    }
    const values = new Set(results.map((r) => r.value));
    if (values.size > 1) {
      failures.push(
        \`split-brain for \${JSON.stringify(ctx)}: \${results
          .map((r) => \`\${r.service}=\${r.value}\`)
          .join(', ')}\`,
      );
    }
  }
  if (failures.length) {
    console.error(failures.join('\\n'));
    process.exit(1);
  }
  console.log(\`agreement ok across \${services.length} services, \${contexts.length} contexts\`);
}

main();
\`\`\`

Split-brain is one of the hardest production bugs to see in a single-service test suite. Agreement jobs catch SDK version skew, different default parameters, and mismatched environment keys.

## CI Gates That Encode Rollback Claims

Wire the dual-path suite, API enforcement, and (for kill switches) a lightweight drill into pull requests that touch flagged code. A practical gate set:

| Gate | When it runs | Fails if | Owner |
| --- | --- | --- | --- |
| Unit matrix for flag key | Every PR touching flag map or branch code | Missing state or default mismatch | Feature team |
| API enforcement both ways | Every PR on API handlers | Off-path accepts on-only payloads | Feature team |
| Playwright dual-path smoke | PR + nightly | Either branch cannot complete critical journey | QA |
| Flag agreement job | Nightly + release branch | Services disagree on same contexts | Platform |
| Kill-switch drill | Weekly + new kill switch PRs | Propagation exceeds SLA | SRE + QA |
| Flag inventory lint | Every PR | New flag without contract file | QA architecture |

Inventory linting is underrated. Require a contract file per long-lived flag, with owner, type, and cleanup date. Orphan flags are rollback landmines because nobody knows which path is still real.

If you are choosing unit and component runners for these matrices, the broader landscape of runners and assertion styles is covered in the [JavaScript testing frameworks complete guide](/blog/javascript-testing-frameworks-complete-guide-2026). Pick one runner per monorepo package and keep flag matrices in the same runner as the code they guard so developers run them locally without a second toolchain.

## Realistic Failure Mode: "We Flipped It Off but Checkout Still Dies"

**Symptom.** Ops disables \`new-checkout-v2\` after elevated error rates. Dashboards show the flag off in the vendor UI. Edge HTML still serves the new widget for many users. Payments returns 409 on legacy payloads for orders created in the last hour.

**Diagnosis sequence.**

1. **Confirm evaluation at the edge, not the vendor UI.** Hit the debug evaluation endpoint (or structured logs) with the same user cookie. If the edge still returns \`true\`, you have SDK streaming lag, a CDN-cached bootstrap, or a wrong project/environment key in that region.
2. **Check multi-service agreement.** If edge is \`false\` but checkout API is \`true\`, you have split-brain: different SDK configs, offline mode artifacts, or a process that has not refreshed.
3. **Inspect recent writes.** If orders were written with schema v2-only fields, legacy path failures are data incompatibility, not flag lag. Query a sample of recent order ids for missing v1 fields.
4. **Client bundles.** If only browsers misbehave, look for a static bootstrap JSON of flags embedded at build time. Build-time binding is not a runtime kill switch.
5. **Default mismatch.** If the flag key was deleted or renamed in a panic, services may fall back to different defaults. Compare default parameters in each service's initialization.

**Fix patterns.**

- Short term: route traffic away from the broken region or disable the feature at a lower layer (feature reverse proxy, config map) that you know is live.
- Medium term: restore dual-write/dual-read so off-path can read on-path data.
- Long term: ban build-time flag baking for kill switches; enforce agreement tests; add max age metrics for evaluation caches.

This is the failure mode feature flag testing rollback safety is designed to prevent. If your suite never simulated "flag off + recent v2 rows + multi-service eval," you did not test rollback.

## What People Get Wrong About Flag Testing

1. **Testing only the happy on-path before launch.** The off-path is the rollback path. It must stay green for the life of the flag.
2. **Assuming UI tests equal entitlement tests.** Server must deny.
3. **Calling irreversible migrations "flags."** Honest taxonomy prevents false rollback SLAs to executives.
4. **No ownership or expiry.** Permanent flags become permanent branches, which become permanent dual maintenance and permanent dual bugs.
5. **Mocking the SDK so completely that defaults and errors are never exercised.** The provider-down scenario is a first-class state in the contract.
6. **Skipping percentage stickiness.** Non-deterministic membership makes E2E flakes and invalid experiments.
7. **Forgetting cleanup tests.** When the flag is removed, delete dead branches and tests that force the flag, or the suite becomes fiction.

Ready-made QA skills for flag matrices, dual-path Playwright scaffolds, and CI agreement checks can install from qaskills.sh with the qaskills CLI when you want a shared baseline across agent-driven repos.

## Organizing the Suite so Agents and Humans Can Extend It

AI coding agents generate a lot of dual-path boilerplate quickly, and just as quickly they generate inconsistent header names, flag keys, and defaults. Standardize seams:

\`\`\`ts
// flags/testKit.ts
export type ForcedFlags = Record<string, boolean | string | number>;

/** Single seam used by unit, API, and Playwright overrides. */
export function applyForcedFlags(flags: ForcedFlags): void {
  // Implementation: AsyncLocalStorage, request context, or test provider.
  // Keep one function so agents do not invent parallel override mechanisms.
  (globalThis as { __FORCED_FLAGS__?: ForcedFlags }).__FORCED_FLAGS__ = flags;
}

export function readForcedFlag(key: string): string | boolean | number | undefined {
  return (globalThis as { __FORCED_FLAGS__?: ForcedFlags }).__FORCED_FLAGS__?.[key];
}
\`\`\`

Document for agents:

- New release toggles require a contract file under \`flags/contracts/\`.
- Playwright specs for dual-path live under \`e2e/flags/\`.
- Never introduce a second override header naming scheme.
- Default when unavailable must be asserted, not only the true/false happy paths.

That structure keeps human review focused on claims (is rollback real?) rather than hunting for which mock won.

## Cleanup and Archival: Testing the End of a Flag's Life

Rollback safety includes knowing when the flag is gone. When a rollout completes:

1. Remove the flag key from the vendor and from code defaults in the same release train when possible.
2. Delete dual-path tests that force the retired key; replace with single-path tests for the surviving behavior.
3. Keep a short archive note: date removed, final percentage, any data migration that remains.
4. Run a grep gate in CI for the retired key string so it cannot reappear in configs.

\`\`\`bash
# Fail CI if a retired flag key is reintroduced
if git grep -n "new-checkout-v2" -- ':!flags/archive/**' ':!CHANGELOG.md'; then
  echo "Retired flag key found in active code"
  exit 1
fi
\`\`\`

Stale tests that still toggle a removed flag create false confidence: green CI, dead control plane key, production always on the default branch.

## Putting It Together: A Minimal Team Checklist

Use this as a PR template section for any change that introduces or expands a flag:

1. Flag type declared (release, experiment, ops, entitlement, migration, config).
2. Dual-path contract merged with owner and \`maxPropagationMs\`.
3. Unit matrix covers on, off, and provider-down default.
4. API enforcement covers both states.
5. Playwright dual-path smoke for user-visible release toggles.
6. Data compatibility stated; dual-write tests if both paths write.
7. Kill-switch drill planned if type is ops or high-risk release.
8. Cleanup issue filed with target date.
9. Environments and project keys listed so staging proof maps to production control plane.

Teams that complete this checklist rarely need heroics during incidents. Teams that skip it rediscover split-brain and data incompatibility under page-duty pressure.

## Frequently Asked Questions

### Do we need full dual-path E2E for every flag?

No. Full dual-path end-to-end is for release toggles and any flag that changes a critical user journey. Ops kill switches need timed drills and dependency isolation more than deep UI matrices. Experiments need assignment and metric integrity. Entitlements need API authorization matrices. Match depth to flag type from the taxonomy table, and write the dual-path contract so the claimed rollback behavior is explicit. Over-testing low-risk config flags wastes CI time; under-testing release toggles is how rollback safety fails in production.

### How do we test flags when the vendor has no local emulator?

Use the official SDK in offline or file-based modes when the vendor documents them, or wrap evaluation behind an interface and provide an in-memory provider for tests. Keep a thin adapter so production still uses the real SDK. For agreement tests, prefer shared staging environments with explicit test projects over calling production control planes from CI. Never hardcode fabricated SDK method names; call only what your installed SDK version documents. The adapter boundary is what makes provider-down and forced-state tests reliable.

### What is a safe default when the flag service is unavailable?

Safe defaults are product decisions encoded as testable claims. For revenue-critical new paths, default off is common. For security kill switches that disable risky behavior, default to the safe (disabled) side of the risk. Whatever you choose must be identical across services and asserted in provider-down tests. Document the default in the dual-path contract and fail CI if a service initializes the SDK without an explicit default for that key. Inconsistent defaults are split-brain by another name.

### How long should a release toggle live before cleanup?

Short enough that dual-path maintenance stays cheap, long enough to cover canary and full rollout confidence. Many teams target days to a few weeks for simple UI releases, longer for migrations that need dual-write. The test suite should include an inventory of open flags with ages and owners, and QA should page owners when flags exceed the agreed maximum without a cleanup PR. A flag that lives forever is two products sharing one codebase, which destroys the rollback simplicity flags were meant to provide.
`,
};
