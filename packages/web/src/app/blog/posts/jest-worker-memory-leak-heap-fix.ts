import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest Worker Memory Leak Heap Fix: Measure, Isolate, and Stop OOM Failures',
  description: 'Follow this Jest worker memory leak heap fix to measure retained growth, isolate leaking suites, recycle workers safely, and prevent CI out-of-memory crashes.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Jest Worker Memory Leak Heap Fix: Measure, Isolate, and Stop OOM Failures

The reliable Jest worker memory leak heap fix is a two-part process: first prove whether heap is retained across test files, then remove the owning reference or resource. Run tests serially with Node garbage collection exposed and Jest heap logging enabled, compare growth by file order, and bisect the suspect suites. Lowering worker count or configuring \`workerIdleMemoryLimit\` can keep CI alive, but those controls manage capacity. They do not automatically repair a leaking application singleton, unclosed server, accumulating mock, or oversized module graph.

Memory failures that look identical in CI can have different causes. Parallel workers may each use a stable 500 MB and collectively exceed a 2 GB container. One worker may grow after every test file because a global cache retains objects. A test may finish assertions but leave sockets or timers open. Heap measurement, process resident memory, and open-handle diagnosis answer different questions, so use each tool deliberately.

This guide gives QA and test-automation engineers a reproducible investigation workflow, a set of controlled experiments, concrete Jest and Node commands, safe mitigation settings, and code-level cleanup patterns. The goal is not merely to make the red build green. It is to know why memory increased and leave an evidence trail an AI coding agent or reviewer can verify.

## Classify the failure before changing Jest settings

Start with the exact failure signature and resource boundary. An operating-system kill, a V8 heap limit error, and a suite that never exits are not interchangeable.

| Signal | Most likely pressure | First measurement | Avoid assuming |
|---|---|---|---|
| \`JavaScript heap out of memory\` | V8 managed heap reached its limit | Serial heap log by test file | More RAM is the only solution |
| Process exits with code 137 in Linux CI | Container or host killed the process, often for memory | Container limit and peak RSS | Jest itself printed the cause |
| Many workers show stable but large footprints | Parallel aggregate memory | Compare one worker with several | A single test leaks |
| Heap climbs monotonically in serial mode | References retained across files or runtime issue | Repeated ordered runs and heap snapshots | Worker count alone fixes ownership |
| Tests pass but Jest warns it did not exit | Open timer, socket, server, or other handle | Open-handle diagnostics | Heap retention is necessarily involved |
| One file spikes then drops after collection | High transient allocation | Per-file peak and post-GC heap | Every spike is a leak |

Record the runtime, Jest configuration, test environment, container limit, worker count, and exact command before changing anything. Memory behavior depends on the loaded module graph and execution model. Comparing a local watch run with a CI single run without recording those differences produces weak conclusions.

If your team is reconsidering runner architecture rather than fixing one suite, the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) provides the broader comparison. For this investigation, keep the runner constant so the experiment has one fewer variable.

## Establish a serial heap-growth baseline

Jest documents \`--logHeapUsage\` for logging heap after each test and recommends using it with \`--runInBand\` and Node's \`--expose-gc\`. Serial execution matters because file-to-worker scheduling otherwise obscures the sequence. Exposed collection helps compare retained heap after garbage collection rather than arbitrary points in the allocation cycle.

\`\`\`bash
node --expose-gc ./node_modules/jest/bin/jest.js \\
  --runInBand \\
  --logHeapUsage \\
  --ci
\`\`\`

Use the locally installed Jest entry point so the repository's locked dependency runs. Preserve the same transformation, environment, and setup configuration as CI. Do not enable coverage during the first baseline unless the failure exists only under coverage, because instrumentation changes memory consumption.

Capture at least three observations:

1. Heap after each test file.
2. Total runtime and the last completed file before failure.
3. Process peak memory from the CI platform or operating system, when available.

The heap log is not a perfect leak detector. Garbage collection timing, module caches, just-in-time compilation, and environment teardown affect it. Look for a repeatable slope, not a single high number. If the suite grows from 180 MB to 900 MB in the same general sequence on multiple clean runs, that is actionable. If it oscillates between 300 MB and 500 MB and completes, you may be seeing normal allocation pressure.

Create a small investigation note rather than relying on screenshots:

\`\`\`text
Command: node --expose-gc ./node_modules/jest/bin/jest.js --runInBand --logHeapUsage --ci
Environment: node test environment, coverage disabled, clean process
Run A: 210 MB -> 735 MB, final file orders/export.test.ts
Run B: 205 MB -> 748 MB, final file orders/export.test.ts
Control without export suites: 202 MB -> 318 MB
Conclusion: retained growth is associated with the export test group
\`\`\`

This evidence is far more useful than saying Jest uses too much memory. It gives the next engineer a bounded search space and makes regression verification possible.

## Separate aggregate worker pressure from a true leak

Jest normally uses a worker pool. Every worker loads a test environment, transformers, setup modules, and some portion of the application dependency graph. A large React or server application can consume substantial memory per worker without retaining more after each file. In a resource-limited container, stable workers can still exceed the total allowance.

Run a controlled worker-count matrix with the same selected tests:

\`\`\`bash
npx jest --ci --maxWorkers=1
npx jest --ci --maxWorkers=2
npx jest --ci --maxWorkers=50%
\`\`\`

Jest accepts either a number or a percentage for \`maxWorkers\`. Choose values appropriate to the executor. Do not assume reported CPU count reflects usable memory. A container may expose many cores while its memory limit supports only two heavy workers.

| Result pattern | Interpretation | Next action |
|---|---|---|
| One worker passes with flat heap, four workers are killed | Aggregate parallel footprint | Set a memory-aware worker count and optimize setup/module load |
| One worker grows until failure | Retention within serial process | Bisect files and inspect long-lived references |
| One worker passes, repeated single file grows | Test or imported singleton retains each iteration | Reproduce with focused repetition and clean ownership |
| All counts fail at the same file | File-specific peak or deterministic allocation | Profile that test and reduce fixture size |
| Tests finish at all counts but process hangs | Open resources | Run handle diagnostics and audit teardown |

Reducing \`maxWorkers\` is a valid production setting when it matches the CI memory budget. It is not an embarrassing workaround. The mistake is presenting it as proof that a leak was fixed. Report it as capacity control, then continue investigating if serial retained heap still rises.

Estimate a safe count from observed data, leaving headroom for the Jest coordinator, operating system, reporters, and unpredictable peaks. If a worker typically consumes 420 MB and the container limit is 2 GB, four workers leave almost no room for anything else. Two may be faster in practice because they avoid swapping or forced termination.

## Bisect test files instead of reading the whole codebase

Once serial growth is repeatable, reduce the set. Ask Jest to list the selected tests, preserve that list as investigation evidence, and split it into groups. Run each group in a fresh process. Continue halving the group that reproduces the slope.

\`\`\`bash
npx jest --listTests

node --expose-gc ./node_modules/jest/bin/jest.js \\
  --runInBand \\
  --logHeapUsage \\
  --runTestsByPath test/orders/create.test.ts test/orders/export.test.ts
\`\`\`

\`--runTestsByPath\` avoids treating paths as a pattern and is useful for an explicit subset. Re-run candidate files in different orders. If file B only causes growth after file A, shared setup or imported singleton state is more likely than B alone. If B always causes a large retained increase, inspect B's fixtures, module imports, mocks, and teardown.

An AI coding agent can help with the mechanical bisection, but specify constraints: launch each subset in a new process, record the command and final heap, do not update snapshots, and do not edit production code during measurement. Otherwise the agent can unintentionally change the variable being studied.

| Bisection observation | What it suggests | Verification experiment |
|---|---|---|
| Half A flat, half B grows | Leak owner is likely in B | Split B again |
| Both halves flat, combined grows | Interaction, order, or total cache threshold | Alternate file order and inspect shared setup |
| One file has high steady heap but no repeated growth | Large fixture/module graph | Run file alone and optimize peak |
| Same file grows on repeated cases inside it | Per-test cleanup problem | Run one test name at a time |
| Growth follows environment type | Environment or framework integration | Compare node and intended browser-like environment only if valid |

Do not delete random tests until the run passes. That finds a capacity threshold, not necessarily the retaining reference. Bisection needs fresh processes and recorded heap deltas so the result remains interpretable.

## Audit the references that survive test boundaries

Most application-level leaks are ordinary ownership bugs: something reachable from a long-lived object still points to data that should have died. Test suites add common owners such as global registries, mock call histories, caches, event emitters, fake timers, database clients, browser-like DOMs, and servers.

Consider a metrics collector used by tests:

\`\`\`ts
// src/metrics.ts
type Event = { name: string; payload: unknown };

const events: Event[] = [];

export function record(event: Event): void {
  events.push(event);
}

export function readEvents(): readonly Event[] {
  return events;
}

export function resetEvents(): void {
  events.length = 0;
}
\`\`\`

If every test records multi-megabyte payloads and never calls \`resetEvents\`, the module singleton retains them. Clear it after every test, and verify the cleanup runs even when an assertion fails.

\`\`\`ts
import { afterEach, describe, expect, it } from '@jest/globals';
import { readEvents, record, resetEvents } from '../src/metrics';

afterEach(() => {
  resetEvents();
});

describe('metrics', () => {
  it('records the export result', () => {
    record({ name: 'exported', payload: { rows: 25 } });
    expect(readEvents()).toHaveLength(1);
  });
});
\`\`\`

Cleanup must release references, not merely hide them. Replacing an array export while another closure keeps the old array does not help. Closing a server but keeping thousands of request bodies in a reporter does not help. Follow ownership from the retained object toward a root that stays alive.

Mock history can also retain large argument objects. Jest's mock-clearing and restoration behaviors have distinct purposes. \`clearMocks\` clears mock usage data before each test, \`resetMocks\` also replaces fake implementations, and \`restoreMocks\` restores original implementations for replaceable mocks. Select the behavior your suite needs rather than enabling every switch without understanding semantic impact.

\`\`\`ts
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  clearMocks: true,
  restoreMocks: true,
  testEnvironment: 'node',
};

export default config;
\`\`\`

If a test intentionally inspects calls across cases, it already violates isolation and should be redesigned. For most suites, each case should create the mock state it asserts.

## Close resources and distinguish handles from heap

Open handles commonly come from HTTP servers, database clients, message consumers, sockets, file watchers, and timers. They can prevent exit and sometimes retain object graphs, but the diagnostic signal is liveness, not simply heap size. Jest's \`--detectOpenHandles\` option is for debugging and has a significant performance cost. It implies serial execution, so do not make it the normal CI command unless the team has a specific reason.

\`\`\`bash
npx jest --detectOpenHandles --runTestsByPath test/integration/orders.test.ts
\`\`\`

Use lifecycle ownership that is visible in the test:

\`\`\`ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { Server } from 'node:http';
import { createAppServer } from '../src/server';

describe('order API', () => {
  let server: Server;

  beforeAll(async () => {
    server = await createAppServer();
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it('returns a created order', async () => {
    const response = await callOrderEndpoint(server);
    expect(response.status).toBe(201);
  });
});
\`\`\`

The resource is created once for the suite and closed after it. Per-test ownership can be safer when tests mutate server state. The key is symmetry: the same scope that acquires a resource releases it and awaits completion.

What people get wrong is adding \`--forceExit\` as the fix. Forced exit may conceal a teardown defect and can terminate pending work. Use handle detection to identify why normal shutdown fails. Treat forceful termination as a separately justified operational choice, not a memory repair.

## Inspect heavy setup, barrels, and test environments

A suite can consume excessive memory without one obvious leak because every file imports much more code than it exercises. Global setup modules, broad barrel exports, auto-mocking, source maps, and browser-like environments add to each worker footprint.

Trace imports from the suspect test. A barrel such as \`import { createOrder } from '../src'\` can load unrelated feature modules if the root index eagerly re-exports them. Importing the focused module may reduce transform and module-graph cost while making the dependency under test explicit.

Compare these forms:

\`\`\`ts
// Broad entry point, may evaluate many exports.
import { createOrder } from '../src';

// Focused test dependency.
import { createOrder } from '../src/orders/create-order';
\`\`\`

Do not mechanically rewrite public-consumer tests that intentionally verify the package entry point. Split responsibilities: a small contract test can import the public surface, while detailed unit suites can use focused modules.

Likewise, use the \`node\` environment for server logic that does not need DOM APIs. A browser-like environment is appropriate for components and web behavior, but loading it into thousands of pure utility tests wastes memory. Configure environment by project or supported per-file mechanisms according to your repository's Jest setup rather than inventing a custom flag.

| Source of baseline weight | How to confirm | Safer change |
|---|---|---|
| Root barrel import | Compare module graph or focused import run | Import implementation in unit tests, retain entry-point contract test |
| Heavy setup file | Temporarily select a minimal test project | Split setup by test responsibility |
| DOM environment for server tests | Compare intended node project | Assign environment based on actual APIs needed |
| Giant JSON fixture | Measure file alone and object lifetime | Generate minimal scenario data |
| Coverage transformation | Compare equivalent run without coverage | Separate diagnosis, then optimize covered CI job |
| Source-map-rich errors retained in custom reporter | Disable reporter in a controlled run | Store concise result, release full errors after reporting |

Large fixtures deserve special attention. A 50 MB JSON document may become several larger in-memory structures after parsing, cloning, transformation, and mock call recording. Reduce it to the fields needed by the scenario. If fidelity requires the large file, isolate that test and avoid concurrent copies.

## Use worker recycling as a bounded safety valve

Jest's \`workerIdleMemoryLimit\` configuration checks worker memory after a test and restarts a worker when it exceeds the configured threshold. The setting accepts fixed byte values, unit strings, or percentage forms as documented by Jest. Fixed units are often easier to reason about in containers because host memory reporting may not match the container allowance.

\`\`\`ts
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  maxWorkers: 2,
  workerIdleMemoryLimit: '512MB',
  testEnvironment: 'node',
};

export default config;
\`\`\`

Treat \`512MB\` as an example that must be derived from observation, not a universal recommendation. A worker needs enough room for normal peak behavior. If the limit is below healthy steady usage, repeated restarts add large performance costs and can make failures less legible. If it is nearly the container limit, it offers little protection.

Use this decision matrix:

| Condition | Worker limit decision | Reason |
|---|---|---|
| Known runtime retention issue cannot be upgraded immediately | Consider a measured fixed limit | Recycling bounds growth while root work continues |
| Stable large workers exceed aggregate CI memory | Reduce worker count first | Recycling does not reduce simultaneous healthy footprints |
| One test alone needs more than the limit | Do not set the limit below its valid peak | Worker will churn after legitimate work |
| Percentage memory is unreliable in the executor | Prefer a fixed unit | Host-reported total may not represent container capacity |
| Leak is in coordinator or reporter | Worker recycling may not help | The retaining process is outside the recycled worker |

After enabling recycling, rerun the exact failing CI shard and compare peak memory, duration, and restart-related behavior. Keep the code-level leak ticket open if retained growth remains demonstrable. A safety valve is successful when it creates headroom without disguising ownership.

## Verify the fix with a repeatable memory budget

A code change is not verified by one passing run. Use the original reproduction command, the same test ordering or explicit file set, and multiple clean processes. Compare start heap, final heap, maximum observed heap, runtime, and exit behavior.

\`\`\`yaml
# .github/workflows/test.yml excerpt
- name: Run memory-sensitive Jest suite
  run: node --expose-gc ./node_modules/jest/bin/jest.js --runInBand --logHeapUsage --ci
\`\`\`

Do not necessarily keep verbose heap logging in every permanent build. It can be a temporary diagnostic job or a scheduled check. The lasting controls might be an appropriate worker count, isolated project configuration, fixture limits, and regression tests for cleanup.

A good verification note looks like this:

| Measure | Before | After | Interpretation |
|---|---:|---:|---|
| Serial start heap | 205 MB | 208 MB | Comparable baseline |
| Serial final heap | 748 MB | 292 MB | Retained slope removed |
| Peak CI process memory | 1.94 GB | 1.21 GB | Adequate container headroom |
| Runtime | 11m 10s | 9m 45s | Cleanup did not impose a penalty |
| Normal exit | Warning after tests | Clean | Resource ownership corrected |

Use repository measurements, not these example numbers, in an actual report. If the final heap is lower but runtime doubled due to constant worker recycling, the system is stable but not yet healthy. If the test exits cleanly but peak RSS remains near the limit, open-handle cleanup solved only one dimension.

UI end-to-end failures can produce their own browser memory patterns, which should not be diagnosed as Jest workers. If a codebase also runs Playwright, keep its selection and page-lifecycle practices separate; the [Playwright locator practices guide](/blog/playwright-best-practices-locators-2026) is relevant to test stability, while this workflow stays focused on Jest process memory.

## Frequently Asked Questions

### Is lowering maxWorkers a real Jest memory fix?

It is a real fix for aggregate memory pressure when several healthy workers collectively exceed the executor limit. It is not proof that retained heap growth inside a worker disappeared. Run a serial heap baseline first. If one worker stays roughly flat, choose a worker count that leaves headroom and call the problem capacity planning. If one worker grows consistently across files, lower parallelism may delay failure, but the retaining reference, cache, resource, or runtime behavior still needs investigation.

### What is the difference between logHeapUsage and detectOpenHandles?

\`--logHeapUsage\` reports heap usage after tests and is useful for finding retained growth, especially with serial execution and exposed garbage collection. \`--detectOpenHandles\` tries to identify resources that keep Jest from exiting, such as servers, sockets, or timers, and carries a performance cost. A handle can retain memory, but the tools answer different questions. Use heap logging for a memory slope and handle detection for shutdown problems, then connect the evidence only when the same resource explains both.

### When should I configure workerIdleMemoryLimit?

Configure it when measured worker growth needs a bounded operational safety valve, or when a known issue cannot be removed immediately. Pick a limit above normal worker peaks and below the point that threatens the CI container. Fixed units are easier to reason about when container and host memory reporting differ. Measure runtime as well as peak memory because overly low limits cause frequent restarts. Keep investigating the root cause if serial heap continues to rise; recycling contains the symptom but does not establish correct object ownership.

### How can an AI agent investigate a Jest heap leak safely?

Give it a fixed command, an explicit test list, and permission for read-only measurement before edits. Require fresh processes, recorded heap values, and bisection by file. Ask it to separate serial retained growth, aggregate worker pressure, and open handles. Once it identifies a narrow owner, let it propose one cleanup change and rerun the original reproduction. Do not let it add forceful exit, raise Node memory blindly, delete tests, or change test order merely to obtain green output without explaining the measured cause.
`,
};
