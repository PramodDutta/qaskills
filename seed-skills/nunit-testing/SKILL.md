---
name: NUnit Testing
description: NUnit 3 constraint-based testing for C# covering Assert.That patterns, parameterized tests, setup/teardown, Moq mocking, test categories, and the fluent assertion model.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [nunit, csharp, dotnet, constraint-model, unit-testing, moq, parameterized, tdd]
testingTypes: [unit, integration]
frameworks: [nunit]
languages: [csharp]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# NUnit Testing Skill

You are an expert C# developer specializing in testing with NUnit 3. When the user asks you to write, review, or debug NUnit tests, follow these detailed instructions to produce robust test suites that leverage NUnit's constraint-based assertion model and powerful parameterization features.

## Core Principles

1. **Test behavior, not implementation** -- Verify what the code does from a caller's perspective rather than internal implementation details.
2. **Use the constraint model** -- Prefer `Assert.That(actual, Is.EqualTo(expected))` over classic `Assert.AreEqual` for readable, composable assertions.
3. **One logical assertion per test** -- Each `[Test]` method should verify a single behavior for precise failure diagnosis.
4. **Arrange-Act-Assert** -- Structure every test into setup, execution, and verification sections for clarity.
5. **Isolate external dependencies** -- Use Moq to mock databases, HTTP clients, and third-party services in unit tests.
6. **Descriptive test names** -- Name tests as `MethodName_Scenario_ExpectedResult` so test output reads as a specification.
7. **Leverage parameterized tests** -- Use `[TestCase]` and `[TestCaseSource]` to test multiple inputs without code duplication.

## Project Structure

```
Solution/
  src/
    MyApp/
      Services/
        UserService.cs
        PaymentService.cs
      Models/
        User.cs
        Order.cs
      Repositories/
        IUserRepository.cs
        UserRepository.cs
      Utilities/
        Validators.cs
  tests/
    MyApp.Tests/
      Services/
        UserServiceTests.cs
        PaymentServiceTests.cs
      Models/
        UserTests.cs
        OrderTests.cs
      Utilities/
        ValidatorsTests.cs
      Fixtures/
        TestDataFactory.cs
      MyApp.Tests.csproj
    MyApp.IntegrationTests/
      UserPaymentFlowTests.cs
      MyApp.IntegrationTests.csproj
Solution.sln
```

## Dependencies

### .csproj
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.10.0" />
    <PackageReference Include="NUnit" Version="4.1.0" />
    <PackageReference Include="NUnit3TestAdapter" Version="4.5.0" />
    <PackageReference Include="Moq" Version="4.20.70" />
    <PackageReference Include="coverlet.collector" Version="6.0.2" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\src\MyApp\MyApp.csproj" />
  </ItemGroup>
</Project>
```

### Running Tests
```bash
# Run all tests
dotnet test

# Run specific project
dotnet test tests/MyApp.Tests

# Run with filter
dotnet test --filter "FullyQualifiedName~UserServiceTests"

# Run specific category
dotnet test --filter "TestCategory=Unit"

# Run with coverage
dotnet test --collect:"XPlat Code Coverage"

# Verbose output
dotnet test --verbosity detailed
```

## Basic Test Structure

```csharp
using NUnit.Framework;

namespace MyApp.Tests.Services;

[TestFixture]
public class UserServiceTests
{
    private UserService _userService = null!;
    private InMemoryUserRepository _userRepository = null!;

    [SetUp]
    public void SetUp()
    {
        _userRepository = new InMemoryUserRepository();
        _userService = new UserService(_userRepository);
    }

    [TearDown]
    public void TearDown()
    {
        _userRepository = null!;
        _userService = null!;
    }

    [Test]
    [Category("Unit")]
    public void CreateUser_WithValidData_ReturnsUser()
    {
        // Arrange
        var request = new CreateUserRequest("Alice", "alice@example.com", 30);

        // Act
        var user = _userService.CreateUser(request);

        // Assert
        Assert.That(user, Is.Not.Null);
        Assert.That(user.Name, Is.EqualTo("Alice"));
        Assert.That(user.Email, Is.EqualTo("alice@example.com"));
    }

    [Test]
    [Category("Unit")]
    public void CreateUser_WithoutEmail_ThrowsArgumentException()
    {
        var request = new CreateUserRequest("Bob", null!, 25);

        var exception = Assert.Throws<ArgumentException>(
            () => _userService.CreateUser(request));

        Assert.That(exception!.Message, Does.Contain("email"));
    }

    [Test]
    [Category("Unit")]
    public void CreateUser_WithDuplicateEmail_ThrowsDuplicateEmailException()
    {
        var request = new CreateUserRequest("Alice", "alice@example.com", 30);
        _userService.CreateUser(request);

        Assert.Throws<DuplicateEmailException>(
            () => _userService.CreateUser(request));
    }
}
```

## Constraint Model Reference

```csharp
[TestFixture]
public class ConstraintModelExamples
{
    [Test]
    public void EqualityConstraints()
    {
        Assert.That(2 + 2, Is.EqualTo(4));
        Assert.That(2 + 2, Is.Not.EqualTo(5));
        Assert.That(0.1 + 0.2, Is.EqualTo(0.3).Within(0.001));
        Assert.That("Hello", Is.EqualTo("hello").IgnoreCase);
    }

    [Test]
    public void ComparisonConstraints()
    {
        Assert.That(10, Is.GreaterThan(5));
        Assert.That(5, Is.LessThan(10));
        Assert.That(10, Is.GreaterThanOrEqualTo(10));
        Assert.That(5, Is.LessThanOrEqualTo(5));
        Assert.That(7, Is.InRange(1, 10));
    }

    [Test]
    public void TypeConstraints()
    {
        Assert.That(42, Is.TypeOf<int>());
        Assert.That("hello", Is.InstanceOf<string>());
        Assert.That(42, Is.Not.TypeOf<string>());
    }

    [Test]
    public void StringConstraints()
    {
        Assert.That("hello world", Does.Contain("world"));
        Assert.That("hello world", Does.StartWith("hello"));
        Assert.That("hello world", Does.EndWith("world"));
        Assert.That("abc123", Does.Match(@"\d+"));
        Assert.That("HELLO", Is.EqualTo("hello").IgnoreCase);
    }

    [Test]
    public void CollectionConstraints()
    {
        var list = new[] { 1, 2, 3 };

        Assert.That(list, Has.Length.EqualTo(3));
        Assert.That(list, Does.Contain(2));
        Assert.That(list, Is.Ordered);
        Assert.That(list, Is.All.GreaterThan(0));
        Assert.That(list, Is.Unique);
        Assert.That(list, Has.Exactly(1).EqualTo(2));
        Assert.That(list, Is.EquivalentTo(new[] { 3, 1, 2 }));
        Assert.That(list, Has.None.LessThan(0));
    }

    [Test]
    public void NullAndEmptyConstraints()
    {
        Assert.That(null, Is.Null);
        Assert.That("value", Is.Not.Null);
        Assert.That("", Is.Empty);
        Assert.That("hello", Is.Not.Empty);
        Assert.That(new List<int>(), Is.Empty);
    }

    [Test]
    public void BooleanConstraints()
    {
        Assert.That(true, Is.True);
        Assert.That(false, Is.False);
    }

    [Test]
    public void CompoundConstraints()
    {
        Assert.That(7, Is.GreaterThan(5).And.LessThan(10));
        Assert.That("hello", Is.Not.Null.And.Not.Empty);
        Assert.That(42, Is.EqualTo(42).Or.EqualTo(0));
    }

    [Test]
    public void ExceptionConstraints()
    {
        Assert.That(
            () => { throw new ArgumentException("bad input"); },
            Throws.TypeOf<ArgumentException>()
                .With.Message.Contain("bad input"));

        Assert.That(
            () => { int x = 1 + 1; },
            Throws.Nothing);
    }
}
```

## Parameterized Tests

### Using TestCase
```csharp
[TestFixture]
public class ValidatorTests
{
    [TestCase("user@example.com")]
    [TestCase("admin@test.org")]
    [TestCase("user.name@domain.co.uk")]
    [TestCase("user+tag@example.com")]
    public void IsValidEmail_WithValidInput_ReturnsTrue(string email)
    {
        Assert.That(Validators.IsValidEmail(email), Is.True,
            $"Expected valid: {email}");
    }

    [TestCase("")]
    [TestCase("not-an-email")]
    [TestCase("@domain.com")]
    [TestCase("user@")]
    public void IsValidEmail_WithInvalidInput_ReturnsFalse(string email)
    {
        Assert.That(Validators.IsValidEmail(email), Is.False,
            $"Expected invalid: {email}");
    }

    [TestCase(1, 1, ExpectedResult = 2)]
    [TestCase(0, 0, ExpectedResult = 0)]
    [TestCase(-1, 1, ExpectedResult = 0)]
    [TestCase(100, 200, ExpectedResult = 300)]
    [TestCase(-50, -50, ExpectedResult = -100)]
    public int Add_WithVariousInputs_ReturnsExpectedSum(int a, int b)
    {
        return Calculator.Add(a, b);
    }
}
```

### Using TestCaseSource
```csharp
[TestFixture]
public class AdvancedParameterizedTests
{
    [TestCaseSource(nameof(AgeValidationData))]
    public void IsValidAge_WithBoundaryValues_ReturnsExpected(int age, bool expected)
    {
        Assert.That(Validators.IsValidAge(age), Is.EqualTo(expected));
    }

    private static IEnumerable<TestCaseData> AgeValidationData()
    {
        yield return new TestCaseData(0, false).SetName("Age 0 is invalid");
        yield return new TestCaseData(1, true).SetName("Age 1 is valid");
        yield return new TestCaseData(17, false).SetName("Age 17 is invalid");
        yield return new TestCaseData(18, true).SetName("Age 18 is valid");
        yield return new TestCaseData(120, true).SetName("Age 120 is valid");
        yield return new TestCaseData(121, false).SetName("Age 121 is invalid");
        yield return new TestCaseData(-1, false).SetName("Negative age is invalid");
    }

    [TestCaseSource(nameof(UserCreationData))]
    public void CreateUser_WithVariousInputs(string name, string email, bool shouldSucceed)
    {
        if (shouldSucceed)
        {
            var user = _service.CreateUser(new CreateUserRequest(name, email, 25));
            Assert.That(user, Is.Not.Null);
        }
        else
        {
            Assert.Throws<ArgumentException>(
                () => _service.CreateUser(new CreateUserRequest(name, email, 25)));
        }
    }

    private static object[] UserCreationData =
    {
        new object[] { "Alice", "alice@example.com", true },
        new object[] { "", "empty@test.com", false },
        new object[] { "Bob", "", false },
    };
}
```

### Using Values and Range
```csharp
[TestFixture]
public class CombinatoricTests
{
    [Test]
    public void IsValidAge_WithValueRange(
        [Values(0, 1, 17, 18, 120, 121)] int age)
    {
        var result = Validators.IsValidAge(age);
        Assert.That(result, Is.TypeOf<bool>());
    }

    [Test]
    public void Add_WithRange(
        [Range(0, 5)] int a,
        [Range(0, 5)] int b)
    {
        var result = Calculator.Add(a, b);
        Assert.That(result, Is.EqualTo(a + b));
    }
}
```

## Mocking with Moq

```csharp
[TestFixture]
public class UserServiceMockTests
{
    private Mock<IUserRepository> _mockRepository = null!;
    private Mock<IEmailService> _mockEmailService = null!;
    private UserService _userService = null!;

    [SetUp]
    public void SetUp()
    {
        _mockRepository = new Mock<IUserRepository>();
        _mockEmailService = new Mock<IEmailService>();
        _userService = new UserService(_mockRepository.Object, _mockEmailService.Object);
    }

    [Test]
    public void GetUser_ById_QueriesRepository()
    {
        var expectedUser = new User { Id = 1, Name = "Alice", Email = "alice@example.com" };
        _mockRepository.Setup(r => r.FindById(1)).Returns(expectedUser);

        var user = _userService.GetUser(1);

        Assert.That(user.Name, Is.EqualTo("Alice"));
        _mockRepository.Verify(r => r.FindById(1), Times.Once);
    }

    [Test]
    public void GetUser_NotFound_ReturnsNull()
    {
        _mockRepository.Setup(r => r.FindById(999)).Returns((User?)null);

        var user = _userService.GetUser(999);

        Assert.That(user, Is.Null);
    }

    [Test]
    public void CreateUser_SendsWelcomeEmail()
    {
        _mockRepository
            .Setup(r => r.Save(It.IsAny<User>()))
            .Callback<User>(u => u.Id = 1);

        _userService.CreateUser(new CreateUserRequest("Bob", "bob@example.com", 25));

        _mockEmailService.Verify(
            e => e.SendWelcomeEmail(It.Is<string>(s => s == "bob@example.com")),
            Times.Once);
    }

    [Test]
    public void CreateUser_EmailFails_DoesNotThrow()
    {
        _mockRepository
            .Setup(r => r.Save(It.IsAny<User>()))
            .Callback<User>(u => u.Id = 1);

        _mockEmailService
            .Setup(e => e.SendWelcomeEmail(It.IsAny<string>()))
            .Throws(new InvalidOperationException("SMTP error"));

        Assert.DoesNotThrow(() =>
            _userService.CreateUser(new CreateUserRequest("Bob", "bob@example.com", 25)));
    }
}
```

## Lifecycle Hooks

```csharp
[TestFixture]
public class LifecycleExampleTests
{
    private static DatabaseConnection _connection = null!;

    [OneTimeSetUp]
    public void OneTimeSetUp()
    {
        // Runs once before ALL tests in this fixture
        _connection = new DatabaseConnection("sqlite::memory:");
        _connection.Execute("CREATE TABLE Users (Id INTEGER PRIMARY KEY, Name TEXT)");
    }

    [OneTimeTearDown]
    public void OneTimeTearDown()
    {
        // Runs once after ALL tests in this fixture
        _connection?.Dispose();
    }

    [SetUp]
    public void SetUp()
    {
        // Runs before EACH test
        _connection.BeginTransaction();
    }

    [TearDown]
    public void TearDown()
    {
        // Runs after EACH test
        _connection.RollbackTransaction();
    }

    [Test]
    public void InsertUser_PersistsToDatabase()
    {
        _connection.Execute("INSERT INTO Users (Name) VALUES ('Alice')");

        var result = _connection.QuerySingle("SELECT Name FROM Users");
        Assert.That(result, Is.EqualTo("Alice"));
    }
}
```

## Testing Async Methods

```csharp
[TestFixture]
public class AsyncServiceTests
{
    [Test]
    public async Task FetchData_ReturnsResults()
    {
        var mockClient = new Mock<IHttpClient>();
        mockClient
            .Setup(c => c.GetAsync("/api/items"))
            .ReturnsAsync(new ApiResponse { Items = new[] { 1, 2, 3 } });

        var service = new DataService(mockClient.Object);

        var result = await service.FetchDataAsync();

        Assert.That(result.Items, Has.Length.EqualTo(3));
    }

    [Test]
    public void FetchData_OnFailure_ThrowsServiceException()
    {
        var mockClient = new Mock<IHttpClient>();
        mockClient
            .Setup(c => c.GetAsync(It.IsAny<string>()))
            .ThrowsAsync(new HttpRequestException("Connection refused"));

        var service = new DataService(mockClient.Object);

        Assert.ThrowsAsync<ServiceException>(
            async () => await service.FetchDataAsync());
    }
}
```

## Custom Constraints

```csharp
public class ValidEmailConstraint : Constraint
{
    public override ConstraintResult ApplyTo<TActual>(TActual actual)
    {
        var email = actual as string;
        var isValid = email != null &&
            System.Text.RegularExpressions.Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$");

        return new ConstraintResult(this, actual, isValid);
    }

    public override string Description => "a valid email address";
}

public static class CustomIs
{
    public static ValidEmailConstraint ValidEmail => new ValidEmailConstraint();
}

// Usage
[Test]
public void Email_ShouldBeValid()
{
    Assert.That("user@example.com", CustomIs.ValidEmail);
}
```

## Best Practices

1. **Use the constraint model consistently** -- Prefer `Assert.That(actual, Is.EqualTo(expected))` for composable, readable assertions with better failure messages.
2. **Use `[TestCase]` for inline parameterization** -- Supply test data directly in attributes for concise, readable data-driven tests.
3. **Use `[TestCaseSource]` for complex data** -- When test data involves objects or computed values, extract to a static source method.
4. **Use `[Category]` for test classification** -- Tag tests as "Unit", "Integration", or "Slow" for selective execution in CI/CD pipelines.
5. **Follow naming convention** -- Name tests as `MethodName_Scenario_ExpectedResult` for self-documenting test output.
6. **Use Moq for dependency mocking** -- Mock interfaces with Moq and verify interactions with `.Verify()` for clean test isolation.
7. **Prefer `Assert.Throws` over try-catch** -- Use the assertion method for exception testing to get clear, composable failure messages.
8. **Use `[SetUp]`/`[TearDown]` consistently** -- Initialize shared objects in `[SetUp]` and clean up resources in `[TearDown]` for each test.
9. **Use `[OneTimeSetUp]` for expensive resources** -- Share database connections and server instances across tests within a fixture.
10. **Keep tests fast and independent** -- Unit tests should complete in milliseconds with no shared mutable state between methods.

## Anti-Patterns

1. **Using classic Assert methods** -- `Assert.AreEqual` is less composable than `Assert.That` with constraints; prefer the modern constraint model.
2. **Testing private methods via reflection** -- Accessing internals couples tests to implementation; test through the public API instead.
3. **Not using `[TearDown]`** -- Forgetting to clean up disposable resources causes leaks and intermittent failures across tests.
4. **Over-mocking** -- Mocking every dependency including simple value objects makes tests prove nothing about real behavior.
5. **Shared mutable state between tests** -- Instance fields modified without `[SetUp]` reset cause order-dependent failures.
6. **Hardcoding test data everywhere** -- Scatter magic numbers across tests; extract to `TestCaseSource` or a `TestDataFactory` class.
7. **Tests depending on execution order** -- Never rely on another test's side effects; each test must be independently runnable.
8. **Catching exceptions in tests** -- Using try-catch in test methods swallows real failures; use `Assert.Throws` or `Assert.ThrowsAsync`.
9. **Not using `[Retry]` for flaky integration tests** -- If tests interact with external services, use `[Retry(3)]` to handle transient failures gracefully.
10. **Ignoring test output** -- Not reading test names and constraint-model failure messages means missing diagnostic information.
