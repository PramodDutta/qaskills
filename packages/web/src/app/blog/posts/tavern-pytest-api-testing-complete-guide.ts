import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Tavern pytest API Testing Complete Guide 2026',
  description:
    'Complete guide to Tavern for declarative API testing with pytest. YAML-based tests, MQTT support, plugins, authentication, fixtures, and CI integration.',
  date: '2026-05-05',
  category: 'API Testing',
  content: `
# Tavern pytest API Testing Complete Guide 2026

Tavern is a pytest plugin that lets you write API tests as YAML files instead of Python code. The YAML syntax is concise, readable, and approachable for non-developers, while running on top of pytest gives you the full power of fixtures, parametrize, plugins, and CI integration. Tavern supports HTTP (REST), MQTT for IoT scenarios, and arbitrary protocols via plugins. For Python teams that want BDD-style readability without abandoning pytest, Tavern is one of the strongest options in the ecosystem.

This complete guide covers Tavern in 2026: installation alongside pytest, writing YAML test files, handling authentication and dynamic data, JSON Schema validation, parametrize and fixtures, MQTT integration for IoT testing, plugins for extending Tavern's capabilities, and CI integration. Real test files cover REST CRUD operations, OAuth flows, file uploads, and webhook validation. By the end you'll have the patterns needed to evaluate and adopt Tavern for your own Python team.

## Key Takeaways

- Tavern is a pytest plugin for declarative API testing
- Tests are written as YAML files - readable and concise
- Supports REST, MQTT, and arbitrary protocols via plugins
- Leverages pytest fixtures, parametrize, and CI integration
- Built-in JSON Schema validation
- Stages can save variables and pass them between requests
- Best for Python teams who like pytest but want simpler test files

---

## Installation

\`\`\`bash
pip install tavern
\`\`\`

For MQTT:

\`\`\`bash
pip install tavern[mqtt]
\`\`\`

## Basic Test File

\`\`\`yaml
# test_minimal.tavern.yaml
test_name: Get user 42

stages:
  - name: Get user 42
    request:
      url: https://api.example.com/users/42
      method: GET
    response:
      status_code: 200
      json:
        id: 42
        name: !anystr
\`\`\`

Run with pytest:

\`\`\`bash
pytest test_minimal.tavern.yaml
\`\`\`

## File Naming Convention

Tavern files must end with .tavern.yaml. Pytest auto-discovers them.

## Multi-Stage Tests

\`\`\`yaml
test_name: Create then get user

stages:
  - name: Create user
    request:
      url: https://api.example.com/users
      method: POST
      json:
        name: Alice
        email: alice@example.com
    response:
      status_code: 201
      save:
        json:
          user_id: id

  - name: Get the created user
    request:
      url: https://api.example.com/users/{user_id}
      method: GET
    response:
      status_code: 200
      json:
        id: !int "{user_id}"
        name: Alice
\`\`\`

The save block captures fields from one response for use in later stages.

## Variables

\`\`\`yaml
# common.yaml
name: Common variables
variables:
  base_url: https://api.example.com
  api_key: !env API_KEY
\`\`\`

\`\`\`yaml
# test_users.tavern.yaml
test_name: Users tests

includes:
  - !include common.yaml

stages:
  - name: Get user
    request:
      url: "{base_url}/users/42"
      headers:
        X-API-Key: "{api_key}"
\`\`\`

## Type Matchers

| Matcher | Purpose |
|---------|---------|
| !anything | Any value |
| !anybool | Any boolean |
| !anyint | Any integer |
| !anyfloat | Any float |
| !anystr | Any string |
| !anylist | Any list |
| !anydict | Any dict |
| !re "pattern" | Regex |

\`\`\`yaml
response:
  json:
    id: !anyint
    email: !re ".+@.+\\\\..+"
    tags: !anylist
\`\`\`

## Authentication

### Bearer Token

\`\`\`yaml
test_name: Authenticated request

stages:
  - name: Login
    request:
      url: "{base_url}/auth/login"
      method: POST
      json:
        email: test@example.com
        password: secret
    response:
      status_code: 200
      save:
        json:
          token: access_token

  - name: Use token
    request:
      url: "{base_url}/me"
      method: GET
      headers:
        Authorization: "Bearer {token}"
    response:
      status_code: 200
\`\`\`

### Basic Auth

\`\`\`yaml
request:
  url: "{base_url}/admin"
  method: GET
  auth:
    - user
    - pass
\`\`\`

## JSON Schema Validation

\`\`\`yaml
test_name: Validate against schema

stages:
  - name: Get user
    request:
      url: "{base_url}/users/42"
      method: GET
    response:
      status_code: 200
      verify_response_with:
        - function: tavern.helpers:validate_pykwalify
          extra_kwargs:
            schema:
              type: map
              mapping:
                id:
                  type: int
                  required: true
                name:
                  type: str
                  required: true
                email:
                  type: str
                  required: true
                  pattern: ".+@.+"
\`\`\`

## Pytest Fixtures

Tavern integrates with pytest fixtures:

\`\`\`python
# conftest.py
import pytest

@pytest.fixture(scope='session')
def auth_token():
    import requests
    response = requests.post(
        'https://api.example.com/auth/login',
        json={'email': 'test@example.com', 'password': 'secret'},
    )
    return response.json()['access_token']
\`\`\`

\`\`\`yaml
test_name: Use fixture

stages:
  - name: Request with token
    request:
      url: "{base_url}/me"
      method: GET
      headers:
        Authorization: "Bearer {auth_token}"
    response:
      status_code: 200
\`\`\`

## Parametrize

\`\`\`yaml
test_name: Parametrize across users

marks:
  - parametrize:
      key: user_id
      vals:
        - 1
        - 2
        - 42

stages:
  - name: Get user
    request:
      url: "{base_url}/users/{user_id}"
      method: GET
    response:
      status_code: 200
\`\`\`

Pytest creates 3 separate tests.

## Marks

\`\`\`yaml
test_name: Smoke test
marks:
  - smoke
\`\`\`

\`\`\`bash
pytest -m smoke
\`\`\`

## MQTT Support

For IoT applications:

\`\`\`yaml
test_name: Pub-sub flow

paho-mqtt: &mqtt_spec
  client:
    transport: tcp
    client_id: tavern-tester
  connect:
    host: mqtt.example.com
    port: 1883

stages:
  - name: Publish message
    mqtt_publish:
      topic: /sensors/temp
      payload: '{"value": 25}'
      qos: 1
    mqtt_response:
      topic: /sensors/temp
      payload: '{"value": 25}'
      timeout: 3
\`\`\`

## External Functions

Run Python code to set up data:

\`\`\`yaml
stages:
  - name: Verify with function
    request:
      url: "{base_url}/orders/42"
      method: GET
    response:
      status_code: 200
      verify_response_with:
        - function: my_helpers:validate_order
\`\`\`

\`\`\`python
# my_helpers.py
def validate_order(response, **kwargs):
    body = response.json()
    assert 'id' in body
    assert body['status'] in ['pending', 'processed', 'cancelled']
\`\`\`

## File Upload

\`\`\`yaml
stages:
  - name: Upload file
    request:
      url: "{base_url}/uploads"
      method: POST
      files:
        file: /path/to/test.csv
    response:
      status_code: 201
\`\`\`

## CI Integration

\`\`\`yaml
name: API Tests with Tavern
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install tavern pytest-html
      - run: pytest --html=results/report.html
        env:
          API_KEY: \${{ secrets.API_KEY }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: results
          path: results/
\`\`\`

## Comparison To Alternatives

| Tool | Style | Language |
|------|-------|----------|
| Tavern | YAML + pytest | Python |
| Robot Framework + RequestsLibrary | Keyword | Python |
| Karate | Gherkin | JVM |
| REST Assured | Java DSL | Java |
| SuperTest | JS code | Node |

## Performance Patterns

| Pattern | Benefit |
|---------|---------|
| Reuse session fixture | Connection reuse |
| Pytest-xdist parallel | Faster CI |
| Skip slow tests | Fast PR builds |
| Cache pytest deps | Faster startup |

## Real Suite Example

\`\`\`yaml
# tests/test_orders.tavern.yaml

test_name: Order lifecycle

includes:
  - !include common.yaml

marks:
  - smoke

stages:
  - name: Create order
    request:
      url: "{base_url}/orders"
      method: POST
      headers:
        Authorization: "Bearer {auth_token}"
      json:
        sku: ABC123
        quantity: 2
    response:
      status_code: 201
      save:
        json:
          order_id: id
      json:
        id: !anyint
        status: pending
        sku: ABC123
        quantity: 2

  - name: Get created order
    request:
      url: "{base_url}/orders/{order_id}"
      method: GET
      headers:
        Authorization: "Bearer {auth_token}"
    response:
      status_code: 200
      json:
        id: !int "{order_id}"
        status: pending

  - name: Cancel order
    request:
      url: "{base_url}/orders/{order_id}"
      method: DELETE
      headers:
        Authorization: "Bearer {auth_token}"
    response:
      status_code: 204

  - name: Verify cancellation
    request:
      url: "{base_url}/orders/{order_id}"
      method: GET
      headers:
        Authorization: "Bearer {auth_token}"
    response:
      status_code: 200
      json:
        status: cancelled
\`\`\`

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| One huge test_*.tavern.yaml | Split by domain |
| Hardcoded URLs | Use variables and includes |
| No type matchers | Use !anyint, !anystr |
| Embedded credentials | !env for env vars |
| No marks | Mark for selective runs |

## Plugins

Tavern has a plugin architecture. Examples:
- tavern-grpc for gRPC services
- tavern-kafka for Kafka topic tests
- tavern-aws for AWS API testing

## Conclusion

Tavern brings YAML-based readability to pytest-driven API testing. The combination of declarative test files, pytest's rich plugin ecosystem, and Python's flexibility produces a workflow that's both approachable and powerful. For Python teams looking for an alternative to code-heavy frameworks like SuperTest or REST Assured (Java), Tavern is well worth evaluating.

Start by writing one Tavern file for a single endpoint. Add stages for create, get, update, delete. Layer in fixtures, parametrize, and marks. Within a sprint you'll have a fast, readable API test suite running in pytest. Visit our [skills directory](/skills) or the [pytest testing complete guide](/blog/pytest-testing-complete-guide) for related patterns.
`,
};
