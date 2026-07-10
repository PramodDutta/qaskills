import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest Module Isolation and resetModules Guide',
  description: 'Jest module isolation guide for fixing state leakage, resetModules misuse, singleton cache bugs, env-driven imports, and reliable test setup.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Jest Module Isolation and resetModules Guide

A config module reads \`process.env\` at import time, one test changes the variable, and the next test inherits a value it never set. Nothing about that failure looks dramatic. The suite simply passes when run alone and fails when Jest chooses a different file order. That is usually a module cache problem, not a matcher problem.

Jest runs tests inside a runtime that caches required modules. The cache is good for speed and matches how Node normally behaves, but it also means top-level state can survive longer than a single test. \`jest.resetModules()\` clears the module registry for the current test file runtime. \`jest.isolateModules(fn)\` creates a sandbox registry for modules loaded inside the callback. Used carefully, they let you test import-time behavior without turning the rest of the suite into slow, confusing setup code.

This guide assumes you already know Jest hooks and mocks. For lifecycle ordering, use [a Jest setup and teardown beforeEach guide](/blog/jest-setup-teardown-beforeeach-guide). For mock function behavior, compare patterns in [a jest.mock vs mockImplementation guide](/blog/jest-mock-vs-mockimplementation-guide).

## The cache bug hiding behind import time

The first question in any isolation issue is whether the module does work while it is being imported. Reading an environment variable, creating a database client, building an in-memory registry, subscribing to an event emitter, or storing a feature flag at the top level all create state before the test body runs.

Consider this simple module:

\`\`\`ts
// src/config.ts
export const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';

export function getApiUrl(path: string) {
  return new URL(path, apiBaseUrl).toString();
}
\`\`\`

If a test imports \`apiBaseUrl\` once, changing \`process.env.API_BASE_URL\` later does not update the exported constant. That is JavaScript module behavior. Jest did not do anything wrong. The test needs to load the module after preparing the environment.

\`\`\`ts
// __tests__/config.test.ts
describe('config import behavior', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('uses the API_BASE_URL value present at import time', async () => {
    process.env.API_BASE_URL = 'https://staging.example.test';

    const config = await import('../src/config');

    expect(config.getApiUrl('/v1/users')).toBe('https://staging.example.test/v1/users');
  });
});
\`\`\`

The important ordering is env first, import second. \`jest.resetModules()\` in \`beforeEach\` clears the previous import so the next test can load a fresh copy.

## resetModules versus isolateModules

These two APIs solve related but different problems. The wrong choice often works until the file gains another test that shares helper imports.

| API | Scope | Best fit | Tradeoff |
|---|---|---|---|
| \`jest.resetModules()\` | Clears the module registry for subsequent imports in the current file runtime | Re-importing a module after changing env or mocks in \`beforeEach\` | Easy to overuse and can make shared setup re-run unexpectedly. |
| \`jest.isolateModules(fn)\` | Creates a sandbox registry only for modules loaded inside the callback | Comparing two import-time configurations in one test | Callback style can be awkward with ESM and async imports. |
| \`jest.isolateModulesAsync(fn)\` | Async sandbox registry | Dynamic \`import()\` scenarios in ESM code | Requires Jest versions that support the async helper. |
| \`jest.clearAllMocks()\` | Mock call history only | Reusing mock functions while resetting calls | Does not reload modules or reset top-level state. |
| \`jest.restoreAllMocks()\` | Restores spied properties | Cleaning up \`jest.spyOn\` | Does not undo module-level singletons. |

Use \`resetModules\` when the whole test's import graph should be refreshed before each case. Use \`isolateModules\` when you need a small experiment with a fresh import graph and do not want to disturb helpers loaded outside the callback.

## Testing singleton modules without polluting neighbors

Singleton modules are common in Node services: a logger, metrics registry, feature flag client, or database pool. The test smell is not the singleton itself. The smell is a test that mutates it and leaves that mutation visible to later tests.

Here is a small feature flag registry that stores state at module scope:

\`\`\`ts
// src/flags.ts
const flags = new Map<string, boolean>();

export function enableFlag(name: string) {
  flags.set(name, true);
}

export function disableFlag(name: string) {
  flags.set(name, false);
}

export function isEnabled(name: string) {
  return flags.get(name) === true;
}
\`\`\`

If you can add a real reset function to the production module without harming design, that is often clearer than module isolation. But for legacy modules or import-time initialization, isolate the import.

\`\`\`ts
// __tests__/flags.test.ts
test('keeps registry state inside an isolated module registry', () => {
  jest.isolateModules(() => {
    const flags = require('../src/flags') as typeof import('../src/flags');

    flags.enableFlag('new-checkout');

    expect(flags.isEnabled('new-checkout')).toBe(true);
  });

  jest.isolateModules(() => {
    const flags = require('../src/flags') as typeof import('../src/flags');

    expect(flags.isEnabled('new-checkout')).toBe(false);
  });
});
\`\`\`

This test proves that each isolated registry sees its own copy of \`src/flags\`. It does not require a global \`beforeEach\`, and it avoids making every test in the file pay for reset behavior it does not need.

## Mock factories and import order

Most advanced leakage bugs involve mocks and imports, not just raw cache state. With CommonJS tests, \`jest.mock\` calls are hoisted by Jest's transform. With ESM and dynamic imports, ordering rules are stricter. The durable habit is to configure mocks before importing the module under test.

| Goal | Safer pattern | Fragile pattern |
|---|---|---|
| Different dependency behavior per test | \`jest.doMock(...)\` then dynamic \`import(...)\` after \`resetModules\` | Static import at top of file, then changing the mock in the test |
| Verify import-time env parsing | Set env, then import module | Import module, then set env, then expect constant to change |
| Keep one dependency real | Use \`jest.requireActual\` inside the mock factory | Recreate the dependency manually and drift from production |
| Avoid shared mock calls | \`jest.clearAllMocks\` in \`afterEach\` or \`beforeEach\` | Assuming resetModules clears call history on existing mock references |
| Test two module configurations | \`jest.isolateModules\` for each configuration | Mutating exports between assertions |

A service that reads a dependency at import time needs the dependency mock ready before the service is imported.

\`\`\`ts
// src/paymentService.ts
import { getGatewayMode } from './gatewayConfig';

const mode = getGatewayMode();

export function shouldCaptureImmediately() {
  return mode === 'live';
}
\`\`\`

\`\`\`ts
// __tests__/paymentService.test.ts
describe('payment service import-time gateway mode', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('captures immediately in live mode', async () => {
    jest.doMock('../src/gatewayConfig', () => ({
      getGatewayMode: jest.fn(() => 'live'),
    }));

    const service = await import('../src/paymentService');

    expect(service.shouldCaptureImmediately()).toBe(true);
  });

  test('does not capture immediately in sandbox mode', async () => {
    jest.doMock('../src/gatewayConfig', () => ({
      getGatewayMode: jest.fn(() => 'sandbox'),
    }));

    const service = await import('../src/paymentService');

    expect(service.shouldCaptureImmediately()).toBe(false);
  });
});
\`\`\`

The test does not static-import \`paymentService\` at the top. That is intentional. A top-level import would execute the service before either mock factory was installed.

## ESM projects need stricter discipline

Jest's ESM support has improved, but ESM still rewards explicit import timing. Static imports run before the body of the test module. If you need to change environment, register an unstable ESM mock, or compare import-time variants, dynamic imports are your friend.

Do not mix static and dynamic imports of the same module in one test file unless you are deliberately testing cache behavior. A single static import can prime the module registry and invalidate a later isolation attempt. That is especially easy to miss when a helper file imports the module under test as a side effect.

For ESM-heavy code, keep test helpers pure. A helper should build input data, create fake clocks, or expose matcher utilities. It should not import the module whose initialization you are trying to vary. When a helper must import application code, name it clearly so future maintainers do not use it in isolation tests by accident.

## When isolation is the wrong fix

Module isolation is powerful, but it can hide design issues. If a module's behavior needs to change per request, per tenant, or per test, a top-level constant may be the wrong production design. Prefer dependency injection when the value is truly runtime behavior. Prefer module isolation when the production behavior is intentionally import-time behavior and the test needs to exercise that boundary.

Examples that deserve design pressure include request-scoped user context, tenant-specific feature flags, locale, current time, and active database transaction. Those values usually belong in function arguments, context objects, or injectable collaborators. Examples that fit import-time tests include build metadata, startup configuration, process env validation, and one-time wiring of a singleton client.

A practical review question is, "Would production ever need two versions of this module loaded at once?" If yes, module isolation in tests may be a warning sign. If no, and the test is verifying startup behavior, \`resetModules\` can be exactly the right tool.

## A troubleshooting sequence for state leakage

Start with the smallest reproduction. Run the failing test alone, then with the nearest file, then the full suite. If order matters, search for top-level state in the modules touched by both tests. Look for arrays, maps, singletons, env reads, fake timers, spies on globals, and mock factories.

Next, classify the leak. If it is mock call history, use mock cleanup. If it is fake time, restore timers. If it is module state, either add a production reset API or reload the module. If it is import-time configuration, set the configuration before importing.

Finally, make the test communicate the boundary. A reader should be able to tell why \`resetModules\` is present. Add a short comment if the import timing is non-obvious. Do not sprinkle it into a global setup file just because one suite was flaky. Global module resets can slow tests and make helper behavior harder to reason about.

## Fake timers, globals, and modules interact badly

Module cache issues often travel with fake timers and global mutation. A module imports \`Date.now()\` into a top-level constant, a test enables fake timers after import, and the code under test keeps using the real timestamp. Another module installs an event listener at import time, and \`resetModules\` reloads the listener without removing the old one. Those failures look unrelated until you trace what happened during import.

When a test changes global behavior, set it before importing modules that capture that behavior. Restore it after the test. If the module registers process listeners, intervals, or singleton clients at import time, prefer a production cleanup API. Reloading a module that starts background work can multiply side effects.

| Captured at import | Test setup must happen before import | Cleanup concern |
|---|---|---|
| \`Date.now()\` or \`new Date()\` | \`jest.useFakeTimers()\` and \`jest.setSystemTime(...)\` | \`jest.useRealTimers()\` after the case |
| \`process.env\` | Assign env values | Restore original env object or keys |
| \`Math.random()\` spy | Install spy or inject random source | Restore spy to avoid deterministic neighbors |
| Process event listener | Decide whether listener should be registered | Remove listener or expose shutdown |
| Open client or pool | Mock factory or dependency injection | Close connection, do not rely on cache reset |

Here is the import-time clock version of the problem:

\`\`\`ts
// src/buildStamp.ts
export const startedAt = new Date(Date.now()).toISOString();
\`\`\`

\`\`\`ts
// __tests__/buildStamp.test.ts
describe('build stamp import time', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('captures the fake system time when imported', async () => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-10T09:00:00.000Z'));

    const module = await import('../src/buildStamp');

    expect(module.startedAt).toBe('2026-07-10T09:00:00.000Z');
  });
});
\`\`\`

The ordering is the test. If the static import sits at the top of the file, the fake timer setup is too late.

## Make isolation visible in test names and helpers

A module isolation test should advertise why isolation is present. Otherwise a future maintainer may simplify the file by moving imports to the top and reintroduce the leak. Name the behavior around import timing, not around Jest mechanics. \`loads config after env is set\` is better than \`reset modules works\`.

For repeated patterns, create a tiny local helper that resets modules, applies setup, and imports the module under test. Keep that helper inside the spec file unless several files share the same import-time boundary. Global helpers that hide \`resetModules\` can make unrelated tests harder to understand.

| Helper style | Maintainability | Example |
|---|---|---|
| Local \`loadConfig(env)\` helper | Clear when only one module needs it | Good for env-driven config modules |
| Global \`freshImport(path)\` helper | Risky if used casually | Acceptable in a test utilities package with documentation |
| Top-level import plus mutation | Misleading for import-time behavior | Avoid for startup config tests |
| Production reset API | Best when state is intentionally mutable | Good for registries and in-memory stores |
| Dependency injection | Best for request-scoped values | Good for clocks, tenants, users, and transactions |

The strongest Jest suites do not use isolation everywhere. They use it where JavaScript module semantics are part of the behavior under test. That restraint keeps failures readable and preserves speed.

## A reviewer checklist for isolation changes

When a pull request adds \`jest.resetModules\`, review it like a concurrency change. Ask which import-time value is being refreshed, whether a static import already defeated the reset, and whether a production reset function would be clearer. Also check that the test does not reload a module that opens sockets, starts intervals, or registers process handlers without cleanup.

A small checklist prevents cargo-cult isolation. It should be visible in the test or the review description: setup before import, dynamic import used intentionally, globals restored, mocks installed before module load, and no top-level helper import touching the module under test. If any item is hard to answer, the test is probably too clever.

Isolation is most valuable when it documents a real startup boundary. It is least valuable when it papers over mutable design that should be passed as a dependency.

One final habit helps: keep one deliberately boring test that imports the module normally. It guards against isolation-only coverage where the production import path is never exercised. Isolation should supplement ordinary imports, not replace them completely.

## Frequently Asked Questions

### Does \`jest.resetModules()\` reset mock function call counts?

Not for mock references you already hold. Use \`jest.clearAllMocks()\`, \`jest.resetAllMocks()\`, or \`jest.restoreAllMocks()\` depending on whether you need to clear calls, reset implementations, or restore spies.

### Can I static-import the module under test and still use \`resetModules\`?

Usually no for import-time behavior. A static import runs before your test body and can populate the module registry before you set env or mocks. Use dynamic import after setup when import order matters.

### Is \`isolateModules\` faster than \`resetModules\`?

It can be more targeted because the sandbox is limited to the callback, but speed depends on what you import inside it. The bigger win is clarity: only the modules that need isolation are isolated.

### Should every test file call \`jest.resetModules()\` in \`beforeEach\`?

No. Most tests do not need a fresh module graph. Use it in files that verify import-time configuration or legacy module state. Routine object and function tests should use normal setup.

### How do I find the module that leaked state?

Search for top-level mutable values and import-time side effects in modules used by both the failing test and the test that ran before it. Then temporarily isolate imports to confirm the diagnosis before changing the production design.
`,
};
