import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'PySpark Testing with pytest and chispa',
  description: 'PySpark testing guide for pytest and chispa users: build Spark fixtures, compare DataFrames, verify schemas, debug flaky rows, tune local runs, and wire CI gates.',
  date: '2026-09-28',
  category: 'Tutorial',
  content: `
# PySpark Testing with pytest and chispa

PySpark testing with pytest and chispa gives QA engineers a fast way to validate Spark transformations without waiting for a full data platform deployment. Use pytest for fixtures, selection, parametrization, and CI behavior. Use chispa when you want readable DataFrame diff output, flexible comparison flags, and small local tests that fail at the transformation boundary.

As of September 28, 2026, Apache Spark is active and the latest Spark release I verified is 4.2.0, released July 14, 2026. PySpark also ships official testing helpers: \`pyspark.testing.assertDataFrameEqual\` and \`pyspark.testing.assertSchemaEqual\`, with \`assertDataFrameEqual\` documented as new in Spark 3.5.0. chispa is also active: the latest PyPI release I verified is \`chispa==0.12.0\`, uploaded March 24, 2026, with the source repository on GitHub under MrPowers/chispa.

The practical answer is: use chispa for most local transformation tests when diff readability matters, use PySpark built-ins when you want fewer dependencies or compatibility with Spark Connect and pandas-on-Spark comparisons, and use pytest to keep Spark session setup controlled. If your data quality work extends into warehouse models after Spark, the same thinking connects naturally to [dbt tests for data quality](/blog/dbt-tests-data-quality-guide-2026). For pytest CLI selection and marker reference, keep the [pytest official reference cheatsheet](/blog/pytest-official-reference-cheatsheet-2026) nearby.

## Choosing Between chispa And PySpark Testing Utils

chispa was built to make PySpark assertion failures easier to read. Its documented \`assert_df_equality\` options include \`ignore_row_order\`, \`ignore_column_order\`, \`ignore_nullable\`, \`ignore_metadata\`, \`ignore_columns\`, \`allow_nan_equality\`, \`transforms\`, and \`underline_cells\`. It also exposes \`assert_column_equality\` and approximate DataFrame equality helpers.

PySpark testing utilities are now strong enough for many teams. Spark 4.2 documents \`assertDataFrameEqual\` and \`assertSchemaEqual\`; \`assertDataFrameEqual\` supports options such as \`checkRowOrder\`, \`rtol\`, \`atol\`, \`ignoreNullable\`, \`ignoreColumnOrder\`, \`ignoreColumnName\`, \`ignoreColumnType\`, \`maxErrors\`, \`showOnlyDiff\`, and \`includeDiffRows\`.

| Need | Prefer chispa | Prefer PySpark built-in |
|---|---|---|
| Human-readable Spark DataFrame diffs | Yes, this is chispa's core value | Good and improving, especially with diff options |
| Avoid third-party test dependency | No | Yes |
| Compare pandas, pandas-on-Spark, Spark Connect | Not the main purpose | Yes, documented support |
| Ignore specific columns | \`ignore_columns=["loaded_at"]\` | Use select/drop before comparing |
| Approximate numeric equality | \`assert_approx_df_equality\` | \`rtol\` and \`atol\` on \`assertDataFrameEqual\` |
| Existing Spark 3.4 or older project | chispa is useful | Built-ins may not exist |

What people get wrong: they treat DataFrame order as deterministic because the tiny local test happened to pass once. Spark DataFrames are distributed collections. Unless the transformation contract includes ordering, compare with order ignored or sort both frames through an explicit transform before asserting.

## Install And Pin For A Local Test Harness

For a modern project, keep PySpark, chispa, and pytest in test dependencies. Spark 4.2's PyPI package requires Python 3.10 or newer. CI also needs a compatible Java runtime because PySpark starts a JVM even when the test runs in local mode.

\`\`\`toml
[project]
name = "pyspark-transform-tests"
version = "0.1.0"
requires-python = ">=3.11,<3.14"
dependencies = [
  "pyspark==4.2.0",
]

[dependency-groups]
dev = [
  "chispa==0.12.0",
  "pytest>=8.0.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
markers = [
  "spark: tests that start a local SparkSession",
  "slow: larger local Spark tests",
]
addopts = "-ra --strict-markers"
\`\`\`

If you use Spark 3.5.x because your managed platform has not moved to Spark 4, the same structure still applies. Verify the exact PySpark package version against the runtime your production jobs use. DataFrame semantics, timestamp behavior, ANSI mode defaults, and error classes can change across Spark lines.

## Build A SparkSession Fixture That Does Not Fight pytest

A Spark session is expensive compared with a normal Python fixture. Create it once per test session unless your tests deliberately mutate Spark configuration. Keep local parallelism low, disable the Spark UI, and reduce shuffle partitions so tiny tests do not spend most of their time planning tasks.

\`\`\`python
# tests/conftest.py
from __future__ import annotations

import pytest
from pyspark.sql import SparkSession


@pytest.fixture(scope="session")
def spark() -> SparkSession:
    session = (
        SparkSession.builder.master("local[2]")
        .appName("pytest-pyspark")
        .config("spark.ui.enabled", "false")
        .config("spark.sql.shuffle.partitions", "2")
        .config("spark.sql.session.timeZone", "UTC")
        .getOrCreate()
    )
    yield session
    session.stop()
\`\`\`

| Fixture choice | When to use it | Risk |
|---|---|---|
| \`scope="session"\` | Most transformation suites | Config changes leak if tests mutate session settings |
| \`scope="module"\` | Modules need different Spark configs | More startup cost |
| \`scope="function"\` | Tests mutate global Spark state | Slow and noisy |
| Separate fixtures per config | ANSI mode, timezone, catalog tests | Easy to overcomplicate |

Do not start Spark at import time. A session-scoped fixture gives pytest control over setup, teardown, and skipped tests. It also gives AI coding agents one canonical place to add settings instead of scattering \`SparkSession.builder\` calls across generated tests.

## A Transformation Worth Testing

The example below has enough behavior to justify Spark tests: it validates required columns, normalizes country codes, derives a status column, and returns a stable projection. It does not read files, write tables, or reach external systems. That boundary is intentional.

\`\`\`python
# src/orders/transforms.py
from __future__ import annotations

from pyspark.sql import DataFrame
from pyspark.sql import functions as F


REQUIRED_COLUMNS = {"order_id", "country", "amount_cents"}


def enrich_orders(orders: DataFrame) -> DataFrame:
    missing = REQUIRED_COLUMNS.difference(set(orders.columns))
    if missing:
        names = ", ".join(sorted(missing))
        raise ValueError(f"Missing required columns: {names}")

    return (
        orders.select("order_id", "country", "amount_cents")
        .withColumn("country", F.upper(F.trim(F.col("country"))))
        .withColumn(
            "order_value_band",
            F.when(F.col("amount_cents") >= F.lit(10000), F.lit("high"))
            .when(F.col("amount_cents") >= F.lit(1000), F.lit("standard"))
            .otherwise(F.lit("low")),
        )
        .select("order_id", "country", "amount_cents", "order_value_band")
    )
\`\`\`

This is the right size for PySpark unit tests. The input is tiny, all expected rows are visible in the test, and the assertion checks the full output, not just a row count. A row-count-only test would miss a broken country normalization or a swapped band threshold.

## DataFrame Equality With chispa

Use explicit schemas for tests that care about types. PySpark's inference can make a passing test too generous, especially around nulls, integers, decimals, and timestamps. chispa is strict by default about row order, column order, and nullability, so choose flags that match the transformation contract.

\`\`\`python
# tests/test_enrich_orders_chispa.py
from __future__ import annotations

import pytest
from chispa import assert_df_equality
from pyspark.sql.types import IntegerType, StringType, StructField, StructType

from orders.transforms import enrich_orders


ORDER_SCHEMA = StructType(
    [
        StructField("order_id", StringType(), False),
        StructField("country", StringType(), True),
        StructField("amount_cents", IntegerType(), False),
    ]
)

EXPECTED_SCHEMA = StructType(
    [
        StructField("order_id", StringType(), False),
        StructField("country", StringType(), True),
        StructField("amount_cents", IntegerType(), False),
        StructField("order_value_band", StringType(), False),
    ]
)


@pytest.mark.spark
def test_enrich_orders_normalizes_country_and_band(spark):
    source = spark.createDataFrame(
        [
            ("A-100", " us ", 1299),
            ("B-200", "in", 999),
            ("C-300", "GB", 10000),
        ],
        ORDER_SCHEMA,
    )
    expected = spark.createDataFrame(
        [
            ("A-100", "US", 1299, "standard"),
            ("B-200", "IN", 999, "low"),
            ("C-300", "GB", 10000, "high"),
        ],
        EXPECTED_SCHEMA,
    )

    actual = enrich_orders(source)

    assert_df_equality(
        actual,
        expected,
        ignore_row_order=True,
        ignore_nullable=True,
        underline_cells=True,
    )
\`\`\`

\`ignore_row_order=True\` says that ordering is not part of this function's contract. \`ignore_nullable=True\` is useful when Spark derives nullability differently after expressions. Do not set every ignore flag by habit. If column order is part of a downstream contract, leave \`ignore_column_order\` false and let the test catch accidental projection drift.

## Column Assertions For Incremental Debugging

When a transformation has one suspicious derived field, \`assert_column_equality\` can make the failure smaller. It compares two columns in the same DataFrame. That is useful when you intentionally keep expected values beside raw data.

\`\`\`python
# tests/test_order_band_column.py
from __future__ import annotations

import pytest
from chispa import assert_column_equality
from pyspark.sql import functions as F
from pyspark.sql.types import IntegerType, StringType, StructField, StructType

from orders.transforms import enrich_orders


@pytest.mark.spark
def test_order_value_band_column(spark):
    schema = StructType(
        [
            StructField("order_id", StringType(), False),
            StructField("country", StringType(), True),
            StructField("amount_cents", IntegerType(), False),
            StructField("expected_band", StringType(), False),
        ]
    )
    source = spark.createDataFrame(
        [
            ("A-100", "us", 100, "low"),
            ("B-200", "us", 1000, "standard"),
            ("C-300", "us", 10000, "high"),
        ],
        schema,
    )

    actual = enrich_orders(source.drop("expected_band")).join(
        source.select("order_id", "expected_band"),
        on="order_id",
        how="inner",
    )

    assert actual.filter(F.col("expected_band").isNull()).count() == 0
    assert_column_equality(actual, "order_value_band", "expected_band")
\`\`\`

Notice the presence check before comparing columns. Without it, a broken join could hide behind a misleading column comparison. Meaningful assertions around Spark joins should prove both the join coverage and the derived values.

## PySpark Built-In Assertions

The official Spark helpers are worth learning even if you adopt chispa. They reduce dependencies and match Spark's own testing vocabulary. In Spark 4.2 docs, \`assertDataFrameEqual\` supports tolerance for approximate numeric comparisons, row order checks, column order ignores, nullable ignores, and diff controls.

\`\`\`python
# tests/test_enrich_orders_builtin.py
from __future__ import annotations

import pytest
from pyspark.testing.utils import assertDataFrameEqual, assertSchemaEqual

from orders.transforms import enrich_orders


@pytest.mark.spark
def test_enrich_orders_with_pyspark_testing_utils(spark):
    source = spark.createDataFrame(
        [
            {"order_id": "A-100", "country": " us ", "amount_cents": 1299},
            {"order_id": "B-200", "country": "in", "amount_cents": 999},
        ]
    )
    expected = spark.createDataFrame(
        [
            {
                "order_id": "A-100",
                "country": "US",
                "amount_cents": 1299,
                "order_value_band": "standard",
            },
            {
                "order_id": "B-200",
                "country": "IN",
                "amount_cents": 999,
                "order_value_band": "low",
            },
        ]
    )

    actual = enrich_orders(source)

    assertDataFrameEqual(
        actual,
        expected,
        checkRowOrder=False,
        ignoreNullable=True,
        showOnlyDiff=True,
    )
    assertSchemaEqual(actual.schema, expected.schema)
\`\`\`

The option names differ from chispa. chispa uses \`ignore_row_order=True\`; PySpark uses \`checkRowOrder=False\`. chispa uses \`ignore_nullable=True\`; PySpark uses \`ignoreNullable=True\`. That difference is small for humans and surprisingly easy for an AI coding agent to mix up, so review generated tests for the assertion library they actually import.

## Schema Tests That Catch Quiet Breakage

DataFrame equality usually checks schema and data together, but dedicated schema tests are still valuable for pipelines with contracts. A downstream table might accept a nullable field in dev and then fail a stricter production merge. A partner feed might require exact column names. A BI model might depend on integer cents rather than floating dollars.

\`\`\`python
# tests/test_schema_contract.py
from __future__ import annotations

import pytest
from pyspark.sql.types import IntegerType, StringType, StructField, StructType
from pyspark.testing.utils import assertSchemaEqual

from orders.transforms import enrich_orders


@pytest.mark.spark
def test_enrich_orders_schema_contract(spark):
    source_schema = StructType(
        [
            StructField("order_id", StringType(), False),
            StructField("country", StringType(), True),
            StructField("amount_cents", IntegerType(), False),
        ]
    )
    expected_schema = StructType(
        [
            StructField("order_id", StringType(), False),
            StructField("country", StringType(), True),
            StructField("amount_cents", IntegerType(), False),
            StructField("order_value_band", StringType(), False),
        ]
    )
    source = spark.createDataFrame([("A-100", "us", 1299)], source_schema)

    actual = enrich_orders(source)

    # ignoreNullable defaults to True, so opt in to a strict nullability check.
    assertSchemaEqual(actual.schema, expected_schema, ignoreNullable=False)
\`\`\`

Schema tests should be intentionally strict. If nullability is not stable across the transformation you are testing, decide whether that is acceptable and document it. A blanket \`ignoreNullable=True\` can be correct for expression-heavy derived frames, but it is risky for table contracts where nullability is a production guarantee.

## Negative Tests For Data Contracts

A complete PySpark test suite includes failure paths. If a required column is missing, the transform should fail before Spark produces a confusing analysis exception deep inside the plan. That makes tests and production alerts easier to diagnose.

\`\`\`python
# tests/test_contract_failures.py
from __future__ import annotations

import pytest

from orders.transforms import enrich_orders


@pytest.mark.spark
def test_enrich_orders_rejects_missing_required_column(spark):
    source = spark.createDataFrame(
        [{"order_id": "A-100", "country": "US"}]
    )

    with pytest.raises(ValueError, match="Missing required columns: amount_cents"):
        enrich_orders(source)
\`\`\`

This is a small test, but it protects a large operational assumption. If an upstream feed drops a column, you want a clear contract failure, not a partial write, empty output, or late SQL error. AI-generated tests often skip negative paths because happy-path examples are easier to synthesize. Ask for them explicitly.

## Local Performance Rules For Spark Tests

Fast PySpark tests come from small data, low shuffle partitions, and narrow contracts. Do not load production files into unit tests. Do not call \`collect()\` on large frames just to inspect them. Do not start a new Spark session for every test unless you are testing session-level configuration.

| Smell | Better move | Reason |
|---|---|---|
| Test reads a large Parquet directory | Build a tiny DataFrame inline | Keeps failure local to transformation logic |
| Every test calls \`SparkSession.builder\` | Use a pytest fixture | Centralizes setup and teardown |
| Assertion only checks \`count()\` | Compare expected DataFrame or schema | Row count misses wrong values |
| Test depends on output ordering | Sort intentionally or ignore order | Spark ordering is not implicit |
| CI runs all Spark tests on every edit | Use pytest markers and \`-k\` filters | Keeps pull requests responsive |

pytest's current reference documents \`-k\` for keyword selection, \`-m\` for marker expressions, \`--maxfail\` for failure limits, and \`--last-failed\` for reruns. Those flags are especially helpful when Spark startup time is nontrivial.

\`\`\`bash
pytest -m spark --maxfail=2
pytest -k "enrich_orders and not slow"
pytest --last-failed
\`\`\`

Use \`local[2]\` or \`local[4]\` for most laptop and CI tests. Higher local parallelism can make tiny suites slower by increasing scheduling overhead and memory pressure. If you need realistic scale behavior, mark that test separately and run it in a nightly job or a platform-specific integration stage.

## CI For PySpark pytest Suites

CI needs Python, Java, dependencies, and a test command that separates fast Spark tests from slow platform checks. Current GitHub Actions majors include \`actions/checkout@v7\`, \`actions/setup-python@v7\`, \`actions/setup-java@v6\`, and \`actions/upload-artifact@v7\`.

\`\`\`yaml
name: pyspark-tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  unit-and-spark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: "17"
      - uses: actions/setup-python@v7
        with:
          python-version: "3.11"
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          python -m pip install -e ".[dev]"
      - name: Run pytest
        run: pytest -m "not slow" --maxfail=3
      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: pytest-cache-\${{ github.run_id }}
          path: .pytest_cache
          if-no-files-found: ignore
\`\`\`

If CI fails before tests run, inspect Java first. If tests pass locally but fail in CI with timestamp differences, pin \`spark.sql.session.timeZone\` to UTC in the fixture. If failures appear only when tests run together, look for session-level config mutation, cached temporary views, reused table names, or tests that write into shared local paths.

## A Realistic Flaky Failure And Its Diagnosis

Failure:

\`\`\`text
chispa.dataframe_comparer.DataFramesNotEqualError:
Rows are not equal
\`\`\`

The test passes locally sometimes and fails in CI. The transformation includes a join and does not call \`orderBy\`. The expected rows are identical, but the order is different. Diagnosis: the test asserted row order even though the transform contract did not include order. Fix the assertion to use \`ignore_row_order=True\`, or sort both frames by a stable key if ordering is a real output requirement.

The opposite failure is also common. A developer adds \`ignore_column_order=True\` because it makes a test pass, but the production writer expects columns in a specific projection. That test is now hiding a schema contract issue. Comparison flags are not decorations. Each one should encode a decision about the output contract.

## Prompting AI Agents To Write Better PySpark Tests

When you ask an agent to add PySpark tests, give it these constraints: use the existing \`spark\` fixture, create tiny DataFrames inline with explicit schemas, compare DataFrames with chispa unless built-in helpers are requested, choose row-order behavior deliberately, assert schemas for contract outputs, and include one negative test for missing or invalid input.

Also ask it to run only the relevant selection first, such as \`pytest -k enrich_orders\`, then the marked Spark subset. This reduces edit latency and avoids the common agent loop where it changes production code to satisfy a weak test instead of improving the assertion.

The best generated test is not the longest one. It is the one that would fail for the bug you are afraid of: wrong null handling, wrong threshold, wrong deduplication key, wrong join type, wrong timestamp zone, wrong schema, or an accidental production path write.

## Frequently Asked Questions

### Should new projects use chispa or PySpark's built-in assertions?

Use both deliberately. PySpark's built-in helpers are excellent when you want official utilities, fewer dependencies, Spark Connect support, or pandas-on-Spark comparisons. chispa is still attractive for transformation-heavy suites because its DataFrame diffs and options are ergonomic. A practical split is chispa for local Spark DataFrame unit tests and PySpark built-ins for schema checks or projects that cannot add test dependencies. Keep option names straight because they differ between libraries.

### Why do my PySpark tests pass locally and fail in CI?

The usual causes are Java differences, timezone differences, row-order assumptions, missing environment variables, or Spark session state leaking between tests. Pin Java in CI, set \`spark.sql.session.timeZone\` to UTC, and avoid relying on implicit DataFrame ordering. If a test passes alone but fails in the suite, search for cached views, modified Spark conf, reused temp paths, or writes to shared table names. Session-scoped fixtures are fast, but they reward clean tests.

### How small should PySpark test data be?

Small enough that every row expresses a rule. A good unit test DataFrame often has three to ten rows: one normal case, one boundary, one null or malformed input, and one duplicate or join edge when relevant. Larger data belongs in integration or reconciliation tests. The goal is not to prove Spark can process volume. The goal is to prove your transformation logic handles representative cases and fails clearly when the contract is violated.

### Is checking only DataFrame count ever enough?

Count checks are useful as supporting assertions, not as the main proof. A transform can return the correct number of rows with wrong values, wrong schema, wrong join keys, duplicated business entities, or broken null handling. Prefer full DataFrame equality for small outputs and schema assertions for contract boundaries. If volume makes full equality impractical, compare targeted aggregates, key uniqueness, null counts, and sampled rows with deterministic filters.
`,
};
