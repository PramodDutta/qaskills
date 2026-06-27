import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "MockK Guide 2026: Mocking Kotlin Classes, Coroutines & relaxed Mocks",
  description: "A practical MockK guide for Kotlin: mock classes with every/verify, stub suspend functions via coEvery/coVerify, use relaxed mocks, slots, spies, and JUnit 5.",
  date: "2026-06-26",
  category: "Java",
  content: `MockK is a Kotlin-first mocking library that handles the language features JVM mocks like Mockito struggle with: \`final\` classes (Kotlin's default), \`object\` singletons, extension functions, and \`suspend\` coroutines. You stub with \`every { mock.call() } returns value\`, verify with \`verify { ... }\`, and mock suspend functions with the parallel \`coEvery\` / \`coVerify\` DSL. Pass \`relaxed = true\` to auto-stub every function so you only specify the calls you care about. This guide covers class mocking, relaxed mocks, coroutine support, argument capturing, spies, static/object mocks, and JUnit 5 wiring — all with the real MockK 1.14.x API.

This guide assumes Kotlin on the JVM with JUnit 5. For installable, agent-ready testing skills across stacks, see the [QASkills directory](/skills).

## Setting up MockK with Gradle

MockK ships as a single core artifact, \`io.mockk:mockk\`. Add it as a test dependency. The latest line at the time of writing is **1.14.7**.

\`\`\`kotlin
// build.gradle.kts
dependencies {
    testImplementation("io.mockk:mockk:1.14.7")
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
}

tasks.test {
    useJUnitPlatform()
}
\`\`\`

That one dependency includes the coroutine (\`coEvery\`/\`coVerify\`), static, object, and JUnit 5 support — there is no separate add-on module to remember. MockK works with plain JUnit 5 (or JUnit 4, Kotest, TestNG) because mocking and the test runner are independent concerns.

## Mocking a class: \`every\`, \`returns\`, \`verify\`

The core loop is three calls: create a mock with \`mockk<T>()\`, stub behavior with \`every { } returns\`, then assert interaction with \`verify { }\`. MockK can mock \`final\` classes out of the box, which matters because Kotlin classes are \`final\` unless explicitly marked \`open\` — this is the single biggest reason Kotlin teams reach for MockK over a vanilla Mockito setup.

\`\`\`kotlin
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import io.mockk.confirmVerified
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

class CarService(private val car: Car) {
    fun start(): Outcome = car.drive(Direction.NORTH)
}

class CarServiceTest {
    @Test
    fun \`start drives the car north\`() {
        val car = mockk<Car>()
        every { car.drive(Direction.NORTH) } returns Outcome.OK

        val result = CarService(car).start()

        assertEquals(Outcome.OK, result)
        verify { car.drive(Direction.NORTH) }
        confirmVerified(car)   // fail if any other call happened on \`car\`
    }
}
\`\`\`

\`confirmVerified(car)\` asserts that every call made on the mock was covered by a \`verify\` block — a cheap way to catch unexpected interactions. By default, calling a stubbed-but-unspecified method on a strict mock throws \`MockKException\`, which forces you to be explicit. The next section shows how to relax that.

### Argument matchers

Inside \`every\` and \`verify\`, raw values are matched by equality and matchers stand in for "any value of this shape". Mixing the two is not allowed — once you use one matcher in a call, all arguments must be matchers.

| Matcher | Matches |
|---|---|
| \`any()\` | any value, including null |
| \`eq(x)\` | a value equal to \`x\` (the default for literals) |
| \`range(0, 10)\` | a comparable value in a range |
| \`more(5)\` / \`less(5)\` | greater-than / less-than |
| \`match { it > 0 }\` | a custom predicate |
| \`capture(slot)\` | any value, also captured for inspection |

\`\`\`kotlin
every { repo.findById(any()) } returns user
every { repo.save(match { it.age >= 18 }) } returns Unit
verify(exactly = 2) { repo.findById(any()) }   // called exactly twice
verify(exactly = 0) { repo.delete(any()) }     // never called
\`\`\`

\`verify(exactly = 0)\` is the idiomatic way to assert something *did not* happen; \`atLeast\`, \`atMost\`, and \`timeout\` are also available on \`verify\`.

## Relaxed mocks: stop stubbing everything

A strict mock throws when you call a method you have not stubbed. That is safe but noisy when the class under test touches many collaborator methods you do not care about. A **relaxed mock** returns a sensible default for every un-stubbed call — \`0\` for numbers, \`""\` for strings, an empty collection, and a nested relaxed mock for object return types.

\`\`\`kotlin
import io.mockk.mockk

val car = mockk<Car>(relaxed = true)
car.accelerate()              // no stub needed, returns a default
val speed = car.currentSpeed() // returns 0, no exception
\`\`\`

If you only want \`Unit\`-returning functions auto-stubbed (and to keep value-returning calls strict so you are forced to define them), use \`relaxUnitFun = true\` instead of full relaxation:

\`\`\`kotlin
val car = mockk<Car>(relaxUnitFun = true)
car.honk()                    // Unit function — relaxed, OK
// car.currentSpeed()         // would still throw: not stubbed
\`\`\`

The trade-off: full \`relaxed = true\` writes less setup but can hide a missing stub behind a default value, so a buggy interaction silently passes. Prefer \`relaxUnitFun = true\` for value-returning collaborators, and reserve full relaxation for fire-and-forget dependencies like loggers and metrics clients.

## Mocking coroutines: \`coEvery\` and \`coVerify\`

Suspend functions cannot be stubbed with \`every\` because the lambda body is not a coroutine scope. MockK provides a parallel DSL whose verbs are prefixed \`co\`: \`coEvery\`, \`coVerify\`, \`coAnswers\`, and \`coJustAwait\`. They behave exactly like their non-suspend counterparts but run the call inside a coroutine.

\`\`\`kotlin
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Test

interface UserApi {
    suspend fun fetch(id: Long): User
}

class UserRepository(private val api: UserApi) {
    suspend fun load(id: Long): String = api.fetch(id).name
}

class UserRepositoryTest {
    @Test
    fun \`load returns the fetched user name\`() = runTest {
        val api = mockk<UserApi>()
        coEvery { api.fetch(1L) } returns User(1L, "Ada")

        val name = UserRepository(api).load(1L)

        assertEquals("Ada", name)
        coVerify(exactly = 1) { api.fetch(1L) }
    }
}
\`\`\`

Two things to get right. First, drive the test with \`runTest\` (from \`kotlinx-coroutines-test\`) so suspend code executes deterministically. Second, use \`coVerify\`, not \`verify\` — calling plain \`verify\` on a suspend function will not compile, because the lambda must be able to suspend. For a suspend function that should never return (to test cancellation or timeout paths), \`coJustAwait { api.fetch(any()) }\` suspends forever.

## Capturing arguments with slots

When you need to assert on the *exact value* passed to a collaborator — not just that it was called — capture it into a \`slot\`. \`capture(slot)\` matches any argument and stores it; read it back via \`slot.captured\`. Use \`mutableListOf\` with \`capture(list)\` to record every call across multiple invocations.

\`\`\`kotlin
import io.mockk.slot
import io.mockk.verify
import io.mockk.mockk
import io.mockk.every

val emailSlot = slot<Email>()
val mailer = mockk<Mailer>(relaxed = true)

NotificationService(mailer).welcome("ada@example.com")

verify { mailer.send(capture(emailSlot)) }
assertEquals("ada@example.com", emailSlot.captured.to)
assertTrue(emailSlot.captured.subject.contains("Welcome"))
\`\`\`

Slots also pair with \`answers\` to build dynamic return values that depend on the input — for example, echoing an id back or computing a value from the captured argument:

\`\`\`kotlin
val idSlot = slot<Long>()
every { repo.findById(capture(idSlot)) } answers {
    User(id = idSlot.captured, name = "user-\${idSlot.captured}")
}
\`\`\`

Inside an \`answers\` block you can also reach arguments positionally with \`firstArg<T>()\`, \`secondArg<T>()\`, or the whole list via \`args\`. Use \`captureNullable(slot)\` when the parameter type is nullable.

## Spies: real object, selective stubbing

A **spy** wraps a real instance and calls through to the actual implementation, except for the methods you override. Use \`spyk(RealObject())\` when you want most of a class's genuine behavior but need to stub one expensive or non-deterministic method.

\`\`\`kotlin
import io.mockk.spyk
import io.mockk.every
import io.mockk.verify

val calculator = spyk(Calculator())
every { calculator.expensiveOp() } returns 42   // override just this

val result = calculator.computeReport()          // real method runs,
                                                  // but uses the stubbed op
verify { calculator.expensiveOp() }
\`\`\`

Spies are powerful but a code smell if overused — needing to stub half a real object usually means the class has too many responsibilities. Reach for a plain \`mockk\` first.

## Static, object, and constructor mocks

Kotlin's \`object\` singletons, top-level functions, and constructors are normally hard to mock. MockK handles all three, but each must be *scoped* — you turn the mock on, run the test, then tear it down, otherwise the mock leaks into later tests in the same JVM.

\`\`\`kotlin
import io.mockk.mockkObject
import io.mockk.mockkStatic
import io.mockk.mockkConstructor
import io.mockk.anyConstructed
import io.mockk.every
import io.mockk.unmockkAll

// object singleton
mockkObject(PricingRules)
every { PricingRules.taxRate() } returns 0.0

// top-level / static function
mockkStatic(::buildClient)
every { buildClient() } returns fakeClient

// every instance created with \`new\`
mockkConstructor(HttpClient::class)
every { anyConstructed<HttpClient>().get(any()) } returns fakeResponse
\`\`\`

Always undo these in teardown. \`unmockkAll()\` reverts every static, object, and constructor mock; \`clearMocks(mock)\` resets recorded calls and stubs on a specific mock without un-mocking it; and \`clearAllMocks()\` clears state on all mocks. The cleanest pattern is to register MockK's JUnit 5 extension (next section), which auto-unmocks for you. For a broader look at mocking strategy and how spies, stubs, and fakes differ, see [stub vs mock vs spy vs fake test doubles explained](/blog/stub-mock-spy-fake-test-doubles-explained).

## Verifying call order

Beyond *whether* a call happened, MockK can assert the *order* of calls. There are three flavors with different strictness:

| Verb | Asserts |
|---|---|
| \`verifyOrder { }\` | the listed calls happened in this relative order (extra calls allowed) |
| \`verifySequence { }\` | exactly these calls, in this order, and no others |
| \`verifyAll { }\` | all listed calls happened, in any order, and no others |

\`\`\`kotlin
import io.mockk.verifyOrder
import io.mockk.verifySequence

verifyOrder {
    engine.start()
    engine.accelerate()
}

verifySequence {        // strictest: exactly these two, in this order
    engine.start()
    engine.accelerate()
}
\`\`\`

Use \`verifySequence\` sparingly — it couples your test to the precise call list, so any refactor that adds a logging call breaks it. \`verifyOrder\` is the pragmatic middle ground when ordering genuinely matters (for example, a transaction must \`begin\` before \`commit\`).

## Annotations and JUnit 5 wiring

Declaring mocks as fields with annotations keeps test classes tidy. \`@MockK\` makes a strict mock, \`@RelaxedMockK\` a relaxed one, \`@SpyK\` a spy, and \`@InjectMockKs\` builds the class under test and injects the mocks into it. Register \`MockKExtension\` so the annotations are processed and mocks are auto-cleared between tests.

\`\`\`kotlin
import io.mockk.impl.annotations.MockK
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.junit5.MockKExtension
import io.mockk.every
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class OrderServiceTest {

    @MockK
    lateinit var paymentGateway: PaymentGateway

    @RelaxedMockK
    lateinit var auditLog: AuditLog

    @InjectMockKs
    lateinit var service: OrderService   // gets the two mocks above

    @Test
    fun \`checkout charges the gateway\`() {
        every { paymentGateway.charge(any()) } returns ChargeResult.OK

        service.checkout(order)

        verify { paymentGateway.charge(order.total) }
    }
}
\`\`\`

\`MockKExtension\` calls \`MockKAnnotations.init(this)\` for you and runs \`unmockkAll()\` after each test, so static and object mocks do not leak. You can also inject a fresh mock straight into a single test method as a parameter — \`@Test fun test(@MockK car: Car) { ... }\` — when a mock is only needed in one place. If you prefer no extension, call \`MockKAnnotations.init(this, relaxUnitFun = true)\` manually in a \`@BeforeEach\`.

For more JVM testing patterns and how MockK fits alongside JUnit and Kotest, browse the [blog](/blog) and the framework [comparison hub](/compare).

## MockK vs Mockito for Kotlin

Both libraries mock collaborators, but they were designed for different languages. Mockito is Java-first; mocking Kotlin's \`final\`-by-default classes requires the \`mockito-inline\` (mock-maker-inline) configuration, and \`object\`/extension/\`suspend\` support is awkward or absent. MockK is built for Kotlin from the ground up.

| Concern | MockK | Mockito (Kotlin) |
|---|---|---|
| Final classes | Native | Needs \`mockito-inline\` |
| \`object\` singletons | \`mockkObject\` | Not supported |
| Suspend functions | \`coEvery\` / \`coVerify\` | Needs \`mockito-kotlin\` + workarounds |
| Extension functions | Supported | Not supported |
| DSL style | Kotlin lambda blocks | Java-style \`when().thenReturn()\` |
| Relaxed mocks | \`relaxed = true\` built in | \`RETURNS_SMART_NULLS\` (weaker) |

**When to pick MockK.** Choose MockK for any Kotlin-first codebase, especially one with coroutines, \`object\` singletons, sealed/\`final\` classes, or extension functions — all of which MockK mocks natively while Mockito needs configuration or cannot do at all. The lambda-block DSL also reads more naturally in Kotlin.

**When to pick Mockito.** Stay on Mockito when the codebase is predominantly Java, your team already knows the \`when().thenReturn()\` API, or you share test infrastructure with Java modules. With \`mockito-kotlin\` and \`mockito-inline\`, it can handle most Kotlin cases — just with more setup.

**Verdict.** For new Kotlin projects, MockK is the stronger default: native \`final\`/\`object\`/coroutine/extension support with zero extra mock-maker configuration. For mixed Java/Kotlin estates where Java tests dominate, Mockito plus \`mockito-kotlin\` keeps one mocking style across both languages. If you are weighing testing tools for an AI coding agent, see how the Java mocking landscape compares in [Mockito tutorial: Java mocking guide](/blog/mockito-tutorial-java-mocking-guide-2026).

## Frequently Asked Questions

### How do I mock a suspend function in MockK?

Use the coroutine DSL: stub with \`coEvery { mock.suspendFn() } returns value\` and assert with \`coVerify { mock.suspendFn() }\`. The plain \`every\`/\`verify\` will not compile for suspend functions because their lambda must be able to suspend. Run the test body inside \`runTest\` from \`kotlinx-coroutines-test\` so the coroutine executes deterministically.

### What is a relaxed mock in MockK?

A relaxed mock returns a sensible default value for every function you have not explicitly stubbed — \`0\` for numbers, \`""\` for strings, empty collections, and nested relaxed mocks for object types. Create one with \`mockk<T>(relaxed = true)\` or the \`@RelaxedMockK\` annotation. Use \`mockk<T>(relaxUnitFun = true)\` instead to relax only \`Unit\`-returning functions while keeping value-returning calls strict, so missing stubs still fail loudly.

### Can MockK mock final classes and Kotlin objects?

Yes — this is MockK's headline advantage. Kotlin classes are \`final\` by default, and MockK mocks them with no extra configuration, whereas Mockito needs the inline mock maker. For Kotlin \`object\` singletons use \`mockkObject(MyObject)\`, for top-level functions use \`mockkStatic(::myFunction)\`, and for constructors use \`mockkConstructor(MyClass::class)\`. Remember to revert these scoped mocks with \`unmockkAll()\` in teardown.

### How do I verify a method was never called in MockK?

Use \`verify(exactly = 0) { mock.method(any()) }\`, which asserts the call happened zero times. MockK also supports \`verify(atLeast = n)\`, \`verify(atMost = n)\`, and \`verify(exactly = n)\` for precise counts. To assert that *only* the calls you have verified occurred and nothing else, follow your verifications with \`confirmVerified(mock)\`.

### What is the difference between mockk and spyk?

\`mockk<T>()\` creates a full mock where every method must be stubbed (or returns a default if relaxed), and no real code runs. \`spyk(RealObject())\` wraps a real instance and calls through to the actual implementation, except for methods you override with \`every\`. Use a mock when you want full control over a collaborator, and a spy when you need most of an object's genuine behavior but must stub one expensive or non-deterministic method.

### Do I need MockKExtension with JUnit 5?

You do not strictly need it, but it removes boilerplate. \`@ExtendWith(MockKExtension::class)\` processes the \`@MockK\`, \`@RelaxedMockK\`, \`@SpyK\`, and \`@InjectMockKs\` annotations and automatically runs \`unmockkAll()\` after each test, preventing static/object mocks from leaking between tests. Without it, call \`MockKAnnotations.init(this)\` yourself in a \`@BeforeEach\` method and clean up mocks manually.
`,
};
