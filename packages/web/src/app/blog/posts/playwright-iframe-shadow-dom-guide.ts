import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright iframe & Shadow DOM: Complete 2026 Handling Guide',
  description: 'Test iframes and Shadow DOM with Playwright in 2026. frameLocator, cross-origin frames, open and closed shadow roots, and accessibility tree traversal.',
  date: '2026-05-13',
  category: 'Guide',
  content: `
# Playwright iframe and Shadow DOM: Complete 2026 Handling Guide

Iframes and Shadow DOM are the two browser features that break naive test locators. Iframes embed entirely separate documents into a parent page; Shadow DOM hides elements behind component boundaries. Most test frameworks handle them clumsily, requiring frame switches and special selectors. Playwright handles both cleanly through a single mechanism: locators that pierce frames and shadow roots automatically, plus a \`frameLocator\` for explicit frame scoping when needed.

This guide is the complete reference for testing iframes and Shadow DOM in Playwright 1.49+. Every example is TypeScript and reflects the API as of mid-2026.

For broader Playwright patterns, see the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide). The [playwright-e2e skill](/skills/playwright-e2e) ensures AI assistants generate tests that handle these boundaries correctly.

## Iframes vs Shadow DOM

| Feature | Iframe | Shadow DOM |
|---|---|---|
| Document boundary | Yes (separate window) | No (same document) |
| Cross-origin | Possible | Not relevant |
| JavaScript isolation | Yes | No (same realm) |
| Style isolation | Yes | Yes (encapsulated) |
| Accessibility tree | Joined for same-origin | Joined |
| Playwright API | \`frameLocator\` or \`page.frame\` | \`getByRole\` pierces automatically |

In practice: iframes need an explicit reference; shadow roots are usually transparent.

## Locators that pierce shadow roots

\`getByRole\`, \`getByText\`, \`getByLabel\`, and the rest of the role-based locators pierce open shadow roots without any extra syntax.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('clicks button inside a custom element with shadow DOM', async ({ page }) => {
  await page.goto('/custom-widget');
  await page.getByRole('button', { name: 'Open editor' }).click();
  await expect(page.getByRole('dialog', { name: 'Editor' })).toBeVisible();
});
\`\`\`

The button can be deep inside a \`<my-custom-element>\` with attached shadow root; \`getByRole\` traverses the accessibility tree, which includes shadow contents.

## CSS locators inside shadow roots

CSS selectors do not pierce shadow roots by default. Use \`>>\` or rely on the role-based locators.

\`\`\`typescript
// Won't find an input inside shadow DOM
await page.locator('my-input').locator('input').fill('hi'); // fails

// Use getByRole instead
await page.getByLabel('Email').fill('hi'); // works through shadow

// Or pierce explicitly (use rarely)
await page.locator('my-input >> input').fill('hi'); // works
\`\`\`

The role-based form is always preferred.

## Closed shadow roots

A closed shadow root is invisible to scripts (and to Playwright). You cannot pierce it. The fix is to convince the component author to make the shadow open, or accept that the component is not testable in isolation.

In practice, almost every framework (Lit, Stencil, FAST, Shoelace) defaults to open shadow roots.

## Iframes: getting started

For an iframe whose DOM you want to interact with:

\`\`\`typescript
test('interacts with iframe content', async ({ page }) => {
  await page.goto('/embed');
  const iframe = page.frameLocator('iframe[title="Editor"]');
  await iframe.getByRole('button', { name: 'Bold' }).click();
  await iframe.getByRole('textbox').fill('Hello');
});
\`\`\`

\`frameLocator\` returns a Locator-like object scoped to the iframe. Every standard method (\`getByRole\`, \`click\`, \`fill\`) works inside.

## Nested iframes

\`\`\`typescript
const outer = page.frameLocator('#outer');
const inner = outer.frameLocator('#inner');
await inner.getByRole('button', { name: 'Submit' }).click();
\`\`\`

Frame locators chain. The inner frame is scoped to the outer frame's document.

## Cross-origin iframes

Cross-origin iframes are isolated; Playwright can still interact with them via \`frameLocator\` thanks to the underlying CDP/protocol support.

\`\`\`typescript
test('fills cross-origin payment iframe', async ({ page }) => {
  await page.goto('https://qaskills.sh/checkout');
  const stripe = page.frameLocator('iframe[name="__privateStripeFrame"]');
  await stripe.getByLabel('Card number').fill('4242 4242 4242 4242');
  await stripe.getByLabel('Expiry').fill('12 / 30');
  await stripe.getByLabel('CVC').fill('123');
});
\`\`\`

For very deep frame trees (Stripe Elements often have iframes-within-iframes), chain \`frameLocator\` calls.

## Finding the right iframe locator

When multiple iframes exist, scope by attribute:

\`\`\`typescript
// By title
page.frameLocator('iframe[title="Editor"]');

// By name
page.frameLocator('iframe[name="content"]');

// By id
page.frameLocator('#editor-frame');

// By src pattern
page.frameLocator('iframe[src*="checkout"]');
\`\`\`

Use the most stable attribute. Names are usually stabler than positions.

## Frames API (legacy)

Older code uses \`page.frame()\` which returns a Frame object.

\`\`\`typescript
const frame = page.frame({ name: 'content' });
if (frame) {
  await frame.fill('input', 'hi');
}
\`\`\`

This API still works but is fragile because the frame reference can go stale on reload. \`frameLocator\` re-resolves on every action, making it more reliable.

## Frame lifecycle events

\`\`\`typescript
page.on('frameattached', (frame) => console.log('attached', frame.url()));
page.on('framenavigated', (frame) => console.log('navigated', frame.url()));
page.on('framedetached', (frame) => console.log('detached', frame.url()));
\`\`\`

Useful for diagnosing tests that wait on an iframe to load and time out.

## Waiting for an iframe to load

For SPAs that lazy-load iframes:

\`\`\`typescript
test('waits for iframe to mount', async ({ page }) => {
  await page.goto('/lazy-embed');
  await page.getByRole('button', { name: 'Load embed' }).click();
  const iframe = page.frameLocator('iframe[title="Embed"]');
  await expect(iframe.getByRole('heading', { name: 'Embedded content' })).toBeVisible();
});
\`\`\`

Auto-waiting handles the timing; the assertion inside the frame retries until the iframe is attached and the content renders.

## Shadow DOM with web components

\`\`\`tsx
// Lit-based custom element
class MyButton extends LitElement {
  render() {
    return html\`<button @click="\${this.handle}">\${this.label}</button>\`;
  }
}
customElements.define('my-button', MyButton);
\`\`\`

\`\`\`typescript
test('clicks Lit-based button', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Click me' }).click();
});
\`\`\`

No special handling required. Playwright pierces the open shadow root automatically.

## Component snapshot inside shadow

Visual snapshots of shadow DOM components work normally:

\`\`\`typescript
test('shadow button visual', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Click me' });
  await expect(button).toHaveScreenshot('shadow-button.png');
});
\`\`\`

See [Playwright Visual Comparison Snapshots Guide](/blog/playwright-visual-comparison-snapshots-guide).

## Inspecting shadow DOM with the picker

The Playwright picker (in UI Mode and Codegen) traverses shadow roots automatically. Hover any element and the recommended locator appears, regardless of whether the element is in light or shadow DOM.

For more on the picker, see [Playwright UI Mode Complete 2026 Guide](/blog/playwright-ui-mode-complete-2026-guide).

## Common patterns

### Stripe Elements

\`\`\`typescript
test('fills Stripe Element', async ({ page }) => {
  const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
  await stripeFrame.getByLabel('Card number').fill('4242 4242 4242 4242');
  await stripeFrame.getByLabel('Expiry').fill('1230');
  await stripeFrame.getByLabel('CVC').fill('123');
});
\`\`\`

### reCAPTCHA

Google reCAPTCHA is cross-origin and resists automation by design. The right approach is to use a test environment with reCAPTCHA disabled or set a known test key.

### Tinymce / CKEditor

\`\`\`typescript
const editor = page.frameLocator('iframe[title="Rich Text Area"]');
await editor.locator('body').fill('Hello, world!');
\`\`\`

Most rich text editors put their contentEditable inside an iframe.

### Material UI Date Picker

MUI uses Portal for popovers, which renders outside the originating component but in the same DOM. \`getByRole\` finds it across boundaries.

\`\`\`typescript
await page.getByRole('button', { name: 'Open calendar' }).click();
await page.getByRole('grid').getByRole('gridcell', { name: '15' }).click();
\`\`\`

## Common pitfalls

**Pitfall 1: Frame locator before iframe attaches.** If the iframe is added dynamically, the locator returns nothing until the iframe exists. Use auto-waiting assertions inside the frame to handle this.

**Pitfall 2: Frame locator for cross-frame elements via CSS.** \`page.locator('iframe').locator('button')\` does not pierce. Use \`page.frameLocator('iframe').locator('button')\`.

**Pitfall 3: Closed shadow root.** Cannot be pierced. Either change the component or use end-to-end black-box testing.

**Pitfall 4: Reusing frame locators after reload.** Frame locators auto-re-resolve, but Frame objects do not. Prefer \`frameLocator\`.

**Pitfall 5: Multiple matching iframes.** \`frameLocator('iframe')\` may match too many; scope with attributes.

## Anti-patterns

- Using XPath to navigate iframes. Use \`frameLocator\` with attribute selectors.
- Manually managing frame references in tests. Let Playwright handle the lifecycle.
- Avoiding shadow DOM in production code "for testability". Role-based locators work fine.
- Asserting on iframe contents directly via \`page.locator\` without scoping. Always use \`frameLocator\` for iframes.

## A complete iframe + shadow test

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('payment form inside iframe with shadow widget', async ({ page }) => {
  await page.goto('/checkout');

  // Custom shadow-DOM widget
  await page.getByRole('button', { name: 'Choose payment method' }).click();
  await page.getByRole('option', { name: 'Credit card' }).click();

  // Stripe iframe
  const stripe = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
  await stripe.getByLabel('Card number').fill('4242 4242 4242 4242');
  await stripe.getByLabel('Expiry').fill('1230');
  await stripe.getByLabel('CVC').fill('123');

  await page.getByRole('button', { name: 'Pay $100' }).click();
  await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible();
});
\`\`\`

## Conclusion and next steps

Playwright's locator model erases the iframe-and-shadow-DOM friction that historically plagued browser tests. \`frameLocator\` for explicit iframe scoping, plus role-based locators that pierce shadow roots automatically, are all you need to interact with embed-heavy apps.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate tests that handle these boundaries naturally. For broader locator patterns, see [Playwright Best Practices for Locators](/blog/playwright-best-practices-locators-2026). For component-level testing, [Playwright Component Testing for React](/blog/playwright-component-testing-react-complete-guide).
`,
};
