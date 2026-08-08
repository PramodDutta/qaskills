import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest Mock Reset Between Suites: Stop State Leakage Without Hiding Bugs',
  description: 'Master Vitest mock reset between suites with clear, reset, restore, and module-cache patterns that prevent order-dependent failures without erasing intent.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Vitest Mock Reset Between Suites: Stop State Leakage Without Hiding Bugs

For reliable Vitest mock reset between suites, choose cleanup based on the state that leaked. Use \`vi.clearAllMocks()\` to remove call history while retaining implementations, \`vi.resetAllMocks()\` to clear history and reset implementations, \`vi.restoreAllMocks()\` to put methods replaced by \`vi.spyOn()\` back on their original objects, and \`vi.resetModules()\` when cached module state must be reevaluated. These operations solve different problems.

Most teams should establish a default cleanup boundary before each test, then configure exceptional mocks locally. “Suite” is often used loosely to mean a \`describe\` block, a test file, or the full run. Vitest’s automatic mock options run around individual tests, which is the safest useful boundary. Resetting only between files still allows two tests in the same file to contaminate one another.

The goal is not maximum cleanup. It is deterministic ownership: each test declares the behavior it needs, observes only its own calls, and leaves spied objects intact for the next test. Excessive resetting can be as misleading as no resetting because it silently replaces useful defaults with \`undefined\`.

## Identify the four independent kinds of leaked state

When a later test fails only after an earlier one runs, inspect what changed. A mock carries call records and an implementation. A spy also changes a property descriptor on an object. An imported module can hold cached state that exists outside any mock. One cleanup function cannot accurately reverse all four.

| Leaked state | Symptom in the next test | Correct tool | What remains |
|---|---|---|---|
| Calls, arguments, results | \`toHaveBeenCalledTimes\` sees old calls | \`vi.clearAllMocks()\` | Mock implementation |
| Mock implementation or once queue | Next test receives a previous stubbed value | \`vi.resetAllMocks()\` | Spy wrapper remains attached |
| Spied property descriptor | Real object method is still replaced | \`vi.restoreAllMocks()\` | Current Vitest does not use this as history cleanup |
| Module evaluation cache | Module-level singleton or counter persists | \`vi.resetModules()\` plus dynamic import | Mock registry |

Start diagnosis by naming the state. “Mocks are dirty” is too vague to choose a safe remedy. If only the call count leaked, resetting the implementation adds unnecessary setup. If a global method remains spied, clearing calls does nothing to restore the object.

The current API behavior is documented at https://vitest.dev/api/vi and https://vitest.dev/api/mock. In particular, modern Vitest restoration semantics differ from older examples that treat restore as a universal clear-and-reset operation. Build policy around the version your project actually runs.

## Reproduce an order-dependent failure before fixing it

A useful reproduction has two tests that pass individually but fail together. Consider an order service that receives an injected notifier:

\`\`\`ts
// src/order-service.ts
export type Notifier = (message: string) => Promise<void>;

export async function submitOrder(
  orderId: string,
  notify: Notifier,
): Promise<{ orderId: string; status: "submitted" }> {
  await notify("order:" + orderId);
  return { orderId, status: "submitted" };
}
\`\`\`

The following test file leaks call history. The notifier is created once at module scope, so both tests share the same mock object:

\`\`\`ts
// src/order-service.leaky.test.ts
import { describe, expect, it, vi } from "vitest";
import { submitOrder } from "./order-service";

const notify = vi.fn(async (_message: string): Promise<void> => undefined);

describe("retail orders", () => {
  it("notifies for a retail order", async () => {
    await submitOrder("retail-1", notify);
    expect(notify).toHaveBeenCalledTimes(1);
  });
});

describe("wholesale orders", () => {
  it("notifies for a wholesale order", async () => {
    await submitOrder("wholesale-1", notify);
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
\`\`\`

Run the file together and the second assertion sees two calls. Reverse the block order and the other test fails. That order sensitivity is strong evidence of shared mutable test state, not a production defect. Do not “fix” it by changing the assertion to \`toHaveBeenCalled()\`; doing so discards a meaningful contract about exactly one notification.

Add an explicit call-history boundary:

\`\`\`ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitOrder } from "./order-service";

const notify = vi.fn(async (_message: string): Promise<void> => undefined);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("retail orders", () => {
  it("notifies for a retail order", async () => {
    await submitOrder("retail-1", notify);
    expect(notify).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith("order:retail-1");
  });
});

describe("wholesale orders", () => {
  it("notifies for a wholesale order", async () => {
    await submitOrder("wholesale-1", notify);
    expect(notify).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith("order:wholesale-1");
  });
});
\`\`\`

The implementation remains the async function originally passed to \`vi.fn\`, while each test receives fresh history. That is exactly what this fixture needs.

## Use clear when the default implementation is part of the fixture

\`vi.clearAllMocks()\` calls \`mockClear()\` on known spies and mocks. It removes calls, results, instances, and related history without changing the implementation. This is the least disruptive global cleanup and a good default when module-level mocks have deliberate baseline behavior.

| Scenario | Clear is appropriate? | Reason |
|---|---:|---|
| Shared mock has a stable default implementation | Yes | Tests retain the fixture behavior |
| A test uses \`mockReturnValueOnce\` only for its own call | Usually yes | Consumed once values do not affect later tests |
| A test calls \`mockImplementation\` without restoring it | No | The replacement implementation survives clear |
| A test spies on \`Date.now\` | No | The object descriptor remains replaced |

Clear in \`beforeEach\` rather than \`afterEach\` when you want every test to begin from a known condition even if a previous cleanup hook did not complete. Cleanup in \`afterEach\` can still be useful for resources that must be released promptly. The important property is one consistent ownership boundary, not ritual preference.

You can enable the same call-history policy centrally:

\`\`\`ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
  },
});
\`\`\`

Vitest documents \`clearMocks\` as calling \`vi.clearAllMocks()\` before each test. It is disabled by default. Be careful with concurrent tests that share mocks: automatic cleanup can run while another concurrent test is still using the same mock. The better design is to avoid shared mocks across concurrent tests, not to race a cleanup hook against active assertions.

## Use reset when tests replace implementations

\`vi.resetAllMocks()\` clears history and invokes each mock’s reset behavior. In current Vitest, a mock created with \`vi.fn(implementation)\` resets to that original implementation. A bare \`vi.fn()\` resets to an empty function returning \`undefined\`. A spy’s reset behavior retains the spy while returning its implementation to the original method.

This is stronger than clear. It is appropriate when tests install persistent implementations with \`mockImplementation\`, \`mockResolvedValue\`, or similar APIs and might forget to undo them. The cost is that bare module mocks need their expected defaults re-established after the reset.

Here is a complete module mock with a deliberate per-test baseline:

\`\`\`ts
// src/payment-gateway.ts
export async function authorize(_cents: number): Promise<{ approved: boolean }> {
  throw new Error("Real gateway is not available in unit tests");
}
\`\`\`

\`\`\`ts
// src/checkout.ts
import { authorize } from "./payment-gateway";

export async function checkout(cents: number): Promise<"paid" | "declined"> {
  const result = await authorize(cents);
  return result.approved ? "paid" : "declined";
}
\`\`\`

\`\`\`ts
// src/checkout.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorize } from "./payment-gateway";
import { checkout } from "./checkout";

vi.mock("./payment-gateway", () => ({
  authorize: vi.fn(),
}));

const authorizeMock = vi.mocked(authorize);

beforeEach(() => {
  vi.resetAllMocks();
  authorizeMock.mockResolvedValue({ approved: true });
});

describe("checkout", () => {
  it("uses the approved baseline", async () => {
    await expect(checkout(2500)).resolves.toBe("paid");
    expect(authorizeMock).toHaveBeenCalledWith(2500);
  });

  it("can override one case", async () => {
    authorizeMock.mockResolvedValue({ approved: false });
    await expect(checkout(2500)).resolves.toBe("declined");
  });

  it("returns to the baseline in the next test", async () => {
    await expect(checkout(2500)).resolves.toBe("paid");
  });
});
\`\`\`

The order in \`beforeEach\` is intentional: reset first, then apply the test baseline. If the order is reversed, reset erases the newly configured result. This tiny sequencing error often produces mysterious \`Cannot read properties of undefined\` failures when production code expects an object.

## Restore spies that mutate real objects

A spy created with \`vi.spyOn(object, key)\` wraps an existing property. Clearing or resetting the spy does not necessarily give the object its original descriptor back. Use restoration when the test should leave the real object untouched.

Current Vitest’s \`vi.restoreAllMocks()\` restores original implementations on spies created manually with \`vi.spyOn()\`. It does not affect automocked modules, and it is not a substitute for clearing history. If a test retains the old spy reference after restoration and changes it, that reference is no longer installed on the object.

A narrow spy is easy to reason about:

\`\`\`ts
import { afterEach, expect, it, vi } from "vitest";

function createAuditLine(event: string): string {
  return String(Date.now()) + ":" + event;
}

afterEach(() => {
  vi.restoreAllMocks();
});

it("uses the current clock value", () => {
  vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
  expect(createAuditLine("login")).toBe("1700000000000:login");
});

it("has the real Date.now implementation again", () => {
  expect(typeof Date.now()).toBe("number");
});
\`\`\`

For a single spy, calling \`mockRestore()\` directly makes ownership even clearer. Global restoration is useful as a safety net for files that create several spies. Do not keep a spy in a shared constant and expect to reuse it after global restoration. Create it again in the test or its setup hook.

## Reset module cache only for actual module state

Mocks are not the only source of order dependence. An ES module may initialize a singleton, counter, configuration snapshot, or in-memory registry at evaluation time. \`vi.clearAllMocks()\` and \`vi.resetAllMocks()\` do not reevaluate that module. Use \`vi.resetModules()\` and import the module dynamically after the reset.

\`\`\`ts
// src/id-sequence.ts
let nextId = 1;

export function allocateId(): number {
  const allocated = nextId;
  nextId += 1;
  return allocated;
}
\`\`\`

\`\`\`ts
// src/id-sequence.test.ts
import { beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

it("starts at one in the first test", async () => {
  const sequence = await import("./id-sequence");
  expect(sequence.allocateId()).toBe(1);
  expect(sequence.allocateId()).toBe(2);
});

it("reevaluates after the module cache reset", async () => {
  const sequence = await import("./id-sequence");
  expect(sequence.allocateId()).toBe(1);
});
\`\`\`

Top-level static imports have already been evaluated and cannot be reevaluated by a later reset. That is why the example imports inside each test. Also, \`vi.resetModules()\` does not clear the mock registry. If both module state and mock behavior need cleanup, invoke the corresponding operations explicitly rather than assuming one implies the other.

Before reaching for cache reset, consider dependency injection. Passing a registry or clock into a unit is faster and more transparent than rebuilding a module graph. Reserve module reset for code whose evaluation semantics are specifically under test or legacy state that cannot yet be injected.

## Scope cleanup to nested describe blocks without surprises

Vitest hooks follow suite scope. A \`beforeEach\` declared inside a nested \`describe\` applies to tests in that suite and its descendants. Root-level hooks apply across the file. Put universal hygiene at the root or in a configured setup file, and put behavior defaults near the suite that owns them.

| Cleanup location | Coverage | Good use | Risk |
|---|---|---|---|
| Root config option | Every test in the project | Organization-wide call-history policy | Can surprise specialized or concurrent tests |
| Setup file root hook | Tests loading that setup file | Shared restoration and environment cleanup | Hidden behavior if setup is hard to discover |
| Test-file root hook | All tests in one file | File-owned module mock baseline | Repetition across many files |
| Nested \`describe\` hook | One behavioral context | Different defaults for admin and guest contexts | Sibling suites do not inherit it |

Avoid two cleanup layers that fight each other. For example, a project-wide \`mockReset: true\` runs before each test, then a nested hook might set a default. That is valid. A root hook that sets defaults before another root hook resets them is not. Hook declaration order becomes an invisible dependency.

The [complete guide to JavaScript testing frameworks](/blog/javascript-testing-frameworks-complete-guide-2026) can help when teams are translating lifecycle assumptions from Jest, Mocha, or another runner. Do not copy cleanup APIs by name alone, because similar names can have different current semantics.

## Configure a deliberate project-wide policy

Vitest exposes \`clearMocks\`, \`mockReset\`, and \`restoreMocks\` as test configuration options. Each is disabled by default. Enabling all three is rarely a thoughtful first choice. Decide whether the project mostly uses stable \`vi.fn(implementation)\` fixtures, bare module mocks with per-test defaults, or temporary spies on real objects.

A balanced unit-test project might clear history and restore manual spies automatically:

\`\`\`ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    restoreMocks: true,
    mockReset: false,
  },
});
\`\`\`

With that policy, tests that install persistent mock implementations must still reset them locally or prefer once-only overrides. Another project may set \`mockReset: true\` because almost every test redefines module-mock results in setup. Document the consequence beside the config: bare mocks return \`undefined\` until configured.

Do not use project configuration to compensate for poorly scoped globals. A mock exported from a test utility and shared across unrelated files makes ownership unclear. Prefer a factory that returns a fresh fixture object:

\`\`\`ts
import { vi } from "vitest";

export function createNotifierFixture() {
  const notify = vi.fn(async (_message: string): Promise<void> => undefined);
  return { notify };
}
\`\`\`

Each test can call the factory, eliminating most history leakage without any global operation. Factory fixtures are especially useful when tests run concurrently.

## Diagnose a failure that appears only in the full run

Imagine \`checkout.test.ts\` passes alone but fails after \`discounts.test.ts\` in the full project. The failure says \`result.approved\` was read from \`undefined\`. The team assumes file execution order caused one mock to leak into another. With default file isolation, that explanation may be wrong.

Start by reproducing within the smallest file set, then inspect the failing mock after setup. If the project recently enabled \`mockReset: true\`, the automatic reset may be erasing a bare module mock’s top-level \`mockResolvedValue\` before every test. The other file merely changes scheduling enough to expose or distract from the configuration change. Move the baseline into \`beforeEach\` after reset, as shown earlier.

Next inspect shared external state: environment variables, fake timers, open servers, temporary files, a database, and global objects. Mock APIs do not clean these resources. If a suite changes \`process.env\`, use Vitest’s environment stubbing helpers and corresponding cleanup, or save and restore the exact key. If it starts a server, close it in teardown. “Full-run only” does not automatically mean mock history.

This is what people get wrong: they add \`vi.resetAllMocks()\`, \`vi.restoreAllMocks()\`, and \`vi.resetModules()\` together until the suite turns green. The stack hides the responsible state, slows tests, and can erase the setup needed to detect a real bug. Add one operation that matches the reproduced leak, then preserve a regression test.

## Keep UI and browser concerns at the right layer

DOM component tests often combine module mocks with element queries. Resetting a network mock cannot fix a locator that selects by CSS structure, and restoring a spy cannot clean nodes left mounted in the document. Use the rendering library’s cleanup mechanism for DOM state and Vitest’s mock tools for mock state.

As the test moves toward a real browser, prefer user-visible selectors and network interception at the browser-runner layer. The [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) explain why role, label, and stable test contracts outlive structural selectors. Keep the unit suite focused on injected behavior, and let browser tests prove integration with the real DOM and navigation stack.

Do not share one mock policy blindly across Node unit tests, DOM emulation tests, and browser tests. Different project configurations can apply distinct setup files and cleanup rules. That separation makes the boundary visible and avoids loading browser-oriented globals into server tests.

## Review checklist for mock isolation changes

Before merging a cleanup change, answer these questions:

1. Which state leaked: calls, implementation, descriptor, module cache, or an external resource?
2. Can a fresh fixture factory remove the sharing instead of global cleanup?
3. Does the chosen API preserve the baseline implementation the next test expects?
4. Are hooks scoped at the file or \`describe\` level that owns the state?
5. Do concurrent tests touch the same mock?
6. Does the reproduction fail without the fix and pass with only the necessary fix?
7. Can tests run in reverse order and individually?
8. Is a top-level import preventing module reevaluation?

Run the affected file repeatedly and as part of the full project. Use Vitest’s \`-t\` or \`--testNamePattern\` only when narrowing by test name; do not borrow Mocha’s \`--grep\` flag. A focused run helps diagnosis, but the final verification must include the broader project where the leak originally appeared.

## Frequently Asked Questions

### Should I call vi.clearAllMocks or vi.resetAllMocks between tests?

Choose \`vi.clearAllMocks()\` when you only need fresh call history and want stable mock implementations to remain. Choose \`vi.resetAllMocks()\` when tests replace implementations or leave queued results that must not survive. After reset, explicitly install any baseline required by bare module mocks. A project can make clear the default and use reset in exceptional files. The correct choice follows the leaked state, not a belief that stronger cleanup is automatically safer.

### Does vi.restoreAllMocks reset module mocks too?

No. Current Vitest restoration targets original methods replaced by manual \`vi.spyOn()\` calls. It does not restore automocked modules, and it should not be treated as a call-history reset. Use clear or reset for mock state, restoration for changed object descriptors, and \`vi.resetModules()\` for module evaluation cache. If a test keeps a reference to a restored spy, changing that old reference does not reinstall it on the original object. Create a new spy when needed.

### Why does a mock return undefined after I enabled mockReset?

A bare \`vi.fn()\` has no baseline implementation, so resetting it leaves an empty function that returns \`undefined\`. Top-level values such as \`mockResolvedValue\` can be erased by the automatic reset before the test starts. Move the intended default into a \`beforeEach\` hook that runs after reset, or create the mock with a suitable original implementation when that accurately represents the fixture. Check hook order as well, because a later reset can erase a value configured moments earlier.

### Do isolated Vitest files eliminate the need for mock cleanup?

No. File isolation helps separate module environments across test files, but multiple tests and \`describe\` blocks inside one file still share module-scoped mock objects. Tests can also leak external resources such as servers, environment changes, databases, and files that runner isolation does not automatically reverse. Keep per-test ownership for calls and implementations, restore mutated globals, and tear down real resources. Treat file isolation as one boundary in the system, not as proof that every dependency starts clean.
`,
};
