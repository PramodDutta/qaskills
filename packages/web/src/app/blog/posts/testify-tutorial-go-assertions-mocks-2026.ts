import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Testify Tutorial: Go Assertions, Mocks & Suites (2026)",
  description: "Testify tutorial for Go in 2026 — assert vs require, the mock package, testify/suite lifecycle, and runnable examples for cleaner Go tests on top of testing.",
  date: "2026-06-15",
  category: "Go",
  content: `# Testify Tutorial: Go Assertions, Mocks & Suites (2026)

**Testify is the most widely used Go testing toolkit, layered on top of the standard \`testing\` package.** It gives you three things the standard library leaves you to write by hand: rich assertions (\`assert\`/\`require\`), a mocking framework (\`mock\`), and an xUnit-style lifecycle (\`suite\`). You still run everything with \`go test\` — Testify does not replace the runner, it makes the test bodies far terser. The single most important concept to learn first is the difference between \`assert\` (logs a failure and continues) and \`require\` (logs and stops the test). This tutorial covers all three packages with runnable code.

---

## Install

\`\`\`bash
go get github.com/stretchr/testify
\`\`\`

You then import the sub-packages you need:

\`\`\`go
import (
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
    "github.com/stretchr/testify/mock"
    "github.com/stretchr/testify/suite"
)
\`\`\`

---

## \`assert\` vs \`require\` — the core distinction

Both packages expose the same function names with identical signatures. The difference is what happens on failure:

| | Behavior on failure |
|---|---|
| \`assert.Equal(t, ...)\` | Records the failure, **test keeps running** |
| \`require.Equal(t, ...)\` | Records the failure, **calls \`t.FailNow()\` and stops** |

Rule of thumb: **use \`require\` for preconditions that make the rest of the test meaningless if they fail** (got an error, got a nil pointer), and \`assert\` for independent checks where you want to see all failures at once.

\`\`\`go
func TestUserLookup(t *testing.T) {
    u, err := repo.FindByID(42)

    require.NoError(t, err)      // if this fails, stop — u is unusable
    require.NotNil(t, u)         // same

    assert.Equal(t, "Ada", u.Name)      // independent checks: report all
    assert.Equal(t, "ada@x.io", u.Email)
    assert.True(t, u.Active)
}
\`\`\`

If you swapped \`require.NoError\` for \`assert.NoError\`, a failure there would let execution fall through to \`u.Name\` and panic on a nil dereference. That is exactly why \`require\` exists.

---

## Common assertions

Testify's assertion catalogue is large; these cover most day-to-day needs. Every one takes \`t\` first and an optional trailing message.

\`\`\`go
assert.Equal(t, expected, actual)          // deep equality (reflect.DeepEqual)
assert.NotEqual(t, a, b)
assert.Nil(t, err)
assert.NotNil(t, ptr)
assert.NoError(t, err)
assert.Error(t, err)
assert.ErrorIs(t, err, ErrNotFound)        // errors.Is wrapper
assert.ErrorContains(t, err, "timeout")
assert.True(t, ok)
assert.False(t, done)
assert.Len(t, items, 3)
assert.Contains(t, "hello world", "world")
assert.Contains(t, slice, wantedElem)
assert.ElementsMatch(t, a, b)              // same elements, any order
assert.Empty(t, list)
assert.Greater(t, count, 0)
assert.InDelta(t, 3.14159, got, 0.001)     // floats
assert.Panics(t, func() { mustParse("x") })
assert.Eventually(t, cond, 2*time.Second, 50*time.Millisecond) // polling
\`\`\`

A note on argument order: it is **\`(t, expected, actual)\`**. Reversing expected/actual still passes when they are equal, but produces backwards failure messages — a frequent source of confusion.

### Using the object API

If you make many assertions, create an \`*assert.Assertions\` bound to \`t\` so you can drop the repeated first argument:

\`\`\`go
func TestThings(t *testing.T) {
    a := assert.New(t)
    a.Equal(5, Add(2, 3))
    a.True(IsValid("x"))
    a.Len(List(), 2)
}
\`\`\`

---

## The \`mock\` package

\`testify/mock\` lets you build test doubles that record calls, return canned values, and assert expectations. You embed \`mock.Mock\` in a struct that satisfies the interface under test.

Suppose your code depends on this interface:

\`\`\`go
type EmailSender interface {
    Send(to, subject, body string) error
}
\`\`\`

Define a mock implementation:

\`\`\`go
type MockEmailSender struct {
    mock.Mock
}

func (m *MockEmailSender) Send(to, subject, body string) error {
    args := m.Called(to, subject, body)
    return args.Error(0)
}
\`\`\`

\`m.Called(...)\` forwards the arguments to Testify, which matches them against your configured expectations and returns the canned results. \`args.Error(0)\` reads the first return value as an \`error\`; use \`args.Get(0)\`, \`args.String(0)\`, \`args.Int(0)\`, \`args.Bool(0)\` for other types.

Use it in a test:

\`\`\`go
func TestSignup_SendsWelcomeEmail(t *testing.T) {
    sender := new(MockEmailSender)

    // Expect exactly this call; return nil. mock.Anything matches any arg.
    sender.On("Send", "ada@x.io", "Welcome", mock.Anything).
        Return(nil).
        Once()

    svc := NewSignupService(sender)
    err := svc.Register("ada@x.io")

    require.NoError(t, err)
    sender.AssertExpectations(t) // fails if the expected call never happened
}
\`\`\`

Key mock APIs:

- \`.On("Method", argMatchers...)\` configures an expectation.
- \`.Return(values...)\` sets what the mock returns.
- \`.Once()\`, \`.Times(n)\` constrain how many times it may be called.
- \`mock.Anything\` matches any value; \`mock.MatchedBy(fn)\` matches via a predicate.
- \`.AssertExpectations(t)\` verifies every \`.On(...)\` with a \`.Times\`/\`.Once\` constraint was satisfied.
- \`.AssertCalled(t, "Method", args...)\` / \`.AssertNotCalled(...)\` for ad-hoc checks.

To return dynamically computed values, use a \`Run\` callback:

\`\`\`go
sender.On("Send", mock.Anything, mock.Anything, mock.Anything).
    Run(func(args mock.Arguments) {
        to := args.String(0)
        t.Logf("captured recipient: %s", to)
    }).
    Return(nil)
\`\`\`

For larger codebases, the companion **mockery** code generator produces these mock types from your interfaces automatically, so you do not hand-write them.

---

## The \`suite\` package

\`testify/suite\` brings xUnit-style setup/teardown to Go. You embed \`suite.Suite\`, write \`TestXxx\` methods, and Testify discovers them. It is the closest thing Go has to JUnit/NUnit fixtures.

\`\`\`go
type CartSuite struct {
    suite.Suite
    cart *Cart
}

// Runs once before all tests in the suite
func (s *CartSuite) SetupSuite() {
    // expensive one-time setup, e.g. start a container
}

// Runs before EACH test method
func (s *CartSuite) SetupTest() {
    s.cart = NewCart()
}

// Runs after EACH test method
func (s *CartSuite) TearDownTest() {
    s.cart = nil
}

func (s *CartSuite) TestAddItem() {
    s.cart.Add("Mouse", 19.99)
    s.Equal(1, s.cart.Count())          // suite methods proxy to assert
    s.Require().NoError(s.cart.Checkout()) // .Require() for require-style
}

func (s *CartSuite) TestEmptyTotal() {
    s.Equal(0.0, s.cart.Total())
}

// The single entry point go test sees:
func TestCartSuite(t *testing.T) {
    suite.Run(t, new(CartSuite))
}
\`\`\`

Lifecycle hooks Testify recognizes:

- \`SetupSuite\` / \`TearDownSuite\` — once around the whole suite.
- \`SetupTest\` / \`TearDownTest\` — around every test method.
- \`BeforeTest(suiteName, testName)\` / \`AfterTest(...)\` — per-test with names.

Inside suite methods, \`s.Equal\`, \`s.NoError\`, etc. proxy to \`assert\`; call \`s.Require().NoError(...)\` for \`require\` semantics. Crucially, \`s.cart\` is reset by \`SetupTest\` before each method, so tests stay isolated.

---

## A realistic end-to-end example

Combining mocks, require, and assert in a service test:

\`\`\`go
func TestOrderService_PlaceOrder(t *testing.T) {
    payments := new(MockPaymentGateway)
    inventory := new(MockInventory)

    inventory.On("Reserve", "SKU-1", 2).Return(nil).Once()
    payments.On("Charge", mock.MatchedBy(func(amt float64) bool {
        return amt > 0
    })).Return("txn_123", nil).Once()

    svc := NewOrderService(payments, inventory)
    order, err := svc.PlaceOrder("SKU-1", 2, 39.98)

    require.NoError(t, err)
    require.NotNil(t, order)
    assert.Equal(t, "txn_123", order.TransactionID)
    assert.Equal(t, StatusPaid, order.Status)

    inventory.AssertExpectations(t)
    payments.AssertExpectations(t)
}
\`\`\`

## Asserting on errors, collections, and async

Three categories cover most real assertions, and Testify handles each cleanly.

For **errors**, prefer the \`errors.Is\`/\`errors.As\`-aware helpers over string matching so wrapping does not break tests:

\`\`\`go
assert.ErrorIs(t, err, ErrNotFound)        // matches even if wrapped with %w
var ve *ValidationError
assert.ErrorAs(t, err, &ve)                // unwraps to a concrete type
assert.EqualError(t, err, "record not found") // exact message
\`\`\`

For **collections**, order-insensitive comparison avoids brittle tests when a map or query gives no ordering guarantee:

\`\`\`go
assert.ElementsMatch(t, []int{1, 2, 3}, got) // same elements, any order
assert.Subset(t, got, []string{"admin"})     // got contains these
assert.ElementsMatch(t, want, got)
\`\`\`

For **eventual conditions** (background goroutines, retries), \`assert.Eventually\` polls until the predicate holds or the timeout elapses:

\`\`\`go
done := false
go func() { time.Sleep(50 * time.Millisecond); done = true }()

assert.Eventually(t, func() bool { return done },
    time.Second, 10*time.Millisecond)
\`\`\`

These three families — \`ErrorIs\`/\`ErrorAs\`, \`ElementsMatch\`/\`Subset\`, and \`Eventually\` — eliminate most of the flaky, brittle assertions teams write by hand.

## Combining Testify with the table-driven idiom

Testify does not replace Go's table-driven pattern — it makes the per-case body cleaner. Keep the slice-of-structs loop and \`t.Run\`, but assert with \`require\`/\`assert\`:

\`\`\`go
func TestParseAge(t *testing.T) {
    tests := []struct {
        name    string
        in      string
        want    int
        wantErr bool
    }{
        {"valid", "42", 42, false},
        {"empty", "", 0, true},
        {"non-numeric", "abc", 0, true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseAge(tt.in)
            if tt.wantErr {
                require.Error(t, err)
                return
            }
            require.NoError(t, err)
            assert.Equal(t, tt.want, got)
        })
    }
}
\`\`\`

This is the most common real-world Testify shape: the standard library provides the structure (subtests, parallelism, coverage), Testify provides the assertions and mocks.

## Generating mocks with mockery

Hand-writing mock types is tedious and error-prone for large interfaces. **mockery** generates them from your interfaces. A typical \`.mockery.yaml\` configures the packages to scan:

\`\`\`yaml
with-expecter: true
packages:
  github.com/example/app/internal/email:
    interfaces:
      EmailSender:
\`\`\`

\`\`\`bash
go run github.com/vektra/mockery/v2@latest
\`\`\`

With \`with-expecter: true\`, mockery emits a type-safe builder so you get compile-time-checked expectations instead of stringly-typed \`.On("Send", ...)\`:

\`\`\`go
sender := NewMockEmailSender(t) // generated; auto-registers Cleanup/AssertExpectations
sender.EXPECT().Send("ada@x.io", "Welcome", mock.Anything).Return(nil).Once()
\`\`\`

The generated \`NewMockX(t)\` constructor wires \`AssertExpectations\` into \`t.Cleanup\` automatically, so you cannot forget to verify.

For when Testify is the right tool versus other Go testing styles, and how it pairs with the table-driven idiom, see the [QA skills directory](/skills), the Go-testing entries on the [blog](/blog), and the side-by-side breakdowns on the [comparison hub](/compare).

---

## CI usage (GitHub Actions)

\`\`\`yaml
name: go-tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.23'
          cache: true
      - run: go test -race -v ./...
\`\`\`

Testify needs no special CI flags — it runs under plain \`go test\`.

---

## Common errors and troubleshooting

- **Test "passes" despite a failed \`assert\`** — that is by design; \`assert\` only records the failure. If you needed it to stop, use \`require\`.
- **Mock panics with "mock: I don't know what to return"** — the method was called with arguments that match no \`.On(...)\` expectation. Add the expectation or loosen the matchers (\`mock.Anything\`).
- **\`AssertExpectations\` fails unexpectedly** — an \`.On(...)\` with \`.Once()\`/\`.Times(n)\` was never called the required number of times, or was called with different args.
- **Backwards failure messages** — you passed \`(t, actual, expected)\`; the order is \`(t, expected, actual)\`.
- **Suite methods not running** — the method names must start with \`Test\` and have no arguments, and you must call \`suite.Run(t, new(YourSuite))\` from a top-level \`TestXxx\` function.
- **Float comparison flakiness** — use \`assert.InDelta\`/\`assert.InEpsilon\` instead of \`assert.Equal\` for floating point.

---

## Frequently Asked Questions

### What is the difference between assert and require in Testify?

They share identical function names and signatures, but \`assert\` records a failure and lets the test continue, while \`require\` records the failure and immediately stops the test via \`t.FailNow()\`. Use \`require\` for preconditions (no error, non-nil) where continuing would panic, and \`assert\` for independent checks where you want every failure reported.

### Does Testify replace the standard \`testing\` package?

No. Testify is a layer on top of \`testing\` — you still write \`func TestXxx(t *testing.T)\` and run \`go test\`. Testify only supplies richer assertions, a mock framework, and the suite lifecycle. The runner, parallelism, coverage, and benchmarks all come from the standard library.

### How do I create a mock with Testify?

Embed \`mock.Mock\` in a struct that implements your interface. In each method, call \`m.Called(args...)\` and read return values from the result (\`args.Error(0)\`, \`args.Get(0)\`, etc.). Configure behavior in the test with \`.On("Method", matchers...).Return(values...)\`, then verify with \`AssertExpectations(t)\`. For many interfaces, the mockery generator can produce these mocks automatically.

### When should I use testify/suite instead of plain tests?

Use a suite when several tests share non-trivial setup/teardown — a database connection, a started container, seeded fixtures. The \`SetupTest\`/\`TearDownTest\` hooks reset shared state around each test method, giving xUnit-style isolation. For simple, independent tests, plain functions plus the table-driven pattern are leaner.

### What does \`mock.Anything\` do?

\`mock.Anything\` is a wildcard matcher that accepts any value for that argument position when matching a call to a configured expectation. Use it when you do not care about a particular argument. For conditional matching, use \`mock.MatchedBy(func(x T) bool { ... })\`, which matches only when your predicate returns true.

### Is the argument order expected-then-actual or actual-then-expected?

Testify uses \`(t, expected, actual)\`. The assertion still passes when the two are equal regardless of order, but the failure message labels them "expected" and "actual" based on position, so reversing them produces confusing diffs. Keep the expected value second and the actual value third.
`,
};
