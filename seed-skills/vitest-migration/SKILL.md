---
name: Vitest Migration & Config
description: Teaches the agent to migrate a Jest suite to Vitest — vi.mock and the globals shim, vitest.config workspaces/projects, coverage, browser mode, and Vitest v4 breaking changes.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [vitest, migration, jest, vi-mock, config, coverage, browser-mode, projects]
testingTypes: [unit, integration]
frameworks: [vitest, jest]
languages: [typescript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Vitest Migration & Config

This skill makes the agent migrate a Jest test suite to Vitest correctly and configure Vitest from scratch. Vitest is mostly Jest-compatible, but the differences bite: the `vi` namespace replaces `jest`, `vi.mock` hoisting needs `vi.hoisted`, ESM is first-class, and Vitest v4 removed `workspace` files in favor of inline `projects`. The agent should produce a config that runs fast, types cleanly, and reports coverage.

Use this skill when migrating from Jest, setting up `vitest.config.ts`, splitting unit vs browser tests, or resolving v4 upgrade breakage.

## Core Principles

1. **`vi` replaces `jest`.** `jest.fn` -> `vi.fn`, `jest.mock` -> `vi.mock`, `jest.spyOn` -> `vi.spyOn`, `jest.useFakeTimers` -> `vi.useFakeTimers`. The assertion API (`expect`, matchers) is unchanged.
2. **Mocks must reset explicitly.** Set `test.clearMocks`/`restoreMocks` in config or call `vi.clearAllMocks()` in `beforeEach` — Vitest does not reset by default.
3. **`vi.mock` is hoisted; use `vi.hoisted` for shared values.** Variables the factory needs must be created via `vi.hoisted(() => ...)`, since the factory runs before imports.
4. **Decide on globals up front.** Either enable `globals: true` (Jest-like, no imports) or import `{ describe, it, expect, vi }` from `vitest`. Pick one and add `types: ['vitest/globals']` if using globals.
5. **v4 uses `projects`, not `workspace`.** The standalone `vitest.workspace.ts` file is removed; declare multiple environments via the inline `projects` array.
6. **Browser mode replaces jsdom for real-DOM tests.** Use `browser.instances` (v4) to run component tests in a real browser engine via Playwright.

## Workflow / Patterns

### Pattern 1 — Mechanical Jest -> Vitest swap

Most test bodies migrate with a namespace rename. With `globals: true`, even the imports can stay as-is.

```typescript
// Before (Jest):
//   const fn = jest.fn();
//   jest.spyOn(obj, 'method');
//   jest.useFakeTimers();

// After (Vitest) — explicit imports (recommended, ESM-safe):
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('cart', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds an item', () => {
    const onChange = vi.fn();
    const cart = createCart(onChange);
    cart.add({ sku: 'A1', qty: 2 });

    expect(cart.total).toBe(2);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sku: 'A1' }));
  });
});
```

### Pattern 2 — `vi.mock` with `vi.hoisted` (the hoisting fix)

In Jest you prefix variables with `mock`. In Vitest, wrap them in `vi.hoisted` so they exist when the hoisted factory runs.

```typescript
import { vi, test, expect, beforeEach } from 'vitest';
import { getUser } from './user-service';
import axios from 'axios';

// Create the spy in a hoisted block so the factory below can reference it.
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('axios', () => ({
  default: { get: mockGet }, // note: ESM default export shape
}));

beforeEach(() => vi.clearAllMocks());

test('resolves user from API', async () => {
  mockGet.mockResolvedValue({ data: { id: 1, name: 'Ada' } });

  const user = await getUser(1);

  expect(user).toEqual({ id: 1, name: 'Ada' });
  expect(axios.get).toHaveBeenCalledWith('/api/users/1');
});
```

### Pattern 3 — Partial mock with `importActual`

The Vitest equivalent of `jest.requireActual`. The factory is async.

```typescript
vi.mock('./config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./config')>();
  return {
    ...actual,
    isProduction: vi.fn(() => false), // override one export, keep the rest real
  };
});
```

### Pattern 4 — A complete `vitest.config.ts`

Covers globals, environment, setup files, and coverage. This replaces `jest.config.js`.

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Jest-like; otherwise import from 'vitest'
    environment: 'node', // 'jsdom' for component DOM tests
    setupFiles: ['./test/setup.ts'],
    clearMocks: true, // reset vi.fn() call data before each test
    restoreMocks: true, // restore spies to original impl
    coverage: {
      provider: 'v8', // fast, no instrumentation step
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/index.ts'],
      thresholds: { lines: 80, functions: 80, branches: 75 },
    },
  },
});
```

If using `globals: true`, add to `tsconfig.json`:

```json
{ "compilerOptions": { "types": ["vitest/globals"] } }
```

### Pattern 5 — Multiple environments via `projects` (v4)

The v4 replacement for `vitest.workspace.ts`. Run Node unit tests and jsdom component tests in one command, each with its own config.

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: { provider: 'v8' },
    projects: [
      {
        // Fast pure-logic tests in Node.
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.unit.test.ts'],
        },
      },
      {
        // DOM/component tests in jsdom.
        test: {
          name: 'dom',
          environment: 'jsdom',
          setupFiles: ['./test/dom-setup.ts'],
          include: ['src/**/*.dom.test.ts'],
        },
      },
    ],
  },
});
```

### Pattern 6 — Browser mode (real engine, v4 `instances`)

For component tests that need a real browser. v4 replaced the singular `browser.name` with a `browser.instances` array.

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox' },
      ],
    },
  },
});
```

```typescript
// component.browser.test.ts — runs in a real browser
import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { Counter } from './Counter';

test('increments in a real browser', async () => {
  const screen = render(<Counter />);
  await screen.getByRole('button', { name: 'Increment' }).click();
  await expect.element(screen.getByText('Count: 1')).toBeVisible();
});
```

### Pattern 7 — package.json scripts and the runner

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "coverage": "vitest run --coverage"
  }
}
```

## Best Practices

1. **Choose globals vs imports once** and apply it suite-wide. If `globals: true`, add `types: ['vitest/globals']` so TypeScript knows `expect`/`vi`.
2. **Set `clearMocks` and `restoreMocks` in config** — Vitest does not auto-reset, so omitting them recreates Jest's "leaky mock" bug.
3. **Use `vi.hoisted` for any value a `vi.mock` factory references.** This is the single most common migration failure.
4. **Mock ESM default exports as `{ default: ... }`** in the factory — the shape differs from Jest's CJS interop.
5. **Use the `v8` coverage provider** for speed; reserve `istanbul` only if you need its specific report nuances.
6. **Split slow DOM/browser tests into a separate `project`** so the fast Node unit tests give quick feedback.
7. **On v4 upgrade, replace `vitest.workspace.ts` with inline `projects`** and convert `browser.name` to `browser.instances`.

## Anti-Patterns

1. **Search-replacing `jest` -> `vi` and assuming you're done.** Mock hoisting and ESM default shapes still need `vi.hoisted` and `{ default }`.
2. **Forgetting mocks reset** because Vitest, unlike a default Jest setup, won't clear them for you.
3. **Referencing an outer variable in `vi.mock` without `vi.hoisted`.** It is `undefined` when the hoisted factory executes.
4. **Keeping `vitest.workspace.ts` on v4.** It is removed; the suite silently ignores it or errors. Use `projects`.
5. **Enabling `globals: true` but not adding `vitest/globals` types**, producing a flood of "cannot find name 'expect'" TS errors.
6. **Running everything in jsdom** when most tests are pure logic — jsdom is slower and unnecessary. Default to `node`.
7. **Mixing `@jest/globals` imports into Vitest files** — import from `vitest` instead.

## When to Trigger This Skill

- "Migrate my Jest tests to Vitest"
- "Set up `vitest.config.ts`" / "configure Vitest coverage"
- "`vi.mock` isn't working / variable is undefined in the factory"
- "How do I mock a default ESM export in Vitest?"
- "Run component tests in a real browser with Vitest"
- "Vitest v4 broke my `workspace` / `browser.name` config"
- "Split unit and DOM tests into projects"
- "Jest `requireActual` equivalent in Vitest"
