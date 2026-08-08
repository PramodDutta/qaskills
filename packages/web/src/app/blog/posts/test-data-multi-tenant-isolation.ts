import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Data Multi Tenant Isolation: A Practical Verification Guide',
  description: 'Master test data multi tenant isolation with runnable database, API, concurrency, and cleanup checks that expose cross-tenant leaks before release.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Test Data Multi Tenant Isolation: A Practical Verification Guide

Test data multi tenant isolation means proving that a request, query, background job, cache lookup, export, and cleanup operation can only affect the tenant selected by the authenticated security context. The strongest tests do not merely assert that tenant A can read tenant A's rows. They deliberately create identical identifiers and misleading data across tenants, attempt access through every supported channel, and verify both the response and the database state.

For a reliable suite, test isolation at three boundaries: the database policy, the service or repository query, and the public API. Add concurrency and asynchronous work because many serious leaks occur after the synchronous controller has returned. Treat tenant identity as untrusted input, make the authenticated identity authoritative, and fail the test if a forbidden row is returned, modified, counted, cached, exported, or left behind by cleanup.

## Define the isolation contract before writing fixtures

A multi-tenant test becomes precise when it names the protected resource, the trusted tenant source, and the forbidden observation. "Users cannot see other tenants" is too vague. Does a 404 hide resource existence, or does the API return 403? Can aggregate counts reveal that another tenant has records? Can support administrators cross boundaries? Does a worker inherit tenant context from a signed job envelope or from a mutable database row?

Write a small contract for each access path. The contract should distinguish confidentiality, integrity, and operational isolation. Confidentiality means tenant A cannot observe tenant B's data. Integrity means A cannot create, update, or delete B's data. Operational isolation means A cannot poison B's cache, consume B's rate limit, or make B's scheduled job operate on A's rows.

| Surface | Trusted tenant source | Adversarial action | Required evidence |
|---|---|---|---|
| REST request | Verified token claim | Send another tenant in path or body | No foreign row in response or mutation |
| SQL transaction | Session-local database setting | Omit or replace tenant predicate | Row policy denies visibility or write |
| Background job | Signed or server-created job payload | Replay job with altered tenant ID | Worker rejects job and state stays unchanged |
| Cache | Server-derived namespace | Request same resource ID in two tenants | Separate values and separate invalidation |
| Export | Authorized tenant context | Guess another export ID | No download, metadata, size, or timing disclosure |
| Cleanup | Fixture ownership tag | Run one suite beside another | Only owned rows are removed |

Decide expected status codes early. A 404 is often useful for object-level reads because it avoids confirming that a foreign identifier exists. A 403 may be clearer for an explicitly tenant-scoped administration route. Both can be correct, but the test must assert the chosen policy consistently. Avoid accepting either status with an "OR" assertion, since that turns a contract into an ambiguity.

## Build collision-rich fixtures, not tidy sample data

Isolation bugs hide when every fixture has globally unique and visually distinct values. Create a tenant pair whose rows deliberately collide on natural identifiers. Both tenants should have a project named \`launch\`, a customer email of \`sam@example.test\`, and an invoice number \`INV-100\`. Use separate database primary keys where the schema requires them, but repeat every identifier a client might send.

The following fixture factory requires the tenant ID explicitly and stamps a unique run ID for cleanup. It does not read tenant context from a global variable, so parallel tests cannot silently borrow one another's identity.

\`\`\`ts
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';

type TenantFixture = {
  tenantId: string;
  projectId: string;
  runId: string;
};

export async function createTenantFixture(
  db: PoolClient,
  tenantId: string,
  runId = randomUUID(),
): Promise<TenantFixture> {
  const projectId = randomUUID();
  await db.query(
    \`INSERT INTO projects (id, tenant_id, slug, display_name, test_run_id)
     VALUES ($1, $2, $3, $4, $5)\`,
    [projectId, tenantId, 'launch', 'Shared-looking project', runId],
  );
  return { tenantId, projectId, runId };
}
\`\`\`

This design makes ownership visible in failure output. Keep tenant IDs opaque and generated for the run. Hard-coded names such as \`tenant-1\` are easy to collide with another process, while process-global counters can restart in separate workers. A UUID or database-generated identifier is safer.

Create at least three fixture roles. The actor tenant owns the authenticated request. The victim tenant owns the target row. A control tenant proves that a negative result was not caused by an empty table or broken endpoint. For list and aggregate tests, seed different record counts so a leaked total is obvious. The numbers are illustrative, not production expectations.

| Fixture role | Projects | Distinguishing secret | Purpose |
|---|---:|---|---|
| Actor tenant | 2 | \`ACTOR_ONLY\` | Expected visible data |
| Victim tenant | 3 | \`VICTIM_CANARY\` | Detect direct or aggregate leakage |
| Control tenant | 1 | \`CONTROL_CANARY\` | Prove filtering handles more than two tenants |

Secrets such as \`VICTIM_CANARY\` should appear in names, JSON payloads, and search-indexed text only inside a disposable test environment. Assert that the complete serialized response does not contain them. That catches leaks nested below an unexpected field, although it should supplement field-level assertions rather than replace them.

## Enforce tenant context at the PostgreSQL boundary

Application predicates are necessary in many systems, but PostgreSQL row-level security can provide a second enforcement layer. A common pattern places the tenant identifier in a transaction-local setting and references it from a policy. Transaction-local scope matters with pooled connections because a session-level value can survive after a client is returned to the pool.

\`\`\`sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

CREATE POLICY projects_tenant_policy ON projects
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
\`\`\`

\`USING\` controls which existing rows are visible for reading and modification. \`WITH CHECK\` controls which new row values may be created by inserts or updates. Testing only reads misses an update that changes \`tenant_id\` or an insert that smuggles a foreign tenant ID. Also remember that table owners and roles with bypass privileges can avoid row security. Run policy tests through the same restricted database role used by the application, not through a migration owner.

Wrap context assignment and work in one transaction. Parameter binding is essential even for a UUID that originated in an authenticated token.

\`\`\`ts
import type { Pool, PoolClient } from 'pg';

export async function inTenantTransaction<T>(
  pool: Pool,
  tenantId: string,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
\`\`\`

The third argument to \`set_config\` is \`true\`, which makes the value local to the current transaction. Verify the behavior rather than trusting the wrapper. A useful database test creates an actor row and a victim row through a privileged fixture connection, then queries through the restricted application role under actor context.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { appPool, fixturePool } from './database';
import { inTenantTransaction } from './tenant-transaction';

describe('projects row security', () => {
  it('hides a colliding slug owned by another tenant', async () => {
    const actorTenant = '11111111-1111-4111-8111-111111111111';
    const victimTenant = '22222222-2222-4222-8222-222222222222';
    await fixturePool.query(
      \`INSERT INTO projects (id, tenant_id, slug, display_name)
       VALUES
       ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', $1, 'launch', 'ACTOR_ONLY'),
       ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', $2, 'launch', 'VICTIM_CANARY')\`,
      [actorTenant, victimTenant],
    );

    const rows = await inTenantTransaction(appPool, actorTenant, async (db) => {
      const result = await db.query(
        'SELECT display_name FROM projects WHERE slug = $1 ORDER BY display_name',
        ['launch'],
      );
      return result.rows;
    });

    expect(rows).toEqual([{ display_name: 'ACTOR_ONLY' }]);
  });
});
\`\`\`

For transaction behavior beyond tenant filtering, see [database transaction isolation levels](/blog/database-testing-transaction-isolation-levels). Row security answers "which rows," while transaction isolation answers "which committed version and concurrent effects." They solve different failure classes and deserve separate tests.

## Exercise every object-level API operation

API tests should attempt foreign reads, updates, deletes, relationship changes, and bulk operations. Build requests with a token for the actor tenant and an object ID from the victim tenant. Never generate a victim token for the attacking request, since that accidentally converts the test into an authorized access check.

This Supertest example verifies both the outward response and the persisted state. The unchanged database assertion is what catches handlers that mutate first and reject later.

\`\`\`ts
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { pool } from '../src/database';
import { tokenForTenant } from './support/auth';

describe('PATCH /projects/:id tenant boundary', () => {
  it('does not modify a victim project', async () => {
    const actorTenantId = '11111111-1111-4111-8111-111111111111';
    const victimProjectId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const token = await tokenForTenant(actorTenantId);

    await request(app)
      .patch(\`/projects/\${victimProjectId}\`)
      .set('Authorization', \`Bearer \${token}\`)
      .send({ displayName: 'TAKEN_OVER' })
      .expect(404);

    const result = await pool.query(
      'SELECT display_name FROM projects WHERE id = $1',
      [victimProjectId],
    );
    expect(result.rows[0].display_name).toBe('VICTIM_CANARY');
  });
});
\`\`\`

The same matrix should cover nested routes such as \`/projects/:projectId/members/:memberId\`. A common defect scopes the parent but fetches the child by its global ID. Use a valid actor parent with a victim child ID. Test relationship endpoints too: attaching a victim document to an actor project may expose the document later even if direct reads are protected.

| Operation | Attack input | Response assertion | State assertion |
|---|---|---|---|
| Get by ID | Victim object ID | 404 and no victim fields | None required |
| Update | Victim ID with valid patch | 404 | Victim row unchanged |
| Delete | Victim ID | 404 | Victim row still exists |
| Create | Body contains victim tenant ID | Created under actor or rejected | No row under victim |
| Bulk update | Mixed actor and victim IDs | Entire request rejected or only actor changed, per contract | Victim rows unchanged |
| Add relation | Actor parent, victim child | Rejected | Join table has no cross-tenant edge |

For a broader setup of app lifecycle, authentication helpers, and response assertions, use the [Supertest Node API testing guide](/blog/supertest-node-api-testing-complete-guide). Keep the tenant attack matrix as its own suite so a normal endpoint happy path cannot substitute for security evidence.

## Test list, search, count, and pagination leaks

Object routes receive most attention, but collection endpoints leak through totals, facets, autocomplete, and cursors. A query can filter returned rows while computing \`totalCount\` from an unscoped subquery. Search may use a separate index whose documents lack tenant metadata. Cursor tokens can encode a foreign row ID that the next-page query trusts.

Make the response internally auditable. Assert every returned row's ownership when the API exposes it in tests, the exact expected actor IDs, the total count, facet counts, and absence of the victim canary in the serialized body. If production intentionally omits \`tenantId\`, expose ownership only through a database assertion or a test-only inspection helper that is unavailable in deployed builds.

\`\`\`ts
import request from 'supertest';
import { expect, it } from 'vitest';
import { app } from '../src/app';
import { tokenForTenant } from './support/auth';
import { actorProjectIds, actorTenantId } from './support/tenant-fixtures';

it('scopes results, total, and facets to the authenticated tenant', async () => {
  const response = await request(app)
    .get('/projects?query=launch&limit=20')
    .set('Authorization', \`Bearer \${await tokenForTenant(actorTenantId)}\`)
    .expect(200);

  expect(response.body.items.map((item: { id: string }) => item.id).sort())
    .toEqual([...actorProjectIds].sort());
  expect(response.body.total).toBe(2);
  expect(response.body.facets.status).toEqual({ active: 1, archived: 1 });
  expect(JSON.stringify(response.body)).not.toContain('VICTIM_CANARY');
});
\`\`\`

Pagination tests need more than page one. Seed actor and victim rows with interleaved timestamps, request a page of one, follow every cursor, and collect all IDs. The final set must equal exactly the actor set. This detects a cursor implementation that applies tenant filtering only to the initial query.

## Attack tenant selectors and identity precedence

Many applications accept tenant information in multiple places: token claims, hostname, path, header, query, and JSON body. The test must prove which source wins. For a normal tenant user, the server-verified authentication context should generally be authoritative. A client-supplied field can narrow a request but must not widen access.

Use a precedence matrix rather than testing one spoofed header. Send actor authentication while placing the victim ID in every other supported or historically supported location.

\`\`\`ts
import request from 'supertest';
import { expect, it } from 'vitest';
import { app } from '../src/app';
import { pool } from '../src/database';
import { tokenForTenant } from './support/auth';
import { actorTenantId, victimTenantId } from './support/tenant-fixtures';

const spoofCases = [
  { name: 'header', path: '/projects', header: victimTenantId, body: {} },
  { name: 'body', path: '/projects', body: { tenantId: victimTenantId } },
  { name: 'path', path: \`/tenants/\${victimTenantId}/projects\`, body: {} },
];

for (const testCase of spoofCases) {
  it(\`does not trust tenant from \${testCase.name}\`, async () => {
    const call = request(app)
      .post(testCase.path)
      .set('Authorization', \`Bearer \${await tokenForTenant(actorTenantId)}\`)
      .send({ ...testCase.body, name: 'Boundary check' });

    if (testCase.header) call.set('X-Tenant-Id', testCase.header);
    const response = await call;
    expect([201, 403, 404]).toContain(response.status);

    const foreign = await pool.query(
      'SELECT count(*)::int AS count FROM projects WHERE tenant_id = $1 AND name = $2',
      [victimTenantId, 'Boundary check'],
    );
    expect(foreign.rows[0].count).toBe(0);
  });
}
\`\`\`

Here the status set reflects multiple explicitly allowed API designs, but the invariant is exact: no victim row can be created. In a real suite, narrow the response assertion to the contract for each route. The important distinction is that a test matrix may contain different expected statuses, while one request should not accept vague behavior without documentation.

## Prove cache keys and invalidation are tenant-aware

A correctly scoped database query can still return another tenant's cached object. The classic failure uses \`project:{id}\` as a cache key when IDs are only unique within a tenant, or caches a slug lookup as \`project:launch\`. Another variant includes tenant ID on reads but invalidates only by object ID, causing stale or cross-tenant behavior after updates.

Test cache isolation by warming the cache with the victim response, then requesting the colliding actor resource. Reverse the order in a second test because some bugs depend on first writer. Update the actor resource and prove the victim value remains unchanged. Delete the actor resource and prove the victim cache entry still resolves.

A safe key function is pure and easy to unit test:

\`\`\`ts
import { expect, it } from 'vitest';

export function projectCacheKey(tenantId: string, projectId: string): string {
  if (!tenantId || !projectId) throw new Error('tenantId and projectId are required');
  return \`tenant:\${tenantId}:project:\${projectId}\`;
}

it('separates identical project IDs by tenant', () => {
  const sharedId = 'project-42';
  expect(projectCacheKey('tenant-a', sharedId))
    .not.toBe(projectCacheKey('tenant-b', sharedId));
});
\`\`\`

Do not rely only on this unit test. An integration test is needed to show that every call site uses the function and that invalidation publishes the same namespaced key.

## Carry isolation through queues, exports, and webhooks

Asynchronous paths often reconstruct context outside the original request. A job that contains only \`projectId\` may query through a privileged worker connection and lose the tenant boundary entirely. Include tenant ID and resource ID in a server-created job envelope, then verify ownership again when the worker starts. Do not treat queue contents as trusted merely because clients cannot publish directly.

Test four cases: a valid job, a resource moved or deleted before execution, an altered tenant ID, and a replay after authorization changed. Assert the external side effect, such as an email recipient or webhook target, not just job completion. For exports, verify downloaded rows, filename metadata, object-store key prefix, signed URL authorization, and audit log ownership.

An AI coding agent can help expand a declared matrix into tests, but give it invariants and forbidden observations. Review generated fixtures for accidental authorization, global state, and cleanup that is broader than the test owns. Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when you want a reusable workflow, but the repository's actual tenant contract remains the source of truth.

## Run concurrency tests against pooled connections

Connection pooling creates a dangerous test case: request A sets tenant context, releases a client, and request B receives the same connection. If context was session-scoped or cleanup failed on an exception, B can inherit A's tenant. Sequential endpoint tests may never reveal this.

Run two tenants concurrently across more iterations than the pool size, mix success and forced-error requests, and verify each response contains only its canary. Keep the iteration count modest in normal CI and schedule a longer soak separately. The following example uses an illustrative 40 requests per tenant.

\`\`\`ts
import request from 'supertest';
import { expect, it } from 'vitest';
import { app } from '../src/app';
import { tokenForTenant } from './support/auth';
import { actorTenantId, victimTenantId } from './support/tenant-fixtures';

it('does not bleed tenant context across pooled connections', async () => {
  const issueRequests = async (tenantId: string, expected: string, forbidden: string) => {
    const token = await tokenForTenant(tenantId);
    const responses = await Promise.all(
      Array.from({ length: 40 }, () =>
        request(app).get('/projects').set('Authorization', \`Bearer \${token}\`),
      ),
    );

    for (const response of responses) {
      expect(response.status).toBe(200);
      const encoded = JSON.stringify(response.body);
      expect(encoded).toContain(expected);
      expect(encoded).not.toContain(forbidden);
    }
  };

  await Promise.all([
    issueRequests(actorTenantId, 'ACTOR_ONLY', 'VICTIM_CANARY'),
    issueRequests(victimTenantId, 'VICTIM_CANARY', 'ACTOR_ONLY'),
  ]);
});
\`\`\`

If this fails intermittently, log a request correlation ID, authenticated tenant ID, database backend process ID, transaction state, and the tenant setting observed inside the transaction. Do not log customer content or bearer tokens. A pattern where the wrong canary follows one backend process strongly suggests leaked connection state. A pattern tied to one application instance may indicate process-global context rather than database pooling.

## Isolate cleanup just as strictly as production queries

Test cleanup can itself violate tenant isolation. \`DELETE FROM projects\` in an \`afterEach\` hook breaks parallel suites and can make a leaking test pass by erasing evidence before it is inspected. Transaction rollback is excellent for tests that stay on one connection, but it does not contain HTTP handlers or workers that use other connections.

Prefer ownership tags such as \`test_run_id\`, unique tenants per test, and foreign-key cascades rooted at the disposable tenant. Cleanup must filter on the exact run ID. Record created IDs when a schema cannot carry a run tag. Never derive cleanup scope from an eventually consistent list endpoint.

| Cleanup strategy | Works across connections | Parallel-safe | Main limitation |
|---|:---:|:---:|---|
| Single transaction rollback | No | Yes | HTTP and worker connections escape it |
| Delete by unique tenant ID | Yes | Yes | Requires disposable tenant creation |
| Delete by test run tag | Yes | Yes | Tag must propagate to every owned row |
| Truncate shared tables | Yes | No | Destroys other suites' evidence |
| Restore database snapshot | Yes | Only with isolated database | Higher setup cost |

After cleanup, assert that the actor's owned fixtures are gone and the victim control row remains. That final assertion turns cleanup from housekeeping into an isolation test.

## Diagnose a realistic cross-tenant failure

Suppose a test intermittently receives \`VICTIM_CANARY\` from \`GET /projects/launch\` after the victim request ran first. Direct SQL under actor context returns only actor data. Disabling the cache makes the failure disappear. This evidence points away from row security and toward the caching layer.

Inspect the cache key and find \`project:launch\`. The slug is unique only within a tenant, so the victim's first response populates a shared key. Fix the key to include the authenticated tenant ID, update invalidation to use the same function, and add both warm-order permutations. Flush the test cache once to remove old-format keys, but do not make flushing part of each assertion because it would hide the original defect.

Another failure looks similar but has a different signature: wrong results correlate with a reused database backend after an exception. Here the cache is innocent. The transaction wrapper used a session-level setting and did not reset it. Switching to transaction-local context, guaranteeing rollback, and forbidding repository calls outside the wrapper addresses the root cause.

The diagnostic lesson is to observe layers independently. Compare the public response, cache hit or miss, restricted-role SQL result, and final stored rows. A single 404 assertion cannot tell you where isolation was enforced or whether an unauthorized side effect already happened.

## What people get wrong about negative isolation tests

The most common mistake is treating "no rows returned" as proof of isolation. An empty result can come from a misspelled fixture, a rolled-back seed transaction, a broken route, or an authentication failure before the vulnerable query. Always include a positive control: the actor can retrieve its colliding row in the same setup, while the victim row is known to exist through a privileged verification connection.

Teams also overuse random data. Randomness prevents collisions, yet collisions are exactly what expose missing compound keys and unscoped lookups. Deliberately repeat slugs, emails, external IDs, and timestamps across tenants. Randomize only the isolation namespace, such as tenant and run IDs.

Finally, do not equate row-level security with complete tenant isolation. RLS does not automatically namespace caches, search indexes, object storage, logs, metrics, queue messages, or third-party webhooks. The verification plan must follow data wherever it moves.

## A release gate for tenant isolation

Make the suite actionable in CI. A fast gate should cover restricted-role database policies, CRUD attack cases, collection counts, identity precedence, and cache collisions. A second integration stage can run queue workers, exports, and concurrent pool reuse. A scheduled environment test can inspect search indexes and object storage where provisioning is slower.

Store a machine-readable attack matrix beside the tests if an AI agent helps maintain coverage. Each entry should name route, actor role, victim resource, expected response, and forbidden state change. Require review when a new tenant-scoped table, endpoint, cache, or job is introduced. The strongest signal is not raw test count. It is complete coverage of every path that can select, transform, or disclose tenant-owned data.

## Frequently Asked Questions

### Should every multi-tenant isolation test use row-level security?

No. Row-level security is a strong database defense when the architecture supports it, but the tests should reflect the actual enforcement model. A service that uses mandatory tenant predicates still needs direct repository and API verification. Even with row-level security, test the restricted application role, transaction-local context, inserts, updates, and privileged worker paths. Caches, queues, search indexes, and object storage remain outside the policy and need separate isolation checks.

### Is a 404 always better than a 403 for a foreign tenant resource?

Not always. A 404 is useful when the product wants to conceal whether a foreign object exists. A 403 can be appropriate when the caller is allowed to know the resource or tenant exists but lacks a particular action. Choose one behavior for each route and assert it exactly. Regardless of status, also verify that no foreign state changed and that the response body, headers, timing metadata, and audit events do not disclose protected details.

### How can tenant isolation tests run safely in parallel?

Give every test or worker a unique tenant and test-run identifier, avoid process-global tenant state, and clean up only rows carrying that ownership. Use transaction-local database context on pooled connections. Do not truncate shared tables or depend on sequential test ordering. Deliberately keep resource slugs and natural keys identical across tenants, since the unique tenant namespace prevents suite collisions while the repeated business identifiers continue to exercise isolation boundaries.

### What is the smallest useful multi-tenant regression suite?

Start with one actor tenant, one victim tenant, and colliding resources. Prove an actor can read its own row, cannot read or mutate the victim row, cannot create under the victim tenant through spoofed input, and receives correctly scoped list totals. Add one cache warm-order test and one pooled-connection concurrency test. This compact suite catches common missing predicates, identity-precedence bugs, shared cache keys, and leaked session context, then expand it for queues, exports, and search.
`,
};
