import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Test Sharding and Parallel CI Guide (2026)',
  description:
    'Speed up Playwright suites with sharding and parallelism — workers, fullyParallel, --shard, blob reports, merge-reports, and a GitHub Actions matrix. Runnable configs.',
  date: '2026-06-21',
  category: 'Guide',
  content: `
# Playwright Test Sharding and Parallel CI Guide (2026)

When a Playwright suite grows past a few hundred tests, a single CI runner stops being good enough. A run that took ninety seconds when you had fifty tests now takes twenty-five minutes, and every pull request waits on it. The fix is not "buy a faster machine" — it is parallelism, and Playwright gives you two independent levers to pull. The first lever is **workers**: multiple test processes running concurrently on a single machine. The second lever is **sharding**: splitting the whole test suite into N slices and running each slice on a *separate* machine, then merging the results back into one report. Used together, a suite that runs in twenty-five minutes on one box can finish in under four minutes across eight runners.

This guide is a practical, runnable walkthrough of both levers. You will learn the difference between \`workers\` and \`fullyParallel\`, how \`test.describe.configure\` overrides parallelism per file, the exact \`--shard=1/4\` syntax and the math behind it, how the blob reporter plus \`merge-reports\` stitches sharded runs into a single HTML report, and a complete GitHub Actions matrix using \`strategy.matrix.shard\` with the right \`\${{ ... }}\` expressions. We will also be honest about the trade-offs: sharding adds artifact upload/download overhead and can surface flakiness that a serial run hid, so there is a point where adding more shards stops helping. Every config below is copy-paste ready for Playwright in 2026.

If you are setting up the surrounding infrastructure, pair this with our [Playwright global setup and teardown guide](/blog/playwright-global-setup-teardown-guide) for shared auth state, the [Playwright trace CLI analysis guide](/blog/playwright-trace-cli-analysis-guide-2026) for debugging the failures that parallelism exposes, and the [Playwright ARIA snapshot testing guide](/blog/playwright-aria-snapshot-testing-guide). If your tests touch a database, the companion [Testcontainers Postgres in Node.js guide](/blog/testcontainers-postgres-node-guide) shows how to give each shard its own real database. You can also browse ready-made automation [skills](/skills).

## Workers vs Sharding: Two Different Axes

The single most common confusion is treating workers and shards as the same thing. They are orthogonal.

**Workers** are processes on one machine. Set \`workers: 4\` and Playwright launches four Node processes, each pulling tests off a shared queue. They share the same filesystem, the same CPU, and the same \`localhost\`. Workers are bounded by the cores and memory of one runner — past roughly the number of physical cores, adding workers slows things down because of context switching and contention.

**Shards** are slices of the test list distributed across *different* machines (CI jobs). \`--shard=2/4\` means "this machine runs the second quarter of all tests." Each shard is a completely separate process invocation, usually on its own runner, with its own CPU budget. Shards scale horizontally — you are limited by how many CI runners you are willing to pay for, not by one machine's hardware.

The mental model: **workers parallelize within a machine, shards parallelize across machines.** You combine them. Eight shards each running four workers gives you up to thirty-two tests executing at once.

| Dimension | Workers | Shards |
|---|---|---|
| Unit of parallelism | OS process on one machine | Slice of the suite across machines |
| Configured by | \`workers\` in config or \`--workers=N\` | \`--shard=index/total\` CLI flag |
| Bounded by | CPU cores / RAM of one runner | Number of CI runners available |
| Shares localhost / FS | Yes | No (separate machines) |
| Report output | Single report natively | Blob per shard, then \`merge-reports\` |
| Best for | Using a multi-core runner fully | Cutting wall-clock time across a fleet |
| Cost model | One runner | N runners (N x minutes) |

## Configuring Workers and fullyParallel

By default Playwright runs **test files** in parallel but **tests within a single file** serially. The \`fullyParallel: true\` option flips that so individual tests inside each file also run concurrently across workers — this is what unlocks the biggest speedups.

Here is a baseline \`playwright.config.ts\`:

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Run every test (not just every file) in parallel.
  fullyParallel: true,
  // Fail the build on CI if you accidentally left test.only in the source.
  forbidOnly: !!process.env.CI,
  // Retry flaky tests on CI only; locally a failure should fail fast.
  retries: process.env.CI ? 2 : 0,
  // Cap workers on CI for predictable, reproducible timing.
  // Locally, undefined lets Playwright use ~half the logical cores.
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? 'blob' : 'html',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
\`\`\`

A subtle but important detail: each browser **project** multiplies the test count. With three projects, two hundred test functions become six hundred runnable tests. Sharding divides that full expanded list, so projects and shards compose naturally.

You can also set workers as a percentage so the config adapts to whatever hardware the runner has:

\`\`\`typescript
export default defineConfig({
  // Use half of the available logical CPUs as workers.
  workers: '50%',
});
\`\`\`

## Per-File Parallelism with test.describe.configure

Sometimes a group of tests *cannot* run in parallel — they mutate shared state, log in as the same singleton user, or hit a rate-limited endpoint. Override parallelism at the file or describe-block level with \`test.describe.configure\`:

\`\`\`typescript
import { test, expect } from '@playwright/test';

// Force this whole file to run serially even when fullyParallel is true.
test.describe.configure({ mode: 'serial' });

test('step 1: create the order', async ({ page }) => {
  await page.goto('/orders/new');
  await page.getByLabel('Item').fill('Widget');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('Order created')).toBeVisible();
});

test('step 2: order depends on step 1 succeeding', async ({ page }) => {
  await page.goto('/orders/latest');
  await expect(page.getByText('Widget')).toBeVisible();
});
\`\`\`

In \`serial\` mode, if step 1 fails, step 2 is skipped — the tests are a dependent chain. The opposite override is \`mode: 'parallel'\`, which forces a file's tests to spread across workers even if the project default were serial:

\`\`\`typescript
import { test } from '@playwright/test';

test.describe.configure({ mode: 'parallel' });

test.describe('independent dashboard widgets', () => {
  test('revenue card renders', async ({ page }) => {
    /* ... */
  });
  test('users card renders', async ({ page }) => {
    /* ... */
  });
});
\`\`\`

There is also \`test.describe.configure({ retries: 3, timeout: 60_000 })\` to scope retries and timeouts to one block. Use \`serial\` sparingly — every serial file is a chunk of work that cannot be parallelized and becomes a tail in your timing.

## The --shard Flag and the Math Behind It

The \`--shard\` flag takes the form \`--shard=<index>/<total>\`, where \`index\` is **1-based** and must be between 1 and \`total\`. To run the third of four slices:

\`\`\`bash
npx playwright test --shard=3/4
\`\`\`

Playwright takes the complete list of tests (after expanding projects and applying any filters), then partitions it into \`total\` contiguous groups and runs only group \`index\`. The partitioning is deterministic for a given test list, so the same shard index always gets the same tests across runs — important for reproducibility.

The math is simply integer division with the remainder spread across the early shards. If you have 803 tests and \`--shard=.../4\`:

| Shard | Tests assigned | Notes |
|---|---|---|
| 1/4 | 201 | Gets one extra to absorb the remainder (803 mod 4 = 3) |
| 2/4 | 201 | Also absorbs a remainder unit |
| 3/4 | 201 | Also absorbs a remainder unit |
| 4/4 | 200 | Base size |

Two practical rules fall out of this. First, **shard count should not exceed test count** — if you ask for ten shards but have eight tests, two shards run nothing and you pay for idle runners. Second, **balance is by count, not duration**. Playwright shards by number of tests, so if all your slow tests happen to land in one shard, that shard becomes the bottleneck. Playwright's sharding does try to distribute by file across shards to reduce this, but if one file is dramatically slower than the rest, consider splitting it or using a custom sharding strategy.

To run a single shard with multiple workers and a blob report:

\`\`\`bash
npx playwright test --shard=2/4 --workers=4 --reporter=blob
\`\`\`

## Blob Reporter and merge-reports

Each shard runs in isolation and produces its own results. If every shard emitted an HTML report you would get four disconnected reports and no single source of truth. The **blob reporter** solves this: it writes a machine-readable \`.zip\` of raw results that can later be merged. The flow is:

1. Each shard runs with \`--reporter=blob\`, producing \`blob-report/report-<shard>.zip\`.
2. CI uploads each shard's blob report as an artifact.
3. A final "merge" job downloads all blob artifacts into one directory.
4. \`npx playwright merge-reports\` reads them and emits one combined HTML report (or any other reporter).

Configure the blob reporter so each shard names its output uniquely. Playwright automatically appends the shard index to the blob filename, but you can set the output directory explicitly:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: process.env.CI
    ? [['blob', { outputDir: 'blob-report' }]]
    : [['html', { open: 'never' }]],
});
\`\`\`

Then in the merge step:

\`\`\`bash
# After downloading every shard's blob-report/*.zip into ./all-blob-reports
npx playwright merge-reports --reporter html ./all-blob-reports
\`\`\`

\`merge-reports\` can emit multiple reporters at once, which is handy for posting a summary to CI while keeping the full HTML:

\`\`\`bash
npx playwright merge-reports \\
  --reporter html \\
  --reporter github \\
  ./all-blob-reports
\`\`\`

The merged report correctly aggregates pass/fail counts, retries, and flaky markers across all shards, and traces/screenshots from any shard are browsable in the single HTML output.

## A Complete GitHub Actions Matrix

This is the canonical sharded CI setup: one matrixed job that runs each shard in parallel, plus a dependent merge job that always runs (even if a shard failed) so you still get a report. Note the \`\${{ ... }}\` expressions — these are GitHub Actions context references, not Playwright syntax.

\`\`\`yaml
name: Playwright (sharded)

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    name: Shard \${{ matrix.shardIndex }} of \${{ matrix.shardTotal }}
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests (this shard)
        run: npx playwright test --shard=\${{ matrix.shardIndex }}/\${{ matrix.shardTotal }}

      - name: Upload blob report
        if: \${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-\${{ matrix.shardIndex }}
          path: blob-report/
          retention-days: 1

  merge-reports:
    name: Merge reports
    # Run even if some shards failed, so we still get a combined report.
    if: \${{ !cancelled() }}
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Download all blob reports
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge into one HTML report
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - name: Upload combined HTML report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-html-report
          path: playwright-report/
          retention-days: 14
\`\`\`

Key details. \`fail-fast: false\` is essential — without it, the moment one shard fails GitHub cancels the rest, and you lose visibility into other failures. \`if: \${{ !cancelled() }}\` on the upload and merge steps means you still get a report even when tests failed (a green build that uploaded nothing is useless for debugging). The merge job uses \`needs: [test]\` so it waits for every shard, and \`pattern: blob-report-*\` with \`merge-multiple: true\` collapses all the per-shard artifacts into one folder.

To change the shard count you edit two places: the \`shardIndex\` array and the \`shardTotal\` value. To scale to eight shards, set \`shardIndex: [1, 2, 3, 4, 5, 6, 7, 8]\` and \`shardTotal: [8]\`.

## When Sharding Actually Helps (and When It Doesn't)

Sharding is not free. Every shard pays a fixed startup cost: checkout, \`npm ci\`, and \`npx playwright install --with-deps\` (downloading browsers) often runs forty to ninety seconds *before a single test executes*. There is also the merge job's own startup plus artifact upload and download time. If your entire test suite finishes in ninety seconds, splitting it into eight shards can make the *wall-clock* time **longer**, because the per-shard fixed overhead dwarfs the test execution savings.

A rough decision rule:

| Total serial test time | Recommendation |
|---|---|
| Under 2 minutes | Don't shard. Use \`fullyParallel\` with workers on one runner. |
| 2 to 8 minutes | 2 to 3 shards, each with multiple workers. |
| 8 to 20 minutes | 4 to 6 shards. |
| Over 20 minutes | 6 to 10+ shards; revisit if the merge job becomes the tail. |

Two ways to cut the fixed overhead so sharding pays off sooner: cache the Playwright browser binaries between runs (key the cache on the Playwright version), and cache \`node_modules\` via \`actions/setup-node\`'s built-in npm cache. With browsers cached, the per-shard overhead can drop under fifteen seconds, which dramatically widens the range where sharding is worth it.

The other limiting factor is **diminishing returns**: doubling shards from four to eight roughly halves the *test* portion of the time but does nothing for the fixed overhead, so you approach an asymptote. Once the slowest shard plus the merge job equals your overhead floor, more shards just cost money.

## Flakiness Under Parallelism

Parallelism is the great revealer of hidden test coupling. Tests that passed serially can fail under \`fullyParallel\` or sharding because they were secretly depending on shared state — a database row another test created, a logged-in session, a fixed port, or execution order. Sharding compounds this because each shard is a fresh machine that does not see state created by other shards.

Common causes and fixes:

- **Shared database rows.** Two parallel tests both insert a user with email \`test@example.com\` and collide on a unique constraint. Fix: generate unique data per test (\`\\\`user-\\\${Date.now()}-\\\${Math.random()}@example.com\\\`\`), or give each worker its own database. See the [Testcontainers Postgres guide](/blog/testcontainers-postgres-node-guide) for per-worker databases.
- **Shared auth state mutated mid-test.** A test that changes the password of the shared login user breaks every other parallel test. Fix: per-worker fixtures that create an isolated user, set up via [global setup](/blog/playwright-global-setup-teardown-guide).
- **Fixed ports / single dev server.** Two workers both bind \`localhost:3000\`. Fix: let Playwright's \`webServer\` manage the server, or use \`reuseExistingServer\`.
- **Order dependence.** "Test B only passes if Test A ran first." Fix: make each test set up its own preconditions, or mark the file \`mode: 'serial'\` as a temporary measure.

Use \`retries: 2\` on CI to absorb genuinely intermittent network flakiness, but treat a test that *only* fails under parallelism as a real bug in test isolation, not as flake to be retried away. When a sharded run fails, the merged HTML report plus the trace viewer is your fastest path to the cause — the [trace CLI analysis guide](/blog/playwright-trace-cli-analysis-guide-2026) covers reading those traces.

## CI Time: Before and After

Here is a representative transformation for a real suite of roughly eight hundred expanded tests (after project multiplication) on standard \`ubuntu-latest\` runners, with browser binaries cached.

| Configuration | Runners | Workers each | Wall-clock | Cost (runner-min) |
|---|---|---|---|---|
| Serial, 1 worker | 1 | 1 | ~26 min | 26 |
| \`fullyParallel\`, 4 workers | 1 | 4 | ~8 min | 8 |
| 4 shards, 4 workers | 4 | 4 | ~3.5 min | ~16 (incl. merge) |
| 8 shards, 4 workers | 8 | 4 | ~2.5 min | ~24 (incl. merge) |

The pattern is clear: going from serial to \`fullyParallel\` on one machine is the cheapest, highest-leverage change — three-fold faster at no extra runner cost. Sharding then buys further wall-clock reduction at a roughly linear increase in total runner-minutes (you pay for N machines plus the merge job). The jump from four to eight shards in this example shaved only a minute off wall-clock while increasing cost fifty percent — a clear case of diminishing returns. The sweet spot for this suite is four shards with four workers each.

The right tuning is suite-specific, so measure. Add a timing summary to your merge job and watch the slowest-shard duration over a week; if one shard is consistently the tail, your tests are unbalanced by duration and you should split the heavy file rather than add shards.

## Frequently Asked Questions

### What is the difference between workers and shards in Playwright?

Workers are parallel processes on a single machine that pull tests from a shared queue, bounded by that machine's CPU cores. Shards split the entire test suite into slices distributed across separate machines using \`--shard=index/total\`. Workers parallelize within one runner; shards parallelize across many runners. You combine them — for example eight shards each running four workers gives up to thirty-two concurrent tests.

### What does fullyParallel do in playwright.config.ts?

By default Playwright runs test files in parallel but tests inside a single file serially. Setting \`fullyParallel: true\` makes individual tests within each file also run concurrently across workers. This is usually the single biggest speedup because most suites have many tests per file. Override it for specific files that need serial execution using \`test.describe.configure({ mode: 'serial' })\`.

### How does the --shard flag syntax work?

The flag is \`--shard=index/total\` where index is 1-based, so valid values for four shards are 1/4, 2/4, 3/4, and 4/4. Playwright takes the full expanded test list, partitions it into \`total\` contiguous groups, and runs only the group matching \`index\`. Partitioning is deterministic, so the same index always receives the same tests across runs.

### How do I merge sharded Playwright reports into one?

Run each shard with \`--reporter=blob\`, which writes a machine-readable zip per shard. Upload each blob as a CI artifact, then in a final job download them all into one folder and run \`npx playwright merge-reports --reporter html ./all-blob-reports\`. The merged report correctly aggregates pass/fail counts, retries, flaky markers, and traces from every shard into a single browsable HTML report.

### How many shards should I use?

Match shard count to total serial test time and never exceed your test count. Under two minutes, do not shard — use \`fullyParallel\` on one machine. From two to eight minutes use two to three shards; eight to twenty minutes use four to six; over twenty minutes use six to ten or more. Watch for diminishing returns: each shard pays fixed startup overhead, so more shards eventually stop helping.

### Why do tests pass serially but fail when sharded or parallel?

Almost always hidden test coupling. The tests shared state — a database row, an auth session, a fixed port, or execution order — that only existed when they ran one after another. Sharding makes it worse because each shard is a fresh machine. Fix it with per-test unique data, per-worker fixtures and databases, and Playwright-managed web servers rather than retrying the flake away.

### Does sharding slow down small test suites?

Yes. Every shard pays a fixed cost for checkout, dependency install, and browser download before any test runs, plus the merge job's own overhead. For a suite that finishes in under ninety seconds, splitting into many shards can make wall-clock time longer. Cache the Playwright browsers and node_modules to shrink that overhead, and only shard once serial time clears a couple of minutes.

### Can I shard across different machines instead of workers on one machine?

Yes — that is exactly what sharding is for. Workers are limited to one machine's cores, but shards run on completely separate CI runners with independent CPU budgets. Use a CI matrix (for example \`strategy.matrix.shardIndex\` in GitHub Actions) to launch one job per shard, then a dependent merge job. This scales horizontally to as many runners as you are willing to pay for.

## Conclusion

Playwright gives you two levers and the biggest wins come from using them in order: first turn on \`fullyParallel\` and let workers saturate a single multi-core runner, then reach for \`--shard\` to spread the suite across machines when serial time crosses a couple of minutes. Wire the blob reporter and \`merge-reports\` into a GitHub Actions matrix with \`fail-fast: false\` and an \`if: \${{ !cancelled() }}\` merge job, cache your browsers to kill the per-shard overhead, and treat any test that only fails under parallelism as a real isolation bug rather than flake. Measure your slowest-shard time weekly and stop adding shards when the merge job becomes the tail.

Ready to level up the rest of your testing stack? Explore the QA skills directory at [/skills](/skills) for production-ready Playwright fixtures, CI templates, and database-isolation patterns you can drop straight into your suite — including the per-worker database setup in the [Testcontainers Postgres guide](/blog/testcontainers-postgres-node-guide).
`,
};
