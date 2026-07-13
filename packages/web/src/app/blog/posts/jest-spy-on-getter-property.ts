import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Spy on a Getter Property with Jest',
  description:
    'Spy on a getter property with Jest using accessType, preserve or replace computed behavior, verify reads precisely, and restore descriptors without test leakage.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Spy on a Getter Property with Jest

\`profile.displayName\` looks like a field read, yet accessing it can execute normalization logic, consult private state, increment instrumentation, or even throw. Replacing it with a plain value erases that behavior and changes the object's property descriptor. Jest gives accessor properties a dedicated spy form: \`jest.spyOn(object, 'propertyName', 'get')\`.

The third argument is the critical part. Without \`'get'\`, Jest assumes the property is a callable method. With it, Jest wraps the getter function stored in the descriptor, records every property read, and calls the real getter unless you provide a mock implementation or return value. That distinction lets a test observe computed-property use without rewriting the production object into a shape it never has at runtime.

## A getter is a descriptor, not a method value

JavaScript property access hides two different mechanisms behind the same syntax. A data property stores a value. An accessor property stores getter and optionally setter functions in its property descriptor.

\`\`\`typescript
class Subscription {
  constructor(
    private readonly plan: 'free' | 'team',
    private readonly seats: number,
  ) {}

  get monthlyPrice(): number {
    const seatPrice = this.plan === 'team' ? 18 : 0;
    return seatPrice * this.seats;
  }
}

const subscription = new Subscription('team', 4);
console.log(subscription.monthlyPrice); // invokes the getter and prints 72
\`\`\`

There is no \`subscription.monthlyPrice()\` method to replace. The getter normally lives on \`Subscription.prototype\`, while the instance inherits it. Inspecting descriptors makes the difference concrete:

\`\`\`typescript
const descriptor = Object.getOwnPropertyDescriptor(
  Subscription.prototype,
  'monthlyPrice',
);

console.log({
  hasGetter: typeof descriptor?.get === 'function',
  hasValue: Object.hasOwn(descriptor ?? {}, 'value'),
  enumerable: descriptor?.enumerable,
  configurable: descriptor?.configurable,
});
\`\`\`

Jest's accessor spy operates on that getter slot. It is related to a function spy, but the triggering operation is property access.

| Property shape | Test double approach | Trigger recorded |
|---|---|---|
| \`load()\` method | \`jest.spyOn(object, 'load')\` | Function call |
| \`get status()\` accessor | \`jest.spyOn(object, 'status', 'get')\` | Property read |
| \`set status(value)\` accessor | \`jest.spyOn(object, 'status', 'set')\` | Assignment |
| Writable data property | \`jest.replaceProperty(object, 'status', value)\` | No read-call tracking |
| Module function auto-mock | \`jest.mock(...)\` | Calls to mocked export |

Trying \`jest.spyOn(object, 'status')\` against a number or string leads Jest down the method path and produces an error because the value is not a function. The access type is not a TypeScript hint. It tells Jest which descriptor function to wrap.

## Observe a getter while preserving its computation

By default, a Jest spy calls the original implementation. That makes it ideal for verifying a collaborator reads a computed property while retaining the real output.

\`\`\`typescript
import { afterEach, describe, expect, jest, test } from '@jest/globals';

class Account {
  constructor(
    readonly firstName: string,
    readonly lastName: string,
  ) {}

  get displayName(): string {
    return \`\${this.lastName}, \${this.firstName}\`;
  }
}

function renderGreeting(account: Account): string {
  return \`Welcome, \${account.displayName}\`;
}

describe('renderGreeting', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('reads the computed display name once', () => {
    const account = new Account('Ada', 'Lovelace');
    const getter = jest.spyOn(account, 'displayName', 'get');

    expect(renderGreeting(account)).toBe('Welcome, Lovelace, Ada');
    expect(getter).toHaveBeenCalledTimes(1);
    expect(getter).toHaveReturnedWith('Lovelace, Ada');
  });
});
\`\`\`

Spying on the instance works because Jest can locate the inherited accessor and install an own spy descriptor for that object. The scope is narrow: other \`Account\` instances keep the original prototype getter. That is usually the safest choice when only one collaborator should be observed.

Be intentional about asserting the call count. Template rendering, logging, serializers, object inspectors, and framework change detection can read a getter more often than business code does. If the requirement is only that the value was consulted, \`toHaveBeenCalled()\` is less brittle. A precise count is valuable when the getter is expensive or repeated evaluation is itself the defect.

## Replace the computed result for one scenario

A getter spy is also a mock function, so \`mockReturnValue\`, \`mockReturnValueOnce\`, and \`mockImplementation\` are available. This is useful when the getter derives a condition that is difficult or irrelevant to arrange in the current unit test.

\`\`\`typescript
import { expect, jest, test } from '@jest/globals';

class FeatureContext {
  constructor(private readonly entitlements: string[]) {}

  get canExportAuditLog(): boolean {
    return this.entitlements.includes('audit-export');
  }
}

function exportButtonState(context: FeatureContext): 'enabled' | 'hidden' {
  return context.canExportAuditLog ? 'enabled' : 'hidden';
}

test('hides export when the computed entitlement is unavailable', () => {
  const context = new FeatureContext(['audit-export']);
  const getter = jest
    .spyOn(context, 'canExportAuditLog', 'get')
    .mockReturnValue(false);

  expect(exportButtonState(context)).toBe('hidden');
  expect(getter).toHaveBeenCalledTimes(1);

  getter.mockRestore();
  expect(context.canExportAuditLog).toBe(true);
});
\`\`\`

The production object was deliberately constructed with the entitlement, then the getter result was overridden. In a real suite, ask whether this setup communicates the scenario cleanly. If arranging \`entitlements: []\` is trivial and part of the unit's contract, use real state instead. Mocking the getter is most defensible when you are testing the consumer of the computed property and the computation belongs to another unit.

\`mockImplementation\` matters when the return depends on \`this\`, arguments are irrelevant because getters receive none, or the replacement should throw:

\`\`\`typescript
import { expect, jest, test } from '@jest/globals';

class CachedDocument {
  constructor(readonly id: string) {}

  get body(): string {
    return 'loaded content';
  }
}

test('converts getter failure into an unavailable result', () => {
  const document = new CachedDocument('doc-7');
  jest.spyOn(document, 'body', 'get').mockImplementation(() => {
    throw new Error('cache entry corrupt');
  });

  const readSafely = () => {
    try {
      return { available: true, body: document.body };
    } catch {
      return { available: false, body: null };
    }
  };

  expect(readSafely()).toEqual({ available: false, body: null });
});
\`\`\`

Do not use \`mockResolvedValue\` on a synchronous getter unless the production getter actually returns a promise. It would change the type and execution semantics.

## Decide whether to spy on the instance or prototype

The target determines blast radius. An instance spy affects one object. A prototype spy affects every instance that resolves the accessor through that prototype while the spy is installed.

| Target | Reach | Good use | Risk |
|---|---|---|---|
| Specific instance | One object | Verify one collaborator's read | Code may create a different instance internally |
| Class prototype | Existing and future instances without own override | Observe instances created inside the subject | Parallel or unrelated code can trigger the spy |
| Plain object | That object | Configuration or model literal | Descriptor may be non-configurable |
| Exported singleton | Every consumer of singleton | Legacy singleton collaboration | State leakage between tests |

Prototype spying is appropriate when the system under test constructs the object:

\`\`\`typescript
import { afterEach, expect, jest, test } from '@jest/globals';

class RuntimeFlags {
  get maintenanceMode(): boolean {
    return process.env.MAINTENANCE_MODE === 'true';
  }
}

function buildBanner(): string | null {
  const flags = new RuntimeFlags();
  return flags.maintenanceMode ? 'Maintenance in progress' : null;
}

afterEach(() => jest.restoreAllMocks());

test('shows the banner when newly-created flags report maintenance', () => {
  const getter = jest
    .spyOn(RuntimeFlags.prototype, 'maintenanceMode', 'get')
    .mockReturnValue(true);

  expect(buildBanner()).toBe('Maintenance in progress');
  expect(getter).toHaveBeenCalledTimes(1);
});
\`\`\`

Restore prototype spies promptly. Jest test files may execute tests sequentially within a worker, and a leaked prototype replacement can alter later cases in ways that depend on order. \`afterEach(jest.restoreAllMocks)\` is a sound default, though explicit restoration inside a test can make a mid-test transition visible.

## Sequence getter results without changing the object

Computed properties are sometimes sampled more than once, such as a readiness check followed by a render. \`mockReturnValueOnce\` can model that sequence:

\`\`\`typescript
import { expect, jest, test } from '@jest/globals';

const connection = {
  get state(): 'connecting' | 'ready' {
    return 'ready';
  },
};

function observeTwice(): string[] {
  return [connection.state, connection.state];
}

test('captures a connection transition across two reads', () => {
  const state = jest
    .spyOn(connection, 'state', 'get')
    .mockReturnValueOnce('connecting')
    .mockReturnValue('ready');

  expect(observeTwice()).toEqual(['connecting', 'ready']);
  expect(state.mock.results.map((result) => result.value)).toEqual([
    'connecting',
    'ready',
  ]);
});
\`\`\`

This is a unit-level state script, not a substitute for asynchronous integration testing. If production state changes because of events, test that transition in the owning class with real state updates. A sequence mock is useful for a consumer whose behavior depends only on successive observations.

Jest records each getter invocation with an empty argument list in \`mock.calls\`. \`toHaveBeenCalledWith\` adds little because getters have no call arguments. Inspect call count, returned values, or invocation ordering relative to another mock.

## Getters inherited through deeper prototype chains

Framework models and domain entities may inherit an accessor from a base class. The safest target is often still the instance. If you choose a prototype, spy on the prototype that owns the descriptor.

\`\`\`typescript
class Entity {
  constructor(readonly rawId: string) {}

  get canonicalId(): string {
    return this.rawId.trim().toLowerCase();
  }
}

class Invoice extends Entity {}

const invoice = new Invoice(' INV-9 ');
const owner = Object.getOwnPropertyDescriptor(Entity.prototype, 'canonicalId');
const child = Object.getOwnPropertyDescriptor(Invoice.prototype, 'canonicalId');

console.log(Boolean(owner?.get)); // true
console.log(child); // undefined
\`\`\`

\`jest.spyOn(Entity.prototype, 'canonicalId', 'get')\` observes every inheriting instance that has not shadowed the property. Spying on \`Invoice.prototype\` may fail because that prototype does not own the accessor. An instance target avoids needing to know the owner, but it cannot observe other instances.

Private fields do not prevent the original getter from running. The wrapper still invokes it with the correct receiver. A replacement implementation, however, should not attempt to access a JavaScript \`#private\` field from outside the class because the syntax and brand checks prevent it. Return a controlled value or use public behavior.

## Descriptor constraints and why assignment is fragile

Accessor spying requires a configurable property because Jest must redefine its descriptor. Class prototype accessors are normally configurable. Some library objects, DOM-like globals, and explicitly frozen objects are not.

Inspect before forcing a workaround:

\`\`\`typescript
const object = {};
Object.defineProperty(object, 'buildId', {
  configurable: false,
  enumerable: true,
  get: () => 'build-2026-07',
});

const descriptor = Object.getOwnPropertyDescriptor(object, 'buildId');
expect(descriptor).toMatchObject({
  configurable: false,
  enumerable: true,
});
\`\`\`

Jest cannot safely install and later restore a spy on that getter. Redesign the seam: wrap the external object in a module you own, inject a function, or test observable behavior without spying. Do not mutate library internals with undocumented descriptor tricks.

Direct assignment is unreliable for accessors. In strict mode, assigning to a getter-only property can throw. If an assignment creates an own data property, it shadows the accessor and no longer tests the same property semantics. \`Object.defineProperty\` can create a manual replacement, but then your test must preserve and restore every descriptor flag correctly. The Jest spy exists to handle that lifecycle.

## Restoration, clearing, and resetting are not synonyms

Getter spies participate in the same mock lifecycle as function spies, but the distinction matters more because a descriptor has been modified.

| Operation | Call history | Mocked getter implementation | Original descriptor |
|---|---|---|---|
| \`mockClear()\` | Removed | Preserved | Still wrapped |
| \`mockReset()\` | Removed | Reset to empty mock behavior | Still wrapped |
| \`mockRestore()\` | Removed/reset | Removed | Restored |
| \`jest.clearAllMocks()\` | Cleared for all mocks | Preserved | Spies remain |
| \`jest.restoreAllMocks()\` | Restored spies | Removed | Original accessors return |

\`mockReset\` on a spy is often surprising: it does not mean "go back to the real getter." It resets the mock implementation, which can make the property return \`undefined\`. Use \`mockRestore\` when the test is done intercepting the accessor.

Jest configuration can enable automatic restoration, but local cleanup remains readable and protects the suite when configuration differs across packages. For a temporary override within a small scope, current Jest versions also support explicit resource management with the \`using\` keyword when the runtime/transpiler supports it. The ordinary \`try/finally\` or \`afterEach\` approach remains portable.

## TypeScript details that catch incorrect getter mocks

With typed objects, Jest can infer the accessor return type. A boolean getter's spy should reject \`.mockReturnValue('yes')\` at compile time. Preserve that assistance by avoiding \`as any\` around the target.

Overloaded or union-heavy models sometimes produce awkward inference. Rather than casting the spy broadly, type the object at the consumer boundary or expose a small interface:

\`\`\`typescript
interface ClockView {
  readonly isoDate: string;
}

function dateHeader(clock: ClockView): string {
  return \`Report date: \${clock.isoDate}\`;
}

const clock: ClockView = {
  get isoDate() {
    return new Date().toISOString().slice(0, 10);
  },
};

const getter = jest
  .spyOn(clock, 'isoDate', 'get')
  .mockReturnValue('2026-07-13');

expect(dateHeader(clock)).toBe('Report date: 2026-07-13');
expect(getter).toHaveBeenCalled();
\`\`\`

This remains a real accessor, so the spy exercises the correct mechanism. A literal such as \`{ isoDate: '2026-07-13' }\` would be an easier stub if call tracking were unnecessary.

The [Jest mock versus mockImplementation guide](/blog/jest-mock-vs-mockimplementation-guide) helps choose between module replacement and targeted behavior changes. For domain-specific assertions on spy results, see the [Jest custom matchers guide](/blog/jest-custom-matchers-guide).

## When verifying a getter read is the wrong assertion

Spies couple a test to an interaction. If the only requirement is the rendered price, assert the rendered price. A refactor that caches the computed value or passes it as an argument could preserve behavior while breaking a getter-call assertion.

Getter interaction assertions earn their place when:

- Reading the getter triggers required lazy computation.
- The getter is expensive and must not be evaluated repeatedly.
- The consumer must use a policy-owned derived value rather than reconstructing it.
- Access has an observable audit or instrumentation contract.
- A failure path depends on the getter throwing.

Avoid them when the getter is merely convenient syntax around stable state. In those cases, construct the object and test the consumer's output.

## Troubleshooting common accessor-spy failures

When Jest reports that a property does not exist, inspect the runtime target, not only its TypeScript type. Type-only declarations, transpiler class-field output, proxies, and instance initialization can produce a different descriptor than expected.

| Symptom | Likely cause | Investigation |
|---|---|---|
| "not a function" style error | Missing \`'get'\` access type | Use the accessor spy signature |
| Property not found | Spying on wrong prototype or import shape | Walk prototype descriptors |
| Cannot redefine property | Descriptor is non-configurable | Introduce a wrapper seam |
| Spy call count is zero | Consumer reads another instance or cached value | Target prototype or assert behavior |
| Later test gets mocked value | Spy was cleared, not restored | Call \`mockRestore\` or restore all |
| Getter returns undefined after reset | \`mockReset\` removed implementation | Restore the spy instead |
| Unexpected extra calls | Serializer, renderer, or logger reads property | Narrow assertion or isolate consumer |

Also verify that a module import did not evaluate the getter before the spy was installed. If the value is captured at module load, spying afterward cannot retroactively observe the read. Use module isolation only when that import-time behavior is truly part of the test; otherwise refactor eager evaluation into an explicit function.

## Getter spies and memoized computations

A memoized getter introduces two different contracts: access frequency and computation frequency. A spy installed on the public getter records every property read, even when the getter returns a cached value. It does not automatically tell you whether the expensive internal calculation ran.

Suppose \`catalog.summary\` calls \`buildSummary()\` only on its first read and then returns a private cache. Asserting that the getter was called twice proves two consumers accessed the property. To prove memoization, spy on an owned calculation method or inject the calculator, read the getter twice, and assert the calculator ran once. If the calculation is private and intentionally hidden, assert an observable performance-independent effect or test the class through its public result instead of piercing encapsulation.

Also decide when the spy is installed. Reading the getter during fixture setup can warm the cache before the test begins. An instance spy added afterward observes future reads but cannot see the computation already performed. Construct the object, install the relevant spies, and then trigger the subject in the same order production code uses.

When a getter invalidates its cache after a setter or event, test the cycle explicitly: first read computes, second read reuses, mutation invalidates, and third read recomputes. Sequence return mocks are the wrong tool for that owner-level test because they simulate the result while bypassing the cache logic you need to verify.

## Frequently Asked Questions

### Why is the third argument to jest.spyOn required for a getter?

It tells Jest to wrap the getter function in the property descriptor. Without \`'get'\`, Jest treats the current property value as a method and expects it to be callable.

### Does a getter spy call the real getter by default?

Yes. Like other Jest spies, it preserves the original implementation until you apply \`mockReturnValue\`, \`mockImplementation\`, or another mock behavior.

### Can I spy on a static getter?

Yes. Target the class constructor because that is where a static accessor lives, for example \`jest.spyOn(BuildInfo, 'version', 'get')\`. Restore it after the test just as you would a prototype spy.

### Why can Jest not spy on my frozen object's getter?

The accessor is probably non-configurable. Jest needs to redefine its descriptor to install the spy. Wrap the dependency or inject an owned abstraction instead of trying to alter the frozen object.

### Should I use mockReset() between getter scenarios?

Usually no. \`mockReset\` leaves the spy installed with a reset implementation, which may return \`undefined\`. Use \`mockRestore\` to return the original descriptor, then create a new spy if another scenario needs one.
`,
};
