import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Electron App Testing Guide',
  description: 'Electron app testing guide for Playwright-driven desktop QA across main process, renderer UI, IPC, packaging, native dialogs, updates, and persistence.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# Electron App Testing Guide

The renderer looks like a web app until the bug lives in the main process. A menu item dispatches the wrong IPC message, a packaged build cannot find a preload script, or a file dialog behaves differently outside development. Electron QA has to cross that boundary deliberately.

Electron applications combine Chromium renderer code, a Node-powered main process, preload scripts, native menus, filesystem access, packaging, and operating system integration. You can test many renderer components like ordinary web code, but end-to-end confidence requires launching the Electron app and asserting behavior through the desktop shell it actually uses.

This guide focuses on practical test layers for Electron apps with Playwright, Node test runners, and package verification. For browser-only coverage that still applies to renderer UI, use [a web testing checklist for 2026](/blog/web-testing-checklist-2026). For broader flow design, compare the desktop-specific concerns here with [end-to-end testing best practices](/blog/end-to-end-testing-best-practices).

## Separate renderer confidence from desktop confidence

Do not run every button test through a packaged Electron app. Renderer components, forms, and pure UI state can be tested with the same tools you use for React, Vue, Svelte, or plain DOM code. Reserve Electron end-to-end tests for behavior that depends on main process wiring, preload APIs, menus, dialogs, filesystem access, deep links, notifications, protocol handlers, and packaging.

| Layer | What it catches | Preferred tool shape |
|---|---|---|
| Pure domain logic | Parsing, validation, business rules | Normal unit tests in Node |
| Renderer component | UI states and accessibility roles | Component tests or DOM tests |
| Preload contract | Exposed API shape and argument validation | Isolated tests plus E2E smoke |
| Main process | Windows, menus, IPC handlers, app lifecycle | Playwright Electron launch |
| Packaged build | Missing assets, signing assumptions, path bugs | Smoke tests against built artifact |

This split keeps the suite fast while preserving coverage where Electron is unique. A flaky desktop E2E test for every text field is a maintenance cost, not a quality strategy.

## Launching Electron with Playwright

Playwright exposes an Electron launcher through \`_electron\`. The common development pattern is to launch your app entry point, get the first window, and use normal Playwright locators against the renderer.

\`\`\`ts
import { test, expect, _electron as electron } from '@playwright/test';

let electronApp: Awaited<ReturnType<typeof electron.launch>>;

test.afterEach(async () => {
  await electronApp?.close();
});

test('opens the dashboard window', async () => {
  electronApp = await electron.launch({ args: ['.'] });
  const page = await electronApp.firstWindow();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Project' })).toBeEnabled();

  const appName = await electronApp.evaluate(async ({ app }) => app.getName());
  expect(appName).toBeTruthy();
});
\`\`\`

The renderer assertions use Playwright's normal web-first waiting. The main-process assertion uses \`electronApp.evaluate\` to run inside Electron's main process context. Keep main-process evaluations short and explicit. You are testing app behavior, not building a second automation framework inside the app.

## IPC contracts need negative tests too

IPC is one of the highest-risk Electron seams. The renderer asks for privileged work through a preload API. The main process handles the request. If argument validation is weak, a renderer bug can become a filesystem or security bug.

A preload API should expose a narrow surface, not raw \`ipcRenderer\`. Test the renderer-visible contract and at least one invalid input path.

\`\`\`ts
import { test, expect, _electron as electron } from '@playwright/test';

test('settings IPC round trip rejects invalid theme values', async () => {
  const app = await electron.launch({ args: ['.'] });
  const page = await app.firstWindow();

  const apiKeys = await page.evaluate(() => Object.keys(window.desktopSettings));
  expect(apiKeys).toContain('setTheme');

  const result = await page.evaluate(async () => {
    try {
      await window.desktopSettings.setTheme('neon-rainbow');
      return 'accepted';
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  });

  expect(result).toMatch(/invalid theme/i);
  await app.close();
});
\`\`\`

This test assumes the application exposes \`window.desktopSettings.setTheme\` from preload. The exact API should be yours, but the principle is constant: test the public preload contract from the renderer, and verify bad inputs are rejected before they reach privileged work.

## Main process behavior that deserves E2E coverage

The main process owns app lifecycle and native integration. It is tempting to leave it to manual testing because it has fewer lines than the renderer. That is a mistake. Many production-only Electron bugs live there.

| Main process feature | Risk | Test signal |
|---|---|---|
| Window creation | Blank or incorrectly sized first window | First window appears with expected route and title |
| Native menu | Wrong command or disabled state | Menu action triggers visible renderer change |
| File open/save | Path handling and permissions | Stub or temp directory receives expected file |
| Protocol handler | Deep link parsing | Launch with URL and assert routed state |
| Auto update UI | Incorrect update state messaging | Mock update events and assert renderer notification |
| App quit behavior | Unsaved work loss | Attempt close and assert confirmation flow |

Keep these tests few and meaningful. A desktop smoke suite that launches the app, verifies the main window, exercises one IPC path, checks a menu command, and opens a packaged build catches more Electron-specific risk than dozens of renderer-only clicks.

## Packaging changes the filesystem

Development Electron apps often load assets from source paths. Packaged apps load from an asar archive or build output. A test that launches \`args: ['.']\` can pass while the packaged app fails to find icons, preload scripts, migrations, or worker files.

Add at least one smoke test against the packaged artifact in CI after packaging. The exact launch command depends on your builder and operating system, but the assertions should be the same: window appears, preload API exists, critical route loads, and a simple persisted setting survives restart.

| Asset or path | Development failure chance | Packaged failure chance | Test idea |
|---|---|---|---|
| Preload script | Low if loaded from source | High when path is computed incorrectly | Assert preload API keys exist. |
| App icon | Medium | Medium | Check platform package manually or via metadata. |
| Local database file | Medium | High | Write setting, restart, read setting. |
| Worker script | Low | High | Trigger feature that starts worker. |
| Static help docs | Medium | High | Open help route from menu. |

Do not postpone packaged testing until release day. Packaging failures are often deterministic and cheap to catch once the build artifact exists.

## Dialogs, downloads, and files

Electron apps frequently use native file dialogs. Automated tests should avoid relying on human interaction with those dialogs. Prefer designing the app so file paths can be injected in test mode or so lower-level file operations are covered by integration tests.

When you do need to test renderer behavior around a file workflow, use temporary directories and predictable files. Verify the visible result and the actual filesystem side effect. Clean up after the test. Do not write to a developer's home directory or shared desktop folder.

For save flows, assert that invalid paths produce a user-visible error and valid paths create the expected file. For import flows, assert both parse success and parse failure. A desktop app that silently ignores a bad CSV is worse than a web form that shows a validation message.

## Flake control for Electron tests

Electron E2E tests are heavier than browser tests. They start a process, create windows, load app code, and may touch disk. Stability comes from process isolation and precise waits.

Use one app instance per test unless startup cost is truly prohibitive. Close the app in \`afterEach\`. Use unique temp directories. Disable update checks and analytics in test configuration. Wait for app-specific readiness, not a fixed timeout after launch. Keep OS-level assumptions documented.

Avoid running desktop E2E tests in highly parallel mode until you prove the app supports it. Shared ports, lock files, single-instance behavior, and global shortcuts can collide across workers.

## Security checks belong near IPC and preload

Electron security guidance is not just for auditors. It affects test design. If context isolation is enabled and Node integration is disabled in the renderer, your test should interact through the same preload API a real renderer uses. If the test reaches directly for Node from the page, it may be testing a less secure configuration than production.

Add smoke assertions for security-sensitive configuration where possible. For example, verify that privileged APIs are narrow and that unexpected globals are absent. Pair those tests with code review of BrowserWindow options, Content Security Policy, and preload exposure.

## Menus and accelerators are product behavior

Electron menus are easy to forget because they sit outside the DOM. Users still rely on them. A menu item can call the wrong command, stay enabled when it should be disabled, or disappear in a packaged build. Keyboard accelerators add another path to the same behavior.

Test the most important menu actions through visible outcomes. If a menu command opens settings, assert the settings window or route. If an accelerator saves a file, assert the saved indicator or filesystem output. Avoid checking only that a menu item exists unless existence itself is the product requirement.

| Desktop command | User-visible assertion | Extra risk |
|---|---|---|
| New window | New BrowserWindow appears with expected route | Window focus differs by platform. |
| Save | Dirty indicator clears and file changes | Native path handling can vary. |
| Preferences | Settings view opens | Menu role may conflict with platform conventions. |
| Check for updates | Update status message appears | Network should be mocked in tests. |
| Quit | Unsaved changes prompt appears | App lifecycle differs on macOS. |

Menu coverage should be small but deliberate. Pick commands that cross main process boundaries or protect user work. Renderer-only commands can stay in renderer tests.

## Update flows need controlled fakes

Auto-update behavior is hard to test against real infrastructure. The practical approach is to wrap the updater behind an application service and fake its events in tests. Then verify the renderer messages and user choices: update available, download progress, ready to install, failed update, and no update.

Do not let an automated test contact the real update feed unless it is a dedicated release verification job. Routine CI should be deterministic. A real feed can change between test runs, require signing, or serve platform-specific metadata.

| Update state | Assertion to keep | Why it matters |
|---|---|---|
| Checking | UI does not block normal work | Users should not be trapped by background checks. |
| Available | Version and release notes display safely | Prevents blank or misleading prompts. |
| Downloading | Progress is visible or intentionally hidden | Long downloads need feedback. |
| Ready | Install action is explicit when required | Avoids surprise restarts. |
| Error | Failure is recoverable and logged | Silent update failure leaves users exposed. |

A fake updater also lets you test ordering. For example, if an \`update-downloaded\` event arrives before the settings window opens, the app should still show the ready state when the user visits the update screen.

## Persistent state should use disposable profiles

Electron apps often persist state in user data directories. Tests that use the real profile can corrupt developer settings or inherit stale state from previous runs. Configure the app under test to use a temporary user data directory for each test or worker.

A good desktop test creates a temp directory, launches the app with configuration pointing to that directory, performs the workflow, closes the app, launches again, and verifies persistence. This catches bugs that pure renderer tests cannot see: settings not flushed, paths computed from development directories, or migrations skipped on second start.

\`\`\`ts
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect, _electron as electron } from '@playwright/test';

test('persists compact mode across restart', async () => {
  const userDataDir = await mkdtemp(join(tmpdir(), 'desktop-profile-'));

  let app = await electron.launch({ args: ['.', '--user-data-dir=' + userDataDir] });
  let page = await app.firstWindow();
  await page.getByRole('checkbox', { name: 'Compact mode' }).check();
  await app.close();

  app = await electron.launch({ args: ['.', '--user-data-dir=' + userDataDir] });
  page = await app.firstWindow();
  await expect(page.getByRole('checkbox', { name: 'Compact mode' })).toBeChecked();
  await app.close();
});
\`\`\`

That test is desktop-specific because browser storage alone is not the full story. The user data directory, app startup code, and persistence layer all participate.

## Platform differences are not edge trivia

Electron gives you one codebase, not one operating system. Menu roles, file paths, update packaging, certificate prompts, notification permissions, and window lifecycle differ across macOS, Windows, and Linux. A desktop QA plan should name which flows need platform coverage rather than assuming Chromium behavior is enough.

| Platform-sensitive area | What to verify |
|---|---|
| File paths | Spaces, unicode names, and platform separators work. |
| App lifecycle | Closing last window behaves as intended on macOS and Windows. |
| Notifications | Permission and click behavior are acceptable per platform. |
| Signing and quarantine | Packaged app launches without security prompts after install. |
| Auto update | Feed metadata and installer format match the platform. |

Run the deepest matrix on release candidates if every pull request cannot afford it. At minimum, smoke the packaged app on every platform you claim to support before publishing installers.

Keep a small manual charter for what automation cannot reliably cover, such as installer trust prompts or store-specific review flows. The point is not to automate everything. The point is to make every remaining manual check intentional and repeatable.

That written charter also prevents release testing from depending on whoever happens to be available that week.

## Frequently Asked Questions

### Can I test Electron with normal Playwright locators?

Yes, once you have a renderer page from \`electronApp.firstWindow()\`, normal Playwright locators and assertions work for that window. Use Electron-specific APIs only for main process and app lifecycle checks.

### Should Electron E2E tests run on every pull request?

Run a small smoke suite on pull requests if CI capacity allows. Heavier packaged artifact tests can run on main branch, release branches, or before publishing installers.

### How do I test IPC without exposing internals?

Test the preload API from the renderer. The renderer should call a narrow function such as \`window.desktopSettings.setTheme\`, not raw IPC. Assert valid and invalid behavior through that public contract.

### Why does my test pass in dev and fail after packaging?

Packaged apps resolve paths differently and may place files inside an asar archive. Test the packaged artifact for preload paths, static assets, worker files, local databases, and update metadata.

### Can I run Electron tests headlessly?

In many CI environments, yes, with the right OS display support. Linux often needs a virtual display setup depending on the runner. Keep platform setup explicit and verify the packaged app on the platforms you ship.
`,
};
