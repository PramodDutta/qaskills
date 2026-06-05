import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pytest Reference Cheatsheet 2026: Every Flag & Fixture',
  description:
    'The complete pytest reference for 2026: every CLI flag, fixture, marker, assertion, and config option for pyproject.toml and pytest.ini, plus plugins and the latest version.',
  date: '2026-06-05',
  category: 'Reference',
  content: `
# Pytest Reference Cheatsheet 2026: Every Flag & Fixture

Pytest is the de facto testing framework for Python, and its appeal is that the basics fit on a sticky note while the depth keeps paying off for years. You write a plain function named \`test_something\`, use a bare \`assert\`, and run \`pytest\` — that is the whole on-ramp. But underneath sits a rich system of fixtures for setup and teardown, markers for categorizing and skipping, parametrization for table-driven tests, a huge plugin ecosystem, and a configuration surface that lets a team encode its conventions once and forget them. This cheatsheet pulls the parts you actually reach for into one scannable reference so you stop hunting through scattered docs mid-task.

This is a 2026 quick-reference covering the command-line flags you type every day, the built-in fixtures worth memorizing, the markers that shape test selection, the assertion patterns that read cleanly, and the configuration for both \`pyproject.toml\` and \`pytest.ini\`. We also cover the essential plugins, the current release line, and what is new. Every example is runnable Python or a real config block. Whether you searched for "pytest official documentation python testing 2026," "pytest 2026 release notes," "current version of pytest may 2026," or "pytest latest version 2026," keep this open in a tab while you write tests.

If you are pairing pytest with AI coding agents, there are installable QA skills for exactly that in the [skills directory](/skills), and the [blog](/blog) has deeper material including [pytest best practices 2026](/blog/pytest-best-practices-2026) and [what is pytest, explained](/blog/what-is-pytest-python-explained). Let's start with the version, then the flags.

## Pytest Version and What's New in 2026

Pytest follows a calendar-influenced, fast-moving release cadence on the 8.x line through 2026, with frequent minor releases that add quality-of-life improvements and deprecate sharp edges ahead of removal. To see exactly what you have installed, ask pytest directly rather than guessing.

\`\`\`bash
# Print the installed pytest version and the plugins it loaded
pytest --version

# Verbose form: shows pytest version, location, and active plugins
pytest --version --version

# From Python, programmatically
python -c "import pytest; print(pytest.__version__)"
\`\`\`

The themes of recent pytest releases are tighter typing, clearer deprecation warnings, and incremental improvements to fixtures and assertion rewriting. Practically, the advice is: pin a version in your lockfile, read the changelog before bumping a minor, and treat \`DeprecationWarning\`s from pytest as a to-do list — they are how the project tells you what will break in the next major. Run your suite with warnings surfaced (covered later) so these never sneak up on you.

| Question | How to answer it locally |
|---|---|
| Which version am I on? | \`pytest --version\` |
| What plugins are active? | \`pytest --version --version\` |
| What changed in this release? | Read the project CHANGELOG for the tag |
| Will my code break next major? | Resolve every pytest \`DeprecationWarning\` |

Because the answer to "the latest version" moves constantly, the durable skill is checking it yourself with the commands above rather than trusting a number written in a blog post.

## Essential CLI Flags

The command line is where you spend most of your pytest time, and a dozen flags cover the vast majority of real usage. The table below is the core set, followed by runnable examples.

| Flag | Effect |
|---|---|
| \`-v\` / \`-vv\` | Verbose / extra-verbose output |
| \`-q\` | Quiet output |
| \`-k EXPR\` | Run tests whose name matches the expression |
| \`-m MARKER\` | Run tests with the given marker |
| \`-x\` | Stop after the first failure |
| \`--maxfail=N\` | Stop after N failures |
| \`-s\` | Do not capture stdout (show prints) |
| \`--lf\` | Run only last-failed tests |
| \`--ff\` | Run failures first, then the rest |
| \`-n N\` | Run in parallel (pytest-xdist) |
| \`--pdb\` | Drop into the debugger on failure |
| \`--co\` | Collect only; list tests without running |

\`\`\`bash
# Run one file, one class, or one test by node id
pytest tests/test_auth.py
pytest tests/test_auth.py::TestLogin
pytest tests/test_auth.py::TestLogin::test_valid_credentials

# Select by name substring (and/or/not supported)
pytest -k "login and not slow"

# Select by marker
pytest -m smoke

# Fail fast and re-run only what failed last time
pytest -x
pytest --lf

# Show print() output and increase verbosity
pytest -s -v

# Parallelize across CPU cores (requires pytest-xdist)
pytest -n auto
\`\`\`

The combination you will type most is \`pytest -x -vv -k <name>\` while iterating on a single failing test, and \`pytest -n auto\` for full-suite runs. \`--lf\` (last-failed) and \`--ff\` (failures-first) turn a red suite into a tight feedback loop because you stop re-running the hundreds of tests that already pass.

## Fixtures: Setup, Teardown, and Scope

Fixtures are pytest's dependency-injection system for test setup and teardown. You declare a fixture with \`@pytest.fixture\`, and any test that names it as a parameter receives its return value. A \`yield\` splits setup (before) from teardown (after), and \`scope\` controls how often it runs.

\`\`\`python
# conftest.py — fixtures here are visible to all tests in the directory tree
import pytest

@pytest.fixture
def sample_user():
    # Setup
    user = {"id": 1, "name": "Ada", "active": True}
    yield user
    # Teardown (runs after the test, even on failure)
    user.clear()

@pytest.fixture(scope="session")
def db_engine():
    engine = create_test_engine()      # expensive: build once per run
    yield engine
    engine.dispose()

@pytest.fixture
def db_session(db_engine):              # fixtures can depend on fixtures
    conn = db_engine.connect()
    txn = conn.begin()
    yield conn
    txn.rollback()                      # keep every test isolated
    conn.close()
\`\`\`

\`\`\`python
# test_users.py
def test_user_is_active(sample_user):   # just name the fixture to use it
    assert sample_user["active"] is True
\`\`\`

The four scopes — \`function\`, \`class\`, \`module\`, \`session\` — trade isolation for speed. The table summarizes them and the most useful built-in fixtures pytest ships.

| Fixture scope | Runs once per | Use for |
|---|---|---|
| \`function\` (default) | Each test | Fresh, isolated state |
| \`class\` | Test class | Shared per-class setup |
| \`module\` | Test file | Shared per-file setup |
| \`session\` | Whole run | Expensive resources (DB, server) |

| Built-in fixture | Provides |
|---|---|
| \`tmp_path\` | A unique temp directory (\`pathlib.Path\`) |
| \`tmp_path_factory\` | Session-scoped temp dir factory |
| \`monkeypatch\` | Patch attrs/env/dicts, auto-undone |
| \`capsys\` / \`capfd\` | Capture stdout/stderr |
| \`caplog\` | Capture log records |
| \`request\` | Introspect the requesting test/fixture |

For more on structuring fixtures well, see [pytest best practices 2026](/blog/pytest-best-practices-2026).

## Parametrization

Parametrization runs the same test body across many inputs, each appearing as a separate test in the report. It is the single biggest lever for coverage-per-line-of-code in pytest.

\`\`\`python
# test_math.py
import pytest

@pytest.mark.parametrize("a, b, expected", [
    (2, 3, 5),
    (0, 0, 0),
    (-1, 1, 0),
    (100, 200, 300),
])
def test_add(a, b, expected):
    assert a + b == expected

# Give readable test ids
@pytest.mark.parametrize("value, ok", [
    ("user@example.com", True),
    ("nope", False),
], ids=["valid-email", "invalid-email"])
def test_is_email(value, ok):
    assert is_valid_email(value) is ok

# Stack decorators for a cartesian product
@pytest.mark.parametrize("x", [1, 2])
@pytest.mark.parametrize("y", [10, 20])
def test_product(x, y):           # runs 4 combinations
    assert x * y > 0
\`\`\`

Each row becomes an independent test that passes or fails on its own, so a single bad input does not mask the others. Use \`ids=\` to make the report readable, and parametrize fixtures (with \`@pytest.fixture(params=[...])\`) when you want every test that uses the fixture to run against each variant.

## Markers

Markers tag tests with metadata for selection and behavior. Pytest ships a few built-in markers and lets you register your own. Register custom markers in config to avoid warnings and typos.

\`\`\`python
# test_markers.py
import pytest

@pytest.mark.smoke                      # custom marker for test selection
def test_homepage_loads():
    assert load("/") == 200

@pytest.mark.skip(reason="endpoint deprecated")
def test_old_api():
    ...

@pytest.mark.skipif(sys.platform == "win32", reason="POSIX only")
def test_signal_handling():
    ...

@pytest.mark.xfail(reason="known bug TICKET-123", strict=True)
def test_known_broken():
    assert buggy() == "fixed"           # expected to fail; strict flags surprises
\`\`\`

| Marker | Effect |
|---|---|
| \`@pytest.mark.skip\` | Always skip this test |
| \`@pytest.mark.skipif(cond)\` | Skip when condition is true |
| \`@pytest.mark.xfail\` | Expected failure (does not fail the run) |
| \`@pytest.mark.parametrize\` | Run across input sets |
| \`@pytest.mark.usefixtures\` | Apply fixtures without naming them |
| custom (e.g. \`smoke\`) | Group for \`-m\` selection |

The \`strict=True\` option on \`xfail\` is valuable: it turns an *unexpected pass* into a failure, so a quietly fixed bug forces you to remove the stale marker instead of letting it rot.

## Assertions and Exception Testing

Pytest rewrites the plain \`assert\` statement to produce rich failure messages, so you rarely need special assert methods. For exceptions, use the \`pytest.raises\` context manager; for floating point, use \`pytest.approx\`.

\`\`\`python
# test_assertions.py
import pytest

def test_plain_asserts():
    result = compute()
    assert result == 42                         # rich diff on failure
    assert "key" in result_dict
    assert isinstance(value, str)

def test_exception_is_raised():
    with pytest.raises(ValueError, match="must be positive"):
        validate(-1)                            # asserts type AND message regex

def test_float_comparison():
    assert 0.1 + 0.2 == pytest.approx(0.3)      # tolerant equality

def test_capture_exception_details():
    with pytest.raises(KeyError) as exc:
        {}["missing"]
    assert "missing" in str(exc.value)
\`\`\`

The \`match=\` argument on \`pytest.raises\` checks the exception message against a regex, letting one assertion verify both that the right error type was raised and that it carried the right message. Prefer it over a bare \`pytest.raises(ValueError)\` when the message is part of the contract.

## Configuration: pyproject.toml and pytest.ini

Centralize project conventions in configuration so every developer and CI run behaves identically. Modern projects use \`[tool.pytest.ini_options]\` in \`pyproject.toml\`; the equivalent \`pytest.ini\` form is shown alongside.

\`\`\`toml
# pyproject.toml
[tool.pytest.ini_options]
minversion = "8.0"
addopts = "-ra -q --strict-markers --strict-config"
testpaths = ["tests"]
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
markers = [
    "smoke: quick critical-path checks",
    "slow: long-running tests",
]
filterwarnings = [
    "error",                       # turn warnings into failures
    "ignore::DeprecationWarning:thirdparty.*",
]
\`\`\`

\`\`\`ini
; pytest.ini (alternative to the pyproject block above)
[pytest]
minversion = 8.0
addopts = -ra -q --strict-markers --strict-config
testpaths = tests
markers =
    smoke: quick critical-path checks
    slow: long-running tests
filterwarnings =
    error
    ignore::DeprecationWarning:thirdparty.*
\`\`\`

| Option | What it does |
|---|---|
| \`addopts\` | Flags applied to every run |
| \`testpaths\` | Where pytest looks for tests |
| \`markers\` | Registers custom markers (no warnings) |
| \`--strict-markers\` | Fail on unregistered markers |
| \`filterwarnings = error\` | Promote warnings to failures |
| \`minversion\` | Refuse to run on older pytest |

The pairing of \`--strict-markers\` and registered \`markers\` catches typos like \`@pytest.mark.smok\` immediately, and \`filterwarnings = error\` is the mechanism that turns those deprecation warnings into the actionable to-do list mentioned earlier.

## Essential Plugins

Pytest's plugin ecosystem is its superpower. A handful are near-universal; install them by name and pytest auto-discovers them.

\`\`\`bash
pip install pytest-xdist pytest-cov pytest-mock pytest-asyncio pytest-randomly
\`\`\`

\`\`\`python
# Using pytest-mock (the 'mocker' fixture wraps unittest.mock)
def test_external_call(mocker):
    fake = mocker.patch("myapp.api.requests.get")
    fake.return_value.json.return_value = {"ok": True}
    assert fetch_status() is True

# Using pytest-asyncio for async tests
import pytest

@pytest.mark.asyncio
async def test_async_handler():
    result = await handle_request()
    assert result.status == 200
\`\`\`

| Plugin | What it adds |
|---|---|
| \`pytest-xdist\` | Parallel runs (\`-n auto\`) |
| \`pytest-cov\` | Coverage reporting (\`--cov\`) |
| \`pytest-mock\` | The \`mocker\` fixture |
| \`pytest-asyncio\` | \`async def\` test support |
| \`pytest-randomly\` | Randomize test order to expose coupling |
| \`pytest-timeout\` | Kill tests that hang |

\`\`\`bash
# Coverage report with a minimum threshold that fails the build
pytest --cov=myapp --cov-report=term-missing --cov-fail-under=85
\`\`\`

\`pytest-randomly\` is underrated: by shuffling test order each run it surfaces hidden inter-test dependencies that a fixed order would hide until the worst possible moment. For how pytest compares to the standard library option, see [unittest vs pytest in 2026](/blog/unittest-vs-pytest-2026).

## conftest.py, Hooks, and Test Discovery

The \`conftest.py\` file is pytest's mechanism for sharing fixtures and hooks without imports. Drop one in a directory and everything in that directory tree can use the fixtures it defines — no \`import\` statement needed, because pytest collects \`conftest.py\` automatically. Nest them: a root \`conftest.py\` holds project-wide fixtures, while a subdirectory \`conftest.py\` adds fixtures scoped to that area. This is how large suites stay organized without a tangle of shared-helper imports.

\`\`\`python
# conftest.py — fixtures + a hook to add a CLI option and a marker
import pytest

def pytest_addoption(parser):
    parser.addoption("--env", default="staging", help="target environment")

@pytest.fixture
def env(request):
    return request.config.getoption("--env")

def pytest_collection_modifyitems(config, items):
    # Auto-mark every test in a 'slow' path so '-m "not slow"' works.
    for item in items:
        if "slow" in str(item.fspath):
            item.add_marker(pytest.mark.slow)
\`\`\`

Discovery follows the \`python_files\`, \`python_classes\`, and \`python_functions\` patterns from your config: by default pytest collects files matching \`test_*.py\` or \`*_test.py\`, classes prefixed \`Test\` (with no \`__init__\`), and functions prefixed \`test_\`. You can inspect exactly what pytest will run without running it using collection-only mode, which is invaluable when a test "isn't being picked up."

\`\`\`bash
# List every test pytest would collect, without executing any
pytest --collect-only -q

# Show why a path was or wasn't collected (and import errors)
pytest --collect-only tests/ 2>&1 | head
\`\`\`

The most common "my test won't run" causes are a filename that does not match \`test_*.py\`, a test class that has an \`__init__\` method (pytest skips those), or an import error in the module that makes collection fail silently in the summary. \`--collect-only\` surfaces all three immediately.

## Output, Reporting, and Common Recipes

Controlling output is a daily need, and pytest gives you fine-grained switches. The \`-r\` flag controls the short test summary at the end — \`-ra\` shows reasons for everything except passes, which is the most useful default. Tracebacks have several styles, and you can capture or release stdout as needed.

\`\`\`bash
# Summary of all non-passing outcomes (skips, xfails, errors, fails)
pytest -ra

# Traceback styles: short, long, line, native, or none
pytest --tb=short
pytest --tb=line
pytest --tb=no

# Show the N slowest tests to find performance hot spots
pytest --durations=10

# Produce a JUnit XML report for CI dashboards
pytest --junitxml=report.xml

# Re-run only failures from the previous run, then stop on first new failure
pytest --lf -x
\`\`\`

The table below collects the recipes you will reach for most often, mapping a goal to the exact invocation.

| Goal | Command |
|---|---|
| Iterate on one failing test | \`pytest path::test -vv -x\` |
| Re-run only last failures | \`pytest --lf\` |
| Run failures first | \`pytest --ff\` |
| Full suite, all cores | \`pytest -n auto\` |
| Coverage with a gate | \`pytest --cov=app --cov-fail-under=85\` |
| Find slow tests | \`pytest --durations=10\` |
| Drop to debugger on fail | \`pytest --pdb\` |
| List tests without running | \`pytest --collect-only\` |
| CI report | \`pytest --junitxml=report.xml\` |

\`--durations=10\` deserves a special mention: it prints the ten slowest tests (and their setup/teardown), which is the fastest way to find the handful of tests dragging your suite down so you can mark them \`slow\` or speed them up. Wire \`--junitxml\` into CI so the platform can render pass/fail trends and surface flaky tests over time.

## Frequently Asked Questions

### What is the latest version of pytest in 2026?

Pytest ships frequent minor releases on the 8.x line through 2026, so the precise "latest" number changes constantly. Rather than trust a static number, check what you have installed with \`pytest --version\`, or \`pytest --version --version\` to also list active plugins. Pin a version in your lockfile and read the project CHANGELOG before bumping a minor release.

### How do I run a single test in pytest?

Pass the node id: \`pytest path/to/test_file.py::TestClass::test_name\` runs exactly one test, and you can stop at the file or class level too. To select by name substring across the suite, use \`pytest -k "login and not slow"\`. Combine with \`-vv\` for detailed output and \`-x\` to stop on the first failure while iterating.

### What is the difference between a fixture and a marker?

A fixture provides setup and teardown and injects a value into tests that request it by name, using \`@pytest.fixture\` with an optional \`yield\` for cleanup. A marker tags a test with metadata — like \`@pytest.mark.skip\`, \`xfail\`, \`parametrize\`, or a custom \`smoke\` tag — to control selection and behavior. Fixtures supply dependencies; markers categorize and modify how tests run.

### Should I use pyproject.toml or pytest.ini for configuration?

Both work and are equivalent in capability. Modern projects favor \`[tool.pytest.ini_options]\` in \`pyproject.toml\` because it keeps all project metadata in one file. Use \`pytest.ini\` if you prefer a dedicated config file or your toolchain expects one. Whichever you choose, set \`addopts\`, register your \`markers\`, enable \`--strict-markers\`, and consider \`filterwarnings = error\`.

### How do I run pytest tests in parallel?

Install \`pytest-xdist\` and run \`pytest -n auto\` to distribute tests across all CPU cores, or \`-n 4\` for a fixed worker count. Ensure your tests are isolated — shared mutable state or order dependence will cause flaky parallel failures. Pairing xdist with \`pytest-randomly\` helps surface hidden coupling before it bites you in CI.

### How do I assert that an exception is raised?

Use the \`pytest.raises\` context manager: \`with pytest.raises(ValueError, match="must be positive"): validate(-1)\`. The \`match\` argument checks the exception message against a regex, so a single assertion verifies both the exception type and its message. To inspect the exception object further, capture it with \`as exc\` and assert on \`str(exc.value)\`.

### What pytest plugins should every project install?

Start with \`pytest-cov\` for coverage, \`pytest-xdist\` for parallelism, \`pytest-mock\` for the \`mocker\` fixture, and \`pytest-randomly\` to randomize test order and expose coupling. Add \`pytest-asyncio\` for async code and \`pytest-timeout\` to kill hangs in CI. Install them with pip and pytest auto-discovers them; no registration is required beyond the package being present.

## Conclusion

Pytest earns its dominance by keeping the simple things simple — a function, a bare \`assert\`, the \`pytest\` command — while offering fixtures, parametrization, markers, and a plugin ecosystem deep enough to scale to the largest suites. The flags in this cheatsheet (\`-k\`, \`-m\`, \`-x\`, \`--lf\`, \`-n auto\`) cover daily work; the fixtures and config blocks encode your team's conventions once; and \`--strict-markers\` plus \`filterwarnings = error\` keep the suite honest as pytest evolves.

Keep this page open while you write tests, and check your version with \`pytest --version\` rather than trusting a static number. For installable QA skills that teach AI agents these patterns, see the [skills directory](/skills), and continue with [pytest best practices 2026](/blog/pytest-best-practices-2026) and [unittest vs pytest in 2026](/blog/unittest-vs-pytest-2026) on the [blog](/blog).
`,
};
