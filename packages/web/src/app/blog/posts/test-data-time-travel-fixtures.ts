import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Data Time Travel Fixtures for Deterministic Date-Driven Tests',
  description: 'Build test data time travel fixtures that control clocks, preserve database truth, and make expiry, billing, and retention tests deterministic in CI.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Test Data Time Travel Fixtures for Deterministic Date-Driven Tests

Test data time travel fixtures are coordinated test inputs that pin both the application clock and time-sensitive records to a declared scenario date. A useful fixture does more than freeze \`Date.now()\`. It creates rows relative to a named instant, executes the system under that same clock, and restores every altered clock or database resource after the assertion. That coordination makes expiration, renewal, retention, scheduling, and grace-period tests repeatable.

The key design rule is to distinguish event time from observation time. Event time belongs in persisted data, such as \`subscription.expires_at\`. Observation time is the instant the application believes it is now. When those are independently controlled, a test can move from one boundary to another without rewriting rows or waiting in real time. When they are mixed, a passing local test can fail in CI because midnight, daylight-saving changes, database defaults, or worker clocks disagree.

This guide builds a runnable PostgreSQL, Node.js, and Vitest workflow. The same architecture applies to other stacks: inject a clock, name scenario anchors, build data from explicit instants, and verify that every component observes the intended time.

## Model time as test data, not ambient state

Most applications quietly consult several clocks. JavaScript reads the process clock. PostgreSQL evaluates \`CURRENT_TIMESTAMP\` on the database server. A queue may stamp a message at publish time. A browser renders dates in its configured time zone. If a test freezes only one of those sources, its setup describes one world while the code under test inhabits another.

Inventory the clocks before creating fixtures:

| Clock source | Typical use | Control technique | Failure if uncontrolled |
|---|---|---|---|
| Application process | Expiry comparisons, generated timestamps | Inject a \`Clock\` or use fake timers | Assertions depend on wall time |
| Database server | Column defaults, SQL predicates | Pass an explicit \`asOf\` parameter | Rows disagree with application time |
| Job scheduler | Due-job selection | Invoke the selector with a declared instant | Tests wait or select changing work |
| Browser | Relative labels and local formatting | Set browser time zone and mock page time | Date labels differ by machine |
| External provider | Billing periods, webhook times | Recorded payload with explicit timestamps | Sandbox time advances independently |

A fixture should normally choose one canonical instant in UTC and derive all dates from it. UTC does not eliminate calendar rules, but it prevents the host machine's zone from silently changing an instant. Calendar calculations still need an explicit business zone when the requirement says, for example, "at midnight in Delhi" rather than "after 24 hours."

Do not encode a scenario as scattered magic timestamps. Name the anchor and the offsets. A reviewer can reason about \`expiredThreeDaysAgo\`; they should not need to mentally subtract ISO dates.

## Establish a clock contract in application code

The smallest reliable seam is an interface with one method. Production uses the real clock, while tests provide a mutable or fixed clock. Keep clock access close to domain decisions instead of passing raw timestamps through every unrelated layer.

\`\`\`ts
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class TestClock implements Clock {
  private current: Date;

  constructor(initial: string | Date) {
    this.current = new Date(initial);
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  travelTo(next: string | Date): void {
    this.current = new Date(next);
  }
}
\`\`\`

Returning a copy prevents callers from mutating the clock's stored \`Date\`. The constructor accepts an ISO string for readable test setup, but the interface returns a \`Date\` because that is what most Node persistence drivers and domain functions already consume.

Use the clock at the decision point:

\`\`\`ts
import type { Clock } from './clock';

type Subscription = {
  status: 'active' | 'cancelled';
  expiresAt: Date;
};

export function canAccess(subscription: Subscription, clock: Clock): boolean {
  if (subscription.status !== 'active') return false;
  return subscription.expiresAt.getTime() > clock.now().getTime();
}
\`\`\`

This policy says access ends exactly at \`expiresAt\`. That single character, \`>\` rather than \`>=\`, is a contract worth testing at the boundary. Time-travel fixtures are particularly valuable because they make before, at, and after cases obvious.

Fake timers remain useful when legacy code directly calls \`Date.now()\`, or when timers such as \`setTimeout\` are part of the behavior. Prefer injection for domain time because it is explicit and works even when multiple tests run concurrently in one process. Process-wide fake timers can leak between tests if cleanup fails.

## Define scenario anchors and relative builders

A fixture vocabulary should make temporal relationships visible. Start with one stable anchor, then write small helpers for duration arithmetic. Use milliseconds for elapsed-duration requirements. Use a calendar library or the platform's calendar APIs when the business requirement is based on months, local dates, or daylight-saving transitions.

\`\`\`ts
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const scenarioTime = {
  billingRun: new Date('2032-04-15T10:00:00.000Z'),
  retentionSweep: new Date('2032-07-01T00:00:00.000Z'),
} as const;

export function before(instant: Date, milliseconds: number): Date {
  return new Date(instant.getTime() - milliseconds);
}

export function after(instant: Date, milliseconds: number): Date {
  return new Date(instant.getTime() + milliseconds);
}

export const duration = { MINUTE_MS, DAY_MS };
\`\`\`

These future dates avoid accidental coupling to production history and make it clear that the clock is fictional. They are not special dates. The fixture owns them, so a later test can choose a leap day or a daylight-saving boundary when those cases matter.

Build records from the anchor rather than maintaining a folder of nearly identical JSON files:

\`\`\`ts
import { randomUUID } from 'node:crypto';

type SubscriptionRow = {
  id: string;
  accountId: string;
  status: 'active' | 'cancelled';
  startsAt: Date;
  expiresAt: Date;
};

export function subscriptionFixture(
  now: Date,
  overrides: Partial<SubscriptionRow> = {},
): SubscriptionRow {
  return {
    id: randomUUID(),
    accountId: randomUUID(),
    status: 'active',
    startsAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    ...overrides,
  };
}
\`\`\`

Put overrides last so the test can express the one temporal fact it cares about. Keep required invariants in the builder, not in dozens of test bodies. If an override can create an impossible record, either reject it in the builder or deliberately provide a lower-level "invalid row" helper for validation tests.

## Keep PostgreSQL comparisons on the same timeline

Database defaults are convenient in production and hazardous in time-travel tests. If the application clock says 2032 while \`DEFAULT now()\` records the actual CI date, the row is internally inconsistent. Pass explicit timestamps when setting up time-sensitive records. Also parameterize "now" in queries whose business result depends on it.

\`\`\`sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'cancelled')),
  starts_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE INDEX subscriptions_expiry_idx
  ON subscriptions (expires_at)
  WHERE status = 'active';
\`\`\`

\`timestamptz\` represents an instant. PostgreSQL normalizes it and displays it according to the session time zone. For test assertions, compare instants or request a stable UTC representation. Do not use a timestamp without time zone for an event that represents a global instant.

The repository method can accept an explicit observation time:

\`\`\`ts
import type { PoolClient } from 'pg';

export async function findExpiredSubscriptionIds(
  client: PoolClient,
  asOf: Date,
): Promise<string[]> {
  const result = await client.query<{ id: string }>(
    \`SELECT id
       FROM subscriptions
      WHERE status = 'active'
        AND expires_at <= $1
      ORDER BY id\`,
    [asOf],
  );
  return result.rows.map((row) => row.id);
}
\`\`\`

The query is now testable without changing the database server clock. It also documents the batch's cutoff, which helps production observability. A retention job can log \`asOf\`, retry with the same value, and select the same eligible set unless other data changes.

Database isolation still matters. A time fixture should run inside a transaction or a uniquely scoped schema/database so concurrent workers cannot see one another's rows. The [database transaction isolation guide](/blog/database-testing-transaction-isolation-levels) explains visibility and rollback choices that complement clock control. Clock determinism does not repair cross-test data leakage.

## Assemble a transactional Vitest fixture

The fixture below begins a transaction, pins the session time zone to UTC, exposes the test clock, and guarantees rollback. It assumes a normal \`pg\` \`Pool\` supplied by the test suite.

\`\`\`ts
import type { Pool, PoolClient } from 'pg';
import { TestClock } from './clock';

export type TemporalContext = {
  db: PoolClient;
  clock: TestClock;
  anchor: Date;
};

export async function withTemporalContext<T>(
  pool: Pool,
  anchorIso: string,
  run: (context: TemporalContext) => Promise<T>,
): Promise<T> {
  const db = await pool.connect();
  const anchor = new Date(anchorIso);
  const clock = new TestClock(anchor);

  try {
    await db.query('BEGIN');
    await db.query("SET LOCAL TIME ZONE 'UTC'");
    return await run({ db, clock, anchor });
  } finally {
    await db.query('ROLLBACK');
    db.release();
  }
}
\`\`\`

\`SET LOCAL\` limits the setting to the current transaction. The \`finally\` block protects cleanup when an assertion or setup query throws. Since this helper owns the transaction, code inside it must use the provided client, not the pool. A query sent through the pool could use another connection and escape both the setup data and rollback.

Here is a boundary test that inserts three records and proves selection immediately before, at, and after expiry:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { pool } from './test-pool';
import { findExpiredSubscriptionIds } from './subscription-repository';
import { withTemporalContext } from './temporal-context';

describe('subscription expiry selection', () => {
  it('includes an active subscription exactly at its expiry instant', async () => {
    await withTemporalContext(pool, '2032-04-15T10:00:00.000Z', async ({ db, anchor }) => {
      const expiredId = randomUUID();
      const boundaryId = randomUUID();
      const futureId = randomUUID();
      const accountId = randomUUID();

      for (const [id, expiresAt] of [
        [expiredId, new Date(anchor.getTime() - 1)],
        [boundaryId, anchor],
        [futureId, new Date(anchor.getTime() + 1)],
      ] as const) {
        await db.query(
          \`INSERT INTO subscriptions
             (id, account_id, status, starts_at, expires_at, created_at)
           VALUES ($1, $2, 'active', $3, $4, $3)\`,
          [id, accountId, new Date(anchor.getTime() - 1000), expiresAt],
        );
      }

      const ids = await findExpiredSubscriptionIds(db, anchor);
      expect(ids).toEqual([boundaryId, expiredId].sort());
    });
  });
});
\`\`\`

The one-millisecond offsets are deliberate boundary probes, not a claim that the system needs millisecond business precision. Use the precision your persistence layer preserves. If a database column rounds to seconds, test at second boundaries and document that contract.

## Travel through a workflow without rewriting history

Some behavior spans multiple instants: create a trial, send a warning, expire access, and delete retained data. Do not update old event timestamps each time the clock moves. Those events happened in the scenario's past. Advance observation time and invoke each operation with the current clock.

| Scenario step | Observation time | Persisted event | Expected result |
|---|---|---|---|
| Trial begins | Day 0 | \`starts_at = Day 0\` | Access allowed |
| Warning scan | Day 12 | \`expires_at = Day 14\` | Warning selected once |
| Exact expiry | Day 14 | Original expiry unchanged | Access denied |
| Retention sweep | Day 44 | Cancellation remains Day 14 | Eligible for deletion |

A service test can advance the injected clock while preserving the database timeline:

\`\`\`ts
import { expect, it } from 'vitest';
import { TestClock } from './clock';
import { canAccess } from './access-policy';

it('moves from active to expired at the declared boundary', () => {
  const clock = new TestClock('2032-04-01T10:00:00.000Z');
  const subscription = {
    status: 'active' as const,
    expiresAt: new Date('2032-04-15T10:00:00.000Z'),
  };

  expect(canAccess(subscription, clock)).toBe(true);

  clock.travelTo('2032-04-15T09:59:59.999Z');
  expect(canAccess(subscription, clock)).toBe(true);

  clock.travelTo('2032-04-15T10:00:00.000Z');
  expect(canAccess(subscription, clock)).toBe(false);
});
\`\`\`

For HTTP-level coverage, build the application with the test clock and call it through a request test client. The [Supertest Node API testing guide](/blog/supertest-node-api-testing-complete-guide) shows how to exercise an in-process Node server. The important architectural point is that the application factory accepts dependencies, so the route, service, and repository can share the same declared instant.

## Test elapsed time and calendar time separately

"After 30 days" and "next month at 09:00 local time" are different requirements. The first is usually an elapsed duration. The second is a calendar calculation in a named time zone. A time-travel suite should label which model each case uses.

| Requirement wording | Appropriate model | Test focus |
|---|---|---|
| Token expires after 15 minutes | Elapsed milliseconds | Exact duration boundary |
| Invoice on the first of each month | Calendar date in billing zone | Month length and year rollover |
| Run at 09:00 America/New_York | Zoned local time | DST gap and overlap |
| Retain for 90 days after deletion | Declared policy, usually elapsed or UTC days | Document chosen interpretation |

JavaScript \`Date\` alone represents instants and offers host-zone calendar operations. Avoid setters such as \`setMonth\` in a test whose result depends on a business zone, because the host configuration can alter the outcome. Use a well-maintained time-zone-aware library already selected by the application, and test against its documented behavior. Do not add a second date library only in tests, because mismatched algorithms can make the oracle disagree with production.

Include hard cases intentionally: February in leap and non-leap years, month-end billing, the skipped local hour when daylight saving begins, the repeated local hour when it ends, and year boundaries. Each belongs in a named scenario, not in a giant parameter matrix that reviewers cannot interpret.

## Coordinate fake timers with asynchronous work

Vitest can replace timers and the system date. This is useful for code that schedules callbacks or directly reads \`Date\`. Always restore real timers, ideally in \`afterEach\`, because fake timers affect the test process.

\`\`\`ts
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.useRealTimers();
});

it('fires a reminder after the configured delay', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2032-04-15T10:00:00.000Z'));
  const sent: string[] = [];

  setTimeout(() => sent.push('trial-reminder'), 5 * 60 * 1000);

  await vi.advanceTimersByTimeAsync(5 * 60 * 1000 - 1);
  expect(sent).toEqual([]);

  await vi.advanceTimersByTimeAsync(1);
  expect(sent).toEqual(['trial-reminder']);
});
\`\`\`

Do not freeze time and then wait for a real timeout. The fake clock will not advance by itself. Also distinguish a scheduled callback from a durable job: production may put a job into a queue with a due timestamp rather than keep an in-process timer. In that case, test the stored due timestamp and separately test the worker's due-job query with an explicit \`asOf\` value.

## Diagnose a fixture that passes locally and fails near midnight

Consider a retention test that creates \`deleted_at = '2032-06-01'\`, advances the JavaScript clock by 30 times 24 hours, and expects deletion. It passes on a developer laptop in UTC+05:30 but fails on a UTC CI runner. The SQL casts \`deleted_at\` to a local date, while the worker compares it with \`CURRENT_DATE\`. The application fake clock never affects PostgreSQL, and the meaning of the date literal changes across layers.

Diagnose it systematically:

1. Print the application instant as ISO, the database \`CURRENT_TIMESTAMP\`, \`CURRENT_DATE\`, and the database session time zone.
2. Inspect the column type. A \`date\`, \`timestamp\`, and \`timestamptz\` express different things.
3. Capture the exact SQL parameters. Confirm whether the cutoff is passed or computed by the server.
4. Run cases one millisecond before, exactly at, and one millisecond after the policy boundary.
5. Decide whether the requirement is elapsed duration, UTC calendar days, or local calendar days.

The robust fix is usually to pass the cutoff instant into SQL and store event instants as \`timestamptz\`. If the policy genuinely uses local dates, retain a date plus an explicit business-zone rule and test that rule directly. Merely setting the CI environment's \`TZ\` hides the disagreement rather than resolving it.

## What people get wrong about time travel fixtures

The most common misconception is that freezing \`Date.now()\` makes the whole system time travel. It changes only code that consults that clock in that process. Database functions, external sandboxes, separate workers, browser contexts, and already-created timestamps do not automatically follow it.

A second mistake is moving persisted history forward with the clock. If a user signed up on April 1, advancing to April 15 must not rewrite \`created_at\` to April 15. The fixture should preserve event history and change only observation time. Otherwise it cannot reveal bugs in age calculations, retry windows, or retention policies.

A third mistake is using broad snapshots for temporal outcomes. A snapshot showing an expired object may pass while the boundary rule is wrong. Prefer focused assertions that name the inclusive or exclusive cutoff. Add snapshots only when the formatted representation itself is the contract.

Finally, avoid one global mutable test clock shared across parallel tests. Give each application instance its own clock. If the framework forces a process-global timer, keep affected tests isolated and restore state unconditionally.

## Build a temporal scenario matrix that earns its cost

Time cases multiply quickly. Select them from real boundaries instead of combining every timestamp with every record state. Start with the domain rule and identify equivalence partitions.

| Rule | Essential cases | Unnecessary repetition |
|---|---|---|
| Access while \`now < expiresAt\` | Before, equal, after | Ten arbitrary dates far from expiry |
| Warning once in final 48 hours | Just outside, entering, duplicate run | Every hour in the window |
| Monthly renewal | Normal month, short month, year rollover | All twelve months if behavior is identical |
| Zoned daily schedule | Ordinary day, DST gap, DST overlap | Every day of the year |
| Retention after cancellation | Active, cancelled before cutoff, at cutoff, after cutoff | Unrelated profile variants |

Keep fixtures small. Insert only rows that make selection meaningful, including one negative control that should not be selected. Large production-like dumps obscure the time relationship and make failures expensive to investigate.

An AI coding agent can help enumerate boundary candidates, but give it the policy text, column types, clock ownership, and expected inclusivity. Ask it to produce a scenario table before code. Review generated timestamps carefully: agents often convert a calendar requirement into fixed milliseconds or mock the application clock while leaving SQL on server time. Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when you want reusable test-generation and review workflows.

## Make failures explain the timeline

Temporal tests should report the anchor, observation time, stored event time, database zone, and expected relationship. A bare "expected false to be true" wastes the fixture's clarity. Use small helpers that render ISO instants and policy language.

\`\`\`ts
export function temporalDiagnostic(input: {
  observedAt: Date;
  expiresAt: Date;
  expected: 'active' | 'expired';
}): string {
  const relation = input.observedAt.getTime() < input.expiresAt.getTime()
    ? 'before'
    : input.observedAt.getTime() === input.expiresAt.getTime()
      ? 'equal'
      : 'after';

  return [
    \`expected=\${input.expected}\`,
    \`observedAt=\${input.observedAt.toISOString()}\`,
    \`expiresAt=\${input.expiresAt.toISOString()}\`,
    \`relation=\${relation}\`,
  ].join(' ');
}
\`\`\`

When a CI test fails, include this string as the assertion message or log it before the assertion. Do not log only locale-formatted dates. ISO strings preserve the instant and are easy to compare. For database failures, add the column type and session zone to the diagnostic output.

The final quality gate is repeatability. Run the suite with at least two host time zones if the application performs local calendar logic. Run the same test repeatedly and in shuffled order. Run affected tests concurrently if concurrency is supported. A deterministic fixture should not care what minute the build starts, what test ran before it, or where the runner is located.

## Frequently Asked Questions

### Should every test use a fake clock?

No. Use a controlled clock when the behavior depends on the current instant, timers, expiry, scheduling, or calendar rules. Tests for pure transformations can pass explicit dates and need no fake time. Integration tests should usually inject an observation time into application services and SQL queries rather than mutate a global process clock. Keep a small number of smoke tests with the real clock when you need to verify production wiring, but assert broad invariants there so execution latency cannot create a boundary race.

### Can PostgreSQL time be frozen from a Node test?

Changing the Node clock does not change PostgreSQL's server clock. A more portable design passes an explicit cutoff parameter into time-dependent queries and supplies timestamps when inserting fixtures. Transaction-local settings can control the session time zone, but they do not redefine \`CURRENT_TIMESTAMP\`. If production SQL must use server time, isolate that thin behavior and test most selection logic through an explicit \`asOf\` value. This also makes retries and audit logs more deterministic.

### How should daylight-saving transitions be tested?

First confirm that the requirement uses a named local zone. Then create separate scenarios for an ordinary day, the spring gap, and the autumn overlap in that zone. Assert both the intended local wall time and the resulting UTC instant. Use the same maintained zone-aware library in production and tests, rather than calculating offsets manually. If the rule is actually elapsed time, keep it in instants and avoid introducing local calendar arithmetic at all.

### What is the safest cleanup strategy for temporal fixtures?

Give each test ownership of its database transaction, clock instance, and timer state. Roll back the transaction in a \`finally\` block, release the exact client that began it, and restore real timers in \`afterEach\`. Avoid shared mutable anchors and process-global clocks in concurrently executing tests. When rollback is impossible because a worker uses another connection, scope data with unique identifiers and delete only that scope after the worker completes. Cleanup should run even when setup or assertions throw.
`,
};
