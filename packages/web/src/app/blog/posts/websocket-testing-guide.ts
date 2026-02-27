import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'WebSocket Testing — Real-Time Apps, Tools, and Automation',
  description:
    'Complete guide to WebSocket testing. Covers connection lifecycle, message validation, reconnection testing, load testing WebSockets, and AI agent automation.',
  date: '2026-02-23',
  category: 'Guide',
  content: `
Real-time features are everywhere -- chat applications, live dashboards, collaborative editors, multiplayer games, financial tickers, and IoT device streams. Behind nearly all of them sits a WebSocket connection holding open a persistent, bidirectional channel between client and server. Unlike traditional HTTP request-response cycles that your existing test automation handles well, **WebSocket testing** introduces stateful connections, asynchronous message flows, and failure modes that most QA teams have never systematically tested. The result is a blind spot: teams ship real-time features with thorough REST API coverage but zero validation of the WebSocket layer that powers the actual user experience.

This guide gives you a practical, end-to-end approach to **real-time testing**. You will learn how WebSockets work under the hood, what makes them uniquely difficult to test, how to validate connection lifecycles and message schemas, how to test reconnection and error handling, how to approach **Socket.IO testing** specifically, how to load test concurrent WebSocket connections, and how to integrate all of it into your CI/CD pipeline. Every section includes code examples you can adapt for your own projects.

---

## Key Takeaways

- **WebSocket testing** requires a fundamentally different approach than HTTP API testing because connections are persistent, bidirectional, and stateful -- you cannot treat each message as an independent request
- The WebSocket connection lifecycle (handshake, open, message, error, close) must be tested explicitly, including authentication during the HTTP upgrade handshake and proper close code handling
- **Message validation** should cover JSON schema conformance, binary data handling, message ordering, and graceful handling of malformed payloads from either side
- **Reconnection testing** is critical for production reliability -- you must validate auto-reconnect logic, exponential backoff strategies, message queuing during disconnects, and state resynchronization after reconnection
- **WebSocket load testing** with tools like k6 and Artillery measures connection establishment time, message latency under concurrent connections, and the maximum number of simultaneous connections your server can sustain
- AI coding agents can automate WebSocket test creation using installable QA skills from [QASkills.sh](/skills), giving your agent specialized knowledge about real-time testing patterns

---

## What Are WebSockets?

**WebSockets** provide a persistent, full-duplex communication channel over a single TCP connection. Unlike HTTP, where the client sends a request and waits for a response, a WebSocket connection allows both the client and server to send messages at any time, independently, without the overhead of establishing a new connection for each exchange.

### The HTTP Upgrade Handshake

Every WebSocket connection begins as an HTTP request. The client sends a standard HTTP GET request with special headers requesting an upgrade to the WebSocket protocol:

\`\`\`
GET /ws HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
\`\`\`

The server responds with HTTP 101 Switching Protocols, and the connection is upgraded from HTTP to WebSocket. From that point forward, both sides communicate using WebSocket frames -- lightweight binary or text messages without HTTP headers.

This handshake is significant for testing because it means **authentication, authorization, and connection negotiation all happen during the HTTP upgrade phase**. If your WebSocket server requires an auth token, it must be passed as a query parameter or in a cookie during the handshake -- there are no headers on individual WebSocket messages.

### When to Use WebSockets

WebSockets are the right choice when your application needs low-latency, bidirectional communication. They shine for chat applications, live sports scores, collaborative editing, multiplayer gaming, and financial data streaming. They are overkill for use cases where the server pushes infrequent updates and the client never sends data back.

Here is how WebSockets compare to other real-time communication patterns:

| Technology | Direction | Connection | Overhead | Best For |
|---|---|---|---|---|
| **WebSocket** | Bidirectional | Persistent | Very low after handshake | Chat, gaming, collaborative editing |
| **Server-Sent Events (SSE)** | Server to client only | Persistent | Low, uses HTTP | Live feeds, notifications, dashboards |
| **Long Polling** | Simulated bidirectional | Repeated HTTP requests | High, new connection per poll | Legacy browser support, simple updates |
| **HTTP/2 Push** | Server to client only | Multiplexed HTTP/2 | Medium | Asset preloading, not general messaging |
| **WebTransport** | Bidirectional | Persistent (QUIC-based) | Low | Next-gen real-time, unreliable streams |

**WebSockets** are the most versatile option for true bidirectional communication. **SSE** is simpler and sufficient when you only need server-to-client streaming. **Long polling** is a fallback for environments where WebSockets are blocked. Understanding which protocol your application uses is the first step in choosing the right **real-time testing** strategy.

---

## WebSocket Testing Challenges

Testing WebSockets is harder than testing REST APIs for several structural reasons. Recognizing these challenges upfront helps you design a test strategy that accounts for them rather than discovering them as flaky test failures in CI.

**Stateful connections.** Each WebSocket connection maintains state -- authentication context, subscription filters, cursor positions, and in-flight messages. Unlike HTTP, where every request is stateless, your tests must manage connection state across multiple messages. A test that sends three messages in sequence may get different results depending on the order in which the server processes them.

**Message ordering.** WebSocket messages within a single connection are guaranteed to arrive in order. But if your client opens multiple connections, or if your server broadcasts to multiple clients, the relative ordering across connections is not guaranteed. Tests that assert on message order across connections will be flaky.

**Reconnection complexity.** Production WebSocket clients must handle disconnections gracefully -- network interruptions, server restarts, load balancer timeouts, and mobile network switches. Testing reconnection logic requires simulating these failures and verifying that the client re-establishes the connection, resynchronizes state, and does not lose messages.

**Heartbeat and keepalive mechanisms.** Many WebSocket servers implement ping/pong frames to detect dead connections. Your tests need to account for these heartbeat frames when asserting on received messages, and you may need to test that connections are properly closed when heartbeats fail.

**Binary data.** WebSockets support both text and binary frames. If your application sends Protocol Buffers, MessagePack, or raw binary data, your tests must handle serialization and deserialization rather than simple JSON parsing.

**Connection limits.** Servers, load balancers, and operating systems all impose limits on the number of concurrent WebSocket connections. A load test that works fine with 100 connections may fail at 10,000 because of file descriptor limits, memory exhaustion, or reverse proxy configuration.

**Race conditions.** Because both sides can send messages at any time, race conditions are common. A client might send a message before the server has finished processing a previous one, or the server might broadcast an update while the client is in the middle of sending a request. Your tests must be resilient to timing variations.

---

## Testing WebSocket Connections

The foundation of any **WebSocket testing** strategy is validating the connection lifecycle: opening a connection, exchanging messages, handling errors, and closing cleanly. Let us start with a practical test suite using the \`ws\` library in Node.js.

### Connection Lifecycle Events

Every WebSocket connection goes through four event phases:

1. **Open** -- The handshake completes and the connection is established
2. **Message** -- Either side sends a text or binary frame
3. **Error** -- A protocol error, network failure, or server-side exception occurs
4. **Close** -- The connection is terminated with a status code and optional reason

Your tests should explicitly validate each phase. Here is a complete lifecycle test:

\`\`\`typescript
import WebSocket from 'ws';

describe('WebSocket Connection Lifecycle', () => {
  const WS_URL = 'ws://localhost:3000/ws';

  it('should complete the full connection lifecycle', (done) => {
    const ws = new WebSocket(WS_URL);
    const events: string[] = [];

    ws.on('open', () => {
      events.push('open');
      ws.send(JSON.stringify({ type: 'ping' }));
    });

    ws.on('message', (data) => {
      events.push('message');
      const parsed = JSON.parse(data.toString());
      expect(parsed.type).toBe('pong');

      // Initiate clean close
      ws.close(1000, 'Test complete');
    });

    ws.on('close', (code, reason) => {
      events.push('close');
      expect(code).toBe(1000);
      expect(events).toEqual(['open', 'message', 'close']);
      done();
    });

    ws.on('error', (err) => {
      done(err);
    });
  });

  it('should reject connections without valid auth token', (done) => {
    const ws = new WebSocket(WS_URL);

    ws.on('unexpected-response', (req, res) => {
      expect(res.statusCode).toBe(401);
      done();
    });

    ws.on('error', () => {
      // Expected -- connection refused
      done();
    });
  });
});
\`\`\`

### Testing Authentication During Handshake

Because WebSocket connections upgrade from HTTP, authentication typically happens during the initial handshake. Common patterns include passing a JWT as a query parameter, sending an auth cookie, or using a custom header through an HTTP library that supports it. Here is how to test authenticated connections:

\`\`\`typescript
it('should accept connections with valid JWT', (done) => {
  const token = generateTestJWT({ userId: 'user-123', role: 'admin' });
  const ws = new WebSocket(\\\`ws://localhost:3000/ws?token=\\\${token}\\\`);

  ws.on('open', () => {
    // Connection accepted -- auth succeeded
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
    done();
  });

  ws.on('error', (err) => {
    done(new Error(\\\`Connection should have succeeded: \\\${err.message}\\\`));
  });
});

it('should reject connections with expired JWT', (done) => {
  const expiredToken = generateTestJWT({
    userId: 'user-123',
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
  });
  const ws = new WebSocket(\\\`ws://localhost:3000/ws?token=\\\${expiredToken}\\\`);

  ws.on('unexpected-response', (req, res) => {
    expect(res.statusCode).toBe(401);
    done();
  });
});
\`\`\`

### Close Code Validation

WebSocket close codes carry meaning. Your tests should verify that the server uses appropriate codes:

| Close Code | Meaning | When to Test |
|---|---|---|
| **1000** | Normal closure | Client or server initiates clean shutdown |
| **1001** | Going away | Server is shutting down or client is navigating away |
| **1008** | Policy violation | Authentication failed or message violates rules |
| **1011** | Unexpected condition | Server-side error during message processing |
| **1012** | Service restart | Server is restarting, client should reconnect |

---

## Message Validation

Once you have validated that connections open and close correctly, the next layer of **WebSocket testing** is ensuring that messages conform to their expected schemas, arrive in the correct order, and that malformed messages are handled gracefully.

### JSON Schema Validation

Most WebSocket applications exchange JSON messages. Define schemas for every message type and validate both outgoing and incoming messages:

\`\`\`typescript
import Ajv from 'ajv';

const ajv = new Ajv();

const chatMessageSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['chat_message'] },
    payload: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        text: { type: 'string', minLength: 1, maxLength: 5000 },
        userId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        roomId: { type: 'string' },
      },
      required: ['id', 'text', 'userId', 'timestamp', 'roomId'],
    },
  },
  required: ['type', 'payload'],
};

const validateChatMessage = ajv.compile(chatMessageSchema);

it('should return valid chat message schema', (done) => {
  const ws = createAuthenticatedConnection();

  ws.on('open', () => {
    ws.send(JSON.stringify({
      type: 'send_message',
      payload: { text: 'Hello, world!', roomId: 'room-1' },
    }));
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    if (message.type === 'chat_message') {
      const isValid = validateChatMessage(message);
      expect(isValid).toBe(true);
      if (!isValid) {
        console.error('Validation errors:', validateChatMessage.errors);
      }
      ws.close();
      done();
    }
  });
});
\`\`\`

### Message Ordering Verification

For applications where message order matters -- chat applications, event streams, collaborative editors -- you should verify that messages arrive in the expected sequence:

\`\`\`typescript
it('should deliver messages in order', (done) => {
  const ws = createAuthenticatedConnection();
  const receivedMessages: number[] = [];
  const totalMessages = 50;

  ws.on('open', () => {
    for (let i = 0; i < totalMessages; i++) {
      ws.send(JSON.stringify({
        type: 'ordered_event',
        payload: { sequence: i },
      }));
    }
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    if (message.type === 'ordered_event_ack') {
      receivedMessages.push(message.payload.sequence);

      if (receivedMessages.length === totalMessages) {
        // Verify strict ordering
        for (let i = 0; i < totalMessages; i++) {
          expect(receivedMessages[i]).toBe(i);
        }
        ws.close();
        done();
      }
    }
  });
});
\`\`\`

### Testing Malformed Messages

Your server should handle malformed messages gracefully without crashing the connection or the process. Test these edge cases:

\`\`\`typescript
it('should handle invalid JSON without crashing', (done) => {
  const ws = createAuthenticatedConnection();

  ws.on('open', () => {
    ws.send('this is not valid JSON {{{');
  });

  ws.on('message', (data) => {
    const response = JSON.parse(data.toString());
    expect(response.type).toBe('error');
    expect(response.payload.code).toBe('INVALID_JSON');
    // Connection should remain open
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
    done();
  });
});

it('should reject messages exceeding size limit', (done) => {
  const ws = createAuthenticatedConnection();
  const oversizedPayload = 'x'.repeat(1024 * 1024); // 1MB

  ws.on('open', () => {
    ws.send(JSON.stringify({
      type: 'send_message',
      payload: { text: oversizedPayload },
    }));
  });

  ws.on('close', (code) => {
    expect(code).toBe(1009); // Message too big
    done();
  });
});

it('should handle unknown message types', (done) => {
  const ws = createAuthenticatedConnection();

  ws.on('open', () => {
    ws.send(JSON.stringify({
      type: 'nonexistent_action',
      payload: {},
    }));
  });

  ws.on('message', (data) => {
    const response = JSON.parse(data.toString());
    expect(response.type).toBe('error');
    expect(response.payload.code).toBe('UNKNOWN_TYPE');
    ws.close();
    done();
  });
});
\`\`\`

---

## Reconnection and Error Handling

Production WebSocket applications must handle disconnections gracefully. Network interruptions, server deployments, load balancer timeouts, and mobile network switches all cause connections to drop. **Reconnection testing** validates that your client recovers from these failures without data loss or corrupted state.

### Testing Auto-Reconnect Logic

Most WebSocket client libraries implement automatic reconnection. Your tests should verify that reconnection works correctly and that the client does not reconnect infinitely or too aggressively:

\`\`\`typescript
import WebSocket from 'ws';

class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseDelay = 1000;
  public connectionCount = 0;
  public onReconnect: (() => void) | null = null;

  constructor(private url: string) {
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      this.connectionCount++;
      this.reconnectAttempts = 0;
      if (this.connectionCount > 1 && this.onReconnect) {
        this.onReconnect();
      }
    });

    this.ws.on('close', () => {
      this.scheduleReconnect();
    });

    this.ws.on('error', () => {
      // Error handler prevents unhandled exception
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = this.baseDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delay);
  }

  close() {
    this.maxReconnectAttempts = 0;
    this.ws?.close();
  }
}

describe('Reconnection Logic', () => {
  it('should reconnect after server-initiated close', (done) => {
    const client = new ReconnectingWebSocket('ws://localhost:3000/ws');

    client.onReconnect = () => {
      expect(client.connectionCount).toBe(2);
      client.close();
      done();
    };

    // Simulate server closing the connection after 500ms
    setTimeout(() => {
      // Trigger server-side disconnect via admin API
      fetch('http://localhost:3000/admin/disconnect-all', {
        method: 'POST',
      });
    }, 500);
  });

  it('should use exponential backoff between attempts', () => {
    const delays: number[] = [];
    const baseDelay = 1000;

    for (let attempt = 0; attempt < 5; attempt++) {
      delays.push(baseDelay * Math.pow(2, attempt));
    }

    expect(delays).toEqual([1000, 2000, 4000, 8000, 16000]);
  });

  it('should stop reconnecting after max attempts', (done) => {
    // Point to a non-existent server
    const client = new ReconnectingWebSocket('ws://localhost:9999/ws');

    setTimeout(() => {
      // After enough time for all retries to exhaust
      expect(client.connectionCount).toBe(0);
      client.close();
      done();
    }, 35000); // Sum of backoff delays + buffer
  }, 40000);
});
\`\`\`

### Testing Message Queuing During Disconnect

A robust WebSocket client queues messages sent during a disconnection and delivers them once the connection is re-established. This is especially important for chat applications and collaborative editors where users may continue typing while briefly offline:

\`\`\`typescript
it('should queue messages during disconnect and send on reconnect', (done) => {
  const client = createReconnectingClient('ws://localhost:3000/ws');
  const queuedMessages = ['msg-1', 'msg-2', 'msg-3'];

  client.on('open', () => {
    if (client.connectionCount === 1) {
      // First connection -- simulate disconnect
      client.simulateDisconnect();

      // Send messages while disconnected
      queuedMessages.forEach((msg) => {
        client.send(JSON.stringify({ type: 'chat', text: msg }));
      });
    }
  });

  client.on('reconnect', () => {
    // Verify all queued messages were sent after reconnection
    setTimeout(() => {
      fetch('http://localhost:3000/api/messages?room=test')
        .then((res) => res.json())
        .then((messages) => {
          const texts = messages.map((m: any) => m.text);
          expect(texts).toEqual(expect.arrayContaining(queuedMessages));
          client.close();
          done();
        });
    }, 1000);
  });
});
\`\`\`

### Simulating Network Failures

To test how your application behaves under realistic network conditions, you can use several approaches:

- **Proxy-based disruption**: Tools like Toxiproxy let you introduce latency, drop connections, and simulate bandwidth limits at the network level
- **Server-side disconnect APIs**: Add admin endpoints to your test server that forcefully close connections
- **Client-side simulation**: Override the WebSocket \`close\` method to simulate unexpected disconnections
- **Docker network manipulation**: Use \`docker network disconnect\` and \`docker network connect\` to simulate network partitions in containerized environments

---

## Socket.IO Testing

**Socket.IO** is the most widely used WebSocket abstraction library. It adds features on top of raw WebSockets -- automatic reconnection, rooms, namespaces, acknowledgements, and fallback transports -- that make it easier to build real-time applications but also introduce additional testing concerns.

### How Socket.IO Differs from Raw WebSockets

Socket.IO is not a pure WebSocket implementation. It uses its own protocol on top of WebSockets (or falls back to HTTP long polling). This means you cannot test a Socket.IO server with a raw WebSocket client. You must use the \`socket.io-client\` library.

Key Socket.IO concepts that require testing:

- **Namespaces** -- Separate communication channels on a single connection (e.g., \`/chat\`, \`/notifications\`)
- **Rooms** -- Server-side groupings for broadcasting to subsets of clients
- **Acknowledgements** -- Callback-based request/response patterns
- **Middleware** -- Authentication and validation functions that run before connection or event handling

### Socket.IO Test Examples

\`\`\`typescript
import { io, Socket } from 'socket.io-client';

describe('Socket.IO Chat Server', () => {
  let socket: Socket;

  beforeEach((done) => {
    socket = io('http://localhost:3000/chat', {
      auth: { token: 'test-jwt-token' },
      transports: ['websocket'],
    });
    socket.on('connect', done);
  });

  afterEach(() => {
    socket.disconnect();
  });

  it('should join a room and receive messages', (done) => {
    socket.emit('join_room', { roomId: 'room-1' }, (ack: any) => {
      // Acknowledgement -- server confirmed join
      expect(ack.success).toBe(true);

      // Listen for messages in the room
      socket.on('new_message', (message) => {
        expect(message.roomId).toBe('room-1');
        expect(message.text).toBe('Hello from another user');
        done();
      });

      // Trigger a message from another client via API
      fetch('http://localhost:3000/api/test/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: 'room-1',
          text: 'Hello from another user',
        }),
      });
    });
  });

  it('should handle namespace-specific events', (done) => {
    const notificationSocket = io('http://localhost:3000/notifications', {
      auth: { token: 'test-jwt-token' },
    });

    notificationSocket.on('connect', () => {
      notificationSocket.on('alert', (data) => {
        expect(data.severity).toBeDefined();
        expect(data.message).toBeDefined();
        notificationSocket.disconnect();
        done();
      });

      // Trigger a notification
      fetch('http://localhost:3000/api/test/trigger-alert', {
        method: 'POST',
      });
    });
  });

  it('should reject unauthorized connections', (done) => {
    const unauthSocket = io('http://localhost:3000/chat', {
      auth: { token: 'invalid-token' },
    });

    unauthSocket.on('connect_error', (err) => {
      expect(err.message).toContain('Authentication failed');
      unauthSocket.disconnect();
      done();
    });
  });
});
\`\`\`

### Socket.IO vs Raw WebSocket Testing

| Aspect | Raw WebSocket | Socket.IO |
|---|---|---|
| **Client library** | \`ws\` or native \`WebSocket\` | \`socket.io-client\` (required) |
| **Event model** | \`onmessage\` with raw data | Named events (\`emit\`/\`on\`) |
| **Auth pattern** | Query params or cookies | \`auth\` option in connection |
| **Reconnection** | Must implement manually | Built-in with backoff |
| **Testing rooms** | N/A | Must verify room join/leave/broadcast |
| **Acknowledgements** | N/A | Callback-based, must test timeouts |

---

## Load Testing WebSockets

Functional tests verify that your WebSocket server behaves correctly for a single connection. **WebSocket load testing** answers a different question: how does your server perform when thousands of clients connect simultaneously, each sending and receiving messages at a realistic rate?

### k6 WebSocket Support

**k6** has built-in WebSocket support that makes it straightforward to write load test scenarios for WebSocket servers. Here is a load test that simulates concurrent chat users:

\`\`\`javascript
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const messageLatency = new Trend('ws_message_latency');
const connectionFailRate = new Rate('ws_connection_failures');

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 500 },     // Ramp up to 500 users
    { duration: '5m', target: 500 },     // Sustain 500 concurrent
    { duration: '30s', target: 0 },      // Ramp down
  ],
  thresholds: {
    ws_message_latency: ['p(95)<200'],       // 95th percentile under 200ms
    ws_connection_failures: ['rate<0.01'],    // Less than 1% connection failures
  },
};

export default function () {
  const url = 'ws://localhost:3000/ws?token=load-test-token';

  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      // Send a message every 2-5 seconds (simulating real user behavior)
      socket.setInterval(function () {
        const sendTime = Date.now();
        socket.send(JSON.stringify({
          type: 'chat_message',
          payload: {
            text: 'Load test message',
            roomId: 'load-test-room',
            sendTime: sendTime,
          },
        }));
      }, Math.random() * 3000 + 2000);

      socket.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'chat_message_ack' && message.payload.sendTime) {
          messageLatency.add(Date.now() - message.payload.sendTime);
        }
      });

      // Keep connection open for the duration of the VU iteration
      socket.setTimeout(function () {
        socket.close();
      }, 30000);
    });

    socket.on('error', () => {
      connectionFailRate.add(1);
    });
  });

  check(res, {
    'WebSocket connection established': (r) => r && r.status === 101,
  });

  if (!res || res.status !== 101) {
    connectionFailRate.add(1);
  }

  sleep(1);
}
\`\`\`

### Artillery WebSocket Scenarios

**Artillery** also supports WebSocket load testing through its engine system. Here is an Artillery configuration for testing a WebSocket chat server:

\`\`\`yaml
config:
  target: "ws://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
  engines:
    ws: {}

scenarios:
  - engine: ws
    flow:
      - send:
          type: "join_room"
          roomId: "load-test-room"
      - think: 2
      - loop:
          - send:
              type: "send_message"
              text: "Load test message"
          - think: 3
        count: 20
\`\`\`

### Key Load Testing Metrics

When running **WebSocket load testing**, track these metrics specifically:

| Metric | What It Measures | Healthy Threshold |
|---|---|---|
| **Connection establishment time** | Time from handshake initiation to open event | < 500ms at p95 |
| **Message round-trip latency** | Time from send to server acknowledgement | < 200ms at p95 |
| **Max concurrent connections** | Connections before errors or degradation | Depends on server capacity |
| **Message throughput** | Messages processed per second across all connections | Linear scaling with connections |
| **Connection error rate** | Percentage of failed connection attempts | < 1% |
| **Memory per connection** | Server memory consumed per active connection | Stable, no growth over time |

If you are new to performance testing concepts, our [load testing guide](/blog/load-testing-beginners-guide) covers fundamentals like ramp-up patterns, percentile metrics, and saturation point analysis in depth.

---

## CI/CD Integration

**WebSocket testing** should run automatically in your CI/CD pipeline, not just during manual QA cycles. The challenge is that WebSocket tests require a running server, which means your pipeline needs to start the application, wait for readiness, run tests, and tear everything down.

### Running WebSocket Tests in CI

The most reliable approach is to use Docker Compose to spin up your application and its dependencies (database, Redis for pub/sub, etc.) before running your test suite:

\`\`\`yaml
# docker-compose.test.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=test
      - REDIS_URL=redis://redis:6379
    depends_on:
      redis:
        condition: service_healthy

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  test-runner:
    build:
      context: .
      dockerfile: Dockerfile.test
    depends_on:
      app:
        condition: service_healthy
    environment:
      - WS_URL=ws://app:3000/ws
    command: npm run test:websocket
\`\`\`

### Health Checks for WebSocket Readiness

Your server's health check should verify that the WebSocket endpoint is accepting connections, not just that the HTTP server is running:

\`\`\`typescript
// health-check.ts
import WebSocket from 'ws';

async function checkWebSocketHealth(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      ws.close();
      resolve(false);
    }, 5000);

    ws.on('open', () => {
      clearTimeout(timeout);
      ws.close();
      resolve(true);
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}
\`\`\`

### Pipeline Structure

A recommended CI pipeline for WebSocket testing follows this sequence:

1. **Build** -- Compile the application and test suite
2. **Start services** -- Launch the app and dependencies with Docker Compose
3. **Wait for readiness** -- Poll the WebSocket health check until it passes
4. **Run functional tests** -- Connection lifecycle, message validation, reconnection
5. **Run load tests** -- k6 or Artillery with pass/fail thresholds
6. **Collect metrics** -- Export results to your observability platform
7. **Tear down** -- Stop all services and clean up

For a detailed walkthrough of setting up testing pipelines with GitHub Actions, see our guide on [CI/CD testing pipelines](/blog/cicd-testing-pipeline-github-actions).

---

## Automate WebSocket Testing with AI Agents

Writing comprehensive **WebSocket automation** tests by hand is time-consuming. AI coding agents like Claude Code, Cursor, and Windsurf can generate WebSocket test suites faster -- but only if they have specialized knowledge about real-time testing patterns, connection lifecycle management, and the nuances of tools like Socket.IO and k6.

**QA Skills** gives your AI agent that specialized knowledge. Install a skill and your agent immediately gains expert-level context for writing and debugging WebSocket tests.

### Recommended Skills for WebSocket Testing

\`\`\`bash
# Find and fix WebSocket-specific bugs
npx @qaskills/cli add websocket-bug-finder

# API testing patterns that extend to WebSocket endpoints
npx @qaskills/cli add playwright-api
\`\`\`

Once installed, your AI agent understands WebSocket connection lifecycle testing, message schema validation patterns, reconnection and error handling strategies, and load testing configuration for k6 and Artillery.

Browse the full catalog of 95+ QA skills at [qaskills.sh/skills](/skills), or read the [getting started guide](/getting-started) to install your first skill in under a minute.

---

## Frequently Asked Questions

### How do I test WebSockets with Playwright or Cypress?

Playwright does not have native WebSocket client support, but you can intercept and validate WebSocket traffic during E2E tests using \`page.on('websocket')\`. This lets you assert on messages sent and received during browser-based tests. Cypress has similar capabilities through plugins like \`cypress-websocket-testing\`. For unit-level WebSocket tests, use the \`ws\` library or \`socket.io-client\` directly in Node.js as shown in this guide.

### What is the difference between WebSocket testing and API testing?

**API testing** typically targets stateless HTTP request-response cycles -- you send a request, get a response, and assert on it. **WebSocket testing** targets stateful, persistent connections where messages flow bidirectionally at any time. You need to manage connection state, handle asynchronous message delivery, test reconnection logic, and validate message ordering -- none of which apply to standard REST API testing.

### How many concurrent WebSocket connections can a server handle?

The theoretical limit depends on your operating system (file descriptor limits), server resources (memory and CPU), and application logic (per-connection state size). A well-optimized Node.js server can handle 100,000+ concurrent connections on modern hardware. The practical limit is usually determined by your message processing logic, database connections, and pub/sub infrastructure rather than raw connection capacity. **WebSocket load testing** helps you find your specific limit.

### Should I test WebSocket connections in unit tests or integration tests?

Both. **Unit tests** should validate your message handlers, serialization logic, and reconnection strategies in isolation using mock WebSocket connections. **Integration tests** should validate the full connection lifecycle against a real server, including authentication, message routing, and room/namespace behavior. Load tests form a third tier that validates performance under concurrent connections.

### How do I debug flaky WebSocket tests?

Flaky **WebSocket tests** are almost always caused by timing issues. Messages arrive asynchronously, and assertions that expect immediate responses will intermittently fail. Use promise-based patterns with explicit timeouts instead of fixed \`setTimeout\` delays. Log every WebSocket event (open, message, close, error) with timestamps to identify ordering issues. Run tests with a single connection first to rule out concurrency problems, then scale up. If tests pass locally but fail in CI, the CI environment is likely slower -- increase your assertion timeouts and add explicit readiness checks before sending test messages.
`,
};
