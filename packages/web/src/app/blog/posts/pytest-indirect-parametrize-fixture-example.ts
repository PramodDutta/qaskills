import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'pytest Indirect Parametrize Fixture Example',
  description:
    'Learn pytest indirect parametrize with realistic fixture setup, selective indirection, readable IDs, teardown safety, and collection-time diagnostics.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# pytest Indirect Parametrize Fixture Example

The string \`"postgres"\` in a parameter table is cheap. Starting a PostgreSQL container, applying a schema, yielding a connected repository, and reliably stopping the container are not. Indirect parametrization lets the table contain the cheap description while a fixture performs the expensive conversion during test setup.

That timing distinction is the feature. Ordinary \`@pytest.mark.parametrize\` values go straight into the test function. With \`indirect=True\`, pytest sends each value to the fixture named by the parameter. The fixture reads it from \`request.param\`, constructs the resource, and returns or yields the object the test actually consumes.

This tutorial builds a concrete backend fixture, then examines selective indirection, test IDs, fixture scopes, failure phases, and the design choices that keep an indirect suite understandable.

## The handoff from parameter row to fixture

Consider the smallest useful example. The test asks for a \`configured_client\` fixture, but the decorator supplies a plain configuration dictionary. Pytest does not pass that dictionary directly to the test because the argument is marked indirect.

\`\`\`python
from dataclasses import dataclass

import pytest


@dataclass
class ApiClient:
    base_url: str
    token: str | None

    def health_headers(self) -> dict[str, str]:
        if self.token is None:
            return {}
        return {"Authorization": f"Bearer {self.token}"}


@pytest.fixture
def configured_client(request: pytest.FixtureRequest) -> ApiClient:
    config = request.param
    return ApiClient(base_url=config["base_url"], token=config.get("token"))


@pytest.mark.parametrize(
    "configured_client",
    [
        {"base_url": "https://public.example.test"},
        {"base_url": "https://private.example.test", "token": "test-token"},
    ],
    indirect=True,
    ids=["anonymous", "authenticated"],
)
def test_health_request_headers(configured_client: ApiClient) -> None:
    headers = configured_client.health_headers()
    assert ("Authorization" in headers) is (configured_client.token is not None)
\`\`\`

Collection produces two test items. Setup invokes the fixture once for each item. The values visible through \`request.param\` are the dictionaries from the decorator, unchanged. The test receives an \`ApiClient\`, not a dictionary.

The data flow is worth making explicit:

| Stage | Value in this example | What pytest does |
|---|---|---|
| Collection | Configuration dictionary | Builds a test item and its parameter ID |
| Fixture setup | \`request.param\` dictionary | Calls \`configured_client\` for that item |
| Test call | \`ApiClient\` instance | Injects the fixture result into the test |
| Teardown | Fixture finalizers, if any | Runs cleanup after the test or configured scope |

Indirect parametrization is therefore not a mechanism for referring to a fixture by a string. It is a mechanism for parametrizing the input to a fixture. Confusing those ideas leads to brittle helper plugins or attempts to call fixtures as ordinary functions.

## Building a resource only when its test runs

The compelling case is deferred resource creation. Parametrization happens during collection, when tests are discovered. A fixture's body runs later, during setup. Keeping containers, browsers, database connections, and temporary servers inside fixtures prevents collection from performing I/O.

Here is a runnable Docker-backed example using Testcontainers for Python. Each row names an official PostgreSQL image. The fixture starts the selected container, creates a table, yields a connection factory, and then lets the context manager stop the container.

\`\`\`python
from collections.abc import Iterator
from dataclasses import dataclass

import psycopg
import pytest
from testcontainers.postgres import PostgresContainer


@dataclass(frozen=True)
class RunningDatabase:
    image: str
    url: str

    def connect(self) -> psycopg.Connection:
        return psycopg.connect(self.url)


@pytest.fixture
def database(request: pytest.FixtureRequest) -> Iterator[RunningDatabase]:
    image = request.param
    with PostgresContainer(image) as postgres:
        url = postgres.get_connection_url().replace("postgresql+psycopg2", "postgresql")
        with psycopg.connect(url) as connection:
            connection.execute(
                "CREATE TABLE audit_event "
                "(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, action text NOT NULL)"
            )
            connection.commit()
        yield RunningDatabase(image=image, url=url)


@pytest.mark.parametrize(
    "database",
    [
        pytest.param("postgres:16-alpine", id="postgres-16"),
        pytest.param("postgres:17-alpine", id="postgres-17"),
    ],
    indirect=True,
)
def test_identity_and_returning(database: RunningDatabase) -> None:
    with database.connect() as connection:
        row = connection.execute(
            "INSERT INTO audit_event (action) VALUES (%s) RETURNING id, action",
            ("login",),
        ).fetchone()
        connection.commit()

    assert row == (1, "login")
\`\`\`

The test module can be collected on a machine without starting either container. Running \`pytest --collect-only\` shows the two items and their IDs. Running one node ID starts only its selected image. That is useful when a developer wants to reproduce a version-specific failure without paying for every backend.

Do not put \`PostgresContainer(...).start()\` in the parameter list. Decorator arguments are evaluated when Python imports the module, before pytest owns the resource lifecycle. Import-time infrastructure makes collection slow, makes \`--collect-only\` surprising, and can leak when collection fails.

## Selective indirect parameters keep assertions visible


Most useful tables contain both setup instructions and ordinary expected values. Setting \`indirect=True\` for the entire decorator tells pytest to treat every parameter name as a fixture, which is rarely what you want. Pass a list of argument names instead.

\`\`\`python
from dataclasses import dataclass

import pytest


@dataclass(frozen=True)
class User:
    role: str
    active: bool


@pytest.fixture
def user(request: pytest.FixtureRequest) -> User:
    role, active = request.param
    return User(role=role, active=active)


def can_export(user: User, report_owner_role: str) -> bool:
    return user.active and (user.role == "admin" or user.role == report_owner_role)


@pytest.mark.parametrize(
    "user,owner_role,expected",
    [
        pytest.param(("admin", True), "analyst", True, id="active-admin"),
        pytest.param(("analyst", True), "analyst", True, id="active-owner"),
        pytest.param(("viewer", True), "analyst", False, id="active-non-owner"),
        pytest.param(("admin", False), "analyst", False, id="inactive-admin"),
    ],
    indirect=["user"],
)
def test_export_policy(user: User, owner_role: str, expected: bool) -> None:
    assert can_export(user, owner_role) is expected
\`\`\`

Only \`user\` goes through fixture resolution. \`owner_role\` and \`expected\` arrive as literal values. This split preserves the most readable property of a parameter table: the input condition and expected outcome can be reviewed in one row.

The choice between direct and indirect should follow responsibility, not data type.

| Parameter kind | Prefer direct | Prefer indirect |
|---|---|---|
| Scalar input | Function arguments, limits, status codes | Rarely, unless it selects fixture behavior |
| Configuration object | Pure logic consumes it unchanged | Fixture translates it into a resource |
| Database variant | Test operates on a fake descriptor | Fixture opens and cleans a real database |
| Credentials | Test validates credential parsing | Fixture signs in and returns an authenticated client |
| Expected result | Almost always | Avoid, because setup should not manufacture the oracle |

Keeping expected results direct also prevents a fixture from hiding the assertion's meaning. A fixture may prepare state, but it should not quietly decide what success looks like.

## Choosing the request parameter's shape


\`request.param\` has no special schema. It can be a string, tuple, dictionary, enum, or dataclass instance. That freedom can become a maintenance problem because the fixture's input contract is invisible to type checkers unless you make it explicit.

For one obvious selector, a string or enum is enough. For multiple independent options, use an immutable dataclass. A dictionary is convenient while exploring, but misspelled keys fail during fixture setup and refactors are harder to discover.

\`\`\`python
from dataclasses import dataclass
from pathlib import Path

import pytest


@dataclass(frozen=True)
class WorkspaceSpec:
    files: dict[str, str]
    read_only: bool = False


@pytest.fixture
def workspace(request: pytest.FixtureRequest, tmp_path: Path) -> Path:
    spec: WorkspaceSpec = request.param
    for relative_name, content in spec.files.items():
        target = tmp_path / relative_name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    if spec.read_only:
        for target in tmp_path.rglob("*"):
            if target.is_file():
                target.chmod(0o444)
    return tmp_path


@pytest.mark.parametrize(
    "workspace",
    [
        WorkspaceSpec({"config.toml": "mode = 'safe'\n"}),
        WorkspaceSpec({"config.toml": "mode = 'safe'\n"}, read_only=True),
    ],
    indirect=True,
    ids=["writable", "read-only"],
)
def test_config_is_discoverable(workspace: Path) -> None:
    assert (workspace / "config.toml").read_text(encoding="utf-8") == "mode = 'safe'\n"
\`\`\`

The fixture annotation cannot currently express a different static type for \`request.param\`; the local annotation documents the cast for readers and type checking. If external data feeds the specs, validate it before resource creation rather than letting a missing key surface halfway through setup.

Avoid parameter objects that already contain live resources. A \`WorkspaceSpec\` is safe to construct at import time because it is inert data. An open file handle, event loop, connection, or client belongs inside fixture setup.

## IDs are part of the debugging interface


Without explicit IDs, pytest derives names from simple scalar values and falls back to argument-oriented labels for complex objects. Generated IDs may be technically unique yet useless in CI output. A failure called \`test_checkout[cart0]\` requires opening the source to learn which cart failed.

Use \`pytest.param(..., id="expired-coupon")\` when the name belongs to a single row. Use the decorator's \`ids=[...]\` for a short fixed list. Use an ID function when one parameter type has a stable naming rule.

An ID should describe the behaviorally significant variation, not every field. \`postgres-17\`, \`anonymous\`, and \`read-only\` are useful. Dumping a full connection string exposes secrets and makes node IDs awkward to select.

Explicit IDs improve three workflows:

1. A CI report identifies the failed setup variant without expanding logs.
2. A developer reruns one case with its complete node ID.
3. Historical flaky-test data groups the same logical variant across runs.

Inspect IDs before executing expensive tests:

\`\`\`bash
pytest --collect-only -q tests/test_database.py
pytest -q 'tests/test_database.py::test_identity_and_returning[postgres-17]'
\`\`\`

If IDs are computed from mutable or incidental data, they will churn and undermine all three workflows. Treat them as a small public interface for the suite.

## Scope changes the number of constructions


Indirect parametrization interacts with fixture scope in ways that matter for cost and isolation. A function-scoped fixture is created for each test item. A module-scoped parametrized fixture can be reused for compatible items within a module, but pytest may group execution by fixture instance to minimize active resources.

Do not increase scope solely to make a slow suite faster. First ask whether state can safely cross test boundaries. A database fixture reused across tests needs transaction rollback, schema reset, or unique namespaces. If the cleanup guarantee is weak, function scope is the honest choice.

| Fixture scope | Construction boundary | Typical indirect use | Principal risk |
|---|---|---|---|
| \`function\` | Every test item | Users, temp workspaces, mutable rows | Startup cost for heavy services |
| \`class\` | Each test class and parameter | Scenario-specific service object | Hidden ordering inside the class |
| \`module\` | Each module and parameter | Backend version shared by related checks | State leakage among module tests |
| \`session\` | Entire run per parameter grouping | Expensive immutable service | Broad blast radius when contaminated |

Remember that fixture dependencies have their own scopes. A module-scoped indirect fixture cannot depend on a function-scoped fixture because the shorter-lived object would have to survive beyond its boundary. Pytest raises a scope mismatch rather than guessing.

For parallel runs, scope is evaluated per worker process. A session-scoped fixture under pytest-xdist is generally session-scoped within each worker, not a single global instance for the whole distributed run. Resource names and ports still need collision-safe allocation.

## Setup failures should look different from assertion failures


An invalid selector supplied through \`request.param\` should fail with a targeted setup message. If a fixture accepts \`"sqlite"\` and \`"postgres"\`, silently defaulting any other string to PostgreSQL hides mistakes in the parameter table.

Validate at the fixture boundary:

\`\`\`python
import pytest


@pytest.fixture
def backend(request: pytest.FixtureRequest) -> str:
    supported = {"sqlite", "postgres"}
    selected = request.param
    if selected not in supported:
        pytest.fail(
            f"unsupported backend selector {selected!r}; expected one of {sorted(supported)}"
        )
    return selected
\`\`\`

\`pytest.fail\` produces an intentional test failure during setup. A \`ValueError\` can also be appropriate when it represents a programming contract. Whichever you choose, include the received selector and accepted values, but exclude tokens or passwords.

Keep assertions out of a resource factory unless they verify setup preconditions. If the behavior under test is that an application rejects an invalid configuration, the fixture must not reject it first. In that case, pass the configuration directly to the test or have the fixture return a deliberately unvalidated object.

When cleanup matters, prefer a yield fixture or \`request.addfinalizer\`. Register cleanup immediately after acquiring each resource. If setup has several acquisition steps and step three fails, resources from steps one and two still need deterministic release. A context manager or \`contextlib.ExitStack\` is often clearer than a long tail of conditionals.

## Alternatives and the boundary of indirect parametrization


Indirect parametrization is one tool among several built-in pytest mechanisms. It is best when a test-local table should control a fixture's setup input. Other mechanisms communicate different ownership.

| Mechanism | Values declared at | Best fit | Important consequence |
|---|---|---|---|
| Direct \`@pytest.mark.parametrize\` | Test decorator | Pure inputs and expected outputs | Values reach the test unchanged |
| \`indirect=True\` | Test decorator | Per-test resource recipes | Values reach \`request.param\` in a named fixture |
| \`@pytest.fixture(params=...)\` | Fixture definition | Every consumer should exercise all fixture variants | Expansion applies wherever the fixture is requested |
| \`pytest_generate_tests\` | Collection hook | Parameters derived from CLI options or metadata | More power, less local visibility |
| Factory fixture | Fixture returns a callable | A test creates multiple resources dynamically | Test controls count and creation timing |

If every consumer of \`database\` must run on PostgreSQL 16 and 17, \`@pytest.fixture(params=[...])\` may express that policy better. If only one compatibility test needs both versions, indirect values on that test avoid doubling unrelated consumers.

If a test needs three users simultaneously, indirect parametrization of one \`user\` fixture is awkward. Return a factory from a fixture and call it three times, while the fixture tracks created users for teardown. Parametrization creates test items before execution; it is not designed for a runtime-dependent number of resources.

For the broader mechanics of rows, IDs, marks, and stacked decorators, use the [complete pytest parametrization guide](/blog/pytest-parametrize-complete-guide-2026). When resource lifetime becomes the hard part, the [pytest fixture scope guide](/blog/pytest-fixtures-scope-complete-guide) explains caching and teardown boundaries in more depth.

## A review checklist for indirect fixtures


Before approving an indirect parametrization, trace one row manually from collection to teardown. A strong implementation usually satisfies these points:

- The decorator contains inert descriptions, not objects that allocate external resources.
- Every indirect name exactly matches a fixture argument requested by the test.
- The fixture validates \`request.param\` and translates it into one clear resource type.
- Expected results remain visible in the test's table rather than being inferred by setup.
- Parameter IDs identify meaningful variants without secrets or volatile details.
- Cleanup is registered as soon as acquisition succeeds.
- Fixture scope matches the isolation guarantee, including behavior under parallel workers.
- A single parameterized node ID can run independently.
- \`--collect-only\` performs no network, container, browser, or database work.

The smell to watch for is a fixture that behaves like a hidden test runner: it parses a large scenario document, performs actions, computes expectations, and returns a boolean. That removes useful pytest boundaries. Indirect fixtures should arrange resources. The test should still act and assert.

## Frequently Asked Questions

### Why does my fixture say that \`request.param\` does not exist?

\`request.param\` is present when that fixture invocation is parametrized. If the same fixture is also requested by a test without indirect parametrization or fixture-level \`params\`, there is no parameter to read. Either make parametrization mandatory for every consumer, provide an explicit default after checking \`hasattr(request, "param")\`, or split the optional and required behaviors into separate fixtures. A silent default is safe only when its meaning is obvious.

### Can indirect parametrization pass one fixture into another fixture?

Fixture dependencies should be declared as fixture function arguments. The value in \`request.param\` is data, not a portable fixture reference. If \`authenticated_client\` needs \`server\`, define \`authenticated_client(server, request)\`. Passing the string \`"server"\` and resolving it dynamically obscures dependencies and complicates scope analysis.

### Why did \`indirect=True\` try to find fixtures for my expected values?

Boolean \`indirect=True\` applies to every argument named in that \`parametrize\` decorator. Use \`indirect=["resource_argument"]\` so only setup recipes go through fixtures. Ordinary inputs and expected outputs then remain direct parameters.

### Is a fixture parametrized with \`params=\` equivalent to an indirect test parameter?

They use similar fixture machinery but express different reach. \`@pytest.fixture(params=...)\` makes the fixture variants apply to all tests that consume it, including indirect consumers through dependencies. An indirect test decorator controls the fixture input only for the decorated test or class. Choose based on who owns the variation.

### Can I combine marks with an indirect value?

Yes. Wrap the complete row or individual value with \`pytest.param\` and provide \`marks=\` plus an \`id=\`. The mark belongs to the generated test item, while the wrapped value still arrives at the fixture as \`request.param\`. This is useful for marking one backend version as slow or xfail without branching inside the fixture.
`,
};
