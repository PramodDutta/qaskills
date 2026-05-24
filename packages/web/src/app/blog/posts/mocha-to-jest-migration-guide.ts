import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mocha to Jest Migration Guide for 2026',
  description:
    'Migrate a Mocha + Chai + Sinon test suite to Jest in 2026. Assertion translation, mocking, hooks, async patterns, watch mode, and a proven rollout plan.',
  date: '2026-05-09',
  category: 'Migration',
  content: `
# Mocha to Jest Migration Guide for 2026

Mocha has shipped JavaScript tests since 2011. Combined with Chai (assertions), Sinon (mocks), and a custom reporter, it powered most Node testing through the 2010s. Jest took the lead in the React ecosystem starting around 2016 and is now the dominant choice for component testing, with a unified API, built-in mocks, parallel execution, and a strong watch-mode experience.

In 2026 many teams maintaining older Mocha suites are evaluating, or actively executing, a migration to Jest (or Vitest; see [the blog index](/blog) for that path). This guide is the migration playbook for SDETs and developers maintaining real Mocha suites who want a credible move to Jest. We cover assertion translation, mock translation, hooks, async patterns, watch mode, coverage, and the gotchas that bite teams in week one.

For broader testing references, browse [the blog index](/blog). For testing skills you can install into Claude Code, see the [QA Skills directory](/skills).

## Why migrate from Mocha to Jest

Mocha is intentionally minimal. It is a test runner only. You add Chai for assertions, Sinon for mocks, nyc for coverage, and Mocha-Reporter-X for output. That composability was a strength in 2014 and a maintenance burden in 2026.

Jest is opinionated and batteries-included. Assertions, mocks, parallel execution, coverage, watch mode, and snapshot testing all ship in a single package. The first hour after install you can run a test, mock a module, snapshot a component, and view coverage. The trade-off is less flexibility; you cannot easily swap out the assertion library or the mock library. For most teams, the trade is worth it.

The second driver is speed. Jest parallelizes test files across workers by default. A 1,000-test Mocha suite running sequentially might take 60 seconds; a Jest port often comes in under 20.

## Conceptual model

Mocha tests are plain functions registered with \`describe\` and \`it\`. Assertions come from \`assert\` (Node built-in), Chai, or any library you choose. Mocks come from Sinon.

Jest tests are plain functions registered with \`describe\` and \`it\` or \`test\`. Assertions come from \`expect\`, which is built in. Mocks come from \`jest.fn\` and \`jest.mock\`, also built in. Snapshot testing is built in. Coverage is built in.

## API mapping table

### Hooks

| Mocha | Jest | Notes |
|---|---|---|
| \`describe(name, fn)\` | \`describe(name, fn)\` | Identical |
| \`it(name, fn)\` | \`it(name, fn)\` or \`test(name, fn)\` | Both work |
| \`before(fn)\` | \`beforeAll(fn)\` | Renamed |
| \`after(fn)\` | \`afterAll(fn)\` | Renamed |
| \`beforeEach(fn)\` | \`beforeEach(fn)\` | Identical |
| \`afterEach(fn)\` | \`afterEach(fn)\` | Identical |
| \`it.only(name, fn)\` | \`it.only(name, fn)\` | Identical |
| \`it.skip(name, fn)\` | \`it.skip(name, fn)\` | Identical |

### Assertions

| Chai | Jest expect |
|---|---|
| \`expect(x).to.equal(y)\` | \`expect(x).toBe(y)\` |
| \`expect(x).to.deep.equal(y)\` | \`expect(x).toEqual(y)\` |
| \`expect(x).to.be.true\` | \`expect(x).toBe(true)\` |
| \`expect(x).to.be.null\` | \`expect(x).toBeNull()\` |
| \`expect(x).to.be.undefined\` | \`expect(x).toBeUndefined()\` |
| \`expect(x).to.exist\` | \`expect(x).toBeDefined()\` |
| \`expect(x).to.include(y)\` | \`expect(x).toContain(y)\` |
| \`expect(arr).to.have.lengthOf(3)\` | \`expect(arr).toHaveLength(3)\` |
| \`expect(obj).to.have.property('x')\` | \`expect(obj).toHaveProperty('x')\` |
| \`expect(fn).to.throw()\` | \`expect(fn).toThrow()\` |
| \`expect(promise).to.eventually.equal(x)\` | \`await expect(promise).resolves.toBe(x)\` |
| \`expect(promise).to.be.rejectedWith(Error)\` | \`await expect(promise).rejects.toThrow(Error)\` |

### Mocks (Sinon to Jest)

| Sinon | Jest |
|---|---|
| \`sinon.stub()\` | \`jest.fn()\` |
| \`sinon.stub(obj, 'method')\` | \`jest.spyOn(obj, 'method').mockImplementation(...)\` |
| \`stub.returns(x)\` | \`fn.mockReturnValue(x)\` |
| \`stub.resolves(x)\` | \`fn.mockResolvedValue(x)\` |
| \`stub.rejects(err)\` | \`fn.mockRejectedValue(err)\` |
| \`stub.callsFake(fn)\` | \`fn.mockImplementation(fn)\` |
| \`sinon.spy(obj, 'method')\` | \`jest.spyOn(obj, 'method')\` |
| \`sinon.assert.calledWith(stub, x)\` | \`expect(fn).toHaveBeenCalledWith(x)\` |
| \`sinon.assert.calledOnce(stub)\` | \`expect(fn).toHaveBeenCalledTimes(1)\` |
| \`sinon.useFakeTimers()\` | \`jest.useFakeTimers()\` |
| \`clock.tick(1000)\` | \`jest.advanceTimersByTime(1000)\` |
| \`stub.restore()\` | \`spy.mockRestore()\` |

## Step-by-step migration plan

1. **Day 1** - Install \`jest\`, \`@types/jest\`, and the appropriate transformer (\`ts-jest\` for TS or \`@swc/jest\` for speed).
2. **Day 2** - Create \`jest.config.js\`. Get one test passing.
3. **Days 3 to 5** - Translate assertions. A scripted find-and-replace handles 80%.
4. **Days 6 to 8** - Translate mocks. Sinon to Jest is the biggest chunk of work.
5. **Day 9** - Wire CI.
6. **Day 10** - Remove Mocha, Chai, Sinon, nyc dependencies.

## Before and after: a real spec

**Mocha + Chai + Sinon (before)**

\`\`\`typescript
import { expect } from 'chai';
import sinon from 'sinon';
import { fetchUsers } from './users';
import * as api from './api';

describe('fetchUsers', () => {
  let stub: sinon.SinonStub;

  beforeEach(() => {
    stub = sinon.stub(api, 'getUsers').resolves([{ id: 1, name: 'A' }]);
  });

  afterEach(() => {
    stub.restore();
  });

  it('returns the user list', async () => {
    const users = await fetchUsers();
    expect(users).to.have.lengthOf(1);
    expect(users[0]).to.have.property('name', 'A');
    sinon.assert.calledOnce(stub);
  });
});
\`\`\`

**Jest (after)**

\`\`\`typescript
import { fetchUsers } from './users';
import * as api from './api';

describe('fetchUsers', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    spy = jest.spyOn(api, 'getUsers').mockResolvedValue([{ id: 1, name: 'A' }]);
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('returns the user list', async () => {
    const users = await fetchUsers();
    expect(users).toHaveLength(1);
    expect(users[0]).toHaveProperty('name', 'A');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
\`\`\`

## Async testing

Both runners support async/await. Mocha additionally accepts callback-style \`done\` parameters; Jest also accepts \`done\` but the async/await path is preferred.

| Mocha | Jest |
|---|---|
| \`it('x', async () => { ... })\` | \`it('x', async () => { ... })\` |
| \`it('x', (done) => { done(); })\` | \`it('x', (done) => { done(); })\` |
| Promise chains return | Same |
| \`this.timeout(5000)\` | Pass \`{ timeout: 5000 }\` as third arg |

## Configuration

A minimal \`jest.config.js\`:

\`\`\`javascript
module.exports = {
  testEnvironment: 'node', // or 'jsdom' for browser-like tests
  preset: 'ts-jest',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  coverageThreshold: {
    global: { branches: 75, functions: 80, lines: 80, statements: 80 },
  },
  setupFilesAfterEach: ['<rootDir>/jest.setup.ts'],
};
\`\`\`

If you use SWC for faster transpilation:

\`\`\`javascript
module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\\\.(t|j)sx?$': '@swc/jest' },
  testMatch: ['**/__tests__/**/*.test.ts'],
};
\`\`\`

## Snapshot testing

Mocha has no built-in snapshot testing; teams typically reach for \`chai-snapshot\` or \`mocha-snapshots\`. Jest's snapshot testing is built in.

\`\`\`typescript
it('matches the snapshot', () => {
  const result = renderComponent({ foo: 'bar' });
  expect(result).toMatchSnapshot();
});
\`\`\`

Inline snapshots are also supported. They are particularly useful for assertions that change often: \`expect(x).toMatchInlineSnapshot()\`. Jest fills in the snapshot the first time you run the test.

## Coverage

Mocha teams use nyc (Istanbul). Jest's coverage is also Istanbul-based and works out of the box.

\`\`\`bash
npx jest --coverage
\`\`\`

Set coverage thresholds in \`jest.config.js\` to enforce minimums in CI.

## Watch mode

Mocha has a \`--watch\` flag but does not isolate tests intelligently. Jest's watch mode runs only tests related to changed files and offers an interactive prompt to filter, run failed only, or update snapshots.

\`\`\`bash
npx jest --watch
\`\`\`

## CI changes

In package.json:

\`\`\`json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage"
  }
}
\`\`\`

In GitHub Actions:

\`\`\`yaml
- run: npm ci
- run: npm test -- --coverage
- uses: codecov/codecov-action@v4
\`\`\`

## Gotchas and breaking changes

1. **\`before\` becomes \`beforeAll\`.** Easy to miss; a find-and-replace catches it.
2. **\`this.timeout\` becomes per-test timeout option.** \`it('x', async () => { ... }, 5000)\`.
3. **Sinon stubs reset differently.** Jest spies reset with \`mockRestore\`; Sinon stubs reset with \`restore\`.
4. **Module mocking is hoisted.** \`jest.mock('./api')\` is hoisted above imports; Sinon module replacement is not.
5. **Done callbacks still work but are unidiomatic.** Prefer async/await.
6. **Chai's \`expect(x).to.equal(y)\` is reference equality.** Jest's \`toBe\` is the same; \`toEqual\` is deep equality (Chai's \`deep.equal\`).
7. **Sinon's \`sinon.match\` becomes Jest's \`expect.objectContaining\` / \`expect.arrayContaining\`.**
8. **\`describe.only\` works in both.** No change.
9. **Reporters change.** Mocha's mochawesome becomes Jest's HTML reporter or jest-html-reporter.
10. **Custom matchers become Jest matchers.** Chai plugins do not work; rewrite as \`expect.extend\`.

## Migration checklist

- [ ] Install \`jest\`, \`@types/jest\`, and a transformer (\`ts-jest\` or \`@swc/jest\`).
- [ ] Create \`jest.config.js\`.
- [ ] Find-and-replace \`before(\` to \`beforeAll(\` and \`after(\` to \`afterAll(\`.
- [ ] Translate Chai assertions to Jest expect.
- [ ] Translate Sinon mocks to Jest mocks.
- [ ] Set up coverage thresholds.
- [ ] Add Jest scripts to package.json.
- [ ] Wire CI.
- [ ] Remove Mocha, Chai, Sinon, nyc dependencies.
- [ ] Train team on watch mode.
- [ ] Update onboarding docs and the [QA Skills directory](/skills).

## When not to migrate

If your suite is small (under 100 tests), runs reliably, and your team is productive, the ROI is low. If you depend on a Mocha plugin that has no Jest equivalent, audit the rewrite cost. Consider Vitest as an alternative; for many teams it is a better target than Jest in 2026.

## Conclusion and next steps

The Mocha-to-Jest migration is largely mechanical. Assertions, mocks, and hooks have direct mappings. The result is a faster, simpler, more cohesive testing stack with built-in snapshots, mocks, and coverage. A two-person team can move a 1,000-test suite in two weeks.

Start with assertion translation. Layer in mock translation. Run both runners in parallel until Jest is green. Train the team on the watch mode last; it sells the migration on its own.

Next read: explore the [QA Skills directory](/skills) for Jest and Vitest skills, and the [blog index](/blog) for component testing and CI guides.
`,
};
