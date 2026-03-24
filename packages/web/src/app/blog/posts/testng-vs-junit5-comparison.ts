import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'TestNG vs JUnit 5: Which Java Testing Framework in 2026?',
  description:
    'Compare TestNG and JUnit 5 for Java testing in 2026. Feature comparison, annotations, parallel execution, data providers, reporting, and migration guide included.',
  date: '2026-03-24',
  category: 'Guide',
  content: `
Choosing between TestNG and JUnit 5 is one of the most common decisions Java teams face when setting up their testing strategy. Both frameworks are mature, well-maintained, and capable of supporting enterprise-grade test suites. This guide provides a comprehensive comparison to help you make an informed choice based on your project needs, team expertise, and testing requirements.

## Key Takeaways

- JUnit 5 is the default choice for new projects due to its modular architecture, extension model, and broader ecosystem support
- TestNG excels in complex test orchestration scenarios with its XML suite configuration, dependency management, and built-in data providers
- JUnit 5 parameterized tests require less boilerplate than TestNG data providers for simple cases, but TestNG data providers offer more flexibility for complex scenarios
- Both frameworks support parallel execution, but TestNG offers more granular control via XML configuration out of the box
- Migration from TestNG to JUnit 5 is straightforward for most test suites with a clear annotation mapping
- AI coding agents with QA skills from qaskills.sh can generate tests for either framework following best practices

---

## Feature Comparison Table

| Feature | JUnit 5 | TestNG |
|---|---|---|
| Architecture | Modular (Platform + Jupiter + Vintage) | Monolithic JAR |
| Annotations | \`@Test\`, \`@BeforeEach\`, \`@AfterEach\` | \`@Test\`, \`@BeforeMethod\`, \`@AfterMethod\` |
| Parameterized Tests | \`@ParameterizedTest\` with multiple sources | \`@DataProvider\` |
| Nested Tests | \`@Nested\` inner classes | Not supported natively |
| Parallel Execution | Via properties file | Via XML suite configuration |
| Test Dependencies | Not supported (by design) | \`@Test(dependsOnMethods)\` |
| Suite Configuration | Via \`@Suite\` or build tool | XML suite files |
| Test Groups | \`@Tag\` | \`@Test(groups)\` |
| Soft Assertions | \`assertAll()\` | \`SoftAssert\` class |
| Extension Model | \`@ExtendWith\` (composable) | Listeners and \`@Listeners\` |
| Retry Failed Tests | Via extensions | \`@Test(retryAnalyzer)\` built-in |
| Default Test Timeout | \`@Timeout\` annotation | \`@Test(timeOut)\` attribute |
| IDE Support | Excellent (all major IDEs) | Excellent (all major IDEs) |
| Spring Boot Default | Yes (default dependency) | Requires manual setup |
| Community Size | Larger | Smaller but active |

---

## Annotations Comparison

Understanding the annotation mapping between the two frameworks is essential for migration and for teams working with both.

### JUnit 5 Annotations

\`\`\`java
import org.junit.jupiter.api.*;

class JUnit5Example {

    @BeforeAll
    static void beforeAll() { /* once before all tests */ }

    @BeforeEach
    void beforeEach() { /* before each test */ }

    @Test
    @DisplayName("descriptive test name")
    void testMethod() { /* test logic */ }

    @Test
    @Disabled("reason for skipping")
    void skippedTest() { /* skipped */ }

    @AfterEach
    void afterEach() { /* after each test */ }

    @AfterAll
    static void afterAll() { /* once after all tests */ }
}
\`\`\`

### TestNG Annotations

\`\`\`java
import org.testng.annotations.*;

class TestNGExample {

    @BeforeSuite
    void beforeSuite() { /* once before entire suite */ }

    @BeforeClass
    void beforeClass() { /* once before this class */ }

    @BeforeMethod
    void beforeMethod() { /* before each test */ }

    @Test(description = "descriptive test name")
    void testMethod() { /* test logic */ }

    @Test(enabled = false)
    void skippedTest() { /* skipped */ }

    @AfterMethod
    void afterMethod() { /* after each test */ }

    @AfterClass
    void afterClass() { /* once after this class */ }

    @AfterSuite
    void afterSuite() { /* once after entire suite */ }
}
\`\`\`

### Annotation Mapping Reference

| Purpose | JUnit 5 | TestNG |
|---|---|---|
| Test method | \`@Test\` | \`@Test\` |
| Before each test | \`@BeforeEach\` | \`@BeforeMethod\` |
| After each test | \`@AfterEach\` | \`@AfterMethod\` |
| Before all tests | \`@BeforeAll\` | \`@BeforeClass\` |
| After all tests | \`@AfterAll\` | \`@AfterClass\` |
| Disable test | \`@Disabled\` | \`@Test(enabled = false)\` |
| Timeout | \`@Timeout(5)\` | \`@Test(timeOut = 5000)\` |
| Tag/Group | \`@Tag("smoke")\` | \`@Test(groups = "smoke")\` |

---

## Parameterized Tests vs Data Providers

This is one of the biggest practical differences between the two frameworks.

### JUnit 5 Parameterized Tests

\`\`\`java
@ParameterizedTest
@DisplayName("should validate email format")
@CsvSource({
    "user@example.com, true",
    "invalid-email, false",
    "user@, false",
    "user@domain.co.uk, true"
})
void shouldValidateEmail(String email, boolean expected) {
    assertEquals(expected, validator.isValid(email));
}

@ParameterizedTest
@MethodSource("orderTestData")
void shouldCalculateOrderTotal(
        List<Item> items, double discount, double expected) {
    Order order = new Order(items);
    order.applyDiscount(discount);
    assertEquals(expected, order.getTotal(), 0.01);
}

static Stream<Arguments> orderTestData() {
    return Stream.of(
        Arguments.of(
            List.of(new Item("A", 10.0), new Item("B", 20.0)),
            0.0, 30.0),
        Arguments.of(
            List.of(new Item("A", 10.0), new Item("B", 20.0)),
            0.1, 27.0),
        Arguments.of(
            List.of(new Item("C", 100.0)),
            0.5, 50.0)
    );
}
\`\`\`

### TestNG Data Providers

\`\`\`java
@DataProvider(name = "emailData")
public Object[][] emailData() {
    return new Object[][] {
        {"user@example.com", true},
        {"invalid-email", false},
        {"user@", false},
        {"user@domain.co.uk", true}
    };
}

@Test(dataProvider = "emailData")
public void shouldValidateEmail(String email, boolean expected) {
    assertEquals(expected, validator.isValid(email));
}

// Data provider from a separate class
@Test(dataProvider = "orderData",
      dataProviderClass = OrderDataProviders.class)
public void shouldCalculateTotal(
        List<Item> items, double discount, double expected) {
    Order order = new Order(items);
    order.applyDiscount(discount);
    assertEquals(expected, order.getTotal(), 0.01);
}

// Lazy data provider using Iterator
@DataProvider(name = "largeDataset")
public Iterator<Object[]> largeDataset() {
    return Files.lines(Path.of("testdata.csv"))
        .map(line -> line.split(","))
        .map(parts -> new Object[]{parts[0], parts[1]})
        .iterator();
}
\`\`\`

**Verdict:** JUnit 5 parameterized tests are more concise for simple cases with \`@CsvSource\` and \`@ValueSource\`. TestNG data providers are more flexible for complex scenarios, especially when data comes from external sources or needs to be shared across test classes.

---

## Parallel Execution

### JUnit 5 Parallel Execution

\`\`\`properties
# junit-platform.properties
junit.jupiter.execution.parallel.enabled=true
junit.jupiter.execution.parallel.mode.default=concurrent
junit.jupiter.execution.parallel.mode.classes.default=concurrent
junit.jupiter.execution.parallel.config.strategy=fixed
junit.jupiter.execution.parallel.config.fixed.parallelism=4
\`\`\`

\`\`\`java
// Opt specific tests out of parallel execution
@Execution(ExecutionMode.SAME_THREAD)
class SequentialDatabaseTest {
    @Test
    void testA() { /* runs sequentially */ }

    @Test
    void testB() { /* runs sequentially */ }
}
\`\`\`

### TestNG Parallel Execution

\`\`\`xml
<!-- testng.xml -->
<suite name="Parallel Suite" parallel="methods" thread-count="4">
    <test name="All Tests">
        <classes>
            <class name="com.example.UserServiceTest"/>
            <class name="com.example.OrderServiceTest"/>
        </classes>
    </test>
</suite>

<!-- More granular control -->
<suite name="Mixed Suite">
    <test name="Sequential Tests" parallel="none">
        <classes>
            <class name="com.example.DatabaseMigrationTest"/>
        </classes>
    </test>
    <test name="Parallel Tests" parallel="methods" thread-count="8">
        <classes>
            <class name="com.example.ApiTest"/>
            <class name="com.example.ValidationTest"/>
        </classes>
    </test>
</suite>
\`\`\`

**Verdict:** TestNG provides more granular control over parallel execution through XML configuration without modifying test code. JUnit 5 parallel execution is configured via properties and annotations, which keeps everything in code but offers less fine-grained suite-level control.

---

## Test Dependencies and Ordering

### TestNG Dependencies

\`\`\`java
public class WorkflowTest {

    @Test(priority = 1)
    public void createUser() {
        // Creates test user
    }

    @Test(priority = 2, dependsOnMethods = "createUser")
    public void loginUser() {
        // Logs in with created user
    }

    @Test(priority = 3, dependsOnMethods = "loginUser")
    public void performAction() {
        // Performs action as logged-in user
    }
}
\`\`\`

### JUnit 5 Test Ordering

\`\`\`java
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class WorkflowTest {

    @Test
    @Order(1)
    void createUser() { /* ... */ }

    @Test
    @Order(2)
    void loginUser() { /* ... */ }

    @Test
    @Order(3)
    void performAction() { /* ... */ }
}
\`\`\`

**Verdict:** TestNG has first-class dependency support where a dependent test is automatically skipped if its prerequisite fails. JUnit 5 supports ordering but deliberately does not support dependencies, encouraging independent tests. For workflow testing, TestNG is more natural; for unit testing, JUnit 5's approach prevents fragile test chains.

---

## Reporting

### TestNG Built-in Reports

TestNG generates HTML reports by default in the \`test-output\` directory, including:

- Index page with suite summary
- Per-test results with pass/fail/skip counts
- Detailed failure information with stack traces
- Chronological view of test execution

### JUnit 5 Reporting

JUnit 5 relies on build tools and third-party reporters:

\`\`\`groovy
// Gradle - Generate XML reports for CI
test {
    useJUnitPlatform()
    reports {
        html.required = true
        junitXml.required = true
    }
}
\`\`\`

For richer reports, integrate Allure:

\`\`\`xml
<dependency>
    <groupId>io.qameta.allure</groupId>
    <artifactId>allure-junit5</artifactId>
    <version>2.25.0</version>
    <scope>test</scope>
</dependency>
\`\`\`

**Verdict:** TestNG provides better out-of-the-box reporting. JUnit 5 requires additional setup for rich reports but integrates well with standard CI tools and Allure.

---

## Retry Mechanism

### TestNG Retry Analyzer

\`\`\`java
public class RetryAnalyzer implements IRetryAnalyzer {
    private int count = 0;
    private static final int MAX_RETRY = 2;

    @Override
    public boolean retry(ITestResult result) {
        if (count < MAX_RETRY) {
            count++;
            return true;
        }
        return false;
    }
}

@Test(retryAnalyzer = RetryAnalyzer.class)
public void flakyNetworkTest() {
    // Will retry up to 2 times on failure
}
\`\`\`

### JUnit 5 Retry via Extension

\`\`\`java
// Requires a custom extension or third-party library
@RetryingTest(maxAttempts = 3)
void flakyNetworkTest() {
    // Uses junit-pioneer library
}
\`\`\`

**Verdict:** TestNG has built-in retry support. JUnit 5 requires the junit-pioneer library or a custom extension, but the result is equivalent.

---

## When to Choose Each Framework

### Choose JUnit 5 When

- Starting a new project with Spring Boot (it is the default)
- Your team is familiar with the JUnit ecosystem
- You want a modular, extensible architecture
- You prefer nested test classes for organization
- You need broad library and IDE support
- You value the principle of independent, isolated tests

### Choose TestNG When

- You need complex suite orchestration via XML
- Test dependencies are a natural fit for your workflow tests
- You want built-in retry analysis without third-party libraries
- Your team already has TestNG expertise and existing suites
- You need fine-grained parallel execution control at the suite level
- You rely heavily on data providers from external classes

---

## Migration Guide: TestNG to JUnit 5

For teams migrating from TestNG to JUnit 5, here is a step-by-step approach.

### Step 1: Update Dependencies

\`\`\`xml
<!-- Remove TestNG -->
<!-- <dependency>
    <groupId>org.testng</groupId>
    <artifactId>testng</artifactId>
</dependency> -->

<!-- Add JUnit 5 -->
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>5.11.0</version>
    <scope>test</scope>
</dependency>
\`\`\`

### Step 2: Update Imports and Annotations

\`\`\`java
// Before (TestNG)
import org.testng.annotations.Test;
import org.testng.annotations.BeforeMethod;
import static org.testng.Assert.assertEquals;

// After (JUnit 5)
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import static org.junit.jupiter.api.Assertions.assertEquals;
\`\`\`

### Step 3: Convert Data Providers

\`\`\`java
// Before (TestNG)
@DataProvider
public Object[][] data() {
    return new Object[][] {{"a", 1}, {"b", 2}};
}

@Test(dataProvider = "data")
public void test(String s, int n) { /* ... */ }

// After (JUnit 5)
@ParameterizedTest
@MethodSource("data")
void test(String s, int n) { /* ... */ }

static Stream<Arguments> data() {
    return Stream.of(
        Arguments.of("a", 1),
        Arguments.of("b", 2)
    );
}
\`\`\`

### Step 4: Convert Assertions

\`\`\`java
// TestNG assertion order: (actual, expected)
assertEquals(result, "expected");

// JUnit 5 assertion order: (expected, actual)
assertEquals("expected", result);
\`\`\`

Note the reversed parameter order. This is the most common source of bugs during migration.

---

## Integrating QA Skills

Whether you use TestNG or JUnit 5, QA skills can accelerate your test authoring:

\`\`\`bash
npx @qaskills/cli add junit5-testing
npx @qaskills/cli add testng-testing
\`\`\`

These skills configure your AI coding agent to generate tests following each framework's conventions and best practices.

---

## 10 Best Practices (Both Frameworks)

1. **Keep tests independent.** Each test should set up and tear down its own state. Test ordering and dependencies are code smells in unit tests.

2. **Use meaningful names.** \`@DisplayName\` in JUnit 5 or \`description\` in TestNG makes test reports human-readable.

3. **One logical assertion per test.** Multiple assertions checking different behaviors should be separate test methods.

4. **Prefer composition over inheritance.** Use JUnit 5 extensions or TestNG listeners instead of deep test class hierarchies.

5. **Parameterize repetitive tests.** If three tests differ only by input data, use parameterized tests or data providers.

6. **Mock external dependencies.** Database calls, API calls, and file system operations should be mocked in unit tests.

7. **Run tests in parallel.** Design tests for concurrent execution from the start. Fix shared state issues early.

8. **Fail fast with clear messages.** Custom assertion messages should explain what went wrong, not just that something failed.

9. **Measure and monitor test execution time.** Slow tests indicate design problems. Track test suite duration in CI.

10. **Review tests in code reviews.** Test code deserves the same review rigor as production code.

---

## 8 Anti-Patterns to Avoid

1. **Mixing JUnit 4 and JUnit 5 annotations.** Importing \`@Test\` from the wrong package silently skips tests. Be consistent across the codebase.

2. **Using test dependencies as a shortcut for setup.** \`dependsOnMethods\` in TestNG should not replace proper \`@BeforeMethod\` setup. Dependencies couple tests and cause cascading failures.

3. **Asserting on toString() output.** Comparing string representations is fragile. Assert on specific properties instead.

4. **Testing implementation details.** Tests should verify behavior, not internal state. Refactoring should not break tests unless behavior changes.

5. **Ignoring flaky tests.** A flaky test is worse than no test because it erodes confidence in the suite. Fix or remove flaky tests immediately.

6. **Hardcoding test data.** Magic numbers and strings scattered through tests make them unreadable. Use constants, builders, or factory methods.

7. **Writing integration tests disguised as unit tests.** If your "unit test" needs a database, network, or file system, it is an integration test. Label and isolate it accordingly.

8. **Skipping cleanup.** Tests that create files, database records, or external resources must clean up after themselves, even when they fail.

---

## Conclusion

Both TestNG and JUnit 5 are excellent Java testing frameworks. JUnit 5 is the better default choice for most new projects due to its modular design, broader ecosystem integration, and the fact that Spring Boot includes it out of the box. TestNG remains a strong choice for teams that need complex suite orchestration, built-in dependency management, and granular parallel execution control. Regardless of your choice, the fundamentals of good testing remain the same: isolated tests, clear assertions, and fast feedback loops. Use QA skills from qaskills.sh to ensure your AI coding agents generate tests that follow whichever framework's best practices your team adopts.
`,
};
