import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Composite Unique Constraint Test Data Guide',
  description:
    'Build composite unique constraint test data that varies each key column, covers nulls, races concurrent writes, and verifies rollback with no residue.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Tutorial',
  primaryKeyword: 'composite unique constraint test data',
  keywords: [
    'composite unique constraint test data',
    'PostgreSQL composite uniqueness',
    'multi column unique constraint',
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
Composite unique constraint test data should vary each constrained column one at a time, duplicate the full tuple, and hold non-key fields steady. Add null cases, update clashes, in-batch duplicates, cross-transaction races, and post-error row counts. The matrix then proves the combined-key rule without assuming any one column is globally unique.

That approach comes directly from the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer): composite keys need distinct column case, while negative tests must assert failure and no partial write. Start from migrated DDL, because an ORM label or TypeScript type cannot define the rule PostgreSQL finally enforces.

## How Does PostgreSQL Composite Uniqueness Work?

PostgreSQL composite uniqueness compares the full key tuple, not each column on its own. A warehouse can store many SKUs, and one SKU can appear in many warehouses or batches. Only the complete warehouse, SKU, and batch tuple must be unique.

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

PostgreSQL defines a multi-column unique constraint over the combined column values. Single columns usually stay non-unique, and the full equal tuple causes failure ([PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)).

Map that rule into one reviewable sentence: at most one reservation may exist for each warehouse, SKU, and batch combination. Two null batch codes compare as equal here, so the sentence also records the stated null treatment.

Do not shorten the rule to "SKU must be unique." That mistaken reading can make tests reject legal rows in another warehouse or batch. It can also drive application prechecks that disagree with PostgreSQL and create confusing conflict responses.

List the DDL, current DDL, ORM index rule, data layer writes, and API schema; record each disagreement as a finding. If the API needs batch code while the DB permits null, generated cases need both boundaries rather than a guessed compromise.

Keep the named constraint in the field map. PostgreSQL can create its unique index automatically, but tests and error translators should identify the expected rule. Another unique constraint might reject the case first; naming the target stops a passing error check from covering the wrong key.

Record type, nullability, normalization, and write scope for each tuple part. Warehouse may be a foreign key, SKU may have a length bound, and batch may allow null. Build a valid base row that meets those rules before testing key rule; an earlier validation failure can otherwise hide the tuple rule.

The [DB testing automation guide](/blog/database-testing-automation-guide) explains how to build a migrated PostgreSQL target. The [test data management guide](/blog/test-data-management-strategies) covers fixture scope when many suites share that target.

## How Do You Map a Multi Column Unique Constraint?

Begin with one valid base row tuple, then make a clash and one legal case per key part. Keep quantity and scope constant because they do not take part in key rule.

| Case | Warehouse | SKU | Batch | Expected | Rule proved |
| --- | ---: | --- | --- | --- | --- |
| Base row | 10 | QA-CHAIR | B-2026-A | Accept | Valid tuple starts state |
| Exact duplicate | 10 | QA-CHAIR | B-2026-A | Reject | All key values equal |
| Other warehouse | 11 | QA-CHAIR | B-2026-A | Accept | Warehouse participates |
| Other SKU | 10 | QA-DESK | B-2026-A | Accept | SKU participates |
| Other batch | 10 | QA-CHAIR | B-2026-B | Accept | Batch participates |
| First null batch | 10 | QA-CHAIR | null | Accept | Nullable tuple is legal |
| Second null batch | 10 | QA-CHAIR | null | Reject | \`NULLS NOT DISTINCT\` treats nulls equally |
| Same key, other quantity | 10 | QA-CHAIR | B-2026-A | Reject | Non-key changes do not avoid clash |

This is the core composite unique constraint test data matrix. Each accepted row changes one constrained value, proving that no part is unique alone; the other-quantity case proves non-key data cannot change an equal key.

Run legal cases in isolated tests or reset to a known base row before each row. If accepted variants accumulate, a later failure may come from an earlier fixture; run tags help diagnose state but do not replace deliberate preconditions.

Write expected results from DDL before running tests because later edits can normalize a DDL defect. When PostgreSQL surprises you, inspect the migrated constraint and source disagreement instead of editing the matrix right away.

Add fields only when the schema declares them. Casing, whitespace, collation, or normalization belongs only when an index, trigger, or app contract defines that result; otherwise those cases impose an untraceable policy.

Use one-axis cases before pairwise combinations. If changing warehouse alone succeeds and changing SKU alone succeeds, the tests already prove both columns participate in the tuple. Pairwise cases add value only when a declared expression or normalization couples them. This keeps the matrix compact without sacrificing traceable coverage.

Attach a state check to each matrix row. Accepted cases should make the expected tuple count, while rejected cases keep the base row and side effects; a Boolean flag alone cannot replace the exact DB check.

Use a small review loop before you add more rows, since each step should prove one part of the key. Start with the base row, change one value, and state why the next write should pass or fail. Then run the write, read the stored rows, and inspect the migrated key before you add more cases. This slow first pass keeps bad setup from spreading through a large test data matrix.

Use [partial unique index negative tests](/blog/partial-unique-index-negative-tests-soft-delete) when only matched rows participate. A partial predicate adds another matrix axis beyond the composite tuple.

## How Does Schema Driven Test Data Build Tuple Variants?

Factories should expose the full key and let tests name each case. Avoid random values because clashes become accidental and failures become hard to replay.

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

The base row object makes tuple identity visible in code review. Each case override changes one declared axis and keeps all other values. Quantity stays a valid constant until a non-key control case changes it by design.

Separate data construction from storage. A builder returns plain schema-derived input, while a data-layer helper issues SQL and returns database proof. Combining those responsibilities can hide retries, normalization, or omitted columns inside fixture setup.

Check factory defaults against all non-unique constraints. Quantity must stay positive, foreign-key parents must exist, and text must fit DB bounds. The factory should fail near construction when its base row drifts, while DB negatives should cross one selected boundary by design.

Do not reuse one mutable object across parameterized cases. A shallow override or data layer normalizer can alter it and taint later cases. Build a fresh base row and input for each case, then log safe tuple fields with its name. Fixed reconstruction is clearer than repairing shared fixture state.

Use synthetic reserved IDs rather than production records because the values above describe test intent and contain no customer data. If another unique field exists outside the shown constraint, derive it from worker and sequence IDs without random chance.

Composite unique constraint test data should keep the same tuple for each intended clash. Adding a random SKU suffix removes the rule under test. Fix scope isolation instead of weakening the duplicate.

The [synthetic data generation guide](/blog/synthetic-test-data-generation-guide) covers fixed generation at larger volumes. Keep this focused matrix literal because small, reviewed values make each equality relationship obvious.

## Vitest PostgreSQL Integration for Exact State Checks

A strong negative test checks the expected key conflict, identifies the named constraint when driver metadata supports it, and reads the table afterward. Any generic exception check is too broad.

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

SQLSTATE \`23505\` classifies a key conflict. The constraint name shows that this rule, rather than an unrelated key, rejected the row. Confirm the chosen PostgreSQL driver exposes that metadata before using it in public error translation.

The final query proves the first row kept its original quantity and no duplicate survived. If the live action also writes an audit record or outbox event, compare those side effects before and after the rejected transaction.

Capture those linked counts before attempting the duplicate. A data layer might publish work before inserting the constrained row, especially when transaction boundaries are misplaced. After failure, compare the exact audit, outbox, cache-intent, or child records owned by that action. Keep external side effects behind test doubles unless the suite owns their cleanup.

When the duplicate runs inside a direct transaction, check how the app handles failure before issuing more statements. The public action should roll back under its data layer contract. Query final state through a clean connection so an aborted client does not hide stored truth.

Do not assert an exact DB message string. Messages can include values, quoting, or version-dependent wording, while stable code and constraint identity better express the contract. At an API boundary, assert the stated domain error instead of exposing raw DB details.

Composite unique constraint test data also needs the non-key control shown above. A different quantity still collides because quantity is absent from the unique tuple. Without that case, a data layer might include quantity in a precheck and disagree with PostgreSQL.

The [OpenAPI test-suite generation guide](/blog/openapi-spec-to-test-suite-generation) helps check conflict responses at HTTP boundaries. Keep this migrated-DB test because API validation alone cannot prove storage enforcement.

## Legal Cases the Matrix Must Prove

One same-key failure does not prove composite result. A mistaken single-column constraint can reject the base row duplicate while also rejecting valid warehouse or batch variants.

Run this ordered procedure against a clean precondition:

1. Insert the base row tuple and confirm its returned ID.
2. Insert a case changing only warehouse, then assert both rows exist.
3. Reset state, insert a case changing only SKU, and assert both rows exist.
4. Reset state, insert a case changing only batch, and assert both rows exist.
5. Reset state, change only quantity, and assert the equal tuple still fails.

Use parameterized tests for these rows when failure output prints case names and case values safely. A loop that reports only an index number slows debug and weakens release proof. Each case should name the schema axis it proves.

Read the database after each accepted insert. A data layer could return success while an asynchronous or transaction-scoped write disappears later. The source count should contain both expected tuples and preserve the base row.

Also exercise update changes. Insert two legal tuples differing by warehouse, then update one warehouse to create a full clash. Assert failure and check both first tuples stay unchanged. Repeat for SKU and batch when live exposes those updates.

Composite unique constraint test data for updates must vary only the changed key part. Updating all three values at once proves a clash but cannot identify mapping errors in one column. Separate updates provide precise changed-line coverage for data-layer parameters.

When key columns are immutable by business policy, test the public failure for attempted changes and keep DB clash coverage at insertion. Do not invent update endpoints only for matrix symmetry. Schema capability and product contract are distinct sources of expected result.

Application prechecks deserve separate cases when they query for existing tuples before writing. Check that the query compares each constrained column with matching null rules. Then keep the database negative test because concurrent requests can pass the same precheck before either inserts. Prechecks improve responses but cannot replace enforcement.

If a data layer maps columns in a different order from its parameter list, independent cases reveal the defect quickly. The warehouse case may alter SKU, or the batch case may collide with the base row. Read inserted values instead of trusting success status, and report the mismatched tuple directly.

The sibling guide on [DB defaults and generated values](/blog/test-database-defaults-generated-columns-triggers) explains how DB-owned fields can change unrelated state. Read it when the tuple also contains values set by PostgreSQL.

## NULLS NOT DISTINCT Testing for Nullable Keys

PostgreSQL normally treats null values as distinct for key rule, allowing multiple otherwise equal rows with null. The \`NULLS NOT DISTINCT\` clause changes that result and makes nulls compare as equal for the key rule ([PostgreSQL unique indexes](https://www.postgresql.org/docs/current/indexes-unique.html)).

The example uses \`NULLS NOT DISTINCT\`, so two rows with warehouse 10, SKU QA-CHAIR, and null batch collide. Test the first null tuple as accepted, then the second as rejected. Read the surviving null tuple afterward.

If the actual DDL uses default null rules, reverse only that expectation: repeated null-with tuples may be accepted by the unique constraint. Do not copy this example's result into a schema lacking the clause. The DDL stays the source of truth.

Test null one at a time in each nullable constrained column when many exist. A null warehouse may be blocked by \`NOT NULL\` before key rule runs, while a nullable batch reaches key check. Assert the correct constraint class so a not-null failure cannot masquerade as tuple coverage.

An API may distinguish an absent key, explicit null, and empty string before SQL. Keep those inputs through serialization and map each result to API and database rules. Empty string is a value, not null, unless a declared normalization step changes it.

Many nullable tuple parts need a systematic set. Start with all concrete values, then make one nullable part null at a time, followed by declared combinations of nulls. Repeat each case under the chosen null mode. This exposes assumptions that only the first nullable column controls comparison.

Keep not-null negatives outside the key rule result table. They stay valuable schema tests, but they prove another constraint and usually return another SQLSTATE. A release report should list both when nullability and key rule change together, without counting one run as proof for the other.

Composite unique constraint test data should document its null mode beside the matrix. That one line stops reviewers from importing assumptions from another database or older DDL. PostgreSQL notes that null treatment can differ among implementations, so portability needs clear expectations ([PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)).

Use [schema-derived date-time boundary data](/blog/schema-derived-date-time-boundary-test-data) when a nullable tuple part is a timestamp string at an API boundary. Format validity and DB null comparison should stay distinct checks.

## Database Negative Testing for Batches and Updates

Batch insertion introduces duplicates within one statement. Create two equal tuples in the values list, expect the named key rule failure, then assert neither batch row stays. This follows the assigned mapping requirement for in-batch duplicates and post-failure state.

Also place one equal tuple among many legal cases. The expected transaction result depends on statement and surrounding transaction boundaries, so assert the full stated outcome. Do not accept a silently partial batch unless the data layer contract clearly implements per-row conflict handling.

If the constraint is declared \`DEFERRABLE\`, find whether checking occurs at once or at commit under the action's transaction settings. A test that expects the insert call itself to fail can miss a deferred violation raised later. Assert at the boundary where the DDL needs enforcement.

Use an explicit transaction in deferred cases and place the expected failure around the commit. Then issue rollback through the fixture's stated cleanup path and query from another connection. This proves no duplicate became visible after the transaction ended and stops an open failed transaction from leaking into later cases.

Batch matrices should find the equal pair by tuple, not array position alone. Reorder legal cases in a second case when live batching can vary order. Expected integrity must not depend on which duplicate appears first, though public error detail may on purpose report one case.

For updates, create two legal reservations and change one part to match the other's full tuple. Check SQLSTATE, constraint identity, old values, and row count. Then change a non-key field and prove that legal update succeeds.

Do not use \`ON CONFLICT DO NOTHING\` in the foundational negative test. That syntax on purpose suppresses the error path and changes the data layer contract. Test it separately only when live uses conflict handling and assert which row stays.

The [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) helps prioritize batch and deferred cases by actual write paths. The small direct matrix still belongs in the required integration suite because it proves the schema contract itself.

## Concurrent Insert Tests Across Two Connections

Sequential inserts prove the declared uniqueness rule, while concurrent inserts prove the application handles two writers. Use two independently checked-out connections and permit either request to become the legal winner.

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

The helper shown by \`insertReservationWith\` should issue the same parameterized insert through its supplied client. Keep connection scope clear so a pool does not serialize both actions through one checked-out client.

Do not assert whether A or B wins because scheduling is not the business rule. Assert one successful write, one tagged conflict, and one stored tuple after both actions settle.

Avoid a preliminary "does this tuple exist" query as sync proof. Both connections can observe absence and still race on insertion. If live performs that query, coordinate both flows after the read and before the write, then check PostgreSQL stays the final arbiter.

One fixed race in required CI plus targeted stress run can serve other purposes without inventing success rates. Keep the required run small enough to diagnose when it fails.

PostgreSQL unique indexes enforce combined values, and concurrent actions can interact under transaction isolation. The official documentation describes visibility, waiting, and retry obligations for supported levels ([PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)). Match the test's transaction mode to production rather than assuming default behavior.

If production uses serializable transactions, accept only outcomes stated by the service contract and classify serialization failures separately from key conflicts. Retry the whole transaction when application policy requires it. Never label every concurrent failure as proof of this constraint without inspecting its error code.

Composite unique constraint test data should stay fixed during races. Fix the tuple, isolate scope by run or DB, and avoid timing sleeps. A barrier can coordinate app prechecks when the flow contains reads before insertion.

Use [test impact analysis in CI](/blog/test-impact-analysis-ci-guide-2026) to select this race when transaction code, data layer insertion, or the unique DDL changes. Record the selected reason with the test result.

## Proof and Cleanup for the Constraint Change

Generated rows need worker-safe scope that is not part of the business tuple. Tag each row with \`test_run_id\`, delete only that run after each case, and assert the residue count is zero. A global truncate can disrupt concurrent workers.

Cleanup must keep the first failure while reporting its own errors. If a check and teardown both fail, keep both pieces of proof or attach cleanup as a cause. Silent residue changes later matrix preconditions and creates misleading duplicate failures.

Treat a unique DDL as a high-risk data-shape change for the [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian). Map it to user result, such as duplicate reservations or rejected legal stock batches, rather than reporting only the SQL filename.

The release report should cite the judged commit, DDL version, selected matrix rows, DB run, error code, final counts, and cleanup audit. Missing tests or stale files fail proof requirements. An empty linked-test set for a changed constraint is a coverage gap.

Changed-line percentages alone cannot prove PostgreSQL enforced a full tuple. Pair data layer coverage with migrated integration results. Include distinct cases because one same-key test cannot detect an accidental single-column constraint.

Describe blast radius in domain terms. Adding a column to the constraint may permit formerly conflicting rows, while removing one may reject valid variants. Changing null mode can alter result only for tuples with null. The matrix supplies direct examples for each risk statement, making review more concrete.

If the DDL rewrites existing duplicates before adding the constraint, test that data change separately from steady-state insertion. Check fixed resolution rules, retained row scope, and rollback guidance from the actual DDL. Do not fabricate historical distributions; construct only the minimal conflicting rows declared by the case.

The Guardian only recommends a verdict and never merges or deploys. Use the [release readiness scorecard](/blog/ai-release-readiness-scorecard-2026) to structure proof, then place required suites with the [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions).

## Conclusion: Apply Composite Unique Constraint Test Data

Start by copying the exact constraint columns and null mode from the DDL into a small review table. Create one base row, one full clash, one case per key column, and one non-key control. Add update, batch, deferral, and race cases only where declared result or real actions need them.

Composite unique constraint test data is strongest when each result is traceable to one DDL clause. Keep fixtures fixed, run real DDL changes, assert exact failure classes, read stored state, and check cleanup. This gives reviewers proof for both forbidden duplicates and legal case.

Use the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) to generate the matrix from your schemas, then browse the [QA skills directory](/skills) for linked DB and release workflows. Start with one real constraint and expand only after that matrix passes.

## Frequently Asked Questions

### Must each column in a composite unique constraint be unique?

No. PostgreSQL rejects rows only when all constrained values compare equal under the rule's null rules. Prove this by changing each key part one at a time and accepting those variants. A test that checks only the full duplicate cannot detect an accidental single-column restriction.

### How should nullable key columns be tested?

Read whether the rule uses default null treatment or \`NULLS NOT DISTINCT\`. Insert one tuple containing null, then repeat it and assert the stated result exactly. Also distinguish a uniqueness outcome from an earlier not-null failure on another constrained column.

### Why include a non-key field change in the matrix?

A non-key change proves different data cannot make an equal tuple unique. Insert the base row, repeat each key value, and change only quantity or another ordinary field. The second row must still conflict, while the first row and its non-key values stay unchanged.

### Do sequential same-key tests cover concurrent requests?

No. Sequential cases prove basic enforcement, but they do not exercise service handling for overlapping writes. Use two connections with one fixed tuple, allow either writer to win, classify the loser, and check exactly one matching row after both actions finish.

### What belongs in release proof for a constraint change?

Record the exact DDL and commit, null mode, selected matrix rows, PostgreSQL run ID, intended error code, final row counts, and cleanup result. Include distinct legal cases as well as failure, because both sides are necessary to validate a composite rule.
`,
};
