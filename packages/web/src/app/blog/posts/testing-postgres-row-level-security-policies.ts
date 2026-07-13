import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing PostgreSQL Row-Level Security Policies',
  description:
    'Test PostgreSQL row-level security policies with real tenant roles, USING and WITH CHECK cases, policy combinations, bypass detection, and transaction isolation.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Testing PostgreSQL Row-Level Security Policies

One query returning zero rows is not proof of tenant isolation. It may mean the fixture is empty, the application forgot to set its tenant context, a normal privilege denied access before the policy mattered, or the test connected as the table owner and bypassed row-level security entirely. PostgreSQL RLS tests must establish who the session is, which policy applies, what rows exist outside that identity, and whether both reads and proposed writes are constrained.

The strongest approach treats policies as executable authorization rules. Build fixtures for at least two tenants, run statements through the same database role and session context as the application, assert allowed and forbidden outcomes for every command, and add metadata checks that catch disabled RLS or accidental bypass. This article uses PostgreSQL itself plus node-postgres and Jest, without mocking the database boundary.

## Start with a policy whose identity source is explicit

A common multi-tenant design stores a tenant UUID on every protected row and places the request's tenant UUID in a transaction-local custom setting. The policy reads that setting:

\`\`\`sql
CREATE TABLE documents (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

CREATE POLICY documents_tenant_select
  ON documents
  FOR SELECT
  TO app_user
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
  );

CREATE POLICY documents_tenant_insert
  ON documents
  FOR INSERT
  TO app_user
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
  );

CREATE POLICY documents_tenant_update
  ON documents
  FOR UPDATE
  TO app_user
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
  );

CREATE POLICY documents_tenant_delete
  ON documents
  FOR DELETE
  TO app_user
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO app_user;
\`\`\`

\`USING\` controls which existing rows are visible for a command. \`WITH CHECK\` validates the proposed new row for INSERT and UPDATE. They answer different questions. An UPDATE policy needs both when a tenant may edit its own row but must not change \`tenant_id\` to move that row elsewhere.

Passing \`true\` as the second argument to \`current_setting\` returns null when the custom setting is absent rather than throwing. The comparison then does not evaluate to true, producing default denial for this policy expression. Some teams prefer an error for missing context because it exposes integration mistakes earlier. That is a product decision, and tests should lock in the chosen behavior.

## Understand the gates around an RLS policy

RLS augments PostgreSQL privileges; it does not replace them. A statement must pass normal \`GRANT\` checks and the applicable policies. Several roles bypass policies, which can make a green test meaningless.

| Session property | RLS behavior | Testing concern |
|---|---|---|
| Superuser | Always bypasses | Never use for behavioral policy assertions |
| Role with \`BYPASSRLS\` | Bypasses every policy | Migration/admin role must be separate from app role |
| Table owner | Normally bypasses | \`FORCE ROW LEVEL SECURITY\` subjects owner in ordinary cases |
| Ordinary granted role | Policies apply when enabled | Preferred application test identity |
| No applicable policy | Default deny | Can look like correct isolation while policy is missing |
| RLS disabled on table | Policies ignored | Metadata assertion must catch this |

\`FORCE ROW LEVEL SECURITY\` is valuable defense in depth, but it does not make superuser testing representative. Provision with an administrative connection, then run behavior with \`app_user\` or a role that assumes it through a controlled \`SET ROLE\`.

PostgreSQL exposes \`row_security_active('documents')\`, which reports whether row security is active for the current user and environment. Put that assertion near the beginning of the integration suite.

## Seed cross-tenant rows through a privileged fixture path

The test needs rows it is forbidden to see. Seed them with a setup role, not with the application role under test. Use fixed UUIDs so failures are readable, and clean them in a transaction or isolated schema/database.

\`\`\`typescript
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';

const tenantA = '11111111-1111-4111-8111-111111111111';
const tenantB = '22222222-2222-4222-8222-222222222222';
const documentA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const documentB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const admin = new Client({ connectionString: process.env.TEST_DATABASE_ADMIN_URL });
const app = new Client({ connectionString: process.env.TEST_DATABASE_APP_URL });

beforeAll(async () => {
  await admin.connect();
  await app.connect();
  await admin.query(
    \`INSERT INTO documents (id, tenant_id, title, body)
     VALUES ($1, $2, 'Tenant A plan', 'alpha'),
            ($3, $4, 'Tenant B plan', 'beta')\`,
    [documentA, tenantA, documentB, tenantB],
  );
});

afterAll(async () => {
  await admin.query('DELETE FROM documents WHERE id = ANY($1::uuid[])', [
    [documentA, documentB],
  ]);
  await Promise.all([admin.end(), app.end()]);
});

describe('documents RLS', () => {
  test('tenant A sees only its document', async () => {
    await app.query('BEGIN');
    try {
      await app.query(\`SELECT set_config('app.tenant_id', $1, true)\`, [tenantA]);

      const active = await app.query(
        \`SELECT row_security_active('documents') AS active\`,
      );
      expect(active.rows[0].active).toBe(true);

      const result = await app.query(
        'SELECT id, tenant_id, title FROM documents ORDER BY id',
      );
      expect(result.rows).toEqual([
        { id: documentA, tenant_id: tenantA, title: 'Tenant A plan' },
      ]);
    } finally {
      await app.query('ROLLBACK');
    }
  });
});
\`\`\`

The same checked-out client executes \`BEGIN\`, \`set_config\`, and the SELECT. node-postgres transactions are scoped to a single client, so replacing this with unrelated \`pool.query\` calls could set the tenant on one connection and read on another.

\`set_config(..., true)\` makes the value transaction-local. Rollback removes it, preventing tenant A's context from leaking into tenant B's case on a pooled connection. The test is not relying on cleanup by good luck; it models the application transaction boundary.

## Test reads with positive and negative controls

A tenant-visible count of one is meaningful only when setup proves two candidate rows exist. Query the admin connection to validate fixture cardinality, then the app connection to validate filtering.

Your SELECT matrix should include:

| Case | Expected result | Defect caught |
|---|---|---|
| Tenant A requests all documents | Only A rows | Missing tenant predicate |
| Tenant A filters directly by B document ID | Zero rows | Direct-object reference leak |
| Tenant B requests all documents | Only B rows | Hard-coded or stale tenant context |
| No tenant context | Empty set or defined error | Fail-open missing context |
| Invalid tenant setting | Defined cast/configuration error | Ambiguous identity parsing |
| Authorized tenant with ordinary WHERE filters | Correct subset within tenant | Policy interaction with query predicates |

Direct ID lookup deserves its own assertion. Applications often expose \`/documents/:id\`, and developers may assume an ID is unguessable. RLS should suppress the foreign row even with an exact primary-key predicate.

\`\`\`typescript
async function withTenant<T>(
  client: Client,
  tenantId: string,
  work: () => Promise<T>,
): Promise<T> {
  await client.query('BEGIN');
  try {
    await client.query(\`SELECT set_config('app.tenant_id', $1, true)\`, [
      tenantId,
    ]);
    const value = await work();
    await client.query('ROLLBACK');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

test('tenant A cannot select tenant B by primary key', async () => {
  await withTenant(app, tenantA, async () => {
    const result = await app.query(
      'SELECT id FROM documents WHERE id = $1',
      [documentB],
    );
    expect(result.rowCount).toBe(0);
  });
});
\`\`\`

Returning not found at the application layer can intentionally avoid revealing whether a foreign row exists. At the SQL layer, zero rows is the policy behavior to assert.

## Exercise WITH CHECK on inserts and tenant moves

Read isolation is only half the policy. An attacker may try to create a row owned by another tenant or update an allowed row so its ownership changes.

\`\`\`typescript
test('tenant A cannot insert a document assigned to tenant B', async () => {
  await app.query('BEGIN');
  try {
    await app.query(\`SELECT set_config('app.tenant_id', $1, true)\`, [tenantA]);

    await expect(
      app.query(
        \`INSERT INTO documents (id, tenant_id, title, body)
         VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', $1, 'Injected', 'x')\`,
        [tenantB],
      ),
    ).rejects.toMatchObject({ code: '42501' });
  } finally {
    await app.query('ROLLBACK');
  }
});

test('tenant A cannot transfer its document to tenant B', async () => {
  await app.query('BEGIN');
  try {
    await app.query(\`SELECT set_config('app.tenant_id', $1, true)\`, [tenantA]);

    await expect(
      app.query('UPDATE documents SET tenant_id = $1 WHERE id = $2', [
        tenantB,
        documentA,
      ]),
    ).rejects.toMatchObject({ code: '42501' });
  } finally {
    await app.query('ROLLBACK');
  }
});
\`\`\`

PostgreSQL uses SQLSTATE \`42501\` for insufficient privilege, including row-security policy violations in these checks. Prefer the code over localized message text. After a rejected statement, the transaction is aborted, so do not issue verification queries on the same transaction before rollback. Use the admin connection afterward if you need to prove no row changed.

Also assert allowed writes. A suite containing only denials can pass because \`GRANT INSERT\` is missing or every policy denies everything.

## UPDATE has two policy perspectives

For UPDATE, \`USING\` determines which existing rows the role may target. \`WITH CHECK\` determines whether the new row values are acceptable. The difference yields three valuable tests:

1. Updating a permitted field on an owned row succeeds.
2. Updating a foreign row affects zero rows because it is invisible to the UPDATE.
3. Changing an owned row's tenant fails the new-row check.

Do not expect the foreign-row update necessarily to throw. If \`USING\` filters the row out, PostgreSQL reports an update count of zero. That behavior is often desirable because it does not reveal existence. A failed \`WITH CHECK\` on a visible row does raise an error.

DELETE uses visibility through \`USING\`. Test one owned deletion inside a rolled-back transaction and one foreign deletion that returns zero. Rollback-based cases preserve shared fixtures while executing the real command.

## Verify permissive and restrictive policy combinations

Multiple policies are not simply evaluated in file order. Permissive policies, the default, combine with OR. Restrictive policies combine with AND, and at least one applicable permissive policy must allow the row.

Consider a support workflow:

\`\`\`sql
CREATE POLICY documents_tenant_access
  ON documents
  AS PERMISSIVE
  FOR SELECT
  TO app_user
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY documents_not_quarantined
  ON documents
  AS RESTRICTIVE
  FOR SELECT
  TO app_user
  USING (NOT is_quarantined);
\`\`\`

An owned quarantined document is denied because it passes the permissive tenant policy but fails the restrictive policy. A foreign ordinary document is denied because it fails the permissive policy. Your fixture matrix must cover each truth-table corner:

| Same tenant | Quarantined | Expected visibility |
|---:|---:|---:|
| Yes | No | Visible |
| Yes | Yes | Hidden |
| No | No | Hidden |
| No | Yes | Hidden |

If two tenant access policies are both permissive, a broad support policy may widen visibility through OR. That may be intentional, but test it with a support role and an ordinary app role separately. Policy names are documentation, not enforcement; the effective Boolean combination is what matters.

## Inspect policy metadata so default deny cannot fool you

Behavioral tests can pass for the wrong structural reason. Add schema assertions against stable catalog views such as \`pg_policies\` and table metadata:

\`\`\`sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'documents'
ORDER BY policyname;

SELECT
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'documents';
\`\`\`

Metadata snapshots can become noisy because PostgreSQL renders expressions. Prefer focused assertions: required policy names exist, command kinds are correct, expected roles are included, and both RLS flags are true. Migration review should catch expression changes, while behavior tests prove the resulting truth table.

An especially useful guard enumerates every table containing \`tenant_id\` and fails if RLS is not enabled, subject to an explicit allowlist. That catches newly added tenant tables before endpoint tests exist.

## Connection pooling and prepared-plan hazards

Session identity must not survive checkout boundaries. Set custom variables transaction-locally and always end the transaction. A session-level \`SET app.tenant_id\` can leak tenant A into a later request using the same pool connection. A test should simulate sequential requests on one checked-out connection to prove cleanup.

Role switching and prepared statements have historically intersected with security defects, so run a supported PostgreSQL minor version and include tests that reuse the application's real query path across different tenant contexts. The sequence should prepare or execute for tenant A, end its transaction, set tenant B, and execute again. Tenant B must never receive A's cached result or policy context.

Do not disable prepared statements solely from fear. Patch supported versions, test the real connection behavior, and monitor PostgreSQL security advisories.

## Views, functions, and alternate paths around the table

Direct table tests are necessary but not sufficient when the application reads through views or functions. Security-definer functions can intentionally or accidentally run with elevated privileges. Views have security semantics that vary with their definition and PostgreSQL features. Test every public database interface used by the application with cross-tenant fixtures.

Include:

- Direct SELECT used by the repository layer.
- Views feeding exports or reports.
- Functions returning tenant records.
- Foreign-key and uniqueness errors that could reveal cross-tenant existence.
- Bulk updates and \`INSERT ... ON CONFLICT\`.
- Background-worker roles that legitimately span tenants.

Unique constraints and referential integrity checks can reveal that a value exists even when RLS hides its row. PostgreSQL preserves integrity by bypassing row security for those checks. Decide whether globally unique values are acceptable, or use tenant-scoped composite constraints. Test the application's error mapping so it does not expose sensitive foreign identifiers.

For the broader persistence strategy, use the [database testing automation guide](/blog/database-testing-automation-guide). When fixtures may resemble production records, the [test data privacy and masking guide](/blog/test-data-privacy-masking-guide) explains safe data controls.

## CI design for security-sensitive database tests

RLS suites should run against a real PostgreSQL version representative of production. Give migrations an admin connection and tests a separate application connection. Fail startup if both URLs resolve to a superuser or the same bypass-capable role.

Keep the suite deterministic:

| Practice | Reason |
|---|---|
| Per-worker database or schema | Prevent parallel fixture collisions |
| Fixed tenant IDs | Make leaks and failures recognizable |
| Transaction-local context | Eliminate pooled session carryover |
| Admin truth query | Prove forbidden rows really exist |
| Application-role behavior query | Exercise actual enforcement |
| Catalog guard | Detect disabled or missing configuration |
| Supported database patch level | Include security corrections |

Never log unrestricted row bodies when an isolation assertion fails. IDs and tenant labels designed for tests are usually enough. Security tests should not become a new data-exposure channel.

## Test the migration states around policy changes

Policy deployments can create a brief fail-open or fail-closed window when DDL is split across migrations. For example, creating a policy in one release and enabling RLS in another leaves the table unrestricted between them. Enabling RLS before any applicable policy invokes default deny and may interrupt the application.

Test migrations from the oldest supported production schema, not only a database created from the final schema. After every migration step that can be deployed independently, assert the intended RLS flags, application-role access, and policy inventory. If a transaction wraps the DDL, verify the migration tool actually keeps those statements in one transaction for your PostgreSQL setup.

Replacement policies need special care. Dropping the old policy before creating the new one can momentarily default-deny, while temporarily keeping both permissive policies can broaden access through OR. Prefer an atomic migration where possible, and add fixtures that distinguish the old and new predicates.

Rollback deserves an explicit decision. Security DDL may not be safely reversible after application data begins using the new ownership model. If rollback is supported, run the down migration and repeat cross-tenant tests. If it is intentionally forward-only, document the recovery migration and test that path in a disposable database.

Finally, verify the migration runner and application connections use different roles. A migration smoke test executed as owner can report success while the ordinary role lacks grants or sees a different effective policy set.

## Frequently Asked Questions

### Why does my RLS test pass when I accidentally removed a policy?

With RLS enabled and no applicable policy, PostgreSQL uses default deny. A negative-only test still sees zero rows. Add allowed-path assertions and verify required policies in \`pg_policies\`.

### Should the test connect as the table owner?

Prefer the actual application role. Table owners normally bypass RLS unless the table uses \`FORCE ROW LEVEL SECURITY\`, and superusers or \`BYPASSRLS\` roles bypass regardless.

### Why does an unauthorized UPDATE return zero rows instead of an error?

The \`USING\` expression can make the target row invisible, so no row is selected for update. A \`WITH CHECK\` failure on a visible row's proposed new values normally raises an error.

### How should tenant context be set with a connection pool?

Check out one client, begin a transaction, call \`set_config('app.tenant_id', value, true)\`, execute all request queries on that client, then commit or roll back before releasing it.

### Does row-level security prevent every cross-tenant information leak?

No. Constraints, timing, error messages, elevated functions, logs, and application endpoints can reveal information through other paths. RLS is a strong database boundary that still needs surrounding authorization and disclosure testing.
`,
};
