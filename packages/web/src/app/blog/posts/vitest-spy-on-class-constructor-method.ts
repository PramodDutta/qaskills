import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Spy on a Class Constructor Method in Vitest',
  description:
    'Spy on class instance methods in Vitest before construction, verify per-instance calls, restore prototypes safely, and avoid constructor mocking traps.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Spy on a Class Constructor Method in Vitest

The instance you need to observe is created inside \`CheckoutService\`, so the test never receives the \`PaymentGateway\` object. Spying after the service call is too late. In Vitest, the precise move is to spy on the method stored on the class prototype before construction. Every subsequently constructed instance that resolves that method through the prototype will pass through the spy.

The phrase “spy on a constructor method” is ambiguous. JavaScript classes have instance methods on \`Class.prototype\`, static methods on the constructor object, instance fields created per object, and the constructor itself. \`vi.spyOn\` works differently for each shape. Start by identifying which property lookup production code performs.

## Where a class method actually lives

\`\`\`ts
class AuditClient {
  constructor(private readonly endpoint: string) {}

  async record(event: string): Promise<void> {
    await fetch(this.endpoint, {
      method: 'POST',
      body: JSON.stringify({ event }),
    });
  }

  static fromEnvironment(): AuditClient {
    return new AuditClient(process.env.AUDIT_URL ?? 'http://localhost:4000/audit');
  }
}

Object.hasOwn(AuditClient.prototype, 'record'); // true
Object.hasOwn(AuditClient, 'fromEnvironment'); // true
\`\`\`

An ordinary instance method is shared through the prototype. A static method belongs to the class object. The constructor is not a property called \`constructor\` that can be usefully spied on to track \`new AuditClient()\`. Replacing construction generally requires mocking the imported class or injecting a factory.

| Member form | Runtime location | Spy target | Sees future instances? |
|---|---|---|---|
| \`record() {}\` | \`AuditClient.prototype.record\` | \`vi.spyOn(AuditClient.prototype, 'record')\` | Yes |
| \`static fromEnvironment() {}\` | \`AuditClient.fromEnvironment\` | \`vi.spyOn(AuditClient, 'fromEnvironment')\` | Not applicable |
| \`record = async () => {}\` | Own property on each instance | \`vi.spyOn(instance, 'record')\` | No |
| \`#record() {}\` | Private class element | No public spy target | No |
| \`constructor() {}\` | Class construction behavior | Mock binding or inject factory | Tracks replacement constructor |

This model explains most “spy was called zero times” failures. The test attached to a property production never read.

## Observe an internally created instance

The basic pattern installs the prototype spy, runs code that constructs the class, asserts calls, and restores the original descriptor.

\`\`\`ts
import { afterEach, describe, expect, it, vi } from 'vitest';

class EmailSender {
  async send(to: string, subject: string): Promise<{ id: string }> {
    return { id: \`live-\${to}-\${subject}\` };
  }
}

class PasswordResetService {
  async request(email: string): Promise<string> {
    const sender = new EmailSender();
    const result = await sender.send(email, 'Reset your password');
    return result.id;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PasswordResetService', () => {
  it('sends the reset message through the constructed sender', async () => {
    const sendSpy = vi
      .spyOn(EmailSender.prototype, 'send')
      .mockResolvedValue({ id: 'mail-test-17' });

    const id = await new PasswordResetService().request('reader@example.test');

    expect(id).toBe('mail-test-17');
    expect(sendSpy).toHaveBeenCalledOnce();
    expect(sendSpy).toHaveBeenCalledWith(
      'reader@example.test',
      'Reset your password',
    );
  });
});
\`\`\`

By default, a Vitest spy calls the original implementation. Here the test replaces it because a real email side effect is inappropriate. If the method is pure and observing it is enough, omit \`mockResolvedValue\`. Be explicit about that choice because “spy” does not automatically mean “stub.”

Install the spy before \`request()\`. Prototype lookup happens when \`sender.send\` is accessed. A spy installed afterward cannot reconstruct previous calls.

## Separate calls made by different instances

A prototype spy aggregates all calls, which is useful for total behavior but can obscure ownership. JavaScript supplies the receiver as the mock context. Vitest also records return values, calls, instances, and contexts on mock state. A clearer design often captures constructed dependencies through an injected factory.

\`\`\`ts
class Worker {
  constructor(readonly queue: string) {}

  run(jobId: string): string {
    return \`\${this.queue}:\${jobId}\`;
  }
}

it('records calls from each worker instance', () => {
  const runSpy = vi.spyOn(Worker.prototype, 'run');
  const urgent = new Worker('urgent');
  const normal = new Worker('normal');

  urgent.run('J-1');
  normal.run('J-2');

  expect(runSpy).toHaveBeenCalledTimes(2);
  expect(runSpy.mock.contexts).toEqual([urgent, normal]);
  expect(runSpy.mock.calls).toEqual([['J-1'], ['J-2']]);
});
\`\`\`

Do not assert internal instances unless the ownership distinction is part of behavior. If the requirement says two queues receive one job each, contexts are relevant. If it says two jobs are processed, argument assertions may be less coupled.

## Arrow-function fields bypass the prototype

Transpiled class fields such as \`send = async () => {}\` are assigned during construction. Each instance owns a fresh function, shadowing anything placed on the prototype. A prototype spy therefore sees nothing.

\`\`\`ts
class Thumbnailer {
  resize = async (path: string): Promise<string> => \`thumb:\${path}\`;
}

it('spies on an instance field after construction', async () => {
  const thumbnailer = new Thumbnailer();
  const resizeSpy = vi
    .spyOn(thumbnailer, 'resize')
    .mockResolvedValue('thumb:/tmp/photo.jpg');

  await expect(thumbnailer.resize('/tmp/photo.jpg')).resolves.toBe(
    'thumb:/tmp/photo.jpg',
  );
  expect(resizeSpy).toHaveBeenCalledWith('/tmp/photo.jpg');
});
\`\`\`

If production hides this instance, inject it or inject a constructor/factory. Rewriting the class solely to satisfy a spy can make the design worse. Dependency injection makes ownership visible and removes the need for global prototype mutation.

| Hidden dependency design | Test control | Coupling |
|---|---|---|
| Direct \`new Dependency()\` inside method | Prototype spy or module class mock | Test knows construction detail |
| Constructor receives an instance | Direct object mock | Service exposes dependency explicitly |
| Constructor receives \`() => Dependency\` | Factory spy plus instance mock | Preserves per-operation construction |
| Module-level singleton | Spy exported instance | Shared state must be reset |

The [Vitest mocking guide](/blog/vitest-mocking-vi-mock-complete-guide) covers module replacement when the class import itself must be substituted.

## Mock the constructor only when construction is the contract

To assert constructor arguments, mock the module exporting the class with a constructable mock. Vitest hoists \`vi.mock\`, so factory variables need compatible initialization, often through \`vi.hoisted\`. A simpler design exports a factory function and spies on that function.

When returning a mock class implementation, use class syntax or a normal constructable function. Arrow functions cannot be invoked with \`new\`. Preserve instance behavior that the system under test expects.

\`\`\`ts
// transport.ts
export class Transport {
  constructor(readonly baseUrl: string) {}
  async get(path: string): Promise<string> {
    return \`\${this.baseUrl}\${path}\`;
  }
}

// client.ts
import { Transport } from './transport';

export async function loadHealth(): Promise<string> {
  const transport = new Transport('https://status.example.test');
  return transport.get('/health');
}
\`\`\`

\`\`\`ts
// client.test.ts
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn<(path: string) => Promise<string>>(),
  Transport: vi.fn(),
}));

vi.mock('./transport', () => ({
  Transport: mocks.Transport.mockImplementation(
    class MockTransport {
      get = mocks.get;
    },
  ),
}));

import { loadHealth } from './client';

beforeEach(() => {
  mocks.Transport.mockClear();
  mocks.get.mockReset();
});

it('constructs the status transport and requests health', async () => {
  mocks.get.mockResolvedValue('ok');

  await expect(loadHealth()).resolves.toBe('ok');
  expect(mocks.Transport).toHaveBeenCalledWith('https://status.example.test');
  expect(mocks.get).toHaveBeenCalledWith('/health');
});
\`\`\`

This is more invasive than a prototype spy. Use it when the constructor arguments are behavior worth protecting or when no real instance can safely be created. If only \`get('/health')\` matters, injecting a transport interface gives a smaller test.

## Static methods need the constructor object

A static factory does not involve an instance prototype. Spy directly on the class:

\`\`\`ts
class TokenParser {
  static parse(raw: string): { subject: string } {
    return JSON.parse(raw) as { subject: string };
  }
}

it('uses the static parser', () => {
  const parseSpy = vi
    .spyOn(TokenParser, 'parse')
    .mockReturnValue({ subject: 'user-42' });

  expect(TokenParser.parse('opaque-test-value')).toEqual({ subject: 'user-42' });
  expect(parseSpy).toHaveBeenCalledWith('opaque-test-value');
});
\`\`\`

Spying on a static helper is often a design smell if the assertion merely restates the implementation. Prefer output assertions unless the static call crosses a boundary, records a security decision, or must receive a specific canonical input.

## Restore, reset, and clear are not interchangeable

Prototype spies mutate shared class state for the duration of the test. Cleanup is mandatory, especially with watch mode and files containing several cases.

| Operation | Call history | Mock implementation | Original property restored |
|---|---|---|---|
| \`mockClear()\` | Cleared | Preserved | No |
| \`mockReset()\` | Cleared | Reset | No |
| \`mockRestore()\` | Cleared | Removed | Yes for a spy |
| \`vi.restoreAllMocks()\` | Restores all registered spies | Removed | Yes |

Use \`afterEach(() => vi.restoreAllMocks())\` as a defensive baseline. A local \`try/finally\` can be appropriate when a test temporarily spies within a smaller scope. Configuration options can automate mock restoration, but readers should still understand the state boundary. See the [Vitest setup guide](/blog/vitest-config-setup-guide-2026) when choosing suite-wide behavior.

Restoration cannot undo side effects already produced by the original implementation. If the spy should isolate a network or filesystem boundary, install a mock implementation before calling production code.

## TypeScript overloads and protected methods

For overloaded methods, TypeScript may infer a broad mock signature. Assert arguments supported by the public overloads and avoid casting to \`any\` merely to reach an implementation detail. If the class method is protected or private in TypeScript, a test that casts around access control couples itself to internals. Test through the public behavior or extract the collaborator.

ECMAScript \`#private\` methods are not properties addressable by string key at all. No \`vi.spyOn(instance, '#method')\` API exists. This is an intentional encapsulation boundary.

Getters and setters require the access type argument:

\`\`\`ts
class FeatureFlag {
  get enabled(): boolean {
    return false;
  }
}

it('observes a getter access', () => {
  const getter = vi.spyOn(FeatureFlag.prototype, 'enabled', 'get');
  const flag = new FeatureFlag();

  expect(flag.enabled).toBe(false);
  expect(getter).toHaveBeenCalledOnce();
});
\`\`\`

This differs from calling a method. The third parameter tells Vitest which accessor descriptor to wrap.

## Diagnose a zero-call spy systematically

Check these in order:

1. Was the spy installed before the instance method was read or called?
2. Is the method on the prototype, or is it an instance field?
3. Does production import the same class binding as the test?
4. Did a bound callback capture the original method before spying?
5. Is the call occurring in another worker, process, or isolated module graph?
6. Did another test restore or replace the spy through leaked concurrent state?
7. Is production actually using a subclass override or different implementation?

Binding is subtle. If a constructor executes \`this.run = this.run.bind(this)\` before the test spies on the instance, the bound function already points at the original method. A prototype spy installed before construction will be captured correctly. An instance spy installed afterward will wrap the bound property and can observe future calls.

The most maintainable test observes a boundary with the least mutation. Prototype spying is excellent for a conventional method on a hidden, newly constructed object. It is not a universal replacement for dependency injection, module mocking, or output-based assertions.

## Capture timing and bound methods

If a constructor binds \`this.run\` before the test installs a spy, the bound callback already holds the original function. Install the prototype spy before construction when constructor-time binding or calls are possible.

\`\`\`ts
class Formatter {
  format(value: number): string {
    return value.toFixed(2);
  }
}

it('observes a callback captured after spy installation', () => {
  const formatSpy = vi.spyOn(Formatter.prototype, 'format');
  const formatter = new Formatter();
  const callback = formatter.format.bind(formatter);

  expect(callback(12.5)).toBe('12.50');
  expect(formatSpy).toHaveBeenCalledWith(12.5);
});
\`\`\`

Modules that construct clients during import are harder. Importing the subject first may be too late. Prefer dependency injection; when module evaluation itself is under test, use Vitest's module-reset and mocking workflow intentionally.

## Preserve the receiver in a replacement

An arrow function passed to \`mockImplementation\` has lexical \`this\`. Use a normal function when the method reads instance state.

\`\`\`ts
class Ledger {
  constructor(readonly accountId: string) {}
  post(cents: number): string {
    return \`\${this.accountId}:\${cents}\`;
  }
}

it('keeps the instance receiver in a prototype mock', () => {
  const post = vi
    .spyOn(Ledger.prototype, 'post')
    .mockImplementation(function (this: Ledger, cents: number) {
      return \`test-\${this.accountId}:\${cents}\`;
    });

  expect(new Ledger('A-9').post(250)).toBe('test-A-9:250');
  expect(post.mock.contexts[0]).toBeInstanceOf(Ledger);
});
\`\`\`

Normal function syntax is behavior here, not a stylistic preference. The call-site receiver becomes \`this\` exactly as for the original method.

## Inheritance selects the wrapped descriptor

A base-prototype spy sees subclass instances only when they use the base implementation or call it through \`super\`. A complete override can bypass it.

\`\`\`ts
class BaseParser {
  parse(text: string): string {
    return text.trim();
  }
}

class CsvParser extends BaseParser {
  override parse(text: string): string {
    return super.parse(text).replaceAll(',', '|');
  }
}

it('distinguishes the override from its super call', () => {
  const base = vi.spyOn(BaseParser.prototype, 'parse');
  const derived = vi.spyOn(CsvParser.prototype, 'parse');

  expect(new CsvParser().parse(' a,b ')).toBe('a|b');
  expect(derived).toHaveBeenCalledOnce();
  expect(base).toHaveBeenCalledWith(' a,b ');
});
\`\`\`

Spy on the class production actually constructs. A zero call can reveal that a factory selected another subclass.

## Avoid concurrent mutation of one prototype

Two concurrent tests spying on the same method can replace or restore each other's descriptor. Keep such cases non-concurrent within an isolate, use separate workers, or inject instances instead. \`restoreAllMocks\` in one concurrent case can dismantle another case's observation.

Do not export a live spy from shared setup. If every test needs the same fake behavior, a manual module mock or injected fake describes the suite architecture better than a globally varying prototype mock.

## Interaction assertions need a reason

A spy couples the test to how behavior happens. That is justified for audit events, retry counts, idempotency, transaction boundaries, or mandatory outbound messages. It is weak when it only proves that one private method called another while the public result already proves correctness.

Ask whether a behavior-preserving refactor should be allowed to remove the call. If yes, test output or state. If no, name the case after the external obligation rather than the internal method. That keeps the test's rationale visible.

## Spy on failures without changing their type

When the original method should throw, a pure observation spy preserves the exception. Assert both the public error and the recorded call. If a test replaces the method with \`mockRejectedValue\`, use the same error class and shape the caller is contractually required to handle. Returning a rejected string when production throws a typed error can send the test through an impossible branch.

One-time behavior is useful for retry code:

\`\`\`ts
const send = vi
  .spyOn(EmailSender.prototype, 'send')
  .mockRejectedValueOnce(new Error('temporary outage'))
  .mockResolvedValueOnce({ id: 'mail-after-retry' });

await expect(new RetryingResetService().request('a@example.test')).resolves.toBe(
  'mail-after-retry',
);
expect(send).toHaveBeenCalledTimes(2);
\`\`\`

This verifies sequential behavior on the same prototype spy. Restore it after the case so the consumed one-time queue cannot affect another test.

Review mock call arguments before matching whole objects. \`toHaveBeenCalledWith\` supports asymmetric matchers, but overly broad \`expect.anything()\` can let a security-relevant value drift. Assert stable contract fields and omit volatile metadata deliberately.

When a method returns \`this\` for chaining, a replacement must preserve that property if downstream calls rely on it. A mock returning \`undefined\` then tests a failure created by the fake, not by production.

## Frequently Asked Questions

### Must the prototype spy be created before \`new\`?

Create it before construction when the constructor binds the method or calls it. For a normal unbound prototype method first accessed later, installing before the eventual call can work, but installing before construction is the safe and legible rule.

### Why does \`vi.spyOn(MyClass.prototype, 'run')\` miss an arrow method?

An arrow-function class field is assigned as an own property on every instance. It is not \`MyClass.prototype.run\`. Spy on the known instance or refactor the dependency boundary so the instance or factory can be injected.

### Does a Vitest spy call the real method?

Yes, unless you provide a mock implementation or return behavior. If the real method sends traffic or writes files, stub it before exercising the subject. Observation alone does not isolate side effects.

### How can I verify which constructed instance made each call?

Inspect \`spy.mock.contexts\` and compare the receivers with known instances. If production hides every instance and ownership matters, inject a factory that records and returns controlled objects.

### Can I spy directly on a class constructor with \`vi.spyOn\`?

Not in the same way as an ordinary method. To track \`new\` calls, replace the imported class with a constructable module mock or expose a factory function. Prefer constructor mocking only when construction arguments or counts are part of the intended contract.
`,
};
