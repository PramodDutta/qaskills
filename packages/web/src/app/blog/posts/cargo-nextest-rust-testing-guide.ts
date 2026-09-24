import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'cargo nextest: Faster Rust Test Runs for QA Engineers',
  description: 'A practical cargo nextest guide for faster Rust test runs, CI sharding, retries, JUnit reports, build archives, and agent-safe QA workflows.',
  date: '2026-09-24',
  category: 'Tutorial',
  content: `
# cargo nextest: Faster Rust Test Runs for QA Engineers

\`cargo nextest\` is a Rust test runner that keeps Cargo's build model but replaces the default libtest execution layer with a faster, more controllable runner. For QA engineers, the headline is not just speed. The real payoff is that each test runs as its own process, failures are reported with better isolation, retries are explicit, JUnit output is built in, and CI sharding is first-class instead of a pile of shell math.

Use \`cargo nextest run\` when your Rust workspace has enough unit or integration tests that \`cargo test\` feels hard to schedule, hard to shard, or noisy to debug. Keep \`cargo test --doc\` in the pipeline for doctests because nextest still does not run doctests on stable Rust. Treat nextest as the main binary test runner, not as a total replacement for every Cargo test mode.

The current cargo-nextest crate is 0.9.146, and the official docs still center the same operational primitives that matter to test automation teams: repository config in \`.config/nextest.toml\`, profiles, \`-E\` filtersets, retries, slow timeouts, test groups, JUnit XML, \`--partition\` for CI sharding, and build archives for reusing compiled test binaries. If you are also rethinking CI topology, read this alongside the [CI matrix strategy guide](/blog/ci-matrix-strategy-parallel-test-jobs-guide). If you are chasing unstable tests rather than slow ones, pair it with the [flaky tests guide](/blog/fix-flaky-tests-guide).

## What cargo nextest changes in the Rust test loop

The default \`cargo test\` flow builds test binaries and then lets libtest run tests inside those binaries. Nextest still asks Cargo to build tests, but it lists tests and schedules them itself. Its current execution mode is process-per-test, which means nextest launches a separate process for every test case. That changes the QA failure surface in useful ways.

An individual test can crash, leak state, or set process environment variables without poisoning the rest of the test binary in the same way. Output capture can be controlled per profile. Slow tests are detected by nextest's runner, not by a wrapper script. A retry can be attached to a subset of tests through configuration, and CI can emit JUnit XML that marks reruns and flaky failures.

| Concern | \`cargo test\` default | \`cargo nextest\` approach | QA impact |
|---|---|---|---|
| Test scheduling | Mostly delegated to libtest per binary | Runner schedules individual tests | Better global parallelism across packages |
| Process isolation | Many tests share one test-binary process | Separate process per test | Cleaner diagnosis for crashes and global state |
| Retrying flaky tests | Usually external wrapper logic | \`retries\` and \`flaky-result\` in config | Retries become visible and reviewable |
| CI sharding | Custom scripts or runner-specific splitting | \`--partition slice:m/n\` or \`hash:m/n\` | Simpler matrix jobs |
| JUnit reports | Usually third-party conversion | Built-in JUnit output | Easier CI publishing |
| Doctests | Supported by Cargo | Not supported by nextest | Keep a separate \`cargo test --doc\` step |

For AI coding agents, that specificity is valuable. Claude Code, Cursor, and Copilot tend to do better when the repository has one obvious test command and a visible profile. "Run \`cargo nextest run -P ci -E 'package(api)'\`" is less ambiguous than "run the Rust tests except the slow ones."

## Install and pin it before tuning behavior

Nextest has several installation paths. For local machines, Homebrew and Cargo-based installation are common. In CI, the official docs recommend pre-built binaries, and the release URL scheme lets you pin a version directly. The important QA rule is to keep local and CI versions close enough that profile keys, output formats, and partition behavior match.

\`\`\`bash
# macOS with Homebrew.
brew install cargo-nextest

# Source install. The official docs warn that plain cargo install without --locked
# is unsupported.
cargo install --locked cargo-nextest

# Smoke check the version and runner availability.
cargo nextest --version
cargo nextest run --workspace
\`\`\`

For reproducible CI, prefer a pinned version or an action that pins the tool. The release URL documentation says canonical release downloads live under \`https://get.nexte.st/{version}/{platform}\`, with \`latest\`, a series such as \`0.9\`, or an exact version as the version selector. Exact versions are boring, and boring is wonderful when the test runner is part of your quality gate.

| Pinning style | Example | When to use |
|---|---|---|
| Exact release | \`0.9.146\` | Regulated projects, release branches, reproducible agents |
| Series release | \`0.9\` | Teams that want patch upgrades within a known feature series |
| Latest | \`latest\` | Experiment branches, temporary local bootstrap |
| Package manager | \`brew install cargo-nextest\` | Developer laptops where exact CI parity is less critical |

The mistake people make is tuning nextest behavior before pinning nextest itself. That creates subtle drift. A profile using a newer key may work locally and fail in an older CI image. A JUnit setting added in a recent version may be ignored by an old binary. Put version verification near the top of the job so failures point at the toolchain, not at random tests.

## Build a repository profile that agents can trust

Nextest reads repository configuration from \`.config/nextest.toml\` at the Cargo workspace root unless \`--config-file\` points somewhere else. Profiles live under \`[profile.<name>]\`; the default profile is \`default\`, and CI can select another profile with \`-P ci\` or \`--profile ci\`.

A good starting profile distinguishes local feedback from CI evidence. Local runs should stop quickly and show useful output. CI runs should collect complete results, produce machine-readable reports, and avoid hiding flakiness behind silent retries.

\`\`\`toml
[profile.default]
fail-fast = true
slow-timeout = "60s"
success-output = "never"
failure-output = "immediate-final"

[profile.ci]
fail-fast = false
retries = 1
flaky-result = "fail"
slow-timeout = { period = "90s", terminate-after = 2 }
leak-timeout = "1s"

[profile.ci.junit]
path = "target/nextest/ci-results.xml"
store-success-output = false
store-failure-output = true
report-skipped = "ignored"
flaky-fail-status = "failure"
\`\`\`

That profile makes a few opinionated choices. CI continues after the first failure so you get a complete failure list. It retries once, but \`flaky-result = "fail"\` prevents the build from going green just because the retry passed. Slow tests are not killed immediately at the first threshold; \`terminate-after = 2\` gives the test two slow periods before termination. JUnit output stores failure output without stuffing every successful test log into the report.

The retry detail deserves extra attention. The official retry docs say \`--flaky-result fail\` does not enable retries by itself. You need \`--retries N\` or configuration. This is a classic CI trap: a team adds a flaky-result policy, sees no change, and assumes nextest is broken. It is not broken; the retry budget was never turned on.

## Filtersets are the nextest-native way to scope runs

Nextest filtersets are specified with \`-E\` or \`--filterset\`. They are a small query language rather than a substring match: you can combine package, binary, and test-name predicates with \`and\`, \`or\`, and \`not\`, which plain \`cargo test\` name filters cannot express. For nextest, teach agents to reach for \`-E\`.

\`\`\`bash
# Run tests in one package.
cargo nextest run -E 'package(api)'

# Run one test name fragment.
cargo nextest run -E 'test(user_can_reset_password)'

# Run package tests except a known slow module.
cargo nextest run -E 'package(api) and not test(/slow_import/)'

# Combine multiple filtersets. Nextest accepts repeated -E flags.
cargo nextest run -E 'package(api)' -E 'test(/checkout/)'
\`\`\`

Filtersets are also useful for configuration overrides. You can put rules in \`.config/nextest.toml\` that apply only to tests matching a package, name, binary, platform, or expression. That is safer than scattering custom shell conditions across workflows.

\`\`\`toml
[profile.ci]
retries = 1
slow-timeout = "60s"

[[profile.ci.overrides]]
filter = 'test(/network_/)'
retries = 3
slow-timeout = "3m"

[[profile.ci.overrides]]
filter = 'package(db-tests)'
threads-required = 2
test-group = "database"

[[profile.ci.overrides]]
platform = 'cfg(target_os = "macos")'
slow-timeout = "2m"
\`\`\`

Do not use broad retries as a substitute for fixing flaky tests. Retry the tests you can name, fail the run on flakes, and use the JUnit report as evidence. When every test gets three retries forever, the suite becomes slower and less trustworthy.

## Control shared resources with test groups

Process-per-test isolation does not eliminate every shared resource. Database schemas, Redis instances, ports, rate-limited APIs, GPU devices, and filesystem fixtures can still collide. Nextest test groups let you cap concurrency for subsets of tests. Define groups under \`[test-groups.<name>]\`, then assign matching tests to a group with an override.

\`\`\`toml
[test-groups.database]
max-threads = 1

[test-groups.external-api]
max-threads = 2

[profile.ci]
test-threads = "num-cpus"

[[profile.ci.overrides]]
filter = 'package(db-tests)'
test-group = "database"

[[profile.ci.overrides]]
filter = 'test(/stripe_|github_|slack_/)'
test-group = "external-api"
retries = 2
\`\`\`

The database group above serializes database tests while allowing the rest of the workspace to run with normal parallelism. That is better than setting \`test-threads = 1\` globally, which punishes unrelated pure unit tests.

| Shared dependency | Symptom | Nextest control | Extra QA guard |
|---|---|---|---|
| One test database | Deadlocks, duplicate keys, migrated schema drift | \`test-group = "database"\` with \`max-threads = 1\` | Use one checked-out client for \`BEGIN\`, queries, and \`ROLLBACK\` |
| Port-bound service | Random bind failures | Group service tests or allocate ports dynamically | Assert readiness before using the service |
| External API sandbox | Rate limit failures | Small max-threads and scoped retries | Record request IDs in failure output |
| GPU or browser farm | Worker starvation | Dedicated group with low concurrency | Emit device allocation logs |

What people get wrong: they treat process isolation as data isolation. A test process can still write to the same database, bucket, or temp directory as another process. If the fixture was unsafe under parallel \`cargo test\`, nextest will often reveal that faster because it schedules more globally.

## CI sharding with --partition

When one nextest job is still too slow, use \`--partition\`. The official partitioning docs describe sliced and hashed modes, plus a deprecated counted mode. Sliced partitioning uses \`--partition slice:m/n\` and distributes listed tests round-robin across buckets. Hashed sharding uses \`--partition hash:m/n\` and assigns tests deterministically based on binary ID and test names. Counted partitioning, \`count:m/n\`, remains supported but is deprecated in favor of sliced or hashed modes.

Sliced mode is often the best default for a balanced CI matrix. Hashed mode is useful when you want a test to stay in the same bucket even as other tests are added or removed. Both are clearer than a homegrown script that shells out to \`cargo test -- --list\` and then tries to split lines.

\`\`\`yaml
name: rust-tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  nextest:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v7
      - uses: actions-rust-lang/setup-rust-toolchain@v1
      - name: Install cargo-nextest
        uses: taiki-e/install-action@v2
        with:
          tool: cargo-nextest@0.9.146
      - name: Run partitioned tests
        run: cargo nextest run --workspace -P ci --partition slice:\${{ matrix.shard }}/4
      - name: Run doctests
        if: matrix.shard == 1
        run: cargo test --workspace --doc
      - name: Upload nextest report
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: nextest-junit-shard-\${{ matrix.shard }}
          path: target/nextest/ci-results.xml
\`\`\`

The artifact name deliberately avoids a slash. GitHub artifact names may not contain \`/\`, and generated workflow examples often forget that when they use names like \`nextest/\${{ matrix.shard }}\`. The doctest step runs on one shard only to avoid duplicate work, but it still runs in the same workflow.

For GitLab CI, the same idea maps to \`CI_NODE_INDEX\` and \`CI_NODE_TOTAL\`, but remember that shell variables need braces when adjacent to other text.

\`\`\`yaml
rust:test:
  stage: test
  parallel: 4
  script:
    - cargo nextest run --workspace -P ci --partition slice:\${CI_NODE_INDEX}/\${CI_NODE_TOTAL}
    - if [ "\${CI_NODE_INDEX}" = "1" ]; then cargo test --workspace --doc; fi
  artifacts:
    when: always
    paths:
      - target/nextest/ci-results.xml
\`\`\`

## Reuse builds with nextest archives

On large Rust workspaces, every shard rebuilding the same test binaries can cost more than the test run. Nextest archives solve that by separating the build machine from target machines. \`cargo nextest archive --archive-file my-archive.tar.zst\` builds test binaries and packages Cargo metadata, binaries metadata, test binaries, dynamic libraries, non-test binaries used by integration tests, and relevant build script output. \`cargo nextest run --archive-file my-archive.tar.zst\` then runs from the archive.

\`\`\`bash
# Build once.
cargo nextest archive --workspace --all-features --archive-file nextest-archive.tar.zst

# Run from the archive on the same checked-out revision.
cargo nextest run --archive-file nextest-archive.tar.zst -P ci

# Run one shard from the archive.
cargo nextest run \\
  --archive-file nextest-archive.tar.zst \\
  --partition hash:2/4 \\
  -P ci
\`\`\`

The official docs call out important requirements. The target machine should have the project checked out to the same revision because tests may need source-relative fixtures. You must transfer the archive yourself. Nextest should be installed on the target machine, and using the same nextest version on build and target machines is recommended. Cargo does not need to be installed on the target machine if you call \`cargo-nextest nextest\` instead of \`cargo nextest\`.

| Archive workflow | Benefit | Risk to control |
|---|---|---|
| Build once, shard many | Avoids duplicate Cargo builds | Archive transfer time can dominate small suites |
| Build on standard runner, run on GPU runner | Saves expensive runner minutes | Target must have matching runtime libraries |
| Cross-compile then run on target hardware | Enables hardware validation | Workspace remapping and fixture paths must be correct |
| Reuse in debug session | Reproduces exact test binaries | Source checkout must match the archive revision |

Use archives after simpler sharding. If your workspace builds in two minutes and tests in twenty, partitions alone may be enough. If builds take twenty minutes across every shard, archives become a serious lever.

## Diagnose a realistic failure mode: the hidden transaction race

Imagine a Rust API workspace where nextest makes CI faster locally, but the CI matrix starts failing database tests with duplicate key errors. The tests passed under \`cargo test\` because the old runner effectively ran fewer database tests at the same time. Nextest did not create the bug; it surfaced a preexisting isolation leak.

The wrong fix is to add global retries. The better diagnosis is to identify whether tests share schema state, shared IDs, or a pool transaction that is not bound to one client. A transaction must run \`BEGIN\`, all queries, and \`ROLLBACK\` on one checked-out client, not on a pool that can hand each query to a different connection.

\`\`\`rust
use sqlx::{PgPool, Postgres, Transaction};

async fn with_rolled_back_tx<F, Fut>(pool: &PgPool, test_body: F) -> anyhow::Result<()>
where
    F: for<'a> FnOnce(&'a mut Transaction<'_, Postgres>) -> Fut,
    Fut: std::future::Future<Output = anyhow::Result<()>>,
{
    let mut tx = pool.begin().await?;
    test_body(&mut tx).await?;
    tx.rollback().await?;
    Ok(())
}
\`\`\`

Then combine fixture repair with nextest resource control:

\`\`\`toml
[test-groups.database]
max-threads = 1

[[profile.ci.overrides]]
filter = 'package(api-db-tests)'
test-group = "database"
retries = 0
slow-timeout = "2m"
\`\`\`

After the fixture is safe, you can consider raising \`max-threads\` to 2 or 3 if every test uses unique schema names or isolated containers. Until then, serialization is honest. It tells reviewers the suite has a shared dependency instead of pretending the test is flaky.

## Agent-safe commands for daily QA work

Ready-made QA skills can install from qaskills.sh with the qaskills CLI, but the repository should still expose simple commands an agent can run and explain. Put the canonical commands in a justfile, Makefile, or CI task list. The goal is to reduce creative flag selection.

\`\`\`makefile
.PHONY: test test-ci test-doc test-api test-flaky

test:
	cargo nextest run --workspace

test-ci:
	cargo nextest run --workspace -P ci

test-doc:
	cargo test --workspace --doc

test-api:
	cargo nextest run -E 'package(api)'

test-flaky:
	cargo nextest run -P ci -E 'test(/flaky_|known_unstable/)'
\`\`\`

When asking an agent to add a regression, include the command and the expected failure before the fix: "Add a test that fails before the cache invalidation fix. Run \`make test-api\`. Do not add retries." That prevents the agent from papering over the symptom with a runner setting.

## A practical adoption sequence

Start with parity. Install nextest, run \`cargo nextest run --workspace\`, then run \`cargo test --workspace --doc\`. If nextest finds failures that Cargo did not surface, assume the suite has order or state coupling until proven otherwise. Next, add \`.config/nextest.toml\` with separate local and CI profiles. Then wire JUnit output and upload it as a CI artifact. Only after those basics are stable should you add matrix sharding, archives, and per-test overrides.

| Stage | Change | Exit criteria |
|---|---|---|
| 1 | Add \`cargo nextest run --workspace\` locally | Same binary tests pass as before |
| 2 | Keep \`cargo test --workspace --doc\` | Doctests remain covered |
| 3 | Add \`[profile.ci]\` and JUnit | CI publishes readable failures |
| 4 | Add \`--partition slice:m/n\` | Runtime drops without duplicate reports |
| 5 | Add test groups and overrides | Shared dependencies stop racing |
| 6 | Add archives | Build time is paid once per matrix |

The most valuable nextest rollout is not the one with the fanciest config. It is the one where every failure tells you whether the product broke, the fixture leaked, the test is flaky, or the runner found a scheduling assumption.

## Frequently Asked Questions

### Does cargo nextest replace cargo test completely?

No. It can replace \`cargo test\` for most unit and integration test binary execution, but it does not run doctests. Keep a separate \`cargo test --doc\` step in CI. Some teams also keep a periodic full \`cargo test --workspace\` job during migration, mainly to detect assumptions about libtest behavior. Once parity is understood, nextest usually becomes the main fast path and doctests remain the explicit Cargo step.

### Should CI use sliced or hashed partitioning?

Use \`slice:m/n\` first when your goal is balanced runtime across shards. It distributes listed tests in a round-robin way and is easy to reason about. Use \`hash:m/n\` when shard stability matters more than balance, for example when you want a failing test to stay in the same bucket as tests are added. Avoid new \`count:m/n\` setups because counted partitioning is deprecated.

### Are retries a good way to handle flaky Rust tests?

Retries are useful as evidence, not as forgiveness. Configure a small retry count for known unstable boundaries, set \`flaky-result = "fail"\` in CI, and inspect the JUnit report for reruns. If a retry makes CI green without failing the build, the suite teaches everyone to ignore instability. Use retries to collect signal while you fix the shared resource, timing race, or nondeterministic assertion.

### Why did nextest expose failures after cargo test passed?

The usual reason is hidden coupling. Nextest schedules individual tests differently and runs each one in a separate process, so order assumptions, shared database state, fixed ports, global environment mutations, and filesystem collisions become visible. Diagnose the shared dependency before blaming the runner. If the dependency cannot be isolated immediately, use a test group to serialize that subset while you repair the fixture design.
`,
};
