import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'How to Test WebSocket Messages in Cypress',
  description:
    'Test WebSocket messages in Cypress by controlling server events, observing browser state, and asserting reconnection, ordering, and malformed-frame behavior reliably.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# How to Test WebSocket Messages in Cypress

The price on screen changes from 101.25 to 101.40 without a fetch request, page navigation, or button click. A WebSocket frame triggered that state transition. Cypress can test the outcome, but \`cy.intercept()\` is not a frame-level WebSocket mock, so the usual REST recipe of aliasing a route and waiting for a response is the wrong abstraction.

Cypress transparently proxies WebSocket connections. Real connections work during a test, and the upgrade request can be observed, but Cypress documentation explicitly states that stubbing individual messages or frames is not natively supported by \`cy.intercept()\`. Reliable tests therefore need one of three control points: the server that emits messages, the application callback that consumes them, or a purpose-built WebSocket test seam.

## Decide what contract the test owns

A WebSocket feature has several layers, and no single browser test should pretend to validate all of them.

| Layer under test | Useful stimulus | Strong assertion |
|---|---|---|
| Message decoder | Direct function call with text or binary input | Parsed domain event or explicit rejection |
| Client state reducer | Typed domain event | Exact state transition, deduplication, ordering rule |
| Browser integration | Controlled server message | Rendered UI and user-visible status |
| Protocol integration | Real WebSocket server | Subprotocol, authentication, close codes, reconnect behavior |
| Production path | Staging service or contract environment | End-to-end data arrival with bounded diagnostics |

Most Cypress coverage belongs at browser integration. Use a real lightweight server or a test-only server control endpoint to emit deterministic messages, then assert the application’s visible state. Test parsing edge cases in unit tests because they are faster and can enumerate malformed payloads precisely.

The broader [WebSocket testing guide](/blog/websocket-testing-guide) covers handshake, performance, security, and backend concerns. Here the focus is Cypress’s browser execution model.

## A controllable WebSocket server for Cypress

The \`ws\` package provides a real Node.js WebSocket server. This example also exposes a small HTTP control plane. Cypress calls \`POST /__test__/broadcast\`; the server broadcasts the supplied JSON to connected browser clients. This follows Cypress’s documented recommendation to control messages from the server through an action such as \`cy.request()\`.

Keep the endpoint available only in a test process. Never deploy an unauthenticated broadcast route with production code.

\`\`\`typescript
// test-support/realtime-server.ts
import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

const httpServer = createServer((request, response) => {
  if (request.method !== 'POST' || request.url !== '/__test__/broadcast') {
    response.writeHead(404).end();
    return;
  }

  const chunks: Buffer[] = [];
  request.on('data', (chunk: Buffer) => chunks.push(chunk));
  request.on('end', () => {
    const message = Buffer.concat(chunks).toString('utf8');

    for (const client of sockets.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }

    response.writeHead(202, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ delivered: true }));
  });
});

const sockets = new WebSocketServer({ server: httpServer, path: '/prices' });

sockets.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'connected', sequence: 0 }));
});

httpServer.listen(4100, '127.0.0.1', () => {
  console.log('Realtime test server listening on 4100');
});
\`\`\`

Point the application’s WebSocket URL at \`ws://127.0.0.1:4100/prices\` through a test environment variable or runtime configuration. Start this server before Cypress and stop the process afterward. The test server is not a mock of one browser callback: it exercises the browser’s WebSocket implementation, serialization, application listener, state update, and rendering.

## Trigger a frame and assert client state

The Cypress test should establish that the application is connected before broadcasting. Waiting for a user-visible connection state is better than sleeping for a guessed number of milliseconds. The command retry model will poll DOM assertions until they pass or time out. The examples use \`findByRole\`, \`findByTestId\`, and \`findAllByText\` from the registered \`@testing-library/cypress\` commands.

\`\`\`typescript
// cypress/e2e/live-prices.cy.ts
describe('live price feed', () => {
  beforeEach(() => {
    cy.visit('/markets/BTC-USD', {
      onBeforeLoad(window) {
        window.localStorage.setItem('access_token', 'test-user-token');
      },
    });
    cy.findByRole('status').should('have.text', 'Live');
  });

  it('renders a newer quote received over WebSocket', () => {
    cy.request('POST', 'http://127.0.0.1:4100/__test__/broadcast', {
      type: 'quote.updated',
      symbol: 'BTC-USD',
      price: 101.4,
      sequence: 42,
      observedAt: '2026-07-13T09:30:00.000Z',
    }).its('status').should('eq', 202);

    cy.findByTestId('last-price').should('have.text', '101.40');
    cy.findByTestId('quote-sequence').should('have.text', '42');
  });
});
\`\`\`

\`cy.request()\` runs from the Cypress process, not from the application frame, so browser CORS restrictions do not block the control call. The message itself still travels through the actual WebSocket connection to the browser.

Avoid \`cy.wait(1000)\`. A fixed wait is simultaneously too slow when the message arrives quickly and too short on a loaded CI worker. The DOM assertion retries and stops as soon as the required state appears.

## Prove ordering and duplicate handling

Real-time clients frequently receive duplicates after reconnect or delayed messages from buffers. A test that only proves “a message can update text” misses the client logic most likely to corrupt state.

Suppose the contract requires monotonically increasing sequence numbers. Send sequence 44, then an older 43, then duplicate 44. The UI should remain on the event at 44 and any side effect, such as a notification, should occur once.

\`\`\`typescript
const broadcast = (body: object) =>
  cy.request('POST', 'http://127.0.0.1:4100/__test__/broadcast', body);

it('ignores stale and duplicate quote events', () => {
  const base = {
    type: 'quote.updated',
    symbol: 'ETH-USD',
    observedAt: '2026-07-13T10:00:00.000Z',
  };

  broadcast({ ...base, price: 2501, sequence: 44 });
  cy.findByTestId('last-price').should('have.text', '2,501.00');

  broadcast({ ...base, price: 2490, sequence: 43 });
  broadcast({ ...base, price: 2501, sequence: 44 });

  cy.findByTestId('last-price').should('have.text', '2,501.00');
  cy.findAllByText('Price updated').should('have.length', 1);
});
\`\`\`

This scenario only makes sense if sequence ordering is part of the product contract. If the service uses event timestamps, entity versions, or last-write-wins semantics, test that rule instead. Do not invent a client ordering guarantee after implementation.

## Expose a narrow observation seam when the UI is insufficient

Some important messages update an in-memory cache without rendering immediately. A test-only observation seam can make those transitions inspectable without replacing the WebSocket implementation.

Define a typed debug surface only in test builds. The application records accepted domain events after validation, not raw network frames containing credentials.

\`\`\`typescript
// In the application client
type AcceptedEvent = {
  type: string;
  sequence?: number;
};

declare global {
  interface Window {
    __realtimeTestEvents?: AcceptedEvent[];
  }
}

export function recordAcceptedEvent(event: AcceptedEvent): void {
  if (import.meta.env.MODE === 'test') {
    window.__realtimeTestEvents ??= [];
    window.__realtimeTestEvents.push(event);
  }
}
\`\`\`

Then Cypress can query the browser state with retryable assertions:

\`\`\`typescript
cy.window()
  .its('__realtimeTestEvents')
  .should((events) => {
    expect(events).to.deep.include({ type: 'portfolio.invalidated', sequence: 18 });
  });
\`\`\`

Keep the seam small, disabled outside tests, and aligned with user behavior. A global bag of every raw frame becomes a second implementation and can leak sensitive material. Prefer visible outcomes whenever they can prove the requirement.

## Stubbing callbacks is useful, but it changes the test

Cypress recommends stubbing application callbacks as another strategy. If your client wraps WebSocket behind an adapter, inject a fake adapter in component tests and invoke the registered handler with an event. This gives precise control over malformed and rare cases. It does not test the browser handshake or actual frame delivery.

For example, a React hook could depend on a \`PriceFeed\` interface with \`subscribe(listener)\`. A component test supplies an in-memory implementation, captures the listener, and emits typed events. That is cleaner than attempting to replace \`window.WebSocket\` after the application has already created a connection.

| Technique | Exercises real socket | Can choose exact payload | Primary weakness |
|---|---:|---:|---|
| Test server plus control endpoint | Yes | Yes | Requires lifecycle and port management |
| Injected client adapter | No | Yes | Does not cover browser protocol integration |
| Stub registered \`onmessage\` callback | No | Yes | Coupled to application wiring |
| Staging backend event | Yes | Sometimes | Slower and vulnerable to shared-state noise |
| \`cy.intercept()\` on upgrade request | Only handshake visibility | No frame stubbing | Cannot control individual messages |

Use multiple layers rather than forcing Cypress E2E tests to carry every edge case. The [Cypress best practices guide](/blog/cypress-best-practices-2026-guide) explains broader isolation and selector choices.

## Test connection loss with close codes, not network folklore

Reconnection behavior is part of the client contract. Extend the control server with an endpoint that closes connected sockets using an application-defined or standard close code. The \`ws\` API accepts \`close(code, reason)\`.

\`\`\`typescript
function closeEveryClient(code: number, reason: string): number {
  let closed = 0;
  for (const client of sockets.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.close(code, reason);
      closed += 1;
    }
  }
  return closed;
}

// In the HTTP request handler for POST /__test__/close:
const closed = closeEveryClient(1012, 'test service restart');
response.writeHead(202, { 'content-type': 'application/json' });
response.end(JSON.stringify({ closed }));
\`\`\`

The corresponding browser test can assert \`Reconnecting\`, then \`Live\` after a new connection is accepted. Do not assert an exact millisecond unless the backoff duration is a product requirement and the clock is controlled. Jitter is often intentional to prevent a reconnect storm.

Test terminal close behavior separately. An authentication failure should not retry forever, while a service restart may. The specific close code contract must come from your server and client design. Browser behavior can also differ when the network drops without a close frame, so reserve a smaller environment-level test for abrupt transport loss.

## Authentication belongs in the handshake test

Browsers cannot add arbitrary headers through the standard WebSocket constructor. Applications commonly use cookies, a query parameter, or a negotiated subprotocol. Query-string tokens can leak through logs and should be avoided when a safer session mechanism is available.

Test authentication at two levels. First, backend protocol tests connect with valid and invalid credentials and assert acceptance or closure. Second, Cypress verifies that a signed-in browser becomes live and an expired session reaches the expected reauthentication state.

Never assert only that the WebSocket constructor was called. A constructed socket can fail during upgrade. Wait for application state derived from the \`open\` event or a server welcome message. Also test that tenant subscriptions are authorized server-side; hiding another tenant’s message in the UI is not access control.

## Malformed frames need explicit failure behavior

Production services eventually emit an unknown event version, missing field, unexpected enum, or non-JSON message. Decide whether the client ignores it, reports telemetry, shows degraded state, or closes the connection. Silent corruption is the worst outcome.

The control endpoint above sends its request body verbatim, so Cypress can submit plain text by setting \`body\` and \`headers\` explicitly, or the test server can offer a raw-message field. Keep exhaustive schema cases in a unit suite using the same decoder. Use Cypress for one representative malformed message to prove the browser stays usable and the failure is surfaced correctly.

An error boundary is not enough if the event handler runs outside the rendering stack. Assert the actual desired outcome: the last valid price remains, an error counter increments, and subsequent valid messages are still processed.

## Prevent cross-test socket leakage

A browser left connected can receive a message intended for the next test. Ensure navigation or application teardown closes the socket, and give the test server a way to reset its state. Cypress test isolation clears browser context between tests when enabled, but server-side subscriptions and queued events still need cleanup.

Create unique user or channel identifiers per test when messages are scoped. Broadcast is convenient for a tutorial, but targeted delivery is safer in a parallel suite. Have the control endpoint accept a synthetic client ID, verify it against connected test clients, and return how many received the event. An unexpected count becomes a diagnostic signal.

Do not place Cypress tests that share one broadcast server into uncontrolled parallel execution. Either allocate a server and port per worker or route every message by a unique test correlation ID.

## Cover binary messages at the decoder boundary

WebSocket data can arrive as text, \`Blob\`, or \`ArrayBuffer\`, depending on what the server sends and the client’s \`binaryType\`. A JSON-only broadcast test does not validate a protobuf, MessagePack, or custom binary feed. Keep binary format coverage close to the decoder, where exact byte sequences and errors are easy to assert.

Then retain one Cypress integration case using the real test server configured to send binary data. The goal is not to enumerate the protocol in the browser. It is to prove that browser delivery, \`binaryType\`, decoder selection, and rendered state are wired together. A server accidentally switching from binary to text should produce a controlled protocol error, not a blank widget.

Compression extensions are negotiated during the handshake and handled below application code. If per-message compression matters, test negotiation and representative payloads with a protocol client and server instrumentation. Do not infer compression correctness from text appearing on screen.

## Check recovery after a bad frame

A resilient client should define whether one malformed event poisons the stream. Broadcast a valid event, an invalid event, and another valid event. Assert that the first state remains during the error and that the final valid event is accepted if the policy is to continue. If protocol corruption requires closing the socket, assert the close and reconnect path instead.

Also examine observability. The user may see only a brief degraded indicator, while engineering needs an error event containing message type, schema version, correlation ID, and redacted failure reason. Do not log entire frames by default. They can contain account data or confidential payloads.

This sequence finds a class of bugs that a single malformed-frame assertion misses: an exception escapes the message listener, a subscription flag remains locked, or a rejected promise prevents subsequent dispatch.

## Assert subscription behavior, not just inbound broadcast

Many clients send a subscribe command after opening, then wait for an acknowledgment before showing live state. The test server should record client messages and expose them through its control API. Cypress can assert that the browser subscribed to the correct symbol and did not subscribe to unauthorized channels.

On route changes, verify the old subscription is removed or replaced. Receiving the correct broadcast after navigation is not enough if the previous channel remains active and consumes memory or leaks data. A server-side list of active subscriptions gives a stronger assertion than inspecting a JavaScript method call.

Reconnect adds another edge: some clients send duplicate subscriptions on every open without clearing old server state. Test a forced close followed by recovery, then ask the server how many active subscriptions exist for that synthetic client. The expected count should come from the protocol contract.

## Keep Cypress command execution outside socket callbacks

Cypress commands are queued and should not be issued from arbitrary asynchronous WebSocket callbacks that fire outside the test’s controlled chain. That pattern can create commands after the test has finished or make ordering unclear. Let application code process the frame, then use Cypress’s retryable queries against DOM or a narrow observation seam.

If the test itself opens a helper socket, wrap its completion in a Promise returned from \`cy.then()\`, close it deterministically, and reject on timeout or error. Still prefer server control when testing the application’s own connection. A second browser socket can prove backend protocol behavior while completely bypassing the client code users run.

## Frequently Asked Questions

### Can cy.intercept stub a single WebSocket message?

No. Cypress can proxy WebSocket traffic and observe the upgrade request, but its documentation does not support native frame-level stubbing through \`cy.intercept()\`. Control the server, inject a client adapter, or invoke the application callback.

### How should a Cypress test wait until the socket is ready?

Assert a user-visible status or an explicit test seam driven by the socket’s open or welcome event. Avoid a fixed delay. Cypress retries DOM and property assertions until the configured timeout.

### Is replacing window.WebSocket a good default?

Usually not for an end-to-end test. Replacement timing is delicate, constructor behavior is easy to imitate incorrectly, and the test stops covering the real protocol. An injected adapter is clearer when complete simulation is the goal.

### How can WebSocket tests run safely in parallel?

Use separate servers per worker or route messages with unique test and client identifiers. Reset server state and close sockets after each case. A shared broadcast channel creates nondeterministic cross-test delivery.

### Should every malformed message be exercised through Cypress?

No. Put the exhaustive schema matrix against the decoder in unit tests. Keep a few browser scenarios that prove invalid input does not corrupt state, crash the page, or prevent later valid events from being handled.
`,
};
