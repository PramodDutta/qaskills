import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Release August 2026: What Changed in 1.61 and 1.62',
  description: 'playwright release august 2026 adoption guide covering 1.61 and 1.62 changes, risk checks, browser notes, and upgrade workflows for QA teams.',
  date: '2026-08-28',
  category: 'Reference',
  content: `
# Playwright Release August 2026: What Changed in 1.61 and 1.62

The playwright release august 2026 adoption answer is this: treat Playwright 1.61 and 1.62 as practical upgrades for passkeys, browser storage control, screenshots, retries, reporter policy, component testing, and agent workflows. The changes worth adopting first are \`page.localStorage\`, \`page.sessionStorage\`, isolated retries, WebP screenshots, \`AbortSignal\` support, and the new CLI or MCP paths if AI coding agents help maintain your tests.

The official release notes are the source of truth: https://playwright.dev/docs/release-notes. This guide turns those notes into an adoption plan for QA engineers who need fewer flaky tests, faster failure diagnosis, and safer agent-generated Playwright code.

## Confirmed Change Map for 1.61 and 1.62

Playwright 1.61 brought virtual WebAuthn credentials, WebStorage APIs, more video modes, network diagnostics, Ubuntu 26.04 support, and trace or HAR WebSocket coverage. Playwright 1.62 added a new component testing model, cancellation via \`AbortSignal\`, WebP screenshots, reporter preprocessing, isolated retries, bundled Playwright MCP and \`playwright-cli\`, and several smaller locator, network, evaluation, and reporting improvements.

| Version | Confirmed area | What changed | Adopt now? |
|---|---|---|---|
| 1.61 | WebAuthn | Virtual credentials through \`browserContext.credentials\` | Yes for passkey products |
| 1.61 | Storage | \`page.localStorage\` and \`page.sessionStorage\` APIs | Yes for setup, migration, and corrupt-state tests |
| 1.61 | Test runner | New video retention modes and \`expect.soft.poll(...)\` | Yes for failure evidence tuning |
| 1.61 | Reporting | \`fullConfig.argv\`, flaky-test failure context, AggregateError details | Yes for custom reporters |
| 1.62 | Assertions and actions | Most operations and web-first assertions accept a \`signal\` option | Pilot in helper utilities |
| 1.62 | Screenshots | WebP snapshots and screenshots | Adopt where artifact size matters |
| 1.62 | Retries | \`retryStrategy: 'isolated'\` | Strong candidate for flaky shared environments |
| 1.62 | Component testing | Stories and galleries model | Evaluate before rewriting existing CT suites |

The safest reading: these releases are not only about browser version bumps. They make Playwright easier to drive from agents and easier to inspect after failure. That matters because AI-generated tests often fail for boring reasons: state setup, vague selectors, hidden waits, and missing evidence. 1.61 and 1.62 give you better primitives around those exact weak spots.

If your next task is upgrading an existing suite, pair this reference with the broader [Playwright best practices 2026](/blog/playwright-best-practices-2026) so your adoption does not become a blind version bump.

## Upgrade Policy Before Code Changes

Before you touch tests, decide what success means. A Playwright upgrade should answer four questions: did browser behavior change, did test runner behavior change, did reporting output change, and did our agent workflow need new instructions?

| Check | Command or action | Good result | Follow-up if it fails |
|---|---|---|---|
| Dependency install | \`npm install -D @playwright/test@latest\` | Lockfile changes only expected packages | Review transitive changes |
| Browser install | \`npx playwright install --with-deps\` | Browsers download and cache in CI | Fix image or dependency layer |
| Smoke lane | Run tagged smoke tests | Same pass rate as before | Inspect traces, not only logs |
| Flake lane | Run known flaky group twice | Lower or equal retry count | Test isolated retries |
| Report output | Open HTML report and trace | Attachments and steps still readable | Update reporter config |

Use exact package versions in your lockfile. The command below is intentionally plain. It upgrades the test package, runs the project install step, and executes smoke tests filtered with Playwright's supported grep option.

\`\`\`bash
npm install -D @playwright/test@latest
npx playwright install --with-deps
npx playwright test --grep "@smoke"
\`\`\`

Do not swap filter flags between tools. Playwright filters tests with \`--grep\` or \`-g\`. Vitest filters test names with \`-t\` or \`--testNamePattern\`. I still see mixed commands in agent-generated pull requests, and they waste review time because the command either runs the wrong set or fails before any useful signal appears.

## Adopt WebStorage for State Setup and Migration Tests

The \`page.localStorage\` and \`page.sessionStorage\` APIs in 1.61 remove a common source of brittle setup code. Before this, many tests used \`page.evaluate\` to poke storage. That worked, but it mixed browser execution details into test intent and made helper functions harder for agents to modify safely.

Here is a small Playwright test that seeds local storage, reloads the page, and verifies the app reads the stored preference. It is also a good shape for local storage schema migration tests.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('reads the saved dashboard density', async ({ page }) => {
  await page.goto('/settings');

  await page.localStorage.setItem(
    'dashboard.preferences',
    JSON.stringify({ version: 2, density: 'compact' })
  );

  await page.reload();

  await expect(page.getByRole('radio', { name: 'Compact' })).toBeChecked();

  const saved = await page.localStorage.getItem('dashboard.preferences');
  expect(JSON.parse(saved ?? '{}')).toEqual({ version: 2, density: 'compact' });
});
\`\`\`

This is clearer than an evaluation block and easier to review. It also reduces one kind of false confidence: \`page.evaluate\` can accidentally run before the app reaches the origin you meant to test. With the storage API, the intent is visible and the failure points are narrower.

For deeper storage upgrade cases, link this adoption step to your local data migration suite rather than scattering one-off setup lines through UI tests.

## Use Isolated Retries to Separate Failures from Interference

Playwright 1.62 added \`testConfig.retryStrategy\`. The default behavior retries when a worker is available. The new \`'isolated'\` option runs retries at the end, one by one in a single worker, so a failing test gets less interference from the rest of the suite.

That does not magically fix flaky tests. It gives you a cleaner signal. If a test fails in the main run and passes in isolated retry, you likely have interference, shared state, timing pressure, or environment contention. If it fails again in isolation, the bug is probably local to that test or feature.

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: 2,
  retryStrategy: 'isolated',
  reporter: [['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
});
\`\`\`

I would pilot this on CI before changing every project. A suite with many true product failures can take longer because retries are deferred. A suite with shared test users or noisy backend state may become much easier to diagnose.

| Failure pattern | Immediate retries usually show | Isolated retries can show | Action |
|---|---|---|---|
| Shared account collision | Random pass after retry | Pass in isolation | Unique data per test |
| Browser resource pressure | Mixed failures across files | Pass after main run | Reduce parallelism or split projects |
| Real product regression | Same failure repeatedly | Same failure repeatedly | Debug feature code |
| Bad wait condition | Inconsistent timeout | Inconsistent timeout | Assert on user-visible state |

The opinion from practice: isolated retries are a diagnostic tool, not a flake budget. If a test only passes on retry for a month, the retry is hiding work you still owe.

## Store Smaller Visual Evidence with WebP

Playwright 1.62 added WebP support for visual comparisons and standalone screenshots. If your CI stores many screenshots, WebP can reduce artifact volume. The official notes distinguish two cases: visual comparison snapshots can use a \`.webp\` name, and standalone screenshots can use a WebP path and quality setting.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('checkout summary visual state', async ({ page }) => {
  await page.goto('/checkout/summary');
  await expect(page).toHaveScreenshot('checkout-summary.webp');
});

test('captures a compact debug screenshot', async ({ page }) => {
  await page.goto('/checkout/summary');
  await page.screenshot({ path: 'artifacts/checkout-summary.webp', quality: 70 });
});
\`\`\`

Do not switch every visual assertion blindly. If your team already has a stable PNG baseline process, start with debug screenshots or a low-risk page group. Visual tests are sensitive to codec, antialiasing, fonts, and browser versions. Change one dimension at a time so the review can tell whether a diff is product change, browser change, or artifact format change.

For diagnosing visual failures, keep your trace process intact. A smaller screenshot is helpful, but the trace remains the full story. If your team needs to sharpen that workflow, use the [Playwright trace viewer complete guide 2026](/blog/playwright-trace-viewer-complete-guide-2026) as the companion piece.

## Cancel Work Deliberately with AbortSignal

Playwright 1.62 says most operations and web-first assertions now accept a \`signal\` option. The obvious use is canceling long waits. The better use is enforcing a shorter budget inside a helper without changing the global test timeout.

\`\`\`ts
import { expect, test } from '@playwright/test';

function abortAfter(milliseconds: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), milliseconds);
  return controller.signal;
}

test('does not wait too long for optional recommendation panel', async ({ page }) => {
  await page.goto('/product/42');

  const signal = abortAfter(1500);
  await expect(page.getByRole('region', { name: 'Recommendations' })).toBeVisible({
    signal,
    timeout: 0,
  });
});
\`\`\`

The \`timeout: 0\` line is not a trick. The official notes state that providing a signal does not disable the default timeout. If you want the signal to own the budget, disable the Playwright timeout for that operation.

Be selective. Cancellation is useful for optional UI and agent exploration utilities. It is a poor substitute for a precise assertion on a required checkout confirmation. Required product states should fail clearly, with traces, at a timeout that reflects user impact and backend reality.

## Use Reporter Preprocessing for Test Policy, Not Business Logic

Playwright 1.62 added \`reporter.preprocess()\`, which runs after config resolution and before \`reporter.onBegin()\`. A reporter can mark tests as skipped, excluded, fixed, or failing through a \`TestRun\` object. That is powerful, so keep it boring.

Good uses include quarantine policy, ownership enforcement, environment gating, and temporary freeze windows. Bad uses include hiding failures because a service is annoying, skipping tests based on a live API call that sometimes times out, or mutating labels in ways reviewers cannot see.

\`\`\`ts
class PolicyReporter {
  async preprocess({ suite, testRun }: any) {
    for (const testCase of suite.allTests()) {
      const title = testCase.titlePath().join(' ');
      const isQuarantined = title.includes('@quarantine');

      if (isQuarantined) {
        testRun.skip(testCase);
      }
    }
  }
}

export default PolicyReporter;
\`\`\`

This example is intentionally simple and uses \`any\` so it runs in a plain TypeScript project without depending on exact reporter type imports. In a real suite, put the policy source in a reviewed file, record why each rule exists, and surface the skip count in CI output.

## Component Testing Stories Need a Migration Plan

The 1.62 component testing change is not a small syntax tweak. The release notes describe a stories and galleries model where a story wraps a component in a concrete scenario, and a served gallery renders stories on demand. The new \`fixtures.mount()\` fixture navigates to the gallery, mounts a story by id, and returns a locator scoped to the story root.

That model is attractive for QA teams because test data, providers, and props become named scenarios instead of repeated setup hidden inside every spec. It also fits agent workflows: an agent can inspect a story catalog, pick a state, and generate a test around that state.

| Existing CT pattern | New model pressure | Migration tactic |
|---|---|---|
| Inline component props in every test | Hard to reuse scenarios | Extract stable story ids first |
| Provider setup inside each spec | Duplicated and easy to drift | Move providers into gallery wiring |
| Visual states created by imperative clicks | Tests do too much before assertion | Add stories for loaded, empty, error, and disabled states |
| Agent-generated CT specs | Agents invent setup details | Give agents story ids and expected roles |

Do not rewrite a large CT suite in one branch. Start with one component that has several meaningful states and a known flake history. If the story model reduces setup lines and improves failure messages, expand it.

## Passkeys Are Finally Testable Without Hardware

The 1.61 WebAuthn credentials feature matters for products that use passkeys. Before virtual credentials, teams often skipped end-to-end passkey coverage, mocked the server boundary, or kept a fragile manual test plan. The new context credentials path lets tests register passkeys and respond to browser credential ceremonies without a physical security key.

I would still keep passkey tests narrow. Cover registration, sign-in, account recovery, device loss, and error messaging. Do not bury passkey setup in every login fixture. Create one helper, make its inputs explicit, and use it only where the product path truly depends on WebAuthn.

The official release notes show \`browserContext.credentials.create()\`, \`credentials.install()\`, and \`credentials.get()\` as the key primitives. Because credential material is product-specific, avoid copying placeholder keys into your suite. Generate or provision test credentials through the same controlled test-user path your backend supports.

## CI Adoption Workflow for Teams Using Agents

When AI coding agents touch Playwright tests, the upgrade workflow needs guardrails. Agents are good at converting patterns. They are less reliable at knowing which new API belongs in which failure mode unless you give them a short adoption matrix and commands they must run.

\`\`\`yaml
name: playwright-upgrade-check

on:
  pull_request:
    paths:
      - 'package.json'
      - 'package-lock.json'
      - 'playwright.config.ts'
      - 'tests/**'

jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --grep "@smoke"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report
\`\`\`

Add a short agent instruction near your tests:

\`\`\`markdown
# Playwright Agent Rules

- Use Playwright filters with --grep or -g.
- Prefer role and label locators before test ids.
- Use page.localStorage and page.sessionStorage for storage setup.
- Keep retryStrategy changes in playwright.config.ts.
- Attach trace and screenshot evidence when changing waits.
- Do not replace required assertions with optional waits.
\`\`\`

Those rules are small enough for an agent to follow and specific enough for review. They also reduce the common failure where an agent sees a timeout and simply increases the timeout everywhere.

## A Failure Story: The Upgrade That Looked Like a Browser Bug

Symptom: after an upgrade rehearsal, six checkout tests failed only in CI. The local run passed. The failing step waited for a discount banner. The first theory was a browser rendering regression because the failures started on the same day as the Playwright upgrade.

Wrong theory: the team pinned the browser package back and reran the suite. It still failed in CI when parallelism was high.

Actual cause: all six tests reused the same promo code and user account. Immediate retries passed because the retry sometimes ran after the backend reset job completed. The upgrade did not create the race. It made the race visible because the browser versions and timing changed slightly.

Fix: each test now creates a unique promo code through an API helper, and the project piloted \`retryStrategy: 'isolated'\` for the checkout lane. The retries stopped masking account collision as a browser issue. The important lesson was not "upgrade caused flake." It was "upgrade changed timing enough to expose shared state."

## What People Get Wrong About Release Notes

People read release notes as a feature menu. QA leads should read them as a risk map. A new screenshot format is not only a storage optimization, it is a visual baseline change. A new retry strategy is not only a config option, it changes the evidence you see when a suite is unhealthy. A storage API is not only convenience, it changes how clearly tests express setup.

For 1.61 and 1.62, the highest-value adoption path is:

1. Upgrade in a branch and run smoke tests with traces retained on failure.
2. Convert storage setup helpers to \`page.localStorage\` and \`page.sessionStorage\`.
3. Pilot WebP screenshots in debug artifacts before visual baselines.
4. Try isolated retries on a known flaky lane and compare failure diagnosis quality.
5. Add agent instructions for Playwright filters, storage APIs, and trace evidence.
6. Evaluate component testing stories on one component before broad migration.

That order keeps the blast radius small. It also gives reviewers useful diffs instead of a giant upgrade branch that changes package versions, config, screenshots, fixtures, and component tests at once.

## Browser and Platform Notes That Affect QA Triage

Browser version bumps deserve a separate triage pass because they can change rendering, focus behavior, security prompts, media behavior, and accessibility tree details. The official 1.61 notes list Chromium 149, Firefox 151, WebKit 26.5, and stable-channel testing against Google Chrome 149 and Microsoft Edge 149. The 1.62 notes list Chromium 151, Firefox 153, WebKit 26.5, and stable-channel testing against Google Chrome 151 and Microsoft Edge 151. Treat those as test-environment facts, not trivia.

When a failure appears after the upgrade, split the question into three buckets. Did the product change? Did the browser expose behavior the product already relied on accidentally? Did the test encode an assumption that was never guaranteed? This framing keeps the team from pinning every failure on Playwright or rewriting every wait.

| Symptom after upgrade | First inspection target | Likely next test action |
|---|---|---|
| Visual baseline drift | Font rendering, browser channel, screenshot format | Re-run one page with unchanged format |
| Focus or keyboard failure | Accessible name, active element, dialog timing | Add trace and role assertion |
| API test timing shift | Backend timing, request route, retry evidence | Compare trace network panel |
| WebKit-only failure | Browser-specific product behavior | Add browser-tagged issue with reduced repro |
| Stable Chrome mismatch | Channel selection in config or CI image | Print project browser and channel |

Also review the support notes. Playwright 1.61 says Ubuntu 26.04 is supported. Playwright 1.62 says Debian 11 is no longer supported. If your CI image is old, the Playwright upgrade may fail before a single test starts. That is not a flaky test. It is an environment contract failure.

I prefer a small diagnostic test that prints project metadata during upgrade branches. It is not something to keep noisy forever, but it helps agents and reviewers stop guessing which browser ran.

\`\`\`ts
import { test } from '@playwright/test';

test('prints browser project metadata @upgrade-diagnostic', async ({ browser }, testInfo) => {
  console.log(JSON.stringify({
    project: testInfo.project.name,
    browserName: browser.browserType().name(),
    testFile: testInfo.file,
  }));
});
\`\`\`

Run it only in the upgrade branch or behind a tag. The output gives you a quick sanity check when CI, local development, and a container image disagree. Small diagnostics like this are especially useful when an AI agent is repairing tests, because the agent needs concrete environment facts before it edits assertions.

## Frequently Asked Questions

### Should QA teams upgrade to Playwright 1.62 immediately?

Upgrade quickly if you need the confirmed 1.62 features: WebP screenshots, isolated retries, AbortSignal cancellation, reporter preprocessing, bundled MCP or CLI workflows, or the new component testing model. Otherwise, rehearse the upgrade in a branch, run smoke and flake lanes, inspect traces, and adopt features one at a time. Browser version changes alone justify a controlled rollout in teams with visual tests.

### What is the safest Playwright 1.61 feature to adopt first?

\`page.localStorage\` and \`page.sessionStorage\` are the safest first adoption for many QA teams. They replace scattered \`page.evaluate\` storage setup with clearer test intent, and they fit real workflows like preference setup, corrupt-state testing, and client-side schema migration checks. Start by changing shared helper functions rather than editing every spec manually. That keeps review small and behavior easier to compare in CI.

### Does isolated retry hide flaky tests?

It can if the team treats retry pass as success. Used properly, isolated retry improves diagnosis because it separates a failed test from parallel-suite interference. A pass in isolated retry often points to shared data, resource pressure, or cross-test pollution. A repeated failure points closer to the product path or assertion. Track retry counts and review recurring retry passes as defects, not as green builds.

### Are WebP screenshots safe for visual regression baselines?

They can be safe, but change them deliberately. WebP support in 1.62 is useful for smaller artifacts and visual snapshots, yet screenshot format changes can alter review noise, storage behavior, and baseline diffs. Pilot WebP on debug screenshots first, then move a small visual-test group. Keep fonts, browser version, viewport, and operating system stable while evaluating the format so the diff source is clear.
`,
};
