import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Merge Playwright Blob Reports in GitLab CI',
  description:
    'Merge Playwright blob reports in GitLab CI from parallel shards into one HTML artifact, while preserving failed-job artifacts, traces, and exit status.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Merge Playwright Blob Reports in GitLab CI

Shard 3 finds the regression, shard 1 captures a trace, and shard 4 holds the screenshot that explains it. Eight separate GitLab jobs are fast, but eight separate result pages are a poor review experience. Playwright's blob reporter preserves each shard's test data and attachments so a later GitLab job can merge them into one HTML report.

The pipeline has three responsibilities: make every shard emit a uniquely named blob archive, transfer all archives even when tests fail, and run \`playwright merge-reports\` after the parallel jobs. The test jobs should still determine pipeline health. Report generation must not convert a real test failure into a green pipeline or disappear precisely when a failure occurs.

## Blob reports are merge inputs, not human reports

The blob reporter writes zip files containing test results and attachments. Its primary purpose is later transformation. The HTML reporter creates a browsable directory but cannot be combined by copying several HTML folders together. JUnit XML can be aggregated by GitLab for test summaries, yet it does not carry Playwright's complete trace and attachment model.

| Reporter | Best role in this pipeline | Merge behavior | Human consumption |
|---|---|---|---|
| Blob | Per-shard interchange artifact | Native input to \`merge-reports\` | Not intended for direct browsing |
| HTML | Final merged artifact | Produced after blob merge | Rich Playwright report with attachments |
| JUnit | GitLab unit-test report | GitLab ingests XML files | Pipeline test tab and failure summaries |
| Line or list | Live job console | No cross-job merge | Immediate log feedback |
| JSON | Custom post-processing | Requires your own aggregation | Machines and bespoke dashboards |

You can configure multiple reporters. A practical CI setup emits blob for merging and JUnit for GitLab ingestion, while local runs use HTML or list output. Keep output paths unique per job to prevent collision inside a shared workspace or cache.

## Configure Playwright for shard-aware output

Playwright's default blob filenames include identifiers that avoid clashes across shards. An explicit output directory keeps artifact declarations simple. A merge config can define the final HTML output independently from the test-time reporter.

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ['blob', { outputDir: 'blob-report' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
      ]
    : [['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
\`\`\`

\`fullyParallel: true\` allows Playwright to distribute individual tests more evenly across shards. Without it, sharding works at file granularity, so uneven file sizes can leave one GitLab job running much longer. Fully parallel execution also requires honest test isolation. Do not enable it merely to improve balance if tests share accounts or mutable records.

Blob filenames derive from factors such as project, shard, and test filters. Do not rename every shard archive to the same constant before collection. GitLab will download artifacts from parallel jobs, and identical paths can overwrite one another depending on extraction behavior.

## A complete GitLab pipeline with parallel shards

GitLab's numeric \`parallel\` creates several instances of one job and supplies \`CI_NODE_INDEX\` and \`CI_NODE_TOTAL). Those values map directly to Playwright's one-based \`--shard=x/y\` syntax.

\`\`\`yaml
stages:
  - test
  - report

variables:
  PLAYWRIGHT_BLOB_OUTPUT_DIR: "blob-report"

playwright-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.61.0-noble
  parallel: 4
  script:
    - npm ci
    - npx playwright test --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
  artifacts:
    when: always
    expire_in: 7 days
    paths:
      - blob-report/
      - test-results/
    reports:
      junit: test-results/junit.xml

merge-playwright-report:
  stage: report
  image: mcr.microsoft.com/playwright:v1.61.0-noble
  when: always
  needs:
    - job: playwright-tests
      artifacts: true
  script:
    - npm ci
    - mkdir -p all-blob-reports
    - find blob-report -type f -name '*.zip' -exec cp {} all-blob-reports/ \;
    - npx playwright merge-reports --reporter=html ./all-blob-reports
  artifacts:
    when: always
    expire_in: 14 days
    paths:
      - playwright-report/
\`\`\`

Pin the container tag to the Playwright version installed by the lockfile. Browser binaries and package versions need to agree. The example version is illustrative for a repository using that release, not a recommendation to ignore your package manifest.

\`artifacts:when: always\` on test jobs is essential. GitLab otherwise may omit artifacts from failed jobs, leaving the merged report with only passing shards. The merge job also uses \`when: always\` so it runs after upstream test failures. Upstream failures remain failures; this setting only permits report generation.

The exact artifact extraction layout from parallel jobs deserves verification in your GitLab version and runner. The example collects zip files found beneath \`blob-report\`. If GitLab places each dependency's artifact at the same root and filenames are unique, this works. For stronger isolation, give each shard a directory containing its index.

## Prevent artifact overwrites explicitly

Relying on generated unique zip names is reasonable, but explicit shard directories make troubleshooting clearer. Set the blob output directory per job through the environment, then collect every directory in the merge job.

\`\`\`yaml
playwright-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.61.0-noble
  parallel: 6
  variables:
    PLAYWRIGHT_BLOB_OUTPUT_DIR: "blob-report-$CI_NODE_INDEX"
  script:
    - npm ci
    - npx playwright test --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
  artifacts:
    when: always
    paths:
      - blob-report-*/

merge-playwright-report:
  stage: report
  image: mcr.microsoft.com/playwright:v1.61.0-noble
  when: always
  needs:
    - job: playwright-tests
      artifacts: true
  script:
    - npm ci
    - mkdir all-blob-reports
    - find . -path './blob-report-*/*.zip' -exec cp {} all-blob-reports/ \;
    - test "$(find all-blob-reports -name '*.zip' | wc -l)" -eq 6
    - npx playwright merge-reports --reporter=html all-blob-reports
  artifacts:
    when: always
    paths:
      - playwright-report/
\`\`\`

The count assertion prevents a dangerously plausible partial report. If only five of six archives arrive, merging may still succeed, but the report cannot represent the full suite. When projects or filtered matrices produce more than one blob per shard, replace the simple count with a manifest check based on expected job dimensions.

GitLab variable expansion inside the \`variables\` section and artifact paths can vary by context. If your runner does not expand \`CI_NODE_INDEX\` in that variable assignment as intended, export \`PLAYWRIGHT_BLOB_OUTPUT_DIR\` in the script before running Playwright and use a broad artifact path. Test this once with two shards before scaling.

## Needs, dependencies, and failed upstream jobs

\`needs\` can both order the merge job and download artifacts. For parallel jobs, GitLab's behavior around all instances should be verified with your pipeline configuration. The merge job needs artifacts from every parallel instance, not merely one logical job name without its generated children.

Do not add \`allow_failure: true\` to the Playwright test job solely to make merging possible. That changes pipeline semantics and may let a broken suite appear acceptable. \`when: always\` is the report-generation mechanism. Test failures should retain their nonzero status.

Likewise, avoid appending \`|| true\` to \`npx playwright test\`. It hides the result at its source. GitLab can run later stages or always jobs based on rules without discarding the exit code.

| Pipeline choice | Report availability after test failure | Pipeline truthfulness | Recommendation |
|---|---:|---:|---|
| Test command followed by \`|| true\` | Usually yes | Poor, failure is erased | Do not use |
| Test job marked \`allow_failure\` | Usually yes | Warning semantics, not strict gate | Only for intentional nonblocking suites |
| Artifacts \`when: always\`, merge \`when: always\` | Yes | Upstream failure stays red | Preferred |
| Artifacts only on success | No failed-shard evidence | Failure remains red | Incomplete diagnostics |
| Merge job ignores missing shards | Partial report appears normal | Misleading | Assert expected inputs |

The [GitLab CI test automation guide](/blog/gitlab-ci-test-automation-guide-2026) covers stages, rules, caching, and test reports beyond Playwright. Keep the distinction between artifacts for humans and reports parsed by GitLab clear.

## Use one lockfile and one Playwright version

Blob merge compatibility depends on the Playwright tooling interpreting the generated reports. Install dependencies from the same commit in test and merge jobs with \`npm ci\`, \`pnpm install --frozen-lockfile\`, or the repository's equivalent. Do not let the merge job fetch the latest Playwright independently.

Artifacts can outlive the commit's dependency cache. If someone downloads blobs and tries to merge locally with another version, failures or unexpected output may follow. Include commit SHA and Playwright version in job logs or artifact metadata. The GitLab pipeline itself should merge before expiring its environment.

An official Playwright container includes browsers and operating-system dependencies, but your Node dependency installation still supplies the test runner package. Pin image and package coherently. If the merge job only transforms blobs, it may not need installed browsers, yet using the same image reduces environmental drift and is operationally simple.

## Merge configuration controls the final reporter

The \`--reporter=html\` flag creates the default \`playwright-report\` directory. A separate merge configuration is useful when you want HTML options, a custom output folder, or multiple output reporters.

\`\`\`typescript
// playwright.merge.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  reporter: [
    ['html', { open: 'never', outputFolder: 'merged-playwright-report' }],
  ],
});
\`\`\`

Run \`npx playwright merge-reports --config=playwright.merge.config.ts all-blob-reports\`, then publish \`merged-playwright-report/\`. Keep \`testDir\` consistent, particularly when merging reports created in different environments. Blob merge relies on stable test identity and paths.

Do not configure blob again as the only merge output when the goal is human review. That merely creates another intermediate. HTML, JSON, JUnit, or a custom reporter can be chosen based on consumers.

## Preserve traces and screenshots through the merge

Blob archives contain attachments recorded by Playwright, including traces and screenshots according to configuration. The merged HTML report links those attachments. Publishing only the HTML entry file without the rest of its directory breaks them, so artifact the complete report folder.

\`trace: 'on-first-retry'\` captures a trace only if a retry happens. A test that fails once and passes on retry will carry valuable evidence. A consistently failing test also gets the retry trace. If a test has zero retries, that mode produces no trace; choose \`retain-on-failure\` or another documented mode according to diagnostic and storage needs.

Artifact sizes can grow quickly with video and traces. Set intentional retention, and reserve longer retention for merged reports rather than duplicating every raw blob indefinitely. Keep raw blobs long enough to regenerate a report when merge configuration itself is faulty.

## Sharding by project and matrix dimensions

A numeric parallel job handles one shard dimension. Many suites also test Chromium, Firefox, and WebKit, or multiple deployment targets. GitLab \`parallel:matrix\` can express those dimensions, but report identity and expected archive counts become more complex.

If each job runs \`--project=$PROJECT --shard=$SHARD\`, blob names incorporate filters and project information. Merge all results only when a combined report is meaningful. Staging and production-like runs with identical test names should carry Playwright tags or separate reports so reviewers can distinguish environments.

The [Playwright sharding and merge reports guide](/blog/playwright-sharding-merge-reports-guide-2026) explores balancing and project identity. In GitLab specifically, map every matrix cell to an artifact provenance record: project, shard fraction, commit, job ID, and completion status.

## Diagnose an empty or incomplete merged report

Start at artifact production, not the HTML UI. Inspect each parallel job and verify at least one zip exists beneath its configured blob directory. Then inspect the merge job workspace before copying. Print file paths and sizes, but avoid dumping binary content.

Common failure patterns include:

- the reporter was overridden on the CLI, so no blob was created;
- artifacts were uploaded only on success;
- every job used a constant output filename and extraction overwrote files;
- the merge job installed a different Playwright version;
- \`find\` searched a layout different from GitLab's extraction layout;
- a job was canceled, so no complete blob exists;
- artifact expiration occurred before a delayed manual merge job;
- the expected count assumed one blob per job while multiple projects generated more.

Treat cancellation separately from failure. A canceled shard may not have a valid final report. The merge job can publish partial diagnostics, but label them as partial and should not claim full-suite coverage. A manifest generated by each shard at completion helps distinguish “zero tests selected” from “job died before reporting.”

## Make the report easy to find

GitLab exposes job artifacts, and the merge job is the natural location. Give the job a descriptive name and retain the folder. Depending on GitLab configuration, an artifact path can be browsed and \`index.html\` downloaded. Static hosting through GitLab Pages is possible but adds publication and access-control decisions; it is not required for ordinary pipeline diagnosis.

Always consider report sensitivity. Screenshots, traces, headers, and page content can contain customer or test credentials. Restrict artifact access, use synthetic accounts, mask secrets, and keep retention proportional to need. A convenient combined report is also a concentrated evidence bundle.

## Record provenance before merging

A combined report answers which tests ran, but pipeline operators also need to know whether every expected GitLab job contributed. Have each shard write a tiny text or JSON manifest containing \`CI_JOB_ID\`, \`CI_NODE_INDEX\`, \`CI_NODE_TOTAL\`, commit SHA, Playwright package version, selected project, and the blob filenames it produced. Upload that manifest beside the blob.

The merge job can validate that indices form a complete set from 1 through the expected total and that every manifest references the same commit and runner configuration. This catches stale artifact downloads, duplicated shard indices, and accidental mixing of retried jobs. Use GitLab's current pipeline artifacts only; do not merge a missing shard from a previous pipeline just to satisfy a count.

Job retries require an explicit choice. Usually the latest successful or failed attempt for a shard should replace its earlier attempt, not appear as an additional shard in the combined report. Artifact names containing job IDs prevent silent overwrite, while the manifest validator selects one attempt according to pipeline policy.

## Separate report-generation failure from test failure

The merge job can fail because an archive is corrupt, a dependency installation fails, or the expected count is wrong. That is an infrastructure failure worth surfacing, even when all test shards passed. Do not mark the report job as allowed to fail by default if the merged artifact is part of the team's release evidence.

When both tests and merging fail, preserve both signals. GitLab's job view will show failed shards and the failed merge job. Add concise merge diagnostics that list discovered zip paths, versions, and manifest status. Avoid printing archive contents, which adds noise and may expose attachments.

For very large suites, report transformation can consume significant memory. Measure the merge job and choose a runner size based on real blob volume. Splitting by browser project can reduce peak usage and produce more navigable artifacts, but then the pipeline should link all project reports clearly rather than presenting one as complete.

Verify the published directory in a pipeline smoke test. The merge command's zero exit confirms transformation, but artifact configuration can still point at the wrong folder. Assert that the expected \`index.html\` exists and that attachment subdirectories contain files when a seeded failing test produces a trace. Keep that seeded case in a dedicated pipeline fixture, not the product suite, so release pipelines do not intentionally fail.

## Frequently Asked Questions

### Why can’t I merge the HTML folders from each shard?

HTML is a final presentation format with its own assets and indexes. Use the blob reporter in shard jobs, collect the zip files, and let \`playwright merge-reports\` generate a new unified HTML directory.

### Will the merge job run if one Playwright shard fails?

It will when pipeline rules permit it, typically with \`when: always\`, and when failed shards upload artifacts with \`artifacts: when: always\`. Keep the original shard exit code intact so the pipeline still reports the regression.

### How many blob zip files should each GitLab shard produce?

Often one, but projects, filters, and reporter configuration can affect output. Inspect the actual configuration and assert a manifest that represents expected matrix cells rather than hardcoding one-per-job blindly.

### Do I need browsers installed in the report merge job?

Merging is report transformation and does not run browser tests. You still need the compatible Playwright package. Using the same pinned Playwright container is convenient, though a slimmer compatible Node image can work if dependencies are correct.

### Why are traces missing from the combined HTML report?

Confirm the test-time trace mode actually captured them, raw blob artifacts were uploaded from failed jobs, all blobs reached the merge directory, and the complete HTML folder was published. A trace mode tied to retries produces none when retries are disabled.
`,
};
