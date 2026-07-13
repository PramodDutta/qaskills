import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Compare Nested Dictionary Floats with pytest.approx()',
  description:
    'Compare nested dictionary floats with pytest.approx using recursive leaf checks, path-aware tolerances, exact structure validation, and readable failures.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Compare Nested Dictionary Floats with pytest.approx()

An analytics endpoint returns \`{"totals": {"gross": 19.9900000003}}\` while the fixture expects \`19.99\`. Replacing the whole expected object with \`pytest.approx(expected)\` looks natural, but nested mappings are the point where that shortcut stops being dependable. \`pytest.approx\` supports numbers, sequences, flat dictionaries, and NumPy arrays. It does not recursively transform an arbitrary JSON tree into approximate leaves.

The robust pattern is to validate structure exactly, walk both objects by path, and apply \`pytest.approx\` only where numeric tolerance is part of the contract. That preserves useful pytest assertion output and prevents a permissive comparison from hiding missing keys, extra records, changed strings, or an integer count that should remain exact.

## Why direct equality fails on correct calculations

Binary floating-point cannot represent many decimal fractions exactly. A service that calculates tax, a scientific model that serializes coordinates, or an aggregation job that changes evaluation order can produce a tiny representational difference without changing business meaning. Exact equality treats that harmless difference the same as a genuine calculation error.

Tolerance is not rounding. \`pytest.approx(expected, rel=..., abs=...)\` accepts the comparison when either the relative tolerance around the expected value or the absolute tolerance is satisfied. Relative tolerance scales with magnitude. Absolute tolerance is essential near zero, where a relative fraction of zero offers no useful window.

| Value class | Typical policy | Why |
|---|---|---|
| Currency returned as float | Domain-specific absolute tolerance, often tied to smallest unit | Relative error can permit too much at large totals |
| Ratios and model scores | Relative tolerance plus a small absolute floor | Values span magnitudes and may approach zero |
| Coordinates in meters | Absolute tolerance based on sensor or algorithm resolution | Physical resolution defines acceptable difference |
| Integer counters | Exact comparison | Approximation can conceal an off-by-one defect |
| NaN-bearing scientific output | Explicit \`nan_ok\` decision | NaN equality is a semantic policy, not a rounding issue |

Never copy a tolerance from another test without checking units. An absolute tolerance of \`1e-3\` means one millisecond for seconds, one gram for kilograms, and one thousand currency units if the value is stored in millions.

## Confirm the limitation before designing the helper

A flat dictionary of numeric values works:

\`\`\`python
import pytest


def test_flat_metrics_are_close():
    actual = {"precision": 0.9000000001, "recall": 0.7999999998}
    expected = {"precision": 0.9, "recall": 0.8}

    assert actual == pytest.approx(expected, rel=1e-9, abs=1e-12)
\`\`\`

Once values contain another mapping or a list of mappings, pass only the numeric leaves to \`approx\`. Depending on pytest version and shape, treating the outer mapping as a single approximate object can raise a type error or compare nested nonnumeric values exactly. Neither gives a recursive, path-aware policy.

This limitation is beneficial in one respect: it forces the test to state which parts are approximate. A payload is usually heterogeneous. IDs, ISO timestamps, enum values, booleans, and list lengths deserve exact assertions even when nearby calculated numbers allow tolerance.

## A recursive comparator with paths in failures

The following helper supports dictionaries and lists, keeps booleans and integers exact, and compares floats using one configured tolerance. It rejects type changes before value comparison, so \`"0.5"\` cannot silently substitute for \`0.5\`.

\`\`\`python
from collections.abc import Mapping, Sequence
from typing import Any

import pytest


def assert_nested_close(
    actual: Any,
    expected: Any,
    *,
    rel: float = 1e-6,
    abs_: float = 1e-12,
    path: str = "$",
) -> None:
    if isinstance(expected, Mapping):
        assert isinstance(actual, Mapping), f"{path}: expected a mapping"
        assert actual.keys() == expected.keys(), f"{path}: mapping keys differ"
        for key in expected:
            assert_nested_close(
                actual[key],
                expected[key],
                rel=rel,
                abs_=abs_,
                path=f"{path}.{key}",
            )
        return

    if isinstance(expected, Sequence) and not isinstance(expected, (str, bytes)):
        assert isinstance(actual, Sequence) and not isinstance(actual, (str, bytes)), (
            f"{path}: expected a sequence"
        )
        assert len(actual) == len(expected), f"{path}: sequence lengths differ"
        for index, (actual_item, expected_item) in enumerate(zip(actual, expected)):
            assert_nested_close(
                actual_item,
                expected_item,
                rel=rel,
                abs_=abs_,
                path=f"{path}[{index}]",
            )
        return

    if isinstance(expected, float):
        assert isinstance(actual, (int, float)) and not isinstance(actual, bool), (
            f"{path}: expected a real number, got {type(actual).__name__}"
        )
        assert actual == pytest.approx(expected, rel=rel, abs=abs_), (
            f"{path}: {actual!r} differs from {expected!r}"
        )
        return

    assert actual == expected, f"{path}: values differ"
\`\`\`

The explicit \`bool\` exclusion matters because Python's \`bool\` is a subclass of \`int\`. Without it, a malformed \`True\` might be admitted as the numeric value \`1\`. Integers remain exact because the expected branch activates approximation only for a float. If a domain permits integer or float representations interchangeably, encode that decision intentionally rather than widening every test.

## Testing a realistic nested result

Consider a pricing function that returns exact identifiers and counts alongside floating calculations. The fixture below demonstrates differences that are insignificant for its chosen unit while preserving the rest of the document exactly.

\`\`\`python
def test_invoice_summary_matches_calculation():
    actual = {
        "invoice_id": "INV-2048",
        "currency": "USD",
        "lines": [
            {"sku": "CHAIR", "quantity": 2, "unit_price": 49.9500000001},
            {"sku": "DESK", "quantity": 1, "unit_price": 129.4999999998},
        ],
        "totals": {
            "subtotal": 229.4000000000,
            "tax": 18.3520000003,
            "grand_total": 247.7519999997,
        },
    }
    expected = {
        "invoice_id": "INV-2048",
        "currency": "USD",
        "lines": [
            {"sku": "CHAIR", "quantity": 2, "unit_price": 49.95},
            {"sku": "DESK", "quantity": 1, "unit_price": 129.50},
        ],
        "totals": {
            "subtotal": 229.40,
            "tax": 18.352,
            "grand_total": 247.752,
        },
    }

    assert_nested_close(actual, expected, rel=1e-9, abs_=1e-9)
\`\`\`

For financial applications, decimal arithmetic and minor-unit integers are generally safer product representations than binary floats. This test technique is for interfaces that genuinely expose floats, not an argument that approximate money is always acceptable. If the contract says currency values are rounded to two decimal places, assert that contract or use \`Decimal\` rather than choosing a broad tolerance.

## Different paths often need different tolerances

One global tolerance can be simultaneously too strict for a derived estimate and too loose for a calibrated measurement. A path policy makes acceptable error reviewable. The helper can receive a function that returns tolerance for each leaf.

\`\`\`python
from dataclasses import dataclass


@dataclass(frozen=True)
class Tolerance:
    rel: float
    abs: float


STRICT = Tolerance(rel=1e-9, abs=1e-12)
SENSOR = Tolerance(rel=1e-4, abs=0.02)


def tolerance_for(path: str) -> Tolerance:
    if path.endswith(".temperature_c"):
        return SENSOR
    if path.endswith(".confidence"):
        return Tolerance(rel=1e-6, abs=1e-8)
    return STRICT


def assert_float_at_path(actual: float, expected: float, path: str) -> None:
    tolerance = tolerance_for(path)
    assert actual == pytest.approx(
        expected,
        rel=tolerance.rel,
        abs=tolerance.abs,
    ), f"{path}: tolerance was {tolerance}"
\`\`\`

Integrate \`assert_float_at_path\` into the float branch of the recursive walker. Prefer explicit path suffixes or a declared schema over loose substring checks. A typo in a policy path should fail validation or fall back to a strict default, not quietly grant a wide tolerance.

| Policy organization | Benefit | Risk | Best fit |
|---|---|---|---|
| One tolerance per assertion | Small and easy to read | Inadequate for mixed-unit payloads | Uniform numerical vectors |
| Path-to-tolerance mapping | Fine-grained and auditable | Paths must evolve with schema | Stable API response documents |
| Type or dataclass metadata | Co-locates domain rules | Requires typed conversion before assertion | Internal Python models |
| Normalize by rounding first | Mirrors a stated display contract | Can hide error just across a rounding boundary | UI-formatted decimal output only |

Tolerance belongs to the expected result, not the observed noise of one CI run. Avoid increasing it until a flaky test passes. Establish it from numerical analysis, sensor accuracy, product rounding rules, or an API specification.

## Flattening as an alternative

Another approach converts every leaf to a \`(path, value)\` mapping. Structure then becomes the set of paths, and numeric leaves can be selected for approximate comparison. This works well when failures need to show all divergent paths instead of stopping at the first.

\`\`\`python
from collections.abc import Mapping
from typing import Any


def flatten(value: Any, path: str = "$") -> dict[str, Any]:
    if isinstance(value, Mapping):
        result: dict[str, Any] = {}
        for key, child in value.items():
            result.update(flatten(child, f"{path}.{key}"))
        return result
    if isinstance(value, list):
        result = {}
        for index, child in enumerate(value):
            result.update(flatten(child, f"{path}[{index}]"))
        return result
    return {path: value}


def test_forecast_payload():
    actual = flatten({"daily": [{"high": 20.0000001, "condition": "clear"}]})
    expected = flatten({"daily": [{"high": 20.0, "condition": "clear"}]})

    assert actual.keys() == expected.keys()
    for path, expected_value in expected.items():
        if isinstance(expected_value, float):
            assert actual[path] == pytest.approx(expected_value, abs=1e-6), path
        else:
            assert actual[path] == expected_value, path
\`\`\`

Flattening treats list order as significant because indexes become paths. If order is irrelevant, normalize the collection by a stable key before flattening. Sorting by the numeric value under test can pair the wrong records and conceal a swap. Sort by an exact ID.

For building concise input matrices around tolerance boundaries, [pytest parametrization](/blog/pytest-parametrize-complete-guide-2026) is useful. Parameterize meaningful classes such as near zero, negative, large magnitude, inside tolerance, and just outside tolerance. Do not generate dozens of arbitrary epsilon values with no domain interpretation.

## NaN, infinity, and signed zero

Special floating values require policy. By default, NaN is not considered equal to anything, including another NaN. \`pytest.approx(..., nan_ok=True)\` permits NaN to match NaN, which is appropriate only if NaN is an accepted representation of missing or undefined numerical output. If the API should serialize missing data as \`null\`, accepting NaN would hide a contract violation.

Infinity compares only to the same infinity. A tolerance does not make a large finite number approximately infinite. Positive and negative zero compare equal numerically, so check the sign separately with \`math.copysign\` only when the numerical algorithm gives signed zero semantic importance.

JSON itself does not permit NaN or infinity as standard numeric literals. Python encoders may emit nonstandard tokens unless strict settings are enabled. Decide whether the test is checking a Python object, a wire-format document, or a parsed response because those layers have different valid domains.

## Failure quality and collecting multiple differences

The recursive helper stops at its first failed assertion. That is often desirable because one schema shift can create cascades. For numerical model evaluation, seeing all leaf deltas may be more useful. Collect records containing path, actual, expected, absolute error, relative error, and allowed tolerances, then fail once with a formatted table.

Do not implement this by swallowing every exception indiscriminately. Structural mismatches should remain prominent. A missing list element changes how later indexes pair and can make every subsequent delta meaningless. Compare keys and lengths first, then collect only leaf-level numeric mismatches from aligned structures.

Keep helper tests alongside the helper. Cover key mismatch, list length mismatch, bool versus number, numeric failure at a nested path, nonnumeric exact failure, zero with absolute tolerance, and NaN policy. Assertion utilities are production code for the test suite; a defect in them can turn hundreds of tests green.

## Alternatives to pytest.approx

| Tool or technique | Distinct capability | Prefer it when |
|---|---|---|
| \`pytest.approx\` at walked leaves | Pytest-native syntax and readable scalar tolerance | General Python structures with selected float leaves |
| \`math.isclose\` | Returns a boolean for two scalar numbers | Application code or non-pytest utility logic |
| \`numpy.testing.assert_allclose\` | Array-aware diagnostics and broadcasting controls | Dense numerical arrays are the real object under test |
| \`Decimal\` exact comparison | Base-10 semantics and explicit quantization | Money and decimal contractual values |
| Snapshot after normalization | Reviews a large stable representation | Approved output baselines where rounding is specified |

Follow general [pytest best practices](/blog/pytest-best-practices-2026) by keeping assertions deterministic, fixtures explicit, and failures local to the violated contract. Approximation should narrow false negatives caused by representation, not make expectations vague.

## Test acceptance and rejection around the policy

The comparator needs its own boundary tests. Put observations safely inside and outside each tolerance, and assert the nested path appears on failure.

\`\`\`python
@pytest.mark.parametrize(
    ("actual", "rel", "abs_", "passes"),
    [
        (100.00005, 1e-6, 0.0, True),
        (100.00020, 1e-6, 0.0, False),
        (0.0000005, 0.0, 1e-6, True),
        (0.0000020, 0.0, 1e-6, False),
    ],
)
def test_leaf_tolerance(actual, rel, abs_, passes):
    expected_value = 100.0 if actual > 1 else 0.0
    observed = {"result": {"value": actual}}
    expected = {"result": {"value": expected_value}}
    if passes:
        assert_nested_close(observed, expected, rel=rel, abs_=abs_)
    else:
        with pytest.raises(AssertionError, match=r"\\$\\.result\\.value"):
            assert_nested_close(observed, expected, rel=rel, abs_=abs_)
\`\`\`

Do not choose an outside value exactly on a binary representation boundary. The helper test should fail for the intended mathematical reason.

## Re-index unordered records by an exact key

When list order is unspecified, recursive index comparison pairs the wrong objects. Convert records into a mapping by stable ID and reject duplicates before comparing floats.

\`\`\`python
def index_by_id(records: list[dict]) -> dict[str, dict]:
    indexed = {record["id"]: record for record in records}
    assert len(indexed) == len(records), "record IDs must be unique"
    return indexed


def test_station_readings_without_order_dependency():
    actual = [
        {"id": "north", "temperature": 18.2000001},
        {"id": "south", "temperature": 21.4999998},
    ]
    expected = [
        {"id": "south", "temperature": 21.5},
        {"id": "north", "temperature": 18.2},
    ]
    assert_nested_close(
        index_by_id(actual), index_by_id(expected), rel=1e-7, abs_=1e-6
    )
\`\`\`

Never sort by the approximate value itself, since a calculation error could change pairing. Other numeric types also need explicit policy. Converting \`Decimal\`, fractions, NumPy scalars, or unit-bearing objects to float can discard meaning. Teach the walker those types, delegate arrays to specialized assertions, or reject unsupported leaves loudly.

## Produce a delta report for numerical investigations

For model outputs with hundreds of aligned leaves, stopping at the first mismatch can slow diagnosis. After structure validation, collect only failed numeric leaves and render their paths, expected values, actual values, absolute errors, and allowed bounds. Keep the normal recursive assertion for small API objects where one local failure is clearest.

The collector must not continue past missing keys or changed list lengths. Once structure diverges, index-based deltas can pair unrelated values and create an impressive but false report. Treat structural failure as primary, then calculate deltas only for aligned leaves.

Do not expose a “percentage difference” when the expected value is zero. Report absolute error there. For nonzero references, label whether relative error uses expected magnitude, because tolerance comparisons can be asymmetric. \`pytest.approx\` evaluates relative tolerance with respect to its expected argument, so keep the expected object consistently on that side.

Property-based tests can complement examples by generating nested shapes and small perturbations, but the tolerance policy remains domain-owned. Random structures are useful for checking walker correctness, type preservation, and path rendering. They cannot tell the team whether one micrometer or one basis point is acceptable.

Version-pin pytest in CI when assertion formatting is reviewed or parsed. The semantic checks should not depend on exact error prose from pytest internals. Assert your helper's path and contract, not every line of the library's representation.

## Frequently Asked Questions

### Does pytest.approx recursively compare nested dictionaries?

No. It supports flat dictionaries whose values can be compared at that level, but arbitrary nested mappings and sequences need traversal or flattening. Apply \`approx\` to numeric leaves and validate the surrounding structure exactly.

### Should integers inside the payload be approximate too?

Usually not. Counts, sequence numbers, and identifiers have discrete semantics, so an off-by-one result is a defect. A recursive helper should branch on the expected type and reserve approximate comparison for fields whose contract permits floating error.

### How do I choose between relative and absolute tolerance?

Use relative tolerance when acceptable error scales with magnitude, and an absolute tolerance for values near zero or domains with a fixed unit resolution. Since \`pytest.approx\` accepts either bound, set both only after understanding what each permits.

### Can I make NaN equal NaN in a nested response?

Pass \`nan_ok=True\` at the relevant leaf, but only if NaN is valid domain data. For JSON APIs, first confirm whether NaN is even a legal wire value. Often \`null\` or an explicit status field is the correct contract.

### Why not round every float before comparing dictionaries?

Rounding encodes a decimal-place display rule and can behave unexpectedly at boundaries. It also discards error information. Use it when the product contract explicitly specifies rounded output; otherwise compare original values with tolerances derived from the numerical domain.
`,
};
