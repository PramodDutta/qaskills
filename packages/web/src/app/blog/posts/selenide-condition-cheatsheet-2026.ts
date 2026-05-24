import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide Condition Cheatsheet 2026 — should() Reference',
  description:
    'Complete Selenide Condition reference for 2026. visible, exist, text, attribute, value, cssClass with should and shouldHave examples.',
  date: '2026-05-08',
  category: 'Reference',
  content: `
# Selenide Condition Cheatsheet 2026

Selenide's \`Condition\` class is the heart of its expressive assertions. Where raw Selenium WebDriver forces you to write \`assertTrue(element.isDisplayed())\` and pray it doesn't throw on a stale element, Selenide gives you \`$("#submit").shouldBe(visible)\` — readable, retry-aware, and built on top of explicit waits with sane timeouts. The \`Condition\` class exposes 60+ predicates, and knowing them all separates the casual Selenide user from the engineer who writes clean, maintainable browser tests.

This cheatsheet is a comprehensive reference for Selenide's Condition class in 2026. We cover visibility conditions, existence conditions, text conditions, attribute conditions, value conditions, CSS class conditions, custom conditions, and how to combine them with \`and\`, \`or\`, \`not\`. Every example is working Java code using Selenide 7+.

---

## Key Takeaways

- **should()** asserts a condition with retry until \`Configuration.timeout\` expires
- **shouldBe()** is a synonym for \`should()\` — both work; pick the one that reads better
- **shouldHave()** is for compound conditions like \`text\`, \`attribute\`, \`cssClass\`
- **shouldNot()** asserts the absence of a condition
- **Condition.visible vs exist** — visible requires CSS display + dimensions; exist only requires DOM presence
- **Use \`and\` / \`or\`** to combine conditions instead of chaining multiple \`should\` calls

---

## Visibility Conditions

| Condition | What it checks |
|---|---|
| \`visible\` | DOM present + CSS display != none + dimensions > 0 |
| \`hidden\` | DOM present but CSS hidden or zero dimensions |
| \`exist\` | DOM present, regardless of visibility |
| \`appear\` | Same as visible, used semantically when waiting for an element to appear |
| \`disappear\` | Element no longer visible |

\`\`\`java
import static com.codeborne.selenide.Selenide.$;
import static com.codeborne.selenide.Condition.*;

$("#login-button").shouldBe(visible);
$("#error-message").shouldBe(hidden);
$("#tooltip").shouldNotBe(visible);
$(".loading-spinner").should(disappear);
$(".modal").should(appear);
\`\`\`

The difference between \`visible\` and \`exist\` matters. A modal hidden with \`display: none\` will satisfy \`exist\` but not \`visible\`.

---

## Text Conditions

| Condition | Semantics |
|---|---|
| \`text("expected")\` | Element contains the substring (case-insensitive) |
| \`exactText("expected")\` | Element text equals exactly (whitespace normalized) |
| \`textCaseSensitive("expected")\` | Substring match, case-sensitive |
| \`exactTextCaseSensitive(...)\` | Exact match, case-sensitive |
| \`matchText("regex")\` | Element text matches regex |
| \`partialText("hello")\` | Substring match (alias for \`text\`) |
| \`empty\` | Element has no text (or empty input value) |

\`\`\`java
$("h1").shouldHave(text("Welcome"));
$("#status").shouldHave(exactText("Logged in"));
$(".error").shouldHave(matchText("^Error: .+\\\\d{3}$"));
$("#search-input").shouldHave(empty);
\`\`\`

---

## Attribute Conditions

| Condition | Purpose |
|---|---|
| \`attribute("name")\` | Element has attribute |
| \`attribute("name", "value")\` | Attribute equals value |
| \`attributeMatching("name", "regex")\` | Attribute matches regex |
| \`href("url")\` | Anchor href equals (alias for \`attribute("href", url)\`) |

\`\`\`java
$("input").shouldHave(attribute("placeholder"));
$("input").shouldHave(attribute("type", "email"));
$("a.cta").shouldHave(attributeMatching("href", "/checkout.*"));
$("a.docs").shouldHave(href("/docs"));
\`\`\`

---

## Value Conditions

| Condition | Use |
|---|---|
| \`value("expected")\` | Input value equals |
| \`exactValue(...)\` | Same as value, kept for naming consistency |

\`\`\`java
$("#email").shouldHave(value("alice@example.com"));
$("#count").shouldHave(value("5"));
\`\`\`

For checkbox/radio state, use \`selected\` instead of \`value\`.

---

## State Conditions

| Condition | Means |
|---|---|
| \`selected\` | Checkbox/radio is checked, or option is selected |
| \`checked\` | Alias for selected (more readable for checkboxes) |
| \`enabled\` | Input is not disabled |
| \`disabled\` | Input has disabled attribute |
| \`readonly\` | Input has readonly attribute |
| \`focused\` | Element has keyboard focus |
| \`editable\` | Input is enabled and not readonly |
| \`interactable\` | Element is visible and enabled |
| \`clickable\` | Element is visible, enabled, and not covered |

\`\`\`java
$("#agree").shouldBe(checked);
$("#submit").shouldBe(enabled);
$("#email").shouldBe(focused);
$(".btn").shouldBe(clickable);
\`\`\`

---

## CSS Class Conditions

| Condition | Behavior |
|---|---|
| \`cssClass("active")\` | Element has the CSS class |
| \`cssValue("color", "red")\` | Computed CSS property equals |

\`\`\`java
$(".tab.users").shouldHave(cssClass("active"));
$("button").shouldHave(cssValue("background-color", "rgb(0, 123, 255)"));
\`\`\`

---

## Collection Conditions

When working with multiple elements (\`$$\`), use \`CollectionCondition\`:

| Condition | Use |
|---|---|
| \`size(5)\` | Collection has exactly N elements |
| \`sizeGreaterThan(3)\` | More than N |
| \`sizeLessThan(10)\` | Fewer than N |
| \`empty\` | No elements |
| \`texts("a", "b", "c")\` | Each element's text contains the given substring |
| \`exactTexts(...)\` | Exact match per element |
| \`textsInAnyOrder(...)\` | Substring match, any order |

\`\`\`java
import static com.codeborne.selenide.CollectionCondition.*;
import static com.codeborne.selenide.Selenide.$$;

$$("li").shouldHave(size(3));
$$("li").shouldHave(exactTexts("Alice", "Bob", "Carol"));
$$(".tag").shouldHave(textsInAnyOrder("react", "vue", "svelte"));
\`\`\`

---

## Combining Conditions

\`and\`, \`or\`, \`not\`:

\`\`\`java
$("button").shouldBe(visible.and(enabled));
$(".status").shouldBe(visible.or(hidden));
$("#hidden").should(not(visible));
\`\`\`

You can also chain multiple \`shouldHave\` calls:

\`\`\`java
$("input")
  .shouldBe(visible)
  .shouldHave(attribute("type", "text"))
  .shouldHave(value(""))
  .shouldBe(enabled);
\`\`\`

---

## Custom Conditions

Build your own:

\`\`\`java
import com.codeborne.selenide.Condition;
import com.codeborne.selenide.CheckResult;
import org.openqa.selenium.WebElement;

Condition isHighlighted = new Condition("highlighted") {
    @Override
    public CheckResult check(Driver driver, WebElement element) {
        String bg = element.getCssValue("background-color");
        boolean ok = bg.equals("rgb(255, 255, 0)");
        return new CheckResult(ok, bg);
    }
};

$("#alert").shouldBe(isHighlighted);
\`\`\`

---

## Negation Patterns

\`\`\`java
$("#spinner").shouldNot(exist);
$("#login").shouldNotBe(visible);
$("#submit").shouldNotHave(text("Loading"));
\`\`\`

\`shouldNot\`, \`shouldNotBe\`, \`shouldNotHave\` are aliases — all do the same thing.

---

## Wait Times

By default, conditions wait \`Configuration.timeout\` (default 4000ms). Override per-call:

\`\`\`java
$("#slow").should(visible, Duration.ofSeconds(10));
\`\`\`

Or globally:

\`\`\`java
Configuration.timeout = 10000;
Configuration.pollingInterval = 200;
\`\`\`

---

## Speed Reference Card

| You want to... | Use... |
|---|---|
| Wait for element to appear | \`should(appear)\` or \`shouldBe(visible)\` |
| Wait for element to disappear | \`should(disappear)\` |
| Check text exactly | \`shouldHave(exactText("..."))\` |
| Check text contains | \`shouldHave(text("..."))\` |
| Check regex | \`shouldHave(matchText("..."))\` |
| Check attribute | \`shouldHave(attribute("name", "value"))\` |
| Check input value | \`shouldHave(value("..."))\` |
| Check checkbox state | \`shouldBe(checked)\` |
| Check element disabled | \`shouldBe(disabled)\` |
| Check CSS class present | \`shouldHave(cssClass("active"))\` |
| Check collection size | \`shouldHave(size(N))\` |
| Combine conditions | \`shouldBe(visible.and(enabled))\` |

---

## Anti-Patterns

**Anti-pattern 1: Using isDisplayed() / isPresent().** These return immediately without waiting, leading to flaky tests:

\`\`\`java
// Bad
if ($("#button").isDisplayed()) { /* maybe true, maybe false */ }

// Good
$("#button").shouldBe(visible);
\`\`\`

**Anti-pattern 2: Thread.sleep().** Replace with conditions:

\`\`\`java
// Bad
Thread.sleep(2000);

// Good
$(".loaded").shouldBe(visible);
\`\`\`

**Anti-pattern 3: getText() before should.** \`getText()\` returns immediately. Always assert visibility first:

\`\`\`java
// Bad
String text = $(".result").getText();
assertEquals("done", text);

// Good
$(".result").shouldHave(text("done"));
\`\`\`

---

## Conclusion

Selenide's Condition class is a small DSL — fewer than 60 predicates — but mastering it makes the difference between brittle tests that crash on race conditions and clean tests that read like spec documentation. The cheatsheet above covers everything you need for day-to-day work. For deeper context, see our [Selenide Page Object Pattern guide](/blog/selenide-page-object-pattern-best-practices) and [Selenide vs Selenium WebDriver 2026](/blog/selenide-vs-selenium-webdriver-2026).

Explore the [QA skills directory](/skills) for related browser automation patterns.
`,
};
