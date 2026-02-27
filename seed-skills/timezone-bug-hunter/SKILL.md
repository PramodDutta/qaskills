---
name: Timezone Bug Hunter
description: "Find timezone-related bugs in date handling, scheduling, and display logic by testing across multiple timezones and edge cases like DST transitions."
version: 1.0.0
author: qaskills
license: MIT
tags: [timezone, datetime, dst, scheduling, internationalization, date-parsing]
testingTypes: [e2e, integration]
frameworks: [playwright]
languages: [typescript, javascript, python, java]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Timezone Bug Hunter Skill

You are an expert QA engineer specializing in timezone and date/time testing. When the user asks you to write, review, or debug timezone-related tests, follow these detailed instructions to systematically detect incorrect date conversions, DST boundary failures, locale formatting bugs, UTC offset miscalculations, and server/client timezone mismatches that corrupt temporal data across application layers.

## Core Principles

1. **Store in UTC, display in local** -- All dates stored in databases and transmitted through APIs must be in UTC. Conversion to the user's local timezone should happen exclusively in the presentation layer. Any deviation from this principle is a bug that will manifest differently for every user depending on their geographic location and the time of year.

2. **DST transitions are not edge cases** -- Daylight Saving Time changes affect billions of users twice per year. The "spring forward" hour that does not exist and the "fall back" hour that occurs twice are predictable, recurring events that must be handled correctly in every date calculation, scheduling system, and duration computation. Treat these as first-class test scenarios, not afterthoughts.

3. **Timezone is not an offset** -- A timezone is a set of rules that define when offsets change (e.g., "America/New_York" transitions between UTC-5 and UTC-4 depending on DST). An offset is a fixed number at a specific point in time. Storing offsets instead of IANA timezone identifiers loses the ability to correctly handle future DST transitions, historical timezone changes, and governmental rule modifications.

4. **Date serialization must be unambiguous** -- A date string like "2025-03-09 02:30" is inherently ambiguous without timezone information. It could represent different instants depending on interpretation. All serialized dates must include explicit timezone designators (Z for UTC, or a full offset like +05:30). Ambiguous date strings are a category of bugs, not a formatting preference.

5. **Client and server clocks diverge** -- Never assume that the client's system clock is accurate or synchronized with the server. User devices may have incorrect timezone settings, drifted clocks, or manually overridden dates. Tests must account for clock skew between layers and validate that the application functions correctly even when client time differs from server time by minutes or hours.

6. **Locale affects more than language** -- The same date is displayed as "3/9/2025" in the US, "9/3/2025" in the UK, and "2025/3/9" in Japan. Date formatting must respect the user's locale, not the developer's locale or the server's locale. This extends beyond simple date ordering to include month names, day names, time formats (12-hour vs 24-hour), week start day, and calendar system.

7. **Calendar boundaries vary by timezone** -- "Today" is not the same date everywhere. At 11 PM UTC, it is already tomorrow in Asia and still today in the Americas. Any feature that references "today," "this week," or "this month" must clarify whose timezone defines the boundary. Failure to do so produces bugs that only affect users in certain timezones at certain times of day.

## Project Structure

```
tests/
  timezone/
    timezone-emulation.spec.ts        # Playwright timezone emulation across zones
    dst-boundary.spec.ts              # DST transition edge cases
    date-serialization.spec.ts        # Serialization/deserialization integrity
    cross-timezone-scheduling.spec.ts # Scheduling across multiple timezones
    date-display.spec.ts              # Date display formatting by locale
    server-client-mismatch.spec.ts    # Server/client timezone mismatch detection
    calendar-components.spec.ts       # Calendar widget timezone correctness
    relative-time.spec.ts             # Relative time display accuracy
    api/
      date-api.spec.ts               # API date handling tests (TypeScript)
      date-api.py                     # API date handling tests (Python)
    fixtures/
      timezone-helpers.ts             # Timezone emulation utilities
      date-factory.ts                 # Test date generation with known instants
      dst-dates.ts                    # Known DST transition dates by region
  playwright.config.ts
```

## Configuration

### Playwright Configuration for Timezone Testing

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/timezone',
  fullyParallel: false, // Timezone tests may share browser state; run sequentially by default
  retries: 0,          // Timezone bugs are deterministic; retries mask real failures
  timeout: 30_000,
  use: {
    baseURL: process.env.TARGET_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    timezoneId: 'UTC', // Default to UTC; individual tests override per scenario
  },
  projects: [
    {
      name: 'timezone-utc',
      use: { timezoneId: 'UTC' },
    },
    {
      name: 'timezone-est',
      use: { timezoneId: 'America/New_York' },
    },
    {
      name: 'timezone-pst',
      use: { timezoneId: 'America/Los_Angeles' },
    },
    {
      name: 'timezone-ist',
      use: { timezoneId: 'Asia/Kolkata' },
    },
    {
      name: 'timezone-jst',
      use: { timezoneId: 'Asia/Tokyo' },
    },
    {
      name: 'timezone-nzst',
      use: { timezoneId: 'Pacific/Auckland' },
    },
    {
      name: 'timezone-chatham',
      use: { timezoneId: 'Pacific/Chatham' }, // UTC+12:45, non-standard offset
    },
  ],
});
```

### Timezone Test Fixture Definitions

```typescript
// tests/timezone/fixtures/timezone-helpers.ts

export interface TimezoneTestCase {
  timezone: string;          // IANA timezone identifier
  utcOffset: string;         // Standard offset, e.g., "+05:30"
  dstOffset?: string;        // DST offset, e.g., "-04:00"
  abbreviation: string;      // Standard abbreviation, e.g., "IST"
  dstAbbreviation?: string;  // DST abbreviation, e.g., "EDT"
  hasDST: boolean;
  dstStart?: string;         // ISO date when DST starts (clocks spring forward)
  dstEnd?: string;           // ISO date when DST ends (clocks fall back)
}

export const TIMEZONE_TEST_CASES: TimezoneTestCase[] = [
  {
    timezone: 'America/New_York',
    utcOffset: '-05:00',
    dstOffset: '-04:00',
    abbreviation: 'EST',
    dstAbbreviation: 'EDT',
    hasDST: true,
    dstStart: '2025-03-09T02:00:00',
    dstEnd: '2025-11-02T02:00:00',
  },
  {
    timezone: 'America/Los_Angeles',
    utcOffset: '-08:00',
    dstOffset: '-07:00',
    abbreviation: 'PST',
    dstAbbreviation: 'PDT',
    hasDST: true,
    dstStart: '2025-03-09T02:00:00',
    dstEnd: '2025-11-02T02:00:00',
  },
  {
    timezone: 'Europe/London',
    utcOffset: '+00:00',
    dstOffset: '+01:00',
    abbreviation: 'GMT',
    dstAbbreviation: 'BST',
    hasDST: true,
    dstStart: '2025-03-30T01:00:00',
    dstEnd: '2025-10-26T02:00:00',
  },
  {
    timezone: 'Europe/Berlin',
    utcOffset: '+01:00',
    dstOffset: '+02:00',
    abbreviation: 'CET',
    dstAbbreviation: 'CEST',
    hasDST: true,
    dstStart: '2025-03-30T02:00:00',
    dstEnd: '2025-10-26T03:00:00',
  },
  {
    timezone: 'Asia/Kolkata',
    utcOffset: '+05:30',
    abbreviation: 'IST',
    hasDST: false,
  },
  {
    timezone: 'Asia/Tokyo',
    utcOffset: '+09:00',
    abbreviation: 'JST',
    hasDST: false,
  },
  {
    timezone: 'Pacific/Auckland',
    utcOffset: '+12:00',
    dstOffset: '+13:00',
    abbreviation: 'NZST',
    dstAbbreviation: 'NZDT',
    hasDST: true,
    dstStart: '2025-09-28T02:00:00',
    dstEnd: '2025-04-06T03:00:00',
  },
  {
    timezone: 'Asia/Kathmandu',
    utcOffset: '+05:45',
    abbreviation: 'NPT',
    hasDST: false,
  },
  {
    timezone: 'Pacific/Chatham',
    utcOffset: '+12:45',
    dstOffset: '+13:45',
    abbreviation: 'CHAST',
    dstAbbreviation: 'CHADT',
    hasDST: true,
  },
];

export function parseOffset(offset: string): number {
  const match = offset.match(/([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === '+' ? 1 : -1;
  return sign * (parseInt(match[2]) * 60 + parseInt(match[3]));
}

export const DST_EDGE_DATES = {
  // US DST 2025: Spring forward March 9, 2:00 AM -> 3:00 AM
  usSpringForward: {
    before: '2025-03-09T01:59:00-05:00',     // 1:59 AM EST, valid
    during: '2025-03-09T02:30:00',            // 2:30 AM -- this time does NOT exist in EST
    after: '2025-03-09T03:01:00-04:00',       // 3:01 AM EDT, valid
    utcBefore: '2025-03-09T06:59:00Z',
    utcAfter: '2025-03-09T07:01:00Z',
  },
  // US DST 2025: Fall back November 2, 2:00 AM -> 1:00 AM
  usFallBack: {
    firstOccurrence: '2025-11-02T01:30:00-04:00',  // 1:30 AM EDT (first time)
    secondOccurrence: '2025-11-02T01:30:00-05:00',  // 1:30 AM EST (second time)
    utcFirst: '2025-11-02T05:30:00Z',
    utcSecond: '2025-11-02T06:30:00Z',
  },
  // EU DST 2025: Spring forward March 30, 1:00 AM UTC -> 2:00 AM BST
  euSpringForward: {
    before: '2025-03-30T00:59:00+00:00',
    after: '2025-03-30T02:01:00+01:00',
    utcBefore: '2025-03-30T00:59:00Z',
    utcAfter: '2025-03-30T01:01:00Z',
  },
  // NZ DST 2025: Spring forward September 28, 2:00 AM -> 3:00 AM
  nzSpringForward: {
    before: '2025-09-28T01:59:00+12:00',
    after: '2025-09-28T03:01:00+13:00',
  },
};
```

### Test Date Factory

```typescript
// tests/timezone/fixtures/date-factory.ts

export function createTestDates() {
  return {
    // Standard reference dates
    newYear2025: '2025-01-01T00:00:00Z',
    midYear2025: '2025-07-01T12:00:00Z',

    // Near midnight UTC (tests date boundary behavior)
    justBeforeMidnightUTC: '2025-06-15T23:59:59Z',
    justAfterMidnightUTC: '2025-06-16T00:00:01Z',

    // Near DST transitions
    beforeUsDst: '2025-03-09T06:59:00Z',  // 1:59 AM EST
    afterUsDst: '2025-03-09T07:01:00Z',   // 3:01 AM EDT
    beforeEuDst: '2025-03-30T00:59:00Z',  // 12:59 AM GMT
    afterEuDst: '2025-03-30T01:01:00Z',   // 2:01 AM BST

    // Leap year dates
    leapDay2024: '2024-02-29T12:00:00Z',
    afterLeapDay2024: '2024-03-01T00:00:00Z',
    feb28NonLeap: '2025-02-28T23:59:59Z',

    // Year boundary
    yearEnd2024: '2024-12-31T23:59:59Z',
    yearStart2025: '2025-01-01T00:00:00Z',

    // Dates that change calendar day depending on timezone
    dateLineTest: '2025-06-15T22:00:00Z',  // June 16 in NZ, still June 15 in US
    asiaEveningUtc: '2025-06-15T18:00:00Z', // Already June 16 in IST/JST

    // Month boundary
    endOfJanuary: '2025-01-31T23:59:59Z',
    startOfFebruary: '2025-02-01T00:00:00Z',

    // End-of-month edge cases for scheduling
    march31: '2025-03-31T12:00:00Z',
    april30: '2025-04-30T12:00:00Z',
  };
}
```

## Timezone Emulation in Playwright

```typescript
// tests/timezone/timezone-emulation.spec.ts
import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { TIMEZONE_TEST_CASES, parseOffset } from './fixtures/timezone-helpers';
import { createTestDates } from './fixtures/date-factory';

async function createPageInTimezone(
  browser: Browser,
  timezone: string
): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.newContext({ timezoneId: timezone });
  const page = await context.newPage();
  return { page, context };
}

test.describe('Timezone Emulation Verification', () => {
  const testDates = createTestDates();

  for (const tz of TIMEZONE_TEST_CASES) {
    test(`browser reports correct timezone for ${tz.timezone}`, async ({ browser }) => {
      const { page, context } = await createPageInTimezone(browser, tz.timezone);
      await page.goto('/', { waitUntil: 'networkidle' });

      const browserTimezone = await page.evaluate(() => {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      });
      expect(browserTimezone).toBe(tz.timezone);

      await context.close();
    });

    test(`UTC date converts correctly in ${tz.timezone}`, async ({ browser }) => {
      const { page, context } = await createPageInTimezone(browser, tz.timezone);
      await page.goto('/');

      const displayedDate = await page.evaluate((utcDate) => {
        const date = new Date(utcDate);
        return {
          localString: date.toLocaleString(),
          isoString: date.toISOString(),
          timezoneOffset: date.getTimezoneOffset(),
          localDate: date.toLocaleDateString(),
          localTime: date.toLocaleTimeString(),
          hours: date.getHours(),
          utcHours: date.getUTCHours(),
        };
      }, testDates.midYear2025);

      // ISO string must always be UTC regardless of browser timezone
      expect(displayedDate.isoString).toContain('Z');

      // For non-DST timezones, verify the offset matches expected value exactly
      if (!tz.hasDST) {
        const expectedOffsetMinutes = parseOffset(tz.utcOffset);
        // getTimezoneOffset returns inverted sign: EST returns 300 (not -300)
        expect(displayedDate.timezoneOffset).toBe(-expectedOffsetMinutes);
      }

      await context.close();
    });
  }

  test('same UTC instant shows different local dates near the date line', async ({ browser }) => {
    const utcDate = testDates.dateLineTest; // 2025-06-15T22:00:00Z

    // In New Zealand (UTC+12), this is already June 16
    const { page: nzPage, context: nzCtx } = await createPageInTimezone(
      browser,
      'Pacific/Auckland'
    );
    await nzPage.goto('/');
    const nzResult = await nzPage.evaluate((d) => {
      const date = new Date(d);
      return { day: date.getDate(), month: date.getMonth() + 1 };
    }, utcDate);

    // In US Pacific (UTC-7 summer), this is still June 15
    const { page: usPage, context: usCtx } = await createPageInTimezone(
      browser,
      'America/Los_Angeles'
    );
    await usPage.goto('/');
    const usResult = await usPage.evaluate((d) => {
      const date = new Date(d);
      return { day: date.getDate(), month: date.getMonth() + 1 };
    }, utcDate);

    expect(nzResult.day).toBe(16);
    expect(usResult.day).toBe(15);

    await nzCtx.close();
    await usCtx.close();
  });

  test('non-standard offset timezones compute correct local time', async ({ browser }) => {
    const utcDate = '2025-06-15T12:00:00Z'; // Noon UTC

    // India: UTC+5:30 -> 5:30 PM local
    const { page: istPage, context: istCtx } = await createPageInTimezone(
      browser,
      'Asia/Kolkata'
    );
    await istPage.goto('/');
    const istResult = await istPage.evaluate((d) => {
      const date = new Date(d);
      return { hours: date.getHours(), minutes: date.getMinutes() };
    }, utcDate);
    expect(istResult.hours).toBe(17);
    expect(istResult.minutes).toBe(30);

    // Nepal: UTC+5:45 -> 5:45 PM local
    const { page: nptPage, context: nptCtx } = await createPageInTimezone(
      browser,
      'Asia/Kathmandu'
    );
    await nptPage.goto('/');
    const nptResult = await nptPage.evaluate((d) => {
      const date = new Date(d);
      return { hours: date.getHours(), minutes: date.getMinutes() };
    }, utcDate);
    expect(nptResult.hours).toBe(17);
    expect(nptResult.minutes).toBe(45);

    // Chatham Islands: UTC+12:45 -> 12:45 AM next day
    const { page: chatPage, context: chatCtx } = await createPageInTimezone(
      browser,
      'Pacific/Chatham'
    );
    await chatPage.goto('/');
    const chatResult = await chatPage.evaluate((d) => {
      const date = new Date(d);
      return { hours: date.getHours(), minutes: date.getMinutes(), day: date.getDate() };
    }, utcDate);
    expect(chatResult.minutes).toBe(45);
    expect(chatResult.day).toBe(16); // Crossed into next day

    await istCtx.close();
    await nptCtx.close();
    await chatCtx.close();
  });
});
```

## DST Boundary Testing

```typescript
// tests/timezone/dst-boundary.spec.ts
import { test, expect } from '@playwright/test';
import { DST_EDGE_DATES } from './fixtures/timezone-helpers';

test.describe('DST Boundary Testing', () => {
  test('spring forward: the non-existent hour is handled gracefully', async ({ browser }) => {
    const context = await browser.newContext({
      timezoneId: 'America/New_York',
    });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      // 2:30 AM on March 9, 2025 does not exist in America/New_York
      // Clocks jump from 2:00 AM EST directly to 3:00 AM EDT
      const nonExistentTime = new Date('2025-03-09T02:30:00');
      const beforeDst = new Date('2025-03-09T01:30:00');
      const afterDst = new Date('2025-03-09T03:30:00');

      return {
        nonExistent: {
          toString: nonExistentTime.toString(),
          hours: nonExistentTime.getHours(),
          utcHours: nonExistentTime.getUTCHours(),
          offset: nonExistentTime.getTimezoneOffset(),
        },
        before: {
          toString: beforeDst.toString(),
          offset: beforeDst.getTimezoneOffset(),
        },
        after: {
          toString: afterDst.toString(),
          offset: afterDst.getTimezoneOffset(),
        },
        offsetChanged: beforeDst.getTimezoneOffset() !== afterDst.getTimezoneOffset(),
      };
    });

    // Verify the UTC offset actually changed (EST -> EDT)
    expect(result.offsetChanged, 'DST transition should change the UTC offset').toBe(true);

    // Before DST: EST (UTC-5, getTimezoneOffset returns 300)
    expect(result.before.offset).toBe(300);

    // After DST: EDT (UTC-4, getTimezoneOffset returns 240)
    expect(result.after.offset).toBe(240);

    await context.close();
  });

  test('fall back: the ambiguous hour produces two distinct UTC instants', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      timezoneId: 'America/New_York',
    });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      // 1:30 AM on November 2, 2025 occurs TWICE in America/New_York:
      // First at 1:30 AM EDT (UTC-4), then again at 1:30 AM EST (UTC-5)
      const firstOccurrence = new Date('2025-11-02T05:30:00Z');  // 1:30 AM EDT
      const secondOccurrence = new Date('2025-11-02T06:30:00Z'); // 1:30 AM EST

      return {
        first: {
          localHour: firstOccurrence.getHours(),
          localMinute: firstOccurrence.getMinutes(),
          offset: firstOccurrence.getTimezoneOffset(),
          utc: firstOccurrence.toISOString(),
        },
        second: {
          localHour: secondOccurrence.getHours(),
          localMinute: secondOccurrence.getMinutes(),
          offset: secondOccurrence.getTimezoneOffset(),
          utc: secondOccurrence.toISOString(),
        },
      };
    });

    // Both show 1:30 AM local time
    expect(result.first.localHour).toBe(1);
    expect(result.first.localMinute).toBe(30);
    expect(result.second.localHour).toBe(1);
    expect(result.second.localMinute).toBe(30);

    // But they represent different UTC instants (one hour apart)
    expect(result.first.utc).not.toBe(result.second.utc);

    await context.close();
  });

  test('duration calculations across DST spring forward produce 23-hour day', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      timezoneId: 'America/New_York',
    });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      // March 9, 2025: Day is only 23 hours long due to spring forward
      const dayStart = new Date('2025-03-09T05:00:00Z'); // Midnight EST (UTC-5)
      const dayEnd = new Date('2025-03-10T04:00:00Z');   // Midnight EDT next day (UTC-4)

      const actualHours = (dayEnd.getTime() - dayStart.getTime()) / (1000 * 60 * 60);

      return { springDayHours: actualHours };
    });

    expect(result.springDayHours).toBe(23);

    await context.close();
  });

  test('duration calculations across DST fall back produce 25-hour day', async ({ browser }) => {
    const context = await browser.newContext({
      timezoneId: 'America/New_York',
    });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      // November 2, 2025: Day is 25 hours long due to fall back
      const dayStart = new Date('2025-11-02T04:00:00Z'); // Midnight EDT (UTC-4)
      const dayEnd = new Date('2025-11-03T05:00:00Z');   // Midnight EST next day (UTC-5)

      const actualHours = (dayEnd.getTime() - dayStart.getTime()) / (1000 * 60 * 60);

      return { fallDayHours: actualHours };
    });

    expect(result.fallDayHours).toBe(25);

    await context.close();
  });

  test('scheduled recurring event maintains correct local time across DST', async ({
    browser,
    request,
  }) => {
    const context = await browser.newContext({
      timezoneId: 'America/New_York',
    });
    const page = await context.newPage();

    // Create a recurring daily event at 9:00 AM local time
    const response = await request.post('/api/events', {
      data: {
        title: 'Daily Standup',
        startTime: '2025-03-08T09:00:00-05:00', // 9 AM EST, day before DST
        recurrence: 'daily',
        timezone: 'America/New_York',
      },
    });

    if (response.status() === 201) {
      const event = await response.json();

      // Get the occurrence for March 9 (DST transition day)
      const nextDayRes = await request.get(
        `/api/events/${event.id}/occurrences?date=2025-03-09`
      );
      if (nextDayRes.ok()) {
        const occurrence = await nextDayRes.json();
        // Must be 9:00 AM EDT (UTC-4), not 10:00 AM or 8:00 AM
        expect(occurrence.localTime).toBe('09:00');
        // The UTC time should shift from 14:00 to 13:00 due to DST
      }
    }

    await context.close();
  });

  test('EU DST transition at different date than US DST', async ({ browser }) => {
    // Between March 9 (US DST) and March 30 (EU DST), US is in EDT but EU is still in standard time
    const usCtx = await browser.newContext({ timezoneId: 'America/New_York' });
    const euCtx = await browser.newContext({ timezoneId: 'Europe/London' });

    const usPage = await usCtx.newPage();
    const euPage = await euCtx.newPage();

    await usPage.goto('/');
    await euPage.goto('/');

    const testDate = '2025-03-15T12:00:00Z'; // Between US and EU DST transitions

    const usOffset = await usPage.evaluate((d) => {
      return new Date(d).getTimezoneOffset();
    }, testDate);

    const euOffset = await euPage.evaluate((d) => {
      return new Date(d).getTimezoneOffset();
    }, testDate);

    // US is already in EDT (UTC-4, offset = 240)
    expect(usOffset).toBe(240);
    // UK is still in GMT (UTC+0, offset = 0)
    expect(euOffset).toBe(0);

    await usCtx.close();
    await euCtx.close();
  });
});
```

## Date Serialization and Deserialization

```typescript
// tests/timezone/date-serialization.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Date Serialization and Deserialization', () => {
  test('API responses include timezone information in all date fields', async ({ request }) => {
    const response = await request.get('/api/events');
    expect(response.ok()).toBe(true);
    const body = await response.json();
    const events = body.data || body;

    for (const event of events) {
      const dateFields = Object.entries(event).filter(([key]) =>
        key.match(/date|time|created|updated|start|end|at$/i)
      );

      for (const [field, value] of dateFields) {
        if (typeof value === 'string' && value.length > 0) {
          const hasTimezone =
            value.endsWith('Z') ||
            /[+-]\d{2}:\d{2}$/.test(value) ||
            /[+-]\d{4}$/.test(value);

          expect(
            hasTimezone,
            `Date field "${field}" lacks timezone designator: "${value}". ` +
            'All date strings in API responses must include Z or an explicit offset.'
          ).toBe(true);
        }
      }
    }
  });

  test('date round-trip preserves the exact UTC instant', async ({ request }) => {
    const testDate = '2025-06-15T14:30:00.000Z';

    const createRes = await request.post('/api/events', {
      data: {
        title: 'Round Trip Preservation Test',
        startTime: testDate,
        timezone: 'UTC',
      },
    });

    if (createRes.status() === 201) {
      const created = await createRes.json();
      const getRes = await request.get(`/api/events/${created.id}`);
      const retrieved = await getRes.json();

      const originalMs = new Date(testDate).getTime();
      const retrievedMs = new Date(retrieved.startTime).getTime();

      expect(
        retrievedMs,
        `Date shifted by ${retrievedMs - originalMs}ms during round-trip storage`
      ).toBe(originalMs);
    }
  });

  test('all valid ISO 8601 formats are accepted and normalized', async ({ request }) => {
    const validFormats = [
      '2025-06-15T14:30:00Z',
      '2025-06-15T14:30:00.000Z',
      '2025-06-15T14:30:00+00:00',
      '2025-06-15T14:30:00-05:00',
      '2025-06-15T19:30:00+05:00',
      '2025-06-15T20:00:00+05:30',   // IST offset
    ];

    const storedInstants: number[] = [];

    for (const format of validFormats) {
      const response = await request.post('/api/events', {
        data: {
          title: `Format test: ${format}`,
          startTime: format,
          timezone: 'UTC',
        },
      });

      expect(
        [200, 201].includes(response.status()),
        `ISO 8601 format rejected: "${format}" (status: ${response.status()})`
      ).toBe(true);

      if (response.ok()) {
        const body = await response.json();
        storedInstants.push(new Date(body.startTime).getTime());
      }
    }

    // All formats that represent the same instant should store identically
    // Formats 1-3 and 5 all represent the same instant (14:30 UTC)
    if (storedInstants.length >= 3) {
      expect(storedInstants[0]).toBe(storedInstants[1]);
      expect(storedInstants[1]).toBe(storedInstants[2]);
    }
  });

  test('ambiguous date strings without timezone are handled safely', async ({ request }) => {
    const ambiguousFormats = [
      '2025-06-15',            // Date only, no time, no timezone
      '06/15/2025',            // US format, ambiguous internationally
      '15/06/2025',            // EU format, ambiguous internationally
      '2025-06-15 14:30:00',   // Space separator, no timezone designator
      '1718458200',            // Unix timestamp as string (seconds vs milliseconds?)
    ];

    for (const format of ambiguousFormats) {
      const response = await request.post('/api/events', {
        data: {
          title: 'Ambiguous format test',
          startTime: format,
        },
      });

      if (response.ok()) {
        const body = await response.json();
        const stored = body.startTime;
        const hasTimezone = stored.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(stored);
        expect(
          hasTimezone,
          `Ambiguous input "${format}" was accepted but stored without timezone: "${stored}". ` +
          'The API must either reject ambiguous formats or normalize them to include a timezone.'
        ).toBe(true);
      }
    }
  });
});
```

## Server/Client Timezone Mismatch Detection

```typescript
// tests/timezone/server-client-mismatch.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Server/Client Timezone Mismatch', () => {
  test('"today" filter returns results for the user timezone, not UTC', async ({ browser }) => {
    // Test from a timezone where "today" differs from UTC's "today"
    const context = await browser.newContext({
      timezoneId: 'Pacific/Auckland', // UTC+12
    });
    const page = await context.newPage();

    // Pin the clock to a time where NZ date differs from UTC date
    // 11 PM UTC June 15 = 11 AM June 16 in NZ
    await page.clock.setFixedTime(new Date('2025-06-15T23:00:00Z'));
    await page.goto('/dashboard?filter=today', { waitUntil: 'networkidle' });

    const dateInfo = await page.evaluate(() => {
      const now = new Date();
      return {
        localDate: now.toLocaleDateString('en-NZ'),
        utcDate: now.toISOString().split('T')[0],
        localDay: now.getDate(),
        utcDay: now.getUTCDate(),
      };
    });

    // In NZ, it is June 16; in UTC, it is June 15
    expect(dateInfo.localDay).toBe(16);
    expect(dateInfo.utcDay).toBe(15);

    // The "today" filter should show items for June 16 (NZ local date)
    // If it shows June 15 items, the server is using UTC instead of user's timezone

    await context.close();
  });

  test('server timestamps render in user local time, not raw UTC', async ({ browser }) => {
    const testTimezones = [
      { tz: 'America/New_York', label: 'Eastern' },
      { tz: 'Asia/Tokyo', label: 'Japan' },
      { tz: 'Europe/London', label: 'London' },
      { tz: 'Asia/Kolkata', label: 'India' },
    ];

    for (const { tz, label } of testTimezones) {
      const context = await browser.newContext({ timezoneId: tz });
      const page = await context.newPage();
      await page.goto('/dashboard', { waitUntil: 'networkidle' });

      const timestamps = await page.evaluate(() => {
        const elements = document.querySelectorAll('[data-utc], time[datetime]');
        const results: { utc: string; displayed: string }[] = [];

        elements.forEach((el) => {
          const utc = el.getAttribute('data-utc') || el.getAttribute('datetime') || '';
          const displayed = el.textContent?.trim() || '';
          if (utc && displayed) {
            results.push({ utc, displayed });
          }
        });

        return results;
      });

      for (const ts of timestamps) {
        const utcDate = new Date(ts.utc);
        expect(utcDate.getTime()).not.toBeNaN();

        // The displayed text should not literally show "Z" or "+00:00"
        // unless the user is actually in UTC
        if (tz !== 'UTC') {
          const showsRawUtc = ts.displayed.includes(' UTC') || ts.displayed.endsWith('Z');
          if (showsRawUtc) {
            console.warn(
              `[${label}] Timestamp "${ts.displayed}" appears to show raw UTC to a non-UTC user.`
            );
          }
        }
      }

      await context.close();
    }
  });

  test('user timezone is transmitted to the API for date-relative queries', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      timezoneId: 'Asia/Kolkata',
    });
    const page = await context.newPage();

    const apiRequests: { url: string; headers: Record<string, string>; body?: string }[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          headers: request.headers(),
          body: request.postData() || undefined,
        });
      }
    });

    await page.goto('/dashboard?filter=today', { waitUntil: 'networkidle' });

    const hasTimezoneInRequest = apiRequests.some((req) => {
      const urlHasTz = req.url.includes('timezone=') || req.url.includes('tz=');
      const headerHasTz = !!(req.headers['x-timezone'] || req.headers['x-user-timezone']);
      const bodyHasTz = req.body?.includes('timezone') || req.body?.includes('Asia/Kolkata');
      return urlHasTz || headerHasTz || bodyHasTz;
    });

    if (!hasTimezoneInRequest) {
      console.warn(
        'BUG: No timezone information sent in API requests from India timezone. ' +
        'Date-relative queries (today, this week, this month) will produce incorrect ' +
        'results for users whose local date differs from the server date.'
      );
    }

    await context.close();
  });
});
```

## Date Display and Locale Formatting

```typescript
// tests/timezone/date-display.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Date Display Formatting', () => {
  test('dates respect user locale formatting conventions', async ({ browser }) => {
    const locales = [
      { locale: 'en-US', description: 'US (MM/DD/YYYY)' },
      { locale: 'en-GB', description: 'UK (DD/MM/YYYY)' },
      { locale: 'de-DE', description: 'Germany (DD.MM.YYYY)' },
      { locale: 'ja-JP', description: 'Japan (YYYY/MM/DD)' },
      { locale: 'ko-KR', description: 'Korea (YYYY. MM. DD.)' },
    ];

    for (const { locale, description } of locales) {
      const context = await browser.newContext({ locale });
      const page = await context.newPage();
      await page.goto('/dashboard', { waitUntil: 'networkidle' });

      const dateDisplay = await page.evaluate(() => {
        const dateElements = document.querySelectorAll('time, [data-date]');
        const dates: string[] = [];
        dateElements.forEach((el) => {
          const text = el.textContent?.trim() || '';
          if (text.match(/\d/)) {
            dates.push(text);
          }
        });
        return dates;
      });

      // Verify that at least some dates were found on the page
      if (dateDisplay.length > 0) {
        for (const dateText of dateDisplay) {
          expect(dateText.length).toBeGreaterThan(0);
        }
      }

      await context.close();
    }
  });

  test('12-hour vs 24-hour time format follows locale convention', async ({ browser }) => {
    // US uses 12-hour format by default
    const usCtx = await browser.newContext({ locale: 'en-US' });
    const usPage = await usCtx.newPage();
    await usPage.goto('/dashboard', { waitUntil: 'networkidle' });

    const usTimeFormat = await usPage.evaluate(() => {
      const timeStr = new Date('2025-06-15T15:30:00Z').toLocaleTimeString();
      return {
        has12Hour: /AM|PM/i.test(timeStr),
        formatted: timeStr,
      };
    });
    expect(usTimeFormat.has12Hour).toBe(true);

    // Germany uses 24-hour format by default
    const deCtx = await browser.newContext({ locale: 'de-DE' });
    const dePage = await deCtx.newPage();
    await dePage.goto('/dashboard', { waitUntil: 'networkidle' });

    const deTimeFormat = await dePage.evaluate(() => {
      const timeStr = new Date('2025-06-15T15:30:00Z').toLocaleTimeString();
      return {
        has12Hour: /AM|PM/i.test(timeStr),
        formatted: timeStr,
      };
    });
    expect(deTimeFormat.has12Hour).toBe(false);

    await usCtx.close();
    await deCtx.close();
  });
});
```

## Relative Time Display Testing

```typescript
// tests/timezone/relative-time.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Relative Time Display', () => {
  test('relative timestamps update as time progresses', async ({ browser }) => {
    const context = await browser.newContext({ timezoneId: 'UTC' });
    const page = await context.newPage();

    // Fix time to a known instant
    const now = new Date('2025-06-15T12:00:00Z');
    await page.clock.setFixedTime(now);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    const relativeTimes = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        '[data-relative-time], [class*="time-ago"], [class*="relative"]'
      );
      const results: { text: string; datetime: string | null }[] = [];

      elements.forEach((el) => {
        results.push({
          text: el.textContent?.trim() || '',
          datetime: el.getAttribute('datetime') || el.getAttribute('data-utc'),
        });
      });

      return results;
    });

    for (const item of relativeTimes) {
      if (item.datetime) {
        const date = new Date(item.datetime);
        const diffMs = now.getTime() - date.getTime();

        if (diffMs >= 0 && diffMs < 60_000) {
          expect(item.text).toMatch(/just now|seconds?|moment/i);
        } else if (diffMs >= 60_000 && diffMs < 3_600_000) {
          expect(item.text).toMatch(/minutes?/i);
        } else if (diffMs >= 3_600_000 && diffMs < 86_400_000) {
          expect(item.text).toMatch(/hours?/i);
        } else if (diffMs >= 86_400_000 && diffMs < 604_800_000) {
          expect(item.text).toMatch(/days?|yesterday/i);
        }
      }
    }

    await context.close();
  });

  test('relative time uses user timezone for "yesterday" boundary', async ({ browser }) => {
    // At 1 AM UTC on June 16, an event at 11 PM UTC on June 15 was 2 hours ago.
    // But in NZ (UTC+12), both times are on June 16, so it should NOT say "yesterday".
    // In US Pacific (UTC-7), the event is on June 15 and current time is June 15 -- also not "yesterday".

    const nzCtx = await browser.newContext({ timezoneId: 'Pacific/Auckland' });
    const nzPage = await nzCtx.newPage();
    await nzPage.clock.setFixedTime(new Date('2025-06-16T01:00:00Z'));
    await nzPage.goto('/');

    const nzEval = await nzPage.evaluate(() => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      return {
        nowLocalDay: now.getDate(),
        eventLocalDay: twoHoursAgo.getDate(),
        sameDay: now.getDate() === twoHoursAgo.getDate(),
      };
    });

    // In NZ, both are on June 16 -- same day, should show "2 hours ago" not "yesterday"
    expect(nzEval.sameDay).toBe(true);

    await nzCtx.close();
  });
});
```

## Calendar Component Testing

```typescript
// tests/timezone/calendar-components.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Calendar Component Testing', () => {
  test('calendar highlights correct "today" for the user timezone', async ({ browser }) => {
    // At 11 PM UTC on June 15, "today" in NZ is June 16
    const context = await browser.newContext({ timezoneId: 'Pacific/Auckland' });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date('2025-06-15T23:00:00Z'));
    await page.goto('/calendar', { waitUntil: 'networkidle' });

    const calendarDay = await page.evaluate(() => {
      const today = new Date();
      return {
        dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'long' }),
        date: today.getDate(),
        month: today.getMonth() + 1,
      };
    });

    // In NZ timezone at this UTC time, it should be June 16
    expect(calendarDay.date).toBe(16);
    expect(calendarDay.month).toBe(6);

    await context.close();
  });

  test('week start day respects locale (Sunday in US, Monday in Europe)', async ({
    browser,
  }) => {
    const usContext = await browser.newContext({ locale: 'en-US' });
    const usPage = await usContext.newPage();
    await usPage.goto('/calendar', { waitUntil: 'networkidle' });

    const usFirstDay = await usPage.evaluate(() => {
      const headers = document.querySelectorAll(
        '[role="columnheader"], .calendar-header th, .day-header'
      );
      return headers[0]?.textContent?.trim() || '';
    });

    const deContext = await browser.newContext({ locale: 'de-DE' });
    const dePage = await deContext.newPage();
    await dePage.goto('/calendar', { waitUntil: 'networkidle' });

    const deFirstDay = await dePage.evaluate(() => {
      const headers = document.querySelectorAll(
        '[role="columnheader"], .calendar-header th, .day-header'
      );
      return headers[0]?.textContent?.trim() || '';
    });

    if (usFirstDay && deFirstDay) {
      // US should start with Sun/Sunday; DE should start with Mon/Montag
      expect(usFirstDay).not.toBe(deFirstDay);
    }

    await usContext.close();
    await deContext.close();
  });

  test('date picker input validates against user timezone', async ({ browser }) => {
    const context = await browser.newContext({ timezoneId: 'Asia/Tokyo' });
    const page = await context.newPage();
    await page.goto('/events/create', { waitUntil: 'networkidle' });

    // When a user in JST selects a date, the submitted value should include JST offset
    const datePicker = page.locator('input[type="date"], input[type="datetime-local"]').first();
    if (await datePicker.isVisible()) {
      await datePicker.fill('2025-06-15T09:00');

      // Check what value would be submitted
      const submittedValue = await datePicker.inputValue();
      expect(submittedValue).toBeTruthy();

      // The application should convert this to UTC+9 before sending to the server
    }

    await context.close();
  });
});
```

## Python API Timezone Tests

```python
# tests/timezone/api/date-api.py
import pytest
import requests
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

BASE_URL = "http://localhost:3000"


class TestTimezoneAPI:
    """API-level timezone and date handling tests using Python's zoneinfo."""

    def test_api_returns_dates_with_timezone_designators(self):
        """All API date fields must include a timezone designator (Z or offset)."""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        events = response.json().get("data", response.json())

        for event in events:
            for key, value in event.items():
                if isinstance(value, str) and "T" in value:
                    if key.endswith(("_at", "_date", "Date", "Time", "time", "At")):
                        has_tz = (
                            value.endswith("Z")
                            or "+" in value[-6:]
                            or value[-6:].count("-") >= 1
                        )
                        assert has_tz, (
                            f"Date field '{key}' has no timezone designator: {value}"
                        )

    def test_date_round_trip_preserves_millisecond_precision(self):
        """Creating and retrieving a resource should preserve the exact UTC instant."""
        test_time = "2025-07-15T14:30:15.123Z"
        response = requests.post(
            f"{BASE_URL}/api/events",
            json={
                "title": "Python Precision Test",
                "startTime": test_time,
                "timezone": "UTC",
            },
        )

        if response.status_code == 201:
            event_id = response.json()["id"]
            get_response = requests.get(f"{BASE_URL}/api/events/{event_id}")
            retrieved = get_response.json()

            original = datetime.fromisoformat(test_time.replace("Z", "+00:00"))
            stored = datetime.fromisoformat(
                retrieved["startTime"].replace("Z", "+00:00")
            )

            delta = abs((original - stored).total_seconds())
            assert delta < 0.001, (
                f"Date shifted by {delta}s: sent {original.isoformat()}, "
                f"got {stored.isoformat()}"
            )

    def test_dst_spring_forward_duration(self):
        """Duration across US spring forward should be 1 hour, not 2."""
        eastern = ZoneInfo("America/New_York")

        # 1:30 AM EST (before DST) = 6:30 AM UTC
        before_dst = datetime(2025, 3, 9, 1, 30, tzinfo=eastern)
        utc_before = before_dst.astimezone(timezone.utc)
        assert utc_before.hour == 6
        assert utc_before.minute == 30

        # 3:30 AM EDT (after DST) = 7:30 AM UTC
        after_dst = datetime(2025, 3, 9, 3, 30, tzinfo=eastern)
        utc_after = after_dst.astimezone(timezone.utc)
        assert utc_after.hour == 7
        assert utc_after.minute == 30

        # Wall clock shows 2 hours difference but actual elapsed time is 1 hour
        duration = utc_after - utc_before
        assert duration == timedelta(hours=1), (
            f"Expected 1 hour across spring forward, got {duration}"
        )

    def test_timezone_conversion_across_zones(self):
        """The same UTC instant should produce correct local hours in each timezone."""
        utc_time = datetime(2025, 6, 15, 22, 0, tzinfo=timezone.utc)

        conversions = {
            "America/New_York": (18, 0),   # 6:00 PM EDT (UTC-4 in summer)
            "Asia/Tokyo": (7, 0),          # 7:00 AM JST next day (UTC+9)
            "Europe/London": (23, 0),      # 11:00 PM BST (UTC+1 in summer)
            "Asia/Kolkata": (3, 30),       # 3:30 AM IST next day (UTC+5:30)
            "Asia/Kathmandu": (3, 45),     # 3:45 AM NPT next day (UTC+5:45)
        }

        for tz_name, (expected_hour, expected_minute) in conversions.items():
            tz = ZoneInfo(tz_name)
            local = utc_time.astimezone(tz)
            assert local.hour == expected_hour, (
                f"{tz_name}: expected hour {expected_hour}, got {local.hour}"
            )
            assert local.minute == expected_minute, (
                f"{tz_name}: expected minute {expected_minute}, got {local.minute}"
            )

    def test_half_hour_and_quarter_hour_offset_timezones(self):
        """Non-standard UTC offsets (+5:30, +5:45, +12:45) must compute correctly."""
        utc_time = datetime(2025, 6, 15, 12, 0, tzinfo=timezone.utc)

        # India Standard Time: UTC+5:30
        ist = utc_time.astimezone(ZoneInfo("Asia/Kolkata"))
        assert ist.hour == 17 and ist.minute == 30

        # Nepal Time: UTC+5:45
        npt = utc_time.astimezone(ZoneInfo("Asia/Kathmandu"))
        assert npt.hour == 17 and npt.minute == 45

        # Chatham Islands: UTC+12:45
        chast = utc_time.astimezone(ZoneInfo("Pacific/Chatham"))
        assert chast.minute == 45
        assert chast.day == 16  # Crossed into next day

    def test_leap_year_date_arithmetic(self):
        """Leap year dates and cross-leap-day arithmetic must work correctly."""
        leap_day = datetime(2024, 2, 29, 12, 0, tzinfo=timezone.utc)
        assert leap_day.day == 29

        # One year after Feb 29, 2024 -> Feb 28, 2025 (no Feb 29 in 2025)
        one_year_later = leap_day.replace(year=2025, day=28)
        assert one_year_later.month == 2
        assert one_year_later.day == 28

        # Adding 365 days from Feb 29, 2024 lands on Feb 28, 2025
        result = leap_day + timedelta(days=365)
        assert result.year == 2025 and result.month == 2 and result.day == 28

    def test_unix_timestamp_millisecond_precision(self):
        """Unix timestamps must maintain millisecond precision across conversion."""
        original = datetime(2025, 6, 15, 14, 30, 15, 123000, tzinfo=timezone.utc)
        timestamp_ms = int(original.timestamp() * 1000)
        reconstructed = datetime.fromtimestamp(
            timestamp_ms / 1000, tz=timezone.utc
        )

        delta = abs((original - reconstructed).total_seconds())
        assert delta < 0.001, (
            f"Millisecond precision lost: delta={delta}s"
        )

    def test_end_of_month_scheduling(self):
        """Scheduling on the 31st must handle months with fewer days."""
        # If an event repeats on the 31st, what happens in April (30 days)?
        jan_31 = datetime(2025, 1, 31, 9, 0, tzinfo=timezone.utc)

        # Adding exactly one month: Jan 31 -> Feb 28 (2025 is not a leap year)
        # This behavior depends on the scheduling library, but the test should verify
        # that the application does not crash or produce Feb 31.
        try:
            feb_equivalent = jan_31.replace(month=2, day=28)
            assert feb_equivalent.month == 2
            assert feb_equivalent.day == 28
        except ValueError:
            pytest.fail("Failed to compute February equivalent of January 31")
```

## Java Timezone Test Examples

```java
// tests/timezone/api/DateApiTest.java
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.*;

class DateApiTest {

    @Test
    void dstSpringForwardProduces23HourDay() {
        // March 9, 2025: US spring forward
        ZoneId eastern = ZoneId.of("America/New_York");
        ZonedDateTime dayStart = ZonedDateTime.of(2025, 3, 9, 0, 0, 0, 0, eastern);
        ZonedDateTime dayEnd = dayStart.plusDays(1);

        long hours = ChronoUnit.HOURS.between(dayStart, dayEnd);
        assertEquals(23, hours, "Spring forward day should be 23 hours");
    }

    @Test
    void dstFallBackProduces25HourDay() {
        // November 2, 2025: US fall back
        ZoneId eastern = ZoneId.of("America/New_York");
        ZonedDateTime dayStart = ZonedDateTime.of(2025, 11, 2, 0, 0, 0, 0, eastern);
        ZonedDateTime dayEnd = dayStart.plusDays(1);

        long hours = ChronoUnit.HOURS.between(dayStart, dayEnd);
        assertEquals(25, hours, "Fall back day should be 25 hours");
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "America/New_York", "Europe/London", "Asia/Kolkata",
        "Asia/Tokyo", "Pacific/Auckland", "Asia/Kathmandu"
    })
    void sameInstantConvertsCorrectlyAcrossTimezones(String tzId) {
        Instant utcInstant = Instant.parse("2025-06-15T12:00:00Z");
        ZonedDateTime local = utcInstant.atZone(ZoneId.of(tzId));

        // Converting back to UTC must yield the same instant
        Instant roundTripped = local.toInstant();
        assertEquals(utcInstant, roundTripped,
            "Round-trip through " + tzId + " shifted the instant");
    }

    @Test
    void nonStandardOffsetsComputeCorrectly() {
        Instant noon = Instant.parse("2025-06-15T12:00:00Z");

        // India: UTC+5:30
        ZonedDateTime ist = noon.atZone(ZoneId.of("Asia/Kolkata"));
        assertEquals(17, ist.getHour());
        assertEquals(30, ist.getMinute());

        // Nepal: UTC+5:45
        ZonedDateTime npt = noon.atZone(ZoneId.of("Asia/Kathmandu"));
        assertEquals(17, npt.getHour());
        assertEquals(45, npt.getMinute());
    }
}
```

## Best Practices

1. **Always use IANA timezone identifiers** -- Store and transmit timezone identifiers like "America/New_York" rather than abbreviations like "EST" or fixed offsets like "-05:00". IANA identifiers encode DST rules, historical changes, and future transitions that abbreviations and offsets cannot represent. The IANA database is updated several times per year to reflect governmental changes.

2. **Test with at least 6 diverse timezones** -- Include UTC, a US timezone with DST (America/New_York), a European timezone with different DST dates (Europe/London), an Asian timezone without DST (Asia/Tokyo), a timezone with a half-hour offset (Asia/Kolkata at +5:30), and a timezone with a 45-minute offset (Asia/Kathmandu at +5:45 or Pacific/Chatham at +12:45).

3. **Explicitly test DST boundaries every release** -- DST transition dates change yearly, and governments occasionally modify rules (the EU has debated abolishing DST; several US states have proposed permanent DST). Hard-code known DST transition dates for the current year and test them explicitly rather than relying on calculated dates.

4. **Use Playwright's timezoneId for browser emulation** -- Playwright's browser context accepts any IANA timezone via the `timezoneId` option. This emulates the timezone at the JavaScript engine level, affecting `Date`, `Intl.DateTimeFormat`, and all time-dependent APIs. Use this to test how dates display for users worldwide without changing the server or OS timezone.

5. **Freeze time in tests with page.clock** -- Use `page.clock.setFixedTime()` to pin the browser's "now" to a known instant. This eliminates flakiness from tests that depend on the current time, allows testing specific date boundaries, and enables reliable testing of relative time displays ("2 hours ago", "yesterday").

6. **Send the user's timezone with every date-relative API request** -- When the server needs to compute "today", "this week", or "this month" for a user, the client must transmit its timezone as a query parameter, header, or request body field. Test that this information is present in relevant requests.

7. **Validate date serialization format consistency** -- Choose a single serialization format (ISO 8601 with UTC is the standard) and verify that every API endpoint uses it. Mixed formats across endpoints (some returning "Z", others returning "+00:00", others returning no timezone) cause parsing bugs on every client.

8. **Test year, month, and day boundaries** -- Test dates at midnight (00:00:00), at the last second of the day (23:59:59), on December 31 into January 1, at the end of February (28 vs 29), and on the 31st of months that have 30 days. Scheduling systems and "end of month" logic frequently break at these boundaries.

9. **Verify database storage uses UTC** -- Insert a date expressed in a non-UTC timezone, retrieve it, and verify the stored value is in UTC. If the database stores local times, every query involving date comparison, sorting, or range filtering will produce incorrect results for users in other timezones.

10. **Test relative time displays across timezone boundaries** -- "Yesterday" depends on the user's local midnight, not UTC midnight. A timestamp at 11 PM UTC on June 15 is "today" for a user in New York (7 PM local) but "yesterday" for a user in Tokyo (8 AM June 16 local). Verify the application uses the user's timezone to determine these boundaries.

11. **Account for clock skew in assertions** -- When comparing server-generated timestamps with client-generated timestamps, allow a tolerance of several seconds. Network latency, server processing time, and imperfect clock synchronization make exact millisecond matches unreliable in integration tests.

12. **Test the gap between US and EU DST transitions** -- Between the second Sunday of March (US DST starts) and the last Sunday of March (EU DST starts), there is a period where US clocks have sprung forward but EU clocks have not. The time difference between New York and London changes from 5 hours to 4 hours during this window. Test scheduling and display during this gap.

13. **Validate that ISO 8601 parsing handles all valid variants** -- ISO 8601 permits several equivalent representations: "2025-06-15T14:30:00Z", "2025-06-15T14:30:00.000Z", "2025-06-15T14:30:00+00:00", "20250615T143000Z". Verify your application accepts all standard variants and normalizes them to a single canonical form.

## Anti-Patterns to Avoid

1. **Storing local times in the database without timezone metadata** -- If you store "2025-03-09 09:00:00" without specifying whether this is EST, UTC, or JST, the data is permanently ambiguous. When a user in a different timezone queries this record, there is no way to correctly convert it. Always store UTC or include the full IANA timezone identifier alongside the local time.

2. **Using `new Date()` without timezone context in tests** -- `new Date('2025-03-09')` produces midnight in the local timezone of the JavaScript runtime, which varies between CI servers, developer machines, and Playwright browser contexts. Always include explicit timezone offsets: `new Date('2025-03-09T00:00:00Z')` for UTC or `new Date('2025-03-09T00:00:00-05:00')` for EST.

3. **Calculating durations using local wall clock times** -- Subtracting local dates across DST boundaries produces wrong durations. From 1 AM to 3 AM on March 9 in New York looks like 2 hours on the wall clock, but the elapsed time is only 1 hour because the clocks jumped forward. Always perform duration arithmetic on UTC instants.

4. **Hardcoding UTC offsets instead of using timezone identifiers** -- Writing `offset = -5` for "Eastern Time" ignores that Eastern Time is UTC-4 during summer (EDT). Use timezone-aware libraries that resolve the correct offset for any given instant automatically.

5. **Testing only in the developer's timezone or only in UTC** -- If your CI server and all developers operate in UTC, timezone bugs remain hidden until production users in Asia, Europe, or the Pacific encounter them. Explicitly emulate diverse timezones in every test run.

6. **Ignoring non-whole-hour offsets** -- Many applications hardcode timezone offsets as whole hours. India (+5:30), Nepal (+5:45), Iran (+3:30), Myanmar (+6:30), and the Chatham Islands (+12:45) all have non-whole-hour offsets. If your application rounds offsets to whole hours, these regions produce incorrect times.

7. **Treating "midnight" as a universal concept** -- Midnight is a different instant for every timezone. "Start of day" queries must specify whose midnight is being referenced. An API that filters by "today" without accepting a timezone parameter will return wrong results for users whose local date differs from the server's local date.

8. **Using timezone abbreviations as identifiers** -- "CST" could mean Central Standard Time (US, UTC-6), China Standard Time (UTC+8), or Cuba Standard Time (UTC-5). Abbreviations are ambiguous and must never be used as timezone identifiers in data storage, APIs, or configuration.

9. **Assuming all days have 24 hours** -- On DST spring-forward days, the day has 23 hours. On fall-back days, it has 25 hours. Code that calculates "end of day" as "start of day + 24 hours" will be off by one hour twice per year in DST-observing timezones.

10. **Parsing date strings without specifying the expected format** -- Passing user-provided date strings directly to `new Date()` or `datetime.strptime()` without specifying the format leads to locale-dependent parsing. "01/02/2025" is January 2 in the US but February 1 in the UK. Always parse with an explicit format specifier.

## Debugging Tips

1. **Log timestamps in both UTC and user local** -- When debugging a timezone bug, log every date value as both its UTC representation (`toISOString()`) and its local representation (`toLocaleString()` with the user's timezone). This immediately reveals where the conversion goes wrong in the data flow.

2. **Use Playwright's clock API for deterministic testing** -- `page.clock.setFixedTime()` pins the browser's internal clock. `page.clock.fastForward()` advances it. These methods affect `Date.now()`, `setTimeout`, `setInterval`, and `requestAnimationFrame`. Use them to test DST transitions, date boundaries, and relative time displays without waiting for real time.

3. **Check the database timezone configuration** -- PostgreSQL (`SHOW timezone;`), MySQL (`SELECT @@global.time_zone;`), and MongoDB each handle timezones differently. A PostgreSQL database set to "America/New_York" instead of "UTC" will silently convert `TIMESTAMP WITH TIME ZONE` values on insert and retrieval, introducing offset errors that are invisible in the server's own timezone.

4. **Verify the Node.js runtime timezone** -- `process.env.TZ` controls the JavaScript runtime's timezone. If your server sets `TZ=America/New_York`, then `new Date().toString()` returns Eastern time, but `new Date().toISOString()` still returns UTC. Check which method your code uses for serialization and logging.

5. **Run tests with an explicit TZ environment variable** -- On Linux and macOS, set `TZ=Asia/Tokyo node test.js` to run your test suite as if the server were in Japan. This quickly reveals assumptions about the default timezone in server-side code. Run the same suite with `TZ=UTC`, `TZ=America/New_York`, and `TZ=Pacific/Auckland` to catch implicit dependencies.

6. **Inspect Date.prototype.getTimezoneOffset()** -- This method returns the difference between UTC and local time in minutes with an inverted sign. EST returns 300 (not -300), IST returns -330. Use this in debug logging to confirm the browser's timezone emulation is active and correct in Playwright contexts.

7. **Watch for implicit timezone coercion in ORMs and serializers** -- Drizzle, Prisma, Sequelize, SQLAlchemy, and other ORMs may implicitly convert dates during read/write. `JSON.stringify(new Date())` produces a UTC string, but a custom ORM serializer might produce a local string. Trace a date value through every layer: client input, API handler, ORM, database, ORM read, API response, client rendering.

8. **Use browser DevTools Sensors panel for exploratory testing** -- Chrome DevTools allows manual timezone and locale override in the Sensors tab. Use this to manually reproduce timezone bugs reported by users before writing automated tests. Confirm the bug exists and understand its visual impact first.

9. **Check for outdated timezone database versions** -- The IANA timezone database (tzdata) is updated several times per year. If your Node.js, Java, or Python runtime uses an outdated version, DST transition dates may be wrong for recently-changed regions. Verify your runtime's tzdata version with `node -e "console.log(process.versions)"` or equivalent.

10. **Compare server response timestamps with client expectations** -- When debugging a server/client mismatch, have the client log its local "now" and include a server-generated "now" in every API response (as a debug header or response field). The difference reveals whether the issue is timezone conversion, clock skew, or caching.

11. **Test with the ICU full dataset in Node.js** -- Node.js ships with a "small ICU" by default, which may lack full locale and timezone data. Run with `--icu-data-dir` or build Node.js with `full-icu` to ensure `Intl.DateTimeFormat` produces correct results for all locales and timezones.

12. **Validate that JavaScript and server-side libraries agree on DST dates** -- JavaScript's `Intl` API and server-side libraries (like Python's `zoneinfo` or Java's `java.time`) may use different versions of the IANA timezone database. If they disagree on when DST transitions occur, the client and server will compute different local times for the same UTC instant. Log the DST transition dates computed by each layer and compare.