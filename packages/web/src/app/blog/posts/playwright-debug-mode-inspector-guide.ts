import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Debug Mode and Inspector: Complete 2026 Guide',
  description: 'Master Playwright debug mode and the Inspector in 2026: step-through, pause, locator highlighting, VS Code breakpoints, and post-mortem trace debugging.',
  date: '2026-05-10',
  category: 'Guide',
  content: `
# Playwright Debug Mode and Inspector: Complete 2026 Guide

Playwright Inspector is the debugger built into the test runner. Where Chrome DevTools debugs the page under test, Inspector debugs the test code itself: pause execution between actions, highlight locators in the live browser, step through the spec, and inspect the call stack. Combined with VS Code or Cursor breakpoints, Inspector lets you move from "this assertion fails" to "I know exactly why" in seconds.

This guide is a complete reference for Inspector and the related debug modes in Playwright 1.49+. We will cover \`--debug\`, \`PWDEBUG\`, \`page.pause()\`, VS Code integration, trace-based post-mortem debugging, and the workflow patterns that turn flaky failures into reliable fixes.

For the visual debugging counterpart, see [Playwright UI Mode Complete 2026 Guide](/blog/playwright-ui-mode-complete-2026-guide). The [playwright-e2e skill](/skills/playwright-e2e) ensures AI assistants generate tests amenable to debugging.

## Launching debug mode

The simplest entry point:

\`\`\`bash
npx playwright test --debug
\`\`\`

Two windows open: a Chromium with the page under test, and the Inspector with the test source on the left and a step-control panel on top. Every step button in the Inspector advances the test by one action.

To debug only a specific test:

\`\`\`bash
npx playwright test --debug tests/checkout.spec.ts
npx playwright test --debug -g "user completes checkout"
\`\`\`

The \`-g\` flag matches by test title; useful when one spec contains many tests.

## The PWDEBUG environment variable

For more granular control, set \`PWDEBUG\`.

\`\`\`bash
# Open Inspector at start (same as --debug)
PWDEBUG=1 npx playwright test

# Open Inspector and pause on every action (use --headed implicitly)
PWDEBUG=console npx playwright test
\`\`\`

\`PWDEBUG=console\` exposes a \`playwright\` object on the browser console so you can invoke locators interactively from DevTools.

## page.pause()

The most surgical pause. Inserting \`await page.pause()\` in your spec halts execution at exactly that line.

\`\`\`typescript
test('investigates a flaky step', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByLabel('Full name').fill('Asha');
  await page.pause(); // <- inspector opens here
  await page.getByRole('button', { name: 'Place order' }).click();
});
\`\`\`

When the runner hits the pause, Inspector opens and the browser stays interactive. You can click around, inspect locators, and resume when ready. The pause does nothing in CI (it returns immediately), so leaving it in code is safe for emergencies but not best practice.

## Step controls

| Button | Action |
|---|---|
| Step over | Run the next action and pause again |
| Resume | Continue until the next pause or end |
| Pick locator | Hover the browser to capture a locator |
| Record | Add new actions to the test |
| Edit | Modify the current action in-place |

The "Pick locator" workflow during a pause is the most powerful: select an element, see the recommended locator, copy to clipboard. Use it to fix broken locators without leaving the debugger.

## VS Code integration

Install the official Playwright extension. It adds:

- CodeLens "Debug Test" above every \`test()\` block.
- A breakpoint gutter that triggers \`page.pause()\` automatically.
- A Test Explorer tree for running and debugging tests.
- An option "Show trace viewer" on the post-run output.

\`\`\`json
// .vscode/settings.json
{
  "playwright.reuseBrowser": true,
  "playwright.showTrace": true
}
\`\`\`

Click the gutter next to any line; the test runs to that line, pauses, and the VS Code debug toolbar takes over. Step, continue, and evaluate expressions exactly as you would in Node debugging.

## Cursor integration

Cursor includes the Playwright extension by default in recent builds. The same CodeLens and breakpoint workflows apply. The AI assistant in Cursor can read the trace file and propose patches to the failing test.

## Trace-based post-mortem

When a CI run fails, you do not need to rerun locally. Download the trace and open it.

\`\`\`bash
# Download artifact from GitHub Actions, then
npx playwright show-trace trace.zip
\`\`\`

The trace viewer is a standalone tool that opens at \`localhost:9322\` with the same time-travel features as UI Mode. Click any action to see the DOM snapshot, network requests, console messages, and source line. There is no need to reproduce the failure; the trace contains every detail.

Configure trace generation in \`playwright.config.ts\`:

\`\`\`typescript
use: {
  trace: 'on-first-retry', // produce trace on retry only
  // or 'on'                // every test
  // or 'retain-on-failure' // only when test fails
}
\`\`\`

For full CI setup, read [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026).

## Highlighting locators in the browser

In Inspector, paste a locator expression and Inspector highlights matches in the browser:

\`\`\`text
page.getByRole('button', { name: 'Place order' })
\`\`\`

Matches glow in the browser window with their bounding box. Use this to verify a locator before committing.

## Console eval

In \`PWDEBUG=console\` mode, the browser's DevTools console exposes \`playwright.locator(...)\`.

\`\`\`javascript
// in DevTools console
playwright.locator('button:has-text("Save")').evaluate(el => el.disabled);
\`\`\`

Useful for one-off debugging of DOM state inside a paused test.

## Debugging snapshot mismatches

Snapshot failures produce three files in test-results:

| File | Purpose |
|---|---|
| \`*-actual.png\` | Captured during the run |
| \`*-expected.png\` | The baseline |
| \`*-diff.png\` | Highlighted differences |

Open all three in your image viewer. If the diff is real, update the baseline; if the diff is noise, increase \`maxDiffPixelRatio\` or mask the volatile region.

See [Playwright Visual Comparison Snapshots Guide](/blog/playwright-visual-comparison-snapshots-guide) for the full story.

## Debugging network calls

The trace's Network tab shows every request with method, status, size, and duration. Click a request to see headers and body.

If a test waits on a missing or delayed response, add an explicit wait:

\`\`\`typescript
const responsePromise = page.waitForResponse('**/api/orders');
await page.getByRole('button', { name: 'Place order' }).click();
const response = await responsePromise;
expect(response.status()).toBe(201);
\`\`\`

The Network tab in the trace shows whether the response arrived at all and what status it carried.

## Debugging in headed mode

For tests that pass headless and fail headed (or vice versa), run with \`--headed\`.

\`\`\`bash
npx playwright test --headed
\`\`\`

Combine with \`--slow-mo\` to slow each action by N ms:

\`\`\`bash
npx playwright test --headed --slow-mo=200
\`\`\`

\`--slow-mo\` is invaluable for catching the exact moment a hidden element disappears.

## Common debug scenarios

| Symptom | Tool | Action |
|---|---|---|
| Element not found | Inspector picker | Regenerate locator |
| Timing race | Trace Network tab | Add \`waitForResponse\` |
| Wrong page after navigation | Trace URL bar | Check the redirect URL |
| Assertion text mismatch | Trace Source tab | Compare actual vs expected |
| Test passes locally, fails in CI | Download CI trace | Open with \`show-trace\` |
| Test fails on retry but passes initially | \`trace: 'on'\` | Catch with full trace |

## Common pitfalls

**Pitfall 1: Leaving \`page.pause()\` in committed code.** Use a lint rule or pre-commit hook to flag stray pauses.

**Pitfall 2: Debugging with \`waitForTimeout\`.** A long timeout masks the underlying issue. Use the trace to see exactly which action did not converge.

**Pitfall 3: Ignoring console errors.** The Console tab in the trace often shows the root cause before the assertion fires. Always check.

**Pitfall 4: Reusing locators across navigations.** A locator from before \`goto\` references the old page. After navigation, re-declare locators.

**Pitfall 5: Debugging the wrong project.** \`--debug\` defaults to all projects. Add \`--project=chromium\` to focus.

## Anti-patterns

- Inserting \`console.log\` between actions instead of using \`page.pause\`. Pause gives you a live browser; logs give you static state.
- Disabling assertions to "make it pass". Investigate why the assertion fails; that is the test's job.
- Running tests with \`--debug\` in CI. The Inspector cannot open headless.
- Editing the spec while paused without saving. The Inspector's edit mode requires explicit save to persist.

## Workflow: from CI failure to fix

1. CI fails on \`tests/checkout.spec.ts\`.
2. Download \`trace.zip\` from artifacts.
3. \`npx playwright show-trace trace.zip\`.
4. Scrub to the failed action; inspect the DOM snapshot.
5. Identify the cause (locator drift, timing, server error).
6. Patch the spec locally.
7. \`npx playwright test --debug tests/checkout.spec.ts\` to verify.
8. Commit and push.

The entire loop runs in under five minutes for most issues.

## Conclusion and next steps

Inspector, traces, and VS Code breakpoints together turn debugging from a guessing game into a structured workflow. Use traces for post-mortem, Inspector for live iteration, and \`page.pause()\` for surgical pauses.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate tests with debug-friendly patterns. For visual-first debugging, [Playwright UI Mode Complete 2026 Guide](/blog/playwright-ui-mode-complete-2026-guide) is the next read.
`,
};
