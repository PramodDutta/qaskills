import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Screenshots, Videos, Traces: Complete 2026 Guide',
  description: 'Configure Playwright screenshots, videos, and traces. Capture failures, attach to reports, debug from CI, and balance artifact storage in 2026.',
  date: '2026-05-11',
  category: 'Guide',
  content: `
# Playwright Screenshots, Videos, and Traces: Complete 2026 Guide

Playwright captures three kinds of artifacts: screenshots (single PNG images), videos (WebM recordings), and traces (zipped DOM snapshots, network logs, and console messages). Together they form the most complete record of any web test run. When a test fails in CI, the right combination of artifacts lets you reproduce, diagnose, and fix the issue without ever rerunning the test. When configured wrong, the same artifacts can fill your storage budget or slow runs to a crawl.

This guide is a complete reference for configuring and consuming the three artifact types in Playwright 1.49+. Every example is TypeScript, every option is in the latest API, and every pattern reflects what production teams ship today.

For broader CI patterns, see [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026). The [playwright-e2e skill](/skills/playwright-e2e) ensures AI assistants configure artifacts sensibly.

## The three artifact types

| Artifact | Format | Best for |
|---|---|---|
| Screenshot | PNG | Single-moment evidence |
| Video | WebM (VP9) | Replaying user flows |
| Trace | ZIP archive | Time-travel debugging |

Traces are the most powerful and the largest. Screenshots are smallest and fastest to inspect. Videos sit in between.

## Configuration in playwright.config.ts

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
});
\`\`\`

This is the recommended production setting: screenshots and videos only when needed, traces only on retry.

## Screenshot modes

| Mode | Purpose |
|---|---|
| \`off\` | No screenshots (default) |
| \`on\` | Screenshot after every test |
| \`only-on-failure\` | Screenshot when a test fails |

Per-test override:

\`\`\`typescript
test('captures screenshot manually', async ({ page }) => {
  await page.goto('/dashboard');
  await page.screenshot({ path: 'dashboard.png', fullPage: true });
});
\`\`\`

## Programmatic screenshots

\`\`\`typescript
// Full page
await page.screenshot({ path: 'full.png', fullPage: true });

// Element only
const card = page.getByRole('article');
await card.screenshot({ path: 'card.png' });

// With masks (hide dynamic regions)
await page.screenshot({
  path: 'home.png',
  mask: [page.getByText(/\\d+ minutes ago/)],
  maskColor: '#000',
});

// Specific area
await page.screenshot({
  path: 'hero.png',
  clip: { x: 0, y: 0, width: 1280, height: 600 },
});

// Without backgrounds (transparent)
await page.screenshot({
  path: 'card.png',
  omitBackground: true,
  type: 'png',
});

// JPEG with quality
await page.screenshot({
  path: 'page.jpg',
  type: 'jpeg',
  quality: 80,
});
\`\`\`

## Attaching screenshots to reports

\`\`\`typescript
test('attaches custom screenshot to report', async ({ page }, testInfo) => {
  await page.goto('/');
  const screenshot = await page.screenshot();
  await testInfo.attach('homepage-snapshot', {
    body: screenshot,
    contentType: 'image/png',
  });
});
\`\`\`

The HTML report shows the attachment inline; downstream services (Allure, Monocart) include it in the report tree.

## Video recording

\`\`\`typescript
use: {
  video: 'retain-on-failure',
  // or 'on' for every test
  // or 'on-first-retry'
}
\`\`\`

Videos are recorded at the test's viewport size by default. To override:

\`\`\`typescript
use: {
  video: {
    mode: 'retain-on-failure',
    size: { width: 1280, height: 720 },
  },
},
\`\`\`

Files end up at \`test-results/<test>/video.webm\` and embed in the HTML report. Chrome, VS Code, and most browsers decode VP9 natively.

## Trace recording

| Mode | Purpose |
|---|---|
| \`off\` | No traces (default) |
| \`on\` | Trace every test (expensive) |
| \`on-first-retry\` | Trace only on retry |
| \`on-all-retries\` | Trace on every retry attempt |
| \`retain-on-failure\` | Keep trace only if test fails |

For CI, \`on-first-retry\` is the sweet spot: zero overhead on passing tests, full record when something goes wrong.

## Opening traces

\`\`\`bash
# From local test run
npx playwright show-trace test-results/checkout-flow/trace.zip

# From CI artifact
npx playwright show-trace ./downloaded/trace.zip

# Or via UI Mode (loads traces from test-results automatically)
npx playwright test --ui
\`\`\`

The trace viewer opens a UI Mode-like window with timeline, action list, DOM snapshots, network, console, and source. Click any action to scrub the snapshot back to that moment.

## Manual trace control

For tests that span long-running flows, control trace start/stop manually.

\`\`\`typescript
test('manual trace block', async ({ page, context }) => {
  await context.tracing.start({ screenshots: true, snapshots: true });

  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Run report' }).click();
  await expect(page.getByRole('progressbar')).toBeVisible();

  await context.tracing.stop({ path: 'report-flow.zip' });
});
\`\`\`

\`screenshots: true\` captures a screenshot for every action; \`snapshots: true\` captures DOM snapshots. Both are heavy; toggle only when needed.

## Anatomy of a trace

A trace.zip contains:

| File | Purpose |
|---|---|
| \`trace.trace\` | Action list with timing |
| \`trace.network\` | All HTTP requests with bodies |
| \`*.dom\` | DOM snapshots |
| \`*.png\` | Screenshots per action |
| \`*.zip\` | Source map of every script the page loaded |

The viewer recombines them into a navigable timeline. Total size: roughly 100-500 KB per test for a typical flow.

## Reducing artifact storage

| Lever | Saving |
|---|---|
| \`video: 'retain-on-failure'\` | Cuts video volume by ~95% |
| \`screenshot: 'only-on-failure'\` | Cuts screenshot volume by ~95% |
| \`trace: 'on-first-retry'\` | Cuts trace volume by ~90% |
| Lower video resolution | ~50% file size |
| JPEG screenshots | ~40% size vs PNG |

For a 500-test suite running daily, the recommended config produces about 1-3 GB of artifacts per month, well within most CI plans.

## CI artifact upload

\`\`\`yaml
- uses: actions/upload-artifact@v4
  if: \${{ !cancelled() }}
  with:
    name: playwright-report
    path: playwright-report
    retention-days: 14

- uses: actions/upload-artifact@v4
  if: \${{ failure() }}
  with:
    name: playwright-traces
    path: test-results/**/trace.zip
    retention-days: 7

- uses: actions/upload-artifact@v4
  if: \${{ failure() }}
  with:
    name: playwright-videos
    path: test-results/**/video.webm
    retention-days: 7
\`\`\`

Separating uploads by failure status saves storage when most runs pass.

## Visual regression vs screenshots

\`screenshot: 'only-on-failure'\` captures evidence; \`expect(page).toHaveScreenshot('home.png')\` compares against a baseline. The two are distinct.

For visual regression, see [Playwright Visual Comparison Snapshots Guide](/blog/playwright-visual-comparison-snapshots-guide).

## Console and network in traces

Beyond DOM snapshots, traces also include:

| Tab | Content |
|---|---|
| Console | Every console message with timestamp |
| Network | Every HTTP request with method, status, headers, body |
| Errors | Diff of actual vs expected for failed assertions |
| Source | The test file with the failing line highlighted |

When debugging from a trace, the Console tab often shows the root cause (an XHR error, a CSP violation) before the Action tab shows the failed assertion.

## Trace size optimization

For very long tests, traces can grow to 50 MB. Reduce by:

1. Splitting long tests into smaller ones.
2. Calling \`context.tracing.stop()\` mid-test for a partial trace.
3. Setting \`tracing.start({ screenshots: false })\` to skip screenshots.
4. Setting \`tracing.start({ sources: false })\` to skip source maps.

## Common pitfalls

**Pitfall 1: Recording video for every test.** Disk usage compounds. Use \`retain-on-failure\`.

**Pitfall 2: Trace on every test in CI.** Slows runs and inflates artifacts. Use \`on-first-retry\`.

**Pitfall 3: Forgetting to upload artifacts.** A test failing in CI without artifacts is a test failing in the dark. Always upload on failure.

**Pitfall 4: Long retention periods.** 90 days of every PR run adds up. 7-14 days is sufficient for most teams.

**Pitfall 5: Reading screenshots without context.** A failing screenshot alone is rarely informative; pair with the trace.

## Anti-patterns

- Capturing manual screenshots in every test "just in case". Use \`only-on-failure\`.
- Storing artifacts in the repo. Use CI artifacts.
- Disabling traces because they "slow down CI". Set \`on-first-retry\`; passing runs are unaffected.
- Renaming trace.zip by hand. Let Playwright manage the paths.

## A complete artifacts strategy

\`\`\`typescript
export default defineConfig({
  outputDir: './test-results',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['blob'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    screenshot: 'only-on-failure',
    video: { mode: 'retain-on-failure', size: { width: 1280, height: 720 } },
    trace: 'on-first-retry',
  },
});
\`\`\`

Pair with the upload pattern above; you have a CI suite that produces zero artifacts on green runs and complete diagnostic packages on any failure.

## Conclusion and next steps

Screenshots, videos, and traces together turn Playwright into a full diagnostic system. Configure them to record only when useful, upload only when needed, and the cost is negligible. The dividend is shorter time-to-resolution on every failure.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants configure artifacts sensibly. For trace-driven debugging, [Playwright Debug Mode and Inspector Guide](/blog/playwright-debug-mode-inspector-guide). For visual regression specifically, [Playwright Visual Comparison Snapshots Guide](/blog/playwright-visual-comparison-snapshots-guide).
`,
};
