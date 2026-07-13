import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing LLM Streaming Chunk Order',
  description:
    'Test LLM streaming chunk order by parsing real SSE boundaries, tracking sequence metadata, detecting gaps and duplicates, and validating safe replay and completion.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing LLM Streaming Chunk Order

The final answer reads "Reset the cache," but the browser briefly rendered "Reset Reset the cache," and one reconnecting client saw the last sentence before the first. A final-string assertion misses both failures. Streaming quality depends on the event sequence: bytes must be parsed across arbitrary network boundaries, logical deltas must be applied once and in order, terminal events must arrive at the right time, and recovery must not replay content invisibly.

An effective suite tests at three layers. First, feed fragmented bytes into the protocol parser. Second, validate event identity and sequence rules in the stream consumer. Third, run an endpoint integration test with deliberate delays, coalescing, gaps, duplicates, and disconnects. This separates network chunking, which is allowed to be arbitrary, from application chunk ordering, which must follow the provider or gateway contract.

## Do not confuse transport chunks with model events

A \`ReadableStream\` yields byte chunks chosen by buffering, TLS records, proxy behavior, and timing. One read can contain half an SSE line, three complete events, or the end of one event plus the start of another. There is no requirement that a JavaScript read aligns with one token or one server write.

Server-Sent Events add logical framing. An event ends at a blank line. Consecutive \`data:\` fields belong to one event and are joined with newline semantics. Comment lines begin with a colon. \`id\`, \`event\`, and \`retry\` fields have protocol meaning. SSE is UTF-8.

| Unit | Boundary owner | Order guarantee to test |
|---|---|---|
| TCP/TLS bytes | Network stack | Byte order within one connection |
| Fetch read chunk | Runtime buffering | None relative to SSE event boundaries |
| SSE event | Event-stream parser | Fields assembled in source order |
| Provider delta | LLM API schema | Provider-defined sequence |
| UI update | Application consumer | Applied once in accepted event order |
| Reconnected stream | Server and resume logic | No lost or duplicated logical content |

A test that splits a string on \`\\n\\n\` once per \`reader.read()\` is testing an invalid parser. A test that asserts every read contains one JSON object can pass locally and fail behind a proxy.

## Write an incremental SSE parser that preserves carryover

The parser needs a text decoder used in streaming mode so a multibyte UTF-8 character split across reads is reconstructed correctly. It also needs a buffer for incomplete lines and an event accumulator.

The following TypeScript generator implements the SSE pieces commonly needed for LLM responses. It accepts a \`ReadableStream<Uint8Array>\`, handles CRLF and LF line endings, joins multiple data fields, ignores comments, and yields completed events.

\`\`\`typescript
export type ServerSentEvent = {
  event: string;
  data: string;
  id?: string;
};

export async function* parseSse(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<ServerSentEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let eventName = '';
  let eventId: string | undefined;
  let dataLines: string[] = [];

  const dispatch = (): ServerSentEvent | null => {
    if (dataLines.length === 0) return null;
    const parsed = {
      event: eventName || 'message',
      data: dataLines.join('\\n'),
      id: eventId,
    };
    eventName = '';
    dataLines = [];
    return parsed;
  };

  const processLine = (line: string): ServerSentEvent | null => {
    if (line === '') return dispatch();
    if (line.startsWith(':')) return null;

    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'event') eventName = value;
    if (field === 'data') dataLines.push(value);
    if (field === 'id' && !value.includes('\\0')) eventId = value;
    return null;
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      const lines = buffer.split(/\\r\\n|\\r|\\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const event = processLine(line);
        if (event) yield event;
      }

      if (done) {
        if (buffer.length > 0) processLine(buffer);
        const finalEvent = dispatch();
        if (finalEvent) yield finalEvent;
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
\`\`\`

Production parsers may need full specification behavior around last-event ID persistence, BOM handling, \`retry\`, and whether an unterminated final event should dispatch. The browser's native \`EventSource\` already implements the protocol but does not support every authentication and request-body pattern used by LLM POST endpoints. If you use a maintained parser library, test its integration rather than replacing it casually.

## Fragment bytes at hostile positions

Parser tests should split input at every byte boundary for compact fixtures, especially around:

- The two newlines ending an event.
- The colon after \`data\`.
- A CRLF pair.
- Opening and closing JSON braces.
- A multibyte character such as \`€\` or an emoji.
- The \`[DONE]\` sentinel if the provider uses one.
- Two events coalesced in one read.

Here is a runnable Vitest table that creates a stream from arbitrary fragments:

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { parseSse } from './parse-sse';

function byteStream(parts: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(part);
      controller.close();
    },
  });
}

async function collect(parts: Uint8Array[]) {
  const events = [];
  for await (const event of parseSse(byteStream(parts))) events.push(event);
  return events;
}

describe('parseSse', () => {
  it('parses two events delivered in one transport chunk', async () => {
    const bytes = new TextEncoder().encode(
      'id: 7\\ndata: {"delta":"Hel"}\\n\\nid: 8\\ndata: {"delta":"lo"}\\n\\n',
    );

    await expect(collect([bytes])).resolves.toEqual([
      { event: 'message', id: '7', data: '{"delta":"Hel"}' },
      { event: 'message', id: '8', data: '{"delta":"lo"}' },
    ]);
  });

  it('reassembles UTF-8 and framing split across reads', async () => {
    const bytes = new TextEncoder().encode('data: {"delta":"€"}\\r\\n\\r\\n');
    const parts = Array.from(bytes, (byte) => Uint8Array.of(byte));

    await expect(collect(parts)).resolves.toEqual([
      { event: 'message', id: undefined, data: '{"delta":"€"}' },
    ]);
  });

  it('joins multiple data fields in one logical event', async () => {
    const bytes = new TextEncoder().encode('event: note\\ndata: first\\ndata: second\\n\\n');

    await expect(collect([bytes])).resolves.toEqual([
      { event: 'note', id: undefined, data: 'first\\nsecond' },
    ]);
  });
});
\`\`\`

The one-byte fragmentation case is intentionally harsher than a normal network. It proves the parser makes no accidental alignment assumptions. Keep the fixture small so exhaustive splitting remains fast.

## Define an application envelope with sequence identity

SSE preserves order on one connection, but gateways, retries, multiplexed upstreams, or application bugs can still emit duplicate or logically reordered deltas. Text alone cannot always reveal the defect. If two adjacent deltas are both spaces, duplication may be invisible after trimming. Add explicit metadata at the gateway you control:

\`\`\`json
{
  "streamId": "answer-8f31",
  "sequence": 12,
  "kind": "text_delta",
  "delta": "deployment",
  "upstreamEventId": "evt_01J..."
}
\`\`\`

The sequence should be monotonically contiguous according to a documented starting value. \`streamId\` prevents events from another response being accepted. A stable event or upstream ID supports duplicate suppression. The terminal event should contain the last accepted sequence and, when practical, a checksum or authoritative final text for reconciliation.

| Envelope field | Assertion | Failure exposed |
|---|---|---|
| \`streamId\` | Equal for all events in response | Cross-request interleaving |
| \`sequence\` | Exactly previous plus one | Missing, duplicated, or reordered event |
| \`kind\` | Allowed transition for current state | Delta after completion |
| \`delta\` | Present for text event, may be empty only if specified | Malformed provider mapping |
| \`upstreamEventId\` | Unique within stream | Gateway replay |
| Completion sequence | Equals last delta sequence | Premature terminal marker |

Do not infer ordering from arrival timestamps. Clocks can collide or drift, and timestamps describe observation time rather than source position.

## Build a consumer that fails closed on gaps

The consumer owns policy for duplicates and gaps. Silently appending an out-of-order event corrupts the answer. Silently sorting buffered events may hide a gateway defect and can wait forever for a missing sequence. For interactive text, failing the stream and offering a retry is usually safer than showing reordered advice.

\`\`\`typescript
type DeltaEnvelope = {
  streamId: string;
  sequence: number;
  kind: 'text_delta' | 'completed';
  delta?: string;
};

export class OrderedAnswer {
  private streamId: string | null = null;
  private nextSequence = 0;
  private completed = false;
  private text = '';

  accept(event: DeltaEnvelope): void {
    if (this.completed) throw new Error('event received after completion');

    this.streamId ??= event.streamId;
    if (event.streamId !== this.streamId) {
      throw new Error(\`stream changed from \${this.streamId} to \${event.streamId}\`);
    }
    if (event.sequence !== this.nextSequence) {
      throw new Error(
        \`expected sequence \${this.nextSequence}, received \${event.sequence}\`,
      );
    }

    if (event.kind === 'text_delta') {
      if (event.delta === undefined) throw new Error('text delta is missing');
      this.text += event.delta;
    } else {
      this.completed = true;
    }

    this.nextSequence += 1;
  }

  snapshot(): { text: string; completed: boolean } {
    return { text: this.text, completed: this.completed };
  }
}
\`\`\`

This contract counts the completion event in the same sequence. Your API may number only deltas; adjust the invariant, document it, and test it. The important point is to choose one convention.

Tests should inject \`0, 1, 1\` for a duplicate, \`0, 2\` for a gap, \`1, 0\` for reordering, a changed stream ID, and a delta after completion. Assert both the error and the unchanged accepted prefix. A consumer must not partially append the invalid event before rejecting it.

## Distinguish cumulative snapshots from deltas

Providers expose different semantics. A delta stream might send \`"Hel"\`, then \`"lo"\`; concatenation produces \`"Hello"\`. A cumulative stream might send \`"Hel"\`, then \`"Hello"\`; concatenation produces \`"HelHello"\`. Tool-call arguments may arrive as JSON string fragments and should not be parsed until the provider indicates completion.

Document each event kind:

| Payload style | Example sequence | Consumer operation |
|---|---|---|
| Text delta | \`Hel\`, \`lo\` | Append |
| Cumulative text | \`Hel\`, \`Hello\` | Replace snapshot |
| JSON argument delta | \`{"ci\`, \`ty":"Pune"}\` | Append bytes/string, parse at completion |
| Structured patch | Path and operation | Apply ordered patch |
| Usage update | Token counters | Replace or aggregate per contract |
| Completion | Finish reason and metadata | Seal stream, do not render as text |

Never reuse the text-delta reducer for tool calls merely because both fields are strings. Escaping, partial Unicode, and nested JSON make intermediate tool arguments invalid by design.

## Simulate an endpoint, not only a parser

An integration fixture should control writes and connection closure. A small Node HTTP server can emit proper \`text/event-stream\` responses with \`res.write()\`, but remember that the client may still receive writes coalesced. That is desirable: assert logical events, not write boundaries.

\`\`\`typescript
import { createServer } from 'node:http';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { parseSse } from './parse-sse';

let server: ReturnType<typeof createServer>;
let baseUrl: string;

beforeAll(async () => {
  server = createServer((request, response) => {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    response.write('id: 0\\ndata: {"sequence":0,"delta":"Order "}\\n\\n');
    setTimeout(() => {
      response.write('id: 1\\ndata: {"sequence":1,"delta":"confirmed"}\\n\\n');
      response.end('event: completed\\ndata: {"sequence":2}\\n\\n');
    }, 15);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('missing port');
  baseUrl = \`http://127.0.0.1:\${address.port}\`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

test('preserves logical order across delayed server writes', async () => {
  const response = await fetch(baseUrl);
  expect(response.headers.get('content-type')).toContain('text/event-stream');
  if (!response.body) throw new Error('response body missing');

  const events = [];
  for await (const event of parseSse(response.body)) events.push(event);

  expect(events.map((event) => event.id)).toEqual(['0', '1', '1']);
  expect(events.map((event) => event.event)).toEqual([
    'message',
    'message',
    'completed',
  ]);
});
\`\`\`

This example also reveals an SSE detail: the last-event ID persists until another \`id\` field changes it, so the completion event inherits \`1\` in this parser. If your application identity comes from JSON sequence metadata, do not confuse it with SSE's reconnect ID.

## Reconnection changes the definition of duplicate

Native \`EventSource\` reconnects when the connection closes and sends \`Last-Event-ID\` when an ID was set. A custom fetch client must implement resume behavior explicitly if required. The server may replay the last acknowledged event, resume after it, or restart the entire answer. Test the declared policy.

Useful disconnect points include:

- After an event ID line but before its data.
- Midway through a multibyte character.
- After data but before the blank-line dispatch.
- Immediately after a fully dispatched event.
- Before and after the completion marker.

Only fully dispatched events should advance the consumer's durable checkpoint. If reconnect begins from event 7 and event 7 was already applied, deduplicate by stable event ID or sequence before appending. If the server starts a new \`streamId\`, clear or replace the partial answer according to the UI contract rather than combining two generations.

Exactly-once delivery is rarely provided by the network alone. The practical goal is exactly-once application through identity, checkpointing, and idempotent consumption.

## Assert completion, finish reason, and resource cleanup

The final text can be correct while stream lifecycle is broken. Add assertions for:

- Exactly one completion event.
- No text or tool deltas after completion.
- Finish reason belongs to the supported set.
- An aborted client cancels or releases upstream work.
- Reader lock is released.
- UI loading state ends on normal completion and error.
- Partial content is labeled or removed after failure.
- Usage metadata, if provided, is accepted at the documented phase.

A timeout should distinguish "no first event" from "stream stalled after sequence 14." Those incidents have different owners. Track time to first logical delta and maximum inter-event gap without inventing universal thresholds. Use budgets derived from the service and environment.

For cross-release behavior, the [LLM regression testing guide](/blog/llm-regression-testing-guide-2026) helps separate deterministic protocol checks from probabilistic answer checks. The [LLM observability traces guide](/blog/llm-observability-traces-guide-2026) explains how stream and upstream identifiers support production diagnosis.

## Production observability that supports the test model

Log metadata, not sensitive generated text, unless your data policy explicitly allows content capture. Useful fields include stream ID, request trace ID, sequence, upstream event ID, event kind, byte count, receive timestamp, apply result, duplicate count, gap count, and finish reason.

Compare gateway logs with client telemetry for a failed trace. If the gateway emitted \`10, 12\`, the source or gateway dropped 11. If the gateway logged \`10, 11, 12\` but the client applied \`10, 12\`, investigate parsing or UI consumption. If the client received all three but rendered an incorrect string, inspect reducer semantics.

Metrics should not label all disconnects as failures. Users navigate away and abort intentionally. Separate client cancellation, upstream error, protocol violation, and network loss.

## A focused stream-order test matrix

Keep deterministic protocol coverage comprehensive and sampled end-to-end model coverage smaller:

| Scenario | Parser expectation | Consumer expectation |
|---|---|---|
| One event per read | Produces all events | Applies contiguous sequence |
| All events in one read | Same logical output | Same final answer |
| One byte per read | Reassembles UTF-8 and fields | Unchanged result |
| Duplicate sequence | Valid event parsing | Reject or deduplicate per policy |
| Missing sequence | Valid later event | Fail with gap diagnostic |
| Reversed events | Emits arrival order | Reject first invalid sequence |
| Completion twice | Emits both | Reject second completion |
| Truncated JSON | Emits data text | Schema parser reports malformed event |
| Disconnect and replay | Parses each connection | Applies each identity once |
| Wrong stream ID | Parses normally | Reject cross-stream contamination |

This matrix remains valid even when model wording changes because it tests transport and event contracts. Keep semantic assertions in a separate layer.

## Backpressure and a slow rendering consumer

A browser may receive deltas faster than React or another UI layer should render them. Batching display updates is reasonable, but batching must not reorder the underlying accepted events. Keep protocol consumption and visual scheduling separate: validate and append every sequence to an internal buffer, then render snapshots at a controlled cadence.

Test with a deliberately slow render callback while the mock endpoint emits quickly. The accepted sequence should remain contiguous, the final snapshot should match the reducer's text, and completion should wait until all accepted content is available to the UI. Monitor memory growth for a consumer that cannot keep pace. Dropping intermediate visual frames is acceptable when the final accumulated text is preserved; dropping protocol deltas is not.

## Frequently Asked Questions

### Should every ReadableStream chunk contain one LLM token?

No. Read chunks are arbitrary byte groupings and may split or combine protocol events. Parse the event framing first, then interpret provider deltas.

### Is SSE event order enough to detect a missing delta?

No. Remaining events still arrive in order after one is lost upstream. Add contiguous sequence metadata or stable event IDs at a gateway you control.

### Can I sort events by sequence after receiving them?

Sorting can hide a live ordering defect and cannot solve a permanently missing event. For interactive output, reject or buffer only under a documented bounded policy, and surface gaps explicitly.

### How should tool-call argument chunks be tested?

Accumulate them according to the provider's delta contract, preserve order, and parse JSON only when the argument stream is complete. Include fragments split inside escapes and multibyte characters.

### What should happen to partial text after a stream error?

That is a product decision. Common safe choices are removing it, marking it incomplete, or offering a full retry. The test should ensure partial content is never presented as a completed authoritative answer.
`,
};
