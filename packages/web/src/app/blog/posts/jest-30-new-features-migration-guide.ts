import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest 30 Migration Guide: New Features and Breaking Changes for QA Engineers',
  description: 'Use this Jest 30 migration guide to update Node, jsdom, CLI flags, matchers, mocks, snapshots, and CI without quiet test regressions safely.',
  date: '2026-09-24',
  category: 'Migration',
  content: `
# Jest 30 Migration Guide: New Features and Breaking Changes for QA Engineers

Jest 30 is a real migration for QA engineers, not just a dependency bump. The headline changes are clear: Jest 30 drops older Node lines, requires newer TypeScript support when you use Jest types, upgrades \`jest-environment-jsdom\` to jsdom 26, removes long-deprecated matcher aliases, renames \`--testPathPattern\` to \`--testPathPatterns\`, removes \`jest --init\`, changes several mock APIs and types, and adds useful features for spies, arrays, retries, animation-frame timers, TypeScript config files, and ESM-adjacent projects.

The payoff is worth planning for. The Jest team says version 30 is faster, uses less memory, improves module resolution through \`unrs-resolver\`, detects some globals cleanup problems, handles delayed promise rejection handling more accurately, and supports \`.mts\` and \`.cts\` test files by default. But those gains only help if the migration preserves what your test suite is supposed to prove.

This Jest 30 migration guide is written for QA and test-automation engineers who own CI signal quality, not only JavaScript package updates. If you are comparing migration paths across runners, read [Jest to Vitest Migration Guide](/blog/jest-to-vitest-migration-guide) before committing to another Jest major. If your main pain is mock behavior rather than the Jest 30 upgrade itself, keep [Jest Mock vs mockImplementation Guide](/blog/jest-mock-vs-mockimplementation-guide) nearby while reviewing failures.

Official references used for the details in this guide:

https://jestjs.io/blog/2025/06/04/jest-30
https://jestjs.io/docs/upgrading-to-jest30
https://jestjs.io/docs/30.0/cli
https://jestjs.io/docs/30.0/configuration
https://jestjs.io/docs/30.0/test-environment

## Compatibility Gates Before The Version Bump

Start with runtime compatibility. Jest 30 drops support for Node 14, 16, 19, and 21. The minimum supported Node version is now 18.x. The upgrade guide also says the minimum TypeScript version is 5.4 when you use Jest type definitions or packages that rely on them. If your CI matrix still includes Node 16 for a library consumer, Jest 30 cannot be the only runner in that matrix.

The jsdom change is just as important for UI tests. \`jest-environment-jsdom\` now uses jsdom 26, up from jsdom 21 in Jest 29. That can surface browser API behavior changes, especially around spec compliance. The Jest release post specifically calls out \`window.location\` mocking as an area that may break.

| Gate | Jest 29-era assumption | Jest 30 requirement or behavior |
|---|---|---|
| Node | Many repos still ran Jest on Node 16 | Minimum supported Node is 18.x |
| TypeScript | Older Jest types often tolerated TS before 5.4 | Minimum TypeScript is 5.4 for Jest type usage |
| jsdom | \`jest-environment-jsdom\` used jsdom 21 | Uses jsdom 26 |
| Test files | Extra config often needed for \`.mts\` and \`.cts\` | \`.mts\` and \`.cts\` are supported by defaults |
| CLI path filter | \`--testPathPattern\` | \`--testPathPatterns\` |
| Config scaffold | \`jest --init\` | Use \`npm init jest@latest\`, \`yarn create jest\`, or \`pnpm create jest\` |

Run a compatibility audit before changing \`package.json\`:

\`\`\`bash
node --version
npm ls jest jest-environment-jsdom ts-jest typescript @types/jest
rg "toBeCalled|toReturn|toThrowError|genMockFromModule|testPathPattern|jest --init" .
\`\`\`

If the repo has multiple packages, run that search at the monorepo root and inside package-specific scripts. CI failures often come from a forgotten package script that still passes a removed flag.

## Upgrade In A Small, Reversible PR

The Jest blog says you can install Jest 30 with \`npm install jest@^30.0.0\`, then follow the migration guide. In production automation repos, pin the major through normal dependency management and let the lockfile show the exact resolved version.

\`\`\`bash
npm install --save-dev jest@^30.0.0
npm install --save-dev jest-environment-jsdom@^30.0.0
npm install --save-dev typescript@^5.4.0
\`\`\`

That command is not universal. Some stacks use \`ts-jest\`, Babel, SWC, React Testing Library, or a framework wrapper. The migration PR should show exactly which packages changed and why. Do not mix it with assertion rewrites unrelated to Jest 30. If you want to harden weak tests, do it after the runner is green so reviewers can distinguish migration effects from test-quality work.

For GitHub Actions, update Node first and keep runner flags precise:

\`\`\`yaml
name: jest-30

on:
  pull_request:

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test -- --runInBand
      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: jest-results
          path: reports/jest/
\`\`\`

Use Jest's own filters when slicing failures. Jest filters test names with \`-t\` or \`--testNamePattern\`, and filters paths with \`--testPathPatterns\` in Jest 30.

\`\`\`bash
# Test name filter
npx jest --testNamePattern="shows validation errors"

# Short alias for test name filter
npx jest -t "shows validation errors"

# Test path filter in Jest 30
npx jest --testPathPatterns "src/forms" "src/checkout"
\`\`\`

## Removed Matcher Aliases

Jest 30 removes deprecated matcher aliases that have existed as compatibility shims for years. The migration guide lists direct replacements, and the functionality is the same. The risk is not semantic. The risk is coverage gaps when a mechanical rewrite misses one package or turns a chained assertion into invalid syntax.

| Removed alias | Replacement |
|---|---|
| \`toBeCalled()\` | \`toHaveBeenCalled()\` |
| \`toBeCalledTimes(n)\` | \`toHaveBeenCalledTimes(n)\` |
| \`toBeCalledWith(arg)\` | \`toHaveBeenCalledWith(arg)\` |
| \`lastCalledWith(arg)\` | \`toHaveBeenLastCalledWith(arg)\` |
| \`nthCalledWith(n, arg)\` | \`toHaveBeenNthCalledWith(n, arg)\` |
| \`toReturn()\` | \`toHaveReturned()\` |
| \`toReturnTimes(n)\` | \`toHaveReturnedTimes(n)\` |
| \`toReturnWith(value)\` | \`toHaveReturnedWith(value)\` |
| \`lastReturnedWith(value)\` | \`toHaveLastReturnedWith(value)\` |
| \`nthReturnedWith(n, value)\` | \`toHaveNthReturnedWith(n, value)\` |
| \`toThrowError(message)\` | \`toThrow(message)\` |

A safe codemod can be simple if your code is ordinary:

\`\`\`bash
npx eslint . --fix --rule 'jest/no-alias-methods: error'
\`\`\`

Then inspect high-risk tests manually. Pay special attention to tests where the alias sat next to a weak condition, because a mechanical rewrite fixes the alias and leaves the weak check in place:

\`\`\`ts
import { savePayment } from '../src/payments';

test('records payment status', () => {
  const notify = jest.fn();
  const record = savePayment({ amount: 20, card: '4242' }, notify);

  // Jest 29 alias, removed in Jest 30: expect(notify).toBeCalledWith('payment.authorized');
  expect(notify).toHaveBeenCalledWith('payment.authorized');
  expect(record.status).toMatch(/^(paid|settled)$/);
});
\`\`\`

The anchored regex matters: a loose \`/paid|settled/\` would also accept \`unpaid\`. Migration is a good time to catch traps like that, but keep the assertion hardening in a clearly labeled commit.

## CLI And Config Changes That Break Automation

The \`--testPathPattern\` rename is the most visible CLI break. Jest 30 uses \`--testPathPatterns\`, plural. It can accept multiple patterns, either separated by spaces or by repeating the flag depending on how your shell and script wrapper pass arguments. If you maintain internal tools that call Jest programmatically, the upgrade guide also notes that Jest consolidates path patterns into a \`TestPathPatterns\` object.

The old \`jest --init\` command is removed. For new config scaffolding, use the package manager create flow:

\`\`\`bash
npm init jest@latest
yarn create jest
pnpm create jest
\`\`\`

Jest 30 also validates CLI flags that require arguments. A script that accidentally passed \`--maxWorkers\` without a value may have limped along before, but now it should fail. That is good. Silent defaults in CI create fake confidence.

| Script smell | Jest 30 fix | Why QA should care |
|---|---|---|
| \`jest --testPathPattern=unit\` | \`jest --testPathPatterns unit\` | Old flag fails or behaves differently |
| \`jest --maxWorkers\` | \`jest --maxWorkers=50%\` | Avoid accidental default worker behavior |
| \`jest --init\` in docs | \`npm init jest@latest\` | Onboarding scripts should still work |
| Custom \`--filter\` module returns an array | Return \`{ filtered: paths }\` (an array of path strings) | Jest 30 only accepts the documented shape |
| Windows paths use single slash assumptions | Use portable patterns | CLI docs call out path separator handling |

## jsdom 26 Triage

The jsdom upgrade is where many front-end test suites spend most of their migration time. Tests that depended on implementation details in jsdom 21 can fail when jsdom becomes more spec compliant. The release post highlights \`window.location\` mocking as a likely trouble spot.

Bad pattern:

\`\`\`ts
test('redirects after logout', () => {
  Object.defineProperty(window, 'location', {
    value: { href: 'https://example.test/account' },
    writable: true,
  });

  logout();

  expect(window.location.href).toBe('/login');
});
\`\`\`

Better pattern: hide navigation behind your own boundary and assert the boundary call.

\`\`\`ts
import { jest, test, expect } from '@jest/globals';

export interface NavigatorPort {
  assign(url: string): void;
}

export function logout(navigatorPort: NavigatorPort): void {
  navigatorPort.assign('/login');
}

test('redirects after logout', () => {
  const navigatorPort = { assign: jest.fn<(url: string) => void>() };

  logout(navigatorPort);

  expect(navigatorPort.assign).toHaveBeenCalledWith('/login');
});
\`\`\`

This is not a workaround for one jsdom version. It is better test design. Unit tests should not need to mutate locked browser globals when a small adapter gives you a precise behavioral assertion. Keep a smaller number of integration tests in jsdom for DOM behavior, then use Playwright or another browser runner for real navigation.

## TypeScript And CalledWith Inference

Jest 30 improves type inference for the \`CalledWith\` family of matchers. The upgrade guide says TypeScript may now catch argument mismatches that were previously unnoticed. Runtime behavior is unchanged, but compile-time failures can reveal tests that asserted impossible calls.

\`\`\`ts
import { jest, test, expect } from '@jest/globals';

type PublishInvoice = (invoiceId: number, channel: 'email' | 'webhook') => void;

test('publishes invoices over email', () => {
  const publish = jest.fn<PublishInvoice>();

  publish(42, 'email');

  expect(publish).toHaveBeenCalledWith(42, 'email');
});
\`\`\`

If this test accidentally expected \`'sms'\`, TypeScript should complain because \`'sms'\` is not part of the function signature. Do not silence those errors with \`as unknown as\` unless the test is deliberately exercising invalid runtime input. In QA suites, stricter mock typing often exposes mistaken fixtures, outdated API expectations, or product behavior that changed without test updates.

Some public mock types were removed. If you imported or referenced older mock function types, move to supported types such as \`jest.Spied\` where appropriate. The \`jest.genMockFromModule\` function is also removed and should be replaced with \`jest.createMockFromModule\`.

\`\`\`ts
const mockFs = jest.createMockFromModule<typeof import('node:fs')>('node:fs');

expect(mockFs).toBeDefined();
\`\`\`

## Snapshot And Object Matching Changes

Jest 30 changes snapshot output in several places. The upgrade guide calls out error causes in snapshots, React empty string rendering, improved printing for \`ArrayBuffer\` and \`DataView\`, and removal of a deprecated shortened documentation URL in snapshot text. The release post also says non-enumerable object properties are excluded from object matchers such as \`toEqual\` by default.

Treat snapshot churn as reviewable product signal, not a bulk update chore. A useful migration command is:

\`\`\`bash
npx jest --updateSnapshot --testPathPatterns "src/components" --runInBand
\`\`\`

Then review the diff by category:

| Snapshot diff | Likely source | Review question |
|---|---|---|
| Error now includes \`cause\` | Serializer changed | Is the cause useful and stable? |
| Empty string child disappears | React serializer changed | Was the empty string meaningful UI? |
| Binary-like object prints differently | \`pretty-format\` change | Is a snapshot the right assertion? |
| Hidden property no longer affects equality | Non-enumerable exclusion | Should the test assert public behavior instead? |

What people get wrong: they update all snapshots first, then try to understand failures. Reverse it. Run tests without updating snapshots, classify failures, fix real behavior or brittle setup, then update snapshots only for understood serializer changes.

## New Features Worth Adopting Carefully

Jest 30 adds several features that are useful for automation engineers. The release post highlights support for TypeScript config files, native support for \`.mts\` and \`.cts\`, \`import.meta.*\` and \`file://\` support with native ESM, explicit resource management with spies, \`expect.arrayOf\`, a new \`test.each\` placeholder \`%$\`, \`jest.advanceTimersToNextFrame()\`, configurable \`jest.retryTimes()\` options, and globals cleanup controls.

\`\`\`ts
test('all exported routes have stable labels', () => {
  const routes = [
    { path: '/account', label: 'Account' },
    { path: '/billing', label: 'Billing' },
  ];

  expect(routes).toEqual(
    expect.arrayOf(
      expect.objectContaining({
        path: expect.stringMatching(/^\\//),
        label: expect.any(String),
      }),
    ),
  );
});
\`\`\`

\`expect.arrayOf\` is valuable when the invariant applies to every element and the exact array shape is tested elsewhere. Do not use it as a substitute for checking required rows.

\`\`\`ts
const cases = [
  ['free', 0],
  ['team', 49],
  ['enterprise', 199],
] as const;

test.each(cases)('plan case %$: %s costs %i', (plan, price) => {
  expect(price).toBeGreaterThanOrEqual(0);
  expect(plan).toMatch(/^(free|team|enterprise)$/);
});
\`\`\`

The \`%$\` placeholder makes generated test names easier to map back to data rows. That is useful when CI reports only one failed parameterized case.

\`\`\`ts
jest.useFakeTimers();

test('runs animation work on the next frame', () => {
  const onFrame = jest.fn();

  requestAnimationFrame(() => onFrame('painted'));
  jest.advanceTimersToNextFrame();

  expect(onFrame).toHaveBeenCalledWith('painted');
});
\`\`\`

\`jest.advanceTimersToNextFrame()\` is better than guessing milliseconds when the code uses \`requestAnimationFrame\`. It makes animation tests less tied to fake durations.

\`\`\`ts
jest.retryTimes(2, {
  waitBeforeRetry: 100,
  retryImmediately: true,
});
\`\`\`

Retries should be a diagnostic tool, not a hiding place. If a test only passes with retries, file the flake with failure evidence and decide whether it belongs in PR blocking CI.

## Globals Cleanup And Memory Leaks

The Jest 30 release post describes a globals cleanup feature. Jest runs each test file in a separate VM context, but leaked globals can still create memory pressure or slow test execution. The default mode is documented as \`soft\`, with \`on\` available when you have no cleanup warnings, and \`off\` if you need to disable it.

\`\`\`ts
import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  testEnvironmentOptions: {
    globalsCleanup: 'soft',
  },
};

export default config;
\`\`\`

If Jest reports uncleaned globals, investigate before flipping the setting. In a QA suite, common causes include test helpers that attach debug clients to \`globalThis\`, fake server objects that are not closed, custom DOM shims, and shared caches used to speed tests. Protecting a global can be valid, but it should be rare and documented.

\`\`\`ts
import { protectProperties } from 'jest-util';

declare global {
  var __sharedTestCache: Map<string, string> | undefined;
}

globalThis.__sharedTestCache = new Map<string, string>();
protectProperties(globalThis.__sharedTestCache);
\`\`\`

That sample is intentionally explicit. If a cache matters enough to survive cleanup, it should have a name reviewers can search for and a cleanup strategy in a global teardown file.

## Failure Mode: The Green Suite That No Longer Tests The Thing

The most dangerous Jest 30 failure mode is not a red CI run. It is a green run after a rushed migration that quietly narrowed execution. This happens when a script owner confuses path and title filters, or when a wrapper drops arguments after the renamed \`--testPathPatterns\` flag.

Example bad migration:

\`\`\`json
{
  "scripts": {
    "test:changed": "jest --testNamePattern src/checkout"
  }
}
\`\`\`

That script does not select files under \`src/checkout\`. It selects tests whose full names contain \`src/checkout\`, which many suites will not have. The run may pass because it executed zero or too few tests.

Safer script:

\`\`\`json
{
  "scripts": {
    "test:checkout": "jest --testPathPatterns src/checkout --passWithNoTests=false"
  }
}
\`\`\`

Add a CI assertion that records how many tests ran. You can use Jest JSON output and parse it with Node:

\`\`\`bash
npx jest --json --outputFile=reports/jest/results.json
node scripts/assert-jest-count.mjs reports/jest/results.json 25
\`\`\`

\`\`\`js
import fs from 'node:fs';

const [file, minimumText] = process.argv.slice(2);
const minimum = Number(minimumText);
const result = JSON.parse(fs.readFileSync(file, 'utf8'));

if (!Number.isFinite(minimum)) {
  throw new Error('Minimum test count must be a number');
}

if (result.numTotalTests < minimum) {
  throw new Error('Expected at least ' + minimum + ' tests, saw ' + result.numTotalTests);
}
\`\`\`

This is not about hitting an arbitrary metric. The number is an illustrative guardrail that should be set from your normal historical baseline. It catches accidental no-op jobs before they become false release confidence.

## A Migration Order That Keeps Signal Clean

Use this order for a large repo:

1. Raise CI Node to a maintained LTS line (22 or 24; Node 18 meets the Jest 30 minimum but is past end-of-life) while still on Jest 29, if possible.
2. Upgrade TypeScript to at least 5.4 if Jest types are used.
3. Replace removed matcher aliases with canonical matcher names.
4. Update CLI scripts from \`--testPathPattern\` to \`--testPathPatterns\`.
5. Upgrade Jest and \`jest-environment-jsdom\`.
6. Run Node-environment tests first.
7. Run jsdom tests and triage browser API changes.
8. Review snapshots in categorized batches.
9. Turn on useful new features only after baseline migration is green.

The sequence matters because it isolates failure classes. If everything changes at once, an AI coding agent or human reviewer will be tempted to patch symptoms. If Node tests pass and jsdom tests fail, you know where to look. If aliases are already gone before the version bump, removed matchers will not distract from real runtime changes.

## Frequently Asked Questions

### What Node version does Jest 30 require?

Jest 30 drops support for Node 14, 16, 19, and 21. The minimum supported Node version is 18.x. For CI, Node 22 is a good current choice if your application and tooling support it. Library maintainers who still test consumers on older Node versions should either keep a Jest 29 lane for those versions or move those compatibility checks to another runner that supports the required runtime.

### Why did my jsdom tests fail after the Jest 30 migration?

\`jest-environment-jsdom\` moved to jsdom 26, so tests that depended on older jsdom behavior can fail. The most common failures involve browser globals, navigation, URL behavior, timers, and DOM APIs that became more spec compliant. Prefer testing through your own navigation or browser boundary rather than mutating locked globals. Keep true browser navigation checks in Playwright, where a real browser can verify behavior.

### Is \`--testPathPattern\` still valid in Jest 30?

No. Jest 30 renamed \`--testPathPattern\` to \`--testPathPatterns\`. Use \`--testNamePattern\` or \`-t\` when filtering by test title, and use \`--testPathPatterns\` when filtering by file path. This distinction matters during CI migration because a wrong filter can produce a green run that executed the wrong tests or no meaningful tests at all.

### Should I update snapshots automatically during the upgrade?

Do not update all snapshots as the first move. Run the suite, classify failures, and separate serializer changes from real behavior changes. Jest 30 can change snapshots for error causes, React empty string rendering, binary object printing, and old documentation links. After you understand the reason for each diff, update snapshots in focused batches so reviewers can confirm the new output still proves the intended UI or object contract.
`,
};
