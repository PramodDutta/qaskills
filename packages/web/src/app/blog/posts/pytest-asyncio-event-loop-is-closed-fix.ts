import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'pytest-asyncio “Event Loop Is Closed” Fix',
  description:
    'Fix pytest-asyncio Event Loop Is Closed errors by aligning async fixture scope, loop scope, client lifetime, teardown order, and modern plugin configuration.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# pytest-asyncio “Event Loop Is Closed” Fix

The assertion passed. The exception appeared during teardown, when an async database pool tried to close a transport owned by a loop pytest had already discarded. That timing is the clue: “Event loop is closed” is usually a lifetime mismatch, not a reason to sprinkle new loops through the test suite.

Modern pytest-asyncio distinguishes the scope of an asynchronous fixture’s cached value from the scope of the event loop in which it runs. The safe rule is simple: an async resource must be created, used, and closed on a compatible loop whose lifetime covers the resource. Clients that bind to a loop must not escape into tests running on other loops.

## Identify which object outlived its loop

Start from the complete traceback. The last frame mentioning \`BaseEventLoop._check_closed\` is generic. Move upward until the stack reaches your code or a concrete client: an \`aiohttp.ClientSession\`, SQLAlchemy async engine, asyncpg pool, gRPC channel, Redis client, or custom background task.

Capture the lifecycle facts before editing configuration:

| Question | Evidence to collect | Typical mismatch |
|---|---|---|
| Where is the resource created? | Fixture name and decorator | Session fixture creates loop-bound client |
| Which loop creates it? | \`id(asyncio.get_running_loop())\` | Setup loop differs from test loop |
| Where is it first used? | Failing test and marker | Function test uses module-scoped client |
| Where is it closed? | Fixture code after \`yield\` | Finalizer runs after owning loop closes |
| Does it start background tasks? | Pending-task warnings, client docs | Task remains scheduled past teardown |
| Is pytest-asyncio mode explicit? | pytest configuration | Async fixture handled by unexpected plugin |

Do not create a replacement loop inside teardown. A connection created on loop A cannot necessarily be closed correctly on newly created loop B. The fix is to align ownership, not merely produce an open loop at the point of failure.

## The safest default is function scope

Function-scoped async fixtures naturally share a function-scoped loop with each async test. They cost more setup time than a session-scoped pool, but their lifecycle is easy to reason about and they isolate state well.

This example uses the current \`pytest_asyncio.fixture\` decorator and an actual \`aiohttp.ClientSession\`. The session is constructed and closed inside the same fixture invocation.

\`\`\`python
# conftest.py
import aiohttp
import pytest
import pytest_asyncio

@pytest_asyncio.fixture
async def api_client():
    timeout = aiohttp.ClientTimeout(total=5)
    async with aiohttp.ClientSession(
        base_url="http://127.0.0.1:8080",
        timeout=timeout,
    ) as session:
        yield session

@pytest.mark.asyncio
async def test_health_endpoint(api_client: aiohttp.ClientSession):
    async with api_client.get("/health") as response:
        assert response.status == 200
        assert await response.json() == {"status": "ok"}
\`\`\`

The context manager closes the connector before the fixture finishes. pytest-asyncio then closes the function loop. That order prevents the resource from trying to schedule cleanup on a dead loop.

If this version works while a module or session version fails, you have confirmed a scope problem. Decide whether the performance gain of sharing the resource justifies a wider loop.

## Fixture scope and loop scope are separate

The fixture’s \`scope\` determines how often pytest creates and caches its value. The fixture’s \`loop_scope\` determines the event loop used to execute it. pytest-asyncio supports \`function\`, \`class\`, \`module\`, \`package\`, and \`session\` loop scopes.

An async fixture cannot be cached longer than the loop that owns it. For a module-scoped client, make both scopes module-level and run consuming tests on the same module loop.

\`\`\`python
# test_catalog.py
import aiohttp
import pytest
import pytest_asyncio

pytestmark = pytest.mark.asyncio(loop_scope="module")

@pytest_asyncio.fixture(scope="module", loop_scope="module")
async def catalog_client():
    session = aiohttp.ClientSession(base_url="http://127.0.0.1:8080")
    try:
        yield session
    finally:
        await session.close()

async def test_product_exists(catalog_client: aiohttp.ClientSession):
    async with catalog_client.get("/products/sku-42") as response:
        assert response.status == 200

async def test_unknown_product_is_404(catalog_client: aiohttp.ClientSession):
    async with catalog_client.get("/products/missing") as response:
        assert response.status == 404
\`\`\`

The module-level \`pytestmark\` applies the same asyncio loop scope to the tests. The fixture setup, both tests, and fixture finalizer operate within the module-scoped loop.

Do not widen loop scope merely to silence the exception. Shared loops also share context that a test might accidentally leak: tasks, context variables, callbacks, and loop-level state. Use the narrowest lifetime that meets the resource requirement.

## Configure defaults explicitly

pytest-asyncio exposes two distinct configuration options: \`asyncio_default_fixture_loop_scope\` and \`asyncio_default_test_loop_scope\`. The stable documentation lists the same five scopes for each. Test loop scope defaults to function when unset. Fixture behavior has changed across versions, so explicit project configuration removes ambiguity during upgrades.

\`\`\`toml
# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
asyncio_default_test_loop_scope = "function"
\`\`\`

\`auto\` mode lets pytest-asyncio take ownership of async tests and fixtures, including async fixtures declared with \`@pytest.fixture\`. \`strict\` mode requires explicit pytest-asyncio handling and is useful when multiple async frameworks coexist. Pick one intentionally. If your project uses pytest-trio or another async plugin, strict ownership boundaries can prevent plugin conflicts.

The [pytest-asyncio testing guide](/blog/pytest-asyncio-testing-guide) covers installation and async test patterns beyond this lifecycle failure.

## Stop overriding event_loop as a first response

Older recipes often define a custom \`event_loop\` fixture that creates a session-scoped loop. Those recipes targeted earlier pytest-asyncio behavior and can conflict with current loop-scope configuration. Copying one into a modern suite may produce deprecation warnings, multiple competing loops, or subtle teardown ordering.

Before keeping a custom event loop fixture, verify that the installed pytest-asyncio version actually requires it for your use case. Most suites should express scope through \`loop_scope\` markers, fixture decorators, and configuration. Delete obsolete local overrides in a controlled change, then run the suite with warnings visible.

| Proposed “fix” | Why it appears to work | Why it is risky |
|---|---|---|
| Create a new loop in teardown | The immediate closed-loop check stops | Cleanup runs on a loop that does not own the transport |
| Make every loop session-scoped | Nothing closes until suite end | Leaked tasks and state contaminate unrelated tests |
| Catch and ignore \`RuntimeError\` | Teardown becomes green | Connections and tasks may remain unclosed |
| Remove \`await client.close()\` | No cleanup call hits the loop | Resource leak moves outside visible test output |
| Add arbitrary sleep | Some callbacks finish before teardown | Timing remains nondeterministic and slow |
| Align fixture and test loop scopes | Ownership is explicit | Correct approach, with deliberate isolation tradeoff |

Warnings such as “Task was destroyed but it is pending” are not harmless cleanup noise. They indicate work escaped its expected lifetime and may explain intermittent failures later in the suite.

## Async generator teardown must stay on the owning loop

An async fixture with \`yield\` has setup before the yield and teardown afterward. Both portions need a live compatible loop. Nested resource order also matters: close consumers before providers.

For a database stack, the typical order is:

1. stop background workers that use repositories;
2. close HTTP or RPC clients that may issue requests;
3. dispose sessions or transaction managers;
4. close the database pool or async engine;
5. allow pytest-asyncio to close the loop.

Use nested \`async with\` blocks or explicit \`try/finally\` to make that order visible. Avoid registering unrelated synchronous finalizers that call \`asyncio.run()\`; \`asyncio.run()\` creates and closes its own loop and cannot safely adopt resources created elsewhere.

## A realistic asyncpg fixture repair

Connection pools make the mismatch visible because connections and protocol transports are loop-bound. The following session is deliberately function-scoped. A transaction is rolled back before the connection returns to the pool, and the pool closes before the fixture’s loop ends.

\`\`\`python
import asyncpg
import pytest_asyncio

@pytest_asyncio.fixture
async def database():
    pool = await asyncpg.create_pool(
        dsn="postgresql://postgres:postgres@127.0.0.1:5432/app_test",
        min_size=1,
        max_size=2,
    )
    try:
        yield pool
    finally:
        await pool.close()

@pytest_asyncio.fixture
async def db_connection(database: asyncpg.Pool):
    async with database.acquire() as connection:
        transaction = connection.transaction()
        await transaction.start()
        try:
            yield connection
        finally:
            await transaction.rollback()
\`\`\`

If container startup is expensive, keep the container process session-scoped while making loop-bound clients function-scoped. A Docker container is an external process and does not have to share the lifetime of the async connection pool. Separate expensive infrastructure lifetime from async client lifetime.

That hybrid is often better than a session-scoped async client: start PostgreSQL once using a synchronous fixture, create a fresh asyncpg pool per test or module on the relevant loop, then close it promptly.

## Background tasks require cooperative shutdown

A fixture may create a task with \`asyncio.create_task()\` for a fake consumer, server, or heartbeat. Canceling the task is not enough. Await it so the cancellation is delivered and its \`finally\` block runs.

\`\`\`python
import asyncio
from contextlib import suppress
import pytest_asyncio

async def consume(queue: asyncio.Queue[str]) -> None:
    while True:
        message = await queue.get()
        try:
            await asyncio.sleep(0)
            print(message)
        finally:
            queue.task_done()

@pytest_asyncio.fixture
async def consumer():
    queue: asyncio.Queue[str] = asyncio.Queue()
    task = asyncio.create_task(consume(queue))
    try:
        yield queue
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task
\`\`\`

If the worker owns additional async clients, close them within its own cleanup before awaiting task completion. Enable asyncio debug mode while diagnosing. It provides more visibility into slow callbacks, un-awaited coroutines, and resource allocation sites, though it may slow the suite.

## Parametrization can expose hidden cross-loop caching

A Python module global, \`functools.cache\`, dependency-injection singleton, or SDK client created at import time can survive across multiple pytest loops. The first parameterized test initializes it on loop A; the next test gets loop B and reuses the old client.

Search for client constructors outside fixtures. Import-time async clients are especially suspect. Move creation behind a fixture or application lifespan function, and ensure shutdown clears the cached reference. If the application framework has startup and shutdown hooks, run both inside the test’s loop rather than instantiating only part of the app.

The problem may appear only in the full suite because an earlier module creates the singleton. Run tests in both orders, then use \`pytest --setup-show\` to see fixture setup and teardown. The [pytest fixture scope guide](/blog/pytest-fixtures-scope-complete-guide) provides deeper coverage of caching and dependency order.

## Diagnose with loop identity, then remove the logging

Temporary logging can prove the mismatch:

\`\`\`python
import asyncio

def loop_identity(label: str) -> None:
    loop = asyncio.get_running_loop()
    print(label, id(loop), loop.is_closed())
\`\`\`

Call it during fixture setup, the test, and fixture teardown. If the IDs differ for a loop-bound shared resource, align scopes. If teardown never reaches the log, inspect an earlier fixture failure or plugin conflict. Remove identity-based assertions afterward because object IDs are diagnostics, not a behavioral contract.

Run one failing test, its module, and the full suite. A single-test pass plus full-suite failure suggests leaked global state or teardown interference. A failure only under xdist may indicate process-level resource sharing, fixed ports, or a singleton outside worker isolation rather than an asyncio loop issue alone.

## Upgrade without mixing eras of pytest-asyncio advice

Read documentation matching the installed version. The plugin has evolved around loop fixtures, default fixture loop scope, markers, and configuration. Pin pytest and pytest-asyncio together, treat deprecation warnings as migration tasks, and avoid a configuration assembled from several historical Stack Overflow answers.

A safe migration sequence is: record current versions, enable warnings, remove unused custom loop fixtures, set explicit default scopes, convert async fixtures to the supported decorator for your mode, align wider fixtures and tests with \`loop_scope\`, then run teardown-heavy integration suites repeatedly.

## Run application lifespan on the pytest loop

ASGI applications often create pools, clients, and background tasks during startup and close them during shutdown. Constructing the app object is not equivalent to running its lifespan. A test client that skips startup can lazily create a resource in the first request, while teardown occurs in a different fixture or loop.

Use the framework’s supported lifespan-aware test setup and keep the application, transport, and client in nested async contexts. The outer fixture should not close before its dependent client. If a session-scoped app owns an async engine, its consuming tests must share the compatible loop or the engine must move to a narrower fixture.

Watch dependency injection overrides. A test may replace the database provider but leave a cached production client created during an earlier lifespan. Clear overrides and application caches during teardown. Full-suite-only failures frequently come from one module leaving those globals behind.

## Distinguish loop closure from executor shutdown

Async libraries may delegate DNS, file work, or CPU-bound functions to an executor. Calling \`loop.shutdown_default_executor()\` or closing a manually owned executor while tasks still reference it can surface near the same teardown boundary. The traceback may say the executor is shut down rather than the loop is closed, but both indicate incorrect ownership order.

Let pytest-asyncio manage its loop. If the fixture creates a \`ThreadPoolExecutor\`, stop producers, await submitted futures, and shut the executor down inside the fixture before its loop ends. Do not shut down the loop’s default executor from one test because other fixtures on a wider loop may still need it.

Subprocess transports have similar requirements. Await process completion, drain required output, and close pipes before teardown. Killing a child without awaiting \`wait()\` can leave callbacks pending on the loop.

## Audit async clients created by synchronous fixtures

A synchronous fixture can return an object that creates async state later. Its decorator looks harmless, but the first test call binds an internal pool or lock to that test’s loop. When pytest caches the object at module or session scope, the next test uses it on a different loop.

Inspect lazy clients as carefully as clients constructed with \`await\`. If an object exposes async \`close\`, starts a connector on first request, or contains an \`asyncio.Lock\`, treat it as loop-bound unless its documentation guarantees otherwise. Move it into an async fixture with explicit teardown.

This applies to service singletons inside the application too. A factory cached with \`@lru_cache\` may return the same lazy SDK client for the entire test process. Clear the cache after shutdown or change the application composition so test lifespan owns the instance.

## Turn the repair into a regression check

Once scopes are aligned, run the affected test module repeatedly and in randomized order. Enable warnings as errors for unclosed sessions and resources where practical. An assertion only on functional output will not catch cleanup regression if the library emits a warning instead of raising.

Avoid asserting the numeric loop identity. The durable contract is that setup, use, and teardown complete without pending tasks, unclosed-resource warnings, or cross-loop errors. Keep one integration test that exercises shutdown after a real request because setup-only smoke tests will not initialize lazy transports.

In CI, preserve full teardown tracebacks and avoid truncating the warning summary. The line after the test result often contains the only evidence pointing to the leaked client.

## Frequently Asked Questions

### Why does Event Loop Is Closed appear after a test passes?

Async fixture teardown occurs after the test body. A client or task may attempt cleanup after its owning loop has already closed, so assertions pass and the lifecycle error appears later.

### Can a session-scoped async fixture use function-scoped test loops?

Not safely for a loop-bound resource unless all consumers run on a compatible wider loop. Give the fixture and tests an aligned session loop scope, or keep the async client function-scoped while sharing only external infrastructure.

### Should I call asyncio.run inside a pytest fixture finalizer?

No for resources created by another running loop. \`asyncio.run()\` creates a separate loop, runs the coroutine, and closes that loop. Keep async teardown inside an async fixture managed by pytest-asyncio.

### What does asyncio_mode strict change in this diagnosis?

Strict mode makes pytest-asyncio handle explicitly marked async tests and its own async fixtures, which helps coexistence with other async plugins. It does not repair mismatched lifetimes. You still must align resource, fixture, and loop scopes.

### Why does the error occur only in the entire suite?

A cached client, leaked task, or module global may be created on an earlier test’s loop and reused later. Fixture ordering and plugin interactions can also differ. Inspect globals, run with setup reporting, and compare loop identities temporarily.
`,
};
