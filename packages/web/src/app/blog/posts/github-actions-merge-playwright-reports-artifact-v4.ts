import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Merge Playwright Reports with GitHub Actions artifact v4',
  description:
    'Merge Playwright reports with GitHub Actions artifact v4 by collecting unique shard blobs, preserving failures, and publishing one usable HTML report.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Merge Playwright Reports with GitHub Actions artifact v4

A team I worked with split their Playwright suite across four shards last spring to cut CI time from nineteen minutes to six. It worked, until someone bumped \`actions/upload-artifact\` and \`actions/download-artifact\` to v4 as part of a routine dependency sweep. The next morning, the merged HTML report on \`main\` showed 40 tests instead of 320. No error, no red build, just a report missing three quarters of its data. The merge job had run "successfully" the whole time, it just merged one shard's blob report and quietly ignored the rest.

The root cause was a breaking change in artifact v4 that a lot of teams hit the same week: v3 let you upload multiple artifacts under the same name and it would append; v4 requires unique names per upload and errors (or in older setups, silently overwrote) on a collision. The team's four shard jobs were all uploading to an artifact literally named \`blob-report\`, so v4 kept only the last one that finished. This piece walks through the exact workflow that avoids that trap: sharding with the Playwright blob reporter, uploading each shard's report under a unique name, downloading them all back with a glob pattern, and merging them into one HTML report.

## Why the Shard Report Vanished After the Artifact v4 Upgrade

Before the upgrade, the pipeline looked reasonable on paper. Four matrix jobs ran \`npx playwright test --shard=N/4\`, each producing a \`blob-report\` directory, and each job called \`actions/upload-artifact@v3\` with \`name: blob-report\`. Under v3, GitHub Actions allowed same-named artifact uploads across jobs in a run and effectively unioned their contents when downloaded later. It was never documented behavior to rely on, but it worked, so nobody questioned it.

\`actions/upload-artifact@v4\` changed the underlying storage model. Each upload now needs a unique artifact name within the run, and reusing a name either fails the upload outright or, depending on the exact version pinned, replaces the prior artifact instead of merging with it. The shard jobs kept succeeding because the upload step itself didn't error, it just meant artifact number four clobbered one, two, and three. The merge job downloaded a directory with a single shard's blob file in it, ran \`playwright merge-reports\` against that one file, and produced a report that looked complete but wasn't. That's the dangerous part: nothing in the CI logs screamed "data loss." It just quietly reported less.

The fix has two halves. First, give each shard's uploaded artifact a name that includes the shard index, so v4 has no collision to resolve. Second, use the pattern-and-merge-multiple options on \`download-artifact@v4\` to pull all of them back into one directory before running the merge command. Both changes are small, but they only work if applied together, one without the other still drops data.

## Sharding the Suite and Writing Blob Reports

Sharding splits the test suite across parallel jobs using Playwright's built-in \`--shard\` flag. Each shard runs a subset of tests and needs its own reporter output that can be combined later, which is exactly what the blob reporter is for. Blob reports are Playwright's intermediate format designed to be merged, unlike the HTML reporter which produces a self-contained report meant to be viewed directly, not stitched together with others.

Set the reporter in \`playwright.config.ts\` so CI runs produce blob output while local runs keep the interactive HTML view:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: process.env.CI ? 'blob' : 'html',
  testDir: './tests',
  fullyParallel: true,
});
\`\`\`

With that in place, the shard step in the workflow is a single command per matrix job. \`shardIndex\` and \`shardTotal\` come from the matrix strategy, so \`--shard=\${{ matrix.shardIndex }}/\${{ matrix.shardTotal }}\` resolves to \`--shard=1/4\`, \`--shard=2/4\`, and so on for each parallel job:

\`\`\`yaml
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
  - run: npm ci
  - run: npx playwright install --with-deps
  - name: Run Playwright tests
    run: npx playwright test --shard=\${{ matrix.shardIndex }}/\${{ matrix.shardTotal }}
\`\`\`

\`fail-fast: false\` matters here specifically because of the merge step coming next. If one shard fails and the matrix strategy cancels the others by default, the merge job would only have partial blob reports to work with, and worse, might not run at all depending on how the merge job's condition is written. Turning off fail-fast lets every shard finish and upload its report regardless of whether a sibling shard found failing tests. For the mechanics of setting up the matrix itself, including how \`shardTotal\` should track your actual test count, see [github-actions-playwright-matrix-guide-2026](/blog/github-actions-playwright-matrix-guide-2026).

## Uploading Each Shard's Blob Report Without a Name Collision

This is the step that broke in the incident above. Each shard produces a \`blob-report\` directory locally, but the artifact name given to \`upload-artifact@v4\` has to be unique per shard or later uploads will overwrite earlier ones. The fix is to interpolate the shard index into the artifact name:

\`\`\`yaml
  - name: Upload blob report
    if: always()
    uses: actions/upload-artifact@v4
    with:
      name: blob-report-\${{ matrix.shardIndex }}
      path: blob-report
      retention-days: 1
\`\`\`

\`if: always()\` on the upload step means the blob report gets uploaded even if a test in that shard failed, so a single failing test doesn't erase the shard's contribution to the final report. \`retention-days: 1\` keeps these intermediate artifacts from piling up in storage since they're only needed until the merge job runs and produces the final HTML report, which can carry a longer retention period.

With this naming scheme, a four-shard run produces four distinct artifacts: \`blob-report-1\`, \`blob-report-2\`, \`blob-report-3\`, \`blob-report-4\`. Under artifact v4's per-name uniqueness rule, none of these collide, so all four survive to the download step.

## Downloading and Merging with download-artifact v4

The merge job needs two things from the matrix job before it can do anything: it has to wait for all shards to finish, and it has to pull every shard's blob report into a single local directory. \`actions/download-artifact@v4\` handles the second part with a pattern match plus a merge flag that consolidates multiple matched artifacts into one destination folder instead of nesting each under its own subdirectory:

\`\`\`yaml
  merge-reports:
    needs: [test]
    if: \${{ !cancelled() }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Download blob reports
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true
      - name: Merge into HTML report
        run: npx playwright merge-reports --reporter html ./all-blob-reports
\`\`\`

\`needs: [test]\` names the matrix job (\`test\` in this example), which means the merge job waits for every shard in that matrix to complete before starting, not just the first one to finish. \`if: \${{ !cancelled() }}\` is what actually keeps this job running when a shard fails: GitHub Actions' default behavior skips downstream jobs if any dependency job in \`needs\` fails, and \`!cancelled()\` overrides that default so the merge still runs and reports on whatever passed, as long as the workflow wasn't manually cancelled outright.

\`pattern: blob-report-*\` matches every artifact whose name starts with that prefix, which covers \`blob-report-1\` through \`blob-report-4\` regardless of how many shards exist. \`merge-multiple: true\` is what flattens all matched artifacts into the single \`all-blob-reports\` directory rather than creating \`all-blob-reports/blob-report-1/\`, \`all-blob-reports/blob-report-2/\`, and so on as separate subfolders. Without that flag, \`playwright merge-reports\` would need to be pointed at each subdirectory individually, or wouldn't find the blob files at the path it expects.

The merge command itself, \`npx playwright merge-reports --reporter html ./all-blob-reports\`, reads every blob file in that directory and produces a combined report using the reporter named after \`--reporter\`. Using \`html\` here generates the standard interactive Playwright HTML report as if the whole suite had run in a single job, with pass/fail counts, traces, and screenshots from all four shards combined.

## Reporter Formats: Which One Belongs at Which Stage

Blob and HTML aren't interchangeable, and mixing them up is a common source of confusion when setting this up for the first time.

| Reporter | Produced by | Purpose | Mergeable |
|---|---|---|---|
| \`blob\` | Each shard job | Intermediate, machine-consumable format | Yes, via \`merge-reports\` |
| \`html\` | Merge job (final step) | Human-viewable report with traces and screenshots | No, terminal format |
| \`json\` | Either, if configured | Machine-readable summary for scripts or dashboards | No, but can be generated alongside blob |

Blob reports are not meant to be opened directly, they exist purely to be fed into \`merge-reports\`. HTML is the terminal format for humans, generated once at the end. If a shard job's reporter is set to \`html\` instead of \`blob\`, \`merge-reports\` has nothing usable to combine, since HTML reports don't carry the structured trace data the merge command expects.

## Artifact v3 vs v4: What Actually Changed

The behavior differences between artifact versions explain why workflows that worked fine for months suddenly lost data after a routine \`dependabot\` bump.

| Behavior | actions/upload-artifact v3 | actions/upload-artifact v4 |
|---|---|---|
| Same-name uploads across jobs | Merged/appended silently | Requires unique names, collision fails or overwrites |
| Download of multiple artifacts | Downloaded into one folder by default | Requires \`merge-multiple: true\` to flatten |
| Pattern matching on download | Not supported | Supported via \`pattern\` option |
| Upload/download speed | Slower, routed through GitHub's artifact backend differently | Faster, backed by a different storage layer |

The practical upshot is that any workflow upgrading from v3 to v4 for sharded test reports needs both the unique-name change on upload and the \`pattern\` plus \`merge-multiple\` change on download. Skipping either one reproduces the exact silent data loss described at the start of this piece. For the broader tradeoffs of sharding strategy itself, distinct from the artifact mechanics, [playwright-sharding-merge-reports-guide-2026](/blog/playwright-sharding-merge-reports-guide-2026) covers how to pick a shard count and reason about flaky-test isolation across shards.

## Handling Cancelled Runs and Partial Shard Failures

Two edge cases matter for this setup in practice. The first is a manually cancelled workflow, where the \`!cancelled()\` condition on the merge job correctly skips it, there's no point merging reports from a run the team explicitly killed. The second is a shard that fails outright, for instance a browser install step timing out, versus a shard that runs but has failing tests inside it. The upload step's \`if: always()\` covers the second case, since a shard with failing tests still finishes the run and still has a blob report to upload. It does not cover a shard that never got that far, if \`npx playwright install --with-deps\` itself fails before tests run, there's no blob report directory to upload at all, and that shard simply won't contribute an artifact to the merge.

In that scenario, the merge job still runs (because of \`!cancelled()\`), still downloads whatever blob reports did get uploaded, and still produces an HTML report, just one missing that shard's tests entirely. This is a reasonable tradeoff for most teams: a partial report from three of four shards surfaces real failures immediately rather than blocking on a full rerun. Anyone reviewing the merged report needs to check the job summary for the matrix run to see which shard indices actually completed, since the HTML report itself won't say "shard 3 is missing," it just won't contain shard 3's tests.

## Publishing the Merged HTML Report

The final step uploads the merged HTML directory as its own artifact, separate from the intermediate blob reports, so it's available for download from the workflow run summary:

\`\`\`yaml
      - name: Upload HTML report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: html-report--attempt-\${{ github.run_attempt }}
          path: playwright-report
          retention-days: 14
\`\`\`

Naming this artifact with \`github.run_attempt\` interpolated in matters if the workflow gets manually re-run after a failure. Without it, a re-run's HTML report upload would collide with the name from the first attempt under artifact v4's uniqueness rule, and the re-run's upload would fail or overwrite the original. \`retention-days: 14\` gives the team two weeks to pull a report for a flaky-test investigation before it ages out, longer than the one-day retention set on the intermediate blob reports since those have no value once the merge job consumes them.

The \`path: playwright-report\` in this step matches the default output directory that \`npx playwright merge-reports --reporter html\` writes to, so no additional configuration is needed to locate the generated report before uploading it.


## Diagnosing Missing Shard Blobs and Version Skew

Before touching \`playwright merge-reports\`, confirm every shard actually uploaded a blob report artifact. Check the upload job logs for each shard: \`actions/upload-artifact@v4\` prints the artifact name and size on success, so a shard with no such line means the blob-report directory was empty or the job failed before the upload step ran. This happens most often when \`reporter: [['blob']]\` is set only in some CI branches, or when a shard job exits early on test failure with no \`if: always()\` guard on the upload step.

Next, verify artifact names are unique per shard. Unlike v3, v4 requires distinct names within a run; reusing \`blob-report\` across shards throws an immediate 409 conflict, and the merge step silently proceeds with fewer blobs than expected. Name them \`blob-report-\${{ matrix.shardIndex }}\` and confirm the count in the download step matches your shard total.

Version skew is the second failure mode. \`actions/upload-artifact@v4\` and \`actions/download-artifact@v4\` use a different backend than v3 and are not cross-compatible; mixing v3 upload with v4 download fails outright. Pin both actions to the same major version across every job in the workflow, then run \`npx playwright merge-reports --reporter html ./all-blob-reports\` locally against downloaded artifacts to confirm the blob count before trusting CI's merged output.

## Frequently Asked Questions

### Why did the merged report show fewer tests after upgrading to artifact v4?

Because the shard jobs were uploading artifacts under the same name. Artifact v3 tolerated that and effectively combined the uploads; v4 treats same-name uploads as a collision, so only one shard's blob report survived to the download step. Interpolating the shard index into the artifact name, like \`blob-report-\${{ matrix.shardIndex }}\`, resolves it.

### Does merge-multiple change what files end up in the download directory, or just their layout?

Just the layout. Without \`merge-multiple: true\`, \`download-artifact@v4\` creates a subdirectory per matched artifact name inside the download path. With it set to true, all matched artifacts' contents land flattened into the same top-level directory. The blob files themselves aren't altered either way, only where they end up on disk, which matters because \`merge-reports\` needs to find them all in one place.

### What happens if the merge job runs but every shard failed?

It still runs, since \`if: \${{ !cancelled() }}\` only skips on a cancelled workflow, not on failed dependency jobs. It downloads whatever blob reports exist, if shards failed after producing blob output, those still upload thanks to \`if: always()\` on the upload step. The merged HTML report then shows all the failures, which is the intended behavior, a full-failure run should still produce a report to debug from.

### Can the blob reporter be combined with another reporter in the same shard run?

Yes, Playwright's \`reporter\` config in \`playwright.config.ts\` accepts an array, so a shard job can write both \`blob\` and, for example, a terminal-friendly reporter for live CI log output at the same time. Only the blob output gets uploaded and merged, the other reporter's output is for immediate visibility during that job's own run.

### Why use needs: [test] on the merge job instead of running it inside the same matrix job?

A matrix job runs independently per shard, there's no built-in point in the matrix where all shards are guaranteed complete, that's what a separate downstream job with \`needs\` provides. Putting the merge logic inside the matrix itself would mean each shard tries to merge reports that don't exist yet from sibling shards still running in parallel.
`,
};
