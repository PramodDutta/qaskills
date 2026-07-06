import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright vs Pytest for API Testing: A 2026 Deep Comparison',
  description:
    'Playwright APIRequestContext vs pytest with requests and httpx for REST and GraphQL API testing. Setup, fixtures, auth, parallelization, and when to pick each.',
  date: '2026-07-06',
  category: 'Comparison',
  content: `
# Playwright vs Pytest for API Testing: A 2026 Deep Comparison

API testing is where most modern test suites earn their keep. UI tests are slow and brittle, but a well-built API layer catches regressions in seconds and pins down contracts before a browser ever loads. Two of the most common ways teams write API tests today are Playwright's built-in \`APIRequestContext\` and the classic Python trio of pytest plus \`requests\` or \`httpx\`. They come from different worlds. Playwright is a browser automation framework that happens to ship a first-class HTTP client, so your API tests and end-to-end tests live in the same TypeScript project and share fixtures, config, and reporters. Pytest is a general-purpose Python test runner with a massive plugin ecosystem, and paired with \`requests\` or the async-capable \`httpx\` it has been the default for backend engineers for years.

This guide compares the two head to head for real REST and GraphQL testing work. We will look at project setup, how each expresses fixtures and test lifecycle, how you write assertions, how authentication and token reuse work, how they parallelize, how they slot into CI, and finally a decision framework for choosing one over the other. Every section ships runnable code in the correct language so you can copy, adapt, and run it today. If you are building a QA capability for AI coding agents, browse the [QA skills](/skills) directory for ready-made API testing skills you can drop into Claude Code, Cursor, or any MCP-aware agent. By the end you will know exactly which tool fits your stack, your team's language, and your pipeline.

## The Two Approaches at a Glance

Before diving into code, it helps to frame what each tool actually is. Playwright's API testing capability is a byproduct of its browser engine: the same Chromium-backed networking stack that drives UI tests exposes an \`APIRequestContext\` you can use standalone, without ever opening a page. Pytest is language-agnostic in spirit but Python in practice, and it leans on an HTTP library, \`requests\` for synchronous simplicity or \`httpx\` for async and HTTP/2.

| Dimension | Playwright APIRequestContext | Pytest + requests/httpx |
|---|---|---|
| Language | TypeScript / JavaScript (also Python, Java, .NET) | Python |
| HTTP client | Built in (\`request\` fixture) | External (\`requests\` or \`httpx\`) |
| Async support | Native async/await | \`requests\` sync, \`httpx\` async |
| Shares code with E2E | Yes, same project | No, separate stack |
| Parallelization | Workers (process based) | \`pytest-xdist\` (process based) |
| Ecosystem | Playwright reporters, trace viewer | Huge pytest plugin ecosystem |
| Best for | Full-stack teams already on Playwright | Backend teams already on Python |

Neither is objectively better. The right pick depends on what your team already runs and where your API tests need to live relative to your UI tests. For a broader tool landscape, see our [selenium vs playwright](/blog/selenium-vs-playwright-2026) comparison, which covers the browser side of the same trade-off.

## Project Setup and Installation

Getting started with Playwright API testing takes one install and a config file. You do not need any browsers downloaded if you only test APIs, though \`npx playwright install\` is harmless.

\`\`\`bash
npm init -y
npm install --save-dev @playwright/test
npx playwright install
\`\`\`

A minimal \`playwright.config.ts\` sets the base URL and default headers so every request inherits them:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.API_BASE_URL ?? 'https://api.example.com',
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  },
});
\`\`\`

The pytest side needs Python, pytest, and an HTTP client. Using \`httpx\` gives you both sync and async out of the box.

\`\`\`bash
python -m venv .venv
source .venv/bin/activate
pip install pytest httpx pytest-xdist
\`\`\`

A \`conftest.py\` at the project root centralizes the base URL and a shared client. This is the pytest equivalent of Playwright's config \`use\` block:

\`\`\`python
import os
import httpx
import pytest

BASE_URL = os.environ.get("API_BASE_URL", "https://api.example.com")


@pytest.fixture(scope="session")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as c:
        yield c
\`\`\`

Both setups are quick. The difference is philosophical: Playwright bakes HTTP config into a framework-owned config file, while pytest expresses everything as fixtures you compose yourself. Explore ready-to-use [QA skills](/skills) if you want opinionated starter templates for either stack.

## Writing Your First Request

Here is a simple GET-and-assert in Playwright. The \`request\` fixture is injected automatically into every test:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('GET /users returns a list', async ({ request }) => {
  const response = await request.get('/users');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeGreaterThan(0);
});
\`\`\`

The same test in pytest with the \`client\` fixture from \`conftest.py\`:

\`\`\`python
def test_get_users_returns_a_list(client):
    response = client.get("/users")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) > 0
\`\`\`

They read almost identically. Playwright uses \`response.status()\` (a method) and \`await response.json()\` because everything is async. Pytest uses \`response.status_code\` (an attribute) and a synchronous \`response.json()\`. The mental model transfers cleanly between the two.

## POST, PUT, and Request Bodies

Real tests mutate state. Playwright accepts a \`data\` option that it serializes to JSON automatically when you pass an object:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('POST /users creates a user', async ({ request }) => {
  const response = await request.post('/users', {
    data: { name: 'Ada Lovelace', role: 'engineer' },
  });
  expect(response.status()).toBe(201);
  const created = await response.json();
  expect(created).toMatchObject({ name: 'Ada Lovelace', role: 'engineer' });
  expect(created.id).toBeTruthy();
});
\`\`\`

In pytest, pass \`json=\` and \`httpx\` handles serialization and the \`Content-Type\` header:

\`\`\`python
def test_post_users_creates_a_user(client):
    payload = {"name": "Ada Lovelace", "role": "engineer"}
    response = client.post("/users", json=payload)
    assert response.status_code == 201
    created = response.json()
    assert created["name"] == "Ada Lovelace"
    assert created["role"] == "engineer"
    assert created["id"]
\`\`\`

Playwright's \`toMatchObject\` gives you partial structural matching in one line. Pytest keeps assertions explicit, which some teams prefer for readability. For deeper coverage patterns, our [api testing complete guide](/blog/api-testing-complete-guide) walks through full CRUD lifecycle suites.

## Fixtures and Test Lifecycle

Fixtures are where the two frameworks diverge most in style. Pytest's fixture system is famous for a reason: dependency injection, scopes (function, class, module, session), finalizers via \`yield\`, and parametrization all compose beautifully.

\`\`\`python
import pytest


@pytest.fixture
def created_user(client):
    response = client.post("/users", json={"name": "Temp User"})
    user = response.json()
    yield user
    # teardown runs after the test regardless of pass or fail
    client.delete(f"/users/{user['id']}")


def test_user_can_be_fetched(client, created_user):
    response = client.get(f"/users/{created_user['id']}")
    assert response.status_code == 200
    assert response.json()["name"] == "Temp User"
\`\`\`

Playwright uses a fixtures concept too, extended via \`test.extend\`. You define custom fixtures once and they inject into any test:

\`\`\`typescript
import { test as base, expect, type APIRequestContext } from '@playwright/test';

type Fixtures = {
  createdUser: { id: string; name: string };
};

const test = base.extend<Fixtures>({
  createdUser: async ({ request }, use) => {
    const res = await request.post('/users', { data: { name: 'Temp User' } });
    const user = await res.json();
    await use(user);
    // teardown after the test uses the fixture
    await request.delete(\`/users/\${user.id}\`);
  },
});

test('user can be fetched', async ({ request, createdUser }) => {
  const res = await request.get(\`/users/\${createdUser.id}\`);
  expect(res.status()).toBe(200);
  expect((await res.json()).name).toBe('Temp User');
});
\`\`\`

Both support setup-yield-teardown. Pytest's scopes are more granular and its parametrization is more mature, which matters for data-driven suites. Playwright fixtures are strongly typed and integrate with the trace viewer, which matters when a failed API test needs debugging alongside a UI flow.

## Assertions and Schema Validation

Assertion ergonomics differ. Playwright ships \`expect\` with web-first matchers, and for API responses you get retrying assertions via \`expect.poll\` for eventually-consistent endpoints:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('async job eventually completes', async ({ request }) => {
  const { id } = await (await request.post('/jobs')).json();
  await expect
    .poll(async () => {
      const res = await request.get(\`/jobs/\${id}\`);
      return (await res.json()).status;
    }, { timeout: 15000, intervals: [500, 1000, 2000] })
    .toBe('completed');
});
\`\`\`

Pytest relies on plain \`assert\` (rewritten by pytest for rich failure output) plus libraries like \`jsonschema\` for contract validation:

\`\`\`python
from jsonschema import validate

USER_SCHEMA = {
    "type": "object",
    "required": ["id", "name", "role"],
    "properties": {
        "id": {"type": "string"},
        "name": {"type": "string"},
        "role": {"type": "string"},
    },
}


def test_user_matches_schema(client):
    response = client.get("/users/1")
    validate(instance=response.json(), schema=USER_SCHEMA)
\`\`\`

| Feature | Playwright | Pytest |
|---|---|---|
| Retrying assertions | \`expect.poll\` built in | Manual loop or \`tenacity\` |
| Rich diff output | Yes | Yes (assert rewriting) |
| JSON schema validation | Add a library (ajv) | \`jsonschema\` |
| Snapshot testing | \`toMatchSnapshot\` | \`syrupy\` plugin |

For eventually-consistent APIs, Playwright's \`expect.poll\` is a genuine convenience. For rigid contract testing, pytest plus \`jsonschema\` is the industry standard.

## Authentication and Token Reuse

Most APIs need auth, and you do not want to log in on every test. Playwright's answer is a stored auth state or a shared context created once. A common pattern is a setup project that logs in and saves the token:

\`\`\`typescript
import { test as setup } from '@playwright/test';
import fs from 'fs';

setup('authenticate', async ({ request }) => {
  const res = await request.post('/auth/login', {
    data: { email: process.env.USER_EMAIL, password: process.env.USER_PW },
  });
  const { token } = await res.json();
  fs.writeFileSync('.auth/token.json', JSON.stringify({ token }));
});
\`\`\`

Then a fixture injects the bearer header from that saved token so every test is authenticated without re-logging in. In pytest, a session-scoped fixture that logs in once is the natural fit:

\`\`\`python
import os
import httpx
import pytest


@pytest.fixture(scope="session")
def auth_client():
    with httpx.Client(base_url=os.environ["API_BASE_URL"], timeout=10.0) as c:
        login = c.post(
            "/auth/login",
            json={
                "email": os.environ["USER_EMAIL"],
                "password": os.environ["USER_PW"],
            },
        )
        token = login.json()["token"]
        c.headers.update({"Authorization": f"Bearer {token}"})
        yield c
\`\`\`

Because the fixture is \`scope="session"\`, the login happens exactly once per test run and every test reusing \`auth_client\` gets the header for free. Playwright's stored-state approach shines when you also run UI tests that need the same session, since the browser and the API client can share one auth artifact.

## GraphQL Testing

GraphQL is just a POST to a single endpoint, so both tools handle it without special libraries. Playwright:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('GraphQL query returns user', async ({ request }) => {
  const query = \`
    query GetUser($id: ID!) {
      user(id: $id) { id name email }
    }
  \`;
  const res = await request.post('/graphql', {
    data: { query, variables: { id: '1' } },
  });
  expect(res.status()).toBe(200);
  const { data, errors } = await res.json();
  expect(errors).toBeUndefined();
  expect(data.user.id).toBe('1');
});
\`\`\`

Pytest:

\`\`\`python
def test_graphql_query_returns_user(client):
    query = """
    query GetUser($id: ID!) {
      user(id: $id) { id name email }
    }
    """
    response = client.post(
        "/graphql",
        json={"query": query, "variables": {"id": "1"}},
    )
    assert response.status_code == 200
    payload = response.json()
    assert "errors" not in payload
    assert payload["data"]["user"]["id"] == "1"
\`\`\`

The critical thing with GraphQL is that a 200 status does not mean success: errors arrive in the \`errors\` array with a 200 code. Both examples above assert on the absence of \`errors\`, which is the correct pattern.

## Parallelization and Speed

Both frameworks parallelize by spawning worker processes. Playwright does it by default with \`fullyParallel: true\` and a configurable worker count:

\`\`\`bash
npx playwright test --workers=4
\`\`\`

Pytest needs the \`pytest-xdist\` plugin:

\`\`\`bash
pytest -n 4
\`\`\`

| Concern | Playwright | Pytest + xdist |
|---|---|---|
| Default parallel | On (\`fullyParallel\`) | Off, add \`-n\` |
| Isolation unit | Worker process | Worker process |
| Shared session state | Per-worker fixtures | \`--dist loadscope\` control |
| Flaky test retries | \`retries\` in config | \`pytest-rerunfailures\` |

A subtle gotcha with both: session-scoped auth fixtures run once per worker, not once globally. If you have four workers you log in four times. That is usually fine, but if your login is expensive or rate-limited, cache the token to disk and read it across workers. Managing flaky async tests is its own discipline, see the [QA skills](/skills) library for retry and stabilization patterns.

## CI/CD Integration

Both drop cleanly into GitHub Actions. Playwright in CI:

\`\`\`yaml
name: API Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright test
        env:
          API_BASE_URL: \${{ secrets.API_BASE_URL }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
\`\`\`

Pytest in CI:

\`\`\`yaml
name: API Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install pytest httpx pytest-xdist
      - run: pytest -n auto --junitxml=report.xml
        env:
          API_BASE_URL: \${{ secrets.API_BASE_URL }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: pytest-report
          path: report.xml
\`\`\`

Playwright's HTML report with its trace viewer is excellent for debugging failed runs. Pytest's JUnit XML plugs into virtually every CI dashboard. Both are production-ready.

## When to Choose Which

Here is the decision framework distilled. Choose Playwright APIRequestContext when your team already writes UI tests in Playwright and you want API and E2E tests in one project sharing fixtures, config, and reports; when your stack is TypeScript-first; or when you test eventually-consistent endpoints where \`expect.poll\` saves real effort. Choose pytest with requests or httpx when your engineers are Python-native, when your backend is Python and you want tests next to the code, when you need pytest's deep parametrization and plugin ecosystem, or when you are doing rigorous contract testing with \`jsonschema\`.

| If you... | Pick |
|---|---|
| Already run Playwright E2E tests | Playwright |
| Have a TypeScript full-stack team | Playwright |
| Test eventually-consistent APIs | Playwright |
| Have a Python backend team | Pytest |
| Need heavy data-driven parametrization | Pytest |
| Want the richest test plugin ecosystem | Pytest |

There is no wrong answer, only a wrong fit for your team. Many organizations run both: pytest for backend unit and integration API tests owned by backend engineers, and Playwright for the QA team's cross-cutting API-plus-UI journeys.

## Data-Driven and Parametrized Tests

A large share of API testing is the same request with different inputs, and here the two frameworks show their personalities. Pytest's \`parametrize\` decorator is the gold standard for data-driven testing. One decorator turns a single test into many, each with its own name in the report:

\`\`\`python
import pytest


@pytest.mark.parametrize(
    "role,expected_status",
    [
        ("admin", 200),
        ("editor", 200),
        ("viewer", 403),
        ("anonymous", 401),
    ],
)
def test_settings_access_by_role(client, role, expected_status):
    headers = {"X-Role": role} if role != "anonymous" else {}
    response = client.get("/settings", headers=headers)
    assert response.status_code == expected_status
\`\`\`

Playwright does not have a decorator, so you loop and create tests dynamically or drive a single test from an array:

\`\`\`typescript
import { test, expect } from '@playwright/test';

const cases = [
  { role: 'admin', expected: 200 },
  { role: 'editor', expected: 200 },
  { role: 'viewer', expected: 403 },
  { role: 'anonymous', expected: 401 },
];

for (const { role, expected } of cases) {
  test(\`settings access for \${role}\`, async ({ request }) => {
    const headers = role !== 'anonymous' ? { 'X-Role': role } : {};
    const res = await request.get('/settings', { headers });
    expect(res.status()).toBe(expected);
  });
}
\`\`\`

Both produce four independently-reported test cases, but pytest's decorator syntax is more declarative and composes with fixtures and marks more cleanly. If your suite is heavily data-driven, this is a real point in pytest's favor.

## Mocking, Error Handling, and Negative Tests

Robust API suites test failure paths, not just happy paths. In Playwright, you assert on error status codes and error bodies the same way you assert on success:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('POST /users rejects invalid payload', async ({ request }) => {
  const res = await request.post('/users', { data: { name: '' } });
  expect(res.status()).toBe(422);
  const body = await res.json();
  expect(body.errors).toContainEqual(
    expect.objectContaining({ field: 'name' }),
  );
});
\`\`\`

In pytest you do the same, and for isolated unit-style tests you can mock the transport with \`respx\` (for httpx) so you never hit a real server:

\`\`\`python
import httpx
import respx


@respx.mock
def test_handles_server_error():
    respx.get("https://api.example.com/users").mock(
        return_value=httpx.Response(500, json={"error": "internal"})
    )
    with httpx.Client(base_url="https://api.example.com") as client:
        response = client.get("/users")
    assert response.status_code == 500
    assert response.json()["error"] == "internal"
\`\`\`

Playwright can also serve or intercept via its network layer, but for pure API mocking pytest plus \`respx\` (or \`responses\` for the \`requests\` library) is the more established path. Negative testing discipline matters more than the tool: assert on error codes, error shapes, and boundary inputs in both. For a structured approach to negative and contract coverage, our [api testing complete guide](/blog/api-testing-complete-guide) has a full checklist.

## Frequently Asked Questions

### Is Playwright good for API testing without a browser?

Yes. Playwright's \`APIRequestContext\` is a full HTTP client that runs without launching any browser. You can write pure API test suites that never open a page, get automatic JSON serialization, cookie handling, and integration with Playwright's reporters and trace viewer. Many teams use it exclusively for API testing even when they have no UI tests at all.

### Should I use requests or httpx with pytest?

Use \`httpx\` for new projects. It has a nearly identical API to \`requests\` but adds native async support, HTTP/2, and a modern typed interface. Choose \`requests\` only if you have an existing codebase built on it or need a specific \`requests\`-only plugin. For async test suites or high-concurrency load-adjacent testing, \`httpx\` is the clear winner in 2026.

### Can Playwright test GraphQL APIs?

Yes. GraphQL requests are just HTTP POST calls to a single endpoint with a JSON body containing \`query\` and \`variables\`. Playwright's \`request.post\` handles this directly. The key gotcha is that GraphQL returns HTTP 200 even on errors, so you must assert on the \`errors\` field in the response body rather than relying on the status code alone.

### How do I share authentication tokens across tests?

In Playwright, use a setup project that logs in once and saves the token to disk, then inject a bearer header in a fixture. In pytest, use a session-scoped fixture that logs in once and attaches the \`Authorization\` header to the shared client. Both reuse a single login across all tests, avoiding a login round-trip per test and preventing rate-limit issues.

### Which is faster, Playwright or pytest for API tests?

Raw HTTP throughput is similar since both are thin wrappers over networking. Playwright parallelizes by default with worker processes, while pytest needs \`pytest-xdist\` with the \`-n\` flag. In practice runtime is dominated by your API's response time and your worker count, not the framework. Configure enough workers and either tool saturates your API equally.

### Do I need pytest-xdist for parallel API tests?

Yes, if you want parallel execution in pytest. By default pytest runs tests serially. Installing \`pytest-xdist\` and running \`pytest -n auto\` distributes tests across CPU cores in separate processes. Be aware that session-scoped fixtures run once per worker, so an expensive login fixture executes multiple times unless you cache its result to disk.

### Can I use Playwright API testing and E2E tests in the same project?

Absolutely, and this is Playwright's biggest advantage for full-stack teams. API and UI tests live in the same project, share the same config, fixtures, and reporters, and can pass data between each other. You can set up state via fast API calls and then verify it in the UI, all in one file, with a unified HTML report and trace viewer for debugging.

## Conclusion

Playwright's APIRequestContext and pytest with httpx are both excellent, production-grade ways to test REST and GraphQL APIs. The decision comes down to your team's language and where your API tests need to live: reach for Playwright when you are already invested in its ecosystem or want API and UI tests unified, and reach for pytest when your team is Python-native and wants tests close to the backend code with a deep plugin ecosystem behind them. Whichever you pick, structure your suites around reusable fixtures, share auth tokens once, parallelize in CI, and validate schemas to catch contract drift early. Ready to accelerate your API testing with AI coding agents? Browse the [QA skills](/skills) directory for battle-tested API testing skills you can install into Claude Code, Cursor, or any MCP-aware agent in seconds.
`,
};
