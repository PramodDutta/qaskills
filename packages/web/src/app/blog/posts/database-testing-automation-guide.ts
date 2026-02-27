import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Database Testing -- Migrations, Queries, and Data Integrity Automation',
  description:
    'Complete guide to database testing automation. Covers migration testing, query performance, data integrity checks, Testcontainers, and AI agent database testing.',
  date: '2026-02-22',
  category: 'Guide',
  content: `
Data is the most valuable asset in any application, yet database changes are consistently the riskiest part of deployments. A botched migration can corrupt millions of rows in seconds. A missing index can silently degrade performance until your application buckles under load. Unlike application code bugs that can be fixed with a quick revert, **database testing** failures often result in data loss that is difficult or impossible to recover from. This guide covers everything you need to build a comprehensive database testing strategy -- from migration validation and query performance checks to data integrity automation and ephemeral test environments with Testcontainers.

## Key Takeaways

- **Database testing** catches the costliest production failures -- data corruption, migration rollbacks, and silent performance degradation
- **Database migration testing** should verify both forward (up) and backward (down) paths with realistic data volumes, not just empty schemas
- **Testcontainers** provide ephemeral, real database instances for tests, eliminating the inconsistencies of in-memory substitutes like SQLite
- **Query performance testing** with EXPLAIN ANALYZE and execution time budgets catches N+1 queries and missing indexes before they reach production
- **Data integrity testing** validates foreign keys, unique constraints, and cascading behavior at the application layer, not just the database layer
- AI agents equipped with specialized QA skills can generate migration tests, detect N+1 queries, and scaffold data integrity checks automatically

---

## Why Database Testing Is Critical

Data corruption is catastrophic and often irreversible. When application code breaks, you deploy a fix and move on. When a database migration corrupts data, you face hours of downtime, potential data loss, and a painful restoration process from backups -- if your backups are even current. The asymmetry between how easy it is to break a database and how hard it is to recover makes **database testing** one of the highest-value investments in your test suite.

Migration failures are among the leading causes of production outages. A migration that adds a NOT NULL column without a default value will fail on tables with existing rows. A migration that renames a column will break every query referencing the old name -- and those queries might live in application code that was not deployed simultaneously. These are not edge cases; they are common mistakes that happen on every team.

**Schema drift between environments** is another silent killer. When your development database schema diverges from staging or production, you get tests that pass locally but fail in deployment. This happens when developers apply migrations manually, skip migrations, or modify schemas directly. Without automated schema validation, drift accumulates until a deployment fails spectacularly.

N+1 query problems degrade performance silently. Your application works perfectly with 10 rows in development, but in production with 100,000 rows, a single page load generates 100,001 database queries. These problems are nearly invisible without deliberate query performance testing. By the time users report slowness, the issue has been in production for weeks.

Referential integrity violations -- orphaned records, dangling foreign keys, and constraint violations -- corrupt your data model in ways that surface as bizarre application bugs. A user references an order that references a product that no longer exists. The error message is meaningless, the debugging is painful, and the root cause is a missing CASCADE rule that was never tested.

---

## Types of Database Tests

A comprehensive database testing strategy covers multiple layers. Each test type targets a specific category of failures and runs at a different stage of your pipeline.

| Test Type | What It Verifies | When to Run |
|---|---|---|
| **Migration tests** | Migrations apply and rollback cleanly | Every PR that adds a migration |
| **Schema validation** | Schema matches expected state after migration | CI pipeline, pre-deployment |
| **Data integrity** | Foreign keys, constraints, and cascading rules | Nightly or on data-touching changes |
| **Query correctness** | Queries return expected results for given inputs | Unit/integration test suites |
| **Performance / query plans** | Query execution time and index usage | CI pipeline with threshold gates |
| **Seed data validation** | Seed scripts produce valid, consistent data | After seed script changes |
| **Rollback testing** | Migrations can be reversed without data loss | Before production deployments |

**Migration tests** are the foundation. Every migration should be tested both forward and backward to ensure you can recover from a failed deployment. **Schema validation** tests compare your actual database schema against the expected schema defined by your ORM or migration files -- catching drift before it causes failures.

**Data integrity tests** go beyond what the database engine enforces. Your application code may create records in a specific order, assume relationships exist, or depend on unique constraints. Testing these assumptions prevents the subtle data corruption that only surfaces weeks later. **Query correctness tests** verify that your queries return the right data, especially for complex joins, aggregations, and window functions.

**Performance testing** ensures that queries meet execution time budgets and use indexes efficiently. **Seed data validation** catches errors in your development setup scripts. **Rollback testing** gives you confidence that you can undo a migration without data loss -- critical for zero-downtime deployments.

---

## Migration Testing

Migration testing verifies that your database schema changes apply correctly, can be reversed, and work with realistic data. This is the most important category of database testing because migration failures directly cause production outages.

### Testing Forward and Backward Migrations

Every migration should be tested in both directions. A forward (up) migration that adds a column is easy to test -- run it, verify the column exists. But the rollback (down) migration is equally important. If your deployment fails halfway through, you need to know that rolling back will leave the database in a consistent state.

\`\`\`typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';

describe('database migrations', () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    db = drizzle(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should apply all migrations without errors', async () => {
    await expect(
      migrate(db, { migrationsFolder: './src/db/migrations' })
    ).resolves.not.toThrow();
  });

  it('should have the expected tables after migration', async () => {
    const result = await db.execute(sql\`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    \`);

    const tableNames = result.rows.map((r: any) => r.table_name);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('skills');
    expect(tableNames).toContain('categories');
  });

  it('should create correct column types', async () => {
    const result = await db.execute(sql\`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'skills'
      ORDER BY ordinal_position
    \`);

    const columns = result.rows as any[];
    const nameCol = columns.find((c) => c.column_name === 'name');
    expect(nameCol.data_type).toBe('character varying');
    expect(nameCol.is_nullable).toBe('NO');
  });
});
\`\`\`

### Testing with Realistic Data Volumes

A migration that works on an empty table may fail catastrophically on a table with millions of rows. Adding a column with a default value on a large table can lock it for minutes. Changing a column type may fail if existing data cannot be cast. Always test migrations against tables seeded with realistic data volumes.

\`\`\`typescript
it('should handle migration on table with existing data', async () => {
  // Seed realistic volume before migration
  await db.execute(sql\`
    INSERT INTO users (name, email, created_at)
    SELECT
      'User ' || generate_series,
      'user' || generate_series || '@test.com',
      NOW() - (generate_series || ' days')::interval
    FROM generate_series(1, 10000)
  \`);

  // Apply the new migration
  await expect(
    migrate(db, { migrationsFolder: './src/db/migrations' })
  ).resolves.not.toThrow();

  // Verify existing data was not corrupted
  const count = await db.execute(sql\`SELECT COUNT(*) FROM users\`);
  expect(Number(count.rows[0].count)).toBe(10000);
});
\`\`\`

### Testing Migration Idempotency

Migrations should be idempotent -- running them twice should not cause errors. This is critical for recovery scenarios where a migration may have partially applied before failing. Your migration runner should track which migrations have been applied, and re-running should be a no-op for already-applied migrations.

---

## Testcontainers for Database Testing

**Testcontainers** is a library that provides lightweight, throwaway Docker containers for your test suites. Instead of mocking your database or using an in-memory substitute like SQLite, Testcontainers spins up a real PostgreSQL (or MySQL, MongoDB, etc.) instance in Docker, runs your tests against it, and tears it down when tests complete.

### Why Testcontainers Over In-Memory Databases

Using SQLite as a stand-in for PostgreSQL is a common shortcut that leads to false confidence. SQLite lacks PostgreSQL-specific features like JSONB operators, array types, window functions, CTEs with materialization hints, and partial indexes. Tests that pass against SQLite can fail against PostgreSQL in production because the SQL dialects differ in subtle but important ways.

| Approach | Fidelity | Speed | Setup Complexity | CI/CD Support |
|---|---|---|---|---|
| **SQLite in-memory** | Low -- different SQL dialect | Very fast | Minimal | Easy |
| **Shared test database** | High | Medium | Manual setup | Fragile |
| **Testcontainers** | Full -- real engine | Fast | Docker required | Excellent |
| **Cloud dev database** | Full | Slow (network) | Account needed | Good |

Testcontainers gives you the **full fidelity** of your production database engine with the **isolation** of a fresh instance per test suite. Each test run starts with a clean database, eliminating test interdependencies and flaky failures caused by leftover data.

### Complete Testcontainers Setup

\`\`\`typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

describe('user repository with Testcontainers', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    // Start a real PostgreSQL container
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('testdb')
      .withUsername('testuser')
      .withPassword('testpass')
      .start();

    // Connect using the container's dynamic port
    pool = new Pool({
      connectionString: container.getConnectionUri(),
    });
    db = drizzle(pool);

    // Run all migrations to set up schema
    await migrate(db, { migrationsFolder: './src/db/migrations' });
  }, 60000); // Container startup can take up to 60s

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it('should insert and retrieve a user', async () => {
    const [inserted] = await db
      .insert(users)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        clerkId: 'clerk_test_123',
      })
      .returning();

    expect(inserted.id).toBeDefined();
    expect(inserted.name).toBe('Test User');

    const [found] = await db
      .select()
      .from(users)
      .where(eq(users.id, inserted.id));

    expect(found.email).toBe('test@example.com');
  });

  it('should enforce unique email constraint', async () => {
    await db.insert(users).values({
      name: 'First User',
      email: 'duplicate@example.com',
      clerkId: 'clerk_first',
    });

    await expect(
      db.insert(users).values({
        name: 'Second User',
        email: 'duplicate@example.com',
        clerkId: 'clerk_second',
      })
    ).rejects.toThrow(/unique/i);
  });
});
\`\`\`

The key advantage is that this test runs against real PostgreSQL. If your production database is PostgreSQL 16, your tests run against PostgreSQL 16. Every JSONB query, every array operator, every constraint behaves exactly as it will in production. When the test suite finishes, the container is destroyed automatically -- no cleanup scripts, no shared state, no flaky tests.

---

## Query Performance Testing

Performance problems in database queries are among the most insidious bugs because they manifest gradually. A query that runs in 5ms with 100 rows takes 5 seconds with 100,000 rows. By the time anyone notices, the slow query has been in production for weeks. **Query performance testing** catches these issues in your test suite before they reach users.

### EXPLAIN ANALYZE for Query Plan Verification

PostgreSQL's EXPLAIN ANALYZE command executes a query and returns the actual execution plan, including time spent at each step, the number of rows processed, and whether indexes were used.

\`\`\`typescript
it('should use index scan for user lookup by email', async () => {
  const result = await db.execute(sql\`
    EXPLAIN (ANALYZE, FORMAT JSON)
    SELECT * FROM users WHERE email = 'test@example.com'
  \`);

  const plan = result.rows[0]['QUERY PLAN'][0]['Plan'];

  // Verify the query uses an index scan, not a sequential scan
  expect(plan['Node Type']).toBe('Index Scan');
  expect(plan['Index Name']).toContain('email');

  // Verify execution time is under budget
  const executionTime = result.rows[0]['QUERY PLAN'][0]['Execution Time'];
  expect(executionTime).toBeLessThan(10); // Less than 10ms
});
\`\`\`

### Detecting N+1 Queries Programmatically

N+1 queries are the most common performance anti-pattern in ORM-heavy applications. You load a list of items (1 query), then for each item, you load a related record (N queries). The fix is usually a JOIN or eager loading, but first you need to detect the problem.

\`\`\`typescript
class QueryCounter {
  private count = 0;
  private queries: string[] = [];

  increment(query: string) {
    this.count++;
    this.queries.push(query);
  }

  getCount() {
    return this.count;
  }

  getQueries() {
    return this.queries;
  }

  reset() {
    this.count = 0;
    this.queries = [];
  }
}

// In your test setup, instrument the database client
const queryCounter = new QueryCounter();

it('should load users with skills in 2 queries or fewer', async () => {
  queryCounter.reset();

  // Seed 50 users, each with 3 skills
  await seedUsersWithSkills(db, 50, 3);

  // Execute the function under test
  const usersWithSkills = await getUsersWithSkills(db);

  // Assert no N+1: should be 1-2 queries, not 51+
  expect(queryCounter.getCount()).toBeLessThanOrEqual(2);
  expect(usersWithSkills).toHaveLength(50);
});
\`\`\`

### Setting Query Time Budgets

Define explicit performance budgets for your most critical queries. These act as regression gates -- if a code change causes a query to exceed its budget, the test fails.

\`\`\`typescript
const QUERY_BUDGETS: Record<string, number> = {
  'skills.search': 50,       // 50ms max
  'skills.getById': 10,      // 10ms max
  'leaderboard.top100': 100, // 100ms max
  'users.dashboard': 30,     // 30ms max
};

async function assertQueryPerformance(
  db: any,
  queryName: string,
  queryFn: () => Promise<any>
) {
  const start = performance.now();
  await queryFn();
  const elapsed = performance.now() - start;

  const budget = QUERY_BUDGETS[queryName];
  expect(elapsed).toBeLessThan(budget);
}
\`\`\`

### Index Coverage Verification

You can programmatically verify that all expected indexes exist and are being used. This prevents the common scenario where someone drops an index during a migration refactor and nobody notices until production slows down.

\`\`\`typescript
it('should have all required indexes', async () => {
  const result = await db.execute(sql\`
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  \`);

  const indexes = result.rows.map((r: any) => r.indexname);

  expect(indexes).toContain('idx_skills_author');
  expect(indexes).toContain('idx_skills_created_at');
  expect(indexes).toContain('idx_installs_skill_id');
  expect(indexes).toContain('idx_reviews_skill_id');
});
\`\`\`

---

## Data Integrity Testing

Data integrity testing verifies that your database constraints and application logic work together to maintain consistent, valid data. While the database engine enforces constraints at the schema level, your application code must also respect these rules -- and testing both layers catches bugs that either layer alone would miss.

### Testing Constraints at the Application Layer

\`\`\`typescript
describe('data integrity', () => {
  it('should prevent orphaned skill reviews', async () => {
    // Attempt to create a review for a non-existent skill
    await expect(
      db.insert(reviews).values({
        skillId: 'non-existent-skill-id',
        userId: validUserId,
        rating: 5,
        comment: 'Great skill!',
      })
    ).rejects.toThrow(/foreign key/i);
  });

  it('should cascade delete reviews when skill is deleted', async () => {
    // Create a skill with reviews
    const [skill] = await db.insert(skills).values({
      name: 'Test Skill',
      slug: 'test-skill',
      author: 'tester',
    }).returning();

    await db.insert(reviews).values({
      skillId: skill.id,
      userId: validUserId,
      rating: 4,
      comment: 'Nice',
    });

    // Delete the skill
    await db.delete(skills).where(eq(skills.id, skill.id));

    // Reviews should be cascade deleted
    const remainingReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.skillId, skill.id));

    expect(remainingReviews).toHaveLength(0);
  });
});
\`\`\`

### Orphaned Record Detection

Over time, application bugs and incomplete transactions can leave orphaned records in your database. These are rows that reference records which no longer exist. Running orphan detection queries as part of your test suite catches these issues early.

\`\`\`sql
-- Find orphaned reviews (reviews pointing to deleted skills)
SELECT r.id, r.skill_id
FROM reviews r
LEFT JOIN skills s ON r.skill_id = s.id
WHERE s.id IS NULL;

-- Find orphaned skill_categories (junction table entries with missing parents)
SELECT sc.skill_id, sc.category_id
FROM skill_categories sc
LEFT JOIN skills s ON sc.skill_id = s.id
LEFT JOIN categories c ON sc.category_id = c.id
WHERE s.id IS NULL OR c.id IS NULL;

-- Find users with preferences but no user record
SELECT up.user_id
FROM user_preferences up
LEFT JOIN users u ON up.user_id = u.id
WHERE u.id IS NULL;
\`\`\`

### Testing Unique Constraints and Check Constraints

\`\`\`typescript
it('should enforce unique slug constraint on skills', async () => {
  await db.insert(skills).values({
    name: 'Original Skill',
    slug: 'unique-slug',
    author: 'author1',
  });

  await expect(
    db.insert(skills).values({
      name: 'Different Name',
      slug: 'unique-slug',
      author: 'author2',
    })
  ).rejects.toThrow(/unique/i);
});

it('should enforce rating range check constraint', async () => {
  await expect(
    db.insert(reviews).values({
      skillId: validSkillId,
      userId: validUserId,
      rating: 6, // Invalid: max is 5
      comment: 'Too high',
    })
  ).rejects.toThrow(/check/i);
});
\`\`\`

---

## Testing with ORMs

Modern applications rarely write raw SQL. Instead, they use ORMs like Drizzle, Prisma, TypeORM, or Sequelize to abstract database interactions. ORM-specific **database testing** patterns ensure that your queries generate efficient SQL and return correct results.

### Drizzle ORM Testing Patterns

Drizzle is a TypeScript ORM with a SQL-like query builder that gives you full control over generated queries. Testing Drizzle queries involves verifying both correctness and efficiency.

\`\`\`typescript
it('should generate efficient query for skill search', async () => {
  const query = db
    .select()
    .from(skills)
    .where(
      and(
        ilike(skills.name, '%playwright%'),
        sql\`\${skills.tags} @> '["e2e"]'::jsonb\`
      )
    )
    .limit(20)
    .toSQL();

  // Verify the query uses parameterized values (SQL injection safe)
  expect(query.params).toContain('%playwright%');

  // Verify LIMIT is applied at the SQL level
  expect(query.sql).toContain('LIMIT');
});
\`\`\`

### Prisma Testing Patterns

Prisma generates a type-safe client from your schema. Testing Prisma queries often involves verifying that the generated SQL is efficient and that relations are loaded correctly.

\`\`\`typescript
it('should eager-load skill categories in a single query', async () => {
  const skill = await prisma.skill.findUnique({
    where: { slug: 'playwright-e2e' },
    include: { categories: true, reviews: true },
  });

  expect(skill).toBeDefined();
  expect(skill?.categories).toBeDefined();
  expect(skill?.reviews).toBeDefined();
  // Prisma generates a JOIN here, not separate queries
});
\`\`\`

### Mocking vs Real Database in Unit Tests

| Approach | Use When | Advantages | Disadvantages |
|---|---|---|---|
| **Real database (Testcontainers)** | Integration/E2E tests, migration tests | Full fidelity, catches real SQL issues | Slower, requires Docker |
| **In-memory database** | Quick iteration, simple queries | Fast, no external dependencies | Different SQL dialect, false confidence |
| **Repository mocking** | Unit tests for business logic | Very fast, isolated | Does not test SQL at all |
| **Snapshot testing** | Detecting unintended query changes | Catches regressions | Brittle if queries change often |

The best strategy is a layered approach. Use **mocked repositories** for unit testing business logic that happens to touch the database. Use **Testcontainers** for integration tests that verify SQL correctness, constraint enforcement, and query performance. Reserve **in-memory databases** for rapid prototyping only, not for your CI pipeline.

---

## CI/CD Integration

Database testing must run automatically in your CI/CD pipeline to prevent regressions. The most common approach uses Testcontainers in GitHub Actions, which provides Docker support out of the box.

### Testcontainers in GitHub Actions

\`\`\`yaml
name: Database Tests
on:
  pull_request:
    paths:
      - 'src/db/**'
      - 'drizzle.config.ts'

jobs:
  database-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run migration tests
        run: pnpm test -- --filter='**/db/**'
        env:
          TESTCONTAINERS_RYUK_DISABLED: 'false'

      - name: Run schema validation
        run: pnpm drizzle-kit check

      - name: Run query performance tests
        run: pnpm test -- --filter='**/performance/**'
\`\`\`

### Migration Testing as Deployment Gate

Make migration testing a required check before any deployment. If migrations fail against a realistic dataset, the deployment is blocked. This prevents the scenario where a migration works in CI with an empty database but fails in production with millions of rows.

For schema diff tools, **Drizzle Kit** provides \`drizzle-kit check\` and \`drizzle-kit generate\` to compare your TypeScript schema against the actual database state. **Prisma** offers \`prisma migrate diff\` for similar functionality. These tools catch schema drift between environments before it causes deployment failures.

For more on integrating database tests into your deployment pipeline, see our [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions).

---

## Automate Database Testing with AI Agents

Writing comprehensive database tests manually is tedious. AI coding agents can generate migration tests, detect performance issues, and scaffold integrity checks -- but they need specialized QA knowledge to do it well. **QASkills** provides installable skills that give your AI agent expert-level database testing capabilities.

Install database testing skills with a single command:

\`\`\`bash
npx @qaskills/cli add database-migration-test-generator
\`\`\`

This skill teaches your AI agent to automatically generate migration tests for every schema change, including forward/backward verification and realistic data volume testing.

Detect N+1 queries automatically:

\`\`\`bash
npx @qaskills/cli add n-plus-one-query-detector
\`\`\`

This skill instruments your test suite to count database queries per operation and flag N+1 patterns before they reach production.

Other skills that complement your database testing strategy:

- **\`stale-cache-finder\`** -- Detects cache invalidation issues that cause stale data reads after database updates
- **\`test-data-factory\`** -- Generates realistic, constraint-respecting test data for seeding your test database
- **\`api-testing-rest\`** -- Tests your API endpoints end-to-end, including the database layer, to verify that REST operations produce correct data

Browse all available skills at [qaskills.sh/skills](/skills) or get started with our [installation guide](/getting-started).

For related testing strategies, see our guides on [API testing](/blog/api-testing-complete-guide), [CI/CD pipeline integration](/blog/cicd-testing-pipeline-github-actions), and [shift-left testing with AI agents](/blog/shift-left-testing-ai-agents).

---

## Frequently Asked Questions

### Should I use Testcontainers or SQLite for database testing?

Use **Testcontainers** for any test that needs to verify SQL behavior, constraint enforcement, or query performance. Testcontainers runs a real instance of your production database engine (PostgreSQL, MySQL, etc.), so you get full fidelity. SQLite uses a different SQL dialect, lacks JSONB support, handles type coercion differently, and does not support many PostgreSQL-specific features. Tests that pass against SQLite may fail against PostgreSQL in production. The only scenario where SQLite makes sense is rapid prototyping when you do not need database-level accuracy.

### How do I test database migrations safely?

Follow a three-step process. First, run the migration forward on a test database seeded with realistic data volumes -- not just an empty schema. Verify that the schema matches expectations and that existing data was not corrupted. Second, run the rollback (down) migration and verify the schema returns to its previous state. Third, run the forward migration again to verify idempotency. Use Testcontainers to get a fresh database instance for each test run, ensuring no leftover state from previous tests. Always test migrations in CI before deploying to any shared environment.

### How do I detect N+1 queries in my application?

Instrument your database client to count queries during test execution. Create a query counter middleware that increments on each query. Then, in your tests, reset the counter before executing an operation and assert that the query count is within your expected budget. For example, loading a list of 50 users with their associated skills should require 1-2 queries (a JOIN or two SELECTs), not 51 queries. Tools like \`pg-query-stream\` and ORM-specific logging (Drizzle's \`logger\` option, Prisma's \`log: ['query']\`) make it easy to capture and count queries.

### Should I mock the database in my tests?

It depends on what you are testing. For **unit tests** of business logic that happens to call the database, mocking the repository layer is appropriate -- you are testing the logic, not the SQL. For **integration tests** that verify query correctness, constraint enforcement, or migration behavior, you must use a real database. Mocking the database in integration tests gives you false confidence because you are testing your mocks, not your SQL. The best approach is a layered test strategy: mock for unit tests, real database (via Testcontainers) for integration tests, and real database with realistic data for performance tests.

### How do I test stored procedures and database functions?

Treat stored procedures like any other code -- write tests that call the procedure with known inputs and assert the outputs. Use Testcontainers to get a fresh database, create the stored procedure via migration, seed the required data, call the procedure, and verify the results. For procedures that modify data, verify both the return value and the state of the affected tables. For procedures with side effects (triggers, notifications), verify those side effects occurred. If your procedures use cursors or temporary tables, ensure your tests cover edge cases like empty result sets and large datasets.
`,
};
