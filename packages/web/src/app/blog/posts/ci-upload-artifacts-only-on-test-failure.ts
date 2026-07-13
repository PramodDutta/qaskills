import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Upload Test Artifacts Only on CI Failure",
  description:
    "Upload test artifacts only on CI failure to cut routine storage use while preserving logs, screenshots, traces, and reports when engineers need evidence.",
  date: "2026-07-13",
  category: "Guide",
  content: `
# Upload Test Artifacts Only on CI Failure

The green run has 600 screenshots, three trace archives, and a video nobody will watch. The red run has exactly the evidence needed to explain a timeout. Treating those two outcomes identically is an expensive default, not a useful test policy. A failure-only upload policy keeps diagnostic output on the runner during execution, then persists it only when the job has something worth investigating.

The distinction matters because artifact generation and artifact retention are separate decisions. A browser test can still capture a screenshot or write a JUnit XML file locally. The CI workflow decides whether those files leave the ephemeral runner. This guide focuses on that second decision, including GitHub Actions status expressions, matrix jobs, missing paths, retries, cancellations, and evidence that must survive even on successful runs.

## Draw the boundary between reports and debug debris

Not every file produced by a test belongs in the same retention class. A machine-readable test report may feed a check annotation, trend dashboard, or compliance record. A Playwright trace is usually an incident packet. Coverage can be a release signal. A browser video may only be valuable after failure. Before changing YAML, inventory outputs by consumer and purpose.

| Output | Typical consumer | Keep after success? | Failure value |
| --- | --- | --- | --- |
| JUnit XML | CI test reporter and trend service | Often yes, or publish to a reporter | Identifies failed cases and durations |
| Playwright trace | Engineer debugging a browser failure | Usually no | Replays actions, DOM snapshots, console, and network |
| Cypress video | Engineer investigating timing or visual state | Rarely | Shows the sequence leading to failure |
| Failure screenshot | Engineer or issue automation | No useful success equivalent | Captures the rendered state at assertion time |
| Coverage summary | Quality gate and pull request review | Often yes | Shows whether failure interrupted collection |
| Application logs | Engineer, sometimes audit storage | Depends on policy | Correlates test symptoms with server errors |

The safest implementation starts by splitting publish steps. Keep the small output that another system consumes, while gating large diagnostic directories. Do not wrap every output path in one artifact and call the problem solved. A single mixed archive forces the broadest retention rule onto every file inside it.

For browser suites, configure the runner to generate evidence with failure-aware settings where possible. Playwright can retain traces only on the first retry, while Cypress can take screenshots on run failure. CI-side upload gating then provides a second control. Generation policy reduces runner I/O and archive size; upload policy reduces remote storage and transfer.

If you are designing the evidence itself, the [Playwright screenshots, videos, and traces guide](/blog/playwright-screenshots-videos-traces-complete-guide) explains what each medium reveals. The key operational point here is to produce enough local evidence before the upload step is reached.

## Use the status function that matches the incident

GitHub Actions applies an implicit success check to later steps. After a test step exits nonzero, a normal upload step is skipped. Adding \`if: failure()\` tells Actions to evaluate the upload after a preceding failure in the job. That is materially different from \`always()\`, which also runs for success and cancellation.

This complete job runs Playwright, publishes JUnit results on every non-cancelled run, and uploads heavyweight browser evidence only when a preceding step fails:

\`\`\`yaml
name: Browser tests

on:
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Run browser suite
        id: tests
        run: npx playwright test

      - name: Publish machine-readable results
        if: \${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: junit-\${{ github.run_id }}-\${{ github.run_attempt }}
          path: test-results/junit.xml
          if-no-files-found: warn
          retention-days: 7

      - name: Upload failure diagnostics
        if: \${{ failure() }}
        uses: actions/upload-artifact@v4
        with:
          name: playwright-failure-\${{ github.run_id }}-\${{ github.run_attempt }}
          path: |
            playwright-report/
            test-results/
            logs/application.log
          if-no-files-found: warn
          retention-days: 7
\`\`\`

The artifact name includes both the run ID and attempt. A rerun belongs to the same workflow run but has a different attempt number. Including both makes downloads unambiguous and avoids asking an investigator whether a trace came from the original failure or the rerun.

\`failure()\` becomes true when a previous step in the same job fails. It also reflects failed ancestor jobs when used in dependent jobs, but that broader behavior requires careful handling. At step level, the model is simple: execute tests, let their exit status remain truthful, then run the diagnostic upload under a failure status function.

Do not put \`continue-on-error: true\` on the test step merely to reach the uploader. It changes the outcome that later status functions observe and can let a broken suite appear green. The status expression exists specifically so cleanup and evidence steps can run after failure without neutralizing it.

## Keep cancellations distinct from failures

A cancelled run is not necessarily a failed test. A developer may push a new commit and concurrency settings cancel the obsolete run. A timeout can also cancel work before reporters flush buffers. Uploading a partial multi-gigabyte video from every superseded run defeats the storage objective and may prolong cancellation.

Use \`failure()\` when the policy is strictly “a step failed.” Use \`!cancelled()\` for small reports that should survive success or failure but should not delay a cancelled job. Reserve \`always()\` for cleanup or notification steps whose cancellation behavior is deliberately understood. GitHub warns that always-running steps can be problematic for operations that may hang.

| Expression | Runs after success | Runs after failure | Runs after cancellation | Suitable artifact policy |
| --- | ---: | ---: | ---: | --- |
| \`success()\` | Yes | No | No | Release bundles produced only by green builds |
| \`failure()\` | No | Yes | No | Screenshots, traces, core dumps, verbose logs |
| \`!cancelled()\` | Yes | Yes | No | Compact test results needed by a reporter |
| \`always()\` | Yes | Yes | Yes | Rare, time-bounded cleanup evidence |

Cancellation semantics should also shape the test reporter. A process terminated by the runner may never close its JSON or HTML file. Set \`if-no-files-found\` according to what absence means. \`warn\` is pragmatic for diagnostics because an early setup failure may occur before the output directory exists. \`error\` is appropriate only if the workflow contract guarantees the path and losing it should independently fail the job. \`ignore\` is quiet, but it can hide a broken reporter configuration for months.

## Make a matrix failure point to one shard

Matrix jobs create one job per operating system, browser, or shard. Each job has its own status and filesystem. A failure-only upload step inside the matrix job naturally persists evidence only for the failing combinations. Give every archive a unique name using matrix values; artifact names cannot safely collapse simultaneous shards into a vague “test-results” bundle.

\`\`\`yaml
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
        shard: [1, 2, 3, 4]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx playwright install --with-deps \${{ matrix.browser }}
      - name: Execute shard
        run: >-
          npx playwright test
          --project=\${{ matrix.browser }}
          --shard=\${{ matrix.shard }}/4
      - name: Preserve failing shard
        if: \${{ failure() }}
        uses: actions/upload-artifact@v4
        with:
          name: failure-\${{ matrix.browser }}-shard-\${{ matrix.shard }}-attempt-\${{ github.run_attempt }}
          path: |
            test-results/
            playwright-report/
          if-no-files-found: warn
          retention-days: 5
\`\`\`

\`fail-fast: false\` is important for diagnosis, not for upload syntax. With the default fail-fast behavior, one matrix failure can cancel in-progress siblings. That saves compute but leaves uncertainty about the other combinations and can produce cancelled jobs with incomplete evidence. Decide based on suite duration and failure clustering. For a release smoke test, early cancellation may be right. For a cross-browser compatibility gate, finishing all three browsers often gives a better defect map.

If the suite writes every shard to the same relative path, that is fine because matrix jobs use separate runners. The uniqueness requirement applies to remote artifact names. Put browser, shard, platform, and attempt in the name only when each varies. Excessively long names slow scanning in the Actions UI.

## Prevent the uploader from hiding the original defect

An artifact step is diagnostic infrastructure. It must not become the most visible failure in the run. Common causes include nonexistent paths, permission errors, files still being written, and archives too large to transfer before timeout.

First, ensure the test process exits cleanly enough to flush reporters. Shelling out to a background server without teardown can keep handles open or leave logs buffered. Use the framework’s web server support or a dedicated service container when possible. If a custom server is necessary, trap termination and write logs in the workspace rather than a transient system directory.

Second, upload narrow paths. Archiving the repository root can include dependencies, browser binaries, caches, secrets in configuration files, and unrelated build output. An explicit allowlist is easier to audit. Check that screenshots, videos, and traces are nested below the selected directories, then exclude known bulk files if the action’s path patterns can express the policy.

Third, protect sensitive output. Browser traces can contain DOM text, URLs, request metadata, and sometimes credentials entered during a test. Application logs can contain tokens if redaction is poor. Failure-only retention lowers exposure frequency, but it does not sanitize content. Limit artifact access through repository permissions, shorten retention, and fix secret logging at the source.

Fourth, leave the test step’s nonzero exit intact. If the upload itself fails, the job will still be red, but the UI may focus attention on the last failing step. Give the uploader a descriptive name and keep \`if-no-files-found: warn\` for optional evidence. For regulated evidence where upload is mandatory, a hard failure is legitimate, but the alert should still surface the original test result.

## Put retention days behind an evidence policy

“Failure only” answers when an archive is created. It does not answer how long the archive remains useful. Match retention to investigation latency and repository policy. A pull request suite may need five to fourteen days because the relevant commit changes quickly. A nightly soak failure may need longer if triage happens weekly. A release qualification record may belong in a separate governed store rather than ordinary workflow artifacts.

GitHub’s \`retention-days\` input cannot exceed the repository, organization, or enterprise limit. Setting a larger number in YAML does not override governance. Prefer an explicit value on diagnostic uploads so a repository-wide maximum does not silently become the operational default for disposable traces.

Estimate the effect using repository observations, not invented universal savings. Record the passing run count, failing run count, mean archive size by output type, and retention period. A simple monthly model is:

\`\`\`text
always-upload volume = all runs * mean archive size
failure-only volume = failing runs * mean failure archive size
avoided upload volume = always-upload volume - failure-only volume
\`\`\`

This is transfer volume, not a precise billing forecast. Stored volume depends on expiration timing, reruns, compression, deletions, and concurrent retention windows. Use the Actions billing and artifact APIs when cost attribution needs to be exact.

The [GitHub Actions testing and CI/CD guide](/blog/github-actions-testing-ci-cd-guide) provides the larger workflow context, including job dependencies and quality gates. Failure-only artifacts fit into that design as an observability choice, not as the gate itself.

## Audit the policy with intentional failures

YAML review alone does not prove the artifact is usable. Create a temporary branch with one deterministic failing test after the reporter initializes. Confirm that the job remains failed, the diagnostic step runs, the archive name identifies the matrix cell, and the downloaded archive contains a viewable trace or report.

Then make the same test pass. The heavy diagnostic artifact should be absent, while any deliberately retained JUnit result remains. Cancel a run during execution and verify that your chosen cancellation policy behaves as documented. Finally, fail during setup before the test command. The uploader should warn about missing paths rather than obscure the setup error.

| Probe | Expected job status | Expected remote evidence |
| --- | --- | --- |
| Assertion fails after first browser action | Failure | Trace, screenshot, and local report for that shard |
| Entire suite passes | Success | No heavy diagnostic archive |
| Dependency installation fails | Failure | Upload step runs, missing diagnostic paths only warn |
| Workflow is superseded and cancelled | Cancelled | No failure-only archive |
| Second run attempt fails | Failure | Archive name contains the new attempt number |

Repeat the audit when upgrading the upload action, moving reporter directories, changing test runners, or enabling matrix sharding. The most common policy regression is not a status expression change. It is a path change that leaves the upload step green but empty.

## Preserve retry evidence without archiving every successful attempt

Framework retries complicate the word “failure.” A test may fail on its first attempt, produce the most valuable trace, then pass on retry and leave the CI test command successful. At that point GitHub’s \`failure()\` is false, so a step-level failure-only upload will not run. This is correct according to job status, but it may conflict with a team policy that treats flaky recovery as an investigation event.

Choose the unit explicitly. If only terminal job failures warrant remote evidence, keep the workflow shown above and let framework retry settings retain files locally only as needed. If any failed attempt warrants evidence, make the test runner produce a small marker when it observes a retry or flaky result, then use a step output or a subsequent detection step to condition the upload. Do not infer flakiness merely from the existence of a results directory, because passing suites also write reports.

For Playwright, JSON or JUnit results can be parsed for outcomes such as flaky tests after the command completes. For another runner, use its documented reporter events. The workflow condition can combine status and an explicit step output, for example a failure status OR a discovered-flake flag. Keep the parser versioned with the report schema, and make parser errors visible rather than silently treating them as “no flake.”

Rerunning an entire GitHub Actions job creates a new run attempt. The original attempt’s artifact remains useful because the rerun starts on a fresh runner and cannot reconstruct the first machine’s state. A passing second attempt should not overwrite or ambiguously duplicate that first archive. The run-attempt suffix in the artifact name preserves the chronology: attempt one contains the incident, attempt two documents recovery through normal logs, and the pull request still has a traceable explanation for why someone clicked rerun.

## Frequently Asked Questions

### Should I use failure() or always() for screenshots?

Use \`failure()\` when screenshots are debugging evidence and successful runs do not need them. \`always()\` also executes after success and cancellation, so it does not implement a failure-only policy. If another system requires a small result file for both pass and fail, give that file a separate upload step using \`!cancelled()\`.

### Will the upload run when the test command exits nonzero?

Yes, if the upload is a later step in the same job and its condition includes \`failure()\`. A normal step has an implicit success condition and would be skipped. Avoid converting the test failure with \`continue-on-error\`, because doing so changes the status logic and can misrepresent the gate.

### What happens when no trace directory exists?

Set \`if-no-files-found: warn\` for optional diagnostic paths. This situation is normal when installation or server startup fails before the test framework creates its output. A warning preserves the original failure while making the missing evidence visible. Use \`error\` only when the path is a guaranteed part of your test contract.

### How should artifacts be named in a sharded suite?

Include the dimensions required to locate the failing execution, usually browser or platform, shard number, and \`github.run_attempt\`. The run UI already supplies repository, workflow, commit, and run context, so repeating every identifier produces noise. Ensure concurrent matrix jobs never target the same artifact name.
`,
};
