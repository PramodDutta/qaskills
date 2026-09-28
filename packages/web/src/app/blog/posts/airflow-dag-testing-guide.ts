import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Apache Airflow DAGs with pytest: Integrity, Unit, and Integration Tests',
  description: 'Airflow DAG testing guide for pytest users: validate imports, task logic, dag.test runs, fixtures, mocks, Docker checks, CI gates, and data contracts.',
  date: '2026-09-28',
  category: 'Tutorial',
  content: `
# Testing Apache Airflow DAGs with pytest: Integrity, Unit, and Integration Tests

Airflow DAG testing is the practice of proving that workflow files import cleanly, define the graph you expect, run task logic with controlled inputs, and survive a realistic Airflow runtime before they reach the scheduler. In 2026, Apache Airflow is actively maintained, Airflow 3.x is the current major line, and the latest release I verified is 3.3.2 from September 17, 2026. The most important Airflow 3 testing change is that DAG authors should import authoring primitives from \`airflow.sdk\`, while many legacy Airflow 2 examples still import directly from older internal modules.

Use pytest as the control plane for three layers: DAG integrity tests with \`DagBag\`, unit tests for pure Python transformation code and TaskFlow callables, and integration tests that execute a small DAG run through \`dag.test()\` or \`airflow dags test\`. The payoff is not just a green CI job. It is a reviewable contract for schedules, task IDs, retries, pools, variables, connections, side effects, and data quality handoffs.

This guide assumes you are a QA or test automation engineer maintaining DAGs with help from Claude Code, Cursor, Copilot, or another AI coding agent. The agent can write a lot of boilerplate quickly, but it will also copy old Airflow 2 imports, invent provider paths, or turn every task into a slow integration test unless you give it a layered test strategy.

If your DAGs orchestrate data checks rather than only application jobs, pair the workflow tests here with [metamorphic testing for data pipelines](/blog/metamorphic-testing-data-pipelines-guide) and [Great Expectations data quality testing](/blog/great-expectations-data-quality-testing-guide). Those checks validate the data contract after Airflow proves the schedule, graph, and runtime wiring.

## The Current Airflow Testing Surface

Airflow 3 did not discontinue DAG testing. It did change the safest authoring surface. The official Airflow 3 public interface documentation says DAG authors should use the \`airflow.sdk\` namespace for objects such as \`DAG\`, \`@dag\`, \`@task\`, \`Variable\`, \`Connection\`, and \`get_current_context\`. The Airflow 3.0 release notes also call out provider import movement, including standard operators under \`airflow.providers.standard\`.

\`DagBag\` still exists and is documented as the collection that parses DAGs from a folder tree, but Airflow labels it as an internal loading mechanism rather than the preferred authoring API. That nuance matters: use \`DagBag\` in tests to catch import failures and duplicate IDs, but do not teach authors to build DAGs through \`DagBag\`.

| Test layer | What it proves | Fast signal | Failure that it catches |
|---|---|---|---|
| Static lint and import | DAG files are syntactically valid and importable | Seconds | Removed Airflow 2 import, missing provider package, accidental network call at import time |
| DAG integrity | IDs, schedules, owners, tags, and dependencies match policy | Seconds to a minute | Duplicate task ID, unpaused catchup DAG, unexpected schedule |
| Unit tests | Business logic works without a scheduler | Seconds | Bad date parsing, null handling, SQL builder bug, malformed payload |
| Local DAG execution | Airflow runtime can execute a tiny run | Minutes | XCom mismatch, templating error, connection lookup error |
| Container integration | The same image and providers work in CI | Minutes to tens of minutes | Provider not installed in image, DB migration issue, runtime-only dependency gap |

What people get wrong: they start by running a full DAG as the first test. That makes the suite slow, hides the cause of failures, and encourages broad mocking of Airflow internals. Start with import and graph contracts, unit test the code that actually transforms data, then run one or two execution paths that represent release risk.

## Project Layout That Makes DAGs Testable

A testable Airflow repository separates orchestration from business logic. The DAG file should be boring: declare schedule, tasks, dependencies, and small TaskFlow wrappers. The transformation code should live in normal Python modules that pytest can import without creating an Airflow metadata database.

| Path | Responsibility | Test style |
|---|---|---|
| \`dags/orders_daily.py\` | DAG definition, TaskFlow wrappers, dependencies | \`DagBag\` import and graph assertions |
| \`src/orders/normalize.py\` | Pure data validation and normalization | Plain pytest unit tests |
| \`tests/dag_integrity/\` | DAG policy checks across all DAGs | Shared \`DagBag\` fixture |
| \`tests/unit/\` | Fast tests for task logic | Parametrized pytest tests |
| \`tests/integration/\` | \`dag.test()\` and CLI smoke checks | Marked as integration |
| \`docker-compose.yml\` | Airflow services for local and CI smoke | Small runtime verification |

\`\`\`toml
[project]
name = "airflow-dag-tests"
version = "0.1.0"
requires-python = ">=3.11,<3.13"
dependencies = [
  "apache-airflow==3.3.2",
  "apache-airflow-providers-standard==1.19.0",
  "pendulum>=3.0.0",
]

[dependency-groups]
dev = [
  "pytest>=8.0.0",
  "ruff>=0.13.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
markers = [
  "integration: requires an initialized Airflow runtime",
  "dag_integrity: parses DAG files and validates graph policy",
]
addopts = "-ra --strict-markers"
\`\`\`

The provider pin above is illustrative. Verify provider versions against your lockfile, because Airflow providers release independently. The important pattern is that the same provider set used by the scheduler should be installed in CI. A DAG that imports locally but fails inside the production image is usually a packaging problem, not a pytest problem.

## A Small DAG With Testable Task Logic

The cleanest DAG test is the one that does not need Airflow at all. Put domain behavior in a normal function, wrap it with \`@task\`, and test the function directly. The DAG below uses Airflow 3 authoring imports, a deterministic start date, and no top-level API calls.

\`\`\`python
# dags/orders_daily.py
from __future__ import annotations

import pendulum
from airflow.sdk import dag, task


def normalize_order(raw: dict[str, object]) -> dict[str, object]:
    order_id = str(raw.get("order_id", "")).strip()
    country = str(raw.get("country", "")).strip().upper()
    cents = int(raw.get("amount_cents", 0))
    if not order_id:
        raise ValueError("order_id is required")
    if cents < 0:
        raise ValueError("amount_cents must be non-negative")
    return {
        "order_id": order_id,
        "country": country,
        "amount_cents": cents,
    }


@dag(
    dag_id="orders_daily",
    schedule="@daily",
    start_date=pendulum.datetime(2026, 1, 1, tz="UTC"),
    catchup=False,
    tags=["orders", "qa-owned"],
)
def orders_daily():
    @task
    def extract() -> dict[str, object]:
        return {"order_id": "A-100", "country": "us", "amount_cents": 1299}

    @task
    def normalize(raw: dict[str, object]) -> dict[str, object]:
        return normalize_order(raw)

    @task
    def publish(order: dict[str, object]) -> str:
        return str(order["order_id"])

    publish(normalize(extract()))


orders_daily()
\`\`\`

This shape gives an AI coding agent a safe target: change \`normalize_order\` when the data rule changes, and change the DAG only when orchestration changes. If the agent edits both at once, reviewers can ask which layer failed and which test proves the fix.

## DAG Integrity Tests With DagBag

\`DagBag\` tests are the quickest way to catch broken imports before the scheduler does. They should answer concrete questions: did every DAG parse, did the expected DAG load, did the graph contain the expected task IDs, and did policy constraints hold? They should not execute the whole pipeline.

\`\`\`python
# tests/conftest.py
from __future__ import annotations

from pathlib import Path

import pytest
from airflow.models.dagbag import DagBag


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DAGS_DIR = PROJECT_ROOT / "dags"


@pytest.fixture(scope="session")
def dagbag() -> DagBag:
    return DagBag(dag_folder=str(DAGS_DIR), include_examples=False)
\`\`\`

\`\`\`python
# tests/dag_integrity/test_orders_daily.py
from __future__ import annotations


def test_dagbag_has_no_import_errors(dagbag):
    assert dagbag.import_errors == {}


def test_orders_daily_graph_contract(dagbag):
    dag = dagbag.get_dag("orders_daily")

    assert dag is not None
    assert dag.schedule == "@daily"
    assert dag.catchup is False
    assert {"orders", "qa-owned"}.issubset(set(dag.tags))
    assert sorted(task.task_id for task in dag.tasks) == [
        "extract",
        "normalize",
        "publish",
    ]
    assert dag.get_task("publish").upstream_task_ids == {"normalize"}
    assert dag.get_task("normalize").upstream_task_ids == {"extract"}
\`\`\`

Two details are deliberate. First, the import error assertion compares to an empty dictionary, so the failure prints the exact files and tracebacks. Second, the dependency assertions check both presence and direction. A weak test that only checks \`len(dag.tasks) == 3\` can pass after a dependency is accidentally removed.

## Unit Testing TaskFlow Functions Without A Scheduler

TaskFlow makes it easy to blur the line between Python functions and Airflow tasks. Keep one pure function behind every nontrivial task, and unit test that function. You do not need a scheduler to prove basic rules.

\`\`\`python
# tests/unit/test_normalize_order.py
from __future__ import annotations

import pytest

from dags.orders_daily import normalize_order


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (
            {"order_id": " A-100 ", "country": "us", "amount_cents": "1299"},
            {"order_id": "A-100", "country": "US", "amount_cents": 1299},
        ),
        (
            {"order_id": "B-200", "country": "in", "amount_cents": 0},
            {"order_id": "B-200", "country": "IN", "amount_cents": 0},
        ),
    ],
)
def test_normalize_order_returns_canonical_payload(raw, expected):
    assert normalize_order(raw) == expected


def test_normalize_order_rejects_missing_order_id():
    with pytest.raises(ValueError, match="order_id is required"):
        normalize_order({"country": "US", "amount_cents": 100})


def test_normalize_order_rejects_negative_amount():
    with pytest.raises(ValueError, match="amount_cents must be non-negative"):
        normalize_order({"order_id": "A-100", "country": "US", "amount_cents": -1})
\`\`\`

These are the tests you want an agent to run after every small edit. They are cheap, deterministic, and meaningful. The exception checks are anchored to the behavior, not just the exception type, which keeps accidental broad exceptions from looking correct.

## Testing Variables, Connections, And Runtime Context

Airflow variables and connections create most local testing surprises. The official connection docs confirm that environment-backed connections use \`AIRFLOW_CONN_{CONN_ID}\` in uppercase and can contain either a URI or JSON value. Airflow variables can also be supplied as environment variables with \`AIRFLOW_VAR_{KEY}\`. Environment-backed values may not appear in the UI, which is a feature for secret injection, not a sign that the test setup failed.

| Runtime dependency | Unit test approach | Integration test approach | Common mistake |
|---|---|---|---|
| Connection URI | Inject a function argument or set \`AIRFLOW_CONN_...\` | Use a test secret or local service URI | Creating real production connections in CI |
| Variable | Pass config as data or set \`AIRFLOW_VAR_...\` | Seed a value before \`dag.test()\` | Reading variables at module import time |
| Current context | Pass dates explicitly to pure functions | Use \`get_current_context()\` inside a task | Calling context APIs outside task execution |
| External API | Fake the client and assert request payload | Hit a sandbox endpoint only in marked tests | Mocking so deeply that no payload is verified |

\`\`\`python
# tests/unit/test_runtime_config.py
from __future__ import annotations

from airflow.sdk import Variable


def bucket_name() -> str:
    return Variable.get("raw_orders_bucket")


def test_bucket_name_comes_from_airflow_variable(monkeypatch):
    monkeypatch.setenv("AIRFLOW_VAR_RAW_ORDERS_BUCKET", "qa-orders-landing")

    assert bucket_name() == "qa-orders-landing"
\`\`\`

The important testing rule is to avoid top-level runtime lookups in DAG files. If a DAG reads a variable during import, a missing value breaks \`DagBag\` parsing and the scheduler may fail before a task has a chance to run. Read variables inside tasks or pass configuration through stable deployment mechanisms.

## Running A DAG Locally With dag.test

The official debugging docs describe \`dag.test()\` as a way to run a DAG in a single serialized Python process. It can run locally without an executor by default, and it accepts options such as an execution date and \`use_executor\`. The CLI reference also documents \`airflow dags test\`, including \`--dagfile-path\`, \`--conf\`, \`--mark-success-pattern\`, \`--save-dagrun\`, \`--show-dagrun\`, and \`--use-executor\`.

\`\`\`python
# scripts/run_orders_daily.py
from __future__ import annotations

import pendulum

from dags.orders_daily import orders_daily


dag = orders_daily()

if __name__ == "__main__":
    dag.test(execution_date=pendulum.datetime(2026, 9, 28, tz="UTC"))
\`\`\`

\`\`\`bash
airflow dags test orders_daily 2026-09-28 --dagfile-path dags/orders_daily.py --mark-success-pattern '^wait_for_'
\`\`\`

\`dag.test()\` is excellent for debugging because it fails close to the Python code. The CLI is better when you want a CI check that resembles the operator workflow and uses the initialized Airflow home. Use \`--mark-success-pattern\` only for tasks that are intentionally out of scope, such as a sensor that waits on a production-only dependency. Do not mark a broken transform as successful just to keep a smoke test green.

## Container Integration With Docker Compose

Unit tests can pass while the Airflow image is missing a provider package. A container smoke test catches that gap. Keep it narrow: initialize the metadata database, parse DAGs, then test one tiny DAG run. The goal is not to recreate production. It is to prove the image, providers, environment, and DAG folder agree.

| Check | Command shape | Good signal | Bad signal |
|---|---|---|---|
| Airflow version | \`airflow version\` | Image uses the pinned release | Local pip version differs from image |
| DB migration | \`airflow db migrate\` | Metadata schema initializes | Constraint or dependency conflict |
| DAG list | \`airflow dags list\` | DAG imports in container | Missing provider, import-time variable read |
| DAG execution | \`airflow dags test\` | Runtime templating and task execution work | Connection, XCom, or provider mismatch |

\`\`\`yaml
# docker-compose.test.yml
services:
  airflow-test:
    image: apache/airflow:3.3.2
    environment:
      AIRFLOW__CORE__LOAD_EXAMPLES: "false"
      AIRFLOW__CORE__EXECUTOR: LocalExecutor
      AIRFLOW__DATABASE__SQL_ALCHEMY_CONN: sqlite:////tmp/airflow-ci.db
      AIRFLOW_VAR_RAW_ORDERS_BUCKET: qa-orders-landing
      AIRFLOW_CONN_WAREHOUSE: sqlite:////tmp/warehouse.db
    volumes:
      - ./dags:/opt/airflow/dags:ro
      - ./src:/opt/airflow/src:ro
    command: >
      bash -c "airflow db migrate &&
      airflow dags list &&
      airflow dags test orders_daily 2026-09-28 --dagfile-path /opt/airflow/dags/orders_daily.py"
\`\`\`

If this fails with an import error that pytest did not catch, compare the Python path and installed packages between local tests and the container. If it fails only at task execution, look for context, secrets, templates, XCom serialization, or provider-specific runtime dependencies.

## CI Gates For Pull Requests And Nightly Runs

Pull request checks should be fast enough that developers trust them. Nightly checks can afford Docker and broader DAG execution. GitHub Actions current majors include \`actions/checkout@v7\`, \`actions/setup-python@v7\`, and \`actions/upload-artifact@v7\`; pin your own dependency versions with a lockfile or constraints.

\`\`\`yaml
name: airflow-dag-tests

on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: "17 2 * * *"

jobs:
  pytest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: "3.11"
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          python -m pip install -e ".[dev]"
      - name: Static checks
        run: ruff check dags src tests
      - name: Fast pytest
        run: pytest -m "not integration" --maxfail=3

  airflow-runtime-smoke:
    runs-on: ubuntu-latest
    if: github.event_name != 'pull_request'
    steps:
      - uses: actions/checkout@v7
      - name: Run container smoke
        run: docker compose -f docker-compose.test.yml up --abort-on-container-exit --exit-code-from airflow-test
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: airflow-runtime-\${{ github.run_id }}
          path: logs
          if-no-files-found: ignore
\`\`\`

The split is intentional. Pull requests run \`pytest -m "not integration"\`, while scheduled or main-branch checks run the container smoke. If your repository has hundreds of DAGs, add changed-file selection later, but keep at least one full parse run on a schedule so hidden import drift does not accumulate.

## Diagnosing A Realistic Failure Mode

Imagine CI reports this failure:

\`\`\`text
E   ModuleNotFoundError: No module named 'airflow.operators.python'
\`\`\`

Diagnosis in Airflow 3: many examples written for Airflow 2 imported \`PythonOperator\` from \`airflow.operators.python\`. Airflow 3 release notes say legacy imports are deprecated and standard operators should come from the standard provider. The fix is to install the provider used by production and update the import path, or better, move simple Python work to TaskFlow with \`@task\`.

\`\`\`python
# Airflow 3 standard provider import when an operator is still needed
from airflow.providers.standard.operators.python import PythonOperator
\`\`\`

Another common failure is \`KeyError\` or \`AirflowNotFoundException\` during \`DagBag\` import because a DAG reads a variable at module import time. Move that lookup inside a task, or supply the variable through an environment variable in the test process. Import tests should be boring; runtime configuration belongs at runtime.

## Where Agent-Generated Tests Need Review

AI coding agents are useful for expanding fixtures and table-driven tests, but they tend to over-mock Airflow. Ask the agent for tests that assert graph contracts and side effects, not just that a method was called. For example, a publish task test should verify the exact payload or target partition. A DAG integrity test should verify dependency direction. A retry policy test should verify retry delay and owner, not only that the DAG exists.

Ready-made QA skills install from qaskills.sh with the qaskills CLI, but the skill still needs repository-specific constraints: Airflow version, provider set, DAG folder, secrets strategy, CI runner, and which DAGs are allowed to hit external services.

The best guardrail is a checklist in the prompt: use Airflow 3 imports, avoid top-level network calls, keep unit tests independent of the scheduler, use pytest markers for integration, and run \`DagBag\` before container smoke. That turns the agent from a snippet generator into a test maintainer.

## Frequently Asked Questions

### Should I use DagBag in Airflow 3 tests if it is internal?

Yes, for integrity tests, with the right framing. Airflow 3 documentation describes \`DagBag\` as the loader that parses DAGs from folders, and notes that DAG authors should use \`airflow.sdk\` for authoring. That means \`DagBag\` is reasonable in a test harness that checks import errors and graph contracts. It should not become the pattern for writing DAGs. Keep authoring examples on \`@dag\`, \`@task\`, and other public \`airflow.sdk\` imports.

### Is dag.test enough for production confidence?

\`dag.test()\` is a strong local execution check, but it is not a complete production simulation. By default it runs tasks locally in one process, which is exactly why it is useful for debugging. It does not prove your Kubernetes executor, Celery workers, external secrets backend, or production network policy. Use it for fast runtime confidence, then add a narrow container or environment smoke test for image, provider, metadata database, and secret wiring.

### How many DAG integration tests should run on every pull request?

Run the smallest set that catches release-blocking mistakes without making developers wait. A good default is all import and DAG integrity tests on every pull request, pure unit tests for touched packages, and one or two integration tests only when they are deterministic and under a few minutes. Put broader \`airflow dags test\` and Docker Compose checks on main or nightly. Slow, flaky PR gates train teams to ignore red builds.

### What is the safest way to mock Airflow connections and variables?

Prefer environment-backed values for tests that need Airflow lookup behavior. Use \`AIRFLOW_CONN_MY_CONN_ID\` for connections and \`AIRFLOW_VAR_MY_KEY\` for variables, with uppercase names. For pure unit tests, pass configuration as function arguments instead of calling Airflow APIs. Avoid writing production-like secrets into the metadata database during CI. Also avoid reading variables at DAG import time, because that turns configuration absence into a parsing failure.
`,
};
