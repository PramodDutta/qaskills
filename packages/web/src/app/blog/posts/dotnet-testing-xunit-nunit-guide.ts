import type { BlogPost } from './index';

export const post: BlogPost = {
  title: '.NET Testing with xUnit and NUnit: Complete C# Guide',
  description:
    'Complete guide to .NET testing with xUnit and NUnit in C#. Covers test attributes, assertions, Moq mocking, FluentAssertions, integration testing with TestServer, and CI/CD setup.',
  date: '2026-03-24',
  category: 'Tutorial',
  content: `
Testing in the .NET ecosystem has matured significantly. Two frameworks dominate: xUnit and NUnit. Both are open source, well-maintained, and deeply integrated with Visual Studio, JetBrains Rider, and the \`dotnet test\` CLI. Choosing between them depends on your team preferences and project conventions, but understanding both gives you flexibility across codebases.

This guide covers both frameworks side by side, including assertions, mocking with Moq, FluentAssertions for expressive tests, integration testing with \`WebApplicationFactory\`, and CI pipeline configuration.

## Key Takeaways

- xUnit encourages constructor injection and \`IDisposable\` for setup and teardown, while NUnit uses \`[SetUp]\` and \`[TearDown]\` attributes
- Both frameworks support parameterized tests: xUnit with \`[Theory]\` and \`[InlineData]\`, NUnit with \`[TestCase]\` and \`[TestCaseSource]\`
- Moq is the most popular .NET mocking library and works identically with both frameworks
- FluentAssertions provides a readable, chainable assertion API that replaces built-in assertions
- \`WebApplicationFactory<T>\` from \`Microsoft.AspNetCore.Mvc.Testing\` enables full integration testing of ASP.NET Core APIs
- Both frameworks integrate with \`dotnet test\` and produce standard test results for CI systems

---

## Project Setup

### Creating a Test Project

\`\`\`bash
# xUnit test project
dotnet new xunit -n MyApp.Tests.xUnit
dotnet add MyApp.Tests.xUnit reference ../MyApp/MyApp.csproj

# NUnit test project
dotnet new nunit -n MyApp.Tests.NUnit
dotnet add MyApp.Tests.NUnit reference ../MyApp/MyApp.csproj
\`\`\`

### Common NuGet Packages

\`\`\`bash
# For both frameworks
dotnet add package Moq
dotnet add package FluentAssertions

# For integration testing
dotnet add package Microsoft.AspNetCore.Mvc.Testing
\`\`\`

### Solution Structure

\`\`\`
MyApp.sln
  src/
    MyApp/
      Controllers/
      Services/
      Models/
  tests/
    MyApp.UnitTests/
    MyApp.IntegrationTests/
\`\`\`

---

## xUnit vs NUnit: Side by Side

### Test Declaration

**xUnit:**
\`\`\`csharp
public class CalculatorTests
{
    [Fact]
    public void Add_TwoPositiveNumbers_ReturnsSum()
    {
        var calculator = new Calculator();
        var result = calculator.Add(2, 3);
        Assert.Equal(5, result);
    }
}
\`\`\`

**NUnit:**
\`\`\`csharp
[TestFixture]
public class CalculatorTests
{
    [Test]
    public void Add_TwoPositiveNumbers_ReturnsSum()
    {
        var calculator = new Calculator();
        var result = calculator.Add(2, 3);
        Assert.That(result, Is.EqualTo(5));
    }
}
\`\`\`

### Setup and Teardown

**xUnit** uses the constructor and \`IDisposable\`:
\`\`\`csharp
public class UserServiceTests : IDisposable
{
    private readonly UserService _service;
    private readonly Mock<IUserRepository> _repoMock;

    public UserServiceTests()
    {
        _repoMock = new Mock<IUserRepository>();
        _service = new UserService(_repoMock.Object);
    }

    public void Dispose()
    {
        // Cleanup if needed
    }

    [Fact]
    public void GetUser_ValidId_ReturnsUser()
    {
        // Test code
    }
}
\`\`\`

**NUnit** uses attributes:
\`\`\`csharp
[TestFixture]
public class UserServiceTests
{
    private UserService _service;
    private Mock<IUserRepository> _repoMock;

    [SetUp]
    public void SetUp()
    {
        _repoMock = new Mock<IUserRepository>();
        _service = new UserService(_repoMock.Object);
    }

    [TearDown]
    public void TearDown()
    {
        // Cleanup if needed
    }

    [Test]
    public void GetUser_ValidId_ReturnsUser()
    {
        // Test code
    }
}
\`\`\`

### Parameterized Tests

**xUnit** uses \`[Theory]\` with data attributes:
\`\`\`csharp
[Theory]
[InlineData(1, 1, 2)]
[InlineData(-1, 1, 0)]
[InlineData(100, 200, 300)]
public void Add_VariousInputs_ReturnsCorrectSum(
    int a, int b, int expected)
{
    var calculator = new Calculator();
    Assert.Equal(expected, calculator.Add(a, b));
}
\`\`\`

**NUnit** uses \`[TestCase]\`:
\`\`\`csharp
[TestCase(1, 1, 2)]
[TestCase(-1, 1, 0)]
[TestCase(100, 200, 300)]
public void Add_VariousInputs_ReturnsCorrectSum(
    int a, int b, int expected)
{
    var calculator = new Calculator();
    Assert.That(calculator.Add(a, b), Is.EqualTo(expected));
}
\`\`\`

### Complex Data Sources

**xUnit** with \`[MemberData]\`:
\`\`\`csharp
public class EmailValidationTests
{
    public static IEnumerable<object[]> ValidEmails => new List<object[]>
    {
        new object[] { "user@example.com" },
        new object[] { "user+tag@example.com" },
        new object[] { "user@subdomain.example.com" },
    };

    [Theory]
    [MemberData(nameof(ValidEmails))]
    public void IsValid_ValidEmail_ReturnsTrue(string email)
    {
        var validator = new EmailValidator();
        Assert.True(validator.IsValid(email));
    }
}
\`\`\`

**NUnit** with \`[TestCaseSource]\`:
\`\`\`csharp
[TestFixture]
public class EmailValidationTests
{
    private static IEnumerable<string> ValidEmails()
    {
        yield return "user@example.com";
        yield return "user+tag@example.com";
        yield return "user@subdomain.example.com";
    }

    [TestCaseSource(nameof(ValidEmails))]
    public void IsValid_ValidEmail_ReturnsTrue(string email)
    {
        var validator = new EmailValidator();
        Assert.That(validator.IsValid(email), Is.True);
    }
}
\`\`\`

### Exception Testing

**xUnit:**
\`\`\`csharp
[Fact]
public void Divide_ByZero_ThrowsDivideByZeroException()
{
    var calculator = new Calculator();
    Assert.Throws<DivideByZeroException>(
        () => calculator.Divide(10, 0));
}
\`\`\`

**NUnit:**
\`\`\`csharp
[Test]
public void Divide_ByZero_ThrowsDivideByZeroException()
{
    var calculator = new Calculator();
    Assert.That(
        () => calculator.Divide(10, 0),
        Throws.TypeOf<DivideByZeroException>());
}
\`\`\`

---

## Mocking with Moq

Moq works identically with both xUnit and NUnit. It creates mock objects from interfaces or virtual methods.

### Basic Mocking

\`\`\`csharp
[Fact]
public async Task GetUser_ExistingId_ReturnsUser()
{
    // Arrange
    var mockRepo = new Mock<IUserRepository>();
    mockRepo.Setup(r => r.GetByIdAsync(42))
        .ReturnsAsync(new User { Id = 42, Name = "Jane" });

    var service = new UserService(mockRepo.Object);

    // Act
    var user = await service.GetUserAsync(42);

    // Assert
    Assert.NotNull(user);
    Assert.Equal("Jane", user.Name);
}
\`\`\`

### Verifying Method Calls

\`\`\`csharp
[Fact]
public async Task CreateUser_ValidInput_SavesAndSendsEmail()
{
    var mockRepo = new Mock<IUserRepository>();
    var mockMailer = new Mock<IEmailService>();

    var service = new UserService(mockRepo.Object, mockMailer.Object);
    await service.CreateUserAsync("jane@example.com", "Jane");

    mockRepo.Verify(r => r.SaveAsync(
        It.Is<User>(u => u.Email == "jane@example.com")),
        Times.Once);

    mockMailer.Verify(m => m.SendWelcomeEmailAsync(
        It.IsAny<string>()),
        Times.Once);
}
\`\`\`

### Argument Matching

\`\`\`csharp
// Exact value
mockRepo.Setup(r => r.GetByIdAsync(42));

// Any value of type
mockRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()));

// Conditional matching
mockRepo.Setup(r => r.GetByIdAsync(It.Is<int>(id => id > 0)));

// Range matching
mockRepo.Setup(r => r.GetByIdAsync(
    It.IsInRange(1, 100, Moq.Range.Inclusive)));
\`\`\`

### Sequential Returns

\`\`\`csharp
var mockCache = new Mock<ICacheService>();
mockCache.SetupSequence(c => c.GetAsync<User>("key"))
    .ReturnsAsync((User?)null)   // First call: cache miss
    .ReturnsAsync(new User());    // Second call: cache hit
\`\`\`

### Mocking Properties

\`\`\`csharp
var mockConfig = new Mock<IAppConfig>();
mockConfig.SetupGet(c => c.MaxRetries).Returns(3);
mockConfig.SetupGet(c => c.TimeoutSeconds).Returns(30);
\`\`\`

---

## FluentAssertions

FluentAssertions provides a human-readable assertion API that works with both xUnit and NUnit.

### Basic Assertions

\`\`\`csharp
using FluentAssertions;

[Fact]
public void GetUser_ExistingId_ReturnsCorrectUser()
{
    var user = service.GetUser(42);

    user.Should().NotBeNull();
    user.Name.Should().Be("Jane");
    user.Age.Should().BeGreaterThan(0);
    user.Roles.Should().Contain("admin");
    user.Email.Should().EndWith("@example.com");
}
\`\`\`

### Collection Assertions

\`\`\`csharp
var users = service.GetActiveUsers();

users.Should().HaveCount(3);
users.Should().OnlyContain(u => u.IsActive);
users.Should().BeInAscendingOrder(u => u.Name);
users.Should().ContainSingle(u => u.Role == "admin");
\`\`\`

### Object Comparison

\`\`\`csharp
var actual = service.GetUser(42);
var expected = new User
{
    Id = 42,
    Name = "Jane",
    Email = "jane@example.com"
};

actual.Should().BeEquivalentTo(expected, options =>
    options.Excluding(u => u.CreatedAt)
           .Excluding(u => u.UpdatedAt));
\`\`\`

### Exception Assertions

\`\`\`csharp
var action = () => service.DeleteUser(-1);

action.Should().Throw<ArgumentException>()
    .WithMessage("*invalid*")
    .And.ParamName.Should().Be("userId");
\`\`\`

### Async Assertions

\`\`\`csharp
var act = async () => await service.GetUserAsync(-1);

await act.Should().ThrowAsync<NotFoundException>()
    .WithMessage("User not found");
\`\`\`

---

## Integration Testing with TestServer

ASP.NET Core provides \`WebApplicationFactory<T>\` for spinning up an in-memory test server.

### Basic Setup

\`\`\`csharp
public class UsersApiTests :
    IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public UsersApiTests(
        WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetUsers_ReturnsOkWithList()
    {
        var response = await _client.GetAsync("/api/users");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var users = await response.Content
            .ReadFromJsonAsync<List<UserDto>>();
        users.Should().NotBeEmpty();
    }
}
\`\`\`

### Custom Factory with Test Database

\`\`\`csharp
public class CustomWebApplicationFactory
    : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(
        IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove the production DbContext
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType ==
                    typeof(DbContextOptions<AppDbContext>));
            if (descriptor != null)
                services.Remove(descriptor);

            // Add in-memory database
            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseInMemoryDatabase("TestDb");
            });

            // Seed test data
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider
                .GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();
            SeedTestData(db);
        });
    }

    private static void SeedTestData(AppDbContext db)
    {
        db.Users.AddRange(
            new User { Id = 1, Name = "Alice" },
            new User { Id = 2, Name = "Bob" }
        );
        db.SaveChanges();
    }
}
\`\`\`

### Testing with Authentication

\`\`\`csharp
public class AuthenticatedApiTests :
    IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AuthenticatedApiTests(
        CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CreateUser_Authenticated_Returns201()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "test-token");

        var response = await client.PostAsJsonAsync(
            "/api/users",
            new { Name = "Jane", Email = "jane@example.com" });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreateUser_NoAuth_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/users",
            new { Name = "Jane", Email = "jane@example.com" });

        response.StatusCode.Should()
            .Be(HttpStatusCode.Unauthorized);
    }
}
\`\`\`

---

## Shared Fixtures and Collection Fixtures

### xUnit Collection Fixtures

Share expensive resources across multiple test classes:

\`\`\`csharp
public class DatabaseFixture : IAsyncLifetime
{
    public AppDbContext DbContext { get; private set; }

    public async Task InitializeAsync()
    {
        DbContext = CreateTestDbContext();
        await DbContext.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await DbContext.DisposeAsync();
    }
}

[CollectionDefinition("Database")]
public class DatabaseCollection :
    ICollectionFixture<DatabaseFixture> { }

[Collection("Database")]
public class UserRepositoryTests
{
    private readonly DatabaseFixture _fixture;

    public UserRepositoryTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }
}
\`\`\`

### NUnit One-Time Setup

\`\`\`csharp
[TestFixture]
public class UserRepositoryTests
{
    private AppDbContext _dbContext;

    [OneTimeSetUp]
    public async Task OneTimeSetUp()
    {
        _dbContext = CreateTestDbContext();
        await _dbContext.Database.MigrateAsync();
    }

    [OneTimeTearDown]
    public async Task OneTimeTearDown()
    {
        await _dbContext.DisposeAsync();
    }
}
\`\`\`

---

## CI/CD Integration

### GitHub Actions

\`\`\`yaml
name: .NET Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        dotnet: ['8.0', '9.0']

    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: \\\${{ matrix.dotnet }}

      - name: Restore dependencies
        run: dotnet restore

      - name: Build
        run: dotnet build --no-restore

      - name: Test
        run: dotnet test --no-build --verbosity normal
          --collect:"XPlat Code Coverage"

      - name: Upload coverage
        uses: codecov/codecov-action@v4
\`\`\`

---

## When to Use Which Framework

**Choose xUnit when:**
- Starting a new .NET project (it is the default template in \`dotnet new\`)
- You prefer constructor-based setup over attribute-based lifecycle
- Your team values the opinionated approach of one assertion per concept
- You are working on ASP.NET Core projects (Microsoft uses xUnit internally)

**Choose NUnit when:**
- Your team is already using it and has established patterns
- You need the constraint model (\`Assert.That\` with composable constraints)
- You want built-in support for parameterized fixtures
- You prefer attribute-based lifecycle management

**In practice:** Both frameworks are excellent. The differences are stylistic. Pick one per project and be consistent.

---

## Common Pitfalls

**Async void tests.** Both frameworks require test methods returning \`Task\` for async tests. An \`async void\` test may pass even when it should fail because the exception is lost.

**Not disposing resources.** xUnit creates a new instance per test by default. If your constructor allocates resources, implement \`IDisposable\` to release them.

**Testing controllers directly.** Prefer \`WebApplicationFactory\` integration tests over instantiating controllers manually. You miss routing, middleware, model binding, and filters when testing controllers as plain classes.

**Overusing InMemoryDatabase.** The EF Core in-memory provider does not enforce constraints, relationships, or SQL-specific behavior. For critical data paths, test against a real database.

---

## Summary

The .NET testing ecosystem is robust and well-tooled. Whether you choose xUnit or NUnit, you get a mature framework with strong IDE support, parameterized testing, and seamless CI integration. Add Moq for dependency isolation, FluentAssertions for readable tests, and WebApplicationFactory for integration testing, and you have everything needed to build a comprehensive test suite for any .NET application.
`,
};
