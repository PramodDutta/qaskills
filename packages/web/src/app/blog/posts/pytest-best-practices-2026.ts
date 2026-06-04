import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pytest Best Practices 2026: Fixtures, Markers, Config',
  description:
    'Pytest best practices for 2026: conftest.py, fixture scopes, parametrize, markers, pyproject.toml config, and plugins like pytest-cov, xdist, and mock.',
  date: '2026-05-28',
  category: 'Guide',
  content: `
# Pytest Best Practices 2026: Fixtures, Markers, Config

Pytest is the de facto standard for testing Python code, and writing your first \`assert\`-based test takes only seconds. But the gap between a working test and a maintainable, fast, well-structured test suite is enormous. Teams that ignore the conventions end up with slow CI pipelines, tangled fixtures, flaky tests, and configuration scattered across half a dozen files. Teams that follow a consistent set of best practices ship faster and trust their suite. This guide collects the pytest practices that matter most in 2026, covering project layout, \`conftest.py\`, fixture scopes, parametrization, markers, configuration in \`pyproject.toml\`, and the handful of plugins that almost every serious project should install.

This is an opinionated, practical guide aimed at developers and QA engineers who already know what pytest is and how to write a basic test. If you are still fuzzy on the fundamentals, start with [what is pytest in Python](/blog/what-is-pytest-python-explained) and then come back. We will assume you are on pytest 8.x, the current major line in 2026, running on Python 3.9 or newer. Throughout, the goal is the same: tests that are fast to run, easy to read, isolated from each other, and cheap to maintain as the codebase grows. Every recommendation below has a concrete code example you can copy into your own project. Let us start with the foundation that everything else builds on: how you lay out your project and configure pytest.

If you would rather have an AI coding agent apply these conventions automatically, install the [pytest patterns skill](/skills) into Claude Code, Cursor, or Copilot and it will scaffold fixtures, parametrized tests, and config the right way.

## Use the src Layout and Keep Tests Separate

Before writing a single test, get your project structure right. The recommended layout in 2026 is the **src layout**, which puts your package inside a \`src/\` directory and your tests in a sibling \`tests/\` directory. This prevents accidental imports of your package from the working directory and forces tests to run against the installed package, catching packaging bugs early.

\`\`\`text
my_project/
├── pyproject.toml
├── src/
│   └── my_package/
│       ├── __init__.py
│       └── calculator.py
└── tests/
    ├── conftest.py
    ├── test_calculator.py
    └── integration/
        └── test_api.py
\`\`\`

Keeping tests out of the package directory means your shipped wheel does not include test code, and it makes the boundary between production and test code obvious. Name test files \`test_*.py\` so pytest discovers them automatically.

## Configure Pytest in pyproject.toml

In 2026 the preferred place for pytest configuration is \`pyproject.toml\` under the \`[tool.pytest.ini_options]\` table. This consolidates configuration into the one file modern Python projects already use, rather than a separate \`pytest.ini\` or \`setup.cfg\`. Here is a solid baseline:

\`\`\`toml
# pyproject.toml
[tool.pytest.ini_options]
minversion = "8.0"
testpaths = ["tests"]
addopts = [
    "-ra",                  # show summary of all non-passing tests
    "--strict-markers",     # error on unregistered markers
    "--strict-config",      # error on unknown config keys
    "--import-mode=importlib",
]
markers = [
    "slow: marks tests as slow (deselect with '-m \\"not slow\\"')",
    "integration: marks tests requiring external services",
    "smoke: critical-path smoke tests",
]
\`\`\`

The \`--strict-markers\` option is one of the highest-value settings you can enable: it turns a typo'd marker into an error instead of silently ignoring it. \`testpaths\` tells pytest where to look so it does not waste time scanning the whole tree. If you still maintain a standalone \`pytest.ini\`, the same keys apply, just without the \`[tool.pytest.ini_options]\` wrapper. Pick one file and stick to it; do not split configuration across multiple files.

| Config file | Section header | When to use |
|---|---|---|
| \`pyproject.toml\` | \`[tool.pytest.ini_options]\` | Recommended default in 2026 |
| \`pytest.ini\` | \`[pytest]\` | Legacy projects or when you want config isolated |
| \`tox.ini\` | \`[pytest]\` | When already using tox heavily |
| \`setup.cfg\` | \`[tool:pytest]\` | Discouraged; INI parsing quirks |

## Centralize Shared Fixtures in conftest.py

The \`conftest.py\` file is pytest's mechanism for sharing fixtures across multiple test files without importing them. Any fixture defined in a \`conftest.py\` is automatically available to every test in that directory and its subdirectories. This is the right home for setup that more than one test file needs: database connections, HTTP clients, temporary directories, authentication tokens.

\`\`\`python
# tests/conftest.py
import pytest
from my_package.calculator import Calculator

@pytest.fixture
def calculator():
    """A fresh Calculator instance for each test."""
    return Calculator()

@pytest.fixture(scope="session")
def app_config():
    """Expensive config loaded once per test session."""
    return {"env": "test", "timeout": 5, "retries": 3}
\`\`\`

A few rules keep \`conftest.py\` healthy. Do not put test functions in it; it is for fixtures, hooks, and plugins only. Use nested \`conftest.py\` files: a fixture only needed by integration tests belongs in \`tests/integration/conftest.py\`, not the top-level one. And never import fixtures manually from \`conftest.py\`; pytest wires them up by name automatically, and importing them directly breaks that mechanism.

## Master Fixture Scopes

Fixture scope controls how often a fixture's setup code runs. Choosing the right scope is the difference between a suite that runs in 4 seconds and one that runs in 4 minutes. Pytest offers five scopes, from narrowest to widest:

| Scope | Setup runs | Use for |
|---|---|---|
| \`function\` (default) | Once per test function | Cheap, mutable objects that must be isolated |
| \`class\` | Once per test class | Shared state across methods in one class |
| \`module\` | Once per test module | Resources reused across a file |
| \`package\` | Once per package directory | Resources shared across a package of tests |
| \`session\` | Once per entire test run | Expensive, read-only resources (DB engine, config) |

The trade-off is isolation versus speed. A \`function\`-scoped fixture gives each test a pristine, independent instance, eliminating cross-test contamination, but it pays the setup cost every time. A \`session\`-scoped fixture pays the cost once but must be treated as read-only or carefully reset, because every test shares the same object.

\`\`\`python
import pytest

@pytest.fixture(scope="session")
def db_engine():
    """Create the database engine once for the whole run."""
    engine = create_engine("postgresql://localhost/test")
    yield engine
    engine.dispose()

@pytest.fixture(scope="function")
def db_session(db_engine):
    """Each test gets its own transaction, rolled back after."""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    yield session
    session.close()
    transaction.rollback()   # undo all changes for isolation
    connection.close()
\`\`\`

This is the gold-standard pattern: create the expensive engine once at session scope, but wrap each test in its own transaction at function scope and roll it back afterward. Tests stay isolated while avoiding the cost of rebuilding the engine. For database-heavy suites, pair this with [Testcontainers](/blog/testcontainers-docker-integration-testing) so each run targets a disposable real database.

## Use yield for Setup and Teardown

Prefer \`yield\` fixtures over the older \`return\` plus finalizer style. Code before the \`yield\` is setup; code after it is teardown that runs even if the test fails. This keeps related setup and cleanup visually together and is easier to reason about than separate \`addfinalizer\` calls.

\`\`\`python
@pytest.fixture
def temp_file(tmp_path):
    path = tmp_path / "data.txt"
    path.write_text("initial content")   # setup
    yield path
    # teardown runs automatically, even on test failure
    if path.exists():
        path.unlink()
\`\`\`

Note the use of the built-in \`tmp_path\` fixture, which provides a unique temporary directory per test. Lean on pytest's built-in fixtures (\`tmp_path\`, \`monkeypatch\`, \`capsys\`, \`caplog\`) instead of rolling your own; they are battle-tested and handle cleanup for you.

## Parametrize to Eliminate Duplication

The \`@pytest.mark.parametrize\` decorator runs the same test function with multiple sets of inputs, turning what would be ten near-identical tests into one. This is the single best tool for data-driven testing in pytest. Each parameter set becomes a separate test case with its own pass/fail status, so a failure points you straight at the offending input.

\`\`\`python
import pytest

@pytest.mark.parametrize(
    "a, b, expected",
    [
        (2, 3, 5),
        (-1, 1, 0),
        (0, 0, 0),
        (100, 200, 300),
    ],
    ids=["positives", "mixed-signs", "zeros", "large"],
)
def test_add(calculator, a, b, expected):
    assert calculator.add(a, b) == expected
\`\`\`

Use the \`ids\` argument to give each case a readable name so test output is self-documenting. You can also stack multiple \`parametrize\` decorators to get the cross-product of inputs, and you can parametrize fixtures themselves when the same data needs to drive setup across many tests. Avoid the temptation to loop with \`for\` inside a single test; that hides which input failed and stops on the first error.

## Register and Use Markers

Markers tag tests so you can selectively run subsets. The most common use is separating fast unit tests from slow integration tests, then running only the fast ones during local development. Always register custom markers in your config (as shown earlier) and enable \`--strict-markers\` so typos fail loudly.

\`\`\`python
import pytest

@pytest.mark.slow
@pytest.mark.integration
def test_full_checkout_flow(db_session):
    # hits a real database, takes seconds
    ...

@pytest.mark.smoke
def test_health_endpoint(client):
    assert client.get("/health").status_code == 200
\`\`\`

Then select or deselect by marker on the command line:

\`\`\`bash
pytest -m smoke                    # only smoke tests
pytest -m "not slow"               # skip slow tests during development
pytest -m "integration and not slow"
\`\`\`

Built-in markers like \`@pytest.mark.skip\`, \`@pytest.mark.skipif\`, and \`@pytest.mark.xfail\` handle conditional skipping and expected failures. Use \`xfail\` for known bugs you have not fixed yet so they are tracked rather than silently disabled.

## Follow the Arrange-Act-Assert Pattern

Within each test, structure the body into three clear phases: **Arrange** (set up inputs and state), **Act** (call the thing under test), **Assert** (verify the outcome). This convention, sometimes called AAA, makes tests instantly readable because every reader knows where to look.

\`\`\`python
def test_apply_discount():
    # Arrange
    cart = Cart(items=[Item(price=100), Item(price=50)])
    coupon = Coupon(percent=10)

    # Act
    total = cart.apply_coupon(coupon).total()

    # Assert
    assert total == 135
\`\`\`

Keep one logical assertion concept per test where practical. A test named \`test_apply_discount\` should test applying a discount, not also test inventory updates and email sending. Smaller, focused tests give precise failure signals and are easier to maintain.

## Essential Plugins for 2026

Pytest's plugin ecosystem is its superpower. These are the plugins almost every project should install:

| Plugin | Purpose | Install |
|---|---|---|
| \`pytest-cov\` | Code coverage reporting | \`pip install pytest-cov\` |
| \`pytest-xdist\` | Parallel test execution across CPUs | \`pip install pytest-xdist\` |
| \`pytest-mock\` | Thin fixture wrapper around unittest.mock | \`pip install pytest-mock\` |
| \`pytest-randomly\` | Randomize test order to catch order dependencies | \`pip install pytest-randomly\` |
| \`pytest-rerunfailures\` | Retry flaky tests | \`pip install pytest-rerunfailures\` |
| \`pytest-asyncio\` | Test async/await coroutines | \`pip install pytest-asyncio\` |

**Coverage with pytest-cov.** Measure which lines your tests exercise and fail the build below a threshold:

\`\`\`bash
pytest --cov=src/my_package --cov-report=term-missing --cov-fail-under=85
\`\`\`

**Parallelism with pytest-xdist.** Distribute tests across all cores to cut suite time dramatically:

\`\`\`bash
pytest -n auto        # use all available CPU cores
\`\`\`

**Mocking with pytest-mock.** Instead of nesting \`with mock.patch(...)\` context managers, request the \`mocker\` fixture, which auto-undoes patches after each test:

\`\`\`python
def test_sends_email(mocker):
    mock_send = mocker.patch("my_package.notifier.send_email")
    notify_user(user_id=42)
    mock_send.assert_called_once_with(42)
\`\`\`

For a deep dive on mocking choices, see our [jest.fn vs mockImplementation guide](/blog/jest-mock-vs-mockimplementation-guide), which includes a pytest-mock versus unittest.mock comparison table.

## Keep Tests Fast and Isolated

Two properties separate good suites from bad ones: speed and isolation. Fast suites get run constantly; slow ones get skipped. Isolated tests can run in any order and in parallel; coupled tests produce mysterious order-dependent failures. Enforce both with tooling. Install \`pytest-randomly\` so tests run in a different order each time, surfacing hidden dependencies. Run \`pytest -n auto\` in CI so any shared mutable state breaks loudly. Mark genuinely slow tests with \`@pytest.mark.slow\` and exclude them from the default local run. And never let one test depend on another having run first; each test must set up everything it needs through fixtures.

## Testing Async Code with pytest-asyncio

Modern Python codebases are increasingly async, and testing coroutines requires the \`pytest-asyncio\` plugin because a plain test function cannot \`await\`. Install it, then mark async tests so pytest runs them inside an event loop. In 2026 the cleanest approach is to set the mode to \`auto\` in config so you do not have to decorate every test.

\`\`\`toml
# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
\`\`\`

\`\`\`python
import pytest

# With asyncio_mode = "auto", no decorator is needed on async tests
async def test_fetch_returns_payload(http_client):
    response = await http_client.get("/health")
    assert response.status_code == 200

# Async fixtures work too
@pytest.fixture
async def http_client():
    client = await create_async_client()
    yield client
    await client.aclose()
\`\`\`

If you prefer explicit control, leave the mode at \`strict\` and decorate each async test with \`@pytest.mark.asyncio\`. Either way, the principle is the same as synchronous testing: keep fixtures providing the setup, assert on outcomes, and reset state between tests. Async fixtures use \`yield\` for teardown exactly like sync ones, with \`await\` on the cleanup call.

## Useful Command-Line Flags for Daily Work

Pytest's CLI is where a lot of day-to-day productivity lives. Memorizing a handful of flags speeds up the edit-test loop considerably.

| Flag | What it does |
|---|---|
| \`-k "expr"\` | Run tests whose name matches an expression |
| \`-x\` | Stop after the first failure |
| \`--lf\` | Run only tests that failed last time |
| \`--ff\` | Run failures first, then the rest |
| \`-q\` / \`-v\` | Quiet or verbose output |
| \`-s\` | Do not capture stdout (see print/log output) |
| \`--pdb\` | Drop into the debugger on failure |
| \`--durations=10\` | Show the 10 slowest tests |

\`\`\`bash
# Iterate fast: rerun only what failed, stop on first failure, verbose
pytest --lf -x -v

# Run just the tests matching a keyword
pytest -k "discount and not integration"

# Find your slowest tests so you know what to optimize
pytest --durations=10
\`\`\`

The \`--lf\` (last-failed) and \`-x\` (exit-first) combination is the single most useful pairing during debugging: it reruns only the tests that failed and stops the moment one fails again, giving you the tightest possible loop. The \`--durations\` flag is how you find which tests to speed up or mark as \`slow\`, directly supporting the fast-suite goal.

## A Recommended CI Configuration

Pulling it all together, here is a CI invocation that captures these practices: parallel execution, coverage gate, strict markers, and randomized order.

\`\`\`bash
pytest \\
  -n auto \\
  --cov=src/my_package \\
  --cov-report=xml \\
  --cov-fail-under=85 \\
  --strict-markers \\
  -ra
\`\`\`

Wire this into your GitHub Actions or other CI pipeline. For a full walkthrough of testing in CI, see our [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions). The combination of a fast, isolated, well-marked suite plus a coverage gate gives you a safety net you can actually trust on every pull request.

## Frequently Asked Questions

### What are the best pytest practices for 2026?

The core pytest best practices for 2026 are: use the src layout with tests in a separate directory, configure pytest in \`pyproject.toml\` with \`--strict-markers\`, centralize shared fixtures in \`conftest.py\`, choose fixture scopes deliberately for speed and isolation, parametrize to eliminate duplicated tests, register custom markers, follow Arrange-Act-Assert, and install pytest-cov, pytest-xdist, and pytest-mock. Keep tests fast, isolated, and runnable in any order.

### What is the latest version of pytest in 2026?

In 2026 the current major line is pytest 8.x, which supports Python 3.9 and newer. You should pin a recent 8.x release in your dependency file and allow patch and minor updates within that range. Staying on the latest stable 8.x gives you current bug fixes, performance improvements, stricter configuration defaults, and compatibility with the newest plugins and Python versions.

### Where should I put pytest configuration?

Put pytest configuration in \`pyproject.toml\` under the \`[tool.pytest.ini_options]\` table, which is the recommended location in 2026 because it consolidates settings into the standard project file. Legacy alternatives include \`pytest.ini\` with a \`[pytest]\` section or \`setup.cfg\` with \`[tool:pytest]\`. Choose one file and avoid splitting configuration across several, since multiple sources make behavior harder to reason about.

### What is conftest.py used for in pytest?

The \`conftest.py\` file holds fixtures, hooks, and plugin configuration that should be shared across multiple test files without importing them. Any fixture defined there is automatically available to all tests in that directory and its subdirectories. Use nested \`conftest.py\` files to scope fixtures to specific test groups, keep test functions out of it, and never import its fixtures manually since pytest wires them by name.

### What fixture scope should I use in pytest?

Use \`function\` scope (the default) for cheap, mutable objects that each test must own exclusively, ensuring isolation. Use \`session\` scope for expensive, read-only resources like a database engine or loaded config that can be created once per run. The common pattern is a session-scoped engine combined with a function-scoped transaction that rolls back after each test, balancing speed against isolation.

### How do I run pytest tests in parallel?

Install the pytest-xdist plugin with \`pip install pytest-xdist\`, then run \`pytest -n auto\` to distribute tests across all available CPU cores, or specify a number like \`-n 4\`. Parallel execution can cut suite time dramatically, but it requires that your tests be properly isolated; any shared mutable state or order dependency will surface as failures, which is actually a useful signal.

### What is the difference between pytest markers and fixtures?

Markers are tags applied with \`@pytest.mark.<name>\` that categorize tests so you can selectively run subsets, for example \`pytest -m "not slow"\`. Fixtures are functions decorated with \`@pytest.fixture\` that provide setup, data, or resources to tests through dependency injection. In short, markers control *which* tests run and carry metadata, while fixtures supply *what* tests need to execute.

### Should I use pytest-mock or unittest.mock?

Both wrap the same underlying mocking machinery, since pytest-mock is a thin fixture wrapper around the standard library's unittest.mock. Prefer pytest-mock in pytest projects because its \`mocker\` fixture automatically undoes every patch after each test, eliminating manual context managers and reducing cleanup bugs. Use unittest.mock directly only when you are not in a pytest context or need its standalone API.

## Conclusion

Great pytest suites are not an accident; they follow consistent practices. Adopt the src layout, configure everything in \`pyproject.toml\` with strict markers, centralize fixtures in \`conftest.py\`, choose scopes deliberately, parametrize aggressively, register your markers, structure tests with Arrange-Act-Assert, and install the essential plugins for coverage, parallelism, and mocking. The payoff is a suite that runs fast, stays isolated, and gives precise failure signals you can trust on every commit.

Keep learning with [what is pytest in Python](/blog/what-is-pytest-python-explained) for the fundamentals and the [complete pytest testing guide](/blog/pytest-testing-complete-guide) for end-to-end coverage. To have your AI coding agent apply every one of these conventions automatically, install the pytest skill:

\`\`\`bash
npx @qaskills/cli add pytest-patterns
\`\`\`

Browse all 450+ testing skills at [qaskills.sh/skills](/skills) and ship a test suite you can rely on.
`,
};
