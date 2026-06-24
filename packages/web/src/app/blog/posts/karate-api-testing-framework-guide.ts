import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Karate API Testing Framework Guide — Gherkin DSL Tutorial',
  description:
    'Learn Karate API testing from scratch. This Karate framework tutorial covers the Gherkin DSL, JSON matching, data-driven tests, mocks, and Maven CI setup.',
  date: '2026-06-24',
  category: 'Guide',
  content: `
# Karate API Testing Framework Guide: Gherkin DSL Tutorial

**Karate** is an open-source, BDD-style API testing framework that lets you write expressive HTTP tests without writing a single line of Java step-definition glue code. Built on top of Cucumber's Gherkin syntax, Karate merges the test runner, the assertion library, the HTTP client, and the JSON/XML parser into one cohesive domain-specific language (DSL). The result is **karate api testing** that reads like plain English while still being powerful enough to validate deeply nested JSON, drive data-driven scenarios, spin up stub servers, and run performance tests with Gatling.

If you have ever wrestled with the boilerplate of REST Assured plus TestNG, or fought with maintaining brittle Cucumber step definitions, this **karate framework tutorial** will feel like a breath of fresh air. In Karate, the \`.feature\` file *is* the test. You do not write Java glue for each step. The framework ships its own keywords -- \`Given\`, \`When\`, \`Then\`, \`And\`, plus Karate-specific actions like \`url\`, \`path\`, \`method\`, \`status\`, and \`match\` -- so a non-programmer QA engineer can author and maintain tests, while a Java developer can still drop into JavaScript or Java when complex logic is needed.

This guide walks you through everything: installing Karate with Maven, writing your first scenario, mastering the **karate dsl gherkin api tests** workflow, the powerful \`match\` operator for fuzzy JSON validation, reusable feature calls, data-driven \`Scenario Outline\` tables, authentication flows, mocking and service virtualization, parallel execution, and wiring it all into a CI pipeline. By the end you will be able to build a maintainable, production-grade API regression suite. Let's begin.

## Why Choose Karate Over Other API Testing Tools

Karate occupies a unique position in the API testing landscape. Unlike code-first libraries where you assemble requests in Java or JavaScript, Karate gives you a declarative DSL purpose-built for HTTP. You get the readability of BDD without the maintenance tax of separate step-definition files.

| Capability | Karate | REST Assured | Postman | Cypress (API) |
|---|---|---|---|---|
| Language | Gherkin DSL (no glue code) | Java | JS sandbox + UI | JavaScript |
| Step definitions required | No | N/A | No | No |
| Native JSON/XML assertions | Built-in \`match\` | Hamcrest matchers | \`pm.expect\` (Chai) | Chai |
| Data-driven tests | \`Scenario Outline\` + dynamic JSON | DataProvider/Parameterized | Collection runner + CSV | \`forEach\` loops |
| Built-in mock server | Yes (\`karate-netty\`) | No | Mock servers (cloud) | No |
| Performance testing | Yes (Gatling integration) | No | Limited | No |
| Parallel execution | Native runner | Via TestNG/JUnit | Newman | Limited |
| Learning curve | Low for QA, low for devs | Medium (Java) | Low | Medium |

The standout features are the **zero step-definition** model and the \`match\` keyword. Because Karate parses JSON and XML natively, you can assert against an entire response payload in one line, use fuzzy matchers like \`#string\`, \`#number\`, and \`#uuid\`, and ignore volatile fields such as timestamps. If you are weighing Karate against a pure-Java approach, our [REST Assured Java API testing guide](/blog/rest-assured-java-api-testing) covers the alternative in depth, and the broader [API testing complete guide](/blog/api-testing-complete-guide) explains where each tool fits in a strategy.

## Setting Up Karate with Maven

Karate runs on the JVM, so you need JDK 11 or newer (JDK 17 is recommended in 2026) and Maven or Gradle. The cleanest way to start is the official Maven archetype, which scaffolds a working project with the JUnit 5 runner, a sample feature, and the correct directory layout.

\`\`\`bash
mvn archetype:generate \\
  -DarchetypeGroupId=io.karatelabs \\
  -DarchetypeArtifactId=karate-archetype \\
  -DarchetypeVersion=1.5.1 \\
  -DgroupId=com.example.api \\
  -DartifactId=karate-tests \\
  -DinteractiveMode=false
\`\`\`

If you prefer to add Karate to an existing project, drop the dependency into your \`pom.xml\`. The \`karate-junit5\` artifact bundles the core engine plus the JUnit 5 integration so you can run features from your IDE or from \`mvn test\`.

\`\`\`xml
<dependencies>
  <dependency>
    <groupId>io.karatelabs</groupId>
    <artifactId>karate-junit5</artifactId>
    <version>1.5.1</version>
    <scope>test</scope>
  </dependency>
</dependencies>

<build>
  <testResources>
    <testResource>
      <directory>src/test/java</directory>
      <excludes>
        <exclude>**/*.java</exclude>
      </excludes>
    </testResource>
  </testResources>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-surefire-plugin</artifactId>
      <version>3.2.5</version>
    </plugin>
  </plugins>
</build>
\`\`\`

The \`testResources\` block is important: it tells Maven to copy \`.feature\` files (which live alongside your Java runners in \`src/test/java\`) onto the classpath. Without it, Karate cannot find your scenarios at runtime. Many first-time setup failures trace back to a missing \`testResources\` configuration.

## Writing Your First Karate Feature File

A Karate test lives in a \`.feature\` file. The structure follows Gherkin: a \`Feature:\` declaration, an optional \`Background:\` that runs before every scenario, and one or more \`Scenario:\` blocks. Inside a scenario you describe the HTTP call with Karate keywords.

Create \`src/test/java/users/users.feature\`:

\`\`\`gherkin
Feature: User API tests

Background:
  * url 'https://jsonplaceholder.typicode.com'

Scenario: Get a single user by id
  Given path 'users', 1
  When method get
  Then status 200
  And match response.name == 'Leanne Graham'
  And match response.address.city == 'Gwenborough'
  And match response.company.name == '#string'

Scenario: List all users returns ten records
  Given path 'users'
  When method get
  Then status 200
  And match response == '#[10]'
  And match each response contains { id: '#number', email: '#string' }
\`\`\`

A few things to notice. The leading \`*\` is a generic step prefix -- Karate treats \`Given\`, \`When\`, \`Then\`, \`And\`, and \`*\` identically, so you can use whichever reads best. The \`url\` keyword sets the base URI, \`path\` appends path segments (comma-separated values are joined with slashes), \`method get\` fires the request, and \`status 200\` asserts the HTTP status code. The \`response\` variable is automatically populated with the parsed body. \`match response == '#[10]'\` asserts the response is an array of exactly ten elements, and \`match each\` validates every element against a schema.

## Running Karate Tests with the JUnit 5 Runner

To execute features, you create a tiny Java runner class. Karate's JUnit 5 integration exposes the \`@Karate.Test\` annotation and a fluent \`Karate\` builder.

\`\`\`java
package users;

import com.intuit.karate.junit5.Karate;

class UsersRunner {

    @Karate.Test
    Karate testUsers() {
        return Karate.run("users").relativeTo(getClass());
    }
}
\`\`\`

Run it from the command line with Maven:

\`\`\`bash
mvn test -Dtest=UsersRunner
\`\`\`

Or run the entire suite, which discovers every \`.feature\` file, by pointing at a top-level runner that uses tags. After execution, Karate writes an HTML report to \`target/karate-reports/karate-summary.html\` showing each scenario, the full request and response, and timing. This zero-config reporting is one of Karate's quietly excellent features -- you get rich, shareable test evidence without configuring Allure or ExtentReports.

## Mastering the match Keyword for JSON Validation

The \`match\` keyword is the heart of Karate. It performs a deep, smart comparison between an actual value and an expected value. Unlike a naive \`equals\`, \`match\` understands JSON structure, supports fuzzy placeholders, and can ignore fields you do not care about.

| Marker | Meaning |
|---|---|
| \`#string\` | Value is a non-null string |
| \`#number\` | Value is a number |
| \`#boolean\` | Value is true or false |
| \`#uuid\` | Value is a valid UUID string |
| \`#notnull\` | Value is present and not null |
| \`#null\` | Value is null |
| \`#present\` | Key exists (any value, even null) |
| \`#ignore\` | Skip this field in the comparison |
| \`#regex EXPR\` | String matches the regular expression |
| \`#? EXPR\` | Custom JS predicate, e.g. \`#? _ > 0\` |
| \`#[n]\` | Array of exactly n elements |
| \`#array\` | Value is a JSON array |
| \`#object\` | Value is a JSON object |

Here is a scenario that validates a complex payload while tolerating volatile values:

\`\`\`gherkin
Scenario: Validate an order payload with fuzzy matchers
  Given url 'https://api.example.com'
  And path 'orders', 42
  When method get
  Then status 200
  And match response ==
    """
    {
      id: 42,
      orderNumber: '#regex ORD-[0-9]{6}',
      total: '#? _ > 0',
      currency: 'USD',
      createdAt: '#string',
      customer: { id: '#number', email: '#regex .+@.+' },
      items: '#[_ > 0]',
      shippingAddress: '#object',
      couponCode: '##string'
    }
    """
\`\`\`

The triple-quoted block is a docstring holding inline JSON. \`'#? _ > 0'\` is a JavaScript predicate where \`_\` is the value under test. \`'#[_ > 0]'\` asserts a non-empty array. The double-hash \`'##string'\` means the field is optional but, if present, must be a string -- ideal for nullable fields. This single \`match\` replaces a dozen brittle assertions and ignores fields you mark with \`#ignore\`.

## Data-Driven Testing with Scenario Outline

Real regression suites need to run the same logic against many inputs. Karate supports this two ways: classic Gherkin \`Scenario Outline\` with an \`Examples\` table, and dynamic data-driven tests fed by a JSON array.

\`\`\`gherkin
Scenario Outline: Create users with different roles
  Given url 'https://api.example.com'
  And path 'users'
  And request { name: '<name>', role: '<role>' }
  When method post
  Then status 201
  And match response.role == '<role>'

  Examples:
    | name    | role     |
    | Alice   | admin    |
    | Bob     | editor   |
    | Carol   | viewer   |
\`\`\`

For larger or externally sourced data, drive the outline from a JSON file or an inline array. Karate iterates the array, binding each object's fields to placeholders:

\`\`\`gherkin
Scenario Outline: Login with table-driven credentials
  Given url 'https://api.example.com'
  And path 'auth', 'login'
  And request { username: '<username>', password: '<password>' }
  When method post
  Then status <expectedStatus>

  Examples:
    | read('credentials.json') |
\`\`\`

Where \`credentials.json\` is an array of objects with \`username\`, \`password\`, and \`expectedStatus\` keys. This is far cleaner than parameterized JUnit tests because the data and the assertion live in the same readable file.

## Reusable Feature Calls and Shared Setup

DRY principles apply to API tests too. In Karate you extract common flows -- like authentication or seeding test data -- into their own feature files and \`call\` them. The called feature returns its variables to the caller.

Create \`src/test/java/common/auth.feature\`:

\`\`\`gherkin
@ignore
Feature: Reusable authentication

Scenario: Obtain a bearer token
  Given url 'https://api.example.com'
  And path 'auth', 'token'
  And request { clientId: '#(clientId)', clientSecret: '#(clientSecret)' }
  When method post
  Then status 200
  * def authToken = response.access_token
\`\`\`

The \`@ignore\` tag stops this helper from running as a standalone test. The \`#(clientId)\` embedded expression pulls a variable from the caller. Now call it from a real test:

\`\`\`gherkin
Feature: Orders requiring auth

Background:
  * def creds = { clientId: 'svc-orders', clientSecret: 'secret-123' }
  * def result = call read('classpath:common/auth.feature') creds
  * def token = result.authToken
  * url 'https://api.example.com'
  * header Authorization = 'Bearer ' + token

Scenario: Authenticated user can list their orders
  Given path 'orders'
  When method get
  Then status 200
  And match each response contains { id: '#number' }
\`\`\`

The \`Background\` runs once per scenario, fetching a fresh token and setting the \`Authorization\` header globally via the \`header\` keyword. This pattern keeps authentication logic in exactly one place.

## Handling Authentication, Headers, and Configuration

Karate centralizes environment configuration in a special file, \`karate-config.js\`, that runs before every scenario and returns a config object. This is where you branch on environment (dev, staging, prod) and set base URLs, credentials, and timeouts.

\`\`\`javascript
function fn() {
  var env = karate.env || 'dev';
  karate.log('karate.env is:', env);

  var config = {
    baseUrl: 'https://dev-api.example.com',
    clientId: 'svc-dev',
  };

  if (env === 'staging') {
    config.baseUrl = 'https://staging-api.example.com';
    config.clientId = 'svc-staging';
  } else if (env === 'prod') {
    config.baseUrl = 'https://api.example.com';
    config.clientId = 'svc-prod';
  }

  // global connect and read timeouts in milliseconds
  karate.configure('connectTimeout', 5000);
  karate.configure('readTimeout', 10000);
  return config;
}
\`\`\`

You select the environment at runtime with \`-Dkarate.env=staging\`. Inside any feature, the returned keys (\`baseUrl\`, \`clientId\`) are available as variables. For different auth schemes, set headers directly: \`header Authorization = 'Bearer ' + token\` for OAuth, \`header X-API-Key = apiKey\` for API keys, or use \`configure ssl = true\` for client certificates. Basic auth is handled with \`* configure headers = { Authorization: 'Basic ' + encodedCreds }\`.

## Building API Mocks and Service Virtualization

One of Karate's most underrated capabilities is its built-in mock server. When the system under test depends on a third-party API that is slow, rate-limited, or unavailable, you can stand up a Karate mock that returns canned responses. The mock itself is written in -- you guessed it -- a \`.feature\` file.

\`\`\`gherkin
Feature: Payment gateway mock

Background:
  * def uuid = function(){ return java.util.UUID.randomUUID() + '' }

Scenario: pathMatches('/charge') && methodIs('post')
  * def responseStatus = 201
  * def response = { transactionId: '#(uuid())', status: 'approved', amount: '#(request.amount)' }

Scenario: pathMatches('/charge/{id}') && methodIs('get')
  * def response = { transactionId: '#(pathParams.id)', status: 'approved' }
\`\`\`

Each \`Scenario\` is a route: the \`pathMatches\` and \`methodIs\` helpers act as a request matcher. You start the mock programmatically in a JUnit test or via the standalone JAR:

\`\`\`java
import com.intuit.karate.core.MockServer;

MockServer server = MockServer.feature("classpath:mocks/payment-mock.feature")
    .http(8090)
    .build();
// point your tests at http://localhost:8090, then server.stop();
\`\`\`

This turns Karate into a complete contract-testing and service-virtualization tool. For deeper coverage of mocking strategies across the stack, see the [API testing complete guide](/blog/api-testing-complete-guide).

## Parallel Execution and CI Integration

API suites grow quickly, and serial execution becomes the bottleneck. Karate has first-class parallel execution through the \`Runner\` class -- you do not rely on the JUnit or TestNG parallel machinery. Create a parallel runner that discovers features by tag and spreads them across threads.

\`\`\`java
package suite;

import com.intuit.karate.Results;
import com.intuit.karate.Runner;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class ParallelRunner {

    @Test
    void runAll() {
        Results results = Runner.path("classpath:")
            .tags("~@ignore")
            .outputCucumberJson(true)
            .parallel(5);
        assertEquals(0, results.getFailCount(), results.getErrorMessages());
    }
}
\`\`\`

\`parallel(5)\` runs five scenarios at once. The \`tags("~@ignore")\` excludes helper features. Because each scenario gets an isolated variable scope, parallelism is safe by default as long as your tests do not share mutable server-side state. Wire this into GitHub Actions:

\`\`\`yaml
name: API Tests
on: [push, pull_request]
jobs:
  karate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
          cache: maven
      - name: Run Karate suite
        run: mvn test -Dtest=ParallelRunner -Dkarate.env=staging
      - name: Upload Karate report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: karate-reports
          path: target/karate-reports/
\`\`\`

The \`if: always()\` ensures the HTML report uploads even when tests fail, giving your team a shareable artifact for every run.

## Karate Best Practices for Maintainable Suites

A few habits keep a Karate suite healthy as it scales. First, keep base URLs and secrets in \`karate-config.js\`, never hardcoded in features -- this makes environment switching trivial and keeps credentials out of version control when combined with environment variables. Second, extract repeated flows (auth, data seed, teardown) into \`@ignore\`-tagged helper features and \`call\` them, so a contract change touches one file. Third, prefer \`match\` over chains of single-field assertions; one whole-payload \`match\` with fuzzy markers is more readable and more resilient to field reordering.

Fourth, use tags (\`@smoke\`, \`@regression\`, \`@wip\`) to slice the suite for different pipeline stages -- run \`@smoke\` on every commit and the full \`@regression\` nightly. Fifth, treat \`.feature\` files as production code: review them, lint the JSON, and avoid embedding large blobs inline; read them from \`read('data.json')\` instead. Finally, lean on Karate's JavaScript escape hatch (\`* def x = function(){ ... }\`) only when the DSL genuinely cannot express the logic -- overusing JS turns a readable feature back into opaque code. For comparing Karate's approach to schema-based contract tools, the [GraphQL testing complete guide](/blog/graphql-testing-complete-guide) shows how query-language APIs change the validation model.

## Frequently Asked Questions

### Is Karate a good framework for API testing in 2026?

Yes. Karate remains one of the most productive API testing frameworks because it eliminates step-definition glue code, ships native JSON and XML assertions, includes a mock server, and supports parallel execution and performance testing out of the box. Its Gherkin-based DSL lets both QA engineers and developers author and maintain tests, making it a strong choice for teams that value readable, low-maintenance suites.

### Do I need to know Java to use Karate?

No, you do not need Java to write Karate tests. The entire test lives in a \`.feature\` file using Karate's DSL, so you can build, run, and maintain API tests without writing Java code. You only need a tiny Java runner class to launch the suite, and the archetype generates that for you. Java knowledge helps for advanced custom logic, but it is optional for everyday testing.

### What is the difference between Karate and Cucumber?

Both use Gherkin syntax, but Cucumber requires you to write Java step-definition methods for every step, whereas Karate provides built-in steps for HTTP calls and assertions. With Cucumber you maintain glue code; with Karate the feature file is the complete test. Karate also adds native JSON matching, a mock server, and parallel execution that plain Cucumber does not include.

### How does the match keyword work in Karate?

The \`match\` keyword performs a deep, structure-aware comparison between an actual value and an expected value. It understands JSON and XML, supports fuzzy markers like \`#string\`, \`#number\`, and \`#uuid\`, can ignore volatile fields with \`#ignore\`, and validates arrays with \`#[n]\`. A single \`match\` against a whole payload replaces many brittle single-field assertions and tolerates field reordering.

### Can Karate run performance and load tests?

Yes. Karate integrates with Gatling through the \`karate-gatling\` module, letting you reuse your functional \`.feature\` files as load-test scenarios. You write a Scala simulation that references the features and ramps virtual users, and Karate feeds real HTTP traffic to your API. This means one set of tests serves both functional validation and performance benchmarking.

### How do I run Karate tests in parallel?

Use the \`Runner\` class rather than the JUnit parallel machinery. Call \`Runner.path("classpath:").tags("~@ignore").parallel(5)\` to run five scenarios concurrently. Each scenario has an isolated variable scope, so parallel runs are safe as long as your tests do not depend on shared mutable server-side state. The runner aggregates results and produces a single HTML report.

### Can Karate test GraphQL APIs?

Yes. Because GraphQL is served over HTTP POST with a JSON body, you send the query as a request payload using \`request { query: "..." }\` and assert on \`response.data\` with the \`match\` keyword. Karate handles GraphQL as naturally as REST, and you can drive variables and fragments through the same data-driven patterns used for any other endpoint.

## Conclusion

Karate gives you a uniquely productive path to robust **api testing**: a readable Gherkin DSL, zero step-definition boilerplate, the powerful \`match\` operator for fuzzy JSON validation, data-driven \`Scenario Outline\` tables, reusable feature calls, a built-in mock server, and native parallel execution -- all wrapped in rich HTML reporting. Whether you are a QA engineer who wants to write tests without learning Java or a developer building a fast regression suite, the **karate framework** scales from a single smoke test to a full CI-integrated **karate dsl gherkin api tests** pipeline.

The fastest way to level up is to install the Maven archetype, port one existing endpoint into a \`.feature\` file, and feel how quickly the \`match\` keyword replaces dozens of assertions. From there, add \`karate-config.js\` environment switching, extract your auth flow into a reusable feature, and turn on \`parallel(5)\`.

Ready to build a complete, maintainable API testing skill set for your AI coding agents and your team? Explore curated, ready-to-install QA skills at [/skills](/skills) and start shipping reliable API tests today.
`,
};
