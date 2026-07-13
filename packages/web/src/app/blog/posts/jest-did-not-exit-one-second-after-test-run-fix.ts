import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest “Did Not Exit One Second After the Test Run” Fix',
  description:
    'Fix Jest did not exit one second after the test run by tracing open servers, sockets, timers, workers, and database pools to their missing cleanup.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Jest “Did Not Exit One Second After the Test Run” Fix

All assertions are green, the summary prints, and the process keeps breathing. One second later Jest warns that it did not exit. The suite has finished logically, but Node's event loop still owns work: a listening server, connected socket, referenced timer, worker, file watcher, or another active resource.

The warning is not a flaky assertion and it is rarely fixed by changing assertion timing. It is a lifecycle defect. Something created during setup was never closed, or cleanup started but was not awaited. The reliable repair is to identify the resource owner and make teardown symmetrical with setup.

## What keeps a Node test process alive

Node exits naturally when it has no more referenced event-loop work. A pending Promise by itself does not necessarily keep the process alive, but the I/O or timer behind it often does. Jest waits for natural exit so late asynchronous errors and leaking resources remain visible.

Typical culprits have distinct ownership patterns.

| Open resource | Common creator | Correct teardown shape | Frequent mistake |
|---|---|---|---|
| HTTP or HTTPS listener | \`server.listen()\`, app test bootstrap | Await \`server.close()\` completion | Closing the app object rather than the actual listener |
| Database connection pool | PostgreSQL, MySQL, ORM client | Await pool/client disconnect method | Disconnect called without return or await |
| TCP or WebSocket client | \`net.connect\`, WebSocket library | Close and wait for terminal event | Server closes while clients remain connected |
| Repeating timer | polling, cache refresh, heartbeat | \`clearInterval\` or stop owner | Timer hidden inside a service singleton |
| Worker thread or child process | parser, browser, queue worker | Await terminate/kill and exit | Worker created at import time |
| Message consumer | Kafka, AMQP, job runner | Await consumer stop and connection close | Test stops producing but leaves subscription active |
| File watcher | chokidar, compiler watch mode | Await watcher close | Production watch behavior enabled in tests |

The message's one-second threshold is only when Jest reports suspicion. The option \`--openHandlesTimeout\` changes that warning delay when open-handle detection and forced exit are disabled. It does not close anything.

## Start with detectOpenHandles, not forceExit

Run the smallest failing scope with Jest's diagnostic flag:

\`\`\`bash
npx jest path/to/orders.integration.test.ts --runInBand --detectOpenHandles
\`\`\`

\`--detectOpenHandles\` uses async resource tracking to report handles that can prevent exit. It implies serial execution, which reduces worker noise and makes ownership easier to follow. The diagnostic has a performance cost, so use it for investigation rather than making it the default CI mode.

\`--forceExit\` is an escape hatch. It terminates after tests rather than proving resources were released. It can hide dropped writes, unflushed coverage, database transactions, or servers still accepting connections. If a third-party library has an acknowledged leak and no lifecycle API, force exit may be a temporary containment measure, but document it with an issue and keep the affected scope narrow.

Use \`--runInBand\` independently when parallel workers obscure the signal. If the warning disappears only in band, inspect global setup, shared ports, worker-scoped clients, and modules that allocate resources on import. Serial passing does not automatically mean the leak is fixed.

## Make server startup and shutdown one owned unit

Integration tests often call \`app.listen(0)\` and lose the returned server. The framework application is configuration; the Node server owns the listening socket. Keep that returned object and close it in \`afterAll\`.

\`\`\`typescript
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../src/app';

describe('orders HTTP API', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp();
    server = await new Promise<Server>((resolve, reject) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
      listening.once('error', reject);
    });
    const address = server.address() as AddressInfo;
    baseUrl = \`http://127.0.0.1:\${address.port}\`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  });

  test('returns an empty order list', async () => {
    const response = await fetch(\`\${baseUrl}/orders\`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ orders: [] });
  });
});
\`\`\`

Binding to port zero lets the operating system choose a free port, avoiding collisions across Jest workers. The startup Promise reports listen errors. Teardown waits until the close callback, rather than merely requesting closure and letting the test file finish.

Recent Node versions provide additional server connection-management methods, but do not blindly destroy sockets to silence a leak. First ensure response bodies are consumed and clients are closed. Forced socket destruction can make a faulty client lifecycle look healthy.

## Database pools must be awaited at the correct scope

A connection pool intentionally maintains open sockets. If created once per test file, close it once after that file's tests. If created in a global singleton, decide whether Jest workers each receive their own instance and where their teardown runs. Closing a shared pool after every test causes concurrency errors; never closing it produces the exit warning.

Here is a PostgreSQL example using the real \`pg\` Pool API:

\`\`\`typescript
import { Pool } from 'pg';

describe('order repository', () => {
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });

  beforeAll(async () => {
    await pool.query('CREATE TEMP TABLE order_status (id integer, state text)');
  });

  afterAll(async () => {
    await pool.end();
  });

  test('stores a terminal state', async () => {
    await pool.query(
      'INSERT INTO order_status (id, state) VALUES ($1, $2)',
      [41, 'fulfilled'],
    );
    const result = await pool.query(
      'SELECT state FROM order_status WHERE id = $1',
      [41],
    );
    expect(result.rows).toEqual([{ state: 'fulfilled' }]);
  });
});
\`\`\`

The teardown returns the Promise from \`pool.end()\`. Writing \`afterAll(() => { pool.end(); })\` starts cleanup but tells Jest the hook finished immediately. That race can yield either an open-handle warning or late errors after the environment is torn down.

ORMs expose different real lifecycle methods, such as disconnecting a client or destroying a data source. Use the method documented by the library version in the project. Do not infer a generic \`close()\` method from another database package.

## Timers: distinguish fake-clock cleanup from real polling leaks

An uncleared real \`setInterval\` keeps Node active because its timer handle remains referenced. Find the service that owns it and give that service a \`stop\` method. Tests should not reach into private timer identifiers when production code can express a clean lifecycle.

\`\`\`typescript
export class InventoryPoller {
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly refresh: () => Promise<void>) {}

  start(intervalMs: number): void {
    this.timer = setInterval(() => void this.refresh(), intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}

test('polls inventory repeatedly', async () => {
  jest.useFakeTimers();
  const refresh = jest.fn().mockResolvedValue(undefined);
  const poller = new InventoryPoller(refresh);

  poller.start(1_000);
  await jest.advanceTimersByTimeAsync(3_000);
  expect(refresh).toHaveBeenCalledTimes(3);

  poller.stop();
  jest.useRealTimers();
});
\`\`\`

Fake timers usually do not create the same native timer leak, but failure to restore them can contaminate later tests in the worker. Put restoration in \`afterEach\` if multiple tests use them. Also distinguish clearing timers from completing asynchronous callbacks already triggered by those timers. Await the work your design starts.

Calling \`unref()\` on a real timer allows Node to exit without waiting for it. That is appropriate for genuinely optional background maintenance whose completion must not govern process lifetime. It is a design decision, not a universal test fix. An unreferenced timer can still run while the process remains active for other reasons, so production code must tolerate interruption.

## Sockets and clients can outlive the server

Closing an HTTP server stops new connections, but keep-alive sockets or upgraded WebSockets may have separate lifetimes. A test using a WebSocket client should close that client and await its close event before shutting down the server. Otherwise the server's close completion may wait for connections, or the client itself may keep a socket referenced.

Fetch clients can also keep pooled connections, depending on the implementation and dispatcher. Consume or cancel response bodies. A test that asserts only status and abandons a streaming body may retain transport work. When a library exposes an agent or dispatcher with a close method, own and close the explicit instance rather than relying on process shutdown.

Use a teardown sequence that reverses setup:

1. stop producers, pollers, and new task scheduling;
2. unsubscribe consumers and close clients;
3. finish or cancel in-flight work;
4. close servers and queue connections;
5. close database pools and other infrastructure.

That order avoids creating fresh work while dependencies are disappearing.

## Module imports that perform work are hard to clean

A service that connects to Redis or starts a cron timer at module top level runs as soon as the test imports it. The test may not know the resource exists, and module caching obscures ownership. Prefer factories with explicit \`start\` and \`stop\` boundaries. Dependency injection is useful here for lifecycle control, not only mocking.

Global setup is another trap. Jest global setup and the test environment are separate concerns, and values are not simply shared as live objects across worker processes. If global setup starts an external service, global teardown needs enough durable information to stop it. If each worker imports a module that creates a pool, each worker must release its pool.

The [Jest open-handles and flaky-tests guide](/blog/jest-open-handles-flaky-tests-guide) covers worker isolation and repeatable diagnosis in more depth. The important practice is to map every allocation to a cleanup in the same conceptual owner.

## Reading diagnostic output without chasing noise

Open-handle detection may report a resource type such as \`TCPSERVERWRAP\`, \`TCPWRAP\`, or \`Timeout\` plus an allocation stack. Follow the earliest stack frame in application or test code. Wrapper layers can make the visible frame look like an innocent constructor, so trace upward to the bootstrap call that created it.

Run one file, then one test with \`-t\` if necessary. If a file leaks even with its tests skipped, setup or module import is responsible. If only one case leaks, compare its branch with a passing sibling. Error paths are common offenders because cleanup occurs only after success.

Temporary handle inspection through undocumented Node internals is tempting, but it couples diagnosis to private APIs and often lists Jest's own resources. Prefer the supported Jest flag, allocation stacks, and binary isolation. Add targeted logging to lifecycle methods to verify both invocation and completion.

| Observation | Productive hypothesis | Next experiment |
|---|---|---|
| Warning appears after one integration file | File-scoped resource lacks \`afterAll\` | Run only that file with handle detection |
| Suite exits when a test is skipped | Resource allocated inside that case | Trace its success and error branches |
| Only parallel execution hangs | Per-worker resources share a port or teardown | Run in band, then assign worker-safe resources |
| Handle is a timeout | Poller, retry loop, or delayed cleanup remains active | Search timer creation and prove stop is called |
| Handle is a TCP client | Pool, HTTP client, queue, or WebSocket is open | Inventory connection factories and owners |
| Teardown logs but warning remains | Cleanup was not awaited or closes wrong instance | Log resolved completion and object identity |

## Cleanup hooks need failure-safe structure

\`afterAll\` runs even when a test assertion fails, but setup can fail before assigning the resource. Guard partially initialized objects and preserve the original setup error. If several resources need cleanup, one rejection should not prevent all later cleanup. Use carefully ordered \`try/finally\` blocks or \`Promise.allSettled\` where resources can close independently.

Within a test, use \`try/finally\` for a resource whose lifetime is narrower than the suite. Registering teardown immediately after allocation is easier to review than placing cleanup hundreds of lines later. Avoid conditionally registering hooks inside tests; Jest hooks should be declared during suite definition.

Async test style matters too. Return or await Promises from tests and hooks. A callback-style \`done\` test should not also return a Promise. The [Jest async and await testing guide](/blog/jest-async-await-testing-promises-guide) explains completion signaling. Mis-signaled completion can make Jest report late logs or environment teardown errors alongside open handles.

## Force exit as a controlled exception

There are rare cases where a dependency allocates an uncloseable native handle. Before adopting forced exit, reproduce the leak in a minimal test, confirm the installed version, search the dependency's official issue tracker, and test a supported upgrade. Record why the handle cannot be owned by your code.

If CI must proceed, scope \`--forceExit\` to the affected Jest project rather than the entire repository. Keep handle detection in a separate diagnostic command. Forced exit should be visible technical debt with an expiry condition, not a permanent green switch.

Increasing \`openHandlesTimeout\` is different: it reduces warnings for legitimate cleanup that takes slightly longer, but a clean suite should eventually exit. Measure teardown duration before changing it. A two-second database shutdown on loaded CI may justify a larger warning window; an interval scheduled forever does not.

## Cleanup must cover the rejected setup path

Many leaks appear only when setup fails halfway. A test bootstrap may connect a database, start a server, then throw while seeding data. If the \`beforeAll\` assignment never completes, the normal \`afterAll\` hook may lack a usable reference even though earlier resources are alive.

Build composite fixtures with incremental ownership. As soon as a resource starts, register or retain its cleanup. If the next step rejects, run the already acquired cleanups before rethrowing. This is the test equivalent of a resource stack. It prevents the original setup failure from being followed by a misleading Jest exit warning.

Also test shutdown itself. A service \`stop\` method should be idempotent when production signal handlers and test teardown can both invoke it. It should reject with actionable context if a dependency cannot close, rather than swallowing the error to make Jest exit. Focused lifecycle tests can start the service, stop it twice if idempotency is promised, and confirm its port becomes available.

Signal handlers are another hidden owner. Modules that call \`process.on('SIGTERM', ...)\` on every import accumulate listeners across isolated module tests. Export a bootstrap function, install handlers once at the executable boundary, and remove them when a test explicitly owns them. Listener leaks may produce warnings distinct from open handles, but both reveal uncontrolled process-global state.

## Watch mode is not representative of process exit

Jest watch mode intentionally remains alive to observe file changes and accept commands, so it cannot prove clean one-shot shutdown. Reproduce the warning with a non-watch invocation that targets the leaking project. Conversely, do not diagnose the watcher's own handles as application leaks.

Custom test environments and reporters can also allocate resources. If every ordinary test file leaks even without importing application code, create an empty test under the same Jest project. A warning there points toward environment setup, reporters, transformers, or setup files. Reduce configuration incrementally, then restore each component until the owner becomes visible. This avoids adding teardown to unrelated product suites.

## Frequently Asked Questions

### Why does Jest pass every test and still return slowly?

Assertions and process lifecycle are separate. The assertions can finish while Node still has a referenced server, socket, timer, worker, or watcher. Diagnose active resources and await their teardown rather than modifying the expectations.

### Will \`jest.clearAllTimers()\` fix the warning?

Only if Jest fake timers are involved in the relevant scope. It will not close real sockets, pools, servers, or timers created outside fake-timer control. The owning service should expose and execute its shutdown path.

### Is \`--detectOpenHandles\` safe to keep in every CI run?

It is a supported diagnostic, but it serializes execution and adds async tracking overhead. Keep normal CI representative and fast, then use a dedicated command or failing-file reproduction with the flag when investigating.

### Why does calling \`server.close()\` not always solve the hang?

The call is asynchronous, and active connections may remain. Await its completion, close clients such as WebSockets first, and verify you are closing the same server returned by \`listen\`. Do not confuse a web framework app object with its listener.

### Can a pending Promise alone cause the one-second warning?

A Promise with no active underlying resource generally does not keep Node alive. Its timer, socket, worker, file operation, or other async handle may. Trace the mechanism producing the Promise and clean up that resource.
`,
};
