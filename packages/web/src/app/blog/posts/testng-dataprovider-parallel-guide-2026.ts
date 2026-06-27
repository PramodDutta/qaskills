import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "TestNG DataProvider & Parallel Execution Guide (2026)",
  description: "TestNG DataProvider and parallel execution guide: data-driven tests, parallel modes, thread-count, parallel data providers, thread safety, and Surefire config.",
  date: "2026-06-26",
  category: "Java",
  content: `TestNG drives data-driven testing with \`@DataProvider\` (a method returning \`Object[][]\` that feeds rows into a \`@Test\`) and scales it with parallel execution configured through the suite XML \`parallel\` and \`thread-count\` attributes. Set \`@DataProvider(parallel = true)\` plus \`data-provider-thread-count\` to fan out rows concurrently, and isolate shared state (WebDriver, counters) with \`ThreadLocal\` to stay thread-safe. This guide covers both features end-to-end, with real annotations, suite XML, and Maven Surefire settings.

## What a TestNG DataProvider Actually Is

A \`@DataProvider\` is a method that returns a two-dimensional array (or an \`Iterator\`) of test inputs. TestNG calls the associated \`@Test\` method once per row, mapping each inner array to the test method's parameters. This is how you run the same logic against many inputs without copy-pasting test methods.

\`\`\`java
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;
import static org.testng.Assert.assertEquals;

public class CalculatorTest {

    @DataProvider(name = "additionCases")
    public Object[][] additionCases() {
        return new Object[][] {
            { 2, 3, 5 },
            { -1, 1, 0 },
            { 0, 0, 0 },
            { 100, 250, 350 },
        };
    }

    @Test(dataProvider = "additionCases")
    public void addsCorrectly(int a, int b, int expected) {
        assertEquals(a + b, expected);
    }
}
\`\`\`

TestNG reports four separate test results here — one per row — so a single failing input does not hide the passing ones. The parameter types must match the columns of the array, and the order is positional.

### Returning an Iterator Instead of an Array

When your dataset is large or generated lazily (read from a CSV, a database cursor, or an API), return an \`Iterator<Object[]>\`. TestNG pulls rows on demand rather than materializing the whole array in memory.

\`\`\`java
@DataProvider(name = "usersLazy")
public Iterator<Object[]> usersLazy() {
    return Stream.of("alice", "bob", "carol")
        .map(name -> new Object[] { name })
        .iterator();
}
\`\`\`

### Injecting Method and Context

A data provider can declare a \`Method\` parameter (and/or an \`ITestContext\`) as its first argument. TestNG injects the test method that is about to be fed, letting one provider behave differently per consumer.

\`\`\`java
@DataProvider(name = "perMethod")
public Object[][] perMethod(Method m) {
    if (m.getName().equals("loginTest")) {
        return new Object[][] { { "admin", "secret" } };
    }
    return new Object[][] { { "guest", "guest" } };
}
\`\`\`

## Sharing Data Providers Across Classes

By default a \`@DataProvider\` is visible only to \`@Test\` methods in the same class (or subclass). To reuse one across unrelated classes, declare it \`static\` in a holder class and reference it with \`dataProviderClass\`.

\`\`\`java
public class DataProviders {
    @DataProvider(name = "credentials")
    public static Object[][] credentials() {
        return new Object[][] {
            { "valid@example.com", "Pass123!", true },
            { "bad@example.com", "wrong", false },
        };
    }
}

public class LoginTest {
    @Test(dataProvider = "credentials", dataProviderClass = DataProviders.class)
    public void login(String email, String password, boolean expectSuccess) {
        // ...
    }
}
\`\`\`

This keeps test data in one place and avoids duplicating providers across a large suite. If you generate Selenium or API tests with an AI coding agent, point it at a shared \`DataProviders\` holder so every generated test reuses the same rows. Browse the [skills directory](/skills) for agent skills that scaffold this layout.

## TestNG Parallel Execution: The Four Modes

Parallelism in TestNG is controlled by the \`parallel\` attribute on \`<suite>\` (or \`<test>\`) in the suite XML, paired with \`thread-count\`. The \`parallel\` value decides the unit of work that each thread owns.

| \`parallel\` value | Unit run per thread | Typical use |
|---|---|---|
| \`methods\` | Each \`@Test\` method | Maximum parallelism; methods must be independent |
| \`classes\` | All methods of one class | Class-level state stays on one thread |
| \`tests\` | Each \`<test>\` tag in the XML | Group suites by browser/environment |
| \`instances\` | Each test-class instance (factory) | Parallelize \`@Factory\`-produced instances |

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd">
<suite name="RegressionSuite" parallel="methods" thread-count="4">
  <test name="CheckoutTests">
    <classes>
      <class name="com.shop.CartTest"/>
      <class name="com.shop.CheckoutTest"/>
    </classes>
  </test>
</suite>
\`\`\`

With \`parallel="methods" thread-count="4"\`, TestNG maintains a pool of four threads and dispatches individual \`@Test\` methods to whichever thread is free. \`parallel="tests"\` is the safest starting point because everything inside a single \`<test>\` block stays on one thread, so shared fixtures in a \`@BeforeTest\` are not racing.

### Choosing a Mode and a Thread Count

A practical default for browser tests is \`parallel="tests"\` or \`parallel="classes"\`, sized to your Grid/CI capacity. \`parallel="methods"\` is the fastest but the most demanding: every method must own its own state. For CPU-bound unit tests, a thread count near the number of available cores is a sensible ceiling; for I/O-bound browser or API tests you can go higher because threads spend most of their time waiting.

For Selenium specifics — driver lifecycle, listeners, and Grid wiring — see the [Selenium with Java and TestNG Page Object guide](/blog/selenium-java-testng-page-object-guide).

## Parallel Data Providers

The suite-level \`parallel\` attribute controls how *test methods* run. It does **not** parallelize the rows of a single data provider. To run a data provider's rows concurrently, set \`parallel = true\` on the annotation itself.

\`\`\`java
@DataProvider(name = "urls", parallel = true)
public Object[][] urls() {
    return new Object[][] {
        { "https://example.com/a" },
        { "https://example.com/b" },
        { "https://example.com/c" },
    };
}

@Test(dataProvider = "urls")
public void fetch(String url) {
    // each row may run on a different thread
}
\`\`\`

The number of threads used for parallel data providers is governed separately by \`data-provider-thread-count\`, which defaults to **10**. Set it on the suite:

\`\`\`xml
<suite name="DataDrivenSuite" data-provider-thread-count="5">
  <test name="UrlChecks">
    <classes>
      <class name="com.shop.UrlTest"/>
    </classes>
  </test>
</suite>
\`\`\`

You can combine both layers — methods running in parallel *and* each method's data provider running its rows in parallel — but only do that once your fixtures are genuinely isolated, because the concurrency multiplies.

## Method-Level Parallelism Without a Suite File

For invocation-style concurrency you do not need an XML suite at all. The \`@Test\` annotation exposes \`invocationCount\` and \`threadPoolSize\`: the method is invoked \`invocationCount\` times across a pool of \`threadPoolSize\` threads. This is handy for quick load or race-condition checks.

\`\`\`java
@Test(invocationCount = 10, threadPoolSize = 3)
public void hammersEndpoint() {
    // invoked 10 times across 3 threads
}
\`\`\`

\`timeOut\` (milliseconds) can be added to fail a method that hangs, which matters under concurrency where a deadlock would otherwise stall the run: \`@Test(timeOut = 5000)\`.

## Thread Safety: The Part That Breaks Suites

The most common parallel-execution bug is shared mutable state on instance fields. When \`parallel="methods"\` puts two methods of the same class on two threads, they share the *same instance*, so a \`private WebDriver driver\` field is a race. The fix is \`ThreadLocal\`, which gives each thread its own copy.

\`\`\`java
public class BaseTest {
    private static final ThreadLocal<WebDriver> DRIVER = new ThreadLocal<>();

    @BeforeMethod
    public void setUp() {
        DRIVER.set(new ChromeDriver());   // one driver per thread
    }

    protected WebDriver driver() {
        return DRIVER.get();
    }

    @AfterMethod(alwaysRun = true)
    public void tearDown() {
        WebDriver d = DRIVER.get();
        if (d != null) {
            d.quit();
            DRIVER.remove();              // prevent leaks across the pool
        }
    }
}
\`\`\`

Always call \`DRIVER.remove()\` in teardown. Threads in TestNG's pool are reused, so a stale \`ThreadLocal\` value can leak into the next test that lands on that thread. The same pattern applies to any per-test resource: API clients, temp directories, faker seeds. Static counters and shared collections should be replaced with thread-safe equivalents (\`AtomicInteger\`, \`ConcurrentHashMap\`) or, better, eliminated.

### Quick Thread-Safety Checklist

- One WebDriver / client per thread via \`ThreadLocal\`, removed in \`@AfterMethod\`.
- No mutable instance fields written by \`@Test\` methods under \`parallel="methods"\`.
- Use \`@AfterMethod(alwaysRun = true)\` so cleanup runs even after assertion failures.
- Replace shared counters with \`AtomicInteger\`; avoid \`HashMap\` for shared state.
- Keep \`@BeforeMethod\` setup self-contained — don't rely on ordering between methods.

## Wiring Parallelism Through Maven Surefire

When you run via Maven, the \`maven-surefire-plugin\` can either point at a suite XML (\`suiteXmlFiles\`) or set parallelism through its own parameters. The exact parameter names differ from the XML attributes, which trips people up.

\`\`\`xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-surefire-plugin</artifactId>
  <version>3.5.4</version>
  <configuration>
    <parallel>methods</parallel>
    <threadCount>4</threadCount>
    <properties>
      <property>
        <name>dataproviderthreadcount</name>
        <value>5</value>
      </property>
    </properties>
  </configuration>
</plugin>
\`\`\`

| Setting | Suite XML attribute | Surefire parameter | Default |
|---|---|---|---|
| Parallel mode | \`parallel\` | \`<parallel>\` | none (sequential) |
| Worker threads | \`thread-count\` | \`<threadCount>\` | 5 (Surefire) |
| Data-provider threads | \`data-provider-thread-count\` | \`dataproviderthreadcount\` property | 10 (TestNG) / 1 if unset in some paths |

The critical gotcha: **if you configure Surefire with \`<suiteXmlFiles>\`, the plugin's own \`<parallel>\` and \`<threadCount>\` are ignored** — TestNG reads parallelism from the suite XML instead. Pick one source of truth. If you rely on \`suiteXmlFiles\`, set \`data-provider-thread-count\` inside the suite XML, because the Surefire \`dataproviderthreadcount\` property is not honored in that path. You can override from the command line with \`-Ddataproviderthreadcount=5\` when not using a suite file.

## Putting It Together: A Parallel Data-Driven Selenium Test

\`\`\`xml
<suite name="WebSuite" parallel="methods" thread-count="3"
       data-provider-thread-count="3">
  <test name="LoginMatrix">
    <classes>
      <class name="com.shop.LoginTest"/>
    </classes>
  </test>
</suite>
\`\`\`

\`\`\`java
public class LoginTest extends BaseTest {

    @DataProvider(name = "logins", parallel = true)
    public Object[][] logins() {
        return new Object[][] {
            { "admin", "secret", true },
            { "guest", "guest", true },
            { "bad", "x", false },
        };
    }

    @Test(dataProvider = "logins")
    public void login(String user, String pass, boolean expectOk) {
        driver().get("https://example.com/login");   // ThreadLocal driver
        // fill + submit + assert against expectOk
    }
}
\`\`\`

Each row gets its own thread, each thread gets its own browser, and teardown quits and removes the driver. That is the full pattern most enterprise Selenium suites converge on.

## Common Pitfalls

- **Parameter count mismatch** — the \`@Test\` method's parameters must equal the data provider's column count, in order, or TestNG throws at runtime.
- **Provider not found** — a non-static provider in another class won't resolve without \`dataProviderClass\`; the error names the missing provider.
- **Order assumptions** — under any \`parallel\` mode, method execution order is not guaranteed. Use \`dependsOnMethods\` or \`priority\` only where ordering is truly required, and prefer independence.
- **Leaking ThreadLocals** — forgetting \`DRIVER.remove()\` leaks browsers and can cross-contaminate reused pool threads.
- **Double-counting threads** — combining \`parallel="methods"\` with \`data-provider-thread-count\` can spawn \`thread-count × data-provider-thread-count\` concurrent units; size your Grid accordingly.

For a feature-by-feature look at how this compares to JUnit 5's \`@ParameterizedTest\` model, read [TestNG vs JUnit 5](/blog/testng-vs-junit5-comparison).

## Frequently Asked Questions

### What is the difference between @DataProvider parallel=true and the suite parallel attribute?

The suite-level \`parallel\` attribute (\`methods\`, \`classes\`, \`tests\`, \`instances\`) controls how separate \`@Test\` methods are distributed across threads. \`@DataProvider(parallel = true)\` controls whether the *rows* of one data provider run concurrently within a single test method. They are independent layers — you can enable either, both, or neither. The data-provider concurrency is sized by \`data-provider-thread-count\`, not by \`thread-count\`.

### What is the default data-provider-thread-count in TestNG?

TestNG's \`data-provider-thread-count\` defaults to 10 when parallel data providers are enabled. You override it on the \`<suite>\` element in the suite XML, or on the command line with \`-Ddataproviderthreadcount\`. Note that when you run through Maven Surefire using \`suiteXmlFiles\`, the plugin's \`dataproviderthreadcount\` property is ignored and only the suite XML attribute takes effect.

### How do I make TestNG WebDriver tests thread-safe for parallel runs?

Store the WebDriver in a \`static ThreadLocal<WebDriver>\` so each thread gets its own browser instance. Initialize it in \`@BeforeMethod\` with \`DRIVER.set(...)\`, read it through a \`driver()\` accessor, and in \`@AfterMethod(alwaysRun = true)\` call both \`driver.quit()\` and \`DRIVER.remove()\`. Removing the value is essential because TestNG reuses pool threads, so a leftover instance would leak into the next test.

### Why is my Surefire parallel config being ignored?

If you configure \`<suiteXmlFiles>\` in the Surefire plugin, TestNG reads parallelism from the suite XML, and the plugin's own \`<parallel>\` and \`<threadCount>\` parameters are ignored. Use one source of truth: either drive everything from the suite XML (\`parallel\`, \`thread-count\`, \`data-provider-thread-count\`) or remove \`suiteXmlFiles\` and let Surefire's parameters apply. Mixing the two silently drops the plugin-level settings.

### Can a TestNG DataProvider return something other than Object[][]?

Yes. Besides \`Object[][]\`, a data provider may return an \`Iterator<Object[]>\`, which is preferred for large or lazily generated datasets because TestNG consumes rows on demand instead of building the entire array up front. The data provider method can also accept a \`java.lang.reflect.Method\` and/or \`ITestContext\` as parameters so one provider can return different rows depending on which test consumes it.

### How many threads should I use for parallel TestNG execution?

For CPU-bound unit tests, keep \`thread-count\` near the number of available CPU cores, since more threads than cores mostly adds context-switching overhead. For I/O-bound work like Selenium or API tests, threads spend most of their time waiting, so you can run more — but the real ceiling is your Selenium Grid or CI runner capacity. Start with \`parallel="tests"\` or \`parallel="classes"\` for safety, measure, then move to \`parallel="methods"\` only after confirming your fixtures are isolated.
`,
};
