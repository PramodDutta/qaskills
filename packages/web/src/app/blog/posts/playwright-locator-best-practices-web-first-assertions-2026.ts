import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Locator Best Practices + Web-First Assertions 2026',
  description:
    'Definitive 2026 guide to Playwright locators and web-first assertions: getByRole priority, chaining, filter, expect auto-retry, toBeVisible toHaveText catalog with examples.',
  date: '2026-06-09',
  category: 'Reference',
  content: `
# Playwright Locator Best Practices + Web-First Assertions 2026

Two things determine whether a Playwright test will be reliable over its lifetime: how you locate elements, and how you assert on them. Get both right and the test survives DOM refactors, CSS class renames, copy changes, and the random latency of real applications. Get either wrong and the test becomes one more line item in your weekly "investigate flaky tests" meeting. In 2026 the official Playwright recommendations are clear: prefer \`getByRole\` with accessible names, chain locators for scoping, filter for selection, and lean on web-first assertions (\`expect(locator).toBeVisible()\` etc.) that auto-retry until the condition holds or the timeout expires.

This guide is the definitive 2026 reference for the modern locator and assertion patterns in Playwright. We cover the locator priority order (getByRole, getByLabel, getByPlaceholder, getByText, getByTestId), strict mode, chaining, filtering, the \`first\` / \`nth\` / \`last\` accessors, the full catalog of web-first assertions, the auto-retry behavior that makes them stable, and the migration patterns from CSS/XPath. Every example is runnable Playwright TypeScript with the 1.49+ API.

For network mocking that pairs with locators, see [Playwright route.fulfill Network Mocking](/blog/playwright-route-fulfill-network-mocking-reference). For broader best practices, see [Playwright Best Practices 2026](/blog/playwright-best-practices-2026). The [playwright-e2e skill](/skills/playwright-e2e) encodes these patterns for AI-generated tests in Claude Code, Cursor, and Aider.

## The locator priority order

When picking a locator, walk down this list and stop at the first one that works:

| Priority | Method | When |
|---|---|---|
| 1 | \`getByRole\` | Element has an ARIA role and accessible name |
| 2 | \`getByLabel\` | Form field has an associated label |
| 3 | \`getByPlaceholder\` | Input has placeholder, no label |
| 4 | \`getByText\` | Unique on-screen text, no role |
| 5 | \`getByAltText\` | Image with alt attribute |
| 6 | \`getByTitle\` | Element with title attribute |
| 7 | \`getByTestId\` | None of the above, you added \`data-testid\` |
| 8 | CSS / XPath | Last resort, never for interactive elements |

The rationale: items 1-3 mirror how a screen reader identifies an element. A test built on these locators doubles as a basic accessibility audit; if your locators do not work, the page is not accessible. Items 4-6 are content-based and survive most refactors. Item 7 is the escape hatch. Item 8 is a bug in the application disguised as a virtue of the test.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('locator priority example', async ({ page }) => {
  await page.goto('/signup');

  // Priority 1: role + name
  await page.getByRole('button', { name: 'Create account' }).click();

  // Priority 2: label
  await page.getByLabel('Email').fill('user@example.com');

  // Priority 3: placeholder
  await page.getByPlaceholder('Choose a username').fill('alice');

  // Priority 7: testid (last resort for non-semantic elements)
  await page.getByTestId('avatar-upload').click();
});
\`\`\`

## getByRole: the most important locator

\`getByRole(role, options)\` finds elements by their ARIA role and (usually) accessible name. It is the most resilient locator type because roles and names rarely change across DOM refactors.

Common roles:

| Role | Matches |
|---|---|
| \`button\` | \`<button>\`, \`<input type="button">\`, \`role="button"\` |
| \`link\` | \`<a href>\`, \`role="link"\` |
| \`heading\` | \`<h1>\`-\`<h6>\`, \`role="heading"\` |
| \`textbox\` | \`<input type="text">\`, \`<textarea>\`, \`role="textbox"\` |
| \`checkbox\` | \`<input type="checkbox">\`, \`role="checkbox"\` |
| \`radio\` | \`<input type="radio">\`, \`role="radio"\` |
| \`combobox\` | \`<select>\`, \`role="combobox"\` |
| \`option\` | \`<option>\`, \`role="option"\` |
| \`tab\` | \`role="tab"\` |
| \`tabpanel\` | \`role="tabpanel"\` |
| \`dialog\` | \`<dialog>\`, \`role="dialog"\` |
| \`list\`, \`listitem\` | \`<ul>\`/\`<ol>\`, \`<li>\` |
| \`row\`, \`cell\`, \`columnheader\` | Table elements |
| \`alert\` | \`role="alert"\` |
| \`status\` | \`role="status"\` |
| \`progressbar\` | \`<progress>\`, \`role="progressbar"\` |

The \`name\` option matches the accessible name, which is computed from visible text, \`aria-label\`, \`aria-labelledby\`, or label elements.

\`\`\`typescript
// Button with visible text "Sign in"
await page.getByRole('button', { name: 'Sign in' }).click();

// Button with aria-label="Close"
await page.getByRole('button', { name: 'Close' }).click();

// Heading level 2 with text "Settings"
await page.getByRole('heading', { name: 'Settings', level: 2 }).click();

// Checkbox associated with label "Remember me"
await page.getByRole('checkbox', { name: 'Remember me' }).check();

// Regex name for partial match
await page.getByRole('button', { name: /sign\\s*in/i }).click();
\`\`\`

Other useful options:

| Option | Type | Effect |
|---|---|---|
| \`name\` | string \\| regex | Filter by accessible name |
| \`exact\` | boolean | Exact name match (default partial) |
| \`level\` | number | Heading level (1-6) |
| \`pressed\` | boolean | aria-pressed state for toggle buttons |
| \`checked\` | boolean | Checkbox/radio state |
| \`expanded\` | boolean | aria-expanded state |
| \`selected\` | boolean | aria-selected state |
| \`disabled\` | boolean | Disabled state |
| \`includeHidden\` | boolean | Include role="presentation" elements |

## getByLabel: form fields

For form fields with an associated \`<label>\`, this is the cleanest selector:

\`\`\`typescript
// <label>Email <input type="email" /></label>
await page.getByLabel('Email').fill('user@example.com');

// <label for="pw">Password</label><input id="pw" type="password" />
await page.getByLabel('Password').fill('secret');

// Multiple fields with same label - use regex
await page.getByLabel(/email/i).first().fill('user@example.com');
\`\`\`

If a form field lacks a label, fix the form. If you cannot, fall back to \`getByPlaceholder\` or \`getByTestId\`.

## getByText: content-based

\`getByText\` matches any element by its rendered text content. Useful for headings, paragraphs, and non-interactive labels:

\`\`\`typescript
await page.getByText('Welcome back').click();
await page.getByText('Welcome back', { exact: true }).click();
await page.getByText(/order #\\d+/).click();
\`\`\`

Substring matching is default; pass \`exact: true\` for full match.

\`getByText\` is not the best choice for interactive elements - prefer \`getByRole\` for buttons and links. Use \`getByText\` for non-semantic content.

## getByTestId: the explicit escape hatch

When no semantic locator is feasible (third-party component without ARIA, intentionally generic UI), add a \`data-testid\`:

\`\`\`html
<div data-testid="user-avatar"><img src="..." /></div>
\`\`\`

\`\`\`typescript
await page.getByTestId('user-avatar').click();
\`\`\`

Configure the attribute name in \`playwright.config.ts\` if you use a different convention:

\`\`\`typescript
export default defineConfig({
  use: {
    testIdAttribute: 'data-qa', // or 'data-test', 'data-cy', etc.
  },
});
\`\`\`

The locator picker in the Inspector respects this setting.

## Strict mode

Every locator must resolve to exactly one element. Zero matches: the test waits then fails. Two or more matches: strict mode violation, test fails immediately.

\`\`\`typescript
// Page has two "Delete" buttons - strict mode violation
await page.getByRole('button', { name: 'Delete' }).click();
\`\`\`

Fix by scoping:

\`\`\`typescript
// Scope to the row for invoice 1234
await page.getByRole('row', { name: 'Invoice 1234' })
  .getByRole('button', { name: 'Delete' })
  .click();
\`\`\`

Strict mode is the canary that surfaces unexpected DOM. Treat strict mode violations as bugs in your test, not nuisances.

## Chaining locators

Chain \`locator()\` or \`getBy...\` calls to scope:

\`\`\`typescript
const row = page.getByRole('row', { name: 'Invoice 1234' });

await row.getByRole('button', { name: 'Approve' }).click();
await expect(row.getByRole('cell', { name: 'Status' })).toHaveText('Approved');
\`\`\`

Chains resolve at action time, not declaration time. The intermediate \`row\` does not run a DOM query until you call \`click()\` or \`expect\`. This makes chained locators efficient and self-updating.

## Filtering

\`.filter()\` narrows by content or another locator:

\`\`\`typescript
const allRows = page.getByRole('row');

// Filter by text content
const approved = allRows.filter({ hasText: 'Approved' });
await expect(approved).toHaveCount(5);

// Negative filter
const notPaid = allRows.filter({ hasNotText: 'Paid' });

// Filter by nested locator
const selected = allRows.filter({
  has: page.getByRole('checkbox', { checked: true }),
});
await expect(selected).toHaveCount(3);

// Filter by NOT containing
const noWarning = allRows.filter({
  hasNot: page.getByRole('alert'),
});
\`\`\`

Filter options:

| Option | Type | Effect |
|---|---|---|
| \`hasText\` | string \\| regex | Element contains the text |
| \`hasNotText\` | string \\| regex | Element does not contain the text |
| \`has\` | Locator | Element contains a descendant matching the locator |
| \`hasNot\` | Locator | Element does not contain a descendant matching the locator |

## first, last, nth

\`\`\`typescript
const items = page.getByRole('listitem');

await items.first().click();
await items.last().click();
await items.nth(3).click(); // 0-indexed

// Iterate
for (const item of await items.all()) {
  await expect(item).toBeVisible();
}

// Count assertion
await expect(items).toHaveCount(20);
\`\`\`

\`first\` / \`last\` / \`nth\` return locators (lazy). \`all\` returns an array of locators (eagerly resolved at call time).

## Web-first assertions

The \`expect(locator)\` family of assertions auto-retry until they pass or the timeout fires (default 5 s, configurable). They are the modern alternative to manual waiting and the second pillar of stable tests.

The complete catalog:

| Assertion | Pass when |
|---|---|
| \`toBeVisible()\` | Element exists in DOM, has size, is not hidden |
| \`toBeHidden()\` | Element does not exist or has \`display: none\`/\`visibility: hidden\` |
| \`toBeAttached()\` | Element exists in DOM (may be hidden) |
| \`toBeDetached()\` | Element no longer in DOM |
| \`toBeEnabled()\` | Element has no \`disabled\` attribute |
| \`toBeDisabled()\` | Element has \`disabled\` attribute |
| \`toBeEditable()\` | Element is editable input/textarea |
| \`toBeFocused()\` | Element has focus |
| \`toBeChecked()\` | Checkbox or radio is checked |
| \`toBeEmpty()\` | Element has no text content |
| \`toBeInViewport()\` | Element is in the visible viewport |
| \`toContainText(s)\` | Element text contains s |
| \`toHaveText(s)\` | Element text matches s exactly |
| \`toHaveValue(v)\` | Input value is v |
| \`toHaveAttribute(n, v)\` | Element has attribute n=v |
| \`toHaveClass(c)\` | Element has CSS class c |
| \`toHaveCount(n)\` | Locator resolves to n elements |
| \`toHaveCSS(prop, val)\` | Computed CSS property matches |
| \`toHaveId(id)\` | Element has id |
| \`toHaveJSProperty(n, v)\` | JavaScript property matches |
| \`toHaveScreenshot()\` | Visual screenshot matches baseline |
| \`toHaveTitle(t)\` | Page title matches |
| \`toHaveURL(u)\` | Page URL matches |
| \`toMatchAriaSnapshot(s)\` | ARIA tree matches snapshot |

Every assertion takes an optional \`{ timeout: ms }\` to override the default.

## Auto-retry behavior

When you write:

\`\`\`typescript
await expect(page.getByTestId('count')).toHaveText('5');
\`\`\`

Playwright re-runs the assertion every ~100 ms until either:

1. The text is "5" (pass).
2. The 5-second default timeout expires (fail).

You do not need to add \`waitForSelector\` or \`waitForTimeout\` first. The assertion does the waiting.

If you do need a longer timeout for a specific assertion:

\`\`\`typescript
await expect(page.getByTestId('count')).toHaveText('5', { timeout: 30000 });
\`\`\`

Set global default in config:

\`\`\`typescript
export default defineConfig({
  expect: {
    timeout: 10000,
  },
});
\`\`\`

## Negation

Add \`.not\` for negative assertions:

\`\`\`typescript
await expect(page.getByText('Loading')).not.toBeVisible();
await expect(page.getByRole('alert')).not.toBeAttached();
await expect(page).not.toHaveURL('/error');
\`\`\`

Negative assertions still auto-retry. They pass when the condition stops being true.

## Soft assertions

Soft assertions log failures but do not stop the test. Use them when you want to check multiple things and see all failures at once:

\`\`\`typescript
test('multiple soft checks', async ({ page }) => {
  await page.goto('/dashboard');
  await expect.soft(page.getByText('Welcome')).toBeVisible();
  await expect.soft(page.getByText('Stats')).toBeVisible();
  await expect.soft(page.getByText('Notifications')).toBeVisible();
  // Test continues even if any fail; all failures reported at the end
});
\`\`\`

## Polling assertions

For values not from a locator, use \`expect.poll\`:

\`\`\`typescript
let count = 0;
await page.exposeBinding('increment', () => { count++; });

await expect.poll(() => count, { timeout: 5000 }).toBeGreaterThan(3);
\`\`\`

\`expect.poll\` re-evaluates the function every poll interval (default 250 ms) until it passes or the timeout fires.

## Custom assertion timeouts

Override the default timeout per assertion when you know an operation will take longer:

\`\`\`typescript
// Wait up to 30 seconds for a long-running export
await expect(page.getByRole('link', { name: 'Download report' })).toBeVisible({ timeout: 30000 });

// Quick check, fail fast
await expect(page.getByText('Loading')).toBeHidden({ timeout: 1000 });
\`\`\`

The global default is 5 seconds; override per-assertion when needed. For broader timeout configuration:

\`\`\`typescript
export default defineConfig({
  expect: { timeout: 10000 },
  use: { actionTimeout: 15000 },
  timeout: 60000, // overall test timeout
});
\`\`\`

| Timeout type | Default | Purpose |
|---|---|---|
| \`expect.timeout\` | 5 s | Per web-first assertion |
| \`actionTimeout\` | unset | Per locator action (click, fill) |
| \`navigationTimeout\` | 30 s | Per navigation |
| \`timeout\` (test) | 30 s | Total test |

## Assertion chaining and AND

Combine assertions on the same locator with chaining:

\`\`\`typescript
const button = page.getByRole('button', { name: 'Submit' });
await expect(button).toBeVisible();
await expect(button).toBeEnabled();
await expect(button).toHaveText('Submit');
\`\`\`

For "matches all of these", use \`locator.and\`:

\`\`\`typescript
const visibleButton = page.getByRole('button').and(page.getByText('Submit'));
await expect(visibleButton).toBeVisible();
\`\`\`

\`locator.and\` is the AND operator for locators - both conditions must match.

## A complete realistic test

Putting it all together:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('purchase flow with best-practice locators', async ({ page }) => {
  await page.goto('/products');

  // Scope to one product card
  const headphones = page.getByRole('article').filter({ hasText: 'Headphones' });
  await expect(headphones.getByRole('heading')).toHaveText('Wireless Headphones');

  await headphones.getByRole('button', { name: 'Add to cart' }).click();

  // Cart badge updates
  const cartBadge = page.getByRole('navigation').getByLabel('Cart items');
  await expect(cartBadge).toHaveText('1');

  // Navigate to cart
  await page.getByRole('link', { name: 'Cart' }).click();
  await expect(page).toHaveURL('/cart');

  // Cart row
  const row = page.getByRole('row', { name: 'Wireless Headphones' });
  await expect(row.getByRole('cell', { name: 'Quantity' })).toHaveText('1');

  // Update quantity
  await row.getByLabel('Quantity').fill('2');
  await expect(row.getByText('$99.98')).toBeVisible();

  // Checkout
  await page.getByRole('link', { name: 'Checkout' }).click();
  await expect(page).toHaveURL('/checkout');
});
\`\`\`

Every locator uses a semantic role, every assertion is web-first, every interaction is scoped. The test reads like a user flow and survives DOM refactors.

## Migrating from CSS/XPath selectors

If you are migrating a Selenium or Cypress suite to Playwright, the locator transformation is usually:

| Old selector | New locator |
|---|---|
| \`#login-button\` | \`getByRole('button', { name: 'Log in' })\` |
| \`.btn-primary\` | \`getByRole('button', { name: 'Submit' })\` |
| \`input[name="email"]\` | \`getByLabel('Email')\` |
| \`//button[contains(text(),'Save')]\` | \`getByRole('button', { name: 'Save' })\` |
| \`[data-testid="avatar"]\` | \`getByTestId('avatar')\` |
| \`h1.page-title\` | \`getByRole('heading', { name: 'Dashboard' })\` |

For each old selector, ask: does the element have a role and an accessible name? If yes, use \`getByRole\`. If no, use the most stable alternative (label, placeholder, text) or fall back to \`getByTestId\`.

A migration pass typically halves the number of brittle selectors. The tests survive DOM refactors that previously broke them.

## Locator anti-patterns to avoid

These patterns cause flakiness or break across refactors:

| Anti-pattern | Problem | Fix |
|---|---|---|
| \`page.locator('div:nth-child(5) > button')\` | Position-dependent | \`getByRole\` with context |
| \`page.locator('.MuiButton-primary-23')\` | Generated class names | \`getByRole('button', { name })\` |
| \`page.locator(\`text=\${dynamicText}\`)\` | Substring collision | \`getByText(\` regex with anchors |
| \`page.click('button')\` (multi-match) | Strict mode violation | Add a scope or filter |
| \`await page.waitForSelector(s); await page.click(s)\` | Manual wait | Just call the locator action |

Treat each anti-pattern as a bug to fix on sight. Over time the suite gets cleaner and more robust.

## Locators and accessibility coverage

A side benefit of \`getByRole\` is that it doubles as basic accessibility coverage. If your test passes, the element has the right role and accessible name - which is the foundation of screen reader compatibility. If \`getByRole('button', { name: 'Submit' })\` does not find your submit button, the button is not accessible.

This makes the test suite a continuous accessibility audit. Combined with a dedicated axe-core check (via \`@axe-core/playwright\`), you get both functional and accessibility coverage from the same tests.

\`\`\`typescript
import AxeBuilder from '@axe-core/playwright';

test('accessibility audit', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
\`\`\`

A team that uses \`getByRole\` consistently across its test suite usually has a higher Lighthouse Accessibility score than one that uses CSS selectors, because the locators force the team to add accessible names and proper ARIA.

## Locator-Generator (Inspector picker) workflow

When picking locators for a new test, the fastest workflow is:

1. Start a recording session: \`npx playwright codegen --target=typescript -o test.spec.ts https://app.example.com\`.
2. Click through the flow you want to test.
3. The Inspector emits the correct \`getByRole\`/\`getByLabel\` calls.
4. Copy into your test file and refactor as needed.

The Inspector's locator picker is the single source of truth for what locator Playwright would generate. Use it to verify any hand-written locator: pause the test, click the picker, hover the element, compare what the picker shows to what you wrote.

## Frequently Asked Questions

### What is the recommended locator priority in Playwright?

\`getByRole\` first (role + accessible name), then \`getByLabel\` for form fields, \`getByPlaceholder\` for placeholder-only inputs, \`getByText\` for content, \`getByTestId\` for cases where no semantic locator works, and CSS/XPath as a last resort. This priority is the official Playwright recommendation in 2026.

### What is a web-first assertion?

A web-first assertion is one called on a locator (\`expect(locator).toBeVisible()\`, \`toHaveText\`, etc.) that auto-retries until the condition holds or the timeout fires. They replace manual \`waitForSelector\` and \`waitForTimeout\` calls. The default retry timeout is 5 seconds, configurable globally or per assertion.

### How does strict mode work in Playwright locators?

Every locator must resolve to exactly one element. Zero matches: the action waits then fails. Two or more matches: a strict mode violation is thrown immediately. Fix by scoping the locator with chaining (\`page.getByRole('row').getByRole('button')\`) or filtering (\`.filter({ hasText: '...' })\`).

### When should I use getByTestId in Playwright?

Use \`getByTestId\` only when no semantic locator (role, label, placeholder, text) produces a unique result. Common cases are third-party components without ARIA and intentionally non-semantic UI elements like avatars or icons. Add \`data-testid\` attributes to the application as a deliberate escape hatch.

### How do I chain Playwright locators?

Call \`getBy...\` methods on a locator: \`page.getByRole('row', { name: 'Item' }).getByRole('button', { name: 'Delete' })\`. The chain resolves at action time, so the intermediate locators are not eagerly queried. Chaining is the canonical pattern for scoping to a specific row, card, or section.

### What is the difference between toBeVisible and toBeAttached?

\`toBeVisible\` requires the element to be in the DOM and have size and not hidden (\`display: none\`, \`visibility: hidden\`). \`toBeAttached\` only requires the element to be in the DOM - it may be hidden. Use \`toBeAttached\` when you want to assert something exists regardless of display.

### Can I use Playwright locators inside iframes?

Yes. Use \`page.frameLocator('iframe[selector]')\` to get a frame locator, then call \`getByRole\`, \`getByLabel\`, etc. on it. Cross-origin iframes work the same way as same-origin. See [Playwright frameLocator + Cross-Origin iframes](/blog/playwright-framelocator-cross-origin-iframe-guide).

### How do I assert that something is NOT visible?

Use \`.not\`: \`await expect(page.getByText('Loading')).not.toBeVisible()\`. The negative assertion still auto-retries; it passes as soon as the element becomes invisible (or never exists). For elements that should never have existed, \`not.toBeAttached()\` is also useful.

## Conclusion

\`getByRole\` first, web-first assertions everywhere, strict mode always on. That is the 2026 Playwright recipe for tests that stay green across refactors and across CI runs. Layer chaining and filtering for scoping, lean on the auto-retry behavior of \`expect(locator)\` to eliminate manual waits, and treat strict mode violations as bugs in your test.

For the broader assertion patterns, see [Playwright Best Practices 2026](/blog/playwright-best-practices-2026). For network mocking that integrates with locator-based tests, see [Playwright route.fulfill Network Mocking](/blog/playwright-route-fulfill-network-mocking-reference). For deterministic time control, see [Playwright Clock + Install/Fakers](/blog/playwright-clock-install-fakers-guide).

Install the [playwright-e2e skill](/skills/playwright-e2e) so your AI agent (Claude Code, Cursor, Aider) emits these locator and assertion patterns by default. Compare locator philosophies across frameworks in [Cypress vs Playwright 2026](/compare/cypress-vs-playwright-2026).
`,
};
