import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mock a Server-Sent Events Stream in Playwright',
  description:
    'Mock a Server-Sent Events stream in Playwright with a controllable HTTP fixture, then verify incremental rendering, reconnection, IDs, and malformed events.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Mock a Server-Sent Events Stream in Playwright

One chunk says the job is queued. Two hundred milliseconds later, another says it is rendering. The browser must expose both transitions before the terminal “complete” event arrives. If a Playwright mock returns the whole payload in one response, the final screen may look right while the behavior users actually experience remains untested.

Server-Sent Events (SSE) is an HTTP response held open with the \`text/event-stream\` media type. The server writes UTF-8 text records over time, and the browser's \`EventSource\` dispatches them as events. A useful test double therefore needs temporal control: send one frame, let the test inspect the DOM, send another, disconnect, and optionally accept a reconnection. This tutorial builds that double as a small Node HTTP server owned by a Playwright worker fixture.

## Why route.fulfill is the wrong primitive for incremental delivery

Playwright's \`page.route()\` and \`browserContext.route()\` are excellent for finite HTTP mocks. A route handler can fulfill a request with status, headers, and a body. That API represents a completed response body, however. It does not give the test a writable socket that remains open while assertions run.

You can fulfill an SSE-shaped string and test parsing of several records, but the browser receives the mocked body as a completed unit. That cannot prove that the first notification renders before the second exists, that a loading indicator persists while the connection is open, or that reconnect behavior works after transport loss.

| Test objective | Static route fulfillment | Controllable HTTP stream |
|---|---:|---:|
| Verify the endpoint URL and request headers | Good fit | Good fit |
| Parse several SSE records | Possible, but delivered together | Delivered with real record boundaries |
| Assert intermediate UI state | Timing is artificial | Test chooses exactly when each frame arrives |
| Exercise native EventSource reconnection | Cannot simulate socket lifecycle faithfully | Can end one response and accept the next |
| Check \`Last-Event-ID\` on reconnect | Not representative | Directly observable on the second request |
| Hold the connection open during an assertion | No writable response remains | Natural behavior |

Network interception remains valuable around SSE. Use it to observe requests, block unrelated traffic, or mock the REST call that starts a job. For a broader map of routing, HAR replay, and service-worker caveats, read the [Playwright network interception and mocking guide](/blog/playwright-network-mocking-route-handler-guide). The stream itself deserves a transport that can actually stream.

## Encode SSE records correctly

An SSE stream is line-oriented. A blank line terminates an event. Each field uses \`name: value\`; multiple \`data:\` lines are joined by the browser with newline characters. A line beginning with a colon is a comment and can act as a heartbeat. The standardized fields are \`event\`, \`data\`, \`id\`, and \`retry\`.

| Wire field | Browser effect | Test case worth keeping |
|---|---|---|
| \`data:\` | Supplies \`MessageEvent.data\` as text | JSON payload is parsed and rendered |
| \`event:\` | Dispatches a named event instead of only \`message\` | Product listens for \`progress\` and \`complete\` separately |
| \`id:\` | Updates the connection's last event ID | Reconnect sends \`Last-Event-ID\` where applicable |
| \`retry:\` | Sets reconnection delay in milliseconds when valid | Short deterministic delay in a reconnect test |
| \`: heartbeat\` | Comment, no message event dispatched | Connection stays active without changing UI |
| Empty line | Ends the current record | Missing terminator delays dispatch |

Return \`Content-Type: text/event-stream\`, disable caching for test clarity, and keep the HTTP connection alive. Do not add \`Content-Length\`, because the final size is not known while the response remains open. Flush headers before waiting for the test to send its first frame, otherwise some stacks delay the response until body bytes appear.

## Build a stream controller fixture

The fixture below starts one HTTP server per Playwright worker on an ephemeral loopback port. Every incoming \`/events\` response is stored as an open stream. Tests call \`send()\` to write a correctly framed event and \`disconnect()\` to end current responses. Requests and their headers are retained so reconnection can be asserted without guessing.

\`\`\`ts
import { createServer, type ServerResponse } from 'node:http';
import { test as base } from '@playwright/test';

type SseEvent = {
  event?: string;
  data?: string;
  id?: string;
  retry?: number;
};

type StreamController = {
  url: string;
  requests: Array<{ lastEventId?: string }>;
  send: (event: SseEvent) => void;
  comment: (text: string) => void;
  disconnect: () => void;
};

export const test = base.extend<{}, { sse: StreamController }>({
  sse: [
    async ({}, use) => {
      const clients = new Set<ServerResponse>();
      const requests: Array<{ lastEventId?: string }> = [];

      const server = createServer((request, response) => {
        if (request.url !== '/events') {
          response.writeHead(404).end();
          return;
        }

        requests.push({
          lastEventId: request.headers['last-event-id'],
        });
        response.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });
        response.flushHeaders();
        clients.add(response);
        response.on('close', () => clients.delete(response));
      });

      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('No TCP address');

      const write = (text: string) => clients.forEach((client) => client.write(text));
      await use({
        url: \`http://127.0.0.1:\${address.port}/events\`,
        requests,
        send: ({ event, data = '', id, retry }) => {
          const lines = [
            event === undefined ? '' : \`event: \${event}\n\`,
            id === undefined ? '' : \`id: \${id}\n\`,
            retry === undefined ? '' : \`retry: \${retry}\n\`,
            ...data.split('\n').map((line) => \`data: \${line}\n\`),
            '\n',
          ];
          write(lines.join(''));
        },
        comment: (text) => write(\`: \${text}\n\n\`),
        disconnect: () => clients.forEach((client) => client.end()),
      });

      clients.forEach((client) => client.end());
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
    { scope: 'worker' },
  ],
});
\`\`\`

This is ordinary Node and Playwright fixture API, with no invented streaming hooks. The server is worker-scoped because binding a port per test adds needless setup, while its clients are naturally cleared when each page closes. If tests can run concurrently inside one worker through custom orchestration, add a unique stream path or channel key per test. Standard Playwright tests within a worker execute serially.

## Point the application at the fixture without replacing EventSource

The highest-value browser test keeps the production \`EventSource\` implementation. Inject only the endpoint address. Applications commonly read it from a startup configuration object, a query parameter in non-production builds, or the response of a job-creation API.

For an app that reads \`window.__APP_CONFIG__.eventsUrl\` during boot, \`page.addInitScript()\` installs the value before page scripts execute. The test then waits for the server to observe the subscription before sending data. Polling the fixture's request array is deterministic because it describes the transport precondition, not elapsed time.

\`\`\`ts
import { expect } from '@playwright/test';
import { test } from './sse-fixture';

test('renders each export phase before completion', async ({ page, sse }) => {
  await page.addInitScript((eventsUrl) => {
    window.__APP_CONFIG__ = { eventsUrl };
  }, sse.url);

  await page.goto('/exports/exp-73');
  await expect.poll(() => sse.requests.length).toBe(1);

  sse.send({
    event: 'progress',
    id: 'evt-101',
    data: JSON.stringify({ phase: 'queued', percent: 0 }),
  });
  await expect(page.getByRole('status')).toHaveText('Queued, 0%');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

  sse.comment('keep-alive');
  await expect(page.getByRole('status')).toHaveText('Queued, 0%');

  sse.send({
    event: 'progress',
    id: 'evt-102',
    data: JSON.stringify({ phase: 'rendering', percent: 65 }),
  });
  await expect(page.getByRole('status')).toHaveText('Rendering, 65%');

  sse.send({
    event: 'complete',
    id: 'evt-103',
    data: JSON.stringify({ downloadUrl: '/files/exp-73.csv' }),
  });
  await expect(page.getByRole('link', { name: 'Download CSV' })).toHaveAttribute(
    'href',
    '/files/exp-73.csv',
  );
});
\`\`\`

TypeScript will need a declaration for the application-specific \`window.__APP_CONFIG__\` shape. That is production interface typing, not a Playwright requirement. If configuration comes from an HTTP endpoint instead, mock that finite endpoint with \`page.route()\` and return \`sse.url\` in its JSON body.

Avoid replacing \`window.EventSource\` unless the test specifically targets application code independent of browser transport. A JavaScript fake can be useful in component tests, but it bypasses URL construction, native parsing, ready-state transitions, HTTP headers, and reconnect behavior. Here the local server provides control without discarding those semantics.

## Prove reconnection and event resumption

Native EventSource reconnects after an unexpected connection close unless application code calls \`close()\`. A server-provided \`retry\` field can keep the test quick. Send an event with an ID and a small, reasonable retry delay, terminate the response, then wait until the fixture records a second request.

\`\`\`ts
import { expect } from '@playwright/test';
import { test } from './sse-fixture';

test('resumes notifications after a dropped stream', async ({ page, sse }) => {
  await page.addInitScript((eventsUrl) => {
    window.__APP_CONFIG__ = { eventsUrl };
  }, sse.url);
  await page.goto('/operations/op-91');
  await expect.poll(() => sse.requests.length).toBe(1);

  sse.send({
    event: 'progress',
    id: '17',
    retry: 100,
    data: JSON.stringify({ completed: 3, total: 8 }),
  });
  await expect(page.getByText('3 of 8 complete')).toBeVisible();

  sse.disconnect();
  await expect(page.getByText('Reconnecting…')).toBeVisible();
  await expect.poll(() => sse.requests.length).toBe(2);
  expect(sse.requests[1].lastEventId).toBe('17');

  sse.send({
    event: 'progress',
    id: '18',
    data: JSON.stringify({ completed: 4, total: 8 }),
  });
  await expect(page.getByText('4 of 8 complete')).toBeVisible();
});
\`\`\`

Whether \`Last-Event-ID\` is visible can be affected by origin and implementation details, so keep the fixture and application under controlled browser versions in CI. More importantly, test the product's resumption contract. If the backend replays missed events, the client must deduplicate by ID. If it sends only the latest snapshot, assertions should reflect snapshot semantics rather than expecting every intermediate notification.

SSE and WebSocket tests share some failure scenarios, but the transports behave differently. SSE is server-to-client over HTTP with built-in EventSource reconnection; WebSocket is bidirectional and uses frames after an upgrade handshake. The [WebSocket testing guide](/blog/websocket-testing-guide) covers those protocol-specific checks.

## Exercise malformed records without corrupting the fixture abstraction

A polished helper that always emits valid frames cannot test parser resilience. Add a narrowly named \`writeRaw(text)\` method when you need protocol-negative cases, rather than overloading \`send()\` with impossible event objects. Then test one fault per scenario: invalid JSON in a valid SSE record, an unknown event name, a record without an ID, or a partial record followed by disconnect.

Separate protocol validity from domain validity. \`data: not-json\n\n\` is valid SSE carrying invalid application data. A line without the terminating blank line is an incomplete SSE record and should not dispatch yet. An unknown field is ignored by the EventSource parser. These cases should lead to different UI or telemetry behavior if the application distinguishes them.

Do not assert browser console silence as the only outcome. A robust client might log a parsing error, retain the last good progress value, expose a recoverable warning, and continue reading later events. Specify those visible behaviors. Also verify that a malformed event does not unlock a completion-only control or replace valid state with \`NaN\`.

## Keep the mock honest under CI conditions

Bind to \`127.0.0.1\` and use port zero so the operating system allocates an available port. Avoid hard-coded ports that collide across parallel workers. Keep test stream state per worker or key it by a unique URL. Always close responses before closing the server, because an open keep-alive connection can otherwise prevent teardown from finishing.

Do not compress the local event stream. Intermediaries may buffer compressed output, and the goal is predictable chunk visibility. Production proxy buffering deserves a separate environment-level test against the deployed route. A loopback fixture validates browser and application behavior, not CDN, ingress, or load-balancer configuration.

Use web-first assertions after each \`send()\`. The write reaching Node's socket does not mean React, Vue, or another UI layer has rendered. Conversely, no arbitrary pause is needed: \`toHaveText\` retries until the expected state appears or its assertion timeout expires.

When a test fails, log the exact raw frames and connection sequence. A concise transcript such as connection 1, event 17, disconnect, connection 2, event 18 is more diagnostic than a video of a stalled progress bar. Attach it through \`testInfo.attach()\` in fixture teardown when the status differs from the expected status.

## Decide which layer should own each SSE test

Not every edge case belongs in a browser suite. Put text framing and server retry policy under backend integration tests. Put reducer logic for duplicate IDs and out-of-order domain payloads under fast unit tests. Use Playwright for the seam where native EventSource, application subscription code, and visible user state meet.

| Layer | Best SSE coverage | What it deliberately omits |
|---|---|---|
| Unit test | Payload parser, event reducer, deduplication | Browser EventSource and HTTP connection |
| Component test with fake source | Subscription cleanup and rendering branches | Native wire parsing and reconnect headers |
| Playwright plus local stream | Incremental UI, open connection, drop and reconnect | Production reverse proxy behavior |
| Deployed environment test | TLS, ingress buffering, authentication, idle timeouts | Fine-grained deterministic frame control |

This distribution keeps the browser suite focused and the protocol checks deep. One strong incremental rendering test and one reconnection test usually provide more confidence than many static bodies mislabeled as streams.

## Carry authentication into the streaming request

EventSource construction is more constrained than \`fetch\`. The browser automatically sends cookies that apply to the endpoint, and the constructor supports a \`withCredentials\` option for cross-origin credential behavior. The native API does not let application code attach an arbitrary Authorization header. Tests must reflect whichever authentication design production uses rather than giving the fixture a test-only header channel.

For same-origin cookie authentication, serve the stream through the application origin or set a valid session cookie for the stream host. For a cross-origin stream, configure CORS precisely and decide whether credentials are allowed. A wildcard \`Access-Control-Allow-Origin\` is not compatible with credentialed CORS. The simple fixture above uses a wildcard because its sample stream is intentionally unauthenticated; change the response headers when testing credentials.

Add assertions at the server boundary. Record \`request.headers.cookie\`, Origin, and query parameters, but do not copy secrets into test reports. Verify an unauthenticated connection receives the product's chosen \`401\` or \`403\` response and that the UI enters a terminal sign-in state instead of reconnecting forever. Then authenticate and prove events arrive.

Token-in-query designs need extra scrutiny because URLs appear in browser history, reverse-proxy logs, and diagnostics. If the application uses a short-lived signed stream URL, mock the finite token-minting endpoint, assert the URL expires or is single-purpose, and let native EventSource connect to the local server. Do not encode a permanent bearer token into the test URL just to make setup easy.

Also test logout. Open the stream, invalidate the session through the UI, and have the server end the connection. A reconnect should not silently restore access with stale credentials. The expected result may be a clean EventSource close initiated by application code, a failed reauthorization, or a new signed URL, but it must match the production threat model.

## Frequently Asked Questions

### Can page.route() stream chunks from route.fulfill()?

Treat \`route.fulfill()\` as a finite response mock. It can return SSE-formatted text, but it does not expose an open writable response for test-controlled incremental chunks. Use a local HTTP server when delivery timing is part of the assertion.

### Why does my EventSource request never reach the Playwright route handler?

A service worker may be intercepting it first. Playwright documents that routes do not see requests handled by service workers. For tests using native routing, consider a context with \`serviceWorkers: 'block'\`, while recognizing that this changes application behavior.

### Should the test send JSON directly or include data lines?

Send real SSE framing. EventSource exposes the concatenated \`data:\` field as a string, and the application decides whether to parse JSON. Skipping the framing would test a different interface.

### How can I test a heartbeat without waiting for the production interval?

Have the fixture write a colon-prefixed comment immediately. Assert that no user-visible progress changes and that the connection remains usable by sending a normal event afterward.

### What should happen to open streams when a Playwright test ends?

Closing the page normally closes its EventSource connection. The fixture should still end any remaining responses and close its HTTP server during teardown so leaked clients cannot hold the worker open.
`,
};
