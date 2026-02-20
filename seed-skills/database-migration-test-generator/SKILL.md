---
name: Database Migration Test Generator
description: Generate tests for database migration safety covering schema changes, data integrity preservation, rollback verification, and zero-downtime migration validation
version: 1.0.0
author: Pramod
license: MIT
tags: [database-migration, schema-testing, data-integrity, rollback-testing, zero-downtime, migration-safety, database-versioning]
testingTypes: [database, integration]
frameworks: [jest, vitest, pytest]
languages: [typescript, javascript, python, java]
domains: [api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Database Migration Test Generator Skill

You are an expert QA engineer specializing in database migration testing and data integrity verification. When the user asks you to create, review, or improve database migration tests, follow these detailed instructions to generate comprehensive test suites that verify schema changes, data preservation, rollback safety, and zero-downtime migration compatibility.

## Core Principles

1. **Migrations are code, test them as code** -- Every migration file is a deployable artifact that modifies production state. It deserves the same testing rigor as application code. Untested migrations are production time bombs.
2. **Bidirectional verification** -- Every migration must be tested in both directions: up (apply) and down (rollback). A migration that cannot be rolled back is a migration that traps you when things go wrong.
3. **Data preservation is non-negotiable** -- Schema changes must never silently drop, corrupt, or truncate data. Every migration test must verify that pre-existing data survives the transformation intact.
4. **Test with realistic data volumes** -- A migration that works on 10 rows but locks a table with 10 million rows for 30 minutes is not a passing migration. Volume testing is mandatory for production-bound migrations.
5. **Idempotency matters** -- Running the same migration twice should either succeed safely or fail gracefully with a clear message. Never assume migrations run exactly once.
6. **Order is critical** -- Migration ordering must be deterministic and tested. Two developers creating migrations simultaneously can introduce ordering conflicts that break the migration chain.
7. **Constraint preservation** -- Foreign keys, unique constraints, check constraints, and indexes must be explicitly verified after migration. Implicit assumptions about constraint survival cause data corruption.
8. **Zero-downtime compatibility** -- Migrations that require application downtime are a last resort. Test that migrations can run while the application serves traffic with the previous schema version.
9. **Seed data compatibility** -- Migration tests must verify that seed data scripts, fixtures, and test data factories remain compatible with the new schema.
10. **Atomic migration units** -- Each migration should do one logical thing. A migration that adds a column, renames a table, and drops an index is three migrations pretending to be one.

## Project Structure

```
tests/
  migrations/
    helpers/
      migration-runner.ts
      test-database.ts
      data-seeder.ts
      snapshot-comparator.ts
    schema/
      schema-change.test.ts
      column-addition.test.ts
      column-removal.test.ts
      table-rename.test.ts
      type-change.test.ts
    integrity/
      data-preservation.test.ts
      constraint-verification.test.ts
      index-verification.test.ts
      foreign-key.test.ts
    rollback/
      rollback-safety.test.ts
      rollback-data-preservation.test.ts
      partial-rollback.test.ts
    zero-downtime/
      backward-compatible.test.ts
      dual-write.test.ts
      online-migration.test.ts
    ordering/
      migration-sequence.test.ts
      concurrent-migration.test.ts
    performance/
      large-table-migration.test.ts
      index-creation.test.ts
    config/
      migration-test.config.ts
  fixtures/
    seed-data/
      pre-migration.sql
      post-migration-expected.sql
```

## Test Database Setup

Before testing migrations, you need an isolated database environment that can be created and destroyed rapidly.

### TypeScript with Drizzle ORM

```typescript
// test-database.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { execSync } from 'child_process';

interface TestDatabase {
  pool: Pool;
  db: ReturnType<typeof drizzle>;
  name: string;
  connectionString: string;
  teardown: () => Promise<void>;
}

async function createTestDatabase(prefix: string = 'migration_test'): Promise<TestDatabase> {
  const dbName = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const adminPool = new Pool({
    connectionString: process.env.TEST_DATABASE_ADMIN_URL,
  });

  await adminPool.query(`CREATE DATABASE "${dbName}"`);
  await adminPool.end();

  const connectionString = `${process.env.TEST_DATABASE_BASE_URL}/${dbName}`;
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  return {
    pool,
    db,
    name: dbName,
    connectionString,
    teardown: async () => {
      await pool.end();
      const cleanup = new Pool({
        connectionString: process.env.TEST_DATABASE_ADMIN_URL,
      });
      await cleanup.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
      await cleanup.end();
    },
  };
}

async function applyMigrationsUpTo(
  db: ReturnType<typeof drizzle>,
  migrationsFolder: string,
  upToVersion?: string
): Promise<void> {
  if (upToVersion) {
    // Apply migrations sequentially up to the specified version
    const fs = await import('fs');
    const path = await import('path');
    const files = fs.readdirSync(migrationsFolder)
      .filter(f => f.endsWith('.sql'))
      .sort()
      .filter(f => f <= upToVersion);

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsFolder, file), 'utf-8');
      await db.execute(sql);
    }
  } else {
    await migrate(db, { migrationsFolder });
  }
}
```

### Migration Runner

```typescript
// migration-runner.ts
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface MigrationFile {
  version: string;
  name: string;
  upSql: string;
  downSql: string;
  filePath: string;
}

interface MigrationResult {
  version: string;
  direction: 'up' | 'down';
  success: boolean;
  duration: number;
  error?: string;
  rowsAffected?: number;
}

class MigrationRunner {
  private migrationsDir: string;
  private migrations: MigrationFile[] = [];

  constructor(migrationsDir: string) {
    this.migrationsDir = migrationsDir;
    this.loadMigrations();
  }

  private loadMigrations(): void {
    const files = readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    this.migrations = files.map(file => {
      const content = readFileSync(join(this.migrationsDir, file), 'utf-8');
      const [upSql, downSql] = this.splitMigration(content);
      return {
        version: file.replace('.sql', ''),
        name: file,
        upSql,
        downSql,
        filePath: join(this.migrationsDir, file),
      };
    });
  }

  private splitMigration(content: string): [string, string] {
    const downMarker = '-- migrate:down';
    const parts = content.split(downMarker);
    return [
      parts[0].replace('-- migrate:up', '').trim(),
      parts.length > 1 ? parts[1].trim() : '',
    ];
  }

  async runUp(pool: Pool, version: string): Promise<MigrationResult> {
    const migration = this.getMigration(version);
    const start = Date.now();
    try {
      const result = await pool.query(migration.upSql);
      return {
        version, direction: 'up', success: true,
        duration: Date.now() - start,
        rowsAffected: result.rowCount ?? 0,
      };
    } catch (error) {
      return {
        version, direction: 'up', success: false,
        duration: Date.now() - start,
        error: (error as Error).message,
      };
    }
  }

  async runDown(pool: Pool, version: string): Promise<MigrationResult> {
    const migration = this.getMigration(version);
    if (!migration.downSql) {
      return {
        version, direction: 'down', success: false,
        duration: 0, error: 'No down migration defined',
      };
    }
    const start = Date.now();
    try {
      const result = await pool.query(migration.downSql);
      return {
        version, direction: 'down', success: true,
        duration: Date.now() - start,
        rowsAffected: result.rowCount ?? 0,
      };
    } catch (error) {
      return {
        version, direction: 'down', success: false,
        duration: Date.now() - start,
        error: (error as Error).message,
      };
    }
  }

  getMigration(version: string): MigrationFile {
    const migration = this.migrations.find(m => m.version === version);
    if (!migration) throw new Error(`Migration ${version} not found`);
    return migration;
  }

  getAllVersions(): string[] {
    return this.migrations.map(m => m.version);
  }
}
```

## Schema Change Testing

### Column Addition and Removal

```typescript
// schema-change.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Schema Change Migrations', () => {
  let testDb: TestDatabase;
  let runner: MigrationRunner;

  beforeAll(async () => {
    testDb = await createTestDatabase('schema_test');
    runner = new MigrationRunner('./drizzle/migrations');
  });

  afterAll(async () => {
    await testDb.teardown();
  });

  describe('Column Addition: add email_verified to users', () => {
    it('should add the column with correct type and default', async () => {
      // Apply migrations up to the one before our target
      await applyMigrationsUpTo(testDb.db, './drizzle/migrations', '0004_previous');

      // Seed test data before migration
      await testDb.pool.query(`
        INSERT INTO users (id, email, name) VALUES
        ('u1', 'alice@example.com', 'Alice'),
        ('u2', 'bob@example.com', 'Bob')
      `);

      // Run the migration under test
      const result = await runner.runUp(testDb.pool, '0005_add_email_verified');
      expect(result.success).toBe(true);

      // Verify column exists with correct type
      const columnInfo = await testDb.pool.query(`
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email_verified'
      `);
      expect(columnInfo.rows).toHaveLength(1);
      expect(columnInfo.rows[0].data_type).toBe('boolean');
      expect(columnInfo.rows[0].column_default).toBe('false');
      expect(columnInfo.rows[0].is_nullable).toBe('NO');
    });

    it('should preserve existing data after column addition', async () => {
      const users = await testDb.pool.query(
        'SELECT id, email, name, email_verified FROM users ORDER BY id'
      );
      expect(users.rows).toHaveLength(2);
      expect(users.rows[0]).toMatchObject({ id: 'u1', email: 'alice@example.com', email_verified: false });
      expect(users.rows[1]).toMatchObject({ id: 'u2', email: 'bob@example.com', email_verified: false });
    });

    it('should allow rollback without data loss', async () => {
      const result = await runner.runDown(testDb.pool, '0005_add_email_verified');
      expect(result.success).toBe(true);

      // Verify column is gone
      const columnInfo = await testDb.pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email_verified'
      `);
      expect(columnInfo.rows).toHaveLength(0);

      // Verify original data still intact
      const users = await testDb.pool.query('SELECT id, email, name FROM users ORDER BY id');
      expect(users.rows).toHaveLength(2);
      expect(users.rows[0].email).toBe('alice@example.com');
    });
  });

  describe('Column Type Change: string to enum', () => {
    it('should convert existing values to enum without data loss', async () => {
      await testDb.pool.query(`
        INSERT INTO orders (id, status) VALUES
        ('o1', 'pending'), ('o2', 'shipped'), ('o3', 'delivered')
      `);

      const result = await runner.runUp(testDb.pool, '0006_status_to_enum');
      expect(result.success).toBe(true);

      const orders = await testDb.pool.query('SELECT id, status FROM orders ORDER BY id');
      expect(orders.rows[0].status).toBe('pending');
      expect(orders.rows[1].status).toBe('shipped');
      expect(orders.rows[2].status).toBe('delivered');
    });

    it('should reject invalid enum values after migration', async () => {
      await expect(
        testDb.pool.query(`INSERT INTO orders (id, status) VALUES ('o4', 'invalid_status')`)
      ).rejects.toThrow();
    });
  });
});
```

## Data Integrity Verification

```typescript
// data-preservation.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'crypto';

describe('Data Integrity During Migration', () => {
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await createTestDatabase('integrity_test');
  });

  afterAll(async () => {
    await testDb.teardown();
  });

  it('should preserve row count across migration', async () => {
    await applyMigrationsUpTo(testDb.db, './drizzle/migrations', '0004_previous');

    // Seed substantial data
    const insertValues = Array.from({ length: 1000 }, (_, i) =>
      `('user_${i}', 'user${i}@example.com', 'User ${i}')`
    ).join(',\n');
    await testDb.pool.query(`INSERT INTO users (id, email, name) VALUES ${insertValues}`);

    const beforeCount = await testDb.pool.query('SELECT COUNT(*) as count FROM users');
    expect(Number(beforeCount.rows[0].count)).toBe(1000);

    // Run migration
    await applyMigrationsUpTo(testDb.db, './drizzle/migrations', '0005_add_email_verified');

    const afterCount = await testDb.pool.query('SELECT COUNT(*) as count FROM users');
    expect(Number(afterCount.rows[0].count)).toBe(1000);
  });

  it('should preserve data checksums across migration', async () => {
    // Capture checksums before migration
    const beforeData = await testDb.pool.query(
      'SELECT id, email, name FROM users ORDER BY id'
    );
    const beforeChecksum = createHash('sha256')
      .update(JSON.stringify(beforeData.rows))
      .digest('hex');

    // Run migration that adds a column
    await applyMigrationsUpTo(testDb.db, './drizzle/migrations', '0006_add_profile_url');

    // Capture same columns after migration (excluding new column)
    const afterData = await testDb.pool.query(
      'SELECT id, email, name FROM users ORDER BY id'
    );
    const afterChecksum = createHash('sha256')
      .update(JSON.stringify(afterData.rows))
      .digest('hex');

    expect(afterChecksum).toBe(beforeChecksum);
  });

  it('should preserve unicode data during encoding-sensitive migrations', async () => {
    await testDb.pool.query(`
      INSERT INTO products (id, name, description) VALUES
      ('p1', 'Cafe Latte', 'Smooth espresso with steamed milk'),
      ('p2', 'Matcha', 'Japanese green tea powder'),
      ('p3', 'Acai Bowl', 'Brazilian superfood bowl')
    `);

    await runner.runUp(testDb.pool, '0007_change_text_encoding');

    const products = await testDb.pool.query('SELECT name, description FROM products ORDER BY id');
    expect(products.rows[0].name).toBe('Cafe Latte');
    expect(products.rows[1].name).toBe('Matcha');
    expect(products.rows[2].name).toBe('Acai Bowl');
  });
});
```

## Foreign Key and Constraint Preservation

```typescript
// constraint-verification.test.ts
describe('Constraint Preservation', () => {
  it('should preserve foreign key constraints after migration', async () => {
    const constraints = await testDb.pool.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'orders'
        AND tc.constraint_type = 'FOREIGN KEY'
    `);

    const userFk = constraints.rows.find(r => r.foreign_table_name === 'users');
    expect(userFk).toBeDefined();
    expect(userFk.column_name).toBe('user_id');
    expect(userFk.foreign_column_name).toBe('id');
  });

  it('should preserve unique constraints after migration', async () => {
    const uniqueConstraints = await testDb.pool.query(`
      SELECT tc.constraint_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'users'
        AND tc.constraint_type = 'UNIQUE'
    `);

    const emailUnique = uniqueConstraints.rows.find(r => r.column_name === 'email');
    expect(emailUnique).toBeDefined();
  });

  it('should preserve check constraints after migration', async () => {
    // After migration, check constraints should still enforce
    await expect(
      testDb.pool.query(`INSERT INTO orders (id, user_id, total) VALUES ('o1', 'u1', -100)`)
    ).rejects.toThrow(); // Negative total should violate check constraint
  });

  it('should maintain index coverage after migration', async () => {
    const indexes = await testDb.pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'orders'
    `);

    const indexNames = indexes.rows.map(r => r.indexname);
    expect(indexNames).toContain('orders_user_id_idx');
    expect(indexNames).toContain('orders_created_at_idx');
    expect(indexNames).toContain('orders_status_idx');
  });
});
```

## Rollback Safety Testing

```typescript
// rollback-safety.test.ts
describe('Rollback Safety', () => {
  it('should rollback cleanly to previous schema state', async () => {
    // Capture schema snapshot before migration
    const beforeSchema = await captureSchemaSnapshot(testDb.pool, 'users');

    // Apply migration
    await runner.runUp(testDb.pool, '0005_add_email_verified');

    // Rollback
    await runner.runDown(testDb.pool, '0005_add_email_verified');

    // Capture schema snapshot after rollback
    const afterSchema = await captureSchemaSnapshot(testDb.pool, 'users');

    expect(afterSchema).toEqual(beforeSchema);
  });

  it('should preserve data through up-then-down cycle', async () => {
    await testDb.pool.query(`
      INSERT INTO users (id, email, name) VALUES ('u1', 'test@test.com', 'Test')
    `);

    // Up
    await runner.runUp(testDb.pool, '0005_add_email_verified');

    // Modify new column
    await testDb.pool.query(`UPDATE users SET email_verified = true WHERE id = 'u1'`);

    // Down
    await runner.runDown(testDb.pool, '0005_add_email_verified');

    // Original data should survive
    const result = await testDb.pool.query('SELECT * FROM users WHERE id = $1', ['u1']);
    expect(result.rows[0].email).toBe('test@test.com');
    expect(result.rows[0].name).toBe('Test');
  });

  it('should handle rollback of data-transforming migration', async () => {
    // This tests migrations that transform data (not just schema)
    await testDb.pool.query(`
      INSERT INTO users (id, email, name) VALUES
      ('u1', 'ALICE@EXAMPLE.COM', 'Alice'),
      ('u2', 'Bob@Example.COM', 'Bob')
    `);

    // Migration that lowercases all emails
    await runner.runUp(testDb.pool, '0008_lowercase_emails');

    const afterUp = await testDb.pool.query('SELECT email FROM users ORDER BY id');
    expect(afterUp.rows[0].email).toBe('alice@example.com');

    // Rollback -- note: data transformation may not be reversible
    const rollbackResult = await runner.runDown(testDb.pool, '0008_lowercase_emails');
    // The test verifies rollback behavior is documented and intentional
    expect(rollbackResult.success).toBe(true);
  });
});

async function captureSchemaSnapshot(pool: Pool, tableName: string) {
  const columns = await pool.query(`
    SELECT column_name, data_type, column_default, is_nullable,
           character_maximum_length, numeric_precision
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);

  const constraints = await pool.query(`
    SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = $1
    ORDER BY tc.constraint_name
  `, [tableName]);

  const indexes = await pool.query(`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE tablename = $1 ORDER BY indexname
  `, [tableName]);

  return { columns: columns.rows, constraints: constraints.rows, indexes: indexes.rows };
}
```

## Zero-Downtime Migration Testing

Zero-downtime migrations must be compatible with both the old and new application code running simultaneously during deployment.

```typescript
// backward-compatible.test.ts
describe('Zero-Downtime Migration Compatibility', () => {
  it('should allow old code to function during column addition', async () => {
    // Simulate old code running while migration adds a new column
    await applyMigrationsUpTo(testDb.db, './drizzle/migrations', '0004_previous');

    // Old code inserts (does not know about new column)
    const oldCodeInsert = `INSERT INTO users (id, email, name) VALUES ('u1', 'a@b.com', 'A')`;
    await testDb.pool.query(oldCodeInsert);

    // Run migration (adds email_verified column with default)
    await runner.runUp(testDb.pool, '0005_add_email_verified');

    // Old code insert should still work (new column has a default)
    await expect(
      testDb.pool.query(`INSERT INTO users (id, email, name) VALUES ('u2', 'b@c.com', 'B')`)
    ).resolves.not.toThrow();

    // Old code select should still work (extra column is ignored)
    const result = await testDb.pool.query('SELECT id, email, name FROM users');
    expect(result.rows).toHaveLength(2);
  });

  it('should support expand-contract pattern for column rename', async () => {
    // Phase 1: Expand -- add new column, dual-write
    await runner.runUp(testDb.pool, '0009_expand_add_full_name');

    // Verify both old and new columns exist
    const cols = await testDb.pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('name', 'full_name')
    `);
    expect(cols.rows).toHaveLength(2);

    // Old code writes to 'name', trigger copies to 'full_name'
    await testDb.pool.query(`UPDATE users SET name = 'Alice Updated' WHERE id = 'u1'`);
    const user = await testDb.pool.query(`SELECT name, full_name FROM users WHERE id = 'u1'`);
    expect(user.rows[0].full_name).toBe('Alice Updated');

    // Phase 2: Contract -- remove old column (separate deployment)
    await runner.runUp(testDb.pool, '0010_contract_remove_name');

    const colsAfter = await testDb.pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('name', 'full_name')
    `);
    expect(colsAfter.rows).toHaveLength(1);
    expect(colsAfter.rows[0].column_name).toBe('full_name');
  });

  it('should handle NOT NULL addition with backfill', async () => {
    // Step 1: Add nullable column
    await runner.runUp(testDb.pool, '0011_add_nullable_status');

    // Step 2: Backfill existing rows
    await testDb.pool.query(`UPDATE users SET status = 'active' WHERE status IS NULL`);

    // Step 3: Add NOT NULL constraint
    await runner.runUp(testDb.pool, '0012_make_status_not_null');

    // Verify constraint is enforced
    await expect(
      testDb.pool.query(`INSERT INTO users (id, email, full_name) VALUES ('u3', 'c@d.com', 'C')`)
    ).rejects.toThrow(); // status is NOT NULL now
  });
});
```

## Python with Alembic

```python
# test_migrations.py
import pytest
import hashlib
import json
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

@pytest.fixture(scope="module")
def alembic_config():
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", "postgresql://localhost:5432/migration_test")
    return config

@pytest.fixture(scope="function")
def test_engine():
    admin_engine = create_engine("postgresql://localhost:5432/postgres")
    db_name = f"migration_test_{id(object())}"
    with admin_engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        conn.execute(text(f'CREATE DATABASE "{db_name}"'))

    engine = create_engine(f"postgresql://localhost:5432/{db_name}")
    yield engine

    engine.dispose()
    with admin_engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        conn.execute(text(f'DROP DATABASE IF EXISTS "{db_name}" WITH (FORCE)'))
    admin_engine.dispose()

class TestMigrationUpDown:
    def test_upgrade_creates_table(self, test_engine, alembic_config):
        alembic_config.set_main_option("sqlalchemy.url", str(test_engine.url))
        command.upgrade(alembic_config, "abc123")  # target revision

        inspector = inspect(test_engine)
        tables = inspector.get_table_names()
        assert "users" in tables

        columns = {col["name"] for col in inspector.get_columns("users")}
        assert "id" in columns
        assert "email" in columns
        assert "created_at" in columns

    def test_downgrade_removes_table(self, test_engine, alembic_config):
        alembic_config.set_main_option("sqlalchemy.url", str(test_engine.url))
        command.upgrade(alembic_config, "abc123")
        command.downgrade(alembic_config, "abc122")  # previous revision

        inspector = inspect(test_engine)
        tables = inspector.get_table_names()
        assert "users" not in tables

    def test_data_preserved_through_column_addition(self, test_engine, alembic_config):
        alembic_config.set_main_option("sqlalchemy.url", str(test_engine.url))
        command.upgrade(alembic_config, "abc123")

        with test_engine.connect() as conn:
            conn.execute(text(
                "INSERT INTO users (id, email) VALUES ('u1', 'test@test.com')"
            ))
            conn.commit()

            before = conn.execute(text("SELECT id, email FROM users")).fetchall()
            before_hash = hashlib.sha256(
                json.dumps([(r[0], r[1]) for r in before]).encode()
            ).hexdigest()

        command.upgrade(alembic_config, "abc124")  # adds 'phone' column

        with test_engine.connect() as conn:
            after = conn.execute(text("SELECT id, email FROM users")).fetchall()
            after_hash = hashlib.sha256(
                json.dumps([(r[0], r[1]) for r in after]).encode()
            ).hexdigest()

        assert before_hash == after_hash

    def test_foreign_key_constraints_preserved(self, test_engine, alembic_config):
        alembic_config.set_main_option("sqlalchemy.url", str(test_engine.url))
        command.upgrade(alembic_config, "abc125")

        inspector = inspect(test_engine)
        fks = inspector.get_foreign_keys("orders")
        user_fk = next((fk for fk in fks if fk["referred_table"] == "users"), None)

        assert user_fk is not None
        assert user_fk["constrained_columns"] == ["user_id"]
        assert user_fk["referred_columns"] == ["id"]
```

## Large Table Migration Strategies

```typescript
// large-table-migration.test.ts
describe('Large Table Migration Performance', () => {
  it('should complete migration within acceptable time for large tables', async () => {
    // Seed a large dataset
    const batchSize = 10000;
    const totalRows = 100000;

    for (let i = 0; i < totalRows; i += batchSize) {
      const values = Array.from({ length: batchSize }, (_, j) => {
        const idx = i + j;
        return `('user_${idx}', 'user${idx}@example.com', 'User ${idx}')`;
      }).join(',');
      await testDb.pool.query(`INSERT INTO users (id, email, name) VALUES ${values}`);
    }

    const countBefore = await testDb.pool.query('SELECT COUNT(*) FROM users');
    expect(Number(countBefore.rows[0].count)).toBe(totalRows);

    // Run migration and measure time
    const start = Date.now();
    const result = await runner.runUp(testDb.pool, '0005_add_email_verified');
    const duration = Date.now() - start;

    expect(result.success).toBe(true);
    // Assert migration completes within 30 seconds for 100K rows
    expect(duration).toBeLessThan(30000);

    // Verify no data loss
    const countAfter = await testDb.pool.query('SELECT COUNT(*) FROM users');
    expect(Number(countAfter.rows[0].count)).toBe(totalRows);
  }, 60000); // 60 second timeout

  it('should use batched updates for data migration on large tables', async () => {
    // Verify the migration uses batched processing, not a single UPDATE
    const migrationSql = runner.getMigration('0013_backfill_normalized_email').upSql;

    // The migration should process in batches to avoid table locks
    expect(migrationSql).toContain('LIMIT');
    // Or verify it uses a loop/batch pattern
    expect(migrationSql).toMatch(/DO \$\$|LOOP|WHILE/i);
  });
});
```

## Migration Ordering Verification

```typescript
// migration-sequence.test.ts
describe('Migration Ordering', () => {
  it('should have strictly sequential version numbers', () => {
    const versions = runner.getAllVersions();
    for (let i = 1; i < versions.length; i++) {
      expect(versions[i] > versions[i - 1]).toBe(true);
    }
  });

  it('should not have duplicate version timestamps', () => {
    const versions = runner.getAllVersions();
    const unique = new Set(versions);
    expect(unique.size).toBe(versions.length);
  });

  it('should apply all migrations in sequence without error', async () => {
    const versions = runner.getAllVersions();
    for (const version of versions) {
      const result = await runner.runUp(testDb.pool, version);
      expect(result.success).toBe(true);
    }
  });

  it('should rollback all migrations in reverse without error', async () => {
    const versions = runner.getAllVersions().reverse();
    for (const version of versions) {
      const result = await runner.runDown(testDb.pool, version);
      expect(result.success).toBe(true);
    }
  });

  it('should detect dependency ordering issues', async () => {
    // Try applying a migration that depends on a table created by a later migration
    // This should fail, proving the ordering is enforced
    const laterMigration = runner.getAllVersions()[5];
    const freshDb = await createTestDatabase('ordering_test');
    try {
      // Apply only migrations 0-2, then try to apply migration 5
      for (const v of runner.getAllVersions().slice(0, 3)) {
        await runner.runUp(freshDb.pool, v);
      }
      const result = await runner.runUp(freshDb.pool, laterMigration);
      // If it references tables from migrations 3-4, it should fail
      if (!result.success) {
        expect(result.error).toMatch(/relation .* does not exist|table .* doesn't exist/i);
      }
    } finally {
      await freshDb.teardown();
    }
  });
});
```

## Configuration

```typescript
// migration-test.config.ts
interface MigrationTestConfig {
  database: {
    adminUrl: string;
    baseUrl: string;
    testDbPrefix: string;
    maxTestDatabases: number;
    cleanupOrphanedDbs: boolean;
  };
  migrations: {
    directory: string;
    schemaFile: string;
    seedFile: string;
  };
  performance: {
    maxMigrationDurationMs: number;
    largeTableRowCount: number;
    batchSize: number;
  };
  reporting: {
    generateSchemaSnapshots: boolean;
    snapshotDirectory: string;
    reportFormat: 'json' | 'markdown';
  };
}

const defaultConfig: MigrationTestConfig = {
  database: {
    adminUrl: process.env.TEST_DATABASE_ADMIN_URL || 'postgresql://localhost:5432/postgres',
    baseUrl: process.env.TEST_DATABASE_BASE_URL || 'postgresql://localhost:5432',
    testDbPrefix: 'migration_test',
    maxTestDatabases: 10,
    cleanupOrphanedDbs: true,
  },
  migrations: {
    directory: './drizzle/migrations',
    schemaFile: './src/db/schema.ts',
    seedFile: './src/db/seed.ts',
  },
  performance: {
    maxMigrationDurationMs: 30000,
    largeTableRowCount: 100000,
    batchSize: 10000,
  },
  reporting: {
    generateSchemaSnapshots: true,
    snapshotDirectory: './test-artifacts/schema-snapshots',
    reportFormat: 'json',
  },
};
```

## Best Practices

1. **Create one test database per test suite, not per test** -- Database creation is expensive. Use transactions for isolation within a suite and rollback between tests when possible.

2. **Always test both directions** -- Every migration must have an up test and a down test. Discovering that rollback is broken during an incident is the worst possible time to find out.

3. **Seed realistic data before testing migrations** -- Empty-table migrations always pass. Seed data that includes nulls, unicode, large text fields, maximum-length strings, and edge-case values.

4. **Capture schema snapshots before and after** -- Store a snapshot of columns, constraints, indexes, and triggers. Compare snapshots to detect unintended schema drift.

5. **Test migration idempotency** -- Run the same migration twice. It should either succeed (if designed to be idempotent) or fail with a clear error (not corrupt data).

6. **Verify index performance after migration** -- An index that exists is not the same as an index that performs. Run EXPLAIN ANALYZE on critical queries after migration to verify index usage.

7. **Use the expand-contract pattern for breaking changes** -- Never rename or remove a column in a single step. Expand (add new), migrate data, update application, contract (remove old) across multiple deployments.

8. **Test with production-like constraints enabled** -- Do not disable foreign keys, unique constraints, or check constraints during testing. Migrations must work with all constraints active.

9. **Include concurrent access tests** -- Run SELECT and INSERT queries during migration execution to verify the migration does not cause blocking or deadlocks in a zero-downtime deployment.

10. **Automate migration testing in CI** -- Every pull request that includes a migration file should automatically run the migration test suite against a clean database.

11. **Document irreversible migrations explicitly** -- If a migration cannot be rolled back (dropping a column with data), document this in the migration file and in the test with a clear reason.

12. **Test seed data compatibility** -- After every migration, run the seed script to verify it still works. Broken seed scripts block new developer onboarding and CI environment setup.

## Anti-Patterns to Avoid

1. **Testing migrations on empty databases only** -- An empty database has no data to corrupt, no constraints to violate, and no performance issues. Always seed data before testing migrations.

2. **Sharing test databases between test runs** -- Leftover state from a previous run causes flaky tests. Create a fresh database for every test suite execution and destroy it afterward.

3. **Skipping rollback tests because you will never rollback** -- Production incidents happen. Deployments fail. Rollback capability is insurance, and untested insurance pays nothing.

4. **Using IF EXISTS / IF NOT EXISTS to mask ordering bugs** -- Wrapping every DDL in conditional checks hides dependency ordering problems. Fix the ordering instead of working around it.

5. **Testing only the latest migration in isolation** -- Migrations form a chain. Test the complete chain from empty to current, not just the latest link. A migration that works alone may conflict with a previous one.

6. **Ignoring migration performance** -- A migration that takes 45 minutes on a production-sized table causes 45 minutes of degraded service. Always benchmark with realistic data volumes.

7. **Writing irreversible migrations without documentation** -- If a migration drops data or transforms it one-way, this must be explicitly documented and the down migration should raise a clear error, not silently do nothing.

8. **Hardcoding test data IDs that conflict with production sequences** -- Use UUIDs or explicitly non-overlapping ranges for test data to prevent conflicts if tests accidentally run against production.

## Debugging Tips

1. **Migration fails with "relation does not exist"** -- Check migration ordering. The referenced table may be created by a later migration. Verify that your migration runner processes files in the correct order (lexicographic sort of filenames is the standard).

2. **Rollback fails with "column does not exist"** -- The down migration references a column that was already removed by a later migration. Test rollbacks in reverse order, starting from the most recent migration.

3. **Data type mismatch after migration** -- Use explicit CAST in data-transforming migrations. Implicit type coercion varies across database versions and may silently truncate data.

4. **Migration succeeds locally but fails in CI** -- Check database versions. A feature available in PostgreSQL 15 may not exist in PostgreSQL 13. Pin your CI database version to match production.

5. **Test database not cleaning up** -- Implement a cleanup script that drops all databases matching your test prefix. Run it as a CI step or a pre-test hook. Orphaned test databases consume disk space and connections.

6. **Constraint violation during migration** -- The migration is trying to add a NOT NULL constraint to a column with existing NULL values, or a UNIQUE constraint on non-unique data. Always backfill data before adding constraints.

7. **Migration takes too long in tests** -- Reduce the seed data volume for routine tests but keep a separate performance test suite with production-scale data. Use the performance suite on a schedule, not on every commit.

8. **Foreign key prevents table drop during rollback** -- Drop foreign key constraints before dropping the referenced table. The rollback migration must remove dependencies in the correct order.

9. **Index creation blocks queries in zero-downtime tests** -- Use CREATE INDEX CONCURRENTLY in PostgreSQL to avoid table locks. Note that this cannot run inside a transaction, so the migration must not be wrapped in BEGIN/COMMIT.

10. **Seed data breaks after migration** -- Update seed scripts in the same pull request as the migration. Never merge a migration without verifying seed compatibility.