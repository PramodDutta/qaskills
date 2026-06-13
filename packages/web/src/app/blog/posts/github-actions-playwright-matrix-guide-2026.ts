import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'GitHub Actions Playwright Matrix & Sharding Guide (2026)',
  description:
    'Run Playwright in CI with GitHub Actions: a complete matrix workflow with browser and shard parallelism, caching, blob report merge, and HTML artifacts.',
  date: '2026-06-13',
  category: 'Guide',
  content: `
# GitHub Actions Playwright Matrix & Sharding Guide (2026)

Running Playwright in CI is easy to get wrong. The naive approach works for a handful of tests: install the dependencies, install the browsers, run \`npx playwright test\`, and hope the job finishes before your team gets impatient. But the moment your suite grows past a few hundred tests, a single-runner GitHub Actions job becomes the slowest, flakiest, most expensive part of your pipeline. A 25-minute end-to-end run blocks every pull request, burns CI minutes, and trains your engineers to ignore failures because "it's probably just flaky." The fix is not to write fewer tests. The fix is to run them in parallel across a matrix of browsers, operating systems, and shards, then merge the results back into a single coherent report.

This guide is a complete, copy-pasteable reference for running Playwright in GitHub Actions the way large teams actually do it in 2026. We start with the simplest possible workflow and progressively layer on the techniques that matter: \`strategy.matrix\` to fan out across browsers and shards, \`npx playwright install --with-deps\` to provision browser binaries and system libraries, dependency and browser caching to shave minutes off every run, blob report merging so that sharded results combine into one HTML report, artifact uploads so failures are debuggable, \`fail-fast: false\` so one shard failing does not cancel the rest, and an OS matrix so you catch the Chromium-on-Windows bug before your users do. Every snippet here is real YAML you can drop into \`.github/workflows/playwright.yml\` and run today. By the end you will understand not just what to paste, but why each line is there and what breaks if you remove it.

## Why CI Configuration Matters for Playwright

Playwright is fast, but end-to-end tests are inherently the slowest tests you own. Each one spins up a real browser, navigates real pages, waits on real network calls, and asserts on a real DOM. When you have a thousand of those, total wall-clock time is dominated by how many of them can run at once. A single GitHub-hosted runner gives you a fixed number of CPU cores, and Playwright's built-in worker parallelism saturates them quickly. Past that point, the only way to go faster is to add more machines and split the suite across them. That is what sharding does.

The second reason CI configuration matters is determinism. Tests that pass on your laptop and fail in CI are the single biggest source of distrust in a test suite. Most of those failures trace back to environment differences: missing system libraries, a different browser version, a headed-versus-headless rendering quirk, or a race condition that only surfaces under the resource contention of a shared runner. A correct CI setup eliminates the avoidable causes so that a red build means a real bug. For deeper Playwright fundamentals beyond CI, the [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) covers the framework itself, and you can browse curated [QA skills](/skills) for agent-ready testing playbooks.

## The Minimal Workflow (and Why It Is Not Enough)

Here is the smallest workflow that runs Playwright in CI. It is the right starting point and a fine baseline for a small project.

\`\`\`yaml
name: Playwright Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      - name: Run Playwright tests
        run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}
        name: Upload report
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
\`\`\`

This works, but it runs every test on one machine. As the suite grows, run time grows linearly and there is no isolation between browsers. The rest of this guide replaces this single job with a parallel matrix that finishes in a fraction of the time.

## Understanding strategy.matrix for Playwright

GitHub Actions' \`strategy.matrix\` is the mechanism that turns one job definition into many parallel jobs. Each combination of matrix values becomes its own runner. For Playwright there are two axes you almost always want to fan out across: the browser project (Chromium, Firefox, WebKit) and the shard index (1 of N, 2 of N, and so on). You can multiply both, which gives you browser-by-shard parallelism.

The key Playwright flag is \`--shard\`. When you pass \`--shard=2/4\`, Playwright deterministically splits the full list of tests into four roughly equal buckets and runs only the second bucket. Because the split is deterministic and based on the test list rather than timing, every shard sees a stable, non-overlapping slice. Combined with the matrix, you launch N runners, each handling 1/N of the suite.

| Concept | GitHub Actions construct | Playwright flag | Effect |
|---|---|---|---|
| Run across browsers | \`matrix.project\` | \`--project=chromium\` | One job per browser engine |
| Split suite into pieces | \`matrix.shardIndex\` | \`--shard=\\\${i}/\\\${n}\` | One job per N-th slice of tests |
| Run on multiple OSes | \`matrix.os\` | (runner image) | Catch OS-specific rendering bugs |
| Keep all jobs running | \`fail-fast: false\` | n/a | One red shard does not cancel siblings |
| Worker parallelism per job | n/a | \`--workers\` | Threads inside a single runner |

## A Complete Sharded Matrix Workflow

This is the workhorse. It shards the suite into four parts and runs each shard as its own runner, with dependency caching, browser caching, blob reporting, and per-shard artifact upload. A separate downstream job merges the blob reports into a single HTML report after all shards finish.

\`\`\`yaml
name: Playwright CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    name: Test (shard \${{ matrix.shardIndex }}/\${{ matrix.shardTotal }})
    runs-on: ubuntu-latest
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
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Get installed Playwright version
        id: playwright-version
        run: echo "version=$(npm ls @playwright/test --json | jq -r '.dependencies."@playwright/test".version')" >> "$GITHUB_OUTPUT"

      - name: Cache Playwright browsers
        id: playwright-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-\${{ runner.os }}-\${{ steps.playwright-version.outputs.version }}

      - name: Install Playwright browsers (cache miss)
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps

      - name: Install only system deps (cache hit)
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps

      - name: Run Playwright tests
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
    if: \${{ !cancelled() }}
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Download blob reports
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge into HTML report
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - name: Upload HTML report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-html-report
          path: playwright-report/
          retention-days: 14
\`\`\`

There is a lot happening here, so the next sections unpack each technique individually.

## Configuring the Blob Reporter

The merge step only works if each shard writes its results in the \`blob\` format, which is Playwright's intermediate machine-readable report designed precisely for cross-shard merging. You enable it in \`playwright.config.ts\`. The idiomatic pattern is to use the blob reporter only when running in CI, and a human-friendly list or HTML reporter locally.

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'blob' : 'html',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
\`\`\`

When \`reporter: 'blob'\` is active, each shard produces a \`blob-report/report-<hash>.zip\`. The merge job downloads all of them and runs \`playwright merge-reports --reporter html\`, which reconstructs a single HTML report as if the whole suite had run on one machine. The deep dive on this format lives in the [Playwright blob reporter guide](/blog/playwright-blob-reporter-guide).

## Caching Dependencies and Browsers

Caching is where a slow pipeline becomes a fast one. There are two distinct things to cache and they behave differently.

The first is your npm dependencies. The \`actions/setup-node@v4\` action with \`cache: npm\` handles this automatically by hashing your lockfile and restoring \`node_modules\` resolution data. You get this for free with one line.

The second is the Playwright browser binaries, which live in \`~/.cache/ms-playwright\` and are several hundred megabytes. Re-downloading Chromium, Firefox, and WebKit on every run is the single biggest waste in an uncached pipeline. The trick is to key the cache on the exact Playwright version, because browser binaries are version-locked. When the version changes, the key changes, the cache misses, and you reinstall. When it is unchanged, you restore the binaries and only run \`playwright install-deps\` to install the operating system libraries (which are not cached because they live in system paths).

| Cache target | Path | Cache key basis | Typical time saved |
|---|---|---|---|
| npm modules | lockfile-derived | \`package-lock.json\` hash | 20-60 seconds |
| Playwright browsers | \`~/.cache/ms-playwright\` | Playwright version | 60-120 seconds |
| System libraries | system paths (not cached) | reinstalled each run | n/a |

Caching browsers but forgetting \`playwright install-deps\` on a cache hit is the most common mistake. The binaries restore fine, but they fail to launch because the underlying \`libnss3\`, \`libatk\`, and friends are missing on a fresh runner. Always run the deps installer even when the browser cache hits.

## Why fail-fast Must Be False

By default, \`strategy.fail-fast\` is \`true\`, which means the instant any matrix job fails, GitHub cancels all the others. For Playwright sharding this is exactly wrong. If shard 2 hits a real failure, you want shards 1, 3, and 4 to keep running so you get a complete picture of what is broken in a single run, rather than rerunning the whole matrix to discover the next failure. Setting \`fail-fast: false\` trades a few wasted CI minutes on a failing build for a complete failure report, which almost always saves more engineering time than it costs.

The same reasoning applies to the merge job's \`if: \${{ !cancelled() }}\` guard. You want the HTML report to be produced even when some shards failed, because a failure report you cannot read is useless. The guard ensures the merge runs as long as the workflow was not explicitly cancelled, gathering whatever blob reports exist.

## Adding a Browser and OS Matrix

Sharding splits one browser's suite across machines. A project matrix runs the whole suite once per browser engine. An OS matrix runs it per operating system. You can combine all three, but be deliberate: the total job count is the product of every axis, and that multiplies your CI cost. A common, sane configuration runs full browser coverage on Linux for every PR, and adds Windows and macOS coverage only on the main branch or nightly.

\`\`\`yaml
jobs:
  test:
    name: \${{ matrix.os }} / \${{ matrix.project }} / shard \${{ matrix.shardIndex }}
    runs-on: \${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest]
        project: [chromium, firefox, webkit]
        shardIndex: [1, 2]
        shardTotal: [2]
        include:
          - os: windows-latest
            project: chromium
            shardIndex: 1
            shardTotal: 1
          - os: macos-latest
            project: webkit
            shardIndex: 1
            shardTotal: 1
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps \${{ matrix.project }}
      - name: Run tests
        run: npx playwright test --project=\${{ matrix.project }} --shard=\${{ matrix.shardIndex }}/\${{ matrix.shardTotal }}
      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}
        with:
          name: blob-\${{ matrix.os }}-\${{ matrix.project }}-\${{ matrix.shardIndex }}
          path: blob-report/
\`\`\`

The \`include\` block is how you add specific combinations without multiplying the entire matrix. Here, Windows runs only Chromium and macOS runs only WebKit, while Linux runs the full cross-product of browsers and shards. This concentrates expensive non-Linux runners on the cases that actually catch OS-specific bugs. For the broader strategy of dividing work across runners, the [Playwright parallel and sharding execution guide](/blog/playwright-parallel-sharding-execution-guide) goes further on tuning worker counts versus shard counts.

## Handling Secrets and Environment Variables

Real E2E suites need configuration: a base URL, test-account credentials, an API token. In GitHub Actions you inject these through the \`env\` key, reading from repository or environment secrets. Never hardcode credentials in the workflow file.

\`\`\`yaml
      - name: Run Playwright tests
        env:
          BASE_URL: \${{ vars.BASE_URL }}
          TEST_USER: \${{ secrets.TEST_USER }}
          TEST_PASSWORD: \${{ secrets.TEST_PASSWORD }}
          API_TOKEN: \${{ secrets.API_TOKEN }}
        run: npx playwright test --shard=\${{ matrix.shardIndex }}/\${{ matrix.shardTotal }}
\`\`\`

Use \`vars\` for non-sensitive values like a staging URL and \`secrets\` for credentials. GitHub automatically masks secret values in logs, but it cannot mask a token you accidentally print yourself, so be careful with debug output. For workflows that authenticate once and reuse the storage state, save the authenticated session as a setup project artifact and load it in dependent shards.

## Sharding Math: How Many Shards Do You Need?

The right shard count is a balance. Too few shards and run time stays high. Too many and you pay a fixed per-shard overhead (checkout, install, browser provisioning) that eventually dominates, so adding shards stops helping and starts hurting. A useful rule of thumb is to target a per-shard run time of three to six minutes of actual test execution, then size the shard count so the slowest shard lands in that window.

| Suite size (tests) | Single-runner time | Suggested shards | Approx sharded time |
|---|---|---|---|
| Under 100 | ~3 min | 1 (no sharding) | ~3 min |
| 100 to 400 | ~10 min | 2 to 3 | ~4 min |
| 400 to 1000 | ~25 min | 4 to 6 | ~5 min |
| 1000 to 3000 | ~60 min | 8 to 12 | ~6 min |
| 3000+ | 90 min+ | 12 to 20 | ~7 min |

These are starting points, not laws. Measure your own per-shard overhead and slowest-shard time, then adjust. Note that GitHub-hosted runners have concurrency limits per account tier, so requesting twenty shards does not help if only ten can run simultaneously.

## Debugging Failures from CI

When a shard goes red, you need the failure artifacts to diagnose it without rerunning locally. The configuration above already captures traces (\`trace: 'on-first-retry'\`), screenshots, and videos on failure, all of which get bundled into the blob report and merged into the HTML report. Download the \`playwright-html-report\` artifact, open it, and click into the failing test to see the trace viewer with a full timeline, network log, DOM snapshots, and console output.

For flaky failures specifically, the two retries configured in CI mean a test that passes on retry is reported as flaky rather than failed, surfacing instability without blocking the merge. The trace from the first (failed) attempt is preserved, so you can see exactly what differed. Treat a steadily rising flaky count as a signal to investigate before it erodes trust in the suite. For the end-to-end CI design around these tests, see the [CI/CD testing pipeline with GitHub Actions guide](/blog/cicd-testing-pipeline-github-actions).

## Optimizing Cost and Run Time

CI minutes are real money, and Playwright matrices can spend a lot of them. A few levers keep the bill in check without sacrificing coverage. Run the full browser-by-shard matrix on pull requests targeting main, but restrict the expensive Windows and macOS legs to nightly schedules or the main branch only. Cache aggressively so provisioning is near-instant on a cache hit. Use \`if: github.event_name == 'pull_request'\` conditionals to skip heavy legs on draft PRs. And consider concurrency cancellation so a new push to the same PR cancels the in-flight run of the previous push.

\`\`\`yaml
concurrency:
  group: playwright-\${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true
\`\`\`

This single block prevents stacking five redundant runs when someone pushes five commits in a minute. Each new push cancels the previous in-flight run for that branch, which can dramatically cut wasted minutes on active feature branches.

## Frequently Asked Questions

### How do I run Playwright tests in parallel on GitHub Actions?

Use \`strategy.matrix\` with a \`shardIndex\` and \`shardTotal\`, then pass \`--shard=\${{ matrix.shardIndex }}/\${{ matrix.shardTotal }}\` to \`npx playwright test\`. Each matrix value becomes its own runner handling one slice of the suite. Set \`fail-fast: false\` so one failing shard does not cancel the others, and add a downstream job that merges the blob reports into a single HTML report.

### What does npx playwright install --with-deps do in CI?

It downloads the browser binaries for Chromium, Firefox, and WebKit and also installs the underlying operating-system libraries those browsers need to launch, such as \`libnss3\` and \`libatk\`. The \`--with-deps\` flag combines the browser download and the \`apt-get\` system-dependency install into one command, which is exactly what a fresh CI runner needs since it has neither the browsers nor the libraries.

### How do I cache Playwright browsers in GitHub Actions?

Cache the \`~/.cache/ms-playwright\` directory with \`actions/cache@v4\`, keying on the exact Playwright version so the cache invalidates when you upgrade. On a cache hit, skip the browser download but still run \`npx playwright install-deps\` to install the system libraries, which live in system paths and are not part of the cached directory. This typically saves 60 to 120 seconds per job.

### How do I merge Playwright reports across shards?

Configure \`reporter: 'blob'\` in your Playwright config so each shard writes a blob report. Upload each shard's \`blob-report/\` directory as an artifact. In a separate job that runs after all shards finish, download every blob artifact, then run \`npx playwright merge-reports --reporter html ./all-blob-reports\` to reconstruct one combined HTML report covering the entire suite.

### Why should fail-fast be set to false for Playwright sharding?

With \`fail-fast: true\` (the default), GitHub cancels every other matrix job the instant one fails, so you only learn about the first failure and must rerun to find the rest. Setting \`fail-fast: false\` lets all shards finish, giving you a complete failure report in a single run. The few wasted minutes on a failing build are almost always cheaper than rerunning the whole matrix.

### How many shards should I use for my Playwright suite?

Target three to six minutes of actual test execution per shard, then size the shard count so your slowest shard lands in that window. Per-shard overhead (checkout, install, browser provisioning) is fixed, so adding shards eventually stops helping. As a rough guide: 2 to 3 shards for a few hundred tests, 4 to 6 for under a thousand, and 8 to 12 for several thousand. Always measure and adjust.

### Can I run Playwright on Windows and macOS in the same workflow?

Yes. Add an \`os\` axis to your matrix or use the \`include\` block to add specific OS-and-browser combinations without multiplying the entire matrix. Because non-Linux runners are slower and more expensive, a common pattern is to run full browser coverage on Linux for every PR and add Windows-Chromium and macOS-WebKit legs only on the main branch or a nightly schedule.

## Conclusion

A correct Playwright CI setup is the difference between a test suite your team trusts and one they route around. The building blocks are straightforward once you see them assembled: a \`strategy.matrix\` that shards the suite across runners, \`npx playwright install --with-deps\` to provision browsers and system libraries, version-keyed caching to make provisioning near-free on a hit, the blob reporter plus a merge job to recombine sharded results into one readable HTML report, \`fail-fast: false\` so a single red shard does not blind you to the others, and an OS matrix to catch platform-specific bugs before users do. Start from the minimal workflow, add sharding when run time crosses ten minutes, add caching immediately because it is free wins, and add OS coverage when you actually ship to those platforms. Browse the [QA skills directory](/skills) for ready-to-use testing playbooks, and pair this with the [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) to round out your end-to-end testing practice.
`,
};
