---
name: REST Assured API Testing
description: API testing skill using REST Assured for Java, covering request specifications, response validation, authentication, JSON schema validation, and serialization.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [rest-assured, api-testing, java, rest, http, json-schema]
testingTypes: [api]
frameworks: [rest-assured]
languages: [java]
domains: [api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# REST Assured API Testing Skill

You are an expert QA automation engineer specializing in REST Assured API testing with Java. When the user asks you to write, review, or debug REST Assured tests, follow these detailed instructions.

## Core Principles

1. **Given-When-Then** -- Structure every test using REST Assured's BDD syntax.
2. **Request/Response specs** -- Reuse common configurations via specification builders.
3. **Type-safe models** -- Deserialize responses into POJOs for compile-time safety.
4. **Schema validation** -- Validate response structure with JSON Schema.
5. **Logging** -- Log requests and responses on failure for debugging.

## Project Structure

```
src/
  main/java/com/example/
    models/
      User.java
      Product.java
      ApiError.java
    specs/
      RequestSpecs.java
      ResponseSpecs.java
    utils/
      AuthHelper.java
      TestDataHelper.java
  test/java/com/example/
    tests/
      BaseApiTest.java
      UsersApiTest.java
      ProductsApiTest.java
      AuthApiTest.java
    schemas/
      user-schema.json
      product-schema.json
      error-schema.json
  test/resources/
    test-data/
      users.json
    config.properties
pom.xml
```

## Maven Dependencies

```xml
<dependencies>
    <dependency>
        <groupId>io.rest-assured</groupId>
        <artifactId>rest-assured</artifactId>
        <version>5.4.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>io.rest-assured</groupId>
        <artifactId>json-schema-validator</artifactId>
        <version>5.4.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>io.rest-assured</groupId>
        <artifactId>json-path</artifactId>
        <version>5.4.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.testng</groupId>
        <artifactId>testng</artifactId>
        <version>7.9.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.hamcrest</groupId>
        <artifactId>hamcrest</artifactId>
        <version>2.2</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>2.16.1</version>
    </dependency>
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <version>1.18.30</version>
        <scope>provided</scope>
    </dependency>
</dependencies>
```

## POJO Models

```java
package com.example.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class User {
    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
    private boolean active;
    private String createdAt;
    private String updatedAt;
}

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserRequest {
    private String email;
    private String firstName;
    private String lastName;
    private String password;
    private String role;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ApiError {
    private int statusCode;
    private String message;
    private String error;
    private Map<String, List<String>> details;
}
```

## Request and Response Specifications

```java
package com.example.specs;

import io.restassured.builder.RequestSpecBuilder;
import io.restassured.builder.ResponseSpecBuilder;
import io.restassured.filter.log.LogDetail;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import io.restassured.specification.ResponseSpecification;

import static org.hamcrest.Matchers.*;

public class RequestSpecs {

    public static RequestSpecification baseSpec() {
        return new RequestSpecBuilder()
            .setBaseUri(System.getProperty("base.url", "http://localhost:3000"))
            .setBasePath("/api")
            .setContentType(ContentType.JSON)
            .setAccept(ContentType.JSON)
            .log(LogDetail.ALL)
            .build();
    }

    public static RequestSpecification authSpec(String token) {
        return new RequestSpecBuilder()
            .addRequestSpecification(baseSpec())
            .addHeader("Authorization", "Bearer " + token)
            .build();
    }

    public static RequestSpecification adminSpec() {
        String token = AuthHelper.getAdminToken();
        return authSpec(token);
    }
}

public class ResponseSpecs {

    public static ResponseSpecification successResponse() {
        return new ResponseSpecBuilder()
            .expectStatusCode(200)
            .expectContentType(ContentType.JSON)
            .expectResponseTime(lessThan(5000L))
            .log(LogDetail.ALL)
            .build();
    }

    public static ResponseSpecification createdResponse() {
        return new ResponseSpecBuilder()
            .expectStatusCode(201)
            .expectContentType(ContentType.JSON)
            .build();
    }

    public static ResponseSpecification noContentResponse() {
        return new ResponseSpecBuilder()
            .expectStatusCode(204)
            .build();
    }

    public static ResponseSpecification notFoundResponse() {
        return new ResponseSpecBuilder()
            .expectStatusCode(404)
            .expectContentType(ContentType.JSON)
            .expectBody("message", notNullValue())
            .build();
    }

    public static ResponseSpecification validationErrorResponse() {
        return new ResponseSpecBuilder()
            .expectStatusCode(400)
            .expectContentType(ContentType.JSON)
            .expectBody("message", notNullValue())
            .build();
    }
}
```

## Base Test Class

```java
package com.example.tests;

import com.example.specs.RequestSpecs;
import io.restassured.RestAssured;
import io.restassured.specification.RequestSpecification;
import org.testng.annotations.BeforeClass;

public abstract class BaseApiTest {
    protected RequestSpecification requestSpec;

    @BeforeClass
    public void setUp() {
        RestAssured.enableLoggingOfRequestAndResponseIfValidationFails();
        requestSpec = RequestSpecs.baseSpec();
    }

    protected String getAuthToken() {
        return given()
            .spec(requestSpec)
            .body(Map.of(
                "email", "admin@example.com",
                "password", "AdminPass123!"
            ))
            .when()
            .post("/auth/login")
            .then()
            .statusCode(200)
            .extract()
            .path("token");
    }
}
```

## Writing Tests

### CRUD Tests

```java
package com.example.tests;

import com.example.models.User;
import com.example.models.CreateUserRequest;
import com.example.specs.ResponseSpecs;
import io.restassured.response.Response;
import org.testng.annotations.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

public class UsersApiTest extends BaseApiTest {

    @Test(description = "Create a new user")
    public void testCreateUser() {
        CreateUserRequest newUser = CreateUserRequest.builder()
            .email("test-" + System.currentTimeMillis() + "@example.com")
            .firstName("Test")
            .lastName("User")
            .password("SecurePass123!")
            .role("user")
            .build();

        User createdUser = given()
            .spec(requestSpec)
            .body(newUser)
        .when()
            .post("/users")
        .then()
            .spec(ResponseSpecs.createdResponse())
            .body("id", notNullValue())
            .body("email", equalTo(newUser.getEmail()))
            .body("firstName", equalTo(newUser.getFirstName()))
            .body("role", equalTo("user"))
            .extract()
            .as(User.class);

        assertThat(createdUser.getId()).isNotEmpty();
        assertThat(createdUser.getEmail()).isEqualTo(newUser.getEmail());
    }

    @Test(description = "Get user by ID")
    public void testGetUserById() {
        // First create a user
        String userId = createTestUser();

        given()
            .spec(requestSpec)
            .pathParam("id", userId)
        .when()
            .get("/users/{id}")
        .then()
            .spec(ResponseSpecs.successResponse())
            .body("id", equalTo(userId))
            .body("email", notNullValue())
            .body("firstName", notNullValue());
    }

    @Test(description = "Update user")
    public void testUpdateUser() {
        String userId = createTestUser();

        given()
            .spec(requestSpec)
            .pathParam("id", userId)
            .body(Map.of("firstName", "Updated"))
        .when()
            .patch("/users/{id}")
        .then()
            .spec(ResponseSpecs.successResponse())
            .body("firstName", equalTo("Updated"));
    }

    @Test(description = "Delete user")
    public void testDeleteUser() {
        String userId = createTestUser();

        given()
            .spec(requestSpec)
            .pathParam("id", userId)
        .when()
            .delete("/users/{id}")
        .then()
            .spec(ResponseSpecs.noContentResponse());

        // Verify deletion
        given()
            .spec(requestSpec)
            .pathParam("id", userId)
        .when()
            .get("/users/{id}")
        .then()
            .spec(ResponseSpecs.notFoundResponse());
    }

    @Test(description = "List users with pagination")
    public void testListUsersWithPagination() {
        given()
            .spec(requestSpec)
            .queryParam("page", 1)
            .queryParam("pageSize", 5)
        .when()
            .get("/users")
        .then()
            .spec(ResponseSpecs.successResponse())
            .body("data", hasSize(lessThanOrEqualTo(5)))
            .body("page", equalTo(1))
            .body("pageSize", equalTo(5))
            .body("total", greaterThanOrEqualTo(0));
    }

    private String createTestUser() {
        CreateUserRequest user = CreateUserRequest.builder()
            .email("test-" + System.currentTimeMillis() + "@example.com")
            .firstName("Test")
            .lastName("User")
            .password("SecurePass123!")
            .build();

        return given()
            .spec(requestSpec)
            .body(user)
            .post("/users")
            .then()
            .statusCode(201)
            .extract()
            .path("id");
    }
}
```

### JSON Schema Validation

```json
// schemas/user-schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "email", "firstName", "lastName", "role", "createdAt"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "email": { "type": "string", "format": "email" },
    "firstName": { "type": "string", "minLength": 1 },
    "lastName": { "type": "string", "minLength": 1 },
    "role": { "type": "string", "enum": ["admin", "user", "viewer"] },
    "active": { "type": "boolean" },
    "createdAt": { "type": "string", "format": "date-time" }
  },
  "additionalProperties": false
}
```

```java
import static io.restassured.module.jsv.JsonSchemaValidator.matchesJsonSchemaInClasspath;

@Test(description = "Response should match JSON schema")
public void testUserResponseSchema() {
    given()
        .spec(requestSpec)
    .when()
        .get("/users/" + knownUserId)
    .then()
        .statusCode(200)
        .body(matchesJsonSchemaInClasspath("schemas/user-schema.json"));
}
```

### Authentication Tests

```java
@Test(description = "Should authenticate with valid credentials")
public void testValidLogin() {
    given()
        .spec(requestSpec)
        .body(Map.of(
            "email", "admin@example.com",
            "password", "AdminPass123!"
        ))
    .when()
        .post("/auth/login")
    .then()
        .statusCode(200)
        .body("token", notNullValue())
        .body("expiresIn", greaterThan(0))
        .body("user.email", equalTo("admin@example.com"))
        .body("user.role", equalTo("admin"));
}

@Test(description = "Should reject invalid credentials")
public void testInvalidLogin() {
    given()
        .spec(requestSpec)
        .body(Map.of(
            "email", "admin@example.com",
            "password", "wrongpassword"
        ))
    .when()
        .post("/auth/login")
    .then()
        .statusCode(401)
        .body("message", equalTo("Invalid credentials"));
}

@Test(description = "Protected endpoint requires auth token")
public void testProtectedEndpoint() {
    // Without token
    given()
        .spec(requestSpec)
    .when()
        .get("/users/me")
    .then()
        .statusCode(401);

    // With valid token
    String token = getAuthToken();
    given()
        .spec(requestSpec)
        .header("Authorization", "Bearer " + token)
    .when()
        .get("/users/me")
    .then()
        .statusCode(200)
        .body("email", notNullValue());
}
```

### Validation Error Tests

```java
@Test(description = "Should return validation errors for invalid input")
public void testCreateUserValidation() {
    // Missing required fields
    given()
        .spec(requestSpec)
        .body(Map.of("firstName", "Test"))
    .when()
        .post("/users")
    .then()
        .statusCode(400)
        .body("details.email", notNullValue())
        .body("details.password", notNullValue());
}

@Test(description = "Should reject invalid email format")
public void testInvalidEmailFormat() {
    given()
        .spec(requestSpec)
        .body(Map.of(
            "email", "not-an-email",
            "firstName", "Test",
            "lastName", "User",
            "password", "SecurePass123!"
        ))
    .when()
        .post("/users")
    .then()
        .statusCode(400)
        .body("details.email[0]", containsString("valid email"));
}
```

### Response Extraction

```java
// Extract single value
String userId = given()
    .spec(requestSpec)
    .get("/users/me")
    .then()
    .extract()
    .path("id");

// Extract as POJO
User user = given()
    .spec(requestSpec)
    .get("/users/me")
    .then()
    .extract()
    .as(User.class);

// Extract list
List<User> users = given()
    .spec(requestSpec)
    .get("/users")
    .then()
    .extract()
    .jsonPath()
    .getList("data", User.class);

// Extract headers
String requestId = given()
    .spec(requestSpec)
    .get("/users")
    .then()
    .extract()
    .header("X-Request-Id");

// Extract response time
long responseTime = given()
    .spec(requestSpec)
    .get("/health")
    .then()
    .extract()
    .time();
```

### File Upload

```java
@Test(description = "Should upload a file")
public void testFileUpload() {
    File file = new File("src/test/resources/test-data/sample.pdf");

    given()
        .spec(requestSpec)
        .contentType(ContentType.MULTIPART)
        .multiPart("file", file, "application/pdf")
        .formParam("description", "Test upload")
    .when()
        .post("/files/upload")
    .then()
        .statusCode(201)
        .body("filename", equalTo("sample.pdf"))
        .body("size", greaterThan(0));
}
```

## Best Practices

1. **Use Given-When-Then structure** -- Every test should clearly separate setup, action, and assertion.
2. **Create reusable specs** -- Use `RequestSpecBuilder` and `ResponseSpecBuilder` for DRY code.
3. **Deserialize to POJOs** -- Type-safe models catch issues at compile time.
4. **Validate schemas** -- JSON schema validation ensures API contracts are honored.
5. **Log on failure** -- Use `enableLoggingOfRequestAndResponseIfValidationFails()`.
6. **Use Hamcrest matchers** -- They compose well with REST Assured assertions.
7. **Clean up test data** -- Delete created resources in `@AfterMethod`.
8. **Parameterize with DataProvider** -- Avoid duplicating tests for similar scenarios.
9. **Check response times** -- Include performance assertions in API tests.
10. **Test negative cases** -- Invalid input, missing auth, wrong methods.

## Anti-Patterns to Avoid

1. **Hardcoded base URLs** -- Use system properties or config files.
2. **No assertions** -- A test that only checks status code is incomplete.
3. **Chained test dependencies** -- Each test must stand alone.
4. **Verbose inline specs** -- Extract common settings into specs.
5. **Ignoring response headers** -- Headers contain important metadata.
6. **Not testing error responses** -- Error payloads should be validated too.
7. **Using `body()` with raw strings** -- Use POJOs or Map.of() for request bodies.
8. **Not validating response schema** -- Schema changes can break consumers.
9. **Testing only happy paths** -- Error handling is where most bugs hide.
10. **Synchronous test execution** -- Use TestNG parallel execution for faster feedback.
