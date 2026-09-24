import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'TUnit dotnet Guide: The Modern .NET Testing Framework for QA Teams',
  description: 'TUnit dotnet guide for QA teams: install TUnit, write async tests, use data sources, control parallelism, and run reliable CI suites with confidence.',
  date: '2026-09-24',
  category: 'Tutorial',
  content: `
# TUnit dotnet Guide: The Modern .NET Testing Framework for QA Teams

TUnit dotnet is a modern C# testing framework built on Microsoft.Testing.Platform with source-generated test discovery, async-first assertions, parallel execution by default, and Native AOT support. If you are starting a new .NET test project in 2026, TUnit is worth evaluating when speed, compile-time feedback, and agent-friendly test structure matter more than maximum ecosystem familiarity.

The current NuGet package list shows TUnit 1.69.0 as the latest package version at the time this article was written. The official TUnit site documents template-based setup with \`dotnet new install TUnit.Templates\`, manual setup with \`dotnet add package TUnit\`, execution through \`dotnet run\` and \`dotnet test\`, and a runner model based on Microsoft.Testing.Platform rather than VSTest.

This guide is written for QA engineers and test-automation leads who know xUnit, NUnit, or MSTest and want a practical read on whether TUnit belongs in their stack. For a side-by-side migration view, keep the [xUnit and NUnit .NET testing guide](/blog/dotnet-testing-xunit-nunit-guide) nearby. For integration tests that need disposable databases and realistic infrastructure, pair TUnit with patterns from the [Testcontainers .NET database testing guide](/blog/testcontainers-dotnet-database-testing-guide).

## Install TUnit Without Bringing VSTest Baggage

The quickest path is the official template. It creates an executable-style test project with TUnit wiring already in place.

\`\`\`bash
dotnet new install TUnit.Templates
dotnet new TUnit -n Billing.Tests
dotnet run --project Billing.Tests
\`\`\`

For an existing repo, create a console project, add the \`TUnit\` package, and remove the generated \`Program.cs\` or any manual \`Main\` method. The TUnit package handles the test runner entry point. The docs also warn not to install \`Microsoft.NET.Test.Sdk\` in a TUnit project because it conflicts with the Microsoft.Testing.Platform-based setup.

\`\`\`xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="TUnit" Version="1.69.0" />
  </ItemGroup>
</Project>
\`\`\`

The \`TUnit\` meta package configures global usings for common namespaces such as \`TUnit.Core\`, \`TUnit.Assertions\`, and assertion extensions. That keeps test files lean, although many teams still prefer explicit usings in samples and documentation to make snippets portable.

| Setup choice | Command or package | Use it when | Avoid |
|---|---|---|---|
| Template | \`dotnet new TUnit -n MyTests\` | New test project | When you need a custom project skeleton |
| Manual package | \`dotnet add package TUnit\` | Existing solution or migration | Leaving generated \`Program.cs\` in place |
| TUnit meta package | \`PackageReference Include="TUnit"\` | Most test projects | Adding \`Microsoft.NET.Test.Sdk\` |
| Coverage support | Built into TUnit meta package via Microsoft testing extensions | You need \`--coverage\` | \`coverlet.collector\` and \`coverlet.msbuild\` |

What people get wrong: they treat TUnit as another VSTest adapter. It is not. Many familiar commands still work, but the underlying runner is Microsoft.Testing.Platform. That affects filters, coverage packages, report flags, IDE settings, and the shape of CI troubleshooting.

## Write the First Test With Awaited Assertions

TUnit tests use \`[Test]\`. Assertions are awaited with \`await Assert.That(...)\`. This is not decorative. The official troubleshooting docs are blunt: forgetting to await assertions means they do not execute, which can make a bad test pass silently. Treat missing assertion awaits as a correctness bug, not a style issue.

\`\`\`csharp
namespace Billing.Tests;

public sealed class InvoiceTotalTests
{
    [Test]
    public async Task Calculates_Total_With_Tax()
    {
        var invoice = new Invoice(Subtotal: 100m, TaxRate: 0.08m);

        var total = invoice.Total();

        await Assert.That(total).IsEqualTo(108m);
    }
}

public sealed record Invoice(decimal Subtotal, decimal TaxRate)
{
    public decimal Total() => decimal.Round(Subtotal * (1 + TaxRate), 2);
}
\`\`\`

That example is deliberately small, but it shows three TUnit defaults that matter in larger suites. There is no \`[TestClass]\`. The test can be async. The assertion expression reads like a runtime check while still participating in TUnit's analyzer and source-generation model.

For QA teams using AI coding agents, this pattern is also easier to repair. A model can identify setup, act, and assert without decoding a custom assertion helper. The failure output can point back to the expression under test, which gives both humans and agents a cleaner starting point.

## Use Arguments for Constant Data, MethodDataSource for Real Objects

TUnit's \`[Arguments]\` attribute is for compile-time known values. Use it for strings, numbers, enums, booleans, and small combinations where the data belongs beside the test. Multiple \`[Arguments]\` attributes create multiple invocations.

\`\`\`csharp
namespace Billing.Tests;

public sealed class DiscountTests
{
    [Test]
    [Arguments("GOLD", 100.00, 80.00)]
    [Arguments("SILVER", 100.00, 90.00)]
    [Arguments("NONE", 100.00, 100.00)]
    public async Task Applies_Discount_For_Tier(string tier, double subtotal, double expected)
    {
        var total = DiscountCalculator.Apply(tier, subtotal);

        await Assert.That(total).IsEqualTo(expected);
    }
}

public static class DiscountCalculator
{
    public static double Apply(string tier, double subtotal) => tier switch
    {
        "GOLD" => subtotal * 0.80,
        "SILVER" => subtotal * 0.90,
        "NONE" => subtotal,
        _ => throw new ArgumentOutOfRangeException(nameof(tier), tier, "Unknown tier.")
    };
}
\`\`\`

When data needs real objects, generated records, files, or async setup, use data sources. The official method data source docs recommend static sources for AOT-compatible patterns. For reference types, returning \`Func<T>\` helps each test get a fresh instance rather than sharing mutable data across parallel invocations.

\`\`\`csharp
namespace Billing.Tests;

public sealed record PriceCase(string Sku, decimal UnitPrice, int Quantity, decimal Expected);

public static class PriceCases
{
    public static IEnumerable<Func<PriceCase>> Cases()
    {
        yield return () => new PriceCase("starter", 19m, 1, 19m);
        yield return () => new PriceCase("team", 49m, 3, 147m);
        yield return () => new PriceCase("enterprise", 199m, 2, 398m);
    }
}

public sealed class PriceCalculatorTests
{
    [Test]
    [MethodDataSource(typeof(PriceCases), nameof(PriceCases.Cases))]
    public async Task Calculates_Extended_Price(PriceCase priceCase)
    {
        var total = priceCase.UnitPrice * priceCase.Quantity;

        await Assert.That(total).IsEqualTo(priceCase.Expected);
    }
}
\`\`\`

| Data mechanism | Best for | AOT-friendly guidance | Flake risk |
|---|---|---|---|
| \`[Arguments]\` | Constant values | Values are embedded in attributes | Low, unless cases hide too much logic |
| \`[MethodDataSource]\` | Objects, tuples, generated rows | Prefer static sources and fresh \`Func<T>\` instances | Shared mutable objects |
| \`[ClassDataSource<T>]\` | Fixtures and infrastructure objects | Type needs a public parameterless constructor | Mutating shared fixture state |
| Async method source | Data loaded from external source | Use \`IAsyncEnumerable<T>\` with cancellation | Discovery and environment drift |

## Model Fixtures With ClassDataSource Instead of Hidden Globals

\`[ClassDataSource<T>]\` instantiates and injects classes into tests or test classes. It also has a \`Shared\` option that controls lifecycle. The official docs list \`SharedType.None\`, \`PerClass\`, \`PerAssembly\`, \`PerTestSession\`, and \`Keyed\`. This is where TUnit starts to feel different from older frameworks: shared infrastructure becomes explicit in attributes rather than buried in static helpers.

Here is a practical API fixture shape. It avoids a real network port so the sample runs as ordinary C#, but the lifecycle mirrors what you would do with a web app factory, container, or seeded database.

\`\`\`csharp
namespace Billing.Tests;

[ClassDataSource<BillingApiFixture>(Shared = SharedType.PerTestSession)]
public sealed class BillingApiTests(BillingApiFixture fixture)
{
    [Test]
    public async Task Health_Endpoint_Is_Available()
    {
        var response = await fixture.Client.GetHealthAsync();

        await Assert.That(response).IsEqualTo("ok");
    }
}

public sealed class BillingApiFixture : IAsyncInitializer, IAsyncDisposable
{
    public FakeBillingClient Client { get; private set; } = new("starting");

    public Task InitializeAsync()
    {
        Client = new FakeBillingClient("ok");
        return Task.CompletedTask;
    }

    public ValueTask DisposeAsync()
    {
        Client.Dispose();
        return ValueTask.CompletedTask;
    }
}

public sealed class FakeBillingClient(string health) : IDisposable
{
    public Task<string> GetHealthAsync() => Task.FromResult(health);
    public void Dispose() { }
}
\`\`\`

The key is to keep shared fixtures immutable from the perspective of tests. If a test modifies a shared object and another test reads it concurrently, you have manufactured a flaky suite. For databases, prefer per-test transactions or isolated schemas. For browsers, prefer a fresh context per test. For external APIs, prefer a limiter over global serial execution when only the downstream dependency is constrained.

## Control Parallelism Only Where the System Demands It

TUnit runs tests in parallel by default. That is a feature, not a trap, but it forces you to make state explicit. The official docs provide three main controls: \`[NotInParallel]\`, \`[ParallelGroup]\`, and \`[ParallelLimiter<T>]\`. There is also a global cap via \`--maximum-parallel-tests\` or \`TUNIT_MAX_PARALLEL_TESTS\`.

| Parallelism control | What it does | Use when | Cost |
|---|---|---|---|
| \`[NotInParallel]\` | Prevents overlap with constrained tests | Shared state cannot be isolated | Can serialize too much |
| \`[NotInParallel("key")]\` | Prevents overlap only for matching keys | One database, mailbox, or account is shared | Requires consistent keys |
| \`[ParallelGroup("key")]\` | Runs groups in separate phases | Classes can overlap internally but not with other groups | Phase boundaries can slow suites |
| \`[ParallelLimiter<T>]\` | Caps concurrency for matching limiter type | External service has rate or connection limits | Mis-sized limits hide capacity problems |

Use constraint keys before global serialization. A small number of keyed constraints lets unrelated tests keep running while protecting the resource that actually needs protection.

\`\`\`csharp
namespace Billing.Tests;

public sealed class PaymentGatewayTests
{
    private const string GatewayAccount = "stripe-sandbox-account";

    [Test]
    [NotInParallel(GatewayAccount)]
    public async Task Captures_Authorized_Payment()
    {
        var result = await PaymentGateway.CaptureAsync("auth-123");

        await Assert.That(result.Status).IsEqualTo("captured");
    }

    [Test]
    [NotInParallel(GatewayAccount)]
    public async Task Voids_Authorized_Payment()
    {
        var result = await PaymentGateway.VoidAsync("auth-456");

        await Assert.That(result.Status).IsEqualTo("voided");
    }
}
\`\`\`

For bulk throttling, \`[ParallelLimiter<T>]\` is cleaner than scattering sleeps through tests.

\`\`\`csharp
namespace Billing.Tests;

[ParallelLimiter<ExternalApiLimit>]
public sealed class TaxApiTests
{
    [Test]
    [Repeat(10)]
    public async Task Tax_Service_Returns_A_Rate()
    {
        var rate = await TaxApi.GetRateAsync("CA");

        await Assert.That(rate).IsGreaterThanOrEqualTo(0m);
    }
}

public sealed record ExternalApiLimit : IParallelLimit
{
    public int Limit => 2;
}
\`\`\`

The failure mode to watch is thread pool starvation. The parallelism docs call out blocking calls such as \`.Wait()\`, \`.Result\`, and \`.GetAwaiter().GetResult()\`. In a parallel async suite, one blocking helper can delay continuations in unrelated tests and make legitimate waits time out.

## Use DependsOn for Workflows, Not Ordinary Unit Tests

\`[DependsOn]\` prevents a test from starting until another test has completed. The official guidance recommends isolated, side-effect-free tests first, and \`[DependsOn]\` only when stateless tests are impossible, too difficult, or too slow. That is the right bar.

A reasonable QA use case is a deployment smoke workflow where each step depends on a previous system state and the cost of rebuilding that state for every assertion is too high. Even there, make the dependency visible and keep cleanup robust.

\`\`\`csharp
namespace Billing.Tests;

public sealed class SubscriptionWorkflowTests
{
    [Test]
    public async Task Step1_Create_Subscription()
    {
        var id = await SubscriptionApi.CreateAsync("customer-123");
        TestContext.Current!.StateBag.Items["subscriptionId"] = id;

        await Assert.That(id).IsNotEmpty();
    }

    [Test]
    [DependsOn(nameof(Step1_Create_Subscription))]
    public async Task Step2_Cancel_Subscription()
    {
        var createContext = TestContext.Current!.Dependencies
            .GetTests(nameof(Step1_Create_Subscription))
            .First();

        var id = createContext.StateBag.Items["subscriptionId"]
            ?? throw new InvalidOperationException("Missing subscription id.");

        var status = await SubscriptionApi.CancelAsync(id.ToString()!);

        await Assert.That(status).IsEqualTo("cancelled");
    }
}
\`\`\`

Do not use dependencies to paper over accidental ordering. If test B depends on state leaked by test A, the fix is isolation, not \`[DependsOn]\`. Dependencies are for meaningful workflows. Accidental order coupling is one of the fastest ways to turn a fast parallel framework into a slow flaky one.

## Run TUnit Locally and in CI

The official docs describe \`dotnet run\` as a preferred simple execution path because flags pass naturally to the TUnit runner. \`dotnet test\` also works, but extension flags such as \`--coverage\` and \`--report-trx\` may need to appear after \`--\` so they are treated as application arguments on older SDK paths. The troubleshooting page notes that on .NET 10+ SDKs, platform flags can be passed directly.

\`\`\`bash
dotnet run --project Billing.Tests -c Release
dotnet run --project Billing.Tests -c Release --report-trx --coverage
dotnet test Billing.Tests -c Release -- --report-trx --coverage
\`\`\`

For CI, use current GitHub Actions majors and publish test output from a results directory. This example keeps the test command explicit and avoids old action versions.

\`\`\`yaml
name: dotnet-tests

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  tunit:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Setup .NET
        uses: actions/setup-dotnet@v6
        with:
          dotnet-version: "10.0.x"

      - name: Restore
        run: dotnet restore

      - name: Run TUnit tests
        run: dotnet test Billing.Tests -c Release --results-directory ./TestResults -- --report-trx --coverage

      - name: Upload TRX reports
        if: \${{ always() }}
        uses: actions/upload-artifact@v7
        with:
          name: tunit-trx-results
          path: TestResults/**/*.trx
\`\`\`

Test filtering is different from xUnit and NUnit habits. TUnit runs on Microsoft.Testing.Platform, so the familiar VSTest \`--filter "Category=Integration"\` is not supported in the documented TUnit filter path. Use \`--treenode-filter\`.

\`\`\`bash
dotnet run --project Billing.Tests --treenode-filter "/*/*/PaymentGatewayTests/*"
dotnet run --project Billing.Tests --treenode-filter "/*/*/*/*[Category=Smoke]"
dotnet run --project Billing.Tests --treenode-filter "/**[(Category=Smoke)|(Priority=High)]"
\`\`\`

Runner flag accuracy matters in agent-assisted work. TUnit's documented path is \`--treenode-filter\`, and mixing conventions creates false "zero tests ran" failures.

For JavaScript runners, keep a small reference in your agent prompt or CI docs:

Playwright uses \`--grep\` or \`-g\` for title matching.
Vitest and Jest use title-pattern flags such as \`-t\` and Jest's \`--testNamePattern\`.
Mocha uses its own grep flag.

The exact flag is less important than making the agent prove it selected the runner-specific one.

## Native AOT and Source Generation

TUnit's default execution mode uses source generation for test discovery and execution. The engine modes docs describe a reflection mode with \`--reflection\`, but source generation is the default and the path that gives compile-time generation, better performance, and Native AOT compatibility.

Publishing with Native AOT is straightforward at the project level:

\`\`\`xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <PublishAot>true</PublishAot>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="TUnit" Version="1.69.0" />
  </ItemGroup>
</Project>
\`\`\`

\`\`\`bash
dotnet publish Billing.Tests -c Release -p:PublishAot=true --use-current-runtime
./Billing.Tests/bin/Release/net10.0/linux-x64/publish/Billing.Tests
\`\`\`

AOT rewards boring test infrastructure. Static method data sources, fresh object factories, explicit fixture lifecycles, and source-generated mocks fit the model. Reflection-heavy discovery tricks, dynamic proxy libraries, and mutable global registries fight it. If AOT publishing is part of your CI strategy, test your data sources early rather than after hundreds of tests have been ported.

## Migration Notes From xUnit and NUnit

TUnit is familiar enough to read quickly, but the semantics differ in ways that affect QA automation. The biggest shifts are async assertions, parallel by default, generated discovery, and Microsoft.Testing.Platform filters.

| Existing habit | TUnit equivalent | Migration warning |
|---|---|---|
| xUnit \`[Fact]\` | \`[Test]\` | Await every assertion |
| xUnit \`[Theory]\` with \`[InlineData]\` | \`[Test]\` with \`[Arguments]\` | Attribute values must be constants |
| NUnit \`[TestCase]\` | \`[Arguments]\` | Prefer clear display names for many cases |
| NUnit \`[OneTimeSetUp]\` | \`[Before(Class)]\` | Class-level hooks must be static |
| Collection-level serialization | \`[NotInParallel("key")]\` | Use keys to avoid over-serializing |
| VSTest category filter | \`--treenode-filter\` | \`--filter\` can lead to zero tests |

The most dangerous migration bug is a silent assertion that was not awaited. The second most dangerous is assuming instance fields persist across tests. TUnit creates new class instances for each test in a class, which encourages isolation. If you genuinely need shared state, make it explicit with fixtures, class data sources, or static state guarded by parallelism controls.

## A Realistic Failure Mode: The CI-Only Timeout

Imagine a suite that passes locally but times out in CI after moving to TUnit. The failure appears in random API tests. The first instinct is to add \`[NotInParallel]\` to the whole assembly. That may make the build green, but it destroys the speed benefit and hides the real issue.

Diagnosis usually looks like this:

1. Compare local and CI maximum parallelism.
2. Search for \`.Result\`, \`.Wait()\`, and blocking database calls in async tests.
3. Identify shared external resources: one sandbox account, one database schema, one message queue.
4. Add \`[ParallelLimiter<T>]\` or keyed \`[NotInParallel]\` only around tests that share the constrained resource.
5. Replace blocking calls with awaited async APIs.
6. Re-run with \`TUNIT_MAX_PARALLEL_TESTS=4\` to confirm the failure is resource pressure, not test logic.

\`\`\`bash
TUNIT_MAX_PARALLEL_TESTS=4 dotnet run --project Billing.Tests -c Release
dotnet run --project Billing.Tests -c Release --treenode-filter "/*/*/PaymentGatewayTests/*"
\`\`\`

This is where TUnit's defaults are useful as a forcing function. Parallel failures often reveal test design issues that older serialized suites allowed to linger. The right fix is narrower resource modeling, not a blanket return to sequential execution.

## Frequently Asked Questions

### Is TUnit stable enough for production QA suites?

TUnit is past 1.0 and the current NuGet feed shows 1.69.0, so it is no longer just an experimental alpha package. That said, adoption should still be deliberate. Start with a new service, a focused integration test project, or a migrated slice of your suite. Keep xUnit or NUnit where ecosystem adapters, organizational standards, or vendor tools are still decisive.

### Should I use dotnet run or dotnet test with TUnit?

Both work. The official docs present \`dotnet run\` as a simple path because runner flags pass directly, for example \`dotnet run -c Release --report-trx --coverage\`. \`dotnet test\` is useful for solution-level and multi-targeted runs. On older SDK paths, pass TUnit application flags after \`--\`, such as \`dotnet test -c Release -- --report-trx\`.

### How does TUnit handle parallel tests by default?

TUnit runs tests in parallel by default. Use no attributes when tests are isolated. Add \`[NotInParallel("key")]\` when tests share a constrained resource, \`[ParallelGroup("key")]\` when classes need phased execution, and \`[ParallelLimiter<T>]\` when a service supports only limited concurrency. Global sequential execution should be a last resort because it removes a major benefit of TUnit.

### What is the most common TUnit migration mistake?

The most common serious mistake is forgetting to await assertions. In TUnit, \`Assert.That(...)\` assertions are async and must be awaited. A missing \`await\` can let a test pass without checking the condition. The next common mistake is using VSTest-style \`--filter\` instead of TUnit's documented \`--treenode-filter\`, which can produce confusing zero-test runs.
`,
};
