import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Disable Animations and Carets in Playwright Screenshots',
  description:
    'Disable animations and blinking carets in Playwright screenshots, stabilize visual baselines, and keep meaningful UI regressions visible in CI.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Disable Animations and Carets in Playwright Screenshots

One pixel diff shows a text cursor, another catches a spinner halfway through a rotation, and a third records a button 80 percent through its hover transition. None represents a product regression, yet all three can fail an otherwise useful visual test. Playwright provides screenshot controls for these moving surfaces, but they need to be applied at the assertion that owns the baseline.

For \`expect(page).toHaveScreenshot()\`, set \`animations: 'disabled'\` and \`caret: 'hide'\`. Playwright's comparison assertion takes repeated screenshots until two consecutive captures match, then compares the stable result with the stored baseline. Disabling predictable motion reduces the time and ambiguity in that convergence process.

## Start with the assertion-level controls

The smallest useful test captures a deterministic page state and declares screenshot behavior next to the expectation:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('billing form visual state', async ({ page }) => {
  await page.goto('/settings/billing');
  await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();

  await expect(page).toHaveScreenshot('billing-form.png', {
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
  });
});
\`\`\`

The \`animations\` option accepts \`'allow'\` or \`'disabled'\`. With disabled animations, finite CSS animations and transitions are fast-forwarded to completion. Infinite animations are canceled to their initial state and replayed after the screenshot. The behavior is more precise than merely waiting an arbitrary second.

The \`caret\` option accepts \`'hide'\` or \`'initial'\`. Hiding is the default for Playwright screenshot assertions, but stating it explicitly documents the baseline policy and prevents confusion when raw \`page.screenshot()\` calls use different options.

| Source of movement | Screenshot control | Expected captured state |
|---|---|---|
| Finite CSS transition | \`animations: 'disabled'\` | Transition reaches its end state |
| Finite CSS keyframes | \`animations: 'disabled'\` | Animation fast-forwards to completion |
| Infinite CSS animation | \`animations: 'disabled'\` | Initial state is captured |
| Focused input caret | \`caret: 'hide'\` | Text remains, insertion cursor is hidden |
| JavaScript interval updating DOM | Neither by itself | Application-specific stabilization required |
| Animated GIF or video | Often mask or replace fixture | Media frame is otherwise nondeterministic |

That last half of the table matters. Playwright's animation switch targets CSS animations, CSS transitions, and Web Animations. It does not freeze every source of time in the browser.

## Understand what disabled animations does to callbacks

Fast-forwarding a finite animation can fire its \`transitionend\` event. If application code changes DOM when that event runs, the screenshot may show the post-transition product state, not merely a frozen intermediate frame. This is usually desirable because the assertion captures the settled interface. It can surprise a test written to inspect an in-progress animation.

Do not use \`animations: 'disabled'\` for a test whose subject is the animation itself. For those cases, control playback with the Web Animations API, a reduced-motion mode, or a product-level test hook, then assert selected frames intentionally. A visual regression baseline should have one documented temporal meaning.

| Test intent | Animation policy | Why |
|---|---|---|
| Stable layout regression | Disable | Motion is noise around final layout |
| Reduced-motion accessibility | Emulate reduced motion and verify behavior | Product response to preference is the subject |
| Transition midpoint design review | Pause or seek deliberately | End-state fast-forward hides the target frame |
| Loading indicator existence | Assert visibility semantically | A pixel frame is weaker than a locator assertion |
| Skeleton-to-content layout shift | Capture named states separately | One baseline cannot explain both phases |

This distinction prevents a common mistake: disabling a progress animation and then claiming the test proves the progress experience. It proves the layout under the disabled-animation capture policy.

## Set a project-wide baseline policy

If nearly every visual assertion needs the same controls, configure \`expect.toHaveScreenshot\` in \`playwright.config.ts\`. Individual tests can still override options for deliberate exceptions.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.001,
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
\`\`\`

This is real Playwright Test configuration: screenshot assertion defaults belong under \`expect.toHaveScreenshot\`, while browser context settings belong under \`use\`. Do not place assertion-only options in \`use\` and assume they affect every capture. The [Playwright test configuration reference](/blog/playwright-test-config-options-complete-reference) helps separate runner, context, and assertion scopes.

Treat the diff tolerance as independent from motion control. A generous \`maxDiffPixelRatio\` may hide genuine typography or spacing changes. First remove known nondeterminism, then choose the smallest tolerance supported by consistent rendering infrastructure. Reporters should retain expected, actual, and diff images when the assertion fails.

## Stabilize focus without deleting useful state

Carets appear only in editable focused content, but focus itself can change borders, labels, outlines, validation hints, and button availability. \`caret: 'hide'\` hides the insertion cursor without blurring the element. That is the right default when the baseline is meant to show a focused form.

Avoid calling \`page.locator('body').click()\` merely to remove the cursor. Blurring changes the state under test and may trigger validation. It can also hide a broken focus ring that should be visible for keyboard users.

For a focused-input baseline, make the state explicit:

\`\`\`typescript
test('email field retains an accessible focus treatment', async ({ page }) => {
  await page.goto('/signup');
  const email = page.getByLabel('Work email');

  await email.focus();
  await expect(email).toBeFocused();
  await expect(page.getByRole('form', { name: 'Create account' }))
    .toHaveScreenshot('signup-email-focused.png', {
      animations: 'disabled',
      caret: 'hide',
    });
});
\`\`\`

This locator screenshot limits the comparison to the form. The input stays focused, the focus ring remains testable, and only the blinking caret disappears. Keep a separate keyboard test for tab order and focus movement because a static image cannot prove navigation behavior.

## Add a test stylesheet for motion outside the option

Playwright's \`stylePath\` option applies a stylesheet while taking the screenshot. It can pierce Shadow DOM and apply to inner frames, making it useful for hiding unstable test-only regions or stopping media behavior that the animation control does not cover. Keep the stylesheet narrow and versioned with the test.

Create \`tests/visual/screenshot.css\`:

\`\`\`css
[data-visual-test="timestamp"],
[data-visual-test="rotating-banner"] {
  visibility: hidden !important;
}

video,
canvas[data-live-chart] {
  opacity: 0 !important;
}

[data-visual-test="pulse"] {
  animation: none !important;
  transition: none !important;
}
\`\`\`

Then resolve the file path in configuration:

\`\`\`typescript
import { defineConfig } from '@playwright/test';
import path from 'node:path';

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      stylePath: path.join(__dirname, 'tests/visual/screenshot.css'),
    },
  },
});
\`\`\`

Use \`visibility: hidden\` when preserving layout matters. \`display: none\` can cause surrounding content to reflow and produce a baseline that users never see. Hiding all canvas and video globally may also remove a core product feature, so prefer data attributes or a page-specific stylesheet for those surfaces.

The style must remove nondeterministic representation, not conceal a region that frequently regresses. Each selector should have an explanation in code review: why it moves, why the motion is irrelevant to this baseline, and which other test covers its behavior.

## Freeze application clocks separately

A clock that updates via \`setInterval\` is not a CSS animation. Nor are randomly generated avatars, websocket counters, streaming tokens, or canvas charts driven by \`requestAnimationFrame\`. Screenshot options cannot infer the stable state you want. Control the underlying input.

Playwright exposes a clock API on \`page.clock\`. Install a fixed time before navigating when page initialization reads the clock:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('subscription card at renewal date', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-13T10:00:00Z'));
  await page.goto('/account/subscription');

  await expect(page.getByTestId('subscription-card')).toHaveScreenshot(
    'subscription-renewal.png',
    { animations: 'disabled', caret: 'hide' },
  );
});
\`\`\`

Use a mocked network response for counters and rotating campaigns. Seed random data or provide stable fixtures. Pause a live chart through an application-supported test mode if the chart itself must remain visible. A masking rectangle is acceptable for a volatile ad slot, but not for the revenue chart whose pixels are the purpose of the assertion.

## Wait for product readiness, not network silence

Animations often hide a deeper race: the screenshot starts before the application has finished rendering. Disabling motion can make the race less visible without eliminating it. Wait for a state meaningful to the product, such as a heading, a loaded marker, a known row count, or disappearance of a skeleton.

\`networkidle\` is discouraged as a generic readiness signal for testing because modern pages keep connections open, poll, or load background resources. A semantic locator assertion retries and explains what the screenshot actually depends on.

\`\`\`typescript
await page.goto('/orders');
await expect(page.getByTestId('orders-skeleton')).toBeHidden();
await expect(page.getByRole('row')).toHaveCount(11);
await expect(page.getByTestId('orders-table')).toHaveScreenshot(
  'orders-table.png',
  { animations: 'disabled', caret: 'hide' },
);
\`\`\`

If the row count is dynamic by design, route the API and fulfill a deterministic fixture. Do not add \`waitForTimeout(2000)\`. It wastes fast runs, still fails on slower machines, and leaves the intended readiness condition undocumented.

## Know the difference between page.screenshot and toHaveScreenshot

\`page.screenshot()\` captures one image. \`expect(page).toHaveScreenshot()\` performs visual comparison and retries until two consecutive screenshots match before comparing against the expected baseline. Both expose screenshot options, but only the assertion owns baseline matching and diff thresholds.

| API | Primary purpose | Baseline comparison | Typical use |
|---|---|---|---|
| \`page.screenshot()\` | Capture an image buffer or file | No | Diagnostics and custom image processing |
| \`locator.screenshot()\` | Capture one element | No | Attach focused diagnostics |
| \`expect(page).toHaveScreenshot()\` | Page visual assertion | Yes | Full-page regression baseline |
| \`expect(locator).toHaveScreenshot()\` | Component visual assertion | Yes | Stable, narrowly scoped comparison |

When a helper uses raw screenshots for a custom comparator, pass \`animations: 'disabled'\` and \`caret: 'hide'\` there too. Do not assume global \`toHaveScreenshot\` settings alter raw screenshot calls.

## Update baselines only after classifying the diff

Motion noise is tempting because accepting a new image makes the pipeline green. Before updating, inspect the actual image, expected image, and diff. Identify whether the mismatch is a caret, an intermediate transition, font rendering, layout, data, or a real product change. Apply the corresponding stabilization, then regenerate under the same operating system, browser project, fonts, viewport, device scale factor, locale, and color scheme used in CI.

For a deeper baseline workflow, including naming and review practices, see [Playwright visual comparison snapshots](/blog/playwright-visual-comparison-snapshots-guide). Animation controls remove one class of noise; they do not make cross-platform pixel output identical.

A practical review record includes:

| Diff classification | Correct response | Bad response |
|---|---|---|
| Blinking caret | Hide caret, keep focus state | Blur the field globally |
| Transition midpoint | Disable animation or await final state | Raise pixel tolerance |
| Wrong font loaded | Install or await the intended font | Accept fallback-font baseline |
| Expected product restyle | Review design change, then update | Silently regenerate all images |
| Dynamic customer data | Stub or seed the data | Mask the whole component |

Baseline files are test inputs. Review them like code, keep their generation environment reproducible, and avoid bulk updates that obscure unrelated changes.

## Preserve tests for motion and accessibility

Stable screenshots should coexist with tests that verify animation behavior. Check that reduced-motion preference removes or shortens nonessential motion. Assert that controls remain operable while transitions run. For an animated disclosure, semantic assertions can prove \`aria-expanded\`, visibility, focus destination, and final layout without relying on a pixel at an arbitrary millisecond.

Create a dedicated project or context with \`reducedMotion: 'reduce'\` when testing the user preference. That emulates the media feature supplied to the page. It is different from the screenshot option, which manipulates animations during capture. Mixing the two makes it hard to say whether the product honored reduced motion.

The senior test-design decision is to name the state: final expanded panel, initial loader, focused field, or reduced-motion menu. Then configure time and movement so the image can represent that state consistently.

## Handle popovers, tooltips, and hover transitions

Hover-driven UI combines pointer state with animation. Move the pointer to the target, assert the popover is visible, and capture the owning component with animations disabled. Do not take a full-page image if only a small tooltip is relevant; unrelated content expands the diff surface.

\`\`\`typescript
test('quota help explains the monthly reset', async ({ page }) => {
  await page.goto('/usage');
  const trigger = page.getByRole('button', { name: 'About usage limits' });
  await trigger.hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toContainText('resets on the first day');
  await expect(page.getByTestId('quota-panel')).toHaveScreenshot(
    'quota-tooltip.png',
    { animations: 'disabled', caret: 'hide' },
  );
});
\`\`\`

Some tooltips disappear when the pointer moves. Playwright does not intentionally move the mouse merely to hide a caret, so preserve the hover and use a locator assertion. Capture open and closed states as separate named baselines when both matter.

## Stabilize fonts before blaming animation

Font loading changes line breaks, glyph widths, and anti-aliasing. It can look like a transition diff even after animations are disabled. Bundle or install the same fonts in baseline and CI environments, then wait for the relevant font to be ready if the application loads it asynchronously.

Browser binaries, operating systems, device scale factors, and rendering libraries also influence pixels. Generate baselines in the same container or runner family that evaluates them. The \`scale: 'css'\` option can reduce device-pixel expansion, but it does not make different font stacks equivalent.

If a web font fails to load, do not update the baseline to the fallback font. Assert the intended computed font family or monitor the font request, fix readiness, and capture again. Visual tests should expose missing assets rather than normalize them.

## Use masks as a reviewed exception

Playwright can mask locators during a screenshot. Masks are appropriate for content whose pixels are unpredictable and outside the assertion's purpose, such as a third-party advertisement or generated avatar. They are not appropriate for the price, balance, or status the component exists to display.

Prefer deterministic data first. If masking remains necessary, make the locator narrow and add a semantic assertion for behavior hidden beneath it. A masked clock can still be checked for accessible text format. Record the justification beside the test so future maintainers do not broaden the rectangle casually.

## Frequently Asked Questions

### Are animations and carets disabled by default in Playwright screenshot assertions?

For \`toHaveScreenshot\`, the documented defaults are disabled animations and a hidden caret. Setting both explicitly in project configuration makes the team's policy visible and keeps helper behavior easier to compare. Raw screenshot usage should be reviewed separately.

### Why does my screenshot still change after setting animations to disabled?

The movement may come from JavaScript timers, canvas rendering, video, an animated image, network data, or randomness rather than CSS or Web Animations. Stabilize that input with the clock, deterministic routes, fixtures, an application test mode, or a narrowly justified mask.

### Does hiding the caret remove the focused input style?

No. It hides the insertion cursor during capture without intentionally blurring the element. Focus rings, floating labels, and focused borders remain, which is useful when the baseline is specifically about keyboard focus.

### Can I use a CSS rule that disables every transition on the page?

You can apply test CSS through \`stylePath\`, but a universal rule can alter product state and transition-end behavior. Prefer Playwright's animation option first, then add narrow selectors for surfaces it cannot stabilize. Document what each override conceals.

### Should I increase maxDiffPixels to absorb animation noise?

No. Tolerance accepts changed pixels regardless of cause, so it can hide a real spacing, color, or text regression. Remove the motion source, define page readiness, and only then set a small tolerance for unavoidable rendering variance.
`,
};
