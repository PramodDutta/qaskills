import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright locator.or() vs filter() for Fallback Elements',
  description:
    'Compare Playwright locator.or() vs filter() for fallback elements, avoid strictness traps, and choose deterministic locators for alternate UI states.',
  date: '2026-07-13',
  category: 'Comparison',
  content: `
# Playwright locator.or() vs filter() for Fallback Elements

A checkout page ships two versions of the same promo banner depending on which experiment bucket the session lands in. Bucket A renders a dismissible banner with the text "Free shipping unlocked." Bucket B renders a loyalty widget with the text "You have 340 points." Both live in the same DOM slot, both use the same wrapper class, and only one of them ever appears for a given session. A test written against \`page.getByTestId('promo-slot')\` passes locally against bucket A, then breaks in CI the moment the experiment flips the session into bucket B, because the selector that worked for one variant has no idea the other one exists.

This is the fallback element problem: your UI can legitimately render one of several alternate states, and your test needs a locator strategy that tolerates all of them without silently matching the wrong one, or worse, matching both and tripping Playwright's strict mode. Two APIs solve this, and they solve different halves of it. \`locator.or()\` builds a union across chains that share nothing structurally. \`locator.filter()\` narrows a chain you already have down to a specific match inside a known set of candidates. Picking the wrong one produces either a locator that's too narrow to survive a UI variant, or one that's too broad and throws a strict mode violation the first time both alternates happen to be present at once.

## Why Strict Mode Flags the Fallback Pattern

Playwright's locator actions (\`click\`, \`fill\`, \`textContent\`, and the rest) refuse to operate on more than one matched element unless you explicitly resolve the ambiguity. This is strict mode, and it is the entire reason fallback locators are tricky in the first place. If you write a locator broad enough to catch both the banner and the loyalty widget, and a QA environment happens to render both during a transition state or a caching bug, \`click()\` throws immediately:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('promo slot resolves to exactly one element', async ({ page }) => {
  await page.goto('/checkout');

  const promoSlot = page.locator('[data-testid="promo-slot"] > *');
  // If both the banner and the loyalty widget render, this throws:
  // Error: strict mode violation: locator resolved to 2 elements
  await expect(promoSlot).toBeVisible();
});
\`\`\`

That failure is not a bug in Playwright. It is Playwright refusing to guess which of two matched elements you meant, because guessing wrong produces a false-positive pass that hides a real defect (both variants rendering simultaneously is itself worth catching). The fix is not to loosen the assertion. It's to be explicit about what "the promo slot, in whichever state it's in" actually means: either "this OR that, and I expect exactly one," or "start from this container, then narrow to the one candidate that matches."

## locator.or() for True Either/Or Matching

\`locator.or()\` combines two independently defined locator chains into a single locator that matches whichever one is present. Use it when the alternates don't share a common parent selector you can filter from, or when they're different enough in structure that describing them as "the same slot, filtered by content" would be a stretch.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('checkout promo shows banner or loyalty widget, never both', async ({ page }) => {
  await page.goto('/checkout');

  const promoBanner = page.getByTestId('free-shipping-banner');
  const loyaltyWidget = page.getByTestId('loyalty-points-widget');
  const promoOrLoyalty = promoBanner.or(loyaltyWidget);

  // Strict mode still applies: exactly one of the two must be present.
  await expect(promoOrLoyalty).toBeVisible();

  if (await promoBanner.isVisible()) {
    await expect(promoBanner).toContainText('Free shipping unlocked');
  } else {
    await expect(loyaltyWidget).toContainText('points');
  }
});
\`\`\`

Two things matter here. First, \`or()\` does not disable strict mode, it just widens what counts as a match. If both \`promoBanner\` and \`loyaltyWidget\` are visible at the same time, \`promoOrLoyalty\` still resolves to two elements and \`toBeVisible()\` still throws, which is exactly the behavior you want: a session should never legitimately render both promo variants. Second, once you've confirmed the union is a single visible element, you still need a branch to assert the state-specific content, because \`or()\` gives you presence, not identity. Checking \`isVisible()\` on each original locator afterward is the normal way to figure out which branch actually rendered, and it's cheap because Playwright's \`isVisible()\` doesn't wait or retry, it reports the current state.

\`or()\` chains further too. If your app has three promo variants instead of two, \`bannerA.or(bannerB).or(bannerC)\` reads cleanly and keeps strict mode enforcement across all three. This is the API you reach for when the fallback candidates are structurally unrelated elements that happen to occupy the same visual slot.

## locator.filter() for Narrowing Within a Known Set

\`filter()\` starts from a locator that already matches multiple elements and narrows the set down using a condition. This is the right tool when your alternates share a common selector, a repeated card layout, a list of table rows, a set of sibling components, and you want to select the one instance matching a specific state.

Say the checkout page renders a list of shipping method cards, and depending on the cart's weight tier, either a "Standard" card or an "Express" card carries a \`data-recommended="true"\` attribute. You don't want two separate locators for two attribute values; you want one locator over the card list, filtered to the recommended one:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('recommended shipping card is highlighted', async ({ page }) => {
  await page.goto('/checkout/shipping');

  const shippingCards = page.getByTestId('shipping-card');
  const recommendedCard = shippingCards.filter({
    has: page.getByText('Recommended', { exact: true }),
  });

  await expect(recommendedCard).toHaveCount(1);
  await expect(recommendedCard).toBeVisible();
});
\`\`\`

\`filter()\` takes several options, and each one answers a different question about the candidate set:

| Filter option | Question it answers | Typical fallback use |
|---|---|---|
| \`has\` | Does this candidate contain a given locator? | Card contains a "Recommended" badge element |
| \`hasNot\` | Does this candidate NOT contain a given locator? | Card has no "Sold out" overlay |
| \`hasText\` | Does this candidate's text include a string or match a regex? | Row text includes "Express" |
| \`hasNotText\` | Does this candidate's text exclude a string or regex? | Row text does not include "Unavailable" |
| \`visible\` | Is this candidate currently visible in the DOM? | Skip hidden duplicate rows rendered off-screen for animation |

The \`visible\` option is worth calling out on its own because it solves a specific fallback headache: pages that render both states in the DOM simultaneously and toggle visibility with CSS instead of conditionally mounting components. If your loyalty widget and free-shipping banner both exist in the DOM at all times, with only one of them actually shown, a plain \`getByTestId\` grabs both, hidden one included, and strict mode throws on an assertion that should have been trivial. Filtering by \`visible: true\` collapses the candidate set down to whichever one the user can actually see:

\`\`\`typescript
const promoCandidates = page.getByTestId(/free-shipping-banner|loyalty-points-widget/);
const visiblePromo = promoCandidates.filter({ visible: true });

await expect(visiblePromo).toHaveCount(1);
\`\`\`

That pattern only works because both candidates share a discoverable common locator (here, a regex across test IDs). If the alternates don't share anything you can select with one call, you're back to \`or()\`.

## Choosing Between the Two

The decision comes down to whether the alternates are siblings within one enumerable set, or independent elements that happen to occupy the same UI region.

| Situation | Use | Why |
|---|---|---|
| Alternates share a parent selector or repeated structure (cards, rows, list items) | \`filter()\` | You already have a multi-match locator; narrow it |
| Alternates are structurally unrelated elements (different test IDs, different tag trees) | \`or()\` | There's no shared base locator to filter from |
| Both alternates exist in the DOM, one hidden via CSS | \`filter({ visible: true })\` | Narrows to the rendered one without touching structure |
| Only one alternate is ever mounted, the other is absent from the DOM entirely | \`or()\` | \`filter()\` needs the candidate mounted to inspect it; \`or()\` handles absence cleanly |
| You need to exclude a known bad state from a set (sold out, disabled) | \`filter({ hasNot })\` or \`filter({ hasNotText })\` | Negative narrowing is filter's job, not or's |

A rule of thumb that holds up in practice: if you find yourself writing \`.or()\` chains where every branch is the exact same test ID with a different attribute value, you're fighting the DOM instead of describing it, and \`filter()\` on a single base locator is almost always the cleaner rewrite.

## When Both Alternates Match: Handling Ambiguity Safely

Sometimes a fallback locator resolves to more than one element and that's expected, not a bug, usually because the "alternate" is really a ranked list and you want the first eligible entry. A support ticket queue might show either an "Assigned to you" card or, if none exist, a "Next in queue" card, but during a data seeding race in a staging environment both could transiently render. Reaching for \`.first()\` without first confirming intent is how flaky tests get written, so use it deliberately and document why:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('support queue shows an assigned or next-in-queue ticket', async ({ page }) => {
  await page.goto('/support/queue');

  const assignedTicket = page.getByTestId('assigned-ticket');
  const nextTicket = page.getByTestId('next-in-queue-ticket');
  const eitherTicket = assignedTicket.or(nextTicket);

  // Assigned tickets take priority over the general queue by product rule,
  // so if both render (a known staging seed-data overlap), assigned wins.
  const ticketToOpen = eitherTicket.first();
  await expect(ticketToOpen).toBeVisible();
  await ticketToOpen.click();
});
\`\`\`

\`.first()\` bypasses strict mode entirely, which is exactly why it needs a comment explaining the business rule behind the ordering, not just the mechanical reason it was added. A \`.first()\` with no explanation next to it is indistinguishable from a hack that was slapped on to silence a strict mode error the author didn't understand. If your fallback truly has no meaningful priority order and multiple matches at once genuinely indicates a bug, don't reach for \`.first()\` at all, let the strict mode violation fail the test.

## Actionability and Visibility Checks Before You Assert

\`or()\` and \`filter()\` both return a \`Locator\`, not an element handle, so Playwright's actionability checks still apply at the point you call an action or an auto-retrying assertion. \`expect(locator).toBeVisible()\` polls and retries until timeout, which matters a lot with fallback elements because the two alternates frequently don't render on the same timeline. A loyalty widget that depends on a slower points-balance API call might mount a beat after the free-shipping banner would have. A raw \`isVisible()\` check taken too early returns \`false\` for both candidates, not because neither will ever show, but because neither has finished rendering yet:

\`\`\`typescript
// Fragile: isVisible() doesn't wait, so an early check can miss a slow-loading alternate.
const isPromoBannerUp = await promoBanner.isVisible();

// Reliable: auto-retrying expect gives the slower alternate time to mount.
await expect(promoBanner.or(loyaltyWidget)).toBeVisible({ timeout: 10_000 });
\`\`\`

The rule is simple: use \`isVisible()\` for a snapshot branch decision after you've already confirmed something is on screen (as in the earlier checkout example), and use \`expect(...).toBeVisible()\` when you're waiting to find out which alternate is going to show up. Mixing the two up, snapshotting before the wait, is one of the most common sources of flaky fallback tests, and it has nothing to do with \`or()\` or \`filter()\` being unreliable.

## Reading the Trace Viewer When Fallback Locators Misbehave

When a fallback locator test fails, the trace viewer is where you find out whether the failure was a real UI defect or a bad locator, and the two failure modes look different. Open the trace with \`npx playwright show-trace trace.zip\` and check the action log against the DOM snapshot at the point of failure.

A genuine strict mode violation shows up as an explicit error in the action log naming both matched elements, and clicking into the DOM snapshot at that timestamp will show both alternates rendered at once, confirming a real product bug (the experiment bucket logic double-rendered). A locator that's too narrow shows a different signature: the action times out waiting for visibility, and the DOM snapshot shows the *other* alternate rendered instead, meaning your \`filter()\` or \`or()\` chain didn't account for the state that actually shipped. The network tab within the trace is worth a look too when a slower alternate (like that loyalty widget waiting on a points API) never shows up in time, since a failed or delayed XHR is often the real root cause behind what looks like a locator problem.

The trace's "before" and "after" screenshots for the failing action are the fastest way to distinguish these cases without re-running the test locally. If the elements you expected are visible in the "before" screenshot but the assertion still failed, look at the locator logic, not the app. If they're absent from the screenshot entirely, look at the app's rendering logic first. Getting familiar with the trace viewer's action log matters more for fallback locators than for straightforward single-state selectors, because the failure mode is inherently ambiguous between "the test picked wrong" and "the app rendered wrong," and the trace is the only artifact that resolves that ambiguity after the fact. Building good locator habits from the start, covered in more depth in [Playwright best practices for 2026](/blog/playwright-best-practices-2026), pays off directly here since well-scoped \`data-testid\` attributes are what make both \`or()\` and \`filter()\` chains legible months later.

Pairing fallback locators with soft assertions is also worth considering when a test needs to report on multiple possible UI states without stopping at the first mismatch. The tradeoffs there are covered in the [guide to Playwright soft assertions and expect](/blog/playwright-soft-assertions-expect-guide), which is a natural next step once your fallback locator logic itself is solid.

## Frequently Asked Questions

### Can I use or() and filter() together in the same locator chain?

Yes. A common pattern is building a union with \`or()\` across structurally different alternates, then applying \`filter()\` to narrow within one of those branches if it itself represents a repeated set. For example, \`bannerList.or(widgetList).filter({ hasText: 'urgent' })\` first unions two candidate groups, then narrows the combined set to entries matching a text condition.

### Does locator.or() care about the order I pass the locators in?

No. \`or()\` doesn't prioritize the first locator over the second when determining what counts as a match, both are checked and either one satisfies the union. Ordering only matters if you later call \`.first()\` on the combined locator, since \`.first()\` resolves based on DOM order, not the order you wrote the \`.or()\` chain in.

### Why does filter({ hasText }) sometimes match more than I expect?

\`hasText\` does a substring match by default, not an exact match, so \`filter({ hasText: 'Express' })\` will also match a card whose text reads "Express Plus" or "Non-Express handling." Pass a regex with anchors, like \`filter({ hasText: /^Express$/ })\`, when you need an exact match instead of a substring.

### Is filter({ visible: true }) the same as checking isVisible() in a loop?

No, and this matters for reliability. \`filter({ visible: true })\` is evaluated as part of the locator's resolution at the moment an action or auto-retrying assertion runs against it, so it participates in Playwright's retry mechanism. A manual loop calling \`isVisible()\` on each candidate is a one-time synchronous check with no retry, which reintroduces the same early-check flakiness that plain \`isVisible()\` calls cause elsewhere.

### What happens if neither alternate in an or() chain ever appears?

The combined locator resolves to zero elements, and any action or \`toBeVisible()\` assertion against it times out with a standard "element not found" style error, the same as it would for a single locator matching nothing. \`or()\` doesn't change timeout behavior, it only changes what counts as a match when something does appear.
`,
};
