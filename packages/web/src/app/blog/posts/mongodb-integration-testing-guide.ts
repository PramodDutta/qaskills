import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MongoDB Integration Testing Guide',
  description:
    'Build MongoDB integration testing with isolated databases, fixtures, indexes, transactions, and realistic query assertions for Node services.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# MongoDB Integration Testing Guide

Your repository test passes with a mocked collection and then production slows down because the query never used the compound index. Another test says a document was saved, but the unique constraint that should reject duplicate slugs was never created in the test database. MongoDB integration testing exists for those gaps between JavaScript object behavior and the database behavior your service actually relies on.

MongoDB is flexible, but that flexibility can hide defects. Schemaless does not mean contractless. Indexes, write concerns, transactions, aggregation pipelines, TTL cleanup, collation, ObjectId handling, and update operators all deserve tests at the database boundary. The goal is not to test MongoDB itself. The goal is to prove your code uses MongoDB correctly with realistic data and real server semantics.

This guide focuses on Node.js services, but the strategy applies broadly. If you prefer containerized dependencies, compare this with [Testcontainers MongoDB Node integration testing](/blog/testcontainers-mongodb-node-integration-testing). For data shape guarantees between services, use the patterns in the [data contract testing guide](/blog/data-contract-testing-guide-2026).

## Choose the right MongoDB test boundary

Not every test needs a real MongoDB server. Pure domain logic can stay in unit tests. Serialization and query construction can have focused tests. Use integration tests when behavior depends on MongoDB features: indexes, aggregation, transactions, update operators, read preferences, collation, or actual BSON types.

The most useful MongoDB integration tests sit one layer above raw driver calls. Test repositories or data access services with real collections. Avoid testing through the entire HTTP stack unless the behavior is truly end-to-end. That keeps failures close to the query or persistence rule that broke.

| Behavior under test | Mock is enough? | Use real MongoDB when |
|---|---|---|
| Mapping DTO to domain object | Usually yes | BSON types or date precision matter |
| findOne query shape | Sometimes | Collation, projection, or index coverage matters |
| Unique slug enforcement | No | Only a real unique index proves it |
| Aggregation pipeline | Rarely | Grouping, unwinding, sorting, or lookups are important |
| Transactional write | No | Session behavior and rollback must be verified |
| TTL expiry | No for server behavior | You need confidence in index definition and cleanup policy |

Keep the test boundary explicit. If a test says it validates unique email behavior, it should create the unique index and attempt a duplicate insert. If it only checks that your code called a mock with an email field, it is not testing the database contract.

## Isolated databases with mongodb-memory-server

mongodb-memory-server is convenient for local and CI integration tests because it starts a real mongod process controlled by the test run. The example below uses Vitest, the official mongodb driver, and a database name scoped to the test file. Jest looks similar with beforeAll and afterAll.

\`\`\`ts
import { MongoClient, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { UserRepository } from '../src/user-repository';

let server: MongoMemoryServer;
let client: MongoClient;
let db: Db;

beforeAll(async () => {
  server = await MongoMemoryServer.create();
  client = new MongoClient(server.getUri());
  await client.connect();
  db = client.db('user_repository_test');
});

beforeEach(async () => {
  await db.collection('users').deleteMany({});
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
});

afterAll(async () => {
  await client.close();
  await server.stop();
});

test('rejects duplicate user email through the real unique index', async () => {
  const repository = new UserRepository(db);

  await repository.createUser({ email: 'sam@example.test', name: 'Sam' });

  await expect(
    repository.createUser({ email: 'sam@example.test', name: 'Duplicate Sam' }),
  ).rejects.toMatchObject({ code: 11000 });
});
\`\`\`

This test proves a real MongoDB unique index rejects duplicates. A mock cannot do that unless you reimplement index behavior in the mock, which defeats the purpose. Notice that the index is created in the test setup. If production creates indexes through migrations or startup code, call that same setup path in tests so drift is caught.

Use deleteMany for small collections in focused tests. For larger suites, dropping and recreating databases can be simpler and more deterministic. The key is isolation: one test should not depend on documents left by another test.

## Fixture design for document databases

MongoDB fixtures should be realistic enough to exercise query behavior, but small enough to read. Include fields that matter to filters, sort order, projections, indexes, and aggregation. Avoid giant copied production documents unless the test is specifically about import compatibility.

Good fixtures include counterexamples. If you are testing active subscriptions, insert active, canceled, expired, and trial documents. If you are testing tenant filtering, insert a highly similar document in another tenant. If you are testing collation, include case and accent variants.

| Fixture risk | Example data to include | Defect it can reveal |
|---|---|---|
| Missing tenant filter | Same slug in two tenants | Cross-tenant read or duplicate conflict |
| Sort instability | Same createdAt with different _id values | Pagination duplicates or missing rows |
| Optional field | Document with missing field and null field | Query treats absent and null incorrectly |
| Array update | Empty array and multiple existing elements | $push, $addToSet, and positional update mistakes |
| Date boundary | Before, exactly at, and after cutoff | Off-by-one retention or billing period errors |

Prefer explicit fixture builders over opaque JSON blobs. A builder can default irrelevant fields while keeping test-specific fields visible. Do not hide the fields that make the test meaningful. If tenantId is the reason the test exists, it should be obvious in the test body.

## Testing indexes and query plans

Performance regressions often begin as correctness tests that never checked index usage. For critical queries, assert that expected indexes exist and, in selected cases, inspect explain output. Do this sparingly. Query plan assertions can be brittle across MongoDB versions and data distributions, but they are valuable for queries that must never scan a large collection.

\`\`\`ts
import { Db } from 'mongodb';
import { expect, test } from 'vitest';

async function ensureOrderIndexes(db: Db) {
  await db.collection('orders').createIndex({ tenantId: 1, status: 1, createdAt: -1 });
}

test('open order query uses the tenant status createdAt index', async () => {
  await ensureOrderIndexes(db);
  const orders = db.collection('orders');

  await orders.insertMany([
    { tenantId: 'acme', status: 'open', createdAt: new Date('2026-07-01'), total: 120 },
    { tenantId: 'acme', status: 'closed', createdAt: new Date('2026-07-02'), total: 80 },
    { tenantId: 'globex', status: 'open', createdAt: new Date('2026-07-03'), total: 90 },
  ]);

  const plan = await orders
    .find({ tenantId: 'acme', status: 'open' })
    .sort({ createdAt: -1 })
    .explain('executionStats');

  const winningPlan = JSON.stringify(plan.queryPlanner.winningPlan);
  expect(winningPlan).toContain('tenantId_1_status_1_createdAt_-1');
  expect(plan.executionStats.totalDocsExamined).toBeLessThanOrEqual(1);
});
\`\`\`

This kind of assertion belongs on high-risk queries, not every repository method. It can catch accidental index removal, changed sort direction, or a query rewrite that no longer matches the compound index. Keep the fixture small and the assertion tied to the product risk.

Index creation itself should be tested through the same code path production uses. If migrations create indexes, integration tests should run migrations. If the service creates indexes on startup, test startup index creation once. Otherwise, test databases drift from production and give false confidence.

## Transactions and session behavior

MongoDB transactions require a replica set. Some in-memory configurations and simple local mongod setups may not support the same transaction behavior as production. If your code relies on transactions, use a test setup that starts MongoDB in a transaction-capable mode, such as a replica set via Testcontainers or a memory server configured for replica sets.

Transaction tests should prove rollback and commit. A payment workflow that inserts an invoice and updates account balance should leave neither change when the second write fails. Do not only assert that startSession was called. Use real reads after the transaction to prove database state.

Keep transaction fixtures small. The point is not to test every business path inside one transaction test. The point is to validate that your transaction wrapper passes the session to every collection operation and handles abort correctly.

## Aggregation pipeline tests

Aggregation pipelines are logic and deserve direct tests. They can break through stage ordering, type conversions, unwinds that drop empty arrays, timezone mistakes in date grouping, or projections that remove needed fields. A focused pipeline test with a handful of documents is often clearer than an end-to-end API test.

When testing aggregation, assert the whole small result if the output is stable. For reports, include boundary data: empty groups, multiple tenants, records on date edges, and missing optional fields. If the pipeline uses $lookup, include a missing related document to prove the behavior is intentional.

Avoid snapshots for large aggregation results. They are hard to review. Prefer explicit expected arrays with meaningful IDs and totals. If order matters, assert order. If order does not matter, sort before comparing or use set-like assertions.

## ObjectId, dates, and BSON-specific defects

MongoDB stores BSON types, not plain JSON. Tests that only use mocks can miss ObjectId comparison bugs, date precision issues, Decimal128 handling, and binary data behavior. Use real driver types in integration tests.

ObjectId equality is a common trap. Two ObjectId instances with the same value are not equal by JavaScript reference. Code should use equals or string conversion deliberately. Integration tests should include reading a document by ObjectId and returning API-safe strings if that is the service contract.

Dates should be tested around timezone boundaries. MongoDB stores dates in UTC. If product logic groups by local day, the aggregation must specify timezone behavior. Insert documents near midnight UTC and assert the intended local grouping.

## Cleaning state without hiding bugs

The simplest cleanup is to delete documents from collections before each test. That works for small suites, but it does not reset indexes, validators, or collection options. Dropping the database resets more state but may be slower. Choose based on what the test needs.

Do not delete collections after each test if you need indexes created once in beforeAll. Either recreate indexes in beforeEach or keep collection structure and clear documents. Make the choice visible. Hidden cleanup helpers that drop indexes can produce confusing failures when a test expects a unique constraint.

Parallel tests need unique database names or worker-scoped collections. If two workers share a database and both call deleteMany, they will interfere. Generate database names with a worker ID or test file slug. Clean them after the run.

## CI environment choices

mongodb-memory-server is convenient, but it downloads MongoDB binaries unless cached. In locked-down CI, that can fail or slow the first run. Cache the binary directory or use a container image with MongoDB preinstalled. Testcontainers gives you production-like container behavior and easier replica set options at the cost of Docker startup time.

Use the same MongoDB major version as production when testing features such as aggregation operators, transactions, time series collections, or index behavior. Version mismatches can hide unsupported features or introduce false failures. Pin the version in the test setup.

Publish database logs when integration tests fail in CI if possible. Duplicate key errors are clear. Transaction and startup failures may need server logs to diagnose quickly.

## Schema validation and collection options

MongoDB can enforce JSON schema validation at the collection level. If production relies on validators, integration tests should create collections with those validators and prove invalid documents are rejected. Application-level validation is still useful, but database validation is the last line of defense when another writer, script, or migration touches the collection.

Test both sides. Insert a valid representative document and an invalid document that violates a required field, enum, or BSON type. If validationAction is warn in production, do not pretend the database blocks writes in tests. Match the policy. If validation is strict for regulated collections and permissive for event logs, encode that difference in setup.

Collection options such as collation also affect behavior. Case-insensitive unique indexes, locale-aware sorting, and string comparisons can behave differently from JavaScript expectations. If user emails are unique case-insensitively, test that the index and collation enforce it. Lowercasing in application code alone is not the same as a database guarantee.

## Change streams, TTL, and background behavior

Some MongoDB behavior is asynchronous. TTL indexes do not delete documents instantly. Change streams require replica set behavior and can involve resume tokens. If your service depends on these features, keep tests realistic about timing and environment.

For TTL, assert the index definition in fast tests and use a separate slower test only if you truly need to observe expiry. Waiting for TTL cleanup in every pull request is usually wasteful. For change streams, prefer a containerized replica set and assert that a known insert produces the expected event shape. Keep timeouts generous enough for CI but fail with clear diagnostics.

Background behavior often belongs in a narrower suite than ordinary repository tests. Label it clearly so developers know why it is slower. A test named emits order change stream event is easier to respect than a generic integration test that sometimes takes ten seconds.

## Migration testing for MongoDB

MongoDB migrations deserve the same care as relational migrations. Backfills, index additions, field renames, and data type conversions can break production even when application tests pass. A migration test should start with documents in the old shape, run the migration, and assert the new shape plus backward compatibility if old application versions may still read the data.

Test idempotency. Many migration tools may retry after partial failure. Running the migration twice should either be safe or fail in a documented way before changing data incorrectly. For index builds, test that the migration handles existing indexes and duplicate data according to the rollout plan.

Large backfills need sampling and operational checks. Unit-sized integration tests can prove transformation logic, but production rollout also needs batch size, resume behavior, and monitoring. Capture those assumptions in migration documentation and, where practical, in tests around the migration runner.

## Observability for data access tests

When a MongoDB integration test fails, the assertion should reveal the query or write contract that broke. Add helper errors that include collection name, filter, update document, and relevant inserted fixture IDs. Avoid dumping entire documents with secrets, but include enough context to debug without attaching a debugger.

For slow query tests, capture execution stats only for the query under test. Do not turn every integration run into a profiler. If a query plan assertion fails, print the winning plan and index names. That makes the failure reviewable in CI logs.

Finally, separate product defects from environment failures. A duplicate key error from the tested operation is a product signal. A mongod startup failure or binary download problem is infrastructure. CI reporting should make that distinction visible so teams do not misclassify environment issues as flaky product tests.

## When to seed through APIs instead of collections

Direct collection inserts are fast and precise, but they can bypass application invariants. Use them when the test is about query behavior, indexes, or repository reads. Seed through service APIs when the test depends on side effects such as audit records, derived fields, counters, denormalized summaries, or domain events.

Mixing both styles is normal. A repository test might insert old-shape documents directly to validate a migration. An API integration test might create an order through the service and then inspect MongoDB to confirm the write model. The key is to choose deliberately. If direct fixtures skip required fields, they can create states production never creates. If API fixtures are used for every low-level query test, the suite becomes slow and hard to diagnose.

Document fixture ownership. Collections used by multiple tests should have builders that encode required defaults, while each test still names the fields it is exercising. That balance keeps setup readable without scattering invalid documents through the suite.

## Frequently Asked Questions

### Should MongoDB integration tests use mongodb-memory-server or Testcontainers?

mongodb-memory-server is fast and convenient for many Node suites. Testcontainers is better when you need a Dockerized environment, replica set behavior, version parity, or a setup closer to production. Some teams use memory server for pull requests and containers for deeper CI jobs.

### Do I need to test MongoDB indexes?

Test indexes that enforce correctness, such as unique constraints, and selectively test query plans for high-risk performance paths. You do not need explain assertions for every query, but critical tenant and dashboard queries deserve coverage.

### How should I isolate MongoDB tests in parallel CI?

Use worker-specific database names or isolated containers. Avoid sharing one database across parallel workers if tests delete documents or mutate shared fixtures. Shared cleanup is a common source of nondeterministic failures.

### Can mocks catch MongoDB update operator bugs?

Rarely with confidence. Operators such as $addToSet, positional updates, arrayFilters, and aggregation stages have server semantics. Use real MongoDB integration tests for code that depends on those behaviors.

### Should fixtures include ObjectId values or strings?

Use ObjectId values at the database boundary so tests exercise BSON behavior. Convert to strings only at the API or DTO layer if that is the contract your service exposes.
`,
};
