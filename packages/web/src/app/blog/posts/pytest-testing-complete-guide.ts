import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Python Testing with pytest — Fixtures, Parametrize, and Plugins',
  description:
    'Complete guide to Python testing with pytest. Covers fixtures, parametrize, markers, conftest.py, plugins, mocking, and AI agent pytest automation.',
  date: '2026-02-23',
  category: 'Tutorial',
  content: `
pytest has become the de facto standard for Python testing, and for good reason. Its simple syntax, powerful fixture system, and rich plugin ecosystem make it the best tool for writing tests at every level -- from quick unit tests to complex integration suites. Whether you are a Python developer writing your first test or a seasoned QA engineer scaling a test suite across hundreds of microservices, this pytest tutorial covers everything you need to master the framework in 2026.

This guide walks you through the core features of pytest step by step: test discovery and assert introspection, fixtures with every scope and teardown pattern, parametrize for data-driven tests, markers for test selection, mocking strategies, essential plugins, and CI/CD integration. By the end, you will have the knowledge to build a robust, maintainable Python testing strategy.

---

## Key Takeaways

- **pytest uses plain \`assert\` statements** instead of special assertion methods, giving you readable tests with detailed failure output out of the box
- **Fixtures replace setup/teardown** with a composable, scope-aware dependency injection system that scales from simple unit tests to complex integration scenarios
- **\`@pytest.mark.parametrize\`** lets you run the same test logic against dozens of input-output combinations without duplicating code
- **Markers and \`-k\` filtering** give you fine-grained control over which tests run in development, CI, and production environments
- **The plugin ecosystem** (pytest-cov, pytest-xdist, pytest-asyncio, and 1,300+ others) extends pytest to handle coverage, parallelism, async code, and more
- **AI coding agents** equipped with pytest skills can generate idiomatic, fixture-based test suites automatically

---

## Why pytest Dominates Python Testing

Python ships with \`unittest\` in the standard library, and \`nose2\` still has its advocates. So why has pytest captured the overwhelming majority of the Python testing community?

**Simple syntax.** With unittest, you subclass \`TestCase\`, use \`self.assertEqual()\`, and follow a rigid class-based structure. With pytest, you write plain functions and use the \`assert\` keyword. The barrier to entry is nearly zero.

**Powerful fixtures.** pytest fixtures are a dependency injection system that replaces \`setUp\`/\`tearDown\` with something far more flexible. Fixtures can be scoped, composed, parametrized, and shared across your entire project via \`conftest.py\`.

**Rich plugin ecosystem.** Over 1,300 plugins on PyPI extend pytest for every use case -- parallel execution, async testing, coverage reporting, snapshot testing, BDD, and more. No other Python test framework comes close.

**Better failure output.** When an \`assert\` fails, pytest uses introspection to show you exactly what went wrong -- the values on both sides of the comparison, diffs for strings and data structures, and the exact line of failure. With unittest, you get a generic \`AssertionError\` unless you use the right \`self.assertXxx\` method.

**Backward compatible.** pytest runs existing unittest and nose test suites without modification. You can adopt it incrementally, one test file at a time.

\`\`\`bash
# Install pytest
pip install pytest

# Verify installation
pytest --version
\`\`\`

---

## pytest Basics

### Test Discovery

pytest automatically discovers tests using these conventions:

- Files named \`test_*.py\` or \`*_test.py\`
- Functions and methods prefixed with \`test_\`
- Classes prefixed with \`Test\` (without an \`__init__\` method)

You do not need to register test files or import them anywhere. Just follow the naming convention and pytest finds them.

### Assert Introspection

The most powerful feature of pytest basics is **assert rewriting**. You write plain \`assert\` statements and pytest gives you detailed failure output:

\`\`\`bash
# test_basics.py

def test_addition():
    result = 2 + 2
    assert result == 4

def test_string_contains():
    greeting = "Hello, World!"
    assert "World" in greeting

def test_list_equality():
    expected = [1, 2, 3, 4]
    actual = sorted([4, 2, 1, 3])
    assert actual == expected

def test_dictionary_structure():
    user = {"name": "Alice", "role": "QA Engineer", "active": True}
    assert user["role"] == "QA Engineer"
    assert user["active"] is True
\`\`\`

When a test fails, pytest shows exactly what happened:

\`\`\`bash
def test_addition():
    result = 2 + 3
>   assert result == 4
E   assert 5 == 4

test_basics.py:3: AssertionError
\`\`\`

### Running Tests

\`\`\`bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run a specific file
pytest test_basics.py

# Run a specific test function
pytest test_basics.py::test_addition

# Run tests matching a keyword expression
pytest -k "addition or string"

# Stop on first failure
pytest -x

# Show local variables in tracebacks
pytest -l

# Run last failed tests only
pytest --lf
\`\`\`

---

## Fixtures Deep Dive

**Fixtures** are the heart of pytest. They provide a clean, composable way to set up preconditions for your tests -- database connections, test data, API clients, temporary files, mock services, and anything else your tests need.

### Basic Fixture

\`\`\`bash
# test_fixtures.py
import pytest

@pytest.fixture
def sample_user():
    return {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com",
        "role": "qa_engineer"
    }

def test_user_has_email(sample_user):
    assert "@" in sample_user["email"]

def test_user_role(sample_user):
    assert sample_user["role"] == "qa_engineer"
\`\`\`

pytest sees \`sample_user\` as a parameter name, matches it to the fixture, calls the fixture, and injects the return value into the test function. No inheritance, no \`self\`, no boilerplate.

### Fixture Scopes

By default, fixtures run once per test function. You can change this with the **scope** parameter:

| Scope | Behavior | Use Case |
|---|---|---|
| \`function\` | Runs for each test (default) | Lightweight, isolated test data |
| \`class\` | Runs once per test class | Shared setup within a class |
| \`module\` | Runs once per module | Expensive setup shared across a file |
| \`session\` | Runs once per test session | Database connections, Docker containers |

\`\`\`bash
import pytest

@pytest.fixture(scope="session")
def db_connection():
    """Create a database connection once for the entire test session."""
    conn = create_database_connection()
    yield conn
    conn.close()

@pytest.fixture(scope="function")
def db_transaction(db_connection):
    """Wrap each test in a transaction that rolls back."""
    transaction = db_connection.begin()
    yield db_connection
    transaction.rollback()
\`\`\`

### Yield Fixtures for Teardown

Use \`yield\` instead of \`return\` to add teardown logic. Code after \`yield\` runs after the test completes, regardless of whether the test passed or failed:

\`\`\`bash
import pytest
import tempfile
import os

@pytest.fixture
def temp_config_file():
    """Create a temporary config file, clean up after test."""
    fd, path = tempfile.mkstemp(suffix=".json")
    os.write(fd, b'{"debug": true, "log_level": "INFO"}')
    os.close(fd)
    yield path
    os.unlink(path)

def test_config_file_exists(temp_config_file):
    assert os.path.exists(temp_config_file)

def test_config_content(temp_config_file):
    with open(temp_config_file) as f:
        content = f.read()
    assert '"debug": true' in content
\`\`\`

### conftest.py -- Shared Fixtures

Place fixtures in a \`conftest.py\` file to share them across multiple test files without importing. pytest automatically discovers \`conftest.py\` at every directory level:

\`\`\`bash
# conftest.py (project root or tests/ directory)
import pytest

@pytest.fixture(scope="session")
def api_client():
    """Shared API client for all tests in this directory and below."""
    client = APIClient(base_url="http://localhost:8000")
    client.authenticate(token="test-token")
    yield client
    client.close()

@pytest.fixture
def create_user(api_client):
    """Factory fixture for creating test users."""
    created_users = []

    def _create_user(name, email):
        user = api_client.post("/users", json={"name": name, "email": email})
        created_users.append(user["id"])
        return user

    yield _create_user

    # Cleanup: delete all created users
    for user_id in created_users:
        api_client.delete(f"/users/{user_id}")
\`\`\`

### Autouse Fixtures

Set \`autouse=True\` to apply a fixture to every test automatically, without listing it as a parameter:

\`\`\`bash
@pytest.fixture(autouse=True)
def reset_environment():
    """Reset environment variables before each test."""
    original_env = os.environ.copy()
    yield
    os.environ.clear()
    os.environ.update(original_env)
\`\`\`

---

## Parametrize for Data-Driven Tests

**\`@pytest.mark.parametrize\`** is one of the most powerful features in pytest. It lets you run the same test function with multiple sets of inputs and expected outputs, eliminating code duplication while maximizing coverage.

### Single Parameter

\`\`\`bash
import pytest

@pytest.mark.parametrize("input_value,expected", [
    ("hello", 5),
    ("", 0),
    ("pytest", 6),
    ("a b c", 5),
])
def test_string_length(input_value, expected):
    assert len(input_value) == expected
\`\`\`

This generates four separate test cases, each with its own pass/fail status and clear identification in the output.

### Multiple Parameters

\`\`\`bash
@pytest.mark.parametrize("base,exponent,expected", [
    (2, 0, 1),
    (2, 1, 2),
    (2, 10, 1024),
    (10, 3, 1000),
    (0, 5, 0),
])
def test_power(base, exponent, expected):
    assert base ** exponent == expected
\`\`\`

### Parametrize with IDs

Give each test case a human-readable name:

\`\`\`bash
@pytest.mark.parametrize("status_code,is_success", [
    (200, True),
    (201, True),
    (301, False),
    (404, False),
    (500, False),
], ids=["ok", "created", "redirect", "not-found", "server-error"])
def test_is_success_status(status_code, is_success):
    assert (200 <= status_code < 300) == is_success
\`\`\`

### Stacking Parametrize Decorators

Stack multiple \`@pytest.mark.parametrize\` decorators to create a **cartesian product** of all combinations:

\`\`\`bash
@pytest.mark.parametrize("method", ["GET", "POST", "PUT", "DELETE"])
@pytest.mark.parametrize("content_type", ["application/json", "text/xml"])
def test_api_accepts_content_types(method, content_type):
    """This generates 4 x 2 = 8 test cases."""
    response = make_request(method, "/api/resource", content_type=content_type)
    assert response.status_code != 415  # Not "Unsupported Media Type"
\`\`\`

### Indirect Parametrize

Pass parameters through a fixture instead of directly to the test:

\`\`\`bash
@pytest.fixture
def user_by_role(request):
    """Create a user with the specified role."""
    role = request.param
    return create_test_user(role=role)

@pytest.mark.parametrize("user_by_role", ["admin", "editor", "viewer"], indirect=True)
def test_user_can_read(user_by_role):
    assert user_by_role.can("read")
\`\`\`

---

## Markers and Test Selection

**Markers** let you tag tests with metadata and then select which tests to run based on those tags. This is essential for organizing large test suites.

### Built-in Markers

\`\`\`bash
import pytest
import sys

@pytest.mark.skip(reason="Feature not implemented yet")
def test_future_feature():
    pass

@pytest.mark.skipif(sys.platform == "win32", reason="Unix-only test")
def test_unix_permissions():
    import os
    assert os.access("/tmp", os.W_OK)

@pytest.mark.xfail(reason="Known bug in payment processor -- JIRA-1234")
def test_refund_processing():
    result = process_refund(order_id=42)
    assert result.status == "completed"
\`\`\`

- **\`skip\`**: Always skip this test
- **\`skipif\`**: Skip when a condition is true (platform, Python version, missing dependency)
- **\`xfail\`**: Expect this test to fail -- it is a known issue. If it unexpectedly passes, pytest reports \`XPASS\`

### Custom Markers

Define your own markers to categorize tests:

\`\`\`bash
# pytest.ini or pyproject.toml
[pytest]
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: marks tests requiring external services
    smoke: marks tests for the smoke test suite
    regression: marks regression tests
\`\`\`

\`\`\`bash
import pytest

@pytest.mark.smoke
def test_homepage_loads():
    response = client.get("/")
    assert response.status_code == 200

@pytest.mark.integration
def test_database_connection():
    result = db.execute("SELECT 1")
    assert result is not None

@pytest.mark.slow
@pytest.mark.integration
def test_full_data_migration():
    migrate_all_records()
    assert get_record_count() == 10000
\`\`\`

### Selecting Tests with -m and -k

\`\`\`bash
# Run only smoke tests
pytest -m smoke

# Run integration tests but not slow ones
pytest -m "integration and not slow"

# Run tests whose name contains "database"
pytest -k "database"

# Combine -k with boolean logic
pytest -k "database and not migration"
\`\`\`

Registering markers in \`pytest.ini\` or \`pyproject.toml\` prevents typos. Run \`pytest --strict-markers\` to treat unregistered markers as errors.

---

## Mocking with pytest-mock

Testing in isolation requires mocking external dependencies -- databases, APIs, file systems, time, and environment variables. pytest gives you several options.

### monkeypatch (Built-in)

The \`monkeypatch\` fixture is built into pytest and lets you modify objects, dictionaries, and environment variables for the duration of a test:

\`\`\`bash
def test_api_timeout_from_env(monkeypatch):
    monkeypatch.setenv("API_TIMEOUT", "30")
    from myapp.config import get_timeout
    assert get_timeout() == 30

def test_custom_home_dir(monkeypatch, tmp_path):
    monkeypatch.setenv("HOME", str(tmp_path))
    from myapp.config import get_config_dir
    assert str(tmp_path) in get_config_dir()

def test_disable_network(monkeypatch):
    def mock_urlopen(*args, **kwargs):
        raise ConnectionError("Network disabled in tests")
    monkeypatch.setattr("urllib.request.urlopen", mock_urlopen)
\`\`\`

### pytest-mock Plugin

**pytest-mock** provides the \`mocker\` fixture, which wraps \`unittest.mock\` with a cleaner API and automatic cleanup:

\`\`\`bash
# pip install pytest-mock

def test_send_email(mocker):
    mock_send = mocker.patch("myapp.notifications.send_email")
    mock_send.return_value = {"status": "sent", "message_id": "abc123"}

    from myapp.notifications import notify_user
    result = notify_user("alice@example.com", "Test Subject")

    mock_send.assert_called_once_with(
        to="alice@example.com",
        subject="Test Subject",
        body=mocker.ANY,
    )
    assert result["status"] == "sent"

def test_database_failure(mocker):
    mocker.patch(
        "myapp.db.get_connection",
        side_effect=ConnectionError("Database unreachable"),
    )

    from myapp.db import fetch_users
    with pytest.raises(ConnectionError, match="Database unreachable"):
        fetch_users()

def test_external_api_response(mocker):
    mock_response = mocker.Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"users": [{"id": 1, "name": "Alice"}]}
    mocker.patch("requests.get", return_value=mock_response)

    from myapp.api import get_users
    users = get_users()
    assert len(users) == 1
    assert users[0]["name"] == "Alice"
\`\`\`

### When to Use Which

| Approach | Best For | Cleanup |
|---|---|---|
| \`monkeypatch\` | Env vars, simple attribute replacement | Automatic |
| \`pytest-mock\` (\`mocker\`) | Complex mocks, call assertions, side effects | Automatic |
| \`unittest.mock.patch\` | When you need context managers or decorators | Manual or context manager |

As a rule of thumb, use **monkeypatch** for environment variables and simple overrides. Use **pytest-mock** when you need to assert how functions were called or simulate complex return values.

---

## Essential pytest Plugins

The pytest plugin ecosystem is one of its greatest strengths. Here are the plugins every serious Python testing project should evaluate:

| Plugin | Purpose | Install |
|---|---|---|
| **pytest-cov** | Code coverage reporting with line, branch, and HTML reports | \`pip install pytest-cov\` |
| **pytest-xdist** | Parallel test execution across multiple CPUs | \`pip install pytest-xdist\` |
| **pytest-asyncio** | Test async/await code with native pytest syntax | \`pip install pytest-asyncio\` |
| **pytest-timeout** | Fail tests that exceed a time limit | \`pip install pytest-timeout\` |
| **pytest-sugar** | Pretty progress bars and instant failure output | \`pip install pytest-sugar\` |
| **pytest-html** | Generate standalone HTML test reports | \`pip install pytest-html\` |
| **pytest-randomly** | Randomize test order to catch hidden dependencies | \`pip install pytest-randomly\` |

### pytest-cov -- Coverage Reporting

\`\`\`bash
# Run tests with coverage
pytest --cov=myapp --cov-report=term-missing

# Generate HTML coverage report
pytest --cov=myapp --cov-report=html

# Fail if coverage drops below threshold
pytest --cov=myapp --cov-fail-under=80
\`\`\`

### pytest-xdist -- Parallel Execution

\`\`\`bash
# Run tests across 4 CPU cores
pytest -n 4

# Auto-detect CPU count
pytest -n auto

# Distribute by file (each worker gets whole files)
pytest -n 4 --dist=loadfile
\`\`\`

**pytest-xdist** can cut your test suite runtime dramatically. A 10-minute suite running on \`-n auto\` on an 8-core machine often finishes in under 2 minutes.

### pytest-asyncio -- Async Testing

\`\`\`bash
import pytest

@pytest.mark.asyncio
async def test_async_fetch():
    result = await fetch_data("https://api.example.com/data")
    assert result["status"] == "ok"

@pytest.mark.asyncio
async def test_async_database():
    async with get_async_connection() as conn:
        rows = await conn.fetch("SELECT * FROM users LIMIT 5")
        assert len(rows) == 5
\`\`\`

---

## CI/CD Integration

Running pytest in CI/CD is where your test investment pays off. Here is a production-ready GitHub Actions workflow that runs your Python tests with coverage on every push and pull request.

\`\`\`bash
# .github/workflows/python-tests.yml
name: Python Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11", "3.12", "3.13"]

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: \${{ matrix.python-version }}

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-cov pytest-xdist

      - name: Run tests with coverage
        run: |
          pytest -n auto --cov=myapp --cov-report=xml --cov-fail-under=80 -v

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage.xml
          fail_ci_if_error: true
\`\`\`

This workflow runs your tests across three Python versions in parallel, uses pytest-xdist for parallel test execution within each job, enforces an 80% coverage minimum, and uploads coverage reports to Codecov.

For a deeper dive into CI/CD pipeline design for test suites, see our [CI/CD Testing Pipeline guide](/blog/cicd-testing-pipeline-github-actions).

### pyproject.toml Configuration

Centralize your pytest configuration in \`pyproject.toml\` so CI and local development share the same settings:

\`\`\`bash
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_functions = ["test_*"]
addopts = "-v --strict-markers --tb=short"
markers = [
    "slow: marks tests as slow",
    "integration: marks tests requiring external services",
    "smoke: marks tests for the smoke test suite",
]
filterwarnings = [
    "error",
    "ignore::DeprecationWarning",
]
\`\`\`

---

## Automate Python Testing with AI Agents

Manually writing and maintaining hundreds of pytest tests is time-consuming. AI coding agents like **Claude Code**, **Cursor**, and **GitHub Copilot** can generate pytest test suites automatically -- but only if they understand pytest idioms, fixture patterns, and testing best practices.

This is where **QA Skills** makes a difference. Install a pytest-specific skill into your AI agent, and it gains expert-level knowledge about fixture design, parametrize patterns, marker strategies, and plugin configuration.

\`\`\`bash
# Install pytest patterns skill for your AI agent
npx @qaskills/cli add pytest-patterns

# Install broader Python testing patterns
npx @qaskills/cli add python-testing-patterns
\`\`\`

Once installed, your AI agent will:

- **Generate fixture-based tests** with proper scope, yield teardown, and conftest.py organization
- **Use parametrize** for data-driven coverage instead of duplicating test functions
- **Apply markers** for test categorization and selective execution
- **Configure plugins** like pytest-cov and pytest-xdist in your pyproject.toml
- **Write idiomatic mocks** using monkeypatch and pytest-mock instead of fragile unittest.mock patterns

Browse all available Python testing skills at [qaskills.sh/skills](/skills) or read our [Getting Started guide](/getting-started) to set up your first skill in under 60 seconds.

For teams practicing test-driven development, combine pytest skills with TDD workflows. Our [TDD with AI Agents guide](/blog/tdd-ai-agents-best-practices) covers how to use AI agents for red-green-refactor cycles with pytest.

---

## Frequently Asked Questions

### How is pytest different from unittest?

**pytest** uses plain functions and \`assert\` statements, while **unittest** requires subclassing \`TestCase\` and using specific assertion methods like \`self.assertEqual()\`. pytest's fixture system is more flexible than unittest's \`setUp\`/\`tearDown\`, supporting scoping, composition, and dependency injection. pytest also provides better failure output, a plugin ecosystem, and parametrize for data-driven tests. You can run existing unittest tests with pytest, so migration is incremental.

### What is the recommended directory structure for pytest?

The most common layout places tests in a top-level \`tests/\` directory that mirrors your source structure. For a package called \`myapp\`, you would have \`tests/test_models.py\`, \`tests/test_views.py\`, and so on. Place shared fixtures in \`tests/conftest.py\`. For larger projects, use subdirectories like \`tests/unit/\`, \`tests/integration/\`, and \`tests/e2e/\`, each with their own \`conftest.py\` for scope-specific fixtures.

### How do I run only failed tests from the last run?

Use the \`--lf\` (last failed) flag: \`pytest --lf\`. This re-runs only the tests that failed in your previous session. You can also use \`--ff\` (failed first) to run previously failed tests first, then the rest. These flags use the \`.pytest_cache\` directory to track results between runs.

### Can pytest test async Python code?

Yes. Install the **pytest-asyncio** plugin (\`pip install pytest-asyncio\`) and mark your async test functions with \`@pytest.mark.asyncio\`. You can also create async fixtures using \`async def\` with \`yield\`. For projects using frameworks like FastAPI or aiohttp, pytest-asyncio integrates cleanly with their test clients.

### How do I measure code coverage with pytest?

Install **pytest-cov** (\`pip install pytest-cov\`) and run \`pytest --cov=myapp --cov-report=term-missing\`. This shows which lines are not covered. Add \`--cov-fail-under=80\` to fail the build if coverage drops below 80%. For HTML reports, use \`--cov-report=html\`, which generates an interactive report in \`htmlcov/\`. In CI, output XML with \`--cov-report=xml\` for integration with Codecov or Coveralls.
`,
};
