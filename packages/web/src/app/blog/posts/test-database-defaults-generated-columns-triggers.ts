import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Database Defaults Generated Columns Guide',
  description:
    'Learn to test database defaults generated columns and triggers through omitted fields, explicit values, updates, rollback checks, and schema-led matrices.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Tutorial',
  primaryKeyword: 'test database defaults generated columns',
  keywords: [
    'test database defaults generated columns',
    'PostgreSQL default values',
    'generated column testing',
    'database trigger tests',
    'schema driven test data',
    'Vitest database integration',
    'database rollback assertions',
    'release gate evidence',
  ],
  relatedSlugs: [
    'partial-unique-index-negative-tests-soft-delete',
    'composite-unique-constraint-test-data-matrix',
    'openapi-oneof-discriminator-negative-test-data',
    'schema-derived-date-time-boundary-test-data',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/ddl-default.html',
    'https://www.postgresql.org/docs/current/ddl-generated-columns.html',
    'https://www.postgresql.org/docs/current/trigger-definition.html',
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
  ],
  content: `
To test database defaults generated columns correctly, send writes that omit database-owned fields, then read the stored row from PostgreSQL. Distinguish default-on-insert behavior from generated-on-write calculations and trigger side effects. Add explicit-value, null, update, bulk, and failure cases so application fixtures cannot imitate the database.

The central rule is scope. Tests supply base input, while PostgreSQL supplies values declared by defaults, generated columns, and triggers. The [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) maps that rule directly. Omit defaulted fields, insert only base fields for generated values, and assert derived state from the real schema.

## How Do PostgreSQL Default Values Differ from Other Writes?

PostgreSQL default values run when an insert omits a column or asks for its default. Generated columns derive values from base fields, while triggers react to a stated event. Test each feature on its own so one broad check cannot hide the failed rule.

| Feature | Input that activates it | When value changes | Can caller give a value? | Primary test check |
| --- | --- | --- | --- | --- |
| Column default | Column omitted or \`DEFAULT\` requested | During insert or direct default assignment | Usually yes | Omission receives declared value |
| Generated column | Base fields inserted or updated | Whenever generation applies to the row | No direct value except \`DEFAULT\` | Stored value matches base expression |
| \`BEFORE\` row trigger | Matching data action | Before each affected row is written | Trigger may replace incoming value | Final row contains trigger mutation |
| \`AFTER\` row trigger | Matching data action | At statement end for affected rows | Caller does not write side effect directly | Linked rows or effects exist |
| Statement trigger | Matching statement, even with zero rows in applicable cases | Once per statement | Not a row field | Statement-level effect count |

PostgreSQL evaluates a declared default when a new row omits the column or clearly requests its default. An undeclared default is null, subject to any constraints that may reject null ([PostgreSQL default values](https://www.postgresql.org/docs/current/ddl-default.html)).

A generated column is computed from other columns and cannot be written directly. PostgreSQL distinguishes stored values computed on writes from virtual values computed on reads. Column formulas also follow documented restrictions ([PostgreSQL generated columns](https://www.postgresql.org/docs/current/ddl-generated-columns.html)).

Triggers attach functions to actions such as \`INSERT\`, \`UPDATE\`, or \`DELETE\`, with row-level and statement-level timing choices. Their functions run in the same transaction as the triggering statement. An error therefore rolls back both statement and trigger effects ([PostgreSQL trigger behavior](https://www.postgresql.org/docs/current/trigger-definition.html)).

These distinctions tell you where to place checks. Defaults need omitted-versus-explicit inputs, generated values need base-field changes, and triggers need event, timing, and side-effect checks. The [database testing automation guide](/blog/database-testing-automation-guide) covers the setup needed to run those DDL changes faithfully.

Classify scope before choosing an expected value: a literal default belongs to the DDL, while a time expression needs time checks. A generated amount belongs to its source columns, while an audit entry belongs to an event and row image. Trigger-mutated input belongs to both the caller's request and the final stored row. This scope map stops one large snapshot from hiding which contract failed.

Also record where each result is visible. A stored generated value appears in table reads, a virtual value appears when queried, and a trigger may target another table. Defaults can be hidden by app insertion logic before SQL reaches PostgreSQL. Pair each feature with the lowest boundary that can observe it, then add public checks only for promised behavior.

## How Does Schema Driven Test Data Map the DDL?

Schema driven test data starts with the DDL, not an ORM-created object. Record each default, column formula, trigger event, timing, level, and target table. Then list the constraints that can reject their output.

| Case | Write shape | Expected check | Defect exposed |
| --- | --- | --- | --- |
| Default omitted | Exclude status and quantity | Declared values stored | App accidentally supplies substitutes |
| Direct override | Give allowed status and quantity | Caller values stored | Default always applied in error |
| Direct null | Give null to non-null defaulted column | Reject; default does not replace null | Omission confused with null |
| Generated insert | Supply unit price and quantity only | Subtotal computed | Builder duplicates stale expression |
| Generated direct write | Include subtotal value | Reject direct assignment | Data layer writes DB-owned field |
| Generated update | Change quantity | Subtotal recalculated | Derived value stays stale |
| Trigger insert | Insert base row | Audit or normalized state appears once | Trigger missing or fires twice |
| Trigger update | Update linked row | Timestamp and audit action change | Wrong event or row image used |
| Zero-row update | Predicate matches nothing | Row trigger absent; applicable statement trigger follows definition | Trigger level misunderstood |
| Failing trigger | Cause trigger-side constraint error | Whole transaction unchanged | Side effect escapes rollback |

This matrix follows the assigned schema-to-data mapping exactly. Defaults are tested through omission, and triggers or generated columns receive base fields only. Negative cases assert the intended failure and check no partial write stays.

To test database defaults generated columns without redundant cases, vary one scope decision at a time. For example, keep base price constant when comparing omitted and direct quantity. Then vary quantity while leaving the stored status unchanged for generated-value checks.

The same matrix must include updates because generated expressions and triggers can react after insertion. A suite restricted to creation can pass while edits leave stale subtotals or skip audit records. Include bulk writes only when live data layers expose bulk actions, since their trigger level can change observed counts.

For each negative row, write the expected DB state beside the expected error. A direct generated-column assignment should leave no invoice line, while a failing update should keep the prior subtotal and audit count. Direct null should make no row rather than a row silently filled by the default. These postconditions turn error tests into integrity tests.

Maintain a trace from each matrix row to DDL text. The trace can be a test name with the column and feature, or a nearby case ID used in release reports. When a DDL changes \`quantity\` from a literal default to an expression, reviewers can find exactly which expected checks need revision.

Use the [composite uniqueness data matrix](/blog/composite-unique-constraint-test-data-matrix) when a derived or trigger-written value also participates in a multi-column constraint. Use [partial unique index negative tests](/blog/partial-unique-index-negative-tests-soft-delete) when trigger changes move rows into an indexed predicate.

## What Schema Exposes All Three Results?

This PostgreSQL schema exposes defaults, generated columns, and a trigger in one small table pair. Status and quantity have defaults, while subtotal comes from base fields. An update trigger changes \`updated_at\` and writes an audit row.

\`\`\`sql
CREATE TABLE invoice_lines (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_id bigint NOT NULL,
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'draft',
  subtotal_cents bigint
    GENERATED ALWAYS AS (unit_price_cents::bigint * quantity) STORED,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  test_run_id text NOT NULL
);

CREATE TABLE invoice_line_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_line_id bigint NOT NULL REFERENCES invoice_lines(id) ON DELETE CASCADE,
  action text NOT NULL,
  old_quantity integer NOT NULL,
  new_quantity integer NOT NULL,
  test_run_id text NOT NULL
);

CREATE FUNCTION audit_invoice_line_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  INSERT INTO invoice_line_audit (
    invoice_line_id,
    action,
    old_quantity,
    new_quantity,
    test_run_id
  ) VALUES (
    OLD.id,
    'updated',
    OLD.quantity,
    NEW.quantity,
    NEW.test_run_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER invoice_line_update_audit
BEFORE UPDATE ON invoice_lines
FOR EACH ROW
EXECUTE FUNCTION audit_invoice_line_update();
\`\`\`

Run this DDL through the repository's migration path rather than pasting it only into test setup. Otherwise the test can prove a manually created schema while the production migration differs. Record the DDL version with failures so reviewers know which contract executed.

Keep the test path plain: apply the migration, wait for it to finish, inspect the rule, and then run the behavior check. This path proves that CI and production use the same schema, so a local shortcut cannot hide a missing default, generated column, or trigger. Run one valid insert first, read the row back, and save its plain values as the test control.

The check constraints matter because DB-produced values stay subject to table rules. PostgreSQL raises an error when inserted or derived data violates a constraint, such as values coming from a default ([PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)). Tests should thus observe both generation and constraint interaction.

The trigger uses \`OLD\` and \`NEW\` row images to make update result testable. It writes audit scope from the changed row, allowing cleanup by test run. A live trigger may have other fields, but its tests should keep the same event-to-effect traceability.

Do not add a trigger merely to make a tutorial schema interesting. List only features present in the assigned DDL, then derive cases from them. If an ORM hook performs the apparent side effect instead, label it application behavior and test it at that layer.

Inspect the schema after DDL changes finish. Query PostgreSQL catalogs or use the project's schema command to confirm generation status, defaults, and installed triggers. This check does not replace behavior tests, but it catches setup paths that skipped a DDL. Keep catalog expectations focused on rules the application needs.

Use the same database major version chosen for supported systems. Generated-column features and accepted syntax can differ across versions, so a local shortcut may not match the deployment target. Pin container or service versions in test setup and record them with failures. Do not claim cross-version compatibility from a single run.

## Builders Must Preserve Omitted Fields

JavaScript objects can blur absent, undefined, and null values before SQL runs. A generic insert helper may list every column. It can then send null where the caller intended omission, preventing PostgreSQL from applying its default.

Use intent-specific storage functions for scope-sensitive tests:

\`\`\`ts
import type { Pool, PoolClient } from 'pg';

type Db = Pool | PoolClient;

type BaseLine = {
  invoiceId: number;
  unitPriceCents: number;
  testRunId: string;
};

export async function insertMinimalLine(db: Db, input: BaseLine) {
  return db.query(
    'INSERT INTO invoice_lines ' +
      '(invoice_id, unit_price_cents, test_run_id) ' +
      'VALUES ($1, $2, $3) ' +
      'RETURNING id, quantity, status, subtotal_cents AS "subtotalCents", ' +
      'created_at AS "createdAt", updated_at AS "updatedAt"',
    [input.invoiceId, input.unitPriceCents, input.testRunId],
  );
}

export async function insertExplicitLine(
  db: Db,
  input: BaseLine & { quantity: number | null; status: string | null },
) {
  return db.query(
    'INSERT INTO invoice_lines ' +
      '(invoice_id, unit_price_cents, quantity, status, test_run_id) ' +
      'VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [
      input.invoiceId,
      input.unitPriceCents,
      input.quantity,
      input.status,
      input.testRunId,
    ],
  );
}
\`\`\`

The minimal helper excludes database-owned columns from SQL itself. Passing \`undefined\` in a parameter array is not equivalent evidence. Driver conversion rules can change the value sent, so read the executed statement when diagnosing omission failures.

The direct helper exists for override and negative cases. It includes defaulted fields by design while still excluding the generated subtotal. A distinct direct-write negative test can issue raw SQL with subtotal, making that forbidden action obvious.

Avoid calculating subtotal in a builder. A copied multiplication expression can keep tests green after only the DB formula changes. Builders should create valid base values, and checks should read the DB-derived result.

To test database defaults generated columns at the API boundary, inspect request serialization too. Some clients drop undefined keys while keeping null, and server parsers may inject app defaults. Keep one data layer-level test that reaches SQL without those transformations.

The [OpenAPI schema-to-test-suite guide](/blog/openapi-spec-to-test-suite-generation) helps compare request optionality with database nullability. Any disagreement between the API schema and DDL is a finding, not a reason to guess expected behavior.

Data layer APIs should communicate omission clearly. Distinct method parameters, intent-named input variants, or a query builder with explicit column selection are clearer than overloaded nullish values. Add a focused test around SQL generation when application branching decides which columns appear. PostgreSQL remains the source of truth for the resulting default.

Log statement names and safe parameter classifications during failures, but never dump credentials or sensitive rows. For these synthetic fixtures, stable invoice IDs and run tags are sufficient diagnostics. The goal is to prove which columns were omitted without turning CI output into an uncontrolled data export.

## Vitest Database Integration for Defaults

Defaults need three distinct inputs: omit the field, give a legal value, and give direct null when null is forbidden. Only the first should request the declared default automatically.

\`\`\`ts
import { randomUUID } from 'node:crypto';
import { afterEach, expect, test } from 'vitest';
import { pool } from './test-database';
import { insertExplicitLine, insertMinimalLine } from './invoice-line-repository';

const runId = randomUUID();

afterEach(async () => {
  await pool.query('DELETE FROM invoice_lines WHERE test_run_id = $1', [runId]);
  const residue = await pool.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM invoice_lines WHERE test_run_id = $1',
    [runId],
  );
  expect(residue.rows[0].count).toBe('0');
});

test('applies defaults only when fields are omitted', async () => {
  const inserted = await insertMinimalLine(pool, {
    invoiceId: 41,
    unitPriceCents: 2500,
    testRunId: runId,
  });

  expect(inserted.rows[0]).toMatchObject({
    quantity: 1,
    status: 'draft',
    subtotalCents: '2500',
  });
  expect(inserted.rows[0].createdAt).toBeInstanceOf(Date);
  expect(inserted.rows[0].updatedAt).toBeInstanceOf(Date);
});

test('preserves explicit legal values instead of using defaults', async () => {
  await insertExplicitLine(pool, {
    invoiceId: 42,
    unitPriceCents: 2500,
    quantity: 3,
    status: 'approved',
    testRunId: runId,
  });

  const row = await pool.query(
    'SELECT quantity, status, subtotal_cents AS "subtotalCents" ' +
      'FROM invoice_lines WHERE test_run_id = $1',
    [runId],
  );
  expect(row.rows[0]).toEqual({
    quantity: 3,
    status: 'approved',
    subtotalCents: '7500',
  });
});

test('rejects explicit null instead of replacing it with a default', async () => {
  await expect(
    insertExplicitLine(pool, {
      invoiceId: 43,
      unitPriceCents: 2500,
      quantity: null,
      status: 'draft',
      testRunId: runId,
    }),
  ).rejects.toMatchObject({ code: '23502' });
});
\`\`\`

The first case reads values returned by PostgreSQL instead of rebuilding them from a builder result. The second proves a default is not an unconditional overwrite. The third separates missing data from direct null through the expected not-null violation.

For time defaults, avoid expecting the test runner's current timestamp to equal the DB timestamp exactly. Assert the declared semantic property using DB-observed bounds or a fixed DB clock feature supported by the project. The example checks returned types because its central checks concern scope, not clock precision.

Also test the SQL \`DEFAULT\` keyword if live update or insert paths use it directly. That action asks PostgreSQL for the default while remaining distinct from omission in the statement shape. Do not add it when no app path issues such SQL.

The [schema-based date-time boundary guide](/blog/schema-derived-date-time-boundary-test-data) covers valid and invalid timestamp strings at API boundaries. DB timestamp generation and JSON date-time validation need distinct proof.

## Generated Column Testing on Insert and Update

Generated-column tests should supply only base fields, read the stored result, then change each contributing field one at a time. For subtotal, vary unit price while holding quantity, then vary quantity while holding price.

The insert cases should include zero where the constraint permits it and ordinary positive values. Add the largest values justified by declared integer types and business constraints. Do not invent a commercial maximum absent from the schema. If multiplication can exceed the generated column type, add a failure case derived from those exact types.

Attempt one direct assignment to the generated column and assert PostgreSQL rejects it. This negative case catches data layer serializers that include each object field during insert or update. The allowed \`DEFAULT\` keyword is a distinct result stated by PostgreSQL and should not be confused with supplying a numeric subtotal.

Next, update quantity from one to three and read subtotal from a fresh query. Assert the audit row as a trigger effect separately. A combined expected object is acceptable only when a failure message still finds which property violated which feature.

To test database defaults generated columns after an update, remember that the first insert default does not generally rerun. A change to another column does not reactivate it. The generated subtotal responds to base changes, while status stays at its stored value unless SQL clearly changes or resets it. This contrast deserves a focused check.

PostgreSQL explains that a default is evaluated on insertion when no value is provided, whereas a generated column changes when its row changes and cannot be overridden ([PostgreSQL generated columns](https://www.postgresql.org/docs/current/ddl-generated-columns.html)). Build expectations from that distinction rather than treating both as builder conveniences.

Do not test a database-generated value by calling the same app helper used to calculate a displayed subtotal. Such a check can repeat the same defect on both sides. Use literal base inputs with reviewed expected outcomes, or query distinct database expressions when the matrix is large.

Updates should cover each base column referenced by the column formula. If subtotal uses both unit price and quantity, changing only quantity leaves half the dependency graph untested. Hold the other input constant, update one field, and read a fresh row each time. A final case can update both fields together when live supports that action.

Check returned values and later reads separately when data layer contracts expose both. A correct table with a stale \`RETURNING\` projection can mislead callers even though later queries look right. A well-shaped response also cannot prove storage if app code builds it itself. Comparing both checks catches mapping defects around DB-owned fields.

## Database Trigger Tests for Timing and Row Images

Trigger tests need more than proof that one audit row exists. Assert the event, old values, new values, scope tag, affected row identity, and count. Then perform an action that should not fire the trigger.

Use this ordered procedure:

1. Insert a minimal invoice line and assert no update-audit row exists.
2. Update quantity once, then assert the final line and one matching audit row.
3. Update quantity again, then assert a second audit row with the new old-and-new pair.
4. Run an update whose predicate matches no rows and assert no row-level audit record appears.
5. Cause an audit insertion failure inside a transaction and check the invoice line update also rolls back.

The sequence separates insert from update events and proves \`OLD\` values come from the immediately preceding row state. It also catches a trigger accidentally declared at statement level or attached to the wrong action.

Timing matters when a \`BEFORE\` trigger mutates base columns used by a generated expression. PostgreSQL documents that generated columns conceptually update after \`BEFORE\` triggers, so changes to base columns are reflected in generation ([PostgreSQL generated columns](https://www.postgresql.org/docs/current/ddl-generated-columns.html)). Add that interaction only when the actual trigger changes a contributing field.

For \`AFTER\` triggers, query linked effects after the statement completes. If the system uses deferred constraint triggers, test at the transaction boundary named in the DDL. Do not assume each trigger runs immediately after each row.

The [test data management guide](/blog/test-data-management-strategies) explains run-tag cleanup across linked tables. Trigger-created rows must carry enough provenance to be removed and audited without touching another worker's data.

Assert trigger non-events with the same care as trigger events. An insert should not create an update audit row, and an unrelated table action should not alter invoice history. For column-specific update triggers, change a column outside the declared set and compare expected counts. Derive each non-event from the trigger definition rather than inventing assumptions.

When many triggers share one event, test externally visible ordering only if the schema or product contract guarantees it. Otherwise assert the final rule and each required effect without encoding incidental names or creation order. PostgreSQL timing categories are contractual; arbitrary code details in trigger functions may not be.

## Database Rollback Assertions for Bulk Writes

Row-level triggers run once per affected row, while statement-level triggers run once per statement. PostgreSQL also documents that applicable statement triggers can run when zero rows are affected ([PostgreSQL trigger result](https://www.postgresql.org/docs/current/trigger-definition.html)). Test counts against the actual trigger level declared in DDL changes.

For a three-row bulk update with a row trigger, expect three row-level effects and check each old-and-new pair. For a statement trigger, expect one effect representing the statement under its function contract. Never infer one result from the other.

Failure atomicity needs a deliberate, schema-derived cause. For example, make an audit constraint reject a declared action variant in a test DDL or use an existing trigger condition that raises an error. Then assert the base update, generated subtotal, timestamp, and audit table all stay at pre-action state.

Do not weaken live constraints merely to inject failures. Use a supported trigger branch, a transaction-local fixture, or a dedicated DDL used by the integration test project. Each artificial condition must stay visible in setup so reviewers understand the result under examination.

Cleanup follows dependency order because audit rows reference invoice lines. The example cascade permits parent deletion to remove children, but check that rule if the DDL relies on it. Otherwise delete child rows first, delete owned parents, and finish with residue counts for both tables.

To test database defaults generated columns under parallel CI, isolate schemas or tag each row. Global truncation can erase another worker's precondition and create nondeterministic audit counts. Fixed input does not remove the need for fixed scope.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) can place migrated DB suites after schema setup and before broader end-to-end checks. Keep failure logs free of connection secrets and real row data.

## Release Gate Evidence for DB-Owned Rules

A changed default, column formula, trigger, or constraint is a data-shape surface for the [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian). Map it to user result before evaluating a gate. Invoice totals, status setup, update timestamps, and audit history are clearer risks than a list of changed SQL files.

Select the narrow matrix from the DDL and affected data layers, then run the required full suites. Report each selected case and why it exercises the change. An empty linked-test result for a DDL is a coverage finding, not a successful gate.

Changed-line coverage should include data layer omission logic and error translation, but coverage percentages cannot prove a database expression executed. A gate claiming to test database defaults generated columns needs the migrated integration run and schema version. It also needs row checks and cleanup results alongside code coverage.

When a DB gate fails, save the run ID, SQL error code, schema version, and failed case name. These facts help the team trace the fault without showing row data or DB keys. Keep the first report short enough for a peer to scan in one pass.

Next, compare the write shape with the DDL that ran in the test job. Check which fields were left out, which fields were sent, and which values the DB returned. This step often shows whether the fault sits in test setup, app code, or a DB rule.

Then read the row again through a fresh query and count all linked side effects. A stale application object can hide a correct write, while an application-built response can hide a bad write. Fresh reads give the gate proof from the same store that owns the rule.

Last, run the smallest failed case once more with the same schema and clean scope. If it passes, keep both run records and treat the result as a flaky test finding. If it fails again, assign the fix to the layer that broke its stated contract.

The release report should detect stale files. A test result from another commit cannot support the judged HEAD, especially when DDL files changed afterward. Missing rollback documentation also belongs in the gate results when team policy requires it.

The Guardian recommends \`GO\`, \`GO_WITH_WAIVERS\`, or \`NO_GO\` from proof but never performs release actions. Review the [release readiness scorecard](/blog/ai-release-readiness-scorecard-2026) and [risk-based testing strategy](/blog/risk-based-testing-strategy-guide-2026) for broader code guidance.

## Conclusion: Apply the DB-Owned Workflow

List DDL and compare it with ORM, API, and TypeScript rules. Build one matrix per feature, keep omission in data layer calls, run migrated PostgreSQL, and assert stored state after both success and failure. Add bulk and concurrency shapes only where real write paths justify them.

Teams that test database defaults generated columns with this flow keep each owner visible. Defaults, generated values, and trigger effects stay easy to diagnose even when one action activates all three. That structure shortens failure analysis and stops an application fixture from standing in for a database run.

To test database defaults generated columns with reusable schema-led instructions, install the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer). Then browse [all QA skills](/skills) to pair DB proof with the release checks used by your data layer.

## Frequently Asked Questions

### Is omitting a column the same as inserting null?

No. Omission lets PostgreSQL use the declared default, while direct null supplies a value that stays null unless rejected by a constraint. Write distinct tests for both inputs. A generic object serializer can erase this distinction, so inspect the actual SQL column list during debug.

### Should a builder calculate generated column values?

No. The builder should supply only base fields declared by the schema. Read the generated value back from PostgreSQL and compare it with a reviewed expectation. Copying the database expression into fixture code can repeat the same mistake and hide DDL drift.

### How do I test a current-time default without flaky equality?

Use DB-observed bounds, a supported fixed-clock design, or semantic checks appropriate to the contract. Do not require exact equality with the test runner's clock. Also separate RFC 3339 request validation from PostgreSQL timestamp generation because they exercise very different boundaries.

### What should a trigger rollback test assert?

Capture the base row and each trigger-owned side-effect table before the action. Cause a declared trigger-path failure, then compare all linked state afterward. The triggering statement and trigger run in one transaction, so neither base changes nor side effects should stay.

### When should bulk trigger cases be included?

Include them when live code issues multi-row statements or the trigger is statement-level. Assert counts under the declared trigger level and inspect each linked row image. A single-row suite cannot prove how one statement affecting many rows records all its effects. These cases help teams test database defaults generated columns in production-like write paths.
`,
};
