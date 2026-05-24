import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework REST instance Library Complete Guide',
  description:
    'Use the REST instance library for declarative API testing in Robot Framework. JSON Schema validation, OpenAPI compliance, contract testing, and CI patterns.',
  date: '2026-05-13',
  category: 'API Testing',
  content: `
# Robot Framework REST instance Library Complete Guide

REST instance is a declarative, contract-first API testing library for Robot Framework. While RequestsLibrary gives you imperative keywords - GET, POST, PUT - REST instance provides high-level instance-based syntax with built-in JSON Schema validation, response code matchers, header assertions, and OpenAPI/Swagger integration. The library was designed for teams who want to validate that their APIs conform to a contract rather than just inspect individual fields. Combined with OpenAPI specs, REST instance lets you catch breaking changes before they hit production.

This complete guide walks through REST instance from installation to advanced contract testing patterns. You'll learn how to define API instances with base URLs and headers, how to send requests and assert on responses, how to validate against JSON Schema, how to integrate with OpenAPI documents for full contract testing, and how to wire the whole thing into CI/CD. Real test suites and example schemas are included. By the end you'll be ready to enforce API contracts in every PR.

## Key Takeaways

- REST instance is a higher-level library than RequestsLibrary
- Declarative instance syntax with persistent base URL and headers
- Built-in JSON Schema validation
- Integrates with OpenAPI 3 documents
- Response chaining via output keyword
- Built-in matchers for status codes, headers, JSON
- Best for contract-first API testing

---

## Installation

\`\`\`bash
pip install robotframework-restinstance
\`\`\`

## Basic Usage

\`\`\`robot
*** Settings ***
Library    REST    https://api.example.com

*** Test Cases ***
Get Single User
    GET    /users/1
    Integer    response status    200
    String    response body name
    String    response body email format=email
\`\`\`

Three lines tell the library: status must be 200, name must be a string, email must be a string formatted as an email.

## Instance Setup

\`\`\`robot
*** Settings ***
Library    REST    https://api.example.com    timeout=30    headers={"X-API-Key": "secret"}
\`\`\`

The first arg is the base URL. Subsequent args configure default request behavior.

## GET, POST, PUT, DELETE

\`\`\`robot
*** Test Cases ***
CRUD Flow
    POST    /users    {"name": "Alice", "email": "alice@example.com"}
    Integer    response status    201
    Integer    response body id
    \${id}=    Integer    response body id

    GET    /users/\${id}
    Integer    response status    200
    String    response body name    Alice

    PUT    /users/\${id}    {"name": "Alice Updated", "email": "alice@example.com"}
    Integer    response status    200

    DELETE    /users/\${id}
    Integer    response status    204
\`\`\`

## Matchers

REST instance provides typed matchers:

| Matcher | Purpose | Example |
|---------|---------|---------|
| Integer | Match integer | Integer response status 200 |
| Number | Match number | Number response body price 9.99 |
| String | Match string | String response body name Alice |
| Boolean | Match boolean | Boolean response body active true |
| Array | Match array | Array response body items minItems=1 |
| Object | Match object | Object response body |
| Null | Match null | Null response body deleted_at |

## JSON Schema Validation

\`\`\`robot
*** Test Cases ***
Validate Response Against Schema
    GET    /users/1
    Validate Response    schemas/user.json
\`\`\`

The schema:

\`\`\`json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "name", "email"],
  "properties": {
    "id": {"type": "integer"},
    "name": {"type": "string"},
    "email": {"type": "string", "format": "email"},
    "created_at": {"type": "string", "format": "date-time"}
  },
  "additionalProperties": false
}
\`\`\`

Validate Response checks the entire response body. If a field violates the schema, the test fails with a precise message.

## OpenAPI Integration

\`\`\`robot
*** Settings ***
Library    REST    https://api.example.com    spec=openapi.yaml
\`\`\`

When you provide an OpenAPI document, REST instance auto-validates every response against the documented schema. This catches drift between code and docs.

\`\`\`robot
*** Test Cases ***
All Endpoints Match Spec
    GET    /users/1
    GET    /users
    POST    /users    {"name": "Test"}
    # No explicit validation needed - all auto-checked against openapi.yaml
\`\`\`

## Headers

\`\`\`robot
*** Test Cases ***
Authenticated Request
    Set Headers    {"Authorization": "Bearer token-here"}
    GET    /me
    Integer    response status    200
    String    response body email
\`\`\`

Or use the headers field per request:

\`\`\`robot
GET    /me    headers={"Authorization": "Bearer token"}
\`\`\`

## Query Parameters

\`\`\`robot
GET    /users    query={"limit": 10, "offset": 0, "sort": "name"}
\`\`\`

## Status Code Ranges

\`\`\`robot
Integer    response status    200    # exactly 200
Integer    response status    2xx   # any 2xx
Integer    response status    4xx   # any client error
\`\`\`

## Response Chaining

\`\`\`robot
*** Test Cases ***
Use Field From Previous Response
    POST    /orders    {"sku": "ABC", "quantity": 1}
    \${order_id}=    Output    response body id

    GET    /orders/\${order_id}
    String    response body status    pending
\`\`\`

Output extracts a field for later use.

## Bulk Validation

\`\`\`robot
*** Test Cases ***
List Endpoint Returns Valid Items
    GET    /users
    Integer    response status    200
    Array    response body    minItems=1    maxItems=100
    Validate Response    schemas/user_list.json
\`\`\`

## Files

\`\`\`robot
*** Test Cases ***
Upload Avatar
    POST    /avatars    file=avatar.png
    Integer    response status    201
\`\`\`

## Authentication

\`\`\`robot
*** Settings ***
Library    REST    https://api.example.com    headers={"Authorization": "Bearer %{TOKEN}"}
\`\`\`

The %{} syntax reads from environment.

## Error Cases

\`\`\`robot
*** Test Cases ***
Missing User Returns 404
    GET    /users/999999
    Integer    response status    404
    String    response body code    USER_NOT_FOUND
\`\`\`

## Per Suite Setup

\`\`\`robot
*** Settings ***
Library    REST    \${API_URL}
Suite Setup    Login And Set Token

*** Keywords ***
Login And Set Token
    POST    /auth/login    {"email": "test@example.com", "password": "secret"}
    \${token}=    Output    response body access_token
    Set Headers    {"Authorization": "Bearer \${token}"}
\`\`\`

## REST instance vs RequestsLibrary

| Aspect | REST instance | RequestsLibrary |
|--------|---------------|-----------------|
| Style | Declarative | Imperative |
| Schema validation | Built-in | Manual via plugin |
| OpenAPI | Built-in | Manual |
| Verbosity | Concise | Verbose |
| Learning curve | Moderate | Easy |
| Best for | Contract testing | Free-form API testing |

## Contract Testing Pattern

\`\`\`robot
*** Settings ***
Library    REST    \${API_URL}    spec=contracts/orders.yaml
Test Template    Contract Check

*** Test Cases ***
GET Single Order              GET    /orders/42                                  200
GET Missing Order             GET    /orders/999999                              404
POST Valid Order              POST   /orders    {"sku":"ABC","qty":1}            201
POST Invalid Order            POST   /orders    {"sku":"ABC"}                    400

*** Keywords ***
Contract Check
    [Arguments]    \${method}    \${path}    \${body}    \${expected}
    Run Keyword    \${method}    \${path}    \${body}
    Integer    response status    \${expected}
\`\`\`

## Data Driven Validation

\`\`\`robot
*** Settings ***
Library    REST    \${API_URL}
Library    DataDriver    file=test_data/users.csv
Test Template    Validate User

*** Test Cases ***
User Schema Check    \${user_id}

*** Keywords ***
Validate User
    [Arguments]    \${user_id}
    GET    /users/\${user_id}
    Integer    response status    200
    Validate Response    schemas/user.json
\`\`\`

## Snapshot Testing

\`\`\`robot
*** Test Cases ***
Response Matches Snapshot
    GET    /reports/daily
    Save Response    snapshots/daily_report.json
\`\`\`

On rerun, you can diff against the snapshot.

## CI Integration

\`\`\`yaml
name: API Contract Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install robotframework robotframework-restinstance
      - run: robot --outputdir results tests/contract/
        env:
          API_URL: \${{ secrets.STAGING_API_URL }}
          TOKEN: \${{ secrets.STAGING_TOKEN }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: results
          path: results/
\`\`\`

## Real Suite Example

\`\`\`robot
*** Settings ***
Documentation    Orders API contract suite
Library          REST    \${API_URL}    spec=openapi.yaml    headers={"Authorization": "Bearer %{TOKEN}"}
Suite Setup      Setup Test Order
Suite Teardown   Cleanup Test Order

*** Variables ***
\${API_URL}    https://api.shop.example.com

*** Test Cases ***
Get Order Returns Correct Schema
    [Tags]    contract    orders
    GET    /orders/\${ORDER_ID}
    Integer    response status    200
    Validate Response    schemas/order.json

List Orders Endpoint Paginated
    [Tags]    contract    orders
    GET    /orders    query={"limit": 10, "offset": 0}
    Integer    response status    200
    Array    response body items    minItems=0    maxItems=10
    Integer    response body total

Cancel Order Returns 204
    [Tags]    contract    orders
    DELETE    /orders/\${ORDER_ID}
    Integer    response status    204

Cancelled Order Returns Cancelled Status
    [Tags]    contract    orders
    GET    /orders/\${ORDER_ID}
    String    response body status    cancelled

*** Keywords ***
Setup Test Order
    POST    /orders    {"sku": "TEST-SKU", "quantity": 1}
    \${id}=    Output    response body id
    Set Suite Variable    \${ORDER_ID}    \${id}

Cleanup Test Order
    DELETE    /orders/\${ORDER_ID}
\`\`\`

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| No schema validation | Validate every response |
| Hardcoded URLs | Per-env config |
| Skipping 4xx tests | Test error contracts too |
| One mega test | Split by endpoint |
| Embedded creds | Env vars |

## Debugging

When validation fails:

\`\`\`robot
*** Test Cases ***
Debug Response
    GET    /users/1
    Log    \${RESPONSE}    INFO
    Output    response    debug.json
\`\`\`

The Output keyword to a file gives you the full response for analysis.

## Conclusion

REST instance is a great choice for API testing when your priority is contract enforcement. The declarative style produces concise tests, JSON Schema and OpenAPI integration catches drift early, and the built-in matchers cover most assertion needs. Pair it with RequestsLibrary for flows that need imperative control, and you have full coverage of API testing scenarios in Robot Framework.

Start by writing schemas for your most important endpoints. Add a REST instance suite that validates each one. As soon as a backend change breaks a schema, the suite fails - and you've caught a regression before deployment. Visit the [skills directory](/skills) or read the [API contract testing guide](/blog/api-contract-testing-microservices) for related patterns.
`,
};
