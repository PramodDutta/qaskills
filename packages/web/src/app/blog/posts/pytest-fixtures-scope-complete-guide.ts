import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pytest Fixtures Scope: The Complete Guide (2026)',
  description:
    'Master pytest fixtures and scope: function, class, module, package, session, yield teardown, conftest.py sharing, autouse, params, factory fixtures, and dynamic scope.',
  date: '2026-06-14',
  category: 'Guide',
  content: `
# Pytest Fixtures Scope: The Complete Guide

Pytest fixtures are the single most powerful feature in the pytest ecosystem, and \`scope\` is the dial that controls how often they run and how much they cost. A fixture with the wrong scope can turn a fast unit suite into a slow integration crawl, or worse, leak state between tests so that they pass in isolation but fail when run together. Getting fixture scope right is the difference between a test suite that runs in seconds and one that takes minutes, and between deterministic tests and flaky ones.

This guide is a deep, practical reference to \`@pytest.fixture\` and its \`scope\` parameter. We cover all five scopes (\`function\`, \`class\`, \`module\`, \`package\`, and \`session\`), how fixture finalization works with \`yield\` and teardown, how to share fixtures across files with \`conftest.py\`, the \`autouse\` flag, fixture parametrization with \`params=\`, the \`request\` fixture, fixture dependencies and chaining, the factory-as-fixture pattern, the dreaded scope-mismatch error, and the dynamic scope callable that lets you decide scope at runtime. Every section has runnable code that works with pytest 8.x in 2026.

If you are new to pytest itself, start with our [complete pytest testing guide](/blog/pytest-testing-complete-guide) and then come back here for the deep dive on fixtures. If you are weighing pytest against the standard library, our [unittest vs pytest comparison](/blog/unittest-vs-pytest-2026) explains why fixtures alone are often the deciding factor.

## What Is a Pytest Fixture?

A fixture is a function that provides a fixed baseline (setup data, a database connection, a temporary directory, a configured client) so that tests run against a known, repeatable state. You declare a fixture by decorating a function with \`@pytest.fixture\`, and you consume it by naming it as an argument in your test function. Pytest performs dependency injection: it sees the argument name, finds the matching fixture, runs it, and passes the return value in.

\`\`\`python
import pytest


@pytest.fixture
def sample_user():
    return {"id": 1, "name": "Ada", "role": "admin"}


def test_user_is_admin(sample_user):
    assert sample_user["role"] == "admin"


def test_user_has_name(sample_user):
    assert sample_user["name"] == "Ada"
\`\`\`

Here \`sample_user\` runs once for each test that requests it because the default scope is \`function\`. Each test gets a fresh dictionary, so mutating it in one test never affects another. That isolation is the whole point of the default scope.

## The Five Fixture Scopes

The \`scope\` argument to \`@pytest.fixture\` controls how many times a fixture is invoked and how long its return value is cached. Pytest supports five scopes, ordered here from narrowest (runs most often) to widest (runs least often).

| Scope | Created once per | Typical use case | Teardown timing |
|---|---|---|---|
| \`function\` (default) | Each test function | Fresh mutable data, mocks, isolated state | After each test |
| \`class\` | Each test class | Shared setup for grouped tests | After the last test in the class |
| \`module\` | Each \`.py\` test file | A read-only HTTP client, parsed config | After the last test in the module |
| \`package\` | Each test package (directory with \`__init__.py\`) | A package-wide service handle | After the last test in the package |
| \`session\` | The whole test run | Expensive DB engine, Docker container, auth token | After all tests finish |

The rule of thumb: use the narrowest scope that keeps your tests correct, then widen only when setup is genuinely expensive and the resource is safe to share. A read-only resource is a great candidate for a wider scope; anything mutable usually belongs at \`function\` scope.

\`\`\`python
import pytest


@pytest.fixture(scope="session")
def db_engine():
    # Expensive: create the engine once for the entire run.
    engine = create_engine("postgresql://localhost/test")
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(db_engine):
    # Cheap and isolated: a fresh transactional session per test.
    connection = db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()
\`\`\`

This pattern, an expensive session-scoped engine wrapping a cheap function-scoped session that rolls back, is the canonical way to get both speed and isolation in database tests.

## Fixture Finalization: yield vs return and Teardown

Fixtures that allocate resources need to clean them up. Pytest gives you two mechanisms: the \`yield\` statement and \`request.addfinalizer()\`. The modern, idiomatic approach is \`yield\`. Everything before the \`yield\` is setup; the value yielded is injected into the test; everything after the \`yield\` is teardown and runs after the test (or the last test of the relevant scope) completes.

\`\`\`python
import pytest


@pytest.fixture
def temp_file(tmp_path):
    path = tmp_path / "data.txt"
    path.write_text("hello")
    yield path
    # Teardown runs even if the test fails, as long as setup succeeded.
    if path.exists():
        path.unlink()
\`\`\`

A critical guarantee: teardown code after \`yield\` runs even when the test fails, provided the setup before \`yield\` completed without raising. If setup itself raises before \`yield\`, the teardown does not run, because the resource was never fully created.

The older alternative uses \`request.addfinalizer()\`, which registers a callback. It is still useful when you need to register multiple finalizers conditionally:

\`\`\`python
import pytest


@pytest.fixture
def managed_resources(request):
    resources = []

    def cleanup():
        for resource in reversed(resources):
            resource.close()

    request.addfinalizer(cleanup)
    resources.append(open_connection())
    resources.append(open_cache())
    return resources
\`\`\`

| Mechanism | Style | Multiple finalizers | When to prefer |
|---|---|---|---|
| \`yield\` | Linear, readable | One block (use \`try/finally\` for more) | Almost always |
| \`request.addfinalizer()\` | Callback registration | Yes, easy to stack | Dynamic or conditional cleanup |

## Sharing Fixtures with conftest.py

A fixture defined inside a test file is only visible in that file. To share fixtures across many test files without importing them, put them in a \`conftest.py\`. Pytest auto-discovers \`conftest.py\` files and makes their fixtures available to every test in that directory and all subdirectories, with no import statement required.

\`\`\`python
# tests/conftest.py
import pytest


@pytest.fixture(scope="session")
def api_base_url():
    return "https://staging.example.com/api"


@pytest.fixture
def http_client(api_base_url):
    import httpx

    client = httpx.Client(base_url=api_base_url)
    yield client
    client.close()
\`\`\`

Any test under \`tests/\` can now request \`http_client\` directly. You can have multiple \`conftest.py\` files at different directory levels; fixtures defined in a deeper \`conftest.py\` override those with the same name higher up, which is how you specialize behavior per subpackage. This layering is the backbone of large pytest suites and pairs naturally with the package scope discussed below.

## The autouse Flag

Sometimes you want a fixture to run for every test in its scope without each test explicitly requesting it. The \`autouse=True\` flag does exactly that. Common uses are resetting global state, configuring logging, seeding a clock, or wrapping every test in a database transaction.

\`\`\`python
import pytest


@pytest.fixture(autouse=True)
def reset_singletons():
    # Runs before and after every test, no argument needed.
    Registry.clear()
    yield
    Registry.clear()


@pytest.fixture(scope="session", autouse=True)
def configure_logging():
    import logging

    logging.basicConfig(level=logging.WARNING)
    yield
\`\`\`

Use \`autouse\` sparingly. Because it runs invisibly, an overused autouse fixture makes tests hard to reason about and slow. Reserve it for cross-cutting concerns that genuinely apply to every test in the scope. When only some tests need the setup, prefer an explicit fixture argument or a marker.

## Fixture Parametrization with params

Adding \`params=\` to a fixture turns one fixture into many. Pytest runs every test that depends on the fixture once per parameter value, multiplying your coverage without duplicating test code. Inside the fixture, \`request.param\` holds the current value.

\`\`\`python
import pytest


@pytest.fixture(params=["sqlite", "postgres", "mysql"])
def database_backend(request):
    backend = request.param
    connection = connect(backend)
    yield connection
    connection.close()


def test_insert_and_read(database_backend):
    # This single test runs three times, once per backend.
    database_backend.insert({"id": 1})
    assert database_backend.get(1) == {"id": 1}
\`\`\`

You can give each parameter a readable test ID with \`ids=\`, which makes test output and \`-k\` filtering much nicer:

\`\`\`python
@pytest.fixture(
    params=[(2, 3, 5), (10, 20, 30), (-1, 1, 0)],
    ids=["small", "large", "signed"],
)
def addition_case(request):
    return request.param
\`\`\`

Parametrized fixtures compose: if two fixtures each have three params, a test using both runs nine times. This is a powerful way to test a feature across a matrix of configurations, but watch the combinatorial growth.

## The request Fixture

\`request\` is a special built-in fixture that exposes context about the test asking for the fixture. We already saw \`request.param\` and \`request.addfinalizer()\`. It carries much more: the test node, markers applied to the test, the fixture's own scope, and config access.

| Attribute | Returns | Use case |
|---|---|---|
| \`request.param\` | Current parametrize value | Parametrized fixtures |
| \`request.addfinalizer(fn)\` | None | Register cleanup callbacks |
| \`request.node\` | The test item | Read the test name, location |
| \`request.node.get_closest_marker("name")\` | Marker or None | Read marker args to configure setup |
| \`request.config\` | The pytest config | Read CLI options, ini settings |
| \`request.fixturenames\` | List of fixture names | Introspection, conditional logic |

A frequent pattern is reading a marker to configure a fixture per test:

\`\`\`python
import pytest


@pytest.fixture
def user(request):
    marker = request.node.get_closest_marker("user_role")
    role = marker.args[0] if marker else "guest"
    return {"role": role}


@pytest.mark.user_role("admin")
def test_admin_dashboard(user):
    assert user["role"] == "admin"
\`\`\`

## Fixture Dependencies and Chaining

Fixtures can request other fixtures simply by naming them as arguments, exactly like tests do. Pytest resolves the whole dependency graph, runs fixtures in topological order, and caches each one per its scope. This lets you build small, composable fixtures instead of giant setup functions.

\`\`\`python
import pytest


@pytest.fixture(scope="session")
def config():
    return {"host": "localhost", "port": 5432}


@pytest.fixture(scope="session")
def connection(config):
    conn = connect(config["host"], config["port"])
    yield conn
    conn.close()


@pytest.fixture
def clean_table(connection):
    connection.execute("TRUNCATE users")
    yield connection
    connection.execute("TRUNCATE users")
\`\`\`

Here \`clean_table\` depends on \`connection\`, which depends on \`config\`. Pytest builds them in order and reuses the session-scoped ones across the run. This chaining is the idiomatic way to layer setup, and it keeps each fixture focused on one responsibility.

## The Factory-as-Fixture Pattern

When a test needs to create several objects, or needs to control the data going into an object, return a function from the fixture instead of a value. This is the factory-as-fixture pattern. The test calls the returned function as many times as it needs, with whatever arguments it wants.

\`\`\`python
import pytest


@pytest.fixture
def make_user():
    created = []

    def _make_user(name, role="member"):
        user = {"id": len(created) + 1, "name": name, "role": role}
        created.append(user)
        return user

    yield _make_user
    # Teardown can clean up everything the factory created.
    for user in created:
        delete_user(user["id"])


def test_team(make_user):
    owner = make_user("Ada", role="owner")
    member = make_user("Linus")
    assert owner["id"] != member["id"]
\`\`\`

The factory closes over a list so teardown can clean up everything it produced. This pattern is far more flexible than a plain data fixture because the test, not the fixture, decides how many objects to create and with what attributes.

## Scope Mismatch Errors

Fixtures may only depend on fixtures of an equal or wider scope. A \`function\`-scoped fixture can use a \`session\`-scoped one, but a \`session\`-scoped fixture cannot use a \`function\`-scoped one. The reason is lifetime: a session fixture is created once and lives for the whole run, so it cannot depend on something that is recreated for every test. Violating this raises a \`ScopeMismatch\` error.

\`\`\`python
import pytest


@pytest.fixture(scope="function")
def current_test_data():
    return {"value": 42}


@pytest.fixture(scope="session")
def broken(current_test_data):  # ScopeMismatch at collection time
    return current_test_data["value"]
\`\`\`

Pytest reports this clearly:

\`\`\`bash
ScopeMismatch: You tried to access the function scoped fixture
current_test_data with a session scoped request object.
\`\`\`

The fix is to align scopes: either widen \`current_test_data\` or narrow \`broken\`. Remember the legal direction: narrow fixtures may consume wide fixtures, never the reverse. The valid widening order is \`function\` -> \`class\` -> \`module\` -> \`package\` -> \`session\`.

## Dynamic Scope with a Callable

Since pytest 5.2, \`scope\` can be a callable instead of a string, letting you decide the scope at runtime based on command-line options or the environment. The callable receives \`fixture_name\` and \`config\` and must return one of the scope strings. This is ideal for fixtures that should be cheap in CI but isolated locally, or vice versa.

\`\`\`python
import pytest


def dynamic_scope(fixture_name, config):
    # Reuse the expensive container across the session in CI,
    # but recreate per test locally for stronger isolation.
    if config.getoption("--reuse-container", default=False):
        return "session"
    return "function"


@pytest.fixture(scope=dynamic_scope)
def app_container():
    container = start_container()
    yield container
    container.stop()


def pytest_addoption(parser):
    parser.addoption("--reuse-container", action="store_true")
\`\`\`

Run \`pytest --reuse-container\` and the fixture becomes session-scoped; omit the flag and it is function-scoped. The callable is evaluated once at collection time, so the chosen scope is stable for the whole run. This feature closes the gap between fast and isolated without maintaining two separate fixtures.

## Putting It All Together: A Realistic conftest.py

Here is how these pieces combine in a real project. Note the mix of scopes, an autouse reset, a factory, and clean teardown.

\`\`\`python
# tests/conftest.py
import pytest


@pytest.fixture(scope="session")
def engine():
    eng = create_engine("postgresql://localhost/test")
    yield eng
    eng.dispose()


@pytest.fixture
def session(engine):
    conn = engine.connect()
    txn = conn.begin()
    sess = Session(bind=conn)
    yield sess
    sess.close()
    txn.rollback()
    conn.close()


@pytest.fixture(autouse=True)
def freeze_clock():
    with frozen_time("2026-06-14T00:00:00Z"):
        yield


@pytest.fixture
def make_order(session):
    def _make(total, status="pending"):
        order = Order(total=total, status=status)
        session.add(order)
        session.flush()
        return order

    return _make
\`\`\`

Every test gets a clean transactional \`session\`, a frozen clock with no code change, and a factory to build orders, all backed by a single shared engine. That is fixtures and scope working as designed. For broader test design beyond fixtures, see our guide on [pytest testing](/blog/pytest-testing-complete-guide) and the comparison of [Python's standard library vs pytest](/blog/python-vs-pytest-explained).

## Best Practices for Fixture Scope

A few hard-won rules keep fixture suites fast and trustworthy as they grow. First, default to \`function\` scope and only widen when a profiler proves the setup is expensive. Premature widening is the most common source of cross-test contamination, where one test mutates a shared object and a later test fails for reasons that have nothing to do with its own code. If a widened fixture must be shared, make it strictly read-only and document that contract.

Second, separate the expensive-but-shareable from the cheap-but-mutable. A database engine, a Docker container, or a parsed configuration file is created once at \`session\` scope; the per-test work, like a transaction that rolls back, stays at \`function\` scope and depends on the wide fixture. This split gives you the speed of shared setup and the isolation of fresh state, which is exactly the database pattern shown earlier.

Third, prefer explicit fixture arguments over \`autouse\` unless the setup genuinely applies to every test in the scope. Explicit dependencies make a test self-documenting: reading its signature tells you precisely what it needs. Reserve \`autouse\` for true cross-cutting concerns like clock freezing or global-state resets.

| Practice | Why it matters |
|---|---|
| Default to \`function\` scope | Maximum isolation, fewest surprises |
| Widen only with profiler evidence | Avoids premature, contamination-prone sharing |
| Keep wide fixtures read-only | Prevents one test from breaking another |
| Pair session resource with function transaction | Speed plus isolation |
| Prefer explicit args over \`autouse\` | Self-documenting tests |
| Name parametrize cases with \`ids=\` | Readable output and \`-k\` filtering |

Finally, keep fixtures small and single-purpose, then compose them through dependencies rather than building one giant setup function. Small fixtures are easier to reuse, override in a deeper \`conftest.py\`, and reason about when something fails. These habits scale a suite from dozens to thousands of tests without it becoming slow or flaky.

## Frequently Asked Questions

### What is the default scope of a pytest fixture?

The default scope is \`function\`, meaning the fixture runs once for every test function that requests it. Each test receives a fresh instance, which guarantees isolation: mutating the fixture in one test never affects another. You only need to set \`scope\` explicitly when you want to widen it to \`class\`, \`module\`, \`package\`, or \`session\` for performance reasons.

### What is the difference between module and session scope in pytest?

A \`module\`-scoped fixture is created once per test file and torn down after the last test in that file. A \`session\`-scoped fixture is created once for the entire test run and torn down after all tests finish, even across many files. Use module scope for resources tied to one file's tests; use session scope for genuinely global, expensive resources like a database engine or Docker container.

### How do I share a fixture across multiple test files?

Put the fixture in a \`conftest.py\` file. Pytest auto-discovers \`conftest.py\` in each directory and makes its fixtures available to every test in that directory and all subdirectories, with no import needed. Place the file at the level where the fixtures should be visible; a \`conftest.py\` at the project root shares fixtures with the whole suite.

### Why am I getting a ScopeMismatch error in pytest?

A \`ScopeMismatch\` happens when a wider-scoped fixture depends on a narrower-scoped one, for example a \`session\` fixture requesting a \`function\` fixture. Wider fixtures live longer, so they cannot depend on something recreated more often. Fix it by aligning scopes: widen the inner fixture or narrow the outer one. The only legal direction is narrow fixtures consuming wider fixtures.

### When should I use autouse fixtures in pytest?

Use \`autouse=True\` for cross-cutting setup that every test in a scope needs, such as resetting global state, configuring logging, or wrapping tests in a transaction. Avoid it for setup only some tests need, because autouse fixtures run invisibly and can slow the suite and obscure what each test depends on. When in doubt, prefer an explicit fixture argument.

### How do I run teardown code in a pytest fixture?

Use \`yield\` instead of \`return\`. Code before the \`yield\` is setup, the yielded value is injected into the test, and code after the \`yield\` is teardown. The teardown runs after the test (or the last test of the fixture's scope) completes, and it still runs when the test fails, as long as setup succeeded. For multiple or conditional cleanups, use \`request.addfinalizer()\`.

### What is the factory-as-fixture pattern in pytest?

It is a fixture that returns a function rather than a value. The test calls that function as often as it needs, passing arguments to build objects on demand. The fixture can close over a list to track everything created and clean it up in teardown. This pattern is more flexible than a static data fixture because the test controls how many objects exist and what they contain.

### Can I change a fixture's scope at runtime in pytest?

Yes. Since pytest 5.2 you can pass a callable to \`scope\` instead of a string. The callable receives \`fixture_name\` and \`config\` and returns one of the scope strings. This lets you choose scope based on a command-line flag or environment, for example session scope in CI for speed and function scope locally for isolation, without maintaining two separate fixtures.

## Conclusion

Fixture scope is the lever that controls both the speed and the correctness of a pytest suite. Start every fixture at \`function\` scope for safety, then widen to \`class\`, \`module\`, \`package\`, or \`session\` only when setup is expensive and the resource is safe to share. Lean on \`yield\` for clean teardown, \`conftest.py\` for sharing, \`params=\` for coverage, the factory pattern for flexibility, and the dynamic scope callable when you need different behavior in CI versus locally. Respect the scope-dependency direction and you will never see another \`ScopeMismatch\`.

Ready to put these patterns into your AI coding agent's workflow? Browse curated, agent-ready pytest and testing skills in the [QASkills directory](/skills) and drop production-grade fixtures straight into your projects. For more, read our [complete pytest guide](/blog/pytest-testing-complete-guide), compare approaches in [unittest vs pytest](/blog/unittest-vs-pytest-2026), and learn the language fundamentals in [Python vs pytest explained](/blog/python-vs-pytest-explained).
`,
};
