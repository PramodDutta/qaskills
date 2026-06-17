import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Mobile Emulation: Devices, Viewport & iPhone Guide',
  description:
    'Playwright mobile emulation reference: device descriptors, custom viewport, iPhone and Android emulation, touch, geolocation, and limitations vs real devices.',
  date: '2026-06-17',
  category: 'Reference',
  content: `
# Playwright Mobile Emulation: The Complete Reference

Playwright ships with built-in mobile emulation that lets you run the same test against an iPhone-sized viewport, an Android Pixel, or any custom device profile, without spinning up an emulator or a device farm. Emulation works by setting a combination of properties on the browser context: the viewport size, the device scale factor, the user agent string, whether touch events are enabled, and whether the browser reports itself as a mobile device. Playwright bundles a registry of ready-made device descriptors, so emulating an "iPhone 15" is a one-line configuration change rather than a manual assembly of a dozen properties. This reference covers every part of that system, with runnable TypeScript for each scenario.

It is important to understand what emulation does and does not do, and the [official Playwright documentation](https://playwright.dev/docs/emulation) is explicit about this: emulation reproduces the rendering characteristics a mobile browser exposes to a web page, the viewport, pixel density, touch support, and user agent, but it runs the desktop build of the rendering engine under the hood. That means emulated WebKit is desktop WebKit constrained to a mobile viewport, not iOS Safari. For the vast majority of responsive-layout, touch-interaction, and viewport-dependent testing, emulation is fast, deterministic, and entirely sufficient. For browser-engine-specific bugs or hardware behavior, you still need real devices. We will return to those limitations at the end.

This guide is organized as a reference you can scan: device descriptors first, then custom viewports, the individual emulation knobs, touch and gestures, geolocation and permissions, multi-device project configuration, and finally the boundary between emulation and real-device testing. If you are new to the framework, our [Playwright tutorial for beginners](/blog/playwright-tutorial-beginners-2026) covers setup; this page assumes you already have a project running and want the mobile-specific details.

## Using Built-In Device Descriptors

The fastest way to emulate a device is to spread one of Playwright's built-in descriptors into your context options. The \`devices\` registry is exported from the test package and keyed by device name. Each descriptor bundles the viewport, user agent, device scale factor, \`isMobile\` flag, and \`hasTouch\` flag.

\`\`\`typescript
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 15'] });

test('renders the mobile navigation', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
});
\`\`\`

You can also apply a descriptor when launching a context manually, which is useful in fixtures or scripts:

\`\`\`typescript
import { chromium, devices } from 'playwright';

const iPhone = devices['iPhone 15'];
const browser = await chromium.launch();
const context = await browser.newContext({ ...iPhone });
const page = await context.newPage();
await page.goto('https://example.com');
\`\`\`

The descriptor names match common phones and tablets. The table below lists representative entries and the properties each one sets.

| Device descriptor | Viewport | Device scale factor | isMobile | hasTouch |
|---|---|---|---|---|
| iPhone 15 | 393 x 659 | 3 | true | true |
| iPhone 15 Pro Max | 430 x 739 | 3 | true | true |
| iPhone SE | 320 x 568 | 2 | true | true |
| Pixel 7 | 412 x 839 | 2.625 | true | true |
| Galaxy S9+ | 320 x 658 | 4.5 | true | true |
| iPad Pro 11 | 834 x 1194 | 2 | true | true |
| Desktop Chrome | 1280 x 720 | 1 | false | false |

To list every available descriptor at runtime, log the keys of the \`devices\` object:

\`\`\`typescript
import { devices } from '@playwright/test';
console.log(Object.keys(devices));
\`\`\`

Note that descriptors emulate portrait orientation by default. For landscape, supply a descriptor whose name ends in "landscape" where available, or override the viewport manually as shown next.

## Setting a Custom Viewport

When no built-in descriptor matches the device you care about, set the viewport directly. The \`viewport\` option controls the size of the page's rendering surface in CSS pixels, while \`deviceScaleFactor\` controls the device pixel ratio that the page reads through \`window.devicePixelRatio\`.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 360, height: 800 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
});

test('layout switches to single column on narrow viewport', async ({ page }) => {
  await page.goto('https://example.com');
  const grid = page.getByTestId('product-grid');
  await expect(grid).toHaveCSS('grid-template-columns', /^\\d+px$/);
});
\`\`\`

You can also resize the viewport mid-test to verify responsive breakpoints in a single run:

\`\`\`typescript
test('responsive breakpoints', async ({ page }) => {
  await page.goto('https://example.com');
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole('navigation')).toBeVisible();
});
\`\`\`

Setting \`viewport: null\` disables emulation entirely and lets the page use the actual browser window size, which is occasionally useful for full-screen desktop scenarios.

## The Individual Emulation Properties

A device descriptor is just a bundle of context options. Understanding each one lets you build custom profiles precisely. The following table is the canonical reference for the mobile-relevant options.

| Option | Type | Effect |
|---|---|---|
| viewport | { width, height } | CSS-pixel size of the rendering surface |
| deviceScaleFactor | number | Value reported by window.devicePixelRatio (pixel density) |
| isMobile | boolean | Adds the mobile meta-viewport behavior; not supported in Firefox |
| hasTouch | boolean | Enables touch event support and the pointer:coarse media feature |
| userAgent | string | Overrides the navigator.userAgent string |
| screen | { width, height } | Emulates window.screen dimensions independently of viewport |
| colorScheme | 'light' \\| 'dark' \\| 'no-preference' | Drives prefers-color-scheme media query |
| locale | string | Sets Accept-Language and navigator.language |
| timezoneId | string | Overrides the timezone for Date and Intl |

Two cross-browser caveats matter. The \`isMobile\` option is not supported by Firefox, so device descriptors that set it will not fully apply there. And emulated WebKit is the desktop WebKit build constrained to mobile dimensions, not iOS Safari, so do not treat a passing emulated-WebKit test as proof that iOS Safari behaves identically.

## Emulating Touch and Gestures

With \`hasTouch: true\`, Playwright dispatches real touch events, so \`tap\` works and the page sees \`pointer:coarse\`. Use \`page.tap()\` and the touchscreen API for mobile-specific interactions.

\`\`\`typescript
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('tap and swipe interactions', async ({ page }) => {
  await page.goto('https://example.com/gallery');

  // Tap a thumbnail
  await page.getByRole('img', { name: 'Thumbnail 1' }).tap();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Simulate a swipe gesture with the touchscreen API
  await page.touchscreen.tap(200, 300);
});
\`\`\`

For more complex gestures like pinch-to-zoom or multi-finger swipes, dispatch the underlying touch events through \`page.dispatchEvent\` or use the touchscreen primitives, since Playwright's high-level API focuses on tap. When testing carousels and drag interactions, prefer the application's accessible controls where they exist, because they are more stable than coordinate-based gestures.

## Geolocation, Permissions, and Color Scheme

Mobile testing frequently involves location-aware features and dark mode. Set geolocation on the context and grant the permission so the page does not see a prompt.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.use({
  geolocation: { latitude: 37.7749, longitude: -122.4194 },
  permissions: ['geolocation'],
  colorScheme: 'dark',
  locale: 'en-US',
  timezoneId: 'America/Los_Angeles',
});

test('shows nearby results using geolocation', async ({ page }) => {
  await page.goto('https://example.com/stores');
  await page.getByRole('button', { name: 'Find stores near me' }).click();
  await expect(page.getByText('San Francisco')).toBeVisible();
});
\`\`\`

You can update geolocation mid-test with \`context.setGeolocation()\` to simulate movement, and toggle the color scheme with \`page.emulateMedia({ colorScheme: 'light' })\` to verify both themes in one test.

## Configuring Multiple Device Projects

For a real suite you usually run the same tests across several devices. Define one project per device in your config so a single command exercises desktop and mobile together.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'iPhone 15', use: { ...devices['iPhone 15'] } },
    { name: 'Pixel 7', use: { ...devices['Pixel 7'] } },
    { name: 'iPad Pro 11', use: { ...devices['iPad Pro 11'] } },
  ],
});
\`\`\`

Run a single project when iterating, or all of them in CI:

\`\`\`bash
npx playwright test --project="iPhone 15"
npx playwright test
\`\`\`

This pattern keeps the test code device-agnostic, the same locators and assertions run everywhere, while the project configuration supplies the device profile. It pairs well with our broader [cross-browser testing guide](/blog/playwright-e2e-complete-guide) approach of treating device and browser as orthogonal configuration.

## Emulation vs Real-Device Testing

Emulation is fast and deterministic, but it has a hard boundary. The table below summarizes when emulation is enough and when you need real hardware.

| Scenario | Emulation | Real device |
|---|---|---|
| Responsive layout and breakpoints | Sufficient | Optional |
| Touch tap and basic gestures | Sufficient | Optional |
| Viewport and pixel-density behavior | Sufficient | Optional |
| iOS Safari engine-specific bugs | Not reliable | Required |
| Hardware sensors, camera, biometrics | Not possible | Required |
| Real network conditions and battery | Not possible | Required |
| Performance and rendering on real silicon | Not representative | Required |

The practical strategy most teams use is a pyramid: run the bulk of responsive and interaction tests under emulation in CI for speed and stability, then run a small, targeted suite on real devices, through a device cloud or local hardware, for engine-specific and hardware-dependent behavior. Because emulated WebKit is not iOS Safari, treat any Safari-specific rendering as something that must be confirmed on a real device before you trust it. For native app testing, emulation is out of scope entirely and you would reach for a tool like Appium instead.

## Frequently Asked Questions

### How do I emulate an iPhone in Playwright?

Spread a built-in descriptor into your context options, for example \`test.use({ ...devices['iPhone 15'] })\`. The descriptor sets the viewport, device scale factor, mobile user agent, and touch support automatically. Note that this emulates desktop WebKit at iPhone dimensions, not iOS Safari, so engine-specific Safari bugs still require a real device.

### What devices does Playwright support for emulation?

Playwright bundles a large registry of descriptors covering iPhones, iPads, Pixel and Galaxy Android phones, and desktop browser profiles. Run \`console.log(Object.keys(devices))\` to print every available name. You can also build a fully custom profile by setting viewport, deviceScaleFactor, isMobile, hasTouch, and userAgent yourself.

### How do I set a custom viewport in Playwright?

Use the \`viewport\` option with a width and height in CSS pixels, either in \`test.use()\`, in the project config, or at runtime with \`page.setViewportSize({ width, height })\`. Pair it with \`deviceScaleFactor\` to control pixel density and \`isMobile\` plus \`hasTouch\` to enable mobile behavior and touch events.

### Is Playwright mobile emulation the same as a real device?

No. As the official Playwright docs state, emulation reproduces the viewport, pixel density, touch support, and user agent that a mobile browser exposes, but it runs the desktop rendering engine. It is excellent for responsive and interaction testing but cannot reproduce iOS Safari engine bugs, hardware sensors, or real performance, which still require physical devices.

### Does Playwright support touch events in emulation?

Yes, when \`hasTouch\` is set to true, which most mobile descriptors do. Playwright then dispatches real touch events, enables \`page.tap()\`, exposes the \`page.touchscreen\` API, and reports \`pointer:coarse\` to the page. Complex multi-finger gestures may need manual touch-event dispatch since the high-level API focuses on tap.

### Can I test responsive breakpoints in a single test?

Yes. Call \`page.setViewportSize()\` multiple times within one test to move between breakpoints, asserting the expected layout at each size. This is a fast way to verify that navigation collapses on narrow screens and expands on wide ones without defining separate device projects.

### Does mobile emulation work in Firefox?

Partly. Firefox does not support the \`isMobile\` option, so device descriptors that rely on it will not fully apply. Viewport sizing, user agent, and color scheme still work, but for full mobile-behavior emulation Chromium and WebKit are the better targets.

### How do I run the same tests across multiple devices?

Define one project per device in \`playwright.config.ts\`, each spreading a device descriptor into its \`use\` block. Run a single project with \`--project="iPhone 15"\` while iterating, or run the whole config in CI to exercise every device. The test code stays device-agnostic; only the project configuration changes.

## Conclusion

Playwright's mobile emulation gives you fast, deterministic coverage of responsive layouts, touch interactions, viewport behavior, geolocation, and color scheme, all driven by a single line of configuration through the built-in device registry or a custom profile. The key is knowing its boundary: emulation reproduces what a mobile browser exposes to a page but runs a desktop engine, so it is the right tool for the bulk of mobile web testing while real devices remain necessary for engine-specific and hardware behavior.

Start by adding device projects to your config and running your existing suite against an iPhone and a Pixel profile, then layer in geolocation and color-scheme tests where your app needs them. To go deeper on the framework, read the [complete Playwright E2E guide](/blog/playwright-e2e-complete-guide), and browse the [QA skills directory](/skills) for ready-to-install Playwright skills that teach your AI coding agent these mobile patterns automatically.
`,
};
