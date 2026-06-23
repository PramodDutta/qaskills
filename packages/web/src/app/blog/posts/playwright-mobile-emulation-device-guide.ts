import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Mobile Emulation: Devices & Viewport Reference',
  description:
    'Canonical reference for Playwright mobile emulation: the devices registry, viewport, deviceScaleFactor, isMobile, hasTouch, userAgent, geolocation, locale, and per-test overrides with exact config.',
  date: '2026-06-23',
  category: 'Reference',
  content: `
# Playwright Mobile Emulation: Devices and Viewport Reference

Playwright ships a built-in device emulation layer that lets a desktop Chromium, Firefox, or WebKit instance pretend to be a phone or tablet. This reference documents the exact options, the \`devices\` registry, and the context-level fields that control emulation, with runnable TypeScript for \`playwright.config.ts\` and individual tests. It is written as a docs-replacement: precise signatures, default values, and tables rather than narrative tutorial.

Mobile emulation in Playwright is **viewport size + user agent + touch + device scale factor**, plus optional \`isMobile\` browser flag (Chromium only). It is not a hardware emulator. It does not run a mobile GPU, a mobile OS, a real ARM CPU, or a mobile browser engine. WebKit-backed projects approximate Mobile Safari, and Chromium-backed projects approximate Chrome on Android, but the rendering engine is still the desktop build. This matters for any test that depends on device-specific codecs, true GPU rasterization timing, push notifications, or platform gesture quirks — those require a real-device cloud.

That said, emulation is fast, free, deterministic, and runs in CI without a device farm. It is the correct tool for responsive layout checks, viewport-conditional logic, touch-versus-click branching, \`@media\` query verification, and most functional flows that differ only by screen size. This page covers the registry-based approach (\`...devices['iPhone 15']\`), the manual approach (raw \`newContext\` options), gesture APIs, geolocation/locale/timezone/color-scheme emulation, per-test overrides with \`test.use\`, landscape handling, and the limitations that separate emulation from real devices.

Throughout, options are described at the **browser context** level. Every emulation field is a \`BrowserContextOptions\` property; \`playwright.config.ts\` projects and \`test.use()\` both feed into context creation, so the same fields apply everywhere.

## What Mobile Emulation Is (and Is Not)

Emulation overrides a fixed set of browser inputs. When you apply a device descriptor, Playwright sets:

- **viewport** — the CSS pixel dimensions of the layout area.
- **userAgent** — the \`navigator.userAgent\` string the page reads.
- **deviceScaleFactor** — \`window.devicePixelRatio\`, the ratio of physical to CSS pixels.
- **isMobile** — a Chromium-only flag that enables the mobile viewport meta-tag behavior and the mobile event model.
- **hasTouch** — whether the Touch API is exposed and \`page.tap()\` works.

It does **not** change: the rendering engine version, available fonts beyond the host OS, real network conditions (you throttle those separately via CDP), hardware sensors, or the actual JavaScript engine. A page that sniffs \`navigator.userAgent\` will believe it is on an iPhone; a page that probes WebGL renderer strings will see your desktop GPU. Treat emulation as "the browser reports mobile-shaped inputs," not "this is a phone."

A second subtlety: \`isMobile\` is **not supported in Firefox**. If a project sets \`isMobile: true\` on the Firefox browser, context creation throws. The bundled device descriptors that include \`isMobile: true\` are therefore only safe under Chromium and WebKit projects. This is why the standard config pairs Android descriptors with \`devices['Desktop Chrome']\`'s \`chromium\` channel and iPhone descriptors with WebKit.

## The devices Registry

Playwright exports a \`devices\` registry — an object keyed by device name whose values are partial \`BrowserContextOptions\`. Import it from \`@playwright/test\` (or from \`playwright\` in library mode):

\`\`\`typescript
import { devices } from '@playwright/test';

const pixel = devices['Pixel 7'];
console.log(pixel);
// {
//   userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) ...',
//   viewport: { width: 412, height: 915 },
//   deviceScaleFactor: 2.625,
//   isMobile: true,
//   hasTouch: true,
//   defaultBrowserType: 'chromium'
// }
\`\`\`

Each descriptor is just data. You spread it into a context or project. The registry includes roughly 130 entries — phones, tablets, and their landscape variants — and each carries a \`defaultBrowserType\` hint (\`chromium\` or \`webkit\`) telling you which engine the descriptor was tuned for. The full, authoritative list lives in the Playwright source file \`packages/playwright-core/src/server/deviceDescriptorsSource.json\`; do not hardcode the values from memory because Playwright updates UA strings and adds new phones every release.

To enumerate available names at runtime:

\`\`\`typescript
import { devices } from '@playwright/test';

for (const name of Object.keys(devices)) {
  console.log(name, devices[name].viewport);
}
\`\`\`

## Using devices in playwright.config.ts Projects

The idiomatic way to run a suite across device shapes is one **project** per device. Spread the descriptor into the project's \`use\` block:

\`\`\`typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: {
    baseURL: 'https://example.com',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome-pixel7',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari-iphone15',
      use: { ...devices['iPhone 15'] },
    },
    {
      name: 'tablet-ipad',
      use: { ...devices['iPad Pro 11'] },
    },
  ],
});
\`\`\`

Run a single device project with \`npx playwright test --project=mobile-safari-iphone15\`. Because each project is independent, the same test file executes once per device, and the HTML report groups results by project. You can override individual descriptor fields by listing them after the spread — order matters, later keys win:

\`\`\`typescript
{
  name: 'pixel7-landscape',
  use: {
    ...devices['Pixel 7 landscape'],
    // narrow the locale and force dark mode for this project
    locale: 'en-GB',
    colorScheme: 'dark',
  },
},
\`\`\`

## Context Options Reference

These are the \`BrowserContextOptions\` fields most relevant to emulation. Every one can appear in a project \`use\` block, in \`test.use()\`, or in a direct \`browser.newContext()\` call.

| Option | Type | Default | Meaning |
|---|---|---|---|
| \`viewport\` | \`{ width: number; height: number } \\| null\` | \`{ width: 1280, height: 720 }\` | CSS-pixel layout size. \`null\` disables the fixed viewport and uses the OS window size. |
| \`screen\` | \`{ width: number; height: number }\` | matches \`viewport\` | Value reported by \`window.screen\`; set when it must differ from the viewport. |
| \`deviceScaleFactor\` | \`number\` | \`1\` | \`window.devicePixelRatio\`. Phones are typically \`2\`–\`3.5\`. Affects screenshot resolution. |
| \`isMobile\` | \`boolean\` | \`false\` | Chromium/WebKit only. Enables the mobile viewport meta-tag and mobile event model. Throws on Firefox. |
| \`hasTouch\` | \`boolean\` | \`false\` | Exposes the Touch API; required for \`page.tap()\` and touch events. |
| \`userAgent\` | \`string\` | engine default | Overrides \`navigator.userAgent\`. |
| \`locale\` | \`string\` | system | BCP 47 locale, e.g. \`'en-US'\`. Affects \`Accept-Language\`, \`navigator.language\`, \`Intl\` formatting. |
| \`timezoneId\` | \`string\` | system | IANA timezone, e.g. \`'America/New_York'\`. Affects \`Date\` and \`Intl.DateTimeFormat\`. |
| \`geolocation\` | \`{ latitude; longitude; accuracy? }\` | unset | Coordinates returned by the Geolocation API. Requires \`geolocation\` permission. |
| \`permissions\` | \`string[]\` | \`[]\` | Granted permissions, e.g. \`['geolocation']\`. |
| \`colorScheme\` | \`'light' \\| 'dark' \\| 'no-preference' \\| null\` | \`'light'\` | Emulates \`prefers-color-scheme\`. |
| \`reducedMotion\` | \`'reduce' \\| 'no-preference' \\| null\` | \`'no-preference'\` | Emulates \`prefers-reduced-motion\`. |
| \`forcedColors\` | \`'active' \\| 'none' \\| null\` | \`'none'\` | Emulates \`forced-colors\` (high-contrast mode). |
| \`defaultBrowserType\` | \`'chromium' \\| 'firefox' \\| 'webkit'\` | n/a | Hint carried by device descriptors; informational. |

## Common Device Descriptors

A representative sample of the registry. Values change between Playwright releases (especially \`userAgent\`); confirm against your installed version.

| Device name | Viewport (w x h) | deviceScaleFactor | isMobile | hasTouch | Default engine |
|---|---|---|---|---|---|
| \`iPhone SE\` | 320 x 568 | 2 | true | true | webkit |
| \`iPhone 13\` | 390 x 664 | 3 | true | true | webkit |
| \`iPhone 14 Pro Max\` | 430 x 739 | 3 | true | true | webkit |
| \`iPhone 15\` | 393 x 659 | 3 | true | true | webkit |
| \`Pixel 5\` | 393 x 727 | 2.75 | true | true | chromium |
| \`Pixel 7\` | 412 x 915 | 2.625 | true | true | chromium |
| \`Galaxy S9+\` | 320 x 658 | 4.5 | true | true | chromium |
| \`Galaxy Tab S4\` | 712 x 1138 | 2.25 | true | true | chromium |
| \`iPad Mini\` | 768 x 1024 | 2 | true | true | webkit |
| \`iPad Pro 11\` | 834 x 1194 | 2 | true | true | webkit |
| \`Desktop Chrome\` | 1280 x 720 | 1 | false | false | chromium |
| \`Desktop Safari\` | 1280 x 720 | 1 | false | false | webkit |

Landscape variants exist for most phones under the suffix \` landscape\`, e.g. \`devices['Pixel 7 landscape']\` and \`devices['iPhone 15 landscape']\`, which swap width and height and keep the other fields.

## Per-Test Device Override with test.use

When most of the suite runs on one shape but a few specs need a different device, override at the file or \`describe\` level with \`test.use()\`. It merges into the project's \`use\` block for the tests in scope:

\`\`\`typescript
import { test, expect, devices } from '@playwright/test';

// Apply the Pixel 7 descriptor to every test in this file.
test.use({ ...devices['Pixel 7'] });

test('mobile nav uses the hamburger menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
  await expect(page.getByRole('navigation')).toBeHidden();
});

test.describe('tablet layout', () => {
  test.use({ ...devices['iPad Pro 11'] });

  test('shows the two-column grid', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.product-grid')).toHaveCSS(
      'grid-template-columns',
      /repeat\\(2/
    );
  });
});
\`\`\`

\`test.use()\` cannot appear inside a \`test()\` callback — it is a declarative option that resolves before the fixture creates the context. To change emulation mid-test, you must create a new context manually (see below).

## Manual Viewport Configuration with newContext

When you need full control, or are using Playwright as a library outside the test runner, build the context yourself. Every emulation field is a \`newContext\` option:

\`\`\`typescript
import { chromium } from 'playwright';

const browser = await chromium.launch();

const context = await browser.newContext({
  viewport: { width: 412, height: 915 },
  screen: { width: 412, height: 915 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
});

const page = await context.newPage();
await page.goto('https://example.com');
console.log(await page.evaluate(() => window.devicePixelRatio)); // 2.625
console.log(await page.evaluate(() => window.innerWidth)); // 412

await browser.close();
\`\`\`

To resize a viewport after the page exists, use \`page.setViewportSize()\`. Note this changes only the viewport — it does **not** alter \`userAgent\`, \`isMobile\`, or \`hasTouch\`, which are fixed at context creation:

\`\`\`typescript
await page.setViewportSize({ width: 375, height: 667 });
\`\`\`

If you need a genuinely different device profile (different UA, touch, DPR), close the context and open a new one, or open a second context. A single browser can host many contexts simultaneously, each with its own emulation.

## Touch and Tap Gestures with hasTouch

Touch input is gated behind \`hasTouch: true\`. With it enabled, \`page.tap()\` and \`locator.tap()\` dispatch real \`touchstart\`/\`touchend\` events instead of mouse events. Calling \`tap()\` without \`hasTouch\` throws an error telling you to enable it.

\`\`\`typescript
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 15'] }); // hasTouch: true is included

test('tap adds the item to the cart', async ({ page }) => {
  await page.goto('/product/42');
  await page.getByRole('button', { name: 'Add to cart' }).tap();
  await expect(page.getByText('1 item in cart')).toBeVisible();
});
\`\`\`

For multi-touch and custom gestures, drop to the Touchscreen API via \`page.touchscreen.tap(x, y)\`, which takes absolute coordinates. Swipes are simulated by dispatching a sequence of touch events through \`page.dispatchEvent()\` or by chaining \`mouse\` operations when \`isMobile\` translates them. There is no built-in high-level \`swipe()\` — see the FAQ on swipe gestures below.

\`\`\`typescript
// Tap at absolute coordinates (useful for canvas / map widgets).
await page.touchscreen.tap(200, 350);
\`\`\`

## Emulating Geolocation, Locale, and Timezone

Geolocation requires both the \`geolocation\` permission and coordinates. Grant the permission at context creation or with \`context.grantPermissions()\`, then set or update coordinates:

\`\`\`typescript
import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['Pixel 7'],
  locale: 'fr-FR',
  timezoneId: 'Europe/Paris',
  geolocation: { latitude: 48.8566, longitude: 2.3522, accuracy: 50 },
  permissions: ['geolocation'],
});

test('shows nearby Paris stores in French', async ({ page }) => {
  await page.goto('/store-locator');
  await expect(page.getByRole('heading', { name: 'Magasins proches' })).toBeVisible();
  await expect(page.getByText('Paris')).toBeVisible();
});
\`\`\`

To move the simulated position during a test, call \`context.setGeolocation()\`:

\`\`\`typescript
await context.setGeolocation({ latitude: 51.5074, longitude: -0.1278 });
\`\`\`

\`locale\` drives \`navigator.language\`, the \`Accept-Language\` request header, and \`Intl\` number/date formatting. \`timezoneId\` drives \`Date\` and \`Intl.DateTimeFormat\`. Both are fixed at context creation; there is no per-page setter, so use a new context to switch.

## Color Scheme, Reduced Motion, and Forced Colors

Media-feature emulation lets you verify CSS that branches on user preferences. These can be set in config/\`test.use()\`, or changed at runtime with \`page.emulateMedia()\`:

\`\`\`typescript
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 15'], colorScheme: 'dark', reducedMotion: 'reduce' });

test('dark mode applies the dark palette', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(17, 17, 17)');
});

test('can switch media at runtime', async ({ page }) => {
  await page.goto('/');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});
\`\`\`

\`page.emulateMedia()\` accepts \`colorScheme\`, \`reducedMotion\`, \`forcedColors\`, and \`media\` (\`'screen'\` or \`'print'\`). Passing \`null\` for any field resets it to the system default. This is the only emulation surface that is freely mutable mid-test without a new context.

## Landscape vs Portrait

Orientation is purely a viewport concern in Playwright — there is no orientation API. A descriptor's portrait variant has \`height > width\`; its \` landscape\` variant swaps them. Use the named landscape descriptor when available, or build it manually:

\`\`\`typescript
import { test, expect, devices } from '@playwright/test';

// Named landscape descriptor.
test.use({ ...devices['Pixel 7 landscape'] });

// Or construct landscape from a portrait descriptor by swapping the viewport.
const p = devices['iPhone 15'];
const iphone15Landscape = {
  ...p,
  viewport: { width: p.viewport!.height, height: p.viewport!.width },
};

test('landscape shows the wide hero', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero--wide')).toBeVisible();
});
\`\`\`

Pages that read \`window.matchMedia('(orientation: landscape)')\` respond to the viewport aspect ratio, so swapping dimensions is sufficient to flip the orientation media query.

## Limitations vs Real-Device Cloud

Emulation answers "does my responsive layout and viewport-conditional logic work?" It does not answer "does this work on an actual iPhone 15 running iOS 18 Safari?" Concrete gaps:

- **Rendering engine version** — Chromium/WebKit are the desktop builds bundled with Playwright, not the exact mobile browser version. CSS or JS behavior tied to a specific mobile engine release will not reproduce.
- **Hardware and sensors** — no real camera, accelerometer, gyroscope, biometric, or GPU. WebGL reports the host GPU.
- **Performance** — desktop CPU/GPU means timing and jank do not match a real low-end phone. Use CDP network/CPU throttling for rough approximation, never as a substitute.
- **Codecs and DRM** — hardware-decoded video and DRM (Widevine/FairPlay) behave differently or not at all.
- **Touch fidelity** — synthesized touch events cover the API surface but not OS-level gesture recognizers, momentum scrolling physics, or pull-to-refresh.

For release-gating on real hardware, run the same Playwright tests against a device cloud (BrowserStack, Sauce Labs, LambdaTest) that exposes real iOS/Android browsers. Emulation is your fast inner loop; the cloud is your final gate.

## Debugging Emulated Sessions

Inspect what the page actually sees with \`page.evaluate()\`:

\`\`\`typescript
const profile = await page.evaluate(() => ({
  ua: navigator.userAgent,
  dpr: window.devicePixelRatio,
  width: window.innerWidth,
  height: window.innerHeight,
  touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  lang: navigator.language,
  tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
}));
console.log(profile);
\`\`\`

Use the Playwright Inspector (\`PWDEBUG=1 npx playwright test\` or \`--debug\`) to step through emulated runs; the browser window opens at the emulated viewport. Trace viewer (\`trace: 'on-first-retry'\` in config, then \`npx playwright show-trace\`) captures DOM snapshots at the emulated size, which is the fastest way to confirm a responsive bug. Screenshots are captured at the emulated \`deviceScaleFactor\`, so a \`deviceScaleFactor: 3\` device produces 3x-resolution images — account for this in visual-regression baselines.

## Frequently Asked Questions

### Does Playwright mobile emulation run a real mobile browser?

No. Emulation overrides viewport, user agent, device scale factor, touch, and the \`isMobile\` flag on the desktop Chromium, Firefox, or WebKit build that Playwright bundles. The rendering engine is the desktop version. For true mobile-browser behavior on real hardware, run your tests against a device cloud such as BrowserStack or Sauce Labs that exposes actual iOS Safari and Android Chrome.

### How do I list all available device names?

Import the registry and read its keys: \`import { devices } from '@playwright/test';\` then \`Object.keys(devices)\`. Each value is a partial context-options object containing \`viewport\`, \`userAgent\`, \`deviceScaleFactor\`, \`isMobile\`, \`hasTouch\`, and \`defaultBrowserType\`. The authoritative, version-specific list lives in \`deviceDescriptorsSource.json\` in the playwright-core package; the registry updates each release as new phones are added.

### Why does isMobile throw an error in Firefox?

The \`isMobile\` option is only implemented in Chromium and WebKit. Setting it on a Firefox context throws during context creation. Any bundled descriptor that includes \`isMobile: true\` is therefore Chromium- or WebKit-only. Pair Android descriptors with Chromium projects and iPhone descriptors with WebKit projects, and never spread a mobile descriptor into a Firefox project.

### How do I change the viewport in the middle of a test?

Call \`await page.setViewportSize({ width, height })\`. This resizes the layout viewport only. It does not change the user agent, \`isMobile\`, \`hasTouch\`, or device scale factor, which are fixed when the context is created. If you need a different full device profile mid-test, create a new browser context with the new emulation options and open a fresh page in it.

### Do I need hasTouch to use page.tap()?

Yes. \`page.tap()\` and \`locator.tap()\` require \`hasTouch: true\` on the context, otherwise they throw an error directing you to enable it. The bundled phone descriptors already include \`hasTouch: true\`. With touch enabled, \`tap()\` dispatches real touch events; for low-level coordinate taps use \`page.touchscreen.tap(x, y)\`.

### How do I emulate dark mode on a mobile viewport?

Set \`colorScheme: 'dark'\` alongside the device descriptor in \`test.use({ ...devices['iPhone 15'], colorScheme: 'dark' })\` or in the project's \`use\` block. To toggle it at runtime, call \`await page.emulateMedia({ colorScheme: 'dark' })\`, which is the only media-emulation field freely changeable mid-test. Passing \`null\` resets to the system default.

### Is there a built-in swipe gesture?

No high-level \`swipe()\` exists. Simulate a swipe by tapping down and moving through the touchscreen, or by chaining \`page.mouse.move()\`/\`down()\`/\`up()\` when \`isMobile\` is active, or by dispatching a sequence of \`touchstart\`/\`touchmove\`/\`touchend\` events with \`page.dispatchEvent()\`. For carousels and drawers, prefer asserting the resulting state after a \`tap()\` on the control rather than physically swiping.

### How do screenshots interact with deviceScaleFactor?

Screenshots are captured at the context's \`deviceScaleFactor\`. A device with \`deviceScaleFactor: 3\` produces images three times the CSS-pixel dimensions, so a 393 x 659 iPhone viewport yields a 1179 x 1977 pixel screenshot. Keep visual-regression baselines per device project, since the same page at different scale factors produces images of different pixel dimensions that will not match.

### Can I emulate geolocation and timezone together?

Yes. Set \`geolocation\`, \`permissions: ['geolocation']\`, \`timezoneId\`, and \`locale\` in the same \`use\` block. Geolocation needs the permission granted or the API rejects with a permission error. Coordinates can be updated mid-test with \`context.setGeolocation()\`, but \`timezoneId\` and \`locale\` are fixed at context creation — switch them by opening a new context.

## Conclusion

Playwright mobile emulation is a configuration concern, not a runtime trick: spread a descriptor from the \`devices\` registry into a project or \`test.use()\`, and the context inherits the correct viewport, user agent, device scale factor, touch, and \`isMobile\` flag. Layer on \`geolocation\`, \`locale\`, \`timezoneId\`, \`colorScheme\`, and \`reducedMotion\` for preference-conditional flows, and remember the hard boundary — emulation reports mobile-shaped inputs but runs the desktop engine, so gate releases on a real-device cloud.

If you want these patterns codified as reusable, agent-ready skills — Page Object Models, fixtures, and device matrices your AI coding agent can apply automatically — browse the [QASkills.sh skills directory](/skills). For broader context, see the [complete Playwright E2E guide](/blog/playwright-e2e-complete-guide) and the [Playwright tutorial for beginners](/blog/playwright-tutorial-beginners-2026). To extend emulation into a full mobile strategy, read the [mobile testing automation guide](/blog/mobile-testing-automation-guide), and to run the same suite across engines, see the [cross-browser testing guide](/blog/cross-browser-testing-guide).
`,
};
