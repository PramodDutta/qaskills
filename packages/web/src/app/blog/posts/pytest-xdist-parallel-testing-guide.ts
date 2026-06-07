import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pytest-xdist Parallel Testing Guide: -n auto and loadscope 2026',
  description:
    'Run pytest tests in parallel with pytest-xdist in 2026: -n auto, --dist loadscope/loadfile/loadgroup/worksteal, xdist_group, fixture isolation, and CI setup.',
  date: '2026-06-07',
  category: 'Guide',
  content: `
# Pytest-xdist Parallel Testing Guide: -n auto and loadscope (2026)

A test suite that takes twelve minutes to run is a test suite developers stop running. The single biggest lever you have to fix slow Python CI is parallelism, and in the pytest ecosystem that means [pytest-xdist](https://pypi.org/project/pytest-xdist/). With one flag, \`pytest -n auto\`, you can fan your tests out across every CPU core on the machine and cut wall-clock time by 4x, 8x, or more. But parallel execution is not free: tests that quietly relied on running one at a time will suddenly fail, fixtures that assumed a single process will collide, and shared resources like databases and ports will fight each other.

This guide covers everything you need to run pytest tests in parallel safely in 2026, on pytest 8.x and the current pytest-xdist line. We will install it, walk through every distribution mode (\`loadscope\`, \`loadfile\`, \`loadgroup\`, and \`worksteal\`), explain the \`xdist_group\` marker, fix the fixture-isolation problems that parallelism exposes, combine it with coverage, wire it into CI, and finish with the cases where you should *not* parallelize at all. If you are still building your pytest foundations, read [pytest best practices for 2026](/blog/pytest-best-practices-2026) first, then come back to make those tests fast.

If you would rather have an AI coding agent configure xdist, partition your slow tests, and fix the isolation bugs it surfaces, install the [pytest patterns skill](/skills) into Claude Code, Cursor, or Copilot.

## Installing pytest-xdist

pytest-xdist is a separate plugin, not part of pytest core. Install it with pip:

\`\`\`bash
pip install pytest-xdist
\`\`\`

Or, if you use a \`pyproject.toml\` with optional dependency groups, add it to your test extras:

\`\`\`toml
[project.optional-dependencies]
test = [
    "pytest>=8.0",
    "pytest-xdist>=3.6",
    "pytest-cov>=5.0",
]
\`\`\`

Once installed, pytest-xdist registers the \`-n\` / \`--numprocesses\` option automatically. Verify it is loaded:

\`\`\`bash
pytest --version
# pytest 8.x.y
# registered third-party plugins:
#   xdist-3.x.y at .../xdist/plugin.py
\`\`\`

The plugin works by spawning a controller process plus N worker subprocesses (called \`gw0\`, \`gw1\`, and so on). The controller collects tests, hands them to workers, and aggregates results. Each worker is a *fully separate Python process*, which is exactly why isolation matters: workers do not share memory, module-level globals, or in-process caches.

## Running Tests in Parallel: -n auto and -n NUM

The core flag is \`-n\`. Pass it a number to use exactly that many workers, or \`auto\` to use one worker per physical CPU core:

\`\`\`bash
# Use every available CPU core
pytest -n auto

# Use exactly 4 workers
pytest -n 4

# Use logical cores (hyperthreads) instead of physical
pytest -n logical
\`\`\`

\`-n auto\` is the right default for local development and most CI runners. It detects the core count via \`os.cpu_count()\` semantics and spins up that many workers. On a CI runner advertising 4 vCPUs you get 4 workers; on your 16-core laptop you get 16. Use \`-n logical\` when you want to oversubscribe and your tests are I/O bound (waiting on network or disk) rather than CPU bound, since idle waiting workers can overlap usefully.

Setting \`-n 0\` disables xdist entirely and runs in-process, which is useful for debugging a single failing test without changing your command structure:

\`\`\`bash
pytest -n 0 tests/test_payments.py::test_refund -x --pdb
\`\`\`

Here is how the main worker-count options compare:

| Option | Worker count | Best for |
|---|---|---|
| \`-n auto\` | One per physical core | General default, local + CI |
| \`-n logical\` | One per logical core (hyperthreads) | I/O-bound suites, oversubscription |
| \`-n 4\` | Exactly 4 | Pinning to a known runner size |
| \`-n 0\` | In-process, no workers | Debugging, \`--pdb\`, breakpoints |

You can persist a sensible default in \`pyproject.toml\` so contributors do not have to remember the flag, while still allowing override on the command line:

\`\`\`toml
[tool.pytest.ini_options]
addopts = "-n auto --dist loadscope"
\`\`\`

## Distribution Modes: loadscope, loadfile, loadgroup, worksteal

How tests get assigned to workers is controlled by \`--dist\`. The default is \`load\`, which distributes individual tests to whichever worker is free. That maximizes throughput but ignores grouping, so two tests that share an expensive module-scoped fixture might land on different workers and each pay the setup cost. The other modes trade some balance for locality.

\`\`\`bash
# Default: spread individual tests across workers as they free up
pytest -n auto --dist load

# Group by module/class scope so same-scope tests share a worker
pytest -n auto --dist loadscope

# Group by test file so an entire module runs on one worker
pytest -n auto --dist loadfile

# Group by explicit xdist_group marker
pytest -n auto --dist loadgroup

# Like load, but idle workers steal queued tests from busy ones
pytest -n auto --dist worksteal
\`\`\`

Here is what each mode actually does and when to reach for it:

| \`--dist\` mode | Grouping unit | Use when |
|---|---|---|
| \`load\` (default) | Single test | Tests are independent and fast to set up |
| \`loadscope\` | Test class, else module | Expensive class/module-scoped fixtures |
| \`loadfile\` | Test file | A whole file shares state (e.g. one DB schema) |
| \`loadgroup\` | \`xdist_group\` marker | You need explicit, hand-picked grouping |
| \`worksteal\` | Single test, rebalanced | Test durations vary wildly; avoid stragglers |

\`loadscope\` is the most commonly useful upgrade over plain \`load\`. If you have a module-scoped fixture that boots a service or builds a fixture dataset, \`loadscope\` guarantees every test in that module runs on the same worker, so the fixture is set up once per worker instead of repeatedly. \`worksteal\` is the modern answer to the classic xdist problem where one worker draws all the slow tests and finishes long after the others; idle workers reach into the busy worker's queue and pull work, keeping every core busy until the end.

## The xdist_group Marker

When you choose \`--dist loadgroup\`, you control grouping explicitly with the \`xdist_group\` marker. Every test sharing the same group name is guaranteed to run on the same worker, in any order, but never split across workers. This is the cleanest way to keep a set of tests that touch a shared, non-isolatable resource together.

\`\`\`python
import pytest


@pytest.mark.xdist_group(name="serial_db")
def test_creates_admin_user(db_session):
    db_session.execute("INSERT INTO users (role) VALUES ('admin')")
    assert db_session.scalar("SELECT count(*) FROM users") == 1


@pytest.mark.xdist_group(name="serial_db")
def test_admin_user_can_login(db_session):
    # Runs on the SAME worker as the test above, so ordering and
    # shared connection state are predictable.
    user = db_session.scalar("SELECT id FROM users WHERE role='admin'")
    assert user is not None
\`\`\`

You can also apply the marker to an entire class so every method joins the group:

\`\`\`python
@pytest.mark.xdist_group(name="payments_gateway")
class TestStripeWebhooks:
    def test_charge_succeeded(self, gateway):
        ...

    def test_charge_failed(self, gateway):
        ...
\`\`\`

Combine this with module-level \`pytestmark\` to group a whole file without repeating yourself:

\`\`\`python
import pytest

pytestmark = pytest.mark.xdist_group(name="integration_redis")


def test_cache_set(redis_client):
    ...


def test_cache_expiry(redis_client):
    ...
\`\`\`

## Fixture Isolation Across Workers

This is where most teams hit their first wall. Because each xdist worker is a *separate process*, anything that assumed a single process breaks. Module-level globals are not shared. A \`session\`-scoped fixture runs *once per worker*, not once per test run. And any fixture that writes to a shared, named resource (a fixed file path, a fixed port, a fixed database name) will collide when two workers run it simultaneously.

The fix is to make per-worker resources unique. pytest-xdist injects the worker id into the environment and exposes it via the \`worker_id\` fixture. Use it to namespace anything that must be unique per worker:

\`\`\`python
import pytest


@pytest.fixture
def worker_id_value(request):
    # "gw0", "gw1", ... when running under xdist; "master" otherwise.
    return getattr(request.config, "workerinput", {}).get("workerid", "master")


@pytest.fixture
def temp_db_name(worker_id):
    # pytest-xdist provides the built-in worker_id fixture directly.
    # worker_id is "master" when -n 0, else "gw0", "gw1", ...
    return f"test_db_{worker_id}"


@pytest.fixture
def db_connection(temp_db_name):
    create_database(temp_db_name)
    conn = connect(temp_db_name)
    yield conn
    conn.close()
    drop_database(temp_db_name)
\`\`\`

For a resource that must be built exactly once *across all workers* (not once per worker), use a file lock on shared disk. The official pattern uses pytest's \`tmp_path_factory\` to find a shared root and \`filelock\` to coordinate:

\`\`\`python
import json
import pytest
from filelock import FileLock


@pytest.fixture(scope="session")
def shared_seed_data(tmp_path_factory, worker_id):
    if worker_id == "master":
        # Not running under xdist; just build it.
        return build_seed_data()

    # Coordinate across workers using a lock on the shared temp root.
    root = tmp_path_factory.getbasetemp().parent
    data_file = root / "seed_data.json"
    with FileLock(str(data_file) + ".lock"):
        if data_file.is_file():
            data = json.loads(data_file.read_text())
        else:
            data = build_seed_data()
            data_file.write_text(json.dumps(data))
    return data
\`\`\`

The rule of thumb: any global, named, or external resource needs to be either (a) namespaced by \`worker_id\`, or (b) guarded by a cross-process lock. If you skip this, your suite will pass on \`-n 0\` and fail intermittently on \`-n auto\`, which feels exactly like flakiness.

## Shared Resources: Databases and Ports

Databases and network ports are the two resources that cause the most parallel-test pain. With four workers hitting the same Postgres database, transactions interleave, row counts are non-deterministic, and \`TRUNCATE\` in one test wipes another worker's data mid-flight.

There are three robust strategies, in increasing order of isolation:

\`\`\`python
# Strategy 1: one database per worker (strongest isolation)
@pytest.fixture(scope="session")
def database_url(worker_id):
    base = "postgresql://localhost/app"
    if worker_id == "master":
        return base + "_test"
    return f"{base}_test_{worker_id}"  # app_test_gw0, app_test_gw1, ...
\`\`\`

For ports, never hardcode. Bind to port 0 and let the OS hand you a free one, or offset by worker index:

\`\`\`python
import socket
import pytest


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture
def http_server():
    port = _free_port()  # unique per call, no collisions across workers
    server = start_server(port=port)
    yield f"http://127.0.0.1:{port}"
    server.stop()
\`\`\`

Here is how the database isolation strategies stack up:

| Strategy | Isolation | Cost | Notes |
|---|---|---|---|
| One DB per worker | Highest | DB creation per worker | Use \`worker_id\` in the DB name |
| One schema per worker | High | Schema setup per worker | Same server, separate namespaces |
| Transaction rollback per test | Medium | Cheap | Needs nested transactions/savepoints |
| Shared DB + \`xdist_group\` serial | Low | Cheapest | Pin contending tests to one worker |

If full isolation is too expensive, fall back to pinning the contending tests into a single \`xdist_group\` so they run serially on one worker while everything else parallelizes freely.

## Flakiness Caused by Parallelism

A test that passes serially but fails under \`-n auto\` is almost never a "random" failure. Parallelism does not introduce randomness; it exposes hidden coupling and order dependence that were already in your suite. The usual culprits:

- **Order dependence.** A test that only passes because an earlier test left state behind. Under xdist the earlier test may run on a different worker.
- **Shared mutable state.** A module-level list, a singleton cache, or a class attribute mutated by one test and read by another.
- **External resource contention.** Two workers writing the same file, table, or fixed port.
- **Time and ordering assumptions.** Code that assumes IDs are sequential or that "the most recent row" is deterministic.

A fast way to surface order dependence even without xdist is to randomize order with [pytest-randomly](https://pypi.org/project/pytest-randomly/), then fix what breaks before adding parallelism:

\`\`\`bash
pip install pytest-randomly
pytest -p randomly          # shuffles test order, reveals coupling
\`\`\`

To reproduce an xdist-specific failure, drop to fewer workers and re-run, or pin the failing tests to one group:

\`\`\`bash
# Reproduce with the same worker count
pytest -n 4 tests/test_orders.py

# Or isolate to a single worker to confirm it is a parallelism issue
pytest -n 1 tests/test_orders.py
\`\`\`

For deeper, systematic strategies on quarantining and fixing intermittent failures, see our [guide to fixing flaky tests](/blog/fix-flaky-tests-guide). The key mindset: treat every parallel-only failure as a real isolation bug to fix, not a flake to retry.

## Combining pytest-xdist with pytest-cov

Coverage and parallel execution interact carefully because each worker is a separate process collecting its own coverage data. The good news is that [pytest-cov](https://pypi.org/project/pytest-cov/) handles this transparently: it starts coverage in each worker, then combines the per-worker data files automatically at the end.

\`\`\`bash
pytest -n auto --cov=src --cov-report=term-missing --cov-report=xml
\`\`\`

You do not need any special flags to make coverage work under xdist; pytest-cov detects the workers and merges results. A couple of practical notes:

\`\`\`toml
[tool.coverage.run]
# Required for branch coverage to merge correctly across workers.
parallel = true
branch = true
source = ["src"]

[tool.coverage.report]
show_missing = true
fail_under = 85
\`\`\`

Setting \`parallel = true\` under \`[tool.coverage.run]\` tells coverage.py to write process-suffixed data files (\`.coverage.hostname.pid.xxxx\`) so the merge does not clobber. With that in place, your combined report reflects every line touched by every worker, and \`fail_under\` still gates the build correctly. The one thing to avoid is hand-rolling \`coverage combine\` in CI after a pytest-cov run, which double-processes the data; let the plugin do it.

## Using pytest-xdist in CI

In CI, the goal is to use exactly as many workers as the runner has cores, fail fast, and produce machine-readable reports. A GitHub Actions job looks like this:

\`\`\`yaml
name: tests
on: [push, pull_request]

jobs:
  pytest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -e ".[test]"
      - name: Run tests in parallel
        run: |
          pytest -n auto --dist loadscope \\
            --cov=src --cov-report=xml \\
            --junitxml=report.xml --maxfail=1
\`\`\`

Two flags matter beyond \`-n auto\`. \`--maxfail=1\` stops the run on the first failure to save runner minutes on a clearly broken branch. \`--junitxml\` emits a report your CI can render as annotations. For very large suites, combine xdist (parallel within a job) with matrix sharding (parallel across jobs) using \`--splits\` / \`--group\` from [pytest-split](https://pypi.org/project/pytest-split/) or the \`--dist\` plus a shard index, so each of N jobs runs a slice and each slice fans out across cores.

Pin the worker count explicitly when your runner misreports cores. Some containerized runners advertise the host's full core count via \`os.cpu_count()\` while only granting a fraction, so \`-n auto\` over-subscribes and *slows down*. If you see that, hardcode \`-n 4\` (or whatever the runner truly grants) instead of \`auto\`.

## When NOT to Parallelize

Parallelism is not always a win. Reach for \`-n 0\` (or simply omit \`-n\`) in these cases:

- **Small suites.** Below roughly 50 tests, the cost of spawning workers and serializing results outweighs the savings. The startup overhead can make \`-n auto\` *slower* than serial.
- **Heavily shared, hard-to-isolate state.** If almost every test touches one global resource you cannot namespace, you will spend more time fighting isolation than you save in wall-clock time.
- **Debugging.** Breakpoints, \`--pdb\`, and \`-s\` (capturing disabled) behave unpredictably across worker subprocesses. Debug with \`-n 0\`.
- **Strict ordering requirements.** Suites that genuinely must run in a fixed sequence (rare, and usually a smell) cannot be naively parallelized.
- **CPU-bound code already using all cores.** If your tests spin up multiprocessing internally, adding xdist workers oversubscribes the CPU and thrashes.

Here is a quick decision guide:

| Situation | Recommendation |
|---|---|
| Suite > 200 tests, mostly isolated | \`-n auto --dist loadscope\` |
| Expensive per-module fixtures | \`-n auto --dist loadfile\` |
| Mixed: some serial, mostly parallel | Parallel default + \`xdist_group\` for the serial ones |
| Tiny suite (< 50 tests) | \`-n 0\` (serial is faster) |
| Debugging a failure | \`-n 0 -x --pdb\` |

The honest summary: turn on \`-n auto\` once your suite crosses a couple hundred tests and the wall-clock time starts to annoy people, fix the isolation bugs it surfaces (do not retry them away), and use \`xdist_group\` plus per-worker resource namespacing to handle the handful of tests that genuinely cannot run concurrently. For broader coverage of building maintainable Python tests, the [pytest best practices guide](/blog/pytest-best-practices-2026) pairs well with this one, and if you are just getting oriented, [what is pytest in Python](/blog/what-is-pytest-python-explained) is the right starting point.

## Frequently Asked Questions

### What does pytest -n auto do?

\`pytest -n auto\` tells pytest-xdist to run your tests in parallel using one worker process per physical CPU core. The plugin spawns a controller plus N worker subprocesses, distributes tests across them, and aggregates the results. On a 4-core runner you get 4 workers, roughly cutting wall-clock time by up to 4x for an isolated, well-balanced suite.

### What is the difference between --dist loadscope and loadfile?

\`loadscope\` groups tests by their smallest scope, a test class if present, otherwise the module, so same-scope tests run on one worker and share scoped fixtures. \`loadfile\` groups by the entire test file, guaranteeing every test in that file runs on the same worker. Use \`loadscope\` for expensive class fixtures and \`loadfile\` when a whole file shares one setup like a database schema.

### Why do my tests pass serially but fail with pytest-xdist?

Parallelism does not add randomness; it exposes hidden coupling. The usual causes are order dependence (one test relies on state another test created), shared mutable globals, or contention over a fixed resource like a database, file, or port. Each xdist worker is a separate process, so these break. Namespace resources by \`worker_id\` and remove shared state to fix it.

### How do I run pytest-xdist with coverage?

Install pytest-cov and run \`pytest -n auto --cov=src --cov-report=xml\`. pytest-cov starts coverage in each worker and merges the per-worker data automatically, so no extra flags are needed. Set \`parallel = true\` and \`branch = true\` under \`[tool.coverage.run]\` in \`pyproject.toml\` so branch data combines correctly, and keep \`fail_under\` to gate the build.

### How do I make some tests run serially while others run in parallel?

Apply the \`@pytest.mark.xdist_group(name="...")\` marker to the tests that must not run concurrently, give them the same group name, and run with \`--dist loadgroup\`. Every test sharing that group name runs on a single worker, in sequence, while all other tests still fan out across the remaining workers. This is the cleanest way to serialize a contending subset.

### Does pytest-xdist run session-scoped fixtures only once?

No. Because each worker is a separate process, a \`session\`-scoped fixture runs once *per worker*, not once for the whole run. If a fixture must execute exactly once across all workers, coordinate with a file lock using \`tmp_path_factory.getbasetemp().parent\` as the shared root and \`filelock.FileLock\`, then have non-first workers read the already-built result.

### When should I not use pytest-xdist?

Skip parallelism for very small suites (under about 50 tests) where worker startup overhead exceeds the savings, when debugging with \`--pdb\` or \`-s\` (subprocess workers make breakpoints unreliable), and when nearly every test shares one resource you cannot isolate. In those cases run \`-n 0\` for in-process execution that is faster and far easier to debug.

### How many workers should I use in CI?

Start with \`-n auto\` so the worker count matches the runner's cores. But some containerized CI runners report the host's full core count while granting only a slice of it, causing \`auto\` to oversubscribe and slow down. If you see that, hardcode the worker count to what the runner actually provides, for example \`-n 4\`, and combine with matrix sharding across jobs for very large suites.
`,
};
