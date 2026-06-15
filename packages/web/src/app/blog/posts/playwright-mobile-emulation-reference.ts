import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Playwright Mobile Emulation: Reference Guide (2026)",
  description: "The reference for Playwright mobile emulation in 2026 — device descriptors, viewport, isMobile, hasTouch, tap, geolocation, and the real limits of emulation.",
  date: "2026-06-15",
  category: "Playwright",
  content: `# Playwright Mobile Emulation: Reference Guide (2026)

Playwright emulates mobile devices by applying a **device descriptor** — a bundle of \`viewport\`, \`userAgent\`, \`deviceScaleFactor\`, \`isMobile\`, and \`hasTouch\` — to a browser context. This is *emulation* running in desktop Chromium, WebKit, or Firefox, not a real device or mobile OS. The fastest way to do it is to spread a built-in descriptor into your context options:

\`\`\`typescript
import { devices } from '@playwright/test';

const iphone = devices['iPhone 15'];
const context = await browser.newContext({ ...iphone });
const page = await context.newPage();
await page.goto('https://example.com');
\`\`\`

The rest of this reference documents every property, the config-file project matrix, manual emulation, touch input, a device table, and the honest limits of emulation.

## What "mobile emulation" actually means in Playwright

Emulation means Playwright tells a *desktop* browser engine to **report and render as if it were a phone**. There is no Android or iOS underneath — Chromium on your CI runner is still Chromium. A device descriptor sets a handful of values that, together, make the page behave like the mobile version:

- **\`viewport\`** — the CSS pixel size of the visible area (e.g. \`{ width: 393, height: 852 }\`). This drives your \`@media\` breakpoints and responsive layout.
- **\`userAgent\`** — the UA string the browser advertises, so feature-detection and server-side device sniffing see a mobile client.
- **\`deviceScaleFactor\`** — device pixel ratio (e.g. \`3\` for many phones). Controls \`window.devicePixelRatio\` and the resolution of screenshots.
- **\`isMobile\`** — enables the mobile viewport meta-tag behavior and a mobile-style layout. **Chromium-only** (see the caveat section).
- **\`hasTouch\`** — adds touch event support so \`tap()\` and touch gestures work, and \`'ontouchstart' in window\` is true.

Because these are *context-level* options, every page opened in that context inherits the emulation. That is exactly the model the rest of your test suite plugs into — for the bigger picture of contexts, fixtures, and projects, see the [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide).

## Built-in device descriptors

Playwright ships a registry of named device descriptors. Import \`devices\` and index it by name; each entry is a plain object of the properties above (plus a \`defaultBrowserType\`).

\`\`\`typescript
import { devices } from '@playwright/test';

console.log(devices['iPhone 15']);
// {
//   userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS ...) ... Mobile/15E148 ...',
//   viewport: { width: 393, height: 852 },
//   deviceScaleFactor: 3,
//   isMobile: true,
//   hasTouch: true,
//   defaultBrowserType: 'webkit'
// }
\`\`\`

You consume a descriptor by spreading it into \`newContext()\` or, in the test runner, into a project's \`use\` block:

\`\`\`typescript
// Direct, with the library API
const context = await browser.newContext({ ...devices['Pixel 7'] });
\`\`\`

\`\`\`typescript
// In playwright.config.ts
use: { ...devices['iPhone 15'] },
\`\`\`

Spreading (\`...\`) copies every property of the descriptor into your options. You can still override individual fields after the spread — for example \`{ ...devices['iPhone 15'], locale: 'fr-FR' }\`.

## Configuring a desktop + mobile project matrix

The idiomatic way to run the same tests across desktop and mobile is the \`projects\` array in \`playwright.config.ts\`. Each project is a named configuration with its own \`use\` options; Playwright runs your specs once per project.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  projects: [
    // Desktop
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // Mobile emulation
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 15'] },
    },
  ],
});
\`\`\`

Run everything with \`npx playwright test\`, or target one project with \`npx playwright test --project="Mobile Safari"\`. Note the \`defaultBrowserType\` baked into each descriptor: \`iPhone\`/\`iPad\` descriptors default to WebKit (approximating Mobile Safari), while \`Pixel\`/\`Galaxy\` default to Chromium. That is why a "Mobile Safari" project should use an iPhone descriptor and a "Mobile Chrome" project a Pixel descriptor — the browser engine and the device profile are matched on purpose.

## Manual emulation without a descriptor

You do not need a named device. You can set any subset of the emulation properties directly on \`newContext()\` (or in a project's \`use\`). This is useful for a custom viewport, a tablet size that isn't in the registry, or testing a specific breakpoint.

\`\`\`typescript
const context = await browser.newContext({
  viewport: { width: 360, height: 740 },
  deviceScaleFactor: 2,
  isMobile: true,          // Chromium only
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
});
\`\`\`

The same context options also let you emulate everything *around* the device — locale, time zone, geolocation, and color scheme — which mobile pages frequently branch on:

\`\`\`typescript
const context = await browser.newContext({
  ...devices['Pixel 7'],
  locale: 'en-GB',
  timezoneId: 'Europe/London',
  geolocation: { latitude: 51.5074, longitude: -0.1278 },
  permissions: ['geolocation'],   // grant the API so the page can read location
  colorScheme: 'dark',            // matches prefers-color-scheme: dark
});
\`\`\`

A few rules worth pinning down:

- **\`geolocation\` needs \`permissions: ['geolocation']\`.** Without granting the permission, the page's \`navigator.geolocation\` call is blocked exactly as it would be in a real browser before the user clicks "Allow".
- **\`colorScheme\`** drives the \`prefers-color-scheme\` media query — values are \`'light'\`, \`'dark'\`, or \`'no-preference'\`.
- **\`timezoneId\`** uses IANA names (e.g. \`'America/New_York'\`), and **\`locale\`** affects \`Accept-Language\`, \`navigator.language\`, and number/date formatting.
- You can change viewport mid-test with \`await page.setViewportSize({ width, height })\`, but \`isMobile\`, \`hasTouch\`, and \`userAgent\` are **fixed at context creation** — to change them, open a new context.

## Touch interactions: tap() and the touchscreen API

Touch is gated on \`hasTouch\`. With \`hasTouch: true\` (set by every mobile descriptor), elements expose \`tap()\`, and the page exposes a low-level \`touchscreen\` API.

\`\`\`typescript
test('tap a mobile button', async ({ page }) => {
  // page comes from a project using ...devices['Pixel 7'] (hasTouch: true)
  await page.goto('https://example.com');
  await page.getByRole('button', { name: 'Menu' }).tap();
});
\`\`\`

If you call \`tap()\` in a context **without** \`hasTouch: true\`, Playwright throws: *"The page does not support tap. Use hasTouch context option to enable touch support."* So \`tap()\` is only valid under mobile (or manually touch-enabled) emulation.

For raw coordinate-based touches — pinch, swipe, multi-touch sequences — use \`page.touchscreen.tap(x, y)\`:

\`\`\`typescript
// Tap at absolute page coordinates
await page.touchscreen.tap(150, 320);
\`\`\`

Note that \`tap()\` dispatches \`touchstart\`/\`touchend\`, not a mouse \`click\`. If your app only listens for \`click\`, it will still fire because browsers synthesize a click after a tap — but if you are specifically testing touch handlers, \`tap()\` is the correct action.

## Common device descriptors

Below is a sample of frequently used descriptors and their defining properties. Property values track upstream device profiles and can shift slightly between Playwright releases, so treat exact numbers as indicative and read the live object (\`console.log(devices['…'])\`) when a precise value matters.

| Descriptor name | Viewport (CSS px) | deviceScaleFactor | isMobile | hasTouch | Default engine |
|---|---|---|---|---|---|
| \`iPhone 15\` | 393 × 852 | 3 | true | true | webkit |
| \`iPhone 15 Pro Max\` | 430 × 932 | 3 | true | true | webkit |
| \`iPhone SE\` | 320 × 568 | 2 | true | true | webkit |
| \`Pixel 7\` | 412 × 915 | ~2.6 | true | true | chromium |
| \`Pixel 5\` | 393 × 851 | 3 | true | true | chromium |
| \`Galaxy S9+\` | 320 × 658 | 4.5 | true | true | chromium |
| \`iPad (gen 7)\` | 810 × 1080 | 2 | true | true | webkit |
| \`iPad Pro 11\` | 834 × 1194 | 2 | true | true | webkit |
| \`Desktop Chrome\` | 1280 × 720 | 1 | (unset) | false | chromium |

There are also landscape variants for many devices — append \`" landscape"\` to the name, e.g. \`devices['iPhone 15 landscape']\`, which swaps the viewport dimensions. To see the full, version-accurate list, log \`Object.keys(devices)\` in your project.

## The honest caveat: emulation is not real-device testing

This is the most important section, and the one searches for "does Playwright test on real mobile devices" are really asking about. **Device emulation approximates a phone; it does not reproduce one.** Be precise about what it does and does not give you:

- **It is the same engine, resized.** "Mobile Chrome" via a Pixel descriptor is desktop Chromium with a phone viewport, UA, and touch — not Chrome on Android. "Mobile Safari" via an iPhone descriptor is **WebKit, which approximates Mobile Safari but is not iOS Safari**. The rendering engine is in the same family, but the OS, the exact Safari build, font rendering, and platform quirks differ.
- **\`isMobile\` is Chromium-only.** Setting \`isMobile: true\` in a WebKit or Firefox context throws (*"isMobile is not supported in …"*). That is why iPhone/iPad descriptors, which set \`isMobile: true\`, default to the \`webkit\` browser type *and* Playwright handles the property specially for them — but you cannot freely combine \`isMobile\` with Firefox.
- **No real hardware behaviors.** Emulation will not surface real-device CPU/GPU performance, battery and thermal throttling, real network radios, actual touch digitizer behavior, hardware sensors, push notifications, app-store webviews, or true device fonts. Layout, responsive breakpoints, touch *events*, and basic geolocation/permission flows test well; device-specific rendering and performance do not.

Use emulation for fast, deterministic responsive and interaction coverage in CI — it catches the overwhelming majority of layout and touch regressions cheaply. Then validate the final, business-critical paths on **real devices or a device cloud** (BrowserStack, Sauce Labs, LambdaTest, AWS Device Farm) before release. For the full strategy of where emulation fits versus real-device and native tooling, see the [mobile testing automation guide](/blog/mobile-testing-automation-guide). Ready-made Playwright [QA skills](/skills) can also teach your AI coding agent to scaffold these mobile projects correctly.

## Python

The Python API exposes the same registry as \`p.devices\`, a dict you spread with \`**\`. Emulation options live on \`new_context()\`, and the touch action is \`tap()\`.

\`\`\`python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    iphone = p.devices["iPhone 15"]

    # Spread the descriptor; iPhone defaults to WebKit
    browser = p.webkit.launch()
    context = browser.new_context(**iphone)
    page = context.new_page()
    page.goto("https://example.com")
    page.get_by_role("button", name="Menu").tap()
    browser.close()
\`\`\`

Manual emulation plus locale/timezone/geolocation/color scheme uses snake_case option names:

\`\`\`python
context = browser.new_context(
    viewport={"width": 360, "height": 740},
    device_scale_factor=2,
    is_mobile=True,          # Chromium only
    has_touch=True,
    user_agent=(
        "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
    ),
    locale="en-GB",
    timezone_id="Europe/London",
    geolocation={"latitude": 51.5074, "longitude": -0.1278},
    permissions=["geolocation"],
    color_scheme="dark",
)
\`\`\`

Async Python (\`async_playwright\`) is identical apart from \`await\` and \`async with\`. The same Chromium-only \`is_mobile\` rule and the same \`has_touch\` requirement for \`tap()\` apply.

## Frequently Asked Questions

### Does Playwright mobile emulation test on real devices?

No. Playwright emulates mobile devices by applying a device descriptor (viewport, user agent, device pixel ratio, \`isMobile\`, \`hasTouch\`) to a desktop Chromium, WebKit, or Firefox engine. There is no Android or iOS underneath, so it does not reproduce real hardware performance, sensors, or platform-specific rendering. Use emulation for fast responsive and touch coverage, then validate critical flows on real devices or a device cloud.

### What is the difference between Mobile Safari emulation and real iOS Safari?

The \`iPhone\` descriptors run on WebKit, which is the same engine family as Safari and approximates Mobile Safari closely for layout and behavior. However, it is not iOS Safari: the operating system, the exact Safari build, font rendering, and various platform quirks differ. It is excellent for catching responsive and interaction bugs but should not be treated as a substitute for testing on an actual iPhone.

### How do I enable touch and use tap() in Playwright?

Touch requires \`hasTouch: true\` on the browser context, which every built-in mobile descriptor sets for you. With it enabled, call \`await locator.tap()\` to dispatch touch events, or use \`page.touchscreen.tap(x, y)\` for coordinate-based touches. Calling \`tap()\` in a context without \`hasTouch\` throws an error telling you to enable the \`hasTouch\` option.

### Why does isMobile fail in Firefox or WebKit?

The \`isMobile\` option is Chromium-only — Playwright throws if you set it on a Firefox or WebKit context. That is why iPhone and iPad descriptors (which need \`isMobile: true\`) default to the \`webkit\` browser type with Playwright handling the property specially, rather than letting you combine \`isMobile\` with Firefox. If you need \`isMobile\` for a custom profile, run it under Chromium.

### How do I emulate a custom device size instead of a named descriptor?

Set the emulation properties directly on \`newContext()\` (or a project's \`use\`): \`viewport\`, \`deviceScaleFactor\`, \`isMobile\`, \`hasTouch\`, and \`userAgent\`. You can also start from a descriptor and override fields, e.g. \`{ ...devices['Pixel 7'], viewport: { width: 360, height: 740 } }\`. Viewport can be changed mid-test with \`page.setViewportSize()\`, but \`isMobile\`, \`hasTouch\`, and \`userAgent\` are fixed when the context is created.

### How do I run tests on both desktop and mobile in one config?

Define a \`projects\` array in \`playwright.config.ts\`, with one project per profile — e.g. \`Desktop Chrome\`, a Pixel-based \`Mobile Chrome\`, and an iPhone-based \`Mobile Safari\` — each spreading the matching descriptor into its \`use\` block. Running \`npx playwright test\` executes every spec once per project, and \`--project="Mobile Safari"\` targets a single one. The descriptor's \`defaultBrowserType\` ensures each mobile project uses the right engine.
`,
};
