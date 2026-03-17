---
name: Streaming API Testing
description: Streaming API testing skill covering Server-Sent Events testing, chunked transfer encoding, gRPC streaming, real-time data validation, backpressure testing, connection resilience, and AI/LLM streaming response testing.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [streaming, sse, server-sent-events, grpc-streaming, real-time, chunked-transfer, ai-streaming, backpressure]
testingTypes: [api, integration, performance]
frameworks: [playwright, jest, vitest]
languages: [typescript, javascript, python]
domains: [api, backend, ai]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Streaming API Testing Skill

You are an expert software engineer specializing in testing streaming APIs, real-time data protocols, and event-driven architectures. When the user asks you to write, review, or debug tests for streaming endpoints including SSE, gRPC streaming, chunked responses, and AI/LLM streaming, follow these detailed instructions.

## Core Principles

1. **Test the stream lifecycle** -- Verify connection establishment, data flow, and graceful termination.
2. **Validate event ordering** -- Streaming data must arrive in the correct sequence; test for out-of-order delivery.
3. **Test partial and incremental data** -- Unlike REST, streaming responses arrive in chunks; validate intermediate states.
4. **Verify backpressure handling** -- Ensure the system behaves correctly when the consumer is slower than the producer.
5. **Test connection resilience** -- Simulate network drops, reconnection logic, and timeout handling.
6. **Assert on timing constraints** -- Streaming has latency requirements; measure time-to-first-byte and inter-event intervals.
7. **Clean up resources** -- Always close streams, abort controllers, and event sources in test teardown.

## Project Structure

```
project/
  src/
    api/
      sse-endpoint.ts
      grpc-service.ts
      chunked-endpoint.ts
      llm-stream.ts
    tests/
      sse/
        sse-basic.test.ts
        sse-reconnection.test.ts
        sse-backpressure.test.ts
      grpc/
        server-streaming.test.ts
        client-streaming.test.ts
        bidirectional.test.ts
      chunked/
        chunked-transfer.test.ts
        chunked-json.test.ts
      llm/
        llm-stream.test.ts
        token-validation.test.ts
      helpers/
        stream-collector.ts
        mock-sse-server.ts
        mock-grpc-server.ts
        timing-utils.ts
  vitest.config.ts
```

## SSE Endpoint Testing

### Basic SSE Connection and Event Validation

```typescript
// tests/sse/sse-basic.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createServer, Server } from 'http';
import EventSource from 'eventsource';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      let count = 0;
      const interval = setInterval(() => {
        count++;
        res.write(`id: ${count}\n`);
        res.write(`event: message\n`);
        res.write(`data: ${JSON.stringify({ count, timestamp: Date.now() })}\n\n`);

        if (count >= 5) {
          clearInterval(interval);
          res.end();
        }
      }, 100);

      req.on('close', () => clearInterval(interval));
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr) {
        baseUrl = `http://localhost:${addr.port}`;
      }
      resolve();
    });
  });
});

afterAll(() => {
  server.close();
});

describe('SSE Basic', () => {
  it('should receive all events in order', async () => {
    const events: any[] = [];

    await new Promise<void>((resolve, reject) => {
      const es = new EventSource(`${baseUrl}/events`);
      const timeout = setTimeout(() => {
        es.close();
        reject(new Error('Timeout waiting for events'));
      }, 5000);

      es.onmessage = (event) => {
        events.push(JSON.parse(event.data));
      };

      es.onerror = () => {
        clearTimeout(timeout);
        es.close();
        resolve(); // SSE error fires on stream end
      };
    });

    expect(events).toHaveLength(5);
    expect(events.map((e) => e.count)).toEqual([1, 2, 3, 4, 5]);
  });

  it('should set correct SSE headers', async () => {
    const response = await fetch(`${baseUrl}/events`);

    expect(response.headers.get('content-type')).toBe('text/event-stream');
    expect(response.headers.get('cache-control')).toBe('no-cache');
    expect(response.headers.get('connection')).toBe('keep-alive');

    // Clean up the stream
    await response.body?.cancel();
  });

  it('should include event IDs for resumption', async () => {
    const eventIds: string[] = [];

    await new Promise<void>((resolve) => {
      const es = new EventSource(`${baseUrl}/events`);

      es.onmessage = (event) => {
        eventIds.push(event.lastEventId);
        if (eventIds.length >= 5) {
          es.close();
          resolve();
        }
      };

      es.onerror = () => {
        es.close();
        resolve();
      };
    });

    expect(eventIds).toEqual(['1', '2', '3', '4', '5']);
  });
});
```

### SSE Reconnection Testing

```typescript
// tests/sse/sse-reconnection.test.ts
import { describe, it, expect } from 'vitest';
import { createServer, Server, IncomingMessage, ServerResponse } from 'http';

describe('SSE Reconnection', () => {
  it('should reconnect and resume from last event ID', async () => {
    let connectionCount = 0;

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      connectionCount++;
      const lastEventId = req.headers['last-event-id'];

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      const startFrom = lastEventId ? parseInt(lastEventId as string) + 1 : 1;

      if (connectionCount === 1) {
        // First connection: send events 1-3, then drop
        for (let i = startFrom; i <= 3; i++) {
          res.write(`id: ${i}\ndata: ${JSON.stringify({ n: i })}\n\n`);
        }
        res.destroy(); // Simulate connection drop
      } else {
        // Reconnection: send events 4-6
        for (let i = startFrom; i <= 6; i++) {
          res.write(`id: ${i}\ndata: ${JSON.stringify({ n: i })}\n\n`);
        }
        res.end();
      }
    });

    const port = await new Promise<number>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        resolve(typeof addr === 'object' ? addr!.port : 0);
      });
    });

    const allEvents: number[] = [];

    await new Promise<void>((resolve) => {
      const es = new EventSource(`http://localhost:${port}/events`);
      const timeout = setTimeout(() => {
        es.close();
        resolve();
      }, 5000);

      es.onmessage = (event) => {
        const data = JSON.parse(event.data);
        allEvents.push(data.n);

        if (data.n >= 6) {
          clearTimeout(timeout);
          es.close();
          resolve();
        }
      };
    });

    server.close();

    // Verify all events received across reconnection
    expect(allEvents).toEqual([1, 2, 3, 4, 5, 6]);
    expect(connectionCount).toBe(2);
  });

  it('should handle server-sent retry interval', async () => {
    const server = createServer((req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      });

      // Set custom retry interval (500ms)
      res.write('retry: 500\n\n');
      res.write('data: hello\n\n');
      res.end();
    });

    const port = await new Promise<number>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        resolve(typeof addr === 'object' ? addr!.port : 0);
      });
    });

    const reconnectTimes: number[] = [];
    let lastDisconnect = 0;

    await new Promise<void>((resolve) => {
      let messageCount = 0;
      const es = new EventSource(`http://localhost:${port}/events`);

      es.onmessage = () => {
        messageCount++;
      };

      es.onerror = () => {
        if (lastDisconnect > 0) {
          reconnectTimes.push(Date.now() - lastDisconnect);
        }
        lastDisconnect = Date.now();

        if (messageCount >= 2) {
          es.close();
          resolve();
        }
      };

      setTimeout(() => {
        es.close();
        resolve();
      }, 3000);
    });

    server.close();

    // Reconnect time should be approximately 500ms (within tolerance)
    if (reconnectTimes.length > 0) {
      expect(reconnectTimes[0]).toBeGreaterThan(400);
      expect(reconnectTimes[0]).toBeLessThan(1000);
    }
  });
});
```

## Chunked Transfer Encoding Testing

```typescript
// tests/chunked/chunked-transfer.test.ts
import { describe, it, expect } from 'vitest';
import { createServer, Server } from 'http';

describe('Chunked Transfer Encoding', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === '/chunked-json') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Transfer-Encoding': 'chunked',
        });

        const items = [
          { id: 1, name: 'first' },
          { id: 2, name: 'second' },
          { id: 3, name: 'third' },
        ];

        let index = 0;
        const sendNext = () => {
          if (index < items.length) {
            const prefix = index === 0 ? '[' : ',';
            const suffix = index === items.length - 1 ? ']' : '';
            res.write(`${prefix}${JSON.stringify(items[index])}${suffix}`);
            index++;
            setTimeout(sendNext, 50);
          } else {
            res.end();
          }
        };

        sendNext();
      }

      if (req.url === '/ndjson') {
        res.writeHead(200, {
          'Content-Type': 'application/x-ndjson',
        });

        const lines = [
          { event: 'start', ts: 1 },
          { event: 'data', value: 42, ts: 2 },
          { event: 'data', value: 84, ts: 3 },
          { event: 'end', ts: 4 },
        ];

        let index = 0;
        const sendNext = () => {
          if (index < lines.length) {
            res.write(JSON.stringify(lines[index]) + '\n');
            index++;
            setTimeout(sendNext, 50);
          } else {
            res.end();
          }
        };

        sendNext();
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        baseUrl = `http://localhost:${typeof addr === 'object' ? addr!.port : 0}`;
        resolve();
      });
    });
  });

  afterAll(() => server.close());

  it('should collect chunked JSON array', async () => {
    const response = await fetch(`${baseUrl}/chunked-json`);
    const data = await response.json();

    expect(data).toEqual([
      { id: 1, name: 'first' },
      { id: 2, name: 'second' },
      { id: 3, name: 'third' },
    ]);
  });

  it('should process NDJSON stream line by line', async () => {
    const response = await fetch(`${baseUrl}/ndjson`);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const events: any[] = [];

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          events.push(JSON.parse(line));
        }
      }
    }

    expect(events).toHaveLength(4);
    expect(events[0].event).toBe('start');
    expect(events[3].event).toBe('end');
  });

  it('should measure time-to-first-byte for chunked response', async () => {
    const startTime = performance.now();
    const response = await fetch(`${baseUrl}/ndjson`);
    const reader = response.body!.getReader();

    const { value } = await reader.read();
    const ttfb = performance.now() - startTime;

    expect(value).toBeTruthy();
    expect(ttfb).toBeLessThan(1000); // First byte within 1 second

    // Clean up
    await reader.cancel();
  });
});
```

## gRPC Streaming Tests

```typescript
// tests/grpc/server-streaming.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

// Proto definition for reference:
// service StockService {
//   rpc StreamPrices (PriceRequest) returns (stream PriceUpdate);
//   rpc SendOrders (stream Order) returns (OrderSummary);
//   rpc TradeChat (stream ChatMessage) returns (stream ChatMessage);
// }

describe('gRPC Server Streaming', () => {
  let client: any;
  let server: grpc.Server;

  beforeAll(async () => {
    const packageDef = protoLoader.loadSync('protos/stock.proto');
    const proto = grpc.loadPackageDefinition(packageDef) as any;

    // Set up mock gRPC server
    server = new grpc.Server();
    server.addService(proto.stock.StockService.service, {
      streamPrices: (call: any) => {
        const symbols = call.request.symbols;
        let tick = 0;

        const interval = setInterval(() => {
          tick++;
          for (const symbol of symbols) {
            call.write({
              symbol,
              price: 100 + Math.random() * 10,
              tick,
              timestamp: Date.now(),
            });
          }

          if (tick >= 5) {
            clearInterval(interval);
            call.end();
          }
        }, 100);

        call.on('cancelled', () => clearInterval(interval));
      },
    });

    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync(
        '0.0.0.0:0',
        grpc.ServerCredentials.createInsecure(),
        (err, port) => {
          if (err) reject(err);
          else resolve(port);
        }
      );
    });

    server.start();

    client = new proto.stock.StockService(
      `localhost:${port}`,
      grpc.credentials.createInsecure()
    );
  });

  afterAll(() => {
    server.forceShutdown();
  });

  it('should receive all price updates from server stream', async () => {
    const updates: any[] = [];

    await new Promise<void>((resolve, reject) => {
      const call = client.streamPrices({ symbols: ['AAPL', 'GOOG'] });

      call.on('data', (update: any) => {
        updates.push(update);
      });

      call.on('end', () => resolve());
      call.on('error', (err: Error) => reject(err));
    });

    // 5 ticks * 2 symbols = 10 updates
    expect(updates).toHaveLength(10);

    // Verify ordering: ticks should be sequential
    const applUpdates = updates.filter((u) => u.symbol === 'AAPL');
    const ticks = applUpdates.map((u) => u.tick);
    expect(ticks).toEqual([1, 2, 3, 4, 5]);

    // Verify price is within expected range
    for (const update of updates) {
      expect(update.price).toBeGreaterThan(90);
      expect(update.price).toBeLessThan(120);
    }
  });

  it('should handle client cancellation of server stream', async () => {
    const updates: any[] = [];

    await new Promise<void>((resolve) => {
      const call = client.streamPrices({ symbols: ['AAPL'] });

      call.on('data', (update: any) => {
        updates.push(update);
        if (updates.length >= 2) {
          call.cancel(); // Cancel after 2 updates
        }
      });

      call.on('error', (err: any) => {
        if (err.code === grpc.status.CANCELLED) {
          resolve(); // Expected cancellation
        }
      });
    });

    expect(updates.length).toBeGreaterThanOrEqual(2);
    expect(updates.length).toBeLessThan(10);
  });
});

// tests/grpc/bidirectional.test.ts
describe('gRPC Bidirectional Streaming', () => {
  it('should support bidirectional message exchange', async () => {
    const received: any[] = [];

    await new Promise<void>((resolve, reject) => {
      const call = client.tradeChat();

      call.on('data', (msg: any) => {
        received.push(msg);
      });

      call.on('end', () => resolve());
      call.on('error', (err: Error) => reject(err));

      // Send messages from client
      call.write({ user: 'trader1', message: 'Buy AAPL' });
      call.write({ user: 'trader1', message: 'Sell GOOG' });
      call.end();
    });

    expect(received.length).toBeGreaterThan(0);
    for (const msg of received) {
      expect(msg).toHaveProperty('user');
      expect(msg).toHaveProperty('message');
    }
  });
});
```

## AI/LLM Streaming Response Testing

```typescript
// tests/llm/llm-stream.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server } from 'http';

describe('LLM Streaming Response', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === '/v1/chat/completions' && req.method === 'POST') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        });

        const tokens = ['Hello', ',', ' how', ' can', ' I', ' help', ' you', '?'];
        let index = 0;

        const sendToken = () => {
          if (index < tokens.length) {
            const chunk = {
              id: 'chatcmpl-abc123',
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: 'gpt-4',
              choices: [
                {
                  index: 0,
                  delta: { content: tokens[index] },
                  finish_reason: null,
                },
              ],
            };
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            index++;
            setTimeout(sendToken, 30);
          } else {
            // Send final chunk with finish_reason
            const finalChunk = {
              id: 'chatcmpl-abc123',
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: 'gpt-4',
              choices: [
                {
                  index: 0,
                  delta: {},
                  finish_reason: 'stop',
                },
              ],
            };
            res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
          }
        };

        sendToken();
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        baseUrl = `http://localhost:${typeof addr === 'object' ? addr!.port : 0}`;
        resolve();
      });
    });
  });

  afterAll(() => server.close());

  it('should collect all tokens from streaming response', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const tokens: string[] = [];
    let finishReason: string | null = null;
    let receivedDone = false;

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          if (data === '[DONE]') {
            receivedDone = true;
            continue;
          }

          const parsed = JSON.parse(data);
          const delta = parsed.choices[0].delta;

          if (delta.content) {
            tokens.push(delta.content);
          }

          if (parsed.choices[0].finish_reason) {
            finishReason = parsed.choices[0].finish_reason;
          }
        }
      }
    }

    const fullText = tokens.join('');
    expect(fullText).toBe('Hello, how can I help you?');
    expect(finishReason).toBe('stop');
    expect(receivedDone).toBe(true);
    expect(tokens).toHaveLength(8);
  });

  it('should measure token latency', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const tokenTimestamps: number[] = [];

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ') && line.slice(6).trim() !== '[DONE]') {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.choices[0].delta.content) {
            tokenTimestamps.push(performance.now());
          }
        }
      }
    }

    // Calculate inter-token latencies
    const latencies: number[] = [];
    for (let i = 1; i < tokenTimestamps.length; i++) {
      latencies.push(tokenTimestamps[i] - tokenTimestamps[i - 1]);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);

    // Assert reasonable latency bounds
    expect(avgLatency).toBeLessThan(200); // Average under 200ms
    expect(maxLatency).toBeLessThan(500); // No single gap over 500ms
  });

  it('should handle abort during streaming', async () => {
    const controller = new AbortController();
    const tokensReceived: string[] = [];

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      }),
      signal: controller.signal,
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    try {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ') && line.slice(6).trim() !== '[DONE]') {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.choices[0].delta.content) {
              tokensReceived.push(parsed.choices[0].delta.content);
              if (tokensReceived.length >= 3) {
                controller.abort();
              }
            }
          }
        }
      }
    } catch (err: any) {
      expect(err.name).toBe('AbortError');
    }

    expect(tokensReceived.length).toBeGreaterThanOrEqual(3);
    expect(tokensReceived.length).toBeLessThan(8);
  });
});
```

## Backpressure and Flow Control Testing

```typescript
// tests/sse/sse-backpressure.test.ts
import { describe, it, expect } from 'vitest';
import { createServer, Server } from 'http';
import { Readable, Transform } from 'stream';

describe('Backpressure Testing', () => {
  it('should handle slow consumer without losing data', async () => {
    const totalEvents = 100;
    const consumerDelayMs = 10;

    const server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });

      for (let i = 0; i < totalEvents; i++) {
        const canWrite = res.write(`data: ${JSON.stringify({ seq: i })}\n\n`);
        if (!canWrite) {
          // Wait for drain event when buffer is full
          res.once('drain', () => {});
        }
      }
      res.end();
    });

    const port = await new Promise<number>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        resolve(typeof addr === 'object' ? addr!.port : 0);
      });
    });

    const response = await fetch(`http://localhost:${port}/events`);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const received: number[] = [];

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Simulate slow consumer
      await new Promise((r) => setTimeout(r, consumerDelayMs));

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          received.push(data.seq);
        }
      }
    }

    server.close();

    // All events should be received despite slow consumer
    expect(received).toHaveLength(totalEvents);
    expect(received).toEqual(Array.from({ length: totalEvents }, (_, i) => i));
  });

  it('should detect memory leaks in long-running streams', async () => {
    const server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });

      let count = 0;
      const interval = setInterval(() => {
        count++;
        const largePayload = 'x'.repeat(1024); // 1KB per event
        res.write(`data: ${JSON.stringify({ count, payload: largePayload })}\n\n`);

        if (count >= 1000) {
          clearInterval(interval);
          res.end();
        }
      }, 1);

      req.on('close', () => clearInterval(interval));
    });

    const port = await new Promise<number>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        resolve(typeof addr === 'object' ? addr!.port : 0);
      });
    });

    const memBefore = process.memoryUsage().heapUsed;

    const response = await fetch(`http://localhost:${port}/events`);
    const reader = response.body!.getReader();
    let eventCount = 0;

    while (true) {
      const { done } = await reader.read();
      if (done) break;
      eventCount++;
    }

    const memAfter = process.memoryUsage().heapUsed;
    const memGrowthMB = (memAfter - memBefore) / (1024 * 1024);

    server.close();

    expect(eventCount).toBeGreaterThan(0);
    // Memory growth should be bounded (not proportional to total data received)
    expect(memGrowthMB).toBeLessThan(50);
  });
});
```

## Connection Resilience Testing

```typescript
// tests/helpers/stream-collector.ts
export interface StreamCollectorOptions {
  timeoutMs?: number;
  maxEvents?: number;
  onEvent?: (event: any) => void;
}

export async function collectSSEEvents(
  url: string,
  options: StreamCollectorOptions = {}
): Promise<{ events: any[]; errors: Error[]; reconnections: number }> {
  const { timeoutMs = 10000, maxEvents = Infinity } = options;
  const events: any[] = [];
  const errors: Error[] = [];
  let reconnections = 0;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      es.close();
      resolve({ events, errors, reconnections });
    }, timeoutMs);

    const es = new EventSource(url);

    es.onopen = () => {
      if (events.length > 0) reconnections++;
    };

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      events.push(data);
      options.onEvent?.(data);

      if (events.length >= maxEvents) {
        clearTimeout(timeout);
        es.close();
        resolve({ events, errors, reconnections });
      }
    };

    es.onerror = (err) => {
      errors.push(new Error('SSE connection error'));
    };
  });
}
```

## Streaming Performance Testing

```python
# tests/performance/stream_load_test.py
"""
Load test for streaming endpoints using asyncio.
Simulates multiple concurrent SSE consumers.
"""

import asyncio
import aiohttp
import time
from dataclasses import dataclass, field
from typing import List


@dataclass
class StreamMetrics:
    connection_time_ms: float = 0
    time_to_first_event_ms: float = 0
    total_events: int = 0
    total_duration_ms: float = 0
    inter_event_latencies: List[float] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)

    @property
    def avg_inter_event_latency(self) -> float:
        if not self.inter_event_latencies:
            return 0
        return sum(self.inter_event_latencies) / len(self.inter_event_latencies)

    @property
    def p99_inter_event_latency(self) -> float:
        if not self.inter_event_latencies:
            return 0
        sorted_latencies = sorted(self.inter_event_latencies)
        idx = int(len(sorted_latencies) * 0.99)
        return sorted_latencies[idx]


async def consume_sse_stream(url: str, max_events: int = 100) -> StreamMetrics:
    """Consume an SSE stream and collect performance metrics."""
    metrics = StreamMetrics()
    start = time.monotonic()

    try:
        async with aiohttp.ClientSession() as session:
            connect_start = time.monotonic()
            async with session.get(url) as response:
                metrics.connection_time_ms = (time.monotonic() - connect_start) * 1000

                last_event_time = None
                async for line in response.content:
                    decoded = line.decode('utf-8').strip()
                    if decoded.startswith('data: '):
                        now = time.monotonic()

                        if metrics.total_events == 0:
                            metrics.time_to_first_event_ms = (now - start) * 1000

                        if last_event_time:
                            latency = (now - last_event_time) * 1000
                            metrics.inter_event_latencies.append(latency)

                        last_event_time = now
                        metrics.total_events += 1

                        if metrics.total_events >= max_events:
                            break

    except Exception as e:
        metrics.errors.append(str(e))

    metrics.total_duration_ms = (time.monotonic() - start) * 1000
    return metrics


async def load_test_streams(
    url: str,
    concurrent_consumers: int = 50,
    events_per_consumer: int = 100,
) -> List[StreamMetrics]:
    """Run concurrent SSE consumers and collect aggregate metrics."""
    tasks = [
        consume_sse_stream(url, events_per_consumer)
        for _ in range(concurrent_consumers)
    ]
    return await asyncio.gather(*tasks)


def print_report(results: List[StreamMetrics]):
    """Print a summary report of the load test."""
    successful = [r for r in results if not r.errors]
    failed = [r for r in results if r.errors]

    print(f"\n{'='*60}")
    print(f"Streaming Load Test Report")
    print(f"{'='*60}")
    print(f"Total consumers:    {len(results)}")
    print(f"Successful:         {len(successful)}")
    print(f"Failed:             {len(failed)}")

    if successful:
        avg_ttfe = sum(r.time_to_first_event_ms for r in successful) / len(successful)
        avg_conn = sum(r.connection_time_ms for r in successful) / len(successful)
        all_latencies = [l for r in successful for l in r.inter_event_latencies]
        all_latencies.sort()

        print(f"\nAvg connection time:       {avg_conn:.1f}ms")
        print(f"Avg time to first event:   {avg_ttfe:.1f}ms")
        if all_latencies:
            p50 = all_latencies[len(all_latencies) // 2]
            p95 = all_latencies[int(len(all_latencies) * 0.95)]
            p99 = all_latencies[int(len(all_latencies) * 0.99)]
            print(f"Inter-event latency p50:   {p50:.1f}ms")
            print(f"Inter-event latency p95:   {p95:.1f}ms")
            print(f"Inter-event latency p99:   {p99:.1f}ms")


if __name__ == '__main__':
    import sys

    url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000/events'
    results = asyncio.run(load_test_streams(url, concurrent_consumers=50))
    print_report(results)
```

## Best Practices

1. **Always set timeouts on stream consumers** -- A test that waits forever for a stream event blocks the entire suite.
2. **Use AbortController for fetch-based streams** -- Clean cancellation prevents resource leaks in tests.
3. **Validate intermediate state, not just final state** -- Streaming is about the journey; assert on each chunk.
4. **Buffer partial data correctly** -- Chunks can split across read boundaries; always use a line buffer.
5. **Test empty streams** -- A stream that opens and immediately closes should not crash the consumer.
6. **Measure time-to-first-byte separately** -- TTFB is the most critical streaming performance metric.
7. **Test with realistic payload sizes** -- Small test payloads may miss backpressure and buffering issues.
8. **Close streams in afterEach/afterAll** -- Leaked connections cause flaky tests and port exhaustion.
9. **Test the [DONE] signal** -- For LLM streams, verify the termination protocol is handled correctly.
10. **Use mock servers, not production endpoints** -- Tests must be deterministic; real streaming services are not.

## Anti-Patterns to Avoid

1. **Collecting entire stream before asserting** -- This defeats the purpose of testing streaming; validate incrementally.
2. **Using setTimeout as synchronization** -- Use event-driven assertions (on data, on end) instead of arbitrary delays.
3. **Ignoring partial reads** -- A single `reader.read()` call may not return a complete event; always buffer.
4. **Not testing connection drops** -- Real networks fail; simulate disconnections and verify recovery.
5. **Hardcoding port numbers** -- Use port 0 and let the OS assign a free port to avoid conflicts.
6. **Skipping error event testing** -- The SSE `onerror` and gRPC `on('error')` handlers need test coverage.
7. **Testing only happy path timing** -- Measure latency under load, not just with a single consumer.
8. **Forgetting to drain the stream** -- If a test does not consume the full stream, it may leave the server hanging.
9. **Not validating Content-Type headers** -- `text/event-stream` for SSE is required; wrong headers cause silent failures.
10. **Sharing server instances across parallel tests** -- Each test should have its own server to avoid interference.

## Running Tests

```bash
# Run all streaming tests
npx vitest run tests/sse/ tests/grpc/ tests/chunked/ tests/llm/

# Run SSE tests only
npx vitest run tests/sse/

# Run gRPC streaming tests
npx vitest run tests/grpc/

# Run LLM streaming tests
npx vitest run tests/llm/

# Run with verbose timing output
npx vitest run tests/ --reporter=verbose

# Run performance load test (Python)
python3 tests/performance/stream_load_test.py http://localhost:3000/events

# Run with coverage
npx vitest run tests/ --coverage

# Watch mode for development
npx vitest watch tests/sse/

# Debug a specific test
npx vitest run tests/llm/llm-stream.test.ts --reporter=verbose
```
