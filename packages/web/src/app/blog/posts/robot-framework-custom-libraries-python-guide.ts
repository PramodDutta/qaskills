import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework Custom Python Libraries Complete Guide',
  description:
    'Build custom Python libraries for Robot Framework. Static, dynamic, hybrid APIs, library scopes, ROBOT_LIBRARY_LISTENER, packaging, and distribution patterns.',
  date: '2026-05-10',
  category: 'Guide',
  content: `
# Robot Framework Custom Python Libraries Complete Guide

Robot Framework's keyword libraries cover most common testing needs - HTTP, browsers, databases, file system, and more - but every team eventually hits scenarios where a custom library makes more sense than chaining built-in keywords. Maybe you need to interact with a proprietary internal API, hash files with a specific algorithm, parse a custom file format, or compute metrics from multiple data sources. Python is Robot Framework's native extension language, and writing a custom library is straightforward once you understand the conventions.

This complete guide walks through the three library APIs (static, dynamic, hybrid), library scope options (GLOBAL, SUITE, TEST), how to expose Python functions as Robot keywords with named arguments and documentation, the listener interface for reacting to events, packaging your library for distribution via PyPI, and testing the library itself. Examples cover an HTTP wrapper, a custom database utility, an AWS S3 helper, and a stateful workflow library. By the end, you'll be ready to write reusable libraries that make your test suites cleaner and more maintainable.

## Key Takeaways

- Robot Framework can import any Python module as a keyword library
- The static API exposes top-level functions as keywords
- The dynamic API generates keywords at runtime
- Library scope controls instance lifetime (test, suite, or global)
- Use ROBOT_LIBRARY_DOC_FORMAT and @keyword decorator for rich docs
- Listeners react to test lifecycle events
- Publish to PyPI for company-wide sharing

---

## Static Library

The simplest pattern: a Python file with functions becomes a keyword library.

\`\`\`python
# libraries/MathLibrary.py

def add_numbers(a, b):
    """Returns the sum of two numbers."""
    return float(a) + float(b)

def is_even(number):
    """Returns True if the number is even."""
    return int(number) % 2 == 0
\`\`\`

\`\`\`robot
*** Settings ***
Library    libraries/MathLibrary.py

*** Test Cases ***
Basic Math
    \${result}=    Add Numbers    2    3
    Should Be Equal As Numbers    \${result}    5
    \${even}=    Is Even    4
    Should Be True    \${even}
\`\`\`

Underscores in Python become spaces in Robot. add_numbers becomes Add Numbers.

## Class Based Library

\`\`\`python
# libraries/Calculator.py

class Calculator:
    """A simple calculator library."""

    def __init__(self):
        self._history = []

    def add(self, a, b):
        """Adds two numbers and stores the result in history."""
        result = float(a) + float(b)
        self._history.append(result)
        return result

    def get_history(self):
        """Returns all calculation results so far."""
        return self._history
\`\`\`

\`\`\`robot
*** Settings ***
Library    libraries/Calculator.py

*** Test Cases ***
Calculator Tracks History
    Add    1    2
    Add    3    4
    \${history}=    Get History
    Length Should Be    \${history}    2
\`\`\`

## Library Scope

Default scope is TEST - a new instance per test. Other options:

\`\`\`python
class Calculator:
    ROBOT_LIBRARY_SCOPE = 'GLOBAL'  # one instance for entire run
    # or 'SUITE' - one per suite
    # or 'TEST' - one per test
\`\`\`

| Scope | When To Use |
|-------|-------------|
| GLOBAL | Stateless utilities, expensive setup |
| SUITE | Per-suite state, login session, DB connection |
| TEST | Default, isolated per test |

## Keyword Documentation

Use @keyword decorator for rich docstrings and named args:

\`\`\`python
from robot.api.deco import keyword

class APIClient:
    @keyword('Login User \${user}')
    def login_user(self, user, password='default'):
        """Logs in the specified user.

        Examples:
        | Login User alice |
        | Login User bob password=specialpass |
        """
        # ...
\`\`\`

## Dynamic API

When you don't know your keywords at design time, use the dynamic API:

\`\`\`python
class DynamicLibrary:
    def __init__(self):
        self._keywords = {
            'Open URL': self._open_url,
            'Click Button': self._click_button,
        }

    def get_keyword_names(self):
        return list(self._keywords.keys())

    def run_keyword(self, name, args, kwargs):
        return self._keywords[name](*args, **kwargs)

    def _open_url(self, url):
        return f'opening {url}'

    def _click_button(self, label):
        return f'clicking {label}'
\`\`\`

This is how libraries like SeleniumLibrary and Browser implement their large keyword sets.

## Library Listeners

Listeners receive events:

\`\`\`python
class DatabaseLibrary:
    ROBOT_LIBRARY_SCOPE = 'GLOBAL'
    ROBOT_LIBRARY_LISTENER = None

    def __init__(self):
        self.ROBOT_LIBRARY_LISTENER = self
        self._connection = None

    def start_test(self, name, attrs):
        # Open per-test connection
        pass

    def end_test(self, name, attrs):
        # Close connection
        pass

    def query(self, sql):
        return self._connection.execute(sql).fetchall()
\`\`\`

## Real Example: HTTP Wrapper

\`\`\`python
# libraries/CompanyAPI.py
import requests
from robot.api.deco import keyword

class CompanyAPI:
    ROBOT_LIBRARY_SCOPE = 'SUITE'

    def __init__(self, base_url=None, token=None):
        self.base_url = base_url or 'https://api.example.com'
        self.token = token

    @keyword('Set Auth Token \${token}')
    def set_auth_token(self, token):
        self.token = token

    @keyword('Get User \${user_id}')
    def get_user(self, user_id):
        response = requests.get(
            f'{self.base_url}/users/{user_id}',
            headers={'Authorization': f'Bearer {self.token}'},
        )
        response.raise_for_status()
        return response.json()

    @keyword('Create User \${name} \${email}')
    def create_user(self, name, email):
        response = requests.post(
            f'{self.base_url}/users',
            json={'name': name, 'email': email},
            headers={'Authorization': f'Bearer {self.token}'},
        )
        response.raise_for_status()
        return response.json()['id']
\`\`\`

Usage:

\`\`\`robot
*** Settings ***
Library    libraries/CompanyAPI.py    base_url=https://api.example.com

*** Test Cases ***
End To End User Flow
    Set Auth Token    abc123
    \${user_id}=    Create User    Alice    alice@example.com
    \${user}=    Get User    \${user_id}
    Should Be Equal    \${user}[email]    alice@example.com
\`\`\`

## Real Example: AWS S3 Helper

\`\`\`python
# libraries/S3Library.py
import boto3
from robot.api.deco import keyword

class S3Library:
    ROBOT_LIBRARY_SCOPE = 'GLOBAL'

    def __init__(self, region='us-east-1'):
        self.client = boto3.client('s3', region_name=region)

    @keyword('Upload File To S3')
    def upload_file_to_s3(self, local_path, bucket, key):
        self.client.upload_file(local_path, bucket, key)

    @keyword('Download File From S3')
    def download_file_from_s3(self, bucket, key, local_path):
        self.client.download_file(bucket, key, local_path)

    @keyword('S3 Object Should Exist')
    def s3_object_should_exist(self, bucket, key):
        try:
            self.client.head_object(Bucket=bucket, Key=key)
        except self.client.exceptions.ClientError:
            raise AssertionError(f'Object {key} does not exist in {bucket}')
\`\`\`

## Custom Exceptions

Raising clean exceptions improves test reports:

\`\`\`python
class APIError(Exception):
    ROBOT_CONTINUE_ON_FAILURE = False
    ROBOT_SUPPRESS_NAME = True

class APIClient:
    @keyword
    def get_user(self, user_id):
        response = requests.get(f'.../users/{user_id}')
        if response.status_code == 404:
            raise APIError(f'User {user_id} not found')
        response.raise_for_status()
        return response.json()
\`\`\`

ROBOT_CONTINUE_ON_FAILURE=False ensures the test stops on this error.

## Variable Imports

Pass arguments when importing:

\`\`\`robot
*** Settings ***
Library    libraries/CompanyAPI.py    base_url=https://api.staging.example.com    token=%{API_TOKEN}
\`\`\`

\`\`\`python
class CompanyAPI:
    def __init__(self, base_url='https://api.example.com', token=None):
        self.base_url = base_url
        self.token = token
\`\`\`

## Logging From Python

\`\`\`python
from robot.api import logger

class MyLibrary:
    def do_work(self):
        logger.info('Starting work')
        logger.debug('Detail info')
        logger.warn('Warning message')
\`\`\`

These appear in the Robot HTML log.

## Returning Multiple Values

\`\`\`python
def get_user_details(self, user_id):
    """Returns (name, email, role) tuple."""
    user = self._fetch(user_id)
    return user['name'], user['email'], user['role']
\`\`\`

\`\`\`robot
\${name}    \${email}    \${role}=    Get User Details    42
\`\`\`

## Packaging For PyPI

\`\`\`
my_library/
  pyproject.toml
  README.md
  src/
    my_library/
      __init__.py
      keywords.py
  tests/
\`\`\`

\`\`\`toml
# pyproject.toml
[project]
name = "robotframework-mycompany"
version = "1.0.0"
dependencies = ["robotframework>=6.0", "requests"]

[project.optional-dependencies]
test = ["pytest"]
\`\`\`

Publish:

\`\`\`bash
python -m build
python -m twine upload dist/*
\`\`\`

## Versioning

Include a version constant:

\`\`\`python
class MyLibrary:
    ROBOT_LIBRARY_VERSION = '1.2.3'
\`\`\`

Shows in the Robot log header.

## Testing Custom Libraries

Use pytest:

\`\`\`python
# tests/test_calculator.py
from libraries.Calculator import Calculator

def test_add():
    calc = Calculator()
    assert calc.add(2, 3) == 5

def test_history_tracks_calls():
    calc = Calculator()
    calc.add(1, 2)
    calc.add(3, 4)
    assert calc.get_history() == [3.0, 7.0]
\`\`\`

\`\`\`bash
pytest tests/
\`\`\`

## Documenting Libraries

Generate HTML docs:

\`\`\`bash
python -m robot.libdoc libraries/MyLibrary.py docs/MyLibrary.html
\`\`\`

This produces searchable documentation with all keywords and arguments.

## Library Comparison

| API | Use Case | Effort |
|-----|----------|--------|
| Static | Most cases | Lowest |
| Class | Stateful libraries | Low |
| Dynamic | Plugin systems | Medium |
| Hybrid | Mix of both | Medium |

## Real Suite Example

\`\`\`robot
*** Settings ***
Documentation    Tests using a custom library
Library          libraries/CompanyAPI.py    base_url=%{API_URL}    token=%{API_TOKEN}
Library          libraries/S3Library.py
Suite Setup      Create Test User
Suite Teardown   Cleanup Test User

*** Variables ***
\${TEST_USER_NAME}    test-user-\${TIMESTAMP}
\${TEST_USER_EMAIL}   test-\${TIMESTAMP}@example.com

*** Test Cases ***
User Can Upload Avatar
    [Tags]    smoke    profile
    Upload File To S3    /tmp/avatar.png    avatars    \${TEST_USER_ID}.png
    S3 Object Should Exist    avatars    \${TEST_USER_ID}.png

*** Keywords ***
Create Test User
    \${id}=    Create User    \${TEST_USER_NAME}    \${TEST_USER_EMAIL}
    Set Suite Variable    \${TEST_USER_ID}    \${id}

Cleanup Test User
    Delete User    \${TEST_USER_ID}
\`\`\`

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| Long inline logic in robot | Extract to Python |
| One mega library | Per-domain libraries |
| Stateful globals | Class with proper scope |
| Silent errors | Raise meaningful exceptions |
| No docstrings | Document every keyword |

## Distribution

Internal teams can host on a private PyPI (Artifactory, AWS CodeArtifact, GitHub Packages). External libraries should target the official PyPI for discovery.

## Conclusion

Custom Python libraries are the bridge between Robot Framework's keyword-driven syntax and the rich Python ecosystem. With a few hours of work, you can wrap any internal tool, API, or workflow as Robot keywords that read like English to your team. Apply this pattern judiciously: don't replace built-ins, don't put business logic inside, and keep each library focused on one domain. Done well, custom libraries make Robot test suites read like business specifications while delivering all the power of Python under the hood.

Start by identifying one repeated multi-step keyword sequence in your suite. Extract it to a Python class, expose one keyword, and use it from a single test. As patterns emerge, build out the library. Publish internally so other teams benefit. Explore our [skills directory](/skills) for related patterns or the [Python testing guide](/blog/pytest-testing-complete-guide) for broader Python testing.
`,
};
