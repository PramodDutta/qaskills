import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Claude Code Screenshot Verification: Frontend Testing with Playwright MCP',
  description:
    'Give Claude Code eyes on your UI: install Playwright MCP, capture screenshots, and build a verification loop that catches visual regressions the agent would otherwise miss.',
  date: '2026-08-23',
  category: 'AI Testing',
  content: `
# Claude Code Screenshot Verification: Frontend Testing with Playwright MCP

To let Claude Code see what it just built, connect an MCP server that drives a browser and returns screenshots. Playwright MCP is the practical choice: it exposes navigation, interaction, and screenshot tools over the Model Context Protocol, so the agent can load your dev server, act on the page, and look at the result before claiming the work is done.

\`\`\`bash
claude mcp add playwright npx '@playwright/mcp@latest'
\`\`\`

That single command is most of the setup. The harder and more valuable part is the loop you build around it, because an agent with a screenshot tool will still confidently declare success on a broken page unless you tell it what "verified" means.

Puppeteer works too, but Playwright MCP is the better fit for verification work: it ships an accessibility-tree snapshot alongside pixels, which lets the agent reason about structure rather than guessing from an image.

## Why screenshots change agent behavior

Without a browser, a coding agent verifies frontend work by re-reading its own diff. That catches syntax errors and nothing else. The failure modes it cannot see are exactly the ones that matter in UI work:

| Failure | Visible in the diff? | Visible in a screenshot? |
|---|---|---|
| Component throws and renders nothing | No | Yes, blank region |
| CSS collision hides an element | No | Yes |
| Layout breaks under a narrow viewport | No | Yes, at that viewport |
| Contrast fails against the background | No | Yes |
| Text overflows its container | No | Yes |
| Wrong data bound to the right component | No | Yes, wrong values |

The diff says the code changed. The screenshot says the page works. Those are different claims, and only the second one is what you asked for.

## Setup that survives a real project

Register the server, then confirm it is actually connected before you rely on it.

\`\`\`bash
claude mcp add playwright npx '@playwright/mcp@latest'
claude mcp list
\`\`\`

The agent also needs the browser binaries and a running app:

\`\`\`bash
npx playwright install chromium
npm run dev
\`\`\`

Put the contract in \`CLAUDE.md\` so it applies to every session instead of the one where you remembered to ask:

\`\`\`markdown
## Frontend verification

The dev server runs at http://localhost:3000. After any change to a component,
page, or stylesheet:

1. Navigate to the affected route with Playwright MCP.
2. Take a screenshot at 1280x800 and at 375x812.
3. Read the console for errors.
4. Only then report the change as complete.

Do not claim a UI change works without a screenshot of it working.
\`\`\`

That last line does more than the rest combined. Agents are heavily biased toward declaring completion, and an explicit prohibition is what converts "I updated the component" into "here is the component rendering correctly."

## The verification loop

The loop that works in practice has four steps, and the third is the one people skip.

1. **Act**: make the change.
2. **Observe**: navigate and screenshot.
3. **Compare**: check the screenshot against a stated expectation.
4. **Report**: state what was verified and at which viewport.

Step three needs a target. "Does this look right?" is not something an agent can answer honestly, because it has no prior. "The submit button is visible below the email field, and no console errors" is checkable.

\`\`\`markdown
Add a loading state to the checkout button.

Verify by:
- Navigating to /checkout
- Clicking "Place order"
- Screenshotting within 200ms of the click
- Confirming the button shows a spinner and is disabled
- Confirming no console errors
\`\`\`

Writing the acceptance criteria into the prompt is the difference between a screenshot as evidence and a screenshot as decoration.

## Capturing the states that actually break

Static screenshots of a happy path catch the least interesting bugs. The states worth capturing are the ones no one builds fixtures for.

| State | How to reach it |
|---|---|
| Empty | Route with no data seeded |
| Loading | Screenshot immediately after the triggering action |
| Error | Intercept the API call and return a 500 |
| Long content | Seed a record with a 300-character title |
| Narrow viewport | Resize to 375 wide before capturing |
| Dark mode | Emulate the dark color scheme |

Route interception is what makes error and loading states reachable on demand:

\`\`\`ts
// tests/checkout-error-state.spec.ts
import { expect, test } from '@playwright/test';

test('checkout shows a recoverable error when the order API fails', async ({ page }) => {
  await page.route('**/api/orders', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'order_service_unavailable' }),
    }),
  );

  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(page.getByRole('alert')).toContainText(/could not place your order/i);
  // The retry affordance is the part that regresses silently.
  await expect(page.getByRole('button', { name: 'Try again' })).toBeEnabled();
  await page.screenshot({ path: 'artifacts/checkout-error.png', fullPage: true });
});
\`\`\`

Note \`route.fulfill\` with a status and a body. That is the documented shape; there is no chained \`.withStatus()\` builder, and inventing one is a common hallucination when an agent writes this from memory rather than from the docs.

## From ad-hoc screenshots to committed tests

Screenshots during a session are for the agent. Committed tests are for the next six months. The natural workflow is to let the agent explore with MCP, then convert what it verified into a spec file.

\`\`\`ts
// tests/checkout.visual.spec.ts
import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 812 },
];

for (const vp of VIEWPORTS) {
  test('checkout renders correctly on ' + vp.name, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/checkout');

    // Wait for a real signal, never a fixed timeout.
    await expect(page.getByRole('heading', { name: 'Order summary' })).toBeVisible();

    await expect(page).toHaveScreenshot('checkout-' + vp.name + '.png', {
      // Masks keep volatile regions from failing every run.
      mask: [page.getByTestId('order-total'), page.getByTestId('delivery-eta')],
      maxDiffPixelRatio: 0.01,
    });
  });
}
\`\`\`

\`toHaveScreenshot\` handles baseline creation, comparison, and diff artifacts. The \`mask\` option is what keeps a visual suite from becoming noise: prices, timestamps, and generated identifiers change between runs and will fail every comparison if you leave them unmasked.

Do not let the agent write \`page.waitForTimeout(2000)\` before a screenshot. It passes locally, fails in CI where everything is slower, and hides the real race. Wait for a visible element instead, as above.

## Reading the console, not just the pixels

A page can look perfect and still be broken. Screenshot verification should always be paired with console inspection.

\`\`\`ts
test('no console errors on the checkout route', async ({ page }) => {
  const errors: string[] = [];
  // Register before navigation, or early errors are missed entirely.
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Order summary' })).toBeVisible();

  expect(errors, 'console errors:\\n' + errors.join('\\n')).toHaveLength(0);
});
\`\`\`

Listener registration order matters. Attaching the handler after \`page.goto\` misses every error thrown during initial render, which is where the interesting ones live.

## Where the agent still needs a human

Be clear-eyed about what this catches and what it does not.

| Question | Agent with screenshots | Needs a human |
|---|---|---|
| Did it render? | Yes | |
| Are there console errors? | Yes | |
| Does it break at 375px? | Yes | |
| Does the flow make sense? | Partially | Mostly |
| Is this the right design? | No | Yes |
| Is the copy on brand? | No | Yes |
| Is the animation pleasant? | No | Yes |

Screenshot verification converts "the code compiles" into "the page renders correctly." It does not convert into "this is good product design." Treat it as the regression floor, not as review.

## Driving the browser from the agent, concretely

A useful session looks less like "take a screenshot" and more like a scripted inspection. The tools Playwright MCP exposes map closely to the Playwright API, so the agent can navigate, resize, act, and capture in sequence.

A prompt that produces reliable work:

\`\`\`markdown
The discount badge is not appearing on /checkout for orders over $100.

1. Navigate to http://localhost:3000/checkout
2. Read the page snapshot and tell me whether a discount badge element exists
   in the accessibility tree at all
3. If it exists but is not visible, screenshot and inspect the computed styles
4. If it does not exist, the bug is in rendering logic, not CSS
5. Report which of the two it is before changing any code
\`\`\`

The value is in step 5. Asking the agent to classify the bug before fixing it prevents the common pattern where it changes CSS for a problem that was in the data layer, then screenshots a page that still does not work and reports a fix.

For layout questions specifically, the accessibility snapshot is more useful than the image, because it distinguishes "element is absent" from "element is present but hidden," and those have completely different causes:

| Snapshot says | Screenshot shows | Root cause |
|---|---|---|
| Element absent | Nothing there | Render logic or data |
| Element present | Nothing there | CSS: display, opacity, z-index, overflow |
| Element present | Wrong text | Data binding |
| Element present, wrong role | Looks fine | Semantics: div styled as a button |

That last row is the one screenshots can never catch and the accessibility tree always can. A div with a click handler looks identical to a button and is unusable by keyboard.

## Multi-viewport verification in one pass

Most responsive bugs live at a boundary, so check both sides of your breakpoints rather than one representative width.

\`\`\`ts
// tests/responsive-boundaries.spec.ts
import { expect, test } from '@playwright/test';

// One pixel either side of the md breakpoint at 768.
const WIDTHS = [767, 768, 1024, 1280];

for (const width of WIDTHS) {
  test('navigation is usable at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');

    const menuButton = page.getByRole('button', { name: /open menu/i });
    const navList = page.getByRole('navigation');

    if (width < 768) {
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      await expect(navList).toBeVisible();
    } else {
      await expect(navList).toBeVisible();
      await expect(menuButton).toBeHidden();
    }
  });
}
\`\`\`

Testing 767 and 768 catches off-by-one breakpoint errors, which are common and invisible at the round widths everyone checks.

## A realistic failure: the screenshot that proved nothing

Symptom: the agent reports a fixed layout bug and attaches a screenshot showing a correct page. The bug is still there in the browser.

Diagnosis: the screenshot was taken against a stale build. The dev server had crashed on an unrelated compile error twenty minutes earlier, and the browser was serving the last good page from cache. The agent navigated, got a 200, screenshotted a page that no longer reflected the source, and reported success.

Two guards close this off. First, assert on something the change introduced, not just on the page loading:

\`\`\`ts
// Prove the new build is being served before trusting anything else.
await expect(page.getByTestId('discount-badge')).toBeVisible();
\`\`\`

Second, have the agent check the dev server is healthy before it navigates:

\`\`\`bash
curl -fsS -o /dev/null -w '%{http_code}\\n' http://localhost:3000 || echo "dev server down"
\`\`\`

The general rule: a screenshot is evidence only when it contains something that could not appear unless the change worked. A screenshot of a page that looks fine proves the page looks fine, which is not the same claim.

## Keeping baselines honest in CI

Visual baselines drift toward uselessness unless they are generated where they are compared. Fonts and antialiasing differ between macOS and Linux, so a baseline captured on a laptop fails on a CI runner for reasons unrelated to your code.

\`\`\`yaml
name: Visual
on: [pull_request]

jobs:
  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test tests/checkout.visual.spec.ts
      - name: Upload diffs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
\`\`\`

Generate baselines inside the same container image the CI job uses, commit those, and never update a baseline without looking at the diff. A workflow that regenerates baselines automatically on failure is a workflow with no visual testing at all.

If you have not set up the MCP server yet, the [Playwright MCP server setup for Claude Code](/blog/playwright-mcp-server-claude-code-setup) walks through the configuration in detail. When a run fails and the screenshot alone is not enough, the [Playwright trace viewer guide](/blog/playwright-trace-viewer-complete-guide-2026) shows how to step through what the browser actually did.

For teams standardizing this, ready-made QA skills install from qaskills.sh with the qaskills CLI, including skills that encode the screenshot verification loop so every session follows it.

## What people get wrong

The first mistake is treating the screenshot as the deliverable. An agent that captures an image and moves on has automated the taking, not the checking. The verification lives in the assertion you wrote beforehand; without one, you have added a step that produces artifacts nobody reads.

The second is capturing only the happy path at one viewport. The bugs that reach users cluster in the empty state, the error state, the long-content state, and the narrow viewport. Those take deliberate setup, which is precisely why they go untested, and precisely why they break.

## Cost, speed, and when to skip it

Screenshot verification is not free. Each capture sends an image into the model's context, and images are expensive relative to text. A session that screenshots after every micro-edit burns budget without adding information.

| Change | Verify with |
|---|---|
| Copy or label text | Accessibility snapshot, no image needed |
| Spacing, color, layout | Screenshot |
| New component | Screenshot at two viewports |
| Conditional rendering logic | Snapshot plus console |
| Backend or data change with no UI effect | Neither |
| Refactor with no visual change | Existing visual baselines in CI |

The accessibility snapshot is the underused option. It is text, so it is cheap, and for a large class of questions ("is the button present, enabled, and named correctly") it is strictly more precise than an image. Reserve pixels for questions that are genuinely about appearance.

A reasonable session policy:

\`\`\`markdown
Prefer the page snapshot over a screenshot when the question is about
presence, text, roles, or enabled state. Capture an image only when the
question is about layout, spacing, color, or overflow. Never capture the
same view twice without an intervening change.
\`\`\`

## Wiring it into a definition of done

The loop only holds if it is written down where the agent reads it every time. A short checklist in \`CLAUDE.md\` outperforms a long one nobody follows:

\`\`\`markdown
## Definition of done for UI work

- [ ] Renders at 1280x800 and 375x812
- [ ] Zero console errors on the affected route
- [ ] Empty and error states checked when the component fetches data
- [ ] Keyboard reachable: interactive elements have real roles
- [ ] A committed test covers whatever was verified by hand
\`\`\`

The final item is what compounds. Anything verified only in a session is verified once; anything converted into a spec is verified on every future change. The agent is good at that conversion because it already has the exact selectors and expectations it just used, and asking for it at the end of the session costs almost nothing.

## Frequently Asked Questions

### Do I need Playwright MCP, or is Puppeteer MCP enough?

Either can drive a browser and return screenshots, so both work for the basic loop. Playwright MCP is the stronger choice for verification because it exposes an accessibility-tree snapshot next to the pixels, which lets the agent assert on roles and names rather than inferring structure from an image. That matters when you want the agent to check that a button is a real button rather than a styled div. Playwright also gives you a direct path from exploratory MCP session to a committed spec file, since the API is the same one your tests use.

### How do I stop visual tests from failing on every run?

Mask the volatile regions and wait on real signals. Prices, timestamps, relative dates, and generated identifiers change between runs and will fail a pixel comparison every time, so pass them in the \`mask\` array of \`toHaveScreenshot\`. Separately, never screenshot after a fixed timeout: wait for a specific element to be visible, because a fixed wait is both slower than it needs to be and unreliable on a loaded CI runner. A small \`maxDiffPixelRatio\` absorbs antialiasing noise without hiding genuine layout changes.

### Can the agent decide whether a design looks good?

No, and it is worth being explicit about that boundary. Screenshot verification answers mechanical questions: did it render, is the element present, does it survive a narrow viewport, are there console errors. Judgments about hierarchy, brand, tone, and whether an interaction feels right are human work, and an agent asked to make them will produce confident answers with nothing behind them. Use the loop as a regression floor so that human review time goes to design questions rather than to catching blank pages.

### Should screenshots from an agent session be committed?

Generally no. Session screenshots are working artifacts: they exist to let the agent check its own work in the moment. What should be committed is the spec file that encodes the same check, plus its baseline images if you are using \`toHaveScreenshot\`. Baselines must be generated in the same environment CI runs in, otherwise font rendering differences will fail every comparison. Keep session artifacts in an ignored directory and treat the committed test as the durable output of the session.
`,
};
