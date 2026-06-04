---
name: Playwright Locator filter & Visibility
description: Teaches the agent to build resilient Playwright locators with .filter (hasText/has/hasNot), narrow lists, and reason correctly about visibility, waitFor states, and timeouts.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [playwright, locator, filter, visibility, waitfor, hastext, resilient-locators, auto-wait]
testingTypes: [e2e, integration]
frameworks: [playwright]
languages: [typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Playwright Locator filter & Visibility

This skill makes the agent write locators that survive UI churn: role/label-first selection, narrowed with `.filter({ hasText, has, hasNot })` instead of brittle CSS/XPath, and correct reasoning about visibility — knowing when to use the auto-waiting `expect(...).toBeVisible()` versus the imperative `isVisible()` / `waitFor()`. The recurring theme: **locators are lazy and re-resolve on every action**, and assertions auto-wait, so explicit sleeps and one-shot `isVisible()` checks are almost always wrong.

Use this skill when a locator is flaky, matches multiple elements, depends on text or a child, or when the agent is tempted to add `waitForTimeout`.

## Core Principles

1. **Locators are lazy.** A `Locator` is a query, not an element. It re-resolves every time you act on it, so it tolerates re-renders. Define it once, use it repeatedly.
2. **Filter, do not concatenate selectors.** Start from a semantic locator (`getByRole`) and narrow with `.filter({ hasText })`, `.filter({ has })`, or `.filter({ hasNot })` — not a long CSS chain.
3. **`expect(locator).toBeVisible()` auto-waits; `locator.isVisible()` does not.** The assertion polls until the timeout; `isVisible()` returns a boolean *right now* with no waiting.
4. **Never assert on a `count()` snapshot for dynamic lists.** Use `await expect(locator).toHaveCount(n)` which retries; `(await loc.count()) === n` is a race.
5. **Prefer waiting for state over `waitForTimeout`.** `locator.waitFor({ state: 'visible' })` (or just acting on the locator) replaces arbitrary sleeps.
6. **Scope timeouts at the assertion**, not globally — pass `{ timeout }` to the specific `expect`/action that genuinely needs longer.

## Workflow / Patterns

### Pattern 1 — `filter({ hasText })` to pick one row out of many

The classic case: a table/list where rows share structure but differ by text.

```typescript
import { test, expect } from '@playwright/test';

test('acts on the right row via hasText', async ({ page }) => {
  await page.goto('https://example.com/orders');

  // All rows share the same role; narrow to the one mentioning the order.
  const row = page.getByRole('row').filter({ hasText: 'ORD-1042' });

  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Cancel' }).click();

  // hasText accepts a RegExp for partial / case-insensitive matching.
  const refunded = page.getByRole('row').filter({ hasText: /refunded/i });
  await expect(refunded).toHaveCount(1);
});
```

### Pattern 2 — `filter({ has })` and `filter({ hasNot })` to match by descendant

When rows can't be told apart by their own text, filter by a child element they contain (or lack).

```typescript
test('filters cards by a child element', async ({ page }) => {
  await page.goto('https://example.com/products');

  // Only cards that CONTAIN a "Sale" badge.
  const onSale = page
    .getByRole('article')
    .filter({ has: page.getByRole('img', { name: 'Sale' }) });
  await expect(onSale.first()).toBeVisible();

  // Only cards that do NOT contain an "Out of stock" label.
  const buyable = page
    .getByRole('article')
    .filter({ hasNot: page.getByText('Out of stock') });

  // Chain filters: buyable AND mentioning "Pro".
  const target = buyable.filter({ hasText: 'Pro' });
  await target.getByRole('button', { name: 'Add to cart' }).click();
});
```

### Pattern 3 — Build resilient, chained locators (role-first)

Prefer accessible roles/labels; chain to scope. Avoid index-based and deep CSS selectors.

```typescript
test('uses resilient chained locators', async ({ page }) => {
  await page.goto('https://example.com/settings');

  // Scope into a section, then target by role within it.
  const billing = page.getByRole('region', { name: 'Billing' });
  await billing.getByRole('button', { name: 'Update card' }).click();

  // Disambiguate same-named buttons by their surrounding text.
  const proRow = page.getByTestId('plan-row').filter({ hasText: 'Pro' });
  await proRow.getByRole('button', { name: 'Select' }).click();

  // getByText with { exact: true } when substring matches are too greedy.
  await expect(page.getByText('Plan updated', { exact: true })).toBeVisible();
});
```

### Pattern 4 — Visibility: assertion (auto-wait) vs `isVisible()` (instant)

This is the most common mistake. Use the assertion to *wait*; use `isVisible()` only for branching on current state.

```typescript
test('handles visibility correctly', async ({ page }) => {
  await page.goto('https://example.com');

  // CORRECT: auto-waits up to the timeout for the toast to appear.
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toBeVisible({ timeout: 10_000 });

  // CORRECT use of isVisible(): branch on whether an optional banner exists.
  const banner = page.getByRole('alert', { name: 'Cookie consent' });
  if (await banner.isVisible()) {
    await banner.getByRole('button', { name: 'Accept' }).click();
  }

  // WRONG (do not do this): isVisible() does not wait, so this races a fade-in.
  // expect(await toast.isVisible()).toBe(true);
});
```

### Pattern 5 — `waitFor({ state })` for appearance, detachment, and hiding

Use `waitFor` when you need to block on a state transition without performing an action.

```typescript
test('waits for explicit element states', async ({ page }) => {
  await page.goto('https://example.com/upload');

  const spinner = page.getByRole('progressbar');

  await page.getByRole('button', { name: 'Start upload' }).click();
  await spinner.waitFor({ state: 'visible' });

  // Block until the spinner is gone before asserting success.
  await spinner.waitFor({ state: 'hidden', timeout: 30_000 });
  await expect(page.getByText('Upload complete')).toBeVisible();

  // 'attached' / 'detached' for elements added/removed from the DOM entirely.
  const modal = page.getByRole('dialog');
  await modal.waitFor({ state: 'detached' });
});
```

### Pattern 6 — Iterate and assert over a filtered set

Combine `filter` with `all()` / `nth` / `toHaveCount` for list assertions.

```typescript
test('asserts across a filtered list', async ({ page }) => {
  await page.goto('https://example.com/inbox');

  const unread = page.getByRole('listitem').filter({ has: page.getByTestId('unread-dot') });

  // Retrying count assertion — waits for the list to settle.
  await expect(unread).toHaveCount(3);

  // Per-item assertions.
  for (const item of await unread.all()) {
    await expect(item.getByRole('heading')).toBeVisible();
  }

  // Act on the first/last match of the filtered set.
  await unread.first().click();
  await expect(page.getByTestId('unread-dot')).toHaveCount(2);
});
```

## Best Practices

1. **Start every locator from `getByRole`/`getByLabel`/`getByText`**, then narrow with `.filter(...)`. Reserve CSS/XPath for cases the accessibility tree can't express.
2. **Use `.filter({ has })` / `.filter({ hasNot })`** to select by descendant when text alone is ambiguous; chain filters for AND logic.
3. **Assert visibility with `await expect(locator).toBeVisible()`** so it auto-waits; reserve `isVisible()` for `if` branches on optional UI.
4. **Use `toHaveCount(n)`** for dynamic lists — it retries — instead of comparing `await locator.count()`.
5. **Replace `waitForTimeout` with `locator.waitFor({ state })`** or simply acting on the locator (which auto-waits).
6. **Pass `{ timeout }` to the specific assertion** that needs longer rather than inflating the global timeout.
7. **Define a locator once as a `const`** and reuse it — it re-resolves on each use, so it stays valid across re-renders.

## Anti-Patterns

1. **`page.locator('.row:nth-child(3) .btn.btn-danger')`.** Index- and class-based; breaks on reorder or restyle. Filter by role + text instead.
2. **`expect(await loc.isVisible()).toBe(true)`.** No waiting — races animations and async renders. Use `await expect(loc).toBeVisible()`.
3. **`if ((await loc.count()) === 2) {...}`.** Snapshot count is a race on dynamic lists. Use `toHaveCount`.
4. **`await page.waitForTimeout(2000)` before clicking.** Arbitrary and flaky. Locators auto-wait; or use `waitFor({ state })`.
5. **Selecting from a list by raw `.nth(4)`** without filtering — order is data-dependent. Filter to the meaningful item first.
6. **One mega-CSS selector** stringing together five descendant combinators instead of chaining scoped locators.
7. **Raising the global `timeout`** to mask one slow screen, slowing every other test's failure feedback.

## When to Trigger This Skill

- "My locator matches multiple elements / 'strict mode violation'"
- "How do I select the table row that contains this text?"
- "Use `filter` / `hasText` / `has` to narrow a locator"
- "Difference between `isVisible()` and `toBeVisible()`"
- "Wait for a spinner to disappear before asserting"
- "My selector is brittle / breaks when the UI changes"
- "Assert how many items are in a dynamic list"
- "Replace `waitForTimeout` with a proper wait"
