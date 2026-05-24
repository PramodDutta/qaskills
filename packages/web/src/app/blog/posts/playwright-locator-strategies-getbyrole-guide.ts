import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Locator Strategies: getByRole and Friends Guide',
  description: 'Master Playwright locator strategies in 2026: getByRole, getByLabel, getByText, getByTestId, chaining, filtering, and ARIA selection patterns.',
  date: '2026-05-15',
  category: 'Guide',
  content: `
# Playwright Locator Strategies: getByRole and Friends Guide

If \`getByRole\` is the queen of Playwright locators, \`getByLabel\`, \`getByText\`, \`getByPlaceholder\`, \`getByTestId\`, \`getByTitle\`, and \`getByAltText\` are her court. Each has a specific job, a clear when-to-use, and a stability cost. Picking the right locator for the right element is the single highest-impact decision you make per test.

This guide is the complete strategy reference for Playwright 1.49+. Every locator method is covered with examples, pitfalls, ARIA role catalog, accessible name calculation, and the chaining patterns that scope locators to exactly one element.

For broader best practices, the [Playwright Best Practices for Locators](/blog/playwright-best-practices-locators-2026) guide is the companion. The [playwright-e2e skill](/skills/playwright-e2e) bakes these patterns into AI-generated tests.

## The locator family

| Method | Resolves by | Stability |
|---|---|---|
| \`getByRole\` | ARIA role + accessible name | Highest |
| \`getByLabel\` | Associated \`<label>\` text | High |
| \`getByPlaceholder\` | Input placeholder | Medium |
| \`getByText\` | Visible text content | Medium |
| \`getByAltText\` | Image \`alt\` attribute | Medium |
| \`getByTitle\` | Element \`title\` attribute | Low (tooltips) |
| \`getByTestId\` | \`data-testid\` attribute | High (but pollutes markup) |

## getByRole in depth

\`getByRole\` walks the accessibility tree. The first argument is an ARIA role (or implicit HTML role); the second is an options object.

\`\`\`typescript
await page.getByRole('button', { name: 'Sign in' }).click();
await page.getByRole('link', { name: 'Skills', exact: true }).click();
await page.getByRole('heading', { level: 1 });
await page.getByRole('checkbox', { name: 'Remember me', checked: true });
\`\`\`

### Common roles

| Role | HTML element |
|---|---|
| \`button\` | \`<button>\`, \`<input type="button">\` |
| \`link\` | \`<a href>\` |
| \`heading\` | \`<h1>\` through \`<h6>\` (with level) |
| \`textbox\` | \`<input>\`, \`<textarea>\` |
| \`checkbox\` | \`<input type="checkbox">\` |
| \`radio\` | \`<input type="radio">\` |
| \`combobox\` | \`<select>\`, ARIA combobox |
| \`listbox\` | \`<select multiple>\`, ARIA listbox |
| \`option\` | \`<option>\` |
| \`switch\` | role="switch" |
| \`tab\` | role="tab" |
| \`tabpanel\` | role="tabpanel" |
| \`dialog\` | \`<dialog>\`, role="dialog" |
| \`navigation\` | \`<nav>\` |
| \`main\` | \`<main>\` |
| \`banner\` | \`<header>\` (in body) |
| \`contentinfo\` | \`<footer>\` (in body) |
| \`region\` | \`<section>\` with name |
| \`article\` | \`<article>\` |
| \`list\` / \`listitem\` | \`<ul>\`/\`<ol>\` and \`<li>\` |
| \`row\` / \`cell\` / \`columnheader\` | \`<tr>\`/\`<td>\`/\`<th>\` |
| \`grid\` | \`<table role="grid">\` |
| \`menu\` / \`menuitem\` | role="menu" / role="menuitem" |
| \`progressbar\` | \`<progress>\` or role="progressbar" |
| \`tooltip\` | role="tooltip" |
| \`status\` | role="status" (live region) |
| \`alert\` | role="alert" |
| \`tree\` / \`treeitem\` | role="tree" |
| \`generic\` | \`<div>\`, \`<span>\` without ARIA |
| \`paragraph\` | \`<p>\` |
| \`img\` | \`<img>\` with alt |
| \`presentation\` / \`none\` | role="none" |

### Options reference

| Option | Type | Purpose |
|---|---|---|
| \`name\` | string \\| RegExp | Accessible name |
| \`exact\` | boolean | Exact match (default false) |
| \`level\` | number | Heading level (1-6) |
| \`checked\` | boolean | Checkbox/radio state |
| \`pressed\` | boolean | Toggle button state |
| \`selected\` | boolean | Tab/option selected |
| \`expanded\` | boolean | Combobox/menu open |
| \`disabled\` | boolean | Element disabled |
| \`includeHidden\` | boolean | Include hidden in tree |

\`\`\`typescript
await page.getByRole('button', { name: /save/i });
await page.getByRole('tab', { name: 'Settings', selected: true });
await page.getByRole('checkbox', { name: 'Subscribe', checked: false });
\`\`\`

## Accessible name calculation

The accessible name is what a screen reader announces. It can come from:

1. \`aria-label\` attribute (highest priority).
2. \`aria-labelledby\` referenced element.
3. Visible text content (for buttons, links, headings).
4. \`<label>\` element (for form controls).
5. \`title\` attribute (lowest priority).

When you write \`getByRole('button', { name: 'Save' })\`, Playwright walks the same calculation.

## getByLabel

For form inputs with an explicit label.

\`\`\`tsx
<label>
  Email
  <input type="email" />
</label>
\`\`\`

\`\`\`typescript
await page.getByLabel('Email').fill('asha@example.com');
\`\`\`

\`getByLabel\` works whether the label wraps the input or uses \`for\`+\`id\`:

\`\`\`tsx
<label for="email">Email</label>
<input id="email" />
\`\`\`

## getByPlaceholder

For inputs without labels but with placeholder text.

\`\`\`typescript
await page.getByPlaceholder('Search').fill('playwright');
\`\`\`

Placeholders are not labels in the accessibility sense; prefer \`getByLabel\` when both exist.

## getByText

For non-interactive text. Often used to assert on rendered content.

\`\`\`typescript
await expect(page.getByText('Welcome back')).toBeVisible();
await page.getByText('Read more').click();
\`\`\`

Supports exact and regex:

\`\`\`typescript
await page.getByText('Save', { exact: true }).click();
await page.getByText(/^Save/).click();
\`\`\`

## getByAltText

For images.

\`\`\`typescript
await page.getByAltText('Company logo').click();
\`\`\`

Equivalent to \`getByRole('img', { name: 'Company logo' })\` for image elements with alt text.

## getByTitle

For elements with a \`title\` attribute (usually tooltips).

\`\`\`typescript
await page.getByTitle('Help').click();
\`\`\`

The title is often a fallback when a button has no visible text.

## getByTestId

The escape hatch. Use only when no accessible alternative exists.

\`\`\`tsx
<button data-testid="cart-icon" aria-label="Cart">
  <svg aria-hidden="true">...</svg>
</button>
\`\`\`

\`\`\`typescript
await page.getByTestId('cart-icon').click();
\`\`\`

Configure the attribute name:

\`\`\`typescript
// playwright.config.ts
use: {
  testIdAttribute: 'data-test-id',
},
\`\`\`

## Chaining locators

Scope locators by chaining. The second locator is scoped to the first.

\`\`\`typescript
const invoice = page.getByRole('row', { name: 'Invoice 1234' });
await invoice.getByRole('button', { name: 'Approve' }).click();
\`\`\`

Chained locators read like English and survive layout changes.

## Filtering

\`.filter()\` narrows by content or sub-locator.

\`\`\`typescript
const allRows = page.getByRole('row');

// By text
const paid = allRows.filter({ hasText: 'Paid' });

// By absence of text
const unpaid = allRows.filter({ hasNotText: 'Paid' });

// By inner locator
const selected = allRows.filter({
  has: page.getByRole('checkbox', { checked: true }),
});

// By absence of inner locator
const unselected = allRows.filter({
  hasNot: page.getByRole('checkbox', { checked: true }),
});
\`\`\`

## Combining with \`first()\`, \`last()\`, \`nth()\`

\`\`\`typescript
const items = page.getByRole('listitem');
await items.first().click();
await items.last().click();
await items.nth(2).click();
await expect(items).toHaveCount(10);
\`\`\`

\`nth\` is zero-indexed. Use sparingly; meaningful filters are stabler than positions.

## Iterating

\`\`\`typescript
const tabs = page.getByRole('tab');
for (const tab of await tabs.all()) {
  await tab.click();
  await expect(page.getByRole('tabpanel')).toBeVisible();
}
\`\`\`

\`.all()\` resolves the locator and returns a snapshot at that moment. Avoid using during dynamic updates.

## Locator inside frames

\`\`\`typescript
const iframe = page.frameLocator('iframe[title="Editor"]');
await iframe.getByRole('button', { name: 'Bold' }).click();
\`\`\`

See [Playwright iframe and Shadow DOM Guide](/blog/playwright-iframe-shadow-dom-guide).

## Locator inside shadow

Role-based locators pierce open shadow roots automatically. No special syntax.

\`\`\`typescript
await page.getByRole('button', { name: 'Open editor' }).click();
\`\`\`

## Strict mode

Locators are strict by default: exactly one element must match. Two matches throw "strict mode violation". Use chaining or filtering to disambiguate.

## When to fall back to CSS

CSS locators are the last resort. Use them only when:

- The element has no role, label, or accessible text (a styling failure, but unavoidable).
- The element is identified by a unique CSS attribute you control.

\`\`\`typescript
await page.locator('[data-state="open"]').click();
\`\`\`

Avoid layout-dependent CSS like \`.col-4 > .row:nth-child(3)\`.

## Common pitfalls

**Pitfall 1: Using \`getByText\` for interactive elements.** Prefer \`getByRole('button', { name: '...' })\` when the element is a button or link.

**Pitfall 2: Including non-essential whitespace.** \`getByText('Save now')\` matches "Save now"; whitespace differences are normalized.

**Pitfall 3: Case sensitivity.** Names are case-insensitive by default. Use regex with \`/i\` flag for explicit case folding.

**Pitfall 4: Hidden elements.** \`getByRole\` excludes \`aria-hidden\` elements by default. Use \`includeHidden: true\` if needed.

**Pitfall 5: Implicit roles missing.** A \`<div onClick>\` has no role. Add \`role="button"\` and \`aria-label\`, then use \`getByRole\`.

## Anti-patterns

- Using \`page.locator\` with CSS as first choice. Always start with a role-based method.
- Layering many \`getByText\` calls. Use chaining or filtering.
- Treating \`getByTestId\` as the default. It is the last resort.
- Ignoring strict mode violations by adding \`.first()\`. Fix the locator instead.

## A complete locator decision tree

\`\`\`text
Is the element interactive?
├── Yes
│   ├── Does it have an accessible role + name?
│   │   └── Yes: getByRole('button' | 'link' | ..., { name })
│   └── Does it have a label?
│       └── Yes: getByLabel(text)
└── No
    ├── Has visible text?
    │   └── Yes: getByText(text)
    ├── Is it an image with alt?
    │   └── Yes: getByAltText(text)
    └── Otherwise: getByTestId(id) as a last resort
\`\`\`

## Conclusion and next steps

The locator strategy is the foundation of test reliability. Lead with \`getByRole\`, fall back through the label/text family, reserve \`getByTestId\` for truly opaque elements. Chain and filter to disambiguate. Avoid CSS unless absolutely necessary.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants follow these patterns by default. For the broader best practices, see [Playwright Best Practices for Locators](/blog/playwright-best-practices-locators-2026). For an interactive workflow, use the picker in [Playwright UI Mode Complete 2026 Guide](/blog/playwright-ui-mode-complete-2026-guide).
`,
};
