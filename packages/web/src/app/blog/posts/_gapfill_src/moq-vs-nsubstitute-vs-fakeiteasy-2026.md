TITLE: Moq vs NSubstitute vs FakeItEasy (.NET, 2026)
DESCRIPTION: Moq vs NSubstitute vs FakeItEasy compared for .NET in 2026: syntax, readability, async support, verification, and which C# mocking library to choose.
DATE: 2026-06-15
CATEGORY: Comparison
---
# Moq vs NSubstitute vs FakeItEasy

All three are mature, capable .NET mocking libraries, and any of them will serve a project well — the choice is mostly about syntax preference and one trust consideration. **Moq** is the most popular with the largest community and a powerful lambda-based API (`Setup`/`Returns`/`Verify`), but its 4.20 release shipped a controversial telemetry component (SponsorLink) that prompted some teams to migrate away. **NSubstitute** has the cleanest, most natural syntax (`sub.Method().Returns(value)`) with no `Setup` ceremony, making it many developers' favorite for readability. **FakeItEasy** offers a single consistent `A.CallTo(...)` API with strong discoverability. For a new project in 2026, NSubstitute or FakeItEasy are excellent low-friction choices; Moq remains a solid, well-documented default if you are comfortable with its history.

This guide compares the three on syntax, features, async support, and verification, then recommends when to pick each. For installable, agent-ready .NET testing skills, see the [QASkills directory](/skills).

## Quick comparison table

| Aspect | Moq | NSubstitute | FakeItEasy |
|---|---|---|---|
| Syntax style | `Setup(x => x.M()).Returns(v)` | `sub.M().Returns(v)` | `A.CallTo(() => fake.M()).Returns(v)` |
| Create a double | `new Mock<IFoo>()` (`.Object`) | `Substitute.For<IFoo>()` | `A.Fake<IFoo>()` |
| Ceremony | Higher (Setup + .Object) | Lowest (direct calls) | Low (single A.CallTo entry) |
| Argument matchers | `It.IsAny<T>()` | `Arg.Any<T>()` | `A<T>.Ignored` / `A<T>._` |
| Verification | `Verify(..., Times.Once)` | `Received(1).M()` | `A.CallTo(...).MustHaveHappenedOnceExactly()` |
| Async helpers | `ReturnsAsync` / `ThrowsAsync` | `Returns` (task-aware) | `Returns` (task-aware) |
| Community size (2026) | Largest | Large | Moderate |
| Telemetry concern | SponsorLink in 4.20 (mitigated since) | None | None |
| Recommended for new code | Yes (with caveat) | Yes | Yes |

## What they all can (and cannot) do

All three generate runtime proxies for **interfaces and virtual/abstract members** and share the same fundamental constraint: they cannot mock non-virtual methods, static methods, or sealed classes. So capability is rarely the deciding factor — they cover stubbing return values, throwing exceptions, matching arguments, mocking async methods, and verifying interactions. The real differences are ergonomics: how much ceremony each requires and how the assertions read.

## Moq

Moq uses lambda expressions to identify the member being configured and a fluent `Setup → Returns/Throws` chain, with `Verify` for interactions. You always pass `.Object` into the system under test.

```csharp
var repo = new Mock<IUserRepository>();
repo.Setup(r => r.FindById(It.IsAny<long>()))
    .Returns(new User(1, "Ada"));

var service = new UserService(repo.Object);
service.Greet(1);

repo.Verify(r => r.FindById(1), Times.Once);
```

Strengths: the biggest community and documentation base, async helpers (`ReturnsAsync`/`ThrowsAsync`), `Callback` for argument capture, and strict/loose behavior modes. The friction points are the `Setup` ceremony and remembering `.Object`. The notable non-technical issue: Moq 4.20.0 (2023) bundled SponsorLink, which extracted a hashed email at build time and caused an industry backlash. Later 4.20.x releases removed the problematic dependency, but the episode pushed many teams to NSubstitute or FakeItEasy. If you adopt Moq today, pin a current version and be aware of the history.

## NSubstitute

NSubstitute's design goal is to read like natural language with the least possible ceremony. There is no `Setup` and no `.Object` — you call methods directly on the substitute.

```csharp
var repo = Substitute.For<IUserRepository>();
repo.FindById(Arg.Any<long>()).Returns(new User(1, "Ada"));

var service = new UserService(repo);   // pass the substitute directly
service.Greet(1);

repo.Received(1).FindById(1);          // verification reads like a sentence
```

Strengths: the cleanest syntax of the three, no wrapper object to unwrap, and verification with `Received()` / `DidNotReceive()` that reads naturally. Async "just works" because `Returns` is task-aware. Argument matchers use `Arg.Any<T>()` and `Arg.Is<T>(predicate)`. The main thing to internalize is that configuration and verification happen by calling the member (NSubstitute distinguishes setup calls from real calls via its proxy), which is elegant but occasionally surprises newcomers when a stray call accidentally configures behavior. No telemetry concerns. For teams that value readable tests above all, NSubstitute is frequently the favorite.

## FakeItEasy

FakeItEasy funnels everything through one entry point, `A.CallTo(...)`, which gives a single consistent mental model for configuration and verification.

```csharp
var repo = A.Fake<IUserRepository>();
A.CallTo(() => repo.FindById(A<long>.Ignored))
 .Returns(new User(1, "Ada"));

var service = new UserService(repo);
service.Greet(1);

A.CallTo(() => repo.FindById(1)).MustHaveHappenedOnceExactly();
```

Strengths: one consistent API (`A.Fake`, `A.CallTo`, `A<T>.Ignored`/`A<T>._`), excellent IDE discoverability because everything hangs off `A.`, and very readable verification (`MustHaveHappened`, `MustNotHaveHappened`, `MustHaveHappenedOnceExactly`). Async is task-aware. It is slightly less ubiquitous than Moq and NSubstitute, so there are fewer Stack Overflow answers, but it is well documented and actively maintained with no telemetry concerns. Teams that like a single uniform syntax for both setup and assertions often gravitate to FakeItEasy.

## Side-by-side: the same test three ways

The clearest way to feel the difference is one scenario in all three. Stub a call, then verify it.

```csharp
// Moq
var m = new Mock<IClock>();
m.Setup(c => c.UtcNow).Returns(new DateTime(2026, 1, 1));
m.Verify(c => c.UtcNow, Times.Once);

// NSubstitute
var n = Substitute.For<IClock>();
n.UtcNow.Returns(new DateTime(2026, 1, 1));
_ = n.UtcNow;
n.Received(1).UtcNow.GetType(); // typically: n.Received().UtcNow;

// FakeItEasy
var f = A.Fake<IClock>();
A.CallTo(() => f.UtcNow).Returns(new DateTime(2026, 1, 1));
A.CallTo(() => f.UtcNow).MustHaveHappened();
```

Moq separates "which call" (lambda) from "how often" (`Times`). NSubstitute reads as plain method calls. FakeItEasy keeps one `A.CallTo` shape for both setup and verification. None is objectively best — pick the one your team finds most readable and stay consistent.

## Capturing arguments and callbacks

A common need is to inspect the actual object your code passed to a dependency — say, the `Order` built inside a service before it was saved. Each library has its own idiom.

```csharp
// Moq — Callback stashes the argument
Order? saved = null;
orders.Setup(o => o.Save(It.IsAny<Order>()))
      .Callback<Order>(o => saved = o);

// NSubstitute — Arg.Do captures, or use Received + argument matcher
Order? saved = null;
orders.Save(Arg.Do<Order>(o => saved = o));
// ...act...
orders.Received().Save(Arg.Is<Order>(o => o.Status == OrderStatus.Paid));

// FakeItEasy — capture via Invokes, or assert with a matcher
Order? saved = null;
A.CallTo(() => orders.Save(A<Order>._)).Invokes((Order o) => saved = o);
```

Moq uses `Callback`, NSubstitute uses `Arg.Do` (and can assert directly with `Arg.Is` inside `Received`), and FakeItEasy uses `Invokes`. All three can also assert on the argument inline with a predicate matcher, which is usually cleaner than capturing when you only need a single check. The capture approach shines when you must assert on several fields of the captured object.

## Conditional returns and sequences

Returning different values on successive calls — for testing retries or pagination — is supported by all three, with characteristically different syntax.

```csharp
// Moq — SetupSequence
api.SetupSequence(a => a.Poll())
   .Returns("pending")
   .Returns("done");

// NSubstitute — multiple Returns args
api.Poll().Returns("pending", "done");

// FakeItEasy — ReturnsNextFromSequence
A.CallTo(() => api.Poll()).ReturnsNextFromSequence("pending", "done");
```

Computing a return from the call's arguments is likewise uniform in capability: Moq's `Returns((string id) => ...)`, NSubstitute's `Returns(ci => ...)`, and FakeItEasy's `ReturnsLazily(ci => ...)` all give you the invocation so you can derive the result. Again, the lesson is that feature parity is high; pick on syntax.

## Test setup and DI ergonomics

In practice you create doubles in a test's arrange phase and feed them to the system under test, often via constructor injection. The ceremony differs: NSubstitute and FakeItEasy hand you the proxy directly (`Substitute.For<IFoo>()` / `A.Fake<IFoo>()`), so you pass it straight in. Moq hands you a wrapper and you must remember `.Object`. Over hundreds of tests that `.Object` is minor but real friction, and forgetting it is the single most common Moq beginner error. If your project uses a DI container or `IServiceCollection` in integration tests, all three plug in identically — you register the fake instance against the interface — so the difference is confined to unit-test arrange code. None of this changes which library is "correct"; it just reinforces that NSubstitute and FakeItEasy optimize for less ceremony while Moq trades a little ceremony for the deepest documentation and community.

## When to pick each

**Pick NSubstitute when:** readability and minimal ceremony matter most. The no-`Setup`, no-`.Object` syntax is the cleanest, async just works, and there are no telemetry concerns. It is an excellent default for new projects.

**Pick FakeItEasy when:** you want one consistent API for both stubbing and verification and value the discoverability of everything hanging off `A.`. Great for teams that dislike having two different shapes for setup vs assertions.

**Pick Moq when:** you want the largest community and the most documentation, or you are maintaining an existing Moq codebase. Its lambda API is powerful and battle-tested. Just pin a current version given the SponsorLink history and decide if that history matters to you.

## Verdict

In 2026 all three are production-grade and the decision is largely stylistic. NSubstitute wins on syntactic cleanliness and is the easiest to read; FakeItEasy wins on API consistency and discoverability; Moq wins on community size and documentation depth but carries the SponsorLink baggage that drove some teams elsewhere. For a brand-new project with no existing investment, NSubstitute or FakeItEasy are the lowest-friction picks; for an existing Moq codebase, there is no urgent reason to migrate. Standardize on one across the team for consistency. Compare more .NET tooling on our [comparison hub](/compare), and browse installable testing skills in the [skills directory](/skills).

## Frequently Asked Questions

### Is Moq or NSubstitute better in 2026?

Both are excellent; the difference is mostly syntax. NSubstitute has cleaner, lower-ceremony syntax (no `Setup`, no `.Object`) and no telemetry concerns, making it many developers' preferred choice for new projects. Moq has the largest community and documentation but carries the SponsorLink history from its 4.20 release, so weigh readability preference and that history when choosing.

### Why did some teams move away from Moq?

Moq 4.20.0 (2023) bundled SponsorLink, a component that extracted a hashed email address at build time, which caused a significant backlash over privacy and supply-chain trust. Later 4.20.x versions removed the problematic dependency, but the incident prompted many teams to migrate to NSubstitute or FakeItEasy, which have no such telemetry.

### Which .NET mocking library has the simplest syntax?

NSubstitute generally has the simplest syntax. You configure behavior by calling the member directly (`sub.Method().Returns(value)`) with no `Setup` wrapper, pass the substitute itself into the system under test, and verify with readable calls like `Received(1)`. FakeItEasy is also clean with its single `A.CallTo(...)` entry point.

### Can NSubstitute and FakeItEasy mock static methods?

No. Like Moq, both NSubstitute and FakeItEasy create runtime proxies and can only fake interfaces, abstract classes, and virtual or abstract members. None of the three can mock static methods, non-virtual methods, or sealed classes. The standard approach is to depend on an interface or wrap the static dependency behind an injectable abstraction.

### How do I verify a call with each library?

In Moq you call `mock.Verify(x => x.Method(), Times.Once)`. In NSubstitute you call `sub.Received(1).Method()` (or `DidNotReceive()`). In FakeItEasy you write `A.CallTo(() => fake.Method()).MustHaveHappenedOnceExactly()`. All three support cardinalities like exactly-once, never, and ranges, just with different phrasing.

### Do all three support async methods?

Yes. NSubstitute and FakeItEasy are task-aware, so `Returns(value)` on a `Task<T>`-returning member works directly. Moq provides dedicated `ReturnsAsync(value)` and `ThrowsAsync(exception)` helpers for async methods, which is cleaner than wrapping values in `Task.FromResult`. All three handle asynchronous code without extra packages.
