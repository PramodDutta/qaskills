import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Performance Testing WebSocket Concurrency Limits with k6',
  description: 'Use performance testing WebSocket concurrency limits workflows to measure accepted sockets, connection failures, message latency, saturation, and safe capacity.',
  date: '2026-08-08',
  category: 'Performance',
  content: `
# Performance Testing WebSocket Concurrency Limits with k6

Performance testing WebSocket concurrency limits means increasing simultaneous open connections in controlled steps while measuring four separate outcomes: attempted connections, accepted upgrades, connections that remain open, and useful message service at the target latency. The safe limit is not the largest number that completed an HTTP 101 handshake. It is the highest sustained concurrency that still meets connection, message, error, and infrastructure objectives with repeatable headroom.

For a runnable workflow, use a deterministic local WebSocket fixture, drive exact connection counts with k6's \`per-vu-iterations\` executor, let each virtual user open a known number of sockets through \`k6/websockets\`, and corroborate k6 metrics with authoritative active-connection metrics from the server. Then repeat steps around the first failure point instead of jumping directly to a dramatic spike.

Grafana documents the current \`k6/websockets\` API at https://grafana.com/docs/k6/latest/javascript-api/k6-websockets/ and built-in metrics at https://grafana.com/docs/k6/latest/using-k6/metrics/reference/. The newer module uses a global event loop, allowing one VU to manage multiple concurrent connections. Use [k6 versus JMeter in 2026](/blog/k6-vs-jmeter-2026) for runner selection, and interpret degraded response distributions with [performance testing p99 tail latency analysis](/blog/performance-testing-p99-tail-latency-analysis).

## Define concurrency at three observation points

Teams often say “10,000 WebSockets” without specifying where those sockets are counted. A client may attempt 10,000 connections while only 9,500 receive upgrades and 8,900 remain open after five minutes. A load balancer, application process, and presence service can each report a different number due to routing and sampling time.

| Quantity | Precise meaning | Source of truth |
|---|---|---|
| Attempted | Client constructors or handshake attempts started | Load generator counter |
| Accepted | Upgrade completed and open event fired | Client open event plus edge 101 metric |
| Active | Connections open at one timestamp | Server or load-balancer gauge |
| Stable | Connections still open after hold duration | Client close trace plus server gauge |
| Useful | Stable connections meeting message SLO | Correlated message metric |

Declare which quantity the requirement uses. “Support 20,000 connections” becomes testable when rewritten as: sustain 20,000 active authenticated connections for fifteen illustrative minutes, keep unexpected closes below the agreed error budget, and keep application echo round-trip p99 below the agreed threshold.

Numbers in examples here are illustrative. Derive real targets from production traffic, growth forecasts, reconnect behavior, and capacity policy. Do not publish an example threshold as a product promise.

## Build a local fixture with an observable hard cap

The following Node fixture uses the documented \`ws\` package. It echoes messages, rejects upgrades after a configurable active-connection cap, and exposes JSON statistics on \`/stats\`. This gives the test a known limit before it touches a real system.

Create a directory and install the one runtime dependency:

\`\`\`bash
mkdir websocket-capacity-lab
cd websocket-capacity-lab
npm init -y
npm install ws
\`\`\`

Create \`fixture-server.mjs\`:

\`\`\`js
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

const port = Number(process.env.PORT ?? '8080');
const maxConnections = Number(process.env.MAX_CONNECTIONS ?? '100');

let active = 0;
let peak = 0;
let accepted = 0;
let rejected = 0;
let messages = 0;

const server = createServer((request, response) => {
  if (request.url === '/stats') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      active, peak, accepted, rejected, messages, maxConnections,
    }));
    return;
  }

  response.writeHead(404, { 'content-type': 'text/plain' });
  response.end('not found\\n');
});

const sockets = new WebSocketServer({ noServer: true });

sockets.on('connection', (socket) => {
  active += 1;
  accepted += 1;
  peak = Math.max(peak, active);

  socket.on('message', (data, isBinary) => {
    messages += 1;
    socket.send(data, { binary: isBinary });
  });

  socket.on('close', () => {
    active -= 1;
  });
});

server.on('upgrade', (request, socket, head) => {
  if (request.url !== '/ws') {
    socket.write('HTTP/1.1 404 Not Found\\r\\nConnection: close\\r\\n\\r\\n');
    socket.destroy();
    return;
  }

  if (active >= maxConnections) {
    rejected += 1;
    socket.write('HTTP/1.1 503 Service Unavailable\\r\\nConnection: close\\r\\n\\r\\n');
    socket.destroy();
    return;
  }

  sockets.handleUpgrade(request, socket, head, (webSocket) => {
    sockets.emit('connection', webSocket, request);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(\`fixture listening on http://127.0.0.1:\${port}\`);
});
\`\`\`

Start it with an illustrative cap of 100:

\`\`\`bash
MAX_CONNECTIONS=100 node fixture-server.mjs
\`\`\`

This cap is enforced in one Node process. It is a teaching fixture, not a production admission-control design. A distributed service needs shared capacity policy or per-instance limits coordinated with routing.

## Create an exact-connection k6 scenario

One VU does not have to equal one socket when using \`k6/websockets\`. The module's global event loop supports multiple concurrent WebSockets per VU. Make that multiplication explicit:

\`\`\`text
planned sockets = TARGET_VUS * SOCKETS_PER_VU
\`\`\`

Create \`capacity.js\`:

\`\`\`js
import { WebSocket } from 'k6/websockets';
import { Counter, Trend } from 'k6/metrics';

const targetVus = Number(__ENV.TARGET_VUS || '20');
const socketsPerVu = Number(__ENV.SOCKETS_PER_VU || '2');
const sessionMs = Number(__ENV.SESSION_MS || '30000');
const messageEveryMs = Number(__ENV.MESSAGE_EVERY_MS || '1000');
const url = __ENV.WS_URL || 'ws://127.0.0.1:8080/ws';

const socketOpened = new Counter('socket_opened');
const socketClosed = new Counter('socket_closed');
const socketErrors = new Counter('socket_errors');
const messageRoundTrip = new Trend('message_round_trip_time', true);
const malformedMessages = new Counter('malformed_messages');

export const options = {
  scenarios: {
    capacity: {
      executor: 'per-vu-iterations',
      vus: targetVus,
      iterations: 1,
      maxDuration: '45s',
    },
  },
  thresholds: {
    ws_connecting: ['p(95)<1000'],
    message_round_trip_time: ['p(95)<250', 'p(99)<500'],
    malformed_messages: ['count==0'],
  },
};

export default function () {
  for (let index = 0; index < socketsPerVu; index += 1) {
    openSocket(index);
  }
}

function openSocket(index) {
  const webSocket = new WebSocket(url, [], {
    tags: { test: 'capacity' },
  });
  let sequence = 0;
  let intervalId;

  webSocket.addEventListener('open', () => {
    socketOpened.add(1);
    intervalId = setInterval(() => {
      sequence += 1;
      webSocket.send(JSON.stringify({
        type: 'echo',
        id: \`\${__VU}-\${index}-\${sequence}\`,
        sentAt: Date.now(),
      }));
    }, messageEveryMs);
  });

  webSocket.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type !== 'echo' || typeof message.sentAt !== 'number') {
        malformedMessages.add(1);
        return;
      }
      messageRoundTrip.add(Date.now() - message.sentAt);
    } catch {
      malformedMessages.add(1);
    }
  });

  webSocket.addEventListener('error', () => {
    socketErrors.add(1);
  });

  webSocket.addEventListener('close', () => {
    if (intervalId !== undefined) clearInterval(intervalId);
    socketClosed.add(1);
  });

  setTimeout(() => {
    if (intervalId !== undefined) clearInterval(intervalId);
    webSocket.close();
  }, sessionMs);
}
\`\`\`

The \`per-vu-iterations\` executor gives every VU one iteration. The timers and open sockets keep the global event loop active until closure. With 20 VUs and two sockets per VU, the planned concurrency is 40. The actual concurrency must be read from \`socket_opened\`, close/error events, and server statistics.

The custom round-trip metric measures application echo time, not network ping. That is intentional. A server can respond to WebSocket control frames while the application message pipeline is saturated.

## Run a staircase instead of one destructive leap

Start below the expected limit, then increase in steps. Against the fixture cap of 100, these commands request 40, 80, 100, and 120 sockets:

\`\`\`bash
TARGET_VUS=20 SOCKETS_PER_VU=2 k6 run capacity.js
TARGET_VUS=40 SOCKETS_PER_VU=2 k6 run capacity.js
TARGET_VUS=50 SOCKETS_PER_VU=2 k6 run capacity.js
TARGET_VUS=60 SOCKETS_PER_VU=2 k6 run capacity.js
\`\`\`

After each run, query the server:

\`\`\`bash
curl --fail --silent http://127.0.0.1:8080/stats
\`\`\`

The fixture counters accumulate across runs, so restart it for isolated per-step counts or record deltas. For a production system, attach a run ID tag or use a dedicated test environment so unrelated traffic does not contaminate results.

| Step result | Interpretation | Next action |
|---|---|---|
| All planned sockets open, SLOs pass | Capacity not yet found | Increase one controlled step |
| Opens pass, message tail worsens | Application pipeline saturating | Inspect queues and event-loop lag |
| Handshakes slow before failures | Edge, TLS, accept queue, or auth pressure | Inspect handshake path |
| Upgrades rejected cleanly at known cap | Admission control working | Verify retry guidance and observability |
| Connections open then close unexpectedly | Resource or policy limit after upgrade | Correlate close codes and server logs |

Repeat at least one step below the first failing point and the failing point itself. A one-off success can reflect warm caches, lucky routing, or delayed resource cleanup.

## Keep connection rate separate from steady concurrency

Concurrency and arrival rate stress different mechanisms. Opening 10,000 connections over ten minutes primarily tests steady-state memory and socket handling. Opening them in ten seconds adds TLS handshakes, authentication, routing, and reconnect-storm pressure.

Use two phases in your test program:

1. Capacity hold: establish connections at a controlled rate, then maintain the target long enough to observe memory, CPU, file descriptors, message latency, and unexpected closes.
2. Reconnect shock: intentionally reconnect a bounded cohort at once and measure recovery, admission control, and backoff behavior.

Do not infer reconnect safety from a long steady hold. Conversely, a fast ramp that fails during TLS does not prove the application cannot sustain the target after a slower ramp.

| Workload dimension | Parameter | Primary subsystem stressed |
|---|---|---|
| Concurrent open sockets | VUs times sockets per VU | Memory, descriptors, connection registry |
| Connection arrival rate | New handshakes per second | Listener, TLS, authentication, load balancer |
| Messages per connection | Send interval | Serialization and application handlers |
| Fan-out recipients | Subscribers per published event | Broker and outbound queues |
| Payload size | Encoded bytes | Bandwidth, compression, allocation |
| Session duration | Hold time | Leaks, heartbeat policy, idle timeout |

Change one dominant dimension at a time during limit discovery. Then combine realistic dimensions for the final capacity qualification.

## Measure meaningful messages, not only socket survival

An idle WebSocket consumes less CPU and bandwidth than a collaborative editor, trading feed, or chat room. Build a message model from production observations without copying sensitive payloads. Capture size distributions, client-to-server frequency, server fan-out, binary versus text framing, compression policy, and acknowledgement behavior.

The echo fixture validates request-response correlation. A real broadcast test needs a stable oracle. For example, publish sequence numbers to a room and have each subscriber record gaps, duplicates, and end-to-end delay. Do not count “message event fired” as success if payload order or completeness matters.

Useful application metrics include:

- publish-to-receive latency by message class
- received sequence gaps
- duplicate message rate
- acknowledgement timeout rate
- outbound queue depth per connection
- dropped messages due to slow-consumer policy
- close codes grouped by client, edge, and server origin

The built-in k6 metrics include \`ws_connecting\`, \`ws_msgs_received\`, \`ws_msgs_sent\`, \`ws_ping\`, \`ws_session_duration\`, and \`ws_sessions\`. Add custom metrics for business-level correctness and latency.

## Corroborate client counts with server telemetry

Load-generator counters tell you what the client observed. Server telemetry explains resource saturation. At every step, collect synchronized time series from the load balancer, application, broker, and host or container platform.

| Layer | Metrics to capture | Failure signature |
|---|---|---|
| Edge or load balancer | Active connections, upgrade codes, TLS latency | 101 rate falls, 5xx rises |
| Application | Active sessions, event-loop lag, heap, CPU | Message tail grows, GC pressure |
| Operating system | Open descriptors, socket states, accept backlog | Near-limit descriptors, refused accepts |
| Broker | Subscriptions, queue depth, publish latency | Fan-out lag and slow consumers |
| Load generator | CPU, memory, open descriptors, network | Generator saturates before SUT |

If the generator's CPU is exhausted, increasing VUs measures the injector. Distribute generation across hosts, but keep total planned sockets explicit and verify that each shard uses a unique client identity. Avoid starting identical full-load scripts on multiple runners unless the intended total multiplies accordingly.

On Linux hosts you control, these read-only commands help inspect limits and current process descriptors:

\`\`\`bash
ulimit -n
cat /proc/sys/fs/file-max
pidof node
\`\`\`

\`ulimit -n\` is shell-specific and applies to the current process context. The system-wide file maximum is not the same as the per-process limit. Container runtime limits and managed load-balancer quotas may add more boundaries. Record effective values inside the actual test and server processes.

## Calculate achieved concurrency from events

At a minimum, reconcile planned, opened, errored, and closed values. For one exact session window:

\`\`\`text
planned = target VUs * sockets per VU
accepted fraction = socket_opened / planned
unexpectedly lost = opened before planned close - still active at hold checkpoint
\`\`\`

End-of-test \`socket_closed\` will include intentional closes, so it cannot alone represent failures. Track whether the close happened before the planned deadline, and record the WebSocket close code and reason if the API and service provide them. A normal close at the end is success; an early policy or abnormal close is not.

For production qualification, query an authoritative active gauge during the hold plateau. Client open events can be temporarily ahead of application registration, and a final count after graceful closure will correctly be zero but says nothing about peak sustained concurrency.

## Avoid the one-VU-one-connection assumption

What people get wrong is setting k6 \`vus: 10000\`, assuming this is the only path to 10,000 WebSockets, then overloading the load generator with VU state. With \`k6/websockets\`, one VU can manage multiple concurrent connections on the global event loop. That can improve generator efficiency, but it changes workload semantics.

One VU with 100 sockets is not automatically equivalent to 100 VUs with one socket each. Per-VU cookies, authentication state, setup data, and code execution are shared differently. If one VU represents one user, multiple sockets per VU may correctly model tabs or channels for that user. If every socket represents a unique user identity, ensure each connection has independent credentials and state even if a VU manages several.

Benchmark the generator topology before the system test:

| Mapping | Appropriate model | Risk |
|---|---|---|
| 1 VU -> 1 socket | One session per user | Higher VU overhead |
| 1 VU -> several sockets | User owns multiple channels | Accidental shared identity |
| 1 VU -> many unique users | Generator optimization | Complex data and correlation |
| Many generators -> sharded sockets | Very large test | Duplicate identities or double load |

Keep the SUT workload equivalent when comparing mappings. If results differ, inspect generator saturation and shared per-VU state before blaming the server.

## Diagnose connections that open and die near the limit

A realistic failure mode looks healthy in a shallow report: 5,000 attempted sockets produce 5,000 open events, but within ninety illustrative seconds, several hundred close and p99 message latency spikes. The team reports a 5,000-connection capacity because it counted only successful handshakes.

Diagnose in timeline order:

1. Graph attempted, open, active, early-close, and message-success counts on the same clock.
2. Group close codes and reasons, while recognizing that an abnormal network loss may provide limited reason data.
3. Compare application heap, garbage collection, event-loop lag, CPU, and descriptor use at the first close burst.
4. Inspect load balancer idle timeout and backend connection limits.
5. Verify heartbeat traffic actually runs and is processed under load.
6. Check outbound queue growth and slow-consumer eviction.
7. Confirm the generator retained enough CPU and descriptors.
8. Repeat one lower step with the same message workload and hold time.

If active connections fall while handshakes remain successful, the bottleneck is after admission. Common candidates are memory pressure, heartbeat starvation, broker subscription limits, idle policy, or slow-consumer enforcement. The correct fix depends on evidence, not the handshake count.

## Test graceful overload and reconnect behavior

A capacity limit should fail predictably. New connections beyond a configured cap might receive an HTTP rejection during upgrade, a documented close code after admission, or routing to another healthy instance. Whatever the design, tests should assert consistent signaling and no degradation of already admitted sessions.

Run an overload cohort while a control cohort remains connected. The control clients continue sending correlated messages. Assert that rejected newcomers do not cause control latency or error rate to cross its SLO. This exposes admission control that activates too late, after new sockets have already consumed scarce application resources.

Reconnect tests must use bounded exponential backoff with jitter in real clients. A performance script that reconnects immediately in a tight loop can create a self-amplifying storm unlike intended client behavior. Conversely, you may deliberately run that pathological case as a resilience experiment, but label it separately and protect the environment.

## Establish a safe operating limit

The breaking point and the safe operating limit are different. Suppose a test first violates the agreed message SLO at 12,000 connections. The release limit should be below that point by a margin justified by production variability, failover, uneven load distribution, background tasks, and growth. There is no universal percentage.

Use an evidence table for the decision:

| Candidate level | Accepted and stable | Message SLO | Resource headroom | Repeatable | Decision |
|---:|---:|---:|---:|---:|---|
| Illustrative 8,000 | Yes | Pass | Comfortable | Yes | Qualified |
| Illustrative 10,000 | Yes | Pass | Narrow | Yes | Investigate |
| Illustrative 12,000 | Mostly | Fail p99 | Low | Yes | Not qualified |
| Illustrative 14,000 | No | Fail | Exhausted | Yes | Breaking region |

Store raw k6 output, test configuration, server build identity, infrastructure configuration, target telemetry, and run timestamps. A single chart without configuration cannot support a capacity claim.

## Turn the workflow into a repeatable QA gate

Capacity tests are usually too expensive for every pull request. Split the program:

- PR smoke: a handful of sockets, schema-valid messages, clean close behavior.
- Scheduled baseline: moderate concurrency, fixed environment, trend comparison.
- Pre-release qualification: staircase near the operating target, longer hold, failure injection.
- Infrastructure-change test: rerun after load balancer, kernel, broker, runtime, or instance changes.

Fail gates on agreed service objectives, not on the mere presence of any error during deliberate overload. The discovery run should collect the curve. The qualification run should target a declared operating point and have deterministic thresholds.

Review scripts like production code. Pin test data assumptions, bound all timers, close sockets, redact tokens, tag traffic, and include a kill switch. Confirm the test environment is authorized for the planned connection volume before running it.

## Reproduce authentication and TLS costs separately

The local fixture uses plain WebSocket traffic and no authentication. Production usually uses secure WebSockets, certificates, cookies or bearer tokens, origin checks, and a session lookup during upgrade. Those steps can become the first limit during a connection storm even when steady message handling has ample capacity.

Create three comparable profiles: unauthenticated upgrade in an isolated environment, authenticated upgrade with realistic identity validation, and steady sockets after authentication. The difference between the first two quantifies handshake-path work. The third separates recurring message cost from connection setup.

Never reuse one production credential across thousands of simulated users unless that is the real access pattern. Token caches, per-user limits, and session stores behave differently with unique identities. Generate authorized synthetic accounts, partition them across load generators, and prevent two active VUs from accidentally claiming the same identity unless multi-device behavior is intentional.

TLS session resumption can make repeated laboratory runs faster than a cold client population. Record whether connections resume sessions, which edge terminates TLS, and whether DNS distributes traffic as expected. A capacity report that omits these conditions is hard to reproduce.

## Include compression and payload allocation in capacity tests

WebSocket per-message compression trades bandwidth for CPU and memory. The appropriate setting depends on payload size, repetition, client support, and server implementation. Test compression as a separate configuration rather than toggling it midway through a comparison.

Use the same logical messages and record encoded bytes, CPU, heap, event-loop lag, and message percentiles. Small payloads may gain little from compression while still paying negotiation and allocation costs. Large repetitive payloads can reduce network traffic but shift the limit to CPU. The goal is not to declare compression universally good or bad, but to identify which resource becomes limiting under the production policy.

Binary and text messages also exercise different parsing paths. If the product carries both, preserve their representative ratio and validate decoded content. A test that sends tiny text echoes cannot qualify a service whose dominant workload is large binary updates.

## Hold the plateau long enough to expose cleanup defects

Short tests find immediate admission limits. They often miss gradual heap growth, leaked subscriptions, heartbeat drift, and sockets that remain registered after disconnect. Add a soak plateau at a qualified concurrency, followed by controlled closure and a recovery observation window.

During recovery, active connections, subscriptions, per-client queues, and descriptor use should return near the known idle baseline within a documented interval. Account for connection pools and caches that intentionally remain warm. Repeat connect, hold, disconnect cycles to detect resources that increase on every generation.

| Phase | Primary assertion | Leak signal |
|---|---|---|
| Ramp | Acceptance follows plan | Rejection below target |
| Plateau | Active count and latency stable | Monotonic heap or queue growth |
| Graceful close | Expected close completion | Clients hang past deadline |
| Recovery | Resources return toward baseline | Descriptors or subscriptions remain |
| Second cycle | Behavior matches first cycle | Earlier saturation or slower cleanup |

Correlate server cleanup with client close intent. If the generator process is killed, the server observes network loss rather than a graceful close, which is a separate resilience case. Run both intentionally and label them correctly.

## Frequently Asked Questions

### How many WebSocket connections should one k6 VU open?

There is no universal number. With \`k6/websockets\`, one VU can manage multiple concurrent connections, which may reduce generator overhead. Choose the mapping that matches identity and session semantics, then benchmark the generator. One VU per user is simple when each user owns one socket. Several sockets per VU can model multiple channels or act as a scaling optimization, but credentials, cookies, and mutable VU state must remain correct for every simulated client.

### Which k6 metrics matter for WebSocket concurrency limits?

Start with \`ws_connecting\`, \`ws_sessions\`, \`ws_session_duration\`, \`ws_msgs_sent\`, \`ws_msgs_received\`, and \`ws_ping\` where ping traffic is used. Add custom metrics for application message round-trip, malformed payloads, sequence gaps, early closes, and business acknowledgements. Corroborate them with server-side active connections, resource use, queue depth, and upgrade outcomes. No single client metric proves stable useful concurrency across an entire hold period and recovery cycle reliably.

### Is a successful WebSocket handshake enough to count capacity?

No. A handshake proves that the upgrade completed at one moment. The connection may close seconds later, receive no useful messages, or contribute to latency that violates the service objective. Count accepted, active, stable, and useful connections separately. Hold the target long enough to expose leaks, heartbeat starvation, and slow-consumer behavior, then measure application-level message success while connections remain open.

### How do I know whether the server or load generator hit the limit?

Monitor both sides on a synchronized timeline. If generator CPU, memory, descriptors, or network saturate while server resources remain comfortable, distribute or tune the injectors. If edge upgrade failures, server descriptor use, heap, event-loop lag, or broker queues deteriorate first, the system under test is the likely boundary. Repeat a lower step and change generator topology while preserving the same total workload. A limit is credible only when the bottleneck is identified and reproducible.
`,
};
