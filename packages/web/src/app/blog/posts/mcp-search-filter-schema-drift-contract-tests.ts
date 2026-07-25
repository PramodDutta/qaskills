import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP Search Filter Schema Drift',
  description:
    'MCP search filter schema drift tests compare tool and API sort values, defaults, parameter names, limits, query encoding, and release compatibility.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP search filter schema drift',
  keywords: [
    'MCP search filter schema drift',
    'MCP search schema contract',
    'MCP sort value mismatch',
    'Zod schema parity test',
    'tool API parameter drift',
    'MCP default limit test',
    'search query encoding',
    'MCP compatibility gate',
  ],
  relatedSlugs: [
    'mcp-api-timeout-abortcontroller-testing',
    'mcp-search-response-normalization-contract-tests',
    'mcp-package-registry-version-drift-tests',
    'seed-skill-catalog-parser-regression-tests',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/schema',
    'https://zod.dev/basics',
    'https://json-schema.org/draft/2020-12/json-schema-core',
  ],
  content: `
MCP search filter schema drift occurs when the search tool, shared validator, and HTTP route disagree about accepted names, values, defaults, or cardinality. A release contract should enumerate each surface, translate deliberate aliases, and fail whenever an unmatched option can reach users before the package is published.

QASkills currently has a concrete test target: the MCP tool accepts \`quality\` and \`popular\`, while the shared search schema names \`highest_quality\` and \`most_installed\`. The web route presently accepts both pairs, so clients work, but the independent definitions can diverge silently. Read the [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) for the full tool design before applying this focused contract.

## What Is an MCP Search Schema Contract?

An MCP search schema contract defines the values an agent may submit and the exact HTTP request the server will generate. It includes optional text, filter names, allowed sort labels, numeric limits, defaults, repeated-value behavior, and output expectations. Documentation alone does not enforce any of these facts.

The MCP \`search_skills\` registration uses Zod fields for \`query\`, \`testingType\`, \`framework\`, \`language\`, \`agent\`, \`sort\`, and \`limit\`. Its sort enum is \`trending | newest | quality | popular\`, and its limit defaults to 10 with a range from 1 through 50. Those choices are part of the tool surface exposed to MCP clients.

The shared \`skillSearchSchema\` uses plural array properties such as \`testingTypes\`, \`frameworks\`, and \`languages\`. Its sort enum is \`trending | most_installed | newest | highest_quality\`, while pagination uses \`page\` and \`pageSize\` up to 100. That schema models a broader application query, not the exact MCP input.

The web route reads HTTP query parameters directly. It expects \`q\`, repeated singular names such as \`testingType\`, \`framework\`, and \`language\`, plus \`sort\`, \`page\`, and \`limit\`. It intentionally handles both sort naming pairs in its switch today. MCP search filter schema drift remains possible because no generated link forces those three contracts to change together.

The [MCP schema specification](https://modelcontextprotocol.io/specification/2025-11-25/schema) defines the protocol structures around tool inputs and results. It does not decide the business vocabulary for QASkills. Your contract suite must own that vocabulary and document where translation is deliberate.

| Surface | Current filter shape | Current sort labels | Current default |
| --- | --- | --- | --- |
| MCP tool input | Singular optional strings | trending, newest, quality, popular | limit 10 |
| Shared Zod search | Optional string arrays | trending, newest, highest_quality, most_installed | no page size default |
| HTTP route | Repeated singular query keys | accepts both label pairs | limit 20 |
| Public client result | One URL request | route selects database order | route pagination |

This table does not say every difference is a bug. It identifies decisions that need explicit adapters and tests. A schema contract distinguishes supported translation from accidental mismatch.

## How Do You Detect an MCP Sort Value Mismatch?

An MCP sort value mismatch appears when one layer accepts a label another rejects or interprets differently. The fastest detector builds a matrix from each enum, sends every tool value through the URL builder, and parses every shared value through its own schema. The matrix then checks a declared mapping.

For current QASkills behavior, \`quality\` maps to the route's quality-score order and \`popular\` maps to install-count order. The route also accepts \`highest_quality\` and \`most_installed\`, which align with the shared schema. That compatibility is real, but it lives in a switch statement rather than one exported map.

Do not write a test that simply expects all three enum sets to be identical. Their names and limits may differ by design because the MCP surface is concise. Instead, demand that every accepted source value has one target meaning and that no target meaning is unreachable.

\`\`\`typescript
const MCP_SORTS = ['trending', 'newest', 'quality', 'popular'] as const;
const SHARED_SORTS = [
  'trending',
  'newest',
  'highest_quality',
  'most_installed',
] as const;

const SORT_MEANING = {
  trending: 'weeklyInstalls',
  newest: 'createdAt',
  quality: 'qualityScore',
  highest_quality: 'qualityScore',
  popular: 'installCount',
  most_installed: 'installCount',
} as const;

it('maps every MCP and shared sort to a route meaning', () => {
  for (const sort of [...MCP_SORTS, ...SHARED_SORTS]) {
    expect(SORT_MEANING[sort]).toBeDefined();
  }

  expect(SORT_MEANING.quality).toBe(SORT_MEANING.highest_quality);
  expect(SORT_MEANING.popular).toBe(SORT_MEANING.most_installed);
});
\`\`\`

This test documents current aliases without claiming the schemas already share one definition. A stronger route test seeds skills with distinct dates, quality, installs, and weekly installs, then requests each label and compares ordered IDs. That proves meaning rather than only spelling.

MCP search filter schema drift can also reverse meaning through a refactor. A typo that sends \`popular\` into weekly installs would pass a set-membership test but fail the seeded-order test. Keep both checks because they diagnose different defects.

The [tool schema contract testing guide](/blog/tool-schema-contract-testing-guide) adds protocol-level cases for input rejection. Use it beside this QASkills-specific sort matrix rather than replacing the matrix with a generic snapshot.

## How Do You Build a Zod Schema Parity Test?

A Zod schema parity test compares accepted domains after normalization. It should not reach into unstable private fields of a Zod object if a public parsing table can express the same contract. Give each candidate value to each relevant schema, record success, and compare results with the declared adapter.

The [Zod basics documentation](https://zod.dev/basics) recommends parsing untrusted input through schemas and using \`safeParse\` when code needs a structured success result. For contract tests, \`safeParse\` lets a data table show which layer accepted each value without throwing before the full matrix runs.

The MCP registration embeds its Zod enum inline, which makes direct reuse hard. Capture the \`inputSchema\` passed to a mocked \`registerTool\`, or extract the schema into an exported constant in a separate change. Do not duplicate it in the test and then congratulate two duplicated arrays for matching.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { skillSearchSchema } from '@qaskills/shared';
import { searchSkillsInputSchema } from '../src/search-schema';

const cases = [
  ['trending', 'trending'],
  ['newest', 'newest'],
  ['quality', 'highest_quality'],
  ['popular', 'most_installed'],
] as const;

describe('search sort schema parity', () => {
  it.each(cases)('maps MCP %s to shared %s', (mcpSort, sharedSort) => {
    expect(searchSkillsInputSchema.safeParse({ sort: mcpSort }).success).toBe(true);
    expect(skillSearchSchema.safeParse({ sort: sharedSort }).success).toBe(true);
  });

  it('rejects an unknown sort at both boundaries', () => {
    expect(searchSkillsInputSchema.safeParse({ sort: 'stars' }).success).toBe(false);
    expect(skillSearchSchema.safeParse({ sort: 'stars' }).success).toBe(false);
  });
});
\`\`\`

If the production code has not extracted \`searchSkillsInputSchema\`, treat that import as the target design for testability, not a claim about the current file. The present tool registration can be captured by mocking the SDK constructor and recording \`registerTool\` calls.

Also compare bounds and optionality, since the MCP limit permits 1 through 50 and defaults to 10. The shared page size permits 1 through 100 but has no default. A parity report should label that as an intentional channel policy or a mismatch needing one source of truth.

The [JSON Schema core specification](https://json-schema.org/draft/2020-12/json-schema-core) provides the vocabulary used by many tool descriptions. When the MCP SDK converts Zod definitions, add one assertion against the emitted JSON Schema so runtime parsing and advertised constraints do not separate.

## Where Does Tool API Parameter Drift Appear?

Tool API parameter drift appears between friendly tool names and wire-level query keys. The MCP handler destructures \`query\`, then sends it as \`q\`. It forwards \`testingType\`, \`framework\`, \`language\`, \`agent\`, \`sort\`, and \`limit\` without renaming. The route reads those singular names.

The shared schema instead says \`testingTypes\`, \`frameworks\`, \`languages\`, \`domains\`, \`agents\`, and \`pageSize\`. That is acceptable only if callers know which schema applies to which boundary. Reusing the shared type directly for the MCP handler would change cardinality and names.

Create a table-driven URL assertion for every MCP field. Supply one value at a time, invoke the captured handler, and inspect the URL received by mocked fetch. Then supply all fields together to catch a builder that overwrites an earlier parameter.

| Tool input | HTTP key | Cardinality | Required check |
| --- | --- | --- | --- |
| query | q | One string | Text is encoded once |
| testingType | testingType | One string | Route receives the exact filter |
| framework | framework | One string | No plural rewrite |
| language | language | One string | Empty value is omitted |
| agent | agent | One string | Hyphens remain encoded safely |
| sort | sort | One enum | Meaning matches route alias |
| limit | limit | One integer | Bounds and default remain valid |

MCP search filter schema drift is especially likely when web features add multi-select filters. The HTTP route supports repeated keys, while the MCP tool accepts only one value per category. Decide whether the tool intentionally remains single-select. If it should become multi-select, version the input carefully because string-to-array changes affect existing clients.

The [MCP server contract testing guide](/blog/mcp-server-contract-testing-guide) shows how to capture registered handlers and assert tool responses. Extend that harness with fetch URL capture instead of constructing a second imitation of the handler.

## How Do You Add an MCP Default Limit Test?

An MCP default limit test invokes the handler without \`limit\` and expects the generated URL to include \`limit=10\`. Zod applies the default before the handler receives arguments when the SDK validates input. A direct call to an unwrapped handler may not reproduce that step, so test both schema parsing and registered execution.

The HTTP route defaults to 20 when no limit exists and clamps values to 1 through 100. The MCP tool's default of 10 and maximum of 50 are stricter channel choices. They are not currently harmful, but they must remain deliberate. A refactor that drops \`limit=10\` changes result size from 10 to 20.

Add boundaries for 1, 50, 0, 51, fractional values, and numeric strings. The MCP Zod schema accepts numbers, not strings, and it does not call \`.int()\` in the present registration. That means a value such as 1.5 may pass the MCP schema even though the route parses it with \`parseInt\` and effectively uses 1.

That fractional case is a valuable MCP search filter schema drift test target. Decide whether limits must be integers, then encode the choice with \`.int()\` and a failing-before-fix regression. Do not write documentation that claims integer enforcement while the current schema only enforces numeric range.

Also verify zero is rejected before any fetch. Protocol input errors should not become API calls with a clamped limit because the MCP schema owns its advertised bound. A fetch spy with zero calls makes that distinction visible.

When changing defaults, capture compatibility impact in release notes. A smaller limit changes token use and result recall, while a larger limit changes response size. The [QASkills directory](/skills) helps reviewers inspect real result density before approving a new default.

## How Should Search Query Encoding Work?

Search query encoding should use the \`URL\` and \`URLSearchParams\` APIs exactly once. The QASkills \`buildUrl\` helper sets each non-empty value through \`url.searchParams.set\`, which handles spaces, ampersands, slashes, Unicode text, and reserved characters without manual concatenation.

Test semantic values by parsing the captured URL, not by demanding one serialized representation. A space may appear as \`+\` in a query string, yet \`searchParams.get('q')\` should recover the original text. This avoids tying the suite to harmless encoding details.

\`\`\`typescript
it.each([
  ['playwright & accessibility', 'playwright & accessibility'],
  ['api/security', 'api/security'],
  ['C++ tests', 'C++ tests'],
  ['cafe', 'cafe'],
])('encodes and recovers query %s', async (query, expected) => {
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ total: 0, skills: [] }), { status: 200 }),
  );

  await invokeSearchTool({ query, limit: 10 });

  const requested = new URL(String(mockFetch.mock.calls[0][0]));
  expect(requested.searchParams.get('q')).toBe(expected);
  expect(requested.searchParams.get('limit')).toBe('10');
});
\`\`\`

Add an empty-string case because \`buildUrl\` omits \`''\`, so an empty query should not produce \`q=\`. That behavior is useful for clean cache keys, but it should be explicit. Whitespace-only text is not empty under the present check and will be included.

MCP search filter schema drift can hide in parameter casing as well. A future rename from \`testingType\` to \`testing_type\` can compile if both sides use plain strings. URL assertions against the actual route parser catch that defect before users see empty search results.

Do not test encoding through an external request. A local fetch spy proves exact generated parameters, while route integration tests prove decoding and filter application. Keeping the layers separate makes failures easier to locate.

## How Do You Create an MCP Compatibility Gate?

An MCP compatibility gate combines schema-domain, adapter, URL, and route-meaning tests. It runs before npm packaging and before registry publication. Any new input value needs a declared route mapping and at least one result-order assertion.

The gate should produce a compact mismatch report. List source surface, value, expected meaning, actual acceptance, and repair owner. A plain snapshot diff can show changed JSON without explaining whether the change breaks a client.

Build the report from plain rows so both tests and CI can read it. Each row should name one tool field and one wire key. Add the shared field only when that schema owns the same idea. A blank shared field is valid when the MCP tool has a channel-only rule.

For sort rows, store the database field that gives each label its meaning. The two quality labels must name \`qualityScore\`, while both install labels must name \`installCount\`. This makes a changed route branch easy to spot. It also stops a spelling check from masking a wrong order.

For filter rows, store whether the route may receive one value or many values. The MCP tool sends one value today, while the web route can read repeated keys. Mark that gap as a product choice in the report. A future array field then needs a clear review instead of a silent type change.

Use these gate rules:

1. Extract accepted MCP values from the production registration or one exported production schema.
2. Enumerate shared search values by parsing a maintained candidate set through \`skillSearchSchema\`.
3. Require one explicit meaning for every accepted sort label and reject undeclared aliases.
4. Capture URLs for every parameter, including defaults, bounds, empty values, and reserved characters.
5. Seed route data that yields distinct orders, then compare aliases by returned skill IDs.
6. Build the package and inspect its emitted tool schema before the publish job can start.
7. Save the compatibility report with package and registry version evidence.

The gate must not automatically delete older labels to make sets equal. Existing MCP clients may still send \`quality\` or \`popular\`. Add new aliases first, observe usage if available, and remove old vocabulary only through a versioned compatibility decision.

The verified [Playwright CLI skill](/skills/Pramod/playwright-cli) can add browser evidence for web search controls, but it does not replace this MCP contract. Browser labels and tool labels can differ while mapping to the same route behavior.

Add one route test that sends no sort at all. It should prove the route uses weekly installs and not the first enum value by chance. Add a second case with an explicit bad label. That case should record current fallback behavior and support a later fix that rejects bad input.

Keep these tests close to the route, not inside a mock of the route switch. Seed four rows where each sort field picks a different first skill. If two rows tie, the test may pass for the wrong cause. Use clear values so the expected order is easy to read.

## Run the Schema Procedure

Begin with current facts rather than an idealized shared enum. Capture all three surfaces, mark intentional differences, and make the present web aliases executable evidence.

1. Record MCP field names, enum values, bounds, and defaults from the registered \`search_skills\` tool.
2. Record shared Zod names and values from \`skillSearchSchema\`, including plural arrays and page-size rules.
3. Record query keys, default limit, accepted aliases, and order columns from the web route.
4. Build a declared adapter table for different spellings that share one product meaning.
5. Add schema, URL, and seeded-route tests, then require all rows in the adapter table to pass.
6. Test an unknown sort, unknown parameter, fractional limit, empty filter, and reserved query text.
7. Add the suite to MCP build and publish workflows so drift blocks release before artifacts leave CI.

Run the focused tests whenever the MCP entry point, shared schemas, or skills API route changes. Path filters in CI should include all three areas, not only \`packages/mcp\`. Otherwise a web-only change can create MCP search filter schema drift without starting the contract gate.

For broader protocol validation, pair this procedure with [MCP server testing](/blog/mcp-server-testing-guide-2026). The schema suite owns QASkills vocabulary, while protocol tests own correct MCP requests and results.

## How Do You Repair Drift Without Breaking Clients?

Repair drift by adding a compatibility mapping before narrowing accepted input. Today the web route accepts both \`quality\` and \`highest_quality\`, plus \`popular\` and \`most_installed\`. That gives the project room to choose one canonical vocabulary while retaining older clients.

Move mappings into one exported module shared by the MCP adapter and route ordering logic. Keep channel-specific defaults and bounds in named policies rather than forcing every consumer into one large schema. Shared meaning matters more than identical object shapes.

When a label must be removed, publish a deprecation window and return a clear input error after the window. Do not silently map an unknown value to \`trending\`, because the route's default branch can make a broken sort look successful. Tests should fail if an explicit unsupported value falls through.

Start a repair by choosing one public term for each sort meaning. Keep the old term as an input alias, but return the chosen term in docs and examples. This lets new clients move first while old clients still work. Remove an alias only after a named release and a checked usage plan.

Next, put the alias map in one small module with no database code. The MCP test can import the map, and the web route can use it before the switch. A pure map is easy to test with all values. It also gives code review one place to inspect a new label.

Do not force the MCP limit and web limit to match during this repair. A tool result may stay small to save agent context. The web page may still need more cards per request. Give each limit a clear policy name, then test its own default and range.

Apply the same rule to single and multi-select fields. Keep the MCP field singular until users need more than one value. When that need is real, accept both a string and an array for a set time. Send both forms as repeated query keys and test the same route result.

Add telemetry only if it respects the project's opt-out settings and does not record query text. Aggregate sort-label usage is enough to judge deprecation. Search terms can contain sensitive work context and are not needed for schema compatibility.

MCP search filter schema drift is a release concern, not merely a TypeScript concern. A package can compile while an agent sends a value that the API ignores. The gate must execute the wire mapping and route behavior rather than trusting type-checking alone.

The [API contract testing guide](/blog/api-contract-testing-microservices) adds a useful outer view for teams that own more than one client. Keep the MCP suite as the narrow proof for tool names, defaults, and aliases. The two layers should share test data, but each should keep its own failure message.

## Prevent MCP Search Filter Schema Drift

MCP search filter schema drift stays controlled when each tool value has an explicit product meaning, each parameter reaches the intended HTTP key, defaults remain observable, and aliases are tested against real ordering. The current QASkills aliases keep clients working, but contract tests should make that compatibility intentional.

Add the gate beside the [tool schema contract testing guide](/blog/tool-schema-contract-testing-guide), then review related QA patterns in [QASkills](/skills). Use the [Playwright CLI skill](/skills/Pramod/playwright-cli) to confirm matching web filters while the MCP suite protects the agent-facing contract.

## Frequently Asked Questions

### Is the current QASkills sort mismatch already breaking search?

Not for the documented pairs. The web route currently accepts \`quality\` with \`highest_quality\` and \`popular\` with \`most_installed\`. The risk is independent definitions that can change separately. Contract tests should preserve current aliases and expose any future value without a matching meaning.

### Should every MCP field reuse the shared search schema?

No. The MCP tool intentionally offers singular filters and a smaller result limit, while the shared schema models arrays and pagination. Reuse shared enums or adapter meanings where useful, but keep channel policies explicit. Forced object identity can create a larger compatibility break than a tested translation.

### Why test route order instead of only enum acceptance?

Enum acceptance proves a label parses, not that it selects the intended database column. Seeded records with distinct weekly installs, dates, quality scores, and install counts reveal swapped mappings. Compare returned IDs for canonical labels and aliases to verify product meaning end to end.

### Should an unknown sort fall back to trending?

An omitted sort may default to trending, but an explicit unknown sort should be rejected at a validated boundary. Silent fallback hides client defects and makes users think their requested order worked. Add a negative contract case even if the current route's default branch still accepts arbitrary text.

### How should multi-select filters evolve in the MCP tool?

Add arrays through a versioned or backward-compatible schema that still accepts one string during migration. Translate both shapes into repeated HTTP keys, then test OR behavior within a category and AND behavior across categories. Do not replace string with array without considering cached MCP client schemas.

### What files should trigger the compatibility gate?

At minimum, changes under the MCP server, shared search schema, skills API route, and search client should run it. Package workflow changes also matter because generated schemas can differ after dependency updates. Broad path coverage is cheaper than discovering a broken agent query after publication.
`,
};
