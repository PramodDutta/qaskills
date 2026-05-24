import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Mobile Emulation Devices Reference (2026 Edition)',
  description: 'Complete reference for Playwright mobile emulation in 2026: device descriptors, viewport sizes, user agents, geolocation, touch events, and responsive testing patterns.',
  date: '2026-05-01',
  category: 'Reference',
  content: `
# Playwright Mobile Emulation Devices Reference (2026 Edition)

Mobile traffic crossed sixty percent of global web requests three years ago, yet most automated test suites still run only on a desktop Chromium project. Playwright's device emulation library is the fastest way to close that gap. With a single \`use\` block referencing a device descriptor, your tests run with the correct viewport, user agent, device pixel ratio, touch capabilities, and default geolocation for any of more than a hundred named devices. The result: responsive issues caught locally before they reach a real device lab.

This reference catalogues every device descriptor available in Playwright 1.49+, the exact properties each descriptor sets, the gotchas of mobile emulation versus real-device testing, and the patterns production teams use to combine emulation with conditional skips, real-device cross-validation, and accessibility checks. Every example is TypeScript, every snippet is copy-pasteable, and every table is a complete reference rather than a sampler.

If you are new to Playwright at all, read the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide) first, then come back here for the mobile specifics. The [playwright-e2e skill](/skills/playwright-e2e) ensures AI assistants pick correct device descriptors when generating mobile tests.

## What "mobile emulation" actually means

Playwright emulation does not run a real iOS or Android stack. It runs Chromium, Firefox, or WebKit on your host machine and overrides the properties that web pages use to detect mobile devices:

| Property | Source | Override mechanism |
|---|---|---|
| \`window.innerWidth/Height\` | Viewport | \`viewport\` |
| \`window.devicePixelRatio\` | Display | \`deviceScaleFactor\` |
| \`navigator.userAgent\` | Browser | \`userAgent\` |
| Touch event support | Browser | \`hasTouch\` |
| \`window.matchMedia('(hover: none)')\` | Browser | \`isMobile\` |
| \`screen.orientation\` | OS | derived from viewport |
| Default geolocation | Browser | \`geolocation\` |

Critical distinction: emulation never replicates the device's network stack, GPU, or accelerometer. WebKit emulation is the closest match for iOS because Playwright bundles a build of WebKit that matches Safari's rendering engine, but it still runs on your host's CPU. For accessibility, performance, and platform-specific gestures, supplement emulation with real-device testing using a service like BrowserStack or Sauce Labs.

## Importing device descriptors

Every descriptor lives on the \`devices\` object exported from \`@playwright/test\`.

\`\`\`typescript
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 15 Pro'] });

test('hero renders on iPhone 15 Pro', async ({ page }) => {
  await page.goto('https://qaskills.sh');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
\`\`\`

You can also reference a device in \`playwright.config.ts\` to create per-project mobile coverage.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'iPhone 15 Pro', use: { ...devices['iPhone 15 Pro'] } },
    { name: 'Pixel 8', use: { ...devices['Pixel 8'] } },
    { name: 'iPad Pro 11', use: { ...devices['iPad Pro 11'] } },
    { name: 'Galaxy S24', use: { ...devices['Galaxy S24'] } },
  ],
});
\`\`\`

Each project runs your full test suite with the named device's properties applied.

## The current device list

Playwright ships with phones, tablets, and desktop variants. The phones are the most relevant for mobile work; the desktop variants are useful for ensuring you do not accidentally apply mobile overrides to desktop projects.

### Phones (iOS family)

| Device | Viewport | DPR | Width x Height (CSS px) |
|---|---|---|---|
| iPhone 8 | 375x667 | 2 | 375x667 |
| iPhone 8 Plus | 414x736 | 3 | 414x736 |
| iPhone SE | 320x568 | 2 | 320x568 |
| iPhone X | 375x812 | 3 | 375x812 |
| iPhone 11 | 414x715 | 2 | 414x715 |
| iPhone 11 Pro | 375x812 | 3 | 375x812 |
| iPhone 12 | 390x664 | 3 | 390x664 |
| iPhone 12 Pro | 390x664 | 3 | 390x664 |
| iPhone 13 | 390x664 | 3 | 390x664 |
| iPhone 13 Pro | 390x664 | 3 | 390x664 |
| iPhone 13 Pro Max | 428x746 | 3 | 428x746 |
| iPhone 14 | 390x664 | 3 | 390x664 |
| iPhone 14 Plus | 428x746 | 3 | 428x746 |
| iPhone 14 Pro | 393x659 | 3 | 393x659 |
| iPhone 14 Pro Max | 430x739 | 3 | 430x739 |
| iPhone 15 | 393x659 | 3 | 393x659 |
| iPhone 15 Plus | 430x739 | 3 | 430x739 |
| iPhone 15 Pro | 393x659 | 3 | 393x659 |
| iPhone 15 Pro Max | 430x739 | 3 | 430x739 |

All iPhone descriptors set \`isMobile: true\`, \`hasTouch: true\`, and \`defaultBrowserType: 'webkit'\`. The user agent matches Mobile Safari on the corresponding iOS version.

### Phones (Android family)

| Device | Viewport | DPR | Default browser |
|---|---|---|---|
| Pixel 2 | 411x731 | 2.625 | chromium |
| Pixel 3 | 393x786 | 2.75 | chromium |
| Pixel 4 | 353x745 | 3 | chromium |
| Pixel 5 | 393x851 | 2.75 | chromium |
| Pixel 7 | 412x839 | 2.625 | chromium |
| Pixel 8 | 412x839 | 2.625 | chromium |
| Galaxy S5 | 360x640 | 3 | chromium |
| Galaxy S8 | 360x740 | 3 | chromium |
| Galaxy S9+ | 320x658 | 4.5 | chromium |
| Galaxy Note 3 | 360x640 | 3 | chromium |
| Galaxy S24 | 393x852 | 3 | chromium |
| Nexus 7 | 600x960 | 2 | chromium |
| Nexus 10 | 800x1280 | 2 | chromium |

Each device has both \`-landscape\` and portrait orientations. \`devices['Pixel 8 landscape']\` gives you the landscape viewport with the same DPR.

### Tablets

| Device | Viewport | DPR | Default browser |
|---|---|---|---|
| iPad (gen 7) | 810x1080 | 2 | webkit |
| iPad Mini | 768x1024 | 2 | webkit |
| iPad Pro 11 | 834x1194 | 2 | webkit |
| iPad Pro 12.9 | 1024x1366 | 2 | webkit |
| Kindle Fire HDX | 800x1280 | 2 | chromium |
| Galaxy Tab S4 | 712x1138 | 2.25 | chromium |

### Desktop variants

| Descriptor | Viewport | DPR | Browser |
|---|---|---|---|
| Desktop Chrome | 1280x720 | 1 | chromium |
| Desktop Chrome HiDPI | 1280x720 | 2 | chromium |
| Desktop Edge | 1280x720 | 1 | chromium |
| Desktop Firefox | 1280x720 | 1 | firefox |
| Desktop Firefox HiDPI | 1280x720 | 2 | firefox |
| Desktop Safari | 1280x720 | 1 | webkit |

The desktop descriptors do not set \`isMobile\` or \`hasTouch\` to true, so they behave like regular non-touch viewports.

## Anatomy of a device descriptor

Internally every descriptor is a plain object passed into the browser context. Here is the iPhone 15 Pro descriptor as Playwright emits it:

\`\`\`typescript
{
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  viewport: { width: 393, height: 659 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'webkit',
}
\`\`\`

You can override any single property. To run an iPhone-shaped viewport in Chromium (useful when you need Chrome DevTools Protocol features), spread the descriptor and replace \`defaultBrowserType\`.

\`\`\`typescript
test.use({
  ...devices['iPhone 15 Pro'],
  defaultBrowserType: 'chromium',
});
\`\`\`

## Touch gestures and tap

When \`hasTouch\` is true, calling \`.click()\` dispatches a real \`touchstart\`/\`touchend\` pair under the hood, which means tap-only event handlers fire correctly. For multi-touch or swipe gestures, use the touch API directly:

\`\`\`typescript
test('user can swipe between carousel slides', async ({ page }) => {
  await page.goto('https://demo.qaskills.sh/gallery');
  const carousel = page.getByRole('region', { name: 'Gallery' });
  const box = await carousel.boundingBox();
  if (!box) throw new Error('Carousel not visible');

  const startX = box.x + box.width * 0.8;
  const endX = box.x + box.width * 0.2;
  const y = box.y + box.height / 2;

  await page.touchscreen.tap(startX, y);
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 10 });
  await page.mouse.up();

  await expect(carousel.getByRole('img', { name: 'Slide 2' })).toBeVisible();
});
\`\`\`

For native touchscreen taps without mouse fallback, \`page.touchscreen.tap(x, y)\` dispatches a single touch event at exact coordinates.

## Setting geolocation and permissions

Mobile users grant location, camera, microphone, and notification permissions. Playwright lets you set these per context.

\`\`\`typescript
import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 15 Pro'],
  geolocation: { latitude: 19.076, longitude: 72.8777 },
  permissions: ['geolocation'],
  locale: 'en-IN',
  timezoneId: 'Asia/Kolkata',
});

test('shows nearby stores for Mumbai location', async ({ page }) => {
  await page.goto('https://demo.qaskills.sh/locate');
  await page.getByRole('button', { name: 'Use my location' }).click();
  await expect(page.getByRole('list', { name: 'Stores' })).toContainText(/Mumbai|Bandra|Andheri/);
});
\`\`\`

The full permissions list includes \`geolocation\`, \`midi\`, \`midi-sysex\`, \`notifications\`, \`push\`, \`camera\`, \`microphone\`, \`background-sync\`, \`ambient-light-sensor\`, \`accelerometer\`, \`gyroscope\`, \`magnetometer\`, \`accessibility-events\`, \`clipboard-read\`, \`clipboard-write\`, and \`payment-handler\`.

For more permission patterns, see [Playwright Emulation Geolocation Permissions Guide](/blog/playwright-emulation-geolocation-permissions-guide).

## Conditional skips based on device

When a test only makes sense on certain devices, use \`test.skip\` with conditional matchers.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('install app banner appears on Android', async ({ page, browserName, isMobile }) => {
  test.skip(!isMobile || browserName !== 'chromium', 'Android-only feature');
  await page.goto('https://demo.qaskills.sh');
  await expect(page.getByRole('alertdialog', { name: 'Install our app' })).toBeVisible();
});

test('mobile menu hamburger toggles drawer', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Only relevant on mobile viewports');
  await page.goto('https://demo.qaskills.sh');
  await page.getByRole('button', { name: 'Open menu' }).tap();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
});
\`\`\`

## Responsive snapshots across viewports

For responsive visual regression, run the same test against every mobile project and let \`toHaveScreenshot\` create separate baseline images keyed by project name.

\`\`\`typescript
test('homepage matches visual baseline', async ({ page }) => {
  await page.goto('https://qaskills.sh');
  await expect(page).toHaveScreenshot('homepage.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.005,
  });
});
\`\`\`

Playwright writes baselines to \`homepage-chromium-darwin.png\`, \`homepage-iphone-15-pro-darwin.png\`, and so on. Cross-platform CI requires matching the architecture (macOS, Linux, Windows) where you generated the baseline. See [Playwright Visual Comparison Snapshots Guide](/blog/playwright-visual-comparison-snapshots-guide) for the rest.

## Network throttling on mobile projects

Playwright does not provide network throttling directly, but Chromium projects expose the Chrome DevTools Protocol so you can apply network conditions.

\`\`\`typescript
test('app remains usable on slow 3G', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP only available in Chromium');
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (1.5 * 1024 * 1024) / 8, // 1.5 Mbps
    uploadThroughput: (750 * 1024) / 8, // 750 Kbps
    latency: 40,
  });

  await page.goto('https://demo.qaskills.sh');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
});
\`\`\`

For WebKit and Firefox you must rely on real device labs or transparent proxies.

## Recording videos and traces on mobile

Mobile videos are recorded at the device viewport, not your host display. The clip is encoded as VP9 inside a WebM container.

\`\`\`typescript
export default defineConfig({
  use: {
    video: {
      mode: 'retain-on-failure',
      size: { width: 393, height: 852 }, // explicit override for non-emulated projects
    },
  },
});
\`\`\`

When the test fails, the WebM clip lives at \`test-results/<test>/video.webm\`. Open it directly in Chrome or VS Code; both decode VP9 natively.

## Cross-browser mobile parity

The same descriptor can target different engines. Three configurations cover most production needs:

| Project | Engine | When to use |
|---|---|---|
| iPhone 15 Pro (WebKit) | webkit | Real iOS Safari parity |
| iPhone 15 Pro (Chromium) | chromium | DevTools, CDP features |
| Pixel 8 (Chromium) | chromium | Real Android Chrome parity |

\`\`\`typescript
projects: [
  { name: 'iphone-safari', use: { ...devices['iPhone 15 Pro'] } },
  {
    name: 'iphone-chrome',
    use: { ...devices['iPhone 15 Pro'], defaultBrowserType: 'chromium' },
  },
  { name: 'pixel-chrome', use: { ...devices['Pixel 8'] } },
],
\`\`\`

## Common pitfalls

**Pitfall 1: Reusing desktop selectors.** Mobile sites often hide the desktop nav and surface a hamburger menu. \`getByRole('navigation', { name: 'Main' })\` returns multiple elements on mobile; scope to visibility with \`.locator('visible=true')\` or pick the role that is actually rendered.

**Pitfall 2: Hover events.** \`page.hover()\` is a no-op on touch devices. Replace with explicit tap-and-hold or refactor the UI to expose click-based affordances.

**Pitfall 3: \`devicePixelRatio\`.** Snapshot tests at DPR 3 produce 9x more pixels than DPR 1. Configure \`maxDiffPixels\` accordingly.

**Pitfall 4: Network conditions.** Tests that pass under emulation can fail on real devices due to radio latency, request batching, and DNS caches. Run a smoke subset on real devices weekly.

**Pitfall 5: \`isMobile\` flag.** Some descriptors (notably old Android tablets) set \`isMobile: false\`. Always check the descriptor source if you rely on \`window.matchMedia('(pointer: coarse)')\`.

## Anti-patterns

- Targeting CSS classes that include responsive prefixes such as \`.md:hidden\`. Use accessible attributes and roles that survive Tailwind purge.
- Hard-coding viewport widths in test files. Use the named descriptors so updates from Playwright track the latest devices.
- Running every test on every device. Use a smoke project for mobile and a comprehensive project for desktop unless the feature is mobile-first.

## A complete responsive test

\`\`\`typescript
import { test, expect, devices } from '@playwright/test';

const targets = [
  { name: 'iphone-15-pro', device: devices['iPhone 15 Pro'] },
  { name: 'pixel-8', device: devices['Pixel 8'] },
  { name: 'ipad-pro-11', device: devices['iPad Pro 11'] },
];

for (const target of targets) {
  test.describe(target.name, () => {
    test.use(target.device);

    test('navigation collapses to drawer when viewport < 1024px', async ({ page, viewportSize }) => {
      await page.goto('https://qaskills.sh');
      const isNarrow = (viewportSize?.width ?? 0) < 1024;
      if (isNarrow) {
        await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
        await page.getByRole('button', { name: 'Open menu' }).tap();
        await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
      } else {
        await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
      }
    });
  });
}
\`\`\`

## Conclusion and next steps

Playwright's device emulation closes the responsive-coverage gap in your test suite without requiring access to a real device lab. Pick descriptors from the catalog, layer in geolocation and permissions, and supplement with weekly real-device smoke runs for the gaps emulation cannot cover.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate mobile-aware tests automatically. Read [Playwright Emulation Geolocation Permissions Guide](/blog/playwright-emulation-geolocation-permissions-guide) for permission-driven workflows. Build full CI coverage with [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026).
`,
};
