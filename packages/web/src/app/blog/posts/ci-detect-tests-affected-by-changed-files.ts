import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Run Tests Affected by Changed Files in CI',
  description:
    'Run tests affected by changed files in CI using dependency graphs, safe fallbacks, and auditable selection rules that shorten feedback without hiding regressions.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Run Tests Affected by Changed Files in CI

A pull request changes three files, yet the pipeline boots every service and executes twelve thousand tests. Twenty minutes later, the author learns that one unit test failed in the package they edited. Dependency-aware test selection moves that signal closer to the commit without pretending that every test is independent or that a filename alone reveals all risk.

The engineering problem is not simply finding tests whose names resemble changed source files. A useful selector must answer a graph question: which test targets depend, directly or transitively, on the changed nodes? It must also account for inputs that sit outside the ordinary import graph, such as schemas, environment templates, code generators, shared fixtures, container images, and CI configuration.

This guide builds a practical selector for a TypeScript monorepo using Git and a repository-maintained dependency map. The same design applies to build systems with native affected-target support. The emphasis is on correctness, observable decisions, and explicit fallbacks rather than an opaque speed optimization.

## Choose the comparison range before choosing tests

Every affected-test calculation begins with a diff. In a pull request pipeline, comparing only the previous commit with HEAD is usually wrong after a force push or a branch containing several commits. Compare the current revision with the merge base of the target branch instead.

For a GitHub pull request, the target branch SHA is available to the workflow. Fetch enough history to compute a merge base, then ask Git for changed paths. On a post-merge pipeline, the useful range may instead be the merge commit's first parent through the merge commit. Scheduled pipelines often have no meaningful change range and should run the full suite.

| Pipeline event | Recommended baseline | Reason |
|---|---|---|
| Pull request | merge base of target branch and HEAD | Covers every branch change even after rebasing |
| Push to main | first parent of the pushed commit | Measures the change entering the protected branch |
| Merge queue | queue-generated base or merge-group base SHA | Includes interactions among queued changes |
| Nightly schedule | no diff, run all tests | Detects environmental and cross-area failures |
| Manual dispatch | user-supplied base or full-suite default | Avoids silently guessing operator intent |

Renames deserve special handling. Use Git's rename detection and consume the new path, but retain the old path as a changed node when directory ownership or generated artifacts depend on location. Deletions must also enter the graph. A removed module can invalidate every consumer even though no current file exists to inspect.

## Model test impact as a directed graph

Imagine three workspace packages: core, billing, and web. Billing imports core, web imports both, and each package owns unit tests. A change in core affects all three test targets. A change in a billing test helper might affect billing tests only. The graph needs enough resolution to preserve those distinctions.

There are several reasonable node granularities:

| Graph unit | Strength | Blind spot | Good fit |
|---|---|---|---|
| Individual file | Precise selection for local imports | Expensive to maintain across dynamic loading | Small codebases or compiler-backed tooling |
| Package or workspace | Stable and easy to explain | Runs extra tests within a package | Most monorepos |
| Build target | Understands generated code and test variants | Requires disciplined build metadata | Bazel, Nx, Pants, or similar systems |
| Service boundary | Matches deployment ownership | Too coarse for fast unit feedback | Integration and contract suites |

Package-level selection is often the best first implementation. Store package dependencies in workspace manifests or build metadata, not in a second hand-written graph that will drift. Map every changed path to an owning package, reverse the dependency edges, traverse from changed packages, and select test commands for every reached package.

The graph also needs global inputs. A root TypeScript configuration, lockfile, shared test preset, database migration, or protobuf schema may affect many packages without an import edge. Treat these as declared impact rules. For example, a lockfile change can select all install-dependent tests, while a documentation-only change can select a lightweight validation target.

## A transparent selector using Git and workspace metadata

The following Node.js script is deliberately small. It expects a JSON file containing package roots, dependencies, and test commands. It calculates the merge base, lists changes, finds directly changed packages, adds reverse dependents, and prints a JSON decision record. Unknown paths trigger the conservative full-suite path.

\`\`\`typescript
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

type Package = {
  name: string;
  root: string;
  dependencies: string[];
  testCommand: string;
};

const baseRef = process.env.BASE_REF ?? 'origin/main';
const packages = JSON.parse(
  readFileSync('ci/test-targets.json', 'utf8'),
) as Package[];

const git = (...args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8' }).trim();

const mergeBase = git('merge-base', baseRef, 'HEAD');
const changedFiles = git(
  'diff',
  '--name-only',
  '--diff-filter=ACDMRTUXB',
  mergeBase,
  'HEAD',
)
  .split('\\n')
  .filter(Boolean);

const globalInputs = new Set([
  'pnpm-lock.yaml',
  'tsconfig.base.json',
  'vitest.workspace.ts',
]);

const fullRun = changedFiles.some((file) => globalInputs.has(file));
const directlyChanged = new Set(
  packages
    .filter((pkg) =>
      changedFiles.some(
        (file) => file === pkg.root || file.startsWith(pkg.root + '/'),
      ),
    )
    .map((pkg) => pkg.name),
);

const known = changedFiles.every(
  (file) =>
    globalInputs.has(file) ||
    file.startsWith('docs/') ||
    packages.some(
      (pkg) => file === pkg.root || file.startsWith(pkg.root + '/'),
    ),
);

const selected = new Set(fullRun || !known ? packages.map((pkg) => pkg.name) : directlyChanged);
let grew = true;
while (grew) {
  grew = false;
  for (const pkg of packages) {
    if (!selected.has(pkg.name) && pkg.dependencies.some((dep) => selected.has(dep))) {
      selected.add(pkg.name);
      grew = true;
    }
  }
}

const commands = packages
  .filter((pkg) => selected.has(pkg.name))
  .map((pkg) => pkg.testCommand);

process.stdout.write(
  JSON.stringify({ mergeBase, changedFiles, known, fullRun, selected: [...selected], commands }, null, 2),
);
\`\`\`

A real implementation should validate the metadata schema and fail if a dependency names a missing package. It should also normalize path separators if developers run it on Windows. Most importantly, the output is a decision record, not just a list of commands. When a missed regression is investigated, the team can see the exact base, changed paths, rules, and targets used.

## Wire selection into GitHub Actions without losing evidence

The workflow below fetches full history for a reliable merge base, runs the selector, exposes the selected command list as a matrix, and uploads the decision record. GitHub expressions cannot safely consume arbitrary shell output unless it is deliberately written to the step output file, so the script writes JSON and a separate step extracts the commands.

\`\`\`yaml
name: affected-tests
on:
  pull_request:

jobs:
  select:
    runs-on: ubuntu-latest
    outputs:
      commands: \${{ steps.matrix.outputs.commands }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: node --import tsx ci/select-affected-tests.ts > affected.json
        env:
          BASE_REF: origin/\${{ github.base_ref }}
      - id: matrix
        run: |
          node -e "const d=require('./affected.json'); require('fs').appendFileSync(process.env.GITHUB_OUTPUT, 'commands=' + JSON.stringify(d.commands) + '\\n')"
      - uses: actions/upload-artifact@v4
        with:
          name: affected-test-decision
          path: affected.json

  test:
    needs: select
    if: \${{ needs.select.outputs.commands != '[]' }}
    strategy:
      fail-fast: false
      matrix:
        command: \${{ fromJSON(needs.select.outputs.commands) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: \${{ matrix.command }}
\`\`\`

Pin actions to commit SHAs if your supply-chain policy requires it. Also make an explicit decision for an empty matrix. A documentation-only pull request may legitimately select no runtime tests, but it should still run markdown, link, or policy validation through a separate target.

For a broader CI design, including permissions, caching, and branch protection, see the [GitHub Actions testing guide](/blog/github-actions-testing-ci-cd-guide). Selection is only one layer of a trustworthy pipeline.

## Capture dependencies that imports cannot reveal

Static imports cover less than teams initially expect. Tests can depend on files through configuration lookup, runtime discovery, SQL execution, glob patterns, Docker build contexts, or network protocols. Each such relationship needs either graph metadata or a safety rule.

Consider these common hidden edges:

- A migration changes the database shape used by repository integration tests.
- An OpenAPI document generates a client consumed by several packages.
- A shared Playwright storage state changes authentication for every browser project.
- A Docker base image affects all containerized integration suites.
- A feature-flag catalog changes valid combinations without appearing in application imports.
- A test fixture directory is loaded with a glob whose filenames never appear in code.

Do not attempt to solve every hidden edge with increasingly clever source parsing. Declare semantic inputs beside the target that consumes them. Build tools call these inputs, dependencies, resources, or named inputs. In a custom selector, an explicit rule file can do the same job, provided ownership and review are clear.

Generated code needs special attention. If generated output is committed, selecting from the output diff may work, but only when contributors always regenerate it. If output is created in CI, the selector must understand that a schema change affects generator targets and every consumer of their output. One robust pattern is to make generation a prerequisite, verify a clean working tree afterward, then calculate target impact using the schema as a declared input.

## Treat selection failures as reasons to run more

An optimizer must fail open. If the base revision cannot be fetched, metadata cannot be parsed, a path has no owner, or traversal encounters an invalid edge, run the complete relevant suite. Returning zero tests is the dangerous failure mode.

Build a short list of fallback triggers and make each visible in logs:

| Condition | Safe response | Useful diagnostic |
|---|---|---|
| Merge base unavailable | Run all targets | Requested base and fetched refs |
| Changed path unclassified | Run all, then add ownership | Exact unmatched paths |
| Dependency metadata invalid | Fail selection and start full job | Schema validation errors |
| Selector version changed | Run all once | Selector commit SHA |
| More than a configured fraction affected | Run all in simpler batches | Selected and total target counts |
| Security-sensitive global input changed | Run policy-defined comprehensive suites | Matching impact rule |

The fraction threshold is not a correctness measure. It is an operational optimization: when nearly everything is selected, a regular full-suite job may shard more efficiently and be easier to understand.

Forked pull requests create another constraint. Avoid executing repository-provided selection scripts with secrets in a privileged context. Use the normal untrusted pull request event, grant minimal permissions, and separate any later trusted publishing workflow from test execution.

## Validate the selector with shadow runs

Dependency-aware selection itself needs testing. Unit-test path ownership, reverse traversal, deletions, renames, and global-input rules. Then evaluate the system against actual changes.

During a shadow period, calculate the affected set but still run the full suite. Compare selected failures with all failures. Any test that fails outside the selected set is a false negative and should result in a new edge, a global rule, or an investigation into flakiness. A test selected unnecessarily is a false positive. False positives cost time, but false negatives undermine trust.

A compact fixture repository can exercise graph behavior:

\`\`\`json
[
  {
    "name": "core",
    "root": "packages/core",
    "dependencies": [],
    "testCommand": "pnpm --filter core test"
  },
  {
    "name": "billing",
    "root": "packages/billing",
    "dependencies": ["core"],
    "testCommand": "pnpm --filter billing test"
  },
  {
    "name": "web",
    "root": "apps/web",
    "dependencies": ["core", "billing"],
    "testCommand": "pnpm --filter web test"
  }
]
\`\`\`

From this metadata, a core change must select core, billing, and web. A billing change selects billing and web. A web-only change selects web. Deleting a core file produces the same impact as modifying it. A docs-only change selects none of these targets, assuming documentation validation is modeled separately.

Track selection quality over time, not just saved minutes. Useful fields include changed paths, directly changed targets, transitive targets, fallback reason, test duration, selected test count, and failures. If you emit JUnit, preserve suite names and failure details exactly as in the full run so reporting remains comparable. The [GitLab CI JUnit and flaky-test guide](/blog/gitlab-ci-junit-report-flaky-tests) covers the reporting side when GitLab is the execution platform.

## Balance fast pull requests with broader detection

Affected tests should rarely be the only defense. They are best used in a layered schedule:

1. Pull requests run affected unit, component, contract, and selected integration targets.
2. Protected-branch merges run either the same calculation against the merge or a broader package set.
3. Nightly or periodic pipelines run all tests and expensive cross-service scenarios.
4. Release candidates run suites tied to release risk, migrations, compatibility, and supported platforms.

This model acknowledges that dependency metadata is an approximation. Periodic full runs catch missing edges, global state interactions, toolchain changes, and nondeterministic failures. They also provide the comparison data needed to improve selection.

Do not oversell latency gains before measuring queue behavior. If setup dominates test execution, selecting fewer packages may save little unless installation, environment creation, and artifact reuse are also addressed. Conversely, a single heavy browser project removed from most pull requests can change feedback materially. Measure end-to-end time from commit arrival to actionable failure, including queue and provisioning.

Ownership matters as much as the algorithm. Package maintainers should review dependency declarations and impact rules. Platform engineers should own merge-base semantics, fallback behavior, and observability. Test owners should classify suites by target and report false negatives. Without this division, the selector becomes an abandoned central script that nobody trusts enough to fix.

## Roll out selection as a reviewed CI policy

Introduce the selector in stages. First publish its proposed targets beside full-suite results. Next, allow it to control a non-blocking pull request job while the comprehensive job remains required. Only make the reduced set authoritative after shadow data covers representative changes, including refactors, dependency upgrades, migrations, generated sources, and deletions.

Document an escape hatch that increases coverage. A pull request label or workflow input can request all tests when a reviewer sees risk the graph does not encode. The override must never reduce the selected set, and the decision artifact should record who or what activated it. This preserves a fast default without turning graph metadata into an argument against engineering judgment.

Review selector changes like production code. Require fixtures proving the new path rule, examples of direct and transitive impact, and a full-run fallback for invalid configuration. Changes that reduce a target set deserve particular scrutiny because their failure mode is absence of evidence.

Finally, surface selection in the pull request summary. Authors should see that a core change selected billing and web, or that an unowned infrastructure file forced the full suite. Visibility creates useful feedback: maintainers spot surprising edges, platform owners learn which global rules are too broad, and test owners can challenge exclusions before a regression escapes.

## Frequently Asked Questions

### Should changed test files select only themselves?

Sometimes, but make that a deliberate rule. A unit test file with no shared helpers can run alone, while a changed fixture or setup module may affect an entire target. Package-level selection is safer until file-level dependencies are demonstrably complete.

### How should database migrations affect selection?

Declare migrations as inputs to every integration target that uses the changed schema, or select the full database test group. Import analysis will not find SQL consumed by a migration runner, so this edge must be semantic.

### Can test coverage data replace a dependency graph?

Coverage mapping is useful evidence because it connects tests to code observed at runtime. It remains incomplete for unexecuted branches, configuration, deletions, and data-dependent paths. Use it to enrich selection, with conservative rules for uncovered changes.

### What happens when a pull request changes the selector itself?

Run the full suite and test the selector against fixtures. Self-selection creates a circular trust problem: a broken new rule should not be allowed to exclude the tests that would expose it.

### Is dependency-aware selection worthwhile for a small repository?

Only if test feedback is meaningfully slow or costly. A small suite that completes in two minutes is usually clearer when run in full. Start selection when measurement shows target execution, queue pressure, or scarce environments are delaying useful feedback.
`,
};
