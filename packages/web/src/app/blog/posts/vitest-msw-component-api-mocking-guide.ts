import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest MSW API Mocking for Component Tests',
  description:
    'Use Vitest MSW API mocking for deterministic component tests that exercise loading, error, and mutation flows without brittle fetch stubs in CI.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# Vitest MSW API Mocking for Component Tests

A component test that replaces \`fetch\` with a hand-written spy can pass while the component is calling the wrong URL, sending the wrong method, or forgetting a required header. MSW changes the testing conversation. Instead of intercepting the function your code happens to call, it intercepts the request boundary. Vitest supplies the fast runner and assertion layer. Together they let a React, Vue, Svelte, or plain DOM component talk to a realistic API surface without leaving the test process.

This guide focuses on component tests, not browser end-to-end tests and not backend contract suites. The sweet spot is a UI unit that has real asynchronous behavior: loading spinners, empty states, retry buttons, optimistic updates, authorization headers, validation messages, and cache invalidation. You want the component to believe it is using HTTP, but you want the test to stay deterministic.

For lower-level module mocking, keep the distinctions from [Vitest vi.mock patterns](/blog/vitest-mocking-vi-mock-complete-guide) in mind. For broader service validation beyond component scope, connect this practice to [API testing best practices](/blog/api-testing-best-practices-guide).

## Why Request-Level Mocking Fits Component Tests

MSW stands for Mock Service Worker, but in Vitest you usually use the Node server from \`msw/node\`. The mental model is the same: define request handlers that match HTTP method and URL, return structured responses, and let application code use the same fetch or client path it uses in production.

That difference matters. A spy on \`getUser()\` proves the component called a JavaScript function. An MSW handler proves the component made a \`GET /api/users/:id\` request and rendered the result. The second signal is closer to the integration point that breaks in real product work.

| Mocking choice | Boundary exercised | Best use | Common blind spot |
| --- | --- | --- | --- |
| \`vi.mock()\` for a data module | Import boundary | Pure component behavior when transport is irrelevant | URL, method, headers, and serialization are not checked |
| \`vi.spyOn(global, 'fetch')\` | Fetch function | Tiny tests with one known request | Easy to accept wrong request shape or call order |
| MSW Node server | HTTP request boundary | Components using fetch, Axios, TanStack Query, SWR, or generated clients | Requires handler discipline and lifecycle setup |
| Full browser with network routing | Browser network layer | End-to-end flows, cookies, service workers, navigation | Slower and more expensive for small UI states |

Use MSW when the request contract is part of what you care about. Use \`vi.mock()\` when the API call is incidental and you want to isolate rendering logic. The mistake is treating them as interchangeable.

## Installing Vitest and MSW Without a Mystery Test Harness

The minimal setup for a React component suite uses Vitest, Testing Library, jsdom, and MSW. The same MSW lifecycle works for other component libraries, but the render helper changes.

\`\`\`bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom msw
\`\`\`

The Vitest config should make the browser-like environment explicit and load a setup file once per test process.

\`\`\`ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    restoreMocks: true,
  },
});
\`\`\`

There is no need to start a real API server for these tests. The component can call relative URLs, and MSW can handle them. That keeps the suite fast enough to run on every pull request while still exercising serialization and response handling.

## A Handler File That Reads Like Product Behavior

MSW handlers are easier to maintain when they are named around product resources instead of test titles. Put common successful paths in one file, then override specific handlers inside individual tests when you need error or edge behavior.

\`\`\`ts
// test/msw/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/projects/:projectId/quality-gate', ({ params }) => {
    return HttpResponse.json({
      projectId: params.projectId,
      status: 'blocked',
      checks: [
        { id: 'unit', label: 'Unit tests', result: 'passed' },
        { id: 'e2e', label: 'Checkout smoke', result: 'failed' },
      ],
    });
  }),

  http.post('/api/projects/:projectId/quality-gate/rerun', async ({ request }) => {
    const body = (await request.json()) as { checkId: string };

    if (body.checkId !== 'e2e') {
      return HttpResponse.json({ message: 'Unknown check' }, { status: 400 });
    }

    return HttpResponse.json({ queued: true, checkId: body.checkId }, { status: 202 });
  }),
];
\`\`\`

This example uses MSW v2 style imports: \`http\` and \`HttpResponse\`. The handler names and paths are deliberately concrete. A QA dashboard component that shows quality gates can now be tested against successful retrieval and a rerun mutation without a fake function that hides transport details.

## Test Lifecycle: Listen, Reset, Close

MSW server setup has to be boring and consistent. Start before tests, reset handlers after each test, and close at the end. Treat unhandled requests as failures unless the suite has a specific reason to allow them.

\`\`\`ts
// test/setup.ts
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './msw/handlers';

export const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
\`\`\`

The \`onUnhandledRequest: 'error'\` setting is one of the most valuable parts of this setup. It catches accidental calls to production paths, typoed routes, and newly added component requests that the test author forgot to model.

## Testing Loading, Data, and Mutations in One Component

Consider a component that loads a project quality gate and allows the user to rerun a failed check. The test should verify what the user sees, while MSW verifies the HTTP shape behind the scenes.

\`\`\`tsx
// src/components/QualityGatePanel.tsx
import { useEffect, useState } from 'react';

type Check = {
  id: string;
  label: string;
  result: 'passed' | 'failed';
};

type Gate = {
  projectId: string;
  status: 'passed' | 'blocked';
  checks: Check[];
};

export function QualityGatePanel({ projectId }: { projectId: string }) {
  const [gate, setGate] = useState<Gate | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(\`/api/projects/\${projectId}/quality-gate\`)
      .then((response) => response.json())
      .then(setGate);
  }, [projectId]);

  async function rerun(checkId: string) {
    const response = await fetch(\`/api/projects/\${projectId}/quality-gate/rerun\`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ checkId }),
    });

    if (response.status === 202) {
      setMessage('Rerun queued');
    }
  }

  if (!gate) return <p>Loading quality gate</p>;

  return (
    <section aria-label="Quality gate">
      <h2>{gate.status === 'blocked' ? 'Release blocked' : 'Release clear'}</h2>
      <ul>
        {gate.checks.map((check) => (
          <li key={check.id}>
            {check.label}: {check.result}
            {check.result === 'failed' ? (
              <button onClick={() => rerun(check.id)}>Rerun {check.label}</button>
            ) : null}
          </li>
        ))}
      </ul>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
\`\`\`

The component is small, but it covers real UI risk: initial async state, rendering API data, sending a JSON mutation, and showing mutation feedback.

\`\`\`tsx
// src/components/QualityGatePanel.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { QualityGatePanel } from './QualityGatePanel';

describe('QualityGatePanel', () => {
  it('shows blocked checks and queues a rerun for the failed check', async () => {
    render(<QualityGatePanel projectId="checkout" />);

    expect(screen.getByText('Loading quality gate')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Release blocked' })).toBeVisible();
    expect(screen.getByText('Unit tests: passed')).toBeVisible();
    expect(screen.getByText('Checkout smoke: failed')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Rerun Checkout smoke' }));

    expect(await screen.findByText('Rerun queued')).toBeVisible();
  });
});
\`\`\`

Notice what the test does not do. It does not assert that \`fetch\` was called once. It does not inspect implementation state. It asserts visible behavior, while the MSW handler guarantees that only the modeled requests can succeed.

## Overriding Handlers for Unhappy Paths

The default handler file should represent normal product behavior. Individual tests can override one route to force a server error, slow response, or validation result. That keeps edge cases local.

\`\`\`tsx
// src/components/QualityGatePanel.error.test.tsx
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/setup';
import { QualityGatePanel } from './QualityGatePanel';

describe('QualityGatePanel failure states', () => {
  it('surfaces an unavailable quality gate response', async () => {
    server.use(
      http.get('/api/projects/:projectId/quality-gate', () => {
        return HttpResponse.json({ message: 'Quality service unavailable' }, { status: 503 });
      }),
    );

    render(<QualityGatePanel projectId="checkout" />);

    expect(await screen.findByText('Quality service unavailable')).toBeVisible();
  });
});
\`\`\`

The component above would need error handling for this test to pass. That is the point. MSW lets the test drive a user-visible failure state without altering the production client.

## Matching Real API Details Without Rebuilding the Backend

Handlers should be strict where product risk is real. If a mutation requires \`content-type: application/json\`, check it. If the component must send an authorization header, check it. If an endpoint is path-sensitive, model the path parameter instead of matching a broad wildcard.

| API detail | Why it matters in a component test | How to model it with MSW |
| --- | --- | --- |
| Path parameter | Wrong project, tenant, or account id can show another user's data | Use \`/api/projects/:projectId/...\` and assert \`params.projectId\` when needed |
| Request body | Optimistic UI often depends on the submitted payload | Await \`request.json()\` and return different responses by field |
| Status code | Components must distinguish 202, 400, 401, 409, and 500 paths | Return \`HttpResponse.json(body, { status })\` |
| Headers | Auth, idempotency, and content negotiation bugs often hide in helpers | Inspect \`request.headers.get('header-name')\` |
| Empty response | DELETE or 204 behavior can break JSON parsing | Return \`new HttpResponse(null, { status: 204 })\` |

Do not model every backend rule in every component test. That belongs in API and contract testing. Model the rule when the component has a distinct behavior for it.

## Working With Data-Fetching Libraries

MSW works well with TanStack Query, SWR, Apollo clients that use HTTP, and generated REST clients because those libraries still make requests. The main testing concern is cache isolation. Create a fresh query client or cache provider per test. Otherwise, the first test may populate a cache that makes the second test pass without touching MSW.

When a component uses retries, disable or reduce retries in the test client. A three-attempt retry policy can turn a clear error-state test into a slow test. Keep production retry behavior covered in a smaller number of focused tests.

Also watch stale data. A component that renders cached content immediately and refreshes in the background may need assertions for both states. MSW can return different responses over time, but do that deliberately. If a test has to track the third response from the same route, it may be better as an integration test.

## Keeping Handlers Maintainable

Handler sprawl is the main long-term risk. A suite with hundreds of copy-pasted handlers becomes another fake backend. Keep it small with a few rules:

- Share happy-path resource handlers.
- Override only the route a test is trying to bend.
- Build factory functions for response objects, not for every handler.
- Delete handlers when component behavior moves to a different layer.
- Fail on unhandled requests.
- Review handler changes when API contracts change.

Use the same naming language as product APIs. If the backend calls it a \`quality-gate\`, do not call it \`statusWidgetData\` in tests. Vocabulary drift makes test failures slower to understand.

## What Vitest Adds Beyond Speed

Vitest is attractive because it is fast, but for MSW component tests the ergonomics matter more. The setup file lifecycle is straightforward, \`vi\` utilities remain available for time and module boundaries, and watch mode is responsive enough for UI work. Vitest also runs TypeScript-heavy frontend projects comfortably when configured with Vite.

Do not convert every Jest test just to chase speed. Convert the tests that benefit from Vite-native transforms, modern ESM behavior, and a cleaner component test loop. The value of Vitest plus MSW is not that it makes mocks more clever. It makes the network boundary explicit while keeping feedback local.

## CI Rules for Mocked Component Tests

Mocked component tests are still production guards. Treat them like a real suite:

- Run them on every pull request.
- Capture test output in CI annotations.
- Keep unhandled requests as failures.
- Do not allow tests to call public APIs.
- Track slow tests and investigate repeated timeouts.
- Review handler changes with the same seriousness as fixture changes.

The fastest way to lose trust is to let handlers drift away from the backend. Pair MSW tests with API contract tests, generated types, or schema checks where possible. Component tests should not be the only source of truth for an endpoint.

## Keeping MSW Aligned With Client Types

The most reliable MSW suites share vocabulary with the API client. If the frontend uses generated TypeScript types from OpenAPI, GraphQL, or an internal schema package, handlers should return objects that satisfy those types. That does not make the handler a contract test, but it catches stale fixtures when a field is renamed or a response shape changes.

For REST clients, a useful pattern is to keep response builders beside handlers. The builder returns a valid response object with safe defaults, and each test overrides only the field relevant to that scenario. This prevents every test from copying a large JSON body and forgetting which fields are mandatory.

Use builders for response bodies, not for hiding behavior. A builder named \`qualityGateResponse({ status: 'blocked' })\` is helpful. A builder named \`mockEverythingForDashboard()\` is a maintenance trap because it hides which endpoints are involved.

When a generated client changes, review three places together:

- The API client type or schema.
- The MSW handler response.
- The component assertion that renders the changed field.

That review prevents a common failure mode: the component is updated for the new API, but the test still passes because an old handler returns the old field and the component never exercises the real shape.

## Testing Race Conditions and Slow Responses

Component tests should include a few timing cases when the UI has visible async behavior. MSW can delay a response, which lets you assert that the loading state appears and disappears correctly. Use this sparingly. A suite full of artificial delays becomes slow and brittle.

Timing cases worth keeping:

- The loading skeleton appears before data arrives.
- A submit button is disabled while a mutation is in flight.
- A stale response does not overwrite newer data after a prop changes.
- A retry button is shown after a server failure.
- An optimistic update rolls back after a rejected mutation.

These are component responsibilities. They are different from backend reliability tests. The handler only creates the condition so the component can prove it behaves well.

## What Not to Mock With MSW

MSW is a poor fit for behavior that does not cross the HTTP boundary. Do not use it to fake local storage, feature flag hooks, date functions, browser permissions, or layout measurements. Vitest has better tools for those seams. Mixing every fake into MSW makes failures harder to interpret because a network handler appears responsible for state it never owns.

Also avoid using MSW as a complete backend simulator. If a checkout component needs twelve endpoints, inventory rules, tax rules, payment outcomes, and fraud review in one component test, the test is probably too high in the pyramid. Move the money rules to API and service tests, then keep the component case focused on the UI state it owns.

## Component Boundaries That Deserve Their Own Server

Some frontend areas deserve a dedicated MSW handler set because the API behavior is central to the component. Search pages need empty results, partial results, and slow responses. Notification centers need unread counts, pagination, and mark-read mutations. Billing settings need authorization errors, payment method states, and server-side validation. Do not bury those cases inside one shared handler file that every test imports by accident.

Use handler modules by product area:

- \`qualityGateHandlers\` for release dashboards.
- \`billingHandlers\` for subscription and invoice screens.
- \`searchHandlers\` for filters, empty states, and pagination.
- \`profileHandlers\` for account preferences and avatar uploads.

Then compose the default server from stable happy paths. Individual tests can import the product-specific overrides they need. This keeps handlers discoverable and prevents one feature team from changing a global handler in a way that silently alters another team's component tests.

## Debugging MSW Failures

When an MSW-backed test fails, debug in this order. First, check whether the request matched a handler. An unhandled request usually means a path, method, or base URL changed. Second, inspect the response body returned by the handler. A stale fixture can be just as wrong as a stale mock function. Third, verify the component's async state. Many failures come from asserting before the request has resolved or after cache state from another test leaked in.

Avoid adding arbitrary waits. If the UI should show data, wait for the user-visible element. If the UI should send a mutation, assert the resulting state. A timeout with no visible anchor is a symptom, not a fix.

## Versioning Handler Behavior During API Migration

During API migrations, keep old and new handlers visible instead of editing one fixture until nobody knows which contract is active. Name handlers around the versioned endpoint or feature flag. A component that supports both response shapes should have separate tests for both shapes and one test for the cutover behavior. Once the old API is removed, delete its handler in the same cleanup. Handler archaeology is a real maintenance cost in long-lived frontend suites.

## Frequently Asked Questions

### Should I use MSW or vi.mock for a component that calls a data hook?

Use MSW when you care about the HTTP request and response behavior. Use \`vi.mock\` when you want to isolate the component from the hook entirely and the transport details are irrelevant to the assertion.

### How do I make Vitest fail when a component calls an unmocked API?

Call \`server.listen({ onUnhandledRequest: 'error' })\` in the setup file. That turns unexpected requests into test failures, which is usually the right default for component suites.

### Can MSW test request headers and POST bodies?

Yes. Handler callbacks receive a \`request\` object. Read headers with \`request.headers.get()\` and parse JSON with \`await request.json()\`, then return the response that matches the scenario.

### Why does my second test pass without hitting the MSW handler?

You probably have cache leakage from a data-fetching library. Create a fresh query client, SWR provider, or equivalent cache per test, and reset MSW handlers after each test.

### Should MSW handlers duplicate backend validation rules?

Only duplicate rules that drive component behavior. Full validation belongs in API, contract, and integration tests. Component handlers should be realistic enough to catch UI mistakes without becoming a second backend.
`,
};
