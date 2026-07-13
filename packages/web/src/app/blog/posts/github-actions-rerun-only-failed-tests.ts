import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Rerun Only Failed Tests in GitHub Actions",
  description:
    "Rerun only failed tests in GitHub Actions by persisting framework state as artifacts, targeting retries safely, and preserving the original failure evidence.",
  date: "2026-07-13",
  category: "Tutorial",
  content: `
# Rerun Only Failed Tests in GitHub Actions

A 40-minute suite fails on three cases. Clicking GitHub's “Re-run failed jobs” launches the entire test job again, because GitHub tracks jobs and steps, not individual test cases inside one process. To retry only those three cases, the test framework must record their identity and a later step or job must consume that record.

This distinction drives the design. GitHub Actions supplies storage, conditions, and job orchestration. Playwright, pytest, Jest, or another runner supplies test selection. The workflow must also retain the first attempt's evidence and fail correctly when a retry still fails.

## Native job reruns are not test-case reruns

GitHub can rerun a workflow, failed jobs plus their dependent jobs, or a specific job. The CLI exposes \`gh run rerun RUN_ID --failed\` for failed jobs. It does not inspect JUnit XML and construct a test selector.

| Retry level | Owner | Selection unit | Typical command |
|---|---|---|---|
| Workflow rerun | GitHub Actions | Entire workflow run | \`gh run rerun RUN_ID\` |
| Failed-job rerun | GitHub Actions | Failed jobs and dependents | \`gh run rerun RUN_ID --failed\` |
| Framework retry | Test runner | Failed test cases within one process | Runner-specific retry option |
| Targeted second job | Workflow plus runner | Persisted failure identities | Download artifact, pass selector |

If the suite is split so each shard is a job, native failed-job rerun is already a useful coarse retry. A targeted test retry is most valuable when one job contains many independent cases and rerunning all of them is expensive.

## Decide what failure identity means

A portable identifier must survive checkout in another job. File path plus test title works until parametrized titles, generated tests, or duplicate names appear. Framework node IDs are better when officially supported. Playwright's own last-run state is preferable to reverse-engineering report JSON because the runner owns its format and selection behavior.

The identity artifact must correspond to the same commit, configuration, shard, project, and test discovery inputs. Never download “the latest failures” from an unrelated run. Within one workflow, artifact dependencies make provenance straightforward.

## Playwright: persist last-run state between jobs

Playwright supports \`--last-failed\`, which runs only tests that failed in the previous run. The state is stored in the output directory's last-run file. Because GitHub-hosted jobs use fresh machines, upload that state from the first job and download it into the same path in the retry job.

\`\`\`yaml
name: targeted-test-retry

on:
  pull_request:

jobs:
  initial:
    runs-on: ubuntu-latest
    outputs:
      failed: \${{ steps.tests.outputs.failed }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - id: tests
        shell: bash
        run: |
          set +e
          npx playwright test
          status=$?
          if [ "$status" -eq 0 ]; then
            echo "failed=false" >> "$GITHUB_OUTPUT"
          else
            echo "failed=true" >> "$GITHUB_OUTPUT"
          fi
          exit 0
      - name: Upload first-attempt report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-initial
          path: playwright-report
          if-no-files-found: ignore
      - name: Upload last-run selection
        if: steps.tests.outputs.failed == 'true'
        uses: actions/upload-artifact@v4
        with:
          name: playwright-last-run
          path: test-results/.last-run.json
          if-no-files-found: error

  retry-failed:
    needs: initial
    if: needs.initial.outputs.failed == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - uses: actions/download-artifact@v4
        with:
          name: playwright-last-run
          path: test-results
      - run: npx playwright test --last-failed
      - name: Upload retry report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-retry
          path: playwright-report
          if-no-files-found: ignore
\`\`\`

The initial test step deliberately exits zero after capturing status so the workflow can reach a conditional retry job. This is not “ignore failures”: the retry job returns the final result. If the retry passes, the workflow passes by policy. If it fails, the workflow fails.

There is one missing policy edge: when initial tests fail but the state artifact cannot be created, the upload step fails and the retry job will not have usable input. That is correct. Silently running the full suite would hide a broken retry pipeline.

## Preserve a failure when no retry job runs

Conditional jobs can create surprising green workflows if the initial step suppresses its exit code and an orchestration expression is wrong. Add a final gate job that always runs and examines declared outputs, or keep the retry in the same job where shell status is simpler.

\`\`\`yaml
  verdict:
    needs: [initial, retry-failed]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Enforce retry policy
        env:
          INITIAL_FAILED: \${{ needs.initial.outputs.failed }}
          RETRY_RESULT: \${{ needs.retry-failed.result }}
        shell: bash
        run: |
          if [ "$INITIAL_FAILED" != "true" ]; then
            exit 0
          fi
          if [ "$RETRY_RESULT" = "success" ]; then
            exit 0
          fi
          echo "Initial tests failed and targeted retry did not pass"
          exit 1
\`\`\`

Make \`verdict\` the required branch-protection check. Otherwise the initial job is intentionally green, and a skipped retry might satisfy an incorrectly selected required check.

Some teams choose a stricter policy: any first-attempt failure fails the workflow even if retry passes. In that case targeted retry is diagnostic evidence, not a green-making mechanism. The gate should exit nonzero whenever \`INITIAL_FAILED\` is true and annotate whether the retry passed.

## A same-job retry avoids artifact transfer

When installation dominates runtime, staying on one runner is simpler. Capture the first status, preserve its report under a different directory, then call the runner's failed-test selection.

\`\`\`yaml
- name: Run Playwright and retry failed cases once
  shell: bash
  run: |
    set +e
    npx playwright test
    first=$?
    cp -R playwright-report playwright-report-initial 2>/dev/null || true

    if [ "$first" -eq 0 ]; then
      exit 0
    fi

    npx playwright test --last-failed
    retry=$?
    exit "$retry"

- name: Upload both attempts
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-attempts
    path: |
      playwright-report-initial
      playwright-report
\`\`\`

This uses the workspace's \`.last-run.json\` directly. It consumes runner minutes while the same job remains active but avoids a second checkout and dependency installation. If job timeout is tight or retries need a different machine, use separate jobs.

## Framework-neutral failure manifests

Runners without official last-failed state can emit a manifest through a custom reporter. The manifest should be machine-readable, schema-versioned, and contain supported selectors. JUnit XML is useful as evidence but is not always safe as a rerun manifest: suite and case names may not map uniquely back to CLI selectors.

\`\`\`json
{
  "schemaVersion": 1,
  "commit": "8f3a2d1",
  "framework": "example-runner",
  "shard": "2/6",
  "tests": [
    { "file": "tests/cart.spec.ts", "id": "checkout applies credit" },
    { "file": "tests/auth.spec.ts", "id": "expired session redirects" }
  ]
}
\`\`\`

Validate commit and shard before consuming it. Quote selectors as arrays in Node or Python rather than concatenating shell text. A test title can contain spaces, quotes, dollar signs, or shell metacharacters. Treat the artifact as untrusted input even though your reporter created it, because pull-request code can influence test names and files.

| Manifest source | Advantage | Risk |
|---|---|---|
| Runner-owned last-failed state | Highest compatibility with runner selection | Internal file path may be version-specific |
| Custom reporter JSON | Exact schema and metadata under team control | Reporter must track runner event semantics |
| JUnit conversion | Reuses common artifact | Names may be lossy or non-unique |
| Log parsing | Quick prototype | Formatting changes and escaping make it fragile |

Pin framework versions and test the retry workflow itself with a deliberately failing sample in a non-required workflow.

## Shards and projects require provenance

In a matrix, each job has its own failure state. Giving every artifact the same name can merge or conflict. Include project, shard, and attempt in the artifact name. Retry with the same browser project, environment variables, feature flags, and shard inputs.

Be careful with Playwright \`--last-failed\` and changed sharding topology. A last-run file recorded under one configuration should be consumed under an equivalent configuration. If the retry collapses six shards into one job, verify the framework can find all recorded tests and that project dependencies still run correctly.

An alternative is one retry job per failed shard. It is less resource-efficient when many shards fail but preserves environment equivalence. Dynamic matrix generation from artifacts is possible, though complexity can exceed the minutes saved.

## Retries can hide order dependence

Running only failed cases changes test order and shared-state context. A case that passes alone but fails after another case is not proven flaky; it may be polluted by its predecessor. Keep the full first-attempt trace, worker logs, seed, and ordering. Add a follow-up reproduction that runs the predecessor and failure together.

Playwright's built-in retries run failed tests in a new worker, which helps isolate worker corruption and labels flaky outcomes. A separate GitHub job also starts fresh but loses process-local diagnostics unless uploaded. The [Playwright retry guide](/blog/playwright-retries-flaky-tests-guide-2026) explains those semantics.

Do not retry deterministic failures such as TypeScript compilation, failed setup, missing secrets, or an empty test selection. Targeted retry should begin only after a test runner executed and produced valid failure state.

## Artifacts are evidence, not cache

GitHub artifacts persist files after a job and transfer them to dependent jobs. Dependency caches optimize reused packages. Do not place the failure manifest in a shared cache: cache keys can restore stale state, and caches are not designed as run-specific evidence.

Upload the first report under an immutable name before retry overwrites output. Include traces, screenshots, and logs based on test framework settings. Set retention according to debugging and data policy. Test artifacts can contain credentials, personal data, or page content.

For wider workflow design, see the [GitHub Actions testing guide](/blog/github-actions-testing-ci-cd-guide).

## Measure what the retry policy does

Track first-pass failure count, retry pass count, repeated failures, added minutes, and top unstable tests. Do not call every retry-pass “flaky” automatically. Infrastructure interruption, leaked state, and actual nondeterminism need different owners.

A rising retry recovery rate is not success. It can mean the workflow is masking a deteriorating suite. Set quarantine and repair policies, and keep a strict path for release-critical tests.

## Concurrency cancellation can strand the verdict

Workflows often use a concurrency group with \`cancel-in-progress: true\` so a new commit cancels an older run. Cancellation can occur after the initial job uploads failures but before retry or verdict completes. That is desirable for obsolete commits, but branch protection must evaluate the newest commit's check, not interpret a canceled old verdict as success.

Do not trigger a second workflow through \`workflow_run\` merely to retry tests unless cross-workflow separation is required. Workflows triggered by another workflow have different security considerations, especially for untrusted pull requests, and artifact download needs explicit run provenance. A dependent job inside one workflow is simpler and inherits a clear commit.

Set job timeouts independently. The retry should have enough time for the failed set plus setup, not the full suite's arbitrary timeout. If the selection unexpectedly expands to all tests, a tighter timeout and logged test count expose the problem.

## Pull-request code can influence artifacts

Failure manifests, reports, and even output values originate from code under test. Never evaluate an artifact as shell. Parse JSON in a script, validate paths remain within the checkout, cap the number of selectors, and pass arguments through a process API.

Fork pull requests do not receive ordinary repository secrets. A retry job must not elevate permissions merely because the first job failed. Keep \`permissions\` minimal, avoid \`pull_request_target\` for executing untrusted code, and do not upload sensitive environment dumps.

Artifact names are not authentication. In cross-run download scenarios, validate repository, workflow, commit SHA, and run ID through the GitHub context or API. Within the same workflow, \`needs\` and the default artifact download scope reduce ambiguity.

## Annotate flaky recovery without erasing red

When policy permits retry-pass to go green, publish a visible summary. GitHub step summaries can list failed test IDs, retry outcome, artifact names, and owner hints. Escape Markdown derived from test titles. The pull request should not require opening logs to discover that the first attempt failed.

\`\`\`bash
{
  echo "## Targeted retry"
  echo
  echo "Initial attempt: failed"
  echo "Retry attempt: passed"
  echo "Evidence artifact: playwright-report-initial"
} >> "$GITHUB_STEP_SUMMARY"
\`\`\`

Do not add or remove repository labels from untrusted test output without a controlled mapping. A separate triage automation can consume structured results with appropriate permissions.

## Matrix aggregation needs an explicit final state

For browser and shard matrices, one aggregate job should depend on every initial and retry result. GitHub expressions over dynamic matrices are awkward, so a common design keeps retry within each matrix job and uploads per-cell evidence. The aggregate only checks cell conclusions.

If retries run as a second matrix, generate entries from trusted job outputs rather than arbitrary artifact text. Include \`project\`, \`shard\`, and artifact name. An empty matrix may skip the retry job; the verdict must treat “no failures” differently from “manifest generation failed.”

Test three workflow states with a tiny fixture suite: all pass initially, one fails then passes, and one fails twice. Also simulate a missing last-run file. These are orchestration contract tests and catch more than staring at YAML in review.

## Rerunning changed code from the same commit

Every retry job must check out the exact \`github.sha\` tested initially. The checkout action normally does this within the same workflow, but explicit ref settings or merge commits can diverge. Record the commit in the failure manifest and compare it to \`GITHUB_SHA\` before selecting tests.

Generated code, downloaded browsers, and service images also need equivalence. Pin lockfiles and container digests where practical. If a retry silently installs a newer browser or points at a different ephemeral environment, a pass does not isolate test nondeterminism.

Artifacts should carry inputs that cannot be reconstructed, not the entire checkout. Re-checkout from GitHub preserves source provenance and reduces the risk of executing modified files from an artifact.

## Handle “no tests found” as an orchestration error

A stale or malformed selector can cause some runners to exit nonzero, while others can be configured to succeed when no tests match. For targeted retry, zero selected tests must not count as recovery. Capture the runner's discovered or executed count through its reporter and require at least one when the initial manifest is non-empty.

Similarly, if ten failures were recorded and only nine are selected, fail the retry infrastructure or explain an intentional exclusion. Deleted or renamed tests cannot normally occur in the same commit, so missing selection indicates configuration drift.

## Frequently Asked Questions

### Why does GitHub's “Re-run failed jobs” rerun passing tests in that job?

GitHub only knows the job failed. The test process must persist case-level failure identities and use a runner-specific selector for narrower retries.

### Can I use JUnit XML as the failure list?

You can, but only if you can map its case identity back to unique, safely escaped runner selectors. A runner-owned last-failed file is usually safer.

### Should the workflow pass when the targeted retry passes?

That is a team policy. If yes, make a final verdict job the required check. If no, keep the retry for diagnosis and fail on any first-attempt failure.

### Why upload the first report before rerunning?

The retry may overwrite report directories and can pass, erasing the evidence needed to diagnose the original failure.

### Are artifacts necessary when retrying in the same job?

No. The runner workspace already contains last-run state. Artifacts become necessary for cross-job transfer and remain valuable for post-run evidence.
`,
};
