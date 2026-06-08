import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'pytest-bdd Tutorial 2026: Gherkin BDD Tests on the pytest Runner',
  description:
    'Learn pytest-bdd from scratch: write Gherkin .feature files, map step definitions, share data via fixtures, parse arguments, and run BDD on pytest with xdist.',
  date: '2026-06-08',
  category: 'Tutorial',
  content: `
# pytest-bdd Tutorial 2026: Gherkin BDD Tests on the pytest Runner

If you already write Python tests with pytest and you want behavior-driven development (BDD) without bolting on a second, parallel test runner, **pytest-bdd** is the tool you want. Unlike behave or lettuce, pytest-bdd is not a standalone framework. It is a pytest plugin. That single architectural decision changes everything. Your Gherkin \`.feature\` files become regular pytest tests, your step definitions are plain pytest functions, and every fixture, marker, plugin, and command-line flag you already know keeps working untouched.

That means you get \`pytest-xdist\` parallelism, \`pytest-cov\` coverage, \`pytest-html\` reporting, \`-k\` expression selection, \`-m\` marker filtering, conftest-based fixture sharing, and the entire pytest ecosystem for free. With behave you would have to reimplement or work around most of that. You write business-readable Gherkin for the stakeholders who need it, and underneath it is just pytest, so engineers debug it like any other test.

In this tutorial you will install pytest-bdd, lay out a sane project structure, write your first \`.feature\` file, bind steps with \`@given\`, \`@when\`, and \`@then\`, pass data between steps using fixtures and \`target_fixture\`, parse step arguments three different ways, parametrize with Scenario Outline and Examples, factor out shared setup with Background, select tests with tags, auto-generate missing step code, reuse steps via conftest, hook into the lifecycle, and run the whole suite in parallel. By the end you will have a complete, runnable BDD harness. This guide assumes Python 3.9+ and basic pytest familiarity. If you want a refresher on the runner itself, keep our [pytest cheatsheet](/blog/pytest-official-reference-cheatsheet-2026) open in another tab.

## What Is pytest-bdd and Why Choose It

pytest-bdd implements a subset of the Gherkin language on top of pytest. You write features in the same \`Given / When / Then\` syntax used by Cucumber and behave, but instead of a bespoke runner, pytest collects and executes them. A scenario becomes a test item; the steps become function calls wired together by decorators and pytest fixtures.

The headline benefits for an existing pytest team:

- **No second runner.** One \`pytest\` command runs unit tests, integration tests, and BDD scenarios together.
- **Fixtures everywhere.** Steps receive fixtures by name exactly like normal test functions. Database connections, browser sessions, fakes, and factories all come from \`conftest.py\`.
- **Full plugin ecosystem.** Parallelism, coverage, randomization, retries, HTML reports, and JUnit XML all just work.
- **Real debugging.** \`pytest --pdb\`, \`-x\`, \`--lf\`, and \`-vv\` apply to scenarios with zero special handling.

If your team is committed to BDD as a cross-functional discipline and you want a deeper dive into Gherkin authoring conventions, pair this article with our [BDD and Cucumber testing guide](/blog/bdd-cucumber-testing-guide).

## Installing pytest-bdd

pytest-bdd is published on PyPI. Install it alongside pytest into a virtual environment.

\`\`\`bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\\Scripts\\activate
pip install pytest pytest-bdd
\`\`\`

Pin it in your \`requirements.txt\` or \`pyproject.toml\` so CI is reproducible:

\`\`\`toml
# pyproject.toml
[project]
dependencies = [
  "pytest>=8.0",
  "pytest-bdd>=7.2",
]
\`\`\`

Verify the plugin is registered:

\`\`\`bash
pytest --version
# pytest 8.x.x
# registered third-party plugins:
#   pytest-bdd-7.x.x at .../pytest_bdd/plugin.py
\`\`\`

If \`pytest-bdd\` shows up in the plugin list, you are ready. No extra runner binary, no \`behave\` executable, nothing else to install.

## Project Layout

pytest-bdd does not force a structure, but a consistent one keeps features and step files easy to find. A common convention keeps \`.feature\` files in a \`features/\` directory and the Python test modules that load them next to your other tests.

\`\`\`text
project/
├── pyproject.toml
├── src/
│   └── shopping/
│       └── cart.py
└── tests/
    ├── conftest.py
    ├── features/
    │   ├── cart.feature
    │   └── login.feature
    └── step_defs/
        ├── conftest.py
        ├── test_cart.py
        └── test_login.py
\`\`\`

Test modules must be discoverable by pytest, so they keep the \`test_\` prefix. Feature files can live anywhere you point the loader at. You can also configure a base directory for features in \`pyproject.toml\`:

\`\`\`toml
[tool.pytest.ini_options]
bdd_features_base_dir = "tests/features"
\`\`\`

With that set, \`scenarios()\` and \`@scenario\` resolve paths relative to \`tests/features\`, so your test modules reference short relative paths.

## Writing Your First .feature File

A feature file describes behavior in plain language. It opens with a \`Feature:\` line, an optional free-text description, and one or more \`Scenario:\` blocks. Each scenario is a sequence of steps using the keywords \`Given\`, \`When\`, \`Then\`, and \`And\` (and \`But\`).

Create \`tests/features/cart.feature\`:

\`\`\`gherkin
Feature: Shopping cart totals
  As a shopper
  I want my cart to calculate totals correctly
  So that I am charged the right amount

  Scenario: Adding a single item
    Given an empty shopping cart
    When I add a "Keyboard" priced at 49.99
    Then the cart total should be 49.99
    And the cart should contain 1 item

  Scenario: Adding two different items
    Given an empty shopping cart
    When I add a "Keyboard" priced at 49.99
    And I add a "Mouse" priced at 19.99
    Then the cart total should be 69.98
    And the cart should contain 2 items
\`\`\`

The keywords carry meaning by convention: \`Given\` establishes context, \`When\` performs the action under test, \`Then\` asserts the outcome. \`And\` continues the previous keyword's intent so the prose reads naturally. pytest-bdd treats \`And\` and \`But\` as aliases for whatever keyword preceded them when matching steps.

## Loading Scenarios: scenarios() vs @scenario

A \`.feature\` file is just text until a Python module binds it. pytest-bdd offers two loaders.

The \`scenarios()\` function bulk-loads every scenario in one or more feature files. This is the quickest path and what you will use most:

\`\`\`python
# tests/step_defs/test_cart.py
from pytest_bdd import scenarios

# Load all scenarios from cart.feature as pytest tests
scenarios("../features/cart.feature")
\`\`\`

That single line generates one pytest test per scenario. Run \`pytest\` and you will see \`test_adding_a_single_item\` and \`test_adding_two_different_items\` collected.

The \`@scenario\` decorator binds exactly one scenario to one test function, which is useful when you need a custom test name or want to attach markers or extra logic to a specific scenario:

\`\`\`python
# tests/step_defs/test_cart.py
import pytest
from pytest_bdd import scenario

@pytest.mark.smoke
@scenario("../features/cart.feature", "Adding a single item")
def test_single_item():
    # The decorated function body runs AFTER all steps complete.
    pass
\`\`\`

Use \`scenarios()\` for breadth and \`@scenario\` when one scenario needs special treatment. You can mix both in the same module.

## Step Definitions with @given, @when, @then

Steps are bound to Python functions by matching the step text. Import the decorators and write one function per step phrase.

\`\`\`python
# tests/step_defs/test_cart.py
from pytest_bdd import scenarios, given, when, then, parsers
from shopping.cart import Cart

scenarios("../features/cart.feature")


@given("an empty shopping cart", target_fixture="cart")
def empty_cart():
    return Cart()


@when(parsers.parse('I add a "{name}" priced at {price:f}'))
def add_item(cart, name, price):
    cart.add(name, price)


@then(parsers.parse("the cart total should be {expected:f}"))
def check_total(cart, expected):
    assert cart.total == expected


@then(parsers.parse("the cart should contain {count:d} item"))
@then(parsers.parse("the cart should contain {count:d} items"))
def check_count(cart, count):
    assert len(cart.items) == count
\`\`\`

A few essentials are already visible here. The \`@given\` step returns a \`Cart\` and exposes it as a fixture named \`cart\` via \`target_fixture\`. The \`@when\` and \`@then\` steps request \`cart\` by name, just like any pytest test requesting a fixture. And one function can carry multiple decorators to match singular and plural phrasings. The supporting \`Cart\` implementation under test is trivial:

\`\`\`python
# src/shopping/cart.py
class Cart:
    def __init__(self):
        self.items = []

    def add(self, name, price):
        self.items.append((name, price))

    @property
    def total(self):
        return round(sum(price for _, price in self.items), 2)
\`\`\`

## Passing Data Between Steps with Fixtures

This is where pytest-bdd's design shines. Steps do not share state through magic globals or a \`context\` object the way behave does. They share state through pytest fixtures. There are two idioms.

**target_fixture** lets a step produce a value that later steps consume. The \`@given("an empty shopping cart", target_fixture="cart")\` above creates the \`cart\` fixture; every subsequent step that names \`cart\` receives the same instance for that scenario.

**A mutable fixture from conftest** works when several steps need to read and write shared scratch state:

\`\`\`python
# tests/step_defs/conftest.py
import pytest

@pytest.fixture
def context():
    return {}
\`\`\`

\`\`\`python
@when(parsers.parse("I apply coupon {code}"))
def apply_coupon(cart, context, code):
    context["last_coupon"] = code
    cart.apply_coupon(code)


@then(parsers.parse("the applied coupon should be {code}"))
def check_coupon(context, code):
    assert context["last_coupon"] == code
\`\`\`

Because fixtures are scoped per test by default, each scenario gets a fresh \`cart\` and \`context\` with no cross-contamination. You never write teardown code to reset state between scenarios; pytest's fixture lifecycle handles it. This is a major reliability advantage over frameworks that lean on a single shared mutable context.

## Step Argument Parsing: parse, cfparse, and re

Real steps contain data. pytest-bdd extracts that data through parsers, imported from \`pytest_bdd.parsers\`. There are three you will use.

\`parsers.parse\` uses simple \`{name}\` placeholders, optionally typed with a format spec like \`{price:f}\` or \`{count:d}\`. It is the most readable and covers the majority of cases.

\`parsers.cfparse\` (cardinality-field parse) extends \`parse\` with extended format syntax and custom type converters, useful for optional or repeated fields.

\`parsers.re\` uses a raw regular expression with named groups for full control when the others are not expressive enough.

Here is each one matching the same kind of step:

\`\`\`python
from pytest_bdd import when, parsers

# parse — clean placeholders with type specs
@when(parsers.parse('I add {qty:d} units of "{sku}"'))
def add_units_parse(cart, qty, sku):
    cart.add_units(sku, qty)


# cfparse — custom type converter for a comma list
@when(parsers.cfparse('I tag the order with {tags:Tags}', extra_types=dict(
    Tags=lambda s: [t.strip() for t in s.split(",")],
)))
def tag_order(order, tags):
    order.tags = tags


# re — full regex with named groups
@when(parsers.re(r'I wait (?P<seconds>\\d+) seconds? before paying'))
def wait_before_pay(context, seconds):
    context["wait"] = int(seconds)
\`\`\`

Use this reference to pick the right parser:

| Parser | Syntax style | Type conversion | Best for |
|---|---|---|---|
| \`parsers.parse\` | \`{name}\`, \`{name:f}\` | Built-in format specs (\`:d\`, \`:f\`, \`:s\`) | Most steps; clean and readable |
| \`parsers.cfparse\` | \`{name:Type}\` + \`extra_types\` | Custom converters, optional/repeat fields | Lists, optional args, custom domain types |
| \`parsers.re\` | Raw regex, \`(?P<name>...)\` | Manual (convert inside the function) | Complex matching the others cannot express |
| string (default) | Exact literal match | None | Steps with no arguments |

Common built-in format specs for \`parse\` and \`cfparse\`: \`:d\` integer, \`:f\` float, \`:w\` word, \`:l\` letters, \`:s\` whitespace, \`:S\` non-whitespace. Omit the spec and you get a string.

## Scenario Outline and Examples for Parametrization

When the same scenario should run across many input rows, use \`Scenario Outline\` with an \`Examples\` table. pytest-bdd maps each row to a separate parametrized test, so you get clear per-row pass/fail reporting.

\`\`\`gherkin
Feature: Discount rules

  Scenario Outline: Tiered discounts by spend
    Given an empty shopping cart
    When I add a "<product>" priced at <price>
    Then the discount applied should be <discount>

    Examples:
      | product  | price  | discount |
      | Keyboard | 49.99  | 0.0      |
      | Monitor  | 250.00 | 25.0     |
      | Laptop   | 1200.0 | 180.0    |
\`\`\`

The placeholders in angle brackets, like \`<product>\`, are filled from the matching column for each row. Your step definitions stay exactly the same as before; pytest-bdd substitutes the example values before matching:

\`\`\`python
@then(parsers.parse("the discount applied should be {discount:f}"))
def check_discount(cart, discount):
    assert cart.discount == discount
\`\`\`

Run it and pytest reports three test cases, one per Examples row:

\`\`\`bash
pytest tests/step_defs/test_discount.py -v
# test_tiered_discounts_by_spend[Keyboard-49.99-0.0] PASSED
# test_tiered_discounts_by_spend[Monitor-250.00-25.0] PASSED
# test_tiered_discounts_by_spend[Laptop-1200.0-180.0] PASSED
\`\`\`

This is real pytest parametrization under the hood, which means you can target a single row with \`-k\` or rerun only failures with \`--lf\`.

## Background: Shared Setup for Every Scenario

When every scenario in a feature needs the same preconditions, repeating the \`Given\` steps is noise. A \`Background\` block runs its steps before each scenario in the file.

\`\`\`gherkin
Feature: Authenticated checkout

  Background:
    Given a registered user "alice@example.com"
    And the user is logged in

  Scenario: Checkout with saved card
    When the user checks out with the saved card
    Then the order should be confirmed

  Scenario: Checkout with new card
    When the user enters a new card "4242424242424242"
    And the user checks out
    Then the order should be confirmed
\`\`\`

The two \`Background\` steps execute fresh before each scenario, so \`alice@example.com\` is logged in for both without duplicating the setup lines. Keep Background steps to genuine shared context only; pushing actions or assertions into Background hurts readability.

## Tags and Test Selection

Gherkin tags, written as \`@tag\` lines above a Feature or Scenario, become pytest markers in pytest-bdd. That means you select scenarios with the same \`-m\` marker expressions you use for unit tests.

\`\`\`gherkin
@checkout
Feature: Checkout flows

  @smoke
  Scenario: Happy path checkout
    Given an empty shopping cart
    When I add a "Keyboard" priced at 49.99
    Then the cart total should be 49.99

  @regression @slow
  Scenario: Bulk order checkout
    Given an empty shopping cart
    When I add 500 units of "Pencil"
    Then the order should be confirmed
\`\`\`

Register the markers in \`pyproject.toml\` to avoid warnings:

\`\`\`toml
[tool.pytest.ini_options]
markers = [
  "checkout: checkout related scenarios",
  "smoke: critical smoke tests",
  "regression: full regression scenarios",
  "slow: long running scenarios",
]
\`\`\`

Now select with marker expressions or keyword expressions:

\`\`\`bash
pytest -m smoke                 # only @smoke scenarios
pytest -m "regression and not slow"
pytest -k "checkout and happy"  # match by test name substring
\`\`\`

Tags applied at the \`Feature:\` level propagate to every scenario in that file, so \`@checkout\` above marks both scenarios.

## Generating Missing Step Code

Writing step boilerplate by hand is tedious. pytest-bdd ships two commands that generate it for you.

\`pytest-bdd generate\` prints stub functions for every step in one or more feature files. Pipe it into a new module:

\`\`\`bash
pytest-bdd generate tests/features/cart.feature > tests/step_defs/test_cart.py
\`\`\`

That emits a ready-to-edit skeleton with \`@scenario\`, \`@given\`, \`@when\`, and \`@then\` placeholders matching every step. You then fill in the bodies.

When you run a scenario that has unbound steps, pass \`--generate-missing\` to see exactly which steps lack definitions and get copy-paste stubs without failing on a confusing error:

\`\`\`bash
pytest tests/step_defs/test_cart.py --generate-missing --feature tests/features/cart.feature
\`\`\`

The output lists each missing step and prints a stub you can paste straight into your step module. This is the fastest way to keep step definitions in sync as features evolve.

## Reusing Steps Across Features via conftest

Step definitions placed in a \`conftest.py\` are visible to every test module in that directory and below, exactly like fixtures. This is how you share common steps such as login, navigation, or teardown across many feature files without duplication.

\`\`\`python
# tests/step_defs/conftest.py
import pytest
from pytest_bdd import given, when, parsers
from shopping.cart import Cart


@given("an empty shopping cart", target_fixture="cart")
def empty_cart():
    return Cart()


@given(parsers.parse('a registered user "{email}"'), target_fixture="user")
def registered_user(email):
    return {"email": email, "logged_in": False}


@when("the user is logged in")
@given("the user is logged in")
def log_in(user):
    user["logged_in"] = True
\`\`\`

Any \`test_*.py\` module under \`tests/step_defs/\` can now use \`an empty shopping cart\` or \`a registered user "..."\` without redefining them. Keep generic, reusable steps in \`conftest.py\` and scenario-specific steps in the test module that loads that feature. This mirrors how pytest fixtures are shared and keeps your step library DRY.

## Hooks: Customizing the Lifecycle

pytest-bdd exposes hooks for instrumenting steps and scenarios, declared in \`conftest.py\`. They are invaluable for logging, screenshots on failure, or attaching context to reports.

\`\`\`python
# tests/step_defs/conftest.py

def pytest_bdd_before_scenario(request, feature, scenario):
    print(f"Starting scenario: {scenario.name}")


def pytest_bdd_after_scenario(request, feature, scenario):
    print(f"Finished scenario: {scenario.name}")


def pytest_bdd_before_step(request, feature, scenario, step, step_func):
    print(f"  step -> {step.keyword} {step.name}")


def pytest_bdd_step_error(request, feature, scenario, step, step_func, step_func_args, exception):
    # Perfect place to capture a screenshot or dump state on failure
    print(f"  FAILED at step: {step.name} -> {exception}")
\`\`\`

The \`pytest_bdd_step_error\` hook is the one teams reach for most: in UI automation it captures a screenshot and the page URL the moment a step throws, which makes flaky failures far easier to diagnose. Because these are ordinary pytest hooks, they coexist with \`pytest_runtest_makereport\` and any other hook you already use.

## Running BDD Scenarios in Parallel with pytest-xdist

Because scenarios are pytest tests, \`pytest-xdist\` parallelizes them across CPU cores with no special configuration. Install it and add \`-n\`:

\`\`\`bash
pip install pytest-xdist
pytest -n auto                  # use all available cores
pytest -n 4                     # use 4 workers
pytest -n auto -m smoke         # parallel + marker selection together
\`\`\`

Each worker gets its own process, so your fixtures must be safe to instantiate per worker. Function-scoped fixtures like the \`cart\` and \`context\` above are inherently isolated and parallelize cleanly. For shared resources such as a database, use \`pytest-xdist\` group scheduling or worker-aware fixtures. This is a capability behave simply does not offer out of the box, and it is one of the strongest reasons pytest users pick pytest-bdd. For a deep dive on safe parallelization patterns, distribution modes, and avoiding shared-state races, see our [pytest-xdist parallel testing guide](/blog/pytest-xdist-parallel-testing-guide).

## Reporting

Standard pytest reporting plugins apply directly. Generate an HTML report, JUnit XML for CI, or a Cucumber-style JSON report.

\`\`\`bash
pip install pytest-html
pytest --html=report.html --self-contained-html   # rich HTML report
pytest --junitxml=results.xml                      # JUnit XML for CI dashboards
\`\`\`

pytest-bdd also supports a Cucumber-compatible JSON report through the \`--cucumberjson\` option, which lets you feed BDD results into dashboards that expect Cucumber output:

\`\`\`bash
pytest --cucumber-json=cucumber.json
\`\`\`

Because everything funnels through pytest's reporting machinery, scenario names, parametrized Examples rows, and tags all show up correctly in whichever report format your pipeline consumes.

## pytest-bdd vs behave vs cucumber-py

All three speak Gherkin, but they differ sharply in architecture and ergonomics. The table below summarizes the trade-offs for a Python team.

| Aspect | pytest-bdd | behave | radish / cucumber-py |
|---|---|---|---|
| Runner | pytest plugin (no separate runner) | Standalone \`behave\` runner | Standalone runner |
| Fixtures | Native pytest fixtures + \`target_fixture\` | Single shared \`context\` object | Custom context handling |
| Parallelism | \`pytest-xdist\` (\`-n auto\`) built in | Not built in; needs external tooling | Limited |
| Plugin ecosystem | Entire pytest ecosystem | Behave-specific extensions only | Small ecosystem |
| Step selection | \`-k\`, \`-m\`, markers from tags | Tag expressions only | Tag expressions |
| Parametrization | Scenario Outline maps to pytest params | Scenario Outline | Scenario Outline + scenario loops |
| Debugging | \`--pdb\`, \`-x\`, \`--lf\` from pytest | Limited | Limited |
| Best fit | Teams already on pytest | Pure-BDD teams wanting strict separation | Niche / specific feature needs |

The short version: if your codebase is already pytest, pytest-bdd removes friction. If you want BDD artifacts deliberately isolated from your unit-test stack and your team thinks of Gherkin as a separate discipline, behave's stricter separation can be a feature rather than a bug. For most Python teams shipping today, the fixture reuse and free parallelism tip the balance toward pytest-bdd.

## Best Practices

A few habits keep a pytest-bdd suite maintainable as it grows:

- **Keep steps declarative.** Write \`When the user checks out\`, not \`When the user clicks the #checkout-btn element\`. UI details belong in step implementations and page objects, not in Gherkin.
- **One concept per step.** Avoid steps that do three things; they become impossible to reuse.
- **Share via conftest, scope via modules.** Generic steps and fixtures live in \`conftest.py\`; scenario-specific steps stay with the module that loads the feature.
- **Prefer target_fixture over mutable context** for produced values. It reads clearly and benefits from pytest's isolation.
- **Register your markers** in \`pyproject.toml\` so tag-derived markers do not emit warnings and \`--strict-markers\` stays green.
- **Run with \`--generate-missing\` in CI dry runs** to catch features that drifted ahead of their step definitions.
- **Parallelize early.** Design fixtures to be function-scoped and isolated so \`-n auto\` works from day one rather than requiring a painful retrofit.

Browsing curated, ready-to-install testing skills can accelerate adoption across your team. Explore the [QA skills directory](/skills) for pytest, BDD, and automation skill packs you can drop into your AI coding agent.

## Frequently Asked Questions

### What is the difference between pytest-bdd and pytest?

pytest is the test runner and framework. pytest-bdd is a plugin that adds Gherkin BDD support on top of pytest. With pytest-bdd you write \`.feature\` files in Given/When/Then syntax and bind them to Python step functions, and pytest collects those scenarios as ordinary tests. You still run everything with the \`pytest\` command and keep all pytest features.

### Is pytest-bdd better than behave?

For teams already using pytest, usually yes. pytest-bdd reuses your fixtures, markers, and the entire pytest plugin ecosystem including \`pytest-xdist\` parallelism, which behave lacks out of the box. behave uses a separate runner and a single shared context object. If you specifically want BDD strictly isolated from unit tests, behave's separation may suit you better, but most pytest shops prefer pytest-bdd.

### How do I pass data between steps in pytest-bdd?

Use fixtures. A step can produce a value with \`target_fixture="name"\`, and any later step that requests that fixture by name receives the same instance for the scenario. For shared scratch state, define a mutable fixture such as \`context\` returning a dict in \`conftest.py\` and read or write it from multiple steps. Each scenario gets fresh fixtures automatically.

### How does Scenario Outline work in pytest-bdd?

\`Scenario Outline\` plus an \`Examples\` table runs the same scenario once per data row. Placeholders in angle brackets like \`<price>\` are substituted from the matching column for each row. Under the hood pytest-bdd turns each row into a parametrized pytest test, so you get individual pass/fail reporting per row and can target one row with \`-k\` or rerun failures with \`--lf\`.

### How do I generate missing step definitions automatically?

Run \`pytest-bdd generate path/to/file.feature\` to print stub functions for every step, or run your tests with \`--generate-missing --feature path/to/file.feature\` to list only the unbound steps with copy-paste stubs. Both produce skeleton \`@given\`, \`@when\`, and \`@then\` functions matching the step text, which you then fill in with real logic.

### Can pytest-bdd run tests in parallel?

Yes. Because scenarios are regular pytest tests, install \`pytest-xdist\` and run \`pytest -n auto\` to distribute scenarios across all CPU cores, or \`-n 4\` for a fixed worker count. Keep fixtures function-scoped and isolated so each worker process is safe. Marker selection like \`-m smoke\` combines freely with \`-n auto\`.

### Which step argument parser should I use?

Start with \`parsers.parse\`, which uses \`{name}\` placeholders and type specs like \`{price:f}\`. Use \`parsers.cfparse\` when you need custom type converters, lists, or optional fields. Drop to \`parsers.re\` with named regex groups only when the matching logic is too complex for the others. For steps with no arguments, pass a plain string for an exact literal match.

### Do Gherkin tags become pytest markers?

Yes. A \`@tag\` above a Feature or Scenario becomes a pytest marker of the same name. You can then select scenarios with \`-m smoke\` or marker expressions like \`-m "regression and not slow"\`. Tags on the \`Feature:\` line apply to every scenario in that file. Register your markers in \`pyproject.toml\` to avoid warnings and support \`--strict-markers\`.

## Conclusion

pytest-bdd gives you business-readable Gherkin without giving up a single thing you love about pytest. You write \`.feature\` files for stakeholders, bind them with \`@given\`, \`@when\`, and \`@then\`, share state through fixtures and \`target_fixture\`, parse arguments three ways, parametrize with Scenario Outline, factor out Background, select with tags, and parallelize with \`pytest-xdist\` for free. Because every scenario is a real pytest test, your existing coverage, reporting, and debugging tooling keeps working untouched.

Start small: convert one well-understood flow to a feature file, wire up the steps, and run it alongside your unit tests. Once your team sees Gherkin scenarios running in the same \`pytest -n auto\` command as everything else, broader adoption follows naturally.

Ready to go deeper? Bookmark the [pytest cheatsheet](/blog/pytest-official-reference-cheatsheet-2026), level up your BDD fundamentals with the [BDD and Cucumber guide](/blog/bdd-cucumber-testing-guide), scale execution with the [pytest-xdist parallel testing guide](/blog/pytest-xdist-parallel-testing-guide), and browse the [QA skills directory](/skills) to equip your AI coding agent with ready-made testing skills.
`,
};
