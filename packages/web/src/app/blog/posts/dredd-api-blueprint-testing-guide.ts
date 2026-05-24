import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Dredd API Blueprint and OpenAPI Testing Complete Guide',
  description:
    'Test APIs against API Blueprint or OpenAPI with Dredd. Setup, hooks, transaction modification, examples validation, and CI integration patterns.',
  date: '2026-05-04',
  category: 'API Testing',
  content: `
# Dredd API Blueprint and OpenAPI Testing Complete Guide

Dredd is a command-line testing tool that reads your API documentation (API Blueprint or OpenAPI) and verifies that your real API implementation matches the documented examples. Unlike code-based contract testing tools, Dredd treats your docs as the source of truth - if your API doc says GET /users/42 returns a particular JSON response, Dredd makes that exact request and asserts the response matches. This makes it especially valuable for teams that practice API-first design, where the docs drive both the implementation and the tests.

This complete guide walks through using Dredd in 2026: installing it via npm, writing API Blueprint or OpenAPI files with examples, running Dredd against a local or staging API, customizing requests with hooks, handling authentication and dynamic data, and integrating into CI/CD pipelines. By the end you'll have everything you need to use Dredd to keep your API and its documentation in lockstep.

## Key Takeaways

- Dredd validates API behavior against API Blueprint or OpenAPI examples
- Treats documentation as the source of truth
- Hooks let you customize request data and state setup
- Supports authentication, dynamic data, and skip patterns
- Compatible with API Blueprint and OpenAPI 2/3
- Easy CI integration via Docker or npm
- Best for API-first projects with detailed examples in docs

---

## Installation

\`\`\`bash
npm install --global dredd
\`\`\`

Or as a dev dependency:

\`\`\`bash
npm install --save-dev dredd
\`\`\`

## Basic Usage With OpenAPI

\`\`\`bash
dredd openapi.yaml http://localhost:3000
\`\`\`

Dredd parses your OpenAPI document, finds every endpoint with example responses, hits your API at localhost:3000, and verifies each example matches what your API returns.

## Sample OpenAPI With Examples

\`\`\`yaml
openapi: 3.0.0
info:
  title: Users API
  version: 1.0.0
servers:
  - url: http://localhost:3000
paths:
  /users/42:
    get:
      summary: Get user 42
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  id: {type: integer}
                  name: {type: string}
              example:
                id: 42
                name: Alice
\`\`\`

When Dredd runs, it issues GET /users/42 and verifies the response matches the example.

## API Blueprint

API Blueprint is the older format. Sample:

\`\`\`apib
# API
## /users/{id}
### GET
+ Response 200 (application/json)
    {
      "id": 42,
      "name": "Alice"
    }
\`\`\`

\`\`\`bash
dredd api.apib http://localhost:3000
\`\`\`

## Hooks

For complex scenarios, use hooks to modify requests, set up data, or skip transactions:

\`\`\`javascript
// dredd-hooks.js
const hooks = require('hooks');

hooks.before('Users > GET /users/{id} > 200 > application/json', (transaction, done) => {
  transaction.request.uri = transaction.request.uri.replace('{id}', '42');
  done();
});

hooks.before('Orders > POST /orders > 201 > application/json', async (transaction, done) => {
  // Get auth token
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    body: JSON.stringify({email: 'test@example.com', password: 'secret'}),
  });
  const data = await response.json();
  transaction.request.headers['Authorization'] = \`Bearer \${data.token}\`;
  done();
});
\`\`\`

\`\`\`bash
dredd openapi.yaml http://localhost:3000 --hookfiles=./dredd-hooks.js
\`\`\`

## Hook Types

| Hook | When |
|------|------|
| beforeAll | Once before all transactions |
| beforeEach | Before each transaction |
| before(name) | Before specific transaction |
| beforeValidation(name) | After request, before response validation |
| after(name) | After specific transaction |
| afterEach | After each transaction |
| afterAll | Once after all transactions |

## Skipping Transactions

\`\`\`javascript
hooks.before('Users > DELETE /users/{id} > 204', (transaction) => {
  transaction.skip = true;
});
\`\`\`

## Authentication

\`\`\`javascript
let token = null;

hooks.beforeAll(async (transactions, done) => {
  const res = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    body: JSON.stringify({email: 'test@example.com', password: 'secret'}),
    headers: {'Content-Type': 'application/json'},
  });
  const data = await res.json();
  token = data.access_token;
  done();
});

hooks.beforeEach((transaction, done) => {
  transaction.request.headers['Authorization'] = \`Bearer \${token}\`;
  done();
});
\`\`\`

## Setting Dynamic Data

\`\`\`javascript
let createdUserId = null;

hooks.after('Users > POST /users > 201', (transaction) => {
  const body = JSON.parse(transaction.real.body);
  createdUserId = body.id;
});

hooks.before('Users > GET /users/{id} > 200', (transaction) => {
  transaction.request.uri = transaction.request.uri.replace('{id}', createdUserId);
});
\`\`\`

## Reporters

\`\`\`bash
# Console (default)
dredd openapi.yaml http://localhost:3000

# JUnit XML
dredd openapi.yaml http://localhost:3000 --reporter=xunit --output=results.xml

# HTML
dredd openapi.yaml http://localhost:3000 --reporter=html --output=results.html

# Markdown
dredd openapi.yaml http://localhost:3000 --reporter=markdown --output=results.md
\`\`\`

Multiple reporters can run together.

## Configuration File

\`\`\`yaml
# dredd.yml
dry-run: null
hookfiles: './dredd-hooks.js'
language: 'nodejs'
sandbox: false
server: 'npm start'
server-wait: 5
init: false
custom: {}
names: false
only: []
reporter: ['xunit', 'html']
output: ['results.xml', 'results.html']
header: []
sorted: false
user: null
inline-errors: false
details: false
method: []
loglevel: 'warning'
path: []
hooks-worker-timeout: 5000
hooks-worker-connect-timeout: 1500
hooks-worker-connect-retry: 500
hooks-worker-after-connect-wait: 100
hooks-worker-term-timeout: 5000
hooks-worker-term-retry: 500
hooks-worker-handler-host: '127.0.0.1'
hooks-worker-handler-port: 61321
endpoint: 'http://localhost:3000'
\`\`\`

Then just run \`dredd\`.

## CI Integration

\`\`\`yaml
name: API Tests with Dredd
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm install -g dredd
      - run: npm start &
      - run: sleep 5
      - run: dredd openapi.yaml http://localhost:3000 --reporter=xunit --output=dredd-results.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: dredd-results
          path: dredd-results.xml
\`\`\`

## Docker

\`\`\`bash
docker run -v $(pwd):/api -w /api apiaryio/dredd:14 dredd openapi.yaml http://host.docker.internal:3000
\`\`\`

## Sandboxed Hooks

For untrusted hooks (e.g., from contributors), use sandbox mode:

\`\`\`bash
dredd openapi.yaml http://localhost:3000 --hookfiles=./hooks.js --sandbox
\`\`\`

The hooks run in a sandboxed environment with restricted access.

## Comparison To Alternatives

| Tool | Approach | Best For |
|------|----------|----------|
| Dredd | Docs as source of truth | API-first design |
| jest-openapi | Spec validation in tests | Existing test suites |
| Schemathesis | Property-based fuzzing | Catching edge cases |
| Pact | Consumer-driven contracts | Microservices |
| Spring Cloud Contract | Provider-driven contracts | Spring Boot |

## Real Workflow

A team practicing API-first design:

1. Product/eng meet to define API endpoint
2. Designer writes OpenAPI spec with examples
3. Frontend uses Prism mock from spec
4. Backend implements endpoint
5. Backend runs Dredd locally to verify
6. CI runs Dredd on every PR
7. Spec updates trigger Dredd re-run
8. Spec published to docs site

This keeps the spec, code, and documentation perfectly aligned.

## Limitations

Dredd works best with:
- Endpoints that have well-defined, deterministic responses
- Examples that match real data structure
- Sequential transaction flow (or proper hooks)

It struggles with:
- Pagination/cursors (need hooks)
- Time-sensitive data (need before validation)
- Multi-step workflows (need state management)
- Async/eventual consistency

For these, combine with other tools.

## Real Suite Example

A simple REST API:

\`\`\`yaml
openapi: 3.0.0
info:
  title: Tasks API
  version: 1.0.0
servers:
  - url: http://localhost:3000

paths:
  /tasks:
    get:
      summary: List tasks
      responses:
        '200':
          content:
            application/json:
              example:
                - id: 1
                  title: First task
                  completed: false

    post:
      summary: Create task
      requestBody:
        content:
          application/json:
            example:
              title: New task
              completed: false
      responses:
        '201':
          content:
            application/json:
              example:
                id: 2
                title: New task
                completed: false

  /tasks/{id}:
    get:
      summary: Get task
      parameters:
        - name: id
          in: path
          schema:
            type: integer
          required: true
      responses:
        '200':
          content:
            application/json:
              example:
                id: 1
                title: First task
                completed: false
\`\`\`

\`\`\`javascript
// dredd-hooks.js
const hooks = require('hooks');

hooks.before('Tasks > GET /tasks/{id} > 200 > application/json', (transaction, done) => {
  transaction.request.uri = transaction.request.uri.replace('{id}', '1');
  done();
});

hooks.before('Tasks > POST /tasks > 201 > application/json', (transaction, done) => {
  // Maybe set headers for auth
  transaction.request.headers['X-API-Key'] = 'test-key';
  done();
});
\`\`\`

\`\`\`bash
dredd openapi.yaml http://localhost:3000 --hookfiles=./dredd-hooks.js
\`\`\`

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| No examples in spec | Add examples for every endpoint |
| Static IDs in examples | Use hooks for dynamic IDs |
| Skip on production | Run against staging |
| One mega hook file | Split by domain |
| No reporter | Use xunit for CI consumption |

## Maintenance Tips

Keep your spec up to date as the API evolves. Treat spec changes as code changes - PR review, CI gates, deployment alongside the implementation. When Dredd fails in CI, the response is either:

1. Bug in the code - fix the code
2. Bug in the spec - fix the spec
3. Intentional spec change - update examples + the spec

There should be no fourth option.

## Conclusion

Dredd is a focused tool that does one thing well: verify your real API matches its documented examples. For teams practicing API-first design or maintaining detailed OpenAPI docs, it provides a strong safety net at zero cost. Combined with linting (Spectral), runtime validation (jest-openapi), and consumer-driven contracts (Pact), Dredd completes a layered approach to API quality where every aspect of behavior is checked from multiple angles.

Start by ensuring your OpenAPI spec has good examples. Run Dredd against your local API. Add a hook file for auth and dynamic IDs. Wire it into CI. Within a sprint you'll have a contract-enforcing test suite that runs in seconds. Visit our [skills directory](/skills) or the [OpenAPI spec validation guide](/blog/swagger-openapi-spec-validation-guide) for related approaches.
`,
};
