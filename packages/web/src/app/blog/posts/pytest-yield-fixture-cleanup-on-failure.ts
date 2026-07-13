import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Ensure pytest Yield-Fixture Cleanup After Failure',
  description:
    'Make pytest yield-fixture cleanup reliable when tests or setup fail, using safe fixture boundaries, finalizers, context managers, and verified teardown.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Ensure pytest Yield-Fixture Cleanup After Failure

The test has already failed, but the harder problem is still running: a temporary customer remains in the shared sandbox and poisons the next case. A pytest yield fixture normally gives teardown a dependable place to live, yet one important boundary determines whether that code is ever reached. Code after \`yield\` runs when the test fails; it does not run when the same fixture raises before yielding.

That distinction explains many cleanup leaks blamed on pytest. The runner can finalize fixtures that completed setup, but it cannot execute the post-yield half of a generator that never yielded. Reliable design therefore separates state-changing operations, registers cleanup at the right moment, and makes each release safe even when the resource is already gone.

## Follow the control flow around yield

A yield fixture has three moments: acquire, hand the value to the test, and release. Pytest pauses the fixture at \`yield value\`, executes the dependent test and fixtures, then resumes it for teardown. An assertion failure, skip during the test, or exception in a dependent fixture does not normally prevent that resume.

The setup side is different. If acquisition code raises before \`yield\`, the fixture has not supplied a value and its post-yield section is not scheduled. Fixtures that successfully completed earlier are still finalized in reverse order.

| Failure location | Does this fixture reach post-yield code? | What pytest still cleans |
| --- | --- | --- |
| Test assertion | Yes | This fixture and every completed dependency |
| Test raises an application exception | Yes | This fixture and every completed dependency |
| Dependent fixture fails after this fixture yielded | Yes | This already completed fixture |
| Fixture raises before \`yield\` | No | Other fixtures that completed setup |
| Teardown statement itself raises | Remaining finalizers are still attempted | Other registered fixture finalizers |
| Process is force-killed | No guarantee | Operating system resources only, where applicable |

Do not read this as a reason to avoid yield fixtures. They are the clearest default for one acquisition paired with one release. The design error is placing several state changes before a single yield and assuming the trailing cleanup covers every partial state.

The [pytest fixture scope guide](/blog/pytest-fixtures-scope-complete-guide) explains how function, class, module, package, and session lifetimes affect when finalization occurs. Scope changes duration, but not the before-yield boundary.

## A fixture that leaks during partial setup

This compact fixture creates a project, adds a member, and enables billing before yielding. If adding the member fails after the project was created, none of the deletion statements execute.

\`\`\`python
import pytest

@pytest.fixture
def billed_project(admin_client):
    project = admin_client.create_project(name="cleanup-example")
    member = admin_client.add_member(project["id"], "qa@example.test")
    admin_client.enable_billing(project["id"])

    yield project

    admin_client.disable_billing(project["id"])
    admin_client.remove_member(project["id"], member["id"])
    admin_client.delete_project(project["id"])
\`\`\`

The fixture also has a teardown fragility. If disabling billing raises, the member and project deletion lines are skipped. Pytest can continue with finalizers owned by other fixtures, but it cannot infer the rest of this function's intended rollback.

One large fixture gives attractive indentation and poor failure isolation. The safer shape is one state-changing action per fixture, with the cleanup adjacent to that action. Dependencies compose the scenario.

## Split state changes into independently finalizable fixtures

The following runnable example uses a small in-memory administration client, allowing the teardown behavior to be tested without a network. Each fixture owns exactly one mutation. If \`member\` setup fails, \`project\` has already yielded and pytest deletes it.

\`\`\`python
from dataclasses import dataclass, field
import pytest

@dataclass
class AdminClient:
    projects: dict[str, dict] = field(default_factory=dict)
    members: dict[str, set[str]] = field(default_factory=dict)

    def create_project(self, project_id: str) -> dict:
        project = {"id": project_id, "billing": False}
        self.projects[project_id] = project
        self.members[project_id] = set()
        return project

    def delete_project(self, project_id: str) -> None:
        self.members.pop(project_id, None)
        self.projects.pop(project_id, None)

    def add_member(self, project_id: str, email: str) -> str:
        if project_id not in self.projects:
            raise LookupError(project_id)
        self.members[project_id].add(email)
        return email

    def remove_member(self, project_id: str, email: str) -> None:
        self.members.get(project_id, set()).discard(email)

@pytest.fixture
def admin_client():
    return AdminClient()

@pytest.fixture
def project(admin_client, request):
    project_id = f"project-{request.node.name}"
    value = admin_client.create_project(project_id)
    yield value
    admin_client.delete_project(project_id)

@pytest.fixture
def member(admin_client, project):
    email = "qa@example.test"
    admin_client.add_member(project["id"], email)
    yield email
    admin_client.remove_member(project["id"], email)

def test_member_can_access_project(admin_client, project, member):
    assert member in admin_client.members[project["id"]]
    pytest.fail("demonstrate that both teardowns still run")
\`\`\`

Setup order follows dependency order: \`admin_client\`, \`project\`, then \`member\`. Teardown reverses the resource chain: remove the member, then delete the project. The test's deliberate failure does not change that sequence.

The client fixture returns rather than yields because it owns no external resource. Not every fixture needs teardown. Adding a ceremonial yield would imply a lifecycle that does not exist.

## Protect acquisition sequences with try and finally

Sometimes a resource cannot be decomposed cleanly. Opening a temporary directory, writing configuration, and starting a subprocess may be one cohesive fixture. Python's \`try/finally\` or a context manager can cover exceptions that occur before pytest reaches the fixture yield.

\`\`\`python
import subprocess
import sys
import pytest

@pytest.fixture
def worker_process(tmp_path):
    process = None
    try:
        config = tmp_path / "worker.json"
        config.write_text('{"port": 8123}', encoding="utf-8")
        process = subprocess.Popen(
            [sys.executable, "-m", "example_worker", str(config)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        if process.poll() is not None:
            raise RuntimeError("worker exited during startup")

        yield process
    finally:
        if process is not None and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
\`\`\`

If configuration writing fails, no process exists and cleanup is a no-op. If the process starts but the readiness check fails, \`finally\` terminates it even though the fixture never yielded. After a successful test, the same finally block performs normal teardown.

Avoid catching \`BaseException\` merely to clean up and then forgetting to re-raise. A finally block preserves the original failure unless cleanup itself raises. When cleanup can fail, decide which error should be primary and record secondary cleanup evidence without erasing the setup or test traceback.

## When request.addfinalizer is the precise tool

\`request.addfinalizer(callable)\` registers cleanup immediately. It is useful when setup performs incremental mutations and each successful mutation needs a rollback before the next risky operation. Register a finalizer only after the corresponding resource exists. Registering it too early may call deletion with an uninitialized identifier; registering too late recreates the leak window.

Pytest runs finalizers in last-in, first-out order. That makes the registration sequence part of the lifecycle contract.

\`\`\`python
import pytest

@pytest.fixture
def provisioned_account(request, account_api):
    account = account_api.create_account(plan="trial")
    request.addfinalizer(
        lambda: account_api.delete_account(account["id"], missing_ok=True)
    )

    token = account_api.issue_token(account["id"])
    request.addfinalizer(lambda: account_api.revoke_token(token, missing_ok=True))

    account_api.verify_access(token)
    return {"account": account, "token": token}
\`\`\`

If token issuance fails, account deletion is already registered. If access verification fails, token revocation runs first, followed by account deletion. Returning a value is sufficient because finalizers, rather than generator resumption, own cleanup.

This mechanism is more verbose and easier to misuse than a focused yield fixture. Prefer yield for a simple pair. Reach for direct finalizers when rollback must be armed between multiple setup steps or a fixture factory creates a variable number of resources.

| Pattern | Best fit | Main hazard |
| --- | --- | --- |
| Yield fixture | One resource with one clear release | Post-yield code is not reached after pre-yield failure |
| Separate dependent yield fixtures | Several independently owned mutations | Too many tiny fixtures can obscure the scenario |
| \`try/finally\` around yield | Cohesive acquisition with partial-failure risk | Cleanup error can mask the original exception |
| \`request.addfinalizer\` | Incremental or variable resource creation | Registering before acquisition can delete the wrong state |
| Context manager | Resource already has enter/exit semantics | Its exit behavior must tolerate the relevant failures |

## Context managers make ownership explicit

If application support code already exposes a context manager, use it inside the fixture. Python calls \`__exit__\` when the body raises, including an exception before the fixture yields.

\`\`\`python
from contextlib import contextmanager
import pytest

@contextmanager
def temporary_feature_flag(flag_client, name: str):
    previous = flag_client.get(name)
    flag_client.set(name, True)
    try:
        yield
    finally:
        flag_client.set(name, previous)

@pytest.fixture
def exports_enabled(flag_client):
    with temporary_feature_flag(flag_client, "invoice-exports"):
        flag_client.wait_until_visible("invoice-exports", expected=True)
        yield

def test_export_button(exports_enabled, browser_page):
    assert browser_page.export_button_is_visible()
\`\`\`

If the visibility wait fails, control exits the \`with\` block and restores the previous flag value. This is stronger than putting restoration only after the fixture yield.

Restoring previous state is often safer than blindly setting a default. A shared sandbox flag may have been enabled before the test began. Cleanup should reverse this test's mutation, not impose an assumed global value.

## Make teardown idempotent and narrowly tolerant

Cleanup runs in an imperfect world. The test may delete its own object, a TTL worker may expire it, or a retry may encounter residue from a terminated process. Idempotent teardown treats the desired absent state as success.

That does not mean swallowing every exception. An HTTP delete returning 404 can be acceptable; 401 means test credentials are broken, 403 can indicate a permissions regression, and 500 may mean the environment is unhealthy. Encode only expected terminal conditions as harmless.

Use unique identifiers tied to a node ID or generated UUID. Cleanup by a broad label such as \`name=test\` can erase resources owned by parallel tests. Record the exact server-assigned ID immediately after creation, and delete by that ID.

For database fixtures, a transaction rollback is excellent when the code under test uses the same connection and no background worker must observe committed data. It is ineffective when another process has its own connection or the behavior under test includes commit semantics. Choose cleanup based on the system boundary, not convenience.

## Verify cleanup instead of trusting it

A passing functional test does not prove teardown ran. Add fixture-focused tests for cleanup logic that has meaningful cost or risk. One approach invokes pytest against a tiny sample using the \`pytester\` fixture in a plugin test suite. Another tests the resource manager or context manager directly.

At application level, a session-scoped audit fixture can report leaked resources after the suite, but it should be a backstop rather than the primary cleanup. The audit needs a namespace that identifies only this run. Without it, old debris or another concurrent run creates false accusations.

| Evidence | What it proves | Limitation |
| --- | --- | --- |
| Teardown log with resource ID | Cleanup code was entered | Not that remote deletion succeeded |
| Follow-up GET returns 404 | Resource is absent | Eventual consistency may require bounded polling |
| Empty run-specific database query | No tagged rows remain | Misses untagged or external resources |
| Process handle has exited | Local worker stopped | Child processes may survive separately |
| pytester regression test | Behavior under deliberate failures | Test doubles may differ from the real service |

For eventually consistent deletion, poll for a bounded period and fail with the last observed state. Avoid an unconditional sleep. Cleanup diagnostics should state the identifier, attempted action, response status, and whether the failure occurred during setup rollback or normal teardown.

Use \`--setup-show\` when investigating fixture order. It reveals setup and teardown activity by scope. It will not repair a bad ownership model, but it makes the actual sequence visible.

## Teardown exceptions and the original test failure

A cleanup failure is a real test infrastructure problem. If the test also failed, pytest reports teardown separately, and the combined output can be noisy. Preserve enough context to understand both.

Within a multi-step cleanup, attempt independent releases even if one fails. A pattern is to collect exceptions, finish the remaining safe actions, then raise an \`ExceptionGroup\` on supported Python versions. Alternatively, log secondary failures and raise the most important one. Do not place unrelated releases in a single straight-line block where the first exception prevents all later cleanup.

Dependencies offer a cleaner solution: each fixture has its own finalization callback, and pytest attempts the other finalizers even when one reports an error. This is another reason to split independent state changes.

Timeout handling requires the same discipline. External CI cancellation or an operating-system kill can bypass Python finalization entirely. Use server-side TTLs, run-specific namespaces, and a scheduled janitor for expensive remote resources. Fixture teardown is the first line of defense, not a distributed garbage collector.

## A practical cleanup review checklist

Review the lines before \`yield\` as a failure injection map. After each state-changing call, ask what exists if the next line raises. If the answer is a persistent object with no armed cleanup, split the fixture, add a finalizer, or wrap the sequence.

Then inspect teardown direction. Child resources should disappear before parents. Revoke a token before deleting its account, close a database connection before dropping its schema, and stop traffic before removing the target service.

Confirm that IDs are unique under xdist and retries. Session scope exists once per worker under many parallel arrangements, not necessarily once for the entire distributed run. Resource naming must tolerate that reality.

Finally, run deliberate failures at three points: after the first mutation, immediately before yield, and inside the test body. Observe remote state after each. Cleanup code that has never been tested under failure is optimistic production code hiding in the test suite.

Include collection-time and fixture-skip cases in that exercise when your suite uses conditional environments. A fixture skipped before acquiring anything needs no release, while a skip raised after a remote mutation has the same rollback requirement as any other setup exception. Parameterized fixtures deserve at least one failing parameter because setup can branch before reaching yield. Keep the verification independent from the cleanup implementation: if teardown calls the administration API, inspect residue through a read endpoint or database query rather than trusting the delete mock. This small fault-injection matrix catches lifecycle defects that ordinary happy-path coverage will never reveal.

These techniques complement broader [pytest reliability practices](/blog/pytest-best-practices-2026), particularly isolation and actionable failure output. The goal is not a teardown that rarely fails. It is a lifecycle whose partial states are understood and recoverable.

## Frequently Asked Questions

### Does code after yield run when a pytest test assertion fails?

Yes. Once the fixture reaches \`yield\`, pytest resumes it for teardown after the test, including when the test fails. Completed dependencies are finalized in reverse order as well.

### Why did my yield fixture leave data when setup raised?

An exception before \`yield\` means that fixture's post-yield section was never scheduled. Move each mutation into a focused dependent fixture, arm a finalizer immediately after acquisition, or use \`try/finally\` around a cohesive partial setup.

### Is request.addfinalizer safer than a yield fixture?

It is not universally safer. It is precise for incremental setup because cleanup can be registered between risky operations. A yield fixture remains clearer for one acquire-and-release pair. The important detail is registering a finalizer only after its resource exists.

### What happens if one teardown fixture raises an exception?

Pytest reports a teardown error and continues attempting other registered finalizers. Within one fixture function, however, an unhandled exception skips later statements, so independent cleanup actions should have separate ownership or explicit error aggregation.

### How can cleanup survive a forcibly terminated CI job?

Python fixtures cannot guarantee execution after a hard kill. Combine normal teardown with unique run labels, short-lived credentials, server-side expiration where available, and a narrowly scoped janitor that removes stale resources from abandoned runs.
`,
};
