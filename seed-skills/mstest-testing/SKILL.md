---
name: MSTest Testing
description: Microsoft's built-in .NET testing framework covering test classes, data-driven tests, assertions, lifecycle management, mocking with Moq, and integration testing for C# applications.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [mstest, csharp, dotnet, unit-testing, mocking, moq, data-driven, assertions]
testingTypes: [unit, integration]
frameworks: [mstest]
languages: [csharp]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# MSTest Testing Skill

You are an expert C# developer specializing in testing with MSTest, Microsoft's built-in testing framework for .NET. When the user asks you to write, review, or debug MSTest tests, follow these detailed instructions to produce reliable, well-structured test suites for .NET applications.

## Core Principles

1. **Test behavior, not implementation** -- Verify what the code does from a caller's perspective, not internal mechanics that change during refactoring.
2. **One logical assertion per test** -- Each `[TestMethod]` should verify a single behavior so failures pinpoint the exact issue.
3. **Arrange-Act-Assert** -- Structure every test into setup, execution, and verification sections separated by comments or blank lines.
4. **Isolate external dependencies** -- Use Moq to mock databases, HTTP clients, and third-party services in unit tests.
5. **Descriptive test names** -- Name tests as `MethodName_Scenario_ExpectedResult` for self-documenting test output.
6. **Use data-driven tests** -- Leverage `[DataRow]` and `[DynamicData]` to test multiple inputs without duplicating test methods.
7. **Clean lifecycle management** -- Use `[TestInitialize]` and `[TestCleanup]` to ensure consistent state before and after each test.

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
    MyApp.UnitTests/
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
      MyApp.UnitTests.csproj
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
    <PackageReference Include="MSTest.TestAdapter" Version="3.4.0" />
    <PackageReference Include="MSTest.TestFramework" Version="3.4.0" />
    <PackageReference Include="Moq" Version="4.20.70" />
    <PackageReference Include="FluentAssertions" Version="6.12.0" />
    <PackageReference Include="Bogus" Version="35.5.0" />
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
dotnet test tests/MyApp.UnitTests

# Run with filter
dotnet test --filter "FullyQualifiedName~UserServiceTests"

# Run specific test
dotnet test --filter "FullyQualifiedName=MyApp.UnitTests.Services.UserServiceTests.CreateUser_WithValidData_ReturnsUser"

# Run with category
dotnet test --filter "TestCategory=Unit"

# Run with coverage
dotnet test --collect:"XPlat Code Coverage"

# Verbose output
dotnet test --verbosity detailed
```

## Basic Test Structure

```csharp
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace MyApp.UnitTests.Services;

[TestClass]
public class UserServiceTests
{
    private UserService _userService = null!;
    private InMemoryUserRepository _userRepository = null!;

    [TestInitialize]
    public void SetUp()
    {
        _userRepository = new InMemoryUserRepository();
        _userService = new UserService(_userRepository);
    }

    [TestCleanup]
    public void TearDown()
    {
        _userRepository = null!;
        _userService = null!;
    }

    [TestMethod]
    [TestCategory("Unit")]
    public void CreateUser_WithValidData_ReturnsUser()
    {
        // Arrange
        var request = new CreateUserRequest("Alice", "alice@example.com", 30);

        // Act
        var user = _userService.CreateUser(request);

        // Assert
        Assert.IsNotNull(user);
        Assert.AreEqual("Alice", user.Name);
        Assert.AreEqual("alice@example.com", user.Email);
    }

    [TestMethod]
    [TestCategory("Unit")]
    [ExpectedException(typeof(ArgumentException))]
    public void CreateUser_WithoutEmail_ThrowsArgumentException()
    {
        var request = new CreateUserRequest("Bob", null!, 25);

        _userService.CreateUser(request);
    }

    [TestMethod]
    [TestCategory("Unit")]
    public void CreateUser_WithDuplicateEmail_ThrowsException()
    {
        var request = new CreateUserRequest("Alice", "alice@example.com", 30);
        _userService.CreateUser(request);

        Assert.ThrowsException<DuplicateEmailException>(
            () => _userService.CreateUser(request));
    }
}
```

## Assertion Methods Reference

```csharp
[TestClass]
public class AssertionExamplesTests
{
    [TestMethod]
    public void EqualityAssertions()
    {
        Assert.AreEqual(4, 2 + 2);
        Assert.AreNotEqual(5, 2 + 2);
        Assert.AreEqual(0.3, 0.1 + 0.2, 0.001); // Delta for floating point
    }

    [TestMethod]
    public void BooleanAssertions()
    {
        Assert.IsTrue(10 > 5);
        Assert.IsFalse(5 > 10);
        Assert.IsNull(null);
        Assert.IsNotNull("value");
    }

    [TestMethod]
    public void TypeAssertions()
    {
        Assert.IsInstanceOfType(42, typeof(int));
        Assert.IsInstanceOfType("hello", typeof(string));
        Assert.IsNotInstanceOfType("hello", typeof(int));
    }

    [TestMethod]
    public void StringAssertions()
    {
        StringAssert.Contains("hello world", "world");
        StringAssert.StartsWith("hello world", "hello");
        StringAssert.EndsWith("hello world", "world");
        StringAssert.Matches("abc123", new System.Text.RegularExpressions.Regex(@"\d+"));
    }

    [TestMethod]
    public void CollectionAssertions()
    {
        var list = new List<int> { 1, 2, 3 };
        CollectionAssert.Contains(list, 2);
        CollectionAssert.DoesNotContain(list, 4);
        CollectionAssert.AreEqual(new List<int> { 1, 2, 3 }, list);
        CollectionAssert.AreEquivalent(new List<int> { 3, 1, 2 }, list);
        CollectionAssert.AllItemsAreNotNull(list.Cast<object>().ToList());
        CollectionAssert.AllItemsAreUnique(list);
    }

    [TestMethod]
    public void ExceptionAssertions()
    {
        var exception = Assert.ThrowsException<DivideByZeroException>(
            () => { var x = 1 / 0; });

        Assert.AreEqual("Attempted to divide by zero.", exception.Message);
    }
}
```

## Data-Driven Tests

### Using DataRow
```csharp
[TestClass]
public class ValidatorTests
{
    [TestMethod]
    [DataRow("user@example.com")]
    [DataRow("admin@test.org")]
    [DataRow("user.name@domain.co.uk")]
    [DataRow("user+tag@example.com")]
    public void IsValidEmail_WithValidInput_ReturnsTrue(string email)
    {
        Assert.IsTrue(Validators.IsValidEmail(email), $"Expected valid: {email}");
    }

    [TestMethod]
    [DataRow("")]
    [DataRow("not-an-email")]
    [DataRow("@domain.com")]
    [DataRow("user@")]
    public void IsValidEmail_WithInvalidInput_ReturnsFalse(string email)
    {
        Assert.IsFalse(Validators.IsValidEmail(email), $"Expected invalid: {email}");
    }

    [TestMethod]
    [DataRow(1, 1, 2)]
    [DataRow(0, 0, 0)]
    [DataRow(-1, 1, 0)]
    [DataRow(100, 200, 300)]
    [DataRow(-50, -50, -100)]
    public void Add_WithVariousInputs_ReturnsExpectedSum(int a, int b, int expected)
    {
        Assert.AreEqual(expected, Calculator.Add(a, b));
    }
}
```

### Using DynamicData
```csharp
[TestClass]
public class AdvancedDataDrivenTests
{
    [TestMethod]
    [DynamicData(nameof(AgeValidationData), DynamicDataSourceType.Method)]
    public void IsValidAge_WithBoundaryValues_ReturnsExpected(int age, bool expected)
    {
        Assert.AreEqual(expected, Validators.IsValidAge(age));
    }

    public static IEnumerable<object[]> AgeValidationData()
    {
        yield return new object[] { 0, false };
        yield return new object[] { 1, true };
        yield return new object[] { 17, false };
        yield return new object[] { 18, true };
        yield return new object[] { 120, true };
        yield return new object[] { 121, false };
        yield return new object[] { -1, false };
    }

    [TestMethod]
    [DynamicData(nameof(UserCreationData), DynamicDataSourceType.Property)]
    public void CreateUser_WithVariousInputs(string name, string email, bool shouldSucceed)
    {
        if (shouldSucceed)
        {
            var user = _service.CreateUser(new CreateUserRequest(name, email, 25));
            Assert.IsNotNull(user);
        }
        else
        {
            Assert.ThrowsException<ArgumentException>(
                () => _service.CreateUser(new CreateUserRequest(name, email, 25)));
        }
    }

    public static IEnumerable<object[]> UserCreationData => new[]
    {
        new object[] { "Alice", "alice@example.com", true },
        new object[] { "", "empty@test.com", false },
        new object[] { "Bob", "", false },
    };
}
```

## Mocking with Moq

```csharp
[TestClass]
public class UserServiceMockTests
{
    private Mock<IUserRepository> _mockRepository = null!;
    private Mock<IEmailService> _mockEmailService = null!;
    private UserService _userService = null!;

    [TestInitialize]
    public void SetUp()
    {
        _mockRepository = new Mock<IUserRepository>();
        _mockEmailService = new Mock<IEmailService>();
        _userService = new UserService(_mockRepository.Object, _mockEmailService.Object);
    }

    [TestMethod]
    public void GetUser_ById_QueriesRepository()
    {
        var expectedUser = new User { Id = 1, Name = "Alice", Email = "alice@example.com" };
        _mockRepository.Setup(r => r.FindById(1)).Returns(expectedUser);

        var user = _userService.GetUser(1);

        Assert.AreEqual("Alice", user.Name);
        _mockRepository.Verify(r => r.FindById(1), Times.Once);
    }

    [TestMethod]
    public void GetUser_NotFound_ReturnsNull()
    {
        _mockRepository.Setup(r => r.FindById(999)).Returns((User?)null);

        var user = _userService.GetUser(999);

        Assert.IsNull(user);
    }

    [TestMethod]
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

    [TestMethod]
    public void CreateUser_EmailFails_DoesNotThrow()
    {
        _mockRepository
            .Setup(r => r.Save(It.IsAny<User>()))
            .Callback<User>(u => u.Id = 1);

        _mockEmailService
            .Setup(e => e.SendWelcomeEmail(It.IsAny<string>()))
            .Throws(new InvalidOperationException("SMTP error"));

        var user = _userService.CreateUser(
            new CreateUserRequest("Bob", "bob@example.com", 25));

        Assert.IsNotNull(user);
    }
}
```

## Lifecycle Management

```csharp
[TestClass]
public class LifecycleExampleTests
{
    private static DatabaseConnection _connection = null!;

    [AssemblyInitialize]
    public static void AssemblyInit(TestContext context)
    {
        // Runs once before ALL tests in the assembly
    }

    [AssemblyCleanup]
    public static void AssemblyCleanup()
    {
        // Runs once after ALL tests in the assembly
    }

    [ClassInitialize]
    public static void ClassInit(TestContext context)
    {
        // Runs once before all tests in THIS class
        _connection = new DatabaseConnection("sqlite::memory:");
    }

    [ClassCleanup]
    public static void ClassCleanup()
    {
        // Runs once after all tests in THIS class
        _connection?.Dispose();
    }

    [TestInitialize]
    public void TestInit()
    {
        // Runs before EACH test
        _connection.BeginTransaction();
    }

    [TestCleanup]
    public void TestClean()
    {
        // Runs after EACH test
        _connection.RollbackTransaction();
    }

    [TestMethod]
    public void InsertUser_PersistsToDatabase()
    {
        _connection.Execute("INSERT INTO Users (Name) VALUES ('Alice')");

        var result = _connection.QuerySingle("SELECT Name FROM Users");
        Assert.AreEqual("Alice", result);
    }
}
```

## Testing Async Methods

```csharp
[TestClass]
public class AsyncServiceTests
{
    [TestMethod]
    public async Task FetchData_ReturnsResults()
    {
        var mockClient = new Mock<IHttpClient>();
        mockClient
            .Setup(c => c.GetAsync("/api/items"))
            .ReturnsAsync(new ApiResponse { Items = new[] { 1, 2, 3 } });

        var service = new DataService(mockClient.Object);

        var result = await service.FetchDataAsync();

        Assert.AreEqual(3, result.Items.Length);
    }

    [TestMethod]
    public async Task FetchData_OnFailure_ThrowsServiceException()
    {
        var mockClient = new Mock<IHttpClient>();
        mockClient
            .Setup(c => c.GetAsync(It.IsAny<string>()))
            .ThrowsAsync(new HttpRequestException("Connection refused"));

        var service = new DataService(mockClient.Object);

        await Assert.ThrowsExceptionAsync<ServiceException>(
            () => service.FetchDataAsync());
    }
}
```

## Best Practices

1. **Use `Assert.ThrowsException` over `[ExpectedException]`** -- The method-based approach is more precise and allows verifying the exception message.
2. **Use `[DataRow]` for inline test data** -- Parameterize tests with `[DataRow]` attributes for clean, readable data-driven tests.
3. **Use `[DynamicData]` for complex test data** -- When test data includes objects or computed values, use `[DynamicData]` with methods or properties.
4. **Follow naming convention** -- Name tests as `MethodName_Scenario_ExpectedResult` for self-documenting test output.
5. **Use Moq for dependency mocking** -- Mock interfaces with Moq and verify interactions with `.Verify()` for clean isolation.
6. **Prefer constructor injection** -- Design production classes to accept dependencies via constructor for straightforward testing.
7. **Use `[TestCategory]` for classification** -- Tag tests as "Unit", "Integration", or "Slow" for selective execution in CI/CD.
8. **Test async methods with async/await** -- Use `async Task` test methods to properly test asynchronous code without blocking.
9. **Use FluentAssertions for readable assertions** -- The FluentAssertions library provides more expressive and detailed failure messages.
10. **Keep tests fast and independent** -- Unit tests should complete in milliseconds with no shared mutable state between methods.

## Anti-Patterns

1. **Using `[ExpectedException]` for precise testing** -- It only checks the exception type, not the message or where it was thrown; use `Assert.ThrowsException` instead.
2. **Not using `[TestInitialize]`** -- Duplicating setup code across test methods is verbose, fragile, and error-prone.
3. **Testing private methods via reflection** -- Using `PrivateObject` or reflection couples tests to implementation; test through public API.
4. **Over-mocking** -- Mocking every dependency including simple DTOs reduces test confidence; mock only I/O boundaries.
5. **Shared mutable static state** -- Static fields modified by tests cause order-dependent failures; reset state in `[TestInitialize]`.
6. **Not cleaning up resources** -- Forgetting `[TestCleanup]` for disposable resources causes leaks and flaky tests.
7. **Hardcoding connection strings** -- Using hardcoded values breaks tests in different environments; use configuration or in-memory alternatives.
8. **Ignoring collection assertions** -- Using `Assert.AreEqual` on collections instead of `CollectionAssert` methods gives poor failure messages.
9. **Multiple unrelated assertions** -- Combining unrelated checks in one test makes failures ambiguous; split into focused methods.
10. **Not using `async Task` for async tests** -- Using `async void` tests can cause test runner issues and swallow exceptions silently.
