import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Reporters Complete Guide: HTML, Allure, JUnit, Blob',
  description: 'Configure Playwright reporters in 2026: built-in HTML, list, dot, line, junit, json, blob, plus Allure, Monocart, and custom reporter authoring.',
  date: '2026-05-07',
  category: 'Guide',
  content: `
# Playwright Reporters Complete Guide: HTML, Allure, JUnit, Blob

Test reporters are how Playwright communicates results to humans, machines, and CI services. The default HTML report is rich enough for local debugging; JUnit XML feeds GitHub Actions and Jenkins; Allure adds product manager dashboards; blob enables sharded report merging. In 2026 every team should run at least two reporters at once: one for humans, one for CI. This guide is the complete reference.

For the broader CI story, read the [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026). The [playwright-e2e skill](/skills/playwright-e2e) helps AI assistants pick the right reporter mix.

## Built-in reporters

| Reporter | Output | Best for |
|---|---|---|
| \`list\` | Streaming list with timing | Local dev |
| \`dot\` | One char per test | CI logs |
| \`line\` | Single line summary | CI logs (default in CI) |
| \`html\` | Interactive HTML report | Local debugging |
| \`junit\` | JUnit XML | GitHub Actions, Jenkins |
| \`json\` | JSON dump | Custom downstream tooling |
| \`blob\` | Mergeable archive | Sharded CI |
| \`github\` | Annotations in PRs | GitHub Actions |
| \`null\` | No output | Manual reporters |

## Configuring reporters

Reporters live in \`playwright.config.ts\`. Pass a string for defaults, or a tuple for options.

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    process.env.CI ? ['github'] : ['null'],
  ],
});
\`\`\`

Multiple reporters run in parallel. Each receives the same events.

## The HTML reporter in depth

The HTML reporter writes a static site with timeline, trace links, screenshots, and stdout per test.

| Option | Type | Purpose |
|---|---|---|
| \`outputFolder\` | string | Directory to write into |
| \`open\` | \`'never' \\| 'always' \\| 'on-failure'\` | When to auto-open |
| \`host\` | string | Bind address when serving |
| \`port\` | number | Port when serving |
| \`attachmentsBaseURL\` | string | CDN URL for attachments |

After a run, view with:

\`\`\`bash
npx playwright show-report
\`\`\`

The site is fully static; you can upload it to S3, GitHub Pages, or any HTTP host without a backend.

## Trace integration

When configured with \`trace: 'on'\` or \`trace: 'on-first-retry'\`, the HTML report links to trace files. Click "View trace" on any test to open the trace viewer in a new tab.

\`\`\`typescript
use: {
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
},
\`\`\`

## The blob reporter for sharded CI

The blob reporter writes a serialized archive that the \`merge-reports\` CLI combines into a single HTML report.

\`\`\`yaml
- run: pnpm exec playwright test --shard=\${{ matrix.shardIndex }}/\${{ matrix.shardTotal }}
- uses: actions/upload-artifact@v4
  with:
    name: blob-\${{ matrix.shardIndex }}
    path: blob-report
\`\`\`

Then in a merge job:

\`\`\`yaml
- uses: actions/download-artifact@v4
  with:
    pattern: blob-*
    merge-multiple: true
    path: all-blob-reports
- run: pnpm exec playwright merge-reports --reporter=html ./all-blob-reports
\`\`\`

The blob reporter is the only built-in option that produces mergeable output. Without it, shard reports overwrite each other.

## JUnit XML for CI integration

JUnit is the lingua franca of CI tools. Most providers ingest it automatically.

\`\`\`typescript
['junit', {
  outputFile: 'test-results/junit.xml',
  stripANSIControlSequences: true,
  embedAttachmentsAsProperty: 'testrun_evidence',
}],
\`\`\`

The \`embedAttachmentsAsProperty\` option inlines failure screenshots into the XML as base64.

## GitHub Actions annotations

The \`github\` reporter posts annotations directly to PR diffs.

\`\`\`typescript
['github'],
\`\`\`

When a test fails, the failure appears as an annotation on the relevant line of the test file in the PR's Files tab. No further configuration is required.

## Allure: the heavyweight option

Allure adds rich grouping, history, severity, owners, and attachments. Install:

\`\`\`bash
pnpm add -D allure-playwright
\`\`\`

\`\`\`typescript
reporter: [
  ['list'],
  ['allure-playwright', { outputFolder: 'allure-results' }],
],
\`\`\`

After running tests, generate and serve the report:

\`\`\`bash
npx allure generate allure-results --clean
npx allure open allure-report
\`\`\`

Add metadata in test code:

\`\`\`typescript
import { test } from '@playwright/test';
import { allure } from 'allure-playwright';

test('user signs in', async ({ page }) => {
  await allure.epic('Authentication');
  await allure.feature('Sign in');
  await allure.story('Email + password');
  await allure.severity('critical');
  await allure.owner('asha@example.com');
  await allure.tag('@smoke');

  await page.goto('/login');
  // ... rest of test
});
\`\`\`

The generated report shows tests grouped by epic, feature, and story, with history and trends across CI runs.

## Monocart: a lightweight Allure alternative

Monocart produces a single self-contained HTML file with similar features.

\`\`\`bash
pnpm add -D monocart-reporter
\`\`\`

\`\`\`typescript
reporter: [
  ['monocart-reporter', {
    name: 'QASkills',
    outputFile: './monocart-report/index.html',
    coverage: { entryFilter: (entry) => true },
  }],
],
\`\`\`

The output file works offline and is small enough to email.

## Writing a custom reporter

For org-specific needs (Slack messages, Datadog metrics, internal dashboards), implement a custom reporter.

\`\`\`typescript
// reporters/slack-reporter.ts
import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

class SlackReporter implements Reporter {
  private failures: { test: string; error: string }[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status !== 'passed' && result.status !== 'skipped') {
      this.failures.push({
        test: test.titlePath().join(' > '),
        error: result.errors[0]?.message ?? 'unknown',
      });
    }
  }

  async onEnd(result: FullResult) {
    if (this.failures.length === 0) return;
    const text = this.failures
      .map((f) => \`*\${f.test}*\\n\\\`\\\`\\\`\${f.error}\\\`\\\`\\\`\`)
      .join('\\n');
    await fetch(process.env.SLACK_WEBHOOK!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  }
}

export default SlackReporter;
\`\`\`

Register in config:

\`\`\`typescript
reporter: [
  ['list'],
  ['./reporters/slack-reporter.ts'],
],
\`\`\`

## Reporter lifecycle methods

The full Reporter interface:

| Method | When it fires |
|---|---|
| \`onBegin\` | Before any tests run |
| \`onTestBegin\` | A test is about to start |
| \`onStepBegin\` | A step within a test starts |
| \`onStdOut\` | A test wrote to stdout |
| \`onStdErr\` | A test wrote to stderr |
| \`onStepEnd\` | A step within a test ends |
| \`onTestEnd\` | A test finishes |
| \`onEnd\` | All tests have finished |
| \`onError\` | A non-test error fires |
| \`onExit\` | Process is exiting |

Most reporters only need \`onTestEnd\` and \`onEnd\`.

## Attaching files to reports

Tests can attach arbitrary files via \`testInfo.attach\`.

\`\`\`typescript
test('captures API response', async ({ page, request }) => {
  const response = await request.get('/api/users');
  await test.info().attach('api-response.json', {
    body: await response.body(),
    contentType: 'application/json',
  });
});
\`\`\`

Attachments appear in the HTML, Allure, and Monocart reports as downloadable files.

## CI configuration matrix

| CI service | Reporter setup |
|---|---|
| GitHub Actions | \`['github'], ['blob']\` |
| GitLab CI | \`['junit']\` |
| CircleCI | \`['junit', { outputFile: '/tmp/junit/junit.xml' }]\` |
| Jenkins | \`['junit']\` + JUnit plugin |
| Azure DevOps | \`['junit']\` + PublishTestResults task |
| Buildkite | \`['junit']\` + buildkite-test-collector |

Always include \`['list']\` for streaming logs; bare CI reporters are silent until completion.

## Common pitfalls

**Pitfall 1: Forgetting blob for sharded CI.** Without blob, every shard tries to write to \`playwright-report\` and the last one wins. Merge reports require blob.

**Pitfall 2: Opening HTML report in CI.** \`open: 'always'\` in CI tries to spawn a browser and fails. Use \`'never'\` and upload as artifact.

**Pitfall 3: JUnit path mismatch.** GitHub Actions expects \`test-results/junit.xml\`; CircleCI expects \`/tmp/junit/junit.xml\`. Use env vars to differentiate.

**Pitfall 4: Allure history not persisting.** Allure's trend chart requires the \`history\` folder from previous runs. Cache it between runs or upload to S3.

**Pitfall 5: Custom reporters that throw.** A throwing reporter can mask test failures. Wrap all I/O in try/catch and log to stderr.

## Anti-patterns

- Running only \`json\` and writing your own consumer. The built-in HTML reporter renders the same data better.
- Sending every test result to Slack. Slack fatigue defeats the alert. Limit to failures on main branch.
- Storing HTML reports in the repo. Generate in CI and upload as artifact.
- Configuring reporters in test files. Always keep them in \`playwright.config.ts\` so they apply uniformly.

## Performance considerations

Reporters run in-process. Heavy I/O in a custom reporter can slow CI. Buffer events and flush in \`onEnd\` to minimize overhead.

\`\`\`typescript
class BufferedReporter implements Reporter {
  private buffer: any[] = [];
  onTestEnd(test: TestCase, result: TestResult) {
    this.buffer.push({ test: test.title, status: result.status });
  }
  async onEnd() {
    await uploadBatch(this.buffer);
  }
}
\`\`\`

## Conclusion and next steps

Pick one human reporter (HTML or Allure), one CI reporter (JUnit or GitHub), and blob if you shard. That mix covers debugging, automation, and PR feedback.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants set up the right reporter mix. For broader CI patterns, see [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026). For trace-based debugging, [Playwright Screenshots Videos Traces Complete Guide](/blog/playwright-screenshots-videos-traces-complete-guide) covers the artifact side.
`,
};
