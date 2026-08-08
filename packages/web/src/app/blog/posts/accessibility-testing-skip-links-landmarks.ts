import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Accessibility Testing Skip Links Landmarks: Real User Workflows',
  description: 'Apply accessibility testing skip links landmarks workflows with keyboard checks, semantic HTML, Playwright tests, and diagnostics for reliable navigation.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Accessibility Testing Skip Links Landmarks: Real User Workflows

Accessibility testing skip links landmarks should prove that a keyboard user can bypass repeated blocks and that assistive technology can identify the page's major regions. Start at the browser address bar, press Tab, activate the skip link, and confirm that focus moves to the main content. Then inspect the accessibility structure for one primary \`main\` landmark, correctly scoped navigation landmarks, unique labels where landmarks repeat, and headings that make the destination understandable.

DOM presence is not enough. A skip link can point to a missing target, become hidden when focused, scroll visually without moving keyboard focus, or land under a sticky header. A \`main\` element can exist while duplicate or unlabeled landmarks make navigation confusing. The test strategy must combine static structure, keyboard behavior, visible focus, responsive layouts, and regression automation.

This guide builds a working HTML pattern, demonstrates Playwright checks, covers single-page applications and route transitions, and diagnoses realistic failures. It aligns with WCAG 2.4.1 Bypass Blocks while treating landmarks as a complementary structural mechanism.

## Model the navigation problem from the keyboard user's path

Repeated site headers can contain a logo, search field, account controls, category menus, and dozens of links. A mouse user can move directly to the article or product area. A keyboard user may need to traverse every control on every route unless the page offers a bypass mechanism.

WCAG 2.4.1 requires a mechanism to bypass repeated blocks. A skip link is a common sufficient technique, and semantic regions can support navigation in assistive technology. The W3C explanation is available at https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks, and the skip-link technique is documented at https://www.w3.org/WAI/WCAG22/Techniques/general/G1.

Map the expected sequence before testing:

| Step | User action | Expected observable result |
|---|---|---|
| 1 | Load route and begin keyboard navigation | First useful focus stop is the skip link |
| 2 | Focus skip link | Link is clearly visible and readable |
| 3 | Activate it | View moves to main content and focus follows |
| 4 | Press Tab again | Focus advances within or after main content, not back through header |
| 5 | Open landmark navigation in assistive technology | Main and navigation regions have understandable names |

The critical word is observable. "There is an anchor with href #main" is an implementation fact. "Activation puts the user's point of regard at the main content" is a behavior. Automated checks can cover both, but a human keyboard pass is still needed to assess visibility, clipping, and comprehension.

## Implement a resilient skip-link destination

A solid baseline uses a native link near the start of \`body\`, a fragment target on the \`main\` element, and focus styling that reveals the link. Native elements minimize custom JavaScript and expose familiar semantics.

\`\`\`html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Account activity</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <header>
      <a href="/">Example Store</a>
      <nav aria-label="Primary">
        <a href="/products">Products</a>
        <a href="/orders">Orders</a>
      </nav>
    </header>
    <main id="main-content" tabindex="-1">
      <h1>Account activity</h1>
      <p>Your latest account events appear here.</p>
      <a href="/account/export">Export activity</a>
    </main>
    <footer>Example Store support</footer>
  </body>
</html>
\`\`\`

\`tabindex="-1"\` makes the main element programmatically focusable without adding it to the normal Tab sequence. Browsers differ in historical fragment-focus behavior, and application code can complicate it, so test the actual supported browser matrix. Do not use a positive tabindex to force the destination early in keyboard order.

The CSS hides the link offscreen until it receives focus. It does not use \`display: none\` or \`visibility: hidden\`, which would remove it from keyboard navigation.

\`\`\`css
.skip-link {
  position: fixed;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 1000;
  padding: 0.75rem 1rem;
  color: #ffffff;
  background: #111111;
  border: 2px solid #ffffff;
  border-radius: 0.25rem;
  transform: translateY(-200%);
}

.skip-link:focus {
  transform: translateY(0);
  outline: 3px solid #ffbf47;
  outline-offset: 2px;
}

#main-content {
  scroll-margin-top: 5rem;
}
\`\`\`

\`scroll-margin-top\` helps keep the destination from appearing behind a sticky header. Its value should match the responsive header, not be copied blindly. Zoom and narrow layouts can make the header taller, so verify at multiple viewport widths and at 200 percent browser zoom.

## Distinguish semantic elements from landmark roles

HTML elements such as \`main\`, \`nav\`, \`header\`, \`footer\`, \`aside\`, \`form\`, and \`section\` can create landmark semantics depending on their context and accessible name. Prefer native elements over adding redundant roles. A top-level \`main\` is clearer than \`<div role="main">\` when HTML is available.

| Page region | Preferred HTML | Naming guidance |
|---|---|---|
| Primary content | \`main\` | Usually one per rendered document; label only if useful |
| Site navigation | \`nav\` | Label repeated navigation regions distinctly |
| Site header | top-level \`header\` | Usually exposes banner semantics by context |
| Site footer | top-level \`footer\` | Usually exposes content-info semantics by context |
| Complementary content | \`aside\` | Label if multiple or purpose is unclear |
| Search | \`search\` or supported search role pattern | Use an accessible name when ambiguity exists |

Do not wrap every section in a landmark. Landmarks are a page map, not a replacement for headings. Too many regions create a long, noisy list that makes navigation slower.

When two \`nav\` elements exist, accessible names should explain their purpose. The word "navigation" does not need to be repeated in the label because the role already provides it.

\`\`\`html
<header>
  <nav aria-label="Primary">
    <a href="/catalog">Catalog</a>
    <a href="/account">Account</a>
  </nav>
</header>

<main id="main-content" tabindex="-1">
  <h1>Mechanical keyboards</h1>
  <nav aria-label="On this page">
    <a href="#switches">Switch types</a>
    <a href="#layouts">Layouts</a>
  </nav>
  <section id="switches" aria-labelledby="switch-heading">
    <h2 id="switch-heading">Switch types</h2>
  </section>
</main>
\`\`\`

Labels should remain consistent across routes. If the same site menu is called "Primary" on one page and "Main menu" on another, users must relearn the map. Consistency is especially important in applications where the visible navigation changes with role.

## Run the manual keyboard test correctly

Begin from a clean navigation state. Reload the route, put focus in the browser chrome if needed, then Tab into the document. Starting after clicking the page can place focus midway through the DOM and hide a broken first-tab experience.

Perform this sequence on every representative layout:

1. Press Tab once and identify the focused element without guessing.
2. Confirm the skip link is not clipped, obscured, transparent, or outside the viewport.
3. Read its text and verify the destination is clear.
4. Press Enter.
5. Confirm the main heading or content start is visible below any sticky UI.
6. Inspect the active element with browser developer tools.
7. Press Tab and confirm focus proceeds to the first intended interactive element in main content.
8. Use Shift+Tab to ensure reverse navigation remains coherent.

Repeat at narrow width, high zoom, and with menus closed and open. A cookie banner or chat widget can cover a correctly styled skip link. Test those real overlays rather than disabling everything in the accessibility environment.

For a deeper sequence-based method, use the [accessibility focus order testing guide](/blog/accessibility-testing-focus-order-guide). Skip links change the starting point of that sequence, so their post-activation focus behavior belongs in the same evidence set.

Record a failure with four facts: focused element, visible result, active element after activation, and next focus stop. "Skip link broken" is too vague for a developer to reproduce.

## Automate the keyboard behavior with Playwright

Playwright can press keys and inspect the active element. The following test serves the page through the project's configured \`baseURL\`. It verifies first focus, visibility, activation, and destination focus.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('skip link moves focus to the main content', async ({ page }) => {
  await page.goto('/account/activity');

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  await page.keyboard.press('Enter');
  const main = page.getByRole('main');
  await expect(main).toBeFocused();
  await expect(page).toHaveURL(/#main-content$/);
});
\`\`\`

This assertion is stronger than checking the URL fragment. The fragment can change while focus remains on the link. Conversely, an application may intentionally manage focus without retaining the hash, in which case the behavioral contract should guide the URL assertion.

Add a next-focus assertion using a known control inside main:

\`\`\`ts
import { expect, test } from '@playwright/test';

test('Tab continues inside main after using the skip link', async ({ page }) => {
  await page.goto('/account/activity');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');

  await expect(
    page.getByRole('link', { name: 'Export activity' }),
  ).toBeFocused();
});
\`\`\`

If main begins with plain text and the next interactive element is far down the page, focus on \`main\` may be the correct endpoint. Do not invent a focusable heading solely to satisfy a test. Match the test to the intended user behavior.

## Assert landmark structure without brittle snapshots

A full accessibility-tree snapshot can detect changes, but it often creates noisy diffs. Target the structural invariants that matter: exactly one visible main landmark, meaningful navigation names, one visible H1 for the route, and a skip target that resolves.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('page exposes its core landmark structure', async ({ page }) => {
  await page.goto('/account/activity');

  const mains = page.getByRole('main');
  await expect(mains).toHaveCount(1);
  await expect(mains).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Account activity' })).toBeVisible();

  const targetId = await page
    .getByRole('link', { name: 'Skip to main content' })
    .getAttribute('href');
  expect(targetId).toBe('#main-content');
  await expect(page.locator(targetId!)).toHaveCount(1);
});
\`\`\`

The non-null assertion follows an exact preceding value assertion in a stricter variant. To make the example robust without relying on TypeScript narrowing through a matcher, validate it directly:

\`\`\`ts
import { expect, test } from '@playwright/test';

test('skip link resolves to one fragment target', async ({ page }) => {
  await page.goto('/account/activity');
  const href = await page
    .getByRole('link', { name: 'Skip to main content' })
    .getAttribute('href');

  if (!href || !href.startsWith('#')) {
    throw new Error(\`Expected a fragment href, received \${String(href)}\`);
  }
  await expect(page.locator(href)).toHaveCount(1);
});
\`\`\`

Use role-based locators because they exercise the semantics exposed to accessibility APIs. A CSS selector such as \`main\` is still useful for implementation checks, but it will miss a role-based main and will not tell you whether an element is hidden from the accessible structure.

Framework choice affects fixture and locator conventions. If a team is standardizing its stack, the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) helps separate browser automation needs from unit-runner needs. Keep the accessibility behavior portable even if the runner changes.

## Test responsive and overlay failure modes

Skip links often pass on a clean desktop route and fail in the actual shell. Test the combinations that alter stacking, clipping, or the first focus stop.

| Failure source | What happens | Test condition |
|---|---|---|
| Sticky header | Destination heading sits underneath it | Activate at desktop and mobile header heights |
| Cookie consent | Overlay receives first focus or covers link | Fresh browser context with consent unset |
| Mobile drawer | Hidden menu items remain tabbable | Narrow viewport with drawer closed |
| CSS overflow | Focused link is clipped by ancestor | Route inside application shell |
| Hydration replacement | Focus is lost after client render | Slow JavaScript or route start |
| Multiple micro-frontends | Duplicate main landmarks appear | Fully composed page |

This Playwright test verifies that the focused skip link occupies visible viewport space. It does not judge color contrast, but it catches offscreen or zero-sized elements.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('focused skip link is inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/account/activity');
  await page.keyboard.press('Tab');

  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  const box = await skipLink.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error('Focused skip link has no bounding box');

  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
  expect(box.x + box.width).toBeGreaterThan(0);
  expect(box.y + box.height).toBeGreaterThan(0);
  expect(box.x).toBeLessThan(390);
  expect(box.y).toBeLessThan(844);
});
\`\`\`

The manual pass still checks contrast, readable text, overlap, and whether zoom reflows the link. Pixel geometry alone cannot establish usability.

## Handle client-side routing and focus restoration

In a single-page application, route navigation can replace main content without a full document load. Focus may remain on the navigation link that triggered the route, while the new H1 appears elsewhere. The skip link target might persist correctly, but the route transition itself still needs a focus policy.

Do not automatically focus \`main\` on every state update. That interrupts users during filters, background refreshes, and inline actions. Manage focus on genuine route changes according to the application's navigation contract. A common policy moves focus to the new route's H1 or main container and updates the document title.

Here is a small framework-neutral helper:

\`\`\`js
export function focusRouteHeading(container) {
  const heading = container.querySelector('h1');
  if (!(heading instanceof HTMLElement)) {
    throw new Error('Route requires an h1');
  }
  heading.setAttribute('tabindex', '-1');
  heading.focus();
}
\`\`\`

If a temporary \`tabindex\` is added, decide whether to retain it for predictable back navigation or remove it on blur. Test that decision. The skip link itself should continue to point to a stable, unique ID after route rendering.

Micro-frontends add another risk. Each fragment may ship a \`main\` because it works in isolation. When composed, the page exposes several main landmarks. The shell must own the document-level structure, while fragments use sections and headings unless they truly represent separate top-level documents.

## Diagnose the skip link that scrolls but does not focus

A realistic bug report says: "Enter moves the page down, but the screen reader still announces the header." Inspection shows \`href="#content"\` points to a plain \`div\`. The browser scrolls to it, but programmatic focus remains on the skip link in the tested browser and application shell.

Diagnosis:

1. Inspect \`document.activeElement\` before and after activation.
2. Confirm the target ID is unique and present when the link is used.
3. Confirm the target is the semantic \`main\`, not a decorative wrapper.
4. Add \`tabindex="-1"\` when the target otherwise cannot receive focus.
5. Check whether a client-side click handler calls \`preventDefault()\` and only scrolls.
6. Retest with keyboard and the supported screen reader and browser combinations.

Another failure appears only on mobile: the link becomes visible but is under a header with a higher stacking context. Raising an arbitrary global z-index may create new overlay bugs. Inspect stacking contexts, place the link near the document root, and define a design-system layer for bypass controls.

Treat a missing target as a build-breaking defect. Component refactors frequently rename \`main-content\` while leaving the shared shell link unchanged. The fragment-resolution test catches this cheaply.

## What people get wrong about skip links and landmarks

The first mistake is assuming landmarks eliminate the need for a skip link. Landmark navigation is powerful for users of assistive technologies that expose it, but not every keyboard user has that command. A visible-on-focus skip link provides a direct, broadly understandable bypass.

The second is hiding the link with \`display: none\`. An element removed from layout and the accessibility tree cannot receive keyboard focus. Use an offscreen or transformed technique that becomes fully visible on focus.

The third is checking only that focus reached the link, not where activation landed. Fragment navigation, scroll position, and active element are separate observations.

The fourth is adding ARIA roles to every container. Excess landmarks create noise, and redundant roles add maintenance without improving semantics. Prefer native elements and label repeated regions.

The fifth is treating a passing automated scanner as completion. Scanners can detect missing or duplicate landmarks, but they cannot fully assess whether the skip destination is sensible, focus is visually apparent, overlays interfere, or labels make sense in the product context.

## Build a compact regression matrix

Choose representative templates, not every URL. A directory site might cover the home template, listing, detail, authenticated dashboard, form flow, and error page. Include routes with alternate shells, embedded applications, or consent behavior.

For each template, record:

- First focusable element from a clean load.
- Skip-link visible state and name.
- Resolved unique destination.
- Active element after activation.
- Next forward and reverse focus stops.
- Main landmark count.
- Names of repeated navigation regions.
- H1 presence and route title.
- Narrow viewport and zoom observations.
- Overlay state tested.

Run the small Playwright structural suite on every relevant pull request. Schedule a wider cross-browser and screen-reader pass for shell, navigation, or design-system changes. Manual evidence can be a short structured note rather than a video for every run, but failures should include screenshots and active-element details when those artifacts are safe.

The goal is not to maximize assertions. It is to protect the user's fastest route past repetition and maintain a coherent structural map as the application evolves.

## Include content authors and design systems in the control

Skip-link and landmark failures are not confined to application code. A content-management template can introduce a second H1, a marketing embed can add an unlabeled navigation region, and a design-system release can change the clipping or stacking behavior of every skip link. Assign checks to the layer that owns the invariant.

The shell should own the skip link, document-level header, main container, and footer. Page templates should provide one clear page heading and meaningful sections. Feature components should avoid document-level landmarks unless their contract explicitly requires one. Content authors should use headings in a logical hierarchy and should not paste ARIA roles from visual examples. This ownership model prevents teams from fixing the same structural defect independently on every route.

Add accessibility states to component documentation. Show the skip link hidden, keyboard-focused, active over a sticky header, and wrapped at narrow width. Include tokens for foreground, background, outline, spacing, and stacking layer. A screenshot of only the default hidden state gives designers and reviewers no way to verify the control users actually encounter.

Translations deserve a layout check. "Skip to main content" can become substantially longer in another language. A fixed-width link may truncate it, and a hardcoded accessible name in an automated test may fail even though the localized name is correct. Use locale-specific expected names or stable test fixtures, then manually check wrapping and comprehension with qualified reviewers. Do not replace visible localized text with an English \`aria-label\`, since that can create a mismatch between what sighted and screen-reader users receive.

Analytics can help discover whether the skip link is used, but do not treat low use as evidence that it is unnecessary. Some accessibility features are critical to a smaller group, and usage tracking may itself be incomplete. If activation is measured, avoid collecting sensitive page or user details and ensure the event handler never delays navigation or steals focus.

When a design-system fix lands, run consumer contract tests against representative shells. A technically correct component can still fail inside an ancestor with \`overflow: hidden\`, a transformed stacking context, or an application-wide keyboard shortcut. Integration context is part of accessibility behavior.

## Frequently Asked Questions

### Does every page need a skip link?

WCAG 2.4.1 requires a mechanism to bypass repeated blocks across pages. A skip link is a common solution when repeated navigation precedes main content, but the exact mechanism can vary. Pages without a repeated leading block may not need the same control. For consistency, many sites include one in the shared shell. Test whether the mechanism actually benefits keyboard users on each template, and avoid pointing it to trivial or missing content.

### Should the skip link always be visible?

It can remain visually hidden until keyboard focus as long as it becomes clearly visible, readable, and unobscured when focused. Keeping it always visible is also valid and can improve discoverability. Do not use \`display: none\`, \`visibility: hidden\`, or another technique that prevents focus. Test at narrow widths, high zoom, and with banners or dialogs present, because a focus style that works on a clean desktop can still be clipped or covered.

### Can a page have more than one navigation landmark?

Yes. A page can have primary, secondary, breadcrumb, footer, or on-page navigation. When multiple navigation landmarks exist, give them concise, distinct accessible names so users can identify their purpose. Keep names consistent across routes, and do not include the word "navigation" unnecessarily because the role already conveys it. Too many small navigation regions can make the landmark list noisy, so reserve them for meaningful groups of links.

### Why add tabindex minus one to the main element?

\`tabindex="-1"\` allows script or fragment behavior to move focus to the main container without inserting that container into the normal Tab sequence. This can make skip-link behavior consistent when a browser would otherwise scroll without updating the active element. It is not a substitute for testing. Verify focus after activation in supported browsers, confirm the next Tab stop is sensible, and avoid positive tabindex values that manually reorder keyboard navigation.
`,
};
