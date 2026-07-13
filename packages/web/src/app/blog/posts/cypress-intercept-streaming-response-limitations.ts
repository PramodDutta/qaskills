import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Cypress intercept() Streaming-Response Limitations",
  description:
    "Understand Cypress intercept streaming-response limitations for SSE and chunked HTTP, then design reliable tests for partial data, reconnects, and completion.",
  date: "2026-07-13",
  category: "Guide",
  content: `
# Cypress intercept() Streaming-Response Limitations

The first SSE message updates the progress bar to 25 percent, but Cypress does not show anything until the server closes the response. That observation is the center of this problem. \`cy.intercept()\` is excellent at matching a request and supplying or modifying a completed response. It is not a programmable byte-stream producer, and treating a multiline string as four timed chunks does not make it one.

Streaming changes what “the response” means. With ordinary JSON, assertions begin after the body arrives and parsing completes. With Server-Sent Events, newline-delimited feeds, or chunked HTML, user-visible behavior occurs while the connection remains open. Correct tests need control over arrival order, inter-chunk delay, disconnect timing, and sometimes reconnection identifiers. Cypress's interception object does not expose those controls.

This is not an argument against Cypress. It is a boundary-placement issue. Use interception for the parts it models honestly, move stream production into a real local endpoint or a browser-side seam, and keep the assertions in Cypress where they provide value.

## What intercept actually hands to the browser

An intercepted request has a request phase and a response phase. A route handler can call \`req.reply()\` with a static response, pass through with \`req.continue()\`, or listen for response events. On the response object, Cypress exposes properties such as \`body\`, \`headers\`, \`statusCode\`, and controls for total delay or throttling. These describe a response as a value.

For a true stream, a test needs something closer to a writable socket: write headers, flush a first frame, wait, write another frame, and optionally destroy the connection without an orderly end. \`StaticResponse.body\` accepts a string, object, or binary data, but it does not offer a sequence of writes. \`delay\` delays availability, and \`throttleKbps\` changes transfer speed, yet neither lets the test schedule semantic event boundaries.

| Required stream behavior | Can a StaticResponse model it? | Reason |
|---|---|---|
| Return a complete SSE-formatted body | Yes | The body is delivered as one stubbed response value |
| Delay the whole response | Yes | \`delay\` adds minimum response latency |
| Reduce overall transfer rate | Partly | Throttling affects bytes, not application-defined event timing |
| Emit event A, assert UI, then emit event B | No | The route handler has no incremental write API |
| Keep a stub open indefinitely | No | A static reply represents a response Cypress can complete |
| Reset the socket after a chosen event | No | \`forceNetworkError\` fails the request rather than scripting a mid-body cut |
| Observe each upstream chunk in \`req.continue()\` | No | Response callbacks operate on Cypress's assembled response representation |

The distinction also explains why \`cy.wait('@events')\` is awkward for a long-lived feed. It waits for the aliased request-response cycle. A successful SSE connection may intentionally remain active for the whole page session, so completion is not the synchronization point the UI test needs.

## A static SSE body proves parsing, not streaming

You can return the correct media type and a string containing multiple SSE records. This is useful for a narrow parser or final-state test. It verifies that the application recognizes \`event\`, \`id\`, and \`data\` fields after receiving the payload. It does not verify intermediate rendering, heartbeat handling, or temporal behavior.

\`\`\`typescript
// cypress/e2e/report-final-state.cy.ts
describe('report event parsing', () => {
  it('renders the final values from an SSE-formatted response body', () => {
    cy.intercept('GET', '/api/reports/42/events', {
      statusCode: 200,
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
      },
      body: [
        'id: 101',
        'event: progress',
        'data: {"percent":25}',
        '',
        'id: 102',
        'event: progress',
        'data: {"percent":100}',
        '',
        'event: complete',
        'data: {"downloadUrl":"/reports/42.pdf"}',
        '',
      ].join('\\n'),
    }).as('reportEvents');

    cy.visit('/reports/42');
    cy.contains('100%').should('be.visible');
    cy.get('a[href="/reports/42.pdf"]').should('be.visible');
  });
});
\`\`\`

Whether this works at all depends on the application's transport. Native \`EventSource\` expects a streaming connection with event-stream semantics, and behavior around a closed static response may differ from a \`fetch()\` implementation that reads \`response.text()\`. Do not promote this example to evidence that incremental delivery works. Name it after the property it establishes: parsing a completed SSE-formatted payload and rendering its terminal state.

For the normal matching, aliasing, and response-modification surface, use the [Cypress network stubbing reference](/blog/cypress-intercept-network-stubbing-reference). The testing boundary here starts where a response must remain alive while assertions run.

## Run a real SSE endpoint when timing is the behavior

The most faithful local test uses an HTTP server that writes actual frames. Node's response object has the primitives Cypress lacks: \`writeHead()\`, \`write()\`, \`flushHeaders()\`, \`end()\`, and \`destroy()\`. Put this server in a dedicated test process or start it through Cypress's Node event setup. Avoid creating a new listener per test if parallel specs could contend for a port.

The following Express route is ordinary production-compatible server code. Query parameters select a deterministic scenario. In a larger suite, validate them and restrict the endpoint to the test environment.

\`\`\`typescript
// test-server.ts
import express from 'express';

const app = express();

app.get('/test-api/reports/:id/events', (request, response) => {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  response.flushHeaders();

  const send = (lines: string[]) => response.write(\`\${lines.join('\\n')}\\n\\n\`);
  send(['retry: 50', 'id: 201', 'event: progress', 'data: {"percent":10}']);

  const halfway = setTimeout(() => {
    send(['id: 202', 'event: progress', 'data: {"percent":55}']);
  }, 150);

  const finish = setTimeout(() => {
    send(['id: 203', 'event: complete', 'data: {"downloadUrl":"/report.pdf"}']);
    response.end();
  }, 300);

  request.on('close', () => {
    clearTimeout(halfway);
    clearTimeout(finish);
  });
});

app.listen(4400, '127.0.0.1', () => {
  console.log('SSE test server listening on http://127.0.0.1:4400');
});
\`\`\`

Configure the application under test so its event base URL points to \`http://127.0.0.1:4400/test-api\`. If origins differ, the endpoint needs the appropriate CORS headers, and credentials require an explicit allow-origin value rather than \`*\`. Another option is to reverse-proxy this endpoint through the application dev server, preserving a same-origin URL.

The Cypress assertion should synchronize on DOM states caused by distinct writes. Because the server waits 150 milliseconds between frames, the test can observe 10 percent before 55 percent. Keep intervals comfortably larger than scheduler noise but short enough for the suite. Do not use \`cy.wait(150)\` as the assertion mechanism; retrying DOM assertions already express the desired state.

\`\`\`typescript
// cypress/e2e/report-stream.cy.ts
describe('live report progress', () => {
  it('renders intermediate SSE events before completion', () => {
    cy.visit('/reports/stream-fixture');

    cy.contains('[data-testid="progress"]', '10%').should('be.visible');
    cy.contains('[data-testid="progress"]', '55%').should('be.visible');
    cy.contains('[data-testid="progress"]', '100%').should('be.visible');
    cy.get('[data-testid="download-report"]')
      .should('have.attr', 'href', '/report.pdf')
      .and('be.visible');
  });
});
\`\`\`

There is still a race if the first write occurs before the page attaches \`EventSource\`. A test endpoint can wait for the connection, which it naturally does, but it cannot know whether the application's listener has been registered after constructing the client. Native EventSource dispatches after parsing incoming frames, so sending immediately after headers is generally safe; a small initial delay can make the fixture more observable without changing production logic.

## Simulate a mid-stream disconnect deliberately

A pre-response network error and a connection lost after two valid events drive different client code. \`forceNetworkError: true\` is useful for “cannot connect” behavior. It does not establish that a client preserves received progress, reconnects with \`Last-Event-ID\`, or deduplicates an event replayed after reconnect.

Extend the local server with a scenario that calls \`response.destroy()\` after writing a known \`id\`. On the next request, inspect \`request.headers['last-event-id']\` if the browser transport is native EventSource, then resume or replay according to server rules. Be cautious: the EventSource specification and browser behavior determine reconnection, while a fetch-based streaming client must implement its own cursor header.

| Failure scenario | Server action | Assertion with diagnostic value |
|---|---|---|
| Initial connection rejected | Respond 503, optionally with retry metadata | UI enters connecting or unavailable state |
| Socket closes after event 202 | Write two frames, then destroy response | Already rendered progress remains, reconnect begins |
| Last event replayed | Send 202 again after reconnect | Reducer does not apply the update twice |
| Cursor skipped | Resume at 204 instead of 203 | Client requests snapshot or exposes a recoverable gap |
| Malformed data field | Send invalid JSON in one complete frame | Error is contained and later valid events have defined behavior |

Use a counter or explicit scenario token on the server rather than global mutable state shared by every spec. Parallel Cypress runners can otherwise consume each other's “first connection.” A per-test UUID in the URL gives the server a safe key, and an after-test cleanup endpoint can remove scenario state.

## Test a browser-side transport seam for exhaustive sequences

An actual server gives protocol fidelity, but dozens of edge cases become slow and awkward when every event requires a timer. A second layer can inject a transport interface into the application. Production wraps \`EventSource\`; component or end-to-end test builds expose a controlled implementation whose \`emit()\`, \`error()\`, and \`close()\` methods are synchronous.

This seam tests the state machine, not HTTP. It can verify a hundred ordering permutations quickly: progress after completion, duplicate IDs, invalid transition, and component unmount. Keep one or more real-server tests so the adapter itself remains covered. If every test replaces EventSource, a broken URL, missing credentials option, or parsing bug can ship unnoticed.

Cypress can access a test-only controller attached to \`window\`, but type it and guard its creation behind a compile-time test flag. Avoid using \`cy.stub(window, 'EventSource')\` after the application has already opened the connection. Install the substitute before application bootstrap through \`onBeforeLoad\` or dependency injection.

## Understand chunked transfer without over-testing framing

HTTP/1.1 chunked transfer encoding is a wire-level mechanism. Application code usually sees decoded response bytes from Fetch streams, not chunk-size markers. HTTP/2 does not use the same transfer-encoding framing at all. Therefore a test should describe observable byte or record boundaries, not assert that a specific \`Transfer-Encoding: chunked\` header appears in every environment.

A reverse proxy may buffer upstream chunks, compression can coalesce writes, and a framework can flush headers differently between development and production. For latency-sensitive behavior, run at least one test through the deployed proxy configuration. The local Express fixture proves client logic under controlled writes; it cannot certify that a CDN forwards those writes immediately.

When using \`fetch()\` and \`ReadableStreamDefaultReader\`, multibyte UTF-8 characters can be split across chunks. The client should use one streaming \`TextDecoder\` with \`{ stream: true }\` instead of decoding each byte array independently. An integration fixture that splits an emoji between writes is more valuable than asserting arbitrary network packet boundaries.

## Choose the smallest honest test double

The tool choice follows the behavior under examination, not a blanket rule that all network calls must be intercepted.

| Approach | Strongest use | Important limitation |
|---|---|---|
| \`cy.intercept()\` StaticResponse | Completed payload, headers, status, normal request assertion | Cannot schedule incremental semantic writes |
| Local Node SSE server | Arrival order, open connection, reconnect, abrupt close | Adds lifecycle and port management |
| Test-only transport adapter | Large state-machine matrix with precise control | Does not exercise browser networking |
| Service worker mock | Browser-visible request handling close to the app | Streaming support and test coordination require careful implementation |
| Deployed environment | Proxy buffering, auth, infrastructure timeouts | Slow, less deterministic, harder failure diagnosis |

For bidirectional, message-oriented traffic, WebSocket tests have a different handshake and framing model. The [WebSocket testing guide](/blog/websocket-testing-guide) covers that surface. Do not treat SSE as “WebSocket but one-way”; browser APIs, reconnection, intermediaries, and test controls differ.

## Prevent false confidence in the final-state assertion

A screen ending at 100 percent does not prove that it displayed intermediate progress. The application might buffer everything, skip directly from 0 to 100, and still pass. Capture state transitions when they matter. DOM assertions at controlled server intervals are one method. A test-only transition log is another, provided the log records the production reducer's actions rather than a duplicate test implementation.

Also assert connection cleanup. Navigating away should close EventSource or abort the fetch reader. Otherwise every test may pass while production accumulates sockets and duplicate listeners. The local server can record \`request.on('close')\` and expose a diagnostic query, or a component test can spy on the adapter's \`close()\` method.

Keep event payload validation separate from transport behavior. Schema tests can feed records directly into the decoder. Streaming integration tests should focus on boundaries that only a live connection reveals. This division makes failures legible: decoder defect, state transition defect, browser adapter defect, or infrastructure buffering.

## Verify the production proxy does not undo streaming

A local Node route can flush perfectly while the deployed ingress waits for a buffer to fill. Compression middleware, serverless response adapters, reverse proxies, and CDN features can each change when bytes become visible. Add a small environment-level probe that records client receipt time for numbered heartbeat events generated at known intervals. Judge the gaps with generous bounds because shared CI machines and networks are noisy, but fail when every event arrives together after the server ends.

Do not expose a permanent unauthenticated diagnostic stream containing internal timing data. The probe can use the normal authenticated endpoint with a test resource, or a restricted health route enabled only in a preproduction environment. Clean up the stream even on assertion failure so the job does not leave connections consuming worker capacity.

Browser developer tools can help distinguish layers. If the network panel shows an open request while the UI remains unchanged, inspect the application's reader and decoder. If no bytes appear until completion, compare direct-origin and proxied URLs. If direct origin streams and the proxy does not, changing the Cypress route cannot repair the infrastructure behavior.

Response compression deserves a targeted check because small SSE frames may sit in a compressor's buffer. Many deployments disable transformation for event streams or use headers and middleware settings that encourage immediate flushing. The exact control is server-specific, so test observable arrival instead of asserting a configuration key copied from another proxy.

Finally, bound the connection at the test-server layer. A failed Cypress assertion can stop normal page cleanup before the server's finish timer runs. Track active responses, close them in suite teardown, and fail startup if the selected port is already occupied. These details sound mundane, but an orphaned stream is a common reason a locally reliable spec hangs only on a parallel CI worker.

## Frequently Asked Questions

### Can throttleKbps make separate SSE messages arrive on a schedule?

No. It limits the response transfer rate in aggregate. Byte speed can influence arrival, but it does not give the test a supported way to flush one SSE record, pause for an assertion, and then flush the next record.

### Why does cy.wait on my SSE alias time out?

\`cy.wait()\` expects the matched request-response cycle to reach the point Cypress can yield it. An SSE feed is designed to remain open, so completion may never occur within the command timeout. Synchronize on application state or use a controllable stream server instead.

### Is forceNetworkError equivalent to dropping an established stream?

It models a network failure for the intercepted request, not a scripted disconnect after selected body chunks have reached the page. Use a socket-capable test server to verify preservation and reconnection after partial delivery.

### Should an SSE test assert the Transfer-Encoding header?

Usually not. The application-visible contract is event-stream media type and progressive records. HTTP version, proxying, and server framework can change wire framing. Assert observable incremental behavior and validate production proxy buffering separately.

### Can I keep intercept for non-stream endpoints in the same spec?

Yes. Stub deterministic setup calls with \`cy.intercept()\` and route only the live feed to the local SSE fixture. Register intercepts before \`cy.visit()\`, and ensure broad matchers do not accidentally capture the stream URL.
`,
};
