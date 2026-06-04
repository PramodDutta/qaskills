import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright + Allure: Attach Traces, Screenshots & Videos',
  description:
    'Attach Playwright traces, screenshots, and videos to Allure reports. Configure allure-playwright, use allure.attachment, testInfo.outputPath, and CI artifacts.',
  date: '2026-06-04',
  category: 'Reference',
  content: `
# Playwright + Allure: Attach Traces & Screenshots

A failing test that just says "expected true, got false" wastes everyone's time. A failing test that hands you a screenshot of the broken page, a video of the steps that led there, and a Playwright trace you can step through frame by frame turns a thirty-minute investigation into a two-minute fix. Allure is the reporting layer that makes those artifacts first-class: it renders a beautiful, navigable report where every test carries its screenshots, videos, traces, and custom attachments. Wiring Playwright's rich artifacts into Allure is the difference between a report you glance at and a report your whole team actually uses to debug.

This guide is a complete, runnable reference for attaching Playwright artifacts to Allure reports using the \`allure-playwright\` reporter. We will install and configure the reporter, set Playwright to capture traces, screenshots, and video on failure, then attach each one to Allure -- both automatically and manually via the \`allure.attachment()\` API. We will cover \`testInfo.attachments\`, locating the trace zip with \`testInfo.outputPath('trace.zip')\`, attaching arbitrary buffers (JSON payloads, logs), organizing the report with \`allure.step\`, \`epic\`, \`feature\`, and \`severity\`, and finally generating and serving the HTML report -- including in CI. Every snippet is TypeScript and runs against a real \`@playwright/test\` install. If you want this wired up out of the box, the [playwright-reporting skill](/skills) on QASkills ships a configured Allure setup. Let's start with installation.

## Installing allure-playwright

You need two packages: the \`allure-playwright\` reporter (which Playwright calls during the run to emit Allure result files) and the \`allure-commandline\` tool (which turns those result files into an HTML report).

\`\`\`bash
# The reporter Playwright uses to emit Allure results
npm install --save-dev allure-playwright

# The CLI that generates and serves the HTML report
npm install --save-dev allure-commandline
\`\`\`

Verify the CLI is reachable:

\`\`\`bash
npx allure --version
\`\`\`

The reporter writes raw result files (one JSON per test plus attachment files) into an \`allure-results\` directory during the test run. The \`allure\` CLI later reads that directory and builds the static HTML report. Keep those two phases separate in your head -- run produces results, CLI produces the report.

## Configuring the Reporter in playwright.config.ts

Add \`allure-playwright\` to the \`reporter\` array in your Playwright config. You almost always want it alongside the built-in \`list\` reporter so you still get console output. Critically, set \`use\` options so Playwright captures the artifacts worth attaching -- trace, screenshot, and video on failure:

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],
    ['allure-playwright', { resultsDir: 'allure-results' }],
  ],
  use: {
    // Capture a trace when a test retries after failing.
    trace: 'on-first-retry',
    // Keep a screenshot only when a test fails.
    screenshot: 'only-on-failure',
    // Record video and keep it only on failure.
    video: 'retain-on-failure',
  },
});
\`\`\`

These three \`use\` settings are the foundation. \`trace: 'on-first-retry'\` records a full trace the first time a test retries (cheap, because passing tests never retry). \`screenshot: 'only-on-failure'\` snapshots the page at the moment of failure. \`video: 'retain-on-failure'\` records every test but discards the video unless the test fails. With these set, \`allure-playwright\` automatically attaches the captured artifacts to the corresponding test in the report -- you get screenshots, videos, and traces with zero per-test code.

## Capture Policy Cheat Sheet

The capture modes trade artifact richness against speed and disk. The table below summarizes the options for each.

| Setting | Values | Recommended | Why |
|---|---|---|---|
| \`trace\` | off / on / retain-on-failure / on-first-retry | \`on-first-retry\` | Full trace only when needed; passing tests skip it |
| \`screenshot\` | off / on / only-on-failure | \`only-on-failure\` | A failure snapshot is invaluable, success ones are noise |
| \`video\` | off / on / retain-on-failure | \`retain-on-failure\` | Records all, keeps only failures to save disk |

Avoid \`trace: 'on'\` and \`video: 'on'\` in large suites -- they record for every test and balloon both runtime and storage. \`retain-on-failure\` and \`on-first-retry\` give you the artifacts exactly when they matter.

## Attaching Files Manually with allure.attachment

Automatic attachment covers the common cases, but often you want to attach something custom -- an API response, a generated CSV, a log file, or an extra screenshot at a specific moment. The \`allure\` object from \`allure-js-commons\` provides \`attachment(name, content, type)\`:

\`\`\`typescript
// tests/manual-attach.spec.ts
import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test('attach an API response to the report', async ({ request }) => {
  const res = await request.get('https://practice.qaskills.sh/api/products');
  expect(res.ok()).toBeTruthy();

  const body = await res.json();
  // Attach the JSON payload so reviewers see exactly what the API returned.
  await allure.attachment(
    'products-response.json',
    JSON.stringify(body, null, 2),
    'application/json',
  );

  expect(body.length).toBeGreaterThan(0);
});
\`\`\`

The third argument is the MIME type, which tells Allure how to render the attachment. \`application/json\` gets syntax highlighting, \`text/plain\` renders as text, \`image/png\` shows inline, \`text/html\` renders the markup. This makes custom debugging context part of the permanent report instead of buried in console logs.

## Attaching a Screenshot at an Arbitrary Step

Sometimes the failure screenshot is not enough -- you want a snapshot at a specific intermediate state. Take a screenshot into a buffer and attach it:

\`\`\`typescript
// tests/step-screenshot.spec.ts
import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';

test('snapshot the cart before checkout', async ({ page }) => {
  await page.goto('https://practice.qaskills.sh/cart');
  await page.getByRole('button', { name: 'Add to cart' }).click();

  // Capture the current page as a PNG buffer and attach it.
  const shot = await page.screenshot();
  await allure.attachment('cart-state.png', shot, 'image/png');

  await page.getByRole('link', { name: 'Checkout' }).click();
});
\`\`\`

Because \`page.screenshot()\` returns a \`Buffer\`, you pass it straight to \`allure.attachment\` with the \`image/png\` type and it renders inline in the report. This is perfect for documenting the state of a flow at a checkpoint you care about.

## Working with testInfo.attachments and the Trace Path

Playwright exposes everything it captured for a test on the \`testInfo\` object inside the test body, and via \`testInfo\` in fixtures and hooks. The \`testInfo.attachments\` array holds each captured artifact (screenshots, video, trace) with its name, path, and content type. You can also compute the on-disk path for an output file with \`testInfo.outputPath()\`:

\`\`\`typescript
// tests/testinfo-attach.spec.ts
import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import * as fs from 'node:fs';

test('inspect and re-attach artifacts', async ({ page }, testInfo) => {
  await page.goto('https://practice.qaskills.sh');

  // Resolve a path inside this test's output directory.
  const tracePath = testInfo.outputPath('trace.zip');

  // Log every artifact Playwright captured for this test.
  for (const attachment of testInfo.attachments) {
    console.log(\`captured: \${attachment.name} -> \${attachment.path} (\${attachment.contentType})\`);
  }

  // Example: write a custom log file into the output dir, then attach it.
  const logPath = testInfo.outputPath('debug.log');
  fs.writeFileSync(logPath, 'custom diagnostic output\\n');
  await allure.attachment('debug.log', fs.readFileSync(logPath), 'text/plain');
});
\`\`\`

The \`testInfo.outputPath('trace.zip')\` call is the canonical way to reference the trace artifact location for a test. When Playwright records a trace per your \`trace\` setting, it lands in this output directory, and \`allure-playwright\` attaches it automatically so it shows up in the report as a downloadable trace you open with \`npx playwright show-trace\`.

## Attaching a Trace Explicitly in a Fixture

If you want guaranteed control over trace attachment -- for example, always attaching the trace regardless of pass/fail -- use a fixture that starts tracing, stops it to a known path, and attaches it. This pattern is useful when the automatic policy does not fit your needs:

\`\`\`typescript
// tests/trace-fixture.spec.ts
import { test as base } from '@playwright/test';
import * as allure from 'allure-js-commons';
import * as fs from 'node:fs';

const test = base.extend({
  page: async ({ page, context }, use, testInfo) => {
    // Start a trace with screenshots, snapshots, and sources.
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    await use(page);

    // Stop tracing into this test's output directory.
    const tracePath = testInfo.outputPath('trace.zip');
    await context.tracing.stop({ path: tracePath });

    // Attach the trace zip to the Allure report.
    await allure.attachment('trace.zip', fs.readFileSync(tracePath), 'application/zip');
  },
});

test('records and attaches a trace explicitly', async ({ page }) => {
  await page.goto('https://practice.qaskills.sh/login');
  await page.getByLabel('Email').fill('qa.user@example.com');
  await page.getByRole('button', { name: 'Sign in' }).click();
});
\`\`\`

Here \`testInfo.outputPath('trace.zip')\` gives the destination, \`context.tracing.stop({ path })\` writes the zip, and \`allure.attachment\` with \`application/zip\` embeds it as a downloadable trace in the report.

## Organizing the Report: Steps, Epics, and Severity

A pile of attachments is only useful if the report is navigable. Allure's metadata API turns a flat test list into a structured report. Use \`allure.step\` to group actions (each step can carry its own attachments), and \`epic\`/\`feature\`/\`story\`/\`severity\` to categorize and prioritize:

\`\`\`typescript
// tests/structured.spec.ts
import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test('checkout flow is well structured in the report', async ({ page }) => {
  await allure.epic('E-commerce');
  await allure.feature('Checkout');
  await allure.story('Guest checkout');
  await allure.severity('critical');

  await allure.step('Open the cart', async () => {
    await page.goto('https://practice.qaskills.sh/cart');
    await expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();
  });

  await allure.step('Proceed to checkout', async () => {
    await page.getByRole('link', { name: 'Checkout' }).click();
    await expect(page).toHaveURL(/.*checkout/);
  });
});
\`\`\`

Steps appear as a collapsible tree in the report, and \`epic\`/\`feature\`/\`story\` build Allure's "Behaviors" view so stakeholders can browse results by product area. \`severity\` lets you filter to just the critical failures during triage.

## Allure Metadata Quick Reference

| API call | Effect in the report |
|---|---|
| \`allure.epic(name)\` | Top-level grouping in the Behaviors view |
| \`allure.feature(name)\` | Mid-level grouping under an epic |
| \`allure.story(name)\` | Leaf grouping under a feature |
| \`allure.severity(level)\` | Tags test as blocker/critical/normal/minor/trivial |
| \`allure.step(name, fn)\` | Collapsible step node; can hold attachments |
| \`allure.attachment(name, content, type)\` | Embeds a file/buffer with a MIME type |
| \`allure.label(name, value)\` | Arbitrary custom label for filtering |

## Adding Environment, Categories, and History

A great Allure report carries context beyond individual tests. Three features elevate it from a test list to a proper dashboard: an environment block, failure categories, and trend history.

The **environment** widget shows the conditions a run executed under -- browser, base URL, app version. Allure reads it from an \`environment.properties\` file placed in \`allure-results\` before generation:

\`\`\`bash
# Write run context so it shows in the report's Environment widget
cat > allure-results/environment.properties <<'EOF'
Browser=Chromium
Base.URL=https://practice.qaskills.sh
App.Version=2026.6.0
CI=GitHub Actions
EOF
\`\`\`

**Categories** classify failures into buckets -- product defects versus infrastructure flakiness -- so triage is faster. Drop a \`categories.json\` into \`allure-results\`:

\`\`\`json
[
  {
    "name": "Product defects",
    "matchedStatuses": ["failed"]
  },
  {
    "name": "Infrastructure / flaky",
    "matchedStatuses": ["broken"],
    "messageRegex": ".*(timeout|ECONNREFUSED|net::ERR).*"
  }
]
\`\`\`

**History and trends** require carrying the \`history\` subfolder from the previous report into the next \`allure-results\` before generating, so Allure can draw pass-rate and duration trend lines. In CI you persist \`allure-report/history\` between runs (via cache or a results branch) and copy it back. With these three additions, the report tells a team not just what failed, but under what conditions, in which category, and whether things are trending better or worse.

## Generating and Serving the Report

After a test run populates \`allure-results\`, turn it into HTML. Two commands cover local use:

\`\`\`bash
# Run the tests (this writes raw results into allure-results/)
npx playwright test

# Generate static HTML into allure-report/ and open it
npx allure generate allure-results --clean -o allure-report
npx allure open allure-report

# Or, for quick local viewing, generate-and-serve in one step
npx allure serve allure-results
\`\`\`

\`allure serve\` spins up a temporary local web server and opens the report immediately -- ideal for a fast look after a run. \`allure generate\` produces a persistent static \`allure-report/\` directory you can publish anywhere.

## Generating the Report in CI

In CI, the pattern is: run tests (capturing results), then generate the static report, then upload it as a build artifact. Here is a complete GitHub Actions job:

\`\`\`yaml
# .github/workflows/e2e.yml
name: E2E with Allure
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium

      # Run tests; allure-results/ is written even if tests fail.
      - run: npx playwright test
        continue-on-error: true

      # Build the static report from the raw results.
      - run: npx allure generate allure-results --clean -o allure-report

      # Publish the report as a downloadable artifact.
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: allure-report
          path: allure-report
          retention-days: 14
\`\`\`

The key details: \`continue-on-error: true\` (or a later step guarded by \`if: always()\`) ensures the report is generated and uploaded even when tests fail -- which is exactly when you need the screenshots, videos, and traces. Reviewers download the \`allure-report\` artifact and open \`index.html\` to see every failing test with its full evidence attached.

## Attaching Network Logs and Console Output

Beyond the built-in artifacts, the two pieces of context most useful for debugging a failed UI test are the network activity and the browser console. Neither is attached by default, but both are easy to capture and attach. Listen for console messages and failed requests during the test, accumulate them, and attach the collected log when the test ends:

\`\`\`typescript
// tests/network-console.spec.ts
import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test('capture console and network for debugging', async ({ page }) => {
  const consoleLines: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', (msg) => consoleLines.push(\`[\${msg.type()}] \${msg.text()}\`));
  page.on('requestfailed', (req) =>
    failedRequests.push(\`\${req.method()} \${req.url()} -> \${req.failure()?.errorText}\`),
  );

  await page.goto('https://practice.qaskills.sh/products');
  await page.getByRole('button', { name: 'Add to cart' }).click();

  // Attach whatever we collected so it lives in the report.
  await allure.attachment('console.log', consoleLines.join('\\n'), 'text/plain');
  if (failedRequests.length) {
    await allure.attachment('failed-requests.log', failedRequests.join('\\n'), 'text/plain');
  }

  await expect(page.getByTestId('cart-count')).toHaveText('1');
});
\`\`\`

Wrapping this listener-and-attach pattern in a fixture makes it automatic for every test, so a JavaScript error in the console or a 404 on a critical asset shows up in the report alongside the failure instead of being invisible. This is often the fastest way to diagnose failures caused by a broken API call or an uncaught front-end exception that does not produce an obvious visual symptom.

## Attaching to Specific Steps for Pinpoint Debugging

Attachments made inside an \`allure.step\` block are nested under that step in the report rather than dumped at the test level. This is powerful for multi-stage flows: the reviewer expands the failing step and finds exactly the screenshot or payload relevant to it, instead of scrolling a flat list of attachments. Combine steps with per-step attachments for the most navigable reports:

\`\`\`typescript
// tests/step-scoped-attachments.spec.ts
import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test('attachments nested under their step', async ({ page, request }) => {
  await allure.step('Load product list', async () => {
    const res = await request.get('https://practice.qaskills.sh/api/products');
    // This JSON is attached *inside* this step in the report.
    await allure.attachment('products.json', await res.text(), 'application/json');
    await page.goto('https://practice.qaskills.sh/products');
    await expect(page.getByRole('listitem').first()).toBeVisible();
  });

  await allure.step('Add first item to cart', async () => {
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    // A screenshot scoped to this step only.
    await allure.attachment('after-add.png', await page.screenshot(), 'image/png');
    await expect(page.getByTestId('cart-count')).toHaveText('1');
  });
});
\`\`\`

The result is a report where each step carries its own evidence. When step two fails, the reviewer opens it and immediately sees the post-add screenshot and the data that step worked with, without hunting. This step-scoped organization scales beautifully to long end-to-end journeys where a flat attachment list would be unusable.

## Frequently Asked Questions

### How do I attach a Playwright trace to an Allure report?

The easiest way is to set \`trace: 'on-first-retry'\` (or \`retain-on-failure\`) in your \`playwright.config.ts\` \`use\` block -- \`allure-playwright\` then attaches the captured trace zip automatically. For explicit control, stop tracing to \`testInfo.outputPath('trace.zip')\` in a fixture and call \`allure.attachment('trace.zip', fs.readFileSync(path), 'application/zip')\`. Either way, the trace appears in the report and opens with \`npx playwright show-trace\`.

### What does testInfo.outputPath('trace.zip') return?

It returns the absolute path to a file named \`trace.zip\` inside the current test's dedicated output directory. Playwright gives each test an isolated output folder, and \`outputPath()\` resolves file names against it so artifacts never collide between tests or workers. When Playwright records a trace per your config, it writes to this location, which is why \`outputPath('trace.zip')\` is the canonical way to reference and attach the trace.

### How do I attach a custom screenshot at a specific step?

Call \`page.screenshot()\`, which returns a PNG \`Buffer\`, then pass it to \`allure.attachment('name.png', buffer, 'image/png')\`. Because the MIME type is \`image/png\`, Allure renders it inline in the report. This lets you capture and document an intermediate state -- like the cart before checkout -- rather than relying solely on the automatic failure screenshot, which only fires at the moment a test fails.

### Why are my videos and traces not showing up in the report?

Almost always because the capture policy is off or too restrictive. Confirm your \`use\` block sets \`video: 'retain-on-failure'\`, \`screenshot: 'only-on-failure'\`, and \`trace: 'on-first-retry'\` (or \`on\`). If tests pass, \`retain-on-failure\` and \`on-first-retry\` intentionally produce nothing. Also verify \`allure-playwright\` is in your \`reporter\` array and that \`allure-results\` actually contains files after the run before generating the report.

### What is the difference between allure generate and allure serve?

\`allure generate allure-results -o allure-report\` builds a persistent static HTML site into \`allure-report/\` that you can publish or upload as a CI artifact. \`allure serve allure-results\` builds the same report into a temporary directory, starts a local web server, and opens it immediately -- ideal for a quick local look but not persisted. Use \`serve\` while developing locally and \`generate\` plus an artifact upload in CI.

### How do I organize tests by feature in the Allure report?

Use the metadata API at the top of each test: \`allure.epic('E-commerce')\`, \`allure.feature('Checkout')\`, and \`allure.story('Guest checkout')\`. These build Allure's "Behaviors" view, a browsable tree grouping results by product area so non-engineers can navigate the report. Add \`allure.severity('critical')\` to tag importance, letting you filter to just the high-priority failures during triage. Wrap actions in \`allure.step()\` for a collapsible step tree.

### Can I attach JSON or log files, not just images?

Yes. \`allure.attachment(name, content, type)\` accepts any string or buffer plus a MIME type that controls rendering. Use \`application/json\` for API payloads (gets syntax highlighting), \`text/plain\` for logs, \`text/html\` for rendered markup, \`application/zip\` for traces, and \`image/png\` for screenshots. This turns ad-hoc debugging context -- the exact response body, a generated CSV, a diagnostic log -- into permanent, reviewable evidence inside the report.

### How do I make the report generate in CI even when tests fail?

Generate and upload the report in steps guarded so they always run. Mark the test step \`continue-on-error: true\`, or place the \`allure generate\` and \`actions/upload-artifact\` steps with \`if: always()\`. This matters because a failed run is exactly when you need the attached screenshots, videos, and traces. The result is a downloadable \`allure-report\` artifact on every build, regardless of pass or fail, that reviewers open to debug.

## Conclusion

Allure transforms Playwright's artifacts into a report your team will actually use. The foundation is three lines of config -- \`trace: 'on-first-retry'\`, \`screenshot: 'only-on-failure'\`, \`video: 'retain-on-failure'\` -- which let \`allure-playwright\` attach screenshots, videos, and traces automatically. Layer on \`allure.attachment()\` for custom JSON, logs, and step screenshots, use \`testInfo.outputPath('trace.zip')\` to locate and attach traces explicitly, and structure everything with \`allure.step\`, \`epic\`, \`feature\`, and \`severity\`. Generate the report with \`allure generate\`, serve it locally with \`allure serve\`, and upload it as a CI artifact guarded by \`if: always()\` so it survives failures.

Start with the config-level capture policy today -- it gives you rich failure evidence for free. For a fully wired Allure setup plus the broader QA toolkit, grab the [playwright-reporting skill](/skills) from QASkills, browse the full [skills catalog](/skills), or read more reporting deep-dives on the [QASkills blog](/blog).
`,
};
