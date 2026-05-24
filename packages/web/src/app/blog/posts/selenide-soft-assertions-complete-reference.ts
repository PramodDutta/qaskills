import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide Soft Assertions — Complete Reference 2026',
  description:
    'Master Selenide soft assertions with SoftAsserts. Configuration.assertionMode, JUnit5 extension, multiple failures per test, and best practices.',
  date: '2026-05-10',
  category: 'Reference',
  content: `
# Selenide Soft Assertions Complete Reference

By default, Selenide stops a test on the first failed \`should\` assertion. This is correct behavior most of the time — a failure means the page state is wrong and continuing would produce misleading errors. But for certain test types — visual regression tests, end-to-end smoke checks, table validation across many columns — you want to collect all failures, report them at the end, and continue executing. Selenide supports this via soft assertions mode, configured globally or per test.

This reference is a complete guide to Selenide soft assertions in 2026. We cover the SoftAsserts mechanism, JUnit 5 extension, configuration via \`Configuration.assertionMode\`, per-test override patterns, integration with Allure reports, and the common pitfalls. Every code sample is working Java with Selenide 7+ and JUnit 5.

---

## Key Takeaways

- **Default mode is STRICT** — stops on first failure
- **SOFT mode** continues executing and collects all failures
- **JUnit 5 extension** (\`@ExtendWith(SoftAssertsExtension.class)\`) enables per-method soft assertions
- **Configuration.assertionMode** is the global toggle
- **All Selenide \`should\` calls** participate in soft mode automatically
- **Allure** reports collected failures clearly

---

## Strict vs Soft Mode

By default, Selenide uses \`AssertionMode.STRICT\`:

\`\`\`java
import com.codeborne.selenide.Configuration;
import com.codeborne.selenide.AssertionMode;

Configuration.assertionMode = AssertionMode.STRICT; // default
\`\`\`

In strict mode:

\`\`\`java
$("#a").shouldHave(text("Alpha")); // fails -> test stops here
$("#b").shouldHave(text("Beta"));  // never runs
$("#c").shouldHave(text("Gamma")); // never runs
\`\`\`

In soft mode:

\`\`\`java
Configuration.assertionMode = AssertionMode.SOFT;

$("#a").shouldHave(text("Alpha")); // fails, but continues
$("#b").shouldHave(text("Beta"));  // runs even if #a failed
$("#c").shouldHave(text("Gamma")); // runs
// At end of test: all collected failures reported
\`\`\`

---

## Enabling Soft Mode Globally

In a JUnit setup or static config:

\`\`\`java
import com.codeborne.selenide.AssertionMode;
import com.codeborne.selenide.Configuration;
import org.junit.jupiter.api.BeforeAll;

class BaseTest {
    @BeforeAll
    static void setup() {
        Configuration.assertionMode = AssertionMode.SOFT;
    }
}
\`\`\`

---

## JUnit 5 SoftAssertsExtension

The cleanest pattern uses the Selenide JUnit 5 extension. Add the dependency:

\`\`\`xml
<dependency>
  <groupId>com.codeborne</groupId>
  <artifactId>selenide-junit5</artifactId>
  <version>7.5.0</version>
  <scope>test</scope>
</dependency>
\`\`\`

Then annotate test classes:

\`\`\`java
import com.codeborne.selenide.junit5.SoftAssertsExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.Test;

@ExtendWith(SoftAssertsExtension.class)
class TableTest {

    @Test
    void rowsHaveExpectedData() {
        $$("table.users tr").get(0).$("td.name").shouldHave(text("Alice"));
        $$("table.users tr").get(0).$("td.email").shouldHave(text("alice@"));
        $$("table.users tr").get(1).$("td.name").shouldHave(text("Bob"));
        // All assertions run. If multiple fail, all failures reported.
    }
}
\`\`\`

The extension automatically enables soft mode for the test method and validates the collected results at the end.

---

## Configuration.assertionMode Options

| Mode | Behavior |
|---|---|
| \`STRICT\` (default) | Throws on first failure, stops test |
| \`SOFT\` | Collects failures, throws at end with all messages |

---

## Per-Test Override

You can override per test by setting the mode before \`should\` calls:

\`\`\`java
@Test
void testWithSoft() {
    Configuration.assertionMode = AssertionMode.SOFT;
    try {
        $("#a").shouldHave(text("Alpha"));
        $("#b").shouldHave(text("Beta"));
    } finally {
        Configuration.assertionMode = AssertionMode.STRICT;
    }
}
\`\`\`

But the JUnit extension is cleaner and avoids the try/finally.

---

## Mixed Strict and Soft in One Test

For tests that need a precondition check (strict) followed by multiple soft assertions:

\`\`\`java
@Test
@ExtendWith(SoftAssertsExtension.class)
void pageRendersWithAllSections() {
    // Strict precondition
    Configuration.assertionMode = AssertionMode.STRICT;
    $("#main").shouldBe(visible);

    // Soft from here on
    Configuration.assertionMode = AssertionMode.SOFT;
    $("#header").shouldBe(visible);
    $("#nav").shouldBe(visible);
    $("#content").shouldBe(visible);
    $("#footer").shouldBe(visible);
}
\`\`\`

---

## What Counts as a Selenide Assertion

All of these participate in soft mode:

| API | Counts as assertion |
|---|---|
| \`should\`, \`shouldBe\`, \`shouldHave\` | Yes |
| \`shouldNot\`, \`shouldNotBe\`, \`shouldNotHave\` | Yes |
| Collection \`shouldHave\`, \`shouldBe\` | Yes |
| \`exists\`, \`isDisplayed\` | No (these return immediately, don't assert) |
| Custom Selenide conditions | Yes |
| JUnit \`assertEquals\` etc. | No (uses JUnit's own mechanism) |

For non-Selenide assertions (e.g., JUnit \`assertEquals\`), use AssertJ's SoftAssertions or JUnit 5's \`assertAll\`:

\`\`\`java
assertAll(
    () -> assertEquals("Alice", user.getName()),
    () -> assertEquals(30, user.getAge()),
    () -> assertTrue(user.isActive())
);
\`\`\`

---

## When to Use Soft Assertions

Good fits:

| Test type | Why soft helps |
|---|---|
| Smoke tests across many pages | Report all broken pages |
| Visual regression checks | Show all visual diffs |
| Table data validation | All wrong cells in one report |
| Multi-field form validation | All field errors at once |
| Email/PDF content validation | All missing content shown |

Bad fits:

| Test type | Why strict is better |
|---|---|
| Multi-step workflows | Each step depends on previous |
| Action tests (click then verify) | Continuing after failed click is meaningless |
| Performance tests | Each step is sequential |

---

## Error Output

When soft assertions fail, you get aggregated output like:

\`\`\`
Multiple errors:
- Element should have text 'Alpha' {by id: a}
  Actual: 'Beta'
- Element should have text 'Gamma' {by id: c}
  Actual: 'Delta'
\`\`\`

This is much more useful than three separate test failures.

---

## Allure Integration

When using Allure with Selenide, soft assertion failures show up as individual steps with their own attachments (screenshots, page sources). Configure with:

\`\`\`java
import com.codeborne.selenide.logevents.SelenideLogger;
import io.qameta.allure.selenide.AllureSelenide;

@BeforeAll
static void setupAllure() {
    SelenideLogger.addListener("allure", new AllureSelenide()
        .screenshots(true)
        .savePageSource(true)
        .includeSelenideSteps(true)
    );
}
\`\`\`

See our [AllureSelenide includeSelenideSteps reference](/blog/selenide-allureselenide-includeselenidesteps-reference) for deep coverage.

---

## Pitfalls

**Pitfall 1: Soft mode masks workflow failures.** If a click action fails in soft mode, subsequent steps may operate on wrong page state. Use strict for workflows, soft for assertions.

**Pitfall 2: Forgotten extension.** Without \`@ExtendWith(SoftAssertsExtension.class)\`, soft mode collects errors but doesn't throw them at test end. You think tests pass but they didn't.

**Pitfall 3: Cross-test pollution.** Configuration.assertionMode is static. Setting it in one test affects subsequent tests unless reset.

**Pitfall 4: Mixing JUnit Assertions with Selenide soft.** JUnit's \`assertEquals\` doesn't go through Selenide's collector. Use \`assertAll\` for JUnit, soft for Selenide.

---

## Best Practices

| Practice | Why |
|---|---|
| Use the JUnit 5 extension | Cleanest setup, automatic reset |
| Combine strict precondition + soft body | Validate state before running soft block |
| Use soft for table/grid validation | Report all errors in one pass |
| Stay strict for workflows | Failures propagate sensibly |
| Document the choice | Future maintainers will thank you |

---

## Reference Card

\`\`\`java
// Global soft mode
Configuration.assertionMode = AssertionMode.SOFT;

// JUnit 5 extension (recommended)
@ExtendWith(SoftAssertsExtension.class)
class MyTest { }

// Mixed strict + soft
Configuration.assertionMode = AssertionMode.STRICT;
$("#main").shouldBe(visible);
Configuration.assertionMode = AssertionMode.SOFT;
$$(".row").shouldHave(size(3));
$$(".row").shouldHave(exactTexts("a", "b", "c"));
\`\`\`

---

## Conclusion

Soft assertions in Selenide let you collect all failures in a single test run, dramatically improving the signal-to-noise ratio for table validation, smoke checks, and visual regression. Use the JUnit 5 extension for the cleanest setup, mix strict and soft within a single test for precondition checks, and document the choice so the team understands. Pair with [AllureSelenide](/blog/selenide-allureselenide-includeselenidesteps-reference) for rich reporting.

Browse the [QA skills directory](/skills) for related browser testing patterns.
`,
};
