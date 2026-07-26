import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP skill metadata redaction testing',
  description:
    'MCP skill metadata redaction testing with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP skill metadata redaction testing',
  keywords: [
    'MCP skill metadata redaction testing',
    'MCP fullDescription removal',
    'skill metadata field allowlist',
    'MCP response data minimization',
    'metadata redaction mutation test',
    'get_skill privacy contract',
  ],
  relatedSlugs: [
    'mcp-search-response-normalization-contract-tests',
    'qaskills-mcp-server-guide',
    'mcp-server-contract-testing-guide',
    'mcp-server-testing-guide-2026',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
    'https://json-schema.org/draft/2020-12/json-schema-core',
  ],
  repoEvidence: [
    'packages/mcp/src/index.ts',
    'packages/web/src/app/api/skills/[id]/route.ts',
    'packages/mcp/package.json',
  ],
  content: `MCP skill metadata redaction testing should feed a frozen API object through the real get_skill handler and compare exact input and output keys. The current contract removes fullDescription, keeps every other field, returns a new top-level object, and leaves its input unchanged. Unknown future fields still pass through today.

## What must MCP skill metadata redaction testing prove?

MCP skill metadata redaction testing must prove exact body removal, safe-field retention, stable tool JSON, and unchanged input state. It must also expose that the current helper omits one named field rather than enforcing a closed allowlist for all future API data.

Start with a fixture that matches every field returned by the skill detail route. Use distinct values, nested lists, booleans, dates, counts, and a body marker that must never appear in \`get_skill\`.

Freeze the fixture deeply before the handler receives it. Any direct mutation then throws, while a full clone saved before the call gives a second immutability check.

The output should be a new top-level object. Its keys should equal the input keys minus \`fullDescription\`, and every retained value should match exactly.

Parse the tool's first text item as JSON. A JavaScript object comparison before serialization can miss fields that JSON drops, changes, or converts.

Search the complete result envelope for the body marker as a leak guard. Then check \`isError\` is absent, because a valid metadata response should be normal tool content.

Use a second fixture with an unknown field such as \`reviewerNote\`. Current code keeps it, which proves the implementation is a denylist of one field rather than an allowlist.

That unknown-field row is a characterization, not privacy approval. If product rules require closed projection, add a desired test that fails until source selects named safe fields.

Do not call \`fullDescription\` a secret by default. It is the full skill body and has a separate content tool, so removal here is a response-size and tool-scope contract with privacy benefits.

The [QASkills MCP page](/mcp) distinguishes metadata and content tools. The [MCP search normalization guide](/blog/mcp-search-response-normalization-contract-tests) shows a true selected-field projection for search results.

The [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) defines tool result content and error shape. QASkills source defines which skill fields enter the metadata result.

MCP skill metadata redaction testing passes when the exact current rule is measured without making a stronger allowlist claim. A test that checks only \`fullDescription === undefined\` is not enough.

## Which repository behavior defines the contract?

The helper in \`packages/mcp/src/index.ts\` accepts a generic JSON object. It destructures \`fullDescription\`, gathers the remaining own enumerable fields into \`rest\`, and returns that rest object.

The local \`void fullDescription\` statement marks the removed value as intentionally unused. It does not erase a field from the original input object.

Object rest creates a new top-level object. Nested arrays or objects are copied by reference inside the same process, so this is a shallow operation rather than a deep clone. The \`get_skill\` handler fetches JSON from \`/api/skills/{encoded slug}\`, calls the helper, and serializes the returned object as indented text content.

If fetch or JSON parsing fails, the handler creates an error result. Redaction tests should keep network success fixed so error wrapping does not hide projection behavior.

The route at \`packages/web/src/app/api/skills/[id]/route.ts\` returns \`fullDescription\` along with id, name, slug, description, version, author, license, repository URL, scores, counts, taxonomies, flags, and dates. That route is the upstream field source for the current fixture. Tests should read its reviewed response contract rather than inventing metadata names from a sample API call.

The MCP helper does not list those safe names. Every upstream field other than \`fullDescription\` survives, including a field added after the MCP package was last reviewed.

This design preserves compatibility but expands exposure by default. A true allowlist would invert that choice and require tests to add each approved field.

The [JSON Schema core specification](https://json-schema.org/draft/2020-12/json-schema-core) supports object property rules that can express a closed metadata contract. It does not change runtime behavior unless QASkills validates against such a schema.

Package evidence in \`packages/mcp/package.json\` names the built entry, SDK range, and Node floor. Handler tests can mock the SDK registration, while one black-box case should still launch the built bin.

The separate \`get_skill_content\` tool returns raw SKILL.md text. Removing the body from metadata does not make content unavailable; it keeps the two tool purposes distinct.

Tool descriptions in source state that \`get_skill\` excludes the full Markdown body. That text, helper behavior, and output test should remain aligned.

Use the [QASkills server guide](/blog/qaskills-mcp-server-guide) for wider tool flow. MCP skill metadata redaction testing stays on input keys, output keys, serialization, and mutation.

## How should QA teams test MCP fullDescription removal?

MCP fullDescription removal should be tested through the registered handler, not through a copied object-rest snippet. Mock the SDK server only to capture the real callback from module registration.

Return a frozen fixture from the mocked fetch response's \`json\` method. This bypasses network serialization and lets the actual private helper receive the object whose identity the test owns.

Stub server \`connect\` so importing the entry does not open stdio. Capture handlers by tool name, then invoke \`get_skill\` with a normal slug.

The fixture needs a body canary that does not appear in any safe field. Search both parsed output and raw tool text for that exact canary.

Compare sorted key arrays. An object equality check can report a large diff, while a key diff identifies a missing safe field or unexpected leak at once.

The code below reaches \`omitFullDescription\` through the actual \`get_skill\` callback in \`packages/mcp/src/index.ts\`. It also proves the input remains deeply equal after the call.

\`\`\`typescript
import { beforeAll, expect, it, vi } from 'vitest';

type ToolHandler = (input: Record<string, unknown>) => Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}>;

const { handlers } = vi.hoisted(() => ({
  handlers: new Map<string, ToolHandler>(),
}));
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class {
    registerTool(name: string, _config: unknown, handler: ToolHandler) {
      handlers.set(name, handler);
    }
    async connect() {}
  },
}));
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const item of Object.values(value as Record<string, unknown>)) deepFreeze(item);
  }
  return value;
}

beforeAll(async () => {
  await import('../src/index');
});

it('removes only fullDescription and does not mutate the API object', async () => {
  const fixture = deepFreeze({
    id: 'skill-1',
    name: 'Metadata fixture',
    slug: 'metadata-fixture',
    description: 'Short public text',
    fullDescription: 'BODY_CANARY_29',
    qualityScore: 91,
    testingTypes: ['contract'],
    verified: true,
  });
  const before = structuredClone(fixture);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fixture,
    }),
  );

  const result = await handlers.get('get_skill')!({ slug: fixture.slug });
  const raw = result.content[0].text;
  const metadata = JSON.parse(raw);

  expect(result.isError).toBeUndefined();
  expect(metadata).toEqual({
    id: 'skill-1',
    name: 'Metadata fixture',
    slug: 'metadata-fixture',
    description: 'Short public text',
    qualityScore: 91,
    testingTypes: ['contract'],
    verified: true,
  });
  expect(raw).not.toContain('BODY_CANARY_29');
  expect(fixture).toEqual(before);
});
\`\`\`

The SDK mock captures registration but does not replace the callback under test. The actual handler still calls the actual omission helper and JSON result wrapper.

Reset module state if the file runs with other registration tests. Since source creates one server at import time, a cached import can leave the handler map empty after mocks reset.

Add a black-box case for the built package once the unit test is stable. Serve the same JSON over loopback HTTP and compare the serialized tool text from a real SDK client.

MCP skill metadata redaction testing should fail when the body key remains with a null or empty value. The contract says the field is absent, not merely blank.

It should also fail when a safe field is lost. Over-broad deletion can satisfy a body-only check while silently breaking agent metadata use.

## Test matrix for skill metadata field allowlist

A skill metadata field allowlist matrix must distinguish current one-field omission from a desired closed projection. The expected result should state which rule each row tests.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
| --- | --- | --- | --- | --- |
| Full body present | Unique body canary string | Key and canary absent from tool text | Body key remains, even as null | \`packages/mcp/src/index.ts\` |
| All route metadata | Every current detail response field | All fields except body retain exact values | Safe field disappears or changes | \`packages/web/src/app/api/skills/[id]/route.ts\` |
| Frozen source | Deep-frozen fixture and saved clone | Handler returns without changing source | Throw or changed input key | metadata redaction mutation test |
| New top-level object | Owned source object | Output is not the same top object | Helper returns or edits source | MCP fullDescription removal |
| Nested value | Frozen taxonomy arrays | Values serialize with exact list order | Nested data changes | \`packages/mcp/src/index.ts\` |
| Unknown upstream field | \`reviewerNote\` on response | Current helper keeps the field | Test calls current code a closed allowlist | skill metadata field allowlist |
| Desired closed schema | Unknown field plus approved fields | Future policy would reject or omit unknown | Desired check passes before code changes | JSON Schema core |
| Missing body | API object has no \`fullDescription\` | Other fields still return normally | Handler errors on absent key | get_skill privacy contract |
| API error | Non-success response | Error result has no fake metadata | Empty normal object hides failure | MCP tools specification |

The full-body row checks both key and value. A body canary guards against accidental copying under a renamed field or nested wrapper.

The all-fields row should derive its fixture keys from reviewed route source. Keep the expected list explicit so every API addition prompts an MCP exposure decision.

The frozen row catches direct writes, deletes, and nested edits. The current helper should pass because object rest reads values without mutating them.

The new-object row is easiest in a direct helper test. Through JSON tool text, object identity no longer exists, so do not pretend serialization can prove it.

The unknown-field row is the key design check. It should pass as a current characterization while a separate desired allowlist check remains red until implementation changes.

The [MCP server testing guide](/blog/mcp-server-testing-guide-2026) can track desired contract work. Keep current and desired assertions in different test names to avoid accepting either output.

MCP skill metadata redaction testing needs exact field ownership. API teams own response additions, and MCP teams own whether those additions reach tool consumers.

## What failures expose MCP response data minimization?

MCP response data minimization fails when the full body, its unique canary, or another rejected field appears anywhere in the metadata tool result. It also fails when approved fields vanish without a contract change.

Search raw text as well as parsed keys. A serializer bug could move body text into another string even when the original property name is absent.

Use a body canary long enough to be unique but safe to print. Do not place real skill content or user data in this fixture.

Inspect the error envelope separately. A failed API call should return \`isError: true\`, not an empty object that looks like successful redaction.

Unknown fields create a policy decision rather than an automatic current failure. Record them in output today and route them to review before calling the design a true allowlist.

If a field is approved, add it to the explicit expected key list. If it is not approved, a closed projection change is needed because one-field omission will retain it.

Dates deserve stable fixtures. Use fixed ISO text from the mocked API so JSON output does not depend on timezone or database object conversion.

Lists need order checks because the helper preserves their references and JSON order. Sorting in a test would hide a changed upstream value.

Counts and booleans should remain their original JSON types. String conversion may look readable but breaks callers and must fail exact equality.

Do not use snapshots alone. A snapshot update can approve a leaked body or unknown field without forcing the reviewer to state why it is safe.

MCP skill metadata redaction testing should print added and removed key sets on failure. Small key diffs are safer and faster to review than complete metadata dumps.

The [MCP contract testing guide](/blog/mcp-server-contract-testing-guide) can host shared envelope checks. Keep body canaries and approved keys local to this privacy-focused suite.

## CI coverage for metadata redaction mutation test

A metadata redaction mutation test should run at handler level on every MCP source change and at package level before release. Both jobs use synthetic frozen data.

The handler test is fast and gives direct key and mutation diffs. The package test proves fetch, registration, result wrapping, and JSON text still apply the same rule.

Build \`@qaskills/mcp\` before the package case. Save its version from \`packages/mcp/package.json\` so stale output is visible.

Use a loopback API for the package case and disable telemetry. Metadata reads should create one GET and no install or tracking calls.

Give each worker a new port. A response from another test can contain the wrong field set yet still parse as valid metadata.

Run one source-fixture drift check against the web route. It should compare the current detail response keys with the approved MCP expectation and flag additions for review.

That drift check should not auto-approve fields. Its purpose is to stop silent pass-through when the upstream route grows.

Keep body canaries synthetic and short. Failed logs should name the leaked key and canary match without printing a full Markdown body.

Block release for body leakage, changed safe values, source mutation, normal output on API error, or unreviewed route fields. Each failure has a clear owner.

An unknown field can be a warning under current behavior or a failure under an adopted closed policy. Encode that choice in separate named gates.

Run on the minimum Node major from the package manifest. Object rest and JSON are stable features, but the package support floor still belongs in release proof.

The [getting started page](/getting-started) gives local commands for users. CI should call the workspace build and focused tests directly rather than scrape guide text.

MCP skill metadata redaction testing should never use production records. Synthetic objects give full key control and prevent real body text from entering artifacts.

## How should get_skill privacy contract be asserted?

The get_skill privacy contract should assert one exact output set, one absent body canary, one unchanged source clone, and one unknown-field characterization. These checks cover both present code and future drift.

Define approved current keys from \`packages/web/src/app/api/skills/[id]/route.ts\`. Compare sorted arrays so additions and removals appear as small readable diffs.

For source state, deep-freeze before calling and deep-compare afterward. A new top-level result alone does not prove nested input stayed unchanged.

The current helper does not mutate nested values, but it does share their references in memory. If a caller later edits the returned nested array before serialization, the source array would also change.

In the current handler, serialization happens at once, so no tool consumer receives those live references. A direct unit test should still document the shallow-copy fact.

The negative example below uses the captured real handler to show that an unknown field survives. It turns an easy-to-miss design limit into an exact regression result.

\`\`\`typescript
it('shows that current redaction is not a closed field allowlist', async () => {
  const fixture = Object.freeze({
    id: 'skill-2',
    slug: 'future-field-fixture',
    name: 'Future field fixture',
    description: 'Safe public summary',
    fullDescription: 'BODY_CANARY_UNKNOWN_FIELD',
    reviewerNote: 'NOT_APPROVED_BY_TEST_POLICY',
  });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fixture,
    }),
  );

  const result = await handlers.get('get_skill')!({ slug: fixture.slug });
  const metadata = JSON.parse(result.content[0].text);

  expect(metadata).not.toHaveProperty('fullDescription');
  expect(metadata).toHaveProperty('reviewerNote', 'NOT_APPROVED_BY_TEST_POLICY');

  const approvedKeys = ['description', 'id', 'name', 'slug'];
  const unexpected = Object.keys(metadata)
    .filter((key) => !approvedKeys.includes(key))
    .sort();
  expect(unexpected).toEqual(['reviewerNote']);
});
\`\`\`

The last assertion describes the present gap without accepting the field as safe. A future closed projection should change the expected output and remove \`reviewerNote\`.

Do not add the unknown key to approved keys just to make a desired test green. Approval needs a product decision tied to field meaning and consumer need.

If a JSON Schema is adopted, set explicit properties and a closed unknown-field rule, then validate both route fixtures and MCP output. Keep behavior assertions even after schema validation.

Check \`get_skill_content\` separately. Its purpose is to return the body, so applying the metadata canary rule to that tool would be a scope error.

MCP skill metadata redaction testing should state what is removed, what is retained, what is copied, and what remains an open policy choice. Clear boundaries prevent false privacy claims.

## Step-by-step test implementation

Implement MCP skill metadata redaction testing in six steps. Keep current behavior and desired allowlist policy visible as separate results.

1. Read \`packages/mcp/src/index.ts\`, \`packages/web/src/app/api/skills/[id]/route.ts\`, and \`packages/mcp/package.json\`; list upstream keys, removed body, tool wrapper, and package entry while marking which facts are current behavior or desired policy, then record each reviewed field type and owner without using live response data.
2. Build a deep-frozen synthetic detail object with every current field, distinct typed values, fixed dates, nested lists, and a unique body canary that appears nowhere else in the fixture, plus a saved clone and sorted key list for clean before-and-after checks.
3. Mock SDK registration to capture the real \`get_skill\` handler, return the owned fixture from fetch, and parse its exact JSON text result without exporting or copying the private helper, while keeping connect, network status, and result wrapping on their real source path.
4. Assert key subtraction, all safe values, absent body and canary, normal result shape, new top-level output where observable, and unchanged source data through both freeze and saved-clone checks, then report added, removed, and changed fields as three distinct synthetic key sets.
5. Add missing-body, API-error, nested-value, unknown-field, route-drift, and desired closed-schema cases without allowing either policy outcome or approving a new key through a snapshot update, and prove each injected edge ran before its output is judged or stored, with the original fixture clone and sorted approved key set kept beside that one case.
6. Run handler and built-package checks in CI, retain only key diffs and synthetic markers, and require review for every new upstream field before it becomes accepted MCP output, with package version, route revision, client result type, and failed policy name in the report, then repeat the exact failed field through unit and black-box paths before changing the approved contract, and compare the frozen source clone, sorted output keys, raw tool text, error flag, API request, and package entry in that same clean run without a stale fixture, hidden retry, or skipped path.

Step one ties fixture design to source. The route supplies the candidate fields, while the MCP helper supplies the current removal rule.

Step two makes each changed type visible. Repeated blank strings cannot prove that the right field survived.

Step three reaches private code through its public tool registration and follows the [search normalization contract](/blog/mcp-search-response-normalization-contract-tests) for result parsing. It avoids exporting a helper solely for tests while preserving actual handler logic.

Step four checks loss and excess together. Safe-field retention matters just as much as body removal for a stable metadata tool.

Step five exposes the denylist design. Keep desired closed projection red until implementation and product policy agree.

Step six limits artifact risk. Key names and fake markers are enough to diagnose projection without storing full content.

Use the [skills directory](/skills) to inspect public field use, but do not infer API approval from page display alone. The reviewed contract should name each retained field.

MCP skill metadata redaction testing needs a review link whenever the route adds data. Silent compatibility is not the same as reviewed minimization.

## Failure triage and regression ownership

Begin with the raw API fixture and parsed tool keys. Their set difference shows whether the body leaked, a safe field vanished, or an unknown field passed through.

If \`fullDescription\` remains, inspect whether the handler still calls the omission helper before \`jsonTextResult\`. Also check exact key spelling from the API.

If the key is absent but the canary remains, search other output fields and wrappers. A renamed or copied body is still a leak.

If safe fields vanish, compare the current route response with the test's approved list. Decide whether source changed or redaction became too broad.

If the frozen fixture throws, retain the attempted operation stack. The helper should read and copy, not delete from its input.

If the source clone changes without a throw, inspect nested references and any code added between omission and serialization. Shallow copies do not shield later nested edits.

If an unknown field appears, route it to API and MCP reviewers. Under current code that pass-through is expected, but its approval status is not automatic.

If API errors yield empty normal metadata, inspect fetch status handling. Error wrapping must remain distinct from successful redaction.

If unit tests pass but the built package leaks, check stale build output, package resolution, and whether the black-box test launched the intended bin. If only one Node version fails, compare module mocking and object enumeration before changing the field contract. Key order can differ in logs, so compare sorted sets where order has no meaning.

The [QASkills blog](/blog) links search projection, API, and MCP checks for each owner. Attach key diffs rather than full fixture JSON to the issue.

Close a redaction defect only after full-field, unknown-field, and API-error rows pass together. Fixing one body check must not hide safe data loss or silent failure. MCP skill metadata redaction testing gives a precise current statement: remove one full body, preserve the rest, mutate nothing, and review every new field.

## Frequently Asked Questions

### What must MCP skill metadata redaction testing assert?

Assert the exact input keys, output keys, parsed values, body canary absence, normal tool envelope, and unchanged frozen source. Add an unknown field to show whether the rule is closed. These checks detect body leakage, safe-field loss, source mutation, serialization drift, and unreviewed upstream expansion.

### How should MCP fullDescription removal be verified?

Place a unique synthetic canary in \`fullDescription\`, invoke the real registered get_skill handler, and parse its text result. Require the key and canary to be absent everywhere, while every approved metadata value remains exact. A null or empty body field does not satisfy an absent-field contract.

### Does the current code implement a skill metadata field allowlist?

No. The helper destructures one named field and returns all remaining enumerable fields. An unknown upstream key therefore survives today. A true allowlist would select approved names or enforce a closed schema, and its desired test should remain separate until code and product policy adopt that rule.

### What does MCP response data minimization protect?

It keeps the full Markdown body out of the metadata tool, reduces response size, and limits data sent when only summary fields are needed. It does not prove every retained field is safe, and it does not remove content from get_skill_content, whose stated purpose is returning raw SKILL.md text.

### Why use a metadata redaction mutation test?

Deleting \`fullDescription\` directly from the fetched object could affect other code that still owns that object. A deep-frozen fixture and saved clone prove the handler reads and copies without mutation. A direct helper check can also document that nested values remain shallow shared references before serialization.

### What belongs in the get_skill privacy contract?

Name the removed field, approved retained fields, error shape, serialization format, source immutability rule, and policy for unknown future keys. Keep body-content access under get_skill_content. This split lets reviewers judge route additions and MCP output without claiming a one-field denylist is a closed privacy schema.

## Conclusion

MCP skill metadata redaction testing must prove exact body omission, safe-field retention, JSON output, and unchanged input while exposing unknown-field pass-through. The current helper is a shallow one-field denylist, so closed projection remains a separate policy and code change.

Review the [QASkills MCP integration](/mcp), then browse verified QA agent [skills](/skills) and apply this test matrix before the next MCP release. Use the [blog index](/blog) for related response and API contract tests.`,
};
