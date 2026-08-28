import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Race Condition Testing: Interleavings That Reproduce Shared-State Bugs',
  description:
    'Race condition testing forces concurrent interleavings so shared-state bugs reproduce with barriers, schedules, and invariant asserts you can gate in CI.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Race Condition Testing: Interleavings That Reproduce Shared-State Bugs

Race condition testing is the practice of designing tests that force or sample concurrent interleavings so flaky shared-state bugs reproduce reliably instead of vanishing under a debugger. You inventory mutable shared state, add synchronization harnesses (barriers, latches, Atomics.wait/notify, shared promises), run controlled thread or worker pools, and assert invariants under concurrency rather than hoping sequential unit tests catch timing bugs. Concretely: gate N workers behind one release signal, stress the check-then-act path, and fail the build when counters, balances, or cache entries violate a stated rule.

Most teams discover races the expensive way. A payment credit doubles in production once a week. A cache stampede spikes p99 latency after a deploy. A "flake" in CI disappears when someone adds a sleep. Race condition testing treats those symptoms as incomplete reproduction, not as bad luck.

## Failure Story: The Balance That Only Broke On Fridays

A wallet service had a credit endpoint that looked safe in sequential tests. The handler read the balance, applied a delta, and wrote it back. Unit tests with mocked repositories always passed. Integration tests with one client always passed. On Friday evenings, when batch refunds and live purchases overlapped, a small set of accounts showed balances that did not match the ledger sum.

The bug was classic check-then-act. Two concurrent credits both read 100, both decided the next value was 150, and both wrote 150. One of the 50-unit credits vanished. The team "fixed" it by adding a short sleep in the refund job "to reduce contention." The sleep lowered the rate of loss enough that weekly spot checks looked clean. Three months later a holiday traffic spike returned the undercount, and finance had to rebuild balances from the event log.

What people get wrong here is treating rarity as proof of safety. A race that fires once per ten thousand attempts is still a correctness bug. Sleeps and retries hide it. Race condition testing makes the loss fire every time under a harness, then proves the transactional fix stops the loss under the same harness.

## Reproducing vs Detecting Races

Reproduction and detection are different jobs. Detection answers "could this code race?" Reproduction answers "can I make this race fail on demand?" Static analysis, ThreadSanitizer-style tools, and model checkers help with detection. Practitioner QA work usually needs reproduction: a test that fails until the product code serializes the critical section correctly.

| Goal | Typical tool | Evidence of success | Risk if used alone |
|---|---|---|---|
| Detect possible races | Static analyzers, TS dataflow notes, code review checklists | List of shared mutable locations | False confidence that "no tool warning" means safe |
| Reproduce a known race | Barriers, latches, stress loops, controlled pools | Fail rate near 100% before fix, near 0% after | Harness that only races the test, not the product |
| Detect unknown races in CI | Probabilistic stress + invariant asserts | Occasional hard failures with clear invariant messages | Flakes that get muted instead of fixed |
| Prove a fix | Same reproduction harness after the patch | Deterministic green under former failing schedule | Changing the harness so the old interleaving is gone |

Linus Torvalds' blunt rule for kernel races applies in application QA too: if you think you found a race, make it fail every time. A 1% flake is not a reproduction. A barrier that parks every worker until all have entered the critical path, then releases them together, turns a rare collision into a reliable one.

Detection-only suites still matter for inventory. They do not replace a failing test that names the invariant: "after N concurrent credits of D, balance equals start + N*D."

## Shared Mutable State Inventory

Before you write a concurrent test, list every shared mutable location the code path touches. If you cannot name the state, you cannot invent a meaningful invariant.

Walk the request or job path and mark anything that more than one concurrent actor can read and write:

1. In-process objects: module-level Maps, singleton caches, connection pool counters, feature-flag snapshots held in memory.
2. Database rows: balances, inventory counts, unique reservation keys, outbox cursors.
3. External stores: Redis keys, S3 objects used as locks, CDN cache entries, file-system temp names.
4. Test doubles that are accidentally shared: a mutable mock clock, a shared faker seed, a suite-scoped array of fixtures.

| Shared location | Typical race shape | Invariant to assert |
|---|---|---|
| Wallet balance row | Lost update on read-modify-write | Final balance equals ledger sum |
| Inventory quantity | Oversell under concurrent reserve | quantity never negative; sold + reserved + available equals stocked |
| Idempotency key table | Double insert / double side effect | At most one successful side effect per key |
| Process-local cache Map | Stampede fills with N identical fetches | Exactly one fetch in flight per key; others wait |
| File rename publish | Partial reader sees half-written artifact | Readers only observe complete versions |

Write the inventory as a table in the PR or as comments next to the harness. Race condition testing without an inventory drifts into "run Promise.all a lot and hope something throws."

Ready-made QA skills for concurrent assertion patterns install from qaskills.sh with the qaskills CLI when you want agents to scaffold harness helpers, but the patterns below stay plain TypeScript so any runner can adopt them.

## Synchronization Harnesses (Barrier, CountDownLatch Analogs In JS)

Java developers reach for CyclicBarrier and CountDownLatch. In Node and the browser you build the same shapes with promises, Atomics, or SharedArrayBuffer. The point is not the API name. The point is to control when concurrent actors enter a critical region.

A promise barrier waits until N participants arrive, then releases all of them:

\`\`\`ts
export function createBarrier(parties: number) {
  let remaining = parties;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  return async function arriveAndWait(): Promise<void> {
    remaining -= 1;
    if (remaining === 0) release();
    await gate;
  };
}

// Usage: force N handlers to collide on the same wallet row
const barrier = createBarrier(8);
await Promise.all(
  Array.from({ length: 8 }, async () => {
    await barrier(); // all pause here until the 8th arrives
    await creditWallet('acct_1', 10);
  }),
);
\`\`\`

A latch is one-shot: the test thread opens the gate after setup. Workers block on \`await ready\` until the test finishes seeding shared state.

\`\`\`ts
export function createLatch() {
  let open!: () => void;
  const ready = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { ready, open };
}

const { ready, open } = createLatch();

const workers = Array.from({ length: 16 }, async () => {
  await ready;
  return reserveSku('sku_42', 1);
});

await seedInventory('sku_42', 5);
open(); // release everyone together
const results = await Promise.all(workers);
\`\`\`

When workers are real OS threads via \`worker_threads\`, prefer \`Atomics.wait\` / \`Atomics.notify\` on a SharedArrayBuffer so parking does not depend on the event loop of a single isolate:

\`\`\`ts
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

if (isMainThread) {
  const sab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
  const gate = new Int32Array(sab);
  const workers = Array.from({ length: 4 }, () =>
    new Worker(new URL(import.meta.url), { workerData: { sab } }),
  );
  // ... start work, then release:
  Atomics.store(gate, 0, 1);
  Atomics.notify(gate, 0, 4);
} else {
  const gate = new Int32Array(workerData.sab);
  Atomics.wait(gate, 0, 0); // sleep until main stores 1
  // critical section under test
  parentPort?.postMessage('done');
}
\`\`\`

Atomic counters help you prove how many actors actually entered the section, not how many you scheduled:

\`\`\`ts
const entered = new Int32Array(new SharedArrayBuffer(4));
Atomics.add(entered, 0, 1);
// after join:
assert.equal(Atomics.load(entered, 0), expectedParties);
\`\`\`

Keep harness helpers tiny. If the barrier itself is racy (decrement without care across workers), your test will flake for the wrong reason. Prefer single-threaded coordination for promise barriers, and Atomics for cross-thread counters.

## Deterministic Interleaving Schedules vs Probabilistic Stress

Two complementary strategies exist. Deterministic schedules pick an order of operations and execute that order every run. Probabilistic stress fires many concurrent attempts and relies on timing variance to sample interleavings.

Deterministic schedules shine when you already know the dangerous shape: "B must observe A's read but write before A's write." You encode that with latches between steps.

\`\`\`ts
import assert from 'node:assert/strict';

async function lostUpdateCollision(credit: (id: string, n: number) => Promise<void>) {
  // Both credits start together and neither waits for the other. With a
  // read-modify-write credit implementation this samples the lost-update
  // interleaving; with a transactional one the balance always lands +20.
  const start = createLatch();

  const a = (async () => {
    await start.ready;
    await credit('acct', 10);
  })();

  const b = (async () => {
    await start.ready;
    await credit('acct', 10);
  })();

  start.open();
  await Promise.all([a, b]);
}

// Run lostUpdateCollision many times in CI: the unfixed implementation loses
// an update within a few dozen iterations; after the transactional fix, assert
// balance === start + 20 on every run.
\`\`\`

Probabilistic stress is the Linus-style blunt instrument when you do not yet know the schedule:

\`\`\`ts
import { describe, it, expect } from 'vitest';

describe('wallet credit concurrency', () => {
  it('preserves balance under concurrent credits', async () => {
    const start = 100;
    await setBalance('acct', start);
    const n = 50; // illustrative
    const delta = 1;
    await Promise.all(Array.from({ length: n }, () => creditWallet('acct', delta)));
    const end = await getBalance('acct');
    expect(end).toBe(start + n * delta);
  }, 20_000);
});
\`\`\`

Run the focused Vitest case with \`vitest -t "preserves balance"\` or \`vitest --testNamePattern "preserves balance"\` while you iterate. Do not invent custom CLI flags; use the runner's documented filters. For Playwright specs that drive concurrent UI+API mixes, filter with \`npx playwright test --grep "stampede"\` or \`-g "stampede"\`.

| Strategy | Best when | Weakness | How to stop early |
|---|---|---|---|
| Deterministic schedule | Bug shape is known; you need CI stability | Misses unknown orders | Keep a small catalog of named schedules |
| Probabilistic stress | Hunting; post-fix soak | Can pass by luck on fast machines | Raise N, add CPU noise, assert invariants every iteration |
| Hybrid | CI gate + nightly soak | More harness code | Deterministic suite required; stress optional |

A useful hybrid: one deterministic collision test that must always fail before the fix, plus a nightly stress loop that samples wider schedules. Never delete the deterministic case after the fix. That case is your regression lock.

## Database Check-Then-Act Races (SELECT Then UPDATE)

Application code that SELECTs a row, decides in process memory, then UPDATEs is the most common production race in CRUD services. Transactions without the right isolation or without \`UPDATE ... WHERE\` predicates still lose.

Illustrative anti-pattern:

\`\`\`ts
async function unsafeCredit(client: PoolClient, id: string, delta: number) {
  const { rows } = await client.query(
    'SELECT balance FROM wallets WHERE id = $1',
    [id],
  );
  const next = Number(rows[0].balance) + delta;
  await client.query('UPDATE wallets SET balance = $1 WHERE id = $2', [next, id]);
}
\`\`\`

A reproduction harness opens multiple clients and releases them together:

\`\`\`ts
import pg from 'pg';
import assert from 'node:assert/strict';

async function reproduceLostUpdate(pool: pg.Pool) {
  const id = 'acct_race';
  await pool.query('UPDATE wallets SET balance = 100 WHERE id = $1', [id]);

  const parties = 10; // illustrative
  const barrier = createBarrier(parties);

  await Promise.all(
    Array.from({ length: parties }, async () => {
      const client = await pool.connect();
      try {
        await barrier();
        await unsafeCredit(client, id, 1);
      } finally {
        client.release();
      }
    }),
  );

  const { rows } = await pool.query('SELECT balance FROM wallets WHERE id = $1', [id]);
  assert.equal(Number(rows[0].balance), 110); // fails until the race is fixed
}
\`\`\`

Fixes that tests should accept (pick the one your product owns):

1. Single-statement update: \`UPDATE wallets SET balance = balance + $1 WHERE id = $2 RETURNING balance\`.
2. Row lock: \`SELECT ... FOR UPDATE\` inside a transaction before the write.
3. Optimistic version: \`UPDATE ... WHERE id = $1 AND version = $2\` with retry on zero-row updates.

Your race condition testing should keep the same concurrent harness and only change the product function. If you weaken the harness to make the new code pass, you did not prove the fix.

SQL-side setup for a minimal wallet table used in local reproduction:

\`\`\`sql
CREATE TABLE wallets (
  id text PRIMARY KEY,
  balance numeric NOT NULL CHECK (balance >= 0),
  version integer NOT NULL DEFAULT 0
);

INSERT INTO wallets (id, balance) VALUES ('acct_race', 100);
\`\`\`

When the same service also maintains denormalized counters through triggers, concurrent updates can interact with trigger side effects. Pair wallet race suites with trigger contract checks (side effects, ordering, bypass paths) so you know whether the lost update is in application SQL, in a trigger body, or in both.

## File And Cache Stampede Patterns

Stampede races happen when many actors notice a miss and all rebuild the same value. The symptom is not always wrong data. Often the data is eventually correct, but you paid N times for one fetch, spiked origin load, and raced writers into a shared Map.

In-process stampede sketch:

\`\`\`ts
type Entry = { value: string; expiresAt: number };

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<string>>();

async function getOrLoad(key: string, load: () => Promise<string>): Promise<string> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const existing = inflight.get(key);
  if (existing) return existing;

  const p = load().then((value) => {
    cache.set(key, { value, expiresAt: Date.now() + 60_000 });
    inflight.delete(key);
    return value;
  }, (err) => {
    inflight.delete(key);
    throw err;
  });

  inflight.set(key, p);
  return p;
}
\`\`\`

A race condition test for this path counts how many times \`load\` runs under a barrier:

\`\`\`ts
import assert from 'node:assert/strict';

let loads = 0;
const load = async () => {
  loads += 1;
  await new Promise((r) => setTimeout(r, 20));
  return 'v1';
};

cache.clear();
inflight.clear();
const barrier = createBarrier(20);
await Promise.all(
  Array.from({ length: 20 }, async () => {
    await barrier();
    return getOrLoad('k', load);
  }),
);
assert.equal(loads, 1); // stampede if loads === 20
\`\`\`

File publish races need different invariants. Writers that write to \`report.json\` in place will expose partial JSON to concurrent readers. The usual pattern is write to a temp file, then atomic rename. Tests should start readers at the barrier and assert every successful read parses as complete JSON with the expected version field.

Cache stampedes also show up in webhook fan-in: many workers process "cache miss" style work for the same logical event. When the event is a payment notification, combine stampede controls with replay and idempotency checks. A single logical payment must not create two ledger rows just because two workers missed a cache entry at the same instant.

## Asserting Invariants Under Concurrency (Not Just "Didn't Crash")

"Promise.all finished without throwing" is not a correctness proof. Race condition testing lives or dies on invariants.

Good invariants are state equations you can evaluate after the concurrent section:

- Conservation: start + sum(deltas) = end.
- Mutual exclusion outcomes: at most one winner for a unique reservation.
- Cardinality: exactly one row per idempotency key.
- Monotonicity: a sequence number never moves backward for a given stream.
- Absence: no partial files in the published directory.

\`\`\`ts
async function assertWalletMatchesLedger(pool: pg.Pool, walletId: string) {
  const bal = await pool.query('SELECT balance FROM wallets WHERE id = $1', [walletId]);
  const led = await pool.query(
    'SELECT COALESCE(SUM(delta), 0) AS s FROM ledger WHERE wallet_id = $1',
    [walletId],
  );
  assert.equal(Number(bal.rows[0].balance), Number(led.rows[0].s));
}
\`\`\`

Run invariant checks:

1. Immediately after the concurrent wave.
2. After a short settle period if the system is eventually consistent (document the bound).
3. After process restart when durability matters.

| Weak assertion | Stronger replacement |
|---|---|
| no exception thrown | conservation equality on balance vs ledger |
| final HTTP 200 from all workers | exactly one 201 create; others 409 conflict |
| cache has a value | load() call count === 1 for that key |
| file exists | JSON parses; schema version matches; checksum matches |

Stress loops should fail on the first invariant break and print the schedule inputs (party count, seed, wallet id). Silent retries inside the test hide the signal you need.

## Flaky Test Triage When The Race Is In The Test Itself

Sometimes the product is fine and the harness is racy. Classic signs:

- The flake rate changes when you add logging (observer effect on timing).
- Failures vanish under \`vitest -t\` for a single case but return in full-file parallel runs.
- Shared \`beforeAll\` state is mutated by test A while test B reads it.
- The barrier counts the wrong party number because one worker errors before \`arrive\`.
- Fake timers and real async I/O are mixed without a clear clock owner.

Triage steps that stay practical:

1. Run the case alone: \`vitest -t "preserves balance"\`. If it is green alone and red in parallel, suspect shared suite state.
2. Pin worker count. Vitest and Playwright both expose pool options in config; do not invent CLI flags. Use documented config keys and \`--testNamePattern\` / \`--grep\` for selection only.
3. Log barrier arrival counts with Atomics or a single-threaded counter. If you release with fewer parties than you think, the "collision" never happened.
4. Replace wall-clock \`setTimeout\` waits with latches. Sleeps in tests are how races migrate from product code into the suite.
5. Check whether mocks are singleton imports. A mutable mock repository shared across files is shared mutable state.

If the product race is real, keep the failing deterministic case. If the race is in the test, delete the sleep and fix the ownership of fixtures. Do not mute the test with retries as a substitute for either fix.

## Relating Race Tests To Webhooks, Idempotency, And Triggers

Concurrent bugs rarely live in one layer. A payment provider retries a webhook while your workers also redeliver from a queue. Two handlers pass a check-then-act "have we processed this event id?" gate, and both insert a ledger row. That is race condition testing on the idempotency table: assert at most one successful side effect per event id under a barrier of duplicate deliveries. The full replay matrix belongs with [/blog/payment-webhook-testing-idempotency-replay](/blog/payment-webhook-testing-idempotency-replay), but the concurrent harness is the same barrier-plus-invariant pattern as the wallet example.

Triggers add another actor that is invisible to the application thread. An AFTER UPDATE trigger that maintains a denormalized \`wallet_totals\` table can race with application-level retries or with concurrent updates if the trigger body reads without locks. When your concurrent credit test passes on \`wallets.balance\` but reporting tables drift, move the investigation into [/blog/database-trigger-testing-side-effects](/blog/database-trigger-testing-side-effects) and assert trigger side effects under the same multi-client release.

A practical CI split:

1. Fast deterministic collision tests for application SQL and in-process caches.
2. Integration tests that include trigger-visible side effects.
3. Nightly probabilistic stress on webhook idempotency keys with duplicate deliveries.

Each layer reuses inventory, harness, and invariant habits. The difference is which shared location you name in the assertion.

## Practitioner Checklist Before You Merge A Concurrency Fix

Use this as a gate, not as theater:

1. Named shared state and a written invariant.
2. A harness that failed reliably before the fix (barrier or schedule).
3. The same harness green after the fix without added sleeps.
4. Invariant assertion stronger than "no throw."
5. Notes on isolation level, lock mode, or version column if the database is involved.
6. A focused runner command using Vitest \`-t\` / \`--testNamePattern\` or Playwright \`--grep\` / \`-g\` documented in the PR.
7. No new shared mutable fixtures in the test file.

If any box is missing, you are hoping, not testing.

## Writing The Bug Report So Engineers Can Reproduce Without You

A race that only lives in your head wastes a week. When the harness fails, capture the schedule, party count, seed (if any), invariant that broke, and the observed values. Paste the exact Vitest filter command. Attach the smallest fixture that still collides. If the product needs a database, include isolation level and whether the table has a version column or unique constraint that should have serialized writers.

Good bug reports for race condition testing look boring on purpose:

- "8 concurrent credits of 50 against balance 100; expected 500, observed 350; barrier released after all handlers entered SELECT."
- "Cache stampede: 32 workers, single key miss, observed 32 origin fetches; expected 1 fetch + 31 waiters."
- "Webhook replay: two deliveries with same event id; ledger grew by 2; expected growth of 1."

That last shape pairs naturally with payment webhook idempotency work. Keep the race report focused on the interleaving. Keep the product fix focused on the lock, transaction, or idempotency key. Do not mix "make CI green" pressure into the reproduction steps. The harness stays red until the critical section is actually serialized.

When AI coding agents propose a fix, make them keep your failing harness untouched as the acceptance test. Agents often "fix" races by widening sleeps, catching errors, or lowering concurrency in the test. Reject those diffs. The only acceptable green is the same party count, the same barrier, and a product-side serialization change that preserves the invariant.

## Frequently Asked Questions

### How is race condition testing different from load testing?

Race condition testing aims at correctness under specific interleavings. Load testing aims at capacity, latency, and error rates under volume. You can find races during a load run, but a k6 soak that only charts p95 will miss a silent lost update. Prefer a small concurrent suite with invariants for correctness, and keep load tools for performance budgets. When a soak does catch a race, extract a deterministic barrier test so CI can fail fast without the full load profile.

### When should I use Atomics.wait instead of a promise barrier?

Use promise barriers when all actors share one Node event loop (async functions in one process). Use \`Atomics.wait\` / \`Atomics.notify\` when true \`worker_threads\` or multiple isolates must park without relying on that single loop. Cross-process races (separate Node processes, separate app servers) need database locks, Redis primitives, or filesystem locks instead of Atomics. Pick the smallest coordination tool that matches the actor boundaries you are actually testing.

### How many concurrent parties are enough for a stress loop?

Start from the production contention you fear, not from a round number. For a wallet row, 8 to 32 concurrent credits often reproduces lost updates on unfixed read-modify-write paths (illustrative ranges, measure on your hardware). Raise the party count until the unfixed code fails almost always, then keep that count as the regression gate. If the unfixed code still rarely fails, your harness is not colliding on the same shared location.

### Should flaky concurrent tests use automatic retries in CI?

No. Retries convert a reproduction into noise and teach the pipeline to ignore invariant breaks. Fix the product or fix the harness. The only acceptable "retry" is intentional product-level optimistic concurrency with a bounded retry inside the system under test, which your assertions should model explicitly. CI-level reruns of a red concurrent test hide the signal race condition testing exists to amplify.
`,
};
