import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP search fallback behavior testing',
  description:
    'MCP search fallback behavior testing with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP search fallback behavior testing',
  keywords: [
    'MCP search fallback behavior testing',
    'MCP empty result ambiguity',
    'search API silent fallback',
    'database outage search contract',
    'zero results versus failure',
    'MCP degraded mode test',
  ],
  relatedSlugs: [
    'mcp-search-response-normalization-contract-tests',
    'mcp-server-testing-guide-2026',
    'qaskills-mcp-server-guide',
    'mcp-server-contract-testing-guide',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
    'https://developer.mozilla.org/en-US/docs/Web/API/Response',
    'https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x',
  ],
  repoEvidence: [
    'packages/web/src/app/api/skills/route.ts',
    'packages/mcp/src/index.ts',
    'packages/mcp/package.json',
  ],
  content: `MCP search fallback behavior testing must compare a healthy zero-match query with an injected database fault behind the same request. In the current code, both paths can return successful empty data, so tests need fault-injection proof or a separate health signal. The MCP result alone cannot identify the cause.

## What must MCP search fallback behavior testing prove?

MCP search fallback behavior testing must prove both the visible equality and the hidden cause of two empty searches. The suite should hold the query fixed, force each API branch, capture status and body, invoke the MCP tool, and label each result with independent fault evidence.

The core answer is a limit, not a parsing trick. A consumer cannot tell healthy zero matches from the current database fallback by reading only the normalized MCP text.

Tests can still tell them apart because they own the setup. One case returns a real empty row set, while another makes the database query reject and records that planned fault.

The first oracle checks what users see. Both API responses currently have an empty \`skills\` array and zero \`total\`, and both use a successful HTTP status.

The second oracle checks why it happened. A database spy, fault flag, or health endpoint must show whether the query ran successfully or threw before response creation.

Keep the search input identical in both cases. Use one rare synthetic query, the same sort, page, limit, and filters so no request change can explain the result.

Add a nonempty control before the pair. It proves that the route mock, MCP base override, JSON reader, and result parser can carry a real skill.

An error hidden as empty data is a degraded state. Do not call it a confirmed no-match result in dashboards, agents, or tests without an added cause signal.

The [MCP search normalization article](/blog/mcp-search-response-normalization-contract-tests) covers projection of successful JSON. This suite starts one layer earlier and asks whether success JSON tells the truth about service health.

Use the [QASkills MCP page](/mcp) for tool context and the [skills directory](/skills) for a human search view. Neither page changes the API fallback contract found in source.

The [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) defines tool results and error signaling. QASkills application code decides whether a backing failure becomes an error result or normal data.

MCP search fallback behavior testing passes when the suite exposes present ambiguity and never labels the outage row as a proven zero match. A desired future contract should fail until the API adds a stable degraded signal.

## Which repository behavior defines the contract?

The route contract lives in \`packages/web/src/app/api/skills/route.ts\`. Its GET handler parses search, sort, page, limit, and repeated filter values before entering the database block.

Inside the try block, it builds conditions and runs row and count queries with \`Promise.all\`. A normal empty result yields no rows, a zero count, page data, and a default successful status.

The catch block does not inspect the error. It returns \`skills: []\`, \`total: 0\`, the requested page, and \`totalPages: 0\` through \`NextResponse.json\`.

No status argument is passed in that catch branch. The resulting response uses the normal success status, so status checks cannot split the two empty cases today.

The [Web Response reference](https://developer.mozilla.org/en-US/docs/Web/API/Response) describes status and body access. It supports testing those fields, but it cannot supply cause data that the application omitted.

The MCP path begins in \`packages/mcp/src/index.ts\`. The \`search_skills\` tool calls \`getJson\` for \`/api/skills\` with mapped query fields and a bounded limit.

\`fetchWithTimeout\` throws only when the HTTP response is not successful, fetch fails, or the call times out. A successful fallback body therefore moves to JSON parsing as normal data.

Next, \`normalizeSearchResponse\` keeps \`total\` and maps selected skill fields. It drops page fields, so the MCP result for either empty API body becomes \`{"total":0,"skills":[]}\`.

The tool wraps that object as pretty JSON inside text content. Since no exception occurs, \`isError\` is not set for the database fallback.

Package evidence in \`packages/mcp/package.json\` fixes the bin path, Node floor, SDK range, and build command. A system test should launch that bin after a fresh build.

The [MCP TypeScript SDK v1 branch](https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x) is the approved SDK source for the client and server generation used here. Pin the installed lockfile revision in failure logs.

Repository behavior does not expose a health field, warning, or fallback marker in this chain. Tests must not invent one while describing the current result.

A desired response could use non-success HTTP status, explicit \`degraded\` data, or tool error content. Choosing among those options is a product change, not part of this article's characterization.

The [MCP server guide](/blog/qaskills-mcp-server-guide) gives the wider call flow. MCP search fallback behavior testing remains focused on this one loss of cause between database, route, and tool.

## How should QA teams test MCP empty result ambiguity?

MCP empty result ambiguity is best tested at two layers. First call the route with controlled database outcomes, then pass each successful body through the real MCP tool path.

At route level, save status, content type, JSON, and the database plan used. The healthy plan resolves two queries, while the fault plan rejects one query with a test-owned error.

At tool level, run the built stdio server against a local API that can serve either saved body. Compare the parsed MCP text and expect exact equality for current behavior.

The equality assertion is valuable because it locks the known gap. If one path later gains a warning or error, the test will demand a reviewed contract update.

The first code example calls the real GET handler after replacing the database chain. It proves the catch branch uses a successful status and the empty shape from \`packages/web/src/app/api/skills/route.ts\`.

\`\`\`typescript
import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';

const { select } = vi.hoisted(() => ({ select: vi.fn() }));
vi.mock('@/db', () => ({ db: { select } }));
vi.mock('@/lib/api-auth', () => ({ getAuthUser: vi.fn() }));
vi.mock('@/lib/email/send', () => ({ sendNewSkillAlert: vi.fn() }));

import { GET } from '@/app/api/skills/route';

function rejectedQuery(error: Error) {
  const query = {
    from: () => query,
    where: () => query,
    orderBy: () => query,
    limit: () => query,
    offset: () => Promise.reject(error),
    then: (
      resolve: (value: never) => unknown,
      reject: (reason: Error) => unknown,
    ) => Promise.reject(error).then(resolve, reject),
  };
  return query;
}

beforeEach(() => select.mockReset());

it('returns the current empty success body when the row query fails', async () => {
  const fault = new Error('planned database outage');
  select.mockReturnValue(rejectedQuery(fault));

  const response = await GET(
    new NextRequest('http://local.test/api/skills?q=no-such-fixture&page=2&limit=10'),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    skills: [],
    total: 0,
    page: 2,
    totalPages: 0,
  });
  expect(select).toHaveBeenCalled();
});
\`\`\`

This case should not assert a console message because the GET catch does not log its error. The stable facts are the injected rejection, successful status, and exact body.

Build a second route helper whose row query resolves to \`[]\` and count query resolves to \`[{count: 0}]\`. Its body should equal the fault body when page and limit are the same.

Keep separate names such as \`healthy-empty\` and \`db-fault-empty\`. Generic snapshots called \`empty response\` can hide which cause produced a fixture.

MCP search fallback behavior testing should then parse the text returned by \`search_skills\`. Expect the same total and list while retaining the test-owned cause beside each capture.

Do not claim the MCP SDK caused this ambiguity. The SDK carries the application result; the route and normalizer omit the distinguishing cause.

## Test matrix for search API silent fallback

A search API silent fallback matrix should cross data outcome, HTTP outcome, JSON shape, and independent health proof. These rows keep a valid zero apart from failures that merely look empty.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
| --- | --- | --- | --- | --- |
| Healthy zero match | DB rows empty, count zero | HTTP 200 with empty body shape | Health spy reports a thrown query | \`packages/web/src/app/api/skills/route.ts\` |
| Database rejection | Row or count query throws | Current HTTP 200 with same empty shape | Test labels response as proven no match | search API silent fallback |
| Healthy nonempty | One row and count one | MCP text carries one projected skill | Fixture cannot return known data | \`packages/mcp/src/index.ts\` |
| API non-success | Local stub returns 503 | MCP result has \`isError: true\` | Tool emits normal empty data | MCP tools specification |
| Invalid JSON | HTTP 200 with broken body | MCP result has a parse error | Result becomes an empty list | Web Response JSON reader |
| Missing skills field | HTTP 200 with only total zero | Normalizer defaults list to empty | Test calls this a DB outage | MCP empty result ambiguity |
| Slow API | Stub exceeds ten seconds | MCP timeout error text | Suite records zero matches | \`packages/mcp/package.json\` |
| Fault plus health flag | DB throws and side channel says degraded | Test classifies cause as outage | Side channel is lost from report | database outage search contract |
| Repeated healthy query | Same rare query twice | Both runs stay healthy and empty | Cache or mock fault changes cause | zero results versus failure |

The non-success row proves existing MCP error handling works when status carries failure. That contrast shows why the route's successful fallback loses the cause.

The invalid JSON row also produces a tool error because JSON parsing throws. Keep it separate from database fallback, which returns valid JSON.

Missing fields test normalizer defaults, not service health. A field default cannot be used as proof that a database fault occurred.

The timeout row should use fake timers only at unit level. A black-box package case can use a shorter test-owned seam, since waiting ten seconds for every CI row is costly.

The health flag is test metadata unless the product exposes it. Store it beside the observed result and state clearly that MCP users do not receive that field today.

Use the [MCP contract testing guide](/blog/mcp-server-contract-testing-guide) to place this matrix among status, timeout, and invalid-body checks. Do not merge their expected outputs.

MCP search fallback behavior testing needs at least one row that fails under a naive \`skills.length === 0\` check. The planned database rejection supplies that guard.

## What failures expose database outage search contract?

The database outage search contract is exposed when fault injection proves a query threw while the route and tool still report normal empty data. That mismatch is the main failure signal.

Inject the error at the database promise, not at fetch. A fetch error exercises MCP network handling and already creates an error result.

Test row-query and count-query rejection separately. Both promises start together, and either failure enters the same route catch branch.

Make the planned error unique, such as \`db-fault-token-29\`. The test log can prove the intended fault fired without matching a real driver message.

Do not rely on call count alone. A database mock can be called and still resolve, so save whether the exact planned promise rejected.

The suite should reject a fake outage case where the injector never ran. Otherwise, a healthy empty result could satisfy both branches and leave the gap untested.

Capture API status before reading JSON. Reading only the body hides the fact that the fallback is a successful response under the current route.

Then invoke \`search_skills\` and parse the first text content item. Assert that \`isError\` is absent and the parsed object is exactly empty for the characterization test.

That assertion may look counterintuitive, but it documents present behavior. Add a separate desired-contract test, skipped only with a tracked issue, if the team plans to expose degradation.

Do not weaken the current test to accept either error or data. A two-outcome expectation cannot detect a silent contract change and gives callers no stable rule.

The [MCP server testing guide](/blog/mcp-server-testing-guide-2026) can track the future choice. Until then, reports should say "empty result with unknown health" rather than "no skills found."

MCP search fallback behavior testing should preserve request filters in each capture. A malformed or lost query can also yield empty data, but that is a different failure owner.

## CI coverage for zero results versus failure

CI coverage for zero results versus failure should run route tests on web changes and black-box tool tests on MCP changes. A shared contract fixture joins both jobs.

The web job owns the two route bodies and their known causes. It should fail if status, fields, page values, or fault activation change without review.

The MCP job owns how each saved API response becomes tool content. It should build \`@qaskills/mcp\`, point it at a loopback stub, and compare parsed text.

Run one integration job when either side changes the shared fields. The route can add a signal that the MCP normalizer later drops, leaving users with the same ambiguity.

Use a rare fixed query rather than live catalog data. Seed changes must not turn the healthy empty row into a nonempty result.

Do not call production search from CI. A live database outage, new skill, cache, or network rule would make the cause unknown again.

Keep the fault injector narrow and reset it after each case. A rejected query left in shared state can make later controls appear degraded.

Save small artifacts: request URL, planned cause, route status, route JSON, tool envelope, parsed tool text, and child exit state. No database credentials are needed.

Block release if a degraded row is labeled healthy, a healthy row is labeled degraded, or cause metadata is absent from the test report. The visible equality itself remains expected today.

Run the matrix without retries. A retry can use a reset mock and hide that the first fault case never reached its intended branch.

The [QASkills blog](/blog) can link this contract for release owners. The executable checks belong beside the packages that own each step.

MCP search fallback behavior testing should also run after SDK upgrades. Transport shape may stay stable, but error wrapping or text output can change around non-success cases.

## How should MCP degraded mode test be asserted?

An MCP degraded mode test must assert cause and output as separate facts. The current output is empty normal data, while the injected cause is a database failure.

Use a typed record with \`cause\`, \`status\`, \`apiBody\`, and \`toolResult\`. Avoid a single boolean named \`passed\`, which hides the key mismatch.

The healthy record should say \`cause: 'healthy-zero'\`. The fault record should say \`cause: 'database-fault'\`, even though their visible fields compare equal.

The second code example captures that rule around a real MCP client. A loopback stub serves saved API data, while test metadata retains how that data was produced.

\`\`\`typescript
import { createServer } from 'node:http';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { expect, it } from 'vitest';

type SearchObservation = {
  cause: 'healthy-zero' | 'database-fault';
  apiStatus: number;
  apiBody: { skills: unknown[]; total: number; page: number; totalPages: number };
  toolBody: { skills: unknown[]; total: number };
  isError: boolean;
};

async function startOneResponseApi(
  status: number,
  body: SearchObservation['apiBody'],
) {
  const server = createServer((request, response) => {
    if (!request.url?.startsWith('/api/skills?')) {
      response.writeHead(404).end();
      return;
    }
    response
      .writeHead(status, { 'content-type': 'application/json' })
      .end(JSON.stringify(body));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No fixture port');
  return {
    baseUrl: \`http://127.0.0.1:\${address.port}\`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function startBuiltMcpClient(apiBase: string) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve('packages/mcp/dist/index.js')],
    env: {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? process.cwd(),
      QASKILLS_API_URL: apiBase,
      DO_NOT_TRACK: '1',
    },
  });
  const client = new Client({ name: 'fallback-contract', version: '1.0.0' });
  await client.connect(transport);
  return { client, close: () => transport.close() };
}

async function observeSavedResponse(
  cause: SearchObservation['cause'],
  status: number,
  body: SearchObservation['apiBody'],
): Promise<SearchObservation> {
  const api = await startOneResponseApi(status, body);
  const harness = await startBuiltMcpClient(api.baseUrl);
  try {
    const result = await harness.client.callTool({
      name: 'search_skills',
      arguments: { query: 'no-such-fixture', limit: 10 },
    });
    const text = result.content.find((item) => item.type === 'text')?.text;
    if (!text) throw new Error('Missing search text');
    return {
      cause,
      apiStatus: status,
      apiBody: body,
      toolBody: JSON.parse(text),
      isError: result.isError === true,
    };
  } finally {
    await harness.close();
    await api.close();
  }
}

it('records why two equal MCP search results were produced', async () => {
  const body = { skills: [], total: 0, page: 1, totalPages: 0 };
  const healthy = await observeSavedResponse('healthy-zero', 200, body);
  const outage = await observeSavedResponse('database-fault', 200, body);

  expect(outage.toolBody).toEqual(healthy.toolBody);
  expect(outage.toolBody).toEqual({ skills: [], total: 0 });
  expect(outage.isError).toBe(false);
  expect(healthy.cause).not.toBe(outage.cause);
});
\`\`\`

The helper should close its child and stub in a \`finally\` block in production test code. Cleanup does not change the main assertion, but leaked children can taint later request logs.

\`startOneResponseApi\` must check the exact search path and reject unrelated calls. This case sets privacy off so no telemetry path should be involved.

The record is not a proposed user response. It is a test report that prevents the known cause from vanishing during automated checks.

For a desired product contract, change the outage fixture to expect a non-success status or explicit marker. Keep that test separate until source implements the choice.

MCP search fallback behavior testing should never infer outage from zero count alone. It should infer outage only from controlled injection or a trusted independent signal.

## Step-by-step test implementation

Implement MCP search fallback behavior testing in six steps. Each step should retain cause before comparing the two visible results.

1. Read \`packages/web/src/app/api/skills/route.ts\` and record normal empty, catch fallback, status, page fields, and the exact point where database promises can reject while preserving one fixed request for both causes and one stable page value.
2. Build healthy-empty, healthy-nonempty, row-fault, and count-fault database plans for one fixed query, with a flag proving each planned branch ran before any output is classified or saved as a fixture.
3. Call the real GET handler, save status and JSON by cause, and verify healthy empty equals the current fault body without calling either result healthy by default in reports or snapshot names.
4. Serve each saved response from a loopback API, launch the built MCP package, call \`search_skills\`, and compare the exact parsed text result with its route capture and known cause record.
5. Add non-success, invalid JSON, timeout, missing field, repeated query, and disabled-injector cases to prove every classifier and guard rejects a false cause before the release report is written.
6. Run web and MCP jobs on owning changes, retain compact cause records, and block release when a fault is mislabeled or a planned branch does not execute as designed in the clean run, then rerun the known nonempty control beside both empty causes and compare their request, route, tool, and child records without a retry or skipped control.

Step one prevents the test from assuming a non-success status that source does not set. It also records that the catch discards the actual error.

Step two gives the suite a healthy control and two real fault edges. Use test-owned errors so reports do not depend on database driver wording.

Step three makes visible equality an explicit assertion. If the route changes, reviewers can decide whether ambiguity was fixed or merely changed.

Step four catches fields lost by MCP projection. A route-only signal has no user value if the tool drops it before creating text.

Step five checks the classifier itself. In particular, a disabled fault injector must fail rather than pass as another empty outage row.

Step six assigns clear owners. Web owns fallback status and body, while MCP owns fetch handling, projection, and tool error shape.

Use [getting started](/getting-started) for local package setup. Keep fixture commands pinned to workspace builds so the tested code matches the inspected revision.

MCP search fallback behavior testing is complete only when both equality and cause are visible in one report. Either fact alone gives an incomplete result.

## Failure triage and regression ownership

Start triage with the cause flag. If a fault row lacks its planned rejection, fix the injector before discussing route or MCP behavior. If route status or JSON differs between runs with the same cause, inspect shared mocks, cache state, page input, and promise reset order.

If the route shows a new degraded field but MCP text stays empty, assign the loss to normalization in \`packages/mcp/src/index.ts\`.
If the route returns non-success and MCP still reports normal data, inspect \`fetchWithTimeout\`, the local stub, and whether the child used the intended API base.

If invalid JSON becomes empty data, inspect JSON parsing and any catch that replaces parse errors. That path is not the database fallback.

If a healthy nonempty row becomes empty, inspect route mocks and field projection before labeling an outage. The known row should always prove the data path works.

If only count-query faults fail to activate, check thenable mocks and \`Promise.all\` timing. Both database calls begin before the route waits for their pair.

If the tool child exits, retain standard error and the last MCP message. Process failure is more severe than the silent fallback and needs its own owner.

If a proposed health probe disagrees with injected cause, do not trust it by default. Validate probe timing and which database pool it observes.

If reports say "no matches" for the fault row, fix the test wording even when assertions pass. Misleading labels can train later code to preserve the same error.

The [MCP server contract guide](/blog/mcp-server-contract-testing-guide) helps route transport faults. Keep the planned database token in the web issue when that is the true cause.

Close a regression only when healthy, fault, and nonempty controls all pass in one clean run. This trio proves both classification and normal search still work. MCP search fallback behavior testing gives a strict result: empty data with no cause signal remains ambiguous, not healthy by default.

## Frequently Asked Questions

### Can MCP output distinguish a valid zero result from the current database fallback?

No. Both paths can reach the tool as successful JSON with zero total and an empty skills list. Tests can distinguish them only because they control the database fault or observe another trusted health signal. A user reading the current MCP text alone cannot recover the discarded cause.

### What creates MCP empty result ambiguity?

The skills route catches a database error and returns the same key values as a healthy empty query with a successful status. The MCP fetch accepts that status, and its normalizer keeps only total and skills. Page data and the original database error do not reach the tool result.

### How should search API silent fallback be tested?

Hold one request fixed, resolve the database to a true empty set, then make the same query promise reject. Save cause, status, and body for each run. After proving the bodies match, pass both through the built MCP server and compare parsed tool text without losing cause labels.

### What is the database outage search contract today?

Today, the cited GET catch returns empty skills, zero total, the requested page, and zero total pages without setting a failure status. The MCP tool treats that valid success body as normal data. This is a characterization of current source, not a claim that silent fallback is ideal.

### Why test zero results versus failure with a nonempty control?

A known nonempty row proves the route mock, loopback API, child base override, JSON parser, and MCP projection can carry data. Without it, two empty outputs might come from a broken fixture rather than the intended healthy and fault branches, leaving the central comparison unproven.

### What should an MCP degraded mode test report?

Report the controlled cause, route status, route body, tool envelope, parsed tool text, request URL, and child state. Keep cause outside the current user payload unless product code exposes it. The test passes when it preserves the ambiguity and rejects any false label of confirmed zero matches.

## Conclusion

MCP search fallback behavior testing must preserve both the visible result and its hidden cause. The current successful fallback becomes the same empty MCP text as a healthy query, so only controlled faults or an independent signal can classify it safely.

Review the [QASkills MCP integration](/mcp), then browse verified QA agent [skills](/skills) and apply this test matrix before the next MCP release. Return to the [blog index](/blog) for related route, timeout, and normalization checks.`,
};
