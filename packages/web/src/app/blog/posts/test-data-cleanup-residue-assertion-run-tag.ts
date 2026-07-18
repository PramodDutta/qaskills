import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Make Test Data Cleanup Prove Zero Residue',
  description:
    'Use a test data cleanup residue assertion with run tags, dependency-aware deletion, crash recovery, scoped row counts, and actionable CI evidence.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Guide',
  primaryKeyword: 'test data cleanup residue assertion',
  keywords: [
    'test data cleanup residue assertion',
    'test run tag cleanup',
    'database residue check',
    'integration test teardown',
    'dependency ordered deletion',
    'CI test data cleanup',
    'orphaned test data recovery',
    'zero residue testing',
  ],
  relatedSlugs: [
    'foreign-key-graph-relational-test-data-builder',
    'negative-api-tests-no-partial-write-row-count',
    'reserved-namespaces-pii-safe-synthetic-test-data',
    'aggregate-driven-synthetic-test-data-without-production-rows',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
    'https://www.postgresql.org/docs/current/tutorial-transactions.html',
  ],
  content: `A test data cleanup residue assertion proves teardown by counting every resource owned by one run after deletion and requiring zero. The run tag must propagate during creation, deletion must respect dependency order, and failures must name remaining tables or resources. Cleanup without this final observation is only an attempted action.

The pattern follows the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer), which requires cleanup to fail loudly on residue. Use the broader [QASkills directory](/skills) when database cleanup must coordinate with browser, API, or cloud test tools.

## Define Zero Residue as a Test Invariant

Teardown code can execute successfully while leaving data behind. A delete predicate may omit a child table, a new relation may not appear in the cleanup list, or a background worker may recreate a row after deletion. A passing hook therefore proves only that no observed cleanup call threw.

Zero residue is an observable postcondition. After normal or recovery cleanup, every owned database row, object, job, message, and external sandbox resource carrying the run identity must be absent. If the system intentionally retains a test audit record, classify and expire it explicitly rather than weakening the invariant silently.

| Cleanup evidence | Strength | Remaining blind spot |
|---|---|---|
| teardown hook returned | weak | delete may match nothing |
| delete affected expected total | useful | unknown table may still contain rows |
| parent lookup returns nothing | incomplete | children or external resources may remain |
| every owned table count is zero | strong for relational state | non-database systems remain |
| complete resource inventory is empty | strongest defined scope | inventory itself must stay current |

A test data cleanup residue assertion needs a declared ownership boundary. List tables directly tagged by the run, tables reachable through tagged parents, and external resources carrying the same identity. Keep shared reference data outside that boundary so cleanup never deletes fixtures owned by another suite.

Separate command invariants from suite invariants. A rejected API request may prove no partial write while valid arrangement rows still exist. The sibling [negative API no-write guide](/blog/negative-api-tests-no-partial-write-row-count) checks the command boundary; this guide proves all test-owned prerequisites and outputs are gone afterward.

Define when zero must be observed. For local teardown, check immediately after bounded deletion and consumer shutdown. For eventually consistent external stores, poll the supported read path until zero or a strict deadline, then report the last observed identifiers.

The [test data management strategies guide](/blog/test-data-management-strategies) compares disposable databases, transaction rollback, and shared environments. Zero-residue checks remain useful in every mode because they expose escapes from the assumed isolation boundary.

## Design One Canonical Run Tag

Allocate the run identity before creating any resource. A useful tag combines a CI run or local session identifier, job, retry attempt, worker, and a collision-resistant suffix when concurrent processes can otherwise choose the same value. Keep the canonical value short enough for every destination.

Do not hide ownership only inside a display name. Product code may truncate, normalize, or permit users to edit that field. Store \`test_run_id\` in an indexed column, exact metadata field, object prefix, message header, or provider-supported tag intended for machine selection.

| Component | Example segment | Purpose |
|---|---|---|
| suite | \`api-orders\` | identifies cleanup policy |
| CI run | \`981442\` | links evidence to execution |
| attempt | \`2\` | separates retried jobs |
| worker | \`w3\` | prevents parallel collisions |
| suffix | \`7f19\` | prevents local reuse |

The tag contains operational identifiers, not personal data, secrets, branch commit messages, or raw test payloads. Logs, SQL diagnostics, and cleanup reports can then include it safely. If CI identifiers are sensitive in your environment, map them to an internal opaque token.

Create a registry row before scenario setup. The row records run id, environment, owner suite, creation time, expiry policy, and lifecycle state. Cleanup can mark the run as deleting, record residue evidence, then mark it clean only after every assertion reaches zero.

\`\`\`sql
CREATE TABLE test_data_runs (
  run_id text PRIMARY KEY,
  environment text NOT NULL,
  owner_suite text NOT NULL,
  state text NOT NULL CHECK (state IN ('active', 'deleting', 'clean', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK (environment <> 'production')
);

ALTER TABLE organizations ADD COLUMN test_run_id text;
ALTER TABLE users ADD COLUMN test_run_id text;
ALTER TABLE orders ADD COLUMN test_run_id text;
CREATE INDEX organizations_test_run_id_idx ON organizations(test_run_id);
CREATE INDEX users_test_run_id_idx ON users(test_run_id);
CREATE INDEX orders_test_run_id_idx ON orders(test_run_id);
\`\`\`

This example illustrates a dedicated test environment, not a request to modify production schemas casually. If shared schemas cannot include test columns, use an existing metadata facility or join through an owned root. Never weaken constraints or add unsafe public inputs merely to simplify cleanup.

The run registry is not deletion authority by itself. Cleanup credentials, environment allowlists, and tenant restrictions must independently prevent production access. A forged tag must not make an arbitrary row deletable.

A test data cleanup residue assertion should cite the exact run id in its failure. That gives an independent sweeper and a human operator the same selection key without exposing the generated record contents.

## Propagate Ownership Through the Data Graph

Tag every resource at creation time. Retrofitting ownership after a setup failure is unreliable because the process may stop between insert and update. A child should receive the same run tag alongside the returned parent identifier in its original insert.

Foreign-key graphs clarify propagation. Create roots first, capture their ids, then create children with parent ids and the canonical tag. The sibling [foreign-key graph test data tutorial](/blog/foreign-key-graph-relational-test-data-builder) provides the full insertion procedure.

Some tables cannot accept a direct tag. Join them to a tagged root when the ownership path is unambiguous, and encode that join in both deletion and residue queries. Avoid a chain that depends on a parent already deleted before child verification runs.

| Resource | Preferred ownership marker | Fallback selector | Verification risk |
|---|---|---|---|
| relational root | indexed \`test_run_id\` | deterministic unique key | key normalization |
| relational child | direct tag plus foreign key | join to tagged parent | parent deletion hides residue |
| object storage | run-specific prefix and tag | manifest object key | incomplete listing behavior |
| search document | exact run-id field | source aggregate id | index refresh delay |
| message or job | run-id header or column | isolated destination | consumer removes evidence |
| external sandbox | provider metadata | recorded resource id | provider query limits |

Prefer direct child tags where the schema and environment permit them. A residue query joining through parents returns zero after parent deletion even when an orphaned child remains because constraints were disabled or a separate store is involved. Direct tags preserve attribution independently.

Maintain a resource manifest as a second evidence path for external systems. Append the provider type and returned identifier immediately after creation succeeds. Tag discovery finds resources after a local manifest is lost, while the manifest detects tagging mistakes and supports precise deletion.

Do not place credentials, tokens, customer-like free text, or full payloads in that manifest. It should contain safe identifiers, run ownership, resource kind, and cleanup status. Encrypt or restrict the artifact according to the environment's normal operational controls.

Production rows never leave their system to seed this graph. Generate deterministic values from schema shapes, then tag them at source. The sibling [reserved namespace guide](/blog/reserved-namespaces-pii-safe-synthetic-test-data) covers safe email, domain, and address-like values for those generated resources.

Audit coverage whenever migrations add a table or relationship. A new run-owned table without tagging, deletion, and residue queries is a cleanup defect. Code review should require those three changes together.

## Delete in Dependency Order Inside a Boundary

When foreign keys use restrictive behavior, delete dependent children before referenced parents. When the schema declares cascades, parent deletion can remove children, but residue still needs independent observation. Do not rely on application memory of relations when the migrations provide enforceable truth.

PostgreSQL's [constraint documentation](https://www.postgresql.org/docs/current/ddl-constraints.html) describes foreign keys and their delete actions, including cascade, restrict, set null, and no action. Derive the deletion plan from those declarations and retain constraint names in cleanup diagnostics.

Use one database transaction for related cleanup statements when they share a PostgreSQL database. The [official transaction tutorial](https://www.postgresql.org/docs/current/tutorial-transactions.html) explains the atomic all-or-nothing boundary. If a statement fails, rollback avoids a half-clean relational graph that obscures the original residue.

An ordered cleanup procedure is easier to review:

1. Stop or isolate producers that can create new run-owned state.
2. Mark the run registry as deleting and reject new scenario writes for that run.
3. Delete external resources whose identifiers depend on database rows, retaining safe evidence.
4. Begin a database transaction and delete leaves before roots using the canonical tag.
5. Commit only when every expected delete statement succeeds.
6. Query residue independently across every owned table and external store.
7. Mark the registry clean only when every count is zero.
8. Preserve a failure report and retry safely when any residue remains.

The following TypeScript sketch keeps deletion results separate from residue evidence. Its table order comes from a reviewed dependency map rather than arbitrary naming.

\`\`\`typescript
type CleanupCount = { resource: string; deleted: number };

export async function deleteRunData(db: Db, runId: string): Promise<CleanupCount[]> {
  return db.transaction(async (tx) => {
    const tables = ['line_items', 'orders', 'users', 'organizations'] as const;
    const results: CleanupCount[] = [];

    for (const table of tables) {
      const result = await tx.deleteWhere(table, { testRunId: runId });
      results.push({ resource: table, deleted: result.rowCount });
    }
    return results;
  });
}
\`\`\`

Never interpolate untrusted table names into SQL. The example uses a closed, reviewed list passed to an adapter that must map names safely. Run ids remain bound parameters in the concrete implementation.

Delete counts are diagnostics, not the final assertion. A retry can validly delete zero because an earlier attempt already removed rows. Idempotent cleanup accepts absent resources, then proves the final state is empty.

For transaction-only suites, the [database testing automation guide](/blog/database-testing-automation-guide) helps place rollback within wider storage coverage. Still run residue queries after rollback for high-risk harnesses, especially when application code can open its own connection.

Partitioned tables and triggers deserve explicit inventory review. A delete against a parent relation may affect partitions, while a trigger can create history or queue rows not obvious from application repositories. Read migrations and database declarations, then add every run-owned destination to residue evidence.

Generated cleanup plans can assist discovery but should not execute without review. Introspection can find foreign keys, yet it cannot decide business ownership, shared reference policy, external resources, or permitted audit retention. Keep a versioned allowlist whose entries cite the schema evidence and owning suite.

Test deletion predicates against two runs at once. Populate identical shapes under separate tags, clean one run, then prove its counts are zero while the other run remains unchanged. This catches missing tag conditions and joins that select through a shared parent.

Measure updates made during teardown too. Cleanup code that marks shared rows inactive before deleting owned children may leave configuration damage despite zero tagged rows. Prefer isolated test-owned roots; otherwise snapshot and restore the narrowly approved shared fields with separate evidence.

## Query and Assert Every Residue Count

Build residue queries from the ownership inventory, not from whatever tables happened to be deleted. That distinction catches a migration that adds a new child table but forgets to update teardown. Query all direct tags and any documented join-based selectors.

Return a structured map of resource names to counts. Require every value to equal zero and include only nonzero entries in the concise failure summary. Attach the complete map as an artifact when diagnostics need all checked surfaces.

Use the test data cleanup residue assertion as the sole transition into a clean registry state. Delete counts and manifest statuses remain supporting diagnostics, not substitutes.

\`\`\`typescript
type Residue = Record<string, number>;

export async function countRunResidue(db: Db, runId: string): Promise<Residue> {
  const row = await db.one<{
    organizations: number;
    users: number;
    orders: number;
    line_items: number;
  }>(
    'SELECT ' +
      '(SELECT count(*)::int FROM organizations WHERE test_run_id = $1) AS organizations, ' +
      '(SELECT count(*)::int FROM users WHERE test_run_id = $1) AS users, ' +
      '(SELECT count(*)::int FROM orders WHERE test_run_id = $1) AS orders, ' +
      '(SELECT count(*)::int FROM line_items WHERE test_run_id = $1) AS line_items',
    [runId],
  );
  return row;
}

export function assertZeroResidue(runId: string, residue: Residue): void {
  const remaining = Object.entries(residue).filter(([, count]) => count !== 0);
  if (remaining.length > 0) {
    const summary = remaining.map(([name, count]) => name + '=' + count).join(', ');
    throw new Error('Run ' + runId + ' left test data residue: ' + summary);
  }
}
\`\`\`

This test data cleanup residue assertion is intentionally simple: every named count must be zero. Do not subtract an expected leak, accept values below a threshold, or downgrade residue to a warning. A retained resource needs an explicit lifecycle outside the zero-owned-resource contract.

Check updates as well as rows when cleanup is meant to restore shared reference state. If a test changes a shared configuration row, count zero says nothing. Prefer creating test-owned state; when mutation is unavoidable, snapshot the specific safe fields and assert restoration.

External residue checks should query the same customer-facing read path that later tests use when feasible. A successful delete response can precede search or cache convergence. Poll with a deadline and report the final safe identifiers rather than sleeping for a fixed interval.

Run the assertion even when the test body fails. Preserve the original test error and cleanup error together, because replacing the product failure with a teardown stack loses essential evidence. Most frameworks support aggregate errors or attached diagnostics in an \`afterEach\` hook.

The [test impact analysis CI guide](/blog/test-impact-analysis-ci-guide-2026) helps select cleanup checks when migrations or fixture ownership change. Local assertions catch immediate defects; recovery jobs handle process death that prevents assertions from running.

Keep residue evidence after a recovery attempt, not only after local teardown. The recovery report should name the original run, lease owner, cleanup version, attempt number, prior nonzero counts, and final counts. This history distinguishes a recovered process crash from a recurring deletion defect.

Recovery tests should include unavailable dependencies. Simulate a database success followed by an object-store timeout, preserve the failed state, then retry once the fake store returns. The final clean transition must depend on fresh checks from both systems rather than the earlier database result.

Avoid endless automated retries. Persist the failure, apply a team-defined retry policy, and escalate repeated or ambiguous residue for review. Safety takes priority over aggressively deleting resources whose ownership cannot be proven.

## Make Cleanup Idempotent and Crash-Recoverable

Cleanup can be interrupted too. Design every delete so repeating it converges toward the same empty state. Treat not-found as success for an owned resource, but treat permission errors, selector errors, and ambiguous ownership as failures requiring investigation.

A test data cleanup residue assertion makes retries safe because it observes the destination state rather than trusting an operation history. The first attempt may delete three tables and crash; the second can delete the remaining table, observe zero everywhere, and close the run.

Use explicit run lifecycle states:

| State | Meaning | Allowed transition |
|---|---|---|
| active | tests may create tagged resources | deleting or failed |
| deleting | new writes are blocked; cleanup owns the run | clean or failed |
| failed | test or cleanup needs recovery | deleting |
| clean | residue assertion passed | terminal |

Do not mark clean merely because the manifest says every delete call succeeded. The state transition requires fresh zero counts from all inventory sources. Store check time and schema or cleanup version so stale evidence is visible.

An independent sweeper should select only expired active, deleting, or failed runs from approved non-production environments. Apply a grace period so it never competes with a live worker. Use a lease or compare-and-set transition when several sweepers can run concurrently.

Process crashes can also leave uncommitted PostgreSQL transactions. Closing the connection rolls back those uncommitted effects, but writes committed on other connections remain. Recovery therefore queries durable tagged state rather than assuming connection loss solved everything.

Keep deletion limits as safety circuit breakers. If one run unexpectedly matches far more resources than its scenario permits, stop and report rather than continuing broad deletion. The threshold is environment and suite specific; derive it from declared scenario cardinality, not an invented universal number.

Test recovery deliberately. Create a tagged graph, interrupt cleanup after one leaf table, rerun cleanup, and require the final inventory to reach zero. Then simulate a recreated search document or delayed job and confirm the bounded verification catches it.

The [CI/CD pipeline testing guide](/blog/cicd-testing-pipeline-github-actions) can schedule a fast per-job teardown and a separate recovery workflow. Keep recovery evidence linked to the originating run so recurring leaks reveal the responsible suite.

## Guard Parallel and Shared Environments

Parallel workers must never share a run tag. Include worker and retry identity, and verify uniqueness in the run registry. A primary-key collision should fail allocation before any scenario row is created.

Scope all deletion and counting predicates to the canonical tag plus the approved environment or tenant boundary. Defense in depth matters because a malformed tag, query bug, or reused identifier can otherwise select another worker's data.

Use dedicated credentials with the narrowest practical permissions. Test writers may need insert and scoped delete access in an isolated database, while a recovery job may need broader access within one test tenant. Neither should connect to production.

A test data cleanup residue assertion should fail before destructive work when the environment marker is missing or unknown. Deny by default, then allow named local, CI, preview, or staging targets according to team policy. String matching on a hostname alone is not sufficient authorization.

Parallel cleanup can deadlock when workers touch shared parents or delete in inconsistent order. Give each worker independent roots, use one reviewed table order, and avoid truncating shared tables. A deadlock retry must repeat the complete transaction and still run fresh residue checks.

| Shared-environment risk | Preventive control | Residue evidence |
|---|---|---|
| tag collision | registry uniqueness | counts attributed to one run |
| cross-worker delete | tag plus tenant predicate | other run counts unchanged |
| shared parent mutation | immutable shared fixtures | selected values unchanged |
| late background writer | deleting state blocks writes | poll until zero |
| broad cleanup query | allowlist and deletion circuit breaker | reviewed matched ids |

Reserved names and addresses reduce accidental contact but do not authorize shared-environment deletion. Egress controls, test tenants, provider sandboxes, and scoped credentials remain separate requirements.

Use aggregate-driven generation rather than importing production rows when a scenario needs realistic frequencies. The sibling [aggregate-driven synthetic data guide](/blog/aggregate-driven-synthetic-test-data-without-production-rows) preserves the rule that production records remain inside their system.

The [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) can prioritize residue checks for expensive or security-sensitive external systems. Database zero counts should still remain the default for every tagged relational scenario.

## Turn Residue into Actionable CI Evidence

CI should fail the owning test or teardown phase when residue remains. Report the run id, environment, inventory version, nonzero resource counts, cleanup attempt, and a link to restricted diagnostic artifacts. Never print full rows, credentials, or sensitive rejected payloads.

Adopt a fixed evidence procedure:

1. Allocate and register a unique run tag before setup.
2. Record every owned resource type in a versioned cleanup inventory.
3. Run normal teardown after both passing and failing test bodies.
4. Execute fresh residue queries across relational and external stores.
5. Fail CI on any nonzero forbidden count or unavailable evidence source.
6. Preserve the run as failed for independent recovery.
7. Retry idempotent cleanup, then record a new zero-residue observation.

Missing evidence is not zero. A database timeout, unavailable object listing, or skipped cleanup hook means the suite cannot prove its postcondition. Mark the result failed or indeterminate according to CI policy, but never report clean.

Trend failures by suite, resource type, and cleanup version without inventing a universal pass rate. Repeated line-item residue after one migration suggests an incomplete dependency map. Repeated external jobs suggest producer shutdown or eventual-consistency handling needs attention.

For release decisions, the [AI release readiness scorecard](/blog/ai-release-readiness-scorecard-2026) demonstrates evidence-backed gates. Residue failures on the exact release commit should remain blockers until cleanup succeeds and the cause is understood.

Implement one test data cleanup residue assertion today for the suite with the most shared state. Start with a direct run tag on every owned table, delete leaves before roots, and make the first nonzero count fail locally and in CI.

Apply the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) to derive the inventory from current migrations. Keep the assertion beside cleanup code so every new table must update deletion and verification together.

## Frequently Asked Questions

### Is a successful delete response enough evidence?

No. The predicate may match nothing, another owned table may be missing, or an asynchronous process may recreate data afterward. Query every resource in the ownership inventory after deletion and require zero. For delayed stores, poll the supported read path until zero or a strict deadline.

### Should cleanup use cascade deletes or explicit child deletes?

Follow the declared schema and testing intent. Cascades are appropriate when the migration defines them, but residue queries should still verify children independently. Explicit leaf-first deletion gives clearer counts for restrictive relationships. Never disable constraints simply to make teardown easier or faster.

### What belongs in a test run tag?

Include safe identifiers for suite, CI run or local session, attempt, worker, and a collision-resistant suffix when needed. Exclude personal data, secrets, full branch messages, and payload contents. Store the canonical tag in machine-queryable metadata rather than only in editable display names.

### How does cleanup work after a process crash?

An independent sweeper finds expired registered runs, acquires a lease, switches the run to deleting, and repeats idempotent cleanup. It marks clean only after fresh zero counts across every owned store. A grace period and approved-environment checks prevent competition with live workers or unsafe targets.

### Can transaction rollback replace residue checks?

Rollback is valuable when all writes share one connection, but application pools, workers, external services, and committed side transactions can escape it. A residue check tests the assumption directly. Use it especially around HTTP integration suites and any code capable of opening another connection.

### What if one retained audit record is required?

Define that record outside the forbidden-residue set and assert it explicitly: exact count, safe category, run correlation, retention, and absence of sensitive payload data. All business resources must still reach zero. A documented audit requirement should not become a general tolerance for cleanup leaks.
`,
};
