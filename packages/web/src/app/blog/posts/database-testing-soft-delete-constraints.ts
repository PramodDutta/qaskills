import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Database Testing Soft Delete Constraints: Prove Deleted Rows Stay Safe',
  description: 'Apply database testing soft delete constraints to catch uniqueness, restore, foreign-key, and retention bugs before production data drifts badly.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Database Testing Soft Delete Constraints: Prove Deleted Rows Stay Safe

Database testing soft delete constraints means proving that rows marked as deleted still obey the rules your product depends on. A soft delete is not only an \`UPDATE users SET deleted_at = now()\`. It changes uniqueness, foreign keys, restore behavior, search filters, retention jobs, audit history, and API semantics. If those rules live only in application code, they will eventually drift across services, background jobs, admin tools, and AI-generated migrations.

The useful testing strategy is to place invariant checks at the database boundary, then exercise the user-facing behavior through API and integration tests. For example, a deleted account might release its email address for reuse, but restoring that account should fail if another active account has claimed the email. A deleted project might hide from default queries, but its child audit events may need to remain immutable. Those are not UI details. They are data contracts.

This guide builds a practical workflow for QA and test-automation engineers: model the lifecycle, encode constraints where the database supports them, write migration tests, add API tests for delete and restore paths, and diagnose the failures that appear only after real production data accumulates. The API examples pair well with [Supertest Node API testing](/blog/supertest-node-api-testing-complete-guide), and the test layering choices fit the broader [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026).

## Start With The Row Lifecycle, Not The Delete Button

A soft-deleted row is usually active, deleted, maybe restored, and eventually purged or retained for audit. Each state has different rules. Teams get into trouble when they test only the transition from active to deleted, then assume the rest is obvious. The restore path is where many constraint bugs surface because the old row must rejoin the active data set.

| State | Example column values | Product expectation | Constraint or test concern |
|---|---|---|---|
| Active | \`deleted_at\` is null | Row appears in normal reads and can be updated | Unique rules apply among active rows |
| Deleted | \`deleted_at\` has timestamp | Row is hidden from ordinary reads | Child rows and audit history remain consistent |
| Restoring | Timestamp is being cleared | Row returns if active constraints still allow it | Restore must fail on uniqueness conflict |
| Purge candidate | Deleted before retention cutoff | Row may be physically removed | Foreign keys and audit needs decide purge order |
| Held for audit | Deleted but not purgeable | Row remains queryable by privileged paths | Access controls and retention jobs must respect hold |

Write these states as examples before picking implementation. "Soft delete users" is too broad. "An active user email must be unique among active users; deleting a user releases the email for a new user; restoring the old user fails if the email is now active elsewhere" is testable.

## Put Active-Row Uniqueness Where The Database Can Enforce It

The classic soft-delete bug is duplicate active records. A simple unique constraint on \`email\` prevents reuse after soft delete. Removing uniqueness allows two active users with the same email. The better design in databases that support it is a partial unique index over active rows. PostgreSQL documents partial indexes at https://www.postgresql.org/docs/current/indexes-partial.html.

\`\`\`sql
CREATE TABLE app_user (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  display_name text NOT NULL,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX app_user_active_email_unique
  ON app_user (lower(email))
  WHERE deleted_at IS NULL;
\`\`\`

That index says exactly what the product means: active email addresses are unique. Deleted rows remain in the table, but they do not block a new active row. If your database does not support partial unique indexes, do not pretend the same DDL is portable. Use the documented feature set of your database, such as generated columns, filtered indexes where available, or a separate active identity table. The test should still express the same invariant.

| Business rule | Weak implementation | Stronger database-backed implementation | Test case |
|---|---|---|---|
| Active emails are unique | App checks before insert | Partial unique index on normalized email where active | Insert second active email fails |
| Deleted emails can be reused | Drop unique constraint entirely | Same partial unique index | Insert active email after soft delete succeeds |
| Restore must respect current active data | App checks before update | Same index blocks clearing \`deleted_at\` | Restore old row after reuse fails |
| Email comparison is case-insensitive | Lowercase in one service | Index on normalized expression or stored normalized column | \`A@EXAMPLE.COM\` and \`a@example.com\` conflict |

What people get wrong: they write a single happy-path API test that deletes a user, creates another with the same email, and stops. That proves reuse. It does not prove active uniqueness, case handling, concurrent restore behavior, or direct database writes from another service.

## Write Constraint Tests That Execute Real SQL

Unit tests around repository methods are useful, but they cannot prove that the database constraint exists. Use a real database engine in integration tests for migration-sensitive behavior. In Node projects, that may mean Testcontainers, a local Docker service in CI, or a dedicated test database. The key is that the test executes the actual schema.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { db } from '../test/db';

describe('app_user soft delete uniqueness', () => {
  it('allows email reuse only after the first row is soft deleted', async () => {
    await db.query(
      'insert into app_user (id, email, display_name) values ($1, $2, $3)',
      ['11111111-1111-1111-1111-111111111111', 'sam@example.com', 'Sam One']
    );

    await expect(
      db.query(
        'insert into app_user (id, email, display_name) values ($1, $2, $3)',
        ['22222222-2222-2222-2222-222222222222', 'SAM@example.com', 'Sam Two']
      )
    ).rejects.toThrow();

    await db.query(
      'update app_user set deleted_at = now() where id = $1',
      ['11111111-1111-1111-1111-111111111111']
    );

    await expect(
      db.query(
        'insert into app_user (id, email, display_name) values ($1, $2, $3)',
        ['33333333-3333-3333-3333-333333333333', 'sam@example.com', 'Sam Three']
      )
    ).resolves.toBeDefined();
  });
});
\`\`\`

This test intentionally checks case-insensitive conflict before soft delete, then reuse after soft delete. It will fail if someone removes the partial index, changes normalization, or accidentally makes \`deleted_at\` non-null by default.

Add a restore conflict test because restore failures are often missed in CRUD suites.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { db } from '../test/db';

describe('app_user restore constraints', () => {
  it('blocks restoring a deleted row when another active row owns the email', async () => {
    await db.query(
      'insert into app_user (id, email, display_name, deleted_at) values ($1, $2, $3, now())',
      ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lee@example.com', 'Lee Old']
    );

    await db.query(
      'insert into app_user (id, email, display_name) values ($1, $2, $3)',
      ['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'lee@example.com', 'Lee New']
    );

    await expect(
      db.query(
        'update app_user set deleted_at = null where id = $1',
        ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']
      )
    ).rejects.toThrow();
  });
});
\`\`\`

Do not assert the exact database error text unless your driver and database version make it stable enough for your team. In most test suites, it is enough to assert rejection and then separately test that the API converts the database failure into a product-level error response.

## Test Query Filters Against Deleted Rows

Another common bug is forgetting \`deleted_at IS NULL\` in a read query. It may happen in a new endpoint, a reporting view, an autocomplete search, or an AI-generated repository method. Database constraints do not automatically hide deleted rows. You need tests around default scopes and privileged reads.

\`\`\`sql
CREATE VIEW active_project AS
SELECT id, account_id, name, created_at, updated_at
FROM project
WHERE deleted_at IS NULL;
\`\`\`

If your architecture supports database views, they can centralize the active-row filter. If not, use repository helpers and test them. Be careful with admin and audit features. They may intentionally include deleted rows, but that should be explicit in the method name, route, permission, and tests.

| Query type | Should include deleted rows? | Test fixture | Failure symptom |
|---|---:|---|---|
| Customer list endpoint | No | One active, one deleted customer | Deleted customer appears in UI |
| Admin audit lookup | Yes, if authorized | Deleted row with audit event | Support cannot investigate deletion |
| Search autocomplete | No | Deleted project matching search term | User selects unavailable entity |
| Foreign-key validation | Usually active only | Deleted parent id in request | New child attaches to deleted parent |
| Retention purge job | Yes, with cutoff | Old deleted and recent deleted rows | Recent data is purged too early |

A repository test can pin the default behavior:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { createProject, listActiveProjects, softDeleteProject } from './projectRepository';

describe('projectRepository active scope', () => {
  it('does not return soft-deleted projects from ordinary listing', async () => {
    const active = await createProject({ accountId: 'acct-1', name: 'Checkout Tests' });
    const deleted = await createProject({ accountId: 'acct-1', name: 'Legacy Tests' });

    await softDeleteProject(deleted.id);

    const projects = await listActiveProjects('acct-1');

    expect(projects.map((project) => project.id)).toContain(active.id);
    expect(projects.map((project) => project.id)).not.toContain(deleted.id);
  });
});
\`\`\`

This looks simple, but it catches high-impact regressions when a query is rewritten for performance and loses the active filter.

## Foreign Keys Need A Soft-Delete Policy Too

Foreign keys protect physical references, not product availability. If a parent row is soft deleted, the child row can still reference it because the parent still exists. That may be exactly what you want for invoices, audit events, or historical test runs. It may be wrong for new comments, active memberships, or queue jobs that should not attach to deleted records.

| Relationship | Possible policy | Database support | Test focus |
|---|---|---|---|
| Audit event -> deleted user | Keep reference | Ordinary foreign key | Deleted user remains available for audit lookup |
| Active membership -> account | Block new child if account deleted | Application transaction or trigger | Creating membership under deleted account fails |
| Project -> account | Soft delete children with parent | Transactional update or job | Children hidden after parent delete |
| Invoice -> customer | Preserve historical customer reference | Ordinary foreign key plus restricted purge | Purge job does not break invoice history |
| Invite -> team | Expire or delete when team deleted | Application logic or cascading job | Invite cannot be accepted after team deletion |

For constraints that cannot be expressed as ordinary foreign keys, write integration tests around the transaction boundary. If you use triggers, test the trigger with direct SQL. If you rely on application services, test the service and add a direct database test for the invariant the database still owns.

\`\`\`sql
CREATE TABLE account (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  deleted_at timestamptz NULL
);

CREATE TABLE membership (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES account(id),
  user_id uuid NOT NULL,
  deleted_at timestamptz NULL
);
\`\`\`

That schema says membership rows must reference existing account rows. It does not say new active memberships are forbidden for deleted accounts. If the product requires that rule, add an application transaction test or a database trigger depending on your architecture.

\`\`\`ts
import { expect, test } from 'vitest';
import { createMembership } from './membershipService';
import { insertAccount, softDeleteAccount } from '../test/fixtures';

test('active membership cannot be created under a deleted account', async () => {
  const account = await insertAccount({ name: 'Old Workspace' });
  await softDeleteAccount(account.id);

  await expect(
    createMembership({ accountId: account.id, userId: 'user-42' })
  ).rejects.toThrow('account is not active');
});
\`\`\`

The exact error message should be a product-level error, not a raw database exception. The database may still be the source of truth for uniqueness, but the service should translate failures into responses that clients can use.

## Exercise Delete And Restore Through The API

Database tests prove invariants. API tests prove that users encounter those invariants correctly. A delete endpoint should be idempotent if the product contract says repeated delete requests are safe. A restore endpoint should return a clear conflict when the database rejects the restore. A list endpoint should hide deleted rows by default.

\`\`\`ts
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { createUser, softDeletedUser } from './fixtures';

describe('user soft delete API', () => {
  it('hides deleted users and returns conflict on blocked restore', async () => {
    const oldUser = await softDeletedUser({ email: 'riley@example.com' });
    await createUser({ email: 'riley@example.com' });

    const restore = await request(app)
      .post('/admin/users/' + oldUser.id + '/restore')
      .expect(409);

    expect(restore.body.error.code).toBe('USER_EMAIL_ALREADY_ACTIVE');

    const list = await request(app)
      .get('/admin/users')
      .expect(200);

    expect(list.body.users.some((user: { id: string }) => user.id === oldUser.id)).toBe(false);
  });
});
\`\`\`

Use API tests to assert response codes, error envelopes, permissions, and filtering. Use database tests to assert direct invariants. Do not make API tests inspect internal index names unless you are testing an admin diagnostics endpoint. Users do not care that the index is called \`app_user_active_email_unique\`. They care that restore gives a clear conflict and no duplicate active account appears.

## Test Migrations With Production-Like Dirty Data

Soft-delete constraints are often added after a product already has data. The migration may fail because duplicate active rows already exist, deleted rows have impossible timestamps, or child rows reference records that the new policy considers unavailable. A migration test should include dirty but realistic data.

\`\`\`sql
INSERT INTO app_user (id, email, display_name, deleted_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'case@example.com', 'Case One', NULL),
  ('10000000-0000-0000-0000-000000000002', 'CASE@example.com', 'Case Two', NULL);

CREATE UNIQUE INDEX app_user_active_email_unique
  ON app_user (lower(email))
  WHERE deleted_at IS NULL;
\`\`\`

That migration should fail because two active rows conflict after normalization. The test should make the failure visible before deployment, then the migration plan should include a cleanup step or a product decision. Do not let the database surprise you during a production deploy.

| Dirty-data case | Migration risk | Test fixture |
|---|---|---|
| Duplicate active normalized emails | Unique index creation fails | Two active rows with case variation |
| Deleted row has null audit actor | New not-null audit policy fails | Deleted row from legacy path |
| Child references deleted parent | New active-parent policy fails | Active child under deleted account |
| Old deleted rows exceed retention | Purge job deletes too much at once | Mix of old and recent deleted rows |
| Restore token exists for deleted row | User can revive invalid state | Deleted row with active restore token |

Migration tests do not need the entire production database. They need curated examples that represent the messiest legal states your system may contain.

## Diagnose The Failure Where Restore Creates A Duplicate Active Row

A realistic failure mode: the app checks for active email conflicts before restore, finds none, then another request creates a new active row with the same email before the restore transaction commits. Without a database constraint, both succeed. The bug appears as duplicate active users, login ambiguity, or a support ticket where password reset reaches the wrong account.

Diagnosis path:

| Evidence | Interpretation | Next step |
|---|---|---|
| Duplicate active rows exist | Invariant is not enforced in database | Inspect unique indexes or constraints |
| App logs show conflict check passed | Time-of-check to time-of-use race | Move invariant to database transaction or constraint |
| Restore endpoint returned success | API trusted stale precheck | Add conflict handling for database rejection |
| Only one service enforces rule | Another writer bypassed service | Centralize invariant or constrain database |
| Duplicates differ only by case | Normalization mismatch | Normalize in index or stored column |

Reproduce with two concurrent operations if your test infrastructure supports it, but do not depend only on a race test. Race tests can be flaky. The durable fix is a database invariant that rejects the impossible state. The API test should then assert graceful handling of that rejection.

\`\`\`ts
import { expect, test } from 'vitest';
import { db } from '../test/db';

test('database prevents duplicate active users even when writers race', async () => {
  await db.query(
    'insert into app_user (id, email, display_name, deleted_at) values ($1, $2, $3, now())',
    ['90000000-0000-0000-0000-000000000001', 'race@example.com', 'Old Race']
  );

  const restoreOld = db.query(
    'update app_user set deleted_at = null where id = $1',
    ['90000000-0000-0000-0000-000000000001']
  );

  const createNew = db.query(
    'insert into app_user (id, email, display_name) values ($1, $2, $3)',
    ['90000000-0000-0000-0000-000000000002', 'race@example.com', 'New Race']
  );

  const results = await Promise.allSettled([restoreOld, createNew]);
  const rejected = results.filter((result) => result.status === 'rejected');

  expect(rejected).toHaveLength(1);
});
\`\`\`

This test should be run against a clean isolated database because it intentionally creates a conflict. It proves the invariant, not the exact ordering of operations.

## Add Retention And Purge Tests Before The Table Gets Huge

Soft delete often starts as a product convenience and later becomes a retention problem. Rows accumulate. Indexes grow. Queries slow down because the table contains years of deleted data. Then someone adds a purge job under pressure. Without tests, that job may delete rows still needed for audit, invoices, legal hold, or restore windows.

Define retention by entity type:

| Entity | Deleted row retention | Purge allowed? | Test proof |
|---|---|---:|---|
| User profile | Product policy dependent | Maybe | Deleted profile older than cutoff is anonymized or removed |
| Audit event | Long retention | Usually no | Purge job leaves audit event intact |
| Project draft | Short retention | Yes | Old deleted draft is removed |
| Invoice customer reference | Accounting policy dependent | Usually restricted | Invoice still resolves display details |
| Session token | Very short retention | Yes | Deleted user tokens are revoked quickly |

A purge test should include old deleted, recent deleted, active, and held rows. It should assert both what disappears and what remains. Do not write a test that only checks "some rows were deleted".

\`\`\`ts
import { expect, test } from 'vitest';
import { purgeDeletedProjects } from './retentionJob';
import { createProjectFixture, findProjectById } from '../test/fixtures';

test('purge removes only deleted projects older than retention cutoff', async () => {
  const active = await createProjectFixture({ name: 'Active', deletedAt: null });
  const recent = await createProjectFixture({ name: 'Recent', deletedAt: '2026-08-01T00:00:00Z' });
  const old = await createProjectFixture({ name: 'Old', deletedAt: '2025-01-01T00:00:00Z' });

  await purgeDeletedProjects({ now: new Date('2026-08-07T00:00:00Z'), retentionDays: 180 });

  expect(await findProjectById(active.id)).not.toBeNull();
  expect(await findProjectById(recent.id)).not.toBeNull();
  expect(await findProjectById(old.id)).toBeNull();
});
\`\`\`

Use fixed dates in tests. Relative "now" makes retention tests brittle and difficult for AI agents to reason about when they update fixtures.

## Frequently Asked Questions

### Should soft delete rules live in the database or application code?

Use both, but give each layer the right responsibility. The database should enforce invariants that must never be false, such as active-row uniqueness, required relationships, and impossible restore states where your database supports that expression. Application code should enforce workflow, permissions, product messages, and business decisions that depend on context. If a rule would corrupt data when bypassed by a background job or another service, it is a strong candidate for a database constraint or trigger.

### How do I test soft delete uniqueness when my database lacks partial indexes?

Keep the same behavioral tests, but adapt the implementation to documented database features. Some systems use filtered indexes, generated columns, separate active identity tables, or transactionally maintained lookup rows. Do not copy PostgreSQL DDL into a database that does not support it. Your tests should still prove three outcomes: duplicate active rows fail, deleted rows can release identifiers if the product allows it, and restore fails when it would create an active conflict.

### Should deleted rows appear in admin APIs?

Only when the admin route explicitly needs them and access control is clear. Ordinary list, search, autocomplete, and validation endpoints should usually exclude deleted rows. Audit, support, legal, and retention views may include them. Test both paths with the same fixture: one active row and one deleted row. The default endpoint should hide the deleted row, while the privileged endpoint should include it with deletion metadata so reviewers can see the distinction.

### Why do restore bugs escape normal CRUD tests?

Restore combines old data with current constraints. A create test checks new input. A delete test checks hiding. A restore test must ask whether the old row is still valid in today's active data set. Emails may have been reused, parent accounts may be deleted, roles may no longer exist, and retention holds may apply. Add explicit restore conflict tests at the database and API layers, especially for unique identifiers and relationships.
`,
};
