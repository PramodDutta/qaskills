import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pytest-asyncio Guide: Test Async Functions in Python 2026',
  description:
    'Test async code with pytest-asyncio in 2026: @pytest.mark.asyncio, asyncio_mode auto vs strict, async fixtures, event loop scope, httpx/aiohttp, mocking async.',
  date: '2026-06-07',
  category: 'Guide',
  content: `
# Pytest-asyncio Guide: Test Async Functions in Python (2026)

Async Python is everywhere now: FastAPI services, aiohttp clients, async database drivers, and background task workers all built on \`async def\` and \`await\`. But plain pytest cannot run a coroutine. Write an \`async def test_...\` without the right plugin and pytest will collect it, "pass" it instantly, and emit a \`coroutine was never awaited\` warning, meaning your assertions never actually ran. The fix is [pytest-asyncio](https://pypi.org/project/pytest-asyncio/), the plugin that teaches pytest how to drive an event loop, await your test coroutines, and manage async fixtures.

This guide covers everything you need to test async code with pytest in 2026, on pytest 8.x and the current pytest-asyncio line. We will install it, explain the critical \`asyncio_mode = auto\` versus \`strict\` setting, write async fixtures, control event-loop scope, test real async HTTP clients with httpx and aiohttp, mock coroutines correctly, and decode the confusing errors that trip everyone up. If you want the broader testing foundation first, [pytest best practices for 2026](/blog/pytest-best-practices-2026) and [what is pytest in Python](/blog/what-is-pytest-python-explained) are good companions.

If you would rather have an AI coding agent set up async testing, write async fixtures, and mock your coroutines correctly, install the [pytest patterns skill](/skills) into Claude Code, Cursor, or Copilot.

## Installing pytest-asyncio

pytest-asyncio is a separate plugin. Install it with pip:

\`\`\`bash
pip install pytest-asyncio
\`\`\`

Or declare it in your test dependencies in \`pyproject.toml\`:

\`\`\`toml
[project.optional-dependencies]
test = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
    "httpx>=0.27",
]
\`\`\`

The plugin loads automatically once installed. The very first decision you must make is the *mode*, because it changes whether you have to decorate every async test. Get this wrong and either your async tests silently do not run, or you get cryptic skip messages. We will cover modes next, but here is the smallest possible working example using explicit \`strict\` mode:

\`\`\`python
import asyncio
import pytest


@pytest.mark.asyncio
async def test_sleep_returns():
    await asyncio.sleep(0)
    assert True
\`\`\`

## @pytest.mark.asyncio Explained

The \`@pytest.mark.asyncio\` decorator marks a test coroutine so pytest-asyncio knows to run it inside an event loop. In \`strict\` mode this marker is *mandatory* on every async test; without it, pytest-asyncio leaves the coroutine alone and pytest reports the false pass.

\`\`\`python
import pytest


@pytest.mark.asyncio
async def test_fetch_user(api):
    user = await api.get_user(42)
    assert user.name == "Ada"
\`\`\`

You can apply the marker to an entire class or module so you do not repeat it on every test. The module-level form uses \`pytestmark\`:

\`\`\`python
import pytest

# Every async test in this module is treated as an asyncio test.
pytestmark = pytest.mark.asyncio


async def test_one(client):
    assert await client.ping() == "pong"


async def test_two(client):
    assert await client.version() == "2026.1"
\`\`\`

Register the marker in config to avoid \`PytestUnknownMarkWarning\` and to enable \`--strict-markers\`:

\`\`\`toml
[tool.pytest.ini_options]
markers = [
    "asyncio: mark a test as an async coroutine test",
]
\`\`\`

## asyncio_mode: auto vs strict

This is the single most important configuration choice in pytest-asyncio. The \`asyncio_mode\` setting controls whether you must decorate async tests at all. There are two values: \`strict\` (the default) and \`auto\`.

In **strict** mode, only tests and fixtures explicitly marked with \`@pytest.mark.asyncio\` (or the async fixture decorator) are collected as async. Everything else is left to other plugins. This is explicit and avoids surprising other async frameworks like Trio.

In **auto** mode, *every* \`async def\` test is automatically treated as an asyncio test, no decorator needed, and every async fixture is auto-detected. This is the most convenient option for a codebase that is purely asyncio-based, which is the common case.

Set it in \`pyproject.toml\`:

\`\`\`toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
\`\`\`

With \`auto\` mode on, this just works with no decorator:

\`\`\`python
# No @pytest.mark.asyncio needed in auto mode.
async def test_division(calculator):
    assert await calculator.divide(10, 2) == 5
\`\`\`

Here is how the two modes compare:

| Aspect | \`strict\` (default) | \`auto\` |
|---|---|---|
| Decorator required on tests | Yes, \`@pytest.mark.asyncio\` | No |
| Async fixtures need marking | Yes | No, auto-detected |
| Coexists with Trio/AnyIO cleanly | Yes | Riskier (claims all async) |
| Boilerplate | More | Minimal |
| Best for | Mixed async frameworks | Pure asyncio codebase |

For a project that is entirely \`asyncio\` (FastAPI, aiohttp, async SQLAlchemy), choose \`auto\` and delete the decorators. For a library that must coexist with other async backends, keep \`strict\`. The recommendation in 2026 for most application code is \`asyncio_mode = "auto"\`.

## Writing Async Fixtures

Fixtures can be coroutines too. An async fixture is set up and torn down inside the event loop, which lets you \`await\` async setup like opening a connection. In \`auto\` mode you write them as plain \`async def\` fixtures; in \`strict\` mode you decorate them with \`@pytest_asyncio.fixture\`.

\`\`\`python
import pytest_asyncio


@pytest_asyncio.fixture
async def db_pool():
    pool = await create_pool("postgresql://localhost/test")
    yield pool
    await pool.close()  # async teardown runs after yield
\`\`\`

In \`auto\` mode the same fixture needs no special decorator:

\`\`\`python
import pytest


@pytest.fixture
async def db_pool():
    pool = await create_pool("postgresql://localhost/test")
    yield pool
    await pool.close()
\`\`\`

Async fixtures support the full \`yield\` setup/teardown pattern, and the teardown after \`yield\` is awaited correctly. This matters because synchronous fixtures cannot \`await\` cleanup, so if you tried to close an async connection from a regular fixture you would either leak the resource or block the loop. An async fixture solves that: everything before \`yield\` is awaited during setup, the value is injected into your test, and everything after \`yield\` is awaited during teardown, in reverse order of fixture creation. You can mix synchronous and asynchronous fixtures freely in the same test, and pytest resolves the dependency graph correctly, awaiting only the async ones.

A common, useful composition is an async client fixture built on top of an async resource fixture:

\`\`\`python
import pytest_asyncio
from myapp import build_app


@pytest_asyncio.fixture
async def app():
    application = await build_app()
    yield application
    await application.shutdown()


@pytest_asyncio.fixture
async def authenticated_client(app):
    client = AsyncClient(app=app)
    await client.login("user@example.com", "secret")
    yield client
    await client.aclose()
\`\`\`

## Event Loop Scope

By default pytest-asyncio creates a fresh event loop for each test function, which gives perfect isolation. But an expensive async resource, like a connection pool you want to share across a module, needs a loop that lives long enough to cover the whole module. In current pytest-asyncio you control this with \`loop_scope\` on the marker and fixture, and with the \`asyncio_default_fixture_loop_scope\` config setting.

\`\`\`toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
# Default loop scope for async fixtures: function, class, module, package, session.
asyncio_default_fixture_loop_scope = "function"
\`\`\`

To make a specific async fixture live for the whole module and share one loop, set both \`scope\` and \`loop_scope\`:

\`\`\`python
import pytest_asyncio


@pytest_asyncio.fixture(scope="module", loop_scope="module")
async def shared_pool():
    pool = await create_pool("postgresql://localhost/test")
    yield pool
    await pool.close()
\`\`\`

Tests that use a module-scoped loop must run on that loop too, declared with the marker's \`loop_scope\`:

\`\`\`python
import pytest


@pytest.mark.asyncio(loop_scope="module")
async def test_uses_shared_pool(shared_pool):
    async with shared_pool.acquire() as conn:
        assert await conn.fetchval("SELECT 1") == 1
\`\`\`

The critical rule: a fixture and the tests using it must share the same loop scope. A \`session\`-scoped async resource awaited from a \`function\`-scoped loop will raise \`RuntimeError: got Future attached to a different loop\`. Match the scopes and the error disappears. Note that the old \`event_loop\` fixture override pattern is deprecated; use \`loop_scope\` instead.

| Loop scope | Loop lifetime | Use for |
|---|---|---|
| \`function\` (default) | One per test | Maximum isolation, most tests |
| \`class\` | One per test class | Shared setup within a class |
| \`module\` | One per test file | Module-scoped pools/connections |
| \`session\` | One per run | Truly global, expensive resources |

## Testing async HTTP clients (httpx and aiohttp)

The most common real-world async test is hitting an HTTP endpoint. With FastAPI and Starlette apps, the modern approach uses httpx's \`AsyncClient\` with an \`ASGITransport\` so you test the app in-process without a real socket:

\`\`\`python
import pytest
import httpx
from myapp.main import app  # a FastAPI/Starlette ASGI app


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test"
    ) as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
\`\`\`

For aiohttp servers, the official \`aiohttp.pytest_plugin\` provides an \`aiohttp_client\` fixture, but you can also drive your own \`ClientSession\` against a real or mocked endpoint:

\`\`\`python
import pytest
import aiohttp


@pytest.mark.asyncio
async def test_external_api_returns_json():
    async with aiohttp.ClientSession() as session:
        async with session.get("https://httpbin.org/json") as resp:
            assert resp.status == 200
            data = await resp.json()
    assert "slideshow" in data
\`\`\`

To avoid real network calls, mock the transport. For httpx, the \`MockTransport\` or the \`respx\` library intercepts requests; for aiohttp, \`aioresponses\` does the same:

\`\`\`python
import pytest
import httpx


@pytest.mark.asyncio
async def test_with_mocked_transport():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"id": 7, "name": "mock"})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        resp = await client.get("https://api.example.com/users/7")
    assert resp.json()["name"] == "mock"
\`\`\`

For a broader treatment of testing services end to end, see our [API testing complete guide](/blog/api-testing-complete-guide).

## Mocking Async Code

Mocking coroutines is where many test suites go wrong. A plain \`unittest.mock.Mock\` returns a value, not a coroutine, so \`await mock()\` raises \`TypeError: object Mock can't be used in 'await' expression\`. The fix is \`AsyncMock\`, which returns an awaitable and records \`await\` calls.

\`\`\`python
from unittest.mock import AsyncMock
import pytest


@pytest.mark.asyncio
async def test_service_calls_repository():
    repo = AsyncMock()
    repo.get_user.return_value = {"id": 1, "name": "Grace"}

    service = UserService(repo)
    user = await service.fetch(1)

    assert user["name"] == "Grace"
    repo.get_user.assert_awaited_once_with(1)  # note: assert_awaited, not assert_called
\`\`\`

The key APIs differ from synchronous mocks: use \`assert_awaited_once\`, \`assert_awaited_with\`, and \`await_count\` to assert on awaited coroutines. When you patch an async method, \`patch\` with \`AsyncMock\` autospec usually detects it automatically in modern Python:

\`\`\`python
from unittest.mock import patch, AsyncMock
import pytest


@pytest.mark.asyncio
async def test_patched_async_method():
    with patch.object(
        PaymentGateway, "charge", new_callable=AsyncMock
    ) as mock_charge:
        mock_charge.return_value = {"status": "succeeded"}
        gateway = PaymentGateway()
        result = await gateway.charge(amount=1000)

    assert result["status"] == "succeeded"
    mock_charge.assert_awaited_once_with(amount=1000)
\`\`\`

To simulate an async function that yields multiple values over successive calls, use \`side_effect\` with a list, exactly as with sync mocks:

\`\`\`python
from unittest.mock import AsyncMock

stream = AsyncMock(side_effect=["chunk-1", "chunk-2", StopAsyncIteration])
\`\`\`

Here is a quick reference of sync versus async mock APIs:

| Sync mock | Async equivalent | Purpose |
|---|---|---|
| \`Mock()\` | \`AsyncMock()\` | Create an awaitable mock |
| \`assert_called_once()\` | \`assert_awaited_once()\` | Verify a single await |
| \`assert_called_with(x)\` | \`assert_awaited_with(x)\` | Verify await arguments |
| \`call_count\` | \`await_count\` | Count awaits |
| \`return_value\` | \`return_value\` | Same; result of the await |

## Common Errors and How to Fix Them

Async testing has a handful of signature error messages, and the frustrating thing about them is that they rarely point at the real cause. A test "passing" instantly is actually a silent failure; a "different loop" error blames the loop when the real problem is a fixture scope two files away. Knowing what each message maps to turns an hour of confused debugging into a thirty-second fix. The four below cover the vast majority of what you will hit in practice.

**\`RuntimeWarning: coroutine 'test_x' was never awaited\`** means pytest collected an async test but never ran it. The plugin is not active for that test: either pytest-asyncio is not installed, or you are in \`strict\` mode and forgot \`@pytest.mark.asyncio\`, or \`asyncio_mode\` is not set to \`auto\`. The test "passes" but executed nothing.

\`\`\`python
# strict mode without the marker -> "never awaited" warning, false pass
async def test_broken():
    assert await thing() == 1

# fix: add the marker, or switch to asyncio_mode = "auto"
import pytest


@pytest.mark.asyncio
async def test_fixed():
    assert await thing() == 1
\`\`\`

**\`RuntimeError: got Future <...> attached to a different loop\`** means a resource was created on one event loop and awaited on another, almost always a scope mismatch between an async fixture and the test. Align the \`loop_scope\` of the fixture and the test.

**\`TypeError: object Mock can't be used in 'await' expression\`** means you used \`Mock\` where you needed \`AsyncMock\`. Replace it.

**\`RuntimeError: This event loop is already running\`** usually comes from calling \`asyncio.run()\` or \`loop.run_until_complete()\` inside an async test; let pytest-asyncio drive the loop, just \`await\` directly.

| Error message | Root cause | Fix |
|---|---|---|
| coroutine was never awaited | Plugin not driving the test | Add marker or set \`asyncio_mode="auto"\` |
| Future attached to a different loop | Fixture/test loop scope mismatch | Match \`loop_scope\` on both |
| Mock can't be used in await | Wrong mock class | Use \`AsyncMock\` |
| This event loop is already running | Manual \`asyncio.run\` in a test | Just \`await\`; let the plugin run the loop |

Treat these as deterministic bugs, not flakes. Each maps to one specific cause. If you do see genuinely intermittent async failures (passing sometimes, failing others), that is usually unawaited background tasks or shared state, covered in our [guide to fixing flaky tests](/blog/fix-flaky-tests-guide).

## Parametrizing and Timing Out Async Tests

Async tests work with the rest of pytest's machinery, including \`@pytest.mark.parametrize\`. You parametrize the coroutine exactly as you would a synchronous test, and pytest-asyncio runs each parameter set inside the event loop. This is the cleanest way to table-drive a set of async inputs without duplicating the await logic.

\`\`\`python
import pytest


@pytest.mark.parametrize(
    "user_id, expected_name",
    [
        (1, "Ada"),
        (2, "Grace"),
        (3, "Katherine"),
    ],
)
async def test_get_user_by_id(api, user_id, expected_name):
    user = await api.get_user(user_id)
    assert user.name == expected_name
\`\`\`

A second concern unique to async tests is hanging coroutines. If an awaited call never resolves (a network mock that never returns, a deadlocked lock), the test hangs forever and your CI job times out without a clear cause. Guard slow async tests with a timeout so a hang surfaces as a fast, readable failure instead of a stalled pipeline. The \`pytest-timeout\` plugin enforces a wall-clock limit, and pytest-asyncio also supports the \`@pytest.mark.asyncio\` marker alongside \`asyncio.timeout\` for in-test budgets.

\`\`\`python
import asyncio
import pytest


async def test_request_completes_in_time(client):
    # Fail fast if the call does not resolve within 2 seconds.
    async with asyncio.timeout(2.0):
        result = await client.fetch("/slow-endpoint")
    assert result.status == 200
\`\`\`

Pairing parametrization for breadth with timeouts for safety gives you a fast, deterministic async suite that fails loudly instead of hanging silently. Both patterns compose with everything covered so far: \`auto\` mode, async fixtures, and \`AsyncMock\` dependencies all work unchanged inside parametrized, time-bounded tests.

## Putting It All Together

A realistic async test module brings the pieces together: \`auto\` mode in config, async fixtures for the app and client, an httpx ASGI client, and an \`AsyncMock\` for an external dependency.

\`\`\`python
# pyproject.toml
# [tool.pytest.ini_options]
# asyncio_mode = "auto"
# asyncio_default_fixture_loop_scope = "function"

import pytest
import httpx
from unittest.mock import AsyncMock
from myapp.main import build_app


@pytest.fixture
async def client():
    app = build_app(payments=AsyncMock())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test"
    ) as c:
        yield c


async def test_create_order(client):
    resp = await client.post("/orders", json={"sku": "ABC", "qty": 2})
    assert resp.status_code == 201
    body = resp.json()
    assert body["sku"] == "ABC"
    assert body["status"] == "pending"
\`\`\`

That is the whole pattern: no decorators (auto mode), an async fixture that yields a real in-process client, and a mocked async dependency so the test is fast and deterministic. Once async testing is solid, the next performance win is parallel execution; pair this with our guide to running tests in parallel and the [pytest best practices guide](/blog/pytest-best-practices-2026) to keep a large async suite fast and maintainable.

## Frequently Asked Questions

### How do I test an async function with pytest?

Install pytest-asyncio, then either set \`asyncio_mode = "auto"\` in \`pyproject.toml\` (so every \`async def\` test runs automatically) or, in the default strict mode, decorate each test with \`@pytest.mark.asyncio\`. The plugin runs the test coroutine inside an event loop and awaits it. Without the plugin, plain pytest collects async tests but never runs them, producing false passes.

### What is the difference between asyncio_mode auto and strict?

In strict mode (the default) you must explicitly mark every async test with \`@pytest.mark.asyncio\` and every async fixture with the async fixture decorator. In auto mode, pytest-asyncio automatically treats all \`async def\` tests and fixtures as asyncio, requiring no decorators. Choose auto for a pure-asyncio codebase to remove boilerplate, and strict if you also use Trio or AnyIO.

### Why does pytest say "coroutine was never awaited"?

That warning means pytest collected your async test but never ran it, so your assertions did not execute and the test falsely "passed." The plugin is not driving that test: either pytest-asyncio is not installed, you are in strict mode and forgot \`@pytest.mark.asyncio\`, or \`asyncio_mode\` is not set to \`auto\`. Add the marker or switch to auto mode.

### How do I write an async fixture in pytest?

In auto mode, just write a fixture as an \`async def\` function with \`@pytest.fixture\`; pytest-asyncio detects it. In strict mode, decorate it with \`@pytest_asyncio.fixture\`. Async fixtures support the \`yield\` setup/teardown pattern, and code after \`yield\` is awaited for teardown, so you can \`await pool.close()\` to clean up async resources cleanly.

### How do I mock an async function in pytest?

Use \`unittest.mock.AsyncMock\` instead of \`Mock\`. \`AsyncMock\` returns an awaitable, so \`await mock()\` works, and it records awaits for assertions like \`assert_awaited_once_with(...)\` and \`await_count\`. When patching an async method, pass \`new_callable=AsyncMock\` to \`patch\`. A plain \`Mock\` raises "object Mock can't be used in 'await' expression."

### What event loop scope should async fixtures use?

By default each test gets its own function-scoped loop, which is the safest choice. For an expensive shared resource like a connection pool, set both \`scope\` and \`loop_scope\` to \`module\` (or \`session\`) on the fixture, and use \`@pytest.mark.asyncio(loop_scope="module")\` on the tests. The fixture and its tests must share the same loop scope, or you get a "Future attached to a different loop" error.

### How do I test a FastAPI or httpx async endpoint?

Use httpx's \`AsyncClient\` with \`ASGITransport(app=app)\` to call the app in-process without opening a real socket. Wrap it in an async fixture, then \`await client.get("/path")\` inside your async test and assert on \`response.status_code\` and \`response.json()\`. To avoid external calls, intercept requests with \`httpx.MockTransport\` or the \`respx\` library.

### Can I use pytest-asyncio with pytest-xdist for parallel tests?

Yes. pytest-asyncio handles the event loop per worker process, and pytest-xdist distributes async tests across workers like any other tests. Just be careful with shared async resources: each xdist worker is a separate process, so session-scoped pools and external services must be namespaced per worker to avoid collisions, exactly as with synchronous parallel tests.
`,
};
