import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP malformed JSON response testing',
  description:
    'MCP malformed JSON response testing guide with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP malformed JSON response testing',
  keywords: [
    'MCP malformed JSON response testing',
    'MCP response JSON parse error',
    'HTML API response test',
    'truncated JSON tool result',
    'wrong JSON shape MCP',
    'runtime response schema validation',
  ],
  relatedSlugs: [
    'mcp-search-response-normalization-contract-tests',
    'mcp-server-contract-testing-guide',
    'tool-schema-contract-testing-guide',
    'qaskills-mcp-server-guide',
  ],
  sources: [
    'https://developer.mozilla.org/en-US/docs/Web/API/Response',
    'https://json-schema.org/draft/2020-12/json-schema-core',
    'https://zod.dev/api',
  ],
  repoEvidence: ['packages/mcp/src/index.ts', 'packages/mcp/package.json'],
  content: `MCP malformed JSON response testing must prove HTML, truncated JSON, and rejected decoders become explicit MCP error results instead of escaping or stopping the server. It must also expose valid JSON with an incompatible shape. A passing suite checks exact error structure, continued tool availability, and runtime validation rather than trusting TypeScript casts.

## What must MCP malformed JSON response testing prove?

MCP malformed JSON response testing must prove that a successful HTTP status does not imply a usable JSON payload. The suite should separate syntax failure, wrong media content, incompatible shape, defaultable omissions, and valid expected data.

HTML and cut-off JSON tend to fail in \`response.json()\`. The tool handler should catch that fault and return one text item with the error flag set.

Valid JSON syntax needs one more check. A cast can please TS without checking live fields, so objects, arrays, null, strings, and wrong field types need clear cases.

Current behavior is not identical across tools. Some wrong shapes throw during property access, some become empty defaults, and others serialize successfully despite lacking the intended contract.

Tests must describe that baseline before proposing stricter validation. Calling every wrong shape rejected would invent a guarantee that current source does not consistently enforce.

The desired release contract can still require explicit shape errors. Mark those cases as expected failures until a runtime schema is added, or land validation and tests in the same reviewed change.

Process survival is observable through a second call after malformed input. If a later controlled request succeeds, the first parse error stayed inside its handler boundary.

The [search normalization contract](/blog/mcp-search-response-normalization-contract-tests) covers expected search shaping. This article concentrates on hostile or accidental response content before stable normalization can occur.

The [JSON Schema core specification](https://json-schema.org/draft/2020-12/json-schema-core) provides a vocabulary for structural assertions. Repository code still decides which fields each QASkills tool requires or safely defaults.

## Which repository behavior defines the contract?

The JSON request path is in \`packages/mcp/src/index.ts\`. Its \`getJson\` helper waits for \`response.json()\` and returns the result with a broad TS cast.

That cast disappears at runtime. It neither verifies object type nor checks arrays, properties, scalar fields, or nested skill values before the caller uses them.

Four tools use the JSON helper: \`search_skills\`, \`get_skill\`, \`list_categories\`, and \`get_leaderboard\`. Each handler puts its request and result work in one try and catch.

A decoder rejection therefore reaches the handler catch. The catch calls \`errorResult\`, which returns one text content item prefixed with \`Error: \` and adds \`isError: true\`.

\`search_skills\` sends its value to \`normalizeSearchResponse\`. Lost \`total\` becomes zero, lost \`skills\` becomes an empty array, but a true non-array \`skills\` value can fail at \`.map\`.

\`get_skill\` removes \`fullDescription\` with object destructuring and serializes the rest. An ordinary unexpected object may therefore pass even when required skill metadata is absent.

\`list_categories\` serializes whatever JSON value it receives. Without runtime validation, a string, array, or unrelated object can become a successful text result.

\`get_leaderboard\` reads \`response.skills\`, gives a lost value an array default, and calls \`.slice\`. Some odd values support slice, while the rest throw and become MCP errors.

The SDK and Zod links are in \`packages/mcp/package.json\`. Zod already checks tool inputs through tool schemas, but current reply values do not pass through output schemas.

The [Response reference](https://developer.mozilla.org/en-US/docs/Web/API/Response) documents \`json()\` as a body-reading parser. MCP malformed JSON response testing must add application shape checks after parsing because successful JSON syntax says nothing about expected fields.

## How should QA teams test MCP response JSON parse error?

An MCP response JSON parse error case should invoke a captured JSON-backed handler with \`ok: true\` and a rejecting \`json()\` method. This isolates decoding from non-2xx handling, which takes a separate text-error branch.

Mock the SDK server during module loading and store registered handlers. The test then exercises production try and catch behavior without launching stdio or an AI client.

Return a fixed SyntaxError from \`json()\`. Check that the handler promise ends, the result has its error flag, and the first text item has the fixed parser message.

Also check that \`response.text()\` is not called. Good-status JSON tools use the JSON parser at once, while bad status values are caught first by shared request code.

Run the bad reply through at least two tools. A shared helper test proves JSON read acts, but two handlers prove each keeps the parse call inside its catch.

After the error, change fetch to valid set JSON and call the same handler again. Exact success on that next call proves the bad body did not harm tool setup or stop the process.

Use a call count and URL check for each call. A retry hidden in live code could use the valid reply and make the first call seem safer than it is.

Do not compare engine-generated SyntaxError wording across all runtimes. Use a controlled rejected \`json\` method for stable text, then add one native Response integration case with broader structural assertions.

The [MCP server contract guide](/blog/mcp-server-contract-testing-guide) can test wire flow at process level. Small cases should stay exact about JSON read calls and returned error objects.

MCP malformed JSON response testing should check that no console or stdout wire text comes with the error. A valid object does not help if raw parser text also breaks stdio frames.

## Test matrix for HTML API response test

An HTML API response test should model a proxy page returned with status 200, not only an HTTP 500. That fixture reaches JSON decoding and proves successful transport status cannot bypass content checks.

Use a new Response for each native parse row since a body can be read once. Reuse may cause a body-used fault instead of the planned HTML or cut-off JSON sign.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| Valid expected JSON | Correct object for the selected tool | Exact normal MCP text result | Harness marks every response malformed | \`packages/mcp/src/index.ts\` |
| HTML with status 200 | Controlled login page text | Decoder failure becomes \`isError\` result | HTML escapes or becomes success data | Response reference |
| Truncated JSON | \`{"skills":[\` | Decoder failure remains inside handler | Promise rejects or process exits | \`packages/mcp/src/index.ts\` |
| Decoder rejects | Stubbed \`json()\` throws SyntaxError | Stable controlled error content | Error is swallowed as empty success | \`packages/mcp/src/index.ts\` |
| Empty object | \`{}\` for search | Current search result defaults to zero and empty list | Test invents mandatory fields | \`packages/mcp/src/index.ts\` |
| Wrong skills type | \`{"skills":{}}\` | Incidental map or slice error becomes MCP error | Wrong value is presented as valid list | \`packages/mcp/src/index.ts\` |
| Null root | \`null\` | Property access failure becomes MCP error | Null causes uncaught rejection | \`packages/mcp/src/index.ts\` |
| Valid unrelated object | Categories receives \`{"other":1}\` | Current code serializes it; strict schema should reject later | Cast is mistaken for validation | JSON Schema core |

The valid case must check exact tool output. A check for no error flag could take an empty or other result made by the wrong test data.

The HTML row should use reviewed text with no script or web links. The goal is parse acts, not a browser run or a safe-code scan.

The cut-off row should fail at JSON syntax. Keep its HTTP status good so request error code cannot catch it before the JSON read.

The empty search object documents intentional defaults already present in normalization. A strict future schema may continue accepting it if missing fields are explicitly optional.

The unrelated categories row reveals the widest gap. Current serialization accepts many JSON values, so a new runtime schema test should fail until product requirements define the expected grouped shape.

Mark each row as pass-now, pass-next, or change guard. A mix of those names can make CI block all work or hide a lost shape check.

MCP malformed JSON response testing should produce one concise matrix report. Include tool, payload class, decoder outcome, validator outcome, and final MCP status without copying large bodies.

## What failures expose truncated JSON tool result?

A truncated JSON tool result exposes failure when its syntax error rejects the handler promise, reaches process-level fatal handling, or becomes a normal content response. The accepted outcome is a structured MCP error and a server that can handle the next request.

Use a native Response body such as \`{"skills":[\` for one full-path case. This proves the live JSON read rejects cut-off text rather than relying only on a mock.

Then use a fake failed read for exact result words. Native acts plus fixed text give both a real parse and stable product checks.

Watch \`process.exit\`, stderr, and console calls when the rig allows. The handler should return its error object without a call to the top-level fatal catch.

The top-level catch protects only failures from \`main\` and connection setup. A tool error that escapes into that path would be a severe ownership and availability regression.

After the bad call, give valid test data through the same saved handler. Check exact next-call text and two total fetches, which proves the pass did not need a fresh server.

The first code example uses a controlled decoder rejection for an exact handler contract. It tests production registration and catch behavior rather than a copied parser wrapper.

\`\`\`typescript
import { expect, it, vi } from 'vitest';

it('returns an MCP error when successful HTTP JSON decoding fails', async () => {
  const response = {
    ok: true,
    status: 200,
    json: vi.fn().mockRejectedValue(new SyntaxError('controlled invalid JSON')),
    text: vi.fn(),
  };
  global.fetch = vi.fn().mockResolvedValue(response as unknown as Response);
  const search = (await captureRegisteredTools()).get('search_skills')!;

  const result = await search.handler({ limit: 10 });

  expect(response.json).toHaveBeenCalledOnce();
  expect(response.text).not.toHaveBeenCalled();
  expect(result).toEqual({
    content: [{
      type: 'text',
      text: 'Error: controlled invalid JSON',
    }],
    isError: true,
  });
});
\`\`\`

This case proves syntax faults are caught. It does not prove wrong but valid JSON fails, since the fake JSON read never gives a value.

The second example adds a proposed runtime schema at the point immediately after parsing. Its schema is illustrative and must be aligned with the selected tool's reviewed output contract before production use.

\`\`\`typescript
import { z } from 'zod';

const searchResponseSchema = z.object({
  total: z.number().nonnegative().optional().default(0),
  skills: z.array(z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
  })).optional().default([]),
});

it.each([
  ['null root', null],
  ['object skills', { total: 1, skills: {} }],
  ['string total', { total: '1', skills: [] }],
])('rejects the %s response shape', async (_name, payload) => {
  const parsed = () => searchResponseSchema.parse(payload);

  expect(parsed).toThrow();
  expect(() => JSON.stringify(payload)).not.toThrow();
});
\`\`\`

This fail pact splits syntax from shape. The values can become JSON text, but none meets the planned search reply schema.

## CI coverage for wrong JSON shape MCP

Wrong JSON shape MCP coverage should run a shared payload-class matrix against every JSON-backed tool. Expected fields differ, but root null, root scalar, wrong collection type, and unrelated object apply broadly.

Keep per-tool schemas or assertions near their production consumers. One permissive universal object schema would reproduce the existing cast problem under a different name.

Run caught-parser cases on each MCP source change. Run strict shape cases when reply pacts, web APIs, SDK links, or check tools change.

Block release immediately for uncaught decoder errors, process exits, protocol output corruption, or wrong-type values presented as expected data. Treat newly exposed accepted omissions according to each tool's documented defaults.

If runtime validation is not implemented yet, mark desired shape rejection cases explicitly rather than disabling them silently. A dedicated expected-failure mechanism keeps the gap visible without misreporting current behavior.

Use short body tags and hashes in logs. Small fixed test data may be printed, but do not save a live HTML page or API reply by default.

Set URL-aware fetch mocks and short test times. A wrong route with the right bad body can make the parse test pass while it hides request URL drift.

Run one built-package process test that sends bad then valid replies. That flow checks the bundle and proves the server stays up after a caught parse fault.

The [tool schema testing guide](/blog/tool-schema-contract-testing-guide) covers stated input schemas. Reply shape checks belong next to it in CI, but both pacts need their own data and fail tags.

MCP malformed JSON response testing should log source and package builds from \`packages/mcp/package.json\`. A shape checker or SDK update may change error text even when the fault stays caught.

## How should runtime response schema validation be asserted?

Runtime response schema validation should assert parsed values before normalization or serialization. The validator must receive the raw result from \`response.json()\`, not a defaulted object that already erased missing fields.

Define each tool's required, optional, and defaultable fields. Search may allow missing skills and total because current normalization defaults them, while another tool may require a grouped object or array.

Use safe parse when the handler needs a fixed product error. A thrown shape fault also works if the current handler catch turns it into the reviewed MCP error shape.

Do not show full shape-check issue trees by default. Pick stable field paths and short text, then keep engine details in debug logs when they help the team.

Check that valid extra fields follow a clear rule. A strict schema can reject them, while a pass-through schema can keep them; either choice should be planned, not copied from a cast.

Test null, arrays, plain values, empty objects, wrong fields, wrong nested types, and large lists where product limits exist. Do not invent count or size caps that the API pact lacks.

Keep syntax and shape faults distinct in test names, even if both set the error flag. This split sends parse faults to wire content and shape faults to API or pact owners.

Check that defaults run only after the shape check. A spy or small seam can prove wrong values never reach \`.map\`, \`.slice\`, field splits, or broad JSON text output.

The [Zod API documentation](https://zod.dev/api) is an approved reference because the MCP package already depends on Zod. Tests should still cite exact repository schemas once they exist rather than relying on documentation examples.

Use the [skills directory](/skills) only for a valid smoke sample. Fixed wrong-shape test data is safer and more full than an attempt to make a public API send bad data.

MCP malformed JSON response testing reaches full coverage when syntax failure, validation failure, valid defaults, and valid expected payloads each have exact result assertions. Each group must also show the tool and first failed stage.

## Step-by-step test implementation

Build the suite in two layers: current parser containment and reviewed runtime shape enforcement. Keeping layers visible prevents a TypeScript type from being mistaken for executable validation.

1. Read \`packages/mcp/src/index.ts\` and list every JSON-backed tool, decoder call, normalization step, incidental shape failure, catch, and result wrapper.
2. Create isolated fixtures for HTML, truncated JSON, rejected decoding, null roots, scalars, arrays, missing fields, wrong fields, and valid controls.
3. Capture handlers and mock successful Response objects whose \`json\` method rejects or returns one controlled payload per case.
4. Execute syntax failures and assert exact MCP error structure, no process exit, no raw protocol output, and a successful follow-up call.
5. Execute valid wrong shapes, document current acceptance or failure, then enforce reviewed runtime schemas before normalization and serialization.
6. Run source and built-package suites in CI, retaining payload class, field path, result status, and package versions for triage.

Use a reply helper that makes a new object for each call. Shared body state can turn the next call into a used-body fault with no link to planned data.

Restore fetch, console spies, process spies, and code state after each test. A leaked fail reply can break later valid checks and hide the next-call pass.

Keep pass-next cases near the code issue or change that will make them pass. This avoids skipped tests that have no owner or due point.

The [getting started page](/getting-started) can aid a hand MCP call after fixed checks pass. CI must never need a proxy to serve live HTML or a public API to send bad data.

Review the full matrix when a JSON tool is added. A new handler should fail the tool-list check until it has parser, shape, valid, and next-call cases.

## Failure triage and regression ownership

If \`response.json()\` does not run, first confirm the response has \`ok: true\`. Non-2xx handling belongs to the HTTP error branch and should not be diagnosed as malformed success content.

If a JSON read fault escapes the handler, check the tool's try and catch scope. MCP owns the change from request or parse faults into an error result.

If the process exits or stdio has raw parser text, check top-level error paths and logs. Wire ownership starts after proof shows the handler did not catch the fault.

If valid wrong JSON becomes pass data, match that act with the reviewed tool schema. MCP owns a lost live shape check, while the web API owns a value outside its reply pact.

If one wrong type fails only at \`.map\` or \`.slice\`, label it a chance fault. Replace that weak path with a clear shape check instead of matching an engine message.

If an empty object becomes a default search result, check if those defaults are planned. Pact owners should decide before a strict schema turns a safe omission into a release fault.

If source and package acts differ, check bundle build, Node run time, and shape-check tool. Release owners should fix stale output before tests accept two reply pacts.

If a live host sends HTML with status 200, the host team owns that source fault, while MCP still owns a caught fault and clear error text. Both layers may fail in the same log.

Use the [blog index](/blog) to locate adjacent API and MCP checks during triage. Keep the failed record focused on payload class, decoder or validator stage, and exact returned status.

Close a regression only after malformed then valid calls succeed in sequence. One handled error is not enough if the server or handler remains unusable afterward.

## Frequently Asked Questions

### How should an MCP response JSON parse error appear?

It should resolve as a structured tool result with one text content item and \`isError: true\`, not reject the handler promise or stop the server. Use a controlled decoder rejection for exact wording, then call the same handler with valid JSON to prove continued availability.

### Why test an HTML API response with status 200?

Proxies, gateways, or authentication layers can return HTML while preserving a successful status. That response bypasses non-2xx handling and reaches \`response.json()\`. The case proves transport success alone cannot establish valid tool data and that parser failure remains contained inside the handler.

### What does a truncated JSON tool result prove?

Truncated text proves syntax-error containment at the decoder boundary. It does not prove runtime fields are valid after parsing. Pair it with null, scalar, wrong collection, and unrelated object cases so valid JSON cannot bypass the response contract through a TypeScript cast.

### Does current code reject every wrong JSON shape?

No. Some shapes throw during map, slice, or destructuring, while missing search fields become defaults and general category values can serialize. Tests should characterize those differences honestly for each tool. Consistent shape rejection requires reviewed runtime schemas before normalization or result serialization.

### Where should runtime response schema validation run?

Run it immediately after \`response.json()\` returns and before defaults, mapping, slicing, destructuring, or serialization. This preserves the raw value for accurate field diagnostics. The existing handler catch can then convert a thrown validation error into the standard MCP error result.

## Conclusion

MCP malformed JSON response testing separates HTTP success, JSON syntax, runtime shape, normalization, and final MCP output. Parser errors must stay inside handlers, while valid but incompatible values need explicit schemas rather than accidental JavaScript failures or permissive casts.

Review the [QASkills MCP integration](/mcp), then browse verified QA agent skills through the [skills directory](/skills). Use the [server contract guide](/blog/mcp-server-contract-testing-guide), [search response guide](/blog/mcp-search-response-normalization-contract-tests), and this bad-then-valid matrix before release.`,
};
