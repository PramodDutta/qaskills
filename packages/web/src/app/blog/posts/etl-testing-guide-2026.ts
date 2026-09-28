import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'ETL Testing Guide for QA Engineers: Pipelines, Data Validation, and CI',
  description: 'ETL testing for pipelines: reconcile source and target with checksums, check schema contracts, and fail CI when an incremental load would publish bad rows.',
  date: '2026-09-28',
  category: 'Guide',
  content: `
# ETL Testing Guide for QA Engineers: Pipelines, Data Validation, and CI

ETL testing is the set of assertions that prove a pipeline moved the right rows, kept the right grain, and applied the right rules. A green orchestrator task only proves that a process exited zero. It does not prove that yesterday's refunds survived the join, that an incremental watermark did not drop rows sharing a timestamp, or that a deleted customer is still sitting in a snapshot as if they were current. The practical suite has four layers: a source contract (schema, keys, freshness), a transformation check that can run before the full table is built, a post-build data test on the relation you actually publish, and a source-to-target reconciliation that compares keys and measures, not just row counts.

Most warehouse work in 2026 is ELT. Raw tables land first, and the transform runs in the warehouse, often as a dbt project. The test obligations do not change because the transform moved. You still owe a check at the extract boundary, a check on the SQL that reshapes the data, and a check that the published relation matches the source for a closed slice of time. dbt calls the post-build assertions data tests. \`dbt test\` runs them. The YAML key \`data_tests:\` is the current name. \`tests:\` remains an alias, and you cannot put both keys on the same resource. Out of the box, dbt ships four generic data tests: \`unique\`, \`not_null\`, \`accepted_values\`, and \`relationships\`. Anything else is a singular SQL file, a custom \`test\` block, or a package such as dbt-utils 1.4.1 (dbt Hub lists it as requiring dbt \`>=1.3.0, <3.0.0\`).

This guide is the QA view of that stack: how to reconcile, how to lock a schema, how to unit-test incremental SQL, how snapshots implement type-2 history, and how to order those checks in CI so a stale extract never gets certified. Column-level patterns that live inside a dbt project are expanded in [dbt tests for data quality](/blog/dbt-tests-data-quality-guide-2026). Batch validation outside the model DAG, including dataframes, is covered in [Great Expectations data quality testing](/blog/great-expectations-data-quality-testing-guide).

## Reconcile keys and amounts, not just row counts

Start reconciliation from a business key and a closed partition, then add measures. A row-count match is a cheap first signal and a weak last one. Two relations can both have 1,000,000 rows while every amount is wrong, or while customer ids are swapped between orders. The sequence that holds up in review is:

1. Same set of keys for the slice (missing in target, extra in target).
2. Same grain: one row per key, unless the model is explicitly a bridge or a fact at a finer grain.
3. Same additive measures (sum of amount, sum of quantity) with a tolerance you can defend, such as integer cents with tolerance 0.
4. A column-level compare on the attributes finance or the product actually reads (status, currency, customer id), null-safe.
5. A freshness check so you are not reconciling an empty late partition and calling it success.

Do the work on a slice that is no longer being written. Soda's reconciliation docs make the same point for a different reason: a row-level diff reads both sides page by page and does not hold one snapshot across pages. Inserts during the scan can be counted twice or skipped. dbt tests have the same exposure if they scan a table that the loader is still merging into. Pick yesterday's closed business date, or a microbatch id that the loader has marked complete.

The singular test below is the shape dbt expects: a \`select\` that returns the failing rows, and zero rows when the assertion holds. It is also plain SQL. PostgreSQL and SQLite 3.39+ both accept the CTE and the full outer join. Save it as \`tests/assert_order_amount_reconcile.sql\` in a dbt project (omit the trailing semicolon, which dbt documents as a cause of singular-test failures) or run it as-is against a fixture database. The sample data is inline so the query is executable without a warehouse.

\`\`\`sql
with source_rows(order_id, status, amount_cents) as (
  values
    (1, 'paid', 1000),
    (2, 'refund', -200),
    (3, 'paid', 450)
),
target_rows(order_id, status, amount_cents) as (
  values
    (1, 'paid', 1000),
    (2, 'refund', -200),
    (4, 'paid', 450)
)
select
  coalesce(s.order_id, t.order_id) as order_id,
  s.status as source_status,
  t.status as target_status,
  s.amount_cents as source_amount_cents,
  t.amount_cents as target_amount_cents,
  case
    when s.order_id is null then 'extra_in_target'
    when t.order_id is null then 'missing_in_target'
    when s.status <> t.status then 'status_mismatch'
    when s.amount_cents <> t.amount_cents then 'amount_mismatch'
    else 'unclassified'
  end as failure_reason
from source_rows as s
full outer join target_rows as t
  on s.order_id = t.order_id
where s.order_id is null
   or t.order_id is null
   or s.status <> t.status
   or s.amount_cents <> t.amount_cents;
\`\`\`

On this fixture the query returns two rows: order 3 is missing in the target, order 4 is extra. Order 2 is a legitimate negative refund and must not be filtered out by a \`amount_cents > 0\` rule that someone copied from a payments model. When you point the same shape at real relations, replace the CTEs with \`source()\` and \`ref()\`, and add a predicate on a closed date. Null-safe comparison matters the moment status is nullable: \`<>\` does not catch null versus a value in SQL three-valued logic. On PostgreSQL, \`is distinct from\` is the null-safe operator. In portable SQL, compare with \`(s.status = t.status or (s.status is null and t.status is null))\` and fail the row when that expression is false.

dbt-utils 1.4.1 already encodes three of these checks, and current dbt (v1.10.5 and later, required on dbt v2 and on Fusion) wants the macro arguments nested under \`arguments:\`:

- \`dbt_utils.equal_rowcount\` compares counts. It accepts \`group_by_columns\` when the count must match inside a segment, not only for the whole table.
- \`dbt_utils.equality\` compares rows. \`compare_columns\` limits the compare, \`exclude_columns\` drops load timestamps you expect to differ, and \`precision\` rounds numeric columns before the compare.
- \`dbt_utils.expression_is_true\` asserts a SQL expression, with an optional \`where\` config for a subset.

Soda's contract language, documented on the reconciliation reference, is the cross-database version of the same idea. \`row_count_diff\` compares counts. \`aggregate_diff\` compares \`sum\`, \`avg\`, \`min\`, \`max\`, or \`avg_length\` on a named column per side. \`rows_diff\` aligns on \`source_key_columns\` and \`target_key_columns\` and compares an explicit column list. \`reference_diff\` checks that distinct values exist on the other side (the cross-database foreign key). \`schema_diff\` compares live columns and types between two datasets, which is different from a schema check against the contract itself. Thresholds default to zero difference. A percent threshold is relative to the source row count on a rows diff, so a tiny source can make a small absolute miss look huge. Soda excludes rows whose key is null from \`rows_diff\`, counts them in \`null_key_rows_source\` and \`null_key_rows_target\`, and does not treat them as diffs. A null key therefore hides rows from reconciliation. Test \`not_null\` on that key separately or the diff will look cleaner than the data is.

Two Soda limits are easy to miss until CI hangs or the check returns \`NOT_EVALUATED\`. Rows diff is not supported on Synapse. Rows diff also cannot compare two datasets that live in the same Snowflake data source: one side must be a different Snowflake instance or a different source type. If the two sides project a different number of columns, the check cannot align them. Add a \`schema_diff\` on the same source before you debug the row diff.

| Check | What a pass actually proves | What it will not catch |
| --- | --- | --- |
| Row count, or \`equal_rowcount\` | Both sides have the same number of rows in the filtered slice | Swapped attributes, a wrong exchange rate, a join that duplicated and then a distinct that collapsed the count |
| Sum of an additive measure | The totals match within the threshold | Two rows that traded amounts and still sum to the same value |
| Key-aligned row diff | Each key's compared columns match, and no key is only on one side | Any column you left off the compare list, and any row whose key was null (Soda drops those from the diff) |
| Distinct-value reference | Every target code exists in the source set | Duplicates, because the compare is on distinct values, and nulls in the compared columns |
| Schema diff | Column names and types line up, after any rename map you declared | A well-typed value that is still wrong |

Checksums sit between the sum and the row diff. Hash a canonical string of the key plus the columns you care about, ordered by the key, and compare the digest. A digest failure tells you the slice disagrees. It does not tell you which row. Keep the row-returning query for diagnosis, and use the digest as the CI gate when a full row diff is too expensive. Soda's own docs publish an in-memory rows-diff cost, which you should treat as their figure rather than a universal benchmark: about 9 seconds and under 80 MB for 10 columns and 500,000 rows at a 1 percent change rate, and about 35 minutes for 360 columns and 1,000,000 rows under the same change rate. Their recommendation matches warehouse practice. Filter to the new batch, and run the metric diff first so you only pay for a row diff when the totals already disagree.

## Schema contracts that fail the build

A schema check asks whether the relation still has the columns and types consumers compile against. A data test asks whether the values are acceptable after the relation exists. dbt model contracts are the first kind, and they fail the build rather than recording a failed test after the table is already replaced.

Set \`contract: { enforced: true }\` and declare every column's \`name\` and \`data_type\`. Partial contracts are not a feature. dbt's preflight check compares the query result to that list, ignoring column order in the \`select\`, then emits DDL that orders columns as the contract specifies. Contracts are supported on \`table\`, \`view\`, and \`incremental\` models. Incremental models must set \`on_schema_change\` to \`append_new_columns\` or \`fail\`. Views can contract names and types, not constraints. Contracts are not supported on Python models, \`ephemeral\` models, materialized views, or on sources, seeds, and snapshots.

Constraints are where teams fool themselves. Whether the warehouse enforces the constraint is platform-specific, and dbt's contract docs spell this out:

- Postgres enforces \`not_null\`, \`primary_key\`, \`foreign_key\`, \`unique\`, and \`check\`.
- Snowflake and Redshift enforce \`not_null\`. \`primary_key\`, \`foreign_key\`, and \`unique\` can be declared and are not enforced. \`check\` is not available.
- BigQuery enforces \`not_null\`. \`primary_key\` and \`foreign_key\` can be declared and are not enforced. \`unique\` and \`check\` are not available.
- Databricks enforces \`not_null\` and \`check\`. \`primary_key\` and \`foreign_key\` are not enforced. \`unique\` is not available.
- On Spark, \`not_null\` and \`check\` are enforced only after the model is built, so dbt does not treat them as contract enforcement.
- Athena does not define or enforce these constraint types through the contract.

So a Snowflake model with a contracted \`primary_key\` still needs a \`unique\` data test plus \`not_null\`. The contract stopped a column rename from shipping. It did not stop a duplicate.

Breaking changes, compared with the previous project state, include removing a column, changing \`data_type\`, removing or modifying a constraint (dbt v1.6 and later), and removing a contracted model (dbt v1.9 and later: versioned models error, unversioned models warn). That is the right bar for a mart a dashboard selects from. It is the wrong bar for a staging model whose column list still moves every sprint. dbt's own guidance is to contract public models that other groups, other projects, or an exposure actually depend on.

\`on_schema_change\` is the incremental cousin of the contract, and it does less than people think.

| \`on_schema_change\` | New column in the model | Column removed from the model | Values backfilled on old rows |
| --- | --- | --- | --- |
| \`ignore\` (default) | Not added to the table | The run fails | No |
| \`fail\` | The run errors | The run errors | No |
| \`append_new_columns\` | Added | Left in place | No |
| \`sync_all_columns\` | Added, and type changes are included | Removed | No |

None of these modes backfill old rows for a new column. If the new column must be populated for history, you run an update yourself or you \`--full-refresh\`. \`on_schema_change\` also tracks top-level columns only. A nested field added inside a BigQuery struct will not trip it. There is a live adapter caveat: Snowflake has planned a wider default string and binary column size for September 2026, and \`dbt-snowflake\` below v1.10.6 can fail incremental models that use string columns with collation and \`on_schema_change: sync_all_columns\`. The documented impact check is \`dbt ls -s config.materialized:incremental,config.on_schema_change:sync_all_columns --resource-type model\`. No nodes selected means you are clear. Otherwise upgrade (\`dbt-snowflake\` v1.10.6 or later on dbt v1, or dbt v2.0.0).

## Unit-test the SQL, then data-test the table

Data tests run after the model is built. They are the wrong tool for a 40-branch \`case\` expression, because you only learn the branch is wrong once the warehouse has scanned production history. Unit tests, available since dbt v1.8, feed static rows to the model and compare the result. They live in YAML under \`model-paths\` (usually \`models/\`), not in the \`tests/\` directory, which is reserved for data tests. dbt documents several limits: SQL models only, current project only, no materialized views, no recursive SQL, no introspective queries, and every \`ref\` or \`source\` the model touches must appear as an input or compilation fails with a missing node. Join logic has to use table aliases. Direct parents must already exist in the warehouse so dbt can read their schemas. Build those parents empty first:

\`\`\`bash
dbt run --select "config.materialized:incremental" --empty
dbt test --select "test_type:unit"
\`\`\`

\`--empty\` limits the parent build to zero rows so you are not paying for a full refresh just to type-check a unit test. \`test_type:unit\` is the selector that works on dbt v1 and dbt v2. The inverse, \`dbt test --select "test_type:data"\`, runs data tests and skips unit tests. dbt is explicit that unit tests belong in development and CI. The inputs are static, so a production job that reruns them spends warehouse compute to re-prove a fixture. Exit codes differ from data tests: a unit test is one case, so the result is 0 or 1, not "17 failing rows".

The incremental model below keeps a stable order grain. The unit test overrides \`is_incremental\` and supplies \`this\`, which is the current target table. The expected rows are the rows the \`select\` returns for the merge or insert, not the table as it will look after the merge. dbt documents that the framework merge itself is not what the unit test verifies.

\`\`\`sql
{{ config(materialized='incremental', unique_key='order_id') }}

select
  order_id,
  event_time,
  amount_cents
from {{ ref('stg_orders') }}
{% if is_incremental() %}
where event_time > (
  select coalesce(max(event_time), timestamp '1900-01-01')
  from {{ this }}
)
{% endif %}
\`\`\`

\`\`\`yaml
unit_tests:
  - name: fct_orders_incremental_emits_rows_after_watermark
    model: fct_orders
    overrides:
      macros:
        is_incremental: true
    given:
      - input: ref('stg_orders')
        rows:
          - {order_id: 1, event_time: "2026-09-27 00:00:00", amount_cents: 1000}
          - {order_id: 2, event_time: "2026-09-28 00:00:00", amount_cents: 2500}
          - {order_id: 3, event_time: "2026-09-28 00:00:00", amount_cents: 2500}
      - input: this
        rows:
          - {order_id: 1, event_time: "2026-09-27 00:00:00", amount_cents: 1000}
    expect:
      rows:
        - {order_id: 2, event_time: "2026-09-28 00:00:00", amount_cents: 2500}
        - {order_id: 3, event_time: "2026-09-28 00:00:00", amount_cents: 2500}
\`\`\`

Read that expected set carefully. Order 1 is in the source and in \`this\`, and the filter is strict \`>\`. It is absent from \`expect\` on purpose. If a developer "fixes" a late-data bug by switching the predicate to \`>=\` without looking at the unit test, this case fails, which is what you want. If you also need the boundary row to be reprocessed (late updates that land with the same timestamp), write a second unit test whose \`expect\` includes the boundary key, and set \`unique_key\` so the merge updates that key instead of appending a second row. The unit test still will not prove the merge. Prove the merge with the idempotency test in the next section.

A second, smaller unit test should lock the full-refresh branch with \`overrides.macros.is_incremental: false\` and no \`this\` input. Both branches have to be valid SQL. dbt will not save you if the incremental branch references a column the full-refresh branch never selects.

Local unit-test execution is experimental. Set \`DBT_ENGINE_EXPERIMENTAL_LOCAL_UNIT_TESTS=true\`, then \`compute: local\` on the unit test (or \`+compute: local\` under \`unit_tests\` in \`dbt_project.yml\`). dbt runs the fixture on DuckDB instead of the warehouse. As documented, this is Snowflake or BigQuery only, the upstream relations must already exist so schemas can be fetched, and there is no fallback: a function DuckDB cannot translate fails the test. \`haversine\` and Snowflake \`AI_CLASSIFY\` are the examples dbt gives. Leave \`compute: remote\` (the default) for those models.

## Nulls, uniqueness, references, and freshness

Put the grain tests on every published model, and put the assumption tests on sources so a bad extract fails before you transform it. dbt's own recommendation is a \`unique\` and \`not_null\` pair on a primary key, and source tests for assumptions you do not control (an enum of payment methods, a foreign key that must already exist). For a composite grain, do not concatenate columns into one \`unique\` expression on a large table if you can avoid it. \`dbt_utils.unique_combination_of_columns\` with \`combination_of_columns\` is the documented alternative, and a list \`unique_key\` on an incremental model is the matching build config. Nulls in any column of that key break matching. Coalesce them or build a surrogate with \`dbt_utils.generate_surrogate_key\`. The older \`surrogate_key\` macro treated nulls and empty strings as the same. The current macro does not, unless you set \`surrogate_key_treat_nulls_as_empty_strings: true\`, which dbt-utils documents as the legacy behavior you should not turn on casually.

\`accepted_values\` belongs on low-cardinality status columns. Nest \`values\` under \`arguments:\`. \`relationships\` is the referential check: \`to: ref('dim_customers')\` and \`field: customer_id\`. When the dimension lags the fact by design, \`dbt_utils.relationships_where\` adds \`from_condition\` and \`to_condition\` so you exclude the last few minutes or a known test account instead of disabling the test. \`dbt_utils.not_null_proportion\` with \`at_least\` is the right tool for a column that is allowed to be sparse (a 0.95 floor on email) and the wrong tool for a key. \`dbt_utils.accepted_range\` covers numeric and date bounds, including comparing one column to another (\`num_returned_orders\` at most \`num_orders\`). \`dbt_utils.expression_is_true\` covers cross-column rules such as \`amount_cents = net_cents + tax_cents\`.

Severity is not a vibe. The default is \`severity: error\` and \`error_if: "!=0"\`. Set \`error_if\` and \`warn_if\` to SQL comparisons against the failure count, for example \`error_if: ">1000"\` and \`warn_if: ">10"\` on a column you already know is dirty while you clean history. With \`severity: error\`, dbt checks \`error_if\` first and then \`warn_if\`. With \`severity: warn\`, \`error_if\` is skipped. \`--warn-error\` promotes every dbt warning to an error, including Jinja noise, so prefer a per-test threshold over a global promotion unless you have read the warning log. Store the failing rows with \`--store-failures\` or \`store_failures: true\`. dbt writes them to a schema suffixed or named \`dbt_test__audit\` and replaces the previous rows for that same test on the next run. The columns you \`select\` in a singular test are the columns you get to debug. Built-in \`unique\` and \`not_null\` often return only the bad value, which is why a singular test that also selects the natural key and the load timestamp is easier to page someone with.

Freshness is a different query. It does not return bad rows. It compares the maximum load timestamp to now. In current dbt the command is \`dbt freshness\`, and it checks sources and models that declare the config. \`dbt source freshness\` still works and still writes \`sources.json\`, but it is the legacy sources-only command. Configure \`warn_after\` and \`error_after\`, each with both \`count\` and \`period\` (\`minute\`, \`hour\`, or \`day\`). Since v1.9 the block sits under \`config:\`. Since v1.10 you can set \`loaded_at_field\` or \`loaded_at_query\`, not both (that is a parse error). A \`filter\` adds a \`where\` clause so BigQuery does not scan an entire partitioned table to find \`max(loaded_at)\`. Setting \`freshness: null\` on one table opts it out of a source-level default.

\`\`\`yaml
sources:
  - name: orders
    database: raw
    config:
      loaded_at_field: _etl_loaded_at
      freshness:
        warn_after: {count: 6, period: hour}
        error_after: {count: 12, period: hour}
    tables:
      - name: orders
        config:
          freshness:
            warn_after: {count: 2, period: hour}
            error_after: {count: 4, period: hour}
            filter: "event_time >= current_date - interval '2 days'"
      - name: country_codes
        config:
          freshness: null

models:
  - name: fct_orders
    description: One row per order_id after the incremental merge.
    config:
      contract:
        enforced: true
      materialized: incremental
      unique_key: order_id
      on_schema_change: fail
    columns:
      - name: order_id
        data_type: bigint
        constraints:
          - type: not_null
        data_tests:
          - unique
          - not_null
      - name: status
        data_type: text
        data_tests:
          - not_null
          - accepted_values:
              arguments:
                values: ["paid", "refund", "void"]
      - name: amount_cents
        data_type: bigint
        data_tests:
          - not_null
      - name: customer_id
        data_type: bigint
        data_tests:
          - not_null
          - relationships:
              arguments:
                to: ref('dim_customers')
                field: customer_id
    data_tests:
      - dbt_utils.expression_is_true:
          arguments:
            expression: "status <> 'refund' or amount_cents <= 0"
      - dbt_utils.equal_rowcount:
          arguments:
            compare_model: ref('stg_orders')
          config:
            where: "event_time >= current_date - interval '1 day'"
\`\`\`

Model freshness has its own rules. \`table\`, \`incremental\`, \`materialized_view\`, and \`dynamic_table\` can omit \`loaded_at_field\` and fall back to adapter metadata such as the last altered time. \`view\` and \`external\` must set \`loaded_at_field\` or \`loaded_at_query\` because a view has no row-level metadata. An empty string does not count. \`ephemeral\` errors at parse time. Metadata freshness on a BigQuery wildcard table (\`events_*\`) is unreliable. The \`bigquery_reject_wildcard_metadata_source_freshness\` flag, from dbt v1.12, turns that into an error so you set \`loaded_at_field\` instead. \`build_after\` under freshness is the older state-aware orchestration knob and is Enterprise-only on the dbt platform. It has moved, for dbt State, to \`state.lag_tolerance\` and \`state.require_fresh_data_from\`. Do not copy a \`build_after\` block into a project that has already migrated and expect the scheduler to honor it.

\`dbt_utils.recency\` is the model-level cousin when you want a data test rather than the freshness command: \`datepart\`, \`field\`, and \`interval\`. Use it when "the newest row is older than one day" should show up in \`dbt test\` output next to \`unique\`, not in a separate freshness artifact.

## Incremental loads and idempotent reruns

\`is_incremental()\` is true only when the relation already exists as a table, the model is \`materialized='incremental'\`, and the run is not a full refresh. The SQL inside the model has to parse in both states. The first run builds the whole table. Later runs should filter to rows inserted or updated since the last success. The usual pattern reads \`max(event_time)\` from \`{{ this }}\`. Wrap it in \`coalesce\` so an empty table does not make the predicate unknown.

\`unique_key\` is what turns that filter into an update rather than an append. A single column or a list of columns defines the grain. A string expression such as a \`concat\` is the wrong shape: pass a list and let the adapter template it. Without \`unique_key\`, most adapters append every row the \`select\` returns. That is correct for an insert-only event log. It is a duplicate factory for a dimension or for any fact you might reprocess. If the key is not unique in the new batch or in the existing table, the merge can fail or pick an arbitrary winner, depending on the adapter and the \`incremental_strategy\`. \`delete+insert\` and \`merge\` use the key. \`insert_overwrite\` does not: it replaces partitions, so the key config is the wrong lever. Check the strategy before you debug a key that "is not being honored".

\`incremental_predicates\` is the large-table optimization for merge. dbt does not validate the SQL. On Snowflake the documented aliases during a merge are \`DBT_INTERNAL_DEST\` (the existing table) and \`DBT_INTERNAL_SOURCE\` (the batch). A predicate such as \`DBT_INTERNAL_DEST.session_start > dateadd(day, -7, current_date)\` stops the merge from scanning the whole destination. It does not change which source rows your model \`select\` reads. Filter the upstream scan in the model body as well, or you still transform three years of history to update one week.

Late data needs a lookback, not a tighter watermark. If events can arrive two days late, the incremental filter should re-read two days, and the \`unique_key\` merge should overwrite those keys. A strict \`event_time > max(event_time)\` drops every row that shares the maximum timestamp and never comes back for them, because the next run's maximum is still that timestamp. A \`>=\` watermark without a unique key re-inserts the boundary rows on every run, so the table grows. Those two bugs look opposite in the count and come from the same missing decision: what is the grain, and is the boundary row in or out?

Rebuild with \`dbt run --full-refresh --select fct_orders+\` when the SQL changes in a way old rows do not reflect. The trailing \`+\` includes downstream models, and downstream incrementals full-refresh too. \`full_refresh: true\` or \`false\` in config wins over the flag. Use \`false\` on a table you cannot afford to rebuild, and accept that you will write a one-off backfill. Snapshots are the exception described below: they ignore the flag.

Idempotency is a property you can execute. Run the same closed batch twice. The row count, the sum of \`amount_cents\`, and an ordered digest of \`order_id|amount_cents\` must be unchanged. Then update one source amount and run again. Exactly that key changes, and the row count stays put. The pytest below uses one sqlite3 connection, an explicit \`BEGIN\`, the writes, the assertions, and \`ROLLBACK\`. It does not talk to a warehouse, so it belongs in every pull request even when credentials are unavailable. The upsert is the merge stand-in: \`on conflict\` updates the existing key instead of inserting a second row.

\`\`\`python
import hashlib
import sqlite3

def _digest(conn: sqlite3.Connection) -> str:
    hasher = hashlib.sha256()
    found = conn.execute(
        "select order_id, amount_cents from stg_orders order by order_id"
    ).fetchall()
    assert len(found) > 0
    for order_id, amount_cents in found:
        hasher.update(f"{order_id}|{amount_cents}".encode("utf-8"))
        hasher.update(b"\\n")
    return hasher.hexdigest()

def test_order_batch_is_idempotent() -> None:
    conn = sqlite3.connect(":memory:")
    conn.isolation_level = None
    conn.execute("BEGIN")
    try:
        conn.execute(
            """
            create table stg_orders (
              order_id integer primary key,
              amount_cents integer not null,
              loaded_at text not null
            )
            """
        )
        batch = [
            (1, 1000, "2026-09-28T01:00:00Z"),
            (2, 2500, "2026-09-28T01:00:00Z"),
        ]
        insert = (
            "insert into stg_orders (order_id, amount_cents, loaded_at) "
            "values (?, ?, ?) "
            "on conflict(order_id) do update set "
            "amount_cents = excluded.amount_cents, "
            "loaded_at = excluded.loaded_at"
        )
        conn.executemany(insert, batch)
        first_digest = _digest(conn)
        first = conn.execute(
            "select count(*) as n, coalesce(sum(amount_cents), 0) as total from stg_orders"
        ).fetchone()
        assert first == (2, 3500)
        conn.executemany(insert, batch)
        second = conn.execute(
            "select count(*) as n, coalesce(sum(amount_cents), 0) as total from stg_orders"
        ).fetchone()
        assert second == (2, 3500)
        assert _digest(conn) == first_digest
        conn.execute(
            "update stg_orders set amount_cents = 1100 where order_id = 1"
        )
        changed = conn.execute(
            "select amount_cents from stg_orders where order_id = 1"
        ).fetchone()
        assert changed is not None
        assert changed[0] == 1100
        untouched = conn.execute(
            "select amount_cents from stg_orders where order_id = 2"
        ).fetchone()
        assert untouched is not None
        assert untouched[0] == 2500
        assert _digest(conn) != first_digest
    finally:
        conn.execute("ROLLBACK")
        conn.close()
\`\`\`

\`python -m pytest tests/test_order_reconcile.py -k idempotent --durations=10\` selects that test. pytest's keyword expression is \`-k\`, not a \`--grep\` flag. \`-m\` selects markers. The digest helper asserts the row set is non-empty before it hashes, so an empty table cannot collide with an empty digest and look "stable".

## Snapshot history and slowly changing dimensions

A type-2 slowly changing dimension keeps every version of a row. dbt snapshots are that mechanism for a mutable source. You configure them in YAML (the v1.9+ form), not in a Jinja \`{% snapshot %}\` block. Required pieces are \`relation\` (\`source(...)\` or \`ref(...)\`), \`unique_key\`, and \`strategy\`. \`timestamp\` reads an \`updated_at\` column and is the strategy dbt recommends, because adding a column does not force you to edit the snapshot. \`check\` compares \`check_cols\` (or \`all\`) and is what you use when no reliable timestamp exists. \`check_cols: all\` is convenient and brittle: a new technical column looks like a business change. Name the columns.

\`\`\`yaml
snapshots:
  - name: orders_snapshot
    relation: source('orders', 'orders')
    config:
      schema: snapshots
      unique_key: id
      strategy: timestamp
      updated_at: updated_at
      hard_deletes: new_record
      dbt_valid_to_current: "to_date('9999-12-31')"
\`\`\`

Run \`dbt snapshot --select orders_snapshot\`. The table gains \`dbt_valid_from\`, \`dbt_valid_to\`, \`dbt_scd_id\`, and \`dbt_updated_at\`. With \`hard_deletes: new_record\` it also gains \`dbt_is_deleted\`. Names can be remapped with \`snapshot_meta_column_names\`. For the timestamp strategy, \`dbt_valid_from\` comes from \`updated_at\`, not from the wall clock of the snapshot run. If the source updates a column and does not bump \`updated_at\`, the snapshot does not see a change. That is the first snapshot test: a fixture that changes \`status\` and \`updated_at\` together must close the old row and insert a new one. A fixture that changes \`status\` alone, under the timestamp strategy, must not.

\`dbt_valid_to\` is null on the current row unless you set \`dbt_valid_to_current\` (v1.9+) to a sentinel such as \`9999-12-31\`. Downstream models that still filter \`dbt_valid_to is null\` will then return no current rows. The sentinel and the filter have to move together. \`dbt_utils.mutually_exclusive_ranges\` wants both bounds non-null, so point it at \`coalesce(dbt_valid_to, date '9999-12-31')\` if you kept real nulls, partition by the business key, and decide whether gaps are \`allowed\`, \`not_allowed\`, or \`required\`. A second singular test should assert one open row per \`unique_key\`.

Hard deletes are off unless you opt in. \`hard_deletes\` (v1.9+, replacing \`invalidate_hard_deletes\`) has three values.

| \`hard_deletes\` | What happens to a source row that disappears |
| --- | --- |
| \`ignore\` (default) | The snapshot keeps the last version open. Counts of "current" customers include people the source already deleted. |
| \`invalidate\` | The open row is closed by setting \`dbt_valid_to\`. History has a gap for that key after the delete. |
| \`new_record\` | A new row is inserted with \`dbt_is_deleted\` true, so the timeline has no gap. A later restore inserts another row with \`dbt_is_deleted\` false. |

Snapshots ignore \`full_refresh\` and \`--full-refresh\`. \`dbt build --full-refresh\` will not drop a snapshot table. That is intentional: the table is the history. The failure mode is a snapshot whose \`unique_key\` was wrong for a month. You cannot rebuild it in place. You take a backup, drop it, and start history from today, or you accept the bad versions. Put snapshots in their own schema so a blanket \`drop schema analytics_ci cascade\` cannot reach them. dbt also tells you to test uniqueness of the source key you snapshot. A duplicate \`unique_key\` in the source makes the SCD match arbitrary.

From dbt v1.12, \`dbt compile --select orders_snapshot\` writes the snapshot SQL under \`target/compiled/\` so you can read the merge instead of inferring it. If the error is \`Snapshot target is not a snapshot table\` and it names missing \`dbt_scd_id\`, \`dbt_valid_from\`, or \`dbt_valid_to\`, the existing table was created when a snapshot was mis-configured as \`materialized='table'\` (possible before dbt 1.4, which silently ran \`create or replace\`). The fix is to drop that table and snapshot again. There is no in-place upgrade that invents the meta columns with correct history.

How often to run \`dbt snapshot\` is a batch-CDC decision. dbt's guidance is between hourly and daily. Faster than hourly usually means you wanted change data capture from the source, not a polling merge. Slower than the source's update cycle means you miss intermediate states: a status that goes pending, then shipped, then delivered between two daily snapshots keeps only the last one.

## Fixtures, closed partitions, and what not to copy

Test data has three jobs, and mixing them up is how production PII lands in a pull request log.

Unit-test fixtures are tiny, synthetic, and checked in. dbt accepts inline \`dict\`, \`csv\`, or \`sql\` rows, and fixture files under a \`fixtures/\` directory on a test path, for example \`tests/fixtures/\`. You only specify the columns the case cares about when the format is \`dict\` or \`csv\`. Ephemeral parents must use \`format: sql\`. The case should name the branch it locks ("boundary timestamp excluded", "refund amount must be negative") so a failure diff is readable. dbt prints a unified diff of actual versus expected. That diff is the review artifact. Do not point a unit test at a production \`ref\` and hope the live rows stay shaped the way the test assumes.

Seed files suit lookup tables you are willing to rebuild: currency codes, a 50-row chart of accounts. They are a poor place for a million-row extract. Seeds are not contract-enforced, and \`dbt seed --full-refresh\` rewrites them.

Integration fixtures belong in a schema that exists only for the run. Generate the data inside the test transaction, as the sqlite example does, or load a synthetic file in \`setUp\` and drop the schema at the end. Reconcile a closed partition of a lower environment when you need volume, and only after the loader has stopped writing that partition. Soda's caveat about quiescent data applies to any paged compare, including a hand-written Python diff that fetches with \`limit\` and \`offset\`.

Do not copy production rows into CI to "make the test realistic". Status codes and amounts can be synthetic and still exercise the branch. If a bug only reproduces on production data, write the failing rows into a store-failures table in the production warehouse (access-controlled) or into a masked sample, and reduce that sample to the columns the test needs. The \`--store-failures\` table is already that sample for dbt. Query it, find the pattern, encode the pattern as a unit-test row, and leave the raw customer string out of git.

Great Expectations Core is the right place when the fixture is a dataframe the pipeline already holds in memory, before it is loaded. The current library line documented as GX Core 1.23.2 supports Python 3.10 through 3.13 and installs with \`pip install great_expectations\`. The 1.x workflow is a Data Context, a Data Source, a Data Asset, a Batch Definition, an Expectation, and \`batch.validate\`. The older 0.x project (\`great_expectations init\`, a \`great_expectations/\` YAML tree, checkpoint YAML files) is a different API. New tests should call the 1.x objects. The snippet below builds the frame in-process so the expectation is checked against known rows, and it asserts the unexpected count, not merely that a result object came back.

\`\`\`python
import great_expectations as gx
import pandas as pd

def test_amount_cents_is_non_negative() -> None:
    frame = pd.DataFrame(
        {
            "order_id": [1, 2, 3],
            "amount_cents": [1000, 0, 450],
        }
    )
    context = gx.get_context()
    data_source = context.data_sources.add_pandas("orders")
    asset = data_source.add_dataframe_asset(name="orders_frame")
    batch_definition = asset.add_batch_definition_whole_dataframe("whole")
    batch = batch_definition.get_batch(batch_parameters={"dataframe": frame})
    expectation = gx.expectations.ExpectColumnValuesToBeBetween(
        column="amount_cents",
        min_value=0,
        severity="critical",
    )
    result = batch.validate(expectation)
    assert result["success"] is True
    assert result["exception_info"]["raised_exception"] is False
    assert result["result"]["element_count"] == len(frame.index)
    assert result["result"]["unexpected_count"] == 0
\`\`\`

A refund model that allows negative cents should not reuse this expectation. Split suites by grain: non-negative for gross capture amounts, a separate expectation that refund rows are less than or equal to zero. GX severity strings in the current API include \`warning\` and \`critical\`. A warning-level expectation can succeed the validation while still recording a business concern. If CI should fail, assert on the critical expectation's \`success\` flag and on \`unexpected_count\`, and do not treat a checkpoint's process exit as the only signal.

## When the count matches and the money does not

A realistic failure: the daily orders job is green, \`dbt_utils.equal_rowcount\` between \`stg_orders\` and \`fct_orders\` passes for \`event_time\` on the closed date, and the finance channel says captured revenue is about double. Nothing in the orchestrator log is red.

Diagnosis, in order:

1. Rerun the singular reconcile query for that date with \`--store-failures\` (or query the existing audit relation). The schema name ends in \`dbt_test__audit\`. Confirm the audit relation exists and has rows before you sort it. If it is empty, you are looking at the wrong test name or a run that did not store failures.
2. Group the audit rows by \`failure_reason\`. In this incident the reasons are not \`missing_in_target\`. They are \`amount_mismatch\`, and \`target_amount_cents\` is exactly twice \`source_amount_cents\` on every mismatched key.
3. Open the compiled model SQL in \`target/compiled/\` (dbt v1) or the test details pane (dbt platform). The incremental model joins payments to orders on \`order_id\` without deduplicating payments, then aggregates with \`sum(payments.amount_cents)\` while the grain of \`fct_orders\` is still one row per order. A retry in the payments extract inserted a second identical payment row. The fact table still has one row per order, so the row count matches staging orders. The sum does not.
4. Check the grain test you thought you had. \`unique\` on \`fct_orders.order_id\` passes, because the duplication was collapsed by the \`group by\`. The missing test is \`unique\` on the payments staging key, plus \`dbt_utils.equality\` (or an \`aggregate_diff\` / \`metric_diff\` on \`sum(amount_cents)\`) between source payments and the fact for that date.
5. Fix the staging model with a dedupe on the payment key (dbt-utils \`deduplicate\` with an explicit \`order_by\` so the winner is deterministic), add the unique test, and backfill the closed date. Do not \`--full-refresh\` the whole fact if only one date is dirty and the model is incremental with a trustworthy \`unique_key\`. Reprocess the lookback window instead.

The row count passed because it was the wrong relation pair. Staging orders and the fact share a grain. Staging payments and the fact do not. Reconciliation has to name both the key and the measure, and it has to name which source the measure comes from. A count against the dimension-shaped side will stay green through an upstream fan-out that the final \`group by\` hides.

The same shape shows up with currency. A join to a daily FX table that is not unique on \`(currency, rate_date)\` multiplies amounts and, after the fact's \`group by order_id\`, leaves the row count untouched. \`accepted_range\` on the rate (for example greater than zero and below a ceiling you choose per currency) plus \`unique_combination_of_columns\` on the FX grain would have failed the build before finance noticed.

## The green pipeline that never checked the grain

What people get wrong is treating a successful task run, or a single \`equal_rowcount\`, as certification. The count is a smoke test. The grain is the test. If you cannot write down "one row per X" for the model, you cannot choose \`unique_key\`, you cannot write \`rows_diff\` key columns, and you cannot interpret a snapshot. The second miss is running the production data tests against a table the loader is still filling. Freshness passes at the start of the hour, the loader appends for twenty more minutes, and the reconcile reads a partial partition. Gate the reconcile on a completeness flag or a closed date, not on "the task before me exited zero".

A third miss is copying a primary-key constraint into a Snowflake or BigQuery contract and deleting the \`unique\` test because "the warehouse will enforce it". On those platforms, it will not. Postgres will. Read the constraint table for the adapter you actually run before you drop a data test.

A fourth miss is snapshotting with \`hard_deletes: ignore\` (the default) and then publishing a "current customers" metric filtered only on \`dbt_valid_to is null\`. Every hard delete in the source remains current forever. Either configure \`invalidate\` or \`new_record\`, or stop calling that filter a census of live customers.

If you want those warehouse checks packaged as an agent skill instead of pasted into a prompt, ready-made QA skills install from qaskills.sh with the qaskills CLI.

## CI order: freshness, then build, then stored failures

Order is the whole design. Freshness first, so you do not transform an extract that never arrived. Then build. Then data tests, with failures stored on the main branch so the next person can query them. Unit tests on the pull request, not on the hourly job.

\`\`\`yaml
name: etl-contracts
on:
  pull_request:
jobs:
  fixture-reconcile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: "3.12"
      - name: Install pytest
        run: python -m pip install --upgrade pip pytest
      - name: Idempotent load and closed-partition checks
        run: python -m pytest tests/test_order_reconcile.py -k "idempotent or closed_partition" --durations=10
\`\`\`

That workflow runs without warehouse credentials because the tests own their sqlite database. Keep it that way. The warehouse job is separate and should assume a profile already configured on the runner. From the dbt project root, a pull request that has parents to satisfy looks like this:

\`\`\`bash
dbt deps
dbt run --select "stg_orders dim_customers" --empty
dbt test --select "test_type:unit"
dbt freshness --select "source:orders"
dbt build --select "fct_orders"
dbt test --select "tag:reconcile" --store-failures
\`\`\`

\`dbt deps\` installs packages pinned in \`packages.yml\`, including \`dbt-labs/dbt_utils\` at 1.4.1. The \`--empty\` run creates parent relations so unit tests can read schemas. \`dbt freshness\` fails the job if \`error_after\` is exceeded, before \`dbt build\` certifies a stale slice. \`dbt build\` on the fact runs the model's unit tests, materializes it, then runs its data tests, in lineage order. Tag the expensive key-aligned reconcile as \`reconcile\` so you can run it on the closed partition without rerunning every \`not_null\`. The hourly production job should not repeat the unit tests. Use \`dbt run\` for the models and \`dbt test --select "test_type:data"\` for the assertions. dbt documents \`--exclude-resource-type\` and, on v1.11 and later, the environment variable \`DBT_ENGINE_EXCLUDE_RESOURCE_TYPES\` when you need \`dbt build\` itself to skip them.

Give the pull request its own target schema, derived from the run id, and drop that schema at the end of the job. Do not reuse one shared \`ci\` schema across concurrent pulls: two merges into the same incremental table will fail each other's \`unique\` tests and teach people to retry. Do not point that schema at the snapshot schema. State-based slim CI (\`--select state:modified+ --defer --state\`, with a production manifest artifact) is worth adopting once the suite is slow, and it is not a substitute for the freshness gate. A modified model downstream of a stale source still needs the source check.

Soda in the same pipeline is a contract verify, not a second copy of every dbt \`not_null\`. Use it where the source and the target are different engines. Install the Go binary with \`brew tap sodadata/tap\` and \`brew install sodacli\` when you want one tool and structured exit codes, or use the Python \`soda\` CLI when you already live in a virtualenv. The Python package is on a private index and needs a Team or Enterprise license unless verification runs on a Soda Runner. Reconciliation checks additionally need the \`soda-reconciliation\` package from that private index, unless the Runner executes them. \`sodacli auth login\` stores credentials under \`~/.soda/credentials\`. In CI pass \`--api-key-id\`, \`--api-key-secret\`, and \`--no-interactive\`. Do not bake the secret into the contract file. \`sc_config.yml\` should reference environment variables.

Exit codes are not interchangeable between the two CLIs. Fail the job on the code that means "a check failed" for the binary you actually invoked, and decide explicitly whether a warning continues the pipeline.

| Exit code | \`sodacli contract verify\` | \`soda contract verify\` |
| --- | --- | --- |
| 0 | All checks passed | All checks passed |
| 1 | One or more checks failed. Fail the job. | One or more checks failed. Fail the job. |
| 2 | Execution error. Retry or alert. | Warnings only, and nothing failed. Do not treat this as a hard failure unless you meant to. |
| 3 | Authentication error. | The verification could not run (parse error, engine error, canceled or timed out scan). |
| 4 | Not used by this binary. | Results could not be sent to Soda Cloud. |

A minimal contract for the closed date, verified with \`soda contract verify -ds ds_config.yml -c contract.yaml --publish\` or with \`sodacli contract verify\`, names the target dataset, one source, and both a count and a sum. Publishing results requires permission to manage the contract on that dataset. \`--publish\` is how a pipeline run shows up next to the scheduled scans. Without it, Soda Cloud never sees the CI failure.

\`\`\`yaml
dataset: warehouse/analytics/fct_orders
filter: "event_time >= current_date - interval '1 day' and event_time < current_date"

reconciliation:
  sources:
    - name: staging
      dataset: warehouse/staging/stg_orders
      filter: "event_time >= current_date - interval '1 day' and event_time < current_date"
  checks:
    - row_count_diff:
        source: staging
        threshold:
          must_be: 0
    - aggregate_diff:
        source: staging
        function: sum
        column: amount_cents
        threshold:
          must_be: 0
    - rows_diff:
        source: staging
        source_key_columns: [order_id]
        target_key_columns: [order_id]
        source_columns: [status, amount_cents]
        target_columns: [status, amount_cents]
        threshold:
          must_be: 0
\`\`\`

The Python API returns a result object. Read \`is_ok\` (no failed checks and no errors), not the log text. \`is_failed\` ignores execution errors, so a scanner that only checks \`is_failed\` can miss a scan that never ran. \`has_errors\` covers that case. Call \`configure_logging()\` inside the loop if you verify more than once per process. The logging setup does not reset itself.

## Where dbt, Great Expectations, Soda, and pytest each stop

Use dbt data tests for assertions that should travel with the model: grain, enums, relationships, and the expression that defines a refund. Use dbt unit tests for SQL branches and for the incremental filter, on pull requests, with \`--empty\` parents. Use a contract on the public mart so a column drop fails the build. Use GX Core when the thing you hold is a batch or a dataframe outside the dbt DAG, or when you want a checkpoint with actions (Slack, email) that are not dbt run results. Use Soda when two systems must be compared, when anomaly monitors on volume and freshness are the production net, or when a data contract is the artifact producers and consumers edit together. Soda Core, the open-source library path, does not include the observability features. Those require a Soda-hosted runner or a self-hosted runner on Kubernetes. Use pytest to orchestrate idempotency, to assert on a transaction you can roll back, and to glue CLI exit codes into a workflow the warehouse tools do not own.

Do not maintain the same \`not_null\` in dbt, GX, and Soda. Pick the tool closest to the producer. A column owned by a dbt model is a dbt data test. A file the loader has not inserted yet is a GX batch or a Soda contract on the raw table. A cross-engine reconcile is Soda \`rows_diff\` or a pytest job that runs the singular SQL against both engines, not a third copy of \`accepted_values\`.

| Need | Put the check here | Leave it out of |
| --- | --- | --- |
| One row per \`order_id\` in a mart | dbt \`unique\` and \`not_null\`, plus a contract \`not_null\` where the adapter enforces it | A GX expectation that rechecks the same column on a schedule with no new logic |
| \`case\` branches and the incremental watermark | dbt unit test with \`overrides.macros.is_incremental\` | The hourly production job |
| Sum of cents between two databases | Soda \`aggregate_diff\` and \`rows_diff\` on a closed filter, or a singular SQL test if both sides are in one warehouse | \`equal_rowcount\` alone |
| Dataframe before load | GX Core 1.x \`ExpectColumnValuesToBeBetween\` (or a tighter expectation) on a batch | A dbt model that does not exist yet |
| Rerun does not double the batch | pytest against a fixture database, one connection, \`BEGIN\` then \`ROLLBACK\` | A manual query someone runs after an incident |

Official references worth keeping open while you implement this: the dbt data test docs at https://docs.getdbt.com/docs/build/data-tests, incremental models at https://docs.getdbt.com/docs/build/incremental-models, snapshots at https://docs.getdbt.com/docs/build/snapshots, unit tests at https://docs.getdbt.com/docs/build/unit-tests, freshness at https://docs.getdbt.com/reference/resource-configs/freshness, model contracts at https://docs.getdbt.com/docs/mesh/govern/model-contracts, dbt-utils 1.4.1 at https://github.com/dbt-labs/dbt-utils, GX Core at https://docs.greatexpectations.io/docs/core/introduction/gx_overview, Soda reconciliation at https://docs.soda.io/data-testing/data-reconciliation, and pytest invocation at https://docs.pytest.org/en/stable/how-to/usage.html.

## Frequently Asked Questions

### Why do matching row counts still fail an ETL test?

Matching counts only say the two filtered relations have the same number of rows. A payments join that fans out, followed by \`group by order_id\` on the fact, preserves that count while doubling \`amount_cents\`. Swapped customer ids, a wrong FX rate, and a status overwritten by an arbitrary \`max\` all pass a count. Add a key-aligned compare (\`dbt_utils.equality\`, a singular full outer join, or Soda \`rows_diff\`) and a sum of each additive measure (\`aggregate_diff\` or \`expression_is_true\` against a known total). Keep the count test as a cheap smoke check. When the count passes and the sum fails, the bug is almost always a grain change upstream of the final aggregation, not a missing file. Confirm the audit table has rows before you rank failure reasons, and name the source the measure actually comes from.

### Should freshness run on the source or on the mart?

Run it on the source first, and fail the job before \`dbt build\`. \`dbt freshness\` reads \`warn_after\` and \`error_after\` against \`loaded_at_field\` or \`loaded_at_query\` (v1.10+, and not both). \`dbt source freshness\` is the legacy command: sources only, and it still writes \`sources.json\`. A mart freshness check answers a different question, which is whether the published table itself moved. On tables and incremental models, dbt can fall back to adapter metadata if you omit \`loaded_at_field\`. Views cannot. They need an explicit field or query. Ephemeral models cannot be checked. A source that is fresh and a mart that is stale means the build did not run or the incremental filter excluded the new rows. A source that is stale means you should not reconcile that partition at all. Use a \`filter\` so the max-timestamp query hits the recent partition only.

### Does a dbt model contract replace unique and relationships tests?

No. A contract checks that the \`select\` still produces the declared column names and data types, and it fails the build when it does not. You must list every column. Constraints are only as strong as the warehouse. Postgres enforces primary keys, unique, foreign keys, and checks. Snowflake, Redshift, and BigQuery enforce \`not_null\` and do not enforce a primary key you declare in YAML. BigQuery will not even define \`unique\` as a contract constraint. Keep \`unique\`, \`not_null\`, and \`relationships\` (or \`dbt_utils.relationships_where\` when you need a predicate) as data tests. They run after the table exists, they can store failing rows in the \`dbt_test__audit\` schema, and they can warn under a threshold with \`error_if\` and \`warn_if\`. Use the contract on public marts. Use tests for values.

### How do you test an incremental model without a full refresh in CI?

Build the parents with \`dbt run --select "config.materialized:incremental" --empty\` so they exist and cost almost nothing. Unit-test both branches: \`overrides.macros.is_incremental\` false for the full scan, and true with a \`this\` input for the watermark. The expected rows are what the \`select\` emits for the merge, not the table after the merge. dbt does not yet unit-test the adapter's insert. Prove idempotency separately by applying the same closed batch twice and asserting that the count, the sum, and an ordered digest stay put, then updating one key and asserting that only that key changes. In production, reprocess a lookback window with \`unique_key\` set, and reserve \`dbt run --full-refresh --select model+\` for logic changes. Remember the \`+\` rebuilds downstream incrementals, and that snapshots ignore \`--full-refresh\` entirely.
`,
};
