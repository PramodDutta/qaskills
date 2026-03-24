import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework: Keyword-Driven Testing Complete Guide',
  description:
    'Master Robot Framework keyword-driven testing with this complete guide covering syntax, SeleniumLibrary, RequestsLibrary, custom keywords, variables, and data-driven testing.',
  date: '2026-03-24',
  category: 'Tutorial',
  content: `
Robot Framework is a generic open-source automation framework that uses a keyword-driven approach to make test automation accessible to teams of all technical levels. Its plain-text syntax reads like natural language, making tests understandable by developers, QA engineers, and business stakeholders alike. This complete guide covers everything from basic syntax to advanced patterns for web testing, API testing, and custom keyword development.

## Key Takeaways

- Robot Framework's keyword-driven approach creates tests that are readable by non-technical team members while remaining powerful enough for complex automation
- SeleniumLibrary provides comprehensive browser automation with built-in wait mechanisms and multi-browser support
- RequestsLibrary enables API testing with full HTTP method support, authentication, and response validation
- Custom keywords in Python extend Robot Framework with unlimited automation capabilities
- Variables, resource files, and test templates enable data-driven testing patterns that scale across large test suites
- AI coding agents with QA skills from qaskills.sh can generate Robot Framework tests with proper keyword structure and library usage

---

## What is Robot Framework?

Robot Framework is built on Python and uses a tabular syntax where test cases are composed of keywords. Keywords are either built-in, provided by libraries, or custom-defined. This layered approach means you can start with simple, readable tests and progressively add complexity as needed.

The framework supports:
- Web UI testing (via SeleniumLibrary or Browser Library)
- API testing (via RequestsLibrary)
- Database testing (via DatabaseLibrary)
- Desktop application testing (via various OS libraries)
- Mobile testing (via AppiumLibrary)
- SSH and process automation

---

## Installation and Setup

\`\`\`bash
# Install Robot Framework
pip install robotframework

# Install common libraries
pip install robotframework-seleniumlibrary
pip install robotframework-requests
pip install robotframework-databaselibrary
pip install robotframework-jsonlibrary

# Install browser drivers
pip install webdrivermanager
webdrivermanager chrome firefox --linkpath /usr/local/bin
\`\`\`

### Project Structure

\`\`\`
project/
  tests/
    web/
      login.robot
      checkout.robot
    api/
      users.robot
      orders.robot
  resources/
    common.resource
    web_keywords.resource
    api_keywords.resource
  libraries/
    CustomLibrary.py
    DataGenerator.py
  variables/
    environments.yaml
    test_data.yaml
  results/
  robot.yaml
\`\`\`

---

## Robot Framework Syntax Basics

Robot Framework files use a tabular format with sections marked by \`***\` headers.

\`\`\`robot
*** Settings ***
Documentation     Login feature tests for the web application
Library           SeleniumLibrary
Resource          ../resources/common.resource
Suite Setup       Open Browser To Application
Suite Teardown    Close All Browsers
Test Setup        Navigate To Login Page
Test Teardown     Capture Page Screenshot On Failure

*** Variables ***
\\\${BASE_URL}        http://localhost:3000
\\\${BROWSER}         chrome
\\\${VALID_USER}      alice@test.com
\\\${VALID_PASSWORD}  SecurePass123!
\\\${TIMEOUT}         10s

*** Test Cases ***
Valid Login Should Redirect To Dashboard
    [Documentation]    Verify successful login redirects to dashboard
    [Tags]    smoke    login    critical
    Enter Username    \\\${VALID_USER}
    Enter Password    \\\${VALID_PASSWORD}
    Click Login Button
    Dashboard Should Be Visible
    Welcome Message Should Contain    alice

Invalid Login Should Show Error
    [Documentation]    Verify invalid credentials show error message
    [Tags]    login    negative
    Enter Username    invalid@test.com
    Enter Password    wrongpassword
    Click Login Button
    Error Message Should Be Visible
    Error Message Should Contain    Invalid email or password

Empty Fields Should Show Validation
    [Documentation]    Verify empty form shows validation messages
    [Tags]    login    validation
    Click Login Button
    Validation Error Should Be Visible For    email
    Validation Error Should Be Visible For    password

*** Keywords ***
Navigate To Login Page
    Go To    \\\${BASE_URL}/login
    Wait Until Page Contains Element    id:login-form    \\\${TIMEOUT}

Enter Username
    [Arguments]    \\\${username}
    Input Text    id:email-input    \\\${username}

Enter Password
    [Arguments]    \\\${password}
    Input Text    id:password-input    \\\${password}

Click Login Button
    Click Button    id:login-submit

Dashboard Should Be Visible
    Wait Until Page Contains Element    id:dashboard    \\\${TIMEOUT}
    Title Should Be    Dashboard

Welcome Message Should Contain
    [Arguments]    \\\${name}
    Element Should Contain    id:welcome-message    Welcome, \\\${name}

Error Message Should Be Visible
    Wait Until Element Is Visible    css:.error-message    \\\${TIMEOUT}

Error Message Should Contain
    [Arguments]    \\\${expected_text}
    Element Should Contain    css:.error-message    \\\${expected_text}

Validation Error Should Be Visible For
    [Arguments]    \\\${field}
    Element Should Be Visible    css:[data-testid="\\\${field}-error"]

Capture Page Screenshot On Failure
    Run Keyword If Test Failed    Capture Page Screenshot
\`\`\`

---

## SeleniumLibrary for Web Testing

SeleniumLibrary is the most popular library for browser automation with Robot Framework.

### Browser Management

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary    timeout=10s    implicit_wait=0s

*** Keywords ***
Open Browser To Application
    \\\${options}=    Evaluate    sys.modules['selenium.webdriver'].ChromeOptions()    sys
    Call Method    \\\${options}    add_argument    --headless
    Call Method    \\\${options}    add_argument    --no-sandbox
    Call Method    \\\${options}    add_argument    --window-size=1920,1080
    Create WebDriver    Chrome    options=\\\${options}
    Go To    \\\${BASE_URL}

Open Browser With Profile
    [Arguments]    \\\${browser}=chrome
    Open Browser    \\\${BASE_URL}    \\\${browser}
    Maximize Browser Window
    Set Selenium Speed    0.1s
\`\`\`

### Element Interaction

\`\`\`robot
*** Test Cases ***
Complete Registration Form
    [Tags]    registration
    Navigate To Registration Page

    # Text inputs
    Input Text    id:first-name    John
    Input Text    id:last-name    Doe
    Input Text    id:email    john.doe@example.com
    Input Text    id:phone    +1-555-0123

    # Select dropdown
    Select From List By Value    id:country    US
    Select From List By Label    id:state    California

    # Checkboxes and radio buttons
    Select Checkbox    id:agree-terms
    Select Radio Button    plan    premium

    # File upload
    Choose File    id:avatar-upload    \\\${CURDIR}/fixtures/avatar.png

    # Submit form
    Click Button    id:register-button

    # Verify success
    Wait Until Page Contains    Registration successful    10s
    Location Should Contain    /welcome

*** Keywords ***
Navigate To Registration Page
    Go To    \\\${BASE_URL}/register
    Wait Until Element Is Visible    id:registration-form
\`\`\`

### Handling Dynamic Content

\`\`\`robot
*** Keywords ***
Wait For Search Results
    [Arguments]    \\\${min_count}=1
    Wait Until Keyword Succeeds    30s    2s
    ...    Verify Search Results Count    \\\${min_count}

Verify Search Results Count
    [Arguments]    \\\${min_count}
    \\\${count}=    Get Element Count    css:.search-result
    Should Be True    \\\${count} >= \\\${min_count}

Wait For Loading To Complete
    Wait Until Element Is Not Visible    css:.loading-spinner    15s
    Sleep    0.5s    # Allow animations to settle

Handle Cookie Consent
    \\\${visible}=    Run Keyword And Return Status
    ...    Element Should Be Visible    id:cookie-banner
    Run Keyword If    \\\${visible}
    ...    Click Button    id:accept-cookies

Switch To Iframe And Interact
    [Arguments]    \\\${frame_locator}    \\\${element_locator}    \\\${value}
    Select Frame    \\\${frame_locator}
    Input Text    \\\${element_locator}    \\\${value}
    Unselect Frame
\`\`\`

---

## RequestsLibrary for API Testing

RequestsLibrary enables comprehensive HTTP API testing within Robot Framework.

\`\`\`robot
*** Settings ***
Library    RequestsLibrary
Library    JSONLibrary
Library    Collections

*** Variables ***
\\\${API_BASE}    http://localhost:3000/api
\\\${AUTH_TOKEN}    Bearer test-token-123

*** Test Cases ***
Create User Via API
    [Tags]    api    users    smoke
    \\\${headers}=    Create Dictionary
    ...    Content-Type=application/json
    ...    Authorization=\\\${AUTH_TOKEN}

    \\\${body}=    Create Dictionary
    ...    name=Alice Smith
    ...    email=alice@example.com
    ...    role=admin

    \\\${response}=    POST
    ...    \\\${API_BASE}/users
    ...    json=\\\${body}
    ...    headers=\\\${headers}
    ...    expected_status=201

    # Validate response
    \\\${json}=    Set Variable    \\\${response.json()}
    Should Be Equal As Strings    \\\${json}[name]    Alice Smith
    Should Be Equal As Strings    \\\${json}[email]    alice@example.com
    Should Not Be Empty    \\\${json}[id]
    Dictionary Should Contain Key    \\\${json}    createdAt

Get Users With Pagination
    [Tags]    api    users
    \\\${params}=    Create Dictionary    page=1    limit=10
    \\\${headers}=    Create Dictionary    Authorization=\\\${AUTH_TOKEN}

    \\\${response}=    GET
    ...    \\\${API_BASE}/users
    ...    params=\\\${params}
    ...    headers=\\\${headers}
    ...    expected_status=200

    \\\${json}=    Set Variable    \\\${response.json()}
    \\\${users}=    Set Variable    \\\${json}[data]
    \\\${total}=    Set Variable    \\\${json}[total]

    Length Should Be    \\\${users}    10
    Should Be True    \\\${total} > 0

Update User Should Return Updated Data
    [Tags]    api    users
    \\\${headers}=    Create Dictionary
    ...    Content-Type=application/json
    ...    Authorization=\\\${AUTH_TOKEN}

    \\\${body}=    Create Dictionary    name=Alice Updated

    \\\${response}=    PUT
    ...    \\\${API_BASE}/users/1
    ...    json=\\\${body}
    ...    headers=\\\${headers}
    ...    expected_status=200

    Should Be Equal As Strings    \\\${response.json()}[name]    Alice Updated

Delete User Should Return 204
    [Tags]    api    users    destructive
    \\\${headers}=    Create Dictionary    Authorization=\\\${AUTH_TOKEN}

    \\\${response}=    DELETE
    ...    \\\${API_BASE}/users/99
    ...    headers=\\\${headers}
    ...    expected_status=204

Unauthorized Request Should Return 401
    [Tags]    api    security
    \\\${response}=    GET
    ...    \\\${API_BASE}/users
    ...    expected_status=401
\`\`\`

---

## Custom Keywords in Python

Python keywords extend Robot Framework with custom logic for complex scenarios.

\`\`\`python
# libraries/CustomLibrary.py
import random
import string
from datetime import datetime, timedelta
from robot.api.deco import keyword, library

@library
class CustomLibrary:
    """Custom keywords for test automation."""

    ROBOT_LIBRARY_SCOPE = 'GLOBAL'

    @keyword("Generate Random Email")
    def generate_random_email(self, domain="test.com"):
        """Generates a unique random email address."""
        prefix = ''.join(random.choices(
            string.ascii_lowercase + string.digits, k=10
        ))
        return f"{prefix}@{domain}"

    @keyword("Generate Random String")
    def generate_random_string(self, length=10):
        """Generates a random alphanumeric string."""
        return ''.join(random.choices(
            string.ascii_letters + string.digits, k=int(length)
        ))

    @keyword("Calculate Future Date")
    def calculate_future_date(self, days=7, format="%Y-%m-%d"):
        """Returns a date N days from today."""
        future = datetime.now() + timedelta(days=int(days))
        return future.strftime(format)

    @keyword("Verify JSON Schema")
    def verify_json_schema(self, json_data, schema):
        """Validates JSON data against a schema."""
        from jsonschema import validate, ValidationError
        try:
            validate(instance=json_data, schema=schema)
            return True
        except ValidationError as e:
            raise AssertionError(f"Schema validation failed: {e.message}")

    @keyword("Parse CSV To List Of Dicts")
    def parse_csv_to_list_of_dicts(self, filepath):
        """Reads a CSV file and returns a list of dictionaries."""
        import csv
        with open(filepath, 'r') as f:
            reader = csv.DictReader(f)
            return [row for row in reader]
\`\`\`

Using custom keywords in tests:

\`\`\`robot
*** Settings ***
Library    ../libraries/CustomLibrary.py

*** Test Cases ***
Register With Random Data
    \\\${email}=    Generate Random Email
    \\\${name}=    Generate Random String    length=8
    \\\${future_date}=    Calculate Future Date    days=30

    Fill Registration Form    \\\${name}    \\\${email}
    Set Subscription Expiry    \\\${future_date}
    Submit Registration
    Verify Registration Success    \\\${email}
\`\`\`

---

## Variables and Resource Files

### Variable Types

\`\`\`robot
*** Variables ***
# Scalar variables
\\\${STRING_VAR}       Hello World
\\\${NUMBER_VAR}       42
\\\${BOOLEAN_VAR}      ${true}

# List variables
@{BROWSERS}          chrome    firefox    safari
@{ADMIN_ROLES}       superadmin    admin    moderator

# Dictionary variables
&{USER_ALICE}        name=Alice    email=alice@test.com    role=admin
&{USER_BOB}          name=Bob      email=bob@test.com      role=user

# Environment-based variables
\\\${ENV}              %{TEST_ENV=staging}
\\\${API_KEY}          %{API_KEY}

*** Test Cases ***
Use Different Variable Types
    Log    String: \\\${STRING_VAR}
    Log    First browser: @{BROWSERS}[0]
    Log    Alice email: &{USER_ALICE}[email]

    FOR    \\\${browser}    IN    @{BROWSERS}
        Log    Testing in \\\${browser}
    END
\`\`\`

### Resource Files

\`\`\`robot
# resources/common.resource
*** Settings ***
Library    SeleniumLibrary
Library    RequestsLibrary

*** Variables ***
\\\${DEFAULT_TIMEOUT}    10s

*** Keywords ***
Setup Test Environment
    [Documentation]    Common setup for all test suites
    Set Selenium Timeout    \\\${DEFAULT_TIMEOUT}
    Set Selenium Implicit Wait    0s

Take Screenshot On Failure
    [Documentation]    Captures screenshot when test fails
    Run Keyword If Test Failed    Capture Page Screenshot

Log Test Result
    [Arguments]    \\\${test_name}    \\\${status}
    Log    Test: \\\${test_name} - Status: \\\${status}    level=INFO
\`\`\`

---

## Data-Driven Testing with Test Templates

Test Templates allow you to run the same keyword with different data sets, creating clean data-driven tests.

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary
Test Template    Verify Login Attempt

*** Test Cases ***                USERNAME              PASSWORD          EXPECTED_RESULT
Valid Admin Login                 admin@test.com        Admin123!         Dashboard
Valid User Login                  user@test.com         User123!          Home
Invalid Password                  admin@test.com        wrongpass         Invalid credentials
Locked Account                    locked@test.com       Admin123!         Account locked
Unverified Email                  unverified@test.com   User123!          Please verify email

*** Keywords ***
Verify Login Attempt
    [Arguments]    \\\${username}    \\\${password}    \\\${expected}
    Open Browser    \\\${BASE_URL}/login    chrome
    Input Text    id:email    \\\${username}
    Input Text    id:password    \\\${password}
    Click Button    id:login-submit
    Wait Until Page Contains    \\\${expected}    10s
    [Teardown]    Close Browser
\`\`\`

### CSV-Based Data-Driven Testing

\`\`\`robot
*** Settings ***
Library    DataDriver    file=test_data/login_data.csv
Test Template    Verify Login

*** Test Cases ***
Login Test With \\\${username} and \\\${password}    Default    UserData

*** Keywords ***
Verify Login
    [Arguments]    \\\${username}    \\\${password}    \\\${expected_result}
    Navigate To Login Page
    Enter Credentials    \\\${username}    \\\${password}
    Submit Login Form
    Verify Result    \\\${expected_result}
\`\`\`

---

## Running Tests and Configuration

\`\`\`bash
# Run all tests
robot tests/

# Run specific test file
robot tests/web/login.robot

# Run tests by tag
robot --include smoke tests/
robot --exclude destructive tests/
robot --include smoke --exclude slow tests/

# Run with variables
robot --variable BASE_URL:https://staging.example.com tests/
robot --variable BROWSER:firefox tests/

# Parallel execution with pabot
pip install robotframework-pabot
pabot --processes 4 tests/

# Generate specific output
robot --outputdir results --log log.html --report report.html tests/

# Dry run (validate syntax without executing)
robot --dryrun tests/

# Rerun failed tests
robot --rerunfailed output.xml tests/
\`\`\`

---

## CI/CD Integration

### GitHub Actions

\`\`\`yaml
name: Robot Framework Tests
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install robotframework
          pip install robotframework-seleniumlibrary
          pip install robotframework-requests
          pip install robotframework-pabot

      - name: Setup Chrome
        uses: browser-actions/setup-chrome@latest

      - name: Run Robot Tests
        run: |
          robot --outputdir results \\
                --variable BROWSER:headlesschrome \\
                --variable BASE_URL:\${{ secrets.STAGING_URL }} \\
                tests/

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: robot-results
          path: results/
\`\`\`

---

## Integrating QA Skills for Robot Framework

Accelerate your Robot Framework test creation with AI-powered QA skills:

\`\`\`bash
npx @qaskills/cli add robot-framework
\`\`\`

This skill teaches your AI coding agent to generate Robot Framework tests with proper keyword structure, resource file organization, and library usage patterns.

---

## 10 Best Practices for Robot Framework

1. **Use descriptive keyword names.** Keywords should read like natural language: "User Should See Dashboard" rather than "Check Dashboard Visible."

2. **Create abstraction layers with resource files.** Low-level technical keywords belong in resource files. Test cases should use high-level business keywords.

3. **Tag tests consistently.** Use tags like \`smoke\`, \`regression\`, \`critical\`, and feature names to enable flexible test selection in CI/CD.

4. **Keep test cases short.** Each test case should have 5-10 keyword calls at most. If a test is longer, extract intermediate steps into higher-level keywords.

5. **Use variable files for environment configuration.** Never hardcode URLs, credentials, or environment-specific values in test files.

6. **Implement proper teardown at every level.** Suite Teardown, Test Teardown, and keyword-level \`[Teardown]\` ensure cleanup happens even when tests fail.

7. **Avoid Sleep keywords.** Use explicit waits like \`Wait Until Element Is Visible\` or \`Wait Until Keyword Succeeds\` instead of arbitrary sleep durations.

8. **Organize tests by feature, not by page.** Group tests by the business feature they verify rather than the page they interact with.

9. **Use the pabot library for parallel execution.** Robot Framework tests are naturally independent and benefit from parallel execution in CI.

10. **Version control baselines and test data.** Keep test data files, variable files, and resource files in version control alongside test cases.

---

## 8 Anti-Patterns to Avoid

1. **Writing keywords that are too granular.** A keyword like "Click Element id:submit" adds no value over the built-in. Create meaningful abstractions like "Submit Order Form."

2. **Putting all keywords in one file.** As the test suite grows, a single keywords file becomes unmaintainable. Split into domain-specific resource files.

3. **Hardcoding locators in test cases.** Locators should live in keywords or variables, not directly in test case steps. This makes maintenance a nightmare when the UI changes.

4. **Using index-based element selection.** Selecting elements by position (xpath://div[3]/span[2]) is extremely fragile. Use data-testid attributes or semantic locators.

5. **Ignoring test isolation.** Tests that depend on other tests running first will fail randomly in parallel execution. Each test should set up its own preconditions.

6. **Creating overly complex FOR loops in test cases.** Complex logic belongs in Python keywords, not in Robot Framework syntax. The tabular format is not designed for programming.

7. **Skipping documentation.** The \`[Documentation]\` setting exists for a reason. Document what each test verifies and what each keyword does, especially custom Python keywords.

8. **Not using the built-in libraries.** Robot Framework includes BuiltIn, String, Collections, DateTime, and OperatingSystem libraries. Learn these before writing custom Python code for common operations.

---

## Conclusion

Robot Framework's keyword-driven approach makes test automation accessible while remaining powerful enough for enterprise-scale test suites. Its extensibility through Python libraries means there is virtually no automation scenario it cannot handle. By following the patterns in this guide, structuring tests with resource files, using data-driven templates, and building meaningful keyword abstractions, you can create a test suite that serves as living documentation for your application. Use QA skills from qaskills.sh to help your AI coding agents generate Robot Framework tests that follow these best practices from the start.
`,
};
