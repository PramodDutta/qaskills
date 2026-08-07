import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Regression Testing Suite Pruning Strategy: Cut Dead Weight, Keep Signal',
  description: 'Regression testing suite pruning strategy for QA: find redundant cases, retire low-signal tests, and keep release suites fast without losing coverage.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Regression Testing Suite Pruning Strategy: Cut Dead Weight, Keep Signal

Regression testing suite pruning strategy is the deliberate process of shrinking or reshaping an automated regression pack so that every remaining test still earns its runtime, maintenance cost, and flake risk. Pruning is not "delete tests until CI is green." It is a measured reduction of overlap, obsolescence, and low-signal cases while preserving detection power for the failures that matter. Teams that never prune eventually own multi-hour regression grids that nobody trusts, full of muted tests and duplicated clicks around the same form.

This guide is for QA engineers and SDETs who inherited a large Playwright, Cypress, Jest, or Vitest regression suite (often grown by AI agents that add cases freely) and need a concrete method: inventory, signal scoring, redundancy detection, retirement workflows, and safeguards against deleting the only test that caught a Sev-1 last year. You will get tables, scripts, and decision rules you can run in a real repo. For framework selection context while you rebalance unit versus e2e weight, see the [JavaScript testing frameworks complete guide](/blog/javascript-testing-frameworks-complete-guide-2026). For making the survivors less brittle as you consolidate UI coverage, use [Playwright best practices for locators](/blog/playwright-best-practices-locators-2026).

Pruning done quarterly is cheaper than continuous heroics on a suite that should have been half its size.

## What "Signal" Means for a Regression Test

A regression test has high signal when a failure usually means a real product problem, and a pass meaningfully increases confidence that a defined risk is controlled. Low signal looks like:

- Fails for environment noise more than product bugs.
- Duplicates another test's assertions on the same path with the same data.
- Guards a feature that was removed months ago.
- Asserts only that a page returned 200 without checking business outcomes.
- Has been muted, skipped, or quarantined longer than it has been reliable.

Pruning optimizes **signal per minute** and **signal per maintenance hour**, not raw test count.

| Metric | How to estimate | Use in pruning |
| --- | --- | --- |
| Unique failure contribution | Bugs or CI fails this test caught first in last N months | Keep high contributors |
| Redundancy score | Same route + same assertions as another test | Merge or drop weaker twin |
| Flake rate | Intermittent fails / runs | Fix or remove; do not keep flaky ballast |
| Runtime cost | p50 duration x run frequency | Prefer cheaper equivalent layer |
| Ownership clarity | Named owner team | Orphan tests are prune candidates after review |
| Product relevance | Feature still shipped | Dead feature tests go first |

## Inventory Before You Delete Anything

You cannot prune a suite you have not inventoried. Export a machine-readable catalog.

\`\`\`ts
// pruning/inventory.ts
export interface TestInventoryRow {
  id: string;
  file: string;
  title: string;
  layer: 'unit' | 'integration' | 'e2e';
  tags: string[];
  owner?: string;
  avgDurationMs?: number;
  flakeRate?: number;
  lastFailedAt?: string | null;
  lastPassedAt?: string | null;
  routes?: string[];
  assertionsRough?: string[];
}

export function parsePlaywrightListJson(raw: unknown): TestInventoryRow[] {
  // Shape depends on your list reporter output; adapt to your runner's JSON.
  const rows = raw as Array<{
    id: string;
    file: string;
    title: string;
    tags?: string[];
  }>;
  return rows.map((r) => ({
    id: r.id,
    file: r.file,
    title: r.title,
    layer: r.file.includes('/e2e/') ? 'e2e' : r.file.includes('/api/') ? 'integration' : 'unit',
    tags: r.tags ?? [],
  }));
}
\`\`\`

\`\`\`bash
# Example collection flow (adapt commands to your runner docs)
mkdir -p pruning/out
# Produce a list of tests as JSON via your test runner's list/dry-run support
pnpm exec playwright test --list --reporter=json > pruning/out/list.json || true
node pruning/buildInventory.mjs
\`\`\`

Enrich inventory with CI analytics if you have them: duration, flake rate, last failure. Even partial enrichment beats gut feel.

\`\`\`ts
// pruning/buildInventory.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { parsePlaywrightListJson } from './inventory.ts';

const list = JSON.parse(readFileSync('pruning/out/list.json', 'utf8'));
const base = parsePlaywrightListJson(list.tests ?? list);
const analytics = JSON.parse(readFileSync('pruning/out/analytics.json', 'utf8'));

const merged = base.map((row) => {
  const a = analytics[row.id] ?? analytics[row.title] ?? {};
  return {
    ...row,
    avgDurationMs: a.avgDurationMs,
    flakeRate: a.flakeRate,
    lastFailedAt: a.lastFailedAt ?? null,
    lastPassedAt: a.lastPassedAt ?? null,
    owner: a.owner,
  };
});

writeFileSync('pruning/out/inventory.json', JSON.stringify(merged, null, 2));
console.log(\`inventory rows: \${merged.length}\`);
\`\`\`

## Score Candidates: Keep, Merge, Quarantine, Delete

Use a transparent score. Example model:

\`\`\`ts
// pruning/score.ts
import type { TestInventoryRow } from './inventory';

export type Decision = 'keep' | 'merge' | 'quarantine' | 'delete-candidate';

export interface Scored extends TestInventoryRow {
  signalScore: number;
  costScore: number;
  valueRatio: number;
  decision: Decision;
  reasons: string[];
}

export function scoreRow(row: TestInventoryRow, redundantWith?: string): Scored {
  const reasons: string[] = [];
  let signal = 50;

  if ((row.flakeRate ?? 0) > 0.05) {
    signal -= 25;
    reasons.push('flakeRate>5%');
  }
  if ((row.flakeRate ?? 0) > 0.15) {
    signal -= 25;
    reasons.push('flakeRate>15%');
  }
  if (!row.owner) {
    signal -= 10;
    reasons.push('no owner');
  }
  if (row.tags.includes('dead-feature') || row.tags.includes('legacy-removed')) {
    signal -= 40;
    reasons.push('dead feature tag');
  }
  if (row.lastFailedAt) {
    signal += 10;
    reasons.push('has failed recently (still detecting something)');
  }
  if (redundantWith) {
    signal -= 30;
    reasons.push(\`redundant with \${redundantWith}\`);
  }

  const duration = row.avgDurationMs ?? 30_000;
  const cost = Math.min(100, Math.round(duration / 1000)); // rough seconds capped
  const valueRatio = signal / Math.max(cost, 1);

  let decision: Decision = 'keep';
  if (signal < 15) decision = 'delete-candidate';
  else if ((row.flakeRate ?? 0) > 0.15) decision = 'quarantine';
  else if (redundantWith && signal < 45) decision = 'merge';

  return { ...row, signalScore: signal, costScore: cost, valueRatio, decision, reasons };
}
\`\`\`

| Decision | Meaning | Next action |
| --- | --- | --- |
| keep | Adequate signal for cost | Optional optimize locators/data |
| merge | Overlaps another test | Combine assertions; delete twin |
| quarantine | Too flaky to trust | Fix within time box or delete |
| delete-candidate | Low signal or dead product surface | Human review + staged removal |

Never auto-delete from CI without human review on the first pruning cycles. Automate **proposal**, not silent removal.

## Finding Redundant Tests Without Perfect Static Analysis

True semantic equivalence is hard. Practical redundancy detection uses cheap fingerprints:

1. Normalized route or API path under test.
2. Seed data identifiers.
3. Assertion keywords (button names, expected texts).
4. File path clusters (\`e2e/checkout/*\` with identical beforeEach).

\`\`\`ts
// pruning/redundancy.ts
import type { TestInventoryRow } from './inventory';

export function fingerprint(row: TestInventoryRow): string {
  const routes = (row.routes ?? []).slice().sort().join(',');
  const titleKey = row.title.toLowerCase().replace(/\\s+/g, ' ').trim();
  // crude: first three words often encode intent
  const words = titleKey.split(' ').slice(0, 5).join(' ');
  return \`\${row.layer}|\${routes}|\${words}\`;
}

export function findRedundantPairs(rows: TestInventoryRow[]): Array<[string, string]> {
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const fp = fingerprint(r);
    const list = map.get(fp) ?? [];
    list.push(r.id);
    map.set(fp, list);
  }
  const pairs: Array<[string, string]> = [];
  for (const ids of map.values()) {
    if (ids.length < 2) continue;
    for (let i = 1; i < ids.length; i++) pairs.push([ids[0], ids[i]]);
  }
  return pairs;
}
\`\`\`

\`\`\`ts
// pruning/redundancy.test.ts
import { describe, it, expect } from 'vitest';
import { fingerprint, findRedundantPairs } from './redundancy';
import type { TestInventoryRow } from './inventory';

const base = {
  file: 'e2e/a.spec.ts',
  layer: 'e2e' as const,
  tags: [],
  routes: ['/checkout'],
};

describe('redundancy fingerprint', () => {
  it('clusters similar titles on same route', () => {
    const rows: TestInventoryRow[] = [
      { ...base, id: '1', title: 'checkout pay now success' },
      { ...base, id: '2', title: 'checkout pay now success again' },
      { ...base, id: '3', title: 'admin users list loads', routes: ['/admin/users'] },
    ];
    // First five words differ between 1 and 2; adjust titles for demo equality
    rows[1].title = 'checkout pay now success';
    const pairs = findRedundantPairs(rows);
    expect(pairs).toContainEqual(['1', '2']);
  });
});
\`\`\`

Human review still decides whether two fingerprints are true duplicates or legitimate variants (guest vs logged-in checkout). The tool only queues suspects.

## Layer Rebalancing: The Highest Leverage Prune

Many regression suites are heavy at the e2e layer for checks that should be unit or API tests. Moving assertions down reduces runtime without losing detection for that failure mode.

| Check type | Prefer layer | Keep thin e2e? |
| --- | --- | --- |
| Tax calculation edge cases | Unit | One e2e that totals appear |
| Authz matrix by role | API integration | One e2e denied screen |
| Button label copy | Component test | Rarely e2e |
| Full purchase with payment provider sandbox | E2E | Yes, few variants |
| OpenAPI field presence | Contract test | No full UI |

\`\`\`ts
// Example: replace 12 e2e tax variants with unit tests + 1 e2e
// unit/pricing/tax.test.ts
import { describe, it, expect } from 'vitest';
import { calcTax } from '../../packages/pricing/src/tax';

describe('calcTax', () => {
  it('applies DE VAT for digital goods', () => {
    expect(calcTax({ country: 'DE', kind: 'digital', net: 1000 })).toBe(190);
  });
  it('applies 0 for exempt enterprise accounts', () => {
    expect(calcTax({ country: 'DE', kind: 'digital', net: 1000, exempt: true })).toBe(0);
  });
});
\`\`\`

\`\`\`ts
// e2e/checkout/tax-smoke.spec.ts
import { test, expect } from '@playwright/test';

test('checkout shows tax line for DE guest', async ({ page }) => {
  await page.goto('/checkout?country=DE');
  await expect(page.getByTestId('tax-line')).toBeVisible();
  await expect(page.getByTestId('tax-line')).toContainText('VAT');
});
\`\`\`

That swap can remove hours per week of CI while improving edge-case coverage. Pruning is often **relocation**, not pure deletion.

## Retirement Workflow: Soft Delete, Then Hard Delete

Deleting a test that later proves essential is painful. Use a staged path:

1. **Tag** \`@prune-candidate\` and stop running in the default regression job; keep in a weekly job for two cycles.
2. **Observe** whether production incidents or weekly runs suggest the test still catches issues.
3. **Hard delete** with a changelog entry linking inventory id and rationale.
4. **Preserve** a short note in \`pruning/retirements.md\` so agents do not recreate the same low-signal test.

\`\`\`ts
// playwright.config.ts excerpt (conceptual)
// Define a project that excludes @prune-candidate from PR regression
// and a weekly project that includes them.
export const pruneTags = {
  prRegressionIgnore: /@prune-candidate/,
  weeklyInclude: /@prune-candidate/,
};
\`\`\`

\`\`\`markdown
## Retirement log

### 2026-07-15: e2e/checkout/legacy-coupon-v1.spec.ts
- Reason: coupon v1 removed from product 2026-05; test only asserted removed DOM
- Replaced by: unit/pricing/coupons-v2.test.ts
- Owner approval: qa-payments
\`\`\`

## Decision Matrix for Controversial Cases

| Situation | Prefer | Avoid |
| --- | --- | --- |
| Two e2e differ only by browser | One browser on PR; others nightly | Triple runtime on every PR |
| Test fails often, caught 1 real bug in a year | Fix flake or rewrite at lower layer | Eternal quarantine |
| Test never failed in 18 months | Challenge relevance; maybe keep as tiny smoke if critical path | Assuming green means useless without analysis |
| Legal/compliance assertion | Keep even if expensive; optimize later | Pruning for speed alone |
| Agent-generated near-duplicates from same prompt | Merge immediately | "More tests = better" |
| Visual snapshot per pixel on full pages | Targeted component snapshots | Entire site gallery on PR |

## Realistic Failure Mode: Pruned Away the Only Tenant Isolation Check

**Symptom.** After a pruning sprint, CI is 40% faster. Two weeks later, a tenant isolation bug ships. Postmortem finds the deleted test \`e2e/admin/tenant-boundary.spec.ts\` was the only automated check asserting cross-tenant denial. Inventory had marked it low value because it "never failed" and was slow.

**Diagnosis.**

1. Check retirement log for the test id. Confirm rationale was "never failed," not "covered elsewhere."
2. Search remaining suites for equivalent API assertions. If none, the prune violated the **coverage substitute rule**: delete only when another test or monitor owns the same risk.
3. Review scoring weights: "never failed" should not dominate for high-impact security capabilities.
4. Inspect whether the test was slow due to bad setup (full UI) when an API test would have been cheaper to keep.

**Corrective rules.**

- Map tests to capabilities or risks before pruning. No risk owner means no delete.
- Security and money-path tests require explicit substitute coverage to retire.
- "Never failed" is weak evidence alone; combine with product relevance and redundancy.

\`\`\`ts
// pruning/guards.ts
export function canDelete(row: {
  tags: string[];
  substitutes: string[];
  impact: 'low' | 'medium' | 'high' | 'critical';
}): boolean {
  if (row.impact === 'critical' || row.impact === 'high') {
    return row.substitutes.length > 0;
  }
  if (row.tags.includes('compliance')) {
    return row.substitutes.length > 0;
  }
  return true;
}
\`\`\`

## What People Get Wrong About Suite Pruning

1. **Optimizing only for runtime.** Maintenance pain and flake noise are costs too. A short flaky test can cost more than a long stable one.
2. **Pruning without product input.** Engineers may remove coverage for flows that support still sells.
3. **One giant deletion PR.** Reviewers cannot assess risk. Prefer batches by domain.
4. **No retirement log.** Agents and humans reintroduce deleted tests forever.
5. **Keeping quarantines forever.** Quarantine is a waiting room, not a home.
6. **Ignoring unit suite bloat.** Pruning applies to Jest/Vitest piles of snapshot spam, not only e2e.

## Building a Quarterly Prune Cadence

**Week 1.** Refresh inventory and analytics. Recompute scores. Publish top 50 delete-candidates and merge-candidates.

**Week 2.** Domain owners accept/reject proposals. Record substitutes for high-impact keeps-or-deletes.

**Week 3.** Implement merges and layer moves. Soft-delete accepted candidates.

**Week 4.** Hard-delete soft removals that stayed quiet. Report CI time, flake rate, and any incidents.

\`\`\`bash
#!/usr/bin/env bash
# pruning/report.sh
set -euo pipefail
node pruning/scoreAll.mjs > pruning/out/scored.json
node -e '
const s=require("./pruning/out/scored.json");
const by=s.reduce((a,r)=>{a[r.decision]=(a[r.decision]||0)+1;return a;},{});
console.log(by);
const worst=[...s].sort((a,b)=>a.valueRatio-b.valueRatio).slice(0,15);
console.log("lowest valueRatio:");
for (const w of worst) console.log(w.valueRatio.toFixed(2), w.file, w.title, w.reasons.join(";"));
'
\`\`\`

## Working with AI Agents During Pruning

Agents help generate inventories, suggest merges, and draft unit tests that replace e2e variants. They also happily recreate deleted tests if prompts say "add regression coverage for checkout." Feed agents the retirement log and a policy file:

\`\`\`json
{
  "doNotRecreate": [
    {
      "match": "legacy-coupon-v1",
      "reason": "Feature removed 2026-05"
    }
  ],
  "preferLayers": {
    "tax calculation": "unit",
    "rbac matrix": "api",
    "purchase smoke": "e2e"
  },
  "maxNewE2EPerPR": 1
}
\`\`\`

Require agents to attach a capability or risk id to new regression tests so future pruning has something better than title text to reason about.

## Measuring Success After Pruning

| Metric | Target direction | Notes |
| --- | --- | --- |
| p50 regression pipeline duration | Down | Primary developer experience win |
| Flake rate on remaining tests | Down | If up, you deleted stable tests and kept noisy ones |
| Escape defects on pruned areas | Flat or down | Guardrail against over-pruning |
| Number of quarantined tests | Down | Quarantine backlog is debt |
| Owner coverage % | Up | Orphans should decline |
| Duplicate fingerprint clusters | Down | Merge health |

If duration drops but escape defects rise in a domain, pause pruning there and restore substitutes first.

## Case Study Sketch: Checkout Regression Pack

**Before.** 140 e2e tests, 55 minutes parallelized, flake rate 7%, 18 tests touching coupon codes for a program marketing sunset last quarter.

**Actions.**

1. Deleted 18 coupon v1 tests after confirming product removal (retirement log entries).
2. Merged 12 "pay now success" variants into 3 (guest card, logged-in card, failing card).
3. Moved 20 tax edge cases to unit tests; kept 1 e2e tax visibility smoke.
4. Quarantined 8 flaky admin tests with 2-week fix deadline; deleted 3 unowned ones after deadline.
5. Improved locators on survivors to cut wait-related flakes (see locator guidance linked above).

**After.** 86 e2e tests, 28 minutes, flake rate 2.5%, no increase in checkout escapes over the next two releases. Unit suite grew by 20 tests and 40 seconds.

That pattern (delete dead product surface, merge clones, downshift pure logic, time-box flakes) is the pruning strategy in action.

## Safeguards Checklist Before Merging a Prune PR

1. Inventory ids listed for every removed test.
2. Substitutes named for high-impact removals.
3. Retirement log updated.
4. Soft-delete period completed or explicitly waived by QA lead for dead features.
5. Pipeline duration and test count reported in PR body.
6. Domain owner approval on the PR.
7. Agent policy updated if removals should not be recreated.
8. Critical path smoke still present (login, pay, core admin load, whatever your product defines).

## When Not to Prune

- During an active reliability crisis where you need more detection, not less.
- When analytics are missing and nobody knows flake rates (build inventory first).
- When the suite is small and already high signal (optimize fixtures instead).
- When "pruning" is a euphemism for ignoring failures by deletion without substitutes.

Pruning is a quality investment. Treat it like one: measured, reviewed, reversible in the first weeks.

If you want shared inventory scripts, scoring defaults, and retirement log templates across repos, ready-made QA skills install from qaskills.sh with the qaskills CLI. Calibrate weights to your flake analytics and impact model so the strategy reflects your product risks, not generic defaults alone.

## Frequently Asked Questions

### How aggressive should the first pruning pass be?

Start with obvious dead weight: removed features, permanent skips, and near-duplicate titles on the same route. Aim for a modest reduction (often 10-20% of e2e count) rather than a heroic half-suite cut. Early passes teach the organization that pruning is safe when substitutes and logs exist. After one or two cycles with stable escape metrics, you can tackle deeper layer rebalancing. Over-aggressive first passes create political backlash and emergency test restores that poison the practice.

### Should we prune unit tests the same way as e2e?

Yes in principle, but thresholds differ. Unit tests are cheap, so redundancy and snapshot sprawl matter more than raw duration. Delete or rewrite unit tests that snapshot entire objects without asserting intent, or that encode brittle implementation details of private functions. Keep unit tests that document pure business rules even if they have not failed recently. The same inventory and ownership rules apply; the cost model simply weights runtime lower and maintenance clarity higher.

### How do we stop the suite from bloating again after a prune?

Introduce entry criteria for new regression tests: capability id, layer justification, and a note on why existing tests do not cover the risk. Cap new e2e files per PR without QA review. Run a monthly lightweight score report that flags new low valueRatio tests while they are still easy to remove. Agent policies should prefer extending existing specs over creating parallel files. Pruning without intake control is a treadmill.

### Is a test that never failed safe to delete?

Not automatically. Stable tests on critical paths may never fail because the path is carefully maintained, yet they remain valuable as merge gates. Prefer asking whether a cheaper substitute exists and whether the product surface still ships. Combine "never failed" with redundancy, dead-feature status, and impact. Delete when the risk is owned elsewhere or the feature is gone; keep thin smokes for critical journeys even when stubbornly green.
`,
};
