---
name: Vitest Testing
description: Write fast unit and integration tests with Vitest — vitest.config.ts setup, vi.fn and vi.mock module mocking, fake timers, snapshots, V8 coverage with thresholds, workspaces for monorepos, and in-source testing.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [vitest, unit-testing, mocking, snapshots, coverage, vite, typescript, monorepo, watch-mode]
testingTypes: [unit, integration, mocking]
frameworks: [vitest, vite]
languages: [typescript, javascript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Vitest Testing

This skill makes an AI agent write and configure Vitest test suites: a correct `vitest.config.ts`, module mocking with `vi.mock` and the `vi.hoisted` escape hatch, spies and fake timers, inline snapshots, V8 coverage gates, and `projects` config for monorepos. Trigger it on any Vite-based project, any repo with `vitest` in `devDependencies`, or when migrating from Jest.

## Core Principles

1. **Vitest reuses your Vite config — do not duplicate resolution logic.** Aliases, plugins, and transforms from `vite.config.ts` apply to tests automatically. A separate Babel/transform setup is a Jest habit; drop it.
2. **`vi.mock` is hoisted; factory variables are not.** The mock factory runs before imports, so referencing top-level variables inside it throws. Use `vi.hoisted()` when the factory needs shared handles.
3. **Prefer `vi.fn` injected via parameters over `vi.mock` of whole modules.** Module mocking is a sledgehammer; dependency injection keeps tests honest and refactor-safe.
4. **Inline snapshots over file snapshots for small values.** `toMatchInlineSnapshot` puts the expectation in the test where reviewers see it; file snapshots get blindly `--update`d.
5. **Coverage thresholds live in config and fail the run.** A coverage report nobody gates on is wallpaper. Gate `lines`, `functions`, and `branches` — branch coverage is where the bugs hide.
6. **Use the default `node` environment unless you render DOM.** `jsdom`/`happy-dom` cost startup time per file; set them per-file with a docblock, not globally.

## Setup

```bash
npm install --save-dev vitest @vitest/coverage-v8
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false, // explicit imports; keeps files greppable and TS-clean
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    restoreMocks: true, // undo spy implementations between tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**'],
      exclude: ['src/**/*.test.ts', 'src/types/**', 'src/main.ts'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 75,
        statements: 85,
      },
    },
  },
});
```

```json
// package.json scripts
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

Watch mode is the default `vitest` command and only reruns tests affected by the changed module graph — keep it running while developing.

## Patterns

### vi.fn, Spies, and Dependency Injection

```typescript
// src/notifier.ts
export type SendEmail = (to: string, subject: string) => Promise<void>;

export async function notifyOnFailure(
  jobName: string,
  failures: number,
  sendEmail: SendEmail,
): Promise<boolean> {
  if (failures === 0) return false;
  await sendEmail('oncall@example.com', `${jobName} failed ${failures} times`);
  return true;
}
```

```typescript
// src/notifier.test.ts
import { describe, expect, it, vi } from 'vitest';
import { notifyOnFailure } from './notifier';

describe('notifyOnFailure', () => {
  it('emails oncall with the failure count in the subject', async () => {
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    const sent = await notifyOnFailure('nightly-sync', 3, sendEmail);

    expect(sent).toBe(true);
    expect(sendEmail).toHaveBeenCalledExactlyOnceWith(
      'oncall@example.com',
      'nightly-sync failed 3 times',
    );
  });

  it('stays silent when there are no failures', async () => {
    const sendEmail = vi.fn();
    await expect(notifyOnFailure('nightly-sync', 0, sendEmail)).resolves.toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
```

### vi.mock with vi.hoisted (the hoisting trap, solved)

```typescript
import { beforeEach, expect, it, vi } from 'vitest';
import { getInvoice } from './invoice-service';

// Factory is hoisted above imports — capture handles via vi.hoisted
const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock('./billing-client', () => ({
  fetchInvoice: fetchMock,
}));

beforeEach(() => {
  fetchMock.mockReset();
});

it('retries once on a 503 from the billing client', async () => {
  fetchMock
    .mockRejectedValueOnce(new Error('503 Service Unavailable'))
    .mockResolvedValueOnce({ id: 'inv_42', total: 1999 });

  const invoice = await getInvoice('inv_42');

  expect(invoice.total).toBe(1999);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
```

Partial mocks keep the rest of a module real:

```typescript
vi.mock('./config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./config')>();
  return { ...actual, isFeatureEnabled: vi.fn().mockReturnValue(true) };
});
```

### Fake Timers

```typescript
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { debounce } from './debounce';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('fires once after the trailing edge of 300ms', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 300);

  debounced();
  debounced();
  vi.advanceTimersByTime(299);
  expect(fn).not.toHaveBeenCalled();

  vi.advanceTimersByTime(1);
  expect(fn).toHaveBeenCalledTimes(1);
});
```

### Snapshots and Error Assertions

```typescript
import { expect, it } from 'vitest';
import { formatReport, parseDuration } from './report';

it('formats a compact summary line', () => {
  expect(formatReport({ passed: 12, failed: 1, skipped: 2 })).toMatchInlineSnapshot(
    `"12 passed | 1 failed | 2 skipped"`,
  );
});

it('throws a typed error on malformed durations', () => {
  expect(() => parseDuration('5parsecs')).toThrowErrorMatchingInlineSnapshot(
    `[RangeError: unknown duration unit "parsecs"]`,
  );
});
```

### Monorepo Projects and In-Source Tests

```typescript
// vitest.config.ts at the monorepo root
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'shared', root: './packages/shared', environment: 'node' } },
      { test: { name: 'web', root: './packages/web', environment: 'jsdom' } },
    ],
  },
});
```

```bash
vitest run --project shared   # one package
vitest run                    # everything, parallelized
```

In-source tests for small internal utilities (stripped from production builds by `define: { 'import.meta.vitest': 'undefined' }`):

```typescript
// src/slug.ts
export function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

if (import.meta.vitest) {
  const { expect, it } = import.meta.vitest;
  it('collapses punctuation runs into single hyphens', () => {
    expect(slugify('  Hello, World! ')).toBe('hello-world');
  });
}
```

## Best Practices

- Set `restoreMocks: true` globally instead of sprinkling `vi.restoreAllMocks()` in every `afterEach`.
- Use `vitest related src/pricing.ts` in pre-commit hooks to run only tests touching changed files.
- Assert promise rejections with `await expect(p).rejects.toThrow(...)` — a bare `expect(p).rejects` without await can pass before settlement.
- Pin the environment per file when only some tests need DOM: `// @vitest-environment jsdom` at the top of the file.
- Prefer `test.each` for input tables over copy-pasted tests; each row reports as its own case.
- When migrating from Jest: `vi` replaces `jest`, `vi.mock` factories must return the module shape explicitly (no automock), and `jest.requireActual` becomes `importOriginal`.

## Anti-Patterns

- **Referencing top-level variables inside a `vi.mock` factory.** Hoisting makes them `undefined` at factory time — the error message mentions hoisting, believe it. Use `vi.hoisted`.
- **`globals: true` plus missing TS types.** If you enable globals, add `"types": ["vitest/globals"]` to tsconfig, or imports break silently in editors.
- **Giant `.toMatchSnapshot()` on full API responses.** Hundred-line snapshots get rubber-stamp updated. Snapshot small, stable slices; assert dynamic fields with matchers.
- **`vi.mock` of the module under test.** You end up testing your own mock. Mock dependencies, never the subject.
- **Forgetting `vi.useRealTimers()` cleanup** — fake timers leak into later tests and hang anything that genuinely waits.
- **Re-implementing Vite aliases inside `test.alias`** when they already exist in `vite.config.ts`; drift between the two breaks resolution in tests only.

## When to Trigger This Skill

- The project is Vite-based or has `vitest` in `devDependencies`.
- The user asks to add unit tests, mock a module, fake timers, or snapshot output in a TS/JS repo without Jest.
- Setting up coverage gates or monorepo test projects with package-specific environments.
- Migrating a Jest suite to Vitest (jest → vi API mapping, mock factory differences).
- Tests fail with hoisting errors, environment mismatches, or leaking mocks — the classic Vitest misconfigurations.
