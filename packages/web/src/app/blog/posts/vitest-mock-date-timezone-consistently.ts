import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mock Date and Timezone Consistently in Vitest',
  description:
    'Mock Date and timezone consistently in Vitest with fixed instants, fake-timer cleanup, UTC process configuration, and explicit DST boundary tests.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Mock Date and Timezone Consistently in Vitest

At \`2026-03-29T00:30:00Z\`, London and Kolkata do not agree on the calendar date in every scenario, and London is about to change its offset. A test that constructs local midnight or formats a date without naming a timezone can therefore pass on a laptop and fail on a UTC CI runner even when both machines observe the same instant.

Vitest can freeze the clock with \`vi.setSystemTime\`, but a frozen clock and a fixed timezone are different controls. The clock decides what time it is. The process timezone decides how local getters and default formatting interpret that instant. Stable date tests control both where relevant, and deliberately vary them when timezone behavior is the subject.

## Separate instant, zone, and calendar representation

JavaScript's \`Date\` stores an instant as milliseconds from the Unix epoch. It does not store an IANA timezone such as \`America/New_York\`. Methods such as \`toISOString()\` render UTC, while \`getFullYear()\`, \`getHours()\`, and the default behavior of \`toLocaleString()\` can use the host process's local timezone.

Three values that look similar in a test have different semantics:

| Test value | Meaning | Portability concern |
|---|---|---|
| \`new Date('2026-01-15T12:00:00Z')\` | An explicit UTC instant | Stable instant across environments |
| \`new Date('2026-01-15T12:00:00+05:30')\` | An instant with an explicit source offset | Normalizes to the same epoch everywhere |
| \`new Date(2026, 0, 15, 12)\` | Noon in the process-local zone | Epoch differs with \`TZ\` |
| \`'2026-01-15'\` | Date-only text parsed as UTC by the standard Date parser | Later local rendering may show a prior day |
| \`Intl.DateTimeFormat(..., { timeZone })\` | Rendering in a named zone | Stable if locale and zone are explicit |

If the domain value is an instant, make the offset explicit in test data. If it is a civil date such as a birthday or settlement day, do not force it through \`Date\` unless the production model defines how that date maps to an instant.

## Freeze \`Date.now()\` and \`new Date()\` with Vitest

Vitest's fake timers replace date-related APIs when enabled. Call \`vi.useFakeTimers()\`, set an unambiguous instant, and restore real timers after each test so neighboring files do not inherit a frozen clock.

\`\`\`ts
import { afterEach, describe, expect, it, vi } from 'vitest';

function createSession(ttlMinutes: number) {
  const createdAt = new Date();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  return {
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

describe('createSession', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes expiry from the current instant', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-13T08:15:00Z'));

    expect(createSession(30)).toEqual({
      createdAt: '2026-07-13T08:15:00.000Z',
      expiresAt: '2026-07-13T08:45:00.000Z',
    });
  });
});
\`\`\`

The input string contains \`Z\`, so it denotes UTC. The production result uses \`toISOString()\`, which also denotes UTC. The assertion is independent of the process-local zone.

\`vi.setSystemTime\` does not itself fire scheduled timers. It changes the perceived system time. If the behavior depends on callbacks scheduled with \`setTimeout\`, advance fake timers separately.

## A frozen clock does not freeze the timezone

This code remains environment-dependent even after setting system time:

\`\`\`ts
function localReportDate() {
  const now = new Date();
  return \`
    \${now.getFullYear()}-
    \${String(now.getMonth() + 1).padStart(2, '0')}-
    \${String(now.getDate()).padStart(2, '0')}
  \`.replace(/\\s/g, '');
}
\`\`\`

The local getters consult the host timezone. Freeze \`2026-07-13T23:30:00Z\`, and machines east of UTC may report July 14 while machines west of UTC may still report July 13.

Choose one of two honest contracts:

- The application operates in one process timezone. Set that zone before Node starts the test process and assert local behavior in it.
- The function must render a named business timezone. Pass \`timeZone\` to \`Intl.DateTimeFormat\` or the date library in production code, and test that explicit zone.

Do not solve a named business-zone requirement by assuming every production process will always run in that zone. Deployment images, serverless runtimes, and developers may use different defaults.

## Set a deterministic process timezone before Vitest starts

Node recognizes the \`TZ\` environment variable for basic IANA timezone IDs. Set it in the command that launches Vitest so configuration, setup files, imported modules, and tests see the same zone from process startup.

On POSIX shells:

\`\`\`json
{
  "scripts": {
    "test": "TZ=Etc/UTC vitest run",
    "test:watch": "TZ=Etc/UTC vitest"
  }
}
\`\`\`

For a script that must also run in Windows shells, use a cross-platform environment-variable utility supported by the project, or set \`TZ\` in the CI job environment. Do not rely on POSIX assignment syntax where it is not available.

\`Etc/UTC\` is useful for general suite determinism, but it is not automatically the correct product timezone. A billing service defined around \`America/New_York\` should name and test that zone. UTC merely makes unintentional local-time dependencies easier to spot.

Changing \`process.env.TZ\` inside an individual test is a poor default. Node supports runtime changes on current platforms, but modules may have captured values, formatters may already exist, and concurrent tests share process state. Launch separate processes when one test matrix must exercise different process-local zones.

## Make named-zone rendering explicit in production code

\`Intl.DateTimeFormat\` accepts a \`timeZone\` option. That lets a test verify user-facing output without mutating global process state.

\`\`\`ts
import { describe, expect, it } from 'vitest';

export function formatSupportTimestamp(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}

describe('formatSupportTimestamp', () => {
  const instant = new Date('2026-07-13T20:45:00Z');

  it('renders the support desk zone', () => {
    expect(formatSupportTimestamp(instant, 'Asia/Kolkata')).toBe('14/07/2026, 02:15');
  });

  it('renders UTC without changing the process timezone', () => {
    expect(formatSupportTimestamp(instant, 'Etc/UTC')).toBe('13/07/2026, 20:45');
  });
});
\`\`\`

Both assertions refer to the same instant. The difference is intentional zone rendering. Naming \`en-GB\` avoids locale differences in field order and separators. Naming \`hourCycle\` avoids an AM/PM variation.

Be conservative with exact assertions on localized prose. ICU and locale data can evolve. If the contract is only the calendar day in a business zone, \`formatToParts()\` can extract the relevant fields without freezing incidental punctuation. If the exact string is user-visible and approved, an exact assertion is reasonable, but align Node and ICU versions across environments.

## Advance time and scheduled work as separate actions

Authentication expiry, debounce, polling, and retry code usually combines wall-clock reads with scheduled callbacks. Fake timers control both, but the test should show which event it advances.

\`\`\`ts
import { afterEach, expect, it, vi } from 'vitest';

function scheduleExpiry(expiresAt: Date, onExpire: () => void) {
  const delay = Math.max(0, expiresAt.getTime() - Date.now());
  return setTimeout(onExpire, delay);
}

afterEach(() => {
  vi.useRealTimers();
});

it('fires the expiry callback at the remaining duration', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-13T10:00:00Z'));
  const onExpire = vi.fn();

  scheduleExpiry(new Date('2026-07-13T10:05:00Z'), onExpire);

  await vi.advanceTimersByTimeAsync(299_999);
  expect(onExpire).not.toHaveBeenCalled();

  await vi.advanceTimersByTimeAsync(1);
  expect(onExpire).toHaveBeenCalledOnce();
});
\`\`\`

The asynchronous advancement variant permits promise callbacks scheduled by timer callbacks to progress. For entirely synchronous callbacks, the synchronous timer API may be sufficient. Use the narrowest operation that matches the implementation.

Calling \`vi.setSystemTime\` from 10:00 directly to 10:05 changes \`Date.now()\`, but it does not automatically execute the timeout. That distinction prevents a class of false assumptions in expiry tests.

For timer API details and microtask interactions, the [Vitest fake timers and date testing guide](/blog/vitest-fake-timers-date-testing-guide) provides a focused reference. For shared setup and environment placement, see the [Vitest configuration and setup guide](/blog/vitest-config-setup-guide-2026).

## Restore real timers even when an assertion fails

Fake timers are process-global within the test environment. A failed assertion before manual cleanup can leave the clock mocked for later tests. Put \`vi.useRealTimers()\` in \`afterEach\`, not only at the bottom of the happy path.

| Cleanup pattern | Failure behavior | Recommendation |
|---|---|---|
| Restore at end of test body | Skipped when test throws early | Avoid as sole cleanup |
| \`afterEach(() => vi.useRealTimers())\` | Runs through normal Vitest teardown | Good suite default |
| One global setup hook | Consistent across files in its scope | Useful when fake timers are common |
| Mix real and fake timers inside one test | Easy to leave pending callbacks behind | Use only with an explicit transition reason |

Restoring real timers does not run every pending fake timeout for you. If pending callbacks represent observable behavior, advance or clear them intentionally before restoration. If they should never be scheduled, assert the timer-related mock was not called.

Avoid enabling fake timers globally for the entire suite unless nearly every test expects them. Libraries and test utilities may use timers internally. A local fake clock makes ownership clearer and reduces surprising interactions.

## Test daylight-saving transitions with paired instants

A fixed UTC suite will not catch bugs in regions with offset transitions. When business logic depends on local schedules, add explicit named-zone tests around the relevant transition. Do not calculate expected offsets using the same helper under test.

For example, Europe/London moves from GMT to British Summer Time in spring. Instead of adding 24 hours and assuming the same local clock time, define the scheduling requirement: “run at 09:00 London time on each calendar day.” JavaScript \`Date\` alone does not model zoned calendar arithmetic. Use the application's chosen temporal library or platform abstraction, then assert known before-and-after instants.

Separate scenarios by intent:

| Scenario | Defect it can reveal | Assertion target |
|---|---|---|
| Spring gap | Nonexistent local time shifted unexpectedly | Chosen disambiguation behavior |
| Autumn overlap | Ambiguous local time selects wrong occurrence | Expected offset or instant |
| UTC midnight | Local calendar date crosses a boundary | Named-zone date fields |
| Half-hour zone | Code assumes whole-hour offsets | \`Asia/Kolkata\` or another applicable zone |
| No-DST baseline | Algorithm fails without transitions | Stable named zone such as \`Etc/UTC\` |

Do not hard-code current offset abbreviations as if they were timezone identifiers. \`Europe/London\` contains transition rules; \`GMT\` describes an offset convention and does not represent summer time behavior.

Timezone databases change when governments change rules. Pinning a container and Node runtime helps reproducibility, but product tests may need updates when real future rules change. That is maintenance of external civil-time data, not necessarily test flakiness.

## Avoid parsing ambiguous date text

Strings without an explicit offset are frequent sources of environment drift. \`2026-07-13T10:00:00\` has no \`Z\` or numeric offset, so it is interpreted as local date-time. The resulting instant changes with \`TZ\`.

Use a small test-data convention:

- Instants include \`Z\` or an explicit numeric offset.
- Date-only business values remain strings or domain-specific date objects.
- Named zones travel as separate IANA identifiers.
- Tests do not use the current date in expected values unless the clock is controlled.

Avoid snapshotting \`new Date().toString()\`. That output includes local zone information and environment-dependent wording. Snapshot ISO strings for instants, or assert structured pieces for localized displays.

Numeric timestamps are unambiguous but opaque in review. An ISO string with \`Z\` usually gives the best balance of exactness and readability. Convert it once through \`new Date(...)\` at the setup boundary.

## Select the right clock technique

Not every date test needs fake timers.

| Technique | Best use | Cost or limitation |
|---|---|---|
| Pass \`now\` as a function argument | Pure expiry or age calculation | Requires a testable production boundary |
| Inject a clock object | Many services share time behavior | Adds an interface to maintain |
| \`vi.setSystemTime\` only | Code reads current date but schedules no timers | Still uses host timezone unless explicit |
| Fake timers plus advancement | Timeouts, intervals, retries, expiry callbacks | Can affect libraries using timers internally |
| Separate processes with different \`TZ\` | Process-local timezone compatibility | Slower and more operational setup |
| Explicit \`Intl\` timezone | Display behavior in named zones | Locale data must be controlled for exact strings |

Clock injection is often the cleanest choice for domain services. A \`Clock\` with a \`now(): Date\` method makes time an ordinary dependency and leaves global timers untouched. Fake timers remain excellent at boundaries where browser or Node scheduling itself is part of behavior.

The best suite often uses both: injected clocks for calculation, Vitest fake timers for scheduled callbacks, and a small named-zone matrix for formatting and DST behavior.

## Audit dependencies that read time during import

Freezing the clock after importing the subject is too late if that module computes a date at top level. A constant such as sessionStart = new Date() captures real test-run time during module evaluation and remains unchanged after vi.setSystemTime. This often explains why a direct Date.now assertion is frozen while a derived application value is not.

The durable fix is usually to defer the read until the operation occurs or inject a clock. Re-importing the module after enabling fake timers can demonstrate the cause, but it makes tests depend on module-cache control and may create fresh singleton instances. Refactoring an import-time timestamp into a function is clearer unless the timestamp intentionally represents process startup.

Third-party libraries may also capture timers, locale formatters, or timezone-sensitive defaults when imported. Read their documented test guidance before combining them with global fake timers. If a library schedules background maintenance, fake time can stop that work and leave promises pending. Wrap the library behind an application boundary and use its supported clock option where one exists.

Module initialization order belongs in the review checklist:

| Time dependency | If captured during import | Preferred test seam |
|---|---|---|
| Current instant | Frozen value ignores later clock changes | Function call or injected clock |
| Default timezone | Formatter retains implicit process choice | Explicit named-zone formatter |
| Scheduled interval | Background task starts before fake timers | Explicit start and stop lifecycle |
| Date-derived cache key | Cache spans tests unpredictably | Factory created after test setup |

When process startup time is the behavior under test, isolate that narrow module in a separate process launched with an explicit timezone and known environment. A subprocess costs more than an ordinary unit test, but it accurately represents initialization without rebuilding the entire Vitest registry around framework modules.

## Check locale data separately from timezone arithmetic

Timezone correctness and localized presentation fail for different reasons. A minimal Node build may carry different locale data from a developer workstation. A correct instant and zone can therefore produce different names, punctuation, or numbering conventions.

For arithmetic tests, assert epoch values or ISO instants. For presentation tests, pin the locale, zone, and relevant format options. If exact wording matters, run on a standardized runtime image. If only individual fields matter, inspect formatToParts results and ignore separators. This separation makes failures point to either time conversion or presentation instead of mixing both concerns in one snapshot.

## Frequently Asked Questions

### Does \`vi.setSystemTime\` change the timezone?

No. It changes the current system time observed by date APIs. Local getters and default formatters still use the process timezone. Set \`TZ\` before starting Vitest for a suite-wide local zone, or pass an explicit \`timeZone\` to the formatter under test.

### Why did moving the clock not trigger my timeout?

\`vi.setSystemTime\` simulates changing the wall clock but does not fire scheduled timers. Use a timer advancement method such as \`vi.advanceTimersByTimeAsync\` when the behavior depends on a timeout or interval callback.

### Is \`new Date('2026-07-13')\` safe in tests?

It denotes midnight UTC under the standard date-time string format, but local rendering can show the previous calendar day in zones west of UTC. Use it only when that UTC instant is intended. Keep a true date-only domain value as date-only data.

### Can one Vitest run test several values of \`process.env.TZ\` concurrently?

That is risky because the timezone is process-wide and test files may share workers. For process-local behavior, launch separate Vitest processes with a different \`TZ\` value. For ordinary formatting checks, pass named zones explicitly and keep them in one process.

### Should every date test run under UTC?

UTC is a good deterministic default for tests that do not intentionally depend on local civil time. It is insufficient for scheduling, legal dates, or displays tied to a business or user zone. Add focused named-zone and transition cases for those requirements.
`,
};
