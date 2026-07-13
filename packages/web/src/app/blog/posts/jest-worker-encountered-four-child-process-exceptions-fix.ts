import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest Worker Encountered Four Child-Process Exceptions Fix',
  description:
    'Diagnose Jest worker child-process exceptions by exposing the first crash, separating resource exhaustion from test bugs, and tuning concurrency safely.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Jest Worker Encountered Four Child-Process Exceptions Fix

Four crashes are usually one crash repeated. Jest sends a test file to a child process, that worker exits unexpectedly, and \`jest-worker\` retries the job in another process until its retry limit is exhausted. The final message reports repeated child-process exceptions, but the actionable error often appeared earlier in the output or was lost with the dead worker.

Treat the message as a scheduler report, not a root cause. Your investigation needs to answer two questions: what terminated the first worker, and why did retrying the same work reproduce it? Common answers include an unhandled rejection, explicit \`process.exit\`, native crashes, out-of-memory termination, excessive parallel resource use, and code that behaves differently outside the main process.

## Make the original failure visible with one process

The highest-value first run is the exact failing test file with \`--runInBand\`. Jest then executes tests serially in the main process instead of farming files to its worker pool.

\`\`\`bash
npx jest path/to/failing.test.js --runInBand --verbose
\`\`\`

This is a diagnostic change, not automatically the final fix. It removes worker retries and interleaved output, often exposing the exception and stack that caused termination. If the test passes in band, you have learned that concurrency, process isolation, or worker-specific state is involved.

Capture the complete log from the first error onward. CI interfaces sometimes show only the final lines. Download the raw job log or disable aggressive log folding before concluding that Jest supplied no cause.

The result of the serial run narrows the search:

| Serial result | Strong implication | Next experiment |
|---|---|---|
| Same JavaScript stack appears | Deterministic test or application defect | Fix the earliest thrown error |
| Process exits with heap message | Per-process memory exhaustion | Measure heap, reduce retained data, inspect transforms |
| Passes consistently | Parallel collision or aggregate resource pressure | Reintroduce a small worker count |
| Hangs rather than crashes | Unclosed async work or deadlock | Inspect handles and teardown |
| Native fatal output remains | Addon, runtime, or platform failure | Minimize native dependency path |

Do not start by increasing retry counts. Retrying a deterministic process crash increases time and hides the first failure behind scheduler noise.

## Distinguish a failed assertion from a dead worker

Ordinary expectation failures do not kill Jest workers. The worker reports the assertion to the parent process and continues according to Jest's test scheduling. A child-process exception indicates that the process could not report a normal test result.

Termination paths include:

- production or test code calls \`process.exit()\`;
- an unhandled error reaches a fatal runtime path;
- the operating system kills the process because the container exceeds memory;
- V8 aborts after reaching its heap limit;
- a native addon segfaults or aborts;
- the process is killed by a signal from a script, timeout wrapper, or supervisor;
- worker bootstrap fails before the test environment is ready.

Search for explicit exits first:

\`\`\`bash
rg "process\\.exit|process\\.abort|SIGKILL|SIGTERM" src test tests scripts
\`\`\`

A command-line application's production code may legitimately decide to terminate. Make that decision testable by returning an exit code from the command function and keeping the actual \`process.exitCode\` assignment in a thin entry point.

\`\`\`js
// command.js
export async function runCommand(args, io) {
  if (!args.includes('--config')) {
    io.stderr.write('missing --config\n');
    return 2;
  }
  return 0;
}

// cli.js
import { runCommand } from './command.js';

process.exitCode = await runCommand(process.argv.slice(2), process);
\`\`\`

The test can now assert \`await runCommand(...)\` returns \`2\` without terminating its worker. Setting \`process.exitCode\` lets normal cleanup run, whereas calling \`process.exit()\` forces immediate termination and can truncate buffered output.

## Find asynchronous errors that escape the test lifecycle

A promise created without returning or awaiting it can reject after Jest considers the test complete. Depending on Node behavior and surrounding handlers, the failure may appear as an unhandled rejection, contaminate the next test, or terminate the worker.

This test is wrong:

\`\`\`js
test('stores the audit event', () => {
  auditService.store({ action: 'login' }).then((result) => {
    expect(result.id).toBeDefined();
  });
});
\`\`\`

Jest sees the synchronous test function return \`undefined\`. The assertion runs later, outside the test's owned promise. Return or await the chain:

\`\`\`js
test('stores the audit event', async () => {
  const result = await auditService.store({ action: 'login' });
  expect(result.id).toBeDefined();
});

test('propagates storage rejection', async () => {
  await expect(
    auditService.store({ action: 'invalid' }),
  ).rejects.toThrow('audit action is invalid');
});
\`\`\`

Audit event listeners and callbacks as well. A server \`error\` event without a listener, a callback that throws after teardown, or a timer whose promise is detached can escape Jest's normal result channel.

Adding a large \`testTimeout\` does not fix detached work. Timeouts control how long Jest waits for a test it knows is still active. They do not teach Jest to await a promise the test discarded.

## Reduce workers to test resource pressure

If \`--runInBand\` passes, move from one process to a small explicit pool:

\`\`\`bash
npx jest path/to/suite --maxWorkers=2
npx jest path/to/suite --maxWorkers=50%
\`\`\`

\`--maxWorkers\` accepts a number or percentage in Jest's CLI. A stable run at two workers and a crash at the default count suggests aggregate pressure or a shared external limit. It does not by itself prove memory is the only resource.

Parallel workers can multiply all of these:

| Resource | Failure mode under parallel files | Evidence to collect |
|---|---|---|
| JavaScript heap | Several large transforms or fixtures coexist | Heap logs and container memory graph |
| Database connections | Pool size multiplied per worker | Server connection counts and rejection logs |
| Listening ports | Tests bind the same fixed port | \`EADDRINUSE\` before worker death |
| Temporary paths | Files overwrite or delete each other | Shared path names and worker IDs |
| Browser processes | Each file launches a heavy browser | Process tree and peak resident memory |
| External API quota | Concurrent calls receive throttling or resets | Service response codes and request timestamps |

Choosing a lower worker count can be a valid production configuration for an integration-heavy project. It is not shameful to match concurrency to actual resource budgets. But record the reason and fix resource leaks or collisions first, so the setting does not merely conceal a deterministic defect.

## Diagnose memory without guessing at heap flags

Look for two distinct memory limits. V8 has a heap limit inside each Node process. CI containers also have an overall memory limit across the parent, Jest workers, browsers, databases, and native allocations. Increasing V8's old-space limit cannot help if the container itself has no spare memory.

Jest can log heap usage after tests. Run serially for a cleaner trend:

\`\`\`bash
npx jest path/to/suite --runInBand --logHeapUsage
\`\`\`

If heap rises across files, inspect retained globals, module caches, oversized test data, mock call histories, and resources that are closed but still referenced. A single file with a sharp jump points to its fixtures, transforms, or imported assets.

You can temporarily raise Node's heap ceiling to confirm a V8 limit hypothesis:

\`\`\`bash
NODE_OPTIONS="--max-old-space-size=4096" npx jest path/to/suite --runInBand
\`\`\`

The number is in MiB. Choose it based on the machine or container budget, not by copying the largest value from an issue thread. If this makes the run pass, you have evidence, not a completed diagnosis. Determine why the suite needs that heap and whether parallel workers multiply the requirement.

Operating-system termination may show an exit code such as 137 in a Linux container or an OOM event in platform logs. The exact signal reporting depends on the CI runtime. Check the job or pod memory graph rather than relying only on Jest text.

## Close resources in the lifecycle that created them

Open handles more commonly keep Jest alive than crash a worker, but faulty teardown can also trigger late errors during process shutdown. Servers, sockets, database pools, message consumers, and timers need awaited cleanup.

\`\`\`js
import { createServer } from 'node:http';

let server;

beforeAll(async () => {
  server = createServer((request, response) => {
    response.end('ok');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('serves the health response', async () => {
  const address = server.address();
  const response = await fetch(\`http://127.0.0.1:\${address.port}\`);
  await expect(response.text()).resolves.toBe('ok');
});
\`\`\`

The server asks the operating system for port zero, which allocates an available port and avoids fixed-port collisions among workers. \`afterAll\` returns a promise that resolves only after \`server.close\` completes.

Jest's \`--detectOpenHandles\` can help locate certain lingering handles and implies serial execution. It has performance overhead and is a diagnostic tool, not a default way to run every build. The [Jest open handles and flaky tests guide](/blog/jest-open-handles-flaky-tests-guide) goes further into ownership and teardown patterns.

## Make test data worker-safe

Jest exposes \`JEST_WORKER_ID\` to worker processes. It can help namespace external resources, but prefer naturally unique allocation when possible. Temporary-directory APIs, database-generated identifiers, port zero, and per-test transactions avoid embedding scheduler details in business logic.

When a fixed namespace is unavoidable, include the worker identity plus a per-test suffix. A worker ID alone is insufficient because many test files run sequentially in the same worker and may leave stale state after failure.

Cleanup must be idempotent. A retried file may encounter artifacts from the worker that died. Use unique names, and make teardown tolerate already-removed resources without hiding real cleanup errors.

If every worker initializes the same schema or applies migrations concurrently, move that operation into a global setup with a carefully managed shared database, or give each worker an independent database. A half-shared design creates races that disappear under \`--runInBand\` and return in CI.

For suite-level ownership patterns, consult the [Jest setup and teardown guide](/blog/jest-setup-teardown-beforeeach-guide). It helps decide whether a resource belongs in \`beforeEach\`, \`beforeAll\`, or a global environment.

## Inspect transforms and native dependencies

A worker can die before executing the first test if transformation or environment bootstrap fails catastrophically. Babel, TypeScript transformers, custom Jest environments, image processors, database drivers, and browser bindings all run inside or around workers.

Run one file with the smallest configuration that still reproduces the crash. Temporarily remove optional reporters and custom environments in a local diagnostic branch, one at a time. Do not permanently disable them without identifying the failing layer.

Native crashes need native evidence. Look for \`Segmentation fault\`, abort messages, core dumps, or runtime crash reports. Align the Node version and operating-system image between local and CI, rebuild native modules for the active runtime, and update only within supported compatibility ranges. Jest cannot catch a segmentation fault and turn it into a normal assertion.

A transform cache can contain artifacts built under a different dependency or runtime state. Clearing Jest's cache is reasonable after relevant upgrades, but a cache clear is not a durable fix if fresh runs later corrupt or mis-key the same artifact.

## Configuration changes that help, and what they mean

Several Jest options are useful during this incident, but each answers a different question.

| Option | What it changes | Interpretation |
|---|---|---|
| \`--runInBand\` | Runs tests serially in the main process | Reveals original errors and removes worker concurrency |
| \`--maxWorkers=2\` | Limits worker pool size | Tests aggregate pressure and collision sensitivity |
| \`--logHeapUsage\` | Prints heap usage after tests | Shows per-file trend, clearest in band |
| \`--detectOpenHandles\` | Attempts to identify lingering handles | Useful for teardown leaks, adds overhead |
| \`--verbose\` | Shows individual test names | Helps identify last started or completed test |
| \`--clearCache\` | Deletes Jest's transform cache | Relevant after cache incompatibility, not general crashes |

\`testTimeout\` is absent from the table because the final worker exception is not evidence of an ordinary Jest timeout. Increase timeouts only when logs show a test legitimately exceeds its allowed duration while remaining alive.

\`workerIdleMemoryLimit\` exists in modern Jest configuration to recycle workers after they exceed a specified memory threshold. It can bound accumulation between test files, but it does not cure a single file that exceeds available memory and it may be affected by environment-specific memory reporting. Use it after measuring and reading the documentation for your installed Jest version.

## Turn the diagnosis into a regression-resistant fix

A robust resolution changes the cause and retains enough evidence to catch recurrence:

- replace forced process termination with returned status or \`process.exitCode\` at the entry point;
- await every promise owned by a test or hook;
- allocate ports and paths uniquely;
- close services and pools with awaited teardown;
- cap workers to a measured infrastructure budget;
- reduce retained data or fix a leak before expanding heap;
- align native modules and runtime versions when a native crash is proven.

After the targeted test passes, run its containing project with the intended CI worker count multiple times. Then run the full suite while watching peak memory and external resource counts. A single green \`--runInBand\` execution confirms a clue, not the final parallel behavior.

Keep the first-cause stack in the incident notes. The final “four child-process exceptions” line is too generic to help a future engineer distinguish this failure from another worker crash.

## Preserve worker evidence in continuous integration

Parallel failures become expensive when CI discards the context needed to identify the first dead process. Configure the job to retain raw Jest output, the runtime version, the effective worker count, and platform memory observations. For native aborts, preserve crash reports or core files only where security and storage policies permit.

Print configuration facts, not secrets. Database connection limits, container memory ceilings, and the count of launched browser processes can explain a crash without logging credentials or complete environment dumps. Record whether the job was retried by the CI platform, because a whole-job retry is different from Jest replacing one worker.

If the repository uses custom reporters, confirm they flush useful events before process exit and do not themselves hold large result structures in memory. Reproduce once with Jest's built-in reporting to separate reporter behavior from the tested code. Likewise, compare a failed shard with the same files outside sharding before blaming the scheduler.

A short incident artifact should name the first failing file, termination signal or fatal message, peak memory, and the smallest command that reproduces it. This turns the generic four-exception summary into searchable engineering knowledge and prevents the next occurrence from restarting at worker-count guesses.

## Frequently Asked Questions

### Does the message mean four different tests failed?

Usually it means Jest retried a unit of work in replacement child processes and those attempts failed before a normal result was returned. It can be the same deterministic crash repeated. Inspect the earliest worker output and reproduce the named file serially.

### Should I permanently add \`--runInBand\`?

Only if serial execution matches the suite's resource model and runtime goals. It is excellent for diagnosis. If parallelism exposes shared ports, databases, or leaked memory, fix those defects. A deliberately integration-heavy suite may still choose a small or serial worker budget after measurement.

### Will increasing \`testTimeout\` stop worker retries?

Not when the process exits, is killed, or crashes. A timeout applies to tests and hooks that remain alive but do not finish in time. Use the observed failure mode to choose the setting rather than treating all long or missing results as timeouts.

### How do I tell V8 heap exhaustion from a container OOM kill?

V8 commonly prints a fatal JavaScript heap message and garbage-collection details. A container kill may leave only a signal-like exit status and an event in the CI, container, or kernel logs. Compare Node heap logging with the overall process and container memory graph.

### Can open handles cause this exact worker error?

Open handles most often cause Jest to remain running after tests complete. They can contribute to resource pressure or emit late errors during teardown, so they are still worth investigating when lifecycle logs point there. Do not assume every child-process crash is an open-handle problem solely because both involve workers.
`,
};
