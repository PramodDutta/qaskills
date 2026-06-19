import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Test Smells & Anti-Patterns Guide: How to Refactor (2026)",
  description: "Spot common test smells and unit-testing anti-patterns, understand why they hurt, and refactor them with before/after code in Python, JS, and Java.",
  date: "2026-06-15",
  category: "Testing",
  content: `# Test Smells & Anti-Patterns: A Refactoring Guide

A test smell is a symptom in test code that signals a deeper design problem — the test is hard to read, brittle, slow, or unreliable, even when it currently passes. Like code smells, test smells are not bugs themselves but warning signs that a test will be expensive to maintain or will give false confidence. Common examples include assertion roulette, eager tests, mystery guests, test interdependence, and over-mocking. The fix is almost always to make each test small, isolated, deterministic, and focused on one behavior.

This guide catalogs the most common test smells and anti-patterns, explains why each one hurts, and shows concrete before/after refactors so you can clean them up rather than just recognize them.

## Why test smells matter more than you think

Tests are code, but they are also your safety net and your living documentation. A smelly test fails in the worst ways: it passes when the code is broken (false negative), fails when nothing is wrong (false positive/flaky), or is so tangled that nobody dares change it. Over time a smelly suite becomes a liability — developers stop trusting it, stop running it, and eventually stop maintaining it.

Good tests share four properties, often summarized as **FIRST**: Fast, Isolated, Repeatable, Self-validating, and Timely. Most test smells are a violation of one of these. The refactors in this guide all move tests back toward FIRST.

| Property | Smell when violated |
|---|---|
| Fast | Slow tests (real I/O, sleeps) |
| Isolated | Interdependent tests, shared state |
| Repeatable | Flaky tests, hidden dependencies on time/order |
| Self-validating | No assertions, conditional logic in tests |
| Timely | Tests written long after code, testing implementation |

## Assertion roulette

**The smell:** a test contains many assertions with no messages, so when one fails you cannot tell *which* line broke without a debugger.

\`\`\`python
# Smell: which assert failed? No idea from the output.
def test_user_profile():
    u = build_user()
    assert u.name == "Ada"
    assert u.age == 36
    assert u.email == "ada@example.com"
    assert u.is_active
    assert u.role == "admin"
\`\`\`

**Why it hurts:** the failure output just says "assert failed" on some line; with five bare asserts you waste time bisecting. It also hints the test is checking too many things at once.

**Refactor:** split into focused tests, or at minimum add messages / use richer matchers. Best is one logical assertion per test:

\`\`\`python
# Better: each test names one behavior; failures are self-describing
def test_new_user_is_active_by_default():
    assert build_user().is_active

def test_new_user_has_admin_role():
    assert build_user().role == "admin"
\`\`\`

When grouping genuinely belongs together (one object's shape), assert on the whole object so the diff is readable:

\`\`\`python
def test_user_profile_shape():
    assert build_user() == User(
        name="Ada", age=36, email="ada@example.com",
        is_active=True, role="admin",
    )  # one diff, shows exactly what differs
\`\`\`

## The eager test (testing too much)

**The smell:** one test exercises several behaviors or several methods in sequence, so its name cannot describe what it verifies and a single break fails the whole thing.

\`\`\`javascript
// Smell: this is really four tests wearing a trenchcoat
test('cart works', () => {
  const cart = new Cart();
  cart.add(item, 2);
  expect(cart.count()).toBe(2);
  cart.applyCoupon('SAVE10');
  expect(cart.total()).toBe(18);
  cart.remove(item);
  expect(cart.isEmpty()).toBe(true);
  cart.checkout();
  expect(cart.status).toBe('ordered');
});
\`\`\`

**Why it hurts:** when \`applyCoupon\` breaks, the test fails and you do not know whether removal or checkout also work. The name "cart works" documents nothing.

**Refactor:** one behavior per test, each independently runnable.

\`\`\`javascript
test('adding an item increases count', () => {
  const cart = new Cart();
  cart.add(item, 2);
  expect(cart.count()).toBe(2);
});

test('a 10% coupon reduces the total', () => {
  const cart = new Cart();
  cart.add(item, 2);          // $20
  cart.applyCoupon('SAVE10');
  expect(cart.total()).toBe(18);
});
\`\`\`

Yes, there is some setup duplication. That is fine — clarity beats DRY in tests. Extract setup into a small builder or \`beforeEach\` only when it genuinely repeats.

## Mystery guest and the obscure setup

**The smell:** a test depends on data it does not create or show — an external file, a shared database row, a fixture defined far away. The reader cannot understand the test from the test.

\`\`\`java
// Smell: where does user #42 come from? What's in orders.sql?
@Test
void userHasThreeOrders() {
    User u = userRepository.findById(42L);   // mystery guest
    assertEquals(3, u.getOrders().size());   // why 3? unknowable here
}
\`\`\`

**Why it hurts:** the test breaks when someone edits \`orders.sql\` or another test mutates user 42. The "why 3" magic number is undocumented coupling.

**Refactor:** make the test create and own its data so the setup is visible and local.

\`\`\`java
@Test
void userHasThreeOrders() {
    User u = userRepository.save(new User("Ada"));
    orderRepository.saveAll(List.of(
        new Order(u), new Order(u), new Order(u)
    ));

    User loaded = userRepository.findById(u.getId()).orElseThrow();
    assertEquals(3, loaded.getOrders().size());  // 3 is now obvious
}
\`\`\`

The test now reads top to bottom and cannot be sabotaged by unrelated fixtures.

## Interdependent tests (chained / ordered tests)

**The smell:** tests must run in a specific order because one leaves state that another consumes. Run them alone, or in parallel, and they fail.

\`\`\`python
# Smell: test_b depends on the row test_a created
class TestAccount:
    def test_a_create(self):
        global ACC
        ACC = create_account("ada")
        assert ACC.id

    def test_b_deposit(self):
        ACC.deposit(100)            # explodes if test_a didn't run first
        assert ACC.balance == 100
\`\`\`

**Why it hurts:** this breaks the **Isolated** and **Repeatable** properties. Parallel runners, test filtering (\`-k\`), and randomized order all shatter it. It is also a leading cause of flakiness.

**Refactor:** each test builds its own state. Use fixtures for shared setup, never shared *mutable* globals.

\`\`\`python
import pytest

@pytest.fixture
def account():
    return create_account("ada")   # fresh per test

def test_create(account):
    assert account.id

def test_deposit(account):
    account.deposit(100)
    assert account.balance == 100
\`\`\`

Run your suite in random order (\`pytest-randomly\`, Jest's default sharding) in CI to catch ordering dependencies before they bite.

## Over-mocking (the mock-everything anti-pattern)

**The smell:** the test mocks so many collaborators that it only verifies the mocks were called — it tests the test's own wiring, not real behavior.

\`\`\`javascript
// Smell: every collaborator mocked; asserts only that mocks were called
test('checkout charges the card', () => {
  const repo = { save: jest.fn() };
  const gateway = { charge: jest.fn().mockReturnValue({ ok: true }) };
  const mailer = { send: jest.fn() };
  const svc = new Checkout(repo, gateway, mailer);

  svc.run(order);

  expect(gateway.charge).toHaveBeenCalled();  // tests wiring, not logic
  expect(mailer.send).toHaveBeenCalled();
});
\`\`\`

**Why it hurts:** these tests pass even when the real logic is wrong, and they break whenever you refactor internals (change a method name and the mock assertion fails despite identical behavior). They are tightly coupled to implementation, the opposite of what tests should be.

**Refactor:** mock only true external boundaries (network, payment gateway, clock), use real objects for your own domain code, and assert on *outcomes* rather than interactions where possible.

\`\`\`javascript
test('a successful charge marks the order paid', () => {
  // Mock only the external gateway; use the real order + repo (in-memory)
  const gateway = { charge: () => ({ ok: true }) };
  const repo = new InMemoryOrderRepo();
  const svc = new Checkout(repo, gateway, noopMailer);

  svc.run(order);

  expect(repo.find(order.id).status).toBe('paid');  // real outcome
});
\`\`\`

The distinction between mocks, stubs, spies, and fakes matters here — choosing the right double avoids over-coupling. The [QA skills directory](/skills) collects framework-specific skills for getting this balance right.

## More smells to recognize and fix

These appear constantly; the fix is short for each.

| Smell | What it looks like | Fix |
|---|---|---|
| **Conditional test logic** | \`if\`/\`for\`/\`try\` inside the test deciding what to assert | Split branches into separate tests; tests must be linear |
| **Magic numbers/strings** | \`assert total == 47.2\` with no explanation | Name the constant or derive it in the test |
| **Sleep-driven waits** | \`time.sleep(2)\` to wait for async | Poll a condition / await explicitly; never fixed sleeps |
| **Test code duplication** | Same 10-line setup copied everywhere | Extract a builder or fixture (but keep assertions inline) |
| **Empty / no-assertion test** | Calls code, asserts nothing | Add a real assertion or delete the test |
| **Testing private internals** | Reflection to poke a private field | Test through the public API; if you can't, the design is wrong |
| **The free ride / piggyback** | Adding an unrelated assert to an existing test | Write a new, named test instead |
| **Redundant print/log** | \`print(result)\` left in the test | Remove; rely on assertion messages |

### Sleep-driven waits, fixed

The flakiest smell of all. Replace the sleep with a wait-for-condition:

\`\`\`python
# Smell
start_job()
time.sleep(5)
assert job_status() == "done"   # flaky: 5s is a guess

# Fixed: poll up to a timeout, return as soon as ready
import time
def wait_until(predicate, timeout=10, interval=0.1):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if predicate():
            return
        time.sleep(interval)
    raise TimeoutError("condition not met in time")

start_job()
wait_until(lambda: job_status() == "done")
assert job_status() == "done"
\`\`\`

This is faster (returns immediately when ready) and far more reliable than a fixed sleep.

## A refactoring workflow for an existing smelly suite

You rarely get to rewrite a suite from scratch. Clean it incrementally:

1. **Make it run in random order.** Turn on randomized ordering in CI. Every failure exposes an interdependence smell to fix first — these are the highest-leverage.
2. **Hunt zero-assertion and conditional tests.** A test with no assert or with branching logic is the least trustworthy. Fix or delete these next.
3. **Localize mystery guests.** Move external fixtures and shared rows into per-test setup. This kills a whole class of flakiness.
4. **Split eager tests.** Break "does everything" tests into one-behavior tests with descriptive names. Your failure output becomes documentation.
5. **Right-size the mocks.** Replace mocked domain objects with real ones; keep mocks only at true external boundaries.
6. **Quarantine, don't ignore, the stubborn flakes.** Tests you cannot stabilize immediately go into a tracked quarantine lane with an owner and deadline rather than a silent \`skip\`.

Treat the cleanup like any refactor: small commits, suite green after each, no behavior change to production code. You can compare related testing approaches and tooling on the [comparison hub](/compare).

## Common questions about test smells

The recurring confusion is between a smell and a failure. A smelly test that passes is still a problem because it is fragile or misleading — it will fail you later, at the worst time. The goal of refactoring tests is not to make them pass (they may already pass) but to make them *trustworthy*: fast, isolated, deterministic, and readable enough to serve as documentation.

## Frequently Asked Questions

### What is the difference between a test smell and a code smell?

A code smell is a symptom in production code that suggests a design weakness, while a test smell is the same idea applied to test code — a sign the test is brittle, slow, unclear, or unreliable. Both are warning signs rather than outright bugs. Test smells are especially dangerous because a smelly test can pass while giving false confidence, so the code looks safe when it is not.

### Is having many assertions in one test always a smell?

Not always. The smell called assertion roulette is specifically about *unrelated* assertions with no messages that make failures hard to diagnose. Asserting on multiple properties of one object, or asserting the whole object in a single comparison, is fine because the failure diff still points at exactly what differs. The real rule is one *behavior* per test, not literally one \`assert\`.

### Why is over-mocking considered an anti-pattern?

Over-mocking couples a test to the implementation rather than the behavior, so the test passes even when the logic is wrong and breaks whenever you refactor internals. Tests that only verify "this mock was called" do not prove the system produces the right outcome. Mock only true external boundaries like networks, payment gateways, and the clock, and use real objects for your own domain code.

### How do I fix flaky tests caused by timing?

Replace fixed sleeps with a wait-for-condition loop that polls until the expected state is reached or a timeout expires. This returns as soon as the condition is true, making the test both faster and more reliable. For deeper timing issues, inject a fake clock, seed randomness deterministically, and ensure async work is properly awaited rather than fire-and-forget.

### Should I delete a smelly test or refactor it?

Refactor it if it covers behavior you still care about, because the coverage is valuable even when the test is messy. Delete it only when it is redundant, tests private internals that no longer exist, or asserts nothing meaningful. A test with no assertions or one that duplicates another test's coverage is usually safe to remove rather than maintain.

### What does the FIRST acronym stand for in testing?

FIRST stands for Fast, Isolated, Repeatable, Self-validating, and Timely. Fast and Isolated keep tests quick and independent of each other, Repeatable means they produce the same result every run regardless of environment or order, Self-validating means they pass or fail without manual interpretation, and Timely means they are written close to the code they test. Most test smells are a violation of one of these principles.
`,
};
