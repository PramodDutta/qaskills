import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Composite Uniqueness with a Data Matrix',
  description:
    'Build composite unique constraint test data that varies each key column, covers nulls, races concurrent writes, and verifies rollback with no residue.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Tutorial',
  primaryKeyword: 'composite unique constraint test data',
  keywords: [
    'composite unique constraint test data',
    'PostgreSQL composite uniqueness',
    'multi-column unique constraint',
    'database negative testing',
    'schema driven test data',
    'NULLS NOT DISTINCT testing',
    'concurrent insert tests',
    'Vitest PostgreSQL integration',
  ],
  relatedSlugs: [
    'partial-unique-index-negative-tests-soft-delete',
    'test-database-defaults-generated-columns-triggers',
    'openapi-oneof-discriminator-negative-test-data',
    'schema-derived-date-time-boundary-test-data',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
    'https://www.postgresql.org/docs/current/indexes-unique.html',
    'https://www.postgresql.org/docs/current/transaction-iso.html',
  ],
  content: `
Composite unique constraint test data should vary each constrained column independently, duplicate the complete tuple, and preserve unrelated fields. Add null cases from declared semantics, update collisions, in-batch duplicates, cross-transaction races, and post-error row counts. The matrix then proves combination uniqueness without assuming any component is globally unique.

That approach comes directly from the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer): composite keys require independent column variation, while negative tests must assert rejection and no partial write. Start from migrated DDL, because an ORM label or TypeScript type cannot define the rule PostgreSQL finally enforces.

## Read Uniqueness as a Tuple Rule

Consider inventory reservations identified by warehouse, SKU, and optional batch code. Each warehouse stores many SKUs, one SKU can exist in many warehouses, and several batches can exist for one warehouse-SKU pair. Only the complete three-value tuple must be unique.

\`\`\`sql
CREATE TABLE inventory_reservations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  warehouse_id bigint NOT NULL,
  sku text NOT NULL,
  batch_code text,
  quantity integer NOT NULL CHECK (quantity > 0),
  test_run_id text NOT NULL,
  CONSTRAINT inventory_reservation_key
    UNIQUE NULLS NOT DISTINCT (warehouse_id, sku, batch_code)
);
\`\`\`

PostgreSQL defines a multi-column unique constraint over the combined column values. Individual columns usually remain non-unique, and the complete equal tuple causes rejection ([PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)).

Translate that declaration into one reviewable invariant: at most one reservation may exist for each warehouse, SKU, and batch combination, treating two null batch codes as equal. This sentence records the columns, their order-independent equality role, and explicit null treatment.

Do not shorten the rule to "SKU must be unique." That mistaken interpretation can produce tests that reject legal rows in another warehouse or batch. It can also drive application prechecks that disagree with PostgreSQL and create confusing conflict responses.

Inventory the migration, current DDL, ORM index declaration, repository insert and update statements, and API schema. Record every disagreement as a finding. If the API requires batch code while the database permits null, generated cases need both boundaries rather than a guessed compromise.

Keep the named constraint in the field map. PostgreSQL can create its enforcing unique index automatically, but tests and error translators should identify the declaration they expect. Another unique rule on the same table might reject a candidate first. Naming the target prevents a passing error assertion from covering the wrong key.

Record type, nullability, normalization, and write ownership for every tuple component. Warehouse may be a foreign key, SKU may have a length bound, and batch may allow null. Build a valid baseline satisfying those surrounding constraints before testing uniqueness. Otherwise an earlier validation failure can hide the tuple rule.

The [database testing automation guide](/blog/database-testing-automation-guide) explains how to build a migrated PostgreSQL target. The [test data management guide](/blog/test-data-management-strategies) covers fixture ownership when several suites share that target.

## Turn Every Key Column into a Matrix Axis

Begin with one valid baseline tuple, then produce a collision and one legal variation per key component. Keep quantity and ownership constant because they do not participate in uniqueness.

| Case | Warehouse | SKU | Batch | Expected | Rule proved |
| --- | ---: | --- | --- | --- | --- |
| Baseline | 10 | QA-CHAIR | B-2026-A | Accept | Valid tuple starts state |
| Exact duplicate | 10 | QA-CHAIR | B-2026-A | Reject | All key values equal |
| Different warehouse | 11 | QA-CHAIR | B-2026-A | Accept | Warehouse participates |
| Different SKU | 10 | QA-DESK | B-2026-A | Accept | SKU participates |
| Different batch | 10 | QA-CHAIR | B-2026-B | Accept | Batch participates |
| First null batch | 10 | QA-CHAIR | null | Accept | Nullable tuple is legal |
| Second null batch | 10 | QA-CHAIR | null | Reject | \`NULLS NOT DISTINCT\` treats nulls equally |
| Same key, other quantity | 10 | QA-CHAIR | B-2026-A | Reject | Non-key changes do not avoid collision |

This is the core composite unique constraint test data matrix. Every acceptance row changes exactly one constrained value, proving that no component is accidentally unique alone. The duplicate with another quantity proves unrelated data cannot distinguish an equal key.

Execute legal variations in isolated tests or reset to a known baseline before each row. If all accepted variations accumulate, a later failure can come from an earlier fixture rather than the case being evaluated. Run tags help diagnose state, but they do not replace deliberate preconditions.

Write expected results from DDL before running tests because changing expectations after seeing PostgreSQL output can normalize a migration defect. When the result surprises you, inspect the migrated constraint and source-priority disagreement instead of editing the matrix immediately.

Add dimensions only when the schema declares them. Casing, whitespace, collation, or expression normalization belongs in the matrix only if the index expression, collation, trigger, or application contract defines that behavior. Otherwise those cases impose untraceable policy.

Use one-axis variations before pairwise combinations. If changing warehouse alone succeeds and changing SKU alone succeeds, the tests already prove both columns participate in the tuple. Pairwise variations add value only when a declared expression or normalization couples them. This keeps the matrix compact without sacrificing traceable coverage.

Attach a state assertion to every matrix row. Accepted candidates should produce the expected tuple count, while rejected candidates should preserve baseline values and related side effects. A Boolean accepted flag is useful for generation, but the test still needs a case-specific database observation.

Use [partial unique index negative tests](/blog/partial-unique-index-negative-tests-soft-delete) when only qualifying rows participate. A partial predicate adds another matrix axis beyond the composite tuple.

## Build Deterministic Tuple Variants

Factories should expose the complete key and let tests name each variation. Avoid independent random values because collisions become accidental and failures become difficult to replay.

\`\`\`ts
type NewReservation = {
  warehouseId: number;
  sku: string;
  batchCode: string | null;
  quantity: number;
  testRunId: string;
};

const baselineKey = {
  warehouseId: 10,
  sku: 'QA-CHAIR',
  batchCode: 'B-2026-A',
} as const;

export function buildReservation(
  testRunId: string,
  overrides: Partial<NewReservation> = {},
): NewReservation {
  return {
    ...baselineKey,
    quantity: 4,
    testRunId,
    ...overrides,
  };
}

export const reservationCases = [
  {
    name: 'exact duplicate',
    candidate: {},
    accepted: false,
  },
  {
    name: 'different warehouse',
    candidate: { warehouseId: 11 },
    accepted: true,
  },
  {
    name: 'different SKU',
    candidate: { sku: 'QA-DESK' },
    accepted: true,
  },
  {
    name: 'different batch',
    candidate: { batchCode: 'B-2026-B' },
    accepted: true,
  },
] as const;
\`\`\`

The baseline object makes tuple identity visible in code review. Each case override changes one declared axis and retains all other values. Quantity remains a valid constant until a non-key control case changes it deliberately.

Separate data construction from persistence. A builder returns plain schema-derived input, while a repository helper issues SQL and returns database evidence. Combining those responsibilities can hide retries, normalization, or omitted columns inside fixture setup.

Validate factory defaults against all non-unique constraints. Quantity must remain positive, foreign-key parents must exist when declared, and text must fit database bounds. The factory should fail close to construction when its own baseline drifts, while database negatives should deliberately cross one selected boundary.

Do not reuse one mutable object across parameterized cases. A shallow override or repository normalizer can alter it and contaminate later candidates. Build a fresh baseline and candidate for each case, then log safe tuple fields with the case name. Deterministic reconstruction is clearer than repairing shared fixture state.

Use synthetic reserved identifiers rather than production records because the values above describe test intent and contain no customer data. If another unique field exists outside the shown constraint, derive it from worker and sequence identifiers without random chance.

Composite unique constraint test data should retain the same tuple for every intended collision. Adding a random suffix to SKU because another test failed removes the behavior under examination. Fix ownership isolation instead of weakening the duplicate.

The [synthetic data generation guide](/blog/synthetic-test-data-generation-guide) covers deterministic generation at larger volumes. Keep this focused matrix literal because small, reviewed values make each equality relationship obvious.

## Assert the Exact Duplicate and Persisted State

A strong negative test verifies the expected unique violation, identifies the named constraint when driver metadata supports it, and reads the table afterward. Any generic exception assertion is too broad.

\`\`\`ts
import { randomUUID } from 'node:crypto';
import { afterEach, expect, test } from 'vitest';
import { pool } from './test-database';

const runId = randomUUID();

async function insertReservation(input: NewReservation) {
  return pool.query(
    'INSERT INTO inventory_reservations ' +
      '(warehouse_id, sku, batch_code, quantity, test_run_id) ' +
      'VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [
      input.warehouseId,
      input.sku,
      input.batchCode,
      input.quantity,
      input.testRunId,
    ],
  );
}

afterEach(async () => {
  await pool.query(
    'DELETE FROM inventory_reservations WHERE test_run_id = $1',
    [runId],
  );
  const residue = await pool.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM inventory_reservations ' +
      'WHERE test_run_id = $1',
    [runId],
  );
  expect(residue.rows[0].count).toBe('0');
});

test('rejects only an equal composite tuple', async () => {
  const baseline = buildReservation(runId);
  await insertReservation(baseline);

  await expect(
    insertReservation({ ...baseline, quantity: 9 }),
  ).rejects.toMatchObject({
    code: '23505',
    constraint: 'inventory_reservation_key',
  });

  const stored = await pool.query<{
    quantity: number;
    count: string;
  }>(
    'SELECT MIN(quantity)::integer AS quantity, COUNT(*) AS count ' +
      'FROM inventory_reservations ' +
      'WHERE warehouse_id = $1 AND sku = $2 AND batch_code = $3',
    [10, 'QA-CHAIR', 'B-2026-A'],
  );
  expect(stored.rows[0]).toEqual({ quantity: 4, count: '1' });
});
\`\`\`

SQLSTATE \`23505\` classifies a unique violation. The constraint name shows that this declaration, rather than an unrelated key, rejected the row. Confirm the chosen PostgreSQL driver exposes that metadata before depending upon it in public error translation.

The final query proves the first row kept its original quantity and no duplicate survived. If the production operation also writes an audit record or outbox event, compare those side effects before and after the rejected transaction.

Capture those related counts before attempting the duplicate. A repository might publish work before inserting the constrained row, especially when transaction boundaries are misplaced. After rejection, compare the exact audit, outbox, cache-intent, or child records owned by that operation. Keep external side effects behind test doubles unless the suite owns their cleanup.

When the duplicate runs inside an explicit transaction, verify how the application handles the failed transaction before issuing more statements. The public operation should roll back according to its repository contract. Perform final state queries through a clean connection so an aborted client does not obscure persisted truth.

Do not assert an exact database message string. Messages can include values, quoting, or version-dependent wording, while stable classification and constraint identity better express the contract. At an API boundary, assert the documented domain error instead of exposing raw database details.

Composite unique constraint test data also needs the non-key control shown above. A different quantity still collides because quantity is absent from the unique tuple. Without that case, a repository might accidentally include quantity in a precheck and disagree with PostgreSQL.

The [OpenAPI test-suite generation guide](/blog/openapi-spec-to-test-suite-generation) helps verify conflict responses at HTTP boundaries. Keep this migrated-database test because API validation alone cannot prove storage enforcement.

## Prove Every Independent Variation Is Legal

One duplicate failure does not prove composite behavior. A mistaken single-column constraint can reject the baseline duplicate while also rejecting legitimate warehouse or batch variants.

Run this ordered procedure against a clean precondition:

1. Insert the baseline tuple and confirm its returned identifier.
2. Insert a candidate changing only warehouse, then assert both rows exist.
3. Reset state, insert a candidate changing only SKU, and assert both rows exist.
4. Reset state, insert a candidate changing only batch, and assert both rows exist.
5. Reset state, change only quantity, and assert the equal tuple still fails.

Use parameterized tests for these rows when failure output prints case names and candidate values safely. A loop that reports only an index number slows diagnosis and weakens release evidence. Each case should name the schema axis it proves.

Read the database after every accepted insert. A repository could return success while an asynchronous or transaction-scoped write disappears later. The authoritative count should contain both expected tuples and preserve the baseline row.

Also exercise update transitions. Insert two legal tuples differing by warehouse, then update one warehouse to create a complete collision. Assert rejection and verify both original tuples remain unchanged. Repeat for SKU and batch when production exposes those updates.

Composite unique constraint test data for updates must vary only the changed key component. Updating all three values at once proves a collision but cannot identify mapping errors in one column. Independent updates provide precise changed-line coverage for repository parameters.

When key columns are immutable by business policy, test the public rejection for attempted changes and keep database collision coverage at insertion. Do not invent update endpoints solely for matrix symmetry. Schema capability and product contract are separate sources of expected behavior.

Application prechecks deserve separate cases when they query for existing tuples before writing. Verify that the query compares every constrained column with matching null semantics. Then retain the database negative test because concurrent requests can pass the same precheck before either inserts. Prechecks improve responses but cannot replace enforcement.

If a repository maps columns in a different order from its parameter list, independent variations reveal the defect quickly. The warehouse case may unexpectedly alter SKU, or the batch case may collide with baseline. Read inserted values rather than relying only on success status, and report the mismatched tuple directly.

The sibling guide on [database defaults and generated values](/blog/test-database-defaults-generated-columns-triggers) explains how database-owned fields can change unrelated state during these operations.

## Match Null Cases to the Declared Semantics

PostgreSQL normally treats null values as distinct for uniqueness, allowing multiple otherwise equal rows containing null. The \`NULLS NOT DISTINCT\` clause changes that behavior and makes nulls compare as equal for the unique declaration ([PostgreSQL unique indexes](https://www.postgresql.org/docs/current/indexes-unique.html)).

The example uses \`NULLS NOT DISTINCT\`, so two rows with warehouse 10, SKU QA-CHAIR, and null batch collide. Test the first null tuple as accepted, then the second as rejected. Read the surviving null tuple afterward.

If the actual DDL uses default null semantics, reverse only that expectation: repeated null-containing tuples may be accepted by the unique constraint. Do not copy this example's behavior into a schema lacking the clause. The migration remains the source of truth.

Test null independently in every nullable constrained column when several exist. A null warehouse may be blocked by \`NOT NULL\` before uniqueness executes, while a nullable batch reaches unique comparison. Assert the correct constraint class so a not-null failure cannot masquerade as tuple coverage.

An API may distinguish absent, explicit null, and empty string before SQL. Preserve those inputs through serialization and map each result to API and database declarations. Empty string is a value, not null, unless a declared normalization step changes it.

Several nullable tuple components require a systematic set. Start with all concrete values, then make one nullable component null at a time, followed by declared combinations of nulls. Repeat each candidate according to the configured null mode. This exposes assumptions that only the first nullable column controls comparison.

Keep not-null negatives outside the uniqueness result table. They remain valuable schema tests, but they prove a different constraint and usually return a different SQLSTATE. A release report should list both when nullability and uniqueness change together, without counting one run as evidence for the other.

Composite unique constraint test data should document its null mode beside the matrix. That one line prevents reviewers from importing assumptions from another database or older migration. PostgreSQL notes that null treatment can differ among implementations, so portability needs explicit expectations ([PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)).

Use [schema-derived date-time boundary data](/blog/schema-derived-date-time-boundary-test-data) when a nullable tuple component is a timestamp string at an API boundary. Format validity and database null comparison should remain separate assertions.

## Cover Batch Inserts, Deferred Checks, and Updates

Batch insertion introduces duplicates within one statement. Create two equal tuples in the values list, expect the named uniqueness failure, then assert neither batch row remains. This follows the assigned mapping requirement for in-batch duplicates and post-rejection state.

Also place one equal tuple among several legal candidates. The expected transaction behavior depends on statement and surrounding transaction boundaries, so assert the complete documented outcome. Do not accept a silently partial batch unless the repository contract explicitly implements per-row conflict handling.

If the constraint is declared \`DEFERRABLE\`, identify whether checking occurs immediately or at commit under the operation's transaction settings. A test that expects the insert call itself to fail can miss a deferred violation raised later. Assert at the boundary where the DDL requires enforcement.

Use an explicit transaction in deferred cases and place the expected rejection around the commit. Then issue rollback through the fixture's documented cleanup path and query from another connection. This proves no duplicate became visible after the transaction ended and prevents an open failed transaction from leaking into later cases.

Batch matrices should identify the duplicate pair by tuple, not array position alone. Reorder legal candidates in a second case when production batching can vary order. Expected integrity must not depend on which duplicate appears first, though public error detail may intentionally report one candidate.

For updates, create two legal reservations and change one component to match the other's complete tuple. Verify SQLSTATE, constraint identity, old values, and row count. Then change a non-key field and prove that legal update succeeds.

Do not use \`ON CONFLICT DO NOTHING\` in the foundational negative test. That syntax intentionally suppresses the error path and changes the repository contract. Test it separately only when production uses conflict handling and assert which row remains.

The [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) helps prioritize batch and deferred cases by actual write paths. The small direct matrix still belongs in the required integration suite because it proves the schema contract itself.

## Race Equal Tuples Across Two Connections

Sequential inserts prove declared uniqueness, while concurrent inserts prove the application handles two contenders. Use independently checked-out connections and permit either request to become the legal winner.

\`\`\`ts
import { expect, test } from 'vitest';

test('commits one winner for two concurrent equal tuples', async () => {
  const clientA = await pool.connect();
  const clientB = await pool.connect();
  const input = buildReservation(runId, { sku: 'QA-RACE' });

  try {
    const settled = await Promise.allSettled([
      insertReservationWith(clientA, input),
      insertReservationWith(clientB, input),
    ]);

    expect(
      settled.filter(result => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      settled.filter(result => result.status === 'rejected'),
    ).toHaveLength(1);

    const rows = await pool.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM inventory_reservations ' +
        'WHERE warehouse_id = $1 AND sku = $2 AND batch_code = $3',
      [10, 'QA-RACE', 'B-2026-A'],
    );
    expect(rows.rows[0].count).toBe('1');
  } finally {
    clientA.release();
    clientB.release();
  }
});
\`\`\`

The helper represented by \`insertReservationWith\` should issue the same parameterized insert through its supplied client. Keep connection ownership explicit so a pool does not serialize both operations through one checked-out client.

Do not assert whether A or B wins because scheduling is not the business invariant. Assert one successful write, one classified conflict, and one persisted tuple after both operations settle.

Avoid a preliminary "does this tuple exist" query as synchronization evidence. Both connections can observe absence and still race on insertion. If production performs that query, coordinate both flows after the read and before the write, then verify PostgreSQL remains the final arbiter.

One deterministic race in required CI plus targeted stress execution can serve different purposes without inventing success rates.

PostgreSQL unique indexes enforce combined values, and concurrent operations can interact according to transaction isolation. The official isolation documentation describes visibility, waiting, and retry obligations for supported levels ([PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)). Match the test's transaction mode to production rather than assuming default behavior.

If production uses serializable transactions, accept only outcomes documented by the service contract and classify serialization failures separately from unique violations. Retry the whole transaction when the application policy requires it. Never label every concurrent rejection as proof of this constraint without inspecting its code.

Composite unique constraint test data should remain deterministic during races. Fix the tuple, isolate ownership by run or database, and avoid timing sleeps. A barrier can coordinate application prechecks when the flow contains reads before insertion.

Use [test impact analysis in CI](/blog/test-impact-analysis-ci-guide-2026) to select this race when transaction code, repository insertion, or the unique migration changes.

## Verify Cleanup and Release Evidence

Generated rows need worker-safe ownership that is not part of the business tuple. Tag every row with \`test_run_id\`, delete only that run after each case, and assert the residue count is zero. A global truncate can disrupt concurrent workers.

Cleanup must preserve the original failure while reporting its own errors. If an assertion and teardown both fail, retain both pieces of evidence or attach cleanup as a cause. Silent residue changes later matrix preconditions and creates misleading duplicate failures.

Treat a unique migration as a high-risk data-shape change for the [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian). Map it to user behavior, such as duplicate reservations or rejected legal stock batches, rather than reporting only the SQL filename.

The release report should cite the judged commit, migration version, selected matrix rows, database run, error classification, final counts, and cleanup audit. Missing tests or stale artifacts fail evidence requirements. An empty related-test set for a changed constraint is a coverage gap.

Changed-line percentages alone cannot prove PostgreSQL enforced a full tuple. Pair repository coverage with migrated integration results. Include independent variations because one duplicate test cannot detect an accidental single-column constraint.

Describe blast radius in domain terms. Adding a column to the constraint may permit formerly conflicting rows, while removing one may reject legitimate variants. Changing null mode can alter behavior only for tuples containing null. The matrix supplies direct examples for each risk statement, making review more concrete.

If the migration rewrites existing duplicates before adding the constraint, test that data transition separately from steady-state insertion. Verify deterministic resolution rules, retained row ownership, and rollback guidance from the actual migration. Do not fabricate historical distributions; construct only the minimal conflicting rows declared by the scenario.

The Guardian only recommends a verdict and never merges or deploys. Use the [release readiness scorecard](/blog/ai-release-readiness-scorecard-2026) to structure evidence, then place required suites with the [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions).

## Apply the Matrix in Your Repository

Start by copying the exact constraint columns and null mode from the migration into a small review table. Create one baseline, one complete collision, one variation per key column, and one non-key control. Add update, batch, deferral, and race cases only where declared behavior or real operations require them.

Composite unique constraint test data is strongest when every result is traceable to one DDL clause. Keep fixtures deterministic, run real migrations, assert exact rejection classes, read persisted state, and verify cleanup. This gives reviewers evidence for both forbidden duplicates and legal variation.

Use the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) to generate the matrix from your schemas, then browse the [QA skills directory](/skills) for related database and release workflows.

## Frequently Asked Questions

### Must each column in a composite unique constraint be unique?

No. PostgreSQL rejects rows only when all constrained values compare equal under the declaration's null semantics. Prove this by changing each key component independently and accepting those variants. A test that checks only the complete duplicate cannot detect an accidental single-column restriction.

### How should nullable key columns be tested?

Read whether the declaration uses default null treatment or \`NULLS NOT DISTINCT\`. Insert one null-containing tuple, then repeat it and assert the documented result precisely. Also distinguish a uniqueness outcome clearly from an earlier not-null rejection on another constrained column.

### Why include a non-key field change in the matrix?

A non-key change proves unrelated data cannot make an equal tuple unique. Insert the baseline, repeat every key value, and change only quantity or another ordinary field. The second row must still conflict, while the original row and its non-key values remain unchanged.

### Do sequential duplicate tests cover concurrent requests?

No. Sequential cases prove basic enforcement, but they do not exercise service handling for overlapping writes. Use two connections with one fixed tuple, allow either contender to win, classify the loser, and verify exactly one matching row after both operations finish.

### What belongs in release evidence for a constraint change?

Record the exact migration and commit, null mode, selected matrix rows, PostgreSQL run identifier, intended error classification, final row counts, and cleanup result. Include independent legal variations as well as rejection, because both sides are necessary to validate a composite rule.
`,
};
