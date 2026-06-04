import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Blob Reporter: Merge Sharded Reports 2026',
  description:
    'Master the Playwright blob reporter to merge sharded CI test reports into one HTML report. Learn merge-reports, mergeHTMLReports, and CI sharding patterns.',
  date: '2026-06-02',
  category: 'Reference',
  content: `
# Playwright Blob Reporter: Merge Sharded Reports in 2026

When your Playwright suite grows past a few hundred tests, running everything in a single CI job becomes painfully slow. The standard answer is sharding: split the suite across multiple parallel machines so each one runs a fraction of the tests. But sharding introduces a new problem -- each shard produces its own isolated report. A developer who opens the report from shard 3 of 8 sees only the tests that happened to run on that machine. There is no single source of truth for the whole run.

The **blob reporter** solves exactly this. Introduced in Playwright 1.37 and now the default mechanism for distributed reporting, the blob reporter writes a compact, machine-readable archive of everything a shard did -- test results, attachments, traces, screenshots, timing, stdout, and stderr. After all shards finish, you download every blob, run \`npx playwright merge-reports\`, and Playwright stitches them back into one unified report as if the entire suite had run on a single machine.

This guide is a complete reference to the Playwright blob reporter for 2026. You will learn how the blob format works, how to configure it correctly in \`playwright.config.ts\`, how to wire it into a sharded GitHub Actions or GitLab CI pipeline, how to merge blobs into HTML, JUnit, or JSON output, and how to debug the most common failure modes. Every code sample is runnable TypeScript or YAML you can paste directly into your project. By the end you will have a CI pipeline that runs eight shards in parallel and produces a single, trustworthy HTML report on every push.

---

## Key Takeaways

- **The blob reporter** produces a \`.zip\` archive per shard containing all raw test data, designed specifically to be merged later.
- **\`npx playwright merge-reports\`** combines blob archives into any other reporter format -- HTML, JUnit, JSON, or a custom reporter.
- **Sharding plus blob plus merge** is the canonical pattern for fast, parallel CI with a single consolidated report.
- **\`PLAYWRIGHT_BLOB_OUTPUT_DIR\`** and the \`outputDir\` option control where blobs land, which matters for artifact upload.
- **\`mergeHTMLReports\`** was the older standalone package; modern Playwright bundles merging directly into the CLI, so you no longer need a separate dependency.

---

## Why Sharded Reports Need Merging

Playwright's \`--shard\` flag splits the test list deterministically. Running \`--shard=1/4\` executes the first quarter of tests, \`--shard=2/4\` the second quarter, and so on. Each shard is a completely independent process, usually on a different CI runner. That isolation is what makes sharding fast, but it is also what fragments your reporting.

Consider a 1,200-test suite split across four shards. Without merging, you end up with four separate HTML reports. To answer the simple question "did the whole suite pass?" you have to open four browser tabs and mentally union the results. If test \`checkout.spec.ts\` failed on shard 2 but you only looked at shard 1, you would wrongly conclude the build is green. Flaky-test analysis, trends over time, and attachment browsing all break down when results live in four silos.

The blob reporter fixes the fragmentation at the data layer rather than the presentation layer. Instead of each shard rendering its own final HTML, each shard serializes its results into a blob -- a portable archive. The merge step is the only place that renders a final report, and it renders from the complete, combined dataset. This separation of *collection* from *presentation* is the core idea, and it is why blob is strictly better than trying to merge pre-rendered HTML by hand.

| Approach | Single report? | Attachments preserved? | Recommended |
|---|---|---|---|
| One HTML reporter per shard | No | Yes, but fragmented | No |
| Manually concatenating JSON | Partial | Often lost | No |
| Blob reporter + merge-reports | Yes | Yes | Yes |
| Third-party dashboard upload per shard | Yes | Depends | Sometimes |

---

## Anatomy of a Blob Report

A blob report is a \`.zip\` file (named something like \`report-1.zip\` for shard 1) that contains a JSON-Lines event stream plus a \`resources/\` directory holding every binary attachment. The event stream records test-begin, test-end, step, and attachment events exactly as the embedded reporter saw them. Because it is a faithful event log rather than a rendered artifact, the merge step can replay those events into *any* reporter.

You do not normally need to inspect the inside of a blob, but it helps to know the shape. When you unzip one you will find a top-level \`report.jsonl\` and a \`resources/\` folder of trace files, screenshots, and videos referenced by content hash. The merge command reads every blob's event stream, re-bases the resource paths so there are no collisions between shards, and feeds the combined stream into the output reporter you choose.

The key practical consequence: **blobs are self-contained**. You can download blobs from CI, copy them to a teammate's laptop, and merge them locally to get the identical report your pipeline would produce. That portability is what makes blob reports so useful for debugging a CI-only failure.

---

## Configuring the Blob Reporter

The simplest way to enable blob output is on the command line, which is ideal for CI because it does not require touching your config:

\`\`\`bash
# Run shard 1 of 4 and emit a blob archive
npx playwright test --shard=1/4 --reporter=blob
\`\`\`

For a more durable setup, declare it in \`playwright.config.ts\`. A common pattern is to use blob in CI and the interactive HTML reporter locally, keyed off the \`CI\` environment variable:

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Use blob in CI so shards can be merged later;
  // use the live HTML report on a developer machine.
  reporter: process.env.CI
    ? [['blob']]
    : [['html', { open: 'on-failure' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
\`\`\`

You can also pass options to the blob reporter. The two you will care about most are \`outputDir\`, which controls where the \`.zip\` is written, and \`fileName\`, which lets you override the default \`report-<shard>.zip\` naming:

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    [
      'blob',
      {
        // Where the blob .zip is written on each shard.
        outputDir: 'blob-report',
        // Optional: control the archive name. Defaults to
        // report-<shardIndex>.zip when sharding is active.
        fileName: process.env.SHARD
          ? \`report-\${process.env.SHARD}.zip\`
          : undefined,
      },
    ],
  ],
});
\`\`\`

If you prefer environment variables over config (handy in containerized CI), Playwright honors \`PLAYWRIGHT_BLOB_OUTPUT_DIR\`:

\`\`\`bash
# Equivalent to setting outputDir: 'blob-report' in config
export PLAYWRIGHT_BLOB_OUTPUT_DIR=blob-report
npx playwright test --shard=2/4 --reporter=blob
\`\`\`

---

## Sharding Tests in CI

Sharding and blob reporting are two halves of the same workflow, so it is worth getting the sharding mechanics right. The \`--shard=x/y\` flag tells Playwright "you are shard x out of y total." Playwright sorts the full test list deterministically and assigns each shard a contiguous slice, so every test runs exactly once across the set of shards. The assignment is stable: shard 3 always gets the same tests for a given test list, which keeps timing predictable.

For balanced shards, enable the experimental duration-based splitting that uses timing data from previous runs, or simply trust the default count-based split for suites where tests have similar runtimes. The number of shards should roughly match the number of parallel runners your CI plan allows -- there is no benefit to having more shards than machines.

\`\`\`bash
# Four runners, four shards. Each command runs on its own machine.
npx playwright test --shard=1/4 --reporter=blob   # runner A
npx playwright test --shard=2/4 --reporter=blob   # runner B
npx playwright test --shard=3/4 --reporter=blob   # runner C
npx playwright test --shard=4/4 --reporter=blob   # runner D
\`\`\`

One subtlety: \`workers\` (parallelism *within* a shard) is independent of \`--shard\` (parallelism *across* machines). A shard can still run its slice across multiple CPU cores using workers. The two multiply: four shards with four workers each gives sixteen-way effective parallelism.

---

## GitHub Actions: Matrix Shards and a Merge Job

The canonical CI implementation uses a matrix to fan out shards, uploads each shard's blob as an artifact, then runs a dependent merge job that downloads all blobs and produces the final HTML report. Here is a complete, runnable workflow:

\`\`\`yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    name: Shard \${{ matrix.shard }} / 4
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      - name: Run shard
        run: npx playwright test --shard=\${{ matrix.shard }}/4 --reporter=blob
      - name: Upload blob report
        if: \${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-\${{ matrix.shard }}
          path: blob-report/
          retention-days: 1

  merge:
    name: Merge reports
    if: \${{ !cancelled() }}
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
      - name: Download all blob reports
        uses: actions/download-artifact@v4
        with:
          path: all-blobs
          pattern: blob-report-*
          merge-multiple: true
      - name: Merge into HTML report
        run: npx playwright merge-reports --reporter=html ./all-blobs
      - name: Upload merged HTML report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
\`\`\`

Two details make or break this workflow. First, \`merge-multiple: true\` on the download step flattens all the per-shard artifacts into one directory so \`merge-reports\` sees every blob in a single folder. Second, \`if: \${{ !cancelled() }}\` ensures the merge job still runs even when some shards failed -- you want the report precisely *because* something failed, so do not gate it on success.

---

## Running the Merge Locally

The merge command is the same whether you run it in CI or on your laptop. Download the blob artifacts into a folder and point \`merge-reports\` at it. The default output reporter is HTML, but you can request any reporter:

\`\`\`bash
# Merge every blob in ./all-blobs into an HTML report
npx playwright merge-reports --reporter=html ./all-blobs

# Open the merged report in a browser
npx playwright show-report playwright-report
\`\`\`

You can produce multiple output formats from one merge by passing several \`--reporter\` flags, which is exactly what teams need when they want a human-readable HTML report *and* a JUnit XML file for the CI test-results tab:

\`\`\`bash
# Emit both HTML and JUnit from the same set of blobs
npx playwright merge-reports \\
  --reporter=html \\
  --reporter=junit \\
  ./all-blobs
\`\`\`

If your config defines reporters with options (for example, a custom JUnit output path), \`merge-reports\` can read them from your config file instead of the command line:

\`\`\`bash
# Use reporter configuration from playwright.config.ts
PLAYWRIGHT_BLOB_DO_NOT_THROW=1 \\
  npx playwright merge-reports --config=playwright.config.ts ./all-blobs
\`\`\`

| Merge output | Flag | Typical use |
|---|---|---|
| HTML report | \`--reporter=html\` | Human browsing, attachment review |
| JUnit XML | \`--reporter=junit\` | CI test-results tab, dashboards |
| JSON | \`--reporter=json\` | Custom tooling, metrics pipelines |
| Line/list | \`--reporter=line\` | Quick terminal summary |

---

## From mergeHTMLReports to the Built-in CLI

Before merging was built into Playwright, teams reached for the community \`merge-html-reports\` package or hand-rolled scripts that parsed JSON reporter output and concatenated it. If you search older blog posts you will still find references to \`mergeHTMLReports\` as a standalone function. In 2026 you should not need any of that. The \`npx playwright merge-reports\` command shipped in the core package supersedes those tools entirely and handles attachment de-duplication and resource re-basing correctly, which the old hand-rolled approaches frequently got wrong.

If you are migrating an older pipeline, the change is mechanical. Replace your per-shard HTML reporter with \`blob\`, delete the \`merge-html-reports\` dependency, and replace your custom merge script with the single \`merge-reports\` invocation shown above. The result is fewer dependencies and a report that correctly carries traces and videos through the merge.

\`\`\`bash
# Old: remove the standalone package
npm remove merge-html-reports

# New: nothing to install -- merge-reports ships with Playwright
npx playwright merge-reports --reporter=html ./all-blobs
\`\`\`

---

## Preserving Traces and Attachments Across Shards

A frequent worry is whether traces, videos, and screenshots survive the merge. They do, provided you upload the *entire* blob directory rather than cherry-picking files. The blob archive embeds attachments under \`resources/\` keyed by content hash, and \`merge-reports\` re-bases those references so two shards that produced screenshots with the same name do not collide. If you upload only the JSONL and drop the \`resources/\` folder, your merged report will show broken attachment links.

Configure trace and screenshot capture in your config exactly as you would for a single-machine run; blob does not change capture behavior, only how results are stored:

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Capture a trace on the first retry of a failing test.
    trace: 'on-first-retry',
    // Keep videos only for failures to limit blob size.
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  retries: process.env.CI ? 2 : 0,
});
\`\`\`

Because videos and traces dominate blob size, the \`retain-on-failure\` and \`on-first-retry\` settings keep your artifacts small without sacrificing the data you actually need when investigating a failure.

---

## Debugging Common Blob Problems

The most common failure is an empty or missing merged report, which almost always traces back to the download step not collecting blobs into one directory. Verify that your CI downloads every shard's artifact and flattens them. In GitHub Actions that means \`merge-multiple: true\`; in GitLab it means collecting all \`blob-report/\` paths into a shared artifact folder before the merge job.

The second most common issue is a version mismatch. The Playwright version that *produced* the blobs and the version that *merges* them must match. If a shard ran on Playwright 1.49 but your merge job pinned 1.48, \`merge-reports\` may reject the blob format. Pin a single Playwright version across both jobs -- using \`npm ci\` against the same lockfile in every job is the simplest guarantee.

\`\`\`bash
# Confirm the producing and merging versions match
npx playwright --version    # run in the test job
npx playwright --version    # run in the merge job -- must be identical
\`\`\`

A third pitfall: forgetting \`if: !cancelled()\` on the merge job, so the report never generates when tests fail. Since the report is most valuable on failure, always run merge regardless of upstream job status.

---

## Generating Test Reporting Skills with AI Agents

Configuring blob reporting, sharding, and a merge job correctly involves a lot of moving parts that are easy to get subtly wrong. AI coding agents like Claude Code, Cursor, and Copilot can scaffold the entire pipeline for you when they have the right context. The challenge is that a generic agent does not know the modern \`merge-reports\` workflow and will often suggest the deprecated \`mergeHTMLReports\` package.

That is exactly what QA skills are for. A well-written skill encodes the current best practice -- blob in CI, matrix shards, \`merge-multiple\` download, single merge job with \`!cancelled()\` -- so the agent generates a correct pipeline on the first try. Browse the [Playwright and CI reporting skills at qaskills.sh/skills](/skills) and install one with the CLI:

\`\`\`bash
# Install a Playwright reporting skill into your agent
npx @qaskills/cli add playwright-blob-reporting
\`\`\`

For deeper context on building a full pipeline around these reports, see our [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) and our [test reporting and dashboards guide](/blog/test-reporting-allure-dashboards-guide).

---

## Frequently Asked Questions

### What is the blob reporter in Playwright?

The blob reporter is a built-in Playwright reporter that writes a compact \`.zip\` archive of all raw test data -- results, steps, traces, screenshots, and stdout -- instead of rendering a final report. It is designed to be merged later. Each shard in a CI run produces its own blob, and \`npx playwright merge-reports\` combines them into one unified report. It became the standard mechanism for distributed reporting in Playwright 1.37 and later.

### How do I merge sharded Playwright reports into one HTML report?

Run each shard with \`--reporter=blob\`, upload each shard's \`blob-report/\` directory as a CI artifact, then in a dependent job download all blobs into one folder and run \`npx playwright merge-reports --reporter=html ./all-blobs\`. This produces a single \`playwright-report/\` directory containing the combined results from every shard, including preserved traces and attachments.

### Do I still need the mergeHTMLReports package?

No. The \`merge-html-reports\` community package is obsolete. Modern Playwright bundles the \`merge-reports\` command directly into the CLI, and it handles attachment de-duplication and resource re-basing correctly. Remove the old dependency and replace your per-shard HTML reporter with \`blob\`, then merge with the built-in command.

### Why is my merged report empty or missing tests?

The usual cause is the download step not collecting all blobs into a single directory. In GitHub Actions, set \`merge-multiple: true\` on the \`download-artifact\` step so every shard's archive lands in one folder. Also confirm the Playwright version that produced the blobs matches the version running the merge -- a version mismatch can cause \`merge-reports\` to reject the blobs.

### Can I produce JUnit XML from blob reports?

Yes. Pass \`--reporter=junit\` to \`merge-reports\`, optionally alongside \`--reporter=html\` to emit both formats from the same blobs. This is the standard way to populate your CI provider's test-results tab while still keeping a human-browsable HTML report. You can configure the JUnit output path through your \`playwright.config.ts\` and merge with \`--config\`.

### Where does the blob reporter write its output?

By default it writes to a \`blob-report/\` directory in your project root, with archives named \`report-<shard>.zip\` when sharding is active. You can override the location with the \`outputDir\` reporter option or the \`PLAYWRIGHT_BLOB_OUTPUT_DIR\` environment variable. Point your CI artifact upload at that exact directory so the full archive, including the \`resources/\` folder, is preserved.

### Does merging preserve traces and videos?

Yes, as long as you upload the complete blob directory rather than individual files. Blobs embed attachments under \`resources/\` keyed by content hash, and \`merge-reports\` re-bases those references during the merge so there are no collisions between shards. If attachments appear broken in the merged report, you almost certainly dropped the \`resources/\` folder during artifact upload.

---

## Conclusion

The Playwright blob reporter is the bridge between fast, sharded CI and a single trustworthy report. By separating data *collection* on each shard from report *presentation* in a merge job, it gives you the parallelism of sharding without the fragmentation of isolated reports. Configure \`--reporter=blob\` on every shard, upload the full \`blob-report/\` directory, and run \`npx playwright merge-reports --reporter=html\` once at the end. Pin a single Playwright version, use \`merge-multiple\` to flatten downloads, and guard the merge job with \`!cancelled()\` so you get a report even when tests fail.

Once this pipeline is in place, every push produces one HTML report covering your entire suite, with traces and videos intact, no matter how many machines ran the tests. To have your AI coding agent generate this pipeline correctly the first time, install a Playwright reporting skill from [qaskills.sh/skills](/skills) and read our [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) for the surrounding workflow.
`,
};
