---
name: Timezone Bug Hunter
description: Detect timezone-related bugs including incorrect date conversions, DST edge cases, locale formatting issues, and UTC offset miscalculations across application layers
version: 1.0.0
author: Pramod
license: MIT
tags: [timezone, date-bugs, dst, utc, date-formatting, locale, datetime-testing, timezone-conversion]
testingTypes: [e2e, integration]
frameworks: [playwright]
languages: [typescript, javascript, python, java]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Timezone Bug Hunter Skill

You are an expert QA engineer specializing in timezone and date/time testing. When the user asks you to write, review, or debug timezone-related tests, follow these detailed instructions to systematically detect incorrect date conversions, DST boundary failures, locale formatting bugs, UTC offset miscalculations, and server/client timezone mismatches that corrupt temporal data across application layers.

## Core Principles

1. **Store in UTC, display in local** -- All dates stored in databases and transmitted through APIs must be in UTC. Conversion to the user's local timezone should happen exclusively in the presentation layer. Any deviation from this principle is a bug that will manifest differently for every user.
2. **DST transitions are not edge cases** -- Daylight Saving Time changes affect billions of users twice per year. The "spring forward" hour that does not exist and the "fall back" hour that occurs twice are predictable events that must be handled correctly in every date calculation, scheduling system, and duration computation.
3. **Timezone is not an offset** -- A timezone is a set of rules that define when offsets change (e.g., "America/New_York" transitions between UTC-5 and UTC-4). An offset is a fixed number. Storing offsets instead of timezone identifiers loses the ability to correctly handle future DST transitions and historical timezone changes.
4. **Date serialization must be unambiguous** -- A date string like "2025-03-09 02:30" is ambiguous without timezone information. It could represent different instants depending on interpretation. All serialized dates must include explicit timezone designators (Z for UTC, or a full offset like +05:30).
5. **Client and server clocks diverge** -- Never assume that the client's system clock is accurate or synchronized with the server. User devices may have incorrect timezone settings, drifted clocks, or manually overridden dates. Tests must account for clock skew between layers.
6. **Locale affects more than language** -- The same date is displayed as "3/9/2025" in the US, "9/3/2025" in the UK, and "2025/3/9" in Japan. Date formatting must respect the user's locale, not the developer's locale or the server's locale.
7. **Calendar boundaries vary by timezone** -- "Today" is not the same date everywhere. At 11 PM UTC, it is already tomorrow in Asia and still today in the Americas. Any feature that references "today," "this week," or "this month" must clarify whose timezone defines the boundary.

## Project Structure

```
tests/
  timezone/
    timezone-emulation.spec.ts        # Playwright timezone emulation
    dst-boundary.spec.ts              # DST transition edge cases
    date-serialization.spec.ts        # Serialization/deserialization tests
    cross-timezone-scheduling.spec.ts # Scheduling across timezones
    date-display.spec.ts              # Date display formatting
    server-client-mismatch.spec.ts    # Server/client timezone mismatch
    calendar-components.spec.ts       # Calendar widget testing
    relative-time.spec.ts             # Relative time display testing
    api/
      date-api.spec.ts               # API date handling tests
      date-api.py                     # Python API date tests
    fixtures/
      timezone-helpers.ts             # Timezone emulation utilities
      date-factory.ts                 # Test date generation
      dst-dates.ts                    # Known DST transition dates
  playwright.config.ts
```

## Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/timezone',
  fullyParallel: false, // Timezone tests may share state; run sequentially
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL: process.env.TARGET_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    timezoneId: 'UTC', // Default to UTC; individual tests override
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
  ],
});
```

```typescript
// tests/timezone/fixtures/timezone-helpers.ts
export interface TimezoneTestCase {
  timezone: string;
  utcOffset: string;       // e.g., "+05:30"
  abbreviation: string;    // e.g., "IST"
  hasDST: boolean;
  dstStart?: string;       // ISO date when DST starts
  dstEnd?: string;         // ISO date when DST ends
}

export const TIMEZONE_TEST_CASES: TimezoneTestCase[] = [
  {
    timezone: 'America/New_York',
    utcOffset: '-05:00',
    abbreviation: 'EST',
    hasDST: true,
    dstStart: '2025-03-09T02:00:00',
    dstEnd: '2025-11-02T02:00:00',
  },
  {
    timezone: 'America/Los_Angeles',
    utcOffset: '-08:00',
    abbreviation: 'PST',
    hasDST: true,
    dstStart: '2025-03-09T02:00:00',
    dstEnd: '2025-11-02T02:00:00',
  },
  {
    timezone: 'Europe/London',
    utcOffset: '+00:00',
    abbreviation: 'GMT',
    hasDST: true,
    dstStart: '2025-03-30T01:00:00',
    dstEnd: '2025-10-26T02:00:00',
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
    abbreviation: 'NZST',
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
    abbreviation: 'CHAST',
    hasDST: true,
  },
];

export const DST_EDGE_DATES = {
  // US DST 2025: Spring forward March 9, 2:00 AM -> 3:00 AM
  usSpringForward: {
    before: '2025-03-09T01:59:00-05:00',
    during: '2025-03-09T02:30:00', // This time does not exist in EST
    after: '2025-03-09T03:01:00-04:00',
    utcDuring: '2025-03-09T07:30:00Z',
  },
  // US DST 2025: Fall back November 2, 2:00 AM -> 1:00 AM
  usFallBack: {
    firstOccurrence: '2025-11-02T01:30:00-04:00', // EDT
    secondOccurrence: '2025-11-02T01:30:00-05:00', // EST
    utcFirst: '2025-11-02T05:30:00Z',
    utcSecond: '2025-11-02T06:30:00Z',
  },
  // EU DST 2025: Spring forward March 30, 1:00 AM -> 2:00 AM (UTC)
  euSpringForward: {
    before: '2025-03-30T00:59:00+00:00',
    after: '2025-03-30T02:01:00+01:00',
  },
};
```

```typescript
// tests/timezone/fixtures/date-factory.ts
export function createTestDates() {
  return {
    // Standard dates
    newYear2025: '2025-01-01T00:00:00Z',
    midYear2025: '2025-07-01T12:00:00Z',

    // Near midnight (tests date boundary)
    justBeforeMidnightUTC: '2025-06-15T23:59:59Z',
    justAfterMidnightUTC: '2025-06-16T00:00:01Z',

    // Near DST transition
    beforeUsDst: '2025-03-09T06:59:00Z', // 1:59 AM EST
    afterUsDst: '2025-03-09T07:01:00Z',  // 3:01 AM EDT

    // Leap year dates
    leapDay2024: '2024-02-29T12:00:00Z',
    afterLeapDay2024: '2024-03-01T00:00:00Z',

    // Year boundary
    yearEnd2024: '2024-12-31T23:59:59Z',
    yearStart2025: '2025-01-01T00:00:00Z',

    // Dates that change day depending on timezone
    dateLineTest: '2025-06-15T22:00:00Z', // June 16 in NZ, still June 15 in US
  };
}
```

## Timezone Emulation in Playwright

```typescript
// tests/timezone/timezone-emulation.spec.ts
import { test, expect, Browser } from '@playwright/test';
import { TIMEZONE_TEST_CASES } from './fixtures/timezone-helpers';
import { createTestDates } from './fixtures/date-factory';

async function createPageInTimezone(browser: Browser, timezone: string) {
  const context = await browser.newContext({ timezoneId: timezone });
  const page = await context.newPage();
  return { page, context };
}

test.describe('Timezone Emulation', () => {
  const testDates = createTestDates();

  for (const tz of TIMEZONE_TEST_CASES) {
    test(`dates display correctly in ${tz.timezone}`, async ({ browser }) => {
      const { page, context } = await createPageInTimezone(browser, tz.timezone);

      await page.goto('/', { waitUntil: 'networkidle' });

      // Verify the browser is emulating the correct timezone
      const browserTimezone = await page.evaluate(() => {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      });
      expect(browserTimezone).toBe(tz.timezone);

      // Verify a known UTC date displays with the correct local offset
      const displayedDate = await page.evaluate((utcDate) => {
        const date = new Date(utcDate);
        return {
          localString: date.toLocaleString(),
          isoString: date.toISOString(),
          timezoneOffset: date.getTimezoneOffset(),
          localDate: date.toLocaleDateString(),
          localTime: date.toLocaleTimeString(),
        };
      }, testDates.midYear2025);

      // The ISO string should always be UTC
      expect(displayedDate.isoString).toContain('Z');

      // The timezone offset should match expected (in minutes, inverted)
      const expectedOffsetMinutes = parseOffset(tz.utcOffset);
      // Note: getTimezoneOffset returns minutes with inverted sign
      // For DST timezones, the offset might differ depending on the date tested
      if (!tz.hasDST) {
        expect(displayedDate.timezoneOffset).toBe(-expectedOffsetMinutes);
      }

      await context.close();
    });
  }

  test('same UTC instant shows different local dates near date line', async ({ browser }) => {
    const utcDate = testDates.dateLineTest; // 2025-06-15T22:00:00Z

    // In New Zealand (UTC+12), this is already June 16
    const { page: nzPage, context: nzCtx } = await createPageInTimezone(
      browser,
      'Pacific/Auckland'
    );
    await nzPage.goto('/');
    const nzDate = await nzPage.evaluate((d) => {
      return new Date(d).toLocaleDateString('en-NZ');
    }, utcDate);

    // In US Pacific (UTC-7 or UTC-8), this is still June 15
    const { page: usPage, context: usCtx } = await createPageInTimezone(
      browser,
      'America/Los_Angeles'
    );
    await usPage.goto('/');
    const usDate = await usPage.evaluate((d) => {
      return new Date(d).toLocaleDateString('en-US');
    }, utcDate);

    // The local dates should be different
    expect(nzDate).toContain('16');
    expect(usDate).toContain('15');

    await nzCtx.close();
    await usCtx.close();
  });
});

function parseOffset(offset: string): number {
  const match = offset.match(/([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === '+' ? 1 : -1;
  return sign * (parseInt(match[2]) * 60 + parseInt(match[3]));
}
```

## DST Boundary Testing

```typescript
// tests/timezone/dst-boundary.spec.ts
import { test, expect } from '@playwright/test';
import { DST_EDGE_DATES } from './fixtures/timezone-helpers';

test.describe('DST Boundary Testing', () => {
  test('spring forward: the non-existent hour is handled correctly', async ({ browser }) => {
    const context = await browser.newContext({
      timezoneId: 'America/New_York',
    });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      // 2:30 AM on March 9, 2025 does not exist in America/New_York
      // The clock jumps from 2:00 AM to 3:00 AM
      const nonExistentTime = new Date('2025-03-09T02:30:00');
      const beforeDst = new Date('2025-03-09T01:30:00');
      const afterDst = new Date('2025-03-09T03:30:00');

      return {
        nonExistent: {
          toString: nonExistentTime.toString(),
          hours: nonExistentTime.getHours(),
          utcHours: nonExistentTime.getUTCHours(),
        },
        before: {
          toString: beforeDst.toString(),
          offset: beforeDst.getTimezoneOffset(),
        },
        after: {
          toString: afterDst.toString(),
          offset: afterDst.getTimezoneOffset(),
        },
        offsetChanged:
          beforeDst.getTimezoneOffset() !== afterDst.getTimezoneOffset(),
      };
    });

    // Verify the offset actually changed (EST -> EDT)
    expect(result.offsetChanged, 'DST transition should change the UTC offset').toBe(true);

    // Before DST: EST (UTC-5, offset = 300 minutes)
    expect(result.before.offset).toBe(300);
    // After DST: EDT (UTC-4, offset = 240 minutes)
    expect(result.after.offset).toBe(240);

    await context.close();
  });

  test('fall back: the ambiguous hour is handled correctly', async ({ browser }) => {
    const context = await browser.newContext({
      timezoneId: 'America/New_York',
    });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      // 1:30 AM on November 2, 2025 occurs twice in America/New_York
      // First at 1:30 AM EDT (UTC-4), then again at 1:30 AM EST (UTC-5)
      const firstOccurrence = new Date('2025-11-02T05:30:00Z'); // 1:30 AM EDT
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

    // Both show 1:30 AM local time but have different UTC values
    expect(result.first.localHour).toBe(1);
    expect(result.second.localHour).toBe(1);
    expect(result.first.utc).not.toBe(result.second.utc);

    await context.close();
  });

  test('duration calculations across DST boundary are correct', async ({ browser }) => {
    const context = await browser.newContext({
      timezoneId: 'America/New_York',
    });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      // March 9, 2025: Day is only 23 hours long due to spring forward
      const dayStart = new Date('2025-03-09T05:00:00Z'); // Midnight EST
      const dayEnd = new Date('2025-03-10T04:00:00Z');   // Midnight EDT next day

      const actualHours = (dayEnd.getTime() - dayStart.getTime()) / (1000 * 60 * 60);

      // November 2, 2025: Day is 25 hours long due to fall back
      const fallDayStart = new Date('2025-11-02T04:00:00Z'); // Midnight EDT
      const fallDayEnd = new Date('2025-11-03T05:00:00Z');   // Midnight EST next day

      const fallActualHours =
        (fallDayEnd.getTime() - fallDayStart.getTime()) / (1000 * 60 * 60);

      return {
        springDayHours: actualHours,
        fallDayHours: fallActualHours,
      };
    });

    // Spring forward day: 23 hours
    expect(result.springDayHours).toBe(23);
    // Fall back day: 25 hours
    expect(result.fallDayHours).toBe(25);

    await context.close();
  });

  test('scheduled events crossing DST boundary maintain correct times', async ({
    browser,
    request,
  }) => {
    const context = await browser.newContext({
      timezoneId: 'America/New_York',
    });
    const page = await context.newPage();

    // Create an event that repeats daily at 9:00 AM local time
    // Check that it remains at 9:00 AM even after DST transition
    const response = await request.post('/api/events', {
      data: {
        title: 'Daily Standup',
        startTime: '2025-03-08T09:00:00-05:00', // 9 AM EST (day before DST)
        recurrence: 'daily',
        timezone: 'America/New_York',
      },
    });

    if (response.status() === 201) {
      const event = await response.json();

      // Get the next occurrence (March 9, the DST transition day)
      const nextDayRes = await request.get(
        `/api/events/${event.id}/occurrences?date=2025-03-09`
      );
      if (nextDayRes.ok()) {
        const occurrence = await nextDayRes.json();
        // Should be 9:00 AM EDT (UTC-4), not 10:00 AM or 8:00 AM
        expect(occurrence.localTime).toBe('09:00');
      }
    }

    await context.close();
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
          // Date strings must include timezone designator
          const hasTimezone =
            value.endsWith('Z') ||
            /[+-]\d{2}:\d{2}$/.test(value) ||
            /[+-]\d{4}$/.test(value);

          expect(
            hasTimezone,
            `Date field "${field}" lacks timezone info: "${value}"`
          ).toBe(true);
        }
      }
    }
  });

  test('date round-trip preserves the exact instant', async ({ request }) => {
    const testDate = '2025-06-15T14:30:00.000Z';

    // Create a resource with a specific date
    const createRes = await request.post('/api/events', {
      data: {
        title: 'Round Trip Test',
        startTime: testDate,
        timezone: 'UTC',
      },
    });

    if (createRes.status() === 201) {
      const created = await createRes.json();

      // Retrieve the resource
      const getRes = await request.get(`/api/events/${created.id}`);
      const retrieved = await getRes.json();

      // The stored date should represent the same instant
      const originalMs = new Date(testDate).getTime();
      const retrievedMs = new Date(retrieved.startTime).getTime();

      expect(
        retrievedMs,
        `Date shifted by ${retrievedMs - originalMs}ms during round-trip`
      ).toBe(originalMs);
    }
  });

  test('ISO 8601 formats are accepted consistently', async ({ request }) => {
    const validFormats = [
      '2025-06-15T14:30:00Z',
      '2025-06-15T14:30:00.000Z',
      '2025-06-15T14:30:00+00:00',
      '2025-06-15T14:30:00-05:00',
      '2025-06-15T19:30:00+05:00',
    ];

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
    }
  });

  test('ambiguous date formats are rejected', async ({ request }) => {
    const ambiguousFormats = [
      '2025-06-15',          // No time, no timezone
      '06/15/2025',          // US format, ambiguous
      '15/06/2025',          // EU format, ambiguous
      '2025-06-15 14:30:00', // No timezone designator
      '1718458200',          // Unix timestamp as string (ambiguous seconds vs ms)
    ];

    for (const format of ambiguousFormats) {
      const response = await request.post('/api/events', {
        data: {
          title: `Ambiguous test`,
          startTime: format,
        },
      });

      // Should either reject or handle with explicit timezone assumption
      if (response.ok()) {
        const body = await response.json();
        // If accepted, the stored date must include timezone info
        const stored = body.startTime;
        const hasTimezone =
          stored.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(stored);
        expect(
          hasTimezone,
          `Ambiguous format "${format}" was accepted and stored without timezone: "${stored}"`
        ).toBe(true);
      }
    }
  });
});
```

## Server/Client Timezone Mismatch

```typescript
// tests/timezone/server-client-mismatch.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Server/Client Timezone Mismatch', () => {
  test('"today" filter returns correct results for user timezone', async ({ browser }) => {
    // Test from a timezone where "today" is a different date than UTC
    const context = await browser.newContext({
      timezoneId: 'Pacific/Auckland', // UTC+12
    });
    const page = await context.newPage();

    // Set the clock to a time where NZ date differs from UTC date
    // 11 PM UTC = 11 AM next day in NZ
    await page.clock.setFixedTime(new Date('2025-06-15T23:00:00Z'));

    await page.goto('/dashboard?filter=today', { waitUntil: 'networkidle' });

    const displayedDate = await page.evaluate(() => {
      const now = new Date();
      return {
        localDate: now.toLocaleDateString('en-NZ'),
        utcDate: now.toISOString().split('T')[0],
        localDay: now.getDate(),
        utcDay: now.getUTCDate(),
      };
    });

    // In NZ, it is June 16; in UTC, it is June 15
    expect(displayedDate.localDay).toBe(16);
    expect(displayedDate.utcDay).toBe(15);

    // The "today" filter should show items for June 16 (NZ date), not June 15 (UTC date)
    // This depends on whether the app sends the user's timezone to the server

    await context.close();
  });

  test('server timestamps are converted to user local time in the UI', async ({ browser }) => {
    const testTimezones = [
      { tz: 'America/New_York', expectedOffset: -5 },
      { tz: 'Asia/Tokyo', expectedOffset: 9 },
      { tz: 'Europe/London', expectedOffset: 0 },
    ];

    for (const { tz } of testTimezones) {
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

      // Verify displayed times make sense for the current timezone
      for (const ts of timestamps) {
        const utcDate = new Date(ts.utc);
        expect(utcDate.getTime()).not.toBeNaN();
        // The displayed time should not simply show UTC values
        // (This is a heuristic check; exact validation depends on display format)
      }

      await context.close();
    }
  });

  test('user timezone is sent to the API for date-relative queries', async ({ browser }) => {
    const context = await browser.newContext({
      timezoneId: 'Asia/Kolkata',
    });
    const page = await context.newPage();

    // Monitor API requests for timezone information
    const apiRequests: { url: string; headers: Record<string, string> }[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          headers: request.headers(),
        });
      }
    });

    await page.goto('/dashboard?filter=today', { waitUntil: 'networkidle' });

    // Check if timezone was sent in requests
    const hasTimezone = apiRequests.some(
      (req) =>
        req.url.includes('timezone=') ||
        req.url.includes('tz=') ||
        req.headers['x-timezone'] ||
        req.headers['x-user-timezone']
    );

    if (!hasTimezone) {
      console.warn(
        'WARNING: No timezone information sent in API requests. ' +
        'Date-relative queries (today, this week) may return incorrect results.'
      );
    }
  });
});
```

## Date Display Formatting

```typescript
// tests/timezone/date-display.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Date Display Formatting', () => {
  test('dates respect user locale formatting', async ({ browser }) => {
    const locales = [
      { locale: 'en-US', expectedFormat: /\d{1,2}\/\d{1,2}\/\d{4}/ }, // MM/DD/YYYY
      { locale: 'en-GB', expectedFormat: /\d{1,2}\/\d{1,2}\/\d{4}/ }, // DD/MM/YYYY
      { locale: 'de-DE', expectedFormat: /\d{1,2}\.\d{1,2}\.\d{4}/ }, // DD.MM.YYYY
      { locale: 'ja-JP', expectedFormat: /\d{4}\/\d{1,2}\/\d{1,2}/ }, // YYYY/MM/DD
    ];

    for (const { locale, expectedFormat } of locales) {
      const context = await browser.newContext({ locale });
      const page = await context.newPage();

      await page.goto('/dashboard', { waitUntil: 'networkidle' });

      const dateDisplay = await page.evaluate(() => {
        const dateElements = document.querySelectorAll('time, [data-date]');
        const dates: string[] = [];
        dateElements.forEach((el) => {
          const text = el.textContent?.trim() || '';
          if (text.match(/\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}/)) {
            dates.push(text);
          }
        });
        return dates;
      });

      for (const dateText of dateDisplay) {
        // Date should match the expected format for the locale
        // This is a soft check since apps may override locale formatting
        if (dateText.match(/\d{4}/)) {
          expect(dateText).toBeTruthy();
        }
      }

      await context.close();
    }
  });

  test('relative time displays update correctly', async ({ browser }) => {
    const context = await browser.newContext({
      timezoneId: 'UTC',
    });
    const page = await context.newPage();

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
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();

        // Verify the relative text makes sense
        if (diffMs < 60_000) {
          expect(item.text).toMatch(/just now|seconds?|moment/i);
        } else if (diffMs < 3_600_000) {
          expect(item.text).toMatch(/minutes?/i);
        } else if (diffMs < 86_400_000) {
          expect(item.text).toMatch(/hours?/i);
        }
      }
    }

    await context.close();
  });
});
```

## Calendar Component Testing

```typescript
// tests/timezone/calendar-components.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Calendar Component Testing', () => {
  test('calendar shows correct day of the week for the timezone', async ({ browser }) => {
    // Sunday, June 15, 2025 in UTC is already Monday June 16 in NZST (UTC+12)
    const context = await browser.newContext({
      timezoneId: 'Pacific/Auckland',
    });
    const page = await context.newPage();

    await page.clock.setFixedTime(new Date('2025-06-15T23:00:00Z'));
    await page.goto('/calendar', { waitUntil: 'networkidle' });

    const calendarDay = await page.evaluate(() => {
      const today = new Date();
      return {
        dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'long' }),
        date: today.getDate(),
        month: today.getMonth(),
      };
    });

    // In NZ timezone at this UTC time, it should be Monday June 16
    expect(calendarDay.dayOfWeek).toBe('Monday');
    expect(calendarDay.date).toBe(16);

    await context.close();
  });

  test('week start day respects locale (Monday vs Sunday)', async ({ browser }) => {
    // US locale: week starts on Sunday
    const usContext = await browser.newContext({ locale: 'en-US' });
    const usPage = await usContext.newPage();
    await usPage.goto('/calendar', { waitUntil: 'networkidle' });

    const usFirstDay = await usPage.evaluate(() => {
      const headers = document.querySelectorAll(
        '[role="columnheader"], .calendar-header th, .day-header'
      );
      return headers[0]?.textContent?.trim() || '';
    });

    // German locale: week starts on Monday
    const deContext = await browser.newContext({ locale: 'de-DE' });
    const dePage = await deContext.newPage();
    await dePage.goto('/calendar', { waitUntil: 'networkidle' });

    const deFirstDay = await dePage.evaluate(() => {
      const headers = document.querySelectorAll(
        '[role="columnheader"], .calendar-header th, .day-header'
      );
      return headers[0]?.textContent?.trim() || '';
    });

    await usContext.close();
    await deContext.close();

    // The first column header should differ based on locale
    if (usFirstDay && deFirstDay) {
      // US should start with Sun/Sunday, DE should start with Mon/Montag
      expect(usFirstDay).not.toBe(deFirstDay);
    }
  });
});
```

## Python Timezone Tests

```python
# tests/timezone/api/date-api.py
import pytest
import requests
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

BASE_URL = "http://localhost:3000"


class TestTimezoneAPI:
    """API-level timezone and date handling tests."""

    def test_api_returns_utc_dates(self):
        """All API date fields should be in UTC (ISO 8601 with Z suffix)."""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        events = response.json().get("data", response.json())

        for event in events:
            for key, value in event.items():
                if isinstance(value, str) and "T" in value:
                    if key.endswith(("_at", "_date", "Date", "Time", "time")):
                        assert value.endswith("Z") or "+" in value or "-" in value[-6:], (
                            f"Date field '{key}' has no timezone: {value}"
                        )

    def test_date_round_trip_preserves_instant(self):
        """Creating and retrieving a resource should preserve the exact UTC instant."""
        test_time = "2025-07-15T14:30:00.000Z"
        response = requests.post(
            f"{BASE_URL}/api/events",
            json={
                "title": "Python Round Trip Test",
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

            assert original == stored, (
                f"Date shifted: sent {original.isoformat()}, "
                f"got {stored.isoformat()}"
            )

    def test_dst_transition_dates(self):
        """Events near DST transitions should maintain correct UTC times."""
        # US Spring Forward: 2:00 AM EST -> 3:00 AM EDT on March 9, 2025
        eastern = ZoneInfo("America/New_York")

        # 1:30 AM EST (before DST) = 6:30 AM UTC
        before_dst = datetime(2025, 3, 9, 1, 30, tzinfo=eastern)
        expected_utc = before_dst.astimezone(timezone.utc)

        assert expected_utc.hour == 6
        assert expected_utc.minute == 30

        # 3:30 AM EDT (after DST) = 7:30 AM UTC
        after_dst = datetime(2025, 3, 9, 3, 30, tzinfo=eastern)
        expected_utc_after = after_dst.astimezone(timezone.utc)

        assert expected_utc_after.hour == 7
        assert expected_utc_after.minute == 30

        # Duration between them is 1 hour, not 2
        duration = expected_utc_after - expected_utc
        assert duration == timedelta(hours=1)

    def test_timezone_conversion_across_zones(self):
        """The same instant should produce different local representations."""
        utc_time = datetime(2025, 6, 15, 22, 0, tzinfo=timezone.utc)

        conversions = {
            "America/New_York": 18,  # 6 PM EDT (UTC-4 in summer)
            "Asia/Tokyo": 7,         # 7 AM JST next day (UTC+9)
            "Europe/London": 23,     # 11 PM BST (UTC+1 in summer)
            "Asia/Kolkata": 3,       # 3:30 AM IST next day (UTC+5:30)
        }

        for tz_name, expected_hour in conversions.items():
            tz = ZoneInfo(tz_name)
            local = utc_time.astimezone(tz)
            assert local.hour == expected_hour, (
                f"{tz_name}: expected hour {expected_hour}, got {local.hour}"
            )

    def test_half_hour_offset_timezones(self):
        """Timezones with non-standard offsets (e.g., +05:30, +05:45) must work."""
        utc_time = datetime(2025, 6, 15, 12, 0, tzinfo=timezone.utc)

        # India Standard Time: UTC+5:30
        ist = utc_time.astimezone(ZoneInfo("Asia/Kolkata"))
        assert ist.hour == 17
        assert ist.minute == 30

        # Nepal Time: UTC+5:45
        npt = utc_time.astimezone(ZoneInfo("Asia/Kathmandu"))
        assert npt.hour == 17
        assert npt.minute == 45

        # Chatham Islands: UTC+12:45
        chast = utc_time.astimezone(ZoneInfo("Pacific/Chatham"))
        assert chast.minute == 45

    def test_leap_second_and_leap_year_handling(self):
        """Leap year dates and date arithmetic crossing leap days must work."""
        # Feb 29, 2024 exists (leap year)
        leap_day = datetime(2024, 2, 29, 12, 0, tzinfo=timezone.utc)
        assert leap_day.day == 29

        # One year after Feb 29, 2024 -- should be Feb 28, 2025
        one_year_later = leap_day.replace(year=2025, day=28)
        assert one_year_later.month == 2
        assert one_year_later.day == 28

        # Adding 365 days to Feb 29, 2024 gives Feb 28, 2025
        result = leap_day + timedelta(days=365)
        assert result.year == 2025
        assert result.month == 2
        assert result.day == 28

    def test_unix_timestamp_precision(self):
        """Unix timestamps should maintain millisecond precision."""
        original = datetime(2025, 6, 15, 14, 30, 15, 123000, tzinfo=timezone.utc)
        timestamp_ms = int(original.timestamp() * 1000)
        reconstructed = datetime.fromtimestamp(
            timestamp_ms / 1000, tz=timezone.utc
        )

        assert abs(
            (original - reconstructed).total_seconds()
        ) < 0.001, "Millisecond precision lost in timestamp conversion"
```

## Best Practices

1. **Always use IANA timezone identifiers** -- Store and transmit timezone identifiers like "America/New_York" rather than abbreviations like "EST" or offsets like "-05:00". IANA identifiers encode DST rules, historical changes, and future transitions that abbreviations and offsets cannot represent.

2. **Test with at least 5 diverse timezones** -- Include UTC, a US timezone with DST, a European timezone with different DST rules, an Asian timezone without DST, and a timezone with a non-standard offset (India at +5:30, Nepal at +5:45, or Chatham Islands at +12:45).

3. **Explicitly test DST boundaries every release** -- DST transition dates change and governments occasionally modify DST rules (as the EU has debated abolishing DST). Hard-code known DST transition dates for the current year and test them specifically.

4. **Use Playwright's `timezoneId` for browser emulation** -- Playwright allows you to emulate any IANA timezone in the browser context. Use this to test how dates display to users in different parts of the world without changing the server or OS.

5. **Freeze time in tests** -- Use `page.clock.setFixedTime()` or library equivalents to pin the current time to a known value. This eliminates flakiness from tests that depend on "now" and allows you to test specific date boundary conditions.

6. **Send the user's timezone with API requests** -- When the server needs to calculate "today" or "this week" for a user, the client must send its timezone. Test that this information is included in relevant API requests.

7. **Validate serialization format consistency** -- Decide on a single date serialization format (ISO 8601 with UTC is standard) and verify that every API endpoint uses it consistently. Mixed formats across endpoints cause client-side parsing bugs.

8. **Test year, month, and day boundaries** -- Test dates at midnight, at the end of December 31, at the start of January 1, at the end of February (leap year and non-leap year), and at the last day of months with 30 vs 31 days.

9. **Verify database storage uses UTC** -- Write a date in one timezone, read it back, and verify the stored value is in UTC. If the database stores local times, every query that involves date comparison or sorting will produce incorrect results for users in other timezones.

10. **Test relative time displays** -- "2 hours ago," "yesterday," and "last week" depend on the user's current timezone. Verify that these displays use the user's local timezone, not UTC, to determine boundaries.

11. **Account for clock skew in assertions** -- When comparing timestamps generated by the server with the current client time, allow a tolerance window of a few seconds. Server and client clocks are never perfectly synchronized.

12. **Test with historical dates** -- Timezone rules have changed historically (e.g., Samoa skipped December 30, 2011). If your application handles historical data, test with dates that pre-date current timezone rules.

## Anti-Patterns to Avoid

1. **Storing local times in the database** -- If you store "2025-03-09 09:00:00" without timezone information, you cannot distinguish between 9 AM in New York and 9 AM in Tokyo. This data is permanently ambiguous and cannot be correctly converted.

2. **Using `new Date()` without timezone context in tests** -- `new Date('2025-03-09')` produces different results in different timezones. In a test running in UTC, it produces midnight UTC. In a test running in EST, it produces midnight EST (5 AM UTC). Always use explicit timezone offsets.

3. **Calculating time differences using local dates** -- Subtracting local dates across DST boundaries gives wrong results. March 9 minus March 8 is 23 hours in "spring forward" timezones, not 24. Always perform arithmetic on UTC instants.

4. **Hardcoding UTC offsets** -- Writing `utcOffset = -5` for "Eastern Time" ignores DST. During summer, Eastern Time is UTC-4. Use timezone libraries that handle DST automatically.

5. **Testing only in the developer's timezone** -- If your CI server and all developers are in UTC, timezone bugs remain hidden until users in other timezones encounter them. Explicitly emulate diverse timezones in tests.

6. **Ignoring non-standard offsets** -- Many applications hardcode timezone offsets as whole hours. India (+5:30), Nepal (+5:45), and Chatham Islands (+12:45) break this assumption. Include these timezones in your test matrix.

7. **Treating "midnight" as a universal concept** -- Midnight is a different instant for every timezone. "Start of day" queries must specify whose midnight is being referenced. An API that filters by "today" without accepting a timezone parameter will return wrong results for most users.

## Debugging Tips

1. **Log timestamps in both UTC and local** -- When debugging a timezone bug, log every date value as both its UTC representation and its local representation in the user's timezone. This immediately reveals where the conversion goes wrong.

2. **Use Playwright's clock API** -- `page.clock.setFixedTime()` and `page.clock.fastForward()` allow you to control the browser's internal clock. This is invaluable for testing DST transitions, date boundaries, and relative time displays without waiting for real time to pass.

3. **Check the database timezone setting** -- PostgreSQL, MySQL, and MongoDB each handle timezones differently. Verify your database's `timezone` setting (e.g., `SHOW timezone;` in PostgreSQL). A database set to a local timezone instead of UTC will silently convert dates on insert and retrieval.

4. **Verify the JavaScript runtime timezone** -- In Node.js, `process.env.TZ` controls the runtime's timezone. If your server sets `TZ=America/New_York`, `new Date().toISOString()` still returns UTC, but `new Date().toString()` returns Eastern time. Verify which format your code uses.

5. **Test with `TZ` environment variable** -- On Linux and macOS, set `TZ=Asia/Tokyo node your-test.js` to run your entire Node.js test suite in a different timezone. This quickly reveals assumptions about the default timezone.

6. **Inspect `Date.prototype.getTimezoneOffset()`** -- This returns the difference between UTC and local time in minutes (with inverted sign). For EST it returns 300, for IST it returns -330. Use this in debug logging to confirm the browser's timezone emulation is working.

7. **Watch for implicit timezone coercion** -- Some ORMs and serializers implicitly convert dates. For example, `JSON.stringify(new Date())` produces a UTC string, but a custom serializer might produce a local string. Trace dates through every layer of serialization.

8. **Use browser DevTools to override timezone** -- Chrome DevTools Sensors panel allows manual timezone override. Use this for exploratory testing before writing automated tests. It confirms the bug exists before you invest time in test automation.

9. **Check for timezone database updates** -- The IANA timezone database is updated several times per year. If your application or test environment uses an outdated database, DST transition dates may be wrong. Verify your runtime's tzdata version.

10. **Compare server and client timestamps side by side** -- When debugging a server/client mismatch, have the client log its "now" and include a server-generated "now" in the API response. The difference reveals whether the issue is timezone conversion or clock skew.