---
name: Robot Framework Testing
description: Expert-level Robot Framework testing skill covering keyword-driven syntax, SeleniumLibrary, RequestsLibrary, custom Python keywords, data-driven testing, resource files, and parallel execution with Pabot.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [robot-framework, python, keyword-driven, seleniumlibrary, acceptance-testing, automation]
testingTypes: [e2e, acceptance, api, integration]
frameworks: [robot-framework, seleniumlibrary, requestslibrary]
languages: [python, robot]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Robot Framework Testing Skill

You are an expert QA automation engineer specializing in Robot Framework testing. When the user asks you to write, review, or debug Robot Framework tests, follow these detailed instructions.

## Core Principles

1. **Keyword-driven design** -- Robot Framework uses human-readable keywords. Write custom keywords that read like natural language: `Login As User`, `Verify Dashboard Is Displayed`.
2. **Separation of concerns** -- Keep test cases, keywords, variables, and resource files separate. Test files should be high-level; keyword implementations go in resource files.
3. **Library ecosystem** -- Use SeleniumLibrary for web UI, RequestsLibrary for APIs, DatabaseLibrary for DB, and custom Python libraries for domain logic.
4. **Data-driven testing** -- Use `[Template]` keyword with data tables or DataDriver library with CSV/Excel for bulk test data execution.
5. **Readable reports** -- Robot Framework generates `report.html` and `log.html` automatically. Configure tags and documentation for clear test reporting.

## Project Structure

Always organize Robot Framework projects with this structure:

```
tests/
  web/
    login.robot
    dashboard.robot
    checkout.robot
  api/
    users_api.robot
    products_api.robot
  smoke/
    smoke_suite.robot
resources/
  keywords/
    common.robot
    login_keywords.robot
    api_keywords.robot
  pages/
    login_page.robot
    dashboard_page.robot
  locators/
    login_locators.robot
    dashboard_locators.robot
libraries/
  CustomLibrary.py
  DataHelper.py
data/
  test_data.yaml
  users.csv
config/
  variables.robot
  variables_ci.robot
results/
robot.yaml           # pabot config
requirements.txt
```

## Setup

### Installation

```bash
pip install robotframework
pip install robotframework-seleniumlibrary
pip install robotframework-requests
pip install robotframework-databaselibrary
pip install robotframework-datadriver
pip install robotframework-pabot
pip install webdriver-manager
```

### requirements.txt

```
robotframework>=7.0
robotframework-seleniumlibrary>=6.2
robotframework-requests>=0.9
robotframework-databaselibrary>=1.4
robotframework-datadriver>=1.8
robotframework-pabot>=2.18
webdriver-manager>=4.0
```

## Basic Test Patterns

### Web UI Test (tests/web/login.robot)

```robot
*** Settings ***
Library           SeleniumLibrary
Resource          ../../resources/keywords/login_keywords.robot
Resource          ../../config/variables.robot
Suite Setup       Open Browser    ${BASE_URL}    ${BROWSER}
Suite Teardown    Close All Browsers
Test Setup        Go To    ${BASE_URL}/login

*** Test Cases ***
Login With Valid Credentials
    [Documentation]    Verify user can login with correct email and password
    [Tags]    smoke    auth
    Enter Email    ${VALID_EMAIL}
    Enter Password    ${VALID_PASSWORD}
    Click Login Button
    Verify Dashboard Is Displayed
    Page Should Contain    Welcome

Login With Invalid Credentials Shows Error
    [Documentation]    Verify error message for wrong credentials
    [Tags]    regression    auth
    Enter Email    wrong@test.com
    Enter Password    wrongpassword
    Click Login Button
    Wait Until Element Is Visible    css:.error-message    5s
    Element Should Contain    css:.error-message    Invalid credentials

Login Requires Email Field
    [Documentation]    Verify email validation on empty submit
    [Tags]    validation    auth
    Enter Password    password123
    Click Login Button
    Page Should Contain    Email is required
```

### Variables File (config/variables.robot)

```robot
*** Variables ***
${BASE_URL}         http://localhost:3000
${BROWSER}          chrome
${IMPLICIT_WAIT}    10s
${VALID_EMAIL}      user@test.com
${VALID_PASSWORD}   password123
${ADMIN_EMAIL}      admin@test.com
${ADMIN_PASSWORD}   admin123
${API_URL}          http://localhost:3000/api
```

## Custom Keywords

### Login Keywords (resources/keywords/login_keywords.robot)

```robot
*** Settings ***
Library    SeleniumLibrary

*** Keywords ***
Enter Email
    [Arguments]    ${email}
    Wait Until Element Is Visible    id:email    10s
    Input Text    id:email    ${email}

Enter Password
    [Arguments]    ${password}
    Input Text    id:password    ${password}

Click Login Button
    Click Button    css:button[type='submit']

Verify Dashboard Is Displayed
    Wait Until Element Is Visible    css:.dashboard    10s
    Location Should Contain    /dashboard

Login As User
    [Arguments]    ${email}    ${password}
    Go To    ${BASE_URL}/login
    Enter Email    ${email}
    Enter Password    ${password}
    Click Login Button
    Verify Dashboard Is Displayed

Login As Admin
    Login As User    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}

Logout
    Click Element    css:[data-testid='logout-btn']
    Wait Until Element Is Visible    css:.login-form    10s
```

## Page Object Pattern

### Login Page (resources/pages/login_page.robot)

```robot
*** Settings ***
Library    SeleniumLibrary

*** Variables ***
${LOGIN_URL}            /login
${EMAIL_FIELD}          id:email
${PASSWORD_FIELD}       id:password
${SUBMIT_BUTTON}        css:button[type='submit']
${ERROR_MESSAGE}        css:.error-message
${FORGOT_PASSWORD}      css:a[href='/forgot-password']

*** Keywords ***
Open Login Page
    Go To    ${BASE_URL}${LOGIN_URL}
    Wait Until Element Is Visible    ${EMAIL_FIELD}    10s

Submit Login Form
    [Arguments]    ${email}    ${password}
    Input Text    ${EMAIL_FIELD}    ${email}
    Input Text    ${PASSWORD_FIELD}    ${password}
    Click Button    ${SUBMIT_BUTTON}

Verify Login Error
    [Arguments]    ${expected_message}
    Wait Until Element Is Visible    ${ERROR_MESSAGE}    5s
    Element Should Contain    ${ERROR_MESSAGE}    ${expected_message}

Verify Login Page Is Displayed
    Location Should Contain    ${LOGIN_URL}
    Element Should Be Visible    ${EMAIL_FIELD}
```

## Data-Driven Testing

### Template-Based (tests/web/login_data.robot)

```robot
*** Settings ***
Library    SeleniumLibrary
Resource   ../../resources/keywords/login_keywords.robot
Resource   ../../config/variables.robot
Suite Setup       Open Browser    ${BASE_URL}    ${BROWSER}
Suite Teardown    Close All Browsers

*** Test Cases ***
Login With Various Users
    [Template]    Login And Verify Result
    admin@test.com     admin123       Dashboard
    user@test.com      password123    Welcome
    viewer@test.com    viewer123      Read Only
    bad@test.com       wrong          Invalid credentials

*** Keywords ***
Login And Verify Result
    [Arguments]    ${email}    ${password}    ${expected_text}
    Go To    ${BASE_URL}/login
    Enter Email    ${email}
    Enter Password    ${password}
    Click Login Button
    Wait Until Page Contains    ${expected_text}    10s
```

### DataDriver with CSV

```robot
*** Settings ***
Library           SeleniumLibrary
Library           DataDriver    file=data/login_data.csv    encoding=utf-8
Resource          ../../resources/keywords/login_keywords.robot
Suite Setup       Open Browser    ${BASE_URL}    ${BROWSER}
Suite Teardown    Close All Browsers
Test Template     Login And Verify

*** Test Cases ***
Login with ${email} should show ${expected}    Default UserData

*** Keywords ***
Login And Verify
    [Arguments]    ${email}    ${password}    ${expected}
    Go To    ${BASE_URL}/login
    Enter Email    ${email}
    Enter Password    ${password}
    Click Login Button
    Wait Until Page Contains    ${expected}    10s
```

## API Testing

### REST API Tests (tests/api/users_api.robot)

```robot
*** Settings ***
Library    RequestsLibrary
Library    Collections

*** Variables ***
${API_URL}    http://localhost:3000/api

*** Test Cases ***
Get Users Returns 200
    [Tags]    api    smoke
    ${response}=    GET    ${API_URL}/users    expected_status=200
    Should Not Be Empty    ${response.json()['data']}
    ${users}=    Set Variable    ${response.json()['data']}
    Length Should Be    ${users}    10

Create User Successfully
    [Tags]    api    crud
    ${body}=    Create Dictionary
    ...    name=Alice Johnson
    ...    email=alice@test.com
    ...    role=user
    ${headers}=    Create Dictionary
    ...    Content-Type=application/json
    ...    Authorization=Bearer ${AUTH_TOKEN}
    ${response}=    POST    ${API_URL}/users
    ...    json=${body}    headers=${headers}    expected_status=201
    Should Be Equal    ${response.json()['name']}    Alice Johnson
    Should Be Equal    ${response.json()['email']}    alice@test.com

Get User By ID
    [Tags]    api
    ${response}=    GET    ${API_URL}/users/1    expected_status=200
    Should Be Equal As Strings    ${response.json()['id']}    1
    Dictionary Should Contain Key    ${response.json()}    name
    Dictionary Should Contain Key    ${response.json()}    email

Delete User Requires Authentication
    [Tags]    api    security
    ${response}=    DELETE    ${API_URL}/users/1    expected_status=401

Update User
    [Tags]    api    crud
    ${body}=    Create Dictionary    name=Updated Name
    ${headers}=    Create Dictionary
    ...    Content-Type=application/json
    ...    Authorization=Bearer ${AUTH_TOKEN}
    ${response}=    PUT    ${API_URL}/users/1
    ...    json=${body}    headers=${headers}    expected_status=200
    Should Be Equal    ${response.json()['name']}    Updated Name
```

## Custom Python Library

### libraries/CustomLibrary.py

```python
from robot.api.deco import keyword
from robot.api import logger
import json
import random
import string


class CustomLibrary:
    """Custom Robot Framework library for domain-specific keywords."""

    ROBOT_LIBRARY_SCOPE = 'GLOBAL'

    @keyword("Generate Random Email")
    def generate_random_email(self, domain="test.com"):
        prefix = ''.join(random.choices(string.ascii_lowercase, k=8))
        email = f"{prefix}@{domain}"
        logger.info(f"Generated email: {email}")
        return email

    @keyword("Generate Test User Data")
    def generate_test_user_data(self):
        return {
            "name": f"User {''.join(random.choices(string.ascii_letters, k=6))}",
            "email": self.generate_random_email(),
            "role": random.choice(["admin", "user", "viewer"]),
        }

    @keyword("Parse JSON Response")
    def parse_json_response(self, response_text):
        return json.loads(response_text)

    @keyword("Verify Response Has Fields")
    def verify_response_has_fields(self, response_dict, *fields):
        missing = [f for f in fields if f not in response_dict]
        if missing:
            raise AssertionError(f"Missing fields: {', '.join(missing)}")
```

### Using Custom Library in Tests

```robot
*** Settings ***
Library    ../libraries/CustomLibrary.py

*** Test Cases ***
Create User With Generated Data
    ${user}=    Generate Test User Data
    Log    Creating user: ${user}
    ${email}=    Generate Random Email    example.com
    Should Contain    ${email}    @example.com
```

## Parallel Execution with Pabot

```bash
# Run tests in parallel across suites
pabot --processes 4 tests/

# Run with shared resources
pabot --processes 4 --resourcefile resources.dat tests/

# Parallel with specific output
pabot --processes 4 --outputdir results/ tests/
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Robot Framework Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chrome, firefox]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - name: Start application
        run: python app.py &
      - name: Run Robot tests
        run: |
          robot --variable BROWSER:${{ matrix.browser }} \
                --variable HEADLESS:true \
                --outputdir results/ \
                --include smoke \
                tests/
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: robot-results-${{ matrix.browser }}
          path: results/
```

## Best Practices

1. **Keyword abstraction levels** -- Test cases should be high-level (business language). Keywords in resource files handle the implementation. Never put locators in test files.
2. **Use resource files for organization** -- Separate keywords by domain (login_keywords.robot, api_keywords.robot). Import them in test files via `Resource`.
3. **Variables files for environments** -- Use different variable files for local, CI, and staging: `robot --variablefile config/variables_ci.robot tests/`.
4. **Tag everything** -- Use tags like `smoke`, `regression`, `api`, `web` for selective execution. Run with `--include smoke` or `--exclude slow`.
5. **Documentation on test cases** -- Add `[Documentation]` to every test case. It appears in `report.html` and helps team members understand test purpose.
6. **Explicit waits over implicit** -- Use `Wait Until Element Is Visible` with timeout instead of relying on SeleniumLibrary's implicit wait for dynamic content.
7. **Parallel execution with Pabot** -- Use Pabot for parallel suite execution in CI. It reduces total run time significantly for large suites.
8. **Custom Python libraries for complex logic** -- When keyword syntax becomes awkward for complex logic, write Python library classes with the `@keyword` decorator.
9. **Separate locators from keywords** -- Store locators in dedicated files (locators/login_locators.robot) and import them. This makes locator updates a single-file change.
10. **Upload results as CI artifacts** -- Always upload `report.html`, `log.html`, and `output.xml` from CI runs for debugging failures.

## Anti-Patterns

1. **Hardcoded locators in test cases** -- Putting `css:.submit-btn` directly in test cases. Move locators to variables files or page resources.
2. **Sleep instead of waits** -- Using `Sleep 5s` instead of `Wait Until Element Is Visible`. Sleeps waste time on fast pages and are insufficient on slow ones.
3. **Monolithic test files** -- One `.robot` file with 100 test cases. Split by feature into manageable files.
4. **No keyword abstraction** -- Test cases with 20 low-level SeleniumLibrary calls. Extract custom keywords that describe business actions.
5. **Ignoring return values** -- Not capturing return values from keywords: `${result}= Get Text css:.total`. Without `${result}=`, the value is lost.
6. **Tight coupling to locators** -- Using XPath locators that match DOM structure: `//div[3]/span[2]/a`. Use `data-testid` or meaningful CSS selectors.
7. **Not using tags** -- Running the entire suite when only smoke tests are needed. Tag tests and use `--include`/`--exclude`.
8. **Overly complex keyword arguments** -- Keywords with 10 arguments. Use dictionaries or split into smaller keywords.
9. **Skipping test documentation** -- Tests without `[Documentation]` produce reports that are hard to review. Always document the test purpose.
10. **Not checking reports** -- Running tests and only checking pass/fail without reviewing `log.html`. The log shows step-by-step execution, screenshots, and timing.

## Run Commands

```bash
# Run all tests
robot tests/

# Run specific suite
robot tests/web/login.robot

# Run with tags
robot --include smoke tests/
robot --exclude slow tests/
robot --include smoke --exclude wip tests/

# Run with variables
robot --variable BASE_URL:http://staging.example.com tests/
robot --variablefile config/variables_ci.robot tests/

# Output configuration
robot --outputdir results/ tests/
robot --log NONE --report NONE --output output.xml tests/

# Parallel with pabot
pabot --processes 4 tests/

# Rerun failed tests
robot --rerunfailed results/output.xml --output rerun.xml tests/
rebot --merge results/output.xml results/rerun.xml
```
