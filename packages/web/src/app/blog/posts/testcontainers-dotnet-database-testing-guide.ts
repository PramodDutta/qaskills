import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers .NET — Database Testing Guide 2026',
  description:
    'Master Testcontainers for .NET database testing. Real integration tests with PostgreSQL, SQL Server, Redis, and CI/CD patterns in xUnit and NUnit.',
  date: '2026-05-07',
  category: 'Guide',
  content: `
# Testcontainers .NET Database Testing Guide

.NET has long suffered from poor integration testing options. LocalDB requires Windows, the SQL Server Docker image is heavy, and EF Core's InMemory provider famously diverges from real SQL Server behavior. Testcontainers for .NET solves this by providing programmatically managed Docker containers for SQL Server, PostgreSQL, Redis, MongoDB, and dozens of other services — driven from C# test code with one-line setup. The library works on Windows, Linux, and macOS, integrates cleanly with xUnit, NUnit, and MSTest, and supports both .NET Framework 4.6.2+ and .NET 6/7/8/9.

This guide is a hands-on walkthrough of Testcontainers for .NET in 2026. We cover the official Testcontainers NuGet packages, modules for SQL Server, PostgreSQL, Redis, and MongoDB, integration with EF Core, Dapper, ASP.NET Core integration tests via WebApplicationFactory, container reuse, and CI/CD configuration. Every code sample is working C# with xUnit and Testcontainers 3.x.

---

## Key Takeaways

- **Testcontainers.MsSql / Testcontainers.PostgreSql** are the official module packages
- **IAsyncLifetime** is the xUnit pattern for async container lifecycle
- **EF Core** integrates via connection string substitution in DbContext setup
- **WebApplicationFactory** combines with Testcontainers for full ASP.NET Core integration tests
- **Container reuse** is supported and dramatically speeds up local iteration
- **CI/CD setup is trivial** because Docker is available on GitHub Actions ubuntu runners

---

## Installation

\`\`\`bash
dotnet add package Testcontainers.MsSql
dotnet add package Testcontainers.PostgreSql
dotnet add package Testcontainers.Redis
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package xunit
dotnet add package xunit.runner.visualstudio
\`\`\`

Verify Docker:

\`\`\`bash
docker info
\`\`\`

---

## SQL Server Pattern with xUnit

\`\`\`csharp
using Testcontainers.MsSql;
using Microsoft.Data.SqlClient;
using Xunit;

public class SqlServerIntegrationTests : IAsyncLifetime
{
    private MsSqlContainer _container = null!;

    public async Task InitializeAsync()
    {
        _container = new MsSqlBuilder()
            .WithImage("mcr.microsoft.com/mssql/server:2022-latest")
            .WithPassword("YourStrong!Passw0rd")
            .Build();
        await _container.StartAsync();
    }

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();

    [Fact]
    public async Task CanQuerySqlServer()
    {
        await using var conn = new SqlConnection(_container.GetConnectionString());
        await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT 1 + 1 AS sum";
        var sum = (int)await cmd.ExecuteScalarAsync();

        Assert.Equal(2, sum);
    }
}
\`\`\`

\`IAsyncLifetime\` is xUnit's pattern for async setup/teardown. \`InitializeAsync\` runs before tests, \`DisposeAsync\` after.

---

## PostgreSQL Pattern

\`\`\`csharp
using Testcontainers.PostgreSql;
using Npgsql;

public class PostgresIntegrationTests : IAsyncLifetime
{
    private PostgreSqlContainer _container = null!;

    public async Task InitializeAsync()
    {
        _container = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("testdb")
            .WithUsername("test")
            .WithPassword("test")
            .Build();
        await _container.StartAsync();
    }

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();

    [Fact]
    public async Task CanInsertAndQuery()
    {
        await using var conn = new NpgsqlConnection(_container.GetConnectionString());
        await conn.OpenAsync();

        await using (var cmd = new NpgsqlCommand(
            "CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT)", conn))
        {
            await cmd.ExecuteNonQueryAsync();
        }

        await using (var cmd = new NpgsqlCommand(
            "INSERT INTO users (email) VALUES (@e)", conn))
        {
            cmd.Parameters.AddWithValue("e", "alice@example.com");
            await cmd.ExecuteNonQueryAsync();
        }

        await using var query = new NpgsqlCommand("SELECT COUNT(*) FROM users", conn);
        var count = (long)await query.ExecuteScalarAsync();
        Assert.Equal(1, count);
    }
}
\`\`\`

---

## EF Core Integration

\`\`\`csharp
using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public DbSet<User> Users => Set<User>();
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
}

public class EfCoreTests : IAsyncLifetime
{
    private PostgreSqlContainer _container = null!;
    private AppDbContext _db = null!;

    public async Task InitializeAsync()
    {
        _container = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .Build();
        await _container.StartAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(_container.GetConnectionString())
            .Options;

        _db = new AppDbContext(options);
        await _db.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _container.DisposeAsync();
    }

    [Fact]
    public async Task SavesAndQueriesUser()
    {
        _db.Users.Add(new User { Email = "bob@example.com" });
        await _db.SaveChangesAsync();

        var found = await _db.Users.FirstOrDefaultAsync(u => u.Email == "bob@example.com");
        Assert.NotNull(found);
    }
}
\`\`\`

---

## ASP.NET Core Integration with WebApplicationFactory

For full HTTP-level integration tests:

\`\`\`csharp
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Hosting;

public class IntegrationTestFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll(typeof(DbContextOptions<AppDbContext>));
            services.AddDbContext<AppDbContext>(opt =>
                opt.UseNpgsql(_container.GetConnectionString()));
        });
    }

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
    }

    public new async Task DisposeAsync()
    {
        await _container.DisposeAsync();
    }
}

public class UserApiTests : IClassFixture<IntegrationTestFactory>
{
    private readonly HttpClient _client;

    public UserApiTests(IntegrationTestFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetUsersReturnsEmpty()
    {
        var response = await _client.GetAsync("/api/users");
        response.EnsureSuccessStatusCode();
    }
}
\`\`\`

---

## Container Builder API

| Method | Purpose |
|---|---|
| \`new PostgreSqlBuilder()\` | Start building |
| \`.WithImage(image)\` | Image tag |
| \`.WithDatabase(name)\` | DB name |
| \`.WithUsername(name)\` | Username |
| \`.WithPassword(pwd)\` | Password |
| \`.WithEnvironment(key, val)\` | Env var |
| \`.WithReuse(true)\` | Reuse container |
| \`.WithBindMount(...)\` | Bind mount file |
| \`.Build()\` | Returns container instance |

After build and start:

| Method | Returns |
|---|---|
| \`GetConnectionString()\` | Full connection string |
| \`Hostname\` | Hostname |
| \`GetMappedPublicPort(port)\` | Mapped port |

---

## NUnit Variant

NUnit's lifecycle is slightly different:

\`\`\`csharp
[TestFixture]
public class NunitTests
{
    private PostgreSqlContainer _container = null!;

    [OneTimeSetUp]
    public async Task SetUp()
    {
        _container = new PostgreSqlBuilder().Build();
        await _container.StartAsync();
    }

    [OneTimeTearDown]
    public async Task TearDown()
    {
        await _container.DisposeAsync();
    }
}
\`\`\`

---

## Redis Pattern

\`\`\`csharp
using Testcontainers.Redis;
using StackExchange.Redis;

public class RedisTests : IAsyncLifetime
{
    private RedisContainer _container = null!;
    private ConnectionMultiplexer _multiplexer = null!;

    public async Task InitializeAsync()
    {
        _container = new RedisBuilder().WithImage("redis:7.4-alpine").Build();
        await _container.StartAsync();
        _multiplexer = ConnectionMultiplexer.Connect(_container.GetConnectionString());
    }

    public async Task DisposeAsync()
    {
        _multiplexer.Dispose();
        await _container.DisposeAsync();
    }

    [Fact]
    public async Task SetAndGetWorks()
    {
        var db = _multiplexer.GetDatabase();
        await db.StringSetAsync("key", "value");
        var value = await db.StringGetAsync("key");
        Assert.Equal("value", (string)value);
    }
}
\`\`\`

---

## Shared Fixture for Multiple Tests

xUnit's \`ICollectionFixture\` lets multiple test classes share one container:

\`\`\`csharp
[CollectionDefinition("Database")]
public class DatabaseCollection : ICollectionFixture<DatabaseFixture> { }

public class DatabaseFixture : IAsyncLifetime
{
    public PostgreSqlContainer Container { get; }

    public DatabaseFixture()
    {
        Container = new PostgreSqlBuilder().Build();
    }

    public Task InitializeAsync() => Container.StartAsync();
    public Task DisposeAsync() => Container.DisposeAsync().AsTask();
}

[Collection("Database")]
public class UserTests
{
    private readonly DatabaseFixture _fixture;
    public UserTests(DatabaseFixture f) { _fixture = f; }
}
\`\`\`

---

## Container Reuse

\`\`\`csharp
_container = new PostgreSqlBuilder()
    .WithImage("postgres:16-alpine")
    .WithReuse(true)
    .Build();
\`\`\`

Enable in \`~/.testcontainers.properties\`:

\`\`\`
testcontainers.reuse.enable=true
\`\`\`

---

## CI/CD Configuration

\`\`\`yaml
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '9.0'
      - run: dotnet restore
      - run: dotnet test
\`\`\`

---

## Common Pitfalls

**EF Core MigrateAsync race.** If multiple tests in parallel call MigrateAsync against the same container, you'll get migration conflicts. Use a shared fixture instead.

**SQL Server licensing.** mcr.microsoft.com/mssql/server uses the Developer edition which is free for non-production. Don't use in CI for paying customers' staging environments.

**Connection string parsing in Npgsql.** Use \`GetConnectionString()\` directly; don't try to parse it yourself.

**Slow first run.** SQL Server image is 1.5 GB. Cache aggressively in CI.

---

## Conclusion

Testcontainers for .NET is the modern default for integration testing in 2026. SQL Server, PostgreSQL, Redis, MongoDB — all wrapped in idiomatic IAsyncLifetime fixtures, with first-class EF Core and WebApplicationFactory integration. Container reuse keeps local iteration fast, and CI requires no configuration.

Browse the [QA skills directory](/skills) for related .NET testing patterns, or read our [PostgreSQL Node guide](/blog/testcontainers-postgresql-node-complete-guide) for cross-language comparison.
`,
};
