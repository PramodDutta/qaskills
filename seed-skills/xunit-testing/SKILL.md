---
name: "xUnit.net Testing"
description: "Comprehensive xUnit.net testing skill for writing reliable unit, integration, and acceptance tests in C# with [Fact], [Theory], fixtures, dependency injection, and parallel execution strategies."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [xunit, dotnet, csharp, unit-testing, theory, fact, fixtures, tdd]
testingTypes: [unit, integration, acceptance]
frameworks: [xunit]
languages: [csharp]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# xUnit.net Testing

You are an expert QA engineer specializing in xUnit.net for C# and .NET applications. When the user asks you to write, review, debug, or set up xUnit.net tests, follow these detailed instructions. You understand the xUnit ecosystem deeply including [Fact]/[Theory] attributes, class fixtures, collection fixtures, dependency injection, parallel execution, and integration with ASP.NET Core test infrastructure.

## Core Principles

1. **Convention Over Configuration** — xUnit uses constructor injection and IDisposable for setup/teardown instead of attributes. Embrace this pattern for cleaner, more predictable test lifecycle management.
2. **Test Isolation** — Each test class instance is created fresh for every test method. Design tests to be independent, with no shared mutable state between test methods.
3. **Parameterized Testing** — Use `[Theory]` with `[InlineData]`, `[MemberData]`, or `[ClassData]` for data-driven tests instead of duplicating `[Fact]` methods with slight variations.
4. **Meaningful Assertions** — Use xUnit's built-in assertions (`Assert.Equal`, `Assert.Throws`, `Assert.Collection`) or FluentAssertions for expressive, readable test verification.
5. **Parallel by Default** — xUnit runs test collections in parallel. Design tests accordingly and use `[Collection]` attributes to control parallelism when tests share resources.
6. **Arrange-Act-Assert** — Structure every test with clear Arrange (setup), Act (execute), and Assert (verify) sections. Keep each section focused and minimal.
7. **Test Naming** — Use descriptive method names that describe the scenario and expected outcome: `MethodName_Scenario_ExpectedBehavior`.

## Project Structure

```
ProjectName.Tests/
├── ProjectName.Tests.csproj
├── GlobalUsings.cs
├── Unit/
│   ├── Services/
│   │   ├── UserServiceTests.cs
│   │   ├── OrderServiceTests.cs
│   │   └── PaymentServiceTests.cs
│   ├── Models/
│   │   ├── UserTests.cs
│   │   └── OrderTests.cs
│   └── Validators/
│       └── UserValidatorTests.cs
├── Integration/
│   ├── Api/
│   │   ├── UsersControllerTests.cs
│   │   └── OrdersControllerTests.cs
│   ├── Database/
│   │   └── UserRepositoryTests.cs
│   └── Fixtures/
│       ├── DatabaseFixture.cs
│       ├── WebApplicationFixture.cs
│       └── TestCollectionDefinitions.cs
├── Helpers/
│   ├── TestDataBuilder.cs
│   ├── FakeUserGenerator.cs
│   └── AssertionExtensions.cs
└── xunit.runner.json
```

## Detailed Code Examples

### Basic Fact and Theory Tests

```csharp
using Xunit;

public class CalculatorTests
{
    private readonly Calculator _calculator;

    public CalculatorTests()
    {
        // Constructor acts as setup - runs before each test
        _calculator = new Calculator();
    }

    [Fact]
    public void Add_TwoPositiveNumbers_ReturnsSum()
    {
        // Arrange
        var a = 5;
        var b = 3;

        // Act
        var result = _calculator.Add(a, b);

        // Assert
        Assert.Equal(8, result);
    }

    [Fact]
    public void Divide_ByZero_ThrowsDivideByZeroException()
    {
        // Act & Assert
        var exception = Assert.Throws<DivideByZeroException>(
            () => _calculator.Divide(10, 0)
        );
        Assert.Equal("Cannot divide by zero", exception.Message);
    }

    [Theory]
    [InlineData(1, 1, 2)]
    [InlineData(-1, 1, 0)]
    [InlineData(0, 0, 0)]
    [InlineData(int.MaxValue, 0, int.MaxValue)]
    public void Add_VariousInputs_ReturnsCorrectSum(int a, int b, int expected)
    {
        var result = _calculator.Add(a, b);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("   ")]
    public void Validate_InvalidInput_ReturnsFalse(string input)
    {
        var result = _calculator.IsValidExpression(input);
        Assert.False(result);
    }
}
```

### MemberData and ClassData for Complex Scenarios

```csharp
public class UserServiceTests
{
    private readonly Mock<IUserRepository> _mockRepo;
    private readonly Mock<IEmailService> _mockEmail;
    private readonly UserService _service;

    public UserServiceTests()
    {
        _mockRepo = new Mock<IUserRepository>();
        _mockEmail = new Mock<IEmailService>();
        _service = new UserService(_mockRepo.Object, _mockEmail.Object);
    }

    public static IEnumerable<object[]> InvalidUserData =>
        new List<object[]>
        {
            new object[] { "", "valid@email.com", "Name is required" },
            new object[] { "John", "", "Email is required" },
            new object[] { "John", "invalid-email", "Email format is invalid" },
            new object[] { new string('a', 256), "valid@email.com", "Name too long" },
        };

    [Theory]
    [MemberData(nameof(InvalidUserData))]
    public async Task CreateUser_InvalidData_ReturnsValidationError(
        string name, string email, string expectedError)
    {
        // Arrange
        var request = new CreateUserRequest { Name = name, Email = email };

        // Act
        var result = await _service.CreateUser(request);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains(expectedError, result.Error);
    }

    [Fact]
    public async Task CreateUser_ValidData_SavesAndSendsWelcomeEmail()
    {
        // Arrange
        var request = new CreateUserRequest { Name = "Alice", Email = "alice@test.com" };
        _mockRepo.Setup(r => r.SaveAsync(It.IsAny<User>()))
            .ReturnsAsync(new User { Id = 1, Name = "Alice", Email = "alice@test.com" });
        _mockEmail.Setup(e => e.SendWelcomeEmail(It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _service.CreateUser(request);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("Alice", result.Value.Name);
        _mockRepo.Verify(r => r.SaveAsync(It.Is<User>(u => u.Email == "alice@test.com")), Times.Once);
        _mockEmail.Verify(e => e.SendWelcomeEmail("alice@test.com"), Times.Once);
    }
}
```

### Class Fixtures for Shared Context

```csharp
// Fixture class - created once for all tests in the class
public class DatabaseFixture : IAsyncLifetime
{
    public string ConnectionString { get; private set; }
    public AppDbContext DbContext { get; private set; }

    public async Task InitializeAsync()
    {
        // Create test database
        ConnectionString = $"Server=localhost;Database=TestDb_{Guid.NewGuid():N};Trusted_Connection=true";
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(ConnectionString)
            .Options;
        DbContext = new AppDbContext(options);
        await DbContext.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync()
    {
        await DbContext.Database.EnsureDeletedAsync();
        await DbContext.DisposeAsync();
    }
}

// Test class using the fixture
public class UserRepositoryTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _fixture;
    private readonly UserRepository _repository;

    public UserRepositoryTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
        _repository = new UserRepository(_fixture.DbContext);
    }

    [Fact]
    public async Task GetById_ExistingUser_ReturnsUser()
    {
        // Arrange
        var user = new User { Name = "Alice", Email = "alice@test.com" };
        _fixture.DbContext.Users.Add(user);
        await _fixture.DbContext.SaveChangesAsync();

        // Act
        var result = await _repository.GetByIdAsync(user.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Alice", result.Name);
    }
}
```

### Collection Fixtures for Cross-Class Sharing

```csharp
// Define the collection
[CollectionDefinition("Database")]
public class DatabaseCollection : ICollectionFixture<DatabaseFixture>
{
    // This class has no code, just the attributes
}

// First test class in the collection
[Collection("Database")]
public class UserRepositoryTests
{
    private readonly DatabaseFixture _fixture;

    public UserRepositoryTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task CreateUser_ValidData_PersistsToDatabase()
    {
        var repo = new UserRepository(_fixture.DbContext);
        var user = new User { Name = "Bob", Email = "bob@test.com" };

        await repo.CreateAsync(user);

        var saved = await _fixture.DbContext.Users.FindAsync(user.Id);
        Assert.NotNull(saved);
    }
}

// Second test class sharing the same fixture
[Collection("Database")]
public class OrderRepositoryTests
{
    private readonly DatabaseFixture _fixture;

    public OrderRepositoryTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task CreateOrder_ValidUser_PersistsOrder()
    {
        var repo = new OrderRepository(_fixture.DbContext);
        var order = new Order { UserId = 1, Total = 99.99m };

        await repo.CreateAsync(order);

        var saved = await _fixture.DbContext.Orders.FindAsync(order.Id);
        Assert.NotNull(saved);
    }
}
```

### ASP.NET Core Integration Tests

```csharp
public class WebApplicationFixture : IAsyncLifetime
{
    public HttpClient Client { get; private set; }
    private WebApplicationFactory<Program> _factory;

    public async Task InitializeAsync()
    {
        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Replace real database with in-memory
                    var descriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                    if (descriptor != null) services.Remove(descriptor);

                    services.AddDbContext<AppDbContext>(options =>
                        options.UseInMemoryDatabase("TestDb"));

                    // Seed test data
                    var sp = services.BuildServiceProvider();
                    using var scope = sp.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    db.Database.EnsureCreated();
                    SeedTestData(db);
                });
            });

        Client = _factory.CreateClient();
        await Task.CompletedTask;
    }

    private static void SeedTestData(AppDbContext db)
    {
        db.Users.Add(new User { Id = 1, Name = "TestUser", Email = "test@example.com" });
        db.SaveChanges();
    }

    public async Task DisposeAsync()
    {
        Client?.Dispose();
        await _factory.DisposeAsync();
    }
}

public class UsersControllerTests : IClassFixture<WebApplicationFixture>
{
    private readonly HttpClient _client;

    public UsersControllerTests(WebApplicationFixture fixture)
    {
        _client = fixture.Client;
    }

    [Fact]
    public async Task GetUsers_ReturnsOkWithUserList()
    {
        var response = await _client.GetAsync("/api/users");

        response.EnsureSuccessStatusCode();
        var users = await response.Content.ReadFromJsonAsync<List<UserDto>>();
        Assert.NotEmpty(users);
    }

    [Fact]
    public async Task CreateUser_ValidPayload_ReturnsCreated()
    {
        var payload = new { Name = "NewUser", Email = "new@example.com" };
        var response = await _client.PostAsJsonAsync("/api/users", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.Equal("NewUser", created.Name);
    }

    [Fact]
    public async Task CreateUser_DuplicateEmail_ReturnsConflict()
    {
        var payload = new { Name = "Duplicate", Email = "test@example.com" };
        var response = await _client.PostAsJsonAsync("/api/users", payload);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }
}
```

### Custom Assertions and Test Helpers

```csharp
public static class AssertionExtensions
{
    public static void ShouldBeValidEmail(string email)
    {
        Assert.Matches(@"^[\w\.-]+@[\w\.-]+\.\w+$", email);
    }

    public static void ShouldBeWithinRange(decimal value, decimal min, decimal max)
    {
        Assert.InRange(value, min, max);
    }

    public static async Task ShouldComplete<T>(Task<T> task, int timeoutMs = 5000)
    {
        var completed = await Task.WhenAny(task, Task.Delay(timeoutMs));
        Assert.Equal(task, completed);
    }
}

// Test Data Builder Pattern
public class UserBuilder
{
    private string _name = "Default User";
    private string _email = "default@test.com";
    private string _role = "User";

    public UserBuilder WithName(string name) { _name = name; return this; }
    public UserBuilder WithEmail(string email) { _email = email; return this; }
    public UserBuilder WithRole(string role) { _role = role; return this; }
    public UserBuilder AsAdmin() { _role = "Admin"; return this; }

    public User Build() => new User { Name = _name, Email = _email, Role = _role };
}
```

### Parallel Execution Configuration

```json
// xunit.runner.json
{
  "$schema": "https://xunit.net/schema/current/xunit.runner.schema.json",
  "parallelizeAssembly": true,
  "parallelizeTestCollections": true,
  "maxParallelThreads": 0,
  "diagnosticMessages": false,
  "methodDisplay": "classAndMethod",
  "internalDiagnosticMessages": false
}
```

### CI/CD Integration (GitHub Actions)

```yaml
name: .NET Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'
      - run: dotnet restore
      - run: dotnet build --no-restore
      - run: dotnet test --no-build --verbosity normal --logger "trx;LogFileName=results.trx"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: '**/*.trx'
```

## Best Practices

1. **Use [Theory] for data-driven tests** to avoid duplicating test logic across multiple [Fact] methods with similar patterns.
2. **Prefer constructor/IDisposable over attributes** for setup and teardown. xUnit creates a new instance per test, making constructors the natural setup mechanism.
3. **Use IAsyncLifetime for async setup** when test fixtures need asynchronous initialization (database connections, HTTP clients).
4. **Organize tests by feature, not by class** — Mirror the source project structure in your test project for easy navigation.
5. **Use IClassFixture for expensive shared resources** (database connections, HTTP servers) that should be created once per test class.
6. **Use ICollectionFixture for cross-class sharing** when multiple test classes need the same expensive resource.
7. **Configure parallelism intentionally** — Let unrelated tests run in parallel, but group database-dependent tests into collections.
8. **Use FluentAssertions or custom assertion helpers** to make test failures more descriptive and readable.
9. **Follow the Arrange-Act-Assert pattern** strictly. Use blank lines to visually separate the three sections.
10. **Mock external dependencies** using Moq or NSubstitute. Never let unit tests make real HTTP calls or database queries.

## Anti-Patterns to Avoid

1. **Avoid shared mutable state** between tests. xUnit creates new instances, but static fields persist. Never use `static` mutable fields in test classes.
2. **Avoid [Fact] for parameterized tests** — Duplicate test methods with different inputs should be refactored to [Theory] with [InlineData].
3. **Avoid catching exceptions manually** — Use `Assert.Throws<T>()` or `Assert.ThrowsAsync<T>()` instead of try-catch blocks.
4. **Avoid complex test setup** — If a test requires more than 10 lines of arrangement, extract setup into builder methods or fixtures.
5. **Avoid testing private methods directly** — Test public API behavior. If private methods need testing, the class likely violates SRP.
6. **Avoid multiple assertions without clear purpose** — Each test should verify one logical concept. Use `Assert.Multiple()` in xUnit v3 for grouped assertions.
7. **Avoid ignoring test output** — Use `ITestOutputHelper` for diagnostic logging instead of `Console.WriteLine`, which xUnit does not capture.
8. **Avoid hardcoded connection strings** — Use environment variables or configuration files for test infrastructure settings.
9. **Avoid skipping tests without explanation** — `[Fact(Skip = "reason")]` must always include a meaningful reason and a tracking issue.
10. **Avoid test logic (if/else, loops)** — Tests should be linear and predictable. Use [Theory] with different data sets instead of branching logic in tests.
