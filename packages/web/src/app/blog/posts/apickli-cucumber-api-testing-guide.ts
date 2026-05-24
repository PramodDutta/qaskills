import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Apickli Cucumber API Testing Complete Guide 2026',
  description:
    'Test APIs with Apickli and Cucumber.js. BDD scenarios, JSON path validation, authentication, custom step definitions, parallel execution, and CI integration.',
  date: '2026-05-19',
  category: 'API Testing',
  content: `
# Apickli Cucumber API Testing Complete Guide 2026

Apickli is a Cucumber.js framework for API testing that brings Gherkin-style scenarios to JavaScript/Node.js teams. It ships with prebuilt step definitions covering HTTP requests, JSON validation, authentication, and response assertions, so you can write BDD-style API tests without manually defining each step. This complete guide covers every aspect of Apickli in 2026: setup, Gherkin patterns, fixtures, parallel execution, and CI integration.

For teams that want BDD readability in their API tests but prefer JavaScript over Java (where Karate dominates), Apickli is one of the strongest options. It combines Cucumber.js for the Gherkin runtime, a fluent API client for HTTP, and a comprehensive library of pre-written step definitions for common assertions. The result is a test suite that reads like spec documents to product managers while running as fast tests in CI. By the end of this guide you'll be ready to evaluate and adopt Apickli for your own Node.js team.

## Key Takeaways

- Apickli provides Cucumber.js step definitions for HTTP and JSON
- Tests are written in Gherkin, executable by Cucumber.js
- Built-in support for headers, body, JSONPath, regex assertions
- Easy to extend with custom step definitions
- Composes naturally with Cucumber's hooks and tags
- Reports use Cucumber's HTML/JSON formatters
- Best for teams comfortable with Gherkin who want code-driven tests in JS

---

## Installation

\`\`\`bash
npm install --save-dev apickli @cucumber/cucumber
\`\`\`

Create project structure:

\`\`\`
features/
  users.feature
  auth.feature
  step_definitions/
    apickli-steps.js
support/
  hooks.js
  world.js
cucumber.js
\`\`\`

## World And Step Definitions

\`\`\`javascript
// support/world.js
const { setWorldConstructor } = require('@cucumber/cucumber');
const Apickli = require('apickli');

class CustomWorld {
  constructor() {
    this.apickli = new Apickli.Apickli('https', 'api.example.com');
  }
}

setWorldConstructor(CustomWorld);
\`\`\`

\`\`\`javascript
// features/step_definitions/apickli-steps.js
require('apickli/apickli-gherkin');
\`\`\`

This single line loads all of Apickli's built-in step definitions.

## Basic Feature

\`\`\`gherkin
Feature: Get user

Scenario: Get user 1 returns 200
  Given I set Accept header to application/json
  When I GET /users/1
  Then response code should be 200
  And response body path $.id should be 1
  And response body path $.name should be Alice
\`\`\`

Run with:

\`\`\`bash
npx cucumber-js
\`\`\`

## Built-In Steps

### Setting Headers

\`\`\`gherkin
Given I set Accept header to application/json
Given I set Content-Type header to application/json
Given I set Authorization header to Bearer abc123
\`\`\`

### Setting Body

\`\`\`gherkin
Given I set body to {"name": "Alice", "email": "alice@example.com"}

# Or from file
Given I pipe contents of file fixtures/user.json to body
\`\`\`

### Making Requests

\`\`\`gherkin
When I GET /users
When I POST to /users
When I PUT /users/1
When I DELETE /users/1
When I PATCH /users/1
\`\`\`

### Asserting Status

\`\`\`gherkin
Then response code should be 200
Then response code should not be 500
\`\`\`

### Asserting Body

\`\`\`gherkin
Then response body should contain Alice
Then response body should not contain error
Then response body path $.users.length should be 10
Then response body path $.user.email should be alice@example.com
Then response body path $.created_at should match \\d{4}-\\d{2}-\\d{2}
\`\`\`

### Asserting Headers

\`\`\`gherkin
Then response header Content-Type should be application/json; charset=utf-8
Then response header X-RateLimit-Remaining should exist
\`\`\`

## Variables And Storage

\`\`\`gherkin
Scenario: Create then get user
  Given I set body to {"name": "Bob"}
  When I POST to /users
  Then response code should be 201
  And I store the value of body path $.id as user_id in scenario scope
  When I GET /users/\`user_id\`
  Then response code should be 200
\`\`\`

The backtick syntax substitutes variable values.

## Authentication

### Bearer Token

\`\`\`gherkin
Background:
  Given I set Authorization header to Bearer abc123

Scenario: Get me
  When I GET /me
  Then response code should be 200
\`\`\`

### Basic Auth

\`\`\`gherkin
Given I set basic authentication credentials to user and pass
\`\`\`

### Login Helper

\`\`\`gherkin
Scenario: Login flow
  Given I set body to {"email": "test@example.com", "password": "secret"}
  When I POST to /auth/login
  Then response code should be 200
  And I store the value of body path $.access_token as token in global scope

Scenario: Use stored token
  Given I set Authorization header to Bearer \`token\`
  When I GET /me
  Then response code should be 200
\`\`\`

## File Uploads

Define a custom step:

\`\`\`javascript
const { When } = require('@cucumber/cucumber');
const fs = require('fs');

When('I upload {string} to {string}', async function (filepath, endpoint) {
  this.apickli.addRequestHeader('Content-Type', 'multipart/form-data');
  this.apickli.setRequestBody(fs.readFileSync(filepath));
  await this.apickli.post(endpoint);
});
\`\`\`

\`\`\`gherkin
Scenario: Upload file
  When I upload "fixtures/test.csv" to "/uploads"
  Then response code should be 201
\`\`\`

## JSON Schema Validation

\`\`\`bash
npm install --save-dev ajv
\`\`\`

\`\`\`javascript
const { Then } = require('@cucumber/cucumber');
const Ajv = require('ajv');
const fs = require('fs');

const ajv = new Ajv();

Then('response body matches schema {string}', function (schemaPath) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const body = JSON.parse(this.apickli.httpResponse.body);
  const validate = ajv.compile(schema);
  if (!validate(body)) {
    throw new Error(JSON.stringify(validate.errors, null, 2));
  }
});
\`\`\`

\`\`\`gherkin
Scenario: User schema
  When I GET /users/1
  Then response code should be 200
  And response body matches schema "schemas/user.json"
\`\`\`

## Tags

\`\`\`gherkin
@smoke @auth
Scenario: Login flow
  ...

@regression
Scenario: Full user lifecycle
  ...
\`\`\`

\`\`\`bash
# Only smoke
npx cucumber-js --tags "@smoke"

# Smoke or auth
npx cucumber-js --tags "@smoke or @auth"

# Not slow
npx cucumber-js --tags "not @slow"
\`\`\`

## Hooks

\`\`\`javascript
// support/hooks.js
const { Before, After, BeforeAll, AfterAll } = require('@cucumber/cucumber');

BeforeAll(async function () {
  console.log('Starting test run');
});

Before({ tags: '@auth' }, async function () {
  this.apickli.setRequestHeader('Authorization', 'Bearer ' + process.env.TEST_TOKEN);
});

After(async function () {
  console.log('Last request status:', this.apickli.httpResponse.statusCode);
});

AfterAll(async function () {
  console.log('Test run complete');
});
\`\`\`

## Data Tables

\`\`\`gherkin
Scenario: Create users from table
  Given I set Content-Type header to application/json
  When I create users
    | name  | email             |
    | Alice | alice@example.com |
    | Bob   | bob@example.com   |
    | Carol | carol@example.com |
  Then response code should be 201
\`\`\`

\`\`\`javascript
const { When } = require('@cucumber/cucumber');

When('I create users', async function (dataTable) {
  const users = dataTable.hashes();
  for (const user of users) {
    this.apickli.setRequestBody(JSON.stringify(user));
    await this.apickli.post('/users');
  }
});
\`\`\`

## Scenario Outline

\`\`\`gherkin
Scenario Outline: Login with various credentials
  Given I set body to {"email": "<email>", "password": "<password>"}
  When I POST to /auth/login
  Then response code should be <status>

Examples:
  | email           | password | status |
  | test@a.com      | secret   | 200    |
  | test@a.com      | wrong    | 401    |
  | bad-email       | secret   | 400    |
\`\`\`

## Parallel Execution

\`\`\`bash
npx cucumber-js --parallel 4
\`\`\`

Each feature runs in a separate process, with its own world.

## Cucumber Config

\`\`\`javascript
// cucumber.js
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['support/**/*.js', 'features/step_definitions/**/*.js'],
    format: [
      'progress-bar',
      'html:reports/cucumber.html',
      'json:reports/cucumber.json',
    ],
    parallel: 4,
  },
};
\`\`\`

## Real Suite Example

\`\`\`gherkin
Feature: Orders API

Background:
  Given I set Accept header to application/json
  And I set Authorization header to Bearer \`token\`

@smoke @orders
Scenario: Create order returns 201
  Given I set body to {"sku": "ABC123", "quantity": 2}
  When I POST to /orders
  Then response code should be 201
  And response body path $.id should match \\d+
  And response body matches schema "schemas/order.json"
  And I store the value of body path $.id as order_id in scenario scope

@smoke @orders
Scenario: Get created order
  When I GET /orders/\`order_id\`
  Then response code should be 200
  And response body path $.status should be pending

@regression @orders
Scenario Outline: Order validation
  Given I set body to <body>
  When I POST to /orders
  Then response code should be <status>

Examples:
  | body                            | status |
  | {"sku": "ABC", "quantity": 1}   | 201    |
  | {"sku": "ABC"}                  | 400    |
  | {"quantity": 1}                 | 400    |
  | {"sku": "", "quantity": 1}      | 400    |
\`\`\`

## CI Integration

\`\`\`yaml
name: Apickli Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx cucumber-js --tags "@smoke"
        env:
          API_TOKEN: \${{ secrets.API_TOKEN }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: cucumber-reports
          path: reports/
\`\`\`

## Comparison To Alternatives

| Tool | Language | Style | Best For |
|------|----------|-------|----------|
| Apickli | JS | BDD Gherkin | Mixed dev/QA Node teams |
| Karate | Java | DSL | JVM, batteries included |
| SuperTest | JS | Code | Pure dev workflows |
| Postman/Newman | JS | GUI | Manual + automation |

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| Long Gherkin scenarios | Keep < 10 steps |
| Hardcoded URLs | Pass via env or world |
| Skipping schema validation | Always validate against schema |
| Mixed tests + setup data | Use Before hooks for setup |
| No tags | Tag for selective runs |

## Conclusion

Apickli brings BDD-style API testing to Node.js teams with minimal setup. The combination of Cucumber's familiar Gherkin syntax, Apickli's built-in step library, and JavaScript's flexibility produces test suites that are both readable and powerful. For mixed teams or organizations that value spec-style documentation, it's a strong alternative to lower-level libraries like SuperTest.

Start by writing one feature file for a single endpoint - get, post, and a validation case. Add a Background for auth and a few schemas. Layer in tags and parallelism. Within a few sprints you'll have an Apickli suite that runs in CI on every PR. Explore our [skills directory](/skills) or the [BDD Cucumber testing guide](/blog/bdd-cucumber-testing-guide) for related patterns.
`,
};
