import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Parallel and Sharded Execution: Complete 2026 Guide',
  description: 'Speed up Playwright tests with fullyParallel, workers, sharding, and CI matrices. Patterns for isolation, data partitioning, and report merging in 2026.',
  date: '2026-05-10',
  category: 'Guide',
  content: `
# Playwright Parallel and Sharded Execution: Complete 2026 Guide

A 400-test suite that runs serially takes thirty minutes. The same suite, fully parallel across four workers and three CI shards, finishes in under three minutes. The performance gap is not just about CPUs; it is about the difference between a CI pipeline developers wait for and one they route around. Playwright's parallelism model gives you both worker-level concurrency inside a single process and cross-machine sharding via \`--shard\`. Combine them and the speedup is multiplicative.

This guide covers everything you need to run Playwright tests in parallel and across shards in 2026: workers, fullyParallel, data isolation, sharding strategies, CI matrices, and the report-merging step that pulls shard outputs back together. Every example is TypeScript with Playwright 1.49+.

For broader CI scaffolding, the [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026) covers the full pipeline. The [playwright-e2e skill](/skills/playwright-e2e) bakes in these patterns for AI-generated tests.

## The two axes of parallelism

Playwright parallelism has two independent axes:

| Axis | Mechanism | Scope |
|---|---|---|
| Workers | \`workers\` config option | Same machine |
| Shards | \`--shard\` CLI flag | Multiple machines |

Workers are CPU-bound; you typically run one worker per CPU core. Shards are machine-bound; you run one shard per CI runner. A 4-worker, 3-shard matrix gives you 12-way parallelism.

## fullyParallel

By default, Playwright runs files in parallel and tests within a file sequentially. \`fullyParallel: true\` enables test-level parallelism, which is what you want for any suite where individual tests are independent.

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
});
\`\`\`

When \`workers\` is omitted, Playwright picks roughly half of available cores. \`process.env.CI ? 4 : undefined\` keeps local runs flexible while pinning CI to a deterministic number.

## Disabling parallelism per file

When tests within a file genuinely share state (browser session, generated data), keep them serial.

\`\`\`typescript
test.describe.configure({ mode: 'serial' });

test.describe('Checkout flow', () => {
  test('add item', async () => { ... });
  test('view cart', async () => { ... });
  test('place order', async () => { ... });
});
\`\`\`

\`mode: 'serial'\` runs tests in declaration order within one worker and fails subsequent tests on the first failure. Use sparingly; refactor toward independence whenever possible.

\`mode: 'default'\` runs in declaration order but in parallel within the file (with \`fullyParallel: true\` set).

## Data isolation per worker

The cardinal rule of parallel tests: no shared mutable state. Two workers writing to the same database row or filesystem path will race.

Use \`testInfo.workerIndex\` to partition data:

\`\`\`typescript
import { test as base } from '@playwright/test';

type Fixtures = {
  testUser: { id: string; email: string };
};

export const test = base.extend<Fixtures>({
  testUser: async ({}, use, workerInfo) => {
    const email = \`user-w\${workerInfo.workerIndex}-\${Date.now()}@example.com\`;
    const user = await db.createUser({ email });
    await use(user);
    await db.deleteUser(user.id);
  },
});
\`\`\`

Each worker gets its own user with a unique email derived from \`workerIndex\`.

## Sharding

To run tests across multiple machines, pass \`--shard=index/total\`.

\`\`\`bash
# Run shard 1 of 4
npx playwright test --shard=1/4

# Run shard 2 of 4
npx playwright test --shard=2/4
\`\`\`

Playwright splits the test list deterministically. Combined with workers, this gives you (shards * workers) total parallelism. A typical config for a 400-test suite:

\`\`\`yaml
strategy:
  fail-fast: false
  matrix:
    shardIndex: [1, 2, 3, 4]
    shardTotal: [4]
runs-on: ubuntu-latest
steps:
  - run: pnpm exec playwright test --shard=\${{ matrix.shardIndex }}/\${{ matrix.shardTotal }}
\`\`\`

Four shards times four workers = 16 parallel tests, finishing 400 in roughly 25-30 minutes of CPU time spread across 4 minutes wall clock.

## The blob reporter for shard merging

Each shard produces its own report. To merge them, use the blob reporter on every shard, then a separate job to merge.

\`\`\`typescript
// playwright.config.ts
reporter: process.env.CI ? [['blob']] : [['list']],
\`\`\`

Each shard writes \`blob-report/\` with serialized results. Upload as artifact:

\`\`\`yaml
- uses: actions/upload-artifact@v4
  with:
    name: blob-report-\${{ matrix.shardIndex }}
    path: blob-report
\`\`\`

Then a merge job:

\`\`\`yaml
merge-reports:
  needs: [test]
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/download-artifact@v4
      with:
        pattern: blob-report-*
        merge-multiple: true
        path: all-blob-reports
    - run: pnpm exec playwright merge-reports --reporter=html ./all-blob-reports
    - uses: actions/upload-artifact@v4
      with:
        name: html-report
        path: playwright-report
\`\`\`

The merged HTML report includes every test from every shard in a single browsable file.

## Cross-browser matrix

For broader coverage, add browser to the matrix.

\`\`\`yaml
strategy:
  fail-fast: false
  matrix:
    browser: [chromium, firefox, webkit]
    shardIndex: [1, 2]
    shardTotal: [2]
\`\`\`

Six runners (two shards times three browsers) cover a 400-test suite across browsers in ~5 minutes.

## Project-level parallelism

Projects also run in parallel within a single shard.

\`\`\`typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
],
\`\`\`

With \`fullyParallel: true\` and three projects, your test pool triples. Workers distribute the union of (test, project) tuples.

## Sequential setup project

Some tests require an initial setup (authentication, database seeding) that should run once before parallel tests.

\`\`\`typescript
projects: [
  {
    name: 'setup',
    testMatch: /.*\\.setup\\.ts/,
  },
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
    dependencies: ['setup'],
  },
],
\`\`\`

Setup runs to completion before any test in the dependent projects. Setup itself can be parallel internally; the dependency only enforces ordering between projects.

## Failing-fast vs failing-slow

\`fail-fast: false\` in the GitHub matrix lets every shard finish even if one fails. The tradeoff: you get full visibility into all failures, but you pay for the runners. \`fail-fast: true\` cancels remaining runners on first failure, saving cost at the expense of context.

For most teams, \`fail-fast: false\` is correct because diagnosing two failures simultaneously saves more developer time than the extra minutes of runner cost.

## Test discovery and grep

To run a subset:

\`\`\`bash
# Only smoke tests
npx playwright test --grep "@smoke"

# Exclude flaky tests
npx playwright test --grep-invert "@flaky"

# Specific file
npx playwright test tests/checkout.spec.ts

# Specific test
npx playwright test -g "user completes checkout"
\`\`\`

In CI, combine with shards for partitioned runs:

\`\`\`bash
pnpm exec playwright test --grep "@smoke" --shard=1/2
\`\`\`

## Worker isolation patterns

| Resource | Isolation strategy |
|---|---|
| Database | Per-worker schema or table prefix |
| Filesystem | Use \`testInfo.outputDir\` (auto-unique) |
| External API | Tag requests with worker ID header |
| Local server port | Allocate dynamically per worker |
| Time-sensitive state | Use \`page.clock\` (see [Playwright Clock Time Control Testing Guide](/blog/playwright-clock-time-control-testing-guide)) |

## Allocating ports per worker

For each worker that needs its own backend port:

\`\`\`typescript
import { test as base } from '@playwright/test';

export const test = base.extend<{ port: number }>({
  port: async ({}, use, workerInfo) => {
    const port = 4000 + workerInfo.workerIndex;
    await spawnBackend(port);
    await use(port);
  },
});
\`\`\`

## Sharding strategy options

Playwright's default sharding splits the test list into N contiguous chunks. For more even balance with long-running tests, sort tests by historical duration first. Playwright 1.49+ supports duration-aware sharding by including \`--shard\` with results from previous runs:

\`\`\`bash
npx playwright test --shard=1/4 --last-failed
\`\`\`

\`--last-failed\` runs only the tests that failed in the previous run, useful for fast retry workflows.

## Common pitfalls

**Pitfall 1: Shared mutable fixtures at worker scope without cleanup.** A test that fails mid-fixture leaves leftover state for the next test.

**Pitfall 2: Database collisions.** Two workers using the same row crash. Use unique data per worker.

**Pitfall 3: Forgetting to upload blob artifacts.** Without blobs, shards cannot merge into a single report.

**Pitfall 4: \`workers: 1\` in CI.** A single worker defeats parallelism. Use \`workers: 4\` or higher in CI.

**Pitfall 5: \`fullyParallel: false\` by default.** Many older configs forget to enable it; tests within a file run serially even though they could parallelize.

## Anti-patterns

- Sharing global counters between tests. Counters are not parallel-safe.
- Hard-coding shard counts in test code. The CLI handles it.
- Skipping the merge job. Without it, only the last shard's report survives.
- Running every test in every project. Use \`testMatch\` to scope per project.

## Putting it all together

\`\`\`yaml
name: Playwright

on: [pull_request]

jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
        shardIndex: [1, 2, 3]
        shardTotal: [3]
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
      - run: pnpm exec playwright install --with-deps \${{ matrix.browser }}
      - run: pnpm exec playwright test --project=\${{ matrix.browser }} --shard=\${{ matrix.shardIndex }}/\${{ matrix.shardTotal }}
      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}
        with:
          name: blob-\${{ matrix.browser }}-\${{ matrix.shardIndex }}
          path: blob-report

  merge:
    if: \${{ !cancelled() }}
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          pattern: blob-*
          merge-multiple: true
          path: all-blob-reports
      - run: pnpm exec playwright merge-reports --reporter=html ./all-blob-reports
      - uses: actions/upload-artifact@v4
        with:
          name: html-report
          path: playwright-report
\`\`\`

## Conclusion and next steps

Parallelism is the lever that turns a slow Playwright suite into a fast one. Use \`fullyParallel\` for in-process parallelism, \`--shard\` for cross-machine parallelism, the blob reporter for merging, and worker-keyed data partitioning for isolation.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate parallel-safe tests. For broader CI patterns, read [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026). For retries on top of parallelism, [Playwright Retries Flaky Test Handling Guide](/blog/playwright-retries-flaky-test-handling-guide).
`,
};
