import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest Mocking with vi.mock: The Complete 2026 Guide',
  description:
    'Master Vitest mocking: vi.fn, vi.spyOn, vi.mock module mocking, importActual partial mocks, fake timers, mocking fetch and axios, and vi.hoisted.',
  date: '2026-06-13',
  category: 'Guide',
  content: `
# Vitest Mocking with vi.mock: The Complete 2026 Guide

Mocking is the part of testing where most developers get stuck. The moment your code calls a database, hits an API, reads the clock, or imports another module with side effects, a plain unit test stops being possible until you can replace those dependencies with controllable fakes. Vitest, the test runner that has become the default for Vite, TypeScript, and modern JavaScript projects, ships a powerful and ergonomic mocking API under the global \`vi\` object. If you have used Jest, much of it will feel familiar, but Vitest's ESM-first design changes a few important rules around module mocking and hoisting that catch people out.

This guide is a complete tour of mocking in Vitest 2.x and 3.x. We start with the building blocks: \`vi.fn()\` for standalone mock functions and \`vi.spyOn()\` for wrapping real methods. Then we cover the return-value helpers (\`mockReturnValue\`, \`mockResolvedValue\`, \`mockImplementation\`), full and partial module mocking with \`vi.mock()\` and \`importActual\`, the hoisting behavior that makes \`vi.hoisted()\` necessary, mocking \`fetch\` and \`axios\` for network code, controlling time with \`vi.useFakeTimers()\`, and the cleanup discipline (\`clearAllMocks\`, \`resetAllMocks\`, \`restoreAllMocks\`) that keeps your suite from leaking state between tests. Every example is runnable TypeScript.

If you are weighing test runners, the [Jest vs Vitest comparison for 2026](/blog/jest-vs-vitest-2026) explains why teams are migrating, and you can browse ready-to-use testing patterns at [/skills](/skills) to drop these techniques into Claude Code, Cursor, or Copilot. Let us begin with the smallest unit of mocking: the mock function.

## vi.fn(): Standalone Mock Functions

A mock function created with \`vi.fn()\` records every call (arguments, return values, contexts) and lets you script its behavior. You use it anywhere you need a throwaway callback, an injected dependency, or an event handler you want to assert on.

\`\`\`typescript
import { describe, it, expect, vi } from 'vitest';

describe('vi.fn basics', () => {
  it('records calls and arguments', () => {
    const onClick = vi.fn();

    onClick('a', 1);
    onClick('b', 2);

    expect(onClick).toHaveBeenCalledTimes(2);
    expect(onClick).toHaveBeenCalledWith('a', 1);
    expect(onClick).toHaveBeenLastCalledWith('b', 2);
    // Inspect raw call records
    expect(onClick.mock.calls).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('can be given an implementation up front', () => {
    const add = vi.fn((a: number, b: number) => a + b);
    expect(add(2, 3)).toBe(5);
    expect(add).toHaveReturnedWith(5);
  });
});
\`\`\`

The \`.mock\` property is the source of truth: \`mock.calls\` is an array of argument arrays, \`mock.results\` holds return values or thrown errors, and \`mock.lastCall\` is a shortcut to the most recent arguments. Most of the time you will use the \`toHaveBeenCalled*\` matchers instead of poking at \`.mock\` directly, but knowing it is there helps when you debug a stubborn assertion.

## Scripting Return Values

A bare \`vi.fn()\` returns \`undefined\`. To make it useful you script what it returns using a family of chainable helpers. The most common are \`mockReturnValue\` for synchronous values and \`mockResolvedValue\` for promises, with \`Once\` variants for queueing a sequence of responses.

\`\`\`typescript
import { it, expect, vi } from 'vitest';

it('scripts synchronous and async return values', async () => {
  const getUser = vi.fn();

  // Default for every call
  getUser.mockReturnValue({ id: 0, name: 'default' });

  // Queue specific responses for the first calls, then fall back to default
  getUser
    .mockReturnValueOnce({ id: 1, name: 'Ada' })
    .mockReturnValueOnce({ id: 2, name: 'Linus' });

  expect(getUser()).toEqual({ id: 1, name: 'Ada' });
  expect(getUser()).toEqual({ id: 2, name: 'Linus' });
  expect(getUser()).toEqual({ id: 0, name: 'default' }); // back to default

  // Async helpers wrap the value in a resolved/rejected promise
  const fetchUser = vi.fn();
  fetchUser.mockResolvedValue({ ok: true });
  fetchUser.mockRejectedValueOnce(new Error('network down'));

  await expect(fetchUser()).rejects.toThrow('network down');
  await expect(fetchUser()).resolves.toEqual({ ok: true });
});
\`\`\`

Here is a reference for the return-value helpers and what they do.

| Helper | Effect |
|---|---|
| \`mockReturnValue(v)\` | Return \`v\` for every call |
| \`mockReturnValueOnce(v)\` | Return \`v\` for the next call only, then fall through |
| \`mockResolvedValue(v)\` | Return \`Promise.resolve(v)\` every call |
| \`mockResolvedValueOnce(v)\` | Resolve to \`v\` for the next call only |
| \`mockRejectedValue(e)\` | Return \`Promise.reject(e)\` every call |
| \`mockImplementation(fn)\` | Run \`fn\` as the body for every call |
| \`mockImplementationOnce(fn)\` | Run \`fn\` for the next call only |

When you need logic rather than a fixed value, reach for \`mockImplementation\`. It lets the mock branch on its arguments, which is invaluable for simulating an API that returns different data per id:

\`\`\`typescript
const db = vi.fn().mockImplementation((id: number) => {
  if (id === 404) throw new Error('not found');
  return { id, name: \`user-\${id}\` };
});

expect(db(7)).toEqual({ id: 7, name: 'user-7' });
expect(() => db(404)).toThrow('not found');
\`\`\`

Note the template literal \`user-\${id}\` above is real runtime code inside the mock implementation, exactly the kind of dynamic value you simulate with \`mockImplementation\`.

## vi.spyOn(): Wrapping Real Methods

Where \`vi.fn()\` creates a brand-new function, \`vi.spyOn()\` wraps an existing method on an object so you can observe or override it while keeping a handle to the original. This is the right tool when you want to assert that a real method was called, or temporarily change its behavior, without permanently replacing it.

\`\`\`typescript
import { it, expect, vi, afterEach } from 'vitest';

const analytics = {
  track(event: string, payload: Record<string, unknown>) {
    // real implementation that we do not want to run in tests
    return fetch('/track', { method: 'POST', body: JSON.stringify({ event, payload }) });
  },
};

afterEach(() => {
  vi.restoreAllMocks(); // restore original implementations
});

it('spies on a method and asserts the call', () => {
  const spy = vi.spyOn(analytics, 'track').mockResolvedValue(new Response());

  analytics.track('signup', { plan: 'pro' });

  expect(spy).toHaveBeenCalledWith('signup', { plan: 'pro' });
});

it('spies without replacing, to observe the real method', () => {
  const dateSpy = vi.spyOn(Date, 'now');
  const t = Date.now();
  expect(dateSpy).toHaveReturnedWith(t); // real value, just observed
});
\`\`\`

A spy without a chained \`.mockImplementation\` or \`.mockReturnValue\` still calls the original method, it just records the calls. Chain a behavior override when you want to stop the real method from running. Always pair \`vi.spyOn\` with \`vi.restoreAllMocks()\` in an \`afterEach\` so the original method is put back. Here is the practical distinction.

| | \`vi.fn()\` | \`vi.spyOn(obj, 'method')\` |
|---|---|---|
| Creates | A new standalone function | A wrapper around an existing method |
| Calls original by default | No (there is none) | Yes, until you override |
| Use when | Injecting a dependency or callback | Observing/overriding a real method |
| Cleanup | \`mockReset\`/\`mockClear\` | \`vi.restoreAllMocks()\` to put original back |

## vi.mock(): Mocking Entire Modules

The headline feature is \`vi.mock()\`, which replaces an entire imported module with a mock. This is how you isolate the unit under test from its collaborators: a service module, an SDK, a database client. Vitest **hoists** every \`vi.mock()\` call to the top of the file before any imports run, which is the single most important thing to understand about it.

\`\`\`typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrder } from './order-service';
import { chargeCard } from './payment-gateway';

// This call is hoisted above the imports above it. The factory replaces the
// real payment-gateway module everywhere order-service imports it.
vi.mock('./payment-gateway', () => ({
  chargeCard: vi.fn(),
}));

describe('createOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('charges the card and returns a confirmed order', async () => {
    vi.mocked(chargeCard).mockResolvedValue({ id: 'ch_123', status: 'paid' });

    const order = await createOrder({ amount: 4200, token: 'tok_visa' });

    expect(chargeCard).toHaveBeenCalledWith(4200, 'tok_visa');
    expect(order.status).toBe('confirmed');
  });

  it('marks the order failed when the charge rejects', async () => {
    vi.mocked(chargeCard).mockRejectedValue(new Error('card declined'));

    const order = await createOrder({ amount: 4200, token: 'tok_chargeDeclined' });

    expect(order.status).toBe('failed');
  });
});
\`\`\`

Two helpers make this ergonomic. \`vi.mocked(fn)\` is a TypeScript-only cast that tells the compiler the imported function is a mock, so you get \`mockResolvedValue\` autocompletion without an \`as any\`. And calling \`vi.mock()\` with no factory (just \`vi.mock('./payment-gateway')\`) auto-mocks the module, replacing every exported function with a \`vi.fn()\` automatically, which is handy when you do not care about the implementation at all.

## The Hoisting Problem and vi.hoisted()

Because \`vi.mock()\` is hoisted above your imports, the mock factory runs **before** any module-level variables are defined. This means you cannot reference a normal top-level variable inside the factory, you will get a "Cannot access before initialization" error. The fix is \`vi.hoisted()\`, which lets you define mock values that are themselves hoisted alongside the \`vi.mock\` call.

\`\`\`typescript
import { it, expect, vi } from 'vitest';
import { getConfig } from './config-reader';

// WRONG: mockFn is not yet initialized when the hoisted factory runs.
// const mockFn = vi.fn();
// vi.mock('./config-reader', () => ({ getConfig: mockFn }));

// RIGHT: hoist the mock alongside the factory.
const { mockGetConfig } = vi.hoisted(() => ({
  mockGetConfig: vi.fn(),
}));

vi.mock('./config-reader', () => ({
  getConfig: mockGetConfig,
}));

it('uses the hoisted mock', () => {
  mockGetConfig.mockReturnValue({ env: 'test' });
  expect(getConfig().env).toBe('test');
});
\`\`\`

The rule of thumb: any variable you want to reference inside a \`vi.mock\` factory must be created inside \`vi.hoisted()\`. The object \`vi.hoisted()\` returns is available both in the factory and in your test bodies, giving you a single shared handle to the mock.

## Partial Mocks with importActual

Often you want to mock just one export of a module and keep the rest real. Replacing the whole module with a factory loses the genuine exports, so Vitest gives you \`vi.importActual()\` to pull in the real module and spread it, overriding only what you need.

\`\`\`typescript
import { it, expect, vi } from 'vitest';
import { formatPrice, getExchangeRate } from './currency';

vi.mock('./currency', async (importOriginal) => {
  // Pull in everything real from the module
  const actual = await importOriginal<typeof import('./currency')>();
  return {
    ...actual,
    // Override only the network-bound function
    getExchangeRate: vi.fn().mockResolvedValue(1.1),
  };
});

it('keeps formatPrice real but stubs the network call', async () => {
  const rate = await getExchangeRate('USD', 'EUR');
  expect(rate).toBe(1.1);
  // formatPrice is the genuine implementation
  expect(formatPrice(1000, 'USD')).toBe('$10.00');
});
\`\`\`

The factory receives an \`importOriginal\` helper, which is the modern equivalent of calling \`vi.importActual\` directly. Type it with \`<typeof import('./currency')>\` so the spread is fully typed. Partial mocks are the cleanest way to neutralize a single side-effecting export, such as a logger or a network call, while leaving pure helpers untouched.

## Mocking fetch

Network calls are the most common thing teams need to mock. The global \`fetch\` is just a function on \`globalThis\`, so you can stub it with \`vi.spyOn\` or replace it with \`vi.stubGlobal\`. The cleanest approach in 2026 is \`vi.stubGlobal\`, which Vitest can auto-restore via the \`unstubGlobals\` config option.

\`\`\`typescript
import { it, expect, vi, afterEach } from 'vitest';
import { fetchUser } from './api-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

it('mocks a successful fetch response', async () => {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ id: 1, name: 'Grace' }),
  });
  vi.stubGlobal('fetch', mockFetch);

  const user = await fetchUser(1);

  expect(mockFetch).toHaveBeenCalledWith('/api/users/1');
  expect(user).toEqual({ id: 1, name: 'Grace' });
});

it('handles a non-ok response', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
  );

  await expect(fetchUser(1)).rejects.toThrow('Request failed: 500');
});
\`\`\`

Because \`fetch\` returns a \`Response\`-like object, your mock must supply whatever properties the code reads: \`ok\`, \`status\`, and a \`json()\` (or \`text()\`) method that returns a promise. Supplying only what the code under test consumes keeps the mock small.

## Mocking axios

If you use axios instead of \`fetch\`, mock the module rather than a global. \`vi.mock('axios')\` auto-mocks the default export. The wrinkle is that axios is usually called as \`axios.get(...)\` or via an instance, so you mock the method you actually use.

\`\`\`typescript
import { it, expect, vi } from 'vitest';
import axios from 'axios';
import { getRepos } from './github';

vi.mock('axios');

it('mocks axios.get', async () => {
  vi.mocked(axios.get).mockResolvedValue({
    data: [{ name: 'vitest' }, { name: 'vite' }],
    status: 200,
  });

  const repos = await getRepos('vitest-dev');

  expect(axios.get).toHaveBeenCalledWith('https://api.github.com/users/vitest-dev/repos');
  expect(repos).toHaveLength(2);
});
\`\`\`

If your code creates an instance with \`axios.create()\`, mock the factory to return an object whose methods are mock functions, then assert against those. For end-to-end network assertions across a real server, an integration test or a tool like Playwright is more appropriate than module mocks, as discussed in the [Cypress vs Playwright comparison](/blog/cypress-vs-playwright-2026).

## Mocking Timers with vi.useFakeTimers()

Code that uses \`setTimeout\`, \`setInterval\`, or \`Date.now()\` is hard to test against a real clock because you do not want tests to actually wait. \`vi.useFakeTimers()\` replaces the timer functions with controllable fakes, and \`vi.advanceTimersByTime()\` lets you fast-forward.

\`\`\`typescript
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from './debounce';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('only fires the debounced function once after the delay', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 200);

  debounced();
  debounced();
  debounced();

  expect(fn).not.toHaveBeenCalled(); // nothing has fired yet

  vi.advanceTimersByTime(200); // fast-forward 200ms

  expect(fn).toHaveBeenCalledTimes(1);
});

it('controls the system clock with setSystemTime', () => {
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  expect(Date.now()).toBe(new Date('2026-01-01T00:00:00Z').getTime());
});
\`\`\`

Useful companions: \`vi.advanceTimersToNextTimer()\` jumps to the next scheduled timer, \`vi.runAllTimers()\` flushes everything pending, and \`vi.setSystemTime()\` pins \`Date\` to a fixed moment so date-dependent code is deterministic. Always pair \`useFakeTimers()\` with \`useRealTimers()\` in cleanup or other tests will mysteriously hang.

## Cleaning Up Mocks Between Tests

Mocks accumulate state, the calls they recorded, the implementations you scripted. If you do not reset them, a mock from one test leaks into the next and assertions become order-dependent and flaky. Vitest gives you three cleanup verbs with different scopes, and a config flag to run them automatically.

\`\`\`typescript
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.clearAllMocks(); // wipe call history, keep implementations
  // vi.resetAllMocks();   // wipe call history AND implementations
  // vi.restoreAllMocks(); // like reset, but also restore spied originals
});
\`\`\`

Or set it once in \`vitest.config.ts\` so every test starts clean:

\`\`\`typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    clearMocks: true, // calls vi.clearAllMocks() before each test
    restoreMocks: true, // restores vi.spyOn originals before each test
  },
});
\`\`\`

Here is exactly what each verb does so you pick the right one.

| Method | Clears call history | Resets implementation | Restores spied original |
|---|---|---|---|
| \`mockClear\` / \`clearAllMocks\` | Yes | No | No |
| \`mockReset\` / \`resetAllMocks\` | Yes | Yes (to bare \`vi.fn()\`) | No |
| \`mockRestore\` / \`restoreAllMocks\` | Yes | Yes | Yes |

The safe default for most suites is \`clearMocks: true\` plus \`restoreMocks: true\` in config, which clears history between tests and puts every \`vi.spyOn\` original back. Reach for explicit \`resetAllMocks\` only when you deliberately want to drop scripted implementations mid-suite.

## Frequently Asked Questions

### What is the difference between vi.fn and vi.spyOn in Vitest?

\`vi.fn()\` creates a brand-new mock function with no original behavior, used for injected dependencies and callbacks. \`vi.spyOn(obj, 'method')\` wraps an existing method on an object so you can observe its calls and optionally override it while keeping a reference to the real implementation. A spy calls the original by default; a \`vi.fn()\` has nothing to call. Restore spies with \`vi.restoreAllMocks()\`.

### How do I mock a module with vi.mock in Vitest?

Call \`vi.mock('./path', () => ({ exportName: vi.fn() }))\` at the top level of your test file. Vitest hoists it above all imports, so the mock factory replaces the real module everywhere it is imported. Use \`vi.mocked(importedFn)\` to get typed access to mock methods like \`mockResolvedValue\`. Omitting the factory auto-mocks every export with \`vi.fn()\` automatically.

### Why do I get "cannot access before initialization" with vi.mock?

Because \`vi.mock()\` is hoisted above your imports and module-level variables, any variable referenced inside the factory does not exist yet when it runs. Fix it by creating those variables inside \`vi.hoisted(() => ({ mockFn: vi.fn() }))\`, which hoists them alongside the mock. The returned object is shared between the factory and your test bodies, giving you one handle to the mock.

### How do I mock fetch in Vitest?

Replace the global with \`vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => data }))\`. Your mock must return a \`Response\`-like object exposing whatever the code reads, typically \`ok\`, \`status\`, and a \`json()\` method returning a promise. Call \`vi.unstubAllGlobals()\` in \`afterEach\`, or set \`unstubGlobals: true\` in config, so the real \`fetch\` is restored between tests.

### How do I create a partial mock in Vitest?

Pass an async factory that calls the supplied \`importOriginal\` helper: \`vi.mock('./mod', async (importOriginal) => ({ ...(await importOriginal()), oneExport: vi.fn() }))\`. Spreading the real module keeps every export genuine while you override just the side-effecting one. Type the import with \`importOriginal<typeof import('./mod')>()\` so the spread is fully typed. This is the clean way to stub a single function like a logger or network call.

### How do I test setTimeout and debounce with Vitest?

Call \`vi.useFakeTimers()\` in \`beforeEach\` to replace the real timers, then drive the clock with \`vi.advanceTimersByTime(ms)\`, \`vi.runAllTimers()\`, or \`vi.advanceTimersToNextTimer()\`. Assert before and after advancing to prove the timing. Use \`vi.setSystemTime(date)\` to pin \`Date\` for deterministic date logic, and always call \`vi.useRealTimers()\` in \`afterEach\` or other tests may hang.

### What is the difference between clearAllMocks, resetAllMocks, and restoreAllMocks?

\`clearAllMocks\` wipes recorded call history but keeps scripted implementations. \`resetAllMocks\` also resets implementations back to a bare \`vi.fn()\`. \`restoreAllMocks\` does both and additionally restores the original methods that \`vi.spyOn\` wrapped. For most suites, set \`clearMocks: true\` and \`restoreMocks: true\` in \`vitest.config.ts\` so tests start clean automatically without manual cleanup.

## Conclusion

Vitest's mocking API is small but deep, and once the mental model clicks it becomes one of the most pleasant parts of writing tests. Start with the primitives: \`vi.fn()\` for standalone mocks and \`vi.spyOn()\` for wrapping real methods, scripting their behavior with \`mockReturnValue\`, \`mockResolvedValue\`, and \`mockImplementation\`. Move up to module replacement with \`vi.mock()\`, remembering that it hoists above your imports, which is exactly why \`vi.hoisted()\` exists for any variable the factory needs. Keep the rest of a module real with \`importOriginal\` partial mocks, neutralize the network by stubbing \`fetch\` or auto-mocking \`axios\`, and make time deterministic with \`vi.useFakeTimers()\` and \`vi.setSystemTime()\`.

The discipline that ties it all together is cleanup. Mocks carry state, and the difference between a reliable suite and a flaky one is often just a \`clearMocks: true\` line in your config. Set \`clearMocks\` and \`restoreMocks\` once, lean on \`vi.mocked()\` for type safety, and your tests stay isolated and readable as they grow. From here, see how Vitest stacks up against the incumbent in the [Jest vs Vitest 2026 comparison](/blog/jest-vs-vitest-2026), explore browser-level testing in the [Cypress vs Playwright guide](/blog/cypress-vs-playwright-2026), and browse the full catalog of testing skills at [/skills](/skills) to wire these patterns directly into your AI coding agent.
`,
};
