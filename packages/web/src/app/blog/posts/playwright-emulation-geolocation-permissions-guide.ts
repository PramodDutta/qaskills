import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Geolocation and Permissions Emulation: Complete Guide',
  description: 'Emulate geolocation, permissions, locale, timezone, and color scheme in Playwright. Production patterns for camera, microphone, notifications, and clipboard.',
  date: '2026-05-06',
  category: 'Guide',
  content: `
# Playwright Geolocation and Permissions Emulation: Complete Guide

Real users grant location access, allow notifications, switch between dark and light mode, travel across time zones, and expect localized currency. Your tests should exercise every one of those code paths without you launching a real device in Mumbai. Playwright's emulation primitives, scoped at the browser context level, give you control over geolocation, permissions, locale, timezone, color scheme, reduced motion, and contrast. This guide covers every primitive with TypeScript examples that you can lift into your suite.

For other parts of mobile and device emulation, see the [Playwright Mobile Emulation Devices Reference](/blog/playwright-mobile-emulation-devices-reference). The [playwright-e2e skill](/skills/playwright-e2e) bakes these patterns into AI-generated tests.

## Setting geolocation

Geolocation is a context-level option. Set it via \`test.use\`, in \`playwright.config.ts\`, or dynamically per test.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.use({
  geolocation: { latitude: 19.076, longitude: 72.8777 },
  permissions: ['geolocation'],
});

test('shows nearby stores for Mumbai', async ({ page }) => {
  await page.goto('/locate');
  await page.getByRole('button', { name: 'Use my location' }).click();
  await expect(page.getByRole('list', { name: 'Stores' })).toContainText('Mumbai');
});
\`\`\`

The permissions array is required. Without it, the browser prompts and the test stalls. Playwright auto-accepts only permissions you list.

## Changing location mid-test

\`context.setGeolocation\` lets you simulate movement.

\`\`\`typescript
test('updates results as user moves', async ({ context, page }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 19.076, longitude: 72.8777 });
  await page.goto('/locate');
  await page.getByRole('button', { name: 'Use my location' }).click();
  await expect(page.getByText('Mumbai')).toBeVisible();

  await context.setGeolocation({ latitude: 28.6139, longitude: 77.2090 });
  await page.getByRole('button', { name: 'Refresh location' }).click();
  await expect(page.getByText('Delhi')).toBeVisible();
});
\`\`\`

\`grantPermissions\` is the imperative form of the \`permissions\` option, useful when you want to grant mid-test.

## Permission reference

Every permission Playwright recognizes:

| Permission | When the page might prompt |
|---|---|
| \`geolocation\` | \`navigator.geolocation.getCurrentPosition\` |
| \`notifications\` | \`Notification.requestPermission()\` |
| \`push\` | Push API |
| \`camera\` | getUserMedia({ video }) |
| \`microphone\` | getUserMedia({ audio }) |
| \`background-sync\` | Background Sync API |
| \`ambient-light-sensor\` | Ambient Light Sensor API |
| \`accelerometer\` | Accelerometer API |
| \`gyroscope\` | Gyroscope API |
| \`magnetometer\` | Magnetometer API |
| \`accessibility-events\` | accessibility-events API |
| \`clipboard-read\` | \`navigator.clipboard.readText\` |
| \`clipboard-write\` | \`navigator.clipboard.writeText\` |
| \`payment-handler\` | Payment Handler API |
| \`storage-access\` | Storage Access API |
| \`midi\` | Web MIDI |
| \`midi-sysex\` | Web MIDI sysex |

Grant a list to a context to bypass every prompt that would otherwise block the test.

\`\`\`typescript
await context.grantPermissions([
  'geolocation',
  'notifications',
  'clipboard-read',
  'clipboard-write',
]);
\`\`\`

To revoke permissions:

\`\`\`typescript
await context.clearPermissions();
\`\`\`

## Locale

The locale determines \`navigator.language\`, the \`Accept-Language\` header, and the default formats for numbers, currencies, and dates.

\`\`\`typescript
test.use({ locale: 'en-IN' });

test('formats price in Indian rupees', async ({ page }) => {
  await page.goto('/product/keyboard');
  await expect(page.getByText(/₹\\s?\\d/)).toBeVisible();
});
\`\`\`

Locale strings follow BCP 47: \`en\`, \`en-US\`, \`fr-CA\`, \`zh-Hans-CN\`, \`pt-BR\`.

## Timezone

\`timezoneId\` overrides the timezone the browser reports.

\`\`\`typescript
test.use({ timezoneId: 'Asia/Kolkata' });

test('shows local time', async ({ page }) => {
  await page.goto('/clock');
  await expect(page.getByText(/IST/)).toBeVisible();
});
\`\`\`

Use any IANA zone: \`UTC\`, \`America/Los_Angeles\`, \`Europe/Berlin\`, \`Australia/Sydney\`. The full list is in the IANA tz database.

## Combining locale and timezone

For internationalization tests, set both.

\`\`\`typescript
const locales = [
  { name: 'India', locale: 'en-IN', timezoneId: 'Asia/Kolkata' },
  { name: 'Japan', locale: 'ja-JP', timezoneId: 'Asia/Tokyo' },
  { name: 'Brazil', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' },
];

for (const { name, locale, timezoneId } of locales) {
  test.describe(name, () => {
    test.use({ locale, timezoneId });
    test('homepage renders in local language', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  });
}
\`\`\`

## Color scheme

Emulate dark mode and light mode by setting \`colorScheme\`.

\`\`\`typescript
test.use({ colorScheme: 'dark' });

test('logo flips to white in dark mode', async ({ page }) => {
  await page.goto('/');
  const logo = page.getByRole('img', { name: 'QASkills logo' });
  await expect(logo).toHaveAttribute('src', /logo-white/);
});
\`\`\`

Options: \`light\`, \`dark\`, or \`no-preference\`. The setting drives \`window.matchMedia('(prefers-color-scheme: dark)')\`.

## Reduced motion

Some users prefer reduced motion. Pages should honor \`prefers-reduced-motion: reduce\` by disabling animations.

\`\`\`typescript
test.use({ reducedMotion: 'reduce' });

test('does not animate hero on reduced motion preference', async ({ page }) => {
  await page.goto('/');
  const transform = await page
    .getByRole('img', { name: 'Hero illustration' })
    .evaluate((el) => getComputedStyle(el).transform);
  expect(transform).toBe('none');
});
\`\`\`

Reduced motion also stabilizes snapshot tests by removing animation timing variance.

## Forced colors

Windows High Contrast Mode triggers \`forced-colors: active\`. Emulate it with \`forcedColors\`.

\`\`\`typescript
test.use({ forcedColors: 'active' });

test('respects user color overrides', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});
\`\`\`

Options: \`active\`, \`none\`.

## Clipboard

Read and write clipboard contents in tests by granting the right permissions.

\`\`\`typescript
test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test('copies share URL to clipboard', async ({ page }) => {
  await page.goto('/post/1');
  await page.getByRole('button', { name: 'Copy link' }).click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('/post/1');
});
\`\`\`

Note that some browsers require user activation before clipboard access; the click satisfies that requirement.

## Camera and microphone (fake media)

Granting \`camera\` and \`microphone\` permissions does not provide actual streams. Use Chromium launch flags to inject fake media.

\`\`\`typescript
// playwright.config.ts
projects: [
  {
    name: 'chromium-fake-media',
    use: {
      ...devices['Desktop Chrome'],
      launchOptions: {
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
        ],
      },
      permissions: ['camera', 'microphone'],
    },
  },
],
\`\`\`

For specific test patterns, supply a file with \`--use-file-for-fake-video-capture=./fixtures/test.y4m\`.

## Notification testing

\`\`\`typescript
test.use({ permissions: ['notifications'] });

test('shows notification on new message', async ({ page }) => {
  let notification: { title?: string; body?: string } | null = null;
  await page.exposeFunction('captureNotification', (n: typeof notification) => {
    notification = n;
  });
  await page.addInitScript(() => {
    const RealNotification = window.Notification;
    // @ts-ignore
    window.Notification = class extends RealNotification {
      constructor(title: string, options?: NotificationOptions) {
        super(title, options);
        // @ts-ignore
        window.captureNotification({ title, body: options?.body });
      }
      static permission = 'granted';
      static requestPermission = () => Promise.resolve('granted');
    };
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Trigger notification' }).click();
  await page.waitForFunction(() => true); // hand off
  expect(notification).toMatchObject({ title: 'New message' });
});
\`\`\`

The override pattern intercepts \`new Notification(...)\` calls without granting real OS-level notification access.

## Locale-aware formatting in assertions

When asserting on currency or dates, use regex with the locale's expected pattern.

\`\`\`typescript
const indianRupee = /₹\\s?\\d{1,3}(,\\d{3})*(\\.\\d{2})?/;
const usDollar = /\\$\\d{1,3}(,\\d{3})*(\\.\\d{2})?/;

test('product price uses locale currency', async ({ page, locale }) => {
  await page.goto('/product/keyboard');
  const expected = locale === 'en-IN' ? indianRupee : usDollar;
  await expect(page.getByText(expected)).toBeVisible();
});
\`\`\`

## Common pitfalls

**Pitfall 1: Granting permissions but not setting geolocation.** The page asks for location, gets it, and uses \`{ lat: 0, lng: 0 }\` (Null Island). Set both.

**Pitfall 2: Setting locale only at the page level.** The \`locale\` option goes on the context, not the page. Use \`test.use\` or \`browser.newContext({ locale })\`.

**Pitfall 3: Forgetting to clear permissions between tests.** If your fixtures share a context across tests, permissions persist. Clear or use per-test contexts.

**Pitfall 4: Timezone mismatches in assertions.** \`new Date()\` in a test runs in the host's timezone. Use the page's reported time via \`page.evaluate(() => new Date().toString())\`.

**Pitfall 5: Color scheme not propagating to iframes.** Set \`colorScheme\` on the context; iframes inherit only if same-origin.

## Anti-patterns

- Setting locale per-test for every test. Prefer projects for locale matrix.
- Hard-coding latitude/longitude in test bodies. Move to constants for readability and reuse.
- Granting all permissions just in case. Grant the minimum so accidental prompts surface as failures.
- Stubbing time with \`page.evaluate(() => Date.now = ...)\` instead of using \`context.setTimezone\` or \`page.clock\` (see [Playwright Clock Time Control Testing Guide](/blog/playwright-clock-time-control-testing-guide)).

## Putting it all together

\`\`\`typescript
import { test, expect, devices } from '@playwright/test';

test.describe('@i18n India profile', () => {
  test.use({
    ...devices['iPhone 15 Pro'],
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    geolocation: { latitude: 19.076, longitude: 72.8777 },
    permissions: ['geolocation', 'clipboard-write'],
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });

  test('renders localized homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Use my location' }).click();
    await expect(page.getByText('Mumbai')).toBeVisible();
  });
});
\`\`\`

## Conclusion and next steps

Emulation is the unloved hero of Playwright reliability. Set locale, timezone, permissions, and color scheme deliberately, and your tests cover real user diversity without leaving CI.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants set these options when generating tests. Pair with the [Playwright Mobile Emulation Devices Reference](/blog/playwright-mobile-emulation-devices-reference) and the [Playwright Clock Time Control Testing Guide](/blog/playwright-clock-time-control-testing-guide) for full environment control.
`,
};
