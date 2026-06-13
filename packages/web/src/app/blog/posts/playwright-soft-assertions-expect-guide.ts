import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Soft Assertions with expect.soft -- 2026 Guide',
  description:
    'Master Playwright soft assertions: expect.soft, expect.configure soft mode, test.info().errors, combining hard and soft assertions, and custom messages.',
  date: '2026-06-13',
  category: 'Guide',
  content: `
# Playwright Soft Assertions with expect.soft: The Complete Guide

By default, a Playwright assertion is a **hard assertion**: the moment \`expect(...).toBe(...)\` fails, the test stops, throws, and you never see whether the assertions that came after it would also have failed. That is the right behaviour for preconditions -- if a login fails, there is no point checking the dashboard. But for **verification-heavy tests** -- validating every field on a rendered form, every column in a table, every item in a summary panel -- hard assertions are painful. You fix one failure, re-run, discover the next one, fix that, re-run again. Each cycle costs a full test execution.

**Soft assertions** solve this. With \`expect.soft(...)\`, a failed assertion is **recorded but does not stop the test**. Execution continues, every subsequent soft assertion runs, and at the end of the test Playwright marks the test as failed and reports **all** the soft failures at once. You get the complete picture in a single run: every field that was wrong, not just the first one. This turns a multi-run debugging slog into a single, informative failure report.

This guide is a complete, practical reference for soft assertions in Playwright. We cover \`expect.soft\` with real TypeScript examples, the \`expect.configure({ soft: true })\` pattern for creating a reusable soft-expect, how to read accumulated failures via \`test.info().errors\`, how to combine hard and soft assertions correctly, custom failure messages, the \`@playwright/pytest\` Python equivalent, and -- critically -- when you should **not** use soft assertions. If you are building out a broader testing capability, our [QA skills directory](/skills) lists ready-made Playwright skills you can drop into your agent or framework.

## What Is a Soft Assertion?

A soft assertion checks a condition and records the result without throwing immediately. The test keeps running. At the end of the test, if any soft assertion failed, the test is reported as failed and **all** accumulated soft failures appear in the output. Contrast this with a hard assertion, which throws and aborts on the first failure.

The core idea is to separate two concerns: **stop-the-test conditions** (preconditions, navigation, auth) which should remain hard, and **verification conditions** (does every visible field show the right value?) which benefit from being soft. A single test can mix both.

Here is the simplest possible example -- three soft checks where two fail. The test reports both failures, not just the first:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('all profile fields render correctly', async ({ page }) => {
  await page.goto('https://example.com/profile');

  await expect.soft(page.getByTestId('name')).toHaveText('Ada Lovelace');
  await expect.soft(page.getByTestId('email')).toHaveText('ada@example.com');
  await expect.soft(page.getByTestId('role')).toHaveText('Engineer');
});
\`\`\`

If both \`name\` and \`role\` are wrong, you see **two** failures in one run. With hard assertions, you would only learn about \`name\`, fix it, re-run, and only then discover \`role\`.

## Hard vs Soft Assertions: The Core Difference

| Aspect | Hard assertion (\`expect\`) | Soft assertion (\`expect.soft\`) |
|---|---|---|
| On failure | Throws immediately, test stops | Records failure, test continues |
| Reports | First failure only | All failures at end of test |
| Use case | Preconditions, navigation, auth | Verifying many independent fields |
| Test result | Failed at first bad assertion | Failed at end if any soft failed |
| Debugging cycles | One failure per run | All failures in a single run |
| Risk | None -- safe default | Code after a soft failure may run on a bad state |

The risk row is the most important caveat. After a soft assertion fails, the test keeps going -- so any subsequent code that depends on the failed condition being true may itself throw a confusing error (for example, clicking a button that should have appeared but did not). Soft assertions are safe when each check is independent; they are dangerous when later steps depend on an earlier soft check passing.

## Using expect.soft in Practice

\`expect.soft\` is a drop-in replacement for \`expect\` -- it exposes the exact same matchers (\`toHaveText\`, \`toBeVisible\`, \`toHaveValue\`, \`toContainText\`, etc.). The only difference is failure handling. This makes it trivial to convert a verification block from hard to soft: add \`.soft\` to each line.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('order summary shows correct totals', async ({ page }) => {
  await page.goto('https://shop.example.com/cart');

  // Verify every line of the order summary independently.
  await expect.soft(page.getByTestId('subtotal')).toHaveText('$120.00');
  await expect.soft(page.getByTestId('shipping')).toHaveText('$9.99');
  await expect.soft(page.getByTestId('tax')).toHaveText('$10.40');
  await expect.soft(page.getByTestId('total')).toHaveText('$140.39');
  await expect.soft(page.getByTestId('item-count')).toHaveText('3 items');
});
\`\`\`

If the subtotal and tax are both wrong, the report shows both. Because every check is an independent read of the summary panel, there is no risk of one failure corrupting the next -- this is the ideal soft-assertion scenario.

## Why Use Soft Assertions?

The motivation is **feedback density**. A test that validates 12 fields with hard assertions gives you one bit of information per run: the index of the first failure. The same test with soft assertions gives you all 12 results per run. For UI verification, table validation, and form-rendering tests, this is a massive productivity win.

Soft assertions also produce **better bug reports**. When a QA engineer or an AI agent files a defect, "fields email, role, and joinDate all show stale data" is far more actionable than "the email field is wrong" (which is all a hard assertion would have surfaced). For comprehensive end-to-end verification patterns, our [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) covers how soft assertions fit into a full test architecture.

## Reading Accumulated Failures with test.info().errors

Sometimes you need programmatic access to the soft failures that have accumulated so far -- for instance, to take a custom action, attach a screenshot, or short-circuit the rest of the test if too many checks already failed. Playwright exposes them via \`test.info().errors\`, an array of every error recorded during the test (including soft-assertion failures).

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('validate dashboard widgets and bail if too broken', async ({ page }) => {
  await page.goto('https://app.example.com/dashboard');

  await expect.soft(page.getByTestId('widget-revenue')).toBeVisible();
  await expect.soft(page.getByTestId('widget-users')).toBeVisible();
  await expect.soft(page.getByTestId('widget-orders')).toBeVisible();

  // If two or more widgets already failed, the page is too broken to continue.
  if (test.info().errors.length > 1) {
    test.info().annotations.push({
      type: 'fatal',
      description: 'Multiple widgets missing -- aborting deeper checks.',
    });
    return; // stop early; the test will still be marked failed by the soft errors
  }

  // Otherwise continue with deeper, dependent checks.
  await page.getByTestId('widget-revenue').click();
  await expect(page.getByRole('heading', { name: 'Revenue detail' })).toBeVisible();
});
\`\`\`

\`test.info().errors\` returns an array of \`TestInfoError\` objects, each with \`message\`, \`stack\`, and \`value\`. Checking \`.length\` is the canonical way to ask "have any soft assertions failed so far?" and decide whether continuing makes sense.

## Reusable Soft Mode with expect.configure({ soft: true })

Adding \`.soft\` to every line is repetitive. Playwright lets you create a **pre-configured expect** with \`expect.configure({ soft: true })\`. The returned function behaves like \`expect.soft\` for every call, so you write \`softExpect(...)\` instead of \`expect.soft(...)\`.

\`\`\`typescript
import { test, expect } from '@playwright/test';

// Create a reusable soft expect once.
const softExpect = expect.configure({ soft: true });

test('product detail page renders all metadata', async ({ page }) => {
  await page.goto('https://shop.example.com/product/42');

  // Every call here is soft -- no need to repeat .soft.
  await softExpect(page.getByTestId('title')).toHaveText('Mechanical Keyboard');
  await softExpect(page.getByTestId('price')).toHaveText('$89.00');
  await softExpect(page.getByTestId('sku')).toHaveText('KB-MECH-042');
  await softExpect(page.getByTestId('stock')).toHaveText('In stock');
  await softExpect(page.getByTestId('rating')).toHaveText('4.6');
});
\`\`\`

\`expect.configure\` can also set other options like \`timeout\`. For example, \`expect.configure({ soft: true, timeout: 10000 })\` gives you a soft expect with a 10-second matcher timeout. This is a clean way to centralize the verification policy for an entire spec file.

## Combining Hard and Soft Assertions

The most robust tests mix both kinds deliberately. Use **hard** assertions for the steps that must succeed before verification is even meaningful, then switch to **soft** for the independent field checks.

\`\`\`typescript
import { test, expect } from '@playwright/test';

const softExpect = expect.configure({ soft: true });

test('checkout confirmation page', async ({ page }) => {
  await page.goto('https://shop.example.com/checkout');

  // HARD: if we cannot reach the confirmation page, nothing else matters.
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page).toHaveURL(/\\/confirmation\\/\\d+/);
  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();

  // SOFT: now verify every detail independently; collect all mismatches.
  await softExpect(page.getByTestId('order-id')).toContainText('#');
  await softExpect(page.getByTestId('ship-to')).toHaveText('Ada Lovelace');
  await softExpect(page.getByTestId('eta')).toHaveText('Jun 18, 2026');
  await softExpect(page.getByTestId('payment')).toHaveText('Visa ****4242');
});
\`\`\`

The pattern is: hard assertions gate the test, soft assertions verify the details. If the \`toHaveURL\` precondition fails, the test stops there -- there is no point soft-checking fields on a page you never reached. Once the precondition passes, the soft block gives you a complete verification report.

## Custom Failure Messages

A soft failure is far more useful when it explains *what* was being checked. Playwright lets you pass a custom message as the second argument to \`expect\` and \`expect.soft\`. The message prefixes the failure in the report.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('invoice line items with descriptive messages', async ({ page }) => {
  await page.goto('https://billing.example.com/invoice/2026-06');

  await expect
    .soft(page.getByTestId('amount-due'), 'Amount due should match the contract')
    .toHaveText('$4,200.00');

  await expect
    .soft(page.getByTestId('due-date'), 'Due date should be net-30 from issue')
    .toHaveText('Jul 13, 2026');

  await expect
    .soft(page.getByTestId('po-number'), 'PO number must be echoed back')
    .toHaveText('PO-99812');
});
\`\`\`

When \`amount-due\` is wrong, the report reads "Amount due should match the contract" followed by the matcher diff, instead of an anonymous \`toHaveText\` failure. For a test with a dozen soft checks, descriptive messages turn the failure report into a readable checklist.

## Soft Assertions in Python with @playwright/pytest

The Python binding (\`pytest-playwright\` / \`playwright.sync_api\`) also supports soft assertions via \`expect(...)\` configured for soft mode using a context manager-free approach. As of recent versions, you wrap independent checks and inspect failures the same way conceptually. Here is the idiomatic Python form using the synchronous API.

\`\`\`python
import re
from playwright.sync_api import Page, expect

def test_profile_fields_render(page: Page) -> None:
    page.goto("https://example.com/profile")

    # Each expect.soft-style check records but does not stop the test.
    expect(page.get_by_test_id("name")).to_have_text("Ada Lovelace")
    expect(page.get_by_test_id("email")).to_have_text("ada@example.com")
    expect(page.get_by_test_id("role")).to_have_text("Engineer")
\`\`\`

Note: the Python binding's soft-assertion support has historically lagged the TypeScript API, so for the richest soft-assertion experience (including \`expect.configure({ soft: true })\` and \`test.info().errors\`) the TypeScript \`@playwright/test\` runner is the reference implementation. If you maintain a Python suite, our [pytest patterns and fixtures](/blog/playwright-fixtures-complete-reference-2026) reference covers how to structure verification-heavy tests cleanly.

## How Soft Failures Appear in the Report

When a test ends with one or more soft failures, Playwright marks the test as failed and lists every soft error in the terminal reporter, the HTML report, and the trace. Each entry includes the matcher, the expected/received values, the custom message (if provided), and a stack trace pointing at the exact \`expect.soft\` line. This is the payoff: one run, every failure, each with its own diff. For visualizing complex UI state in these reports, see our [Playwright ARIA snapshot testing guide](/blog/playwright-aria-snapshot-testing-guide), which pairs well with soft assertions for whole-component verification.

## When NOT to Use Soft Assertions

Soft assertions are not a universal upgrade. There are concrete situations where they cause more harm than good.

| Situation | Use soft? | Reason |
|---|---|---|
| Independent field/column verification | Yes | Each check is isolated; collect all failures |
| Precondition (login, navigation) | No | If it fails, the rest is meaningless -- fail fast |
| Next step depends on this assertion | No | Continuing on a bad state throws confusing errors |
| Setup/teardown invariants | No | A broken fixture should stop the test immediately |
| Loop over many similar items | Yes | Report every bad item in one pass |
| Action that mutates state on failure | No | Continuing could corrupt data or cascade failures |

The governing principle: use soft assertions only when **the assertions are independent and the code after them does not depend on them passing**. If a failed check would make later steps throw, or if you are checking a precondition, keep the assertion hard. A test that soft-asserts everything indiscriminately produces noisy, cascading failures that are harder to debug than a single hard failure would have been.

## Real-World Pattern: Validating a Table with a Loop

One of the highest-value uses of soft assertions is validating every row of a table in a single pass. With hard assertions, the first bad row aborts the loop and you never learn about the rest. With soft assertions, every row is checked and every mismatch is reported, giving you a complete diff of the table in one run.

\`\`\`typescript
import { test, expect } from '@playwright/test';

const softExpect = expect.configure({ soft: true });

test('every order row shows the expected status', async ({ page }) => {
  await page.goto('https://app.example.com/orders');

  const expected = [
    { id: '1001', status: 'Shipped' },
    { id: '1002', status: 'Processing' },
    { id: '1003', status: 'Delivered' },
    { id: '1004', status: 'Cancelled' },
  ];

  for (const row of expected) {
    const cell = page.getByTestId(\`order-\${row.id}-status\`);
    await softExpect(cell, \`Order \${row.id} status\`).toHaveText(row.status);
  }

  // The test fails if ANY row mismatched, with one entry per bad row.
});
\`\`\`

Notice the custom message \`Order \${row.id} status\` -- when the report lists three failed rows, each one names the order it belongs to, so you can read the failure report like a checklist of broken orders. This loop-plus-soft pattern is the single most common reason teams adopt soft assertions.

## Soft Assertions with Web-First Auto-Retrying Matchers

Playwright's web-first matchers such as \`toHaveText\`, \`toBeVisible\`, and \`toHaveValue\` auto-retry until they pass or the timeout expires. \`expect.soft\` preserves this behaviour -- a soft assertion still waits and retries before recording a failure. That means a soft assertion does **not** record a spurious failure just because an element was momentarily not ready; it retries up to the configured timeout exactly like a hard assertion would.

\`\`\`typescript
import { test, expect } from '@playwright/test';

// Give every soft check a generous timeout for slow-loading widgets.
const softExpect = expect.configure({ soft: true, timeout: 8000 });

test('async dashboard panels settle then verify', async ({ page }) => {
  await page.goto('https://app.example.com/dashboard');

  // Each soft assertion auto-retries up to 8s before recording a failure.
  await softExpect(page.getByTestId('latency-panel')).toContainText('ms');
  await softExpect(page.getByTestId('uptime-panel')).toContainText('%');
  await softExpect(page.getByTestId('errors-panel')).toContainText('0 errors');
});
\`\`\`

Because the retry behaviour is preserved, you get the best of both worlds: resilient waiting for async content **and** full failure collection across all panels. This is why \`expect.soft\` is safe to use even on pages that render content progressively.

## Best Practices Checklist

- Keep preconditions (auth, navigation, fixture setup) as hard assertions -- fail fast.
- Use soft assertions for blocks of independent verifications (forms, tables, summaries).
- Create a \`softExpect = expect.configure({ soft: true })\` to avoid repeating \`.soft\`.
- Always add a custom message so each soft failure is self-explanatory.
- Use \`test.info().errors.length\` to bail out before dependent steps if the page is already broken.
- Do not chain dependent actions after a soft assertion -- they may run on an invalid state.
- Mix hard and soft in one test deliberately: hard gates, soft verifies.

## Frequently Asked Questions

### What is a soft assertion in Playwright?

A soft assertion in Playwright, written as \`expect.soft(...)\`, checks a condition and records the result without stopping the test on failure. Execution continues so subsequent soft assertions still run, and at the end of the test Playwright reports every soft failure at once and marks the test as failed. It is ideal for verifying many independent fields in a single run.

### How is expect.soft different from expect in Playwright?

\`expect\` is a hard assertion: it throws and aborts the test on the first failure, so you only ever see one failure per run. \`expect.soft\` records the failure but lets the test continue, so all soft failures are collected and reported together at the end. Both expose the same matchers; the only difference is whether a failure stops the test.

### How do I make all assertions soft in a Playwright test?

Use \`expect.configure({ soft: true })\` to create a pre-configured expect, for example \`const softExpect = expect.configure({ soft: true })\`. Every call to \`softExpect(...)\` then behaves like \`expect.soft\`. You can also pass other options such as \`timeout\` in the same configure call, which centralizes your verification policy for the whole spec file.

### How do I read all soft assertion failures in Playwright?

Playwright accumulates every error, including soft-assertion failures, in \`test.info().errors\` -- an array of error objects each with \`message\`, \`stack\`, and \`value\`. Check \`test.info().errors.length\` to see how many checks have failed so far, which is the canonical way to decide whether to continue with dependent steps or bail out early.

### Can I combine hard and soft assertions in the same test?

Yes, and it is the recommended pattern. Use hard \`expect\` assertions for preconditions like login, navigation, and fixture setup -- steps that make the rest of the test meaningless if they fail. Then switch to \`expect.soft\` for the independent field verifications. Hard assertions gate the test; soft assertions produce a complete verification report once the gate passes.

### When should I not use soft assertions in Playwright?

Avoid soft assertions for preconditions (auth, navigation), for setup or teardown invariants, and whenever a later step depends on the assertion passing. Because a soft failure lets the test continue, code that runs afterward may execute on a bad state and throw confusing, cascading errors. Keep those assertions hard so the test fails fast and clearly.

### Does Playwright Python support soft assertions?

The Python binding supports soft-style assertions, but its API has historically lagged the TypeScript runner. For the full feature set -- \`expect.soft\`, \`expect.configure({ soft: true })\`, and \`test.info().errors\` -- the TypeScript \`@playwright/test\` runner is the reference implementation. Python suites can still group independent verifications, but expect richer ergonomics in TypeScript.

## Conclusion

Soft assertions are one of Playwright's most practical features for verification-heavy tests. By replacing \`expect\` with \`expect.soft\`, a failed check is recorded rather than thrown, the test keeps running, and you get **every** failure in a single run instead of fixing them one painful re-run at a time. The \`expect.configure({ soft: true })\` helper removes the boilerplate, custom messages make each failure self-explanatory, and \`test.info().errors\` gives you programmatic control to bail out before dependent steps run on a broken page.

The discipline that makes soft assertions work is knowing **where** to use them: soft for independent verifications, hard for preconditions and any step whose success the rest of the test depends on. Mix the two deliberately -- hard assertions gate the test, soft assertions verify the details -- and you get fast-failing setup with rich, complete verification reports. For more Playwright patterns, fixtures, and ready-to-use testing skills, explore our [QA skills directory](/skills) and the [Cypress vs Playwright comparison](/blog/cypress-vs-playwright-2026).
`,
};
