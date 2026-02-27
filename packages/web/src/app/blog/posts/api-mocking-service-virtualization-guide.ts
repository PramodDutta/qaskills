import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'API Mocking -- MSW, WireMock, and Service Virtualization',
  description:
    'Complete guide to API mocking and service virtualization. Covers MSW for frontend testing, WireMock for backend, mock server strategies, and test isolation patterns.',
  date: '2026-02-23',
  category: 'Tutorial',
  content: `
API mocking is the practice of replacing real API dependencies with controlled substitutes during testing. Whether you are building a frontend application that depends on a backend not yet deployed, running integration tests in CI without spinning up a dozen microservices, or simulating error conditions that are difficult to reproduce against real systems, api mocking gives you fast, reliable, and deterministic tests. This guide covers every major tool and strategy for mock server testing -- from MSW (Mock Service Worker) for browser and Node.js interception, to WireMock for Java and Docker-based service virtualization, to Nock for lightweight Node.js HTTP mocking. You will learn when to use each approach, how to handle stateful and dynamic mocks, and how to prevent mock drift from silently breaking your test suite.

## Key Takeaways

- **API mocking** replaces real HTTP dependencies with controlled test doubles, giving you fast, isolated, and deterministic tests that do not depend on external services
- **MSW (Mock Service Worker)** intercepts requests at the network level in both browser and Node.js environments, making it the preferred choice for frontend and full-stack JavaScript testing
- **WireMock** provides a standalone mock server (Java or Docker) ideal for backend service virtualization, with powerful request matching, response templating, and record-and-playback capabilities
- **Test doubles** come in five types -- stubs, mocks, fakes, spies, and dummies -- and choosing the right one for each scenario prevents over-mocking and brittle tests
- **Mock drift** -- where your mocks diverge from real API behavior -- is the biggest risk of any mocking strategy; contract verification and periodic recording help prevent it
- **Dynamic and stateful mocks** let you simulate realistic multi-step workflows like "create then retrieve," error injection, and latency simulation without needing a real backend

---

## Why Mock APIs?

The simplest reason to mock APIs is **test isolation**. When your test depends on a real API, any failure in that API -- network issues, rate limits, data changes, downtime -- becomes a failure in your test. Mocking eliminates that coupling entirely. Your tests run against a controlled substitute that always behaves exactly as defined.

**Speed** is the second major benefit. A real HTTP call to an external service might take 200-500ms. A mocked response returns in under 1ms. Multiply that by hundreds of API calls across your test suite, and the difference between a 2-minute and a 20-minute CI pipeline becomes clear.

**Reliability** follows directly from isolation. Flaky tests are overwhelmingly caused by external dependencies -- network timeouts, eventual consistency, rate limiting, or test data pollution. Mocked APIs eliminate all of these failure modes. Your tests become deterministic: same input, same output, every time.

**Error scenario testing** is where mocking truly shines. How do you test that your application handles a 503 Service Unavailable response gracefully? Or a malformed JSON body? Or a 30-second timeout? With a real API, reproducing these conditions is difficult or impossible. With a mock, it is a one-line configuration change.

**Parallel development** is a practical benefit that teams often underestimate. When the frontend and backend teams agree on an API contract, the frontend team can build and test against mocks immediately -- without waiting for the backend to be implemented. This decouples team velocity and eliminates blocking dependencies.

That said, **mocking is not a replacement for testing against real APIs**. You should still run integration tests and end-to-end tests against real services in staging environments. The goal is to push as much validation as possible into fast, mocked unit and integration tests, and reserve real-API testing for final verification. A good rule of thumb: mock in unit and component tests, use real APIs in E2E and smoke tests.

---

## Types of Test Doubles

Before diving into specific tools, it is important to understand the five types of **api test doubles** and when to use each one. These terms are often used interchangeably, but they have distinct meanings that affect how you design your tests.

| Type | Definition | When to Use | Example |
|------|-----------|-------------|---------|
| **Stub** | Returns pre-configured responses to specific calls. Does not verify how it was called. | When you need a dependency to return specific data so your code under test can proceed. | A mock server that always returns \`{ "status": "active" }\` for \`GET /api/user/1\` |
| **Mock** | Pre-programmed with expectations about which calls will be made. Verifies interactions. | When you need to verify your code called a dependency with specific parameters. | Asserting that your service called \`POST /api/orders\` exactly once with the correct payload |
| **Fake** | A working implementation with shortcuts (e.g., in-memory database instead of real DB). | When you need realistic behavior across multiple operations but without external infrastructure. | An in-memory REST API that stores and retrieves data but uses a simple array instead of a database |
| **Spy** | Wraps a real implementation and records calls made to it. | When you want real behavior but also need to verify interactions after the fact. | A proxy that forwards requests to the real API but records request/response pairs for later assertion |
| **Dummy** | Passed around but never actually used. Satisfies parameter requirements. | When a function signature requires a parameter but the test does not exercise that code path. | An empty API client passed to a constructor that is never called in the test |

The most common mistake teams make is **over-mocking** -- using mocks (with verification) when stubs would suffice. If your test only needs the API to return data so the code under test can continue, use a stub. Reserve mocks with interaction verification for cases where the call itself is the behavior you are testing (e.g., verifying that an analytics event was sent).

---

## MSW (Mock Service Worker)

**MSW (Mock Service Worker)** has become the de facto standard for api mocking in JavaScript and TypeScript applications. Unlike traditional mocking libraries that patch \`fetch\` or \`XMLHttpRequest\` at the module level, MSW intercepts requests at the **network level**. This means your application code, HTTP clients, and middleware all execute exactly as they would in production -- only the network response is replaced.

MSW works in two modes:

- **Browser**: Uses a Service Worker to intercept requests from the browser
- **Node.js**: Uses request interception to capture outgoing HTTP calls in test environments

### Setting Up Handlers

The foundation of MSW is the **request handler**. Handlers define which requests to intercept and what responses to return:

\`\`\`typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // GET request stub
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
    ]);
  }),

  // GET with path parameters
  http.get('/api/users/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id: Number(id),
      name: 'Alice',
      email: 'alice@example.com',
    });
  }),

  // POST with request body validation
  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { id: 3, ...body },
      { status: 201 }
    );
  }),

  // Error scenario
  http.get('/api/users/999', () => {
    return HttpResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }),
];
\`\`\`

### Node.js Server Setup for Tests

For test environments (Jest, Vitest, Playwright), you set up the MSW server in Node.js mode:

\`\`\`typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
\`\`\`

\`\`\`typescript
// test/setup.ts (Jest or Vitest global setup)
import { server } from '../src/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
\`\`\`

The \`onUnhandledRequest: 'error'\` option is critical -- it ensures that any API call your code makes that is not handled by a mock will throw an error immediately, preventing silent failures where tests pass because an unmocked call happened to succeed.

### Jest + MSW Example

Here is a complete test using Jest with MSW to test a user service:

\`\`\`typescript
// src/services/user-service.test.ts
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { fetchUsers, createUser } from './user-service';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UserService', () => {
  test('fetches all users', async () => {
    const users = await fetchUsers();
    expect(users).toHaveLength(2);
    expect(users[0].name).toBe('Alice');
  });

  test('handles server error gracefully', async () => {
    // Override default handler for this test
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        );
      })
    );

    await expect(fetchUsers()).rejects.toThrow('Failed to fetch users');
  });

  test('creates a new user', async () => {
    const newUser = await createUser({
      name: 'Charlie',
      email: 'charlie@example.com',
    });

    expect(newUser.id).toBe(3);
    expect(newUser.name).toBe('Charlie');
  });
});
\`\`\`

### Playwright + MSW Example

For end-to-end tests with Playwright, you can use MSW to mock API responses at the network level. Playwright also has its own route-based mocking, but MSW handlers can be shared between unit and E2E tests for consistency:

\`\`\`typescript
// e2e/users.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Users page', () => {
  test('displays user list from API', async ({ page }) => {
    // Playwright's built-in route mocking
    await page.route('**/api/users', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Alice', email: 'alice@example.com' },
          { id: 2, name: 'Bob', email: 'bob@example.com' },
        ]),
      });
    });

    await page.goto('/users');
    await expect(page.getByRole('listitem')).toHaveCount(2);
    await expect(page.getByText('Alice')).toBeVisible();
  });

  test('shows error message on API failure', async ({ page }) => {
    await page.route('**/api/users', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    await page.goto('/users');
    await expect(page.getByText('Failed to load users')).toBeVisible();
  });

  test('handles slow API responses', async ({ page }) => {
    await page.route('**/api/users', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/users');
    await expect(page.getByText('Loading...')).toBeVisible();
  });
});
\`\`\`

---

## WireMock for Backend Testing

**WireMock** is a powerful service virtualization tool built in Java that runs as a standalone HTTP server. It is the go-to choice for backend teams working in Java, Kotlin, or any language that needs a dedicated mock server running in Docker. WireMock provides features that go far beyond simple stubbing -- including request matching with wildcards and regex, response templating, stateful behavior, record and playback, and fault injection.

### Docker Setup

The easiest way to run WireMock is with Docker:

\`\`\`bash
# Start WireMock with mounted stub mappings
docker run -d --name wiremock \\
  -p 8080:8080 \\
  -v \$(pwd)/wiremock/mappings:/home/wiremock/mappings \\
  -v \$(pwd)/wiremock/__files:/home/wiremock/__files \\
  wiremock/wiremock:latest
\`\`\`

### Stub Configuration (JSON)

WireMock stubs are defined as JSON files in the \`mappings\` directory:

\`\`\`json
{
  "request": {
    "method": "GET",
    "urlPathPattern": "/api/users/[0-9]+",
    "headers": {
      "Accept": {
        "contains": "application/json"
      }
    }
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "jsonBody": {
      "id": 1,
      "name": "Alice",
      "email": "alice@example.com",
      "createdAt": "{{now format='yyyy-MM-dd'}}"
    },
    "transformers": ["response-template"]
  }
}
\`\`\`

### Request Matching

WireMock supports sophisticated request matching, far beyond simple URL matching:

\`\`\`json
{
  "request": {
    "method": "POST",
    "urlPath": "/api/orders",
    "bodyPatterns": [
      {
        "matchesJsonPath": "\$.items[?(@.quantity > 0)]"
      },
      {
        "matchesJsonPath": "\$.customerId"
      }
    ],
    "queryParameters": {
      "priority": {
        "equalTo": "high"
      }
    }
  },
  "response": {
    "status": 201,
    "jsonBody": {
      "orderId": "ORD-{{randomValue type='UUID'}}",
      "status": "confirmed"
    },
    "transformers": ["response-template"]
  }
}
\`\`\`

### Record and Playback

One of WireMock's most powerful features is **recording real API traffic** and replaying it as stubs. This is invaluable for creating realistic mocks from production-like environments:

\`\`\`bash
# Start recording (proxy all requests to the real API)
curl -X POST http://localhost:8080/__admin/recordings/start \\
  -H "Content-Type: application/json" \\
  -d '{"targetBaseUrl": "https://api.production.com"}'

# Run your tests or manual exploration against WireMock
# All requests are proxied and recorded

# Stop recording -- stubs are saved to mappings directory
curl -X POST http://localhost:8080/__admin/recordings/stop
\`\`\`

After recording, you have a complete set of stub mappings that replicate the real API's behavior. You can then edit these stubs to add error scenarios, adjust response times, or modify data for specific test cases.

### Fault Injection

WireMock can simulate network-level failures that are impossible to reproduce with application-level mocking:

\`\`\`json
{
  "request": {
    "method": "GET",
    "url": "/api/flaky-endpoint"
  },
  "response": {
    "fault": "CONNECTION_RESET_BY_PEER"
  }
}
\`\`\`

Available fault types include \`EMPTY_RESPONSE\`, \`MALFORMED_RESPONSE_CHUNK\`, \`RANDOM_DATA_THEN_CLOSE\`, and \`CONNECTION_RESET_BY_PEER\`. Combined with fixed or random delays, these let you thoroughly test your application's resilience and retry logic.

---

## Nock for Node.js

**Nock** is a lightweight HTTP mocking library specifically for Node.js. Unlike MSW, which intercepts at the network level, Nock patches Node's native \`http\` and \`https\` modules directly. This makes it simpler to set up for quick unit tests but less suitable for browser-based testing.

\`\`\`typescript
import nock from 'nock';
import { fetchUserProfile } from './user-client';

describe('User Client', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  test('fetches user profile', async () => {
    const scope = nock('https://api.example.com')
      .get('/users/42')
      .reply(200, {
        id: 42,
        name: 'Alice',
        email: 'alice@example.com',
      });

    const user = await fetchUserProfile(42);

    expect(user.name).toBe('Alice');
    expect(scope.isDone()).toBe(true); // Verify the mock was called
  });

  test('retries on 503', async () => {
    nock('https://api.example.com')
      .get('/users/42')
      .reply(503)
      .get('/users/42')
      .reply(200, { id: 42, name: 'Alice' });

    const user = await fetchUserProfile(42);
    expect(user.name).toBe('Alice');
  });

  test('handles timeout', async () => {
    nock('https://api.example.com')
      .get('/users/42')
      .delayConnection(5000)
      .reply(200, { id: 42, name: 'Alice' });

    await expect(fetchUserProfile(42)).rejects.toThrow('timeout');
  });
});
\`\`\`

### Nock vs MSW

| Feature | Nock | MSW |
|---------|------|-----|
| **Environment** | Node.js only | Browser + Node.js |
| **Interception level** | Patches \`http\`/\`https\` modules | Network level (Service Worker / request interception) |
| **Setup complexity** | Minimal -- one import, inline mocking | Moderate -- requires handler files and server/worker setup |
| **Browser testing** | Not supported | Full support via Service Worker |
| **Request verification** | Built-in (\`scope.isDone()\`) | Requires additional assertion libraries |
| **Ecosystem** | Mature, stable, focused | Rapidly growing, broader scope |
| **Best for** | Quick Node.js unit tests | Full-stack applications, shared handlers across test types |

**When to choose Nock**: You are writing pure Node.js backend tests and want minimal setup with inline mocking. **When to choose MSW**: You need to share mock definitions between unit tests, integration tests, and browser-based E2E tests, or your application runs in the browser.

---

## Mock Server Strategies

Not all mocking strategies are created equal. The approach you choose affects test reliability, maintenance cost, and the risk of mock drift. Here are the four primary strategies and their trade-offs.

| Strategy | How It Works | Pros | Cons |
|----------|-------------|------|------|
| **Static mocks** | Fixed JSON responses for each endpoint | Simple, fast, easy to understand | Responses diverge from real API over time; no dynamic behavior |
| **Dynamic mocks** | Logic-based responses that compute output from request data | Realistic behavior; can simulate business logic | More complex to maintain; risk of reimplementing the real API |
| **Recorded mocks** | Proxy recording captures real API traffic as replayable stubs | Highly realistic; captures edge cases from real data | Stale over time; may contain sensitive data; large file sizes |
| **Contract-driven mocks** | Generated from OpenAPI specs or Pact contracts | Always in sync with the API contract; prevents drift by design | Requires maintaining up-to-date contracts; limited to structural correctness |

**Static mocks** are the default starting point. They are simple JSON files or inline handler definitions that return the same response every time. They work well for unit tests where you control the exact scenario. The risk is **mock drift** -- over time, the real API evolves and your static mocks no longer reflect reality.

**Dynamic mocks** add logic to your handlers. Instead of returning a fixed response, they compute the response based on request parameters, body content, or internal state. This is useful when testing pagination, sorting, filtering, or any behavior that depends on input. The risk is complexity -- if your mock server becomes as complex as the real API, you are no longer saving effort.

**Recorded mocks** use tools like WireMock's record-and-playback or Playwright's HAR recording to capture real API traffic and replay it in tests. This gives you the most realistic test data, but recorded responses go stale as the API evolves. A good practice is to **re-record periodically** (weekly or before each release) and store recordings in version control.

**Contract-driven mocks** are generated from OpenAPI specifications or Pact contract files. Tools like **Prism** (from Stoplight) can spin up a mock server directly from an OpenAPI spec, returning valid responses with example data. This guarantees your mocks match the API contract, but only at the structural level -- business logic and edge cases are not captured.

The best teams use a **layered approach**: contract-driven mocks for structural correctness, static mocks for specific test scenarios, and periodic recording to validate that mocks match real behavior.

---

## Handling Dynamic and Stateful Mocks

Real APIs are stateful. When you POST to create a resource and then GET that resource, you expect to receive what you just created. Most basic mocking setups return the same static response regardless of previous interactions. For realistic integration testing, you need **stateful mocks** that maintain state across requests.

### Stateful Mock with MSW

\`\`\`typescript
import { http, HttpResponse } from 'msw';

// In-memory state
let users: Array<{ id: number; name: string; email: string }> = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
];
let nextId = 2;

export const statefulHandlers = [
  // List users -- returns current state
  http.get('/api/users', () => {
    return HttpResponse.json(users);
  }),

  // Create user -- mutates state
  http.post('/api/users', async ({ request }) => {
    const body = await request.json() as { name: string; email: string };
    const newUser = { id: nextId++, ...body };
    users.push(newUser);
    return HttpResponse.json(newUser, { status: 201 });
  }),

  // Get single user -- reads from state
  http.get('/api/users/:id', ({ params }) => {
    const user = users.find((u) => u.id === Number(params.id));
    if (!user) {
      return HttpResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }
    return HttpResponse.json(user);
  }),

  // Delete user -- mutates state
  http.delete('/api/users/:id', ({ params }) => {
    const index = users.findIndex((u) => u.id === Number(params.id));
    if (index === -1) {
      return HttpResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }
    users.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];

// Reset function for test cleanup
export function resetUserState() {
  users = [{ id: 1, name: 'Alice', email: 'alice@example.com' }];
  nextId = 2;
}
\`\`\`

### Delay Simulation

Simulating realistic latency helps you test loading states, timeouts, and race conditions:

\`\`\`typescript
import { http, HttpResponse, delay } from 'msw';

export const delayHandlers = [
  // Simulate slow endpoint
  http.get('/api/reports/generate', async () => {
    await delay(3000); // 3 second delay
    return HttpResponse.json({ reportUrl: '/reports/123.pdf' });
  }),

  // Simulate intermittent slowness
  http.get('/api/search', async () => {
    await delay(); // Random realistic delay
    return HttpResponse.json({ results: [] });
  }),
];
\`\`\`

### Error Injection Patterns

Systematically testing error handling requires mocks that fail in specific, controlled ways:

\`\`\`typescript
import { http, HttpResponse } from 'msw';

// Counter-based error injection -- fail every Nth request
let requestCount = 0;

export const errorInjectionHandlers = [
  http.get('/api/data', () => {
    requestCount++;

    // Fail every 3rd request
    if (requestCount % 3 === 0) {
      return HttpResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    return HttpResponse.json({ data: 'success' });
  }),

  // Network error simulation
  http.get('/api/unreliable', () => {
    return HttpResponse.error();
  }),
];
\`\`\`

These patterns are essential for verifying that your application's retry logic, circuit breakers, and error boundaries work correctly under adverse conditions.

---

## CI/CD Integration

Running mock servers in CI/CD pipelines requires careful consideration of startup, teardown, and port management. The goal is to make mocked tests as reliable in CI as they are on your local machine.

### MSW in CI

MSW requires no separate server process -- it runs in-process with your tests. This makes CI integration straightforward:

\`\`\`yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
        # MSW runs in-process -- no additional setup needed
\`\`\`

### WireMock in CI (Docker)

For WireMock, use Docker Compose to run the mock server alongside your tests:

\`\`\`yaml
# docker-compose.test.yml
services:
  wiremock:
    image: wiremock/wiremock:latest
    ports:
      - "8080:8080"
    volumes:
      - ./wiremock/mappings:/home/wiremock/mappings
      - ./wiremock/__files:/home/wiremock/__files
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/__admin"]
      interval: 5s
      timeout: 3s
      retries: 5

  tests:
    build: .
    depends_on:
      wiremock:
        condition: service_healthy
    environment:
      API_BASE_URL: http://wiremock:8080
    command: npm test
\`\`\`

### Preventing Mock Drift

The biggest risk of any mocking strategy is **mock drift** -- where your mocks no longer reflect the real API's behavior. Here are proven strategies to prevent it:

1. **Contract verification**: Use Pact or OpenAPI validation to ensure your mocks conform to the API contract. See our [contract testing guide](/blog/api-contract-testing-microservices) for detailed setup instructions.

2. **Periodic re-recording**: Schedule monthly or pre-release recording sessions where you capture fresh responses from staging environments and update your mock fixtures.

3. **Shadow testing**: Run a subset of your tests against both mocked and real APIs in CI. If the results diverge, your mocks need updating.

4. **Schema validation in tests**: Add assertions that verify mock response shapes match your TypeScript interfaces or JSON Schema definitions.

For a complete guide to integrating mocked and real-API tests in your CI/CD pipeline, see [CI/CD Testing Pipeline with GitHub Actions](/blog/cicd-testing-pipeline-github-actions).

---

## Automate API Mocking with AI Agents

Setting up comprehensive API mocking by hand is time-consuming. AI coding agents can accelerate this dramatically by generating mock handlers, test fixtures, and error scenarios from your existing API code or OpenAPI specifications.

Install specialized QA skills to give your AI agent expert knowledge of API mocking patterns:

\`\`\`bash
# REST API testing skill -- includes mocking best practices
npx @qaskills/cli add api-testing-rest

# Playwright API testing -- includes route-based mocking patterns
npx @qaskills/cli add playwright-api

# Generate complete test suites with mock configurations
npx @qaskills/cli add api-test-suite-generator

# Validate API contracts to prevent mock drift
npx @qaskills/cli add api-contract-validator
\`\`\`

These skills teach your AI agent to generate MSW handlers from your API routes, create realistic test data factories, set up error injection patterns, and build stateful mocks for complex multi-step workflows. Instead of spending hours writing mock configurations manually, describe what you need and let the agent produce production-quality mocking infrastructure.

Browse all available testing skills at [/skills](/skills), or check our [getting started guide](/getting-started) for installation instructions. For the foundational API testing concepts that complement mocking, read our [API Testing Complete Guide](/blog/api-testing-complete-guide).

---

## Frequently Asked Questions

### What is the difference between API mocking and service virtualization?

**API mocking** typically refers to lightweight, in-process substitutes that return predefined responses during testing. **Service virtualization** is a broader term that encompasses running standalone mock servers (like WireMock) that simulate entire services, often with stateful behavior, request matching, and protocol support beyond HTTP. In practice, the terms overlap significantly. Service virtualization tools like WireMock and Mountebank are API mocking tools that run as separate processes, making them suitable for integration testing across multiple services. The choice between in-process mocking (MSW, Nock) and standalone service virtualization (WireMock) depends on whether you need the mock to be shared across multiple consumers or embedded within a single test suite.

### Should I mock APIs in end-to-end tests?

It depends on the purpose of the test. **Pure E2E tests** should ideally hit real APIs to validate the full stack. However, there are valid reasons to mock in E2E tests: testing error scenarios that are hard to reproduce, avoiding flaky tests caused by external service instability, and enabling parallel test execution without shared state. A practical approach is to maintain two E2E test suites -- one with mocked APIs for comprehensive coverage and fast feedback, and a smaller "smoke" suite that runs against real services for final validation. Playwright's \`page.route()\` makes it easy to selectively mock specific endpoints while letting other requests pass through to real APIs.

### How do I prevent my mocks from becoming outdated?

Mock drift is the most common failure mode of API mocking strategies. Four practices help prevent it. First, **derive mocks from contracts** -- use OpenAPI specifications or Pact contracts as the source of truth, and generate or validate your mocks against them. Second, **re-record periodically** -- if you use WireMock's record-and-playback feature, schedule regular recording sessions against staging environments. Third, **add schema assertions** -- in your test setup, validate that mock responses conform to your TypeScript types or JSON Schema definitions. Fourth, **run shadow tests** -- periodically execute the same test scenarios against both mocked and real APIs in CI, and alert when results diverge. The combination of contract verification and periodic re-recording catches most drift before it causes test failures.

### Can I use MSW with frameworks other than React?

Yes. MSW is **framework-agnostic**. It intercepts HTTP requests at the network level, which means it works with any JavaScript or TypeScript framework -- React, Vue, Svelte, Angular, Next.js, Remix, and plain Node.js applications. For browser-based applications, MSW uses a Service Worker regardless of the frontend framework. For server-side code (API routes, server components, backend services), MSW's Node.js integration intercepts requests from any HTTP client including \`fetch\`, \`axios\`, \`node-fetch\`, and the native \`http\` module. The handler syntax is the same across all environments, so you write your mock definitions once and reuse them in unit tests, integration tests, and browser-based development.

### How do I mock GraphQL APIs?

MSW provides first-class support for GraphQL mocking through \`graphql.query()\` and \`graphql.mutation()\` handlers. Instead of matching URL paths, you match GraphQL operation names. For example, \`graphql.query('GetUser', ({ variables }) => { ... })\` intercepts any GraphQL query named \`GetUser\` regardless of which endpoint it is sent to. WireMock can also mock GraphQL by matching on the JSON body containing the query string, though this is more cumbersome than MSW's dedicated GraphQL support. For comprehensive GraphQL testing strategies including mocking, schema validation, and subscription testing, see our [GraphQL Testing Complete Guide](/blog/graphql-testing-complete-guide).
`,
};
