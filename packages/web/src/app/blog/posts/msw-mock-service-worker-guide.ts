import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mock Service Worker (MSW) 2.0: The Complete Setup Guide',
  description:
    'Learn MSW API mocking from scratch: handlers, request interception, MSW 2.0 setup for Vitest and Jest, browser mocking, overrides, and error simulation.',
  date: '2026-06-24',
  category: 'Guide',
  content: `
# Mock Service Worker (MSW) 2.0: The Complete Setup Guide

Mock Service Worker, almost always written as MSW, is the API mocking library that finally got the abstraction right. Instead of monkey-patching \`fetch\` or stubbing your HTTP client, MSW intercepts requests at the network level using the Service Worker API in the browser and a request interceptor in Node. Your application code does not know it is being mocked. It makes a real \`fetch\` call, the request leaves your code exactly as it would in production, and MSW catches it on the wire and returns the response you defined. That single design decision is why MSW has become the default mocking layer for React, Vue, and Node test suites in 2026.

This guide is a complete, practical walkthrough of MSW 2.0, the major release that reshaped the handler syntax around the standard \`Request\` and \`Response\` objects from the Fetch API. We cover installation, writing your first handlers with the new \`http\` and \`HttpResponse\` primitives, wiring MSW into both Vitest and Jest, mocking in the browser during development, overriding handlers per test, simulating errors and network failures, mocking GraphQL, and the migration differences from the older 1.x \`rest\` and \`res(ctx)\` API. Every example is real, runnable TypeScript or JavaScript that reflects how MSW actually works today, not pseudo-code.

If you have ever fought with brittle \`jest.mock\` calls that break the moment you refactor your data-fetching layer, MSW is the answer. Because it operates below your application, you can swap Axios for native fetch, move from one query library to another, or restructure your API client entirely, and your mocks keep working. The same handler definitions power your unit tests, your integration tests, your component tests, and your local development server. Write the contract once, reuse it everywhere. If you are weighing test runners while you are here, our comparison of [Jest vs Vitest in 2026](/blog/jest-vs-vitest-2026) pairs naturally with this setup guide.

## Why Network-Level Mocking Beats Function Stubbing

Traditional mocking replaces a function. You import your API module, call \`jest.mock\` on it, and return canned data. The problem is coupling: your test now knows the exact shape of your data layer, so any refactor of that layer breaks every test, even when the behavior under test never changed. MSW inverts this. It mocks the network, which is a stable, standardized boundary. Your tests assert against the contract your app speaks to the outside world, not against your internal call structure.

The table below contrasts the two approaches across the dimensions that matter in practice.

| Dimension | Function stubbing (jest.mock) | Network mocking (MSW) |
|-----------|-------------------------------|-----------------------|
| What is replaced | Your module internals | The network response |
| Survives data-layer refactor | No | Yes |
| Reusable in browser dev | No | Yes |
| Mocks real HTTP semantics | No | Yes (status, headers, cookies) |
| Same mocks across test types | Rarely | Yes |
| Coupling to implementation | High | Low |

The practical payoff is durability. A well-written MSW handler outlives multiple rewrites of the code that calls it, because the only thing it depends on is the URL and the response shape, which is the actual contract.

## Installing MSW

Install MSW as a development dependency. The package ships with both the browser worker and the Node server in a single install.

\`\`\`bash
npm install msw@latest --save-dev
\`\`\`

If you plan to mock in the browser during development, generate the service worker script into your public directory. This file is what the browser registers to intercept requests.

\`\`\`bash
npx msw init ./public --save
\`\`\`

The \`--save\` flag records the worker directory in your \`package.json\` so future MSW updates know where to refresh the script. For Node-only usage, such as a pure Vitest or Jest unit suite, you can skip the \`init\` step entirely because the Node interceptor needs no generated file.

## Writing Your First Handlers in MSW 2.0

A handler describes how to respond to a particular request. In MSW 2.0 you import \`http\` to match methods and \`HttpResponse\` to build responses. The resolver function receives a context object and returns a standard \`Response\`.

\`\`\`typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/user', () => {
    return HttpResponse.json({
      id: 'u_1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
  }),

  http.post('/api/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.password === 'correct') {
      return HttpResponse.json({ token: 'abc123' }, { status: 200 });
    }
    return HttpResponse.json({ error: 'invalid credentials' }, { status: 401 });
  }),
];
\`\`\`

Notice how natural the request handling is. The \`request\` is a real \`Request\` object, so \`request.json()\`, \`request.headers\`, and \`request.url\` all behave exactly as they do in production. \`HttpResponse.json()\` is a convenience that sets the JSON content type and serializes the body for you, and the second argument accepts standard response init options like \`status\` and \`headers\`.

## Reading Path Params, Query Strings, and Headers

Real handlers need to inspect the incoming request. MSW 2.0 exposes path parameters through the resolver's \`params\` argument, and you read query strings and headers off the standard \`request\` object.

\`\`\`typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users/:userId', ({ params, request }) => {
    const { userId } = params;
    const url = new URL(request.url);
    const includeOrders = url.searchParams.get('orders') === 'true';
    const auth = request.headers.get('authorization');

    if (!auth) {
      return new HttpResponse(null, { status: 401 });
    }

    return HttpResponse.json({
      id: userId,
      orders: includeOrders ? [{ id: 'o_1', total: 42 }] : [],
    });
  }),
];
\`\`\`

The colon syntax \`:userId\` captures a path segment into \`params\`. Query parameters come from parsing \`request.url\` with the standard \`URL\` constructor, and headers use the \`Headers\` interface. Because everything is web-standard, there is almost no MSW-specific API to memorize beyond \`http\` and \`HttpResponse\`.

## MSW 2.0 Setup with Vitest

Vitest is the most common pairing for MSW in modern projects. You create a server from your handlers and control its lifecycle with Vitest's setup hooks. First, define the server.

\`\`\`typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
\`\`\`

Then wire it into a Vitest setup file that runs before your tests. The critical detail is \`onUnhandledRequest: 'error'\`, which makes any request your handlers do not cover fail loudly instead of silently hitting the real network.

\`\`\`typescript
// vitest.setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './src/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
\`\`\`

Finally, point Vitest at the setup file in your config so it loads automatically for every test run.

\`\`\`typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
\`\`\`

The three hooks form a clean lifecycle. \`listen\` starts interception once, \`resetHandlers\` undoes any per-test overrides so cases stay isolated, and \`close\` tears everything down. The \`resetHandlers\` call in \`afterEach\` is what keeps one test's runtime override from leaking into the next.

## MSW 2.0 Setup with Jest

Jest setup mirrors Vitest almost exactly; only the imports and config keys differ. Reuse the same \`server.ts\` file, then add a Jest setup file.

\`\`\`javascript
// jest.setup.js
const { server } = require('./src/mocks/server');

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
\`\`\`

Register it in your Jest configuration. Modern Jest with the JSDOM environment also needs the Fetch API and the \`TextEncoder\` polyfilled in some Node versions, which the \`setupFiles\` entry can handle.

\`\`\`javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./jest.setup.js'],
};
\`\`\`

The table below maps the equivalent configuration keys so you can move a project between runners without relearning the wiring.

| Concern | Vitest | Jest |
|---------|--------|------|
| Node server import | \`msw/node\` | \`msw/node\` |
| Setup file key | \`test.setupFiles\` | \`setupFilesAfterEach\` / \`setupFilesAfterEnv\` |
| Test environment | \`test.environment: 'jsdom'\` | \`testEnvironment: 'jsdom'\` |
| Lifecycle hooks | \`beforeAll\`/\`afterEach\`/\`afterAll\` | identical |
| Reset between tests | \`server.resetHandlers()\` | \`server.resetHandlers()\` |

Because the server API is identical across runners, the only thing you change when migrating is the config file. The handlers, the server, and the lifecycle hooks stay byte-for-byte the same.

## Overriding Handlers Per Test

Your default handlers describe the happy path. Individual tests often need a different response: an error, an empty list, a specific edge case. Use \`server.use()\` inside a test to register a one-off handler that takes precedence, and rely on \`resetHandlers\` in \`afterEach\` to clear it.

\`\`\`typescript
import { http, HttpResponse } from 'msw';
import { test, expect } from 'vitest';
import { server } from './src/mocks/server';
import { fetchUser } from './src/api';

test('shows fallback when the user endpoint is down', async () => {
  server.use(
    http.get('/api/user', () => {
      return new HttpResponse(null, { status: 500 });
    }),
  );

  const result = await fetchUser();
  expect(result).toEqual({ error: 'unavailable' });
});
\`\`\`

This is the single most important pattern for keeping MSW tests readable. The global handlers stay simple and represent the normal case, while each test that needs something unusual declares that override right next to its assertions. After the test, \`resetHandlers\` wipes the override, so the next test starts from the clean baseline again.

## Simulating Errors, Delays, and Network Failures

MSW can model the messy reality of networks: slow responses, timeouts, and hard connection failures. Use the \`delay\` utility to add latency and \`HttpResponse.error()\` to simulate a network-level failure rather than an HTTP error status.

\`\`\`typescript
import { http, HttpResponse, delay } from 'msw';

export const handlers = [
  http.get('/api/slow', async () => {
    await delay(2000);
    return HttpResponse.json({ ok: true });
  }),

  http.get('/api/unreachable', () => {
    return HttpResponse.error();
  }),

  http.get('/api/rate-limited', () => {
    return HttpResponse.json(
      { error: 'too many requests' },
      { status: 429, headers: { 'Retry-After': '30' } },
    );
  }),
];
\`\`\`

There is a meaningful distinction between \`HttpResponse.error()\` and returning a 500 status. The first simulates a failed connection, the kind of failure that rejects a \`fetch\` promise entirely, which is how you test your network-error handling. The second is a server that responded with an error status, which your code reaches via \`response.ok === false\`. Testing both paths is essential, and flaky behavior often hides in the gap between them. Our guide on [fixing flaky tests](/blog/fix-flaky-tests-guide) goes deeper on simulating timing and network conditions deterministically.

## Mocking in the Browser During Development

MSW's defining feature is that the same handlers run in the browser. Start the worker in your app's entry point, guarded so it only runs in development, and your local app gets a fully mocked backend with no server to spin up.

\`\`\`typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
\`\`\`

\`\`\`typescript
// src/main.tsx
async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  const { worker } = await import('./mocks/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  // render your app here
});
\`\`\`

Here \`onUnhandledRequest: 'bypass'\` is deliberate. In development you usually want unmocked requests to pass through to real services rather than error, so you can mock just the endpoints you are building against and let the rest hit your staging API. In tests you want the opposite, \`'error'\`, so coverage gaps surface immediately. Same handlers, different policy per environment.

## Mocking GraphQL Requests

MSW handles GraphQL as a first-class citizen through the \`graphql\` namespace, matching by operation name rather than URL. This is cleaner than trying to match GraphQL's single POST endpoint with HTTP handlers.

\`\`\`typescript
import { graphql, HttpResponse } from 'msw';

export const handlers = [
  graphql.query('GetProfile', () => {
    return HttpResponse.json({
      data: { profile: { id: '1', handle: 'ada' } },
    });
  }),

  graphql.mutation('UpdateProfile', ({ variables }) => {
    return HttpResponse.json({
      data: { updateProfile: { id: '1', handle: variables.handle } },
    });
  }),
];
\`\`\`

The resolver receives parsed \`variables\` directly, so you can branch on input without manually parsing the request body. For a broader treatment of validating API contracts and response shapes across REST and GraphQL, see our [API testing complete guide](/blog/api-testing-complete-guide). You can also find ready-to-install MSW and API mocking skills for AI coding agents in our [skills directory](/skills).

## Migrating from MSW 1.x to 2.0

If you are upgrading an existing project, the biggest change is the resolver signature. The old \`rest\` namespace became \`http\`, and the \`(req, res, ctx)\` triple collapsed into a single resolver that returns a standard \`Response\`. The table below maps the most common conversions.

| MSW 1.x | MSW 2.0 |
|---------|---------|
| \`rest.get(url, resolver)\` | \`http.get(url, resolver)\` |
| \`(req, res, ctx) => res(ctx.json(data))\` | \`() => HttpResponse.json(data)\` |
| \`res(ctx.status(404))\` | \`new HttpResponse(null, { status: 404 })\` |
| \`req.params.id\` | \`({ params }) => params.id\` |
| \`req.url.searchParams\` | \`new URL(request.url).searchParams\` |
| \`ctx.delay(1000)\` | \`await delay(1000)\` |

The mental model shift is from MSW's custom context helpers to web-standard \`Request\` and \`Response\` objects. Once that clicks, the new API is smaller and easier to remember because it is mostly just the platform. Most migrations are mechanical find-and-replace plus updating the response construction, and the handler URLs and matching logic carry over unchanged.

## Frequently Asked Questions

### What is Mock Service Worker and how does it work?

Mock Service Worker (MSW) is an API mocking library that intercepts network requests instead of stubbing functions. In the browser it uses the Service Worker API to catch requests on the wire, and in Node it uses a request interceptor. Your application makes real fetch calls that leave your code unchanged, and MSW returns the responses you defined. Because it mocks the network boundary, your mocks survive refactors of your data layer.

### How do I set up MSW 2.0 with Vitest?

Create a server with \`setupServer(...handlers)\` from \`msw/node\`, then in a Vitest setup file call \`server.listen({ onUnhandledRequest: 'error' })\` in \`beforeAll\`, \`server.resetHandlers()\` in \`afterEach\`, and \`server.close()\` in \`afterAll\`. Reference that setup file in \`vitest.config.ts\` under \`test.setupFiles\` and set \`environment: 'jsdom'\`. The error policy ensures any unmocked request fails loudly instead of hitting the real network.

### What changed between MSW 1.x and MSW 2.0?

MSW 2.0 replaced the \`rest\` namespace with \`http\` and collapsed the \`(req, res, ctx)\` resolver into a single function returning a standard \`Response\` via \`HttpResponse\`. Instead of \`res(ctx.json(data))\` you write \`HttpResponse.json(data)\`, and instead of \`ctx.status(404)\` you pass \`{ status: 404 }\` to the response init. The new API is built on web-standard Request and Response objects rather than custom context helpers.

### How do I mock an error response or network failure in MSW?

For an HTTP error status, return a response with the status set, like \`new HttpResponse(null, { status: 500 })\` or \`HttpResponse.json({ error: 'x' }, { status: 429 })\`. For a true network failure that rejects the fetch promise, return \`HttpResponse.error()\`. These are different code paths: the status error reaches your code as a response with \`ok === false\`, while the network error rejects entirely, so test both.

### Can I use the same MSW handlers in tests and in browser development?

Yes, that is MSW's core advantage. Define your handlers once, then create a Node server with \`setupServer\` for tests and a browser worker with \`setupWorker\` for development, passing the same handlers array to both. Typically you set \`onUnhandledRequest: 'error'\` in tests so gaps fail loudly, and \`'bypass'\` in development so unmocked requests reach your real staging API.

### How do I override an MSW handler for a single test?

Call \`server.use()\` inside the test with a new handler for the same endpoint; it takes precedence over the default. For example, register an \`http.get\` returning a 500 to test your error fallback. Because your setup runs \`server.resetHandlers()\` in \`afterEach\`, the override is automatically cleared after the test, so it never leaks into other cases and your baseline handlers stay clean.

### Does MSW support mocking GraphQL APIs?

Yes. MSW provides a \`graphql\` namespace that matches by operation name rather than URL, which suits GraphQL's single-endpoint model. Use \`graphql.query('GetUser', resolver)\` and \`graphql.mutation('UpdateUser', resolver)\`, and the resolver receives parsed \`variables\` directly so you can branch on inputs without manually reading the request body. Return data with \`HttpResponse.json({ data: {...} })\` just like REST handlers.

## Conclusion

Mock Service Worker changes API mocking from a brittle, implementation-coupled chore into a durable contract you write once and reuse everywhere. By intercepting at the network level rather than stubbing functions, MSW lets your mocks survive data-layer refactors, run identically in Vitest and Jest, and power your browser during development. You have seen the full path: installing MSW, writing MSW 2.0 handlers with \`http\` and \`HttpResponse\`, wiring the Node server into both test runners, overriding handlers per test, simulating errors and network failures, mocking in the browser, handling GraphQL, and migrating from 1.x.

The pattern to internalize is simple: simple global handlers for the happy path, \`server.use()\` overrides for the edge cases, \`resetHandlers\` between tests for isolation, and an error policy that fails loudly in tests but bypasses in development. Adopt it and your tests stop breaking on refactors you did not even touch. Ready to ship faster? Browse production-grade MSW, API mocking, and testing skills built for AI coding agents in our [skills directory](/skills) and wire them into your project today.
`,
};
