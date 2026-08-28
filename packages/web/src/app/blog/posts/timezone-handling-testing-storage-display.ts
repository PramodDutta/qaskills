import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Timezone Handling: Storage, Display, and DST Boundaries',
  description: 'timezone testing proves UTC storage, local display, DST edges, and user preference rules so date bugs fail in CI instead of reaching customers worldwide.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing Timezone Handling: Storage, Display, and DST Boundaries

Timezone testing proves that your system stores instants consistently, displays them in the user's intended zone, and handles daylight saving time gaps and overlaps without moving events. A strong suite tests three separate ideas: storage as an absolute instant, display as a localized view, and scheduling as a rule that may depend on a named time zone.

Most timezone bugs come from mixing those ideas. "2026-03-08 02:30" is not always a real local time. "Midnight" is not an instant until you attach a zone and date. A timestamp from the database may be correct while the UI is wrong. QA has to test the boundaries where those meanings split.

## Separate Instants, Local Times, And Dates

Start by naming what each field means. A payment captured at a moment in time is an instant. A meeting scheduled for 9:00 AM in New York is a local time plus a zone rule. A birthday is usually a calendar date without a time. Treating all three as one "date" type guarantees confusion.

| Value type | Example | Storage shape | Test focus |
|---|---|---|---|
| Instant | Payment captured at 2026-08-27T14:05:00Z | UTC timestamp or ISO instant | Same moment round-trips everywhere |
| Zoned scheduled time | Webinar at 09:00 America/New_York | Local date, local time, IANA zone | DST rules and future offset changes |
| Date-only | Renewal date 2026-09-01 | Date column or YYYY-MM-DD string | No timezone conversion during display |
| Duration | Trial lasts 14 days | Integer duration or interval | Adds calendar days or elapsed hours as intended |

The test data should make those meanings visible. If every fixture uses noon UTC, the suite avoids the hard parts. Use midnight, DST transitions, month end, year end, and users west and east of UTC.

## Storage Tests: Prove The Database Keeps The Instant

For event timestamps, store a single absolute instant. In PostgreSQL, \`timestamptz\` stores an instant and displays it according to the session time zone. The name is often misunderstood. It does not store the original zone name.

\`\`\`sql
CREATE TABLE audit_events (
  id bigserial PRIMARY KEY,
  actor_id text NOT NULL,
  action text NOT NULL,
  occurred_at timestamptz NOT NULL
);

INSERT INTO audit_events (actor_id, action, occurred_at)
VALUES ('user_1', 'downloaded_report', '2026-08-27T14:05:00Z');
\`\`\`

A storage test should read the same row under different session zones and assert the instant is unchanged when serialized as UTC.

\`\`\`sql
BEGIN;

SET TIME ZONE 'UTC';
SELECT occurred_at AT TIME ZONE 'UTC' AS utc_value
FROM audit_events
WHERE actor_id = 'user_1';

SET TIME ZONE 'America/Los_Angeles';
SELECT occurred_at AT TIME ZONE 'UTC' AS utc_value
FROM audit_events
WHERE actor_id = 'user_1';

ROLLBACK;
\`\`\`

Both reads should represent 2026-08-27 14:05:00 in UTC. The local display may differ. The instant must not.

If the application stores ISO strings, test that the value includes an offset or the trailing Z. A string like \`2026-08-27T14:05:00\` is ambiguous because it has no zone information.

\`\`\`ts
import assert from "node:assert/strict";

type EventRecord = {
  occurredAt: string;
};

function assertUtcIsoInstant(record: EventRecord) {
  assert.match(record.occurredAt, /Z$/);
  const parsed = new Date(record.occurredAt);
  assert.equal(Number.isNaN(parsed.getTime()), false);
  assert.equal(parsed.toISOString(), record.occurredAt);
}

assertUtcIsoInstant({ occurredAt: "2026-08-27T14:05:00.000Z" });
\`\`\`

Avoid testing storage by comparing localized strings. Localized strings are output. Storage tests should use machine-readable instants.

When stored time fields are produced by database logic, include the hidden writer in the same risk model. A trigger that stamps \`occurred_at\`, calculates \`expires_at\`, or writes a history row can choose the database session zone without the application noticing. Connect that coverage to [database trigger testing](/blog/database-trigger-testing-side-effects) so the side effect and the timestamp rule are verified together, not inferred from the final API response.

## API Serialization Tests Should Reject Ambiguity

An API should not make clients guess whether a timestamp is UTC, local, or date-only. Serialization tests are cheap and catch expensive production confusion. For event instants, require an ISO value with a zone designator. For date-only fields, require a date-only string. For scheduled local events, require the local date, local time, and IANA zone as separate values or an equivalent structured contract.

\`\`\`ts
import assert from "node:assert/strict";

type ReportResponse = {
  generatedAt: string;
  renewsOn: string;
  digestSchedule: {
    localDate: string;
    localTime: string;
    timeZone: string;
  };
};

const response: ReportResponse = {
  generatedAt: "2026-08-27T14:05:00.000Z",
  renewsOn: "2026-09-01",
  digestSchedule: {
    localDate: "2026-09-02",
    localTime: "09:00",
    timeZone: "Asia/Kolkata",
  },
};

assert.match(response.generatedAt, /Z$/);
assert.match(response.renewsOn, /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
assert.equal(response.digestSchedule.timeZone, "Asia/Kolkata");
\`\`\`

That test is intentionally strict about shape. If a future API change returns \`2026-09-01T00:00:00.000Z\` for \`renewsOn\`, the test fails before customers in negative-offset zones see the previous date. If a scheduled digest returns only \`09:00\`, the test fails because the zone rule disappeared.

| API field | Accept | Reject |
|---|---|---|
| generatedAt | 2026-08-27T14:05:00.000Z | 2026-08-27T14:05:00 |
| renewsOn | 2026-09-01 | 2026-09-01T00:00:00.000Z |
| timeZone | America/New_York | EST |
| localTime | 09:00 | 9 AM |

Zone abbreviations are not a storage contract. EST, CST, and IST can mean different things depending on country and context. IANA names such as America/New_York and Asia/Kolkata are what scheduling code needs.

## Agent Workflow For Timezone Bugs

AI coding agents are useful on timezone issues when you give them fixed evidence. They are poor when you ask them to "fix dates" without telling them which value type is wrong. Give the agent a failing fixture, the user's zone, the stored value, the rendered value, and the expected rule.

\`\`\`text
Investigate this timezone bug and add a regression test before changing code.

Symptom:
- User timezone: America/Los_Angeles
- API value: { "renewsOn": "2026-09-01" }
- Dashboard displays: Aug 31, 2026
- Expected display: Sep 1, 2026

Rules:
- renewsOn is a date-only value, not an instant.
- Do not convert it through Date parsing unless the project already has a safe date-only helper.
- Add one unit test for the formatter and one browser test for the dashboard if the existing suite has browser coverage.

Verification:
- Run the focused formatter test command.
- Run the focused dashboard test with the browser timezone pinned to America/Los_Angeles.
\`\`\`

This prompt forces diagnosis before code changes. It also stops the common but wrong fix of adding or subtracting hours until one screenshot looks correct.

## Display Tests: Pin The User Zone

Display tests should set the user's time zone explicitly. Do not rely on the CI host. A test that passes in Asia/Kolkata and fails in America/New_York is not a useful signal.

For browser tests, create the context with a known time zone. Playwright supports a \`timezoneId\` option on browser contexts.

\`\`\`ts
import { test, expect } from "@playwright/test";

test.use({ timezoneId: "America/New_York" });

test("shows report timestamp in the viewer timezone", async ({ page }) => {
  await page.route("**/api/reports/weekly", async (route) => {
    await route.fulfill({
      json: {
        id: "report_1",
        generatedAt: "2026-08-27T14:05:00.000Z",
      },
    });
  });

  await page.goto("/reports/weekly");
  await expect(page.getByText("Aug 27, 2026, 10:05 AM")).toBeVisible();
});
\`\`\`

That test asserts a formatted string because the UI contract is a formatted string. The API test for the same feature should assert the raw UTC instant. Do not merge those checks into one vague "date looks right" test.

| Layer | Zone setup | Assertion |
|---|---|---|
| Unit formatter | Pass locale and timeZone into formatter | Exact display string or parts |
| API | No local display zone needed | ISO instant includes Z |
| Browser | Set browser context timezoneId | Visible localized value |
| Database | SET TIME ZONE for read session | UTC value round-trips |

A unit formatter test is faster than a browser test and easier to diagnose.

\`\`\`ts
import assert from "node:assert/strict";

function formatAuditTime(isoInstant: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(isoInstant));
}

assert.equal(
  formatAuditTime("2026-08-27T14:05:00.000Z", "America/New_York"),
  "Aug 27, 2026, 10:05 AM",
);

assert.equal(
  formatAuditTime("2026-08-27T14:05:00.000Z", "Asia/Kolkata"),
  "Aug 27, 2026, 7:35 PM",
);
\`\`\`

The exact punctuation of \`Intl.DateTimeFormat\` can vary by runtime locale data. In a production test suite, either pin the runtime and locale or assert formatted parts instead of one full string.

## DST Gap Tests: Local Times That Do Not Exist

A DST spring-forward gap creates local times that never occur. In many North American zones, clocks jump from 01:59 to 03:00 on the transition date. If a scheduler accepts 02:30 for that date, the product must define what happens.

| Policy | Example behavior | Test assertion |
|---|---|---|
| Reject nonexistent time | User sees validation error | No event is stored |
| Shift forward | 02:30 becomes 03:00 local | Stored instant matches shifted time |
| Preserve wall intent | Next valid occurrence based on zone rules | Next run uses documented local rule |

Do not let the date library choose the policy silently. The test should encode the product decision.

\`\`\`ts
import assert from "node:assert/strict";

type ScheduleInput = {
  localDate: string;
  localTime: string;
  timeZone: string;
};

function validateNewYorkSpringForward(input: ScheduleInput) {
  if (
    input.timeZone === "America/New_York" &&
    input.localDate === "2026-03-08" &&
    input.localTime >= "02:00" &&
    input.localTime < "03:00"
  ) {
    return { ok: false, error: "LOCAL_TIME_DOES_NOT_EXIST" };
  }

  return { ok: true };
}

assert.deepEqual(
  validateNewYorkSpringForward({
    localDate: "2026-03-08",
    localTime: "02:30",
    timeZone: "America/New_York",
  }),
  { ok: false, error: "LOCAL_TIME_DOES_NOT_EXIST" },
);
\`\`\`

That example is not a complete timezone engine. It is a minimal executable specification for one business rule. Real application code should use the platform or date library already chosen by the project, backed by IANA time zone data.

## DST Overlap Tests: Local Times That Happen Twice

The fall-back transition creates the opposite problem: the same local clock time happens twice with different offsets. "2026-11-01 01:30 America/New_York" can refer to two different instants.

Your product needs a policy. For logs, never store only the local time. For schedules, ask whether the first occurrence, second occurrence, or a user-selected offset should be used.

\`\`\`text
Ambiguous local time policy:
- Field: daily_digest_time
- Zone: account.time_zone
- Fall-back overlap: choose the first valid occurrence unless the user edits after the transition warning.
- Audit display: show zone abbreviation and offset during overlap days.
\`\`\`

A UI test can assert that ambiguity is exposed instead of hidden.

\`\`\`ts
import { test, expect } from "@playwright/test";

test.use({ timezoneId: "America/New_York" });

test("warns when scheduling inside the fall DST overlap", async ({ page }) => {
  await page.goto("/settings/digest");
  await page.getByLabel("Date").fill("2026-11-01");
  await page.getByLabel("Time").fill("01:30");
  await page.getByLabel("Time zone").selectOption("America/New_York");

  await expect(page.getByText("This time occurs twice")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
});
\`\`\`

This test does not require knowing the final instant. It tests the user contract: ambiguous input requires a decision.

## Date-Only Fields Need Their Own Tests

Date-only bugs are common because developers parse a date string into a Date object, then the runtime attaches a timezone and shifts the visible day. A renewal date of 2026-09-01 should not become 2026-08-31 for a user west of UTC.

\`\`\`ts
import assert from "node:assert/strict";

function formatDateOnly(yyyyMmDd: string) {
  const [year, month, day] = yyyyMmDd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

assert.equal(formatDateOnly("2026-09-01"), "Sep 1, 2026");
\`\`\`

The implementation uses UTC only as a stable rendering technique. The business value is still a date-only value. Tests should describe it that way.

| Field | Bad test fixture | Better fixture |
|---|---|---|
| Subscription renews_on | 2026-09-15 | 2026-09-01, viewed in Pacific and Kolkata |
| Birth date | 1990-06-15T00:00:00Z | 1990-06-15 as a date-only value |
| Trial expires_at | Local date string | UTC instant plus account zone display |
| Business day cutoff | Current machine date | Fixed zone and fixed clock |

Date-only tests should run in at least two time zones. You can do that with browser context settings, process environment where your runtime supports it, or formatter injection.

## Batch And API Ordering Around Time

Time bugs get worse in batch APIs because multiple events can share the same second or millisecond. If your API accepts an array of operations, do not sort by client timestamp unless the contract says so. Test the order rule directly.

\`\`\`json
{
  "operations": [
    {
      "clientId": "op_1",
      "type": "create",
      "occurredAt": "2026-08-27T14:05:00.000Z"
    },
    {
      "clientId": "op_2",
      "type": "cancel",
      "occurredAt": "2026-08-27T14:05:00.000Z"
    }
  ]
}
\`\`\`

If the service promises array order, assert that order. If it promises server receive order, assert the server sequence. If it promises idempotency by client id, assert replay behavior. For batch-specific ordering patterns, connect this with [API batch request ordering](/blog/api-testing-batch-request-ordering).

## A Failure Story: The Database Was Right, The Dashboard Was Not

The symptom was a dashboard that showed trial expiration one day early for customers in California. The first theory was that the database stored expiration dates in the wrong zone. QA pulled rows and found clean UTC instants. The backend returned correct ISO strings with Z. The API was not the cause.

The actual cause was the frontend treating a date-only field as a JavaScript Date at local midnight UTC. For users west of UTC, that instant displayed as the previous local date. The test suite had missed it because every browser test ran in the developer's local zone and every fixture used mid-month dates.

The fix was to keep renewal_date as a date-only string through the API and render it with a date-only formatter. QA added browser tests in America/Los_Angeles and Asia/Kolkata, plus a unit test for the formatter. The dashboard stopped shifting dates because the code stopped pretending a calendar date was an instant.

That failure is why timezone testing should name value types first. Once the type is wrong, every downstream test becomes a negotiation with accidental conversions.

## Build A Timezone Matrix That Is Small But Mean

You do not need every time zone. You need zones that expose different offset and DST behavior.

| Zone | Why it belongs in tests | Example case |
|---|---|---|
| UTC | Baseline with no offset surprises | API serialization |
| America/New_York | DST gap and overlap | Scheduled local time |
| America/Los_Angeles | Negative offset can shift date backward | Date-only display |
| Asia/Kolkata | Half-hour offset and no DST | Formatting and date math |
| Europe/Berlin | Different DST transition dates from US | Global scheduling |

Keep the full matrix for formatter and scheduler unit tests. Use a smaller set for browser tests because they are slower. The point is to cover behaviors, not collect geography.

\`\`\`ts
import assert from "node:assert/strict";

const zones = ["UTC", "America/New_York", "America/Los_Angeles", "Asia/Kolkata"];

function hourInZone(isoInstant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone,
  }).formatToParts(new Date(isoInstant));

  const hour = parts.find((part) => part.type === "hour");
  if (!hour) {
    throw new Error("Hour part missing");
  }
  return hour.value;
}

const actual = zones.map((zone) => [zone, hourInZone("2026-08-27T14:05:00.000Z", zone)]);

assert.deepEqual(actual, [
  ["UTC", "14"],
  ["America/New_York", "10"],
  ["America/Los_Angeles", "07"],
  ["Asia/Kolkata", "19"],
]);
\`\`\`

Using \`formatToParts\` makes the assertion less sensitive to punctuation and word order.

## Test Triggered And Derived Time Fields

Database triggers often stamp timestamps, update history rows, or derive business dates. Timezone defects can hide there because application tests only see the final response. When a trigger sets \`updated_at\`, \`expires_at\`, or history rows, assert the generated value directly and under a fixed database session zone.

\`\`\`sql
BEGIN;

SET TIME ZONE 'UTC';

INSERT INTO audit_events (actor_id, action, occurred_at)
VALUES ('user_2', 'accepted_terms', now());

SELECT occurred_at <= now() AS not_in_future
FROM audit_events
WHERE actor_id = 'user_2';

ROLLBACK;
\`\`\`

If trigger side effects are part of the risk, pair timezone checks with database trigger tests. The same hidden write that creates an audit row may also choose the timestamp source, and that choice needs evidence.

## What Practitioners Get Wrong

The common mistake is testing only the current date. Current-date tests are convenient and weak. They pass for months, then fail around DST, month end, or a CI host change. Freeze the clock. Choose dates that hurt.

Another mistake is storing the user's numeric offset instead of the IANA time zone. An offset like -05:00 is not enough to schedule a future 9:00 AM meeting in New York because the offset changes. Store the zone name for future local schedules. Store the instant for completed events. Test both.

Finally, do not hide timezone behavior behind snapshots. A snapshot that changes from "Sep 1" to "Aug 31" tells you something changed, but not which time rule was violated. Prefer named assertions with fixed instants and fixed zones.

## Logging That Makes Time Bugs Diagnosable

Timezone test failures are easier to fix when logs include both the instant and the interpretation rule. Logging only the rendered string is weak evidence. Logging only the UTC value can also be weak when the bug is in the local conversion. For scheduled work, log the local date, local time, time zone, resolved instant, and policy used for DST ambiguity.

\`\`\`json
{
  "job": "daily_digest",
  "accountId": "acct_123",
  "localDate": "2026-11-01",
  "localTime": "01:30",
  "timeZone": "America/New_York",
  "dstPolicy": "reject_ambiguous",
  "result": "validation_error",
  "errorCode": "LOCAL_TIME_AMBIGUOUS"
}
\`\`\`

Add one test that asserts the diagnostic shape for a rejected DST boundary if the system emits structured logs or audit events. The goal is not to test the logger. The goal is to make sure the next production incident contains enough evidence to distinguish bad storage, bad conversion, and a missing product policy.

Logs should not become the primary correctness check. The primary check is still the stored value, API response, or visible UI state. Logging is the support system that makes failed timezone testing useful to the person on call.

## Frequently Asked Questions

### What should timezone testing cover first?

Start with the value type. Decide whether the field is an instant, a local scheduled time, or a date-only value. Then test storage, API serialization, and display separately. For instants, assert UTC round-trip behavior. For local schedules, test the named IANA zone and DST boundary policy. For date-only values, prove the day does not shift when viewed in zones west and east of UTC.

### Should all timestamps be stored in UTC?

Completed events should usually be stored as UTC instants or an equivalent database timestamp type that represents an instant. Future local schedules also need the user's intended IANA time zone because UTC alone may not preserve the wall-clock rule after DST changes. Date-only values should not be forced into timestamp semantics. Tests should reflect those differences instead of applying one rule to every field named date or time.

### How do I test daylight saving time without flaky tests?

Use fixed dates, fixed zones, and a fixed clock. Pick known DST gap and overlap dates for the zone under test, then assert the product policy: reject, shift, ask the user, or choose a documented occurrence. Do not rely on the machine's local timezone. For browser tests, set the browser context timezone. For unit tests, pass the time zone into the formatter or scheduler function.

### Why does a date show one day earlier in some countries?

That usually happens when a date-only value is parsed as a midnight UTC instant and then displayed in a negative-offset timezone. For example, 2026-09-01 at 00:00 UTC is still August 31 in parts of the Americas. The fix is to keep date-only values as dates, not instants, and render them with date-only logic. Add tests in at least one zone west of UTC and one east of UTC.
`,
};
