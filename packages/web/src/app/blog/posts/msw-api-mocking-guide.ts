import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MSW Tutorial 2026: Mock Service Worker API Mocking Guide',
  description:
    'Master Mock Service Worker (MSW) v2 for API mocking in tests. Learn http.get, HttpResponse, setupServer, and setupWorker with runnable TypeScript examples.',
  date: '2026-07-01',
  category: 'Guide',
  content: `
# MSW Tutorial 2026: Mock Service Worker API Mocking Guide

Mocking APIs in tests has always been messy. You stub \`fetch\`, you monkey-patch \`axios\`, you scatter \`jest.mock\` calls across files, and the moment you switch HTTP clients every mock breaks. Mock Service Worker, universally shortened to MSW, ends that mess by intercepting requests at the network level instead of patching your client code. Your application makes a real \`fetch\` call, MSW catches it on the wire, and returns the response you defined. The code under test has no idea it is talking to a mock.

That single design choice is why MSW has become the default answer to mock APIs in tests for React, Vue, Next.js, Node services, and beyond. Because interception happens at the network boundary, the exact same request handlers power your unit tests, your integration tests, your Storybook stories, and even local development in the browser. Write a handler once, reuse it everywhere. No conditionals, no environment-specific mock clients, no drift between what you test and what you ship.

This is a complete MSW tutorial for 2026 using the current v2 API. MSW v2 was a significant rewrite: it replaced the old \`rest\` namespace with \`http\`, introduced the \`HttpResponse\` helper, and adopted the standard Fetch API \`Request\` and \`Response\` objects. If you learned MSW from an older tutorial, much of the syntax you remember is gone. Everything in this guide uses the modern API and is runnable TypeScript. We will cover installation, request handlers, using MSW in Node tests with \`setupServer\`, using it in the browser with \`setupWorker\`, dynamic responses, error simulation, and CI patterns. For a broader testing foundation, pair this with our [API testing complete guide](/blog/api-testing-complete-guide) and the [QA skills](/skills) library.

## Why MSW Beats Traditional Mocking

Traditional mocking replaces a function. You tell Jest that \`fetch\` should return a canned value, or you swap out the axios instance. The problem is that this couples your tests to implementation details. Change from fetch to axios, or add a request interceptor, and every mock needs rewriting. Worse, you are not testing the real request path at all, so serialization bugs, header handling, and URL construction slip through.

MSW mocks the network, not the client. Your code runs unchanged, builds the real request, and MSW answers it. This means your tests exercise the actual data-fetching logic, and the mocks survive refactors of the HTTP layer. It is the closest you can get to a real backend without running one, which is the same philosophy behind good [API contract testing](/blog/api-contract-testing-microservices).

## Installing MSW and Initializing the Worker

Install MSW as a dev dependency. For browser usage you also generate a service worker script into your public directory with the CLI.

\`\`\`bash
# Install MSW
npm install msw --save-dev

# For browser usage, generate the service worker file
npx msw init ./public --save
\`\`\`

The \`init\` command copies \`mockServiceWorker.js\` into your public folder so the browser can register it. For Node-only testing (Jest, Vitest) you do not need this step; \`setupServer\` intercepts requests without a service worker. Node 18 or newer is recommended because MSW v2 relies on the built-in Fetch API.

## Writing Your First Request Handler with http.get

Handlers are the heart of MSW. Each handler matches an HTTP method and URL, then returns a response built with \`HttpResponse\`. In v2, \`HttpResponse.json()\` is the idiomatic way to return JSON.

\`\`\`typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/user', () => {
    return HttpResponse.json({
      id: 'u_123',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
  }),

  http.get('https://api.example.com/health', () => {
    return new HttpResponse('OK', { status: 200 });
  }),
];
\`\`\`

The handler callback receives a request-info object and returns either an \`HttpResponse\` or a standard \`Response\`. If a handler returns nothing, MSW lets the request pass through to the real network, which is useful for partial mocking.

## Understanding the http Namespace

MSW v2 exposes one method per HTTP verb on the \`http\` object. This replaced the v1 \`rest\` namespace entirely. Knowing the mapping saves confusion when following older tutorials.

| MSW v2 (current) | MSW v1 (deprecated) | Use for |
|------------------|---------------------|---------|
| \`http.get\` | \`rest.get\` | Fetching resources |
| \`http.post\` | \`rest.post\` | Creating resources |
| \`http.put\` | \`rest.put\` | Full updates |
| \`http.patch\` | \`rest.patch\` | Partial updates |
| \`http.delete\` | \`rest.delete\` | Deletions |
| \`http.all\` | \`rest.all\` | Any method on a path |

For GraphQL, MSW also ships a separate \`graphql\` namespace with \`graphql.query\` and \`graphql.mutation\`, covered in our [GraphQL testing guide](/blog/graphql-testing-complete-guide).

## Setting Up MSW in Node Tests with setupServer

For unit and integration tests running in Node, use \`setupServer\`. You start the server before all tests, reset handlers between tests so overrides do not leak, and close it when done. This lifecycle is the standard MSW test setup and works identically in Jest and Vitest.

\`\`\`typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
\`\`\`

\`\`\`typescript
// vitest.setup.ts (or jest.setup.ts)
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './src/mocks/server';

// Start intercepting requests before the test suite runs
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset any per-test handler overrides so tests stay isolated
afterEach(() => server.resetHandlers());

// Clean up once the suite finishes
afterAll(() => server.close());
\`\`\`

Setting \`onUnhandledRequest: 'error'\` is a best practice: it fails loudly when your code hits an endpoint you forgot to mock, instead of silently letting it through. Wire this setup file into your test config so it runs automatically. If you are choosing between runners, see our [Jest vs Vitest comparison](/blog/jest-vs-vitest-2026).

## Writing a Test That Uses MSW

With the server running, your test just calls the code that fetches data. No mocking of fetch or axios anywhere in the test body.

\`\`\`typescript
// user.test.ts
import { describe, it, expect } from 'vitest';

async function getUser() {
  const res = await fetch('https://api.example.com/user');
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

describe('getUser', () => {
  it('returns the mocked user', async () => {
    const user = await getUser();
    expect(user.name).toBe('Ada Lovelace');
    expect(user.email).toBe('ada@example.com');
  });
});
\`\`\`

The test reads like a real integration test because it is one, minus the actual server. The request is built and dispatched exactly as it would be in production.

## Reading Request Params, Query, and Body

Real handlers often need to inspect the incoming request. MSW v2 gives you the standard \`request\` object plus a \`params\` bag for path parameters. Reading a JSON body uses the native \`await request.json()\`.

\`\`\`typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Path parameter: /users/:id
  http.get('https://api.example.com/users/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ id, name: \\\`User \\\${id}\\\` });
  }),

  // Query string: ?role=admin
  http.get('https://api.example.com/users', ({ request }) => {
    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    return HttpResponse.json({ role, count: role === 'admin' ? 2 : 10 });
  }),

  // Request body on POST
  http.post('https://api.example.com/users', async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json({ id: 'u_new', name: body.name }, { status: 201 });
  }),
];
\`\`\`

Note the escaped template literal inside the path-parameter handler. When you build response strings from parameters you use normal JS template literals in your real code; here they appear escaped only because this article is stored in a template string.

## Simulating Errors and HTTP Status Codes

Testing the unhappy path is where MSW shines. You can return any status code, delay responses, or simulate network failures. This lets you verify loading spinners, retry logic, and error boundaries deterministically.

\`\`\`typescript
// src/mocks/error-handlers.ts
import { http, HttpResponse, delay } from 'msw';

export const errorHandlers = [
  // Return a 500 server error
  http.get('https://api.example.com/user', () => {
    return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }),

  // Return a 404 not found
  http.get('https://api.example.com/users/:id', () => {
    return new HttpResponse(null, { status: 404 });
  }),

  // Simulate a slow network with a delay
  http.get('https://api.example.com/slow', async () => {
    await delay(2000);
    return HttpResponse.json({ ok: true });
  }),

  // Simulate a total network error (connection refused)
  http.get('https://api.example.com/down', () => {
    return HttpResponse.error();
  }),
];
\`\`\`

\`HttpResponse.error()\` produces a network-level failure, distinct from an HTTP error status, so you can test how your code reacts when the request never completes.

## Overriding Handlers Per Test

A clean pattern is to define happy-path handlers globally and override them only for the specific test that needs an error or edge case. \`server.use()\` prepends a handler that takes priority, and \`resetHandlers()\` in \`afterEach\` removes it afterward.

\`\`\`typescript
// user-error.test.ts
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './src/mocks/server';

describe('getUser error handling', () => {
  it('throws when the API returns 500', async () => {
    // Override only for this test
    server.use(
      http.get('https://api.example.com/user', () => {
        return HttpResponse.json({ message: 'boom' }, { status: 500 });
      }),
    );

    await expect(
      fetch('https://api.example.com/user').then((r) => {
        if (!r.ok) throw new Error('Request failed');
        return r.json();
      }),
    ).rejects.toThrow('Request failed');
  });
});
\`\`\`

Because \`afterEach(() => server.resetHandlers())\` runs, this override disappears before the next test, keeping every test isolated. This isolation discipline is a key defense against [flaky tests](/blog/fix-flaky-tests-guide).

## Running MSW in the Browser with setupWorker

The same handlers power in-browser mocking during development. Instead of \`setupServer\`, you use \`setupWorker\` from \`msw/browser\`. This registers the service worker generated earlier and intercepts real browser requests, so you can build UI against a mock backend before the real API exists.

\`\`\`typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
\`\`\`

\`\`\`typescript
// src/main.tsx (or your app entry)
async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') return;
  const { worker } = await import('./mocks/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  // Render your app after the worker is ready
  // ReactDOM.createRoot(...).render(<App />)
});
\`\`\`

Guard the worker so it only starts in development, and set \`onUnhandledRequest: 'bypass'\` in the browser so unmocked requests still reach the real network. This single-source-of-truth approach, one handler set for tests and dev, is the biggest reason teams adopt MSW.

## Comparing MSW to Other Mocking Approaches

Understanding where MSW fits helps you choose the right tool. Here is how it stacks up against the common alternatives.

| Approach | Mocks at | Client-agnostic | Reuse in browser | Refactor-safe |
|----------|----------|-----------------|------------------|---------------|
| MSW | Network layer | Yes | Yes | Yes |
| jest.mock('axios') | Module | No | No | No |
| fetch-mock | fetch global | Only fetch | Limited | Partial |
| nock | HTTP in Node | Yes | No | Yes |
| Manual stubs | Function | No | No | No |

MSW is the only option that is client-agnostic, reusable in the browser, and refactor-safe at the same time, which is why it has become the standard for mocking APIs in modern JavaScript testing.

There is one nuance worth calling out. \`nock\` remains an excellent choice for pure Node HTTP interception in library code, and \`fetch-mock\` is lightweight if your app only ever uses the fetch API and you never need browser reuse. But the moment you want one set of mocks to serve tests, Storybook, and local development, or the moment your app mixes fetch and axios, MSW is the clear winner. The cost of MSW is a slightly heavier setup and a service worker file for browser use; the payoff is that you never rewrite mocks when your data layer changes.

## Best Practices for MSW in CI

To keep MSW reliable in continuous integration, follow a few rules. Always set \`onUnhandledRequest: 'error'\` in tests so forgotten mocks fail the build instead of hitting real services. Keep handlers in a shared \`mocks\` directory so tests, Storybook, and dev all import the same source. Reset handlers after every test to prevent leakage. Pin your MSW version to avoid behavior changes mid-sprint. And avoid mixing MSW with client-level mocks in the same test, since double-mocking causes confusing failures.

\`\`\`typescript
// Recommended global config for tests
server.listen({
  onUnhandledRequest: (req) => {
    // Fail on any request that has no handler
    throw new Error(\\\`No handler for \\\${req.method} \\\${req.url}\\\`);
  },
});
\`\`\`

Wire this into the same CI pipeline that runs the rest of your suite, as described in our [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions), so API contract regressions are caught on every pull request.

## Mocking GraphQL APIs with MSW

REST is not the only protocol MSW handles. The library ships a dedicated \`graphql\` namespace that matches operations by name rather than URL, which fits how GraphQL clients batch queries to a single endpoint. You declare handlers for named queries and mutations, read variables from the request, and return typed data with the same \`HttpResponse.json\` helper.

\`\`\`typescript
// src/mocks/graphql-handlers.ts
import { graphql, HttpResponse } from 'msw';

export const graphqlHandlers = [
  // Match a query named GetUser
  graphql.query('GetUser', ({ variables }) => {
    const { id } = variables;
    return HttpResponse.json({
      data: { user: { id, name: 'Grace Hopper' } },
    });
  }),

  // Match a mutation named CreatePost and read its variables
  graphql.mutation('CreatePost', ({ variables }) => {
    return HttpResponse.json({
      data: { createPost: { id: 'p_1', title: variables.title } },
    });
  }),
];
\`\`\`

Because MSW matches on operation name, one endpoint URL can serve any number of mocked queries and mutations. You mix these handlers into the same \`setupServer\` or \`setupWorker\` array alongside your REST handlers, so a single MSW setup covers a mixed-protocol app. For a deeper treatment of testing schemas and resolvers, see the [GraphQL testing guide](/blog/graphql-testing-complete-guide).

## Debugging Unhandled and Mismatched Requests

The most common frustration with MSW is a request slipping through unmocked or matching the wrong handler. MSW gives you tools to diagnose both. The \`onUnhandledRequest\` option controls what happens when no handler matches, and MSW logs a clear warning showing the method and URL it could not resolve. Order matters too: handlers are evaluated top to bottom, and \`server.use()\` prepends overrides, so a broad handler placed first can shadow a specific one below it.

\`\`\`typescript
// Diagnose which requests are not matching
server.listen({
  onUnhandledRequest(request, print) {
    // Only warn for your own API, ignore third-party analytics, etc.
    if (request.url.includes('api.example.com')) {
      print.warning();
    }
  },
});
\`\`\`

When a request matches the wrong mock, check three things in order. First, confirm the URL pattern is exact, including protocol and trailing slashes. Second, verify handler ordering, since the first match wins. Third, ensure \`resetHandlers()\` runs in \`afterEach\` so a \`server.use()\` override from a previous test is not leaking forward. This same isolation checklist keeps larger [cross-browser testing](/blog/cross-browser-testing-guide) suites deterministic.

## Frequently Asked Questions

### What is Mock Service Worker (MSW)?

Mock Service Worker is a JavaScript library that intercepts network requests and returns mock responses. Unlike traditional mocking that patches your HTTP client, MSW works at the network level using a service worker in the browser or a request interceptor in Node. Your application code makes real requests unchanged, and MSW answers them, so the same mocks work across unit tests, integration tests, Storybook, and local development.

### What changed in MSW v2?

MSW v2 was a major rewrite. The \`rest\` namespace was replaced by \`http\`, so you now write \`http.get\` instead of \`rest.get\`. Responses are built with the new \`HttpResponse\` helper, and handlers use the standard Fetch API Request and Response objects. Reading a request body uses native \`await request.json()\`. If you follow an old tutorial using \`rest\` and \`res(ctx.json(...))\`, that syntax no longer works in v2.

### How do I use MSW with Jest or Vitest?

Create a server with \`setupServer(...handlers)\` from \`msw/node\`, then in a setup file call \`server.listen()\` in \`beforeAll\`, \`server.resetHandlers()\` in \`afterEach\`, and \`server.close()\` in \`afterAll\`. Register that setup file in your Jest or Vitest config. Your tests then call the code that fetches data normally, with no need to mock fetch or axios directly, and MSW intercepts the requests.

### Can I use the same MSW mocks in the browser and in tests?

Yes, and that reuse is MSW's main advantage. Define your request handlers once in a shared file. Import them into \`setupServer\` for Node tests and into \`setupWorker\` for browser and Storybook usage. The handlers are identical, so there is no drift between how your app behaves in tests versus development. This single source of truth eliminates duplicated, environment-specific mock logic.

### How do I simulate API errors with MSW?

Return an error status from a handler using \`HttpResponse.json(body, { status: 500 })\` or \`new HttpResponse(null, { status: 404 })\`. For a total network failure use \`HttpResponse.error()\`, and for slow responses use \`await delay(ms)\` before returning. You can register these per-test with \`server.use()\` so only the specific test sees the error, keeping other tests on the happy path.

### Does MSW work with axios, fetch, and other HTTP clients?

Yes. Because MSW intercepts at the network layer rather than patching a specific client, it works with fetch, axios, ky, superagent, and any library that ultimately makes HTTP requests. This client-agnostic behavior means you can refactor your data layer or swap HTTP libraries without touching a single mock, which is impossible with module-level mocking approaches like \`jest.mock('axios')\`.

### Do I need a service worker file for Node tests?

No. The \`mockServiceWorker.js\` file generated by \`npx msw init\` is only required for browser usage with \`setupWorker\`. For Node-based tests with Jest or Vitest, \`setupServer\` uses a request interceptor and needs no service worker file. Run \`msw init\` only when you plan to mock APIs in the browser during development or in Storybook.

## Conclusion

MSW changes how you think about API mocking by moving the boundary from your code to the network. With v2's \`http\` handlers, \`HttpResponse\`, \`setupServer\` for tests, and \`setupWorker\` for the browser, you write a single set of request handlers and reuse them everywhere. Your tests exercise real request paths, survive HTTP-client refactors, and fail loudly on forgotten endpoints, giving you integration-level confidence without a running backend.

Start by mocking one endpoint your app already calls, add the \`setupServer\` lifecycle to your test config, and set \`onUnhandledRequest: 'error'\`. Then expand handler coverage and share the same mocks with Storybook and local dev. To equip your AI coding agents and QA workflows with more battle-tested patterns like this, explore the full [QA skills](/skills) directory and make reliable API mocking a default in every project you ship.
`,
};
