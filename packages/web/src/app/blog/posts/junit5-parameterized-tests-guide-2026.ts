import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "JUnit 5 Parameterized Tests: ValueSource, CsvSource & MethodSource (2026)",
  description: "JUnit 5 parameterized tests guide: @ParameterizedTest with @ValueSource, @CsvSource, @CsvFileSource, @MethodSource, @EnumSource, and argument conversion.",
  date: "2026-06-26",
  category: "Java",
  content: `JUnit 5 parameterized tests let you run a single \`@ParameterizedTest\` method many times, once per set of inputs, instead of copy-pasting near-identical \`@Test\` methods. You feed arguments with source annotations: \`@ValueSource\` for one literal column, \`@CsvSource\` / \`@CsvFileSource\` for multiple columns inline or from a file, \`@MethodSource\` for arbitrary objects from a factory method, and \`@EnumSource\` for enum constants. They live in the \`junit-jupiter-params\` artifact, and each invocation is reported as a separate test, so one failing row never hides the passing ones. This guide covers every source with real annotations, plus argument conversion and aggregation.

## The Dependency You Must Add

\`@ParameterizedTest\` is **not** in \`junit-jupiter-api\`. It ships in a separate module, \`org.junit.jupiter:junit-jupiter-params\`. If you import the \`junit-jupiter\` aggregator you get it transitively; otherwise add it explicitly or the annotation won't resolve.

**Maven:**

\`\`\`xml
<dependency>
  <groupId>org.junit.jupiter</groupId>
  <artifactId>junit-jupiter</artifactId>
  <version>5.11.4</version>
  <scope>test</scope>
</dependency>
\`\`\`

**Gradle (Kotlin DSL):**

\`\`\`kotlin
dependencies {
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
}

tasks.test {
    useJUnitPlatform()
}
\`\`\`

The \`junit-jupiter\` aggregator pulls in \`junit-jupiter-api\`, \`junit-jupiter-params\`, and \`junit-jupiter-engine\` together, which is the simplest setup. If you depend on the modules individually, you need \`junit-jupiter-params\` for the annotations and \`junit-jupiter-engine\` (plus \`junit-platform-launcher\`) on the runtime/test classpath to actually execute them.

## Your First Parameterized Test with @ValueSource

\`@ValueSource\` is the simplest source. It supplies a single argument per invocation from a literal array of one type: \`ints\`, \`longs\`, \`doubles\`, \`strings\`, \`booleans\`, \`chars\`, \`shorts\`, \`bytes\`, \`floats\`, or \`classes\`. You pick exactly one of those attributes.

\`\`\`java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StringTest {

    @ParameterizedTest
    @ValueSource(strings = { "racecar", "level", "noon", "civic" })
    void palindromes(String candidate) {
        assertTrue(isPalindrome(candidate));
    }
}
\`\`\`

Note the two-annotation requirement: replace \`@Test\` with \`@ParameterizedTest\`, then add a source. A \`@ParameterizedTest\` with no source annotation is a configuration error and fails at runtime. The method runs four times here, each invocation receiving one string, and the IDE/report shows four distinct results like \`palindromes(String)[1]\` through \`[4]\`.

Because \`@ValueSource\` carries one column, it maps to exactly one method parameter. For anything with two or more inputs (an input plus an expected result, for example) you move to \`@CsvSource\` or \`@MethodSource\`.

## Handling null and empty with @NullSource and @EmptySource

A classic edge-case trio — \`null\`, \`""\`, and \`" "\` — has dedicated annotations because \`@ValueSource\` cannot express \`null\` (annotation values can't be null in Java). Stack them on top of a value source:

\`\`\`java
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.EmptySource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

@ParameterizedTest
@NullAndEmptySource
@ValueSource(strings = { " ", "   ", "\\t", "\\n" })
void blankStringsAreRejected(String input) {
    assertTrue(isBlank(input));
}
\`\`\`

\`@NullSource\` provides a single \`null\`. \`@EmptySource\` provides an empty \`String\`, \`List\`, \`Map\`, or array depending on the parameter type. \`@NullAndEmptySource\` is shorthand for both. Combining them with \`@ValueSource\` whitespace variants is the idiomatic way to cover every "blank" case in one method. Multiple source annotations on the same \`@ParameterizedTest\` are additive — JUnit runs the union of all their arguments.

## Multiple Columns Inline with @CsvSource

\`@CsvSource\` is where parameterized testing earns its keep. Each string is one comma-separated row, and the columns map positionally to the method parameters. JUnit converts each token to the declared parameter type.

\`\`\`java
import org.junit.jupiter.params.provider.CsvSource;
import static org.junit.jupiter.api.Assertions.assertEquals;

@ParameterizedTest
@CsvSource({
    "2, 3, 5",
    "0, 0, 0",
    "-1, 1, 0",
    "100, 250, 350"
})
void adds(int a, int b, int expected) {
    assertEquals(expected, a + b);
}
\`\`\`

### CSV quoting, delimiters, and empty vs null

By default the delimiter is a comma; switch it with \`delimiter\` (a char) or \`delimiterString\`. Quote values that contain the delimiter using single quotes via the \`quoteCharacter\` (default \`'\`). Two subtle but important defaults:

- An **empty, unquoted** value becomes \`null\` for reference-type parameters.
- An **empty, quoted** value (\`''\`) becomes an empty \`String\`.

\`\`\`java
@ParameterizedTest
@CsvSource(value = {
    "apple,    1",
    "'',       0",     // empty string, not null
    "NULL,     0"      // becomes null via nullValues
}, nullValues = "NULL")
void parsesFruit(String name, int count) {
    // 'apple'->"apple", ''->"", NULL->null
}
\`\`\`

Use \`nullValues\` to map sentinel tokens (like \`NULL\` or \`N/A\`) to actual \`null\`. The \`'apple, pie', 2\` form lets a single column contain commas. This precision around null/empty is the part people most often get wrong when migrating data-driven tests.

## Reading Rows from a File with @CsvFileSource

When the dataset is large or owned by non-developers, externalize it. \`@CsvFileSource\` reads rows from a classpath resource (\`resources\`) or an absolute/relative file (\`files\`).

\`\`\`java
import org.junit.jupiter.params.provider.CsvFileSource;

@ParameterizedTest
@CsvFileSource(resources = "/test-data/shipping.csv", numLinesToSkip = 1)
void shippingCost(String country, double weightKg, double expected) {
    assertEquals(expected, calculateShipping(country, weightKg), 0.001);
}
\`\`\`

Place \`shipping.csv\` under \`src/test/resources/test-data/\`. \`numLinesToSkip = 1\` skips a header row. \`@CsvFileSource\` also accepts \`delimiter\`, \`nullValues\`, \`encoding\` (default UTF-8), \`lineSeparator\`, and \`maxCharsPerColumn\`. Externalizing test data this way is how many teams let QA or product own the matrix while engineers own the assertions. If you scaffold these tables with an AI coding agent, browse the [skills directory](/skills) for agent skills that generate JUnit fixtures and CSV datasets.

## Arbitrary Objects with @MethodSource

\`@ValueSource\` and \`@CsvSource\` only carry primitives and strings. When you need real objects — a \`BigDecimal\`, a domain entity, a \`LocalDate\`, or a mix of types that don't survive CSV parsing — use \`@MethodSource\`. It names a **static** factory method that returns a \`Stream\`, \`Collection\`, \`Iterator\`, or array of arguments.

\`\`\`java
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.Arguments;
import java.util.stream.Stream;
import java.math.BigDecimal;
import static org.junit.jupiter.params.provider.Arguments.arguments;

@ParameterizedTest
@MethodSource("orderCases")
void taxIsApplied(BigDecimal subtotal, String region, BigDecimal expected) {
    assertEquals(expected, applyTax(subtotal, region));
}

static Stream<Arguments> orderCases() {
    return Stream.of(
        arguments(new BigDecimal("100.00"), "CA", new BigDecimal("107.25")),
        arguments(new BigDecimal("50.00"),  "OR", new BigDecimal("50.00")),
        arguments(new BigDecimal("200.00"), "NY", new BigDecimal("217.75"))
    );
}
\`\`\`

Each \`Arguments\` object holds one row; \`Arguments.arguments(...)\` (statically imported) is the concise factory. Several rules make \`@MethodSource\` flexible:

- The factory **must be \`static\`** unless the test class is annotated \`@TestInstance(Lifecycle.PER_CLASS)\`, which allows non-static factories.
- If you omit the method name (\`@MethodSource\` with no argument), JUnit looks for a static method with the **same name** as the test method.
- A factory can live in another class: reference it fully-qualified, e.g. \`@MethodSource("com.example.TestData#orderCases")\`.
- For a **single-parameter** test, the factory can return a \`Stream<String>\` (or \`IntStream\`, \`Stream<Integer>\`, etc.) directly — you don't have to wrap single values in \`Arguments\`.

\`\`\`java
@ParameterizedTest
@MethodSource          // defaults to a static "digits()" factory
void isDigit(int value) { /* ... */ }

static IntStream digits() {
    return IntStream.rangeClosed(0, 9);
}
\`\`\`

\`@MethodSource\` is the most powerful source and the one to reach for whenever CSV's string-only model becomes a straitjacket — it is the closest JUnit equivalent to TestNG's \`@DataProvider\` returning \`Object[][]\`.

## Enum Constants with @EnumSource

To run a test across every value of an enum — or a filtered subset — use \`@EnumSource\`. With no attributes it supplies all constants of the parameter's enum type.

\`\`\`java
import org.junit.jupiter.params.provider.EnumSource;
import java.time.Month;

@ParameterizedTest
@EnumSource(Month.class)
void everyMonthHasBetween28And31Days(Month month) {
    int days = month.length(false);
    assertTrue(days >= 28 && days <= 31);
}
\`\`\`

Filter with \`names\` plus \`mode\`. \`INCLUDE\` (default) keeps the listed names, \`EXCLUDE\` drops them, and \`MATCH_ALL\` / \`MATCH_ANY\` treat \`names\` as regular expressions.

\`\`\`java
@ParameterizedTest
@EnumSource(value = Month.class,
            names = { "APRIL", "JUNE", "SEPTEMBER", "NOVEMBER" })
void thirtyDayMonths(Month month) {
    assertEquals(30, month.length(false));
}

@ParameterizedTest
@EnumSource(value = Month.class, mode = EnumSource.Mode.MATCH_ALL,
            names = "^.*BER$")     // regex: months ending in BER
void berMonths(Month month) { /* ... */ }
\`\`\`

## Choosing the Right Source

| Source | Columns | Best for | Limitation |
|---|---|---|---|
| \`@ValueSource\` | 1 | Single-input checks (strings, ints) | One column, no \`null\` |
| \`@NullSource\` / \`@EmptySource\` | 1 | null / empty edge cases | Value is fixed |
| \`@CsvSource\` | many | Inline input→expected tables | Strings/primitives only |
| \`@CsvFileSource\` | many | Large/external datasets | File parsing, strings only |
| \`@MethodSource\` | many | Real objects, computed data | Factory must be static (or PER_CLASS) |
| \`@EnumSource\` | 1 | Exhaustive enum coverage | Enum types only |
| \`@ArgumentsSource\` | many | Reusable custom providers | Most boilerplate |

A practical rule: start with \`@ValueSource\` or \`@CsvSource\` for plain data, jump to \`@MethodSource\` the moment you need objects or computed values, and reserve \`@ArgumentsSource\` for a provider you want to share across many test classes.

## Argument Conversion and Aggregation

JUnit performs **implicit conversion** from the source's \`String\` tokens to your parameter types: to primitives and wrappers, to enums (by name), and to many JDK types like \`LocalDate\`, \`UUID\`, \`BigDecimal\`, \`File\`, \`Path\`, and \`URI\`. So \`@CsvSource("2026-06-26, …")\` binds straight to a \`LocalDate\` parameter with no extra code.

For custom formats, use **explicit conversion** with \`@ConvertWith\` and an \`ArgumentConverter\` (or the \`TypedArgumentConverter<S, T>\` helper):

\`\`\`java
import org.junit.jupiter.params.converter.ConvertWith;
import org.junit.jupiter.params.converter.TypedArgumentConverter;

static class SlugConverter extends TypedArgumentConverter<String, Slug> {
    SlugConverter() { super(String.class, Slug.class); }
    @Override protected Slug convert(String source) {
        return Slug.parse(source);
    }
}

@ParameterizedTest
@ValueSource(strings = { "hello-world", "junit-5" })
void parsesSlug(@ConvertWith(SlugConverter.class) Slug slug) {
    assertNotNull(slug);
}
\`\`\`

To collapse several CSV columns into one object, use \`@AggregateWith\` with an \`ArgumentsAccessor\`-based \`ArgumentsAggregator\`. This is handy when a row really represents a value object (e.g. three columns forming an \`Address\`) rather than independent parameters. Built-in \`@CsvToObject\`-style aggregation is not automatic — you write the aggregator once and reuse it.

## Readable Reports with Custom Display Names

By default each invocation is labeled \`[1]\`, \`[2]\`, etc. Set the \`name\` attribute on \`@ParameterizedTest\` to produce meaningful report lines using placeholders.

\`\`\`java
@ParameterizedTest(name = "[{index}] {0} + {1} = {2}")
@CsvSource({ "2, 3, 5", "10, 20, 30" })
void adds(int a, int b, int expected) {
    assertEquals(expected, a + b);
}
\`\`\`

| Placeholder | Expands to |
|---|---|
| \`{index}\` | 1-based invocation number |
| \`{arguments}\` | All arguments, comma-separated |
| \`{argumentsWithNames}\` | Arguments with parameter names |
| \`{0}\`, \`{1}\`, … | The argument at that position |

The example above reports \`[1] 2 + 3 = 5\` and \`[2] 10 + 20 = 30\`, which makes a CI failure instantly legible. Good display names are the cheapest way to make a 40-row data-driven test debuggable months later. For assertion ergonomics inside these tests, compare [AssertJ vs Hamcrest for JUnit assertions](/blog/assertj-vs-hamcrest-junit-assertions-2026).

## Reusable Providers with @ArgumentsSource

When the same dataset feeds tests across multiple classes, encapsulate it in an \`ArgumentsProvider\` and reference it with \`@ArgumentsSource\`. This is the most reusable mechanism and the foundation for custom annotations.

\`\`\`java
import org.junit.jupiter.params.provider.ArgumentsProvider;
import org.junit.jupiter.params.provider.ArgumentsSource;
import org.junit.jupiter.params.support.ParameterDeclarations;
import org.junit.jupiter.api.extension.ExtensionContext;
import java.util.stream.Stream;
import org.junit.jupiter.params.provider.Arguments;

class CredentialProvider implements ArgumentsProvider {
    @Override
    public Stream<? extends Arguments> provideArguments(
            ParameterDeclarations params, ExtensionContext context) {
        return Stream.of(
            Arguments.of("admin", "secret", true),
            Arguments.of("guest", "wrong",  false)
        );
    }
}

@ParameterizedTest
@ArgumentsSource(CredentialProvider.class)
void login(String user, String pass, boolean expectOk) { /* ... */ }
\`\`\`

You can then wrap \`@ArgumentsSource\` in your own meta-annotation (e.g. \`@CredentialCases\`) so every login test reuses one provider. Note that the \`provideArguments\` signature gained a \`ParameterDeclarations\` parameter in JUnit 5.13+; on earlier 5.x versions it took only the \`ExtensionContext\`. Check your Jupiter version when copying examples from older tutorials.

For a broader walkthrough of the framework beyond parameterization — lifecycle, assertions, and extensions — see the [JUnit 5 testing guide for Java](/blog/junit5-testing-java-guide).

## Common Pitfalls

- **Forgetting \`junit-jupiter-params\`** — the annotations won't compile or resolve; the aggregator \`junit-jupiter\` artifact includes them.
- **Using \`@Test\` with a source** — source annotations require \`@ParameterizedTest\`; on a plain \`@Test\` they're silently ignored, so the method runs once with no arguments and usually fails.
- **Non-static \`@MethodSource\` factory** — fails unless the class is \`@TestInstance(Lifecycle.PER_CLASS)\`.
- **Column/parameter mismatch** — a \`@CsvSource\` row's token count must match the method's parameter count (after accounting for converters/aggregators), or you get an \`ArgumentCountMismatchException\`.
- **Expecting empty to mean null** — an unquoted empty CSV value is \`null\`; an empty *quoted* value (\`''\`) is an empty string. Use \`nullValues\`/\`emptyValue\` to control this explicitly.

## Frequently Asked Questions

### What is the difference between @ParameterizedTest and @Test in JUnit 5?

\`@Test\` runs a method exactly once. \`@ParameterizedTest\` runs the method once per set of arguments supplied by a source annotation such as \`@ValueSource\`, \`@CsvSource\`, or \`@MethodSource\`, and reports each invocation as a separate test result. A \`@ParameterizedTest\` is invalid without at least one source annotation, whereas \`@Test\` takes no arguments at all.

### Why does my @ParameterizedTest fail to compile or resolve?

Almost always because the \`org.junit.jupiter:junit-jupiter-params\` module is missing from the test classpath. The \`@ParameterizedTest\`, \`@ValueSource\`, and related annotations are not in \`junit-jupiter-api\`. Add the \`junit-jupiter\` aggregator artifact (which includes params, api, and engine) or add \`junit-jupiter-params\` explicitly alongside the engine and platform launcher.

### When should I use @MethodSource instead of @CsvSource?

Use \`@CsvSource\` for tables of primitives and strings that read cleanly inline. Switch to \`@MethodSource\` when you need real objects (\`BigDecimal\`, \`LocalDate\`, domain entities), computed or randomized data, or values that don't survive string parsing. \`@MethodSource\` names a static factory returning a \`Stream\`/\`Collection\` of \`Arguments\`, giving you full Java to build each row.

### How do I pass null to a JUnit 5 parameterized test?

You cannot put \`null\` in \`@ValueSource\` because Java annotation values can't be null. Use \`@NullSource\` (or \`@NullAndEmptySource\`) stacked on the test, which contributes a single \`null\` invocation. In \`@CsvSource\`, an unquoted empty value becomes \`null\` for reference types, or you can map a sentinel token to null with the \`nullValues\` attribute.

### Can a @MethodSource factory method be non-static?

By default it must be static. JUnit creates a fresh test instance per method (\`Lifecycle.PER_METHOD\`), so there's no instance available when arguments are resolved. If you annotate the class with \`@TestInstance(TestInstance.Lifecycle.PER_CLASS)\`, one instance is reused for all methods and non-static factory methods become legal. Factories in a different class are referenced with the fully-qualified \`Class#method\` syntax.

### How do I get readable names instead of [1], [2] in the test report?

Set the \`name\` attribute on the annotation, e.g. \`@ParameterizedTest(name = "{index}: {0} -> {1}")\`. Placeholders include \`{index}\` for the invocation number, \`{arguments}\` for all arguments, \`{argumentsWithNames}\`, and positional \`{0}\`, \`{1}\`, etc. for individual arguments. This turns opaque \`[3]\` labels into descriptive lines that pinpoint exactly which row failed in CI. By default the tests run sequentially, so each named invocation appears in order.
`,
};
