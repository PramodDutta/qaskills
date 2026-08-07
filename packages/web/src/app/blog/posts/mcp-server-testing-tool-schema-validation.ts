import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP Server Testing: A Practical Tool Schema Validation Guide',
  description: 'Master MCP server testing tool schema validation with contract checks, negative cases, client probes, and CI workflows that prevent broken agent calls.',
  date: '2026-08-07',
  category: 'AI Testing',
  content: `
# MCP Server Testing: A Practical Tool Schema Validation Guide

MCP server testing tool schema validation should prove three things: the server advertises an accurate input schema, valid calls reach the handler with intact values, and invalid calls fail predictably without triggering side effects. Test the published tool contract from a client boundary, then test handler behavior separately. This catches the integration failures that unit tests of business logic miss.

The highest-value suite is not a snapshot of a large JSON document. It contains small, intentional cases for required fields, types, enums, nested objects, unknown properties, boundary values, and error responses. It also compares what the server lists with what the handler actually accepts. The workflow below is transport-aware but avoids coupling every assertion to one client implementation.

## Treat the advertised schema as an executable contract

An MCP tool is discovered through metadata that includes its name, description, and input schema. An agent relies on that information before your handler runs. If the schema says a field is optional but the implementation requires it, the model can make a perfectly compliant call that always fails. If the schema accepts a broad string while the handler expects one of three operations, selection and argument generation become needlessly difficult.

Test the contract at two boundaries:

1. Discovery: connect as a client, list tools, and inspect the exact schema sent over the protocol.
2. Invocation: call the tool with representative inputs and observe structured results or protocol errors.

Keep handler unit tests as a third layer. They are faster and better at business rules, but they do not prove registration, serialization, or protocol wiring.

| Layer | What it proves | Defect it catches | What it cannot prove alone |
|---|---|---|---|
| Schema unit check | Intended schema accepts and rejects examples | Missing constraint | Server advertises that schema |
| Protocol contract test | Listed metadata and calls work through a client | Registration or serialization drift | Downstream system correctness |
| Handler unit test | Domain logic handles normalized inputs | Business-rule regression | MCP client compatibility |
| End-to-end test | Real dependency and tool cooperate | Credentials or integration fault | Precise source of every failure |

Use all four selectively. Most pull requests need schema and handler tests. A smaller set of client contract tests should still run on every tool change.

## Inventory every tool field before writing tests

Create a contract inventory that reviewers can read without reverse-engineering schema construction code. For each tool, list required properties, optional properties, defaults applied by the implementation, enumerated values, numeric or string boundaries, nested structures, and side effects. Note whether unknown properties are rejected, ignored, or preserved. Do not assume this behavior, verify it with the validation system actually used by the server.

| Field concern | Inventory question | Useful case |
|---|---|---|
| Required | Must the caller provide it? | Omit only that property |
| Nullability | Is null different from absence? | Send null and omit in separate calls |
| Enumeration | Which exact values are accepted? | One valid and one near-miss value |
| Boundary | Are empty or oversized values valid? | Empty string and maximum realistic input |
| Nesting | Which child fields are required? | Valid parent with missing child |
| Additional data | What happens to unknown keys? | Add a harmless unexpected property |
| Side effect | Can validation failure mutate anything? | Invalid request plus dependency spy |

The inventory becomes the basis of risk review. A read-only lookup tool may tolerate broader input. A tool that changes a test-management record should use a narrow, explicit contract and receive stronger negative testing.

## Capture schemas through a real MCP client

Avoid testing only an exported schema constant. The registered server may publish a transformed version, or a later refactor may wire the wrong schema to the tool name. Start the server in a controlled test process, connect with an MCP client using the transport your product supports, and request the tool list through the official SDK APIs appropriate to your language.

Keep discovery assertions focused on stable contract facts rather than formatting. Object key order is not meaningful. Descriptions may change editorially without breaking clients unless your routing evaluation depends on exact wording.

The pseudocode below illustrates a protocol-level assertion while deliberately leaving transport construction to the server's supported SDK setup:

\`\`\`ts
type ListedTool = {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
};

async function assertListedContract(client: {
  listTools(): Promise<{ tools: ListedTool[] }>;
}) {
  const response = await client.listTools();
  const tool = response.tools.find(item => item.name === 'find_test_case');

  if (!tool) throw new Error('find_test_case was not advertised');
  const required = tool.inputSchema.required as string[] | undefined;
  if (!required?.includes('caseId')) {
    throw new Error('caseId must be advertised as required');
  }
}
\`\`\`

In production code, use the types and connection lifecycle provided by the current official MCP SDK. The purpose here is the assertion pattern, not an invented transport shortcut.

## Validate the schema independently with known examples

Extract or expose the JSON Schema used for tool input and validate a table of examples with a standards-compatible validator. This creates fast feedback and lets you express negative cases compactly. Select a validator and draft supported by your implementation, then keep that choice explicit in project configuration.

Do not silently mutate invalid data during contract validation unless coercion is part of the documented server behavior. Type coercion can turn an agent's number into a string and make tests pass while hiding a client error.

\`\`\`ts
type SchemaCase = {
  label: string;
  input: unknown;
  valid: boolean;
};

const schemaCases: SchemaCase[] = [
  { label: 'minimum valid input', input: { caseId: 'TC-42' }, valid: true },
  { label: 'missing required id', input: {}, valid: false },
  { label: 'number is not an id string', input: { caseId: 42 }, valid: false },
  { label: 'valid optional project', input: { caseId: 'TC-42', project: 'web' }, valid: true }
];

for (const example of schemaCases) {
  const accepted = validateFindTestCaseInput(example.input);
  if (accepted !== example.valid) {
    throw new Error(\`Unexpected result for \${example.label}\`);
  }
}
\`\`\`

Return validator diagnostics in test failures. A generic "expected false" wastes time when a nested required property is the actual issue.

## Design a compact positive matrix

Positive cases confirm more than the smallest object. Cover each documented enum value, representative optional combinations, nested objects, Unicode, and realistic identifiers from your domain. Pairwise combinations often give better value than a Cartesian explosion.

For a hypothetical read-only test lookup tool, a useful matrix might be:

| Case | Input focus | Expected observation |
|---|---|---|
| Minimal | Required case identifier only | Handler receives identifier |
| Optional scope | Identifier plus project | Project narrows lookup |
| Unicode | Non-ASCII project label | Value survives serialization |
| Whitespace | Identifier with documented format | Behavior matches stated policy |
| Full object | Every optional property | No property is dropped |

Avoid asserting that an undocumented input must work simply because the current handler happens to accept it. Tests should defend the public contract, not accidental permissiveness.

## Attack required, typed, and enumerated fields

Negative tests are where schema validation earns its keep. For each required property, omit it while holding everything else valid. For each typed property, try values from neighboring JSON types: string, number, boolean, object, array, and null where relevant. For enums, try different case, leading whitespace, a plausible future value, and a spelling error.

Generate cases carefully so the failure reason remains clear:

\`\`\`ts
const invalidInputs = [
  { label: 'absent operation', value: { caseId: 'TC-7' } },
  { label: 'null operation', value: { caseId: 'TC-7', operation: null } },
  { label: 'wrong case enum', value: { caseId: 'TC-7', operation: 'Read' } },
  { label: 'array id', value: { caseId: ['TC-7'], operation: 'read' } }
];

for (const testCase of invalidInputs) {
  it(\`rejects \${testCase.label}\`, async () => {
    const result = await invokeThroughTestClient('case_operation', testCase.value);
    expect(result.accepted).toBe(false);
    expect(fakeRepository.writes).toHaveLength(0);
  });
}
\`\`\`

The crucial assertion is no write. Error text alone does not prove validation occurred before the handler or downstream dependency.

## Decide and test unknown-property behavior

What people get wrong most often is assuming JSON Schema automatically rejects extra keys. Whether additional properties are allowed depends on the schema and validator behavior. If a mutating tool should accept only documented fields, express and test that restriction. If forward compatibility requires ignoring extra metadata, document and test that policy instead.

Unknown fields matter because agents can hallucinate plausible arguments. A create-test tool might receive both \`priority\` and an unsupported \`severity\`. Silently passing the second field to a downstream API can have unpredictable consequences.

Create three observations: validation result, normalized value delivered to the handler, and downstream request. This reveals whether the field was rejected, stripped, or propagated.

\`\`\`ts
const input = {
  title: 'guest can view catalog',
  priority: 'high',
  severity: 'critical'
};

const result = await invokeThroughTestClient('create_test_case', input);

expect(result.accepted).toBe(false);
expect(handlerSpy).not.toHaveBeenCalled();
expect(testManagementApi.requests).toHaveLength(0);
\`\`\`

Choose the expected outcome from your actual contract. The example represents a strict mutating tool, not a universal MCP rule.

## Probe nested objects and arrays at every depth

Top-level checks can pass while nested values are malformed. If a tool accepts steps, filters, headers, or expected outcomes, test each child object's required keys and types. For arrays, test empty arrays, one item, multiple items, wrong item types, duplicate items if uniqueness matters, and a reasonable large input.

| Nested defect | Example input | Desired test observation |
|---|---|---|
| Missing child | Step has action but no expected result | Rejected before handler |
| Wrong item type | Steps contains a string | Path points to offending item |
| Empty collection | No steps for a procedural test | Accepted or rejected per contract |
| Mixed array | One valid and one invalid step | Entire call rejected atomically |
| Unexpected child | Step includes undocumented command | Explicit reject or strip policy |

Error paths should help operators locate the defect without echoing secrets. Do not lock tests to every word of a validator message, because libraries can legitimately rephrase diagnostics. Assert a stable category and relevant field path if your error mapping exposes them.

## Test string boundaries and encoding

Strings carry subtle integration bugs. Include empty values, whitespace-only values, leading and trailing whitespace, multiline descriptions, emoji, combining characters, quotes, and identifiers near realistic length limits. Schema validation and domain validation have different jobs: a schema can require a non-empty string, while a handler can verify that a referenced case exists.

Be explicit about normalization. If the handler trims identifiers, test the value received after normalization and ensure the discovery description tells callers what format is expected. If titles preserve whitespace, do not accidentally trim them in a shared preprocessing layer.

\`\`\`ts
const titleCases = [
  { label: 'ordinary', title: 'User resets password', accepted: true },
  { label: 'unicode', title: 'Usuário redefine a senha', accepted: true },
  { label: 'empty', title: '', accepted: false },
  { label: 'spaces only', title: '   ', accepted: false }
];

for (const entry of titleCases) {
  const outcome = validateCreateCase({ title: entry.title });
  expect(outcome.ok, entry.label).toBe(entry.accepted);
}
\`\`\`

Do not invent a maximum length just to have a test. Derive boundaries from a documented downstream constraint or a deliberate product decision.

## Verify errors are useful and safe

A rejected call should be distinguishable from a tool execution failure. At the protocol boundary, verify that the client receives the documented form of failure for your SDK and implementation. At the application boundary, preserve a stable internal category such as invalid input, permission denied, dependency unavailable, or not found.

Never return stack traces, access tokens, database statements containing secrets, or whole request objects by default. Tests should inject a recognizable secret-like value and assert that it is absent from logs and client-visible messages. Do not print the value during the test failure either.

| Failure source | Client needs | Operator needs | Avoid |
|---|---|---|---|
| Schema rejection | Field or category to correct | Tool name and trace ID | Raw secret-bearing input |
| Permission | Clear denial | Principal and policy decision | Credential material |
| Dependency | Retry-safe explanation | Downstream status and trace | Internal stack in client text |
| Not found | Resource category | Scoped lookup details | Enumeration of private resources |

Structured error mapping makes agent recovery more reliable. A model can correct a missing field if the response identifies it, but it cannot recover well from "something went wrong."

## Catch schema-handler drift with sentinel values

A common realistic failure occurs after a rename. The advertised schema changes \`testCaseId\` to \`caseId\`, but the handler still reads \`testCaseId\`. Discovery looks correct and schema validation accepts the request, yet the handler queries with undefined. A unit test that calls the handler using its old internal shape may also pass.

Diagnose this with a protocol-level sentinel value. Send \`caseId: 'SCHEMA-SENTINEL-91'\`, spy on the repository boundary, and assert that the exact value arrives. If the call fails, inspect four artifacts in order: listed schema, raw request, post-validation object, and downstream call. The point at which the sentinel disappears identifies the broken adapter.

\`\`\`ts
it('carries the advertised identifier into the repository', async () => {
  fakeRepository.findById.mockResolvedValue({ id: 'SCHEMA-SENTINEL-91' });

  await invokeThroughTestClient('find_test_case', {
    caseId: 'SCHEMA-SENTINEL-91'
  });

  expect(fakeRepository.findById).toHaveBeenCalledWith('SCHEMA-SENTINEL-91');
});
\`\`\`

Sentinels are more diagnostic than generic values like \`123\`, which can be confused with defaults or unrelated fixtures.

## Snapshot selectively, assert semantics directly

Full-schema snapshots are tempting because they are easy to create. They are also noisy. Reordering properties or editing a description can produce a large diff, while a reviewer may miss that a required field disappeared. Use direct assertions for critical semantics and a normalized snapshot only as secondary change visibility.

Normalize object key order before snapshotting if the source can reorder it. Review snapshot updates like API changes. A command that blindly refreshes every snapshot converts a contract test into an approval ritual.

Good direct assertions include:

- The expected tool name exists exactly once.
- Required fields are present in the required set.
- Each enum contains the intended values.
- Mutating tools reject unknown properties when that is policy.
- Descriptions identify side effects and prerequisites.
- Output metadata, when used, matches the documented response contract.

Descriptions influence model routing, so route-sensitive text deserves an evaluation even if it is not byte-for-byte frozen.

## Check compatibility across clients and transports

When a server supports more than one transport or client language, run a compact conformance set through each supported boundary. Keep the semantic cases identical so differences reveal serialization or adapter problems. You do not need the entire negative matrix on every client. A minimal discovery, valid call, invalid call, Unicode value, and server error case often exposes compatibility gaps.

Separate transport lifecycle failures from tool contract failures. Connection startup, shutdown, message framing, and timeouts belong to transport tests. Tool name, schema, arguments, and results belong to tool contract tests. The same failing end-to-end case may touch both, but triage labels should identify the first broken layer.

The broader [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026) places these contracts within model, orchestration, and outcome evaluation. For patterns that connect servers to browser and API workflows, see [MCP servers for test automation](/blog/mcp-servers-test-automation-2026). Together, these layers prevent a server contract failure from being misreported as an agent reasoning failure.

## Isolate dependencies so invalid calls cannot escape

Contract tests should use fakes or controlled test services. The strongest negative test proves that the handler and dependency were never called. For positive cases, record the exact normalized request at the dependency boundary. Reset fakes between cases so one invocation cannot contaminate another.

For a mutating tool, add an idempotent test fixture or transaction rollback in the smaller end-to-end suite. Never aim schema fuzzing at a shared production-like system. Random invalid values can create valid-looking records if a validator bug exists, which is precisely what the test is trying to discover.

Use dependency ports to make isolation visible:

\`\`\`ts
interface TestCaseRepository {
  create(input: { title: string; priority?: string }): Promise<{ id: string }>;
}

class RecordingRepository implements TestCaseRepository {
  readonly calls: Array<{ title: string; priority?: string }> = [];

  async create(input: { title: string; priority?: string }) {
    this.calls.push(input);
    return { id: 'TC-FIXTURE-1' };
  }
}
\`\`\`

This interface is application code, not an MCP SDK API. Its purpose is to make downstream observations deterministic.

## Add controlled property-based testing

Example cases defend known boundaries. Property-based generation can discover combinations you did not anticipate, especially for nested input. Generate JSON values within a bounded size, classify whether they should satisfy the schema, and confirm that invalid values never reach the handler.

Keep generators constrained. Unlimited recursive JSON produces huge, low-value failures. Preserve the random seed and shrunk counterexample in the report so the failure can be reproduced. Add valuable minimized cases to the deterministic regression suite.

Useful properties include:

- Removing any required field from a minimal valid object causes rejection.
- Replacing a string field with a non-string JSON value causes rejection when coercion is disabled.
- Adding an unknown field is rejected for a strict contract.
- Every advertised enum member reaches the handler unchanged.
- No rejected input increments the fake dependency's call count.

Fuzz the parser and validation boundary, not a real external system.

## Gate schema changes in CI

Run fast schema examples, handler tests, and a protocol smoke test on each pull request. If the repository publishes server packages, also compare intentionally versioned contract artifacts or generate a human-readable diff. Require explicit review for removed tools, newly required fields, narrower enums, and changed side-effect descriptions.

\`\`\`yaml
name: mcp-contract

on:
  pull_request:

jobs:
  test-contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run test:mcp-contract
      - run: npm run test:mcp-handler
\`\`\`

The npm script names are project-defined examples. Use scripts that start and stop the test server reliably, enforce a timeout in the runner you actually use, and emit the captured tool list when an assertion fails.

## Review contract evolution as an API change

Adding an optional field is usually easier for clients than making a field required, renaming it, or narrowing accepted values. Still, even an additive tool can affect an agent because a larger catalog changes routing. Contract review should therefore include both schema compatibility and selection behavior.

| Change | Schema compatibility concern | Agent concern | Test response |
|---|---|---|---|
| Add optional field | Usually compatible | Model may start sending it | Positive and omission cases |
| Add required field | Existing calls fail | More argument failures | Migration and negative tests |
| Rename tool | Discovery reference breaks | Routing examples become stale | Old-client and catalog tests |
| Narrow enum | Previously valid calls fail | Recovery may loop | Each removed value tested |
| Edit description | Wire shape unchanged | Selection can change | Routing evaluation |

Do not claim semantic version compatibility unless your project has a published versioning policy. Describe the exact contract change and tested consumer impact.

## A maintainable validation checklist

For every tool, keep one minimal valid call, one fully populated valid call, one missing-required case, one wrong-type case per important property, one unknown-property case, and one downstream sentinel assertion. Add focused cases for enums, nesting, normalization, and permission boundaries. Run discovery through a real client and verify invalid calls have no side effects.

When a defect reaches production, preserve its smallest input and add a neighboring case that generalizes the lesson. If \`null\` bypassed validation, also test absence and the wrong scalar types. If a nested array lost one property, test multiple positions rather than only the original item index.

Schema testing is successful when a listed contract reliably predicts runtime behavior. The server should make valid agent calls easy, invalid calls diagnosable, and unsafe calls inert.

## Frequently Asked Questions

### Should MCP schema tests call the handler directly or use a client?

Use both, for different purposes. Direct handler tests give fast, precise coverage of domain logic and dependency behavior. Client-level tests prove that registration, discovery, serialization, validation, and invocation are wired together. A small protocol contract suite catches field renames and wrong-schema registration that handler tests miss. Keep most combinatorial cases at the schema or handler layer, then run representative valid and invalid examples through the real client boundary.

### Is a full JSON Schema snapshot sufficient for tool validation?

No. A snapshot shows that text changed, but it does not clearly express which semantics matter or prove that calls reach the handler correctly. Use direct assertions for required properties, types, enums, unknown-field policy, and side effects. A normalized snapshot can supplement those assertions for review visibility. Never update snapshots automatically without examining whether the change breaks existing clients or changes how an agent selects and fills the tool.

### How should validation errors be asserted without brittle tests?

Assert stable properties under your control: an invalid-input category, the relevant field path when available, absence of handler calls, absence of downstream writes, and safe client-visible text. Avoid matching an entire third-party validator sentence because wording and punctuation can change. Preserve detailed diagnostics in operator logs with a trace identifier, while testing that credentials and sensitive request values are not leaked to either logs or the client response.

### When should a schema reject unknown properties?

Use a deliberate policy based on risk and compatibility. Strict rejection is often appropriate for mutating tools because hallucinated fields should not reach downstream systems. Read-only or extensible contracts may intentionally ignore or preserve additional metadata. Whatever you choose, document it and test the validation result, normalized handler input, and downstream request. Do not rely on assumptions about a validator's default behavior, because that behavior depends on the schema and validation setup.
`,
};
