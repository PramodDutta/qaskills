---
name: Pytest Best Practices
description: Opinionated pytest patterns for AI agents - conftest fixture scoping, parametrize, markers, pyproject config, coverage, xdist parallelism, mocking, and AAA-structured test naming.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [pytest, python, fixtures, parametrize, conftest, markers, coverage, mocking, xdist]
testingTypes: [unit, integration, regression]
frameworks: [pytest]
languages: [python]
domains: [api, web, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Pytest Best Practices Skill

You are an expert Python test engineer. When the user asks you to write, refactor, or review pytest tests, follow these patterns exactly. Produce tests that are fast, isolated, readable, parametrized where it removes duplication, and configured through `pyproject.toml` rather than scattered defaults. Never write a test that depends on another test having run first.

## Core Principles

1. **One assertion concept per test.** A test verifies a single behavior. Multiple `assert` lines are fine when they describe one outcome; testing two unrelated behaviors in one function is not.
2. **Arrange-Act-Assert, visibly.** Structure every test body in three blocks separated by blank lines. The reader should see setup, the single action under test, then verification.
3. **Fixtures over setup methods.** Use `conftest.py` fixtures for shared setup. Never use `unittest`-style `setUp`/`tearDown` in pytest code.
4. **Scope fixtures as narrowly as correctness allows.** Default to `function` scope. Widen to `module` or `session` only for expensive, read-only resources (DB engine, app client).
5. **Parametrize instead of looping.** A `for` loop inside a test hides which case failed. `@pytest.mark.parametrize` gives one test ID per case.
6. **Tests are isolated and order-independent.** Running with `pytest -p no:randomly` off or with `pytest-xdist` must not change results. No shared mutable module state.
7. **Mock at the boundary you own.** Patch where the name is *looked up*, not where it is defined. Mock network, time, and filesystem; never mock the unit under test.
8. **Configuration lives in `pyproject.toml`.** Markers, test paths, addopts, and coverage settings are declared once, version-controlled, and apply to every developer and CI run.
9. **Name tests as behavior sentences.** `test_<unit>_<condition>_<expected>` reads like a spec line in the report.
10. **Fail fast in CI, explore locally.** CI uses `--strict-markers -ra`; a typo in a marker name must error, not silently skip.

## Project Layout

```
project/
  src/
    payments/
      __init__.py
      gateway.py
  tests/
    conftest.py                 # shared fixtures, root
    unit/
      conftest.py               # unit-only fixtures
      test_gateway.py
    integration/
      conftest.py               # db engine, app client
      test_checkout_flow.py
  pyproject.toml
```

Keep `tests/` outside `src/` and mirror the package tree. Each layer gets its own `conftest.py` so fixtures cascade down but never leak up.

## pyproject.toml Configuration

```toml
[tool.pytest.ini_options]
minversion = "8.0"
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]

# -ra shows reasons for all non-passing; --strict-markers errors on unknown markers
addopts = [
    "-ra",
    "--strict-markers",
    "--strict-config",
    "--import-mode=importlib",
    "--showlocals",
]

markers = [
    "slow: tests that take more than ~1s (deselect with '-m \"not slow\"')",
    "integration: requires a live database or network",
    "smoke: minimal critical-path suite for fast CI gating",
]

[tool.coverage.run]
branch = true
source = ["src"]
omit = ["*/__init__.py", "*/migrations/*"]

[tool.coverage.report]
fail_under = 85
show_missing = true
skip_covered = true
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
```

Install the toolchain pinned: `pip install "pytest>=8" pytest-cov pytest-xdist pytest-mock`.

## conftest.py and Fixture Scopes

```python
# tests/conftest.py
import pytest


@pytest.fixture(scope="session")
def db_engine():
    """Expensive: built once for the whole test session."""
    from sqlalchemy import create_engine

    engine = create_engine("sqlite:///:memory:", future=True)
    _create_schema(engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Cheap and isolated: a transaction per test, rolled back after."""
    from sqlalchemy.orm import Session

    connection = db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()  # undo every write this test made
        connection.close()


@pytest.fixture
def frozen_time(monkeypatch):
    """Pin the clock so time-based logic is deterministic."""
    import payments.gateway as gw

    class _Clock:
        now = 1_700_000_000.0

    monkeypatch.setattr(gw.time, "time", lambda: _Clock.now)
    return _Clock
```

Scope rules in practice: the `db_engine` is created once (`session`), but every test gets a fresh `db_session` (`function`) wrapped in a transaction that is rolled back. This is the fastest correct way to keep DB tests isolated.

### Fixture Factories

When a test needs many similar objects, yield a factory instead of a single value:

```python
@pytest.fixture
def make_order():
    created = []

    def _make(amount=100, currency="USD", status="pending"):
        order = {"amount": amount, "currency": currency, "status": status}
        created.append(order)
        return order

    yield _make
    created.clear()  # teardown


def test_refund_rejects_pending_order(make_order):
    order = make_order(status="pending")
    assert order["status"] == "pending"
```

## Parametrize: Cases, IDs, and Stacking

```python
import pytest
from payments.gateway import normalize_amount, InvalidAmount


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("100", 10000),       # dollars -> cents
        ("100.5", 10050),
        ("0.01", 1),
        ("1_000", 100000),
    ],
    ids=["whole", "half", "min", "underscored"],
)
def test_normalize_amount_converts_to_cents(raw, expected):
    assert normalize_amount(raw) == expected


@pytest.mark.parametrize("bad", ["-1", "abc", "", None])
def test_normalize_amount_rejects_invalid(bad):
    with pytest.raises(InvalidAmount):
        normalize_amount(bad)


# Stacking parametrize multiplies the cases (cartesian product: 2 x 2 = 4 tests)
@pytest.mark.parametrize("currency", ["USD", "EUR"])
@pytest.mark.parametrize("amount", [100, 250])
def test_charge_supports_currency_and_amount(currency, amount):
    result = normalize_amount(str(amount))
    assert result > 0
```

Always pass `ids=` for non-trivial values so the report reads `test_normalize_amount_converts_to_cents[half]` instead of `[100.5-10050]`.

## Markers and Selective Runs

```python
import pytest


@pytest.mark.smoke
def test_health_endpoint_returns_200(client):
    assert client.get("/health").status_code == 200


@pytest.mark.slow
@pytest.mark.integration
def test_full_checkout_persists_order(db_session, client):
    resp = client.post("/checkout", json={"amount": "49.99"})
    assert resp.status_code == 201

    saved = db_session.query("orders").first()
    assert saved is not None
```

Run subsets:

```bash
pytest -m smoke                 # fast gate
pytest -m "not slow"            # local default
pytest -m "integration and not slow"
```

Because `--strict-markers` is set, `@pytest.mark.smok` (typo) raises an error instead of silently registering a new marker.

## Mocking with pytest-mock

```python
def test_charge_calls_gateway_once(mocker):
    # Patch where the name is LOOKED UP, not where requests.post is defined.
    mock_post = mocker.patch("payments.gateway.requests.post")
    mock_post.return_value.status_code = 200
    mock_post.return_value.json.return_value = {"id": "ch_123", "paid": True}

    from payments.gateway import charge

    result = charge(amount_cents=4999, token="tok_visa")

    assert result["id"] == "ch_123"
    mock_post.assert_called_once()
    _, kwargs = mock_post.call_args
    assert kwargs["json"]["amount"] == 4999


def test_charge_retries_on_timeout(mocker):
    import requests

    mock_post = mocker.patch("payments.gateway.requests.post")
    mock_post.side_effect = [requests.Timeout(), mocker.Mock(status_code=200)]

    from payments.gateway import charge_with_retry

    charge_with_retry(amount_cents=100, token="tok")
    assert mock_post.call_count == 2
```

Prefer `mocker` (the `pytest-mock` fixture) over bare `unittest.mock.patch` decorators - it auto-undoes patches at teardown and reads cleaner inside the AAA body.

## Coverage and Parallel Execution

```bash
# Coverage with branch tracking; fails the run if under fail_under (85%)
pytest --cov --cov-report=term-missing

# Parallel across all CPU cores (pytest-xdist). Use for the full suite.
pytest -n auto

# Combine, but note: coverage + xdist needs the cov plugin to merge workers
pytest -n auto --cov --cov-report=xml
```

For xdist to be safe, tests must not write to shared files or fixed ports. Use the `tmp_path` fixture for files and bind to port `0` for servers so the OS assigns a free port per worker.

```python
def test_writes_report_to_isolated_dir(tmp_path):
    report = tmp_path / "out.json"
    report.write_text('{"ok": true}')
    assert report.read_text() == '{"ok": true}'
```

## Testing Exceptions and Warnings

```python
import pytest


def test_divide_raises_with_message():
    with pytest.raises(ZeroDivisionError, match="division by zero"):
        1 / 0


def test_deprecated_api_warns():
    with pytest.warns(DeprecationWarning, match="use charge_v2"):
        legacy_charge(100)


def test_approx_for_floats():
    assert 0.1 + 0.2 == pytest.approx(0.3)
```

Always pass `match=` to `pytest.raises` so a *different* error with the wrong message does not pass the test silently.

## Best Practices

1. **Keep `function` scope as the default.** Only widen a fixture's scope when profiling proves the setup is a bottleneck and the resource is read-only.
2. **Roll back, do not truncate.** For DB tests, wrap each test in a transaction and roll back. It is faster and safer than deleting rows in teardown.
3. **Give every parametrized case an `id`.** Failure reports become self-documenting.
4. **Declare every marker in `pyproject.toml`.** With `--strict-markers`, this catches typos and documents the suite's vocabulary.
5. **Patch at the point of use.** `mocker.patch("mypkg.module.requests")`, never `mocker.patch("requests")`, unless the module imports the whole `requests` module.
6. **Use `tmp_path` and `tmp_path_factory` for all filesystem work.** Never write into the repo or `/tmp` directly.
7. **Run `-n auto` in CI for the full suite, single-process for debugging.** Parallel runs surface hidden ordering dependencies.
8. **Set `fail_under` in coverage config, not in the CI script.** The threshold travels with the repo.
9. **Prefer `pytest.approx` for floats and `match=` for exceptions.** Exact float equality and bare `raises` are the two most common false-pass sources.
10. **Use fixture factories when a test needs N similar objects.** A factory keeps each test explicit about the data it depends on.

## Anti-Patterns to Avoid

1. **Looping over cases inside one test.** When case 3 of 10 fails, you lose which one and the rest never run. Parametrize instead.
2. **`session`-scoped mutable fixtures.** A shared list or dict at session scope leaks state between tests and breaks under `-n auto`.
3. **`time.sleep()` to wait for async work.** Mock the clock or poll a condition. Sleeps make suites slow and flaky.
4. **Asserting on log output as the primary check.** Logs are not a contract. Assert on return values and state; check logs only when logging *is* the feature.
5. **Importing the module under test at the top when you need to patch its dependencies.** Import inside the test (after patching) or patch the attribute on the already-imported module.
6. **One giant `test_everything` function.** If it has three Act blocks, it is three tests wearing a trench coat. Split it.
7. **Catching the exception yourself with try/except and asserting in `except`.** Use `pytest.raises`; a try/except that never raises will pass silently.
8. **Hardcoded ports, paths, or timestamps.** These break parallel runs and CI. Use `port=0`, `tmp_path`, and a frozen-time fixture.

## When to Trigger This Skill

Trigger when the user is working in a Python codebase and asks to:
- Write, scaffold, or refactor pytest tests
- Set up `conftest.py`, fixtures, or fixture scoping
- Add parametrized cases or custom markers
- Configure pytest, coverage, or parallel runs in `pyproject.toml`
- Fix flaky, slow, or order-dependent Python tests
- Add mocking with `pytest-mock` / `monkeypatch`

Do not trigger for JavaScript/TypeScript test frameworks (Jest, Vitest) or for non-pytest Python frameworks unless the user explicitly asks to migrate them to pytest.
