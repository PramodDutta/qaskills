import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework API Testing with RequestsLibrary 2026',
  description:
    'Complete guide to API testing with Robot Framework and RequestsLibrary. Covers REST, JSON validation, auth, OAuth, JWT, contract testing, and CI integration.',
  date: '2026-05-03',
  category: 'API Testing',
  content: `
# Robot Framework API Testing with RequestsLibrary

Robot Framework was originally designed for keyword-driven acceptance testing of web applications, but its plugin architecture has made it a popular choice for API testing too. RequestsLibrary, built on top of the famous Python requests package, exposes HTTP verbs as Robot keywords - GET, POST, PUT, DELETE, PATCH - along with rich features for session management, authentication, JSON validation, and assertion. Combined with Robot's data-driven syntax and tag system, it produces test suites that are readable to non-engineers while being powerful enough to handle complex contract testing scenarios.

This complete guide covers everything you need to do production-grade API testing with Robot Framework in 2026. You'll learn the difference between session and stateless requests, how to handle every form of authentication from basic auth to OAuth 2.0 and JWT, how to validate JSON payloads with JSONPath, how to integrate with Pact and OpenAPI for contract testing, and how to run the whole suite in CI/CD pipelines. Each section includes real, runnable code, and the conclusion brings the patterns together in a complete suite you can adapt to your own services.

## Key Takeaways

- RequestsLibrary wraps the Python requests package with Robot-friendly keywords
- Use Create Session for repeated calls to the same host - it's faster and supports auth
- Validate JSON with JSONPath via the JSONLibrary or robotframework-jsonschema-library
- Handle authentication via auth tuples, custom headers, or OAuth helpers
- Use Wait Until Keyword Succeeds for eventually consistent endpoints
- Tag tests by service, contract, or risk profile for selective execution
- Generate per-environment configs with variable files

---

## Installation

\`\`\`bash
pip install robotframework robotframework-requests robotframework-jsonlibrary
\`\`\`

## Basic GET Request

\`\`\`robot
*** Settings ***
Library    RequestsLibrary
Library    Collections

*** Variables ***
\${BASE_URL}    https://api.example.com

*** Test Cases ***
Get Single User Returns 200
    \${response}=    GET    \${BASE_URL}/users/1
    Status Should Be    200    \${response}
    \${body}=    Set Variable    \${response.json()}
    Dictionary Should Contain Key    \${body}    id
    Dictionary Should Contain Key    \${body}    email
\`\`\`

This calls the API directly without a session - fine for one-off requests but heavier on TCP setup if you're making many calls.

## Sessions

Sessions reuse the underlying connection and let you pre-configure auth headers:

\`\`\`robot
*** Settings ***
Library    RequestsLibrary
Suite Setup    Create Session    api    \${BASE_URL}    headers=\${HEADERS}

*** Variables ***
\${BASE_URL}    https://api.example.com
&{HEADERS}    Content-Type=application/json    Accept=application/json

*** Test Cases ***
List Users
    \${response}=    GET On Session    api    /users
    Status Should Be    200    \${response}
    Length Should Be Greater Than    \${response.json()}    0
\`\`\`

The session named api is reused across all GET On Session calls.

## POST With JSON Body

\`\`\`robot
*** Test Cases ***
Create User Returns 201
    &{payload}=    Create Dictionary    name=Alice    email=alice@example.com
    \${response}=    POST On Session    api    /users    json=&{payload}
    Status Should Be    201    \${response}
    \${user_id}=    Set Variable    \${response.json()}[id]
    Should Not Be Empty    \${user_id}
    Log    Created user: \${user_id}
\`\`\`

The json= keyword serializes the dictionary and sets Content-Type automatically.

## PUT, PATCH, DELETE

\`\`\`robot
*** Test Cases ***
Update User Email
    &{updates}=    Create Dictionary    email=updated@example.com
    \${response}=    PATCH On Session    api    /users/1    json=&{updates}
    Status Should Be    200    \${response}
    Should Be Equal    \${response.json()}[email]    updated@example.com

Replace User
    &{full}=    Create Dictionary    name=Bob    email=bob@example.com    role=admin
    \${response}=    PUT On Session    api    /users/1    json=&{full}
    Status Should Be    200    \${response}

Delete User
    \${response}=    DELETE On Session    api    /users/1
    Status Should Be    204    \${response}
\`\`\`

## Query Parameters

\`\`\`robot
*** Test Cases ***
Search With Query Params
    &{params}=    Create Dictionary    q=alice    limit=10    sort=name
    \${response}=    GET On Session    api    /users    params=&{params}
    Status Should Be    200    \${response}
    Length Should Be Less Than Or Equal    \${response.json()}    10
\`\`\`

## Path Variables

\`\`\`robot
*** Keywords ***
Get User By ID
    [Arguments]    \${user_id}
    \${response}=    GET On Session    api    /users/\${user_id}
    Status Should Be    200    \${response}
    [Return]    \${response.json()}

*** Test Cases ***
Fetch User Alice
    \${user}=    Get User By ID    42
    Should Be Equal    \${user}[name]    Alice
\`\`\`

## Authentication Patterns

### Basic Auth

\`\`\`robot
*** Settings ***
Library    Collections

*** Variables ***
\${USER}    apiuser
\${PASS}    secretpass

*** Test Cases ***
Basic Auth Login
    \${auth}=    Create List    \${USER}    \${PASS}
    Create Session    api    \${BASE_URL}    auth=\${auth}
    \${response}=    GET On Session    api    /me
    Status Should Be    200    \${response}
\`\`\`

### Bearer Token (JWT)

\`\`\`robot
*** Keywords ***
Login And Get Token
    &{creds}=    Create Dictionary    email=test@example.com    password=secret123
    \${response}=    POST    \${BASE_URL}/auth/login    json=&{creds}
    Status Should Be    200    \${response}
    \${token}=    Set Variable    \${response.json()}[access_token]
    [Return]    \${token}

Use Bearer Token
    \${token}=    Login And Get Token
    &{headers}=    Create Dictionary    Authorization=Bearer \${token}
    Create Session    api    \${BASE_URL}    headers=&{headers}
\`\`\`

### API Key Header

\`\`\`robot
*** Settings ***
Library    RequestsLibrary
Suite Setup    Setup API Session

*** Variables ***
\${API_KEY}    %{API_KEY}

*** Keywords ***
Setup API Session
    &{headers}=    Create Dictionary    X-API-Key=\${API_KEY}
    Create Session    api    \${BASE_URL}    headers=&{headers}
\`\`\`

### OAuth 2.0 Client Credentials

\`\`\`robot
*** Keywords ***
Get OAuth Token
    &{data}=    Create Dictionary
    ...    grant_type=client_credentials
    ...    client_id=\${CLIENT_ID}
    ...    client_secret=\${CLIENT_SECRET}
    ...    scope=read write
    &{headers}=    Create Dictionary    Content-Type=application/x-www-form-urlencoded
    \${response}=    POST    \${AUTH_URL}/oauth/token    data=&{data}    headers=&{headers}
    Status Should Be    200    \${response}
    [Return]    \${response.json()}[access_token]
\`\`\`

## JSON Validation With JSONPath

\`\`\`robot
*** Settings ***
Library    RequestsLibrary
Library    JSONLibrary

*** Test Cases ***
Validate Nested Field
    \${response}=    GET On Session    api    /orders/42
    \${order}=    Set Variable    \${response.json()}
    \${customer_email}=    Get Value From Json    \${order}    $.customer.email
    Should Be Equal    \${customer_email}[0]    customer@example.com
    \${item_count}=    Get Value From Json    \${order}    $.items.length()
    Should Be True    \${item_count}[0] > 0
\`\`\`

## Schema Validation

Validate the entire response against a JSON Schema:

\`\`\`robot
*** Settings ***
Library    RequestsLibrary
Library    JSONLibrary
Library    JSONSchemaLibrary    schemas

*** Test Cases ***
User Endpoint Matches Schema
    \${response}=    GET On Session    api    /users/1
    Validate Json    user.json    \${response.json()}
\`\`\`

The schema file:

\`\`\`json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "name", "email"],
  "properties": {
    "id": {"type": "integer"},
    "name": {"type": "string"},
    "email": {"type": "string", "format": "email"}
  }
}
\`\`\`

## Status Code Matrix

API tests must verify both success and error cases. Use a data-driven test:

| Endpoint | Method | Expected | Tag |
|----------|--------|----------|-----|
| /users | GET | 200 | smoke |
| /users/999999 | GET | 404 | smoke |
| /users (no auth) | GET | 401 | security |
| /users (bad JSON) | POST | 400 | validation |
| /admin | GET | 403 | security |

\`\`\`robot
*** Test Cases ***
List Users 200
    [Tags]    smoke
    \${response}=    GET On Session    api    /users
    Status Should Be    200    \${response}

Missing User 404
    [Tags]    smoke
    \${response}=    GET On Session    api    /users/999999    expected_status=404

Unauthenticated 401
    [Tags]    security
    Create Session    noauth    \${BASE_URL}
    \${response}=    GET On Session    noauth    /users    expected_status=401
\`\`\`

## Eventually Consistent Endpoints

Some endpoints take time to reflect changes. Use Wait Until Keyword Succeeds:

\`\`\`robot
*** Keywords ***
Order Status Should Be
    [Arguments]    \${id}    \${expected}
    \${response}=    GET On Session    api    /orders/\${id}
    Status Should Be    200    \${response}
    Should Be Equal    \${response.json()}[status]    \${expected}

*** Test Cases ***
Order Eventually Processed
    \${id}=    Create Order
    Wait Until Keyword Succeeds    2min    5s
    ...    Order Status Should Be    \${id}    processed
\`\`\`

## Multipart File Upload

\`\`\`robot
*** Settings ***
Library    RequestsLibrary

*** Test Cases ***
Upload File
    \${files}=    Create Dictionary    file=@{file_path}    test.csv    text/csv
    \${response}=    POST On Session    api    /uploads    files=\${files}
    Status Should Be    201    \${response}
    Should Be Equal    \${response.json()}[status]    accepted
\`\`\`

## Response Headers

\`\`\`robot
*** Test Cases ***
Validate Response Headers
    \${response}=    GET On Session    api    /users
    Status Should Be    200    \${response}
    Should Be Equal    \${response.headers}[Content-Type]    application/json
    Dictionary Should Contain Key    \${response.headers}    X-Request-ID
    Should Match Regexp    \${response.headers}[X-RateLimit-Remaining]    \\\\d+
\`\`\`

## Cookies

\`\`\`robot
*** Test Cases ***
Session Cookie Set On Login
    &{creds}=    Create Dictionary    email=test@example.com    password=secret
    \${response}=    POST On Session    api    /login    json=&{creds}
    Status Should Be    200    \${response}
    Dictionary Should Contain Key    \${response.cookies}    session_id
\`\`\`

## Contract Testing With OpenAPI

Validate every response against your OpenAPI spec:

\`\`\`python
# resources/openapi_validator.py
import yaml
from openapi_core import OpenAPI
from openapi_core.contrib.requests import RequestsOpenAPIRequest, RequestsOpenAPIResponse

def load_spec(path):
    with open(path) as f:
        spec_dict = yaml.safe_load(f)
    return OpenAPI.from_dict(spec_dict)

def validate_response(spec_path, request, response):
    spec = load_spec(spec_path)
    spec.validate_response(
        RequestsOpenAPIRequest(request),
        RequestsOpenAPIResponse(response),
    )
\`\`\`

\`\`\`robot
*** Settings ***
Library    resources/openapi_validator.py

*** Test Cases ***
Response Matches OpenAPI
    \${response}=    GET On Session    api    /users/1
    Validate Response    openapi.yaml    \${response.request}    \${response}
\`\`\`

## Pact Contract Testing

For consumer-driven contracts, use the Pact CLI alongside Robot:

\`\`\`bash
# Generate pact from Robot tests
pact-broker publish pacts/ --consumer-app-version=$GIT_SHA
\`\`\`

Robot can run as the consumer test by hitting a Pact mock server:

\`\`\`robot
*** Variables ***
\${PACT_MOCK}    http://localhost:1234

*** Test Cases ***
Consumer Test
    Create Session    pact    \${PACT_MOCK}
    \${response}=    GET On Session    pact    /users/1
    Status Should Be    200    \${response}
\`\`\`

## Environment Configuration

Use Robot variable files for per-environment config:

\`\`\`python
# config/dev.py
BASE_URL = "https://api.dev.example.com"
API_KEY = "dev-key"
TIMEOUT = 30
\`\`\`

\`\`\`bash
robot --variablefile config/dev.py tests/
\`\`\`

## Tags Strategy

\`\`\`robot
*** Test Cases ***
Smoke Health
    [Tags]    smoke    health
    ...

Full Regression User
    [Tags]    regression    users
    ...

Critical Auth
    [Tags]    critical    auth    security
    ...
\`\`\`

\`\`\`bash
robot --include smoke tests/
robot --include regressionANDusers tests/
robot --exclude slow tests/
\`\`\`

## Suite Setup And Teardown

\`\`\`robot
*** Settings ***
Library          RequestsLibrary
Suite Setup      Configure API Suite
Suite Teardown   Tear Down API Suite

*** Keywords ***
Configure API Suite
    \${token}=    Get OAuth Token
    &{headers}=    Create Dictionary    Authorization=Bearer \${token}
    Create Session    api    \${BASE_URL}    headers=&{headers}
    Set Suite Variable    \${TOKEN}    \${token}

Tear Down API Suite
    Delete All Sessions
\`\`\`

## CI Integration

\`\`\`yaml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        env: [dev, staging]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install robotframework robotframework-requests robotframework-jsonlibrary
      - run: robot --variablefile config/\${{ matrix.env }}.py --include smoke --outputdir results tests/
        env:
          API_KEY: \${{ secrets.API_KEY }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: results-\${{ matrix.env }}
          path: results/
\`\`\`

## Performance Patterns

For load testing, use Pabot:

\`\`\`bash
pip install robotframework-pabot
pabot --processes 10 tests/load/
\`\`\`

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| Hardcoded base URL | Doesn't work across envs | Variable file per env |
| Embedded credentials | Security risk | Environment variables |
| One mega test case | Hard to debug | Small focused cases |
| No status assertion | Misses real errors | Always check status |
| Polling without timeout | Hangs forever | Use Wait Until Keyword Succeeds |

## Real Suite Example

\`\`\`robot
*** Settings ***
Documentation    Order management API regression suite
Library          RequestsLibrary
Library          JSONLibrary
Library          Collections
Library          DateTime
Suite Setup      Set Up Session
Suite Teardown   Delete All Sessions

*** Variables ***
\${BASE_URL}      https://api.shop.example.com
\${CLIENT_ID}     %{CLIENT_ID}
\${CLIENT_SECRET} %{CLIENT_SECRET}

*** Test Cases ***
Healthcheck Returns 200
    [Tags]    smoke
    \${response}=    GET On Session    api    /health
    Status Should Be    200    \${response}

Create Order Returns 201
    [Tags]    smoke    orders
    &{payload}=    Create Dictionary    sku=ABC123    quantity=2    customer_id=42
    \${response}=    POST On Session    api    /orders    json=&{payload}
    Status Should Be    201    \${response}
    \${id}=    Set Variable    \${response.json()}[id]
    Set Suite Variable    \${ORDER_ID}    \${id}

Order Processes Eventually
    [Tags]    regression    orders
    Wait Until Keyword Succeeds    2min    5s    Order Status Should Be    \${ORDER_ID}    processed

Order Cancellation Works
    [Tags]    regression    orders
    \${response}=    DELETE On Session    api    /orders/\${ORDER_ID}
    Status Should Be    204    \${response}
    \${verify}=    GET On Session    api    /orders/\${ORDER_ID}
    Should Be Equal    \${verify.json()}[status]    cancelled

*** Keywords ***
Set Up Session
    \${token}=    Get OAuth Token
    &{headers}=    Create Dictionary    Authorization=Bearer \${token}    Accept=application/json
    Create Session    api    \${BASE_URL}    headers=&{headers}

Get OAuth Token
    &{data}=    Create Dictionary    grant_type=client_credentials    client_id=\${CLIENT_ID}    client_secret=\${CLIENT_SECRET}
    \${response}=    POST    \${BASE_URL}/oauth/token    data=&{data}
    Status Should Be    200    \${response}
    [Return]    \${response.json()}[access_token]

Order Status Should Be
    [Arguments]    \${id}    \${expected}
    \${response}=    GET On Session    api    /orders/\${id}
    Status Should Be    200    \${response}
    Should Be Equal    \${response.json()}[status]    \${expected}
\`\`\`

## Conclusion

Robot Framework with RequestsLibrary gives you readable, maintainable API test suites that scale from a handful of smoke checks to thousands of regression tests across multiple services. The keyword-driven syntax keeps test cases approachable for product managers and QA leads, while the underlying Python power is enough for complex contract testing, OAuth flows, and load patterns. Pair it with JSON schema validation for contract enforcement, and you have a single tool covering most layers of API quality.

Start small: pick one critical endpoint and write a handful of smoke and negative tests. Add sessions and auth. Layer in schema validation. Then expand to your full surface area. Within a few sprints you can replace dozens of ad-hoc scripts with a single coherent Robot suite. Explore the [skills directory](/skills) for related patterns or read the full [API testing complete guide](/blog/api-testing-complete-guide).
`,
};
