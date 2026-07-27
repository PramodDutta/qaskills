import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP skill slug encoding tests',
  description:
    'MCP skill slug encoding tests guide with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP skill slug encoding tests',
  keywords: [
    'MCP skill slug encoding tests',
    'encodeURIComponent MCP slug',
    'skill identifier slash test',
    'percent sign slug encoding',
    'Unicode skill slug request',
    'MCP path segment safety',
  ],
  relatedSlugs: [
    'qaskills-mcp-server-guide',
    'mcp-server-contract-testing-guide',
    'mcp-server-testing-guide-2026',
    'mcp-inspector-tutorial-2026',
  ],
  sources: [
    'https://nodejs.org/api/url.html',
    'https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams',
    'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
  ],
  repoEvidence: [
    'packages/mcp/src/index.ts',
    'packages/web/src/app/api/skills/[id]/route.ts',
    'packages/mcp/package.json',
  ],
  content: `MCP skill slug encoding tests should send one shared identifier corpus through get_skill, get_skill_content, and install_skill, then capture each exact API path. Spaces, slashes, percent signs, and escaped Unicode must remain one encoded route segment. Local install paths need a separate check because the raw slug is reused for directories.

## What must MCP skill slug encoding tests prove?

MCP skill slug encoding tests must prove that each slug-based tool encodes the same raw identifier once before it builds an API route. The suite should compare captured paths, decoded server ids, tool results, and local install effects without mixing those distinct layers.

A slash is the clearest boundary case. Its encoded request form should stay inside one intended API slot rather than create another path segment at the MCP builder.

A percent sign needs its own row because it may already begin a percent-looking sequence. Encoding must preserve that literal sign, not treat caller text as pre-encoded route data.

Spaces should become their expected percent form in the captured request. Tests should reject plus signs on path segments, since plus handling belongs to form or query rules.

Unicode source data can be built with ASCII escape syntax in the test file. This repository article remains ASCII, while the runtime string still contains the intended code point.

Run all four edges through \`get_skill\`, \`get_skill_content\`, and \`install_skill\`. A shared corpus catches drift where one tool forgets the helper or encodes twice.

The request check must occur at a local HTTP server before framework routing changes the path. Save the raw request target and compare exact percent bytes.

Then test the web route with the decoded id that the framework passes to its handler. That unit test proves lookup choice, but a full HTTP test is still needed for proxy and router decoding.

The local install path is a different contract. Current source uses the raw slug below the chosen target, so a slash can create nested folders even when the network request is encoded.

Do not call that local behavior safe merely because the API path is safe. Record it as a separate gap and use a plain slug when the test only needs a successful install control.

The [QASkills MCP page](/mcp) lists the tool surface, while the [server guide](/blog/qaskills-mcp-server-guide) gives wider setup. This suite owns raw slug identity across API path construction and route lookup.

The [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) explains tool inputs and results. URL escaping remains QASkills application behavior backed by source and captured requests.

MCP skill slug encoding tests pass only when each expected route is exact and each decoded id retains caller identity. A successful 200 response alone can hide a request sent to the wrong resource.

## Which repository behavior defines the contract?

The three slug route builders appear in \`packages/mcp/src/index.ts\` for every current command. The \`get_skill\` tool calls \`encodeURIComponent(slug)\` before appending the value to \`/api/skills/\`.

\`get_skill_content\` applies the same function before adding \`/content\`. The \`installSkill\` helper also encodes its content request before any file work begins.

Those are three separate source expressions, not one shared path helper. Tests need all three tools because a future edit can change one call without changing the others.

The encoded pathname is passed to \`buildUrl\`, which creates a \`URL\` against the configured base. The [Node URL docs](https://nodejs.org/api/url.html) describe that URL parser and serializer.

\`buildUrl\` also adds query values for search, but slug routes do not use query parameters. The [URLSearchParams reference](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) is useful for contrast: query encoding should not replace path-segment encoding.

For install, the downloaded text is requested before path creation. A route error should therefore stop the tool before it creates the expected skill file.

After download, the install helper reads \`process.cwd()\`, selects a target, and calls \`path.resolve(cwd, target, slug)\` with the raw slug. No local slug sanitizer is shown in this function.

That fact sets a firm article boundary. The network corpus may include slash and parent-like text, but file assertions must report current raw-path behavior instead of assuming one folder.

The web endpoint is implemented in \`packages/web/src/app/api/skills/[id]/route.ts\`. It receives \`params.id\`, tests whether the value is a UUID, and otherwise compares it with the stored slug.

The handler does not call a second URI decoder in the cited code. Tests should pass its decoded param directly at unit level and add a real HTTP case to verify the framework boundary.

If no row matches, it returns a 404 error. If the database call throws, it returns a 500 response with a different stable error body.

Package data in \`packages/mcp/package.json\` supplies the built bin and Node floor. Use the built bin for request capture so module loading and URL serialization match package use.

The package depends on the v1 MCP SDK range. Tool calls should travel through a real client transport, not a copied function that happens to use the same encoder.

The [MCP contract testing guide](/blog/mcp-server-contract-testing-guide) covers result envelopes. MCP skill slug encoding tests add exact request-target checks before those envelopes are trusted.

## How should QA teams test encodeURIComponent MCP slug?

An encodeURIComponent MCP slug corpus should include plain text, one space, a slash, a literal percent sequence, a question mark, a hash, and an escaped non-ASCII mark. Each raw value needs one expected encoded segment.

Write expected values as fixed strings rather than computing them with the production function. Using \`encodeURIComponent\` on both sides would let the same mistake validate itself.

For the escaped mark, build the raw string with \`String.fromCodePoint(0x00e9)\`. The expected UTF-8 percent form remains an ASCII test literal.

Start a local server that logs \`request.url\` and returns the right type for each tool. Metadata calls need JSON, while content and install calls need Markdown text.

Use distinct path suffixes to assign calls. \`get_skill\` ends at the encoded id, while the other two request the same encoded id followed by \`/content\`.

The example below drives the actual built server from \`packages/mcp/src/index.ts\`. It checks every tool against one percent-heavy slug without requiring a real catalog record.

\`\`\`typescript
import { createServer } from 'node:http';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { expect, it } from 'vitest';

async function startPathCapture() {
  const paths: string[] = [];
  const server = createServer((request, response) => {
    paths.push(request.url ?? '');
    if (request.url?.endsWith('/content')) {
      response.writeHead(200, { 'content-type': 'text/markdown' });
      response.end('---\\nname: encoded-fixture\\n---\\nSafe body.\\n');
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end('{"slug":"rate%2Flimit","name":"Encoded fixture"}');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No capture port');
  return {
    baseUrl: \`http://127.0.0.1:\${address.port}\`,
    paths,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

it('encodes one raw percent sequence in all three slug routes', async () => {
  const api = await startPathCapture();
  const cwd = await mkdtemp(path.join(tmpdir(), 'qaskills-slug-'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve('packages/mcp/dist/index.js')],
    cwd,
    env: {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? cwd,
      QASKILLS_API_URL: api.baseUrl,
      DO_NOT_TRACK: '1',
    },
  });
  const client = new Client({ name: 'slug-contract', version: '1.0.0' });
  await client.connect(transport);
  const slug = 'rate%2Flimit';

  await client.callTool({ name: 'get_skill', arguments: { slug } });
  await client.callTool({ name: 'get_skill_content', arguments: { slug } });
  await client.callTool({ name: 'install_skill', arguments: { slug } });

  expect(api.paths).toEqual([
    '/api/skills/rate%252Flimit',
    '/api/skills/rate%252Flimit/content',
    '/api/skills/rate%252Flimit/content',
  ]);
  await transport.close();
  await api.close();
});
\`\`\`

The literal percent sign becomes \`%25\`, while the caller's following \`2F\` text remains ordinary data. A server-side single decode can recover the original \`rate%2Flimit\` identity.

This install case creates a directory whose name contains the literal percent text on common hosts. Keep local-path assertions in a separate block because host file rules can vary.

Expand the test with \`it.each\` over fixed raw and expected pairs. Reset captured paths for each row so a failed value reports one clear diff.

Do not lower-case encoded hex before comparison. URI processors usually accept either case, but an exact serializer contract makes package drift visible and logs easier to compare.

MCP skill slug encoding tests should also save returned error content for a 404. The requested path can be correct even when the synthetic id has no database row.

## Test matrix for skill identifier slash test

A skill identifier slash test matrix should show raw text, expected segment, request target, decoded id, and any local file effect. This split prevents one green layer from hiding another red layer.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
| --- | --- | --- | --- | --- |
| Plain slug | \`playwright-check\` | Segment stays plain in all tools | Extra escaping changes identity | \`packages/mcp/src/index.ts\` |
| Space | \`space skill\` | Captured segment is \`space%20skill\` | Plus sign or raw space appears | Node URL reference |
| Slash | \`suite/api\` | Builder emits \`suite%2Fapi\` as one slot | Raw slash creates API depth | skill identifier slash test |
| Literal percent | \`rate%2Flimit\` | Builder emits \`rate%252Flimit\` | Existing text is decoded or left raw | percent sign slug encoding |
| Question mark | \`check?mode\` | \`%3F\` stays in the segment | Request starts a query string | encodeURIComponent MCP slug |
| Hash | \`check#part\` | \`%23\` stays in the request target | Fragment text never reaches server | Node URL reference |
| Escaped Unicode | Runtime string from \`0x00e9\` | UTF-8 bytes have fixed percent form | Identity changes after round trip | Unicode skill slug request |
| Route lookup | Handler receives decoded slash id | Slug branch compares exact decoded text | UUID branch or split value is used | \`packages/web/src/app/api/skills/[id]/route.ts\` |
| Install local path | Raw slash slug after content fetch | Current path may create nested folders | Test calls network encoding a disk guard | MCP path segment safety |

The slash row proves request construction only. A full server stack may apply proxy or router rules, so add an HTTP integration test that asserts the handler receives one intended id.

The percent row guards against caller data that resembles prior encoding. The MCP layer accepts a raw slug contract and must not guess that text is already safe for a route.

The question and hash rows show why raw interpolation is unsafe. Both marks have URL syntax roles when they are not encoded as segment data.

The escaped Unicode row should compare UTF-8 percent bytes and final decoded text. Avoid snapshots that render a host font, since byte identity is the useful contract.

The route row should stub the database and inspect the value passed to \`eq(skills.slug, id)\`. It need not query a real database to prove UUID-versus-slug choice.

The local install row is a deliberate warning. Network safety and disk safety use the same input but different source operations.

Use the [MCP Inspector tutorial](/blog/mcp-inspector-tutorial-2026) for manual calls, but capture raw HTTP paths in automated tests. Client displays may show decoded text and hide percent bytes.

## What failures expose percent sign slug encoding?

Percent sign slug encoding fails when raw caller text is treated as if it were already encoded, decoded too early, or encoded twice after the intended builder. Each failure changes resource identity.

Start with a slug containing \`%2F\` as literal characters. One correct component encode changes the percent sign to \`%25\`, producing \`%252F\` in the raw target.

If the target contains only \`%2F\`, the caller's literal percent was trusted as syntax. A downstream decoder may turn it into a slash and change routing.

If the target contains \`%25252F\`, another layer encoded the already safe segment again. A single server decode then yields the wrong stored id.

The right round-trip check starts from the raw slug, compares the captured target, and then compares the route's decoded param with the raw slug. Each step has an independent fixed expectation.

Do not use \`decodeURIComponent(encodeURIComponent(slug)) === slug\` as the only test. That checks two matching platform functions without showing which bytes crossed HTTP.

Record the full pathname but mask the loopback port. Ports vary by run, while the route and encoded segment should remain fixed.

When a synthetic id gets a 404, inspect the capture before the result. A 404 is expected for absent data and does not by itself prove encoding failure.

When only install fails, compare its content request with \`get_skill_content\`. If paths match, the fault likely occurs after download in local path or write logic.

When all three tools fail the same corpus row, inspect shared URL construction or client input. When one fails, inspect that tool's separate source expression.

MCP skill slug encoding tests should classify unexpected redirects as failures. A redirect can normalize a path and hide that the first request used the wrong segments.

The [MCP server testing guide](/blog/mcp-server-testing-guide-2026) can hold HTTP status and redirect policy. This article keeps exact slug identity as the deciding check.

## CI coverage for Unicode skill slug request

A Unicode skill slug request test should construct runtime values from ASCII escapes and compare fixed UTF-8 percent forms. It needs no locale, font, or clipboard input.

Use at least one precomposed mark and one code point outside basic ASCII. Keep normalization testing separate because encoding preserves code points rather than choosing a canonical form.

The current code does not normalize slug text before encoding. Two canonically similar strings can therefore produce different request bytes, which tests should record without merging them.

Run the corpus on the minimum Node major from \`packages/mcp/package.json\`. URL serialization is a runtime edge, so package support claims should include it.

Build the MCP package first and launch the emitted bin. Source runners can apply loaders or transforms that differ from published use.

Use a loopback server and disable telemetry. Only slug requests belong in the capture list, and public data must not affect expected results.

Give each CI worker a new port and temp root. Shared logs make unlike Unicode rows hard to assign when tests run at once.

Save raw request targets as ASCII text. Percent forms are safe for logs and let reviewers compare exact UTF-8 bytes without terminal display issues.

Add a full HTTP route case for each framework or proxy update. Unit handler tests cannot prove whether encoded slashes survive an outer router.

Block release for raw reserved marks, missing bytes, extra encoding, changed decoded ids, or tool drift. A new serializer form needs review against fixed identity rules.

The [getting started page](/getting-started) helps reproduce package setup. Keep the corpus and fixed expectations in the MCP test tree where code changes can trigger them.

MCP skill slug encoding tests should run after Node, SDK, Next.js, or proxy upgrades. Each layer can affect how request bytes become route values.

## How should MCP path segment safety be asserted?

MCP path segment safety should be asserted at three checkpoints: raw tool input, captured HTTP target, and decoded route parameter. A fourth checkpoint handles install disk paths and must not borrow the network result.

At input, save the exact JavaScript string and code points. This prevents display changes from hiding a different source value.

At capture, compare a fixed ASCII pathname. Reject raw spaces, slashes inside the id slot, query starts, fragments, and percent sequences with the wrong depth.

At the route, spy on the database condition and require the original decoded id. Also assert whether the UUID test chose id or slug lookup.

The route test below invokes \`packages/web/src/app/api/skills/[id]/route.ts\` with a decoded percent-like id. It verifies that the handler uses the slug branch and returns the row unchanged.

\`\`\`typescript
import { NextRequest } from 'next/server';
import { expect, it, vi } from 'vitest';

const state = vi.hoisted(() => {
  const where = vi.fn();
  const row = {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'rate%2Flimit',
    name: 'Percent fixture',
    description: 'A test-owned row for route identity.',
    fullDescription: 'Fixture body',
  };
  const query: Record<string, unknown> = {};
  Object.assign(query, {
    select: () => query,
    from: () => query,
    where: (condition: unknown) => {
      where(condition);
      return query;
    },
    limit: async () => [row],
  });
  return { query, row, where };
});

vi.mock('@/db', () => ({ db: state.query }));
vi.mock('@/db/schema', () => ({
  skills: { id: 'skills.id', slug: 'skills.slug' },
}));
vi.mock('drizzle-orm', () => ({
  eq: (field: unknown, value: unknown) => ({ field, value }),
}));

import { GET } from '@/app/api/skills/[id]/route';

it('looks up a once-decoded percent-like identifier as a slug', async () => {
  const response = await GET(new NextRequest('http://local.test'), {
    params: Promise.resolve({ id: 'rate%2Flimit' }),
  });

  expect(response.status).toBe(200);
  expect(state.where).toHaveBeenCalledWith({
    field: 'skills.slug',
    value: 'rate%2Flimit',
  });
  expect(await response.json()).toMatchObject({
    slug: 'rate%2Flimit',
    fullDescription: 'Fixture body',
  });
});
\`\`\`

This unit case begins after route decoding by design. Pair it with raw request capture to prove both sides of the boundary without guessing how Next.js produced \`params.id\`.

For install, inspect the resulting path independently. A slash in the raw slug may become nested folders because \`path.resolve\` receives that raw text after the safe fetch.

Parent-like values also deserve a local-path security task. Do not expand the network encoder's pass result into a claim that the install target is confined.

Exact tool output still matters. A correct request that returns an error should preserve \`isError\`, status detail, and the requested URL without leaking unrelated data.

MCP skill slug encoding tests are strongest when one corpus runs through all checkpoints. Keep expected path, decoded id, and disk rule in separate columns so scope stays clear.

## Step-by-step test implementation

Implement MCP skill slug encoding tests in six steps. Use fixed expected strings and keep API paths apart from local paths.

1. Read \`packages/mcp/src/index.ts\`, \`packages/web/src/app/api/skills/[id]/route.ts\`, and \`packages/mcp/package.json\`; mark each encoder, lookup branch, bin, and raw local slug use before choosing any expected path or decoded value, then record the three separate tool call sites by name.
2. Define plain, space, slash, percent, question, hash, and escaped Unicode raw values with hand-written expected encoded segments and decoded ids that never call the encoder under test, derive expected text from standards once, and freeze the corpus for review.
3. Start a raw path capture server, launch the built MCP bin, and call \`get_skill\`, \`get_skill_content\`, and \`install_skill\` for each safe fixture while saving tool labels, request order, HTTP method, response kind, and original input beside each capture.
4. Assert every captured target, response envelope, and once-decoded route id, including exact UUID-versus-slug database selection and the original raw code points for each case, with expected and actual path text shown in a small ASCII diff.
5. Add 404, redirect, double-encode, malformed percent, framework HTTP, and install local-path cases without treating one layer as proof for another or hiding an expected synthetic lookup miss, skipped fault, wrong host, or stale response from a prior row.
6. Run the corpus after package, runtime, SDK, web router, or proxy changes, retain ASCII path logs, and assign each failed checkpoint to its owner with expected and actual percent forms, tool names, decoded ids, package versions, and fixture ports, then repeat the failed raw value through all three tools and the real HTTP route before any baseline is changed or any tool, proxy, router, and lookup stage is skipped.

Step one reveals the three repeated encoder calls. A shared test corpus is needed even if production later moves them behind one helper.

Step two keeps the expected side independent. Do not generate expected segments with the same function under test.

Step three can use synthetic API responses. Encoding behavior does not require a live catalog or a real public slug.

Step four checks route identity as well as bytes. A correct-looking percent target is not enough if the server compares a changed id.

Step five records known limits. In particular, raw local slug paths remain outside the network safety claim.

Step six keeps the gate near all layers that can alter bytes. Save small diffs with raw input, expected target, actual target, and decoded value.

Use the [MCP contract guide](/blog/mcp-server-contract-testing-guide) for shared client helpers and compare related calls with the [MCP server guide](/blog/qaskills-mcp-server-guide). Keep this suite's assertions fixed on slug identity rather than general tool behavior.

MCP skill slug encoding tests should have one corpus owner and clear layer owners. This structure turns a complex route failure into one exact checkpoint.

## Failure triage and regression ownership

Start with the raw capture. If it differs from expected, the fault is in MCP input mapping, encoder use, URL construction, or a redirect before the capture point.

If capture is right but route id is wrong, inspect the HTTP framework, proxy, and dynamic route boundary. Do not change MCP expected bytes to fit a bad decode.

If route id is right but lookup uses the UUID field, inspect the UUID regular expression and the synthetic value. Slug-like percent text should use slug lookup.

If lookup is right but returns 404, verify the fixture row and database mock. Encoding may already be proven by the earlier checkpoints.

If only one tool differs, inspect its separate \`encodeURIComponent\` expression. If all tools differ, inspect shared \`buildUrl\` or the client adapter.

If percent rows fail while spaces pass, count encoding depth. The actual target will often show whether raw text was trusted or safe text was encoded twice.

If escaped Unicode fails only in logs, compare percent bytes before changing source values. Terminal display can differ while network identity remains correct.

If install fetch is right but file layout is wrong, route the issue to local path handling. The raw slug, not the encoded segment, reaches the disk builder.

If failures begin after a Node upgrade, run the corpus on the prior supported major and compare serializer output. Keep package engine claims in the issue.

If failures begin after a web upgrade, add a real HTTP handler case before editing unit mocks. Dynamic route decoding can change outside handler source.

The [blog index](/blog) links package, route, and install checks for each owner. Attach the smallest failed corpus row rather than one large mixed transcript.

Close a bug only when the original raw value passes request capture, route id, lookup field, and applicable disk check. A tool success message alone is too weak. MCP skill slug encoding tests provide one rule: preserve raw identifier identity through each named boundary, and never transfer proof across an untested layer.

## Frequently Asked Questions

### What do MCP skill slug encoding tests need to capture?

Capture the raw JavaScript value, fixed expected segment, raw HTTP target, decoded route id, lookup field, tool result, and any install path. These checkpoints show exactly where identity changed. Keep local disk behavior separate because request encoding does not sanitize the raw slug used after download.

### Why test an encodeURIComponent MCP slug in all three tools?

The repository contains separate encoding expressions for get_skill, get_skill_content, and install_skill. One can drift while the other two remain sound. Running one fixed corpus through each tool proves consistent request construction and gives a narrow source location when only one captured target differs.

### What should a skill identifier slash test prove?

It should prove the MCP builder sends the slash as percent data inside one intended id slot, then prove the server receives the expected decoded id. For install, it must also record that the raw slash can affect local folder layout, which is not covered by network-path success.

### How many times should percent sign slug encoding occur?

The raw slug contract requires one component encode before route construction. A literal percent in \`rate%2Flimit\` therefore appears as \`%25\` in the raw request, yielding \`rate%252Flimit\`. After one server decode, the compared slug should again be the caller's literal \`rate%2Flimit\`.

### How can an ASCII test cover a Unicode skill slug request?

Build the runtime slug with \`String.fromCodePoint\` or an ASCII escape sequence, then compare a fixed UTF-8 percent form in the request log. This keeps source and CI artifacts ASCII while still testing non-ASCII runtime data, byte identity, once-decoded route values, and serializer behavior.

### Does MCP path segment safety prove install directory safety?

No. The current MCP code encodes the slug for its content request, but later passes the raw slug into local path resolution. A slash or parent-like value can therefore have a separate disk effect. Treat network identity and filesystem confinement as two contracts with different evidence and tests.

## Conclusion

MCP skill slug encoding tests need fixed corpus values, raw path capture, route-id checks, and all three tool calls. They must also state the local install gap plainly, because a safely encoded API segment does not prove a confined raw-slug directory.

Review the [QASkills MCP integration](/mcp), then browse verified QA agent [skills](/skills) and apply this test matrix before the next MCP release. Use the [QASkills blog](/blog) to connect these checks with route and install coverage.`,
};
