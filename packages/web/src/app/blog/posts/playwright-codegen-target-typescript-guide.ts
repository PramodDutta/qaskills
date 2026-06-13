import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Codegen --target=typescript + --output Complete Guide',
  description:
    'Master npx playwright codegen --target=typescript with --output, --save-storage, --color-scheme, --device, --lang. Generate runnable Playwright TypeScript tests in seconds.',
  date: '2026-06-05',
  category: 'Reference',
  content: `
# Playwright Codegen --target=typescript + --output Complete Guide

\`npx playwright codegen --target=typescript\` is the single fastest way to bootstrap a Playwright test in 2026. You launch a real browser, click through your application, and Playwright streams the corresponding TypeScript test code into a file or into the Playwright Inspector window. It is the canonical "record and replay" tool for the modern Playwright stack, and it understands every locator, action, and assertion that Playwright itself ships with. This guide is the complete reference: every flag, every target language, every storage and device option, with runnable examples for the TypeScript target.

Playwright Codegen is not a black box. The code it emits is identical to what a human would write: \`getByRole\`, \`getByLabel\`, \`getByTestId\`, \`expect(...).toBeVisible()\`. There is no special runtime, no proprietary selector engine, no abstraction layer. That means you can record a test, save it, and run it with \`npx playwright test\` immediately. You can also paste the code into an existing spec, refactor it, or use it as the seed for a Page Object Model. For QA engineers writing tests for Claude Code, Cursor, or Aider, codegen is the fastest path from "I want to test this" to "I have a runnable test in tests/login.spec.ts."

This guide assumes Playwright 1.49 or later. For a broader introduction, the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide) covers fundamentals and the [Playwright Best Practices](/blog/playwright-best-practices-2026) post details what good test code looks like. The [playwright-e2e skill](/skills/playwright-e2e) installs the same patterns Codegen produces straight into your AI agent.

## The minimal command

The simplest invocation that produces TypeScript is:

\`\`\`bash
npx playwright codegen --target=typescript https://example.com
\`\`\`

This opens Chromium against \`https://example.com\` and a separate Playwright Inspector window. As you interact with the page, the Inspector stages TypeScript code. When you stop recording, the code shown in the Inspector is a complete, runnable Playwright TypeScript test that imports \`{ test, expect }\` from \`@playwright/test\`.

If you want the test written to disk instead of just shown in the Inspector, add \`--output\` (or \`-o\`):

\`\`\`bash
npx playwright codegen --target=typescript -o tests/login.spec.ts https://example.com
\`\`\`

The path is relative to your working directory. Codegen creates the directory if it does not exist, and overwrites the file if it does. After the recording, the file is ready to run with \`npx playwright test tests/login.spec.ts\`.

## Every target language

\`--target\` controls the output language. The full list:

| Target value | Language | Test runner integration |
|---|---|---|
| \`typescript\` | TypeScript | \`@playwright/test\` imports |
| \`javascript\` | JavaScript | \`@playwright/test\` imports |
| \`python\` | Python | \`playwright.sync_api\` |
| \`python-async\` | Python async | \`playwright.async_api\` |
| \`python-pytest\` | Python with pytest fixtures | \`pytest-playwright\` |
| \`csharp\` | C# | NUnit attribute style |
| \`csharp-nunit\` | C# NUnit explicit | NUnit attributes |
| \`csharp-mstest\` | C# MSTest | MSTest attributes |
| \`java\` | Java | JUnit 5 style |
| \`java-junit\` | Java JUnit | JUnit 5 attributes |

For TypeScript projects, the value you want is \`typescript\`. The output is wrapped in a \`test('...', async ({ page }) => { ... })\` block and uses the \`@playwright/test\` runner. If you do not need the runner (you are just exploring), use \`--target=playwright-test\` or skip \`--target\` and use the default JavaScript output.

\`\`\`bash
# TypeScript with @playwright/test runner
npx playwright codegen --target=typescript -o tests/checkout.spec.ts https://shop.example.com

# Python sync
npx playwright codegen --target=python -o tests/checkout.py https://shop.example.com

# Python pytest fixtures (most common in real projects)
npx playwright codegen --target=python-pytest -o tests/test_checkout.py https://shop.example.com

# Java JUnit 5
npx playwright codegen --target=java -o src/test/java/Checkout.java https://shop.example.com
\`\`\`

## --output writes the file

Without \`--output\`, the generated code lives only in the Inspector window. You can copy-paste it into a file manually, which is fine for one-off exploration. For repeatable test creation, \`--output\` is the right pattern.

\`\`\`bash
npx playwright codegen --target=typescript --output tests/e2e/login.spec.ts https://app.example.com/login
\`\`\`

The short form \`-o\` works identically:

\`\`\`bash
npx playwright codegen --target=typescript -o tests/e2e/login.spec.ts https://app.example.com/login
\`\`\`

The file is written as soon as you stop the recording (close the browser or click Stop in the Inspector). If the recording is empty, the file still gets a skeleton with the imports and an empty \`test()\` block.

When \`--output\` is set, the generated test always uses the \`@playwright/test\` runner shape:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://app.example.com/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('https://app.example.com/dashboard');
});
\`\`\`

Rename the test, add a \`test.describe\` block, and you have a production-grade test.

## --save-storage preserves login between runs

\`--save-storage\` writes the cookies and localStorage of the recording session to a JSON file. You can then use that file as the \`storageState\` in subsequent codegen runs (or in your test config) so you start already logged in.

\`\`\`bash
# Step 1: log in once and save the storage state
npx playwright codegen \\
  --target=typescript \\
  --save-storage=auth.json \\
  https://app.example.com/login

# Step 2: reuse the saved state in future recordings
npx playwright codegen \\
  --target=typescript \\
  --load-storage=auth.json \\
  -o tests/dashboard.spec.ts \\
  https://app.example.com/dashboard
\`\`\`

The pair \`--save-storage\` and \`--load-storage\` mirrors the \`storageState\` config field in \`playwright.config.ts\`. For full authentication patterns, see the [Playwright APIRequestContext + storageState guide](/blog/playwright-apirequestcontext-storage-state-guide).

\`\`\`typescript
// playwright.config.ts can reuse the same file
export default defineConfig({
  use: {
    storageState: 'auth.json',
  },
});
\`\`\`

This is the workflow that lets a recorded test skip the login screen on every run.

## --color-scheme records the dark-mode variant

\`--color-scheme\` accepts \`light\`, \`dark\`, or \`no-preference\` and applies the corresponding \`prefers-color-scheme\` media query to the recording session. Use this when you want a test that documents the dark-mode rendering or interaction.

\`\`\`bash
npx playwright codegen \\
  --target=typescript \\
  --color-scheme=dark \\
  -o tests/dark-mode-checkout.spec.ts \\
  https://shop.example.com
\`\`\`

The generated test does not explicitly set the color scheme. To make the dark-mode preference part of the test, edit the generated code to use a \`test.use({ colorScheme: 'dark' })\` block:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.use({ colorScheme: 'dark' });

test('dark-mode checkout', async ({ page }) => {
  await page.goto('https://shop.example.com');
  await page.getByRole('button', { name: 'Add to cart' }).click();
});
\`\`\`

This makes the test reproducible regardless of the recorder's system settings.

## --device emulates a mobile or tablet form factor

Playwright ships with descriptors for 100+ devices in \`devices['iPhone 14 Pro']\`, \`devices['Pixel 8']\`, \`devices['iPad Pro']\`, and so on. The \`--device\` flag applies the same descriptor to the recording session: viewport, user-agent, touch support, and pixel ratio.

\`\`\`bash
npx playwright codegen \\
  --target=typescript \\
  --device="iPhone 14 Pro" \\
  -o tests/mobile-checkout.spec.ts \\
  https://shop.example.com
\`\`\`

To make the mobile profile part of the test config, edit the test to declare a project:

\`\`\`typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'mobile-iphone-14-pro',
      use: { ...devices['iPhone 14 Pro'] },
    },
  ],
});
\`\`\`

Then run the recorded test under that project:

\`\`\`bash
npx playwright test --project=mobile-iphone-14-pro
\`\`\`

## --lang sets the browser locale

\`--lang\` (alias \`--locale\`) sets \`navigator.language\` and the \`Accept-Language\` header for the recording. Useful for verifying internationalized UI or for capturing tests against a locale-specific build.

\`\`\`bash
npx playwright codegen \\
  --target=typescript \\
  --lang=fr-FR \\
  -o tests/checkout-fr.spec.ts \\
  https://shop.example.com
\`\`\`

The recorded test can then declare the locale in config so it always runs in French:

\`\`\`typescript
// playwright.config.ts
export default defineConfig({
  use: {
    locale: 'fr-FR',
  },
});
\`\`\`

## --browser picks the engine

By default codegen launches Chromium. \`--browser\` overrides this with \`chromium\`, \`firefox\`, or \`webkit\`. Recording against the engine you actually ship against avoids selector surprises later.

\`\`\`bash
# Record against WebKit (Safari engine)
npx playwright codegen --target=typescript --browser=webkit -o tests/safari.spec.ts https://app.example.com

# Record against Firefox
npx playwright codegen --target=typescript --browser=firefox -o tests/firefox.spec.ts https://app.example.com
\`\`\`

If your test config runs against all three projects, recording against any one of them is fine. The generated locators are engine-independent.

## --channel uses installed Chrome or Edge

If you want to record against Chrome stable (not the Chromium build Playwright bundles) or Edge, use \`--channel\`:

\`\`\`bash
npx playwright codegen --target=typescript --channel=chrome -o tests/chrome.spec.ts https://app.example.com
npx playwright codegen --target=typescript --channel=msedge -o tests/edge.spec.ts https://app.example.com
\`\`\`

This is the right choice when your application uses Chrome-specific APIs (Web Speech, certain WebAuthn flows) that the bundled Chromium does not support.

## --viewport-size customizes the window

The recording opens at 1280x720 by default. Override with \`--viewport-size=W,H\`:

\`\`\`bash
npx playwright codegen --target=typescript --viewport-size=1920,1080 -o tests/desktop.spec.ts https://app.example.com
\`\`\`

For full responsive coverage, combine with \`--device\`. The device preset wins when both are set.

## --timezone for date and time tests

Tests that render schedules, calendars, or timestamps benefit from a controlled timezone:

\`\`\`bash
npx playwright codegen --target=typescript --timezone-id="America/New_York" -o tests/ny-schedule.spec.ts https://schedule.example.com
\`\`\`

This applies \`Intl.DateTimeFormat().resolvedOptions().timeZone\` consistently. To bake into config, set \`timezoneId\` in \`use\`:

\`\`\`typescript
export default defineConfig({
  use: {
    timezoneId: 'America/New_York',
  },
});
\`\`\`

## --geolocation pins coordinates

For tests that exercise location-based features (store finder, ride-hail estimate), pre-set coordinates:

\`\`\`bash
npx playwright codegen \\
  --target=typescript \\
  --geolocation=40.7128,-74.0060 \\
  --permissions=geolocation \\
  -o tests/locate.spec.ts \\
  https://maps.example.com
\`\`\`

\`--permissions\` grants the geolocation permission so the browser does not prompt during the recording. Combined, the test is fully deterministic.

## --proxy-server routes traffic

When the application under test is behind a corporate proxy or you want to inspect traffic, route the recording through a proxy:

\`\`\`bash
npx playwright codegen --target=typescript --proxy-server="http://localhost:8888" -o tests/proxied.spec.ts https://internal.example.com
\`\`\`

The browser uses the proxy for both HTTPS and HTTP. To authenticate, add \`--proxy-bypass\` and credential flags as needed.

## --ignore-https-errors for self-signed certs

Staging environments often use self-signed certificates that fail the browser's HSTS check. Add the flag:

\`\`\`bash
npx playwright codegen --target=typescript --ignore-https-errors -o tests/staging.spec.ts https://staging.local
\`\`\`

The generated test does not include this option; you set it in config when the test runs.

## --user-data-dir persists profiles

To record against a real Chrome profile (with extensions, signed-in accounts, etc.), point \`--user-data-dir\` at the profile path:

\`\`\`bash
npx playwright codegen \\
  --target=typescript \\
  --user-data-dir=~/.config/google-chrome/Default \\
  -o tests/profile.spec.ts \\
  https://app.example.com
\`\`\`

The recording then uses everything stored in that profile. Note: this conflicts with \`--load-storage\`; use one or the other.

## Full flag matrix

| Flag | Purpose | TypeScript example |
|---|---|---|
| \`--target=typescript\` | Output language | \`--target=typescript\` |
| \`-o, --output\` | Write to file | \`-o tests/login.spec.ts\` |
| \`--save-storage\` | Save cookies+localStorage to JSON | \`--save-storage=auth.json\` |
| \`--load-storage\` | Reuse saved storage | \`--load-storage=auth.json\` |
| \`--color-scheme\` | Light or dark mode | \`--color-scheme=dark\` |
| \`--device\` | Apply a device preset | \`--device="iPhone 14 Pro"\` |
| \`--lang\` | Browser locale | \`--lang=fr-FR\` |
| \`--browser\` | Chromium, Firefox, WebKit | \`--browser=webkit\` |
| \`--channel\` | Chrome, Edge, Beta channels | \`--channel=chrome\` |
| \`--viewport-size\` | Width,height | \`--viewport-size=1920,1080\` |
| \`--timezone-id\` | IANA timezone | \`--timezone-id="Europe/Paris"\` |
| \`--geolocation\` | Lat,lon | \`--geolocation=40.7,-74.0\` |
| \`--permissions\` | Granted permissions | \`--permissions=geolocation\` |
| \`--proxy-server\` | HTTP/HTTPS proxy | \`--proxy-server=http://proxy:8888\` |
| \`--ignore-https-errors\` | Allow self-signed certs | \`--ignore-https-errors\` |
| \`--user-data-dir\` | Persistent profile | \`--user-data-dir=~/profile\` |
| \`--block-service-workers\` | Bypass SWs during recording | \`--block-service-workers\` |

## A realistic end-to-end workflow

Here is the complete pattern most teams settle on. Start by logging in once and saving auth:

\`\`\`bash
mkdir -p tests
npx playwright codegen \\
  --target=typescript \\
  --save-storage=tests/.auth/admin.json \\
  https://app.example.com/login
\`\`\`

Click through your login. The Inspector shows code that captures the login. When you close the browser, \`tests/.auth/admin.json\` contains the cookies and localStorage.

Now record real feature tests against the authenticated state:

\`\`\`bash
npx playwright codegen \\
  --target=typescript \\
  --load-storage=tests/.auth/admin.json \\
  --device="Desktop Chrome" \\
  -o tests/dashboard-stats.spec.ts \\
  https://app.example.com/dashboard
\`\`\`

The recording starts on the dashboard, logged in. As you interact, codegen writes to \`tests/dashboard-stats.spec.ts\`. Close the browser when done.

Finally, set up \`playwright.config.ts\` to use the same storage:

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'https://app.example.com',
    storageState: 'tests/.auth/admin.json',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
\`\`\`

\`npx playwright test\` runs the recording with the same auth state, in the same browser, at the same viewport. That is the entire pipeline from "I want to test this" to a green CI run.

## Tuning the recorded output

Codegen produces real Playwright code, but it is opinionated. The default locator order is:

1. Test IDs (\`data-testid\`)
2. Roles with accessible names (\`getByRole\`)
3. Labels (\`getByLabel\`)
4. Placeholder text (\`getByPlaceholder\`)
5. Text content (\`getByText\`)
6. Alt text (\`getByAltText\`)
7. Titles (\`getByTitle\`)

You can change the test ID attribute by setting \`testIdAttribute\` in your config:

\`\`\`typescript
export default defineConfig({
  use: {
    testIdAttribute: 'data-qa',
  },
});
\`\`\`

After this, \`getByTestId('login-button')\` resolves to \`[data-qa="login-button"]\` and codegen prefers it during recording.

## Generating assertions during recording

While recording, the Inspector toolbar offers three assertion buttons:

| Toolbar action | Output |
|---|---|
| Assert visibility | \`await expect(locator).toBeVisible();\` |
| Assert text | \`await expect(locator).toContainText('...');\` |
| Assert value | \`await expect(locator).toHaveValue('...');\` |

Click the toolbar button, then click the target element in the page. Codegen inserts the assertion into the running script.

## Limitations

Codegen does not detect:

- **Asynchronous network responses** that need explicit \`await page.waitForResponse(...)\`. Add these manually for tests that depend on API calls.
- **Animations** that need to complete before the next action. Playwright's auto-wait usually handles this, but for canvas/CSS animations you may need \`await page.waitForFunction(...)\`.
- **Custom fixtures** like authenticated sessions in projects. Use config-level \`storageState\` or your test fixtures instead.
- **Negative assertions**. \`toBeHidden()\`, \`not.toBeVisible()\` need manual insertion.

For everything else, the recorded code is production-grade. For deeper assertion catalogs, see the [Playwright Locator Best Practices](/blog/playwright-locator-best-practices-web-first-assertions-2026) guide.

## Codegen vs hand-written tests: when to use which

Codegen is great for bootstrap. Hand-written code is better for maintenance. The recommended workflow is:

1. **Codegen** to capture the initial happy path. Saves you 80% of the typing.
2. **Refactor** the recorded code into named functions and Page Objects.
3. **Add assertions** that codegen could not infer (negative cases, edge values).
4. **Hand-write** subsequent variants - codegen does not pay off when you already know what locators to use.

A 30-line recorded test usually becomes a 50-line tested-and-refactored test plus a 100-line page object. The recorded code is the seed, not the final product.

| Phase | Codegen | Hand-written |
|---|---|---|
| First test for a new feature | Yes | No |
| Variant tests of the same feature | No | Yes |
| Page Object Models | No | Yes |
| Negative cases | No | Yes |
| Setup/teardown utilities | No | Yes |

## Recording against multiple devices in sequence

To capture the same flow on desktop, tablet, and phone, run codegen three times with different \`--device\`:

\`\`\`bash
npx playwright codegen --target=typescript --device="Desktop Chrome" -o tests/desktop/login.spec.ts /login
npx playwright codegen --target=typescript --device="iPad Pro" -o tests/tablet/login.spec.ts /login
npx playwright codegen --target=typescript --device="iPhone 14 Pro" -o tests/mobile/login.spec.ts /login
\`\`\`

Each captures a separate file. After the recordings, you compare the three files - usually the locators are identical, which proves your application is responsive without device-specific selectors. If the locators differ (e.g., the mobile menu uses a different button), that is information you would not have gotten without the device-specific recordings.

## Codegen for legacy applications

For applications that rely heavily on CSS selectors or XPath (older Angular, jQuery sites), codegen still works but may produce less semantic locators. The output is often:

\`\`\`typescript
// Older application without good ARIA
await page.locator('#login-form > div:nth-child(2) > input').fill('user@example.com');
\`\`\`

For these cases, codegen is still useful as a starting point. After recording, refactor the brittle CSS selectors into more stable forms (\`getByPlaceholder\`, \`getByLabel\`, or \`getByTestId\` after adding \`data-testid\` to the markup).

## Frequently Asked Questions

### What does npx playwright codegen --target=typescript do?

It launches a browser, records your interactions, and generates Playwright TypeScript code that reproduces those interactions. The output is identical to hand-written tests using \`getByRole\`, \`getByLabel\`, and \`expect\`. With \`--output tests/login.spec.ts\` the code is written to disk and is immediately runnable via \`npx playwright test\`.

### How do I save the recorded test to a file?

Pass \`--output path/to/file.ts\` (alias \`-o\`). For example, \`npx playwright codegen --target=typescript -o tests/login.spec.ts https://example.com\`. Codegen creates intermediate directories if needed and overwrites existing files. The file is saved when you stop the recording.

### What is the difference between --target=typescript and --target=playwright-test?

\`--target=typescript\` produces TypeScript code with \`import { test, expect } from '@playwright/test'\` and a \`test('...', async ({ page }) => { })\` block. \`--target=playwright-test\` is the legacy alias for the same output. Use \`typescript\` in 2026 - it is the canonical name.

### How do I record a test that is already logged in?

Run \`npx playwright codegen --save-storage=auth.json\` once and complete the login flow. Then run codegen again with \`--load-storage=auth.json\` and your dashboard URL. The second session starts already authenticated, so the recorded test does not include the login steps.

### Can codegen record on mobile or tablet viewports?

Yes. Pass \`--device="iPhone 14 Pro"\` or any descriptor from \`devices\`. The browser launches with the matching viewport, user-agent, and touch support. The generated test does not include the device descriptor by default; add a project in \`playwright.config.ts\` to make it permanent.

### How do I change the color scheme during recording?

Pass \`--color-scheme=dark\` or \`--color-scheme=light\`. The browser applies the matching \`prefers-color-scheme\` media query. To make this part of the test, add \`test.use({ colorScheme: 'dark' })\` at the top of the spec file after recording.

### What locator priority does codegen use?

By default: test IDs (\`data-testid\`), then \`getByRole\`, \`getByLabel\`, \`getByPlaceholder\`, \`getByText\`, \`getByAltText\`, \`getByTitle\`. The test ID attribute can be changed via \`testIdAttribute\` in your Playwright config so codegen prefers a custom attribute like \`data-qa\`.

### Can I record against Chrome stable instead of Chromium?

Yes. Pass \`--channel=chrome\` (or \`--channel=msedge\` for Edge). This uses the system Chrome installation rather than the bundled Chromium build. It is the right choice when your app uses Chrome-specific APIs the bundled engine does not implement.

## Conclusion

\`npx playwright codegen --target=typescript -o tests/login.spec.ts\` is the canonical "record and replay" command for Playwright in 2026. With \`--save-storage\` / \`--load-storage\` you skip login on every recording. With \`--device\` / \`--color-scheme\` / \`--lang\` / \`--timezone-id\` you cover every form factor and locale your application supports. The output is real, runnable Playwright TypeScript that integrates with the standard test runner.

For your AI agent (Claude Code, Cursor, Aider) to write tests in the same style, install the [playwright-e2e skill](/skills/playwright-e2e) from QASkills.sh. The skill encodes the same locator priority and best practices codegen produces, so generated tests stay consistent across human-written and AI-written code.

Compare codegen with traditional record-and-replay tools in [Cypress vs Playwright 2026](/compare/cypress-vs-playwright-2026), or read the [Playwright Best Practices](/blog/playwright-best-practices-2026) guide to understand the assertion patterns codegen relies on.
`,
};
