import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pytest Parametrize: The Complete Guide for 2026 (with Examples)',
  description:
    'Master pytest.mark.parametrize with runnable examples: multiple arguments, custom ids, stacking, parametrizing fixtures, and data-driven testing patterns.',
  date: '2026-06-13',
  category: 'Guide',
  content: `
# Pytest Parametrize: The Complete Guide for 2026

Data-driven testing is one of the highest-leverage techniques in a QA engineer's toolkit, and in pytest it is built right into the framework through \`@pytest.mark.parametrize\`. Instead of writing five nearly identical tests that differ only in their inputs and expected outputs, you write one test and feed it a table of cases. Pytest then runs that test once per row, reports each case as a separate result, and shows you exactly which input combinations passed and which failed. The result is dramatically less duplication, far better failure diagnostics, and test code that doubles as living documentation of how your function should behave.

This guide is a complete pytest parametrize tutorial built around real, runnable Python on pytest 8.x. You will learn the basic single-argument form, how to pass multiple arguments per case, how to give each case a readable id so test reports make sense, how to stack multiple parametrize decorators to build a matrix, and how to combine parametrize with fixtures for advanced data-driven scenarios. We will also cover \`pytest.param\` for marking individual cases as expected failures or skips, indirect parametrization that routes values through a fixture, and the practical patterns that keep large parametrized suites maintainable.

If you have ever copied a test, changed two values, and pasted it back five times, parametrize is the cure. It turns that repetition into a single declarative table. And because each generated case is independent, a failure in one row never stops the others from running -- you get a full picture of which inputs break your code in a single run. Parametrize works hand in hand with the fixture system, so if you have not yet mastered fixtures, read our companion [pytest fixtures and conftest.py guide](/blog/pytest-fixtures-conftest-complete-guide-2026) alongside this one.

## What Is Parametrization in Pytest?

Parametrization means running the same test function multiple times with different argument values. You apply the \`@pytest.mark.parametrize\` decorator to a test, declare the argument names, and provide a list of values. Pytest generates one test instance per value and injects it as the named argument.

\`\`\`python
import pytest


def is_even(number):
    return number % 2 == 0


@pytest.mark.parametrize("number", [2, 4, 6, 8, 100])
def test_is_even_true(number):
    assert is_even(number) is True


@pytest.mark.parametrize("number", [1, 3, 5, 7, 99])
def test_is_even_false(number):
    assert is_even(number) is False
\`\`\`

The first decorator generates five separate test cases, one for each even number, and the second generates five for the odd numbers. In your test report you will see ten distinct results like \`test_is_even_true[2]\`, \`test_is_even_true[4]\`, and so on. Each runs independently, so if \`test_is_even_true[6]\` ever failed, the other four would still execute and report. This independence is the whole point: you find every broken input in one pass, not one at a time.

The decorator's first argument is a comma-separated string of parameter names, and the second is the list of values to inject. With a single parameter, each list element is one value. With multiple parameters, each element is a tuple -- which is the next thing to master.

## Parametrize with Multiple Arguments

Most real tests need both inputs and an expected output. You pass multiple argument names as a comma-separated string, and supply a list of tuples where each tuple lines up with those names in order. This is the canonical input-output table that makes parametrize so readable.

\`\`\`python
import pytest


def add(a, b):
    return a + b


@pytest.mark.parametrize(
    "a, b, expected",
    [
        (1, 2, 3),
        (0, 0, 0),
        (-1, 1, 0),
        (10, -5, 5),
        (100, 200, 300),
    ],
)
def test_add(a, b, expected):
    assert add(a, b) == expected
\`\`\`

Each tuple maps positionally to \`("a", "b", "expected")\`. Pytest runs \`test_add\` five times, injecting one tuple per run. The test body stays a single clean assertion while the data table holds every case. This is how you express "given these inputs, expect this output" for a whole family of scenarios without any duplication. When a case fails, pytest tells you precisely which tuple broke and shows both the actual and expected values thanks to its assertion introspection.

You can use any Python objects in the tuples -- strings, lists, dicts, custom class instances, even \`None\`. The table reads top to bottom as a specification of your function's contract, which is why parametrized tests are often the easiest part of a codebase to understand.

## Readable Test IDs with the ids Parameter

By default pytest auto-generates an id for each case from the argument values, producing names like \`test_add[1-2-3]\`. For simple values this is fine, but for dicts, long strings, or objects the auto-ids become noise. The \`ids\` parameter lets you label each case with a human-readable name that shows up in the test report and on the command line for selection.

\`\`\`python
import pytest


def classify_temperature(celsius):
    if celsius <= 0:
        return "freezing"
    if celsius < 20:
        return "cold"
    if celsius < 30:
        return "warm"
    return "hot"


@pytest.mark.parametrize(
    "celsius, expected",
    [
        (-5, "freezing"),
        (10, "cold"),
        (25, "warm"),
        (35, "hot"),
    ],
    ids=["below-zero", "chilly-morning", "room-temp", "heatwave"],
)
def test_classify_temperature(celsius, expected):
    assert classify_temperature(celsius) == expected
\`\`\`

Now your report shows \`test_classify_temperature[below-zero]\` instead of \`test_classify_temperature[-5-freezing]\`. Good ids make a failing test self-explanatory: you read the name and immediately know which scenario broke. They also let you rerun a single case with \`pytest -k below-zero\`. For dynamic ids, you can pass a function to \`ids\` that receives each value and returns a label, which is handy when the cases are generated programmatically.

## Stacking Parametrize for a Test Matrix

Apply \`@pytest.mark.parametrize\` more than once to the same test and pytest produces the Cartesian product of all the cases -- a full combinatorial matrix. This is the fastest way to test every combination of two or more independent dimensions, such as every browser against every viewport, or every payment method against every currency.

\`\`\`python
import pytest


def build_url(protocol, host):
    return f"{protocol}://{host}"


@pytest.mark.parametrize("protocol", ["http", "https"])
@pytest.mark.parametrize("host", ["example.com", "test.local", "api.dev"])
def test_build_url(protocol, host):
    url = build_url(protocol, host)
    assert url.startswith(protocol)
    assert host in url
\`\`\`

Two protocols times three hosts yields six generated tests, covering every pairing automatically. Stacking is concise but multiplies quickly, so be deliberate -- three decorators of five cases each is 125 tests. When you only need specific combinations rather than the full product, list the exact tuples in a single decorator instead of stacking. Use stacking when the dimensions are truly independent and you want exhaustive coverage; use a single explicit table when only certain combinations are meaningful.

## Marking Individual Cases with pytest.param

Sometimes one row in your table is a known failure, a work-in-progress, or should be skipped on a particular platform. Wrapping that case in \`pytest.param\` lets you attach marks like \`xfail\` or \`skip\` to a single case without affecting the others. This keeps the case documented in the table rather than deleted or commented out.

\`\`\`python
import sys
import pytest


def divide(a, b):
    return a / b


@pytest.mark.parametrize(
    "a, b, expected",
    [
        (10, 2, 5),
        (9, 3, 3),
        pytest.param(1, 0, None, marks=pytest.mark.xfail(reason="division by zero")),
        pytest.param(
            5, 5, 1, marks=pytest.mark.skipif(sys.platform == "win32", reason="skip on Windows")
        ),
    ],
)
def test_divide(a, b, expected):
    assert divide(a, b) == expected
\`\`\`

The third case divides by zero and is marked \`xfail\`, so pytest expects it to fail and reports it as an expected failure rather than a real one. The fourth case is skipped on Windows via \`skipif\`. Both stay visible in the table with a documented reason, which is far better than silently removing them. \`pytest.param\` also accepts an \`id\` argument to label that specific case. This pattern lets your parametrized table honestly represent edge cases, including the ones that are not fixed yet.

## Parametrize versus Fixtures: When to Use Each

Parametrize and fixtures both reduce duplication, but they solve different problems. Parametrize varies the data going into one test; fixtures supply shared setup and resources. They are complementary, and the best suites use both together. This table clarifies when to reach for which.

| Aspect | @pytest.mark.parametrize | Fixture (parametrized) |
|---|---|---|
| Primary purpose | Vary inputs/expected outputs for one test | Provide setup, resources, or shared state |
| Defined on | The individual test function | A reusable function in test file or conftest.py |
| Reuse across tests | No, scoped to the decorated test | Yes, any test can request it |
| Teardown support | No | Yes, via \`yield\` |
| Multiplies dependent tests | Only the decorated test | Every test that requests the fixture |
| Best for | Data tables, edge cases, input matrices | Connections, clients, expensive setup |

The rule of thumb: if you are varying the data a single test consumes, use \`parametrize\`. If you are supplying a resource that several tests need, use a fixture. When you want to run a whole suite against multiple backends, use a parametrized fixture (covered in the [fixtures guide](/blog/pytest-fixtures-conftest-complete-guide-2026)). And when a test needs both -- different inputs and a shared resource -- combine a parametrized test with a fixture, which is the focus of the next section.

## Combining Parametrize with Fixtures

A parametrized test can request fixtures just like any other test. The fixture provides the shared resource; the parametrize decorator provides the varying data. Pytest builds the fixture once per generated case (according to the fixture's scope) and injects both the fixture value and the current parameter.

\`\`\`python
import pytest


@pytest.fixture
def calculator():
    return {"history": []}


@pytest.mark.parametrize(
    "operation, a, b, expected",
    [
        ("add", 2, 3, 5),
        ("subtract", 10, 4, 6),
        ("multiply", 6, 7, 42),
    ],
)
def test_calculator_operations(calculator, operation, a, b, expected):
    operations = {
        "add": a + b,
        "subtract": a - b,
        "multiply": a * b,
    }
    result = operations[operation]
    calculator["history"].append((operation, result))
    assert result == expected
    assert calculator["history"][-1] == (operation, expected)
\`\`\`

The \`calculator\` fixture supplies a fresh history dict for each case, and the parametrize decorator drives three different operations through the same test. Each generated case gets its own \`calculator\` because the fixture is function-scoped, so the cases stay isolated. This combination is the workhorse of real test suites: a fixture for the thing under test, parametrize for the matrix of inputs it should handle.

## Indirect Parametrization

By default the values you list in \`parametrize\` are injected straight into the test. With \`indirect=True\`, pytest instead passes each value to a fixture of the same name through \`request.param\`, letting the fixture transform or build something from the raw parameter before the test sees it. This is useful when the parameter is a recipe rather than the final object.

\`\`\`python
import pytest


@pytest.fixture
def user(request):
    role = request.param
    return {"role": role, "can_edit": role in {"admin", "editor"}}


@pytest.mark.parametrize("user", ["admin", "editor", "viewer"], indirect=True)
def test_edit_permission(user):
    if user["role"] == "viewer":
        assert user["can_edit"] is False
    else:
        assert user["can_edit"] is True
\`\`\`

Here the parameter is just a role string, but \`indirect=True\` routes it into the \`user\` fixture, which builds a full user dict with computed permissions. The test receives the finished object, not the raw string. Indirect parametrization is ideal when constructing the test input involves logic, setup, or teardown that belongs in a fixture -- you parametrize the recipe and let the fixture do the cooking.

## Parametrize Techniques at a Glance

With so many parametrize features, it helps to keep a quick reference of which tool solves which problem. This table summarizes the techniques covered above and when to reach for each one.

| Technique | Syntax | Use it when |
|---|---|---|
| Single argument | \`@pytest.mark.parametrize("x", [...])\` | One varying input per case |
| Multiple arguments | \`@pytest.mark.parametrize("a, b, expected", [(...)])\` | Input-output tables |
| Custom ids | \`ids=["case-a", "case-b"]\` | Reports need readable names |
| Stacked decorators | Two or more \`@parametrize\` on one test | Exhaustive Cartesian matrix |
| Per-case marks | \`pytest.param(..., marks=...)\` | Mark one row xfail or skip |
| Indirect | \`indirect=True\` | Route values through a fixture |

Keep this map in mind as you build suites: most data-driven tests use just the single- and multiple-argument forms, and you layer in ids, marks, stacking, or indirect only when a specific need arises. Reaching for the simplest technique that solves the problem keeps your tables easy to read and review.

## Parametrizing with Complex Data Structures

Parametrize is not limited to scalars. You can pass lists, dicts, and custom objects as parameter values, which is perfect for testing functions that consume structured input like API payloads or configuration objects. Pair complex values with explicit \`ids\` so the report stays readable.

\`\`\`python
import pytest


def total_price(cart):
    return sum(item["price"] * item["qty"] for item in cart)


@pytest.mark.parametrize(
    "cart, expected",
    [
        ([{"price": 10, "qty": 2}], 20),
        ([{"price": 5, "qty": 3}, {"price": 2, "qty": 1}], 17),
        ([], 0),
    ],
    ids=["single-item", "multi-item", "empty-cart"],
)
def test_total_price(cart, expected):
    assert total_price(cart) == expected
\`\`\`

Each case carries a full shopping cart structure, and the \`ids\` give the report meaningful names instead of dumping the raw dicts. This is how you cover realistic scenarios -- empty inputs, single records, multiple records -- in a compact, self-documenting table. When your parameters are complex, readable ids are not optional; they are what keeps the suite navigable.

## Best Practices for Maintainable Parametrized Tests

Keep parametrized tests readable by following a few conventions. First, always add \`ids\` once your values stop being trivially readable -- a report full of \`[obj0-obj1]\` is useless, while \`[empty-cart]\` is instantly clear. Second, keep one logical assertion per test even when parametrized; if you find yourself branching heavily inside the test based on the parameter, that is a sign you should split it into two parametrized tests.

Third, do not let stacking explode. Two stacked decorators of five cases each is twenty-five tests, which is fine; three stacked decorators of ten cases each is a thousand, which is usually a mistake. When only certain combinations matter, enumerate them in one explicit table instead of taking the full Cartesian product. Fourth, lift large or shared data tables into module-level constants or into \`conftest.py\` so multiple tests can reuse them, and so the data is reviewable separately from the test logic.

Finally, remember that parametrize composes with everything else in pytest -- markers, fixtures, \`xfail\`, and parallel execution. You can run a huge parametrized suite across CPU cores with pytest-xdist (see our [pytest-xdist parallel testing guide](/blog/pytest-xdist-parallel-testing-guide)), and you can browse ready-to-use parametrized test patterns in the [QASkills directory](/skills). Treating your parametrize tables as specifications -- clean, named, and reviewed -- is what makes data-driven testing pay off at scale.

## Frequently Asked Questions

### What does pytest.mark.parametrize do?

\`@pytest.mark.parametrize\` runs a single test function multiple times with different argument values. You declare the parameter names and a list of values, and pytest generates one independent test case per value, injecting it as the named argument. Each case is reported separately, so a failure in one input never stops the others from running. It eliminates duplicated tests that differ only in their inputs and expected outputs.

### How do I pass multiple arguments to pytest parametrize?

Pass the argument names as a single comma-separated string, then provide a list of tuples where each tuple supplies values for those names in order. For example, \`@pytest.mark.parametrize("a, b, expected", [(1, 2, 3), (0, 0, 0)])\` injects \`a\`, \`b\`, and \`expected\` for each tuple. Pytest runs the test once per tuple, mapping each value positionally to the declared parameter names.

### How do I set custom test ids in pytest parametrize?

Pass the \`ids\` parameter to the decorator with a list of strings, one per case, in the same order as your values. For example, \`ids=["empty", "single", "many"]\` labels the cases so the report shows \`test_name[empty]\` instead of an auto-generated id. You can also pass a function to \`ids\` that receives each value and returns a label, which is useful for programmatically generated cases.

### Can I use pytest parametrize with fixtures together?

Yes. A parametrized test can request fixtures like any other test. The fixture supplies shared setup or resources while the parametrize decorator supplies the varying inputs. Pytest injects both the fixture value and the current parameter into each generated case. For function-scoped fixtures, each case gets its own fresh fixture instance, keeping the parametrized cases fully isolated from one another.

### What is the difference between parametrize and a parametrized fixture?

\`@pytest.mark.parametrize\` varies the inputs for a single decorated test. A parametrized fixture (created with \`params=[...]\`) multiplies every test that requests it, running the whole dependent suite once per parameter. Use parametrize for data tables tied to one test; use a parametrized fixture to run many tests against multiple backends, browsers, or configurations. They can be combined for complex matrices.

### How do I stack multiple parametrize decorators in pytest?

Apply \`@pytest.mark.parametrize\` more than once to the same test function. Pytest produces the Cartesian product of all the decorators, generating a test for every combination. Two decorators of two and three values yield six tests. Stacking is concise but multiplies fast, so use it only when the dimensions are independent and you genuinely want exhaustive coverage; otherwise list the specific combinations in one table.

### How do I mark a single parametrize case as xfail or skip?

Wrap that case in \`pytest.param\` and pass \`marks=pytest.mark.xfail(...)\` or \`marks=pytest.mark.skipif(...)\`. For example, \`pytest.param(1, 0, None, marks=pytest.mark.xfail(reason="division by zero"))\` marks just that row as an expected failure while leaving the other cases normal. This keeps known-broken or platform-specific cases documented in the table instead of deleted, and \`pytest.param\` also accepts an \`id\` for that case.

## Conclusion

Parametrization turns repetitive, copy-pasted tests into a single declarative table that pytest expands into independent, separately reported cases. With \`@pytest.mark.parametrize\` you express your function's contract as input-output rows, add readable \`ids\` so failures explain themselves, stack decorators when you need a full matrix, and use \`pytest.param\` to document edge cases that are skipped or expected to fail. The result is less code, better diagnostics, and tests that read like a specification.

The deepest value comes from combining parametrize with the rest of pytest. Pair it with fixtures to supply shared resources alongside varying data, use indirect parametrization to route values through fixtures that build complex objects, and lift big data tables into \`conftest.py\` for reuse. To go further, master the fixture system in our [pytest fixtures and conftest.py guide](/blog/pytest-fixtures-conftest-complete-guide-2026), apply the conventions in our [pytest best practices](/blog/pytest-best-practices-2026), and explore ready-made data-driven patterns in the [QASkills directory](/skills). Treat your parametrize tables as living documentation and your suite will stay fast, clear, and trustworthy as it grows.
`,
};
