import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Store Playwright Trace Artifacts in CircleCI',
  description:
    'Store Playwright trace artifacts in CircleCI only after failed tests, with correct trace settings, artifact paths, parallel-node naming, and retention controls.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Store Playwright Trace Artifacts in CircleCI

The browser test fails on CircleCI, the job turns red, and the only useful evidence remains inside an ephemeral container that is about to disappear. A Playwright trace solves that diagnostic gap only if the trace archive is actually created, survives the failed test step, and is uploaded from the path CircleCI expects.

This guide configures Playwright to record a trace for the first retry, keeps the job moving long enough to publish it, and stores artifacts only when the test command fails. The result is a small, intentional failure bundle rather than a permanent archive of every successful browser interaction.

## Three independent decisions control trace storage

Playwright and CircleCI handle different parts of the workflow. Playwright decides when to capture a trace and where to write it. CircleCI decides whether to execute an artifact step and how to retain the resulting files. Confusing those layers causes most broken configurations.

| Decision | Owner | Recommended failure-focused setting |
|---|---|---|
| Whether a retry happens | Playwright Test | At least one retry in CI |
| Which attempt records a trace | Playwright Test | \`trace: 'on-first-retry'\` |
| Output directory for test evidence | Playwright Test | Explicit \`outputDir\` or default \`test-results\` |
| Whether upload runs after failure | CircleCI | \`when: on_fail\` on \`store_artifacts\` |
| How long artifacts remain | CircleCI plan settings | Short enough for the debugging window |

The setting \`on-first-retry\` does not record the initial failed attempt. It records the first retry, which is usually the useful compromise recommended for CI. If a failure occurs once and the retry passes, the trace captures the retry that passed, not the original failed execution. For intermittent failures that disappear immediately, consider \`retain-on-failure\` instead. It records each run and deletes traces for passing attempts, leaving the failing attempt available.

## Configure Playwright’s failure evidence

Put the policy in \`playwright.config.ts\`, not in individual specs. A centralized configuration ensures every project and shard follows the same rules. The following uses the real Playwright Test configuration API and gives CircleCI a stable directory to upload.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['junit', { outputFile: 'junit/results.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:3000',
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
\`\`\`

Playwright places per-test artifacts beneath \`outputDir\`. The directories include a sanitized test identity and project name. Do not write a shell rule that assumes one fixed \`trace.zip\` location. Upload the containing directory or find archives recursively.

The JUnit report is separate from traces. CircleCI’s \`store_test_results\` parses test reports for the Tests tab and timing data. \`store_artifacts\` provides downloadable files. Use both when you need test analytics and trace debugging.

## Make a failed run reach the artifact step

CircleCI supports a \`when\` attribute on steps. For artifact uploads, \`on_fail\` is the direct expression of the requirement. The test step fails normally, CircleCI marks the job failed, and the later artifact step still runs because it is conditioned on failure.

\`\`\`yaml
version: 2.1

jobs:
  playwright:
    docker:
      - image: mcr.microsoft.com/playwright:v1.55.0-noble
    resource_class: medium
    steps:
      - checkout

      - restore_cache:
          keys:
            - pnpm-v1-{{ checksum "pnpm-lock.yaml" }}

      - run:
          name: Enable Corepack and install dependencies
          command: |
            corepack enable
            pnpm install --frozen-lockfile

      - run:
          name: Run Playwright tests
          command: pnpm exec playwright test

      - store_test_results:
          path: junit

      - store_artifacts:
          path: test-results
          destination: playwright/test-results
          when: on_fail

workflows:
  test:
    jobs:
      - playwright
\`\`\`

Pin the Playwright container image to a version compatible with the installed \`@playwright/test\` package. A mismatched image can lack the expected browser build. The exact version above is illustrative for a project using the matching package version; update both together in your repository.

Do not append \`|| true\` to the test command. That converts the test step into a success, so \`when: on_fail\` will not match and the workflow may pass despite failed tests. The artifact condition exists precisely to avoid swallowing the exit code.

## Choose between on-first-retry and retain-on-failure

The trace mode changes diagnostic coverage, runtime, and storage. Make the choice based on failure behavior rather than copying a default blindly.

| Trace mode | What is retained | Best fit | Important limitation |
|---|---|---|---|
| \`off\` | Nothing | Very small smoke jobs with other diagnostics | No action timeline or DOM snapshots |
| \`on\` | Every attempt | Short, high-risk suites during investigation | Highest capture and storage overhead |
| \`retain-on-failure\` | Traces from failed attempts | Intermittent failures that may pass on retry | Capture work occurs on passing attempts too |
| \`on-first-retry\` | First retry only | Normal CI suites balancing evidence and cost | Initial failure is not traced |
| \`on-all-retries\` | Every retry | Failures whose behavior changes between retries | No trace of the original attempt |

For a suite with no retries, \`on-first-retry\` produces no trace. That quiet failure mode is easy to miss. If policy requires one execution only, use \`retain-on-failure\`. If retries are enabled in config but overridden by \`--retries=0\` in CI, the same issue appears.

## Verify the path before blaming CircleCI

When the artifact tab is empty, first inspect what Playwright wrote. Add a temporary diagnostic step that runs only after failure. CircleCI’s shell should not fail simply because no archive exists.

\`\`\`yaml
- run:
    name: List Playwright failure files
    command: |
      echo "CIRCLE_NODE_INDEX=\${CIRCLE_NODE_INDEX:-0}"
      find test-results -maxdepth 4 -type f -print 2>/dev/null || true
    when: on_fail

- store_artifacts:
    path: test-results
    destination: playwright/test-results
    when: on_fail
\`\`\`

Inside this article’s TypeScript template literal, the dollar expressions are escaped, but in the resulting YAML they are normal shell variable references. \`CIRCLE_NODE_INDEX\` is supplied for parallel CircleCI jobs and starts at zero.

If \`test-results\` does not exist, inspect the Playwright configuration loaded by the job, the working directory, retry count, and command-line overrides. If the directory contains traces but CircleCI shows no artifact step, confirm the preceding test step actually failed and the YAML indentation places \`when\` on \`store_artifacts\`.

## Parallel CircleCI nodes need distinguishable destinations

With CircleCI \`parallelism\`, each node runs in its own container. Each can have a local \`test-results\` directory without collisions, and CircleCI presents artifacts within the individual parallel run. Put the node index in a generated manifest or archive filename when downloaded files must remain distinguishable outside that job view.

Combine that with Playwright sharding so each node receives a unique portion of the suite:

\`\`\`yaml
jobs:
  playwright:
    parallelism: 4
    docker:
      - image: mcr.microsoft.com/playwright:v1.55.0-noble
    steps:
      - checkout
      - run:
          name: Install dependencies
          command: |
            corepack enable
            pnpm install --frozen-lockfile
      - run:
          name: Run this Playwright shard
          command: >-
            pnpm exec playwright test
            --shard=$((CIRCLE_NODE_INDEX + 1))/$CIRCLE_NODE_TOTAL
      - store_artifacts:
          path: test-results
          destination: playwright/test-results
          when: on_fail
\`\`\`

Playwright shard numbers are one-based, while \`CIRCLE_NODE_INDEX\` is zero-based, hence the arithmetic addition. If you use CircleCI test splitting by timing rather than Playwright’s \`--shard\`, keep the same per-node artifact convention. The [CircleCI Playwright timing split guide](/blog/circleci-split-playwright-tests-by-timing) covers that scheduling problem separately.

Artifact upload happens independently on each failing node. A passing node has no upload because its \`when: on_fail\` condition is false. That is desirable: the artifact list points directly to the partitions needing investigation.

## Preserve exit status when packaging traces

Uploading a directory is simplest. For large suites, many small files make uploads slower and browsing noisier. Packaging only traces into one archive per node can be useful, but the packaging step must tolerate an empty match and run after failure.

This script uses standard POSIX shell plus \`find\` and \`tar\`. It creates an archive only if at least one \`trace.zip\` exists.

\`\`\`bash
#!/usr/bin/env bash
set -eu

mkdir -p trace-artifacts
find test-results -type f -name 'trace.zip' -print > trace-artifacts/files.txt

if [ -s trace-artifacts/files.txt ]; then
  tar -czf "trace-artifacts/traces-node-\${CIRCLE_NODE_INDEX:-0}.tar.gz" \\
    -T trace-artifacts/files.txt
else
  echo 'No Playwright trace archives were produced.'
fi
\`\`\`

Run it in a CircleCI step with \`when: on_fail\`, then store \`trace-artifacts\` with the same condition. Do not delete the original test output until the packaging behavior is proven, because screenshots and \`test-failed-*.png\` files may still matter.

## Open the archive without unsafe shortcuts

A Playwright \`trace.zip\` can be opened locally with \`pnpm exec playwright show-trace path/to/trace.zip\`. You can also use the hosted trace viewer and load the archive in the browser. The hosted viewer processes the trace in the browser, but teams with strict data handling rules should still review what traces contain before using any external page.

Traces can capture DOM snapshots, network metadata, console messages, source references, and values visible in the page. They may include personal data, access tokens rendered in the UI, internal URLs, or confidential test fixtures. Use synthetic accounts, prevent secrets from entering the page where possible, and apply the same access controls you use for logs and screenshots.

For a detailed investigation workflow, see the [Playwright Trace Viewer guide](/blog/playwright-trace-viewer-complete-guide-2026). Start at the failing assertion, inspect the action immediately before it, compare the DOM snapshot, then review console and network activity. A trace is most effective when the test uses meaningful steps and resilient locators.

## Control storage without losing useful failures

Failure-only upload reduces volume, but one systemic outage can still generate hundreds of archives. CircleCI recommends compressing large collections and reviewing artifact retention because storage and network usage can affect plan consumption.

Use these controls deliberately:

- Retain one trace policy across the suite instead of enabling \`trace: 'on'\` casually.
- Keep videos off unless they answer a question the trace cannot.
- Use per-node archives for large parallel jobs.
- Set artifact retention in CircleCI’s Plan Usage Controls to match the team’s actual debugging window.
- Avoid uploading dependencies, browser caches, HTML reports with duplicated embedded assets, or the entire workspace.
- Promote only a small, redacted reproducer to long-term defect records.

Test results and artifacts serve different retention needs. Timing history may deserve a longer life than a trace containing sensitive page state. Do not use a workspace or cache as a substitute for artifacts: caches accelerate future jobs, and workspaces pass files to downstream jobs, while artifacts are intended for post-job access.

## Diagnose the common empty-artifact patterns

An empty artifact result usually follows one of a few precise causes.

**The retry never ran.** The suite has \`trace: 'on-first-retry'\` but \`retries: 0\`. Enable a retry or switch to \`retain-on-failure\`.

**The test output was redirected.** A project-specific \`outputDir\`, CLI config file, or changed working directory means CircleCI uploads the wrong path. List files from the job’s actual directory.

**The command was forced green.** \`playwright test || true\` prevents \`on_fail\` steps from matching. Allow the original nonzero exit code.

**The job was canceled or hard-killed.** A condition cannot upload files after the executor disappears. Job-level timeouts, out-of-memory termination, or manual cancellation may leave no opportunity for teardown.

**The trace is nested.** Playwright stores it in a per-test folder. Upload the whole output directory or search recursively.

**The artifact step points at a nonexistent file.** CircleCI requires the path to exist in the primary container. Docker sidecars and remote hosts do not share that filesystem automatically.

## Make one failed job reproducible from its artifact page

A trace is more useful when the artifact path carries enough context to locate the exact test execution. Playwright already records project and test information inside its output folder, but the CI job should also expose the commit SHA, workflow, parallel node, Playwright version, and relevant application build. CircleCI provides much of this metadata as environment variables. Put nonsecret values into a small text manifest beside the trace.

Do not copy the whole environment into that manifest. Environment dumps routinely expose tokens, connection strings, and credentials. Select an allowlist such as \`CIRCLE_SHA1\`, \`CIRCLE_WORKFLOW_ID\`, \`CIRCLE_NODE_INDEX\`, Node version, package version, browser project, and tested base URL when the URL itself is not sensitive. The failing test title and retry number are available through Playwright output and reports.

When a developer downloads a trace, the reproduction sequence should be clear: check out the recorded commit, install the locked dependencies, start the same application build, run the named Playwright project and test, then open the trace if the failure does not reproduce. Put that procedure in repository documentation rather than inside every artifact.

Trace paths should remain stable across retries. CircleCI already scopes artifacts to an individual parallel run, while a generated filename such as \`traces-node-2.tar.gz\` preserves identity after download. Do not place shell-style variables in the static \`store_artifacts.destination\` value and assume they will expand. Adding random timestamps makes links harder to compare and does not improve isolation.

## Treat trace upload failure as diagnostic degradation

The test result and the evidence upload are separate outcomes. If Playwright fails and artifact storage also fails, the job must remain red for the test, while the logs should clearly report that diagnostics are incomplete. Do not rerun a failing product test automatically just because the upload service had a transient problem unless the workflow records which outcome triggered the rerun.

CircleCI executes \`store_artifacts\` as a platform step, so there is less shell logic to maintain. If you add packaging, keep it observable: print the number and total size of trace archives, fail the packaging step for corrupt input, and tolerate only the intentional zero-trace case. A green packaging command that silently produces an empty archive wastes the incident response window.

Set a practical upper bound. A suddenly enormous trace directory may indicate that tracing was enabled for every passing attempt or that downloads were written under \`test-results\`. Before upload, a diagnostic \`du -sh test-results\` makes that visible. Avoid deleting evidence solely to satisfy a size cap; instead, fail with a clear message or select the documented artifact types.

## Test the CI configuration with an intentional failure

Do not wait for a real flaky test to validate the pipeline. On a temporary branch, add a test that performs a few meaningful actions and fails an assertion. Confirm the job fails, a retry occurs under the chosen trace mode, the artifact step runs, and the downloaded \`trace.zip\` opens. Then remove the intentional failure.

This exercise catches wrong directories, YAML indentation, image-version mismatches, retry overrides, and permissions before an incident. Repeat it after changing Playwright reporters, output directories, CircleCI parallelism, or container images. Configuration syntax validation alone cannot prove a trace is produced and useful.

Record the expected behavior for three cases: all tests pass, a test fails and produces a trace, and the executor terminates before upload. The first should avoid trace storage, the second should expose evidence, and the third should be recognized as an infrastructure limitation rather than misdiagnosed as a missing Playwright feature.

## Frequently Asked Questions

### Why is there no trace when the only test attempt failed?

\`on-first-retry\` records the first retry, not the first run. With zero retries, no trace is created. Set \`retries: 1\` in CI or use \`trace: 'retain-on-failure'\` when you need the original failed attempt.

### Does store_artifacts run after a nonzero Playwright exit code?

Yes, when the step has \`when: on_fail\`. Let the Playwright command fail normally. CircleCI continues to eligible failure-conditioned steps while preserving the job’s failed status.

### Should JUnit XML be uploaded with store_artifacts?

Use \`store_test_results\` for JUnit XML so CircleCI can parse tests and timing. You may also store it as an artifact for raw download, but that is a separate purpose from test analytics.

### How do I identify which parallel node produced a trace?

Include \`CIRCLE_NODE_INDEX\` in a generated archive filename or manifest. The local output directories and CircleCI parallel-run views are isolated already, while the label keeps downloaded evidence attributable to its node.

### Can a trace archive expose secrets?

Yes. DOM snapshots, request information, console output, and page content can contain sensitive data. Use synthetic fixtures, restrict artifact access and retention, and review trace contents under your organization’s data-handling policy.
`,
};
