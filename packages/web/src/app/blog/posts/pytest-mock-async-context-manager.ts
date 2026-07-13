import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mock an Async Context Manager in pytest',
  description:
    'Mock an async context manager in pytest with AsyncMock, configure __aenter__ and __aexit__, verify cleanup, and avoid coroutine protocol errors.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Mock an Async Context Manager in pytest

\`async with client.stream(...) as response\` looks like one operation, but Python asks several objects to cooperate. The expression produces an asynchronous context manager, its \`__aenter__\` method is awaited, and the object returned by that method becomes \`response\`. Mock the wrong layer and pytest reports that a coroutine does not support the asynchronous context-manager protocol, often before the assertion you wanted to exercise.

The cure is to model the protocol exactly and patch the name the subject actually resolves. This tutorial uses \`unittest.mock.AsyncMock\` with pytest, \`monkeypatch\`, and the optional \`mocker\` fixture. It covers request clients, database pools, failures during entry and exit, streamed iteration, reusable fixtures, and the warning signs of an incorrectly wired double.

For a broader choice among replacement tools, read the [pytest mock and monkeypatch guide](/blog/pytest-mock-monkeypatch-guide-2026). If event-loop setup is the current obstacle, begin with the [pytest asyncio testing guide](/blog/pytest-asyncio-testing-guide). The examples below assume \`pytest-asyncio\` and mark coroutine tests with \`@pytest.mark.asyncio\`.

## Translate async with Into Five Testable Operations

Take a typical request:

\`\`\`python
async with session.get(url) as response:
    return await response.json()
\`\`\`

Conceptually, Python does this:

1. Calls \`session.get(url)\` and receives a manager.
2. Looks up and awaits \`manager.__aenter__()\`.
3. Binds the enter result to \`response\`.
4. Executes the block.
5. Awaits \`manager.__aexit__(exc_type, exc, traceback)\`.

The manager and entered resource are separate roles. Libraries sometimes use the same object for both, but a test should not assume that. A request method can be synchronous in the narrow Python sense, returning a manager immediately, while methods on the entered response are coroutines.

| Production operation | Appropriate double | Value to configure |
|---|---|---|
| Manager factory called without \`await\` | \`Mock\` or \`MagicMock\` | \`return_value = manager\` |
| Manager entry | \`AsyncMock\` | \`return_value = resource\` |
| Awaited resource method | \`AsyncMock\` | Domain result or \`side_effect\` |
| Synchronous resource method | \`MagicMock\` | Normal return or exception |
| Manager exit | \`AsyncMock\` | Usually \`False\` to propagate errors |

Choose the mock type from consumption syntax, not a method's name. If production says \`await factory()\`, mock an async callable. If it says \`async with factory()\` without an intervening \`await\`, the call must immediately return an object implementing the async context protocol.

## Construct the Manager and Resource Explicitly

The clearest first test creates both objects. This repository borrows a connection from a pool, fetches a row, and depends on exit to release the connection.

\`\`\`python
# app/users.py
class UserRepository:
    def __init__(self, pool):
        self.pool = pool

    async def display_name(self, user_id: int) -> str | None:
        async with self.pool.acquire() as connection:
            row = await connection.fetchrow(
                "SELECT display_name FROM users WHERE id = $1",
                user_id,
            )
        return None if row is None else row["display_name"]


# tests/test_users.py
from unittest.mock import AsyncMock, MagicMock
import pytest

from app.users import UserRepository

@pytest.mark.asyncio
async def test_display_name_uses_and_releases_connection():
    connection = MagicMock()
    connection.fetchrow = AsyncMock(
        return_value={"display_name": "Mina"},
    )

    manager = MagicMock()
    manager.__aenter__ = AsyncMock(return_value=connection)
    manager.__aexit__ = AsyncMock(return_value=False)

    pool = MagicMock()
    pool.acquire.return_value = manager

    result = await UserRepository(pool).display_name(42)

    assert result == "Mina"
    pool.acquire.assert_called_once_with()
    manager.__aenter__.assert_awaited_once_with()
    connection.fetchrow.assert_awaited_once_with(
        "SELECT display_name FROM users WHERE id = $1",
        42,
    )
    manager.__aexit__.assert_awaited_once_with(None, None, None)
\`\`\`

Modern \`MagicMock\` creates suitable asynchronous magic-method children, so assigning explicit \`AsyncMock\` objects is not always required. Doing so keeps the protocol visible and makes await assertions obvious. The important line is \`manager.__aenter__.return_value = connection\`: production uses the entered connection, not the manager.

The false exit result means an exception in the body is not suppressed. Most resource managers follow this rule. Accidentally returning a truthy mock can swallow a production error and make the unit test report an impossible success.

## Mock an HTTP Response at the Entered Layer

An aiohttp-shaped client is a common source of confusion. Its request call returns an async context manager, and the entered response contains both synchronous and asynchronous methods.

\`\`\`python
# app/weather.py
class WeatherClient:
    def __init__(self, session):
        self.session = session

    async def temperature(self, city: str) -> float:
        async with self.session.get(
            "/weather",
            params={"city": city},
        ) as response:
            response.raise_for_status()
            payload = await response.json()
            return float(payload["temperature"])


# tests/test_weather.py
from unittest.mock import AsyncMock, MagicMock
import pytest

from app.weather import WeatherClient

@pytest.mark.asyncio
async def test_temperature_reads_entered_response_json():
    response = MagicMock()
    response.json = AsyncMock(return_value={"temperature": 21.5})

    request_context = MagicMock()
    request_context.__aenter__ = AsyncMock(return_value=response)
    request_context.__aexit__ = AsyncMock(return_value=False)

    session = MagicMock()
    session.get.return_value = request_context

    result = await WeatherClient(session).temperature("Pune")

    assert result == 21.5
    session.get.assert_called_once_with(
        "/weather",
        params={"city": "Pune"},
    )
    response.raise_for_status.assert_called_once_with()
    response.json.assert_awaited_once_with()
\`\`\`

\`session.get\` is intentionally a normal mock here. Changing it to \`AsyncMock\` makes the call return a coroutine, yet the production statement does not await that coroutine before entering it. The resulting protocol error is accurate: a coroutine is awaitable, but it is not automatically an async context manager.

Do not assume every HTTP client has this shape. Some factories are awaited before they yield a manager, and other calls return a response directly. Read the actual signature and production syntax. Mock recipes are only portable when the dependency contracts match.

## Add Specs Without Losing the Async Shape

Unrestricted mocks accept misspelled attributes and invalid arguments. \`connection.fetch_row\` can silently materialize even if the real method is \`fetchrow\`. A spec catches that drift.

\`\`\`python
from typing import Protocol
from unittest.mock import AsyncMock, MagicMock, create_autospec

class Response(Protocol):
    status: int

    def raise_for_status(self) -> None: ...

    async def json(self) -> dict[str, object]: ...

response = create_autospec(Response, instance=True)
response.status = 200
response.json = AsyncMock(return_value={"ok": True})

manager = MagicMock()
manager.__aenter__ = AsyncMock(return_value=response)
manager.__aexit__ = AsyncMock(return_value=False)
\`\`\`

\`create_autospec\` recognizes declared async methods and constrains the interface. A narrow protocol is often easier than specifying a large third-party response class, especially when your adapter consumes only three members.

The protocol itself can drift, so keep type checking and a small integration test against the real dependency. A spec protects attribute names and signatures, not timing, socket behavior, or the fact that a factory returns a manager unless the type captures that fact.

## Patch the Name Resolved by the Subject

Direct imports create a local binding. If \`app.exporter\` does \`from app.storage import open_upload\`, then \`export_report\` resolves \`app.exporter.open_upload\`. Patching \`app.storage.open_upload\` afterward changes the definition module but not the already imported name.

\`\`\`python
# app/exporter.py
from app.storage import open_upload

async def export_report(data: bytes) -> str:
    async with open_upload("report.csv") as upload:
        await upload.write(data)
        return upload.location


# tests/test_exporter.py
from unittest.mock import AsyncMock, MagicMock
import pytest

from app.exporter import export_report

@pytest.mark.asyncio
async def test_export_report(mocker):
    upload = MagicMock(location="s3://reports/report.csv")
    upload.write = AsyncMock()

    manager = MagicMock()
    manager.__aenter__ = AsyncMock(return_value=upload)
    manager.__aexit__ = AsyncMock(return_value=False)

    factory = mocker.patch(
        "app.exporter.open_upload",
        return_value=manager,
    )

    result = await export_report(b"id,total\\n1,25\\n")

    assert result == "s3://reports/report.csv"
    factory.assert_called_once_with("report.csv")
    upload.write.assert_awaited_once_with(b"id,total\\n1,25\\n")
    manager.__aexit__.assert_awaited_once_with(None, None, None)
\`\`\`

The \`mocker\` fixture is supplied by pytest-mock. Standard pytest can do the same with \`monkeypatch.setattr(exporter_module, "open_upload", replacement)\`. Both restore state after the test. Correct lookup location matters more than which fixture performs the replacement.

## Test Body Exceptions and Exit Semantics

Cleanup is a core behavior of context managers. When the body raises, Python calls \`__aexit__\` with the exception class, the instance, and its traceback. A false return allows the error to continue.

\`\`\`python
from unittest.mock import ANY, AsyncMock, MagicMock
import pytest

@pytest.mark.asyncio
async def test_database_error_propagates_after_exit():
    failure = RuntimeError("database disconnected")
    connection = MagicMock()
    connection.fetchrow = AsyncMock(side_effect=failure)

    manager = MagicMock()
    manager.__aenter__ = AsyncMock(return_value=connection)
    manager.__aexit__ = AsyncMock(return_value=False)

    pool = MagicMock()
    pool.acquire.return_value = manager

    with pytest.raises(RuntimeError, match="database disconnected"):
        await UserRepository(pool).display_name(42)

    manager.__aexit__.assert_awaited_once_with(
        RuntimeError,
        failure,
        ANY,
    )
\`\`\`

Test entry failure separately by assigning \`manager.__aenter__.side_effect\`. When entry raises, the body does not run and that manager's \`__aexit__\` is not called because entry never completed. Test exit failure by assigning a side effect to \`__aexit__\`; the cleanup error should be visible according to the real contract.

| Failure location | Setup | Lifecycle assertion |
|---|---|---|
| Factory | Factory \`side_effect\` | Neither enter nor exit awaited |
| \`__aenter__\` | Enter \`side_effect\` | Body unused and exit not awaited |
| Body method | Resource method \`side_effect\` | Exit receives exception triple |
| \`__aexit__\` | Exit \`side_effect\` | Cleanup failure propagates |
| Deliberate suppression | Exit returns \`True\` | Body error does not escape |

Configure truthy suppression only when the real manager promises it. Using \`True\` to simplify a test can conceal exactly the error-handling behavior the context manager exists to control.

## Combine Context Management With Async Iteration

Streaming responses often implement two protocols. They are entered with \`async with\`, then consumed with \`async for\`. Model entry and iteration independently.

\`\`\`python
# app/lines.py
async def collect_lines(client) -> list[str]:
    values = []
    async with client.open_lines() as response:
        async for chunk in response:
            values.append(chunk.decode().strip())
    return values


# tests/test_lines.py
from unittest.mock import AsyncMock, MagicMock
import pytest

@pytest.mark.asyncio
async def test_collects_stream_chunks():
    response = MagicMock()
    response.__aiter__.return_value = [b"alpha\\n", b"beta\\n"]

    manager = MagicMock()
    manager.__aenter__ = AsyncMock(return_value=response)
    manager.__aexit__ = AsyncMock(return_value=False)

    client = MagicMock()
    client.open_lines.return_value = manager

    assert await collect_lines(client) == ["alpha", "beta"]
    manager.__aenter__.assert_awaited_once_with()
    manager.__aexit__.assert_awaited_once_with(None, None, None)
\`\`\`

An ordinary list works as \`__aiter__.return_value\` for this finite case. When chunk timing, cancellation, or a mid-stream error matters, write a small async generator. A fake generator communicates temporal behavior more clearly than a deeply nested chain of \`side_effect\` values.

## Reuse Setup With a Transparent Fixture

A factory fixture can remove protocol noise while still returning both important objects by name.

\`\`\`python
# tests/conftest.py
from dataclasses import dataclass
from unittest.mock import AsyncMock, MagicMock
import pytest

@dataclass
class AsyncContextDouble:
    manager: MagicMock
    resource: MagicMock

@pytest.fixture
def async_context_double():
    def build(resource=None, *, suppress=False):
        entered = resource or MagicMock()
        manager = MagicMock()
        manager.__aenter__ = AsyncMock(return_value=entered)
        manager.__aexit__ = AsyncMock(return_value=suppress)
        return AsyncContextDouble(manager, entered)

    return build
\`\`\`

Tests can set \`dependency.open.return_value = double.manager\`, configure domain behavior on \`double.resource\`, and assert entry or exit directly. Avoid turning the fixture into a universal matrix of payload, exception, timing, status, and retry options. Once behavior becomes stateful, a purpose-built fake class is usually easier to understand.

A fake is particularly valuable for transactions and locks. It can reject use before entry, record commit or rollback, and disallow double exit. Mocks verify selected calls, while a fake can enforce valid transitions naturally.

## Diagnose Protocol Errors From Their Exact Wording

Python's errors are strong wiring clues when read literally.

| Symptom | Probable mismatch | Repair |
|---|---|---|
| Coroutine lacks async context protocol | Async callable used where immediate manager is required | Normal mock returning manager |
| Entered value is an unexplained mock | Enter return was never configured | Set \`__aenter__.return_value\` |
| Awaited method yields another mock | Resource coroutine has no result | Set its \`return_value\` |
| Patched factory is never called | Wrong import location patched | Patch subject module binding |
| Expected exception vanishes | Exit result is truthy | Return \`False\` unless suppression is real |
| Object cannot be used in await expression | Normal mock replaced awaited callable | Use \`AsyncMock\` there |

Never suppress “coroutine was never awaited” warnings to make the suite clean. They often reveal that a normal manager factory was replaced with an \`AsyncMock\`, or production forgot an await. Treat runtime warnings as failures in CI so protocol mistakes cannot pass behind otherwise green assertions.

Verify interactions that express the boundary: correct factory arguments, entry, meaningful resource calls, and cleanup. Avoid asserting every child-mock access. The public value or exception remains the primary outcome, and over-specified implementation calls make harmless refactoring unnecessarily expensive.

## When a Real Lightweight Resource Is Better

An async context manager frequently protects a valuable integration boundary: transaction, response stream, temporary file, lock, or message. A unit double is fast and precise, but it cannot prove that a driver actually commits, closes sockets, returns pool slots, or handles cancellation correctly.

Keep protocol-focused unit tests for branching and error mapping. Add a smaller integration layer using the real library against a disposable service or in-memory implementation where one exists. Test cancellation and timeouts with the real event loop because mock call assertions do not reproduce scheduler and transport behavior.

The split should be intentional. Unit tests answer whether your adapter requests and reacts correctly. Integration tests answer whether your understanding of the dependency's context protocol is accurate. Both are needed when cleanup failure could leak scarce resources.

Cancellation deserves its own integration case. A task can be cancelled while the body awaits network or database work, and the manager still needs an opportunity to release its resource. A configured \`AsyncMock\` can prove that your function does not catch \`CancelledError\` incorrectly, but only the real driver can demonstrate that cancellation returns the connection or closes the response under its event-loop implementation.

Nested contexts require separate managers. For \`async with transaction(), lock():\`, configure and assert each entry and exit rather than reusing one double. Python exits in reverse order, so a focused test can record side effects and verify that the lock releases before the transaction finishes if this ordering is significant. Reusing one manager hides identity errors and produces call histories that cannot explain which resource failed.

When a function returns from inside the block, \`__aexit__\` still runs before the caller receives the value. Test the public result and the awaited exit. The same applies to \`break\` and \`continue\` in loops. Context management is structured cleanup, not merely a wrapper around the last statement.

Async generator context managers created with \`contextlib.asynccontextmanager\` have the same consumer protocol but different implementation mechanics. Mock the factory's returned manager at the adapter boundary, or test a small decorated fake directly. Avoid patching the generator's internal \`asend\` or \`athrow\` calls, because those are implementation details of the standard library rather than your application's contract.

Finally, keep test doubles local to the boundary they represent. A response fixture should not also impersonate the session, manager, retry policy, and parser. Named objects make failure output legible: factory, manager, entered resource, and awaited operation. That modest verbosity pays for itself the first time an upgrade changes one layer from synchronous return to awaited creation.

## Frequently Asked Questions

### Why does AsyncMock fail when used directly with async with?

Calling an \`AsyncMock\` returns a coroutine. If production does not await that call before \`async with\`, it needs an immediate context-manager object instead. Use a normal callable mock whose return value has async enter and exit methods.

### What should mocked __aenter__ return?

Return the object named after \`as\` in production, such as a response, connection, transaction, or lock. Configure the domain methods on that resource rather than assuming the manager itself is used inside the block.

### Should __aexit__ return True or False in a pytest double?

Return \`False\` for the usual behavior where exceptions propagate. Return \`True\` only if the real manager deliberately suppresses the relevant exception and the test is checking that documented behavior.

### Can I mock this protocol with monkeypatch and no pytest-mock plugin?

Yes. Build the manager and resource with standard-library \`MagicMock\` and \`AsyncMock\`, then replace the lookup name through \`monkeypatch.setattr\`. Pytest-mock is convenient, but it is not required.

### When should I replace AsyncMock with a fake context manager?

Choose a fake when entry, exit, retry, streaming, or transaction behavior has meaningful state and ordering. A small class implementing the two async magic methods can express invalid transitions more clearly than a large tree of configured child mocks.
`,
};
