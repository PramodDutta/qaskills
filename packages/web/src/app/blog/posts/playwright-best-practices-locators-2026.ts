import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Best Practices for Locators in 2026',
  description: 'The complete 2026 best-practices guide for Playwright locators: role-based selection, accessible names, anti-flakiness patterns, and migration from CSS/XPath.',
  date: '2026-05-05',
  category: 'Guide',
  content: `
# Playwright Best Practices for Locators in 2026

Locators are the single biggest determinant of Playwright test reliability. A test with brittle CSS selectors will fail every time a class name changes, every time a designer reorganizes the DOM, every time you wrap a button in a tooltip. A test with role-based, accessible locators survives nearly every refactor, doubles as accessibility coverage, and produces stack traces that explain the failure in human terms. In 2026 the gap between teams that pick locators well and teams that do not is wider than the gap between Playwright and Cypress.

This guide is the working playbook the team behind QAskills.sh uses to write Playwright tests that stay green. It covers the decision tree for picking a locator, the auto-waiting behavior that makes those locators reliable, the chained and filtered patterns that handle real-world DOM, and the migration recipes for moving from CSS or XPath. Every example is TypeScript with Playwright 1.49+.

For an end-to-end primer, the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide) covers fundamentals. The [playwright-e2e skill](/skills/playwright-e2e) enforces these patterns automatically in Claude Code, Cursor, and Aider.

## The locator decision tree

When choosing how to locate an element, walk down this list and stop at the first match.

1. \`getByRole(role, { name })\` if the element has an ARIA role and accessible name.
2. \`getByLabel(text)\` for form fields with an associated label.
3. \`getByPlaceholder(text)\` for inputs that show placeholder text instead of a label.
4. \`getByText(text)\` for unique on-screen text without a role.
5. \`getByTestId(id)\` only when none of the above produce a unique, accessible result.
6. CSS or XPath as a last resort, never for interactive elements.

The rationale: items 1-3 mirror how screen readers identify elements. Items 4-5 are fallbacks. Items 6 is a smell that the element is not accessible, which is a bug in the product, not a virtue of the test.

\`\`\`typescript
// Good: role + accessible name
await page.getByRole('button', { name: 'Sign in' }).click();

// Good: label-based
await page.getByLabel('Email').fill('user@example.com');

// Acceptable when no semantic option exists
await page.getByTestId('user-avatar').click();

// Bad: brittle CSS
await page.locator('.btn-primary.signin').click();
\`\`\`

## Auto-waiting and why locators do not need explicit waits

Every locator method in Playwright auto-waits. Calling \`.click()\` waits for the element to be attached, visible, stable, enabled, and the receiver of pointer events before clicking. The same goes for \`.fill()\`, \`.check()\`, \`.selectOption()\`, and every assertion.

This means you almost never need \`page.waitForTimeout\`, \`page.waitForSelector\`, or your own poll loops. The locator does the waiting.

\`\`\`typescript
// Wrong: explicit waits
await page.waitForSelector('button.submit', { state: 'visible' });
await page.click('button.submit');

// Right: auto-wait via locator
await page.getByRole('button', { name: 'Submit' }).click();
\`\`\`

When a click times out, the failure includes which actionability check failed. "Element is detached", "element is not visible", "element is covered by another element" each point to a specific cause and a specific fix.

## Strict mode and uniqueness

By default Playwright operates in strict mode: every locator must resolve to exactly one element. If a locator matches zero, the test waits then fails. If it matches more than one, the test fails immediately with a "strict mode violation" error.

\`\`\`typescript
// Throws strict mode violation if two "Delete" buttons exist
await page.getByRole('button', { name: 'Delete' }).click();

// Fix with scoping
await page.getByRole('row', { name: 'Invoice 1234' })
  .getByRole('button', { name: 'Delete' })
  .click();
\`\`\`

Strict mode is the canary that tells you when the DOM has elements you did not expect.

## Scoping with chained locators

Real apps have repeated patterns: tables, lists, cards. Chain locators to scope to one row at a time.

\`\`\`typescript
const invoice = page.getByRole('row', { name: 'Invoice 1234' });
await invoice.getByRole('button', { name: 'Approve' }).click();
await expect(invoice.getByRole('cell', { name: 'Status' })).toHaveText('Approved');
\`\`\`

Chained locators read like English and survive layout changes. They also do not run extra queries: Playwright resolves the chain when an action or assertion runs.

## Filtering locators

\`.filter()\` narrows a set of locators by content, regex, or another locator.

\`\`\`typescript
const allInvoices = page.getByRole('row');

// Filter by text contained in the row
const approved = allInvoices.filter({ hasText: 'Approved' });
await expect(approved).toHaveCount(5);

// Filter by another locator (the row contains a checked checkbox)
const selected = allInvoices.filter({ has: page.getByRole('checkbox', { checked: true }) });
await expect(selected).toHaveCount(3);

// Negative filter
const unpaid = allInvoices.filter({ hasNotText: 'Paid' });
\`\`\`

\`hasText\` accepts a string or a regex. The regex form is useful for partial matches.

## Working with lists

Tests for paginated or virtual lists often need the nth element.

\`\`\`typescript
const items = page.getByRole('listitem');
await expect(items).toHaveCount(20);
await items.first().click();
await items.last().click();
await items.nth(3).click();

// Iterate
for (const item of await items.all()) {
  await expect(item).toBeVisible();
}
\`\`\`

\`first()\`, \`last()\`, and \`nth()\` return locators that resolve at action time, so they handle dynamic lists where items appear after a fetch.

## Locators inside Shadow DOM

Playwright pierces open shadow roots automatically. \`getByRole\` and \`getByText\` work whether the target is in light DOM, shadow DOM, or both.

\`\`\`typescript
// Works regardless of shadow boundaries
await page.getByRole('button', { name: 'Open editor' }).click();
\`\`\`

For closed shadow roots (rare in modern apps), you cannot pierce. The fix is to refactor the component to open the shadow.

For more depth on shadow DOM patterns, see [Playwright Iframe Shadow DOM Guide](/blog/playwright-iframe-shadow-dom-guide).

## Locators in iframes

Same-origin iframes appear in the same accessibility tree. Cross-origin iframes need an explicit frame switch.

\`\`\`typescript
// Same-origin: traverse with frameLocator
const iframe = page.frameLocator('iframe[name="content"]');
await iframe.getByRole('button', { name: 'Sign in' }).click();

// Cross-origin: same API still works
const widget = page.frameLocator('iframe[title="Embed"]');
await widget.getByLabel('Card number').fill('4111 1111 1111 1111');
\`\`\`

\`frameLocator\` re-resolves on every action, so it handles iframes that reload independently of the parent.

## Web-first assertions

Assertions like \`toBeVisible\`, \`toHaveText\`, \`toBeChecked\`, \`toHaveAttribute\` are auto-retrying. They re-evaluate the locator until either the assertion passes or the timeout (default five seconds) expires.

\`\`\`typescript
// Auto-retries up to expect.timeout
await expect(page.getByRole('status')).toHaveText('Saved');

// Explicit timeout override
await expect(page.getByRole('status')).toHaveText('Saved', { timeout: 15_000 });
\`\`\`

The web-first style means you almost never write \`while\` loops or your own polling. The matcher handles it.

## Avoiding \`textContent\` traps

\`page.textContent('h1')\` returns a string at the moment of the call. If the element has not rendered yet, you get \`null\`. Always prefer \`toHaveText\` which auto-waits.

\`\`\`typescript
// Wrong: snapshots current state and may fail before render
const title = await page.textContent('h1');
expect(title).toBe('Welcome');

// Right: auto-retrying assertion
await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome');
\`\`\`

## Test IDs as a last resort

\`getByTestId\` is the escape hatch for elements with no accessible affordance. Use it sparingly because it pollutes production markup.

\`\`\`tsx
<button data-testid="cart-icon" aria-label="Cart">
  <svg aria-hidden="true">...</svg>
</button>
\`\`\`

\`\`\`typescript
await page.getByTestId('cart-icon').click();
// Or, better, give it an accessible name
await page.getByRole('button', { name: 'Cart' }).click();
\`\`\`

Configure the test id attribute name in \`playwright.config.ts\` if you use something other than \`data-testid\`:

\`\`\`typescript
use: {
  testIdAttribute: 'data-test-id',
}
\`\`\`

## Locator comparison table

| Strategy | Resilience | Readability | Accessibility coverage |
|---|---|---|---|
| \`getByRole\` | High | High | High |
| \`getByLabel\` | High | High | High |
| \`getByPlaceholder\` | Medium | Medium | Low |
| \`getByText\` | Medium | High | Low |
| \`getByTestId\` | High | Medium | None |
| CSS class | Low | Low | None |
| XPath | Low | Low | None |

## Migrating from CSS selectors

Most legacy suites rely on classes or IDs. Migrate incrementally.

\`\`\`typescript
// Before
await page.click('.checkout-form .submit-btn');

// After
await page.getByRole('form', { name: 'Checkout' })
  .getByRole('button', { name: 'Place order' })
  .click();
\`\`\`

When the existing markup lacks roles or names, fix the markup first. The same change that makes the test reliable also makes the product accessible.

## Migrating from XPath

XPath is the locator of last resort in 2026. Migrate aggressively.

\`\`\`typescript
// Before
await page.click('//button[contains(@class, "primary")][text()="Sign in"]');

// After
await page.getByRole('button', { name: 'Sign in' }).click();
\`\`\`

XPath does not auto-wait at the locator construction level, can break when whitespace shifts, and is invisible to the picker. There is no scenario in 2026 where XPath produces a better locator than \`getByRole\`.

## Common pitfalls

**Pitfall 1: Picking on a stale snapshot.** When using the picker, always pick from a freshly taken snapshot. Stale snapshots produce stale locators.

**Pitfall 2: Asserting on classes.** \`toHaveClass('active')\` couples your test to CSS naming. Prefer \`toBeChecked\`, \`toBeDisabled\`, or \`toHaveAttribute('aria-selected', 'true')\`.

**Pitfall 3: First-or-die patterns.** \`.first()\` masks the fact that the locator is non-unique. If you mean "the most recent invoice", scope by a parent or by a deterministic filter.

**Pitfall 4: Long CSS chains.** \`page.locator('div.container > section.main > ul.items > li.active > a')\` is brittle. Replace with a role-based locator at the outermost meaningful boundary.

**Pitfall 5: Reusing the same locator across navigations.** Locators are bound to the page. After \`page.goto()\`, the previous locator is detached. Always re-declare or scope inside a function.

## Anti-patterns

- Hard-coding \`#main > div:nth-child(3) > span\`. Replace with a role-based locator inside a scoped parent.
- Importing CSS class constants from production source. Tests should be independent of CSS naming.
- Using \`waitForTimeout(2000)\` to "let the page settle". Replace with an assertion on a known final element.
- Layering many \`page.locator('css').locator('css')\` chains. Use \`.filter()\` and accessible parents.
- Skipping the locator picker. The picker prefers \`getByRole\` and produces better selectors than humans typing from memory.

## Picker workflow

In UI Mode or Codegen, click the picker icon and hover over elements. The popover shows the recommended locator. Copy it directly into the spec. The picker traverses the accessibility tree first and only falls back to CSS when no accessible affordance exists.

For more on UI Mode, see [Playwright UI Mode Complete 2026 Guide](/blog/playwright-ui-mode-complete-2026-guide).

## Linting locators

The \`eslint-plugin-playwright\` rule \`prefer-locator\` flags \`page.locator('css')\` calls that could be \`getByRole\` or \`getByLabel\` instead. Add it to your linter and CI for guardrails.

\`\`\`json
{
  "rules": {
    "playwright/prefer-locator": "error",
    "playwright/no-wait-for-timeout": "error"
  }
}
\`\`\`

## Conclusion and next steps

Picking locators well is the highest-leverage habit you can build for Playwright reliability. Lead with \`getByRole\`, scope with chains and filters, and let auto-waiting do its job. The investment pays back on every refactor.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants follow these patterns by default. For the deep dive on each role-based locator method, see [Playwright Locator Strategies Guide](/blog/playwright-locator-strategies-getbyrole-guide). For overall structure, [Playwright Best Practices Locators 2026](/blog/playwright-best-practices-locators-2026) is the companion to the [Playwright Test Config Options Complete Reference](/blog/playwright-test-config-options-complete-reference).
`,
};
