import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Build a Rerun-Failed-Tests Workflow in CircleCI",
  description:
    "Build a CircleCI rerun-failed-tests workflow that persists Playwright failure state, retries only failed tests in a follow-up job, and reports honestly.",
  date: "2026-07-13",
  category: "Tutorial",
  content: `
# Build a Rerun-Failed-Tests Workflow in CircleCI

Job one executes 1,200 browser tests and leaves seven failures. Starting all 1,200 again in job two wastes browsers, containers, and feedback time. Playwright already records the failed test identities for \`--last-failed\`. A CircleCI workspace can carry that state into a dedicated follow-up job, where only those seven tests run again.

The difficult part is not the rerun command. CircleCI normally stops a failed job and downstream jobs that require it do not run. If the first job is forced green without preserving its result, the workflow can also report success when tests never recovered. A correct design separates execution from final verdict: capture the first exit code, persist Playwright's last-run state, run the follow-up, and fail the workflow if the selected failures still fail or rerun infrastructure is missing.

This tutorial uses Playwright Test, but the control-flow design applies to any runner that can emit a durable failed-test manifest. It does not use CircleCI's UI “rerun failed tests” action, which launches a rerun from the platform. Here the follow-up is encoded in \`.circleci/config.yml\` and therefore happens automatically on every eligible workflow.

## Define honest outcomes before writing YAML

There are three meaningful first-job states:

| Initial state | Follow-up action | Workflow verdict |
|---|---|---|
| All tests pass | Skip rerun | Pass |
| Some tests fail and all selected tests pass once rerun | Record recovered failures, then pass or mark unstable by policy | Explicit policy decision |
| Some tests fail and at least one selected test fails again | Fail | Persistent product or test defect |
| Runner crashes before producing failure state | Do not pretend there are zero failures | Fail as infrastructure error |
| Test command is canceled | Preserve cancellation semantics where possible | Do not convert it into success |

Whether a recovered failure should pass the pipeline is a governance decision. Many teams allow one recovery while tracking flake debt. Safety-critical or deployment-gating suites may fail on any initial failure. The implementation must expose both attempts so that policy can change without reconstructing lost evidence.

The workflow below uses a pass-after-recovery policy. It publishes both reports and prints a clear recovery message. It never runs the entire suite in the follow-up.

## Let Playwright write durable last-failed state

Playwright's \`--last-failed\` option runs only tests that failed in the previous invocation. The prior run state is kept under the configured output directory. Configure a stable directory that CircleCI can persist, and write JUnit reports to separate locations for each attempt.

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results/playwright-artifacts',
  reporter: [
    ['line'],
    ['junit', { outputFile: 'test-results/junit/initial.xml' }],
  ],
  retries: 0,
  use: {
    trace: 'retain-on-failure',
  },
});
\`\`\`

Setting \`retries: 0\` is deliberate for this design. Playwright's built-in retries occur inside the same job and produce their own semantics. Combining two internal retries with a follow-up job can execute a failing test four times and blur which mechanism recovered it. Choose one retry layer or document the multiplication.

The JUnit path is outside \`outputDir\` so reports and last-run state have obvious ownership. The follow-up can override reporters on the command line and keep its report separate.

Confirm \`test-results/playwright-artifacts/.last-run.json\` is produced by the Playwright version pinned in the project. Treat the directory as runner-owned state. Do not hand-edit the JSON or build logic around undocumented internal fields. The public interface used by the workflow is \`--last-failed\`.

## Capture failure without ending the initial job

Shell error handling is the critical seam. The test step must record Playwright's exit code and then return success so persistence steps execute and the follow-up job becomes schedulable. It must not hide installation or setup failures that occur before the test command.

The full CircleCI configuration is:

\`\`\`yaml
version: 2.1

jobs:
  initial_browser_tests:
    docker:
      - image: mcr.microsoft.com/playwright:v1.54.1-noble
    resource_class: large
    steps:
      - checkout
      - restore_cache:
          keys:
            - pnpm-v1-{{ checksum "pnpm-lock.yaml" }}
      - run:
          name: Install dependencies
          command: corepack enable && pnpm install --frozen-lockfile
      - run:
          name: Run complete Playwright suite and record status
          command: |
            mkdir -p test-results/status test-results/junit
            set +e
            pnpm exec playwright test
            TEST_EXIT=$?
            set -e
            printf '%s' "$TEST_EXIT" > test-results/status/initial-exit-code
            echo "Initial Playwright exit code: $TEST_EXIT"
      - store_test_results:
          path: test-results/junit
      - store_artifacts:
          path: test-results/playwright-artifacts
          destination: initial-playwright-artifacts
      - persist_to_workspace:
          root: .
          paths:
            - test-results

  rerun_failed_browser_tests:
    docker:
      - image: mcr.microsoft.com/playwright:v1.54.1-noble
    resource_class: large
    steps:
      - checkout
      - attach_workspace:
          at: .
      - restore_cache:
          keys:
            - pnpm-v1-{{ checksum "pnpm-lock.yaml" }}
      - run:
          name: Install dependencies
          command: corepack enable && pnpm install --frozen-lockfile
      - run:
          name: Rerun only Playwright's recorded failures
          command: |
            mkdir -p test-results/junit-rerun
            INITIAL_EXIT=$(cat test-results/status/initial-exit-code)
            if [ "$INITIAL_EXIT" -eq 0 ]; then
              echo "Initial suite passed, no failed tests to rerun."
              exit 0
            fi

            if [ ! -f test-results/playwright-artifacts/.last-run.json ]; then
              echo "Initial run failed without Playwright last-run state."
              exit 1
            fi

            pnpm exec playwright test --last-failed \
              --reporter=line,junit
          environment:
            PLAYWRIGHT_JUNIT_OUTPUT_NAME: test-results/junit-rerun/rerun.xml
      - store_test_results:
          path: test-results/junit-rerun
      - store_artifacts:
          path: test-results/playwright-artifacts
          destination: rerun-playwright-artifacts

workflows:
  test_with_targeted_rerun:
    jobs:
      - initial_browser_tests
      - rerun_failed_browser_tests:
          requires:
            - initial_browser_tests
\`\`\`

Use image and Playwright versions appropriate to the repository and keep them compatible. The tag shown is an example of explicit pinning, not a claim that it is latest. The follow-up performs \`checkout\` so repository source and configuration are present, then attaches only the persisted \`test-results\` state.

## Persist only run state, not another source tree

CircleCI workspaces are additive. Attaching paths that also exist after checkout can fail on collisions or obscure which revision produced them. Source should come from checkout of the workflow commit. The workspace in this configuration carries only attempt-specific state under \`test-results\`.

The follow-up installs from the checked-out lockfile, so dependency versions match. Cache restoration is only an optimization. A missing cache must not change test selection or verdict.

If Playwright's output directory contains large screenshots, videos, and traces, carrying all of it into job two may be expensive. The last-run file currently lives with output state, but filtering individual hidden files through workspace glob behavior deserves validation in your CircleCI environment. Start with correctness, measure workspace transfer, then separate initial artifacts from the minimum rerun state if the runner configuration permits it.

## Prevent setup failures from masquerading as test failures

Only the Playwright command runs under \`set +e\`. Checkout, dependency installation, database startup, and migrations retain normal fail-fast behavior. If installation fails, the job fails and the follow-up does not run, which accurately reports an infrastructure or build problem.

Inside the capture step, write the status file for every Playwright exit. Shell signals and hard cancellation can still interrupt before the write. The follow-up checks for both the status file (through \`cat\` failing) and last-run state. Missing evidence is a failure, not “nothing to rerun.”

For extra clarity, validate the exit code is numeric and within the runner's documented possibilities rather than assuming all nonzero values mean ordinary failed assertions. A killed process, configuration error, and test failure may need different rerun policy. Playwright's CLI exit is nonzero for failure, but the surrounding CI can attach meaning using logs and artifact presence.

| Failure point | Initial job behavior | Follow-up behavior |
|---|---|---|
| \`pnpm install\` | Job fails immediately | Not scheduled |
| Playwright assertions fail | Exit captured, job continues | Runs \`--last-failed\` |
| Playwright config cannot load | Nonzero captured, likely no valid last-run file | Fails on missing state |
| Workspace persistence fails | Job fails | Not scheduled |
| Rerun assertion fails | Initial job already green by design | Follow-up fails workflow |
| Initial suite passes | Zero is persisted | Follow-up exits successfully without test run |

This distinction is the difference between retry logic and blanket error suppression.

## Keep test selection valid across jobs

The follow-up must use the same commit, Playwright configuration, project selection, shard definition, and relevant environment as the initial run. If job two uses a different base URL or omits a browser project, \`--last-failed\` may select tests under different conditions.

Persist or reproduce external state carefully. If the initial suite created test accounts and cleanup removed them, a rerun may fail for a different reason. Each test should provision its own prerequisites or use stable seed APIs. Do not carry a live browser session between jobs.

Secrets and contexts in CircleCI must be attached to both jobs when the tests require them. Environment parity does not mean persisting secret values in the workspace. Configure them through CircleCI contexts or project variables.

Matrix jobs need one rerun job per matrix cell, because each browser or environment has its own failed-test state. Combining last-run files from Chromium and Firefox can overwrite selection. Store state under a key that includes project and shard identity.

## Adapt the pattern for CircleCI parallelism

If \`initial_browser_tests\` uses \`parallelism\`, each executor has a separate filesystem. A single workspace path from multiple parallel nodes can collide, and each node's last-failed manifest represents only its selected tests.

There are two defensible designs:

1. Rerun within the same parallel node before it exits, preserving local state but not creating a separate job.
2. Persist node-specific state paths and launch correspondingly partitioned follow-up executors.

Do not merge JSON state by concatenation. The format is owned by Playwright. For cross-node selection, a runner-independent manifest of fully qualified test IDs can be generated from JUnit with a maintained parser, but mapping those IDs back to CLI filters must be exact. File paths alone can rerun passing tests in a file that contains one failure.

CircleCI's \`circleci tests run\` command can split test files by timing and integrates with rerun-failed-tests behavior in supported configurations. That platform feature is a strong alternative when it fits the runner and desired UI workflow. The workspace pattern is most useful when an explicit automatic second job and Playwright's precise test identity are required.

| Strategy | Selection granularity | Additional infrastructure | Best fit |
|---|---|---|---|
| Playwright \`--last-failed\` plus workspace | Individual prior failed tests | Persist runner state | Two-job Playwright workflow |
| Playwright configured retries | Failed test inside same job | None beyond runner config | Simple retry and trace-on-retry needs |
| CircleCI rerun failed tests feature | Based on CircleCI test metadata and command integration | Correct JUnit and \`circleci tests run\` setup | Operator-triggered or platform-managed reruns |
| Parse JUnit into file list | Often file-level unless IDs map precisely | Custom parser and selector logic | Runners without durable failure state |
| Repeat complete job | Entire suite | Minimal logic, maximum compute | Small suites where selection is not worth complexity |

## Publish both attempts without overwriting evidence

Store initial and rerun JUnit files in different directories. If both use \`test-results/junit/results.xml\`, the second attempt can replace the evidence that a failure occurred. Separate artifact destinations also keep traces attributable.

CircleCI's test-results ingestion can display attempt data, but duplicate test identities across reports may be presented according to platform behavior. Preserve raw XML as an artifact when auditability matters. Add workflow metadata such as commit SHA, initial exit, and rerun exit to a small summary file.

Recovered failures are flake signals. Emit a metric or create a quarantine triage item keyed by test identity. Do not silently celebrate a green second attempt. The [Playwright retries and flaky tests guide](/blog/playwright-retries-flaky-tests-guide-2026) explains how Playwright categorizes expected, flaky, and unexpected outcomes when retries happen inside one invocation.

For general caching, test splitting, and artifact setup, refer to the [CircleCI test automation pipeline guide](/blog/circleci-test-automation-pipeline-guide-2026). The targeted rerun should be one small part of the pipeline, not a replacement for deterministic test design.

## Decide when the rerun should be skipped

Not every nonzero run deserves another attempt. Syntax errors, missing environment variables, browser launch failures, and a large failure burst are unlikely to become meaningful passes. A rerun storm can also double spend during a real outage.

Possible gates include:

- rerun only when valid last-run state exists;
- cap the number of selected failures using supported report data;
- skip when setup health checks failed;
- rerun only known transient categories, if classification is reliable;
- disable automatic reruns on protected diagnostic branches where first-failure evidence is preferred.

Avoid classifying by grepping console prose. Use JUnit properties, runner state, or an explicit setup-status file. If the system cannot distinguish failures safely, a single bounded rerun followed by an honest verdict is easier to reason about than elaborate heuristics.

## Test the CI control flow itself

Pipeline YAML deserves scenario tests. Add three tiny, opt-in Playwright fixtures or a demonstration branch:

1. a passing test, which must cause job two to skip;
2. a test that fails once based on an external attempt marker, which must be selected and recover;
3. a persistent failure, which must fail the follow-up job.

Do not merge intentionally flaky tests into the normal suite. Keep them in a CI workflow validation project activated by an environment variable. Assert from artifacts that the follow-up ran only the intended identity.

Also simulate absent \`.last-run.json\` and confirm the rerun job fails. This protects against Playwright upgrades or cleanup steps that move the state file. Validate configuration with CircleCI's official config tooling in the project's normal review process, while remembering that schema validation cannot prove shell exit-code logic.

A clean final workflow is easy to describe: first attempt records without deciding, second attempt selects without broadening, and the final job status tells the truth.

## Add a final policy job when recovery is not enough

Some organizations want the targeted rerun for diagnostics but still require the workflow to fail whenever the initial exit was nonzero. Add a small final job that attaches the workspace, reads both attempt statuses, and implements that policy explicitly. Do not make the rerun step fail intentionally after it has produced useful results, because that conflates a recovered test with rerun infrastructure failure.

Persist \`rerun-exit-code\` from the follow-up using the same guarded-shell pattern if a later policy job needs it. The final decision table can then distinguish initial failure plus rerun success from initial failure plus rerun failure. A deployment workflow should require the policy job, not the intermediate executor jobs.

This extra node is also the right place to send a flaky-test notification or increment an internal metric. Keep external notifications out of the test command so a Slack or issue-tracker outage does not alter the test verdict. If notifications are mandatory compliance evidence, model their failure separately.

## Protect the rerun from a changed test inventory

Both jobs normally run the same commit, but dynamic test generation can still differ when it reads current time, unordered remote data, or mutable feature flags. A last-failed identity that no longer exists should not become a pass by disappearance. Freeze feature configuration and seed inputs for the workflow.

When test discovery itself is nondeterministic, fix that defect before trusting targeted reruns. Store the initial \`playwright test --list\` output only as diagnostic evidence, not as a substitute for runner state. The selected test's project, file, describe hierarchy, and title must remain stable between attempts.

If the repository is amended or rerun from a new revision, start a new complete initial job. Failure state from another commit is not valid regression selection, even when filenames match.

## Frequently Asked Questions

### Why not use Playwright's retries option instead of another CircleCI job?

Built-in retries are simpler and keep selection state inside one process. A second job is useful when retries need separate resources, credentials, diagnostics, or accounting. Do not stack both casually because the number of attempts multiplies.

### How does the rerun job know which Playwright tests failed?

The initial invocation writes runner state under Playwright's configured output directory. CircleCI persists that directory, and the follow-up invokes \`playwright test --last-failed\` against the attached state.

### What if the initial test process exits before creating .last-run.json?

Fail the workflow as an infrastructure or configuration error. Treating a missing manifest as an empty failed set would turn an incomplete test run into a false pass.

### Can one last-failed file be shared across CircleCI parallel nodes?

Not safely as a general rule. Each node runs a distinct selection and writes local state. Preserve node-specific manifests and rerun the corresponding partition, or use CircleCI's test splitting and failed-test integration.

### Should the pipeline pass when every failed test passes on rerun?

That is a release policy choice. If recovery is allowed, retain both reports and track the tests as flaky. If any first-attempt failure blocks release, the follow-up can still collect evidence but the final verdict must remain failed.
`,
};
