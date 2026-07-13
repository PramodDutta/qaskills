import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing gRPC Bidirectional-Stream Cancellation',
  description:
    'Test gRPC bidirectional-stream cancellation with real client cancellation, CANCELLED status, server cleanup, partial messages, upstream propagation, and races.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing gRPC Bidirectional-Stream Cancellation

One response has arrived, six requests are still queued, and the user closes the live dashboard. At that instant, a bidirectional RPC is not a completed stream and it is not a network outage. The client has withdrawn interest, the server must discover cancellation, stop background work, release subscriptions, and propagate the signal to anything it started upstream.

Cancellation tests often stop after observing code CANCELLED on the client. That checks only one endpoint of the protocol. The expensive defects live on the other side: timers continue, database cursors remain open, broker consumers leak, or another message slips into a stateful workflow after the user believes it stopped.

## Fix the cancellation point with a protocol latch

Wall-clock delays make streaming tests race by design. Cancel after an observable event instead. A latch can be the first response, a server-side “subscription active” probe, or a barrier exposed by a fake upstream dependency. Once the latch opens, cancel the live call and assert termination and cleanup from that known phase.

| Cancellation point | What has definitely happened | Risk the test should expose |
| --- | --- | --- |
| Immediately after call creation | RPC object exists locally | Handler allocation before first message |
| After first request write callback | A request was accepted for writing locally | Server starts work but never cleans it |
| After initial response metadata | Server began processing | Metadata-only calls leak resources |
| After one response data event | Partial exchange completed | Client treats partial data as final success |
| While server write is blocked | Flow control is active | Cleanup waits forever on pending write |
| During upstream RPC | Downstream work has started | Cancellation does not propagate |

Avoid asserting that the server processed exactly N messages at cancellation unless the application protocol acknowledges each one. A successful client write means the local stream accepted the message, not that business processing committed it remotely.

## Define a tiny duplex contract that makes cleanup visible

Use a purpose-built test service rather than a production stream with dozens of fields. The protocol below models a topic subscription. The client sends subscribe and ping frames; the server emits events. Cancellation after the first event should remove the subscription and stop its heartbeat source.

\`\`\`proto
syntax = "proto3";

package live;

service LiveFeed {
  rpc Connect(stream ClientFrame) returns (stream ServerFrame);
}

message ClientFrame {
  oneof body {
    string subscribe_topic = 1;
    int64 ping_sequence = 2;
  }
}

message ServerFrame {
  int64 sequence = 1;
  string topic = 2;
  string payload = 3;
}
\`\`\`

The message schema does not invent an in-band cancel frame. gRPC cancellation is an RPC lifecycle operation. Add a domain “unsubscribe but keep connection open” message only if the product genuinely needs different semantics.

For the examples below, assume TypeScript stubs generated from this proto expose LiveFeedClient and the usual @grpc/grpc-js stream interfaces. Static or dynamic code generation does not change cancel(), data, error, status, or write behavior.

## Cancel a real Node client after a partial response

In @grpc/grpc-js, the bidirectional call is a ClientDuplexStream. call.cancel() cancels the ongoing RPC. If no other terminal status already won the race, the call ends with gRPC status CANCELLED, numeric code 1.

This Vitest case waits for one response, cancels, and captures both error and final status. Event listeners are attached before cancellation so synchronous progress cannot escape them.

\`\`\`typescript
import { status, type ServiceError } from '@grpc/grpc-js';
import { once } from 'node:events';
import { expect, test } from 'vitest';
import { client } from './live-feed-test-server';

test('client cancellation terminates a partially consumed duplex call', async () => {
  const call = client.connect();
  const received: Array<{ sequence: string; topic: string; payload: string }> = [];
  call.on('data', (frame) => received.push(frame));

  const firstData = once(call, 'data');
  call.write({ subscribeTopic: 'builds' });
  await firstData;
  expect(received).toHaveLength(1);

  const errorEvent = once(call, 'error') as Promise<[ServiceError]>;
  const statusEvent = new Promise<{ code: number }>((resolve) => {
    call.once('status', resolve);
  });
  call.cancel();

  const [error] = await errorEvent;
  const finalStatus = await statusEvent;
  expect(error.code).toBe(status.CANCELLED);
  expect(finalStatus.code).toBe(status.CANCELLED);
  expect(received).toHaveLength(1);
});
\`\`\`

Do not call end() as a substitute. end half-closes the client's request side, saying no more request messages will be sent while the client can continue reading responses. cancel terminates the RPC. A test that calls end and labels the result cancellation validates the wrong lifecycle.

The final length assertion is meaningful only because the test server stops its source synchronously on cancellation and the first event is a latch. In a deployed network, a message already in transit can race with cancellation. The protocol must decide whether clients discard post-cancel callbacks, deduplicate committed events, or tolerate one final message.

## Instrument the server's cleanup, not just its handler exit

gRPC libraries notify application handlers of cancellation, but generally cannot interrupt arbitrary work the handler spawned. The server implementation must cooperate. In Node, a server duplex call exposes cancellation state and emits a cancelled event. Attach cleanup when creating each resource, make it idempotent, and expose test-only counters through the fixture rather than sleeping and checking process memory.

\`\`\`typescript
import type { ServerDuplexStream } from '@grpc/grpc-js';

type ClientFrame = { subscribeTopic?: string; pingSequence?: string };
type ServerFrame = { sequence: string; topic: string; payload: string };

export const probe = {
  activeSubscriptions: new Set<string>(),
  cleanupCount: 0,
};

export function connect(call: ServerDuplexStream<ClientFrame, ServerFrame>): void {
  let timer: NodeJS.Timeout | undefined;
  let subscriptionId: string | undefined;
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (timer) clearInterval(timer);
    if (subscriptionId) probe.activeSubscriptions.delete(subscriptionId);
    probe.cleanupCount += 1;
  };

  call.on('data', (frame) => {
    if (!frame.subscribeTopic || subscriptionId) return;
    subscriptionId = 'sub-' + frame.subscribeTopic;
    probe.activeSubscriptions.add(subscriptionId);
    let sequence = 0;
    timer = setInterval(() => {
      if (call.cancelled) return;
      sequence += 1;
      call.write({
        sequence: String(sequence),
        topic: frame.subscribeTopic!,
        payload: 'event-' + sequence,
      });
    }, 10);
  });

  call.on('cancelled', cleanup);
  call.on('error', cleanup);
  call.on('end', () => {
    cleanup();
    call.end();
  });
}
\`\`\`

Production cleanup would unsubscribe from a broker, abort an upstream request, and detach listeners. The set and counter are a fixture probe, not the resource itself. Test that activeSubscriptions becomes empty and cleanupCount increments once. Idempotency matters because cancellation, error, and end-adjacent paths can race.

Do not perform new call.write operations after cancellation. Checking call.cancelled inside an interval reduces that risk, while clearing the interval removes the source. For asynchronous work, use an AbortController or library-specific cancellation primitive so completion callbacks also stop writing.

## Prove cancellation reaches the server within a bounded condition

After the client receives CANCELLED, server cleanup may not have completed in the same JavaScript turn. Poll a deterministic probe with a test deadline. A deadline on the assertion protects the suite; it is not the event that should cause server cleanup.

\`\`\`typescript
test('server releases the subscription when the client cancels', async () => {
  const before = probe.cleanupCount;
  const call = client.connect();
  call.on('error', () => {});
  call.write({ subscribeTopic: 'deployments' });

  await vi.waitFor(() => {
    expect(probe.activeSubscriptions.has('sub-deployments')).toBe(true);
  });

  call.cancel();

  await vi.waitFor(() => {
    expect(probe.activeSubscriptions.has('sub-deployments')).toBe(false);
    expect(probe.cleanupCount).toBe(before + 1);
  });
});
\`\`\`

The empty error listener prevents Node from treating the expected error event as unhandled in this server-focused case. A client-status test separately checks the code. Splitting the assertions makes a failure say either “wrong client termination” or “server leaked the subscription.”

For an out-of-process server, expose metrics or a controlled fake dependency rather than a mutable in-memory probe. Query active consumer count, leased connections, or a subscription registry through an authenticated test interface. Avoid scraping logs as the sole oracle because logging can be buffered or sampled.

## Distinguish cancellation from half-close, deadline, and transport loss

Several terminal paths may look alike to application code, but they mean different things and can carry different statuses.

| Termination trigger | Client action or condition | Expected client outcome | Server concern |
| --- | --- | --- | --- |
| Explicit cancellation | call.cancel() | CANCELLED unless another status already completed | Stop work and release resources |
| Request half-close | call.end() | Continue reading until server status | Finish protocol normally |
| Deadline expiry | Configured deadline passes | DEADLINE_EXCEEDED at client | Cancellation notification and cleanup |
| Server domain rejection | Server ends with non-OK status | Declared application status | No orphan resources |
| Connection or proxy failure | HTTP/2 transport breaks | Often UNAVAILABLE, possibly another transport-derived status | Detect closure and reconcile partial work |

Do not assert CANCELLED for every server-side observation of a deadline. The client sees DEADLINE_EXCEEDED when its deadline expires, while the server is notified that the call is cancelled. Assertions must be made at the correct endpoint.

Transport-loss tests require a real proxy or process boundary. Killing the server and calling it client cancellation creates misleading expectations. Keep explicit call.cancel tests fast and deterministic; place proxy reset and reconnect behavior in a separate resilience suite.

## Control partial-message semantics at the application layer

gRPC preserves message order within an individual stream, but cancellation does not roll back changes already made. If three command messages committed before cancellation, those effects remain unless the application implements compensation or transactions. A test expecting automatic rollback misunderstands the RPC lifecycle.

Design command streams with acknowledgements or idempotency keys when clients need to know what committed. Then a cancellation test can compare acknowledged sequence numbers with durable state. Without acknowledgements, exact processing count around a race is unknowable from the client.

For read-oriented feeds, the client should treat received messages as a prefix, not a complete dataset, when the final status is non-OK. Test the consumer so it does not mark a snapshot complete merely because some data arrived. A UI may display “connection stopped” while retaining partial items; an export job may discard its incomplete file. Those are domain policies layered above gRPC.

Backpressure deserves a dedicated case. Make the server produce faster than the test client reads, cancel while a write is pending, and verify the producer source stops. Avoid using an enormous message count as a proxy for backpressure. Instrument write return values and drain handling in Node, or use the language's documented flow-control API.

## Propagate cancellation to upstream calls and blocking work

A streaming handler often calls another gRPC service, subscribes to Kafka, or runs a database cursor. Cleaning only the outer call moves the leak downstream. On cancellation, cancel the child RPC or abort the adapter, then await or observe its cleanup within the server's lifecycle rules.

Build a fake upstream that announces start, cancellation, and completion. The test sequence is: establish outer stream, wait for upstream start, cancel outer client, then assert upstream cancellation happened and completion did not. This is stronger than checking a mocked method was called because it shows the in-flight operation reacted.

Language runtimes differ in automatic propagation. Do not copy a Java context-propagation assumption into Node or Go. The gRPC cancellation guide notes that some languages propagate outgoing calls automatically while others leave it to application code. Keep the propagation test in the server's implementation language.

CPU-bound work needs cooperative checkpoints. JavaScript that blocks the event loop cannot receive the cancelled event until it yields. Move heavy work to an abort-aware worker or break it into asynchronous chunks. A test that cancels and waits forever may be accurately reporting that the server cannot observe cancellation.

## Exercise the completion race without accepting every outcome

Cancellation can race with a normal server finish. gRPC clients and servers make independent local determinations, so their observations can differ. If the server already completed with OK before cancel takes effect, expecting CANCELLED is too strict. If cancellation wins before final status, accepting OK may hide a handler that ignored it.

Use barriers to create two deterministic cases. In the cancel-wins case, hold the server before Finish, cancel, confirm notification, then release. In the completion-wins case, let the final status arrive and only then call cancel; the completed result should remain completed. Do not write one nondeterministic test that allows either status and calls that race coverage.

Also test cancel twice. Client APIs should tolerate the application's cleanup path invoking cancellation idempotently, and server resource cleanup must run once. Test write-after-cancel behavior only to ensure your client wrapper prevents it; avoid depending on undocumented low-level exception timing.

## Choose test layers by the failure you need to localize

An in-process server gives precise resource probes and fast race control. A containerized server validates generated stubs and HTTP/2 behavior across a socket. A proxy test verifies resets and load-balancer timeouts. A deployed test sees observability and service-mesh policy. None replaces the others.

| Layer | Best cancellation evidence | What it cannot establish alone |
| --- | --- | --- |
| Handler unit test | Abort and cleanup branches | Real gRPC event ordering |
| In-process gRPC test | CANCELLED status plus resource probe | Proxy behavior |
| Multi-service integration | Upstream propagation and durable effects | Production mesh configuration |
| Fault-injected transport | Reset, reconnect, and partial delivery | Business cleanup internals without metrics |
| Production canary | Real telemetry and policy | Exhaustive deterministic races |

The [gRPC streaming contract testing guide](/blog/grpc-streaming-contract-testing-guide) helps define message ordering and partial-result semantics. For status, metadata, and all four RPC shapes, consult the [complete gRPC API testing guide](/blog/grpc-api-testing-complete-guide-2026).

In CI, close clients and shut servers down after every test. A leaked channel can keep Node running and blur the very resource problem being measured. Give assertions bounded deadlines, record final status and message counts, and never “fix” cancellation flakiness by allowing OK and CANCELLED indiscriminately.

## Verify interceptor behavior on an aborted stream

Streaming interceptors often own authentication state, metrics, tracing spans, and audit events. A handler can release its session correctly while an interceptor never closes a span because it watches only normal completion. Include one integration scenario that observes interceptor finalization after client cancellation.

Assert low-cardinality facts: method name, terminal gRPC code, and that the span or metric was finalized once. Do not require an exact internal error string or a particular transport description. Cancellation may surface at the pending send, receive, or context branch, but the interceptor should classify the public outcome consistently.

Audit logging needs a stated rule for partial work. Recording "chat completed" after one accepted message and a cancellation is misleading. Prefer an outcome such as cancelled plus the last acknowledged sequence when that metadata is safe. Test that an abrupt stream does not emit the normal success audit event.

If interceptors launch exporters asynchronously, expose a flush or recording fake rather than waiting for a telemetry backend. The cancellation test should prove instrumentation lifecycle, not the availability of an observability vendor.

## Run a bounded cancellation soak without obscuring the contract suite

One stream catches deterministic cleanup errors; repeated open, exchange, and cancel cycles can reveal accumulating sessions, subscriptions, or file descriptors. Keep this as a separate soak or scheduled test so its diagnostic model does not pollute the fast contract checks.

Drive a bounded number of iterations with unique session IDs. For each iteration, wait for an acknowledgement before cancelling and wait for the owned release signal before continuing. At the end, require the session registry to be empty and prove a fresh stream still exchanges messages. This creates deterministic synchronization even though the scenario repeats.

Measure process-level resources only as supporting evidence. Goroutine counts can fluctuate because grpc-go, DNS resolution, garbage collection, and telemetry maintain background work. A monotonically growing application-owned registry is much stronger evidence than a difference of two global goroutines.

When testing over TCP through a proxy, add connection-level metrics and use a fresh client connection policy that matches production. A bufconn soak validates service ownership but cannot establish how a load balancer detects abandoned clients. Keep the local and deployed conclusions labelled accurately.

The soak should have a firm overall deadline and print the last completed session identifier on failure. It should never accept a broad set of terminal codes merely to survive races. Establish latches so each cancellation happens at the same protocol point, then investigate any differing status as a real signal.

## Frequently Asked Questions

### Is call.end the same as call.cancel on a bidirectional stream?

No. end half-closes the client request side and still permits server responses. cancel terminates the RPC and normally produces CANCELLED if another terminal status has not already won.

### Can I assert exactly how many server messages were processed before cancellation?

Only with application acknowledgements or a server barrier. Client write completion does not prove remote business processing. Around cancellation, in-flight messages can race.

### Why does the client see DEADLINE_EXCEEDED while the server sees cancellation?

Deadline expiry is reported to the client as DEADLINE_EXCEEDED. On the server, expiry causes cancellation notification so work can stop. The two endpoints describe the same termination from different perspectives.

### Does gRPC roll back writes made before the stream was cancelled?

No. Cancellation does not undo committed effects. Use transactions, idempotency keys, acknowledgements, or compensation when the domain requires stronger partial-work semantics.

### What is the strongest server cleanup assertion?

Observe the actual owned resource: subscription removed, child RPC cancelled, cursor closed, timer cleared, and cleanup invoked once. Handler return or a log line alone does not prove those resources were released.
`,
};
