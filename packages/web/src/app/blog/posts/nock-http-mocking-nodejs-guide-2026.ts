import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Nock HTTP Mocking in Node.js: Complete Guide 2026",
  description: "Mock HTTP in Node.js with nock in 2026 — intercept requests, build interceptors, record real traffic, and clean up between tests with full code examples.",
  date: "2026-06-15",
  category: "JavaScript",
  content: `# Nock HTTP Mocking in Node.js: Complete Guide 2026

Nock is an HTTP mocking library for Node.js that works by overriding Node's \`http\`/\`https\` modules and intercepting outgoing requests, matching them against **interceptors** you define and returning canned responses — so your tests never hit the real network. You declare an interceptor with \`nock('https://api.example.com').get('/users/1').reply(200, { id: 1 })\`, run the code that makes the request, and assert it was matched. Nock can also **record** real traffic into reusable fixtures. The two disciplines that keep nock suites healthy are cleaning up between tests (\`nock.cleanAll()\`) and asserting all interceptors were used (\`scope.done()\`). This guide covers all of it.

## Install and the core idea

\`\`\`bash
npm install --save-dev nock
\`\`\`

\`\`\`js
import nock from 'nock';
\`\`\`

Nock intercepts at the Node HTTP layer, so it works with any client built on Node's \`http\`/\`https\` — \`fetch\` (Node's built-in global fetch is supported in current nock), \`axios\`, \`node-fetch\`, \`got\`, \`superagent\`, and so on. You do **not** mock your HTTP client; you mock the network beneath it. That is what makes nock client-agnostic and realistic.

A minimal test:

\`\`\`js
import nock from 'nock';
import axios from 'axios';

test('fetches a user', async () => {
  nock('https://api.example.com')
    .get('/users/1')
    .reply(200, { id: 1, name: 'Ada' });

  const res = await axios.get('https://api.example.com/users/1');
  expect(res.data).toEqual({ id: 1, name: 'Ada' });
});
\`\`\`

\`nock(basePath)\` returns a **scope** tied to that origin. Off the scope you chain HTTP-verb methods (\`.get\`, \`.post\`, \`.put\`, \`.patch\`, \`.delete\`) to create **interceptors**, then \`.reply(...)\` to define the response. For more testing patterns across the Node ecosystem, browse the [QA skills directory](/skills).

## Building interceptors

An interceptor matches a single request. The verb method takes a path (and optionally a body matcher), and \`.reply\` takes a status, body, and optional headers.

\`\`\`js
const scope = nock('https://api.example.com')
  .get('/users')                      // match GET /users
  .reply(200, [{ id: 1 }], { 'X-Total-Count': '1' });
\`\`\`

Match a **request body** by passing a second argument to the verb method:

\`\`\`js
nock('https://api.example.com')
  .post('/users', { name: 'Ada' })    // only matches if body equals this
  .reply(201, { id: 1, name: 'Ada' });
\`\`\`

Match **query strings** with \`.query()\`:

\`\`\`js
nock('https://api.example.com')
  .get('/search')
  .query({ q: 'pytest', page: 2 })    // ?q=pytest&page=2
  .reply(200, { results: [] });

nock('https://api.example.com')
  .get('/search')
  .query(true)                        // match ANY query string
  .reply(200, {});
\`\`\`

Require specific **request headers** with \`.matchHeader\`, and use a **function reply** to compute the response dynamically from the request:

\`\`\`js
nock('https://api.example.com', {
  reqheaders: { authorization: 'Bearer token123' },  // must be present
})
  .get('/me')
  .reply(200, (uri, requestBody) => ({ uri, echoed: requestBody }));
\`\`\`

Use \`.replyWithError(...)\` to simulate a network-level failure (DNS error, connection refused) rather than an HTTP error status:

\`\`\`js
nock('https://api.example.com').get('/flaky').replyWithError('ECONNREFUSED');
\`\`\`

By default each interceptor matches **once**. To match repeatedly, add \`.times(n)\`, \`.twice()\`, \`.thrice()\`, or \`.persist()\`:

\`\`\`js
nock('https://api.example.com').get('/ping').times(3).reply(200, 'pong');
nock('https://api.example.com').get('/config').persist().reply(200, {}); // unlimited
\`\`\`

## Asserting interceptors were used with scope.done()

A common bug is defining an interceptor that the code never actually calls — the test passes for the wrong reason. \`scope.done()\` (or \`scope.isDone()\`) asserts that **every** interceptor on the scope was consumed.

\`\`\`js
test('calls the endpoint exactly once', async () => {
  const scope = nock('https://api.example.com').get('/users/1').reply(200, {});

  await axios.get('https://api.example.com/users/1');

  scope.done();   // throws if /users/1 was not requested
});
\`\`\`

\`scope.done()\` throws a descriptive error listing the pending (unused) interceptors, which is exactly what you want — it turns "the request was never made" into a loud failure. Use \`scope.isDone()\` (returns a boolean) when you want to assert with your own matcher. For global enforcement, see the cleanup section. To compare HTTP-mocking approaches across languages and tools, see the [framework comparison hub](/compare).

## Cleanup between tests — the most important habit

Because nock patches Node's HTTP modules globally, leftover interceptors leak between tests and cause baffling failures (a request in test B matches an interceptor left over from test A). Three functions manage this:

\`\`\`js
afterEach(() => {
  nock.cleanAll();          // remove all interceptors and pending mocks
});

afterAll(() => {
  nock.restore();           // un-patch http/https entirely (undo nock.activate)
});
\`\`\`

- \`nock.cleanAll()\` removes every interceptor — call it in \`afterEach\` so each test starts clean.
- \`nock.restore()\` fully restores the original \`http\`/\`https\` modules; pair with \`nock.activate()\` if you later re-enable.
- \`nock.abortPendingRequests()\` aborts any in-flight requests, occasionally needed for hung async tests.

To guarantee no test accidentally makes a **real** network call, lock things down with \`nock.disableNetConnect()\` and re-allow only what you intend:

\`\`\`js
beforeAll(() => {
  nock.disableNetConnect();
  nock.enableNetConnect('127.0.0.1');  // still allow local test servers
});

afterEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.enableNetConnect();             // restore normal networking
});
\`\`\`

With \`disableNetConnect()\` on, any unmatched request throws \`NetConnectNotAllowedError\`, immediately revealing an endpoint you forgot to mock — a superb safety net for CI.

## Recording real traffic into fixtures

For complex APIs, hand-writing every interceptor is tedious. Nock can **record** real HTTP calls and replay them. Turn on recording, run the code once against the real service, and nock prints (or collects) ready-to-use interceptor definitions.

\`\`\`js
import nock from 'nock';

nock.recorder.rec();          // start recording; prints nock() calls to stdout

// ...run code that makes real HTTP requests...

// copy the printed nock(...) blocks into your test file
\`\`\`

To capture the calls programmatically instead of printing them:

\`\`\`js
nock.recorder.rec({ output_objects: true, dont_print: true });

await runRealRequests();

const recordings = nock.recorder.play();   // array of recorded call objects
// persist \`recordings\` to a JSON fixture, then load with nock.define(recordings)
\`\`\`

Replay saved recordings with \`nock.define()\`:

\`\`\`js
import recordings from './fixtures/users-api.json' assert { type: 'json' };
nock.define(recordings);   // re-creates the interceptors from the fixture
\`\`\`

A reliable workflow is "record once, replay forever": record against the live API during development, commit the JSON fixture, and have tests load it with \`nock.define\`. Re-record only when the upstream contract changes. Remember to scrub secrets (auth tokens, cookies) from recorded fixtures before committing them.

## A realistic end-to-end example

A complete suite testing a client with retries, error handling, and full cleanup discipline:

\`\`\`js
import nock from 'nock';
import { fetchUserWithRetry } from '../src/user-client.js';

const API = 'https://api.example.com';

beforeAll(() => {
  nock.disableNetConnect();           // no accidental real calls
});

afterEach(() => {
  nock.cleanAll();                    // clean slate each test
});

afterAll(() => {
  nock.enableNetConnect();
});

test('returns the user on success', async () => {
  const scope = nock(API).get('/users/1').reply(200, { id: 1, name: 'Ada' });

  const user = await fetchUserWithRetry(1);

  expect(user).toEqual({ id: 1, name: 'Ada' });
  scope.done();                       // assert the call was made
});

test('retries once on 503 then succeeds', async () => {
  const scope = nock(API)
    .get('/users/1').reply(503)       // first attempt fails
    .get('/users/1').reply(200, { id: 1 }); // retry succeeds

  const user = await fetchUserWithRetry(1);

  expect(user.id).toBe(1);
  scope.done();                       // both interceptors must be consumed
});

test('propagates a network error', async () => {
  nock(API).get('/users/1').replyWithError('ECONNRESET');

  await expect(fetchUserWithRetry(1)).rejects.toThrow(/ECONNRESET/);
});
\`\`\`

Every test mocks exactly what it needs, asserts consumption with \`scope.done()\`, and \`afterEach\`'s \`nock.cleanAll()\` prevents cross-test leakage. \`disableNetConnect()\` guarantees a forgotten mock fails loudly instead of silently hitting production.

## CI usage

Nock needs no special CI configuration, but two settings make CI runs trustworthy. First, always run with \`nock.disableNetConnect()\` (allowing localhost if you use test servers) so the suite can never reach the real internet from a build agent — flaky external services then can never flake your build. Second, assert \`scope.done()\` (or a global \`expect(nock.isDone()).toBe(true)\` in \`afterEach\`) so unused interceptors fail the build rather than passing silently.

\`\`\`js
// test/setup.js (loaded via your runner's setup file)
import nock from 'nock';

beforeAll(() => nock.disableNetConnect());
afterEach(() => {
  if (!nock.isDone()) {
    const pending = nock.pendingMocks();
    nock.cleanAll();
    throw new Error(\`Unused nock interceptors: \${pending}\`);
  }
});
afterAll(() => nock.enableNetConnect());
\`\`\`

\`\`\`yaml
- name: Test
  run: npx jest --ci    # or vitest run / mocha
\`\`\`

## Common errors and troubleshooting

**\`Nock: No match for request\`** — The outgoing request did not match any interceptor. Compare method, full path, query string, body, and required headers. The error prints the actual request; diff it against your \`.get(...)\`/\`.query(...)\`/\`.matchHeader(...)\` definitions. A trailing slash or an extra query param is a frequent culprit.

**Interceptor leaks into the next test** — You forgot \`nock.cleanAll()\` in \`afterEach\`. Add it. If an interceptor must survive multiple requests within one test, use \`.times(n)\` or \`.persist()\` intentionally.

**Test passes but the request was never made** — You did not call \`scope.done()\`. Add it so an unused interceptor throws. Consider the global \`afterEach\` guard shown above.

**\`NetConnectNotAllowedError\`** — \`disableNetConnect()\` is on and a request was not mocked. Either add the missing interceptor or, for legitimate local calls, allow the host with \`nock.enableNetConnect('127.0.0.1')\`.

**Recorded fixtures contain secrets** — Recording captures real auth headers and cookies. Scrub them from the JSON before committing, and prefer environment-based tokens that differ from production.

**\`.persist()\` interceptor never lets \`done()\` pass** — A persistent interceptor is never "consumed," so \`scope.done()\` may behave unexpectedly. Use \`.times(n)\` when you need consumption assertions, and reserve \`.persist()\` for shared, always-on stubs.

For more Node.js testing guides and tool comparisons, browse the [blog](/blog).

## Frequently Asked Questions

### What is nock used for in Node.js?

Nock is an HTTP mocking and expectations library for Node.js. It intercepts outgoing requests by overriding Node's \`http\` and \`https\` modules, matches them against interceptors you define, and returns canned responses, so your tests run without touching the real network. Because it intercepts at the HTTP layer, it works with any client built on Node's HTTP modules, including the built-in \`fetch\`, \`axios\`, and \`got\`.

### How do I clean up nock interceptors between tests?

Call \`nock.cleanAll()\` in an \`afterEach\` hook to remove every interceptor so each test starts from a clean slate. Use \`nock.restore()\` in \`afterAll\` to fully un-patch the HTTP modules when you are done. For extra safety, run \`nock.disableNetConnect()\` so any unmatched request throws immediately, revealing endpoints you forgot to mock instead of silently hitting the real service.

### What does scope.done() do in nock?

\`scope.done()\` asserts that every interceptor defined on that scope was actually consumed by a request, throwing a descriptive error listing any unused interceptors. This catches the common bug where a test defines a mock but the code never calls it, so the test passes for the wrong reason. Use \`scope.isDone()\` when you want a boolean to assert with your own matcher instead.

### Can nock record real HTTP requests?

Yes. Call \`nock.recorder.rec()\` to start recording, run your code against the real service once, and nock prints ready-to-paste interceptor definitions; with \`{ output_objects: true }\` you can collect them via \`nock.recorder.play()\` and save a JSON fixture. Replay the fixture later with \`nock.define(recordings)\`. Always scrub secrets like auth tokens from recorded fixtures before committing them.

### How do I match a request body or query string with nock?

Pass a second argument to the verb method to match a body, e.g. \`.post('/users', { name: 'Ada' })\`, which only matches when the request body equals that object. For query strings, chain \`.query({ q: 'x', page: 2 })\`, or \`.query(true)\` to match any query string. You can also require headers with \`.matchHeader('authorization', 'Bearer x')\` or the \`reqheaders\` option on the scope.

### How do I stop nock from making real network calls?

Call \`nock.disableNetConnect()\` in a \`beforeAll\` hook so any request that is not matched by an interceptor throws \`NetConnectNotAllowedError\`. If you run local test servers, re-allow them with \`nock.enableNetConnect('127.0.0.1')\`. Restore normal networking with \`nock.enableNetConnect()\` in \`afterAll\`. This guarantees a forgotten mock fails loudly instead of reaching a production API.
`,
};
