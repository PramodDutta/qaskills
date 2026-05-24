import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest to Vitest Migration Guide for 2026',
  description:
    'Migrate a Jest test suite to Vitest in 2026. Config translation, mock API mapping, ESM and TS support, jsdom setup, watch mode, and a battle-tested checklist.',
  date: '2026-05-08',
  category: 'Migration',
  content: `
# Jest to Vitest Migration Guide for 2026

Vitest reached version 2 in 2024 and version 3 in 2025. By 2026 it is the default test runner for Vite-powered projects (which is to say, the majority of new React, Vue, Svelte, and SolidJS projects) and a popular choice for libraries shipping native ESM. Jest, the long-time incumbent, still has the largest install base and an enormous ecosystem, but the speed gap, ESM ergonomics, and config simplicity push more teams toward Vitest every quarter.

This guide is the migration playbook for teams running a real Jest suite that want to move to Vitest. It covers the config translation, mock API mapping, TypeScript and ESM setup, jsdom vs happy-dom, watch mode parity, coverage, and the gotchas that bite teams in week one. By the end you will have a checklist, a working config, and enough code to migrate your first 20 specs the same day.

For broader testing references, browse [the blog index](/blog). For JavaScript testing skills you can install into Claude Code, see the [QA Skills directory](/skills).

## Why migrate from Jest to Vitest

Speed is the most visible reason. Vitest runs the same suite anywhere from 2x to 10x faster on cold start, primarily because it uses Vite's ESM-native transformer instead of Jest's Babel pipeline. The hot-reload watch mode is similarly snappier.

The second reason is ESM support. Native ESM in Node has been stable for years, but Jest's ESM support remained experimental into 2025 and required \`--experimental-vm-modules\` and various workarounds. Vitest treats ESM as the default. The third reason is config simplicity. Vitest reuses your \`vite.config.ts\`, so a project that already builds with Vite needs at most ten lines of test config to get started. The fourth is TypeScript: Vitest type-checks tests inline (via tsc references) and supports \`type-test\` features for testing TypeScript types themselves.

## Conceptual model: mostly the same

Vitest is Jest-compatible by design. \`describe\`, \`it\`, \`test\`, \`expect\`, \`beforeEach\`, \`afterEach\`, \`beforeAll\`, \`afterAll\` all work identically. \`jest.fn\` becomes \`vi.fn\`. \`jest.mock\` becomes \`vi.mock\`. The bulk of a Jest test file requires zero changes beyond a single import.

The differences are in the corners: timer mocks, module mocking semantics, snapshot serializer registration, and a few edge cases around resetting mocks between tests. These are documented below.

## API mapping table: Jest to Vitest

| Jest | Vitest | Notes |
|---|---|---|
| \`jest.fn()\` | \`vi.fn()\` | Identical |
| \`jest.mock('mod')\` | \`vi.mock('mod')\` | Hoisted in both |
| \`jest.spyOn(obj, 'method')\` | \`vi.spyOn(obj, 'method')\` | Identical |
| \`jest.useFakeTimers()\` | \`vi.useFakeTimers()\` | Identical |
| \`jest.advanceTimersByTime(ms)\` | \`vi.advanceTimersByTime(ms)\` | Identical |
| \`jest.resetAllMocks()\` | \`vi.resetAllMocks()\` | Identical |
| \`jest.requireActual('mod')\` | \`await vi.importActual('mod')\` | Async in Vitest |
| \`jest.requireMock('mod')\` | \`await vi.importMock('mod')\` | Async in Vitest |
| \`jest.setTimeout(ms)\` | \`vi.setConfig({ testTimeout: ms })\` | Or per-test \`{ timeout: ms }\` |
| \`jest.unstable_mockModule\` | \`vi.mock\` with factory | Cleaner in Vitest |
| Snapshot file format | Compatible | Run once to regenerate |
| Coverage reporter | Built-in (v8 by default) | Faster than Jest's istanbul |

## Step-by-step migration plan

1. **Day 1** - Install \`vitest\`, \`@vitest/coverage-v8\`, \`@vitest/ui\`, and \`jsdom\`. Add a minimal \`vitest.config.ts\`.
2. **Day 2** - Run \`npx vitest run\` and watch what fails. Most failures are import errors.
3. **Days 3 to 5** - Replace \`jest.\` calls with \`vi.\` across the suite. A scripted find-and-replace handles 95%.
4. **Days 6 to 7** - Fix mock hoisting issues. Vitest hoists \`vi.mock\` calls; some Jest patterns rely on order.
5. **Day 8** - Regenerate snapshots.
6. **Day 9** - Wire CI; remove Jest from package.json.
7. **Day 10** - Train the team on the Vitest UI and watch mode.

## Before and after: a real test

**Jest (before)**

\`\`\`typescript
import { fetchUsers } from './users';

jest.mock('./api', () => ({
  getUsers: jest.fn().mockResolvedValue([{ id: 1, name: 'A' }]),
}));

describe('fetchUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the user list', async () => {
    const users = await fetchUsers();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe('A');
  });
});
\`\`\`

**Vitest (after)**

\`\`\`typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchUsers } from './users';

vi.mock('./api', () => ({
  getUsers: vi.fn().mockResolvedValue([{ id: 1, name: 'A' }]),
}));

describe('fetchUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the user list', async () => {
    const users = await fetchUsers();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe('A');
  });
});
\`\`\`

The only diff is the import statement at the top and replacing \`jest\` with \`vi\`. The rest of the test is identical.

## Config translation

| Jest \`jest.config.js\` | Vitest \`vitest.config.ts\` |
|---|---|
| \`testEnvironment: 'jsdom'\` | \`test.environment: 'jsdom'\` |
| \`setupFiles\` | \`test.setupFiles\` |
| \`setupFilesAfterEach\` | \`test.setupFiles\` |
| \`moduleNameMapper\` | \`resolve.alias\` |
| \`transform\` | Not needed (Vite handles it) |
| \`testMatch\` | \`test.include\` |
| \`testPathIgnorePatterns\` | \`test.exclude\` |
| \`collectCoverageFrom\` | \`test.coverage.include\` |
| \`coverageReporters\` | \`test.coverage.reporter\` |
| \`globals: true\` | \`test.globals: true\` |
| \`watchAll\` | Default behavior |

A minimal \`vitest.config.ts\`:

\`\`\`typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
    },
  },
});
\`\`\`

If you do not want global \`describe\`/\`it\`/\`expect\` (recommended for explicit imports), set \`globals: false\` and import them per file.

## jsdom vs happy-dom

Vitest supports \`jsdom\` (the same DOM Jest uses) and \`happy-dom\` (a lighter, faster DOM implementation). For most React component tests, happy-dom is significantly faster and behaves identically. For projects that need specific jsdom features, stay on jsdom.

\`\`\`typescript
test: {
  environment: 'happy-dom', // or 'jsdom'
}
\`\`\`

You can also set environment per file with a top-of-file comment: \`// @vitest-environment jsdom\`.

## Mock hoisting

The trickiest Jest-to-Vitest porting issue is mock hoisting. Both runners hoist \`jest.mock\` / \`vi.mock\` calls above imports so the mock is registered before the module loads. But Vitest is stricter about what can appear inside a hoisted factory.

\`\`\`typescript
// Works in Jest, breaks in Vitest:
const mockFn = jest.fn();
jest.mock('./api', () => ({ getUsers: mockFn })); // mockFn is not yet defined when factory runs

// Vitest fix:
vi.mock('./api');
import { getUsers } from './api';
beforeEach(() => {
  vi.mocked(getUsers).mockResolvedValue([{ id: 1, name: 'A' }]);
});
\`\`\`

Or use \`vi.hoisted\` to declare a value that participates in hoisting:

\`\`\`typescript
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
vi.mock('./api', () => ({ getUsers: mockFn }));
\`\`\`

## React Testing Library setup

The React Testing Library setup is essentially identical. Add it to setup files for cleanup:

\`\`\`typescript
// vitest.setup.ts
import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
\`\`\`

\`@testing-library/jest-dom\` works with Vitest because Vitest's \`expect\` extends the Jest matcher format.

## Snapshot testing

Snapshots are file-compatible between Jest and Vitest. Run \`npx vitest run -u\` once to regenerate any snapshots that diff due to whitespace or serializer differences. Inline snapshots work identically.

## Coverage

Vitest ships with two coverage providers: \`v8\` (faster, less accurate around source maps) and \`istanbul\` (the Jest default; slower, more accurate). For most projects \`v8\` is fine.

\`\`\`typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'lcov'],
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 75,
    statements: 80,
  },
}
\`\`\`

## Watch mode

Vitest's watch mode is faster than Jest's because Vite tracks the dependency graph natively. \`vitest\` (without \`run\`) enters watch mode by default. The UI mode (\`vitest --ui\`) opens a browser dashboard with a test tree, failure inspector, and coverage overlay.

## CI changes

Replace \`jest\` with \`vitest run\` in package.json scripts:

\`\`\`json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:cov": "vitest run --coverage"
  }
}
\`\`\`

In GitHub Actions:

\`\`\`yaml
- run: npm ci
- run: npm run test:cov
- uses: codecov/codecov-action@v4
\`\`\`

## Gotchas and breaking changes

1. **Globals are off by default.** Either set \`globals: true\` or import \`describe\`/\`it\`/\`expect\` per file.
2. **\`vi.mock\` is hoisted differently.** Use \`vi.hoisted\` for shared mock values.
3. **\`requireActual\` is async.** \`await vi.importActual('mod')\`.
4. **Module mocks return Promises.** Refactor any sync \`requireMock\` use.
5. **Timer mocks differ slightly.** Vitest's \`advanceTimersByTimeAsync\` exists for async fake timers.
6. **Coverage thresholds may shift.** v8 provider reports slightly different numbers than istanbul.
7. **\`jest.config.js\` is ignored.** Move to \`vitest.config.ts\`.
8. **\`__mocks__\` folders work.** Manual mocks live next to source files just like Jest.
9. **\`jest-environment-jsdom\` is not needed.** Vitest ships with jsdom support.
10. **Single-file tests are faster.** Vitest re-imports only the changed files in watch mode.

## Migration checklist

- [ ] Install \`vitest\`, \`@vitest/coverage-v8\`, \`@vitest/ui\`, \`jsdom\`.
- [ ] Create minimal \`vitest.config.ts\`.
- [ ] Find-and-replace \`jest.\` with \`vi.\` across the suite.
- [ ] Update import statements at the top of every test file.
- [ ] Fix mock hoisting issues with \`vi.hoisted\`.
- [ ] Regenerate snapshots with \`-u\`.
- [ ] Wire CI for Vitest.
- [ ] Remove Jest dependencies.
- [ ] Train the team on the UI mode.
- [ ] Update onboarding docs and the [QA Skills directory](/skills).

## When not to migrate

If your suite is small (under 100 tests), runs quickly, and your team is productive, the ROI is low. If you depend on a Jest plugin that has no Vitest equivalent (rare in 2026), audit the cost. If your project is not on Vite, you can still use Vitest, but the speed advantage shrinks.

## Conclusion and next steps

The Jest-to-Vitest migration is one of the cleanest framework migrations in JavaScript today. The APIs are nearly identical; the config simplifies; the speedups are significant; and the watch experience is materially better. A two-person team can move a 1,000-test suite in a week, sometimes less.

Start with a scripted find-and-replace. Fix mock hoisting issues one file at a time. Train the team on the UI mode last. The result is a faster CI, a snappier inner loop, and a config you can actually understand.

Next read: explore the [QA Skills directory](/skills) for Vitest skills, and the [blog index](/blog) for component testing and CI guides.
`,
};
