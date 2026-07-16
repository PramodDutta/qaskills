import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Trace Merge: Combine Sharded Traces into One Timeline',
  description: 'Use a Playwright trace merge sharded workflow to publish one searchable HTML report and debug every failed CI shard from a single evidence artifact.',
  date: '2026-07-16',
  category: 'Reference',
  content: `
# Playwright Trace Merge: Combine Sharded Traces into One Timeline

Sharding shortens a large Playwright suite, but it can leave an investigator hunting through several jobs for the failure, trace, screenshot, and network log that belong together. The supported solution is to produce a blob report in every shard, download all blob archives into one directory, and run Playwright's \`merge-reports\` command. The result can be rendered as one HTML report with all shard results and their trace attachments.

There is one important boundary. Playwright does not splice independent tests into a single global clock. Each test's \`trace.zip\` still opens with its own Actions, Metadata, Console, Network, and other trace views. “One timeline” therefore means one report and one investigation entry point, with a complete per-test timeline available for each retained trace. That is usually the workflow a QA team actually needs.

## What Playwright merges, and what stays separate

The blob reporter serializes test results and attachments into zip archives designed for later merging. Unlike an HTML report, a blob report is an intermediate CI artifact. The merge command reads every blob archive in a directory and feeds the combined results to a reporter, commonly \`html\`.

| Item | After the merge | Practical consequence |
|---|---|---|
| Projects, files, tests, retries | Collected into one report | Filter and search without opening each shard job |
| Trace, screenshot, and video attachments | Associated with their original test result | A failed retry keeps the evidence that produced it |
| Test step chronology | Preserved inside that test's trace | Action timing remains useful for diagnosis |
| A global cross-shard event clock | Not created | Do not infer service-wide ordering from report row order |
| Shard execution logs | Remain CI job logs unless separately archived | Keep logs when runner or setup failures matter |

This distinction affects incident notes. Write “checkout failed in shard 3 at the payment assertion,” not “shard 3 happened after shard 2” unless the CI system supplies that ordering independently.

## Configure traces and blob output before sharding

Retain traces selectively. \`trace: 'on-first-retry'\` is a strong CI default because it captures evidence for tests that needed a retry without tracing every passing first attempt. Use \`retain-on-failure\` when you need the first failed attempt even if no retry runs. The exact policy should match the suite's retry configuration and storage budget.

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: process.env.CI
    ? [['blob']]
    : [['list'], ['html', { open: 'never' }]],
});
\`\`\`

The blob reporter uses shard and environment information to create distinct archive names, so jobs can upload their outputs without manually inventing report filenames. Still give every artifact upload a distinct CI artifact name. Artifact services often treat identically named uploads as replacements or separate containers, depending on the platform and action version.

Confirm the basic flow locally before editing CI:

\`\`\`bash
rm -rf blob-report playwright-report
npx playwright test --shard=1/2 --reporter=blob
mv blob-report shard-1
npx playwright test --shard=2/2 --reporter=blob
mv blob-report shard-2
mkdir blob-report
cp shard-1/*.zip shard-2/*.zip blob-report/
npx playwright merge-reports --reporter=html blob-report
npx playwright show-report playwright-report
\`\`\`

The two test commands may return nonzero when the demonstration contains failures. In a production script, preserve the test exit status while allowing artifact upload steps to run through the CI platform's failure conditions.

## Build a merge job in GitHub Actions

Run shards in a matrix, upload the \`blob-report\` directory even after test failure, and make a separate job depend on the matrix job. The merge job downloads the artifacts, installs the same project dependencies, and invokes Playwright from that installation.

\`\`\`yaml
name: playwright

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps
      - run: pnpm exec playwright test --shard=\${{ matrix.shard }}/4 --reporter=blob
      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}
        with:
          name: blob-report-\${{ matrix.shard }}
          path: blob-report
          retention-days: 7

  merge:
    if: \${{ !cancelled() }}
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          pattern: blob-report-*
          path: all-blob-reports
          merge-multiple: true
      - run: pnpm exec playwright merge-reports --reporter=html all-blob-reports
      - uses: actions/upload-artifact@v4
        with:
          name: playwright-html-report
          path: playwright-report
          retention-days: 14
\`\`\`

\`fail-fast: false\` matters because the evidence set is incomplete if one failed matrix cell cancels its siblings. The job-level condition lets the merge run after ordinary test failures but not after the workflow is explicitly cancelled. If your organization requires reports after cancellation too, choose a condition deliberately and test how partial uploads behave.

For the broader execution design, including shard sizing and worker interaction, use the [Playwright test sharding and parallel CI guide](/blog/playwright-test-sharding-parallel-ci-guide). It is easier to debug merged output when shard boundaries are intentional.

## Keep all merge inputs compatible

Blob archives are not a generic interchange format. Merge them with the same Playwright version that produced them. A locked dependency graph and one container image across all jobs reduce surprises. Also keep project configuration, test paths, and repository revision identical across matrix cells.

| Check | Good signal | Failure symptom |
|---|---|---|
| Playwright package | Same lockfile and install command in test and merge jobs | Merge errors or unreadable report data |
| Commit | Every shard checks out the workflow's triggering SHA | Duplicated, absent, or mismatched tests |
| Blob collection | Expected number of nonempty zip files | Report contains only some shards |
| Trace policy | Failure or retry has a trace attachment | Test is present but no trace link appears |
| Merge destination | Fresh \`playwright-report\` directory | Stale files confuse artifact review |
| Artifact retention | Longer than typical triage delay | Evidence expires before ownership is assigned |

If shards run on different operating systems, Playwright can merge their blob reports when the test identities and configuration line up, but paths may differ. The documented merge flow supports a separate merge configuration file when path reconciliation is needed. Prefer homogeneous runners unless cross-platform coverage is itself the matrix dimension.

## Open the right timeline during failure triage

Download and extract the merged HTML artifact, then serve it with Playwright rather than opening random files from the directory. From the report, select the failed test and the relevant retry, then open its trace attachment. The trace viewer lets an investigator correlate an action with DOM snapshots, source, logs, console output, and network activity.

\`\`\`bash
pnpm exec playwright show-report ./playwright-report

# A standalone trace also opens directly when one must be shared separately.
pnpm exec playwright show-trace ./trace.zip
\`\`\`

A productive triage order is:

1. Check the error and failing assertion in the merged report.
2. Select the exact retry, because attachments differ by attempt.
3. In the trace, locate the last successful action before the error.
4. Inspect the before and after DOM snapshots instead of relying only on a screenshot.
5. Correlate the action with network requests and console errors.
6. Record whether the defect belongs to product behavior, test synchronization, data isolation, or the CI environment.

The [complete Playwright Trace Viewer guide](/blog/playwright-trace-viewer-complete-guide-2026) covers those panels in depth. The merged report solves discovery; disciplined trace reading solves the failure.

## Diagnose missing traces and incomplete reports

Start at the boundary where information disappears. If the merge job downloaded four archives but the report has three shards, examine test identity and tool-version consistency. If the failed test is listed but has no trace, inspect the trace policy and retry attempt. If the artifact is missing entirely, inspect upload conditions and the directory before upload.

\`\`\`bash
find all-blob-reports -type f -name '*.zip' -print
du -sh all-blob-reports
pnpm exec playwright --version
pnpm exec playwright merge-reports --reporter=html all-blob-reports
\`\`\`

Avoid unzipping and recompressing blob files as a troubleshooting step. Treat them as opaque reporter inputs. To isolate a suspected bad archive, copy subsets into temporary directories and merge those subsets. That preserves the original evidence and makes the failing input reproducible.

Another common issue is expecting a trace for a worker crash or setup failure that occurred before tracing began. CI job logs, service-container logs, and Playwright's standard output remain necessary. A merged report consolidates reporter data; it does not replace platform observability.

## Make merged evidence useful to humans and agents

Give the final artifact a stable name and include the commit SHA, workflow run, shard count, and trace policy in the triage record. An AI coding agent can inspect extracted report metadata or a supplied trace, but it needs the same grounding as a person: failing attempt, expected behavior, environment, and reproducible command. Do not ask it to infer ordering across independent traces.

Set an evidence budget. Four shards with trace-on-every-test can generate far more storage than four shards with trace-on-first-retry. Review artifact size, download latency, and the percentage of failures that actually have diagnostic traces. A cheaper artifact that omits the decisive attempt is false economy, while recording every passing action may add no triage value.

## Frequently Asked Questions

### Does merge-reports create one chronological trace across every shard?

No. It creates one combined test report from blob archives. Each retained test attempt continues to have its own trace and timeline. Use the merged HTML report to find a result, then open that result's trace. Cross-shard chronological claims require separate timestamps and observability data from your CI system or application.

### Which reporter should each shard use?

Use Playwright's blob reporter as the merge input. It is intended for collecting results that will be combined later. After downloading all blob archives into one directory, run \`playwright merge-reports\` and select the desired output reporter, commonly HTML. Uploading separate HTML reports does not provide the same supported merge workflow.

### Why is a failed test present without a trace attachment?

Trace capture depends on the configured policy and attempt. With \`on-first-retry\`, a failure has a trace only when the first retry actually runs. A setup crash may also occur before trace recording starts. Check retries, the selected attempt, trace configuration, and blob artifact contents before concluding that merging dropped the attachment.

### Can a merge job run when one shard fails?

Yes. Configure the matrix not to cancel sibling shards on the first failure, upload blob output under a condition that runs after test failure, and give the merge job an appropriate condition. Keep the overall workflow's failure semantics visible so publishing a report does not accidentally turn a genuine test failure into a successful required check.
`,
};
