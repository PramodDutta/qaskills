import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pytest Coverage with pytest-cov: Complete 2026 Guide',
  description:
    'Measure pytest code coverage with pytest-cov: --cov, pyproject.toml config, branch coverage, HTML/XML reports, --cov-fail-under, and combining in CI.',
  date: '2026-06-13',
  category: 'Guide',
  content: `
# Pytest Coverage with pytest-cov: The Complete 2026 Guide

Code coverage tells you which lines of your application actually ran while your tests executed. It does not prove your tests are good, but it reliably exposes the code that no test touches at all, and that information is gold when you are deciding where to invest testing effort. In the Python world the de facto tool for this job is **pytest-cov**, a thin pytest plugin that wraps the venerable \`coverage.py\` library and wires it directly into your normal \`pytest\` command. Instead of running coverage as a separate step, you add a \`--cov\` flag and get a coverage report printed alongside your test results.

This guide is a complete, practical walkthrough of pytest coverage in 2026. We assume you are on pytest 8.x and a recent \`pytest-cov\` (6.x line, which depends on \`coverage.py\` 7.x) running on Python 3.9 or newer. We will cover installation, the \`--cov\` flags you actually use day to day, configuring coverage in \`pyproject.toml\` and \`.coveragerc\`, the difference between statement and branch coverage, generating \`term-missing\`, HTML and XML reports, enforcing a minimum with \`--cov-fail-under\`, excluding code you intentionally do not test, and the subtle but important problem of **combining** coverage data across parallel processes and CI matrix jobs. Every section has runnable commands and config you can paste into your own project.

If you are still getting comfortable with the test runner itself, start with [what is pytest in Python](/blog/what-is-pytest-python-explained) and the broader [pytest best practices for 2026](/blog/pytest-best-practices-2026), then come back here to add coverage on top. If you would rather have an AI coding agent wire up coverage and enforce a threshold automatically, install the [pytest patterns skill](/skills) into Claude Code, Cursor, or Copilot.

## Installing pytest-cov

\`pytest-cov\` is a plugin, so you install it alongside pytest. It pulls in \`coverage.py\` as a dependency automatically. Add it to your dev dependencies, not your production dependencies, because you never need coverage in a deployed application.

\`\`\`bash
# Using pip
pip install pytest pytest-cov

# Pin versions for reproducible CI (recommended)
pip install "pytest>=8.0" "pytest-cov>=6.0"

# Using uv (fast, increasingly common in 2026)
uv add --dev pytest pytest-cov

# Verify the plugin is registered
pytest --version
# pytest 8.x.x
# registered plugins: ... pytest-cov-6.x.x ...
\`\`\`

If you maintain a \`pyproject.toml\` with PEP 621 metadata, declare the dev dependency group so contributors and CI install the same versions:

\`\`\`toml
[project.optional-dependencies]
test = [
  "pytest>=8.0",
  "pytest-cov>=6.0",
]
\`\`\`

Then install with \`pip install -e ".[test]"\`. Once the plugin is present, \`pytest --help\` shows a "coverage reporting" option group, which confirms everything is wired correctly.

## Running Your First Coverage Report

The simplest invocation measures coverage for a package and prints a summary table. Point \`--cov\` at the import name of the code you want to measure, not at your tests.

\`\`\`bash
# Measure coverage of the "myapp" package while running the test suite
pytest --cov=myapp

# Measure coverage of a source directory instead of a package name
pytest --cov=src

# Measure the whole current directory (use sparingly, it is noisy)
pytest --cov=.
\`\`\`

A typical run prints something like this at the end of the test output:

\`\`\`text
---------- coverage: platform linux, python 3.12.3 -----------
Name                     Stmts   Miss  Cover
--------------------------------------------
myapp/__init__.py            2      0   100%
myapp/calculator.py         40      4    90%
myapp/parser.py             65     18    72%
--------------------------------------------
TOTAL                      107     22    79%
\`\`\`

The \`Stmts\` column counts executable statements, \`Miss\` counts statements that never ran, and \`Cover\` is the percentage that did run. A 79% total means roughly one fifth of your statements were never executed by any test. That is the number you want to drive up over time, but chasing 100% blindly is a trap we will discuss later.

## The --cov-report Flag and Report Formats

By default pytest-cov prints the plain summary table above. The \`--cov-report\` flag controls which report formats you get, and you can pass it multiple times to produce several at once. The four formats you will use are \`term\`, \`term-missing\`, \`html\`, and \`xml\`.

\`\`\`bash
# Show which specific line numbers are missing, inline in the terminal
pytest --cov=myapp --cov-report=term-missing

# Generate a browsable HTML report into htmlcov/
pytest --cov=myapp --cov-report=html

# Generate a Cobertura-style XML report for CI tools (Codecov, SonarQube, GitLab)
pytest --cov=myapp --cov-report=xml

# Produce several reports in one run
pytest --cov=myapp --cov-report=term-missing --cov-report=html --cov-report=xml

# Suppress the terminal report entirely (only write files)
pytest --cov=myapp --cov-report=html --cov-report=term:skip-covered
\`\`\`

The \`term-missing\` format is the one you want during local development because it tells you exactly which lines to target:

\`\`\`text
Name                  Stmts   Miss  Cover   Missing
---------------------------------------------------
myapp/parser.py          65     18    72%   30-34, 51, 88-99
---------------------------------------------------
\`\`\`

Here is a quick reference for the report formats and when to reach for each.

| Format | Output | Best for |
|---|---|---|
| \`term\` | Summary table in terminal | Quick local check, default |
| \`term-missing\` | Table plus missing line numbers | Local TDD, finding gaps |
| \`html\` | Browsable \`htmlcov/index.html\` | Reviewing coverage line by line |
| \`xml\` | \`coverage.xml\` (Cobertura) | Uploading to Codecov, Sonar, GitLab |
| \`json\` | \`coverage.json\` | Custom scripts, dashboards |
| \`lcov\` | \`coverage.lcov\` | Editor gutters, some CI viewers |

The HTML report is the most useful for humans. Open \`htmlcov/index.html\` in a browser and click into any file to see green (covered) and red (missed) lines highlighted, with branch annotations once you enable branch coverage. Add \`htmlcov/\` to your \`.gitignore\`.

## Configuring Coverage in pyproject.toml

Passing flags on the command line gets tedious and inconsistent across machines. The durable solution is to put coverage settings in configuration that lives in version control. In 2026 the preferred location is \`pyproject.toml\` under the \`[tool.coverage]\` tables, which \`coverage.py\` reads natively. This keeps everything in the single file modern Python projects already use.

\`\`\`toml
[tool.coverage.run]
# Which packages or paths to measure
source = ["myapp"]
# Enable branch coverage (covered in detail below)
branch = true
# Do not measure the tests themselves
omit = [
  "*/tests/*",
  "*/__main__.py",
  "*/migrations/*",
]
# Needed when you combine data from subprocesses (xdist, multiprocessing)
parallel = true

[tool.coverage.report]
# Fail the report if total coverage drops below this percentage
fail_under = 85
# Show missing line numbers in the terminal report
show_missing = true
# Do not list files that are already fully covered
skip_covered = true
# Round to whole percentages
precision = 0
# Lines/patterns to exclude from coverage accounting
exclude_lines = [
  "pragma: no cover",
  "raise NotImplementedError",
  "if __name__ == .__main__.:",
  "if TYPE_CHECKING:",
  "@(abc\\\\.)?abstractmethod",
]

[tool.coverage.html]
directory = "htmlcov"

[tool.coverage.xml]
output = "coverage.xml"
\`\`\`

With this in place you can run a bare \`pytest --cov\` and it picks up the \`source\`, branch, omit, and report settings from configuration. One subtlety: when you set \`source\` in \`[tool.coverage.run]\`, you can pass \`--cov\` with no argument and pytest-cov defers to the configured source. Many teams still pass \`--cov=myapp\` explicitly for clarity in CI logs.

## Using a .coveragerc File Instead

If you do not use \`pyproject.toml\`, or you want coverage config separate from the rest of your project metadata, \`coverage.py\` reads a dedicated \`.coveragerc\` INI file at the project root. The sections mirror the TOML tables but use INI syntax.

\`\`\`ini
[run]
source = myapp
branch = True
parallel = True
omit =
    */tests/*
    */migrations/*

[report]
fail_under = 85
show_missing = True
skip_covered = True
exclude_lines =
    pragma: no cover
    raise NotImplementedError
    if TYPE_CHECKING:

[html]
directory = htmlcov

[xml]
output = coverage.xml
\`\`\`

The precedence order matters: if both \`pyproject.toml\` \`[tool.coverage]\` and a \`.coveragerc\` exist, \`coverage.py\` prefers \`.coveragerc\`. Pick one and delete the other to avoid confusion. Here is how the two config locations compare.

| Aspect | \`pyproject.toml\` | \`.coveragerc\` |
|---|---|---|
| Format | TOML, \`[tool.coverage.*]\` tables | INI, \`[run]\`/\`[report]\` sections |
| Lives with | Project metadata and other tools | Standalone, coverage-only |
| Booleans | \`true\` / \`false\` | \`True\` / \`False\` |
| Precedence | Lower (loses to \`.coveragerc\`) | Higher (wins if both present) |
| Best when | You already centralize tool config | You want coverage config isolated |

## Statement Coverage vs Branch Coverage

By default coverage measures **statement coverage**: did each line of code execute at least once. That is a useful but weak signal because a single line containing a conditional can be reported as covered even though only one of its outcomes was tested. **Branch coverage** fixes this by also tracking, for every branch point, whether both the true and false paths were taken.

Consider this function:

\`\`\`python
def classify(value):
    result = "unknown"
    if value > 0:
        result = "positive"
    return result
\`\`\`

A single test calling \`classify(5)\` gives you 100% statement coverage, because every line ran. But the case where \`value > 0\` is false never executed the implicit "skip the if" branch. With branch coverage enabled, that missing path is reported as a partial branch, and your coverage drops below 100% until you add a test for \`classify(-1)\` or \`classify(0)\`.

Enable branch coverage with the config (\`branch = true\`) shown earlier, or with a flag:

\`\`\`bash
# Enable branch coverage from the command line
pytest --cov=myapp --cov-branch --cov-report=term-missing
\`\`\`

With branch coverage on, the \`Missing\` column gains entries like \`12->14\` meaning "the branch from line 12 to line 14 was never taken". Branch coverage is strictly more honest than statement coverage and you should enable it on every project. The runtime cost is negligible for ordinary test suites.

| | Statement coverage | Branch coverage |
|---|---|---|
| Measures | Each line executed | Each conditional outcome executed |
| Catches untested \`if\`/\`else\` paths | No | Yes |
| Enable with | Default | \`branch = true\` or \`--cov-branch\` |
| Missing report style | \`30-34, 51\` | \`30-34, 51, 12->14\` |
| Recommendation | Baseline | Always enable |

## Reading term-missing to Find the Gaps

The fastest local feedback loop is \`--cov-report=term-missing\` combined with \`--cov-branch\`. Run it, read the \`Missing\` column, and write tests that hit those exact lines and branches. A practical workflow when raising coverage on a legacy module:

\`\`\`bash
# Focus coverage on just the file you are improving, run only its tests
pytest tests/test_parser.py --cov=myapp.parser --cov-branch --cov-report=term-missing

# Drop into the HTML report for a visual map of red lines and partial branches
pytest --cov=myapp --cov-branch --cov-report=html
python -m http.server --directory htmlcov 8000
# then open http://localhost:8000
\`\`\`

The HTML view is especially good for partial branches: lines with a fully untested branch are shown in yellow with an arrow annotation, so you can see at a glance whether you are missing the \`else\` path of a condition rather than an entire block.

## Excluding Code You Intentionally Do Not Test

Not every line deserves a test. Defensive \`raise NotImplementedError\` stubs, \`if TYPE_CHECKING:\` import blocks, debug-only \`__repr__\` helpers, and platform-specific fallbacks all legitimately go untested. Mark them so they do not drag your number down and so the report reflects code you genuinely care about.

\`\`\`python
def fetch(url):  # pragma: no cover - thin network wrapper exercised in integration tests
    return requests.get(url, timeout=10)


def parse(data):
    if not data:
        raise ValueError("empty input")
    if data.version > MAX_VERSION:  # pragma: no cover - guard for a format we never ship
        raise RuntimeError("unsupported version")
    return _decode(data)
\`\`\`

The inline \`# pragma: no cover\` comment excludes that line (and its block) from coverage. The \`exclude_lines\` patterns in your config exclude whole categories at once, which is cleaner than scattering pragmas. Use exclusions deliberately. Every \`pragma: no cover\` is a small promise that the line really does not need a test, and reviewers should treat new pragmas with the same scrutiny as a skipped test.

## Enforcing a Minimum with --cov-fail-under

Measuring coverage only helps if regressions cause a build to fail. The \`--cov-fail-under\` flag (or \`fail_under\` in config) makes pytest exit non-zero when total coverage drops below a threshold, which turns coverage into an enforced quality gate in CI.

\`\`\`bash
# Fail the run if total coverage is below 85 percent
pytest --cov=myapp --cov-branch --cov-fail-under=85

# Combine with reports; the build fails AFTER printing the report
pytest --cov=myapp --cov-branch --cov-report=term-missing --cov-fail-under=85
\`\`\`

When coverage is, say, 83%, pytest prints the normal report and then exits with a "Coverage failure: total of 83 is less than fail-under=85" message and a non-zero status, which fails the CI job. A few practical rules for thresholds:

- Set the threshold at or slightly below your current real coverage so the gate does not immediately fail. Ratchet it upward as coverage improves.
- Prefer the project-wide total over per-file thresholds at first; per-file gates create noise on small utility files.
- Do not set it to 100. The last few percent are almost always pragmas and unreachable defensive code, and chasing them produces low-value tests.
- Treat a drop in coverage on a pull request as a signal to add tests, not as an excuse to lower the threshold.

## Coverage in Continuous Integration

In CI you want machine-readable output, a hard threshold, and an artifact you can upload to a coverage service. A minimal GitHub Actions job looks like this:

\`\`\`yaml
name: tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -e ".[test]"
      - name: Run tests with coverage
        run: |
          pytest --cov=myapp --cov-branch \\
                 --cov-report=xml \\
                 --cov-report=term-missing \\
                 --cov-fail-under=85
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage.xml
\`\`\`

The \`coverage.xml\` Cobertura file is the lingua franca that Codecov, Coveralls, SonarQube, and GitLab all understand. For a deeper CI walkthrough see the [CI/CD testing pipeline with GitHub Actions](/blog/cicd-testing-pipeline-github-actions) guide.

## Combining Coverage Across Parallel Processes

This is the part that trips people up. When you run tests in parallel with [pytest-xdist](/blog/pytest-xdist-parallel-testing-guide), or your code spawns subprocesses, or you run a CI matrix across multiple Python versions, each worker writes its own coverage data file. If you do not combine them you get wrong, deflated numbers because each file only sees the lines its own worker executed.

The mechanism has three parts. First, set \`parallel = true\` (and \`concurrency\` if you use multiprocessing) so each process writes a uniquely suffixed data file like \`.coverage.hostname.1234.567890\`. Second, run your tests. Third, run \`coverage combine\` to merge all the partial files into a single \`.coverage\`, then \`coverage report\` or \`coverage xml\` against the merged data.

\`\`\`toml
[tool.coverage.run]
source = ["myapp"]
branch = true
parallel = true
# If your code uses multiprocessing or threads, declare it:
concurrency = ["multiprocessing", "thread"]
\`\`\`

\`\`\`bash
# Run tests in parallel; each xdist worker writes its own data file
pytest -n auto --cov=myapp --cov-branch

# pytest-cov already calls combine internally for xdist, but when you split
# coverage across SEPARATE CI jobs you combine manually:

# Job A and Job B each produce a .coverage.* file as an artifact, then in a
# final "coverage" job you download them all and run:
coverage combine
coverage report --show-missing --fail-under=85
coverage xml
coverage html
\`\`\`

A common matrix pattern: each Python version in the matrix uploads its \`.coverage.*\` file as an artifact, and a separate aggregation job downloads every artifact, runs \`coverage combine\`, and only then enforces \`--fail-under\`. This way the threshold is checked against the union of all the matrix runs, not each one individually. If you instead enforce the threshold inside every matrix job, a version that happens to skip some platform-specific code will fail the gate even though the overall suite covers it.

One more gotcha: \`coverage combine\` deletes the partial \`.coverage.*\` files after merging by default. If you need to re-run combine, pass \`--keep\` or regenerate the partials. And make sure all jobs measure the same \`source\` paths, or combine will report files that some jobs never imported.

## Coverage Is a Floor, Not a Goal

A final word of caution that every section above implies: high coverage does not mean good tests. A test that calls a function and asserts nothing still "covers" every line it touches. Coverage tells you where you have *zero* tests, which is genuinely valuable, but it cannot tell you whether the tests you do have actually check the right behavior. Use coverage to find untested code, then write meaningful assertions for it. To measure the *quality* of your assertions rather than mere line execution, reach for mutation testing, covered in the [mutation testing with Stryker guide](/blog/visual-regression-testing-guide) family of techniques, which deliberately breaks your code to see if your tests catch the change. Pair branch coverage with mutation testing and you have a much more honest picture of suite strength than either alone.

## Frequently Asked Questions

### How do I install pytest-cov?

Run \`pip install pytest pytest-cov\`, which also installs \`coverage.py\` automatically. Add it to your dev or test dependency group rather than production dependencies, since coverage is never needed in a deployed app. Verify with \`pytest --version\`, which should list \`pytest-cov\` under registered plugins. With \`uv\`, use \`uv add --dev pytest pytest-cov\` instead.

### How do I get a pytest coverage report?

Run \`pytest --cov=yourpackage\` to print a summary table at the end of the test run. Add \`--cov-report=term-missing\` to see which line numbers are untested, \`--cov-report=html\` to generate a browsable \`htmlcov/index.html\`, or \`--cov-report=xml\` to produce a Cobertura \`coverage.xml\` for CI tools like Codecov and SonarQube. You can pass \`--cov-report\` multiple times.

### What is the difference between statement and branch coverage in pytest?

Statement coverage checks whether each line ran at least once. Branch coverage additionally checks whether every conditional took both its true and false paths. A function with one untested \`else\` branch can show 100% statement coverage but less than 100% branch coverage. Enable branch coverage with \`--cov-branch\` or \`branch = true\` in config; it is more honest and should always be on.

### How do I make pytest fail when coverage is too low?

Use \`--cov-fail-under=85\` (or set \`fail_under = 85\` under \`[tool.coverage.report]\`). Pytest prints the coverage report and then exits with a non-zero status if total coverage falls below the threshold, failing the CI job. Set the threshold near your current coverage and ratchet it upward over time rather than starting at 100, which forces low-value tests.

### How do I exclude lines from pytest coverage?

Add an inline \`# pragma: no cover\` comment to a line or block to skip it, or list patterns under \`exclude_lines\` in \`[tool.coverage.report]\` to skip whole categories such as \`if TYPE_CHECKING:\`, \`raise NotImplementedError\`, and \`if __name__ == "__main__":\`. Use exclusions sparingly and treat each new pragma as a deliberate decision that the line genuinely does not need a test.

### Why is my coverage wrong when running tests in parallel?

When tests run across multiple processes (pytest-xdist, multiprocessing, or a CI matrix), each worker writes a separate coverage data file. Set \`parallel = true\` in \`[tool.coverage.run]\` so files get unique suffixes, then run \`coverage combine\` to merge them before reporting. For split CI jobs, upload each \`.coverage.*\` as an artifact and combine them in a final aggregation job before enforcing the threshold.

### Where should I put pytest coverage configuration?

Put it in \`pyproject.toml\` under \`[tool.coverage.run]\` and \`[tool.coverage.report]\`, which \`coverage.py\` reads natively and keeps config in the file modern projects already use. Alternatively use a standalone \`.coveragerc\` INI file. If both exist, \`.coveragerc\` wins, so keep only one. Configuration lets you run a bare \`pytest --cov\` and pick up source, branch, omit, and threshold settings automatically.

## Conclusion

Pytest coverage with pytest-cov is one of the highest-leverage additions you can make to a Python test suite. The setup is trivial: install the plugin, add a \`--cov\` flag, and you immediately see which code your tests never touch. From there, the path to a mature setup is well marked. Enable branch coverage so partial conditionals stop hiding, move your settings into \`pyproject.toml\` so they live in version control, use \`term-missing\` and the HTML report to find and close gaps, and enforce a minimum with \`--cov-fail-under\` so regressions break the build instead of slipping through. In CI, emit \`coverage.xml\`, upload it to a coverage service, and combine data correctly across parallel workers and matrix jobs so your number reflects the whole suite rather than a single shard.

Remember that coverage is a floor, not a goal. It tells you where you have no tests at all, which is exactly the information you need to prioritize, but it says nothing about whether your existing assertions are meaningful. Pair it with thoughtful test design and, where it matters, mutation testing. To go further, explore [pytest best practices for 2026](/blog/pytest-best-practices-2026), [parallel testing with pytest-xdist](/blog/pytest-xdist-parallel-testing-guide), and [async testing with pytest-asyncio](/blog/pytest-asyncio-testing-guide), or browse the full library of QA automation skills at [/skills](/skills) to drop these patterns straight into your AI coding agent.
`,
};
