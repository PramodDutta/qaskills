import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jasmine to Jest Migration Guide for 2026',
  description:
    'Migrate a Jasmine test suite to Jest in 2026. Spy translation, async patterns, custom matchers, ESM, watch mode, and a battle-tested checklist.',
  date: '2026-05-12',
  category: 'Migration',
  content: `
# Jasmine to Jest Migration Guide for 2026

Jasmine has been a backbone of JavaScript testing since 2010. Its describe/it/expect syntax inspired RSpec-style testing across the language ecosystem, and Jest itself was designed to be largely Jasmine-compatible. By 2026 many teams that have run Jasmine for a decade are migrating to Jest (or Vitest) for the watch mode, mocks, snapshots, parallelism, and coverage that come for free.

This guide is the migration playbook for SDETs and developers maintaining real Jasmine suites who want a credible move to Jest. We cover the API mapping table, spy translation, async patterns, custom matchers, ESM caveats, and the gotchas that bite teams in week one.

For broader testing references, browse [the blog index](/blog). For testing skills you can install into Claude Code, see the [QA Skills directory](/skills).

## Why migrate from Jasmine to Jest

The biggest single reason is mock ergonomics. Jasmine's spy API (\`spyOn\`, \`jasmine.createSpy\`, \`jasmine.createSpyObj\`) has been stable for years but lacks features Jest gives you for free: automatic mock reset between tests, module-level mocking with hoisting, snapshot mocking, and mock factory functions that hoist above imports.

The second reason is the runner. Jasmine ships a basic runner. Jest's runner has parallel workers, watch mode with interactive prompts, snapshot updating, coverage reporting, and a JSON output for CI integration. The third is the ecosystem. Jest matchers, custom matchers, and integration with libraries like \`jest-extended\` are richer.

## Conceptual model: nearly identical, with sharper tooling

The mental model does not change. Both runners use describe/it/expect with the same hooks. The migration is largely a find-and-replace.

The differences are in mocks and the runner. Jest's \`jest.mock\` hoists module mocks above imports; Jasmine has no built-in equivalent. Jest's \`jest.fn\` is more compact than \`jasmine.createSpy\`. Jest's watch mode is interactive.

## API mapping table: Jasmine to Jest

### Test syntax (identical or close)

| Jasmine | Jest |
|---|---|
| \`describe(name, fn)\` | \`describe(name, fn)\` |
| \`it(name, fn)\` | \`it(name, fn)\` |
| \`beforeEach(fn)\` | \`beforeEach(fn)\` |
| \`afterEach(fn)\` | \`afterEach(fn)\` |
| \`beforeAll(fn)\` | \`beforeAll(fn)\` |
| \`afterAll(fn)\` | \`afterAll(fn)\` |
| \`fdescribe\` / \`fit\` | \`describe.only\` / \`it.only\` |
| \`xdescribe\` / \`xit\` | \`describe.skip\` / \`it.skip\` |
| \`pending('reason')\` | \`it.todo('reason')\` |

### Matchers

| Jasmine | Jest |
|---|---|
| \`expect(x).toBe(y)\` | \`expect(x).toBe(y)\` |
| \`expect(x).toEqual(y)\` | \`expect(x).toEqual(y)\` |
| \`expect(x).toBeTruthy()\` | \`expect(x).toBeTruthy()\` |
| \`expect(x).toBeFalsy()\` | \`expect(x).toBeFalsy()\` |
| \`expect(x).toContain(y)\` | \`expect(x).toContain(y)\` |
| \`expect(x).toMatch(/y/)\` | \`expect(x).toMatch(/y/)\` |
| \`expect(fn).toThrow()\` | \`expect(fn).toThrow()\` |
| \`expect(spy).toHaveBeenCalled()\` | \`expect(spy).toHaveBeenCalled()\` |
| \`expect(spy).toHaveBeenCalledWith(x)\` | \`expect(spy).toHaveBeenCalledWith(x)\` |
| \`expect(spy).toHaveBeenCalledTimes(n)\` | \`expect(spy).toHaveBeenCalledTimes(n)\` |
| \`expect(arr.length).toBe(n)\` | \`expect(arr).toHaveLength(n)\` (preferred) |

### Spies

| Jasmine | Jest |
|---|---|
| \`jasmine.createSpy('name')\` | \`jest.fn()\` |
| \`jasmine.createSpyObj('name', ['a','b'])\` | \`{ a: jest.fn(), b: jest.fn() }\` |
| \`spyOn(obj, 'method')\` | \`jest.spyOn(obj, 'method')\` |
| \`spy.and.returnValue(x)\` | \`fn.mockReturnValue(x)\` |
| \`spy.and.callFake(fn)\` | \`fn.mockImplementation(fn)\` |
| \`spy.and.resolveTo(x)\` | \`fn.mockResolvedValue(x)\` |
| \`spy.and.rejectWith(err)\` | \`fn.mockRejectedValue(err)\` |
| \`spy.and.callThrough()\` | \`jest.spyOn(...) // no mock impl\` |
| \`spy.calls.count()\` | \`fn.mock.calls.length\` |
| \`spy.calls.argsFor(0)\` | \`fn.mock.calls[0]\` |
| \`spy.calls.reset()\` | \`fn.mockClear()\` |

### Timers

| Jasmine | Jest |
|---|---|
| \`jasmine.clock().install()\` | \`jest.useFakeTimers()\` |
| \`jasmine.clock().tick(1000)\` | \`jest.advanceTimersByTime(1000)\` |
| \`jasmine.clock().mockDate(d)\` | \`jest.setSystemTime(d)\` |
| \`jasmine.clock().uninstall()\` | \`jest.useRealTimers()\` |

## Step-by-step migration plan

1. **Day 1** - Install \`jest\`, \`@types/jest\`, and the appropriate transformer (\`ts-jest\` or \`@swc/jest\`).
2. **Day 2** - Create minimal \`jest.config.js\`.
3. **Days 3 to 4** - Run a scripted find-and-replace. \`jasmine.createSpy\` to \`jest.fn\`, \`fdescribe\` to \`describe.only\`, etc.
4. **Days 5 to 6** - Translate \`spyOn\` patterns to \`jest.spyOn\`.
5. **Day 7** - Translate timer mocks.
6. **Day 8** - Add coverage thresholds.
7. **Day 9** - Wire CI.
8. **Day 10** - Remove Jasmine dependencies.

## Before and after: a real test

**Jasmine (before)**

\`\`\`typescript
import { UserService } from './user.service';
import { Api } from './api';

describe('UserService', () => {
  let service: UserService;
  let api: jasmine.SpyObj<Api>;

  beforeEach(() => {
    api = jasmine.createSpyObj('Api', ['getUsers']);
    service = new UserService(api);
  });

  it('fetches and returns users', async () => {
    api.getUsers.and.resolveTo([{ id: 1, name: 'A' }]);
    const users = await service.fetchAll();
    expect(users.length).toBe(1);
    expect(api.getUsers).toHaveBeenCalled();
  });
});
\`\`\`

**Jest (after)**

\`\`\`typescript
import { UserService } from './user.service';
import { Api } from './api';

describe('UserService', () => {
  let service: UserService;
  let api: jest.Mocked<Api>;

  beforeEach(() => {
    api = { getUsers: jest.fn() } as unknown as jest.Mocked<Api>;
    service = new UserService(api);
  });

  it('fetches and returns users', async () => {
    api.getUsers.mockResolvedValue([{ id: 1, name: 'A' }]);
    const users = await service.fetchAll();
    expect(users).toHaveLength(1);
    expect(api.getUsers).toHaveBeenCalled();
  });
});
\`\`\`

## Async testing

Both runners support async/await and callback-style \`done\`. Both support promise return.

\`\`\`typescript
// async/await (preferred in both)
it('async test', async () => {
  await someAsync();
});

// done callback (works in both, unidiomatic)
it('callback test', (done) => {
  someAsync().then(() => done());
});
\`\`\`

## Custom matchers

Jasmine custom matchers register via \`jasmine.addMatchers\`. Jest uses \`expect.extend\`.

\`\`\`typescript
// Jasmine
jasmine.addMatchers({
  toBeWithinRange: () => ({
    compare(actual: number, min: number, max: number) {
      return { pass: actual >= min && actual <= max };
    },
  }),
});

// Jest
expect.extend({
  toBeWithinRange(actual: number, min: number, max: number) {
    return {
      pass: actual >= min && actual <= max,
      message: () => \`expected \${actual} to be between \${min} and \${max}\`,
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(min: number, max: number): R;
    }
  }
}
\`\`\`

## Configuration

A minimal \`jest.config.js\`:

\`\`\`javascript
module.exports = {
  testEnvironment: 'node',
  preset: 'ts-jest',
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: {
    global: { branches: 75, functions: 80, lines: 80, statements: 80 },
  },
};
\`\`\`

## Module mocking

This is where Jest decisively wins. Jasmine has no built-in module-level mocking. You wire up patterns like proxyquire, rewire, or manual DI containers. Jest gives you \`jest.mock\`:

\`\`\`typescript
jest.mock('./api', () => ({
  getUsers: jest.fn().mockResolvedValue([{ id: 1, name: 'A' }]),
}));

import { fetchAll } from './service';
// fetchAll imports getUsers from './api'; the mock is active.

it('uses the mock', async () => {
  const users = await fetchAll();
  expect(users).toHaveLength(1);
});
\`\`\`

The \`jest.mock\` call is hoisted above imports automatically.

## Snapshot testing

Jest's snapshot testing is built in. Jasmine teams using \`jasmine-snapshot\` or similar can drop the dependency.

\`\`\`typescript
it('matches snapshot', () => {
  const result = renderTemplate({ user: 'A' });
  expect(result).toMatchSnapshot();
});
\`\`\`

## Watch mode

Jest's watch mode is interactive. Press \`f\` to filter, \`u\` to update snapshots, \`p\` to filter by filename, \`t\` to filter by test name. Jasmine's watch is a basic file watcher.

## CI changes

\`\`\`json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage"
  }
}
\`\`\`

\`\`\`yaml
- run: npm ci
- run: npm test -- --coverage --ci
- uses: codecov/codecov-action@v4
\`\`\`

## ESM caveats

Jest's ESM support requires \`--experimental-vm-modules\` until a future release. If your project is native ESM, consider Vitest as a target instead. The migration mechanics are the same; substitute \`vi\` for \`jest\`.

## Gotchas and breaking changes

1. **\`jasmine.createSpyObj\` becomes a literal object of \`jest.fn()\`s.** No direct helper.
2. **\`spy.and.callThrough\` becomes \`jest.spyOn\` with no \`mockImplementation\`.** Default is to call through.
3. **\`jasmine.any(Type)\` becomes \`expect.any(Type)\`.** Similar; different namespace.
4. **\`jasmine.objectContaining\` becomes \`expect.objectContaining\`.** Same idea.
5. **\`pending\` becomes \`it.todo\`.** Marks the test as a TODO without running it.
6. **\`jasmine.clock().mockDate\` becomes \`jest.setSystemTime\`.** Different name.
7. **Custom matcher signatures differ.** Refactor; the API is cleaner in Jest.
8. **Mock factories hoist.** Useful but surprising at first.
9. **\`done.fail\` becomes \`done(new Error(...))\`.** Different idiom.
10. **Jest snapshots default to \`.snap\` files.** Adjust your \`.gitignore\`.

## Migration checklist

- [ ] Install \`jest\`, \`@types/jest\`, a transformer.
- [ ] Create \`jest.config.js\`.
- [ ] Find-and-replace \`fdescribe\`/\`fit\` to \`describe.only\`/\`it.only\`.
- [ ] Translate \`jasmine.createSpy\` to \`jest.fn\`.
- [ ] Translate \`jasmine.createSpyObj\` to object literals.
- [ ] Translate \`spy.and.*\` patterns to \`fn.mock*\` patterns.
- [ ] Translate timers.
- [ ] Translate custom matchers.
- [ ] Wire CI.
- [ ] Remove Jasmine dependencies.
- [ ] Train team on watch mode.
- [ ] Update onboarding docs and the [QA Skills directory](/skills).

## When not to migrate

If your suite is small and runs reliably, the ROI is low. If you depend on a Jasmine plugin with no Jest equivalent, audit the cost. Consider Vitest as an alternative target if your project is native ESM.

## Conclusion and next steps

The Jasmine-to-Jest migration is straightforward. The API similarity makes find-and-replace effective, and the win is a better mock story, a snappier watch mode, and a richer ecosystem. A two-person team can move a 1,000-spec suite in a week.

Start with a scripted find-and-replace. Translate spies one file at a time. Add module mocks for previously-DI-only patterns once Jest is green. Train the team on watch mode last; it sells the migration on its own.

Next read: explore the [QA Skills directory](/skills) for Jest skills, and the [blog index](/blog) for component testing and Vitest guides.
`,
};
