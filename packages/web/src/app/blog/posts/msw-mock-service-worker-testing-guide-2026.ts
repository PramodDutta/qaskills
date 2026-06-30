import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MSW Mock Service Worker Testing: The Complete 2026 Guide',
  description:
    'Learn MSW v2 mock service worker testing: setupServer, setupWorker, http.get/http.post handlers, HttpResponse, and integration with Vitest, Jest, Playwright.',
  date: '2026-06-30',
  category: 'Guide',
  content: `
# MSW Mock Service Worker Testing: The Complete 2026 Guide

Mock Service Worker (MSW) is an API mocking library that intercepts network requests at the network level rather than by stubbing \`fetch\` or \`axios\`. Instead of monkey-patching your HTTP client and coupling tests to implementation details, MSW registers a Service Worker in the browser or a request interceptor in Node, so your application code makes the same real \`fetch\` and \`axios\` calls it always does — MSW just answers them. This is the central reason MSW mock service worker testing has become the default mocking strategy for React, Vue, Svelte, and plain TypeScript projects: the same mock definitions power your unit tests, your component tests, your Storybook, and even your local development server.

MSW v2, the current major version, fully embraces the standard \`Request\` and \`Response\` web APIs through its \`http\` namespace and the \`HttpResponse\` helper. A handler is just a function that receives a request and returns a response, which means your mocks read like a tiny server. In this guide you will learn how to define handlers with \`http.get\` and \`http.post\`, return JSON and errors with \`HttpResponse\`, run MSW in Node with \`setupServer\` for Vitest and Jest, run it in the browser with \`setupWorker\`, override handlers per-test, mock GraphQL, and integrate the whole thing into Playwright. Every snippet is real, runnable TypeScript. If you are comparing test runners, see [Vitest vs Jest in 2026](/blog/vitest-vs-jest-2026-comparison), and browse the [QA skills directory](/skills) for more testing recipes.

## Why Network-Level Mocking Beats Stubbing fetch

The traditional way to mock an API in a test is to replace the HTTP client: \`vi.mock('axios')\` or \`global.fetch = vi.fn()\`. This works until it does not. The moment you switch from \`fetch\` to \`axios\`, or add a request interceptor, or change a URL, your mocks break even though the behavior your test cares about did not change. You are testing the plumbing, not the contract.

MSW flips this. It intercepts at the network boundary, so it does not care whether you use \`fetch\`, \`axios\`, \`ky\`, or \`XMLHttpRequest\`. Your test asserts that *given* a known response from \`/api/users\`, the component renders the right thing. That mirrors how the app behaves in production far more faithfully than a stubbed function ever could. The same idea drives browser-level mocking in [Playwright network mocking](/blog/playwright-network-mocking-route-guide-2026); MSW brings it to your unit and component layers.

## Installing MSW v2

Install MSW as a dev dependency and, for browser usage, generate the Service Worker script into your public directory.

\`\`\`bash
npm install --save-dev msw@latest

# Generate the worker script for browser/integration use
npx msw init ./public --save
\`\`\`

The \`msw init\` command copies \`mockServiceWorker.js\` into your public folder so the browser can register it. For Node-only testing (Vitest or Jest), you do not need this step — \`setupServer\` works without a Service Worker file.

## Defining Request Handlers

Handlers are the heart of MSW. In v2 you import the \`http\` namespace and the \`HttpResponse\` helper. A handler matches a method and URL pattern, then returns a response.

\`\`\`typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // GET request returning a JSON list
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Ada Lovelace' },
      { id: 2, name: 'Grace Hopper' },
    ]);
  }),

  // GET with a path parameter
  http.get('/api/users/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ id: Number(id), name: 'Ada Lovelace' });
  }),

  // POST reading the request body and echoing it back with 201
  http.post('/api/users', async ({ request }) => {
    const newUser = (await request.json()) as { name: string };
    return HttpResponse.json({ id: 99, name: newUser.name }, { status: 201 });
  }),
];
\`\`\`

Three things to notice. Path parameters like \`:id\` are available on \`params\`. The request body is read with the standard \`await request.json()\`. And \`HttpResponse.json\` serializes the object and sets the \`Content-Type\` header automatically, with an optional second argument for status and headers.

## The HttpResponse Helper Reference

\`HttpResponse\` is a thin wrapper over the web \`Response\` class with convenience constructors. These are the forms you will use most.

| Call | Returns | Use case |
|---|---|---|
| \`HttpResponse.json(data)\` | 200 JSON response | Standard success payload |
| \`HttpResponse.json(data, { status: 201 })\` | Custom status JSON | Created / accepted responses |
| \`HttpResponse.text('OK')\` | 200 plain text | Health checks, text endpoints |
| \`HttpResponse.json({ error: 'msg' }, { status: 500 })\` | Error response | Force failure states |
| \`new HttpResponse(null, { status: 204 })\` | Empty 204 | Deletes, no-content |
| \`HttpResponse.json(data, { headers })\` | JSON with headers | Pagination, ETag, custom headers |

## Reading Query Params, Headers, and Bodies

Because handlers receive a standard \`Request\`, you have the full web API at your disposal for inspecting the incoming call.

\`\`\`typescript
import { http, HttpResponse } from 'msw';

export const searchHandler = http.get('/api/products', ({ request }) => {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const auth = request.headers.get('Authorization');

  if (!auth) {
    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return HttpResponse.json({
    category,
    products: [{ id: 1, name: 'TypeScript Book', category }],
  });
});
\`\`\`

This handler reads the \`category\` query parameter, checks for an \`Authorization\` header, and returns a 401 when it is missing — letting you test both the happy path and the unauthenticated path with the same endpoint.

## Running MSW in Node with setupServer (Vitest and Jest)

For unit and component tests that run in Node or jsdom, \`setupServer\` starts an interceptor that needs no Service Worker file. Wire it into your test setup so the server starts once and resets handlers between tests.

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

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
\`\`\`

The \`onUnhandledRequest: 'error'\` option is the secret to catching mistakes: any request your code makes that is not covered by a handler fails loudly instead of silently hitting a real network. \`resetHandlers()\` after each test discards per-test overrides so tests stay isolated. Register this file in your config — \`setupFiles: ['./vitest.setup.ts']\` for Vitest, or \`setupFilesAfterEnv\` for Jest. For a deeper comparison of the two runners, see [Vitest vs Jest in 2026](/blog/vitest-vs-jest-2026-comparison).

## A Complete Vitest Component Test

Here is a full example: a React component that fetches users, tested with Vitest, Testing Library, and MSW. No \`fetch\` is stubbed.

\`\`\`typescript
// UserList.test.tsx
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { test, expect } from 'vitest';
import { server } from './src/mocks/server';
import { UserList } from './UserList';

test('renders users from the API', async () => {
  render(<UserList />);
  expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
  expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
});

test('shows an error banner when the API returns 500', async () => {
  // Override the default handler for this test only
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json({ error: 'boom' }, { status: 500 });
    })
  );

  render(<UserList />);
  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
});
\`\`\`

The first test relies on the default handler from \`handlers.ts\`. The second uses \`server.use()\` to override that handler with a 500 response just for that test — and because \`afterEach\` calls \`resetHandlers()\`, the override is gone before the next test runs. This override pattern is how you test loading, empty, and error states deterministically.

## Running MSW in the Browser with setupWorker

For integration tests, Storybook, or local development, \`setupWorker\` registers the actual Service Worker so mocks run in a real browser.

\`\`\`typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
\`\`\`

\`\`\`typescript
// src/main.tsx — start the worker only in development
async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') return;
  const { worker } = await import('./mocks/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  // render your app here
});
\`\`\`

In the browser, \`onUnhandledRequest: 'bypass'\` lets requests you have not mocked pass through to the real network — useful in development where you mock only the endpoints you are working on. The same \`handlers\` array powers both the Node server and the browser worker, so your mocks never drift.

## setupServer vs setupWorker: Which to Use

The two entry points target different environments. Use this table to choose.

| Aspect | \`setupServer\` (Node) | \`setupWorker\` (Browser) |
|---|---|---|
| Import | \`msw/node\` | \`msw/browser\` |
| Environment | Vitest, Jest, jsdom, Node | Real browser, Storybook, dev |
| Needs worker file | No | Yes (\`msw init\`) |
| Interception | Node request interceptor | Service Worker |
| Lifecycle | \`listen / resetHandlers / close\` | \`worker.start() / worker.stop()\` |
| Best for | Unit + component tests | Integration, demos, local dev |

## Mocking GraphQL

MSW mocks GraphQL with the same handler model through its \`graphql\` namespace, matching by operation name rather than URL.

\`\`\`typescript
import { graphql, HttpResponse } from 'msw';

export const graphqlHandlers = [
  graphql.query('GetUser', ({ variables }) => {
    return HttpResponse.json({
      data: { user: { id: variables.id, name: 'Ada Lovelace' } },
    });
  }),

  graphql.mutation('CreateUser', ({ variables }) => {
    return HttpResponse.json({
      data: { createUser: { id: '99', name: variables.name } },
    });
  }),
];
\`\`\`

The \`variables\` object gives you the GraphQL operation variables, and you return a \`data\` (or \`errors\`) shape exactly as a GraphQL server would. This means a single MSW setup can mock both your REST and GraphQL endpoints side by side.

## Integrating MSW with Playwright

While Playwright has its own \`page.route\` interception, you can reuse your existing MSW handlers in Playwright end-to-end tests by starting the browser worker inside the app under test. The cleaner approach for many teams is to keep MSW for component and integration tests and use Playwright's native routing for full E2E. When you do want MSW inside Playwright, start the worker in your app's development build and let Playwright drive the real UI.

\`\`\`typescript
// playwright fixture that ensures the MSW worker is ready
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('msw-enabled', 'true');
    });
    await use(page);
  },
});

test('user list renders mocked data', async ({ page }) => {
  await page.goto('/users');
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
});
\`\`\`

Here the app reads the \`msw-enabled\` flag on boot and starts \`setupWorker\` before rendering. For a full treatment of browser-level interception in Playwright itself, read [Playwright network mocking](/blog/playwright-network-mocking-route-guide-2026).

## Dynamic Responses and Stateful Mocks

Handlers are plain functions, so you can hold state across requests to simulate a stateful backend — useful for testing create-then-read flows.

\`\`\`typescript
import { http, HttpResponse } from 'msw';

let users = [{ id: 1, name: 'Ada Lovelace' }];

export const statefulHandlers = [
  http.get('/api/users', () => HttpResponse.json(users)),

  http.post('/api/users', async ({ request }) => {
    const body = (await request.json()) as { name: string };
    const created = { id: users.length + 1, name: body.name };
    users.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),
];

// Reset state between tests in afterEach to keep isolation
export function resetUsers() {
  users = [{ id: 1, name: 'Ada Lovelace' }];
}
\`\`\`

Remember to reset module-level state in \`afterEach\`, alongside \`server.resetHandlers()\`, so one test's writes never leak into the next.

## Best Practices for MSW Mock Service Worker Testing

Keep a single shared \`handlers.ts\` that both \`setupServer\` and \`setupWorker\` consume, so your tests, Storybook, and dev server never disagree about what the API returns. Always set \`onUnhandledRequest: 'error'\` in tests so an unmocked request fails loudly instead of silently calling the network. Use \`server.use()\` for per-test overrides rather than editing the shared handlers, and rely on \`resetHandlers()\` in \`afterEach\` to keep tests isolated. Model your mock payloads on real API responses — ideally generated from the same OpenAPI or GraphQL schema — so mocks stay honest. Finally, treat MSW as the boundary for unit and component tests and reserve full network E2E for tools like Playwright, so each layer tests the right thing.

## Simulating Latency, Errors, and Network Conditions

Deterministic tests need to exercise more than the happy path. MSW lets you simulate slow responses, network failures, and partial outages directly inside handlers, so you can verify spinners, timeouts, retries, and error banners render correctly. The \`delay\` utility pauses a handler before it responds, and \`HttpResponse.error()\` produces a genuine network-level failure rather than an HTTP error status.

\`\`\`typescript
import { http, HttpResponse, delay } from 'msw';

export const resilienceHandlers = [
  // A slow endpoint to test loading states and timeouts
  http.get('/api/reports', async () => {
    await delay(2000);
    return HttpResponse.json({ ready: true });
  }),

  // A hard network failure (DNS error, connection refused, etc.)
  http.get('/api/flaky', () => {
    return HttpResponse.error();
  }),

  // Intermittent failure: fail the first call, succeed after
  http.get('/api/retry-me', (() => {
    let calls = 0;
    return () => {
      calls += 1;
      if (calls === 1) {
        return HttpResponse.json({ error: 'temporary' }, { status: 503 });
      }
      return HttpResponse.json({ ok: true });
    };
  })()),
];
\`\`\`

The retry handler closes over a counter so it fails once and then succeeds — exactly what you need to test a client's retry-with-backoff logic. Pair \`delay\` with fake timers in Vitest or Jest to assert a spinner appears before the response resolves, giving you full control over timing without a real slow server. This mirrors the deterministic error-injection approach used in [Playwright network mocking](/blog/playwright-network-mocking-route-guide-2026), brought down to the unit and component layer.

## Type-Safe Handlers and Mocking Best Practices at Scale

As a suite grows, untyped mock payloads drift from the real API and silently lie to your tests. MSW v2 lets you parameterize handlers with TypeScript generics so the request body, response body, and path params are all checked at compile time. Combining that with response fixtures generated from your OpenAPI or GraphQL schema keeps mocks honest.

\`\`\`typescript
import { http, HttpResponse } from 'msw';

interface User {
  id: number;
  name: string;
  email: string;
}

interface CreateUserBody {
  name: string;
  email: string;
}

export const typedHandlers = [
  // Response body is type-checked against User[]
  http.get<never, never, User[]>('/api/users', () => {
    return HttpResponse.json([{ id: 1, name: 'Ada', email: 'ada@example.com' }]);
  }),

  // Request body is type-checked against CreateUserBody
  http.post<never, CreateUserBody, User>('/api/users', async ({ request }) => {
    const body = await request.json(); // typed as CreateUserBody
    return HttpResponse.json(
      { id: 2, name: body.name, email: body.email },
      { status: 201 }
    );
  }),
];
\`\`\`

The generics on \`http.get\` and \`http.post\` are \`<PathParams, RequestBody, ResponseBody>\`. With these in place, a typo in a mocked field or a payload that no longer matches the real contract becomes a compile error, not a test that passes against fiction. Centralize these typed handlers, share the same TypeScript interfaces your application uses, and your mocks evolve in lockstep with your API. For choosing the runner that consumes these mocks, weigh the trade-offs in [Vitest vs Jest in 2026](/blog/vitest-vs-jest-2026-comparison), and find more reusable patterns in the [QA skills directory](/skills).

## Frequently Asked Questions

### What is MSW mock service worker testing?

MSW (Mock Service Worker) is a library that intercepts HTTP requests at the network level using a Service Worker in the browser or a request interceptor in Node. Instead of stubbing \`fetch\` or \`axios\`, your application makes real requests that MSW answers with defined handlers. This makes mocks reusable across unit tests, component tests, Storybook, and local development.

### How do I set up MSW with Vitest?

Create a \`server.ts\` that calls \`setupServer(...handlers)\` from \`msw/node\`, then in a setup file call \`server.listen()\` in \`beforeAll\`, \`server.resetHandlers()\` in \`afterEach\`, and \`server.close()\` in \`afterAll\`. Register the setup file via \`setupFiles\` in your Vitest config. Use \`onUnhandledRequest: 'error'\` so unmocked requests fail the test loudly.

### What is the difference between setupServer and setupWorker?

\`setupServer\` from \`msw/node\` runs in Node and jsdom for unit and component tests, using a request interceptor and needing no worker file. \`setupWorker\` from \`msw/browser\` registers an actual Service Worker for real browsers, Storybook, and local development, and requires running \`msw init\` to generate \`mockServiceWorker.js\`. Both consume the same handler array.

### How do I override an MSW handler for a single test?

Call \`server.use()\` inside the test with a new handler for the same method and URL. It takes precedence over the default handlers for the rest of that test. Because \`afterEach\` calls \`server.resetHandlers()\`, the override is discarded before the next test, keeping tests isolated. This is the standard way to test error and empty states.

### Can MSW mock GraphQL APIs?

Yes. Import the \`graphql\` namespace and define handlers with \`graphql.query('OperationName', resolver)\` and \`graphql.mutation('OperationName', resolver)\`. Handlers match by operation name and receive the operation \`variables\`, returning a \`data\` or \`errors\` object via \`HttpResponse.json\` exactly as a GraphQL server would. REST and GraphQL handlers can coexist in one setup.

### Does MSW work with both fetch and axios?

Yes. Because MSW intercepts at the network boundary rather than patching a specific client, it transparently handles \`fetch\`, \`axios\`, \`ky\`, \`XMLHttpRequest\`, and any other HTTP client. You can switch clients in your application without changing a single mock handler, which is a key advantage over stubbing the client directly.

### How does MSW compare to Playwright network mocking?

MSW is ideal for unit and component tests in Node or jsdom, where it reuses handlers across tools. Playwright's \`page.route\` intercepts at the browser level for full end-to-end tests driving real UI. Many teams use MSW for the component layer and Playwright routing for E2E. See the Playwright network mocking guide for browser-level interception details.

### Should I commit the mockServiceWorker.js file?

Yes. The \`mockServiceWorker.js\` script generated by \`npx msw init\` is required for browser usage and should be committed to your repository so teammates and CI have it without re-running init. Re-run \`msw init\` only when upgrading MSW to keep the worker script in sync with the installed version.

## Conclusion

MSW mock service worker testing gives you one set of API mocks that work everywhere — Vitest, Jest, the browser, Storybook, and local development — because it intercepts at the network level instead of patching your HTTP client. With \`http.get\` and \`http.post\` handlers returning \`HttpResponse.json\`, \`setupServer\` for Node tests and \`setupWorker\` for the browser, per-test overrides via \`server.use()\`, and first-class GraphQL support, MSW lets you test loading, success, empty, and error states deterministically without ever touching a real backend. Start by defining a shared \`handlers.ts\`, wire \`setupServer\` into your test setup with \`onUnhandledRequest: 'error'\`, and grow from there.

Want more testing recipes? Explore the [QA skills directory](/skills), compare runners in [Vitest vs Jest in 2026](/blog/vitest-vs-jest-2026-comparison), and pair MSW with browser-level interception via [Playwright network mocking](/blog/playwright-network-mocking-route-guide-2026).
`,
};
