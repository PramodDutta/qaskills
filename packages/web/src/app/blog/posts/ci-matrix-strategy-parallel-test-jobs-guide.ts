import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CI Matrix Strategy: Run Test Jobs in Parallel Across Versions',
  description: 'Apply a CI matrix strategy parallel test jobs workflow across runtimes and browsers, with fast feedback, controlled cost, and trustworthy failure evidence.',
  date: '2026-07-16',
  category: 'Guide',
  content: `
# CI Matrix Strategy: Run Test Jobs in Parallel Across Versions

A test matrix converts compatibility claims into executable evidence. Instead of running one oversized job on one favored runtime, CI expands declared dimensions such as Node.js version, browser, database, or operating system into independent jobs. Those jobs can run concurrently, fail independently, and show exactly which environment broke.

The hard part is not writing the matrix syntax. It is choosing combinations that expose product risk without multiplying cost and queue time. A useful CI matrix strategy for parallel test jobs starts with supported environments, assigns the right tests to each combination, preserves failure artifacts, and prunes redundant cells using evidence rather than convenience.

## Model compatibility as dimensions, not a list of machines

Write down the variables that can change behavior. For a Playwright-backed web application, Node.js affects tooling and server execution, browser engines affect rendering and web APIs, and the operating system affects fonts, paths, processes, and native dependencies. Database versions or service modes may matter for API suites.

| Dimension | Defects it can reveal | Typical evidence |
|---|---|---|
| Runtime version | API availability, module loading, dependency compatibility | Unit failures, startup logs, stack traces |
| Browser engine | DOM, layout, input, storage, and network differences | Trace, screenshot, video |
| Operating system | Path casing, shell, fonts, native binaries | Logs, snapshots, environment inventory |
| Database version | Query semantics, migrations, driver compatibility | Migration output, SQL logs, isolated database |
| Feature mode | Flagged paths and fallback implementations | Mode-labelled test report |

Avoid encoding dimensions only in job names. Matrix variables should flow into installation, test selection, report labels, and artifact names. Otherwise a green “Node 22” cell may actually have executed the default runtime from a container.

Start with a coverage inventory. If production supports two runtime lines and three browsers, six combinations are mathematically possible. That does not mean every commit needs the full Cartesian product. The decision belongs to risk tiers.

## Choose a matrix shape that matches test risk

Use a small presubmit matrix for rapid feedback and a broader scheduled or release matrix for compatibility. Unit and integration tests are usually cheap across runtime versions. Full browser E2E suites are expensive, so run the largest E2E set in the primary environment and targeted smoke coverage elsewhere.

| Tier | Trigger | Suggested shape | Failure policy |
|---|---|---|---|
| Core | Every pull request | Primary runtime plus primary browser | Required |
| Compatibility | Relevant pull requests or merge queue | Supported runtimes, targeted browser smoke | Required for claimed support |
| Extended | Nightly | Full browser and OS combinations | Triage by start of workday |
| Release | Candidate tag or manual gate | Supported production matrix | Blocks promotion |

This is risk partitioning, not hiding tests. Publish which tier proves each support statement. If Safari behavior matters, Chromium-only presubmit cannot be presented as complete browser coverage.

A pairwise design can reduce combinations when interactions are unlikely to require all dimensions at once. Keep full combinations for known coupled behavior, such as a native dependency whose binary varies by runtime and operating system.

## Implement the first matrix in GitHub Actions

The \`strategy.matrix\` key expands one job definition. This example tests two Node.js lines and two Playwright browser projects. The \`include\` entry adds a Windows smoke cell without forcing every browser and runtime onto Windows.

\`\`\`yaml
name: test-matrix

on:
  pull_request:

jobs:
  test:
    name: node-\${{ matrix.node }} / \${{ matrix.browser }} / \${{ matrix.os }}
    runs-on: \${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        node: [20, 22]
        browser: [chromium, firefox]
        os: [ubuntu-latest]
        include:
          - node: 22
            browser: chromium
            os: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
          cache: pnpm
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps \${{ matrix.browser }}
      - run: pnpm exec playwright test --project=\${{ matrix.browser }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: evidence-node-\${{ matrix.node }}-\${{ matrix.browser }}-\${{ matrix.os }}
          path: test-results
\`\`\`

\`fail-fast: false\` allows other matrix cells to finish after one fails. This is usually right for compatibility diagnosis because four completed outcomes are more informative than one failure plus three cancellations. It does not make the workflow pass. Failed required cells still fail the matrix job.

Version labels in the sample are illustrative support targets, not a claim about your application. Read them from your tested support policy. Runner labels and action releases can change, so confirm current platform documentation when maintaining the workflow.

## Control expansion with include and exclude

Matrix multiplication can surprise reviewers. Three runtimes times three browsers times three operating systems produces 27 jobs before sharding. Calculate the count in the pull request description and explain exclusions.

\`include\` can add a special combination or attach extra properties. \`exclude\` removes combinations generated by the base matrix. Use exclusions for technically invalid or explicitly unsupported pairs, not to suppress a known red test.

\`\`\`yaml
strategy:
  fail-fast: false
  matrix:
    node: [20, 22]
    browser: [chromium, firefox, webkit]
    suite: [unit, e2e]
    exclude:
      - browser: firefox
        suite: unit
      - browser: webkit
        suite: unit
      - node: 20
        browser: webkit
        suite: e2e
    include:
      - node: 22
        browser: chromium
        suite: lint
\`\`\`

This configuration is readable, but the \`lint\` cell overloads browser fields it does not need. In a real workflow, a separate lint job is clearer. A matrix is best when every dimension changes how the same logical job runs.

For conditional steps, compare matrix properties explicitly and keep the condition adjacent to the behavior. For example, upload a coverage report only from the primary cell. Without this rule, parallel jobs may race to publish or overwrite the same report.

\`\`\`yaml
- name: Upload primary coverage
  if: matrix.node == 22 && matrix.browser == 'chromium' && matrix.os == 'ubuntu-latest'
  uses: actions/upload-artifact@v4
  with:
    name: coverage-primary
    path: coverage
\`\`\`

## Express the same intent in GitLab CI

GitLab CI supports matrix expansion through \`parallel:matrix\`. Variables from each entry are available to the job. Keep the test command and artifact path tied to those variables so a failed cell is self-describing.

\`\`\`yaml
test:
  image: node:22
  parallel:
    matrix:
      - BROWSER: [chromium, firefox, webkit]
        SUITE: [smoke, regression]
  script:
    - corepack enable
    - pnpm install --frozen-lockfile
    - pnpm exec playwright install --with-deps "$BROWSER"
    - pnpm exec playwright test --project="$BROWSER" --grep="@$SUITE"
  artifacts:
    when: always
    paths:
      - test-results/
    expire_in: 1 week
\`\`\`

The example assumes the repository deliberately uses \`@smoke\` and \`@regression\` annotations that work with Playwright's \`--grep\`. If it does not, use separate configuration projects or an existing test-selection mechanism. Do not copy a tag convention that the suite does not implement.

GitHub Actions, GitLab CI, and CircleCI use different expansion and dependency syntax, but the engineering contract is the same: deterministic input variables, unique reports, independent cells, and a visible aggregation result.

## Combine matrices with test-level sharding carefully

A compatibility matrix and test sharding solve different problems. The matrix repeats relevant coverage in different environments. Sharding partitions one environment's tests to shorten its wall time. Applying four shards to six compatibility cells produces 24 jobs, so introduce the layers separately and measure queue delay.

If a large primary-browser suite is the bottleneck, shard only that cell. Keep smaller compatibility smoke cells unsharded. In GitHub Actions, a static shard dimension can work, but conditional shard counts become difficult to understand. Separate jobs often communicate intent better.

For timing-aware distribution in another CI platform, see [splitting Playwright tests by timing in CircleCI](/blog/circleci-split-playwright-tests-by-timing). Timing-based splitting addresses uneven test duration, while a version matrix addresses environment coverage.

Whatever mechanism you choose, a test must run exactly once per intended environment. Generate or inspect a manifest of discovered tests, and compare it with reported tests. Missing tests can make parallelization look faster while reducing coverage.

## Prevent state collisions between parallel jobs

Matrix cells run concurrently against whatever dependencies you give them. If they share one staging tenant, email inbox, database schema, object-storage prefix, or fixed user account, they can corrupt each other's assumptions. A job identifier is not isolation by itself.

Derive unique resource names from safe CI identifiers and clean them even after failures. Prefer provisioning isolated databases or schemas over deleting shared tables. Namespace test users and webhook destinations. Do not expose secret values in names or artifacts.

\`\`\`bash
export TEST_RUN_ID="pr-\${CI_CHANGE_ID:-local}-node-\${NODE_VERSION}-\${BROWSER}"
export TEST_EMAIL_PREFIX="qa+\${TEST_RUN_ID}"
pnpm exec playwright test --project="$BROWSER"
\`\`\`

The shell substitutions above are part of the generated article's code sample, so their literal \`\${...}\` sequences are escaped in the surrounding TypeScript template. At runtime in a shell, supply trusted, sanitized variables before using them in resource identifiers.

Resource contention can also create rate-limit or connection-pool failures. Set CI concurrency from measured service capacity, not only runner availability. Ten parallel jobs are slower than five if all ten repeatedly wait for a four-connection test database.

## Preserve evidence and cancel obsolete work

Give every artifact a unique matrix-derived name. Include JUnit XML, Playwright traces for relevant failures, screenshots, and concise environment metadata. Aggregators should combine reports for presentation without erasing the originating cell. The cell identity is part of the defect.

Use concurrency controls to stop outdated work when a newer commit arrives on the same branch or pull request. Cancellation saves capacity, but evidence steps need deliberate conditions. A cancelled obsolete run usually should not publish a required report that looks current. The [guide to cancelling stale E2E runs](/blog/ci-cancel-stale-e2e-runs-on-new-commit) covers grouping and cancellation semantics.

Do not let an optional experimental cell hide a required failure. Platforms offer ways to tolerate selected failures, but apply them only to environments that are truly not part of the support contract. Label experimental cells in job names and report them separately from the required pass rate.

## Measure whether parallelism improved feedback

Track queue time, setup time, execution time, artifact upload time, total workflow duration, compute minutes, and rerun rate per cell. A matrix can reduce wall time while increasing total compute sharply. That trade may be worthwhile for pull requests but wasteful for low-priority branches.

Inspect the slowest cell because matrix duration is governed by the critical path. Cache dependency downloads using the package manager's documented cache, but still perform a locked install. Avoid caching \`node_modules\` across incompatible operating systems or runtimes unless the tooling explicitly supports it.

Review failures by dimension. If a browser cell never finds unique defects across months, reduce its frequency or suite scope after checking coverage. If one runtime repeatedly fails during setup, fix the environment image instead of adding retries. Matrix design should evolve from observed defect yield and latency, with the support policy kept explicit.

## Frequently Asked Questions

### How many CI matrix jobs should run on every pull request?

Use the smallest set that protects required compatibility and gives timely feedback. Start with the primary environment plus targeted cells for supported runtimes or browsers with meaningful regression risk. Move broad, expensive combinations to scheduled or release runs only when the support policy allows it. Measure queue time, defect yield, and compute rather than choosing a universal job count.

### Should fail-fast be enabled for a test matrix?

For compatibility testing, disabling fail-fast often produces better diagnostic evidence because all environments finish after one fails. Enable early cancellation when conserving scarce capacity matters more than collecting the full compatibility picture. Either choice is separate from pass criteria: a failed required cell must remain visible and must not be converted into success by the strategy setting.

### Is a browser matrix the same as Playwright sharding?

No. A browser matrix repeats tests across browser projects to validate compatibility. Sharding divides a test set across workers or CI jobs to reduce elapsed time in one environment. You can combine them, but job count multiplies quickly. Prove coverage and isolation at each layer before adding the next in practice.

### When should a matrix cell be allowed to fail?

Only when that environment is explicitly experimental or informational and is not part of the product's supported contract. Label it clearly, retain its evidence, and give failures an owner. If customers are promised support for that environment, allowing its cell to fail silently makes the compatibility claim untested in CI.
`,
};
