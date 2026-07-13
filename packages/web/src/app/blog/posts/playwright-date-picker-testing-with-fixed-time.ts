import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test a Date Picker with Fixed Time in Playwright',
  description:
    'Test date pickers with fixed time in Playwright across month ends, time zones, leap days, and booking cutoffs without flaky waits or host-clock dependence.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Test a Date Picker with Fixed Time in Playwright

At 23:58 in Los Angeles, the calendar still says March 31. On a CI worker configured for UTC, the same instant is already April 1. If a date-picker test derives “today” from the machine clock, both results can be internally correct while the assertion fails half a world away.

Playwright’s Clock API lets a test control the browser page’s notion of time. For a date picker, \`page.clock.setFixedTime()\` is usually the right tool: calls to \`Date.now()\` and \`new Date()\` return the chosen instant while timers continue to run normally. The test becomes repeatable without freezing animations, debounce timers, or unrelated application scheduling.

## Freeze the browser before application code reads today

Set the time before navigating. Many applications calculate default dates during module initialization, initial render, or hydration. Changing time after \`page.goto()\` can leave cached “today” values created from the real clock.

This Playwright Test example fixes the instant shortly before midnight UTC, opens a booking calendar, and verifies that past dates are disabled while the current date remains available.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('uses the fixed current day for booking availability', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-03-31T23:58:00.000Z'));
  await page.goto('/book?timezone=UTC');

  await page.getByRole('button', { name: 'Choose departure date' }).click();

  const calendar = page.getByRole('dialog', { name: 'Choose departure date' });
  await expect(calendar.getByText('March 2026', { exact: true })).toBeVisible();

  await expect(calendar.getByRole('button', { name: 'March 30, 2026' })).toBeDisabled();
  await expect(calendar.getByRole('button', { name: 'March 31, 2026' })).toBeEnabled();
});
\`\`\`

The accessible names are examples of the contract a well-built date picker should expose. Inspect your component’s actual accessibility tree instead of copying selectors. A button containing only “31” is ambiguous when adjacent-month days are visible. An accessible name containing the full date improves both assistive technology and automation.

## Fixed time is not a fixed time zone

An ISO instant ending in \`Z\` is UTC. JavaScript converts that instant into the browser context’s local time when code calls local getters such as \`getDate()\`. To test a product’s time-zone behavior, pair the Clock API with Playwright’s context \`timezoneId\` option.

\`\`\`typescript
import { test as base, expect } from '@playwright/test';

const test = base.extend({});

test.use({ timezoneId: 'America/Los_Angeles' });

test('keeps March 31 selected before local midnight', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-04-01T06:58:00.000Z'));
  await page.goto('/schedule');

  await page.getByRole('button', { name: 'Select appointment date' }).click();

  await expect(page.getByRole('dialog', { name: 'Appointment calendar' }))
    .toContainText('March 2026');
  await expect(page.getByText('Today: March 31, 2026')).toBeVisible();
});
\`\`\`

At that instant, Los Angeles local time is March 31 at 23:58 under daylight-saving rules. The same instant in UTC is April 1. This is precisely why a test must name both the instant and the intended zone.

| Control | What it changes | What it does not establish |
|---|---|---|
| \`page.clock.setFixedTime(date)\` | Values returned by \`Date.now()\` and \`new Date()\` | Browser time zone or locale |
| \`timezoneId\` | Local-time conversion rules in the browser context | Current instant |
| \`locale\` | Formatting and some locale-sensitive UI behavior | Product’s business calendar rules |
| Test data | Server-side slots, blackout dates, holidays | Browser clock unless application uses that data |

Do not encode the offset manually as “UTC minus eight.” Los Angeles switches between standard and daylight time. The IANA zone identifier lets the browser apply the appropriate rule for the chosen date.

## Date-only values need a product contract

An HTML date value such as \`2026-04-01\` is a calendar date, not an instant. Converting it through \`new Date('2026-04-01')\` invokes UTC parsing behavior and can display March 31 in a negative offset. A date picker should represent date-only values with a date model or carefully controlled year, month, and day components.

Before writing the test, clarify:

- whether the selected value is a calendar date or a timestamp;
- which zone defines “today” and booking cutoffs;
- whether the server or browser owns that rule;
- how the API serializes the selection;
- what happens when the user changes device time zone.

A browser test cannot correct an ambiguous domain model. It can expose the ambiguity by exercising the same instant in multiple zones and asserting the intended serialized value.

## Exercise a month boundary without waiting

\`setFixedTime()\` holds Date at one value but does not provide a progressing simulated clock. If the requirement is to watch an open calendar cross midnight, install the full clock, then advance it. Playwright documents \`install()\`, \`pauseAt()\`, \`fastForward()\`, \`runFor()\`, and \`resume()\` for timer-aware scenarios.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.use({ timezoneId: 'UTC' });

test('refreshes disabled dates when March becomes April', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-03-31T23:59:30.000Z') });
  await page.goto('/same-day-delivery');

  await page.getByRole('button', { name: 'Choose delivery date' }).click();
  await expect(page.getByText('Today: March 31, 2026')).toBeVisible();

  await page.clock.fastForward('00:31');

  await expect(page.getByText('Today: April 1, 2026')).toBeVisible();
  await expect(page.getByRole('button', { name: 'March 31, 2026' })).toBeDisabled();
});
\`\`\`

This test assumes the application actually schedules a refresh at midnight. If it calculates “today” only on page load, advancing time should not magically trigger a rerender. Decide whether automatic refresh is a requirement. For many forms, recalculating when the calendar reopens is sufficient and simpler.

Do not use \`page.waitForTimeout(31_000)\`. It consumes wall-clock time and still depends on scheduler behavior. Clock advancement expresses the scenario directly.

## Build a boundary matrix before building selectors

Date bugs concentrate where calendars change shape or business rules switch state. A compact risk matrix prevents ten happy-path tests from missing the one boundary that matters.

| Boundary | Fixed instant and context | Requirement to verify |
|---|---|---|
| End of 30-day month | April 30 near local midnight | Next navigation shows May 1 without skipping |
| End of year | December 31 in product zone | Year label and serialized date move together |
| Leap day | February 29, 2028 | Valid selection and next-year behavior |
| Non-leap February | February 28, 2027 | No February 29 control is exposed |
| DST spring transition | Zone and instant spanning the skipped hour | Date stays correct despite missing local times |
| Booking cutoff | Seconds before and after documented cutoff | Availability changes at the owned boundary |
| Minimum advance | Today plus required lead days | Earlier dates disabled, first valid date enabled |
| Maximum horizon | Last bookable date and following day | Boundary is inclusive or exclusive as specified |

Not every date picker needs daylight-saving coverage. A birthday field contains a date without a time and may not care about “today” beyond age validation. A flight booking flow does. Select cases from the domain, not from a generic calendar checklist.

## Test native inputs differently from calendar widgets

A native \`<input type="date">\` exposes a string value in \`YYYY-MM-DD\` format. Browser rendering of its picker is platform controlled and may not be automatable like application DOM. Fill the input value and assert validation or submitted payload.

\`\`\`typescript
test('submits a date-only value without UTC conversion', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-13T08:00:00.000Z'));
  await page.goto('/profile');

  await page.locator('input[type="date"][name="birthDate"]').fill('1992-11-05');

  const requestPromise = page.waitForRequest((request) =>
    request.url().endsWith('/api/profile') && request.method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Save profile' }).click();

  const request = await requestPromise;
  expect(request.postDataJSON()).toMatchObject({ birthDate: '1992-11-05' });
});
\`\`\`

For a custom ARIA calendar, interact through roles and full accessible names. Verify keyboard behavior if it is a requirement: arrow keys change the active date, Page Up changes month according to the component contract, Enter selects, and Escape closes without changing the value.

## Separate browser time from server time

Fixing \`page.clock\` does not change the Node.js test runner clock, API server clock, database clock, or a third-party scheduling service. If the browser requests available slots and the backend computes them from its real current time, the UI can still disagree with the fixed page.

Choose an ownership strategy:

1. Seed server data that is valid around the fixed instant and configure the test server with its own clock abstraction.
2. Stub the availability response with \`page.route()\` when the test owns only client behavior.
3. Run a full integration environment where the service accepts a test clock, if cross-layer time behavior is the target.

Do not send a client-controlled “current time” header to production simply to make tests easy. A clock dependency inside the service can be overridden in test composition without creating a public trust boundary.

When routing an API in Playwright, fulfill a realistic schema and keep a separate contract test against the real service. A date picker rendered from a fake response cannot prove the production availability calculation.

## Make locale assertions resilient

The day grid is generally a better assertion target than a fully formatted sentence. Formatting varies by locale: July 13, 13 July, different separators, translated month names, and non-Latin digits. If localization is part of the requirement, set \`locale\` explicitly in the browser context and assert the expected localized output.

If localization is not under test, avoid depending on host locale. Configure it in \`playwright.config.ts\` or at project level. Keep semantic values accessible through input values, ARIA labels, or stable state rather than scraping a visually formatted paragraph.

The [Playwright Clock API testing guide](/blog/playwright-clock-api-testing-guide-2026) covers broader timer, interval, and timeout scenarios. For maintainable locator and isolation patterns, use the [Playwright best practices guide](/blog/playwright-best-practices-2026).

## Diagnose failures from the calendar’s point of view

When a boundary test fails, capture four values before changing the assertion:

- the fixed ISO instant supplied to Playwright;
- the browser context’s resolved time zone;
- the value of \`new Date().toString()\` inside the page;
- the date value sent to or returned by the backend.

You can inspect the browser value with \`await page.evaluate(() => new Date().toString())\`. Log it as diagnostic context, not as the primary assertion. This separates a wrong fixed instant from a component parsing error or a server-side cutoff.

Also inspect whether the clock was installed before page scripts executed. A trace can reveal navigation and interaction order, but the key evidence is the runtime’s date view and the domain value crossing the API boundary.

## Keep the suite fast and independent

Use a fresh page or context per test, which Playwright Test provides by default. Set the clock independently in each case rather than depending on a previous test to advance it. A file-level helper can reduce syntax, but each test should reveal its instant and time zone near the scenario.

Avoid a giant parameterized matrix that produces opaque failures. Group only cases with the same interaction and business rule. Give each boundary a title that names the date, zone, and expected policy. Leap-year validation and booking cutoff logic may use the same widget but deserve separate failure reports.

## Prove cutoff inclusivity with adjacent instants

The phrase “book until midnight” is incomplete. Does availability end at 23:59:59.999 in the venue’s zone, at the start of the service date, or at a server batch boundary? Translate prose into an inclusive or exclusive instant, then test immediately on both sides.

For a cutoff at 17:00 local venue time, choose instants one millisecond before, exactly at, and one millisecond after only if the implementation and API preserve millisecond precision. Otherwise use the smallest precision the system guarantees. A database storing seconds cannot support an assertion about microseconds.

Pair the fixed browser time with server fixtures whose availability is stable across the three checks. If the backend owns cutoff calculation, control its clock too or exercise it in a service-level test. The Playwright scenario should then verify that the browser renders the decision and does not apply a conflicting client-side rule.

Explicit adjacent cases are more diagnostic than “today is disabled.” They reveal off-by-one comparisons such as \`<\` versus \`<=\`, accidental UTC conversion, and truncation to start of day.

## Navigate across adjacent-month cells

Calendar grids often display trailing days from the previous month and leading days from the next. Two buttons can show the numeral 1 while representing different dates. Use full accessible names and assert what selecting an adjacent-month cell does to the month heading.

Some components navigate and select in one action. Others render adjacent dates as disabled and require the next-month control. The test should follow the documented interaction, not enforce a library preference. Check that focus follows the selected date and that the input’s serialized value matches it.

At year boundaries, verify both visible heading and underlying value. A UI can show January 2027 while a stale state object submits January 2026. Intercept or wait for the submission request and inspect the date-only string rather than assuming visible text proves persistence.

## Validate DST days without inventing nonexistent times

On a spring-forward day, a local clock may jump from 01:59 to 03:00. Scheduling 02:30 in that zone is impossible. On a fall-back day, 01:30 occurs twice with different offsets. Date-only pickers may be unaffected, but appointment-time pickers are not.

Create test fixtures using explicit ISO instants and the target IANA zone. For an invalid local time, assert the product’s rule: reject it, move to the next valid slot, or omit it. For an ambiguous time, the UI may need to show zone abbreviations or offsets. Never construct the oracle by asking the same application helper that is under test.

Playwright controls the instant and zone seen by the browser, but it does not supply domain knowledge about daylight-saving ambiguity. Calculate expected instants independently using approved fixtures or a separately tested time library.

## Test reopening after time has advanced

A long-lived tab may keep a calendar closed across midnight. Advance the installed clock, reopen the picker, and verify minimum dates are recalculated. This differs from leaving the calendar open while midnight passes, and products often specify one behavior but not the other.

Also test an already selected date. If yesterday becomes invalid while a form remains open, decide whether the value is cleared, marked invalid, or accepted because it was selected before cutoff. Silent submission of an expired date is risky, but unexpectedly erasing user input can be worse. The automation should encode the product decision and confirm the validation message is accessible.

## Frequently Asked Questions

### Should setFixedTime be called before or after page.goto?

Call it before navigation when application startup reads the current date. That ensures initial scripts, hydration, and default-state calculation see the fixed instant. Changing it afterward may leave previously cached dates unchanged.

### Why do timers still run after fixing the date?

\`setFixedTime()\` fixes values from \`Date.now()\` and \`new Date()\` while allowing timers to continue. Use \`clock.install()\` and its advancement methods when the test must control scheduled execution as well as the current date.

### Does Playwright’s clock change the backend database time?

No. It affects the browser page. The test runner, server, database, and external services keep their own clocks unless separately controlled. Align test data or provide a service-level clock abstraction for cross-layer scenarios.

### What time zone should a booking date picker use?

That is a product decision. It may be the venue’s zone, departure location, account preference, or device zone. Document the owner, then set \`timezoneId\` and the fixed instant to exercise that rule explicitly.

### Is February 29 enough to prove leap-year correctness?

No. Test a valid leap day, a neighboring non-leap year, navigation across February and March, serialization, and any age or booking policy using the date. The widget and the domain validation can fail independently.
`,
};
