import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Go — Database Testing Guide 2026',
  description:
    'Master Testcontainers for Go database testing. Real integration tests with PostgreSQL, MySQL, Redis, MongoDB, and CI/CD patterns.',
  date: '2026-05-06',
  category: 'Guide',
  content: `
# Testcontainers Go Database Testing Guide

Go has become the dominant language for cloud infrastructure, microservices, and high-throughput backends. Yet testing Go code that depends on databases has lagged behind languages like Java because the Go standard library does not bundle a testing-database tool, and third-party in-memory mocks like sqlmock cover only basic CRUD without faithful SQL behavior. Testcontainers-go fixes this by providing programmatically managed Docker containers for PostgreSQL, MySQL, Redis, MongoDB, and dozens of other databases — all driven from Go test code with one-line setup.

This guide is a hands-on walkthrough of Testcontainers-go for database integration testing in 2026. We cover the official testcontainers-go library, modules for PostgreSQL, MySQL, Redis, and MongoDB, the database/sql driver pattern, sqlx, GORM, sqlc, container reuse for fast local dev, and CI/CD configuration. Every code sample is working Go using \`testing\` package and the testcontainers-go modules.

---

## Key Takeaways

- **testcontainers-go** is the official Go SDK for Testcontainers with full module support
- **postgres.RunContainer** is the one-line module for PostgreSQL setup
- **mysql.RunContainer**, **redis.RunContainer**, **mongodb.RunContainer** follow the same pattern
- **t.Cleanup** is the idiomatic way to ensure containers stop after each test
- **sqlc** and **GORM** integrations work seamlessly via the same JDBC URL pattern
- **Container reuse** is supported via the Reuse option

---

## Why Testcontainers for Go

Go's sql.DB interface lets tests pretend they're working with any database, but in practice:
- **sqlmock** verifies queries match patterns, but doesn't actually execute SQL
- **In-memory SQLite** lacks Postgres features (JSONB, arrays, generated columns)
- **Shared dev databases** are flaky and slow

Testcontainers-go gives every test a fresh, real database with one-line setup.

---

## Installation

\`\`\`bash
go get github.com/testcontainers/testcontainers-go
go get github.com/testcontainers/testcontainers-go/modules/postgres
go get github.com/jackc/pgx/v5
\`\`\`

For other databases:

\`\`\`bash
go get github.com/testcontainers/testcontainers-go/modules/mysql
go get github.com/testcontainers/testcontainers-go/modules/redis
go get github.com/testcontainers/testcontainers-go/modules/mongodb
\`\`\`

Verify Docker:

\`\`\`bash
docker info
\`\`\`

---

## PostgreSQL Pattern

\`\`\`go
package mypackage_test

import (
    "context"
    "database/sql"
    "testing"
    "time"

    _ "github.com/jackc/pgx/v5/stdlib"
    "github.com/stretchr/testify/require"
    "github.com/testcontainers/testcontainers-go/modules/postgres"
    "github.com/testcontainers/testcontainers-go/wait"
)

func TestPostgresIntegration(t *testing.T) {
    ctx := context.Background()

    pgContainer, err := postgres.Run(ctx,
        "postgres:16-alpine",
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("test"),
        postgres.WithPassword("test"),
        postgres.WithInitScripts("./testdata/init.sql"),
        postgres.BasicWaitStrategies(),
        postgres.WithSQLDriver("pgx"),
    )
    require.NoError(t, err)
    t.Cleanup(func() {
        _ = pgContainer.Terminate(ctx)
    })

    connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
    require.NoError(t, err)

    db, err := sql.Open("pgx", connStr)
    require.NoError(t, err)
    defer db.Close()

    db.SetConnMaxLifetime(30 * time.Second)

    var sum int
    err = db.QueryRow("SELECT 1 + 1").Scan(&sum)
    require.NoError(t, err)
    require.Equal(t, 2, sum)
}
\`\`\`

The \`postgres.Run\` function takes options. \`t.Cleanup\` guarantees the container stops when the test ends, even on failure.

---

## MySQL Pattern

\`\`\`go
import (
    "database/sql"
    _ "github.com/go-sql-driver/mysql"
    "github.com/testcontainers/testcontainers-go/modules/mysql"
)

func TestMySQLIntegration(t *testing.T) {
    ctx := context.Background()

    mysqlContainer, err := mysql.Run(ctx,
        "mysql:8.4",
        mysql.WithDatabase("test"),
        mysql.WithUsername("root"),
        mysql.WithPassword("password"),
    )
    require.NoError(t, err)
    t.Cleanup(func() { _ = mysqlContainer.Terminate(ctx) })

    connStr, err := mysqlContainer.ConnectionString(ctx, "tls=false")
    require.NoError(t, err)

    db, err := sql.Open("mysql", connStr)
    require.NoError(t, err)
    defer db.Close()

    _, err = db.Exec("CREATE TABLE users (id INT, email VARCHAR(255))")
    require.NoError(t, err)
}
\`\`\`

---

## Redis Pattern

\`\`\`go
import (
    "github.com/redis/go-redis/v9"
    "github.com/testcontainers/testcontainers-go/modules/redis"
)

func TestRedisIntegration(t *testing.T) {
    ctx := context.Background()

    redisContainer, err := redis.Run(ctx, "redis:7.4-alpine")
    require.NoError(t, err)
    t.Cleanup(func() { _ = redisContainer.Terminate(ctx) })

    connStr, err := redisContainer.ConnectionString(ctx)
    require.NoError(t, err)

    opts, err := redis.ParseURL(connStr)
    require.NoError(t, err)

    client := goredis.NewClient(opts)
    defer client.Close()

    err = client.Set(ctx, "key", "value", 0).Err()
    require.NoError(t, err)

    val, err := client.Get(ctx, "key").Result()
    require.NoError(t, err)
    require.Equal(t, "value", val)
}
\`\`\`

---

## MongoDB Pattern

\`\`\`go
import (
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
    "github.com/testcontainers/testcontainers-go/modules/mongodb"
)

func TestMongoIntegration(t *testing.T) {
    ctx := context.Background()

    mongoContainer, err := mongodb.Run(ctx, "mongo:7.0")
    require.NoError(t, err)
    t.Cleanup(func() { _ = mongoContainer.Terminate(ctx) })

    uri, err := mongoContainer.ConnectionString(ctx)
    require.NoError(t, err)

    client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
    require.NoError(t, err)
    defer client.Disconnect(ctx)

    coll := client.Database("test").Collection("users")
    _, err = coll.InsertOne(ctx, bson.M{"name": "alice"})
    require.NoError(t, err)
}
\`\`\`

---

## Shared Container Pattern with TestMain

For multiple tests sharing a single container:

\`\`\`go
var testDB *sql.DB

func TestMain(m *testing.M) {
    ctx := context.Background()

    container, err := postgres.Run(ctx, "postgres:16-alpine",
        postgres.WithDatabase("test"),
        postgres.WithUsername("test"),
        postgres.WithPassword("test"),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer container.Terminate(ctx)

    connStr, _ := container.ConnectionString(ctx, "sslmode=disable")
    testDB, _ = sql.Open("pgx", connStr)
    defer testDB.Close()

    // Run migrations
    runMigrations(testDB)

    os.Exit(m.Run())
}

func TestUserService(t *testing.T) {
    // testDB is available
    _, err := testDB.Exec("INSERT INTO users (email) VALUES ($1)", "a@b.com")
    require.NoError(t, err)
}
\`\`\`

---

## sqlx Integration

\`\`\`go
import "github.com/jmoiron/sqlx"

db, err := sqlx.Connect("pgx", connStr)
require.NoError(t, err)
defer db.Close()

type User struct {
    ID    int    \`db:"id"\`
    Email string \`db:"email"\`
}

var users []User
err = db.Select(&users, "SELECT id, email FROM users")
\`\`\`

---

## GORM Integration

\`\`\`go
import (
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

gormDB, err := gorm.Open(postgres.Open(connStr), &gorm.Config{})
require.NoError(t, err)

type User struct {
    gorm.Model
    Email string \`gorm:"uniqueIndex"\`
}

err = gormDB.AutoMigrate(&User{})
require.NoError(t, err)
\`\`\`

---

## sqlc Integration

sqlc generates type-safe Go code from SQL. Test the generated queries against a real Postgres:

\`\`\`go
import "myapp/internal/db"

func TestQueries(t *testing.T) {
    ctx := context.Background()
    container, _ := postgres.Run(ctx, "postgres:16-alpine")
    t.Cleanup(func() { _ = container.Terminate(ctx) })

    connStr, _ := container.ConnectionString(ctx, "sslmode=disable")
    pool, _ := pgxpool.New(ctx, connStr)
    defer pool.Close()

    queries := db.New(pool)
    user, err := queries.CreateUser(ctx, "alice@example.com")
    require.NoError(t, err)
    require.NotEmpty(t, user.ID)
}
\`\`\`

---

## Per-Test Isolation

Three patterns:

| Pattern | Speed | Use |
|---|---|---|
| Container per test | Slow | Maximum isolation |
| Transaction rollback | Fast | Most cases |
| Per-suite container + TRUNCATE | Medium | Default choice |

Transaction rollback:

\`\`\`go
func TestSomething(t *testing.T) {
    tx, err := testDB.BeginTx(ctx, nil)
    require.NoError(t, err)
    t.Cleanup(func() { tx.Rollback() })

    // Run test using tx
}
\`\`\`

---

## Container Reuse

\`\`\`go
import "github.com/testcontainers/testcontainers-go"

req := testcontainers.GenericContainerRequest{
    ContainerRequest: testcontainers.ContainerRequest{
        Image: "postgres:16-alpine",
        // ...
    },
    Reuse: true,
}
\`\`\`

For modules, you can pass \`testcontainers.CustomizeRequest\` with Reuse set.

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
      - uses: actions/setup-go@v5
        with:
          go-version: '1.23'
      - uses: actions/cache@v4
        with:
          path: ~/go/pkg/mod
          key: \${{ runner.os }}-go-\${{ hashFiles('**/go.sum') }}
      - run: go test -v ./...
\`\`\`

---

## Common Pitfalls

**Forgetting t.Cleanup.** Without it, containers leak between failed tests.

**Context lifetime.** Containers can outlive a test's context. Always use \`context.Background()\` for container setup, not the test's own context.

**Connection pool sizing.** SQL drivers default to 10+ connections. With parallel tests, you exhaust Postgres's 100 connection limit. Set \`db.SetMaxOpenConns(5)\`.

**Wait strategy.** Some modules need explicit \`WithWaitStrategy(wait.ForLog("ready")...)\` to avoid race conditions on slow systems.

---

## Conclusion

Testcontainers-go brings the same real-database integration testing experience to Go that Java teams have enjoyed for years. PostgreSQL, MySQL, Redis, MongoDB — all one line of code, full lifecycle management, and idiomatic \`t.Cleanup\` integration. Container reuse keeps local iteration fast, and CI requires zero configuration.

Browse the [QA skills directory](/skills) for related Go testing patterns, or read our [PostgreSQL Node guide](/blog/testcontainers-postgresql-node-complete-guide) for cross-language comparison.
`,
};
