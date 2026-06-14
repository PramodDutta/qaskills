import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MSW Mock Service Worker: Complete Guide for 2026 (v2)',
  description:
    'Master Mock Service Worker (MSW) v2 in 2026: http handlers, HttpResponse.json, setupServer vs setupWorker, runtime overrides, GraphQL mocking, plus Vitest and Playwright integration.',
  date: '2026-06-14',
  category: 'Guide',
  content: `
# MSW Mock Service Worker: The Complete Guide for 2026

Mock Service Worker (MSW) is an API mocking library that intercepts requests at the network layer instead of patching \`fetch\` or \`axios\` inside your code. That single architectural decision is why MSW has become the default mocking tool for React, Vue, Svelte, Angular, and plain Node.js projects in 2026. Your application code makes a real \`fetch('/api/users')\` call, the request leaves your code exactly as it would in production, and MSW catches it on the wire and returns a mock response. Because the interception happens at the boundary, the same handlers work in unit tests, integration tests, Storybook, local development, and end-to-end Playwright runs without changing a single line of application code.

MSW v2 was a major rewrite built on the Fetch API standard. It replaced the old \`rest\` namespace with \`http\`, replaced the custom \`res(ctx.json(...))\` response composition with the standard \`HttpResponse\` and \`Response\` objects, and aligned the request object with the platform \`Request\` interface. If you learned MSW v1, almost every code sample you remember is now outdated. This guide is written entirely against the current v2 API so you can copy and paste examples that actually run.

In this guide you will build request handlers for REST and GraphQL, learn the difference between \`setupServer\` for Node and \`setupWorker\` for the browser, read request params, cookies, and bodies, override handlers at runtime for individual tests, simulate errors, network failures, and latency, and wire MSW into Vitest, Jest, and Playwright. We finish with a clear comparison of MSW against nock and WireMock so you know when each tool is the right call. If you want the broader picture of why teams mock at all, our [API mocking and service virtualization guide](/blog/api-mocking-service-virtualization-guide) sets the stage, and this article is the deep, hands-on companion.

## Key Takeaways

- MSW intercepts requests at the network layer, so your application code never knows it is being mocked
- The same handlers run in Node tests (\`setupServer\`) and in the browser (\`setupWorker\`) without modification
- MSW v2 uses the standard \`HttpResponse\` and \`Request\` objects from the Fetch API, replacing the v1 \`res/ctx\` pattern
- \`server.use()\` lets you override handlers at runtime for a single test, and \`{ once: true }\` makes a handler fire exactly once
- You can simulate HTTP errors, network failures (\`HttpResponse.error()\`), and latency (\`delay()\`) to test resilience paths
- GraphQL is a first-class citizen via the \`graphql\` namespace, matching by operation name
- MSW pairs cleanly with Vitest, Jest, and Playwright, replacing nock and WireMock for most front-end and Node use cases

---

## How MSW Works: Interception at the Network Boundary

Traditional mocking libraries replace the thing that makes the request. \`jest.mock('axios')\` swaps out the axios module; \`fetch-mock\` monkey-patches the global \`fetch\`. The problem is that your test now depends on a specific implementation detail. Switch from axios to native fetch and every mock breaks even though the network behavior is identical.

MSW takes a different path. In Node, it patches the low-level HTTP request primitives (via the \`@mswjs/interceptors\` package) so that any client built on top of them is intercepted. In the browser, it registers an actual Service Worker that sits between your page and the network and decides which requests to fulfill with mocks. In both environments the request leaves your code unchanged, travels to the interception layer, gets matched against your handlers, and a mock response is returned.

The practical payoff is that mocks survive refactors. You can migrate from axios to ky to native fetch, change your data-fetching library, or move logic between components, and your handlers keep working because they describe the network contract, not the call site. This is the same philosophy behind contract testing, which we cover in depth in our [API contract testing for microservices](/blog/api-contract-testing-microservices) guide.

Install MSW as a dev dependency and, for browser usage, generate the Service Worker file into your public directory.

\`\`\`bash
npm install msw --save-dev

# Only needed for browser/dev usage, not for Node tests
npx msw init ./public --save
\`\`\`

## Your First REST Handlers: http.get and http.post

A handler is a function that says "when a request matches this method and path, respond with this." In v2 you import the \`http\` namespace and call \`http.get\`, \`http.post\`, \`http.put\`, \`http.patch\`, \`http.delete\`, or \`http.all\`. The second argument is a resolver that receives the request and returns a response.

\`\`\`typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Ada Lovelace' },
      { id: 2, name: 'Alan Turing' },
    ]);
  }),

  http.post('https://api.example.com/users', async ({ request }) => {
    const newUser = (await request.json()) as { name: string };
    return HttpResponse.json({ id: 3, name: newUser.name }, { status: 201 });
  }),
];
\`\`\`

\`HttpResponse.json()\` is a convenience that sets the \`Content-Type: application/json\` header and serializes the body for you. You can also return a raw \`HttpResponse\` with text, set arbitrary status codes, and attach headers. Note that path matching supports relative paths like \`/users\` (matched against the current origin in the browser) as well as absolute URLs, and wildcard \`*\` segments.

\`\`\`typescript
http.get('/api/posts/:id', ({ params }) => {
  return HttpResponse.json({ id: params.id, title: 'Hello MSW' });
});

http.get('*/health', () => {
  return new HttpResponse('OK', { status: 200, headers: { 'X-Health': 'green' } });
});
\`\`\`

## setupServer vs setupWorker: Node Tests vs the Browser

MSW ships two entry points that share the same handlers but run in different environments. Choosing the right one is the most common point of confusion for newcomers.

| Aspect | \`setupServer\` (\`msw/node\`) | \`setupWorker\` (\`msw/browser\`) |
|---|---|---|
| Environment | Node.js: Vitest, Jest, CLI scripts | Browser: dev server, Storybook, Cypress component tests |
| Mechanism | Patches Node HTTP request primitives | Registers a real Service Worker |
| Setup file needed | No extra file | Requires \`mockServiceWorker.js\` via \`msw init\` |
| Start call | \`server.listen()\` | \`await worker.start()\` |
| Typical use | Automated test suites | Local development and visual testing |
| Lifecycle hooks | \`beforeAll\`, \`afterEach\`, \`afterAll\` | App bootstrap, conditionally in dev only |

For Node-based tests you create a server from your shared handlers.

\`\`\`typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
\`\`\`

For the browser you create a worker and start it before your app renders, usually gated behind an environment flag so it never ships to production.

\`\`\`typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

// src/main.tsx (entry point)
async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  // render your app here
});
\`\`\`

The key insight is that \`handlers\` is shared. You write request behavior once and reuse it in both Node and browser contexts.

## Reading Request Data: Params, Query, Cookies, and Body

A resolver receives a context object with \`request\`, \`params\`, \`cookies\`, and \`requestId\`. The \`request\` is a standard Fetch \`Request\`, so you read its URL, headers, and body using platform methods you already know.

\`\`\`typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Path params come from :segment tokens
  http.get('/api/users/:userId/posts/:postId', ({ params }) => {
    const { userId, postId } = params;
    return HttpResponse.json({ userId, postId });
  }),

  // Query parameters: parse the URL
  http.get('/api/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const page = Number(url.searchParams.get('page') ?? '1');
    return HttpResponse.json({ query, page, results: [] });
  }),

  // Cookies are parsed for you
  http.get('/api/profile', ({ cookies }) => {
    if (!cookies.session) {
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json({ session: cookies.session, name: 'Grace Hopper' });
  }),

  // JSON, text, and FormData bodies
  http.post('/api/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.password !== 'correct-horse') {
      return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    return HttpResponse.json(
      { token: 'jwt-token-here' },
      { headers: { 'Set-Cookie': 'session=abc123; HttpOnly' } },
    );
  }),

  http.post('/api/upload', async ({ request }) => {
    const data = await request.formData();
    const file = data.get('file');
    return HttpResponse.json({ received: file instanceof File ? file.name : null });
  }),
];
\`\`\`

Because the request is a real \`Request\`, you can also call \`request.headers.get('authorization')\`, read \`request.text()\`, or clone it. There is nothing MSW-specific to learn beyond the resolver signature.

## Passthrough: Letting Real Requests Through

Sometimes you only want to mock part of your traffic and let everything else hit the real network. MSW gives you two tools. The \`passthrough()\` function inside a resolver forwards that specific request to the actual server, and the \`onUnhandledRequest\` option controls what happens to requests with no matching handler.

\`\`\`typescript
import { http, passthrough, HttpResponse } from 'msw';

export const handlers = [
  // Mock only when a feature flag header is present, otherwise hit the real API
  http.get('https://api.example.com/feature', ({ request }) => {
    if (request.headers.get('x-use-mock') !== 'true') {
      return passthrough();
    }
    return HttpResponse.json({ enabled: true });
  }),
];

// Control unhandled requests globally
server.listen({
  onUnhandledRequest: 'warn', // 'bypass' | 'warn' | 'error' or a custom function
});
\`\`\`

In CI it is a good idea to set \`onUnhandledRequest: 'error'\` so an accidental real network call fails the test loudly instead of silently leaking out. For local development \`'bypass'\` is friendlier.

## Runtime Overrides with server.use() and One-Time Handlers

The handlers you register at setup are your defaults: the happy path that most tests rely on. But individual tests often need a different response, an error, or a slow request. The \`server.use()\` (or \`worker.use()\`) method prepends new handlers that take priority over the defaults for the duration of the test, and \`server.resetHandlers()\` clears them between tests so nothing leaks.

\`\`\`typescript
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

test('shows an error banner when the API returns 500', async () => {
  server.use(
    http.get('/api/users', () => {
      return new HttpResponse(null, { status: 500 });
    }),
  );

  // ...render the component and assert the error banner appears
});
\`\`\`

A common requirement is making a handler respond differently on its first versus subsequent calls, for example to test a retry that fails once and then succeeds. Pass \`{ once: true }\` and stack handlers.

\`\`\`typescript
test('retries once then succeeds', async () => {
  server.use(
    http.get('/api/data', () => HttpResponse.error(), { once: true }),
    http.get('/api/data', () => HttpResponse.json({ value: 42 })),
  );

  // First request fails at the network level, retry hits the second handler
});
\`\`\`

The \`{ once: true }\` handler is consumed after its first match, so the second, permanent handler serves every request after that. This pattern makes flaky-retry logic deterministic to test.

## Simulating Errors, Network Failures, and Latency

Resilience is only as good as your tests for the unhappy path. MSW makes three failure modes trivial to reproduce: HTTP error statuses, transport-level network errors, and slow responses.

\`\`\`typescript
import { http, HttpResponse, delay } from 'msw';

export const failureHandlers = [
  // HTTP error: server responded, but with 4xx/5xx
  http.get('/api/orders', () => {
    return HttpResponse.json({ message: 'Service unavailable' }, { status: 503 });
  }),

  // Network error: the request never completes (DNS failure, dropped connection)
  http.get('/api/payments', () => {
    return HttpResponse.error();
  }),

  // Latency: delay before responding, in milliseconds
  http.get('/api/reports', async () => {
    await delay(3000);
    return HttpResponse.json({ status: 'ready' });
  }),

  // Realistic random latency for load-like simulation
  http.get('/api/feed', async () => {
    await delay('real'); // mimics real-world server response time
    return HttpResponse.json({ items: [] });
  }),
];
\`\`\`

The distinction between \`HttpResponse.error()\` and a \`500\` status matters. A \`500\` is a response your error-handling code can read; \`HttpResponse.error()\` rejects the promise the way a dropped connection or CORS failure would, exercising your \`catch\` blocks and timeout logic. Test both, because front ends frequently handle them in different code paths.

## Mocking GraphQL with the graphql Namespace

GraphQL traffic is just HTTP POST to a single endpoint, so matching by URL is useless. MSW provides a dedicated \`graphql\` namespace that matches by operation name and type. You handle queries with \`graphql.query\`, mutations with \`graphql.mutation\`, and you can read variables off the resolver context.

\`\`\`typescript
import { graphql, HttpResponse } from 'msw';

export const graphqlHandlers = [
  graphql.query('GetUser', ({ variables }) => {
    return HttpResponse.json({
      data: {
        user: { id: variables.id, name: 'Margaret Hamilton' },
      },
    });
  }),

  graphql.mutation('CreatePost', ({ variables }) => {
    return HttpResponse.json({
      data: {
        createPost: { id: 'post-1', title: variables.input.title },
      },
    });
  }),

  // Return a GraphQL-shaped error
  graphql.query('GetSecret', () => {
    return HttpResponse.json({
      errors: [{ message: 'Forbidden', extensions: { code: 'FORBIDDEN' } }],
    });
  }),
];
\`\`\`

If you run multiple GraphQL endpoints, scope handlers to a specific URL with \`graphql.link('https://api.example.com/graphql')\` and then call \`.query\` and \`.mutation\` on the returned object. For a broader treatment of testing GraphQL APIs end to end, see our dedicated workflow patterns in the GraphQL section of the [API testing complete guide](/blog/api-testing-complete-guide).

## Integrating MSW with Vitest

Vitest is the fastest path to MSW in 2026. Create the server once, start it before the suite, reset handlers after each test, and close it at the end. Put this in a setup file referenced by \`vitest.config.ts\`.

\`\`\`typescript
// vitest.setup.ts
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './src/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
\`\`\`

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

The three lifecycle hooks are the load-bearing part. \`resetHandlers()\` after each test is what prevents a \`server.use()\` override in one test from bleeding into the next. If you are deciding between test runners, our [Jest vs Vitest comparison](/blog/jest-vs-vitest-2026) breaks down the tradeoffs; MSW works identically with both.

## Integrating MSW with Jest and Playwright

Jest setup is nearly identical to Vitest; only the imports change. Reference the setup file from \`setupFilesAfterEnv\` in your Jest config.

\`\`\`typescript
// jest.setup.ts
import { server } from './src/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
\`\`\`

Playwright is different because the application runs in a real browser, so you use the Service Worker (\`setupWorker\`) approach rather than \`setupServer\`. The cleanest pattern in 2026 is the \`@msw/playwright\` integration, which wires the worker into Playwright's fixtures and lets you override handlers per test.

\`\`\`typescript
import { test as base, expect } from '@playwright/test';
import { http, HttpResponse } from 'msw';
import { createWorkerFixture } from '@msw/playwright';
import { handlers } from './src/mocks/handlers';

const test = base.extend(createWorkerFixture({ initialHandlers: handlers }));

test('checkout shows an error when payment fails', async ({ page, worker }) => {
  await worker.use(
    http.post('/api/payments', () => HttpResponse.json({ error: 'declined' }, { status: 402 })),
  );

  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByText('Payment declined')).toBeVisible();
});
\`\`\`

This gives you the same handler-override ergonomics in end-to-end tests that you have in unit tests, which is a large part of why MSW won the front-end mocking space.

## MSW vs nock vs WireMock

These three tools all mock HTTP, but they target different layers and ecosystems. Choosing the right one depends on whether you are mocking from inside the test process or standing up a separate fake server.

| Feature | MSW | nock | WireMock |
|---|---|---|---|
| Interception layer | Network boundary (SW + Node interceptors) | Node \`http\`/\`https\` module only | Standalone HTTP server |
| Runtime | Browser and Node | Node only | JVM process (any client over HTTP) |
| Works in the browser | Yes | No | Via real server |
| Language | JavaScript/TypeScript | JavaScript/TypeScript | Java-first, language-agnostic over HTTP |
| GraphQL support | First-class | Manual | Manual via request matching |
| Same mocks for dev and tests | Yes | No | Partial |
| Best for | Front-end and full-stack JS apps | Pure Node backend unit tests | Polyglot teams, contract stubs, JVM services |

Pick MSW when you are building a JavaScript or TypeScript application and want one set of handlers across unit tests, integration tests, Storybook, and dev. Pick nock if you are writing a Node-only backend and prefer a lightweight, in-process interceptor with no Service Worker. Pick WireMock when you need a real, externally hosted fake server, often in a polyglot environment or for service virtualization across teams; our [service virtualization guide](/blog/api-mocking-service-virtualization-guide) covers that scenario in detail.

## Best Practices and Common Pitfalls

Keep your handlers organized around your real API surface, not around individual tests. A single \`handlers.ts\` that mirrors your production endpoints with sensible happy-path defaults, plus per-test \`server.use()\` overrides for edge cases, scales far better than a sprawl of bespoke handlers. Always call \`resetHandlers()\` between tests; the absence of that line is the single most common source of mysterious test-order dependencies.

Set \`onUnhandledRequest: 'error'\` in CI so an accidental real network call is caught immediately. Prefer relative paths (\`/api/...\`) in handlers so they work across environments, and reach for absolute URLs only when mocking third-party services. Type your request bodies and responses with shared types from your application so a contract drift shows up as a compile error. Finally, do not over-specify: assert on the behavior your component produces, not on the exact internal structure of every mock, or your tests become brittle.

## Conclusion

MSW v2 has earned its place as the default API mocking tool for JavaScript and TypeScript teams because it solves mocking at the right layer. By intercepting at the network boundary, the same handlers power your unit tests, integration tests, Storybook stories, local development, and Playwright end-to-end runs, all without touching application code. You have now seen how to write REST and GraphQL handlers, read params, cookies, and bodies, override behavior at runtime, simulate every failure mode, and integrate with Vitest, Jest, and Playwright, plus a clear-eyed comparison against nock and WireMock.

The next step is to put these patterns to work in a real test suite and pair them with the right surrounding skills. Browse the curated, agent-ready QA skills at [/skills](/skills) to drop battle-tested mocking, contract testing, and Playwright workflows straight into your AI coding agent, and turn this guide into running tests today.

## Frequently Asked Questions

### What is the difference between setupServer and setupWorker in MSW?

\`setupServer\` runs in Node and is used for automated tests in Vitest or Jest; it patches Node's HTTP request primitives. \`setupWorker\` runs in the browser by registering a real Service Worker, and is used for local development, Storybook, and component testing. Both consume the exact same handler array, so you write request behavior once and reuse it in both environments.

### How do I migrate from MSW v1 to v2?

The main changes are renaming the \`rest\` namespace to \`http\`, replacing the \`res(ctx.json(...))\` response composition with returning \`HttpResponse.json(...)\`, and reading requests through the standard Fetch \`Request\` object. Imports move to \`msw/node\` and \`msw/browser\`. The official codemod handles most rewrites automatically, but review GraphQL handlers and any custom context usage by hand.

### How do I override an MSW handler for a single test?

Call \`server.use()\` (or \`worker.use()\`) inside the test with a new handler. It is prepended, so it takes priority over your default handlers for that test only. Make sure you call \`server.resetHandlers()\` in an \`afterEach\` hook so the override does not leak into subsequent tests and cause order-dependent failures.

### Can MSW mock GraphQL APIs?

Yes. MSW has a dedicated \`graphql\` namespace that matches by operation name rather than URL. Use \`graphql.query('OperationName', resolver)\` for queries and \`graphql.mutation('OperationName', resolver)\` for mutations, reading \`variables\` from the resolver context. Use \`graphql.link(url)\` to scope handlers to a specific endpoint when you have more than one GraphQL server.

### How do I simulate a network error versus an HTTP error in MSW?

Return \`HttpResponse.error()\` to simulate a transport-level failure like a dropped connection, which rejects the request promise and exercises your \`catch\` blocks. Return a normal response with a 4xx or 5xx status, such as \`new HttpResponse(null, { status: 500 })\`, to simulate a server that responded with an error your code can read. Test both because front ends often handle them differently.

### Does MSW work with Playwright?

Yes. Because Playwright runs a real browser, you use the Service Worker (\`setupWorker\`) approach. The \`@msw/playwright\` package provides a fixture that wires the worker into Playwright and exposes \`worker.use()\` for per-test handler overrides, giving you the same runtime-override ergonomics in end-to-end tests that you have in unit tests.

### Should I use MSW or nock for Node tests?

Use MSW if you want one set of handlers shared across browser and Node, GraphQL support, and the ability to reuse mocks in dev. Use nock if you are writing a Node-only backend, want a minimal in-process interceptor, and have no browser or Service Worker requirements. MSW's broader scope is usually worth it for full-stack JavaScript teams.

### Do I need the Service Worker file for Node tests?

No. The \`mockServiceWorker.js\` file generated by \`npx msw init\` is only required for browser usage with \`setupWorker\`. Node tests using \`setupServer\` patch HTTP primitives directly and need no Service Worker file, so you can run MSW in Vitest or Jest without ever running \`msw init\`.
`,
};
