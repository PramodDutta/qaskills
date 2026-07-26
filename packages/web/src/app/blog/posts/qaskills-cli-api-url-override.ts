import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills CLI API URL override',
  description:
    'QASkills CLI API URL override: use real repo paths, focused tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'QASkills CLI API URL override',
  keywords: [
    'QASkills CLI API URL override',
    'QASKILLS_API_URL',
    'qaskills staging API',
    'qaskills local API testing',
    'CLI base URL environment variable',
    'strip trailing slash base URL',
    'mock qaskills API',
  ],
  relatedSlugs: [
    'test-environment-management-guide',
    'error-handling-testing-patterns',
    'mcp-api-timeout-abortcontroller-testing',
    'typescript-testing-patterns-guide',
  ],
  sources: [
    'https://nodejs.org/api/process.html#processenv',
    'https://url.spec.whatwg.org/',
    'https://nodejs.org/api/url.html',
  ],
  repoEvidence: [
    'packages/cli/src/lib/api-client.ts#BASE',
    'packages/cli/src/lib/api-client.ts#buildUrl',
    'packages/cli/e2e/e2e.mjs#API',
    'packages/cli/src/lib/api-client.ts#searchSkills',
  ],
  content: `QASkills CLI API URL override reads \`QASKILLS_API_URL\` when the API client module loads, falls back to \`https://qaskills.sh\`, and removes one final slash; requests then use the URL constructor with root-relative API paths. Set the variable before starting or importing the CLI, and test the final captured request URL.

## What does QASkills CLI API URL override guarantee?

QASkills CLI API URL override guarantees that CLI API helpers use one environment-selected origin instead of the production default; the module trims one trailing slash, while \`buildUrl\` resolves each root-relative path and serializes query values. This contract covers the CLI client, not the separately configurable TypeScript SDK.

The implementation lives in \`packages/cli/src/lib/api-client.ts\`, and its module-level \`BASE\` expression evaluates \`process.env.QASKILLS_API_URL || 'https://qaskills.sh'\`, then applies \`.replace(/\\/$/, '')\`. The value is fixed for that loaded module instance.

That timing is the first important test fact; setting the variable after importing \`searchSkills\` does not update \`BASE\`. A reliable unit test resets the module registry, changes the environment, and dynamically imports the client only after the fixture value exists.

The [Node environment variable documentation](https://nodejs.org/api/process.html#processenv) explains that \`process.env\` exposes string values; in this implementation, an unset value and an empty string both choose production because the expression uses logical OR. Whitespace is truthy and therefore becomes an attempted base URL rather than a default.

Every public helper supplies a path beginning with \`/api/\`, and \`buildUrl\` creates \`new URL(path, BASE)\`, adds defined query entries, and returns \`url.toString()\`. The [WHATWG URL Standard](https://url.spec.whatwg.org/) defines this parsing and serialization model.

The guarantee is observable at \`fetch\`, not through an exported base constant. \`BASE\` and \`buildUrl\` are private to the module. Tests should call \`searchSkills\`, \`getSkill\`, or another public helper, then inspect the URL received by a controlled fetch function.

Use the [getting started page](/getting-started) for normal CLI setup and the [skills catalog](/skills) for production behavior. The test described here replaces that origin with a local listener, staging endpoint, or in-process mock.

## How does QASKILLS_API_URL work?

\`QASKILLS_API_URL\` is read exactly once during module evaluation. A value such as \`http://127.0.0.1:43117/\` becomes \`http://127.0.0.1:43117\`. A later call to \`searchSkills({ query: 'playwright' })\` resolves \`/api/skills\` against that base and appends the query.

\`\`\`typescript
const BASE = (process.env.QASKILLS_API_URL || 'https://qaskills.sh').replace(/\\/$/, '');

function buildUrl(pathname: string): string {
  return new URL(pathname, BASE).toString();
}
\`\`\`

The source helper accepts more than a pathname, but the small excerpt shows the endpoint-selection contract. The regular expression removes only one slash at the end. It does not trim spaces, validate protocol allowlists, remove several slashes in a loop, or preserve a base pathname.

A root-relative request path replaces any pathname already present in the base. For example, a base ending in \`/gateway\` still resolves \`/api/skills\` at the origin root. If a reverse proxy requires a prefix, current CLI helpers will not preserve it. A test should record this boundary instead of promising prefix support.

The [Node URL API](https://nodejs.org/api/url.html) documents the same standards-based \`URL\` class available in Node. It also explains \`URLSearchParams\`, which \`buildUrl\` uses through the URL object's \`searchParams\` property.

When the base is malformed, constructing a URL throws before \`request\` starts its timeout or calls fetch. \`searchCommand\` catches that rejection in its broad catch and reports that search failed. A helper-level test can assert the URL error, while a command-level test should assert the user-facing failure boundary.

Protocol is not restricted by the source expression. The URL constructor accepts supported absolute schemes according to its parser, although native fetch may reject a scheme later. Keep local fixtures on \`http://127.0.0.1\` and staging fixtures on HTTPS so the test models actual transport.

QASkills CLI API URL override does not read a \`.env\` file itself. Whatever launches the process must populate \`process.env\`. This separation keeps the client small and makes test setup explicit.

## Which cases define qaskills staging API?

A qaskills staging API matrix begins with a valid absolute HTTPS origin and a response owned by the test team. The success case should inspect the complete request URL, method, headers, signal, and decoded result. It should not rely only on a returned skill count.

Test a staging value with no trailing slash and the same value with one trailing slash. Both should produce one canonical \`/api/skills\` boundary. This pair detects accidental string concatenation if \`buildUrl\` is replaced during refactoring.

An environment value with two final slashes is a useful characterization case. The regex removes one, leaving one in \`BASE\`; the root-relative request still resolves at the origin root. Assert the actual URL constructor result instead of assuming the normalization expression removed every slash.

Include a base with a pathname, such as \`https://staging.example.test/proxy\`. The expected request is \`https://staging.example.test/api/skills\`, not a path under \`/proxy\`. That behavior follows root-relative resolution and may reveal a deployment configuration mistake.

For malformed input, use a value such as \`not-a-url\`. Calling a public API helper should reject before fetch receives anything. This case proves invalid endpoint configuration is not confused with a server status failure.

Run the fixture twice after separate module resets. The second run should use the second environment value. Without resetting modules, the unchanged URL is expected because \`BASE\` was already initialized.

Keep staging credentials out of this suite. The CLI API client sends a JSON content type and user-agent for every request, but the search helper does not add authentication. A private environment requiring headers belongs in a different transport configuration discussion.

The [test environment management guide](/blog/test-environment-management-guide) explains wider promotion practices. QASkills CLI API URL override tests stay focused on selecting and resolving the endpoint before any environment-specific dataset is considered.

## qaskills local API testing and the current QASkills contract

Qaskills local API testing can run against a short-lived HTTP server bound to a random loopback port. Set \`QASKILLS_API_URL\` to that server origin before importing the client. Record the request target, then answer with the minimal JSON shape expected by the chosen helper.

The existing built-CLI gate in \`packages/cli/e2e/e2e.mjs\` defines its own \`API\` constant with \`process.env.QASKILLS_API_URL || 'https://qaskills.sh'\`. It uses string interpolation such as \`\${API}/api/skills?limit=100\`, rather than the CLI client's \`buildUrl\`.

That distinction creates two test subjects. Client unit tests prove URL construction in \`packages/cli/src/lib/api-client.ts\`. The E2E script proves its own live endpoint selection in \`packages/cli/e2e/e2e.mjs\`. Do not infer one implementation from the other.

The E2E \`API\` value does not trim a final slash, so a supplied origin ending with \`/\` yields a textual double slash before \`api\`. Many servers accept that path, but acceptance is server behavior rather than a guarantee in this repository. Supply a slash-free origin to that gate.

A local server should log \`request.url\` and answer only expected paths. Returning 404 for any extra slash makes path regressions visible. It can also count requests and close after the test, which prevents an open listener from holding the process.

Use fixed response objects with enough fields for the public helper. For \`searchSkills\`, return \`skills\`, \`total\`, \`page\`, \`pageSize\`, and \`totalPages\` if the consumer expects those fields. The client casts JSON to TypeScript types at compile time; it does not validate the response at runtime.

Do not make a local test imitate every production endpoint. One path and one query are enough to prove endpoint selection. The [MCP page](/mcp) covers another integration surface, while this contract concerns the native CLI client only.

QASkills CLI API URL override works well with a mock because request timeout and parsing remain active. A pure fetch spy is faster for detailed URL cases, while one local server case proves the URL reaches a real Node HTTP boundary.

## How do you test CLI base URL environment variable?

A CLI base URL environment variable test must control import timing and restore global state. Keep one module-level case per base value, and use a fetch spy or local server to observe the actual request.

Use this repeatable procedure:

1. Save the original \`QASKILLS_API_URL\` value and reset the module registry.
2. Start a loopback server or install a fetch spy, then set a valid fixture origin.
3. Dynamically import \`searchSkills\` and invoke it with a fixed query and page size.
4. Assert the complete URL, request headers, parsed response, and unused production origin.
5. Close listeners, restore fetch and environment state, then reset modules again.

Vitest can isolate this module with \`vi.resetModules()\`. Dynamic import after environment setup forces the source expression to evaluate for that case. Deleting the property, rather than assigning the string \`undefined\`, accurately models an absent variable.

\`\`\`typescript
it('uses the configured origin without a doubled boundary', async () => {
  vi.resetModules();
  process.env.QASKILLS_API_URL = 'http://127.0.0.1:43117/';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ skills: [], total: 0 }), { status: 200 }),
  ));

  const { searchSkills } = await import('../src/lib/api-client');
  await searchSkills({ query: 'playwright', pageSize: 5 });

  expect(fetch).toHaveBeenCalledWith(
    'http://127.0.0.1:43117/api/skills?q=playwright&pageSize=5',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
});
\`\`\`

The exact serialization order follows property iteration in \`buildUrl\`, but assertions can parse the captured string through \`new URL()\`. Compare \`origin\`, \`pathname\`, and individual search parameters when order is not the contract under test.

Also inspect headers. The private request helper adds \`Content-Type: application/json\` and \`User-Agent: @qaskills/cli\`, then merges supplied headers. Search provides no extra headers. Endpoint selection must not remove these existing transport values.

Timers require cleanup because every request creates an \`AbortController\` and a ten-second timer. The \`finally\` block clears that timer after success or failure. Await the helper before restoring spies, and use fake timers only in a dedicated timeout test.

The [TypeScript testing patterns guide](/blog/typescript-testing-patterns-guide) offers broader isolation techniques. Here, module reset plus exact URL observation is the central oracle.

## strip trailing slash base URL failure and edge-case matrix

The strip trailing slash base URL behavior is small, so boundary cases deserve precise expected values. Separate environment parsing, URL construction, and transport response. One failure should not obscure the layer that produced it.

| Base case | Environment value | Final URL behavior | Broken signal | Code source |
|---|---|---|---|---|
| QASKILLS_API_URL | Valid loopback origin with one final slash | Request uses the same origin and \`/api/skills\` | Production origin or doubled path reaches fetch | \`packages/cli/src/lib/api-client.ts\` |
| qaskills staging API | HTTPS origin with a path prefix | Root-relative API path replaces the prefix | Test expects unsupported prefix preservation | \`packages/cli/src/lib/api-client.ts\` |
| CLI base URL environment variable | Missing, empty, whitespace, or malformed value | Missing and empty default; malformed truthy input rejects | Fetch runs after invalid construction | \`packages/cli/src/lib/api-client.ts\` |
| mock qaskills API | Fresh import with controlled JSON response | Parsed object returns and timer clears | Stale module base or open listener remains | \`packages/cli/e2e/e2e.mjs\` |

An HTTP 404 or 500 proves the selected server answered, not that the base was wrong. The request helper reads response text for CLI errors and falls back to \`statusText\` when text is unavailable. Assert endpoint selection before asserting that separate error message.

Network rejection also occurs after URL construction. A fetch spy that rejects can still expose its first argument, allowing the test to prove the correct base was selected. Keep that assertion even when the final promise rejects.

An empty environment string is not malformed for this expression; it selects production. Whitespace is different because it survives logical OR and fails URL parsing. These two fixtures catch casual normalization assumptions.

One trailing slash is explicitly removed. Several trailing slashes are not all removed by the regex, although root-relative paths may still serialize cleanly. Phrase assertions around final request URLs, not around an imagined normalized configuration string.

Finally, test a query containing spaces or punctuation. URL search parameters percent-encode it after base resolution. This verifies endpoint changes do not tempt the test harness to compare an unencoded textual URL.

## How should mock qaskills API run in CI?

A mock qaskills API CI lane should run without public network access. A fetch spy covers most cases, while a loopback server covers one actual HTTP exchange. Both should receive their endpoint from a fresh module import.

Allocate a random server port instead of hardcoding one. Bind to \`127.0.0.1\`, save the resulting origin, and close the server in a guaranteed hook. Parallel workers can then run without competing for a shared endpoint.

Define strict handlers. Return the planned JSON only for \`GET /api/skills?q=playwright&pageSize=5\`, and return 404 otherwise. Save method and request target so a failure report shows whether base resolution or parameter mapping changed.

Do not run the existing E2E script against a tiny one-route mock unless the server implements its full contract. That gate fetches catalog samples, executes built CLI commands, and checks content and artifact endpoints. A focused client integration test should call \`searchSkills\` directly.

QASkills CLI API URL override should be tested on every change to the client, command transport, or build configuration. The package test can run after shared types are built. It needs no secret because public search sends no authorization header.

Use environment setup at process launch for one built artifact check. For example, spawn Node with a copied environment containing the local origin, then execute a search command. This proves bundling did not inline production unexpectedly.

Capture exit status and server requests, but avoid snapshots of colored command output. A stable semantic assertion checks one request reached the mock and that the command did not report connection failure.

The [error handling guide](/blog/error-handling-testing-patterns) helps separate URL, transport, status, and parsing faults. Keep those layers visible in CI output so a failed mock qaskills API case names the correct cause.

## Implementation checklist for QASkills CLI API URL override

Start by proving default, missing, empty, valid local, valid staging, one-slash, several-slash, prefixed, whitespace, and malformed cases. Each case must import the module after setting its environment. A table-driven unit suite keeps these values readable.

Assert a public helper call rather than importing private constants. Capture the final fetch URL, parse it, and compare origin, pathname, and parameters. Then assert the response or error separately.

Cite \`packages/cli/src/lib/api-client.ts\` for \`BASE\`, \`buildUrl\`, and \`searchSkills\`. Cite \`packages/cli/e2e/e2e.mjs\` only for the built gate's independent \`API\` behavior. These files implement related endpoint choices with different slash handling.

Verify timer cleanup by awaiting every request and checking no test process remains open. Restore global fetch, delete or restore \`QASKILLS_API_URL\`, and reset modules in \`afterEach\`. This prevents one base from becoming another case's hidden input.

Keep approved sources attached to the facts they define. Node documents environment strings and its URL API, while the URL Standard governs parsing. Repository code determines the actual default, trailing slash expression, root-relative paths, and timeout.

Check the internal [FAQ](/faq) when documenting expected user errors, and use the [categories page](/categories) only for a stable search fixture. Neither route should be fetched by deterministic client tests.

Write the base cases in a small data table with columns for raw text, import time, request path, and final URL. Plain rows make one slash or space easy to see, while a large snapshot can hide that key mark.

Give each row a new module load and a new fetch spy, even when two rows use the same host. This costs little and proves the base came from that row rather than from a prior test.

For the default row, delete the key from the copied environment instead of setting a word that looks like no value. Node stores assigned values as strings, so this choice keeps the test close to a process where the key was never set.

For the blank row, assign the empty string and expect the public site base because logical OR sees it as false. For the space row, keep one plain space and expect URL parse failure before fetch, since that string is true.

For the slash rows, compare both the raw input and the final path in the failure note. A reviewer can then tell whether the trim step changed or the URL parser resolved the root path in a new way.

For the path-prefix row, name the loss of the prefix in the test title so no one reads it as proxy support. The root-led API path is the key input, and the current result starts at the host root.

Set a fixed query with a space, a page size, and one array filter in one wire-level check. Parse the final URL and compare each field by name, which proves both the chosen base and safe query encoding.

Keep timeout tests in their own file or describe block, since fake clocks add state that base tests do not need. A prompt URL test should end as soon as fetch returns, and its only timer should be cleared by source code.

If a local server is used, store the first request method, path, and host in a short record, then close on all paths. Do not keep a server open for the next row, because that can mask a stale base with a still-live port.

In a spawned CLI check, pass an environment built from a clean copy and add only the local base plus safe test flags. The child should not inherit a secret token or proxy value that can alter the path before it reaches the mock.

When a test fails, print the expected origin and the parsed actual origin, not the whole response body. That pair gives enough proof for this rule and avoids filling CI logs with catalog data that did not cause the fault.

Review the built artifact once after the source tests pass, because module bundling may change when the base expression runs. Start the child with the base already set, then prove one request reaches the strict local handler.

Keep the public smoke lane last and label it as a site check rather than a unit result. The [error handling guide](/blog/error-handling-testing-patterns) helps name URL, fetch, status, and parse faults as separate causes when that lane fails.

Add one child-run case that sets the base in the spawn call instead of changing the parent test process. The mock host should see one path, and the parent should keep its old environment after the child has left.

Use a free port from the host, pass that exact port in the base, and have the server close once the planned call ends. A stale port from the last run must not make a new row pass by chance.

Keep host, path, and query checks in three short facts so a slash fault does not look like a filter fault. The host must match the mock, the path must start at \`/api\`, and each query key must hold the set test value.

Write the raw base in the fail note with quotes around it, since a blank or space can be hard to see in plain logs. Then write the parsed host on the next line, unless URL parse failed before any host could be read.

For a server status fault, prove the mock saw the right URL before you compare the API error. This order keeps endpoint proof intact even when response text or status rules change in the same patch.

For a fetch reject, save the first URL argument and the owned Error message as two facts. The selected base can be right while the wire still fails, and both facts help point the fix to the right layer.

Do not share the module import between rows through a top-level helper that runs too soon. Place the fresh import in the row body after the environment is set, then call one public client method at once.

Read the [test environment guide](/blog/test-environment-management-guide) when a team maps local, test, and live hosts, but keep this suite on fake names and loopback ports. No test row should need a live key, real host, or shared data set.

At the end, list which rows touched fetch and which rows stopped at URL parse, then match that list to the plan. This last check shows that invalid bases fail at the right edge and valid bases reach the mock once.

QASkills CLI API URL override passes when each set origin yields the documented final URL and bad input stops before fetch. A second sentence should confirm that fresh imports never reuse a stale base from an earlier row.

## Frequently Asked Questions

### What does QASKILLS_API_URL verify in QASkills?

It verifies which origin the CLI API client uses when its module loads. A valid value replaces the production default, and one trailing slash is removed. The strongest assertion captures a public helper's final fetch URL after setting the environment and importing a fresh module instance.

### When should a team test qaskills staging API?

Test staging selection whenever API client initialization, bundling, environment loading, URL construction, or deployment routing changes. Include an HTTPS origin, a trailing slash case, and a path-prefix characterization. Keep credentials outside the fixture unless the public helper under test actually sends them.

### How can a fixture isolate qaskills local API testing?

Bind a short-lived server to a random loopback port, set the environment before dynamic import, and answer only the expected request path. Record method and URL, close the listener in a guaranteed hook, restore environment state, and reset modules before the next case.

### Which assertion proves CLI base URL environment variable?

Capture the first argument passed to fetch, parse it with \`URL\`, and compare its origin and pathname with the configured fixture. Also prove the production hostname is absent. This checks observable transport behavior rather than reaching into the unexported \`BASE\` constant.

### What failure cases belong in strip trailing slash base URL tests?

Include unset, empty, whitespace, malformed, one trailing slash, several trailing slashes, a base path prefix, network rejection, and non-success HTTP status. Label URL-construction failures separately from transport and response failures so the short test report identifies the layer that actually changed.

### How should CI run mock qaskills API checks?

Run table-driven fetch-spy tests for detailed cases, plus one loopback integration test and one built-command check. Use fresh module imports, random ports, no public network, and guaranteed cleanup. The full live E2E registry gate should remain separate because it requires several production endpoints.

## Conclusion

QASkills CLI API URL override is an import-time endpoint contract. The CLI reads a string environment value, defaults when it is absent or empty, removes one ending slash, and resolves root-relative paths through the standards-based URL class.

Tests should observe the final request rather than a private constant. Fresh imports expose initialization behavior, strict local handlers expose path mistakes, and distinct error cases separate configuration faults from server failures.

Follow the [getting started workflow](/getting-started) with a mock API, then confirm the same request contract against the public [skills catalog](/skills). Add the slash, prefix, and malformed-value matrix to the CLI package gate before changing endpoint configuration.`,
};
