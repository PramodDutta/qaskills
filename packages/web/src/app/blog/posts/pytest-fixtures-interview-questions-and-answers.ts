import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'pytest Fixture Interview Questions and Answers',
  description:
    'Master pytest fixture interview questions with precise answers on scopes, dependency order, yield teardown, parametrization, factories, and isolation.',
  date: '2026-07-13',
  category: 'Reference',
  content: `
# pytest Fixture Interview Questions and Answers

“The database fixture is session scoped, so why does the API client still get created for every test?” That interview question is testing dependency reasoning, not vocabulary. A strong answer traces the fixture graph, identifies each fixture's own scope, and explains where setup, caching, and finalization occur.

The questions below use concrete scenarios. Good candidates state guarantees, call out invalid scope relationships, and resist turning every fixture into global setup. Examples use current pytest APIs and ordinary Python.

## Question 1: What does pytest cache for a fixture request?

Pytest executes a fixture and caches its result for the fixture's scope. Within that scope, repeated requests for the same fixture instance return the cached value. The default scope is \`function\`, so each test gets a fresh instance. A test and another fixture can request the same function-scoped fixture and receive the same object during that test.

The cache is not a general memoization service. Parametrized fixture values create separate instances, and scope boundaries control lifetime. Mutating a cached fixture object is visible to other consumers in the same test, which can be useful or surprising.

| Scope | Instance boundary | Suitable example | Typical isolation risk |
| --- | --- | --- | --- |
| \`function\` | One test invocation | Mutable cart or temp record | More setup time |
| \`class\` | Test class | Read-only class scenario | Order-dependent mutation |
| \`module\` | Python module | Local service client | State shared across cases |
| \`package\` | Test package | Package integration resource | Broad ownership can be unclear |
| \`session\` | Entire test session | Expensive immutable service | Cross-suite contamination |

## Question 2: How does fixture dependency ordering work?

Fixtures form a directed dependency graph. If \`browser_page\` requests \`authenticated_context\`, pytest must set up the context first. Scope participates in ordering, and dependencies are more reliable than the textual order of arguments. Teardown reverses the realized dependency structure: dependents release before their prerequisites.

A candidate should not promise arbitrary order between unrelated fixtures merely because their names appear left to right. If order is required, express it as a dependency. Hidden ordering through autouse fixtures makes suites difficult to read.

## Question 3: Why can a broad fixture not depend on a narrow fixture?

A session-scoped fixture cannot depend on a function-scoped fixture because the dependency would disappear many times while its consumer remains alive. Pytest raises \`ScopeMismatch\`. Reverse the relationship, narrow the consumer's scope, or split immutable session configuration from per-test state.

For example, a function-scoped repository can depend on a session-scoped database engine. The repository is recreated per test and can open a transaction. A session-scoped repository depending on a function transaction has no coherent lifetime.

## Question 4: What is the correct yield-fixture teardown pattern?

Acquire before \`yield\`, provide the value at \`yield\`, and release after it. Put release in \`finally\` when intermediate teardown statements might fail or when the code has additional control flow. Pytest resumes the generator during finalization even when the test fails.

\`\`\`python
from collections.abc import Iterator
import pytest
from sqlalchemy import create_engine
from sqlalchemy.engine import Connection

@pytest.fixture(scope='session')
def engine():
    value = create_engine('postgresql+psycopg://test:test@localhost/testdb')
    try:
        yield value
    finally:
        value.dispose()

@pytest.fixture
def db_connection(engine) -> Iterator[Connection]:
    connection = engine.connect()
    transaction = connection.begin()
    try:
        yield connection
    finally:
        transaction.rollback()
        connection.close()
\`\`\`

This rollback strategy works only if application work uses that connection or joins its transaction. Code that opens another connection and commits can escape it. Senior answers state that boundary rather than claiming transactional fixtures solve every database cleanup problem.

## Question 5: What happens if setup fails before yield?

Pytest does not execute the post-yield portion of that fixture because the generator never yielded. Fixtures that completed earlier still finalize. Therefore, acquire one resource at a time and register cleanup as soon as ownership begins. If a fixture opens a socket and then fails while constructing a client before reaching \`yield\`, it must close the socket in an exception path.

This is one reason compact fixtures and composable dependencies are safer than one fixture acquiring five resources. Each dependency can own its release.

## Question 6: yield versus request.addfinalizer, which should you use?

Yield fixtures are usually clearer because setup and teardown appear in one linear function. \`request.addfinalizer(callback)\` remains valuable when cleanup must be registered dynamically or immediately after partial acquisition. A finalizer executes once registered, so register it only after the resource actually exists.

Neither API makes unsafe teardown safe. Finalizers should be idempotent where practical, should not hide the original test failure, and should release dependents before shared prerequisites.

## Question 7: What is an autouse fixture, and when is it harmful?

An autouse fixture applies to tests in its visibility scope without appearing in their argument lists. It is appropriate for unavoidable policy, such as restoring a process environment mutation after every test. It is harmful when it creates accounts, starts expensive services, or changes application state that only some tests need.

Autouse dependencies effectively become autouse for affected tests because they must also execute. Keep the graph small. An interviewer is often looking for awareness that convenience can conceal cost and coupling.

## Question 8: How do conftest.py visibility and overriding work?

Fixtures in a \`conftest.py\` are available to tests under that directory tree without import. A nested \`conftest.py\` can override a fixture name for its subtree. Plugins provide fixtures globally, subject to pytest's lookup rules.

Tests should request fixtures by name, not import them from \`conftest.py\`. Direct imports couple modules to layout and bypass the intended discovery model. Duplicate names can be a deliberate override, but overly generic names such as \`client\` make lookup hard to trace.

| Location | Visibility intent | Review concern |
| --- | --- | --- |
| Test module | That module | Best for local scenario data |
| Class | Methods in class | Avoid stateful test ordering |
| Parent \`conftest.py\` | Descendant tests | Keep shared contract stable |
| Nested \`conftest.py\` | Local subtree, can override | Make overrides obvious |
| Installed plugin | Broadly available | Pin and document plugin behavior |

## Question 9: How does fixture parametrization differ from test parametrization?

\`@pytest.fixture(params=[...])\` runs every consumer against each fixture parameter, available as \`request.param\`. \`@pytest.mark.parametrize\` varies explicit test arguments. Fixture parametrization suits reusable environment variants; test parametrization suits scenario inputs visible at the test boundary.

Both dimensions multiply. A three-browser fixture consumed by a test with four roles creates twelve cases. State the product during planning, give readable IDs, and avoid applying expensive variants to tests that do not need them.

\`\`\`python
import pytest

@pytest.fixture(params=['sqlite', 'postgresql'], ids=['sqlite', 'postgres'])
def backend(request):
    return request.param

@pytest.mark.parametrize(
    ('amount', 'expected'),
    [(0, '0.00'), (1250, '12.50')],
    ids=['zero', 'twelve-fifty'],
)
def test_money_storage_round_trip(backend, amount, expected):
    stored = store_and_read_money(backend, amount)
    assert stored == expected
\`\`\`

The snippet assumes \`store_and_read_money\` is the system function provided by the project. The pytest APIs themselves are runnable. In a real interview, explain that SQLite and PostgreSQL do not have identical semantics, so the abstraction must define what equivalence means.

## Question 10: What is indirect parametrization?

With \`@pytest.mark.parametrize(..., indirect=True)\`, a parameter value is passed to a fixture through \`request.param\` rather than directly into the test. It defers expensive setup until test execution and lets fixture code translate a compact case value into a resource.

Use it sparingly. Indirect data flow is harder to read than explicit fixture parametrization or a factory fixture. A good answer explains the mechanism and then considers whether a clearer design exists.

## Question 11: When should a fixture return a factory?

A factory fixture is useful when a test needs zero, one, or several resources with case-specific inputs. The fixture returns a callable and records created resources for teardown. It avoids a separate fixture for every variation and keeps creation inside the test where intent is visible.

The cleanup list belongs to the fixture instance. Delete resources in reverse order if they depend on one another. If creation partly succeeds, record the resource as soon as a stable identifier exists.

## Question 12: How do you test teardown without masking failures?

Force the test body to fail and verify cleanup through an external observable boundary in a focused test of fixture infrastructure. In ordinary product tests, let pytest report teardown errors. Do not wrap cleanup in a broad \`except Exception: pass\`, because leaked state will corrupt later cases.

When the test and teardown both fail, pytest reports both phases. Cleanup code should include resource identity in its error and avoid raising a vague second exception that obscures the original assertion.

## Question 13: What does usefixtures do?

\`@pytest.mark.usefixtures('audit_log')\` requests fixture execution without injecting its return value as a function argument. It is useful when the side effect is the contract, such as enabling a temporary feature. It is not a way to request a fixture inside another fixture; dependencies should be declared as arguments there.

Prefer an explicit test argument when the value is consumed. Marks can be applied at class, module, or configuration scope, so reviewers should inspect their reach.

## Question 14: Can a fixture request another fixture dynamically?

Yes, \`request.getfixturevalue(name)\` can resolve a fixture name dynamically. It is appropriate for plugin-like selection where the name is genuinely data-driven. Static dependencies should remain function arguments because pytest can display and order that graph more clearly.

Dynamic lookup still obeys visibility and scope rules. It does not permit a session fixture to smuggle in a function fixture.

## Question 15: How should async fixtures be handled?

Use the async-fixture support of the installed plugin, such as pytest-asyncio, and match its documented decorators and loop-scope configuration. An async generator fixture awaits setup, yields, then awaits cleanup. Do not mix a session-scoped async client with a function-scoped event loop unless the plugin configuration supports that lifetime.

Answers should acknowledge plugin ownership because core pytest and async plugins have evolved. Pin versions and avoid reciting outdated mode defaults as timeless behavior.

## Question 16: How do you prevent session fixtures from leaking state?

Share immutable or carefully partitioned infrastructure, not mutable business records. A session-scoped server can be reasonable; a session-scoped logged-in user whose cart every test changes is not. Generate unique tenant or record identifiers per test and make cleanup explicit.

The [pytest fixture scope guide](/blog/pytest-fixtures-scope-complete-guide) explores lifetime selection in greater depth. A useful rule is to broaden scope only after measuring setup cost and proving that shared state will not create ordering dependence.

## Question 17: What is a dynamic fixture scope?

Pytest permits a callable for \`scope=\`. The callable receives fixture name and config and returns a valid scope string. It runs once when the fixture definition is evaluated, which allows a command-line option to choose, for example, function or session lifetime for a container.

Dynamic scope is not per-test scope switching. All consumers in that run see the chosen lifetime. Document the option because isolation can change substantially between local and CI executions.

## Question 18: Why is patching in a fixture sometimes unreliable?

Patching the definition site instead of the lookup site means the system under test retains its original reference. A fixture can use pytest's \`monkeypatch\` fixture, but it must patch the symbol where the tested module reads it. Imports performed before patching can also capture values.

Teardown is automatic for \`monkeypatch\` changes at the end of the requesting scope. Avoid session-scoped global patches unless every test truly needs the altered process.

## Question 19: How can fixture setup performance be diagnosed?

Use \`pytest --setup-show\` to inspect setup and teardown flow, and pytest's duration reporting to identify slow phases. Count how often an expensive fixture runs. A supposed module fixture may be parametrized or overridden, creating more instances than expected.

Optimize only after preserving isolation. Broadening scope can make a suite faster and nondeterministic. Often the better repair is a cheaper resource, a factory that creates only what a case needs, or parallel-safe worker fixtures.

## Question 20: What fixture design would you propose for an API integration suite?

A senior answer layers ownership. A session or worker fixture starts the disposable service and database. Function fixtures create unique users and records. An API client fixture depends on service configuration but does not own global mutable authentication. Yield fixtures release records where isolation requires it, and tests assert behavior through public APIs.

Configuration is immutable, secrets are test-only, and parallel workers receive unique namespaces. Database rollback is used only if all application work participates. Background jobs get observable completion barriers rather than sleeps.

The broader [SDET interview questions reference](/blog/sdet-interview-questions-2026) covers strategy, debugging, API, UI, and delivery topics. Fixture questions specifically reveal whether a candidate can reason about lifecycle, ownership, and isolation under concurrency.

## How to answer fixture design questions convincingly

Begin with lifetime and ownership. Draw the dependency graph in words: which fixture creates the resource, which consumers use it, and which fixture releases it. State whether data is mutable and how parallel tests avoid collision. Then discuss performance.

Avoid claiming “session scope is faster” as a complete answer. It is usually faster for setup count, but can increase contamination, make failures order-dependent, and require partitioning. Similarly, “always use yield” misses partial setup cases where immediate finalizer registration or a local try/finally matters.

| Weak interview response | Stronger reasoning |
| --- | --- |
| Autouse removes repeated arguments | Autouse is reserved for unavoidable policy and its dependencies expand hidden work |
| Roll back after every database test | Confirm every code path shares the transaction; otherwise use another isolation boundary |
| conftest fixtures are global | Visibility follows directory scope, nesting, plugins, and overrides |
| Parametrization reduces tests | It reduces duplicated code but multiplies collected cases |
| Yield always runs cleanup | Post-yield code runs only after the fixture reaches yield; partial setup needs care |

Interviewers value corrections. If requirements change from a synchronous repository to a background worker, revisit transaction rollback. If xdist parallelism is introduced, revisit shared ports and names. Fixture architecture is contextual, and a candidate who names the context is more credible than one reciting decorators.

## Question 21: How does pytest-xdist change fixture assumptions?

Each xdist worker is a separate process with its own fixture cache. A session-scoped fixture is session scoped per worker, not necessarily once across the entire distributed run. Ports, database names, filesystem paths, and accounts must therefore be unique or coordinated externally.

Use the worker identifier to partition resources when appropriate. If exactly one global service must start, use an interprocess coordination mechanism and make cleanup robust when workers exit unexpectedly. Do not rely on a module-level Python singleton across processes.

This question exposes a frequent production defect in test infrastructure: lifecycle scope inside pytest is not the same as uniqueness across machines, containers, or CI jobs.

## Frequently Asked Questions

### Can a session-scoped fixture depend on a function-scoped fixture?

No. The narrower dependency cannot provide a coherent value for the broader consumer, so pytest raises a scope mismatch. Reverse the dependency or redesign the lifetimes.

### Is teardown after yield guaranteed if setup raises first?

No. Pytest resumes the post-yield portion only for a fixture that reached \`yield\`. Previously completed fixtures still finalize, and partial acquisition inside the failing fixture needs its own exception-safe cleanup.

### Are fixtures executed in test argument order?

Do not depend on argument order for unrelated fixtures. Scope, dependencies, autouse behavior, and pytest's fixture graph determine execution. Declare a dependency when order matters.

### When is indirect parametrization better than a factory fixture?

Indirect parametrization is useful when collection-time case values should drive standardized fixture setup. A factory is clearer when one test creates a variable number of resources or needs creation calls visible in its steps.

### Should expensive fixtures always be session scoped?

No. Broaden scope only when shared state is safe or partitioned. The saved setup time may not justify order dependence, leaked mutations, or parallel collisions.
`,
};
