import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'pytest 9 New Features: Complete Upgrade and Migration Guide',
  description:
    'Everything new in pytest 9 (9.0.3, April 2026) — removed pytest 8 deprecations, approx Mapping fix, -p no: change, pyproject config, plugin compatibility, and a migration checklist.',
  date: '2026-07-03',
  category: 'Reference',
  content: `
# pytest 9 New Features: Complete Upgrade and Migration Guide

pytest 9 landed as **9.0.3 in April 2026**, and it is primarily a cleanup release: it removes deprecations that were warned about throughout the pytest 8 series, tightens a few surprising behaviors, and modernizes configuration. If your test suite is warning-clean on the latest pytest 8, upgrading is usually painless. If you have been ignoring \`DeprecationWarning\`s, this is the release that turns them into hard errors.

This guide walks through what is new in pytest 9, the specific removals carried over from pytest 8, the \`pytest.approx\` Mapping key-order fix, the \`-p no:\` plugin-disable change, configuration updates in \`pyproject.toml\`, plugin compatibility, a deprecation timeline, and a concrete upgrade checklist. Every command and code block is runnable.

## What's New in pytest 9 at a Glance

pytest 9 is a *breaking* major release by design. The pytest team follows a predictable rhythm: features are deprecated in a major line (8.x) with warnings, then removed in the next major (9.0). So the headline of pytest 9 is less "big new APIs" and more "the deprecations you were warned about are now enforced," plus a handful of correctness fixes.

The most consequential changes:

- Removal of long-deprecated APIs from the pytest 8 cycle (node construction, \`py.path\` leftovers, certain hook signatures).
- A correctness fix to \`pytest.approx\` so that comparing mappings no longer depends on key order.
- A behavior change to \`-p no:PLUGIN\` so disabling a plugin is applied consistently and earlier.
- Configuration modernization favoring \`pyproject.toml\` under \`[tool.pytest.ini_options]\`.
- Minimum supported Python and updated typing across the public API.

\`\`\`bash
# Upgrade and confirm the version you actually resolved.
python -m pip install --upgrade "pytest>=9,<10"
pytest --version
# pytest 9.0.3
\`\`\`

Before you upgrade, the single most valuable thing you can do is make your suite warning-clean on pytest 8. Everything below is easier when there are no warnings left to convert into errors.

## Removed Deprecations Carried Over from pytest 8

pytest 9 removes APIs that emitted \`PytestRemovedIn9Warning\` (a subclass of \`DeprecationWarning\`) throughout the 8.x line. The practical way to find your exposure is to run pytest 8 with warnings promoted to errors and fix whatever surfaces.

\`\`\`bash
# On the LATEST pytest 8, turn removal warnings into errors to find dead code paths.
pytest -W error::DeprecationWarning
\`\`\`

Common patterns that break in pytest 9:

\`\`\`python
# BEFORE (deprecated in 8.x, removed in 9): constructing nodes positionally.
class MyItem(pytest.Item):
    def __init__(self, name, parent, extra):
        super().__init__(name, parent)   # positional construction path removed
        self.extra = extra

# AFTER: use from_parent, the supported constructor.
class MyItem(pytest.Item):
    @classmethod
    def from_parent(cls, parent, *, name, extra):
        item = super().from_parent(parent, name=name)
        item.extra = extra
        return item
\`\`\`

Another frequent one is leftover \`py.path.local\` usage. pytest moved to \`pathlib.Path\` (the \`path\` attributes) years ago; pytest 9 removes the compatibility shims.

\`\`\`python
# BEFORE: the old py.path fspath-style attribute.
def test_uses_fspath(request):
    root = request.config.rootdir            # py.path.local, removed
    assert (root / "pytest.ini").check()

# AFTER: pathlib everywhere.
def test_uses_pathlib(request):
    root = request.config.rootpath           # pathlib.Path
    assert (root / "pyproject.toml").exists()
\`\`\`

If your plugins or conftest files still import from private modules or rely on removed hook argument names, run them under the error-promotion flag above and fix each site before you touch the pytest version pin.

## The pytest.approx Mapping Key-Order Fix

\`pytest.approx\` gained a correctness fix in the pytest 9 line: comparing two mappings (dicts) with \`approx\` no longer produces order-sensitive or otherwise surprising results. Previously, certain mapping comparisons could behave inconsistently depending on internal iteration; pytest 9 compares by *keys and values* so that two dicts with the same key/value pairs in any insertion order compare equal within tolerance.

\`\`\`python
import pytest

def test_approx_mapping_is_order_independent():
    computed = {"latency": 0.30000001, "throughput": 100.0}
    expected = {"throughput": 100.0, "latency": 0.3}   # different insertion order

    # In pytest 9 this is reliably True: keys match, values within tolerance.
    assert computed == pytest.approx(expected)

def test_approx_mapping_detects_real_diff():
    computed = {"latency": 0.30, "throughput": 100.0}
    expected = {"latency": 0.30, "throughput": 200.0}   # genuinely different
    assert computed != pytest.approx(expected)

def test_approx_mapping_key_mismatch():
    # Missing/extra keys never compare equal, regardless of tolerance.
    assert {"a": 1.0} != pytest.approx({"a": 1.0, "b": 2.0})
\`\`\`

If you had tests that accidentally passed due to the old behavior — for example asserting on a mapping where a key was silently ignored — those will now fail correctly. That is a good failure: it means the assertion is now checking what you intended.

## The -p no: Plugin Disable Change

The \`-p\` option loads plugins, and \`-p no:NAME\` disables them. In pytest 9 the handling of \`-p no:\` is applied more consistently and earlier in startup, so disabling a plugin reliably prevents it from registering hooks — including plugins that previously slipped in before the disable took effect.

\`\`\`bash
# Disable the cacheprovider plugin for a run.
pytest -p no:cacheprovider

# Disable a third-party plugin, e.g. randomly, deterministically for CI debugging.
pytest -p no:randomly

# You can stack multiple disables.
pytest -p no:cacheprovider -p no:randomly
\`\`\`

The practical impact: if you relied on the older, looser ordering where a \`-p no:\` disable was sometimes ignored for early-registering plugins, that loophole is gone. Anything you explicitly disable now stays disabled. Configure persistent disables in your config file rather than passing flags every run:

\`\`\`toml
# pyproject.toml
[tool.pytest.ini_options]
addopts = "-p no:cacheprovider -ra"
\`\`\`

## Migrating from pytest 8: Step by Step

Migration is safest as a sequence of small, verifiable steps rather than a single version bump.

\`\`\`bash
# 1. Pin to the latest pytest 8 and get warning-clean first.
python -m pip install --upgrade "pytest>=8,<9"
pytest -W error::DeprecationWarning -W error::PendingDeprecationWarning

# 2. Fix everything that surfaced (nodes, py.path, hook signatures, plugin APIs).

# 3. Upgrade pytest and your plugins together.
python -m pip install --upgrade "pytest>=9,<10"
python -m pip install --upgrade pytest-asyncio pytest-cov pytest-randomly

# 4. Run the full suite; watch for newly-failing approx/mapping assertions.
pytest -q

# 5. Confirm the version and lock it in your lockfile / requirements.
pytest --version
\`\`\`

Fixtures, markers, parametrization, and the overall test-authoring model are unchanged in pytest 9 — you do not rewrite tests. The migration is about removed plumbing and a couple of corrected behaviors. If you use async tests, pin \`pytest-asyncio\` to a version that declares pytest 9 support; our [pytest-asyncio testing guide](/blog/pytest-asyncio-testing-guide) covers the async fixture and event-loop specifics that most often trip people up during upgrades.

## Configuration Changes in pyproject.toml

pytest 9 continues the push toward \`pyproject.toml\` as the canonical configuration home. The \`[tool.pytest.ini_options]\` table is the recommended place for settings; \`pytest.ini\` and \`setup.cfg\` still work but \`pyproject.toml\` keeps everything in one modern file.

\`\`\`toml
# pyproject.toml
[tool.pytest.ini_options]
minversion = "9.0"
addopts = "-ra -q --strict-markers --strict-config"
testpaths = ["tests"]
markers = [
  "slow: marks tests as slow (deselect with '-m \\\"not slow\\\"')",
  "integration: requires external services",
]
filterwarnings = [
  "error",
  "ignore::UserWarning",
]
\`\`\`

Two options are worth adopting during the upgrade. \`--strict-markers\` makes an unregistered marker an error, catching typos like \`@pytest.mark.slwo\`. \`--strict-config\` makes unknown config keys an error, catching stale settings. Setting \`minversion = "9.0"\` documents the requirement and fails fast if someone runs an older pytest.

## Fixtures and Markers Still Work the Same

A reassuring point for teams worried about a major bump: the day-to-day authoring API is stable. Fixtures, \`@pytest.fixture\` scopes, \`@pytest.mark.parametrize\`, custom markers, \`conftest.py\` discovery, and the assertion-rewriting magic all behave as they did in pytest 8.

\`\`\`python
import pytest

@pytest.fixture
def api_client():
    client = {"base_url": "https://qaskills.sh"}
    yield client
    # teardown runs after the test, unchanged in pytest 9

@pytest.mark.parametrize(
    "query,expected_min",
    [("playwright", 1), ("pytest", 1), ("cypress", 1)],
)
def test_search_returns_results(api_client, query, expected_min):
    # pretend request; the point is the API surface is identical to pytest 8
    results = fake_search(api_client, query)
    assert len(results) >= expected_min

def fake_search(client, query):
    return [{"slug": f"{query}-skill"}]
\`\`\`

Because the authoring surface is unchanged, existing skills and patterns carry over. Browse the [QA skills directory](/skills) for reusable pytest fixtures, markers, and plugin configurations that already target pytest 9.

## Running a Version Check in CI

Make your CI assert the pytest version so an accidental downgrade in a transitive dependency cannot silently change behavior. A tiny meta-test plus an explicit pin does the job.

\`\`\`python
# tests/test_toolchain.py
import pytest
from packaging.version import Version

def test_pytest_is_v9():
    assert Version(pytest.__version__) >= Version("9.0.0"), (
        f"Expected pytest >= 9, got {pytest.__version__}"
    )
\`\`\`

\`\`\`yaml
# .github/workflows/tests.yml
name: tests
on: [push, pull_request]
jobs:
  pytest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: python -m pip install --upgrade pip
      - run: pip install "pytest>=9,<10" pytest-cov
      - run: pytest --version
      - run: pytest -ra --strict-markers --strict-config
\`\`\`

Pinning \`"pytest>=9,<10"\` prevents an unexpected jump to pytest 10 whenever it ships, while still allowing patch and minor updates within the 9 line.

## Plugin Compatibility

Plugins are the most likely source of upgrade friction, because a plugin that touched removed internals will fail to load. Upgrade plugins in the same change as pytest, and prefer versions that explicitly declare pytest 9 support.

| Plugin | Notes for pytest 9 |
|---|---|
| \`pytest-asyncio\` | Upgrade alongside pytest; verify \`asyncio_mode\` config still set |
| \`pytest-cov\` | Generally compatible; update to the latest patch release |
| \`pytest-randomly\` | Respects the stricter \`-p no:randomly\` disable behavior |
| \`pytest-xdist\` | Update for node-construction internals changes |
| \`pytest-mock\` | Thin wrapper over \`unittest.mock\`; low risk |
| \`pytest-django\` | Check for a release tagged with pytest 9 support |

A quick way to surface a broken plugin is to run collection only and read the load errors:

\`\`\`bash
# Collect without executing; plugin load failures show up immediately.
pytest --collect-only -q

# If a plugin misbehaves, isolate by disabling it.
pytest --collect-only -p no:suspect_plugin
\`\`\`

If a critical plugin has no pytest 9 release yet, either wait, pin pytest to the latest 8.x until it catches up, or contribute the fix upstream. Do not run a mix where the plugin monkeypatches removed internals — that produces confusing failures deep in collection.

## Deprecation and Removal Reference

This table maps the notable pytest 8 deprecations to their pytest 9 status and the fix. Use it as a checklist while grepping your codebase.

| Item | pytest 8 | pytest 9 | Fix |
|---|---|---|---|
| Positional \`Node\` construction | Deprecated | Removed | Use \`Node.from_parent(...)\` |
| \`py.path.local\` attributes (\`rootdir\`, \`fspath\`) | Deprecated | Removed | Use \`rootpath\` / \`path\` (\`pathlib\`) |
| Order-sensitive \`approx\` on mappings | Buggy | Fixed | Compare by keys+values within tolerance |
| Loose \`-p no:\` timing | Inconsistent | Consistent, earlier | Rely on explicit disable staying disabled |
| Unregistered markers | Warn (or opt-in strict) | Encourage \`--strict-markers\` | Register markers in config |
| Private module imports | Discouraged | Broken | Use public \`pytest\` API only |

## Practical Example: Upgrading a Real Suite

To make the migration concrete, here is a condensed walkthrough of upgrading a suite that mixes a custom collection plugin, \`approx\`-based numeric assertions, and \`py.path\` usage in \`conftest.py\`. This is the shape of most real-world upgrades.

The starting \`conftest.py\` has two problems — a \`py.path\` rootdir call and a positionally-constructed item:

\`\`\`python
# conftest.py (BEFORE — fails on pytest 9)
import pytest

def pytest_collect_file(parent, path):
    if path.ext == ".spec":                       # py.path.local API, removed
        return SpecFile(path, parent)              # positional construction, removed

class SpecFile(pytest.File):
    def collect(self):
        yield SpecItem(self.name, self)           # positional construction, removed
\`\`\`

Rewritten for pytest 9 using \`pathlib\` and \`from_parent\`:

\`\`\`python
# conftest.py (AFTER — pytest 9 compatible)
import pytest

def pytest_collect_file(parent, file_path):        # pathlib.Path parameter
    if file_path.suffix == ".spec":
        return SpecFile.from_parent(parent, path=file_path)

class SpecFile(pytest.File):
    def collect(self):
        yield SpecItem.from_parent(self, name=self.path.name)
\`\`\`

Then the numeric assertions. The old test happened to pass because the mapping comparison ignored a missing key; pytest 9 exposes it:

\`\`\`python
# BEFORE: silently passed, hiding a missing 'p99' key.
def test_latency_profile():
    assert measured() == pytest.approx({"p50": 12.0, "p95": 40.0})

# AFTER: assert the full mapping so a missing key fails loudly.
def test_latency_profile():
    assert measured() == pytest.approx({"p50": 12.0, "p95": 40.0, "p99": 88.0})
\`\`\`

Finally, the plugin and pytest are upgraded together and collection is verified before running the full suite:

\`\`\`bash
pip install --upgrade "pytest>=9,<10" pytest-xdist pytest-cov
pytest --collect-only -q      # catch load/collection errors first
pytest -n auto -ra            # then run the whole suite in parallel
\`\`\`

This order — fix internals, correct assertions, upgrade plugins, verify collection, run — turns a scary major bump into a sequence of small, reviewable diffs.

## Upgrade Checklist

Run through this list in order. Each item is independently verifiable, so you always know how far along you are.

1. Update to the latest pytest 8 and run \`pytest -W error::DeprecationWarning\`.
2. Fix every removal warning: node construction, \`py.path\` usage, hook signatures.
3. Register all custom markers in config and add \`--strict-markers\`.
4. Move configuration into \`pyproject.toml\` under \`[tool.pytest.ini_options]\`.
5. Upgrade pytest and all plugins together to pytest-9-compatible versions.
6. Run \`pytest --collect-only -q\` to catch plugin load failures early.
7. Run the full suite and inspect any newly-failing \`approx\` mapping assertions.
8. Add a CI version-check test and pin \`"pytest>=9,<10"\`.
9. Commit the lockfile so the whole team resolves the same versions.

A clean upgrade often reveals latent flakiness that the old, looser behaviors were hiding — corrected \`approx\` comparisons and strict markers surface bugs that were always there. If newly-strict runs expose intermittent failures, our [guide to fixing flaky tests](/blog/fix-flaky-tests-guide) has the diagnostic playbook.

## Deprecation Timeline and What Comes Next

Understanding pytest's release cadence helps you plan upgrades instead of reacting to them. The pattern is consistent: an API is deprecated in a major line with a \`PytestRemovedInNWarning\`, that warning fires throughout every minor and patch release of that line, and the API is removed in the next major. So pytest 8 warned about the things pytest 9 removed, and pytest 9 is already warning (via \`PytestRemovedIn10Warning\`) about what pytest 10 will remove.

The actionable takeaway is to treat warnings as pre-work for the next major. Run \`pytest -W error::pytest.PytestRemovedIn10Warning\` periodically on pytest 9 to see what future-you will have to fix, and address it opportunistically rather than in a crunch when pytest 10 ships. Teams that stay warning-clean effectively never experience a painful major upgrade — each bump is just enforcement of cleanups they already made.

\`\`\`bash
# Surface anything pytest 10 will remove, while you are still on pytest 9.
pytest -W error::pytest.PytestRemovedIn10Warning

# Or capture the full warnings summary without failing the run.
pytest -W always -ra
\`\`\`

This forward-looking hygiene also keeps your plugins honest: a plugin that emits removal warnings on pytest 9 is signalling it will break on pytest 10, giving you time to file an issue or find an alternative before it becomes urgent. If your suite spans both browser and Python layers, the same discipline applies on the JavaScript side — see [what's new in Playwright 2026](/blog/whats-new-playwright-2026) for the equivalent deprecation posture in the Playwright ecosystem.

## Frequently Asked Questions

### When was pytest 9 released?

pytest 9 shipped as version 9.0.3 in April 2026. Like every pytest major release, it enforces removals that were announced with warnings during the previous major line (pytest 8.x). Patch releases in the 9.0 series follow with bug fixes, so pin \`"pytest>=9,<10"\` to receive them while avoiding an unexpected jump to pytest 10.

### What breaks when I upgrade from pytest 8 to pytest 9?

The main breakages are removed deprecated APIs — positional \`Node\` construction, leftover \`py.path.local\` attributes, and private-module imports — plus corrected \`approx\` mapping comparisons that expose assertions which previously passed by accident. Fixtures, markers, and parametrization are unchanged, so you do not rewrite tests. Run \`pytest -W error::DeprecationWarning\` on pytest 8 first to find every affected site.

### What changed with pytest.approx and dictionaries?

pytest 9 fixed \`pytest.approx\` so mapping comparisons no longer depend on key order or internal iteration. Two dicts with the same keys and values, in any insertion order, compare equal within tolerance, while missing or extra keys never match. Tests that relied on the old, order-sensitive behavior may now fail correctly, which is the intended outcome.

### How does the -p no: plugin disable change in pytest 9?

In pytest 9, \`-p no:PLUGIN\` is applied consistently and earlier during startup, so a disabled plugin reliably never registers its hooks — including plugins that previously loaded before the disable took effect. If you depended on the old, looser behavior where some early-registering plugins ignored the disable, that loophole is closed; anything you explicitly disable now stays disabled.

### Do I need to change my pyproject.toml for pytest 9?

You are not forced to, but pytest 9 encourages \`pyproject.toml\` under \`[tool.pytest.ini_options]\` as the canonical config location. Adopt \`--strict-markers\` and \`--strict-config\` in \`addopts\`, register your custom markers, and set \`minversion = "9.0"\`. These catch marker typos and stale config keys during the upgrade rather than letting them pass silently.

### Will my pytest plugins work with pytest 9?

Most maintained plugins work once updated to a version that declares pytest 9 support. Plugins that touched removed internals — some node-construction or private-import paths — need a compatible release. Upgrade plugins in the same change as pytest, then run \`pytest --collect-only -q\` to surface load failures early. If a critical plugin lacks a pytest 9 release, stay on the latest pytest 8 until it catches up.

### How do I find deprecation warnings before upgrading?

On the latest pytest 8, run \`pytest -W error::DeprecationWarning -W error::PendingDeprecationWarning\`. This promotes removal warnings to hard errors so every affected line fails visibly, letting you fix node construction, \`py.path\` usage, and hook-signature issues before you bump the pytest version. Getting warning-clean on pytest 8 is the single most reliable way to make the pytest 9 upgrade uneventful.

## Conclusion

pytest 9 rewards teams that keep their suites warning-clean: if you have been fixing \`DeprecationWarning\`s along the way, the upgrade is a version bump plus a plugin refresh. The corrected \`approx\` mapping comparison and the stricter \`-p no:\` disable are genuine improvements that make your tests mean what they say. Get warning-clean on pytest 8, move config into \`pyproject.toml\`, upgrade plugins together, and pin \`"pytest>=9,<10"\`.

Want ready-made pytest fixtures, markers, and plugin configs tuned for pytest 9? Explore the [QASkills directory](/skills) for reusable QA skills your AI coding agents can install in one command.
`,
};
