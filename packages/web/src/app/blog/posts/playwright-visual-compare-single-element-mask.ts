import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Compare One Element with Masks in Playwright Visual Tests',
  description:
    'Compare one Playwright element while masking dynamic subregions, stabilizing snapshots, controlling mask scope, and preserving meaningful visual coverage.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Compare One Element with Masks in Playwright Visual Tests

The account card is stable except for its rotating security code. Replacing the entire card with a mask would silence the code, but it would also stop testing the border, spacing, avatar, labels, and action menu. Playwright can snapshot the card locator while masking only the code locator inside it. That is the useful granularity: one subject, one unstable subregion.

Masking is an exclusion decision, not a generic cure for screenshot noise. The masked pixels are painted with a solid color before comparison, so changes under them are intentionally invisible. A disciplined test keeps the masked rectangle small, locates it semantically, and verifies its behavior through another assertion.

## Element snapshot first, subregion mask second

\`expect(locator).toHaveScreenshot()\` compares the rendered image of a single located element. Its \`mask\` option accepts an array of locators. Playwright overlays each matched region, pink by default, before it compares actual output with the stored baseline.

This is different from taking a page screenshot and masking the target element. The subject locator defines what belongs in the image. Mask locators define what within that captured area should not influence the diff. A mask can technically point outside the subject, but an off-subject rectangle contributes nothing useful and often signals that scope was not understood.

| Visual intent | Snapshot subject | Mask target | Coverage retained |
|---|---|---|---|
| Verify profile card around live one-time code | Profile card | Code value | Card layout, labels, border, controls |
| Verify invoice row while timestamp updates | Invoice row | Timestamp text | Amount, status, alignment, icon |
| Check weather tile around animated radar | Weather tile | Radar viewport | Header, units, warning badge, container |
| Compare chat message with generated avatar | Message bubble | Avatar image | Bubble geometry, author, body, delivery state |
| Verify analytics widget with changing metric | Widget panel | Numeric metric | Title, legend, axes, empty-state chrome |

Start from the smallest element that represents the component contract. A component locator reduces unrelated page noise, produces compact diffs, and lets the mask use coordinates resolved from live DOM rather than hardcoded rectangles.

## A runnable masked locator assertion

Assume a billing page renders a subscription card. The renewal date and plan layout are deterministic, but a QR code refreshes every few seconds. The test locates the card by accessible region, locates the volatile QR code within that card, asserts that the code still has a useful accessible name, and masks only its pixels.

\`\`\`ts
// tests/subscription-card.visual.spec.ts
import { expect, test } from '@playwright/test';

test.use({
  viewport: { width: 1280, height: 720 },
  colorScheme: 'light',
  locale: 'en-US',
  timezoneId: 'UTC',
});

test('subscription card keeps its approved composition', async ({ page }) => {
  await page.goto('/settings/billing?fixture=active-pro');

  const card = page.getByRole('region', { name: 'Current subscription' });
  const rotatingCode = card.getByRole('img', { name: 'Temporary verification code' });

  await expect(card).toBeVisible();
  await expect(rotatingCode).toBeVisible();
  await expect(rotatingCode).toHaveAttribute('data-state', 'ready');

  await expect(card).toHaveScreenshot('active-pro-subscription.png', {
    mask: [rotatingCode],
    maskColor: '#7f00ff',
    animations: 'disabled',
    caret: 'hide',
  });
});
\`\`\`

The custom mask color is optional. A distinctive color can make excluded regions obvious during baseline review. Use the same color in all environments because the mask itself becomes part of both expected and actual images.

The screenshot assertion belongs to Playwright Test. It waits for repeated screenshots to stabilize before performing the final comparison. That helps with rendering settle, but it cannot make changing content meaningful. The QR code could stabilize briefly at a different value, which is why it remains masked.

## Locators make masks follow the component

Hardcoded screenshot rectangles are fragile when responsive layout moves content. Locator masks are calculated from current element bounding boxes, so the exclusion travels with the timestamp, avatar, ad slot, or token. The locator must still be strict and stable.

Scope a mask through the subject whenever possible:

\`\`\`ts
const row = page
  .getByRole('row')
  .filter({ has: page.getByText('Deployment production-eu') });

const relativeTime = row.getByTestId('relative-time');
const operatorAvatar = row.getByTestId('operator-avatar');

await expect(relativeTime).toHaveText(/ago|just now/);
await expect(operatorAvatar).toHaveAttribute('alt', /Operator/);

await expect(row).toHaveScreenshot('production-deployment-row.png', {
  mask: [relativeTime, operatorAvatar],
  maskColor: '#6b7280',
});
\`\`\`

The row filter identifies a particular deployment using content, and each mask begins inside that row. A page-wide \`.getByTestId('relative-time')\` could match dozens of elements, creating a large collection of masks or a confusing strictness result depending on the operation. Relative locators show exactly which pixels are being excluded from which image.

Playwright applies masks to matching elements even if they are invisible, according to its screenshot option behavior. If a conditionally absent element should not be masked, model that state explicitly. A hidden mask locator can have a bounding box or layout effect you did not anticipate. Prefer a fixture that chooses a defined visual state and assert visibility before capture.

## Stabilize before reaching for another mask

Many screenshot differences are controllable inputs, not inherently dynamic regions. A date varies because timezone was not fixed. Text wraps because the CI font is missing. The caret appears because an input retained focus. An animation is halfway through because the component never exposes readiness. Masking these symptoms weakens coverage.

Stabilize environment and data in layers:

| Noise source | Better control | Mask only when |
|---|---|---|
| Current date or relative time | Clock injection or fixed API fixture | Live-time presentation itself must remain live |
| Random test account | Stable seeded record | Avatar or generated identity is outside this test's contract |
| CSS transition | \`animations: 'disabled'\` or app test setting | Motion region cannot be deterministically paused |
| Input caret | \`caret: 'hide'\` or blur the field | Caret location is irrelevant but field state matters |
| Remote image | Serve pinned fixture asset | The integration intentionally returns changing media |
| Font differences | Install and pin the same fonts | User-supplied text uses an uncontrolled font preview |
| Browser/OS rasterization | Run baseline comparison on controlled image | A narrow third-party raster remains variable |

Masking a whole text block because a locale differs is usually the wrong response. Pin the locale or maintain project-specific baselines if localization is under test. Masking an image because it sometimes fails to load is worse: the test stops detecting the broken image. Fix readiness and network determinism.

The broader [Playwright visual comparison snapshots guide](/blog/playwright-visual-comparison-snapshots-guide) covers environment parity, baseline location, and update review. A mask should be the last stabilization choice for content that is validly variable.

## Mask geometry can create its own false diffs

The mask rectangle is derived from element layout. If the dynamic text changes width, its mask width changes too, producing a diff around the excluded region. A relative time moving from “9m” to “10m” or a price adding a digit can change the box. The content is hidden, but its geometry remains observable.

Sometimes that is desirable. If a changing metric pushes neighboring labels, the component layout has changed and the test should notice. In other cases, the unstable text is deliberately allocated a fixed-width slot. Give that slot a stable container and mask the container, not the variable inline text node.

Margins, shadows, pseudo-elements, and overflow deserve attention. The mask covers the target bounding box, not an intuitive semantic halo. A pulsing box shadow may extend outside it. Masking the parent could cover too much. The better fix may be disabling the pulse through animation controls or applying screenshot-only CSS using Playwright's \`style\` option when the style is purely incidental.

Baseline reviewers should look at the mask rectangle itself. If it grows after a change, investigate why. Accepting a larger solid patch casually expands the untested surface.

## Mask color is a diagnostic choice

Pink is the default mask color. Teams sometimes change it to blend into the background, hoping for cleaner snapshots. That makes exclusions harder to notice and can conceal accidental mask expansion. A conspicuous, consistent color makes the baseline honest.

There is one technical reason to choose carefully: antialiasing and edges around the solid overlay can interact with nearby pixels. Keep the mask aligned to stable element bounds, and avoid interpreting pixels immediately adjacent to it as component rendering. If the masked element has rounded corners, the overlay is still a rectangular diagnostic region rather than a content-aware cutout.

Do not use transparency as an imagined mask mode unless the documented API supports the exact color you supply and your baseline process validates it. A solid opaque color gives deterministic bytes. The goal is not a beautiful reference image; it is a repeatable and reviewable exclusion.

## Assert what lives underneath the mask elsewhere

Visual masking says nothing about correctness inside the rectangle. Pair it with a nonvisual assertion that matches the reason for variability. A live timestamp can be parsed and checked within an expected time window. An avatar can be checked for a nonempty alt attribute and a successful network response. A rotating code can be verified for format, expiry behavior, and refresh.

For example, if a six-digit one-time password is masked, assert \`/^\\d{6}$/\`, then use a dedicated functional test to confirm that the server accepts it once and rejects it after expiry. The component snapshot retains layout coverage while the functional test owns authentication behavior.

This separation produces clearer failures. A snapshot diff reports visual regression in the stable card. A format assertion reports invalid dynamic content. A network assertion reports a missing asset. A single giant visual assertion would not identify those contracts cleanly.

Keep a short comment next to each mask explaining the alternate coverage and why deterministic control is not appropriate. Reviewers can then tell whether the exclusion is a deliberate boundary or a quick response to flakiness.

## Multiple masks versus a larger container mask

Two small masks are generally better than one parent mask when stable content lies between them. However, many tiny masks can indicate that the subject contains too much live data for baseline comparison. At some point, a dedicated story, test route, or component fixture offers a clearer visual contract.

| Situation | Preferred design | Reason |
|---|---|---|
| Two independent live badges | Two scoped mask locators | Stable content between them remains compared |
| Five values inside one fixed live-data panel | Mask the panel and test it functionally | Individual masks add noise without meaningful visual coverage |
| Entire card generated by user content | Fixture the card data | Masking would leave almost no product surface |
| Third-party video embedded in stable shell | Mask the player viewport | Shell controls and surrounding layout remain valuable |
| One animated icon with stable resting state | Freeze animation at resting state | The icon itself should retain visual coverage |

A mask budget can help in review. This is not a universal numeric threshold, but a prompt: how much of the element area is excluded, and is the remaining comparison still valuable? If the solid rectangles dominate the baseline, redesign the test rather than declaring victory over flakes.

## Responsive and project-specific snapshots

Element shape can vary legitimately across viewport, browser, theme, and locale. Do not reuse one baseline across configurations that intentionally produce different images. Playwright projects and snapshot path templates can keep those outputs separate. Name the snapshot for the state, not for the browser if project naming already handles the environment.

Masks use live layout in each project. A desktop QR code might sit beside text while mobile places it below. The same semantic mask locator can follow both, but each expected image should represent that project's composition. Ensure the target and masks have reached their final responsive layout before capture.

Dark mode also changes the mask's contrast with surrounding pixels. Keeping one explicit mask color across themes makes exclusions visible, while theme-specific baselines hold the actual component colors. If the mask accidentally covers a theme regression, alternate semantic assertions will not rescue missing visual coverage, so inspect the excluded area during baseline review.

For resilient locator principles and waiting discipline, see [Playwright best practices 2026](/blog/playwright-best-practices-2026). Visual tests amplify locator ambiguity because a wrong but visible target can generate a plausible new baseline.

## Baseline updates should audit every exclusion

Generate a baseline only in the controlled environment used for comparison. On first capture, open the image and verify that the subject bounds are exact, every mask is necessary, no stable label sits under a mask, and no loading placeholder remains. Check the image dimensions against the expected responsive state.

When a diff is intentional, review expected, actual, and difference artifacts. Updating snapshots should be an explicit code-review action. A command that replaces all baselines can normalize an unrelated layout failure or broaden a mask unnoticed.

Store the reason for the dynamic region in code or test documentation. Periodically retest whether it can now be fixed through a seeded response or clock. Product architecture evolves, and yesterday's unavoidable mask may become unnecessary after the component gains deterministic inputs.

## Detect masks that quietly grow

Playwright resolves mask rectangles at capture time, so a test can still pass after a wrapper expands and hides more stable content, provided the baseline is updated. Add a geometry assertion when exclusion size is part of the review boundary. Read the mask locator's bounding box and verify its width and height stay within a justified range before taking the screenshot.

Area checks are especially useful for advertisements, maps, and video players whose containers respond to layout. Compare mask area with subject area and log the ratio in failure output. This is not a universal quality score. It is a guard against a supposedly small exclusion becoming most of the component after a CSS change.

Also inspect count. If a locator that matched one timestamp now matches every timestamp nested in a virtualized list, the screenshot may acquire many opaque rectangles. Assert the intended count or scope through a unique component locator. Avoid selecting the first match merely to satisfy strictness, because reordered content could mask the wrong value while leaving the real dynamic region exposed.

When mask geometry legitimately changes across breakpoints, set breakpoint-specific expectations in the corresponding Playwright projects. The requirement remains explicit: desktop excludes the code panel beside the details, mobile excludes the code panel below them. A single permissive maximum across both layouts is easier to write but harder to review.

## Third-party frames need an owned boundary

An embedded payment frame, map, or media widget may change without your deployment. If the integration is outside the component's visual contract, mask the frame viewport while retaining the host shell, consent text, loading state, and error treatment. Use a locator for the frame element or its stable wrapper, not selectors inside a cross-origin document merely to calculate a rectangle.

Functional integration coverage still has to prove that the frame loads the intended provider and that host-to-frame events work. A network assertion, sandboxed test provider, or dedicated end-to-end environment can own those behaviors. The masked component snapshot then checks what your application controls around the unpredictable pixels.

Capture a separate baseline for provider failure states if those are rendered by the host. A mask that remains in place when the frame is replaced by an application-owned error panel would hide valuable recovery UI. Make the mask conditional on the confirmed ready state, and snapshot the unmasked error component in its own test.

## Frequently Asked Questions

### Can a mask locator be outside the element I am snapshotting?

It can be supplied, but only the overlap with the captured image can affect that image. Scope masks inside the subject locator so ownership is obvious and accidental page-wide matches do not create confusing exclusions.

### Why does my masked timestamp still cause screenshot differences?

Its bounding box may change as the text width changes, or effects such as shadows may extend beyond the box. Mask a stable fixed-width wrapper when that geometry is intentionally constant, or control the clock instead.

### Does masking hide an element from accessibility assertions?

Accessibility state remains available. The mask affects screenshot pixels, not the DOM or accessibility tree. You can and should assert the masked element's role, name, text pattern, state, or behavior separately.

### What color does Playwright use for masks?

The default is pink. Set \`maskColor\` to an explicit CSS color when your team wants a consistent diagnostic color, and commit baselines generated with that same setting.

### Is masking better than setting maxDiffPixelRatio?

They address different variation. A mask excludes a known semantic region completely. A diff threshold tolerates a bounded amount of change anywhere in the image. Use a mask for an intentionally variable subregion and a small threshold only for understood raster-level noise.
`,
};
