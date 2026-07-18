import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Database Defaults and Generated Values',
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
To test database defaults generated columns correctly, send writes that omit database-owned fields, then read the stored row from PostgreSQL. Separate default-on-insert behavior from generated-on-write calculations and trigger side effects. Add explicit-value, null, update, bulk, and failure cases so application fixtures cannot imitate the database.

The central rule is ownership. Tests supply base input, while PostgreSQL supplies values declared by defaults, generation expressions, and triggers. The [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) maps that rule directly: omit defaulted fields, insert only base fields for generated values, and assert derived state from the real schema.

## Separate the Three Database-Owned Behaviors

When teams test database defaults generated columns alongside triggers, similar-looking rows can hide different execution rules. Combining them in one broad assertion makes a failure difficult to classify and encourages factories to duplicate database logic.

| Mechanism | Input that activates it | When value changes | Can caller provide a value? | Primary test observation |
| --- | --- | --- | --- | --- |
| Column default | Column omitted or \`DEFAULT\` requested | During insert or explicit default assignment | Usually yes | Omission receives declared value |
| Generated column | Base fields inserted or updated | Whenever generation applies to the row | No direct value except \`DEFAULT\` | Stored value matches base expression |
| \`BEFORE\` row trigger | Matching data operation | Before each affected row is written | Trigger may replace incoming value | Final row contains trigger mutation |
| \`AFTER\` row trigger | Matching data operation | At statement end for affected rows | Caller does not write side effect directly | Related rows or effects exist |
| Statement trigger | Matching statement, even with zero rows in applicable cases | Once per statement | Not a row field | Statement-level effect count |

PostgreSQL evaluates a declared default when a new row omits the column or explicitly requests its default. An undeclared default is null, subject to any constraints that may reject null ([PostgreSQL default values](https://www.postgresql.org/docs/current/ddl-default.html)).

A generated column is computed from other columns and cannot be written directly. PostgreSQL distinguishes stored values computed on writes from virtual values computed on reads, and generation expressions follow documented restrictions ([PostgreSQL generated columns](https://www.postgresql.org/docs/current/ddl-generated-columns.html)).

Triggers attach functions to operations such as \`INSERT\`, \`UPDATE\`, or \`DELETE\`, with row-level and statement-level timing choices. Their functions execute in the same transaction as the triggering statement, so an error rolls back both statement and trigger effects ([PostgreSQL trigger behavior](https://www.postgresql.org/docs/current/trigger-definition.html)).

These distinctions tell you where to place assertions. Defaults need omitted-versus-explicit inputs, generated values need base-field transitions, and triggers need event, timing, and side-effect checks. The [database testing automation guide](/blog/database-testing-automation-guide) covers the environment needed to execute those migrations faithfully.

Classify ownership before choosing an expected value. A literal default belongs to migration review, while a time expression requires temporal assertions. A generated amount belongs to its contributing columns, while an audit entry belongs to an event and row image. Trigger-mutated input belongs to both the caller's request and the final stored row. This ownership map prevents one oversized snapshot from hiding which contract failed.

Also record where each behavior is visible. A stored generated value appears in table reads, a virtual value appears when queried, and a trigger may target another table. Defaults can be hidden by application insertion logic before SQL reaches PostgreSQL. Pair each mechanism with the lowest boundary capable of observing it directly, then add public-boundary checks only for promised behavior.

## Derive a Case Matrix from the DDL

Begin with the migration, not an ORM-created object. Record every default expression, generation expression, trigger event, timing, level, and target table. Then list the constraints capable of rejecting their output.

| Case | Write shape | Expected observation | Defect exposed |
| --- | --- | --- | --- |
| Default omitted | Exclude status and quantity | Declared values stored | Application accidentally supplies substitutes |
| Explicit override | Provide allowed status and quantity | Caller values stored | Default always applied incorrectly |
| Explicit null | Provide null to non-null defaulted column | Reject; default does not replace null | Omission confused with null |
| Generated insert | Supply unit price and quantity only | Subtotal computed | Factory duplicates stale expression |
| Generated direct write | Include subtotal value | Reject direct assignment | Repository writes database-owned field |
| Generated update | Change quantity | Subtotal recalculated | Derived value remains stale |
| Trigger insert | Insert base row | Audit or normalized state appears once | Trigger missing or fires twice |
| Trigger update | Update relevant row | Timestamp and audit action change | Wrong event or row image used |
| Zero-row update | Predicate matches nothing | Row trigger absent; applicable statement trigger follows definition | Trigger level misunderstood |
| Failing trigger | Cause trigger-side constraint error | Whole transaction unchanged | Side effect escapes rollback |

This matrix follows the assigned schema-to-data mapping exactly. Defaults are tested through omission, and triggers or generated columns receive base fields only. Negative cases assert the intended rejection and verify no partial write remains.

To test database defaults generated columns without redundant cases, vary one ownership decision at a time. For example, keep base price constant when comparing omitted and explicit quantity. Then vary quantity while leaving status behavior unchanged for generated-value assertions.

The same matrix must include updates because generated expressions and triggers can react after insertion. A suite restricted to creation can pass while edits leave stale subtotals or skip audit records. Include bulk writes only when production repositories expose bulk operations, since their trigger level can change observed counts.

For every negative row, write the expected database state beside the expected error. A direct generated-column assignment should leave no invoice line, while a failing update should preserve the previous subtotal and audit count. Explicit null should produce no row rather than a row silently filled by the default. These postconditions convert error tests into integrity tests.

Maintain a trace from each matrix row to DDL text. The trace can be a test name containing the column and mechanism, or a nearby case identifier used in release reports. When a migration changes \`quantity\` from a literal default to an expression, reviewers can identify exactly which expected observations require revision.

Use the [composite uniqueness data matrix](/blog/composite-unique-constraint-test-data-matrix) when a derived or trigger-written value also participates in a multi-column constraint. Use [partial unique index negative tests](/blog/partial-unique-index-negative-tests-soft-delete) when trigger changes move rows into an indexed predicate.

## Create a Migrated Schema with Observable Effects

The following PostgreSQL schema keeps each mechanism visible. Status and quantity have defaults, subtotal is generated from base fields, and one update trigger changes \`updated_at\` while writing an audit row.

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

Run this DDL through the repository migration path rather than pasting it only into test setup. Otherwise the test can prove a hand-built schema while the releasable migration differs. Record the migration version with failures so reviewers know which contract executed.

The check constraints matter because database-produced values remain subject to table rules. PostgreSQL raises an error when inserted or derived data violates a constraint, including values coming from a default ([PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)). Tests should therefore observe both generation and constraint interaction.

The trigger uses \`OLD\` and \`NEW\` row images to make update behavior testable. It writes audit ownership from the changed row, allowing cleanup by test run. A production trigger may have different fields, but its tests should preserve the same event-to-effect traceability.

Do not add a trigger merely to make a tutorial schema interesting. Inventory only mechanisms present in the assigned migration, then derive cases from them. If an ORM hook performs the apparent side effect instead, label it application behavior and test it at that layer.

Inspect the schema after migrations complete. Query PostgreSQL catalogs or use the project's schema inspection command to confirm column generation status, default expressions, and installed triggers. This check does not replace behavioral tests, but it catches setup paths that silently skipped a migration. Keep catalog expectations focused on declarations the application depends upon.

Use the same database major version configured for supported environments. Generated-column capabilities and accepted syntax can differ across versions, so a local shortcut may not represent the deployment target. Pin container or service versions in test infrastructure and record them with failures. Do not claim cross-version behavior from a single run.

## Preserve Omission in Factories and Repositories

JavaScript objects can blur absent, undefined, and null values before SQL executes. A generic insert helper that lists every column may send null where the caller intended omission, preventing PostgreSQL from applying its default.

Use intent-specific persistence functions for ownership-sensitive tests:

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

The minimal helper excludes database-owned columns from SQL itself. Passing \`undefined\` in a parameter array is not equivalent evidence because driver conversion rules can change the value sent. Read the executed statement when diagnosing omission failures.

The explicit helper exists for override and negative cases. It includes defaulted fields deliberately while still excluding the generated subtotal. A separate direct-write negative test can issue raw SQL containing subtotal, making that forbidden action obvious.

Avoid calculating subtotal in a factory. A copied multiplication expression will keep tests green after the database formula changes in only one place. Factories should create valid base values, and assertions should read the authoritative derived result.

To test database defaults generated columns at the API boundary, inspect request serialization too. Some clients drop undefined keys while preserving null, and server parsers may inject application defaults. Keep one repository-level test that reaches SQL without those transformations.

The [OpenAPI schema-to-test-suite guide](/blog/openapi-spec-to-test-suite-generation) helps compare request optionality with database nullability. Any disagreement between API schema and DDL is a finding rather than a reason to guess fixture behavior.

Repository APIs should communicate omission explicitly. Separate method parameters, intent-named input variants, or a query builder with verified column selection are clearer than overloaded nullish values. Add a focused test around SQL generation when application branching decides which columns appear. The PostgreSQL integration still remains authoritative for the resulting default.

Log statement names and safe parameter classifications during failures, but never dump credentials or sensitive rows. For these synthetic fixtures, stable invoice identifiers and run tags are sufficient diagnostics. The goal is to prove which columns were omitted without turning CI output into an uncontrolled data export.

## Test Defaults Through Omission, Override, and Null

Defaults require three distinct inputs: omit the field, provide a legal value, and provide explicit null when null is forbidden. Only the first should request the declared default automatically.

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

The first case reads values returned by PostgreSQL instead of reconstructing expectations from a factory result. The second proves a default is not an unconditional overwrite. The third distinguishes missing data from explicit null through the expected not-null violation.

For time defaults, avoid expecting the test runner's current timestamp to equal the database timestamp exactly. Assert the declared semantic property using database-observed bounds or a fixed database clock mechanism supported by the project. The example checks returned types because its central assertions concern ownership, not clock precision.

Also test the SQL \`DEFAULT\` keyword if production update or insert paths use it explicitly. That operation asks PostgreSQL for the default while remaining different from omission at the statement shape. Do not add it when no application path issues such SQL.

The [schema-based date-time boundary guide](/blog/schema-derived-date-time-boundary-test-data) covers valid and invalid timestamp strings at API boundaries. Database timestamp generation and JSON date-time validation require separate evidence.

## Test Generated Values on Insert and Update

Generated-column tests should supply only base fields, read the stored result, then change each contributing field independently. For subtotal, vary unit price while holding quantity, then vary quantity while holding price.

The insert cases should include zero where the check permits it, ordinary positive values, and the largest values justified by declared integer types and business constraints. Do not invent a commercial maximum absent from the schema. If multiplication can exceed the generated column type, add a rejection case derived from those exact types.

Attempt one direct assignment to the generated column and assert PostgreSQL rejects it. This negative case catches repository serializers that include every object field during insert or update. The allowed \`DEFAULT\` keyword is a separate behavior documented by PostgreSQL and should not be confused with supplying a numeric subtotal.

Next, update quantity from one to three and read subtotal from a fresh query. Assert the audit row as a trigger effect separately. A combined expected object is acceptable only when a failure message still identifies which property violated which mechanism.

To test database defaults generated columns after an update, remember that the original insert default does not generally rerun simply because another column changes. The generated subtotal responds to base changes, while status remains its stored value unless SQL explicitly changes or resets it. This contrast deserves a focused assertion.

PostgreSQL explains that a default is evaluated on insertion when no value is provided, whereas a generated column changes when its row changes and cannot be overridden ([PostgreSQL generated columns](https://www.postgresql.org/docs/current/ddl-generated-columns.html)). Build expectations from that distinction rather than treating both as factory conveniences.

Do not test a generated value by calling the same application helper used to calculate a displayed subtotal. Such an assertion can repeat the same defect on both sides. Use literal base inputs with manually reviewed expected outcomes, or query independent database expressions when the matrix is large.

Updates should cover every base column referenced by the generation expression. If subtotal uses both unit price and quantity, changing only quantity leaves half the dependency graph untested. Hold the other input constant, update one field, and read a fresh row each time. A final case can update both fields together when production supports that operation.

Check returned values and subsequent reads separately when repository contracts expose both. A correct table with a stale \`RETURNING\` projection can mislead callers even though later queries look right. Conversely, a correctly shaped response cannot prove persistence if application code constructs it independently. Comparing both observations catches mapping defects around database-owned fields.

## Test Trigger Events, Timing, and Row Images

Trigger tests need more than proof that one audit row exists. Assert the event, old values, new values, ownership tag, affected row identity, and count. Then perform an operation that should not fire the trigger.

Use this ordered procedure:

1. Insert a minimal invoice line and assert no update-audit row exists.
2. Update quantity once, then assert the final line and one matching audit row.
3. Update quantity again, then assert a second audit row with the new old-and-new pair.
4. Run an update whose predicate matches no rows and assert no row-level audit record appears.
5. Cause an audit insertion failure inside a transaction and verify the invoice line update also rolls back.

The sequence distinguishes insert from update events and proves \`OLD\` values come from the immediately preceding row state. It also catches a trigger accidentally declared at statement level or attached to the wrong operation.

Timing matters when a \`BEFORE\` trigger mutates base columns used by a generated expression. PostgreSQL documents that generated columns conceptually update after \`BEFORE\` triggers, so changes to base columns are reflected in generation ([PostgreSQL generated columns](https://www.postgresql.org/docs/current/ddl-generated-columns.html)). Add that interaction only when the actual trigger changes a contributing field.

For \`AFTER\` triggers, query related effects after the statement completes. If the system uses deferred constraint triggers, test at the transaction boundary named in the migration. Do not assume every trigger executes immediately after each row.

The [test data management guide](/blog/test-data-management-strategies) explains run-tag cleanup across related tables. Trigger-created rows must carry enough provenance to be removed and audited without touching another worker's data.

Assert trigger non-events with the same care as trigger events. An insert should not create an update audit row, and an unrelated table operation should not alter invoice history. For column-specific update triggers, change a column outside the declared set and compare expected counts. Derive every non-event from trigger definition rather than inventing assumptions.

When several triggers share one event, test externally visible ordering only if the schema or product contract guarantees it. Otherwise assert the final invariant and each required effect without encoding incidental names or creation order. PostgreSQL timing categories are contractual; arbitrary implementation details in trigger functions may not be.

## Cover Bulk Writes, Failure Atomicity, and Cleanup

Row-level triggers execute once per affected row, while statement-level triggers execute once per statement. PostgreSQL also documents that applicable statement triggers can execute when zero rows are affected ([PostgreSQL trigger behavior](https://www.postgresql.org/docs/current/trigger-definition.html)). Test counts against the actual trigger level declared in migrations.

For a three-row bulk update with a row trigger, expect three row-specific effects and verify each old-and-new pair. For a statement trigger, expect one effect representing the statement according to its function contract. Never infer one behavior from the other.

Failure atomicity needs a deliberate, schema-derived cause. For example, make an audit constraint reject a declared action variant in a test migration or use an existing trigger condition that raises an error. Then assert the base update, generated subtotal, timestamp, and audit table all remain at pre-operation state.

Do not weaken production constraints merely to inject failures. Use a supported trigger branch, a transaction-local fixture, or a dedicated migration used by the integration test project. Every artificial condition must remain visible in setup so reviewers understand the behavior under examination.

Cleanup follows dependency order because audit rows reference invoice lines. The example cascade permits parent deletion to remove children, but verify that cascade if the migration relies on it. Otherwise delete child rows first, delete owned parents, and finish with residue counts for both tables.

To test database defaults generated columns under parallel CI, isolate schemas or tag every row. Global truncation can erase another worker's precondition and create nondeterministic audit counts. Deterministic input does not remove the need for deterministic ownership.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) can place migrated database suites after schema setup and before broader end-to-end checks. Keep failure logs free of connection secrets and real row data.

## Report Database-Owned Behavior as Release Evidence

A changed default, generation expression, trigger, or constraint is a data-shape surface for the [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian). Map it to user behavior before evaluating a gate. Invoice totals, status initialization, update timestamps, and audit history are clearer risks than a list of changed SQL files.

Select the narrow matrix from the migration and affected repositories, then run the required full suites. Report each selected case and why it exercises the change. An empty related-test result for a migration is a coverage finding, not a successful gate.

Changed-line coverage should include repository omission logic and error translation, but coverage percentages cannot prove a database expression executed. A gate claiming to test database defaults generated columns needs the migrated integration run, schema version, row assertions, and cleanup result alongside code coverage.

The release report should identify stale artifacts. A test result from a different commit cannot support the judged head, especially when migration files changed afterward. Missing rollback documentation also belongs in the gate results when team policy requires it.

The Guardian recommends \`GO\`, \`GO_WITH_WAIVERS\`, or \`NO_GO\` from evidence but never performs release actions. Review the [release readiness scorecard](/blog/ai-release-readiness-scorecard-2026) and [risk-based testing strategy](/blog/risk-based-testing-strategy-guide-2026) for broader classification guidance.

## Apply the Schema-First Workflow

Inventory DDL and compare it with ORM, API, and TypeScript declarations. Build one matrix per mechanism, preserve omission in repository calls, run migrated PostgreSQL, and assert stored state after both success and failure. Add bulk and concurrency shapes only where real write paths justify them.

Keep defaults, generated values, and trigger effects independently diagnosable even when one operation activates all three. That structure shortens failure analysis and prevents a passing application factory from standing in for database execution.

To test database defaults generated columns with reusable schema-led instructions, install the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer). Then browse [all QA skills](/skills) to pair database evidence with the release checks used by your repository.

## Frequently Asked Questions

### Is omitting a column the same as inserting null?

No. Omission lets PostgreSQL use the declared default, while explicit null supplies a value that remains null unless rejected by a constraint. Write separate tests for both inputs. A generic object serializer can erase this distinction, so inspect the actual SQL column list during diagnosis.

### Should a factory calculate generated column values?

No. The factory should supply only base fields declared by the schema. Read the generated value back from PostgreSQL and compare it with a reviewed expectation. Copying the database expression into fixture code can repeat the same mistake and hide migration drift.

### How do I test a current-time default without flaky equality?

Use database-observed bounds, a supported fixed-clock design, or semantic assertions appropriate to the contract. Do not require exact equality with the test runner's clock. Also separate RFC 3339 request validation from PostgreSQL timestamp generation because they exercise entirely different boundaries.

### What should a trigger rollback test assert?

Capture the base row and every trigger-owned side-effect table before the operation. Cause a declared trigger-path failure, then compare all relevant state afterward. The triggering statement and trigger execute in one transaction, so neither base changes nor side effects should remain.

### When should bulk trigger cases be included?

Include them when production issues multi-row statements or the trigger is statement-level. Assert counts according to the declared trigger level and inspect every relevant row image. A single-row suite cannot prove how one statement affecting several rows records its effects.
`,
};
