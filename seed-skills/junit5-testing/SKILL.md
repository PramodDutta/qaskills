---
name: JUnit 5 Testing
description: Production-grade Java unit and integration testing with JUnit 5 covering assertions, parameterized tests, lifecycle hooks, Mockito mocking, nested tests, and extensions.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [junit5, java, unit-testing, mockito, parameterized, assertions, tdd, integration]
testingTypes: [unit, integration]
frameworks: [junit5]
languages: [java]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# JUnit 5 Testing Skill

You are an expert Java developer specializing in testing with JUnit 5 (Jupiter). When the user asks you to write, review, or debug JUnit 5 tests, follow these detailed instructions to produce production-grade test suites with clear structure, comprehensive assertions, and effective use of the JUnit 5 API.

## Core Principles

1. **Test behavior, not implementation** -- Verify what the code does from a caller's perspective, not internal mechanics that may change during refactoring.
2. **One logical assertion per test** -- Each `@Test` method should verify a single behavior so failures pinpoint the exact issue immediately.
3. **Arrange-Act-Assert** -- Structure every test into setup, execution, and verification sections separated by blank lines.
4. **Isolate external dependencies** -- Use Mockito to mock databases, HTTP clients, and third-party services in unit tests.
5. **Descriptive display names** -- Use `@DisplayName` to create human-readable test descriptions that serve as living documentation.
6. **Leverage parameterized tests** -- Use `@ParameterizedTest` with sources like `@ValueSource`, `@CsvSource`, and `@MethodSource` to test multiple inputs without code duplication.
7. **Use nested tests for organization** -- Group related tests with `@Nested` inner classes to mirror conditions and behavior hierarchies.

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
    repository/
      UserRepositoryTest.java
    util/
      ValidatorsTest.java
    integration/
      UserPaymentFlowIT.java
    fixtures/
      TestDataFactory.java
pom.xml (or build.gradle)
```

## Dependencies

### Maven (pom.xml)
```xml
<dependencies>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>5.11.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.mockito</groupId>
        <artifactId>mockito-junit-jupiter</artifactId>
        <version>5.14.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.assertj</groupId>
        <artifactId>assertj-core</artifactId>
        <version>3.26.0</version>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### Gradle (build.gradle)
```groovy
dependencies {
    testImplementation 'org.junit.jupiter:junit-jupiter:5.11.0'
    testImplementation 'org.mockito:mockito-junit-jupiter:5.14.0'
    testImplementation 'org.assertj:assertj-core:3.26.0'
}

test {
    useJUnitPlatform()
}
```

## Basic Test Structure

```java
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("UserService")
class UserServiceTest {

    private UserService userService;
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository = new InMemoryUserRepository();
        userService = new UserService(userRepository);
    }

    @AfterEach
    void tearDown() {
        userRepository = null;
        userService = null;
    }

    @Test
    @DisplayName("should create user with valid data")
    void createUser_withValidData_returnsUser() {
        var request = new CreateUserRequest("Alice", "alice@example.com", 30);

        var user = userService.createUser(request);

        assertNotNull(user);
        assertEquals("Alice", user.getName());
        assertEquals("alice@example.com", user.getEmail());
    }

    @Test
    @DisplayName("should throw exception when email is missing")
    void createUser_withoutEmail_throwsException() {
        var request = new CreateUserRequest("Bob", null, 25);

        var exception = assertThrows(IllegalArgumentException.class,
            () -> userService.createUser(request));

        assertTrue(exception.getMessage().contains("email"));
    }

    @Test
    @DisplayName("should throw exception for duplicate email")
    void createUser_withDuplicateEmail_throwsException() {
        var request = new CreateUserRequest("Alice", "alice@example.com", 30);
        userService.createUser(request);

        assertThrows(DuplicateEmailException.class,
            () -> userService.createUser(request));
    }
}
```

## Assertion Patterns

```java
@DisplayName("Assertion examples")
class AssertionExamplesTest {

    @Test
    @DisplayName("equality assertions")
    void testEquality() {
        assertEquals(4, 2 + 2);
        assertNotEquals(5, 2 + 2);
        assertEquals(0.3, 0.1 + 0.2, 0.001); // delta for floating point
    }

    @Test
    @DisplayName("boolean assertions")
    void testBooleans() {
        assertTrue(10 > 5);
        assertFalse(5 > 10);
        assertNull(null);
        assertNotNull("value");
    }

    @Test
    @DisplayName("grouped assertions with assertAll")
    void testGrouped() {
        var user = new User("Alice", "alice@example.com", 30);

        assertAll("user properties",
            () -> assertEquals("Alice", user.getName()),
            () -> assertEquals("alice@example.com", user.getEmail()),
            () -> assertEquals(30, user.getAge())
        );
    }

    @Test
    @DisplayName("exception assertions")
    void testExceptions() {
        var exception = assertThrows(ArithmeticException.class,
            () -> { int result = 1 / 0; });

        assertEquals("/ by zero", exception.getMessage());
    }

    @Test
    @DisplayName("timeout assertions")
    void testTimeout() {
        assertTimeout(Duration.ofSeconds(2), () -> {
            Thread.sleep(100);
        });
    }

    @Test
    @DisplayName("iterable assertions")
    void testIterables() {
        var list = List.of(1, 2, 3);
        assertIterableEquals(List.of(1, 2, 3), list);
    }
}
```

## Parameterized Tests

```java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;

class ValidatorTest {

    @ParameterizedTest
    @ValueSource(strings = {"user@example.com", "admin@test.org", "a@b.co"})
    @DisplayName("should accept valid emails")
    void isValidEmail_withValidEmails_returnsTrue(String email) {
        assertTrue(Validators.isValidEmail(email));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "not-email", "@domain.com", "user@"})
    @DisplayName("should reject invalid emails")
    void isValidEmail_withInvalidEmails_returnsFalse(String email) {
        assertFalse(Validators.isValidEmail(email));
    }

    @ParameterizedTest
    @CsvSource({
        "1, 1, 2",
        "0, 0, 0",
        "-1, 1, 0",
        "100, 200, 300",
        "-50, -50, -100"
    })
    @DisplayName("should add two numbers correctly")
    void add_withVariousInputs_returnsSum(int a, int b, int expected) {
        assertEquals(expected, Calculator.add(a, b));
    }

    @ParameterizedTest
    @MethodSource("provideAgeValidationData")
    @DisplayName("should validate age boundaries")
    void isValidAge_withBoundaryValues(int age, boolean expected) {
        assertEquals(expected, Validators.isValidAge(age));
    }

    static Stream<Arguments> provideAgeValidationData() {
        return Stream.of(
            Arguments.of(0, false),
            Arguments.of(1, true),
            Arguments.of(17, false),
            Arguments.of(18, true),
            Arguments.of(120, true),
            Arguments.of(121, false),
            Arguments.of(-1, false)
        );
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"  ", "\t", "\n"})
    @DisplayName("should reject blank strings")
    void isBlank_withBlankStrings_returnsTrue(String input) {
        assertTrue(Validators.isBlank(input));
    }
}
```

## Mockito Integration

```java
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService with mocks")
class UserServiceMockTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private UserService userService;

    @Captor
    private ArgumentCaptor<User> userCaptor;

    @Test
    @DisplayName("should save user to repository")
    void createUser_savesToRepository() {
        var request = new CreateUserRequest("Alice", "alice@example.com", 30);
        when(userRepository.save(any(User.class)))
            .thenAnswer(invocation -> {
                var user = invocation.getArgument(0, User.class);
                user.setId(1L);
                return user;
            });

        userService.createUser(request);

        verify(userRepository).save(userCaptor.capture());
        var savedUser = userCaptor.getValue();
        assertEquals("Alice", savedUser.getName());
        assertEquals("alice@example.com", savedUser.getEmail());
    }

    @Test
    @DisplayName("should send welcome email after creation")
    void createUser_sendsWelcomeEmail() {
        when(userRepository.save(any())).thenAnswer(inv -> {
            var user = inv.getArgument(0, User.class);
            user.setId(1L);
            return user;
        });

        userService.createUser(new CreateUserRequest("Bob", "bob@example.com", 25));

        verify(emailService).sendWelcomeEmail("bob@example.com");
        verifyNoMoreInteractions(emailService);
    }

    @Test
    @DisplayName("should handle email failure gracefully")
    void createUser_emailFails_doesNotThrow() {
        when(userRepository.save(any())).thenAnswer(inv -> {
            var user = inv.getArgument(0, User.class);
            user.setId(1L);
            return user;
        });
        doThrow(new RuntimeException("SMTP error"))
            .when(emailService).sendWelcomeEmail(anyString());

        assertDoesNotThrow(() ->
            userService.createUser(new CreateUserRequest("Bob", "bob@example.com", 25))
        );
    }
}
```

## Nested Tests

```java
@DisplayName("ShoppingCart")
class ShoppingCartTest {

    private ShoppingCart cart;

    @BeforeEach
    void setUp() {
        cart = new ShoppingCart();
    }

    @Nested
    @DisplayName("when empty")
    class WhenEmpty {

        @Test
        @DisplayName("should have zero items")
        void hasZeroItems() {
            assertEquals(0, cart.getItemCount());
        }

        @Test
        @DisplayName("should have zero total")
        void hasZeroTotal() {
            assertEquals(BigDecimal.ZERO, cart.getTotal());
        }

        @Test
        @DisplayName("should throw when removing item")
        void throwsOnRemove() {
            assertThrows(NoSuchElementException.class,
                () -> cart.removeItem("Widget"));
        }
    }

    @Nested
    @DisplayName("when items added")
    class WhenItemsAdded {

        @BeforeEach
        void addItems() {
            cart.addItem(new CartItem("Widget", new BigDecimal("9.99"), 2));
        }

        @Test
        @DisplayName("should update item count")
        void updatesItemCount() {
            assertEquals(2, cart.getItemCount());
        }

        @Test
        @DisplayName("should calculate total correctly")
        void calculatesTotal() {
            assertEquals(new BigDecimal("19.98"), cart.getTotal());
        }

        @Nested
        @DisplayName("and discount applied")
        class AndDiscountApplied {

            @Test
            @DisplayName("should reduce total by discount percentage")
            void reducesTotal() {
                cart.applyDiscount(0.1);
                assertEquals(new BigDecimal("17.98"), cart.getTotal());
            }
        }
    }
}
```

## Lifecycle Hooks

```java
class LifecycleExampleTest {

    @BeforeAll
    static void setUpOnce() {
        // Runs once before all tests (must be static)
        System.out.println("Setting up shared resources");
    }

    @AfterAll
    static void tearDownOnce() {
        // Runs once after all tests (must be static)
        System.out.println("Cleaning up shared resources");
    }

    @BeforeEach
    void setUp() {
        // Runs before each test
    }

    @AfterEach
    void tearDown() {
        // Runs after each test
    }

    @Test
    void testExample() {
        // Test logic here
    }
}
```

## Best Practices

1. **Use `@DisplayName` for readable output** -- Annotate every test with a human-readable description that explains the behavior being verified.
2. **Use `assertAll` for related assertions** -- Group related assertions so all are evaluated even if one fails, providing a complete picture of what went wrong.
3. **Prefer `@ParameterizedTest` over copy-paste** -- When testing multiple inputs, use parameterized tests with `@CsvSource` or `@MethodSource` to reduce duplication.
4. **Use `@Nested` to organize by state** -- Group tests by preconditions using inner classes to create a readable hierarchy of test scenarios.
5. **Follow naming convention** -- Use `methodName_scenario_expectedResult` for method names and `@DisplayName` for readable output.
6. **Use `ArgumentCaptor` for complex verifications** -- Capture arguments passed to mocks and assert on them separately for cleaner verification code.
7. **Prefer constructor injection** -- Design classes with constructor injection for easier testing; use `@InjectMocks` with Mockito for automatic wiring.
8. **Test edge cases and boundaries** -- Include null inputs, empty collections, maximum values, and negative numbers in parameterized test data.
9. **Use `assertThrows` over `@Test(expected=...)`** -- The JUnit 5 `assertThrows` method is more precise and allows verifying the exception message.
10. **Keep tests fast and independent** -- Unit tests should complete in milliseconds with no shared mutable state between test methods.

## Anti-Patterns

1. **Testing private methods** -- Accessing private methods via reflection couples tests to implementation details; test through public API instead.
2. **Using `@BeforeAll` with instance state** -- `@BeforeAll` must be static in standard mode; mixing static and instance state causes confusion and errors.
3. **Ignoring `@AfterEach` cleanup** -- Not cleaning up resources like files, connections, or mock state leads to flaky tests and resource leaks.
4. **Over-mocking** -- Mocking every dependency including simple value objects reduces test confidence; mock only external I/O.
5. **Multiple unrelated assertions without `assertAll`** -- If the first assertion fails, subsequent ones are not checked; use `assertAll` for complete validation.
6. **Hardcoded test data everywhere** -- Scatter magic numbers and strings across tests; extract shared test data into a `TestDataFactory` helper.
7. **Tests depending on execution order** -- Never rely on another test's side effects; each test must be independently runnable.
8. **Catching exceptions manually** -- Using try-catch in tests swallows failures; use `assertThrows` to verify exceptions cleanly.
9. **Not using `@ExtendWith(MockitoExtension.class)`** -- Manually initializing mocks with `MockitoAnnotations.openMocks()` is error-prone; use the extension.
10. **Ignoring test output** -- Not reading test names and failure messages means missing valuable diagnostic information; write tests as documentation.
