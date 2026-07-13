import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mock import.meta.env Values in Vitest',
  description:
    'Mock import.meta.env values in Vitest with reliable cleanup, import-time isolation, and typed Vite flags so environment-dependent tests stay deterministic.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Mock import.meta.env Values in Vitest

A test suite passes locally, then fails the moment \`NODE_ENV\` changes in CI. A component reads \`import.meta.env.VITE_API_URL\` at module load time, the test sets \`process.env.VITE_API_URL\` before importing it, and the value never shows up inside the component. The test author assumes Vite environment variables behave like Node's \`process.env\`, mutable at any point before the code that reads them runs. They do not. \`import.meta.env\` values get inlined by Vite's compiler in most cases, and even where they are not statically replaced, module-level reads happen once, at import time, and never again. Getting this wrong wastes hours chasing a "flaky" test that is actually a timing bug in the test itself.

This guide covers the actual Vitest APIs for controlling \`import.meta.env\` in tests: \`vi.stubEnv()\`, \`vi.unstubAllEnvs()\`, the \`test.unstubEnvs\` config flag, and the \`vi.resetModules()\` plus dynamic \`import()\` pattern needed for code that captures env values at import time. It also covers the built-in booleans (\`DEV\`, \`PROD\`, \`SSR\`) and how to type custom \`VITE_\` variables through \`ImportMetaEnv\`.

## Why import.meta.env Is Not process.env

Vite exposes environment variables through \`import.meta.env\`, a compile-time construct, not a runtime object read from the OS environment the way \`process.env\` is in Node. Vite loads \`.env\` files, \`.env.local\`, \`.env.[mode]\`, and so on, then during the build (or dev server transform) it substitutes references to \`import.meta.env.VITE_SOMETHING\` with a literal value. Only variables prefixed with \`VITE_\` are exposed to client code by default, a deliberate boundary so server secrets in \`.env\` files do not leak into the browser bundle.

Vitest runs on top of Vite's own module graph, so \`import.meta.env\` is available in tests the same way it is in the app. But because Vite treats these values as effectively static per build, mutating them mid-test through direct property assignment (\`import.meta.env.VITE_API_URL = 'x'\`) is unreliable across environments and does not match how Vitest expects tests to interact with the env object. Vitest instead provides \`vi.stubEnv()\`, which patches the running \`import.meta.env\` object (and \`process.env\`, keeping both in sync) in a way Vitest tracks so it can be undone automatically or explicitly.

The other wrinkle is import-time capture. If a module does this:

\`\`\`javascript
// config.js
const apiUrl = import.meta.env.VITE_API_URL;
export function getApiUrl() {
  return apiUrl;
}
\`\`\`

the value of \`apiUrl\` is fixed the moment \`config.js\` is first imported into the module graph. Calling \`vi.stubEnv()\` after that import happened has no effect on \`apiUrl\`, because nothing re-reads \`import.meta.env\` on each call to \`getApiUrl()\`. This is not a Vitest limitation, it is standard module caching behavior in JavaScript, and it means the fix is not a different stubbing API, it is re-importing the module fresh after stubbing.

## vi.stubEnv for Runtime Env Reads

For code that reads \`import.meta.env\` inside a function body, at the time the function runs rather than at import time, \`vi.stubEnv()\` is sufficient on its own.

\`\`\`javascript
// featureFlags.js
export function isBetaEnabled() {
  return import.meta.env.VITE_BETA_ENABLED === 'true';
}

export function currentMode() {
  return import.meta.env.MODE;
}
\`\`\`

\`\`\`javascript
// featureFlags.test.js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { isBetaEnabled, currentMode } from './featureFlags.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isBetaEnabled', () => {
  it('returns true when VITE_BETA_ENABLED is "true"', () => {
    vi.stubEnv('VITE_BETA_ENABLED', 'true');
    expect(isBetaEnabled()).toBe(true);
  });

  it('returns false when VITE_BETA_ENABLED is "false"', () => {
    vi.stubEnv('VITE_BETA_ENABLED', 'false');
    expect(isBetaEnabled()).toBe(false);
  });

  it('respects a stubbed MODE value', () => {
    vi.stubEnv('MODE', 'staging');
    expect(currentMode()).toBe('staging');
  });
});
\`\`\`

\`vi.stubEnv(name, value)\` takes exactly two arguments: the variable name as a string, and the value as a string. There is no object-form call like \`vi.stubEnv({ VITE_BETA_ENABLED: 'true' })\`. Passing an object is not a supported signature, each variable gets its own \`vi.stubEnv()\` call. This matters because it is easy to assume, by analogy with mocking libraries that accept a bag of overrides, that stubbing multiple variables at once is a single call. It is not, and code written that way will not do what the author expects.

\`vi.unstubAllEnvs()\` reverts every variable stubbed with \`vi.stubEnv()\` back to its value before stubbing began. Calling it in \`afterEach\` is the standard way to keep env stubs from leaking between tests, the same discipline as \`vi.restoreAllMocks()\` for spies.

Vitest also supports doing this automatically through config, without an explicit \`afterEach\` in every test file:

\`\`\`typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    unstubEnvs: true,
  },
});
\`\`\`

Setting \`test.unstubEnvs\` to \`true\` tells Vitest to call the equivalent of \`vi.unstubAllEnvs()\` automatically after each test, so stubbed variables never bleed into the next test even if a file forgets the manual cleanup call.

## The Import-Time Capture Problem

The pattern above breaks down the moment a module reads \`import.meta.env\` outside a function, at the top level, because that read happens exactly once, the first time the module is imported in a given test run.

\`\`\`javascript
// apiClient.js
const BASE_URL = import.meta.env.VITE_API_URL;

export function fetchResource(path) {
  return fetch(\`\${BASE_URL}\${path}\`);
}
\`\`\`

Here, \`BASE_URL\` is locked in at import time. Stubbing \`VITE_API_URL\` after \`apiClient.js\` has already been imported anywhere in the test run, including by a prior test file sharing the module cache, does nothing, \`BASE_URL\` keeps its original value.

The fix combines two things: stub the env value first, then force Vitest to re-evaluate the module fresh with \`vi.resetModules()\` followed by a dynamic \`import()\` (not a static \`import\` at the top of the file, since static imports are hoisted and resolved before any test code runs).

\`\`\`javascript
// apiClient.test.js
import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('fetchResource', () => {
  it('uses the stubbed VITE_API_URL captured at import time', async () => {
    vi.stubEnv('VITE_API_URL', 'https://staging.example.com');
    vi.resetModules();

    const { fetchResource } = await import('./apiClient.js');

    // fetchResource now closes over BASE_URL resolved from the
    // stubbed value, because the module was re-imported after stubbing.
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true }));
    await fetchResource('/users');

    expect(globalThis.fetch).toHaveBeenCalledWith('https://staging.example.com/users');
  });
});
\`\`\`

The order matters: \`vi.stubEnv()\` runs before \`vi.resetModules()\`, and the dynamic \`import()\` runs after both, inside the test body. \`vi.resetModules()\` clears Vitest's module registry so the next \`import()\` call re-executes the module's top-level code instead of returning the cached export from a previous import, which is what lets the top-level \`const BASE_URL = import.meta.env.VITE_API_URL\` line pick up the new stubbed value.

| Read pattern | Where the read happens | Correct stubbing approach |
|---|---|---|
| Inside a function body, read on each call | Every time the function runs | \`vi.stubEnv()\` alone |
| Top-level \`const\` in a module | Once, at first import | \`vi.stubEnv()\` + \`vi.resetModules()\` + dynamic \`import()\` |
| Inside a class constructor | Each time an instance is created | \`vi.stubEnv()\` alone, as long as instantiation happens after stubbing |
| Inside a Vue/React component render function | Each render | \`vi.stubEnv()\` alone, as long as the stub is set before render |

## DEV, PROD, SSR, and MODE Booleans

Alongside custom \`VITE_\` variables, Vite injects a handful of built-in \`import.meta.env\` fields: \`MODE\` (the current mode string, \`development\` by default), \`BASE_URL\` (the app's base path), \`PROD\` (boolean, true in production mode), \`DEV\` (boolean, true in development mode, the inverse of \`PROD\`), and \`SSR\` (boolean, true when the code is running in a server-side rendering context).

These are stubbed the same way as any custom variable, through \`vi.stubEnv()\`, since Vitest treats them as ordinary entries on the \`import.meta.env\` object rather than as a special case.

\`\`\`javascript
// logger.js
export function debugLog(message) {
  if (import.meta.env.DEV) {
    console.log(\`[debug] \${message}\`);
  }
}
\`\`\`

\`\`\`javascript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { debugLog } from './logger.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

it('logs only when DEV is true', () => {
  vi.stubEnv('DEV', true);
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

  debugLog('hello');

  expect(spy).toHaveBeenCalledWith('[debug] hello');
  spy.mockRestore();
});

it('stays silent when DEV is false', () => {
  vi.stubEnv('DEV', false);
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

  debugLog('hello');

  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});
\`\`\`

Note that \`DEV\`, \`PROD\`, and \`SSR\` are booleans in the type definitions, so \`vi.stubEnv()\` accepts a boolean value for these fields even though custom \`VITE_\` variables are always strings (env vars are strings by nature, coming from \`.env\` files or the shell). This matches the \`ImportMetaEnv\` typing Vite ships, where \`DEV\`/\`PROD\`/\`SSR\` are typed \`boolean\` and everything else defaults to \`string\`.

## Typing Custom Variables with ImportMetaEnv

TypeScript projects get autocomplete and type checking on \`import.meta.env\` by augmenting the \`ImportMetaEnv\` interface, normally in a \`vite-env.d.ts\` file at the project root or in \`src/\`.

\`\`\`typescript
// vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_BETA_ENABLED: string;
  readonly VITE_MAX_RETRIES: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
\`\`\`

This does not change runtime behavior at all, it only affects what TypeScript accepts when code references \`import.meta.env.VITE_API_URL\`. Tests written in TypeScript benefit from the same typing: \`vi.stubEnv('VITE_API_URL', 'https://staging.example.com')\` type-checks against the string type declared for \`VITE_API_URL\` in \`ImportMetaEnv\`, and a typo like \`vi.stubEnv('VITE_API_URLL', ...)\` would not be caught by \`vi.stubEnv()\` itself (its first argument is typed as \`string\`, not a literal union tied to \`ImportMetaEnv\`), so the augmentation helps at the call site of \`import.meta.env\` reads in source code more than it helps inside the stubbing call.

| API | Signature | Effect |
|---|---|---|
| \`vi.stubEnv(name, value)\` | \`(name: string, value: string \| boolean \| undefined) => void\` | Sets one \`import.meta.env\`/\`process.env\` variable, tracked for later reset |
| \`vi.unstubAllEnvs()\` | \`() => void\` | Reverts every variable stubbed with \`vi.stubEnv()\` in the current test |
| \`test.unstubEnvs\` | config boolean | When \`true\`, Vitest calls the equivalent of \`vi.unstubAllEnvs()\` after every test automatically |
| \`vi.resetModules()\` | \`() => void\` | Clears Vitest's module registry so the next \`import()\` re-executes top-level module code |


## Configuring test.unstubEnvs

Vitest exposes \`vi.stubEnv(name, value)\` to override a single \`import.meta.env\` (and \`process.env\`) key for the duration of a test, plus \`vi.unstubAllEnvs()\` to roll every stub back. The trap: stubs persist across tests in the same file unless you clean up manually, because \`stubEnv\` writes to a shared runtime object, not a per-test snapshot.

The \`test.unstubEnvs\` config flag removes the manual cleanup step. Set it in \`vitest.config.ts\`:

\`\`\`ts
export default defineConfig({
  test: {
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
\`\`\`

With \`unstubEnvs: true\`, Vitest calls \`vi.unstubAllEnvs()\` automatically before each test runs, so a stub set in test A cannot bleed into test B. Pair it with \`unstubGlobals\` if you're also stubbing \`globalThis\` values. Without this flag, the safe pattern is an explicit \`afterEach(() => vi.unstubAllEnvs())\`, but that's one more thing every contributor has to remember to add to new test files. Prefer the config flag over scattering \`afterEach\` blocks; it's a one-line fix that closes an entire class of test-pollution bugs.

## Typing ImportMetaEnv Correctly

\`import.meta.env.VITE_API_URL\` only gets autocomplete and type-checking if \`ImportMetaEnv\` is augmented. Vite scaffolds this in \`vite-env.d.ts\`:

\`\`\`ts
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_FEATURE_FLAG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
\`\`\`

Two things break this in practice. First, if your test setup file stubs an env var that isn't declared in \`ImportMetaEnv\`, TypeScript won't complain at the \`vi.stubEnv\` call site (it takes a string key), but any production code reading that var loses type safety silently. Keep the interface as the single source of truth and add new \`VITE_*\` vars there before you reference them anywhere, tests included.

Second, \`vite-env.d.ts\` needs a triple-slash reference (\`/// <reference types="vite/client" />\`) or the ambient \`ImportMetaEnv\` interface won't merge with Vite's built-in one, and you'll get duplicate, conflicting declarations instead of an extension. Run \`tsc --noEmit\` after adding new env vars, not just \`vitest run\`, since type errors in \`import.meta.env\` usage don't fail a test run on their own.

## Concurrent Test Isolation

\`vi.stubEnv\` mutates a shared runtime object, and Vitest's \`describe.concurrent\` or \`test.concurrent\` blocks run multiple tests in the same worker without isolating that object between them. If test A stubs \`VITE_API_URL\` and test B reads it concurrently, B can observe A's value depending on scheduling, and the failure is nondeterministic, the worst kind to chase down.

Two mitigations. Reserve \`stubEnv\` for tests that are not marked concurrent, and keep env-dependent tests sequential in their own file or \`describe\` block. Or, if concurrency is required, avoid global env stubbing altogether and inject the value through a factory function or dependency-injected config object instead of reading \`import.meta.env\` directly inside the code under test. That second option is the more durable fix: it removes the shared mutable state instead of trying to sequence around it. The same category of shared-state leakage shows up with \`vi.mock\`, covered in the [complete guide to vi.mock](/blog/vitest-mocking-vi-mock-complete-guide), and the fix there is the same principle, isolate or inject rather than stub a global.

## Vite Build Substitution Limits

In a production Vite build, \`import.meta.env.VITE_X\` references are statically replaced at build time via esbuild's \`define\`, using literal string matching on the exact \`import.meta.env.KEY\` pattern. Dynamic access like \`import.meta.env[someVariable]\` is not replaced, because the replacement pass never evaluates the bracket expression, it stays as a runtime property lookup against whatever \`import.meta.env\` resolves to at that point.

This matters for tests because \`vi.stubEnv\` works at runtime through Vitest's module transform (vite-node), which does not do the same static substitution a production build does. A test can pass against \`vi.stubEnv\`-mocked dynamic access while the built production bundle behaves differently, since the built code inlined a value at compile time and dynamic lookups in source never got replaced at all. If your code reads env vars dynamically by key, verify the behavior against an actual \`vite build\` output, not only against Vitest's dev-mode transform.

## Decision Table

| Scenario | Approach |
|---|---|
| Single test needs one overridden var | \`vi.stubEnv('VITE_X', 'value')\` + \`unstubAllEnvs\` in \`afterEach\` |
| Whole suite needs consistent cleanup | \`test.unstubEnvs: true\` in config |
| Fixed values needed across all tests | \`test.env\` in \`vitest.config.ts\` |
| Concurrent tests touch env vars | Avoid global stubbing; inject via factory/config param |
| Code reads env by dynamic key | Verify against real \`vite build\` output, not just Vitest |
| New \`VITE_*\` var added | Declare in \`ImportMetaEnv\` before using it anywhere |

For the broader picture of how these settings fit into \`vitest.config.ts\` alongside coverage, aliasing, and environment selection, see the [Vitest config setup guide](/blog/vitest-config-setup-guide-2026).

## Frequently Asked Questions

### Can I pass an object of multiple variables to vi.stubEnv in one call?

No. \`vi.stubEnv()\` only accepts a single name and a single value per call, there is no object-form signature. To stub several variables, call \`vi.stubEnv()\` once per variable.

### Why does vi.stubEnv not affect a value read at the top of a module?

Because a top-level \`const\` reading \`import.meta.env\` runs once, the first time that module is imported, and the result is cached in the module graph. Stubbing after that first import changes \`import.meta.env\` itself but not the already-resolved constant. Fix it with \`vi.resetModules()\` followed by a dynamic \`import()\` after the stub is set.

### Do I need to call vi.unstubAllEnvs manually if I set unstubEnvs to true in config?

No. Setting \`test.unstubEnvs: true\` in the Vitest config makes Vitest call the equivalent of \`vi.unstubAllEnvs()\` automatically after each test, so a manual \`afterEach\` call for that purpose becomes redundant.

### Are DEV, PROD, and SSR stubbed differently from custom VITE_ variables?

The call is the same, \`vi.stubEnv()\`, but the value type differs: \`DEV\`, \`PROD\`, and \`SSR\` are typed as booleans in \`ImportMetaEnv\`, so \`vi.stubEnv('DEV', true)\` passes a boolean, while custom \`VITE_\` variables are always strings since that is how env vars are represented before Vite exposes them.

### Does resetModules affect mocks set up with vi.mock?

\`vi.resetModules()\` clears the module registry so subsequent imports re-execute module code, but it does not remove \`vi.mock()\` factory registrations, mocked modules remain mocked after a reset, they simply get re-instantiated against the current stubbed env values on the next import.
`,
};
