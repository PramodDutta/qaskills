import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Keyword-Driven Testing in Python: Complete Example 2026',
  description:
    'Build a keyword-driven testing framework in Python from scratch: keyword design, data-driven keywords, Robot Framework vs custom Python, and a full example.',
  date: '2026-06-03',
  category: 'Guide',
  content: `
# Keyword-Driven Testing in Python: Complete Example 2026

Keyword-driven testing is one of the oldest and most durable ideas in test automation, and in 2026 it is more relevant than ever because it answers a problem every growing test suite eventually hits: as you write more tests, you copy more low-level code, and that duplication becomes a maintenance nightmare. The moment a login flow changes, you are editing it in forty places. Keyword-driven testing solves this by separating *what* a test does from *how* it does it. Test cases are written as sequences of high-level keywords — \`Open Login Page\`, \`Enter Credentials\`, \`Submit\`, \`Verify Dashboard\` — and the implementation of each keyword lives in exactly one place. Change the implementation once, and every test that uses the keyword is fixed.

The payoff is twofold. First, maintenance collapses: a UI change touches one keyword, not every test. Second, tests become readable by people who do not write code. A product manager or business analyst can read \`Add Item To Cart\` then \`Checkout\` then \`Verify Order Confirmation\` and understand exactly what is being tested, even author new test cases by recombining existing keywords. This is why keyword-driven testing is the foundation of popular tools like Robot Framework, and why building a lightweight version in pure Python is a skill worth having.

This guide builds a complete keyword-driven framework in Python from first principles. We cover the architecture (the three layers that make it work), how to design good keywords, how to make keywords data-driven so one keyword runs against many data sets, a full runnable example you can adapt, and an honest comparison of rolling your own versus adopting Robot Framework. All code is plain Python you can run today. By the end you will understand the pattern deeply enough to build it, extend it, or choose a tool that implements it. See also our [pytest complete guide](/blog) and the [QA skills directory](/skills).

## What Keyword-Driven Testing Is

A keyword-driven test framework has three layers, and understanding them is the whole game.

The **test layer** is the test cases themselves, expressed as ordered lists of keywords with arguments. Crucially, this layer contains no implementation — no Selenium calls, no assertions, no waits. It reads like a recipe:

\`\`\`
open application      -> https://shop.example.com
login                 -> shopper@example.com, secret123
add to cart           -> Wireless Headphones
verify cart count     -> 1
\`\`\`

The **keyword layer** (also called the library or action layer) is where each keyword is implemented as a function. \`login\` knows how to find the email field, type into it, find the password field, type, and click submit. This is the only place that knowledge exists. When the login page is redesigned, you fix \`login\` here and every test is repaired.

The **driver layer** (or engine) is the machinery that reads test cases, looks up each keyword in the keyword layer, calls it with its arguments, records pass/fail, and produces a report. It is the glue that turns a list of keyword names into executed actions.

The flow looks like this:

| Layer | Contains | Who edits it | Changes when |
|---|---|---|---|
| Test layer | Keyword sequences + data | QA analysts, BAs, anyone | Requirements change |
| Keyword layer | Python functions per keyword | Automation engineers | UI/implementation changes |
| Driver layer | Engine that runs keywords | Framework maintainer | Rarely (framework features) |

The separation is what gives the pattern its power. Test authors work in a vocabulary of business actions; engineers maintain a stable library of those actions; the driver never changes. Duplication is eliminated because each action exists once, and readability is maximized because tests are a sequence of named intentions rather than a wall of API calls.

## Designing Good Keywords

A keyword-driven framework is only as good as its keyword vocabulary. Poorly designed keywords recreate the duplication problem at a higher level; well-designed ones compose into any test you need. Here are the design principles that matter.

**Keywords should be at the business level, not the click level.** A common beginner mistake is making keywords like \`Click Element\`, \`Type Text\`, \`Wait\`. These are just thin wrappers over the automation library and provide no abstraction — your test layer ends up as verbose as raw code. Instead, name keywords after user intentions: \`Login\`, \`Search For Product\`, \`Add To Cart\`, \`Complete Checkout\`. Each business keyword internally calls several low-level actions, hiding them from the test author.

**Keywords should do one logical thing and be composable.** \`Login\` should log in — not log in *and* verify the dashboard *and* check the welcome message. Keep \`Login\` and \`Verify Dashboard Loaded\` separate so tests can combine them as needed. A test that only cares about login does not get forced to assert on the dashboard.

**Keywords should take data as arguments, never hardcode it.** \`Login\` takes \`username\` and \`password\`; it does not hardcode a test account. This is what makes keywords reusable across data sets and is the bridge to data-driven testing.

**Keywords should fail clearly.** When a keyword fails, the error should say which keyword and why — "Login failed: password field not found" beats a raw stack trace. The driver should attach the keyword name to every failure.

Here is the contrast in practice:

| Anti-pattern (too low-level) | Good keyword (business-level) |
|---|---|
| \`Click "#login-btn"\` | \`Login(username, password)\` |
| \`Type "#search" "shoes"\` | \`Search For Product(query)\` |
| \`Click ".add-cart"\` + \`Wait 2s\` | \`Add To Cart(product_name)\` |
| \`Assert text "#count" == "1"\` | \`Verify Cart Count(expected)\` |

The rule of thumb: if a non-technical person reading your test layer would understand the test, your keywords are at the right level. If they see CSS selectors and waits, the keywords are too low-level.

## Building the Framework: The Keyword Library

Let's build a working framework. We will start with the keyword library — the functions that implement each business action. For clarity the example uses a simple simulated "application under test"; in a real project these functions would drive Selenium, Playwright, or an HTTP client.

\`\`\`python
# keywords.py
"""Keyword library: each function is one business-level keyword."""


class KeywordLibrary:
    """Holds state (e.g. a browser/session) and exposes keywords as methods."""

    def __init__(self, app):
        # 'app' stands in for a browser driver, API client, etc.
        self.app = app
        self.current_user = None

    def open_application(self, url: str):
        """Keyword: open the application at the given URL."""
        self.app.navigate(url)
        if not self.app.is_loaded():
            raise AssertionError(f"Application failed to load at {url}")

    def login(self, username: str, password: str):
        """Keyword: log in with the given credentials."""
        self.app.fill("email", username)
        self.app.fill("password", password)
        self.app.click("submit")
        if self.app.has_error():
            raise AssertionError(f"Login failed for user '{username}'")
        self.current_user = username

    def add_to_cart(self, product_name: str):
        """Keyword: add a named product to the cart."""
        self.app.click(f"product:{product_name}")
        self.app.click("add-to-cart")

    def verify_cart_count(self, expected: str):
        """Keyword: assert the cart shows the expected item count."""
        actual = self.app.text("cart-count")
        if actual != str(expected):
            raise AssertionError(
                f"Cart count mismatch: expected {expected}, got {actual}"
            )

    def logout(self):
        """Keyword: log the current user out."""
        self.app.click("account-menu")
        self.app.click("logout")
        self.current_user = None
\`\`\`

Three things to notice. First, every method is a business-level keyword, not a low-level click. Second, keywords raise \`AssertionError\` with a clear message on failure — the driver will catch this and report it. Third, the library holds state (\`self.app\`, \`self.current_user\`), so keywords can share a session across a test. This class is the single source of truth for *how* each action works.

## Building the Framework: The Driver Engine

The driver reads test cases, resolves each keyword name to a method on the library, calls it with the supplied arguments, and records results. This is the engine that makes keyword-driven tests run.

\`\`\`python
# driver.py
"""Driver engine: executes keyword-driven test cases."""
from dataclasses import dataclass, field


@dataclass
class StepResult:
    keyword: str
    args: list
    passed: bool
    message: str = ""


@dataclass
class TestResult:
    name: str
    steps: list = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return all(s.passed for s in self.steps)


class KeywordDriver:
    def __init__(self, library):
        self.library = library

    def _resolve(self, keyword: str):
        """Map a keyword name like 'add to cart' to the method 'add_to_cart'."""
        method_name = keyword.strip().lower().replace(" ", "_")
        method = getattr(self.library, method_name, None)
        if method is None or not callable(method):
            raise LookupError(f"Unknown keyword: '{keyword}'")
        return method

    def run_test(self, name: str, steps: list) -> TestResult:
        """Run one test case. 'steps' is a list of (keyword, [args]) tuples."""
        result = TestResult(name=name)
        for keyword, args in steps:
            try:
                method = self._resolve(keyword)
                method(*args)
                result.steps.append(StepResult(keyword, args, passed=True))
            except (AssertionError, LookupError) as exc:
                result.steps.append(
                    StepResult(keyword, args, passed=False, message=str(exc))
                )
                # Stop on first failure within a test (fail-fast per test).
                break
        return result

    def run_suite(self, tests: list) -> list:
        """Run many tests. 'tests' is a list of (name, steps) tuples."""
        return [self.run_test(name, steps) for name, steps in tests]
\`\`\`

The heart of it is \`_resolve\`: it converts a human-friendly keyword name (\`"add to cart"\`) into a Python method name (\`add_to_cart\`) and fetches it from the library via \`getattr\`. This is the dispatch mechanism that lets test authors write natural keyword names while the implementation lives in tidy Python methods. The driver also records a structured \`StepResult\` for every step and a \`TestResult\` per test, which is what you turn into a report. Notice the driver is completely generic — it knows nothing about login, carts, or any specific application. Add a hundred new keywords to the library and the driver never changes.

## Writing Test Cases

Now the payoff: test cases are just data. They list keywords and arguments, with zero implementation detail. This is the layer a non-engineer can read and write.

\`\`\`python
# run_tests.py
from keywords import KeywordLibrary
from driver import KeywordDriver
from fake_app import FakeApp  # your real driver: Selenium/Playwright/HTTP

# Test cases as data: (test name, [(keyword, [args]), ...])
tests = [
    (
        "Successful login and add to cart",
        [
            ("open application", ["https://shop.example.com"]),
            ("login", ["shopper@example.com", "secret123"]),
            ("add to cart", ["Wireless Headphones"]),
            ("verify cart count", ["1"]),
            ("logout", []),
        ],
    ),
    (
        "Login fails with wrong password",
        [
            ("open application", ["https://shop.example.com"]),
            ("login", ["shopper@example.com", "WRONG"]),
        ],
    ),
]

library = KeywordLibrary(app=FakeApp())
driver = KeywordDriver(library)
results = driver.run_suite(tests)

# Simple report.
for r in results:
    status = "PASS" if r.passed else "FAIL"
    print(f"[{status}] {r.name}")
    for step in r.steps:
        mark = "  ok " if step.passed else "  XX "
        print(f"{mark}{step.keyword} {step.args} {step.message}")
\`\`\`

Read the first test out loud: open the app, log in, add headphones, verify one item, log out. No selectors, no waits, no assertions visible — just intentions. That is the readability dividend. And because test cases are plain Python data structures, they could equally come from a CSV file, an Excel sheet, a YAML file, or a database — which is exactly how Robot Framework and commercial keyword tools let non-programmers author tests in a spreadsheet.

## Making Keywords Data-Driven

The natural next step is data-driven keyword testing: running the same keyword sequence against many data sets. This combines the maintenance benefits of keyword-driven testing with the coverage benefits of data-driven testing, and it is where the pattern really pays off.

Instead of writing one test per data row, you write the keyword sequence once as a template and feed it rows of data. Here is a clean way to do that, loading data from an external file so non-engineers can edit the data without touching code:

\`\`\`python
# data_driven.py
import csv


def load_login_dataset(path: str):
    """Read login test data from a CSV: username,password,expected."""
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def build_login_tests(dataset):
    """Generate one keyword-driven test per data row."""
    tests = []
    for row in dataset:
        name = f"Login: {row['username']} expect {row['expected']}"
        steps = [
            ("open application", ["https://shop.example.com"]),
            ("login", [row["username"], row["password"]]),
        ]
        # Add a verification step appropriate to the expected outcome.
        if row["expected"] == "success":
            steps.append(("verify cart count", ["0"]))  # logged in, empty cart
        # For 'failure' rows, the login keyword itself should raise.
        tests.append((name, steps))
    return tests
\`\`\`

With a CSV like this:

\`\`\`
username,password,expected
shopper@example.com,secret123,success
admin@example.com,admin123,success
shopper@example.com,WRONG,failure
,,failure
\`\`\`

You get four tests generated automatically, each exercising the same keywords with different data. Adding a fifth scenario is one new line in the CSV — no code change. This is the table that summarizes how the two patterns combine:

| Pattern | What varies | What stays fixed | Benefit |
|---|---|---|---|
| Keyword-driven | The keyword sequence | The keyword implementations | Readability, low maintenance |
| Data-driven | The input data | The keyword sequence | Broad coverage from one test |
| Both combined | Data rows | Keywords + their implementations | Readable, low-maintenance, high-coverage |

The combined approach is the sweet spot for regression suites: engineers maintain a stable keyword library, the keyword sequences encode the business flows, and QA analysts expand coverage by adding data rows in a spreadsheet.

## Robot Framework vs Custom Python

You have just built a keyword-driven framework in about a hundred lines. The obvious question: should you, or should you use Robot Framework, the most popular off-the-shelf keyword-driven tool in the Python world?

Robot Framework is a mature, open-source, keyword-driven automation framework. It provides the driver engine, a tabular/plain-text syntax for writing test cases, a huge ecosystem of libraries (SeleniumLibrary, Browser/Playwright, RequestsLibrary for APIs, and hundreds more), rich HTML reports and logs out of the box, tagging, setup/teardown, variables, and the ability to write custom keywords in Python. A Robot test looks like this:

\`\`\`robotframework
*** Settings ***
Library    SeleniumLibrary

*** Test Cases ***
Successful Login And Add To Cart
    Open Application      https://shop.example.com
    Login                 shopper@example.com    secret123
    Add To Cart           Wireless Headphones
    Verify Cart Count     1
    Logout
\`\`\`

That is the same test you wrote, in Robot's native syntax, with reporting and a library ecosystem you did not have to build. The keywords (\`Login\`, \`Add To Cart\`) are still implemented in Python, exactly like your \`KeywordLibrary\`. Here is the honest comparison:

| Factor | Custom Python framework | Robot Framework |
|---|---|---|
| Setup effort | You build the driver, reporting, data loading | Ready out of the box |
| Reporting | DIY (you saw a basic version above) | Rich HTML reports, logs, screenshots built in |
| Library ecosystem | You write every integration | SeleniumLibrary, Browser (Playwright), Requests, +hundreds |
| Test syntax | Python data structures or your own DSL | Readable tabular keyword syntax for non-coders |
| Learning curve | Just Python | Robot syntax + Python for custom keywords |
| Flexibility / control | Total — it is your code | High, but within Robot's conventions |
| Best for | Small/embedded needs, full control, learning | Teams wanting a proven, batteries-included tool |
| Maintenance burden | You maintain the framework itself | Maintained by the Robot community |

The decision: build your own when you want full control, have unusual requirements Robot's conventions fight against, are embedding keyword execution inside a larger Python application, or are learning the pattern. Choose Robot Framework for almost any real team project, because reinventing reporting, library integrations, and a test runner is a large ongoing cost that Robot has already paid for you. The pattern you learned by building the framework is exactly the pattern Robot implements — your custom \`KeywordLibrary\` becomes a Robot library, your \`open_application\` and \`login\` become Robot keywords, and Robot supplies the driver and reporting. Understanding the mechanics makes you far more effective with Robot, even if you never ship your own engine.

## Integrating with Selenium or Playwright

The examples used a \`FakeApp\` placeholder so the framework logic was clear. In production, your keyword library wraps a real automation driver. The beauty of the architecture is that only the keyword library changes — the driver engine and test cases are untouched. Here is \`login\` rewritten against Playwright for Python:

\`\`\`python
# keywords_playwright.py
from playwright.sync_api import Page, expect


class WebKeywordLibrary:
    def __init__(self, page: Page):
        self.page = page

    def open_application(self, url: str):
        self.page.goto(url)

    def login(self, username: str, password: str):
        self.page.get_by_label("Email").fill(username)
        self.page.get_by_label("Password").fill(password)
        self.page.get_by_role("button", name="Log in").click()
        # Resilient assertion: the account menu appears only when logged in.
        expect(self.page.get_by_role("button", name="Account")).to_be_visible()

    def add_to_cart(self, product_name: str):
        self.page.get_by_role("link", name=product_name).click()
        self.page.get_by_role("button", name="Add to cart").click()

    def verify_cart_count(self, expected: str):
        expect(self.page.get_by_test_id("cart-count")).to_have_text(str(expected))
\`\`\`

The exact same test cases from \`run_tests.py\` now drive a real browser, because the keyword names and arguments are identical — only the implementation behind each keyword changed. This is the portability dividend of keyword-driven design: you can swap the entire automation backend (Selenium to Playwright, web to API, or a real driver for a fake one in unit tests) without rewriting a single test case. That decoupling is the strongest argument for the pattern in long-lived test suites.

## Frequently Asked Questions

### What is the difference between keyword-driven and data-driven testing?

Keyword-driven testing separates test logic into reusable named keywords (the *actions* a test performs), so test cases read as sequences of business steps and implementations live in one place. Data-driven testing varies the *input data* across runs of the same test. They are complementary: a keyword-driven framework that feeds data rows into a fixed keyword sequence gets readability and low maintenance from keywords plus broad coverage from data.

### Should I build my own framework or use Robot Framework?

For most real team projects, use Robot Framework — it provides the driver engine, rich HTML reporting, and a huge library ecosystem (Selenium, Playwright, Requests) out of the box, so you avoid reinventing all of that. Build your own only when you need total control, have requirements that fight Robot's conventions, are embedding keyword execution inside a larger app, or are learning the pattern. The mechanics are identical either way.

### How do I keep keywords from becoming too low-level?

Name keywords after user intentions, not UI mechanics. \`Login(username, password)\` is good; \`Click "#login-btn"\` is not. Each business keyword should internally call several low-level actions, hiding selectors and waits from the test author. The test: if a non-technical person can read your test cases and understand them, your keywords are at the right level; if they see CSS selectors, the keywords are too low-level.

### Can non-programmers write keyword-driven tests?

Yes, that is a core benefit. Because test cases are sequences of named keywords with data — and can be stored in CSV, Excel, or YAML files — QA analysts and business analysts can author and maintain tests by combining existing keywords and editing data, without writing code. Engineers maintain the keyword library; non-programmers compose tests from it. Robot Framework's tabular syntax is designed exactly for this collaboration.

### How does keyword-driven testing reduce maintenance?

Each action is implemented in exactly one place — the keyword library. When the UI or implementation changes, you update the single keyword affected and every test that uses it is repaired automatically. Contrast this with copy-pasted low-level code, where a login change forces edits in dozens of tests. The single-source-of-truth property is what collapses maintenance cost as the suite grows.

### Does keyword-driven testing work for API testing too?

Absolutely. The pattern is backend-agnostic. Instead of keywords driving a browser, your keyword library wraps an HTTP client, with keywords like \`Create User(payload)\`, \`Get Order(id)\`, and \`Verify Status Code(expected)\`. The driver engine and test-case format are unchanged — only the keyword implementations differ. Robot Framework's RequestsLibrary provides ready-made HTTP keywords for exactly this use case.

### How do I report results from a custom keyword framework?

Record a structured result per step and per test (as the example's \`StepResult\` and \`TestResult\` dataclasses do), then render them however you need — console output, a JUnit XML file for CI, or an HTML page. For anything beyond basic reporting, this DIY effort is significant, which is a strong reason to adopt Robot Framework, whose built-in HTML reports, logs, and screenshot-on-failure are production-grade out of the box.

### Can I swap Selenium for Playwright without rewriting tests?

Yes, and this is the architecture's biggest strength. Because test cases reference only keyword names and arguments, swapping the automation backend means rewriting only the keyword library's implementations — the driver engine and every test case stay identical. The guide shows the same test cases running first against a fake app and then against real Playwright, demonstrating that the test layer is fully decoupled from the automation technology.

## Conclusion

Keyword-driven testing endures because it solves a real and growing pain: duplication and unreadability in large test suites. By splitting tests into three layers — readable keyword sequences, a single-source keyword library, and a generic driver — you get tests that non-engineers can read and write, maintenance that collapses to one edit per change, and an automation backend you can swap without touching a single test case. Building the framework in plain Python, as we did here, takes only about a hundred lines and teaches you the pattern from the inside out.

In practice, most teams should learn the mechanics by building a small version, then adopt Robot Framework for real projects to get reporting, a library ecosystem, and a test runner for free. Layer data-driven techniques on top — feeding CSV or spreadsheet rows into stable keyword sequences — and you have a regression suite that is readable, low-maintenance, broadly covering, and editable by your whole QA team. The architecture's decoupling of *what* from *how* is its lasting gift: it keeps your tests honest, your maintenance cheap, and your tooling choices open.

Find ready-to-use Python testing, Robot Framework, and Playwright skills in the [QA skills directory](/skills), compare automation tools on our [comparison pages](/compare), and read more hands-on guides on the [QASkills blog](/blog).
`,
};
