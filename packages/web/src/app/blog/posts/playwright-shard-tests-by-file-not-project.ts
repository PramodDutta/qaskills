import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'How to Shard Playwright Tests by File Instead of Project',
  description:
    'Shard Playwright tests by file with predictable CI distribution, avoid project duplication, inspect shard membership, and balance uneven spec runtimes.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# How to Shard Playwright Tests by File Instead of Project

Four CI workers start, yet every worker launches Chromium, Firefox, and WebKit. The pipeline is technically sharded, but the job graph looks nothing like the intended plan of distributing spec files once. This usually begins with a mistaken mental model: Playwright projects and Playwright shards are separate dimensions. A project describes how a test runs. A shard selects which primary tests run in one invocation.

For file-level sharding, leave \`fullyParallel\` disabled, select one project when each file should run only once, and invoke the same test command with a different \`--shard=x/y\` value on each worker. If browser coverage is required, decide deliberately whether browser projects belong inside every shard or in a second CI matrix dimension. That choice determines whether a file is executed once or once per browser.

This tutorial focuses on controlling that distribution, proving what each worker owns, and fixing the long-tail problem caused by unequal spec files. For the broader execution model, see the [Playwright parallel and sharding guide](/blog/playwright-parallel-sharding-execution-guide). Once the selection is correct, the [Playwright shard report merging guide](/blog/playwright-sharding-merge-reports-guide-2026) covers the reporting side.

## The selector, project, worker, and shard are different controls

A useful review starts by naming each layer precisely. Mixing these terms causes configuration changes that appear reasonable but alter the wrong axis.

| Control | What it partitions or configures | Typical syntax | Does it decide file ownership? |
|---|---|---|---|
| Test project | Browser, device, environment, retries, dependencies, or other run settings | \`projects: [{ name: 'chromium' }]\` | No, it creates a project instance of eligible tests |
| Shard | Primary tests selected for one Playwright invocation | \`--shard=2/4\` | Yes, at file granularity when fully parallel mode is off |
| Worker | Processes executing the selected tests inside one job | \`--workers=2\` | No, it schedules work already assigned to that shard |
| File filter | Paths considered by discovery | \`npx playwright test tests/checkout\` | It narrows the input before sharding |
| Grep | Tests whose titles match a pattern | \`--grep @smoke\` | It filters primary tests before shard selection |

By default, Playwright executes test files in parallel while tests within a file run in declaration order. Sharding adds another layer above local workers. With \`fullyParallel: false\`, whole files are the balancing units. With \`fullyParallel: true\`, individual tests become eligible for distribution across shards. Therefore, enabling fully parallel execution to improve balance directly contradicts a requirement that a spec file remain intact on one shard.

Projects are expansions of the discovered suite. If \`orders.spec.ts\` applies to three browser projects, there are three project-specific test groups. Playwright documents an important consequence: without fully parallel mode, the same source file can be assigned to different shards across different projects. File integrity is maintained per project instance, not globally across the entire multi-project invocation.

That is why the most deterministic file-once design selects exactly one project. It is also why a browser matrix is clearer than hiding three browsers inside one sharded command.

## Configure a file-granular Chromium lane

The following configuration defines several projects for local or scheduled coverage, but CI can explicitly select \`chromium\`. The significant line is \`fullyParallel: false\`. Omitting it currently produces the same file-level behavior, but setting it communicates the invariant and protects against an accidental future change.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'blob' : 'html',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
\`\`\`

A four-job CI lane then runs these commands concurrently:

\`\`\`bash
npx playwright test --project=chromium --shard=1/4
npx playwright test --project=chromium --shard=2/4
npx playwright test --project=chromium --shard=3/4
npx playwright test --project=chromium --shard=4/4
\`\`\`

Each command performs normal discovery, applies the Chromium project selection, and retains only its shard's portion. Playwright shard indices start at one. A zero-based CI node number therefore must be converted before it is passed to the CLI. Never silently substitute a CI variable without checking its indexing convention.

Do not set \`workers: 1\` merely to obtain file-level sharding. Workers control concurrency inside a shard and do not change shard granularity. Two workers may pick two distinct files assigned to the same shard, while each file remains a unit. Conversely, ten CI shards with one worker each can still be badly imbalanced if one file takes twenty minutes.

## Prevent projects from becoming an accidental second matrix

Suppose a suite has 120 spec files, three projects, and four shards. Running \`npx playwright test --shard=1/4\` without a project filter does not mean “give this worker 30 source files.” It means “select one quarter of the eligible project-specific test groups.” Across all jobs, the suite still executes for every applicable project.

Choose the topology from the coverage requirement:

| Desired coverage | CI shape | Command inside a job | Consequence |
|---|---|---|---|
| Every file once in Chromium | Four shard jobs | \`--project=chromium --shard=i/4\` | Source specs execute once overall |
| Every file in three browsers | Browser by shard matrix, 12 jobs | \`--project=$BROWSER --shard=i/4\` | Ownership is obvious for each browser lane |
| Smoke on three browsers, regression on Chromium | Separate jobs and test filters | Browser smoke command plus Chromium regression command | Avoids paying cross-browser cost for all regression cases |
| Environment setup followed by sharded tests | Project dependency plus shard jobs | Select dependent project normally | Dependency projects may run for each shard unless orchestrated separately |
| One manually curated file list per worker | CI-generated path arguments | \`playwright test file-a file-b\` | Custom allocator owns correctness and maintenance |

The browser by shard matrix is verbose but operationally clean. A failed job name can say \`webkit 3/4\`, retries affect one coverage cell, and reports retain project identity. If CI capacity cannot support twelve jobs, use fewer shards per browser or run secondary browsers on a schedule. Do not pretend that project elimination is a sharding optimization if it removes required coverage.

Project dependencies deserve special attention. Filters and shard selection target primary tests, but required dependency projects are also run. A setup project that creates an account can therefore execute once per shard invocation. If that setup is expensive or mutates shared state, either make it idempotent and shard-safe, create state in a preceding CI job, or use per-worker isolated resources. The correct answer depends on whether the setup artifact can be transported safely between machines.

## Inspect exact file membership before paying for browsers

Treat shard allocation as observable behavior. Playwright's \`--list\` option lists discovered tests without executing them, and it can be combined with project and shard filters. This is the fastest way to verify whether files are intact and whether a path or grep filter changed the population.

\`\`\`bash
for shard in 1 2 3 4; do
  npx playwright test \
    --project=chromium \
    --shard=$shard/4 \
    --list > "shard-$shard.txt"
done
\`\`\`

Review the output by source path. Multiple test titles from one spec should appear in the same shard listing when fully parallel mode is disabled. A source file should not appear in two Chromium shard lists. If it does, first check whether the path parser is confusing similarly named files, then inspect configuration overrides and CLI arguments.

For a durable audit, normalize the list into a manifest committed as a CI artifact. The manifest need not dictate future selection. Its purpose is diagnostic: when a shard suddenly doubles in duration, a reviewer can see whether new files arrived, a grep changed, or a project expanded discovery.

A reliable inspection sequence is:

1. Run the unsharded \`--list --project=chromium\` command and record the total test count.
2. Run all shard listings with exactly the same filters.
3. Confirm the sum of shard test counts equals the unsharded count.
4. Extract source file names and confirm the shard sets do not overlap.
5. Repeat for any other browser project as a separate population.

The count comparison detects missing and duplicated tests. The set comparison proves the stronger file-ownership property. Counts alone can balance perfectly while one file is duplicated and another omitted by a faulty custom wrapper.

## Balance runtimes without splitting a spec

File-level sharding balances using the information Playwright has at scheduling time, not a historical duration database tailored to your suite. Equal file or test counts do not guarantee equal wall time. A single serial checkout file can dominate one shard while three other machines finish early.

First make file size a test-design concern. A spec that contains forty unrelated journeys is difficult to retry, own, and shard. Split it along stable domain boundaries such as discount calculation, payment authorization, and fulfillment selection. Keep tests together only when their shared setup or serial semantics are intentional. This improves distribution without enabling individual-test sharding.

Second, measure per-file duration from reports. Aggregate several representative CI runs because cold browser starts, network variance, and retries can distort a single sample. Look for the longest files, not merely the shard totals. Moving a heavyweight fixture from per-test setup to a worker-scoped fixture may reduce runtime, but only if the resulting shared state preserves isolation.

Third, select the number of shards from the available parallelism and the number of meaningful file units. Twenty shards cannot help a suite containing six indivisible files. More jobs also multiply installation, browser startup, report upload, and setup-project overhead. The useful shard count is usually below the point where fixed job cost or the longest file dominates elapsed time.

If exact duration-aware allocation is mandatory, Playwright's standard \`--shard\` interface is not a promise of weighted bin packing from your historical results. A custom allocator can group paths by measured duration and invoke Playwright with those file arguments. That approach is valid, but it creates responsibilities:

- The allocator must include every eligible file exactly once.
- Renames and deletions must not leave stale manifest entries.
- Project filters and grep conditions must remain consistent.
- Historical timings need a fallback for new files.
- The produced groups should be archived for failure reproduction.

Use custom allocation after demonstrating a material long tail. Standard sharding is simpler, supported directly by the runner, and often sufficient after oversized specs are refactored.

## Preserve isolation at shard boundaries

Distribution exposes assumptions that a single-machine run can conceal. A file may depend on another file creating data first, use a fixed account, or clean a shared bucket after the suite. Once files land on separate machines, there is no cross-file execution order to rescue those assumptions.

Use a distinct namespace derived from the CI pipeline and Playwright worker identity for mutable test data. Playwright exposes \`workerInfo.parallelIndex\` to fixtures, and CI exposes a shard index. Combining them makes resource ownership visible. The fixture below allocates an account name for each worker inside each shard:

\`\`\`typescript
import { test as base } from '@playwright/test';

type Fixtures = {
  accountName: string;
};

export const test = base.extend<Fixtures>({
  accountName: [
    async ({}, use, workerInfo) => {
      const shard = process.env.CI_NODE_INDEX ?? 'local';
      const accountName = \`e2e-\${shard}-\${workerInfo.parallelIndex}\`;
      await use(accountName);
    },
    { scope: 'worker' },
  ],
});
\`\`\`

This naming scheme is not a substitute for cleanup. It makes collisions less likely and makes leaked data traceable. Cleanup should target only the namespace owned by that worker, never a broad shared prefix that another shard might still be using.

Serial suites remain inside their file, but retries may start in a new worker process. Any state kept only in memory disappears. External state can persist and must be designed for a repeat attempt. A payment test that reuses a fixed idempotency key may receive a replay response on retry; generating the key from the retry number or provisioning a fresh order is more explicit.

## Diagnose surprising shard results

When the distribution differs from expectations, reduce it to discovery inputs rather than tuning workers blindly.

| Symptom | Likely mechanism | Evidence to collect | Corrective action |
|---|---|---|---|
| One source file appears on separate shards | Multiple projects are active, or fully parallel mode is enabled | Project prefix and paths from \`--list\` | Select one project, or disable fully parallel mode |
| All shards run setup tests | A selected project depends on a setup project | Project dependency graph and report project names | Make setup shard-safe or externalize reusable setup |
| A shard contains no tests | More shards than eligible file units, or filters removed its allocation | Unsharded and sharded list counts | Reduce shard total or revise filtering |
| Four files produce very different job times | Files have unequal test costs | Per-file durations across several runs | Split heavyweight domain files or use measured custom groups |
| Local list and CI list differ | Environment-dependent discovery or ignored paths | Config, environment variables, and resolved test directory | Remove conditional discovery or document the condition |
| Retried job runs a different apparent subset | Branch contents, filters, or shard total changed | Commit SHA and full command from both attempts | Pin inputs and retain the manifest |

A common anti-pattern is generating projects named \`shard-1\`, \`shard-2\`, and so on, each with a different \`testMatch\`. That can work as manual partitioning, but it is no longer Playwright sharding. It duplicates allocation policy inside configuration, complicates browser projects, and makes \`--shard\` terminology misleading. Prefer the native shard flag unless curated groups solve a measured runtime problem.

Another mistake is treating a shard number as a stable ownership hash. Adding, removing, or renaming tests can change allocation. Do not assign permanent databases or secrets based on the assumption that \`checkout.spec.ts\` will always belong to shard two. Provision resources for the current job and discover membership on each run.

## A practical rollout for a large repository

Start with one project and two shards. Archive each \`--list\` output and the blob report. Verify completeness, isolation, and cleanup before increasing concurrency. This catches file-order dependencies while the job topology is still easy to inspect.

Next, record job setup time separately from test execution. If dependency installation and browser launch consume much of each job, doubling shards may make resource usage worse for a small latency improvement. Cache dependencies appropriately and use a runner image with matching browser binaries when that is operationally safe.

Then examine the slowest files. Refactor only files that combine unrelated scenarios. A cohesive file with expensive, shared environment setup may be the correct unit even if it creates a tail. The cost might be addressed in the application fixture or through a dedicated lane rather than by breaking domain cohesion.

Finally, add browser coverage as an explicit decision. A pull-request lane might shard Chromium across four workers, while a nightly matrix shards Firefox and WebKit across two workers each. This expresses risk and cost more honestly than running every project in every pull request without anyone noticing the multiplication.

The acceptance criteria should be executable: all Chromium test IDs appear exactly once, no source path crosses Chromium shard manifests, jobs use isolated data namespaces, and the merged report represents every shard. Those checks turn “we think it shards by file” into a property the pipeline can defend.

## Frequently Asked Questions

### Does Playwright shard by file by default?

When tests are not configured as fully parallel, Playwright uses file-level granularity for sharding. Tests within a file stay together for a given project instance. If several projects are active, the same source file can still have project instances assigned to different shards.

### Why does the same spec name show up in two shard reports?

Inspect the project name beside each test. The usual cause is that the spec applies to multiple projects, such as Chromium and Firefox. Another possibility is \`fullyParallel: true\`, which permits individual tests to be distributed. Compare \`--list\` output using a single explicit \`--project\` value.

### Can I combine a file path with the shard flag?

Yes. Path arguments narrow the discovered primary tests, and \`--shard\` partitions that filtered population. Every shard job must receive the same path and grep filters, otherwise the shard fractions describe different populations and completeness reasoning breaks down.

### Will setting workers to one keep a file on one CI machine?

Worker count does not select shard granularity. It controls processes within the current invocation. Keep \`fullyParallel\` off for file-granular sharding, then choose workers based on CPU, memory, and application capacity.

### How should I handle one spec that is longer than every other shard?

Confirm its per-file duration across multiple runs. If it contains independent domains, split it into cohesive specs. If it is intentionally serial or shares costly setup, consider a dedicated CI lane or a custom duration-aware file allocator. Native file sharding cannot divide an indivisible file while also preserving the file boundary.
`,
};
