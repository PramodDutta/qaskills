import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Karate DSL BDD API Testing Complete Guide 2026',
  description:
    'Complete guide to Karate DSL for BDD API testing. Setup, Gherkin syntax, JSON validation, authentication, mocks, GraphQL, performance testing, and CI integration.',
  date: '2026-05-17',
  category: 'API Testing',
  content: `
# Karate DSL BDD API Testing Complete Guide 2026

Karate is one of the most unique API testing frameworks in the JVM ecosystem. Instead of providing a Java library that you call from JUnit tests, Karate is a domain-specific language built on top of Cucumber's Gherkin syntax. You write tests as .feature files with Given/When/Then steps, and Karate's runtime handles HTTP, JSON validation, mocking, performance testing, and even UI testing. The result is concise, readable, and approachable for both developers and non-developers - a rare combination in the API testing space.

This complete guide walks through every aspect of Karate in 2026: project setup, the DSL syntax, JSON path expressions and match patterns, authentication, file uploads, GraphQL, mock servers, parallel execution, Gatling integration, and CI/CD wiring. Real code examples cover REST CRUD operations, OAuth flows, contract testing, and end-to-end microservices scenarios. By the end you'll be ready to evaluate Karate for your team and adopt it if it fits.

## Key Takeaways

- Karate is a self-contained BDD framework for APIs
- Uses Gherkin-style syntax that reads like English
- Built-in JSON path, schema matching, regex, and array predicates
- Includes a mock server (Karate Mock) for service virtualization
- Karate Gatling reuses feature files for performance tests
- Built-in parallel execution
- Tests live alongside your codebase, run via Maven or Gradle

---

## Installation

Add to your Maven pom.xml:

\`\`\`xml
<dependency>
  <groupId>com.intuit.karate</groupId>
  <artifactId>karate-junit5</artifactId>
  <version>1.4.1</version>
  <scope>test</scope>
</dependency>
\`\`\`

## Hello World

\`\`\`gherkin
Feature: Get user

Scenario: Get user 1
  Given url 'https://api.example.com/users/1'
  When method get
  Then status 200
  And match response.id == 1
\`\`\`

Run with: \`mvn test\`

## Project Structure

\`\`\`
src/test/java/
  com/example/
    UsersTest.java
  com/example/users/
    users.feature
    login.feature
\`\`\`

\`\`\`java
package com.example;

import com.intuit.karate.junit5.Karate;

class UsersTest {
    @Karate.Test
    Karate testAll() {
        return Karate.run().relativeTo(getClass());
    }
}
\`\`\`

## Backgrounds

\`\`\`gherkin
Feature: Users API

Background:
  * url 'https://api.example.com'
  * header Authorization = 'Bearer ' + token

Scenario: Create user
  Given path 'users'
  And request { name: 'Alice', email: 'alice@example.com' }
  When method post
  Then status 201

Scenario: Get user
  Given path 'users', 1
  When method get
  Then status 200
\`\`\`

The Background runs before every Scenario.

## HTTP Methods

| Method | Karate |
|--------|--------|
| GET | When method get |
| POST | When method post |
| PUT | When method put |
| PATCH | When method patch |
| DELETE | When method delete |
| HEAD | When method head |

## Path And Params

\`\`\`gherkin
Given path 'users', 42, 'orders'
And param limit = 10
And param sort = 'created_at'
When method get
\`\`\`

Becomes: GET /users/42/orders?limit=10&sort=created_at

## Headers

\`\`\`gherkin
Given header X-API-Key = 'secret-key'
And header Content-Type = 'application/json'
\`\`\`

Or in Background for all scenarios:

\`\`\`gherkin
Background:
  * configure headers = { Authorization: 'Bearer token' }
\`\`\`

## Request Body

JSON:

\`\`\`gherkin
Given request { name: 'Alice', email: 'alice@example.com' }
\`\`\`

Multiline:

\`\`\`gherkin
Given request
"""
{
  "name": "Alice",
  "email": "alice@example.com",
  "tags": ["admin", "developer"]
}
"""
\`\`\`

From file:

\`\`\`gherkin
Given request read('classpath:fixtures/user.json')
\`\`\`

## Response Assertions

Status:

\`\`\`gherkin
Then status 201
\`\`\`

Header:

\`\`\`gherkin
And match responseHeaders.Content-Type[0] contains 'application/json'
\`\`\`

JSON body matchers:

\`\`\`gherkin
And match response.id == '#notnull'
And match response.name == 'Alice'
And match response.email == '#regex .+@example\\\\.com'
And match response.created_at == '#string'
And match response.tags == ['admin', 'developer']
And match response.tags == '#[2]'
\`\`\`

## Match Patterns

| Pattern | Purpose |
|---------|---------|
| #string | Any string |
| #number | Any number |
| #integer | Any integer |
| #boolean | Any boolean |
| #notnull | Not null |
| #null | Null |
| #present | Field exists |
| #notpresent | Field absent |
| #array | Any array |
| #object | Any object |
| #uuid | UUID string |
| #regex pattern | Regex match |
| #[N] | Array of size N |
| #[N > 0] | Array with N items > 0 |
| #(expr) | Embedded expression |

## Fuzzy Match

\`\`\`gherkin
And match response contains { id: '#notnull', name: 'Alice' }
\`\`\`

This passes as long as id is not null and name is Alice, regardless of other fields.

## Reusable Functions

\`\`\`gherkin
Background:
  * def login =
  """
  function() {
    var resp = karate.call('classpath:auth/login.feature');
    return resp.token;
  }
  """
  * def token = login()
\`\`\`

## Auth Helper Feature

login.feature:

\`\`\`gherkin
Feature: Login

Scenario:
  Given url baseUrl + '/auth/login'
  And request { email: 'test@example.com', password: 'secret' }
  When method post
  Then status 200
  * def token = response.access_token
\`\`\`

Called from another feature:

\`\`\`gherkin
Background:
  * def loginResp = call read('classpath:auth/login.feature')
  * header Authorization = 'Bearer ' + loginResp.token
\`\`\`

## Files

\`\`\`gherkin
Given multipart file myFile = { read: 'file:/tmp/upload.csv', filename: 'data.csv', contentType: 'text/csv' }
When method post
Then status 201
\`\`\`

## GraphQL

\`\`\`gherkin
Scenario: Get users via GraphQL
  Given path 'graphql'
  And request
  """
  { "query": "{ users(limit: 10) { id name email } }" }
  """
  When method post
  Then status 200
  And match response.data.users == '#[10]'
\`\`\`

## Mock Server

mock.feature:

\`\`\`gherkin
Feature: User service mock

Scenario: pathMatches('/users') && methodIs('get')
  * def response = [{ id: 1, name: 'Mock' }]
  * def responseStatus = 200

Scenario: pathMatches('/users/(.+)') && methodIs('get')
  * def id = pathParams[0]
  * def response = { id: '#(id)', name: 'Mock User' }
\`\`\`

Run:

\`\`\`bash
java -jar karate.jar -m mock.feature -p 8080
\`\`\`

## Performance Testing With Gatling

\`\`\`scala
import com.intuit.karate.gatling.PreDef._
import io.gatling.core.Predef._
import scala.concurrent.duration._

class UsersSimulation extends Simulation {
  val protocol = karateProtocol("/users/{id}" -> Nil, "/users" -> Nil)

  val getUsers = scenario("GetUsers")
    .exec(karateFeature("classpath:users/users.feature@smoke"))

  setUp(
    getUsers.inject(rampUsers(100) during (30 seconds))
  ).protocols(protocol)
}
\`\`\`

## Parallel Execution

\`\`\`java
@Test
void runAll() {
    Results results = Runner.path("classpath:features")
        .tags("@smoke")
        .parallel(8);
    assertEquals(0, results.getFailCount());
}
\`\`\`

## Tags

\`\`\`gherkin
@smoke @auth
Scenario: Login flow
  ...

@regression @slow
Scenario: Bulk import
  ...
\`\`\`

Run only smoke:

\`\`\`java
Results results = Runner.path("classpath:features")
    .tags("@smoke")
    .parallel(8);
\`\`\`

## Loops And Conditional Logic

\`\`\`gherkin
Scenario: Verify each user has email
  Given path 'users'
  When method get
  Then status 200
  * def users = response.users
  * eval karate.forEach(users, function(u) { karate.match(u.email, '#regex .+@.+') })
\`\`\`

## Data Driven

\`\`\`gherkin
Scenario Outline: Login with various credentials
  Given path 'auth/login'
  And request { email: '<email>', password: '<password>' }
  When method post
  Then status <expected_status>

Examples:
  | email             | password   | expected_status |
  | test@a.com        | secret     | 200             |
  | test@a.com        | wrong      | 401             |
  | invalid-email     | secret     | 400             |
\`\`\`

## CI Integration

\`\`\`yaml
name: Karate Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
      - run: mvn test -Dkarate.options="--tags @smoke"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: karate-reports
          path: target/karate-reports/
\`\`\`

## Reporting

Karate produces a rich HTML report by default at \`target/karate-reports/karate-summary.html\`. It includes:

- Per-scenario pass/fail
- Stack traces and assertions
- Request/response payloads
- Timing data
- Tag-based grouping

## Real Suite Example

\`\`\`gherkin
Feature: Order management API

Background:
  * url baseUrl
  * def loginResp = call read('classpath:auth/login.feature')
  * header Authorization = 'Bearer ' + loginResp.token
  * def schema = read('classpath:schemas/order.json')

@smoke
Scenario: Create order returns 201 and matches schema
  Given path 'orders'
  And request { sku: 'ABC123', quantity: 2 }
  When method post
  Then status 201
  And match response == schema
  * def orderId = response.id

@smoke
Scenario: Get created order
  Given path 'orders', orderId
  When method get
  Then status 200
  And match response.status == 'pending'

@regression
Scenario: List orders paginated
  Given path 'orders'
  And param limit = 10
  When method get
  Then status 200
  And match response.items == '#[10]'

@regression
Scenario Outline: Order validation
  Given path 'orders'
  And request <body>
  When method post
  Then status <status>

Examples:
  | body                            | status |
  | { sku: 'ABC', quantity: 1 }     | 201    |
  | { sku: 'ABC' }                  | 400    |
  | { quantity: 1 }                 | 400    |
  | { sku: '', quantity: 1 }        | 400    |

@regression @slow
Scenario: Bulk order operations
  Given path 'orders/bulk'
  And request read('classpath:fixtures/bulk_orders.json')
  When method post
  Then status 202
  * def batchId = response.batch_id
  * call read('classpath:helpers/wait_for_batch.feature') { batchId: '#(batchId)' }
\`\`\`

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| Hardcoded base URL | Use baseUrl variable |
| One mega feature file | Split by domain |
| No reusable login | call read login.feature |
| Skipping schema validation | Use match against schema |
| Mixing test and production data | Per-env config files |

## Conclusion

Karate is a serious API testing framework that brings BDD readability without sacrificing power. The Gherkin syntax is approachable for non-developers, while the underlying engine handles every API testing scenario you'll encounter. Built-in mocking, performance testing, parallel execution, and reporting make it a one-stop shop for API quality. For teams looking for an alternative to REST Assured, especially mixed dev/QA teams, Karate is well worth the evaluation.

Start with a single feature file covering one critical endpoint. Add a few scenarios. Layer in tags, schema matching, and a login Background. Within a sprint or two you'll have a fast, readable API test suite. Visit our [skills directory](/skills) or the [REST Assured vs Karate comparison](/blog/rest-assured-vs-karate-detailed-comparison-2026) for related reading.
`,
};
