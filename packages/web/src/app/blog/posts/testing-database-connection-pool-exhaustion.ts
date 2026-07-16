import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Database Connection Pool Exhaustion Under Load',
  description: 'Learn to test database connection pool exhaustion with controlled saturation, acquisition timeouts, leak checks, load profiles, metrics, and CI safeguards.',
  date: '2026-07-16',
  category: 'Guide',
  content: `
# Testing Database Connection Pool Exhaustion Under Load

A database can be healthy while an application is effectively offline. If every connection in a local pool is busy, new requests wait even though the database still accepts queries from other clients. If a code path leaks one connection at a time, the incident may arrive hours after deployment rather than during a smoke test.

To test database connection pool exhaustion, deliberately occupy every pool slot, observe what happens to the next borrower, release capacity, and verify recovery. Then repeat the experiment with realistic concurrency and query duration. The goal is not to make the database fail. It is to prove that the application bounds waiting, applies backpressure, cleans up connections, and exposes saturation before users see widespread timeouts.

## Separate pool saturation from database connection limits

An application pool and the database server enforce different boundaries. A pool with four slots can be exhausted while a PostgreSQL server still has ample capacity. Conversely, ten application instances with pools of twenty can collectively approach a server limit even when no individual pool is saturated.

| Boundary | Owned by | Observable symptom | Primary test |
|---|---|---|---|
| Pool maximum | Application or driver configuration | Borrowers queue inside the process | Hold every pooled client, request one more |
| Acquisition timeout | Application or driver configuration | Waiting borrower fails after a bounded interval | Measure time to rejection under saturation |
| Query timeout | Driver, session, or database configuration | Acquired connection stops waiting on a query | Run a deliberately slow query in a test database |
| Server connection capacity | Database configuration and current usage | New physical connections are rejected | Controlled multi-instance or administrative test |
| Request deadline | API or job layer | Caller stops waiting before lower layers finish | Propagate cancellation and verify cleanup |

Do not label every connection error “pool exhaustion.” Authentication failure, DNS trouble, server restart, and server capacity rejection require different remediation. Capture both the driver error and pool state at failure time.

Estimate expected pressure before selecting a load. If average concurrency at the database is approximately arrival rate multiplied by database time, 80 query-bearing requests per second with 100 ms of database occupancy needs roughly eight concurrent slots on average. Tail latency, transactions with multiple statements, and bursts require headroom. This estimate guides a test; it is not a substitute for measurement.

## Build a disposable and tightly bounded test target

Run exhaustion experiments against an isolated database or schema with known test data. Never hold all connections in a shared production database. Use a dedicated application role with only required permissions, and make the pool maximum intentionally small so the behavior appears with a few workers.

The Node PostgreSQL driver exposes pool settings including \`max\`, \`connectionTimeoutMillis\`, and \`idleTimeoutMillis\`. This example creates a two-connection pool. Read the connection string from the environment rather than committing credentials.

\`\`\`ts
import { Pool } from 'pg';

export function createTestPool() {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error('TEST_DATABASE_URL is required');
  }

  return new Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 250,
    idleTimeoutMillis: 1_000,
  });
}
\`\`\`

Keep the acquisition timeout longer than ordinary local scheduling noise but short enough for the suite. The exact value is environment-specific. A CI runner with remote database networking may need a larger threshold than a developer laptop. Test behavior and a reasonable range, not one exact elapsed millisecond.

\`\`\`bash
export TEST_DATABASE_URL='postgres://qa_user:qa_password@127.0.0.1:5432/qa_pool_test'
pnpm add pg
pnpm add -D vitest @types/pg
pnpm exec vitest run tests/pool-exhaustion.integration.test.ts
\`\`\`

Treat the shown credential as local test data only. In CI, provide the URL through protected variables or construct it from the ephemeral service credentials.

## Prove that the next borrower waits and times out

The smallest meaningful exhaustion test is deterministic. Acquire two clients from a pool whose maximum is two, hold them, and request a third. The third acquisition should reject after the configured connection timeout. Always release clients in \`finally\`, because a failed assertion must not contaminate later tests.

\`\`\`ts
import type { PoolClient } from 'pg';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestPool } from './test-pool';

describe('pool exhaustion', () => {
  const pools: ReturnType<typeof createTestPool>[] = [];

  afterEach(async () => {
    await Promise.all(pools.splice(0).map((pool) => pool.end()));
  });

  it('bounds the wait for a third client', async () => {
    const pool = createTestPool();
    pools.push(pool);
    const held: PoolClient[] = [];

    try {
      held.push(await pool.connect());
      held.push(await pool.connect());
      expect(pool.totalCount).toBe(2);
      expect(pool.idleCount).toBe(0);

      const started = performance.now();
      await expect(pool.connect()).rejects.toThrow();
      const elapsedMs = performance.now() - started;

      expect(elapsedMs).toBeGreaterThanOrEqual(200);
      expect(elapsedMs).toBeLessThan(1_000);
    } finally {
      held.forEach((client) => client.release());
    }
  });
});
\`\`\`

This is an integration test of actual pool behavior, not a mock. The broad timing window reduces false failures while still detecting an immediate rejection or an unbounded hang. The public pool counters help explain state, but the observable promise result remains the core assertion.

Add a second case where a held client is released before the acquisition timeout. The waiter should receive a client and complete a simple \`SELECT 1\`. That test proves queuing and recovery, not only failure.

## Verify release on success, error, timeout, and cancellation

Most pool leaks come from an exceptional path. A manual \`connect()\` call must have a matching \`release()\`, normally in \`finally\`. Test every exit from repository or transaction code: successful query, database error, application validation error after acquisition, caller cancellation, and transaction rollback.

\`\`\`ts
import type { Pool } from 'pg';

export async function loadAccount(pool: Pool, accountId: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, status FROM accounts WHERE id = $1',
      [accountId],
    );
    return result.rows[0] ?? null;
  } finally {
    client.release();
  }
}
\`\`\`

After each scenario, wait for in-flight work to settle and assert the pool reaches the expected idle state. For the two-slot example, \`totalCount === 2\` and \`idleCount === 2\` indicates both established clients returned to the pool. A pool can also close idle clients, so adapt assertions if the test waits beyond the idle timeout.

| Exit path | Fault injection | Cleanup assertion |
|---|---|---|
| Query succeeds | Return one fixture row | Client becomes reusable |
| SQL fails | Query a deliberately missing test object | Error propagates and client returns |
| Application throws | Throw after query but before return | \`finally\` releases the client |
| Transaction fails | Reject a statement after \`BEGIN\` | Rollback is attempted, then release occurs |
| Caller cancels | Abort request while work is pending | No permanent pool slot loss |
| Process shutdown | Start work, then invoke graceful shutdown path | New work stops and pool closes according to policy |

Be cautious with cancellation claims. Canceling an HTTP request does not automatically cancel a database query in every stack. Your test must match the driver and application behavior actually implemented. At minimum, prove that abandoned application work does not retain a client forever.

## Shape load to reveal queuing instead of only throughput

A load test should record acquisition time separately from query time. End-to-end latency alone cannot show whether the database was slow or callers waited for a pool slot. Use a small pool, a parameterized concurrency level, and a controlled query duration.

The following script launches concurrent PostgreSQL sleeps. \`pg_sleep\` is appropriate only for a dedicated PostgreSQL test target. It makes connection occupancy explicit without requiring a large dataset.

\`\`\`ts
import { performance } from 'node:perf_hooks';
import { Pool } from 'pg';

const concurrency = Number(process.env.CONCURRENCY ?? 12);
const holdSeconds = Number(process.env.HOLD_SECONDS ?? 0.1);
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error('TEST_DATABASE_URL is required');

const pool = new Pool({ connectionString, max: 4 });

async function worker(id: number) {
  const waitingAt = performance.now();
  const client = await pool.connect();
  const acquiredAt = performance.now();
  try {
    await client.query('SELECT pg_sleep($1)', [holdSeconds]);
    return {
      id,
      acquireMs: acquiredAt - waitingAt,
      totalMs: performance.now() - waitingAt,
    };
  } finally {
    client.release();
  }
}

try {
  const results = await Promise.all(
    Array.from({ length: concurrency }, (_, index) => worker(index)),
  );
  console.table(results);
} finally {
  await pool.end();
}
\`\`\`

Run at concurrency one, at the pool maximum, just above the maximum, and at several multiples of it. At or below four, acquisition wait should usually be small. Above four, work arrives in waves and later workers accumulate queue time. This staircase makes saturation visible without overwhelming the database.

Do not use open-loop request generation without a ceiling during early tests. An unbounded backlog can exhaust application memory before it teaches you anything new about the pool. Admission control is conceptually similar to protecting a service with a bucket of limited capacity. [Testing a token bucket rate limiter API](/blog/testing-token-bucket-rate-limiter-api) provides useful boundary patterns, although database pool slots are leased resources rather than replenished request tokens.

## Measure the signals that distinguish exhaustion from slowness

At minimum, collect active or checked-out connections, idle connections, queued acquisition requests, acquisition duration, query duration, acquisition timeout count, and request outcome. Use histograms for durations and counters for timeouts. Aggregate by service and database role, not raw SQL text or user ID.

Correlate application pool metrics with database-side sessions and query activity. If the pool is full and query duration rises, investigate slow statements or locks. If clients are checked out for a long time while the database shows little active work, suspect application processing inside a transaction or a leak. If physical connection creation fails while pools are not full, inspect server capacity, credentials, and networking.

Define a recovery assertion for load tests. After load stops and all promises settle, queued acquisitions should return to zero, checked-out connections should return, and a probe query should succeed within its normal threshold. A test that stops at peak failure misses the most important question: whether the service heals without restart.

## Test backpressure at the API or worker boundary

The pool should not be the only queue. If an API accepts unlimited work while only a few connections exist, request memory and latency grow until upstream timeouts fire. Test the application’s chosen response: a concurrency limiter, bounded work queue, fast overload response, or request deadline.

Send more database-dependent requests than the pool can serve and a separate health request that does not need the database. Verify the health endpoint stays responsive if that is the intended design. Confirm that overload responses are distinguishable from database query failures and that the caller does not receive a misleading success.

Retry policy needs special attention. Immediately retrying an acquisition timeout inside the same overloaded process adds more queued work. If a higher layer retries, it needs a strict budget and backoff. For transactional operations, preserve idempotency and never assume that a timeout proves no effect occurred.

## Put a small saturation case in CI

CI should run the two-slot deterministic tests, leak-path tests, and a short recovery scenario. Save the larger concurrency profile for a scheduled performance environment. GitLab can start a PostgreSQL service and ingest JUnit output from the test runner.

\`\`\`yaml
pool-exhaustion-tests:
  image: node:22
  services:
    - name: postgres:17
      alias: db
  variables:
    POSTGRES_DB: qa_pool_test
    POSTGRES_USER: qa_user
    POSTGRES_PASSWORD: qa_password
    TEST_DATABASE_URL: postgres://qa_user:qa_password@db:5432/qa_pool_test
  script:
    - corepack enable
    - pnpm install --frozen-lockfile
    - pnpm exec vitest run tests/pool --reporter=junit --outputFile=pool-results.xml
  artifacts:
    when: always
    reports:
      junit: pool-results.xml
\`\`\`

Pin images according to your organization’s dependency policy and initialize the required test schema before running repository tests. The JUnit artifact makes failures visible in the pipeline UI. For triage patterns when a suite becomes unstable, see [GitLab CI JUnit reports for flaky tests](/blog/gitlab-ci-junit-report-flaky-tests).

Keep CI assertions deterministic. Do not fail a shared runner because p99 acquisition time moved by a few milliseconds. Fail on leaks, missing timeout bounds, incorrect error mapping, inability to recover, or a clear generous latency ceiling. Performance trend detection belongs in a stable environment with repeated samples.

## Frequently Asked Questions

### How small should the pool be in an exhaustion test?

Two connections are often enough for integration tests: hold both, then observe a third borrower. A size of one can test the basic boundary but cannot expose interactions between multiple holders. Load tests should also use the production configuration or a scaled model in a representative environment. The critical point is to record the configured maximum and generate concurrency both just below and just above it, rather than choosing a large arbitrary request count.

### Is a pool acquisition timeout the same as a query timeout?

No. An acquisition timeout occurs before the caller receives a pooled connection. A query timeout applies after a connection is available and a statement is running or waiting in the database. They need separate metrics, errors, and tests. End-to-end request deadlines can encompass both. Without that separation, a dashboard may blame slow SQL when the query never started, or blame the pool when a lock caused a running statement to stall.

### How can a test detect a connection leak reliably?

Exercise every success and failure path, wait for asynchronous cleanup, and compare pool counters with the known baseline. Then issue enough repeated operations that even a one-per-run leak would exhaust the deliberately small pool. Finish with a probe query and assert zero queued borrowers. Avoid relying only on process exit, because closing the whole pool can hide unreleased clients. Driver events and database session views can provide supporting evidence when a counter does not explain the leak.

### Should the application increase pool size when tests show saturation?

Not automatically. More connections may increase database contention, memory use, and total connections across replicas. First determine whether connections are held during slow queries, locks, external calls, or unnecessary transaction scope. Validate server capacity and instance count, then compare bounded alternatives such as query optimization, shorter transactions, admission control, or workload isolation. If increasing the pool is justified, rerun saturation and recovery tests at the new boundary and monitor database-wide connection use.
`,
};
