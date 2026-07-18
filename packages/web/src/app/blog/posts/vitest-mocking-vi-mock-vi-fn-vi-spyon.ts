import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest Mocking: vi.mock, vi.fn, and vi.spyOn',
  description:
    'Learn Vitest mocking with vi.mock, vi.fn, and vi.spyOn: module isolation, spy assertions, hoisting rules, and patterns that keep unit tests honest.',
  date: '2026-07-18',
  category: 'Guide',
  content: `
# Vitest Mocking: vi.mock, vi.fn, and vi.spyOn

Vitest gives you a Jest-familiar mocking surface under the \`vi\` namespace. The three tools teams reach for first are \`vi.mock\` (replace a module), \`vi.fn\` (build a mock function), and \`vi.spyOn\` (wrap an existing method while tracking calls). Used well, they let you unit-test pure logic without hitting the network. Used poorly, they freeze the wrong dependency and ship tests that pass while production burns.

This guide is module-by-module practical: when to mock, how Vitest hoists \`vi.mock\`, how to assert call shapes, and how to restore state so workers stay clean. For runner-level context, see the [JavaScript testing frameworks complete guide 2026](/blog/javascript-testing-frameworks-complete-guide-2026). If you are moving an existing Jest suite, pair this with the [Jest to Vitest migration guide](/blog/jest-to-vitest-migration-guide).

## Mental model: mock function vs module vs spy

| API | What it replaces | Keeps original implementation? | Best for |
|-----|------------------|--------------------------------|----------|
| \`vi.fn()\` | Nothing until you pass it in | N/A (you invent the function) | Injecting collaborators, capturing callbacks |
| \`vi.spyOn(obj, 'method')\` | A method on an existing object | Yes by default (tracks calls) | Observing real methods, optionally stubbing return values |
| \`vi.mock('./mod')\` | The entire module graph entry | Only if you importOriginal / partial mock | Cutting off I/O modules (HTTP clients, fs, DB drivers) |

Rule of thumb: prefer the smallest tool. If you only need to know a callback fired, use \`vi.fn\`. If the object already exists, \`vi.spyOn\`. Reach for \`vi.mock\` when imports are hard-wired inside the unit under test.

## vi.fn: mock functions you control

\`vi.fn\` creates a callable mock that records every invocation.

\`\`\`ts
import { describe, it, expect, vi } from 'vitest';

type Mailer = { send: (to: string, body: string) => Promise<void> };

function notifyAdmin(mailer: Mailer, message: string) {
  return mailer.send('admin@example.com', message);
}

describe('notifyAdmin', () => {
  it('sends to the admin address', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await notifyAdmin({ send }, 'disk 90%');

    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith('admin@example.com', 'disk 90%');
  });
});
\`\`\`

Common configuration chains (all standard on Vitest's mock functions):

- \`mockReturnValue(value)\` / \`mockReturnValueOnce(value)\`
- \`mockResolvedValue(value)\` / \`mockRejectedValue(err)\` for async
- \`mockImplementation((...args) => { ... })\` when logic depends on input

Assert with matchers such as \`toHaveBeenCalled\`, \`toHaveBeenCalledWith\`, \`toHaveBeenCalledTimes\`, and \`toHaveBeenLastCalledWith\`. Prefer one strong assertion on arguments over five weak ones on call count alone.

### Partial argument matching

When payloads include volatile fields (timestamps, generated ids), assert the stable slice:

\`\`\`ts
import { describe, it, expect, vi } from 'vitest';

it('posts order with stable fields', async () => {
  const post = vi.fn().mockResolvedValue({ ok: true });
  await post({ id: 'gen-1', sku: 'ABC', qty: 2 });

  expect(post).toHaveBeenCalledWith(
    expect.objectContaining({ sku: 'ABC', qty: 2 }),
  );
});
\`\`\`

\`expect.objectContaining\` and \`expect.any(Type)\` keep tests focused on contracts, not incidental data.

## vi.spyOn: observe or stub existing methods

Spies attach to methods already on an object (including prototypes and some globals, depending on environment).

\`\`\`ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as clock from '../src/clock';
import { greeting } from '../src/greeting';

describe('greeting', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the hour from clock.now', () => {
    vi.spyOn(clock, 'now').mockReturnValue(new Date('2026-07-18T09:00:00Z'));
    expect(greeting()).toMatch(/morning/i);
  });
});
\`\`\`

Defaults matter:

- A fresh spy records calls but still runs the original implementation until you mock a return value or implementation.
- \`mockRestore()\` on the spy (or \`vi.restoreAllMocks()\`) puts the original back. Call this in \`afterEach\` so spies do not leak across files when Vitest reuses a worker.
- Spying on a non-function property throws; spy on methods, not plain data fields.

### Spying on Date or Math in jsdom/node

Tests that freeze time often spy on \`Date\` methods or use Vitest's fake timers APIs. Prefer the documented fake timers helpers when you need broad timer control (\`vi.useFakeTimers\`, \`vi.setSystemTime\` where available in your version). Reach for a narrow \`vi.spyOn\` when only one helper module should freeze. Always restore timers and spies in teardown.

## vi.mock: replace modules at the boundary

\`vi.mock\` tells Vitest to serve a mock factory for a module id. Factories are **hoisted** to the top of the file, so they run before normal imports. That hoisting is the number one source of confusion for people coming from hand-rolled stubs.

\`\`\`ts
import { describe, it, expect, vi } from 'vitest';
import { fetchUser } from '../src/userService';
import { http } from '../src/http';

vi.mock('../src/http', () => ({
  http: {
    get: vi.fn(),
  },
}));

describe('fetchUser', () => {
  it('maps the API payload', async () => {
    vi.mocked(http.get).mockResolvedValue({ id: 'u1', name: 'Ada' });
    await expect(fetchUser('u1')).resolves.toEqual({ id: 'u1', name: 'Ada' });
    expect(http.get).toHaveBeenCalledWith('/users/u1');
  });
});
\`\`\`

Practices that keep module mocks maintainable:

- Mock the **closest boundary** you own (\`http\` wrapper), not a deep third-party package internals, when possible.
- Use \`vi.mocked(fn)\` (or equivalent typing helpers) for TypeScript-friendly mock fields.
- Reset call history between tests with \`vi.clearAllMocks()\` and restore implementations with \`vi.resetAllMocks()\` / \`vi.restoreAllMocks()\` according to whether you need implementations cleared or originals restored. Learn the difference once; misuse is a common flake source.

### Partial mocks with importOriginal

When you need most of a module real but one export fake, use an async factory that spreads the original. Vitest documents patterns for importing the original module inside the mock factory. Keep the surface small: override one export, leave the rest intact. Over-broad partial mocks become implicit integration tests.

## Hoisting traps AI agents hit

Because \`vi.mock\` is hoisted, code like this surprises people:

\`\`\`ts
const response = { ok: true }; // not initialized when factory runs the way you think
vi.mock('./api', () => ({
  get: () => response, // fragile: factory timing vs local bindings
}));
\`\`\`

Safer patterns:

1. Define return values inside each \`it\` via \`mockResolvedValue\` on an exported \`vi.fn\`.
2. Use \`vi.hoisted(() => { ... })\` when you need shared mock handles created before imports (Vitest provides hoisted helpers for this exact problem). Put only mock function creation there, not test data that changes per case.
3. Do not close over \`let\` values that are assigned later unless you understand the hoisting rules documented for your Vitest version.

## clear vs reset vs restore

| Helper | Call history | Mock implementation | Original method (spies) |
|--------|--------------|---------------------|-------------------------|
| \`vi.clearAllMocks()\` | Cleared | Kept | Still mocked if stubbed |
| \`vi.resetAllMocks()\` | Cleared | Reset to empty mock impl | Implementations reset per Vitest rules |
| \`vi.restoreAllMocks()\` | Cleared | Removed for spies | Original restored |

Practical suite default:

\`\`\`ts
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
\`\`\`

Tune if a file intentionally keeps a module mock implementation for all tests and only needs call history cleared: then \`clearAllMocks\` alone in \`afterEach\` may be enough. Document the choice at the top of the file so the next engineer (or agent) does not "fix" it.

## Mocking network without lying to yourself

Unit tests should not need a live API. Still, mock at the right layer:

| Layer | Technique | Risk if overused |
|-------|-----------|------------------|
| Injected port / interface | \`vi.fn\` passed into constructor | Low: design stays testable |
| Internal http helper module | \`vi.mock('./http')\` | Medium: can drift from real client options |
| Global \`fetch\` | \`vi.stubGlobal('fetch', vi.fn())\` or spy | Medium: must restore; affects other code in the worker |
| Full MSW-style server | Separate integration project | Higher setup cost, higher realism |

Example of stubbing global fetch carefully:

\`\`\`ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadConfig } from '../src/loadConfig';

describe('loadConfig', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('parses JSON config', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ featureX: true }),
      }),
    );

    await expect(loadConfig()).resolves.toEqual({ featureX: true });
  });
});
\`\`\`

Assert that \`fetch\` received the URL and method your production code should use. A mock that ignores the request shape lets regressions through.

## ESM, path aliases, and automock limits

Vitest is ESM-first. Module mocks interact with how your project resolves \`@/\` aliases and virtual modules. When a mock "does nothing":

1. Confirm the mock path string matches the import path the unit under test uses (\`../http\` vs \`@/http\`).
2. Confirm the factory exports the same names (named vs default) the production module provides.
3. Confirm the file is included in Vitest's pipeline (not externalized in a way that bypasses transforms).

Do not invent config keys. Copy \`resolve.alias\` and test config from your existing \`vitest.config.ts\` / Vite config and adjust paths only.

## Decision flow for QA engineers

1. Can I pass a fake collaborator into the function? -> \`vi.fn\`, no module mock.
2. Do I need to ensure a real method was touched? -> \`vi.spyOn\`, keep implementation if possible.
3. Is the dependency imported deep inside the module with no seam? -> introduce a seam later; short term \`vi.mock\` the boundary module.
4. Am I testing the HTTP client itself? -> do not mock it; hit a local test server or contract fixture instead.
5. Is this an E2E flow? -> stop. Use Playwright or similar; Vitest mocks will not save a broken UI path.

That last point keeps unit suites fast. End-to-end confidence comes from browser tests, not from \`vi.mock\` on everything under \`src/\`.

## Anti-patterns that inflate coverage and hide bugs

- Mocking the unit under test. You are testing the mock.
- Re-implementing half the module in the factory. Prefer thin stubs.
- Leaving spies on \`console.error\` that swallow useful failure output in CI without asserting they were called.
- Sharing mutable mock state across tests without reset when \`isolate\` / pool settings reuse workers.
- Snapshotting entire mock call arrays when a single \`toHaveBeenCalledWith\` would document the contract better.

## Wiring this into agent-assisted workflows

AI coding agents love to add \`vi.mock\` for every import. Push them (and human reviewers) toward dependency injection first. When you want packaged prompts and checklists for review gates, ready-made QA skills install from qaskills.sh with the qaskills CLI; use them to standardize "mock only at boundaries" reviews across repos.

Run focused files while iterating:

\`\`\`bash
npx vitest run src/userService.test.ts
npx vitest run -t "maps the API payload"
\`\`\`

Watch mode (\`npx vitest\`) is fine locally; CI should use \`vitest run\` for a single pass with a clear exit code.

## Frequently Asked Questions

### When should I choose vi.spyOn over vi.fn?

Use \`vi.fn\` when you create the collaborator in the test and pass it in. Use \`vi.spyOn\` when the object already exists (module namespace import, class prototype, or service singleton) and you want to record or stub one method without replacing the whole module. If you find yourself assigning \`obj.method = vi.fn()\` manually, a spy is usually clearer and easier to restore.

### Why is my vi.mock factory unable to see variables declared in the test file?

Vitest hoists \`vi.mock\` calls so they run before imports and before normal variable initialization in the file body. Local \`const\` values declared below or even above the mock in source text may not be available the way a linear read suggests. Create mock functions with \`vi.hoisted\`, or configure behavior inside each test via \`mockImplementation\` on a hoisted \`vi.fn\`, following Vitest's current hoisting docs for your version.

### Do vi.mock calls apply to every test file?

A \`vi.mock\` in a test file affects module loading for that test file's graph according to Vitest's module isolation rules. Do not assume a mock in \`a.test.ts\` applies to \`b.test.ts\`. Shared mock setup belongs in a carefully reviewed helper or setup file only when every suite truly needs the same boundary fake. Prefer local mocks for clarity.

### How do I assert a mock was not called?

Use \`expect(fn).not.toHaveBeenCalled()\` or \`toHaveBeenCalledTimes(0)\`. Pair that with tests that cover the branch where it *should* be called, or you only prove a no-op path. For spies on logging or metrics, asserting both the called and not-called branches documents the product rule instead of a single negative check.
`,
};
