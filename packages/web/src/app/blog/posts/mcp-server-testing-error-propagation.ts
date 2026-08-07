import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP Server Testing Error Propagation: Catching Silent Failures Before Agents Do',
  description: 'Master MCP server testing error propagation with protocol vs tool-error checks, client harnesses, and CI gates that stop silent agent failures early.',
  date: '2026-08-07',
  category: 'AI Testing',
  content: `
# MCP Server Testing Error Propagation: Catching Silent Failures Before Agents Do

MCP server testing error propagation is the practice of verifying that every failure mode in a Model Context Protocol server reaches the client in the shape the protocol and product intend. The practical test goal is not "did an exception get logged." It is: invalid calls produce protocol errors where protocol rules were broken, tool-level failures return structured tool results with an error signal when the call was well formed, and nothing mutates durable state when validation fails. If those three outcomes drift, AI coding agents either invent retries, hide the root cause in a chatty answer, or call a mutating tool again with worse arguments.

Error propagation sits one layer above schema validation and one layer below full agent-loop evaluation. Schema tests prove the advertised contract. Agent-loop tests prove whether a model recovers. Propagation tests prove the transport and handler layers translate exceptions, validation failures, timeouts, and partial dependency outages into stable, machine-readable outcomes. That translation is where most production MCP bugs hide: a handler throws, the server turns the throw into a generic internal error, the agent retries five times, and your audit log shows five identical side-effect attempts.

This article builds a runnable workflow for QA and test-automation engineers who own MCP servers used by coding agents. You will classify error channels, design a client harness that asserts both JSON-RPC errors and tool-result errors, inject realistic failures, and put CI gates around the cases that silently break agent workflows. For the broader agent evaluation context, pair this material with the [agentic AI testing guide for 2026](/blog/agentic-ai-testing-guide-2026). For transport and automation layout, see [MCP servers test automation in 2026](/blog/mcp-servers-test-automation-2026).

## Separate protocol errors from tool-result errors first

MCP tool calling uses two different error channels. Confusing them is the single most common design and testing mistake.

**Protocol errors** are JSON-RPC errors returned instead of a result. They apply when the request itself is invalid at the protocol or registration layer: unknown tool name, request that fails the call schema, or other server-side protocol failures. JSON-RPC 2.0 standard codes include parse error (-32700), invalid request (-32600), method not found (-32601), invalid params (-32602), and internal error (-32603). MCP also reserves implementation-defined server error ranges; treat those as product-specific and document every code your server actually emits. The official tools documentation describes protocol errors for issues such as unknown tools and malformed call requests.

**Tool-result errors** are successful JSON-RPC responses whose result payload indicates the tool failed. In the tools model, a call can return content plus an error flag (commonly described as \`isError: true\` on the tool result) when the tool ran, understood the request structure, and still could not complete the domain operation. Invalid business input that the schema allowed, missing downstream resources, and recoverable user mistakes belong here so the model can adjust arguments without treating the session as protocol-broken.

| Failure situation | Expected channel | Why it matters to agents | Typical wrong implementation |
|---|---|---|---|
| Unknown tool name | Protocol error | Agent should stop inventing that tool | Generic text result, no error |
| Missing required argument | Protocol or validation path for invalid params | Agent must fix the call shape | Handler runs and throws later |
| Valid shape, unknown resource id | Tool-result error | Agent can search or re-prompt | Uncaught exception becomes -32603 |
| Authz denial after valid call | Tool-result error or documented auth error | Agent should not thrash retries | Empty success with no content |
| Dependency timeout mid-handler | Tool-result error with timeout semantics | Agent may retry with backoff | Socket hang, client hangs forever |
| Malformed JSON on the wire | Protocol parse/invalid request | Client reconnect or bugfix | Partial parse, silent drop |

Write product policy as a matrix before writing tests. For each tool, list which failures are protocol-level and which are tool-level. If two tools disagree for the same class of mistake, agents will learn the wrong recovery pattern from one and apply it to the other.

## Map every throw site to an observed client outcome

Propagation testing starts from code paths, not from slogans like "handle errors gracefully." Inventory the throw and reject sites:

1. Argument validation before business logic
2. Authorization checks after identity is known
3. Downstream HTTP, database, or filesystem calls
4. Timeouts and cancellation
5. Unexpected exceptions in shared utilities
6. Transport disconnects and initialize failures

For each site, record the intended client-visible outcome: JSON-RPC error code and message stability, tool result with error flag, or connection termination. Then write one automated case that forces that site and asserts the client observation, not the internal stack trace.

\`\`\`ts
type ProtocolError = {
  code: number;
  message: string;
  data?: unknown;
};

type ToolContent = { type: 'text'; text: string };

type ToolResult = {
  content: ToolContent[];
  isError?: boolean;
};

type CallOutcome =
  | { kind: 'protocol-error'; error: ProtocolError }
  | { kind: 'tool-result'; result: ToolResult };

async function callToolForTest(
  client: {
    callTool(args: {
      name: string;
      arguments?: Record<string, unknown>;
    }): Promise<ToolResult>;
  },
  name: string,
  args?: Record<string, unknown>,
): Promise<CallOutcome> {
  try {
    const result = await client.callTool({ name, arguments: args });
    return { kind: 'tool-result', result };
  } catch (err) {
    // Map SDK-thrown protocol failures into a stable shape for assertions.
    // Use the error fields your official MCP client actually exposes.
    const anyErr = err as { code?: number; message?: string; data?: unknown };
    if (typeof anyErr.code === 'number' && typeof anyErr.message === 'string') {
      return {
        kind: 'protocol-error',
        error: {
          code: anyErr.code,
          message: anyErr.message,
          data: anyErr.data,
        },
      };
    }
    throw err;
  }
}
\`\`\`

This adapter is the heart of the harness. Different SDK versions surface protocol errors as thrown exceptions or structured returns. Normalize once so every test asserts the same shape. Never assert full stack traces in CI; they are unstable and leak internal paths.

## Build a client harness that owns transport lifecycle

Unit tests that call handler functions directly cannot prove propagation. A thrown Error inside a handler may be swallowed by the framework, converted to an internal error, or turned into a tool-result error depending on registration wrappers. Run the real server process (or in-process server transport supported by the official SDK) and connect with a real client.

Minimum harness responsibilities:

- Start server with test configuration and deterministic fixtures
- Complete initialize and capability negotiation
- List tools and confirm the tool under test is advertised
- Invoke calls through the public client API
- Tear down transport so leaked connections fail the suite
- Capture server logs as artifacts without making them primary assertions

\`\`\`ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type TestClient = {
  listTools(): Promise<{ tools: Array<{ name: string }> }>;
  callTool(input: {
    name: string;
    arguments?: Record<string, unknown>;
  }): Promise<{ content: Array<{ type: string; text?: string }>; isError?: boolean }>;
  close(): Promise<void>;
};

let client: TestClient;

beforeAll(async () => {
  // Start your server with the transport your product ships (stdio or HTTP).
  // Construct the client with the official MCP SDK for your language.
  client = await createTestClientFromProjectHelpers();
});

afterAll(async () => {
  await client.close();
});

describe('error propagation for find_test_case', () => {
  it('returns a protocol error for an unknown tool name', async () => {
    const outcome = await callToolForTest(client, 'definitely_not_a_tool', {});
    expect(outcome.kind).toBe('protocol-error');
    if (outcome.kind !== 'protocol-error') return;
    expect(outcome.error.message.toLowerCase()).toMatch(/unknown|not found|invalid/);
  });

  it('returns a tool-result error for a missing fixture resource', async () => {
    const outcome = await callToolForTest(client, 'find_test_case', {
      caseId: 'case-does-not-exist',
    });
    expect(outcome.kind).toBe('tool-result');
    if (outcome.kind !== 'tool-result') return;
    expect(outcome.result.isError).toBe(true);
    const text = outcome.result.content
      .map((c) => ('text' in c ? c.text : ''))
      .join('\\n');
    expect(text.toLowerCase()).toContain('not found');
  });
});
\`\`\`

Notice the tests avoid inventing exact JSON-RPC code numbers unless your server documents a stable code for that case. Prefer message classes and channel type when the code is implementation-defined. When you do assert codes, pin them in a shared constant module owned by the server team so tests and docs share one source of truth.

## Design negative cases that force every error channel

A useful propagation suite is deliberately small and mean. Ten high-signal cases beat fifty noisy ones.

### Protocol-channel cases

- Unknown tool name
- Wrong JSON types where the client still sends a call (if your test client can construct invalid payloads)
- Missing required fields when validation is performed at the protocol boundary
- Calls before initialize completes, if the transport allows that race
- Unsupported method names outside tools/call when you expose a multi-method server

### Tool-result-channel cases

- Resource not found with valid schema
- Authorization failure for a second user fixture
- Downstream 4xx mapped into domain language
- Downstream 5xx mapped into a retryable tool error message
- Explicit domain validation (for example, end date before start date) after schema validation passed
- Partial multi-step failure where the first step succeeds and the second fails (see side-effect section)

### Transport and lifecycle cases

- Client disconnect mid-call
- Server-enforced timeout
- Oversized argument payload rejected safely
- Rate limiting if the server implements it

\`\`\`ts
const cases: Array<{
  name: string;
  tool: string;
  args: Record<string, unknown>;
  expectChannel: 'protocol-error' | 'tool-result-error' | 'tool-result-ok';
  messageIncludes?: string;
}> = [
  {
    name: 'unknown tool',
    tool: 'nope_tool',
    args: {},
    expectChannel: 'protocol-error',
  },
  {
    name: 'missing resource',
    tool: 'find_test_case',
    args: { caseId: 'missing-1' },
    expectChannel: 'tool-result-error',
    messageIncludes: 'not found',
  },
  {
    name: 'forbidden resource',
    tool: 'find_test_case',
    args: { caseId: 'other-tenant-9' },
    expectChannel: 'tool-result-error',
    messageIncludes: 'forbidden',
  },
  {
    name: 'valid lookup',
    tool: 'find_test_case',
    args: { caseId: 'seed-case-1' },
    expectChannel: 'tool-result-ok',
  },
];

async function runMatrix(testClient: TestClient) {
  for (const item of cases) {
    const outcome = await callToolForTest(testClient, item.tool, item.args);
    if (item.expectChannel === 'protocol-error') {
      if (outcome.kind !== 'protocol-error') {
        throw new Error(\`\${item.name}: expected protocol error\`);
      }
      continue;
    }
    if (outcome.kind !== 'tool-result') {
      throw new Error(\`\${item.name}: expected tool result channel\`);
    }
    const isError = Boolean(outcome.result.isError);
    if (item.expectChannel === 'tool-result-error' && !isError) {
      throw new Error(\`\${item.name}: expected isError tool result\`);
    }
    if (item.expectChannel === 'tool-result-ok' && isError) {
      throw new Error(\`\${item.name}: expected successful tool result\`);
    }
    if (item.messageIncludes) {
      const text = JSON.stringify(outcome.result.content).toLowerCase();
      if (!text.includes(item.messageIncludes)) {
        throw new Error(\`\${item.name}: message missing \${item.messageIncludes}\`);
      }
    }
  }
}
\`\`\`

Keep the matrix data-driven so product owners can review expected channels without reading TypeScript control flow. When a product decision changes (for example, moving authz failures from tool errors to a dedicated auth protocol), update the matrix and the server together in one pull request.

## Inject dependency failures without mocking the protocol away

The weak form of error testing mocks the handler and asserts it returns an error object. The strong form leaves the protocol stack real and only replaces the dependency boundary.

Preferred injection points:

- Test double for an HTTP client used by the tool
- Fixture database with intentionally missing rows
- Local stub service that returns 503 or hangs until timeout
- Feature flag that forces a handler branch in test builds

Avoid replacing the MCP transport with a fake that cannot reproduce serialization, cancellation, or initialize ordering. Those are exactly the layers that corrupt error propagation.

\`\`\`ts
type Downstream = {
  getCase(id: string): Promise<{ id: string; title: string } | null>;
};

export function createFindTestCaseHandler(deps: { downstream: Downstream }) {
  return async function findTestCase(input: { caseId: string }) {
    try {
      const found = await deps.downstream.getCase(input.caseId);
      if (!found) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: \`Test case not found: \${input.caseId}\`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(found),
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown downstream error';
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: \`Lookup failed due to downstream error: \${message}\`,
          },
        ],
      };
    }
  };
}
\`\`\`

Then in integration tests, pass a downstream double that throws, returns null, or delays. Assert the client still receives a finished tool result with \`isError: true\` rather than a hung call or an untyped crash.

## Prove failed validation does not mutate state

What people get wrong: they assert the error message and stop. A validation failure that still inserts a row, enqueues a job, or rotates a secret is a data-corruption bug with a green test suite.

For every mutating tool, pair the negative case with a state assertion:

1. Snapshot durable state before the call (row counts, object versions, queue depth)
2. Send the invalid or unauthorized call
3. Assert the error channel
4. Snapshot again and assert no change
5. Send the valid call and assert exactly one intended change

\`\`\`sql
-- Fixture setup for a mutating tool test
INSERT INTO projects (id, name, version) VALUES ('proj-1', 'Demo', 3);

-- After an invalid rename call, version and name must be unchanged:
-- SELECT name, version FROM projects WHERE id = 'proj-1';
-- Expected: Demo, 3
\`\`\`

\`\`\`ts
async function assertNoMutationOnInvalidRename(client: TestClient, db: {
  getProject(id: string): Promise<{ name: string; version: number }>;
}) {
  const before = await db.getProject('proj-1');
  const outcome = await callToolForTest(client, 'rename_project', {
    projectId: 'proj-1',
    // Intentionally invalid: empty name after schema allows string type
    name: '',
  });

  if (outcome.kind !== 'tool-result' || !outcome.result.isError) {
    throw new Error('expected tool-result error for empty name');
  }

  const after = await db.getProject('proj-1');
  if (after.name !== before.name || after.version !== before.version) {
    throw new Error('invalid rename mutated project state');
  }
}
\`\`\`

If your schema already rejects empty strings, craft a different invalid domain case that passes schema but fails business rules. Propagation tests are useless if every negative case is rejected before the handler runs and you never exercise handler-level guarantees.

## Diagnose the realistic failure mode: "success-looking" error collapse

A failure mode that shows up repeatedly in agent-facing servers is **error collapse**: every exception becomes either an empty successful tool result or a single internal error with an unhelpful message. Agents then retry blindly or invent alternative tools.

### Symptoms

- Client receives \`isError: false\` (or missing) with content like "An error occurred"
- Or client receives protocol -32603 for routine "not found" cases
- Agent transcripts show repeated identical calls
- Server logs contain stack traces but users only see vague text
- Metrics show high tool success rate while product outcomes fail

### Diagnosis workflow

1. Capture one failing agent session with raw MCP messages (request id, method, params, response)
2. Reproduce the same call through the test client with identical arguments
3. Compare channel type: protocol error vs tool result
4. Compare stability of message text across three runs
5. Inspect whether the handler catch block maps known domain errors separately from unknown exceptions
6. Check whether logging middleware swallows the original error after logging

\`\`\`ts
function classifyServerError(err: unknown): {
  channel: 'tool-result-error' | 'protocol-internal';
  publicMessage: string;
  retryable: boolean;
} {
  if (err instanceof NotFoundError) {
    return {
      channel: 'tool-result-error',
      publicMessage: err.message,
      retryable: false,
    };
  }
  if (err instanceof ValidationError) {
    return {
      channel: 'tool-result-error',
      publicMessage: err.message,
      retryable: false,
    };
  }
  if (err instanceof DownstreamTimeoutError) {
    return {
      channel: 'tool-result-error',
      publicMessage: 'Downstream timed out; retry may help',
      retryable: true,
    };
  }
  return {
    channel: 'protocol-internal',
    publicMessage: 'Internal server error',
    retryable: false,
  };
}
\`\`\`

Add a characterization test that feeds each error class into the classifier and asserts channel plus retryable flag. Then add one end-to-end case per class so the wiring cannot regress independently of the classifier unit tests.

## Stabilize messages without coupling to prose churn

Agents and humans both need readable messages, but full-string equality makes tests brittle. Use a layered approach:

| Assertion layer | Example | Stability |
|---|---|---|
| Channel | protocol vs tool-result error | High |
| Error class code | documented code constant | High if versioned |
| Machine token | \`code: RESOURCE_NOT_FOUND\` in data or text | High |
| Required substring | "not found" | Medium |
| Full sentence | exact marketing copy | Low |

Prefer structured \`data\` fields on protocol errors when your stack supports them, and structured text conventions for tool errors (leading error code, then human sentence). Document the convention next to the tool catalog so evaluation harnesses can parse outcomes.

## Cover multi-tool workflows where the second call depends on the first

Single-tool tests miss propagation bugs that appear only when an agent chains tools. Example: \`search_cases\` returns an empty list as a successful result (not an error), then \`update_case\` is called with a hallucinated id and must return a tool-result error without mutation. Another example: first tool succeeds, second tool fails, and the agent must see which step failed.

Write a short scripted multi-call test (not a full LLM loop) that:

1. Calls tool A with fixtures that yield empty-but-valid results
2. Calls tool B with an invalid id derived from a wrong assumption
3. Asserts B's error channel and no side effects
4. Optionally asserts that A did not return \`isError\` for emptiness unless product policy says empty is erroneous

This is still error propagation testing, not agent scoring. You are fixing the rails the agent runs on. Full agent scoring belongs in the companion agentic testing materials linked earlier.

## Put CI gates around propagation contracts

Propagation regressions are release blockers for agent platforms. Wire the suite so it fails builds, not so it only runs nightly.

Recommended CI shape:

1. Unit tests for pure classifiers and mappers on every commit
2. In-process or local-transport MCP client tests on every commit for tools touched by the change
3. Containerized full-server job on main and release branches
4. Artifact upload of failing raw request/response pairs
5. A small "contract pack" job that runs the error matrix for all registered tools nightly

\`\`\`yaml
name: mcp-error-propagation
on:
  pull_request:
  push:
    branches: [main]

jobs:
  propagation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Install dependencies
        run: npm ci
      - name: Run MCP error propagation tests
        run: npm test -- -t 'error propagation'
      - name: Upload MCP traces on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: mcp-error-traces
          path: artifacts/mcp-traces/
\`\`\`

Gate policy examples:

- Any change to tool registration must run the unknown-tool and invalid-params cases
- Any change to a mutating tool must run the no-mutation-on-error case
- Any change to dependency clients must run timeout and 503 mapping cases

If your team installs ready-made QA skills from qaskills.sh with the qaskills CLI, treat those skills as accelerators for harness scaffolding, not as a substitute for product-specific error matrices.

## Compare approaches teams actually use

| Approach | What it proves | Cost | Risk if used alone |
|---|---|---|---|
| Handler unit tests with thrown errors | Domain branches exist | Low | Ignores transport mapping |
| Snapshot of entire error JSON | Accidental shape drift | Low | Brittle, poor signal |
| Client contract matrix by channel | Propagation policy holds | Medium | Needs fixture investment |
| Full agent eval on failures | Recovery quality | High | Noisy, slow root-cause isolation |
| Production log mining only | Real failures eventually | Ops-heavy | Users find bugs first |

The high-leverage default is the client contract matrix plus no-mutation checks, with a thin agent eval sample for critical recovery paths.

## Write public error catalogs next to tool catalogs

Engineers document tools and forget errors. Publish an error catalog with:

- Tool name
- Failure scenario
- Channel
- Stable machine token
- Retry guidance
- Side-effect guarantee

Review that catalog in pull requests the same way you review schema changes. Agents benefit indirectly: better human docs produce better eval fixtures, and better fixtures produce better servers.

## What people get wrong about MCP error testing

**Wrong: treating all failures as exceptions to be wrapped in -32603.** That erases the difference between "the model made a fixable mistake" and "the server is broken." Tool-result errors exist so models can adjust.

**Wrong: returning successful tool results for failures because "the model can read the text."** If the error flag is false or absent, many clients and agent loops treat the call as successful for metrics, caching, and control flow.

**Wrong: asserting only HTTP status codes on a non-HTTP mental model.** MCP may run over stdio or HTTP transports; your assertions should target MCP result semantics, not only transport status.

**Wrong: logging secrets in error messages.** Propagation tests should include a redaction case: force a failure that involved a token and assert the client-visible message does not contain it.

**Wrong: skipping initialize and capability mismatches.** Some of the worst agent failures are session setup failures that never reach tools/call. Include at least one initialize failure and one path that calls tools only after a clean handshake.

## Operational metrics that prove the suite is working

Track these over time:

- Rate of protocol errors vs tool-result errors in staging agent traffic
- Top unknown-tool names (usually agent hallucination or stale catalogs)
- Retry counts after non-retryable tool errors (signal of bad messages or bad agent policy)
- Mutating-tool error rate paired with unexpected state-change alerts
- Time-to-diagnose from failing CI artifact to root-cause commit

When protocol-error rate spikes after a release, you likely shipped a registration or schema break. When tool-result errors spike with stable protocol metrics, you likely shipped domain or dependency issues. That split is only possible if production and tests use the same channel distinctions.

## A concrete end-to-end checklist for each new tool

1. Define success result shape and examples
2. List five failure scenarios with channel decisions
3. Implement classifier mapping for known domain errors
4. Add data-driven client cases for those five scenarios
5. Add no-mutation check if the tool writes
6. Add timeout injection for the primary dependency
7. Add secret-redaction assertion if credentials are involved
8. Record raw traces on failure in CI
9. Update the public error catalog
10. Run one scripted two-tool chain that includes this tool's failure

Ship the tool only when the checklist is green. Schema validation alone is not enough; a perfect schema with collapsed errors still produces unreliable agents.

## Putting the pieces together in a single regression pack

Create a package or test directory named for the concern, not for a framework:

- \`error-matrix.json\` or \`.ts\` data
- \`callToolForTest\` adapter
- per-tool describe blocks
- shared fixtures for users, tenants, and resources
- dependency injectors
- CI job and artifact paths

Keep agent-loop evaluations in a separate job so a flaky model run cannot hide a deterministic propagation regression. Deterministic rails first, probabilistic recovery second.

## Frequently Asked Questions

### Should unknown tool names return tool-result errors so the model can self-correct?

No. Unknown tools are protocol-level problems: the call referenced something the server does not expose. Returning a normal tool result blurs catalog bugs with domain failures and pollutes tool success metrics. Prefer a protocol error the client surfaces clearly, and fix catalog drift or agent tool-selection separately with selection-accuracy evaluations.

### How do I test error propagation if my official SDK hides raw JSON-RPC payloads?

Use the SDK's public error types and result objects as the observation surface, and normalize them in one adapter. You do not need to re-implement the transport to assert channel semantics. If the SDK documents specific error code fields, assert those. If it only exposes messages and an isError-like flag, assert channel plus stable tokens in the message or structured content.

### What is the minimum suite if we only have a day to add coverage?

Protect four cases for each critical tool: unknown tool (global once), happy path, one domain not-found or validation tool-result error, and one no-mutation check on invalid input for every writer. Add timeout mapping for the riskiest dependency. That small pack already catches the failures that cause agent retry storms.

### How is this different from ordinary API error testing?

The dual-channel model is the difference. HTTP APIs usually have one response object with a status code. MCP tool calls distinguish protocol failures from tool-result failures, and agents use that distinction for control flow. Tests must assert the channel, not only a human-readable string, or you will ship servers that look fine in unit tests and still break agent loops.
`,
};
