import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework Data-Driven Testing Complete Guide',
  description:
    'Master data-driven testing in Robot Framework. Test templates, CSV/Excel data sources, parameterization patterns, equivalence partitioning, and CI integration.',
  date: '2026-05-08',
  category: 'Guide',
  content: `
# Robot Framework Data-Driven Testing Complete Guide

Data-driven testing - the practice of running the same logical test multiple times with different input data - is one of the most effective ways to scale a test suite without increasing maintenance cost. Instead of writing twenty nearly identical test cases for twenty input combinations, you write one parameterized test and supply twenty rows of data. Robot Framework's Test Template feature makes this incredibly readable: each test name becomes a documented data set, and the underlying keyword is defined once. Combined with external data sources like CSV, Excel, or JSON, you can drive thousands of test scenarios from a single Python or robot file.

This complete guide covers every aspect of data-driven testing in Robot Framework in 2026. You'll learn the Test Template syntax for inline data, how to read from CSV files using DataDriver, how to parameterize from databases or APIs, equivalence partitioning strategies, boundary value testing, how to share test data across suites, how to debug failing rows, and how to integrate with CI/CD. Real examples cover login validation, API testing, mathematical edge cases, and accessibility matrix testing.

## Key Takeaways

- Test Template lets one keyword run many test cases
- DataDriver library reads CSV, XLS, XLSX, JSON, and Python files
- Each row becomes a separate test case with its own pass/fail status
- Test names from data files appear in reports
- Tags can be applied per row for selective execution
- Use equivalence classes and boundary values to maximize coverage
- Combine with Pabot for parallel execution

---

## Inline Test Template

The simplest data-driven pattern uses Test Template with rows in the robot file:

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary
Test Template    Login Should Return

*** Test Cases ***                  USERNAME              PASSWORD       EXPECTED
Valid Credentials                   user@example.com      Secret123!     Welcome
Wrong Password                      user@example.com      WrongPass      Invalid
Empty Username                      \${EMPTY}              Secret123!     Username required
SQL Injection Attempt               admin' OR '1'='1      anything       Invalid
Long Email Address                  \${LONG_EMAIL}         Secret123!     Invalid

*** Keywords ***
Login Should Return
    [Arguments]    \${user}    \${pass}    \${expected}
    Open Browser    \${BASE_URL}/login    chrome
    Input Text    id=username    \${user}
    Input Text    id=password    \${pass}
    Click Button    Sign in
    Page Should Contain    \${expected}
    Close Browser
\`\`\`

Each row produces a separate test case in the report with its name as the test ID.

## CSV With DataDriver

\`\`\`bash
pip install robotframework-datadriver
\`\`\`

\`\`\`robot
*** Settings ***
Library    DataDriver    file=data/logins.csv    dialect=excel
Test Template    Login Should Return

*** Test Cases ***
Login Test Case    \${user}    \${pass}    \${expected}

*** Keywords ***
Login Should Return
    [Arguments]    \${user}    \${pass}    \${expected}
    Open Browser    \${BASE_URL}/login    chrome
    Input Text    id=username    \${user}
    Input Text    id=password    \${pass}
    Click Button    Sign in
    Page Should Contain    \${expected}
    Close Browser
\`\`\`

The CSV file:

\`\`\`csv
TestName,user,pass,expected
Valid login,user@example.com,Secret123!,Welcome
Wrong pass,user@example.com,WrongPass,Invalid
Empty user,,Secret123!,Username required
\`\`\`

Each row becomes its own test case named TestName.

## Excel Data Source

\`\`\`robot
*** Settings ***
Library    DataDriver    file=data/test_data.xlsx    sheet_name=Logins
Test Template    Login Should Return

*** Test Cases ***
Excel Test    \${user}    \${pass}    \${expected}
\`\`\`

The first row of the sheet is header columns matching keyword argument names.

## JSON Data Source

\`\`\`json
{
  "logins": [
    {"TestName": "Valid", "user": "a@b.com", "pass": "secret", "expected": "Welcome"},
    {"TestName": "Invalid", "user": "a@b.com", "pass": "wrong", "expected": "Error"}
  ]
}
\`\`\`

\`\`\`robot
*** Settings ***
Library    DataDriver    file=data/logins.json
Test Template    Login Should Return
\`\`\`

## Equivalence Partitioning

Group inputs into classes and test one representative per class:

| Class | Examples |
|-------|----------|
| Valid email | a@b.com, user.name@domain.co.uk |
| Missing @ | abc.com, a.b.com |
| Multiple @ | a@b@c.com |
| Empty | (blank) |
| Special chars | test+1@example.com |
| Long | 200-char email |

\`\`\`robot
*** Test Cases ***                  EMAIL                          EXPECTED
Standard Format                     test@example.com               Valid
Missing At Symbol                   testexample.com                Invalid
Multiple At Symbols                 a@b@c.example.com              Invalid
Empty                               \${EMPTY}                       Invalid
Plus Addressing                     test+filter@example.com        Valid
Very Long                           \${LONG_EMAIL}                  Invalid
\`\`\`

## Boundary Value Testing

Test the edges of valid ranges:

\`\`\`robot
*** Settings ***
Test Template    Quantity Should Be Accepted

*** Test Cases ***            QTY    EXPECTED
Minus One                     -1     Invalid
Zero                          0      Invalid
One                           1      Valid
Mid Range                     50     Valid
Max                           99     Valid
Just Above Max                100    Invalid

*** Keywords ***
Quantity Should Be Accepted
    [Arguments]    \${qty}    \${expected}
    \${response}=    POST    \${API}/orders    json={"quantity": \${qty}}    expected_status=any
    Run Keyword If    '\${expected}'=='Valid'    Status Should Be    201    \${response}
    ...    ELSE    Status Should Be    400    \${response}
\`\`\`

## Per Row Tags

\`\`\`robot
*** Test Cases ***                  EMAIL              EXPECTED        [Tags]
Smoke Valid Email                   test@a.com         Valid           smoke
Smoke Missing At                    invalid            Invalid         smoke
Full Regression Edge Case           a@b               Invalid         regression
\`\`\`

Run only smoke: \`robot --include smoke tests/\`

## API Driven Test Data

Sometimes you want test data from a live API:

\`\`\`robot
*** Settings ***
Library    RequestsLibrary
Library    DataDriver    arguments_strategy=name_with_test_name

*** Test Cases ***
Each User Has Valid Email

*** Keywords ***
Each User Has Valid Email
    [Arguments]    \${user}
    Should Match Regexp    \${user}[email]    \\\\S+@\\\\S+\\\\.\\\\S+
\`\`\`

Custom data fetcher:

\`\`\`python
# data_loader.py
import requests

def get_test_data():
    response = requests.get('https://api.example.com/users')
    return [{'TestName': u['name'], 'user': u} for u in response.json()]
\`\`\`

## Database Driven Tests

\`\`\`robot
*** Settings ***
Library    DatabaseLibrary
Library    DataDriver    file=db_data.py
Test Template    Order Should Be Valid

*** Test Cases ***
DB Test    \${order_id}

*** Keywords ***
Order Should Be Valid
    [Arguments]    \${order_id}
    \${rows}=    Query    SELECT status FROM orders WHERE id='\${order_id}'
    Should Not Be Empty    \${rows}
    Should Be Equal    \${rows}[0][0]    completed
\`\`\`

\`\`\`python
# db_data.py
import psycopg2

def get_test_data():
    conn = psycopg2.connect(...)
    cur = conn.cursor()
    cur.execute("SELECT id FROM orders WHERE created_at > NOW() - INTERVAL '24 hours'")
    return [{'TestName': f'Order {row[0]}', 'order_id': row[0]} for row in cur.fetchall()]
\`\`\`

## Sharing Test Data Across Suites

Use a Resource file with variable definitions:

\`\`\`robot
*** Settings ***
Documentation    Shared test data

*** Variables ***
@{VALID_EMAILS}    test@example.com    user+1@domain.co.uk
@{INVALID_EMAILS}    nodomain    @missing    multiple@@example.com
\`\`\`

Or load from YAML:

\`\`\`yaml
# data/users.yaml
admin_user:
  email: admin@example.com
  password: AdminPass123!
regular_user:
  email: user@example.com
  password: UserPass123!
\`\`\`

\`\`\`robot
*** Settings ***
Variables    data/users.yaml

*** Test Cases ***
Admin Login Works
    Login    \${admin_user.email}    \${admin_user.password}
\`\`\`

## Combining With Pabot

Run all rows in parallel:

\`\`\`bash
pabot --processes 8 --testlevelsplit tests/data_driven.robot
\`\`\`

Each row becomes its own parallel job.

## Debug A Single Row

When a row fails, narrow to it:

\`\`\`bash
robot --test "Wrong Password" tests/login_data.robot
\`\`\`

This runs only the row whose test name matches.

## Real Suite Example

\`\`\`robot
*** Settings ***
Documentation    Login validation matrix
Library          SeleniumLibrary
Library          DataDriver    file=data/login_matrix.csv
Test Template    Login Should Return

*** Test Cases ***
Login Validation    \${user}    \${pass}    \${expected_msg}    \${expected_status}

*** Keywords ***
Login Should Return
    [Arguments]    \${user}    \${pass}    \${expected_msg}    \${expected_status}
    Open Browser    \${BASE_URL}/login    headlesschrome
    Input Text    id=username    \${user}
    Input Text    id=password    \${pass}
    Click Button    Sign in
    Page Should Contain    \${expected_msg}
    \${url}=    Get Location
    Run Keyword If    '\${expected_status}'=='success'    Should Contain    \${url}    /dashboard
    ...    ELSE    Should Contain    \${url}    /login
    Close Browser
\`\`\`

CSV:

\`\`\`csv
TestName,user,pass,expected_msg,expected_status
Valid login redirects to dashboard,test@example.com,Secret123!,Welcome,success
Wrong password shows error,test@example.com,WrongPass,Invalid credentials,failed
Empty username shows error,,Secret123!,Username required,failed
SQL injection rejected,admin' OR '1'='1,anything,Invalid credentials,failed
Email too long rejected,thisemailisverylongandshouldbe@example.com,Secret123!,Invalid email format,failed
Locked account shows specific message,locked@example.com,Secret123!,Account locked,failed
Disabled account shows specific message,disabled@example.com,Secret123!,Account disabled,failed
\`\`\`

## Maintainability Patterns

| Pattern | Benefit |
|---------|---------|
| Centralized test data file | Single source of truth |
| Header row matches keyword args | Self-documenting |
| Test names describe scenarios | Reports become readable |
| Tags per row | Selective execution |
| External fixtures | Update data without code change |

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| 1000 row CSV with no tags | Hard to triage failures | Tag categories |
| Hardcoded data in keyword | Can't update without code | Extract to fixture |
| Generic test names like Test_1 | Reports unreadable | Descriptive names |
| Same data in 5 suites | Duplication | Share via Resource/YAML |

## CI Integration

\`\`\`yaml
name: Data Driven Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install robotframework robotframework-seleniumlibrary robotframework-datadriver
      - run: robot --include smoke --outputdir results tests/
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: results
          path: results/
\`\`\`

## Conclusion

Data-driven testing in Robot Framework turns one keyword and a data table into hundreds of focused test cases. The combination of Test Template, DataDriver, and external fixtures (CSV, JSON, YAML, DB, API) gives you maximum test coverage with minimum maintenance. Every new edge case is one row in a spreadsheet, not a new test file. When applied to login validation, payment matrices, accessibility audits, and API boundary cases, this approach scales to cover scenarios that would be impractical to write by hand.

Start with one Test Template and a small data table. As patterns emerge, extract data to a CSV, then to a shared fixture. Within a few sprints your suite will catch issues at boundaries and edge cases that previously slipped through. Explore the [skills directory](/skills) or read about [pytest patterns](/blog/pytest-testing-complete-guide) for related approaches.
`,
};
