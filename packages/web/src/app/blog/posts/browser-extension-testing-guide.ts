import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Browser Extension Testing Guide',
  description:
    'Test browser extensions across content scripts, service workers, permissions, storage, messaging, and store release checks with practical automation.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Browser Extension Testing Guide

An extension can pass every web-app test and still fail the moment Chrome loads it. The content script may not inject on the right host. The background service worker may be asleep when a message arrives. A permission prompt may change the installation path. Storage can persist between tests and hide a migration bug. Browser extension testing has its own surface area because the product lives between the browser, the page, and the extension runtime.

This guide covers Manifest V3 extension QA for teams that need confidence before submitting to browser stores or deploying internally. It focuses on content scripts, service workers, permissions, storage, messaging, options pages, popup UI, and release packaging. The examples use Playwright with Chromium because it can load unpacked extensions in a persistent context, which is the most practical automation path for many teams.

For MCP-specific browser-extension automation ideas, read the [Playwright MCP browser extension guide](/blog/playwright-mcp-browser-extension-guide-2026). For general web release checks around pages the extension touches, keep the [web testing checklist](/blog/web-testing-checklist-2026) nearby.

## Extension QA Is Not Only Web QA

A browser extension has at least four execution zones: the visited page, content scripts, extension pages such as popup or options, and the background service worker. Bugs often appear at the boundary between zones. A content script reads the DOM, sends a message, the service worker writes to storage, and a popup renders the result later. A normal web test sees only one side of that chain.

| Extension surface | Example failure | Test approach |
| --- | --- | --- |
| Manifest | Missing host permission, wrong content script match | Static validation plus load test |
| Content script | Injects twice, misses SPA navigation, breaks page CSS | Browser automation against target pages |
| Background service worker | Message listener not registered after wake-up | Service worker evaluation and messaging tests |
| Popup page | Reads stale storage or fails keyboard navigation | Extension page UI tests |
| Options page | Saves invalid configuration | Direct page test plus storage assertion |
| Store package | Includes dev files or wrong version | Build artifact inspection |

Treat the extension as a distributed application inside one browser profile. Each surface needs evidence.

## A Small Manifest Worth Testing

The example extension marks QA-related headings on approved sites and stores the number of headings it found. The manifest uses MV3, a service worker, storage permission, and a content script match.

\`\`\`json
{
  "manifest_version": 3,
  "name": "QA Heading Marker",
  "version": "1.0.0",
  "permissions": ["storage"],
  "host_permissions": ["https://example.test/*"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://example.test/*"],
      "js": ["content-script.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html"
  },
  "options_page": "options.html"
}
\`\`\`

This manifest is intentionally narrow. Wildcard host permissions and broad matches make testing harder and store review riskier. Start with the least permission needed, then test that the extension behaves correctly when it does not have access.

## Loading an Unpacked Extension With Playwright

Chromium extensions require a persistent browser context. The extension path must be passed as a launch argument. In headless automation, use a Chromium channel or environment that supports extension loading.

\`\`\`ts
// tests/extension-fixture.ts
import path from 'node:path';
import { chromium, type BrowserContext } from '@playwright/test';

export async function launchExtension(): Promise<{
  context: BrowserContext;
  extensionId: string;
}> {
  const extensionPath = path.join(process.cwd(), 'dist-extension');
  const userDataDir = path.join(process.cwd(), '.tmp', \`profile-\${Date.now()}\`);

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: false,
    args: [
      \`--disable-extensions-except=\${extensionPath}\`,
      \`--load-extension=\${extensionPath}\`,
    ],
  });

  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker');
  }

  const extensionId = new URL(serviceWorker.url()).host;

  return { context, extensionId };
}
\`\`\`

The service worker URL contains the extension id. Capture it once and use it to open extension pages such as \`chrome-extension://<id>/popup.html\`.

## Testing Content Script Injection

Content scripts should be tested on pages that resemble real targets. If your extension supports GitHub, test GitHub-like markup. If it supports an internal admin tool, test that shape. The example below serves a simple page and checks that the content script annotated headings and recorded a count.

\`\`\`ts
// tests/content-script.spec.ts
import { test, expect } from '@playwright/test';
import { launchExtension } from './extension-fixture';

test('content script marks headings on allowed host', async () => {
  const { context, extensionId } = await launchExtension();
  const page = await context.newPage();

  await page.goto('https://example.test/release-notes');
  await page.setContent(\`
    <article>
      <h1>Release QA Notes</h1>
      <h2>Checkout fixes</h2>
      <p>Payment validation updated.</p>
    </article>
  \`);

  await expect(page.locator('h1[data-qa-heading="true"]')).toHaveText('Release QA Notes');
  await expect(page.locator('h2[data-qa-heading="true"]')).toHaveText('Checkout fixes');

  const popup = await context.newPage();
  await popup.goto(\`chrome-extension://\${extensionId}/popup.html\`);
  await expect(popup.getByText('2 headings marked')).toBeVisible();

  await context.close();
});
\`\`\`

This test checks two boundaries: page DOM modification and extension UI state. If your content script only changes the page but the popup reads nothing, you have not tested the full feature.

## Messaging and Service Worker Wake-Up

Manifest V3 background scripts run as service workers. They can stop between events. Tests should verify that message listeners work after the worker is active, not only immediately after install.

\`\`\`js
// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'heading-counted') {
    chrome.storage.local.set({ headingCount: message.count }, () => {
      sendResponse({ stored: true });
    });
    return true;
  }

  sendResponse({ stored: false });
  return false;
});
\`\`\`

\`\`\`js
// content-script.js
const headings = Array.from(document.querySelectorAll('h1, h2'));

for (const heading of headings) {
  heading.setAttribute('data-qa-heading', 'true');
}

chrome.runtime.sendMessage(
  { type: 'heading-counted', count: headings.length },
  () => undefined,
);
\`\`\`

The callback pattern is old-fashioned but still common in extension APIs. If \`sendResponse\` happens asynchronously, returning \`true\` keeps the message channel open.

## Storage Isolation and Migration Tests

Extension storage persists in the browser profile. That is useful for users and dangerous for tests. Each test should use a fresh profile or explicitly clear storage. Persistent context profiles make this visible: if you reuse the same user data directory, old settings remain.

Test storage migrations with real stored values. For example, if version 1 stored \`headingCount\` as a string and version 2 expects a number, create the old value before loading the options page.

| Storage case | Setup | Expected check |
| --- | --- | --- |
| Fresh install | Empty \`chrome.storage.local\` | Defaults appear in popup and options |
| Existing user | Preload valid settings | UI reflects saved values |
| Migration | Preload old schema | New schema is written and old key is ignored or removed |
| Corrupt value | Preload invalid type | Extension falls back safely and logs useful error |
| Sync unavailable | Mock or disable sync path where possible | Local behavior still works |

Do not rely on manual browser profiles for migration testing. They are hard to reproduce and easy to contaminate.

## Permissions and Host Access

Permission testing should cover both access and denial. If an extension claims to work only on \`https://example.test/*\`, it should not inject into \`https://other.example/\`. If optional permissions are used, test the user journey before and after permission is granted.

Checklist for permission behavior:

- Manifest host permissions are the minimum required.
- Content scripts do not inject on unsupported hosts.
- The popup explains unavailable state without crashing.
- Optional permission requests are tied to a user action.
- Revoked permissions produce a recoverable state.
- Store descriptions match actual permissions.

Permissions are a product trust issue, not only a technical setting. Overbroad access increases review friction and user suspicion.

## Popup and Options Page Testing

Popup pages are small, but they have unique constraints. They open and close quickly, have limited space, and often read extension storage during startup. Test them like real UI:

- Keyboard navigation.
- Focus order.
- Empty and configured states.
- Long localized strings.
- Dark mode if supported.
- Error state when storage or messaging fails.

Options pages deserve deeper tests because they define persistent behavior. Invalid options should be rejected. Saved options should affect content scripts on the next matching page load.

## Cross-Browser Extension Reality

Chrome, Edge, and other Chromium browsers are close enough that one automation path may cover much of the behavior. Firefox extension support differs in API details and manifest support. Safari extensions have their own packaging and review model. Decide which browsers are part of the support promise before writing the matrix.

| Browser family | Automation notes | QA emphasis |
| --- | --- | --- |
| Chrome | Strongest Playwright unpacked-extension path in Chromium | MV3 behavior, service worker, store package |
| Edge | Chromium-based with enterprise policy differences | Managed deployment, permissions, identity |
| Firefox | WebExtensions support with differences | API compatibility and manifest behavior |
| Safari | Different extension packaging path | Native wrapper, permissions, App Store review |

Do not claim cross-browser support because the content script uses standard DOM APIs. The extension runtime is the compatibility surface.

## Store Submission and Package Checks

Before store submission, inspect the package:

- Version matches release notes.
- Manifest permissions match the privacy disclosure.
- Source maps are intentional.
- No test fixtures, secrets, or local config files are included.
- Icons meet required sizes.
- Screenshots match current UI.
- Minified code still preserves license obligations.
- The extension loads from the packaged artifact, not the source directory.

Run automation against the built package. Testing \`src/\` while submitting \`dist-extension/\` leaves a gap exactly where build tooling can break paths.

## Single-Page Apps and Re-Injection

Many target sites are single-page applications. A content script that runs at \`document_idle\` may handle the first page load and miss route changes that update the DOM without a full navigation. Test this explicitly if your extension supports apps with client-side routing.

Patterns to verify:

- The script observes route changes or DOM mutations only where needed.
- The same element is not annotated twice after navigation.
- Cleanup happens when the user moves away from a supported view.
- Performance remains acceptable on pages with large DOM trees.
- The extension does not break the host app's event handlers.

Use controlled test pages that simulate route changes with \`history.pushState\` and dynamic DOM replacement. Real websites can be part of exploratory testing, but deterministic SPA fixtures are better for CI.

## Shadow DOM, Iframes, and Page Isolation

Content scripts do not automatically behave the same way inside every DOM boundary. If the product claims to support widgets inside iframes or Shadow DOM, write dedicated tests. If it does not support them, make sure the extension fails gracefully.

Important cases:

- Same-origin iframe where injection is expected.
- Cross-origin iframe where direct DOM access is restricted.
- Open Shadow DOM where selectors can reach through only if code handles it.
- Closed Shadow DOM where the extension must not assume access.
- Pages with strict Content Security Policy.

These cases are easy to ignore until a customer installs the extension on a modern SaaS application that uses web components heavily.

## Accessibility and Keyboard Testing for Extension UI

Popup and options pages are small, but accessibility still matters. Store reviewers and enterprise customers may inspect keyboard access, focus management, contrast, and screen reader names. A popup with three controls can still trap focus or expose unlabeled buttons.

Check:

- The first interactive element receives a logical focus target.
- All actions work with keyboard.
- Toggle state is exposed through labels and ARIA where needed.
- Error messages are announced or visible.
- The popup does not require hover.
- Text fits under localized strings.

Extension UI often ships without the design-system coverage of the main app. That makes basic accessibility tests more valuable, not less.

## Release Channels and Enterprise Policy

Browser extensions are frequently deployed through multiple channels: local development, internal testing, store beta, public store, and enterprise policy. Each channel can have different update timing, permissions, and installation behavior.

| Channel | QA focus | Common miss |
| --- | --- | --- |
| Local unpacked | Fast functional checks | Works from source but not packaged output |
| Internal test build | Upgrade and migration | Old storage schema not migrated |
| Store beta | Review metadata and install path | Permission copy mismatches manifest |
| Public store | Production monitoring and support | Slow rollout hides version fragmentation |
| Enterprise policy | Managed install and locked settings | Options UI allows changes policy should prevent |

Record the version under test in screenshots, logs, and bug reports. Extension bugs are hard to triage when users may have several versions installed across managed and unmanaged browsers.

## Performance and Host Page Safety

An extension can damage the page it is trying to help. Content scripts should avoid expensive global selectors, repeated mutation processing, layout thrashing, and large synchronous storage reads. Add performance smoke checks on pages with realistic DOM size.

For host page safety, verify that:

- Global CSS from the extension does not leak into the page.
- Injected elements have namespaced classes or Shadow DOM isolation.
- Event listeners are removed when no longer needed.
- The extension handles pages that redefine globals.
- Errors in the content script do not break page scripts.

The best extension tests include a hostile but realistic page fixture: many nodes, nested components, delayed content, and existing styles that could collide with yours.

## Upgrade Testing From One Version to the Next

Extension users do not reinstall from scratch on every release. They upgrade with existing storage, existing permissions, pinned toolbar state, and sometimes managed enterprise settings. Test upgrade paths with the previous production version whenever storage schema, permissions, background behavior, or options change.

An upgrade test should install the old package, create realistic stored state, close the browser, load the new package with the same profile, and verify migration. This is slower than a fresh install test, so keep it focused on releases that change persistent behavior.

Watch for:

- Removed options still referenced by popup UI.
- New required settings without defaults.
- Permission changes that require user approval.
- Content script behavior changing before options migrate.
- Service worker errors on first start after upgrade.

## Error Handling and Recovery

Extensions run in messy environments. Users disable permissions, pages block scripts, storage calls fail, and browser updates change timing. A test plan should include controlled failure states instead of only the sunny path.

Recovery expectations:

- Popup shows a useful unavailable message on unsupported pages.
- Options page validates bad input before saving.
- Content script catches and logs non-fatal DOM errors.
- Background worker handles unknown messages.
- Storage failure does not leave partial settings.
- Permission denial keeps the extension installed and recoverable.

These cases are small, but they protect reviews and support. A one-line undefined error in a popup can look like the whole extension is broken.

## Privacy Review as a Test Artifact

Browser stores and enterprise customers care about data collection. QA should verify that the extension only collects what the manifest, privacy policy, and product copy claim. If the extension reads page content, stores snippets, or sends URLs to a backend, test those flows with a privacy checklist.

Ask:

- Which page data leaves the browser?
- Is data sent only after user action or always on page load?
- Are sensitive fields filtered?
- Can the user disable collection where promised?
- Do logs include full URLs with tokens?
- Does uninstall or sign-out clear local data when required?

Privacy defects are not always visible in UI automation. Use network inspection, storage inspection, and code review together.

## Network Requests From the Extension

If the extension calls a backend, test those requests separately from page behavior. Verify authentication headers, retry behavior, offline handling, and what happens when the backend returns \`401\`, \`429\`, or \`500\`. A content script should not spam a backend on every DOM mutation. A popup should show a recoverable state when the user is offline.

Network assertions can use browser context routing in automation or a test backend that records requests. The important part is to prove the extension sends only the data it claims to send and handles failure without breaking the host page.

## Manual Exploratory Sessions Still Matter

Automation covers repeatable extension behavior, but exploratory testing finds awkward browser interactions: pinned versus unpinned toolbar state, multiple windows, profile switching, incognito rules, browser updates, and conflicts with popular extensions. Schedule focused exploratory sessions before store release, using a checklist tied to the extension's permissions and target sites.

Record browser version, extension version, profile state, and installed companion extensions in every bug. Without that context, extension defects are unusually hard to reproduce.

Keep at least one clean browser profile for comparison during exploratory sessions. Many extension bugs are actually profile-state bugs, and the clean profile tells you whether the defect follows the extension, the account, or the user's accumulated browser state.

## Frequently Asked Questions

### Can Playwright test Chrome extensions?

Yes, with Chromium persistent contexts and an unpacked extension loaded through launch arguments. Use the service worker URL to derive the extension id for popup and options pages.

### Why do extension tests leak state between runs?

The browser profile persists extension storage. Use a fresh user data directory per test or explicitly clear \`chrome.storage\` before each scenario.

### Should I test content scripts on real websites?

Use controlled fixtures for deterministic CI and a smaller smoke set on real target pages if terms and stability allow it. Real sites change often, so keep them out of the core blocking suite unless necessary.

### What is the biggest Manifest V3 testing risk?

Background service worker lifecycle. Code that works immediately after install may fail after the worker sleeps and wakes on a later message or event.

### Do I need separate tests for the store package?

Yes. Test the built artifact that users receive. Packaging can break paths, include unintended files, omit icons, or change manifest values.
`,
};
