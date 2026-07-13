import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Soft-Delete Query Filters',
  description:
    'Test soft-delete query filters across reads, joins, uniqueness, restore, pagination, and concurrent updates so deleted records never leak unexpectedly.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Testing Soft-Delete Query Filters

Set \`deleted_at\` on customer 42, refresh the customer list, and the row disappears. That proves one query contains one predicate. It says nothing about search, counts, joins, exports, direct lookup, authorization checks, unique constraints, restore, or a concurrent update holding an older snapshot. Soft deletion changes the meaning of “exists” across the system, and tests must follow that meaning through every read and write path.

This tutorial uses PostgreSQL and the Node \`pg\` client. The SQL is intentionally visible because ORM default scopes can make basic cases look safe while raw queries, relations, and admin paths quietly bypass them. The goal is not to mandate one schema pattern. It is to construct a test model that exposes inconsistent filtering and ambiguous lifecycle rules.

## Model the row lifecycle, not a boolean shortcut

A nullable timestamp carries more diagnostic value than \`is_deleted\`. It records when removal occurred and supports retention jobs, while \`deleted_by\` and a reason can support audit requirements. The active state is \`deleted_at IS NULL\`. SQL three-valued logic matters: do not rewrite that predicate as an equality against null.



\`\`\`sql
CREATE TABLE customers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id bigint NOT NULL,
  email text NOT NULL,
  display_name text NOT NULL,
  deleted_at timestamptz,
  deleted_by bigint,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX customers_active_tenant_email_uq
  ON customers (tenant_id, lower(email))
  WHERE deleted_at IS NULL;

CREATE INDEX customers_active_tenant_name_idx
  ON customers (tenant_id, display_name, id)
  WHERE deleted_at IS NULL;
\`\`\`



The partial unique index permits reuse of an email after the old customer is deleted, while preventing two active customers with the same normalized email in a tenant. That is a product decision, not an automatic soft-delete rule. If legal or business identity says an email can never be reused, use a different constraint and test that policy instead.

Define state transitions before creating fixtures.

| Current state | Operation | Allowed result | Important rejection |
|---|---|---|---|
| Active | Soft delete | Timestamp and actor recorded, version advances | Stale version or wrong tenant |
| Deleted | Soft delete again | Idempotent no-op or explicit conflict | Silent timestamp rewrite unless intended |
| Deleted | Restore | Row becomes active | Unique-key collision with a newer active row |
| Active | Restore | No-op or validation error | Accidental version decrement |
| Deleted beyond retention | Purge | Physical removal and dependent cleanup | Purging an active row |
| Any | Read through public API | Only active unless an authorized mode says otherwise | Client-controlled filter bypass |

The choice between idempotent and conflicting repeated deletion affects HTTP responses and audit trails. Encode it once, then test repositories and APIs against the same contract.

## Create fixtures that make omission visible

A useful fixture contains at least two tenants, active and deleted customers with similar values, a child relation, and a reused business key. Random records alone rarely create the collisions that reveal missing predicates.



\`\`\`ts
import { Pool, PoolClient } from 'pg';

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });

async function seedCustomers(client: PoolClient) {
  const result = await client.query<{
    active_id: string;
    deleted_id: string;
    other_tenant_id: string;
  }>(\`
    WITH active AS (
      INSERT INTO customers (tenant_id, email, display_name)
      VALUES (101, 'active@example.test', 'Alex Current')
      RETURNING id
    ), deleted AS (
      INSERT INTO customers
        (tenant_id, email, display_name, deleted_at, deleted_by)
      VALUES
        (101, 'old@example.test', 'Alex Archived', now() - interval '2 days', 9001)
      RETURNING id
    ), other_tenant AS (
      INSERT INTO customers (tenant_id, email, display_name)
      VALUES (202, 'active@example.test', 'Alex Other Tenant')
      RETURNING id
    )
    SELECT
      active.id AS active_id,
      deleted.id AS deleted_id,
      other_tenant.id AS other_tenant_id
    FROM active, deleted, other_tenant
  \`);
  return result.rows[0];
}

async function listVisibleCustomers(client: PoolClient, tenantId: number) {
  return client.query(
    \`SELECT id, email, display_name
       FROM customers
      WHERE tenant_id = $1
        AND deleted_at IS NULL
      ORDER BY display_name, id\`,
    [tenantId],
  );
}
\`\`\`



Use a dedicated database or schema and wrap each test in a transaction when application connections do not need to observe the fixture. If the HTTP server uses another pool, an uncommitted fixture is invisible to it. In that case, create unique tenant identifiers and clean them explicitly. The [test data management guide](/blog/test-data-management-strategies) explores those isolation tradeoffs.

## Exercise every read shape that can forget the predicate

Build a query inventory from code search and database telemetry. The obvious collection endpoint is only the first row.

| Read surface | Leak pattern | Test oracle |
|---|---|---|
| List and search | Deleted row appears among matches | Exact ordered IDs and total count |
| Direct lookup by ID | Repository omits active predicate | Not-found behavior for deleted ID |
| Join from orders | Deleted customer resurrected through relation | Null/redacted relation or excluded parent, per contract |
| Aggregate | Count includes tombstones | Active count derived from fixture |
| Export/report | Raw SQL bypasses ORM scope | File contains no deleted identifiers |
| Autocomplete | Search index lags deletion | Deleted label absent after defined consistency window |
| Admin recycle bin | Default scope cannot be intentionally bypassed | Authorized deleted-only set returned |
| Authorization lookup | Deleted membership still grants access | Protected request is denied |

For each surface, assert exact identifiers rather than \`not.toContain('Alex Archived')\` alone. A result can omit the deleted fixture and still include another tenant's record. Verify tenant scope and deletion scope together because these predicates are commonly composed.

Direct lookup semantics deserve special attention. Returning 404 for a deleted public resource avoids confirming its past existence. An internal recovery endpoint may return it with deletion metadata. These should be different repository methods, such as \`findActiveById\` and \`findDeletedByIdForRecovery\`, rather than a boolean flag accepted from arbitrary callers.

## Joins force an explicit visibility decision

Suppose an active invoice references a customer who is later soft-deleted. An inner join with \`customers.deleted_at IS NULL\` removes the invoice from results. A left join with the predicate in the \`ON\` clause preserves the invoice and produces a null customer. Putting the same predicate in the \`WHERE\` clause turns that left join effectively into an inner join.



\`\`\`sql
-- Preserve active invoices, redact a deleted customer relation.
SELECT
  i.id,
  i.total_cents,
  c.id AS customer_id,
  c.display_name AS customer_name
FROM invoices AS i
LEFT JOIN customers AS c
  ON c.id = i.customer_id
 AND c.tenant_id = i.tenant_id
 AND c.deleted_at IS NULL
WHERE i.tenant_id = $1
  AND i.deleted_at IS NULL
ORDER BY i.id;
\`\`\`



The correct placement depends on domain behavior. An audit invoice might need a stored customer snapshot even after deletion. A contact list should exclude the row entirely. Write a fixture with an active parent and deleted child, then assert the chosen behavior. Otherwise a harmless-looking join refactor can change product semantics.

Many-to-many tables create another question: is the membership itself soft-deletable, or does deleting either endpoint make it invisible? Test all combinations. If both the project and membership have tombstones, every path needs both predicates.

## Prove uniqueness before and after deletion

Partial indexes turn lifecycle policy into database enforcement. Test them at the database boundary because mocks cannot represent PostgreSQL constraint behavior.

Insert an active customer, attempt a second active row with the same tenant and case-insensitive email, and expect unique violation code \`23505\`. Soft-delete the first row, then insert the replacement successfully. Finally, try restoring the original. The restore must fail cleanly because it would re-enter the partial index and collide.

The application should translate that restore failure into a domain response, not leak a raw constraint name. Test the transaction afterward. PostgreSQL marks a transaction failed after a constraint error until rollback, so recovery code must use a transaction boundary or savepoint appropriately.

If the restore workflow supports changing the email, test atomicity. Updating the key and clearing \`deleted_at\` should occur in one statement or transaction so no intermediate active duplicate is exposed.

## Delete and restore with optimistic concurrency

A soft delete is an update, which means it can race with ordinary edits. Without a version predicate, an editor can overwrite fields after another request deletes the row, or a delayed deletion can tombstone a newly updated record without acknowledging the conflict.



\`\`\`ts
async function softDeleteCustomer(
  client: PoolClient,
  input: { tenantId: number; customerId: string; actorId: number; expectedVersion: number },
) {
  const result = await client.query(
    \`UPDATE customers
        SET deleted_at = now(),
            deleted_by = $3,
            version = version + 1,
            updated_at = now()
      WHERE tenant_id = $1
        AND id = $2
        AND deleted_at IS NULL
        AND version = $4
      RETURNING id, deleted_at, deleted_by, version\`,
    [input.tenantId, input.customerId, input.actorId, input.expectedVersion],
  );

  if (result.rowCount !== 1) throw new Error('customer_not_active_or_version_conflict');
  return result.rows[0];
}

test('rejects deletion with a stale version', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = await seedCustomers(client);
    await client.query(
      'UPDATE customers SET version = version + 1 WHERE id = $1',
      [ids.active_id],
    );

    await expect(
      softDeleteCustomer(client, {
        tenantId: 101,
        customerId: ids.active_id,
        actorId: 9001,
        expectedVersion: 1,
      }),
    ).rejects.toThrow('customer_not_active_or_version_conflict');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});
\`\`\`



Add two-connection integration tests for the isolation level you actually use. Coordinate transactions with explicit barriers, not sleeps. Verify the final row, version, and audit record after both operations settle.

## Pagination and counts need tombstone-aware boundaries

Offset pagination can shift when a row is deleted between pages, producing a duplicate or omission even when every query filters correctly. Cursor pagination is usually more stable, but the cursor must be based on active ordering fields and have a deterministic tie-breaker.

Seed records on both sides of a page boundary, delete one record, then request consecutive pages. Assert the union of returned IDs has no duplicates, contains only active rows, and follows the declared order. Test a cursor belonging to a now-deleted row. Decide whether it remains a valid position marker or returns an invalid-cursor error.

Counts must use the same predicate as rows. An API that returns five visible results and \`total: 6\` leaks deleted population and breaks page controls. Test count and page data in the same response against one fixture snapshot.

## Search indexes, caches, and replicas widen the deletion window

Database correctness does not guarantee application visibility. A deleted row may survive in Redis, Typesense, Elasticsearch, a CDN response, or a read replica. Define a consistency target per surface. Immediate concealment may require a denylist or version check at read time while asynchronous index deletion catches up.

Test the whole pipeline: create and index a unique marker, confirm it is searchable, delete through the supported API, poll only for the documented bounded convergence, and assert the marker no longer appears. Then attempt direct lookup from the cache-backed path. Preserve event IDs in diagnostics so failures can distinguish an unpublished event from a failed consumer.

Do not make an eventually consistent test wait indefinitely. Use a deadline grounded in the service objective and report the last observed state. For core database automation patterns, see the [database testing automation guide](/blog/database-testing-automation-guide).

## Admin bypass and recovery require separate authority

A global query flag such as \`includeDeleted=true\` is dangerous if ordinary clients can set it. Recovery APIs should require explicit authorization, tenant checks, an audit reason, and perhaps recent authentication. Tests should prove that normal users cannot discover deleted rows through filters, GraphQL arguments, sort keys, error messages, or totals.

For an authorized recycle bin, assert deleted-only behavior and metadata. Active rows should not be mixed in accidentally. Attempt cross-tenant recovery and require denial. Restore a row, then verify it disappears from the recycle bin and returns to normal reads exactly once.

Retention purge is not restore. Test that the purge job selects only rows older than the cutoff, deletes or anonymizes dependent records according to policy, and is safe to retry. Freeze the clock or pass a cutoff parameter so a record on the boundary is deterministic.

## A compact soft-delete regression plan

Keep database-level constraint tests fast and exhaustive, repository tests focused on query composition, and a smaller number of API tests for authorization and response semantics. The most valuable cases are:

- Active and deleted twins matching the same search term.
- Same business key across two tenants.
- Direct lookup of a tombstoned ID.
- An active parent joined to a deleted child.
- Aggregate and page count agreement.
- Email reuse after deletion and restore collision.
- Repeated delete under the selected idempotency rule.
- Stale-version delete racing with edit.
- Cursor traversal after a boundary row is removed.
- Cache and search-index concealment after the consistency window.
- Authorized restore plus unauthorized and cross-tenant attempts.
- Retention purge immediately before, at, and after cutoff.

Soft delete is a cross-cutting data state, not a cosmetic WHERE clause. Tests earn confidence by making deleted fixtures tempting to return, then proving that only explicitly authorized recovery paths can see them.

## Views and ORM scopes need bypass tests

A database view such as \`active_customers\` can centralize the predicate, while an ORM default scope can append it automatically. Both reduce routine mistakes, but neither makes leaks impossible. Raw SQL may target the base table, an unscoped method may be reachable from a controller, and eager-loading code may apply the scope to the parent but not the relation.

Write architecture tests around the approved repository surface. Public services should depend on an active-record repository that does not expose a generic “unscoped” switch. Recovery code can depend on a narrower tombstone repository guarded by authorization. At integration level, execute representative ORM methods: find by primary key, count, exists, relation preload, update-many, and bulk export. Confirm the generated behavior with deleted twins in the fixture.

Views introduce write semantics of their own. If the application updates through a view, test whether PostgreSQL considers it automatically updatable and whether the active predicate has the expected check behavior. A row should not disappear midway through a multi-step application update because one statement sets the tombstone earlier than intended.

## Protect background jobs from resurrecting rows

Delayed workers frequently load a customer ID when a job is enqueued and execute after the customer is deleted. The worker must recheck active state at execution time. Test a paused job: enqueue an email or enrichment task, soft-delete the customer, release the worker, and require a skipped outcome with no downstream call.

Import and synchronization jobs pose the opposite risk. An upsert keyed by email can find a deleted row and clear \`deleted_at\` accidentally, bypassing the audited restore workflow. Feed an import record matching a tombstone and assert the documented choice: create a replacement, reject for review, or keep the tombstone. Never let generic upsert syntax choose lifecycle policy by accident.

Finally, test event consumers out of order. A customer-updated event older than the deletion event must not overwrite deletion metadata. Carry a version or monotonic sequence in events, and make the consumer ignore stale writes. Duplicate deletion delivery should remain safe and should not rewrite the original deletion timestamp if that timestamp is part of the audit record.

## Frequently Asked Questions

### Should every query literally include deleted_at IS NULL?

Every public active-record path needs equivalent semantics, but centralizing the predicate in repository methods, views, or carefully governed ORM scopes reduces repetition. Keep integration tests for raw SQL and bypass paths because abstraction can be escaped.

### Can a partial unique index support email reuse after deletion?

Yes. In PostgreSQL, a unique index with \`WHERE deleted_at IS NULL\` enforces uniqueness only among active rows. Test case normalization, tenant scope, reuse, and restore collisions against the real database.

### What should GET by ID return for a soft-deleted record?

Public APIs commonly return the same not-found response used for an unknown ID, while authorized recovery APIs expose tombstone metadata. Define this deliberately and prevent client flags from bypassing authorization.

### Where should a soft-delete predicate go in a left join?

Put the child predicate in the \`ON\` clause when the parent should remain and the deleted relation should become null. Putting it in \`WHERE\` removes rows without an active child. Test the domain behavior rather than applying one rule mechanically.

### How do we test eventual removal from a search index?

Index a unique marker, delete it through the supported workflow, and poll until a documented deadline. Assert both search and direct cache-backed lookup, and capture event identifiers so a timeout reveals which propagation stage failed.
`,
};
