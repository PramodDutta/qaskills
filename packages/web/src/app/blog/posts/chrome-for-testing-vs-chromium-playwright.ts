import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Chrome for Testing vs Chromium in Playwright (2026 Guide)',
  description:
    'Playwright 1.57 switched to Chrome for Testing. Learn what CfT is, why it changed, channel vs chromium vs chrome, pinning versions, headless new, and CI/Docker impact.',
  date: '2026-06-18',
  category: 'Comparison',
  content: `
# Chrome for Testing vs Chromium in Playwright: What Changed and Why It Matters

If you upgraded to Playwright 1.57 and noticed your "Chromium" runs suddenly reporting a Chrome-flavored user agent, you are not imagining things. As of 1.57, Playwright began using **Chrome for Testing** (CfT) for most Chromium-channel runs instead of its own custom-compiled open-source Chromium builds. This is a meaningful provenance change with real consequences for reproducibility, CI images, Docker layers, and how you reason about "which browser actually ran my tests."

This guide explains exactly what Chrome for Testing is, why the Playwright team made the switch, the precise difference between \`channel: 'chromium'\`, \`channel: 'chrome'\`, and the CfT distribution, how to pin and select what you want, what changed for headless mode, and your escape hatch if you genuinely need the legacy open-source Chromium build.

## What Is Chrome for Testing?

Chrome for Testing is a dedicated Chrome distribution Google publishes specifically for automated testing. It exists to solve a problem that plagued the testing ecosystem for years: regular Chrome auto-updates itself silently and aggressively, so the browser on a developer's machine on Tuesday could be a different version by Thursday, and the CI runner could have something else entirely. That version drift made test runs non-reproducible and made pinning a specific browser version nearly impossible.

Chrome for Testing fixes this with three guarantees:

- **No auto-update.** A CfT binary never silently upgrades itself. The version you download is the version you keep until you choose to replace it.
- **Pinned, addressable versions.** Every CfT build is published to a known endpoint, indexed by exact version number and platform, with a stable download URL and JSON manifests listing what is available.
- **Automation-friendly defaults.** It ships without the consumer integrations (no built-in update service, no sign-in nagging) that interfere with automation, while still being a real Chrome build rather than the upstream open-source Chromium.

That last point is the crux of why Playwright switched. Chrome for Testing is "real Chrome" — it includes the proprietary Google bits (the same media codecs, the same rendering pipeline as the Chrome your users run) — but it is packaged for reproducible automation. The open-source Chromium that Playwright used to compile lacked some of those proprietary components, most visibly certain media codecs.

## Why Playwright Switched in 1.57

For most of its history, Playwright shipped its own Chromium: the team took the open-source Chromium source at a known revision, compiled it, and bundled that binary. This gave Playwright tight control, but it had downsides. Building Chromium from source is enormously expensive in CI time and infrastructure, the resulting binary differed subtly from real Chrome (no proprietary codecs, occasionally different default flags), and the "Chromium revision" was an opaque internal number that did not map cleanly to a Chrome version your users would recognize.

Chrome for Testing eliminates most of that friction:

| Concern | Old Playwright Chromium | Chrome for Testing |
| --- | --- | --- |
| Build process | Compiled from source by Playwright | Prebuilt and published by Google |
| Version identity | Opaque Chromium revision | Real, recognizable Chrome version |
| Proprietary codecs (H.264, AAC) | Often missing | Included |
| Closeness to user Chrome | Approximate | Essentially identical |
| Reproducibility | Pinned by Playwright version | Pinned by exact CfT version |
| Auto-update risk | None | None |

The result is that when you run "Chromium" in Playwright 1.57+, you are now running a browser that behaves far more like the Chrome your users actually have, while keeping the reproducibility that made Playwright's bundled approach attractive in the first place. The trade-off is provenance: the binary now comes from Google's CfT pipeline rather than Playwright's own build farm.

## channel: 'chromium' vs channel: 'chrome' vs Chrome for Testing

This is the part that confuses people, so let us be precise. In Playwright, the \`channel\` option (under \`use\` or \`launch\`) selects *which browser binary and distribution* to run.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      // No explicit channel -> Playwright's managed Chromium,
      // which since 1.57 is backed by Chrome for Testing.
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // channel: 'chrome' -> the stable Google Chrome installed
      // on the machine (the consumer browser that auto-updates).
      name: 'google-chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});
\`\`\`

Here is what each selection actually means:

- **Default Chromium (no channel, or \`channel: 'chromium'\`)**: Playwright downloads and manages this for you via \`npx playwright install\`. Since 1.57 this managed binary is Chrome for Testing under the hood. It is pinned to the Playwright version, never auto-updates, and is the recommended default for reproducible CI.
- **\`channel: 'chrome'\`**: Uses the *stable Google Chrome already installed on the host*. This is the consumer browser. It auto-updates, so the version is whatever the OS happens to have. Use it when you specifically need to test against the exact stable build your users run, accepting that it is a moving target.
- **Chrome for Testing as an explicit channel**: Playwright also exposes versioned CfT channels such as \`chrome-beta\`, plus the managed default. The point of CfT is that the *default* is now reproducible without you opting into anything.

### Channel selection reference

| You want | Set | Notes |
| --- | --- | --- |
| Reproducible default, pinned to Playwright | (omit channel) or \`channel: 'chromium'\` | CfT-backed since 1.57; install via \`playwright install\` |
| Exact stable Chrome users run | \`channel: 'chrome'\` | Auto-updating, version not pinned, must be installed on host |
| Beta Chrome behavior | \`channel: 'chrome-beta'\` | For forward-compatibility testing |
| Microsoft Edge (Chromium) | \`channel: 'msedge'\` | Edge stable on the host |
| The legacy compiled Chromium | Pin an older Playwright, or use the headless-shell escape hatch | See the last section |

A good rule of thumb: use the **default (CfT-backed) Chromium** for the bulk of your CI suite because it is reproducible, and add a **\`channel: 'chrome'\`** project only for the small set of tests where matching the exact auto-updating consumer build genuinely matters. For a broader look at how Playwright's browser model compares to alternatives, see [Playwright vs Cypress for Next.js E2E in 2026](/blog/playwright-vs-cypress-nextjs-e2e-2026).

## Browser Provenance and Reproducibility

"Provenance" means knowing exactly where your test browser came from and being able to reproduce it byte-for-byte later. This matters more than it sounds: a test that passes on a slightly different browser build than the one in CI can hide real regressions, and a flaky failure you cannot reproduce because the browser silently changed underneath you is a nightmare to debug.

With the CfT switch, the provenance story is actually *stronger*, not weaker, despite the binary now coming from Google. The reason is that every Playwright version pins a specific Chrome for Testing version, and that exact version is reproducibly downloadable from Google's published manifests.

\`\`\`bash
# See exactly which browser versions this Playwright pins.
npx playwright --version
npx playwright install --dry-run

# Query the official Chrome for Testing manifest for a platform.
curl -s https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json
\`\`\`

The combination of "pin Playwright version in package.json" plus "Playwright pins an exact CfT version" gives you a fully reproducible browser: anyone who installs the same Playwright version anywhere in the world gets the identical browser binary. That is the reproducibility guarantee that the auto-updating \`channel: 'chrome'\` can never offer.

## How to Pin and Select a Channel

The most important pinning lever is your Playwright version itself. Because Playwright maps to an exact CfT version, controlling Playwright controls the browser.

\`\`\`json
{
  "devDependencies": {
    "@playwright/test": "1.57.0"
  }
}
\`\`\`

Pin it exactly (no caret) in CI-critical projects so a \`npm install\` never silently bumps the browser. Then install browsers deterministically:

\`\`\`bash
# Install exactly the browsers this Playwright version pins.
npx playwright install --with-deps chromium

# Verify what got installed.
npx playwright install --dry-run
\`\`\`

If you need a *specific* Chrome version that differs from what your Playwright pins, the cleanest path is to install that CfT version directly and point Playwright at it via \`executablePath\`:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    launchOptions: {
      // Point at a specific Chrome for Testing binary you manage yourself.
      executablePath: process.env.CHROME_FOR_TESTING_PATH,
    },
  },
});
\`\`\`

You can fetch arbitrary CfT versions with Google's helper, then wire the path into the env var above:

\`\`\`bash
# Install a specific Chrome for Testing build (e.g. 131.x) into ./chrome.
npx @puppeteer/browsers install chrome@131.0.6778.85

# The command prints the resolved binary path; export it for Playwright.
export CHROME_FOR_TESTING_PATH="$PWD/chrome/.../chrome"
\`\`\`

## Headless 'new' Mode

Alongside the distribution change, the headless story has consolidated. For years Chrome shipped two headless implementations: the original "old" headless (a separate, stripped-down code path) and the "new" headless that runs the full browser without a visible window so behavior matches headed runs far more closely. Modern Playwright defaults to the new headless mode, which means fewer "works headed, breaks headless" surprises.

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // headless is true by default; this is the modern, full-featured
    // headless that matches headed rendering closely.
    headless: true,
  },
});
\`\`\`

The practical upshot: behaviors that historically diverged between headed and headless — certain rendering paths, some media handling, extension support — now line up. If you previously kept a "headed in CI" workaround for a flaky test, the new headless mode plus CfT's proprietary codecs may let you drop it. Note that running fully headless still differs from a real device in viewport and input nuances; if you test mobile, pair this with [Playwright mobile emulation](/blog/playwright-mobile-emulation).

## What Changes for CI and Docker

For most CI pipelines, the switch is transparent — you keep running \`npx playwright install --with-deps\` and \`npx playwright test\`, and everything works. But there are a few things worth knowing.

First, the official Playwright Docker image already bundles the correct CfT-backed browsers for its Playwright version, so the simplest robust setup is to base your CI image on it:

\`\`\`dockerfile
# Use the official image matched to your Playwright version.
FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
CMD ["npx", "playwright", "test"]
\`\`\`

Matching the image tag to your \`@playwright/test\` version is the single most important rule — a mismatch means the image's bundled browser does not match what your code expects, which is the most common source of "works locally, fails in CI" confusion after the CfT switch.

If you build your own image instead, install the browsers explicitly and pin the Playwright version:

\`\`\`dockerfile
FROM node:20-bookworm-slim

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Pull the exact CfT-backed Chromium this Playwright version pins,
# plus the OS dependencies it needs.
RUN npx playwright install --with-deps chromium

COPY . .
CMD ["npx", "playwright", "test"]
\`\`\`

A GitHub Actions snippet that pins everything correctly:

\`\`\`yaml
name: e2e
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      # Installs exactly the CfT-backed Chromium this Playwright pins.
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
\`\`\`

Second, cache invalidation: because the pinned browser version is tied to the Playwright version, your browser-install cache key should include the Playwright version (or the lockfile hash). Otherwise a Playwright bump will reuse a stale cached browser. For more on what landed in recent releases including the CfT transition, see [what's new in Playwright 2026](/blog/whats-new-in-playwright-2026).

## What to Do If You Need the Old Chromium Build

Occasionally you genuinely need the legacy behavior — perhaps you are validating against the exact open-source Chromium build for a compliance reason, or you hit a behavioral difference introduced by the proprietary CfT bits. You have a few options.

The lightest-weight option is the **headless shell** (chromium-headless-shell), a minimal headless-only Chromium that Playwright still provides for pure headless runs. Install it explicitly:

\`\`\`bash
# Install the lightweight headless-only Chromium shell.
npx playwright install chromium-headless-shell
\`\`\`

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium-shell',
      use: {
        // Use the minimal headless shell instead of full CfT Chrome.
        channel: 'chromium-headless-shell',
      },
    },
  ],
});
\`\`\`

The headless shell is smaller and faster to download — useful for CI where you only ever run headless and do not need the full browser footprint. The other escape hatch is simply **pinning an older Playwright version** (pre-1.57) whose managed Chromium was the compiled open-source build; combine that with \`executablePath\` if you want to manage the binary yourself.

### Decision guide: which browser binary to run

| Situation | Recommended choice |
| --- | --- |
| Standard CI suite | Default CfT-backed Chromium (omit channel) |
| Must match users' exact stable Chrome | \`channel: 'chrome'\` |
| Headless-only CI, minimize image size | \`channel: 'chromium-headless-shell'\` |
| Need a specific pinned Chrome version | \`@puppeteer/browsers install\` + \`executablePath\` |
| Need legacy open-source Chromium | Pin pre-1.57 Playwright or use headless shell |
| Cross-browser coverage | Add \`firefox\` and \`webkit\` projects too |

Browse curated, ready-to-install Playwright and browser-configuration recipes in the [QASkills skills directory](/skills).

## Migrating an Existing Suite to the CfT-Backed Default

For most teams the migration is "do nothing" — upgrade Playwright, run \`npx playwright install\`, and your default Chromium project is now CfT-backed automatically. But a handful of checks save you from subtle surprises.

Start by auditing where you hardcoded assumptions about the browser. Search your codebase for user-agent string checks, codec assumptions, or any test that asserted on a specific Chromium revision. The CfT user agent reports a real Chrome version, so a brittle regex like \`/Chromium\\/\\d+/\` may need to become \`/Chrome\\/\\d+/\`.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('user agent now reports real Chrome', async ({ page }) => {
  const ua = await page.evaluate(() => navigator.userAgent);
  // CfT reports a real Chrome version, not "HeadlessChrome" or a
  // bare Chromium revision. Assert loosely on the major version.
  expect(ua).toMatch(/Chrome\\/\\d+/);
});
\`\`\`

Next, re-run any tests that previously failed on media playback. The most common positive surprise after migrating is that tests touching H.264 or AAC content — which silently failed on the codec-stripped open-source Chromium — now pass because CfT bundles the proprietary codecs. If you had \`test.skip\` markers guarding media tests on Chromium, this is the moment to remove them.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('h264 video now plays on the default browser', async ({ page }) => {
  await page.goto('/player');
  await page.getByRole('button', { name: 'Play' }).click();
  // Previously skipped on open-source Chromium due to missing H.264.
  await expect(page.locator('video')).toHaveJSProperty('paused', false);
});
\`\`\`

Finally, update your CI cache keys and Docker tags in the same pull request as the Playwright bump so they move together. A migration that bumps Playwright but reuses a stale browser cache produces exactly the version-mismatch failures the CfT model is designed to prevent. Treat "Playwright version, browser binary, Docker image tag, and cache key" as one atomic unit that always changes together.

## Frequently Asked Questions

### What is Chrome for Testing in Playwright?

Chrome for Testing (CfT) is a dedicated Chrome distribution Google publishes for automated testing. It never auto-updates, is pinned to exact addressable versions, and includes the proprietary codecs that the old open-source Chromium lacked. Since Playwright 1.57, the managed "Chromium" browser is backed by Chrome for Testing, giving runs that behave much more like the real Chrome your users have while staying reproducible.

### Why did Playwright switch from Chromium to Chrome for Testing?

Compiling Chromium from source was expensive and produced a binary that differed subtly from real Chrome, notably missing proprietary media codecs. Chrome for Testing is prebuilt by Google, includes those codecs, maps to a recognizable Chrome version, and is reproducibly downloadable by exact version. The switch in 1.57 gives more realistic browser behavior while preserving the version pinning that makes CI reproducible.

### What is the difference between channel chromium and channel chrome?

\`channel: 'chromium'\` (or omitting channel) uses Playwright's managed browser, which since 1.57 is Chrome for Testing — pinned, reproducible, and installed via \`playwright install\`. \`channel: 'chrome'\` uses the stable Google Chrome already installed on the host, the consumer browser that auto-updates, so its version is a moving target. Use chromium for reproducible CI and chrome only when matching users' exact stable build matters.

### Does Chrome for Testing auto-update?

No. The entire purpose of Chrome for Testing is that it never silently upgrades itself. Once a CfT binary is downloaded it stays at that exact version until you explicitly replace it. This is the opposite of consumer Chrome (\`channel: 'chrome'\`), which auto-updates aggressively, and is what makes CfT-backed runs reproducible across machines and across time.

### How do I pin a specific Chrome version in Playwright?

The primary lever is pinning your Playwright version exactly in package.json, since each Playwright version maps to an exact Chrome for Testing version. For a different specific Chrome, install it with \`npx @puppeteer/browsers install chrome@<version>\` and point Playwright at it via \`launchOptions.executablePath\`. Verify what is pinned with \`npx playwright install --dry-run\`.

### What changes for CI and Docker after the Chrome for Testing switch?

For most pipelines, nothing — \`npx playwright install --with-deps\` and \`npx playwright test\` work as before. The key rule is to match your Docker image tag (for example \`mcr.microsoft.com/playwright:v1.57.0-jammy\`) to your installed Playwright version, and to include the Playwright version in your browser-cache key so a version bump does not reuse a stale cached browser.

### How do I get the old open-source Chromium build back?

Two options. Install the lightweight headless-only Chromium with \`npx playwright install chromium-headless-shell\` and select it via \`channel: 'chromium-headless-shell'\` for pure headless runs. Alternatively, pin a pre-1.57 Playwright version whose managed Chromium was the compiled open-source build, optionally managing the binary yourself with \`executablePath\` for full control over provenance.

### Is headless new mode related to the Chrome for Testing change?

They shipped around the same era but are separate improvements. The new headless mode runs the full browser without a visible window so headless behavior matches headed runs closely, reducing "works headed, breaks headless" bugs. Combined with Chrome for Testing's proprietary codecs, the two together mean fewer headless-specific surprises, especially around media playback and rendering parity.

## Conclusion

Playwright's 1.57 move to Chrome for Testing is a quiet but meaningful upgrade: your default "Chromium" runs now behave like real Chrome, include proprietary codecs, and remain fully reproducible because each Playwright version pins an exact CfT build. Keep the CfT-backed default for the bulk of your suite, reach for \`channel: 'chrome'\` only when you must match users' auto-updating browser, match your Docker image to your Playwright version, and use the headless shell or a pinned older Playwright if you need the legacy build.

Want production-ready Playwright configuration and CI recipes you can drop straight into your AI coding agent? Explore the [QASkills skills directory](/skills).
`,
};
