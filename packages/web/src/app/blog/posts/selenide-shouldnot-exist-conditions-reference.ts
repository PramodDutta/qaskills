import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide shouldNot, shouldNotBe Conditions: Complete Reference',
  description:
    'Complete reference for Selenide negative assertions: shouldNot, shouldNotBe, shouldNotHave with visible, exist, enabled, text, value, matchText, and timing configuration. Java examples included.',
  date: '2026-05-21',
  category: 'Reference',
  content: `
## Introduction

Selenide ships with a small but powerful assertion vocabulary built around two verbs: \`should\` and \`shouldNot\`. The positive form is well-known, but the negative form is where flakiness usually hides. Negative assertions involve waiting for something to stop being true, which is a fundamentally different timing problem from positive assertions.

This reference covers every negative variant you'll use in real tests: \`shouldNot\`, \`shouldNotBe\`, \`shouldNotHave\`, the conditions they pair with, the timing rules behind them, and the patterns that keep them stable across thousands of CI runs.

We'll work through Java code only, with Maven and Gradle setup at the end, and we'll close with the screenshot and reporting hooks that make failures self-explanatory.

---

## The Three Negation Verbs

Selenide offers three negation methods that are syntactically equivalent but stylistically distinct:

\`\`\`java
\$("#error").shouldNot(visible);       // generic
\$("#error").shouldNotBe(visible);     // state-style readability
\$("#error").shouldNotHave(text("Bad"));// possession-style readability
\`\`\`

Pick whichever reads best at the call site. They all hit the same underlying \`Condition.negate\` path.

---

## How Negative Waits Work

A positive assertion waits until a condition becomes true. A negative assertion waits until a condition becomes false. The semantics matter for elements that don't exist yet:

- \`shouldBe(visible)\` waits until the element exists AND is visible.
- \`shouldNotBe(visible)\` is satisfied if the element is gone OR not visible.
- \`shouldNot(exist)\` is satisfied only when the element is gone from the DOM.

The default timeout is \`Configuration.timeout\` (4 seconds). Set it globally or per assertion:

\`\`\`java
import java.time.Duration;
import static com.codeborne.selenide.Condition.*;

\$("#spinner").shouldNot(exist, Duration.ofSeconds(15));
\`\`\`

---

## Core Negative Conditions

### shouldNot(exist)

Use when an element must be removed from the DOM. A toast that should disappear, a modal that closed, a deleted row.

\`\`\`java
\$("#toast-success").should(appear);
\$("#toast-success").shouldNot(exist, Duration.ofSeconds(10));
\`\`\`

This is more strict than \`shouldNotBe(visible)\` because \`display:none\` would still pass \`shouldNotBe(visible)\` but fail \`shouldNot(exist)\`.

### shouldNotBe(visible)

Use when an element is allowed to stay in the DOM but must be hidden.

\`\`\`java
\$(".sidebar").click();
\$(".sidebar-panel").shouldNotBe(visible);
\`\`\`

This passes for elements that are \`display:none\`, \`visibility:hidden\`, have zero dimensions, or are removed from the DOM.

### shouldNotBe(enabled)

Forms often disable submit buttons during requests. Verify the lock:

\`\`\`java
\$("#submit").click();
\$("#submit").shouldNotBe(enabled);
\$("#submit").shouldBe(enabled);   // re-enabled after response
\`\`\`

### shouldNotBe(selected)

For checkboxes and radio buttons:

\`\`\`java
\$("#remember-me").click();
\$("#remember-me").shouldBe(selected);
\$("#remember-me").click();
\$("#remember-me").shouldNotBe(selected);
\`\`\`

### shouldNotBe(empty)

The \`empty\` condition is true when the element has no text and no value. Negating it verifies content exists:

\`\`\`java
\$("#bio").setValue("Senior SDET");
\$("#bio").shouldNotBe(empty);
\`\`\`

### shouldNotBe(focused)

After blurring a field:

\`\`\`java
\$("#search").click();
\$("#search").shouldBe(focused);
\$("body").click();
\$("#search").shouldNotBe(focused);
\`\`\`

---

## Negative Text Conditions

### shouldNotHave(text("..."))

Verify a substring is gone:

\`\`\`java
\$(".cart-total").shouldNotHave(text("\$0.00"));
\$(".error-banner").shouldNotHave(text("Server error"));
\`\`\`

Selenide's \`text\` is a case-insensitive substring match. For exact matching use \`exactText\`:

\`\`\`java
\$("h1").shouldNotHave(exactText("Loading..."));
\`\`\`

### shouldNotHave(matchText(regex))

When you need a pattern:

\`\`\`java
\$(".price").shouldNotHave(matchText("\\\\\$0\\\\.\\\\d{2}"));
\`\`\`

### shouldNotHave(value("..."))

For form fields:

\`\`\`java
\$("#email").shouldHave(value("alice@example.com"));
\$("#reset").click();
\$("#email").shouldNotHave(value("alice@example.com"));
\`\`\`

### shouldNotHave(attribute(...))

Verify an attribute disappeared or changed:

\`\`\`java
\$("#submit").shouldNotHave(attribute("disabled"));
\$(".tab").shouldNotHave(cssClass("active"));
\`\`\`

### shouldNotHave(cssClass("..."))

Common UI state checks:

\`\`\`java
\$(".row[data-id='42']").shouldNotHave(cssClass("selected"));
\$("#email-field").shouldNotHave(cssClass("error"));
\`\`\`

### shouldNotHave(cssValue("color", "rgb(255, 0, 0)"))

Less common but useful for theme assertions:

\`\`\`java
\$("#status").shouldNotHave(cssValue("background-color", "rgba(255, 0, 0, 1)"));
\`\`\`

---

## Combining Conditions

Selenide supports \`and\` and \`or\` for compound conditions; negation works on the composite:

\`\`\`java
import static com.codeborne.selenide.Condition.*;

\$(".cta").shouldNot(or("disabled or hidden",
    not(visible), attribute("disabled")));
\$(".cta").should(and("visible and enabled", visible, enabled));
\`\`\`

For complex predicates you can write a custom \`Condition\`:

\`\`\`java
import com.codeborne.selenide.Condition;
import com.codeborne.selenide.CheckResult;

public static Condition priceUnder(int cents) {
    return new Condition("price under " + cents) {
        @Override
        public CheckResult check(com.codeborne.selenide.Driver driver,
                                 org.openqa.selenium.WebElement element) {
            String text = element.getText().replaceAll("[^0-9]", "");
            int v = Integer.parseInt(text);
            return new CheckResult(v < cents, "actual=" + v);
        }
    };
}

\$(".price").shouldNot(priceUnder(100));
\`\`\`

---

## Timing Configuration

The defaults are sensible but production tests often need tuning.

\`\`\`java
import com.codeborne.selenide.Configuration;

Configuration.timeout = 6000;             // 6s default
Configuration.pollingInterval = 200;      // 200ms checks
Configuration.fastSetValue = true;        // faster typing
\`\`\`

Per-call override:

\`\`\`java
\$("#loader").shouldNot(exist, Duration.ofSeconds(30));
\`\`\`

For mass migrations, use a base test class that sets these once.

---

## Negative Assertions on Collections

Collections use \`CollectionCondition\` instead of \`Condition\`. The negative form is built into the conditions themselves.

\`\`\`java
import static com.codeborne.selenide.CollectionCondition.*;

\$\$(".error").shouldBe(empty);
\$\$(".row").shouldHave(sizeNotEqual(0));
\$\$(".tag").shouldHave(textsInAnyOrder("urgent", "backend"));
\`\`\`

For a quick negative existence:

\`\`\`java
\$\$(".error").shouldHave(size(0));
\$\$(".banner").filterBy(text("Maintenance")).shouldBe(empty);
\`\`\`

---

## Patterns That Avoid Flakiness

### Wait for transition, not absence

\`\`\`java
\$("#save").click();
\$(".saving-indicator").should(appear);
\$(".saving-indicator").should(disappear);  // negative wait
\$(".saved-toast").should(appear);
\`\`\`

\`disappear\` is sugar for \`shouldNotBe(visible)\` with the configured timeout. Pairing \`appear\` then \`disappear\` is more reliable than a single negative assertion.

### Avoid double-negatives

Don't write \`shouldNotBe(not(visible))\`. Use \`shouldBe(visible)\`.

### Don't rely on absence as initial state

\`\`\`java
// Anti-pattern: waits 4 seconds for nothing
\$("#error").shouldNot(exist);

// Pattern: assert positive state instead
\$("#email").shouldBe(visible);
\`\`\`

Asserting absence on page load wastes the entire timeout when the page is fine. Reserve negative assertions for transitions.

---

## Allure Integration

Selenide's listener attaches a screenshot and the page source automatically on a failed assertion. Wire it once:

\`\`\`java
import com.codeborne.selenide.logevents.SelenideLogger;
import io.qameta.allure.selenide.AllureSelenide;

@BeforeAll
static void wireAllure() {
    SelenideLogger.addListener("Allure",
        new AllureSelenide()
            .screenshots(true)
            .savePageSource(true));
}
\`\`\`

When \`shouldNot(exist)\` fails because the element didn't go away, Allure shows the live HTML and you can immediately see why.

---

## Maven Setup

\`\`\`xml
<dependencies>
    <dependency>
        <groupId>com.codeborne</groupId>
        <artifactId>selenide</artifactId>
        <version>7.5.0</version>
    </dependency>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>5.11.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>io.qameta.allure</groupId>
        <artifactId>allure-selenide</artifactId>
        <version>2.27.0</version>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-surefire-plugin</artifactId>
            <version>3.2.5</version>
            <configuration>
                <argLine>
                    -javaagent:"\${settings.localRepository}/org/aspectj/aspectjweaver/1.9.22/aspectjweaver-1.9.22.jar"
                </argLine>
            </configuration>
        </plugin>
    </plugins>
</build>
\`\`\`

---

## Gradle Setup

\`\`\`groovy
dependencies {
    testImplementation 'com.codeborne:selenide:7.5.0'
    testImplementation 'org.junit.jupiter:junit-jupiter:5.11.0'
    testImplementation 'io.qameta.allure:allure-selenide:2.27.0'
    testRuntimeOnly 'org.aspectj:aspectjweaver:1.9.22'
}

test {
    useJUnitPlatform()
    def weaver = configurations.testRuntimeClasspath.find {
        it.name.contains('aspectjweaver')
    }
    jvmArgs "-javaagent:\${weaver}"
}
\`\`\`

---

## Screenshot Config for Negative Failures

\`\`\`java
Configuration.screenshots = true;
Configuration.savePageSource = true;
Configuration.reportsFolder = "build/reports/screenshots";
Configuration.reportsUrl = "http://ci.example.com/artifacts/";
\`\`\`

When a \`shouldNot\` fails, Selenide writes \`<timestamp>.png\` and \`<timestamp>.html\` to the reports folder. CI links them in the failure message.

---

## A Real Test

\`\`\`java
@Test
void deletedRowDisappears() {
    open("/users");
    \$\$(".user-row").shouldHave(sizeGreaterThan(0));
    \$(".user-row[data-id='42']").shouldBe(visible);
    \$(".user-row[data-id='42'] .delete").click();
    \$("#confirm").click();

    \$(".user-row[data-id='42']").shouldNot(exist, Duration.ofSeconds(10));
    \$\$(".user-row").filterBy(attribute("data-id", "42")).shouldBe(empty);
    \$(".toast").shouldHave(text("User deleted"));
    \$(".toast").should(disappear);
    \$(".toast").shouldNot(exist);
}
\`\`\`

---

## Conclusion

Negative assertions are timing assertions in disguise. The Selenide vocabulary is small enough to memorize, but the semantics of "stop being true" require care. Prefer \`should(disappear)\` for transitions, \`shouldNot(exist)\` for hard removal, and \`shouldNotBe(visible)\` when DOM presence is allowed. Combine them with Allure for self-documenting failures and you've eliminated the flakiest category of UI test in one stroke.
`,
};
