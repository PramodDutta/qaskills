import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Devices List: Mobile Emulation with devices and Custom Descriptors',
  description: 'playwright devices guide to list, choose, extend, and run mobile emulation in local tests and CI without mistaking it for real-device coverage.',
  date: '2026-09-28',
  category: 'Reference',
  content: `
# Playwright Devices List: Mobile Emulation with devices and Custom Descriptors

\`playwright devices\` is the built-in registry of desktop, tablet, and mobile browser context settings that Playwright exposes through \`devices\` from \`@playwright/test\` or \`playwright\`. In current official sources, Playwright is actively maintained, the latest stable package is \`1.63.0\`, and the registry source lives in the Playwright repository at \`packages/isomorphic/deviceDescriptorsSource.json\`. Nothing has been renamed or discontinued, but the list changes as Playwright updates bundled browser versions and device profiles.

Use a named descriptor when you need repeatable mobile browser behavior in CI: viewport, user agent, device scale factor, touch capability, mobile viewport handling, and default browser family. Use a custom descriptor when your product analytics, support tickets, or release criteria require a size or user agent not shipped in the registry. Do not treat either option as a replacement for native device labs. Playwright emulation is browser-context emulation, not a modem, GPU, OS keyboard, thermal, camera, biometric, or hardware sensor test.

For teams building QA skills for AI coding agents, the practical win is consistency. A Claude Code, Cursor, or Copilot workflow can ask for the list, select a descriptor, generate projects, run \`--project\` filters, and collect traces without inventing mobile settings. The deeper [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) is useful when you are still designing the whole suite, while the [Playwright CI GitHub Actions complete guide 2026](/blog/playwright-ci-github-actions-complete-guide-2026) covers broader pipeline mechanics.

## What The Device Registry Actually Contains

The registry is a map of names to context options. In code, the shape is simple: \`devices['iPhone 15']\`, \`devices['Pixel 7']\`, \`devices['Desktop Chrome']\`, and landscape variants return objects that can be spread into \`use\` or \`browser.newContext()\`. The official emulation docs describe the registry as selected device parameters, not an exhaustive catalog of every phone sold.

The source JSON confirms the recurring fields. Mobile and desktop descriptors normally include \`userAgent\`, \`viewport\`, \`deviceScaleFactor\`, \`isMobile\`, \`hasTouch\`, and \`defaultBrowserType\`. Some names use \`chromium\` by default, while iPhone and Safari-like profiles use \`webkit\`. That default is advisory for project generation and human intent; a descriptor can still be mixed incorrectly with a different browser if you override the project badly.

| Descriptor field | What it controls | QA consequence |
| --- | --- | --- |
| \`viewport\` | CSS viewport width and height | Drives responsive layout branches and screenshot baselines |
| \`userAgent\` | Browser UA string sent to the app | Influences UA sniffing, analytics bucketing, and server-side rendering |
| \`deviceScaleFactor\` | Device pixel ratio | Changes screenshot dimensions and high-DPI asset selection |
| \`isMobile\` | Mobile viewport behavior | Makes meta viewport matter and affects mobile layout calculations |
| \`hasTouch\` | Touch event availability | Exposes tap and touch paths that mouse-only desktop tests miss |
| \`defaultBrowserType\` | Intended Playwright browser family | Helps pair iPhone profiles with WebKit and Android profiles with Chromium |

\`\`\`typescript
import { devices } from '@playwright/test';

const names = Object.keys(devices)
  .filter((name) => /iPhone|Pixel|Galaxy/i.test(name))
  .sort();

for (const name of names) {
  const descriptor = devices[name];
  console.log([
    name,
    descriptor.defaultBrowserType,
    descriptor.viewport.width + 'x' + descriptor.viewport.height,
    'dpr=' + descriptor.deviceScaleFactor,
    descriptor.hasTouch ? 'touch' : 'no-touch',
  ].join(' | '));
}
\`\`\`

That script is usually better than copying a list from a blog post. The registry changes with Playwright releases, and your lockfile controls the actual list your CI sees. If a pull request upgrades \`@playwright/test\`, run a list script before assuming that device names, user agents, or browser versions stayed fixed.

## Picking A Descriptor Without Fooling Yourself

The common mistake is selecting one fashionable phone and calling the project "mobile coverage." A descriptor is only a probe. Good coverage comes from choosing probes that represent layout breakpoints, browser engines, touch behavior, and your user population. If your app is a consumer web app with iOS Safari traffic, a WebKit iPhone descriptor is valuable. If the app is an enterprise dashboard used on Android tablets, a Pixel phone alone is an attractive lie.

Start from the failure model. A responsive navigation bug usually needs width, height, and touch coverage. A payment provider redirect may care about Safari storage behavior. A download or camera flow may need a real device or a lower-level browser capability review. A visual regression suite needs stable project names and screenshot paths more than it needs five nearly identical iPhone sizes.

| Goal | Prefer | Avoid |
| --- | --- | --- |
| Catch mobile layout regressions | One small phone, one large phone, one tablet if supported | Five phones with the same breakpoint |
| Verify iOS browser behavior | WebKit project with an iPhone descriptor | Chromium project named "iPhone" |
| Verify Android browser behavior | Chromium project with a Pixel or Galaxy descriptor | Assuming WebKit approximates Android Chrome |
| Stabilize visual snapshots | Few descriptors, pinned Playwright version, explicit project names | Updating descriptors and snapshots in the same blind commit |
| Reproduce support bug | Custom descriptor based on reported viewport and UA | Guessing from marketing device names |

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['html', { open: 'never' }], ['list']],
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 15'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
\`\`\`

The names matter because Playwright filters by project name with \`--project\`, includes the project name in reports, and uses it in snapshot paths. A project named \`mobile-safari\` tells the next engineer what browser family is involved. A project named \`iPhone\` is vague because it hides whether the browser is WebKit, a channel override, or a custom context.

## Project-Level Use Versus Test-Level Overrides

Put stable device selection in \`playwright.config.ts\`. That makes local runs, CI shards, HTML reports, and traces agree. Use \`test.use()\` only for a small number of tests that intentionally explore a variation, such as color scheme, geolocation, locale, or a special viewport. If every file calls \`test.use({ ...devices[...] })\`, an AI agent has to inspect the entire tree to know what the suite does.

One subtle rule from the official docs is order. If you spread a descriptor and then set \`viewport\`, your value wins. If you set \`viewport\` first and then spread a descriptor, the descriptor overwrites you. The same applies to \`isMobile\`, \`hasTouch\`, \`userAgent\`, and every other property.

\`\`\`typescript
import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 15'],
  colorScheme: 'dark',
  locale: 'en-US',
  timezoneId: 'America/New_York',
});

test('mobile account menu exposes sign out', async ({ page }) => {
  await page.goto('/account');
  await page.getByRole('button', { name: 'Menu' }).tap();
  await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
});
\`\`\`

That test is intentionally narrow. It does not prove the whole account area works on every phone. It proves one mobile interaction path under a clear profile. The suite-level project should still carry the broader mobile smoke coverage so individual test files do not become a maze of hidden environment assumptions.

## Custom Descriptors For Real Bug Reports

A custom descriptor is just a context options object. Build one when the registry lacks the combination you need, or when support sends a reproducible viewport and user agent from analytics. Keep it in a shared file, give it a name that includes why it exists, and make the values boring. The goal is reproducibility, not a perfect physical-device simulation.

For example, suppose your checkout breaks only for a webview-like Android browser reporting a narrow viewport. You can pin a descriptor, run a focused project, and decide later whether to buy real-device coverage for that flow.

\`\`\`typescript
import type { Project } from '@playwright/test';

export const androidWebviewNarrow: Project['use'] = {
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.8010.12 Mobile Safari/537.36',
  viewport: { width: 360, height: 740 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'chromium',
};
\`\`\`

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';
import { androidWebviewNarrow } from './playwright.devices';

export default defineConfig({
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'android-webview-narrow',
      use: androidWebviewNarrow,
      grep: /@mobile-critical/,
    },
  ],
});
\`\`\`

Do not build custom descriptors by changing one field at a time until a test passes. That produces a profile nobody can explain. The values should come from browser devtools, request logs, real user monitoring, product analytics, or a support reproduction note. When values are illustrative, label them as illustrative in your team docs.

## CI Matrix That Keeps Mobile Honest

In GitHub Actions, use project filters instead of separate config files. Keep the Playwright version in \`package-lock.json\` or \`pnpm-lock.yaml\`, run \`npx playwright install --with-deps\`, and upload reports even on failure. Current official GitHub action majors include \`actions/checkout@v7\`, \`actions/setup-node@v7\`, and \`actions/upload-artifact@v7\`.

\`\`\`yaml
name: playwright-mobile

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        project: [desktop-chrome, mobile-safari, mobile-chrome]
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --project=\${{ matrix.project }}
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: playwright-report-\${{ matrix.project }}-\${{ github.run_id }}
          path: playwright-report/
          if-no-files-found: ignore
\`\`\`

For fast feedback, add targeted scripts that use Playwright's real filters. Use \`--project\` for a device project, \`-g\` or \`--grep\` for title and tag matching, and \`--grep-invert\` when excluding a known expensive tag. Do not ask agents to invent a \`--device\` flag for \`playwright test\`; device selection belongs in projects. The \`--device\` flag is useful for \`playwright codegen\`, where Playwright can record under a device profile.

\`\`\`json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:mobile": "playwright test --project=mobile-safari --project=mobile-chrome",
    "test:e2e:mobile-critical": "playwright test --project=mobile-safari -g @mobile-critical",
    "codegen:iphone": "playwright codegen --device='iPhone 15' http://localhost:3000"
  }
}
\`\`\`

Ready-made QA skills install from qaskills.sh with the qaskills CLI, but the repo still needs these explicit project names. Agents become much more reliable when the command surface is pinned in \`package.json\` instead of buried in chat history.

## Assertions That Survive Mobile Differences

Mobile emulation changes layout, timing, and sometimes server responses. Assertions should validate user-observable outcomes without binding to irrelevant pixel trivia. Prefer roles, labels, URLs, response side effects, and semantic state. Use screenshots for high-value visual risks, not as the only proof that checkout, auth, or search works.

Here is a test that checks a mobile navigation flow and settles async work before asserting the side effect. The regex is anchored, and the test first confirms the cart badge exists before comparing its text.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('mobile cart updates after adding a product @mobile-critical', async ({ page }) => {
  await page.goto('/products/sku-123');
  await expect(page).toHaveURL(/\\/products\\/sku-123$/);

  const badge = page.getByLabel('Cart items');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText('0');

  await page.getByRole('button', { name: 'Add to cart' }).tap();

  await expect
    .poll(async () => badge.textContent(), {
      message: 'cart badge should reflect the add-to-cart side effect',
    })
    .toBe('1');

  await page.getByRole('link', { name: 'Cart' }).tap();
  await expect(page).toHaveURL(/\\/cart$/);
  await expect(page.getByRole('heading', { name: 'Cart' })).toBeVisible();
});
\`\`\`

What people get wrong is testing the mobile menu by checking only that a click returns status 200 or that a hamburger button is visible. The risk is not the presence of an icon. The risk is whether the touch path opens the menu, focus lands somewhere useful, the intended target is reachable, and the next page reflects the state change.

## Failure Mode: Passing Locally, Broken In CI

A realistic mobile failure looks like this: the iPhone project passes on a developer laptop, but CI fails because the layout chooses the desktop breakpoint and the mobile menu button is missing. The test error says the button with name \`Menu\` is not visible. The root cause is usually not Playwright being flaky. It is often a descriptor override order problem or a CI project filter running a desktop project by mistake.

Diagnose it in layers. First, print \`testInfo.project.name\` in a temporary trace attachment or inspect the HTML report to confirm the project. Second, capture \`page.viewportSize()\` in the trace or test output. Third, check the config order: \`{ viewport: ..., ...devices['iPhone 15'] }\` does not mean what many people think. The descriptor wins because it comes later. Fourth, verify the app has a correct meta viewport tag, because \`isMobile\` makes that tag matter.

| Symptom | Likely cause | Fast check |
| --- | --- | --- |
| Mobile menu missing in CI | Wrong project ran | Confirm \`--project\` and report project name |
| Screenshot size changed after upgrade | Descriptor changed with Playwright | Compare printed device list before and after lockfile update |
| Taps fail but clicks pass | Target is covered or not touch-ready | Use trace viewer and role locators, then inspect hit target |
| Server sends desktop HTML | UA override missing or overwritten | Log request headers in test environment |
| Safari-only bug not reproduced | Running iPhone descriptor on Chromium | Check \`defaultBrowserType\` and project browser |

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('diagnose mobile profile', async ({ page }, testInfo) => {
  await page.goto('/');
  const viewport = page.viewportSize();

  expect(testInfo.project.name).toMatch(/mobile/);
  expect(viewport).not.toBeNull();
  expect(viewport?.width).toBeLessThanOrEqual(430);
});
\`\`\`

Remove diagnostic tests after the incident, or mark them as a small smoke check if they protect a known release gate. Permanent diagnostics should assert a real contract, not merely print facts.

## What Emulation Cannot Prove

Playwright's device descriptors are powerful because they are cheap, deterministic, and integrated with the same traces and reporters as the rest of the suite. They are limited for the same reason. They run in desktop-hosted browser engines. They do not make macOS WebKit identical to every iOS Safari build, and they do not create Android OEM browser quirks, mobile network loss, real keyboards, push notification behavior, camera permission surfaces, Bluetooth, NFC, battery pressure, or thermal throttling.

Use emulation as your first line of defense. Escalate to real devices when the risk lives below the browser context or when revenue-critical flows depend on platform integration. A mature mobile strategy often has a broad emulated smoke suite on every pull request, a narrower real-device suite on scheduled or pre-release runs, and manual exploratory testing for brand-new flows.

| Risk | Emulation fit | Real-device trigger |
| --- | --- | --- |
| CSS breakpoint regression | Strong | Only if device-specific rendering is suspected |
| Touch navigation | Good | Complex gestures, native scrolling issues, or overlays |
| Safari storage behavior | Useful with WebKit | iOS-specific webview or installed PWA behavior |
| Camera or biometric prompt | Weak | Always test on hardware or a platform simulator |
| Performance under heat or poor network | Weak | Use device lab plus network shaping |
| Push notifications | Weak | Use real browser and OS notification stack |

## Maintaining The List Over Time

Treat device descriptors like any other dependency-owned contract. When you upgrade Playwright, skim release notes, run the list script, update snapshots separately from behavior changes, and keep a changelog entry for project additions or removals. If your team uses AI coding agents, put the accepted project names and commands in \`AGENTS.md\` or package scripts so an agent does not search stale examples and introduce a non-existent device name.

The registry is intentionally selected, not complete. If marketing asks for "all iPhones," push back with a coverage matrix: small iOS, large iOS, Android Chrome, tablet if it matters, and real-device coverage for platform integrations. More descriptors can reduce confidence when they multiply slow, redundant screenshots and nobody investigates failures.

## Frequently Asked Questions

### How do I print the current Playwright devices list?

Use \`Object.keys(devices).sort()\` from \`@playwright/test\` or \`playwright\`, and run it against the installed version in your repo. That matters because the registry is versioned with Playwright. A website list may be stale the moment your lockfile changes. For useful output, print the name, default browser type, viewport, scale factor, and touch flag. Store the script as a developer utility if device selection is part of your release checklist.

### Is Playwright mobile emulation the same as testing on an iPhone?

No. An iPhone descriptor gives Playwright a WebKit-oriented browser context with mobile viewport, user agent, device scale factor, and touch settings. It does not give you iOS hardware, mobile Safari on every supported OS release, sensors, native keyboards, device memory pressure, or carrier network behavior. It is excellent for deterministic web regression coverage. It is incomplete for native platform integrations and device-specific performance risks.

### Should I use one project per device or one test per device?

Prefer one project per stable device profile. Projects make reports, traces, retries, snapshots, and CI matrices readable. Test-level \`test.use()\` is best for small, intentional overrides inside a file, such as color scheme or geolocation. If every test owns its own descriptor, maintainers and AI agents must inspect many files to know the actual coverage, and filtering with \`--project\` becomes much less useful.

### Why did my mobile screenshots change after a Playwright upgrade?

Device descriptors and bundled browser versions can change when Playwright changes. A screenshot diff after an upgrade may reflect a browser rendering change, a descriptor value change, or a real app regression. Print the device descriptor values before and after the upgrade, review the release notes, and update baselines separately from app code when possible. That separation keeps visual approvals from hiding behavior changes.
`,
};
