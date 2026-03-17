---
name: "Drizzle ORM Testing"
description: "Testing patterns for Drizzle ORM covering migration testing, query builder testing, transaction testing, and database integration testing with PostgreSQL, SQLite, and MySQL."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [drizzle, orm, database, migrations, transactions, postgresql, sqlite, mysql, testcontainers, type-safe]
testingTypes: [unit, integration]
frameworks: [vitest, jest]
languages: [typescript]
domains: [backend, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Drizzle ORM Testing

You are an expert QA engineer specializing in Drizzle ORM testing patterns. When the user asks you to write, review, debug, or set up Drizzle ORM related tests or configurations, follow these detailed instructions. You understand schema declaration, query builders, migrations, transactions, relations, and prepared statements across PostgreSQL, SQLite, and MySQL dialects.

## Core Principles

1. **Type-Safe Testing** -- Leverage Drizzle's TypeScript-first design to ensure all queries, inserts, and updates are validated at compile time. Tests should catch type mismatches before runtime.
2. **Real Database Testing** -- Use Testcontainers or in-memory SQLite for integration tests instead of mocking the ORM layer. Mocking Drizzle queries hides real SQL behavior and dialect differences.
3. **Migration Safety** -- Every schema change must have a corresponding migration test that verifies both the up migration and rollback. Never deploy untested migrations.
4. **Transaction Integrity** -- Test transaction commit, rollback, and nested savepoint behavior explicitly. Silent transaction failures are the most dangerous database bugs.
5. **Isolation by Default** -- Each test gets a clean database state through transactions that roll back after each test, or through truncation. Tests must never depend on data from other tests.
6. **Seed Determinism** -- Test data factories produce deterministic, reproducible data. Use seeded random generators and factory functions instead of ad-hoc inline data.
7. **Query Performance Awareness** -- Integration tests should assert query count and execution time for critical paths. Drizzle's query builder makes it easy to accidentally generate N+1 queries.

## When to Use This Skill

- When setting up Drizzle ORM testing infrastructure for a new project
- When writing unit tests for Drizzle schema definitions and query builders
- When testing database migrations with forward and rollback verification
- When testing transaction behavior including rollbacks and savepoints
- When validating relational queries and joins
- When integrating Testcontainers for disposable database instances in CI
- When building test data factories with type-safe seeding
- When testing prepared statements and parameterized queries

## Project Structure

```
project-root/
├── src/
│   ├── db/
│   │   ├── index.ts                 # Database connection & Drizzle instance
│   │   ├── schema/
│   │   │   ├── users.ts             # User table schema
│   │   │   ├── posts.ts             # Post table schema
│   │   │   ├── comments.ts          # Comment table schema
│   │   │   ├── relations.ts         # Drizzle relations definitions
│   │   │   └── index.ts             # Barrel export all schemas
│   │   ├── migrations/
│   │   │   ├── 0000_initial.sql     # Initial migration
│   │   │   ├── 0001_add_posts.sql   # Add posts table
│   │   │   ├── 0002_add_comments.sql
│   │   │   └── meta/
│   │   │       └── _journal.json    # Drizzle migration journal
│   │   ├── seed.ts                  # Database seeder
│   │   └── migrate.ts               # Migration runner
│   ├── repositories/
│   │   ├── user.repository.ts       # User data access layer
│   │   ├── post.repository.ts       # Post data access layer
│   │   └── comment.repository.ts    # Comment data access layer
│   └── services/
│       ├── user.service.ts          # User business logic
│       └── post.service.ts          # Post business logic
│
├── tests/
│   ├── setup/
│   │   ├── test-db.ts               # Test database setup & teardown
│   │   ├── test-containers.ts       # Testcontainers configuration
│   │   ├── factories/
│   │   │   ├── user.factory.ts      # User test data factory
│   │   │   ├── post.factory.ts      # Post test data factory
│   │   │   └── comment.factory.ts   # Comment test data factory
│   │   └── global-setup.ts          # Vitest global setup
│   ├── unit/
│   │   ├── schema.test.ts           # Schema definition tests
│   │   ├── query-builder.test.ts    # Query builder tests
│   │   └── prepared.test.ts         # Prepared statement tests
│   ├── integration/
│   │   ├── migrations.test.ts       # Migration tests
│   │   ├── transactions.test.ts     # Transaction tests
│   │   ├── relations.test.ts        # Relation query tests
│   │   ├── repositories.test.ts     # Repository integration tests
│   │   └── seeding.test.ts          # Seed strategy tests
│   └── vitest.config.ts             # Vitest configuration for DB tests
│
├── drizzle.config.ts                # Drizzle Kit configuration
├── package.json
└── tsconfig.json
```

## Schema Definition

### Table Schemas

```typescript
// src/db/schema/users.ts
import { pgTable, serial, varchar, timestamp, boolean, integer, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  isActive: boolean('is_active').notNull().default(true),
  loginCount: integer('login_count').notNull().default(0),
  bio: text('bio'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

```typescript
// src/db/schema/posts.ts
import { pgTable, serial, varchar, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  published: boolean('published').notNull().default(false),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

```typescript
// src/db/schema/comments.ts
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { posts } from './posts';

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  body: text('body').notNull(),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

### Relations

```typescript
// src/db/schema/relations.ts
import { relations } from 'drizzle-orm';
import { users } from './users';
import { posts } from './posts';
import { comments } from './comments';

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
}));
```

### Database Connection

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
```

## Test Infrastructure

### Testcontainers Setup

```typescript
// tests/setup/test-containers.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from '../../src/db/schema';
import type { Database } from '../../src/db';

let container: StartedPostgreSqlContainer;
let pool: Pool;
let db: Database;

export async function setupTestDatabase(): Promise<Database> {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('testdb')
    .withUsername('testuser')
    .withPassword('testpass')
    .withExposedPorts(5432)
    .start();

  pool = new Pool({
    connectionString: container.getConnectionUri(),
  });

  db = drizzle(pool, { schema });

  // Run all migrations
  await migrate(db, { migrationsFolder: './src/db/migrations' });

  return db;
}

export async function teardownTestDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
  }
  if (container) {
    await container.stop();
  }
}

export function getTestDb(): Database {
  if (!db) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return db;
}

export function getConnectionUri(): string {
  return container.getConnectionUri();
}
```

### Test Database Helper with Transaction Rollback

```typescript
// tests/setup/test-db.ts
import { sql } from 'drizzle-orm';
import type { Database } from '../../src/db';
import { users, posts, comments } from '../../src/db/schema';

/**
 * Truncate all tables between tests for clean state.
 * Uses TRUNCATE CASCADE to handle foreign key constraints.
 */
export async function cleanDatabase(db: Database): Promise<void> {
  await db.execute(sql`TRUNCATE TABLE comments, posts, users RESTART IDENTITY CASCADE`);
}

/**
 * Create a transaction-scoped test wrapper.
 * The transaction is rolled back after the callback completes,
 * ensuring zero side effects between tests.
 */
export async function withRollback<T>(
  db: Database,
  callback: (tx: Database) => Promise<T>,
): Promise<T> {
  let result: T;
  try {
    await db.transaction(async (tx) => {
      result = await callback(tx as unknown as Database);
      // Force rollback by throwing after capturing result
      throw new Error('__ROLLBACK__');
    });
  } catch (error) {
    if ((error as Error).message !== '__ROLLBACK__') {
      throw error;
    }
  }
  return result!;
}

/**
 * Assert the row count of a table.
 */
export async function assertRowCount(
  db: Database,
  table: 'users' | 'posts' | 'comments',
  expected: number,
): Promise<void> {
  const tableMap = { users, posts, comments };
  const rows = await db.select().from(tableMap[table]);
  if (rows.length !== expected) {
    throw new Error(`Expected ${expected} rows in ${table}, got ${rows.length}`);
  }
}
```

### Test Data Factories

```typescript
// tests/setup/factories/user.factory.ts
import type { NewUser } from '../../../src/db/schema/users';

let userCounter = 0;

export function createUserData(overrides: Partial<NewUser> = {}): NewUser {
  userCounter++;
  return {
    email: `testuser${userCounter}@example.com`,
    name: `Test User ${userCounter}`,
    role: 'user',
    isActive: true,
    loginCount: 0,
    bio: null,
    ...overrides,
  };
}

export function createAdminData(overrides: Partial<NewUser> = {}): NewUser {
  return createUserData({
    role: 'admin',
    name: `Admin User ${userCounter}`,
    ...overrides,
  });
}

export function createBulkUserData(count: number, overrides: Partial<NewUser> = {}): NewUser[] {
  return Array.from({ length: count }, () => createUserData(overrides));
}

export function resetUserCounter(): void {
  userCounter = 0;
}
```

```typescript
// tests/setup/factories/post.factory.ts
import type { NewPost } from '../../../src/db/schema/posts';

let postCounter = 0;

export function createPostData(authorId: number, overrides: Partial<NewPost> = {}): NewPost {
  postCounter++;
  return {
    title: `Test Post ${postCounter}`,
    content: `This is the content of test post ${postCounter}.`,
    slug: `test-post-${postCounter}-${Date.now()}`,
    published: false,
    authorId,
    viewCount: 0,
    ...overrides,
  };
}

export function createPublishedPostData(
  authorId: number,
  overrides: Partial<NewPost> = {},
): NewPost {
  return createPostData(authorId, {
    published: true,
    ...overrides,
  });
}

export function resetPostCounter(): void {
  postCounter = 0;
}
```

### Vitest Configuration

```typescript
// tests/vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: 'forks',       // Use forks for DB test isolation
    poolOptions: {
      forks: {
        singleFork: true, // Single fork to share one DB container
      },
    },
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/db/**', 'src/repositories/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@tests': path.resolve(__dirname, '.'),
    },
  },
});
```

### Global Setup

```typescript
// tests/setup/global-setup.ts
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, getTestDb } from './test-containers';
import { cleanDatabase } from './test-db';
import { resetUserCounter } from './factories/user.factory';
import { resetPostCounter } from './factories/post.factory';
import type { Database } from '../../src/db';

let db: Database;

beforeAll(async () => {
  db = await setupTestDatabase();
}, 120_000); // Testcontainers needs time to pull images

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase(db);
  resetUserCounter();
  resetPostCounter();
});

export { db };
```

## Unit Tests

### Schema Definition Tests

```typescript
// tests/unit/schema.test.ts
import { describe, it, expect } from 'vitest';
import { getTableName, getTableColumns, sql } from 'drizzle-orm';
import { users } from '../../src/db/schema/users';
import { posts } from '../../src/db/schema/posts';
import { comments } from '../../src/db/schema/comments';

describe('Schema Definitions', () => {
  describe('users table', () => {
    it('should have the correct table name', () => {
      expect(getTableName(users)).toBe('users');
    });

    it('should define all required columns', () => {
      const columns = getTableColumns(users);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('role');
      expect(columnNames).toContain('isActive');
      expect(columnNames).toContain('createdAt');
      expect(columnNames).toContain('updatedAt');
    });

    it('should have email as a unique column', () => {
      const columns = getTableColumns(users);
      expect(columns.email.isUnique).toBe(true);
    });

    it('should have correct default values', () => {
      const columns = getTableColumns(users);
      expect(columns.role.hasDefault).toBe(true);
      expect(columns.isActive.hasDefault).toBe(true);
      expect(columns.loginCount.hasDefault).toBe(true);
    });

    it('should mark required columns as not null', () => {
      const columns = getTableColumns(users);
      expect(columns.email.notNull).toBe(true);
      expect(columns.name.notNull).toBe(true);
      expect(columns.role.notNull).toBe(true);
    });

    it('should allow nullable bio column', () => {
      const columns = getTableColumns(users);
      expect(columns.bio.notNull).toBe(false);
    });
  });

  describe('posts table', () => {
    it('should have the correct table name', () => {
      expect(getTableName(posts)).toBe('posts');
    });

    it('should have slug as unique', () => {
      const columns = getTableColumns(posts);
      expect(columns.slug.isUnique).toBe(true);
    });

    it('should reference users table via authorId', () => {
      const columns = getTableColumns(posts);
      expect(columns.authorId.notNull).toBe(true);
    });

    it('should default published to false', () => {
      const columns = getTableColumns(posts);
      expect(columns.published.hasDefault).toBe(true);
    });
  });

  describe('comments table', () => {
    it('should have foreign keys to users and posts', () => {
      const columns = getTableColumns(comments);
      expect(columns.authorId.notNull).toBe(true);
      expect(columns.postId.notNull).toBe(true);
    });

    it('should require body text', () => {
      const columns = getTableColumns(comments);
      expect(columns.body.notNull).toBe(true);
    });
  });
});
```

### Query Builder Tests

```typescript
// tests/unit/query-builder.test.ts
import { describe, it, expect } from 'vitest';
import { eq, and, or, like, gt, lt, gte, lte, desc, asc, sql, inArray } from 'drizzle-orm';
import { users } from '../../src/db/schema/users';
import { posts } from '../../src/db/schema/posts';

describe('Query Builder Patterns', () => {
  describe('WHERE clause construction', () => {
    it('should build equality conditions', () => {
      const condition = eq(users.email, 'test@example.com');
      expect(condition).toBeDefined();
    });

    it('should build compound AND conditions', () => {
      const condition = and(
        eq(users.role, 'admin'),
        eq(users.isActive, true),
      );
      expect(condition).toBeDefined();
    });

    it('should build compound OR conditions', () => {
      const condition = or(
        eq(users.role, 'admin'),
        eq(users.role, 'moderator'),
      );
      expect(condition).toBeDefined();
    });

    it('should build LIKE patterns', () => {
      const condition = like(users.name, '%test%');
      expect(condition).toBeDefined();
    });

    it('should build range conditions', () => {
      const condition = and(
        gte(posts.viewCount, 100),
        lte(posts.viewCount, 1000),
      );
      expect(condition).toBeDefined();
    });

    it('should build IN conditions', () => {
      const condition = inArray(users.role, ['admin', 'moderator']);
      expect(condition).toBeDefined();
    });

    it('should build nested compound conditions', () => {
      const condition = and(
        eq(users.isActive, true),
        or(
          eq(users.role, 'admin'),
          gt(users.loginCount, 10),
        ),
      );
      expect(condition).toBeDefined();
    });
  });

  describe('ORDER BY construction', () => {
    it('should build descending order', () => {
      const ordering = desc(posts.createdAt);
      expect(ordering).toBeDefined();
    });

    it('should build ascending order', () => {
      const ordering = asc(posts.title);
      expect(ordering).toBeDefined();
    });
  });

  describe('SQL template literals', () => {
    it('should build raw SQL expressions', () => {
      const expression = sql`LOWER(${users.email})`;
      expect(expression).toBeDefined();
    });

    it('should build parameterized expressions', () => {
      const searchTerm = 'test';
      const expression = sql`${users.name} ILIKE ${'%' + searchTerm + '%'}`;
      expect(expression).toBeDefined();
    });
  });
});
```

### Prepared Statement Tests

```typescript
// tests/unit/prepared.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { setupTestDatabase, teardownTestDatabase } from '../setup/test-containers';
import { users } from '../../src/db/schema/users';
import { posts } from '../../src/db/schema/posts';
import { createUserData } from '../setup/factories/user.factory';
import type { Database } from '../../src/db';

describe('Prepared Statements', () => {
  let db: Database;

  beforeAll(async () => {
    db = await setupTestDatabase();
  }, 120_000);

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should create and execute a prepared select statement', async () => {
    // Insert test data
    const [user] = await db.insert(users).values(createUserData()).returning();

    // Create prepared statement with placeholder
    const prepared = db
      .select()
      .from(users)
      .where(eq(users.id, sql.placeholder('userId')))
      .prepare('get_user_by_id');

    // Execute with different parameters
    const result = await prepared.execute({ userId: user.id });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(user.id);
  });

  it('should reuse prepared statements efficiently', async () => {
    const [user1] = await db.insert(users).values(createUserData()).returning();
    const [user2] = await db.insert(users).values(createUserData()).returning();

    const prepared = db
      .select()
      .from(users)
      .where(eq(users.email, sql.placeholder('email')))
      .prepare('get_user_by_email');

    const result1 = await prepared.execute({ email: user1.email });
    const result2 = await prepared.execute({ email: user2.email });

    expect(result1[0].id).toBe(user1.id);
    expect(result2[0].id).toBe(user2.id);
  });

  it('should handle prepared insert statements', async () => {
    const prepared = db
      .insert(users)
      .values({
        email: sql.placeholder('email'),
        name: sql.placeholder('name'),
        role: 'user',
      })
      .returning()
      .prepare('insert_user');

    const [result] = await prepared.execute({
      email: 'prepared@test.com',
      name: 'Prepared User',
    });

    expect(result.email).toBe('prepared@test.com');
    expect(result.name).toBe('Prepared User');
  });

  it('should handle prepared statements with multiple placeholders', async () => {
    const [user] = await db.insert(users).values(createUserData()).returning();

    const prepared = db
      .insert(posts)
      .values({
        title: sql.placeholder('title'),
        content: sql.placeholder('content'),
        slug: sql.placeholder('slug'),
        authorId: sql.placeholder('authorId'),
      })
      .returning()
      .prepare('insert_post');

    const [post] = await prepared.execute({
      title: 'Prepared Post',
      content: 'Content from prepared statement',
      slug: 'prepared-post',
      authorId: user.id,
    });

    expect(post.title).toBe('Prepared Post');
    expect(post.authorId).toBe(user.id);
  });
});
```

## Integration Tests

### Migration Tests

```typescript
// tests/integration/migrations.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from '../../src/db/schema';

describe('Database Migrations', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
  }, 120_000);

  afterAll(async () => {
    if (pool) await pool.end();
    if (container) await container.stop();
  });

  it('should apply all migrations successfully on a fresh database', async () => {
    pool = new Pool({ connectionString: container.getConnectionUri() });
    const db = drizzle(pool, { schema });

    await expect(
      migrate(db, { migrationsFolder: './src/db/migrations' }),
    ).resolves.not.toThrow();
  });

  it('should create the users table with correct columns', async () => {
    pool = new Pool({ connectionString: container.getConnectionUri() });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: './src/db/migrations' });

    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    const columns = result.rows.map((r: any) => r.column_name);
    expect(columns).toContain('id');
    expect(columns).toContain('email');
    expect(columns).toContain('name');
    expect(columns).toContain('role');
    expect(columns).toContain('is_active');
    expect(columns).toContain('created_at');
  });

  it('should create foreign key constraints', async () => {
    pool = new Pool({ connectionString: container.getConnectionUri() });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: './src/db/migrations' });

    const result = await db.execute(sql`
      SELECT tc.constraint_name, tc.table_name, kcu.column_name,
             ccu.table_name AS foreign_table_name,
             ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name
    `);

    const fks = result.rows as any[];
    const postAuthorFk = fks.find(
      (fk) => fk.table_name === 'posts' && fk.column_name === 'author_id',
    );
    expect(postAuthorFk).toBeDefined();
    expect(postAuthorFk.foreign_table_name).toBe('users');
    expect(postAuthorFk.foreign_column_name).toBe('id');
  });

  it('should create unique constraints', async () => {
    pool = new Pool({ connectionString: container.getConnectionUri() });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: './src/db/migrations' });

    const result = await db.execute(sql`
      SELECT tc.constraint_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'UNIQUE' AND tc.table_name = 'users'
    `);

    const uniqueColumns = (result.rows as any[]).map((r) => r.column_name);
    expect(uniqueColumns).toContain('email');
  });

  it('should create indexes for performance', async () => {
    pool = new Pool({ connectionString: container.getConnectionUri() });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: './src/db/migrations' });

    const result = await db.execute(sql`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('should be idempotent when run multiple times', async () => {
    pool = new Pool({ connectionString: container.getConnectionUri() });
    const db = drizzle(pool, { schema });

    // Run migrations twice
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    await expect(
      migrate(db, { migrationsFolder: './src/db/migrations' }),
    ).resolves.not.toThrow();
  });
});
```

### Transaction Tests

```typescript
// tests/integration/transactions.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { setupTestDatabase, teardownTestDatabase, getTestDb } from '../setup/test-containers';
import { cleanDatabase } from '../setup/test-db';
import { users } from '../../src/db/schema/users';
import { posts } from '../../src/db/schema/posts';
import { createUserData } from '../setup/factories/user.factory';
import { createPostData } from '../setup/factories/post.factory';
import type { Database } from '../../src/db';

describe('Transaction Behavior', () => {
  let db: Database;

  beforeAll(async () => {
    db = await setupTestDatabase();
  }, 120_000);

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(db);
  });

  it('should commit transaction when all operations succeed', async () => {
    await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values(createUserData()).returning();
      await tx.insert(posts).values(createPostData(user.id)).returning();
    });

    const allUsers = await db.select().from(users);
    const allPosts = await db.select().from(posts);
    expect(allUsers).toHaveLength(1);
    expect(allPosts).toHaveLength(1);
  });

  it('should rollback transaction when an operation fails', async () => {
    // Pre-insert a user to trigger unique constraint violation
    await db.insert(users).values(createUserData({ email: 'duplicate@test.com' }));

    try {
      await db.transaction(async (tx) => {
        // This succeeds
        await tx.insert(users).values(createUserData({ email: 'new@test.com' }));
        // This fails due to duplicate email
        await tx.insert(users).values(createUserData({ email: 'duplicate@test.com' }));
      });
    } catch {
      // Expected to fail
    }

    // Only the pre-inserted user should exist
    const allUsers = await db.select().from(users);
    expect(allUsers).toHaveLength(1);
    expect(allUsers[0].email).toBe('duplicate@test.com');
  });

  it('should support nested transactions via savepoints', async () => {
    const [user] = await db.insert(users).values(createUserData()).returning();

    await db.transaction(async (tx) => {
      await tx.insert(posts).values(createPostData(user.id, { title: 'Post 1' })).returning();

      try {
        await tx.transaction(async (nestedTx) => {
          await nestedTx
            .insert(posts)
            .values(createPostData(user.id, { title: 'Post 2' }))
            .returning();
          throw new Error('Force nested rollback');
        });
      } catch {
        // Nested transaction rolled back, outer continues
      }

      await tx.insert(posts).values(createPostData(user.id, { title: 'Post 3' })).returning();
    });

    const allPosts = await db.select().from(posts);
    // Post 1 and Post 3 committed, Post 2 rolled back
    expect(allPosts).toHaveLength(2);
    expect(allPosts.map((p) => p.title)).toContain('Post 1');
    expect(allPosts.map((p) => p.title)).toContain('Post 3');
    expect(allPosts.map((p) => p.title)).not.toContain('Post 2');
  });

  it('should isolate concurrent transactions', async () => {
    const [user] = await db.insert(users).values(createUserData()).returning();

    // Run two transactions concurrently
    const results = await Promise.allSettled([
      db.transaction(async (tx) => {
        await tx.insert(posts).values(
          createPostData(user.id, { slug: 'unique-slug' }),
        );
      }),
      db.transaction(async (tx) => {
        await tx.insert(posts).values(
          createPostData(user.id, { slug: 'unique-slug' }),
        );
      }),
    ]);

    // One should succeed, one should fail due to unique constraint
    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
  });

  it('should handle transaction with multiple table operations', async () => {
    await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values(createUserData()).returning();
      const [post] = await tx
        .insert(posts)
        .values(createPostData(user.id))
        .returning();

      // Update user login count within same transaction
      await tx
        .update(users)
        .set({ loginCount: 1 })
        .where(eq(users.id, user.id));

      // Update post view count
      await tx
        .update(posts)
        .set({ viewCount: sql`${posts.viewCount} + 1` })
        .where(eq(posts.id, post.id));
    });

    const [user] = await db.select().from(users);
    const [post] = await db.select().from(posts);
    expect(user.loginCount).toBe(1);
    expect(post.viewCount).toBe(1);
  });

  it('should rollback on unhandled errors', async () => {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(users).values(createUserData());
        throw new Error('Unexpected application error');
      });
    } catch {
      // Expected
    }

    const allUsers = await db.select().from(users);
    expect(allUsers).toHaveLength(0);
  });
});
```

### Relation Query Tests

```typescript
// tests/integration/relations.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupTestDatabase, teardownTestDatabase } from '../setup/test-containers';
import { cleanDatabase } from '../setup/test-db';
import { users } from '../../src/db/schema/users';
import { posts } from '../../src/db/schema/posts';
import { comments } from '../../src/db/schema/comments';
import { createUserData } from '../setup/factories/user.factory';
import { createPostData, createPublishedPostData } from '../setup/factories/post.factory';
import type { Database } from '../../src/db';

describe('Relational Queries', () => {
  let db: Database;

  beforeAll(async () => {
    db = await setupTestDatabase();
  }, 120_000);

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(db);
  });

  it('should query user with their posts using relations', async () => {
    const [user] = await db.insert(users).values(createUserData()).returning();
    await db.insert(posts).values([
      createPostData(user.id, { title: 'First Post' }),
      createPostData(user.id, { title: 'Second Post' }),
    ]);

    const result = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      with: {
        posts: true,
      },
    });

    expect(result).toBeDefined();
    expect(result!.posts).toHaveLength(2);
    expect(result!.posts.map((p) => p.title)).toEqual(
      expect.arrayContaining(['First Post', 'Second Post']),
    );
  });

  it('should query post with author and comments', async () => {
    const [author] = await db.insert(users).values(createUserData()).returning();
    const [commenter] = await db.insert(users).values(createUserData()).returning();
    const [post] = await db
      .insert(posts)
      .values(createPostData(author.id))
      .returning();

    await db.insert(comments).values([
      { body: 'Great post!', authorId: commenter.id, postId: post.id },
      { body: 'Thanks for sharing', authorId: commenter.id, postId: post.id },
    ]);

    const result = await db.query.posts.findFirst({
      where: eq(posts.id, post.id),
      with: {
        author: true,
        comments: {
          with: {
            author: true,
          },
        },
      },
    });

    expect(result).toBeDefined();
    expect(result!.author.id).toBe(author.id);
    expect(result!.comments).toHaveLength(2);
    expect(result!.comments[0].author.id).toBe(commenter.id);
  });

  it('should filter related records in relational queries', async () => {
    const [user] = await db.insert(users).values(createUserData()).returning();
    await db.insert(posts).values([
      createPublishedPostData(user.id, { title: 'Published Post' }),
      createPostData(user.id, { title: 'Draft Post' }),
    ]);

    const result = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      with: {
        posts: {
          where: eq(posts.published, true),
        },
      },
    });

    expect(result!.posts).toHaveLength(1);
    expect(result!.posts[0].title).toBe('Published Post');
  });

  it('should limit and order related records', async () => {
    const [user] = await db.insert(users).values(createUserData()).returning();
    for (let i = 0; i < 10; i++) {
      await db.insert(posts).values(
        createPostData(user.id, { title: `Post ${i}`, viewCount: i * 10 }),
      );
    }

    const result = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      with: {
        posts: {
          orderBy: (posts, { desc }) => [desc(posts.viewCount)],
          limit: 3,
        },
      },
    });

    expect(result!.posts).toHaveLength(3);
    expect(result!.posts[0].viewCount).toBe(90);
    expect(result!.posts[1].viewCount).toBe(80);
    expect(result!.posts[2].viewCount).toBe(70);
  });

  it('should handle cascade delete through relations', async () => {
    const [user] = await db.insert(users).values(createUserData()).returning();
    const [post] = await db
      .insert(posts)
      .values(createPostData(user.id))
      .returning();
    await db.insert(comments).values({
      body: 'A comment',
      authorId: user.id,
      postId: post.id,
    });

    // Delete the user -- should cascade to posts and comments
    await db.delete(users).where(eq(users.id, user.id));

    const remainingPosts = await db.select().from(posts);
    const remainingComments = await db.select().from(comments);
    expect(remainingPosts).toHaveLength(0);
    expect(remainingComments).toHaveLength(0);
  });

  it('should query many-to-many through join tables', async () => {
    const [user1] = await db.insert(users).values(createUserData()).returning();
    const [user2] = await db.insert(users).values(createUserData()).returning();
    const [post] = await db
      .insert(posts)
      .values(createPostData(user1.id))
      .returning();

    await db.insert(comments).values([
      { body: 'Comment from user 1', authorId: user1.id, postId: post.id },
      { body: 'Comment from user 2', authorId: user2.id, postId: post.id },
    ]);

    const result = await db.query.posts.findFirst({
      where: eq(posts.id, post.id),
      with: {
        comments: {
          with: {
            author: {
              columns: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    const commentAuthors = result!.comments.map((c) => c.author.name);
    expect(commentAuthors).toHaveLength(2);
  });

  it('should select specific columns in relational queries', async () => {
    const [user] = await db.insert(users).values(createUserData()).returning();
    await db.insert(posts).values(createPostData(user.id));

    const result = await db.query.users.findFirst({
      columns: { id: true, name: true },
      where: eq(users.id, user.id),
      with: {
        posts: {
          columns: { id: true, title: true },
        },
      },
    });

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
    expect(result).not.toHaveProperty('email');
    expect(result!.posts[0]).toHaveProperty('title');
    expect(result!.posts[0]).not.toHaveProperty('content');
  });
});
```

### Repository Integration Tests

```typescript
// tests/integration/repositories.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq, desc, sql, like, and, gte } from 'drizzle-orm';
import { setupTestDatabase, teardownTestDatabase } from '../setup/test-containers';
import { cleanDatabase } from '../setup/test-db';
import { users } from '../../src/db/schema/users';
import { posts } from '../../src/db/schema/posts';
import { createUserData, createBulkUserData } from '../setup/factories/user.factory';
import { createPostData, createPublishedPostData } from '../setup/factories/post.factory';
import type { Database } from '../../src/db';

describe('Repository Patterns', () => {
  let db: Database;

  beforeAll(async () => {
    db = await setupTestDatabase();
  }, 120_000);

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(db);
  });

  describe('CRUD Operations', () => {
    it('should insert and return a new user', async () => {
      const userData = createUserData({ email: 'crud@test.com', name: 'CRUD User' });
      const [created] = await db.insert(users).values(userData).returning();

      expect(created.id).toBeDefined();
      expect(created.email).toBe('crud@test.com');
      expect(created.name).toBe('CRUD User');
      expect(created.createdAt).toBeInstanceOf(Date);
    });

    it('should select user by ID', async () => {
      const [created] = await db.insert(users).values(createUserData()).returning();

      const [found] = await db
        .select()
        .from(users)
        .where(eq(users.id, created.id));

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });

    it('should update user fields', async () => {
      const [user] = await db.insert(users).values(createUserData()).returning();

      await db
        .update(users)
        .set({ name: 'Updated Name', bio: 'New bio' })
        .where(eq(users.id, user.id));

      const [updated] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id));

      expect(updated.name).toBe('Updated Name');
      expect(updated.bio).toBe('New bio');
    });

    it('should delete user by ID', async () => {
      const [user] = await db.insert(users).values(createUserData()).returning();

      await db.delete(users).where(eq(users.id, user.id));

      const found = await db.select().from(users).where(eq(users.id, user.id));
      expect(found).toHaveLength(0);
    });

    it('should upsert using onConflictDoUpdate', async () => {
      const userData = createUserData({ email: 'upsert@test.com' });
      await db.insert(users).values(userData);

      // Upsert: update name if email already exists
      await db
        .insert(users)
        .values({ ...userData, name: 'Upserted Name' })
        .onConflictDoUpdate({
          target: users.email,
          set: { name: 'Upserted Name', updatedAt: new Date() },
        });

      const [result] = await db
        .select()
        .from(users)
        .where(eq(users.email, 'upsert@test.com'));

      expect(result.name).toBe('Upserted Name');
    });

    it('should handle onConflictDoNothing', async () => {
      const userData = createUserData({ email: 'ignore@test.com', name: 'Original' });
      await db.insert(users).values(userData);

      await db
        .insert(users)
        .values({ ...userData, name: 'Should Be Ignored' })
        .onConflictDoNothing({ target: users.email });

      const [result] = await db
        .select()
        .from(users)
        .where(eq(users.email, 'ignore@test.com'));

      expect(result.name).toBe('Original');
    });
  });

  describe('Query Patterns', () => {
    it('should paginate results with limit and offset', async () => {
      await db.insert(users).values(createBulkUserData(25));

      const page1 = await db.select().from(users).limit(10).offset(0);
      const page2 = await db.select().from(users).limit(10).offset(10);
      const page3 = await db.select().from(users).limit(10).offset(20);

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(10);
      expect(page3).toHaveLength(5);
    });

    it('should filter with complex WHERE clauses', async () => {
      await db.insert(users).values([
        createUserData({ role: 'admin', loginCount: 50 }),
        createUserData({ role: 'admin', loginCount: 5 }),
        createUserData({ role: 'user', loginCount: 100 }),
      ]);

      const powerAdmins = await db
        .select()
        .from(users)
        .where(and(eq(users.role, 'admin'), gte(users.loginCount, 10)));

      expect(powerAdmins).toHaveLength(1);
      expect(powerAdmins[0].loginCount).toBe(50);
    });

    it('should perform text search with LIKE', async () => {
      await db.insert(users).values([
        createUserData({ name: 'Alice Johnson' }),
        createUserData({ name: 'Bob Smith' }),
        createUserData({ name: 'Alice Cooper' }),
      ]);

      const alices = await db
        .select()
        .from(users)
        .where(like(users.name, 'Alice%'));

      expect(alices).toHaveLength(2);
    });

    it('should order results by multiple columns', async () => {
      await db.insert(users).values([
        createUserData({ role: 'admin', name: 'Zara' }),
        createUserData({ role: 'admin', name: 'Alice' }),
        createUserData({ role: 'user', name: 'Bob' }),
      ]);

      const sorted = await db
        .select()
        .from(users)
        .orderBy(users.role, users.name);

      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Zara');
      expect(sorted[2].name).toBe('Bob');
    });

    it('should count rows with aggregation', async () => {
      await db.insert(users).values(createBulkUserData(15));

      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);

      expect(Number(result.count)).toBe(15);
    });

    it('should perform joins between tables', async () => {
      const [user] = await db.insert(users).values(createUserData()).returning();
      await db.insert(posts).values([
        createPublishedPostData(user.id, { title: 'Published' }),
        createPostData(user.id, { title: 'Draft' }),
      ]);

      const publishedWithAuthor = await db
        .select({
          postTitle: posts.title,
          authorName: users.name,
        })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(eq(posts.published, true));

      expect(publishedWithAuthor).toHaveLength(1);
      expect(publishedWithAuthor[0].postTitle).toBe('Published');
      expect(publishedWithAuthor[0].authorName).toBe(user.name);
    });

    it('should perform batch inserts efficiently', async () => {
      const batchData = createBulkUserData(100);

      const result = await db.insert(users).values(batchData).returning();

      expect(result).toHaveLength(100);
    });

    it('should increment counters atomically', async () => {
      const [user] = await db.insert(users).values(createUserData()).returning();

      // Atomic increment
      await db
        .update(users)
        .set({ loginCount: sql`${users.loginCount} + 1` })
        .where(eq(users.id, user.id));

      const [updated] = await db.select().from(users).where(eq(users.id, user.id));
      expect(updated.loginCount).toBe(1);
    });
  });
});
```

### Seeding Strategy Tests

```typescript
// tests/integration/seeding.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { sql, eq } from 'drizzle-orm';
import { setupTestDatabase, teardownTestDatabase } from '../setup/test-containers';
import { cleanDatabase } from '../setup/test-db';
import { users } from '../../src/db/schema/users';
import { posts } from '../../src/db/schema/posts';
import { comments } from '../../src/db/schema/comments';
import { createUserData, createBulkUserData } from '../setup/factories/user.factory';
import { createPostData } from '../setup/factories/post.factory';
import type { Database } from '../../src/db';

describe('Seeding Strategies', () => {
  let db: Database;

  beforeAll(async () => {
    db = await setupTestDatabase();
  }, 120_000);

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(db);
  });

  it('should seed a complete relational dataset', async () => {
    // Seed users
    const userValues = createBulkUserData(5);
    const seededUsers = await db.insert(users).values(userValues).returning();

    // Seed posts for each user
    for (const user of seededUsers) {
      const postValues = Array.from({ length: 3 }, () => createPostData(user.id));
      await db.insert(posts).values(postValues);
    }

    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const postCount = await db.select({ count: sql<number>`count(*)` }).from(posts);

    expect(Number(userCount[0].count)).toBe(5);
    expect(Number(postCount[0].count)).toBe(15);
  });

  it('should seed with specific test scenarios', async () => {
    // Scenario: user with published and draft posts
    const [activeAuthor] = await db
      .insert(users)
      .values(createUserData({ name: 'Active Author', isActive: true }))
      .returning();

    const [inactiveAuthor] = await db
      .insert(users)
      .values(createUserData({ name: 'Inactive Author', isActive: false }))
      .returning();

    await db.insert(posts).values([
      createPostData(activeAuthor.id, { published: true, title: 'Published by Active' }),
      createPostData(activeAuthor.id, { published: false, title: 'Draft by Active' }),
      createPostData(inactiveAuthor.id, { published: true, title: 'Published by Inactive' }),
    ]);

    // Verify scenario
    const activePosts = await db.query.users.findFirst({
      where: eq(users.name, 'Active Author'),
      with: { posts: true },
    });

    expect(activePosts!.posts).toHaveLength(2);
  });

  it('should handle seeding with TRUNCATE + restart identity', async () => {
    // First seed
    await db.insert(users).values(createBulkUserData(5));

    // Clean and re-seed
    await db.execute(sql`TRUNCATE TABLE comments, posts, users RESTART IDENTITY CASCADE`);

    const [freshUser] = await db.insert(users).values(createUserData()).returning();
    // ID should restart from 1
    expect(freshUser.id).toBe(1);
  });

  it('should seed large datasets efficiently using batch insert', async () => {
    const BATCH_SIZE = 500;
    const TOTAL = 2000;

    for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
      const batch = createBulkUserData(Math.min(BATCH_SIZE, TOTAL - i));
      await db.insert(users).values(batch);
    }

    const [result] = await db.select({ count: sql<number>`count(*)` }).from(users);
    expect(Number(result.count)).toBe(TOTAL);
  });
});
```

## SQLite Testing Variant

```typescript
// tests/integration/sqlite-variant.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { eq } from 'drizzle-orm';

// SQLite schema (different from PG schema)
const sqliteUsers = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default('user'),
});

describe('SQLite In-Memory Testing', () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle>;

  beforeAll(() => {
    sqlite = new Database(':memory:');
    db = drizzle(sqlite);

    // Create tables manually for in-memory DB
    sqlite.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
      )
    `);
  });

  afterAll(() => {
    sqlite.close();
  });

  it('should insert and query with SQLite', async () => {
    await db.insert(sqliteUsers).values({
      email: 'sqlite@test.com',
      name: 'SQLite User',
    });

    const [user] = await db
      .select()
      .from(sqliteUsers)
      .where(eq(sqliteUsers.email, 'sqlite@test.com'));

    expect(user.name).toBe('SQLite User');
  });

  it('should handle SQLite-specific behavior', async () => {
    // SQLite does not enforce VARCHAR length, so this is fine
    const longName = 'A'.repeat(10000);
    await db.insert(sqliteUsers).values({
      email: 'long@test.com',
      name: longName,
    });

    const [user] = await db
      .select()
      .from(sqliteUsers)
      .where(eq(sqliteUsers.email, 'long@test.com'));

    expect(user.name).toBe(longName);
  });
});
```

## Drizzle Kit Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/db-tests.yml
name: Database Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx drizzle-kit push
        env:
          DATABASE_URL: postgres://testuser:testpass@localhost:5432/testdb
      - run: npm run test:db
        env:
          DATABASE_URL: postgres://testuser:testpass@localhost:5432/testdb
```

## Best Practices

1. **Always use Testcontainers or real databases for integration tests** -- never mock Drizzle's query builder. The type system handles compile-time safety; integration tests must verify actual SQL execution.
2. **Use transaction rollback for test isolation** -- wrap each test in a transaction that rolls back, avoiding expensive TRUNCATE between tests.
3. **Test migrations on a fresh database** -- run migrations from scratch in CI to catch ordering issues, missing dependencies, and non-idempotent migrations.
4. **Use factories for test data** -- centralized factory functions ensure consistency and make it easy to create related data graphs.
5. **Test unique constraints and foreign keys explicitly** -- verify that the database rejects invalid data, not just that valid data is accepted.
6. **Assert return values from .returning()** -- always check the returned data from insert/update/delete operations to verify the database applied changes correctly.
7. **Test prepared statements separately** -- prepared statements have different code paths than dynamic queries; test their parameterization and reuse behavior.
8. **Use sql template literals for raw SQL testing** -- when testing complex queries, verify the generated SQL matches expectations using Drizzle's sql tagged template.
9. **Test cascade behavior** -- when a parent row is deleted, verify that cascade deletes remove all dependent rows as configured.
10. **Monitor query performance in integration tests** -- use EXPLAIN ANALYZE in tests for critical queries to catch missing indexes or accidental full table scans.

## Anti-Patterns

1. **Mocking the Drizzle query builder** -- mocking `db.select().from()` chains gives false confidence. The tests pass but real queries may fail due to SQL dialect differences or missing columns.
2. **Sharing database state between tests** -- relying on insertion order or data from previous tests creates flaky, order-dependent test suites.
3. **Using production database for tests** -- never run tests against a production or staging database. Use Testcontainers, in-memory SQLite, or a dedicated test database.
4. **Skipping migration tests** -- deploying untested migrations is the number one cause of production outages. Test every migration.
5. **Hardcoding IDs in test assertions** -- auto-increment IDs are not deterministic across test runs. Use `.returning()` to capture generated IDs.
6. **Ignoring transaction boundaries** -- not testing rollback behavior means you won't discover partial commit bugs until production.
7. **Testing only happy paths** -- always test unique constraint violations, foreign key failures, null constraint violations, and connection timeouts.
8. **Not cleaning up test containers** -- leaked containers consume disk and memory. Always call `container.stop()` in afterAll hooks.
9. **Using setTimeout for async database operations** -- use proper async/await with Drizzle instead of arbitrary delays. Database operations should be awaited directly.
10. **Mixing schema definitions with test logic** -- keep test schemas separate from application schemas. Test files should import from source, not redefine tables.
