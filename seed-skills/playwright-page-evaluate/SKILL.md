---
name: Playwright page.evaluate Patterns
description: Teaches the agent when and how to use page.evaluate, evaluateHandle, and exposeFunction in Playwright — passing arguments safely, reading DOM/JS state, and why locators should be preferred for actions.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [playwright, evaluate, evaluatehandle, exposefunction, dom, javascript, jshandle, browser-context]
testingTypes: [e2e, integration]
frameworks: [playwright]
languages: [typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Playwright page.evaluate Patterns

This skill makes the agent use `page.evaluate` the way it is meant to be used: to **read** application state from the browser, not to replace user actions. The function body runs inside the page's JS context, so `document`, `window`, and app globals are available — but Node closures and imports are not. Arguments must be explicitly serialized across the bridge.

Use this skill when the agent needs to inspect `localStorage`, read a JS variable, call a page API, or scrape computed values — and to stop the agent from clicking via `evaluate(() => el.click())` when a locator would be correct.

## Core Principles

1. **Read with `evaluate`, act with locators.** Use `evaluate` to extract state. Use `page.getByRole(...).click()` for interactions — locators auto-wait and reflect real user behavior; `el.click()` inside evaluate bypasses actionability checks and hides bugs.
2. **The callback runs in the browser, not Node.** No access to test variables, `require`, `process.env`, or imported helpers unless passed as an argument.
3. **Arguments must be serializable** (JSON-compatible) — *except* `JSHandle`/`ElementHandle`, which are passed by reference. Functions, class instances, and `undefined` keys do not cross intact.
4. **`evaluate` returns serialized values; `evaluateHandle` returns a live handle.** Use a handle when you need to keep referencing a non-serializable object (e.g. `window`, a DOM node) across calls.
5. **Treat all page input as untrusted.** Never build the evaluated source by string-concatenating page content — pass data as an argument so it can never be interpreted as code.

## Workflow / Patterns

### Pattern 1 — Read JS / DOM state (the primary use)

```typescript
import { test, expect } from '@playwright/test';

test('reads application state from the page', async ({ page }) => {
  await page.goto('https://example.com/app');

  // Read a global the app sets.
  const userId = await page.evaluate(() => (window as any).__APP__?.currentUser?.id);
  expect(userId).toBeTruthy();

  // Read localStorage (impossible to assert on from Node directly).
  const theme = await page.evaluate(() => localStorage.getItem('theme'));
  expect(theme).toBe('dark');

  // Read a computed style the user actually sees.
  const color = await page.evaluate(() => {
    const btn = document.querySelector('button.primary')!;
    return getComputedStyle(btn).backgroundColor;
  });
  expect(color).toBe('rgb(37, 99, 235)');
});
```

### Pattern 2 — Pass arguments safely (single arg, then object/array)

`evaluate` takes exactly **one** argument. Bundle multiple values into an object or array.

```typescript
test('passes data into the page context', async ({ page }) => {
  await page.goto('https://example.com');

  // Single primitive.
  const doubled = await page.evaluate((n) => n * 2, 21);
  expect(doubled).toBe(42);

  // Multiple values -> wrap in an object, destructure inside.
  const fullName = await page.evaluate(
    ({ first, last }) => `${first} ${last}`.trim(),
    { first: 'Ada', last: 'Lovelace' },
  );
  expect(fullName).toBe('Ada Lovelace');

  // Seed app state for a test scenario.
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token);
  }, process.env.TEST_TOKEN ?? 'test-token-123');
});
```

### Pattern 3 — Pass a located element into `evaluate`

A `Locator` resolves to an element handle that crosses the bridge by reference, so you can operate on the *exact* element the locator found.

```typescript
test('evaluates against a located element', async ({ page }) => {
  await page.goto('https://example.com/products');

  const card = page.getByRole('article', { name: 'Pro Plan' });

  // The first arg of the callback is the resolved element node.
  const data = await card.evaluate((el) => ({
    price: el.querySelector('.price')?.textContent?.trim(),
    inStock: el.getAttribute('data-in-stock') === 'true',
    width: el.getBoundingClientRect().width,
  }));

  expect(data.inStock).toBe(true);
  expect(Number(data.width)).toBeGreaterThan(0);

  // Pass extra args alongside the element (element first, then your arg).
  const matches = await card.evaluate(
    (el, expected) => el.querySelector('.price')?.textContent?.includes(expected),
    '$29',
  );
  expect(matches).toBe(true);
});
```

### Pattern 4 — `evaluateHandle` for non-serializable objects

When the value cannot be serialized (the `window`, a DOM node, a Map) but you need to keep using it, get a handle and pass it back into later `evaluate` calls.

```typescript
test('keeps a live handle to a non-serializable object', async ({ page }) => {
  await page.goto('https://example.com');

  // window is not serializable — get a handle instead.
  const windowHandle = await page.evaluateHandle(() => window);

  // Reuse the handle as an argument in a later evaluate.
  const innerWidth = await page.evaluate((w) => (w as Window).innerWidth, windowHandle);
  expect(innerWidth).toBeGreaterThan(0);

  // Handle to a specific element with live properties.
  const inputHandle = await page.evaluateHandle(
    () => document.querySelector('input#email') as HTMLInputElement,
  );
  const validity = await inputHandle.evaluate((el: HTMLInputElement) => el.validity.valid);
  expect(typeof validity).toBe('boolean');

  // Dispose handles when done to free browser memory.
  await windowHandle.dispose();
  await inputHandle.dispose();
});
```

### Pattern 5 — `exposeFunction` to call Node from the page

`exposeFunction` installs a Node-backed async function on `window`, so page code can call back into your test (logging, recording calls, providing data the browser cannot compute).

```typescript
test('captures page-side events via exposeFunction', async ({ page }) => {
  const analyticsCalls: Array<{ event: string; props: unknown }> = [];

  // Install BEFORE navigation so it exists when the page runs.
  await page.exposeFunction('reportToTest', (event: string, props: unknown) => {
    analyticsCalls.push({ event, props });
  });

  await page.goto('https://example.com');

  // Hook the app's analytics so each call is forwarded to Node.
  await page.evaluate(() => {
    const original = (window as any).analytics?.track;
    (window as any).analytics = {
      track: (event: string, props: unknown) => {
        (window as any).reportToTest(event, props);
        original?.(event, props);
      },
    };
  });

  await page.getByRole('button', { name: 'Add to cart' }).click();

  // The exposed function returns a Promise; give the call time to land.
  await expect.poll(() => analyticsCalls.length).toBeGreaterThan(0);
  expect(analyticsCalls[0].event).toBe('add_to_cart');
});
```

### Pattern 6 — `addInitScript` to run code before any page script

Use this (not `evaluate`) when you must override a browser API *before* the app boots — e.g. freezing `Date.now` or stubbing geolocation.

```typescript
test('freezes time before the app loads', async ({ page }) => {
  await page.addInitScript(() => {
    const fixed = new Date('2025-01-01T00:00:00Z').valueOf();
    Date.now = () => fixed;
  });

  await page.goto('https://example.com/dashboard');
  await expect(page.getByTestId('current-year')).toHaveText('2025');
});
```

## Best Practices

1. **Default to locators for actions; reach for `evaluate` only to read.** If you typed `evaluate(() => el.click())`, ask whether `locator.click()` is correct instead.
2. **Bundle multiple inputs into one object argument** and destructure inside the callback — `evaluate` accepts a single arg.
3. **Return plain JSON-serializable data** from `evaluate`; if the result is non-serializable, switch to `evaluateHandle`.
4. **Call `handle.dispose()`** when finished with a `JSHandle`/`ElementHandle` in long tests to avoid leaking browser memory.
5. **Install `exposeFunction` / `addInitScript` before `page.goto`** so they are present when the page executes.
6. **Prefer `locator.evaluate(el => ...)`** over `page.evaluate` plus a manual `querySelector` — the locator already found and waited for the element.

## Anti-Patterns

1. **Using `evaluate` to click, type, or hover.** It skips Playwright's actionability checks (visibility, enabled, stable), so tests pass on broken UIs.
2. **Closing over Node variables in the callback.** `const url = '...'; page.evaluate(() => fetch(url))` is `undefined` inside the browser — pass `url` as an argument.
3. **Interpolating page-derived strings into the evaluated source.** `page.evaluate(\`run('${userInput}')\`)` is an injection vector; pass values as arguments instead.
4. **Returning DOM nodes, functions, or class instances from `evaluate`.** They serialize to `{}` or `undefined`. Return primitives/plain objects, or use a handle.
5. **Forgetting `evaluate` accepts only one argument** and passing two positional values — the second is silently dropped.
6. **Never disposing handles** in loops or long-lived sessions, causing the browser process to grow unbounded.
7. **Using `addInitScript` for assertions** — it only injects setup code; read state with `evaluate` after load.

## When to Trigger This Skill

- "Read localStorage / sessionStorage / a cookie value in Playwright"
- "Get a JavaScript variable or `window.__STATE__` from the page"
- "How do I pass a variable into `page.evaluate`?"
- "Difference between `evaluate` and `evaluateHandle`"
- "Call a Node function from inside the browser" / "capture analytics calls"
- "Read computed CSS / `getBoundingClientRect` in a test"
- "Mock `Date.now` / geolocation before the page loads"
- "Should I use `evaluate` to click this element?"
