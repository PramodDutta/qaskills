import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest vi.hoisted: The Complete Guide to the Hoisting Trap',
  description: 'Use this Vitest vi.hoisted guide to fix mock initialization errors, share spies safely, control module imports, and keep agent-written tests deterministic.',
  date: '2026-07-18',
  category: 'Guide',
  content: `
# Vitest vi.hoisted: The Complete Guide to the Hoisting Trap

The confusing Vitest failure often looks impossible: a variable is declared above \`vi.mock()\`, yet the mock factory reports that the variable cannot be accessed before initialization. The source file reads top to bottom, but Vitest must arrange mock registration before static imports execute. What you see is not the effective evaluation order.

\`vi.hoisted()\` provides a deliberate place to create values before mocked modules are imported. It solves a narrow ordering problem. Used everywhere, it makes tests harder to reason about. This guide shows the trap, the correct pattern, alternatives, and review rules for AI-generated Vitest suites. For wider runner context, consult the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). For runner selection and migration tradeoffs, use the [Jest versus Vitest comparison](/blog/jest-vs-vitest-2026).

## Reconstruct the order Vitest needs

Static ESM imports normally execute before the rest of a module body. Mocking an imported dependency therefore requires Vitest to discover and register \`vi.mock()\` before the target module is evaluated. Vitest transforms supported test files so mock calls can take effect before imports.

Think in phases rather than source lines:

| Effective phase | What happens | What is safely available |
|---|---|---|
| Hoisted setup | \`vi.hoisted()\` callbacks run | Values created inside that callback and safe globals |
| Mock registration | Hoisted \`vi.mock()\` factories provide replacements | Hoisted values, not ordinary later bindings |
| Module evaluation | Static imports and their dependency graphs execute | Mocked dependency behavior is already installed |
| Test definition and execution | Suite hooks and tests run | Normal module bindings, fixtures, and mock controls |

This model explains why moving a declaration a few lines upward does not help. A normal \`const\` still belongs to module evaluation, while the transformed mock needs its value earlier.

## Reproduce the temporal dead zone failure

Suppose a notification service imports a mail gateway. The test wants a shared spy so it can configure and inspect the mocked gateway.

\`\`\`ts
// notification.ts
import { sendMail } from './mail-gateway';

export async function sendWelcome(email: string) {
  const result = await sendMail({
    to: email,
    template: 'welcome',
  });

  return { queued: result.id.length > 0 };
}
\`\`\`

The intuitive test below is unsafe. Vitest hoists the mock behavior, but \`sendMailMock\` is an ordinary lexical binding that has not been initialized at the effective time the factory uses it.

\`\`\`ts
import { describe, expect, it, vi } from 'vitest';
import { sendWelcome } from './notification';

const sendMailMock = vi.fn();

vi.mock('./mail-gateway', () => ({
  sendMail: sendMailMock,
}));

describe('sendWelcome', () => {
  it('reports a queued message', async () => {
    sendMailMock.mockResolvedValue({ id: 'msg-41' });
    await expect(sendWelcome('qa@example.test')).resolves.toEqual({ queued: true });
  });
});
\`\`\`

Depending on the exact test and transform, the error may mention access before initialization or a mock-factory problem. Do not “fix” it with \`var\`. That changes the early value to \`undefined\` and merely moves the failure to a less informative place.

## Return shared spies from vi.hoisted

Create the shared value in a \`vi.hoisted()\` callback, return it, and reference that returned binding from the mock factory and tests. Vitest makes the callback's result available for the transformed mock setup.

\`\`\`ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendWelcome } from './notification';

const mocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
}));

vi.mock('./mail-gateway', () => ({
  sendMail: mocks.sendMail,
}));

describe('sendWelcome', () => {
  beforeEach(() => {
    mocks.sendMail.mockReset();
  });

  it('sends the welcome template to the requested address', async () => {
    mocks.sendMail.mockResolvedValue({ id: 'msg-41' });

    const result = await sendWelcome('qa@example.test');

    expect(result).toEqual({ queued: true });
    expect(mocks.sendMail).toHaveBeenCalledWith({
      to: 'qa@example.test',
      template: 'welcome',
    });
  });
});
\`\`\`

Returning one named object scales better than several unrelated hoisted declarations. The object makes shared mock infrastructure visible and reduces naming collisions when an agent adds another dependency.

The callback should be small and deterministic. It is initialization, not a hidden fixture hook. Per-test return values belong in \`beforeEach\` or the test itself, where ordering and cleanup are obvious.

## Know what a hoisted callback cannot safely read

A \`vi.hoisted()\` callback runs before ordinary imports are available. Do not reference an imported helper, a normal top-level constant, or a value calculated later in the file. Even if the declaration appears visually earlier than the callback, it does not belong to the hoisted phase.

| Value referenced inside callback | Safe pattern? | Better placement |
|---|---|---|
| \`vi.fn()\` | Yes | Create shared mock functions in the callback |
| Literal object or primitive | Yes | Keep only stable mock initialization there |
| Imported factory | No | Construct after imports, or mock a lower boundary |
| Normal top-level \`const\` | No | Return the value from the callback or use it later |
| Per-test random ID | Poor fit | Create in a test or fixture hook |
| Environment-dependent test case | Poor fit | Read and validate in setup with explicit isolation |

This fails conceptually because \`makeGatewayResponse\` is imported during the later module phase:

\`\`\`ts
import { makeGatewayResponse } from './test-builders';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  response: makeGatewayResponse(),
  sendMail: vi.fn(),
}));
\`\`\`

Instead, hoist only the spy. Call the imported builder inside \`beforeEach\` or the individual test, then pass its result to \`mockResolvedValue\`. This preserves the builder's normal import semantics and makes scenario data local to the case.

## Separate mock identity from mock behavior

The hoisted phase usually needs only stable identity: the exact spy object exported by the replacement module. Behavior can change after imports and before each invocation. This distinction keeps tests flexible without reconstructing modules.

\`\`\`ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { priceOrder } from './pricing-service';

const gateway = vi.hoisted(() => ({
  getExchangeRate: vi.fn(),
}));

vi.mock('./exchange-gateway', () => ({
  getExchangeRate: gateway.getExchangeRate,
}));

describe('priceOrder', () => {
  beforeEach(() => {
    gateway.getExchangeRate.mockReset();
  });

  it('converts the subtotal using the returned rate', async () => {
    gateway.getExchangeRate.mockResolvedValue(0.5);

    await expect(priceOrder({ subtotal: 200, currency: 'EUR' }))
      .resolves.toEqual({ total: 100, currency: 'EUR' });
  });

  it('surfaces a gateway outage', async () => {
    gateway.getExchangeRate.mockRejectedValue(new Error('rate unavailable'));

    await expect(priceOrder({ subtotal: 200, currency: 'EUR' }))
      .rejects.toThrow('rate unavailable');
  });
});
\`\`\`

Resetting removes calls and queued implementations, which is useful when each case owns complete behavior. Clearing calls alone preserves implementations. Restoring is relevant to spies that replaced original object methods. Choose the operation that matches isolation needs instead of applying all mock cleanup methods reflexively.

## Use factory-local mocks when tests do not need the handle

Not every factory requires \`vi.hoisted()\`. If tests only need a fixed replacement and never configure or inspect its function, create it directly inside \`vi.mock()\`.

\`\`\`ts
import { expect, it, vi } from 'vitest';
import { buildAuditRecord } from './audit-service';

vi.mock('./clock', () => ({
  nowIso: vi.fn(() => '2026-07-18T09:30:00.000Z'),
}));

it('stamps an audit record with the controlled time', () => {
  expect(buildAuditRecord('LOGIN')).toEqual({
    event: 'LOGIN',
    occurredAt: '2026-07-18T09:30:00.000Z',
  });
});
\`\`\`

This is simpler because no external lexical binding crosses the transformed boundary. Use hoisting only when the test needs the same reference for configuration or verification, or when early setup is truly required.

## Choose vi.doMock when later dynamic import is the real requirement

\`vi.doMock()\` is not hoisted. It affects a subsequent dynamic import, not a module already loaded by a static import. This makes evaluation order explicit for cases that intentionally load the same module under different dependency behavior. It also requires careful module-cache isolation.

\`\`\`ts
import { expect, it, vi } from 'vitest';

it('loads the feature with the disabled configuration', async () => {
  vi.doMock('./feature-config', () => ({
    isEnabled: () => false,
  }));

  const { renderFeature } = await import('./feature-view');

  expect(renderFeature()).toBe('Feature unavailable');
});
\`\`\`

Do not add a static import of \`feature-view\` to that file, because it would evaluate before \`vi.doMock()\`. Also remember that imported modules are cached. If multiple cases need distinct module graphs, consult Vitest's module reset and isolation documentation, keep the pattern local, and verify the suite in random or isolated execution. Often the cleaner design is dependency injection: pass configuration or a gateway into a pure unit rather than rebuilding ESM graphs for every case.

| Requirement | Best starting tool | Reason |
|---|---|---|
| Fixed replacement, no test access needed | Factory-local \`vi.fn()\` | Minimal shared state |
| Shared spy used by factory and assertions | \`vi.hoisted()\` | Creates identity before mock registration |
| Replacement installed before a later dynamic import | \`vi.doMock()\` | Source order is intentional |
| Function already exists on an imported object | \`vi.spyOn()\` | Observes or replaces a concrete method |
| Many scenarios need different collaborators | Dependency injection | Avoids repeated module-graph manipulation |

## Debug the trap without trial-and-error rewrites

When a mocked suite fails during collection, temporarily ignore the test assertions and trace initialization.

1. Identify every static import in the failing test and the production module it loads.
2. Locate every \`vi.mock()\` and list external variables referenced by its factory.
3. Mark which variables come from ordinary \`const\` declarations or imports.
4. Move only the required shared mock identity into \`vi.hoisted()\`.
5. Put scenario behavior back in the test or \`beforeEach\`.
6. Run the single file, then the surrounding suite to reveal leaked state.

If the production module performs work at import time, such as constructing a client or reading configuration, the test becomes more sensitive to ordering. That may be a design signal. Moving side effects behind an explicit function can simplify production startup, testing, and agent-generated changes at once.

Avoid using sleeps, import reordering, \`var\`, or a broad catch around mock initialization. Those approaches conceal the phase mismatch. The correct fix makes the required early value intentionally early or removes the need for module-level mocking.

## Review agent-written mocks for false confidence

AI coding agents often recognize the error string and insert \`vi.hoisted()\` mechanically. Review the resulting test as a behavioral specification.

First, confirm the module specifier exactly matches the dependency imported by production code. Second, confirm the mock export shape matches named versus default imports. Third, make the test assert an observable result in addition to spy calls. A test that only checks \`toHaveBeenCalled()\` can pass even if the wrong arguments produce a broken user outcome.

Finally, inspect cleanup. Shared hoisted spies live for the test module, so call history and implementations can leak between cases unless reset deliberately. Prefer explicit defaults in each test over a large global implementation that makes new cases pass accidentally.

The ready-made QA skills available from qaskills.sh through the qaskills CLI can give coding agents repository-aware testing guidance, but the generated diff still needs this ordering and isolation review.

## Frequently Asked Questions

### Does vi.hoisted move any arbitrary code above imports?

It runs the supplied callback in Vitest's early transformed phase and returns values that can be used by hoisted mock setup. That does not make imported bindings available early, and it should not become a general pre-import script container. Keep the callback limited to deterministic values that genuinely must exist before mock registration, most commonly shared \`vi.fn()\` identities.

### Why not declare the mock with var to avoid the initialization error?

\`var\` is initialized to \`undefined\` earlier than a lexical \`const\`, so it may remove the temporal dead zone message. It does not create the spy before the factory needs it. The mock export may become undefined, producing a later and more misleading “not a function” failure. \`vi.hoisted()\` solves the ordering explicitly and preserves a stable, typed reference.

### Can a vi.hoisted callback use an imported test-data builder?

No, ordinary static imports are not available in that earlier phase. Hoist the mock function, then call the imported builder inside \`beforeEach\` or the test and assign its result with \`mockReturnValue\` or \`mockResolvedValue\`. This keeps scenario construction readable and prevents the builder's own dependency graph from becoming part of mock initialization.

### When is dependency injection cleaner than module mocking?

Prefer dependency injection when many tests need different implementations, module-cache resets become routine, or production imports perform side effects. Passing a gateway, clock, or configuration into a function makes test order explicit and usually eliminates hoisting concerns. Module mocking remains useful at established boundaries and for code you cannot redesign, but it should not compensate for a module whose collaborators are impossible to control through a stable public API.
`,
};
