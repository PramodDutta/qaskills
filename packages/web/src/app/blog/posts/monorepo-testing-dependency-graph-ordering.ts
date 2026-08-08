import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Monorepo Testing Dependency Graph Ordering That Stays Correct in CI',
  description: 'Apply monorepo testing dependency graph ordering to run builds, contracts, integration tests, and dependents safely while keeping CI fast and debuggable.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Monorepo Testing Dependency Graph Ordering That Stays Correct in CI

Monorepo testing dependency graph ordering means scheduling validation from declared relationships, not from directory names or a hand-written list. Build and test the prerequisites of a package before tasks that consume their outputs, while allowing unrelated branches of the graph to run concurrently. For changed code, include the changed packages, the prerequisites required to execute them, and the affected dependents whose behavior may have changed.

The practical rule is simple: order tasks by artifacts and contracts. If \`web\` imports \`ui\`, and \`ui\` consumes generated types from \`contracts\`, then \`contracts:generate\` must finish before \`ui:test\`, and relevant \`ui\` validation must finish before a packaged \`web\` integration test that reads its build output. But \`billing-service:test\` can run at the same time if it belongs to another ready branch. A directed acyclic graph provides that safety and concurrency.

The hard part is not topological sorting. It is building an honest graph. This article shows how to model package and task edges, distinguish dependencies from dependents, select tests after a Git change, manage generated artifacts and services, diagnose nondeterministic ordering failures, and give AI coding agents enough constraints to update a monorepo without making CI accidentally serial.

## Start With Deliverables, Not Workspace Folders

A workspace manifest tells you that packages exist and often which packages depend on one another. It does not fully describe the test pipeline. Tests may consume compiled JavaScript, generated clients, database schemas, browser applications, or a running service. Each of those is a deliverable with a producer and one or more consumers.

Model two related graphs:

| Graph | Node example | Edge meaning |
|---|---|---|
| Package graph | \`web\`, \`ui\`, \`contracts\` | Package A declares a dependency on package B |
| Task graph | \`ui:build\`, \`web:test:e2e\` | Task A requires task B’s successful output |

Package edges are a useful default, but task edges are what make execution correct. A package’s lint task rarely needs dependencies to be built. Its integration test might. If every task blindly follows every package dependency, the result is safe-looking over-serialization and slow feedback.

Consider this illustrative repository:

\`\`\`text
apps/
  admin-web/
  customer-web/
  billing-service/
packages/
  contracts/
  ui/
  auth-client/
  test-fixtures/
\`\`\`

The declared relationships might be:

- \`admin-web -> ui, auth-client\`
- \`customer-web -> ui, auth-client\`
- \`auth-client -> contracts\`
- \`billing-service -> contracts, test-fixtures\`

Arrow notation here means “depends on.” For execution, the prerequisite travels in the opposite reading direction: \`contracts\` becomes ready before \`auth-client\`, then applications become ready after \`auth-client\` and \`ui\`.

Use one arrow convention in documentation and code. Teams frequently say “downstream” to mean both dependencies and consumers, which produces wrong selection. Prefer the unambiguous words prerequisites and affected dependents.

## Turn Implicit Coupling Into Explicit Task Edges

Inventory what each test reads before it begins. If a test reaches into another package’s \`dist\` folder, waits for a service port, reads generated OpenAPI types, or assumes a migrated database, that is a graph edge even when no package manifest declares it.

| Consumer task | Required predecessor | Artifact or state |
|---|---|---|
| \`auth-client:test\` | \`contracts:generate\` | Generated TypeScript client types |
| \`admin-web:test:e2e\` | \`admin-web:build\` | Deployable browser assets |
| \`admin-web:test:e2e\` | \`billing-service:start-test\` | Reachable test API |
| \`billing-service:test:integration\` | \`database:migrate-test\` | Isolated schema at expected revision |
| \`ui:test\` | none | Source transformed by the runner |
| \`ui:typecheck\` | \`contracts:generate\` | Imported declaration files |

Write the smallest correct predecessor set. Linting source does not need a database. Unit tests that mock the API do not need a service. This is how dependency-aware ordering creates parallelism instead of erasing it.

A repository-owned task definition can be plain data. The following TypeScript is runnable under a TypeScript execution environment and makes dependencies auditable:

\`\`\`ts
export type Task = {
  id: string;
  command: string;
  needs: string[];
};

export const tasks: Task[] = [
  { id: 'contracts:generate', command: 'npm run generate -w @acme/contracts', needs: [] },
  { id: 'ui:test', command: 'npm test -w @acme/ui', needs: [] },
  {
    id: 'auth-client:test',
    command: 'npm test -w @acme/auth-client',
    needs: ['contracts:generate'],
  },
  {
    id: 'admin-web:build',
    command: 'npm run build -w @acme/admin-web',
    needs: ['auth-client:test', 'ui:test'],
  },
];
\`\`\`

The npm workspace commands above rely on each workspace name existing in its package manifest. Substitute your real names and scripts. The key idea is the explicit \`needs\` list, not a universal script taxonomy.

## Validate the Graph Before Trusting the Scheduler

A cycle makes a topological order impossible. Package managers usually prevent direct dependency cycles poorly or merely tolerate them through installation semantics, while task graphs can create subtler loops. For example, \`contracts:generate\` starts the service to download a schema, but \`service:build\` needs the generated contract. Neither can begin.

Validate three invariants before execution:

1. Every referenced predecessor exists.
2. No task depends on itself, directly or transitively.
3. Every artifact has a clear producer, or is declared as an external precondition.

This complete Node script validates references and returns topological batches. Tasks within a batch can run concurrently:

\`\`\`js
export function topologicalBatches(tasks) {
  const byId = new Map(tasks.map(task => [task.id, task]));
  if (byId.size !== tasks.length) throw new Error('Task ids must be unique');

  for (const task of tasks) {
    for (const dependency of task.needs) {
      if (!byId.has(dependency)) {
        throw new Error(\`\${task.id} needs unknown task \${dependency}\`);
      }
    }
  }

  const completed = new Set();
  const remaining = new Set(byId.keys());
  const batches = [];

  while (remaining.size > 0) {
    const ready = [...remaining].filter(id =>
      byId.get(id).needs.every(dependency => completed.has(dependency)),
    );
    if (ready.length === 0) {
      throw new Error(\`Cycle detected among: \${[...remaining].sort().join(', ')}\`);
    }
    ready.sort();
    batches.push(ready);
    for (const id of ready) {
      remaining.delete(id);
      completed.add(id);
    }
  }
  return batches;
}

const example = [
  { id: 'contracts:generate', needs: [] },
  { id: 'ui:test', needs: [] },
  { id: 'auth:test', needs: ['contracts:generate'] },
  { id: 'web:test', needs: ['auth:test', 'ui:test'] },
];
console.log(topologicalBatches(example));
\`\`\`

The output is three levels: contract generation and UI tests, then auth tests, then web tests. Alphabetical sorting inside a batch makes logs and plans deterministic; it does not impose sequential execution.

Add unit tests for the scheduler itself. Vitest uses \`-t\` or \`--testNamePattern\` when selecting tests by name, but ordinary file execution needs no name filter:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { topologicalBatches } from './topological-batches.js';

describe('topologicalBatches', () => {
  it('places prerequisites before consumers', () => {
    const result = topologicalBatches([
      { id: 'web', needs: ['ui'] },
      { id: 'ui', needs: ['contracts'] },
      { id: 'contracts', needs: [] },
    ]);
    expect(result).toEqual([['contracts'], ['ui'], ['web']]);
  });

  it('rejects a cycle with the blocked task names', () => {
    expect(() => topologicalBatches([
      { id: 'a', needs: ['b'] },
      { id: 'b', needs: ['a'] },
    ])).toThrow(/Cycle detected among: a, b/);
  });
});
\`\`\`

Graph validation should fail before expensive jobs start. A two-minute structural check is better than a 30-minute pipeline that ends with a task waiting forever.

## Compute the Correct Impact Set From a Change

Ordering answers “what runs first?” Test selection answers “what runs at all?” A change in \`ui\` can affect both web applications. A change in \`admin-web\` generally should not trigger \`customer-web\`. A change in \`contracts\` may affect the client, service, and all consumers.

Define two traversals:

- Prerequisite closure: everything selected tasks need to execute.
- Dependent closure: everything whose behavior might change because a changed package feeds it.

For a source change, start with directly changed packages, traverse affected dependents, map packages to relevant tasks, then add prerequisites for those tasks. For a test-only change, the affected scope may be narrower. For a root configuration change, selecting the entire repository can be the honest choice.

| Changed path | Direct owner | Dependent expansion | Additional prerequisites |
|---|---|---|---|
| \`packages/ui/src/button.tsx\` | \`ui\` | Both web apps | Their build and fixture tasks |
| \`apps/admin-web/tests/login.spec.ts\` | \`admin-web\` tests | Usually admin test target only | Admin app and auth fixtures |
| \`packages/contracts/schema.yaml\` | \`contracts\` | Client, service, both web apps | Generation before typecheck/build |
| Root lockfile | Repository | Conservatively all packages | Normal graph ordering |
| Documentation file | Documentation | None, unless docs are tested | Documentation checks only |

Here is a small dependent-closure function. Its input map uses dependency -> direct consumers, which avoids reversing edges during traversal:

\`\`\`ts
export function affectedDependents(
  changed: Iterable<string>,
  consumersByDependency: Map<string, string[]>,
): Set<string> {
  const affected = new Set(changed);
  const queue = [...affected];

  while (queue.length > 0) {
    const dependency = queue.shift();
    if (dependency === undefined) break;
    for (const consumer of consumersByDependency.get(dependency) ?? []) {
      if (affected.has(consumer)) continue;
      affected.add(consumer);
      queue.push(consumer);
    }
  }
  return affected;
}

const graph = new Map([
  ['contracts', ['auth-client', 'billing-service']],
  ['auth-client', ['admin-web', 'customer-web']],
  ['ui', ['admin-web', 'customer-web']],
]);

console.log([...affectedDependents(['contracts'], graph)].sort());
\`\`\`

Do not derive package ownership with naive substring matching. A path such as \`packages/ui-icons\` must not be assigned to \`packages/ui\`. Resolve normalized repository-relative paths against declared workspace roots, choosing exact directory boundaries.

For a deeper design of path-to-test mapping, use [CI test selection by Git diff](/blog/ci-test-selection-by-git-diff). Diff selection and graph expansion are complementary: the diff finds the seed, and the graph calculates the blast radius.

## Keep Build Order and Test Order Distinct

“Dependencies first” is not a sufficient test policy. It can mean at least four different things:

- Build prerequisite packages before compiling a consumer.
- Run prerequisite unit tests before consumer tests.
- Make consumer tests read prerequisite build output.
- Block all consumer work if any prerequisite validation fails.

Only the first and third are universally tied to artifacts. Whether a consumer’s unit tests must wait for dependency unit tests is a policy decision. If both read source and produce independent evidence, they can run concurrently. If publishing is the goal, the release gate can require both without forcing one to wait for the other.

A better task graph uses artifact edges and a separate final gate:

\`\`\`text
contracts:generate -> auth-client:typecheck -> admin-web:build -> admin-web:e2e
contracts:test -----------------------------------------------> release-gate
ui:test -----------------------------------------------------> release-gate
admin-web:e2e -----------------------------------------------> release-gate
\`\`\`

This arrangement starts tests as soon as their actual inputs exist. The release gate collects results rather than manufacturing dependencies between unrelated checks.

Beware of package-level commands that hide internal ordering. A single \`npm test\` script might build, migrate, start a service, execute tests, and tear down. The graph sees one opaque node, so it cannot share the build or run unrelated work during migration. Split commands where artifacts have independent lifecycles, but do not fragment them so finely that startup overhead dominates.

## Handle Generated Code Without Dirty-Tree Mysteries

Generated clients and schemas frequently cause false ordering failures. One job generates into the source tree, another reads it, and a third checks that Git is clean. When jobs share a workspace, their timing changes the outcome.

Choose one ownership model:

| Model | Repository policy | CI implication |
|---|---|---|
| Generated files committed | Source and generated result change together | Regenerate and fail on a diff |
| Generated files ephemeral | Only source specification is committed | Generate before every consumer |
| Generated artifact published | Producer creates a versioned package/artifact | Consumers fetch the exact graph-selected version |

For committed generation, this POSIX shell check makes drift explicit:

\`\`\`bash
set -eu
npm run generate -w @acme/contracts
if [ -n "$(git status --porcelain -- packages/contracts/generated)" ]; then
  git diff -- packages/contracts/generated
  echo "Generated contract files are out of date" >&2
  exit 1
fi
\`\`\`

Do not run that command concurrently with tests reading the same generated directory. Either declare the generation task as their predecessor or give each task an isolated checkout. A cache must include every input that affects generation: specification content, generator configuration, generator version, relevant environment, and lockfile state.

The same reasoning applies to compiled \`dist\` folders. If multiple packages write to a shared root output directory, task boundaries are not isolated. Prefer package-owned output paths or immutable artifacts copied into consumers.

## Schedule Ready Tasks With Bounded Parallelism

Topological batches expose concurrency, but launching an unlimited batch can exhaust CPU, memory, ports, or database capacity. Resource constraints form a second scheduling dimension.

Annotate heavy task classes and cap them independently. Four unit-test workers might coexist, while only one browser application build fits in memory. Integration tests may need separate database schemas even if the machine can run several.

| Resource | Collision example | Mitigation |
|---|---|---|
| TCP port | Two services bind to 4173 | Allocate per-worker ports and pass explicit URLs |
| Database schema | Tests truncate each other’s rows | Use per-run schema or database names |
| Output directory | Parallel builds delete shared files | Use package-specific build directories |
| CPU | Every runner creates its own worker pool | Coordinate graph and test-runner concurrency |
| Memory | Browser builds peak simultaneously | Limit that task class |

CI matrices add another wrinkle. Splitting topological levels into separate jobs works only if later jobs receive artifacts from predecessor jobs. A successful build in one clean runner does not magically populate \`dist\` in another. Upload the artifact, download it in the consumer, and verify its commit identity, or rebuild deterministically.

If a new commit supersedes the current pipeline, [cancel stale end-to-end runs on a new commit](/blog/ci-cancel-stale-e2e-runs-on-new-commit) to release scarce browser and environment capacity. Cancellation should target superseded work, while artifact and teardown rules ensure a stopped run does not leave a shared environment contaminated.

## Diagnose the Test That Passes Alone and Fails in the Graph

A realistic incident looks like this: \`admin-web:e2e\` passes when run manually, but fails intermittently in the graph with “connection refused” or stale UI assets. Retrying often passes. The first suspicion is test flakiness, but the failure is ordering and readiness.

Investigate the consumed state:

1. Print the resolved task plan, including predecessor completion times and artifact identifiers.
2. Confirm that the app-start task waits for readiness, not merely for the process to spawn.
3. Verify the test’s base URL includes its assigned port and cannot fall back to a developer default.
4. Check whether the web server serves the current commit’s build output.
5. Look for another job deleting or overwriting the output directory.
6. Reproduce with graph-level concurrency, not just the single test command.

A portable readiness probe can use Node’s built-in fetch and a bounded deadline:

\`\`\`js
const url = process.argv[2];
if (!url) throw new Error('Usage: node wait-for-url.mjs http://127.0.0.1:4173/health');

const deadline = Date.now() + 30_000;
let lastError = 'no response';

while (Date.now() < deadline) {
  try {
    const response = await fetch(url);
    if (response.ok) process.exit(0);
    lastError = \`HTTP \${response.status}\`;
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
  }
  await new Promise(resolve => setTimeout(resolve, 500));
}

throw new Error(\`Service not ready at \${url}: \${lastError}\`);
\`\`\`

The health endpoint should verify the dependencies required by the test, not return success before routes, migrations, or configuration are ready. Conversely, do not require unrelated external systems that make local testing impossible.

If stale assets are the cause, add the commit SHA to build metadata and assert it through a test-only endpoint or HTML meta tag. This turns “wrong version” from a guess into a direct failure.

## What People Get Wrong About Topological Execution

The first misconception is that topological order produces one list. A graph usually produces many valid orders. The useful output is a set of ready nodes at each moment, constrained by artifacts and resources. Forcing a single global list discards safe concurrency.

The second is that every dependency edge must become a test dependency. Package A importing package B means A’s build needs B’s consumable form. It does not necessarily mean A’s unit tests must wait until every B test passes. Both results may be required at the final gate without being sequential.

The third is trusting the manifest as the entire graph. Environment provisioning, generated files, container images, shared fixtures, and deployed applications often sit outside workspace dependencies. These implicit edges explain many “flaky” monorepo tests.

Finally, graph selection is not a proof that skipped tests are irrelevant. Dynamic imports, runtime plugin registration, configuration files, code generation, and reflection can hide relationships from static analysis. Establish conservative fallbacks for root files and unknown ownership, and run the full suite on a schedule or before release.

## Give AI Agents a Graph-Aware Change Protocol

An agent modifying a monorepo needs more than “run relevant tests.” Provide an operational contract:

- List changed workspace roots and root-level files.
- Identify direct package dependencies from manifests.
- Identify non-package task prerequisites from the task configuration.
- Calculate affected dependents for production-code changes.
- Add execution prerequisites without serializing unrelated validation.
- Print the selected tasks and reason for each.
- Run graph validation before commands.
- Preserve per-task logs and artifact identifiers.
- Escalate unknown ownership rather than silently skipping it.

Require the agent to explain each new edge in artifact terms: “web:e2e needs web:build because it serves that output” is reviewable. “Tests need builds first” is too broad. When an agent adds a dependency, ask whether a missing isolated fixture or direct source transform could remove it. Graph edges are architecture, not merely CI syntax.

## Make the Execution Plan Explain Itself

A dependency-aware pipeline is difficult to trust when it prints only command output. Before running tasks, emit a machine-readable plan containing the changed paths, directly owned packages, dependent expansion, selected tasks, predecessor edges, cache decisions, and resource class. Preserve that plan with the test reports. When a developer asks why a slow browser suite ran, the answer should be visible without reverse-engineering several configuration files.

For each skipped package, the planner should also know the reason. “Not selected because no changed owner or affected dependency reaches this package” is meaningful. Silence is not. If a changed file cannot be assigned, label it unknown and apply the conservative fallback. This protects newly added workspace folders that have not yet been registered in the ownership map.

Stable task identifiers improve history. Use logical names that do not include ephemeral runner numbers, then record the commit and shard separately. This lets dashboards compare duration and pass rate over time. When a package is renamed, carry an explicit migration in reporting or accept the break in history consciously.

Plan explainability is particularly important with caches. A cache hit should show the input digest or at least the categories of inputs used, the producing commit or artifact identity, and whether output restoration succeeded. “Cached” without provenance cannot distinguish correct reuse from a stale-output defect. Never mark a task successful merely because a cache lookup returned metadata; validate that required files arrived and match the expected task format.

## Account for Failure Propagation and Useful Partial Results

When a prerequisite fails, its true consumers cannot run correctly. Mark them blocked by that predecessor rather than failed tests. Independent ready branches should usually continue, because their results help reviewers and avoid wasting a later rerun. A release gate can still fail as soon as the required result set becomes impossible.

This distinction improves diagnosis. If contract generation fails, an auth-client typecheck is blocked, not evidence that the client source contains a type error. Meanwhile, UI unit tests can complete and provide useful feedback. Reports should separate passed, failed, blocked, canceled, and cached tasks.

Fail-fast policy belongs at the resource and goal level. On a pull request, continuing independent five-minute checks after a fast lint failure may be worthwhile. During an expensive deployment validation, a known invalid build might justify canceling all consumers immediately. Encode the policy rather than letting shell process behavior decide accidentally.

Cleanup tasks need special semantics. Database teardown and server termination must run even when tests fail or the job receives a cancellation signal, within the limits of the CI platform. They are not ordinary successors that require a successful predecessor. Model them as finalizers attached to resources, or isolate resources so that expiry and unique naming make abandoned state harmless.

Retries should preserve graph context. Retrying only a failed consumer against a different dependency artifact can create a pass that does not explain the original failure. Retain or reproduce the exact predecessor outputs, environment identifiers, and seed. If the retry rebuilds prerequisites, report that fact and classify a changed outcome as nondeterminism requiring investigation.

## Evolve Graph Rules With Architecture Changes

Monorepo graphs drift. A new code generator, shared test fixture, runtime plugin, or deployment step introduces relationships that package manifests cannot express. Add graph review to architecture changes: every new produced artifact should name its owner, consumers, cache inputs, and cleanup model.

Watch for graph smells. A package depended on by almost every application creates a wide test blast radius and may need a more stable contract or narrower packages. A task with dozens of predecessors may be an opaque system test that needs a dedicated environment boundary. A long chain reduces parallelism and increases the chance that a low-level transient failure blocks all feedback.

Measure critical-path duration, ready-task wait time, cache effectiveness, and blocked-task counts. Total CI duration alone cannot tell whether the graph is correct. A faster run caused by failing to select dependents is a regression. A slightly longer run that exposes previously implicit generated-code work may be an accuracy improvement before later optimization.

Periodically compare affected selection with a full run. If the full scheduled suite finds failures in packages the pull-request graph skipped, treat the incident as missing dependency data. Add the relationship or broaden the fallback, then create a regression fixture for the selector. Test selection is production code for the delivery system and deserves its own change history and tests.

## Frequently Asked Questions

### Should all dependency tests finish before dependent tests start?

Only when the dependent test consumes their output or your policy deliberately uses fail-fast sequencing. A consumer build may require a dependency build, but two unit-test suites can often run concurrently and report to the same final gate. Model artifact requirements separately from release requirements. This preserves correctness while exposing parallel work, and it prevents a slow prerequisite suite from delaying unrelated diagnostic feedback.

### How should a monorepo handle dependency cycles?

Fail graph validation and resolve the design instead of choosing an arbitrary order. A package cycle often signals misplaced shared types or responsibilities. A task cycle may reveal generation that depends on a service which itself depends on generated output. Break the loop by defining a stable source contract, extracting a lower-level package, checking in a bootstrap artifact, or separating build-time and runtime responsibilities. Document the architectural fix so the cycle does not return under a different task name.

### When must a changed package trigger tests in its dependents?

Trigger affected dependents when production exports, behavior, generated contracts, build configuration, or runtime assets can alter what consumers receive. A test-only or documentation-only change can use a narrower rule if ownership is reliable. Changes to shared root configuration and lockfiles deserve conservative expansion. The selection system should print why each dependent was included, and unknown paths should fall back to broader testing rather than disappearing from the plan.

### Can caching replace dependency ordering?

No. A cache can avoid recomputing a task whose complete inputs and environment match, but the consumer still needs the correct predecessor result. Ordering determines which artifact version is valid and available; caching determines whether producing it requires execution. A cache key that omits generator versions, environment-sensitive configuration, or dependency outputs can make the pipeline fast and wrong. Validate artifact identity and treat cache misses as normal graph execution, not exceptional behavior.
`,
};
