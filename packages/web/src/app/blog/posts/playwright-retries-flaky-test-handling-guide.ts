import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Retries & Flaky Test Handling: Complete 2026 Guide',
  description: 'Cure flaky Playwright tests with smart retries, expect timeouts, auto-waiting, isolation patterns, and CI quarantine workflows for 2026.',
  date: '2026-05-11',
  category: 'Guide',
  content: `
# Playwright Retries and Flaky Test Handling: Complete 2026 Guide

A flaky test is worse than no test. It teaches developers to ignore failures, slows merges, and erodes the trust that makes automation worth running. Playwright provides the strongest set of anti-flake primitives of any browser test runner in 2026: auto-waiting locators, web-first assertions, retries, parallel isolation, and full trace recording. But the tools only help if you use them deliberately. This guide is a complete playbook for diagnosing, fixing, and gating flaky tests in Playwright suites.

For the broader test reliability story, read [Fix Flaky Tests Guide](/blog/fix-flaky-tests-guide). For CI scaffolding, [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026). Install the [playwright-e2e skill](/skills/playwright-e2e) for AI-generated tests that follow these patterns.

## What counts as flaky?

A test is flaky if it produces different results on the same code with no intentional change in conditions. The Playwright contract: deterministic input, deterministic output. Sources of nondeterminism:

| Source | Example | Fix |
|---|---|---|
| Timing | Assertion runs before fetch returns | Use \`waitForResponse\` or auto-waiting assertion |
| External services | Third-party widget loads variably | Mock with \`page.route\` |
| Shared state | Two tests write to same DB row | Per-worker data isolation |
| Animations | Element moves while click fires | \`reducedMotion: 'reduce'\` |
| Network | Real backend has variable latency | Stub or use retries on the network call only |
| Locator drift | Selector matches a transient element | Use accessible roles |
| Browser flakes | Chromium crashes 1 in 1000 | Configure retries |

The first six are bugs in your tests; the last is a fact of life. Retries should only paper over the seventh, not the first six.

## Configuring retries

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 2 : 0,
});
\`\`\`

Local: zero retries so you see flakes immediately. CI: 1-2 retries to absorb infrastructure noise without masking real bugs. Retries above two are a smell: you are paying for nondeterminism rather than fixing it.

Per-test override:

\`\`\`typescript
test('upload to slow third party', async ({ page }) => {
  test.info().retry; // retry index (0 for first attempt)
}, { retries: 3 });
\`\`\`

## When a test gets retried

The runner discards the failed attempt's artifacts and starts over. Artifacts from the successful attempt are kept; \`trace: 'on-first-retry'\` records a trace specifically for the second attempt.

\`\`\`typescript
use: {
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
\`\`\`

When a test passes on retry, the run is marked "flaky" (yellow in the HTML report). Treat flaky results as warnings to investigate, not as green.

## Auto-waiting in action

Most flakiness comes from explicit timing. Playwright's auto-waiting eliminates most of it.

\`\`\`typescript
// Bad: race condition
await page.click('#submit');
const text = await page.textContent('.toast');
expect(text).toBe('Saved');

// Good: auto-waiting assertion
await page.getByRole('button', { name: 'Submit' }).click();
await expect(page.getByRole('status')).toHaveText('Saved');
\`\`\`

The assertion retries internally for up to \`expect.timeout\` (default 5000ms). The result: deterministic without explicit waits.

## Tuning expect timeout

For slower CI environments, raise the assertion timeout.

\`\`\`typescript
export default defineConfig({
  expect: {
    timeout: 10_000,
  },
});
\`\`\`

Per assertion:

\`\`\`typescript
await expect(page.getByRole('heading')).toHaveText('Welcome', { timeout: 15_000 });
\`\`\`

Raise sparingly. A 30-second timeout converts every flake into a 30-second wait; the cumulative cost adds up across a large suite.

## Waiting for network

When an assertion needs to wait for a specific response:

\`\`\`typescript
const responsePromise = page.waitForResponse('**/api/orders');
await page.getByRole('button', { name: 'Place order' }).click();
const response = await responsePromise;
expect(response.status()).toBe(201);
\`\`\`

The \`waitForResponse\` call returns a promise immediately and resolves when the response arrives, regardless of when the click happens.

## Avoiding \`waitForTimeout\`

Hard timeouts are the single biggest flakiness source.

\`\`\`typescript
// Bad
await page.waitForTimeout(2000);

// Good: deterministic
await expect(page.getByRole('status', { name: 'Loaded' })).toBeVisible();
\`\`\`

\`waitForTimeout\` is occasionally useful for debugging or for animations that genuinely require fixed delays, but it should never appear in a committed test.

## Isolation patterns

Parallel tests share nothing by default if you use Playwright fixtures correctly. Common isolation mistakes:

| Mistake | Fix |
|---|---|
| Shared DB rows | Per-worker test data with \`workerIndex\` |
| Shared filesystem path | Use \`testInfo.outputDir\` |
| Global browser context | Use the default per-test context |
| Cached storageState | Per-worker storage state |

See [Playwright Browser Contexts Isolation Guide](/blog/playwright-browser-contexts-isolation-guide) for the full pattern.

## Stable locator strategies

Locator drift is a major flakiness source. The rules:

1. Use \`getByRole\` with accessible names.
2. Scope with chained locators or \`.filter()\`.
3. Avoid CSS selectors that include layout classes.
4. Never use absolute positional selectors.

See [Playwright Best Practices for Locators](/blog/playwright-best-practices-locators-2026) for the full decision tree.

## Disabling animations

\`\`\`typescript
use: {
  reducedMotion: 'reduce',
}
\`\`\`

Reduced motion disables CSS animations and transitions. The page renders to its final state without intermediate frames. Click handlers fire reliably; snapshots stabilize.

## Mocking third-party content

Third-party scripts and widgets are flaky by design (they update independently of your code).

\`\`\`typescript
await page.route(/google-analytics|hotjar|intercom/, (route) => route.abort());
\`\`\`

For widgets your app depends on (Stripe, Intercom for support), mock the specific endpoints rather than blocking the entire domain.

## Quarantining flaky tests

When you spot a flaky test in CI, do not delete it; quarantine it.

\`\`\`typescript
test('@flaky payment webhook fires', async () => {
  // ...
}, { tag: '@flaky' });
\`\`\`

\`\`\`yaml
- name: Run main suite (exclude flaky)
  run: pnpm exec playwright test --grep-invert "@flaky"

- name: Run flaky suite (allowed to fail)
  run: pnpm exec playwright test --grep "@flaky"
  continue-on-error: true
\`\`\`

A separate \`@flaky\` job runs but does not block the merge. Treat it as a backlog: schedule weekly time to investigate.

## Diagnosing flakiness

When a test fails intermittently:

1. Enable \`trace: 'retain-on-failure'\` and \`video: 'retain-on-failure'\`.
2. Push to CI. Capture artifacts on the failed runs.
3. Download trace. Open with \`npx playwright show-trace\`.
4. Compare the failed run trace to a successful run trace.
5. Identify the divergence: locator missed, response delayed, modal flickered.
6. Fix the test.

The trace tells you, with high confidence, exactly when and why the test failed. Without traces, flakiness is detective work.

## Common pitfalls

**Pitfall 1: Using retries to mask race conditions.** A retry hides the symptom but not the cause. The next person to touch the test will be confused.

**Pitfall 2: Setting \`expect.timeout\` very high.** A 60-second timeout slows the suite by 60 seconds for every legitimate failure.

**Pitfall 3: Ignoring "flaky" status.** Tests that pass on retry are unstable. Investigate, do not celebrate.

**Pitfall 4: Reusing fixtures across tests.** State leaks. Use per-test fixtures unless cost forces worker scope.

**Pitfall 5: Mocking only when convenient.** If the third party is unreliable in CI, it is unreliable in production. Mock consistently.

## Anti-patterns

- \`expect(true).toBe(true)\` retries as fallback. Investigate, do not paper over.
- Skipping tests instead of fixing them. \`test.skip\` becomes \`test.fixme\` becomes \`test.delete\`.
- Catching exceptions in tests. Let Playwright surface failures.
- Re-running locally until it passes. Use the trace to find the cause.

## A flake-resistant test template

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'parallel' });

test.use({
  reducedMotion: 'reduce',
});

test.describe('@smoke Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/google-analytics|intercom/, (route) => route.abort());
    await page.goto('/checkout');
  });

  test('user completes checkout with single item', async ({ page }) => {
    await page.getByLabel('Full name').fill('Asha Patel');
    await page.getByLabel('Email').fill('asha@example.com');
    await page.getByLabel('Address').fill('221B Baker Street');

    const responsePromise = page.waitForResponse('**/api/orders');
    await page.getByRole('button', { name: 'Place order' }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(201);

    await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
  });
});
\`\`\`

Every flakiness lever is in use: parallel isolation, reduced motion, third-party blocking, accessible locators, explicit response wait, and auto-waiting assertion.

## Measuring flakiness

Track flakiness as a metric. The HTML report shows flaky tests separately. Sum them per CI run; alert when the rolling average exceeds 1 percent.

\`\`\`typescript
class FlakeReporter {
  onTestEnd(test, result) {
    if (result.status === 'passed' && result.retry > 0) {
      // emit metric: flaky=1
    }
  }
}
\`\`\`

Pair with a Slack alert on weekly rollup so flakiness gets visibility before it becomes systemic.

## Conclusion and next steps

Flakiness is solvable. Auto-waiting, accessible locators, mocked third parties, reduced motion, and per-worker isolation cover ninety-nine percent of sources. Retries belong only to the genuinely random one percent.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate flake-resistant tests. For parallel reliability, [Playwright Parallel Sharding Execution Guide](/blog/playwright-parallel-sharding-execution-guide). For the broader test reliability strategy, [Fix Flaky Tests Guide](/blog/fix-flaky-tests-guide).
`,
};
