import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Kotest Tutorial 2026: Kotlin Testing with Specs, Matchers & Property Testing",
  description: "A practical Kotest tutorial for Kotlin: spec styles, shouldBe matchers, data-driven testing with withData, property testing with checkAll, and Gradle setup.",
  date: "2026-06-26",
  category: "Java",
  content: `# Kotest Tutorial 2026: Kotlin Testing with Specs, Matchers & Property Testing

Kotest is a flexible, idiomatic testing framework for Kotlin. Instead of JUnit's single class-and-method layout, Kotest gives you ten **spec styles** (\`StringSpec\`, \`FunSpec\`, \`DescribeSpec\`, \`BehaviorSpec\`, and more) so you can write tests as plain strings, BDD \`given/when/then\` blocks, or RSpec-like \`describe/it\` trees. It pairs a fluent \`shouldBe\` matcher library (hundreds of assertions, all infix), built-in **data-driven testing** via \`withData\`, and a first-class **property testing** engine (\`checkAll\` + \`Arb\` generators) in one toolkit. Kotest runs on the JUnit 5 Platform, so it executes in Gradle, Maven, and any IDE that knows JUnit 5.

This tutorial covers Kotest setup with Gradle, the most useful spec styles, the matcher DSL, soft assertions, exception testing, data-driven tests, property-based testing, and lifecycle hooks. For installable, agent-ready testing skills across stacks, see the [QASkills directory](/skills).

## Setting up Kotest with Gradle

Kotest ships as several modules. At minimum you need \`kotest-runner-junit5\` (the engine that plugs into the JUnit Platform) and \`kotest-assertions-core\` (the matchers). Add \`kotest-property\` when you want property testing.

\`\`\`kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "2.1.0"
}

dependencies {
    val kotestVersion = "5.9.1"
    testImplementation("io.kotest:kotest-runner-junit5:$kotestVersion")
    testImplementation("io.kotest:kotest-assertions-core:$kotestVersion")
    testImplementation("io.kotest:kotest-property:$kotestVersion")
}

tasks.test {
    useJUnitPlatform() // required — Kotest runs on the JUnit 5 Platform
}
\`\`\`

The single most common setup mistake is forgetting \`useJUnitPlatform()\`. Without it, Gradle uses the legacy JUnit 4 runner and discovers zero Kotest tests, so your suite passes by running nothing. Place test classes under \`src/test/kotlin\`. There is no required naming convention, but most teams suffix specs with \`Test\` or \`Spec\` (for example \`OrderServiceTest\`).

## Spec styles: pick the shape that fits

A Kotest test class extends one spec style. All styles produce identical results — they only change how you express the test tree. The four you will reach for most often:

| Spec style | Best for | Looks like |
|---|---|---|
| \`StringSpec\` | Quick unit tests, minimal nesting | \`"description" { ... }\` |
| \`FunSpec\` | JUnit-like, with \`test(...)\` and \`context(...)\` | \`test("name") { ... }\` |
| \`DescribeSpec\` | RSpec/Jest-style nested groups | \`describe { it { ... } }\` |
| \`BehaviorSpec\` | BDD scenarios | \`given { when { then { } } }\` |

### StringSpec — the simplest style

\`\`\`kotlin
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe

class CalculatorTest : StringSpec({
    "adding two numbers returns their sum" {
        Calculator().add(40, 2) shouldBe 42
    }

    "an empty calculator starts at zero" {
        Calculator().total shouldBe 0
    }
})
\`\`\`

Each string is a test name; the trailing lambda is the body. There is no \`@Test\` annotation — the spec's \`init\` block (the \`{ ... }\` passed to the constructor) registers everything.

### FunSpec — \`test\` and \`context\`

\`FunSpec\` is the closest to JUnit and the easiest migration target. \`context(...)\` groups related tests and can nest.

\`\`\`kotlin
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe

class OrderServiceTest : FunSpec({
    context("a new order") {
        test("starts empty") {
            Order().lineCount shouldBe 0
        }
        test("totals to zero") {
            Order().total shouldBe 0
        }
    }
})
\`\`\`

### DescribeSpec and BehaviorSpec — readable trees

\`\`\`kotlin
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe

class StackTest : DescribeSpec({
    describe("a stack") {
        it("is empty on creation") {
            Stack<Int>().isEmpty() shouldBe true
        }
        describe("after one push") {
            it("has size 1") {
                Stack<Int>().apply { push(1) }.size shouldBe 1
            }
        }
    }
})
\`\`\`

\`BehaviorSpec\` swaps \`describe/it\` for \`given/when/then\`, which maps cleanly onto acceptance criteria and produces test names like \`Given a logged-in user When they log out Then the session is cleared\`.

## Matchers: the \`shouldBe\` DSL

Kotest assertions are infix extension functions that read like English. The core one is \`shouldBe\` (and its negation \`shouldNotBe\`), but \`kotest-assertions-core\` adds hundreds of typed matchers.

\`\`\`kotlin
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldStartWith
import io.kotest.matchers.collections.shouldContainExactly
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.ints.shouldBeGreaterThan

"matchers read fluently" {
    "hello world" shouldStartWith "hello"
    "hello world" shouldContain "lo wo"

    listOf(1, 2, 3) shouldHaveSize 3
    listOf(1, 2, 3) shouldContainExactly listOf(1, 2, 3)

    val name: String? = "Ada"
    name.shouldNotBeNull()

    42 shouldBeGreaterThan 40
    42 shouldNotBe 0
}
\`\`\`

Matchers are organized by type into packages — \`io.kotest.matchers.string\`, \`.collections\`, \`.maps\`, \`.ints\`, \`.doubles\`, \`.date\`, and so on — so your IDE autocomplete only offers assertions valid for the value's type. You can also chain with \`should\` for a more sentence-like form, e.g. \`result should startWith("hello")\`.

### Soft assertions with \`assertSoftly\`

By default the first failed matcher throws and stops the test. Wrap several checks in \`assertSoftly\` to collect **all** failures and report them together — useful when verifying many fields of one object.

\`\`\`kotlin
import io.kotest.assertions.assertSoftly
import io.kotest.matchers.shouldBe

"a user is fully populated" {
    val user = userService.load(1)
    assertSoftly(user) {
        name shouldBe "Ada Lovelace"
        email shouldBe "ada@example.com"
        age shouldBe 36
    }
}
\`\`\`

## Testing exceptions

Use \`shouldThrow<T>\` to assert that a block throws a specific exception type; it returns the caught exception so you can inspect its message. \`shouldThrowExactly<T>\` rejects subclasses, and \`shouldNotThrowAny\` asserts the block completes cleanly.

\`\`\`kotlin
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain

"withdrawing more than the balance fails" {
    val account = Account(balance = 100)

    val ex = shouldThrow<IllegalArgumentException> {
        account.withdraw(500)
    }
    ex.message shouldContain "insufficient funds"
}
\`\`\`

## Data-driven testing with \`withData\`

Kotest builds parameterized testing into the spec itself — no separate \`@ParameterizedTest\` annotation or argument-source plumbing. \`withData\` generates one isolated test per input row, and each row shows up as its own entry in the report.

\`\`\`kotlin
import io.kotest.core.spec.style.FunSpec
import io.kotest.datatest.withData
import io.kotest.matchers.shouldBe

data class FizzBuzzCase(val input: Int, val expected: String)

class FizzBuzzTest : FunSpec({
    context("fizzbuzz") {
        withData(
            FizzBuzzCase(1, "1"),
            FizzBuzzCase(3, "Fizz"),
            FizzBuzzCase(5, "Buzz"),
            FizzBuzzCase(15, "FizzBuzz"),
        ) { (input, expected) ->
            fizzbuzz(input) shouldBe expected
        }
    }
})
\`\`\`

\`withData\` lives in the \`kotest-framework-datatest\` module (pulled in transitively by the runner). By default each test is named from the data class's \`toString()\`; pass a name function as the first argument — \`withData(nameFn = { "n=\${it.input}" }, ...)\` — for cleaner labels. There is also a \`Map\`-based overload where the keys become the test names.

## Property-based testing with \`checkAll\`

Property testing is one of Kotest's standout features. Instead of hand-picking examples, you assert a property that must hold for *all* inputs, and Kotest generates hundreds of random cases from \`Arb\` (arbitrary) generators. When a case fails, Kotest **shrinks** it to the smallest failing input so the report points straight at the boundary.

\`\`\`kotlin
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.property.checkAll
import io.kotest.property.Arb
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.string

class StringPropertiesTest : FunSpec({
    test("reversing a string twice returns the original") {
        checkAll<String> { s ->
            s.reversed().reversed() shouldBe s
        }
    }

    test("addition is commutative") {
        checkAll(Arb.int(), Arb.int()) { a, b ->
            a + b shouldBe b + a
        }
    }

    test("concatenation length is additive") {
        checkAll(Arb.string(), Arb.string()) { a, b ->
            (a + b).length shouldBe a.length + b.length
        }
    }
})
\`\`\`

\`checkAll\` runs 1000 iterations by default. Tighten or loosen it by passing an iteration count — \`checkAll(500, Arb.int()) { ... }\` — and constrain generators with builders like \`Arb.int(0..100)\` or \`Arb.positiveInt()\`. Use \`forAll { ... }\` (returning a \`Boolean\`) when you prefer a pure-predicate style instead of matchers. Common generators include \`Arb.int\`, \`Arb.string\`, \`Arb.boolean\`, \`Arb.list\`, \`Arb.element\`, \`Arb.enum\`, and \`Arb.bind\` for composing custom data classes.

## Lifecycle hooks and test isolation

Kotest exposes lifecycle callbacks inside the spec's \`init\` block. The most-used are \`beforeTest\`/\`afterTest\` (around every test) and \`beforeSpec\`/\`afterSpec\` (once per spec class).

\`\`\`kotlin
import io.kotest.core.spec.style.FunSpec

class RepositoryTest : FunSpec({
    lateinit var db: TestDatabase

    beforeSpec { db = TestDatabase.start() }
    afterSpec { db.stop() }

    beforeTest { db.clear() }

    test("inserts a row") {
        db.insert("a")
        db.count() shouldBe 1
    }
})
\`\`\`

Kotest also lets you set the **isolation mode** so state does not leak between tests. The default \`IsolationMode.SingleInstance\` reuses one spec instance; switch to \`InstancePerLeaf\` when each leaf test needs a fresh instance of the spec's fields:

\`\`\`kotlin
import io.kotest.core.spec.IsolationMode
import io.kotest.core.spec.style.FunSpec

class IsolatedTest : FunSpec({
    isolationMode = IsolationMode.InstancePerLeaf
    // each leaf test gets fresh top-level state
})
\`\`\`

## Running and configuring the suite

Because Kotest sits on the JUnit Platform, you run it the usual way:

\`\`\`bash
./gradlew test                      # run the whole suite
./gradlew test --tests "OrderServiceTest"   # a single spec class
\`\`\`

Project-wide configuration goes in a \`ProjectConfig\` class (an object extending \`AbstractProjectConfig\`) that Kotest auto-detects — there you can set the global default isolation mode, parallelism, default property test iteration count, and tags. Tags let you include or exclude groups of tests (for example \`@Tags("Integration")\`) via the \`kotest.tags\` system property.

For more on JVM testing approaches and how Kotest compares to JUnit and Spock-style frameworks, browse the [blog](/blog) and the framework [comparison hub](/compare).

## Kotest vs JUnit 5: when to use which

Because Kotest runs on the JUnit 5 Platform, the choice is rarely about capability — both can express the same tests and both run under the same Gradle/Maven task. The decision is about ergonomics, how much extra tooling you want bundled, and what your team already knows. The table below summarizes the practical differences.

| Concern | Kotest | JUnit 5 |
|---|---|---|
| Test structure | Ten spec styles (strings, BDD, describe/it) | Annotations (\`@Test\`, \`@Nested\`) |
| Assertions | Built-in fluent matchers (\`shouldBe\`) | Bare \`assertEquals\`; usually add AssertJ |
| Parameterized tests | \`withData\` built in | \`@ParameterizedTest\` + argument sources |
| Property testing | First-class (\`checkAll\`, \`Arb\`, shrinking) | External (e.g. jqwik) |
| Soft assertions | \`assertSoftly\` built in | \`assertAll\` |
| Coroutine support | Native suspend test bodies | Manual \`runBlocking\` |
| Ecosystem familiarity | Kotlin-specific | Industry default across the JVM |

**When to pick Kotest.** Choose Kotest for new Kotlin codebases where you value readable test trees, want property testing and data-driven tests without bolting on extra libraries, or test heavily asynchronous code — Kotest test bodies are suspending functions, so you can call \`suspend\` code directly without wrapping it in \`runBlocking\`. The bundled matchers and \`assertSoftly\` also mean fewer dependencies to manage. Teams that have adopted a BDD style appreciate \`BehaviorSpec\` mapping one-to-one onto acceptance criteria.

**When to pick JUnit 5.** Stay on JUnit 5 when you have a large existing JUnit suite, a mixed Java/Kotlin codebase where Java tests dominate, or when contributors and tooling expect the annotation-based layout that is the JVM default. JUnit 5 plus AssertJ and Mockito remains the most widely documented stack, which lowers onboarding friction for newcomers.

**Verdict.** For a Kotlin-first project starting fresh, Kotest is the stronger default: it consolidates matchers, data-driven testing, property testing, and coroutine support into one framework while still running on the JUnit Platform you already trust. For incremental adoption you do not have to choose — Kotest specs and JUnit 5 tests coexist in the same module and run together, so you can introduce Kotest gradually and keep existing JUnit tests untouched. If you are weighing testing skills for an AI coding agent, an installable Kotlin or JVM testing skill can drop the right matchers and spec conventions straight into your workflow.

## Frequently Asked Questions

### What is Kotest used for?

Kotest is a testing framework for Kotlin used for unit, integration, and property-based tests. It provides multiple spec styles for structuring tests, a large fluent matcher library for assertions, built-in data-driven testing, and a property-testing engine with automatic shrinking. It runs on the JUnit 5 Platform, so it executes anywhere JUnit 5 tests do, including Gradle, Maven, and IDEs.

### How is Kotest different from JUnit 5?

JUnit 5 uses annotations (\`@Test\`, \`@ParameterizedTest\`) and a single class-per-test layout, whereas Kotest registers tests inside a spec's \`init\` block and offers ten styles from plain strings to BDD \`given/when/then\`. Kotest bundles its own matchers, data-driven testing, and property testing, so you rarely need add-on libraries. Crucially, Kotest is built *on* the JUnit 5 Platform, so the two can coexist in the same project and share the same Gradle/Maven runner.

### Do I need a separate library for property testing in Kotest?

Yes — add the \`io.kotest:kotest-property\` dependency. It provides the \`Arb\` generators, \`checkAll\`, and \`forAll\` functions plus the shrinking engine. The \`kotest-assertions-core\` and \`kotest-runner-junit5\` modules do not include property testing, so adding \`kotest-property\` is the one extra step.

### How do I run a single Kotest test from Gradle?

Use Gradle's standard test filtering, for example \`./gradlew test --tests "com.example.OrderServiceTest"\` to run one spec class. Most IDEs (IntelliJ IDEA in particular) also let you click the gutter icon next to an individual test name to run just that test. Make sure \`useJUnitPlatform()\` is set in your \`test\` task, or no Kotest tests will be discovered.

### What is \`withData\` in Kotest?

\`withData\` is Kotest's built-in data-driven (parameterized) testing function. You pass it a list of input values — often instances of a data class — and it generates one isolated, separately-reported test per value, removing the need for JUnit's \`@ParameterizedTest\` and argument sources. You can supply a name function to control how each generated test is labeled in the report.

### Which Kotest spec style should I choose?

There is no wrong answer because all styles produce identical results, so pick by readability. Use \`StringSpec\` for quick, flat unit tests; \`FunSpec\` if you want a JUnit-like \`test(...)\`/\`context(...)\` feel; \`DescribeSpec\` for nested RSpec/Jest-style trees; and \`BehaviorSpec\` when you want BDD \`given/when/then\` that mirrors acceptance criteria. You can even mix different styles across classes in the same project.
`,
};
