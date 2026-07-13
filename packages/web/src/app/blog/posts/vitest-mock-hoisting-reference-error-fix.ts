import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Vitest vi.mock() Hoisting ReferenceError Fix",
  description:
    "Fix Vitest vi.mock hoisting ReferenceErrors with vi.hoisted, typed mock factories, delayed imports, and module-cache controls that preserve test isolation.",
  date: "2026-07-13",
  category: "Guide",
  content: `
# Vitest vi.mock() Hoisting ReferenceError Fix

\`ReferenceError: Cannot access 'sendEmail' before initialization\` points at a mock factory that appears below the variable it uses. The file looks correct from top to bottom, but Vitest does not execute that source in the order it is displayed. It statically finds \`vi.mock()\`, moves the registration ahead of imports, and evaluates the factory before ordinary top-level constants have initialized.

The durable fix is to place factory state inside \`vi.hoisted()\`, return it, and reference that returned object from \`vi.mock()\`. Other fixes are valid for different intentions: create \`vi.fn()\` inside the factory when the test never needs the handle, or use \`vi.doMock()\` plus a later dynamic import when the mock must depend on per-test state.

## Reproduce the temporal dead zone failure

This test is visually persuasive and operationally wrong:

\`\`\`typescript
import { describe, expect, it, vi } from 'vitest';
import { registerUser } from './register-user';

const sendEmail = vi.fn();

vi.mock('./mailer', () => ({
  sendEmail,
}));

describe('registerUser', () => {
  it('sends a welcome message', async () => {
    await registerUser({ email: 'ada@example.test' });
    expect(sendEmail).toHaveBeenCalledWith('ada@example.test');
  });
});
\`\`\`

Vitest rewrites static imports so the mock can take effect before \`register-user\` loads \`mailer\`. That useful transformation also means the mock factory cannot close over a normal \`const\` declared in the transformed module body. JavaScript's temporal dead zone applies until that declaration initializes.

Changing \`const\` to \`var\` may replace the ReferenceError with \`undefined\`, which is worse because the mock can fail later and less clearly. Moving the declaration above imports does not help, since static imports and mock registration are transformed. The problem is phase, not line number.

## Put shared mock handles in \`vi.hoisted()\`

\`vi.hoisted()\` runs its callback before imports. Its returned object is available to the hoisted mock factory and later test code.

\`\`\`typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerUser } from './register-user';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn<(address: string) => Promise<void>>(),
}));

vi.mock('./mailer', () => ({
  sendEmail: mocks.sendEmail,
}));

describe('registerUser', () => {
  beforeEach(() => {
    mocks.sendEmail.mockReset();
    mocks.sendEmail.mockResolvedValue(undefined);
  });

  it('sends a welcome message to the persisted address', async () => {
    await registerUser({ email: 'ada@example.test' });
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(mocks.sendEmail).toHaveBeenCalledWith('ada@example.test');
  });
});
\`\`\`

The callback must be self-contained. Imports are not available yet, including values imported above the call in source. Built-in globals and \`vi\` are safe. If the callback needs a module, Vitest supports an async hoisted callback with dynamic import, but that delays every import in the test file. Prefer plain data and mocks.

| Requirement | Suitable API | Key constraint |
|---|---|---|
| Reuse a spy in factory and assertions | \`vi.hoisted()\` plus \`vi.mock()\` | Hoisted callback cannot use static imports |
| Provide a mock nobody needs to inspect | Create \`vi.fn()\` inside factory | Test has no direct handle unless imported export is mocked |
| Choose implementation inside each test | \`vi.doMock()\` and dynamic \`import()\` | Already imported modules are unaffected |
| Keep real exports except one | Async factory with \`importOriginal()\` | Return every override explicitly |
| Spy without replacing implementation | \`vi.spyOn()\` | Call site must use a spy-able object property |

## Preserve module shape in the factory

Fixing hoisting does not fix an invalid mock object. A factory replaces the module with its return value. If production imports a default export, return a \`default\` key. If it imports several named exports, supply them or use \`importOriginal\` for a partial mock.

\`\`\`typescript
const mocks = vi.hoisted(() => ({
  charge: vi.fn(),
}));

vi.mock('./payments', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./payments')>();
  return {
    ...actual,
    charge: mocks.charge,
  };
});
\`\`\`

This retains real pure helpers while replacing the network boundary. Be cautious: spreading a module evaluates and copies its exports into the mock object. It is not the same as preserving all live bindings. For a narrow dependency module this pattern is readable; for a stateful module, dependency injection may be safer.

Vitest also supports \`vi.mock(import('./payments'), factory)\`. The dynamic-import-looking expression gives TypeScript a resolvable module reference while Vitest strips it during transformation. It can improve refactor safety, but projects must use a Vitest version that supports this form.

## Use \`vi.doMock()\` when values are chosen at test time

\`vi.doMock()\` is not hoisted. It affects subsequent imports, not modules already loaded through static imports. Therefore, pair it with a dynamic import after registration.

\`\`\`typescript
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('./feature-flags');
  vi.resetModules();
});

it('uses the compact checkout when the test enables it', async () => {
  const compact = true;
  vi.doMock('./feature-flags', () => ({
    isEnabled: vi.fn((name: string) => name === 'compact-checkout' && compact),
  }));

  const { chooseCheckout } = await import('./choose-checkout');
  expect(chooseCheckout()).toBe('compact');
});
\`\`\`

This deliberately reloads the subject after installing the per-test factory. \`vi.resetModules()\` clears the module registry so a later test can load a fresh subject. It does not clear mock registrations; \`vi.doUnmock()\` removes the delayed mock for subsequent imports.

Do not use delayed mocking merely to avoid learning hoisting. It changes the import structure and module-cache lifecycle. Use it when a mock genuinely depends on runtime values unavailable during hoisted setup.

## Imported variables are unavailable inside \`vi.hoisted()\`

A second ReferenceError often appears after the first fix:

\`\`\`typescript
import { makeToken } from './token-test-helper';
import { vi } from 'vitest';

const state = vi.hoisted(() => ({ token: makeToken() })); // unsafe
\`\`\`

\`makeToken\` is a static import and has not initialized when the hoisted callback executes. Return primitives and mock functions, call the helper later, or dynamically import it inside an async callback.

\`\`\`typescript
const state = vi.hoisted(async () => {
  const { makeToken } = await import('./token-test-helper');
  return { token: makeToken() };
});

vi.mock('./auth', () => ({
  readToken: vi.fn(() => state.token),
}));
\`\`\`

Top-level await must be supported by the test environment for this form. More importantly, importing production modules during the hoisted phase can create cycles or initialize dependencies before mocks are registered. A literal test token is often the cleaner design.

## Reset calls solve different kinds of leakage

\`mockClear()\` removes call history while preserving implementation. \`mockReset()\` also resets implementation. \`mockRestore()\` restores an original implementation for spies. At the global level, \`vi.clearAllMocks()\`, \`vi.resetAllMocks()\`, and \`vi.restoreAllMocks()\` apply the corresponding behavior broadly.

| Cleanup operation | Calls cleared | Mock implementation reset | Original spy restored |
|---|---:|---:|---:|
| \`mockClear()\` | Yes | No | No |
| \`mockReset()\` | Yes | Yes | No |
| \`mockRestore()\` on a spy | Yes | Yes | Yes |
| \`vi.resetModules()\` | No | No | No, it clears module cache |

A hoisted mock object lives for the test module's lifetime. If one test calls \`mockResolvedValueOnce\` and the next inherits unused queued behavior, results become order-dependent. Reset or define the default implementation in \`beforeEach\`. Choose clear versus reset consciously.

Configuration options such as \`clearMocks\`, \`mockReset\`, and \`restoreMocks\` can enforce suite-wide cleanup. They do not repair a hoisting ReferenceError; they act around tests after collection and module evaluation.

## Setup files and cached imports

If a setup file imports the module you later try to mock, that module may already be cached before the test's \`vi.mock()\` factory can affect it. Vitest explicitly warns about this. Avoid importing application subjects from global setup modules. Keep setup focused on matchers, environment shims, and truly global hooks.

When unavoidable, \`vi.resetModules()\` can be called inside \`vi.hoisted()\` to clear caches before test-file imports. This is a strong intervention and can slow the suite. First refactor the setup file to stop eagerly loading mock targets.

Browser Mode adds another boundary. Native browser ESM namespaces cannot always be reconfigured the way Node module runner namespaces can. Vitest's \`{ spy: true }\` option can auto-spy exports while preserving implementations, but architecture that passes collaborators explicitly remains the most portable.

## Diagnose the transformed lifecycle

Read the full error and identify which binding the factory touches. Reduce the factory to literals. Add external references back one by one. Confirm that \`vi\` is imported directly from \`vitest\` unless globals are enabled, because static analysis must recognize the call.

Then classify the dependency: stable spy handle, imported constant, per-test state, or already-cached module. That classification selects \`vi.hoisted\`, in-factory creation, \`vi.doMock\`, or setup-file repair. Randomly rearranging lines is not a diagnosis.

The [Vitest mocking guide](/blog/vitest-mocking-vi-mock-complete-guide) covers module replacement breadth. For setup-file and cleanup defaults, consult the [Vitest configuration guide](/blog/vitest-config-setup-guide-2026).

## When dependency injection is simpler

Module mocking is valuable for legacy seams and expensive boundaries, but it couples the test to loader behavior. A function that accepts a mailer, clock, or payment client can use an ordinary object literal. No hoisting, cache reset, or transformed import is involved.

Do not contort public APIs solely for tests. At service boundaries, however, an explicit dependency often improves production design too. Reserve module mocks for dependencies that are genuinely module-scoped or prohibitively invasive to pass.

## Class and constructor mocks need constructable implementations

A module may export a class that production instantiates with \`new\`. An arrow function returned from \`vi.fn(() => value)\` is not a constructable class substitute in every transformation context. Use a function or class implementation and assert constructor calls on the mock handle.

\`\`\`typescript
const mocks = vi.hoisted(() => ({
  publish: vi.fn(),
  EventBus: vi.fn(function EventBusMock() {
    return { publish: mocks.publish };
  }),
}));

vi.mock('./event-bus', () => ({
  EventBus: mocks.EventBus,
}));

beforeEach(() => {
  mocks.EventBus.mockClear();
  mocks.publish.mockReset();
});
\`\`\`

Be cautious about referencing \`mocks\` inside the function body. The body runs later when production constructs it, after the hoisted object has initialized. Referencing it while creating the object would still be premature.

If production relies on \`instanceof\`, static fields, or prototype methods, a simplistic constructor mock changes behavior too much. Prefer spying on a narrower collaborator or injecting a factory.

## \`vi.mocked()\` helps typing but performs no mocking

\`vi.mocked(value)\` tells TypeScript to view an already mocked value with mock-aware types. It does not replace the export, hoist anything, or create a spy. Confusing the type helper with the transformation API can produce runtime calls to the real dependency.

\`\`\`typescript
import { expect, test, vi } from 'vitest';
import { readFlag } from './flags';
import { renderBanner } from './banner';

vi.mock('./flags', () => ({ readFlag: vi.fn() }));

test('hides the banner when the flag is disabled', () => {
  vi.mocked(readFlag).mockReturnValue(false);
  expect(renderBanner()).toBeNull();
});
\`\`\`

Here \`vi.mock\` changes the module. \`vi.mocked\` only exposes \`mockReturnValue\` to the type checker. When you already keep a typed handle from \`vi.hoisted\`, the helper is often unnecessary.

## Circular imports can look like a hoisting bug

A mock factory ReferenceError is commonly the temporal dead zone, but circular production modules can produce similar “before initialization” messages even after external references are removed. Draw the import cycle and reproduce without the mock. Mock transformation can change evaluation order enough to reveal a latent cycle.

Do not solve a production cycle by adding more hoisted state. Move shared types to a type-only module, extract constants without side effects, or invert the dependency. Use \`import type\` so TypeScript erases type-only edges.

Barrel files are frequent participants. Mocking \`./services\` while the subject imports \`./services/mailer\` targets different module IDs. Conversely, a barrel can import every service and create cycles the direct module avoids. Match the exact specifier resolved by production code.

## Environment variables and dates before module import

Some modules read configuration or construct clients at import time. \`vi.hoisted\` can set process state before the transformed imports, but restore it after the suite and avoid leaking across files in the same worker.

\`\`\`typescript
const originalRegion = process.env.APP_REGION;

vi.hoisted(() => {
  process.env.APP_REGION = 'test-region';
});

afterAll(() => {
  if (originalRegion === undefined) delete process.env.APP_REGION;
  else process.env.APP_REGION = originalRegion;
});
\`\`\`

For dates, \`vi.setSystemTime\` changes the clock but does not automatically enable fake timers in every usage pattern. Configure it according to Vitest's timer API and restore real timers. Better yet, avoid import-time client construction so ordinary \`beforeEach\` setup can control it.

## Virtual modules and aliases must resolve consistently

Vite aliases can be used in \`vi.mock()\`, but the specifier must resolve to the same module identity used by the subject. If tests mock \`@/mailer\` while production reaches the file through a different package export, two module records may exist. Inspect the Vite resolve configuration before blaming hoisting.

For a module that does not exist on disk, Vitest can mock a virtual import when Vite is configured to resolve or externalize it appropriately. That is a resolver problem first. A hoisted factory cannot repair “module not found.” Keep test aliases synchronized with TypeScript \`paths\` and runtime package exports.

Monorepos add duplicate-package risk. If two workspace paths load separate copies of a singleton library, mocking one copy will not affect the other. Use dependency inspection and resolved IDs to confirm there is one target.

## Avoid assertions inside a mock factory

Factories run during module loading, before test hooks and often before the active test is obvious. Throwing an expectation there produces collection failures that can mark every test in the file broken. Return a valid module from the factory, then assert calls in the test.

If an export should never be used, return a mock that throws when called:

\`\`\`typescript
const mocks = vi.hoisted(() => ({
  forbiddenRead: vi.fn(() => {
    throw new Error('unexpected production configuration read');
  }),
}));

vi.mock('./production-config', () => ({
  readProductionConfig: mocks.forbiddenRead,
}));
\`\`\`

Now the failure points at the production call path inside a named test. A later test can replace the implementation when it intentionally exercises that branch.

## Mock getters with property-aware APIs

Modules and configuration objects sometimes expose getters. Replacing a copied value may not affect reads from the original property. For an ordinary object, use \`vi.spyOn(object, 'property', 'get')\` and restore it after the test. For ESM exports, namespace mutability depends on the Vitest environment, especially Browser Mode.

Do not destructure a getter before installing the spy; destructuring evaluates and stores the current value. Import the namespace, install the spy, and make the subject read through that namespace or a passed object. This is evaluation timing, but it is distinct from \`vi.mock\` hoisting.

## Verify the fix with isolation, not only one green run

Run the file alone, in the full suite, and with a reversed or randomized test order if available. A correct hoisting fix can still retain mock implementations between tests. Add one test that uses a non-default response and another that expects the reset default. Their independence proves cleanup.

Also run under the CI pool mode. Threads, forks, and Browser Mode have different module isolation boundaries. A setup-file import may be harmless in a fresh process but cached in a reused worker. The goal is a mock lifecycle that matches the production test environment, not just an editor's single-test command.

## Frequently Asked Questions

### Why does moving my mock variable above \`vi.mock()\` not help?

Vitest hoists recognized \`vi.mock()\` registrations before ordinary top-level initialization. Source position does not move a normal \`const\` into the hoisted phase.

### Can \`vi.hoisted()\` use an imported helper?

Not through a static import, because imports are unavailable then. Use self-contained values, initialize later, or cautiously use an async callback with dynamic import.

### When should I choose \`vi.doMock()\`?

Choose it when the factory must close over runtime or per-test state. Register it before a dynamic import of the subject and manage the module cache between tests.

### Does \`vi.resetModules()\` remove registered mocks?

No. It clears cached modules so they can be reevaluated. Use the appropriate unmock API when the mock registration itself must be removed.

### Why is my default export undefined after fixing the ReferenceError?

The factory probably returned named keys only. A mocked module with a default export needs a \`default\` property in the returned factory object.
`,
};
