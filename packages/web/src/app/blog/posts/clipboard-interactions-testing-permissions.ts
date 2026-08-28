import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Clipboard Interactions: Permissions, Formats, and Fallbacks',
  description:
    'Clipboard testing guide covering permissions, MIME formats, and fallbacks so Playwright QA teams catch copy failures before CI and users do.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing Clipboard Interactions: Permissions, Formats, and Fallbacks

Clipboard testing covers three concrete areas: permission state for \`clipboard-read\` and \`clipboard-write\`, MIME format fidelity for \`text/plain\`, \`text/html\`, and \`image/png\`, and fallback paths when the Async Clipboard API is missing, blocked, or gated behind a user gesture. For QA and Playwright engineers, that means granting or denying permissions on purpose, asserting what lands in the system clipboard after a copy, proving paste into inputs and editors, and verifying the product still works when \`navigator.clipboard\` throws or \`document.execCommand('copy')\` is the only path left.

If your suite only clicks a Copy button and looks for a toast, you are not doing clipboard testing. You are testing a toast. The clipboard contract can fail while the toast still fires, especially in headless CI, cross-origin iframes, and browsers that require a transient user activation for read or write.

## Copy Button Paths Versus Selection and Keyboard Shortcuts

Product copy flows usually take one of two shapes. The first is an explicit Copy control that writes a known string (invite URL, API token fragment, share slug) through \`navigator.clipboard.writeText\` or a hidden selection plus \`execCommand('copy')\`. The second is selection-based copy: the user highlights text, presses Ctrl+C or Cmd+C, and the browser copies the current selection, sometimes with both plain and HTML representations.

Those paths are not interchangeable in tests. A Copy button test should click the control (or press Enter or Space while it is focused), then read the clipboard in the page context and assert the exact payload. A selection path test must create a real selection, send the shortcut with \`keyboard.press\`, and only then read. Skipping the selection step and writing into the clipboard from the test process proves nothing about the product.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('copy button writes invite URL to clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/team/invite');

  await page.getByRole('button', { name: 'Copy invite link' }).click();

  const text = await page.evaluate(async () => {
    return navigator.clipboard.readText();
  });

  expect(text).toMatch(/^https:\\/\\/example\\.test\\/invite\\/[A-Za-z0-9_-]+$/);
  await expect(page.getByRole('status')).toContainText('Link copied');
});
\`\`\`

Keyboard copy is a different contract. Pair it with the same locator discipline you already use for other input coverage. Selection and shortcut behavior sits naturally next to the [Playwright keyboard and mouse interactions reference](/blog/playwright-keyboard-mouse-interactions-reference): focus the target, select with shortcuts or a triple-click where appropriate, press \`ControlOrMeta+C\`, then assert clipboard contents.

What people get wrong: they seed the clipboard from Node or from \`page.evaluate\` writing \`navigator.clipboard.writeText\` before the click, then assert the same string still exists. That test is a no-op. The product never had to succeed. Always clear or overwrite with a sentinel first, trigger the UI path, then read.

| Path | User action under test | Typical assertion |
| --- | --- | --- |
| Explicit Copy button | Click or activate the button | Exact string or URL pattern in clipboard |
| Selection + shortcut | Select range, press Ctrl/Cmd+C | Selected plain text, optional HTML |
| Context menu Copy | Open menu, choose Copy | Same as selection path when menu is supported |
| Programmatic share helper | Click Share then Copy | Payload matches share contract, not page title |

Treat each row as a separate test or tagged scenario. Merging them into one "clipboard works" case hides which contract broke when CI turns red.

## Permission Denial UX in Secure Contexts, Iframes, and Gesture Gates

The Async Clipboard API is permission-sensitive and context-sensitive. Reads and writes generally require a secure context (HTTPS or localhost). \`clipboard-write\` is often allowed after a user gesture without an explicit prompt in Chromium, while \`clipboard-read\` more often needs \`clipboard-read\` permission. Policies differ by browser and version, so product code must handle denial, and tests must force those states.

Denial UX is a product requirement, not a browser detail. When write fails, the user needs a recoverable path: select the text in a readonly field, show a manual Copy tip, or open a dialog with the value pre-selected. When read fails on paste-from-clipboard features, the app should not hang on a spinner that waits forever for \`navigator.clipboard.readText()\`.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('shows manual copy fallback when clipboard write is denied', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  // Not granting the permission is NOT enough: Chromium allows clipboard-write
  // after the click's transient user activation. Force the denial by stubbing
  // writeText to reject, which is the state the fallback must handle.
  await page.addInitScript(() => {
    Object.defineProperty(navigator.clipboard, 'writeText', {
      value: () => Promise.reject(new DOMException('Write permission denied', 'NotAllowedError')),
      configurable: true,
    });
  });
  await page.goto('https://localhost:3000/settings/tokens');

  await page.getByRole('button', { name: 'Copy token' }).click();

  await expect(page.getByRole('dialog', { name: 'Copy manually' })).toBeVisible();
  await expect(page.getByLabel('Token')).toBeFocused();

  const selected = await page.evaluate(() => {
    const input = document.querySelector('input[aria-label="Token"]') as HTMLInputElement | null;
    if (!input) return null;
    return input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0);
  });

  expect(selected).toBeTruthy();
  await context.close();
});
\`\`\`

Gesture requirements matter for both product and automation. Many clipboard calls must run in the same turn as a click or keypress. Calling \`navigator.clipboard.writeText\` from a \`setTimeout\` after a network round trip can throw \`NotAllowedError\` even when permission was granted. That is a frequent production bug and a frequent false green in tests that write the clipboard from \`page.evaluate\` outside the click handler.

Iframes add another gate. A child frame may not share clipboard permission with the top-level document. Sandboxed iframes without \`allow-same-origin\` or without appropriate Permissions Policy directives can block clipboard access entirely. Your denial UX tests should include at least one embedded case if the product embeds editors, payment widgets, or docs viewers.

Secure context failures look like permission failures to users. Opening the app over plain HTTP on a LAN IP (not localhost) can make \`navigator.clipboard\` undefined or always reject. Tests that only run against \`http://localhost\` will never catch that. Add one environment note or staging check for non-local HTTP if your customers deploy that way.

## text/plain, text/html, and image/png Clipboard Payloads

Clipboard payloads are not always a single string. Modern pages write \`ClipboardItem\` collections with multiple MIME types. A rich text editor might place \`text/html\` and \`text/plain\` together. A design tool might write \`image/png\`. Paste targets negotiate which type they accept.

Clipboard testing must name the MIME type under assertion. Reading \`readText()\` only proves the plain text representation. It does not prove that HTML paste into a contenteditable keeps bold marks, or that an image paste lands as a file the uploader accepts.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('copy selection writes plain and html clipboard items', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/docs/editor');

  await page.locator('[data-testid="rich-paragraph"]').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('ControlOrMeta+C');

  const types = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    return items.flatMap((item) => item.types);
  });

  expect(types).toEqual(expect.arrayContaining(['text/plain', 'text/html']));

  const html = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    const htmlItem = items.find((item) => item.types.includes('text/html'));
    if (!htmlItem) return '';
    const blob = await htmlItem.getType('text/html');
    return blob.text();
  });

  expect(html).toContain('<strong>');
});
\`\`\`

For image payloads, write a small PNG in the page or accept a paste from a prepared \`ClipboardItem\`. Keep fixtures tiny. Assert dimensions or a hash of the bytes after paste, not a screenshot of the whole page, unless visual coverage is already part of that suite.

| MIME type | Common product use | Assertion focus |
| --- | --- | --- |
| \`text/plain\` | Invite links, codes, raw snippets | Exact string or regex |
| \`text/html\` | Rich editors, table copy | Tags retained or sanitized as designed |
| \`image/png\` | Design tools, screenshot paste | Blob type, size bounds, decode success |

Format negotiation is product policy. Some paste targets strip HTML on purpose. Others keep a allowlist of tags. Your tests should encode the policy, not a generic "HTML survived" expectation that fights XSS sanitization later.

## Pasting Into Inputs, Contenteditable Surfaces, and Custom Editors

Paste is the other half of clipboard testing. Writing works only if readers consume the right representation. Native \`<input>\` and \`<textarea>\` usually take \`text/plain\`. Contenteditable regions and custom editors (CodeMirror, ProseMirror, Lexical, Monaco wrappers) may listen to \`paste\` events, call \`preventDefault()\`, and read \`clipboardData\` or \`navigator.clipboard\`.

A reliable paste test sequence is: put a known value on the clipboard, focus the target, press \`ControlOrMeta+V\` (or dispatch the path the editor documents), then assert DOM value or editor model state. Prefer the keyboard paste when the product relies on the \`paste\` event. Calling \`fill()\` skips paste handlers and will miss bugs in custom editors.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('pastes plain text into contenteditable note', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/notes/new');

  await page.evaluate(async () => {
    await navigator.clipboard.writeText('alpha-paste-marker-42');
  });

  const editor = page.locator('[contenteditable="true"]');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+V');

  await expect(editor).toContainText('alpha-paste-marker-42');
});
\`\`\`

Custom editors often need an extra beat after paste for async parsing. Assert with Playwright \`expect\` auto-waiting against the visible text or a \`data-testid\` that reflects the model. Do not sprinkle fixed \`waitForTimeout\` calls unless you are diagnosing a flake; prefer condition-based waits.

People also get wrong the difference between \`fill\` and paste for validation. If the field strips emoji on paste but allows typed emoji, only a paste test finds it. If credit-card formatting runs on \`input\` events from typing but not on paste, users will paste broken values in production while typed tests stay green.

For invite-link and token fields that are readonly, paste may be intentionally blocked. Assert that blocked behavior too. Clipboard testing includes "must not accept paste here" cases for security-sensitive surfaces.

## Fallbacks When the Clipboard API Is Unavailable

Not every browser, WebView, or embedded session exposes \`navigator.clipboard\`. Older enterprise browsers, restricted iframes, and some WebViews leave you with \`document.execCommand('copy')\` after selecting a temporary textarea, or with a prompt-style manual copy dialog. Product code should feature-detect and degrade. Tests should force the degraded path.

The cleanest way to force unavailability in automation is to remove or replace \`navigator.clipboard\` in the page before the flow runs, then click Copy and assert the fallback UI. Do this in \`page.evaluate\` or via an init script so the app sees the same environment a restricted client would see.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('uses execCommand fallback when clipboard API is missing', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get() {
        return undefined;
      }
    });
  });

  await page.goto('/share');
  await page.getByRole('button', { name: 'Copy link' }).click();

  const usedFallback = await page.evaluate(() => {
    return document.documentElement.dataset.copyStrategy === 'execCommand';
  });
  expect(usedFallback).toBe(true);

  await expect(page.getByRole('status')).toContainText('copied');
});
\`\`\`

Legacy \`execCommand('copy')\` still depends on a selectable node and a user gesture in many engines. If the temporary textarea is \`display: none\` in a way the browser rejects, or if selection never lands, the command returns \`false\`. Assert both the return path the app records and the user-visible outcome.

Prompt-style fallbacks (show the value, ask the user to copy manually) are valid. Test that the value is selected, that Escape closes the dialog, and that focus returns to the triggering control. That focus return is an accessibility requirement as much as a UX nicety; see the accessibility section below and the related focus coverage in [accessibility testing focus management traps](/blog/accessibility-testing-focus-management-traps).

Optional tooling note: teams that keep short interaction recipes in qaskills (or a \`qaskills.sh\` helper) can store "force clipboard undefined" and "grant clipboard permissions" snippets next to other browser permission recipes so every suite applies the same init script.

## Cross-Origin Iframe Clipboard Restrictions

Cross-origin iframes are a sharp edge for clipboard testing. The parent page cannot freely read the child clipboard state, and the child may be blocked by Permissions Policy (\`clipboard-read\`, \`clipboard-write\`) from the embedder. A docs viewer embedded from another origin can fail Copy while the same app works top-level.

Test strategy:

1. Load the embedder page that hosts the iframe.
2. Work inside the frame locator for clicks and keyboard events.
3. Read clipboard from the frame's world when same-origin automation allows it, or assert only observable UI outcomes when the frame is truly cross-origin and sealed.

When the iframe is cross-origin, \`page.evaluate\` in the parent cannot call into the child's \`navigator.clipboard\`. Use \`frame.evaluate\` on the child frame if your test origin setup makes the child scriptable. If it is not scriptable, assert post-copy UI in the child and, if the product copies to the parent clipboard through a bridge, assert on the parent after the bridge message.

| Embed type | What you can assert directly | Safer alternative |
| --- | --- | --- |
| Same-origin iframe | \`frame.evaluate\` clipboard read/write | Still prefer user-visible status text |
| Cross-origin, scriptable test build | Limited evaluate in test build only | Feature flag a test build carefully |
| Cross-origin production embed | UI only (toast, selected input) | Contract tests for postMessage bridge |

Do not weaken production security to make a test easier. Prefer a dedicated test harness page that mirrors Permissions Policy headers you ship, rather than turning off sandboxing globally in CI.

## Flaky CI: Headless Permissions and Linux Without a Clipboard

Here is the failure story that shows up on almost every mature Playwright team.

A developer writes a Copy invite link test on a MacBook. Headed Chromium, local HTTPS, permissions granted in the IDE once by hand. The test clicks Copy, reads \`navigator.clipboard.readText()\`, and passes for weeks. Then someone enables the same project on GitHub Actions \`ubuntu-latest\` with headless Chromium. The job fails with \`NotAllowedError\`, empty clipboard text, or a timeout waiting for the success toast that never appears because the write threw inside the click handler.

Root causes stack:

- \`clipboard-read\` / \`clipboard-write\` were never granted on the \`browserContext\` in the test.
- The write ran without a transient user gesture in headless.
- Linux CI images do not provide the same clipboard stack as a desktop session; some paths need permissions plus a secure origin.
- The app silently caught the error and showed nothing, so the test waited on a status role that never arrived.

Fix the suite, not only the laptop:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('clipboard @clipboard', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: 'https://localhost:3000'
    });
  });

  test('copy invite link in headless', async ({ page }) => {
    await page.goto('https://localhost:3000/team/invite');
    await page.getByRole('button', { name: 'Copy invite link' }).click();

    const text = await page.evaluate(async () => navigator.clipboard.readText());
    expect(text).toContain('/invite/');
  });
});
\`\`\`

Run focused local repros with Playwright's grep flags when CI fails only on clipboard tags:

\`\`\`bash
npx playwright test --grep @clipboard
npx playwright test -g "invite link"
\`\`\`

For unit-level helpers around feature detection, Vitest's name filter keeps the feedback loop tight:

\`\`\`bash
npx vitest -t "clipboard fallback"
\`\`\`

On GitHub Actions, pin checkout and setup actions at \`@v4\` and grant permissions inside the test, not via a one-off manual headed run:

\`\`\`yaml
name: ui-tests
on: [push]
jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --grep @clipboard
\`\`\`

Still flaky after grants? Check that the app origin in \`grantPermissions\` matches the page URL origin exactly (scheme, host, port). A grant for \`http://127.0.0.1:3000\` does not apply to \`http://localhost:3000\`. That mismatch is a classic headed-versus-CI surprise when one environment resolves the base URL differently.

## Accessibility: Announcing Copy Success and Focus After Copy

Clipboard success is easy to miss for screen reader users if the only feedback is a visual checkmark. Announce success through a polite live region or an alert role, and keep focus predictable. After Copy, focus should usually remain on the Copy control so keyboard users can move on without hunting. If a manual-copy dialog opens, focus should move into the dialog and restore to the trigger on close.

Test both the announcement text and the focus target:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('announces copy and keeps focus on the button', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-write', 'clipboard-read']);
  await page.goto('/share');

  const button = page.getByRole('button', { name: 'Copy link' });
  await button.focus();
  await button.press('Enter');

  await expect(page.getByRole('status')).toHaveText(/copied/i);
  await expect(button).toBeFocused();
});
\`\`\`

Do not rely on toast animation timing alone. Role-based locators against \`status\` or \`alert\` couple the test to the accessibility contract. If the design swaps visual toast libraries but keeps the live region, tests stay stable.

Copy failures need announcements too. "Clipboard blocked. Link selected for manual copy." is actionable. Silent failure is not. Include one denied-permission a11y case in the suite so assistive tech users are not left guessing.

Focus management after nested dialogs and traps is a broader topic; keep clipboard cases aligned with your focus suite so Escape from a manual-copy dialog restores correctly rather than dropping focus to \`document.body\`.

## Security: Not Pasting Secrets Into Logs and Sanitizing HTML Paste

Clipboard tests handle secrets more often than people admit: invite links with tokens, API keys, recovery codes, customer PII snippets. Logging \`readText()\` output in CI artifacts can leak those values into job logs, trace viewers, and third-party failure reporters.

Rules for clipboard testing security:

- Prefer asserting patterns, prefixes, or hashes over full secret strings in expect messages.
- Redact clipboard dumps in custom reporters.
- Never \`console.log\` raw tokens in test hooks.
- Use short-lived fixtures that expire, even in automation environments.

HTML paste is an XSS surface. If your editor accepts \`text/html\`, tests should paste a payload with \`<script>\`, \`onerror\` handlers, or \`javascript:\` URLs and assert sanitization. The clipboard is just another input channel.

| Risk | Bad test habit | Safer habit |
| --- | --- | --- |
| Secret in logs | \`expect(text).toBe(fullApiKey)\` with key printed on failure | Match last four chars or a hashed fixture |
| HTML injection | Only paste benign markup | Paste active HTML and assert strip or escape |
| Over-broad clipboard read | Read clipboard in unrelated tests | Limit read permission to clipboard-tagged tests |

Sanitize on paste in the product, not only on save. A user can paste malicious HTML, see it render, and cause damage before submit if the editor renders unsanitized HTML live.

## Playwright grantPermissions Patterns and When They Fail

\`browserContext.grantPermissions(['clipboard-read', 'clipboard-write'])\` is the primary Playwright lever. Call it before the page needs the permission. Origin options should match the app under test. Clearing permissions between tests avoids bleed when one case needs denial and the next needs grant.

Patterns that work:

- Grant in \`beforeEach\` for a describe block tagged \`@clipboard\`.
- Create an isolated context per denial test without grants.
- Use \`page.evaluate\` for \`navigator.clipboard.writeText\` / \`readText\` only after grants and preferably after a real gesture when mirroring production constraints.

Patterns that fail:

- Granting after the page has already called the Permissions API and cached a denied state without reload.
- Granting on the wrong origin.
- Assuming Firefox and WebKit behave identically to Chromium for read permission prompts.
- Expecting a first-class \`page.clipboard\` helper across all Playwright versions; use \`page.evaluate\` against \`navigator.clipboard\` instead of inventing wrappers that do not exist in the API surface you run in CI.

Permissions API checks inside the page can still report \`prompt\` or \`denied\` depending on browser. If the product reads \`navigator.permissions.query({ name: 'clipboard-read' })\`, assert that branch with deliberate grant and deny setups rather than only happy-path grants.

When \`grantPermissions\` is unsupported for a browser or permission name in your Playwright version, skip with a clear message or gate the project to Chromium for clipboard-read assertions. Document that gate in the test title so failures are not mistaken for product regressions.

## Testing Copy Invite Link Product Flows End to End

"Copy invite link" is the canonical product flow for clipboard testing. It combines permission grants, button activation, payload shape, success announcement, and often a follow-up paste into another surface (email client mock, chat compose box, or a second browser context).

A solid end-to-end shape:

1. Seed a team and an invite that yields a deterministic or pattern-stable URL.
2. Grant clipboard permissions on the context.
3. Open the invite panel.
4. Click Copy invite link.
5. Assert live region success.
6. Read clipboard text and match the invite URL pattern.
7. Open a second page or context, paste into a field that accepts the link, and assert navigation or acceptance.

Second-context paste is optional but valuable: it proves the value is truly on the clipboard, not only stored in a React variable that the toast inspects. Use one browser context with two pages, or two contexts if you need isolation; for clipboard continuity, same OS session and same browser product usually share the clipboard, but headless CI can still surprise you, so keep a same-page paste assertion as the default and treat cross-app paste as a headed smoke check.

Tag the flow \`@clipboard @invite\` and keep it out of the critical smoke path if your Linux runners remain unreliable. Prefer making the runners reliable over deleting the test. Product users live and die by invite links.

Failure modes to script explicitly:

- Expired invite still copies an URL that the app should refuse to mint.
- Copy works while offline for already-rendered links.
- Rapid double-click does not queue duplicate toasts that trap focus.
- Localized button names still resolve through roles, not hardcoded CSS selectors.

## Format Negotiation and ClipboardItem Conceptual Testing With evaluate

When product code writes multiple representations, tests should inspect \`ClipboardItem\` types through \`page.evaluate\`. That is conceptual format negotiation testing: you prove what was offered, then paste into targets that prefer different types and assert which representation won.

Example approach:

1. Trigger Copy on a formatted block.
2. In evaluate, \`await navigator.clipboard.read()\`, collect \`item.types\`.
3. Paste into a plain \`textarea\` and assert only plain text arrived.
4. Paste into a rich contenteditable and assert HTML semantics survived or were sanitized per policy.

You can also construct a \`ClipboardItem\` in evaluate to simulate an external app writing HTML+plain, then paste into your editor without depending on OS-level clipboard drivers. That technique stabilizes CI because the fixture is fully in-browser.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('editor prefers text/html from ClipboardItem fixture', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/editor');

  await page.evaluate(async () => {
    const html = new Blob(['<p><em>hello</em></p>'], { type: 'text/html' });
    const plain = new Blob(['hello'], { type: 'text/plain' });
    const item = new ClipboardItem({
      'text/html': html,
      'text/plain': plain
    });
    await navigator.clipboard.write([item]);
  });

  const editor = page.locator('[contenteditable="true"]');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+V');
  await expect(editor.locator('em')).toHaveText('hello');
});
\`\`\`

Keep this evaluate-based fixture path next to real button-copy paths. The fixture proves paste negotiation. The button path proves the product write. You need both. Teams that only use fixtures miss write bugs; teams that only click Copy miss paste negotiation bugs.

Permissions still apply. Writing a \`ClipboardItem\` through evaluate may require grants and, in stricter browsers, a prior gesture. If write fails in CI, click a no-op button in the page immediately before the evaluate write, or perform the write inside a click handler injected for the test harness.

## Frequently Asked Questions

### Why do clipboard tests pass headed locally but fail in headless CI?

Headed local runs often inherit clipboard permissions you granted once by hand, run on a desktop clipboard stack, and execute against \`localhost\` with a real gesture timing profile. CI headless Chromium on Linux typically starts with no grants, a different clipboard implementation, and stricter gesture checks. Fix by calling \`browserContext.grantPermissions(['clipboard-read','clipboard-write'])\` with the exact origin, keeping copy inside a real click, and asserting UI fallbacks when write throws. Re-run with \`npx playwright test --grep @clipboard\` on the same runner image you use in GitHub Actions \`@v4\` workflows.

### Should tests use navigator.clipboard or document.execCommand?

Prefer \`navigator.clipboard.writeText\` / \`readText\` (and \`ClipboardItem\` when formats matter) inside \`page.evaluate\` for modern product paths, and keep a separate test that forces API absence to exercise \`document.execCommand('copy')\` or manual-select fallbacks. Do not invent Playwright \`page.clipboard\` helpers that are not part of your installed API. Match the production feature-detection order so the suite fails when either branch regresses, not only the branch your laptop exercises.

### How do I assert HTML versus plain text clipboard contents?

Grant \`clipboard-read\`, trigger the copy path, then in \`page.evaluate\` call \`navigator.clipboard.read()\`, inspect \`item.types\`, and \`getType('text/html')\` or \`getType('text/plain')\` as needed. \`readText()\` alone only covers plain text and will hide rich payload bugs. Add paste assertions into both a plain \`textarea\` and a contenteditable target so you prove which representation consumers actually use, including sanitization policy for hostile HTML fixtures that must not execute.

### What is the minimum clipboard suite for a SaaS invite link feature?

Grant permissions in \`beforeEach\`, click Copy invite link, assert the live region, read the clipboard and match the invite URL pattern, paste into an in-app field, and cover one denial or API-unavailable fallback that selects the link for manual copy. Add a tagged CI job with Playwright \`--grep @clipboard\` and Vitest \`-t\` filters for unit helpers. Keep secrets out of logs by asserting patterns instead of full tokens. That minimum set catches the headed-versus-CI permission failure story before customers do.
`,
};
