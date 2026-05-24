import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright CI on GitHub Actions: Complete 2026 Guide',
  description: 'Production-grade Playwright CI on GitHub Actions in 2026: sharding, caching, matrix builds, traces, reports, secrets, and deployment gates. End-to-end YAML examples.',
  date: '2026-05-02',
  category: 'Guide',
  content: `
# Playwright CI on GitHub Actions: Complete 2026 Guide

The promise of Playwright in CI is straightforward: run the same tests you wrote locally against your real application on every pull request, and surface failures with the same time-travel debugging UI Mode gives you on your laptop. The reality, in 2026, is that getting from "tests pass locally" to "tests guard every deploy" still requires deliberate choices about caching, sharding, browser installation, artifact retention, and matrix strategy. Get those wrong and your CI suite becomes the slow, flaky bottleneck developers route around instead of through.

This guide is a complete blueprint for running Playwright on GitHub Actions in 2026. We will build a pipeline from scratch: install dependencies with pnpm caching, install browsers with a layered cache, shard tests across runners, merge HTML reports, expose traces and videos as artifacts, and gate deploys on green status. Every YAML file is production-ready, every command is the current syntax for Playwright 1.49+, and every choice is justified by the tradeoff it makes. We will also cover the failure modes that take down most CI suites: cold browser installs, runners running out of memory, and traces that fill artifact storage.

If you need a Playwright primer first, the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide) covers fundamentals. The [playwright-e2e skill](/skills/playwright-e2e) gives Claude Code and Cursor the CI patterns from this guide.

## The minimum viable workflow

Drop this into \`.github/workflows/playwright.yml\` and you have a passing baseline that runs on every push to main and every pull request.

\`\`\`yaml
name: Playwright Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      - name: Run Playwright tests
        run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
\`\`\`

This workflow takes about three minutes for a small suite. It will not scale beyond a few dozen tests because every run reinstalls browsers from scratch and does not parallelize.

## Adding pnpm caching

Most production monorepos use pnpm. The pnpm action caches the store, which cuts a minute off cold installs.

\`\`\`yaml
- name: Install pnpm
  uses: pnpm/action-setup@v3
  with:
    version: 9.15.0

- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm

- name: Install dependencies
  run: pnpm install --frozen-lockfile
\`\`\`

\`actions/setup-node@v4\` with \`cache: pnpm\` reads your \`pnpm-lock.yaml\` and restores the global store from the cache. Subsequent runs that have not changed the lockfile complete the install step in under thirty seconds.

## Caching Playwright browsers

The largest single download in a Playwright CI run is the browser bundles. Chromium alone is roughly three hundred megabytes uncompressed. Cache them between runs and the install step finishes in seconds.

\`\`\`yaml
- name: Get Playwright version
  id: playwright-version
  run: |
    VERSION=$(node -p "require('@playwright/test/package.json').version")
    echo "version=$VERSION" >> "$GITHUB_OUTPUT"

- name: Cache Playwright browsers
  uses: actions/cache@v4
  id: playwright-cache
  with:
    path: ~/.cache/ms-playwright
    key: playwright-\${{ runner.os }}-\${{ steps.playwright-version.outputs.version }}

- name: Install Playwright browsers
  if: steps.playwright-cache.outputs.cache-hit != 'true'
  run: pnpm exec playwright install --with-deps

- name: Install Playwright system deps only
  if: steps.playwright-cache.outputs.cache-hit == 'true'
  run: pnpm exec playwright install-deps
\`\`\`

The cache key includes the Playwright version, so bumping Playwright invalidates the cache automatically and a fresh download happens on the next run. The \`install-deps\` fallback for the cache-hit path installs the OS-level dependencies (libnss, libxss, etc.) that the cache cannot store.

## Sharding for parallel execution

Sharding distributes tests across runners that execute in parallel. Playwright supports sharding natively with the \`--shard\` flag.

\`\`\`yaml
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9.15.0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps
      - name: Run shard \${{ matrix.shardIndex }} of \${{ matrix.shardTotal }}
        run: pnpm exec playwright test --shard=\${{ matrix.shardIndex }}/\${{ matrix.shardTotal }}
      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}
        with:
          name: blob-report-\${{ matrix.shardIndex }}
          path: blob-report
          retention-days: 1
\`\`\`

Four shards process a 200-test suite in roughly a quarter of the time. Update your \`playwright.config.ts\` to use the blob reporter so shards produce mergeable output.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? [['blob']] : 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
\`\`\`

## Merging shard reports

After all shards complete, a final job merges blob reports into a single HTML report.

\`\`\`yaml
  merge-reports:
    if: \${{ !cancelled() }}
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9.15.0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true
      - name: Merge reports
        run: pnpm exec playwright merge-reports --reporter=html ./all-blob-reports
      - uses: actions/upload-artifact@v4
        with:
          name: html-report
          path: playwright-report
          retention-days: 14
\`\`\`

The merged HTML report includes every shard's tests in a single browseable file. Download it from the workflow run, unzip, and run \`pnpm exec playwright show-report playwright-report\` to open it locally.

## Cross-browser matrix

For full cross-browser coverage, expand the matrix to include browser dimension.

\`\`\`yaml
strategy:
  fail-fast: false
  matrix:
    browser: [chromium, firefox, webkit]
    shardIndex: [1, 2]
    shardTotal: [2]
\`\`\`

Two shards times three browsers gives six parallel runners. For a 300-test suite, total wall-clock time stays under ten minutes. Pass the browser into the test command:

\`\`\`yaml
- run: pnpm exec playwright test --project=\${{ matrix.browser }} --shard=\${{ matrix.shardIndex }}/\${{ matrix.shardTotal }}
\`\`\`

Configure each project in \`playwright.config.ts\`:

\`\`\`typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
],
\`\`\`

## Starting your app before tests

Most CI runs need to spin up the application before Playwright connects. The \`webServer\` config option handles startup, readiness, and teardown automatically.

\`\`\`typescript
export default defineConfig({
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
});
\`\`\`

For multi-service setups, pass an array:

\`\`\`typescript
webServer: [
  {
    command: 'pnpm --filter @qaskills/api start',
    port: 4000,
    timeout: 60_000,
  },
  {
    command: 'pnpm --filter @qaskills/web start',
    port: 3000,
    timeout: 60_000,
  },
],
\`\`\`

Playwright waits for each server to respond with HTTP 200 on the configured URL or port before starting tests, then shuts them down cleanly.

## Secrets and environment variables

Tests often need API keys, database URLs, or Clerk credentials. Store them as GitHub Actions secrets, then expose to the runner.

\`\`\`yaml
- name: Run Playwright tests
  env:
    BASE_URL: \${{ secrets.STAGING_URL }}
    CLERK_PUBLISHABLE_KEY: \${{ secrets.CLERK_PUBLISHABLE_KEY }}
    DATABASE_URL: \${{ secrets.DATABASE_URL }}
    OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
  run: pnpm exec playwright test
\`\`\`

Secrets are masked in logs. Never echo them or write them to artifacts. For local replication, mirror the same names in your \`.env.local\` so the same code reads from the same places.

## Trace, video, and screenshot artifacts

Failures need evidence. Configure Playwright to record artifacts only on failure, then upload them.

\`\`\`typescript
use: {
  trace: 'on-first-retry',     // record once on retry
  video: 'retain-on-failure',   // keep video only when test fails
  screenshot: 'only-on-failure',
},
\`\`\`

The upload step in your workflow:

\`\`\`yaml
- uses: actions/upload-artifact@v4
  if: \${{ failure() }}
  with:
    name: playwright-traces-\${{ matrix.shardIndex }}
    path: |
      test-results/**/trace.zip
      test-results/**/video.webm
    retention-days: 7
\`\`\`

To investigate a CI failure locally, download the artifact and open the trace:

\`\`\`bash
npx playwright show-trace ./trace.zip
\`\`\`

The UI Mode window opens with the captured snapshots, network requests, and console output. For more on traces, read the [Playwright Screenshots Videos Traces Complete Guide](/blog/playwright-screenshots-videos-traces-complete-guide).

## Posting results to pull requests

Use the \`dorny/test-reporter\` action or a similar to post a check run with results.

\`\`\`yaml
- name: Publish Test Report
  if: \${{ !cancelled() }}
  uses: dorny/test-reporter@v1
  with:
    name: Playwright Tests
    path: test-results/junit.xml
    reporter: jest-junit
\`\`\`

Configure JUnit output in \`playwright.config.ts\`:

\`\`\`typescript
reporter: [
  ['junit', { outputFile: 'test-results/junit.xml' }],
  ['blob'],
],
\`\`\`

For PR comments with screenshots embedded, consider the \`daun/playwright-report-summary\` action.

## Deployment gates

Tie deploys to Playwright green status using job dependencies and environment protection rules.

\`\`\`yaml
  deploy-staging:
    needs: [test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.qaskills.sh
    steps:
      - uses: actions/checkout@v4
      - run: pnpm dlx vercel pull --yes --token=\${{ secrets.VERCEL_TOKEN }}
      - run: pnpm dlx vercel build --prod --token=\${{ secrets.VERCEL_TOKEN }}
      - run: pnpm dlx vercel deploy --prebuilt --prod --token=\${{ secrets.VERCEL_TOKEN }}
\`\`\`

The \`needs: [test]\` line forces the deploy job to wait for all Playwright shards to complete successfully. Use GitHub environment protection rules for additional approval gates.

## A complete production workflow

Putting every piece together, here is the workflow used by a real production team that runs 400 Playwright tests on every PR.

\`\`\`yaml
name: Playwright CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    timeout-minutes: 30
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
        shardIndex: [1, 2, 3]
        shardTotal: [3]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9.15.0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        id: cache
        with:
          path: ~/.cache/ms-playwright
          key: playwright-\${{ runner.os }}-\${{ hashFiles('pnpm-lock.yaml') }}
      - run: pnpm exec playwright install --with-deps \${{ matrix.browser }}
        if: steps.cache.outputs.cache-hit != 'true'
      - run: pnpm exec playwright install-deps \${{ matrix.browser }}
        if: steps.cache.outputs.cache-hit == 'true'
      - name: Run tests
        env:
          BASE_URL: \${{ secrets.STAGING_URL }}
          DATABASE_URL: \${{ secrets.DATABASE_URL }}
        run: pnpm exec playwright test --project=\${{ matrix.browser }} --shard=\${{ matrix.shardIndex }}/\${{ matrix.shardTotal }}
      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}
        with:
          name: blob-\${{ matrix.browser }}-\${{ matrix.shardIndex }}
          path: blob-report
          retention-days: 1
      - uses: actions/upload-artifact@v4
        if: \${{ failure() }}
        with:
          name: traces-\${{ matrix.browser }}-\${{ matrix.shardIndex }}
          path: test-results
          retention-days: 7

  merge-reports:
    if: \${{ !cancelled() }}
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9.15.0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-*
          merge-multiple: true
      - run: pnpm exec playwright merge-reports --reporter=html ./all-blob-reports
      - uses: actions/upload-artifact@v4
        with:
          name: html-report
          path: playwright-report
          retention-days: 14
\`\`\`

## Cost tuning

GitHub Actions bills by minute on private repos. The most expensive shape is a long matrix run that hits the timeout. Optimize:

| Lever | Impact |
|---|---|
| pnpm + lockfile cache | -60 seconds per job |
| Playwright browser cache | -45 seconds per job |
| \`fullyParallel: true\` | 2-4x worker speedup per shard |
| Sharding | Wall-clock divided by shard count |
| \`concurrency.cancel-in-progress\` | Cancels superseded PR runs |
| \`fail-fast: false\` | Costs more but surfaces all failures |
| Smoke vs full project split | Run smoke on PR, full on main |

For a typical 200-test suite, applying every lever brings wall-clock time from 12 minutes down to under 4.

## Common pitfalls

**Cold runners with stale apt repos.** \`apt-get update\` can fail intermittently. The \`--with-deps\` flag handles this internally; pin to it.

**Tests passing locally but failing in CI.** Almost always timing. Increase \`expect.timeout\` and add explicit waits for network responses. Avoid \`waitForTimeout\`.

**Artifact storage overruns.** Default retention is 90 days. Cut to 7-14 days for traces, 30 for reports. Use \`if: failure()\` to upload traces only on failure.

**Flaky parallelism.** When tests share state via DB or filesystem, parallel runs collide. Use unique data per worker (\`process.env.TEST_WORKER_INDEX\`) or isolate with transactions.

**Long install times.** If browser cache is invalidating every run, your key includes a frequently changing input. Use the Playwright version, not the lockfile hash.

## Anti-patterns

- Running the entire suite on every PR for repositories with hundreds of tests. Run a smoke subset; gate merge to main on full coverage.
- Storing secrets in workflow files or in commit history. Always use \`secrets.*\`.
- Conflating CI orchestration with test logic. Keep \`playwright.config.ts\` portable so developers can replicate CI locally with \`CI=1 pnpm test\`.
- Recording video for every test. WebM files compound rapidly; use \`retain-on-failure\`.
- Ignoring \`fail-fast\` in matrix runs. \`fail-fast: false\` finishes the full matrix and surfaces every failure, which costs more but saves a second debug round.

## Conclusion and next steps

A well-tuned Playwright CI on GitHub Actions runs in single-digit minutes, caches everything cachable, shards smart, and keeps artifacts that matter. Once the pipeline is green, the next layer is reliability: read [Playwright Retries Flaky Test Handling Guide](/blog/playwright-retries-flaky-test-handling-guide) for the patterns that keep CI from becoming the boy who cried wolf. Pair with the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate tests that play well in shards and parallel runs from day one.
`,
};
