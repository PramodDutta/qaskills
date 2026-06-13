import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright trace.attach + Allure Export: Test Artifact Pipeline',
  description:
    'Complete guide to attaching Playwright traces to Allure reports: allure.attachment, testInfo.outputPath, allure-playwright config, screenshots, videos, and the full artifact pipeline.',
  date: '2026-06-08',
  category: 'Reference',
  content: `
# Playwright trace.attach + Allure Export: Test Artifact Pipeline

A Playwright test that fails in CI is a black box until you can replay it. The trace.zip file, the screenshot, the video, and the console log together let you reconstruct exactly what happened. Allure is the most widely used reporting framework that displays these artifacts in a polished, filterable UI - failed tests show their trace, screenshot, and video as inline attachments. The connection between Playwright and Allure is the \`allure-playwright\` reporter and the \`testInfo.attach\` / \`allure.attachment\` APIs that hand artifacts to Allure for display.

This guide is the complete reference for the Playwright-to-Allure artifact pipeline in 2026. We cover \`allure-playwright\` configuration, automatic trace attachment via \`trace: 'on-first-retry'\`, manual attachment with \`testInfo.attach\`, the \`testInfo.outputPath('trace.zip')\` pattern for explicit trace files, attaching screenshots and videos, custom attachments (logs, JSON dumps, network HAR files), and the CI workflow that publishes an Allure report. Every example is runnable Playwright TypeScript.

For the trace viewer itself, see [Playwright show-trace CLI Reference](/blog/playwright-show-trace-cli-reference) and [Playwright Test Trace Viewer 2026](/blog/playwright-test-trace-viewer-official-2026). For broader testing patterns, see [Playwright Best Practices 2026](/blog/playwright-best-practices-2026). The [playwright-e2e skill](/skills/playwright-e2e) configures the Allure pipeline for AI-generated tests.

## Setting up allure-playwright

Install the reporter:

\`\`\`bash
npm install -D allure-playwright allure-commandline
\`\`\`

Configure in \`playwright.config.ts\`:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['allure-playwright', {
      detail: true,
      suiteTitle: false,
      categories: [
        {
          name: 'Outdated tests',
          messageRegex: '.*FileNotFound.*',
        },
      ],
    }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
\`\`\`

Reporter options:

| Option | Type | Purpose |
|---|---|---|
| \`detail\` | boolean | Include detailed test info (default true) |
| \`suiteTitle\` | boolean | Use describe title as suite name |
| \`outputFolder\` | string | Where to write results (default \`allure-results\`) |
| \`environmentInfo\` | object | Static metadata for the report |
| \`categories\` | array | Failure categorization rules |
| \`links\` | object | Add issue/TMS link templates |

After a test run, the \`allure-results/\` directory contains JSON files and attachments. Generate the HTML report:

\`\`\`bash
allure generate allure-results --clean -o allure-report
allure open allure-report
\`\`\`

## Automatic trace attachment

The recommended setup attaches traces automatically. Set \`trace: 'on-first-retry'\` in config:

\`\`\`typescript
export default defineConfig({
  retries: 2,
  use: {
    trace: 'on-first-retry',
  },
  reporter: [['allure-playwright']],
});
\`\`\`

How it works:

1. Test fails on first attempt. No trace recorded.
2. Playwright retries the test. Trace recording is enabled.
3. If the retry also fails, the trace.zip is in \`test-results/<test-name>/trace.zip\`.
4. The Allure reporter detects the trace and attaches it to the result.

In the Allure report UI, the failed test shows a "Trace" attachment alongside the error message. Click it to download the trace.zip, then open with \`npx playwright show-trace\` or drop into trace.playwright.dev.

## Manual trace attachment with testInfo.outputPath

For tests that need explicit control over when traces are recorded:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('manual trace recording', async ({ page, context }, testInfo) => {
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' }).click();

  const tracePath = testInfo.outputPath('trace.zip');
  await context.tracing.stop({ path: tracePath });

  await testInfo.attach('trace', {
    path: tracePath,
    contentType: 'application/zip',
  });
});
\`\`\`

Key parts:

- \`testInfo.outputPath('trace.zip')\` returns the test's output directory plus the filename. Files there are preserved as test artifacts.
- \`context.tracing.stop({ path })\` writes the trace.zip.
- \`testInfo.attach\` attaches it to the report. The Allure reporter picks it up.

## allure.attachment API

For Allure-specific attachments (not just trace.zip), use \`allure.attachment\`:

\`\`\`typescript
import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test('with custom attachment', async ({ page }) => {
  await page.goto('/');
  const html = await page.content();
  await allure.attachment('page-html', html, 'text/html');

  const apiResponse = await page.request.get('/api/data');
  await allure.attachment('api-response', await apiResponse.text(), 'application/json');
});
\`\`\`

The first argument is the attachment name shown in Allure. The second is the content (string or Buffer). The third is the MIME type.

Common MIME types:

| Content | MIME type |
|---|---|
| HTML | \`text/html\` |
| JSON | \`application/json\` |
| Plain text | \`text/plain\` |
| PNG image | \`image/png\` |
| MP4 video | \`video/mp4\` |
| WebM video | \`video/webm\` |
| ZIP (traces) | \`application/zip\` |
| HAR file | \`application/har+json\` |

## Attaching screenshots

Screenshots are attached automatically when \`screenshot: 'only-on-failure'\` is set in config. For explicit attachments:

\`\`\`typescript
test('screenshot on demand', async ({ page }, testInfo) => {
  await page.goto('/');
  const buffer = await page.screenshot({ fullPage: true });
  await testInfo.attach('homepage-full', { body: buffer, contentType: 'image/png' });
});
\`\`\`

Or via Allure directly:

\`\`\`typescript
const buffer = await page.screenshot();
await allure.attachment('after-click', buffer, 'image/png');
\`\`\`

The Allure report shows screenshots inline, scaled to fit. Click to see full size.

## Attaching videos

Videos are attached automatically when \`video: 'retain-on-failure'\` is set. The Allure reporter finds the video file in \`test-results/<test-name>/video.webm\` and attaches it.

For explicit video attachment (rare):

\`\`\`typescript
const videoPath = await page.video()?.path();
if (videoPath) {
  await testInfo.attach('video', { path: videoPath, contentType: 'video/webm' });
}
\`\`\`

Allure renders videos with a player widget in the report UI.

## Attaching network HAR files

If your test records HAR (via \`recordHar\` in context options), attach the HAR to the report:

\`\`\`typescript
test.use({
  contextOptions: {
    recordHar: { path: 'test-results/network.har', mode: 'minimal' },
  },
});

test('with HAR attachment', async ({ page, context }, testInfo) => {
  await page.goto('/');
  // ... interactions ...
  await context.close(); // flushes HAR

  await testInfo.attach('network-har', {
    path: 'test-results/network.har',
    contentType: 'application/har+json',
  });
});
\`\`\`

For more on HAR recording, see [Playwright route.fulfill Network Mocking](/blog/playwright-route-fulfill-network-mocking-reference).

## Attachment matrix

| Artifact | How attached | When |
|---|---|---|
| Trace.zip | \`trace: 'on-first-retry'\` | Automatic on retry failure |
| Screenshot | \`screenshot: 'only-on-failure'\` | Automatic on failure |
| Video | \`video: 'retain-on-failure'\` | Automatic on failure |
| HAR | \`testInfo.attach\` after close | Manual |
| Custom JSON | \`allure.attachment\` | Manual |
| Custom log | \`testInfo.attach\` | Manual |

## Setting test metadata

Allure supports metadata that appears in the report UI. Use the \`allure\` API to set it:

\`\`\`typescript
import * as allure from 'allure-js-commons';

test('rich metadata example', async ({ page }) => {
  await allure.epic('Authentication');
  await allure.feature('Login');
  await allure.story('Email/password sign-in');
  await allure.severity('critical');
  await allure.owner('platform-team');
  await allure.tag('smoke');
  await allure.link('https://jira.example.com/TICKET-1234', 'JIRA TICKET-1234');
  await allure.issue('https://github.com/example/repo/issues/5678', 'BUG-5678');

  await page.goto('/login');
  // ... test body ...
});
\`\`\`

In the Allure UI, you can filter by feature, story, severity, tag, or owner. The links appear as clickable badges next to the test name.

## Step annotations

Group multiple Playwright actions into named steps that appear collapsibly in the Allure report:

\`\`\`typescript
import * as allure from 'allure-js-commons';

test('multi-step checkout', async ({ page }) => {
  await allure.step('Navigate to product', async () => {
    await page.goto('/products/headphones');
    await expect(page).toHaveTitle(/Headphones/);
  });

  await allure.step('Add to cart', async () => {
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await expect(page.getByText('Added to cart')).toBeVisible();
  });

  await allure.step('Proceed to checkout', async () => {
    await page.getByRole('link', { name: 'Checkout' }).click();
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByRole('button', { name: 'Place order' }).click();
  });
});
\`\`\`

In Allure each step is a collapsible section with its own duration. Step attachments (screenshots, traces taken inside a step) nest under that step.

## CI configuration

GitHub Actions example that runs Playwright, builds the Allure report, and uploads it as an artifact:

\`\`\`yaml
name: tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run tests
        run: npx playwright test
        continue-on-error: true

      - name: Install Allure
        run: npm install -g allure-commandline

      - name: Generate Allure report
        run: allure generate allure-results --clean -o allure-report

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: allure-report
          path: allure-report/

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-results
          path: test-results/
\`\`\`

When the workflow finishes, the \`allure-report\` artifact contains the full HTML report. Download and serve locally with \`allure open allure-report\`, or publish to GitHub Pages for shared access.

## Combining trace.attach with retries

The most robust pattern, useful for flaky third-party integrations:

\`\`\`typescript
import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';

test('flaky integration with rich diagnostics', async ({ page, context }, testInfo) => {
  await context.tracing.start({ screenshots: true, snapshots: true });

  try {
    await page.goto('/integration');
    await page.getByRole('button', { name: 'Connect' }).click();
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 30000 });
  } finally {
    const tracePath = testInfo.outputPath('trace.zip');
    await context.tracing.stop({ path: tracePath });

    if (testInfo.status !== 'passed') {
      await testInfo.attach('trace', { path: tracePath, contentType: 'application/zip' });
      await allure.attachment(
        'last-page-html',
        await page.content(),
        'text/html'
      );
      await allure.attachment(
        'last-screenshot',
        await page.screenshot({ fullPage: true }),
        'image/png'
      );
    }
  }
});
\`\`\`

This attaches the trace, page HTML, and screenshot only on failure. On success the artifacts are skipped to keep the report compact.

## Environment info

Add static metadata to every report (browser, environment, app version):

\`\`\`typescript
export default defineConfig({
  reporter: [
    ['allure-playwright', {
      environmentInfo: {
        BROWSER: 'Chromium',
        OS: process.platform,
        APP_VERSION: process.env.APP_VERSION ?? 'local',
        ENVIRONMENT: process.env.NODE_ENV ?? 'dev',
      },
    }],
  ],
});
\`\`\`

The Allure overview page displays this metadata.

## Allure categories

Define rules that automatically tag failed tests with categories:

\`\`\`typescript
['allure-playwright', {
  categories: [
    {
      name: 'Network errors',
      messageRegex: '.*ECONNREFUSED.*|.*ETIMEDOUT.*',
    },
    {
      name: 'Auth failures',
      messageRegex: '.*401.*|.*Unauthorized.*',
    },
    {
      name: 'Element not found',
      messageRegex: '.*Timeout.*waiting for selector.*',
    },
  ],
}],
\`\`\`

The Allure report shows a Categories tab with each category and the matching failing tests. Useful for quickly identifying systemic issues.

## Attaching custom data: log dumps, computed state

Some failures are easier to diagnose with arbitrary data the test computed. Attach it as JSON:

\`\`\`typescript
test('with computed state attached', async ({ page }, testInfo) => {
  await page.goto('/dashboard');

  // Compute some state for diagnostics
  const cookies = await page.context().cookies();
  const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));

  // Attach as JSON
  await testInfo.attach('cookies', {
    body: JSON.stringify(cookies, null, 2),
    contentType: 'application/json',
  });
  await testInfo.attach('localStorage', {
    body: localStorage,
    contentType: 'application/json',
  });

  await page.getByRole('button', { name: 'Start' }).click();
  // ...
});
\`\`\`

If the test fails, the Allure report shows the cookies and localStorage state, which often reveals the cause (missing session cookie, wrong feature flag, etc.).

## Sharing the Allure report

For team-wide visibility, publish the Allure report somewhere accessible:

### GitHub Pages

\`\`\`yaml
- name: Deploy Allure report to GitHub Pages
  if: always()
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: \${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./allure-report
    destination_dir: report
\`\`\`

The report appears at \`https://<user>.github.io/<repo>/report/\` and updates on every CI run.

### S3 bucket

\`\`\`yaml
- name: Upload Allure to S3
  if: always()
  run: aws s3 sync ./allure-report s3://my-reports/\${{ github.run_number }}/
\`\`\`

Each run gets its own folder. Useful for keeping a history.

### Allure Server (allurectl)

For teams that want trend lines, flaky test detection, and a dedicated UI, the Allure Server (Allure TestOps or self-hosted Allure-server) accepts uploaded results and computes history:

\`\`\`bash
allurectl upload --launch-name "CI Run #\${{ github.run_number }}" allure-results
\`\`\`

The server URL shows the run alongside historical data.

## Frequently Asked Questions

### How do I attach a Playwright trace to an Allure report?

Set \`trace: 'on-first-retry'\` in \`playwright.config.ts\` and use \`['allure-playwright']\` as the reporter. The reporter detects traces in \`test-results/\` and attaches them automatically. For manual control, use \`testInfo.attach('trace', { path: tracePath, contentType: 'application/zip' })\`.

### What is testInfo.outputPath used for?

\`testInfo.outputPath('trace.zip')\` returns a path inside the test's output directory. Files written there are preserved as test artifacts and tied to the specific test run. Use it for trace.zip, custom log files, or any data you want Allure or other reporters to find.

### How do I use allure.attachment in a Playwright test?

Import \`* as allure from 'allure-js-commons'\` and call \`await allure.attachment('name', content, 'mime/type')\`. The content can be a string or Buffer. The attachment appears in the Allure report attached to the current test.

### Can I attach custom JSON data to an Allure report?

Yes. Call \`await allure.attachment('api-response', JSON.stringify(data), 'application/json')\`. The Allure UI renders JSON attachments with syntax highlighting and a tree view. Useful for debugging API tests by attaching the actual response.

### How do I group test actions into Allure steps?

Wrap the actions in \`await allure.step('Step name', async () => { ... })\`. Each step appears in the report as a collapsible section with its own duration and any nested attachments. Useful for long multi-stage tests.

### Where do I configure Allure environment info?

In the reporter options: \`['allure-playwright', { environmentInfo: { BROWSER: 'Chromium', OS: 'linux' } }]\`. The environment info appears on the Allure overview page and provides context for the run.

### How do I publish an Allure report from CI?

Run \`allure generate allure-results --clean -o allure-report\` after the tests finish. Upload \`allure-report/\` as a CI artifact (GitHub Actions, GitLab, Jenkins) or deploy to GitHub Pages / S3. Many teams use a dedicated Allure server (\`allurectl\`) for historical trends.

### Do I need to use testInfo.attach if I use allure.attachment?

\`testInfo.attach\` is the framework-neutral API; \`allure.attachment\` is Allure-specific. Either works, but \`allure.attachment\` lets you set Allure-specific metadata (step grouping) more cleanly. For traces, \`testInfo.attach\` is the recommended approach because the reporter handles them uniformly.

## Detailed attachment examples

A test that does network mocking can attach the request/response data as JSON for review in Allure:

\`\`\`typescript
test('with API trace attachments', async ({ page, request }, testInfo) => {
  const apiCalls: Array\\<{ url: string; method: string; status: number }\\> = [];

  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    await route.continue();
    apiCalls.push({ url, method, status: 200 });
  });

  await page.goto('/dashboard');

  await testInfo.attach('api-calls', {
    body: JSON.stringify(apiCalls, null, 2),
    contentType: 'application/json',
  });
});
\`\`\`

If the test fails, the Allure report shows the captured API calls. You can see exactly which endpoints were hit and in what order.

## Per-test test info access

Inside any test, the third callback argument is \`testInfo\`. It exposes the test's metadata and attachment APIs:

\`\`\`typescript
test('uses testInfo', async ({ page }, testInfo) => {
  console.log('Test title:', testInfo.title);
  console.log('Test file:', testInfo.file);
  console.log('Project name:', testInfo.project.name);
  console.log('Retry count:', testInfo.retry);

  // Output path for artifacts
  const screenshotPath = testInfo.outputPath('on-load.png');
  await page.goto('/');
  await page.screenshot({ path: screenshotPath });
  await testInfo.attach('on-load', { path: screenshotPath, contentType: 'image/png' });

  // Annotations
  testInfo.annotations.push({ type: 'severity', description: 'minor' });
});
\`\`\`

The \`testInfo.retry\` value is especially useful for behavior that differs on retry attempts (e.g., attach more diagnostic data on the second attempt).

## Filtering and tagging in the Allure UI

Once you have annotated tests with epic/feature/story/tag/severity, the Allure UI lets you filter the report by any combination:

| Filter | Use case |
|---|---|
| By severity | Show critical bugs first |
| By tag | Run smoke tests only, regression only |
| By owner | Page-the-team-that-broke-it |
| By feature | Per-product-area breakdown |
| By status | Failures only |
| By duration | Slow tests first |

For larger teams, the filtering is the difference between "1000 tests, can't find anything" and "10 tests in my area, can read the report in 2 minutes".

## Migrating from Allure 2 to Allure 3

If you have an existing Allure 2 setup, the migration to Allure 3 (current as of 2026) is straightforward:

1. Upgrade \`allure-playwright\` to the latest version.
2. Upgrade \`allure-commandline\` to v3.x.
3. Re-generate the report - the JSON format is forward-compatible.

The visual changes in Allure 3 are minor (refreshed UI, better filtering). The reporter API and attachment formats are unchanged.

## Allure vs HTML report

| Feature | Playwright HTML | Allure |
|---|---|---|
| Built-in | Yes | No (extra dep) |
| Pass/fail summary | Yes | Yes |
| Trace viewer link | Yes | Yes (attachment) |
| Filtering | Limited | Powerful |
| History/trends | No | Yes (server) |
| Categories | No | Yes |
| Team metadata | No | Yes |
| Tags/owners | No | Yes |

For a single dev iterating locally, the HTML report is enough. For a team CI dashboard, Allure pays back its setup cost quickly.

## Multi-environment Allure reports

For teams that run the same suite against multiple environments (dev, staging, prod), Allure can show the results side by side:

\`\`\`typescript
['allure-playwright', {
  environmentInfo: {
    ENVIRONMENT: process.env.TEST_ENV ?? 'local',
    BROWSER: 'Chromium',
    APP_VERSION: process.env.APP_VERSION ?? 'dev',
  },
}],
\`\`\`

Run with \`TEST_ENV=staging npx playwright test\` then merge results from multiple runs. Allure's UI shows environment metadata prominently, making it easy to spot environment-specific failures.

For Allure Server users, the \`launch-name\` and \`launch-tags\` parameters let you label each run distinctly:

\`\`\`bash
allurectl upload \\
  --launch-name "Staging - PR #1234" \\
  --launch-tags "env:staging,pr:1234" \\
  allure-results
\`\`\`

The server then groups runs by tag and computes flakiness rates per environment.

## Frequently-used attachment helpers

A small utility library makes attachment patterns consistent across the team:

\`\`\`typescript
// utils/attach.ts
import type { TestInfo } from '@playwright/test';
import * as fs from 'fs/promises';

export async function attachJson(testInfo: TestInfo, name: string, data: unknown) {
  await testInfo.attach(name, {
    body: JSON.stringify(data, null, 2),
    contentType: 'application/json',
  });
}

export async function attachText(testInfo: TestInfo, name: string, text: string) {
  await testInfo.attach(name, {
    body: text,
    contentType: 'text/plain',
  });
}

export async function attachFile(testInfo: TestInfo, name: string, path: string) {
  const buffer = await fs.readFile(path);
  await testInfo.attach(name, {
    body: buffer,
    contentType: 'application/octet-stream',
  });
}
\`\`\`

Then in tests:

\`\`\`typescript
import { attachJson, attachText } from '../utils/attach';

test('with helpers', async ({ page }, testInfo) => {
  await attachJson(testInfo, 'config', { foo: 'bar' });
  await attachText(testInfo, 'page-source', await page.content());
});
\`\`\`

## Conclusion

The Playwright-to-Allure pipeline in 2026 is: configure \`trace: 'on-first-retry'\`, \`screenshot: 'only-on-failure'\`, \`video: 'retain-on-failure'\`, and \`['allure-playwright']\` as the reporter. Every failing test gets its trace, screenshot, and video automatically attached to the Allure report. For custom artifacts (HAR files, JSON dumps, page HTML), use \`testInfo.attach\` or \`allure.attachment\` with the appropriate MIME type.

For the trace viewer that consumes these traces, see [Playwright show-trace CLI Reference](/blog/playwright-show-trace-cli-reference) and [Playwright Test Trace Viewer 2026](/blog/playwright-test-trace-viewer-official-2026). For network artifact recording, see [Playwright route.fulfill Network Mocking](/blog/playwright-route-fulfill-network-mocking-reference).

Install the [playwright-e2e skill](/skills/playwright-e2e) so your AI agent (Claude Code, Cursor, Aider) generates tests with the full Allure pipeline configured. Compare reporting approaches in [Cypress vs Playwright 2026](/compare/cypress-vs-playwright-2026).
`,
};
