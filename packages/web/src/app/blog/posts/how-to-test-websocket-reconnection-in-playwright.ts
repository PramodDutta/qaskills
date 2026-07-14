import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'How to Test WebSocket Reconnection in Playwright',
  description:
    'Test WebSocket reconnection in Playwright with deterministic server closes, real offline transitions, retry assertions, and duplicate-subscription checks.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# How to Test WebSocket Reconnection in Playwright

The price ticker freezes at 10:41:07. The browser still responds, every button still works, and no red error banner appears. Behind that calm screen, the WebSocket died during a network transition and the client never restored its subscription. A happy-path end-to-end test will miss this failure because it usually opens one connection, receives one message, and exits before recovery logic does any work.

WebSocket reconnection deserves its own Playwright scenario. The useful test is not merely whether a second socket appears. It must prove that the interface exposes the interruption, the retry policy activates, the replacement connection authenticates and subscribes correctly, missed state is recovered, and one server event produces one UI update after recovery. Those are separate failure points, and each needs an observable assertion.

This tutorial develops two complementary recipes. The first uses Playwright's \`page.routeWebSocket()\` API to create a controlled WebSocket peer and close the first connection on demand. The second uses \`browserContext.setOffline()\` against a real test environment to exercise a transport outage. Together they give fast diagnosis without pretending that a protocol close and a broken network are identical.

## Define what recovered means for your client

A socket reaching the browser's \`OPEN\` state is only the beginning. Most real-time applications perform work above the transport layer: they send a token, negotiate a protocol version, subscribe to channels, restore a cursor, or request a fresh snapshot. A connection can therefore reopen while the screen remains permanently stale.

Write recovery expectations from the user's perspective and then map each one to a lower-level signal. For a collaborative board, the visible success condition might be a remote card update arriving after the outage. For a trading screen, it might be a new sequence number with no duplicated price rows. A chat product may need to reconcile messages sent while the browser was disconnected.

| Recovery invariant | Browser-visible evidence | Protocol evidence worth recording |
|---|---|---|
| Interruption is represented honestly | Status changes from connected to reconnecting or offline | Original socket emits close or error |
| Retry actually occurs | Status eventually leaves reconnecting | A second WebSocket is created |
| Session is restored | Protected live data resumes | Replacement sends auth or resume message |
| Subscription is restored once | One new event creates one UI change | Exactly one subscribe frame per new connection |
| Gap handling completes | Snapshot or missed items appear in order | Cursor, sequence, or resync request is sent |
| Recovery is bounded | UI reaches connected within the agreed budget | Attempt count and delays remain within policy |

This matrix prevents a weak assertion such as “connected badge is green” from standing in for the whole behavior. A badge may be driven by \`onopen\` even when authentication fails one frame later. Conversely, some robust clients intentionally keep a “syncing” state after transport recovery until the snapshot has been applied. Assert the states your application promises, not a generic WebSocket lifecycle.

## Choose the fault that matches the incident


\`page.routeWebSocket()\`, available in modern Playwright releases, can fully mock a WebSocket or connect through to a real server. When the handler does not call \`connectToServer()\`, the route behaves like the server. Its \`close()\`, \`send()\`, and \`onMessage()\` methods are ideal for a repeatable close at a precise protocol moment.

\`context.setOffline(true)\` is a broader disruption. It changes network availability for the browser context, affecting HTTP traffic as well as WebSockets. That is closer to Wi-Fi loss, an airplane-mode transition, or a laptop moving between networks. It is also less surgical, so background requests, telemetry, and refresh-token calls can influence the result.

| Injection method | What it models well | Important limitation | Best assertion target |
|---|---|---|---|
| \`WebSocketRoute.close({ code, reason })\` | Server restart, maintenance close, policy close | Sends a WebSocket close, not a raw TCP disappearance | Close-code handling and deterministic retry |
| \`context.setOffline(true)\` | Device-wide loss of connectivity | Breaks every request in that browser context | Offline UX and recovery when connectivity returns |
| Kill a test WebSocket server | Process crash or endpoint disappearance | Requires lifecycle control and can slow parallel tests | Integration behavior across proxy and server layers |
| Network proxy such as Toxiproxy | Latency, timeout, reset, and directional link faults | Adds infrastructure and cleanup responsibilities | Transport resilience under realistic adverse conditions |
| Close through application test controls | Domain-specific logout, lease expiry, or server drain | Only as faithful as the test hook | Business behavior tied to a known server event |

Do not send close code \`1006\` from a mock. It is a reserved value used by clients to report abnormal closure and cannot be transmitted in a close frame. For a planned server restart, \`1012\` is a meaningful choice. For a deployment-specific policy, use the code your service contract defines. If the requirement is an abnormal transport loss, prefer offline emulation, server termination, or a proxy rather than inventing an illegal close frame.

If the application already has HTTP stubbing, keep the WebSocket route separate. Ordinary \`page.route()\` handlers deal with HTTP requests and do not control established WebSocket messages. The concepts in this [Playwright network interception guide](/blog/playwright-network-mocking-route-handler-guide) remain useful for bootstrapping API state, but WebSocket frames require the dedicated routing or observation API.

## Force the first socket closed with a routed peer

The following test is self-contained. It installs the WebSocket route before creating the page-side socket, hosts a tiny reconnecting client with \`page.setContent()\`, closes connection one after the first subscription, and makes connection two deliver a fresh price. The first attempt cannot pass accidentally because the expected value is only sent by the replacement connection.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('resubscribes and renders a fresh price after a server restart', async ({ page }) => {
  let connectionNumber = 0;
  const subscriptions: Array<{ connection: number; channel: string }> = [];

  await page.routeWebSocket('ws://realtime.test/socket', socket => {
    connectionNumber += 1;
    const thisConnection = connectionNumber;

    socket.onMessage(message => {
      const frame = JSON.parse(String(message)) as {
        type: string;
        channel: string;
      };

      if (frame.type !== 'subscribe') return;
      subscriptions.push({ connection: thisConnection, channel: frame.channel });

      if (thisConnection === 1) {
        socket.close({ code: 1012, reason: 'Service restart' });
        return;
      }

      socket.send(
        JSON.stringify({
          type: 'price',
          channel: 'prices:EURUSD',
          value: '1.0874',
          sequence: 902,
        }),
      );
    });
  });

  await page.setContent(\`
    <p data-testid="connection-state">starting</p>
    <output data-testid="price">waiting</output>
    <script>
      const state = document.querySelector('[data-testid="connection-state"]');
      const price = document.querySelector('[data-testid="price"]');
      let retry = 0;

      function connect() {
        const socket = new WebSocket('ws://realtime.test/socket');

        socket.addEventListener('open', () => {
          state.textContent = 'connected';
          socket.send(JSON.stringify({
            type: 'subscribe',
            channel: 'prices:EURUSD'
          }));
        });

        socket.addEventListener('message', event => {
          const frame = JSON.parse(event.data);
          if (frame.type === 'price') price.textContent = frame.value;
        });

        socket.addEventListener('close', () => {
          state.textContent = 'reconnecting';
          retry += 1;
          setTimeout(connect, retry * 500);
        });
      }

      connect();
    </script>
  \`);

  await expect(page.getByTestId('connection-state')).toHaveText('reconnecting');
  await expect(page.getByTestId('price')).toHaveText('1.0874');
  await expect(page.getByTestId('connection-state')).toHaveText('connected');
  await expect.poll(() => connectionNumber).toBe(2);
  expect(subscriptions).toEqual([
    { connection: 1, channel: 'prices:EURUSD' },
    { connection: 2, channel: 'prices:EURUSD' },
  ]);
});
\`\`\`

The route must be registered before \`setContent()\` or navigation because Playwright only routes WebSockets created after registration. The captured \`thisConnection\` value also matters. Reading the shared counter later inside \`onMessage()\` could attribute a delayed frame to the wrong connection.

The sequence of UI assertions is deliberate. The test observes \`reconnecting\` before it waits for the new price, proving that the recovery branch was entered. Then it verifies both data and final status. The subscription array confirms that each connection subscribed exactly once. If a bug retains an old reconnect callback and creates a third socket, the exact attempt count exposes it.

## Exercise a real transport outage

A routed close proves application logic for a received close event. It does not prove what happens when the browser loses all connectivity. Run a smaller integration suite against a non-production environment where the actual WebSocket server is reachable, then toggle the context offline.

\`\`\`typescript
import { test, expect, type WebSocket } from '@playwright/test';

test('recovers the live order book after connectivity returns', async ({
  context,
  page,
}) => {
  const sockets: WebSocket[] = [];
  page.on('websocket', socket => {
    if (socket.url().includes('/stream/order-book')) sockets.push(socket);
  });

  await page.goto('/markets/BTC-USD');
  await expect(page.getByTestId('stream-status')).toHaveText('Live');
  await expect.poll(() => sockets.length).toBe(1);

  const sequenceBefore = Number(
    await page.getByTestId('book-sequence').textContent(),
  );

  await context.setOffline(true);
  await expect(page.getByTestId('stream-status')).toHaveText('Reconnecting');
  await expect(page.getByRole('button', { name: 'Place order' })).toBeDisabled();

  await context.setOffline(false);
  await expect(page.getByTestId('stream-status')).toHaveText('Live', {
    timeout: 15_000,
  });
  await expect.poll(() => sockets.length, { timeout: 15_000 }).toBeGreaterThan(1);
  await expect
    .poll(async () => Number(await page.getByTestId('book-sequence').textContent()))
    .toBeGreaterThan(sequenceBefore);
  await expect(page.getByRole('button', { name: 'Place order' })).toBeEnabled();
});
\`\`\`

This test uses Playwright's \`page.on('websocket')\` event to count browser WebSocket objects. It does not use the count as the only success signal. A new object can exist while the server rejects its token, or while the order book remains stale. The increasing sequence and re-enabled action prove that application-level synchronization completed.

Put the offline reset in a \`finally\` block if later assertions or shared fixtures perform cleanup over the network. Playwright creates an isolated context per test by default, yet fixture teardown may still need connectivity. A small helper can make restoration unconditional:

\`\`\`typescript
test('shows queued chat messages after a dropped connection', async ({ context, page }) => {
  await page.goto('/rooms/release-team');

  try {
    await context.setOffline(true);
    await page.getByPlaceholder('Write a message').fill('Deploy finished');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Deploy finished')).toHaveAttribute(
      'data-delivery',
      'queued',
    );
  } finally {
    await context.setOffline(false);
  }

  await expect(page.getByText('Deploy finished')).toHaveAttribute(
    'data-delivery',
    'sent',
  );
  await expect(page.getByText('Deploy finished')).toHaveCount(1);
});
\`\`\`

That last count is not cosmetic. Reconnection frequently exposes idempotency defects: optimistic UI creates one row, replay creates another, and a server echo creates a third. Choose a durable message identifier when possible, not only visible text, especially when users may send identical messages.

## Assert backoff without turning the test into a stopwatch

Retry algorithms introduce time. Tests become flaky when they demand that a timer fires at exactly 1,000 milliseconds on a loaded CI worker. They also become slow when production backoff waits 30 seconds between attempts. Separate the policy test from the end-to-end recovery test.

At unit level, inject a scheduler or use controlled time to verify the mathematical sequence and maximum delay. At browser level, assert broad bounds and observable attempt counts. A test-only configuration may shorten the base delay while keeping the multiplier and cap unchanged, provided the production code reads the same validated policy path.

| Policy behavior | Precise test home | Playwright end-to-end check |
|---|---|---|
| First retry is immediate or delayed | Unit test with controlled timers | Reconnecting state appears before recovery |
| Delay grows between failures | Unit or component test | Attempt count does not spike in a short observation window |
| Delay stops growing at the cap | Unit test over many attempts | Usually omit from the main UI path |
| Jitter stays inside its range | Property or statistical unit test with seeded randomness | Never assert one exact randomized interval |
| Retry stops after terminal auth failure | Browser integration with a rejected token | Login or session-expired UI replaces reconnect loop |
| Successful connection resets attempt state | Unit plus one repeated outage browser test | Second outage recovers within the initial retry budget |

\`expect.poll()\` is a good fit for attempt counts and values that change outside a locator. It retries the supplied function until the matcher passes. Locator assertions already retry, so avoid wrapping a normal \`toHaveText()\` in manual loops. Never hide recovery behind an unconditional \`waitForTimeout()\`; that waits the full duration on fast runs and still fails on a slightly slower worker.

## Inspect frames to catch silent resubscription defects

Playwright's observed \`WebSocket\` object emits \`framesent\`, \`framereceived\`, \`close\`, and \`socketerror\` events. These are diagnostic signals, not a replacement for UI assertions. Capture only what helps explain a failure, and redact credentials before attaching logs.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('sends the last acknowledged cursor on reconnection', async ({ page }, testInfo) => {
  const frames: Array<{ direction: 'sent' | 'received'; payload: string }> = [];

  page.on('websocket', socket => {
    if (!socket.url().includes('/events')) return;

    socket.on('framesent', event => {
      frames.push({ direction: 'sent', payload: String(event.payload) });
    });
    socket.on('framereceived', event => {
      frames.push({ direction: 'received', payload: String(event.payload) });
    });
  });

  await page.goto('/activity');
  await page.getByRole('button', { name: 'Disconnect test socket' }).click();
  await expect(page.getByTestId('activity-sequence')).toHaveText('418');

  const resume = frames
    .filter(frame => frame.direction === 'sent')
    .map(frame => JSON.parse(frame.payload) as Record<string, unknown>)
    .find(frame => frame.type === 'resume');

  expect(resume).toMatchObject({ type: 'resume', afterSequence: 417 });

  await testInfo.attach('websocket-frames.json', {
    body: Buffer.from(JSON.stringify(frames, null, 2)),
    contentType: 'application/json',
  });
});
\`\`\`

The example assumes a legitimate test control that disconnects the current server-side session. If your product does not have one, use a routed close or an environment API rather than adding a user-visible button. The key assertion is the cursor: receiving sequence 418 is not enough if the client requested a full replay and wasted bandwidth, or resumed from 410 and duplicated events.

Binary frames need protocol-aware decoding. \`String(Buffer)\` may be useful for text but is not a valid parser for MessagePack, Protocol Buffers, compressed payloads, or custom binary envelopes. Decode with the same published schema used by the client, or assert a higher-level UI effect. Avoid dumping binary authentication traffic into CI artifacts.

For broader frame mocking, ordering, and close-code coverage, the [WebSocket testing guide](/blog/websocket-testing-guide) provides the protocol-level foundation. In a reconnection test, keep frame inspection focused on recovery: authentication, subscribe, resume cursor, acknowledgement, and duplicated delivery.

## Cover the failures that appear after the second connection

One green reconnect scenario is a starting point. The damaging bugs often occur on the third attempt or during a race between timers. Build a compact risk-based set rather than permuting every close code with every browser.

Test a server close immediately after the initial handshake, then another after a confirmed subscription. Those paths exercise different client state. Test a message arriving while the close is being processed, because a stale handler may update state after the new connection becomes authoritative. Test two rapid outages to confirm that a successful recovery resets the backoff counter. Test a terminal authentication response to ensure the client stops retrying and asks the user to sign in.

Also verify cleanup. Each replacement connection should remove listeners, cancel heartbeat timers, and invalidate scheduled retries belonging to the old connection. Symptoms of failed cleanup include duplicate notifications, attempt storms, memory growth, and a status badge oscillating between connected and reconnecting.

| Risk-focused scenario | Fault timing | Failure it can reveal |
|---|---|---|
| Server restarts after subscribe acknowledgement | Stable live session | Missing resubscription or stale channel list |
| Link disappears during an outbound command | Before acknowledgement | Lost command, unsafe replay, or duplicate execution |
| Second socket opens before old retry timer fires | Recovery race | Unexpected third connection |
| Token expires while offline | Before replacement authentication | Infinite retry loop with rejected credentials |
| Resume cursor is outside server retention | Gap request on reconnect | Failure to fall back to a fresh snapshot |
| Browser goes offline twice | Soon after first recovery | Backoff counter or heartbeat not reset |

Cross-browser execution is valuable for the offline integration case because browser networking stacks can surface transport failures differently. Keep the fully mocked route test in the main project matrix if it remains fast. If a framework's WebSocket implementation or Playwright support differs by browser version, prefer assertions on the promised UI outcome over a browser-specific error string.

## Make the suite deterministic in CI

Parallel workers must not share a channel whose messages can leak between tests. Give each test a unique room, instrument, or tenant identifier, and have the server echo that identifier in events. Clean server state through supported APIs. Waiting for “any update” on a shared feed invites false positives from another worker.

Keep reconnection observability in the application. A stable status element, attempt telemetry in non-production builds, and message sequence IDs improve operations as well as tests. Do not expose secrets or implementation-only controls to production users. Prefer semantic states such as \`reconnecting\`, \`resyncing\`, and \`live\` over a spinner that cannot reveal why it is moving.

When a test fails, retain the Playwright trace, console messages, socket URL without sensitive query parameters, timestamps for socket creation and close, sanitized recovery frames, and the final UI state. The trace alone may show actions but not every frame payload. A small structured attachment usually explains whether the problem was no retry, rejected auth, missing subscribe, or stale rendering.

Finally, assign each layer a clear job. Unit tests prove retry arithmetic and state-machine transitions. Routed Playwright tests prove browser UI behavior against exact close sequences. Offline Playwright tests prove recovery through the deployed stack. Proxy or server-kill tests probe transport edge cases. This split is faster and more trustworthy than forcing one oversized end-to-end test to diagnose every failure mode.

## Frequently Asked Questions

### Can Playwright terminate an existing WebSocket with \`page.route()\`?

No. \`page.route()\` handles HTTP routing. Register \`page.routeWebSocket()\` before the socket is created, then call \`WebSocketRoute.close()\` from the route handler. For a socket that is already connected without routing, Playwright's observed \`WebSocket\` object is primarily for inspection. Plan the fault injection before navigation or use an external server or proxy control.

### Should a reconnection test assert close code 1006?

Usually not as a universal browser assertion. Code 1006 represents an abnormal closure and cannot be sent in a WebSocket close frame. A browser may report it when connectivity disappears, but exact event details can vary with the failure path. Assert the product's recovery behavior, and use a legal explicit code such as 1012 when testing planned service restart handling.

### Why does the WebSocket route never see my application's connection?

The common cause is registration order: only sockets created after \`routeWebSocket()\` is installed are routed. Register it before \`page.goto()\`. Then check the URL matcher, including scheme, path, base URL resolution, and changing query parameters. Also confirm that the application really uses a browser WebSocket rather than polling or a worker-owned transport outside the expected page path.

### How do I test exponential backoff without making Playwright wait for minutes?

Verify the exact delay series with controlled timers in a unit or component test. In Playwright, supply a documented short test policy or assert broad timing bounds and attempt counts with \`expect.poll()\`. Retain a less frequent environment test with production timing if the actual long wait and its UX are release-critical.

### What proves that reconnection did not duplicate subscriptions?

Capture outbound subscribe frames per connection and assert one expected subscription on each replacement socket. Then publish one uniquely identified server event and assert one resulting UI item. Attempt count alone is insufficient because duplicate listeners on a single new socket can still render the event multiple times.
`,
};
