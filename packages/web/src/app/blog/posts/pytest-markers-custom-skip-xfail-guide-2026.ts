import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Pytest Markers Guide 2026: skip, xfail & Custom Markers",
  description: "Learn pytest markers in 2026 — skip, skipif, xfail, custom markers, registering them in pyproject.toml, and silencing the unknown pytest mark warning.",
  date: "2026-06-15",
  category: "Python",
  content: `# Pytest Markers Guide 2026: skip, xfail & Custom Markers

Pytest markers are decorators that attach metadata to tests so you can change how they run or select them. The built-in ones you use most are \`@pytest.mark.skip\` (never run this test), \`@pytest.mark.skipif(condition, reason=...)\` (skip only when a condition is true), and \`@pytest.mark.xfail\` (expect this test to fail). You can also define **custom markers** like \`@pytest.mark.slow\` to group tests, then run subsets with \`pytest -m slow\`. To stop pytest warning about unknown markers, register every custom marker in \`pyproject.toml\` (or \`pytest.ini\`) under \`markers\`. This guide covers all of it with copy-paste examples.

## What a marker is

A marker is just a label applied with \`@pytest.mark.<name>\`. Pytest ships several built-in markers that change execution, and you can invent your own for **selection** and **organization**. Markers can be applied three ways: as a decorator on a test function, on a class (applying to all its methods), or globally in a module via \`pytestmark\`.

\`\`\`python
import pytest

# 1. On a single test
@pytest.mark.slow
def test_full_import():
    ...

# 2. On a whole class
@pytest.mark.integration
class TestPayments:
    def test_charge(self): ...
    def test_refund(self): ...

# 3. On every test in the module
pytestmark = pytest.mark.smoke
\`\`\`

Markers do nothing on their own beyond labeling — their power comes from selecting tests (\`-m\`), from the built-in behaviors (\`skip\`, \`xfail\`), or from plugins that read them.

## Skipping tests with skip and skipif

\`@pytest.mark.skip\` unconditionally prevents a test from running. Always give a \`reason\` so the report explains why.

\`\`\`python
@pytest.mark.skip(reason="awaiting fix for ENG-1421")
def test_legacy_export():
    ...
\`\`\`

\`@pytest.mark.skipif\` skips only when a condition evaluates truthy at collection time. This is the right tool for platform- or version-specific tests.

\`\`\`python
import sys
import pytest

@pytest.mark.skipif(
    sys.version_info < (3, 12),
    reason="requires Python 3.12+ syntax",
)
def test_new_syntax():
    ...
\`\`\`

You can also skip imperatively from inside a test body when the decision depends on runtime state, using \`pytest.skip()\`:

\`\`\`python
def test_requires_gpu():
    if not gpu_available():
        pytest.skip("no GPU on this runner")
    ...
\`\`\`

To skip an entire module when an optional dependency is missing, combine \`pytest.importorskip\` at the top of the file:

\`\`\`python
import pytest
pandas = pytest.importorskip("pandas")  # skips the whole module if pandas isn't installed
\`\`\`

A subtle but important point: \`skipif\`'s condition is evaluated during **collection**, while a \`pytest.skip()\` call runs during **test execution**. Use the decorator for conditions known up front (Python version, OS) and the function call for conditions you only learn while the test runs.

## Marking expected failures with xfail

\`@pytest.mark.xfail\` says "I expect this test to fail." When it fails, pytest reports it as **xfail** (expected failure) instead of a failure; when it unexpectedly passes, it reports **xpass**. This is how you track known bugs without breaking the build.

\`\`\`python
@pytest.mark.xfail(reason="rounding bug, tracked in ENG-1500")
def test_currency_rounding():
    assert round_money(0.1 + 0.2) == 0.3  # currently fails
\`\`\`

Several options shape \`xfail\` behavior:

| Option | Effect |
|---|---|
| \`reason="..."\` | Documents why; shown in the report |
| \`condition\` (first positional) | Only treat as xfail when the condition is true |
| \`raises=SomeError\` | Only count as xfail if it fails with that specific exception; any other error is a real failure |
| \`strict=True\` | An **xpass** becomes a hard failure — use this to be alerted the moment a bug is fixed so you can remove the marker |
| \`run=False\` | Do not even run the test (useful if it crashes the interpreter) |

\`\`\`python
@pytest.mark.xfail(
    sys.platform == "win32",
    raises=PermissionError,
    strict=True,
    reason="symlink perms differ on Windows",
)
def test_symlink_perms():
    ...
\`\`\`

\`strict=True\` is widely recommended for \`xfail\` because a silently-passing xfail can hide a regression in the surrounding code. Many teams set \`xfail_strict = true\` globally (see the config section) so every xfail is strict by default.

## Custom markers for selection

Custom markers let you carve your suite into groups and run them independently. Define and use them like any marker:

\`\`\`python
@pytest.mark.slow
def test_million_row_import():
    ...

@pytest.mark.integration
def test_talks_to_real_db():
    ...
\`\`\`

Then select with the \`-m\` flag, which accepts boolean expressions:

\`\`\`bash
pytest -m slow                  # only slow tests
pytest -m "not slow"            # everything except slow
pytest -m "integration and not slow"
pytest -m "smoke or sanity"
\`\`\`

This is far cleaner than scattering tests across directories. A typical layout marks the expensive tests \`slow\` and the fast ones go unmarked, so developers run \`pytest -m "not slow"\` locally and CI runs the full set. To preview which tests a marker selects without running them, add \`--collect-only\`:

\`\`\`bash
pytest -m integration --collect-only
\`\`\`

For framework-agnostic approaches to grouping and selecting tests, browse the [QA skills directory](/skills).

## Registering custom markers (and silencing the unknown-marker warning)

When you use a marker pytest does not recognize, you get this warning:

\`\`\`text
PytestUnknownMarkWarning: Unknown pytest.mark.slow - is this a typo?
You can register custom marks to avoid this warning - for details, see
https://docs.pytest.org/en/stable/how-to/mark.html
\`\`\`

Pytest emits it deliberately so a typo like \`@pytest.mark.slwo\` cannot silently make a test always run. The fix is to **register** every custom marker. In modern projects this lives in \`pyproject.toml\`:

\`\`\`toml
# pyproject.toml
[tool.pytest.ini_options]
markers = [
    "slow: marks tests as slow (deselect with '-m \\"not slow\\"')",
    "integration: tests that hit external services",
    "smoke: minimal critical-path checks",
]
\`\`\`

If you still use \`pytest.ini\`, the equivalent is:

\`\`\`ini
# pytest.ini
[pytest]
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: tests that hit external services
    smoke: minimal critical-path checks
\`\`\`

\`setup.cfg\` and \`tox.ini\` accept the same \`[tool:pytest]\`/\`[pytest]\` section. Each entry is \`name: optional description\` — the description appears when you run \`pytest --markers\`, which lists every registered marker (built-in and custom).

To turn the warning into a hard error so an unregistered marker fails the run — a great CI guardrail — enable strict markers:

\`\`\`toml
[tool.pytest.ini_options]
addopts = "--strict-markers"
markers = [
    "slow: slow tests",
    "integration: external-service tests",
]
\`\`\`

With \`--strict-markers\`, any \`@pytest.mark.typo\` aborts collection with an error instead of a warning, catching mistakes immediately. Pairing \`--strict-markers\` with the \`markers\` list is the recommended setup for any serious project. For comparisons of how other ecosystems handle test tagging, see the [framework comparison hub](/compare).

## Adding arguments and parametrizing with markers

Markers accept positional and keyword arguments, which plugins and your own fixtures can read. A common example is \`@pytest.mark.parametrize\`, technically a built-in marker that generates multiple test cases:

\`\`\`python
@pytest.mark.parametrize(
    "value, expected",
    [(2, 4), (3, 9), (4, 16)],
    ids=["two", "three", "four"],
)
def test_square(value, expected):
    assert value * value == expected
\`\`\`

You can also stack markers and even apply a marker to a single parametrized case using \`pytest.param\`:

\`\`\`python
@pytest.mark.parametrize(
    "n",
    [
        1,
        2,
        pytest.param(0, marks=pytest.mark.xfail(reason="zero not supported")),
    ],
)
def test_reciprocal(n):
    assert 1 / n
\`\`\`

Here only the \`n=0\` case is marked \`xfail\`, while \`1\` and \`2\` run normally.

## Reading markers in conftest.py

Custom markers become powerful when a fixture or hook inspects them. For instance, to auto-skip every test marked \`integration\` unless an env var is set, add a hook in \`conftest.py\`:

\`\`\`python
# conftest.py
import os
import pytest

def pytest_collection_modifyitems(config, items):
    if os.environ.get("RUN_INTEGRATION") == "1":
        return
    skip_integration = pytest.mark.skip(reason="set RUN_INTEGRATION=1 to run")
    for item in items:
        if "integration" in item.keywords:
            item.add_marker(skip_integration)
\`\`\`

Now \`pytest\` skips integration tests by default, and \`RUN_INTEGRATION=1 pytest\` runs them — no per-test decorator changes needed.

## A realistic end-to-end example

A small test module showing markers working together:

\`\`\`python
import sys
import pytest

pytestmark = pytest.mark.unit  # whole module is "unit" by default


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX paths only")
def test_resolve_symlink():
    ...


@pytest.mark.xfail(strict=True, reason="precision bug ENG-1500")
def test_money_addition():
    assert 0.1 + 0.2 == 0.3


@pytest.mark.slow
@pytest.mark.parametrize("rows", [10_000, 100_000, 1_000_000])
def test_bulk_insert(rows):
    ...
\`\`\`

with the matching config:

\`\`\`toml
[tool.pytest.ini_options]
addopts = "--strict-markers"
xfail_strict = true
markers = [
    "unit: fast, isolated unit tests",
    "slow: long-running tests (deselect with -m 'not slow')",
]
\`\`\`

Run \`pytest -m "unit and not slow"\` for a quick local loop, and the full \`pytest\` in CI.

## CI usage

In CI, markers shine for splitting fast and slow suites. A common pattern runs the quick set on every push and the full set nightly:

\`\`\`yaml
- name: Fast tests
  run: pytest -m "not slow" --strict-markers

- name: Full suite (nightly)
  if: github.event_name == 'schedule'
  run: pytest --strict-markers
\`\`\`

Always include \`--strict-markers\` in CI so a renamed or mistyped marker fails the pipeline instead of silently running (or skipping) tests. Combine with \`xfail_strict = true\` so a fixed bug surfaces as an xpass failure, prompting you to remove the stale marker.

## Common errors and troubleshooting

**\`PytestUnknownMarkWarning: Unknown pytest.mark.x\`** — The marker is not registered. Add it to the \`markers\` list in \`pyproject.toml\`/\`pytest.ini\`. Add \`--strict-markers\` to turn future typos into errors.

**An xfail test "passes" but the build still goes red** — You set \`strict=True\` (or \`xfail_strict = true\`), and the test now passes (xpass). That is intentional: the bug is fixed, so remove the \`xfail\` marker.

**\`skipif\` condition never triggers** — Remember the condition is evaluated at collection time and must be truthy. If the value is only known at runtime, use \`pytest.skip()\` inside the test body instead.

**\`-m slow\` runs nothing** — No test carries that marker, or you mistyped it. Run \`pytest --markers\` to list registered markers and \`pytest -m slow --collect-only\` to see matches.

**A whole module should be skipped when a dependency is missing** — Use \`pytest.importorskip("package")\` at the top of the file rather than decorating each test.

For more Python testing patterns and plugin guides, browse the [blog](/blog).

## Frequently Asked Questions

### What is the difference between skip and xfail in pytest?

\`@pytest.mark.skip\` prevents a test from running at all and reports it as skipped, which is right when a test is irrelevant or temporarily disabled. \`@pytest.mark.xfail\` still runs the test but expects it to fail, reporting an expected failure (xfail) when it does and an unexpected pass (xpass) when it does not. Use \`skip\` to exclude a test and \`xfail\` to document a known bug while keeping the test executing so you notice when it is fixed.

### How do I register a custom pytest marker?

Add the marker to the \`markers\` list under \`[tool.pytest.ini_options]\` in \`pyproject.toml\` (or the \`[pytest]\` section of \`pytest.ini\`), with the format \`name: description\`. For example, \`markers = ["slow: long-running tests"]\`. Once registered, the marker appears in \`pytest --markers\` and the unknown-marker warning disappears for that name.

### How do I fix the "Unknown pytest.mark" warning?

The warning means you used a marker pytest does not know about, which protects you from typos silently disabling behavior. Register the marker in the \`markers\` list of your \`pyproject.toml\` or \`pytest.ini\`, and the warning goes away. Adding \`--strict-markers\` to \`addopts\` upgrades any future unregistered marker from a warning to a hard error.

### How do I run only tests with a specific marker?

Use the \`-m\` flag with the marker name, for example \`pytest -m slow\`. The flag accepts boolean expressions, so \`pytest -m "not slow"\`, \`pytest -m "smoke or sanity"\`, and \`pytest -m "integration and not slow"\` all work. Add \`--collect-only\` to preview which tests match without executing them.

### What does strict=True do on xfail?

With \`strict=True\`, a test marked \`xfail\` that unexpectedly passes (an xpass) is reported as a hard failure instead of being tolerated. This alerts you the moment the underlying bug is fixed so you can remove the now-stale marker. Many teams enable it globally via \`xfail_strict = true\` in their pytest config so every xfail is strict by default.

### How do I skip a whole test module if a dependency is missing?

Call \`pytest.importorskip("package_name")\` at the top of the module; if the import fails, pytest skips every test in that file with a clear reason. This is cleaner than wrapping each test in \`skipif\`. For runtime conditions discovered inside a test, call \`pytest.skip("reason")\` from within the test body instead.
`,
};
