import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Partial Unique Indexes and Soft Deletes',
  description:
    'Use partial unique index negative tests to verify soft-delete predicates, duplicate rejection, restore conflicts, concurrency, and clean rollback behavior.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Tutorial',
  primaryKeyword: 'partial unique index negative tests',
  keywords: [
    'partial unique index negative tests',
    'PostgreSQL partial unique index',
    'soft delete testing',
    'database constraint testing',
    'duplicate data tests',
    'schema driven test data',
    'Vitest PostgreSQL integration tests',
    'release gate evidence',
  ],
  relatedSlugs: [
    'test-database-defaults-generated-columns-triggers',
    'composite-unique-constraint-test-data-matrix',
    'openapi-oneof-discriminator-negative-test-data',
    'schema-derived-date-time-boundary-test-data',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/indexes-partial.html',
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
  ],
  content: `
Partial unique index negative tests must prove both sides of the index predicate, not only duplicate rejection. Create one active row, repeat its indexed key, verify rejection, then move one row outside the predicate and verify acceptance. Also test updates crossing the predicate and concurrent inserts.

Soft deletion changes uniqueness from a table-wide rule into a conditional invariant. A test suite that checks only two active inserts misses restore conflicts, predicate transitions, and races. The [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) supplies the schema-first method: derive every case from declared DDL rather than guessing useful examples.

## Read the Partial Index as a Conditional Invariant

Suppose accounts retain deleted rows for audit history while active usernames remain unique within each tenant. The database expresses that rule with an index over selected columns and a predicate over deletion state.



\`\`\`sql
CREATE TABLE accounts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id bigint NOT NULL,
  username text NOT NULL,
  deleted_at timestamptz,
  test_run_id text NOT NULL
);

CREATE UNIQUE INDEX accounts_active_username_key
  ON accounts (tenant_id, username)
  WHERE deleted_at IS NULL;
\`\`\`

PostgreSQL defines a partial index as an index over rows satisfying its predicate. A unique partial index therefore enforces uniqueness only among those qualifying rows, while rows outside the predicate remain unconstrained by that index ([PostgreSQL partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html)).

Translate the DDL into one precise sentence: for any tenant and username, at most one row may have a null deletion timestamp. That sentence identifies the key columns, predicate, allowed duplicates, and transitions needing tests. It also prevents an application rule such as global username uniqueness from silently replacing the actual database contract.

Inventory every declaration before choosing data. Read the migration that creates the index, the current table definition, ORM metadata, repository write paths, and API request schema. Record each layer beside the DDL, including whether it understands soft deletion. This comparison often reveals an application precheck that ignores tenants or treats every historical row as reserved. Such a finding belongs in the test plan because the database and application can reject different requests.

Name the invariant by business operation as well as storage structure. Creation, username changes, tenant transfers, deletion, and restoration can all alter an indexed key or its predicate membership. Listing those operations prevents an insert-heavy suite from overlooking update paths. It also helps reviewers connect a changed handler to the exact database cases that should run.

The source-priority rule from the assigned skill matters here. SQL DDL outranks ORM annotations, API schemas, and TypeScript types because PostgreSQL performs the final write check. If the ORM declares username globally unique while the migration defines conditional tenant uniqueness, report the disagreement before generating fixtures.

Read [test data management strategies](/blog/test-data-management-strategies) for broader ownership and cleanup patterns. Use the [database testing automation guide](/blog/database-testing-automation-guide) when the suite still relies on mocked repositories instead of migrated PostgreSQL.

## Derive the Negative Matrix from the Predicate

The schema-to-data mapping requires duplicate tests both within a batch and across transactions. For a partial unique index, it also requires a duplicate outside the predicate. Expand that compact rule into a matrix before writing test code.

| Case | Existing row | Attempted row or change | Expected result | Invariant proved |
| --- | --- | --- | --- | --- |
| Active duplicate | tenant 7, sam, null | tenant 7, sam, null | Reject | Qualifying keys collide |
| Deleted duplicate | tenant 7, sam, timestamp | tenant 7, sam, timestamp | Accept | Exempt rows may repeat |
| Active beside deleted | tenant 7, sam, timestamp | tenant 7, sam, null | Accept | Exempt row does not reserve key |
| Other tenant | tenant 7, sam, null | tenant 8, sam, null | Accept | Full composite key matters |
| Soft delete transition | tenant 7, sam, null | update timestamp | Accept | Leaving predicate frees key |
| Restore conflict | active and deleted sam | set deleted timestamp to null | Reject | Entering predicate is checked |
| Rename collision | tenant 7, jo, null | update username to sam | Reject | Indexed-column updates are checked |
| Concurrent duplicate | no matching row | two active sam inserts | One accepts, one rejects | Race cannot create two active rows |

This table is the center of the partial unique index negative tests. It varies one meaningful dimension at a time, which makes a failed assertion traceable to predicate membership, composite keys, or transaction behavior. Adding random rows would obscure those distinctions without extending coverage.

Treat each row as a pair of precondition and operation, followed by two observations. The first observation is whether PostgreSQL accepts or rejects the statement. The second is the complete persisted state after that outcome. This structure catches cases where an error is translated correctly but a related write escapes its transaction. It also distinguishes a legal exempt duplicate from an active collision that happened to receive an unrelated failure.

Add a matrix row only when a declared schema dimension or write transition justifies it. Case differences such as uppercase usernames belong here only when the index expression or database collation defines relevant behavior. Without such DDL, a casing test would assert an unstated product policy. Schema-driven generation limits scope while keeping every expected result defensible.

Do not infer that deleted rows must have unique usernames among themselves. The index deliberately excludes them, so repeated deleted values are legal unless another constraint says otherwise. A test rejecting those rows would encode an imagined rule and could pressure developers to weaken the correct migration.

Null behavior also deserves explicit reading. Here null controls predicate membership rather than participating in the indexed key. PostgreSQL documents separate null semantics for ordinary unique constraints, including optional \`NULLS NOT DISTINCT\`; those semantics should not be confused with this \`WHERE deleted_at IS NULL\` predicate ([PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)).

The [composite uniqueness data matrix](/blog/composite-unique-constraint-test-data-matrix) develops key-column variation further. Keep that article beside this one when a partial index combines several business dimensions.

## Build Deterministic Rows with Explicit Predicate State

Factories should make predicate membership visible at the call site. Avoid a generic random timestamp because a reviewer should immediately know whether a row is active or deleted.



\`\`\`ts
type NewAccount = {
  tenantId: number;
  username: string;
  deletedAt: string | null;
  testRunId: string;
};

let sequence = 0;

export function buildAccount(
  testRunId: string,
  overrides: Partial<NewAccount> = {},
): NewAccount {
  sequence += 1;
  return {
    tenantId: 7,
    username: 'member-' + sequence,
    deletedAt: null,
    testRunId,
    ...overrides,
  };
}

export function deletedAccount(
  testRunId: string,
  username: string,
): NewAccount {
  return buildAccount(testRunId, {
    username,
    deletedAt: '2026-07-01T10:00:00Z',
  });
}
\`\`\`

The default factory yields a valid active row because active behavior is the normal path. The intent-named helper yields an exempt row using a fixed timestamp, which keeps reruns byte-identical. Neither helper reads the current clock or production data.

Separate builders from persistence helpers. A builder returns transparent input derived from schema constraints, while an insert helper sends exactly that input to PostgreSQL. Combining both can hide omitted columns, automatic normalization, or retry behavior inside fixture code. Tests should decide when a duplicate is created and which transaction owns it. That visibility makes failure evidence much easier to interpret.

Reset module sequences only at an explicit suite boundary, or derive them from a stable test identity. Silent resets during parallel execution can reintroduce collisions unrelated to the case under test. For business keys intentionally duplicated, pass the same literal value twice. For every other unique field, derive a worker-safe value without weakening readability.

Uniqueness comes from explicit sequence values and test-run ownership, not probabilistic generators. Parallel workers should also receive separate databases, schemas, or run identifiers. If usernames must remain fixed for collision tests, ownership belongs in \`test_run_id\`, not in a randomized business key.

Create overrides only for dimensions named in the matrix. For example, tenant isolation changes \`tenantId\` while preserving username and active state. That discipline follows the assigned mapping rule that composite keys vary independently.

The [synthetic test data generation guide](/blog/synthetic-test-data-generation-guide) covers reserved namespaces and deterministic generators. The sibling article on [schema-derived date-time boundaries](/blog/schema-derived-date-time-boundary-test-data) explains why fixed timestamps belong in factories.

## Assert Rejection and the Unchanged Database State

A negative database test is incomplete when it only catches any error. Assert the PostgreSQL uniqueness classification, name the relevant index or constraint when the driver exposes it, and prove no partial row remained.



\`\`\`ts
import { randomUUID } from 'node:crypto';
import { afterEach, expect, test } from 'vitest';
import { pool } from './test-database';

const runId = randomUUID();

async function insertAccount(input: NewAccount) {
  return pool.query(
    'INSERT INTO accounts ' +
      '(tenant_id, username, deleted_at, test_run_id) ' +
      'VALUES ($1, $2, $3, $4) RETURNING id',
    [input.tenantId, input.username, input.deletedAt, input.testRunId],
  );
}

afterEach(async () => {
  await pool.query('DELETE FROM accounts WHERE test_run_id = $1', [runId]);
  const residue = await pool.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM accounts WHERE test_run_id = $1',
    [runId],
  );
  expect(residue.rows[0].count).toBe('0');
});

test('rejects a second active username in one tenant', async () => {
  const first = buildAccount(runId, { username: 'sam' });
  await insertAccount(first);

  await expect(insertAccount({ ...first })).rejects.toMatchObject({
    code: '23505',
    constraint: 'accounts_active_username_key',
  });

  const rows = await pool.query<{ deletedAt: string | null }>(
    'SELECT deleted_at AS "deletedAt" FROM accounts ' +
      'WHERE tenant_id = $1 AND username = $2',
    [7, 'sam'],
  );
  expect(rows.rows).toHaveLength(1);
  expect(rows.rows[0].deletedAt).toBeNull();
});
\`\`\`

PostgreSQL uses SQLSTATE \`23505\` for unique violations. The constraint field is driver metadata, so verify its availability in the driver version used by the repository. If the application translates database errors, assert the domain error at that public boundary and retain one repository test for database classification.

The row-count assertion proves atomic rejection for this statement. When the production operation also writes an audit row or outbox message inside a transaction, assert those tables remain unchanged too. Negative cases must verify both the expected failure and the absence of unintended effects.

Capture state before the rejected operation when several columns or tables can change. After failure, compare the authoritative row, child rows, and emitted-work records against that snapshot. Avoid snapshots containing volatile database metadata unless those fields belong to the contract. Focus the comparison on values the failed operation could have touched, including the deletion timestamp and ownership references.

For a service boundary, verify that error translation does not expose raw SQL text or connection details. Assert the documented conflict classification and stable fields while the repository test retains database-specific evidence. These two layers answer different questions: storage integrity and public behavior. Keeping both prevents API refactoring from erasing the only proof that the index executes.

Do not use a broad \`rejects.toThrow()\` assertion. A disconnected database, missing table, or malformed SQL could satisfy it while the uniqueness rule remains untested. Evidence should distinguish the intended guard from unrelated infrastructure failures.

For wider API-level error checks, follow [OpenAPI specification to test-suite generation](/blog/openapi-spec-to-test-suite-generation). Database-level evidence remains necessary because an API validator cannot prove the migration enforces the same rule.

## Exercise Exempt Rows and Every Boundary Crossing

The acceptance side is as important as rejection. If every duplicate test expects failure, an accidental full unique constraint can pass the suite while preventing legitimate historical rows.

Write partial unique index negative tests in this order:

1. Insert two deleted rows with the same tenant and username, then assert both persist.
2. Insert one deleted row followed by one active duplicate, then assert both states remain distinguishable.
3. Soft-delete the active row, insert a replacement active row, and verify exactly one active row exists.
4. Attempt to restore the historical row while the replacement remains active, then assert rejection and unchanged timestamps.
5. Delete or rename the replacement, restore the historical row, and verify the newly legal transition succeeds.

These partial unique index negative tests cover both directions across the predicate boundary. Updating \`deleted_at\` from null to a timestamp removes an index entry. Updating from a timestamp to null attempts to add one, so PostgreSQL checks the active key at restore time.

Include repeated operations when the product promises idempotency. A second delete might preserve the first timestamp, assign a new timestamp, or report that the row is already deleted. The schema alone does not choose that policy, so read the service contract before asserting it. Whatever the public behavior, the partial-index observation remains exact: no deleted row qualifies until a successful restore returns its timestamp to null.

Test multi-row statements if production uses bulk updates. Restoring several historical rows in one statement can encounter an active key or collisions within the restored set. Assert that the database transaction leaves the expected state after rejection. Do not extrapolate bulk behavior solely from single-row service tests when the repository exposes bulk operations.

Also update indexed columns while the row remains active. Renaming \`jo\` to an occupied \`sam\` must fail, while changing its tenant may succeed if that full key is free. Then repeat the rename on a deleted row to prove predicate-exempt updates remain legal.

Assert state after every failed update. The deleted row must keep its timestamp after a rejected restore, and the active row must keep its original username after a rejected rename. This catches application code that performs related writes outside the transaction containing the constrained update.

The [defaults and generated values article](/blog/test-database-defaults-generated-columns-triggers) uses the same omission-versus-explicit-value discipline. Both topics require tests to let PostgreSQL produce or reject state rather than duplicating database behavior in factories.

## Race Concurrent Inserts Without Timing Sleeps

Sequential duplicates prove the index exists, but they do not prove the application handles simultaneous requests. A concurrency layer turns partial unique index negative tests into evidence about two real contenders. The database must arbitrate the conflict, and the service must preserve one legal winner.



\`\`\`ts
import { expect, test } from 'vitest';

test('allows one winner for concurrent active duplicates', async () => {
  const clientA = await pool.connect();
  const clientB = await pool.connect();
  const input = buildAccount(runId, { username: 'race-user' });

  try {
    const results = await Promise.allSettled([
      clientA.query(
        'INSERT INTO accounts ' +
          '(tenant_id, username, deleted_at, test_run_id) ' +
          'VALUES ($1, $2, $3, $4)',
        [input.tenantId, input.username, null, runId],
      ),
      clientB.query(
        'INSERT INTO accounts ' +
          '(tenant_id, username, deleted_at, test_run_id) ' +
          'VALUES ($1, $2, $3, $4)',
        [input.tenantId, input.username, null, runId],
      ),
    ]);

    const fulfilled = results.filter(result => result.status === 'fulfilled');
    const rejected = results.filter(result => result.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const active = await pool.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM accounts ' +
        'WHERE tenant_id = $1 AND username = $2 AND deleted_at IS NULL',
      [7, 'race-user'],
    );
    expect(active.rows[0].count).toBe('1');
  } finally {
    clientA.release();
    clientB.release();
  }
});
\`\`\`

The assertion permits either connection to win because scheduling is not part of the contract. It requires one fulfilled insert, one rejected insert, and one qualifying row afterward. Inspect the rejected result separately if the service promises a specific conflict response.

Repeat the concurrency shape for restoration when that operation is common. Two deleted rows sharing one key can both attempt to become active, yet only one may cross the predicate successfully. Record both starting identifiers so the final query can prove which row won and which retained its deletion timestamp. The expected winner remains nondeterministic unless the product defines explicit ordering.

Keep connections independent for a genuine database race. Two promises issued through one client may serialize before reaching PostgreSQL, producing a passing test without simultaneous contenders. A connection pool call can also obscure allocation, so checking out clients explicitly makes the setup clear. Release every client in a \`finally\` block even when assertions fail.

Avoid sleeps intended to make requests overlap. They depend on machine speed and still do not establish a meaningful synchronization point. If the operation includes pre-insert reads, add an application-level barrier so both requests reach the same point before writes proceed.

Run the same race through the public API when duplicate errors are translated there. The database integration test proves storage integrity; the API test proves stable status and error shape. Neither one should replace the other.

Use [test impact analysis in CI](/blog/test-impact-analysis-ci-guide-2026) to select these tests when the index migration, account repository, or restore endpoint changes. Selection accelerates feedback, while required suites still run according to team policy.

## Keep Cleanup and Parallel Ownership Constraint-Safe

Cleanup can accidentally invalidate the very test it supports. A global table truncation is inappropriate when multiple workers share one database, because one worker may remove another worker's qualifying row during a race assertion.

Tag every generated row with a run identifier or provision a database per worker. Delete only owned rows after each test, then query that ownership field and fail when residue remains. The assigned Secure Test Data Engineer reference requires this explicit cleanup verification rather than assuming teardown succeeded.

Choose isolation according to connection boundaries. Per-test transaction rollback is suitable only when setup, application writes, and assertions share that transaction. A throwaway database offers a stronger boundary for out-of-process services, while run-tag deletion supports carefully managed shared environments. Document the selected strategy in fixture code so contributors do not mix incompatible cleanup assumptions.

Cleanup failures should not erase the original test failure. Capture both outcomes or preserve the first as a cause while still reporting residue. A suite that silently swallows cleanup errors gradually accumulates rows that change later predicate results. Conversely, cleanup that masks the collision assertion makes immediate diagnosis harder. Treat test outcome and environment hygiene as separate evidence fields.

Delete-by-tag must not bypass production constraints through disabled triggers or a privileged shortcut. Use ordinary deletion paths unless the test environment has a documented disposal boundary. If related child rows exist, delete in foreign-key order or exercise the configured cascade intentionally.

Partial unique index negative tests should use fixed business keys inside isolated ownership scopes. Randomizing every username prevents meaningful collision cases, while sharing fixed values without ownership creates cross-worker interference. The right design separates deterministic test intent from infrastructure identity.

For transaction-oriented isolation, compare the tradeoffs in [risk-based testing strategy](/blog/risk-based-testing-strategy-guide-2026). A rollback fixture works only when all writes use the same transaction and connection; HTTP services commonly open their own connections.

## Turn Constraint Results into Release Evidence

A migration that adds, removes, or changes this index is a high-risk data-shape change under the [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian). Its report should name the affected behavior, selected tests, judged commit, and concrete run evidence.

Map the change to a user-facing risk: account creation or restoration could admit duplicate active usernames, or legitimate deleted history could become unwritable. Then select the matrix cases by changed migration, repository import graph, or known endpoint mapping. Do not cite file names alone as proof of behavior.

The gate report should mark tests missing or not run as missing evidence. A green unit suite cannot establish an actual partial-index predicate when every repository is mocked. Pair integration results with changed-line coverage for error translation and restore logic.

Classify uncovered changed lines by behavior rather than percentage alone. An unexecuted branch translating \`23505\` during restore can be a blocker even when overall changed-line coverage appears high. A documentation-only line may be waiverable under team policy. The report should cite exact coverage artifacts and test run identifiers, allowing reviewers to recompute the verdict from evidence.

When the selected test set is empty for a migration or repository change, stop and investigate the mapping. Empty selection may indicate a missing suite, an import-graph limitation, or an incorrectly classified change. It cannot demonstrate safety. Add the relevant matrix to the required database suite, then rerun against the exact commit being judged.

If the migration lacks rollback guidance, record that process gap separately from test results. The Guardian recommends a verdict but never merges, deploys, tags, or approves. Read the [release readiness scorecard](/blog/ai-release-readiness-scorecard-2026) for the report structure and the [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) for suite placement.

A useful report entry names the partial unique index negative tests, exact matrix cases, database run identifier, and surviving-row query. That evidence lets a reviewer distinguish conditional uniqueness coverage from a generic database test count.

## Review Common False Positives Before Shipping

Several weak tests appear convincing because they produce a unique violation. Compare each one against the declared invariant before accepting it.

| Weak test | Why it can pass incorrectly | Strong replacement |
| --- | --- | --- |
| Duplicate two active usernames globally | Ignores tenant key | Vary tenant independently |
| Expect any thrown error | Network or SQL failures also pass | Assert intended error classification |
| Test inserts only | Misses restore and rename transitions | Exercise predicate-boundary updates |
| Use mocked repository | Never invokes the database index | Run migrated PostgreSQL integration |
| Expect every duplicate to fail | Accepts accidental full uniqueness | Prove deleted duplicates succeed |
| Run sequential writes only | Misses service race handling | Add two-connection concurrency case |
| Clean with global truncate | Hides residue and disrupts workers | Delete by owner and assert zero residue |

Another false positive comes from testing against a schema created by hand instead of migrations. The local DDL can contain the correct index while the production migration omits it. Build integration databases from the same migration path judged for release.

Do not assert query-plan index usage as a substitute for behavioral uniqueness. PostgreSQL requires query conditions to imply a partial-index predicate before using that index for retrieval ([PostgreSQL partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html)). Enforcement tests and planner tests answer different questions and should have separate expectations.

Review the matrix whenever the predicate changes. Replacing \`deleted_at IS NULL\` with status-based eligibility creates new entering and leaving transitions. Generate new cases from the revised DDL rather than mechanically retaining old fixtures.

## Put the Matrix into the Delivery Workflow

Start with the migrated schema, create a deterministic factory, and implement the eight matrix rows before expanding service scenarios. Keep one focused repository suite close to the migration contract and one API suite for translated conflicts. This gives failures a clear diagnostic boundary.

Run the narrow suite first when account schema or restore logic changes, then run every required CI suite. Publish the constraint name, run identifier, and final active-row count as evidence. Never treat an empty selected set as a pass for a changed data-shape surface.

Partial unique index negative tests become maintainable when every case maps to a key column, predicate state, or transition. The matrix is small enough for code review and complete enough to catch accidental full uniqueness, missing predicates, unsafe restores, and race mishandling.

Apply this workflow with the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer), then browse the full [QA skills directory](/skills) for database and release checks that fit your repository.

## Frequently Asked Questions

### Should two soft-deleted rows with the same key be accepted?

Yes, when both rows fall outside the partial-index predicate and no other constraint forbids duplication. Include this acceptance case because an accidental full unique constraint would reject legitimate history. Always read the exact migration, since another index or business rule may impose a different requirement.

### Why must a restore operation have its own negative test?

Restoring changes predicate membership from excluded to included. PostgreSQL must add the restored key to the unique partial index, which can collide with a newer active row. The test should assert rejection, preserve the deletion timestamp, and verify that the existing active row remains unchanged.

### Is an API duplicate test enough for this index?

No. An API test proves request handling and error translation, but application validation could reject the request before PostgreSQL executes it. Keep a migrated-database integration test for the index invariant, then add an API test for the promised status code and response shape.

### How should parallel workers share fixed duplicate values?

Give each worker an isolated database, schema, tenant, or test-run ownership field. Fixed values make collision intent readable, while isolation prevents unrelated workers from colliding accidentally. Cleanup must target only owned rows and finish with a residue query that expects zero matches.

### What evidence belongs in a release gate report?

Record the judged commit, changed migration, selected matrix cases, database run identifier, exact failure classification, and final state query. Note any unrun case as missing evidence. The release guardian can recommend a verdict from those artifacts, but a human retains the release decision.
`,
};
