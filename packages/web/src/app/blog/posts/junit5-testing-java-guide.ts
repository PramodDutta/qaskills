import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'JUnit 5 Testing in Java: Complete Guide for 2026',
  description:
    'Master JUnit 5 testing in Java with this complete guide covering architecture, annotations, parameterized tests, nested tests, extensions, assertions, and Mockito integration.',
  date: '2026-03-24',
  category: 'Tutorial',
  content: `
JUnit 5 is the standard testing framework for Java applications in 2026. Whether you are building microservices with Spring Boot, Android applications, or enterprise systems, JUnit 5 provides the foundation for reliable, maintainable test suites. This guide covers every aspect of JUnit 5 from its modular architecture to advanced features like parameterized tests, nested test classes, and the extension model.

## Key Takeaways

- JUnit 5 is composed of three modules: JUnit Platform, JUnit Jupiter, and JUnit Vintage, enabling flexible test engine composition
- Parameterized tests with \`@MethodSource\`, \`@CsvSource\`, and \`@ValueSource\` eliminate test duplication and improve coverage
- Nested test classes using \`@Nested\` organize related tests into readable hierarchies that mirror your domain logic
- The Extension API replaces JUnit 4 runners and rules with a composable, annotation-driven model
- Mockito 5 integrates seamlessly via \`@ExtendWith(MockitoExtension.class)\` for clean dependency isolation
- AI coding agents with QA skills from qaskills.sh generate JUnit 5 tests following modern patterns and conventions

---

## JUnit 5 Architecture

JUnit 5 is fundamentally different from JUnit 4 in its modular design. It consists of three sub-projects:

**JUnit Platform** serves as the foundation for launching testing frameworks on the JVM. It defines the \`TestEngine\` API and provides a console launcher and build tool integrations.

**JUnit Jupiter** provides the new programming model and extension model for writing tests. This is where \`@Test\`, \`@BeforeEach\`, \`@ParameterizedTest\`, and all the annotations you use daily live.

**JUnit Vintage** provides backward compatibility, allowing JUnit 3 and JUnit 4 tests to run on the JUnit 5 platform.

### Maven Setup

\`\`\`xml
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
\`\`\`

### Gradle Setup

\`\`\`groovy
dependencies {
    testImplementation 'org.junit.jupiter:junit-jupiter:5.11.0'
    testImplementation 'org.mockito:mockito-junit-jupiter:5.14.0'
}

test {
    useJUnitPlatform()
}
\`\`\`

---

## Core Annotations and Lifecycle

JUnit 5 provides a rich set of annotations for controlling test lifecycle and behavior.

\`\`\`java
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("User Service Tests")
class UserServiceTest {

    private UserService userService;
    private UserRepository userRepository;

    @BeforeAll
    static void setupClass() {
        // Runs once before all tests in this class
        System.out.println("Initializing test environment");
    }

    @BeforeEach
    void setUp() {
        // Runs before each test method
        userRepository = new InMemoryUserRepository();
        userService = new UserService(userRepository);
    }

    @Test
    @DisplayName("should create a user with valid data")
    void shouldCreateUserWithValidData() {
        User user = userService.createUser("alice", "alice@test.com");

        assertNotNull(user.getId());
        assertEquals("alice", user.getUsername());
        assertEquals("alice@test.com", user.getEmail());
    }

    @Test
    @DisplayName("should throw exception for duplicate email")
    void shouldThrowForDuplicateEmail() {
        userService.createUser("alice", "alice@test.com");

        assertThrows(DuplicateEmailException.class, () ->
            userService.createUser("bob", "alice@test.com")
        );
    }

    @Test
    @Disabled("Pending implementation of email verification")
    void shouldVerifyEmailOnCreation() {
        // TODO: implement after email service is ready
    }

    @AfterEach
    void tearDown() {
        userRepository.clear();
    }

    @AfterAll
    static void tearDownClass() {
        System.out.println("Cleaning up test environment");
    }
}
\`\`\`

---

## Assertions in JUnit 5

JUnit 5 assertions are more expressive than JUnit 4, with support for grouped assertions, timeout assertions, and lambda-based messages.

\`\`\`java
@Test
@DisplayName("should validate user properties")
void shouldValidateUserProperties() {
    User user = userService.createUser("charlie", "charlie@test.com");

    // Grouped assertions - all are evaluated even if one fails
    assertAll("user properties",
        () -> assertEquals("charlie", user.getUsername()),
        () -> assertEquals("charlie@test.com", user.getEmail()),
        () -> assertNotNull(user.getId()),
        () -> assertNotNull(user.getCreatedAt()),
        () -> assertTrue(user.isActive())
    );
}

@Test
@DisplayName("should complete within timeout")
void shouldCompleteWithinTimeout() {
    assertTimeout(Duration.ofSeconds(2), () -> {
        userService.processLargeDataset(testData);
    });
}

@Test
@DisplayName("should return matching users")
void shouldReturnMatchingUsers() {
    userService.createUser("alice", "alice@test.com");
    userService.createUser("bob", "bob@test.com");
    userService.createUser("alicia", "alicia@test.com");

    List<User> results = userService.searchByUsername("ali");

    assertEquals(2, results.size());
    assertIterableEquals(
        List.of("alice", "alicia"),
        results.stream().map(User::getUsername).toList()
    );
}

@Test
@DisplayName("should provide meaningful failure message")
void shouldProvideFailureMessage() {
    User user = userService.findById(999L);

    assertNull(user, () ->
        "Expected null for non-existent ID but got: " + user
    );
}
\`\`\`

---

## Parameterized Tests

Parameterized tests allow you to run the same test logic with different inputs, dramatically reducing test duplication.

### @ValueSource

\`\`\`java
@ParameterizedTest
@DisplayName("should reject invalid usernames")
@ValueSource(strings = {"", " ", "ab", "a".repeat(256)})
void shouldRejectInvalidUsernames(String username) {
    assertThrows(InvalidUsernameException.class, () ->
        userService.createUser(username, "valid@email.com")
    );
}

@ParameterizedTest
@DisplayName("should reject invalid ages")
@ValueSource(ints = {-1, 0, 151, 200})
void shouldRejectInvalidAges(int age) {
    assertThrows(InvalidAgeException.class, () ->
        userService.setAge(testUser, age)
    );
}
\`\`\`

### @CsvSource

\`\`\`java
@ParameterizedTest
@DisplayName("should calculate shipping cost")
@CsvSource({
    "US, 10.0, 5.99",
    "US, 50.0, 0.00",
    "CA, 10.0, 12.99",
    "UK, 10.0, 19.99",
    "AU, 10.0, 24.99"
})
void shouldCalculateShippingCost(
        String country, double orderTotal, double expectedShipping) {
    double shipping = shippingService.calculate(country, orderTotal);
    assertEquals(expectedShipping, shipping, 0.01);
}
\`\`\`

### @MethodSource

\`\`\`java
@ParameterizedTest
@DisplayName("should parse valid date formats")
@MethodSource("validDateProvider")
void shouldParseValidDates(String input, LocalDate expected) {
    LocalDate result = dateParser.parse(input);
    assertEquals(expected, result);
}

static Stream<Arguments> validDateProvider() {
    return Stream.of(
        Arguments.of("2026-03-24", LocalDate.of(2026, 3, 24)),
        Arguments.of("03/24/2026", LocalDate.of(2026, 3, 24)),
        Arguments.of("24 March 2026", LocalDate.of(2026, 3, 24)),
        Arguments.of("Mar 24, 2026", LocalDate.of(2026, 3, 24))
    );
}

@ParameterizedTest
@DisplayName("should validate email addresses")
@MethodSource("emailValidationProvider")
void shouldValidateEmails(String email, boolean expectedValid) {
    assertEquals(expectedValid, validator.isValidEmail(email));
}

static Stream<Arguments> emailValidationProvider() {
    return Stream.of(
        Arguments.of("user@example.com", true),
        Arguments.of("user.name@domain.co.uk", true),
        Arguments.of("user+tag@example.com", true),
        Arguments.of("invalid-email", false),
        Arguments.of("@nodomain.com", false),
        Arguments.of("user@", false),
        Arguments.of("", false)
    );
}
\`\`\`

### @EnumSource

\`\`\`java
@ParameterizedTest
@DisplayName("should handle all order statuses")
@EnumSource(OrderStatus.class)
void shouldHandleAllStatuses(OrderStatus status) {
    Order order = new Order();
    order.setStatus(status);

    assertDoesNotThrow(() -> orderProcessor.process(order));
}

@ParameterizedTest
@DisplayName("should allow cancellation only for cancellable statuses")
@EnumSource(value = OrderStatus.class,
    names = {"PENDING", "PROCESSING"},
    mode = EnumSource.Mode.INCLUDE)
void shouldAllowCancellation(OrderStatus status) {
    Order order = createOrderWithStatus(status);
    assertTrue(orderService.canCancel(order));
}
\`\`\`

---

## Nested Tests

Nested tests organize related test cases into a readable hierarchy that reflects the structure of the code under test.

\`\`\`java
@DisplayName("Shopping Cart")
class ShoppingCartTest {

    private ShoppingCart cart;

    @BeforeEach
    void setUp() {
        cart = new ShoppingCart();
    }

    @Test
    @DisplayName("should be empty when created")
    void shouldBeEmptyWhenCreated() {
        assertTrue(cart.isEmpty());
        assertEquals(0, cart.getItemCount());
    }

    @Nested
    @DisplayName("when an item is added")
    class WhenItemAdded {

        private Product product;

        @BeforeEach
        void addItem() {
            product = new Product("Widget", 9.99);
            cart.addItem(product, 1);
        }

        @Test
        @DisplayName("should not be empty")
        void shouldNotBeEmpty() {
            assertFalse(cart.isEmpty());
        }

        @Test
        @DisplayName("should have correct item count")
        void shouldHaveCorrectCount() {
            assertEquals(1, cart.getItemCount());
        }

        @Test
        @DisplayName("should calculate total")
        void shouldCalculateTotal() {
            assertEquals(9.99, cart.getTotal(), 0.01);
        }

        @Nested
        @DisplayName("and then removed")
        class AndThenRemoved {

            @BeforeEach
            void removeItem() {
                cart.removeItem(product);
            }

            @Test
            @DisplayName("should be empty again")
            void shouldBeEmpty() {
                assertTrue(cart.isEmpty());
            }

            @Test
            @DisplayName("should have zero total")
            void shouldHaveZeroTotal() {
                assertEquals(0.0, cart.getTotal(), 0.01);
            }
        }

        @Nested
        @DisplayName("when quantity is updated")
        class WhenQuantityUpdated {

            @Test
            @DisplayName("should update total for increased quantity")
            void shouldUpdateTotalForIncrease() {
                cart.updateQuantity(product, 3);
                assertEquals(29.97, cart.getTotal(), 0.01);
            }

            @Test
            @DisplayName("should remove item when quantity set to zero")
            void shouldRemoveWhenZero() {
                cart.updateQuantity(product, 0);
                assertTrue(cart.isEmpty());
            }
        }
    }
}
\`\`\`

---

## The Extension Model

JUnit 5 extensions replace JUnit 4 runners and rules with a flexible, composable system.

### Custom Extension Example

\`\`\`java
// TimingExtension.java - Logs test execution time
public class TimingExtension implements
        BeforeTestExecutionCallback, AfterTestExecutionCallback {

    private static final Logger logger =
        LoggerFactory.getLogger(TimingExtension.class);

    private static final String START_TIME = "start_time";

    @Override
    public void beforeTestExecution(ExtensionContext context) {
        getStore(context).put(START_TIME, System.currentTimeMillis());
    }

    @Override
    public void afterTestExecution(ExtensionContext context) {
        long startTime = getStore(context)
            .remove(START_TIME, long.class);
        long duration = System.currentTimeMillis() - startTime;

        logger.info("Test {} took {} ms",
            context.getDisplayName(), duration);
    }

    private ExtensionContext.Store getStore(ExtensionContext context) {
        return context.getStore(
            ExtensionContext.Namespace.create(
                getClass(), context.getRequiredTestMethod()
            )
        );
    }
}

// Usage
@ExtendWith(TimingExtension.class)
class PerformanceSensitiveTest {
    @Test
    void shouldCompleteQuickly() {
        // test code
    }
}
\`\`\`

### Database Extension

\`\`\`java
public class DatabaseExtension implements
        BeforeAllCallback, AfterAllCallback,
        BeforeEachCallback, AfterEachCallback {

    private Connection connection;

    @Override
    public void beforeAll(ExtensionContext context) throws Exception {
        connection = DriverManager.getConnection(
            "jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1");
        runMigrations(connection);
    }

    @Override
    public void beforeEach(ExtensionContext context) throws Exception {
        connection.setAutoCommit(false);
    }

    @Override
    public void afterEach(ExtensionContext context) throws Exception {
        connection.rollback(); // Clean slate for each test
    }

    @Override
    public void afterAll(ExtensionContext context) throws Exception {
        connection.close();
    }
}
\`\`\`

---

## Mockito Integration

Mockito integrates with JUnit 5 through the \`MockitoExtension\`, providing clean dependency mocking with annotations.

\`\`\`java
@ExtendWith(MockitoExtension.class)
@DisplayName("Order Service Tests")
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PaymentGateway paymentGateway;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private OrderService orderService;

    @Captor
    private ArgumentCaptor<PaymentRequest> paymentCaptor;

    @Test
    @DisplayName("should process order and charge payment")
    void shouldProcessOrderAndCharge() {
        Order order = createTestOrder(100.00);
        when(paymentGateway.charge(any()))
            .thenReturn(new PaymentResult(true, "txn-123"));
        when(orderRepository.save(any()))
            .thenAnswer(inv -> inv.getArgument(0));

        OrderResult result = orderService.processOrder(order);

        assertTrue(result.isSuccess());

        verify(paymentGateway).charge(paymentCaptor.capture());
        PaymentRequest captured = paymentCaptor.getValue();
        assertEquals(100.00, captured.getAmount(), 0.01);

        verify(notificationService).sendConfirmation(order);
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("should rollback when payment fails")
    void shouldRollbackOnPaymentFailure() {
        Order order = createTestOrder(50.00);
        when(paymentGateway.charge(any()))
            .thenReturn(new PaymentResult(false, null));

        OrderResult result = orderService.processOrder(order);

        assertFalse(result.isSuccess());
        verify(orderRepository, never()).save(any());
        verify(notificationService, never()).sendConfirmation(any());
    }

    @Test
    @DisplayName("should handle payment gateway timeout")
    void shouldHandleTimeout() {
        Order order = createTestOrder(75.00);
        when(paymentGateway.charge(any()))
            .thenThrow(new PaymentTimeoutException("Gateway timeout"));

        assertThrows(OrderProcessingException.class, () ->
            orderService.processOrder(order)
        );

        verify(orderRepository).markAsFailed(
            eq(order.getId()), anyString()
        );
    }
}
\`\`\`

---

## Conditional Test Execution

JUnit 5 supports conditionally enabling or disabling tests based on the runtime environment.

\`\`\`java
@Test
@EnabledOnOs(OS.LINUX)
@DisplayName("should use Linux-specific file paths")
void linuxFilePaths() {
    assertEquals("/tmp/app", config.getTempDir());
}

@Test
@EnabledIfEnvironmentVariable(named = "CI", matches = "true")
@DisplayName("should run only in CI environment")
void ciOnlyTest() {
    // Integration test that requires CI infrastructure
}

@Test
@EnabledIfSystemProperty(named = "java.version", matches = "21.*")
@DisplayName("should use Java 21 features")
void java21Features() {
    // Test using Java 21 specific APIs
}

@Test
@EnabledIf("isExternalServiceAvailable")
@DisplayName("should connect to external service")
void externalServiceTest() {
    // Only runs when external service is reachable
}

boolean isExternalServiceAvailable() {
    try {
        new URL("https://api.example.com/health").openConnection()
            .connect();
        return true;
    } catch (Exception e) {
        return false;
    }
}
\`\`\`

---

## Integrating QA Skills for JUnit 5

Boost your JUnit 5 test generation with AI-powered QA skills:

\`\`\`bash
npx @qaskills/cli add junit5-testing
\`\`\`

This skill teaches your AI coding agent to generate idiomatic JUnit 5 tests with proper use of assertions, parameterized tests, nested classes, and Mockito integration patterns.

---

## 10 Best Practices for JUnit 5

1. **Use \`@DisplayName\` on every test.** Human-readable names make test reports understandable without reading the code.

2. **Prefer \`assertAll\` for multi-property checks.** Grouped assertions report all failures at once instead of stopping at the first.

3. **Use parameterized tests to eliminate duplication.** If you have three tests that differ only by input, consolidate them into a single parameterized test.

4. **Organize with \`@Nested\` classes.** Group tests by the state or scenario they describe, not by the method they test.

5. **Keep tests independent.** Each test should set up its own state in \`@BeforeEach\`. Never rely on test execution order.

6. **Use \`@ExtendWith\` instead of inheritance.** The extension model is composable. Avoid deep test class hierarchies.

7. **Mock external dependencies, not the class under test.** Mocking the system under test defeats the purpose of the test.

8. **Write one logical assertion per test.** \`assertAll\` can contain multiple checks for one logical assertion (verifying all properties of a returned object).

9. **Use \`assertThrows\` for exception testing.** It returns the exception so you can also verify the message and cause.

10. **Run tests in parallel with \`junit.jupiter.execution.parallel.enabled=true\`.** Design tests to be thread-safe from the start.

---

## 8 Anti-Patterns to Avoid

1. **Using \`@Test\` from JUnit 4.** Importing \`org.junit.Test\` instead of \`org.junit.jupiter.api.Test\` causes tests to silently not run on the Jupiter engine.

2. **Making test methods public.** JUnit 5 does not require public visibility. Package-private methods are cleaner and the convention for Jupiter tests.

3. **Overusing \`@Disabled\` without a reason.** Disabled tests accumulate and never get fixed. Always include a reason string: \`@Disabled("Blocked by JIRA-1234")\`.

4. **Catching exceptions manually.** Using try-catch in tests to verify exceptions is verbose and error-prone. Use \`assertThrows\` instead.

5. **Testing private methods directly.** If you feel the need to test a private method, your class likely has too many responsibilities. Extract it into a collaborator and test that.

6. **Sharing mutable state via static fields.** Static fields persist across tests and cause ordering dependencies. Use \`@BeforeEach\` to create fresh instances.

7. **Ignoring test execution time.** Tests that take seconds each accumulate into multi-minute suites. Profile slow tests and optimize or isolate them.

8. **Writing tests after the code is "done."** Writing tests first (TDD) or alongside the code ensures better design and higher coverage than backfilling tests later.

---

## Conclusion

JUnit 5 provides a modern, extensible foundation for Java testing. Its modular architecture, expressive annotations, and powerful parameterization features make it possible to write tests that are both comprehensive and maintainable. Combined with Mockito for mocking and the extension model for cross-cutting concerns, JUnit 5 is the testing framework that scales from small utilities to enterprise applications. Leverage QA skills from qaskills.sh to help your AI coding agents generate idiomatic JUnit 5 tests that follow these patterns from the start.
`,
};
