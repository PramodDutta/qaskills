import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright page.evaluate(): Complete Reference 2026',
  description:
    'Master Playwright page.evaluate() and evaluateHandle() in TypeScript: passing args, return values, exposeFunction, addScriptTag, serialization, and gotchas.',
  date: '2026-06-03',
  category: 'Reference',
  content: `
# Playwright page.evaluate(): Complete Reference 2026

\`page.evaluate()\` is the bridge between your Node.js test process and the JavaScript runtime inside the browser. When you call it, Playwright serializes the function you pass, ships it across the protocol connection, runs it in the page's main context, and serializes the result back to you. That single capability unlocks everything the high-level locator API does not cover: reading computed styles, calling app-specific globals, seeding \`localStorage\`, measuring performance timings, scrolling at the DOM level, or extracting structured data the page never renders as visible text. This is the complete, official-grade reference for \`page.evaluate()\` and its sibling \`page.evaluateHandle()\`, written for the \`@playwright/test\` runner in TypeScript.

The most important idea to grasp up front — and the source of nearly every bug people hit — is the **two-world boundary**. The function body you write executes inside the browser, not in Node. It has access to \`window\`, \`document\`, and any globals the page defines, but it has **no** access to variables from your test file, no access to \`require\` or \`import\`, and no access to your Node imports. Anything the browser function needs from the outside must be passed explicitly as a serializable argument, and anything it returns must itself be serializable. Closures do not cross the boundary; data does, but only JSON-compatible data. Hold that distinction firmly and the rest of this reference falls into place.

We will cover the full surface area: the difference between \`evaluate\` and \`evaluateHandle\`, exactly what serializes and what does not, passing single and multiple arguments, returning values, evaluating against a specific element via a locator, injecting persistent functions with \`page.exposeFunction\`, injecting scripts and styles with \`addScriptTag\` and \`addStyleTag\`, the security implications of executing arbitrary code, and a thorough gotchas section. If you are newer to the framework overall, start with the [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide) and the [Playwright best practices for 2026](/blog/playwright-best-practices-2026), then return here when you need to drop down into the page.

## evaluate vs evaluateHandle: What Each Returns

There are two evaluation methods and the difference is entirely about **what comes back**. \`page.evaluate(fn)\` returns the **serialized value** of whatever \`fn\` returns — a plain JavaScript value copied into your Node process. \`page.evaluateHandle(fn)\` returns a **handle** — a live reference to the in-browser object that you can pass back into later evaluations without ever copying it to Node. Use \`evaluate\` when you want the data; use \`evaluateHandle\` when you want to keep operating on a browser object (like a DOM node or a large object) without serializing it.

| Method | Returns | When to use | Serializes result? |
|---|---|---|---|
| \`page.evaluate(fn, arg?)\` | Serialized JS value | You need the actual data in Node | Yes |
| \`page.evaluateHandle(fn, arg?)\` | \`JSHandle\` / \`ElementHandle\` | You need a live browser-side reference | No |
| \`locator.evaluate(fn, arg?)\` | Serialized JS value | Run against the element a locator resolves to | Yes |
| \`locator.evaluateAll(fn, arg?)\` | Serialized JS value | Run against ALL matching elements as an array | Yes |

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('evaluate returns data, evaluateHandle returns a reference', async ({ page }) => {
  await page.goto('https://example.com');

  // evaluate: a plain value is copied back into Node
  const title: string = await page.evaluate(() => document.title);
  expect(title).toContain('Example');

  // evaluateHandle: a live handle to the in-browser object
  const bodyHandle = await page.evaluateHandle(() => document.body);
  const childCount = await bodyHandle.evaluate((body: HTMLElement) => body.childElementCount);
  expect(childCount).toBeGreaterThan(0);

  // Always dispose handles you no longer need
  await bodyHandle.dispose();
});
\`\`\`

A handle keeps the underlying object alive in the browser until you call \`dispose()\` or the page navigates, so dispose handles when finished to avoid leaks. In modern Playwright most element work should go through **locators**, not handles — locators are lazy, auto-retrying, and far more robust. Reach for \`evaluateHandle\` only when you specifically need a stable reference to a non-locator object such as a custom JS object or a function.

## Serialization Rules: What Crosses the Boundary

Everything passed in and returned out of \`evaluate\` travels as a **serialized copy**, using a superset of JSON. Understanding precisely what survives the trip prevents the most confusing failures. Plain objects, arrays, strings, numbers, booleans, and \`null\` all serialize cleanly. Playwright additionally preserves a few non-JSON values that plain \`JSON.stringify\` would drop: \`undefined\`, \`NaN\`, \`Infinity\`, \`-Infinity\`, \`-0\`, \`BigInt\`, and \`Date\`. What does **not** survive: functions, DOM nodes (returned by value), \`Map\`, \`Set\`, \`RegExp\`, \`Error\` objects (you get a plain object), class instances (you get a plain object stripped of its prototype and methods), and anything containing a circular reference (which throws).

| Value type | Serializes through evaluate? | Notes |
|---|---|---|
| string, number, boolean, null | Yes | Trivial |
| undefined, NaN, Infinity, -0 | Yes | Preserved (unlike plain JSON) |
| BigInt, Date | Yes | Preserved as the same type |
| Plain object, array | Yes | Deeply copied |
| Function | No | Cannot be passed or returned by value |
| DOM node (by value) | No | Returns \`undefined\`; use \`evaluateHandle\` or a locator |
| Map, Set, RegExp | No | Returned as a plain object, losing semantics |
| Class instance | No (lossy) | Returns a plain object without methods/prototype |
| Circular structure | No | Throws a serialization error |

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('serialization preserves special values but not functions or DOM nodes', async ({ page }) => {
  await page.goto('https://example.com');

  // Special numeric and date values survive the round trip
  const special = await page.evaluate(() => ({
    nope: undefined,
    notANumber: NaN,
    huge: 9007199254740993n, // BigInt
    when: new Date('2026-06-03T00:00:00Z'),
  }));
  expect(special.notANumber).toBeNaN();
  expect(special.when).toBeInstanceOf(Date);

  // Returning a DOM node by value yields undefined — use a handle instead
  const domByValue = await page.evaluate(() => document.body);
  expect(domByValue).toBeUndefined();
});
\`\`\`

The rule of thumb: return **data**, not **objects with behavior**. If you find yourself wanting to return a DOM element to do more with it, either finish the work inside the same \`evaluate\` call or return a handle from \`evaluateHandle\`.

## Passing Arguments Into the Browser

Because the page has no access to your test's variables, you pass data as the **second argument** to \`evaluate\`. Playwright serializes it, the browser receives it as the function's parameter. You can pass a single value or, by wrapping in an object or array, multiple values. This is the single most common point of confusion: people reference an outer variable inside the function body and are surprised it is \`undefined\` in the browser.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('pass arguments explicitly — closures do not cross the boundary', async ({ page }) => {
  await page.goto('https://example.com');

  const userId = 42;
  const settings = { theme: 'dark', beta: true };

  // WRONG: 'userId' is undefined inside the browser — it is a Node variable
  // await page.evaluate(() => localStorage.setItem('uid', String(userId)));

  // RIGHT: pass it as the second argument
  await page.evaluate((id) => localStorage.setItem('uid', String(id)), userId);

  // Multiple values: wrap them in one object
  await page.evaluate(
    ({ id, theme, beta }) => {
      localStorage.setItem('uid', String(id));
      localStorage.setItem('theme', theme);
      localStorage.setItem('beta', String(beta));
    },
    { id: userId, ...settings },
  );

  const stored = await page.evaluate(() => ({
    uid: localStorage.getItem('uid'),
    theme: localStorage.getItem('theme'),
  }));
  expect(stored).toEqual({ uid: '42', theme: 'dark' });
});
\`\`\`

You can also pass a \`JSHandle\` or \`ElementHandle\` as an argument, and Playwright will hand the browser function the **live object** rather than a copy. This lets you combine a handle obtained earlier with new logic:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('pass a handle as an argument to operate on the live object', async ({ page }) => {
  await page.goto('https://example.com');

  const headingHandle = await page.evaluateHandle(() => document.querySelector('h1'));

  // The handle is passed by reference; 'el' is the real DOM node in the browser
  const text = await page.evaluate((el) => el?.textContent ?? '', headingHandle);
  expect(text.length).toBeGreaterThan(0);

  await headingHandle.dispose();
});
\`\`\`

## Returning Values and Common Patterns

The return value of the browser function becomes the resolved value of the promise, serialized per the rules above. This makes \`evaluate\` perfect for extracting computed or aggregated data that no single locator can give you. A few high-value patterns appear constantly in real suites.

Reading a computed style — something locators cannot directly assert in older versions and is sometimes clearer at the DOM level:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('read a computed style via evaluate', async ({ page }) => {
  await page.goto('https://example.com');

  const color = await page
    .locator('h1')
    .evaluate((el) => getComputedStyle(el).color);

  expect(color).toBe('rgb(0, 0, 0)');
});
\`\`\`

Scraping a structured list with \`locator.evaluateAll\`, which runs your function once with the **array of all matching elements**:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('extract structured data from a list with evaluateAll', async ({ page }) => {
  await page.goto('https://example.com/products');

  const products = await page.locator('.product-card').evaluateAll((cards) =>
    cards.map((card) => ({
      name: card.querySelector('.name')?.textContent?.trim() ?? '',
      price: Number(card.querySelector('.price')?.getAttribute('data-cents') ?? 0) / 100,
    })),
  );

  expect(products.length).toBeGreaterThan(0);
  expect(products[0]).toHaveProperty('price');
});
\`\`\`

Reading performance timings straight from the browser's Performance API, useful for lightweight perf assertions inside a functional test:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('capture navigation timing with evaluate', async ({ page }) => {
  await page.goto('https://example.com');

  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      loadComplete: nav.loadEventEnd - nav.startTime,
    };
  });

  expect(timing.domContentLoaded).toBeLessThan(5000);
});
\`\`\`

A critical caveat: prefer Playwright's auto-waiting locators and web-first assertions for **interactions**. Do not use \`evaluate\` to click buttons (\`el.click()\`) or fill inputs as a shortcut, because doing so bypasses Playwright's actionability checks (visibility, stability, enabled state) and produces flaky tests that pass when a human would be blocked. Use \`evaluate\` for **reading** and **state setup**, and use locators for **acting**. For the proper interaction APIs, see the [Playwright best practices for 2026](/blog/playwright-best-practices-2026).

## page.exposeFunction: Calling Node From the Browser

\`evaluate\` sends a function **into** the browser once. \`page.exposeFunction(name, callback)\` does the inverse and persistent thing: it installs a global function on \`window\` that, whenever the page calls it, invokes your **Node-side** callback and returns the result back to the page. This is invaluable for letting page code trigger Node logic — computing a hash with a Node library, recording a value into your test, or stubbing a backend call. The exposed function survives navigations, so it is available on every page the context loads after exposure.

\`\`\`typescript
import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';

test('expose a Node function callable from the page', async ({ page }) => {
  // Install a global the browser can call; the body runs in Node
  await page.exposeFunction('sha256', (text: string) =>
    crypto.createHash('sha256').update(text).digest('hex'),
  );

  await page.goto('https://example.com');

  // The page calls window.sha256(...), which runs in Node and returns a Promise
  const digest = await page.evaluate(async () => {
    // @ts-expect-error injected at runtime
    return await window.sha256('playwright');
  });

  expect(digest).toHaveLength(64);
});
\`\`\`

Note that the exposed function is always **asynchronous** from the page's perspective — calling it returns a promise even if your Node callback is synchronous, because the call round-trips across the protocol. Use \`page.exposeBinding\` instead when you also need the source page or frame as context inside the callback; it passes a \`source\` object as the first parameter. A common real-world use is capturing browser-side events into your test: expose a function the page calls on every analytics event, and push those into an array your assertions inspect afterward.

## addScriptTag and addStyleTag: Injecting Code

Sometimes you need to inject a whole script or stylesheet rather than run a one-off function. \`page.addScriptTag()\` appends a \`<script>\` to the page — from a URL, a local file path, or inline content — and resolves once it has loaded and executed. This is how you inject a third-party library (for example, an accessibility checker like axe-core) or a polyfill into a page for the duration of a test. \`page.addStyleTag()\` is the styling equivalent, useful for hiding flaky animated elements before a visual snapshot.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('inject a script and a style into the page', async ({ page }) => {
  await page.goto('https://example.com');

  // Inject a library by URL (resolves after it loads and runs)
  await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/lodash@4/lodash.min.js' });

  const chunked = await page.evaluate(() => {
    // @ts-expect-error lodash injected above
    return window._.chunk([1, 2, 3, 4], 2);
  });
  expect(chunked).toEqual([[1, 2], [3, 4]]);

  // Inject CSS to freeze animations before a screenshot
  await page.addStyleTag({
    content: '*, *::before, *::after { animation: none !important; transition: none !important; }',
  });

  await expect(page).toHaveScreenshot('stable.png');
});
\`\`\`

| \`addScriptTag\` option | Type | Purpose |
|---|---|---|
| \`url\` | \`string\` | Load and execute a script from a URL |
| \`path\` | \`string\` | Inject a local file's contents (added with a sourcemap) |
| \`content\` | \`string\` | Inject raw inline JavaScript |
| \`type\` | \`string\` | Set the script type, e.g. \`'module'\` |

To run code **before any page script executes** on every navigation, use \`page.addInitScript()\` instead — it is the right tool for stubbing \`window\` APIs, fixing \`Math.random\`, or seeding globals before the app boots. \`addScriptTag\` runs after the page is already loaded, which is too late for those use cases.

## Security: You Are Executing Arbitrary Code

\`evaluate\` runs whatever function you give it with the page's full privileges. In your own tests against your own app this is fine. The danger appears when the **content of the evaluated code is derived from untrusted input** — for instance, building an \`evaluate\` string from user-supplied data, scraped page content, or an external API. Because the function executes in the page context, a malicious payload could read cookies, tokens, or DOM secrets and exfiltrate them. Treat \`evaluate\` input the way you would treat \`eval\` in production code.

Two concrete rules keep you safe. First, prefer passing **data as the serialized argument** rather than interpolating values into the function body — the argument is data, never executed as code, so injection is impossible through that channel. Second, never construct the evaluated function from a string assembled out of untrusted parts. The argument-passing form below is both safer and clearer than string building:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('pass untrusted data as an argument, never interpolate it into code', async ({ page }) => {
  await page.goto('https://example.com');

  const untrustedSearchTerm = "'; document.cookie; //"; // pretend this came from outside

  // SAFE: the term is data passed as an argument, never executed as code
  const matchCount = await page.evaluate(
    (term) => document.body.innerText.split(term).length - 1,
    untrustedSearchTerm,
  );

  expect(matchCount).toBeGreaterThanOrEqual(0);
});
\`\`\`

For broader coverage of testing code that handles untrusted input, the [security testing for AI-generated code](/blog/security-testing-ai-generated-code) article on the [QA Skills blog](/blog) goes deeper into injection-class risks.

## Common Gotchas

These trip up almost everyone at least once. Skim the list before debugging a confusing \`evaluate\` failure.

| Gotcha | Why it happens | Fix |
|---|---|---|
| Outer variable is \`undefined\` in the function | Closures do not cross the boundary | Pass it as the second argument |
| Returning a DOM node gives \`undefined\` | DOM nodes do not serialize by value | Return a handle (\`evaluateHandle\`) or finish work inside |
| Returning a class instance loses methods | Only data serializes; prototype is dropped | Return plain data, reconstruct in Node if needed |
| \`Map\`/\`Set\` comes back as \`{}\` or \`[]\` | They are not part of the serialization set | Convert to array/object before returning |
| Flaky clicks via \`el.click()\` in evaluate | Bypasses actionability checks | Use \`locator.click()\` instead |
| \`exposeFunction\` call seems synchronous but returns a Promise | The call round-trips to Node | Always \`await\` the exposed function |
| TypeScript complains about \`window.myGlobal\` | Injected globals are not typed | Add a \`// @ts-expect-error\` or augment the \`Window\` type |
| Circular reference throws on return | JSON-style serialization cannot encode cycles | Return a trimmed, acyclic shape |

A subtle TypeScript point worth its own note: inside the browser function you are in a DOM environment, so types like \`HTMLElement\`, \`Document\`, and \`getComputedStyle\` are available, but Node types (\`process\`, \`Buffer\`) are not valid there even though your editor might autocomplete them from the test file's scope. If the editor offers a Node global inside an \`evaluate\` body, that is a red flag that you are about to write code that fails at runtime.

## Frequently Asked Questions

### Why is my variable undefined inside page.evaluate?

Because the function body runs inside the browser, which has no access to your Node test variables — closures do not cross the process boundary. Any value the browser function needs must be passed explicitly as the second argument to \`evaluate\`, where Playwright serializes it and hands it to the function as a parameter. Reference the parameter, not the outer variable.

### What is the difference between evaluate and evaluateHandle?

\`page.evaluate()\` returns a serialized copy of the function's return value as a plain JS value in Node. \`page.evaluateHandle()\` returns a \`JSHandle\` or \`ElementHandle\` — a live reference to the in-browser object that is never copied to Node. Use \`evaluate\` when you want the data, and \`evaluateHandle\` when you want to keep operating on a browser-side object without serializing it.

### Can page.evaluate return a DOM element?

Not by value — returning a DOM node from \`evaluate\` yields \`undefined\` because nodes are not serializable. If you need a reference to the element, use \`page.evaluateHandle()\` to get an \`ElementHandle\`, or better, use a Playwright locator for any subsequent interaction. If you only need data about the element, return that data (text, attributes, computed styles) instead of the node.

### What values can be passed to and returned from evaluate?

JSON-compatible values plus a few extras Playwright preserves: \`undefined\`, \`NaN\`, \`Infinity\`, \`-0\`, \`BigInt\`, and \`Date\`. Plain objects and arrays serialize deeply. Functions, DOM nodes (by value), \`Map\`, \`Set\`, \`RegExp\`, class instances, and circular structures do not survive — functions and circular references throw, while the others come back stripped or as plain objects.

### How do I call Node code from inside the browser?

Use \`page.exposeFunction(name, callback)\` to install a global function on \`window\` whose body runs in Node. The page calls \`window.name(args)\`, the call round-trips across the protocol, your Node callback runs, and the result returns to the page. The exposed function is always asynchronous from the page's view, so always \`await\` it. Use \`exposeBinding\` if you also need the calling page or frame.

### Is page.evaluate a security risk?

It can be if the evaluated code is built from untrusted input, because it executes with the page's full privileges and could read cookies or tokens. Mitigate by passing untrusted values as serialized **arguments** (which are treated as data, never executed) rather than interpolating them into the function body, and never assemble the evaluated function from untrusted strings.

### When should I use addInitScript instead of addScriptTag?

Use \`page.addInitScript()\` when you need code to run **before any page script executes** on every navigation — for stubbing \`window\` APIs, freezing \`Math.random\`, or seeding globals before the app boots. \`page.addScriptTag()\` injects after the page has already loaded, which is correct for adding a library mid-test but too late to influence the app's own startup code.

### Should I use evaluate to click buttons or fill inputs?

No. Driving interactions through \`evaluate\` (calling \`el.click()\` or setting \`el.value\`) bypasses Playwright's actionability checks for visibility, stability, and enabled state, which produces flaky tests and false passes. Reserve \`evaluate\` for reading state and setting up data; use auto-waiting locators (\`locator.click()\`, \`locator.fill()\`) for every interaction.

## Conclusion

\`page.evaluate()\` is the escape hatch that lets your tests reach into the browser when the high-level API cannot express what you need — reading computed styles, scraping structured data, seeding storage, measuring timings, or injecting libraries. Master the two-world boundary, respect the serialization rules, pass data as arguments instead of relying on closures, return plain data rather than live objects, and reserve \`evaluate\` for reading and setup while leaving interactions to auto-waiting locators. With \`evaluateHandle\`, \`exposeFunction\`, \`addScriptTag\`, and \`addInitScript\` in your toolkit, almost no browser-side behavior is out of reach.

To have your AI coding agent generate \`evaluate\` code that follows these serialization and security rules automatically, install a Playwright skill from the [QA Skills directory](/skills). Continue learning with the [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide) and the rest of the [QA Skills blog](/blog).
`,
};
