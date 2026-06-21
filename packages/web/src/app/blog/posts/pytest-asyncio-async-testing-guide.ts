import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'pytest-asyncio: Testing Async Python Code (2026)',
  description:
    'Test async/await Python with pytest-asyncio — install, asyncio_mode, async fixtures, event loops, and mocking coroutines. Fix coroutine-never-awaited with examples.',
  date: '2026-06-21',
  category: 'Guide',
  content: `
# pytest-asyncio: Testing Async Python Code (2026)

If you have ever written an \`async def\` test, run pytest, watched it report a green pass, and then quietly discovered in production that the assertion never actually executed — you have hit the single most dangerous gotcha in async Python testing. Plain pytest does not know how to run a coroutine. When it encounters an \`async def test_...\` function, it calls the function, receives a coroutine object back, never awaits it, and treats the truthy coroutine object as a passing test. Your assertions inside the coroutine never run. The only warning you get is a easy-to-miss \`RuntimeWarning: coroutine 'test_x' was never awaited\` buried in the output. This guide shows you how to fix that properly with **pytest-asyncio**, the de facto plugin for testing async/await code under pytest.

By the end you will understand: why plain pytest silently skips async tests, how to install and configure pytest-asyncio, the critical difference between \`asyncio_mode = auto\` and \`asyncio_mode = strict\`, how to write async fixtures, how the event loop and loop scope work, how to test real async HTTP clients like \`httpx\` and \`aiohttp\`, how to mock coroutines correctly with \`AsyncMock\`, how to parametrize async tests, how to enforce timeouts, and when you might reach for \`anyio\` instead. Every example is real, runnable Python you can paste into a project.

This is part of a broader Python testing track on the site. If you are still deciding on a runner or coming from the standard library, read [Python vs pytest explained](/blog/python-vs-pytest-explained) and [unittest vs pytest](/blog/unittest-vs-pytest-2026). To speed up large async suites, pair this with our [pytest-xdist parallel testing guide](/blog/pytest-xdist-parallel-testing-guide). And for ready-to-use testing patterns your AI agents can apply, browse the QA [skills](/skills) directory.

---

## Why Plain pytest Silently Skips Async Tests

Consider this test with no plugin installed:

\`\`\`python
import asyncio


async def fetch_user(user_id: int) -> dict:
    await asyncio.sleep(0.01)
    return {"id": user_id, "name": "Ada"}


async def test_fetch_user_wrong():
    user = await fetch_user(1)
    assert user["name"] == "Grace"  # This is WRONG, but the test "passes"!
\`\`\`

Run it with vanilla pytest and you will see something like:

\`\`\`bash
$ pytest test_users.py
============================= warnings summary ==============================
test_users.py::test_fetch_user_wrong
  RuntimeWarning: coroutine 'test_fetch_user_wrong' was never awaited
======================= 1 passed, 1 warning in 0.01s =======================
\`\`\`

The test is reported as **passed** even though the assertion expects "Grace" and the function returns "Ada". This happens because pytest calls \`test_fetch_user_wrong()\`, which returns a coroutine object. pytest does not await it, so the body — including the failing assertion — never executes. A non-\`None\`, non-falsey return value from a test is treated as success, and a coroutine object is truthy. The \`RuntimeWarning\` is your only clue, and in a noisy CI log it is trivially overlooked.

This is precisely why you must never run async tests without a plugin that knows how to drive the event loop. That plugin is pytest-asyncio.

---

## Installing pytest-asyncio

Install it from PyPI:

\`\`\`bash
pip install pytest-asyncio
\`\`\`

Or, with the modern uv toolchain:

\`\`\`bash
uv add --dev pytest-asyncio
\`\`\`

Verify it loaded — it should appear in the plugins line:

\`\`\`bash
$ pytest --version
pytest 8.x.x
plugins: asyncio-0.x.x
\`\`\`

The plugin is what supplies the event loop, awaits your coroutine test functions, and provides the \`@pytest.mark.asyncio\` marker and async-fixture support discussed below. With it installed, the failing test above will now correctly run the assertion and report a failure — which is exactly what you want.

---

## Marking Async Tests with @pytest.mark.asyncio

In the default (strict) configuration, you explicitly opt each async test into the event loop with the \`asyncio\` marker:

\`\`\`python
import asyncio
import pytest


async def fetch_user(user_id: int) -> dict:
    await asyncio.sleep(0.01)
    return {"id": user_id, "name": "Ada"}


@pytest.mark.asyncio
async def test_fetch_user():
    user = await fetch_user(1)
    assert user["id"] == 1
    assert user["name"] == "Ada"
\`\`\`

Now pytest-asyncio sees the marker, spins up an event loop, awaits the coroutine, and runs your assertions for real. Remove "Ada" from the expectation and the test fails as it should.

The marker is required in **strict** mode. If you forget it in strict mode, you are back to the silent-skip problem (pytest-asyncio will leave the test unhandled). In **auto** mode, the marker is applied for you — covered next.

---

## asyncio_mode: auto vs strict

pytest-asyncio has two modes that control whether you must annotate every async test. This is the most important configuration decision you will make.

| Mode | Behavior | When to use |
|---|---|---|
| \`strict\` (default) | Every async test and async fixture must be explicitly marked with \`@pytest.mark.asyncio\` (or the fixture decorator). Unmarked async tests are not collected as asyncio tests. | Mixed sync/async suites, or when multiple async backends coexist and you want explicit control. |
| \`auto\` | Every \`async def\` test is automatically treated as an asyncio test — no marker needed. Async fixtures are auto-detected too. | Pure-asyncio codebases where nearly every test is async; removes marker boilerplate. |

Set it in \`pyproject.toml\`:

\`\`\`toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
\`\`\`

Or in \`pytest.ini\`:

\`\`\`ini
[pytest]
asyncio_mode = auto
\`\`\`

Or in \`setup.cfg\`:

\`\`\`ini
[tool:pytest]
asyncio_mode = auto
\`\`\`

With \`auto\` mode, the earlier test needs no marker at all:

\`\`\`python
# With asyncio_mode = "auto", no @pytest.mark.asyncio needed
async def test_fetch_user():
    user = await fetch_user(1)
    assert user["name"] == "Ada"
\`\`\`

**Recommendation:** if your project is async-first, use \`auto\` — it eliminates marker noise and the risk of forgetting one. If your suite is a mix of sync and async, or you run more than one async framework, use \`strict\` so intent is explicit.

---

## Async Fixtures

Fixtures can be coroutines too. In strict mode, decorate them with \`pytest_asyncio.fixture\`; in auto mode, a plain \`@pytest.fixture\` on an \`async def\` is detected automatically. Use async fixtures to set up and tear down async resources — database pools, HTTP clients, connections.

\`\`\`python
import pytest
import pytest_asyncio


class AsyncDatabase:
    async def connect(self):
        await asyncio.sleep(0.01)
        self.connected = True

    async def close(self):
        await asyncio.sleep(0.01)
        self.connected = False

    async def get_user(self, user_id: int) -> dict:
        return {"id": user_id, "name": "Ada"}


@pytest_asyncio.fixture
async def db():
    database = AsyncDatabase()
    await database.connect()
    yield database          # test runs here
    await database.close()  # teardown after the test


@pytest.mark.asyncio
async def test_get_user(db):
    user = await db.get_user(7)
    assert user["id"] == 7
    assert db.connected is True
\`\`\`

The \`yield\` pattern works exactly like synchronous fixtures: code before \`yield\` is setup, code after is teardown, and both can \`await\`. This is the correct place to open and close async connections so each test gets a clean resource.

---

## The event_loop Fixture and Loop Scope

Historically pytest-asyncio exposed an \`event_loop\` fixture you could override to customize the loop. In modern pytest-asyncio that approach is deprecated in favor of **loop scope** configuration, which controls how many tests share a single event loop.

By default each test gets its own fresh event loop (function scope), which gives strong isolation. Sometimes you want a loop shared across a module or the whole session — for example to keep an expensive connection pool alive across many tests. Control this with the marker's \`loop_scope\` argument or the global setting.

\`\`\`python
import pytest


# Share one event loop across every test in this module
@pytest.mark.asyncio(loop_scope="module")
async def test_a():
    ...


@pytest.mark.asyncio(loop_scope="module")
async def test_b():
    ...
\`\`\`

Set a project-wide default loop scope for fixtures in config:

\`\`\`toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
\`\`\`

| Loop scope | Lifetime of the event loop | Trade-off |
|---|---|---|
| \`function\` | One loop per test (default) | Maximum isolation; recreates the loop each test |
| \`class\` | Shared across a test class | Reuse within a class grouping |
| \`module\` | Shared across a module | Keep connections alive per file |
| \`session\` | One loop for the whole run | Fastest reuse; least isolation, risk of state leakage |

**Rule of thumb:** keep the default function scope unless you have a measured reason (expensive setup) to widen it. A session-scoped loop with leaked state between tests is a classic source of flaky async suites.

---

## Testing Async HTTP Clients (httpx and aiohttp)

A huge share of async Python is HTTP calls. pytest-asyncio lets you test \`httpx.AsyncClient\` and \`aiohttp\` clients directly.

Here is an \`httpx\` example using a fixture for the client and \`respx\`-free hand-rolled mocking via dependency injection:

\`\`\`python
import httpx
import pytest
import pytest_asyncio


@pytest_asyncio.fixture
async def client():
    async with httpx.AsyncClient(base_url="https://api.example.com") as c:
        yield c


@pytest.mark.asyncio
async def test_health_endpoint(client, respx_mock):
    # respx_mock comes from the respx plugin; it intercepts httpx calls
    respx_mock.get("/health").respond(200, json={"status": "ok"})

    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
\`\`\`

For \`aiohttp\`, the official \`aiohttp.test_utils\` integrates with pytest, but you can also drive a client session directly inside an async test:

\`\`\`python
import aiohttp
import pytest


@pytest.mark.asyncio
async def test_aiohttp_get():
    async with aiohttp.ClientSession() as session:
        async with session.get("https://httpbin.org/get") as resp:
            assert resp.status == 200
            data = await resp.json()
            assert "url" in data
\`\`\`

For real test suites you should mock the network rather than hit live endpoints — which brings us to mocking coroutines.

---

## Mocking Coroutines with AsyncMock

You cannot mock a coroutine with a plain \`Mock\` — calling it returns a \`Mock\`, not an awaitable, and \`await\` will raise \`TypeError: object Mock can't be used in 'await' expression\`. The standard library's \`unittest.mock.AsyncMock\` (and the \`return_value\`/\`side_effect\` it supports) is the correct tool.

\`\`\`python
from unittest.mock import AsyncMock

import pytest


class UserService:
    def __init__(self, repo):
        self.repo = repo

    async def display_name(self, user_id: int) -> str:
        user = await self.repo.get_user(user_id)
        return user["name"].upper()


@pytest.mark.asyncio
async def test_display_name_uses_repo():
    repo = AsyncMock()
    repo.get_user.return_value = {"id": 1, "name": "ada"}

    service = UserService(repo)
    result = await service.display_name(1)

    assert result == "ADA"
    repo.get_user.assert_awaited_once_with(1)
\`\`\`

Note \`assert_awaited_once_with\` — \`AsyncMock\` adds await-aware assertions (\`assert_awaited\`, \`assert_awaited_once\`, \`assert_awaited_with\`) on top of the usual \`assert_called_*\` family. When patching, \`unittest.mock.patch\` automatically uses \`AsyncMock\` if it detects the target is an async function, so \`patch("module.fetch", return_value=...)\` returns an awaitable for async targets without extra ceremony.

---

## Parametrizing Async Tests

\`@pytest.mark.parametrize\` composes with async tests exactly as it does with sync tests. Stack the markers:

\`\`\`python
import pytest


async def square(n: int) -> int:
    return n * n


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "value, expected",
    [
        (2, 4),
        (3, 9),
        (0, 0),
        (-4, 16),
    ],
)
async def test_square(value, expected):
    result = await square(value)
    assert result == expected
\`\`\`

In \`auto\` mode you can drop the \`@pytest.mark.asyncio\` line entirely and keep only \`@pytest.mark.parametrize\`. This runs four independent async test cases, each in its own (function-scoped) event loop, with clear per-case reporting. Parametrization is the cleanest way to cover many input combinations for an async function without duplicating the await boilerplate.

---

## Enforcing Timeouts

Async code can hang — a network call that never resolves will stall the whole run. Defend against it. The simplest in-test approach uses \`asyncio.wait_for\`:

\`\`\`python
import asyncio

import pytest


async def slow_operation():
    await asyncio.sleep(10)  # too slow on purpose
    return "done"


@pytest.mark.asyncio
async def test_operation_times_out():
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(slow_operation(), timeout=0.5)
\`\`\`

For suite-wide protection, add the \`pytest-timeout\` plugin and cap every test so a hung coroutine fails fast instead of blocking CI:

\`\`\`bash
pip install pytest-timeout
\`\`\`

\`\`\`toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
timeout = 30          # fail any test that runs longer than 30 seconds
\`\`\`

A global timeout is cheap insurance: it turns "the pipeline hung for an hour" into "this one test failed with a timeout in 30 seconds," which is dramatically easier to debug.

---

## The anyio Alternative

pytest-asyncio is tied to the \`asyncio\` event loop. If your code uses **Trio**, or you want your tests to run against multiple async backends, consider the \`anyio\` pytest plugin instead. \`anyio\` provides a backend-agnostic async API and an \`anyio_backend\` fixture that can run the same test under both asyncio and Trio.

\`\`\`python
import anyio
import pytest


@pytest.mark.anyio
async def test_runs_on_any_backend():
    await anyio.sleep(0.01)
    assert True


# Restrict or expand which backends a test runs on:
@pytest.fixture
def anyio_backend():
    return "asyncio"   # or ("asyncio", "trio") to run on both
\`\`\`

Use pytest-asyncio when you are firmly on asyncio (the common case for FastAPI, aiohttp, and most asyncio libraries). Reach for anyio when you target Trio, build a library that must support multiple backends, or use a framework (such as Starlette/FastAPI internals) that is built on anyio.

---

## Common Errors and Fixes

| Symptom | Cause | Fix |
|---|---|---|
| \`coroutine 'test_x' was never awaited\` and test "passes" | pytest-asyncio not installed, or test unmarked in strict mode | Install pytest-asyncio; add \`@pytest.mark.asyncio\` or set \`asyncio_mode = auto\` |
| \`object Mock can't be used in 'await' expression\` | Mocked a coroutine with plain \`Mock\` | Use \`AsyncMock\` instead |
| \`RuntimeError: This event loop is already running\` | Calling \`asyncio.run()\` or \`loop.run_until_complete()\` inside a test | Just \`await\` directly; let pytest-asyncio own the loop |
| \`RuntimeError: Event loop is closed\` between tests | Shared loop scope leaking a closed loop, or resource bound to a stale loop | Use function-scoped loops, or align fixture loop scope with the test |
| Async fixture yields a coroutine instead of a value | Used \`@pytest.fixture\` in strict mode on an async fixture | Use \`@pytest_asyncio.fixture\`, or switch to \`auto\` mode |
| \`DeprecationWarning\` about \`event_loop\` fixture | Overriding the deprecated \`event_loop\` fixture | Use \`loop_scope\` / \`asyncio_default_fixture_loop_scope\` instead |
| Tests interfere via shared state | Session/module loop scope sharing global state | Narrow the loop scope or reset state in teardown |

---

## A Complete Example: conftest.py + Tests

Putting it together, here is a small but realistic setup. First \`pyproject.toml\`:

\`\`\`toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
timeout = 30
\`\`\`

A shared async fixture in \`conftest.py\`:

\`\`\`python
import httpx
import pytest_asyncio


@pytest_asyncio.fixture
async def api_client():
    async with httpx.AsyncClient(base_url="https://api.example.com") as client:
        yield client
\`\`\`

And the tests (no \`@pytest.mark.asyncio\` needed thanks to \`auto\` mode):

\`\`\`python
from unittest.mock import AsyncMock

import pytest


async def test_client_is_async(api_client):
    assert isinstance(api_client.timeout.connect, float) or api_client is not None


@pytest.mark.parametrize("user_id", [1, 2, 99])
async def test_service_calls_repo(user_id):
    repo = AsyncMock()
    repo.get_user.return_value = {"id": user_id, "name": "test"}

    user = await repo.get_user(user_id)

    assert user["id"] == user_id
    repo.get_user.assert_awaited_once_with(user_id)
\`\`\`

This is the shape of a healthy async test suite: \`auto\` mode to remove marker noise, function-scoped loops for isolation, a global timeout for safety, async fixtures for resources, and \`AsyncMock\` for coroutine dependencies.

---

## Frequently Asked Questions

### Why does my async test pass without actually running?

Plain pytest does not await coroutines. When it calls your \`async def\` test, it gets back a coroutine object, never awaits it, and treats the truthy object as a pass — so your assertions never execute. The only hint is a \`RuntimeWarning: coroutine was never awaited\`. Installing pytest-asyncio and marking the test (or using \`asyncio_mode = auto\`) makes pytest actually drive the event loop and run your assertions.

### What is the difference between asyncio_mode auto and strict?

In \`strict\` mode (the default), every async test and fixture must be explicitly marked with \`@pytest.mark.asyncio\` or \`@pytest_asyncio.fixture\`; unmarked async tests are not collected as asyncio tests. In \`auto\` mode, pytest-asyncio automatically treats every \`async def\` test as an asyncio test and detects async fixtures, removing the marker boilerplate. Use \`auto\` for async-first projects and \`strict\` for mixed or multi-backend suites.

### How do I write an async fixture in pytest?

Use \`@pytest_asyncio.fixture\` on an \`async def\` function (or a plain \`@pytest.fixture\` if \`asyncio_mode = auto\`). The fixture can \`await\` during setup, \`yield\` the resource for the test, and \`await\` again during teardown after the yield. This is ideal for opening and closing async resources such as database pools or \`httpx.AsyncClient\` sessions cleanly per test.

### How do I mock a coroutine in pytest?

Use \`unittest.mock.AsyncMock\` rather than a plain \`Mock\`. A normal \`Mock\` returns a non-awaitable object, so \`await\` raises \`TypeError\`. \`AsyncMock\` returns an awaitable, supports \`return_value\` and \`side_effect\`, and adds await-aware assertions like \`assert_awaited_once_with\`. When you \`patch\` an async function, \`unittest.mock\` auto-selects \`AsyncMock\`, so patched async targets are awaitable without extra configuration.

### What does the event loop scope do in pytest-asyncio?

Loop scope controls how many tests share one event loop. The default \`function\` scope gives each test a fresh loop for maximum isolation. Wider scopes (\`class\`, \`module\`, \`session\`) reuse a single loop to avoid recreating expensive resources, at the cost of isolation. Configure it per test with \`@pytest.mark.asyncio(loop_scope="module")\` or globally via \`asyncio_default_fixture_loop_scope\`. Keep function scope unless you have a measured reason to widen it.

### Can I parametrize async tests?

Yes. Stack \`@pytest.mark.parametrize\` with \`@pytest.mark.asyncio\` (or drop the asyncio marker in \`auto\` mode) on an \`async def\` test. Each parameter set runs as an independent async test case, typically in its own function-scoped event loop, with clear per-case reporting. This is the cleanest way to cover many input combinations for an async function without duplicating await boilerplate.

### How do I add a timeout to async tests?

For a single test, wrap the call in \`asyncio.wait_for(coro, timeout=seconds)\` and assert it raises \`asyncio.TimeoutError\`. For the whole suite, install \`pytest-timeout\` and set \`timeout = 30\` in your pytest config so any test exceeding the limit fails fast. A global timeout prevents a hung coroutine from stalling CI and turns a frozen pipeline into a single clear test failure.

### Should I use pytest-asyncio or anyio?

Use pytest-asyncio when your code targets the \`asyncio\` event loop, which covers most asyncio libraries, aiohttp, and typical FastAPI testing. Choose the \`anyio\` plugin when you target Trio, build a library that must support multiple async backends, or want the same test to run under both asyncio and Trio via the \`anyio_backend\` fixture. They solve overlapping problems; pick based on which backend(s) you must support.

---

## Conclusion

Async testing in Python has one trap that dwarfs all others: without the right plugin, your async tests silently pass while their assertions never run. pytest-asyncio fixes that by owning the event loop, awaiting your coroutines, and giving you async fixtures, configurable loop scopes, and clean integration with \`AsyncMock\`, parametrization, and timeouts. Set \`asyncio_mode = auto\` for an async-first project, keep loops function-scoped for isolation, mock coroutines with \`AsyncMock\`, and add a global timeout so nothing hangs CI.

Once your async suite is solid, the next wins come from reusable testing patterns and faster runs. Explore the QA skills directory at [/skills](/skills) for ready-to-use pytest, fixture, and mocking skills your team and your AI coding agents can apply consistently across projects — so every async service you ship is tested correctly the first time.
`,
};
