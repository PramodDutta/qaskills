TITLE: Mockito Tutorial: Java Mocking Guide for JUnit 5 (2026)
DESCRIPTION: A practical Mockito tutorial for Java: mock and spy objects, when()/thenReturn, verify, ArgumentCaptor, @Mock and @InjectMocks, plus JUnit 5 setup.
DATE: 2026-06-15
CATEGORY: Java
---
# Mockito Tutorial: Java Mocking Guide for JUnit 5

Mockito is the most widely used mocking framework for Java. It lets you replace a class's real collaborators with lightweight test doubles so you can isolate the unit under test, control what those collaborators return, and verify how they were called. In a typical test you create a mock with `mock()` or `@Mock`, define behavior with `when(...).thenReturn(...)`, inject it into the class under test with `@InjectMocks`, and confirm interactions with `verify(...)`. Mockito 5 targets Java 11+, integrates with JUnit 5 through `@ExtendWith(MockitoExtension.class)`, and uses an inline mock maker by default so it can mock final classes and static methods out of the box.

This guide walks through everything you need to write real Mockito tests: setup with JUnit 5, the difference between mocks and spies, stubbing return values and exceptions, verifying interactions, capturing arguments with `ArgumentCaptor`, the annotation workflow, and the errors you will inevitably hit. If you want runnable, agent-installable testing skills for Java and other stacks, the [QASkills directory](/skills) has them.

## Installing Mockito with JUnit 5

Add Mockito and JUnit 5 to your build. With Maven:

```xml
<dependency>
  <groupId>org.junit.jupiter</groupId>
  <artifactId>junit-jupiter</artifactId>
  <version>5.11.3</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.mockito</groupId>
  <artifactId>mockito-junit-jupiter</artifactId>
  <version>5.14.2</version>
  <scope>test</scope>
</dependency>
```

The `mockito-junit-jupiter` artifact pulls in `mockito-core` transitively and provides `MockitoExtension`. With Gradle:

```groovy
testImplementation 'org.junit.jupiter:junit-jupiter:5.11.3'
testImplementation 'org.mockito:mockito-junit-jupiter:5.14.2'
```

Mockito 5 enables the inline mock maker by default, which is why you no longer need a separate `mockito-inline` dependency (that artifact was removed in Mockito 5 because its behavior became the standard). This is what lets Mockito mock `final` classes, `final` methods, and `static` methods without extra setup.

## Creating your first mock

A mock is a fake object whose methods, by default, do nothing and return type-appropriate defaults: `null` for objects, `0` for numbers, `false` for booleans, and empty collections for `List`, `Set`, and `Map`. You teach it to behave with stubbing.

Suppose you have a service that depends on a repository:

```java
public class UserService {
    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    public String greet(long id) {
        User user = repository.findById(id);
        if (user == null) {
            throw new UserNotFoundException(id);
        }
        return "Hello, " + user.getName();
    }
}
```

A focused unit test mocks the repository so no database is touched:

```java
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;

class UserServiceTest {
    @Test
    void greetsKnownUser() {
        UserRepository repository = mock(UserRepository.class);
        when(repository.findById(1L)).thenReturn(new User(1L, "Ada"));

        UserService service = new UserService(repository);

        assertEquals("Hello, Ada", service.greet(1L));
    }
}
```

The `when(repository.findById(1L)).thenReturn(...)` line is a stub: it says "when `findById` is called with `1L`, return this user." For any other argument the mock falls back to its default (`null`), which is exactly what we want to test the not-found path.

## The annotation workflow: @Mock, @InjectMocks, @Spy

Creating mocks by hand is fine for one or two collaborators, but the annotation style scales better and reads more cleanly. Enable it with `@ExtendWith(MockitoExtension.class)` on the JUnit 5 test class.

```java
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class UserServiceAnnotatedTest {

    @Mock
    UserRepository repository;        // a fresh mock per test

    @InjectMocks
    UserService service;              // mocks injected into this real object

    @Test
    void greetsKnownUser() {
        when(repository.findById(1L)).thenReturn(new User(1L, "Ada"));
        assertEquals("Hello, Ada", service.greet(1L));
    }

    @Test
    void throwsForUnknownUser() {
        when(repository.findById(99L)).thenReturn(null);
        assertThrows(UserNotFoundException.class, () -> service.greet(99L));
    }
}
```

`@Mock` creates a mock for each annotated field before every test. `@InjectMocks` constructs the real object under test and injects the mocks into it — Mockito tries constructor injection first, then setter, then field injection. `@Spy` (covered below) wraps a real object so unstubbed methods run their real implementation.

By default `MockitoExtension` runs in strict stubbing mode, which fails the test if you declare a stub that is never used. That is a feature: it catches dead stubs and typos early.

## Mock vs spy: when to use each

A **mock** replaces the object entirely — every method is faked unless you stub it. A **spy** wraps a real instance — every method runs for real unless you stub it. Reach for a spy only when you genuinely want most of the real behavior but need to override one or two methods, typically on legacy code you cannot easily refactor.

```java
List<String> realList = new ArrayList<>();
List<String> spy = spy(realList);

spy.add("one");            // real method runs, element is actually added
spy.add("two");

assertEquals(2, spy.size()); // real size()

// Stub a single method; note doReturn for spies to avoid calling the real method
doReturn(100).when(spy).size();
assertEquals(100, spy.size());
```

Note the `doReturn(...).when(spy).size()` syntax instead of `when(spy.size()).thenReturn(100)`. With a spy, `when(spy.size())` would call the real `size()` first, which is often harmless but can be dangerous if the real method has side effects or throws. The `doReturn`/`doThrow`/`doAnswer` family avoids invoking the real method during stubbing and is the safe default for spies.

## Stubbing: thenReturn, thenThrow, thenAnswer

Stubbing controls what a mocked method returns. The common forms:

```java
// Return a fixed value
when(repository.count()).thenReturn(5L);

// Return different values on consecutive calls
when(repository.count()).thenReturn(1L, 2L, 3L);

// Throw an exception
when(repository.findById(anyLong())).thenThrow(new DataAccessException("db down"));

// Compute the answer dynamically from the arguments
when(repository.findById(anyLong())).thenAnswer(invocation -> {
    long id = invocation.getArgument(0);
    return new User(id, "user-" + id);
});
```

For void methods you cannot use `when(...)`, so use the `do*` family:

```java
doThrow(new IllegalStateException()).when(mailer).send(any(Email.class));
doNothing().when(mailer).send(any(Email.class)); // explicit no-op
```

## Argument matchers

Matchers let a stub respond to a range of inputs rather than one exact value. Common ones live on `org.mockito.ArgumentMatchers`: `any()`, `anyLong()`, `anyString()`, `eq(value)`, `isNull()`, `argThat(predicate)`. The cardinal rule: **if you use a matcher for one argument, you must use matchers for all arguments** of that call. Mix a raw value with a matcher and Mockito throws `InvalidUseOfMatchersException`. Wrap the literal in `eq(...)`:

```java
// WRONG — raw "active" mixed with anyLong()
when(repository.findByStatus(anyLong(), "active")).thenReturn(list);

// RIGHT
when(repository.findByStatus(anyLong(), eq("active"))).thenReturn(list);
```

## Verifying interactions

Stubbing controls inputs; verification asserts outputs in terms of calls. `verify(mock)` confirms a method was called, optionally with a count and specific arguments.

```java
verify(mailer).send(any(Email.class));            // exactly once (default)
verify(mailer, times(2)).send(any());
verify(mailer, never()).send(argThat(Email::isSpam));
verify(repository, atLeastOnce()).findById(1L);

// No other interactions happened beyond what was verified
verifyNoMoreInteractions(repository);
```

`times(n)`, `never()`, `atLeast(n)`, `atMost(n)`, and `only()` cover the cardinalities you need. Use verification deliberately — over-verifying every call couples your test to implementation details and makes refactoring painful. Verify the interactions that matter to the behavior under test.

## Capturing arguments with ArgumentCaptor

When a mock receives a complex object you constructed inside the method under test, you often want to assert on its fields. `ArgumentCaptor` grabs the actual argument passed to the mock so you can inspect it after the fact.

```java
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;

@Captor
ArgumentCaptor<Email> emailCaptor;

@Test
void sendsWelcomeEmail() {
    notificationService.welcome(new User(1L, "Ada", "ada@example.com"));

    verify(mailer).send(emailCaptor.capture());

    Email sent = emailCaptor.getValue();
    assertEquals("ada@example.com", sent.getTo());
    assertTrue(sent.getSubject().contains("Welcome"));
}
```

Declare the captor with `@Captor` (or `ArgumentCaptor.forClass(Email.class)`), pass `captor.capture()` inside `verify(...)`, then read `getValue()` (or `getAllValues()` for multiple invocations). Prefer `ArgumentCaptor` for asserting on captured state and `argThat(...)` for matching during stubbing — they solve different problems.

## A realistic end-to-end test

Putting it together for an order-checkout service that charges a payment gateway and persists the order:

```java
@ExtendWith(MockitoExtension.class)
class CheckoutServiceTest {

    @Mock PaymentGateway gateway;
    @Mock OrderRepository orders;
    @Captor ArgumentCaptor<Order> orderCaptor;

    @InjectMocks CheckoutService checkout;

    @Test
    void chargesAndPersistsOnSuccess() {
        when(gateway.charge(eq("tok_visa"), eq(4200L)))
            .thenReturn(new ChargeResult("ch_123", true));

        Receipt receipt = checkout.purchase("tok_visa", cartOf(4200L));

        assertEquals("ch_123", receipt.chargeId());
        verify(orders).save(orderCaptor.capture());
        assertEquals(OrderStatus.PAID, orderCaptor.getValue().status());
    }

    @Test
    void doesNotPersistWhenChargeDeclined() {
        when(gateway.charge(anyString(), anyLong()))
            .thenReturn(new ChargeResult(null, false));

        assertThrows(PaymentDeclinedException.class,
            () -> checkout.purchase("tok_bad", cartOf(4200L)));

        verify(orders, never()).save(any());
    }
}
```

This isolates `CheckoutService` from the real gateway and database, exercises both the happy and declined paths, and verifies the side effects that matter.

## BDDMockito: given/willReturn style

If your team writes tests in a behavior-driven, given-when-then style, Mockito offers `BDDMockito`, which is the same engine with more readable aliases. `given(...).willReturn(...)` replaces `when(...).thenReturn(...)`, and `then(mock).should()` replaces `verify(mock)`.

```java
import static org.mockito.BDDMockito.*;

// given
given(repository.findById(1L)).willReturn(new User(1L, "Ada"));

// when
String result = service.greet(1L);

// then
assertEquals("Hello, Ada", result);
then(repository).should().findById(1L);
```

The behavior is identical to the classic API — it is purely about readability — but it aligns the test structure with the given-when-then vocabulary your specs may already use. `willThrow`, `willAnswer`, and `willDoNothing` mirror the `then*`/`do*` families.

## Verifying call order with InOrder

When the sequence of interactions matters — for example, stock must be reserved before payment is taken — plain `verify` is not enough because it ignores order. `InOrder` asserts that calls happened in a specific sequence across one or more mocks.

```java
InOrder inOrder = inOrder(inventory, gateway);
inOrder.verify(inventory).reserve("SKU-1");
inOrder.verify(gateway).charge(anyString(), anyLong());
```

The verifications must appear in the order the calls were expected to occur; if `charge` happened before `reserve`, the test fails. This catches ordering regressions that interaction-count assertions would miss.

## Mockito with Spring Boot

In Spring Boot tests you often want a Mockito mock to replace a bean in the application context rather than constructing the object yourself. Spring Boot's `@MockBean` (or, in recent Spring versions, `@MockitoBean`) creates a Mockito mock and registers it in the context, replacing any real bean of that type. You then stub and verify it exactly as a normal Mockito mock.

```java
@SpringBootTest
class GreetingControllerTest {

    @MockBean UserRepository repository;   // Mockito mock injected into the context

    @Autowired GreetingService service;    // real bean, uses the mocked repository

    @Test
    void greetsKnownUser() {
        when(repository.findById(1L)).thenReturn(new User(1L, "Ada"));
        assertEquals("Hello, Ada", service.greet(1L));
    }
}
```

This bridges Mockito's stubbing/verification with Spring's dependency injection, so you can write slice or integration tests that exercise real Spring wiring while controlling specific collaborators. It is the standard way to isolate a repository, client, or external service inside a Spring context.

## Common errors and fixes

- **`UnnecessaryStubbingException`** — you declared a stub that no test path used. Remove it, or if it is shared setup that some tests legitimately skip, mark it lenient with `lenient().when(...)` or annotate the class with `@MockitoSettings(strictness = Strictness.LENIENT)`.
- **`WrongTypeOfReturnValue`** — usually caused by nesting a stub inside another stub's call, or stubbing the wrong overload. Stub each mock on its own line.
- **`InvalidUseOfMatchersException`** — you mixed raw values and matchers; wrap literals in `eq(...)`.
- **Cannot mock/stub a method** — if you are spying, switch to `doReturn().when(spy)` so the real method is not called during stubbing.
- **`NullPointerException` in the class under test** — `@InjectMocks` could not inject a dependency (often because there is no matching constructor/field). Verify field types match and that the dependency is annotated `@Mock`.

For more on structuring Java unit tests around JUnit 5, see our [Java testing guides on the blog](/blog), and compare mocking frameworks side by side on the [comparison hub](/compare).

## Frequently Asked Questions

### What is the difference between a mock and a spy in Mockito?

A mock is a fully fake object: every method returns a default value (null, 0, empty collection) until you stub it. A spy wraps a real object so unstubbed methods run their real implementation. Use mocks to isolate the unit under test completely, and spies only when you need most of the real behavior but want to override one or two methods.

### Do I still need the mockito-inline dependency in 2026?

No. Mockito 5 made the inline mock maker the default, so the separate `mockito-inline` artifact was removed. With `mockito-core` (pulled in by `mockito-junit-jupiter`) you can mock final classes, final methods, and static methods without any extra dependency or configuration file.

### How do I integrate Mockito with JUnit 5?

Add the `mockito-junit-jupiter` dependency and annotate your test class with `@ExtendWith(MockitoExtension.class)`. Then use `@Mock` for collaborators and `@InjectMocks` for the class under test. The extension initializes mocks before each test and validates strict stubbing afterward, so you do not need to call `MockitoAnnotations.openMocks()` manually.

### Why does Mockito say UnnecessaryStubbingException?

`MockitoExtension` runs in strict stubbing mode by default and fails the test when a declared stub is never exercised. Either delete the unused stub, or if it is intentional shared setup, make it lenient with `lenient().when(...)` or set `@MockitoSettings(strictness = Strictness.LENIENT)` on the class.

### How do I verify a method was called with a specific argument?

Use `verify(mock).method(eq(expectedValue))` for an exact match, or pass an `ArgumentCaptor` via `captor.capture()` inside `verify(...)` and then assert on `captor.getValue()`. The captor approach is best when you need to inspect multiple fields of a complex object that was built inside the method under test.

### Can Mockito mock static methods?

Yes, since Mockito 3.4 and by default in Mockito 5. Use `Mockito.mockStatic(SomeClass.class)` inside a try-with-resources block so the static mock is scoped and automatically closed. Within the block you stub static calls with `when(SomeClass.staticMethod()).thenReturn(...)`, and the real static behavior is restored once the block exits.
