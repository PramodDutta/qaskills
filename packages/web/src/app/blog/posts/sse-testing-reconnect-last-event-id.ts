import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SSE Testing Reconnect Last Event ID: Prevent Data Loss',
  description: 'Use SSE testing reconnect Last Event ID workflows to catch missed events, duplicate delivery, replay gaps, partial frames, and proxy buffering before release.',
  date: '2026-08-07',
  category: 'API Testing',
  content: `
# SSE Testing Reconnect Last Event ID: Prevent Data Loss

SSE testing for reconnect and Last-Event-ID should prove one precise property: after a client loses an EventSource connection, the next connection identifies the last fully processed event and the server resumes according to its documented replay policy. A green initial connection is not enough. The useful test crosses the failure boundary, records what the client accepted, reconnects with the correct HTTP header, and verifies both continuity and duplicate handling.

The safest approach is to test at three levels. Use a parser-level test for framing, an in-process integration test for replay state, and a deployed-path test through the same reverse proxy used in production. Together they reveal failures that ordinary request assertions miss, including IDs attached to incomplete events, off-by-one replay queries, stale retention windows, line-ending bugs, and buffering that makes a healthy stream look silent.

## Turn the reconnect promise into observable invariants

Server-Sent Events use a long-lived HTTP response with the \`text/event-stream\` media type. An event can contain \`id\`, \`event\`, \`data\`, and \`retry\` fields. A blank line dispatches the assembled event. When a browser EventSource reconnects, it can send the last event ID value in the \`Last-Event-ID\` request header. That sounds simple, but a test needs a sharper contract than “reconnect works.”

Start by deciding what the ID means. Most systems use a monotonic database sequence, log offset, or durable message identifier. The server should document whether reconnection replays events strictly after the supplied ID, includes the supplied event, or rejects IDs outside the retained range. The common “strictly after” policy produces these invariants:

| Invariant | Test observation | Typical defect exposed |
|---|---|---|
| IDs are ordered in one stream | Each accepted numeric ID is greater than the previous ID | Concurrent publishers emit in commit order incorrectly |
| Resume is exclusive | First resumed ID is greater than \`Last-Event-ID\` | SQL query uses \`>=\` and duplicates the boundary |
| No retained event is skipped | Combined IDs form the expected contiguous sequence | Cursor is advanced before event dispatch |
| Incomplete frames do not advance state | Reconnect header uses last blank-line-terminated event | Client records \`id\` as soon as the line arrives |
| Unknown old IDs have a defined result | Response or control event matches policy | Silent data loss after retention cleanup |
| Heartbeats are not business events | Comments do not enter the received-event list | Parser treats every line as data |

These invariants separate transport facts from business guarantees. SSE itself does not promise durable retention, exactly-once processing, or numeric contiguous IDs. Your application contract supplies those properties. A notification feed may allow a snapshot refresh when history expires, while an audit feed may require durable replay. Write assertions for the promise users actually depend on.

## Build a small parser that respects SSE dispatch boundaries

Node HTTP clients expose byte chunks, not complete SSE messages. A chunk may end midway through \`data:\`, contain several events, or split a UTF-8 character. Tests that call \`chunk.toString().split("\\n\\n")\` independently for every chunk are unreliable because chunk boundaries have no protocol meaning.

Keep a streaming decoder and line buffer. The following test helper implements the parts needed for controlled API tests: comments, multi-line data, event names, IDs, CRLF normalization, and dispatch on a blank line.

\`\`\`ts
import { StringDecoder } from 'node:string_decoder';

type SseEvent = {
  id?: string;
  event?: string;
  data: string;
};

export function createSseParser(onEvent: (event: SseEvent) => void) {
  const decoder = new StringDecoder('utf8');
  let pending = '';
  let current: { id?: string; event?: string; data: string[] } = { data: [] };

  function processLine(rawLine: string) {
    const line = rawLine.endsWith('\\r') ? rawLine.slice(0, -1) : rawLine;
    if (line === '') {
      if (current.data.length > 0) {
        onEvent({
          id: current.id,
          event: current.event,
          data: current.data.join('\\n'),
        });
      }
      current = { data: [] };
      return;
    }
    if (line.startsWith(':')) return;

    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'data') current.data.push(value);
    if (field === 'event') current.event = value;
    if (field === 'id' && !value.includes('\\0')) current.id = value;
  }

  return {
    push(chunk: Buffer) {
      pending += decoder.write(chunk);
      let newline = pending.indexOf('\\n');
      while (newline !== -1) {
        processLine(pending.slice(0, newline));
        pending = pending.slice(newline + 1);
        newline = pending.indexOf('\\n');
      }
    },
    end() {
      pending += decoder.end();
    },
  };
}
\`\`\`

This helper deliberately does not dispatch an unterminated final event. That behavior matters for reconnect tests. If the connection ends after \`id: 42\` and \`data: partial\` but before the blank line, event 42 was not delivered. A client must reconnect from the last dispatched ID, perhaps 41, so the server can resend 42.

Test the parser independently before trusting higher-level results:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { createSseParser } from './sse-parser';

describe('SSE parser', () => {
  it('dispatches split and multi-line frames only after a blank line', () => {
    const events: Array<{ id?: string; data: string }> = [];
    const parser = createSseParser((event) => events.push(event));

    parser.push(Buffer.from('id: 7\\r\\ndata: first'));
    parser.push(Buffer.from(' line\\r\\ndata: second line\\r\\n'));
    expect(events).toEqual([]);

    parser.push(Buffer.from('\\r\\n'));
    expect(events).toEqual([
      { id: '7', event: undefined, data: 'first line\\nsecond line' },
    ]);
  });
});
\`\`\`

The parser test is fast and deterministic. It catches a large class of false reconnect failures before sockets, databases, and timers enter the picture.

## Model a replay store before opening a real socket

A replayable stream needs durable state outside the connection. In production that may be PostgreSQL, Redis Streams, Kafka, or an append-only application table. For an integration test, an in-memory store can make the replay rule explicit without pretending to validate production persistence.

\`\`\`ts
type StoredEvent = { id: number; type: string; payload: unknown };

export class EventLog {
  private events: StoredEvent[] = [];

  append(type: string, payload: unknown): StoredEvent {
    const event = { id: this.events.length + 1, type, payload };
    this.events.push(event);
    return event;
  }

  after(lastEventId?: string): StoredEvent[] {
    if (lastEventId === undefined || lastEventId === '') return [...this.events];
    if (!/^\\d+$/.test(lastEventId)) {
      throw new Error('Last-Event-ID must be a positive integer');
    }
    const cursor = Number(lastEventId);
    return this.events.filter((event) => event.id > cursor);
  }
}

export function encodeEvent(event: StoredEvent): string {
  return [
    \`id: \${event.id}\`,
    \`event: \${event.type}\`,
    \`data: \${JSON.stringify(event.payload)}\`,
    '',
    '',
  ].join('\\n');
}
\`\`\`


The store uses an exclusive comparison. If the last fully handled ID is 12, replay begins at 13. A test should not assume contiguous values unless the application promises them. UUIDs or opaque offsets can work, but the storage query must define their ordering and validity.

## Exercise two physical connections in one integration test

Supertest is excellent for finite HTTP requests, and the [Supertest Node API testing guide](/blog/supertest-node-api-testing-complete-guide) covers that foundation. A never-ending SSE body needs lower-level stream control, however, because the test must stop reading without asking the server to finish naturally. Node's \`http.request\` gives direct access to headers, chunks, and socket destruction.

Create a helper that resolves after a selected number of dispatched events. It should destroy only the client request once the condition is met, not shut down the application server.

\`\`\`ts
import http from 'node:http';
import { createSseParser } from './sse-parser';

type ReadOptions = {
  port: number;
  lastEventId?: string;
  take: number;
};

export function readEvents(options: ReadOptions): Promise<Array<{ id?: string; data: string }>> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = { Accept: 'text/event-stream' };
    if (options.lastEventId !== undefined) {
      headers['Last-Event-ID'] = options.lastEventId;
    }

    const request = http.request({
      host: '127.0.0.1',
      port: options.port,
      path: '/events',
      headers,
    });

    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(\`Unexpected status \${response.statusCode}\`));
        request.destroy();
        return;
      }
      const events: Array<{ id?: string; data: string }> = [];
      const parser = createSseParser((event) => {
        events.push(event);
        if (events.length === options.take) {
          resolve(events);
          request.destroy();
        }
      });
      response.on('data', (chunk: Buffer) => parser.push(chunk));
      response.on('error', (error) => {
        if (!request.destroyed) reject(error);
      });
    });
    request.on('error', (error) => {
      if (!request.destroyed) reject(error);
    });
    request.end();
  });
}
\`\`\`

Now write the central scenario. Seed five events, consume two, close the first connection, append two more, then reconnect using ID 2. The expected replay contains 3 through 7 exactly once.

\`\`\`ts
import { afterEach, beforeEach, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createApp } from './app';
import { EventLog } from './event-log';
import { readEvents } from './read-events';

let server: Server;
let port: number;
let log: EventLog;

beforeEach(async () => {
  log = new EventLog();
  server = createApp(log).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No TCP address');
  port = address.port;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()),
  );
});

it('replays every event after the last dispatched ID', async () => {
  for (let id = 1; id <= 5; id += 1) log.append('order', { sequence: id });

  const first = await readEvents({ port, take: 2 });
  expect(first.map((event) => event.id)).toEqual(['1', '2']);

  log.append('order', { sequence: 6 });
  log.append('order', { sequence: 7 });

  const resumed = await readEvents({ port, lastEventId: '2', take: 5 });
  expect(resumed.map((event) => event.id)).toEqual(['3', '4', '5', '6', '7']);
  expect(new Set(resumed.map((event) => event.id)).size).toBe(5);
});
\`\`\`

This test verifies the boundary but not timing magic. It waits for observable socket and event conditions, uses an ephemeral port, and closes the server after each case. Avoid arbitrary sleeps. A 100 millisecond delay can pass locally and fail under CI load without revealing anything about correctness.

## Force a disconnect inside an event frame

The most valuable negative test terminates the response after an ID and data line but before the dispatching blank line. This reproduces a real failure caused by a process crash, load balancer reset, Wi-Fi switch, or deployment termination.

Add a test-only route or injectable writer that can stop at a deterministic byte position. Keep that fault hook outside production routing when possible.

\`\`\`ts
app.get('/test/partial-event', (_request, response) => {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  response.write('id: 42\\n');
  response.write('event: invoice.updated\\n');
  response.write('data: {"status":"paid"}\\n');
  response.destroy();
});
\`\`\`

The client assertion has two parts. First, the parser callback must not receive event 42. Second, the next normal request must send the last previously dispatched ID, not 42. A common broken client stores the ID whenever it parses an \`id:\` line. That quietly skips event 42 after reconnect.

| Disconnect location | Event dispatched? | Reconnect cursor |
|---|---:|---|
| Before \`id:\` line | No | Previous dispatched ID |
| After \`id:\`, before blank line | No | Previous dispatched ID |
| Halfway through UTF-8 data | No | Previous dispatched ID |
| Immediately after terminating blank line | Yes | New event ID |
| During a comment heartbeat | No business event | Most recent business event ID |

Do not conflate “bytes reached the kernel” with “the consumer processed the event.” If downstream handling is asynchronous and side effects matter, the application may need its own durable consumer checkpoint. Browser EventSource tracks protocol dispatch, not completion of your database transaction.

## Verify header semantics without imitating a browser incorrectly

On the first request, a client normally omits \`Last-Event-ID\`. On reconnection it sends the last known value. The header name is case-insensitive, but its value should be treated as opaque unless your API explicitly restricts its format. A raw Node client lets the test inspect and set it.

Server tests should cover this decision table:

| Incoming value | Recommended explicit behavior | Assertion |
|---|---|---|
| Header absent | Start at current snapshot or configured beginning | Documented initial event set |
| Known retained ID | Replay strictly after the cursor | First replay ID follows cursor |
| Latest ID | Wait for future events | No historic duplicate |
| Malformed ID | Return a clear 4xx response or defined reset event | No silent coercion to zero |
| Expired valid ID | Return reset instruction, snapshot, or explicit error | Client cannot mistake a gap for continuity |
| ID from another tenant | Reject or reveal nothing | No cross-tenant event leakage |

Security deserves emphasis. If IDs are globally increasing, an authenticated tenant must not retrieve another tenant's events by guessing a cursor. Filter authorization and cursor selection in the same query or transaction. The reconnect test should create events for two tenants and prove each stream contains only its own records.

## Diagnose buffering, compression, and silent streams

An application can pass in-process tests and still fail behind a proxy. Some intermediaries buffer small response chunks. Compression middleware can also accumulate bytes before flushing. The connection returns \`200\`, yet the browser receives several events in a burst or only after the buffer fills.

Use a deployed-path probe that records arrival time rather than only total content:

\`\`\`bash
curl -N \\
  -H 'Accept: text/event-stream' \\
  -H 'Last-Event-ID: 120' \\
  https://staging.example.test/events
\`\`\`

The \`-N\` option tells curl not to buffer its own output. It does not disable server or proxy buffering. Publish known events one at a time and record when each becomes visible. Also inspect response headers and proxy configuration using the official documentation for your deployed stack.

A useful diagnosis sequence is:

1. Connect directly to the application port. If events arrive incrementally, parsing and application flushing probably work.
2. Connect through the reverse proxy. If delivery becomes batched, focus on proxy buffering or compression.
3. Send comment heartbeats such as \`: keep-alive\\n\\n\`. If they also arrive in batches, the issue is below business-event serialization.
4. Capture application timestamps for “event committed” and “response write attempted,” then compare them with client receipt time.
5. Test long idle periods near infrastructure timeout thresholds, using documented platform limits rather than guessed sleeps.

Do not assert that every heartbeat arrives at an exact millisecond. Shared CI machines and networks introduce jitter. Assert an upper bound generous enough for the environment and retain timing diagnostics on failure.

## Test retention gaps as a first-class API outcome

Replay storage is finite in many systems. Suppose the stream retains IDs 900 through 1200 and a sleeping client returns with \`Last-Event-ID: 450\`. Returning event 900 as if it follows 450 creates silent loss. The API must signal that continuity is impossible.

Three defensible policies are common:

| Gap policy | Client action | Suitable use |
|---|---|---|
| HTTP error with machine-readable body | Fetch snapshot, then reconnect | APIs with a separate state endpoint |
| Named SSE reset event | Replace local state from included snapshot or URL | Streams designed around EventSource |
| Durable retention for contractual period | Continue normal replay | Audit or financial workflows |

For an HTTP error policy, assert status, content type, stable error code, oldest available ID, and absence of event-stream framing. For a reset event, assert its event name, schema, and that the client does not apply later deltas until reset succeeds. This boundary belongs in a [Pact contract testing workflow](/blog/contract-testing-pact-complete-guide) when multiple teams own producer and consumer, but a contract test complements rather than replaces the socket-level replay test.

Retention tests should control the clock or store contents directly. Filling a log and waiting hours for expiry is slow and flaky. Inject a clock into retention logic, or seed records with known timestamps in an isolated database.

## Make duplicate delivery harmless even when replay is correct

Networks can fail after the server writes an event but before the client knows whether it received the complete frame. Reconnection may legitimately yield a duplicate near the boundary, especially with application-level acknowledgments layered above SSE. Claiming universal exactly-once delivery is unsafe.

Use event IDs as idempotency keys in the consumer. The handling transaction can record processed IDs with the side effect. Then a repeated ID becomes a no-op. Test this independently by feeding the same event twice and checking that the side effect occurs once.

\`\`\`ts
it('deduplicates a replayed invoice event', async () => {
  const event = {
    id: 'invoice-stream:8841',
    event: 'invoice.paid',
    data: '{"invoiceId":"inv-77","amount":4900}',
  };

  await consumer.handle(event);
  await consumer.handle(event);

  expect(await ledger.countEntriesFor('inv-77')).toBe(1);
  expect(await checkpoints.has('invoice-stream:8841')).toBe(true);
});
\`\`\`

The checkpoint and side effect should be atomic where loss would be costly. If the application marks an ID processed and crashes before writing the ledger entry, replay will skip work. If it writes the ledger and crashes before recording the checkpoint, replay duplicates work. A database transaction or naturally idempotent downstream operation closes that gap.

## What teams get wrong about Last-Event-ID

The most persistent mistake is testing reconnection by issuing a second request with a hard-coded cursor. That proves the server can parse a header, but it does not prove the client chose the last fully dispatched ID. The partial-frame test is what connects those two responsibilities.

Other frequent errors include asserting chunk boundaries, assuming IDs are always integers, expecting EventSource to expose arbitrary response bodies on failed connections, and treating a \`200\` response as evidence of live delivery. Tests also become misleading when they publish an event before the stream subscription is active. Coordinate on a server-side “subscriber registered” signal or wait for an initial ready event defined by the protocol.

Another mistake is using production retention cleanup in every test. Most cases need a deterministic fake or seeded store. Reserve a smaller set of database-backed tests for the actual query, transaction order, and cleanup boundary.

## A release-ready SSE reconnect test matrix

Organize coverage by risk rather than multiplying nearly identical happy paths.

| Layer | Core cases | Failure evidence to retain |
|---|---|---|
| Parser unit | CRLF, split UTF-8, comments, multi-line data, incomplete frame | Raw chunk sequence and parsed callbacks |
| Replay-store integration | Missing, known, latest, malformed, expired cursor | Seeded IDs and generated query result |
| Socket integration | Disconnect after event, mid-frame reset, new publish during gap | Connection number, sent header, received IDs |
| Consumer integration | Duplicate ID, handler crash, transaction rollback | Checkpoint and side-effect records |
| Deployed path | proxy buffering, idle timeout, rolling deployment | timestamps, headers, proxy route |
| Authorization | tenant cursor guessing, revoked session on reconnect | principal, tenant filter, returned IDs |

Run parser and in-process socket cases on every change. Run deployed probes against an environment that matches production routing. A nightly or pre-release disruption suite can restart instances and hold idle connections longer without slowing ordinary pull requests.

When an AI coding agent generates a new SSE test, give it the invariants, framing samples, and retention policy, not just “test reconnect.” Ask it to show where the cursor advances and to include a mid-frame disconnect. Review generated helpers for chunk assumptions and unbounded promises. Ready-made QA skills can also be installed from qaskills.sh with the qaskills CLI when a repeatable workflow is preferable to one-off prompting.

## Frequently Asked Questions

### Should an SSE server replay the event named by Last-Event-ID?

Usually the server replays events strictly after that ID because the named event was already dispatched. That convention is an application policy, not a substitute for documentation. Some systems deliberately include the boundary and rely on consumer deduplication. Tests should encode the chosen rule and verify the first returned ID. For strict resume, seed events around the cursor and assert that the supplied ID is absent while its successor is present. Also test the latest ID, which should wait for future events rather than replaying the boundary.

### How can I test browser EventSource when custom request headers are unavailable?

Use two complementary tests. A Node integration client can set \`Last-Event-ID\` explicitly and precisely validate server replay. A browser test can exercise native EventSource by allowing it to receive an event, forcing the server connection to close, and observing automatic reconnection. Instrument the test server to record headers on each connection, then assert that the later request carried the expected cursor. Keep authentication realistic because EventSource configuration differs from a general fetch call, and avoid inventing browser behavior through a custom polyfill unless the application actually ships one.

### What timeout should an SSE reconnect test use in CI?

Choose a timeout from measured environment behavior and the application's reconnect policy, then keep correctness assertions independent of exact scheduling. Parser and in-process replay tests should finish quickly because they use deterministic signals. Browser and deployed-path cases need a wider bound for network and retry delay. On failure, print connection timestamps, received IDs, and the header used for each attempt. Avoid fixed sleeps as synchronization. Wait for subscription readiness, event count, socket closure, or another observable condition, with one overall deadline that prevents a hung stream from blocking the suite.

### Does Last-Event-ID guarantee exactly-once event processing?

No. It helps a client request a resume position, but failures can occur around dispatch, application handling, and checkpoint persistence. A server may resend an event near an uncertain boundary, and a consumer can crash after producing a side effect but before recording completion. Design handlers to be idempotent, use stable event IDs, and atomically store checkpoints with important side effects when possible. Test both no-gap replay and deliberate duplicate input. The realistic target is continuous, duplicate-tolerant processing under the documented retention policy, not an unsupported exactly-once claim.
`,
};
