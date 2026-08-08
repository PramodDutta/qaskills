import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Init Script Ordering Without Schema Races',
  description: 'Control testcontainers init script ordering with numbered resources, migration gates, readiness proofs, and diagnostics that prevent schema races in CI.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Testcontainers Init Script Ordering Without Schema Races

Testcontainers init script ordering is deterministic only when one component owns the sequence and the test waits for that component to finish. For a database container, choose one of three models: one ordered Testcontainers init script, database-image entrypoint scripts with sortable filenames, or a real migration runner invoked after the container starts. Do not mix those models unless you document their phase boundary and prove it with a readiness query.

For most applications, production migrations are the best owner because tests then exercise the same dependency graph, transaction policy, and migration history used in deployment. Small component tests can use a single seed script. The [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) helps separate these integration tests from faster suites, while [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) keeps later browser checks focused on user-visible state instead of database setup details.

## First identify which layer is doing the initialization

“Init script” can describe several unrelated mechanisms. Testcontainers may run a classpath SQL resource through a database connection. An official database image may scan a special directory during first boot. A framework may apply migrations after a connection becomes available. A test may execute ad hoc seed SQL in a lifecycle hook. Their ordering guarantees are different, and startup success can mean something different in each phase.

| Initialization owner | When it runs | Ordering source | Suitable use |
|---|---|---|---|
| One Testcontainers SQL resource | During container startup hook | Statement order in one resource | Compact schema and fixed fixtures |
| Database image entrypoint | During first database-directory initialization | Image-specific filename processing rules | Image-level bootstrap behavior |
| Migration tool | After connectivity, before application readiness | Migration metadata and tool rules | Production-like schema evolution |
| Test lifecycle seed | After container start | Explicit test code sequence | Scenario-specific rows |
| Application startup | As the service boots | Framework and migration configuration | Full-stack deployment rehearsal |

The most important design choice is ownership. If both the container and application create the same table, a duplicate-object error is not flakiness. It is an ambiguous contract. If the container creates tables while the application migrator adds columns, a test can accidentally pass only because a particular lifecycle happens to win today.

Name each phase in the fixture: infrastructure boot, schema migration, baseline seed, scenario seed, application start, assertion. That sequence provides a reviewable happens-before relationship. It also tells an AI coding agent where new setup belongs.

## Use one Testcontainers script when the order is truly linear

Java Testcontainers database modules support an init script resource. A single file is the simplest ordering mechanism because statements are submitted in source order before the started container is handed to the test. Keep the file in test resources and make every dependency visible.

\`\`\`java
// src/test/java/example/DatabaseFixture.java
package example;

import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

public final class DatabaseFixture {
  private DatabaseFixture() {}

  public static PostgreSQLContainer<?> newPostgres() {
    String image = System.getenv("POSTGRES_TEST_IMAGE");
    if (image == null || image.isBlank()) {
      throw new IllegalStateException("POSTGRES_TEST_IMAGE is required");
    }

    return new PostgreSQLContainer<>(DockerImageName.parse(image))
        .withDatabaseName("app_test")
        .withUsername("app")
        .withPassword("app")
        .withInitScript("db/component-init.sql");
  }
}
\`\`\`

The corresponding script creates parent objects before dependent objects and reference rows before child rows:

\`\`\`sql
-- src/test/resources/db/component-init.sql
CREATE TABLE account (
  id BIGINT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE purchase_order (
  id BIGINT PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES account(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled'))
);

CREATE INDEX purchase_order_account_idx
  ON purchase_order(account_id);

INSERT INTO account (id, email)
VALUES (1001, 'fixture@example.test');

INSERT INTO purchase_order (id, account_id, status)
VALUES (7001, 1001, 'pending');
\`\`\`

This approach has a deliberately narrow use. It is readable for a small schema and avoids cross-file ordering. It becomes weak when it duplicates production migrations, accumulates conditional DDL, or contains dozens of unrelated scenarios. At that point the file is a second schema management system and will drift.

An init script is not a place to hide nondeterminism with \`IF NOT EXISTS\` everywhere. Those clauses can make a partially initialized database look healthy. In a fresh disposable database, an unexpected pre-existing table should often fail loudly because it reveals reuse, duplicate ownership, or a phase that ran twice.

## Number entrypoint resources only when testing image bootstrap

Official database images often have an entrypoint initialization directory. The PostgreSQL image processes supported files placed in \`/docker-entrypoint-initdb.d\` during initialization of an empty data directory, and its documentation describes execution in sorted name order. Testcontainers can copy resources before startup, so numbered filenames create an explicit sequence.

\`\`\`java
// src/test/java/example/EntrypointBootstrapTest.java
package example;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

class EntrypointBootstrapTest {
  @Test
  void bootstrapCreatesReadyMarker() throws Exception {
    String image = System.getenv("POSTGRES_TEST_IMAGE");
    if (image == null || image.isBlank()) {
      throw new IllegalStateException("POSTGRES_TEST_IMAGE is required");
    }

    try (PostgreSQLContainer<?> db = new PostgreSQLContainer<>(DockerImageName.parse(image))
        .withCopyFileToContainer(
            MountableFile.forClasspathResource("db/entrypoint/010-schema.sql"),
            "/docker-entrypoint-initdb.d/010-schema.sql")
        .withCopyFileToContainer(
            MountableFile.forClasspathResource("db/entrypoint/020-reference-data.sql"),
            "/docker-entrypoint-initdb.d/020-reference-data.sql")
        .withCopyFileToContainer(
            MountableFile.forClasspathResource("db/entrypoint/030-verification.sql"),
            "/docker-entrypoint-initdb.d/030-verification.sql")) {
      db.start();

      try (Connection connection = java.sql.DriverManager.getConnection(
               db.getJdbcUrl(), db.getUsername(), db.getPassword());
           Statement statement = connection.createStatement();
           ResultSet rows = statement.executeQuery(
               "SELECT phase FROM test_bootstrap_status WHERE id = 1")) {
        rows.next();
        assertEquals("complete", rows.getString(1));
      }
    }
  }
}
\`\`\`

The directory can contain these files:

\`\`\`text
src/test/resources/db/entrypoint/
  010-schema.sql
  020-reference-data.sql
  030-verification.sql
\`\`\`

Use fixed-width numeric prefixes. Lexical sorting puts \`100-final.sql\` before \`20-seed.sql\`, while \`020-seed.sql\` and \`100-final.sql\` sort as intended. Leave gaps so a new dependency can fit between phases without renaming every file.

The verification file should query prerequisites and write a completion marker only at the end:

\`\`\`sql
-- 030-verification.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'purchase_order'
  ) THEN
    RAISE EXCEPTION 'purchase_order was not created';
  END IF;
END
$$;

CREATE TABLE test_bootstrap_status (
  id INTEGER PRIMARY KEY,
  phase TEXT NOT NULL
);

INSERT INTO test_bootstrap_status (id, phase)
VALUES (1, 'complete');
\`\`\`

This completion marker is useful evidence, but do not add it to a production schema merely for tests. It belongs in a test-specific image bootstrap. For production migrations, use the migration tool’s history table and an application readiness check.

| Filename practice | Result |
|---|---|
| \`010-\`, \`020-\`, \`030-\` prefixes | Stable lexical sequence with insertion gaps |
| Bare names such as \`schema.sql\`, \`seed.sql\` | Order depends on names, often misunderstood |
| Mixed \`2-\` and \`10-\` prefixes | Lexical order surprises readers |
| Date prefixes | Useful for chronology, weak for dependency meaning |
| One giant shell script invoking SQL clients | Flexible but harder to keep portable and observable |

Do not generalize PostgreSQL image behavior to MySQL, MariaDB, Oracle, or custom images. Read the exact image’s official entrypoint documentation. Supported extensions, error handling, environment, first-run rules, and sorting can differ.

## Prefer the production migration graph for application integration tests

A migration tool knows schema history and usually has a documented way to apply pending changes. Invoke the same migration command the application deployment uses, pointing it at the started container. Only start the application or release tests after the command exits successfully.

The following shell wrapper demonstrates the phase boundary without assuming a particular migration product. \`npm run db:migrate\` is a project-defined script, so its implementation remains in the repository rather than being invented in the test command.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

: "\${TEST_DATABASE_URL:?TEST_DATABASE_URL is required}"

npm run db:migrate
npm run db:verify
npm run test:integration
\`\`\`

The verification command should be read-only. It can confirm the expected migration version, required columns, constraints, and indexes. A successful TCP connection is not enough. The database can accept connections while migrations are still running in another process.

If the application automatically migrates on startup, the test harness must wait on application readiness that is published only after migration success. Starting a test when the port opens creates a race between HTTP requests and DDL. A health endpoint that reports healthy before schema validation is also insufficient.

What people get wrong is adding a generic container wait strategy for a log line such as “database system is ready” and assuming application schema initialization is complete. That log belongs to the database server. A later Testcontainers init hook, copied entrypoint file, migration process, or application bootstrap can still be running. Wait on the final owner of the schema, not the earliest layer that can accept a socket.

## Separate baseline data from scenario data

Schema, immutable reference data, and per-test data have different lifetimes. Combining them causes tests to depend on rows they did not declare and makes parallel mutation hazardous.

| Data class | Example | Recommended owner | Reset policy |
|---|---|---|---|
| Schema | tables, constraints, indexes | Production migrations | Rebuild container or schema |
| Reference | currency codes, fixed roles | Versioned migration or baseline seed | Treat as read-only |
| Scenario | customer, cart, failed payment | Test fixture or API | Unique namespace or rollback |
| Expected output | audit row, projection | System under test | Assert, then discard |
| Readiness marker | applied migration version | Migration history or verifier | Read-only observation |

A JUnit fixture can insert scenario rows after migration and before starting the behavior under test. Use JDBC transactions and prepared statements so setup failures point to the exact phase.

\`\`\`java
static long insertScenarioAccount(PostgreSQLContainer<?> db, String email)
    throws Exception {
  String sql = "INSERT INTO account (email) VALUES (?) RETURNING id";

  try (var connection = java.sql.DriverManager.getConnection(
           db.getJdbcUrl(), db.getUsername(), db.getPassword());
       var statement = connection.prepareStatement(sql)) {
    statement.setString(1, email);
    try (var rows = statement.executeQuery()) {
      if (!rows.next()) {
        throw new IllegalStateException("Account insert returned no id");
      }
      return rows.getLong(1);
    }
  }
}
\`\`\`

The returned database ID becomes explicit test state. Avoid assuming a sequence begins at one, especially if baseline data already consumed values. When deterministic IDs are part of a protocol fixture, insert them deliberately and handle collisions through per-test isolation.

## Make dependencies executable instead of conventional

Filename prefixes communicate order, but database constraints prove important dependencies. A foreign key ensures child seed data cannot precede its parent unnoticed. A \`NOT NULL\` constraint rejects an incomplete migration. A unique constraint catches accidental duplicate seeding. Verification queries catch requirements the database cannot express directly.

For a layered SQL setup, make the last phase assert the contract:

\`\`\`sql
-- verify-schema.sql, executed read-only by the test verifier
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'purchase_order'
ORDER BY ordinal_position;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'purchase_order'
ORDER BY indexname;
\`\`\`

In code, compare those results with the contract the current application expects. Do not merely assert that the table count is greater than zero. A half-applied schema can satisfy that. Verification should mention the missing column, constraint, or migration rather than timing out with “connection refused.”

Schema order can also hide transactional assumptions. Some databases or migration tools treat DDL transactionally, while others autocommit certain statements. Test the failure policy with the actual database image: introduce an intentionally invalid migration in a dedicated fixture, run the migrator, and inspect whether earlier statements remain. Never infer rollback behavior from an in-memory substitute.

## Diagnose “relation does not exist” after the container starts

A realistic CI failure looks like this: the container reports started, the application opens its pool, and the first repository query fails because \`purchase_order\` does not exist. A retry makes it pass. The initial reaction is often to increase a startup timeout, but that changes the deadline, not the ordering.

Build a phase timeline from evidence:

1. Container process began.
2. Database server accepted connections.
3. Entrypoint scripts began and ended, if used.
4. Testcontainers init hook returned, if used.
5. Migration command began and exited.
6. Schema verification query passed.
7. Application pool and HTTP server started.
8. Test sent its first request.

If step seven precedes step five, the application lifecycle is wrong. If step five reports success but step six fails, the migration target, schema search path, credentials, or history is wrong. If entrypoint logs are absent on a reused database volume, first-run initialization did not execute. None of those failures is fixed by a blind sleep.

Capture container logs and migration standard output when a phase fails. Print the JDBC URL with the password removed, current database name, current schema, migration history rows, and the exact verification mismatch. In a multi-schema database, “table missing” often means the object exists under a different schema than the connection’s search path.

Here is a small verifier that distinguishes connectivity from schema readiness:

\`\`\`java
static void verifySchema(PostgreSQLContainer<?> db) throws Exception {
  String sql = """
      SELECT COUNT(*)
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'purchase_order'
        AND column_name IN ('id', 'account_id', 'status')
      """;

  try (var connection = java.sql.DriverManager.getConnection(
           db.getJdbcUrl(), db.getUsername(), db.getPassword());
       var statement = connection.createStatement();
       var rows = statement.executeQuery(sql)) {
    rows.next();
    int actual = rows.getInt(1);
    if (actual != 3) {
      throw new IllegalStateException(
          "purchase_order schema incomplete, expected 3 required columns, got " + actual);
    }
  }
}
\`\`\`

This number is part of the explicit sample contract, not a performance claim. In a real project, verify column types, nullability, constraints, and migration version as required by the code being exercised.

## Handle container reuse and persistent volumes deliberately

Database entrypoint scripts commonly run only when the data directory is empty. That is useful in production and surprising in tests when local reuse or a mounted volume preserves state. If a newly added \`020-reference-data.sql\` never runs locally, inspect whether the container uses an existing data directory before blaming filename ordering.

For correctness tests, disposable storage is the cleanest default. If developers enable Testcontainers reuse for speed, state plainly that first-boot script changes require a fresh container. CI should normally begin from controlled disposable infrastructure. Never mount a developer’s real database path into a destructive test.

Migration-driven tests can intentionally reuse a database only when they verify and advance migration history. Even then, previous scenario rows can leak. A warm development mode is a convenience, not proof that a clean installation works. Keep at least one CI path that creates an empty database and applies every migration from the beginning.

There are two separate upgrade contracts worth testing:

- Clean install: empty database -> all migrations -> current verified schema.
- Upgrade: supported prior schema -> pending migrations -> current verified schema with preserved data.

Do not make one test stand in for both. A clean install cannot reveal an unsafe data transformation, and an upgraded personal database cannot prove a new deployment initializes correctly.

## Keep ordering safe under parallel test execution

Parallel tests should begin only after the shared schema barrier completes. In JUnit, a static container and a single \`@BeforeAll\` migration phase can work within one class. Across forked processes, each process should own a database or schema unless the build system provides a genuine one-time setup dependency.

Avoid a pattern where every test calls “ensure migrated” concurrently. Even migration tools with locking can create long waits, confusing failures, or a test reading between seed phases. Move migration into suite setup. Then give scenario fixtures unique business keys or isolated schemas.

Compose CI identifiers with braces so shell variable boundaries remain correct:

\`\`\`bash
export TEST_SCHEMA="qa_\${CI_PIPELINE_ID:-local}_\${CI_NODE_INDEX:-0}"
./gradlew integrationTest
\`\`\`

Validate any identifier before interpolating it into SQL because prepared-statement parameters do not represent table or schema identifiers. Prefer a fixed generated format and quote identifiers through the database library’s supported mechanism. Do not accept arbitrary branch names as raw schema names.

## Choose an ordering model with a decision record

| Repository situation | Recommended model | Reason |
|---|---|---|
| Small library with a tiny private schema | One \`withInitScript\` resource | Minimal moving parts |
| Custom database image behavior is under test | Numbered entrypoint resources | Exercises the image contract |
| Application ships versioned migrations | Real migration runner | Matches deployment semantics |
| Each case needs different records | Post-migration scenario fixtures | Keeps schema and examples separate |
| Multiple services share one database | One orchestrated migration owner | Prevents startup races |
| Browser suite needs prepared backend | Setup project or CI dependency after schema verifier | Establishes a clear barrier |

Record the owner, trigger, success signal, cleanup boundary, and failure artifacts in the test README. That small decision prevents future contributors from adding another “quick” initialization hook in a competing lifecycle.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when an AI coding agent needs a repeatable database-test review. Give the skill the repository’s chosen migration owner and readiness query so generated tests extend the existing sequence instead of inventing a second one.

Testcontainers init script ordering becomes straightforward once ordering is treated as a dependency graph rather than a timing problem. Put dependencies in one authoritative sequence, gate consumers on a verifiable final state, and preserve phase-specific evidence. Then a red build tells you whether boot, migration, seed, or application readiness failed, without asking engineers to guess which script happened to win.

## Frequently Asked Questions

### Does Testcontainers run multiple init scripts alphabetically?

Do not assume that as a universal Testcontainers rule. A database module’s \`withInitScript\` accepts a resource whose statements have their own source order. Alphabetical processing usually comes from a particular database image’s entrypoint directory, not from Testcontainers itself. For example, PostgreSQL image bootstrap behavior must be checked against the official image documentation. If multiple files matter, either use documented image semantics with fixed-width prefixes or let the project’s migration tool own ordering.

### Why did my copied init script stop running after I edited it?

The likely cause is persisted database state. Image entrypoint initialization commonly runs only when the database data directory is empty. A reused Testcontainers instance or mounted volume can therefore retain the old schema and skip new first-boot files. Confirm this in container logs and inspect the reuse configuration. For correctness runs, start with disposable storage. If local reuse is an intentional speed feature, document that bootstrap changes require a fresh container and preserve a clean-install CI job.

### Should seed data be placed in schema migrations?

Only immutable reference data that the application genuinely requires belongs naturally with versioned schema changes. Scenario records such as a customer with an expired card should be created by the test that uses them. Keeping scenario data outside migrations prevents hidden coupling, supports parallel execution, and makes intent visible. A useful split is migrations for schema, a controlled baseline for required reference rows, and per-test factories or APIs for mutable examples. Verify each phase before the next one starts.

### What is the strongest readiness check after database initialization?

Use a read-only query that represents the application’s actual schema contract. Check the applied migration version and the required tables, columns, constraints, or reference rows. A listening port proves only that the server accepts connections, and a database “ready” log can precede later migration work. Publish application health only after this verification succeeds. On failure, report the target database and schema plus the precise missing object, which turns an intermittent startup timeout into a direct initialization diagnosis.
`,
};
