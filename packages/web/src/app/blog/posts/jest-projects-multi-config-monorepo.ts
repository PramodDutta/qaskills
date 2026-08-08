import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest Projects Multi Config Monorepo: A Practical Architecture',
  description: 'Build a Jest projects multi config monorepo with clear ownership, selective CI runs, isolated environments, and diagnostics that stop config drift and test leaks.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Jest Projects Multi Config Monorepo: A Practical Architecture

A Jest projects multi config monorepo works best when a thin root configuration discovers independently owned project configurations, each project has a unique \`displayName\`, and CI selects projects without changing their behavior. This architecture lets browser-like packages, Node services, shared libraries, and contract tests use different environments and transforms while retaining one reporting and command surface.

The practical payoff is isolation without fragmentation. A developer can run all projects from the repository root, a package team can run one named project, and CI can schedule expensive groups separately. Pair this architecture with [canceling stale end-to-end runs](/blog/ci-cancel-stale-e2e-runs-on-new-commit) when new commits supersede costly pipelines, and use [test selection by Git diff](/blog/ci-test-selection-by-git-diff) when changed-file impact analysis is mature enough to narrow safe feedback.

## Decide What Deserves Its Own Jest Project

A Jest project is a configuration and execution boundary, not merely a folder. Create one when tests need a distinct runtime environment, transform, setup lifecycle, ownership policy, or CI schedule. Do not create a project for every directory if all directories share the same behavior.

| Boundary signal | Separate project? | Reason |
|---|---|---|
| Node service versus DOM component tests | Usually yes | Different \`testEnvironment\` and setup |
| Two packages with identical config | Maybe | Ownership may justify it, mechanics may not |
| Unit versus slow database integration tests | Usually yes | Different fixtures, timeout policy, and CI lane |
| Source and test directories | No | A normal \`testMatch\` handles this |
| Different TypeScript compilation rules | Yes | Transform behavior must remain explicit |
| One temporary flaky test | No | Quarantine policy should not reshape architecture |

Start from test contracts. A unit project promises no network or shared database. An integration project may promise a provisioned database and serialized schema migrations. A web component project promises a DOM-capable environment and browser API mocks. Project names should make those contracts recognizable in console output and CI.

Avoid project names based only on team names. Teams reorganize, while runtime and product boundaries usually persist longer. A display name such as \`billing-integration\` communicates more than \`team-rocket-tests\`.

## Use a Thin Root Configuration

The root config should coordinate projects and shared reporting, not silently override every child. Paths to package configurations make ownership clear and give each package a runnable entry point.

\`\`\`js
// jest.config.cjs
module.exports = {
  projects: [
    '<rootDir>/packages/auth/jest.config.cjs',
    '<rootDir>/packages/ui/jest.config.cjs',
    '<rootDir>/services/billing/jest.config.cjs',
    '<rootDir>/tests/contracts/jest.config.cjs',
  ],
};
\`\`\`

Jest also accepts project configuration objects in the \`projects\` array. File-based child configs are often easier to own in a monorepo because package-specific comments, setup paths, and transforms remain close to the package. The root still provides one \`npx jest\` command.

Keep the list explicit when the set is small and stability matters. A glob can reduce maintenance in a very large repository, but it may accidentally discover examples, fixtures, generated worktrees, or packages that are not ready to join the suite. If you generate the project list, validate unique names and committed config files before Jest starts.

The root should not contain a broad \`testMatch\` that competes with child configs. Think of it as an orchestrator. Cross-project reporters or coverage policy can live there only after you verify how Jest applies root options to project runs in the installed version.

## Give Every Child an Explicit Identity

A child configuration should specify its root, display name, environment, test discovery, and any setup or transform it genuinely needs. The following Node-oriented authentication package uses JavaScript tests without a transform:

\`\`\`js
// packages/auth/jest.config.cjs
module.exports = {
  displayName: 'auth-unit',
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.js'],
  clearMocks: true,
};
\`\`\`

The \`rootDir: '.'\` value is resolved from the location of this config file when Jest loads it. Paths using \`<rootDir>\` therefore remain package-local. Verify resolved configuration with \`--showConfig\` rather than assuming path semantics during a migration.

A UI package can use a DOM environment. In current Jest setups, the jsdom environment may need to be installed separately according to Jest's official documentation. Select and pin a compatible dependency instead of copying an arbitrary version from an article.

\`\`\`js
// packages/ui/jest.config.cjs
module.exports = {
  displayName: 'ui-unit',
  rootDir: '.',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  clearMocks: true,
};
\`\`\`

Do not put database bootstrapping into \`setupFilesAfterEnv\` just because it runs before tests. That hook executes in test environments and is intended for framework setup such as matchers or per-file hooks. Expensive shared infrastructure needs a deliberate global or CI lifecycle, with cleanup and failure ownership made explicit.

## Share Configuration Through Plain Composition

Duplication becomes noisy when ten projects repeat the same coverage exclusions, mock policy, or module extensions. Use a small JavaScript base object and normal object composition. Keep project-defining fields local.

\`\`\`js
// test/jest.base.cjs
module.exports = {
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{js,jsx}',
    '!<rootDir>/src/**/*.d.js',
  ],
};
\`\`\`

\`\`\`js
// services/billing/jest.config.cjs
const base = require('../../test/jest.base.cjs');

module.exports = {
  ...base,
  displayName: 'billing-unit',
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.js'],
};
\`\`\`

This pattern has an important subtlety: strings containing \`<rootDir>\` are interpreted in the consuming project context, which is desirable for package-local source. Plain relative paths without the token can be harder to reason about when moved through shared objects. Use explicit root tokens for Jest paths and inspect the resolved config.

Do not export an enormous base config containing every transform, environment, mapper, setup file, and timeout. Child projects then spend more effort undoing inherited behavior than declaring their contract. Share stable policy, not runtime identity.

| Good shared option | Usually keep local | Why |
|---|---|---|
| Mock cleanup policy | \`displayName\` | Identity must be unique |
| Common reporter choice | \`testEnvironment\` | Runtime differs by project |
| Organization-wide coverage exclusions | \`testMatch\` | Discovery belongs to owner |
| File extensions used everywhere | Setup files | Setup implies runtime behavior |
| Output conventions | Transform | Compilation follows package toolchain |

## Keep TypeScript Transforms Aligned with the Package

Jest does not execute arbitrary TypeScript syntax without an appropriate transform or a build strategy. The correct transformer depends on the repository's established compiler and module system. Use the official documentation for Jest and the selected transformer. Do not invent a generic monorepo transform that contradicts package builds.

For a package already using Babel, the project can point Jest at the reviewed Babel configuration through \`babel-jest\`. For a package using another supported transformer, configure that package explicitly. Align path aliases with the runtime resolution strategy and cover them with a small import test.

A useful transform contract table belongs in repository documentation:

| Project | Source modules | Jest transform | Runtime target | Owner |
|---|---|---|---|---|
| \`auth-unit\` | CommonJS JavaScript | None | Node | Identity |
| \`ui-unit\` | JSX through Babel | Reviewed Babel config | jsdom | Web platform |
| \`billing-unit\` | Compiled JavaScript | None | Node | Billing |
| \`contracts\` | JavaScript | None | Node plus test server | Quality platform |

The values are illustrative. The principle is to make compilation observable. A test should not pass because Jest transpiles syntax in a way that the production bundler rejects. Where possible, run type checking and production compilation as separate CI checks. Jest execution and static type verification solve different problems.

## Separate Unit and Integration Lifecycles

Multi-project configuration is especially helpful when integration tests require external services. Give integration tests their own project name and discovery pattern. Then provision dependencies in the CI job that selects that project.

\`\`\`js
// services/billing/jest.integration.config.cjs
module.exports = {
  displayName: 'billing-integration',
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/integration/**/*.test.js'],
  globalSetup: '<rootDir>/test/integration/global-setup.cjs',
  globalTeardown: '<rootDir>/test/integration/global-teardown.cjs',
};
\`\`\`

The setup module should verify the environment rather than silently connect to a developer database. Require a test-specific database URL, check a recognizable database name or server marker, and fail closed. Teardown should remove only resources created by the suite, using an execution-specific namespace.

Keep global setup data transfer modest. Jest documents the lifecycle boundaries, and globals established in setup are not a general shared object available inside test files. Pass connection coordinates through a controlled environment variable or a generated file in a unique temporary directory, then delete it in teardown.

If integration tests mutate a shared schema, worker concurrency can produce cross-test conflicts. Prefer isolated databases or schemas per worker. Use \`--runInBand\` only when the system fundamentally cannot isolate concurrent tests and the slower serial behavior is accepted. Serializing by default can conceal state coupling that later appears in sharded CI.

## Select Projects with Documented CLI Semantics

Jest's \`--selectProjects\` option runs named projects by their display names. Names must therefore be unique and stable. Provide package scripts for common groups so engineers do not memorize long commands.

\`\`\`json
{
  "scripts": {
    "test": "jest",
    "test:auth": "jest --selectProjects auth-unit",
    "test:billing": "jest --selectProjects billing-unit billing-integration",
    "test:contracts": "jest --selectProjects contracts"
  }
}
\`\`\`

Use \`--ignoreProjects\` when the default should run everything except known expensive projects. Avoid combining many positive and negative selectors in ad hoc CI shell code. Named scripts or a checked-in CI matrix make intent reviewable.

Before relying on selection, run \`npx jest --listTests --selectProjects auth-unit\` and inspect the discovered files. \`--listTests\` is a diagnostic and can be used in a validation job. It should not replace actual execution.

Useful commands include:

\`\`\`bash
set -euo pipefail

npx jest --showConfig
npx jest --listTests --selectProjects auth-unit
npx jest --selectProjects auth-unit --runInBand
\`\`\`

The final serial command is appropriate for local diagnosis, such as determining whether a failure depends on worker concurrency. Do not commit serial execution as a permanent cure until the shared-state cause is understood.

## Map CI Jobs to Project Contracts

CI should change scheduling, not project semantics. The same child config should run locally and remotely. A matrix can select display names while keeping commands simple.

\`\`\`yaml
name: Jest projects

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        project:
          - auth-unit
          - ui-unit
          - billing-unit
          - contracts
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci
      - run: npx jest --selectProjects "\${{ matrix.project }}"
\`\`\`

This example omits the billing integration project because it may require a service container or dedicated environment. Add it as a separate job with the required setup, not as a matrix entry that cannot satisfy its contract. Action versions and runner labels should follow the repository's reviewed dependency policy.

Matrix jobs can repeat installation cost. In a large monorepo, package-manager caching and workspace-aware installs may help, but never reuse mutable \`node_modules\` across incompatible Node versions or lockfiles. A cache hit must not change which dependencies the lockfile resolves.

Publish JUnit or coverage artifacts with unique project names. If all jobs upload \`junit.xml\` to the same location, last-writer behavior can hide results just as easily as it does in any sharded test system.

## Add Git-Diff Selection Without Creating Blind Spots

Changed-file selection can reduce feedback time, but it needs a conservative dependency map. A change to a package should select its project and dependent projects. A change to root Jest policy, lockfiles, shared test utilities, or CI configuration should generally expand scope.

Jest's \`--findRelatedTests\` can run tests related to supplied source files within applicable project configuration. It is useful for local feedback and targeted CI, but it is not a complete substitute for monorepo dependency analysis. Configuration changes, dynamic imports, generated code, environment contracts, and cross-service behavior may escape static relationships.

A safe policy can be expressed as rules:

| Changed area | Minimum selection | Expansion trigger |
|---|---|---|
| Package source | Package project | Add reverse dependents |
| Shared test helpers | All consuming projects | Unknown consumers means all |
| Root Jest config | All Jest projects | Always |
| Lockfile | All projects | Always |
| Service API contract | Service and contract tests | Add known clients |
| Documentation only | No Jest projects | Unless docs generate code |

Run a full suite on the protected branch or scheduled cadence even when pull requests use selection. Compare selective-run outcomes with later full runs. A missed regression is evidence that the impact model needs expansion, not merely an unlucky exception.

## Diagnose Duplicate Tests and Root Confusion

A realistic migration failure looks like this: moving a package under \`packages/payments\` causes its tests to execute twice, once under \`payments-unit\` and once under a broad root project. Coverage counts inflate, mocks behave inconsistently, and CI duration nearly doubles.

The diagnosis begins with \`--listTests\` per project and \`--showConfig\`. Look for overlapping \`testMatch\` patterns, an unintended root-level test project, or two project entries resolving to the same child config. Compare absolute test paths grouped by display name.

A small Node script can detect duplicate discovered paths when given newline-delimited lists created per project:

\`\`\`js
import { readFileSync } from 'node:fs';

const inputs = process.argv.slice(2);
if (inputs.length < 2) {
  throw new Error('Pass at least two project test-list files');
}

const owners = new Map();
for (const input of inputs) {
  const paths = readFileSync(input, 'utf8')
    .split(/\\r?\\n/)
    .map((value) => value.trim())
    .filter(Boolean);

  for (const testPath of paths) {
    const projects = owners.get(testPath) ?? [];
    projects.push(input);
    owners.set(testPath, projects);
  }
}

const duplicates = [...owners.entries()].filter(([, projects]) => projects.length > 1);
if (duplicates.length > 0) {
  console.error(JSON.stringify(duplicates, null, 2));
  process.exitCode = 1;
}
\`\`\`

The correct repair is to make discovery boundaries disjoint or consciously accept a duplicated test under two environments with different file identities. In most unit suites, accidental duplication is a config defect. Do not hide it by lowering coverage expectations or ignoring one reporter result.

Another common root problem appears when setup paths work from the repository root but fail when the child config is invoked directly. Replace ambiguous relative paths with \`<rootDir>\` tokens and verify both commands. Package ownership is credible only if the package config behaves independently.

## Stop Environment Leakage Between Projects

Different \`testEnvironment\` values isolate globals at the Jest environment boundary, but process-level state and external resources can still leak. Tests can mutate environment variables, write fixed temporary filenames, bind the same port, or reuse database records.

Restore \`process.env\` changes after each test. Use system temporary directories with execution-specific subdirectories. Let the operating system allocate an available port by listening on port zero when the application supports it. Namespace external records with the project name and CI execution identifier.

What people get wrong is believing that a multi-project config automatically creates hermetic test suites. It creates configuration boundaries. Hermeticity still depends on fixtures, cleanup, mocks, time, randomness, network access, and resource ownership.

When a failure disappears with \`--runInBand\`, treat that as evidence of shared state. Check fixed ports, database keys, singleton servers, global mocks, and files in repository-local temp folders. Capture worker identity and project display name in diagnostic logs. Then isolate the resource instead of permanently serializing unrelated tests.

## Keep Coverage Meaningful Across Projects

Coverage aggregation can mislead when projects compile the same source differently or multiple projects exercise one shared package. Decide whether the organization needs per-project thresholds, a repository aggregate, or both. Per-project coverage highlights local gaps. An aggregate can show broad release evidence but may let heavily tested utilities hide an untested service.

Use unique coverage output directories for parallel jobs. Merge only compatible coverage formats produced from the same commit and instrumentation strategy. If unit and integration projects both cover billing source, state whether the combined view intentionally credits both.

Do not make display names carry threshold configuration. Keep thresholds next to owned source or in a reviewed central policy. When a package moves, ensure the coverage path patterns move with it. A sudden coverage increase can mean improved tests, but it can also mean the denominator disappeared because \`collectCoverageFrom\` no longer matches the source.

A coverage validation should therefore report discovered source-file count as well as percentages. Numbers without scope are weak evidence.

## Govern the Configuration as Production Code

Test configuration determines what runs, what is skipped, and which environment assertions trust. Review it with the same care as application code. Require owners for shared base config. Test custom project discovery or selection scripts with fixtures. Pin dependencies through the lockfile and review release notes when upgrading Jest or transformers.

Add lightweight invariants:

1. Every project has a unique display name.
2. Every child config resolves at least one intended test in the full repository checkout.
3. No test path belongs to multiple projects unless explicitly allowlisted.
4. Setup files exist and stay within their intended package or shared test directory.
5. CI artifact names include the project identity.
6. Full-suite execution remains available even when selective CI is enabled.

Ready-made QA skills install from qaskills.sh with the qaskills CLI when an AI coding agent needs a repeatable monorepo test-configuration workflow. Give the agent the workspace graph, module systems, transform choices, Node support policy, CI provider, and integration dependencies. Without that context, generated configuration can look tidy while resolving the wrong roots.

The strongest design is boring in operation: project names tell you what ran, configs remain local, selection is visible, and a failure can be reproduced with one root command. Complexity belongs in well-tested mapping code only when repository scale genuinely requires it.

## Frequently Asked Questions

### Should every package in a monorepo have a Jest project?

No. Create a project when a package needs an execution boundary, distinct environment, transform, setup lifecycle, ownership signal, or CI policy. Packages with identical test contracts can share a project if discovery and ownership remain clear. Too many projects increase configuration and scheduling overhead. Too few create broad roots and hidden overrides. Start from runtime and fixture contracts, then choose the smallest set of boundaries that makes those contracts explicit.

### Can child Jest configs inherit from a root config automatically?

Jest copies root-level configuration options into child-project contexts, resolving tokens such as \`<rootDir>\` for the child, but some options take effect only at the root level. A child can also define project-specific values. Share selected policy through the root or a plain JavaScript base object, while keeping identity, environment, discovery, transforms, and setup explicit. Use \`npx jest --showConfig\` to inspect the resolved result after changing roots or project discovery.

### How do I run only one project from the monorepo root?

Give the project a unique \`displayName\`, then run Jest with \`--selectProjects\` followed by that name, for example \`npx jest --selectProjects auth-unit\`. Add package scripts for frequently used selections so local and CI commands stay consistent. Use \`--listTests\` with the same selection to inspect discovery during diagnosis. Selection should change which project runs, not inject different transforms, setup files, or environment behavior.

### Why do Jest multi-project tests pass serially but fail in parallel?

The usual cause is shared mutable state outside Jest's configuration boundary: a fixed network port, common database record, repository-local temporary file, mutated process environment, singleton server, or incomplete mock cleanup. Run serially as a diagnostic, capture the project and worker identity, then locate the colliding resource. Give each worker isolated data and cleanup ownership. Permanent \`--runInBand\` may reduce symptoms, but it leaves the coupling in place and sacrifices useful concurrency.
`,
};
