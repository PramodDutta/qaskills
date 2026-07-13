import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'pytest “Fixture Not Found” conftest.py Fix',
  description:
    'Fix pytest fixture not found errors by tracing conftest.py visibility, root directory selection, naming, plugins, imports, and collection with repeatable checks.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# pytest “Fixture Not Found” conftest.py Fix

Pytest prints the fixtures it can see directly beneath \`fixture 'customer' not found\`. That list is the fastest clue in the traceback. If neighboring fixtures from the same \`conftest.py\` are absent, the file was not loaded in this collection tree. If they appear but \`customer\` does not, focus on spelling, registration, parametrization, or an import failure instead of moving files at random.

Fixture lookup follows collection structure. A test can use fixtures from its module, its class, applicable \`conftest.py\` files on the path from the test directory upward, and installed plugins. It cannot search downward into a child directory or sideways into a sibling's \`conftest.py\`. Understanding that direction resolves most discovery failures.

## Read the error as a visibility report

Start with the exact node that failed and the available-fixture list. Do not begin by explicitly importing the fixture. A direct import can make one test pass while bypassing pytest's directory-scoped plugin model and hiding the underlying layout problem.

Run the failing node from the environment used in CI:

\`\`\`bash
python -m pytest tests/api/test_customers.py::test_customer_can_be_loaded -vv
python -m pytest --fixtures-per-test tests/api/test_customers.py::test_customer_can_be_loaded
python -m pytest --trace-config -q
\`\`\`

\`--fixtures-per-test\` shows fixtures used by the selected test. \`--fixtures\` lists available fixtures more broadly. \`--trace-config\` reports registered plugins and loaded \`conftest.py\` plugin modules, which is particularly valuable when the wrong test root is being collected or a plugin was expected but not installed.

| Observation | Likely cause | Next check |
|---|---|---|
| No fixtures from the expected conftest | File is outside the ancestor path or not loaded | Inspect node path and rootdir |
| Other local fixtures appear | Fixture name differs or definition did not register | Search exact function and decorator |
| Third-party fixture absent | Plugin missing, disabled, or not registered | Read \`--trace-config\` output |
| Works from subdirectory only | Root selection or config differs by working directory | Compare config discovery and arguments |
| Collection reports import error first | Conftest failed while importing | Fix the first traceback, not the later symptom |

The fixture error is often downstream. Pytest may stop collection on a syntax error, missing application module, or invalid plugin import in \`conftest.py\`. Always fix the earliest exception in the run.

## Draw the directory search path

Given this repository:

\`\`\`text
project/
├── pyproject.toml
├── tests/
│   ├── conftest.py          # api_client
│   ├── api/
│   │   ├── conftest.py      # customer
│   │   └── test_customers.py
│   └── ui/
│       ├── conftest.py      # browser_page
│       └── test_checkout.py
└── src/
    └── shop/
\`\`\`

\`tests/api/test_customers.py\` can request \`customer\` and \`api_client\`. It cannot request \`browser_page\` because finding it would require walking into the sibling \`ui\` directory. Moving \`browser_page\` to \`tests/conftest.py\` makes it visible to both branches, but that is correct only if both branches should depend on a browser.

Fixture placement communicates scope:

| Definition location | Intended visibility | Typical content |
|---|---|---|
| Test class | Methods in that class | Scenario-local state |
| Test module | Tests in one file | Narrow input builders |
| Child \`conftest.py\` | Tests in that directory subtree | API-only database or UI-only driver |
| Top-level test \`conftest.py\` | Most repository tests | Shared application factory |
| Pytest plugin module | Any suite that loads the plugin | Reusable organization or package fixtures |

Do not move every fixture to the highest conftest just to maximize discovery. A session-scoped production-like database should not become available to unit tests by accident. Keep dependencies as local as practical, then promote them when multiple legitimate branches need them.

For a broader design treatment, read the [pytest fixtures and conftest guide](/blog/pytest-fixtures-conftest-complete-guide-2026). Once discovery works, use the [pytest fixture scope guide](/blog/pytest-fixtures-scope-complete-guide) to choose function, class, module, package, or session lifetime deliberately.

## Put the fixture on the test's ancestor chain

The direct fix is often a layout change. Suppose an API test needs a customer fixture currently stored under \`tests/fixtures/conftest.py\`. That directory is a sibling of \`tests/api\`, so pytest will not search it. Either move the fixture to \`tests/conftest.py\`, keep it in \`tests/api/conftest.py\`, or turn the fixture module into an explicit plugin.

A clean local arrangement looks like this:

\`\`\`python
# tests/api/conftest.py
from collections.abc import Iterator

import pytest
from shop.testing import ApiClient


@pytest.fixture
def api_client() -> Iterator[ApiClient]:
    client = ApiClient(base_url='http://127.0.0.1:8000')
    yield client
    client.close()


@pytest.fixture
def customer(api_client: ApiClient) -> dict[str, object]:
    created = api_client.post(
        '/test-support/customers',
        json={'name': 'Ada Test', 'tier': 'standard'},
    )
    assert created.status_code == 201
    return created.json()
\`\`\`

\`\`\`python
# tests/api/test_customers.py
from shop.testing import ApiClient


def test_customer_can_be_loaded(
    api_client: ApiClient,
    customer: dict[str, object],
) -> None:
    response = api_client.get(f"/customers/{customer['id']}")

    assert response.status_code == 200
    assert response.json()['name'] == 'Ada Test'
\`\`\`

No fixture import appears in the test. Pytest sees \`tests/api/conftest.py\` while collecting the module and injects the value by argument name. Type imports for annotations are ordinary Python imports and do not register fixtures.

## Confirm the name pytest registered

By default, the requested name is the decorated function's name. Renaming the Python function without updating test parameters causes a straightforward failure. The decorator can also publish a different name:

\`\`\`python
# tests/conftest.py
import pytest


@pytest.fixture(name='signed_in_client')
def fixture_signed_in_client(app):
    client = app.test_client()
    client.post('/login', json={'email': 'qa@example.test'})
    return client
\`\`\`

Tests request \`signed_in_client\`, not \`fixture_signed_in_client\`. This naming form is useful when static analysis would otherwise complain that the fixture function is unused, but it can confuse search. Search for both \`def signed_in_client\` and \`name='signed_in_client'\` when tracing ownership.

Remember that \`@pytest.mark.usefixtures('customer')\` requests setup but does not inject the returned value into the test. If the body needs the customer, declare it as an argument. Conversely, adding a fixture parameter only for its side effect is valid, though \`usefixtures\` can state that intent more clearly at class or module level.

## Separate discovery failures from scope mismatch

“Fixture not found” means lookup failed. \`ScopeMismatch\` means lookup succeeded but a broader-lived fixture depends on a narrower-lived fixture. The remedies differ.

This is invalid because a session fixture cannot safely depend on a new function-scoped database connection for every test:

\`\`\`python
import pytest


@pytest.fixture
def db_connection():
    ...


@pytest.fixture(scope='session')
def seeded_catalog(db_connection):
    ...
\`\`\`

Either narrow \`seeded_catalog\`, broaden the dependency with appropriate cleanup, or split session-level schema preparation from function-level transactions. Moving the code between conftest files does not solve a lifetime inversion.

Also distinguish an unknown parametrized argument from a fixture. In \`@pytest.mark.parametrize('region', ['eu'])\`, pytest supplies \`region\`. A typo in the decorator or test signature can make pytest interpret the unmatched argument as a fixture request. Read the parameter names together.

## Stabilize rootdir and configuration

Pytest determines a root directory and configuration based on invocation arguments and recognized config files. Rootdir is not simply a switch that adds application code to \`sys.path\`, but it influences node IDs, cache placement, and which conftest files are considered during collection.

Use one canonical command, usually from the repository root:

\`\`\`toml
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = ["-ra", "--strict-markers"]
pythonpath = ["src"]
\`\`\`

Then invoke \`python -m pytest\` consistently in local scripts and CI. The module form adds the current directory to Python's import path according to normal Python execution behavior, which can differ from a standalone \`pytest\` entry point in some environments. Better still, install the project into the virtual environment in editable mode so imports reflect packaging.

Do not add \`--confcutdir\` casually. That option limits how far upward pytest searches for conftest files. It is useful for embedding suites but can deliberately hide a repository-level conftest. If the error appears only in an IDE, inspect the IDE's working directory, target path, additional pytest arguments, and selected interpreter.

| Invocation difference | Possible discovery effect |
|---|---|
| Running \`pytest tests/api\` from project root | Loads ancestor conftests under the selected tree |
| Running a copied test outside the repository | Original conftests are not ancestors |
| IDE sets \`--confcutdir=tests/api\` | \`tests/conftest.py\` may be excluded |
| Monorepo runs from another package | A different config file may be selected |
| CI installs fewer extras | Plugin-provided fixtures may disappear |

Print \`pytest --version\` and the rootdir line from the test header in both environments before blaming nondeterminism.

## Register fixtures kept in ordinary modules

Pytest does not scan every Python file for decorated functions. If a growing top-level conftest is split into \`tests/fixtures/users.py\`, that module must be loaded as a plugin.

\`\`\`python
# tests/conftest.py
pytest_plugins = (
    'tests.fixtures.users',
    'tests.fixtures.catalog',
)
\`\`\`

Those module paths must be importable. Depending on packaging and Python version, making \`tests\` and \`tests/fixtures\` packages with \`__init__.py\` can remove ambiguity. Run \`--trace-config\` to confirm registration.

For a reusable external package, expose a pytest plugin entry point in package metadata so installation registers it. The consumer should install the plugin in its test environment. Avoid importing fixture functions with \`from tests.fixtures.users import customer\` inside each test module. Although the imported decorated object may sometimes be collected from the module namespace, that pattern couples tests to implementation and creates unclear ownership.

Recent pytest guidance discourages defining \`pytest_plugins\` in non-top-level conftest files because loading a plugin affects the entire run, not just that subtree. Keep explicit plugin registration at the suite root.

## Check shadowing and overrides

Fixtures can be overridden closer to a test. This is a feature: a subdirectory can wrap or replace a parent fixture for a specialized suite. It also creates surprises when two fixtures share a name.

\`\`\`python
# tests/conftest.py
import pytest


@pytest.fixture
def region() -> str:
    return 'us-east'


# tests/eu/conftest.py
@pytest.fixture
def region(region: str) -> str:
    assert region == 'us-east'
    return 'eu-west'
\`\`\`

Tests below \`tests/eu\` receive the closer override. The parameter in the overriding fixture can request the next fixture up the chain. Use \`pytest --fixtures -v\` to see source locations when the found fixture behaves differently than expected.

A fixture imported under the same name in a test module can also obscure intent. Keep fixture providers in conftest or registered plugins and import only application types and helpers into tests.

## Treat conftest as executable startup code

Pytest imports conftest during discovery. Top-level database connections, environment validation, browser launches, or optional dependency imports can prevent every fixture in the file from registering. Keep top-level code limited to imports, constants, hooks, and fixture definitions. Put expensive or fallible setup inside fixtures so failures are associated with the tests that request them and teardown can run.

If an optional suite requires a package, isolate its conftest under that suite or use \`pytest.importorskip()\` deliberately. A repository-wide conftest that imports a UI driver makes API-only collection fail when UI extras are absent.

Hooks in conftest must use supported signatures. An invalid or misspelled hook can raise a plugin validation error at startup. Again, that is a plugin loading failure, not missing fixture discovery, even if the desired fixture never appears afterward.

## A disciplined five-minute diagnosis

Use this order when the error arrives in a large monorepo:

1. Copy the full node ID and run only that node with \`python -m pytest -vv\`.
2. Read the available-fixture list and first collection error.
3. Locate the fixture definition, including any decorator \`name\` override.
4. Compare its conftest directory with the test's ancestor directories.
5. Run \`--trace-config\` and \`--fixtures\` to confirm source registration.
6. Compare rootdir, config file, interpreter, installed plugins, and arguments with CI or the IDE.
7. Make the smallest structural fix, then rerun the single node and one neighboring node.

The neighboring test matters because moving a fixture upward can change which override it receives or expose it to tests that previously used a plugin fixture of the same name.

## Watch for unittest and async plugin boundaries

Fixture arguments work naturally with pytest-style functions and methods. They are not injected into ordinary \`unittest.TestCase\` method signatures. If a migrated class inherits from TestCase and declares \`def test_item(self, db)\`, discovery may be fine even though injection fails. Use pytest-style classes without that inheritance, or use supported unittest integration such as autouse setup assigning attributes.

Async fixtures add a registration layer. An \`async def\` fixture may require the decorator supplied by the installed async plugin and a configuration mode appropriate for it. If the plugin is absent in CI, its fixtures and async handling disappear. Confirm the package appears in \`--trace-config\` and use documentation matching the installed version.

Browser and database plugins commonly supply fixtures named \`page\`, \`client\`, or \`db\`. A local fixture with the same short name can override them. Use verbose fixture listing to inspect source paths before assuming the plugin is broken.

## Validate collection in the CI package layout

Editable installs can hide packaging errors. A source checkout may make \`tests.fixtures.accounts\` importable while a wheel-based CI job uses another layout. Add a collection check to that workflow and inspect its project root.

Namespace packages, duplicated test directory names in a monorepo, and import modes can cause module-name collisions. Give test packages distinct paths and use the repository's documented import mode. If two \`test_users.py\` files import as the same top-level module, the collection mismatch is not a fixture-scope defect.

## Make fixture ownership visible

A conftest has no imports at call sites, so moving a fixture can affect many tests invisibly. When promoting one to a common ancestor, search every request by parameter name, inspect closer overrides, and record the new visibility in review. Prefer descriptive names such as \`postgres_customer\` over generic \`data\` where collision is plausible.

Keep setup side effects narrow. A fixture named \`user\` that also starts a broker, seeds fifty orders, and patches time is hard to diagnose and expensive if autouse activates it. Compose small fixtures so \`--fixtures-per-test\` explains the dependency graph.

That explicit visibility also makes unused, duplicate, and unexpectedly broad fixtures easier to remove safely during routine suite maintenance.

## Frequently Asked Questions

### Why is a fixture in a sibling conftest.py invisible?

Conftest discovery follows the test's directory and its parents. It does not descend into siblings. Move the shared fixture to a common ancestor, keep separate branch-specific fixtures, or register an importable fixture module as a plugin.

### Do I need to import fixtures from conftest.py into tests?

No. Pytest loads applicable conftest files automatically and injects fixtures by parameter name. Import application classes for typing if needed, but importing from conftest couples the test to pytest startup internals.

### Why does the fixture work in my terminal but fail in the IDE?

The IDE may select another interpreter, working directory, config file, test target, or \`--confcutdir\`. Compare the pytest header and \`--trace-config\` output in both executions, then align the launch configuration.

### Can conftest.py files import fixtures from each other?

Ordinary imports are possible but often create brittle package and plugin behavior. Put shared fixtures in the nearest common ancestor conftest or an explicit plugin module. Let pytest resolve directory scope rather than building a web of conftest imports.

### Why is pytest asking for a fixture that I intended as data?

Every test function argument is treated as a fixture unless supplied by parametrization or another pytest mechanism. Check a misspelled \`parametrize\` name, a decorator that did not apply, or a helper function accidentally collected as a test.
`,
};
