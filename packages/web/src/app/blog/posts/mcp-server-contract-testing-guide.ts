import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP Server Contract Testing Guide',
  description:
    'Test MCP server contracts with schema assertions, tool discovery checks, transport coverage, and client compatibility suites for reliable AI agents.',
  date: '2026-07-10',
  category: 'AI Testing',
  content: `
# MCP Server Contract Testing Guide

An agent asks for \`create_ticket\`, passes \`priority: "urgent"\`, and the server replies with a text blob that no client can safely parse. The server may "work" in a manual demo, but its contract is already broken: tool discovery described one interface, runtime behavior delivered another, and the client has no reliable recovery path.

Model Context Protocol servers need contract tests because their consumers are not only humans reading docs. Hosts and agents discover tools, resources, and prompts through protocol messages, then decide what to call based on names, descriptions, JSON schemas, and returned content blocks. A small schema change can break a client planner. A transport change can break initialization. A vague error can cause an agent to retry the wrong action.

This guide focuses on MCP server contracts: discovery, tool input schemas, output content, error behavior, and transport compatibility. For broader server validation, use [MCP server testing guide 2026](/blog/mcp-server-testing-guide-2026). For a step-by-step first server test, see [test an MCP server guide 2026](/blog/test-an-mcp-server-guide-2026).

## Define the Contract Surface Before Writing Tests

An MCP server contract is larger than one tool function. It includes what the server advertises, how it initializes, which protocol capabilities it exposes, and how it responds when a client sends valid or invalid calls.

| Contract area | What to assert | Why it breaks clients |
|---|---|---|
| Initialization | Protocol version negotiation and server metadata are accepted | Client cannot finish handshake |
| Tool discovery | Tool names, descriptions, and input schemas are stable | Planner chooses wrong tool or cannot form arguments |
| Tool invocation | Valid inputs return expected content block types | Client cannot parse or present result |
| Validation failure | Invalid inputs fail with useful structured errors | Agent retries with bad assumptions |
| Resources | Resource URIs and MIME types remain stable | Client cache or context loader misses data |
| Prompts | Prompt names and argument schemas stay compatible | Host UI renders stale prompt form |
| Transport | Stdio or HTTP transport behaves consistently | Same server works in one host and fails in another |

Do not reduce contract testing to "call every tool once." Discovery is part of the contract. If \`inputSchema\` loses a required field, the server has broken clients before any tool body runs.

## Testing Tool Discovery With the TypeScript SDK

The official TypeScript SDK exposes a high-level client and server APIs. Contract tests can connect to a real server process over stdio, call \`listTools\`, and assert the advertised schema.

\`\`\`ts
// tests/mcp-tools.contract.test.ts
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function connectServer() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/server.js'],
  });

  const client = new Client({
    name: 'contract-test-client',
    version: '1.0.0',
  });

  await client.connect(transport);
  return { client, transport };
}

describe('MCP tool discovery contract', () => {
  it('advertises create_ticket with the expected input schema', async () => {
    const { client, transport } = await connectServer();

    try {
      const tools = await client.listTools();
      const createTicket = tools.tools.find((tool) => tool.name === 'create_ticket');

      expect(createTicket).toBeDefined();
      expect(createTicket?.description).toContain('Create a support ticket');
      expect(createTicket?.inputSchema).toMatchObject({
        type: 'object',
        required: ['title', 'severity'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      });
    } finally {
      await transport.close();
    }
  });
});
\`\`\`

This test does not inspect server internals. It behaves like a client. That is the point of a contract test: verify the interface a real host sees.

## Contract Tests for Tool Calls

Tool call tests should cover at least one valid request, one validation failure, and one downstream failure if the tool depends on an external system. Keep assertions on MCP response shape, not just business side effects.

\`\`\`ts
// tests/create-ticket.contract.test.ts
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function withClient<T>(run: (client: Client) => Promise<T>) {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/server.js'],
  });
  const client = new Client({ name: 'contract-test-client', version: '1.0.0' });
  await client.connect(transport);

  try {
    return await run(client);
  } finally {
    await transport.close();
  }
}

describe('create_ticket tool contract', () => {
  it('returns a text content block containing the created ticket key', async () => {
    await withClient(async (client) => {
      const result = await client.callTool({
        name: 'create_ticket',
        arguments: {
          title: 'Checkout button fails on Android',
          severity: 'high',
        },
      });

      expect(result.content).toEqual([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('TICKET-'),
        }),
      ]);
    });
  });

  it('rejects severity values outside the advertised enum', async () => {
    await withClient(async (client) => {
      await expect(
        client.callTool({
          name: 'create_ticket',
          arguments: {
            title: 'Bad severity example',
            severity: 'urgent',
          },
        }),
      ).rejects.toThrow();
    });
  });
});
\`\`\`

The invalid-input test protects the discovery contract. If the schema says only \`low\`, \`medium\`, and \`high\` are allowed, the server should not silently accept \`urgent\` and reinterpret it.

## What to Freeze and What to Allow

Not every field deserves exact equality. Tool descriptions may evolve, but tool names and required input fields are often client-facing. Decide what is stable before the test suite accidentally freezes prose that product teams need to improve.

| MCP field | Suggested assertion strength | Reason |
|---|---|---|
| Tool name | Exact | Clients route calls by name |
| Required input fields | Exact | Planners must know required arguments |
| Optional input fields | Contains expected minimum | Additive fields can be backward compatible |
| Enum values | Exact or explicit superset policy | New enum values may affect planner decisions |
| Description | Contains critical phrase | Full text may improve over time |
| Content block type | Exact | Client rendering depends on type |
| Text content | Pattern or semantic parse | Exact text is usually too brittle |
| Resource URI | Exact for documented resources | Clients may bookmark or cache URI |

This table should become a team policy. Without it, every contract test author chooses their own strictness and upgrades become unpredictable.

## Backward Compatibility Rules for MCP Tools

MCP tool contracts should follow ordinary API compatibility rules, with an extra concern: LLM planners may rely on descriptions and schemas to choose actions. A technically valid JSON schema change can still change agent behavior.

| Change | Compatibility risk | Test response |
|---|---|---|
| Add optional field | Usually low | Assert existing clients can omit it |
| Add required field | High | Version tool or provide default behavior |
| Rename tool | Breaking | Keep old tool as alias or migrate clients |
| Narrow enum | Breaking | Add contract test for old values before removal |
| Broaden enum | Medium | Verify planner and server handle new value |
| Change content type | Breaking | Contract test client rendering path |
| Change error semantics | Medium to high | Assert invalid calls produce actionable errors |

Versioning every tool name is noisy, but silent breaking changes are worse. For heavily used tools, consider a deprecation window where both old and new tools exist and telemetry shows client migration.

## Transport Is Part of the Contract

Many teams test the tool function directly and forget the transport. That misses process startup, stdio framing, HTTP streaming behavior, headers, auth, and initialization. A server used by desktop agents over stdio and hosted agents over HTTP should have both paths covered.

For stdio, spawn the packaged command that users configure, not a private function. For HTTP, test the deployed or locally hosted endpoint with the same client transport your consumers use. Keep transport tests small but real: initialize, list tools, call one safe tool, close.

Transport tests also catch packaging mistakes. A TypeScript source import may pass unit tests while the published \`dist/server.js\` fails because an asset was not copied. Contract tests should run against the artifact clients will run.

## Error Contracts for Agent Recovery

Agents recover poorly from ambiguous failures. A tool that returns "failed" as a text block for invalid input forces the client to guess whether the call succeeded. Prefer clear protocol errors for invalid arguments and clear content for successful calls that produce domain-level warnings.

Test these cases:

| Failure | Expected contract | Example assertion |
|---|---|---|
| Missing required argument | Tool call rejects | Rejection includes field name where possible |
| Unknown tool | Client receives method/tool error | Test protects server routing |
| Downstream timeout | Tool returns controlled failure or rejects predictably | No raw stack trace in content |
| Permission denied | Error identifies authorization problem | Agent should not retry with same credentials |
| Empty result | Successful content explains no records | Avoid treating no data as protocol failure |

The exact error object depends on SDK and transport behavior, but the intent should be stable. Clients need to distinguish "fix your arguments" from "try later" from "ask user for permission."

## Golden Files Need Care

Snapshotting the entire \`listTools\` response looks attractive. It catches everything. It also catches harmless description edits, property ordering differences, and SDK metadata changes. Use targeted assertions for fields that are part of the compatibility promise. If you do keep a golden file, review it as an API artifact, not as a convenience snapshot.

A useful compromise is a normalized contract artifact that includes only stable fields: tool names, required fields, enum values, content block types, and resource URI patterns. Generate it from \`listTools\`, compare it in CI, and require explicit review for changes.

## Resource and Prompt Contracts Need Coverage Too

Tool calls usually get the attention because they perform actions. MCP resources and prompts also create compatibility promises. A resource URI that changes can break a client that loads context before calling tools. A prompt argument rename can break a host UI that renders a saved prompt form.

\`\`\`ts
// tests/resources-prompts.contract.test.ts
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function openClient() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/server.js'],
  });
  const client = new Client({ name: 'contract-tests', version: '1.0.0' });
  await client.connect(transport);
  return { client, transport };
}

describe('MCP resources and prompts', () => {
  it('keeps the qa policy resource addressable', async () => {
    const { client, transport } = await openClient();

    try {
      const resources = await client.listResources();
      expect(resources.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            uri: 'qa-policy://release-gates',
            mimeType: 'text/markdown',
          }),
        ]),
      );
    } finally {
      await transport.close();
    }
  });

  it('advertises the regression-summary prompt with required arguments', async () => {
    const { client, transport } = await openClient();

    try {
      const prompts = await client.listPrompts();
      const prompt = prompts.prompts.find((item) => item.name === 'regression-summary');

      expect(prompt?.arguments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'buildId', required: true }),
          expect.objectContaining({ name: 'suiteName', required: true }),
        ]),
      );
    } finally {
      await transport.close();
    }
  });
});
\`\`\`

If your server does not expose resources or prompts, the contract can assert that too. Clients sometimes branch based on capabilities. An accidental new capability may be just as important to review as an accidental removal.

## Consumer-Driven MCP Contracts

Provider-side tests prove what the server says. Consumer-driven tests prove that real clients can still do what they need. For MCP, a consumer contract can be a small suite owned by the host or agent team that lists the tools it depends on, the arguments it sends, and the content block shape it parses.

| Consumer need | Server-side contract | Consumer-driven addition |
|---|---|---|
| Agent creates support tickets | \`create_ticket\` exists with schema | Agent fixture calls it with planner-generated arguments |
| Host reads release policy | Resource URI and MIME type remain stable | Host parser loads the resource into context |
| Prompt form renders fields | Prompt arguments are listed | UI test verifies saved prompt config still opens |
| Agent handles no results | Tool returns text explaining empty result | Agent does not retry pointlessly |
| Permission failure asks user | Error indicates authorization issue | Host displays permission recovery path |

This is where MCP contract testing differs from ordinary library testing. The contract is consumed by software that may plan dynamically, but the integration still needs known examples. Keep those examples in version control.

## Security-Relevant Contract Checks

MCP tools often touch files, tickets, databases, browsers, or cloud APIs. Contract tests should include authorization and scope boundaries, not only happy paths. If a server advertises a tool that writes to an external system, invalid or unauthorized calls must fail safely.

Test that sensitive tools are not accidentally exposed in restricted configurations. Test that tool descriptions do not invite clients to pass secrets unnecessarily. Test that resource contents do not include credentials. Test that errors avoid raw stack traces containing file paths or tokens. These are contract concerns because clients and hosts display this information.

| Security contract | Assertion |
|---|---|
| Restricted mode hides write tools | \`listTools\` omits mutating tools |
| Tool schema avoids secret fields | No input property named \`password\` unless explicitly required |
| Resource content is scrubbed | Read resource output lacks known secret patterns |
| Unauthorized call fails | \`callTool\` rejects or returns controlled denial |
| Error message is safe | No stack trace or environment dump in content |

Security review should happen before publishing a server to agent users. Once a tool is discoverable, a capable client may try to use it.

## Compatibility Matrices for MCP Clients

Different hosts can exercise the same MCP server differently. One client may list tools once at startup and cache them. Another may refresh discovery during a session. One may display text content only. Another may support images, resources, and prompt templates. A useful contract suite records which client behaviors the server promises to support.

| Client behavior | Server contract test |
|---|---|
| Discovery cached at startup | Tool schemas remain backward compatible for a session |
| Discovery refreshed | Removed tools have a deprecation plan |
| Text-only rendering | Tools return text fallback for important results |
| Resource-aware context | Resource URIs and MIME types stay stable |
| Strict schema planning | Required fields and enum values are exact |
| Permission prompts | Authorization failures are distinguishable |

This matrix should be small and real. Do not test imaginary clients. Start with the hosts your users actually configure, then add client behaviors when support tickets or product plans justify them.

## Contract Fixtures for Agent Planning

Agents do not only call tools, they choose tools. Descriptions and schemas influence that choice. For critical workflows, keep a few planning fixtures that assert the advertised tool still contains the words and fields the planner needs. Do not snapshot every sentence, but protect terms that disambiguate tools.

For example, if \`create_ticket\` and \`search_ticket\` both mention support tickets, the create tool description should include "create" or "open" and the search tool should include "search" or "find." The input schema should make required creation fields obvious. This is a contract with the planner, not only with a TypeScript type.

Names matter.

## Frequently Asked Questions

### Should MCP contract tests call server functions directly?

No for contract coverage. Direct function tests are useful unit tests, but contract tests should connect through the same transport and client APIs that real hosts use. Otherwise you miss discovery, serialization, initialization, and packaging failures.

### What is the most important MCP contract to freeze?

Tool names, required arguments, enum values, and content block types are usually the highest-risk fields. Descriptions matter for agent planning, but exact full-text matching often makes tests unnecessarily brittle.

### How should I test invalid tool arguments?

Send a real \`callTool\` request with arguments that violate the advertised schema and assert that the call fails predictably. Do not only test your internal validator function.

### Do I need separate tests for stdio and HTTP transports?

Yes if clients use both. The same tool implementation can pass over stdio and fail over HTTP because startup, framing, headers, auth, or streaming behavior differs.

### Are snapshot tests enough for listTools?

Usually not. They catch changes but do not express compatibility intent. Prefer targeted assertions or a normalized contract artifact that includes only stable client-facing fields.
`,
};
