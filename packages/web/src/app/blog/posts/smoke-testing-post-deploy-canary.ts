import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Smoke Testing Post Deploy Canary: A Practical Release Gate Guide',
  description:
    'Smoke testing post deploy canary releases: design critical-path gates, wire Playwright checks, and decide promote, hold, or rollback with evidence.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Smoke Testing Post Deploy Canary: A Practical Release Gate Guide

Smoke testing after a canary deploy is the short, high-signal check that answers one question before you promote traffic: does the new version work on the paths that matter, under real configuration, against real dependencies? If those paths fail, you hold or roll back. If they pass, you expand the canary with confidence instead of hope.

This guide treats smoke testing post deploy canary as a release engineering practice, not a rename of your nightly suite. You will get a concrete path selection method, a pipeline wiring pattern, Playwright examples aimed at canary hosts, failure diagnosis for flaky versus real regressions, and a promote/hold/rollback decision matrix. The audience is QA and test-automation engineers who ship with AI coding agents and still own the gate that protects production.

Canary deployments intentionally expose a small fraction of traffic (or a limited set of nodes) to a new build. That window is short. A 400-test regression pack does not fit. A 12-test smoke pack that hits login, checkout, and the billable API does. The craft is choosing those 12 tests so they fail when the canary is broken and stay quiet when it is fine.

## Canary Windows and What Smoke Must Finish Inside Them

A canary window is the period between "new version is live somewhere" and "you decide what to do next." Common shapes include percentage-based traffic splits (1% then 5% then 25%), single-node canaries in a fleet, region-limited rollouts, and feature-flag canaries that keep the binary shared but toggle behavior for a cohort.

Smoke testing post deploy canary must finish inside the observation budget of that window. If ops waits 15 minutes for metrics before promotion, your automated smoke should finish in 3 to 8 minutes, leaving room for human review of dashboards. If the canary is a single node with a 5-minute soak, a 12-minute suite is already a process failure.

Design the suite around three clocks:

1. **Deploy complete clock**: health checks green, pods ready, DNS or load balancer membership updated.
2. **Smoke clock**: automated critical-path checks against the canary target only.
3. **Observation clock**: error rate, latency, saturation, and business metrics under real traffic.

Smoke sits between (1) and (3). It is not a substitute for metrics, and metrics are not a substitute for intentional path exercise. A canary can look healthy on CPU while returning 500 on the payment webhook path nobody hit yet.

| Canary style | Typical traffic scope | Smoke target | Promote signal |
| --- | --- | --- | --- |
| Percentage split (1% / 5% / 25%) | Cohort of users | Canary hostname or sticky header routing | Smoke green + error budget hold |
| Single-node / subset of pods | Infrastructure slice | Direct node IP or canary service label | Smoke green + node metrics stable |
| Region-limited | One region | Region endpoint | Smoke green + region SLO hold |
| Feature-flag cohort | Same binary, new behavior | Flag-on identity or header | Smoke green + cohort KPIs stable |

## Critical Path Selection for Post-Deploy Smoke

Start from business risk, not from test file inventory. List the top revenue, trust, and compliance flows. For a SaaS product that might be: authenticate, open the primary workspace, create a core object, call the metered API, process a webhook, and load billing status. For commerce: home, search, product detail, add to cart, checkout start, payment method attach. For an internal platform: SSO login, submit a job, poll job status, download artifact.

For each flow, write one automated smoke case that proves the flow is alive end to end under canary configuration. Prefer fewer end-to-end cases over many unit-like checks. Unit tests already ran pre-merge. Canary smoke exists because configuration, migrations, secrets, and dependency wiring only become real after deploy.

Apply a severity filter:

- **Must fail canary if broken**: money movement, auth, data write of core entity, external callback you cannot replay easily.
- **Should warn but may not block at 1%**: secondary admin screens, rare export formats, non-critical notifications.
- **Do not put in smoke**: visual polish, long-running reports, exhaustive browser matrix, full accessibility sweeps.

That last bucket still matters. It belongs in continuous testing and scheduled suites, not in the canary gate. Teams often fail here by "promoting" the entire regression suite into post-deploy smoke, then either waiting too long or ignoring reds because they are "always flaky."

A practical selection heuristic used by several product teams:

1. Take production incident tickets from the last two quarters.
2. Tag each with the first user-visible path that failed.
3. Rank paths by incident severity times frequency.
4. Take the top 8 to 15 paths that automation can exercise in under 10 minutes total.
5. Add one "version identity" check that proves you are talking to the canary build, not production stable by accident.

The version identity check is non-negotiable. Without it, you can green-light the wrong target and learn nothing.

\`\`\`ts
// smoke/version-identity.spec.ts
import { test, expect } from '@playwright/test';

test('canary build identity is reachable', async ({ request }) => {
  const base = process.env.CANARY_BASE_URL;
  if (!base) {
    throw new Error('CANARY_BASE_URL is required for post-deploy smoke');
  }

  const res = await request.get(\`\${base}/health\`);
  expect(res.ok()).toBeTruthy();

  const body = await res.json();
  // Assert against fields your service actually exposes.
  // Common patterns: version, gitSha, buildId, release.
  expect(body.version).toBeTruthy();
  if (process.env.EXPECTED_CANARY_VERSION) {
    expect(body.version).toBe(process.env.EXPECTED_CANARY_VERSION);
  }
});
\`\`\`

If your service does not expose a version endpoint, use a response header, a static asset hash, or a canary-only path. The point is proof of target, not a particular JSON shape.

## Environment Targeting: Hitting the Canary, Not Production Stable

Smoke fails in two opposite ways: false reds against the wrong environment, and false greens against the stable fleet while the canary is on fire. Targeting is therefore part of the test design.

Patterns that work:

- **Dedicated canary hostname**: \`canary.api.example.com\` routes only to canary instances. Smoke uses that host.
- **Header-based routing**: gateway sends traffic with \`X-Canary: 1\` (or your real header name) to canary backends. Smoke injects that header on every request and browser context.
- **Cookie or JWT claim cohort**: harder for automation; prefer header routing when you control the gateway.
- **Direct pod port-forward** (emergency only): useful for debugging, poor as a permanent CI target.

Browser tests need the same routing as API tests. A Playwright project that hits the marketing CDN while APIs hit canary will produce nonsense.

\`\`\`ts
// playwright.canary.config.ts
import { defineConfig, devices } from '@playwright/test';

const canaryBase = process.env.CANARY_BASE_URL;
if (!canaryBase) {
  throw new Error('Set CANARY_BASE_URL before running canary smoke');
}

export default defineConfig({
  testDir: './smoke',
  timeout: 60_000,
  retries: 1,
  workers: 2,
  reporter: [['list'], ['junit', { outputFile: 'canary-smoke-junit.xml' }]],
  use: {
    baseURL: canaryBase,
    extraHTTPHeaders: process.env.CANARY_ROUTE_HEADER
      ? { [process.env.CANARY_ROUTE_HEADER]: process.env.CANARY_ROUTE_VALUE ?? '1' }
      : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-canary-smoke',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
\`\`\`

Keep canary smoke in its own config and directory. Mixing it with the full suite invites accidental expansion. When an engineer adds a 90-second visual diff "just for confidence," the window blows up. Separation is a social control as much as a technical one.

For locator discipline under canary UI changes, treat smoke selectors as production contracts. Prefer role- and test-id based locators over brittle CSS. The [Playwright best practices for locators](/blog/playwright-best-practices-locators-2026) article walks through durable locator patterns that belong in this suite.

## Pipeline Wiring: From Deploy Job to Smoke Job to Decision Job

A clean post-deploy sequence looks like this:

1. Build and push artifact (pre-canary).
2. Deploy canary with the new artifact.
3. Wait for readiness (Kubernetes readiness, ALB target health, or platform equivalent).
4. Run smoke against canary target only.
5. On smoke pass, start observation / ramp.
6. On smoke fail, auto-rollback or page the on-call with artifacts attached.

Do not run smoke against production stable "for comparison" as a gate. Comparison is useful as a diagnostic sidecar, not as the promote condition. The promote condition is: canary itself is good enough.

Here is a GitHub Actions shaped sketch. Flag names and action versions should match what your org pins; treat this as structure, not a copy-paste of magic action SHAs.

\`\`\`yaml
# .github/workflows/canary-smoke.yml
name: canary-smoke

on:
  workflow_dispatch:
    inputs:
      canary_base_url:
        description: Base URL of the canary target
        required: true
      expected_version:
        description: Expected build version string
        required: true

jobs:
  smoke:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browser
        run: npx playwright install --with-deps chromium
      - name: Run canary smoke
        env:
          CANARY_BASE_URL: \${{ inputs.canary_base_url }}
          EXPECTED_CANARY_VERSION: \${{ inputs.expected_version }}
          CANARY_ROUTE_HEADER: x-canary
          CANARY_ROUTE_VALUE: '1'
        run: npx playwright test -c playwright.canary.config.ts
      - name: Upload failure artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: canary-smoke-artifacts
          path: |
            test-results/
            canary-smoke-junit.xml
\`\`\`

Your deploy orchestrator (Argo Rollouts, Spinnaker, custom controller, or platform job) should call this workflow or an equivalent job and branch on exit code. Treat non-zero as "do not promote." Page humans with traces attached rather than asking them to re-run locally first.

For local debugging of a live canary:

\`\`\`bash
export CANARY_BASE_URL="https://canary.api.example.com"
export EXPECTED_CANARY_VERSION="1.84.2"
export CANARY_ROUTE_HEADER="x-canary"
export CANARY_ROUTE_VALUE="1"
npx playwright test -c playwright.canary.config.ts --headed
\`\`\`

## Anatomy of a Strong Canary Smoke Case

A strong smoke case has five properties:

1. **Short**: under 60 seconds on a warm environment when possible.
2. **Deterministic setup**: uses seed data or API fixtures, not last night's demo tenant.
3. **Observable assertion**: status codes, response bodies, UI text that maps to server truth.
4. **Idempotent enough**: safe to re-run during incident response.
5. **Named by risk**: \`smoke: checkout can start payment\` beats \`test 14\`.

Example: login plus create core entity via UI, with API verification.

\`\`\`ts
// smoke/core-entity.spec.ts
import { test, expect } from '@playwright/test';

test.describe('canary critical path: auth and core entity', () => {
  test('user can sign in and create a project', async ({ page, request }) => {
    const email = process.env.SMOKE_USER_EMAIL;
    const password = process.env.SMOKE_USER_PASSWORD;
    if (!email || !password) {
      throw new Error('SMOKE_USER_EMAIL and SMOKE_USER_PASSWORD are required');
    }

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'Workspace' })).toBeVisible();

    const projectName = \`canary-smoke-\${Date.now()}\`;
    await page.getByRole('button', { name: 'New project' }).click();
    await page.getByLabel('Project name').fill(projectName);
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();

    // Server-side confirmation reduces UI-only false confidence.
    const api = await request.get('/api/projects');
    expect(api.ok()).toBeTruthy();
    const projects = await api.json();
    const names = Array.isArray(projects)
      ? projects.map((p: { name?: string }) => p.name)
      : [];
    expect(names).toContain(projectName);
  });
});
\`\`\`

API-only smoke is valid for backend canaries without a UI change. Prefer the language and runner your team already trusts for HTTP contracts. If you are choosing among runners for a greenfield pack, the [JavaScript testing frameworks complete guide for 2026](/blog/javascript-testing-frameworks-complete-guide-2026) compares Vitest, Jest, Playwright Test, and related options in a decision-friendly way.

\`\`\`ts
// smoke/api-billing.spec.ts
import { test, expect } from '@playwright/test';

test('billing status endpoint returns a usable payload on canary', async ({ request }) => {
  const token = process.env.SMOKE_API_TOKEN;
  if (!token) {
    throw new Error('SMOKE_API_TOKEN is required');
  }

  const res = await request.get('/api/billing/status', {
    headers: { Authorization: \`Bearer \${token}\` },
  });

  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty('plan');
  expect(body).toHaveProperty('status');
  expect(['active', 'trialing', 'past_due']).toContain(body.status);
});
\`\`\`

## Health Endpoints Versus User-Path Smoke

Health endpoints are necessary and insufficient. They prove process liveness and often shallow dependency pings. They do not prove that the auth service accepts your production IdP configuration, that the migration applied cleanly for the write path, or that the CDN is serving the matching frontend bundle for this canary API.

Use a layered model:

| Layer | What it proves | Typical owner | Gate strength |
| --- | --- | --- | --- |
| Liveness | Process is up | Platform | Required before smoke starts |
| Readiness | Instance can take traffic | Platform | Required before smoke starts |
| Deep health | Critical deps respond | Service team | Useful, not sole promote signal |
| Synthetic user path | Business flow works | QA / product eng | Primary smoke gate |
| Live traffic SLOs | Real users are fine | SRE | Promote/ramp signal after smoke |

A common failure mode: deep health returns 200 because it pings Redis with \`PING\` while the application code path that reads a new Redis key format throws. Synthetic user-path smoke catches that class of bug. Live traffic catches what automation never modeled. You want all three in sequence, not one hero metric.

## Synthetic Data, Secrets, and Canary Tenants

Post-deploy smoke needs credentials that are allowed to hit canary without polluting analytics or billing. Patterns:

- Dedicated smoke tenant with synthetic flags so product analytics exclude it.
- Short-lived tokens minted by a CI OIDC flow into your API.
- Seeded catalog SKUs that checkout can purchase in a sandbox payment mode.

Never hardcode production admin passwords in the repo. Inject secrets from the CI secret store. Rotate the smoke user on the same schedule as other machine users.

Idempotency matters. If every run creates 50 projects and nothing cleans them, the canary tenant becomes a junk drawer that slows tests and confuses humans. Prefer:

- Unique names with timestamps.
- Soft-delete or API cleanup in \`test.afterAll\` when safe.
- TTL-based cleanup jobs on the service side for entities tagged \`source=canary-smoke\`.

\`\`\`ts
// smoke/helpers/cleanup.ts
import type { APIRequestContext } from '@playwright/test';

export async function deleteProjectByName(
  request: APIRequestContext,
  name: string,
): Promise<void> {
  const list = await request.get('/api/projects');
  if (!list.ok()) return;
  const projects = (await list.json()) as Array<{ id: string; name: string }>;
  const match = projects.find((p) => p.name === name);
  if (!match) return;
  await request.delete(\`/api/projects/\${match.id}\`);
}
\`\`\`

## Failure Mode Deep Dive: Flaky Smoke Versus Real Canary Regression

When canary smoke turns red, on-call needs a diagnosis path that does not start with "rerun until green."

### Symptom: intermittent timeout on first navigation

**Likely causes**: canary not ready when smoke started, cold start, CDN cache miss, single-worker overload.

**Diagnosis**:

1. Check readiness timestamps versus smoke job start.
2. Compare trace waterfalls for slow document vs slow XHR.
3. See if retry-on-CI is masking a systematic 8-second boot.

**Fix**: add an explicit readiness wait job before smoke; warm a critical path once; increase only the steps that need it, not global timeouts forever.

### Symptom: version identity fails

**Likely causes**: wrong base URL, sticky session to stable, header routing misconfigured, deploy did not finish.

**Diagnosis**: print resolved \`CANARY_BASE_URL\`, response headers, and body version in the failure log. Curl the same URL from the runner.

**Fix**: correct routing; do not weaken the assertion.

### Symptom: login works, create entity fails with 500

**Likely causes**: migration missing, permission change, schema mismatch, dependency not ready for new code path.

**Diagnosis**: pull canary logs for the request id from the Playwright trace; check migration job status; compare feature flags on canary vs stable.

**Fix**: rollback canary if user-impacting; fix forward only when the blast radius is proven tiny and the fix is already built.

### Symptom: only one browser step fails on text content

**Likely causes**: copy change, i18n, A/B experiment on canary, locator tied to marketing string.

**Diagnosis**: screenshot + accessibility snapshot; check whether API still succeeded.

**Fix**: assert on roles and stable test ids; move copy checks out of smoke.

What people get wrong: treating every red as flake because "canary smoke is sensitive." Sensitivity is the point. If you mute it, you reintroduce the production surprise the canary was meant to prevent. Track flake rate separately from failure rate. A suite with 15% flake is a maintenance emergency; a suite with 2% flake and occasional real catches is doing its job.

| Observation | Prefer interpretation | First action |
| --- | --- | --- |
| Fail once, pass on retry, no code change | Possible flake or race | Capture trace, file flake ticket, do not silence gate |
| Fail 3/3 on same step | Real canary issue or bad targeting | Check version identity, then service logs |
| Fail only after 5% ramp, smoke was green at 1% | Load or data-shape issue | Hold ramp, expand diagnostics, consider load smoke |
| Pass smoke, error rate climbs | Coverage gap | Add path that matches the error signature |

## Promote, Hold, or Rollback: Decision Matrix

Smoke is one input. Combine it with SLOs and change risk.

| Smoke result | Error rate vs baseline | Latency | Decision |
| --- | --- | --- | --- |
| Pass | Within budget | Within budget | Promote / continue ramp |
| Pass | Slightly elevated, known noisy metric | Fine | Hold short, investigate, do not auto-promote |
| Pass | Clearly elevated on canary cohort | Fine or bad | Hold or rollback; smoke coverage gap likely |
| Fail (identity) | N/A | N/A | Stop: fix targeting, re-run |
| Fail (critical path) | Any | Any | Rollback or freeze canary; no expand |
| Fail (non-critical path you mistakenly gated) | Fine | Fine | Fix suite classification; do not expand gate scope mid-incident |

Write this matrix into the runbook, not only the blog post you meant to read later. During an incident, people follow the shortest document with a table.

## Observability Hooks That Make Smoke Debuggable

Attach correlation IDs. Playwright can set a header like \`x-request-id\` per test when your gateway forwards it. Log that id in the test title on failure. In OpenTelemetry-aware systems, a single id from UI click to DB span collapses war-room time.

Export JUnit or JSON results into the same system that stores deploy events so you can answer: "which deploy, which smoke run, which commit." Without that join, postmortems become archaeology.

Ready-made QA skills for agents that help scaffold canary smoke layouts install from qaskills.sh with the qaskills CLI when you want a starting pack instead of a blank folder. Use them as a skeleton; your critical paths and routing headers remain product-specific.

## Expanding Coverage Without Destroying the Window

Pressure always arrives: "add mobile," "add Firefox," "add the admin console," "add the partner API." Use a budget.

1. Measure current p95 suite duration on the canary environment.
2. Cap total smoke wall time (example: 8 minutes).
3. New cases must fit the budget or replace a lower-value case.
4. Parallelize carefully; canary environments are often smaller than staging and will throttle.

Split suites by stage if needed:

- **T0 smoke** (2 minutes): identity, health-backed critical API, login.
- **T1 smoke** (5 minutes): money path, core write path.
- **T2 soak checks** (async after promote starts): secondary browsers, heavier flows.

Only T0 and T1 block promotion. T2 informs whether to continue ramping.

\`\`\`bash
# Example local split using Playwright grep against test titles
npx playwright test -c playwright.canary.config.ts --grep @t0
npx playwright test -c playwright.canary.config.ts --grep @t1
\`\`\`

Tag tests in titles or annotations consistently so the grep means something six months later.

## Contract Between Deployers and Testers

Ambiguity kills canary programs. Agree in writing:

- Who owns the smoke suite (usually the team that owns the service, with QA platform support).
- What "red" means operationally (auto-rollback vs manual).
- How secrets for smoke users are rotated.
- How long a skipped smoke is allowed (ideally never in production canary).
- How to emergency-bypass with dual control and mandatory follow-up ticket.

Bypasses without tickets become the real process. If leadership demands a bypass, require a time-boxed waiver and a next-business-day suite fix.

## Mapping Smoke Results to Product Risk Language

Engineers say "tests failed." Product and support hear noise. Translate:

- "Checkout cannot start payment on canary" -> revenue risk, rollback.
- "Admin CSV export 500" -> support load risk, may hold admin-only flag rather than full rollback if export is isolated.
- "Version header missing" -> process risk, do not trust any other green.

This translation belongs in the alert text itself, not in a wiki.

## Putting It Together: A Reference Operating Sequence

1. Merge to main after unit/integration/CI UI checks.
2. Deploy canary artifact to canary target.
3. Wait for readiness probes.
4. Run T0 + T1 smoke with version identity.
5. On fail: rollback, attach traces, open incident if users already on canary.
6. On pass: ramp traffic per policy while watching SLOs.
7. On SLO breach: rollback even if smoke was green; file coverage gap.
8. After full promote: keep smoke as a post-deploy check on the now-stable version for the next change, or retire the canary target until next release.

That loop is the product. Tools change; the loop remains.

## Frequently Asked Questions

### How many tests belong in smoke testing post deploy canary?

Most teams land between 8 and 20 end-to-end checks that finish in under 10 minutes wall time, including a version identity assertion. Count risk coverage, not file count. If two tests exercise the same auth path with different button labels, delete one. If checkout and subscription upgrade both move money through different services, keep both. Grow only when a production escape proves a gap, and retire tests that no longer map to a current critical path.

### Should canary smoke replace staging regression?

No. Staging regression still validates breadth before you cut a canary. Canary smoke validates that this artifact, with production-like config and dependencies, serves the critical paths for a limited audience. Staging misses secret material differences, data shape differences, and real dependency behavior. Canary smoke misses depth by design so it fits the canary window. Use both, with different budgets and different failure policies, and never treat a green staging run as proof the canary target is healthy.

### What if the canary environment cannot support parallel browser tests?

Lower workers, serialize the heaviest flows, and push pure API checks earlier in the job so they fail fast without a browser. Scale the canary pool if release frequency demands it. Forcing high parallelism against a tiny canary often creates artificial 5xx noise that trains teams to ignore the gate. Measure environment capacity the same way you measure suite duration.

### How do we stop the smoke suite from becoming a second full regression pack?

Separate directory and config, hard wall-time budget, and a rule that new smoke cases require a risk sponsor and a case they replace if over budget. Review the suite monthly against the last quarter of incidents and escapes. Without an explicit removal path, suites only grow, and growing suites either slow deploys or get skipped. Both outcomes erase the value of smoke testing post deploy canary.
`,
};
