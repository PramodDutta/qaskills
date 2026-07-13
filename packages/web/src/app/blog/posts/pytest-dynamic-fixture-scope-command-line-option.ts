import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Set pytest Fixture Scope from a Command-Line Option',
  description:
    'Set pytest fixture scope from a command-line option to switch resource lifetime safely between isolated local tests and faster shared CI sessions.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Set pytest Fixture Scope from a Command-Line Option

Picture a suite that spins up a Postgres container for integration tests. Locally, you want that container torn down after every test so a broken migration doesn't poison the next one. In CI, spinning up a fresh container per test adds four minutes to every run, and you'd rather pay the setup cost once per session. Same fixture, same code, two completely different lifetimes depending on who's running it and why.

The naive fix is two fixtures: \`db_container_function\` and \`db_container_session\`, with tests importing whichever one matches the environment. That works until someone forgets which suite uses which, or a shared helper imports the wrong one and CI starts leaking state between tests. What you actually want is one fixture whose scope is decided at collection time by a flag on the command line: \`pytest --container-scope=session\` in CI, nothing (defaulting to \`function\`) on a laptop.

pytest supports this directly. The \`scope\` parameter of \`@pytest.fixture\` doesn't have to be a string, it can be a callable, and pytest will call it once to resolve the actual scope before the fixture is ever instantiated. This is the dynamic scope feature, and it's the correct tool for exactly this problem.

## The Fixed-Scope Problem with \`pytest.fixture(scope=...)\`

Normally you write:

\`\`\`python
@pytest.fixture(scope="session")
def db_container():
    container = start_postgres_container()
    yield container
    container.stop()
\`\`\`

That \`scope="session"\` is baked in at import time. There's no branch, no environment check, no way to override it short of maintaining a second fixture or monkeypatching internals. Every consumer of \`db_container\` gets the session-scoped version, full stop.

The five valid scopes and what each one actually buys you:

| Scope | Instantiated once per | Typical use |
|---|---|---|
| \`function\` | test function | full isolation, safest default |
| \`class\` | test class | shared setup across methods in one class |
| \`module\` | test file | expensive setup shared within one module |
| \`package\` | test package (directory with \`__init__.py\`) | setup shared across a subpackage |
| \`session\` | entire pytest run | one-time expensive resources (containers, DB schema) |

If the real requirement is "session in CI, function everywhere else," a static string can't express that. You need the scope to be resolved by running code, not by reading a literal.

## Registering a Custom Option with \`pytest_addoption\`

pytest lets any \`conftest.py\` at the root of your test tree add its own CLI flags via the \`pytest_addoption\` hook. It receives a \`parser\` object with an \`argparse\`-like \`addoption\` method:

\`\`\`python
# conftest.py
def pytest_addoption(parser):
    parser.addoption(
        "--container-scope",
        action="store",
        default="function",
        choices=["function", "class", "module", "package", "session"],
        help="Lifetime for the db_container fixture (default: function)",
    )
\`\`\`

The \`choices\` list matters more than it looks. It rejects typos like \`--container-scope=sesion\` at argument-parsing time, before a single test collects, instead of failing later with a cryptic scope-mismatch error. Since fixture scope only accepts those five literal values, constraining the flag to the same set is free validation.

At this point \`--container-scope\` is a real pytest flag. Run \`pytest --help\` and it shows up under the custom options group. But it does nothing yet, nothing reads it.

## Writing the Scope Callable: \`determine_scope(fixture_name, config)\`

This is the part people get wrong first: the callable pytest expects for a dynamic scope is not one you can shape however you like. It has a fixed signature, \`fixture_name\` and \`config\`, and pytest calls it with those two by keyword:

\`\`\`python
def determine_scope(fixture_name, config):
    return config.getoption("--container-scope")
\`\`\`

\`config\` is the same \`pytest.Config\` object available everywhere else in the hook system, and \`config.getoption("--container-scope")\` reads back whatever was passed on the command line (or the \`default\` you registered). \`fixture_name\` is there so one callable can serve multiple fixtures with different logic per name, useful if you have several fixtures that all want CLI-driven scope but not identical rules:

\`\`\`python
def determine_scope(fixture_name, config):
    if fixture_name == "db_container":
        return config.getoption("--container-scope")
    return "function"
\`\`\`

The critical constraint: this function is evaluated exactly once, during fixture definition resolution at collection time, not per test invocation. That means the scope is fixed for the whole run as soon as collection finishes. You cannot have \`db_container\` behave as function-scoped for the first ten tests and session-scoped for the rest of the same run. One process, one resolved scope. If you need genuinely mixed scopes within a single run, that's a signal you need two distinctly named fixtures, not one dynamic one.

## Wiring the Callable into the Fixture

With the option registered and the callable written, point \`scope=\` at the function instead of a string:

\`\`\`python
@pytest.fixture(scope=determine_scope)
def db_container(request):
    container = start_postgres_container()
    yield container
    container.stop()
\`\`\`

Note \`scope=determine_scope\`, no parentheses. You're handing pytest the function object; pytest invokes it with \`fixture_name="db_container"\` and the live \`config\`, then treats the return value exactly as if you'd written that string literally.

Now the same test file behaves two different ways depending on invocation:

\`\`\`bash
# default: function scope, container torn down after every test
pytest tests/test_orders.py

# CI: session scope, container built once, reused across the whole run
pytest tests/test_orders.py --container-scope=session
\`\`\`

Nothing in \`test_orders.py\` changed. No branching in the test code, no duplicated fixture, no environment-variable sniffing inside the fixture body itself (the whole point of routing it through \`config.getoption\` is that it's inspectable via \`pytest --help\` and validated via \`choices\`, unlike an ad hoc \`os.environ.get\`).

One easy mistake here: forgetting the \`yield\`/teardown split still applies exactly as it would with a static scope. Whatever scope gets resolved, teardown runs at the boundary of that scope, session teardown fires at the very end of the run, function teardown fires after each test. The dynamic part is only which boundary applies, not whether teardown happens.

## Verifying the Resolved Scope Before You Trust It

Because the scope decision happens silently during collection, it's worth confirming what actually got resolved rather than assuming your flag worked. \`pytest --fixtures\` prints the scope pytest resolved for every fixture, per invocation:

\`\`\`bash
pytest --fixtures --container-scope=session | grep -A1 db_container
\`\`\`

That's the fast sanity check before you trust a CI run to it. If you see \`function\` when you expected \`session\`, the likely cause is a second \`conftest.py\` further down the tree also defining \`db_container\` and shadowing the one that reads the option, or the option itself failing to reach \`config.getoption\` because it was registered in a \`conftest.py\` outside pytest's collection root.

## Caveat: pytest-xdist Workers Each Resolve Their Own Session

If your suite runs under \`pytest-xdist\` (\`pytest -n 4\`), remember that xdist forks or spawns separate worker processes, and each worker is its own independent pytest session. A \`session\`-scoped fixture resolved via \`determine_scope\` runs once per worker process, not once for the entire distributed run. With \`-n 4\` and \`--container-scope=session\`, you get four containers, one per worker, all built and torn down independently.

This is not a bug in dynamic scoping, it's how xdist's process model works for every session-scoped fixture, static or dynamic. It matters more here because a container-per-worker is exactly the kind of expensive resource dynamic scope was meant to control. If the intent was "exactly one container for the whole distributed run," dynamic fixture scope alone doesn't get you there; you'd need external coordination (a lock file, a fixture that checks whether a container is already running on a known port) on top of it.

| Invocation | Containers created |
|---|---|
| \`pytest --container-scope=session\` | 1 |
| \`pytest -n 4 --container-scope=session\` | up to 4 (one per xdist worker) |
| \`pytest --container-scope=function\` | 1 per test, regardless of \`-n\` |

## Caveat: Scope Mismatches with Parametrized Fixtures

Dynamic scope doesn't exempt you from pytest's ordinary scope-mismatch rule: a fixture cannot depend on another fixture with a narrower scope. If \`db_container\` resolves to \`session\` in CI but some other fixture it depends on is hardcoded \`function\`-scoped, pytest raises a \`ScopeMismatch\` error at collection time in that CI run, even though the exact same code passes locally where \`db_container\` resolves to \`function\`.

This shows up most often with parametrized fixtures indirectly. If \`db_container\` is parametrized (say, over which Postgres version to boot) and something downstream assumes function-level parametrization granularity, promoting the scope to \`session\` or \`module\` via the CLI flag means all those parametrized instances now have to be resolved once for the whole broader scope, not once per test. Any fixture or helper further down the dependency chain that implicitly assumed function scope (grabbing \`request.node\` to build a per-test name, for instance) will misbehave under the wider scope, because \`request.node\` at session scope no longer refers to a single test.

Practical rule: if a fixture's scope is going to be run through \`determine_scope\`, audit everything that depends on it for scope-sensitive assumptions before you flip the flag in CI, not after a flaky failure shows up there. Running \`pytest --collect-only --container-scope=session\` locally first surfaces \`ScopeMismatch\` errors without actually spinning anything up.

For fixture composition and dependency layering in general, [pytest fixtures and conftest](/blog/pytest-fixtures-conftest-complete-guide-2026) covers how scope interacts with fixture discovery across multiple \`conftest.py\` files, which is the piece that usually explains why a mismatch appears in one directory but not another.

## Extending the Pattern to Multiple Independently Scoped Fixtures

Once one fixture uses a CLI-driven scope, it's tempting to route every expensive fixture through the same flag. Resist that unless they genuinely share a lifetime requirement. A \`db_container\` fixture and a \`redis_container\` fixture might both benefit from session scope in CI, but they don't have to share the same flag. Two options, two callables, is clearer than one flag with a naming convention baked into \`fixture_name\` branching:

\`\`\`python
def pytest_addoption(parser):
    parser.addoption("--db-scope", default="function",
                      choices=["function", "class", "module", "package", "session"])
    parser.addoption("--redis-scope", default="function",
                      choices=["function", "class", "module", "package", "session"])


def db_scope(fixture_name, config):
    return config.getoption("--db-scope")


def redis_scope(fixture_name, config):
    return config.getoption("--redis-scope")


@pytest.fixture(scope=db_scope)
def db_container():
    ...


@pytest.fixture(scope=redis_scope)
def redis_container():
    ...
\`\`\`

This costs two extra lines of flag registration and buys independent control: CI can run \`--db-scope=session --redis-scope=function\` if Redis state leaking between tests is more dangerous than Postgres state leaking, without either fixture's logic knowing about the other. For a broader map of what scope actually changes about fixture setup and teardown ordering, [the complete guide to pytest fixture scope](/blog/pytest-fixtures-scope-complete-guide) is the reference for the mechanics this pattern builds on top of.


## Scope Dependency Rules

A fixture's declared scope is a ceiling, not a suggestion. A \`session\`-scoped fixture cannot depend on a \`function\`-scoped one, because pytest would have to instantiate the narrower fixture once and hold it for the entire run, which defeats its own lifecycle contract. When you make scope configurable via \`--fixture-scope\`, this rule still applies at collection time, so a fixture built for flexible scope must only depend on fixtures whose scope is equal to or broader than the widest value your CLI option allows.

| Requested scope | Can depend on | Cannot depend on |
|---|---|---|
| function | session, package, module, class, function | (nothing narrower exists) |
| class | session, package, module, class | function |
| module | session, package, module | class, function |
| package | session, package | module, class, function |
| session | session | package, module, class, function |

Practical upshot: any fixture whose scope you plan to flip via CLI needs its dependency chain audited for the *broadest* scope you intend to support, not just the default. If \`db_connection\` sometimes runs at \`session\` scope, everything it pulls in (\`db_engine\`, \`settings\`) must tolerate session lifetime too, even on the runs where you pass \`--fixture-scope=function\`.

## Worker-Local Session Scope Under xdist

With \`pytest-xdist\`, \`scope="session"\` is per-worker, not per-run. Each \`gwN\` process gets its own interpreter and therefore its own instance of every session fixture. If your CLI-driven scope resolves to \`session\` to save setup cost on a slow resource (say, a Postgres schema build), you still pay that cost once per worker, not once total. Pull \`worker_id\` to make that explicit rather than assuming a singleton:

\`\`\`python
def pytest_addoption(parser):
    parser.addoption("--fixture-scope", action="store", default="function")

def resolve_scope(fixture_name, config):
    return config.getoption("--fixture-scope")

@pytest.fixture(scope=resolve_scope)
def db_connection(request):
    worker = getattr(request.config, "workerinput", {}).get("workerid", "master")
    conn = build_connection(schema=f"test_{worker}")
    yield conn
    conn.close()
\`\`\`

Cross-worker coordination (one build, shared by all workers) needs a file lock or \`tmp_path_factory.getbasetemp().parent\`, not scope alone. Scope controls reuse within a worker's lifetime; it says nothing about the other workers.

## Parametrization Interacts With Scope, Not Just With It

\`request.param\` behavior changes with scope. A \`session\`-scoped parametrized fixture runs its setup once per parameter value across the whole session, and any indirect parametrization on a test (\`@pytest.mark.parametrize("db_connection", [...], indirect=True)\`) still forces a teardown/setup boundary whenever the param changes, regardless of the CLI scope override. If your callable resolves to \`session\` but tests parametrize that fixture with three values, you get three session-length instances, not one. Verify with \`pytest --collect-only -q\` that the count matches your expectation before trusting the CLI knob in CI.

## When Dynamic Scope Is Too Risky

Treat the CLI-controlled scope as a debugging or profiling knob, not a permanent test-suite setting. It's reasonable for a local dev loop where you want \`--fixture-scope=session\` to skip repeated container startup. It stops being reasonable once:

- the fixture mutates shared state (rows, files, caches) that function scope was cleaning up between tests
- teardown order depends on the narrower scope's finalizer stack, and widening scope silently skips those finalizers
- CI parallelism via xdist means "session" no longer means what a single-process local run implies

If any of those apply, fix the scope in code and expose a separate, narrower toggle (a marker or an env flag gating one specific fixture) instead of a blanket CLI override.

## Frequently Asked Questions

### Can the scope callable read environment variables instead of a CLI flag?

Yes, \`config.getoption\` and \`os.environ\` are both just data sources inside the callable, you could write \`return os.environ.get("CONTAINER_SCOPE", "function")\` instead of reading a registered option. The CLI-flag approach is usually preferable because \`parser.addoption\` gives you \`choices\` validation and \`--help\` visibility for free, whereas an environment variable typo silently falls through to a default with no error.

### Does \`determine_scope\` re-run for every test that uses the fixture?

No. It runs once, when pytest resolves the fixture's scope during collection, not once per test invocation. Whatever it returns is fixed for the remainder of that pytest process. If you need the scope to vary within a single run rather than between separate invocations of the pytest command, dynamic scope isn't the right tool, you'd need two separately named fixtures instead.

### What happens if the callable returns an invalid string, like \`"invocation"\`?

pytest raises an error when it tries to use that scope value, since only \`function\`, \`class\`, \`module\`, \`package\`, and \`session\` are recognized. Constraining the underlying CLI option with \`choices\` in \`pytest_addoption\` catches this earlier, at argument-parsing time, rather than letting an invalid value reach the fixture machinery.

### Can I use dynamic scope with fixtures defined via \`@pytest.fixture(params=...)\`?

Yes, dynamic \`scope\` and \`params\` are independent arguments and can be combined on the same fixture. The caveat is that widening the resolved scope (say from \`function\` to \`session\`) means all parametrized instances of that fixture are now shared across the wider scope, so any per-test state that used to reset every test now persists across every test that shares that scope boundary. Verify with \`pytest --collect-only\` under the wider scope before relying on it in CI.

### Is there a way to see which scope actually got resolved without running the full suite?

\`pytest --fixtures --container-scope=<value>\` prints every fixture's resolved scope without executing any tests, and \`pytest --collect-only --container-scope=<value>\` will also surface any \`ScopeMismatch\` errors that the wider scope would trigger. Both are fast, safe to run before trusting a new flag value in CI.
`,
};
