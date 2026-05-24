import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SpecFlow .NET BDD: Complete Guide 2026',
  description:
    'Complete SpecFlow guide for .NET teams in 2026. Status, migration paths to Reqnroll, project setup, feature files, step definitions, hooks, dependency injection, parallel execution, and reporting.',
  date: '2026-05-14',
  category: 'BDD',
  content: `
# SpecFlow .NET BDD: Complete Guide 2026

SpecFlow has been the dominant BDD framework in the .NET ecosystem since 2009. For over a decade it provided the cleanest path for .NET teams to adopt Cucumber-style executable specifications, with first-class Visual Studio integration, support for xUnit/NUnit/MSTest, and a rich plugin ecosystem. In 2022 the open-source community forked SpecFlow to create Reqnroll after the original project entered commercial maintenance mode under Tricentis. In 2026 Reqnroll is the de facto successor for new projects, but a large body of SpecFlow code remains in production at enterprises, and the migration story is well-documented.

This guide is the complete 2026 reference for both SpecFlow and Reqnroll on .NET. We cover project setup, feature files, step definitions, hooks, dependency injection via Microsoft.Extensions.DependencyInjection or BoDi, parallel execution via xUnit/NUnit/MSTest, LivingDoc generator, reporting, and the migration path from SpecFlow to Reqnroll. Every example is current with Reqnroll 2.0 and .NET 8/9.

By the end you will have a production-ready BDD setup for any modern .NET project, plus a clear understanding of when to stay on SpecFlow versus when to migrate.

## Key Takeaways

- **SpecFlow is in commercial maintenance**; Reqnroll is the active community fork.
- **For new projects: use Reqnroll**.
- **For existing SpecFlow: migration takes 1-3 days for medium projects**.
- **xUnit + Reqnroll** is the canonical 2026 .NET BDD stack.
- **LivingDoc generates stakeholder-friendly HTML reports**.

---

## 1. SpecFlow vs Reqnroll Status

SpecFlow 3.9.x is the last fully open-source version. The 4.x line shifted to a commercial dual-license under Tricentis. Reqnroll forked from SpecFlow 3.9.x in 2023 and has been actively maintained since, with full backwards compatibility for feature files and most step definitions. New .NET projects in 2026 should adopt Reqnroll. Existing SpecFlow 3.x projects can either stay on 3.9.x (no new features) or migrate to Reqnroll (recommended).

## 2. Project Setup with Reqnroll

\`\`\`bash
dotnet new xunit -n MyApp.AcceptanceTests
cd MyApp.AcceptanceTests
dotnet add package Reqnroll
dotnet add package Reqnroll.xUnit
dotnet add package FluentAssertions
dotnet add package Microsoft.Extensions.DependencyInjection
\`\`\`

reqnroll.json at project root:

\`\`\`json
{
  "$schema": "https://schemas.reqnroll.net/reqnroll-config-latest.json",
  "language": { "feature": "en" },
  "bindingCulture": { "name": "en-US" },
  "generator": { "addNonParallelizableMarkerForTags": ["@nonparallel"] }
}
\`\`\`

## 3. Your First Feature File

\`\`\`gherkin
# Features/Checkout.feature
Feature: Customer checkout

  Background:
    Given a customer "Alice" with a valid card

  @smoke @checkout
  Scenario: Successful checkout
    Given the cart contains:
      | Item    | Quantity | Unit Price |
      | Widget  | 2        | 19.99      |
      | Gadget  | 1        | 49.99      |
    When Alice completes checkout
    Then the order total should be 89.97
    And the order status should be "Confirmed"

  Scenario Outline: Card errors
    When Alice pays with card "<card>"
    Then the error message should be "<error>"

    Examples:
      | card                | error              |
      | 4000-0000-0000-0002 | Card declined      |
      | 4000-0000-0000-9995 | Insufficient funds |
\`\`\`

## 4. Step Definitions

\`\`\`csharp
// Steps/CheckoutSteps.cs
using Reqnroll;
using FluentAssertions;

namespace MyApp.AcceptanceTests.Steps;

[Binding]
public class CheckoutSteps
{
    private readonly CartContext _cart;
    private readonly CheckoutService _checkout;
    private readonly ScenarioContext _ctx;

    public CheckoutSteps(CartContext cart, CheckoutService checkout, ScenarioContext ctx)
    {
        _cart = cart;
        _checkout = checkout;
        _ctx = ctx;
    }

    [Given("a customer {string} with a valid card")]
    public void GivenACustomerWithValidCard(string name)
    {
        _cart.Customer = _checkout.CreateCustomer(name, "tok_visa_valid");
    }

    [Given("the cart contains:")]
    public void GivenTheCartContains(DataTable table)
    {
        foreach (var row in table.Rows)
        {
            _cart.AddItem(
                row["Item"],
                int.Parse(row["Quantity"]),
                decimal.Parse(row["Unit Price"])
            );
        }
    }

    [When("{string} completes checkout")]
    public void WhenCompletesCheckout(string name)
    {
        _cart.LastResult = _checkout.Complete(_cart.Customer, _cart.Items);
    }

    [When("{string} pays with card {string}")]
    public void WhenPaysWithCard(string name, string card)
    {
        _cart.LastResult = _checkout.Pay(_cart.Customer, card);
    }

    [Then("the order total should be {double}")]
    public void ThenTheOrderTotalShouldBe(double expected)
    {
        ((double)_cart.LastResult.Total).Should().Be(expected);
    }

    [Then("the order status should be {string}")]
    public void ThenTheOrderStatusShouldBe(string status)
    {
        _cart.LastResult.Status.Should().Be(status);
    }

    [Then("the error message should be {string}")]
    public void ThenTheErrorMessageShouldBe(string error)
    {
        _cart.LastResult.ErrorMessage.Should().Be(error);
    }
}
\`\`\`

## 5. Dependency Injection

Reqnroll supports Microsoft.Extensions.DependencyInjection out of the box:

\`\`\`csharp
[Binding]
public static class TestStartup
{
    [ScenarioDependencies]
    public static IServiceCollection CreateServices()
    {
        var services = new ServiceCollection();
        services.AddSingleton<ApiClient>();
        services.AddScoped<CartContext>();
        services.AddScoped<CheckoutService>();
        return services;
    }
}
\`\`\`

## 6. Hooks

\`\`\`csharp
[Binding]
public class Hooks
{
    private readonly Database _db;

    public Hooks(Database db) { _db = db; }

    [BeforeTestRun]
    public static async Task BeforeTestRunAsync(ITestRunnerManager runnerManager)
    {
        await DatabaseFixture.StartContainerAsync();
    }

    [AfterTestRun]
    public static async Task AfterTestRunAsync()
    {
        await DatabaseFixture.StopContainerAsync();
    }

    [BeforeScenario("@smoke")]
    public void BeforeSmoke() => Console.WriteLine("Running smoke scenario");

    [BeforeScenario]
    public async Task BeforeScenarioAsync() => await _db.TruncateAllAsync();

    [AfterScenario]
    public async Task AfterScenarioAsync(ScenarioContext ctx)
    {
        if (ctx.TestError != null)
        {
            var screenshot = await Screenshots.CaptureAsync();
            ctx.ScenarioInfo.Title.Should().NotBeNullOrEmpty();
        }
    }
}
\`\`\`

## 7. Parallel Execution with xUnit

In AssemblyInfo.cs or any .cs file at the assembly level:

\`\`\`csharp
[assembly: Xunit.CollectionBehavior(DisableTestParallelization = false, MaxParallelThreads = 4)]
\`\`\`

Reqnroll respects xUnit's parallelism settings. For per-scenario isolation, each scenario runs in its own DI scope.

## 8. LivingDoc Reports

Install:

\`\`\`bash
dotnet tool install --global Reqnroll.LivingDoc.CLI
\`\`\`

Generate after a test run:

\`\`\`bash
reqnroll-livingdoc test-assembly ./bin/Debug/net9.0/MyApp.AcceptanceTests.dll --test-execution-json TestExecution.json --output ./LivingDoc.html
\`\`\`

The generated HTML shows features, scenarios, execution history, and step-by-step status -- great for stakeholders.

## 9. Migration from SpecFlow

In project file, swap packages:

\`\`\`xml
<!-- Remove -->
<PackageReference Include="SpecFlow" Version="3.9.74" />
<PackageReference Include="SpecFlow.xUnit" Version="3.9.74" />

<!-- Add -->
<PackageReference Include="Reqnroll" Version="2.0.0" />
<PackageReference Include="Reqnroll.xUnit" Version="2.0.0" />
\`\`\`

Update namespaces with a find-and-replace:

| SpecFlow | Reqnroll |
|---|---|
| TechTalk.SpecFlow | Reqnroll |
| SpecFlow.Tools.MsBuild.Generation | Reqnroll.Tools.MsBuild.Generation |

Rename specflow.json to reqnroll.json. Most projects compile after these changes. The remaining work is removing references to deprecated SpecFlow plugins.

## 10. CI Integration

GitHub Actions:

\`\`\`yaml
name: BDD Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '9.0.x' }
      - run: dotnet restore
      - run: dotnet test --filter "Category=smoke" --logger "trx;LogFileName=test.trx"
      - run: reqnroll-livingdoc test-assembly ./bin/Debug/net9.0/MyApp.AcceptanceTests.dll --test-execution-json TestExecution.json --output ./LivingDoc.html
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: livingdoc, path: LivingDoc.html }
\`\`\`

## 11. Common Gotchas

| Gotcha | Solution |
|---|---|
| Tests not discovered | Ensure Reqnroll.xUnit (or NUnit/MSTest) is installed and feature files are EmbeddedResource |
| Parallel scenarios fail | Move state to DI-scoped services, not statics |
| LivingDoc missing scenarios | Use --test-execution-json from the .trx output |
| Step ambiguity errors | Use [Scope] attribute to bind steps to specific features |

## 12. AI-Assisted Authoring

The [reqnroll](/skills) SKILL.md pack on QASkills teaches Claude or Cursor to generate Reqnroll step definitions matching your house style. See [cursor-skills-md-best-practices](/blog).

## Conclusion

Reqnroll is the future of .NET BDD. The migration from SpecFlow is straightforward, and the resulting suite is faster, better-supported, and ready for modern .NET. See [specflow-vs-cucumber-detailed-comparison](/blog) for cross-language BDD strategy.
`,
};
