import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Strategy with Risk-Based Prioritization: What to Run First',
  description: 'Test strategy risk based prioritization for QA teams: score failure impact, map suites to risk, and cut low-value CI runs without blind spots.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Test Strategy with Risk-Based Prioritization: What to Run First

Test strategy risk based prioritization answers a question every mature QA team hits: when you cannot run everything on every change, which tests earn the next minute of CI and the next hour of human exploration? The wrong answer is "whatever is already in the suite" or "whatever the last incident touched." The right answer is a transparent scoring model that multiplies how bad a failure would be by how likely the change under test can cause it, then allocates automation, exploratory time, and release gates accordingly.

This article is written for QA leads, SDETs, and test-automation engineers who already have unit, API, and end-to-end suites (often driven by AI coding agents that add cases faster than anyone reviews them). You will get a concrete risk model, worked examples for a SaaS checkout and an admin console, suite mapping tables, TypeScript scoring helpers, CI selection patterns, and a diagnosis path for when prioritization silently drifts into "we only test the happy path."

Risk-based prioritization is not an excuse to skip hard tests. It is a method to put scarce cycles on the failures that hurt users, revenue, compliance, or recovery time first, then expand coverage outward as risk drops or capacity grows.

## Start from Failure Cost, Not from Test Count

Most teams invent "priority" from suite names: P0 smoke, P1 regression, P2 edge. Those labels rot. A smoke test added three years ago may no longer protect a revenue path, while a "P2" authorization case may be the only guard against a data leak. Rebuild priority from two quantities you can argue about in a room:

1. **Impact (I):** If this capability fails in production, how bad is it? Consider user harm, revenue, legal exposure, security, and operational blast radius.
2. **Likelihood (L) given the change:** How plausible is it that the current diff, dependency upgrade, or config change breaks this capability?

Risk score for planning is typically \`R = I x L\` (or a weighted sum if you prefer ordinal scales). You do not need false precision. A 1-5 scale with written anchors beats a spreadsheet with three decimal places and no definitions.

| Score | Impact anchor (examples) | Likelihood anchor (examples) |
| --- | --- | --- |
| 5 | Payment cannot complete; data exfiltration; safety interlock fails | Change touches core code path, shared library, or authz middleware used by the flow |
| 4 | Major feature unusable for a large segment; corrupted exports | Change is adjacent (shared UI kit, API contract field used by flow) |
| 3 | Important workflow degraded; workaround exists | Indirect dependency (build tooling, modest schema additive change) |
| 2 | Cosmetic or narrow admin annoyance | Far from the flow; only shared CI config |
| 1 | Purely internal metrics noise | Unrelated package or docs-only change |

Write anchors in your team's language. A healthcare product will weight patient-safety language higher. A B2B analytics product will weight export correctness and tenant isolation higher. The model only works when engineers and product share the same scale.

## Map Capabilities Before You Map Tests

Prioritize capabilities (user or system outcomes), then attach tests. If you prioritize tests first, you inherit historical accidents of what was easy to automate.

Example capability inventory for a multi-tenant SaaS:

| Capability ID | Outcome | Primary users | Impact (I) | Notes |
| --- | --- | --- | --- | --- |
| CAP-PAY-01 | Customer can complete checkout | Buyers | 5 | Revenue path |
| CAP-AUTH-01 | Only authorized roles reach admin APIs | All | 5 | Security |
| CAP-TEN-01 | Tenant A cannot read tenant B data | All | 5 | Isolation |
| CAP-BILL-02 | Invoice PDF matches charged amount | Finance, customers | 4 | Trust + support load |
| CAP-SRCH-03 | Catalog search returns relevant results | Buyers | 3 | Conversion secondary |
| CAP-THEME-01 | Branding colors apply on marketing pages | Marketing | 2 | Low blast radius |
| CAP-LOG-01 | Debug logs include request ids | Engineers | 1 | Internal only |

Now attach existing tests (or planned tests) to capabilities. Orphan tests with no capability are candidates for deletion or rewrite. Capabilities with high impact and no automated coverage are explicit strategy gaps, not vague "we should test more."

\`\`\`ts
// strategy/capabilities.ts
export type Impact = 1 | 2 | 3 | 4 | 5;

export interface Capability {
  id: string;
  name: string;
  impact: Impact;
  owners: string[];
  /** Test file globs or IDs that protect this capability. */
  tests: string[];
}

export const capabilities: Capability[] = [
  {
    id: 'CAP-PAY-01',
    name: 'Customer can complete checkout',
    impact: 5,
    owners: ['payments', 'qa-payments'],
    tests: [
      'e2e/checkout/*.spec.ts',
      'api/checkout/*.test.ts',
      'unit/pricing/*.test.ts',
    ],
  },
  {
    id: 'CAP-AUTH-01',
    name: 'Admin API authorization',
    impact: 5,
    owners: ['identity', 'qa-security'],
    tests: ['api/authz/**/*.test.ts', 'e2e/admin/rbac.spec.ts'],
  },
  {
    id: 'CAP-THEME-01',
    name: 'Marketing theme colors',
    impact: 2,
    owners: ['web'],
    tests: ['e2e/marketing/theme.spec.ts'],
  },
];
\`\`\`

## Scoring a Change: From Diff to Likelihood

Impact is mostly stable for a capability. Likelihood moves with the change set. Build a simple classifier that reads paths, labels, and dependency manifests. You do not need machine learning on day one.

\`\`\`ts
// strategy/likelihood.ts
export type Likelihood = 1 | 2 | 3 | 4 | 5;

export interface ChangeContext {
  touchedPaths: string[];
  labels: string[];
  isDependencyBump: boolean;
  isAuthRelated: boolean;
}

const RULES: Array<{
  match: (ctx: ChangeContext, capId: string) => boolean;
  likelihood: Likelihood;
  reason: string;
}> = [
  {
    match: (ctx, capId) =>
      capId === 'CAP-PAY-01' &&
      ctx.touchedPaths.some((p) => p.includes('/checkout') || p.includes('/payments')),
    likelihood: 5,
    reason: 'direct checkout/payments path',
  },
  {
    match: (ctx, capId) =>
      capId === 'CAP-PAY-01' &&
      ctx.touchedPaths.some((p) => p.includes('/pricing') || p.includes('/cart')),
    likelihood: 4,
    reason: 'adjacent cart/pricing code',
  },
  {
    match: (ctx, capId) =>
      capId.startsWith('CAP-AUTH') && (ctx.isAuthRelated || ctx.labels.includes('security')),
    likelihood: 5,
    reason: 'auth or security-labeled change',
  },
  {
    match: (ctx) => ctx.isDependencyBump,
    likelihood: 3,
    reason: 'dependency bump baseline',
  },
];

export function scoreLikelihood(ctx: ChangeContext, capId: string): {
  likelihood: Likelihood;
  reasons: string[];
} {
  let best: Likelihood = 1;
  const reasons: string[] = [];
  for (const rule of RULES) {
    if (rule.match(ctx, capId)) {
      if (rule.likelihood >= best) {
        best = rule.likelihood;
        reasons.push(rule.reason);
      }
    }
  }
  // Path-distance fallback: shared packages raise likelihood modestly
  if (
    best < 3 &&
    ctx.touchedPaths.some((p) => p.includes('/packages/ui') || p.includes('/packages/shared'))
  ) {
    best = 3;
    reasons.push('shared package touched');
  }
  return { likelihood: best, reasons: reasons.length ? reasons : ['default far-from-change'] };
}

export function riskScore(impact: Impact, likelihood: Likelihood): number {
  return impact * likelihood;
}
\`\`\`

\`\`\`ts
// strategy/plan.test.ts
import { describe, it, expect } from 'vitest';
import { capabilities } from './capabilities';
import { scoreLikelihood, riskScore } from './likelihood';

describe('risk plan for a checkout PR', () => {
  const ctx = {
    touchedPaths: ['apps/web/src/checkout/PaymentForm.tsx', 'packages/pricing/src/tax.ts'],
    labels: ['payments'],
    isDependencyBump: false,
    isAuthRelated: false,
  };

  it('ranks CAP-PAY-01 above CAP-THEME-01', () => {
    const pay = capabilities.find((c) => c.id === 'CAP-PAY-01')!;
    const theme = capabilities.find((c) => c.id === 'CAP-THEME-01')!;
    const payL = scoreLikelihood(ctx, pay.id).likelihood;
    const themeL = scoreLikelihood(ctx, theme.id).likelihood;
    expect(riskScore(pay.impact, payL)).toBeGreaterThan(riskScore(theme.impact, themeL));
  });
});
\`\`\`

Feed the classifier from CI: \`git diff --name-only origin/main...HEAD\`, plus labels from your PR system. Output a ranked list of capabilities and the tests that protect the top slice.

## Selecting Suites: Layers, Not Only Tags

Risk-based prioritization works across test layers. A high-risk capability usually needs a thin vertical slice always on the PR path, and deeper suites on merge trains or nightlies.

| Risk band (R = I x L) | PR pipeline (minutes target) | Merge / release | Nightly / weekly |
| --- | --- | --- | --- |
| 20-25 | Unit + API critical + 1 E2E journey | Full capability pack | Chaos/exploratory charter |
| 12-19 | Unit + API critical | Capability pack sample | Full E2E pack |
| 6-11 | Unit for touched packages | API sample | E2E sample |
| 1-5 | Nothing mandatory beyond lint/unit of touched files | Optional | Periodic crawl |

Example selection output consumed by CI:

\`\`\`json
{
  "changeId": "pr-1842",
  "ranked": [
    {
      "capabilityId": "CAP-PAY-01",
      "impact": 5,
      "likelihood": 5,
      "risk": 25,
      "select": ["unit/pricing", "api/checkout", "e2e/checkout/smoke.spec.ts"]
    },
    {
      "capabilityId": "CAP-BILL-02",
      "impact": 4,
      "likelihood": 3,
      "risk": 12,
      "select": ["api/billing/invoice.test.ts"]
    },
    {
      "capabilityId": "CAP-THEME-01",
      "impact": 2,
      "likelihood": 1,
      "risk": 2,
      "select": []
    }
  ]
}
\`\`\`

\`\`\`bash
#!/usr/bin/env bash
# scripts/run-risk-plan.sh
set -euo pipefail

node ./strategy/buildPlan.mjs > /tmp/risk-plan.json
# Extract Playwright projects or grep patterns from plan
mapfile -t SPECS < <(node -e '
  const p=require("/tmp/risk-plan.json");
  const specs=p.ranked.flatMap(r=>r.select.filter(s=>s.endsWith(".ts")||s.endsWith(".spec.ts")));
  console.log(specs.join("\\n"));
')

if [ "\${#SPECS[@]}" -eq 0 ]; then
  echo "No E2E specs selected for this risk plan"
  exit 0
fi

npx playwright test "\${SPECS[@]}"
\`\`\`

Keep human-readable reasons in the plan artifact so reviewers can challenge "why did we skip tenant isolation?" without reverse-engineering shell scripts.

## Decision Matrix: Automation vs Exploration vs Monitoring

Not every high-risk item should become a brittle E2E. Choose the control that fits the failure mode.

| Failure mode | Prefer | Secondary | Avoid as sole control |
| --- | --- | --- | --- |
| Pure function pricing bug | Unit tests | Property tests | Full browser checkout only |
| API contract break | Contract / schema tests | Consumer CI | Manual Postman only |
| Authz regression | API matrix by role | Security scan | UI hide-button checks alone |
| Visual layout break | Targeted visual snapshot | Design review | Hundreds of full-page screenshots on PR |
| Flaky third-party widget | Mock in CI + synthetic prod check | Circuit breaker | Blocking E2E against live vendor |
| Rare multi-step enterprise flow | Exploratory charter + checklist | Quarterly automated path | Forcing daily full automation before stability |

Risk-based strategy includes saying "this risk is controlled by production monitors and a runbook," when automation would be mostly noise. Write that decision down next to the capability so auditors and new hires see it.

## Worked Example A: Checkout PR Touching Tax Rules

**Change.** Engineer updates tax calculation in \`packages/pricing\` and a small React binding in the checkout summary.

**Capability scoring (abbreviated).**

- CAP-PAY-01: I=5, L=5 (direct), R=25 -> full unit pricing pack, checkout API totals, one Playwright purchase with tax assertions.
- CAP-BILL-02: I=4, L=4 (invoice uses same totals), R=16 -> invoice API snapshot tests.
- CAP-AUTH-01: I=5, L=1, R=5 -> no extra auth suite on this PR.
- CAP-THEME-01: I=2, L=1, R=2 -> skip.

**Exploratory add-on (30 minutes).** Charters: "VAT for EU guest checkout" and "tax exempt enterprise customer," because automation may miss jurisdiction tables.

**Release gate.** If tax rules are config-driven, require a config review checklist in the PR template when likelihood for CAP-PAY-01 is 4+.

## Worked Example B: Dependency Bump of a UI Library

**Change.** Minor version bump of a component library used across admin and marketing.

**Scoring notes.** Likelihood is moderate (3) across many UI capabilities, but impact varies. Do not run every E2E in the company. Instead:

1. Raise likelihood for capabilities whose critical journeys use the bumped components (forms, modals, date pickers).
2. Run a smoke graph: login, open admin table, submit one form, one marketing page load.
3. Schedule visual diffs nightly rather than blocking every app team PR.

\`\`\`ts
// strategy/dependencyBump.ts
import type { Capability } from './capabilities';
import type { Likelihood } from './likelihood';

export function likelihoodForDependencyBump(
  cap: Capability,
  bumpedPackage: string,
  importers: string[],
): Likelihood {
  const usesBump = importers.some((pkg) =>
    cap.tests.some((t) => t.includes(pkg) || cap.id.includes('UI')),
  );
  if (!usesBump) return 2;
  if (cap.impact >= 4) return 4;
  if (cap.impact === 3) return 3;
  return 2;
}
\`\`\`

This is where teams without prioritization melt CI: every dependency PR becomes a full monorepo E2E. Risk-based selection keeps signal high.

## Integrating with Framework Choice and Locator Quality

Risk prioritization does not replace good automation hygiene. High-risk E2E journeys must be the most stable tests you own, not the flakiest. Prefer role- and test-id-based locators, deterministic test data, and isolated accounts. Deep guidance on durable selectors lives in [Playwright best practices for locators](/blog/playwright-best-practices-locators-2026). For choosing unit and component runners that keep PR feedback under a few minutes while still feeding the risk plan, see the [JavaScript testing frameworks complete guide](/blog/javascript-testing-frameworks-complete-guide-2026).

A practical rule: if a capability sits in the top risk band, invest in making its tests faster and more deterministic before adding more low-risk cases. Ten reliable minutes of CAP-PAY-01 coverage beat forty minutes of flaky theme and animation tests.

## Governance: Who Changes Scores?

Without governance, product will mark everything impact 5, and engineering will mark everything likelihood 1 to ship faster. Set lightweight rules:

1. **Impact** is owned by product + QA jointly; changes require a short rationale in the capability registry PR.
2. **Likelihood rules** are owned by QA architecture + tech leads; path matchers live in code review like any other logic.
3. **Overrides** for a single release (force-run a suite) are allowed via PR label \`risk:force=CAP-PAY-01\` and expire when the PR merges.
4. **Quarterly calibration:** pick three production incidents, ask whether the model would have selected tests that could catch them. Adjust anchors and rules.

\`\`\`yaml
# Example PR label contract (documented for bots and humans)
# risk:force=CAP-PAY-01,CAP-TEN-01
# risk:skip-e2e=true   # requires approval from qa-lead; logged
\`\`\`

Log every override. Patterns in overrides reveal model gaps (always forcing CAP-TEN-01 means tenant tests are under-selected by path rules).

## Realistic Failure Mode: Green PRs, Red Production on Tenant Isolation

**Symptom.** A refactor in the query layer ships with full green CI. Two days later, a support ticket shows tenant B data in tenant A export. Impact is catastrophic (I=5). Automated suites existed under CAP-TEN-01 but rarely ran on PRs.

**Diagnosis.**

1. Inspect the risk plan artifact for the release PRs. If CAP-TEN-01 shows L=1 despite touched paths under \`packages/query\`, the likelihood rules missed a shared data-access package.
2. Check whether CAP-TEN-01 tests are tagged \`nightly\` only. If yes, PR pipelines never selected them even when risk was high.
3. Confirm whether AI-generated tests for the refactor asserted row counts but not tenant predicates.
4. Review impact registry: was tenant isolation incorrectly labeled impact 3 as "edge case"?

**Remediation.**

- Add path rules: any change under data-access packages sets L>=4 for CAP-TEN-01 and CAP-AUTH-01.
- Promote a minimal tenant isolation API test into the PR band whenever those paths change.
- Add a negative assertion template agents must use when touching query builders.
- Calibrate with this incident in the next quarterly review.

This failure is not "we needed more tests." It is "our prioritization never elevated the right tests for the change class."

## What People Get Wrong

1. **Equating risk with severity of the last bug.** Last bug bias overfits the suite to history. Use impact anchors plus change likelihood.
2. **Using only test duration to prioritize.** Fast tests are nice; low-risk fast tests still waste attention if they drown signal.
3. **Hiding prioritization in tribal knowledge.** If the model is not in the repo, agents and new hires cannot apply it.
4. **Letting P0 mean "whatever product demoed."** Demo paths matter, but silent security capabilities often outrank them.
5. **Never reassessing after architecture changes.** Microservices splits and new event buses invalidate path-to-capability maps.
6. **Treating exploratory testing as unstructured leftover time.** High residual risk after automation should produce charters with time boxes and notes, not vague "click around."

## Building Charters for Residual Risk

When automation covers the top band but residual risk remains (complex UI, weak test data, third parties), write exploratory charters tied to capability IDs.

\`\`\`ts
// strategy/charters.ts
export interface Charter {
  id: string;
  capabilityId: string;
  mission: string;
  timeboxMinutes: number;
  risksToProbe: string[];
  dataSetup: string;
}

export const charters: Charter[] = [
  {
    id: 'CH-PAY-EU-VAT',
    capabilityId: 'CAP-PAY-01',
    mission: 'Find tax miscalculations for EU guest checkout with mixed digital/physical cart',
    timeboxMinutes: 45,
    risksToProbe: [
      'wrong VAT rate by country',
      'tax shown in UI differs from charged amount',
      'invoice PDF mismatch',
    ],
    dataSetup: 'EU guest + catalog fixtures set VAT-EU',
  },
];
\`\`\`

File charter outcomes next to the risk plan for the release. If a charter finds a defect, decide whether the fix needs a new automated check in the PR band (usually yes when I>=4).

## AI Agents and Risk Plans: Guardrails

AI coding agents will happily generate dozens of tests for whatever file they edited. Without a risk plan, they optimize for green local runs, not for portfolio risk. Give agents a machine-readable policy:

\`\`\`ts
// strategy/agentPolicy.ts
export const agentPolicy = {
  /** Agents must attach new tests to a capability id. */
  requireCapabilityId: true,
  /** Refuse to add E2E for impact <= 2 unless user overrides. */
  minImpactForNewE2E: 3 as const,
  /** Prefer API tests when capability is backend-heavy. */
  preferApiWhen: ['CAP-AUTH-01', 'CAP-TEN-01', 'CAP-BILL-02'],
  /** Max new E2E files per PR without qa-lead label. */
  maxNewE2EFiles: 2,
};
\`\`\`

When agents propose tests, reviewers should ask: which capability, what risk band, what residual risk remains? That conversation is the strategy. Tools help, but the scoring model is the strategy artifact.

## Measuring Whether Prioritization Works

Track a few metrics monthly:

| Metric | Healthy signal | Unhealthy signal |
| --- | --- | --- |
| Escape defects tagged by capability | Mostly low-risk caps or novel failure modes | Repeated escapes in I=5 caps |
| Median PR CI minutes | Stable or falling with constant escape rate | Rising without quality gain |
| % PRs with risk plan artifact | Near 100% on product repos | Missing plans on hot repos |
| Override rate | Low single digits | Frequent force labels on same caps |
| Flake rate in top-band tests | Near zero | Top-band tests muted or ignored |

If escape defects cluster in one capability, raise its PR selection band before adding random tests elsewhere. If CI time explodes but escapes do not fall, you selected too broadly or tests are inefficient.

## Implementation Roadmap (Four Weeks)

**Week 1.** Draft impact anchors. Inventory 15-40 capabilities. Attach existing tests. Publish gaps.

**Week 2.** Implement likelihood rules for top path prefixes. Emit risk plan JSON in CI (non-blocking).

**Week 3.** Enforce selection for the top risk band only (fail PR if plan empty when high-impact paths change). Train teams on reading artifacts.

**Week 4.** Add charter hooks for residual risk. First calibration meeting with two recent incidents. Tune rules.

Do not boil the ocean with perfect scoring. A crude model in the repo beats a perfect model on a wiki nobody opens.

## Sample End-to-End Planner Script

\`\`\`ts
// strategy/buildPlan.mjs
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { capabilities } from './capabilities.ts';
import { scoreLikelihood, riskScore } from './likelihood.ts';

const touched = execSync('git diff --name-only origin/main...HEAD', { encoding: 'utf8' })
  .split('\\n')
  .filter(Boolean);

const labels = (process.env.PR_LABELS ?? '').split(',').filter(Boolean);
const ctx = {
  touchedPaths: touched,
  labels,
  isDependencyBump: touched.some((p) => p.endsWith('package-lock.json') || p.endsWith('pnpm-lock.yaml')),
  isAuthRelated: touched.some((p) => /auth|rbac|session/i.test(p)),
};

const ranked = capabilities
  .map((cap) => {
    const { likelihood, reasons } = scoreLikelihood(ctx, cap.id);
    const risk = riskScore(cap.impact, likelihood);
    const select =
      risk >= 20
        ? cap.tests
        : risk >= 12
          ? cap.tests.filter((t) => t.includes('api/') || t.includes('unit/'))
          : risk >= 6
            ? cap.tests.filter((t) => t.includes('unit/'))
            : [];
    return {
      capabilityId: cap.id,
      impact: cap.impact,
      likelihood,
      risk,
      reasons,
      select,
    };
  })
  .sort((a, b) => b.risk - a.risk);

const plan = { changeId: process.env.CHANGE_ID ?? 'local', ranked, touched };
writeFileSync('risk-plan.json', JSON.stringify(plan, null, 2));
console.log(JSON.stringify(plan, null, 2));
\`\`\`

Commit the plan as a CI artifact. Make it visible in PR comments via your bot of choice so prioritization stays a social, challengeable object.

## Closing the Loop with Release Decisions

Risk-based prioritization also informs go/no-go. If the top band is red and unfixed, do not ship behind "we'll watch dashboards." If the top band is green but residual exploratory charters found medium issues in I=3 capabilities, product may accept shipping with tracked follow-ups. The strategy document should state which risk bands are release-blocking. Ambiguity here recreates politics under deadline pressure.

When you need shared scaffolding for planners, capability registries, and CI selection hooks across repositories, ready-made QA skills install from qaskills.sh with the qaskills CLI. Use them as a baseline, then encode your impact anchors and path rules so the model matches your product harm language.

## Frequently Asked Questions

### How is risk-based prioritization different from plain test tagging?

Tags like smoke, regression, and critical are static labels on tests. Risk-based prioritization scores capabilities for a specific change, then selects tests. The same test may run on one PR and skip on another because likelihood moved. Tags remain useful as implementation details inside a capability pack, but the strategy driver is impact times change-aware likelihood, not a frozen tag that ignores the diff. Teams that only retag tests without a capability model usually recreate the same imbalance under new names.

### Can we use risk scores for manual testing only?

Yes. Many organizations start by ranking exploratory charters and release checklist items with the same I and L scales, then later wire automation selection. Manual-only prioritization still needs written anchors and a visible plan per release, or it becomes hallway negotiation. When you add automation, reuse the same capability IDs so history of escapes and charters stays connected. The anti-pattern is two parallel priority systems, one for humans and one for CI, that disagree during incidents.

### What if everything scores as high risk?

Then either impact anchors are inflated or your architecture has too many critical shared paths. Fix anchors with product leadership using real incident cost language. Architecturally, invest in seams that lower likelihood for unrelated capabilities when a shared library changes (stronger contracts, smaller modules, feature isolation). Inflated scores make the model useless because selection returns the entire suite. A working model must produce different plans for a CSS tweak and a payments refactor.

### How often should we recalibrate the model?

Calendar-wise, review quarterly and after any Sev-1 or Sev-2 incident. Mechanically, recalibrate when you split services, change identity models, or adopt a new primary UI framework, because path-to-capability maps break. Track escape defects by capability monthly; two escapes in the same high-impact capability without a rule change means the model failed. Recalibration is a short meeting with artifacts, not a rewrite of the entire strategy from scratch each time.
`,
};
