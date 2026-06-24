import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Go Guide: Postgres Integration Testing in 2026',
  description:
    'Learn Testcontainers Go with real golang examples: spin up Postgres, Redis, and Kafka containers, wait strategies, TestMain setup, and integration tests.',
  date: '2026-06-24',
  category: 'Guide',
  content: `
# Testcontainers Go Guide: Real Integration Testing for Golang

Integration tests in Go have a reputation problem. For years the default options were unsatisfying: mock the database and risk testing a fiction, point at a shared staging Postgres and fight flaky state, or maintain a fragile \`docker-compose.yml\` that every developer had to remember to start. **Testcontainers Go** removes that tradeoff. It lets your Go test code start a real Postgres, Redis, or Kafka instance inside a throwaway Docker container, wait until it is genuinely ready to accept connections, hand your test the dynamic host and port, and tear everything down automatically when the test finishes.

The library is the official Go port of the Testcontainers project (\`github.com/testcontainers/testcontainers-go\`), maintained alongside the Java, .NET, Node, and Python implementations. Because the container is real, your queries run against the same database engine, the same SQL dialect, the same constraints, and the same migration behavior you ship to production. There is no SQLite-as-Postgres impedance mismatch, no in-memory fake that silently accepts invalid SQL, and no mock that drifts out of sync with reality.

This guide is a hands-on **testcontainers golang tutorial**. We will start from \`go get\`, build up a generic container by hand so you understand the primitives, then switch to the ergonomic modules API (\`postgres.Run\`) that most teams use in production. You will see complete, idiomatic Go: \`TestMain\` setup, table-driven tests, container reuse for speed, custom Docker networks for service-to-service testing, and full **testcontainers-go postgres integration testing** examples plus Redis and Kafka. Every snippet is runnable and uses the real public API as of the 2026 module releases. By the end you will be able to drop integration tests into any Go service with confidence that they reflect production behavior.

## Why Testcontainers Beats Mocks and Shared Databases

The core argument for Testcontainers is fidelity. A mock returns whatever you told it to return, which means it tests your assumptions, not your code. A real Postgres container rejects a duplicate primary key, enforces a foreign key, applies a \`CHECK\` constraint, and evaluates a window function exactly the way production does. When your test passes against a container, you have tested the actual integration surface.

The second argument is isolation. Each test (or each suite) gets a fresh container with a clean state. There is no leftover row from yesterday's failed run, no other developer mutating the same staging row at the same moment, and no need to write fragile teardown SQL. The container is created, used, and destroyed within the lifetime of the test process.

The third argument is reproducibility. The container image is pinned to a tag, so every developer and every CI runner gets byte-identical infrastructure. "Works on my machine" disappears because the machine is a Docker image.

| Approach | Fidelity | Isolation | CI friendliness | Setup cost |
|---|---|---|---|---|
| In-memory mock / fake | Low (tests your assumptions) | High | High | Low |
| SQLite standing in for Postgres | Medium (dialect drift) | High | High | Low |
| Shared staging database | High | Low (shared state) | Low (network, secrets) | Medium |
| docker-compose started manually | High | Medium | Medium (manual lifecycle) | Medium |
| Testcontainers Go | High | High | High (programmatic lifecycle) | Low |

The only real cost is that Docker must be available on the machine running the tests. On developer laptops that means Docker Desktop, Colima, or Rancher Desktop; in CI it means a runner with a Docker daemon, which GitHub Actions, GitLab CI, and CircleCI all provide. If you are also building out broader API and service coverage, Testcontainers slots in nicely alongside the patterns in our [API testing complete guide](/blog/api-testing-complete-guide) and the deeper [database testing automation guide](/blog/database-testing-automation-guide).

## Installing testcontainers-go

Testcontainers Go requires Go 1.22 or newer and a running Docker daemon. Add the core module and the database modules you need:

\`\`\`bash
# Core library
go get github.com/testcontainers/testcontainers-go

# Module helpers (each is a separate sub-module)
go get github.com/testcontainers/testcontainers-go/modules/postgres
go get github.com/testcontainers/testcontainers-go/modules/redis
go get github.com/testcontainers/testcontainers-go/modules/kafka

# A Postgres driver to actually run queries
go get github.com/jackc/pgx/v5
\`\`\`

Verify Docker is reachable before you run anything, then run the test suite as usual:

\`\`\`bash
docker info >/dev/null && echo "docker is up"

# Run all tests, verbose, with a generous timeout for image pulls on a cold cache
go test ./... -v -timeout 300s

# Run a single integration test
go test ./internal/store -run TestUserStore_Integration -v
\`\`\`

The first run pulls the container images and is therefore slow; subsequent runs reuse the cached images and are fast. In CI, cache the Docker layer or pre-pull images in a setup step to keep pipelines quick.

## Your First Container: the Generic Container API

Before reaching for the convenience modules, it is worth building a container by hand once. The generic \`GenericContainer\` API is the foundation every module is built on, and understanding \`ContainerRequest\` and wait strategies pays off when you containerize something that has no dedicated module.

\`\`\`go
package store

import (
	"context"
	"fmt"
	"testing"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

func TestGenericPostgres(t *testing.T) {
	ctx := context.Background()

	req := testcontainers.ContainerRequest{
		Image:        "postgres:16-alpine",
		ExposedPorts: []string{"5432/tcp"},
		Env: map[string]string{
			"POSTGRES_USER":     "test",
			"POSTGRES_PASSWORD": "test",
			"POSTGRES_DB":       "appdb",
		},
		// Postgres prints this line twice; the second time it is truly ready.
		WaitingFor: wait.ForLog("database system is ready to accept connections").
			WithOccurrence(2),
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		t.Fatalf("start container: %v", err)
	}
	// Always terminate; defer keeps the cleanup next to the creation.
	defer func() {
		if err := container.Terminate(ctx); err != nil {
			t.Logf("terminate container: %v", err)
		}
	}()

	// Resolve the dynamic host and the host-side port that maps to 5432.
	host, err := container.Host(ctx)
	if err != nil {
		t.Fatalf("host: %v", err)
	}
	mappedPort, err := container.MappedPort(ctx, "5432/tcp")
	if err != nil {
		t.Fatalf("mapped port: %v", err)
	}

	dsn := fmt.Sprintf(
		"postgres://test:test@%s:%s/appdb?sslmode=disable",
		host, mappedPort.Port(),
	)
	t.Logf("connect with: %s", dsn)
}
\`\`\`

Three things in this snippet are the heart of Testcontainers. \`ExposedPorts\` tells Docker to publish the container port; the host-side port is random to avoid collisions, which is why you must ask the container for the \`MappedPort\` rather than assuming \`5432\`. \`Host(ctx)\` returns the address to dial, which is usually \`localhost\` but can differ when Docker runs in a VM or remote daemon. And \`WaitingFor\` blocks \`GenericContainer\` from returning until the container is actually ready, so your first query never races a half-started database.

## Wait Strategies: the Most Important Concept

The single biggest source of flaky container tests is connecting before the service is ready. A container can be "running" from Docker's perspective while the database inside it is still initializing. Testcontainers solves this with explicit, composable wait strategies. Choosing the right one is the difference between a rock-solid suite and a flaky one.

| Wait strategy | Use when | Example |
|---|---|---|
| \`wait.ForListeningPort\` | Service opens a TCP port when ready | \`wait.ForListeningPort("6379/tcp")\` |
| \`wait.ForLog\` | The image logs a known "ready" line | \`wait.ForLog("ready to accept connections")\` |
| \`wait.ForHTTP\` | Service exposes an HTTP health endpoint | \`wait.ForHTTP("/health").WithPort("8080/tcp")\` |
| \`wait.ForSQL\` | You can run a probe query | \`wait.ForSQL("5432/tcp", "pgx", dsnFn)\` |
| \`wait.ForExec\` | Readiness is checked by a command in the container | \`wait.ForExec([]string{"pg_isready"})\` |
| \`wait.ForAll\` | Multiple conditions must all hold | combine port + log + HTTP |

Combine strategies when one signal is not enough. The \`postgres\` module, for example, waits for both the log line and a successful \`SELECT 1\`, because the log appears before the database is genuinely query-ready:

\`\`\`go
import (
	"time"

	"github.com/testcontainers/testcontainers-go/wait"
)

waitStrategy := wait.ForAll(
	wait.ForLog("database system is ready to accept connections").
		WithOccurrence(2).
		WithStartupTimeout(60*time.Second),
	wait.ForListeningPort("5432/tcp").
		WithStartupTimeout(60*time.Second),
)
\`\`\`

Always set a startup timeout. The default is generous, but on a cold image-pull a tight timeout will fail the first run and pass every run after, which is maddening to debug. Prefer \`wait.ForListeningPort\` or \`wait.ForSQL\` over a bare \`wait.ForLog\` whenever the service exposes a probeable signal, because log lines change between image versions and silently break your wait.

## The Modules API: postgres.Run and ConnectionString

Building containers by hand is educational, but for common services you should use the modules. They encode the correct image defaults, the correct wait strategy, and helpers like \`ConnectionString\` that save you from string-formatting DSNs. The modern entry point is \`postgres.Run\` (older code may use the now-deprecated \`postgres.RunContainer\`; the call shape is otherwise the same).

\`\`\`go
package store

import (
	"context"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

func startPostgres(ctx context.Context, t *testing.T) (*postgres.PostgresContainer, string) {
	t.Helper()

	pgContainer, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("appdb"),
		postgres.WithUsername("test"),
		postgres.WithPassword("test"),
		// Load schema and seed data before the container is marked ready.
		postgres.WithInitScripts("testdata/schema.sql", "testdata/seed.sql"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	if err != nil {
		t.Fatalf("start postgres: %v", err)
	}

	// ConnectionString builds the DSN with the dynamic host and port for you.
	dsn, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("connection string: %v", err)
	}
	return pgContainer, dsn
}
\`\`\`

\`postgres.WithInitScripts\` copies SQL files into the image's \`/docker-entrypoint-initdb.d\` directory, so your schema and seed data are applied during container startup and the database is fully populated by the time \`Run\` returns. This is the cleanest way to get a known fixture state without running migrations in your test code. If you prefer to drive migrations from Go (golang-migrate, goose, atlas), run them right after you obtain the DSN instead.

## TestMain: One Container for a Whole Package

Starting a fresh container per test is the safest pattern but also the slowest, because image startup dominates the runtime. For a package whose tests share a read-mostly schema, start one container in \`TestMain\`, run every test against it, and tear it down once. Keep tests isolated by using transactions or unique table prefixes per test.

\`\`\`go
package store

import (
	"context"
	"database/sql"
	"log"
	"os"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

var testDB *sql.DB

func TestMain(m *testing.M) {
	ctx := context.Background()

	pgContainer, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("appdb"),
		postgres.WithUsername("test"),
		postgres.WithPassword("test"),
		postgres.WithInitScripts("testdata/schema.sql"),
	)
	if err != nil {
		log.Fatalf("start postgres: %v", err)
	}

	dsn, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		log.Fatalf("connection string: %v", err)
	}

	testDB, err = sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	if err := testDB.Ping(); err != nil {
		log.Fatalf("ping db: %v", err)
	}

	// Run all tests in the package.
	code := m.Run()

	// Clean up deterministically. Do not use defer in TestMain because
	// os.Exit skips deferred calls.
	_ = testDB.Close()
	if err := pgContainer.Terminate(ctx); err != nil {
		log.Printf("terminate: %v", err)
	}

	os.Exit(code)
}
\`\`\`

Two gotchas worth memorizing. First, never \`defer\` cleanup in \`TestMain\` when you call \`os.Exit\`, because \`os.Exit\` does not run deferred functions; clean up explicitly before the exit. Second, capture \`m.Run()\`'s exit code into a variable, run cleanup, then exit with that code, so a failing test still reports failure after teardown.

## Table-Driven Integration Tests Against a Real Database

With the shared container in place, write ordinary table-driven Go tests. The pattern below wraps each case in its own transaction and rolls it back, so cases stay isolated even though they share one container. This is the workhorse pattern for **testcontainers-go postgres integration testing**.

\`\`\`go
package store

import (
	"context"
	"testing"
)

type UserStore struct{ db dbExecutor }

func (s *UserStore) Create(ctx context.Context, email string) (int64, error) {
	var id int64
	err := s.db.QueryRowContext(ctx,
		"INSERT INTO users(email) VALUES($1) RETURNING id", email,
	).Scan(&id)
	return id, err
}

func TestUserStore_Create(t *testing.T) {
	tests := []struct {
		name    string
		email   string
		wantErr bool
	}{
		{name: "valid email", email: "ada@example.com", wantErr: false},
		{name: "another valid", email: "grace@example.com", wantErr: false},
		{name: "duplicate rejected", email: "ada@example.com", wantErr: true},
		{name: "empty rejected by check", email: "", wantErr: true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()

			// Begin a transaction; rollback isolates this case from the rest.
			tx, err := testDB.BeginTx(ctx, nil)
			if err != nil {
				t.Fatalf("begin tx: %v", err)
			}
			defer tx.Rollback()

			store := &UserStore{db: tx}
			_, err = store.Create(ctx, tc.email)

			if tc.wantErr && err == nil {
				t.Fatalf("expected error for %q, got nil", tc.email)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error for %q: %v", tc.email, err)
			}
		})
	}
}
\`\`\`

The "duplicate rejected" and "empty rejected by check" cases are exactly the kind of assertion a mock cannot make for you. They exercise the real unique index and the real \`CHECK\` constraint, so you are testing the database contract, not a reimplementation of it. The transaction-per-case approach keeps the suite fast because no container restart is needed between cases, while \`defer tx.Rollback()\` guarantees a clean slate.

## Container Reuse for Faster Local Loops

When you iterate locally you often run the same test dozens of times in a minute. Recreating the container each time wastes seconds. Testcontainers supports an opt-in reuse mode that keeps a labeled container alive across runs, so the second and later runs attach to the existing one instead of starting fresh.

\`\`\`go
import (
	"context"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

func reusablePostgres(ctx context.Context) (testcontainers.Container, error) {
	req := testcontainers.ContainerRequest{
		Image:        "postgres:16-alpine",
		ExposedPorts: []string{"5432/tcp"},
		Name:         "tc-postgres-reuse", // stable name is required for reuse
		Env: map[string]string{
			"POSTGRES_USER":     "test",
			"POSTGRES_PASSWORD": "test",
			"POSTGRES_DB":       "appdb",
		},
		WaitingFor: wait.ForListeningPort("5432/tcp"),
	}

	return testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
		Reuse:            true, // attach to an existing container with this name
	})
}
\`\`\`

Reuse is a local-developer optimization, not a CI strategy. In CI you want a clean container every run for correctness, and the runner is ephemeral anyway. Locally, reuse trades a little isolation for a much tighter feedback loop. If you enable it, make sure your tests do not depend on a pristine database, or reset relevant tables at the start of the run.

## Networks: Testing Service-to-Service Communication

Real systems are not a single database. Sometimes you need two containers to talk to each other directly, for example an application container reaching a database container by hostname. Testcontainers lets you create a Docker network and attach containers to it with network aliases, so they resolve each other by name exactly as they would in production.

\`\`\`go
package store

import (
	"context"
	"testing"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/network"
	"github.com/testcontainers/testcontainers-go/wait"
)

func TestAppTalksToDB(t *testing.T) {
	ctx := context.Background()

	net, err := network.New(ctx)
	if err != nil {
		t.Fatalf("create network: %v", err)
	}
	defer func() { _ = net.Remove(ctx) }()

	// Database reachable on the network under the alias "db".
	db, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: testcontainers.ContainerRequest{
			Image:          "postgres:16-alpine",
			Env:            map[string]string{"POSTGRES_PASSWORD": "test"},
			Networks:       []string{net.Name},
			NetworkAliases: map[string][]string{net.Name: {"db"}},
			WaitingFor:     wait.ForListeningPort("5432/tcp"),
		},
		Started: true,
	})
	if err != nil {
		t.Fatalf("start db: %v", err)
	}
	defer func() { _ = db.Terminate(ctx) }()

	// The app container connects to "db:5432" by network alias, not localhost.
	app, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: testcontainers.ContainerRequest{
			Image:      "ghcr.io/example/app:latest",
			Env:        map[string]string{"DATABASE_HOST": "db", "DATABASE_PORT": "5432"},
			Networks:   []string{net.Name},
			WaitingFor: wait.ForHTTP("/health").WithPort("8080/tcp"),
		},
		Started: true,
	})
	if err != nil {
		t.Fatalf("start app: %v", err)
	}
	defer func() { _ = app.Terminate(ctx) }()
}
\`\`\`

Note the distinction between in-network and from-host addressing. Inside the network the app uses the alias \`db\` and the container's internal port \`5432\`. From your test process on the host, you would still call \`MappedPort\` to get the random published port. This two-container pattern is the foundation for testing realistic distributed flows, and it pairs well with the broader playbook in our [microservices testing strategies](/blog/microservices-testing-strategies) guide.

## A Redis Example with the Redis Module

Postgres is the most common use case, but the same pattern works for any service. Here is a complete Redis example using the dedicated module, which returns a ready-to-use connection string and applies the correct port wait strategy for you.

\`\`\`go
package cache

import (
	"context"
	"testing"

	"github.com/redis/go-redis/v9"
	tcredis "github.com/testcontainers/testcontainers-go/modules/redis"
)

func TestRedisCache(t *testing.T) {
	ctx := context.Background()

	redisContainer, err := tcredis.Run(ctx, "redis:7-alpine")
	if err != nil {
		t.Fatalf("start redis: %v", err)
	}
	defer func() { _ = redisContainer.Terminate(ctx) }()

	// The module exposes a ready connection URI (redis://host:port).
	uri, err := redisContainer.ConnectionString(ctx)
	if err != nil {
		t.Fatalf("connection string: %v", err)
	}

	opts, err := redis.ParseURL(uri)
	if err != nil {
		t.Fatalf("parse url: %v", err)
	}
	client := redis.NewClient(opts)
	defer client.Close()

	if err := client.Set(ctx, "user:1:name", "Ada", 0).Err(); err != nil {
		t.Fatalf("set: %v", err)
	}
	got, err := client.Get(ctx, "user:1:name").Result()
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got != "Ada" {
		t.Fatalf("want Ada, got %q", got)
	}
}
\`\`\`

The shape is identical to the Postgres flow: \`Run\` to start, \`ConnectionString\` to get the dial target, \`defer Terminate\` to clean up. Once you internalize this rhythm, adopting any new module takes minutes.

## A Kafka Example for Event-Driven Systems

Event-driven services are notoriously hard to test because they need a real broker. The Kafka module starts a single-node broker (KRaft mode, no ZooKeeper) and gives you the bootstrap brokers your producer and consumer need.

\`\`\`go
package events

import (
	"context"
	"testing"

	"github.com/segmentio/kafka-go"
	tckafka "github.com/testcontainers/testcontainers-go/modules/kafka"
)

func TestKafkaRoundTrip(t *testing.T) {
	ctx := context.Background()

	kafkaContainer, err := tckafka.Run(ctx, "confluentinc/confluent-local:7.6.0")
	if err != nil {
		t.Fatalf("start kafka: %v", err)
	}
	defer func() { _ = kafkaContainer.Terminate(ctx) }()

	brokers, err := kafkaContainer.Brokers(ctx)
	if err != nil {
		t.Fatalf("brokers: %v", err)
	}

	writer := &kafka.Writer{
		Addr:     kafka.TCP(brokers...),
		Topic:    "orders",
		Balancer: &kafka.LeastBytes{},
	}
	defer writer.Close()

	if err := writer.WriteMessages(ctx, kafka.Message{
		Key:   []byte("order-1"),
		Value: []byte("created"),
	}); err != nil {
		t.Fatalf("write message: %v", err)
	}

	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers: brokers,
		Topic:   "orders",
		GroupID: "test-consumer",
	})
	defer reader.Close()

	msg, err := reader.ReadMessage(ctx)
	if err != nil {
		t.Fatalf("read message: %v", err)
	}
	if string(msg.Value) != "created" {
		t.Fatalf("want created, got %q", string(msg.Value))
	}
}
\`\`\`

\`kafkaContainer.Brokers(ctx)\` returns the externally reachable broker addresses with the dynamic host and port already resolved, so your producer and consumer connect without any manual port juggling. The same round-trip pattern verifies serialization, partitioning, and consumer-group behavior against a real broker rather than a mock channel.

## CI, Performance, and Debugging Tips

Testcontainers runs anywhere Docker runs, but a few practices keep your pipeline fast and your failures legible. Pin image tags so your tests are reproducible and you control when image upgrades happen. Pre-pull images in a CI step so the test timing is not polluted by registry latency. Use one container per package via \`TestMain\` for read-heavy suites, and reserve per-test containers for cases that genuinely need a pristine database. Set explicit startup timeouts on every wait strategy so a slow cold start fails loudly with a clear message instead of hanging.

For debugging, stream container logs when a test fails. Testcontainers can attach a log consumer, or you can fetch logs on demand:

\`\`\`go
import (
	"context"
	"io"
	"testing"

	"github.com/testcontainers/testcontainers-go"
)

func dumpLogsOnFailure(t *testing.T, ctx context.Context, c testcontainers.Container) {
	t.Helper()
	if !t.Failed() {
		return
	}
	rc, err := c.Logs(ctx)
	if err != nil {
		t.Logf("could not fetch logs: %v", err)
		return
	}
	defer rc.Close()
	out, _ := io.ReadAll(rc)
	t.Logf("container logs:\\n%s", out)
}
\`\`\`

On the Ryuk side, Testcontainers starts a small reaper container that guarantees cleanup even if your test process is killed mid-run, so you rarely leak containers. If your CI environment forbids the reaper, you can disable it with \`TESTCONTAINERS_RYUK_DISABLED=true\` and rely on explicit \`Terminate\` calls instead. Treat that as a last resort, because the reaper is what makes Testcontainers safe under panics and timeouts.

## Frequently Asked Questions

### What is Testcontainers Go and how does it work?

Testcontainers Go is the official golang library (\`github.com/testcontainers/testcontainers-go\`) for starting real Docker containers from inside your tests. Your code defines a container request, the library starts the container, waits until a readiness signal passes, and exposes the dynamic host and port. When the test ends you call \`Terminate\`, and a reaper container guarantees cleanup even after a panic.

### How do I run Postgres integration tests with testcontainers-go?

Use the postgres module: call \`postgres.Run(ctx, "postgres:16-alpine", postgres.WithDatabase, postgres.WithUsername, postgres.WithPassword)\`, then \`ConnectionString(ctx, "sslmode=disable")\` to get a DSN. Open a \`*sql.DB\` with the pgx driver, run migrations or init scripts, execute your queries, and \`defer container.Terminate(ctx)\`. Wrapping each test case in a rolled-back transaction keeps cases isolated on a shared container.

### Should I use TestMain or start a container per test?

Start one container in \`TestMain\` for read-heavy suites where tests can share a schema; it is far faster because container startup dominates runtime. Use a fresh container per test only when a case needs a genuinely pristine database that transactions cannot provide. Remember not to \`defer\` cleanup in \`TestMain\` since \`os.Exit\` skips deferred calls.

### Why are my Testcontainers Go tests flaky or timing out?

Flakiness almost always comes from connecting before the service is ready. Replace a bare \`wait.ForLog\` with a probeable signal like \`wait.ForListeningPort\` or \`wait.ForSQL\`, combine signals with \`wait.ForAll\`, and set an explicit \`WithStartupTimeout\` generous enough to cover a cold image pull. For Postgres, wait for the ready log with \`WithOccurrence(2)\` because the line is printed twice.

### Do I need Docker installed to use testcontainers-go?

Yes. Testcontainers Go talks to a Docker daemon, so you need Docker Desktop, Colima, Rancher Desktop, or a remote Docker host on developer machines, and a Docker-capable runner in CI (GitHub Actions, GitLab CI, and CircleCI all qualify). Verify with \`docker info\` before running tests. The library auto-detects the daemon via standard \`DOCKER_HOST\` resolution.

### How do I make Testcontainers Go faster in CI?

Pin image tags and pre-pull images in a dedicated setup step so registry latency does not pollute test timing. Use one container per package with \`TestMain\`, cache Docker layers between runs, and run independent packages in parallel. Keep the Ryuk reaper enabled so killed jobs do not leak containers. Reuse mode helps locally but should stay off in CI to preserve clean state.

### Can I test multiple services together with testcontainers-go?

Yes. Create a Docker network with \`network.New(ctx)\`, attach each container with \`Networks\` and \`NetworkAliases\`, and the containers resolve each other by alias just like in production. An app container connects to \`db:5432\` over the network, while your host test process still uses \`MappedPort\` to reach published ports. This is how you test realistic service-to-service flows.

## Conclusion

Testcontainers Go closes the gap between unit tests that lie and integration tests that are painful to maintain. With a few lines of idiomatic Go you get a real Postgres, Redis, or Kafka instance that starts on demand, signals genuine readiness through explicit wait strategies, hands your test a dynamic connection string, and tears itself down automatically. The modules API (\`postgres.Run\`, \`redis.Run\`, \`kafka.Run\`) gives you correct defaults for free, while the generic \`GenericContainer\` API and custom networks cover everything the modules do not. Start with one container per package in \`TestMain\`, isolate cases with transactions, and reach for per-test containers only when you truly need a pristine state.

The payoff is integration tests you can trust: they exercise real constraints, real SQL dialects, and real broker semantics, so a green suite means your code actually works against production infrastructure. Ready to level up the rest of your QA stack? Explore curated, agent-ready testing skills, including database and integration testing patterns, in the [QASkills directory](/skills) and drop them straight into your AI coding agent.
`,
};
