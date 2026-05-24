import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework DatabaseLibrary Complete Guide 2026',
  description:
    'Test databases with Robot Framework DatabaseLibrary. PostgreSQL, MySQL, Oracle, SQL Server connections, query keywords, row counts, transactions, and CI patterns.',
  date: '2026-05-04',
  category: 'Reference',
  content: `
# Robot Framework DatabaseLibrary Complete Guide

Most automated tests focus on UIs and APIs, but the database is where the real source of truth lives. When an order is created, you want to verify the row exists with the correct foreign keys. When a soft delete happens, you want to confirm the deleted_at timestamp was set. When a cron job runs, you want to ensure no orphan records were left behind. Robot Framework's DatabaseLibrary lets you do all this from inside the same test framework that drives your browser and API tests, producing end-to-end coverage that reaches into the data layer.

This guide walks through everything you need to do production-quality database testing with Robot Framework in 2026. You'll learn how to connect to PostgreSQL, MySQL, Oracle, SQL Server, and SQLite; how to write parameterized queries safely; how to use row count and assertion keywords; how to manage transactions and rollback test data; and how to wire it into your CI pipelines so every PR validates the database layer. Examples use realistic schemas and patterns from production code.

## Key Takeaways

- DatabaseLibrary supports any Python DB API compliant driver
- Connect with Connect To Database; pass driver, name, user, password, host, port
- Use Query for SELECT statements that return rows
- Use Execute Sql String for DDL or DML without expected results
- Row Count keywords check the size of a result set
- Always parameterize queries to avoid SQL injection in tests
- Pair with API and UI tests for full-stack verification

---

## Installation

\`\`\`bash
pip install robotframework robotframework-databaselibrary psycopg2-binary
\`\`\`

For MySQL: pip install pymysql. For Oracle: pip install cx_Oracle. For SQL Server: pip install pyodbc.

## Connecting To PostgreSQL

\`\`\`robot
*** Settings ***
Library    DatabaseLibrary
Library    OperatingSystem
Suite Setup    Connect To Database    psycopg2    \${DB_NAME}    \${DB_USER}    \${DB_PASS}    \${DB_HOST}    \${DB_PORT}
Suite Teardown    Disconnect From Database

*** Variables ***
\${DB_NAME}    shopdb
\${DB_USER}    %{DB_USER}
\${DB_PASS}    %{DB_PASS}
\${DB_HOST}    localhost
\${DB_PORT}    5432
\`\`\`

The driver string varies by database:

| Database | Driver | Default Port |
|----------|--------|--------------|
| PostgreSQL | psycopg2 | 5432 |
| MySQL | pymysql | 3306 |
| Oracle | cx_Oracle | 1521 |
| SQL Server | pyodbc | 1433 |
| SQLite | sqlite3 | n/a |

## SELECT Queries

\`\`\`robot
*** Test Cases ***
User Exists In Database
    \${rows}=    Query    SELECT id, email FROM users WHERE email='test@example.com'
    Length Should Be Greater Than    \${rows}    0
    \${user_id}=    Set Variable    \${rows}[0][0]
    Log    User ID: \${user_id}
\`\`\`

Query returns a list of tuples. Index [0][0] gets the first row's first column.

## Parameterized Queries

Avoid SQL injection - always parameterize:

\`\`\`robot
*** Keywords ***
Get User By Email
    [Arguments]    \${email}
    \${rows}=    Query    SELECT id, name, email FROM users WHERE email = %s    \${email}
    [Return]    \${rows}

*** Test Cases ***
Find Specific User
    \${result}=    Get User By Email    alice@example.com
    Length Should Be Equal    \${result}    1
\`\`\`

The %s placeholder is filled by the driver, not by string concatenation.

## Row Count Assertions

\`\`\`robot
*** Test Cases ***
At Least Ten Users Exist
    Row Count Is Greater Than X    SELECT * FROM users    10

Exactly One Admin
    Row Count Is Equal To X    SELECT * FROM users WHERE role='admin'    1

No Orphan Orders
    Row Count Is Equal To X
    ...    SELECT * FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE c.id IS NULL
    ...    0
\`\`\`

## Execute Sql For Modifications

For INSERT, UPDATE, DELETE that don't return rows:

\`\`\`robot
*** Keywords ***
Create Test Customer
    [Arguments]    \${name}    \${email}
    Execute Sql String
    ...    INSERT INTO customers (name, email, created_at) VALUES ('\${name}', '\${email}', NOW())

Cleanup Test Customer
    [Arguments]    \${email}
    Execute Sql String    DELETE FROM customers WHERE email='\${email}'
\`\`\`

For safety, prefer parameterized via the underlying connection.

## Transactions

\`\`\`robot
*** Test Cases ***
Transactional Insert And Rollback
    Connect To Database    psycopg2    \${DB_NAME}    \${DB_USER}    \${DB_PASS}    \${DB_HOST}    \${DB_PORT}
    Execute Sql String    BEGIN
    Execute Sql String    INSERT INTO users (email) VALUES ('temp@test.com')
    Row Count Is Equal To X    SELECT * FROM users WHERE email='temp@test.com'    1
    Execute Sql String    ROLLBACK
    Row Count Is Equal To X    SELECT * FROM users WHERE email='temp@test.com'    0
    Disconnect From Database
\`\`\`

## Test Data Setup

A common pattern: insert test data in suite setup, verify in tests, clean up in teardown.

\`\`\`robot
*** Settings ***
Library    DatabaseLibrary
Suite Setup    Set Up Test Data
Suite Teardown    Clean Up Test Data

*** Keywords ***
Set Up Test Data
    Connect To Database    psycopg2    \${DB_NAME}    \${DB_USER}    \${DB_PASS}    \${DB_HOST}    \${DB_PORT}
    Execute Sql String    INSERT INTO users (id, email) VALUES (9001, 'test1@test.com')
    Execute Sql String    INSERT INTO users (id, email) VALUES (9002, 'test2@test.com')

Clean Up Test Data
    Execute Sql String    DELETE FROM users WHERE id IN (9001, 9002)
    Disconnect From Database

*** Test Cases ***
Test User Lookup
    \${rows}=    Query    SELECT id FROM users WHERE id IN (9001, 9002)
    Length Should Be Equal    \${rows}    2
\`\`\`

## End To End Verification

Combine UI, API, and DB:

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary
Library    RequestsLibrary
Library    DatabaseLibrary
Library    Collections
Suite Setup    Set Up Suite
Suite Teardown    Tear Down Suite

*** Test Cases ***
Order Created In All Layers
    [Tags]    e2e
    # UI
    Go To    \${APP}/shop
    Click Element    css=.add-to-cart
    Click Element    css=.checkout
    Click Button    Submit Order
    Wait Until Element Is Visible    css=.confirmation
    \${order_id_text}=    Get Text    css=.order-id
    \${order_id}=    Set Variable    \${order_id_text.strip()}

    # API
    \${api_response}=    GET On Session    api    /orders/\${order_id}
    Status Should Be    200    \${api_response}
    Should Be Equal    \${api_response.json()}[status]    pending

    # Database
    \${rows}=    Query    SELECT id, status FROM orders WHERE id=%s    \${order_id}
    Length Should Be Equal    \${rows}    1
    Should Be Equal    \${rows}[0][1]    pending
\`\`\`

## Connecting To Multiple Databases

\`\`\`robot
*** Keywords ***
Connect Primary
    Connect To Database    psycopg2    \${PRIMARY_DB}    \${USER}    \${PASS}    \${HOST}    5432    alias=primary

Connect Reporting
    Connect To Database    psycopg2    \${REPORT_DB}    \${USER}    \${PASS}    \${REPORT_HOST}    5432    alias=reporting

*** Test Cases ***
Cross Database Check
    Connect Primary
    \${order_id}=    Query    SELECT id FROM orders LIMIT 1    alias=primary
    Connect Reporting
    Row Count Is Greater Than X    SELECT * FROM order_facts WHERE order_id='\${order_id}[0][0]'    0    alias=reporting
\`\`\`

## Querying With JSON Columns

PostgreSQL JSONB and similar:

\`\`\`robot
*** Test Cases ***
JSON Field Should Contain Tag
    \${rows}=    Query    SELECT id FROM skills WHERE tags @> '["bdd"]'::jsonb
    Length Should Be Greater Than    \${rows}    0
\`\`\`

## Verifying Schema

\`\`\`robot
*** Test Cases ***
Users Table Has Expected Columns
    \${rows}=    Query
    ...    SELECT column_name FROM information_schema.columns WHERE table_name='users'
    \${columns}=    Evaluate    [r[0] for r in \${rows}]
    Should Contain    \${columns}    email
    Should Contain    \${columns}    created_at
\`\`\`

## Performance Patterns

| Pattern | Notes |
|---------|-------|
| Connection pooling | Use a single Connect To Database in suite setup |
| Lightweight queries | Test specific columns, not SELECT * |
| Cleanup per test | Use Test Teardown to remove fixture data |
| Isolated test data | Prefix test rows with TEST_ or use a known ID range |

## CI Pipeline

\`\`\`yaml
name: DB Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: shopdb
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install robotframework robotframework-databaselibrary psycopg2-binary
      - run: psql -h localhost -U postgres -d shopdb -f schema.sql
        env:
          PGPASSWORD: testpass
      - run: robot --variable DB_HOST:localhost --variable DB_PASS:testpass --outputdir results tests/
\`\`\`

## Wait For Async Inserts

\`\`\`robot
*** Keywords ***
Order Row Should Exist
    [Arguments]    \${order_id}
    Row Count Is Equal To X    SELECT * FROM orders WHERE id='\${order_id}'    1

*** Test Cases ***
Async Order Persistence
    \${order_id}=    Submit Order Via API
    Wait Until Keyword Succeeds    30s    2s    Order Row Should Exist    \${order_id}
\`\`\`

## Mocking Databases

For unit-style tests, point your app at SQLite or a Docker test container. Many production-grade test setups use Docker Compose:

\`\`\`yaml
# docker-compose.test.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: test
\`\`\`

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| Hardcoded credentials | Security risk | Env vars or vault |
| Direct UPDATE on prod schema | Data loss risk | Test DB only |
| String concat for queries | SQL injection risk | Parameterized |
| Slow integration tests | CI bottleneck | Use seed scripts |
| Sharing state between tests | Flaky | Per-test cleanup |

## Real Suite Example

\`\`\`robot
*** Settings ***
Documentation    Database integrity test suite
Library          DatabaseLibrary
Library          OperatingSystem
Library          DateTime
Suite Setup      Connect To Database    psycopg2    \${DB_NAME}    \${DB_USER}    \${DB_PASS}    \${DB_HOST}    \${DB_PORT}
Suite Teardown   Disconnect From Database

*** Variables ***
\${DB_NAME}    shopdb
\${DB_USER}    %{DB_USER}
\${DB_PASS}    %{DB_PASS}
\${DB_HOST}    localhost
\${DB_PORT}    5432

*** Test Cases ***
Users Table Healthy
    [Tags]    smoke
    Row Count Is Greater Than X    SELECT * FROM users WHERE active=true    100

No Duplicate Emails
    [Tags]    integrity
    Row Count Is Equal To X
    ...    SELECT email FROM users GROUP BY email HAVING COUNT(*) > 1
    ...    0

Recent Orders Have Customers
    [Tags]    integrity
    Row Count Is Equal To X
    ...    SELECT o.id FROM orders o LEFT JOIN customers c ON o.customer_id=c.id
    ...    WHERE c.id IS NULL AND o.created_at > NOW() - INTERVAL '7 days'
    ...    0

Audit Log Append Only
    [Tags]    audit
    \${response}=    Query    SELECT MIN(created_at), MAX(created_at) FROM audit_log
    Log    Audit range: \${response}

Soft Delete Sets Timestamp
    [Tags]    feature
    Execute Sql String    INSERT INTO users (id, email) VALUES (9999, 'delete-me@test.com')
    Execute Sql String    UPDATE users SET deleted_at=NOW() WHERE id=9999
    \${rows}=    Query    SELECT deleted_at FROM users WHERE id=9999
    Should Not Be Equal    \${rows}[0][0]    \${None}
    Execute Sql String    DELETE FROM users WHERE id=9999
\`\`\`

## Conclusion

DatabaseLibrary closes the loop in Robot Framework testing - reaching past the UI and API to verify the database itself. By treating queries as just another set of keywords, you get the same readability and tagging benefits as the rest of your suite, with the added confidence that your data layer is sound. Pair these patterns with API and UI tests, and you have full-stack quality coverage that catches the bugs other approaches miss.

Start by writing a handful of integrity checks for your most critical tables. Run them in CI nightly to catch drift between code and schema. Then layer in transactional cleanup and end-to-end flows. Visit our [skills directory](/skills) for related patterns or read the [database testing automation guide](/blog/database-testing-automation-guide).
`,
};
