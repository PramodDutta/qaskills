import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide cssClass Condition Complete Reference (2026)',
  description:
    'Complete Selenide reference for cssClass, attribute, attributeMatching, and custom conditions. Assert active states and CSS classes with shouldHave. Java.',
  date: '2026-06-02',
  category: 'Reference',
  content: `
# Selenide cssClass Condition Complete Reference

Asserting on CSS classes is one of the most common things a UI test does, yet it is also where a surprising amount of flakiness and false confidence creeps in. A button becomes \`active\`, a row gains a \`selected\` class, a form field is decorated with \`is-invalid\`, a navigation link picks up \`router-link-active\` after a route change. Each of these is a state transition your test needs to verify, and each of them depends on the framework actually finishing its render cycle before your assertion runs. Selenide handles the timing for you through its retry-aware \`should\` family, and the \`Condition.cssClass\` matcher is the precise tool for these checks.

This reference covers \`cssClass\` exhaustively, then expands outward to the conditions you reach for in the same breath: \`attribute\`, \`attributeMatching\`, \`cssValue\`, and the custom \`Condition\` subclasses you write when the built-ins run out. Everything here is Java only, using the modern \`com.codeborne.selenide\` API, and every snippet is runnable inside a JUnit 5 test once Selenide is on the classpath. By the end you will know exactly which matcher to use for a class, a partial class, a data attribute, or a computed style, and you will understand the timing rules that keep these assertions stable across thousands of CI runs. If you want the broader assertion vocabulary first, the [Selenide condition cheatsheet](/blog) pairs well with this page, and you can install a ready-made Selenide skill for your AI agent from the [QA Skills directory](/skills).

---

## What cssClass Actually Checks

\`Condition.cssClass("active")\` returns true when the element's \`class\` attribute contains the token \`active\` as a whitespace-separated value. It is a token match, not a substring match. An element with \`class="active-tab"\` does NOT satisfy \`cssClass("active")\`, because \`active-tab\` is a single token. This is the correct behaviour and it mirrors how the browser itself resolves \`classList.contains("active")\`.

\`\`\`java
import static com.codeborne.selenide.Selenide.$;
import static com.codeborne.selenide.Condition.cssClass;

// HTML: <button class="btn btn-primary active">Save</button>
$("#save").shouldHave(cssClass("active"));      // passes
$("#save").shouldHave(cssClass("btn"));         // passes
$("#save").shouldHave(cssClass("btn-primary")); // passes
$("#save").shouldHave(cssClass("act"));         // FAILS - not a full token
\`\`\`

The matcher is retry-aware. If the class is not present yet, Selenide keeps polling until \`Configuration.timeout\` (4 seconds by default) elapses. That is the entire point: you assert the desired end state and let Selenide wait for the framework to apply it.

---

## shouldHave, shouldNotHave, and the Verb Choice

\`cssClass\` is a possession-style condition, so it reads most naturally with \`shouldHave\` and \`shouldNotHave\`. All three \`should\` verbs accept it, but pick the one that reads correctly at the call site.

\`\`\`java
import static com.codeborne.selenide.Condition.cssClass;

$("#tab-1").shouldHave(cssClass("selected"));       // element gains the class
$("#tab-2").shouldNotHave(cssClass("selected"));    // element loses / never has it
$("#tab-1").should(cssClass("selected"));           // generic - works but reads oddly
\`\`\`

The negative form is the one that catches the most real bugs. After clicking tab 1, you assert tab 2 is no longer selected. \`shouldNotHave(cssClass("selected"))\` waits until the class is gone, which handles the brief window where both tabs might momentarily carry the class during a transition.

| Verb | Reads as | Typical use |
|------|----------|-------------|
| \`shouldHave(cssClass("x"))\` | "should have class x" | Element entered a state |
| \`shouldNotHave(cssClass("x"))\` | "should not have class x" | Element left a state |
| \`should(cssClass("x"))\` | "should css class x" | Generic, avoid for readability |

---

## Asserting Multiple Classes at Once

A single \`shouldHave\` call accepts multiple conditions, and they are all evaluated against the same element within one wait window. This is cleaner than chaining and produces a single combined error message.

\`\`\`java
import static com.codeborne.selenide.Condition.cssClass;

// require all three tokens to be present
$("#submit").shouldHave(
    cssClass("btn"),
    cssClass("btn-primary"),
    cssClass("active")
);
\`\`\`

Each condition is checked on every poll, so the call passes only when all of them hold simultaneously. If you need "any of these classes", that is a different requirement - see the custom condition section below, because the built-in \`cssClass\` is strictly AND when combined.

---

## cssClass on Collections

When you have a list of elements and need to assert class state across them, combine \`$$\` collections with element-level \`cssClass\` checks. A common pattern is verifying exactly one item in a list is active.

\`\`\`java
import static com.codeborne.selenide.Selenide.$$;
import static com.codeborne.selenide.Condition.cssClass;
import static com.codeborne.selenide.CollectionCondition.size;

// every nav link rendered
$$(".nav-link").shouldHave(size(5));

// the third one is the active route
$$(".nav-link").get(2).shouldHave(cssClass("router-link-active"));

// none of the others are active
$$(".nav-link").get(0).shouldNotHave(cssClass("router-link-active"));
$$(".nav-link").get(1).shouldNotHave(cssClass("router-link-active"));
\`\`\`

For richer collection filtering you can pull the elements whose class matches using a stream, but for most assertions the indexed \`get(n).shouldHave(...)\` form is the most readable and the most stable.

---

## The attribute Condition

\`Condition.attribute\` comes in two shapes. The single-argument form asserts the attribute merely exists (any value, including empty). The two-argument form asserts the attribute exists AND equals an exact value.

\`\`\`java
import static com.codeborne.selenide.Condition.attribute;

// HTML: <input id="email" type="email" required data-test="email-field">
$("#email").shouldHave(attribute("required"));               // exists at all
$("#email").shouldHave(attribute("type", "email"));          // exact value
$("#email").shouldHave(attribute("data-test", "email-field"));
$("#email").shouldNotHave(attribute("disabled"));            // must be absent
\`\`\`

The exact-value form is strict: \`attribute("type", "email")\` fails if the value is \`"Email"\` or \`" email"\`. For class checks specifically, prefer \`cssClass\` over \`attribute("class", ...)\`, because the latter forces you to match the entire class string in order, which is brittle the moment a framework reorders or adds a token.

\`\`\`java
// brittle - breaks if order or extra classes change
$("#save").shouldHave(attribute("class", "btn btn-primary active"));

// robust - order-independent, extra classes allowed
$("#save").shouldHave(cssClass("active"));
\`\`\`

---

## attributeMatching for Regex and Partial Values

When an attribute value is dynamic - a generated id, a URL with a query string, a timestamped data attribute - exact matching is hopeless. \`Condition.attributeMatching\` takes a Java regular expression and passes when the full attribute value matches it.

\`\`\`java
import static com.codeborne.selenide.Condition.attributeMatching;

// HTML: <a id="row-9f3a2" href="/orders/482?ref=email">View</a>
$("a.view").shouldHave(attributeMatching("id", "row-[a-f0-9]+"));
$("a.view").shouldHave(attributeMatching("href", "/orders/\\\\d+.*"));
\`\`\`

The regex must match the entire value (it is anchored), so include \`.*\` where you only care about a prefix or suffix. This is the right tool for asserting that a \`data-state\` attribute is one of several allowed values, or that a class attribute contains a versioned token like \`theme-v2-dark\`.

| Condition | Matches | When to use |
|-----------|---------|-------------|
| \`attribute("k")\` | attribute present, any value | Boolean-style attributes (required, checked) |
| \`attribute("k","v")\` | exact value | Stable, known values |
| \`attributeMatching("k","regex")\` | regex over full value | Dynamic ids, URLs, versioned tokens |
| \`cssClass("x")\` | class token present | The correct way to check classes |

---

## cssValue for Computed Styles

\`cssClass\` checks the class attribute; \`Condition.cssValue\` checks the actual computed style. Use it when the thing you care about is visual state that may be driven by a class you cannot predict, such as a colour or a \`display\` value.

\`\`\`java
import static com.codeborne.selenide.Condition.cssValue;

$("#error").shouldHave(cssValue("color", "rgba(220, 38, 38, 1)"));
$("#panel").shouldHave(cssValue("display", "none"));
$("#badge").shouldHave(cssValue("font-weight", "700"));
\`\`\`

Be aware that browsers normalise computed values: a hex colour comes back as \`rgba(...)\`, \`bold\` becomes \`700\`, and shorthand properties resolve to longhand. Read the value once in a debugger before asserting on it. For pure state-machine tests, prefer \`cssClass\` - it is faster and far less coupled to the theme.

---

## Writing a Custom Condition

When no built-in fits - for example "has any class starting with \`status-\`" - subclass \`Condition\`. You override \`check\` to return a \`CheckResult\`, and Selenide handles the retry loop for you exactly as it does for built-ins.

\`\`\`java
import com.codeborne.selenide.CheckResult;
import com.codeborne.selenide.Condition;
import com.codeborne.selenide.Driver;
import org.openqa.selenium.WebElement;

public final class CustomConditions {

    public static Condition cssClassStartingWith(String prefix) {
        return new Condition("cssClassStartingWith " + prefix) {
            @Override
            public CheckResult check(Driver driver, WebElement element) {
                String classAttr = element.getAttribute("class");
                boolean matched = classAttr != null
                    && java.util.Arrays.stream(classAttr.split("\\\\s+"))
                        .anyMatch(token -> token.startsWith(prefix));
                return new CheckResult(matched, classAttr);
            }
        };
    }
}
\`\`\`

You then use it exactly like any shipped condition, complete with auto-retry and a descriptive failure message that prints the actual class attribute:

\`\`\`java
import static com.codeborne.selenide.Selenide.$;
import static org.example.CustomConditions.cssClassStartingWith;

$("#order-row").shouldHave(cssClassStartingWith("status-"));
\`\`\`

This is the escape hatch that keeps you from dropping back to raw Selenium. Anything you can express as a boolean over a \`WebElement\` becomes a first-class, retry-aware Selenide condition.

---

## A Complete Runnable Test

Here is a full JUnit 5 test that exercises class transitions on a tab strip, including the negative assertions that prevent false positives. It is copy-pasteable once Selenide and JUnit 5 are on the classpath.

\`\`\`java
package org.example;

import com.codeborne.selenide.Configuration;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static com.codeborne.selenide.Selenide.$;
import static com.codeborne.selenide.Selenide.$$;
import static com.codeborne.selenide.Selenide.open;
import static com.codeborne.selenide.Condition.cssClass;
import static com.codeborne.selenide.Condition.attribute;
import static com.codeborne.selenide.CollectionCondition.size;

class TabStripTest {

    @BeforeAll
    static void setup() {
        Configuration.baseUrl = "https://app.example.com";
        Configuration.browser = "chrome";
        Configuration.timeout = 6000;
        Configuration.headless = true;
    }

    @Test
    void clickingTabActivatesItAndDeactivatesOthers() {
        open("/dashboard");

        $$(".tab").shouldHave(size(3));

        // initially the first tab is active
        $$(".tab").get(0).shouldHave(cssClass("active"));
        $$(".tab").get(1).shouldNotHave(cssClass("active"));

        // click the second tab
        $$(".tab").get(1).click();

        // it becomes active, the first stops being active
        $$(".tab").get(1).shouldHave(cssClass("active"));
        $$(".tab").get(0).shouldNotHave(cssClass("active"));

        // the matching panel is now selected via a data attribute
        $("#panel-2").shouldHave(attribute("data-state", "selected"));
        $("#panel-1").shouldNotHave(attribute("data-state", "selected"));
    }
}
\`\`\`

---

## Maven and Gradle Setup

Add Selenide as a test dependency. Maven:

\`\`\`xml
<dependency>
  <groupId>com.codeborne</groupId>
  <artifactId>selenide</artifactId>
  <version>7.5.1</version>
  <scope>test</scope>
</dependency>
\`\`\`

Gradle (Kotlin DSL):

\`\`\`kotlin
testImplementation("com.codeborne:selenide:7.5.1")
\`\`\`

Selenide bundles Selenium Manager, so the browser driver is resolved automatically. No \`webdrivermanager\` and no manual \`chromedriver\` download are required on modern versions.

---

## Common Mistakes and How to Avoid Them

The most frequent error is using \`attribute("class", "...")\` to check a single class. It looks reasonable but breaks the moment the framework adds, removes, or reorders a token. Always use \`cssClass\` for class tokens.

The second is treating \`cssClass\` as a substring match. It is a token match. \`cssClass("active")\` will never pass for \`class="inactive"\` or \`class="active-tab"\`. If you genuinely need a prefix or substring, write a custom condition as shown above.

The third is forgetting the negative assertion. Asserting only that the new tab is active leaves a gap: a bug that activates everything would pass. Always pair \`shouldHave(cssClass("active"))\` on the target with \`shouldNotHave(cssClass("active"))\` on a sibling.

| Mistake | Symptom | Fix |
|---------|---------|-----|
| \`attribute("class", "btn active")\` | Flaky on token reorder | Use \`cssClass("active")\` |
| Expecting substring match | Assertion never passes | Token match only; use custom condition |
| Only positive assertions | Bugs that over-apply class slip through | Add \`shouldNotHave\` on siblings |
| Hardcoding computed colour | Breaks on theme change | Prefer \`cssClass\` over \`cssValue\` |

---

## cssClass with Conditional Logic in Tests

A frequent real-world need is branching test logic based on whether a class is present - for example, dismissing a cookie banner only if it carries a \`visible\` class. Selenide elements expose a \`has\` method that returns a boolean without throwing, which is the correct tool for conditional flow. Do not confuse this with \`shouldHave\`, which asserts and fails the test if the class is missing.

\`\`\`java
import static com.codeborne.selenide.Selenide.$;
import static com.codeborne.selenide.Condition.cssClass;
import static com.codeborne.selenide.Condition.visible;

// non-asserting check for control flow
if ($("#cookie-banner").has(cssClass("visible"))) {
    $("#accept-cookies").click();
}

// proceed with the rest of the test regardless
$("#main-content").shouldBe(visible);
\`\`\`

The distinction matters because \`has\` evaluates immediately and returns a boolean, whereas \`shouldHave\` retries and then either passes or throws. Use \`has\`/\`is\` when you genuinely need a branch, and reserve \`shouldHave\`/\`shouldBe\` for the assertions that define the test's expected outcome. Mixing them up - using \`shouldHave\` where you meant \`has\` - turns an optional UI element into a hard test failure.

There is also a subtle timing trap with \`has\`. Because it does not wait, calling it before the framework has rendered can return a false negative. If the class might appear slightly later, wait for a stable anchor first, then check:

\`\`\`java
// wait for the banner to finish rendering, THEN branch on its class
$("#cookie-banner").shouldBe(visible);
if ($("#cookie-banner").has(cssClass("dismissible"))) {
    $("#accept-cookies").click();
}
\`\`\`

This ordering removes the race: you assert the element exists with a retrying \`shouldBe\`, and only then read its class state synchronously.

---

## Combining cssClass with text and value Conditions

Class state rarely lives alone. A validated form field is both \`is-valid\` AND shows a confirmation message; a selected row is both \`selected\` AND contains the expected text. Selenide lets you assert several conditions of different kinds on one element, and they share a single wait window.

\`\`\`java
import static com.codeborne.selenide.Condition.cssClass;
import static com.codeborne.selenide.Condition.text;
import static com.codeborne.selenide.Condition.exactValue;

// a field that became valid and carries the right value
$("#email")
    .shouldHave(cssClass("is-valid"))
    .shouldHave(exactValue("user@example.com"));

// a selected row with the expected content
$("#row-42")
    .shouldHave(cssClass("selected"), text("Order #42"));
\`\`\`

Chaining \`shouldHave\` calls reads naturally and each link in the chain retries independently, while passing multiple conditions to one call evaluates them together. Both styles are valid; pick chaining when the conditions are logically separate steps and the combined form when they describe one composite state. This mix of class, text, and value assertions is how you verify a complete UI state rather than just one facet of it.

| Combined condition | What it proves |
|--------------------|----------------|
| \`cssClass("is-valid")\` + \`exactValue(...)\` | Field passed validation with correct content |
| \`cssClass("selected")\` + \`text(...)\` | Right row is highlighted |
| \`cssClass("active")\` + \`attribute("aria-selected","true")\` | State and accessibility flag agree |

---

## Frequently Asked Questions

### Does Selenide cssClass do a substring or token match?

A token match. \`Condition.cssClass("active")\` passes only when \`active\` appears as a complete whitespace-separated token in the element's class attribute. An element with \`class="active-tab"\` will not satisfy it, exactly like \`element.classList.contains("active")\` in the browser. For substring or prefix needs, write a custom condition.

### How do I assert an element has multiple CSS classes?

Pass several \`cssClass\` conditions to one \`shouldHave\` call, for example \`shouldHave(cssClass("btn"), cssClass("active"))\`. All conditions must hold within the same wait window, so the assertion passes only when every listed class is present simultaneously. This produces one combined error message instead of several chained calls.

### What is the difference between cssClass and cssValue?

\`cssClass\` inspects the \`class\` attribute and checks for a class token. \`cssValue\` inspects the browser's computed style for a property like \`color\` or \`display\`. Use \`cssClass\` for state-machine assertions (is this tab active) and \`cssValue\` only when you must verify the resulting visual style directly.

### How long does shouldHave(cssClass(...)) wait before failing?

It waits up to \`Configuration.timeout\`, which defaults to 4000 milliseconds. Selenide polls the element repeatedly until the class appears or the timeout elapses. You can override per assertion with the overload that accepts a \`Duration\`, for example \`shouldHave(cssClass("active"), Duration.ofSeconds(10))\`.

### When should I use attributeMatching instead of attribute?

Use \`attributeMatching\` when the attribute value is dynamic or only partially known - generated ids, URLs with query strings, versioned tokens. It takes an anchored Java regex matched against the full value, so include \`.*\` for prefixes or suffixes. Use the plain \`attribute("k","v")\` form only when the value is stable and exactly known.

### Can I check that an element does NOT have a class?

Yes, use \`shouldNotHave(cssClass("selected"))\`. It waits until the class is absent, which gracefully handles transition windows where the class briefly lingers. This negative assertion is essential for tab strips, selection lists, and validation states, where you must prove a sibling left a state rather than only proving the target entered it.

### Why does my exact attribute("class", ...) assertion keep failing?

Because frameworks add, remove, and reorder class tokens at runtime, so the full class string rarely matches your hardcoded order. Stop matching the whole \`class\` attribute and use \`cssClass\` for individual tokens instead. It is order-independent and tolerant of extra classes, which is what you almost always actually want.

### How do I write a custom Selenide condition for class checks?

Subclass \`com.codeborne.selenide.Condition\`, override \`check(Driver, WebElement)\` to return a \`CheckResult\` boolean, and read the element's class attribute inside. Selenide wraps it in the same retry loop as built-ins, so you use it with \`shouldHave\` exactly like \`cssClass\`. This handles cases like "any class starting with status-" that built-ins cannot express.

---

## Conclusion

The \`cssClass\` condition is small, but it carries a large share of every UI suite's assertions. Use it as a token match, pair it with \`shouldNotHave\` on siblings to close false-positive gaps, reach for \`attribute\` and \`attributeMatching\` when you are checking data attributes or dynamic values, and drop down to a custom \`Condition\` only when the built-ins genuinely run out. Stay away from matching the whole \`class\` attribute string, and let Selenide's retry loop absorb the framework's render timing instead of sprinkling sleeps through your test.

Ready to make your AI agent write Selenide assertions this cleanly by default? Install a Selenide skill from the [QA Skills directory](/skills), and explore more Selenide and Java testing references on the [blog](/blog).
`,
};
