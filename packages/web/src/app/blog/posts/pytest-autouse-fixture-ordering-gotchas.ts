import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "pytest Autouse Fixture Ordering Gotchas",
  description:
    "Master pytest autouse fixture ordering through explicit dependency graphs, scope rules, teardown behavior, and diagnostics that prevent hidden setup races.",
  date: "2026-07-13",
  category: "Guide",
  content: `
# pytest Autouse Fixture Ordering Gotchas

Move an autouse fixture ten lines upward and pytest may continue to run it in exactly the same place. Rename it to start with \`aaa_\` and nothing reliable changes. Fixture execution is a dependency graph, not a reading order, and autouse adds edges that are easy to overlook.

The practical consequence is serious: a database cleanup can run after data creation, a clock patch can happen after importing the subject, or a transaction can close before another fixture finishes teardown. These failures often appear only when a new fixture makes an under-specified graph ambiguous. The fix is not more careful file arrangement. The fix is to express causality as fixture dependencies.

## The three inputs pytest uses for ordering

For a test request, pytest determines which fixtures are reachable and orders them using scope, dependencies, and autouse. Higher-scoped fixtures execute before lower-scoped fixtures. A fixture executes after the fixtures it requests. Autouse fixtures execute before non-autouse fixtures within the scope where they apply.

Names, definition order, parameter order in the test, and which file visually comes first are not ordering contracts. They may appear stable until the graph changes.

| Ordering signal | Reliable meaning | Common misconception |
|---|---|---|
| Scope | Required higher-scope setup precedes lower-scope setup | Session scope always precedes every unrelated action globally |
| Dependency | Requested fixture must be ready before requester starts | Listing fixtures in a test signature creates left-to-right order |
| Autouse | Applicable autouse fixtures are lifted before peers in their scope | Alphabetical fixture name decides priority |
| Source position | No supported ordering promise | Moving a fixture earlier makes it execute earlier |

Scope is evaluated in the context of a test. A session fixture is instantiated before a function fixture needed by that test, but pytest does not eagerly create every session fixture at collection time. Unused fixtures remain unused.

## Autouse creates effective autouse dependencies

Suppose an autouse fixture requests a normal fixture. For tests where the autouse fixture applies, that dependency is effectively autouse too. It moves with the autouse branch ahead of non-autouse peers. Outside that visibility context, the dependency remains ordinary.

\`\`\`python
import pytest


@pytest.fixture
def events():
    return []


@pytest.fixture
def database(events):
    events.append("database")
    return object()


@pytest.fixture(autouse=True)
def begin_transaction(database, events):
    events.append("transaction")


@pytest.fixture
def user(events):
    events.append("user")
    return {"id": 7}


def test_order(events, user):
    assert events == ["database", "transaction", "user"]
\`\`\`

\`database\` is not declared autouse, yet it executes for this test because \`begin_transaction\` requests it. It also precedes \`user\`, because it belongs to the applicable autouse dependency chain. The test does not need to name \`begin_transaction\` or \`database\`.

This behavior is contextual. If a class-local autouse fixture requests \`database\`, tests outside the class do not suddenly acquire a global database dependency. Visibility and scope determine where the autouse relationship applies.

## Same-scope autouse fixtures still need edges

Two function-scoped autouse fixtures may both be applicable, but if neither requests the other, their relative order is not specified by intent. If one must precede the other, make the later fixture request the earlier one.

\`\`\`python
import os
import pytest


@pytest.fixture(autouse=True)
def fixed_timezone(monkeypatch):
    monkeypatch.setenv("TZ", "UTC")


@pytest.fixture(autouse=True)
def configured_app(fixed_timezone):
    # The parameter is the ordering edge, even though its value is unused.
    from myapp.factory import create_app

    app = create_app()
    yield app
    app.close()


def test_health(configured_app):
    response = configured_app.test_client().get("/health")
    assert response.status_code == 200
\`\`\`

The dependency documents why environment setup must precede application construction. A comment alone cannot constrain the scheduler. Importing the application inside the dependent fixture also prevents module import from occurring before the patch.

If almost every test uses \`configured_app\` explicitly, consider removing \`autouse=True\`. Explicit fixture requests make cost and behavior visible. Autouse is strongest for invariant isolation such as resetting global state, rejecting real network calls, or wrapping every database test in a rollback.

## Scope can override the order you imagined

A function-scoped fixture cannot be requested by a session-scoped fixture. Pytest raises \`ScopeMismatch\` because the shorter-lived value cannot safely support the longer-lived consumer. This is not an ordering puzzle to bypass; it exposes a lifecycle design error.

| Consumer fixture | Dependency fixture | Valid? | Reason |
|---|---|---:|---|
| Function | Session | Yes | Long-lived resource can support one test |
| Module | Session | Yes | Session value outlives module consumer |
| Session | Function | No | Function value would expire while consumer remains cached |
| Class | Function | No | A per-test value cannot back one cached class fixture |
| Function | Function | Yes | Dependency edge determines setup order |

When a session resource needs per-test cleanup, separate resource creation from isolation. Create the connection pool at session scope and start a transaction at function scope. Do not make the session fixture depend on the transaction.

\`\`\`python
@pytest.fixture(scope="session")
def engine():
    engine = create_engine(os.environ["TEST_DATABASE_URL"])
    yield engine
    engine.dispose()


@pytest.fixture
def db_connection(engine):
    connection = engine.connect()
    transaction = connection.begin()
    yield connection
    transaction.rollback()
    connection.close()


@pytest.fixture(autouse=True)
def clean_database(request):
    marker = request.node.get_closest_marker("db")
    if marker is None:
        yield
        return

    connection = request.getfixturevalue("db_connection")
    yield connection
\`\`\`

The conditional lookup avoids opening a database for tests without the \`db\` marker. Dynamic fixture retrieval is useful here, but it hides dependencies from static reading. Prefer an explicit fixture or \`usefixtures\` marker when the suite can tolerate that verbosity.

## Setup order reverses during teardown

Yield fixtures execute setup before \`yield\` and teardown afterward. Teardown follows last-in, first-out order along the dependency chain. If \`web_server\` depends on \`database\`, the server tears down before the database. That is usually exactly what resource ownership requires.

\`\`\`python
@pytest.fixture
def database():
    db = Database.start()
    yield db
    db.stop()


@pytest.fixture(autouse=True)
def web_server(database):
    server = Server.start(database_url=database.url)
    yield server
    server.stop()


def test_status(web_server):
    assert requests.get(f"{web_server.url}/status").status_code == 200
\`\`\`

This graph guarantees \`server.stop()\` before \`db.stop()\`. Independent autouse fixtures do not express such a teardown relationship. If cleanup order matters, setup dependencies should mirror ownership.

Failures before \`yield\` require care. If a fixture acquires resource A, fails while acquiring B, and never reaches \`yield\`, its post-yield cleanup does not run. Keep each fixture responsible for one state-changing acquisition, or use \`request.addfinalizer\` immediately after acquiring a resource. Smaller fixtures also produce a clearer dependency graph.

## Directory visibility changes which autouse fixtures apply

An autouse fixture in a \`conftest.py\` applies to tests in that directory subtree that can see it. A module-local autouse fixture applies within the module. A class-local one applies to tests in that class. Plugin autouse fixtures can reach every test project using the plugin, so they warrant extreme restraint.

Imagine this layout:

\`\`\`text
tests/
  conftest.py              # blocks external HTTP for all tests
  unit/
    conftest.py            # resets in-memory registry
    test_parser.py
  integration/
    conftest.py            # starts transaction for this subtree
    test_orders.py
\`\`\`

\`test_parser.py\` receives the root and unit autouse fixtures, not the integration transaction. Moving a test file between directories can therefore change its implicit setup without changing the test body. Code review should treat test relocation as a fixture-boundary change.

The [pytest conftest guide](/blog/pytest-fixtures-conftest-complete-guide-2026) explains discovery boundaries in detail. For lifecycle selection beyond autouse, see the [fixture scope guide](/blog/pytest-fixtures-scope-complete-guide).

## Parametrization multiplies hidden work

A function-scoped autouse fixture runs once for every test invocation, including every parameter combination. A test parametrized across twenty inputs triggers an expensive autouse service setup twenty times. If the service can be session-scoped, split it from per-case reset logic. If only some parameters need it, autouse is likely the wrong mechanism.

An autouse fixture can itself be parametrized, which implicitly parametrizes every test in its visibility scope. This can be powerful for running a subtree against two backends, but it can also double a suite without an obvious marker in test signatures. Use explicit IDs and confine the fixture to a narrow directory.

Indirect parametrization does not change the ordering rules. The selected fixture instance still participates according to scope and dependencies. What changes is how many dependency graphs pytest instantiates.

## Diagnosing an order surprise

Start with \`pytest --setup-show\`. It prints fixture setup and teardown activity with scope, giving a concrete execution trace. \`pytest --fixtures-per-test path::test_name\` lists fixtures used by a selected test, including implicit autouse fixtures. These commands are more reliable than adding print statements that may be captured or interleaved under parallel execution.

\`\`\`bash
pytest --setup-show tests/integration/test_orders.py::test_cancel
pytest --fixtures-per-test tests/integration/test_orders.py::test_cancel
\`\`\`

Then draw the dependency chain for the surprising fixtures. Mark scope and visibility. Look for two nodes whose relative order matters but have no edge. Add a dependency in the fixture that logically consumes the earlier state. Do not add an arbitrary shared fixture merely to force an order, because a false dependency obscures ownership.

If xdist is involved, remember that fixture ordering is local to a worker process. A session-scoped fixture normally runs once per worker, not once across the entire distributed test session. Cross-worker coordination needs a lock, external provisioner, or xdist-aware design. Reordering fixtures cannot solve shared-port or shared-database races between processes.

## Patterns that keep autouse honest

Use autouse for cheap invariants with broad applicability. Examples include restoring environment variables through \`monkeypatch\`, preventing accidental production HTTP, clearing a process-local cache, or ensuring a transaction rollback. A fixture that creates business objects, starts a browser, or provisions cloud infrastructure should usually be requested explicitly.

Name an autouse fixture after its effect, not its implementation: \`deny_external_network\` communicates more than \`setup_mock\`. Keep its dependency list visible in the signature. Return a value only if tests legitimately inspect it; otherwise yield without encouraging explicit coupling to a hidden fixture.

Markers can make conditional autouse behavior discoverable, but inverted conditions are dangerous. A fixture that silently skips cleanup for an unmarked test can leak state. Prefer opt-in expensive setup and unconditional cheap cleanup. Document root-level autouse fixtures in the test suite's contributor guide.

## \`usefixtures\` changes selection, not dependency order

\`@pytest.mark.usefixtures('audit_log')\` requests a fixture without adding it to the test function's arguments. It is useful when the test needs the side effect but not the value. It does not create a special ordering tier. The requested fixture still participates through scope and dependencies.

\`\`\`python
@pytest.fixture
def audit_log(database):
    database.enable_audit()
    yield
    database.disable_audit()


@pytest.mark.usefixtures("audit_log")
class TestAdminMutations:
    def test_delete_user(self, admin_client):
        assert admin_client.delete("/users/17").status_code == 204
\`\`\`

If \`admin_client\` must start after audit is enabled, make it depend on \`audit_log\`. The class marker alone only ensures both are selected. Treating marker order as execution order recreates the same hidden graph problem.

An ini-level \`usefixtures\` setting applies broadly and resembles autouse from a reader's perspective. Reserve it for unmistakable global invariants, and document it because no test signature or decorator reveals the fixture.

## Overrides can replace an autouse node silently

Pytest permits a fixture in a nearer \`conftest.py\` or test module to override one with the same name. If a root autouse fixture named \`environment\` is overridden in a subpackage, tests there use the replacement. The override is not automatically composed with the parent.

This is useful for changing a backend in one subtree, but dangerous for isolation fixtures. A local \`no_network\` fixture that forgets \`autouse=True\` can shadow the root name while removing automatic protection. Use distinctive names for safety invariants and review \`--fixtures-per-test\` output after overrides.

Where composition is intended, the overriding fixture can request the parent fixture name in supported pytest override patterns, but the resolution rules can be hard to teach. An explicitly named base fixture such as \`base_environment\` often communicates the chain better.

## Teardown failures and partial setup need targeted tests

When an autouse teardown raises, the test may have passed but the node is reported as an error. A second teardown still needs a chance to run. Pytest manages finalizers individually, while multiple cleanup statements after one \`yield\` can stop at the first exception unless wrapped carefully.

\`\`\`python
@pytest.fixture(autouse=True)
def isolate_services(request):
    cache = start_cache()
    request.addfinalizer(cache.stop)

    broker = start_broker()
    request.addfinalizer(broker.stop)
    return broker
\`\`\`

Finalizers execute in reverse order of registration. Register immediately after successful acquisition so \`cache.stop\` remains scheduled if broker startup fails. Only add a finalizer after the resource exists, otherwise cleanup can fail while masking the original setup error.

Write one deliberate failure test for infrastructure fixtures in a small self-test suite. Force the second resource to fail, then verify the first is released. Ordinary feature tests rarely exercise partial acquisition paths until CI infrastructure is already leaking.

## Collection hooks are not fixture ordering tools

Plugins and \`conftest.py\` hooks can reorder tests, add markers, or alter collection. That changes which test runs when, not the fixture graph within a test. Using a hook to compensate for fixture state leaking between nodes is a warning sign. Each test should obtain its required setup independently.

Likewise, \`pytest-order\`-style test ordering plugins do not define fixture ordering. If test B must follow test A to inherit state, the suite has created an implicit scenario chain. Model the shared scenario as one test, provision state through fixtures, or persist an explicit artifact with ownership.

## Async fixtures add an event-loop lifetime constraint

Async database clients and servers must be created and closed on a compatible event loop. An autouse async fixture may look correctly ordered yet fail because its loop scope differs from the cached resource scope. Configure the async plugin deliberately and keep an async resource's fixture scope aligned with the loop that owns it.

\`\`\`python
import pytest_asyncio


@pytest_asyncio.fixture
async def api_client(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture(autouse=True)
async def reset_async_cache(cache):
    await cache.clear()
    yield
    await cache.clear()
\`\`\`

If \`api_client\` must observe an empty cache before construction, request \`reset_async_cache\` explicitly even though it is autouse. The edge records the causal relationship. Be aware that plugin versions have changed defaults around async fixture and loop scope, so pin configuration instead of depending on an implicit default.

Never call \`asyncio.run()\` inside an async fixture to force sequencing. It attempts to create a nested loop and masks the lifecycle problem. Await dependencies through fixtures and let the async test plugin manage execution.

## Patch ordering should follow import behavior

An autouse monkeypatch applied before a test body can still be too late if the target module was imported during collection. Decorators, module-level constants, and test-module imports execute before fixtures. If code reads an environment variable at import time, patching it in a function fixture will not change the captured value.

Refactor production code to read configuration during application construction, or import the subject inside a fixture after the environment dependency. As a last resort, reload the module deliberately and test for cache side effects. Fixture ordering controls fixture setup, not Python import collection.

This explains why adding a dependency sometimes appears ineffective: the unwanted work is not another fixture node at all. Use import timing evidence before adding artificial edges.

## Frequently Asked Questions

### Do autouse fixtures run in the order they appear in \`conftest.py\`?

No supported rule guarantees that. Use fixture dependencies, compatible scopes, and autouse applicability to establish order.

### Why did a normal fixture start running for every test in one class?

A class-level autouse fixture probably requests it. Dependencies of an applicable autouse fixture become effectively autouse within that context.

### Can a session autouse fixture depend on a function fixture?

No. The shorter-lived function value cannot support the cached session fixture, so pytest raises a scope mismatch. Split long-lived provisioning from per-test isolation.

### How can I see the actual fixture teardown sequence?

Run the selected node with \`--setup-show\`. Yield-fixture teardown appears in reverse dependency order, which is easier to verify from the trace than from source layout.

### Does pytest-xdist run a session fixture only once?

Usually it runs once per worker process. If the resource must be unique across workers, coordinate it outside ordinary fixture ordering.
`,
};
