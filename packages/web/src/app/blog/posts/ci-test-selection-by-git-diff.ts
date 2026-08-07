import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CI Test Selection by Git Diff Without Creating False Confidence',
  description: 'Learn ci test selection by git diff with safe merge-base logic, dependency-aware test mapping, fallbacks, and audits that cut CI time without missed regressions.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# CI Test Selection by Git Diff Without Creating False Confidence

CI test selection by git diff is a way to run the tests that can be affected by a change instead of running every test on every commit. A reliable implementation compares the candidate revision with the correct merge base, translates changed paths into affected components, adds tests for shared dependencies and high-risk surfaces, and deliberately falls back to the full suite when the evidence is incomplete. The payoff is faster feedback without quietly turning skipped coverage into a green check.

The hard part is not the \`git diff\` command. It is defining what a file change can influence. A one-line edit in a shared authentication client may require browser, API, and contract tests across several packages. A documentation edit may require no product tests at all. This guide develops a runnable selection workflow for a TypeScript monorepo, shows CI integration patterns, and explains how to measure whether selection remains safe as the repository evolves.

## The selection contract: optimize latency, never redefine correctness

Treat selection as a routing layer in front of tests, not as a new definition of what correct software means. The full suite remains the reference. A selected run answers, "Which checks should give this change fast feedback?" It does not prove that all other tests are irrelevant forever.

A useful operating contract has four rules:

1. Every selection decision is reproducible from a base SHA, head SHA, repository configuration, and selector version.
2. An unknown path, missing base, shallow history problem, or selector exception expands the run rather than shrinking it.
3. Mainline, scheduled, and release pipelines periodically run the complete suite and compare results with selected runs.
4. The output explains both why a suite was selected and why another suite was omitted.

Those rules make failures diagnosable. They also prevent a common mistake: optimizing the number of executed tests while ignoring the probability and cost of a missed regression.

| Selection outcome | Meaning | Required CI behavior |
|---|---|---|
| Confident narrow set | Changed paths have complete, reviewed mappings | Run mapped tests plus mandatory smoke checks |
| Broad affected set | Shared code or cross-cutting configuration changed | Run every dependent suite |
| No product impact | Only explicitly classified non-product paths changed | Run fast repository checks, record the reason |
| Unknown | Base, mapping, or dependency data is unavailable | Run the full suite and flag selector telemetry |
| High-risk override | Migration, auth, build, or test infrastructure changed | Run policy-defined full or expanded coverage |

## Choose the diff range that represents the proposed change

Many broken selectors compare the wrong commits. \`HEAD~1..HEAD\` sees only the newest commit, so a pull request with five commits can omit changes from the first four. Comparing the target branch tip directly with the feature tip can include unrelated target-branch work. The robust mental model is: find the best common ancestor of the target branch and the candidate, then diff that ancestor against the candidate.

For a pull request, fetch enough target-branch history to calculate the merge base. Do not assume that the CI checkout contains it, because shallow clones may hold only the candidate commit. A basic shell workflow looks like this:

\`\`\`bash
set -euo pipefail

target_ref="origin/main"
head_sha="$(git rev-parse HEAD)"

git fetch origin main
base_sha="$(git merge-base "$target_ref" "$head_sha")"

git diff --name-only --diff-filter=ACMR "$base_sha" "$head_sha" > changed-files.txt
printf 'base=%s head=%s changed=%s\\n' \\
  "$base_sha" "$head_sha" "$(wc -l < changed-files.txt)"
\`\`\`

\`--name-only\` emits paths instead of patch content. \`--diff-filter=ACMR\` includes added, copied, modified, and renamed entries while excluding deleted paths from this particular list. That exclusion is not universally correct. A deleted public module, fixture, route, or schema can have wide impact, so a production selector should collect status as well as names and assign deletion-specific policy.

Use \`git diff --name-status\` when rename and deletion semantics matter:

\`\`\`bash
git diff --name-status "$base_sha" "$head_sha" > changed-status.txt

if awk '$1 == "D" { found = 1 } END { exit !found }' changed-status.txt; then
  echo "Deletion detected: expanding selection"
fi
\`\`\`

Push pipelines require a separate decision. The provider may expose a previous SHA, but all-zero or absent values can occur for a newly created branch. Scheduled jobs may have no meaningful "previous push" at all. Express these cases as explicit pipeline modes instead of hiding them in one clever command.

| Pipeline mode | Preferred comparison | Safe fallback |
|---|---|---|
| Pull or merge request | Merge base of target branch and candidate -> candidate | Full suite if merge base cannot be resolved |
| Existing branch push | Previous pushed SHA -> current SHA | Merge base with default branch, then full suite |
| New branch | Merge base with default branch -> current SHA | Full suite |
| Main branch after merge | Previous main SHA -> current main SHA | Full suite |
| Schedule or release | Selection is usually disabled | Full suite by policy |

## Turn paths into capabilities, not test filenames

A path-to-test list works for a small repository, but it becomes brittle when files move and responsibilities overlap. Map paths first to capabilities such as \`checkout\`, \`identity\`, \`catalog\`, or \`shared-ui\`. Then map capabilities to test projects. This two-stage model keeps architectural knowledge visible and lets several suites respond to one change.

Consider this repository:

\`\`\`text
apps/storefront/
apps/admin/
services/orders/
packages/auth-client/
packages/ui/
tests/api/orders/
tests/e2e/storefront/
tests/e2e/admin/
tests/contracts/orders/
\`\`\`

A change under \`services/orders\` may select order unit tests, API tests, provider contract verification, and checkout smoke coverage. A change under \`packages/auth-client\` may select both application browser projects because the dependency is shared. The selector configuration should make this expansion auditable:

\`\`\`ts
type Rule = {
  prefix: string;
  capabilities: string[];
};

const rules: Rule[] = [
  { prefix: 'services/orders/', capabilities: ['orders-api', 'checkout'] },
  { prefix: 'packages/auth-client/', capabilities: ['identity', 'storefront', 'admin'] },
  { prefix: 'packages/ui/', capabilities: ['storefront', 'admin'] },
  { prefix: 'apps/storefront/', capabilities: ['storefront'] },
  { prefix: 'apps/admin/', capabilities: ['admin'] },
];

const suitesByCapability: Record<string, string[]> = {
  'orders-api': ['unit-orders', 'api-orders', 'contract-orders'],
  checkout: ['e2e-checkout-smoke'],
  identity: ['api-auth', 'e2e-auth-smoke'],
  storefront: ['e2e-storefront'],
  admin: ['e2e-admin'],
};
\`\`\`

Prefix rules are intentionally understandable. Regular expressions can compact a config, but opaque matching makes review harder. Start with normalized repository-relative paths and longest-prefix matching. Add glob semantics only when a concrete case requires them.

## Build a selector that fails open

"Fail open" here means open the gate to more testing. If the selector cannot establish a safe narrow set, it returns the complete suite. That is the opposite of returning an empty array on error, which can make a broken script produce a suspiciously fast success.

The following TypeScript core consumes paths and produces both suites and reasons. It also distinguishes explicitly ignored paths from unknown ones:

\`\`\`ts
type Selection = {
  mode: 'selected' | 'full';
  suites: string[];
  reasons: string[];
};

const allSuites = [
  'unit-orders',
  'api-orders',
  'contract-orders',
  'api-auth',
  'e2e-checkout-smoke',
  'e2e-auth-smoke',
  'e2e-storefront',
  'e2e-admin',
];

const ignoredPrefixes = ['docs/', 'notes/'];
const fullRunPrefixes = ['.github/', 'ci/', 'database/migrations/', 'test-support/'];

export function select(changed: string[]): Selection {
  const selected = new Set<string>();
  const reasons: string[] = [];

  for (const path of changed) {
    if (fullRunPrefixes.some(prefix => path.startsWith(prefix))) {
      return { mode: 'full', suites: allSuites, reasons: [
        'High-impact path changed: ' + path,
      ] };
    }

    if (ignoredPrefixes.some(prefix => path.startsWith(prefix))) {
      reasons.push('Explicitly ignored: ' + path);
      continue;
    }

    const matched = rules.filter(rule => path.startsWith(rule.prefix));
    if (matched.length === 0) {
      return { mode: 'full', suites: allSuites, reasons: [
        'Unknown path forced full run: ' + path,
      ] };
    }

    for (const rule of matched) {
      for (const capability of rule.capabilities) {
        for (const suite of suitesByCapability[capability] ?? []) selected.add(suite);
        reasons.push(path + ' affects ' + capability);
      }
    }
  }

  return { mode: 'selected', suites: [...selected].sort(), reasons };
}
\`\`\`

Empty diffs also deserve a policy. They can result from a documentation-only commit after filtering, a CI event mismatch, or a base-calculation defect. Do not silently equate "no paths" with "nothing to test." Carry both the original changed count and the classified count. If the raw diff is unexpectedly empty in a change pipeline, expand to the full suite and investigate.

## Add dependency awareness where path rules stop scaling

In a workspace, source ownership and dependency direction already exist in package manifests, build graphs, or task-runner metadata. Use those sources to calculate transitive dependents. If \`apps/storefront\` imports \`packages/auth-client\`, a change to the latter affects the former even when no storefront file changed.

The central operation is a reverse graph traversal:

\`\`\`ts
type Graph = Record<string, string[]>;

export function transitiveDependents(graph: Graph, changedPackages: string[]): string[] {
  const reverse: Graph = {};
  for (const [consumer, dependencies] of Object.entries(graph)) {
    for (const dependency of dependencies) {
      (reverse[dependency] ??= []).push(consumer);
    }
  }

  const affected = new Set(changedPackages);
  const queue = [...changedPackages];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const dependent of reverse[current] ?? []) {
      if (affected.has(dependent)) continue;
      affected.add(dependent);
      queue.push(dependent);
    }
  }
  return [...affected].sort();
}
\`\`\`

Keep graph extraction separate from selection policy. The extractor answers which packages depend on which. Policy answers which test layers a package requires. This separation lets you unit-test cycles, missing packages, optional dependencies, and renamed workspaces without invoking a test runner.

Dependency graphs still miss runtime coupling: services communicating over HTTP, code loading templates by name, shared database tables, feature-flag configuration, generated clients, and deployment manifests. Represent these as reviewed capability edges. A graph is evidence, not omniscience.

| Change kind | Static graph catches it? | Additional policy |
|---|---:|---|
| Imported TypeScript library | Usually | Run dependent package tests |
| HTTP response shape | Rarely | Contract and consumer capability map |
| Database migration | No | Migration, API, and critical journey suites |
| CSS token package | Usually | Visual or browser projects for dependents |
| Feature-flag default | Rarely | Select owners of the flag and smoke journeys |
| CI test helper | Sometimes | Full suite because the measurement system changed |

## Send a test matrix to CI without hiding the decision

The selector should write a small machine-readable artifact containing base, head, mode, suites, changed paths, selector revision, and reasons. The CI system can use the suite list to build a matrix. It should also publish the complete artifact for later audit.

One GitHub Actions pattern uses a selection job with a JSON output, followed by a matrix job. The exact checkout depth must support the merge-base calculation; fetching full history is the simplest reliable starting point, and teams can optimize later.

\`\`\`yaml
jobs:
  select:
    runs-on: ubuntu-latest
    outputs:
      suites: \${{ steps.selection.outputs.suites }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - id: selection
        run: node dist/ci/select-tests.js >> "$GITHUB_OUTPUT"

  test:
    needs: select
    strategy:
      fail-fast: false
      matrix:
        suite: \${{ fromJSON(needs.select.outputs.suites) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:suite -- "\${{ matrix.suite }}"
\`\`\`

The script writing to \`GITHUB_OUTPUT\` must emit the documented \`name=value\` form, for example \`suites=["api-orders","e2e-checkout-smoke"]\`. Keep suite names in an allowlist before inserting them into a shell command. Better yet, pass them to a Node launcher as data rather than constructing a command string.

In GitLab CI, one approach is to run the selector in an early job, save its JSON as an artifact, and let a later test launcher read it. GitLab's \`rules:changes\` is useful for direct path conditions, but a custom selector is easier to audit when transitive dependency logic and detailed fallbacks are required.

\`\`\`yaml
select_tests:
  stage: build
  script:
    - npm ci
    - npm run build:ci-tools
    - node dist/ci/select-tests.js --output selection.json
  artifacts:
    paths:
      - selection.json

run_selected_tests:
  stage: test
  needs:
    - job: select_tests
      artifacts: true
  script:
    - node dist/ci/run-selection.js selection.json
\`\`\`

Selection speeds feedback, while cancellation prevents obsolete pipelines from consuming capacity. They solve different queueing problems. If long browser jobs pile up after force-pushes, combine selection with the workflow described in [canceling stale E2E runs when a new commit arrives](/blog/ci-cancel-stale-e2e-runs-on-new-commit).

## Test the selector like production code

The selector controls which evidence reaches a merge gate. That makes it test infrastructure with a high blast radius. Unit tests should cover direct mappings, transitive dependencies, ignored files, deletions, renames, unknown paths, empty changes, invalid configuration, and cycles in the package graph.

Table-driven tests are effective because every case documents an architectural expectation:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { select } from './select';

describe('test selection policy', () => {
  it.each([
    {
      changed: ['services/orders/src/create.ts'],
      expected: ['api-orders', 'contract-orders', 'e2e-checkout-smoke', 'unit-orders'],
    },
    {
      changed: ['packages/auth-client/src/token.ts'],
      expected: ['api-auth', 'e2e-admin', 'e2e-auth-smoke', 'e2e-storefront'],
    },
  ])('maps $changed', ({ changed, expected }) => {
    expect(select(changed).suites).toEqual(expected);
  });

  it('runs everything for an unmapped product path', () => {
    const result = select(['services/new-risk-engine/src/index.ts']);
    expect(result.mode).toBe('full');
  });
});
\`\`\`

Add repository-level invariant tests too. Walk all tracked product files and assert that each matches an impact rule, an explicit ignore rule, or a full-run rule. This catches a new top-level service on the pull request that introduces it, rather than weeks later after selection gaps accumulate.

An AI coding agent can help propose mappings when it creates a package, but make the policy review visible in the same diff. A ready-made QA skill from qaskills.sh can be installed with the qaskills CLI when you want a repeatable agent workflow, yet the repository's owners must still approve the actual impact edges.

## Diagnose the dangerous green pipeline

Imagine a pull request changes \`packages/session/src/cookie.ts\`. The selector reports no browser suites, the unit tests pass, and the pipeline finishes in four minutes. After merge, login fails in Safari because the shared session package feeds the storefront but was never represented in the map.

Start diagnosis with the selection artifact, not the test runner. Confirm the raw diff includes the file. Confirm the base SHA is the merge base expected for the pull request. Check path normalization, especially if a script runs from a subdirectory. Then inspect whether the path matched a rule, which capability it produced, and which suites that capability expanded into.

Typical signatures point to different causes:

| Symptom | Likely cause | Corrective action |
|---|---|---|
| Changed file absent from raw diff | Wrong range or insufficient history | Fix base resolution and fetch policy |
| File present, no rule matched, run stayed narrow | Unsafe unknown-path behavior | Make unknown force a full run |
| Capability selected, browser suite absent | Incomplete capability-to-suite map | Add the suite and an invariant test |
| Correct suite selected, zero tests executed | Runner filter mismatch | Validate suite names against runner projects |
| Intermittent miss only after rebases | Stale cached selection | Key cache by base, head, and selector revision |

The immediate repair is to add the missing edge and run full coverage. The systemic repair is to create a tracked false-negative incident. Record the change, omitted test, escaped defect, detection source, and selector rule responsible. This turns anecdotes into data for threshold decisions.

## What teams get wrong about "only changed tests"

The phrase suggests that tests themselves are either changed or unchanged. Impact flows through behavior, not file modification. A stable checkout test can be the most important test after a pricing library changes. Selecting only test files adjacent to modified source files is suitable only where repository architecture truly guarantees isolation.

Another mistake is treating code coverage as a complete dependency map. Coverage from past runs shows which code executed for those inputs. It can miss unobserved branches, dynamic loading, new files, external interactions, and setup effects. Coverage can enrich selection, but static dependencies, domain rules, and conservative fallbacks still matter.

Teams also over-optimize the median pull request. If 70 percent of changes are small, a selector can make those fast while allowing shared or risky changes to run everything. Requiring every diff to produce a narrow selection adds complexity and pushes unsafe exceptions into configuration.

Finally, selection is sometimes credited for time saved without including queue delay, setup time, or retries. If eight tiny matrix jobs each reinstall dependencies and wait for a scarce browser worker, wall-clock latency may worsen. Optimize the full feedback path.

## Measure omission risk alongside minutes saved

Run the selector in observation mode before making it authoritative. Execute the full suite, but record what the selector would have chosen. Compare failures from selected and omitted groups. This establishes a baseline without putting merges at risk.

Once enabled, keep a random or scheduled sample of full runs on pull requests. Mainline and nightly full suites detect delayed misses. When an omitted test fails, determine whether the candidate change plausibly caused it. Flakiness must be separated from true selector false negatives; otherwise noisy suites will make selection look less accurate than it is.

Useful measures include:

| Measure | Calculation | Decision supported |
|---|---|---|
| Selection rate | Selected test tasks divided by all eligible tasks | How aggressively the system narrows |
| Feedback latency | Commit ready time to required result | Whether developers get answers sooner |
| Selector fallback rate | Full runs caused by uncertainty divided by selection attempts | Where mapping or Git data needs work |
| False-negative rate | Causally missed failures divided by evaluated changes | Whether omission risk is acceptable |
| Empty-run rate | Jobs launching zero tests divided by test jobs | Whether runner integration is broken |
| Cost per useful result | Compute cost divided by actionable failures found | Whether extra matrix complexity pays off |

Flaky reports are useful corroborating evidence. If selection changes the frequency with which a flaky test runs, naive trend charts can appear to improve. Preserve execution counts as the denominator and use structured reports. The workflow in [publishing GitLab CI JUnit reports for flaky tests](/blog/gitlab-ci-junit-report-flaky-tests) explains how to retain test-level evidence rather than relying on job color.

## Roll out in four controlled stages

Stage one is visibility. Generate the changed-path set and selection artifact, but run everything. Review diffs, reason strings, and unknown-path frequency for two weeks or enough representative changes.

Stage two is advisory selection. Run selected suites as the fast required lane and the full suite in parallel as a non-blocking audit. Developers get early signal, while omissions remain observable.

Stage three makes selection authoritative for low-risk pull requests. Keep full runs for shared infrastructure, security-sensitive components, migrations, releases, schedules, and manual overrides. Provide a simple full-run label or pipeline variable for reviewers.

Stage four tunes using evidence. Remove redundant edges only after audit data supports the change. Expand mappings immediately after a false negative. Version the configuration and include its revision in every artifact so an old decision can be reconstructed.

The result is not the smallest possible test set. It is a bounded, explainable system that spends compute where a change can cause harm and admits uncertainty when the repository cannot prove isolation.

## Frequently Asked Questions

### Should CI test selection by git diff replace nightly full-suite runs?

No. Diff-based selection provides fast change-specific feedback, while a full-suite run remains the independent check on the selector's assumptions. Run complete coverage on the default branch, on a schedule, before releases, or through a combination suited to your delivery frequency. Compare failures in omitted tests with the selection artifact. That audit is how you discover missing dependency edges, new repository paths, and dynamic coupling. If full runs are too unstable to serve as a reference, address their flakiness before trusting a narrower gate.

### What should happen when the merge base is missing in a shallow clone?

Fetch enough history and the target reference to calculate it. If the merge base still cannot be resolved, run the full suite and record a selector fallback reason. Do not substitute \`HEAD~1\`, because a multi-commit pull request would then ignore earlier commits. Track how often this fallback occurs. Frequent failures usually indicate checkout or fetch configuration problems, and fixing those is safer than inventing increasingly complex guesses about the comparison range.

### Can coverage data choose the exact tests affected by a source change?

Coverage can provide useful historical edges between tests and executed files, but it is not proof that unselected tests are unaffected. It reflects previous inputs and instrumentation, not every dynamic import, configuration path, network interaction, generated artifact, or new branch. Combine coverage with workspace dependencies, explicit capability rules, and mandatory suites for cross-cutting changes. When coverage is stale, incomplete, or collected under a different build, discard it and expand the selection rather than producing a narrower answer from weak evidence.

### How do we know when a selector is safe enough to block merges?

Start with observation mode, then run selected and full lanes together across representative changes. Require zero unexplained selector false negatives, complete classification of tracked product paths, deterministic outputs for the same inputs, and visible fallbacks. Set an organization-specific risk threshold rather than copying a universal number. Continue sampled and scheduled full runs after enforcement begins. Safety is an ongoing property measured against repository change, not a one-time certification earned when the script is first merged.
`,
};
