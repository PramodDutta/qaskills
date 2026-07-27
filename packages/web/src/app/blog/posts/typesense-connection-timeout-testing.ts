import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Typesense connection timeout testing',
  description:
    'Use Typesense connection timeout testing to verify the five-second client limit and distinguish search outages from an unconfigured service.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Typesense connection timeout testing',
  keywords: [
    'Typesense connection timeout testing',
    'Typesense timeout error test',
    'search node unavailable testing',
    'Typesense client retry behavior',
    'five second connection timeout',
    'configured search outage test',
  ],
  relatedSlugs: [
    'testing-typesense-multiselect-facet-filter-queries',
    'mcp-search-filter-schema-drift-contract-tests',
    'mcp-search-response-normalization-contract-tests',
    'database-testing-automation-guide',
  ],
  sources: [
    'https://typesense.org/docs/latest/api/search.html',
    'https://github.com/typesense/typesense-js',
  ],
  repoEvidence: [
    'packages/web/src/lib/typesense/client.ts',
    'packages/web/src/lib/typesense/search.ts',
    'packages/web/src/app/api/skills/route.ts',
  ],
  content: `Typesense connection timeout testing must split two service states before measuring duration. Missing configuration makes the client factory return null, so search returns an empty result at once. A configured client facing a stalled node reaches the remote call and rejects near its five-second limit; that outage must not be reported as an unconfigured search service.

The split matters because both states may leave the user without search results, yet they need different action. Missing keys are a deploy fault. A timed-out node is a service fault, and hiding it behind the empty fallback would remove useful proof for the team.

The client factory in \`packages/web/src/lib/typesense/client.ts\` creates one node and sets \`connectionTimeoutSeconds: 5\`. The query function in \`packages/web/src/lib/typesense/search.ts\` returns an empty page only when that factory returns null. Once a client exists, its awaited search call has no local catch in that function.

This guide checks those source-backed branches without a claim about an unknown retry count or one shared error text. Use the [Typesense facet filter guide](/blog/testing-typesense-multiselect-facet-filter-queries) for good filter results, while these tests focus on configuration and transport faults.

## What Must Typesense Connection Timeout Testing Distinguish?

Typesense connection timeout testing should tell apart a missing API key, healthy response, refused connection, stalled response, server error, and response before the limit. Each state needs a target client value, time range, and result or error. Joining them under one "search unavailable" case loses the branch contract.

With no \`TYPESENSE_API_KEY\`, \`getTypesenseClient\` returns null before reading host, port, or protocol. \`searchSkills\` then returns empty skills, total zero, chosen defaults, and no remote request. That result is the configured fallback in the current source.

With an API key, the factory makes one shared Typesense client. Host defaults to localhost, port defaults to 8108, and protocol defaults to HTTP when their environment variables are absent. The timeout value is fixed at five seconds rather than read from the environment.

A healthy node should answer before the limit and return mapped hits plus facet data. A local server error should reject according to the installed client behavior, unless that client changes the response first. Capture the observed error class, status, and text rather than making up one application error shape.

Connection refusal differs from a stalled socket. Refusal often fails fast because no process takes the call, while a server that accepts and holds a response tests the timed wait. DNS lookup can form one more fault type and should not replace the planned stall.

The skills API at \`packages/web/src/app/api/skills/route.ts\` uses Drizzle directly and catches database failures into an empty response. It does not call this Typesense search function. Do not claim the route proves the client timeout unless the tested request path actually invokes \`searchSkills\`.

Start at the [skills directory](/skills) to find the current user path, but keep service-state checks at the library edge. The [MCP response normalization guide](/blog/mcp-search-response-normalization-contract-tests) can cover another caller after its real error contract is known.

Give each state one short name and one owned test host, then save whether the client was made and whether a request reached that host. These facts split configuration faults from node faults before duration enters the report. Keep the empty result and thrown error in distinct rows, even when the page looks blank in both cases. This lets an on-call reader choose the right first check without guesswork.

## How Do You Write a Typesense Timeout Error Test?

A Typesense timeout error test needs a server that accepts the TCP call and holds the HTTP response past five seconds. A closed port tests refusal, not timeout. A public address with no route adds host network rules and can make CI time hard to trust.

Use a local HTTP server bound to loopback on a free port. Let it read the request, record the path and method, and leave the response open on purpose. Close sockets in cleanup so a failed check does not hold the test process.

Measure elapsed time with \`performance.now()\` or one more clock that only moves on. Wall-clock time can shift when clocks sync and is not fit for time checks. Start the clock just before the search call and stop in a \`finally\` block.

Do not check for exactly 5,000 milliseconds. Event-loop work, connection setup, client work, and CI load add noise. Choose a low bound that proves the request did not fail at once and a high bound that finds a lost timeout without a long hung job.

First test client configuration with a saved Typesense client call. This fast case gives an explicit fault if a code change alters the node or timeout before any network test runs.

\`\`\`ts
import { beforeEach, expect, test, vi } from 'vitest';

const Client = vi.fn();
vi.mock('typesense', () => ({ Client }));

beforeEach(() => {
  vi.resetModules();
  Client.mockReset();
  process.env.TYPESENSE_API_KEY = 'test-key';
  process.env.TYPESENSE_HOST = '127.0.0.1';
  process.env.TYPESENSE_PORT = '18108';
  process.env.TYPESENSE_PROTOCOL = 'http';
});

test('constructs one node with a five second limit', async () => {
  const { getTypesenseClient } = await import('@/lib/typesense/client');
  getTypesenseClient();

  expect(Client).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: [{ host: '127.0.0.1', port: 18108, protocol: 'http' }],
      apiKey: 'test-key',
      connectionTimeoutSeconds: 5,
    }),
  );
});
\`\`\`

The integration case should use the real installed client rather than the client mock. Keep it in its own file or restore module state before import. Reusing the mocked module would give a fast false pass and never test transport duration.

Keep this test near [database automation patterns](/blog/database-testing-automation-guide) that isolate external state. The same principle applies: own the fixture, record exact inputs, and restore process state after every case.

Run the fast configuration check before the slow socket check, and stop the slow case if the client was built with the wrong port or time limit. That order saves five seconds on each bad run and gives a much clearer fault. Print the start duration, end duration, and request count as plain numbers. Do not print a secret, full stack, or all environment variables just to prove the clock ran.

## What Does Search Node Unavailable Testing Cover?

Search node unavailable testing covers faults after valid configuration makes a client. It should compare a closed loopback port, a held loopback response, an explicit server error, and a normal response. Those cases show whether duration and rejection evidence remain easy to tell apart.

For refusal, reserve a free port, close the listener, then point the client at that port at once. Record that the fault occurs before the stall span, but avoid a narrow duration goal. Another process could claim the port, so keep request and server configuration evidence.

For a stalled response, keep the listener open and take the request. The server should not send headers because a part reply may test a different client wait phase. Close each held socket after the check to make sure the process can end.

For an HTTP error, return a fixed status and small JSON body that looks like a server error only as far as the client needs. Check the rejection and saved status data if the installed client exposes it. Do not force each error type into that same status assertion.

For a healthy control, return a valid search response with \`found\`, \`hits\`, and facet data. The goal is to prove the local server and client configuration can finish before interpreting timeout faults. A test system that cannot make one good call cannot diagnose the no-result cases.

DNS faults are useful in their own host test, but name caches and system settings can change the time. Never use a known live host for a planned fault. Loopback controls give safer transport states that are easy to run again.

Typesense connection timeout testing should report node behavior, whether a request came in, elapsed milliseconds, error name, status when present, and cleanup state. Hide the API key. That report makes a CI failure actionable without showing secrets.

Use [API testing skills](/categories/api-testing) for transport fixtures, then compare schema needs with the [MCP filter drift guide](/blog/mcp-search-filter-schema-drift-contract-tests). Service health and request-shape tests should stay in their own suites.

Keep one healthy peer for each node fault, with the same host, key, path, and client build where the server mode is the only change. The peer proves that test code can serve and read a valid reply. If the healthy peer fails, mark the fault as test configuration before judging the timeout case. This rule cuts false alarms from a bad mock body, closed port, or wrong search path.

## Typesense Client Retry Behavior

Typesense client retry behavior must be seen with the installed package and test nodes, not inferred from the application's one-node array. The repository sets one node and a connection timeout, but it does not set retry counts in application code. Defaults may depend on the client version.

The official [typesense-js repository](https://github.com/typesense/typesense-js) is the approved source for client implementation and current configuration guidance. Tie goals to the version installed by this project and check them on upgrades. Avoid a broad claim that all releases retry the same way.

Instrument the delayed server with an accepted-connection counter and request counter. One logical search can then reveal how many attempts reached that controlled node. Record those counts beside elapsed time instead of assuming one request from one configured node.

If more than one try occurs, the full duration may exceed one connection span. Set the integration test ceiling from observed and documented results for the pinned version. A five-second client value does not prove the whole operation ends at exactly five seconds.

Mocked unit tests should not try to validate client retries. A mock of \`documents().search()\` only proves how \`searchSkills\` reacts to fulfillment or rejection. Keep retry observation in a real-client transport test where the package owns the calls.

Use a small package-version assertion in the diagnostic report, but do not make a patch release string the main behavioral assertion. The key contract is the configured timeout and application fallback split. Version data helps explain a changed observation after dependency updates.

The search call itself should stay once per application invocation. Spy on the client method at the application layer and assert one call, then let the client transport layer report its internal attempts. This prevents test terminology from mixing application calls with network retries.

Typesense connection timeout testing becomes clearer when retry evidence is optional but explicit. If current source or approved documentation cannot support a count, assert bounded completion and preserve counters for diagnosis rather than making a fixed rule.

Count each socket and HTTP request with small whole numbers, then show those facts next to the package version used by the run. Do not call a socket a retry unless the client starts it for the same application invocation. If the count shifts after an upgrade, rerun the same host script before changing the expected end duration. A plain trace is more useful than a firm claim that the source does not back.

## How Do You Assert the Five Second Connection Timeout?

Typesense connection timeout testing should check the five second connection timeout with low and high time bounds around a planned stalled response. The low bound proves the test reached a wait state. The high bound stops a removed or ignored timeout from hanging the suite.

A useful first span might allow several hundred milliseconds below five seconds and enough time above it for job delay. Set the final values from many runs in the project's CI job. Do not widen the cap until most wait times pass.

Start a watchdog past the test cap so the test process can close the server and sockets. The watchdog is a test safety bound, not proof of client results. Its fault text should say that the client went past the allowed span.

Measure from just before \`searchSkills\` to the error seen by the caller. That time includes the edge users face at this function. A low transport test may track socket phases on its own if fault work needs them.

The error check should be broad enough for the transport type and strict enough to prove the throw. Check that an error object exists, then capture stable fields shown by the installed client. Avoid snapshots with stack paths, ports, time data, or system wording.

Run the time case alone if local host load has a real effect on it. Unit tests can run at once elsewhere, but several planned five-second stalls fight for sockets and extend the job. One stalled live case plus fast branch mocks often gives a better sign.

Use the [search filter article](/blog/testing-typesense-multiselect-facet-filter-queries) as a healthy request control. It should not be made dependent on the delayed server, because successful query semantics deserve a short feedback loop.

At last, check cleanup in \`afterEach\`. Close the HTTP server, destroy held sockets, reset code state, and restore each Typesense process key. A green timeout check with a leaked handle is still a broken test.

Set the lower time bound far enough from a quick refusal that the two cases cannot trade places under normal CI load. Set the top bound near the known client path, with a small pad for the host job. Review both bounds from a set of saved runs instead of one fast laptop result. Typesense connection timeout testing should fail when the wait is far too short or far too long.

## Configured Search Outage Test Versus No Configuration

A configured search outage test must reject from the remote call, while the no-setup case must return the clear empty result without calling any node. These are the two most key branch checks. They stop a broad catch from wiping out the split.

The unit test can mock \`getTypesenseClient\` as null for one case and as a client that throws for another. It should check page defaults in the first result and keep the exact error object in the second. That proves current \`searchSkills\` flow without a five-second wait.

\`\`\`ts
import { expect, test, vi } from 'vitest';

const search = vi.fn();
const getTypesenseClient = vi.fn();

vi.mock('@/lib/typesense/client', () => ({
  SKILLS_COLLECTION: 'skills',
  getTypesenseClient,
}));

test('returns an empty page only when configuration is absent', async () => {
  getTypesenseClient.mockReturnValue(null);
  const { searchSkills } = await import('@/lib/typesense/search');

  await expect(searchSkills({ query: 'api' })).resolves.toEqual({
    skills: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  expect(search).not.toHaveBeenCalled();
});

test('preserves a configured client rejection', async () => {
  const outage = new Error('controlled node outage');
  getTypesenseClient.mockReturnValue({
    collections: () => ({ documents: () => ({ search }) }),
  });
  search.mockRejectedValue(outage);
  const { searchSkills } = await import('@/lib/typesense/search');

  await expect(searchSkills({ query: 'api' })).rejects.toBe(outage);
});
\`\`\`

Reset code state between quite different factory states. The client value is file scoped and stores the first set client, so changing host keys after it is made does not build it again. Tests that ignore this shared value can reach the prior server by mistake.

Environment isolation should save whether each variable existed, not only its value. Cleanup must delete originally absent keys and restore present keys exactly. Setting an absent key to the string \`undefined\` changes the factory branch.

Do not use the SQL skills route as proof of this fallback. Its GET handler catches its own database errors and returns an empty payload, which is a distinct result. The [skills directory](/skills) may join data paths in the UI, so find the real caller before writing an end-to-end goal.

Typesense connection timeout testing should fail if a new catch turns the set-client error into the null-client result without a clear product choice. Such a change alters logs and user state, even if both responses contain zero skills.

Write the two branch results side by side in the test name and report, with null client on one side and remote error on the other. Keep their page data, call count, and elapsed range in the same fixed order. A code review can then see if a new catch joins paths that were once distinct. This makes the configured search outage test useful even when the UI has one shared empty state.

## Configuration and Failure Outcome Matrix

The failure matrix below states what the repo proves and what the live fixture should see. Time values use set ranges rather than exact clock marks. Totals that depend on retries stay as seen facts for the installed client.

| API key | Node behavior | Client returned | Expected elapsed time | searchSkills outcome | Assertion |
|---|---|---|---|---|---|
| Missing | No request | Null | Immediate | Empty page | Search method never called |
| Present | Healthy node | Client | Below timeout | Mapped result | Known hit and total |
| Present | Connection refused | Client | Usually early | Rejection | Request cannot complete |
| Present | Stalled response | Client | Near bounded limit | Rejection | Lower and upper duration |
| Present | Server error | Client | Before timeout | Rejection | Stable status when exposed |
| Present | Response before timeout | Client | Controlled delay | Mapped result | No premature timeout |

The missing row should run first in a fresh code state because it has no network need. The healthy row checks the local wire fixture. Fault rows then have a sound control and a clear owner when they fail.

Add one response at a planned wait below five seconds, such as a short one-second pause. Check success rather than an exact time. This catches a timeout set in the wrong unit or set far below the planned limit.

The matrix avoids one retry count for all clients. Add counters to the run report and compare them when the package changes. If the team later adopts a backed retry rule, make that seen fact its own contract.

Keep API key values out of snapshots and exception logs. Use a fixed fake key accepted by the local fixture. Production credentials should never be required for this suite.

Review the [database testing guide](/blog/database-testing-automation-guide) for process-state cleanup and the [categories page](/categories) for other searchable navigation paths. Do not let broad UI checks replace this client-state matrix.

The [Typesense search API](https://typesense.org/docs/latest/api/search.html) defines the remote search request used by the client, while the local source defines what happens when no client exists. Keep both links in the proof sheet so the wire call and app branch are easy to trace. For each row, name the first owner that can change its result. This keeps the matrix tied to facts rather than broad ideas about all search tools.

## How Do You Run a Deterministic Timeout Procedure?

A stable timeout procedure owns process keys, code state, server mode, time, and cleanup. Run it in one worker when time cases share a loopback server. Fast mocks can still run at once without an effect on the transport span.

1. Save and isolate every Typesense environment variable.
2. Verify a missing API key returns the unconfigured empty result.
3. Start a loopback HTTP server that accepts but delays its response.
4. Configure a fresh client module for that server and call \`searchSkills\`.
5. Measure monotonic elapsed time and assert a bounded rejection window.
6. Restore environment state, destroy sockets, and close the server.

Begin with a helper that records which keys were present at first. Set host to \`127.0.0.1\`, use the listener's free port, choose HTTP, and provide a fake API key. Import the client and search code only after those keys are ready.

Record each inbound path so the test proves the request reached the test server. If no request arrives, mark the result as setup, DNS, wire, or client fault rather than a valid timeout. This small count stops false green time checks.

After the stall case, run one fresh-code healthy case against the same server mode with a valid response at once. The healthy case proves the suite can finish the planned API call and that stall cleanup did not spoil later calls.

Typesense connection timeout testing should keep a short report with elapsed time, request count, held sockets, client version, and stable error fields. Leave out payload secrets and full stacks. That report is enough to compare CI runs after a package update.

Use [search reliability skills](/skills) to run the steps, then add caller-specific results only after tracing the real request path. The [MCP search normalization article](/blog/mcp-search-response-normalization-contract-tests) offers a useful next edge once the client result is stable.

At the end, prove the server is shut, all held sockets are gone, and each saved process key has its prior state. Run a quick healthy call in fresh code if a leak has caused past flakes. Keep the final log small enough to read on one screen, with one line for setup, wait, error, and cleanup. A test that owns its end state can run many times with the same clear result.

- no key means no client and no network call
- one fake key is used for the loopback host
- one closed port proves a fast refusal path
- one held reply proves the timed wait path
- one good reply proves the host can serve search
- one clock source measures all elapsed spans
- one request count shows that the host was reached
- one error record keeps only stable safe fields
- one cleanup pass closes each server and socket
- no live search node or real secret is required

## Frequently Asked Questions

### Is the connection timeout also a request timeout?

The repo sets \`connectionTimeoutSeconds\` on the Typesense client, but it does not define distinct app time phases. Test the seen time at \`searchSkills\`, then read the approved client page for finer rules. Do not rename the setting or promise work that the app source does not prove.

### Does a missing API key cause a timeout?

No. The factory returns null at once when the API key is absent, and \`searchSkills\` returns an empty page without calling a node. That branch is a setup fallback. A timeout needs a set client and a remote call that stays open near its limit.

### How should tests reset the singleton client?

Reset loaded code, restore process keys, and import the client only after each case has set its state. The file-scoped client has no exported reset function. Changing host or port after the first build will not replace the saved client in that code state.

### Should CI assert exactly five elapsed seconds?

No. Use a bounded window around the configured limit and measure with a monotonic clock. Exact timing is sensitive to connection setup, event-loop scheduling, retries, and worker load. Keep the lower bound meaningful and the upper bound tight enough to detect a missing timeout.

### Can one test assume the Typesense retry count?

Only when the pinned client version and approved source page back that goal. The app supplies one node but no set retry count. Count requests and keep the seen tries. Keep client timeout, app call count, and client transport tries as distinct facts.

### Should a configured outage return an empty result?

Not under the current \`searchSkills\` code. The empty result belongs to a null client caused by missing setup. A set client's failed search is awaited without a local catch, so callers get the error unless another checked layer handles it outside this function.

## Conclusion

Typesense connection timeout testing must keep the split between absent setup and a set node that is down. Fast branch tests prove null-client fallback and error flow, while a loopback server with a held reply checks the five-second setting with safe time bounds. Retry counts stay as seen client facts unless approved proof makes them part of the contract.

Browse [search reliability skills](/skills), add the test timeout server, and run the full state matrix before changing fallback or client setup. A clear fault report should name setup, node mode, elapsed time, and the layer that owned the result.`,
};
