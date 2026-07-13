import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Use Session Fixtures Safely with pytest-xdist Workers',
  description:
    'Use pytest-xdist session fixtures safely, coordinate one-time setup across workers, and prevent duplicate expensive resources or teardown races.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Use Session Fixtures Safely with pytest-xdist Workers

Run \`pytest -n 4\` and a session fixture that starts an emulator runs four times. Nothing is wrong with fixture scope: pytest-xdist created four worker processes, and each process owns an independent pytest session. "Session" means once per worker here, not once for the controller plus every worker.

That distinction determines the design. Some resources should exist per worker because they mutate state. Others, such as a read-only artifact download, can be initialized once and shared. The safe implementation depends on which ownership model the resource actually supports.

## What xdist distributes

The controller, historically called the master, collects configuration and schedules tests. Workers named \`gw0\`, \`gw1\`, and so on run tests in separate interpreters. Memory, module globals, fixture caches, and finalizers are not shared.

| Object | Controller copy | Worker copy | Shared automatically? |
|---|---:|---:|---:|
| Python module global | Possible during controller collection | One per process | No |
| Session-scoped fixture result | Not normally used for tests | Once per worker session | No |
| \`tmp_path_factory\` base directory | Managed by pytest | Worker-specific base | No |
| \`worker_id\` fixture | \`master\` without distribution | \`gwN\` under xdist | Value identifies process |
| External service endpoint | String may be copied | Workers can connect | Service itself is shared |

A session fixture is still valuable: it prevents repeated setup for tests assigned to the same worker. It simply cannot enforce cross-process uniqueness using an in-memory flag.

## Choose shared initialization only for shareable resources

Before adding a lock, ask whether all workers can safely use one result. Downloading an immutable compiler archive is shareable. Creating one mutable database schema usually is not. Starting one HTTP stub can work if it supports concurrent clients and test-specific namespaces. Issuing one login session may fail when the identity provider invalidates older tokens.

| Resource | Recommended ownership | Reason |
|---|---|---|
| Extracted read-only test corpus | Once per test run | Workers only read files |
| PostgreSQL database with destructive cleanup | Per worker | Cleanup and records otherwise collide |
| Dockerized read-only dependency | Once per run | Startup is expensive and endpoint is concurrency-safe |
| Browser user account | Per worker or per test | Server-side state and sessions mutate |
| Coverage output file | Per worker, merged later | Concurrent writers corrupt a single file |

Locks serialize initialization, not usage. A file lock around database creation does not make concurrent tests safe after the lock is released.

## One-time artifact creation with a file lock

pytest-xdist documents a pattern using \`tmp_path_factory.getbasetemp().parent\` to reach a directory shared by workers on the same host. Combine it with a cross-process lock and an atomic ready artifact. The \`filelock\` package supplies the lock used here.

\`\`\`python
# conftest.py
import hashlib
from pathlib import Path
from urllib.request import urlopen

import pytest
from filelock import FileLock

CORPUS_URL = "https://fixtures.example.test/corpus-v3.json"
CORPUS_SHA256 = "b6f8d8fdaec1e33a35c6f1a84f72b4ac5be6bca4a838f31f37f79e58d23fbb02"


@pytest.fixture(scope="session")
def shared_corpus(tmp_path_factory: pytest.TempPathFactory) -> Path:
    shared_root = tmp_path_factory.getbasetemp().parent
    corpus = shared_root / "corpus-v3.json"
    lock = FileLock(str(shared_root / "corpus-v3.lock"))

    with lock:
        if not corpus.exists():
            payload = urlopen(CORPUS_URL, timeout=30).read()
            digest = hashlib.sha256(payload).hexdigest()
            if digest != CORPUS_SHA256:
                raise RuntimeError(f"unexpected corpus digest: {digest}")
            temporary = corpus.with_suffix(".tmp")
            temporary.write_bytes(payload)
            temporary.replace(corpus)

    return corpus
\`\`\`

Only the worker that acquires the lock first downloads. Atomic replacement prevents another worker from observing a partial file. The checksum distinguishes a valid artifact from a truncated but existing file. In a real suite, obtain the expected digest from version-controlled metadata, not from the download response itself.

This shares only across workers on one machine and one pytest temporary root. Separate CI hosts cannot coordinate through that filesystem. Use object storage, a CI preparation step, or a network coordinator when nodes are distributed.

## Per-worker resources with \`worker_id\`

For mutable state, derive a namespace from the worker. The \`worker_id\` fixture returns \`gw0\` under xdist and \`master\` when xdist is disabled, so the same suite remains runnable with plain pytest.

\`\`\`python
# conftest.py
import os
import re

import psycopg
import pytest


def safe_identifier(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_]", "_", value)


@pytest.fixture(scope="session")
def worker_schema(worker_id: str):
    run_id = safe_identifier(os.environ.get("CI_RUN_ID", "local"))
    schema = safe_identifier(f"test_{run_id}_{worker_id}")
    admin_dsn = os.environ["TEST_DATABASE_DSN"]

    with psycopg.connect(admin_dsn, autocommit=True) as connection:
        connection.execute(
            psycopg.sql.SQL("CREATE SCHEMA IF NOT EXISTS {}")
            .format(psycopg.sql.Identifier(schema))
        )

    try:
        yield schema
    finally:
        with psycopg.connect(admin_dsn, autocommit=True) as connection:
            connection.execute(
                psycopg.sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE")
                .format(psycopg.sql.Identifier(schema))
            )
\`\`\`

The example uses psycopg 3's composable SQL for the identifier. Query parameters cannot represent schema names. The CI run ID prevents two concurrent jobs from sharing \`test_local_gw0\`. In production code, truncate or hash long run identifiers to stay below PostgreSQL's identifier limit.

Tests should configure application connections to use the yielded schema, commonly with a connection option setting \`search_path\`. Do not change a process-wide environment variable after the application pool has already been imported.

## Passing controller-created data through \`workerinput\`

Sometimes the controller can cheaply choose configuration while workers perform the real work. xdist exposes \`pytest_configure_node(node)\` on the controller and makes assigned values available as \`request.config.workerinput\` in workers.

\`\`\`python
# conftest.py
import secrets
import pytest


def pytest_configure_node(node):
    node.workerinput["run_namespace"] = node.config._qa_run_namespace


def pytest_configure(config):
    config._qa_run_namespace = f"qa-{secrets.token_hex(6)}"


@pytest.fixture(scope="session")
def run_namespace(request: pytest.FixtureRequest) -> str:
    workerinput = getattr(request.config, "workerinput", None)
    if workerinput is None:
        return request.config._qa_run_namespace
    return workerinput["run_namespace"]
\`\`\`

Values must be serializable through xdist's channel. Send strings, numbers, lists, and dictionaries, not live clients or open sockets. The code also covers a non-xdist run. Attribute names prefixed for the project reduce collision risk, although a dedicated pytest option or stash key may be preferable in a plugin.

This mechanism distributes a value once; it does not magically transfer ownership of a resource. If the controller starts a service, workers can receive its URL. Controller cleanup must then happen in a controller hook, not in a worker fixture whose finalizer runs several times.

## Starting exactly one external service

For a service shared by all local workers, a robust design has four phases: elect an initializer, start the process, publish a readiness record atomically, and assign cleanup to exactly one owner. A bare lock that is released immediately after startup leaves no cleanup ownership. A lock held for the full run blocks every other worker from reading the endpoint.

The simplest reliable approach is often outside pytest: start the dependency in the CI job, wait for its health endpoint, export its URL, run pytest, and stop it in the job's guaranteed cleanup. This also works across separate xdist hosts if they can reach the endpoint.

If pytest must own the service, use a small coordinator process or controller plugin. The controller can start it in \`pytest_sessionstart\`, pass its URL via \`workerinput\`, then stop it in \`pytest_sessionfinish\`. Remember that hooks may run in workers too, so guard controller-only work with the absence of \`config.workerinput\` or use documented xdist controller hooks.

Avoid treating \`pytest_configure\` as a one-time hook. It runs in every worker.

## Teardown is harder than setup

Workers can exit normally, crash, or be terminated when CI is cancelled. Yield-fixture finalizers handle the first case, not every external failure. Shared resource cleanup therefore needs idempotency and an orphan policy.

Per-worker cleanup is straightforward because each finalizer owns only its namespace. Shared cleanup requires knowing that no worker is still using the resource. "Last worker" algorithms based on files are vulnerable to crashed workers and reordered shutdown. Controller-owned teardown has a clearer lifecycle.

Record a run ID on every external resource. A scheduled janitor can delete resources older than a conservative threshold after confirming that the owning CI run is no longer active. Never delete by a broad prefix alone in a shared account.

## Scheduling changes fixture economics

The default \`load\` scheduling distributes individual tests while trying to keep collection consistent. \`loadscope\` groups by module or class, reducing repeated module-scoped setup. \`loadfile\` groups each file. Distribution mode does not change the fact that a session fixture runs once in every worker, but it changes which expensive lower-scoped fixtures are repeated.

| Scheduler | Grouping tendency | Fixture implication |
|---|---|---|
| \`--dist load\` | Individual tests | Maximum balancing, more lower-scope churn |
| \`--dist loadscope\` | Module or class | Keeps module fixtures together |
| \`--dist loadfile\` | File | Useful when files own expensive state |
| \`--dist worksteal\` | Worker queues with stealing | Balances while moving remaining work |
| \`--dist no\` | No distribution | One Python process and one session fixture |

Do not choose scheduling only to hide unsafe sharing. First make resource ownership correct, then optimize grouping with measurements.

The [pytest-xdist parallel testing guide](/blog/pytest-xdist-parallel-testing-guide) covers scheduler and collection behavior. The [complete pytest fixture scope guide](/blog/pytest-fixtures-scope-complete-guide) explains dependency ordering and finalization outside the multi-process complication.

## Avoiding collection and configuration surprises

Every worker must collect the same tests in the same order. Generating parameters from an unordered set or live service can cause xdist collection mismatch errors before fixtures run. Sort generated inputs and snapshot remote discovery before starting workers.

Environment variables inherited at process creation are safe for immutable configuration. Mutating them in one worker does not affect siblings. This can be useful for worker namespaces, but code imported before the mutation may already have cached settings.

Session fixture parameters multiply setup within each worker. A session fixture with three parameter values can run up to three times per worker as tests request those values. Scope is a cache boundary per parameter combination, not an unconditional once-only decorator.

## Diagnosing duplicated setup

Add structured lifecycle logs containing process ID, worker ID, run ID, fixture name, and event. Use \`--log-cli-level=INFO\` or write worker-specific log files. Interleaved plain prints make a correct four-worker initialization look like random repetition.

When a supposedly shared artifact is created twice, check whether workers share the same host and temporary parent, whether the lock path is identical, and whether the lock is on a filesystem with dependable locking semantics. Network filesystems vary. A local file lock cannot coordinate container filesystems that do not mount the same directory.

When setup runs more than the number of workers, look for worker crashes and replacement processes, fixture parameterization, multiple pytest invocations, or dynamic worker counts. xdist may restart failed workers depending on configuration. Setup must be idempotent even when the expected steady-state count is one per worker.

## Practical design review

Name the owner in code comments: worker, controller, CI job, or external platform. Name the consumers separately. Specify whether concurrent use is supported and whether tests mutate the resource. Then define readiness, normal cleanup, crash cleanup, and collision prevention.

Keep credentials out of readiness records and worker logs. Pass a reference or short-lived token through environment or a secret-aware channel. A shared JSON file containing an administrator password is an avoidable leak.

Test both \`pytest -n 0\` and \`pytest -n 2\`. The non-distributed path catches assumptions that \`workerinput\` always exists; the distributed path catches false singleton assumptions. Force one worker to fail during setup and confirm other workers either continue safely or fail with a clear shared error.

## File locks need a published result protocol

A lock alone answers only who may execute a block now. Workers also need to agree on what constitutes a complete result. For a directory artifact, build in a temporary sibling directory, verify all expected files, write a manifest containing a format version and checksum, then atomically rename the directory where the platform permits it. Consumers should validate that manifest after acquiring the lock rather than trusting existence.

Never perform a slow network download while holding a lock if contenders can download independently and only publication requires exclusion. Each worker can download to its own temporary path, then the winner publishes a verified artifact. This reduces lock time at the cost of duplicate bandwidth. For a very large artifact, electing one downloader is more economical, but set a lock timeout and report owner metadata so a hung initialization is diagnosable.

The lock should live beside the shared result, not inside a directory that is atomically replaced. Cleanup must not delete it while another worker might be waiting. Let pytest remove its temporary root after the complete invocation.

## Remote workers change filesystem assumptions

xdist can execute through remote gateways, not only local worker processes. A path sent through worker input names a path on the receiving machine, where the file may not exist. Even when source is synchronized, temporary roots and Docker daemons remain host-local.

Classify a resource by visibility: process-local, host-local, network-reachable, or globally provisioned. A file lock handles host-local coordination. A database advisory lock can coordinate clients of one database. A CI job or provisioning API can coordinate several machines. The narrowest sufficient coordinator keeps failure modes understandable.

When hosts have unsynchronized clocks, avoid deciding resource age from worker timestamps. Let the resource service or controller assign creation time. Clock drift can make one host delete another host's active fixture as supposedly expired.

## Fixture failure before yield

If a session fixture raises before yielding, the cleanup body after yield never begins. Register cleanup as soon as each external resource is created, or wrap subsequent initialization in a try and finally block. This matters when service startup succeeds but readiness probing fails.

A replacement worker has no access to the failed process's fixture cache. Resource names based only on worker ID may be reused by a replacement, so creation should be idempotent and verify ownership with the run ID. If preserving failed state matters, publish diagnostics first, allocate a process suffix, and rely on an orphan janitor.

Do not silently fall back to a shared default when isolated setup fails. Dependent tests no longer have the environment their fixture contract promised. Preserve the original exception and add resource identity as diagnostic context.

When readiness is asynchronous, bound the probe with a monotonic deadline and include the final service response in the error. An unbounded fixture can leave every worker waiting until the CI job timeout, obscuring which dependency failed first. Apply small randomized probe jitter only when many workers independently contact one shared service.

## Frequently Asked Questions

### Why does my session-scoped fixture run once for every \`gw\` worker?

Each xdist worker is a separate pytest session in a separate process. Fixture caching exists inside that process only. Session scope therefore means once per worker for each parameter combination.

### Is \`worker_id\` available when I run without \`-n\`?

Yes. The xdist fixture returns \`master\` when distribution is not active. That makes it practical for naming resources in suites that support serial and parallel execution.

### Can \`tmp_path_factory.getbasetemp().parent\` coordinate workers on different machines?

Not unless that parent is genuinely the same shared filesystem with reliable locking for every machine. In ordinary multi-host execution it is local, so use an external coordinator or prepare the artifact before pytest starts.

### Who should tear down a service created once for the whole run?

Prefer the same single owner that created it, usually the CI job or xdist controller. Worker finalizers run independently and cannot safely infer that all sibling workers have finished.

### Does a file lock make a shared mutable database safe?

Only if the lock is held around every conflicting database operation, which would largely serialize the suite. For normal parallel tests, allocate a schema, database, tenant, or account per worker instead.
`,
};
