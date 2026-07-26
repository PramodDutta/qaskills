import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills SDK custom base URL',
  description:
    'QASkills SDK custom base URL: use real repo paths, focused tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'QASkills SDK custom base URL',
  keywords: [
    'QASkills SDK custom base URL',
    'QASkillsClient baseUrl',
    'qaskills SDK staging endpoint',
    'SDK local API testing',
    'base URL trailing slash',
    'createClient configuration',
    'mock qaskills SDK server',
  ],
  relatedSlugs: [
    'ai-qa-skills-directory-2026',
    'typescript-testing-patterns-guide',
    'authentication-authorization-testing-guide',
    'testing-cursor-pagination-api-boundaries',
  ],
  repoEvidence: [
    'packages/sdk/src/index.ts#QASkillsConfig',
    'packages/sdk/src/index.ts#QASkillsClient.constructor',
    'packages/sdk/src/index.ts#QASkillsClient.request',
    'packages/sdk/src/index.ts#createClient',
  ],
  sources: [
    'https://url.spec.whatwg.org/',
    'https://nodejs.org/api/globals.html#fetch',
    'https://www.typescriptlang.org/docs/handbook/2/classes.html',
  ],
  content: `QASkills SDK custom base URL configuration passes \`baseUrl\` into \`QASkillsClient\` for local or staging requests. The client concatenates that value directly with paths beginning in \`/api\`, so callers should omit a trailing slash and tests should assert the exact URL received by \`fetch\`.

The implementation is concentrated in \`packages/sdk/src/index.ts\`. \`QASkillsConfig\` accepts optional \`baseUrl\` and \`apiKey\` values, the constructor stores them, and the private request method combines the stored base with every resource path. This article covers that programmatic SDK contract, not the CLI's \`QASKILLS_API_URL\` environment variable.

## What does QASkills SDK custom base URL guarantee?

QASkills SDK custom base URL support guarantees that a truthy configured string replaces \`https://qaskills.sh\` as the request origin text. It does not validate the string, remove a trailing slash, resolve relative text, or test whether the server is reachable. Those responsibilities remain with the caller and its tests.

The default constructor call uses an empty config object. Because assignment uses \`config.baseUrl || 'https://qaskills.sh'\`, omitted, empty, and otherwise falsy values select production. A nonempty local address such as \`http://127.0.0.1:4100\` is stored exactly.

Every public resource eventually calls the same private request function. Skills list, get, search, and create use it, as do category listing, review submission, and leaderboard retrieval. That shared path makes one custom-origin fixture useful across the SDK.

The client always starts headers with \`Content-Type: application/json\`, then applies headers supplied in request options. If \`apiKey\` is truthy, it writes an \`Authorization: Bearer ...\` header afterward. A test should therefore inspect URL, method, body, and final headers together.

The [TypeScript classes handbook](https://www.typescriptlang.org/docs/handbook/2/classes.html) provides language-level context for the public class and private fields. Repository evidence comes from \`packages/sdk/src/index.ts#QASkillsConfig\` and \`packages/sdk/src/index.ts#QASkillsClient.constructor\`. The [TypeScript testing guide](/blog/typescript-testing-patterns-guide) can help organize spies around that contract.

## How does QASkillsClient baseUrl work?

The QASkillsClient baseUrl becomes a private string during construction. Public methods cannot read it directly, so a useful test observes the URL passed to \`fetch\`. That behavior-based assertion avoids reaching into private state.

When no config is supplied, \`skills.get('playwright-cli')\` requests \`https://qaskills.sh/api/skills/playwright-cli\`. When \`baseUrl\` is \`http://localhost:4100\`, the same call requests \`http://localhost:4100/api/skills/playwright-cli\`. The identifier is interpolated directly in the SDK implementation.

The SDK list path builds query text with \`URLSearchParams\`. It adds \`q\`, \`sort\`, \`page\`, and \`pageSize\` only when each corresponding value is truthy. It then appends the resulting query to \`/api/skills\`, so the custom base affects both filtered and unfiltered requests.

A focused test can capture the first request without running a server:

\`\`\`typescript
import { afterEach, expect, it, vi } from 'vitest';
import { createClient } from '../src/index';

afterEach(() => vi.restoreAllMocks());

it('uses the configured API origin', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ skills: [], total: 0 }), { status: 200 }),
  );
  const client = createClient({ baseUrl: 'http://127.0.0.1:4100' });

  await client.skills.search('playwright', { page: 2, pageSize: 5 });

  expect(fetchMock.mock.calls[0][0]).toBe(
    'http://127.0.0.1:4100/api/skills?q=playwright&page=2&pageSize=5',
  );
});
\`\`\`

The response fixture must contain JSON because the private request function always calls \`res.json()\` after a successful status. Returning an empty body would test JSON parsing failure instead of base URL selection. Keep one cause per case.

Readers can choose stable slugs from the [skills directory](/skills) for a server-backed test. A mocked unit test should still use fixed data, because live catalog ordering and counts are not part of the constructor contract. QASkills SDK custom base URL tests become easier to diagnose when origin selection is isolated from catalog content.

## Which cases define qaskills SDK staging endpoint?

A qaskills SDK staging endpoint suite needs successful origin replacement, production fallback, authentication, malformed configuration, and repeat-call cases. The constructor itself performs no network work, so all observable effects begin when a public method invokes \`fetch\`.

Use a staging URL without a trailing slash for the standard case. Assert that list, get, categories, and leaderboard calls all stay under that origin. One test per path family is clearer than a single test with many calls and one broad assertion.

The empty-string boundary is worth recording. \`createClient({ baseUrl: '' })\` does not target an empty or relative origin; it selects \`https://qaskills.sh\` because of the logical OR. The same fallback applies when callers pass \`undefined\`.

Malformed nonempty text behaves differently. The constructor accepts it, and \`fetch\` later rejects or parses it according to the runtime. The SDK does not wrap that transport error, so tests should expect the native rejection rather than a custom configuration exception.

API keys deserve an independent assertion. A configured key adds \`Authorization: Bearer test-key\`, while no key omits that header. Use a fake token and inspect the \`RequestInit\`; never send a production credential to a test server.

The [Node fetch documentation](https://nodejs.org/api/globals.html#fetch) describes the global used by this package. It also makes clear why a fetch spy is a faithful boundary for unit work. The [authentication testing guide](/blog/authentication-authorization-testing-guide) covers broader token cases, while this article only verifies SDK header construction.

## SDK local API testing and the current QASkills contract

SDK local API testing can use either a fetch spy or a small HTTP server. The spy verifies string joining and options with little setup. A local server adds proof that the runtime can send and parse a real request.

The current request method creates a fresh header object containing JSON content type plus any option headers. It conditionally adds authorization, calls \`fetch\`, checks \`res.ok\`, parses a JSON error when possible, and otherwise parses successful JSON. There is no timeout or retry in this SDK path.

For successful requests, the response shape must match the public method's declared type, but TypeScript does not validate JSON at runtime. A local server can return an incorrect object and the SDK will still resolve it. Contract validation belongs in endpoint tests or a future runtime schema layer.

The skills surface exposes four patterns. \`list\` uses optional query values, \`get\` embeds an ID or slug, \`search\` delegates to list, and \`create\` sends a POST body. Categories and leaderboard issue GET requests, while review submission also sends JSON through POST.

That variety makes the [API boundary testing guide](/blog/testing-cursor-pagination-api-boundaries) useful for page and page-size cases. QASkills SDK custom base URL coverage should not duplicate every endpoint assertion, though. One origin test per request shape is enough, followed by endpoint-specific suites.

A local server fixture should bind to an ephemeral port, record method and URL, set \`Content-Type: application/json\`, and close after each test. Avoid fixed ports because parallel workers can collide. Also reject unexpected paths immediately so a double slash does not pass unnoticed.

## How do you test base URL trailing slash?

A base URL trailing slash currently creates a double slash because request paths already begin with \`/\`. The implementation uses direct template interpolation rather than the URL constructor. A regression test should capture that exact behavior before the team decides whether to normalize it.

1. Create one client with \`http://127.0.0.1:4100\` and one with \`http://127.0.0.1:4100/\`.
2. Mock \`fetch\` with a successful JSON response and clear its call history between cases.
3. Call the same public method, such as \`categories.list()\`, through each client.
4. Assert the first URL has one separator and the second currently has two before \`api\`.
5. Decide whether the second result is a documented caller constraint or an implementation defect.
6. If normalization is added, change production code and the assertion in the same review.

The current edge can be expressed directly:

\`\`\`typescript
const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
  new Response(JSON.stringify({ testingTypes: [], frameworks: [], languages: [], domains: [] })),
);

await createClient({ baseUrl: 'http://localhost:4100/' }).categories.list();

expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4100//api/categories');
\`\`\`

This expected value is intentionally descriptive, not an endorsement. Some servers normalize repeated separators, while routers, proxies, signatures, or logs may treat them differently. The [URL Standard](https://url.spec.whatwg.org/) defines URL parsing, but this SDK never calls \`new URL(path, base)\` for request joining.

If the desired contract is one slash, normalize in the constructor with a trailing-slash removal or use the URL API deliberately. Then test root paths, query text, and any base path prefix. Avoid silently changing the expected value without changing the code.

QASkills SDK custom base URL users should therefore provide a base without the final slash today. The [getting started page](/getting-started) points to the production service, while local development should make its origin format explicit in one shared test helper.

## createClient configuration failure and edge-case matrix

The createClient configuration helper is a one-line factory returning \`new QASkillsClient(config)\`. It does not clone, merge, freeze, or validate configuration. Tests should expect the helper and direct constructor to behave alike.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| QASkillsClient baseUrl | \`http://127.0.0.1:4100\` | Request uses the local origin | Production origin is called | \`packages/sdk/src/index.ts#QASkillsConfig\` |
| qaskills SDK staging endpoint | HTTPS staging origin | Every method stays on staging | Mixed origins across resources | \`packages/sdk/src/index.ts#QASkillsClient.constructor\` |
| SDK local API testing | Ephemeral JSON server | Method, path, headers, and JSON agree | Wrong path or parse failure | \`packages/sdk/src/index.ts#QASkillsClient.request\` |
| base URL trailing slash | Origin ending in \`/\` | Current request contains \`//api\` | Test assumes normalization | \`packages/sdk/src/index.ts#QASkillsClient.request\` |
| createClient configuration | Empty string and omitted value | Production fallback is selected | Relative or empty fetch URL | \`packages/sdk/src/index.ts#createClient\` |
| mock qaskills SDK server | Server closed after each test | No port or handle remains | Worker hangs or port conflicts | \`packages/sdk/src/index.ts#createClient\` |

Error responses need valid JSON if the test targets the API's error message. The request method first attempts \`res.json()\`, catches that parse failure, and substitutes \`{ error: res.statusText }\`. It then throws \`QASkills API error: ...\`.

A response like \`{ "error": "staging unavailable" }\` should produce that text. A non-JSON response should fall back to status text. These cases belong near the origin tests because a mock server must implement both success and failure bodies accurately.

The [categories route](/categories) is a convenient no-argument call for origin checks, while the [leaderboard](/leaderboard) exercises another GET path. Do not use either live response as the only expected fixture. Their content can evolve without changing \`createClient\`.

## How should mock qaskills SDK server run in CI?

A mock qaskills SDK server should listen only on a loopback interface and an operating-system-assigned port. Start it in test setup, derive a base URL without a trailing slash, and close it in teardown even after failed assertions. This arrangement remains independent across parallel jobs.

Route handlers should record request method, pathname, query, content type, authorization, and body. Return a small JSON fixture with the status needed by the case. Fail unexpected routes with a clear 404 so accidental path joining appears in the assertion log.

Do not use a shared staging service for the default unit gate. Staging is useful for a separate integration check, but service state, credentials, and deployments can change while SDK code stays fixed. Local fixtures make a failed contract attributable to the current change.

Run the SDK package's build or type check before integration tests so path aliases and shared types resolve as production expects. Then run server-backed cases with open-handle detection. A hanging worker often indicates that teardown missed a server or pending request.

Use a fake API key only when a case asserts authorization. Store it in the test process, never a repository file, and compare the full expected header value on the local server. A test should also prove that a client without a key sends no authorization header.

QASkills SDK custom base URL checks can later join a broader [AI QA directory workflow](/blog/ai-qa-skills-directory-2026). Keep the first gate focused on request formation and response handling. Catalog ranking and business behavior need their own fixtures and owners.

## Implementation checklist for QASkills SDK custom base URL

Use these review points for SDK changes and consumer setup:

- Pass a full HTTP or HTTPS origin without a trailing slash.
- Verify omitted and empty base values select \`https://qaskills.sh\`.
- Observe \`fetch\` arguments instead of reading private fields.
- Return valid JSON for every mocked successful response.
- Test JSON API errors separately from status-text fallback.
- Assert authorization is present only when \`apiKey\` is truthy.
- Cover one query request, one path request, and one POST request.
- Bind local servers to loopback with an ephemeral port.
- Close servers and restore fetch spies after every case.
- Keep CLI environment-variable behavior out of this SDK suite.

Each item maps to code in \`packages/sdk/src/index.ts#QASkillsClient.request\` or \`packages/sdk/src/index.ts#createClient\`. That traceability matters because a generic URL recommendation cannot describe this client's direct string concatenation.

The SDK contains no retries, timeout, base validation, or runtime response schemas. Tests should not imply those features exist. If one is added, give it a separate contract and failure matrix rather than folding it into origin selection.

Review results through the [FAQ page](/faq) only for user-facing guidance. The executable assertions should remain beside the SDK package, where a code change and its expectation can be reviewed together.

## How can consumers migrate a base URL safely?

A safe migration starts with a list of every process that creates the SDK client. Record its current origin, owner, and test job before changing any value. QASkills SDK custom base URL behavior is simple, but a hidden constructor call can still keep using production.

Choose one exact staging origin and write it without a final slash. Use a host that the test team controls and can reset. Do not place an API path in the value because public methods already add their own \`/api\` paths.

Add a small local test before changing deployment settings. It should call one read method and capture the full URL seen by \`fetch\`. A passing assertion gives the team a clear picture of the string that current code will build.

Test the default path in the same file. Create a client with no options and assert that the request starts with \`https://qaskills.sh\`. This case guards production behavior while the custom case guards local or staging behavior.

Now add the chosen origin through the consumer's normal config layer. The SDK does not read an environment variable on its own, so the app must pass the value into \`createClient\` or \`QASkillsClient\`. A config value that is never passed has no effect.

Keep secret data separate from the origin. The base URL is not a credential, and it may appear in logs or test output. Pass an API key only for cases that require it, then assert the local server saw the expected authorization header.

Run the suite against a loopback server before using staging. The server should return fixed JSON and record the path, query, method, and headers. These facts prove the client request without depending on a remote deploy or changing catalog data.

Add one response error to the loopback plan. Return a known status and JSON error, then assert the public SDK method rejects with that message. This proves the custom origin still uses the same error path as the default origin.

Test a trailing slash as a clear negative case. Current string joining produces a double slash before \`api\`, so the assertion should expose that result. Do not silently trim the value inside a test helper because production code does not trim it.

The migration review should cite \`packages/sdk/src/index.ts#QASkillsClient.request\` and \`packages/sdk/src/index.ts#createClient\`. One shows how paths are joined, and the other shows how config enters the client. Together they explain every URL observed by the test.

Move one noncritical consumer to staging first. Watch request logs and response parsing, then compare the route with the local fixture. A small first move makes a wrong origin easy to reverse without affecting every service.

When that consumer is stable, move the remaining callers in planned groups. Run their local contract tests before each deploy. QASkills SDK custom base URL checks should fail before a bad host reaches a broad test run.

Do not weaken assertions to accept both old and new origins for long periods. A test that allows either host cannot prove the migration finished. Use a short, named transition period and remove the old value when its final caller moves.

After the change, search the repo for direct \`new QASkillsClient\` and \`createClient\` calls. Compare each result with the migration list. This simple source check can find a sample, script, or test that still sends traffic to the old host.

Keep the staging smoke check separate from the required local gate. It may retry a brief service fault, but the local test should remain fast and strict. That split gives developers a useful failure even when staging is being deployed.

Finish by recording the selected origin and its owner in the consumer's config docs. The SDK itself does not validate or discover that host. Clear ownership tells future maintainers where to check certificates, routing, and service health.

Keep one short test table for each app that uses the client. Name the default host, custom host, path, and expected result. This table lets a reviewer compare apps without reading each setup file first.

Use a plain host name in test data when TLS is not part of the case. Short names and paths are easy to read in a failed assertion. Add TLS checks only in a job that owns certificates and trust.

Store the base value in one config field per app. Pass that field to the client in one clear place. Many aliases make it hard to know which host a test or deploy will use.

Log the chosen host at app start only when logs are safe. Do not log an API key beside it. A host line can speed up triage when the wrong stage receives a request.

Make the first smoke call read only. Search or list calls are safer than writes while a team checks a new route. A read still proves DNS, routing, request shape, and JSON parse work.

The final review can use this compact set of proof points:

- one source call passes the configured host into the SDK client with no hidden second default
- one unit case proves the default host when no config value is set by the calling app
- one local server case records the full path that the public method sends to its base host
- one negative case keeps a final slash visible and confirms the current double slash result
- one auth case proves the host and key are separate values with separate logs and test owners
- one error case returns fixed JSON and checks the exact public rejection seen by the caller
- one teardown check proves the local server and fetch spy leave no open work after the test
- one source scan finds every client constructor call that must move with the planned host
- one staging smoke call uses a read route and records the host without printing a secret
- one rollback note names the old host and the exact config change that can restore it

These proof points keep QASkills SDK custom base URL changes small and clear. They also give a new owner enough facts to repeat the move. No step needs access to a private field inside the client.

- final handoff record with app name owner default host custom host source call config field local route staging route test run rollback value and review date
- saved fault note with request path method safe headers status body type expected client message actual client message cleanup result and next code owner
- close check with host path key scope read call error case test pass app owner stage owner rollback step and next review date
- safe rerun with the same host same path same mock data same clear result and no open server

## Frequently Asked Questions

### What does QASkillsClient baseUrl verify in QASkills?

It verifies which origin string the SDK places before each API path. The best assertion checks the first \`fetch\` argument after a public method call. It does not prove that the configured server exists, returns a valid schema, or mirrors production data.

### When should a team test qaskills SDK staging endpoint?

Test staging origin selection whenever constructor, request, or deployment configuration changes. Keep a local mocked test in the required gate, then run staging checks separately for integration confidence. This split prevents a staging outage from obscuring a simple string-joining regression.

### How can a fixture isolate SDK local API testing?

Start a loopback server on an ephemeral port, record one request, and return fixed JSON. Create the client with that exact origin and close the server in teardown. The fixture then proves method, URL, headers, and parsing without production data or credentials.

### Which assertion proves base URL trailing slash?

Call a public method with a base ending in \`/\` and assert the exact URL passed to \`fetch\`. Current code produces \`//api\` because it concatenates strings. If normalization is implemented later, update both production logic and this regression expectation in the same reviewed change.

### What failure cases belong in createClient configuration tests?

Cover omitted config, empty base text, malformed nonempty text, a trailing slash, a fake API key, invalid JSON, and a non-success response. Keep each case focused on one observable effect so transport, parsing, and origin failures remain easy to distinguish.

### How should CI run mock qaskills SDK server checks?

CI should bind each fixture to loopback on a dynamic port, avoid shared credentials, and close every server after use. Run package type checks first, then local integration cases. Reserve remote staging calls for a separate job with explicit ownership and retry policy.

## Conclusion

QASkills SDK custom base URL behavior is small but precise: the constructor selects a truthy base or production, and request code concatenates API paths directly. Tests should capture that string, its headers, and the resulting JSON behavior without reaching into private fields.

Open the [skills catalog](/skills) to choose a stable example shape, then implement the local origin test described here. Use the [leaderboard route](/leaderboard) only as an optional integration target after the deterministic request contract passes.`,
};
