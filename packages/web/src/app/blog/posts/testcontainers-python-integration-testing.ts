import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Python: Real Integration Tests with Docker',
  description:
    'Learn Testcontainers for Python: spin up throwaway Postgres, Redis, and Kafka in Docker, wire them into pytest fixtures, and run real integration tests in CI.',
  date: '2026-07-05',
  category: 'Tutorial',
  content: `
# Testcontainers Python: Real Integration Tests with Docker

Most Python test suites lie to you. They mock the database, stub the cache, patch the message broker, and then declare victory with green checkmarks that prove almost nothing about how your code behaves against real infrastructure. The moment your query hits a real Postgres index, your Redis \`SETEX\` expires on a real clock, or your Kafka consumer rebalances against a real broker, the mocks that made your tests fast also made them meaningless. Testcontainers fixes this. It is a library that starts real Docker containers, one throwaway Postgres or Redis or Kafka per test run, gives your test the exact connection details, and then tears everything down when the test finishes. No shared staging database, no manual \`docker compose up\` before you run \`pytest\`, no leftover state poisoning the next developer's run.

This tutorial is a practical, code-first guide to using Testcontainers with Python and pytest in 2026. You will learn how to install it, why real dependencies beat mocks for the integration layer, how to use the ready-made \`PostgresContainer\`, \`RedisContainer\`, and \`KafkaContainer\` modules, how to drop down to a generic \`DockerContainer\` for anything without a module, and how to wire containers cleanly into pytest fixtures with the right scope. We will cover readiness waits, connection retries, running the whole thing in GitHub Actions, and the performance tricks (container reuse and the Ryuk resource reaper) that keep your suite fast. We finish with a complete, runnable example that tests a repository layer against real Postgres. If you already write pytest, you can copy every snippet here into your own project. If you want a refresher first, see our [pytest best practices guide](/blog/pytest-best-practices-2026).

## What Testcontainers Actually Is

Testcontainers is a Python library (\`testcontainers\`) that talks to your local Docker daemon and programmatically starts containers scoped to your tests. Instead of writing a docker-compose file and remembering to start it, you write a few lines of Python inside a fixture. The container starts when the fixture is set up, exposes a randomly assigned host port so parallel runs never collide, and is destroyed when the fixture tears down. Because the port is dynamic, you never hardcode \`localhost:5432\`; you ask the container for its actual connection URL.

The library ships language bindings for Java, Go, .NET, Node, and Python, all following the same model. The Python package is organized into a core module plus per-technology modules. You install only what you need. The core gives you \`DockerContainer\` and \`wait_for_logs\`; the extras give you typed helpers like \`PostgresContainer\` that already know their default port and how to build a connection string.

The key idea is isolation. Every test run gets a clean, real dependency. There is no "did someone leave rows in the test DB" problem, because the database did not exist thirty seconds ago and will not exist thirty seconds from now.

## Installing Testcontainers

Testcontainers is distributed as a base package with optional extras per technology. Install the ones you need:

\`\`\`bash
# Core plus the Postgres, Redis, and Kafka modules
pip install "testcontainers[postgres,redis,kafka]"

# Or with individual sub-packages (newer split-package layout)
pip install testcontainers-postgres testcontainers-redis testcontainers-kafka

# Supporting drivers you will use in the examples
pip install psycopg[binary] redis kafka-python pytest
\`\`\`

You also need a running Docker daemon on the machine executing the tests. On a developer laptop that is Docker Desktop, Colima, or Rancher Desktop. In CI it is the Docker service on the runner. Verify Docker is reachable before you start:

\`\`\`bash
docker info
\`\`\`

If \`docker info\` prints daemon details, Testcontainers will work. If it errors, fix Docker first; Testcontainers has no fallback because the whole point is real containers.

## Why Real Dependencies Beat Mocks

Mocks are excellent for unit tests: isolate a function, feed it fakes, assert on behavior in microseconds. But the integration layer, the code that builds SQL, serializes to a cache, or produces to a topic, is exactly where mocks lie the most. A mocked cursor happily returns whatever you told it to, so it never catches a malformed query, a missing index, a JSON column that Postgres rejects, or a transaction that deadlocks under a real isolation level.

| Concern | Mocks | Shared test DB | Testcontainers |
|---|---|---|---|
| Catches real SQL / driver bugs | No | Yes | Yes |
| Test isolation between runs | Perfect | Poor (shared state) | Perfect (fresh container) |
| Setup effort | Low | High (provision + maintain) | Low (one fixture) |
| Speed per test | Fastest | Fast | Fast after first start |
| Parallel-safe | Yes | Risky (port/data clashes) | Yes (random ports) |
| Matches production engine | No | Usually | Yes (pin the image tag) |
| CI reproducibility | High | Low (drift over time) | High (pinned image) |

The pattern that works in practice is a pyramid: many fast unit tests with mocks for pure logic, a focused band of integration tests with Testcontainers for the data and messaging layers, and a thin top of end-to-end tests. Testcontainers owns that middle band. It is not a replacement for unit tests and it is not trying to be a full E2E harness; it is the honest way to test the code that talks to infrastructure.

## Using PostgresContainer

The Postgres module is the most common starting point. Here is a minimal, self-contained example that starts Postgres, connects with psycopg, and runs a query:

\`\`\`python
from testcontainers.postgres import PostgresContainer
import psycopg

def test_postgres_roundtrip():
    with PostgresContainer("postgres:16-alpine") as postgres:
        url = postgres.get_connection_url()  # e.g. postgresql+psycopg2://...
        # Normalize to a plain psycopg connection string
        dsn = url.replace("postgresql+psycopg2", "postgresql")

        with psycopg.connect(dsn) as conn:
            with conn.cursor() as cur:
                cur.execute("CREATE TABLE t (id serial primary key, name text)")
                cur.execute("INSERT INTO t (name) VALUES (%s)", ("alice",))
                cur.execute("SELECT name FROM t WHERE id = 1")
                assert cur.fetchone()[0] == "alice"
\`\`\`

Always pin the image tag (\`postgres:16-alpine\`, not \`postgres:latest\`) so your tests run against the same engine as production and do not silently upgrade when a new image is published. The \`with\` block guarantees the container stops even if an assertion fails. The container exposes a random host port; \`get_connection_url()\` returns a SQLAlchemy-style URL, which you can feed straight into SQLAlchemy or normalize for a raw driver as shown.

## Using RedisContainer

Redis follows the same shape. The module knows Redis listens on 6379 inside the container and maps it to a random host port:

\`\`\`python
from testcontainers.redis import RedisContainer
import redis

def test_redis_setex_expiry():
    with RedisContainer("redis:7-alpine") as container:
        host = container.get_container_host_ip()
        port = container.get_exposed_port(6379)
        client = redis.Redis(host=host, port=int(port), decode_responses=True)

        client.setex("session:42", 30, "active")
        assert client.get("session:42") == "active"
        assert 0 < client.ttl("session:42") <= 30
\`\`\`

Because this is a real Redis, \`TTL\`, \`SETEX\`, eviction, and Lua scripts all behave exactly as they will in production. A mocked Redis would never catch a bug where you passed the TTL and value arguments in the wrong order.

## Using KafkaContainer

Kafka is where Testcontainers really earns its keep, because standing up a broker by hand is painful. The module handles the listener configuration for you and exposes a bootstrap server string:

\`\`\`python
from testcontainers.kafka import KafkaContainer
from kafka import KafkaProducer, KafkaConsumer

def test_kafka_produce_consume():
    with KafkaContainer("confluentinc/cp-kafka:7.6.0") as kafka:
        bootstrap = kafka.get_bootstrap_server()

        producer = KafkaProducer(bootstrap_servers=bootstrap)
        producer.send("orders", b'{"id": 1}')
        producer.flush()

        consumer = KafkaConsumer(
            "orders",
            bootstrap_servers=bootstrap,
            auto_offset_reset="earliest",
            consumer_timeout_ms=10000,
        )
        message = next(iter(consumer))
        assert message.value == b'{"id": 1}'
        consumer.close()
\`\`\`

This exercises real serialization, partitioning, and consumer offset behavior. The \`consumer_timeout_ms\` prevents the test from hanging forever if nothing arrives, which is a good habit for any broker test.

## The Generic DockerContainer for Everything Else

Not every dependency has a dedicated module. When there is no \`FooContainer\`, drop to the generic \`DockerContainer\` and configure it yourself. Here is Elasticsearch as an example:

\`\`\`python
from testcontainers.core.container import DockerContainer
from testcontainers.core.waiting_utils import wait_for_logs
import requests

def test_elasticsearch_generic():
    container = (
        DockerContainer("docker.elastic.co/elasticsearch/elasticsearch:8.13.0")
        .with_env("discovery.type", "single-node")
        .with_env("xpack.security.enabled", "false")
        .with_exposed_ports(9200)
    )
    with container:
        wait_for_logs(container, "started", timeout=120)
        host = container.get_container_host_ip()
        port = container.get_exposed_port(9200)
        resp = requests.get(f"http://{host}:{port}/_cluster/health")
        assert resp.status_code == 200
        assert resp.json()["status"] in ("green", "yellow")
\`\`\`

\`DockerContainer\` gives you a fluent builder: \`with_env\`, \`with_exposed_ports\`, \`with_command\`, \`with_volume_mapping\`, and \`with_bind_ports\`. Anything you can express in \`docker run\`, you can express here. This is your escape hatch for databases, queues, or vendor images that the ecosystem has not wrapped yet.

## Wiring Containers into Pytest Fixtures

Running a container inside every test function is simple but slow, because each test pays the container startup cost. The right pattern is to promote the container to a pytest fixture and choose its scope deliberately. Put shared fixtures in \`conftest.py\` so any test module can use them.

The rule of thumb: **start the container once per session, but reset its state between tests.** A session-scoped container that lives for the whole run, paired with a function-scoped fixture that truncates tables or flushes keys, gives you both speed and isolation.

\`\`\`python
# conftest.py
import pytest
import psycopg
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg

@pytest.fixture(scope="session")
def db_dsn(postgres_container):
    url = postgres_container.get_connection_url()
    return url.replace("postgresql+psycopg2", "postgresql")

@pytest.fixture(scope="session")
def _schema(db_dsn):
    with psycopg.connect(db_dsn) as conn:
        conn.execute(
            "CREATE TABLE users (id serial primary key, email text unique not null)"
        )
        conn.commit()
    return db_dsn

@pytest.fixture(scope="function")
def db(_schema):
    # Fresh connection per test, truncated for isolation
    with psycopg.connect(_schema) as conn:
        yield conn
        conn.execute("TRUNCATE users RESTART IDENTITY CASCADE")
        conn.commit()
\`\`\`

Here the container and schema are built once per session, but every test gets a clean \`users\` table because the function-scoped \`db\` fixture truncates on teardown. Choosing scope well is one of the highest-leverage decisions in a Testcontainers suite.

| Fixture scope | Container lifecycle | Speed | Isolation | Use when |
|---|---|---|---|---|
| \`function\` | New container per test | Slowest | Strongest | A handful of tests, or destructive schema changes |
| \`module\` | New container per file | Medium | Good | Tests in a file share heavy setup |
| \`session\` | One container per run | Fastest | Needs manual reset | Most integration suites; pair with truncation |

## Waiting for Readiness

A container that has started is not the same as a container that is ready to accept connections. Postgres prints logs for a few seconds before it opens its socket; Kafka takes longer. If you connect too early you get connection-refused errors that look like flaky tests. Testcontainers gives you two tools.

The built-in modules already wait: \`PostgresContainer\` blocks until Postgres is accepting connections before \`__enter__\` returns. For generic containers, use \`wait_for_logs\` to block until an expected log line appears, as shown in the Elasticsearch example. When log matching is not enough, add an explicit connection retry loop:

\`\`\`python
import time
import psycopg

def wait_for_postgres(dsn, attempts=20, delay=0.5):
    last_error = None
    for _ in range(attempts):
        try:
            with psycopg.connect(dsn) as conn:
                conn.execute("SELECT 1")
                return
        except psycopg.OperationalError as exc:
            last_error = exc
            time.sleep(delay)
    raise RuntimeError(f"Postgres not ready after retries: {last_error}")
\`\`\`

An explicit retry loop with a capped number of attempts and a small delay is the most robust readiness check you can write. It turns "connection refused because we were half a second early" from a flaky failure into a non-event. Never use a bare \`time.sleep(10)\` and hope; it is both slower and less reliable than polling.

## Running Testcontainers in CI

Testcontainers runs anywhere Docker runs, and GitHub Actions runners ship with Docker preinstalled. The only thing to get right is that the runner can reach the Docker socket, which the default \`ubuntu-latest\` runner already can. Here is a complete workflow:

\`\`\`yaml
# .github/workflows/integration.yml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: pip install "testcontainers[postgres,redis,kafka]" psycopg[binary] redis kafka-python pytest

      - name: Run integration tests
        run: pytest -v tests/integration
        env:
          # Reuse pulled images across steps; disable Ryuk if the runner
          # blocks the reaper container (rare on GitHub-hosted runners).
          TESTCONTAINERS_RYUK_DISABLED: "false"
\`\`\`

You do not need to declare Postgres or Redis as GitHub Actions \`services\`; that is the old pattern. With Testcontainers the containers are started by your test code, so the workflow stays identical whether you add or remove dependencies. Pull times dominate the first run, so pinning small images (the \`-alpine\` variants) noticeably speeds up CI.

## Performance: Reuse and Ryuk

Two features keep a large Testcontainers suite fast. The first is **container reuse**. During local development you can tell Testcontainers to keep a container alive between test runs and reattach to it instead of starting fresh, which removes the startup cost from your inner loop:

\`\`\`python
# Enable reuse in ~/.testcontainers.properties
#   testcontainers.reuse.enable=true
from testcontainers.postgres import PostgresContainer

pg = PostgresContainer("postgres:16-alpine").with_reuse(True)
pg.start()  # First run starts it; later runs reattach to the same container
\`\`\`

Reuse is a local-development optimization; leave it off in CI, where you want a guaranteed-clean container every time and the runner is discarded anyway.

The second feature is **Ryuk**, the resource reaper. When Testcontainers starts, it also starts a tiny sidecar container called Ryuk that watches your test process. If your test crashes, is killed, or exits without tearing down, Ryuk notices the parent is gone and removes the leftover containers, networks, and volumes for you. This is what prevents a hard \`Ctrl+C\` from leaving orphaned Postgres containers eating your disk. You can disable it with \`TESTCONTAINERS_RYUK_DISABLED=true\` in restricted environments that forbid the privileged reaper, but leave it enabled whenever you can; it is your safety net against leaks.

A few more speed tips: prefer Alpine image variants, share one session-scoped container across a module or the whole session, run tests in parallel with \`pytest-xdist\` (random ports make this safe), and pin images so the layer cache stays warm.

## A Complete Repository-Layer Example

Here is a realistic end-to-end example: a small repository class and its test suite running against real Postgres. This is the shape you will actually ship.

\`\`\`python
# app/repository.py
import psycopg

class UserRepository:
    def __init__(self, dsn: str):
        self._dsn = dsn

    def add(self, email: str) -> int:
        with psycopg.connect(self._dsn) as conn:
            row = conn.execute(
                "INSERT INTO users (email) VALUES (%s) RETURNING id",
                (email,),
            ).fetchone()
            conn.commit()
            return row[0]

    def get_by_email(self, email: str):
        with psycopg.connect(self._dsn) as conn:
            return conn.execute(
                "SELECT id, email FROM users WHERE email = %s", (email,)
            ).fetchone()
\`\`\`

\`\`\`python
# tests/integration/test_user_repository.py
import psycopg
import pytest
from app.repository import UserRepository

@pytest.fixture
def repo(_schema):
    return UserRepository(_schema)

def test_add_returns_id(repo):
    user_id = repo.add("alice@example.com")
    assert isinstance(user_id, int)
    assert user_id > 0

def test_get_by_email_roundtrip(repo):
    repo.add("bob@example.com")
    row = repo.get_by_email("bob@example.com")
    assert row is not None
    assert row[1] == "bob@example.com"

def test_unique_email_constraint_enforced(repo):
    repo.add("carol@example.com")
    with pytest.raises(psycopg.errors.UniqueViolation):
        repo.add("carol@example.com")
\`\`\`

The third test is the one that mocks can never give you: it proves the real \`unique\` constraint fires. Against a mocked cursor you would have to fake the exception, which just tests your fake. Against real Postgres, the database enforces the rule, and your test verifies your code handles the real error. That is the entire value proposition of Testcontainers in one assertion. For patterns on structuring these tests as consumer contracts across services, see our guides on [API contract testing for microservices](/blog/api-contract-testing-microservices) and the broader [best AI testing tools of 2026](/blog/best-ai-testing-tools-2026).

## Frequently Asked Questions

### What is Testcontainers in Python?

Testcontainers is a Python library that starts real, throwaway Docker containers for your tests. Instead of mocking a database or cache, you spin up an actual Postgres, Redis, or Kafka container scoped to your test run, get its dynamic connection details, and let the library tear it down automatically afterward, giving you honest integration tests with perfect isolation.

### Do I need Docker installed to use Testcontainers?

Yes. Testcontainers talks to a running Docker daemon to create and destroy containers, so you need Docker Desktop, Colima, Rancher Desktop, or a Docker service running locally and in CI. Run \`docker info\` to confirm the daemon is reachable. There is no mock fallback, because running real containers is the entire point of the library.

### Is Testcontainers slow for tests?

The first container start pays a pull and boot cost of a few seconds, but after that it is fast. Use session-scoped fixtures so one container serves the whole run, truncate tables between tests for isolation, pick small Alpine images, and enable container reuse locally. Most suites run their integration band in seconds once images are cached.

### How do I use Testcontainers with pytest fixtures?

Wrap the container in a pytest fixture and choose its scope. A session-scoped fixture starts the container once and yields it; a function-scoped fixture resets state (truncate tables, flush Redis) between tests. Put shared fixtures in \`conftest.py\` so every test module can use them without importing. This pairing gives you both speed and clean isolation.

### What is Ryuk in Testcontainers?

Ryuk is a small sidecar container that Testcontainers starts to reap resources. It watches your test process and, if the process crashes or is killed without tearing down, automatically removes the leftover containers, networks, and volumes. It prevents orphaned containers from accumulating. You can disable it with \`TESTCONTAINERS_RYUK_DISABLED=true\` in locked-down environments, but keep it on when possible.

### Can I run Testcontainers in GitHub Actions?

Yes, and it is simple. GitHub-hosted \`ubuntu-latest\` runners ship with Docker preinstalled, so your test code starts containers directly. You no longer declare Postgres or Redis as workflow \`services\`; the containers come from your tests. Install the library, run pytest, and the workflow stays identical no matter which dependencies your tests use.

### When should I not use Testcontainers?

Skip Testcontainers for pure unit tests of business logic where mocks are faster and sufficient. It is also a poor fit where Docker is unavailable, such as some managed CI tiers or corporate environments that forbid the daemon. And it does not replace full end-to-end tests across many deployed services; it targets the integration layer between your code and one real dependency.

## Conclusion

Testcontainers closes the honesty gap in your test suite. Unit tests with mocks stay fast and cover pure logic, but the code that talks to Postgres, Redis, and Kafka deserves to be tested against real Postgres, Redis, and Kafka, and Testcontainers makes that as easy as writing a fixture. Pin your images, promote containers to session-scoped fixtures, reset state between tests, lean on \`wait_for_logs\` and retry loops for readiness, and let Ryuk clean up after crashes. The payoff is a suite that catches real driver bugs, real constraint violations, and real serialization problems before they reach production, all while staying reproducible in CI.

Ready to make your integration tests real? Browse the QA skills directory at [/skills](/skills) to install Testcontainers, pytest, and Docker testing skills straight into Claude Code, Cursor, or Copilot, and let your AI coding agent scaffold correct fixtures, readiness waits, and CI workflows for you.
`,
};
