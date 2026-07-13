import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Timezone-Sensitive Database Queries',
  description:
    'Test timezone-sensitive database queries at DST gaps, repeated hours, UTC boundaries, and session-zone changes with deterministic PostgreSQL cases.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Testing Timezone-Sensitive Database Queries

At 01:30 on a November morning in New York, the wall clock occurs twice. A query that groups orders by local hour can legitimately produce two distinct instants with the same displayed label. If the test data stores only \`2026-11-01 01:30:00\`, the suite has already lost the information needed to decide which instant was meant.

Timezone-sensitive database testing begins by separating an instant from a civil time. An instant is a point on the UTC timeline. A civil time is a calendar reading interpreted under a named zone and its historical rules. Database types, session settings, application drivers, and query expressions decide how one becomes the other.

## Start by naming the temporal contract

Before writing cases, state what each column represents. An event such as a payment authorization normally represents an instant and belongs in PostgreSQL \`timestamptz\`. A store opening time such as 09:00 every weekday is a local rule and may need a time plus an IANA zone. A birthday is a date, not midnight UTC.

PostgreSQL's \`timestamp with time zone\` stores an instant and displays it in the current session timezone. It does not retain the original textual offset or zone name. \`timestamp without time zone\` stores calendar fields without an offset. Those behaviors make type choice part of the test oracle.

| Domain value | Suitable representation | Key assertion |
|---|---|---|
| Payment created time | \`timestamptz\` | Same instant regardless of session timezone |
| Appointment at a branch | Instant plus named branch zone, and possibly original local input | Correct local rendering under branch rules |
| Customer birth date | \`date\` | Never shifts to adjacent date through UTC conversion |
| Daily quiet period | Local \`time\` plus named zone or business rule | DST transition policy is explicit |
| Imported offset text | Instant plus separate original offset when audit requires it | Round trip preserves required evidence |
| Reporting bucket | Derived local date/hour in specified reporting zone | Boundary membership uses named zone, not server default |

Avoid using abbreviations such as CST in test fixtures. They are ambiguous across regions and may resolve differently by configuration. Use IANA identifiers such as \`America/Chicago\`, \`Asia/Kolkata\`, or \`Europe/Berlin\`, and use explicit numeric offsets only when the contract truly means a fixed offset.

## Make the PostgreSQL session timezone visible

Tests often pass locally because developer machines and the database session share a convenient zone. CI runs in UTC, or a connection pool reuses a session whose timezone was changed by another test. Make the session setting deliberate.

The following integration test uses \`pg\` and PostgreSQL's \`SET TIME ZONE\`. It inserts one instant, changes only the session display zone, and proves epoch identity remains stable:

\`\`\`typescript
import { Client } from 'pg';
import { afterAll, beforeAll, expect, test } from 'vitest';

const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });

beforeAll(async () => {
  await client.connect();
  await client.query('CREATE TEMP TABLE audit_event (occurred_at timestamptz NOT NULL)');
});

afterAll(async () => {
  await client.end();
});

test('one timestamptz remains one instant across session zones', async () => {
  await client.query(
    "INSERT INTO audit_event VALUES (TIMESTAMPTZ '2026-03-08 06:30:00+00')",
  );

  await client.query("SET TIME ZONE 'America/New_York'");
  const newYork = await client.query(
    "SELECT to_char(occurred_at, 'YYYY-MM-DD HH24:MI OF') AS local, " +
      'extract(epoch FROM occurred_at)::bigint AS epoch FROM audit_event',
  );

  await client.query("SET TIME ZONE 'Asia/Kolkata'");
  const kolkata = await client.query(
    "SELECT to_char(occurred_at, 'YYYY-MM-DD HH24:MI OF') AS local, " +
      'extract(epoch FROM occurred_at)::bigint AS epoch FROM audit_event',
  );

  expect(newYork.rows[0].local).toBe('2026-03-08 01:30 -05');
  expect(kolkata.rows[0].local).toBe('2026-03-08 12:00 +05:30');
  expect(newYork.rows[0].epoch).toBe(kolkata.rows[0].epoch);
});
\`\`\`

This test asserts formatted database output rather than relying on JavaScript Date serialization, which drivers may normalize. For application tests, also verify driver mapping, but keep a SQL-level case so failures can be assigned to the correct layer.

Reset session changes before returning a pooled connection. \`SET LOCAL TIME ZONE\` inside a transaction limits the setting to that transaction and is often safer for isolated tests. If production sets timezone on connection checkout, test that bootstrap rather than assuming it happens.

## Spring-forward gaps need a declared input policy

When daylight saving time starts, some local wall times do not exist. In \`America/New_York\` on 2026-03-08, clocks move from 01:59:59 to 03:00:00. A user entering 02:30 has supplied a civil time without a corresponding instant under that zone's rules.

Possible product policies include rejection, shifting forward, choosing a library-defined normalization, or asking the user to choose another time. None should be accidental. Database engines and language libraries may normalize nonexistent times instead of throwing, and their exact behavior is not a substitute for product requirements.

Build a table-driven suite around the transition. Include the last valid instant before the jump, the first valid instant after it, an impossible local value inside the gap, and ordinary values on adjacent dates. Test both create and edit flows because rescheduling code often uses a different conversion path.

| New York local input | Temporal property | Expected policy example |
|---|---|---|
| 2026-03-08 01:59 | Exists with pre-transition offset | Accept and store the corresponding instant |
| 2026-03-08 02:00 | Nonexistent wall time | Reject with a field-level explanation |
| 2026-03-08 02:30 | Inside the missing interval | Do not silently claim the user chose 03:30 |
| 2026-03-08 03:00 | First post-jump wall time | Accept with post-transition offset |
| 2026-03-09 02:30 | Ordinary local time | Accept normally |

Do not freeze the application clock to 02:30 UTC and call it a gap test. The gap belongs to local civil conversion in a named zone. Construct the local input and zone exactly as the production boundary receives them.

## Fall-back folds require two distinguishable instants

When daylight saving time ends, an interval repeats. \`2026-11-01 01:30\` in New York can refer to one instant under daylight offset and another under standard offset. If booking or scheduling requires precision, the input contract must carry an offset, a fold choice, or another disambiguator.

A database query that filters by UTC range can include both correctly. A query that first strips timezone and compares naive local timestamps may merge them. The following SQL-oriented test inserts both instants and groups by local label plus UTC offset:

\`\`\`typescript
import { Client } from 'pg';
import { expect, test } from 'vitest';

test('keeps both occurrences of a repeated local half-hour', async () => {
  const db = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  try {
    await db.query('CREATE TEMP TABLE reading (captured_at timestamptz NOT NULL)');
    await db.query(
      "INSERT INTO reading VALUES " +
        "(TIMESTAMPTZ '2026-11-01 05:30:00+00'), " +
        "(TIMESTAMPTZ '2026-11-01 06:30:00+00')",
    );

    const result = await db.query(
      "SELECT to_char(captured_at AT TIME ZONE 'America/New_York', " +
        "'YYYY-MM-DD HH24:MI') AS wall_time, " +
        'extract(epoch FROM captured_at)::bigint AS epoch ' +
        'FROM reading ORDER BY captured_at',
    );

    expect(result.rows.map(row => row.wall_time)).toEqual([
      '2026-11-01 01:30',
      '2026-11-01 01:30',
    ]);
    expect(result.rows[1].epoch - result.rows[0].epoch).toBe(3_600);
  } finally {
    await db.end();
  }
});
\`\`\`

Both display values are intentionally equal, yet the epochs are one hour apart. Reporting tests must decide whether an hourly chart shows two 01:00 buckets, combines them, or labels offsets. A count alone may be correct while the visualization remains misleading.

## Test range queries using half-open UTC intervals

Daily reporting usually means a local calendar day in a business zone, not a fixed 24-hour duration. A DST-start day can be shorter and a DST-end day longer. Compute the local start and next local start under the named zone, convert both to instants, then query with \`created_at >= start AND created_at < next_start\`.

Half-open intervals avoid double counting at adjacent boundaries. \`BETWEEN\` is inclusive at both ends in SQL, so two consecutive daily queries can both include midnight. Subtracting one millisecond or microsecond from the next boundary bakes storage precision into business logic.

Test records immediately before, exactly at, and immediately after both boundaries. Include a record with subsecond precision if the column supports it. Assert adjacent day queries partition the dataset without gaps or overlaps.

The query should parameterize already computed instants or use a carefully reviewed SQL expression with an explicit zone. Never derive the reporting date through the database server's default timezone. A connection configuration change would silently move rows between buckets.

## Understanding AT TIME ZONE in both directions

PostgreSQL's \`AT TIME ZONE\` behaves differently based on the input type. Applied to \`timestamp without time zone\`, it interprets those calendar fields in the named zone and returns an instant. Applied to \`timestamp with time zone\`, it renders that instant as a timestamp without timezone in the named zone.

That dual behavior is powerful and easy to reverse mentally.

| Input expression | Result concept | Example use |
|---|---|---|
| naive timestamp \`AT TIME ZONE zone\` | Interpret local fields, produce an instant | Convert branch-local input after validation |
| instant \`AT TIME ZONE zone\` | Render local calendar fields | Group an instant by branch-local date |
| \`SET TIME ZONE zone\` | Change session rendering and implicit conversions | Reproduce application connection behavior |
| \`extract(epoch FROM instant)\` | Timeline value suitable for identity comparison | Prove display-zone changes do not change instant |

Write type assertions into migration reviews and integration tests. A cast inserted to satisfy SQL can change which direction occurs. Test the expression with a transition value, not only noon in January.

For broader schema, migration, and repository coverage, see the [database testing automation guide](/blog/database-testing-automation-guide). Time tests should run against the same engine family and timezone data strategy as production because embedded substitutes often differ at the edge cases that matter.

## Clock control and database time are separate clocks

Freezing \`Date.now()\` in the application does not freeze PostgreSQL \`CURRENT_TIMESTAMP\`. Database transaction time, statement time, and wall-clock functions may also have different semantics. Decide which layer supplies timestamps and provide a controllable boundary.

If the application writes an explicit timestamp, inject a clock and assert the stored instant. If a database default supplies it, use range assertions around the operation or make the database clock controllable in an isolated design. Avoid asserting an exact current value obtained from two unsynchronized machines.

Transaction semantics matter. PostgreSQL \`CURRENT_TIMESTAMP\` is based on the current transaction start time. A long transaction can insert several rows with the same value even as wall time advances. That can be desirable for consistency. A test expecting each statement to advance is testing the wrong contract.

## Timezone database updates can change historical or future results

IANA timezone rules are data maintained outside application code. Governments change offsets and transition dates, sometimes with limited notice. Container images, operating systems, JVMs, databases, and JavaScript runtimes may carry different tzdata versions.

Pinning an old version forever is not a solution. Instead, record versions in diagnostic output, update intentionally, and run a focused regression suite for zones important to the business. Expected future offsets may legitimately change after a tzdata upgrade. Review those diffs against authoritative rule updates rather than automatically rewriting snapshots.

Named zones are still preferable to hardcoded offsets for civil schedules. \`America/Sao_Paulo\` expresses a region whose rules can change; \`-03:00\` expresses only a fixed offset. Use the one that matches the domain.

## Generate data around transitions, not across random years

Random timestamp generation rarely lands on a DST transition, midnight boundary, leap day, or precision edge. Curate a compact temporal matrix per supported business zone. Include a non-DST zone such as Asia/Kolkata so code is not accidentally specialized to offset changes, and include zones with non-hour offsets if the product supports them.

Keep fixtures readable by storing the intended instant, local representation, zone, and rationale together. A builder can calculate expected fields, but avoid using the same conversion function as production to create the oracle. That would reproduce the same bug on both sides.

The [test data management strategies](/blog/test-data-management-strategies) article covers ownership and isolation. For temporal fixtures specifically, immutable instants and explicit zones make failures far easier to interpret than a global frozen date hidden in suite setup.

## Driver serialization and API round trips

Database correctness can be undone at the driver boundary. JavaScript Date represents an instant but renders differently depending on method and environment. JSON serialization normally uses UTC ISO text. Libraries offering zoned date-time types may preserve more context. Assert the exact API contract rather than relying on console output.

Round-trip a record through write, database read, API serialization, and client parsing. Verify instant equality and required local presentation separately. If the API accepts an offset, decide whether it also requires a zone. An offset alone cannot describe future recurrence rules.

Set the test process \`TZ\` explicitly in separate test runs when application code uses host-local date functions. Changing it midway through one Node process can interact poorly with cached module state and library behavior. A CI matrix running UTC plus one business zone often reveals accidental default-zone dependencies without multiplying every test.

## A review checklist for temporal SQL

When a query changes, inspect column types, implicit casts, session settings, named zones, range inclusivity, and precision. Ask whether a calendar day means customer, branch, tenant, or system zone. Then select boundary fixtures that prove the answer.

Avoid snapshotting large formatted reports as the only oracle. Add focused assertions for membership at boundaries and repeated labels. A snapshot may show plausible dates while omitting a duplicated hour or shifting one record to yesterday.

Production observability should include timestamps in UTC with explicit offsets and carry business zone identifiers in structured fields when relevant. Test logs likewise need enough context to reproduce the failure. A naked \`03/08 02:30\` is not actionable.

## Recurring schedules must be expanded under zone rules

A weekly meeting at 09:00 Europe/Berlin is not a sequence of instants separated by exactly 168 hours across every transition. Store the civil recurrence rule and zone, then calculate each occurrence with the timezone rules applicable to that date. Test occurrences before and after both DST transitions and assert the local hour remains 09:00 while the UTC hour may change.

Decide what happens when a recurrence targets a missing wall time or a repeated one. The policy might skip, shift, or ask for disambiguation. Generate at least three consecutive occurrences around the boundary so a test catches code that adds a fixed duration to the prior instant. Editing “this occurrence” versus “the whole series” also needs separate persistence cases because one stores an exception and the other changes the rule.

## Frequently Asked Questions

### Should every PostgreSQL timestamp column use \`timestamptz\`?

No. Use it for instants. Dates, recurring local times, and calendar fields have different semantics. The mistake is choosing a type by habit without documenting whether the value lies on the UTC timeline or represents local civil information.

### Why does PostgreSQL display a different hour after I change the session timezone?

A \`timestamptz\` value is rendered in the session zone. The underlying instant remains the same. Compare epoch values or explicit UTC output to test identity, and separately assert the local display required by the product.

### How do I test a nonexistent DST time without depending on library normalization?

Define the product policy first, then submit the local fields and named zone through the production validation boundary. Assert rejection or the documented normalization. Do not calculate the expected result with the same helper used by the code under test.

### Is UTC enough for grouping customer activity by day?

Only if the product defines day in UTC. Customer, store, or regulatory days often use another zone. Compute half-open instant boundaries for that named zone and test records on both edges, including transition days.

### Should timezone tests use the real database?

At least a focused layer should. SQL types, casts, session settings, and timezone data are engine-specific. Unit tests can cover domain policy quickly, but an embedded substitute cannot certify PostgreSQL temporal expressions.
`,
};
