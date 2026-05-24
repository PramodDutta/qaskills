import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Karate BDD API Testing: Complete Guide 2026',
  description:
    'Complete guide to API testing with Karate DSL. Installation, request/response patterns, JSON path assertions, GraphQL, mocking, performance testing, parallel execution, and CI integration for 2026.',
  date: '2026-05-07',
  category: 'BDD',
  content: `
# Karate BDD API Testing: Complete Guide 2026

Karate is the BDD framework you choose when most of your tests are API-driven. While Cucumber, SpecFlow, and Behave focus on UI scenarios with step definitions in Java/C#/Python, Karate takes a radically different approach: it builds a domain-specific HTTP testing language directly on top of Gherkin syntax. The result is API tests that read like English specifications but execute as if they were hand-written HTTP clients -- with built-in JSON/XML matchers, schema validation, GraphQL support, performance testing, and even API mocking baked in.

In 2026, Karate is one of the fastest-growing BDD frameworks, particularly in microservices-heavy organizations where API contracts dominate the test surface. This guide walks through everything you need to adopt Karate at scale: installation, project structure, feature file syntax, JSON path assertions, dynamic test data, mocking, performance testing with Gatling, parallel execution, and CI integration. Every example is production-tested against Karate 1.5.x running on JVM 21.

By the end you will have a complete picture of Karate's capabilities, when it wins over Cucumber + RestAssured, and how to combine it with Playwright for hybrid UI + API suites.

## Key Takeaways

- **Karate eliminates step definitions** -- HTTP verbs and assertions are built into the framework.
- **JSON path matching** with fuzzy operators (#string, #uuid, #regex) makes assertions concise.
- **Schema validation** via response matching catches breaking changes.
- **Karate Mock Server** provides production-grade API mocking from the same Gherkin syntax.
- **Karate Gatling integration** lets you reuse functional tests as load tests.

---

## 1. Project Setup

Add Karate as a Maven dependency:

\`\`\`xml
<dependency>
  <groupId>io.karatelabs</groupId>
  <artifactId>karate-junit5</artifactId>
  <version>1.5.0</version>
  <scope>test</scope>
</dependency>
\`\`\`

Or Gradle:

\`\`\`groovy
testImplementation 'io.karatelabs:karate-junit5:1.5.0'
\`\`\`

Standard directory structure:

\`\`\`
src/test/java/
  com/example/api/
    users/
      users.feature
      UsersTest.java
    orders/
      orders.feature
      OrdersTest.java
  karate-config.js
\`\`\`

The karate-config.js is the global setup file:

\`\`\`javascript
function fn() {
  var env = karate.env || 'dev';
  var config = {
    env: env,
    baseUrl: 'http://localhost:8080',
    apiKey: 'test-key-123'
  };
  if (env === 'staging') {
    config.baseUrl = 'https://staging-api.example.com';
    config.apiKey = karate.properties['staging.apiKey'];
  }
  if (env === 'prod') {
    config.baseUrl = 'https://api.example.com';
    config.apiKey = karate.properties['prod.apiKey'];
  }
  return config;
}
\`\`\`

## 2. Your First Feature File

\`\`\`gherkin
Feature: User CRUD operations

  Background:
    * url baseUrl
    * header Content-Type = 'application/json'
    * header Authorization = 'Bearer ' + apiKey

  @smoke
  Scenario: Create a new user
    Given path '/users'
    And request { name: 'Alice', email: 'alice@example.com' }
    When method post
    Then status 201
    And match response == { id: '#uuid', name: 'Alice', email: 'alice@example.com', createdAt: '#string' }
    * def userId = response.id

  Scenario: Read the created user
    Given path '/users', userId
    When method get
    Then status 200
    And match response.name == 'Alice'

  Scenario: Update the user
    Given path '/users', userId
    And request { name: 'Alice Smith' }
    When method patch
    Then status 200
    And match response.name == 'Alice Smith'

  Scenario: Delete the user
    Given path '/users', userId
    When method delete
    Then status 204
\`\`\`

Notice there are no step definitions. Karate's runtime knows what \`Given url\`, \`When method post\`, and \`Then status 201\` mean.

## 3. JSON Matchers

Karate's matchers are the framework's killer feature:

\`\`\`gherkin
Scenario: Fuzzy matching examples
  Given path '/users'
  When method get
  Then status 200
  And match response ==
    """
    {
      total: '#number',
      items: '#[2..10]',
      items[0]: { id: '#uuid', name: '#string', email: '#regex .+@.+\\\\..+' }
    }
    """
\`\`\`

| Matcher | Meaning |
|---|---|
| #string | Any string |
| #number | Any number |
| #boolean | Any boolean |
| #uuid | UUID format |
| #regex pattern | Matches a regex |
| #notnull | Anything non-null |
| #ignore | Ignored (don't check) |
| #[N..M] | Array of length between N and M |
| #present | Key must exist |

## 4. Reusable Helpers and Functions

Karate features can call other features for shared setup. Create a helpers folder:

\`\`\`gherkin
# src/test/java/com/example/helpers/create-user.feature
Feature: Create a user (helper)

  Scenario:
    Given url baseUrl
    And path '/users'
    And request { name: '#(name)', email: '#(email)' }
    When method post
    Then status 201
    * def created = response
\`\`\`

Call from another feature:

\`\`\`gherkin
Feature: Order operations

  Background:
    * url baseUrl
    * def userResult = call read('classpath:com/example/helpers/create-user.feature') { name: 'Buyer', email: 'buyer@example.com' }
    * def buyer = userResult.created

  Scenario: Place an order for the user
    Given path '/orders'
    And request { userId: '#(buyer.id)', total: 99.99 }
    When method post
    Then status 201
\`\`\`

## 5. Data-Driven Tests

Karate supports CSV, JSON, and inline tables:

\`\`\`gherkin
Scenario Outline: Validate user creation rules
  Given path '/users'
  And request { name: '<name>', email: '<email>' }
  When method post
  Then status <status>

  Examples:
    | name      | email             | status |
    | Alice     | alice@example.com | 201    |
    |           | bob@example.com   | 400    |
    | Charlie   | not-an-email      | 400    |
\`\`\`

CSV-driven scenarios:

\`\`\`gherkin
Scenario Outline:
  Given path '/users'
  And request { name: '<name>', email: '<email>' }
  When method post
  Then status <status>

  Examples:
    | read('users.csv') |
\`\`\`

## 6. GraphQL Support

Karate handles GraphQL elegantly:

\`\`\`gherkin
Scenario: GraphQL query for user details
  Given url baseUrl
  And path '/graphql'
  And request
    """
    {
      query: "query GetUser($id: ID!) { user(id: $id) { id name email orders { id total } } }",
      variables: { id: "#(userId)" }
    }
    """
  When method post
  Then status 200
  And match response.data.user == { id: '#(userId)', name: '#string', email: '#string', orders: '#[]' }
\`\`\`

## 7. Mock Server

Karate's mock server uses the same Gherkin syntax to define responses:

\`\`\`gherkin
# src/test/java/mocks/payments-mock.feature
Feature: Payments service mock

  Background:
    * configure cors = true

  Scenario: pathMatches('/charge') && methodIs('post')
    * def card = request.cardNumber
    * if (card == '4000-0000-0000-0002') karate.abort()
    * def response = { id: 'ch_' + new Date().getTime(), status: 'succeeded', amount: request.amount }
    * def responseStatus = 201

  Scenario: pathMatches('/charge') && methodIs('post')
    * def response = { error: 'card_declined' }
    * def responseStatus = 402
\`\`\`

Start the mock in tests:

\`\`\`java
import com.intuit.karate.core.MockServer;

class PaymentsMockTest {
  @Test
  void startMock() {
    MockServer server = MockServer.feature("classpath:mocks/payments-mock.feature").http(8090).build();
    // use baseUrl http://localhost:8090
    server.stop();
  }
}
\`\`\`

## 8. Performance Testing with Karate Gatling

Reuse the same .feature files as load tests:

\`\`\`scala
class UsersLoadSimulation extends Simulation {
  val createUsers = scenario("create users").exec(karateFeature("classpath:com/example/api/users/users.feature"))
  setUp(createUsers.inject(rampUsers(100) during (30.seconds))).protocols(karateProtocol())
}
\`\`\`

Run with Gatling Maven plugin. The same functional tests now produce load reports without any duplication.

## 9. Parallel Execution

Use the Karate Runner with parallel:

\`\`\`java
@Karate.Test
Karate runAll() {
  return Karate.run().relativeTo(getClass()).parallel(5);
}
\`\`\`

5 parallel threads typically handle 200-500 scenarios per minute on a modern CI runner.

## 10. CI Integration

GitHub Actions example:

\`\`\`yaml
name: API Tests
on: [push]
jobs:
  karate:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 21 }
      - run: mvn -B test -Dkarate.env=staging
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: karate-report, path: target/karate-reports/ }
\`\`\`

## 11. When to Use Karate vs Cucumber + RestAssured

| Aspect | Karate | Cucumber + RestAssured |
|---|---|---|
| Step definitions | None needed | Required |
| Learning curve | Lower | Higher |
| Polyglot teams | Karate-only | Reuses Java skills |
| GraphQL | Native | Requires libraries |
| Mock server | Built-in | Separate tool |
| Performance testing | Karate Gatling | Separate tool |
| Custom Java logic | Possible but awkward | Native |
| Community size | Growing | Massive |

Choose Karate when API testing dominates and you want minimal step-definition maintenance. Choose Cucumber + RestAssured when you need extensive Java integration or already have a Cucumber UI suite.

## 12. AI-Assisted Karate Authoring

The [karate](/skills) SKILL.md pack on QASkills teaches Claude or Cursor to generate Karate features from OpenAPI specs. Combined with [cursor-skills-md-best-practices](/blog), this lets you scaffold API test suites in minutes.

## 13. Advanced Karate Features

### Custom Matchers
Beyond the built-in #string and #uuid, you can write custom matchers:

\`\`\`gherkin
* def isFutureDate = function(d){ return new Date(d).getTime() > Date.now() }
Then match response.expiry == '#? isFutureDate(_)'
\`\`\`

### Chaining HTTP Calls
\`\`\`gherkin
Scenario: Create order and pay
  Given path '/orders'
  And request { items: [...] }
  When method post
  Then status 201
  * def orderId = response.id

  Given path '/orders', orderId, 'pay'
  And request { amount: 99.99 }
  When method post
  Then status 200
\`\`\`

### Polling with Retry
\`\`\`gherkin
* configure retry = { count: 5, interval: 2000 }
Given path '/jobs', jobId
And retry until response.status == 'COMPLETED'
When method get
Then status 200
\`\`\`

### Multipart Uploads
\`\`\`gherkin
Given path '/upload'
And multipart file file = { read: 'test.pdf', filename: 'test.pdf', contentType: 'application/pdf' }
And multipart field title = 'Test Document'
When method post
Then status 201
\`\`\`

### WebSocket Testing
Karate supports WebSocket testing via the websocket keyword. Useful for chat APIs and real-time pubsub systems.

## 14. Karate's JavaScript Layer

Karate uses GraalJS to embed JavaScript in feature files. This lets you write helper functions inline:

\`\`\`gherkin
* def computeHmac = function(payload, secret) { return Java.type('com.example.HmacUtil').compute(payload, secret) }
* def signature = computeHmac(request, apiSecret)
Given header X-Signature = signature
\`\`\`

The JavaScript layer is one of Karate's most powerful features but also its most controversial. It lets you do almost anything but can make features hard to read.

## 15. Karate Mock Server Deep Dive

The Karate mock server is genuinely production-grade:

- Supports HTTPS via configured certificates.
- Records and replays real HTTP traffic.
- Conditional responses based on request headers, paths, methods.
- Stateful mocks (e.g., counter that increments per request).
- Can be embedded in JUnit tests or run standalone.

Example stateful mock:

\`\`\`gherkin
Feature: Idempotency mock

Background:
  * def attempts = {}

Scenario: pathMatches('/charge') && methodIs('post')
  * def key = requestHeaders['Idempotency-Key'][0]
  * if (attempts[key]) responseStatus = 200
  * if (attempts[key]) response = attempts[key]
  * def newResp = { id: 'ch_' + new Date().getTime(), status: 'succeeded' }
  * attempts[key] = newResp
  * def response = newResp
  * def responseStatus = 201
\`\`\`

## 16. Karate vs Postman / Newman

| Aspect | Karate | Postman + Newman |
|---|---|---|
| Test as code | Yes (Gherkin) | JS code in collections |
| Version control | Native | JSON collections |
| Schema validation | Native fuzzy matchers | JSON schema plugin |
| Mock server | Built-in | Mockoon (separate) |
| Performance testing | Karate Gatling | Limited (Postman Cloud) |
| CI integration | Maven/Gradle native | Newman CLI |

For teams that prefer code over GUI, Karate wins. For teams that want manual exploratory + automated workflows, Postman often wins.

## 17. Karate vs RestAssured

| Aspect | Karate | RestAssured |
|---|---|---|
| Language | Gherkin DSL | Java fluent API |
| Step definitions | None | None |
| Learning curve | Lower | Higher |
| Java integration | Possible | Native |
| Reporting | Karate HTML | TestNG/JUnit |

RestAssured is more integrated with Java workflows; Karate is more declarative.

## 18. CI/CD Integration

GitHub Actions:

\`\`\`yaml
jobs:
  karate:
    runs-on: ubuntu-22.04
    strategy:
      matrix: { shard: [1, 2, 3, 4] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 21 }
      - run: mvn -B test -Dkarate.env=staging -Dkarate.options="--tags @smoke"
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: karate-report-\${{ matrix.shard }}, path: target/karate-reports/ }
\`\`\`

## 19. Frequently Asked Questions

**Q: Can Karate test UI?**
A: Karate has a UI driver but it's less mature than Playwright or Selenium. For UI use those; for API use Karate.

**Q: Does Karate work with GraphQL subscriptions?**
A: Yes via WebSocket primitives, but the syntax is more verbose than REST.

**Q: Can I integrate Karate with Cucumber-JVM?**
A: They share Gherkin parsing but run independently. Most teams keep them separate.

**Q: Karate's mock server in production-like scenarios?**
A: It handles tens of thousands of requests per second; suitable for performance testing or stand-in services in CI.

**Q: AI agents for Karate?**
A: Yes -- the [karate](/skills) SKILL.md pack on QASkills teaches Claude or Cursor to generate Karate features from OpenAPI specs.

## Conclusion

Karate in 2026 is the most ergonomic BDD framework for API-heavy testing. The combination of zero step definitions, fuzzy JSON matchers, GraphQL support, and built-in mocking is hard to beat. Pair it with Playwright for UI scenarios and you have a complete BDD stack. See [comparing-popular-bdd-frameworks-2026-complete-guide](/blog) for context on where Karate fits in the broader BDD landscape.
`,
};
