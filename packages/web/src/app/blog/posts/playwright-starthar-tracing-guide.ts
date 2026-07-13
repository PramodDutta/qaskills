import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright startHar() and Network Tracing: The Complete HAR Guide',
  description:
    'Record, replay, and mock network traffic in Playwright with tracing.startHar(), routeFromHAR, and recordHar. Build deterministic tests, update HAR files, and debug in CI.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Playwright startHar() and Network Tracing: The Complete HAR Guide

Flaky tests almost always trace back to the network. A third-party API times out, a staging backend returns different data on Tuesday, a rate limit kicks in mid-run, and suddenly a test that "worked yesterday" is red. HAR (HTTP Archive) files solve this by letting you record every request and response once, then replay that exact traffic on every future run. Your tests become deterministic, fast, and independent of any live backend.

Playwright 1.60 refined network tracing with \`tracing.startHar()\`, which sits alongside the long-standing \`routeFromHAR()\` replay API and the \`recordHar\` context option. Together they give you a full record-and-replay loop: capture real traffic into a HAR, replay it deterministically, mock or patch individual endpoints, refresh the HAR when the API changes, and combine everything with the Trace Viewer for debugging. This guide covers the whole workflow with runnable TypeScript. For the broader 1.60 picture, see our roundup of [what's new in Playwright 2026](/blog/whats-new-playwright-2026).

## What a HAR file actually is

A HAR file is a JSON document following the HTTP Archive format. It contains an array of entries, one per request, and each entry records the request method, URL, headers, and body, plus the response status, headers, and content. Browsers have exported HAR from their network panels for years; Playwright both writes and reads the same format, which means a HAR you capture in Chrome DevTools can be replayed in a Playwright test and vice versa.

The key properties for testing are:

- **Determinism.** Replay serves the recorded response every time, so your assertions never depend on live data drifting.
- **Speed.** No real network round trips means tests run faster and work offline.
- **Isolation.** You test your frontend against a frozen backend contract, so a backend outage cannot fail your UI suite.

The tradeoff is staleness: a recorded HAR captures the API as it was at record time, so you must refresh it when the contract changes. Managing that refresh cycle is most of the discipline in HAR-based testing, and we cover it below.

It helps to think of a HAR as a snapshot with a contract attached. The moment you commit a HAR, you are asserting that "this is how the backend behaves for this flow." That assertion is only as trustworthy as your refresh discipline. Teams that treat HARs as write-once-and-forget end up testing against a backend that no longer exists, which is worse than no test at all because it passes green while masking real regressions. Teams that refresh on a cadence and review every HAR diff get the full benefit: fast, deterministic tests that still track the real contract. The tooling in Playwright is designed to make that refresh cheap, which is the whole point of the \`update\` flag you will see throughout this guide.

There is also a privacy dimension worth flagging early. Because a full HAR captures request and response bodies, it can accidentally record auth tokens, session cookies, personal data, or API keys. Before committing any HAR to a shared repository, scan it for secrets, scope the recording with \`urlFilter\` so it never captures auth endpoints, and consider \`content: 'attach'\` so bodies are reviewable in code review rather than buried in base64. Treat a HAR with the same care you would give any fixture that touched production traffic.

## Recording a HAR with recordHar

The simplest way to capture traffic is the \`recordHar\` option on the browser context. Everything the context requests during the test is written to the HAR file when the context closes.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('capture traffic into a HAR file', async ({ browser }) => {
  const context = await browser.newContext({
    recordHar: {
      path: 'tests/har/dashboard.har',
      mode: 'full',
      content: 'embed',
    },
  });

  const page = await context.newPage();
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Load report' }).click();
  await expect(page.getByTestId('report-table')).toBeVisible();

  // Closing the context flushes the HAR to disk.
  await context.close();
});
\`\`\`

The two options that matter most are \`mode\` and \`content\`. \`mode: 'full'\` records complete request and response bodies, which is what you want for replay. \`mode: 'minimal'\` records only what is needed to route requests and skips things like timing and headers you rarely assert on, producing a smaller file. \`content: 'embed'\` inlines response bodies as base64 inside the HAR, keeping everything in one portable file; \`content: 'attach'\` writes bodies as separate sidecar files next to the HAR, which keeps the JSON readable and diffable in code review.

## Recording with tracing.startHar

Playwright 1.60's \`tracing.startHar()\` gives you finer control over when recording starts and stops, so you can capture only a specific slice of a test rather than the whole context lifetime. This is ideal when the interesting traffic happens after a login flow you do not want in the HAR.

\`\`\`ts
test('record only the reporting flow with startHar', async ({ page, context }) => {
  await page.goto('/dashboard');
  // Log in first; we do not want auth traffic in the HAR.
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Start capturing only the traffic we care about.
  await context.tracing.startHar({ path: 'tests/har/reporting.har', mode: 'full' });

  await page.getByRole('button', { name: 'Generate report' }).click();
  await expect(page.getByTestId('report-ready')).toBeVisible();

  await context.tracing.stopHar();
});
\`\`\`

Scoping the recording keeps HAR files small and focused, which makes them faster to replay and far easier to review. A 30-entry HAR that covers one feature is a better test asset than a 400-entry HAR that captured every analytics beacon and font request on the page.

## HAR options reference

Here is the full set of options you will reach for when recording, whether through \`recordHar\` or \`startHar\`.

| Option | Values | Purpose |
| --- | --- | --- |
| \`path\` | file path | Where the HAR is written |
| \`mode\` | \`full\` / \`minimal\` | Full bodies and timing, or route-only minimal data |
| \`content\` | \`embed\` / \`attach\` / \`omit\` | Inline bodies, sidecar files, or drop bodies entirely |
| \`urlFilter\` | glob or regex | Record only matching URLs |
| \`update\` | boolean | Refresh an existing HAR from live traffic on this run |

The \`urlFilter\` option is underused and powerful. Set it to a glob like \`**/api/**\` and the HAR captures only your own API calls, excluding third-party scripts, fonts, and telemetry. That single filter often shrinks a HAR by an order of magnitude and removes the noisiest sources of churn from your diffs.

## Replaying network from a HAR

Recording is half the loop. The other half is \`routeFromHAR()\`, which intercepts requests and serves the recorded responses instead of hitting the network. This is what makes tests deterministic.

\`\`\`ts
test('replay recorded traffic deterministically', async ({ page }) => {
  // Serve every matching request from the HAR instead of the network.
  await page.routeFromHAR('tests/har/reporting.har', {
    url: '**/api/**',
    update: false,
  });

  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Generate report' }).click();

  // The response is frozen, so this assertion is stable forever.
  await expect(page.getByTestId('report-total')).toHaveText('42 items');
});
\`\`\`

The \`url\` glob restricts replay to your API calls so that assets not in the HAR still load normally from the live server or cache. The \`update: false\` flag is the replay mode: serve from the HAR, do not touch the network. Flip it to \`true\` and you enter record-refresh mode, covered next.

Matching is the part people trip on. When a request comes in, Playwright looks for a HAR entry with the same method and URL, and by default it matches on the full URL including query string. If your app appends a cache-busting timestamp or a changing token to the query string, the recorded entry will not match and the request falls through. You have two options: record with \`mode: 'minimal'\` and rely on the URL glob to keep matching loose, or normalize the volatile query parameters in the app during tests. Understanding how matching works turns most "why is this returning a 404" mysteries into a five-second fix, because you can look at the HAR entry's exact URL and compare it to what the app actually requested in the Trace Viewer's Network tab.

Replay also respects request order loosely. If your flow calls the same endpoint twice and the HAR recorded two different responses, Playwright serves them in the order they appear. This matters for paginated APIs and polling: record the full sequence you expect the test to drive, and the replay reproduces that same progression deterministically. If your test drives a different number of calls than the recording captured, you will run out of entries and later requests will fail to match, which is another reason to keep recordings scoped tightly to the exact flow under test.

## Record versus replay modes

The single \`update\` flag switches \`routeFromHAR\` between the two modes that define the whole workflow. Understanding this table is the core of HAR-based testing.

| Behavior | Replay mode (\`update: false\`) | Record mode (\`update: true\`) |
| --- | --- | --- |
| Network access | None, served from HAR | Live requests made |
| HAR file | Read only | Rewritten with fresh responses |
| Determinism | Fully deterministic | Reflects live backend |
| When to use | CI, day-to-day runs | Refreshing after an API change |
| Missing entry behavior | Request aborts or 404s | New entry recorded |

The discipline is simple: run in replay mode almost always, and switch to update mode deliberately, review the resulting HAR diff, and commit it. Never leave \`update: true\` on in CI, because that reintroduces the live-backend dependency the HAR was meant to remove.

## Mocking specific APIs on top of a HAR

Often you want most traffic replayed from the HAR but a single endpoint overridden, for example to test an error state the recording never captured. Register a specific \`route\` handler before \`routeFromHAR\` and it takes precedence, because Playwright matches routes in reverse registration order.

\`\`\`ts
test('replay from HAR but force one endpoint to error', async ({ page }) => {
  // Override the totals endpoint with a 500 to test the error UI.
  await page.route('**/api/report/total', (route) => {
    route.fulfill({ status: 500, body: 'Internal Server Error' });
  });

  // Everything else replays from the HAR.
  await page.routeFromHAR('tests/har/reporting.har', { url: '**/api/**' });

  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Generate report' }).click();

  await expect(page.getByRole('alert')).toContainText('Could not load totals');
});
\`\`\`

This layering (HAR for the happy path, targeted \`route\` handlers for edge cases) gives you the best of both worlds: realistic baseline traffic plus surgical control over the exact response you want to test. If you build API-first tests, our [MCP server testing guide](/blog/mcp-server-testing-guide-2026) covers similar interception patterns for agent-driven flows.

## Updating a HAR when the API changes

The moment your backend contract changes, the HAR is stale and tests may assert against old data. Refreshing is a two-step ritual. First, run the test against the live backend with update mode on so Playwright rewrites the HAR with current responses.

\`\`\`ts
test('refresh the HAR against the live backend', async ({ page }) => {
  await page.routeFromHAR('tests/har/reporting.har', {
    url: '**/api/**',
    update: true, // live requests, HAR rewritten
  });

  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Generate report' }).click();
  await expect(page.getByTestId('report-ready')).toBeVisible();
});
\`\`\`

Second, review the diff. If you recorded with \`content: 'attach'\`, the sidecar files and the HAR JSON both show up in \`git diff\` and you can read exactly which responses changed. Update any assertions that depended on the old values, then flip \`update\` back to \`false\` and commit both the refreshed HAR and the adjusted test in one changeset. Treat the HAR like a snapshot fixture: it lives in version control, and every change to it is a reviewable event.

## Combining HAR with the Trace Viewer

HAR replay and the Trace Viewer are complementary. HAR controls the network; the trace records what actually happened so you can debug failures after the fact. Enable tracing in your config and open the resulting \`.zip\` in the viewer to inspect every request, DOM snapshot, and console message alongside the replayed responses.

\`\`\`ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    trace: 'retain-on-failure', // capture a full trace only when a test fails
  },
});
\`\`\`

\`\`\`bash
# Open a failed run's trace to see replayed requests, DOM, and console together.
npx playwright show-trace test-results/reporting-chromium/trace.zip
\`\`\`

In the viewer's Network tab you can confirm that a request was served from the HAR rather than the live backend, which is the fastest way to diagnose a "why did this return stale data" question. Pairing a deterministic HAR with an on-failure trace means every red run in CI comes with a complete, replayable record of what the network did. For assertion strategies that survive backend changes, our [ARIA snapshot testing guide](/blog/playwright-aria-snapshot-testing-guide) is a good companion.

The two features answer different questions and that is exactly why using them together is powerful. The HAR answers "what should the backend have returned," and the trace answers "what did the browser and my code actually do with it." When a test fails, you open the trace, step to the failing action, and look at the Network tab to see whether the replayed response matched your expectation. If the response is correct but the assertion still failed, the bug is in your frontend logic or your selector, not the network, and you have just saved yourself an hour of chasing the wrong layer. If the response is wrong or missing, the HAR is stale or a match failed, and you refresh. This clean separation of concerns is the single biggest workflow win of combining the two.

## Using HAR files in CI

HAR-based tests shine in CI because they need no backend, no seeded database, and no network egress. Commit the HAR files to the repository, run in replay mode, and the pipeline is fully hermetic. A few practices keep it clean:

- **Commit HARs as fixtures.** Store them under a \`tests/har/\` directory and treat changes as reviewable, exactly like snapshot files.
- **Prefer \`content: 'attach'\` for reviewability.** Sidecar body files diff cleanly, so reviewers see what response text changed rather than a wall of base64.
- **Filter aggressively with \`urlFilter\`.** Record only \`**/api/**\` so third-party churn never touches your fixtures.
- **Refresh on a schedule, not per run.** Run a periodic job in update mode against staging, open a pull request with the HAR diff, and let a human approve the contract change.
- **Never enable update mode in the main CI job.** That reintroduces the flakiness HAR was meant to remove.

You can find ready-made Playwright network-mocking and HAR skills in the [QA skills catalog](/skills) to drop these patterns into your project quickly instead of wiring the whole loop by hand.

## A complete record-then-replay example

Here is the full loop in one place: a helper that records on first run when the HAR is absent and replays on every run after.

\`\`\`ts
import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const HAR_PATH = 'tests/har/checkout.har';

test('checkout replays from HAR, recording it if missing', async ({ page }) => {
  const harExists = fs.existsSync(HAR_PATH);

  await page.routeFromHAR(HAR_PATH, {
    url: '**/api/**',
    update: !harExists, // record the first time, replay after
  });

  await page.goto('/checkout');
  await page.getByLabel('Card number').fill('4242 4242 4242 4242');
  await page.getByRole('button', { name: 'Pay now' }).click();

  await expect(page.getByTestId('order-confirmation')).toBeVisible();
});
\`\`\`

This self-seeding pattern is convenient for local development, but in CI you should commit the HAR and force \`update: false\` so no run ever silently depends on the live backend. Keep the seeding behavior for the developer inner loop, and lock replay mode in the pipeline.

## Frequently Asked Questions

### What is the difference between recordHar and tracing.startHar?

\`recordHar\` is a context option that records all traffic for the entire lifetime of the browser context, flushing to disk when the context closes. \`tracing.startHar()\` lets you start and stop recording at precise points inside a test, so you capture only a chosen slice such as one feature flow. Use \`recordHar\` for whole-session capture and \`startHar\` when you want to exclude setup traffic like login from the HAR.

### How do I make Playwright tests deterministic with a HAR file?

Record real traffic once with \`recordHar\` or \`startHar\`, then replay it with \`page.routeFromHAR(path, { update: false })\`. In replay mode Playwright serves the recorded responses and never touches the network, so the same data returns on every run regardless of the backend's live state. Assert against those frozen responses and your tests stop flaking from timeouts, rate limits, or drifting data.

### When should I set update to true in routeFromHAR?

Only when you deliberately want to refresh the HAR against a live backend after an API contract changes. Update mode makes real requests and rewrites the HAR with fresh responses. Run it locally or in a scheduled job, review the resulting diff, adjust any affected assertions, then set \`update\` back to false and commit. Never leave update mode on in your main CI job because it reintroduces live-backend dependency.

### Can I mock a single endpoint while replaying everything else from a HAR?

Yes. Register a specific \`page.route\` handler for that endpoint before calling \`routeFromHAR\`. Playwright matches routes in reverse registration order, so your explicit handler wins for that URL and everything else falls through to the HAR. This is the standard way to test error states and edge cases the original recording never captured, while keeping the rest of the traffic realistic.

### Should I use embed or attach for HAR content?

Use \`embed\` when you want a single portable file, since response bodies are inlined as base64 inside the HAR JSON. Use \`attach\` when the HAR lives in version control and you want readable diffs, because bodies are written as separate sidecar files that reviewers can inspect directly. For CI fixtures that get code-reviewed, \`attach\` is usually the better choice despite creating more files.

### How do HAR files work with the Playwright Trace Viewer?

They are complementary. The HAR controls what the network returns, while the trace records what actually happened during the run. Enable \`trace: 'retain-on-failure'\` in your config, and when a test fails open the trace zip with \`npx playwright show-trace\`. The Network tab shows every request and whether it was served from the HAR, so you can confirm replay worked and debug stale-data issues quickly.

### Why does my replayed request return a 404 or abort?

Because the request did not match any entry in the HAR. This happens when the app makes a call that was not captured, often because a \`urlFilter\` excluded it or the request URL changed. Re-record with update mode to add the missing entry, widen the \`url\` glob in \`routeFromHAR\`, or add a fallback \`route\` handler that fulfills the unmatched request explicitly so the test does not abort.
`,
};
