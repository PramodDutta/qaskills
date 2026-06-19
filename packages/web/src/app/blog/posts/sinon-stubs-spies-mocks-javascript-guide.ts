import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Sinon Stubs vs Spies vs Mocks: JavaScript Guide 2026",
  description: "Sinon.JS stubs vs spies vs mocks explained for 2026 — when to use each, sandboxes for cleanup, fake timers, and real, copy-paste test code examples.",
  date: "2026-06-15",
  category: "JavaScript",
  content: `# Sinon Stubs vs Spies vs Mocks: JavaScript Guide 2026

Sinon.JS gives you three kinds of test doubles. A **spy** wraps a function and records how it was called without changing its behavior. A **stub** is a spy that also **replaces** the function, letting you control its return value, throw errors, or call callbacks. A **mock** is a stub with **built-in expectations** you set up front and \`verify()\` at the end. The practical rule: use a spy to observe, a stub to control, and a mock only when you want to declare exact expectations before the action. Always create them through a **sandbox** so a single \`sandbox.restore()\` cleans everything up. This guide covers each with real code, plus fake timers.

## Install and the one-line decision

\`\`\`bash
npm install --save-dev sinon
\`\`\`

\`\`\`js
import sinon from 'sinon';
\`\`\`

The decision among the three doubles:

| Double | Replaces behavior? | Has expectations? | Use when |
|---|---|---|---|
| **Spy** | No (or wraps a real fn) | No | You want to assert a function was called, with what args, how often |
| **Stub** | Yes | No | You need to control return values / errors / callbacks AND assert calls |
| **Mock** | Yes | Yes (set before, verified after) | You want to declare exact expectations up front and \`verify()\` them |

In modern Sinon usage, **stubs cover the vast majority of needs**. Spies are for pure observation; mocks are a niche tool that many teams skip entirely in favor of stub + assertion.

## Spies: observe without changing behavior

A spy records calls, arguments, return values, and \`this\`. There are two flavors. An **anonymous spy** is a brand-new function you pass as a callback:

\`\`\`js
const callback = sinon.spy();
[1, 2, 3].forEach(callback);

callback.calledThrice;          // true
callback.firstCall.args;        // [1, 0, [1,2,3]]
callback.calledWith(2);         // true
\`\`\`

A **wrapping spy** wraps an existing method so the real implementation still runs, but you can assert on the calls:

\`\`\`js
const spy = sinon.spy(user, 'save');   // real save() still executes
service.register(user);

spy.calledOnce;                 // true
spy.calledWith(sinon.match.has('email'));
spy.restore();                  // put the original method back
\`\`\`

The full assertion surface is rich: \`spy.called\`, \`spy.callCount\`, \`spy.calledOnce/Twice/Thrice\`, \`spy.calledWith(...)\`, \`spy.calledWithExactly(...)\`, \`spy.returned(value)\`, \`spy.threw()\`, \`spy.getCall(n)\`, and \`spy.calledBefore(other)/calledAfter(other)\` for ordering. For accessibility-friendly and behavior-first testing patterns across libraries, browse the [QA skills directory](/skills).

## Stubs: control behavior and assert

A stub is everything a spy is, plus it **replaces** the function so you decide what happens. This is the workhorse for isolating the unit under test from slow or non-deterministic dependencies.

\`\`\`js
const stub = sinon.stub(db, 'query');

stub.returns([{ id: 1 }]);          // fixed return value
stub.resolves({ ok: true });        // returns a resolved promise
stub.rejects(new Error('boom'));    // returns a rejected promise
stub.throws(new TypeError());       // throws when called
stub.callsFake((q) => \`ran \${q}\`);  // custom implementation
\`\`\`

Stubs support **conditional behavior** with \`withArgs\`, which is how you make one stub respond differently per input:

\`\`\`js
const stub = sinon.stub();
stub.withArgs('admin').returns(true);
stub.withArgs('guest').returns(false);
stub.returns(null);                  // default for anything else

stub('admin'); // true
stub('guest'); // false
stub('other'); // null
\`\`\`

You can sequence return values with \`onCall\` / \`onFirstCall\` — invaluable for testing retries:

\`\`\`js
const fetch = sinon.stub();
fetch.onFirstCall().rejects(new Error('timeout'));
fetch.onSecondCall().resolves({ data: 1 });

// code under test retries and succeeds on the second attempt
\`\`\`

And stubs handle Node-style callbacks with \`yields\` / \`callsArgWith\`:

\`\`\`js
const stub = sinon.stub(fs, 'readFile');
stub.yields(null, 'file contents');   // invokes callback(null, 'file contents')
\`\`\`

Because a stub *is* a spy, you assert on it the same way: \`stub.calledOnceWith(...)\`, \`stub.callCount\`, etc. That dual nature — control plus observation — is why stubs dominate real-world Sinon code. For how this compares to mocking in other ecosystems, see the [framework comparison hub](/compare).

## Mocks: pre-declared expectations

A mock combines a stub with **expectations you set before the action**, then call \`mock.verify()\` to assert them all at once. If any expectation is unmet, \`verify()\` throws.

\`\`\`js
const mock = sinon.mock(mailer);

mock.expects('send')
  .once()
  .withArgs('ada@example.com')
  .returns(true);

registerUser('ada@example.com');

mock.verify();    // throws if send wasn't called exactly once with that arg
mock.restore();
\`\`\`

Mocks read declaratively, but they have a downside: they mix setup and assertion, and over-specifying them makes tests brittle. The Sinon docs themselves advise using mocks sparingly — typically a stub plus an explicit assertion is clearer and easier to maintain:

\`\`\`js
// Often preferable to a mock:
const send = sinon.stub(mailer, 'send').returns(true);
registerUser('ada@example.com');
sinon.assert.calledOnceWithExactly(send, 'ada@example.com');
\`\`\`

Use mocks when a single object must meet several precise expectations and stating them up front genuinely improves readability; otherwise prefer stub + \`sinon.assert\`.

## Sandboxes: the right way to create and clean up

The most important habit in Sinon is using a **sandbox**. A sandbox groups every spy, stub, mock, and fake timer you create, so one \`restore()\` call undoes all of them. Without it, a forgotten \`.restore()\` leaves a global method permanently replaced and poisons later tests.

\`\`\`js
import sinon from 'sinon';

describe('UserService', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();   // restores EVERYTHING created on this sandbox
  });

  it('saves the user', () => {
    const save = sandbox.stub(db, 'save').resolves();
    // ...
    sinon.assert.calledOnce(save);
  });
});
\`\`\`

Sinon also exposes a **default sandbox** as the top-level \`sinon\` object, so \`sinon.stub(...)\` and \`sinon.restore()\` work without explicitly creating one. Still, an explicit \`createSandbox()\` per suite is the clearest pattern, especially when you want sandbox-level config like \`useFakeTimers\`. You can even pass options: \`sinon.createSandbox({ useFakeTimers: true })\` installs the fake clock for the whole sandbox.

## Fake timers: controlling time

Sinon's fake timers replace \`setTimeout\`, \`setInterval\`, \`Date\`, \`requestAnimationFrame\`, and friends with synchronous, controllable versions so you can test time-dependent code without real waiting.

\`\`\`js
let clock;

beforeEach(() => {
  clock = sinon.useFakeTimers();
});

afterEach(() => {
  clock.restore();
});

it('debounces to one call', () => {
  const fn = sinon.spy();
  const debounced = debounce(fn, 1000);

  debounced();
  debounced();
  clock.tick(999);
  sinon.assert.notCalled(fn);

  clock.tick(1);          // advance past the threshold
  sinon.assert.calledOnce(fn);
});
\`\`\`

Key controls:

\`\`\`js
clock.tick(2000);                 // advance time by 2000ms, firing due timers
clock.next();                     // run the very next scheduled timer
clock.runAll();                   // run all pending timers
await clock.tickAsync(2000);      // advance and flush microtasks (for async code)
clock.setSystemTime('2026-06-15');// pin Date.now()
\`\`\`

Pin the system time when testing date logic so \`new Date()\` is deterministic. Use \`tickAsync\` (not \`tick\`) when the timer callbacks themselves \`await\` promises, so microtasks flush between timer steps. Always restore the clock — leaking fake timers breaks every subsequent test that touches time.

## A realistic end-to-end example

A complete suite exercising spy, stub, sandbox, and fake timers together:

\`\`\`js
import sinon from 'sinon';
import { expect } from 'chai';
import { OrderService } from '../src/order-service.js';

describe('OrderService.placeOrder', () => {
  let sandbox;
  let clock;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clock = sandbox.useFakeTimers(new Date('2026-06-15T00:00:00Z'));
  });

  afterEach(() => {
    sandbox.restore();   // restores stubs AND the clock
  });

  it('charges, emails, and retries on a transient failure', async () => {
    const charge = sandbox.stub(payments, 'charge');
    charge.onFirstCall().rejects(new Error('timeout'));
    charge.onSecondCall().resolves({ id: 'ch_1' });

    const email = sandbox.spy(mailer, 'send');           // real send still runs
    const service = new OrderService(payments, mailer);

    const promise = service.placeOrder({ id: 'ord_9', amount: 4200 });
    await clock.tickAsync(1000);                          // let the retry back-off elapse
    const receipt = await promise;

    sinon.assert.calledTwice(charge);                     // failed once, succeeded once
    sinon.assert.calledOnceWithExactly(email, 'ord_9');
    expect(receipt.chargeId).to.equal('ch_1');
    expect(receipt.placedAt).to.equal('2026-06-15T00:00:00.000Z');
  });
});
\`\`\`

Notice the layering: a stub controls the flaky payment call and sequences its results, a spy observes the real email send, fake timers fast-forward the retry delay, and one \`sandbox.restore()\` cleans it all up.

## CI usage

Sinon is runner-agnostic — it works under Mocha, Jest, Vitest, or any framework. Nothing special is needed in CI beyond running your tests. The one discipline that matters is restoring doubles: a leaked stub or fake clock causes order-dependent failures that appear only when CI runs tests in a different order or in parallel. Enforce \`afterEach(() => sandbox.restore())\` in every suite, and consider a shared \`mocharc\`/setup file that creates and restores a sandbox globally:

\`\`\`js
// test/setup.js
import sinon from 'sinon';
afterEach(() => sinon.restore());   // safety net for the default sandbox
\`\`\`

\`\`\`yaml
- name: Test
  run: npx mocha   # or vitest run / jest --ci
\`\`\`

## Common errors and troubleshooting

**"Attempted to wrap X which is already wrapped."** You stubbed the same method twice without restoring. Use one sandbox and \`sandbox.restore()\` in \`afterEach\`, and do not stub a method in both a \`beforeEach\` and inside a test.

**A method stays mocked across tests.** You forgot to restore. Switch to a sandbox so a single \`restore()\` reverts everything, and add the global safety-net \`afterEach(() => sinon.restore())\`.

**Fake timers hang on async code.** You used \`clock.tick()\` where the callbacks \`await\` promises. Use \`await clock.tickAsync()\` so microtasks flush between timer steps.

**\`stub.resolves\` returns undefined.** You probably stubbed the wrong reference. Stub the exact property the code calls (\`sandbox.stub(obj, 'method')\`), and remember that re-importing a module can give you a different binding than the one under test.

**A stub matches the wrong call.** \`withArgs\` matchers can overlap. Order matters — more specific \`withArgs\` should be defined, and Sinon falls back to the general \`returns(...)\` default. Use \`sinon.match\` helpers for flexible matching.

For more JavaScript testing patterns and library comparisons, browse the [blog](/blog).

## Frequently Asked Questions

### What is the difference between a stub and a spy in Sinon?

A spy wraps a function and records how it was called — arguments, call count, return values — without changing its behavior. A stub does everything a spy does and also replaces the function, so you control its return value, make it throw, resolve or reject a promise, or invoke a callback. Use a spy to observe real behavior and a stub when you need to control what the dependency does.

### When should I use a Sinon mock instead of a stub?

Use a mock only when a single object must satisfy several precise expectations that you want to declare up front and verify together with \`mock.verify()\`. In most cases a stub plus an explicit \`sinon.assert.calledOnceWithExactly(...)\` is clearer and less brittle, which is why the Sinon docs recommend using mocks sparingly. Reach for mocks when pre-stated expectations genuinely improve readability, otherwise prefer stub plus assertion.

### What is a Sinon sandbox and why should I use one?

A sandbox groups every spy, stub, mock, and fake timer you create so that a single \`sandbox.restore()\` undoes all of them at once. This prevents the classic bug where a forgotten \`.restore()\` leaves a global method permanently replaced and breaks later tests. Create one in \`beforeEach\` with \`sinon.createSandbox()\` and restore it in \`afterEach\` for reliable, isolated tests.

### How do I test setTimeout or setInterval with Sinon?

Install fake timers with \`sinon.useFakeTimers()\`, which replaces \`setTimeout\`, \`setInterval\`, and \`Date\` with controllable versions. Advance time manually with \`clock.tick(ms)\` to fire due timers synchronously, or \`clock.runAll()\` to flush everything, and always call \`clock.restore()\` afterward. When the timer callbacks await promises, use \`await clock.tickAsync(ms)\` so microtasks flush between steps.

### Do I need to restore Sinon stubs manually?

Yes, unless they were created on a sandbox that you restore. If you create a sandbox with \`sinon.createSandbox()\`, a single \`sandbox.restore()\` in \`afterEach\` reverts every double at once. If you stub directly on the default \`sinon\` object, call \`sinon.restore()\` to clean up; failing to restore leaves methods replaced and causes order-dependent test failures.

### Does Sinon work with Jest, Mocha, and Vitest?

Yes. Sinon is framework-agnostic and provides standalone spies, stubs, mocks, and fake timers that work under Mocha, Jest, Vitest, or any other runner. You typically pair it with an assertion library like Chai, or use Sinon's own \`sinon.assert\` helpers. The key practice in any runner is restoring your doubles after each test, ideally via a sandbox.
`,
};
