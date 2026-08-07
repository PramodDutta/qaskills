import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Test Shard Balancing for Uneven Suites in CI',
  description: 'Fix playwright test shard balancing uneven suites with duration data, file splitting, fully parallel projects, and CI report merging.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Playwright Test Shard Balancing for Uneven Suites in CI

Playwright test shard balancing uneven suites starts with understanding what Playwright can distribute. With normal project settings, Playwright shards at the test-file level, so one giant spec file can dominate a shard while other jobs sit idle. With \`fullyParallel: true\`, Playwright can distribute individual tests across shards, which usually improves balance but requires tests to be safe when run independently and in parallel.

The practical fix is a sequence, not a single flag. Measure per-file and per-test duration, identify the files that create the tail, split or parallelize only the suites that are safe, isolate shared state, and merge reports so the team still gets one readable result. Guessing by file count is not enough. Ten short smoke specs and one checkout spec with video upload, payment, and database setup do not weigh the same.

This guide gives a runnable workflow for QA engineers who own Playwright in CI. If you are still comparing Playwright with Jest, Vitest, Cypress, and other JavaScript test tools, the [JavaScript testing frameworks complete guide](/blog/javascript-testing-frameworks-complete-guide-2026) puts those boundaries in context. If your uneven suite is also full of brittle selectors, fix that in parallel with [Playwright locator best practices](/blog/playwright-best-practices-locators-2026), because unstable locators waste every shard equally.

## Diagnose the Tail Before Changing the Shard Count

An uneven sharded run usually shows one of three shapes. The first shape is file imbalance: shard 1 has a huge spec file and takes fifteen minutes while shards 2, 3, and 4 finish in five. The second shape is test imbalance: files contain many tests, but one or two tests are slow because they create data, upload files, or wait for background jobs. The third shape is environment imbalance: all shards have similar tests, but one runner is slower because the CI machine, browser install, network, or external dependency behaves differently.

Do not add more shards until you know which shape you have. More shards can make imbalance worse when the suite has a few large files. It also increases setup overhead, database pressure, account contention, report merging work, and cache misses. The goal is not the highest shard count. The goal is the shortest reliable wall-clock time for the money and complexity you can justify.

| Symptom | Likely cause | First diagnostic |
| --- | --- | --- |
| One shard always finishes last | File-level imbalance | Compare duration by spec file |
| Slowest shard changes each run | Flaky backend or variable test data | Compare traces and dependency timings |
| All shards start slowly | Repeated install or app boot cost | Inspect CI setup and caching |
| Shards pass alone but fail together | Shared state collision | Audit users, databases, queues, and feature flags |
| More shards do not reduce wall time | Fixed overhead or one huge file | Split the tail file or use test-level parallelism |

Start by collecting duration data from the current run. You can use Playwright's built-in reports for human review and a custom reporter for machine-readable duration files. The reporter does not need to be complex. It only needs title path, file, project, status, retry, and duration.

\`\`\`ts
import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import fs from 'node:fs';
import path from 'node:path';

type DurationRecord = {
  title: string[];
  file: string;
  projectName: string;
  status: string;
  retry: number;
  durationMs: number;
};

class DurationReporter implements Reporter {
  private records: DurationRecord[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    this.records.push({
      title: test.titlePath(),
      file: test.location.file,
      projectName: test.parent.project()?.name ?? 'unknown',
      status: result.status,
      retry: result.retry,
      durationMs: result.duration,
    });
  }

  async onEnd(_result: FullResult) {
    const outputDir = process.env.PW_DURATION_DIR ?? 'test-results/durations';
    fs.mkdirSync(outputDir, { recursive: true });
    const shard = process.env.PW_SHARD ?? 'local';
    const file = path.join(outputDir, 'durations-' + shard + '.json');
    fs.writeFileSync(file, JSON.stringify(this.records, null, 2));
  }
}

export default DurationReporter;
\`\`\`

Wire the reporter alongside your normal CI reporter. Keep the output as an artifact, because historical duration is more useful than one run.

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: process.env.CI
    ? [
        ['blob'],
        ['./tests/support/duration-reporter.ts'],
      ]
    : [['html']],
});
\`\`\`

This reporter uses documented reporter concepts, but it is intentionally minimal. If your organization already stores test analytics in a database, emit the same data there instead. The important part is measuring the actual tail.

## Understand File-Level Sharding Versus Test-Level Sharding

Playwright's official sharding model supports \`--shard=x/y\`, such as \`--shard=1/4\`, to run a portion of the suite in a separate job. Without \`fullyParallel\`, Playwright generally shards at the file level. That means whole spec files are assigned to shards. If one file contains 45 tests and another contains 3, the shard distribution can be badly skewed.

When \`fullyParallel: true\` is enabled, Playwright can run individual tests in parallel across shards, which gives the runner finer granularity for balancing. This is often the best answer for uneven suites, but only if the tests are isolated. Tests in a file can no longer rely on order, shared mutation, or data created by another test in the same file.

| Mode | Distribution unit | Good fit | Risk |
| --- | --- | --- | --- |
| Default project parallelism | Spec files | Suites with many similarly sized files | Large files dominate shards |
| \`fullyParallel: true\` | Individual tests | Isolated tests with independent setup | Hidden test coupling is exposed |
| \`test.describe.configure({ mode: 'serial' })\` | Serial group remains ordered | True dependent flows or cleanup-sensitive cases | Creates an unavoidable tail |
| Manual CI groups | User-defined commands | Temporary migration or known heavy areas | Easy to drift from real durations |
| Separate projects | Browser, device, or tag dimensions | Cross-browser and config coverage | Multiplies total work |

Do not flip \`fullyParallel\` globally on a mature suite without auditing shared state. A file that logs in once in \`beforeAll\`, mutates the same account in several tests, and assumes previous tests already created records is not ready. You can enable full parallelism gradually at the project level or refactor high-value files first.

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium-isolated',
      use: { browserName: 'chromium' },
      fullyParallel: true,
      testMatch: /.*isolated.*\\.spec\\.ts/,
    },
    {
      name: 'chromium-legacy',
      use: { browserName: 'chromium' },
      testIgnore: /.*isolated.*\\.spec\\.ts/,
    },
  ],
});
\`\`\`

In your repo, write the regex normally. The design point is more important than the exact file naming: create an explicit lane for tests that are safe at individual-test granularity.

## Split Tail Files by User Journey, Not by Line Count

When file-level sharding is the bottleneck, the fastest repair is often splitting the largest spec files. Do not split mechanically every 300 lines. Split by user journey and shared setup boundary. A checkout file might become cart editing, shipping address validation, payment authorization, discount calculation, and order confirmation. Each file gets its own setup and can land on a different shard.

The split is worth doing when a file is slow because it contains many independent tests. It is not worth doing when the slowness comes from a single test. For one slow test, optimize setup, move lower-level coverage to API tests, or accept that it is a tail case.

| Large file pattern | Better split | Why it balances |
| --- | --- | --- |
| \`checkout.spec.ts\` with many independent paths | \`cart.spec.ts\`, \`shipping.spec.ts\`, \`payment.spec.ts\` | Different shards can own different journeys |
| One long happy-path test | Keep one file, optimize test | Splitting cannot divide one test |
| Admin CRUD file using one shared account | Split after account isolation | Otherwise tests still collide |
| Visual variants in one file | Split by component area or move to component tests | Reduces browser E2E tail |
| Data migration smoke plus UI checks | Separate migration and UI specs | Different setup and ownership |

Before splitting, capture the current timing and failure rate. After splitting, compare wall-clock time, retry count, and setup cost. A split that saves two minutes but doubles flakes is not progress.

\`\`\`bash
npx playwright test --shard=1/4
npx playwright test --shard=2/4
npx playwright test --shard=3/4
npx playwright test --shard=4/4
\`\`\`

Run the shards locally or in a temporary CI branch when you can. The local run will not perfectly match CI, but it catches obvious mistakes: test files excluded by patterns, serial dependencies, missing fixtures, and report paths that collide.

## Make Tests Safe for \`fullyParallel\`

\`fullyParallel\` is attractive because it gives Playwright finer distribution. It is also a forcing function for test isolation. Each test must create or own the state it needs, avoid global mutable objects, and clean up without deleting another test's records. Shared authentication can still work through storage state files, but shared user mutation often cannot.

A safe pattern is worker-scoped expensive setup plus test-scoped unique data. The worker can reuse a logged-in context or database namespace, while each test owns the entities it mutates.

\`\`\`ts
import { expect, test as base } from '@playwright/test';

type Fixtures = {
  uniqueProjectName: string;
};

const test = base.extend<Fixtures>({
  uniqueProjectName: async ({}, use, testInfo) => {
    const name = [
      'project',
      String(testInfo.parallelIndex),
      String(testInfo.retry),
      String(Date.now()),
    ].join('-');

    await use(name);
  },
});

test('project owner can rename a project', async ({ page, uniqueProjectName }) => {
  await page.goto('/projects/new');
  await page.getByLabel('Project name').fill(uniqueProjectName);
  await page.getByRole('button', { name: 'Create project' }).click();

  await page.getByRole('button', { name: 'Rename' }).click();
  await page.getByLabel('Project name').fill(uniqueProjectName + '-renamed');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText(uniqueProjectName + '-renamed')).toBeVisible();
});
\`\`\`

This example uses \`testInfo.parallelIndex\` to include the parallel slot in the name. It still includes a time component because the business object may survive cleanup after a failed run. In regulated or audit-heavy environments, use a run id from CI instead of a timestamp and store ownership metadata so cleanup is deterministic.

What people get wrong is making only the UI independent while leaving backend state shared. If all tests use \`qa-admin@example.test\` and mutate that user's preferences, full parallelism will produce confusing failures. The trace shows the UI did the right thing, but another test changed the same account between steps.

## Use Historical Duration to Choose Shard Count

Shard count should come from data. More shards reduce the parallelizable portion of the suite, but setup time, artifact upload, application boot, browser installation, and report merging remain. If each shard spends two minutes installing and three minutes testing, doubling shards will not halve the wall time.

Build a simple summary from duration artifacts. Group by file first, then by test title if \`fullyParallel\` is enabled. Look at p50, p90, slowest file, retry time, and idle time between the first and last shard finishing.

\`\`\`ts
import fs from 'node:fs';
import path from 'node:path';

type DurationRecord = {
  file: string;
  durationMs: number;
  status: string;
};

const inputDir = process.argv[2] ?? 'test-results/durations';
const totals = new Map<string, number>();

for (const entry of fs.readdirSync(inputDir)) {
  if (!entry.endsWith('.json')) {
    continue;
  }

  const records = JSON.parse(
    fs.readFileSync(path.join(inputDir, entry), 'utf8'),
  ) as DurationRecord[];

  for (const record of records) {
    totals.set(record.file, (totals.get(record.file) ?? 0) + record.durationMs);
  }
}

const rows = [...totals.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([file, durationMs]) => ({
    file,
    seconds: Math.round(durationMs / 1000),
  }));

console.table(rows);
\`\`\`

Once you know the slowest files, estimate whether splitting them changes the tail. If one file is 40 percent of the total wall time, increasing from four shards to eight may not help until that file is split or made fully parallel. If the slowest files are already small and evenly distributed, adding shards may be justified.

| Decision | Use when | Avoid when |
| --- | --- | --- |
| Add shards | Shards are balanced and machines have capacity | Setup overhead dominates |
| Split files | A few files dominate file-level shards | Slowness is one indivisible test |
| Enable \`fullyParallel\` | Tests are isolated or can be made isolated | Tests share ordered state |
| Move checks down the pyramid | Browser test repeats API or validation permutations | The browser behavior is the risk |
| Increase worker count per shard | Machines have idle CPU and memory | Browser contexts already saturate the runner |

Duration is not the only metric. A ten-minute suite with zero flakes is better than a six-minute suite that retries often and hides failures. Track retry count and failure distribution alongside wall time.

## Configure CI Shards Without Losing One Report

In CI, each shard usually runs as a separate job. Playwright's documented \`--shard=x/y\` syntax maps naturally to a matrix. Use the blob reporter in CI when you want to merge shard results into a single report with \`playwright merge-reports\`.

\`\`\`yaml
name: playwright

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --shard=\${{ matrix.shardIndex }}/\${{ matrix.shardTotal }}
        env:
          PW_SHARD: \${{ matrix.shardIndex }}-of-\${{ matrix.shardTotal }}
      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}
        with:
          name: blob-report-\${{ matrix.shardIndex }}
          path: blob-report
\`\`\`

Then add a merge job that downloads the blob artifacts into one directory and runs the documented merge command.

\`\`\`yaml
  merge:
    runs-on: ubuntu-latest
    needs:
      - test
    if: \${{ !cancelled() }}
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
      - run: npm ci
      - uses: actions/download-artifact@v5
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true
      - run: npx playwright merge-reports --reporter html ./all-blob-reports
      - uses: actions/upload-artifact@v4
        with:
          name: playwright-html-report
          path: playwright-report
\`\`\`

Keep shard metadata visible in logs and artifacts. When a failure only happens on shard 3 of 4, you need to know whether shard 3 consistently owns a specific file or whether full parallelism is distributing individual tests differently.

## Handle Serial Tests as Explicit Debt

Some tests are truly serial. A password reset flow may depend on a one-time token. A migration verification may need ordered steps. A destructive admin workflow may be safer as one scenario than several independent tests. Playwright supports serial grouping, but serial groups are an enemy of shard balance when they grow.

Treat serial sections as explicit debt with owners. They should be rare, named, and measured. If a serial group becomes the longest unit in the suite, no shard scheduler can split it for you. You either refactor the flow, move lower-level assertions out, or accept the tail.

\`\`\`ts
import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('password reset token lifecycle', () => {
  test('request reset email', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill('reset-user@example.test');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('status')).toContainText('sent');
  });

  test('use reset token once', async ({ page }) => {
    await page.goto('/reset-password?token=test-token');
    await page.getByLabel('New password').fill('CorrectHorse123!');
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page.getByRole('status')).toContainText('updated');
  });
});
\`\`\`

If you see a file with a serial group and many unrelated tests, split the unrelated tests out first. Keep the serial file as small as possible. The serial marker should be a local exception, not a blanket permission for shared state.

## A Failure Mode: Four Shards, One Twenty-Minute File

Imagine a suite with 220 Playwright tests across 28 files. CI runs four shards. Shards 1, 2, and 4 finish in seven minutes. Shard 3 takes twenty-three minutes. The team increases to six shards, but the run still takes twenty-one minutes. The slowest file is \`checkout-regression.spec.ts\`, which contains 38 tests and one shared \`beforeAll\` that creates a merchant, catalog, customer, and payment configuration.

The diagnosis is file-level imbalance. More shards cannot split that file. The next move is not another matrix size. The next move is to split the file by journey and remove the shared setup dependency. Create merchant and catalog fixtures that can run per worker or per test. Move tax calculation permutations to API tests. Keep one browser happy path for tax display. Then decide whether the resulting files are safe for \`fullyParallel\`.

After the split, duration might look like this:

| Area | Before | After | Notes |
| --- | ---: | ---: | --- |
| Checkout regression file | 20 minutes | Removed | Split by journey |
| Cart and discounts | Included in tail | 5 minutes | Independent data |
| Shipping validation | Included in tail | 4 minutes | No payment setup |
| Payment authorization | Included in tail | 7 minutes | Still expensive, now visible |
| Order confirmation | Included in tail | 3 minutes | Good candidate for full parallelism |

The payoff is not only speed. Failures become easier to read because a payment failure no longer appears inside a catch-all checkout file with dozens of unrelated checks.

## What to Ask an AI Agent to Change

AI coding agents can help split files, add reporters, and refactor fixtures, but the prompt must include the safety constraints. Ask for a measurement-first change, not a blind shard-count increase.

\`\`\`md
Improve Playwright shard balance for this repo.

Constraints:
- Do not change test behavior.
- Add a custom duration reporter that writes JSON artifacts in CI.
- Identify the top slow spec files from existing report artifacts if available.
- Split only files where tests are independent.
- Do not enable fullyParallel for tests that share accounts, queues, or ordered state.
- Keep Playwright blob reporting so shard reports can be merged.
- Include a short migration note for any file split.
\`\`\`

When reviewing the agent's diff, focus on hidden coupling. Did it move a shared \`beforeAll\` into several files without preserving data setup? Did it enable \`fullyParallel\` on a project that uses one global user? Did it change test selection patterns so some files no longer run? Did it remove report merging? These are more important than whether the matrix syntax looks tidy.

Agents are useful for the mechanical work, but humans still need to decide which workflows are allowed to run in parallel. Test isolation is a product and infrastructure fact, not just a TypeScript refactor.

## Frequently Asked Questions

### Why are my Playwright shards uneven even with the same number of files?

File count is a weak proxy for runtime. One file can contain dozens of slow browser flows, expensive setup, uploads, polling, or retries, while another file contains a few fast smoke checks. Without \`fullyParallel\`, Playwright distributes whole files across shards, so a single heavy file can dominate one shard. Collect duration by file and test before changing shard count. If the tail is caused by one large file, split it or refactor it before adding more CI jobs.

### Should I enable \`fullyParallel: true\` for every Playwright project?

Enable it only when tests are isolated enough to run independently. \`fullyParallel\` gives Playwright test-level granularity across shards, which can improve balance significantly, but it exposes hidden dependencies. Tests that share one mutable account, depend on file order, reuse records, or clean broad database state may fail when fully parallel. A pragmatic migration is to create a separate project or file pattern for isolated tests, prove the model there, then expand after fixing shared-state problems.

### How many shards should a CI suite use?

Use the smallest shard count that gives the wall-clock time you need without excessive setup overhead, flake rate, or infrastructure cost. Measure total test duration, setup time per job, slowest shard, retry time, and artifact overhead. If shards are balanced and machines have capacity, adding shards may help. If one file dominates the tail, adding shards will barely help. Revisit the count periodically because test mix, browser coverage, and CI machine size change over time.

### Does merging Playwright reports affect shard balancing?

Report merging does not change how tests are distributed, but it affects whether the sharded workflow is usable. Separate shard reports make debugging fragmented, especially when retries, traces, screenshots, and failures are spread across jobs. Playwright's blob reporter and \`merge-reports\` command let CI produce a combined report after all shards finish. Keep merged reporting in place while tuning balance so engineers can still inspect failures without hunting through every shard artifact.
`,
};
