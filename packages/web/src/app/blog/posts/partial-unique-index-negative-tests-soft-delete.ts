import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Partial Unique Index Negative Tests Guide',
  description:
    'Use partial unique index negative tests to verify soft-delete predicates, duplicate rejection, restore conflicts, concurrency, and clean rollback behavior.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Tutorial',
  primaryKeyword: 'partial unique index negative tests',
  keywords: [
    'partial unique index negative tests',
    'PostgreSQL partial unique index',
    'soft delete testing cases',
    'database constraint testing',
    'duplicate data test matrix',
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
Partial unique index negative tests must prove both sides of the index filter, not only duplicate rejection. Create one active row, repeat its indexed key, check rejection, then move one row outside the filter and check acceptance. Also test updates crossing the filter and concurrent inserts.

Soft deletion changes the key rule from a table-wide rule into a conditional rule. A test suite that checks only two active inserts misses restore conflicts, filter changes, and races. The [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) supplies the schema-first method: derive each case from declared DDL rather than guessing useful examples.

## How Does a PostgreSQL Partial Unique Index Work?

A PostgreSQL partial unique index stores only rows that meet its WHERE rule. When that index is unique, PostgreSQL checks duplicates only within the matched rows. Here active usernames stay unique per tenant, while deleted accounts remain outside the index.



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

PostgreSQL defines a partial index as an index over rows satisfying its filter. A unique partial index thus enforces the key rule only among matched rows, while rows outside the filter stay unconstrained by that index ([PostgreSQL partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html)).

Map the DDL into one exact sentence: for any tenant and username, at most one row may have a null deletion timestamp. That sentence identifies the key columns, filter, allowed duplicates, and changes needing tests. It also stops a global username rule from silently replacing the actual database contract.

List each rule before choosing data: read the DDL, current table, ORM metadata, data layer, and API request schema. Record whether each layer understands soft deletion. This check often finds an app precheck that ignores tenants or treats each old row as reserved. Such a gap belongs in the test plan because the DB and app can reject different requests.

Name the rule by business action as well as storage structure. Creation, username changes, tenant transfers, deletion, and restoration can all alter an indexed key or its filter match state. Listing those actions stops an insert-heavy suite from overlooking update paths. It also helps reviewers connect a changed handler to the exact DB cases that should run.

The source-priority rule from the assigned skill matters here. SQL DDL outranks ORM annotations, API schemas, and TypeScript types because PostgreSQL performs the final write check. If the ORM declares username globally unique while the DDL defines a tenant key rule, report the disagreement before generating fixtures.

Read [test data management strategies](/blog/test-data-management-strategies) for broader scope and cleanup patterns. Use the [DB testing automation guide](/blog/database-testing-automation-guide) when the suite still relies on mocked data layers instead of migrated PostgreSQL.

## How Do You Build a Duplicate Data Test Matrix?

The schema-to-data mapping needs same-key tests both within a batch and across transactions. For a partial unique index, it also needs a duplicate outside the filter. Expand that compact rule into a matrix before writing test code.

| Case | Existing row | Attempted row or change | Expected result | Rule proved |
| --- | --- | --- | --- | --- |
| Active duplicate | tenant 7, sam, null | tenant 7, sam, null | Reject | Matched keys collide |
| Deleted duplicate | tenant 7, sam, timestamp | tenant 7, sam, timestamp | Accept | Exempt rows may repeat |
| Active beside deleted | tenant 7, sam, timestamp | tenant 7, sam, null | Accept | Exempt row does not reserve key |
| Other tenant | tenant 7, sam, null | tenant 8, sam, null | Accept | Full composite key matters |
| Soft delete change | tenant 7, sam, null | update timestamp | Accept | Leaving filter frees key |
| Restore conflict | active and deleted rows share a username | set deleted timestamp to null | Reject | Entering filter is checked |
| Rename clash | tenant 7, jo, null | update username to sam | Reject | Indexed-column updates are checked |
| Concurrent duplicate | no matching row | two active sam inserts | One accepts, one rejects | Race cannot create two active rows |

This table is the center of the partial unique index negative tests. It varies one useful field at a time, which makes a failed check traceable to filter state, composite keys, or a transaction outcome. Adding random rows would hide those distinctions without extending coverage.

Treat each row as a precondition and action, then ask whether PostgreSQL accepts or rejects the statement. The second check is the full stored state after that outcome. This structure catches a translated error when a linked write escapes its transaction. It also separates a legal exempt duplicate from an active clash that failed for another reason.

Add a matrix row only when a declared schema field or write change justifies it. Case differences such as uppercase usernames belong here only when the index expression or collation defines relevant result. Without such DDL, a casing test would assert an unstated product policy. Schema-driven generation limits scope while keeping each expected result sound.

Do not infer that deleted rows must have unique usernames among themselves. The index excludes them by design, so repeated deleted values are legal unless another constraint says otherwise. A test rejecting those rows would encode an imagined rule and could pressure developers to weaken the correct DDL.

Null result also needs a clear reading. Here null controls filter match state rather than taking part in the indexed key. PostgreSQL documents distinct null rules for ordinary unique constraints, such as optional \`NULLS NOT DISTINCT\`; those rules differ from this \`WHERE deleted_at IS NULL\` filter ([PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)).

The [composite key data matrix](/blog/composite-unique-constraint-test-data-matrix) develops key-column variation further. Keep that article beside this one when a partial index combines many business fields.

## Schema Driven Test Data with Clear Filter State

Factories should make filter state visible at the call site. Avoid a generic random timestamp because a reviewer should know right away whether a row is active or deleted.



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

The default factory yields a valid active row because that is the normal path. The intent-named helper yields an exempt row using a fixed timestamp, which keeps reruns byte-identical. Neither helper reads the current clock or live data.

Distinct builders from storage helpers: a builder returns plain input, while an insert helper sends that input to PostgreSQL. Combining both can hide omitted columns, built-in normalization, or retry logic inside fixture code. Tests should decide when a duplicate is created and which transaction owns it. That visibility makes failure proof much easier to read.

Reset module sequences only at a clear suite edge, or derive them from a stable test identity. Silent resets during parallel runs can create clashes unrelated to the case under test. For business keys duplicated on purpose, pass the same literal value twice. For each other unique field, derive a worker-safe value without weakening readability.

Stable key values come from clear sequences and test-run scope, not random generators. Parallel workers should also receive distinct DBs, schemas, or run IDs. If usernames must stay fixed for clash tests, scope belongs in \`test_run_id\`, not in a randomized business key.

Create overrides only for fields named in the matrix. For example, tenant isolation changes \`tenantId\` while keeping username and active state. That discipline follows the assigned mapping rule that composite keys vary independently.

The [synthetic test data generation guide](/blog/synthetic-test-data-generation-guide) covers reserved namespaces and fixed generators. The sibling article on [schema-derived date-time edges](/blog/schema-derived-date-time-boundary-test-data) explains why fixed timestamps belong in factories.

## Database Constraint Testing for Stored State

A negative DB test is incomplete when it only catches any error. Assert PostgreSQL's unique-violation code, name the relevant index when the driver exposes it, and prove no partial row remained.



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

PostgreSQL uses SQLSTATE \`23505\` for unique violations. The constraint field is driver metadata, so check its support in the driver version used by the data layer. If the app maps DB errors, assert the domain error at that public edge and keep one data layer test for DB code.

The row-count check proves atomic rejection for this statement. When the live action also writes an audit row or outbox message inside a transaction, assert those tables stay unchanged too. Reject cases must check both the expected failure and the absence of unwanted effects.

Capture state before the rejected action when many columns or tables can change. After failure, compare the source row, child rows, and emitted-work records against that snapshot. Avoid snapshots with changing DB metadata unless those fields belong to the contract. Focus on values the failed action could have touched, such as the deletion timestamp and scope links.

For a service edge, check that error translation does not expose raw SQL text or connection details. Assert the stated conflict code and stable fields while the data layer test keeps DB-level proof. These layers answer different questions: storage integrity and public result. Keeping both stops API refactoring from erasing the only proof that the index runs.

Do not use a broad \`rejects.toThrow()\` check. A disconnected DB, missing table, or malformed SQL could meet it while the key rule stays untested. Proof should separate the intended guard from other test setup failures.

For wider API-level error checks, follow [OpenAPI specification to test-suite generation](/blog/openapi-spec-to-test-suite-generation). DB-level proof stays necessary because an API validator cannot prove the DDL enforces the same rule.

## Which Soft Delete Testing Cases Cross the Filter?

Soft delete testing cases must prove both acceptance and rejection. If each duplicate case expects failure, an accidental full unique constraint can pass the suite while blocking valid old rows. The ordered flow below checks each move across the filter.

Write partial unique index negative tests in this order:

1. Insert two deleted rows with the same tenant and username, then assert both persist.
2. Insert one deleted row followed by one active duplicate, then assert both states stay distinguishable.
3. Soft-delete the active row, insert a replacement active row, and check exactly one active row exists.
4. Attempt to restore the old row while the replacement stays active, then assert failure and unchanged timestamps.
5. Delete or rename the replacement, restore the old row, and check the newly legal change succeeds.

These partial unique index negative tests cover both directions across the filter edge. Updating \`deleted_at\` from null to a timestamp removes an index entry. Updating from a timestamp to null attempts to add one, so PostgreSQL checks the active key at restore time.

Include repeated actions when the product promises idempotency. A second delete might keep the first timestamp, assign a new timestamp, or report that the row is already deleted. The schema alone does not choose that policy, so read the service contract before asserting it. Whatever the public result, the partial-index check stays exact: no deleted row qualifies until a successful restore returns its timestamp to null.

Test multi-row statements if live uses bulk updates. Restoring many old rows in one statement can encounter an active key or clashes within the restored set. Assert that the DB transaction leaves the expected state after failure. Do not extrapolate bulk result solely from single-row service tests when the data layer exposes bulk actions.

Also update indexed columns while the row stays active. Renaming \`jo\` to an occupied \`sam\` must fail, while changing its tenant may succeed if that full key is free. Then repeat the rename on a deleted row to prove filter-exempt updates stay legal.

Assert state after each failed update. The deleted row must keep its timestamp after a rejected restore, and the active row must keep its first username after a rejected rename. This catches app code that performs linked writes outside the transaction with the constrained update.

The [defaults and generated values article](/blog/test-database-defaults-generated-columns-triggers) uses the same omission-versus-clear-value discipline. Both topics need tests to let PostgreSQL make or reject state rather than duplicating DB result in factories.

## Vitest PostgreSQL Integration Tests for Races

Sequential duplicates prove the index exists, but they do not prove the application handles concurrent requests. A concurrency layer turns partial unique index negative tests into proof about two real writers. The database must arbitrate the conflict, and the service must keep one legal winner.



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

The check permits either connection to win because scheduling is not part of the contract. It needs one fulfilled insert, one rejected insert, and one matched row afterward. Inspect the rejected result separately if the service promises an exact conflict response.

Repeat the race for restoration when that action is common. Two deleted rows sharing one key can both try to become active, yet only one may cross the filter. Record both starting IDs so the final query can show which row won and which kept its deletion timestamp. The expected winner remains unknown unless the product defines a clear order.

Keep connections distinct for a real DB race. Two promises issued through one client may run in order before reaching PostgreSQL, so the test could pass without two writers. A pool call can also hide allocation, so check out both clients in the setup. Release each client in a \`finally\` block even when checks fail.

Avoid sleeps intended to make requests overlap. They depend on machine speed and still do not establish a useful sync point. If the action includes pre-insert reads, add an app-level barrier so both requests reach the same point before writes proceed.

Run the same race through the public API when duplicate errors are translated there. The DB integration test proves storage integrity; the API test proves stable status and error shape. Neither one should replace the other.

Use [test impact analysis in CI](/blog/test-impact-analysis-ci-guide-2026) to select these tests when the index DDL, account data layer, or restore endpoint changes. Selection accelerates feedback, while required suites still run under team policy.

## Cleanup That Protects Parallel Workers

Cleanup can accidentally invalidate the very test it supports. A global table truncation is inappropriate when multiple workers share one DB, because one worker may remove another worker's matched row during a race check.

Tag each generated row with a run ID or provision a DB per worker. Delete only owned rows after each test, then query that scope field and fail when residue stays. The assigned Secure Test Data Engineer reference needs this clear cleanup check rather than assuming teardown succeeded.

Choose isolation based on connection boundaries. Per-test rollback works only when setup, application writes, and checks share one transaction. A disposable database gives stronger isolation for services that run in another process. Run-tag deletion can support a shared test database when the team manages it with care.

Cleanup failures should not erase the first test failure; capture both outcomes while still reporting residue. A suite that swallows cleanup errors slowly adds rows that change later filter results. Cleanup that masks the clash check also makes the first bug harder to find. Treat test outcome and setup hygiene as distinct proof fields.

Delete-by-tag must not bypass live constraints through disabled triggers or a privileged shortcut. Use ordinary deletion paths unless the test setup has a stated disposal edge. If linked child rows exist, delete in foreign-key order or use the declared cascade intentionally.

Partial unique index negative tests should use fixed business keys inside isolated scope scopes. Randomizing each username stops useful clash cases, while sharing fixed values without scope creates cross-worker clashes. The right design separates fixed test intent from test setup identity.

For transaction-oriented isolation, compare the tradeoffs in [risk-based testing strategy](/blog/risk-based-testing-strategy-guide-2026). A rollback fixture works only when all writes use the same transaction and connection; HTTP services commonly open their own connections.

## Release Gate Evidence for the Rule

A DDL that adds, removes, or changes this index is a high-risk data-shape change under the [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian). Its report should name the affected result, selected tests, judged commit, and concrete run proof.

Map the change to a user-facing risk: account creation or restoration could admit duplicate active usernames, or valid deleted history could become unwritable. Then select the matrix cases by changed DDL, data layer import graph, or known endpoint mapping. Do not cite file names alone as proof of result.

The gate report should mark tests missing or not run as missing proof. A green unit suite cannot establish an actual partial-index filter when each data layer is mocked. Pair integration results with changed-line coverage for error translation and restore logic.

Classify uncovered changed lines by result rather than rate alone. An unexecuted branch translating \`23505\` during restore can be a blocker even when overall changed-line coverage appears high. A docs-only line may be waiverable under team policy. The report should cite exact coverage files and test run IDs, allowing reviewers to recompute the verdict from proof.

When the selected test set is empty for a DDL or data layer change, stop and inspect the mapping. Empty selection may indicate a missing suite, an import-graph limit, or an incorrectly classified change. It cannot show safety. Add the linked matrix to the required DB suite, then rerun against the exact commit being judged.

If the DDL lacks rollback guidance, record that process gap separately from test results. The Guardian recommends a verdict but never merges, deploys, tags, or approves. Read the [release readiness scorecard](/blog/ai-release-readiness-scorecard-2026) for the report structure and the [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) for suite placement.

A useful report entry names the partial unique index negative tests, exact matrix cases, DB run ID, and surviving-row query. That proof lets a reviewer separate conditional key coverage from a generic DB test count.

## False Positives That Can Mislead the Test

Many weak tests appear convincing because they make a unique violation. Compare each one against the declared rule before accepting it.

| Weak test | Why it can pass in error | Strong replacement |
| --- | --- | --- |
| Duplicate two active usernames globally | Ignores tenant key | Vary tenant independently |
| Expect any thrown error | Network or SQL failures also pass | Assert intended error code |
| Test inserts only | Misses restore and rename changes | Exercise filter-edge updates |
| Use mocked data layer | Never invokes the DB index | Run migrated PostgreSQL integration |
| Expect each duplicate to fail | Accepts accidental table-wide uniqueness | Prove deleted duplicates succeed |
| Run sequential writes only | Misses service race handling | Add two-connection concurrency case |
| Clean with global truncate | Hides residue and disrupts workers | Delete by owner and assert zero residue |

Another false positive comes from testing against a schema created by hand instead of migrations. The local DDL can contain the correct index while the production migration omits it. Build integration databases from the same migration path judged for release.

Do not assert query-plan index usage as a substitute for the stored key rule. PostgreSQL needs query conditions to imply a partial-index filter before using that index for retrieval ([PostgreSQL partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html)). Enforcement tests and planner tests answer different questions and need distinct expectations.

Review the matrix whenever the filter changes. Replacing \`deleted_at IS NULL\` with status-based eligibility creates new entering and leaving changes. Generate new cases from the revised DDL rather than mechanically retaining old fixtures.

## Conclusion: Apply Partial Unique Index Negative Tests

Start with the migrated schema, create a fixed factory, and implement the eight matrix rows before expanding service cases. Keep one focused data layer suite close to the DDL contract and one API suite for translated conflicts. This gives failures a clear debug edge.

Run the narrow suite first when account schema or restore logic changes, then run each required CI suite. Publish the constraint name, run ID, and final active-row count as proof. Never treat an empty selected set as a pass for a changed data-shape surface.

Partial unique index negative tests are easier to maintain when each case maps to a key, filter state, or change. The matrix is small enough for review and broad enough to catch a table-wide key rule, missing filters, unsafe restores, and race bugs.

Apply this workflow with the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer). Then browse the full [QA skills directory](/skills) for DB and release checks that fit your data layer.

## Frequently Asked Questions

### Should two soft-deleted rows with the same key be accepted?

Yes, when both rows fall outside the partial-index filter and no other constraint forbids duplication. Include this acceptance case because an accidental full unique constraint would reject valid history. Always read the exact DDL, since another index or business rule may impose a different requirement.

### Why must a restore action have its own negative test?

Restoring changes filter match state from excluded to included. PostgreSQL must add the restored key to the unique partial index, which can collide with a newer active row. The test should assert failure, keep the deletion timestamp, and check that the existing active row stays unchanged.

### Is an API same-key test enough for this index?

No. An API test proves request handling and error translation, but app validation could reject the request before PostgreSQL runs it. Keep a migrated-DB integration test for the index rule, then add an API test for the promised status code and response shape.

### How should parallel workers share fixed duplicate values?

Give each worker an isolated DB, schema, tenant, or test-run scope field. Fixed values make clash intent readable, while isolation stops other workers from colliding accidentally. Cleanup must target only owned rows and finish with a residue query that expects zero matches.

### What proof belongs in a release gate report?

Record the judged commit, changed DDL, selected matrix cases, DB run ID, exact failure code, and final state query. Note any unrun case as missing proof. The release guardian can recommend a verdict from those files, but a human keeps the release decision.
`,
};
