import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Split Playwright Tests by Timing in CircleCI',
  description:
    'Split Playwright tests by historical timing in CircleCI, publish usable JUnit data, control nested concurrency, and diagnose skewed parallel containers.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Split Playwright Tests by Timing in CircleCI

Container 0 finishes in seven minutes while container 3 spends another eleven minutes on checkout and reporting specs. Four executors were purchased, but the workflow duration is still set by the slowest bucket. Alphabetical chunks and equal file counts cannot solve that imbalance because Playwright files rarely cost the same.

CircleCI timing-based splitting uses duration data from prior test results to distribute tests across parallel execution environments. The job declares \`parallelism\`, enumerates Playwright spec files, and pipes them into \`circleci tests run --split-by=timings\`. Each container receives a different subset. Playwright then executes only those files and emits JUnit results that seed later splits.

The difficult part is not the pipe. It is maintaining a consistent identity between the names being split and the names reported with durations, while preventing Playwright workers inside each CircleCI container from oversubscribing the machine.

## How timing buckets differ from Playwright shards

Playwright's \`--shard=x/y\` divides its discovered tests deterministically. With \`fullyParallel: true\`, it can balance at test level by count; otherwise it commonly partitions groups at file granularity. It does not use CircleCI's historical duration database. CircleCI splitting operates before Playwright starts and can assign files according to measured runtime.

| Mechanism | Input signal | Assignment unit | Learns from prior CI runs | Best fit |
|---|---|---|---:|---|
| CircleCI timing split | Stored JUnit durations | Filename or test name | Yes | Uneven suites on CircleCI parallel containers |
| Playwright shard | Discovered tests and shard index | Test groups based on suite configuration | No | CI-neutral deterministic sharding |
| Equal file chunks | File count | File | No | Bootstrap when no timing data exists |
| Manual tags | Team-maintained categories | Selected tests | No | Product-specific lanes, not general balancing |

Do not apply CircleCI timing split and Playwright sharding to the same suite invocation. That creates a shard inside an already assigned subset, so some tests can be omitted. CircleCI chooses the files; Playwright should run every file it receives.

## Build a job whose filenames survive the round trip

The following CircleCI job uses four parallel containers. \`circleci tests glob\` discovers spec paths, and \`circleci tests run\` selects a timing-balanced subset on each container. The command invokes Playwright with the selected filenames. The JUnit reporter writes results under a directory later uploaded with \`store_test_results\`.

\`\`\`yaml
version: 2.1

jobs:
  playwright-e2e:
    docker:
      - image: mcr.microsoft.com/playwright:v1.54.1-noble
    parallelism: 4
    resource_class: large
    environment:
      CI: 'true'
      PLAYWRIGHT_JUNIT_OUTPUT_NAME: test-results/playwright/results.xml
    steps:
      - checkout
      - run:
          name: Install dependencies
          command: npm ci
      - run:
          name: Run timing-balanced Playwright files
          command: |
            mkdir -p test-results/playwright
            circleci tests glob "tests/e2e/**/*.spec.ts" |
              circleci tests run \
                --command="xargs npx playwright test --config=playwright.config.ts --reporter=junit" \
                --split-by=timings \
                --timings-type=filename
      - store_test_results:
          path: test-results
      - store_artifacts:
          path: playwright-report
          destination: playwright-report

workflows:
  test:
    jobs:
      - playwright-e2e
\`\`\`

Pin the image to a Playwright version compatible with the installed package. The browser binaries and package version should agree. Replace npm with the repository's package manager, but keep installation deterministic.

Filenames containing whitespace complicate the simple newline-to-\`xargs\` pipe. Most test repositories prohibit spaces in spec paths, which makes this reliable. If yours permits them, use an invocation strategy that preserves delimiters and is supported by the installed CircleCI CLI rather than copying this exact \`xargs\` command.

The exact glob is part of the contract. If it emits \`tests/e2e/cart.spec.ts\` while the JUnit reporter records an absolute path or a different relative root, CircleCI cannot associate history with the next input. Inspect the uploaded XML once rather than assuming identities match.

## Configure Playwright for one report per container

Every CircleCI container has an isolated filesystem, so the same JUnit output name is safe inside each executor. CircleCI collects results from all parallel nodes when \`store_test_results\` runs. Playwright's HTML report is less straightforward: four independent HTML directories do not automatically become one coherent report.

Use JUnit for timing ingestion and a blob reporter when a merged Playwright report is required. Each parallel node uploads its blob as a uniquely named artifact, a downstream job downloads all blobs, and \`playwright merge-reports\` creates the final report. Do not point several processes at one shared HTML directory.

A practical Playwright config can select reporters and worker counts by CI:

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [
        ['line'],
        ['junit', { outputFile: 'test-results/playwright/results.xml' }],
        ['blob', { outputDir: 'blob-report' }],
      ]
    : [['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
\`\`\`

If the CLI passes \`--reporter=junit\`, it overrides the configured reporter selection, so choose one source of reporter configuration. In a production pipeline using the TypeScript config above, remove \`--reporter=junit\` from the CircleCI command. It is shown in the minimal YAML to make timing production visible; the richer config demonstrates the merged-report path. Mixing them would prevent blob output.

That distinction is important in copied examples. Verify which reporter setting wins in your command rather than believing both run.

## Historical timings need successful publication

Timing-based splitting has a feedback loop:

1. The current run enumerates stable test identities.
2. CircleCI looks up known durations.
3. Unknown tests receive a fallback assignment.
4. Playwright executes each assigned subset.
5. JUnit XML is uploaded with \`store_test_results\`.
6. A later run can use those durations.

If \`store_test_results\` is absent, points at the wrong directory, or never executes after a test failure, timing data remains sparse. CircleCI steps after a failed \`run\` need suitable \`when: always\` behavior where required so reports are still collected. Structure the job so test exit status is retained while result publishing still occurs.

New files have no history. Expect the first run after a large rename or suite migration to be less balanced. Timing data improves only after those identities complete and publish. Randomizing filenames or generating specs at unique paths defeats learning.

## Control the two layers of parallelism

\`parallelism: 4\` starts four CircleCI executors. Inside each executor, Playwright starts worker processes according to \`workers\`. The effective browser concurrency is approximately CircleCI nodes multiplied by Playwright workers, subject to each assigned subset and serial groups.

Four large containers with four Playwright workers create up to sixteen concurrent browsers. That may be desirable, or it may saturate the test environment, database, third-party sandbox, or CPU. More workers can increase test duration through contention, making timing history noisy and bucket predictions worse.

| Symptom | Likely concurrency issue | Adjustment to try |
|---|---|---|
| CPU at maximum inside every executor | Too many Playwright workers per node | Reduce \`workers\` before reducing CircleCI nodes |
| API rate-limit failures rise with parallelism | Shared target cannot absorb load | Cap total browsers or isolate tenants |
| One node remains slow with low CPU | One indivisible long spec | Split that spec by coherent scenarios |
| All nodes start quickly, then stall on setup | Shared data lock or account collision | Allocate worker-specific data |
| Durations vary drastically between reruns | Retries, contention, or unstable dependencies | Fix variance before trusting historical balance |

Keep the CI resource class explicit so timing comparisons are meaningful. Historical durations collected on a small executor predict poorly after switching to a much faster class until enough new runs replace the old picture.

The [CircleCI test automation pipeline guide](/blog/circleci-test-automation-pipeline-guide-2026) covers caching, workflows, test result storage, and failure handling beyond the split itself.

## File-level timing can hide a whale

Timing splitting cannot divide a single filename when the input unit is filename. If \`checkout.spec.ts\` takes fourteen minutes, one container owns all fourteen minutes even if every other bucket totals six. The fix is not a fifth executor. Split the whale into meaningful files, such as guest checkout, saved-card checkout, and payment-decline recovery, while keeping fixtures and serial dependencies honest.

Do not create dozens of tiny files merely to manipulate scheduling. Browser startup, authentication setup, and repeated hooks can increase total work. Aim for schedulable chunks whose duration is materially below the desired job ceiling.

Test-level timing can be more granular when tooling and JUnit identity are configured for it, but passing individual Playwright test names safely through shell commands is more complex than passing files. Filename splitting is a strong default because Playwright natively accepts file arguments and file paths are stable.

## Retries distort duration unless flakiness is addressed

A flaky test that passes on retry reports more work than a clean test. CircleCI may correctly place that historically slow file alone, yet the underlying problem is variance, not inherent cost. On a run where no retry occurs, its bucket finishes early; on a run with two retries, it becomes the tail again.

Treat timing dashboards as a flakiness detector. Compare median-like normal duration with retry-inflated runs where your observability allows. Quarantine only through a documented temporary process, and keep the test represented in a lane that still publishes results.

Retries also affect Playwright artifacts. \`trace: 'on-first-retry'\` controls storage growth while retaining useful diagnosis. Uploading traces and videos for every passing test across many containers can make artifact processing a significant part of workflow time even after execution is balanced.

## Setup and teardown are not split by spec timing

Every parallel container repeats checkout, dependency installation, browser startup, and any job-level setup. A ten-minute database seed performed four times can erase the gain from splitting. Cache immutable dependencies appropriately, but never share mutable Playwright state across containers without an ownership design.

Playwright setup projects can also repeat per container. If setup creates one account under a fixed email, parallel nodes race. Include \`CIRCLE_NODE_INDEX\` in synthetic identities or provision independent tenants. CircleCI exposes the node index and total count to each parallel executor; use them for data partitioning, not for a second manual test split.

Global teardown should clean only resources owned by that node. One node deleting a tenant while another still runs creates failures that appear like poor timing balance but are actually shared-state defects.

## Diagnose an empty or uneven split

When a container reports no tests, capture the glob output and the verbose behavior of the installed CircleCI CLI. Confirm the command runs inside a CircleCI job with parallelism greater than one. Check shell quoting: if the entire list becomes one argument, Playwright will not receive separate paths.

When every container runs all tests, the split output is not being passed to Playwright, or Playwright is discovering its default suite in addition to supplied arguments. Print the final command inputs in a temporary diagnostic step, while avoiding secrets.

When timing mode acts like a random split, inspect uploaded JUnit XML for \`file\` attributes or matching names, confirm previous runs stored results on the same branch context supported by CircleCI, and look for recent path renames. Use duration-based evidence, not repeated changes to \`parallelism\`.

The [Playwright parallel execution and sharding guide](/blog/playwright-parallel-sharding-execution-guide) helps when deciding whether native shards are simpler for a CI-neutral pipeline. CircleCI timing split is most valuable when historical imbalance is visible and the platform already owns the test-result history.

## A rollout sequence that preserves confidence

Record the unsplit suite duration and total executor minutes. Enable two containers first, confirm each spec runs exactly once, and verify JUnit is visible in CircleCI. Then inspect bucket duration, not merely job duration. Increase parallelism only while the slowest bucket improves enough to justify added executor time.

Review these invariants after configuration changes:

- The glob returns every intended spec and no generated duplicates.
- Every selected filename is accepted by Playwright as one test path.
- No Playwright \`--shard\` option subdivides the assigned subset.
- JUnit paths correspond to the filename identities used for splitting.
- Test results upload even when tests fail.
- Reporter flags do not override required blob or JUnit reporters.
- Per-node worker counts fit the resource class.
- Accounts, ports, and databases are unique across CircleCI nodes.
- The longest file is shorter than the target wall-clock ceiling.
- Workflow time and total compute are both monitored.

The target is not perfectly equal bars on every run. Tests vary, machines vary, and new files lack history. The target is a repeatable reduction in the longest container without losing tests or hiding failures.

## Measure wall-clock gain against executor cost

Parallelism trades elapsed time for compute. A suite that falls from twenty minutes on one executor to eight minutes on four uses roughly thirty-two executor-minutes for the test job, before setup overhead. That may be the right trade for pull-request feedback, but the decision should be explicit. Track both the critical-path duration and total billed or consumed compute.

Timing balance exposes the serial fraction of the job. Checkout, dependency installation, remote environment readiness, and report merging do not shrink merely because more test buckets exist. If each node repeats five minutes of setup and runs three minutes of tests, adding nodes mostly multiplies setup. Optimize or centralize immutable preparation before increasing \`parallelism\`.

Branch behavior also matters. A small documentation pull request may not justify the same matrix as a release candidate. CircleCI workflows can select jobs by path, branch, or pipeline parameter according to repository policy, while the Playwright job itself should continue to enumerate the complete suite it was assigned. Avoid a timing history polluted by mixing materially different test selections under unstable names without understanding how results are matched.

In a monorepo, run the glob from a predictable working directory. A root job may emit \`packages/shop/tests/e2e/cart.spec.ts\`, while a package-scoped Playwright config expects \`tests/e2e/cart.spec.ts\`. Both paths can refer to the same file but form different timing identities. Set \`working_directory\`, glob root, and Playwright config consistently, and verify the JUnit \`file\` attribute after any repository move.

Set a stopping rule for scaling. Once the longest bucket is dominated by one spec or non-test setup, another container will not materially shorten the workflow. At that point, split the whale, reduce repeated setup, or fix environmental contention. Historical timing is a scheduler, not a cure for inherently serial workflows.

Review cost again after flake fixes. Retries inflate total compute and can make additional nodes appear more valuable than they are. A stable suite often needs fewer resources to meet the same feedback target.

Use several representative builds before declaring a new node count successful. One unusually fast run can reflect warm caches or missing retries, while one slow run can reflect an unhealthy preview. Compare bucket distributions and setup time across the same resource class. Keep a reversible configuration change so the team can reduce parallelism when suite size or infrastructure conditions change.

## Frequently Asked Questions

### Does CircleCI timing splitting require JUnit output?

Timing data comes from stored test results, so the job needs a supported results format and a \`store_test_results\` step pointing at it. For Playwright, JUnit is the conventional choice.

### Should I use Playwright --shard together with circleci tests run?

No. CircleCI has already selected a subset. Applying a shard to that subset can omit tests. Let Playwright execute every filename received from the split command.

### Why is the first timing-based run still uneven?

New or renamed file identities have no historical duration. CircleCI must use fallback behavior until completed results are uploaded and available to subsequent runs.

### How many Playwright workers should each parallel container use?

Start from the executor's CPU and the target system's capacity, then measure. Total potential concurrency is the node count multiplied by workers per node, so defaults can oversubscribe quickly.

### What can I do when one spec is longer than every other bucket?

Split that file along meaningful scenario or fixture boundaries. Adding containers cannot make an indivisible file finish sooner, and test-name splitting adds identity and shell complexity that may not be necessary.
`,
};
