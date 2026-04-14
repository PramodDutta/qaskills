---
name: MCP Server Testing
description: Comprehensive testing patterns for Model Context Protocol servers including tool validation, transport testing, schema verification, and end-to-end MCP integration testing with stdio and SSE transports.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [mcp, model-context-protocol, server-testing, tool-validation, transport-testing, schema-validation, stdio, sse, integration-testing]
testingTypes: [integration, e2e, unit, api]
frameworks: [vitest, jest, playwright]
languages: [typescript, javascript, python]
domains: [ai, backend, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# MCP Server Testing Skill

You are an expert in testing Model Context Protocol (MCP) servers. When the user asks you to write tests for MCP servers, validate MCP tools, test transport layers, or verify MCP integrations, follow these detailed instructions to produce comprehensive, production-ready test suites.

## Core Principles

1. **Transport-layer isolation** -- Test stdio and SSE transports independently before testing full server behavior to isolate transport-specific bugs from business logic issues.
2. **Schema-first validation** -- Every MCP tool must have its input and output schemas validated against the JSON Schema specification before testing functional behavior.
3. **Stateful conversation testing** -- MCP servers maintain session state; tests must verify correct behavior across multi-turn interactions including context window management and resource lifecycle.
4. **Error boundary coverage** -- Test every error code defined in the MCP specification including parse errors, invalid requests, method not found, invalid params, and internal errors.
5. **Tool invocation fidelity** -- Validate that tool calls produce deterministic results for identical inputs, handle edge cases gracefully, and respect timeout constraints.
6. **Resource lifecycle management** -- Test resource creation, reading, updating, subscription, and cleanup to ensure no resource leaks occur during server operation.
7. **Protocol compliance verification** -- Ensure all JSON-RPC 2.0 message formats, capability negotiation, and protocol version handshakes conform to the MCP specification.

## Project Structure

```
tests/
  mcp/
    unit/
      tools/
        tool-schema.test.ts
        tool-execution.test.ts
        tool-error-handling.test.ts
      resources/
        resource-read.test.ts
        resource-subscribe.test.ts
        resource-templates.test.ts
      prompts/
        prompt-list.test.ts
        prompt-get.test.ts
        prompt-arguments.test.ts
    integration/
      transport/
        stdio-transport.test.ts
        sse-transport.test.ts
        streamable-http.test.ts
      session/
        initialization.test.ts
        capability-negotiation.test.ts
        multi-turn.test.ts
      lifecycle/
        server-startup.test.ts
        graceful-shutdown.test.ts
        reconnection.test.ts
    e2e/
      full-flow.test.ts
      concurrent-clients.test.ts
      error-recovery.test.ts
    fixtures/
      mock-tools.ts
      mock-resources.ts
      sample-requests.ts
      sample-responses.ts
    helpers/
      mcp-test-client.ts
      transport-factory.ts
      assertion-helpers.ts
  config/
    vitest.mcp.config.ts
```

## MCP Test Client Helper

```typescript
// tests/helpers/mcp-test-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { spawn, ChildProcess } from 'child_process';

interface MCPTestClientOptions {
  transport: 'stdio' | 'sse';
  serverCommand?: string;
  serverArgs?: string[];
  serverUrl?: string;
  timeout?: number;
}

export class MCPTestClient {
  private client: Client;
  private serverProcess: ChildProcess | null = null;
  private transport: StdioClientTransport | SSEClientTransport;

  constructor(private options: MCPTestClientOptions) {
    this.client = new Client(
      { name: 'mcp-test-client', version: '1.0.0' },
      { capabilities: {} }
    );
  }

  async connect(): Promise<void> {
    if (this.options.transport === 'stdio') {
      const command = this.options.serverCommand || 'node';
      const args = this.options.serverArgs || ['dist/index.js'];

      this.transport = new StdioClientTransport({
        command,
        args,
        env: { ...process.env, NODE_ENV: 'test' },
      });
    } else {
      const url = this.options.serverUrl || 'http://localhost:3001/sse';
      this.transport = new SSEClientTransport(new URL(url));
    }

    await this.client.connect(this.transport);
  }

  async listTools(): Promise<any> {
    return this.client.request({ method: 'tools/list' }, {} as any);
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    return this.client.request(
      {
        method: 'tools/call',
        params: { name, arguments: args },
      },
      {} as any
    );
  }

  async listResources(): Promise<any> {
    return this.client.request({ method: 'resources/list' }, {} as any);
  }

  async readResource(uri: string): Promise<any> {
    return this.client.request(
      {
        method: 'resources/read',
        params: { uri },
      },
      {} as any
    );
  }

  async listPrompts(): Promise<any> {
    return this.client.request({ method: 'prompts/list' }, {} as any);
  }

  async getPrompt(name: string, args?: Record<string, string>): Promise<any> {
    return this.client.request(
      {
        method: 'prompts/get',
        params: { name, arguments: args },
      },
      {} as any
    );
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
    }
  }
}

export function createTestClient(
  options: Partial<MCPTestClientOptions> = {}
): MCPTestClient {
  return new MCPTestClient({
    transport: 'stdio',
    serverCommand: 'npx',
    serverArgs: ['tsx', 'src/index.ts'],
    timeout: 10000,
    ...options,
  });
}
```

## Tool Schema Validation Tests

```typescript
// tests/unit/tools/tool-schema.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Ajv from 'ajv';
import { createTestClient, MCPTestClient } from '../../helpers/mcp-test-client';

describe('MCP Tool Schema Validation', () => {
  let client: MCPTestClient;
  const ajv = new Ajv({ strict: false, allErrors: true });

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  it('should list all available tools with valid schemas', async () => {
    const result = await client.listTools();

    expect(result.tools).toBeDefined();
    expect(Array.isArray(result.tools)).toBe(true);
    expect(result.tools.length).toBeGreaterThan(0);

    for (const tool of result.tools) {
      expect(tool.name).toBeDefined();
      expect(typeof tool.name).toBe('string');
      expect(tool.name.length).toBeGreaterThan(0);

      expect(tool.description).toBeDefined();
      expect(typeof tool.description).toBe('string');

      if (tool.inputSchema) {
        expect(tool.inputSchema.type).toBe('object');
        const isValid = ajv.validateSchema(tool.inputSchema);
        expect(isValid).toBe(true);
      }
    }
  });

  it('should have unique tool names', async () => {
    const result = await client.listTools();
    const names = result.tools.map((t: any) => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should enforce required properties in input schemas', async () => {
    const result = await client.listTools();

    for (const tool of result.tools) {
      if (tool.inputSchema?.required) {
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);

        for (const requiredProp of tool.inputSchema.required) {
          expect(tool.inputSchema.properties).toHaveProperty(requiredProp);
        }
      }
    }
  });

  it('should validate tool input schema property types', async () => {
    const result = await client.listTools();
    const validTypes = ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'];

    for (const tool of result.tools) {
      if (tool.inputSchema?.properties) {
        for (const [propName, propSchema] of Object.entries(tool.inputSchema.properties)) {
          const schema = propSchema as any;
          if (schema.type) {
            const types = Array.isArray(schema.type) ? schema.type : [schema.type];
            for (const type of types) {
              expect(validTypes).toContain(type);
            }
          }
        }
      }
    }
  });
});
```

## Tool Execution Tests

```typescript
// tests/unit/tools/tool-execution.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, MCPTestClient } from '../../helpers/mcp-test-client';

describe('MCP Tool Execution', () => {
  let client: MCPTestClient;

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  it('should execute a tool with valid arguments', async () => {
    const tools = await client.listTools();
    const firstTool = tools.tools[0];

    const minimalArgs: Record<string, unknown> = {};
    if (firstTool.inputSchema?.required) {
      for (const prop of firstTool.inputSchema.required) {
        const propSchema = firstTool.inputSchema.properties[prop];
        minimalArgs[prop] = generateMinimalValue(propSchema);
      }
    }

    const result = await client.callTool(firstTool.name, minimalArgs);

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);

    for (const item of result.content) {
      expect(['text', 'image', 'resource']).toContain(item.type);
    }
  });

  it('should return isError flag on tool execution failure', async () => {
    const result = await client.callTool('nonexistent-tool', {});

    expect(result.isError).toBe(true);
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
  });

  it('should handle missing required arguments gracefully', async () => {
    const tools = await client.listTools();
    const toolWithRequired = tools.tools.find(
      (t: any) => t.inputSchema?.required?.length > 0
    );

    if (toolWithRequired) {
      const result = await client.callTool(toolWithRequired.name, {});
      expect(result.isError).toBe(true);
    }
  });

  it('should handle null and undefined arguments', async () => {
    const tools = await client.listTools();
    const firstTool = tools.tools[0];

    const result = await client.callTool(firstTool.name, {
      unexpectedParam: null,
      anotherParam: undefined,
    } as any);

    expect(result).toBeDefined();
  });

  it('should respect tool execution timeouts', async () => {
    const startTime = Date.now();
    const TIMEOUT_MS = 30000;

    try {
      await Promise.race([
        client.callTool('long-running-tool', {}),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
        ),
      ]);
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(TIMEOUT_MS + 1000);
    }
  });
});

function generateMinimalValue(schema: any): unknown {
  switch (schema?.type) {
    case 'string':
      return schema.enum ? schema.enum[0] : 'test-value';
    case 'number':
    case 'integer':
      return schema.minimum ?? 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return 'test';
  }
}
```

## Transport Testing

```typescript
// tests/integration/transport/stdio-transport.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';

describe('MCP Stdio Transport', () => {
  let serverProcess: ChildProcess;

  beforeEach(() => {
    serverProcess = spawn('npx', ['tsx', 'src/index.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' },
    });
  });

  afterEach(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  });

  it('should respond to initialize request via stdio', async () => {
    const initRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    });

    const response = await sendAndReceive(serverProcess, initRequest);
    const parsed = JSON.parse(response);

    expect(parsed.jsonrpc).toBe('2.0');
    expect(parsed.id).toBe(1);
    expect(parsed.result).toBeDefined();
    expect(parsed.result.protocolVersion).toBeDefined();
    expect(parsed.result.serverInfo).toBeDefined();
    expect(parsed.result.capabilities).toBeDefined();
  });

  it('should handle malformed JSON gracefully', async () => {
    const response = await sendAndReceive(serverProcess, 'not-valid-json');
    const parsed = JSON.parse(response);

    expect(parsed.error).toBeDefined();
    expect(parsed.error.code).toBe(-32700); // Parse error
  });

  it('should handle invalid JSON-RPC method', async () => {
    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'nonexistent/method',
      params: {},
    });

    const response = await sendAndReceive(serverProcess, request);
    const parsed = JSON.parse(response);

    expect(parsed.error).toBeDefined();
    expect(parsed.error.code).toBe(-32601); // Method not found
  });

  it('should handle concurrent requests over stdio', async () => {
    const requests = Array.from({ length: 5 }, (_, i) =>
      JSON.stringify({
        jsonrpc: '2.0',
        id: i + 1,
        method: 'tools/list',
        params: {},
      })
    );

    for (const req of requests) {
      serverProcess.stdin!.write(req + '\n');
    }

    const responses: any[] = [];
    await new Promise<void>((resolve) => {
      let buffer = '';
      serverProcess.stdout!.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            responses.push(JSON.parse(line));
          } catch {}
        }
        if (responses.length >= 5) resolve();
      });
      setTimeout(resolve, 5000);
    });

    expect(responses.length).toBeGreaterThanOrEqual(5);
    const ids = responses.map((r) => r.id).sort();
    expect(ids).toEqual([1, 2, 3, 4, 5]);
  });

  it('should handle server shutdown gracefully on SIGTERM', async () => {
    const exitPromise = new Promise<number | null>((resolve) => {
      serverProcess.on('exit', (code) => resolve(code));
    });

    serverProcess.kill('SIGTERM');
    const exitCode = await exitPromise;

    expect(exitCode).toBeNull(); // Null means terminated by signal
  });
});

function sendAndReceive(
  process: ChildProcess,
  message: string,
  timeout = 5000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), timeout);

    process.stdout!.once('data', (data) => {
      clearTimeout(timer);
      resolve(data.toString().trim());
    });

    process.stdin!.write(message + '\n');
  });
}
```

## SSE Transport Testing

```typescript
// tests/integration/transport/sse-transport.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';

describe('MCP SSE Transport', () => {
  let serverProcess: ChildProcess;
  const SERVER_URL = 'http://localhost:3001';

  beforeAll(async () => {
    serverProcess = spawn('npx', ['tsx', 'src/index.ts', '--transport', 'sse'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test', PORT: '3001' },
    });

    await waitForServer(SERVER_URL, 10000);
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  });

  it('should establish SSE connection at /sse endpoint', async () => {
    const response = await fetch(`${SERVER_URL}/sse`, {
      headers: { Accept: 'text/event-stream' },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
  });

  it('should accept POST messages at /message endpoint', async () => {
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-sse-client', version: '1.0.0' },
      },
    };

    const response = await fetch(`${SERVER_URL}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initRequest),
    });

    expect(response.ok).toBe(true);
  });

  it('should reject non-SSE connections to /sse', async () => {
    const response = await fetch(`${SERVER_URL}/sse`, {
      headers: { Accept: 'application/json' },
    });

    expect(response.status).not.toBe(200);
  });

  it('should handle multiple concurrent SSE clients', async () => {
    const connections = await Promise.all(
      Array.from({ length: 3 }, () =>
        fetch(`${SERVER_URL}/sse`, {
          headers: { Accept: 'text/event-stream' },
        })
      )
    );

    for (const conn of connections) {
      expect(conn.status).toBe(200);
    }
  });

  it('should send keep-alive events', async () => {
    const controller = new AbortController();
    const response = await fetch(`${SERVER_URL}/sse`, {
      headers: { Accept: 'text/event-stream' },
      signal: controller.signal,
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let receivedData = '';

    const readPromise = new Promise<string>(async (resolve) => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedData += decoder.decode(value);
        if (receivedData.includes('event:')) {
          resolve(receivedData);
          break;
        }
      }
    });

    const result = await Promise.race([
      readPromise,
      new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 15000)),
    ]);

    controller.abort();
    expect(result).not.toBe('timeout');
  });
});

async function waitForServer(url: string, timeout: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Server at ${url} did not start within ${timeout}ms`);
}
```

## Resource Testing

```typescript
// tests/unit/resources/resource-read.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, MCPTestClient } from '../../helpers/mcp-test-client';

describe('MCP Resource Operations', () => {
  let client: MCPTestClient;

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  it('should list all available resources', async () => {
    const result = await client.listResources();

    expect(result.resources).toBeDefined();
    expect(Array.isArray(result.resources)).toBe(true);

    for (const resource of result.resources) {
      expect(resource.uri).toBeDefined();
      expect(typeof resource.uri).toBe('string');
      expect(resource.name).toBeDefined();
    }
  });

  it('should read a resource by URI', async () => {
    const resources = await client.listResources();

    if (resources.resources.length > 0) {
      const firstResource = resources.resources[0];
      const result = await client.readResource(firstResource.uri);

      expect(result.contents).toBeDefined();
      expect(Array.isArray(result.contents)).toBe(true);
      expect(result.contents.length).toBeGreaterThan(0);

      for (const content of result.contents) {
        expect(content.uri).toBeDefined();
        expect(content.text || content.blob).toBeDefined();
      }
    }
  });

  it('should return error for non-existent resource', async () => {
    try {
      await client.readResource('nonexistent://resource/path');
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it('should handle resource MIME types correctly', async () => {
    const resources = await client.listResources();

    for (const resource of resources.resources) {
      if (resource.mimeType) {
        expect(typeof resource.mimeType).toBe('string');
        expect(resource.mimeType).toMatch(/^[\w-]+\/[\w-+.]+$/);
      }
    }
  });
});
```

## Prompt Testing

```typescript
// tests/unit/prompts/prompt-get.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, MCPTestClient } from '../../helpers/mcp-test-client';

describe('MCP Prompt Operations', () => {
  let client: MCPTestClient;

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  it('should list all available prompts', async () => {
    const result = await client.listPrompts();

    expect(result.prompts).toBeDefined();
    expect(Array.isArray(result.prompts)).toBe(true);

    for (const prompt of result.prompts) {
      expect(prompt.name).toBeDefined();
      expect(typeof prompt.name).toBe('string');
    }
  });

  it('should get a prompt with arguments', async () => {
    const prompts = await client.listPrompts();

    if (prompts.prompts.length > 0) {
      const firstPrompt = prompts.prompts[0];
      const args: Record<string, string> = {};

      if (firstPrompt.arguments) {
        for (const arg of firstPrompt.arguments) {
          if (arg.required) {
            args[arg.name] = 'test-value';
          }
        }
      }

      const result = await client.getPrompt(firstPrompt.name, args);

      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);

      for (const message of result.messages) {
        expect(['user', 'assistant']).toContain(message.role);
        expect(message.content).toBeDefined();
      }
    }
  });

  it('should return error for missing required prompt arguments', async () => {
    const prompts = await client.listPrompts();
    const promptWithArgs = prompts.prompts.find(
      (p: any) => p.arguments?.some((a: any) => a.required)
    );

    if (promptWithArgs) {
      try {
        await client.getPrompt(promptWithArgs.name, {});
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    }
  });
});
```

## Session Initialization and Capability Negotiation

```typescript
// tests/integration/session/initialization.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';

describe('MCP Session Initialization', () => {
  let serverProcess: ChildProcess;

  beforeEach(() => {
    serverProcess = spawn('npx', ['tsx', 'src/index.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' },
    });
  });

  afterEach(() => {
    serverProcess?.kill('SIGTERM');
  });

  it('should complete full initialization handshake', async () => {
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: { roots: { listChanged: true } },
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    };

    const response = await sendMessage(serverProcess, initRequest);

    expect(response.result.protocolVersion).toBe('2024-11-05');
    expect(response.result.serverInfo.name).toBeDefined();
    expect(response.result.capabilities).toBeDefined();

    // Send initialized notification
    const initializedNotification = {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    };

    serverProcess.stdin!.write(JSON.stringify(initializedNotification) + '\n');
  });

  it('should negotiate capabilities correctly', async () => {
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
          sampling: {},
        },
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    };

    const response = await sendMessage(serverProcess, initRequest);
    const capabilities = response.result.capabilities;

    // Server should declare which features it supports
    if (capabilities.tools) {
      expect(typeof capabilities.tools).toBe('object');
    }
    if (capabilities.resources) {
      expect(typeof capabilities.resources).toBe('object');
    }
    if (capabilities.prompts) {
      expect(typeof capabilities.prompts).toBe('object');
    }
  });

  it('should reject requests before initialization', async () => {
    const toolsRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    };

    const response = await sendMessage(serverProcess, toolsRequest);

    expect(response.error).toBeDefined();
  });

  it('should reject unsupported protocol versions', async () => {
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '1999-01-01',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    };

    const response = await sendMessage(serverProcess, initRequest);

    // Server should either error or negotiate a supported version
    if (response.error) {
      expect(response.error.code).toBeDefined();
    } else {
      expect(response.result.protocolVersion).not.toBe('1999-01-01');
    }
  });
});

async function sendMessage(process: ChildProcess, message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);

    process.stdout!.once('data', (data) => {
      clearTimeout(timeout);
      try {
        resolve(JSON.parse(data.toString().trim()));
      } catch (e) {
        reject(e);
      }
    });

    process.stdin!.write(JSON.stringify(message) + '\n');
  });
}
```

## End-to-End Flow Tests

```typescript
// tests/e2e/full-flow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, MCPTestClient } from '../helpers/mcp-test-client';

describe('MCP Full End-to-End Flow', () => {
  let client: MCPTestClient;

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  it('should complete a full tool discovery and execution flow', async () => {
    // Step 1: List available tools
    const tools = await client.listTools();
    expect(tools.tools.length).toBeGreaterThan(0);

    // Step 2: Pick a tool and validate its schema
    const selectedTool = tools.tools[0];
    expect(selectedTool.name).toBeDefined();
    expect(selectedTool.inputSchema).toBeDefined();

    // Step 3: Execute the tool with valid arguments
    const args: Record<string, unknown> = {};
    if (selectedTool.inputSchema?.required) {
      for (const prop of selectedTool.inputSchema.required) {
        const schema = selectedTool.inputSchema.properties[prop];
        args[prop] = generateValue(schema);
      }
    }

    const result = await client.callTool(selectedTool.name, args);
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
  });

  it('should complete a full resource discovery and read flow', async () => {
    const resources = await client.listResources();

    if (resources.resources.length > 0) {
      const resource = resources.resources[0];
      const content = await client.readResource(resource.uri);

      expect(content.contents).toBeDefined();
      expect(content.contents.length).toBeGreaterThan(0);
    }
  });

  it('should complete a full prompt discovery and execution flow', async () => {
    const prompts = await client.listPrompts();

    if (prompts.prompts.length > 0) {
      const prompt = prompts.prompts[0];
      const args: Record<string, string> = {};

      if (prompt.arguments) {
        for (const arg of prompt.arguments) {
          args[arg.name] = 'test-value';
        }
      }

      const result = await client.getPrompt(prompt.name, args);
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
    }
  });

  it('should handle rapid sequential tool calls', async () => {
    const tools = await client.listTools();
    const tool = tools.tools[0];

    const results = [];
    for (let i = 0; i < 10; i++) {
      const result = await client.callTool(tool.name, {});
      results.push(result);
    }

    expect(results.length).toBe(10);
    for (const result of results) {
      expect(result.content).toBeDefined();
    }
  });

  it('should maintain session state across multiple operations', async () => {
    // First operation
    const tools1 = await client.listTools();

    // Second operation
    const resources = await client.listResources();

    // Third operation - tools should still be the same
    const tools2 = await client.listTools();

    expect(tools1.tools.length).toBe(tools2.tools.length);
    expect(tools1.tools.map((t: any) => t.name).sort()).toEqual(
      tools2.tools.map((t: any) => t.name).sort()
    );
  });
});

function generateValue(schema: any): unknown {
  switch (schema?.type) {
    case 'string':
      return schema.enum ? schema.enum[0] : 'test-value';
    case 'number':
      return 42;
    case 'integer':
      return 1;
    case 'boolean':
      return true;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return 'test';
  }
}
```

## Vitest Configuration for MCP Tests

```typescript
// tests/config/vitest.mcp.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/mcp/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 15000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    setupFiles: ['tests/mcp/setup.ts'],
    reporters: ['verbose'],
    env: {
      NODE_ENV: 'test',
    },
  },
});
```

## Best Practices

1. **Always test initialization before operations** -- MCP servers require a proper handshake sequence. Never skip the initialize/initialized exchange in tests.
2. **Use isolated server instances per test suite** -- Spawn a fresh server process for each describe block to avoid state leakage between test suites.
3. **Validate JSON-RPC envelope structure** -- Every response must include jsonrpc, id (for requests), and either result or error. Never assume the structure.
4. **Test both happy path and error paths for every tool** -- Each tool should have tests for valid inputs, missing required fields, type mismatches, and boundary values.
5. **Implement transport-agnostic test helpers** -- Write test utilities that abstract the transport layer so the same logical tests can run against stdio and SSE.
6. **Test resource URI patterns** -- Verify that resource URIs follow consistent patterns and that template parameters are properly substituted.
7. **Measure and assert on response times** -- MCP servers in production have timeout constraints. Include performance assertions in integration tests.
8. **Test concurrent client scenarios** -- Multiple AI agents may connect to the same MCP server. Verify that concurrent sessions do not interfere with each other.
9. **Verify notification delivery** -- Test that servers correctly emit notifications for resource changes, tool list updates, and progress events.
10. **Maintain a fixture library of valid and invalid requests** -- Reusable request fixtures reduce duplication and ensure consistency across test files.

## Anti-Patterns

1. **Testing only the happy path** -- Skipping error cases means production failures will be unhandled. Always test malformed inputs, missing fields, and invalid types.
2. **Hardcoding server URLs in tests** -- Use environment variables or configuration objects so tests work across development, CI, and staging environments.
3. **Ignoring transport-specific behaviors** -- Stdio and SSE have different failure modes. A test passing on stdio does not guarantee it passes on SSE.
4. **Reusing server processes across unrelated tests** -- Shared state causes flaky tests. Each test suite should manage its own server lifecycle.
5. **Not testing the initialization handshake** -- Assuming the server is ready without verifying the handshake can mask critical protocol compliance bugs.
6. **Ignoring JSON-RPC error codes** -- The MCP spec defines specific error codes. Tests should verify the correct error code, not just that an error occurred.
7. **Testing tools without validating their schemas first** -- A tool with an invalid schema will produce confusing runtime errors. Always validate schemas before testing execution.
8. **Not testing server shutdown behavior** -- Servers that do not shut down cleanly leak resources and can cause port conflicts in CI.
9. **Skipping pagination testing** -- Tools, resources, and prompts may be paginated. Tests that only check the first page miss pagination bugs.
10. **Not testing with realistic payloads** -- Using minimal test data misses issues with large responses, deeply nested objects, and special characters in content.
