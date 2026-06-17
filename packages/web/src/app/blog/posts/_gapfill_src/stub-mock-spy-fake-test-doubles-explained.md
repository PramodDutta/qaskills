TITLE: Stub vs Mock vs Spy vs Fake: Test Doubles Explained
DESCRIPTION: Test doubles explained: the difference between dummy, stub, spy, mock, and fake, with code examples and guidance on when to use each in 2026.
DATE: 2026-06-15
CATEGORY: Testing
---
# Stub vs Mock vs Spy vs Fake: Test Doubles Explained

A **test double** is any object that stands in for a real dependency during a test. Gerard Meszaros's taxonomy, popularized by Martin Fowler, names five kinds: a **dummy** is passed but never used; a **stub** returns canned answers; a **spy** is a stub that also records how it was called; a **mock** is pre-programmed with expectations and fails the test if they are not met; and a **fake** is a lightweight working implementation (like an in-memory database). The practical distinction is between **state verification** (stub, fake — check the result) and **behavior verification** (mock — check the interaction).

This guide defines each double precisely, shows real code for all five, explains the state-vs-behavior split that drives the choice, and gives clear rules for when to reach for each one — and when not to. Getting this vocabulary right makes test code easier to read and reduces the brittle, over-mocked tests that break on every refactor.

## The five test doubles at a glance

| Double | Returns data? | Records calls? | Verifies interactions? | Has real logic? |
|---|---|---|---|---|
| **Dummy** | No | No | No | No |
| **Stub** | Yes (canned) | No | No | No |
| **Spy** | Yes (canned) | Yes | You assert manually | No |
| **Mock** | Yes (pre-programmed) | Yes | Yes (built-in expectations) | No |
| **Fake** | Yes (computed) | No | No | Yes (shortcut impl) |

The terms are often used loosely — many developers say "mock" for any test double, and popular libraries like Jest blur the lines by calling everything a "mock function." But the precise meanings matter when you are designing tests, because each double answers a different testing question. Our broader [testing skills directory](/skills) catalogs patterns that build on this vocabulary.

## Why test doubles exist

Real dependencies make tests slow, flaky, and hard to set up. A database call adds latency and requires fixtures; a payment gateway costs money and cannot be hit on every test run; a clock makes "expired after 30 days" logic untestable. Test doubles replace those dependencies with controlled substitutes so the **system under test** (SUT) runs in isolation, deterministically, and fast.

The two reasons you substitute a dependency are:

1. **You need it to return something** so the code under test can proceed (use a stub or fake).
2. **You need to verify the code interacted with it correctly** — that it called `charge()` exactly once with the right amount (use a mock or spy).

Almost every misuse of test doubles comes from conflating these two goals. Reach for the simplest double that answers the question your test is actually asking.

## Dummy

A **dummy** object is passed to satisfy a parameter or constructor but is never actually exercised by the code path under test. It carries no behavior and is never inspected.

```python
# A logger the SUT requires but never calls in this test path
class DummyLogger:
    def log(self, msg):  # never invoked in this test
        pass

def test_calculate_total_does_not_need_logging():
    calculator = OrderCalculator(logger=DummyLogger())
    assert calculator.total([10, 20, 30]) == 60
```

The dummy exists only because the constructor signature demands a logger. If the test ever started asserting on log output, the dummy would be promoted to a spy or mock. Dummies keep test setup honest: they make it explicit that a collaborator is irrelevant to this scenario.

## Stub

A **stub** provides canned answers to calls made during the test. It does not record anything and does not assert. Its only job is to feed the SUT the data it needs to reach the behavior you want to check. Verification happens on the **result**, not on the stub.

```typescript
// A stub for a pricing service
const priceServiceStub = {
  getPrice: (sku: string) => 9.99, // always returns the same price
};

test('cart total uses the price service', () => {
  const cart = new Cart(priceServiceStub);
  cart.add('SKU-1', 2);
  expect(cart.total()).toBe(19.98); // assert on STATE (the result)
});
```

Stubs are the workhorse double. Use them whenever you need a dependency to "just return something" so the real logic under test can run. Because a stub never asserts on how it was called, swapping out the implementation later does not break the test — only a change in the *result* does. That makes stub-based tests resilient to refactoring.

```python
# Python example with a stub that returns an error condition
class FailingPaymentStub:
    def charge(self, amount):
        return {"status": "declined", "code": "insufficient_funds"}

def test_order_marked_failed_on_decline():
    order = Order(payment=FailingPaymentStub())
    order.checkout(50)
    assert order.status == "failed"  # state verification
```

## Spy

A **spy** is a stub that also **records** information about how it was called — how many times, with what arguments, in what order. You then assert on those recordings *after* the SUT runs. The difference from a mock is timing and ownership: a spy records passively and you write the assertions yourself, whereas a mock has expectations baked in up front.

```typescript
// A spy that records calls while still returning canned data
function createEmailSpy() {
  const calls: Array<{ to: string; subject: string }> = [];
  return {
    send(to: string, subject: string) {
      calls.push({ to, subject });
      return { delivered: true };
    },
    calls,
  };
}

test('welcome email is sent to the new user', () => {
  const emailSpy = createEmailSpy();
  const service = new SignupService(emailSpy);

  service.register('alice@example.com');

  // Assert on RECORDED behavior, after the fact
  expect(emailSpy.calls).toHaveLength(1);
  expect(emailSpy.calls[0].to).toBe('alice@example.com');
});
```

A spy can also wrap a **real** implementation — forwarding calls to the genuine collaborator while recording them. This is useful when you want real behavior plus the ability to verify interactions. Most modern frameworks expose this directly: in Jest, `jest.spyOn(obj, 'method')` records calls while optionally preserving the original; in Python, `unittest.mock.Mock` records `call_args` and `call_count` for later assertion.

## Mock

A **mock** is pre-programmed with **expectations** before the test runs and verifies them automatically — it knows which calls it should receive and fails the test if reality does not match. This is **behavior verification**: the test passes or fails based on the interaction itself, not on a returned value.

```python
from unittest.mock import Mock

def test_analytics_event_is_tracked():
    analytics = Mock()

    service = CheckoutService(analytics)
    service.complete_purchase(order_id="A-1")

    # Behavior verification: assert the interaction happened correctly
    analytics.track.assert_called_once_with("purchase_completed", order_id="A-1")
```

In stricter mock frameworks (like Java's Mockito with `verify()`, or .NET's Moq with `.Verify()`), you set up expectations and the framework reports a failure if an expected call did not happen, happened the wrong number of times, or received the wrong arguments. The mock *is* the assertion.

```java
// Mockito example: a true behavior-verifying mock
@Test
void chargesCustomerExactlyOnce() {
    PaymentGateway gateway = mock(PaymentGateway.class);
    OrderService service = new OrderService(gateway);

    service.placeOrder(new Order(100));

    // The mock verifies the interaction
    verify(gateway, times(1)).charge(eq(100));
    verifyNoMoreInteractions(gateway);
}
```

Mocks are powerful but easy to overuse. Because they couple the test to the exact way the SUT calls its collaborators, a mock-heavy suite tends to break whenever you refactor internal interactions — even when the observable behavior is unchanged. Reserve mocks for cases where the **interaction is the behavior you care about**: sending an email, emitting an analytics event, publishing to a queue, charging a card.

## Fake

A **fake** is a real, working implementation that takes a shortcut unsuitable for production. The classic example is an **in-memory database** that implements the same interface as your real repository but stores rows in a dictionary. Fakes have actual logic — they can create, read, update, and delete — so they support multi-step workflows that stubs cannot.

```typescript
// A fake repository backed by an in-memory Map
class FakeUserRepository implements UserRepository {
  private store = new Map<number, User>();
  private nextId = 1;

  save(user: Omit<User, 'id'>): User {
    const saved = { id: this.nextId++, ...user };
    this.store.set(saved.id, saved);
    return saved;
  }

  findById(id: number): User | undefined {
    return this.store.get(id);
  }
}

test('saved user can be retrieved', () => {
  const repo = new FakeUserRepository();
  const created = repo.save({ name: 'Alice' });

  expect(repo.findById(created.id)?.name).toBe('Alice'); // realistic round-trip
});
```

Because a fake behaves like the real thing, tests using it read naturally and survive refactors well. The cost is maintenance: a fake is code you have to keep in sync with the real implementation's contract. Use fakes when a stub would require dozens of brittle canned responses to simulate a stateful workflow.

## State verification vs behavior verification

This is the conceptual axis that organizes all five doubles:

- **State verification** asks: *after the SUT runs, is the result correct?* You set up stubs or fakes, exercise the SUT, then assert on returned values or final state. The double is a passive supplier of data.
- **Behavior verification** asks: *did the SUT interact with its collaborators correctly?* You set up mocks (or assert on spies), exercise the SUT, then verify the calls. The double is an active observer.

Fowler's enduring advice: **prefer state verification** because it produces tests that are decoupled from implementation detail. Use behavior verification only when the interaction itself is the meaningful outcome — typically at the boundary where your system produces a side effect on the outside world (email, payments, messaging, logging that is contractually required).

| Question your test asks | Reach for |
|---|---|
| "Does the code compute the right result?" | Stub or Fake |
| "Does the code handle this error response?" | Stub (returning the error) |
| "Does a multi-step workflow round-trip correctly?" | Fake |
| "Did the code send exactly one email to the right address?" | Mock or Spy |
| "This collaborator is irrelevant here but required by the signature." | Dummy |

## Common mistakes

**Over-mocking.** The most frequent anti-pattern is using mocks (with verification) when stubs would do. If your test only needs data, do not assert on how it was fetched — that couples the test to internal calls and makes refactoring painful.

**Mocking what you don't own.** Mocking a third-party library's internals freezes your test against their implementation. Wrap external dependencies behind your own thin interface and double *that* instead.

**Asserting on stub calls.** If you find yourself wanting to verify a stub was called, you actually need a spy or a mock — pick the right tool rather than bolting verification onto a stub.

**Fakes that drift.** An in-memory fake can pass tests while diverging from the real implementation's behavior. Periodically run the same contract test suite against both the fake and the real implementation to catch drift.

For how these doubles apply specifically to HTTP and microservice boundaries, see the service virtualization and API mocking material in our [blog](/blog), and compare concrete tooling on the [comparison hub](/compare).

## Quick reference: framework terminology

Different ecosystems name these differently, which is a major source of confusion:

- **Jest / Vitest** — `jest.fn()` and `jest.mock()` create flexible doubles that act as stub, spy, or mock depending on whether you set return values, inspect `.mock.calls`, or assert expectations.
- **Python `unittest.mock`** — `Mock` and `MagicMock` records calls (spy-like) and supports `assert_called_with` (mock-like); `return_value` makes it a stub.
- **Mockito (Java)** — `when(...).thenReturn(...)` is stubbing; `verify(...)` is mocking/behavior verification.
- **Moq (.NET)** — `Setup(...).Returns(...)` stubs; `Verify(...)` performs behavior verification.

The library API may call everything a "mock," but the *role* the double plays in your test — supplier of data versus verifier of interaction — is what determines whether you have written a stub, a spy, or a true mock.

## Frequently Asked Questions

### What is the difference between a stub and a mock?

A stub supplies canned data so the system under test can run, and you verify the test by asserting on the result (state verification). A mock is pre-programmed with expectations about which calls it should receive and fails the test automatically if those interactions do not happen as specified (behavior verification). Use a stub when you need data; use a mock when the interaction itself is the behavior you are testing.

### What is the difference between a mock and a spy?

A mock has expectations baked in before the test runs and verifies them itself, so the mock effectively is the assertion. A spy passively records how it was called and lets you write the assertions yourself afterward; it can also wrap a real implementation to record calls while preserving genuine behavior. In short, a spy records and you check later, while a mock checks for you.

### When should I use a fake instead of a stub?

Use a fake when you need realistic, stateful behavior across multiple operations — for example, saving a record and then reading it back. A stub returns fixed responses and cannot model that round-trip without many brittle canned answers. A fake, such as an in-memory repository, implements the real interface with a shortcut, so multi-step workflows behave naturally at the cost of having extra code to maintain.

### Are all test doubles called mocks?

No, although the term is used loosely. There are five distinct doubles — dummy, stub, spy, mock, and fake — and many libraries label all of them "mocks," which causes confusion. Precise usage helps: a stub supplies data, a spy records calls, a mock verifies interactions, a fake provides a working shortcut implementation, and a dummy merely fills a required slot.

### What is over-mocking and why is it a problem?

Over-mocking means using behavior-verifying mocks where a stub would suffice, asserting on how the code called its collaborators rather than on the result it produced. This couples tests to implementation details, so they break during refactors even when the observable behavior is unchanged. Prefer state verification with stubs and fakes, and reserve mocks for meaningful side effects like sending email or charging a payment.

### Should I prefer state verification or behavior verification?

Prefer state verification by default. Asserting on the result keeps tests decoupled from how the code is implemented, so they remain stable as you refactor internals. Use behavior verification only when the interaction is the actual outcome you care about — typically at the boundary where your system causes an external side effect such as a payment, an email, or a published message.
