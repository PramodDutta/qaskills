import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP Search Response Normalization',
  description:
    'MCP search response normalization tests cover missing arrays, default totals, field projection, private data removal, order, JSON text, and API drift.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP search response normalization',
  keywords: [
    'MCP search response normalization',
    'MCP response projection',
    'search result contract test',
    'omit fullDescription field',
    'missing skills array',
    'MCP JSON text result',
    'API response drift',
    'tool output compatibility',
  ],
  relatedSlugs: [
    'mcp-api-timeout-abortcontroller-testing',
    'mcp-search-filter-schema-drift-contract-tests',
    'mcp-package-registry-version-drift-tests',
    'seed-skill-catalog-parser-regression-tests',
  ],
  sources: [
    'https://github.com/modelcontextprotocol/typescript-sdk',
    'https://modelcontextprotocol.io/specification/2025-11-25/schema',
    'https://json-schema.org/draft/2020-12/json-schema-core',
  ],
  content: `
MCP search response normalization turns a changing registry response into a small, stable tool result before an agent receives it. The contract must default missing containers, retain result order, project only approved fields, serialize valid JSON text, and expose malformed field types instead of letting API drift pass unnoticed.

The QASkills MCP server performs this projection in \`normalizeSearchResponse\`, then wraps the object with \`jsonTextResult\`. Its current type annotations accept unknown field values, so the tests must describe projection and defaults without claiming runtime validation already exists. The [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) explains the surrounding tools.

## Why Use MCP Response Projection?

MCP response projection narrows the data an agent sees. The skills API can evolve with timestamps, full Markdown, database identifiers, ranking details, or internal fields, while the tool needs only the values promised for search. A small result reduces accidental coupling and response size.

The current \`SearchSkill\` shape lists \`name\`, \`slug\`, \`description\`, \`author\`, \`qualityScore\`, \`installCount\`, \`testingTypes\`, and \`frameworks\`. Every property is optional and typed as \`unknown\` at the network boundary. The normalizer copies those eight keys for each input skill.

It also returns \`total: response.total ?? 0\` and maps \`response.skills ?? []\`. This handles missing or null top-level values, but it does not prove the values have correct types. An object in \`qualityScore\` will be copied as an object, and a string in \`skills\` will fail when code attempts \`.map\`.

That distinction should guide MCP search response normalization. Projection is a security and compatibility improvement, while validation is a separate guarantee. Tests should lock current safe behavior, expose unsafe shapes, and give a future runtime schema a clear target.

The [MCP TypeScript SDK repository](https://github.com/modelcontextprotocol/typescript-sdk) provides the implementation and examples for registered tool results. QASkills returns text content containing JSON because text is broadly compatible with clients. The object inside that text still needs a documented application contract.

| Input condition | Current normalized result | Contract decision |
| --- | --- | --- |
| \`total\` missing or null | \`total: 0\` | Preserve default |
| \`skills\` missing or null | \`skills: []\` | Preserve default |
| Extra skill property | Property omitted | Preserve projection |
| Approved property missing | Key exists with \`undefined\` before JSON serialization | Test serialized effect |
| Skill field has wrong type | Wrong type is copied | Mark as validation gap |
| \`skills\` is not an array | Mapping throws | Add controlled error expectation |

A useful contract names these details instead of snapshotting one happy payload. When the API changes, reviewers can decide which row needs a new public promise.

## How Do You Build a Search Result Contract Test?

A search result contract test calls the production normalizer with representative network shapes and compares the exact projected object. Use explicit assertions for field keys, defaults, order, and references. A full snapshot is convenient, but it can hide why a field appeared or disappeared.

Start with two distinct skills in a deliberate order. Give each every approved field plus extra values such as \`fullDescription\`, \`createdAt\`, \`email\`, and \`databaseId\`. The normalized result must keep the two skills in order and omit every extra property.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { normalizeSearchResponse } from '../src/search-response';

describe('normalizeSearchResponse', () => {
  it('projects approved fields and preserves API order', () => {
    const response = {
      total: 2,
      skills: [
        {
          name: 'Playwright CLI Browser Automation',
          slug: 'playwright-cli',
          description: 'Browser automation from a command-driven agent workflow.',
          author: 'Pramod',
          qualityScore: 93,
          installCount: 66,
          testingTypes: ['e2e', 'visual', 'accessibility'],
          frameworks: ['playwright'],
          fullDescription: '# Private long body',
          databaseId: 'internal-1',
        },
        {
          name: 'API Contract Validator',
          slug: 'api-contract-validator',
          description: 'Validate API behavior against a declared contract.',
          author: 'The Testing Academy',
          qualityScore: 90,
          installCount: 45,
          testingTypes: ['api'],
          frameworks: [],
          createdAt: '2026-07-25T00:00:00.000Z',
        },
      ],
    };

    expect(normalizeSearchResponse(response)).toEqual({
      total: 2,
      skills: [
        {
          name: 'Playwright CLI Browser Automation',
          slug: 'playwright-cli',
          description: 'Browser automation from a command-driven agent workflow.',
          author: 'Pramod',
          qualityScore: 93,
          installCount: 66,
          testingTypes: ['e2e', 'visual', 'accessibility'],
          frameworks: ['playwright'],
        },
        {
          name: 'API Contract Validator',
          slug: 'api-contract-validator',
          description: 'Validate API behavior against a declared contract.',
          author: 'The Testing Academy',
          qualityScore: 90,
          installCount: 45,
          testingTypes: ['api'],
          frameworks: [],
        },
      ],
    });
  });
});
\`\`\`

This code assumes the helper has moved into an importable module. The current server file keeps it private and starts stdio connection on import. A test can instead capture the search handler through a mocked \`McpServer\`, or a small production refactor can export pure normalization without changing behavior.

Add separate cases, with one owner each for defaults, projection, order, and malformed input. The [tool schema contract testing guide](/blog/tool-schema-contract-testing-guide) provides related advice for keeping protocol assertions narrow.

MCP search response normalization should never sort returned skills because ranking belongs to the API query. A normalizer that sorts by score can quietly undo \`newest\` or \`popular\` requests.

## How Do You Verify the Omit fullDescription Field Rule?

The omit fullDescription field rule appears in two related paths. Search normalization never includes \`fullDescription\` among its selected fields, while \`get_skill\` calls \`omitFullDescription\` to remove the body from a complete metadata object. Both reduce tool output, but they use different helpers.

Test both paths so a refactor cannot add the large Markdown body to search or metadata accidentally. For search, include \`fullDescription\` in an input skill and assert the normalized object lacks the property. For metadata, pass a full object to \`omitFullDescription\` and assert every other property survives.

\`\`\`typescript
it('removes fullDescription without mutating metadata', () => {
  const input = {
    name: 'Playwright CLI Browser Automation',
    slug: 'playwright-cli',
    fullDescription: '# Commands\\nDetailed instructions',
    tags: ['playwright', 'cli'],
  };

  const output = omitFullDescription(input);

  expect(output).toEqual({
    name: 'Playwright CLI Browser Automation',
    slug: 'playwright-cli',
    tags: ['playwright', 'cli'],
  });
  expect(input.fullDescription).toContain('Detailed instructions');
  expect(Object.hasOwn(output, 'fullDescription')).toBe(false);
});
\`\`\`

Property absence matters because JSON omits \`undefined\`, while \`fullDescription: null\` still exposes the field. Use \`Object.hasOwn\` in the object-level test and parse serialized JSON in the tool-level test.

The metadata helper uses object rest syntax, which returns a new shallow object. Nested values keep their references, which is safe here because the helper does not change them. A test should not claim deep cloning.

MCP search response normalization should also exclude fields that could become private later. An allowlist projection is safer than deleting one known field from search results because new API properties stay out by default. The existing normalizer follows that allowlist model for search.

Use the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) page as a realistic detail fixture, but keep test content synthetic and short. Full production Markdown makes unit failures noisy and slows snapshots without increasing contract coverage.

## What Happens with a Missing Skills Array?

A missing skills array becomes an empty array because the normalizer maps \`response.skills ?? []\`. The same result applies when \`skills\` is explicitly \`null\`, even though the TypeScript input type only declares an optional array. Test both because network JSON is not constrained by TypeScript.

An empty input array must also remain empty. These three cases share the same output but represent distinct upstream states: omitted field, null field, and valid no-results response. Decide whether to preserve that distinction because the current contract intentionally does not.

MCP search response normalization defaults a missing or null total to zero. It does not derive total, so two skills with no total still return \`total: 0\`. Record current behavior and decide whether runtime validation should reject that shape or derive a value.

Use nullish checks for numeric defaults so the current expression preserves \`total: 0\`. A regression to \`response.total || 0\` produces the same value for zero, but similar logic could mishandle other valid falsy data. Explicit nullish cases make intent clear.

The risky input is \`skills: "none"\` or \`skills: {}\`. Because a string has no array \`.map\` method, the helper throws a \`TypeError\`. At the registered tool boundary, the handler catches that exception and returns an MCP error result. Test that current path rather than claiming malformed containers normalize to empty.

| Payload fragment | Object-level expectation | Tool-level expectation |
| --- | --- | --- |
| \`{}\` | total 0, empty skills | JSON text success |
| \`{ skills: null }\` | total 0, empty skills | JSON text success |
| \`{ skills: [] }\` | total 0, empty skills | JSON text success |
| \`{ skills: "none" }\` | TypeError during mapping | MCP error result |
| \`{ total: "2", skills: [] }\` | String total retained | Validation-gap test |

The [MCP server contract testing guide](/blog/mcp-server-contract-testing-guide) shows how to distinguish successful text content from \`isError\` results. Keep that protocol assertion around malformed containers.

## How Do You Assert the MCP JSON Text Result?

The MCP JSON text result wraps \`JSON.stringify(value, null, 2)\` inside one text content item. A registered search handler should therefore return \`{ content: [{ type: 'text', text: '...' }] }\` without \`isError\` for a valid API payload.

Parse the returned text before comparing the object. Exact indentation is not usually a public requirement, while valid JSON and projected fields are. Keep one small formatter test if two-space pretty printing matters for human clients.

\`\`\`typescript
it('returns projected search data as valid MCP JSON text', async () => {
  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        total: 1,
        skills: [
          {
            name: 'Playwright CLI Browser Automation',
            slug: 'playwright-cli',
            qualityScore: 93,
            fullDescription: 'large body',
          },
        ],
      }),
      { status: 200 },
    ),
  );

  const result = await invokeSearchTool({ query: 'playwright', limit: 10 });

  expect(result.isError).toBeUndefined();
  expect(result.content).toHaveLength(1);
  expect(result.content[0].type).toBe('text');
  expect(JSON.parse(result.content[0].text)).toEqual({
    total: 1,
    skills: [
      {
        name: 'Playwright CLI Browser Automation',
        slug: 'playwright-cli',
        qualityScore: 93,
      },
    ],
  });
});
\`\`\`

In the actual projected object, approved but absent properties exist with \`undefined\`, then \`JSON.stringify\` removes them. That is why the parsed text above contains only provided approved values. Object-level and serialized-level tests will look different, and both are useful.

The [MCP schema specification](https://modelcontextprotocol.io/specification/2025-11-25/schema) defines content item forms and error signaling. Assert those protocol facts through the SDK-facing handler, while pure helper tests focus on QASkills data.

MCP search response normalization should not return raw objects in a text field through implicit coercion. A value such as \`[object Object]\` is not machine-readable JSON. Parsing the text in tests catches accidental replacement of \`JSON.stringify\`.

## How Should You Simulate API Response Drift?

API response drift tests introduce changes one at a time. Add an extra top-level property, extra skill property, renamed approved field, missing approved field, wrong field type, null container, and non-array container. The expected result should say whether projection, defaulting, or handler error owns each case.

Extra fields should disappear, and \`downloads\` should not silently replace the approved \`installCount\` field. The output will omit install count after serialization, which signals a compatibility break if clients rely on it. A contract test should fail with a focused missing-field message.

Wrong types currently survive projection, so scores and testing types can remain strings in the result. Do not assert that the current code rejects them. Add a test marked as an expected validation gap or introduce a runtime schema in a separate implementation change.

The [JSON Schema core specification](https://json-schema.org/draft/2020-12/json-schema-core) explains how schemas describe object properties, arrays, numbers, and additional-property behavior. A future response schema could use equivalent constraints through Zod, but it should validate the fetched JSON before projection.

Use generated cases to prove unknown keys never appear, while hand-written examples explain compatibility choices. A generator that emits arbitrary cyclic objects cannot pass through JSON and tests a condition the network never produces.

MCP search response normalization also needs order drift. Feed a three-skill array whose scores and names would sort differently, then require identical slug order in output. This catches a tempting "helpful" sort added to the projection layer.

The [QASkills directory](/skills) offers live examples of fields and sort behavior. Use it for exploratory review, but keep release contracts against local fixtures and the route implementation so external data changes do not break CI.

Give each drift case one short name that states the change. Names like lost total or wrong score type make failed rows easy to scan and extend for each API change.

Use a base skill with all eight approved fields, then clone it for each case. Change one field and keep its slug fixed, which gives each failed rule a small and clean diff.

Test null and missing values as two distinct inputs even when output matches. Missing keys can mark old builds, while null keys can come from stored data or new mappers. The same fallback may be safe, but the cause and fix are not the same.

Wrong scalar types need direct checks because JSON accepts them with no parse fault. Set bad field types and confirm the helper copies them, keeping that gap visible until runtime checks block them.

Do not coerce bad values in the normalizer without a clear rule. Turning \`"93"\` into 93 may seem safe, yet it can hide an API fault. A tool error with the field path is often easier to trust. If coercion is needed for old clients, give it a fixed end date and tests.

## How Do You Protect Tool Output Compatibility?

Tool output compatibility begins with a written allowlist and fixture versions. Store one minimal payload, one complete payload, and several malformed payloads. Each fixture should state which API version or code revision it represents and why the expected result is safe.

Do not freeze every optional property forever. If a field is unused, removing it from the tool result may reduce payload size, but MCP clients can still depend on it. Treat removal and type changes as compatibility decisions, not cleanup.

Add these checks before package publication:

1. Call the pure normalizer with missing, empty, complete, extra-field, and malformed payloads.
2. Assert approved property keys, top-level defaults, order preservation, and absence of private fields.
3. Run the captured \`search_skills\` handler with mocked HTTP responses and parse its text content.
4. Require a protocol error result for a malformed skills container rather than an escaped exception.
5. Compare a checked-in public fixture with the packed MCP artifact's behavior.
6. Review any field addition, removal, rename, or type change as a client compatibility event.
7. Link the result to the package version and registry manifest tested in the same release.

The gate should fail on unexplained output differences. It can allow a reviewed change through an updated fixture and release note, but a developer should not refresh snapshots without naming the contract change.

Pair this suite with [MCP API timeout testing](/blog/mcp-api-timeout-abortcontroller-testing) so a fetch failure and a payload failure produce distinct evidence. Transport success does not imply response compatibility.

Keep one public fixture in plain JSON and one test-only builder in TypeScript. Plain JSON shows the wire shape, while the builder makes edge cases quick to write. Both should use fake names and short text that is safe for logs.

When a field change is planned, run old and new fixtures through the same package. The old fixture should still yield the old safe keys during the support window. The new fixture should yield the chosen new keys or a clear error. This gives the release note real test proof.

Check the packed MCP code with one fixture as well. Start the packed server against a local stub because source tests may miss stale built projection code. Parse its text result and keep the stub local so live data cannot change.

MCP search response normalization should also guard the result size. A search list of fifty items must still omit long bodies and unknown keys. You do not need a huge snapshot for this case. Check the item count, key set, and total byte size against a sane test cap.

## Run the Projection Procedure

Start from the current pure behavior and move outward to the protocol boundary. This order makes failures easy to assign and avoids conflating JSON parsing with projection.

1. Extract or capture \`normalizeSearchResponse\`, \`omitFullDescription\`, and \`jsonTextResult\` from production code.
2. Create two ordered complete skills with approved and extra fields, then assert the exact allowlist.
3. Add missing and null top-level fields, retaining the current zero and empty-array defaults.
4. Add wrong field types and a non-array skills value, documenting present permissive and throwing behavior.
5. Invoke the registered search handler, parse its text content, and assert MCP success or error shape.
6. Run the tests against built output so bundling cannot substitute stale helpers.
7. Save fixture and package versions with the release evidence.

Use failures that print the unexpected path and value. "Snapshot changed" forces a reviewer to inspect a large block, while "skills[0].fullDescription escaped projection" names the actual risk.

The [MCP server testing guide](/blog/mcp-server-testing-guide-2026) supplies broader setup for tool registration and client calls. This procedure remains focused on the response object after HTTP success.

## How Do You Keep the Contract Intentionally Small?

Keep the contract intentionally small by adding a field only when an MCP workflow needs it. Search needs enough data to choose a skill, while \`get_skill\` and \`get_skill_content\` provide deeper inspection. Copying the full API row into search duplicates those tools and spends client context.

An allowlist should have an owner and review rule. When the web API adds a property, MCP output should remain unchanged until the tool contract explicitly includes it. This is a feature of projection, not stale data.

Avoid returning the full Markdown body in search. The separate content tool can retrieve it after the agent selects a slug. This staged workflow protects token budgets and reduces exposure of instructions that were not requested.

A small contract still defines runtime types, null behavior, order, and errors with care. The current unknown field types make network assumptions visible; adding validation should produce clear tool errors rather than coercing arbitrary values.

MCP search response normalization should also keep field names stable across package versions. If the product prefers \`weeklyInstalls\` over \`installCount\`, add it through a deliberate version plan. Do not rename a key simply to mirror a database column.

Write the allowlist next to the type so code and review show the same eight fields. A future field addition should change the type, projection, fixture, and release note in one pull request. If one part is absent, the compatibility gate should fail.

Keep error text short and free of the full response body. A field path, expected type, and received type are enough for most fixes. The tool may include the route and request ID when those values are safe. It should not echo full skill text or a user's search query.

## Apply MCP Search Response Normalization

MCP search response normalization is release-ready when missing containers have tested defaults, approved fields form a strict allowlist, private fields stay absent, result order remains unchanged, JSON text parses, and malformed shapes return controlled evidence for each search call made by the current tool set. Current type gaps should remain visible until runtime validation is added, with failed fields naming their path, expected kind, and safe received kind for review.

Place this gate beside the [MCP server contract testing guide](/blog/mcp-server-contract-testing-guide), then browse [QASkills](/skills) for related contract and API skills. The verified [Playwright CLI skill](/skills/Pramod/playwright-cli) can confirm the public skill flow after the agent-facing response contract passes.

## Frequently Asked Questions

### Why not return the complete skills API response?

The API row can hold large Markdown and future values, so projection limits payload size and coupling. Agents can call metadata or content tools after selecting a slug, which keeps discovery focused and makes each contract much easier to evolve.

### Does the current normalizer validate field types?

No. The network-facing fields are typed as \`unknown\`, and the helper copies approved values without runtime parsing. Tests should document that boundary. A future Zod or JSON Schema check can reject wrong types, but articles and test names must not claim that protection already exists.

### Why test both the object and serialized JSON?

Approved missing properties can exist as \`undefined\` on the normalized object and disappear during \`JSON.stringify\`. Object tests verify projection mechanics, while parsed text tests verify what the MCP client receives. Testing only one layer can miss a compatibility change introduced by serialization.

### Should missing total be derived from skills length?

The current helper returns zero when total is missing, even if skills exist. Deriving length would change semantics because total usually describes all matches, not only the current page. Prefer validation or a controlled error over inventing a total that may be incorrect.

### What happens when skills is an object instead of an array?

The current mapping attempts to call \`.map\` and throws a \`TypeError\`. The registered handler catches that error and returns an MCP error result. A runtime response schema could provide a clearer diagnostic, but tests should first preserve controlled protocol behavior.

### How often should response fixtures be reviewed?

Review them whenever the skills API, MCP normalizer, tool schema, or package version changes. Also run the suite against packed output before publication. A quarterly review can remove obsolete fixtures, but compatibility changes should never wait for a calendar audit.
`,
};
