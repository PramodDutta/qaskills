import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Server-Sent Events Testing Guide',
  description:
    'Server-Sent Events testing guide for validating SSE streams, reconnect behavior, event ordering, heartbeats, deployed buffering, and timeouts.',
  date: '2026-07-10',
  category: 'API Testing',
  content: `
# Server-Sent Events Testing Guide

An SSE endpoint can pass a smoke test by returning \`200 OK\` and still fail the moment a proxy buffers chunks, a browser reconnects without the right cursor, or a heartbeat disappears during a quiet market window. Server-Sent Events are simple on paper, but they are long-lived streams, and long-lived streams need different tests than ordinary JSON routes.

SSE uses an HTTP response with \`text/event-stream\). The server writes fields such as \`event:\`, \`data:\`, \`id:\`, and \`retry:\` as lines, then terminates one message with a blank line. Browsers consume the stream through \`EventSource\`, automatically reconnect, and send \`Last-Event-ID\` when they have a remembered event ID.

This guide is for teams testing notification feeds, progress updates, agent execution logs, dashboards, and live status panels. If your application uses bidirectional sockets, compare the tradeoffs in the [WebSocket testing guide](/blog/websocket-testing-guide). For general HTTP contract and reliability coverage, keep the [API testing best practices guide](/blog/api-testing-best-practices-guide) nearby.

## SSE Tests Need Stream Assertions, Not Response Assertions

A normal API test checks status, headers, and a complete body. An SSE test checks the response while it is still open. That changes the test design. You need to assert chunks, message boundaries, ordering, connection lifetime, and client behavior after disconnects.

| Concern | Ordinary JSON endpoint | SSE endpoint |
|---|---|---|
| Body shape | Complete JSON document | Sequence of framed messages |
| Completion | Response ends quickly | Response may stay open indefinitely |
| Timeout | Usually a failure | Often expected if no event arrives |
| Retry behavior | Client decides manually | Browser \`EventSource\` reconnects automatically |
| Cursor | Usually query params or page tokens | \`id:\` field and \`Last-Event-ID\` header |
| Proxy behavior | Buffering is often harmless | Buffering can break real-time delivery |

The first test should prove the endpoint really streams. A handler that accumulates data and flushes once at the end is not an SSE feed, even if the content type is correct.

## A Minimal Express SSE Endpoint Worth Testing

The server must set the right headers, flush an initial connection if your platform requires it, write messages in SSE format, and clean up when the client disconnects. This Express example keeps a list of clients and sends named events.

\`\`\`ts
import express from 'express';

const app = express();
const clients = new Set<express.Response>();

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(': connected\\n\\n');
  clients.add(res);

  req.on('close', () => {
    clients.delete(res);
  });
});

app.post('/publish/:id', express.json(), (req, res) => {
  const payload = JSON.stringify(req.body);
  const id = req.params.id;

  for (const client of clients) {
    client.write('id: ' + id + '\\n');
    client.write('event: notification\\n');
    client.write('data: ' + payload + '\\n\\n');
  }

  res.status(202).json({ deliveredTo: clients.size });
});

app.listen(3000);
\`\`\`

This is intentionally small. Production code usually needs authentication, replay, backpressure strategy, and heartbeat scheduling. The test surface is still visible: headers, initial comment, named event, ID, data payload, and disconnect cleanup.

## Parse the Stream in Tests Instead of Sleeping

Node's \`fetch\` can read the response body as a stream. A reliable test reads until it has enough framed SSE messages, then aborts the request. Avoid arbitrary sleeps. The parser can be small if the test only needs the fields your endpoint emits.

\`\`\`ts
import { describe, expect, it } from 'vitest';

type SseMessage = {
  id?: string;
  event?: string;
  data: string[];
};

function parseSseBlock(block: string): SseMessage {
  const message: SseMessage = { data: [] };

  for (const line of block.split('\\n')) {
    if (line.startsWith('id:')) message.id = line.slice(3).trimStart();
    if (line.startsWith('event:')) message.event = line.slice(6).trimStart();
    if (line.startsWith('data:')) message.data.push(line.slice(5).trimStart());
  }

  return message;
}

async function readMessages(url: string, wanted: number): Promise<SseMessage[]> {
  const controller = new AbortController();
  const response = await fetch(url, { signal: controller.signal });
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const messages: SseMessage[] = [];
  let buffer = '';

  while (messages.length < wanted) {
    const result = await reader.read();
    if (result.done) break;

    buffer += decoder.decode(result.value, { stream: true });

    while (buffer.includes('\\n\\n')) {
      const boundary = buffer.indexOf('\\n\\n');
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (!block.startsWith(':')) messages.push(parseSseBlock(block));
    }
  }

  controller.abort();
  return messages;
}

describe('SSE notifications', () => {
  it('streams a named notification event with an event id', async () => {
    const streamPromise = readMessages('http://localhost:3000/events', 1);

    await fetch('http://localhost:3000/publish/evt-101', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'build finished' }),
    });

    const messages = await streamPromise;

    expect(messages[0]).toMatchObject({
      id: 'evt-101',
      event: 'notification',
      data: ['{"message":"build finished"}'],
    });
  });
});
\`\`\`

This test does not rely on a browser. It verifies the server stream framing directly. Browser-level \`EventSource\` tests are still useful, but server stream tests catch many regressions faster.

## Reconnect Tests Need a Durable Cursor

Reconnect behavior is the feature that makes SSE attractive and the place where many implementations are incomplete. When the browser reconnects, it sends the last event ID in the \`Last-Event-ID\` header. Your server should resume from the next event, not replay everything and not skip the event after the cursor.

A server that supports replay needs an event log or cursorable store. The test can call the endpoint with a \`Last-Event-ID\` header and assert the first delivered event.

\`\`\`ts
import { expect, test } from 'vitest';

test('resumes after Last-Event-ID without duplicating the cursor event', async () => {
  const response = await fetch('http://localhost:3000/events', {
    headers: {
      'Last-Event-ID': 'evt-200',
    },
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let text = '';

  while (!text.includes('\\n\\n')) {
    const chunk = await reader.read();
    if (chunk.done) break;
    text += decoder.decode(chunk.value, { stream: true });
  }

  await reader.cancel();

  expect(text).toContain('id: evt-201');
  expect(text).not.toContain('id: evt-200');
});
\`\`\`

This test assumes your fixture store already has \`evt-200\` and \`evt-201\`. The important part is the assertion: resume after the cursor. If your product intentionally replays the cursor event for idempotent clients, document that behavior and test it explicitly.

## Ordering, Gaps, and Duplicates

SSE preserves order on one connection because it is one HTTP response stream. That does not automatically guarantee product-level ordering across reconnects, multiple publishers, multiple instances, or replay stores. Tests should match the ordering contract your UI depends on.

| Ordering risk | Test to write | Production design hint |
|---|---|---|
| Reconnect duplicates the last event | Connect with \`Last-Event-ID\`, assert cursor event is absent | Resume strictly after cursor |
| Reconnect skips one event | Seed adjacent IDs, assert the next ID arrives first | Use monotonic IDs or store offsets |
| Multi-instance publish order differs | Publish through the real broker or store, assert emitted order | Centralize ordering in one stream source |
| Client receives same event twice | Simulate reconnect and deduplicate in client state | Make event IDs stable and idempotent |
| Gaps are possible after retention | Ask for old cursor, assert reset event or documented error | Send a resync instruction |

For dashboards, duplicates may be harmless if the client replaces by ID. For agent logs, duplicates can confuse users but are tolerable if lines are keyed. For financial or workflow state, skipping an event can be severe. Match test depth to the business consequence.

## Heartbeats Are Part of the Contract

SSE allows comment lines that begin with \`:\`. Many servers send periodic comments as heartbeats to keep intermediaries from closing idle connections. If your feed can be quiet for minutes, heartbeat tests are worth writing.

Test heartbeat timing with generous windows. Do not assert millisecond precision. Assert that at least one comment arrives before a known idle timeout.

| Environment | Why heartbeats matter | Test expectation |
|---|---|---|
| Browser tab behind corporate proxy | Idle connections may be closed | Comment frame arrives before proxy timeout |
| Serverless or edge route | Platform may buffer or terminate idle responses | Stream flushes early and stays active for supported duration |
| Mobile network | Intermittent disconnects happen | Client reconnect behavior remains correct |
| Quiet notification feed | No data events for long periods | Heartbeat proves connection is alive |

Heartbeats should not update application state. The client should ignore comments. A test that treats a heartbeat as a business event is testing the wrong thing.

## Browser EventSource Tests

Server stream tests are fast, but one or two browser tests protect the real client integration. A browser test should verify that \`EventSource\` handlers receive named events and that the UI updates. It should not duplicate every server framing test.

With Playwright, a minimal browser-level check can expose an SSE fixture page, publish an event, and assert the DOM update. The server still needs its own stream tests because browser failures can be harder to diagnose.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('notification panel appends SSE notification events', async ({ page, request }) => {
  await page.goto('/notifications');

  await request.post('/publish/evt-310', {
    data: { message: 'deployment promoted' },
  });

  await expect(page.getByTestId('notification-list')).toContainText('deployment promoted');
});
\`\`\`

This test exercises browser integration: \`EventSource\`, event listener wiring, JSON parsing, rendering, and user-visible state. It does not need to inspect raw stream chunks because a lower-level test already does that.

## Timeouts and Test Cleanup

Every SSE test needs an exit strategy. If a test waits forever for a message, the suite will hang. Use \`AbortController\`, reader cancellation, framework test timeouts, or a helper that races stream reading against a timer.

Also verify server cleanup. Long-lived responses can leak memory if disconnected clients remain in a set. In integration tests, expose a test-only metric or inspect server state through a safe hook. Do not ship a public client-count endpoint just for tests.

| Cleanup point | Failure symptom | Test strategy |
|---|---|---|
| Client abort | Server keeps response in client set | Abort request, assert internal count drops in test environment |
| Browser navigation | Old connection remains open | Navigate away, inspect server connection metric |
| Network disconnect | Reconnect storm | Simulate close and assert retry backoff behavior at client level |
| Test timeout | Suite hangs | Always cancel reader or abort fetch |

Timeouts should be part of the helper, not copy-pasted into every test. A single stream reader with a deadline prevents most accidental hangs.

## Authentication and Authorization

SSE endpoints often carry sensitive data: notifications, build logs, support chat updates, or private agent traces. Test authorization before stream behavior. An unauthorized request should fail quickly, not open a stream and later send an error event.

For cookie-authenticated browser clients, a browser test is useful because native \`EventSource\` cannot set arbitrary headers. For token-based clients, fetch-level tests can cover header behavior. Be explicit about what your client actually uses.

| Auth style | Test focus |
|---|---|
| Session cookie | Browser opens stream only after login, logout closes or prevents stream |
| Bearer token through polyfill | Missing or expired token returns 401 before streaming |
| Signed stream URL | Expired signature fails and cannot be replayed |
| Tenant-scoped feed | User from another tenant never receives seeded events |

Do not send a business event that says "unauthorized" over an already-open stream. That can confuse clients and proxies. Prefer a normal HTTP failure before the stream starts.

## Proxy and Platform Behavior

SSE is sensitive to buffering. A reverse proxy that waits for large buffers before flushing can make the feed appear dead. Add an environment-level smoke test against staging or a deploy preview that checks time to first chunk.

The test does not need to be complex. Open the stream, measure that the initial comment or heartbeat arrives within a reasonable threshold, then abort. Mark the threshold as environmental, not a product SLA, unless the product genuinely promises it.

Also check headers. \`Cache-Control: no-cache, no-transform\` helps prevent intermediaries from transforming or buffering in ways that break streaming. Compression can be problematic for some streaming paths if it delays flushes. Test the deployed path, not only local Express.

## Client-Side Deduplication Tests

Even with a correct server, reconnects can deliver duplicates in real networks. Clients should usually deduplicate by event ID when events update state or append logs. Test that behavior with a fake EventSource or a small event bus abstraction.

| UI pattern | Deduplication behavior |
|---|---|
| Notification list | Ignore duplicate event IDs |
| Build log | Append only unseen line IDs |
| Progress bar | Last event for a job wins |
| Agent step timeline | Replace existing step by ID, preserve order |

This is not an excuse for server duplicates, but it makes the client resilient. SSE systems are distributed systems in miniature. Idempotency matters.

## Testing Backpressure and Slow Clients

SSE sends data over one long response. If a client reads slowly, the server must avoid unbounded memory growth. Node, Java, Go, and reverse proxies expose this differently, but the test question is the same: what happens when the producer emits faster than the client consumes?

For high-volume feeds, add a test-only publisher that emits a burst while a client intentionally delays reads. Assert the server either applies a bounded queue, drops allowed event types, closes the connection with a documented reconnect path, or slows the producer. Do not leave the behavior accidental.

| Feed type | Slow-client policy |
|---|---|
| Build log stream | Buffer within a limit, then require replay from event ID |
| Price ticker | Drop intermediate updates and send latest state |
| Audit trail | Do not drop, rely on durable replay store |
| Agent progress steps | Preserve ordered milestones, drop redundant heartbeat-like updates |
| Notification badge count | Send latest count, not every intermediate increment |

This policy should be visible to client developers. If the UI assumes every event arrives and the server drops intermediate events under pressure, the product will show inconsistent state. If the server buffers everything for a disconnected mobile client, infrastructure will pay the price.

## Contract Testing the Event Payloads

SSE framing is only half the contract. The \`data:\` field often contains JSON with its own shape. Test those payloads separately from the stream parser. A notification event might require \`id\`, \`message\`, \`severity\`, and \`createdAt\`. A progress event might require \`jobId\`, \`step\`, and \`percent\`.

Keep one test that proves the server frames the payload correctly and another that validates payload schema or decoder behavior. This separation makes failures obvious. A broken blank line is a stream framing failure. A missing \`jobId\` is a payload contract failure. Mixing both into one broad browser test turns debugging into guesswork.

For versioned clients, include an unknown field case and a missing optional field case. SSE streams live long enough that old browser tabs may receive new event shapes after a deployment.

## Frequently Asked Questions

### Should I test SSE with \`EventSource\` or raw \`fetch\` streams?

Use both at different layers. Raw stream tests are faster and better for headers, framing, IDs, heartbeats, and replay. Browser \`EventSource\` tests prove the real client wiring and UI behavior.

### How do I assert reconnect behavior without waiting for a real disconnect?

Call the SSE endpoint with a \`Last-Event-ID\` header and seeded events. Assert the first delivered event after the cursor. Then keep one browser or client test that simulates a close if reconnect handling is critical.

### What should an SSE heartbeat look like?

A common heartbeat is a comment frame such as \`: ping\\n\\n\`. Clients ignore comments, but proxies see bytes on the connection. Test that a heartbeat arrives before your known idle cutoff.

### Can SSE carry multiple event types on one endpoint?

Yes, through the \`event:\` field. Test each named event that the client handles, and include an unknown event case if the client must ignore future event types safely.

### Why does my SSE test pass locally but fail behind a proxy?

Local tests often bypass buffering, compression, idle timeouts, and platform response limits. Add a deployed-path smoke test that measures time to first chunk and validates the headers used by the real route.
`,
};
