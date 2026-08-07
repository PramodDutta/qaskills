import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Monorepo Testing with Affected Package Detection: Run Only What Changed',
  description: 'Monorepo testing affected package detection: build the dependency graph, select packages from the diff, and keep CI fast without missing cross-package breaks.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Monorepo Testing with Affected Package Detection: Run Only What Changed

Monorepo testing affected package detection is the practice of computing which packages in a multi-package repository can break because of a given change set, then running only the tests that protect those packages (and their dependents). Done well, a UI-only pull request stops paying for backend integration suites, while a change to a shared types package correctly fans out to every consumer. Done poorly, you either run the world on every commit or ship a "green" PR that never executed the only suite that could have caught a cross-package contract break.

This guide targets QA and test-automation engineers working in pnpm/npm/yarn workspaces, Nx-style graphs, Turborepo pipelines, or Bazel-ish graphs, especially where AI agents generate tests and code across package boundaries. You will get a clear model of the dependency graph, algorithms for affected selection, CI wiring patterns, failure diagnosis when selection is wrong, and concrete TypeScript and YAML you can adapt. Companion topics for CI hygiene include [canceling stale e2e runs on new commits](/blog/ci-cancel-stale-e2e-runs-on-new-commit) and publishing [GitLab CI JUnit reports for flaky tests](/blog/gitlab-ci-junit-report-flaky-tests).

The payoff is not merely faster pipelines. It is trustworthy selective testing: when the detector says a package is unaffected, reviewers and release managers can believe it.

## Why Full-Monorepo Test Grids Collapse

A monorepo with 80 packages and three test layers (unit, integration, e2e) cannot run every suite on every PR without either massive parallel spend or multi-hour queues. Teams respond with crude heuristics:

- "Only test the package whose folder changed."
- "Always run e2e."
- "Never run e2e on docs."
- "Run everything on main only."

Each heuristic fails a different way. Folder-only selection misses dependents: change \`packages/pricing\`, skip \`apps/checkout\` tests, break production totals. Always-run e2e wastes money and trains people to ignore CI. Docs-only shortcuts are fine until someone edits a generated OpenAPI file living under \`docs/\`. Main-only full grids find problems after merge, when bisecting across stacked PRs is painful.

Affected detection formalizes the correct heuristic: **compute the closure of packages that may change behavior given the diff and the dependency graph, then map that set to test tasks.**

## The Graph You Must Build (Conceptually)

At minimum you need a directed graph where:

- **Nodes** are packages (or projects, libraries, apps).
- **Edges** mean "depends on" at build or runtime for the behaviors you test.

If package A imports B, a change in B can affect A. Affected selection usually walks **reverse dependencies**: from changed packages outward to consumers.

| Edge kind | Example | Include in affected graph? |
| --- | --- | --- |
| Runtime import | \`apps/web\` imports \`packages/ui\` | Always |
| Type-only import | \`apps/web\` imports types from \`packages/api-types\` | Yes if types ship in build; still behavioral for TS consumers |
| DevDependency only | \`packages/ui\` uses vitest as devDep | Usually no for product tests; yes for tooling packages |
| Implicit config | root eslint config consumed by all | Treat root config as a special node with many dependents |
| Generated code | \`packages/api-client\` generated from \`openapi.yaml\` | Edge from client to schema source package or file node |
| Dynamic import / string path | runtime plugin load by name | Manual edges; detectors miss these without help |

**What people get wrong:** trusting package.json dependencies alone while a large share of coupling lives in path aliases, generated clients, shared Docker compose fixtures, or CI scripts that assume everything built. Augment the automatic graph with a small \`implicitDependencies\` map for those cases.

\`\`\`json
{
  "implicitDependencies": {
    "apps/web": ["packages/api-client", "ops/fixtures/checkout"],
    "packages/api-client": ["schemas/openapi.yaml"],
    "e2e/playwright": ["apps/web", "apps/api"]
  }
}
\`\`\`

## Detecting Changed Packages from Git

Start from a precise file list, then map files to packages.

\`\`\`bash
#!/usr/bin/env bash
# scripts/changed-files.sh
set -euo pipefail
BASE="\${1:-origin/main}"
git fetch origin main --depth=50 2>/dev/null || true
git diff --name-only "\${BASE}...HEAD"
\`\`\`

\`\`\`ts
// tools/affected/mapFilesToPackages.ts
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

export interface PackageLoc {
  name: string;
  dir: string;
}

export function loadWorkspacePackages(root: string): PackageLoc[] {
  // Example: pnpm-workspace style list checked into tools for determinism in CI.
  const raw = readFileSync(join(root, 'tools/affected/packages.json'), 'utf8');
  return JSON.parse(raw) as PackageLoc[];
}

export function fileToPackage(file: string, packages: PackageLoc[]): string | null {
  const normalized = file.split(sep).join('/');
  // Longest prefix wins so packages/ui/button maps to packages/ui, not packages
  const sorted = [...packages].sort((a, b) => b.dir.length - a.dir.length);
  for (const pkg of sorted) {
    const prefix = pkg.dir.endsWith('/') ? pkg.dir : pkg.dir + '/';
    if (normalized === pkg.dir || normalized.startsWith(prefix)) {
      return pkg.name;
    }
  }
  // Root files: package.json, turbo.json, ci workflows
  return null;
}

export function changedPackages(files: string[], packages: PackageLoc[]): {
  packages: string[];
  unmapped: string[];
} {
  const set = new Set<string>();
  const unmapped: string[] = [];
  for (const f of files) {
    const p = fileToPackage(f, packages);
    if (p) set.add(p);
    else unmapped.push(f);
  }
  return { packages: [...set], unmapped };
}
\`\`\`

Unmapped files are not noise. They are policy inputs:

| Unmapped path pattern | Suggested policy |
| --- | --- |
| \`.github/workflows/**\`, \`.gitlab-ci.yml\` | Affect all, or affect packages listed in workflow paths filters carefully |
| Root \`package.json\` / lockfile | Affect all (dependency graph may have shifted) |
| \`docs/**\` markdown only | Affect none for product tests; still run doc lint |
| \`schemas/**\` | Affect generators + reverse dependents of generated clients |
| \`ops/terraform/**\` | Out of app test scope; separate pipeline |

\`\`\`ts
// tools/affected/policy.ts
export function applyUnmappedPolicy(unmapped: string[]): 'none' | 'all' | 'schemas' {
  if (unmapped.some((f) => /(^|\\/)package-lock\\.json$|(^|\\/)pnpm-lock\\.yaml$/.test(f))) {
    return 'all';
  }
  if (unmapped.some((f) => f.startsWith('.github/') || f.includes('gitlab-ci'))) {
    return 'all';
  }
  if (unmapped.some((f) => f.startsWith('schemas/'))) {
    return 'schemas';
  }
  return 'none';
}
\`\`\`

## Walking Reverse Dependencies

Once you have seed packages, compute the affected closure.

\`\`\`ts
// tools/affected/graph.ts
export type DepGraph = Record<string, string[]>; // package -> dependencies

/** Build reverse adjacency: package -> dependents */
export function reverseGraph(graph: DepGraph): Record<string, string[]> {
  const rev: Record<string, string[]> = {};
  for (const [pkg, deps] of Object.entries(graph)) {
    rev[pkg] ??= [];
    for (const d of deps) {
      rev[d] ??= [];
      rev[d].push(pkg);
    }
  }
  return rev;
}

export function affectedClosure(
  seeds: string[],
  rev: Record<string, string[]>,
  implicit: Record<string, string[]> = {},
): string[] {
  // Merge implicit edges into reverse sense: if A implicitly depends on B,
  // then B change affects A.
  const localRev: Record<string, string[]> = { ...rev };
  for (const [pkg, deps] of Object.entries(implicit)) {
    for (const d of deps) {
      localRev[d] ??= [];
      if (!localRev[d].includes(pkg)) localRev[d].push(pkg);
    }
  }

  const seen = new Set<string>();
  const queue = [...seeds];
  while (queue.length) {
    const cur = queue.shift()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const dep of localRev[cur] ?? []) {
      if (!seen.has(dep)) queue.push(dep);
    }
  }
  return [...seen].sort();
}
\`\`\`

\`\`\`ts
// tools/affected/graph.test.ts
import { describe, it, expect } from 'vitest';
import { reverseGraph, affectedClosure } from './graph';

describe('affectedClosure', () => {
  const graph = {
    'packages/pricing': [],
    'packages/cart': ['packages/pricing'],
    'apps/checkout': ['packages/cart', 'packages/pricing'],
    'apps/marketing': ['packages/ui'],
    'packages/ui': [],
  };

  it('fans out from pricing to cart and checkout', () => {
    const rev = reverseGraph(graph);
    const affected = affectedClosure(['packages/pricing'], rev);
    expect(affected).toEqual(['apps/checkout', 'packages/cart', 'packages/pricing']);
  });

  it('does not pull marketing when ui untouched', () => {
    const rev = reverseGraph(graph);
    const affected = affectedClosure(['packages/pricing'], rev);
    expect(affected).not.toContain('apps/marketing');
  });
});
\`\`\`

Populate \`DepGraph\` from your package manager metadata (workspace protocol dependencies) or from an exported project graph if you already use a monorepo tool that computes one. Prefer the tool's official graph export when you have it; re-parsing node_modules trees is fragile.

## Mapping Affected Packages to Test Tasks

Packages are not tests. Define tasks explicitly.

\`\`\`ts
// tools/affected/tasks.ts
export interface PackageTasks {
  name: string;
  unit?: string; // command
  integration?: string;
  e2e?: string;
  /** If true, any dependent e2e app should run when this package is affected */
  criticalShared?: boolean;
}

export const tasks: PackageTasks[] = [
  {
    name: 'packages/pricing',
    unit: 'pnpm --filter @acme/pricing test',
    criticalShared: true,
  },
  {
    name: 'packages/cart',
    unit: 'pnpm --filter @acme/cart test',
    integration: 'pnpm --filter @acme/cart test:integration',
  },
  {
    name: 'apps/checkout',
    unit: 'pnpm --filter @acme/checkout test',
    e2e: 'pnpm --filter @acme/checkout-e2e test',
  },
  {
    name: 'apps/marketing',
    unit: 'pnpm --filter @acme/marketing test',
    e2e: 'pnpm --filter @acme/marketing-e2e test',
  },
];

export function selectCommands(affected: string[]): string[] {
  const set = new Set(affected);
  const cmds: string[] = [];
  for (const t of tasks) {
    if (!set.has(t.name)) continue;
    if (t.unit) cmds.push(t.unit);
    if (t.integration) cmds.push(t.integration);
    if (t.e2e) cmds.push(t.e2e);
  }
  // Optional: if any criticalShared package affected, force checkout e2e
  const criticalHit = tasks.some((t) => t.criticalShared && set.has(t.name));
  if (criticalHit) {
    const checkoutE2E = tasks.find((t) => t.name === 'apps/checkout')?.e2e;
    if (checkoutE2E && !cmds.includes(checkoutE2E)) cmds.push(checkoutE2E);
  }
  return cmds;
}
\`\`\`

| Selection mode | When to use | Risk |
| --- | --- | --- |
| Package unit only | Leaf library change with strong types | May miss integration assumptions |
| Unit + reverse dep units | Shared library change | Good default for libraries |
| Unit + consumer e2e smoke | criticalShared libraries | Higher CI time, higher confidence |
| Full monorepo | Lockfile, CI config, release branches | Expensive but correct for global inputs |
| Manual force list | Incident hotfix, detector bug | Always log and expire |

## End-to-End CLI for CI

\`\`\`ts
// tools/affected/cli.ts
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { loadWorkspacePackages, changedPackages } from './mapFilesToPackages';
import { applyUnmappedPolicy } from './policy';
import { reverseGraph, affectedClosure } from './graph';
import { selectCommands } from './tasks';

function main() {
  const base = process.env.AFFECTED_BASE ?? 'origin/main';
  const files = execSync(\`git diff --name-only \${base}...HEAD\`, { encoding: 'utf8' })
    .split('\\n')
    .filter(Boolean);

  const packages = loadWorkspacePackages(process.cwd());
  const { packages: seeds, unmapped } = changedPackages(files, packages);
  const policy = applyUnmappedPolicy(unmapped);

  const graph = JSON.parse(readFileSync('tools/affected/graph.json', 'utf8')) as Record<
    string,
    string[]
  >;
  const implicit = JSON.parse(
    readFileSync('tools/affected/implicit.json', 'utf8'),
  ) as Record<string, string[]>;

  let affected: string[];
  if (policy === 'all') {
    affected = packages.map((p) => p.name);
  } else {
    let seedList = seeds;
    if (policy === 'schemas') {
      seedList = [...new Set([...seeds, 'packages/api-client'])];
    }
    affected = affectedClosure(seedList, reverseGraph(graph), implicit);
  }

  const commands = selectCommands(affected);
  const plan = { base, files, seeds, unmapped, policy, affected, commands };
  writeFileSync('affected-plan.json', JSON.stringify(plan, null, 2));
  console.log(JSON.stringify(plan, null, 2));
}

main();
\`\`\`

\`\`\`yaml
# .gitlab-ci.yml fragment (illustrative structure)
stages:
  - plan
  - test

affected_plan:
  stage: plan
  script:
    - pnpm exec tsx tools/affected/cli.ts
  artifacts:
    paths:
      - affected-plan.json
    expire_in: 1 week

unit_affected:
  stage: test
  needs: [affected_plan]
  script:
    - node tools/affected/runCommands.mjs --layer unit
  artifacts:
    when: always
    reports:
      junit: reports/junit/*.xml

e2e_affected:
  stage: test
  needs: [affected_plan]
  script:
    - node tools/affected/runCommands.mjs --layer e2e
  artifacts:
    when: always
    reports:
      junit: reports/e2e-junit/*.xml
    paths:
      - playwright-report/
\`\`\`

When many commits land quickly on the same MR, pair selective testing with stale-run cancellation so outdated affected plans do not finish after a newer, more correct plan. For flake visibility across packages, ensure JUnit output is collected consistently so package-level failures stay readable in merge requests.

## Tooling Landscape Without Inventing Flags

Several ecosystems ship first-class affected workflows. Use their documented interfaces rather than reverse-engineering:

- **Nx** documents affected commands based on its project graph and git range inputs.
- **Turborepo** documents filtered execution using package dependency awareness and task pipelines.
- **Bazel** documents query languages for reverse dependencies and test targets.
- **pnpm / yarn workspaces** give you filters by package name; you still need graph logic for dependents unless another tool provides it.

If you already standardized on one tool, prefer its graph over a parallel custom graph that will drift. Custom TypeScript detectors shine when you must combine package edges with non-package nodes (schemas, fixtures, e2e projects).

## Remote Caching and Affected Detection

Selective tests multiply with remote cache hits: unaffected packages skip work entirely; affected packages may still be cache hits if inputs did not change in a way your cache keys see. Align cache inputs with the same graph:

1. Test task inputs should include source, test files, and relevant env files.
2. Avoid over-broad inputs (entire repo hash) that destroy cache usefulness.
3. Avoid under-broad inputs that mark a test cache hit when a dependency package changed but was not listed.

Affected detection decides **whether to schedule** a task. Caching decides **whether to execute** a scheduled task. Both must agree on dependency truth.

## Realistic Failure Mode: Shared Types Change, Apps Skip Tests

**Symptom.** PR updates \`packages/api-types\` with a breaking rename. CI runs unit tests only for \`packages/api-types\` (all green). Checkout app still imports the old name, TypeScript would fail, but app tests never ran because the app folder was untouched. Merge breaks main.

**Diagnosis.**

1. Open \`affected-plan.json\`. If seeds include \`packages/api-types\` but \`apps/checkout\` is missing from \`affected\`, reverse dependency edges are wrong or missing.
2. Inspect \`graph.json\`. Does \`apps/checkout\` list \`packages/api-types\`? If types are imported only via path alias without a package.json dependency, the automatic graph missed it.
3. Check whether the types package is versioned as a publishable package with dependent version pins that were not updated (lockstep monorepo usually uses workspace links; if not, selection may need version bump files as seeds).
4. Confirm CI did not use a shallow clone so empty that git diff was wrong (empty diff -> empty affected -> sometimes a dangerous "success").

**Fixes.**

- Add workspace dependencies or implicit edges for type packages.
- Fail the plan job if seeds are non-empty but affected equals seeds for a known shared library (heuristic guard).
- On lockfile-less monorepos, treat \`packages/*/src/index.ts\` public API changes as criticalShared.
- Make empty diff with a non-docs MR label fail loud (misconfigured base ref).

\`\`\`ts
// tools/affected/guards.ts
export function assertSanePlan(plan: {
  files: string[];
  seeds: string[];
  affected: string[];
  policy: string;
}): void {
  if (plan.files.length > 0 && plan.seeds.length === 0 && plan.policy === 'none') {
    const onlyDocs = plan.files.every(
      (f) => f.startsWith('docs/') || f.endsWith('.md'),
    );
    if (!onlyDocs) {
      throw new Error(
        'Files changed but no package seeds and policy=none; refine mapping or policy',
      );
    }
  }
  if (
    plan.seeds.includes('packages/api-types') &&
    plan.affected.length === plan.seeds.length
  ) {
    throw new Error(
      'api-types changed but no dependents in affected closure; graph likely incomplete',
    );
  }
}
\`\`\`

## E2E Projects as First-Class Graph Nodes

End-to-end suites often live outside app packages (\`e2e/playwright\`). Model them as nodes that depend on the apps they exercise. When either app is affected, e2e is affected. When only a deep leaf CSS package used solely by marketing is affected, checkout e2e should not run.

\`\`\`json
{
  "e2e/playwright-checkout": ["apps/checkout", "apps/api", "ops/fixtures/checkout"],
  "e2e/playwright-admin": ["apps/admin", "apps/api"]
}
\`\`\`

Split monolithic e2e packages when selection is always all-or-nothing. Coarse e2e nodes are why teams believe affected detection "does not work" for UI tests.

## AI Agents in Monorepos: Keep Selection Deterministic

Agents editing five packages in one PR expand the affected set quickly. That is correct. Problems arise when agents:

- Add imports that create new edges without updating package.json dependencies.
- Place shared code in an app package, secretly coupling other apps through relative imports outside the graph.
- Generate tests in the wrong package so unit selection never runs them with the code under test.

**Guardrails.**

1. Lint against relative imports that escape package roots.
2. Require package.json dependency entries for workspace imports.
3. Run \`affected-plan\` locally in a pre-push hook for humans and agents.
4. Print the plan in the PR comment so reviewers see fan-out before merge.

\`\`\`bash
# Example local check
pnpm exec tsx tools/affected/cli.ts
node -e 'const p=require("./affected-plan.json"); console.log(p.affected.join(", "))'
\`\`\`

## Comparing Strategies on a Sample Diff

Suppose the diff touches \`packages/pricing/src/tax.ts\` and \`apps/checkout/src/Summary.tsx\`.

| Strategy | Packages tested | Likely miss | CI time (relative) |
| --- | --- | --- | --- |
| Changed folders only | pricing, checkout | cart integration assumptions | Low |
| Affected closure | pricing, cart, checkout | None if graph complete | Medium |
| Always all units | all packages | None for units | High |
| Always all e2e | all e2e | None for e2e; slow feedback | Very high |
| Affected + criticalShared e2e | closure + checkout e2e | Rare indirect ops fixtures | Medium-high |

For this diff, affected closure plus checkout e2e is the balanced default.

## Main Branch and Release Trains

Selective testing on PRs does not remove the need for wider grids:

1. **Nightly full unit + integration** across the monorepo catches graph drift and flaky path mapping.
2. **Release branch** runs full e2e or a high-value e2e pack even if the last commit was docs, if the branch accumulated product commits.
3. **Post-merge on main** can run an expanded set asynchronously without blocking developers.

Document which pipeline is the source of truth for release confidence. PR green with affected detection is necessary but not always sufficient for production promotion.

## Performance Tips That Do Not Corrupt Safety

1. **Shard by package**, not by random test file only, so junit results still map to ownership.
2. **Build once per package** and reuse artifacts for that package's tests in the same pipeline.
3. **Skip install tricks carefully**; a partial install that omits a dependent package creates false greens.
4. **Cache the graph build** when package.json files are unchanged, but never cache the git file list across commits.
5. **Keep plan jobs cheap** (seconds) so every pipeline can afford them.

## Ownership and Review

Publish a CODEOWNERS-like map from packages to QA and eng owners. When affected fan-out includes packages outside the author's normal scope, require review from those owners or a platform team. Selective CI without selective review still merges surprises.

\`\`\`yaml
# CODEOWNERS excerpt
/packages/pricing/ @payments-eng @qa-payments
/packages/api-types/ @platform-eng @qa-platform
/tools/affected/ @qa-platform @devops
\`\`\`

Changes under \`tools/affected\` are high leverage: a detector bug is a systemic quality bug. Test the detector itself thoroughly (see graph unit tests above) and treat its failures as release blockers.

## Minimal Adoption Path

**Day 1-2.** Export package list and dependency graph to JSON. Map files to packages. Emit plans without enforcing.

**Day 3-4.** Add reverse dependency closure and PR comments. Compare plans to human intuition on 10 historical PRs.

**Day 5-6.** Enforce unit selection from the plan. Keep e2e full-suite temporarily.

**Day 7+.** Split e2e nodes, add implicit edges, enforce e2e selection, add sanity guards for shared packages.

Measure median pipeline duration and escaped cross-package defects before and after. If duration drops but cross-package escapes rise, your graph is incomplete; fix edges before expanding skip policies.

## Putting the Plan in Developer Language

Developers should see something like:

\`\`\`text
Affected plan (base origin/main)
Seeds: packages/pricing
Unmapped: (none)
Policy: none
Affected: apps/checkout, packages/cart, packages/pricing
Commands:
  - pnpm --filter @acme/pricing test
  - pnpm --filter @acme/cart test
  - pnpm --filter @acme/cart test:integration
  - pnpm --filter @acme/checkout test
  - pnpm --filter @acme/checkout-e2e test
\`\`\`

If they cannot predict why a package appears, the model will be bypassed with force flags. Clarity is part of correctness.

When standardizing detector scripts, plan artifacts, and CI fragments across many repositories, ready-made QA skills install from qaskills.sh with the qaskills CLI. Customize graph sources and implicit edges to match each monorepo's real coupling, not a generic template alone.

## Frequently Asked Questions

### Should affected detection replace nightly full builds?

No. Affected detection optimizes PR feedback under a known graph. Nightly or release-wide full grids remain the backstop for graph holes, flaky mapping, and changes that only appear when all packages build together. Think of affected CI as the fast filter and full grids as the periodic truth. If nightlies are chronically red, fix that before expanding how much PRs are allowed to skip; otherwise you only discover systemic breakage hours later.

### How do we handle dependency version bumps in the root lockfile?

Treat lockfile changes as global or near-global seeds unless you can precisely compute which packages' resolved trees changed. Many teams run a broader unit pack on lockfile PRs and full e2e on release. Trying to be too clever with partial lockfile interpretation often under-selects and ships subtle breaks from transitive upgrades. Prefer wider selection on lockfile PRs and invest in cache hits to keep them affordable.

### What if our e2e suite is one package that boots the entire stack?

Then affected detection cannot save much until you split journeys or tag tests by app entry points. Start by splitting Playwright projects per app domain and encoding those projects as separate graph nodes with accurate dependencies. Until then, you can still skip e2e for pure docs and pure leaf packages that are not in the e2e node's dependency set, but any shared API change will correctly force the large suite. The graph is only as granular as your test packaging.

### How do path filters in GitLab or GitHub interact with affected detection?

Host path filters decide whether a pipeline job starts at all. Affected detection decides which packages inside a monorepo pipeline run tests. Using both is fine if they agree: do not path-filter away the plan job that must see the full diff, and do not use coarse path filters that skip security-sensitive packages when shared code changes. Prefer running a lightweight plan job always (except trivial chores), then dynamic child pipelines or matrix jobs based on the plan artifact for heavy tests.
`,
};
