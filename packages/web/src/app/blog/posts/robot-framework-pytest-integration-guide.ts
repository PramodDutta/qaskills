import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework and pytest Integration Complete Guide',
  description:
    'Integrate Robot Framework and pytest in one Python project. Share fixtures, run both in CI, unified reporting, when to use each, and migration patterns.',
  date: '2026-05-12',
  category: 'Guide',
  content: `
# Robot Framework and pytest Integration Complete Guide

Robot Framework and pytest are the two dominant test frameworks in the Python ecosystem, and they each excel at different things. Robot Framework's keyword-driven syntax produces tests that read like specifications - great for QA-led teams, acceptance testing, and cross-functional collaboration. Pytest's pure-Python approach with fixtures and parametrize is unbeatable for unit testing, library testing, and developer-driven workflows. Most mature organizations end up using both, and the integration story is much smoother than most people realize.

This complete guide covers every aspect of running Robot Framework and pytest side by side: project structure, sharing fixtures and helpers, running both in a single CI pipeline, unified reporting, calling pytest tests from Robot, calling Robot keywords from pytest, and migration paths between them. By the end you'll know exactly when each tool is the right choice and how to leverage both in a single Python codebase without conflict.

## Key Takeaways

- Robot and pytest can coexist in the same repository
- Share fixtures, helpers, and configuration via Python modules
- Each tool has its own runner, but a single CI pipeline can orchestrate both
- Robot keywords can call pytest helpers and vice versa
- Migration usually flows from Robot to pytest for unit tests, never the reverse
- Use pytest for low-level developer tests, Robot for acceptance and e2e

---

## When To Use Each

| Scenario | Best Tool |
|----------|-----------|
| Unit tests of Python code | pytest |
| Library/SDK testing | pytest |
| Acceptance tests | Robot Framework |
| End-to-end UI tests | Robot Framework or pytest+playwright |
| API contract tests | Either |
| Database integration | Either |
| Performance tests | pytest+pytest-benchmark or Robot+pabot |

## Project Structure

\`\`\`
my_project/
  src/
    my_package/
      __init__.py
      models.py
      api.py
  tests/
    unit/
      conftest.py
      test_models.py
      test_api.py
    acceptance/
      __init__.robot
      keywords/
        user.resource
      user_signup.robot
      user_login.robot
  shared/
    test_utils.py
    fixtures.py
  pyproject.toml
  conftest.py
\`\`\`

The unit/ folder uses pytest, acceptance/ uses Robot. Shared helpers go in shared/.

## Configuration

\`\`\`toml
# pyproject.toml
[build-system]
requires = ["setuptools>=68"]

[project]
name = "my-project"
version = "0.1.0"

[project.optional-dependencies]
test = [
  "pytest>=7.0",
  "robotframework>=6.0",
  "robotframework-seleniumlibrary",
  "robotframework-requests",
]

[tool.pytest.ini_options]
testpaths = ["tests/unit"]
python_files = "test_*.py"
\`\`\`

## Running Both

\`\`\`bash
# Run unit tests
pytest

# Run acceptance tests
robot --outputdir results tests/acceptance/

# Run both
pytest && robot --outputdir results tests/acceptance/
\`\`\`

## Shared Test Utilities

\`\`\`python
# shared/test_utils.py
def create_test_user(api_client, email='test@example.com'):
    return api_client.post('/users', json={'email': email}).json()

def cleanup_user(api_client, user_id):
    api_client.delete(f'/users/{user_id}')
\`\`\`

Use from pytest:

\`\`\`python
# tests/unit/test_users.py
from shared.test_utils import create_test_user, cleanup_user

def test_user_creation(api_client):
    user = create_test_user(api_client)
    assert user['id']
    cleanup_user(api_client, user['id'])
\`\`\`

Use from Robot:

\`\`\`robot
*** Settings ***
Library    shared.test_utils

*** Test Cases ***
Create User Via Shared Helper
    \${user}=    Create Test User    \${api}
    Should Not Be Empty    \${user}[id]
    Cleanup User    \${api}    \${user}[id]
\`\`\`

## Sharing Fixtures

Pytest fixtures don't natively transfer to Robot, but you can extract their logic into plain functions:

\`\`\`python
# shared/fixtures.py
def make_api_client():
    import requests
    s = requests.Session()
    s.headers['Authorization'] = f'Bearer {os.environ["TOKEN"]}'
    return s
\`\`\`

\`\`\`python
# tests/unit/conftest.py
import pytest
from shared.fixtures import make_api_client

@pytest.fixture
def api_client():
    return make_api_client()
\`\`\`

\`\`\`robot
*** Settings ***
Library    shared.fixtures

*** Keywords ***
Setup API Client
    \${client}=    Make Api Client
    Set Suite Variable    \${API}    \${client}
\`\`\`

## Running pytest From Robot

If you want one suite to drive both:

\`\`\`robot
*** Settings ***
Library    Process

*** Test Cases ***
Run All Unit Tests
    \${result}=    Run Process    pytest    tests/unit/    --tb=short
    Should Be Equal As Integers    \${result.rc}    0
\`\`\`

This runs pytest as a subprocess and asserts on the exit code.

## Calling Robot Keywords From pytest

Use robot.run programmatically:

\`\`\`python
# tests/unit/test_robot_smoke.py
import subprocess

def test_robot_smoke_passes():
    result = subprocess.run(
        ['robot', '--outputdir', 'results', 'tests/acceptance/smoke.robot'],
        capture_output=True,
    )
    assert result.returncode == 0
\`\`\`

## Unified CI Pipeline

\`\`\`yaml
name: All Tests
on: [push, pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -e ".[test]"
      - run: pytest --junitxml=results/pytest.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: pytest-results
          path: results/

  acceptance:
    runs-on: ubuntu-latest
    needs: unit
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -e ".[test]"
      - run: robot --outputdir results tests/acceptance/
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: robot-results
          path: results/
\`\`\`

The two jobs run sequentially - unit gates acceptance. They could also run in parallel.

## Unified Reporting

For one dashboard view, output both to JUnit XML and aggregate:

\`\`\`bash
pytest --junitxml=results/pytest.xml
robot --xunit results/robot-xunit.xml --outputdir results tests/acceptance/
\`\`\`

Most CI systems (GitHub Actions, GitLab, Jenkins) consume JUnit XML directly.

## Migration Patterns

### Robot To pytest

For migrating unit-level tests from Robot to pytest:

\`\`\`robot
*** Settings ***
Library    libraries/StringUtils.py

*** Test Cases ***
Reverse String
    \${result}=    Reverse    hello
    Should Be Equal    \${result}    olleh
\`\`\`

Equivalent pytest:

\`\`\`python
from libraries.StringUtils import reverse

def test_reverse():
    assert reverse('hello') == 'olleh'
\`\`\`

Pytest is more concise here - this is the kind of test that belongs in pytest, not Robot.

### pytest To Robot

For migrating acceptance tests from pytest+selenium to Robot+SeleniumLibrary:

\`\`\`python
# pytest version
def test_login(browser):
    browser.get('https://app.example.com/login')
    browser.find_element_by_id('username').send_keys('user')
    browser.find_element_by_id('password').send_keys('pass')
    browser.find_element_by_css_selector('button[type=submit]').click()
    assert 'Welcome' in browser.title
\`\`\`

\`\`\`robot
*** Test Cases ***
Login
    Open Browser    \${URL}/login    chrome
    Input Text    id=username    user
    Input Text    id=password    pass
    Click Element    css=button[type=submit]
    Title Should Contain    Welcome
\`\`\`

Robot is more concise for browser flows.

## When To Use Both

The right pattern for most teams:

| Layer | Tool |
|-------|------|
| Unit tests | pytest |
| Library tests | pytest |
| Integration tests | pytest |
| Component tests | Either |
| API contract tests | Robot or pytest |
| UI smoke tests | Robot |
| End-to-end | Robot |
| Manual exploration | Pytest+pytest-bdd or Robot |

## Tooling Comparison

| Feature | pytest | Robot |
|---------|--------|-------|
| Syntax | Python | Keywords |
| Fixtures | Built-in | Library-based |
| Parametrize | Built-in | Test Template |
| Reporting | JUnit XML | HTML + log.html |
| Parallelism | pytest-xdist | pabot |
| Plugins | 1000s | 100s |
| Learning curve | Python knowledge | Keyword syntax |
| Reads like | Code | Spec |

## Real World Project Example

A SaaS team with backend Python service:

- pytest for: API unit tests, model tests, business logic tests, integration tests with Postgres
- Robot for: End-to-end signup flow, end-to-end checkout, accessibility smoke, cross-browser smoke

CI runs them in two jobs: unit (pytest, 2 min) and acceptance (Robot, 15 min). The team has 800 pytest tests and 60 Robot tests, and that ratio is appropriate.

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| All tests in Robot | Slow unit tests | pytest for units |
| All tests in pytest | UX tests less readable | Robot for acceptance |
| Duplicating fixtures | Drift | Extract to shared module |
| Running them sequentially when parallel works | Slow CI | Parallel jobs |
| One tool for everything | Wrong tool for layer | Use both |

## Conclusion

Robot Framework and pytest are complementary, not competing. The right organization uses both: pytest for fast developer-driven unit and integration tests, Robot for acceptance and end-to-end scenarios that benefit from readable, keyword-driven syntax. Shared Python modules let you reuse logic across both, and CI orchestrates them into a single dashboard. The combination is more powerful than either alone.

Set up the project structure recommended above in your repo. Move existing tests to the appropriate tool. Within a sprint you'll have a faster, more readable test suite that takes advantage of each framework's strengths. Visit our [skills directory](/skills) for related patterns or read the [pytest testing complete guide](/blog/pytest-testing-complete-guide) for deep pytest coverage.
`,
};
