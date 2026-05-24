import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Rust — Integration Testing Guide 2026',
  description:
    'Master Testcontainers for Rust integration testing. Real PostgreSQL, MySQL, Redis, MongoDB tests with sqlx, tokio, and CI/CD patterns.',
  date: '2026-05-07',
  category: 'Guide',
  content: `
# Testcontainers Rust Integration Testing Guide

Rust has become a serious contender for backend services, and most production Rust applications depend on at least one database. Testing Rust code against real databases has been challenging because Rust's borrow checker makes long-lived shared state awkward, and crates like sqlx have their own offline-checked-query mode that doesn't validate behavior against a real engine. Testcontainers-rs solves this by giving every test a fresh, real database container with one-line setup, integrated cleanly with Rust's testing ecosystem and async runtimes.

This guide is a hands-on walkthrough of testcontainers-rs in 2026. We cover the official testcontainers crate with modules for PostgreSQL, MySQL, Redis, MongoDB, and Kafka, integration with sqlx, diesel, and sea-orm, tokio runtime patterns, container reuse, and CI/CD configuration. Every code sample is working Rust with tokio and the testcontainers crate.

---

## Key Takeaways

- **testcontainers** is the official Rust crate with module support
- **AsyncRunner** is the async API for tokio-based applications
- **Per-test containers** are the idiomatic Rust pattern given the borrow checker
- **sqlx, diesel, sea-orm** all integrate via connection URLs
- **Container reuse** is supported and dramatically speeds up local iteration
- **CI/CD setup is trivial** because Docker is available on GitHub Actions ubuntu runners

---

## Installation

\`Cargo.toml\`:

\`\`\`toml
[dev-dependencies]
testcontainers = { version = "0.23", features = ["http_wait"] }
testcontainers-modules = { version = "0.11", features = ["postgres", "mysql", "redis", "mongo"] }
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.8", features = ["runtime-tokio", "postgres", "macros"] }
\`\`\`

Verify Docker:

\`\`\`bash
docker info
\`\`\`

---

## PostgreSQL with sqlx

\`\`\`rust
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::postgres::Postgres;
use sqlx::PgPool;

#[tokio::test]
async fn test_postgres_integration() {
    let container = Postgres::default()
        .with_tag("16-alpine")
        .start()
        .await
        .unwrap();

    let host_port = container.get_host_port_ipv4(5432).await.unwrap();
    let url = format!("postgres://postgres:postgres@localhost:{}/postgres", host_port);

    let pool = PgPool::connect(&url).await.unwrap();

    let row: (i32,) = sqlx::query_as("SELECT 1 + 1")
        .fetch_one(&pool)
        .await
        .unwrap();

    assert_eq!(row.0, 2);
}
\`\`\`

The container starts in beforeAll-equivalent, and when the \`container\` value drops at the end of the test, Testcontainers reaps it.

---

## sqlx Migration Pattern

\`\`\`rust
#[tokio::test]
async fn test_with_migrations() {
    let container = Postgres::default().with_tag("16-alpine").start().await.unwrap();
    let port = container.get_host_port_ipv4(5432).await.unwrap();
    let url = format!("postgres://postgres:postgres@localhost:{}/postgres", port);

    let pool = PgPool::connect(&url).await.unwrap();

    sqlx::migrate!("./migrations").run(&pool).await.unwrap();

    sqlx::query("INSERT INTO users (email) VALUES ('alice@example.com')")
        .execute(&pool)
        .await
        .unwrap();

    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(&pool)
        .await
        .unwrap();

    assert_eq!(count.0, 1);
}
\`\`\`

The \`sqlx::migrate!\` macro embeds migrations at compile time and runs them against the test container.

---

## MySQL Pattern

\`\`\`rust
use testcontainers_modules::mysql::Mysql;

#[tokio::test]
async fn test_mysql() {
    let container = Mysql::default().with_tag("8.4").start().await.unwrap();
    let port = container.get_host_port_ipv4(3306).await.unwrap();
    let url = format!("mysql://root@localhost:{}/test", port);

    let pool = sqlx::MySqlPool::connect(&url).await.unwrap();
    let row: (i32,) = sqlx::query_as("SELECT 1 + 1").fetch_one(&pool).await.unwrap();
    assert_eq!(row.0, 2);
}
\`\`\`

---

## Redis Pattern

\`\`\`rust
use testcontainers_modules::redis::Redis;
use redis::AsyncCommands;

#[tokio::test]
async fn test_redis() {
    let container = Redis::default().start().await.unwrap();
    let port = container.get_host_port_ipv4(6379).await.unwrap();

    let client = redis::Client::open(format!("redis://localhost:{}", port)).unwrap();
    let mut conn = client.get_multiplexed_async_connection().await.unwrap();

    let _: () = conn.set("key", "value").await.unwrap();
    let value: String = conn.get("key").await.unwrap();

    assert_eq!(value, "value");
}
\`\`\`

---

## MongoDB Pattern

\`\`\`rust
use testcontainers_modules::mongo::Mongo;
use mongodb::{Client, bson::doc};

#[tokio::test]
async fn test_mongo() {
    let container = Mongo::default().start().await.unwrap();
    let port = container.get_host_port_ipv4(27017).await.unwrap();
    let uri = format!("mongodb://localhost:{}", port);

    let client = Client::with_uri_str(&uri).await.unwrap();
    let coll = client.database("test").collection::<mongodb::bson::Document>("users");

    coll.insert_one(doc! { "name": "alice" }).await.unwrap();

    let count = coll.count_documents(doc! {}).await.unwrap();
    assert_eq!(count, 1);
}
\`\`\`

---

## Shared Container with OnceCell

For tests that share a single container across many tests:

\`\`\`rust
use tokio::sync::OnceCell;

static POOL: OnceCell<PgPool> = OnceCell::const_new();
static CONTAINER: OnceCell<ContainerAsync<Postgres>> = OnceCell::const_new();

async fn get_pool() -> &'static PgPool {
    POOL.get_or_init(|| async {
        let container = Postgres::default().with_tag("16-alpine").start().await.unwrap();
        let port = container.get_host_port_ipv4(5432).await.unwrap();
        let url = format!("postgres://postgres:postgres@localhost:{}/postgres", port);
        CONTAINER.set(container).ok();
        let pool = PgPool::connect(&url).await.unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        pool
    }).await
}

#[tokio::test]
async fn test_one() {
    let pool = get_pool().await;
    // use pool
}

#[tokio::test]
async fn test_two() {
    let pool = get_pool().await;
    // use pool, same container
}
\`\`\`

This pattern saves the container startup cost across hundreds of tests.

---

## Container Methods

| Method | Purpose |
|---|---|
| \`Postgres::default()\` | Default config |
| \`.with_tag(tag)\` | Specific image tag |
| \`.with_env_var(key, val)\` | Set env var |
| \`.with_init_sql(path)\` | Run SQL on startup |
| \`.start()\` (async) | Start container, returns \`ContainerAsync\` |
| \`.start()\` (sync) | Synchronous start |

After start:

| Method | Returns |
|---|---|
| \`.get_host_port_ipv4(port)\` | Mapped port |
| \`.get_host()\` | Hostname |
| \`.id()\` | Container ID |

---

## Per-Test Isolation

Three patterns:

| Pattern | Speed | Use |
|---|---|---|
| Container per test | Slow | Maximum isolation, simplest |
| Shared container + transaction rollback | Fast | Most cases |
| Shared container + TRUNCATE | Medium | DDL-heavy tests |

Transactional rollback in sqlx:

\`\`\`rust
async fn run_in_transaction<F>(pool: &PgPool, f: F)
where F: for<'a> AsyncFnOnce(&mut PgConnection) -> ()
{
    let mut tx = pool.begin().await.unwrap();
    f(&mut tx).await;
    tx.rollback().await.unwrap();
}
\`\`\`

---

## Diesel Integration

\`\`\`rust
use diesel::pg::PgConnection;
use diesel::prelude::*;

#[tokio::test]
async fn test_diesel() {
    let container = Postgres::default().start().await.unwrap();
    let port = container.get_host_port_ipv4(5432).await.unwrap();
    let url = format!("postgres://postgres:postgres@localhost:{}/postgres", port);

    let mut conn = PgConnection::establish(&url).unwrap();
    diesel_migrations::run_pending_migrations(&mut conn).unwrap();

    diesel::sql_query("INSERT INTO users (email) VALUES ('a@b.com')")
        .execute(&mut conn)
        .unwrap();
}
\`\`\`

---

## sea-orm Integration

\`\`\`rust
use sea_orm::{Database, DbConn};

#[tokio::test]
async fn test_sea_orm() {
    let container = Postgres::default().start().await.unwrap();
    let port = container.get_host_port_ipv4(5432).await.unwrap();
    let url = format!("postgres://postgres:postgres@localhost:{}/postgres", port);

    let db: DbConn = Database::connect(&url).await.unwrap();
    // run migrations, use db
}
\`\`\`

---

## Container Reuse

\`\`\`rust
use testcontainers::core::ContainerPort;
use testcontainers::ImageExt;

let container = Postgres::default()
    .with_tag("16-alpine")
    .with_reuse(testcontainers::ReuseDirective::Always)
    .start()
    .await
    .unwrap();
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
      - uses: dtolnay/rust-toolchain@stable
      - uses: actions/cache@v4
        with:
          path: |
            ~/.cargo/registry
            target
          key: \${{ runner.os }}-cargo-\${{ hashFiles('Cargo.lock') }}
      - run: cargo test --all
\`\`\`

---

## Common Pitfalls

**Container lifetime.** Containers stop when their value drops. If you store the container in a local variable, it lives only as long as the test function. For shared containers, use OnceCell or static lifetimes.

**Async runtime confusion.** Testcontainers async API requires tokio. If your tests use async-std, you'll need an adapter.

**Port assumptions.** Don't hardcode port 5432. Always use \`get_host_port_ipv4()\` to get the actual mapped port.

**sqlx offline mode.** sqlx's compile-time query checking requires either a live database or \`.sqlx\` cache files. In CI, you have a live container so set \`SQLX_OFFLINE=false\`.

---

## Conclusion

Testcontainers-rs brings real database integration testing to the Rust ecosystem with idiomatic async patterns. PostgreSQL, MySQL, Redis, MongoDB — all work with one-line setup, sqlx, diesel, and sea-orm all integrate cleanly. Container reuse keeps local iteration fast, and CI requires no configuration.

Browse the [QA skills directory](/skills) for related Rust testing patterns, or read our [Go guide](/blog/testcontainers-go-database-testing-guide) for systems-language comparison.
`,
};
