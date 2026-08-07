import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Database Testing Migration Rollback Safety for Real Deployments',
  description: 'Master database testing migration rollback safety with reversible schemas, production-like fixtures, failure injection, restore drills, and release-ready evidence.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Database Testing Migration Rollback Safety for Real Deployments

Database testing migration rollback safety means proving that a release can recover when schema and application versions overlap, data has already changed, and a deployment fails midway. The strongest strategy does not merely execute an \`up\` migration followed by a \`down\` migration on an empty database. It tests forward compatibility, backward compatibility, partial execution, live data invariants, backup restoration, and application behavior before and after each transition.

The direct payoff is a release decision backed by evidence: which rollback paths preserve data, which require roll-forward recovery, how long restoration takes, and what operators must verify. This guide builds a concrete test harness around SQL migrations, a Node application, ephemeral databases, CI artifacts, and failure scenarios that resemble production instead of a clean developer laptop.

## Define rollback before writing a reversible script

"Rollback" can describe several different operations. Teams get into trouble when a runbook says rollback but the test covers only one interpretation. Before choosing assertions, identify the recovery mechanism for each migration.

| Recovery mechanism | What changes | Appropriate when | Main risk to test |
|---|---|---|---|
| Application rollback | Old application is redeployed, schema stays forward | New schema remains compatible with old code | Old code reads or writes the new shape incorrectly |
| Down migration | Schema operation is reversed by migration tooling | Change is structurally and semantically reversible | Data created after migration cannot fit the old model |
| Roll-forward fix | A corrective migration follows the failed one | Reversal would destroy information or lock too long | Repair must handle every partially migrated state |
| Backup restore | Database returns to a known snapshot | Catastrophic corruption or irreversible transformation | Recovery point and recovery time exceed tolerance |
| Traffic switch | Requests move to an untouched database or region | Architecture supports validated failover | Writes diverge or replication lag loses accepted data |

For a column addition, application rollback may be safe without dropping the column. For a destructive type conversion, restoring a snapshot might be the only honest reversal. For a large backfill, a roll-forward repair is often safer than attempting to reconstruct overwritten values. The test plan should say which mechanism is promised, rather than assuming every migration deserves a symmetrical \`down.sql\` file.

## Model the deployment as overlapping versions

Production releases rarely stop all old processes, change the database, and start only new processes in an atomic instant. Rolling deployments create a compatibility window. Old and new application instances can run together while the schema changes. Queue consumers may lag. Scheduled jobs may wake during the transition.

Represent the system using three versions:

- A0: application before the release.
- D1: database after the new migration.
- A1: application after the release.

A safe expand-and-contract release first makes D1 compatible with A0, then deploys A1, then removes the old representation in a later release after A0 is gone. The matrix below turns that principle into executable scenarios.

| Application | Database | Expected status | Required evidence |
|---|---|---|---|
| A0 | D0 | Supported baseline | Existing regression suite passes |
| A0 | D1 expand | Supported during rollout and rollback | Old binary reads and writes successfully |
| A1 | D1 expand | Supported target | New behavior and invariant tests pass |
| A1 | D0 | Usually unsupported | Deployment ordering prevents this state |
| A0 | D2 contract | Unsupported after retirement | Evidence that no A0 instance or job remains |

The most valuable rollback test is often A0 against D1. If that combination works, an application rollback can be quick and avoid another risky database operation. This is why additive changes, dual reads, and controlled dual writes are operational safety mechanisms, not merely architectural style.

## Create a migration fixture that contains uncomfortable data

An empty database proves syntax, not safety. Build a compact production-shaped fixture containing boundary values and historical oddities. Include nulls where legacy data permits them, maximum lengths, Unicode, duplicate-looking records, old enum values, orphan candidates, timestamps around date boundaries, and rows referenced by several tables.

Suppose a release splits \`customers.full_name\` into \`given_name\` and \`family_name\`. The fixture must include one-word names, repeated whitespace, non-Latin characters, empty legacy values if allowed, and names whose correct split cannot be inferred. That last case exposes a product decision: an automated backfill cannot manufacture semantics.

Use deterministic SQL for the core fixture:

\`\`\`sql
INSERT INTO customers (id, full_name, email, created_at) VALUES
  (101, 'Ada Lovelace', 'ada@example.test', '2024-02-29T23:59:59Z'),
  (102, 'Prince', 'prince@example.test', '2025-01-01T00:00:00Z'),
  (103, '李 小龙', 'lee@example.test', '2025-06-15T12:30:00Z'),
  (104, '  Ana   Silva  ', 'ana@example.test', '2026-07-31T18:45:00Z');

INSERT INTO orders (id, customer_id, total_cents, status) VALUES
  (9001, 101, 0, 'created'),
  (9002, 103, 214748, 'paid');
\`\`\`

Keep personally identifiable production values out of fixtures. Preserve distributions and edge properties through synthetic generation or approved masking, not by copying customer rows. Validate fixture builders with the same rigor as other test utilities. The [2026 guide to JavaScript testing frameworks](/blog/javascript-testing-frameworks-complete-guide-2026) can help a Node team choose the runner for those fast, deterministic checks.

For scale-sensitive behavior, add a generated bulk fixture separately. This keeps correctness cases readable while allowing lock duration, index construction, and backfill throughput to be measured at representative volumes.

## Assert data invariants at every checkpoint

Migration success is not the absence of a SQL error. Define invariants that express what must remain true. Examples include row counts, referential integrity, uniqueness, monetary totals, legal status transitions, and preservation of a source value until a backfill is verified.

For the customer split, checkpoint queries can surface loss and ambiguity:

\`\`\`sql
SELECT COUNT(*) AS missing_new_name
FROM customers
WHERE given_name IS NULL OR family_name IS NULL;

SELECT COUNT(*) AS changed_email_count
FROM customers_after a
JOIN customers_before b ON a.id = b.id
WHERE a.email IS DISTINCT FROM b.email;

SELECT SUM(total_cents) AS order_total
FROM orders;
\`\`\`

Do not make every query assert zero. One-word names may legitimately have an unknown family name. Instead, define an explicit representation such as a nullable \`family_name\`, and test that the application handles it. An invariant should encode the chosen business rule, not disguise ambiguity with an arbitrary placeholder.

A useful invariant catalog has owners and severity:

| Invariant | Checkpoint | Failure meaning | Owner |
|---|---|---|---|
| Customer row count unchanged | After up, app rollback, and recovery | Rows were lost or duplicated | Data team |
| Order total unchanged | Every transition | Financial corruption | Payments team |
| New writes visible to A0 | During mixed-version test | App rollback is unsafe | Service owner |
| Foreign keys valid | After backfill batches | Relationship corruption | Database owner |
| No source column drop before retirement | Expand release | Rollback path was removed early | Release manager |

Store invariant results as structured CI output. A pass or fail without the observed counts makes investigation slower and hides gradual drift.

## Build an isolated rehearsal with containers

Use the same database engine family as production. SQLite is not a reliable substitute for PostgreSQL or MySQL migration semantics, locking, types, constraints, or transactional behavior. A container gives each test run a clean database while preserving the actual engine.

This Compose file defines a disposable PostgreSQL service with an explicit health check:

\`\`\`yaml
services:
  database:
    image: postgres
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: migration_test
    ports:
      - "54329:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d migration_test"]
      interval: 2s
      timeout: 3s
      retries: 20
\`\`\`

Pin the image by the same controlled policy used by the production team. The example intentionally does not invent a version. Your repository should choose and update it through dependency governance.

A rehearsal script should create the baseline, load fixtures, snapshot observations, apply the migration, run both application versions where possible, and clean up. Avoid reusing a developer database because residue can let a non-idempotent migration appear to work.

\`\`\`bash
set -euo pipefail

docker compose up -d database
docker compose exec -T database sh -c 'until pg_isready -U app -d migration_test; do sleep 1; done'

psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/schema/baseline.sql
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f test/fixtures/migration-edge-cases.sql
npm run migration:up
npm run test:migration-invariants
npm run test:api:previous
npm run test:api:current
\`\`\`

The command names under \`npm run\` are repository scripts, not claims about a migration framework. Wrap your actual tool so CI has one stable interface. Make the wrapper print the migration identifier, database engine version, start and finish time, and resulting schema revision.

## Test forward and backward application behavior

Schema assertions catch structural damage, but clients reveal compatibility damage. Run API scenarios against A0 with D0 to establish the baseline, migrate to D1, then run the same A0 artifact against D1. Finally run A1 against D1. Build A0 from an immutable release artifact rather than recompiling old source with new dependencies.

An API-level smoke test can remain stable across versions:

\`\`\`ts
import assert from 'node:assert/strict';

export async function verifyCustomerLifecycle(baseUrl: string) {
  const create = await fetch(baseUrl + '/customers', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Prince', email: 'prince@example.test' }),
  });
  assert.equal(create.status, 201);
  const created = await create.json() as { id: number };

  const read = await fetch(baseUrl + '/customers/' + created.id);
  assert.equal(read.status, 200);
  const customer = await read.json() as { name?: string; email: string };
  assert.equal(customer.email, 'prince@example.test');
}
\`\`\`

The test checks behavior promised to both versions, not the internal schema. For broader HTTP coverage and setup patterns, [the complete SuperTest guide for Node API testing](/blog/supertest-node-api-testing-complete-guide) can complement these migration-specific checks.

During the mixed-version phase, interleave writes. Create a record through A0, read it through A1, update through A1, then read through A0. This detects asymmetric dual-write and fallback-read defects that isolated version runs miss.

## Exercise down migrations without pretending they restore history

When a down migration is part of the recovery promise, test round trips with data created at multiple moments:

1. Load D0 fixture data.
2. Apply the up migration to D1.
3. Write new records through A1.
4. Apply the down migration to return to the D0 shape.
5. Run D0 invariants and A0 behavior tests.
6. Apply the up migration again and repeat D1 checks.

The second up catches state left behind by the down path. However, structural equivalence does not guarantee data equivalence. If D1 permits values D0 cannot represent, the down operation must reject safely, transform according to an approved rule, or be declared unsupported.

This SQL illustrates a guarded down migration. It refuses to drop new columns when they contain information that cannot be represented in \`full_name\`:

\`\`\`sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM customers
    WHERE family_name IS NULL OR given_name IS NULL
  ) THEN
    RAISE EXCEPTION 'Rollback blocked: names cannot be reconstructed safely';
  END IF;
END $$;

UPDATE customers
SET full_name = given_name || ' ' || family_name;

ALTER TABLE customers DROP COLUMN given_name;
ALTER TABLE customers DROP COLUMN family_name;
\`\`\`

An intentional refusal is safer than a successful-looking rollback that destroys data. The release runbook can then direct operators to roll forward or restore.

## Inject failures between migration statements and batches

Happy-path tests do not reveal partial state. Depending on the database and operation, DDL may participate in a transaction, force an implicit commit, or have engine-specific restrictions. Test the actual engine and migration tool rather than assuming all statements roll back together.

For a batched backfill, add a controlled failure hook in the migration worker. Fail after a known batch, restart, and verify that processing resumes without duplicates or skipped rows. Progress should be derived from durable state, such as a monotonically advancing key or a migration ledger, not only an in-memory counter.

\`\`\`ts
type BackfillOptions = {
  batchSize: number;
  failAfterBatch?: number;
};

export async function backfillNames(db: Db, options: BackfillOptions) {
  let completed = 0;
  while (true) {
    const rows = await db.nextCustomersWithoutSplitName(options.batchSize);
    if (rows.length === 0) return;

    await db.transaction(async tx => {
      for (const row of rows) await tx.writeSplitName(row);
    });

    completed += 1;
    if (completed === options.failAfterBatch) {
      throw new Error('Injected migration interruption');
    }
  }
}
\`\`\`

The \`Db\` interface is application-specific by design. Its integration implementation should issue parameterized SQL and the test double should not be the only validation. Run failure injection against the container database, kill the worker process if practical, restart it, and compare invariants.

Also test interruption during index creation, constraint validation, and deployment between expand and application rollout. The expected state should be named, observable, and recoverable. "Run the job again and hope" is not a recovery design.

## Measure locks, duration, and resource pressure

A logically correct migration can still cause an outage by blocking reads or writes. Test with concurrent application traffic and a dataset large enough to expose the access pattern. Observe statement duration, blocked sessions, lock waits, CPU, I/O, replication lag if applicable, and application error rates.

Generate steady traffic that includes the tables being altered. Start the migration, then assert service-level outcomes: request latency remains within the release threshold, error rates do not rise beyond the allowed value, and the migration completes within its operational window. Do not copy production thresholds blindly into a tiny CI runner. Use CI to detect regressions and a production-like staging environment for capacity evidence.

| Signal | What it reveals | Stop condition example |
|---|---|---|
| Blocked writer duration | Lock impact on customer operations | Exceeds the team's write timeout budget |
| Migration throughput | Whether the maintenance window is credible | Projected completion exceeds the window |
| Replica delay | Read-after-write and failover exposure | Crosses the application's consistency tolerance |
| Application errors | User-visible compatibility or lock failures | Any sustained rise attributable to migration |
| Database disk growth | Temporary index or rewrite capacity | Approaches reserved safety margin |

Capture the query plan for backfill queries and the schema size used in the test. Without those, a fast result on 500 rows can be mistaken for proof about 500 million rows.

## Prove backup restoration as a separate capability

A backup is not a rollback until it has been restored, timed, and validated. Schedule restoration rehearsals into an isolated environment. Record the snapshot timestamp, start time, database-ready time, application-ready time, and last recoverable write. These establish recovery time and recovery point evidence.

After restoration, run the same invariant catalog and a read-heavy application smoke suite. Confirm secrets, extensions, roles, ownership, sequences, scheduled jobs, and external object references. A schema and rows can look healthy while permissions prevent the application from starting.

Never run an automated destructive restore drill against a target that could resolve to production. Require an allowlisted test environment identifier, a unique database name, and a preflight query that confirms the expected marker row. Keep production credentials inaccessible to the CI job that performs the drill.

## Make the CI gate report recovery evidence

Migration tests should produce artifacts a reviewer can interpret without reading raw logs. Include the migration list, base and target schema revisions, fixture revision, application artifacts tested, invariant observations, timing, injected-failure checkpoint, and recovery outcome.

A CI job can serialize a compact result:

\`\`\`json
{
  "migration": "split_customer_name",
  "database": "ephemeral-postgresql",
  "pathsTested": ["A0-D0", "A0-D1", "A1-D1", "D1-down-D0"],
  "invariants": {
    "customerCountPreserved": true,
    "orderTotalPreserved": true,
    "foreignKeysValid": true
  },
  "failureInjection": {
    "checkpoint": "after-backfill-batch",
    "restartSucceeded": true
  }
}
\`\`\`

Gate the release on required paths, not merely on script exit. If the previous application artifact was unavailable, report the A0-D1 scenario as missing and fail the safety gate. A skipped compatibility test is not a pass.

Keep migration-specific results distinct from ordinary unit test output. A JUnit representation is useful for CI visualization, while a richer JSON artifact preserves observations and provenance.

## Diagnose a rollback that passes in CI and fails in staging

Consider a migration that adds a unique index to normalized email addresses. CI passes because fixtures contain unique lowercase emails. Staging fails because two historical accounts differ only in case. The migration partially creates supporting state, the application rollout stops, and the old app now experiences longer queries.

Diagnosis begins with data assumptions. Run the exact preflight query used before the migration and compare its result with fixture coverage. Check whether the migration tool recorded completion, whether the failed statement was transactional on the actual engine, and whether a retry sees leftover objects. Inspect blockers and long-running transactions at the time of failure.

The repair has three parts. First, define a business process for duplicates instead of silently deleting one. Second, make the preflight query a required release check and add synthetic duplicate cases to CI. Third, make the migration resumable or add an explicit cleanup procedure for its partial state.

What people often get wrong is blaming "bad staging data." Historical production-shaped data is doing valuable work by revealing an invalid assumption. The test fixture and preflight design were incomplete.

## Use a release checklist that names irreversible decisions

Before approval, reviewers should be able to answer:

- Can A0 run against the expanded schema, and was the actual A0 artifact tested?
- Which writes occur during the mixed-version window, and can both versions read them?
- Does the migration preserve every named invariant on edge and scale fixtures?
- What happens if execution stops after each meaningful checkpoint?
- Is the down path data-preserving, guarded, or explicitly unsupported?
- What are the observed lock and duration characteristics?
- Has restore been rehearsed, and are recovery objectives met?
- Which later release removes compatibility code, and what retirement evidence is required?

This checklist forces irreversible choices into review. A destructive column drop should never arrive disguised as a routine cleanup. It is a separate release decision backed by evidence that old readers, delayed jobs, audit queries, and rollback procedures no longer require the data.

## Frequently Asked Questions

### Is running every up and down migration enough to prove rollback safety?

No. That sequence proves only that the migration tool can execute the scripts on the chosen fixture. Rollback safety also depends on data written after the up migration, compatibility between old application code and the expanded schema, behavior after partial execution, and the database engine's transaction and locking semantics. Add mixed-version API tests, invariants at each checkpoint, failure injection, and a second up migration after the down path. If information cannot be represented in the old schema, explicitly test that rollback refuses safely or use roll-forward recovery.

### When should a team prefer roll-forward recovery over a down migration?

Prefer roll forward when reversal would discard valid new data, require a longer lock, recreate an ambiguous old representation, or interact poorly with already deployed clients. A corrective migration can be designed to recognize partial states and preserve evidence. Document the conditions that choose it, rehearse the correction from each failure checkpoint, and estimate its completion time. Calling a change irreversible is acceptable when the recovery plan is concrete. Pretending that a lossy down script is safe because it exits successfully is not.

### How large should a migration performance fixture be in CI?

Use two fixture classes. Keep a small deterministic set for semantic edge cases, then add generated volume for plan and throughput regressions. The bulk size should be large enough to exercise batching, indexes, and relevant query plans within your CI budget. Do not extrapolate a tiny runner's absolute time directly to production. Record rows, bytes, plan, and throughput, then validate final capacity in a production-like environment with representative concurrency and hardware. The goal of CI is repeatable regression detection, not a misleading miniature benchmark.

### Can production data be copied into a migration test environment?

Only under an approved data-governance process, and usually it should not be necessary. Raw customer data creates privacy, security, retention, and access-control exposure. Prefer deterministic synthetic records for known edge cases plus generated distributions for scale. If masking is authorized, verify that it preserves the properties the migration relies on, such as length, uniqueness collisions, null rates, and relationships, while preventing re-identification. Test environments also need restricted access, retention limits, and cleanup controls because non-production does not mean non-sensitive.
`,
};
