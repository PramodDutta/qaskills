---
name: MSW API Mocking
description: Mock Service Worker v2 patterns - http and graphql request handlers, setupServer for Node test runs, setupWorker for the browser, per-test handler overrides, and strict unhandled-request policies.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [msw, mocking, api-mocking, service-worker, jest, vitest, react, graphql, network]
testingTypes: [unit, integration, api]
frameworks: [jest, vitest]
languages: [typescript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# MSW API Mocking

This skill makes an AI agent mock HTTP and GraphQL APIs at the network level with Mock Service Worker v2: one set of request handlers shared between Vitest/Jest (via `setupServer`) and the browser (via `setupWorker`), per-test overrides with `server.use`, and an `onUnhandledRequest: 'error'` policy that catches drift. Trigger it when components or services call `fetch`/axios in tests, when `msw` appears in package.json, or when the user is stubbing `global.fetch` by hand and suffering for it.

## Core Principles

1. **Mock the network, not the module.** `vi.mock('./api-client')` couples tests to an import path and skips serialization, query strings, and status handling. MSW intercepts actual requests, so the entire client stack (interceptors, retries, parsing) stays under test.
2. **One `handlers.ts` is the contract.** Define happy-path handlers once; tests, Storybook, and local dev all consume the same array. When the real API changes, you update one file and every consumer notices.
3. **Happy path in global handlers, failures per test.** The default handlers return realistic success responses. Error cases (`500`, `422`, timeouts) are declared inside the test that needs them via `server.use(...)`, which prepends a one-off override.
4. **`onUnhandledRequest: 'error'` always.** Any request without a handler should fail the test loudly. Silent passthrough is how a "unit" test ends up hitting production from CI.
5. **Reset handlers after every test.** `server.resetHandlers()` in `afterEach` removes per-test overrides; without it, test order starts to matter and the suite rots.
6. **Respond with realistic shapes and status codes.** Use the same field names, casing, pagination envelopes, and error bodies the real API returns; mocks that drift teach your code to handle an API that does not exist.

## Setup

```bash
npm install --save-dev msw
# Browser usage only: place the worker script in your static dir
npx msw init public/ --save
```

### Shared handlers

```ts
// src/mocks/handlers.ts
import { http, HttpResponse, delay } from 'msw';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

export const handlers = [
  http.get('https://api.example.com/users/:id', ({ params }) => {
    return HttpResponse.json<User>({
      id: String(params.id),
      name: 'Ada Lovelace',
      role: 'admin',
    });
  }),

  http.get('https://api.example.com/orders', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    return HttpResponse.json({
      items: [{ id: 'ord_1', total: 4999 }],
      page,
      totalPages: 3,
    });
  }),

  http.post('https://api.example.com/orders', async ({ request }) => {
    const body = (await request.json()) as { sku?: string; qty?: number };
    if (!body.sku) {
      return HttpResponse.json({ error: 'sku is required' }, { status: 422 });
    }
    await delay(50); // simulate realistic latency
    return HttpResponse.json({ orderId: 'ord_2', ...body }, { status: 201 });
  }),
];
```

## Patterns

### 1. Node test setup (Vitest or Jest)

```ts
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```ts
// vitest.setup.ts (register via test.setupFiles in vitest.config.ts)
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './src/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 2. Testing a component, then overriding for the failure case

```tsx
// src/components/UserProfile.test.tsx
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { UserProfile } from './UserProfile';

it('renders the user fetched from the API', async () => {
  render(<UserProfile id="42" />);
  expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
});

it('shows an error banner when the API is down', async () => {
  // One-off override; resetHandlers() in afterEach removes it
  server.use(
    http.get('https://api.example.com/users/:id', () =>
      HttpResponse.json({ message: 'internal error' }, { status: 500 }),
    ),
  );

  render(<UserProfile id="42" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load profile');
});

it('handles a network-level failure distinctly from a 500', async () => {
  server.use(
    http.get('https://api.example.com/users/:id', () => HttpResponse.error()),
  );

  render(<UserProfile id="42" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection');
});
```

### 3. Asserting on the request your code sent

```ts
// src/api/orders.test.ts
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { createOrder } from './orders';

it('sends the auth header and JSON body the API expects', async () => {
  let captured: { auth: string | null; body: unknown } | undefined;

  server.use(
    http.post('https://api.example.com/orders', async ({ request }) => {
      captured = {
        auth: request.headers.get('authorization'),
        body: await request.json(),
      };
      return HttpResponse.json({ orderId: 'ord_9' }, { status: 201 });
    }),
  );

  await createOrder({ sku: 'SKU-1', qty: 2 }, { token: 'jwt-abc' });

  expect(captured?.auth).toBe('Bearer jwt-abc');
  expect(captured?.body).toEqual({ sku: 'SKU-1', qty: 2 });
});
```

### 4. GraphQL operations

```ts
// src/mocks/graphql-handlers.ts
import { graphql, HttpResponse } from 'msw';

export const gqlHandlers = [
  graphql.query('GetCart', ({ variables }) => {
    return HttpResponse.json({
      data: {
        cart: { id: variables.cartId, items: [{ sku: 'SKU-1', qty: 1 }] },
      },
    });
  }),

  graphql.mutation('AddToCart', () => {
    return HttpResponse.json({
      errors: [{ message: 'Out of stock', extensions: { code: 'OUT_OF_STOCK' } }],
    });
  }),
];
```

### 5. Browser worker for dev and Storybook

```ts
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

```ts
// src/main.tsx -- enable mocking only in development
async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV) return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(<App />);
});
```

## Best Practices

- Type your response bodies (`HttpResponse.json<User>(...)`) so mock drift becomes a compile error when the app's types change.
- Use `delay()` in handlers that back loading-state tests; a 0ms response can resolve before React renders the spinner you are asserting on.
- Keep path params (`:id`) and `URL` query parsing in handlers instead of one handler per exact URL; fewer handlers, broader coverage.
- For paginated endpoints, drive the response from `searchParams` so the same handler serves page 1 and page 7 tests.
- In Jest (not Vitest), polyfill as needed per MSW docs and register the setup file via `setupFilesAfterEach`/`setupFilesAfterEach`-equivalent (`setupFilesAfterEach` is Vitest; Jest uses `setupFilesAfterEach`? use `setupFilesAfterEach` carefully) - concretely: `setupFiles: ['<rootDir>/jest.setup.ts']` with the same listen/reset/close trio.
- Co-locate one-off overrides with the test that needs them; if three tests need the same failure handler, promote it to a named export in `handlers.ts`.

## Anti-Patterns

- Stubbing `global.fetch = vi.fn()` and hand-crafting `Response` objects: brittle, skips URL matching, and dies the day you switch to axios.
- `onUnhandledRequest: 'bypass'` in tests: unmocked calls silently reach real services, making tests slow, flaky, and occasionally destructive.
- Defining error-case handlers globally so every test starts from a broken API and "fixes" it with overrides - invert it.
- Forgetting `server.resetHandlers()` in `afterEach`, then debugging why a 500 override leaks into the next twelve tests.
- Mocking your own server's routes in end-to-end tests; MSW is for unit/integration layers, E2E should hit a real (containerized) backend.
- Duplicate handler arrays per test file drifting apart; share `handlers.ts` and override locally.

## When to Trigger This Skill

- Tests stub `fetch`, `axios`, or API client modules by hand, or a component test suite needs network responses.
- `msw` is in package.json, `mockServiceWorker.js` is in `public/`, or `setupServer`/`setupWorker` appears in the codebase.
- The user asks to "mock an API", "test loading and error states", "share mocks between tests and Storybook", or "stop tests from hitting the real API".
- A GraphQL client (Apollo, urql, graphql-request) needs operation-level mocks by query name.
- Frontend development is blocked on an unfinished backend and needs a realistic mock layer that later doubles as test fixtures.
