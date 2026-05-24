import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Python Pytest — Integration Testing Guide 2026',
  description:
    'Master Testcontainers for Python with pytest. Real integration tests for PostgreSQL, MySQL, Redis, MongoDB, Kafka, and CI/CD patterns.',
  date: '2026-05-06',
  category: 'Guide',
  content: `
# Testcontainers Python Pytest Integration Testing Guide

Python dominates data engineering, machine learning, and modern web backends, and most production Python services depend on at least one database. Yet integration testing in Python has historically been a tradeoff between pytest-postgresql (which spawns separate processes that drift from production), in-memory SQLite (which lacks Postgres-specific features), and Docker-compose stacks (which couple test execution to a separate startup step). Testcontainers for Python solves this by giving every pytest fixture access to a fresh, real, isolated database in Docker with one-line setup.

This guide is a hands-on walkthrough of testcontainers-python with pytest in 2026. We cover the official testcontainers package, fixtures for PostgreSQL, MySQL, Redis, MongoDB, and Kafka, the integration with SQLAlchemy, Alembic migrations, asyncpg, motor (async MongoDB), container reuse, and CI/CD configuration. Every code sample is working Python with pytest 8 and the testcontainers-python library.

---

## Key Takeaways

- **testcontainers-python** is the official Python SDK with modules for 30+ services
- **pytest fixtures** are the idiomatic way to share containers across tests
- **SQLAlchemy and Alembic** integrate seamlessly via connection URLs
- **async drivers** like asyncpg and motor work without modification
- **Session-scoped fixtures** dramatically reduce test suite runtime
- **CI/CD setup is trivial** because Docker is available on GitHub Actions ubuntu runners

---

## Installation

\`\`\`bash
pip install testcontainers[postgres,mysql,redis,mongodb,kafka]
pip install pytest pytest-asyncio sqlalchemy psycopg2-binary
\`\`\`

Verify Docker:

\`\`\`bash
docker info
\`\`\`

Configure pytest with sufficient timeouts:

\`\`\`ini
# pytest.ini
[pytest]
asyncio_mode = auto
testpaths = tests
\`\`\`

---

## PostgreSQL Fixture Pattern

\`\`\`python
# conftest.py
import pytest
from testcontainers.postgres import PostgresContainer
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:16-alpine") as postgres:
        yield postgres

@pytest.fixture(scope="session")
def engine(postgres_container):
    url = postgres_container.get_connection_url()
    engine = create_engine(url, pool_pre_ping=True)
    return engine

@pytest.fixture
def db_session(engine):
    connection = engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()
\`\`\`

The transactional rollback pattern in \`db_session\` keeps tests isolated without needing to truncate between tests.

\`\`\`python
# test_users.py
def test_create_user(db_session):
    from myapp.models import User
    user = User(email="alice@example.com")
    db_session.add(user)
    db_session.commit()
    found = db_session.query(User).filter_by(email="alice@example.com").one()
    assert found.email == "alice@example.com"
\`\`\`

---

## MySQL Fixture

\`\`\`python
from testcontainers.mysql import MySqlContainer

@pytest.fixture(scope="session")
def mysql_engine():
    with MySqlContainer("mysql:8.4") as mysql:
        engine = create_engine(mysql.get_connection_url())
        yield engine
\`\`\`

---

## Redis Fixture

\`\`\`python
from testcontainers.redis import RedisContainer
import redis

@pytest.fixture(scope="session")
def redis_container():
    with RedisContainer("redis:7.4-alpine") as redis_cont:
        yield redis_cont

@pytest.fixture
def redis_client(redis_container):
    client = redis.Redis(
        host=redis_container.get_container_host_ip(),
        port=redis_container.get_exposed_port(6379),
        decode_responses=True,
    )
    yield client
    client.flushdb()
    client.close()
\`\`\`

The fixture flushes the DB after each test for isolation.

---

## MongoDB Fixture

\`\`\`python
from testcontainers.mongodb import MongoDbContainer
from pymongo import MongoClient

@pytest.fixture(scope="session")
def mongo_container():
    with MongoDbContainer("mongo:7.0") as mongo:
        yield mongo

@pytest.fixture
def mongo_db(mongo_container):
    client = MongoClient(mongo_container.get_connection_url())
    db = client.get_database("test")
    yield db
    client.drop_database("test")
    client.close()
\`\`\`

---

## Alembic Migrations

Run Alembic migrations in a session-scoped fixture so the schema is set up once per run:

\`\`\`python
from alembic.config import Config
from alembic import command

@pytest.fixture(scope="session", autouse=True)
def apply_migrations(engine):
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", str(engine.url))
    command.upgrade(config, "head")
    yield
    command.downgrade(config, "base")
\`\`\`

---

## Async PostgreSQL with asyncpg

\`\`\`python
import asyncpg
import pytest_asyncio

@pytest_asyncio.fixture
async def asyncpg_conn(postgres_container):
    conn = await asyncpg.connect(postgres_container.get_connection_url(driver=None))
    yield conn
    await conn.close()

@pytest.mark.asyncio
async def test_async_query(asyncpg_conn):
    row = await asyncpg_conn.fetchrow("SELECT 1 + 1 AS sum")
    assert row["sum"] == 2
\`\`\`

---

## Async MongoDB with motor

\`\`\`python
from motor.motor_asyncio import AsyncIOMotorClient

@pytest_asyncio.fixture
async def motor_db(mongo_container):
    client = AsyncIOMotorClient(mongo_container.get_connection_url())
    db = client.test
    yield db
    await client.drop_database("test")
    client.close()

@pytest.mark.asyncio
async def test_motor_insert(motor_db):
    result = await motor_db.users.insert_one({"name": "bob"})
    assert result.inserted_id is not None
\`\`\`

---

## Kafka Fixture

\`\`\`python
from testcontainers.kafka import KafkaContainer
from kafka import KafkaProducer, KafkaConsumer

@pytest.fixture(scope="session")
def kafka_container():
    with KafkaContainer("confluentinc/cp-kafka:7.6.1") as kafka:
        yield kafka

def test_produce_consume(kafka_container):
    bootstrap = kafka_container.get_bootstrap_server()
    producer = KafkaProducer(bootstrap_servers=bootstrap)
    producer.send("test-topic", b"hello").get(timeout=10)

    consumer = KafkaConsumer(
        "test-topic",
        bootstrap_servers=bootstrap,
        auto_offset_reset="earliest",
        consumer_timeout_ms=5000,
    )
    msgs = [m for m in consumer]
    assert len(msgs) == 1
    assert msgs[0].value == b"hello"
\`\`\`

---

## Container Lifecycle Methods

| Method | Returns / Effect |
|---|---|
| \`PostgresContainer("image")\` | Constructor |
| \`.with_env(key, val)\` | Set env var |
| \`.start()\` / \`__enter__()\` | Start container |
| \`.stop()\` / \`__exit__()\` | Stop container |
| \`.get_connection_url()\` | Full URI |
| \`.get_container_host_ip()\` | Hostname |
| \`.get_exposed_port(port)\` | Mapped port |

---

## Per-Test Isolation Strategies

| Strategy | Speed | Use Case |
|---|---|---|
| Transactional rollback | Fast | Most database tests |
| TRUNCATE between tests | Medium | DDL-heavy tests |
| Drop and recreate schema | Slow | Strong isolation |
| Container per test | Slow | Last resort |

Transactional rollback is the right default. Use TRUNCATE only when your code-under-test issues its own transactions.

---

## SQLAlchemy ORM Pattern

\`\`\`python
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str]

@pytest.fixture(scope="session", autouse=True)
def create_schema(engine):
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)
\`\`\`

---

## Multiple Containers per Test

For integration tests touching multiple services:

\`\`\`python
@pytest.fixture(scope="session")
def services():
    pg = PostgresContainer("postgres:16-alpine").start()
    redis_c = RedisContainer("redis:7-alpine").start()
    yield {"postgres": pg, "redis": redis_c}
    pg.stop()
    redis_c.stop()
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
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip
      - run: pip install -r requirements.txt
      - run: pytest -v
\`\`\`

---

## Common Pitfalls

**Forgetting context managers.** Always use \`with\` or \`yield\` so containers stop cleanly.

**Scope mismatch.** Function-scoped containers per test are slow (1-2s each). Use session scope and clean state per test instead.

**Connection pool leaks.** SQLAlchemy engines hold connection pools. Always dispose engines in a teardown.

**Slow startup on macOS.** Docker Desktop on macOS has higher overhead. Container reuse helps.

**asyncpg requires non-default URL format.** Use \`postgres_container.get_connection_url(driver=None)\` to strip the SQLAlchemy driver prefix.

---

## Conclusion

testcontainers-python with pytest is the right default for Python integration testing in 2026. PostgreSQL, MySQL, Redis, MongoDB, Kafka — all wrapped in pytest fixtures, with full sync and async driver support. Session-scoped containers keep test suites fast, transactional rollback keeps tests isolated, and CI requires no configuration.

Browse the [QA skills directory](/skills) for related pytest patterns, or read our [pytest guide](/blog/pytest-testing-complete-guide) for fixture fundamentals.
`,
};
