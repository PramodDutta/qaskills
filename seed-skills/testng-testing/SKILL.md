---
name: TestNG Testing
description: Advanced Java testing with TestNG covering data providers, parallel execution, test groups, XML suite configuration, listeners, soft assertions, and dependency management.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [testng, java, data-providers, parallel-testing, test-groups, xml-suite, listeners, tdd]
testingTypes: [unit, integration]
frameworks: [testng]
languages: [java]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# TestNG Testing Skill

You are an expert Java developer specializing in testing with TestNG. When the user asks you to write, review, or debug TestNG tests, follow these detailed instructions to produce robust test suites that leverage TestNG's powerful features for grouping, parallelism, data-driven testing, and flexible configuration.

## Core Principles

1. **Test behavior through public APIs** -- Verify observable outcomes rather than internal implementation details that may change during refactoring.
2. **One logical assertion per test** -- Each `@Test` method should verify a single behavior for precise failure diagnosis.
3. **Arrange-Act-Assert** -- Structure every test into setup, execution, and verification phases separated by blank lines.
4. **Use data providers for parameterization** -- Leverage `@DataProvider` to drive tests with multiple input/output combinations without code duplication.
5. **Group tests by category** -- Use `groups` to classify tests as "unit", "integration", "smoke", or "regression" for selective execution.
6. **Prefer independent tests** -- Minimize `dependsOnMethods` usage; design tests that can run in any order or in parallel.
7. **Configure via XML suites** -- Use `testng.xml` for suite-level configuration including parallel execution, thread counts, and group selection.

## Project Structure

```
src/
  main/java/com/example/
    service/
      UserService.java
      PaymentService.java
    model/
      User.java
      Order.java
    repository/
      UserRepository.java
    util/
      Validators.java
  test/java/com/example/
    service/
      UserServiceTest.java
      PaymentServiceTest.java
    model/
      UserTest.java
      OrderTest.java
    util/
      ValidatorsTest.java
    integration/
      UserPaymentFlowIT.java
    dataproviders/
      UserDataProvider.java
    listeners/
      RetryAnalyzer.java
      TestReportListener.java
  test/resources/
    testng.xml
    testng-smoke.xml
    testng-regression.xml
pom.xml
```

## Dependencies

### Maven (pom.xml)
```xml
<dependencies>
    <dependency>
        <groupId>org.testng</groupId>
        <artifactId>testng</artifactId>
        <version>7.10.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.mockito</groupId>
        <artifactId>mockito-core</artifactId>
        <version>5.14.0</version>
        <scope>test</scope>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-surefire-plugin</artifactId>
            <version>3.2.5</version>
            <configuration>
                <suiteXmlFiles>
                    <suiteXmlFile>src/test/resources/testng.xml</suiteXmlFile>
                </suiteXmlFiles>
            </configuration>
        </plugin>
    </plugins>
</build>
```

## Basic Test Structure

```java
import org.testng.annotations.*;
import static org.testng.Assert.*;

public class UserServiceTest {

    private UserService userService;
    private UserRepository userRepository;

    @BeforeMethod
    public void setUp() {
        userRepository = new InMemoryUserRepository();
        userService = new UserService(userRepository);
    }

    @AfterMethod
    public void tearDown() {
        userRepository = null;
        userService = null;
    }

    @Test(groups = "unit")
    public void createUser_withValidData_returnsUser() {
        CreateUserRequest request = new CreateUserRequest("Alice", "alice@example.com", 30);

        User user = userService.createUser(request);

        assertNotNull(user);
        assertEquals(user.getName(), "Alice");
        assertEquals(user.getEmail(), "alice@example.com");
    }

    @Test(groups = "unit", expectedExceptions = IllegalArgumentException.class)
    public void createUser_withoutEmail_throwsException() {
        CreateUserRequest request = new CreateUserRequest("Bob", null, 25);

        userService.createUser(request);
    }

    @Test(groups = "unit")
    public void createUser_withDuplicateEmail_throwsException() {
        CreateUserRequest request = new CreateUserRequest("Alice", "alice@example.com", 30);
        userService.createUser(request);

        assertThrows(DuplicateEmailException.class, () -> userService.createUser(request));
    }
}
```

## Data Providers

### Inline Data Provider
```java
public class ValidatorTest {

    @DataProvider(name = "validEmails")
    public Object[][] validEmailProvider() {
        return new Object[][] {
            { "user@example.com" },
            { "admin@test.org" },
            { "user.name@domain.co.uk" },
            { "user+tag@example.com" },
        };
    }

    @DataProvider(name = "invalidEmails")
    public Object[][] invalidEmailProvider() {
        return new Object[][] {
            { "" },
            { "not-an-email" },
            { "@domain.com" },
            { "user@" },
            { "user @domain.com" },
        };
    }

    @Test(dataProvider = "validEmails", groups = "unit")
    public void isValidEmail_withValidInput_returnsTrue(String email) {
        assertTrue(Validators.isValidEmail(email),
            "Expected valid: " + email);
    }

    @Test(dataProvider = "invalidEmails", groups = "unit")
    public void isValidEmail_withInvalidInput_returnsFalse(String email) {
        assertFalse(Validators.isValidEmail(email),
            "Expected invalid: " + email);
    }
}
```

### External Data Provider Class
```java
public class UserDataProvider {

    @DataProvider(name = "userCreationData")
    public static Object[][] provideUserCreationData() {
        return new Object[][] {
            { "Alice", "alice@example.com", 30, true },
            { "Bob", "bob@test.org", 25, true },
            { "", "empty@test.com", 20, false },
            { "Charlie", "", 35, false },
            { "Dave", "dave@test.com", -1, false },
            { "Eve", "dave@test.com", 150, false },
        };
    }

    @DataProvider(name = "calculatorData")
    public static Object[][] provideCalculatorData() {
        return new Object[][] {
            { 1, 1, 2 },
            { 0, 0, 0 },
            { -1, 1, 0 },
            { 100, 200, 300 },
            { Integer.MAX_VALUE, 0, Integer.MAX_VALUE },
        };
    }
}

// Usage in test class
public class CalculatorTest {

    @Test(dataProvider = "calculatorData", dataProviderClass = UserDataProvider.class)
    public void add_withVariousInputs_returnsExpectedSum(int a, int b, int expected) {
        assertEquals(Calculator.add(a, b), expected);
    }
}
```

## TestNG XML Suite Configuration

### testng.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd">
<suite name="Full Test Suite" parallel="classes" thread-count="4" verbose="1">

    <listeners>
        <listener class-name="com.example.listeners.TestReportListener"/>
        <listener class-name="com.example.listeners.RetryAnalyzer"/>
    </listeners>

    <test name="Unit Tests">
        <groups>
            <run>
                <include name="unit"/>
            </run>
        </groups>
        <packages>
            <package name="com.example.*"/>
        </packages>
    </test>

    <test name="Integration Tests" parallel="methods" thread-count="2">
        <groups>
            <run>
                <include name="integration"/>
            </run>
        </groups>
        <classes>
            <class name="com.example.integration.UserPaymentFlowIT"/>
        </classes>
    </test>

</suite>
```

### Smoke Test Suite
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd">
<suite name="Smoke Suite" parallel="methods" thread-count="4">
    <test name="Smoke Tests">
        <groups>
            <run>
                <include name="smoke"/>
            </run>
        </groups>
        <packages>
            <package name="com.example.*"/>
        </packages>
    </test>
</suite>
```

## Soft Assertions

```java
import org.testng.asserts.SoftAssert;

public class UserValidationTest {

    @Test(groups = "unit")
    public void createUser_shouldPopulateAllFields() {
        SoftAssert softAssert = new SoftAssert();
        User user = new UserService().createUser(
            new CreateUserRequest("Alice", "alice@example.com", 30)
        );

        softAssert.assertNotNull(user, "User should not be null");
        softAssert.assertEquals(user.getName(), "Alice", "Name mismatch");
        softAssert.assertEquals(user.getEmail(), "alice@example.com", "Email mismatch");
        softAssert.assertEquals(user.getAge(), 30, "Age mismatch");
        softAssert.assertNotNull(user.getCreatedAt(), "CreatedAt should be set");

        softAssert.assertAll(); // Reports all failures at once
    }
}
```

## Test Groups and Dependencies

```java
public class OrderWorkflowTest {

    @Test(groups = {"smoke", "order"})
    public void createOrder_withValidItems_succeeds() {
        Order order = orderService.createOrder(validItems);
        assertNotNull(order.getId());
    }

    @Test(groups = {"order"}, dependsOnMethods = "createOrder_withValidItems_succeeds")
    public void processPayment_forOrder_succeeds() {
        // Only runs if createOrder test passes
        PaymentResult result = paymentService.processPayment(orderId, paymentDetails);
        assertEquals(result.getStatus(), "SUCCESS");
    }

    @Test(groups = {"order"}, dependsOnMethods = "processPayment_forOrder_succeeds")
    public void shipOrder_afterPayment_updatesStatus() {
        orderService.shipOrder(orderId);
        Order order = orderService.getOrder(orderId);
        assertEquals(order.getStatus(), OrderStatus.SHIPPED);
    }

    @Test(groups = {"unit"}, priority = 1)
    public void validateOrderTotal_withDiscounts_calculatesCorrectly() {
        // Priority determines execution order within same group
        Order order = new Order();
        order.addItem(new OrderItem("Widget", 9.99, 2));
        order.applyDiscount(0.1);

        assertEquals(order.getTotal(), 17.98, 0.01);
    }
}
```

## Custom Listeners

### Retry Analyzer
```java
import org.testng.IRetryAnalyzer;
import org.testng.ITestResult;

public class RetryAnalyzer implements IRetryAnalyzer {

    private int retryCount = 0;
    private static final int MAX_RETRY_COUNT = 2;

    @Override
    public boolean retry(ITestResult result) {
        if (retryCount < MAX_RETRY_COUNT) {
            retryCount++;
            return true;
        }
        return false;
    }
}

// Usage
public class FlakyServiceTest {

    @Test(retryAnalyzer = RetryAnalyzer.class, groups = "integration")
    public void externalApiCall_shouldEventuallySucceed() {
        String result = externalService.fetchData();
        assertNotNull(result);
    }
}
```

### Test Report Listener
```java
import org.testng.*;

public class TestReportListener implements ITestListener {

    @Override
    public void onTestStart(ITestResult result) {
        System.out.printf("Starting: %s%n", result.getName());
    }

    @Override
    public void onTestSuccess(ITestResult result) {
        System.out.printf("Passed: %s (%dms)%n",
            result.getName(), result.getEndMillis() - result.getStartMillis());
    }

    @Override
    public void onTestFailure(ITestResult result) {
        System.out.printf("Failed: %s - %s%n",
            result.getName(), result.getThrowable().getMessage());
    }

    @Override
    public void onTestSkipped(ITestResult result) {
        System.out.printf("Skipped: %s%n", result.getName());
    }
}
```

## Parallel Execution

```java
// Thread-safe test class for parallel execution
@Test(singleThreaded = false)
public class ThreadSafeServiceTest {

    // Use ThreadLocal for test isolation in parallel execution
    private ThreadLocal<UserService> serviceHolder = ThreadLocal.withInitial(() -> {
        return new UserService(new InMemoryUserRepository());
    });

    @BeforeMethod
    public void setUp() {
        // Each thread gets its own service instance
    }

    @AfterMethod
    public void tearDown() {
        serviceHolder.remove();
    }

    @Test(groups = "unit", threadPoolSize = 3, invocationCount = 10)
    public void createUser_isConcurrencySafe() {
        UserService service = serviceHolder.get();
        String email = "user-" + Thread.currentThread().getId() + "@test.com";

        User user = service.createUser(
            new CreateUserRequest("Test", email, 25)
        );

        assertNotNull(user);
    }
}
```

## Running Tests

```bash
# Run with Maven
mvn test

# Run specific suite
mvn test -DsuiteXmlFile=src/test/resources/testng-smoke.xml

# Run specific groups
mvn test -Dgroups=unit

# Run specific class
mvn test -Dtest=UserServiceTest

# Run specific method
mvn test -Dtest=UserServiceTest#createUser_withValidData_returnsUser

# Generate HTML report
# Reports are automatically generated in test-output/index.html
```

## Best Practices

1. **Use data providers for parameterized tests** -- Extract test data into `@DataProvider` methods for clean separation of test logic from test data.
2. **Group tests by type** -- Tag tests with groups like "unit", "integration", "smoke", "regression" for selective execution in CI/CD pipelines.
3. **Prefer soft assertions for multi-field validation** -- Use `SoftAssert` when verifying multiple properties to see all failures at once.
4. **Configure parallel execution via XML** -- Use `testng.xml` to set parallel strategies and thread counts at the suite level rather than hardcoding in test classes.
5. **Use listeners for cross-cutting concerns** -- Implement retry logic, reporting, and setup/teardown hooks as listeners for reusability.
6. **Keep test methods independent** -- Minimize `dependsOnMethods` to avoid cascading failures; design tests that can run in isolation.
7. **Use `@BeforeMethod`/`@AfterMethod` for per-test setup** -- Ensure each test starts with a clean state by using method-level lifecycle hooks.
8. **Use `@BeforeClass`/`@AfterClass` for expensive setup** -- Share database connections or server instances across tests within a class.
9. **Externalize data providers** -- Move data providers to separate classes for reuse across multiple test classes.
10. **Use `expectedExceptions` sparingly** -- Prefer `assertThrows` for exception testing to also verify the exception message content.

## Anti-Patterns

1. **Excessive `dependsOnMethods`** -- Long chains of dependent tests create cascading failures; one failure skips the entire chain.
2. **Hardcoded test data in test methods** -- Magic numbers and strings scattered across tests; use data providers for maintainable test data.
3. **Non-thread-safe tests running in parallel** -- Shared mutable state without synchronization causes intermittent failures that are hard to reproduce.
4. **Using `Thread.sleep()` for synchronization** -- Arbitrary waits make tests slow and flaky; use proper wait conditions or polling mechanisms.
5. **Ignoring test groups** -- Not tagging tests with groups means you cannot selectively run smoke vs regression suites.
6. **Not using `SoftAssert.assertAll()`** -- Forgetting to call `assertAll()` at the end means failures are silently swallowed.
7. **Putting complex logic in data providers** -- Data providers should return data, not contain business logic or complex computations.
8. **Not cleaning up in `@AfterMethod`** -- Failing to reset state after each test causes pollution and order-dependent test failures.
9. **Over-using priority attribute** -- Relying on `priority` to order tests creates implicit dependencies; make tests independent instead.
10. **Ignoring the TestNG HTML report** -- The built-in report in `test-output/` provides valuable insights into failures, timing, and group distribution.
