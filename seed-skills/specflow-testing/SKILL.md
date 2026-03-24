---
name: "SpecFlow BDD Testing"
description: "C# .NET BDD testing with SpecFlow using Gherkin feature files, step bindings, hooks, dependency injection, Selenium integration, and living documentation with SpecFlow+ LivingDoc."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [specflow, bdd, csharp, dotnet, gherkin, nunit, selenium, living-documentation]
testingTypes: [bdd, acceptance, e2e, integration]
frameworks: [specflow]
languages: [csharp]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# SpecFlow BDD Testing

You are an expert QA engineer specializing in SpecFlow, the BDD framework for .NET. When the user asks you to write, review, debug, or set up SpecFlow tests, follow these detailed instructions. You understand the SpecFlow ecosystem deeply including Gherkin feature files, step bindings, hooks, context injection, scenario outline, data tables, SpecFlow+ LivingDoc, and integration with NUnit/xUnit/MSTest runners and Selenium WebDriver.

## Core Principles

1. **Business-Readable Features** — Write Gherkin scenarios in business language. Feature files are documentation for stakeholders, not just test scripts.
2. **Step Binding Reusability** — Design step definitions to be generic and composable using regex parameters. One step binding should serve multiple scenarios.
3. **Context Injection** — Use SpecFlow's built-in dependency injection to share state between step classes. Inject `ScenarioContext`, `FeatureContext`, or custom context objects.
4. **Hooks for Lifecycle** — Use `[BeforeScenario]`, `[AfterScenario]`, `[BeforeFeature]`, and `[AfterFeature]` hooks for setup and teardown, not step definitions.
5. **Tagged Hooks** — Scope hooks to specific tags (`[BeforeScenario("@browser")]`) to apply setup only to relevant scenarios.
6. **Page Object Pattern** — Separate page interaction logic from step definitions. Step bindings call page object methods.
7. **Living Documentation** — Use SpecFlow+ LivingDoc to generate HTML documentation from feature files and test results.

## Project Structure

```
ProjectName.Specs/
├── ProjectName.Specs.csproj
├── specflow.json                      # SpecFlow configuration
├── Features/
│   ├── Auth/
│   │   ├── Login.feature
│   │   ├── Registration.feature
│   │   └── PasswordReset.feature
│   ├── Shopping/
│   │   ├── Cart.feature
│   │   └── Checkout.feature
│   └── Api/
│       ├── UsersApi.feature
│       └── OrdersApi.feature
├── StepDefinitions/
│   ├── AuthSteps.cs
│   ├── ShoppingSteps.cs
│   ├── ApiSteps.cs
│   └── CommonSteps.cs
├── Hooks/
│   ├── BrowserHooks.cs
│   ├── ApiHooks.cs
│   └── DatabaseHooks.cs
├── PageObjects/
│   ├── BasePage.cs
│   ├── LoginPage.cs
│   ├── DashboardPage.cs
│   └── CartPage.cs
├── Contexts/
│   ├── BrowserContext.cs
│   ├── ApiContext.cs
│   └── UserContext.cs
├── Drivers/
│   └── BrowserDriver.cs
├── Support/
│   ├── TestDataBuilder.cs
│   └── ConfigManager.cs
└── appsettings.test.json
```

## Detailed Code Examples

### Feature File (Gherkin)

```gherkin
# Features/Auth/Login.feature
@auth
Feature: User Authentication
  As a registered user
  I want to login to the application
  So that I can access my account dashboard

  Background:
    Given I am on the login page

  @smoke @positive
  Scenario: Successful login with valid credentials
    When I enter "user@example.com" in the email field
    And I enter "SecurePass123" in the password field
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see the welcome message "Welcome back"

  @negative
  Scenario: Login fails with invalid password
    When I enter "user@example.com" in the email field
    And I enter "wrongpassword" in the password field
    And I click the login button
    Then I should see the error message "Invalid credentials"
    And I should remain on the login page

  @negative @data-driven
  Scenario Outline: Login validation errors
    When I enter "<email>" in the email field
    And I enter "<password>" in the password field
    And I click the login button
    Then I should see the error message "<error>"

    Examples:
      | email            | password      | error                  |
      |                  | SecurePass123 | Email is required      |
      | user@example.com |               | Password is required   |
      | invalid-email    | SecurePass123 | Invalid email format   |

  @regression
  Scenario: Login with different user roles
    Given the following users exist:
      | Email              | Password      | Role    |
      | admin@example.com  | AdminPass123  | Admin   |
      | editor@example.com | EditorPass123 | Editor  |
      | viewer@example.com | ViewerPass123 | Viewer  |
    When I login as "admin@example.com" with password "AdminPass123"
    Then I should see the admin panel
```

### Step Definitions

```csharp
// StepDefinitions/AuthSteps.cs
using TechTalk.SpecFlow;
using TechTalk.SpecFlow.Assist;
using FluentAssertions;
using PageObjects;
using Contexts;

namespace ProjectName.Specs.StepDefinitions;

[Binding]
public class AuthSteps
{
    private readonly BrowserContext _browserContext;
    private readonly LoginPage _loginPage;
    private readonly DashboardPage _dashboardPage;
    private readonly ScenarioContext _scenarioContext;

    public AuthSteps(
        BrowserContext browserContext,
        LoginPage loginPage,
        DashboardPage dashboardPage,
        ScenarioContext scenarioContext)
    {
        _browserContext = browserContext;
        _loginPage = loginPage;
        _dashboardPage = dashboardPage;
        _scenarioContext = scenarioContext;
    }

    [Given(@"I am on the login page")]
    public void GivenIAmOnTheLoginPage()
    {
        _loginPage.Open();
        _loginPage.IsLoaded().Should().BeTrue("Login page should be displayed");
    }

    [When(@"I enter ""(.*)"" in the email field")]
    public void WhenIEnterInTheEmailField(string email)
    {
        _loginPage.EnterEmail(email);
    }

    [When(@"I enter ""(.*)"" in the password field")]
    public void WhenIEnterInThePasswordField(string password)
    {
        _loginPage.EnterPassword(password);
    }

    [When(@"I click the login button")]
    public void WhenIClickTheLoginButton()
    {
        _loginPage.ClickLogin();
    }

    [Then(@"I should be redirected to the dashboard")]
    public void ThenIShouldBeRedirectedToTheDashboard()
    {
        _dashboardPage.IsLoaded().Should().BeTrue("Dashboard should be displayed");
        _browserContext.Driver.Url.Should().Contain("/dashboard");
    }

    [Then(@"I should see the welcome message ""(.*)""")]
    public void ThenIShouldSeeTheWelcomeMessage(string expectedMessage)
    {
        _dashboardPage.GetWelcomeMessage().Should().Contain(expectedMessage);
    }

    [Then(@"I should see the error message ""(.*)""")]
    public void ThenIShouldSeeTheErrorMessage(string expectedError)
    {
        _loginPage.GetErrorMessage().Should().Be(expectedError);
    }

    [Then(@"I should remain on the login page")]
    public void ThenIShouldRemainOnTheLoginPage()
    {
        _browserContext.Driver.Url.Should().Contain("/login");
    }

    [Given(@"the following users exist:")]
    public void GivenTheFollowingUsersExist(Table table)
    {
        var users = table.CreateSet<UserData>();
        foreach (var user in users)
        {
            // Create users via API for test setup
            var apiContext = _scenarioContext.Get<ApiContext>();
            apiContext.CreateTestUser(user.Email, user.Password, user.Role);
        }
    }

    [When(@"I login as ""(.*)"" with password ""(.*)""")]
    public void WhenILoginAs(string email, string password)
    {
        _loginPage.EnterEmail(email);
        _loginPage.EnterPassword(password);
        _loginPage.ClickLogin();
    }
}

public class UserData
{
    public string Email { get; set; }
    public string Password { get; set; }
    public string Role { get; set; }
}
```

### Context Classes (Dependency Injection)

```csharp
// Contexts/BrowserContext.cs
using OpenQA.Selenium;

namespace Contexts;

public class BrowserContext : IDisposable
{
    public IWebDriver Driver { get; set; }
    public string BaseUrl { get; set; }

    public BrowserContext()
    {
        BaseUrl = Environment.GetEnvironmentVariable("BASE_URL") ?? "http://localhost:3000";
    }

    public void Dispose()
    {
        Driver?.Quit();
        Driver?.Dispose();
    }
}

// Contexts/ApiContext.cs
using System.Net.Http;
using System.Net.Http.Json;

namespace Contexts;

public class ApiContext : IDisposable
{
    public HttpClient Client { get; }
    public HttpResponseMessage LastResponse { get; set; }
    public string AuthToken { get; set; }
    private readonly string _baseUrl;

    public ApiContext()
    {
        _baseUrl = Environment.GetEnvironmentVariable("API_URL") ?? "http://localhost:3000/api";
        Client = new HttpClient { BaseAddress = new Uri(_baseUrl) };
    }

    public async Task CreateTestUser(string email, string password, string role)
    {
        var payload = new { email, password, role };
        await Client.PostAsJsonAsync("/api/test/users", payload);
    }

    public async Task<T> GetResponseAs<T>()
    {
        return await LastResponse.Content.ReadFromJsonAsync<T>();
    }

    public void Dispose()
    {
        Client?.Dispose();
    }
}
```

### Hooks

```csharp
// Hooks/BrowserHooks.cs
using BoDi;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using TechTalk.SpecFlow;
using Contexts;

namespace Hooks;

[Binding]
public class BrowserHooks
{
    private readonly IObjectContainer _objectContainer;
    private readonly BrowserContext _browserContext;

    public BrowserHooks(IObjectContainer objectContainer, BrowserContext browserContext)
    {
        _objectContainer = objectContainer;
        _browserContext = browserContext;
    }

    [BeforeScenario("@browser", "@javascript", "@ui")]
    public void BeforeUiScenario()
    {
        var options = new ChromeOptions();
        if (Environment.GetEnvironmentVariable("CI") != null)
        {
            options.AddArguments("--headless", "--no-sandbox", "--disable-dev-shm-usage");
        }
        options.AddArguments("--window-size=1920,1080");

        var driver = new ChromeDriver(options);
        driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(10);
        _browserContext.Driver = driver;
    }

    [AfterScenario("@browser", "@javascript", "@ui")]
    public void AfterUiScenario(ScenarioContext scenarioContext)
    {
        if (scenarioContext.TestError != null && _browserContext.Driver != null)
        {
            var screenshot = ((ITakesScreenshot)_browserContext.Driver).GetScreenshot();
            var filename = $"reports/screenshots/{scenarioContext.ScenarioInfo.Title}_{DateTime.Now:yyyyMMdd_HHmmss}.png";
            screenshot.SaveAsFile(filename);
        }

        _browserContext.Driver?.Quit();
    }

    [BeforeScenario("@api")]
    public void BeforeApiScenario()
    {
        // API context is auto-injected, just ensure configuration
        var apiContext = _objectContainer.Resolve<ApiContext>();
        apiContext.Client.DefaultRequestHeaders.Add("Accept", "application/json");
    }
}

// Hooks/DatabaseHooks.cs
[Binding]
public class DatabaseHooks
{
    [BeforeScenario("@database")]
    public void BeforeDatabaseScenario()
    {
        // Start a transaction
    }

    [AfterScenario("@database")]
    public void AfterDatabaseScenario()
    {
        // Rollback transaction to keep database clean
    }

    [BeforeTestRun]
    public static void BeforeTestRun()
    {
        // One-time setup: seed database, start services
    }

    [AfterTestRun]
    public static void AfterTestRun()
    {
        // One-time teardown: cleanup resources
    }
}
```

### Page Objects

```csharp
// PageObjects/BasePage.cs
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using Contexts;

namespace PageObjects;

public abstract class BasePage
{
    protected readonly IWebDriver Driver;
    protected readonly WebDriverWait Wait;
    protected readonly string BaseUrl;

    protected BasePage(BrowserContext context)
    {
        Driver = context.Driver;
        BaseUrl = context.BaseUrl;
        Wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
    }

    protected IWebElement FindElement(By locator)
    {
        return Wait.Until(d => d.FindElement(locator));
    }

    protected void Click(By locator)
    {
        Wait.Until(SeleniumExtras.WaitHelpers.ExpectedConditions.ElementToBeClickable(locator)).Click();
    }

    protected void Type(By locator, string text)
    {
        var element = FindElement(locator);
        element.Clear();
        element.SendKeys(text);
    }

    protected string GetText(By locator)
    {
        return FindElement(locator).Text;
    }

    protected bool IsDisplayed(By locator, int timeoutSeconds = 5)
    {
        try
        {
            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(timeoutSeconds));
            wait.Until(d => d.FindElement(locator).Displayed);
            return true;
        }
        catch
        {
            return false;
        }
    }

    protected void WaitForUrlContaining(string urlPart)
    {
        Wait.Until(d => d.Url.Contains(urlPart));
    }
}

// PageObjects/LoginPage.cs
using OpenQA.Selenium;
using Contexts;

namespace PageObjects;

public class LoginPage : BasePage
{
    private static readonly By EmailInput = By.CssSelector("[data-testid='email-input']");
    private static readonly By PasswordInput = By.CssSelector("[data-testid='password-input']");
    private static readonly By LoginButton = By.CssSelector("[data-testid='login-submit']");
    private static readonly By ErrorMessage = By.CssSelector("[data-testid='error-message']");

    public LoginPage(BrowserContext context) : base(context) { }

    public void Open()
    {
        Driver.Navigate().GoToUrl($"{BaseUrl}/login");
    }

    public bool IsLoaded() => IsDisplayed(EmailInput);

    public void EnterEmail(string email) => Type(EmailInput, email);
    public void EnterPassword(string password) => Type(PasswordInput, password);
    public void ClickLogin() => Click(LoginButton);
    public string GetErrorMessage() => GetText(ErrorMessage);
}

// PageObjects/DashboardPage.cs
using OpenQA.Selenium;
using Contexts;

namespace PageObjects;

public class DashboardPage : BasePage
{
    private static readonly By WelcomeMessage = By.CssSelector("[data-testid='welcome-message']");
    private static readonly By AdminPanel = By.CssSelector("[data-testid='admin-panel']");

    public DashboardPage(BrowserContext context) : base(context) { }

    public bool IsLoaded() => IsDisplayed(WelcomeMessage);
    public string GetWelcomeMessage() => GetText(WelcomeMessage);
    public bool HasAdminPanel() => IsDisplayed(AdminPanel);
}
```

### API Testing Steps

```csharp
// StepDefinitions/ApiSteps.cs
using System.Net;
using System.Net.Http.Json;
using TechTalk.SpecFlow;
using FluentAssertions;
using Contexts;

namespace StepDefinitions;

[Binding]
public class ApiSteps
{
    private readonly ApiContext _apiContext;

    public ApiSteps(ApiContext apiContext)
    {
        _apiContext = apiContext;
    }

    [Given(@"I am authenticated as ""(.*)""")]
    public async Task GivenIAmAuthenticatedAs(string role)
    {
        var loginPayload = new { email = $"{role}@example.com", password = "TestPass123" };
        var response = await _apiContext.Client.PostAsJsonAsync("/auth/login", loginPayload);
        var result = await response.Content.ReadFromJsonAsync<LoginResult>();
        _apiContext.AuthToken = result.Token;
        _apiContext.Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", result.Token);
    }

    [When(@"I send a GET request to ""(.*)""")]
    public async Task WhenISendAGetRequest(string endpoint)
    {
        _apiContext.LastResponse = await _apiContext.Client.GetAsync(endpoint);
    }

    [When(@"I send a POST request to ""(.*)"" with:")]
    public async Task WhenISendAPostRequestWith(string endpoint, Table table)
    {
        var data = table.Rows[0].ToDictionary(r => r.Key, r => r.Value);
        _apiContext.LastResponse = await _apiContext.Client.PostAsJsonAsync(endpoint, data);
    }

    [Then(@"the response status should be (.*)")]
    public void ThenTheResponseStatusShouldBe(int statusCode)
    {
        ((int)_apiContext.LastResponse.StatusCode).Should().Be(statusCode);
    }

    [Then(@"the response should contain ""(.*)""")]
    public async Task ThenTheResponseShouldContain(string expectedText)
    {
        var body = await _apiContext.LastResponse.Content.ReadAsStringAsync();
        body.Should().Contain(expectedText);
    }
}

public record LoginResult(string Token);
```

### SpecFlow Configuration

```json
// specflow.json
{
  "language": {
    "feature": "en"
  },
  "bindingCulture": {
    "name": "en-US"
  },
  "generator": {
    "addNonParallelizableMarkerForTags": ["@sequential"]
  },
  "runtime": {
    "missingOrPendingStepsOutcome": "Error"
  }
}
```

### CI/CD Integration (GitHub Actions)

```yaml
name: SpecFlow BDD Tests
on: [push, pull_request]

jobs:
  specflow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'
      - run: dotnet restore
      - run: dotnet build --no-restore
      - name: Run SpecFlow tests
        run: dotnet test --no-build --logger "trx;LogFileName=results.trx"
        env:
          BASE_URL: http://localhost:3000
          CI: true
      - name: Generate LivingDoc
        run: |
          dotnet tool install --global SpecFlow.Plus.LivingDoc.CLI
          livingdoc test-assembly ProjectName.Specs/bin/Debug/net8.0/ProjectName.Specs.dll -t ProjectName.Specs/bin/Debug/net8.0/TestExecution.json
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-reports
          path: |
            **/*.trx
            LivingDoc.html
```

## Best Practices

1. **Use Background for shared preconditions** that apply to all scenarios in a feature file instead of repeating Given steps.
2. **Tag scenarios for selective execution** — Use `@smoke`, `@regression`, `@api`, `@browser` to filter test runs in different contexts.
3. **Use Scenario Outline for data-driven tests** with Examples tables instead of duplicating nearly identical scenarios.
4. **Leverage SpecFlow's DI container** — Inject shared contexts and page objects through constructors rather than using static state.
5. **Scope hooks with tags** — `[BeforeScenario("@browser")]` runs only for browser tests, keeping API tests fast.
6. **Use Table.CreateSet<T>()** for mapping Gherkin tables to strongly-typed C# objects with SpecFlow.Assist.
7. **Generate LivingDoc reports** — SpecFlow+ LivingDoc creates HTML documentation from features and test results for stakeholder visibility.
8. **Use FluentAssertions** for readable, descriptive assertion messages that improve failure diagnostics.
9. **Keep step definitions thin** — Step definitions should delegate to page objects, API clients, or service classes.
10. **Configure `missingOrPendingStepsOutcome` to Error** in specflow.json to catch undefined steps as test failures.

## Anti-Patterns to Avoid

1. **Avoid technical Gherkin** — `When I click CSS selector #btn-submit` is implementation detail. Use `When I submit the form`.
2. **Avoid monolithic step definition files** — Split steps by domain into focused classes (AuthSteps, ShoppingSteps, ApiSteps).
3. **Avoid sharing state via static fields** — Use SpecFlow's context injection. Static state causes parallel execution issues.
4. **Avoid long scenarios** — Keep scenarios under 10 steps. Long scenarios indicate the feature needs decomposition.
5. **Avoid coupling between scenarios** — Each scenario must be independent. Never depend on previous scenario outcomes.
6. **Avoid Thread.Sleep()** — Use WebDriverWait with explicit conditions instead of fixed-duration waits.
7. **Avoid hardcoded configuration** — Use environment variables or appsettings.test.json for URLs, credentials, and timeouts.
8. **Avoid testing through the UI for everything** — Use API calls for test data setup. Only use UI when testing UI-specific behavior.
9. **Avoid ignoring SpecFlow profiles** — Use profiles in specflow.json for different environments and configurations.
10. **Avoid missing screenshot-on-failure** — Always capture screenshots in `[AfterScenario]` hooks when tests fail.
