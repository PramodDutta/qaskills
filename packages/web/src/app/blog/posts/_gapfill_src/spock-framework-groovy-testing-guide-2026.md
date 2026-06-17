TITLE: Spock Framework Groovy Testing Guide (2026)
DESCRIPTION: A practical Spock framework guide for Groovy: given/when/then blocks, data-driven tests with where: tables, mocks and stubs, and JUnit 5 setup.
DATE: 2026-06-15
CATEGORY: Java
---
# Spock Framework Groovy Testing Guide

Spock is a testing and specification framework for Java and Groovy applications. You write tests as Groovy "specifications" — classes extending `spock.lang.Specification` — using readable `given:`/`when:`/`then:` blocks that read like behavior descriptions rather than plain assertions. Spock's headline features are its built-in data-driven testing with `where:` tables (one test method, many input rows), expressive power assertions that print every value in a failed expression, and a clean built-in mocking and stubbing DSL — no extra library needed. Spock runs on the JUnit 5 platform, so it executes anywhere JUnit tests do, including Maven Surefire, Gradle, and your IDE.

This guide covers Spock setup, the block structure, assertions, data-driven tests with `where:`, interaction-based testing with mocks and stubs, and a realistic Spring-friendly example. For installable, agent-ready testing skills across stacks, see the [QASkills directory](/skills).

## Setting up Spock

Spock is written in Groovy and tests Java or Groovy code. You need the Groovy compiler for the test source set plus the Spock dependency. With Gradle:

```groovy
plugins {
    id 'groovy'
}

dependencies {
    testImplementation 'org.spockframework:spock-core:2.4-M5-groovy-4.0'
    testImplementation 'org.apache.groovy:groovy:4.0.24'
}

test {
    useJUnitPlatform()   // Spock 2.x runs on the JUnit 5 platform
}
```

With Maven you add `spock-core`, the `gmavenplus-plugin` to compile Groovy test sources, and ensure Surefire uses the JUnit Platform. Spock 2.x version strings are tied to a Groovy line (e.g. `-groovy-4.0`), so match the suffix to your Groovy version. Place specifications under `src/test/groovy` with class names ending in `Spec` by convention (e.g. `UserServiceSpec`).

## The anatomy of a specification

A Spock test method is called a **feature method** and its body is organized into labeled blocks. The most common are `given:` (setup), `when:` (the action), `then:` (the response/assertions), and `expect:` (a combined stimulus-and-check for simple cases).

```groovy
import spock.lang.Specification

class CalculatorSpec extends Specification {

    def "adds two numbers"() {
        given: "a calculator"
        def calc = new Calculator()

        when: "adding 40 and 2"
        def result = calc.add(40, 2)

        then: "the result is 42"
        result == 42
    }

    def "knows the answer"() {
        expect: "a simple, side-effect-free truth"
        Math.max(40, 2) == 40
    }
}
```

Method names are plain strings, so they read as specifications. Inside a `then:` block, every boolean expression is an implicit assertion — you write `result == 42`, not `assert` or `assertEquals`. This is one of Spock's most loved features: assertions are just expressions, and when one fails, Spock's **power assertions** print the value of every sub-expression so you see exactly what was wrong without adding a message.

You can also assert exceptions inside `then:` with `thrown()`:

```groovy
def "rejects division by zero"() {
    when:
    new Calculator().divide(1, 0)

    then:
    def e = thrown(ArithmeticException)
    e.message.contains("zero")
}
```

Other blocks include `and:` (to subdivide any block for readability), `cleanup:` (always runs, like a finally), and `setup:` (an alias for `given:`). The `expect:` block combines stimulus and assertion and is ideal for pure functions and data-driven tests.

## Data-driven testing with where: tables

This is the feature that sells Spock to most teams. Instead of writing five near-identical tests or fiddling with JUnit's `@ParameterizedTest`, you write one feature method and supply rows in a `where:` block. Each row runs as a separate iteration.

```groovy
class MaxSpec extends Specification {

    def "max of #a and #b is #expected"() {
        expect:
        Math.max(a, b) == expected

        where:
        a  | b  || expected
        1  | 3  || 3
        7  | 2  || 7
        -5 | -9 || -5
        0  | 0  || 0
    }
}
```

The table is real Groovy: columns are separated by `|`, and the conventional `||` visually separates inputs from expected outputs (it is still just a separator, but the double-pipe reads as "therefore"). The variables `a`, `b`, and `expected` are declared by the table headers and used in the `expect:` block. The `#a`, `#b`, `#expected` placeholders in the method name are unrolled per iteration, so a failing row reports as `max of 7 and 2 is 7` — you instantly know which input failed.

Spock unrolls data-driven features by default in 2.x, so each row appears as its own test in reports. You can also drive data from other sources:

```groovy
def "validates email #email -> #valid"() {
    expect:
    new EmailValidator().isValid(email) == valid

    where:
    email              | valid
    "a@b.com"          | true
    "no-at-sign"       | false
    ""                 | false
}
```

For larger datasets you can read rows from a `where:` using data pipes (`email << ['a@b.com', 'x@y.io']`) or even external files, but the table form is the everyday workhorse and the reason Spock tests stay short.

## Mocks and stubs

Spock ships its own mocking framework, so you do not pull in Mockito. Create a **Stub** when you only need canned return values, and a **Mock** when you also want to verify interactions. Both are created with `Stub()` / `Mock()` and the type.

```groovy
class OrderServiceSpec extends Specification {

    def repository = Mock(OrderRepository)
    def gateway = Stub(PaymentGateway)
    def service = new OrderService(repository, gateway)

    def "charges and saves a paid order"() {
        given: "the gateway approves the charge"
        gateway.charge("tok_visa", 4200) >> new ChargeResult("ch_1", true)

        when:
        service.purchase("tok_visa", 4200)

        then: "the order is saved exactly once with PAID status"
        1 * repository.save({ it.status == OrderStatus.PAID })
    }
}
```

Two pieces of Spock DSL do the work here:

- **Stubbing with `>>`:** `gateway.charge("tok_visa", 4200) >> result` says "when charge is called with these args, return this." Use `>>>` for a sequence of return values across calls, and `>> { args -> ... }` to compute a return value from the arguments.
- **Interaction verification in `then:`:** `1 * repository.save(...)` asserts the method was called exactly once. The cardinality goes first (`0 *`, `1 *`, `(1..3) *`, `_ *` for any number), then the target, then argument constraints. The closure `{ it.status == PAID }` is an argument matcher — it must return true for the call to count.

Argument constraints can use `_` (any value), `!null`, type checks (`_ as String`), or a closure predicate. Putting stubbing in `given:`/`when:` and verification in `then:` keeps the specification readable: setup returns, action runs, then you assert which interactions happened.

## A realistic Spring example

Spock pairs well with Spring via `spock-spring`, letting you write `@SpringBootTest` specifications. Even without the full Spring context, the same structure scales to service-layer tests:

```groovy
class CheckoutSpec extends Specification {

    def inventory = Mock(InventoryService)
    def payments  = Mock(PaymentGateway)
    def checkout  = new CheckoutService(inventory, payments)

    def "reserves stock then charges, in that order"() {
        when:
        checkout.buy("SKU-1", "tok_visa")

        then: "stock is reserved before payment is taken"
        1 * inventory.reserve("SKU-1") >> true

        then:
        1 * payments.charge("tok_visa", _)
    }

    def "does not charge when stock reservation fails"() {
        given:
        inventory.reserve(_) >> false

        when:
        checkout.buy("SKU-1", "tok_visa")

        then:
        thrown(OutOfStockException)
        0 * payments.charge(_, _)
    }
}
```

Splitting `then:` into two consecutive blocks asserts **ordering** — Spock enforces that the first block's interactions happen before the second's. The `0 * payments.charge(_, _)` confirms a negative interaction: payment must not be attempted when reservation fails.

## Lifecycle hooks and shared state

Spock provides fixture methods that mirror JUnit's setup/teardown but read more naturally. `setup()` runs before every feature method, `cleanup()` after every one, and `setupSpec()`/`cleanupSpec()` run once for the whole specification. Fields are reset between features by default — each feature method gets fresh instance fields — which prevents accidental state leakage. When you genuinely want state to persist across features (an expensive resource like a database connection), mark the field `@Shared`.

```groovy
class RepositorySpec extends Specification {

    @Shared
    DataSource dataSource      // created once, shared across all features

    UserRepository repository  // recreated for every feature

    def setupSpec() {
        dataSource = new EmbeddedDataSource()   // expensive: do it once
    }

    def setup() {
        repository = new UserRepository(dataSource)  // cheap: fresh each test
    }

    def cleanupSpec() {
        dataSource.close()
    }

    def "finds a saved user"() {
        given:
        repository.save(new User(1, "Ada"))

        expect:
        repository.findById(1).name == "Ada"
    }
}
```

The rule of thumb: keep per-test state in plain fields (recreated each feature for isolation) and reserve `@Shared` for costly resources you initialize in `setupSpec()`. This gives you fast, isolated tests without paying the setup cost repeatedly.

## Helper methods and @Subject

As specifications grow, extract repeated assertion logic into helper methods. A subtlety: assertions inside a helper method do not automatically participate in Spock's implicit-assertion magic, so annotate such methods so failures still produce power-assertion output. Use the `void` return type with explicit `assert`, or mark the class members clearly. You can also annotate the class-under-test field with `@Subject` to document intent (it does not change behavior but improves readability and tooling hints):

```groovy
class OrderSpec extends Specification {

    @Subject
    OrderService service = new OrderService()

    def "totals include tax"() {
        expect:
        hasTotal(service.price(100, "CA"), 107.25)
    }

    // helper: explicit asserts so failures are reported with detail
    void hasTotal(BigDecimal actual, double expected) {
        assert actual == expected as BigDecimal
    }
}
```

Combined with `@Shared`, `@Subject`, and the block structure, these conventions keep larger Spock suites organized and the failure output informative.

## Common pitfalls

- **Wrong Groovy/Spock version pairing** — the `-groovy-X.Y` suffix on `spock-core` must match your Groovy version, or you get cryptic compilation or runtime errors. Check both.
- **Forgetting `useJUnitPlatform()`** — Spock 2.x runs on JUnit 5; without enabling the platform, Gradle/Surefire will not discover your specs.
- **`@Unroll` confusion** — in Spock 2.x data-driven features are unrolled by default, so you rarely need the explicit annotation; the `#placeholder` tokens in the method name still control how each iteration is labeled.
- **Stubbing in the wrong block** — define interaction-with-return (`>>`) where it reads naturally (often `given:`), but pure verification (`1 * ...`) belongs in `then:`. Mixing them up leads to "too few/many invocations" errors.

For more on JVM testing approaches and how Spock compares to JUnit-based stacks, browse the [blog](/blog) and the framework [comparison hub](/compare).

## Frequently Asked Questions

### What is the Spock framework used for?

Spock is a testing and specification framework for Java and Groovy applications. It is used for unit, integration, and behavior-style tests, with first-class support for data-driven testing via `where:` tables, expressive power assertions, and a built-in mocking DSL. It runs on the JUnit 5 platform, so it works wherever JUnit tests run.

### Do I need to know Groovy to use Spock?

You need basic Groovy familiarity because specifications are Groovy classes, but the surface area is small. You write feature methods with `given:`/`when:`/`then:` blocks, use plain boolean expressions as assertions, and fill `where:` tables — most Java developers pick this up quickly. You can test plain Java code from Groovy specifications without writing application code in Groovy.

### How do data-driven tests work in Spock?

You write one feature method and supply input rows in a `where:` block, using `|` to separate columns. Each row runs as a separate iteration, and `#variable` placeholders in the method name label each iteration so a failing row reports its exact inputs. This replaces writing many near-identical tests or configuring JUnit parameterized tests.

### How do mocks and stubs differ in Spock?

A `Stub()` provides canned return values and you do not verify how it was called; use it for collaborators that just feed data in. A `Mock()` also lets you verify interactions, so you assert cardinality like `1 * mock.method(args)` in the `then:` block. You stub return values with the `>>` operator on either.

### Does Spock work with JUnit 5?

Yes. Spock 2.x runs directly on the JUnit 5 (JUnit Platform) engine, so your specifications are discovered and executed alongside JUnit 5 tests by Gradle, Maven Surefire, and IDEs. You enable it by configuring the build to use the JUnit Platform, for example `useJUnitPlatform()` in Gradle's `test` task.

### How does Spock compare to JUnit plus Mockito?

Spock bundles features that JUnit needs add-ons for: data tables instead of `@ParameterizedTest`, power assertions instead of an assertion library, and a built-in mocking DSL instead of Mockito. The trade-off is writing tests in Groovy and pairing the right Groovy version. Teams often choose Spock for its readability and integrated tooling, while JUnit 5 plus AssertJ and Mockito remains the mainstream pure-Java stack.
