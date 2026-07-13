import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing WebSocket Presence After Reconnection',
  description:
    'Test WebSocket presence after reconnection with deterministic session models, heartbeat control, stale-socket races, and multi-device state assertions.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Testing WebSocket Presence After Reconnection

Alice closes her laptop for thirty seconds, opens it again, and appears online twice. Bob's member list briefly removes her, then restores her, then removes her again when the old socket cleanup finally arrives. Alice can still send messages, yet other users see a stale offline badge. This is not merely a WebSocket reconnection bug. It is a presence identity and event-ordering bug.

Presence is derived state. A socket is a transport connection; a user is a logical identity; a device or browser tab is a session; “online” is a policy computed from active sessions, heartbeats, leases, and grace periods. Reliable tests keep those concepts separate and force events into orders that ordinary happy-path tests rarely produce.

This guide presents an SDET strategy for reconnect correctness, including a runnable reference server, browser-level tests, deterministic race controls, and a coverage matrix. For protocol setup, framing, and general automation patterns, read the [WebSocket testing guide](/blog/websocket-testing-guide). For cross-layer assertions and negative cases that also apply to handshake APIs, use the [API testing best practices guide](/blog/api-testing-best-practices-guide).

## Model Presence Before Testing It

A simplistic implementation stores \`online[userId] = true\` on connect and sets it to false on disconnect. It fails as soon as the user has two tabs. Closing one tab marks the user offline even though the other is active. Reconnection adds another failure: cleanup from connection A can overwrite activation from newer connection B.

A stronger model tracks connection IDs under logical sessions and derives user presence from all live sessions. Every reconnect receives a new connection generation. Cleanup removes only the connection it owns. If the product supports resume tokens, the logical session can remain stable while its transport generation changes.

| Identity level | Example | Lifetime | Test assertion |
|---|---|---|---|
| User | \`user-42\` | Account lifetime | Online if policy finds any active session |
| Device or tab session | \`session-web-7\` | Login or tab lifetime | Resumes only with valid token |
| WebSocket connection | \`conn-103\` | One transport lifetime | Old cleanup cannot delete a newer connection |
| Generation | \`8\` | Increments on reconnect | Events with lower generation are stale |
| Presence lease | Expires at timestamp | Heartbeat-controlled | Offline transition occurs after policy delay |

Write the invariant in plain language: a user is online when at least one authenticated session has a non-expired active connection, and an event from an older connection must never change the state owned by a newer generation. Your actual policy may include mobile push sessions, background states, or invisible mode. Make those explicit rather than burying them in test waits.

## Define the Observable Contract

Tests need more than “the green dot appears.” Capture server state, published presence events, and client UI. Each is a separate oracle.

At the server, inspect active sessions by user, connection ID, generation, and lease expiry. On the event stream, inspect monotonically increasing presence version, state, reason, and timestamp. In the client, inspect the roster entry, reconnect indicator, and last applied version. Durable messages sent during disconnection may require their own sequence cursor and are not the same as presence.

An effective presence event resembles this:

\`\`\`json
{
  "type": "presence.changed",
  "userId": "user-42",
  "state": "online",
  "version": 19,
  "activeSessions": 1,
  "reason": "session_resumed",
  "observedAt": "2026-07-13T10:15:00.000Z"
}
\`\`\`

The version lets consumers discard late events. A timestamp alone is weaker because servers can have clock skew, two events can share a timestamp resolution, and client clocks are untrusted.

## A Runnable Presence Server with Generation Guards

The following Node server uses the \`ws\` package. It accepts a \`userId\`, \`sessionId\`, and numeric \`generation\` in the connection URL. A newer generation replaces the old socket. Most importantly, the old socket's close handler deletes the session only if the map still points to that exact connection record.

Save it as \`presence-server.mjs\`, install \`ws\`, and run \`node presence-server.mjs\`. It is intentionally small but fully executable.

\`\`\`javascript
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';

const wss = new WebSocketServer({ port: 8080 });
const sessions = new Map();
let presenceVersion = 0;

function key(userId, sessionId) {
  return \`\${userId}:\${sessionId}\`;
}

function activeCount(userId) {
  return [...sessions.values()].filter((record) => record.userId === userId).length;
}

function broadcastPresence(userId, state, reason) {
  const event = JSON.stringify({
    type: 'presence.changed',
    userId,
    state,
    reason,
    activeSessions: activeCount(userId),
    version: ++presenceVersion,
  });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(event);
  }
}

wss.on('connection', (socket, request) => {
  const url = new URL(request.url, 'ws://localhost');
  const userId = url.searchParams.get('userId');
  const sessionId = url.searchParams.get('sessionId');
  const generation = Number(url.searchParams.get('generation'));
  if (!userId || !sessionId || !Number.isSafeInteger(generation)) {
    socket.close(1008, 'invalid identity');
    return;
  }

  const sessionKey = key(userId, sessionId);
  const previous = sessions.get(sessionKey);
  if (previous && previous.generation >= generation) {
    socket.close(1008, 'stale generation');
    return;
  }

  const record = { id: randomUUID(), userId, sessionId, generation, socket };
  sessions.set(sessionKey, record);
  if (previous) previous.socket.close(4001, 'replaced by reconnect');
  broadcastPresence(userId, 'online', previous ? 'session_resumed' : 'connected');

  socket.on('close', () => {
    if (sessions.get(sessionKey) !== record) return;
    sessions.delete(sessionKey);
    if (activeCount(userId) === 0) {
      broadcastPresence(userId, 'offline', 'last_connection_closed');
    }
  });

  socket.on('message', (data) => {
    if (data.toString() === 'ping') socket.send('pong');
  });
});

console.log('presence server listening on ws://127.0.0.1:8080');
\`\`\`

This server broadcasts an online event during replacement even if the user was already online. A production system might suppress unchanged states and emit a separate session event. Whichever contract you choose, test it explicitly. Consumers should not infer offline just because one connection closed.

The reference lacks authentication, distributed storage, lease expiry, and backpressure because those would obscure the generation guard. Your integration environment should add them one boundary at a time.

## Force the Old-Close, New-Open Race

The signature reconnection case is not “disconnect, wait, reconnect.” That orderly sequence is easy. The valuable case is:

1. Connection A is active at generation 7.
2. The network becomes unreachable without delivering a close frame.
3. The client reconnects as connection B at generation 8.
4. The server accepts B and marks the session active.
5. Delayed cleanup for A executes.
6. Presence must remain online and owned by B.

Use controllable gates in the server or gateway to pause A's cleanup until B is registered. Avoid hoping that packet timing creates the order. A test-only hook can queue close processing by connection ID and release it through an authenticated control API available only in the isolated test environment.

Assert the state after every numbered transition. Final-state-only assertions can miss a visible offline flicker between steps five and six. Subscribe an observer client and record every event for Alice. The acceptable sequence might be one initial online event and no state change during resume. It must never contain offline after B becomes active.

| Phase | Active record | Expected derived presence | Forbidden event |
|---|---|---|---|
| A connected | A, generation 7 | Online | Offline |
| A network lost | A until lease or cleanup | Online or grace, by policy | Premature offline |
| B accepted | B, generation 8 | Online | Offline |
| A cleanup released | B, generation 8 | Online | Offline from A cleanup |
| B closed normally | None | Offline after policy delay | Duplicate transitions |

## Browser Test the Reconnect, Not a Page Reload

A page reload creates a new JavaScript environment and may bypass the application's reconnect state machine. Test a real transport interruption while the page stays alive. Playwright can route HTTP, but it does not universally simulate every WebSocket failure mode at the operating-system level. A purpose-built test server control is more deterministic: instruct the server to terminate the current socket without a graceful close and observe the client reconnect.

The following Playwright test is runnable when your application exposes test IDs and a test control endpoint. It uses an observer page to verify remote presence and the Alice page to verify recovery. Replace the URLs with your application routes.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('remote presence stays online when an old socket closes after reconnect', async ({
  browser,
  request,
}) => {
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const alice = await aliceContext.newPage();
  const bob = await bobContext.newPage();

  await alice.goto('/test-login?user=alice&session=alice-web');
  await bob.goto('/test-login?user=bob&session=bob-web');
  await expect(bob.getByTestId('presence-alice')).toHaveText('Online');

  const beforeGeneration = Number(
    await alice.getByTestId('socket-generation').getAttribute('data-generation'),
  );
  await request.post('/__test__/sockets/partition', {
    data: { userId: 'alice', holdCleanup: true },
  });

  await expect(alice.getByTestId('connection-state')).toHaveText('Connected', {
    timeout: 10_000,
  });
  await expect
    .poll(async () =>
      Number(await alice.getByTestId('socket-generation').getAttribute('data-generation')),
    )
    .toBeGreaterThan(beforeGeneration);

  await request.post('/__test__/sockets/release-cleanup', {
    data: { userId: 'alice', generation: beforeGeneration },
  });

  await expect(bob.getByTestId('presence-alice')).toHaveText('Online');
  const states = await bob.evaluate(() => (window as any).__testPresenceEvents.alice);
  expect(states.slice(-2)).not.toContain('offline');

  await aliceContext.close();
  await bobContext.close();
});
\`\`\`

The observer matters. Alice's own reconnect indicator can recover while every other client receives an incorrect offline event. Presence is a distributed view, so at least one test must assert from another authenticated user's session.

Do not expose production control endpoints. Compile them only into a test deployment or protect them through network isolation and short-lived credentials. An endpoint that can partition arbitrary users is an operational risk.

## Test Heartbeats and Leases with a Controllable Clock

Many systems cannot rely on TCP close events. Mobile networks and sleeping laptops leave half-open sockets. The server marks a connection stale when heartbeat acknowledgements stop and its lease expires. Real sleeps make these tests slow and flaky.

Inject a clock into the presence coordinator. Advance it to one tick before expiry and assert online. Advance to the expiry boundary and run the lease sweep; assert the documented boundary, either active through \`expiresAt\` or expired at \`expiresAt\`. Then reconnect before grace expiry and assert that no offline transition was published.

Separate heartbeat interval, lease duration, and offline grace. They answer different questions:

- Heartbeat interval controls when liveness probes occur.
- Lease duration controls how long a connection remains valid without renewal.
- Offline grace suppresses brief visible transitions while reconnect is expected.
- Client backoff controls when reconnect attempts occur.

Test values that make ordering obvious, such as heartbeat every 10 seconds, lease at 30 seconds, and offline grace at 5 seconds. In production the values may differ, but the logical relationships should remain.

## Cover Multi-Tab and Multi-Device Sessions

Presence should usually aggregate across sessions. Open Alice in two browser contexts or devices, plus Bob as observer. Close Alice's first tab and assert she remains online with one active session. Reconnect the closed tab with a new generation and assert active session count returns to two without an offline event. Then close both and assert exactly one offline transition after the final lease or grace period.

Do not use two pages in the same browser context if the application coordinates tabs through shared storage, a service worker, or \`BroadcastChannel\`. That may be a valid same-browser scenario, but it does not model independent devices. Include both shapes.

Invisible or away modes add precedence rules. A user may manually select invisible while two sockets remain connected. Reconnection must not reset the preference to online. Model availability preference separately from transport liveness and assert the rendered state according to product rules.

| Scenario | Sessions before | Action | Expected user state |
|---|---:|---|---|
| Close one of two tabs | 2 | One clean close | Online |
| Replace one socket | 2 | Higher generation accepted | Online, still 2 sessions |
| Lose final device | 1 | Lease expires | Offline after grace |
| Reconnect during grace | 0 transport, grace active | Session resumes | Online with no offline flicker |
| Manual invisible reconnect | 1 invisible | Socket replaced | Invisible |

## Verify Event Ordering and Deduplication

Networks can duplicate, delay, and reorder events. The observer client should store the highest presence version per user and ignore lower or equal versions. Test delivery of version 22 online followed by delayed version 21 offline. The rendered state must remain online. Then deliver version 23 offline and confirm the transition.

At-least-once brokers can deliver version 22 twice. The UI should not animate twice, emit duplicate analytics, or reorder the roster. Test side effects as well as text.

If the system uses per-user versions, compare only within that user's stream. A global sequence can become a scalability bottleneck. If versions reset after data migration or region failover, include an epoch identifier so consumers can distinguish a new stream from a stale packet.

Reconnection often also triggers a snapshot. Define how snapshots interact with incremental events. A common rule is: subscribe, receive a snapshot with cursor N, then apply only events greater than N. Test an event arriving while the snapshot is being constructed. Without an atomic cursor boundary, the observer can miss or reverse a transition.

## Authenticate Resume Attempts

A resume token must be bound to the user, session, expiry, and preferably client context required by the threat model. Test that Bob cannot present Alice's session ID, that an expired token is rejected, and that a token for generation 7 cannot displace generation 8.

On authentication failure, do not temporarily mark the claimed user online. Validate before registering presence. Assert that the observer receives no event for rejected connections. Also verify close codes and reasons carefully; public clients should not receive sensitive authentication diagnostics.

Token refresh can race with reconnect. Force the access token to expire during an outage, then verify the client refreshes once, reconnects with the new credential, and does not create parallel sockets from competing refresh attempts. A single-flight refresh mechanism should have a concurrency test.

## Reconnect Backoff Is Part of Presence Quality

Immediate tight-loop reconnects can overload a recovering service. Exponential backoff with jitter reduces synchronized load, but it extends how long presence may be uncertain. Test the two policies together.

Capture client reconnect timestamps using an injected scheduler or seeded random source. Assert no attempt occurs before the minimum delay, the delay caps at the configured maximum, a successful connection resets the attempt counter, and a server-provided terminal close code disables reconnect. Do not demand exact jitter values unless the random source is controlled.

Presence grace should exceed a normal reconnect window if the product promises no visible flicker. That is a product tradeoff: a longer grace hides transient outages but delays truthful offline status. Tests should encode the chosen promise, not invent one.

## Build a Layered Reconnection Suite

Unit tests should cover generation comparison, lease boundaries, user aggregation, event version rejection, and backoff schedules with fake clocks. Service integration tests should open real sockets, replace connections, force delayed cleanup, and query server state. Browser tests should cover visible remote presence, offline grace, and multi-context behavior. A smaller resilience suite can introduce proxy resets, process restarts, broker delays, and regional failover.

| Layer | Fault control | Primary evidence | Run cadence |
|---|---|---|---|
| Unit | Fake clock and event order | State-machine transitions | Every change |
| Service integration | Real sockets and cleanup gates | Sessions plus emitted events | Every pull request |
| Browser | Control API and observer context | User-visible state | Pull request or main branch |
| Resilience | Proxy, process, broker faults | Cross-service convergence | Scheduled or pre-release |

Use unique user and session IDs per parallel worker. Clean them through an administrative fixture, not by waiting for leases to expire. Record all connection IDs and event versions on failure. A compact ordered trace is more useful than screenshots alone.

## Assert Convergence, Not Instant Global Agreement

Distributed presence may be eventually consistent across nodes or regions. Define a service-level objective such as “all observers converge within two seconds after a confirmed reconnect,” then test with polling against a bounded deadline. Do not use a fixed two-second sleep followed by one assertion. Polling can finish quickly on success and gives clearer timeout diagnostics.

Still assert forbidden intermediate events where the product promises no flicker. Eventual convergence does not excuse an old disconnect overwriting a newer connection. Use server version invariants to prevent regression, and use bounded UI convergence for propagation delay.

Measure reconnect success rate, time to session restoration, false offline transitions during successful resume, duplicate online events, and stale-event rejections. Segment by client version, network type, and region. Production telemetry reveals sequences your lab did not anticipate and should feed new deterministic regression cases.

## Exercise Restart and Rolling Deployment Boundaries

A process restart removes in-memory sockets even when shared presence records still claim they are active. Terminate one server after a heartbeat, route the client to another instance, and verify that the new generation supersedes the orphaned lease. The observer must not see an offline event from delayed shutdown cleanup after the replacement is online.

During a rolling deployment, old and new versions may encode resume metadata differently. Test both upgrade directions and reject incompatible tokens with a controlled reconnect rather than leaving phantom sessions. If presence versions are allocated by each node, prove they remain monotonic through failover or add an epoch that makes ordering explicit. Restart tests are especially effective at exposing process-local generation counters and deduplication maps that appeared correct in a single-node integration suite.

## Frequently Asked Questions

### Should presence be keyed by socket ID or user ID?

Track sockets or sessions individually, then derive presence at the user level. Keying only by user loses multi-device information; keying the displayed state only by socket makes one person appear multiple times.

### How can I test reconnection without flaky network toggling?

Use a test-only server or proxy control that terminates or partitions a named connection and can hold its cleanup. This produces the required event order deterministically while the browser page remains alive.

### Should a reconnect always emit another online event?

That is a product contract choice. Many systems suppress unchanged user state and emit a session-resumed event instead. Whatever you choose, include a monotonic version and test that observers do not flicker or duplicate side effects.

### What is the most important stale-socket assertion?

After the newer generation is active, releasing cleanup for the older connection must not remove the session, publish offline, or reduce the derived user state incorrectly. Assert server state and an observer's event stream.

### How long should the offline grace period be?

Set it from the expected reconnect distribution and the product's tolerance for delayed offline status. Tests should verify boundary behavior, reconnect within grace, and expiry after grace rather than assuming one universal duration.
`,
};
