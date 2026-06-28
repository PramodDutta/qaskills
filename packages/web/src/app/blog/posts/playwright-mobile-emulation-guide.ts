import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Playwright Mobile Emulation: Devices, Viewport & Config Reference",
  description:
    "Playwright mobile emulation reference: the devices registry, viewport, deviceScaleFactor, isMobile, hasTouch, userAgent, and config projects per device.",
  date: "2026-06-28",
  category: "Reference",
  content: `Playwright mobile emulation works through a built-in \`devices\` registry exported from \`@playwright/test\`. You apply a device descriptor by spreading it into \`browser.newContext({ ...devices['iPhone 15'] })\` or into the \`use\` block of \`playwright.config.ts\`. The descriptor sets five core context options at once: \`viewport\`, \`userAgent\`, \`deviceScaleFactor\`, \`isMobile\`, and \`hasTouch\`. That single spread is the canonical way to do Playwright device emulation, and the rest of this reference documents every option, the registry, and the per-project config so you can copy exact signatures.

Playwright mobile emulation is software emulation only — it resizes the viewport, swaps the user agent string, scales pixels, and enables touch events inside Chromium, Firefox, or WebKit running on your desktop. It does not run a real iOS or Android device, and \`isMobile\` is honoured by Chromium-based browsers only. Everything below assumes Playwright 1.40+ and the \`@playwright/test\` runner.

## Quick answer: how to emulate a mobile device in Playwright

The fastest way to set the Playwright mobile viewport and device profile is to import \`devices\` and spread one descriptor into a new context:

\`\`\`typescript
import { chromium, devices } from '@playwright/test';

const iPhone = devices['iPhone 15'];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...iPhone,
  });
  const page = await context.newPage();
  await page.goto('https://example.com');
  await page.screenshot({ path: 'iphone-15.png' });
  await browser.close();
})();
\`\`\`

That single spread applies the iPhone 15 viewport (\`393x659\`), its \`deviceScaleFactor\` of 3, the matching mobile Safari user agent, \`isMobile: true\`, and \`hasTouch: true\`. You never set those fields by hand unless you want to override one of them. For a broader view of how this fits into a device strategy, see the [Mobile testing automation](/blog/mobile-testing-automation-guide) guide.

## What a device descriptor contains

Every entry in the \`devices\` registry is a plain object with the same shape. When you spread it into \`newContext\`, each key becomes a context option. The table below lists the properties that matter for Playwright mobile emulation.

| Property | Type | What it does |
|---|---|---|
| \`viewport\` | \`{ width, height }\` | Sets the layout viewport in CSS pixels — the Playwright mobile viewport |
| \`userAgent\` | \`string\` | The navigator.userAgent the page sees (mobile Safari, Chrome on Android, etc.) |
| \`deviceScaleFactor\` | \`number\` | Device pixel ratio (\`window.devicePixelRatio\`); 2 or 3 on most phones |
| \`isMobile\` | \`boolean\` | Adds the mobile meta-viewport behaviour; Chromium only |
| \`hasTouch\` | \`boolean\` | Enables touch input so \`page.tap()\` and touch events fire |
| \`defaultBrowserType\` | \`'chromium' \\| 'firefox' \\| 'webkit'\` | Hints which engine best matches the device |

You can inspect any descriptor at runtime to confirm the exact values:

\`\`\`typescript
import { devices } from '@playwright/test';

console.log(devices['Pixel 7']);
// {
//   userAgent: 'Mozilla/5.0 (Linux; Android 13; ...) ... Chrome/...',
//   viewport: { width: 412, height: 839 },
//   deviceScaleFactor: 2.625,
//   isMobile: true,
//   hasTouch: true,
//   defaultBrowserType: 'chromium'
// }
\`\`\`

## Popular device descriptors and their values

The registry ships with hundreds of descriptors, including landscape variants suffixed with \` landscape\` (for example \`iPhone 15 landscape\`). The table below lists commonly used profiles and their core values so you can pick a Playwright mobile viewport without printing the object first.

| Descriptor key | Viewport | deviceScaleFactor | defaultBrowserType |
|---|---|---|---|
| \`iPhone 15\` | 393x659 | 3 | webkit |
| \`iPhone 15 Pro Max\` | 430x739 | 3 | webkit |
| \`iPhone SE\` | 320x568 | 2 | webkit |
| \`Pixel 7\` | 412x839 | 2.625 | chromium |
| \`Pixel 5\` | 393x727 | 2.75 | chromium |
| \`Galaxy S9+\` | 320x658 | 4.5 | chromium |
| \`iPad Pro 11\` | 834x1194 | 2 | webkit |
| \`iPad Mini\` | 768x1024 | 2 | webkit |

Descriptor keys are case-sensitive strings. If you reference a key that does not exist, \`devices['typo']\` returns \`undefined\` and the spread silently does nothing, so the page renders at the default 1280x720 desktop viewport. Always confirm the key spelling against the values above or by logging \`Object.keys(devices)\`.

## Configuring projects per device in playwright.config.ts

For the test runner, the idiomatic pattern is one project per device. Each project's \`use\` block spreads a descriptor, so every test in that project runs under the matching Playwright mobile emulation profile. This is the setup most teams ship.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 15'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro 11'] },
    },
  ],
});
\`\`\`

Run a single device project with \`npx playwright test --project="Mobile Safari"\`, or run all projects at once with a bare \`npx playwright test\`. Because the device descriptor lives in \`use\`, individual tests inherit \`viewport\`, \`userAgent\`, \`deviceScaleFactor\`, \`isMobile\`, and \`hasTouch\` without any per-test setup. For the full runner setup around this, the [Playwright E2E guide](/blog/playwright-e2e-complete-guide) covers project configuration end to end.

You can also layer extra options on top of a descriptor in the same \`use\` block. Later keys override the spread:

\`\`\`typescript
{
  name: 'Mobile Safari Dark',
  use: {
    ...devices['iPhone 15'],
    colorScheme: 'dark',
    locale: 'en-GB',
  },
}
\`\`\`

## Setting a custom viewport and user agent without a descriptor

When no registry entry matches the device you need, set the context options directly. This gives you a custom Playwright mobile viewport, a custom user agent, and explicit control over the device pixel ratio and touch behaviour.

\`\`\`typescript
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 360, height: 800 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; Custom Device) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
});
const page = await context.newPage();
\`\`\`

To change only the viewport on an existing page — for example to walk through several breakpoints in one test — use \`page.setViewportSize()\`. It resizes the layout viewport but does not touch \`userAgent\`, \`deviceScaleFactor\`, or \`isMobile\`:

\`\`\`typescript
await page.setViewportSize({ width: 414, height: 896 });
await page.setViewportSize({ width: 768, height: 1024 });
\`\`\`

Use \`setViewportSize\` for responsive-layout sweeps and a full descriptor (or explicit context options) when you also need the matching user agent and pixel ratio.

## Enabling touch and tapping elements

\`hasTouch: true\` is what makes touch input work. Without it, \`page.tap()\` throws because the page has no touch capability. Every mobile descriptor sets \`hasTouch\` to true, so \`tap()\` is available automatically when you spread one.

\`\`\`typescript
import { chromium, devices } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();
await page.goto('https://example.com');

// hasTouch is true, so tap() works
await page.tap('button#menu');
await page.locator('a.nav-link').tap();
\`\`\`

If you set \`hasTouch: false\` (or leave it unset on a custom context), calling \`tap()\` raises an error telling you that the page does not support touch. Touch events such as \`touchstart\` and \`touchend\` also only dispatch when \`hasTouch\` is enabled, which matters for swipe and gesture handlers.

## Emulating geolocation and granting permissions

Mobile testing frequently needs a GPS fix. Set \`geolocation\` and \`permissions\` on the context, then any \`navigator.geolocation\` call resolves to your coordinates. The \`geolocation\` permission must be granted explicitly or the browser blocks the API.

\`\`\`typescript
const context = await browser.newContext({
  ...devices['iPhone 15'],
  geolocation: { latitude: 19.076, longitude: 72.8777 },
  permissions: ['geolocation'],
  locale: 'en-IN',
});
const page = await context.newPage();
\`\`\`

You can update the position mid-test with \`context.setGeolocation()\`, which is useful for simulating movement:

\`\`\`typescript
await context.setGeolocation({ latitude: 28.6139, longitude: 77.209 });
\`\`\`

Other grantable permissions include \`'notifications'\`, \`'camera'\`, and \`'microphone'\`. Pass them in the \`permissions\` array, or call \`context.grantPermissions(['camera'])\` after creation.

## Locale, timezone, and color scheme

Mobile users span regions, so Playwright lets you pin \`locale\` and \`timezoneId\` per context. These affect \`Intl\` formatting, \`Date\` output, the \`Accept-Language\` header, and \`navigator.language\` — all things that change how a responsive site renders content.

\`\`\`typescript
const context = await browser.newContext({
  ...devices['Pixel 7'],
  locale: 'fr-FR',
  timezoneId: 'Europe/Paris',
});
\`\`\`

For color scheme and other media features, use \`colorScheme\`, \`reducedMotion\`, and \`forcedColors\` as context options, or override them per page with \`emulateMedia\` (covered next). These options compose cleanly with a device descriptor because they are independent context settings, not part of the descriptor itself.

## Emulating media features: dark mode and reduced motion

\`page.emulateMedia()\` controls CSS media features at the page level so you can test dark mode, reduced-motion, and print styles without changing the device descriptor. It overrides any \`colorScheme\` you set on the context.

\`\`\`typescript
import { chromium, devices } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 15'] });
const page = await context.newPage();
await page.goto('https://example.com');

// Emulate prefers-color-scheme: dark
await page.emulateMedia({ colorScheme: 'dark' });

// Emulate prefers-reduced-motion: reduce
await page.emulateMedia({ reducedMotion: 'reduce' });

// Emulate print styles
await page.emulateMedia({ media: 'print' });

// Reset everything back to defaults
await page.emulateMedia({ colorScheme: null, reducedMotion: null, media: null });
\`\`\`

Pass \`null\` for any field to clear the override and fall back to the system or context default. \`emulateMedia\` accepts \`media\` (\`'screen'\` or \`'print'\`), \`colorScheme\` (\`'light'\`, \`'dark'\`, \`'no-preference'\`), \`reducedMotion\` (\`'reduce'\`, \`'no-preference'\`), and \`forcedColors\` (\`'active'\`, \`'none'\`).

## Taking a screenshot per device

Combining the project-per-device config with full-page screenshots gives you a deterministic mobile screenshot for each profile. \`deviceScaleFactor\` controls the resolution of the captured image, so a factor of 3 produces a 3x pixel-dense PNG.

\`\`\`typescript
import { test, devices } from '@playwright/test';

const profiles = ['iPhone 15', 'Pixel 7', 'iPad Pro 11'] as const;

for (const name of profiles) {
  test(\\\`screenshot on \\\${name}\\\`, async ({ browser }) => {
    const context = await browser.newContext({ ...devices[name] });
    const page = await context.newPage();
    await page.goto('https://example.com');
    await page.screenshot({
      path: \\\`screenshots/\\\${name.replace(/\\\\s+/g, '-')}.png\\\`,
      fullPage: true,
    });
    await context.close();
  });
}
\`\`\`

Because the descriptor carries \`deviceScaleFactor\`, you do not pass a scale option to \`screenshot\` — the captured pixels already match the emulated density. For visual regression workflows that build on these per-device captures, start from the [Playwright tutorial for beginners](/blog/playwright-tutorial-beginners-2026).

## Throttling CPU and network for mobile conditions

A device descriptor sets the viewport and touch profile but does not slow the CPU or network — emulated devices run at your desktop's full speed. To approximate a mid-range phone, drive the Chrome DevTools Protocol (CDP) directly. This is Chromium-only and complements the descriptor rather than replacing it.

\`\`\`typescript
import { chromium, devices } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();

const client = await context.newCDPSession(page);

// 4x CPU slowdown to mimic a mid-tier phone
await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

// Throttle network to a Fast 3G profile
await client.send('Network.enable');
await client.send('Network.emulateNetworkConditions', {
  offline: false,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 150,
});

await page.goto('https://example.com');
\`\`\`

\`downloadThroughput\` and \`uploadThroughput\` are bytes per second, and \`latency\` is milliseconds. Because these calls go through CDP, they only work when you launched Chromium — Firefox and WebKit have no equivalent. Throttling is what turns a fast desktop-backed emulation into a realistic slow-network mobile test for performance assertions.

## Running mobile emulation in headed mode for debugging

When a mobile layout misbehaves, run the emulated context headed so you can watch it. Pass \`headless: false\` to \`launch\` and optionally \`slowMo\` to slow each action. The browser window opens at the descriptor's viewport, so you see the page exactly as the Playwright mobile viewport renders it.

\`\`\`typescript
import { chromium, devices } from '@playwright/test';

const browser = await chromium.launch({ headless: false, slowMo: 250 });
const context = await browser.newContext({ ...devices['iPhone 15'] });
const page = await context.newPage();
await page.goto('https://example.com');
await page.pause(); // opens the Playwright Inspector
\`\`\`

\`page.pause()\` halts execution and opens the Playwright Inspector, where you can step through actions and pick locators against the emulated mobile page. For the test runner, the same effect comes from \`npx playwright test --project="Mobile Safari" --headed --debug\`, which runs only the mobile project with the inspector attached. This is the quickest way to confirm that touch targets, breakpoints, and the device pixel ratio behave as the descriptor promises.

## The isMobile caveat and other limitations

\`isMobile\` is the one option that is not honoured everywhere. It is implemented in Chromium only — Firefox and WebKit ignore it. When you spread an iPhone descriptor (which has \`defaultBrowserType: 'webkit'\`) but launch Chromium, \`isMobile\` is applied; launch WebKit and it is silently dropped. This is why a project named "Mobile Safari" running on WebKit still emulates viewport, user agent, touch, and pixel ratio, but the \`isMobile\` meta-viewport flag specifically has no effect.

The table below summarizes what software emulation can and cannot reproduce versus a real device.

| Capability | Playwright emulation | Real device |
|---|---|---|
| Viewport size and breakpoints | Yes | Yes |
| User agent string | Yes | Yes |
| Device pixel ratio | Yes | Yes |
| Touch events and tap | Yes (\`hasTouch\`) | Yes |
| Geolocation | Yes (mocked) | Yes (real GPS) |
| isMobile meta-viewport | Chromium only | Yes |
| Real GPU and rendering quirks | No | Yes |
| OS-specific gestures and keyboards | No | Yes |
| Device performance and throttling | Partial (CPU/network via CDP) | Yes |
| Real camera, sensors, biometrics | No | Yes |

Use emulation for fast, deterministic coverage of layout, responsive breakpoints, and touch flows in CI. Reserve a real-device cloud (or physical hardware) for final pre-release validation of rendering fidelity, hardware sensors, and OS gestures that software emulation cannot reproduce.

A practical split is to run the bulk of your suite under emulation on every commit — it is cheap, parallelizes well, and catches the vast majority of layout and interaction regressions — then schedule a smaller real-device pass on the critical user journeys before each release. Because the same descriptor-based config drives both, you keep one source of truth for which devices you support and avoid maintaining two divergent test setups. The descriptor keys you choose in \`playwright.config.ts\` become the contract for your mobile matrix, so document them alongside the supported-devices list your product team publishes.

## Conclusion

Playwright mobile emulation comes down to one move: spread a descriptor from the \`devices\` registry into a context or a \`playwright.config.ts\` project. That sets the viewport, user agent, deviceScaleFactor, isMobile, and hasTouch in a single line, and you layer geolocation, locale, timezone, and \`emulateMedia\` on top as needed. Remember that emulation is software-only and that \`isMobile\` is Chromium-specific. With the tables and signatures above you can copy exact config for any device profile your tests need.

Want ready-made Playwright and mobile testing skills for your AI coding agent? [Browse QA skills](/skills) on QASkills.sh to drop battle-tested device-emulation, viewport, and visual-testing skills straight into Claude Code, Cursor, and other agents.

## Frequently Asked Questions

### How do I emulate a mobile device in Playwright?

Import the \`devices\` registry from \`@playwright/test\` and spread a descriptor into a context, for example by passing the iPhone 15 descriptor to \`browser.newContext\`. That one spread sets the viewport, user agent, device pixel ratio, and touch support together. In the test runner you do the same inside the \`use\` block of a project in your config file so every test in that project runs under the device.

### Does Playwright support real devices?

No. Playwright mobile emulation is purely software-based — it resizes the viewport, swaps the user agent, scales pixels, and enables touch inside a desktop browser engine. It never runs an actual iOS or Android device. For genuine hardware coverage you connect Playwright to a real-device cloud provider or run final validation on physical phones, since emulation cannot reproduce GPU quirks, sensors, or OS gestures.

### What is isMobile in Playwright?

\`isMobile\` is a context option that turns on mobile meta-viewport behaviour, making the page treat itself as if it were on a phone. It is part of every mobile device descriptor. The important caveat is that it works in Chromium-based browsers only — Firefox and WebKit ignore the flag entirely, even though they still apply viewport, user agent, pixel ratio, and touch from the same descriptor.

### Can Playwright test responsive design?

Yes. You can sweep through breakpoints by calling \`page.setViewportSize\` with different widths and heights in a single test, or by defining one project per device in your config. Combined with screenshots and assertions on visible elements, this lets you verify that layouts, navigation, and content reflow correctly across phone, tablet, and desktop widths without leaving the test runner.

### What is the difference between setViewportSize and a device descriptor?

\`setViewportSize\` changes only the layout viewport on an existing page; it leaves the user agent, device pixel ratio, and isMobile flag untouched. A device descriptor spread into a context sets all of those at once. Use \`setViewportSize\` for quick responsive breakpoint sweeps, and a full descriptor when you also need the matching mobile user agent, pixel density, and touch behaviour.

### How do I enable touch and use tap in Playwright?

Touch input requires \`hasTouch\` to be true on the context. Every mobile device descriptor sets it for you, so after spreading one you can call \`tap\` on a locator or page selector directly. If you build a custom context, set \`hasTouch\` to true yourself, otherwise \`tap\` throws an error and touch events such as touchstart never fire on the page.

### How do I emulate dark mode on mobile in Playwright?

Call \`page.emulateMedia\` with a \`colorScheme\` of dark to make the page see \`prefers-color-scheme: dark\`. You can also set \`colorScheme\` directly on the context when you create it, which applies from the first navigation. To return to the default appearance, call \`emulateMedia\` again passing null for colorScheme so the override is cleared and the system preference takes over.

### Why is my Playwright mobile viewport showing the desktop size?

The usual cause is a misspelled descriptor key. \`devices['typo']\` returns undefined, and spreading undefined into the context does nothing, so the page falls back to the default desktop viewport of 1280x720. Confirm the exact key against the registry by logging the keys of the devices object, and remember that keys are case-sensitive and that landscape variants use a trailing landscape suffix.`,
};
