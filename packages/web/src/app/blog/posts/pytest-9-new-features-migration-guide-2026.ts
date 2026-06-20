import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pytest 9 New Features & Migration Guide 2026 (from Pytest 8)',
  description:
    'Pytest 9 for 2026: new features, deprecations removed from pytest 8, the new minimum Python version, behavioral changes, and a safe migration checklist.',
  date: '2026-06-20',
  category: 'Guide',
  content: `
# Pytest 9 New Features and Migration Guide 2026

Pytest 9.0 landed in November 2025, with the 9.0.2 patch release following in April 2026. For most teams this is the first major pytest bump since the 8.x series, and like every major release it bundles a mix of quality-of-life improvements, a handful of behavioral changes, and the long-promised removal of deprecations that pytest 8 had been warning about for months. If your CI has been printing PytestRemovedIn9Warning messages, this is the release where those warnings turn into errors.

The good news: for the overwhelming majority of well-maintained suites, migrating from pytest 8 to pytest 9 is a non-event. You upgrade, you run your tests, they pass. The work concentrates in older codebases that still use patterns pytest has been politely asking you to abandon since the 7.x days, things like nose-style setup and teardown methods, the ancient pytest.collect namespace, and yield-based tests that were already gone but still linger in copied-and-pasted snippets.

This guide walks through what actually changed in pytest 9, what got removed, how to read the warnings your current suite emits, and a concrete, conservative migration plan you can run today. Wherever a specific number or behavior could drift between patch releases, treat the official changelog at docs.pytest.org as the source of truth and verify against your installed version. We will pair every concept with runnable pytest code so you can reproduce the behavior locally before you touch CI. If you want a refresher on the fundamentals first, see our [pytest best practices guide](/blog/pytest-best-practices-2026) and the explainer on [what pytest is and why Python teams use it](/blog/what-is-pytest-python-explained).

## Key Takeaways

- Pytest 9.0 shipped November 2025; 9.0.2 patch shipped April 2026.
- The headline change is removal of deprecations carried over from the 8.x cycle, not a redesign.
- Nose-style setup/teardown, the pytest.collect namespace, and yield tests are gone for good.
- The minimum supported Python version moved up; verify your interpreters before upgrading.
- The safe upgrade path is: pin a version, run with -W error, read the changelog, fix warnings, then unpin.
- Most modern suites pass unchanged on pytest 9.

---

## Pytest 8 vs 9 at a glance

Before diving into specifics, here is a high-level comparison of where the two major versions differ. Use it to gauge how much work your migration is likely to involve.

| Area | Pytest 8.x | Pytest 9.x |
|---|---|---|
| Nose-style setup/teardown | Deprecated, warned at runtime | Removed, no longer called |
| pytest.collect namespace | Deprecated shim still present | Removed |
| Yield-based tests | Already removed | Still removed, clearer errors |
| Minimum Python | Older floor (3.8-era) | Raised floor, verify per changelog |
| Deprecation policy | Many PytestRemovedIn9Warning | Those become hard errors |
| Config and ini behavior | Stable | Mostly stable, small tweaks |
| Plugin API | Stable hookspecs | Stable, minor additions |

The single most important row is the first one: if your test classes define setup_method-adjacent nose hooks (setup, teardown, setup_class, teardown_class spelled the nose way), pytest 9 stops invoking them. That can silently skip fixture-like setup and produce confusing failures, so it deserves special attention.

---

## What is new in pytest 9

Major pytest releases are deliberately conservative. The maintainers prioritize backward compatibility, so pytest 9 is less about flashy features and more about cleanup plus incremental polish. The themes are clearer error messages, tightened internals, and the removal of long-deprecated surface area.

Expect improvements in three buckets. First, diagnostics: assertion rewriting and collection error reporting continue to get sharper, so when a test fails the message points you closer to the real cause. Second, configuration hygiene: edge cases in how ini options and command-line flags interact were tightened. Third, internal modernization: the codebase dropped compatibility shims for Python versions it no longer supports, which is what allows the minimum-version bump.

Because exact feature lists shift between 9.0.0, 9.0.1, and 9.0.2, do not memorize a feature from a blog post (including this one) as gospel. Run pytest --version locally, then open the changelog entry for that exact version. The pattern below prints your version and the loaded plugins so you always know what you are testing against.

\`\`\`bash
# Confirm exactly what you are running
pytest --version

# See the full environment: version, plugins, and rootdir
pytest --version -VV

# Dump the resolved configuration pytest will use
pytest --co -q | head
\`\`\`

---

## Deprecations removed in pytest 9

This is the section that actually breaks suites. Pytest follows a published deprecation cadence: a behavior is deprecated in one major line, warns throughout it, then is removed in the next major. Pytest 9 is the removal point for everything that carried a PytestRemovedIn9Warning during the 8.x series.

The big three removals to check for:

- Nose-style setup and teardown methods on test classes.
- The pytest.collect namespace and its module-level aliases.
- Any leftover yield-based test functions (these were already removed earlier, but copied snippets still surface them).

Here is what the nose-style pattern looks like, the one that silently stops working:

\`\`\`python
# OLD: nose-style hooks. Pytest 9 no longer calls these.
class TestOrders:
    def setup(self):
        self.cart = []

    def teardown(self):
        self.cart.clear()

    def test_add_item(self):
        self.cart.append("widget")
        assert self.cart == ["widget"]
\`\`\`

And the supported pytest equivalent, which uses the correctly spelled xunit-style hooks:

\`\`\`python
# NEW: pytest xunit-style hooks. Note the _method suffix.
class TestOrders:
    def setup_method(self, method):
        self.cart = []

    def teardown_method(self, method):
        self.cart.clear()

    def test_add_item(self):
        self.cart.append("widget")
        assert self.cart == ["widget"]
\`\`\`

Even better, prefer a fixture over xunit hooks for anything non-trivial. Fixtures are explicit, composable, and easy to scope. For a deep dive on this, read our [complete guide to pytest fixtures and conftest](/blog/pytest-fixtures-conftest-complete-guide-2026).

\`\`\`python
import pytest

@pytest.fixture
def cart():
    items = []
    yield items
    items.clear()  # teardown runs after the yield

class TestOrders:
    def test_add_item(self, cart):
        cart.append("widget")
        assert cart == ["widget"]
\`\`\`

---

## The minimum Python version bump

Every pytest major release tends to drop support for the oldest Python versions, and pytest 9 is no exception: the supported floor moved up. The practical consequence is that if any of your CI runners or developer laptops are pinned to an interpreter below the new floor, pip will either refuse to install pytest 9 or install an older compatible version, which can mask the upgrade entirely.

Check the floor before you upgrade. The exact minimum is in the changelog, so verify it rather than trusting memory. The commands below tell you which interpreters you have and which one pytest is actually running under.

\`\`\`bash
# Which Python is on PATH right now
python --version

# Which interpreter does the installed pytest use
pytest --version -VV | head -3

# In CI, print the matrix interpreter explicitly
python -c "import sys; print(sys.version)"
\`\`\`

If you maintain a tox or nox matrix, drop any interpreter below the new floor in the same PR that bumps pytest, so the matrix and the dependency move together. A mismatch where the matrix still lists an unsupported Python but the lockfile pins pytest 9 produces hard-to-debug install failures on exactly one runner.

---

## Behavioral changes to watch

Beyond outright removals, a few behaviors were tightened. None of these should surprise a suite that follows current best practices, but they bite copy-pasted or legacy code. The table below catalogs the ones most likely to affect a real suite.

| Change | Old behavior | New behavior | How to detect |
|---|---|---|---|
| Nose hooks | Called with warning | Not called | Search for def setup( and def teardown( |
| pytest.collect | Importable shim | ImportError | grep for pytest.collect |
| Strict markers | Optional | Encouraged via config | Run with --strict-markers |
| Unknown config keys | Sometimes ignored | Flagged more loudly | Run with -W error |
| Return value in tests | Warned | Treated as a hard signal | Tests that return non-None |

A subtle one worth its own note: returning a value from a test function (instead of using assert) has been a warning for a while and pytest treats it as a clear mistake. The fix is mechanical, replace return with assert.

\`\`\`python
# WRONG: returning instead of asserting
def test_total():
    return calculate_total([1, 2, 3]) == 6  # pytest flags this

# RIGHT: assert the condition
def test_total():
    assert calculate_total([1, 2, 3]) == 6
\`\`\`

To surface every one of these at once, run your suite with warnings promoted to errors, which is the single highest-leverage command in the whole migration.

\`\`\`bash
# Turn every warning into a failure so nothing hides
pytest -W error

# Narrow it to just pytest's own deprecation warnings
pytest -W error::DeprecationWarning -W error::pytest.PytestDeprecationWarning
\`\`\`

---

## Parametrize and fixtures still work the same

A reassuring point: the features you use every day did not change. Parametrization, indirect fixtures, fixture scopes, conftest discovery, and markers all behave in pytest 9 exactly as they did in late pytest 8. Your existing parametrized tests need no edits.

\`\`\`python
import pytest

@pytest.mark.parametrize(
    "value, expected",
    [
        (2, 4),
        (3, 9),
        (4, 16),
    ],
    ids=["two", "three", "four"],
)
def test_square(value, expected):
    assert value * value == expected


@pytest.fixture(params=["sqlite", "postgres"])
def db_backend(request):
    return request.param

def test_backend_name_is_known(db_backend):
    assert db_backend in {"sqlite", "postgres"}
\`\`\`

The same applies to conftest.py fixtures shared across a package. If you organize fixtures in a root conftest.py and override them in subpackages, that layering is unchanged in pytest 9.

\`\`\`python
# conftest.py at the project root
import pytest

@pytest.fixture(scope="session")
def api_base_url():
    return "https://staging.example.com"

@pytest.fixture
def auth_headers(api_base_url):
    return {"Authorization": "Bearer test-token", "X-Base": api_base_url}
\`\`\`

---

## How to upgrade safely, step by step

The single most reliable migration strategy is to make the upgrade boring. Do it on a branch, behind a pin, with warnings promoted to errors, and read the changelog before you remove the pin. Here is the exact sequence.

\`\`\`bash
# 1. Create a branch so the upgrade is reversible
git checkout -b chore/pytest-9-upgrade

# 2. See where you stand today
pytest --version

# 3. Upgrade pytest (and common plugins) in the branch
pip install -U pytest pytest-cov pytest-xdist

# 4. Run the suite with warnings as errors to expose every removal
pytest -W error

# 5. Fix what surfaces, commit, and re-run until green
pytest -W error -q
\`\`\`

When the suite is green under -W error, you have effectively proven the migration. Read the changelog one more time for anything specific to your plugins, then commit a clean pin and open the PR. The point of the pin is reproducibility: every developer and every CI run installs the identical version.

\`\`\`text
# requirements-dev.txt or pyproject pin
pytest==9.0.2
pytest-cov==5.0.0
pytest-xdist==3.6.1
\`\`\`

---

## Pinning pytest in CI

Unpinned test tooling is how a green pipeline turns red overnight with no code change. Pin pytest and its plugins to exact versions in your dev requirements, and let a tool like Dependabot or Renovate propose bumps as reviewable PRs rather than silent drift. A minimal GitHub Actions job that enforces the pin and fails on warnings looks like this.

\`\`\`bash
# .github/workflows/tests.yml run step
python -m pip install --upgrade pip
pip install -r requirements-dev.txt   # contains the exact pytest pin
pytest -W error --maxfail=1 -q
\`\`\`

Promoting warnings to errors in CI is the durable version of the migration discipline: it means the next deprecation pytest introduces will fail your build the day it ships a warning, not the day a future major removes the feature. That converts a painful big-bang migration into a steady trickle of one-line fixes.

---

## Handling plugin compatibility

Most migration pain in practice comes not from pytest itself but from third-party plugins that have not yet declared compatibility with pytest 9. Popular plugins like pytest-cov, pytest-xdist, pytest-asyncio, and pytest-django generally ship a compatible release quickly after a major pytest version, but niche or unmaintained plugins can lag for months. The failure mode is usually an import error at collection time or a hookspec mismatch warning when pytest loads the plugin.

The first diagnostic is to list exactly which plugins your environment loads, so you know what you are responsible for. Pytest prints this for you.

\`\`\`bash
# List every active plugin and its version
pytest --version -VV

# Or query installed pytest plugins directly
pip list | grep -i pytest
\`\`\`

When a plugin breaks, you have three options, in order of preference. First, upgrade the plugin to a release that declares pytest 9 support, which is almost always the right fix. Second, if no compatible release exists yet, pin pytest to the last 8.x version temporarily and open an issue upstream so the maintainer is aware. Third, as a last resort for an unmaintained plugin, evaluate whether you still need it; pytest's built-in features have absorbed a lot of functionality that used to require plugins.

\`\`\`bash
# Temporarily disable a single plugin to isolate a failure
pytest -p no:cacheprovider

# Run with a specific plugin disabled to confirm it is the culprit
pytest -p no:problematic_plugin_name
\`\`\`

The -p no: prefix is invaluable during migration. If your suite fails after the upgrade, disabling plugins one at a time quickly tells you whether the problem is pytest 9 itself or a stale plugin, which dramatically narrows your debugging.

---

## A worked example: upgrading a legacy suite

To make this concrete, imagine a real suite that still carries nose-style hooks and a stray pytest.collect import. Running pytest -W error immediately surfaces both. The class below shows the before and after in one place, the kind of diff you will produce repeatedly during a migration.

\`\`\`python
# BEFORE: fails on pytest 9
import pytest.collect  # ImportError on pytest 9

class TestPayments:
    def setup(self):            # no longer called by pytest 9
        self.gateway = "stripe"

    def test_charge(self):
        assert charge(self.gateway, 100) == "ok"
\`\`\`

\`\`\`python
# AFTER: clean on pytest 9
import pytest

@pytest.fixture
def gateway():
    return "stripe"

class TestPayments:
    def test_charge(self, gateway):
        assert charge(gateway, 100) == "ok"
\`\`\`

Notice that the fix does not just satisfy pytest 9, it produces objectively better tests. The fixture is reusable, explicit about its dependency, and easy to parametrize. This is the silver lining of the migration: the patterns pytest removed were the ones worth removing anyway, so cleaning them up improves your suite rather than merely appeasing the tool.

---

## Migration checklist

Run through this table top to bottom. Each row is a concrete action with a way to verify it.

| Step | Action | Verify with |
|---|---|---|
| 1 | Read pytest 9 changelog for your exact version | docs.pytest.org changelog |
| 2 | Confirm all interpreters meet the new Python floor | python --version on every runner |
| 3 | Create an upgrade branch | git checkout -b chore/pytest-9-upgrade |
| 4 | Upgrade pytest and plugins | pip install -U pytest |
| 5 | Run with warnings as errors | pytest -W error |
| 6 | Replace nose setup/teardown with fixtures | grep for def setup( |
| 7 | Remove pytest.collect usages | grep for pytest.collect |
| 8 | Replace return in tests with assert | grep for return in test_ functions |
| 9 | Pin exact versions in dev requirements | requirements-dev.txt |
| 10 | Enable -W error in CI permanently | green pipeline |

Work the list once and your suite is not only on pytest 9, it is hardened against the next deprecation cycle.

---

## Frequently Asked Questions

### When was pytest 9 released?

Pytest 9.0 was released in November 2025, and the 9.0.2 patch release followed in April 2026. As with every major version, the exact dates of intermediate patches are listed in the official changelog at docs.pytest.org. Always check pytest --version locally so you know precisely which release your suite is running against before relying on any version-specific behavior.

### How do I migrate from pytest 8 to pytest 9?

Create a branch, run pip install -U pytest, then run your suite with pytest -W error to promote every deprecation warning to a hard failure. Fix what surfaces, mostly nose-style setup/teardown and any pytest.collect usage, then pin the exact version in your dev requirements. Read the changelog for plugin-specific notes before removing the pin and merging.

### What deprecations were removed in pytest 9?

Pytest 9 removes everything that carried a PytestRemovedIn9Warning during the 8.x series. The most impactful are nose-style setup and teardown methods on test classes, the legacy pytest.collect namespace, and any remaining yield-based test functions. Returning a value from a test instead of asserting is also treated as a clear mistake. Verify against the official changelog for the complete list.

### What is the minimum Python version for pytest 9?

Pytest 9 raised its minimum supported Python version above the 8.x floor. The precise minimum is published in the changelog, so verify it before upgrading rather than trusting a remembered number. If a CI runner uses an interpreter below the floor, pip may install an older pytest instead, silently masking the upgrade and producing confusing matrix failures.

### Will my existing pytest tests still work on pytest 9?

For the vast majority of modern suites, yes, unchanged. Parametrization, fixtures, fixture scopes, conftest discovery, and markers all behave identically to late pytest 8. Work concentrates only in legacy code that uses removed patterns like nose-style hooks or pytest.collect. Running pytest -W error before upgrading CI tells you in minutes whether your suite needs any edits.

### How do I pin pytest to a specific version in CI?

List the exact version in your dev requirements file, for example pytest==9.0.2, alongside pinned versions of your plugins. Install with pip install -r requirements-dev.txt in CI so every run uses the identical version. Add pytest -W error to your test step so future deprecations fail the build immediately, and let Dependabot or Renovate propose version bumps as reviewable pull requests.

### What is the latest version of pytest in 2026?

As of mid-2026 the latest stable line is pytest 9.x, with 9.0.2 released in April 2026. Patch releases continue to ship within the 9.0 series, so run pip index versions pytest or check PyPI for the current build. The changelog at docs.pytest.org is the authoritative record of what each patch contains.

---

## Conclusion

Pytest 9 is the kind of major release the project does well: deliberate, conservative, and focused on cleaning up long-deprecated surface area rather than reinventing the framework. The features you rely on daily, fixtures, parametrization, markers, conftest layering, are untouched. The work is concentrated in removing nose-style hooks, dropping the pytest.collect namespace, and making sure your interpreters meet the new Python floor.

The discipline that makes this easy also makes you future-proof: run pytest -W error, fix what surfaces, pin exact versions, and keep -W error on in CI. Do that and the next deprecation cycle becomes a steady trickle of one-line fixes instead of a migration crunch.

Ready to level up the rest of your testing stack? Browse the QA skills directory at [/skills](/skills) to find ready-to-install skills for pytest, Playwright, and AI coding agents, then drop them straight into your workflow.
`,
};
