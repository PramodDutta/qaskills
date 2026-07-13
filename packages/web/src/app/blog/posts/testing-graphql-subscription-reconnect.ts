import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Testing GraphQL Subscription Reconnection",
  description:
    "Test GraphQL subscription reconnection across disconnects, authentication refresh, replay gaps, duplicate events, retry policies, and terminal closures.",
  date: "2026-07-13",
  category: "API Testing",
  content: `
# Testing GraphQL Subscription Reconnection

Event 41 reaches the browser, the socket drops, and event 43 appears after reconnect. Whether event 42 is lost, replayed, or delivered twice is not a WebSocket detail. It is an application delivery contract, and a reconnect test that checks only for a second \`connected\` callback completely misses it.

GraphQL subscriptions combine a transport session, GraphQL operation lifecycle, authentication, retry policy, and an event source. Reconnection creates a new transport session. It does not inherently resume an old subscription or recover messages emitted during the gap. Tests must verify every layer that claims to bridge that discontinuity.

## Map the protocol states before injecting failure

With the \`graphql-transport-ws\` subprotocol, the socket opens, the client sends \`connection_init\`, the server acknowledges with \`connection_ack\`, and the client sends \`subscribe\` for an operation ID. Results arrive as \`next\`; either side can finish an operation with \`complete\`. Ping and pong messages support liveness.

| State transition | Observable evidence | Failure worth testing |
|---|---|---|
| TCP/WebSocket open -> init | \`connection_init\` payload sent | Token supplier throws or stalls |
| Init -> acknowledged | \`connection_ack\` received | Ack timeout closes with an actionable code |
| Ack -> subscribed | \`subscribe\` carries query and variables | Operation never resubscribes after reconnect |
| Subscribed -> next | Result associated with operation ID | Duplicate or out-of-order domain event |
| Live -> disconnected | Close event records code and reason | Fatal closure is retried incorrectly |
| Retry -> new session | New init and new subscribe occur | Stale credential is reused |
| Operation -> complete | Sink completes once | Retry continues after consumer disposal |

Do not mix the legacy \`graphql-ws\` subprotocol associated with older libraries and the newer \`graphql-transport-ws\` protocol. Message names and behavior differ. Assert the negotiated subprotocol in an end-to-end test.

## A real reconnect test with \`graphql-ws\`

The client library exposes retry controls and lifecycle listeners. The following Vitest test uses the real \`graphql-ws\` client, a Node WebSocket implementation, and a test server URL that deliberately closes retryably after the first event. The server contract accepts an \`after\` cursor and replays later events.

\`\`\`typescript
import { afterEach, expect, test, vi } from 'vitest';
import WebSocket from 'ws';
import { createClient } from 'graphql-ws';

test('resubscribes with the last committed event cursor', async () => {
  let cursor: string | null = null;
  const received: number[] = [];
  const connected = vi.fn();

  const client = createClient({
    url: 'ws://127.0.0.1:4100/graphql',
    webSocketImpl: WebSocket,
    retryAttempts: 3,
    retryWait: async () => {},
    connectionParams: () => ({ authorization: 'Bearer test-token' }),
    on: { connected },
  });

  const done = new Promise<void>((resolve, reject) => {
    const dispose = client.subscribe(
      {
        query: \`subscription Events($after: ID) {
          events(after: $after) { id sequence }
        }\`,
        variables: { after: cursor },
      },
      {
        next: (result) => {
          const event = result.data?.events as { id: string; sequence: number };
          if (!received.includes(event.sequence)) received.push(event.sequence);
          cursor = event.id;
          if (received.length === 3) {
            dispose();
            resolve();
          }
        },
        error: reject,
        complete: resolve,
      },
    );
  });

  await done;
  expect(connected).toHaveBeenCalledTimes(2);
  expect(received).toEqual([41, 42, 43]);
  await client.dispose();
});
\`\`\`

There is an intentional flaw to discuss: \`variables\` is created once when \`subscribe\` is called. Automatic transport reconnection typically resubscribes the same payload, so changing local \`cursor\` does not mutate the original variables. If cursor-based resume is required, the application must dispose and create a new operation payload, or use an abstraction that rebuilds it. A test should catch this design gap rather than assume the library adds resume semantics.

## Build a deterministic disconnecting server

Network toggles and process kills are useful later, but a protocol-level test server gives exact control. \`graphql-ws\` provides \`useServer\` for the \`ws\` package. The application resolver can publish events from a controllable async iterator; the test harness can terminate active sockets after a chosen sequence.

\`\`\`typescript
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';

const schema = makeExecutableSchema({
  typeDefs: \`
    type Event { id: ID!, sequence: Int! }
    type Query { health: Boolean! }
    type Subscription { events(after: ID): Event! }
  \`,
  resolvers: {
    Query: { health: () => true },
    Subscription: {
      events: { subscribe: (_root, args, context) => context.eventBus.after(args.after) },
    },
  },
});

const server = createServer();
const sockets = new WebSocketServer({ server, path: '/graphql' });
const cleanup = useServer(
  { schema, context: () => ({ eventBus: testEventBus }) },
  sockets,
);

await new Promise<void>((resolve) => server.listen(4100, '127.0.0.1', resolve));

// In the test, terminate rather than closing cleanly to simulate a broken link.
for (const socket of sockets.clients) socket.terminate();

await cleanup.dispose();
await new Promise<void>((resolve, reject) =>
  server.close((error) => (error ? reject(error) : resolve())),
);
\`\`\`

\`terminate()\` creates an abnormal loss. \`close(1000, 'complete')\` is a normal closure and should not be treated as the same retry scenario. Test both. Use an ephemeral port in real suites to avoid collisions, and expose a harness method rather than reaching into server clients from every test.

## Resume is an application feature, not a transport guarantee

The GraphQL operation contains a query and variables. The standard transport does not define an event cursor, acknowledgement of domain events, or a replay buffer. Those belong to the schema and event infrastructure.

Common designs include an \`after\` argument, monotonically increasing sequence, or opaque stream offset. The server reads durable history after that cursor, then tails live events without a gap. That handoff itself needs a race test: publish an event between history query and live subscription and prove it appears exactly once.

| Delivery design | Gap behavior | Duplicate handling |
|---|---|---|
| Live pub/sub only | Events during disconnect are lost | Usually none |
| Cursor plus durable log | Client requests events after committed cursor | Client or server deduplicates replay boundary |
| Full state snapshot after reconnect | Intermediate changes collapse into current state | Snapshot replaces prior projection |
| Periodic sequence reconciliation | Missing range triggers HTTP backfill | Consumer tracks seen IDs |

Exactly-once delivery is rarely a realistic end-to-end promise across reconnects. Aim for at-least-once plus idempotent consumption, or an explicit snapshot model. Test the stated semantics with domain identifiers, not WebSocket frame counts.

## Force the failure at several phases

A disconnect after \`next\` is only one case. Terminate before \`connection_ack\`, immediately after ack but before subscribe, while the server is producing a result, and after the consumer disposes. Each phase exposes different leaks.

Before ack, verify \`connectionAckWaitTimeout\` and retry behavior. After ack, ensure each active operation is registered again exactly once. During an event, test whether the durable cursor advances before or after local processing. After disposal, verify no reconnect and no later sink callbacks.

Fatal protocol closures should not loop. The client documents close codes such as unauthorized subscription-before-ack, unacceptable subprotocol, duplicate subscriber ID, and too many initialization requests as fatal. Your \`shouldRetry\` callback cannot make every fatal code recoverable. Application tests should distinguish an expired credential that can be refreshed from an authorization failure that requires user action.

## Refresh authentication on every connection

\`connectionParams\` may be a function or async function. Use it to retrieve the current credential for each new session. A static object can replay an expired token forever.

\`\`\`typescript
const client = createClient({
  url: 'wss://api.example.test/graphql',
  connectionParams: async () => ({
    authorization: \`Bearer \${await tokenStore.getFreshToken()}\`,
  }),
  retryAttempts: 5,
  shouldRetry: (event) => {
    return event instanceof CloseEvent && event.code !== 4403;
  },
});
\`\`\`

In Node, the close event class may come from the WebSocket implementation rather than the DOM, so production code should not assume a global \`CloseEvent\`. Narrow by checking safe properties. Tests should rotate the token after the first connection and assert that the second \`connection_init\` payload contains the new value without logging it.

An async token supplier can also time out. The server may enforce an initialization wait. Test a rejected refresh promise and a slow refresh separately. Neither should leave an orphan socket repeatedly connecting.

## Detect duplicates at the consumer boundary

Count business event IDs delivered to the reducer, database writer, or notification layer. A protocol trace can show two \`next\` messages, but the user-facing defect occurs only if the consumer applies both.

Use an idempotency store or compare sequence against the last committed cursor. Commit the cursor only after the side effect succeeds. If it advances before processing and the process crashes, the event is lost; if it advances after processing, a crash can cause a duplicate. Tests should simulate both crash points.

Order assertions must match the domain. Per-aggregate events may be ordered while events across tenants are not. Do not assert a global sequence the broker does not guarantee.

## Backoff tests without long waits

The client defaults to randomized exponential backoff. Real waiting makes a retry test slow, and randomness makes exact timing brittle. Supply \`retryWait\` in a focused unit/integration test and record retry indices. Resolve immediately or through a controlled timer. Keep one higher-level test with production backoff configuration to catch wiring errors, but assert a range rather than exact milliseconds.

Test that retry attempts stop at the configured limit and the sink receives an error. Also verify the retry counter resets after a successful connection when that is the library behavior your application relies on. A server that flaps every few seconds can otherwise exhaust attempts unexpectedly.

For lower-level frame and proxy scenarios, the [WebSocket testing guide](/blog/websocket-testing-guide) is the right companion. The [GraphQL subscriptions guide](/blog/graphql-subscriptions-testing-guide) covers resolver and schema testing beyond reconnection.

## Observe without leaking credentials

Record connection attempt, close code, retry index, ack latency, active operation count, and last domain cursor. Never log \`connection_init\` payloads wholesale. Correlate new sockets to one logical subscription session so an incident timeline shows reconnection rather than unrelated users.

Metrics should separate transport reconnects from operation errors. A GraphQL \`error\` message for one operation does not necessarily mean the socket failed. Likewise, a healthy pong does not prove event delivery is current.

## Server restarts versus broken network paths

A graceful server restart may send a close frame, drain subscriptions, and let clients reconnect to a ready replacement. A broken Wi-Fi path sends no useful close reason. Test both because retry classification and time-to-detection differ.

For restart tests, run two server instances behind a controllable proxy. Subscribe through the proxy, publish an event, stop the active instance, route new connections to the replacement, then publish again. Assert a new connection and the delivery contract. This also catches session affinity assumptions hidden in an in-memory pub/sub implementation.

A half-open connection is harder. The client can believe the socket is open after the network path vanished. Use ping/pong plus a test proxy that drops packets without closing either side. The \`graphql-ws\` client sends pings when \`keepAlive\` is set, but documentation notes it does not automatically close when a pong never comes. Application code must install a pong deadline and close the socket to activate retry.

## Multiple operations share one reconnecting socket

Clients commonly multiplex several subscriptions on one connection. A reconnect must restore every active operation once, while disposed operations stay gone. One-operation tests miss registry bugs.

\`\`\`typescript
const users: string[] = [];
const orders: string[] = [];
const fail = (error: unknown) => {
  throw error;
};

const stopUsers = client.subscribe(
  { query: 'subscription { userChanged { id } }' },
  { next: (v) => users.push(String(v.data?.userChanged.id)), error: fail, complete() {} },
);
const stopOrders = client.subscribe(
  { query: 'subscription { orderChanged { id } }' },
  { next: (v) => orders.push(String(v.data?.orderChanged.id)), error: fail, complete() {} },
);

stopUsers();
serverHarness.terminateConnections();
await serverHarness.waitForOperation('orderChanged');

expect(serverHarness.activeOperationNames()).toEqual(['orderChanged']);
stopOrders();
\`\`\`

Use parsed operation names in a test harness rather than searching query strings in production code. Verify unique operation IDs on the new session and that late messages from the old socket cannot reach a reused sink.

## Client lifecycle in React and other UI frameworks

Component remounts can create a second client while the first is retrying. Strict development modes may intentionally mount effects twice to expose cleanup mistakes. Test the integration wrapper, not only the transport client: mount, subscribe, unmount during backoff, advance timers, and assert no new connection.

Keep one client per intended application scope. Creating it during render causes connection churn and loses retry state. Disposal should unsubscribe operations and close resources. A globally shared client needs a logout path that clears credentials and prevents an old subscription from reconnecting under a new user.

Background tabs and mobile sleep can pause timers. When the app resumes, a large delayed retry may fire alongside an online event. Deduplicate connection attempts and test a fake visibility/online transition. Do not assume retry callbacks run at their scheduled wall-clock instant.

## Schema changes during a gap

A deployment can remove a field while a client is disconnected. On resubscribe, the server may return a GraphQL operation error on a healthy socket. Treat this as an operation failure, not an endless transport retry. Capture the error, stop that operation, and surface a refresh or compatibility response.

Persisted queries introduce another variant: the new server may not recognize an old hash. Test the client fallback policy if it can resend the full document. A reconnect storm during deployment should not repeatedly submit an invalid operation at exponential scale.

Resume cursors also need versioning. An opaque cursor from the old event store may be invalid after migration. Define whether the server returns a specific error, starts from a snapshot, or asks the client to resynchronize through HTTP. Add that response to the contract suite before changing storage.

## Backpressure after replay

A long outage can produce thousands of replayable events. Delivering all of them immediately after reconnect may freeze the UI or overflow an in-memory queue. Define a maximum replay page, snapshot threshold, or paced catch-up mode.

Test an outage beyond that threshold. The server might return a \`CURSOR_TOO_OLD\` error and direct the client to fetch a fresh snapshot. After installing the snapshot, the client subscribes from its new cursor and must not apply pre-snapshot events. This is safer than pretending an unlimited backlog will always drain.

Measure cursor lag as a domain metric. Socket-connected status can be green while the consumer remains minutes behind.

## Frequently Asked Questions

### Does \`graphql-ws\` automatically replay events missed during reconnect?

No. It can reconnect and resubscribe, but missed-event recovery requires a schema cursor, durable event source, snapshot, or other application mechanism.

### Should a normal close code trigger resubscription?

Usually a normal completion should not retry. Test your client's policy explicitly and reserve retries for closures the application classifies as recoverable.

### How can I prove an expired token is refreshed?

Provide \`connectionParams\` as a function, rotate the test credential after disconnect, and inspect the server's second initialization payload through a redacted harness assertion.

### Why did my updated cursor not appear in the resubscribed operation?

The original subscribe payload was probably reused. Mutating a local variable does not rebuild its \`variables\` object. Dispose and create a new operation or add a resume-aware abstraction.

### Is ping/pong enough to test subscription health?

No. It proves transport liveness only. A stalled broker, resolver, or consumer can still deliver no domain events while pong responses remain healthy.
`,
};
