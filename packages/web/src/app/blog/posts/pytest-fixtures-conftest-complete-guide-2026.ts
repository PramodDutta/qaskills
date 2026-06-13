import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pytest Fixtures and conftest.py: The Complete Guide (2026)',
  description:
    'Master pytest fixtures, conftest.py, fixture scope, and yield teardown with runnable examples in this practical, complete pytest fixtures tutorial for 2026.',
  date: '2026-06-13',
  category: 'Guide',
  content: `
# Pytest Fixtures and conftest.py: The Complete Guide

Pytest fixtures are the single most important concept to master if you want to write clean, maintainable Python tests. A fixture is a function that prepares something your test needs -- a database connection, a logged-in API client, a temporary directory, a seeded set of records -- and hands it to the test through dependency injection. Instead of repeating setup code at the top of every test, you write the setup once as a fixture, declare it as a parameter, and pytest wires everything together for you. This is the pattern that separates a brittle, copy-pasted test suite from one that scales to thousands of tests across dozens of modules.

This pytest fixtures tutorial walks through the entire fixture system from first principles. You will learn how to define and request fixtures, how fixture scope (function, class, module, package, session) controls how often setup runs, how the \`yield\` keyword gives you clean teardown, and how \`conftest.py\` makes fixtures available across your whole project without a single import. We will also cover fixture composition, autouse fixtures, parametrized fixtures, factory fixtures, the built-in fixtures pytest ships with, and the most common mistakes engineers make when they are new to the system.

Everything here uses pytest 8.x and real, runnable Python. If you are coming from \`unittest\` and its \`setUp\`/\`tearDown\` methods, fixtures will feel like a revelation: they are composable, scoped, lazily evaluated, and explicit about what each test depends on. By the time you finish this guide you will be able to design a fixture architecture for any project, and you will understand exactly when the database connection opens, when it closes, and why. For data-driven testing patterns that build on fixtures, see our companion [pytest parametrize guide](/blog/pytest-parametrize-complete-guide-2026).

## What Is a Pytest Fixture?

A fixture is just a function decorated with \`@pytest.fixture\`. When a test function lists the fixture's name as a parameter, pytest calls the fixture, captures its return value, and injects that value into the test. There is no inheritance, no base class, and no manual wiring -- the parameter name is the contract.

\`\`\`python
import pytest


@pytest.fixture
def sample_user():
    return {"id": 1, "name": "Ada Lovelace", "role": "admin"}


def test_user_is_admin(sample_user):
    assert sample_user["role"] == "admin"


def test_user_has_name(sample_user):
    assert sample_user["name"] == "Ada Lovelace"
\`\`\`

Both tests receive a freshly built \`sample_user\` dictionary. Pytest sees the parameter name, finds a fixture with the same name, runs it, and passes the result in. This is dependency injection: the test declares what it needs, and the framework supplies it. The test never constructs the user itself, which means you can change how a user is built in exactly one place.

Fixtures shine when setup is expensive or repetitive. Imagine every test needs a configured HTTP client pointed at a test server. Without fixtures you would build that client at the top of every test. With a fixture, you build it once and request it wherever it is needed. The dependency is explicit in the test signature, so anyone reading the test knows immediately what it relies on.

## Defining and Requesting Fixtures

A fixture can return any Python object: a primitive, a dict, a class instance, a connection, a tuple of related objects. The test requests it purely by naming it as an argument. You can request several fixtures in a single test, and the order does not matter -- pytest resolves them all before the test body runs.

\`\`\`python
import pytest


@pytest.fixture
def api_base_url():
    return "https://api.example.test/v1"


@pytest.fixture
def auth_token():
    return "test-token-abc123"


def test_request_is_authenticated(api_base_url, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    assert api_base_url.startswith("https://")
    assert headers["Authorization"] == "Bearer test-token-abc123"
\`\`\`

Here the test requests two independent fixtures. Pytest builds both and injects them by name. Notice the f-string \`f"Bearer {auth_token}"\` -- single braces in Python f-strings are normal and need no special handling. You can mix fixtures freely, and pytest guarantees every requested fixture is ready before your assertions execute.

## Fixture Scope: Controlling How Often Setup Runs

By default, every fixture runs once per test function. That is the \`function\` scope, and it is the safest choice because each test gets a clean, isolated instance. But some setup is expensive -- spinning up a database, launching a browser, building a large in-memory dataset -- and you do not want to pay that cost on every single test. Fixture scope lets you widen the lifetime so the setup runs once and is reused across many tests.

Pytest supports five scopes, from narrowest to broadest:

| Scope | Setup runs | Typical use case | Isolation |
|---|---|---|---|
| \`function\` | Once per test function (default) | Mutable state, fresh data per test | Highest |
| \`class\` | Once per test class | Shared client for grouped tests | High |
| \`module\` | Once per test file | Read-only data loaded from disk | Medium |
| \`package\` | Once per test package (directory) | Shared config for a feature area | Lower |
| \`session\` | Once per entire test run | Database engine, Docker container | Lowest |

You set the scope with the \`scope\` argument to the decorator:

\`\`\`python
import pytest


@pytest.fixture(scope="session")
def database_engine():
    print("\\nOpening database engine (once per session)")
    engine = {"connected": True, "queries": 0}
    yield engine
    print("\\nClosing database engine")


@pytest.fixture(scope="function")
def db_transaction(database_engine):
    database_engine["queries"] += 1
    return database_engine


def test_first_query(db_transaction):
    assert db_transaction["connected"] is True


def test_second_query(db_transaction):
    assert db_transaction["queries"] >= 1
\`\`\`

The \`database_engine\` fixture is session-scoped, so it is built once for the whole run and shared by both tests. The \`db_transaction\` fixture is function-scoped and depends on the session-scoped engine. This is a classic layering pattern: an expensive resource at session scope, with a cheap, per-test wrapper that resets state for isolation. A narrower-scoped fixture can always depend on a broader-scoped one, but never the reverse -- a session fixture cannot depend on a function fixture, because the session fixture outlives every function.

Choosing the right scope is a trade-off between speed and isolation. Broader scopes are faster because setup runs less often, but they share state between tests, which can cause one test to pollute another. The rule of thumb: use \`function\` scope by default, and only widen the scope when the setup is genuinely expensive and the resource is safe to share (ideally read-only or reset per test).

## Fixture Teardown with yield

Most real fixtures need cleanup: close the connection, delete the temporary file, log out the session, stop the server. Pytest handles teardown elegantly with the \`yield\` keyword. Everything before \`yield\` is setup; the yielded value is what the test receives; everything after \`yield\` is teardown that runs once the fixture goes out of scope.

\`\`\`python
import pytest


@pytest.fixture
def temp_file(tmp_path):
    file_path = tmp_path / "data.txt"
    file_path.write_text("initial content")
    print("\\nSetup: file created")
    yield file_path
    print("\\nTeardown: file cleaned up")
    if file_path.exists():
        file_path.unlink()


def test_file_has_content(temp_file):
    assert temp_file.read_text() == "initial content"


def test_file_can_be_appended(temp_file):
    with temp_file.open("a") as handle:
        handle.write(" more")
    assert "more" in temp_file.read_text()
\`\`\`

The teardown code after \`yield\` is guaranteed to run even if the test fails, which is exactly what you want -- a failing test should still release its resources. This is far cleaner than \`unittest\`'s \`tearDown\` because the setup and teardown live together in one function, and the local variables created during setup are still in scope during teardown. You never have to stash a connection on \`self\` just so \`tearDown\` can find it.

The \`return\` versus \`yield\` distinction is simple. Use \`return\` when there is nothing to clean up. Use \`yield\` when you need teardown. A yielded fixture pauses at \`yield\`, lets the test run, and resumes for teardown afterward.

\`\`\`python
import pytest


@pytest.fixture
def http_session():
    session = {"open": True, "requests": []}
    yield session
    session["open"] = False
    session["requests"].clear()


def test_session_starts_open(http_session):
    assert http_session["open"] is True
\`\`\`

If you need teardown to run no matter what -- even if the setup itself raises -- you can register a finalizer with the \`request\` fixture using \`request.addfinalizer()\`, but \`yield\` covers the overwhelming majority of cases and reads far better.

## conftest.py: Sharing Fixtures Across Files

A fixture defined inside a test file is only visible to tests in that file. Once you have fixtures that several test files need -- a database connection, an authenticated client, a config object -- you move them into a special file named \`conftest.py\`. Pytest discovers \`conftest.py\` automatically and makes every fixture in it available to all tests in the same directory and every subdirectory, with no imports required.

Consider this project layout:

\`\`\`python
# Project structure:
# tests/
#   conftest.py          <- fixtures shared by ALL tests
#   test_users.py
#   api/
#     conftest.py        <- fixtures for API tests only
#     test_endpoints.py
\`\`\`

The top-level \`conftest.py\` holds project-wide fixtures:

\`\`\`python
# tests/conftest.py
import pytest


@pytest.fixture(scope="session")
def app_config():
    return {
        "env": "test",
        "base_url": "https://api.example.test",
        "timeout": 5,
    }


@pytest.fixture
def authenticated_client(app_config):
    client = {"base_url": app_config["base_url"], "token": "session-xyz"}
    return client
\`\`\`

Any test under \`tests/\` can request \`app_config\` or \`authenticated_client\` simply by naming it -- no import line anywhere. The nested \`tests/api/conftest.py\` can add fixtures scoped to just the API tests, and it can even depend on fixtures from the parent \`conftest.py\`. This layered discovery is what makes pytest scale to large codebases: shared infrastructure lives at the top, specialized helpers live near the tests that use them.

\`conftest.py\` is also where you put pytest hooks, plugin registration, and shared markers. The key mental model is that \`conftest.py\` is implicitly imported by pytest for every directory in its scope, which is why you never import it yourself. If you find yourself writing \`from conftest import ...\`, that is a sign something is wrong -- fixtures resolve by name, not by import. You can browse ready-made pytest fixture patterns in the [QASkills skills directory](/skills) and drop them straight into your own \`conftest.py\`.

## Fixture Composition: Fixtures That Use Fixtures

Fixtures can request other fixtures, exactly like tests do. This lets you build a dependency graph where small, focused fixtures combine into larger ones. Pytest resolves the whole graph automatically and caches each fixture per its scope, so a fixture requested by three other fixtures is still only built once within its scope.

\`\`\`python
import pytest


@pytest.fixture
def db_connection():
    return {"host": "localhost", "open": True}


@pytest.fixture
def user_repository(db_connection):
    return {"connection": db_connection, "table": "users"}


@pytest.fixture
def seeded_user(user_repository):
    user = {"id": 42, "name": "Grace Hopper"}
    user_repository.setdefault("rows", []).append(user)
    return user


def test_seeded_user_exists(seeded_user, user_repository):
    assert seeded_user in user_repository["rows"]
\`\`\`

Here \`seeded_user\` depends on \`user_repository\`, which depends on \`db_connection\`. The test requests both \`seeded_user\` and \`user_repository\`, and pytest gives both the same \`user_repository\` instance because they share the same scope. This caching guarantee is essential: it means composition does not multiply your setup cost. Layer fixtures freely, and trust pytest to build each one the minimum number of times.

## Autouse Fixtures

Sometimes you want a fixture to run for every test without each test having to request it by name -- resetting a global cache, freezing the clock, or configuring logging. The \`autouse=True\` flag does exactly that. An autouse fixture runs automatically for every test within its scope.

\`\`\`python
import pytest


@pytest.fixture(autouse=True)
def reset_environment(monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("FEATURE_FLAG", "off")


def test_env_is_test():
    import os
    assert os.environ["APP_ENV"] == "test"
\`\`\`

The \`reset_environment\` fixture runs before \`test_env_is_test\` even though the test never lists it as a parameter. Use autouse sparingly -- it adds implicit behavior that can surprise readers, because the test no longer shows all its dependencies in its signature. It is perfect for cross-cutting concerns like environment isolation, but if a test genuinely needs the fixture's value, request it explicitly so the dependency is visible.

## Parametrized Fixtures

A fixture can be parametrized so that every test using it runs once per parameter value. This is different from parametrizing a test directly: a parametrized fixture multiplies every dependent test by the parameter set, which is ideal for running the same suite against multiple backends, browsers, or configurations.

\`\`\`python
import pytest


@pytest.fixture(params=["sqlite", "postgres", "mysql"])
def database_backend(request):
    backend = request.param
    return {"engine": backend, "connected": True}


def test_backend_connects(database_backend):
    assert database_backend["connected"] is True
    assert database_backend["engine"] in {"sqlite", "postgres", "mysql"}
\`\`\`

The \`request.param\` attribute exposes the current parameter. Because the fixture is parametrized with three values, \`test_backend_connects\` runs three times -- once per backend. Any other test that requests \`database_backend\` is also tripled. This is a powerful way to guarantee your code works across every supported environment without writing the tests three times. The distinction between parametrized fixtures and \`@pytest.mark.parametrize\` is covered in depth in our [pytest parametrize complete guide](/blog/pytest-parametrize-complete-guide-2026).

## Factory Fixtures: Returning a Function

When a single test needs to create several objects with different values, return a factory function from the fixture instead of a single object. The test calls the factory as many times as it needs, with whatever arguments it wants. This pattern keeps creation logic centralized while giving each test full control.

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
    created.clear()


def test_factory_creates_multiple_users(make_user):
    alice = make_user("Alice", role="admin")
    bob = make_user("Bob")
    assert alice["id"] == 1
    assert bob["id"] == 2
    assert alice["role"] == "admin"
    assert bob["role"] == "member"
\`\`\`

The fixture yields the inner \`_make_user\` function and tracks everything it creates in the \`created\` list. After the test, the teardown clears that list. Factory fixtures are the cleanest way to handle "I need several of these, each slightly different" without parametrizing the test or duplicating construction code. They combine creation, tracking, and cleanup in one tidy unit.

## Built-in Fixtures You Get for Free

Pytest ships with several built-in fixtures that solve common needs. You request them by name just like your own. Knowing these saves you from reinventing temporary directories, output capture, and monkeypatching.

| Built-in fixture | What it provides |
|---|---|
| \`tmp_path\` | A unique temporary \`pathlib.Path\` directory per test |
| \`tmp_path_factory\` | Session-scoped factory for temporary directories |
| \`monkeypatch\` | Safely patch attributes, env vars, and dict items with auto-undo |
| \`capsys\` | Capture \`stdout\` and \`stderr\` written during the test |
| \`caplog\` | Capture log records emitted during the test |
| \`request\` | Metadata about the requesting test and fixture parameters |
| \`pytestconfig\` | Access to command-line options and config values |

Here is \`monkeypatch\` and \`capsys\` in action -- both are function-scoped and automatically undo their changes after each test:

\`\`\`python
def greet(name):
    print(f"Hello, {name}!")


def test_greet_writes_to_stdout(capsys):
    greet("World")
    captured = capsys.readouterr()
    assert captured.out == "Hello, World!\\n"


def test_monkeypatch_env(monkeypatch):
    monkeypatch.setenv("API_KEY", "secret")
    import os
    assert os.environ["API_KEY"] == "secret"
\`\`\`

\`capsys.readouterr()\` returns the captured output so you can assert on what your code printed, and \`monkeypatch.setenv\` sets an environment variable that is automatically restored when the test ends. These built-ins handle the boilerplate that would otherwise clutter your fixtures.

## Common Fixture Mistakes to Avoid

New pytest users hit the same handful of problems. The first is **scope mismatch**: trying to make a session-scoped fixture depend on a function-scoped one. Pytest will raise a \`ScopeMismatch\` error because the broader fixture cannot rely on something that is rebuilt more often than itself. Always have narrow scopes depend on broad ones, never the reverse.

The second is **importing conftest.py**. Fixtures resolve by name through pytest's discovery mechanism, so you never write \`from conftest import my_fixture\`. If you do, you will get duplicate fixtures and confusing errors. Just name the fixture in your test signature and let pytest find it.

The third is **shared mutable state at a broad scope**. A session-scoped fixture that returns a mutable list will carry mutations from one test into the next, creating order-dependent failures that are maddening to debug. If you widen a fixture's scope for performance, make sure the shared object is either read-only or reset by a narrower per-test fixture. The fourth is **overusing autouse**, which hides dependencies and makes tests harder to read. Request fixtures explicitly unless the behavior is genuinely cross-cutting. Following the broader [pytest best practices](/blog/pytest-best-practices-2026) will keep your fixture architecture clean as the suite grows.

## Frequently Asked Questions

### What is the difference between a pytest fixture and conftest.py?

A pytest fixture is a function decorated with \`@pytest.fixture\` that supplies setup data or resources to tests through dependency injection. A \`conftest.py\` file is a special location where you place fixtures you want shared across multiple test files. Fixtures define the behavior; \`conftest.py\` defines the sharing scope. Pytest auto-discovers \`conftest.py\` so its fixtures need no import in any test.

### When should I use pytest fixture scope session versus function?

Use \`function\` scope (the default) when each test needs a clean, isolated instance, which covers most cases. Use \`session\` scope for expensive resources that are safe to share across the whole run, like a database engine or a Docker container. The trade-off is speed versus isolation: session scope runs setup once and is fast, but shared mutable state can leak between tests, so keep session fixtures read-only or wrap them in a per-test fixture.

### How does pytest fixture yield work for teardown?

In a fixture, code before \`yield\` is setup, the yielded value is injected into the test, and code after \`yield\` is teardown that runs once the fixture leaves its scope. Teardown runs even when the test fails, so resources are always released. This keeps setup and teardown together in one function, unlike \`unittest\`'s separate \`setUp\` and \`tearDown\` methods, and the local variables stay in scope for cleanup.

### Do I need to import conftest.py in my test files?

No. You never import \`conftest.py\`. Pytest discovers it automatically for every directory in its scope and makes its fixtures available by name to all tests in that directory and its subdirectories. Requesting a fixture is done purely by naming it as a test parameter. Writing \`from conftest import ...\` is an anti-pattern that causes duplicate fixtures and resolution errors.

### Can a pytest fixture depend on another fixture?

Yes. A fixture can request other fixtures by listing them as parameters, exactly like a test does. Pytest resolves the full dependency graph and caches each fixture according to its scope, so a fixture shared by several others is still built only once within that scope. This composition lets you build small, focused fixtures and combine them into larger ones without multiplying setup cost.

### What is a parametrized fixture in pytest?

A parametrized fixture is created by passing \`params=[...]\` to \`@pytest.fixture\`. Pytest runs every test that requests the fixture once per parameter value, exposing the current value through \`request.param\`. This is ideal for running the same test suite against multiple backends, browsers, or configurations. It differs from \`@pytest.mark.parametrize\`, which varies inputs for a single test rather than multiplying every dependent test.

### Why am I getting a ScopeMismatch error in pytest?

A \`ScopeMismatch\` error means a broader-scoped fixture is trying to depend on a narrower-scoped one -- for example, a \`session\` fixture requesting a \`function\` fixture. The broader fixture outlives the narrower one, so the dependency is impossible. Fix it by ensuring dependencies always flow from narrow to broad: function fixtures may depend on session fixtures, but never the other way around.

## Conclusion

Pytest fixtures are the foundation of every well-structured Python test suite. Once you understand that a fixture is dependency injection -- the test declares what it needs and pytest supplies it -- the rest of the system falls into place. Scope controls how often setup runs, \`yield\` gives you reliable teardown, \`conftest.py\` shares fixtures across your project, and composition lets you build sophisticated setup from small pieces. Together these features replace the rigid \`setUp\`/\`tearDown\` model with something explicit, composable, and fast.

Start simple: write function-scoped fixtures that return what your tests need, add \`yield\` when you need cleanup, and lift shared fixtures into \`conftest.py\` as soon as a second file needs them. Widen scope only when setup is genuinely expensive, and keep shared state read-only. From there, reach for factory fixtures, parametrized fixtures, and the built-ins like \`tmp_path\` and \`monkeypatch\` as the need arises. When you are ready to drive your tests with data, continue with our [pytest parametrize complete guide](/blog/pytest-parametrize-complete-guide-2026) and explore the full library of QA automation patterns in the [skills directory](/skills).
`,
};
