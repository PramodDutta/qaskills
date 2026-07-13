import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Parametrize pytest Tests with Dataclass Test Cases',
  description:
    'Parametrize pytest tests with typed dataclass cases that keep inputs, expected results, IDs, and marks readable as larger scenario matrices grow.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Parametrize pytest Tests with Dataclass Test Cases

By the seventh field in a tuple, a reviewer is no longer reading a test case. They are counting commas. A row such as \`("GB", 1099, 0.2, True, "GBP", 1319, None)\` may be compact, but its business meaning lives somewhere above the fold in the decorator's argument list.

A frozen Python dataclass gives that row names, types, defaults, validation opportunities, and a stable place for a diagnostic ID. Pytest does not require a plugin to use this pattern. A dataclass instance is simply a parameter value, so the ordinary \`@pytest.mark.parametrize\` API can deliver it to the test.

The goal is not to turn every two-value table into a class hierarchy. It is to keep medium and large scenario sets reviewable without moving the assertions into a data framework.

## Replace positional memory with a named case

Start with the domain model the test needs, not a generic \`TestCase\` containing \`input\` and \`expected\`. The following cases describe invoice totals. Their fields distinguish the amount under test, tax behavior, and observable result.

\`\`\`python
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

import pytest


@dataclass(frozen=True)
class InvoiceTotalCase:
    name: str
    net: Decimal
    tax_rate: Decimal
    tax_exempt: bool
    expected_total: Decimal


def invoice_total(net: Decimal, tax_rate: Decimal, tax_exempt: bool) -> Decimal:
    multiplier = Decimal("1") if tax_exempt else Decimal("1") + tax_rate
    return (net * multiplier).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


CASES = [
    InvoiceTotalCase(
        name="standard-vat",
        net=Decimal("10.99"),
        tax_rate=Decimal("0.20"),
        tax_exempt=False,
        expected_total=Decimal("13.19"),
    ),
    InvoiceTotalCase(
        name="exempt-customer",
        net=Decimal("10.99"),
        tax_rate=Decimal("0.20"),
        tax_exempt=True,
        expected_total=Decimal("10.99"),
    ),
    InvoiceTotalCase(
        name="half-cent-rounds-up",
        net=Decimal("0.05"),
        tax_rate=Decimal("0.10"),
        tax_exempt=False,
        expected_total=Decimal("0.06"),
    ),
]


@pytest.mark.parametrize("case", CASES, ids=lambda case: case.name)
def test_invoice_total(case: InvoiceTotalCase) -> None:
    actual = invoice_total(case.net, case.tax_rate, case.tax_exempt)
    assert actual == case.expected_total
\`\`\`

Each constructor call is longer than a tuple, intentionally. Field names make review local. A changed \`tax_exempt=True\` is visible on its own line, and an IDE can find every use of \`expected_total\`. The test body has one parameter, \`case\`, so adding another field does not require synchronizing a decorator string with a function signature.

The \`frozen=True\` option is important. Pytest passes parameter values as-is; it does not copy them for each invocation. An immutable case prevents one test from accidentally modifying a shared instance that another test later receives.

## Decide when a dataclass earns its weight

Dataclass cases improve some tables and overcomplicate others. A direct two-column transformation remains clearest as ordinary tuples:

\`\`\`python
@pytest.mark.parametrize("raw,expected", [(" YES ", True), ("no", False)])
def test_parse_boolean(raw: str, expected: bool) -> None:
    assert parse_boolean(raw) is expected
\`\`\`

Move to named cases when the row represents a scenario rather than a simple function mapping. The pressure usually comes from optional fields, repeated literal types, or the need to share a matrix across related tests.

| Signal in the parameter table | Tuple impact | Dataclass benefit |
|---|---|---|
| Two or three distinct value types | Usually easy to scan | Limited benefit |
| Several strings or booleans in one row | Positions become ambiguous | Field names expose intent |
| Defaults apply to most scenarios | Placeholder values fill tuples | Defaults remove noise |
| Cases are imported by multiple modules | Argument lists can drift | One typed contract travels with data |
| A case needs helper-derived input | Helpers live outside the row | Read-only methods or properties can clarify construction |
| Values are generated dynamically | Tuple may be sufficient | Validation in \`__post_init__\` can reject malformed cases |

A dataclass is not automatically more domain-oriented. Names such as \`arg1\`, \`flag\`, and \`result\` merely spread tuple ambiguity over more lines. Use vocabulary from the behavior: \`tax_exempt\`, \`retry_after_seconds\`, \`expected_status\`.

## Keep the scenario type near its owning behavior

There are three sensible homes for a case dataclass. A class used by one test module can remain in that module. A model shared by tests for one feature can live in a small test-support module next to those tests. A broadly reused schema can live under a dedicated test helpers package, but that is the last step, not the first.

Centralizing every case type in \`tests/models.py\` creates a catalog with no behavioral cohesion. It also encourages unrelated tests to depend on fields that were designed for another assertion. Prefer local ownership until real duplication appears.

Production domain objects are usually poor substitutes. If the application has an \`Invoice\` dataclass, it models runtime state, serialization, and invariants. An \`InvoiceTotalCase\` models test inputs and observations. Coupling the test table to the production constructor makes a production refactor rewrite test data even when behavior has not changed.

The test case may contain production objects when those objects are genuinely inputs, but it should not pretend to be one. This separation also prevents test-only expectations from leaking into application types.

## Defaults should reveal the exceptional dimension

Dataclass defaults are powerful because most scenario matrices have a baseline. Define defaults only where there is an unambiguous conventional value. Then each case highlights what varies.

\`\`\`python
from dataclasses import dataclass, field

import pytest


@dataclass(frozen=True)
class AccessCase:
    name: str
    role: str = "member"
    account_active: bool = True
    scopes: frozenset[str] = field(default_factory=frozenset)
    expected_status: int = 200
    expected_reason: str | None = None


def authorize_export(
    role: str, account_active: bool, scopes: frozenset[str]
) -> tuple[int, str | None]:
    if not account_active:
        return 403, "account inactive"
    if role != "admin" and "reports:export" not in scopes:
        return 403, "missing reports:export"
    return 200, None


ACCESS_CASES = [
    AccessCase(name="admin", role="admin"),
    AccessCase(name="scoped-member", scopes=frozenset({"reports:export"})),
    AccessCase(
        name="unscoped-member",
        expected_status=403,
        expected_reason="missing reports:export",
    ),
    AccessCase(
        name="inactive-admin",
        role="admin",
        account_active=False,
        expected_status=403,
        expected_reason="account inactive",
    ),
]


@pytest.mark.parametrize("case", ACCESS_CASES, ids=lambda item: item.name)
def test_export_authorization(case: AccessCase) -> None:
    status, reason = authorize_export(case.role, case.account_active, case.scopes)
    assert (status, reason) == (case.expected_status, case.expected_reason)
\`\`\`

Use \`default_factory\` for mutable containers, just as in production dataclasses. A literal empty list or set is not a valid dataclass default because instances would share it. Prefer immutable collections such as \`frozenset\` for frozen cases when the behavior only reads membership.

Too many defaults can conceal the test's premise. If currency is central to a currency-conversion test, requiring every case to state it may be clearer than silently defaulting to USD. The question is whether omission communicates the baseline or forces a reader to remember it.

## Generate useful pytest IDs from semantic names

Pytest's default ID for a custom object is commonly based on the parameter name rather than a helpful expansion of its fields. A \`name\` field provides a deliberate node ID and a human label for reports.

There are three ordinary ways to connect it:

| ID technique | Example | Use when |
|---|---|---|
| Callable | \`ids=lambda case: case.name\` | Every value is the same case type |
| Explicit list | \`ids=[case.name for case in CASES]\` | You want simple precomputed IDs |
| Per-row \`pytest.param\` | \`pytest.param(case, id=case.name)\` | Rows also carry marks or mixed value types |

Keep \`name\` unique within the decorator. Prefer behavior labels such as \`inactive-admin\` to serial labels such as \`case-04\`. Node IDs appear in \`-k\` selection, failure output, editor integrations, and CI history, so stability matters.

Do not generate IDs from \`repr(case)\`. Dataclass representations can be long, contain sensitive values, and change whenever a field is added. A purpose-built name is a more stable contract. If a generated matrix makes names programmatically, verify uniqueness during construction rather than waiting for pytest to suffix duplicates.

## Attach a mark without teaching the dataclass about pytest

It is tempting to add \`marks\` or \`skip\` fields to every case. That couples pure scenario data to runner policy and usually results in test code interpreting marks manually. \`pytest.param\` already carries per-row marks.

\`\`\`python
import sys
from dataclasses import dataclass
from pathlib import PurePath, PurePosixPath, PureWindowsPath

import pytest


@dataclass(frozen=True)
class PathCase:
    name: str
    path_type: type[PurePath]
    raw: str
    expected_parts: tuple[str, ...]


POSIX_PATH = PathCase(
    name="posix-root",
    path_type=PurePosixPath,
    raw="/data/report.csv",
    expected_parts=("/", "data", "report.csv"),
)

WINDOWS_PATH = PathCase(
    name="windows-drive-root",
    path_type=PureWindowsPath,
    raw="C:\\\\data\\\\report.csv",
    expected_parts=("C:\\\\", "data", "report.csv"),
)


@pytest.mark.parametrize(
    "case",
    [
        pytest.param(POSIX_PATH, id=POSIX_PATH.name),
        pytest.param(
            WINDOWS_PATH,
            id=WINDOWS_PATH.name,
            marks=pytest.mark.skipif(sys.platform != "win32", reason="Windows path semantics"),
        ),
    ],
)
def test_path_parts(case: PathCase) -> None:
    assert case.path_type(case.raw).parts == case.expected_parts
\`\`\`

The case remains importable in tooling that does not import pytest. Runner concerns remain on the generated test item. A module can reuse the same case with a different mark if its environment differs.

For a large catalog, a tiny adapter function can convert cases to \`pytest.param\` objects based on separate metadata. Avoid inventing a general scenario DSL. Once a wrapper has its own setup hooks, assertion callbacks, and selection language, ordinary pytest reporting becomes harder to follow.

## Model expected failures as data, not branches

Happy results and exceptions sometimes belong in the same behavioral matrix. A dataclass can state which outcome is expected, but the test should retain one obvious assertion path for each kind of outcome.

One approach is a discriminated expectation type. The following keeps the exception class and message pattern explicit without using \`if expected_error\` fields that can form invalid combinations.

\`\`\`python
from dataclasses import dataclass
from typing import TypeAlias

import pytest


@dataclass(frozen=True)
class Returns:
    value: int


@dataclass(frozen=True)
class Raises:
    exception: type[Exception]
    match: str


Expectation: TypeAlias = Returns | Raises


@dataclass(frozen=True)
class PortCase:
    name: str
    raw: str
    expectation: Expectation


def parse_port(raw: str) -> int:
    port = int(raw)
    if not 1 <= port <= 65535:
        raise ValueError(f"port must be between 1 and 65535, got {port}")
    return port


PORT_CASES = [
    PortCase("minimum", "1", Returns(1)),
    PortCase("maximum", "65535", Returns(65535)),
    PortCase("zero", "0", Raises(ValueError, r"between 1 and 65535, got 0$")),
    PortCase("not-an-integer", "http", Raises(ValueError, r"invalid literal")),
]


@pytest.mark.parametrize("case", PORT_CASES, ids=lambda item: item.name)
def test_parse_port(case: PortCase) -> None:
    match case.expectation:
        case Returns(value):
            assert parse_port(case.raw) == value
        case Raises(exception, pattern):
            with pytest.raises(exception, match=pattern):
                parse_port(case.raw)
\`\`\`

This uses Python structural pattern matching, so it requires Python 3.10 or newer. A conventional \`isinstance\` branch is equally valid. What matters is that the data model prevents nonsense such as specifying both \`expected_value\` and \`expected_exception\`.

If success and failure cases exercise substantially different workflows, split them into two tests. One mega-matrix is not inherently better than two focused matrices, especially when failure cases require extra assertions on error metadata.

## Validate the case catalog before collection surprises you


Dataclass type hints are not runtime validation. Python accepts \`expected_status="200"\` unless a checker or explicit validation rejects it. Static checking should cover test code, but a small \`__post_init__\` can enforce invariants that types cannot describe.

For example, an HTTP response case might require a body on success and an error code on failure. Raise \`ValueError\` while the module imports if the catalog is internally contradictory. That makes a malformed test definition fail before the system under test runs.

Use validation sparingly. The case type should not reproduce production validation or compute the expected result from the same algorithm being tested. If \`expected_total\` is calculated by calling \`invoice_total\` inside \`__post_init__\`, the test becomes a comparison of the implementation with itself.

Useful catalog checks include:

- semantic names are non-empty and unique;
- mutually exclusive expectation fields cannot coexist;
- numeric bounds make sense for the test domain;
- a success scenario includes required expected observations;
- secrets are absent from names and printable fields.

You can assert collection quality in a small unit test over \`CASES\`, but module-level construction errors are often sufficient for simple invariants.

## Separate case definition from resource construction


A dataclass case should usually be inert. Do not open a connection, create a temporary directory, or make an HTTP request in its constructor. Case constants are commonly created at module import during collection. Side effects there slow discovery and fall outside fixture teardown.

When a scenario needs infrastructure, let the dataclass describe it and let fixtures build it. A case can say \`database_version="17"\` and \`seed_rows=(...)\`; a fixture can start the selected service and insert those rows. The test receives both the case and the prepared resource through ordinary fixture dependencies.

This is complementary to [pytest parametrization patterns](/blog/pytest-parametrize-complete-guide-2026), which covers decorator expansion and IDs in more breadth. For decisions about test readability, isolation, assertions, and suite structure, see the [pytest best practices guide](/blog/pytest-best-practices-2026).

Be cautious about putting callables in cases. A named function used as input can be appropriate for strategy testing, but lambdas have poor representations and are hard to serialize or identify. Assertion lambdas are worse because they hide behavior from pytest's assertion rewriting. Keep the final \`assert\` in the test body whenever practical.

## Dataclass cases versus neighboring patterns


The Python ecosystem offers several ways to name test data. Pick the lightest structure that preserves intent.

| Pattern | Strength | Tradeoff | Good fit |
|---|---|---|---|
| Tuple rows | Minimal syntax | Meaning depends on position | Small pure-function tables |
| Dictionary rows | Flexible and readable keys | Typos and missing keys fail at runtime | Dynamic external-like payloads |
| \`NamedTuple\` | Named immutable positions | Defaults and methods are less natural | Compact fixed records |
| Frozen dataclass | Types, defaults, methods, readable construction | More declarations and vertical space | Rich, reused scenario matrices |
| Separate test functions | Maximum narrative freedom | Repeats setup and assertion shapes | Cases with meaningfully different flows |

Do not choose dataclasses because typed code is automatically superior. Choose them when positional density is obstructing review or when the scenario has a stable conceptual schema.

The resulting test should still read top to bottom: arrange from case fields, call the production behavior, compare with the stated observation. If readers need to visit five helper modules to understand one case, the abstraction has exceeded its value.

## Maintaining a case matrix as behavior evolves


When adding a production option, resist immediately adding a nullable field to a universal base case. Ask which tests observe that option. A feature-specific dataclass may be clearer than a growing model with twelve optional attributes.

Review diffs at the scenario level. A changed expectation should be paired with a reason in the feature change, not buried among mechanical constructor updates. Explicit keyword construction makes those changes visible.

Keep the matrix curated. Parametrization is excellent for representative equivalence classes and boundaries, but a hand-authored catalog cannot cover every combination. Property-based testing is a better complement for broad generated inputs. The dataclass table then preserves named regressions and business-significant examples.

Finally, run one case by node ID in local workflows. If \`pytest tests/test_invoice.py::test_invoice_total[half-cent-rounds-up]\` is enough to reproduce a rounding defect, the naming scheme and isolation are doing useful work.

## Frequently Asked Questions

### Should the dataclass itself be named \`TestCase\`?

Usually not. Pytest may try to collect classes whose names begin with \`Test\`, and generic names convey little domain meaning. A name such as \`InvoiceTotalCase\` or \`AccessCase\` avoids collection ambiguity and tells readers which behavior owns the fields.

### Why use \`frozen=True\` for parameter objects?

Pytest passes the original objects without copying them. Freezing catches accidental attribute reassignment and encourages immutable member types, reducing cross-case contamination. It does not recursively freeze a list stored in a field, so prefer tuples, frozensets, and immutable nested values where feasible.

### Can a case dataclass inherit from a common base?

It can, but inheritance often produces a broad collection of optional fields and awkward dataclass ordering rules for defaults. Composition or separate focused case types usually communicates behavior better. Use a base only when the inherited fields have the same semantics across every child matrix.

### How do I add an xfail to one dataclass case?

Wrap that instance in \`pytest.param(case, marks=pytest.mark.xfail(...), id=case.name)\` inside the parameter list. Keeping the mark outside the dataclass separates runner policy from scenario data and allows another test to reuse the same case without inheriting the xfail.

### Is a dataclass matrix a replacement for Hypothesis?

No. Named cases document selected boundaries, regressions, and business rules. Property-based tests explore a much larger generated input space and shrink failures. Mature suites often use both: generated tests discover unexpected cases, then only durable business examples or important regressions become named dataclass rows.
`,
};
