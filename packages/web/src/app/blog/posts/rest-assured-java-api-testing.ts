import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'REST Assured Tutorial — Java API Testing from Basics to CI/CD',
  description:
    'Complete REST Assured tutorial for Java API testing. Covers given-when-then syntax, request specs, response validation, authentication, and CI/CD integration.',
  date: '2026-02-23',
  category: 'Tutorial',
  content: `
REST Assured is the most widely adopted **API testing framework for Java** teams, and for good reason. Its fluent **given-when-then syntax** reads like a specification, Hamcrest matchers make assertions expressive, and deep integration with TestNG and JUnit 5 means it slots into any existing Java project without friction. Whether you are a Java developer writing your first API test or an SDET building a comprehensive regression suite, this **REST Assured tutorial** walks you through everything -- from your first GET request to a fully automated CI/CD pipeline with Allure reporting.

---

## Key Takeaways

- **REST Assured** provides a domain-specific language (DSL) for **Java API testing** that mirrors BDD-style given-when-then specifications
- **RequestSpecBuilder** lets you define reusable base URIs, headers, and authentication so every test starts from a consistent baseline
- JSON path expressions, Hamcrest matchers, and JSON Schema validation give you three layers of **response validation**
- Serialization and deserialization with Jackson or Gson eliminate manual JSON construction and make tests type-safe
- Filters and logging provide full request/response visibility without cluttering your test logic
- Integrating REST Assured into GitHub Actions with Maven Surefire and Allure reports gives you automated regression feedback on every pull request

---

## What Is REST Assured?

**REST Assured** is an open-source Java library that simplifies testing and validating REST APIs. Created by Johan Haleby, it wraps Apache HttpClient behind a fluent DSL that is purpose-built for API testing. Instead of constructing HTTP requests manually and parsing responses with boilerplate, you write expressive chains that read almost like plain English.

The core abstraction follows the **given-when-then** pattern:

- **given()** -- set up the request (headers, query params, body, auth)
- **when()** -- execute the HTTP method (GET, POST, PUT, DELETE)
- **then()** -- assert the response (status code, body fields, headers)

Why do Java teams choose REST Assured over raw HttpClient or other libraries?

- **Fluent API**: Chained method calls produce readable, self-documenting tests
- **Hamcrest integration**: Use \`equalTo()\`, \`hasSize()\`, \`containsString()\`, and dozens of other matchers out of the box
- **JSON and XML support**: First-class JSON path and XML path expressions for navigating response bodies
- **Schema validation**: Validate entire response structures against JSON Schema files
- **Broad ecosystem**: Works seamlessly with TestNG, JUnit 5, Maven, Gradle, Allure, and every major CI/CD platform

REST Assured has been downloaded over 50 million times on Maven Central and remains the default choice for **Java API testing** in enterprise environments.

---

## Getting Started

### Maven Dependencies

Add the following to your \`pom.xml\`:

\`\`\`xml
<dependencies>
  <dependency>
    <groupId>io.rest-assured</groupId>
    <artifactId>rest-assured</artifactId>
    <version>5.5.0</version>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>io.rest-assured</groupId>
    <artifactId>json-schema-validator</artifactId>
    <version>5.5.0</version>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>org.testng</groupId>
    <artifactId>testng</artifactId>
    <version>7.10.2</version>
    <scope>test</scope>
  </dependency>
</dependencies>
\`\`\`

### Gradle Dependencies

If you prefer Gradle, add these to \`build.gradle\`:

\`\`\`groovy
testImplementation 'io.rest-assured:rest-assured:5.5.0'
testImplementation 'io.rest-assured:json-schema-validator:5.5.0'
testImplementation 'org.testng:testng:7.10.2'
\`\`\`

### Static Imports

REST Assured relies heavily on static imports. Add these to the top of every test class:

\`\`\`java
import static io.restassured.RestAssured.*;
import static io.restassured.matcher.RestAssuredMatchers.*;
import static org.hamcrest.Matchers.*;
\`\`\`

### Your First Test

Here is a complete GET test that validates status code, content type, and response body fields:

\`\`\`java
import org.testng.annotations.Test;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

public class UserApiTest {

    @Test
    public void shouldReturnUserById() {
        given()
            .baseUri("https://jsonplaceholder.typicode.com")
            .pathParam("id", 1)
        .when()
            .get("/users/{id}")
        .then()
            .statusCode(200)
            .contentType("application/json")
            .body("name", equalTo("Leanne Graham"))
            .body("email", equalTo("Sincere@april.biz"))
            .body("address.city", equalTo("Gwenborough"));
    }
}
\`\`\`

This single test validates the HTTP status, content type header, top-level fields, and a nested field inside the \`address\` object. The **given-when-then** structure makes the intent immediately clear to anyone reading the code.

---

## Request Specification

As your test suite grows, you will find yourself repeating the same base URI, headers, and authentication in every test. **RequestSpecBuilder** solves this by creating reusable specifications.

### Building a Reusable Request Spec

\`\`\`java
import io.restassured.builder.RequestSpecBuilder;
import io.restassured.specification.RequestSpecification;

public class ApiTestBase {

    protected static RequestSpecification baseSpec;

    @BeforeClass
    public static void setup() {
        baseSpec = new RequestSpecBuilder()
            .setBaseUri("https://api.example.com")
            .setBasePath("/v2")
            .addHeader("Accept", "application/json")
            .addHeader("X-Api-Version", "2.0")
            .setContentType("application/json")
            .build();
    }
}
\`\`\`

Now every test starts with \`given().spec(baseSpec)\` and only adds the request-specific details:

\`\`\`java
@Test
public void shouldListProducts() {
    given()
        .spec(baseSpec)
        .queryParam("category", "electronics")
        .queryParam("limit", 10)
    .when()
        .get("/products")
    .then()
        .statusCode(200)
        .body("products", hasSize(lessThanOrEqualTo(10)));
}
\`\`\`

### Path Parameters

REST Assured supports named path parameters that make URL construction clean:

\`\`\`java
given()
    .spec(baseSpec)
    .pathParam("userId", 42)
    .pathParam("orderId", 100)
.when()
    .get("/users/{userId}/orders/{orderId}")
.then()
    .statusCode(200);
\`\`\`

### Authentication

REST Assured supports multiple authentication schemes:

**Basic Auth:**

\`\`\`java
given()
    .auth().basic("username", "password")
.when()
    .get("/protected/resource")
.then()
    .statusCode(200);
\`\`\`

**OAuth 2.0 Bearer Token:**

\`\`\`java
given()
    .auth().oauth2("your-access-token-here")
.when()
    .get("/api/profile")
.then()
    .statusCode(200);
\`\`\`

**API Key in Header:**

\`\`\`java
given()
    .header("X-API-Key", "your-api-key")
.when()
    .get("/api/data")
.then()
    .statusCode(200);
\`\`\`

For enterprise projects, embed the auth into your \`RequestSpecBuilder\` so that every test automatically includes the correct credentials without duplication.

---

## Response Validation

The \`then()\` section is where REST Assured truly shines. You can combine **Hamcrest matchers**, JSON path expressions, and schema validation for comprehensive response assertions.

### Hamcrest Matchers

Hamcrest provides a rich library of matchers:

\`\`\`java
.then()
    .statusCode(200)
    .body("name", equalTo("Widget"))
    .body("price", greaterThan(0.0f))
    .body("tags", hasItems("sale", "new"))
    .body("tags", hasSize(3))
    .body("description", containsString("premium"))
    .body("metadata", notNullValue());
\`\`\`

### Nested JSON Validation

Use dot notation to navigate deeply nested structures:

\`\`\`java
.then()
    .body("user.address.geo.lat", equalTo("-37.3159"))
    .body("user.company.name", equalTo("Romaguera-Crona"))
    .body("user.address.zipcode", matchesPattern("\\\\d{5}(-\\\\d{4})?"));
\`\`\`

### Array Validation

REST Assured provides powerful array assertions using JSON path:

\`\`\`java
.then()
    .body("users", hasSize(10))
    .body("users[0].name", equalTo("Alice"))
    .body("users.findAll { it.age > 30 }.name", hasItems("Bob", "Carol"))
    .body("users.collect { it.email }", everyItem(containsString("@")));
\`\`\`

The Groovy GPath syntax lets you filter, collect, and aggregate array elements directly in your assertions.

### Header and Cookie Assertions

\`\`\`java
.then()
    .header("Content-Type", containsString("application/json"))
    .header("Cache-Control", equalTo("no-cache"))
    .cookie("session_id", notNullValue());
\`\`\`

### JSON Schema Validation

For full structural validation, assert the entire response against a JSON Schema file stored in \`src/test/resources\`:

\`\`\`java
import static io.restassured.module.jsv.JsonSchemaValidator.matchesJsonSchemaInClasspath;

.then()
    .body(matchesJsonSchemaInClasspath("schemas/user-response.json"));
\`\`\`

This catches breaking changes -- missing fields, type changes, unexpected nulls -- automatically. Pair it with your CI pipeline for contract enforcement on every build.

---

## Serialization and Deserialization

Manually constructing JSON strings for request bodies is error-prone and hard to maintain. REST Assured integrates with **Jackson** and **Gson** to serialize Java objects to JSON and deserialize responses back into POJOs.

### Sending a POJO as Request Body

\`\`\`java
public class CreateUserRequest {
    private String name;
    private String email;
    private String role;

    // constructors, getters, setters
    public CreateUserRequest(String name, String email, String role) {
        this.name = name;
        this.email = email;
        this.role = role;
    }
    // getters and setters omitted for brevity
}
\`\`\`

\`\`\`java
@Test
public void shouldCreateUser() {
    CreateUserRequest newUser = new CreateUserRequest(
        "Jane Smith", "jane@example.com", "admin"
    );

    given()
        .spec(baseSpec)
        .body(newUser)
    .when()
        .post("/users")
    .then()
        .statusCode(201)
        .body("name", equalTo("Jane Smith"))
        .body("id", notNullValue());
}
\`\`\`

REST Assured automatically serializes the \`CreateUserRequest\` object to JSON using Jackson (if it is on the classpath) or Gson as a fallback.

### Deserializing Responses to Java Objects

\`\`\`java
@Test
public void shouldDeserializeUserResponse() {
    UserResponse user = given()
        .spec(baseSpec)
        .pathParam("id", 1)
    .when()
        .get("/users/{id}")
    .then()
        .statusCode(200)
        .extract()
        .as(UserResponse.class);

    assertThat(user.getName()).isEqualTo("Leanne Graham");
    assertThat(user.getEmail()).contains("@");
    assertThat(user.getAddress().getCity()).isEqualTo("Gwenborough");
}
\`\`\`

### Extracting Partial Responses

Sometimes you only need a single field from the response:

\`\`\`java
String userId = given()
    .spec(baseSpec)
    .body(newUser)
.when()
    .post("/users")
.then()
    .statusCode(201)
    .extract()
    .path("id");

// Use userId in subsequent requests
given()
    .spec(baseSpec)
    .pathParam("id", userId)
.when()
    .get("/users/{id}")
.then()
    .statusCode(200);
\`\`\`

This pattern is essential for **chained API tests** where the output of one request feeds into the next.

---

## Advanced Features

### Filters

Filters intercept every request and response, making them ideal for logging, header injection, or token refresh logic:

\`\`\`java
RestAssured.filters(new RequestLoggingFilter(), new ResponseLoggingFilter());
\`\`\`

You can also write custom filters:

\`\`\`java
RestAssured.filters((requestSpec, responseSpec, filterContext) -> {
    requestSpec.header("X-Request-Id", UUID.randomUUID().toString());
    return filterContext.next(requestSpec, responseSpec);
});
\`\`\`

### Request and Response Logging

For debugging, enable logging at the request or response level:

\`\`\`java
given()
    .log().all()    // logs method, URI, headers, body
.when()
    .get("/users")
.then()
    .log().ifError() // only logs response when status >= 400
    .statusCode(200);
\`\`\`

Other logging options include \`.log().body()\`, \`.log().headers()\`, and \`.log().ifValidationFails()\`.

### Multi-Part File Uploads

\`\`\`java
@Test
public void shouldUploadFile() {
    File testFile = new File("src/test/resources/test-document.pdf");

    given()
        .spec(baseSpec)
        .multiPart("file", testFile, "application/pdf")
        .multiPart("description", "Test document upload")
    .when()
        .post("/documents/upload")
    .then()
        .statusCode(201)
        .body("filename", equalTo("test-document.pdf"))
        .body("size", greaterThan(0));
}
\`\`\`

### File Downloads

\`\`\`java
@Test
public void shouldDownloadReport() {
    byte[] fileBytes = given()
        .spec(baseSpec)
    .when()
        .get("/reports/monthly.pdf")
    .then()
        .statusCode(200)
        .contentType("application/pdf")
        .extract()
        .asByteArray();

    assertThat(fileBytes.length).isGreaterThan(0);
}
\`\`\`

### SSL Configuration

For testing services with self-signed certificates:

\`\`\`java
RestAssured.useRelaxedHTTPSValidation();

// Or for a specific keystore
RestAssured.trustStore("src/test/resources/truststore.jks", "password");
\`\`\`

### Redirect Handling

\`\`\`java
given()
    .redirects().follow(false) // disable auto-follow
.when()
    .get("/old-endpoint")
.then()
    .statusCode(301)
    .header("Location", equalTo("/new-endpoint"));
\`\`\`

---

## Integration with TestNG and JUnit 5

REST Assured is framework-agnostic, but it works especially well with **TestNG** and **JUnit 5** -- the two most popular Java test frameworks.

### TestNG: Data-Driven Testing with DataProviders

\`\`\`java
import org.testng.annotations.*;

public class UserApiDataDrivenTest extends ApiTestBase {

    @DataProvider(name = "userIds")
    public Object[][] userIds() {
        return new Object[][] {
            { 1, "Leanne Graham" },
            { 2, "Ervin Howell" },
            { 3, "Clementine Bauch" }
        };
    }

    @Test(dataProvider = "userIds")
    public void shouldReturnCorrectUserName(int id, String expectedName) {
        given()
            .spec(baseSpec)
            .pathParam("id", id)
        .when()
            .get("/users/{id}")
        .then()
            .statusCode(200)
            .body("name", equalTo(expectedName));
    }
}
\`\`\`

### JUnit 5: @BeforeAll Setup and Parameterized Tests

\`\`\`java
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ProductApiTest {

    @BeforeAll
    static void setup() {
        RestAssured.baseURI = "https://api.example.com";
        RestAssured.basePath = "/v2";
    }

    @ParameterizedTest
    @ValueSource(strings = {"electronics", "books", "clothing"})
    void shouldReturnProductsByCategory(String category) {
        given()
            .queryParam("category", category)
        .when()
            .get("/products")
        .then()
            .statusCode(200)
            .body("products", not(empty()))
            .body("products.every { it.category == '" + category + "' }", is(true));
    }

    @Test
    void shouldReturn404ForNonexistentProduct() {
        given()
            .pathParam("id", 999999)
        .when()
            .get("/products/{id}")
        .then()
            .statusCode(404)
            .body("error", equalTo("Product not found"));
    }
}
\`\`\`

### Parallel Execution

For TestNG, configure parallel execution in \`testng.xml\`:

\`\`\`xml
<suite name="API Tests" parallel="methods" thread-count="8">
  <test name="All API Tests">
    <classes>
      <class name="com.example.tests.UserApiTest"/>
      <class name="com.example.tests.ProductApiTest"/>
    </classes>
  </test>
</suite>
\`\`\`

For JUnit 5, add a \`junit-platform.properties\` file:

\`\`\`properties
junit.jupiter.execution.parallel.enabled=true
junit.jupiter.execution.parallel.mode.default=concurrent
junit.jupiter.execution.parallel.config.fixed.parallelism=8
\`\`\`

Parallel execution can cut your API test suite time by 60-80%, which is critical for fast CI/CD feedback loops.

---

## CI/CD Integration

A REST Assured test suite is only valuable if it runs automatically on every code change. Here is how to integrate it into your **CI/CD pipeline**.

### Maven Surefire Plugin

Configure the Surefire plugin in your \`pom.xml\` to discover and run your tests:

\`\`\`xml
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-surefire-plugin</artifactId>
      <version>3.2.5</version>
      <configuration>
        <suiteXmlFiles>
          <suiteXmlFile>testng.xml</suiteXmlFile>
        </suiteXmlFiles>
        <parallel>methods</parallel>
        <threadCount>8</threadCount>
      </configuration>
    </plugin>
  </plugins>
</build>
\`\`\`

### GitHub Actions Workflow

\`\`\`yaml
name: API Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  api-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: 'maven'

      - name: Run API tests
        run: mvn test -Dtest.env=ci
        env:
          API_BASE_URL: \${{ secrets.API_BASE_URL }}
          API_TOKEN: \${{ secrets.API_TOKEN }}

      - name: Generate Allure report
        if: always()
        uses: simple-elf/allure-report-action@v1.7
        with:
          allure_results: target/allure-results

      - name: Upload Allure report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: allure-report
          path: allure-report
\`\`\`

### Allure Report Generation

Add the Allure dependency and annotations for rich reporting:

\`\`\`xml
<dependency>
  <groupId>io.qameta.allure</groupId>
  <artifactId>allure-rest-assured</artifactId>
  <version>2.27.0</version>
  <scope>test</scope>
</dependency>
\`\`\`

Attach the Allure filter to capture request/response details in reports:

\`\`\`java
@BeforeAll
static void setup() {
    RestAssured.filters(new AllureRestAssured());
}
\`\`\`

Now every test execution produces detailed HTML reports showing request parameters, response bodies, and timing. For a deeper dive into CI/CD pipeline design, see our [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions).

---

## REST Assured vs Alternatives

Choosing the right **API testing framework for Java** depends on your team's language preference, existing toolchain, and testing complexity. Here is how REST Assured compares to the leading alternatives:

| Feature | REST Assured | Playwright API | Karate DSL | Java HttpClient |
|---|---|---|---|---|
| **Language** | Java | TypeScript/JS | Gherkin + Java | Java |
| **Syntax style** | Fluent given-when-then | Async/await | BDD feature files | Imperative |
| **Learning curve** | Low for Java devs | Low for JS devs | Medium | Medium |
| **JSON path support** | Built-in (GPath) | Manual parsing | Built-in | Manual parsing |
| **Schema validation** | JSON Schema module | Third-party | Built-in | Manual |
| **Parallel execution** | Via TestNG/JUnit | Built-in | Built-in | Manual |
| **Reporting** | Allure, ExtentReports | Playwright HTML | Cucumber reports | Manual |
| **Community size** | Very large | Large | Medium | Large (JDK standard) |
| **Best for** | Java API testing | Full-stack JS teams | BDD-focused teams | Minimal dependency |

**When to choose REST Assured**: You are a Java team, you want expressive fluent syntax, and you need tight integration with TestNG or JUnit. It is the default choice for **Java API testing** in enterprise environments.

**When to choose Playwright API**: Your team already uses Playwright for E2E testing and wants a single toolchain for both UI and API tests.

**When to choose Karate**: You want non-programmers (BAs, manual testers) to write API tests using Gherkin syntax.

**When to choose Java HttpClient**: You need zero external dependencies and are comfortable writing more verbose code.

---

## Automate API Testing with AI Agents

AI coding agents like Claude Code, Cursor, and Windsurf can generate REST Assured tests from your API specifications -- but only if they have the right context. Installing a **QA skill** gives your agent expert-level knowledge of REST Assured patterns, best practices, and common pitfalls.

Install REST Assured testing skills with a single command:

\`\`\`bash
npx @qaskills/cli add rest-assured-api
\`\`\`

\`\`\`bash
npx @qaskills/cli add restassured-api-framework
\`\`\`

Once installed, your AI agent will:

- Generate tests that follow the **given-when-then** pattern consistently
- Use **RequestSpecBuilder** for reusable configurations instead of duplicating setup
- Apply proper **Hamcrest matchers** for expressive, readable assertions
- Include **JSON Schema validation** for contract enforcement
- Structure test suites with proper base classes, data providers, and parallel execution

Browse all available QA skills at [/skills](/skills) or get started with the [getting started guide](/getting-started). For broader API testing strategies beyond REST Assured, see our [API testing complete guide](/blog/api-testing-complete-guide).

---

## Frequently Asked Questions

### Is REST Assured still relevant in 2026?

Yes. REST Assured remains the most popular **Java API testing** library by a wide margin. It receives regular updates, has a massive community, and integrates with every major Java testing framework and CI/CD platform. For Java teams, it is still the best choice for API test automation.

### Can REST Assured test GraphQL APIs?

REST Assured can send POST requests with GraphQL query bodies, but it does not have built-in GraphQL awareness. You would send the query as a JSON body with a \`query\` field and validate the response like any other JSON. For teams heavily invested in GraphQL, consider pairing REST Assured with a GraphQL-specific validation library.

### How does REST Assured handle asynchronous APIs?

REST Assured is inherently synchronous -- it sends a request and waits for the response. For async APIs (webhooks, message queues, long-running operations), you need to combine REST Assured with polling strategies. Use \`Awaitility\` to poll an endpoint until the expected state is reached:

\`\`\`java
await().atMost(30, SECONDS).pollInterval(2, SECONDS).until(() -> {
    int status = given().spec(baseSpec)
        .pathParam("id", jobId)
        .get("/jobs/{id}")
        .then().extract().path("status");
    return "completed".equals(status);
});
\`\`\`

### What is the difference between REST Assured and Karate?

REST Assured is a Java library that you use inside standard Java test classes. **Karate** is a standalone framework that uses Gherkin-like feature files to define API tests. REST Assured gives you full control of Java and integrates naturally with TestNG/JUnit, while Karate is designed for teams that prefer a BDD-style, no-code approach to API testing.

### How do I run REST Assured tests in parallel safely?

The key is avoiding shared mutable state. Do not use static fields for test data, create unique resources per test (use unique IDs or timestamps), and configure your test runner for parallel execution. With TestNG, set \`parallel="methods"\` in your suite XML. With JUnit 5, enable parallel mode via \`junit-platform.properties\`. REST Assured itself is thread-safe as long as you avoid modifying \`RestAssured.baseURI\` or other static config during test execution -- use \`RequestSpecBuilder\` instead.
`,
};
