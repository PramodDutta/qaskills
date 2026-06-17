TITLE: Moq Tutorial: .NET Mocking Guide for C# (2026)
DESCRIPTION: A practical Moq tutorial for .NET: Setup, Returns, Verify, It.IsAny, mocking async methods and properties, exceptions, and xUnit integration in C#.
DATE: 2026-06-15
CATEGORY: .NET
---
# Moq Tutorial: .NET Mocking Guide for C#

Moq is the most popular mocking library for .NET. It lets you create test doubles of your interfaces and virtual classes so you can isolate the class under test, control what its dependencies return, and verify how they were called. The everyday workflow is small: create a mock with `new Mock<IService>()`, configure behavior with `Setup(x => x.Method()).Returns(value)`, pass `mock.Object` into your class under test, and confirm interactions with `Verify(x => x.Method(), Times.Once)`. Argument matchers like `It.IsAny<T>()` let stubs respond to ranges of inputs. Moq works with any .NET test runner — xUnit, NUnit, or MSTest — and targets modern .NET (8/9) as well as .NET Framework.

This guide walks through Moq from install to a realistic end-to-end test: setting up returns, matching arguments, mocking properties and async methods, throwing exceptions, verifying calls, and the errors you will hit. For installable, agent-ready .NET testing skills, see the [QASkills directory](/skills).

## Installing Moq

Add the Moq package to your test project. With the .NET CLI:

```bash
dotnet add package Moq
dotnet add package xunit
dotnet add package xunit.runner.visualstudio
```

Or in the `.csproj`:

```xml
<ItemGroup>
  <PackageReference Include="Moq" Version="4.20.72" />
  <PackageReference Include="xunit" Version="2.9.2" />
  <PackageReference Include="xunit.runner.visualstudio" Version="2.8.2" />
</ItemGroup>
```

One important rule: **Moq can only mock interfaces, abstract classes, and virtual/abstract members.** It cannot mock non-virtual methods, static methods, or sealed classes because it generates a subclass at runtime and can only override what is overridable. In practice this nudges you toward depending on interfaces, which is good design anyway. Import the namespace with `using Moq;`.

## Your first mock: Setup and Returns

Suppose a service depends on a repository interface:

```csharp
public interface IUserRepository
{
    User? FindById(long id);
}

public class UserService
{
    private readonly IUserRepository _repository;
    public UserService(IUserRepository repository) => _repository = repository;

    public string Greet(long id)
    {
        var user = _repository.FindById(id);
        if (user is null) throw new UserNotFoundException(id);
        return $"Hello, {user.Name}";
    }
}
```

A focused unit test mocks the repository so no database is touched:

```csharp
using Moq;
using Xunit;

public class UserServiceTests
{
    [Fact]
    public void GreetsKnownUser()
    {
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.FindById(1L))
                  .Returns(new User(1L, "Ada"));

        var service = new UserService(repository.Object);

        Assert.Equal("Hello, Ada", service.Greet(1L));
    }
}
```

`Setup(r => r.FindById(1L))` is a lambda expressing which call to configure; `.Returns(...)` supplies the result. Crucially, you pass `repository.Object` — the actual generated instance — into the class under test, not the `Mock<T>` wrapper itself. By default, an unconfigured method returns the type's default (`null` for reference types, `0` for numbers, `false` for booleans), so calling `Greet` with an unstubbed id triggers the not-found path.

## Argument matchers: It.IsAny, It.Is

Often you do not care about the exact argument, or you want the stub to match a range. The `It` class provides matchers.

```csharp
// Match any long
repository.Setup(r => r.FindById(It.IsAny<long>()))
          .Returns(new User(0, "anon"));

// Match a predicate
repository.Setup(r => r.FindById(It.Is<long>(id => id > 0)))
          .Returns(new User(1, "positive"));

// Match a specific value (equivalent to passing the literal)
repository.Setup(r => r.FindById(It.IsAny<long>()))
          .Returns((long id) => new User(id, $"user-{id}"));
```

`It.IsAny<T>()` matches any value of that type; `It.Is<T>(predicate)` matches when the predicate is true; `It.IsIn(...)` / `It.IsInRange(...)` match sets and ranges. The last example shows a powerful feature: `Returns` can take a lambda receiving the actual arguments, so the return value is computed from the input — equivalent to Mockito's `thenAnswer`.

## Mocking properties and async methods

Properties are configured with `SetupGet` (and `SetupSet` for setters), or `SetupProperty` to make the mock track an assignable value.

```csharp
var clock = new Mock<IClock>();
clock.SetupGet(c => c.UtcNow).Returns(new DateTime(2026, 1, 1));

// Make a property behave like an auto-property that remembers what you set
var settings = new Mock<ISettings>();
settings.SetupProperty(s => s.Theme, "dark");
settings.Object.Theme = "light";   // now returns "light"
```

For `async` methods that return `Task<T>`, use `ReturnsAsync` (and `ThrowsAsync` for failures) so you do not have to wrap values in `Task.FromResult` yourself:

```csharp
var api = new Mock<IWeatherApi>();
api.Setup(a => a.GetTempAsync("London"))
   .ReturnsAsync(14);

api.Setup(a => a.GetTempAsync("Mars"))
   .ThrowsAsync(new HttpRequestException("unreachable"));
```

`ReturnsAsync(value)` returns a completed task with that value; `ThrowsAsync(ex)` returns a faulted task. This keeps async tests clean and reads naturally.

## Throwing exceptions

To test error handling, configure a setup to throw:

```csharp
repository.Setup(r => r.FindById(It.IsAny<long>()))
          .Throws(new TimeoutException("db slow"));

// Or throw based on arguments
repository.Setup(r => r.FindById(It.IsAny<long>()))
          .Throws<InvalidOperationException>();
```

This lets you exercise catch blocks, retries, and fallback logic deterministically.

## Verifying interactions

Setup controls inputs; `Verify` asserts that calls happened (and how many times). Pass a `Times` value to specify cardinality.

```csharp
var mailer = new Mock<IMailer>();
var service = new NotificationService(mailer.Object);

service.Welcome(new User(1, "Ada", "ada@example.com"));

// Exactly once
mailer.Verify(m => m.Send(It.IsAny<Email>()), Times.Once);

// Never
mailer.Verify(m => m.Send(It.Is<Email>(e => e.IsSpam)), Times.Never);

// At least / exact counts
mailer.Verify(m => m.Send(It.IsAny<Email>()), Times.AtLeastOnce);
mailer.Verify(m => m.Send(It.IsAny<Email>()), Times.Exactly(1));
```

`Times.Once`, `Times.Never`, `Times.AtLeastOnce`, `Times.Exactly(n)`, `Times.Between(...)` cover the cardinalities. To assert that the mock received **no calls at all beyond what you verified**, use `mailer.VerifyNoOtherCalls()` after your `Verify` statements. Verify deliberately — over-verifying couples tests to implementation detail.

To capture and assert on a complex argument, combine `It.Is` with a predicate, or use a `Callback` to stash the value:

```csharp
Email? captured = null;
mailer.Setup(m => m.Send(It.IsAny<Email>()))
      .Callback<Email>(e => captured = e);

service.Welcome(new User(1, "Ada", "ada@example.com"));

Assert.Equal("ada@example.com", captured!.To);
```

`Callback` runs your delegate when the mocked method is called, giving you the actual argument — Moq's equivalent of an argument captor.

## A realistic end-to-end test

Putting it together for a checkout service that charges a gateway and saves the order:

```csharp
public class CheckoutServiceTests
{
    [Fact]
    public async Task ChargesAndPersistsOnSuccess()
    {
        var gateway = new Mock<IPaymentGateway>();
        var orders = new Mock<IOrderRepository>();

        gateway.Setup(g => g.ChargeAsync("tok_visa", 4200))
               .ReturnsAsync(new ChargeResult("ch_1", Success: true));

        Order? saved = null;
        orders.Setup(o => o.SaveAsync(It.IsAny<Order>()))
              .Callback<Order>(o => saved = o)
              .Returns(Task.CompletedTask);

        var checkout = new CheckoutService(gateway.Object, orders.Object);

        var receipt = await checkout.PurchaseAsync("tok_visa", 4200);

        Assert.Equal("ch_1", receipt.ChargeId);
        Assert.Equal(OrderStatus.Paid, saved!.Status);
        orders.Verify(o => o.SaveAsync(It.IsAny<Order>()), Times.Once);
    }

    [Fact]
    public async Task DoesNotPersistWhenDeclined()
    {
        var gateway = new Mock<IPaymentGateway>();
        var orders = new Mock<IOrderRepository>();

        gateway.Setup(g => g.ChargeAsync(It.IsAny<string>(), It.IsAny<long>()))
               .ReturnsAsync(new ChargeResult(null, Success: false));

        var checkout = new CheckoutService(gateway.Object, orders.Object);

        await Assert.ThrowsAsync<PaymentDeclinedException>(
            () => checkout.PurchaseAsync("tok_bad", 4200));

        orders.Verify(o => o.SaveAsync(It.IsAny<Order>()), Times.Never);
    }
}
```

This isolates `CheckoutService` from the real gateway and database, exercises the success and declined paths, captures the saved order to assert its status, and verifies the side effects.

## MockBehavior: Loose vs Strict

By default Moq creates **loose** mocks — unconfigured members return defaults silently. You can opt into **strict** mocks that throw on any call you did not set up:

```csharp
var repo = new Mock<IUserRepository>(MockBehavior.Strict);
repo.Setup(r => r.FindById(1)).Returns(new User(1, "Ada"));
// Any unconfigured call now throws MockException
```

Strict mode catches unexpected interactions early but makes tests brittle to incidental calls. Most teams default to loose and rely on explicit `Verify` for the interactions that matter, reserving strict mode for tests where any unanticipated call is genuinely a bug.

## Sequences, VerifyAll, and Mock.Of shortcuts

A few more Moq features round out everyday use. **`SetupSequence`** returns different values on successive calls — exactly what you need to test retry loops or polling:

```csharp
api.SetupSequence(a => a.Poll())
   .Returns("pending")
   .Returns("pending")
   .Returns("done")
   .Throws<TimeoutException>();   // and beyond
```

Each call to `Poll()` advances through the sequence. **`VerifyAll`** asserts that every setup you declared was actually exercised, catching dead setups in one call instead of writing a `Verify` per setup:

```csharp
var mock = new Mock<IUserRepository>();
mock.Setup(r => r.FindById(1)).Returns(new User(1, "Ada"));
// ...act...
mock.VerifyAll();   // fails if FindById(1) was never called
```

For a quick stub where you do not need the `Mock<T>` wrapper at all, **`Mock.Of<T>()`** creates a pre-configured instance in one expression using a LINQ-style predicate:

```csharp
IClock clock = Mock.Of<IClock>(c => c.UtcNow == new DateTime(2026, 1, 1));
var service = new ReportService(clock);   // pass it directly, no .Object
```

This is concise for simple value stubs, though for verification you still need the full `Mock<T>` form. Finally, the **`Protected()`** API lets you set up `protected` virtual members by name (since you cannot reference them in a lambda), which occasionally helps when testing classes designed for inheritance.

## Organizing mocks across a test class

As a class grows, recreating mocks in every method becomes repetitive. A common pattern is to create the mocks in the constructor (xUnit instantiates the test class per test, giving you a fresh set automatically) and expose the system under test as a field:

```csharp
public class CheckoutServiceTests
{
    private readonly Mock<IPaymentGateway> _gateway = new();
    private readonly Mock<IOrderRepository> _orders = new();
    private readonly CheckoutService _sut;

    public CheckoutServiceTests()
    {
        _sut = new CheckoutService(_gateway.Object, _orders.Object);
    }

    [Fact]
    public async Task ChargesOnSuccess()
    {
        _gateway.Setup(g => g.ChargeAsync(It.IsAny<string>(), It.IsAny<long>()))
                .ReturnsAsync(new ChargeResult("ch_1", true));

        await _sut.PurchaseAsync("tok_visa", 4200);

        _orders.Verify(o => o.SaveAsync(It.IsAny<Order>()), Times.Once);
    }
}
```

Because xUnit creates a new instance of the test class for each `[Fact]`, the mocks and the system under test are reconstructed fresh per test, so there is no shared state to reset — a clean default that avoids the leakage bugs you can get when reusing a single mock across tests. (NUnit and MSTest reuse the instance differently, so with those you would reinitialize in a `[SetUp]`/`[TestInitialize]` method.) Keeping the arrange-shared parts in the constructor and the test-specific `Setup` calls inside each method keeps the suite DRY and readable.

## Common errors and fixes

- **Passing `mock` instead of `mock.Object`** — the class under test needs the generated instance; passing the `Mock<T>` wrapper is a compile error or wrong type.
- **"Invalid setup on a non-virtual member"** — Moq can only mock interfaces and virtual/abstract members. Extract an interface or make the member `virtual`.
- **Setup not matching** — the argument matcher does not match the actual call. Loosen with `It.IsAny<T>()` while debugging, then tighten. Remember `It.Is` predicates must return true for the call to match.
- **Async test returns default** — you used `Returns` on a `Task<T>` method without a real task; use `ReturnsAsync(value)` (or `Returns(Task.FromResult(value))`).
- **`MockException` with strict behavior** — a call you did not set up was made; either set it up or switch to loose behavior if the call is incidental.

For more on .NET testing and how Moq compares to other libraries, see the [comparison hub](/compare) and the [blog](/blog).

## Frequently Asked Questions

### What is Moq used for in .NET?

Moq is a mocking library for .NET that creates test doubles of interfaces and virtual members so you can isolate the class under test. You configure what dependencies return with `Setup().Returns()`, inject `mock.Object` into your code, and verify interactions with `Verify()`. It removes the need to hit real databases, HTTP services, or other slow dependencies in unit tests.

### Why must I pass mock.Object instead of the mock?

`new Mock<IService>()` creates a wrapper that configures behavior, while `mock.Object` is the actual generated instance implementing `IService`. Your class under test expects an `IService`, so you pass `mock.Object`. Using the `Mock<T>` wrapper directly would not satisfy the dependency's type and is a common beginner mistake.

### How do I mock an async method with Moq?

Use `ReturnsAsync(value)` for methods returning `Task<T>` so Moq returns a completed task wrapping the value, and `ThrowsAsync(exception)` to return a faulted task. This is cleaner than `Returns(Task.FromResult(value))` and keeps async tests readable. For `Task`-returning (non-generic) methods, `Returns(Task.CompletedTask)` works.

### What does It.IsAny do in Moq?

`It.IsAny<T>()` is an argument matcher that makes a setup or verification match any value of type `T`. Use it when the specific argument does not matter, for example `Setup(r => r.FindById(It.IsAny<long>()))`. For conditional matching, use `It.Is<T>(predicate)`; for sets and ranges, use `It.IsIn(...)` and `It.IsInRange(...)`.

### Can Moq mock static or non-virtual methods?

No. Moq works by generating a runtime subclass and overriding members, so it can only mock interfaces, abstract classes, and virtual or abstract members. Non-virtual methods, static methods, and sealed classes cannot be mocked. The standard solution is to depend on an interface or wrap the static call behind an injectable abstraction.

### What is the difference between loose and strict mocks in Moq?

A loose mock (the default) returns type defaults for any member you did not configure, so unexpected calls pass silently. A strict mock (`MockBehavior.Strict`) throws a `MockException` on any call you did not set up. Loose is more forgiving and common; strict catches unanticipated interactions but makes tests brittle to incidental calls.
