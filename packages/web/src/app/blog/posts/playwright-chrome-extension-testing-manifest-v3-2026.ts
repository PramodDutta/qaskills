import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Chrome Extension Testing (Manifest V3) Guide 2026',
  description:
    'Test Chrome extensions with Playwright in 2026: load MV3 via launchPersistentContext, reach the service worker, get the extension ID, test popups and scripts.',
  date: '2026-06-20',
  category: 'Guide',
  content: `
# Playwright Chrome Extension Testing for Manifest V3 in 2026

Testing a Chrome extension end to end has always been awkward. Extensions are not a normal web page, they inject themselves into other pages, run background logic out of view, and expose UI through special chrome-extension:// URLs. Playwright handles all of this, but only if you set up the browser context correctly, and in 2026 there is one rule that trips up nearly everyone: Playwright dropped support for Manifest V2 extensions. Your extension must be Manifest V3 (MV3), with a service worker instead of a persistent background page. If you are still on MV2, that is the first thing to fix.

The second thing people miss is that extensions cannot be loaded into a normal, ephemeral browser context. Chrome only loads unpacked extensions when the browser runs with a persistent user-data directory, which means you must use chromium.launchPersistentContext rather than the usual browser.newContext. On top of that, extensions historically required headed mode; with Chrome's newer headless implementation this has loosened, but a persistent context is still mandatory. Get those two facts right and the rest is straightforward.

This guide is a practical, runnable walkthrough for testing an MV3 extension with Playwright. We will load an unpacked extension, reach into its service worker to grab the dynamically assigned extension ID, navigate to its popup and options pages, verify a content script on a real page, and finally run the whole thing in CI under xvfb. Every code sample is real TypeScript you can drop into a Playwright project. If you want the broader 2026 context first, see [what is new in Playwright](/blog/whats-new-in-playwright-2026) and the deep dive on the [Playwright 1.59 agentic release features](/blog/playwright-1-59-agentic-release-features-guide).

## Key Takeaways

- Playwright in 2026 only supports Manifest V3 extensions; MV2 is no longer loadable.
- Extensions require chromium.launchPersistentContext with a real user-data directory.
- Load the unpacked build with --disable-extensions-except and --load-extension.
- The extension ID is assigned at load time; read it from the service worker URL.
- Popup and options pages live at chrome-extension://ID/page.html and are testable like any page.
- Content scripts are verified by opening a real site and asserting their injected effects.
- CI needs a display, so wrap the run in xvfb-run on Linux.

---

## MV2 vs MV3 testing at a glance

The Manifest version changes more than a config file; it changes how the background logic runs and therefore how you reach it from a test. The table below summarizes what matters for testing.

| Aspect | Manifest V2 | Manifest V3 |
|---|---|---|
| Playwright support in 2026 | Dropped, not loadable | Supported |
| Background context | Persistent background page | Service worker |
| How you reach background | context.backgroundPages() | context.serviceWorkers() |
| Background lifecycle | Always running | Event-driven, can sleep |
| Getting the extension ID | From background page URL | From service worker URL |
| Recommended approach in 2026 | Migrate to MV3 | Use directly |

The practical takeaway: any guide or Stack Overflow answer that tells you to use context.backgroundPages() is written for MV2 and will not work for a modern extension. For MV3 you use context.serviceWorkers() and, when the worker has not started yet, context.waitForEvent('serviceworker').

---

## A minimal MV3 manifest to test against

So the samples are concrete, here is a small but complete Manifest V3 file. It declares a popup, an options page, a service worker, and a content script that runs on every page. Save it as manifest.json in your extension directory.

\`\`\`json
{
  "manifest_version": 3,
  "name": "Sample MV3 Extension",
  "version": "1.0.0",
  "description": "Minimal extension used for Playwright testing.",
  "action": {
    "default_popup": "popup.html",
    "default_title": "Open sample popup"
  },
  "options_page": "options.html",
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "permissions": ["storage"]
}
\`\`\`

The content script can be trivial; it just needs to leave an observable trace on the page so a test can assert it ran.

\`\`\`javascript
// content.js - injected into every page the user visits
const badge = document.createElement("div");
badge.id = "ext-badge";
badge.textContent = "injected by sample extension";
badge.style.position = "fixed";
badge.style.bottom = "0";
badge.style.right = "0";
document.documentElement.appendChild(badge);
\`\`\`

---

## Loading an unpacked extension with launchPersistentContext

This is the core of the whole setup. You point Playwright at a persistent user-data directory and pass two Chromium flags: --disable-extensions-except (so only your extension loads, nothing the profile may have cached) and --load-extension (the absolute path to the unpacked build). Both flags must reference the same absolute path.

\`\`\`typescript
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';

const pathToExtension = path.join(__dirname, '..', 'dist'); // your built extension

export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      // headless: false is the safe default; new headless can work but headed is reliable
      headless: false,
      args: [
        \`--disable-extensions-except=\${pathToExtension}\`,
        \`--load-extension=\${pathToExtension}\`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // resolved below from the service worker
    let [worker] = context.serviceWorkers();
    if (!worker) {
      worker = await context.waitForEvent('serviceworker');
    }
    const extensionId = new URL(worker.url()).host;
    await use(extensionId);
  },
});

export const expect = test.expect;
\`\`\`

Passing an empty string as the user-data directory tells Playwright to create a fresh temporary profile per run, which keeps tests isolated. If you need persistence across runs (for example a logged-in state), pass a real directory path instead.

---

## Reaching the MV3 service worker and the extension ID

Chrome assigns every unpacked extension a 32-character ID at load time, and it is not stable across machines, so you cannot hardcode it. The reliable way to discover it is to inspect the service worker's URL, which has the form chrome-extension://EXTENSION_ID/background.js. The host portion of that URL is the ID.

The subtlety with MV3 is that the service worker is event-driven and may not have started the instant your context is ready. That is why the fixture above checks context.serviceWorkers() first and falls back to context.waitForEvent('serviceworker'). Here is the same logic as a standalone helper you can call anywhere.

\`\`\`typescript
import { type BrowserContext, type Worker } from '@playwright/test';

export async function getExtensionId(context: BrowserContext): Promise<string> {
  let worker: Worker | undefined = context.serviceWorkers()[0];
  if (!worker) {
    worker = await context.waitForEvent('serviceworker');
  }
  // chrome-extension://<id>/background.js  ->  <id>
  return new URL(worker.url()).host;
}
\`\`\`

You can also evaluate code inside the service worker, which is useful for asserting background state or seeding chrome.storage before a test runs.

\`\`\`typescript
const [worker] = context.serviceWorkers();
const storedValue = await worker.evaluate(async () => {
  const data = await chrome.storage.local.get('counter');
  return data.counter ?? 0;
});
expect(storedValue).toBe(0);
\`\`\`

---

## Testing the popup page

The popup is just an HTML page served from the extension's origin, so once you have the ID you navigate to it like any other URL and drive it with normal Playwright locators. Open a fresh page in the persistent context, go to chrome-extension://ID/popup.html, and assert against its contents.

\`\`\`typescript
import { test, expect } from './fixtures';

test('popup renders and responds to a click', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(\`chrome-extension://\${extensionId}/popup.html\`);

  await expect(page.getByRole('heading', { name: 'Sample popup' })).toBeVisible();

  await page.getByRole('button', { name: 'Increment' }).click();
  await expect(page.getByTestId('counter')).toHaveText('1');
});
\`\`\`

Because the popup runs in the extension origin, it has full access to chrome.* APIs, so any logic that reads or writes chrome.storage works exactly as it would when a user clicks the toolbar icon. You do not need to simulate the toolbar click; navigating directly to popup.html is the standard, reliable approach.

---

## Testing the options page

The options page works identically; only the filename changes. This makes it easy to cover settings flows, persistence, and validation. The example below sets a preference, reloads, and confirms it persisted through chrome.storage.

\`\`\`typescript
import { test, expect } from './fixtures';

test('options page persists a setting', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(\`chrome-extension://\${extensionId}/options.html\`);

  await page.getByLabel('Enable dark mode').check();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved')).toBeVisible();

  // Reload and confirm the value survived
  await page.reload();
  await expect(page.getByLabel('Enable dark mode')).toBeChecked();
});
\`\`\`

---

## Testing content scripts on a real page

Content scripts are the trickiest part because they run inside other websites, not inside the extension origin. The test pattern is simple: navigate to a real page, then assert that the side effect your content script produces is present. Using the badge element from our content.js above, the test reads like this.

\`\`\`typescript
import { test, expect } from './fixtures';

test('content script injects a badge into a normal page', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('https://example.com');

  const badge = page.locator('#ext-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText('injected by sample extension');
});
\`\`\`

Two practical notes. First, give the content script a deterministic, queryable anchor (a stable id or data-testid) so your assertion is not brittle. Second, if your script injects after some delay or network event, prefer Playwright's auto-waiting locators (toBeVisible) over manual timeouts; they retry until the element appears or the test times out.

---

## Launch options reference

These are the options and flags you will reach for most when testing extensions. Keep them straight, because mixing up the page-versus-worker accessors is the most common source of confusion.

| Option or call | Purpose |
|---|---|
| chromium.launchPersistentContext(userDataDir, opts) | Required to load any extension |
| --load-extension=PATH | Tells Chromium where the unpacked build is |
| --disable-extensions-except=PATH | Ensures only your extension loads |
| headless: false | Safe default; new headless can work but headed is reliable |
| context.serviceWorkers() | Returns already-started MV3 background workers |
| context.waitForEvent('serviceworker') | Waits for the worker if it has not started |
| worker.evaluate(fn) | Runs code inside the service worker (chrome.* APIs) |
| chrome-extension://ID/popup.html | Direct URL to test popup and options pages |

A common mistake is passing args to browser.newContext or browser.launch and wondering why the extension never loads. Extension flags only take effect through launchPersistentContext.

---

## Running extension tests in CI with xvfb

Because the most reliable configuration is headed, CI needs a display server. On Linux runners there is none by default, so wrap the Playwright command in xvfb-run, which spins up a virtual framebuffer. This is the standard pattern for any headed Playwright run, not just extensions.

\`\`\`bash
# Install browsers and the system deps Playwright needs
npx playwright install --with-deps chromium

# Run the suite under a virtual display so headed mode works in CI
xvfb-run -a npx playwright test
\`\`\`

In a GitHub Actions workflow the run step is a single line, since the ubuntu-latest image already provides xvfb.

\`\`\`bash
# .github/workflows/extension-tests.yml run step
xvfb-run -a npx playwright test --reporter=line
\`\`\`

If your extension build is produced by a separate step (webpack, vite, or similar), make sure the build runs before the test step so the dist directory referenced by --load-extension actually exists when Playwright launches.

---

## Seeding and asserting chrome.storage state

Real extension tests rarely start from a blank slate. You often need to pre-populate chrome.storage so the popup renders a known state, or read it back afterward to confirm a user action persisted. Because the service worker runs in the extension origin with full chrome.* access, you can drive storage directly through worker.evaluate, which is far more reliable than clicking through the UI just to set up fixtures.

\`\`\`typescript
import { test, expect } from './fixtures';

test('popup reflects pre-seeded storage', async ({ context, extensionId }) => {
  // Seed storage via the service worker before opening the popup
  const [worker] = context.serviceWorkers();
  await worker.evaluate(async () => {
    await chrome.storage.local.set({ counter: 5, theme: 'dark' });
  });

  const page = await context.newPage();
  await page.goto(\`chrome-extension://\${extensionId}/popup.html\`);

  // The popup should render the seeded value
  await expect(page.getByTestId('counter')).toHaveText('5');
});
\`\`\`

The reverse direction, asserting that a UI action wrote the expected value, follows the same pattern. Drive the popup, then read storage back through the worker.

\`\`\`typescript
test('clicking increment persists to storage', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(\`chrome-extension://\${extensionId}/popup.html\`);

  await page.getByRole('button', { name: 'Increment' }).click();

  const [worker] = context.serviceWorkers();
  const stored = await worker.evaluate(async () => {
    const data = await chrome.storage.local.get('counter');
    return data.counter;
  });
  expect(stored).toBe(1);
});
\`\`\`

This split, manipulate state through the worker and verify behavior through the UI, keeps tests fast and deterministic. It also isolates failures: if storage seeding works but the popup does not reflect it, you know the bug is in rendering, not persistence.

---

## Capturing screenshots and traces for debugging

Extension UIs render in a real browser, so Playwright's standard debugging artifacts work unchanged. Enabling traces is especially valuable for extension tests because the popup and content-script interactions can be hard to reason about after the fact. Turn on trace recording in your config and the failure artifacts include a full DOM snapshot of the popup at every step.

\`\`\`bash
# Run with tracing on for every test, then open the trace
npx playwright test --trace on
npx playwright show-trace trace.zip
\`\`\`

For a quick visual check during development, a screenshot of the popup confirms it actually rendered before you start writing assertions, which saves time when a selector is wrong.

\`\`\`typescript
const page = await context.newPage();
await page.goto(\`chrome-extension://\${extensionId}/popup.html\`);
await page.screenshot({ path: 'popup.png' });
\`\`\`

---

## Common pitfalls

A few recurring problems are worth naming so you can skip the debugging. First, an empty or wrong extension path: if --load-extension points at a folder without a manifest.json, Chromium silently loads nothing and context.serviceWorkers() stays empty forever, so a waitForEvent call hangs until timeout. Always confirm the path resolves to your built manifest.

Second, expecting backgroundPages() to work: that is MV2-only. For MV3 you must use serviceWorkers(). Third, the worker sleeping: MV3 workers are event-driven and can be terminated when idle, so do not assume one is always running; re-acquire it with waitForEvent if needed. Fourth, forgetting that the extension ID changes per environment, hardcode it once and your CI breaks the moment Chrome reassigns it.

Fifth, passing a relative extension path: Chromium resolves --load-extension relative to its own working directory, not your test file, so always pass an absolute path via path.join(__dirname, ...). Sixth, reusing a persistent user-data directory across runs without cleanup: stale storage from a previous test can leak into the next one and cause flaky, order-dependent failures, so prefer the empty-string temporary profile unless you specifically need persistence. Seventh, building the extension after Playwright launches: if your bundler writes to dist concurrently, the manifest may be missing at load time, so always complete the build step before the test command runs.

---

## Frequently Asked Questions

### Can Playwright test Chrome extensions?

Yes. Playwright can load an unpacked Chrome extension and test its popup, options page, service worker, and content scripts. The key requirement is launching with chromium.launchPersistentContext and passing the --load-extension and --disable-extensions-except flags. In 2026 the extension must be Manifest V3, because Playwright no longer supports loading Manifest V2 extensions.

### How do I load an extension in Playwright?

Use chromium.launchPersistentContext with a user-data directory and two args: --disable-extensions-except set to your unpacked build path, and --load-extension set to the same absolute path. A normal browser.newContext cannot load extensions because Chrome only loads unpacked extensions when running against a persistent profile, so launchPersistentContext is mandatory.

### How do I get the extension ID in Playwright?

The extension ID is assigned at load time and is not stable, so read it at runtime instead of hardcoding. Grab the MV3 service worker via context.serviceWorkers() (or context.waitForEvent('serviceworker') if it has not started yet), then take the host portion of its URL: new URL(worker.url()).host. That host is the 32-character extension ID you use to build chrome-extension:// URLs.

### Does Playwright support Manifest V2 extensions?

No. As of 2026 Playwright has dropped support for Manifest V2 extensions, so they cannot be loaded. Your extension must be Manifest V3, which uses a service worker rather than a persistent background page. If you are still on MV2, migrate to MV3 first; any guide telling you to use context.backgroundPages() is written for the old, unsupported model.

### Can I run Playwright extension tests in headless mode?

Historically extensions required headed mode, and headed remains the most reliable choice. Chrome's newer headless implementation can load extensions in some configurations, but a persistent context via launchPersistentContext is always required. In CI the safe pattern is to run headed under xvfb-run on Linux, which provides the virtual display headed mode needs.

### How do I test a content script with Playwright?

Navigate to a real web page in the persistent context, then assert on the side effects your content script produces, such as an injected DOM element or a modified value. Give the script a stable anchor like a fixed id or data-testid, then use an auto-waiting locator (toBeVisible) so the test retries until the script has run rather than relying on fixed timeouts.

### Why is context.serviceWorkers() empty in my extension test?

The two usual causes are an invalid extension path and a not-yet-started worker. If --load-extension points at a folder without a valid manifest.json, Chromium loads nothing and the worker list stays empty. If the path is correct, the MV3 worker may simply not have spun up yet, so await context.waitForEvent('serviceworker') instead of reading the array immediately.

---

## Conclusion

Testing Chrome extensions with Playwright in 2026 comes down to a few non-negotiable rules: your extension must be Manifest V3, you must launch through chromium.launchPersistentContext, and you reach the background logic through the service worker rather than a background page. Once those are in place, the rest is ordinary Playwright: navigate to chrome-extension:// URLs to test popups and options, open real sites to verify content scripts, and drive everything with the same auto-waiting locators you already use.

Wrap the suite in xvfb-run for CI, give every injected element a stable selector, and read the extension ID from the worker URL instead of hardcoding it. Follow that pattern and extension tests become as boring and reliable as the rest of your suite.

Want ready-made Playwright skills for your AI coding agent? Browse the QA skills directory at [/skills](/skills) and install Playwright testing skills straight into Claude Code, Cursor, and the other 30+ agents we support.
`,
};
