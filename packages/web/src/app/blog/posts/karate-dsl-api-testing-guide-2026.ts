import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Karate DSL API Testing Tutorial — Gherkin Feature Files in 2026',
  description:
    'Learn Karate DSL API testing with Gherkin .feature files, match assertions, Maven setup, JUnit 5 runners, data-driven scenarios, and CI/CD. Hands-on 2026 guide.',
  date: '2026-06-30',
  category: 'Tutorial',
  content: `
# Karate DSL API Testing Tutorial: Gherkin Feature Files in 2026

**Karate DSL** is one of the few API testing frameworks that lets you write expressive, readable HTTP tests without writing a single line of step-definition glue code. Built on top of Cucumber's Gherkin syntax but stripped of the usual boilerplate, **Karate DSL API testing** gives QA engineers, SDETs, and developers a single domain-specific language for calling REST endpoints, asserting JSON and XML responses, chaining requests, and driving data-driven scenarios. Unlike Cucumber, where every \`Given\`/\`When\`/\`Then\` line maps to a Java method you must implement, Karate ships those step definitions for you. You write the \`.feature\` file, Karate does the plumbing.

That single design decision is why teams adopt Karate so quickly. A manual tester who has never written Java can read and even author a Karate scenario on day one, while a senior automation engineer can layer in JavaScript helpers, reusable feature files, parallel execution, and performance testing through Gatling. In this tutorial you will build a complete Karate project from an empty directory: the Maven dependencies, the JUnit 5 runner, your first \`Scenario\`, \`match\` assertions, schema validation, authentication flows, data-driven \`Scenario Outline\` tables, and a GitHub Actions pipeline. By the end you will have a runnable suite you can drop into any backend repository. If you are weighing Karate against other tools, our [API testing complete guide](/blog/api-testing-complete-guide) and [Postman vs Playwright for API testing](/blog/postman-vs-playwright-api-testing) compare the broader landscape.

---

## Why Karate DSL for API Testing

Most API testing frameworks force a trade-off: either you get readability (Postman, Karate) or you get programmability (REST Assured, Playwright). Karate refuses the trade-off. The \`.feature\` file is human-readable Gherkin, but every line is backed by a powerful expression engine that understands JSON natively, evaluates JavaScript inline, and supports fuzzy matching against schemas.

Here is how Karate compares to the alternatives most teams already know:

| Feature | Karate DSL | REST Assured | Postman | Cucumber + Java |
|---|---|---|---|---|
| Language to learn | Gherkin only | Java | JS in sandbox | Gherkin + Java glue |
| Step definitions required | No (built-in) | N/A | N/A | Yes (you write them) |
| Native JSON assertions | Yes (\`match\`) | Hamcrest matchers | \`pm.expect\` | Manual |
| Parallel execution | Built-in | TestNG/JUnit | Newman flag | TestNG/JUnit |
| Schema validation | Built-in fuzzy match | External lib | External | External |
| Performance testing | Gatling integration | No | No | No |
| Mock server | Built-in | No | Limited | No |

The standout column is "step definitions required." With Cucumber you write a \`.feature\` file and then implement every step in Java. With Karate, \`Given url\`, \`When method get\`, and \`Then status 200\` are already defined. You only write the spec.

---

## Project Setup with Maven

Create a standard Maven project and add the Karate dependency. As of 2026 the JUnit 5 artifact is the recommended entry point. Here is a minimal \`pom.xml\`:

\`\`\`xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>sh.qaskills</groupId>
  <artifactId>karate-api-tests</artifactId>
  <version>1.0.0</version>

  <properties>
    <maven.compiler.release>17</maven.compiler.release>
    <karate.version>1.5.1</karate.version>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>com.intuit.karate</groupId>
      <artifactId>karate-junit5</artifactId>
      <version>\${karate.version}</version>
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
</project>
\`\`\`

The \`<testResources>\` block is important. Karate keeps \`.feature\` files next to the Java runner classes under \`src/test/java\`, so you must tell Maven to copy non-Java resources from that directory into the test classpath. Forgetting this is the single most common reason a beginner sees "feature not found."

Recommended directory layout:

\`\`\`
src/test/java/
  karate-config.js
  users/
    users.feature
    UsersRunner.java
  auth/
    login.feature
\`\`\`

---

## Your First Feature File

Create \`src/test/java/users/users.feature\`. This is the entire test. There is no companion Java file required to make these steps work.

\`\`\`gherkin
Feature: User API CRUD operations

  Background:
    * url 'https://jsonplaceholder.typicode.com'
    * header Accept = 'application/json'

  Scenario: Fetch a single user by id
    Given path 'users', 1
    When method get
    Then status 200
    And match response.id == 1
    And match response.name == 'Leanne Graham'
    And match response.address.city == 'Gwenborough'

  Scenario: List all users returns a non-empty array
    Given path 'users'
    When method get
    Then status 200
    And match response == '#[10]'
    And match each response contains { id: '#number', name: '#string' }
\`\`\`

A few things to notice. The \`Background\` block runs before every \`Scenario\`, so the base \`url\` and headers are shared. The \`*\` is a wildcard step keyword you can use anywhere instead of \`Given\`/\`When\`/\`Then\` when the Gherkin word does not add meaning. The \`match response == '#[10]'\` asserts the array has exactly ten elements, and \`match each\` validates every element against a shape.

---

## Understanding the match Keyword

The \`match\` keyword is the heart of Karate. It is far more expressive than a plain equality assertion because it understands JSON structure and supports "fuzzy" markers for values you cannot predict (like auto-generated IDs or timestamps).

\`\`\`gherkin
Scenario: Fuzzy matching ignores volatile fields
  Given path 'users', 1
  When method get
  Then status 200
  And match response ==
    """
    {
      id: '#number',
      name: '#string',
      username: '#string',
      email: '#regex .+@.+\\\\..+',
      address: '#object',
      phone: '#present',
      website: '#string',
      company: { name: '#string', catchPhrase: '#string', bs: '#string' }
    }
    """
\`\`\`

The triple-quoted block is a "docstring" — Karate parses it as JSON. The markers do the heavy lifting:

| Marker | Meaning |
|---|---|
| \`#string\` | Value must be a non-null string |
| \`#number\` | Value must be a number |
| \`#boolean\` | Value must be a boolean |
| \`#array\` | Value must be a JSON array |
| \`#object\` | Value must be a JSON object |
| \`#present\` | Key must exist (any value) |
| \`#notnull\` | Value must not be null |
| \`#regex EXPR\` | String matches the regular expression |
| \`#[5]\` | Array must have exactly five items |
| \`#? EXPR\` | Custom JavaScript predicate must be true |

This means you can assert the *shape* of a response without coupling your test to volatile data. Combine markers with \`#?\` for self-validating expressions, for example \`age: '#? _ > 18'\` checks the field is greater than eighteen.

---

## Data-Driven Testing with Scenario Outline

When you need to run the same scenario against many inputs, use a \`Scenario Outline\` with an \`Examples\` table. Karate substitutes each row into the \`<placeholder>\` tokens.

\`\`\`gherkin
Feature: Create users with multiple datasets

  Background:
    * url 'https://jsonplaceholder.typicode.com'

  Scenario Outline: Create user <name>
    Given path 'users'
    And request { name: '<name>', username: '<username>', email: '<email>' }
    When method post
    Then status 201
    And match response.name == '<name>'
    And match response.id == '#number'

    Examples:
      | name        | username | email             |
      | Ada Lovelace| ada      | ada@example.com   |
      | Alan Turing | alan     | alan@example.com  |
      | Grace Hopper| grace    | grace@example.com |
\`\`\`

For larger datasets you can drive the table from an external JSON or CSV file using the \`read()\` function and a \`* def\` data table, which scales far better than inline \`Examples\` rows. Data-driven design pairs well with the techniques in our [test case design techniques guide](/skills).

---

## Authentication and Reusable Feature Files

Real APIs require auth. The cleanest pattern in Karate is to put the login flow in its own \`.feature\` file and \`call\` it from anywhere, returning the token into the calling scope.

Create \`auth/login.feature\`:

\`\`\`gherkin
@ignore
Feature: Reusable login

  Scenario: Authenticate and return a bearer token
    Given url authBaseUrl
    And path 'oauth', 'token'
    And form field grant_type = 'password'
    And form field username = user
    And form field password = pass
    When method post
    Then status 200
    * def authToken = response.access_token
\`\`\`

The \`@ignore\` tag stops this feature from running on its own. Now call it from a test:

\`\`\`gherkin
Feature: Protected endpoints

  Background:
    * def login = call read('classpath:auth/login.feature') { user: 'demo', pass: 'secret' }
    * def token = login.authToken
    * url 'https://api.example.com'
    * header Authorization = 'Bearer ' + token

  Scenario: Access a protected resource
    Given path 'account', 'profile'
    When method get
    Then status 200
    And match response.role == '#string'
\`\`\`

The \`{ user: 'demo', pass: 'secret' }\` argument is passed into the called feature's scope, so \`user\` and \`pass\` resolve there. The returned object exposes any variables defined in the called feature, which is how \`login.authToken\` works.

---

## The JUnit 5 Runner

To execute features from your build tool and IDE, add a JUnit 5 runner. Karate provides a \`@Karate.Test\` annotation and a fluent \`Karate.run()\` builder.

\`\`\`java
package users;

import com.intuit.karate.junit5.Karate;

class UsersRunner {

    @Karate.Test
    Karate testUsers() {
        return Karate.run("users").relativeTo(getClass());
    }

    @Karate.Test
    Karate testAll() {
        return Karate.run().tags("~@ignore").relativeTo(getClass());
    }
}
\`\`\`

\`Karate.run("users")\` runs the \`users.feature\` next to this class. The \`tags("~@ignore")\` filter excludes anything tagged \`@ignore\`. Run it with \`mvn test\`.

For full-suite parallel execution, use a dedicated entry point that returns aggregated results:

\`\`\`java
package suite;

import com.intuit.karate.Results;
import com.intuit.karate.Runner;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class ParallelSuiteRunner {

    @Test
    void runAllFeaturesInParallel() {
        Results results = Runner.path("classpath:")
            .tags("~@ignore")
            .outputCucumberJson(true)
            .parallel(4);
        assertEquals(0, results.getFailCount(), results.getErrorMessages());
    }
}
\`\`\`

The \`.parallel(4)\` call runs features across four threads — Karate's parallel engine is scenario-level and requires no extra configuration. This is a major advantage over frameworks where parallelism is a tuning headache.

---

## Configuration and Environments

Karate reads a \`karate-config.js\` file at startup. Use it to switch base URLs per environment based on the \`karate.env\` system property.

\`\`\`javascript
function fn() {
  var env = karate.env || 'dev';
  karate.log('karate.env =', env);

  var config = {
    authBaseUrl: 'https://auth.dev.example.com',
    apiBaseUrl: 'https://api.dev.example.com'
  };

  if (env === 'staging') {
    config.authBaseUrl = 'https://auth.staging.example.com';
    config.apiBaseUrl = 'https://api.staging.example.com';
  } else if (env === 'prod') {
    config.apiBaseUrl = 'https://api.example.com';
    config.authBaseUrl = 'https://auth.example.com';
  }

  karate.configure('connectTimeout', 5000);
  karate.configure('readTimeout', 10000);
  return config;
}
\`\`\`

Run against staging with \`mvn test -Dkarate.env=staging\`. Every variable returned from \`fn()\` becomes a global available in all feature files, so \`apiBaseUrl\` is usable anywhere without re-declaring it.

---

## CI/CD with GitHub Actions

A Karate suite is just a Maven build, so wiring it into CI is straightforward. This workflow runs the suite on every push and pull request, then uploads the HTML report as an artifact.

\`\`\`yaml
name: Karate API Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
          cache: maven

      - name: Run Karate suite
        run: mvn -B test -Dkarate.env=staging

      - name: Upload Karate report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: karate-report
          path: target/karate-reports/
\`\`\`

The \`if: always()\` ensures the report uploads even when tests fail, which is exactly when you most want to inspect it. Karate's HTML report shows every request, response, and assertion inline — far richer than a bare JUnit summary. To go deeper on pipelines, see our [CI/CD testing pipeline with GitHub Actions](/blog/cicd-testing-pipeline-github-actions) guide.

---

## Chaining Requests and Sharing State

Real API workflows are rarely a single call. You create a resource, capture its ID, then read, update, and delete it. Karate makes this chaining trivial because every variable you define with \`* def\` stays in scope for the rest of the scenario.

\`\`\`gherkin
Feature: Full order lifecycle

  Background:
    * url 'https://api.example.com'
    * header Content-Type = 'application/json'

  Scenario: Create, read, update, and delete an order
    # Create
    Given path 'orders'
    And request { item: 'keyboard', quantity: 2 }
    When method post
    Then status 201
    * def orderId = response.id
    * print 'created order:', orderId

    # Read it back
    Given path 'orders', orderId
    When method get
    Then status 200
    And match response.item == 'keyboard'
    And match response.quantity == 2

    # Update
    Given path 'orders', orderId
    And request { quantity: 5 }
    When method patch
    Then status 200
    And match response.quantity == 5

    # Delete
    Given path 'orders', orderId
    When method delete
    Then status 204
\`\`\`

The \`* def orderId = response.id\` line captures the generated ID, and every subsequent step reuses it. The \`* print\` step logs to the report, which is invaluable when debugging a failed transaction. Because the scenario shares one HTTP context, cookies and connection reuse happen automatically.

---

## Embedding JavaScript for Custom Logic

When Gherkin steps are not enough, Karate lets you drop into JavaScript inline. This is how you build dynamic payloads, compute expected values, or transform responses without leaving the feature file.

\`\`\`gherkin
Scenario: Build a dynamic payload and assert a computed field
  * def now = function() { return java.lang.System.currentTimeMillis() }
  * def timestamp = now()
  * def buildOrder =
    """
    function(qty) {
      return { item: 'mouse', quantity: qty, createdAt: timestamp };
    }
    """
  Given url 'https://api.example.com'
  And path 'orders'
  And request buildOrder(3)
  When method post
  Then status 201
  And match response.quantity == 3
  And assert response.total == 3 * 1499
\`\`\`

The \`assert\` keyword evaluates any JavaScript boolean expression, so you can verify computed relationships such as \`total == quantity * unitPrice\`. You can call Java classes directly too — \`java.lang.System.currentTimeMillis()\` shows interop in action. This blend of readable Gherkin and escape-hatch scripting is what lets a single framework serve both manual testers and senior engineers.

---

## Best Practices for Maintainable Suites

Keep the following habits and your Karate suite will stay healthy as it grows:

- **Use \`Background\` for shared setup** but never put assertions there — keep scenarios independent.
- **Extract auth and common flows into \`@ignore\`-tagged callable features** to avoid copy-paste.
- **Prefer fuzzy matchers** (\`#string\`, \`#number\`) over hardcoded values for fields you do not control.
- **Tag scenarios** (\`@smoke\`, \`@regression\`) so CI can run subsets, e.g. \`mvn test -Dkarate.options="--tags @smoke"\`.
- **Validate schemas with \`match each\`** to catch contract drift early — pair this with formal [contract testing](/blog/contract-testing-pact-python-guide) for cross-team APIs.
- **Run in parallel from the start** so the suite never becomes a bottleneck.

---

## Validating Responses Against a JSON Schema File

For large, frequently reused contracts, inline fuzzy matching can become verbose. Karate lets you store a schema definition as a variable (often loaded from a JSON file) and reuse it across scenarios, keeping your feature files lean and your contract definitions in one place.

\`\`\`gherkin
Feature: Reusable schema validation

  Background:
    * url 'https://jsonplaceholder.typicode.com'
    * def userSchema =
      """
      {
        id: '#number',
        name: '#string',
        username: '#string',
        email: '#regex .+@.+',
        address: {
          street: '#string',
          city: '#string',
          zipcode: '#string',
          geo: { lat: '#string', lng: '#string' }
        },
        company: '#object'
      }
      """

  Scenario: A single user matches the reusable schema
    Given path 'users', 1
    When method get
    Then status 200
    And match response == userSchema

  Scenario: Every user in the list matches the schema
    Given path 'users'
    When method get
    Then status 200
    And match each response == userSchema
\`\`\`

By defining \`userSchema\` once in the \`Background\`, both scenarios stay focused on behavior rather than structure. When the contract changes, you update one definition. You can take this further by externalizing the schema into a file — \`* def userSchema = read('classpath:schemas/user-schema.json')\` — so non-test code (or even other teams) can reference the same canonical contract. This pattern is the bridge between Karate's lightweight assertions and formal [contract testing](/blog/contract-testing-pact-vs-spring-cloud-contract-2026) practices, giving you contract confidence without leaving Gherkin.

A practical tip: when a \`match each\` fails, Karate prints the exact index and field that diverged, so a list of two hundred users that breaks on element 147 tells you precisely where the contract drift is. That signal-rich failure output is one of the quiet reasons teams stay on Karate once they adopt it.

---

## Frequently Asked Questions

### What is Karate DSL used for in API testing?

Karate DSL is an open-source framework for testing REST and SOAP APIs, GraphQL endpoints, and even UI flows. It lets you write tests in Gherkin \`.feature\` files without writing step-definition code, validate JSON and XML responses with a powerful \`match\` keyword, chain requests, run data-driven scenarios, and execute everything in parallel.

### How is Karate different from Cucumber?

Cucumber requires you to write Java (or another language) step definitions for every Gherkin line. Karate ships those step definitions built in, so \`Given url\`, \`When method get\`, and \`Then status 200\` work out of the box. You write only the feature file. Karate also adds native JSON support, fuzzy matching, and parallel execution that Cucumber lacks.

### Do I need to know Java to use Karate DSL?

No. You can write complete Karate tests using only Gherkin syntax and Karate's built-in keywords. You only touch Java for the small JUnit runner class that launches the suite. Advanced users can embed JavaScript for custom logic, but everyday API testing requires no programming language knowledge.

### How do I do data-driven testing in Karate?

Use a \`Scenario Outline\` with an \`Examples\` table to run the same scenario across multiple input rows. For larger datasets, store the data in an external JSON or CSV file and load it with Karate's \`read()\` function, then iterate over the rows. Each row substitutes into \`<placeholder>\` tokens in the scenario.

### Can Karate DSL run tests in parallel?

Yes, parallel execution is built in and works at the scenario level. Call \`.parallel(4)\` in a JUnit \`Runner.path(...)\` entry point to run across four threads. Unlike many frameworks, no special thread-safety configuration is needed because each scenario runs in its own isolated context.

### How do I validate a JSON schema in Karate?

Use the \`match\` keyword with fuzzy markers like \`#string\`, \`#number\`, and \`#array\` to assert the shape of a response. Combine it with \`match each response contains { ... }\` to validate every element in an array against the same schema, which catches contract drift without external libraries.

### Does Karate support authentication and tokens?

Yes. Put the login flow in its own \`@ignore\`-tagged feature, then \`call read('classpath:auth/login.feature')\` from any test and read the returned token into a variable. Set it as an \`Authorization\` header in a \`Background\` block so every scenario in the file inherits the authenticated session.

### How do I integrate Karate into a CI/CD pipeline?

Because a Karate suite is a standard Maven (or Gradle) build, run \`mvn test\` in any CI system. In GitHub Actions, check out the repo, set up JDK 17, run \`mvn -B test\`, and upload \`target/karate-reports/\` as an artifact with \`if: always()\` so the rich HTML report is available even when tests fail.

---

## Conclusion

Karate DSL hits a sweet spot that few API testing frameworks reach: tests that a manual tester can read and a senior engineer can extend, all without step-definition boilerplate. You have now built a complete project — Maven dependencies, a JUnit 5 runner, your first scenarios, \`match\` assertions with fuzzy markers, data-driven \`Scenario Outline\` tables, reusable authenticated flows, environment configuration, parallel execution, and a GitHub Actions pipeline. That is a production-ready foundation you can drop into any backend repository today.

The next step is to grow your suite deliberately: tag scenarios for smoke and regression subsets, extract shared flows, and validate response schemas with \`match each\` so contract drift surfaces in CI rather than production. Ready to level up your API testing toolkit? Explore curated, agent-ready [QA skills on qaskills.sh](/skills) and equip your AI coding agent with battle-tested Karate, REST, and contract-testing patterns.
`,
};
