import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright await using: Automatic Cleanup of Browsers and Pages',
  description:
    'Reference guide to using await using and Symbol.asyncDispose in Playwright for automatic, deterministic cleanup of browsers, contexts, and pages.',
  date: '2026-06-18',
  category: 'Reference',
  content: `
# Playwright await using: Automatic Cleanup of Browsers and Pages

Every Playwright developer has shipped a leaked browser process at some point. You launch a browser, an assertion throws before the \`close()\` line, and now there is a zombie Chromium hanging around eating memory. The classic fix is \`try/finally\`, but it is verbose, easy to forget, and gets unwieldy once you have a browser, a context, and a page to tear down in the right order.

Modern Playwright (the 1.59 era) implements the JavaScript explicit resource management proposal, which means you can use the \`await using\` declaration to get automatic, deterministic cleanup. When a scope exits, for any reason including a thrown error, Playwright disposes your resources in reverse order. This reference explains exactly how it works, what TypeScript and Node configuration you need, how it interacts with the test runner's fixtures, and the gotchas around disposal ordering.

## What using and await using Actually Do

\`using\` and \`await using\` are variable declarations, like \`const\` and \`let\`, with one extra behavior: when the block they were declared in exits, the runtime automatically calls a disposal method on the value.

- \`using x = resource\` calls \`resource[Symbol.dispose]()\` synchronously when the scope ends.
- \`await using x = resource\` calls \`await resource[Symbol.asyncDispose]()\` asynchronously when the scope ends.

Because closing a browser is asynchronous, Playwright resources implement \`Symbol.asyncDispose\`, so you almost always reach for \`await using\` with Playwright.

\`\`\`typescript
import { chromium } from '@playwright/test';

async function main() {
  await using browser = await chromium.launch();
  await using context = await browser.newContext();
  await using page = await context.newPage();

  await page.goto('https://qaskills.sh');
  const title = await page.title();
  console.log(title);

  // No close() calls. When main() returns or throws,
  // page is disposed, then context, then browser.
}

await main();
\`\`\`

The scope that triggers disposal is the enclosing block: a function body, an \`if\`/\`for\`/\`while\` block, or a bare \`{ }\` block. The moment control leaves that block, disposal runs.

## Symbol.dispose vs Symbol.asyncDispose

The proposal defines two well-known symbols, and the difference is whether cleanup is synchronous or asynchronous.

\`\`\`typescript
// A synchronous disposable
const file = {
  handle: openSync('data.txt'),
  [Symbol.dispose]() {
    closeSync(this.handle);
  },
};

// An asynchronous disposable
const connection = {
  async [Symbol.asyncDispose]() {
    await this.drainAndClose();
  },
};
\`\`\`

You may only use \`using\` (synchronous) with objects that have \`Symbol.dispose\`, and you may only use \`await using\` (asynchronous) with objects that have \`Symbol.asyncDispose\`. Playwright's browser, context, and page objects all expose \`Symbol.asyncDispose\` because their underlying cleanup involves IPC with the browser process, which is inherently async.

| Symbol | Declaration | Cleanup timing | Playwright objects |
|---|---|---|---|
| \`Symbol.dispose\` | \`using\` | Synchronous | Not used (cleanup is async) |
| \`Symbol.asyncDispose\` | \`await using\` | Asynchronous, awaited | Browser, BrowserContext, Page |

If you try to use \`using\` (sync) with a Playwright object, TypeScript will error because the object does not implement \`Symbol.dispose\`. Always use \`await using\`.

## How Playwright Objects Implement Disposal

Under the hood, \`Browser\`, \`BrowserContext\`, and \`Page\` each define an async dispose method that maps to their existing close behavior.

\`\`\`typescript
// Conceptual shape of what Playwright implements internally
class Browser {
  async close(): Promise<void> {
    /* ... */
  }
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
\`\`\`

That means \`await using browser = await chromium.launch()\` is functionally equivalent to wrapping the rest of the scope in a \`try/finally\` that calls \`await browser.close()\`, except you do not have to write it, and it composes automatically with the other disposables in the same scope.

## Replacing Manual close() and try/finally

Here is the same logic written three ways so you can see exactly what \`await using\` saves you.

The old manual approach, error-prone because a missed \`finally\` leaks a process:

\`\`\`typescript
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
await page.goto('https://qaskills.sh');
await context.close();
await browser.close();
// If goto throws, nothing is closed. Leak.
\`\`\`

The correct but verbose \`try/finally\` approach:

\`\`\`typescript
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto('https://qaskills.sh');
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
}
\`\`\`

The \`await using\` approach, which is correct and concise:

\`\`\`typescript
await using browser = await chromium.launch();
await using context = await browser.newContext();
await using page = await context.newPage();
await page.goto('https://qaskills.sh');
\`\`\`

All three guarantee cleanup on error, but only the last one stays readable as the number of resources grows. This is also why AI agents benefit: an agent generating the first snippet leaks; an agent generating the third cannot.

## TypeScript Configuration Requirements

\`await using\` is a language feature with type definitions that ship in the standard library. To compile it, your \`tsconfig.json\` must include the disposable lib and target a compatible runtime.

\`\`\`json
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["es2022", "esnext.disposable", "dom"],
    "module": "nodenext",
    "moduleResolution": "nodenext"
  }
}
\`\`\`

The two essentials:

- **\`lib\` must include \`"esnext.disposable"\`.** This provides the \`Disposable\`, \`AsyncDisposable\`, and the \`Symbol.dispose\`/\`Symbol.asyncDispose\` type declarations. Without it, TypeScript does not know \`await using\` exists.
- **\`target\` of \`es2022\` or compatible.** If you target older output, the TypeScript compiler emits a downleveled implementation using helper functions, and you may need \`"downlevelIteration": true\` for the helper to iterate the disposable stack correctly.

When targeting older environments, TypeScript polyfills \`Symbol.dispose\` and \`Symbol.asyncDispose\` for you at compile time, so you do not have to assign them manually. If you see a runtime error about \`Symbol.asyncDispose\` being undefined, it usually means your output target is too low and the downlevel helper was not included, or \`downlevelIteration\` is off.

\`\`\`json
{
  "compilerOptions": {
    "target": "es2018",
    "downlevelIteration": true,
    "lib": ["es2018", "esnext.disposable"]
  }
}
\`\`\`

## Node.js Version Support

The disposal protocol relies on \`Symbol.asyncDispose\` and \`Symbol.dispose\` being present on the global \`Symbol\` at runtime. These well-known symbols were added to Node.js in the v20 release line and are stable in v22 and later, which is exactly the range the QASkills monorepo and most modern Playwright setups already require.

| Node.js version | Symbol.dispose / asyncDispose | await using runtime support |
|---|---|---|
| Node 18 | Not present natively | Needs polyfill / TS downlevel |
| Node 20 | Present | Supported |
| Node 22 (LTS) | Present | Supported, recommended |
| Node 24+ | Present | Supported |

If you must run on Node 18, TypeScript's downlevel output plus the polyfilled symbols will work, but the cleanest path is Node 20 or newer where the symbols exist natively and no polyfill is involved.

## Fixtures vs await using

Playwright Test already gives you automatic cleanup through fixtures, so when do you use \`await using\` and when do you rely on fixtures? The answer is about scope of ownership.

Use **fixtures** when the resource is part of your test's standard setup and the runner should own its lifecycle. The built-in \`page\`, \`context\`, and \`browser\` fixtures are torn down by the runner automatically; you should never call \`await using\` on the fixture-provided \`page\`.

\`\`\`typescript
import { test, expect } from '@playwright/test';

// The runner owns this page. Do NOT wrap it in await using.
test('checkout works', async ({ page }) => {
  await page.goto('https://qaskills.sh/checkout');
  await expect(page.getByRole('heading')).toBeVisible();
});
\`\`\`

Use **\`await using\`** when your test or helper creates an additional ad hoc resource that the fixture system does not manage, for example a second context for a different user, or a throwaway browser in a script outside the test runner entirely.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('two users see each other', async ({ browser, page }) => {
  // page is fixture-owned. The second context is ours, so we dispose it.
  await using secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();

  await page.goto('https://qaskills.sh/chat');
  await secondPage.goto('https://qaskills.sh/chat');
  // secondContext disposes automatically at end of test; page does not.
});
\`\`\`

The rule of thumb: if the runner handed it to you as a fixture argument, let the runner clean it up. If you created it with \`newContext()\`, \`newPage()\`, or \`launch()\` inside the test, manage it with \`await using\`.

## Gotchas: Disposal Order Is LIFO

The single most important behavior to internalize is that disposal runs in **last-in, first-out** order. The resource declared last is disposed first. This matches the natural dependency direction: a page lives inside a context, which lives inside a browser, so you tear down the page before the context before the browser.

\`\`\`typescript
await using browser = await chromium.launch(); // declared 1st, disposed 3rd
await using context = await browser.newContext(); // declared 2nd, disposed 2nd
await using page = await context.newPage(); // declared 3rd, disposed 1st
\`\`\`

If you declared them in the wrong order, you could try to dispose a browser before its page, which is why the LIFO guarantee matters. Always declare from outermost to innermost, exactly as you create them.

| Declaration order | Disposal order | Why it is correct |
|---|---|---|
| 1. browser | 3. browser | Browser is the root; close it last |
| 2. context | 2. context | Context depends on browser, lives inside it |
| 3. page | 1. page | Page depends on context; close it first |

Two further gotchas:

- **Disposal still runs on throw.** If \`page.goto()\` throws, the page, context, and browser are still disposed in LIFO order before the error propagates. That is the whole point.
- **Errors during disposal are aggregated.** If a disposal method itself throws while another error is already propagating, the runtime wraps them in a \`SuppressedError\` so you do not silently lose the original failure.

For broader context on how this fits the agent-driven testing direction, see our guide on [Playwright 1.59, the agentic release](/blog/playwright-1-59-agentic-release-features-guide), and the wider roundup of [what is new in Playwright across 2026](/blog/whats-new-in-playwright-2026).

## Why This Matters for AI-Authored Tests

The rise of \`await using\` lines up almost perfectly with the rise of AI coding agents writing tests, and the connection is not a coincidence. The single most common reliability bug in machine-generated automation is a forgotten cleanup path. An agent generates a script, the happy path works, and nobody notices that a thrown assertion leaves a browser process orphaned. Over a long-running agent loop that launches hundreds of browsers, those orphans accumulate until the runner host runs out of memory and the whole pipeline stalls.

\`await using\` removes the failure mode structurally. There is no \`finally\` block for the agent to forget, because cleanup is a property of the declaration rather than a statement the agent has to remember to write. When you prompt an agent to "launch a browser and check the title," the idiomatic, correct answer is now also the shortest one, which is exactly the kind of alignment you want between best practice and the path of least resistance.

\`\`\`typescript
// The shortest correct answer is also the safest one
await using browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
await page.goto('https://qaskills.sh');
console.log(await page.title());
\`\`\`

If you maintain prompt templates or skill files that instruct agents how to write Playwright code, updating them to prefer \`await using\` over manual \`close()\` is one of the highest-leverage reliability changes you can make.

## Performance and Behavior Notes

\`await using\` does not add measurable overhead compared to a hand-written \`try/finally\`; the runtime simply tracks the disposable stack and invokes the same async close method you would have called yourself. The cleanup is awaited, so the scope does not resolve until disposal completes, which means a function that returns a value still finishes its browser teardown before the caller continues.

One subtle point worth remembering: disposal happens when the lexical block exits, not when the variable is last used. If you have a long block with a lot of work after the last \`page\` operation, the page stays open until the block ends. If you want the page closed earlier, put it in a tighter inner block as shown in the complete example above. This is a feature, not a limitation, because it gives you explicit control over the cleanup boundary by choosing where you place the block braces.

## A Complete, Runnable Example

Putting it all together, here is a standalone script (outside the test runner) that uses \`await using\` end to end, including a nested block scope to show that disposal is tied to the block, not the whole function.

\`\`\`typescript
import { chromium } from '@playwright/test';

async function captureTitle(url: string): Promise<string> {
  await using browser = await chromium.launch();

  let title: string;
  {
    // Inner block: context and page dispose when this block ends,
    // before the browser is disposed at function exit.
    await using context = await browser.newContext();
    await using page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    title = await page.title();
  } // page disposed, then context disposed here

  return title;
} // browser disposed here

const title = await captureTitle('https://qaskills.sh');
console.log('Title:', title);
\`\`\`

This pattern is especially valuable in agent-authored automation and in scenarios like the parallelized runs described in our [Postman versus Playwright comparison](/blog/postman-vs-playwright), where leaked browsers across many short-lived workers add up fast.

## The DisposableStack Helper for Conditional Resources

Sometimes you create a resource conditionally, or you want to register cleanup for something that does not itself implement the disposal symbols. The proposal ships two helper classes, \`DisposableStack\` and \`AsyncDisposableStack\`, that let you collect cleanup callbacks and dispose them all at once in LIFO order. \`AsyncDisposableStack\` is the async variant you pair with \`await using\`.

\`\`\`typescript
import { chromium, type Browser } from '@playwright/test';

async function maybeLaunch(useSecondBrowser: boolean) {
  await using stack = new AsyncDisposableStack();

  const browser = await chromium.launch();
  stack.use(browser); // registers browser[Symbol.asyncDispose]

  let extra: Browser | undefined;
  if (useSecondBrowser) {
    extra = await chromium.launch();
    stack.use(extra);
  }

  // Register an arbitrary async cleanup callback too
  stack.defer(async () => {
    await flushMetrics();
  });

  const page = await browser.newContext().then((c) => c.newPage());
  await page.goto('https://qaskills.sh');

  // On scope exit: deferred callback runs, then extra disposes,
  // then browser disposes, all LIFO.
}
\`\`\`

\`AsyncDisposableStack\` is the right tool when the set of resources is not known at compile time, when you need to register a plain cleanup function via \`defer\`, or when you want to conditionally \`move\` ownership of resources out of a scope without disposing them. For the common fixed case of one browser, one context, one page, plain \`await using\` declarations are cleaner.

## Common Mistakes and How to Avoid Them

A few patterns trip people up when they first adopt \`await using\` with Playwright. Knowing them upfront saves a confusing debugging session.

The first mistake is disposing a fixture-provided object. The test runner already owns \`page\`, \`context\`, and \`browser\` fixtures, so wrapping them in \`await using\` causes a double-close.

\`\`\`typescript
import { test } from '@playwright/test';

test('wrong', async ({ page }) => {
  // BUG: page is fixture-owned; do not re-dispose it
  await using p = page; // double cleanup, avoid
  await p.goto('https://qaskills.sh');
});
\`\`\`

The second mistake is declaring resources in the wrong order, which can attempt to close a browser before its page. Always declare from outermost to innermost so LIFO disposal tears down the page first.

The third is forgetting the \`lib\` entry. If TypeScript reports that \`await using\` declarations are not allowed, the fix is almost always adding \`"esnext.disposable"\` to \`compilerOptions.lib\`, not changing your code.

| Mistake | Symptom | Fix |
|---|---|---|
| Disposing a fixture object | Double-close error at test end | Let the runner manage fixtures; do not wrap them |
| Wrong declaration order | Closing parent before child | Declare browser then context then page |
| Missing esnext.disposable lib | "await using not allowed" TS error | Add "esnext.disposable" to lib |
| Using sync \`using\` on a page | TS error: no Symbol.dispose | Use \`await using\` (async) instead |
| Target too low, no downlevelIteration | Runtime Symbol.asyncDispose undefined | Raise target or set downlevelIteration |

## Frequently Asked Questions

### What is await using in TypeScript and Playwright?

\`await using\` is a variable declaration from the JavaScript explicit resource management proposal. When the enclosing block exits, the runtime automatically calls \`await value[Symbol.asyncDispose]()\`. In Playwright, declaring \`await using browser = await chromium.launch()\` means the browser is closed automatically when the scope ends, even if an error is thrown, with no \`try/finally\` needed.

### What is the difference between using and await using?

\`using\` triggers synchronous cleanup via \`Symbol.dispose\` and is for resources whose teardown is synchronous. \`await using\` triggers asynchronous, awaited cleanup via \`Symbol.asyncDispose\`. Because closing a browser, context, or page is asynchronous, Playwright objects implement \`Symbol.asyncDispose\`, so you must use \`await using\` with them, not \`using\`.

### Do I still need to call browser.close() with await using?

No. When you declare \`await using browser = await chromium.launch()\`, Playwright's \`Symbol.asyncDispose\` implementation calls \`close()\` for you automatically when the scope exits. Calling \`close()\` manually as well is redundant and could attempt to close an already-disposed browser. Let the declaration handle it.

### What tsconfig settings are required for await using?

You need \`"esnext.disposable"\` in your \`lib\` array so TypeScript knows the disposable types, and a \`target\` of \`es2022\` or compatible. If you target an older output, also set \`"downlevelIteration": true\` so the compiler's downleveled disposal helper iterates the resource stack correctly.

### Which Node.js version do I need for await using to work?

Node.js 20 and later expose \`Symbol.dispose\` and \`Symbol.asyncDispose\` natively, so \`await using\` works without any polyfill. Node 22 LTS is the recommended baseline. On Node 18 the symbols are not native, so you rely on TypeScript's downlevel output and a polyfill, which is workable but not the cleanest path.

### In what order are resources disposed with await using?

Last-in, first-out. The resource declared last is disposed first. So if you declare browser, then context, then page, disposal runs page first, then context, then browser. This matches the dependency chain, since a page lives inside a context which lives inside a browser, so the innermost resource is always torn down first.

### Should I use await using or Playwright fixtures for cleanup?

Use fixtures for resources the test runner provides, such as the built-in \`page\`, \`context\`, and \`browser\` arguments; the runner cleans those up automatically and you should not wrap them in \`await using\`. Use \`await using\` for extra resources you create yourself inside a test or a standalone script, like a second context or a throwaway browser.

### What happens to await using cleanup if my test throws an error?

Cleanup still runs. Disposal is guaranteed when the scope exits for any reason, including a thrown error, and it runs in LIFO order before the error propagates. If a disposal method itself throws while another error is in flight, the runtime combines them into a \`SuppressedError\` so the original failure is not lost.

## Conclusion

\`await using\` is the cleanest way to manage Playwright browsers, contexts, and pages. It replaces fragile manual \`close()\` calls and verbose \`try/finally\` blocks with a single declaration that disposes resources deterministically in LIFO order, even when your code throws. Pair it with the right \`tsconfig\` lib, Node 20 or newer, and a clear sense of when fixtures versus \`await using\` own a resource, and you eliminate an entire category of leaked-process bugs.

Ready to put this into practice? Explore the [QASkills directory](/skills) for production-ready Playwright and AI-agent testing skills you can install into Claude Code, Cursor, and other coding agents to write cleaner, leak-free automation from the start.
`,
};
