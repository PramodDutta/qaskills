import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide Collection shouldHave — Complete Reference 2026',
  description:
    'Master Selenide collections with $$, ElementsCollection, and shouldHave. Size, texts, exactTexts, filter, find, and 30+ collection patterns.',
  date: '2026-05-09',
  category: 'Reference',
  content: `
# Selenide Collection shouldHave Complete Reference

Selenide's collection API — accessed via \`$$\` and returning \`ElementsCollection\` — is one of the most powerful and underused features of the library. Where raw WebDriver gives you a \`List<WebElement>\` and leaves you to write loops and assertions yourself, Selenide provides a fluent DSL with size assertions, text matching, filtering, and waiting all built in. Knowing the collection API in 2026 means you can write tests against tables, lists, dropdowns, and dynamic grids in 2-3 lines instead of 20.

This reference covers every collection condition and operation available in Selenide 7+. We walk through size assertions, text matching variants, filter and find operations, indexing, snapshot semantics, custom collection conditions, and patterns for testing tables and infinite scroll. Every example is working Java code.

---

## Key Takeaways

- **$$("selector")** returns an \`ElementsCollection\` — a lazy, retry-aware collection
- **CollectionCondition** is the assertion class (separate from element \`Condition\`)
- **shouldHave** accepts collection conditions like \`size\`, \`texts\`, \`exactTexts\`
- **filter, filterBy, find, findBy** narrow collections by predicates
- **first(), last(), get(n)** select specific elements
- **Collections are lazy** — assertions trigger evaluation with retries

---

## Basic Pattern

\`\`\`java
import static com.codeborne.selenide.Selenide.$$;
import static com.codeborne.selenide.CollectionCondition.*;

// Find all li elements
ElementsCollection items = $$("ul.todos li");

// Assert size
items.shouldHave(size(3));

// Assert content
items.shouldHave(exactTexts("Buy milk", "Walk dog", "Write tests"));
\`\`\`

---

## Size Conditions

| Condition | Behavior |
|---|---|
| \`size(N)\` | Exactly N elements |
| \`sizeNotEqual(N)\` | Not equal to N |
| \`sizeGreaterThan(N)\` | More than N |
| \`sizeGreaterThanOrEqual(N)\` | At least N |
| \`sizeLessThan(N)\` | Fewer than N |
| \`sizeLessThanOrEqual(N)\` | At most N |
| \`empty\` | No elements |
| \`anyMatch(predicate)\` | At least one matches |
| \`allMatch(predicate)\` | All match |
| \`noneMatch(predicate)\` | None match |

\`\`\`java
$$(".item").shouldHave(size(5));
$$(".error").shouldHave(empty);
$$(".result").shouldHave(sizeGreaterThan(0));
$$(".item").shouldHave(anyMatch("at least one is visible", el -> el.isDisplayed()));
\`\`\`

---

## Text Conditions

| Condition | Semantics |
|---|---|
| \`texts("a", "b", "c")\` | Each element's text contains substring at that index |
| \`exactTexts(...)\` | Each element's text equals exactly |
| \`textsInAnyOrder(...)\` | Substrings match in any order |
| \`exactTextsCaseSensitiveInAnyOrder(...)\` | Exact match, any order |
| \`itemWithText("hello")\` | At least one item contains the text |
| \`partialTexts(...)\` | Substring per element |

\`\`\`java
$$("td.name").shouldHave(exactTexts("Alice", "Bob", "Carol"));
$$(".tag").shouldHave(textsInAnyOrder("react", "vue", "svelte"));
$$(".user").shouldHave(itemWithText("Diana"));
\`\`\`

---

## Attribute Conditions

\`\`\`java
$$("input").shouldHave(attributes(
    "type", "email", "text", "password"
));
\`\`\`

---

## Filter and Find Operations

Filter returns a sub-collection; find returns a single element (the first match):

| Method | Returns | Use |
|---|---|---|
| \`filter(condition)\` | ElementsCollection | Multiple matches |
| \`filterBy(condition)\` | ElementsCollection | Alias for filter |
| \`find(condition)\` | SelenideElement | First match |
| \`findBy(condition)\` | SelenideElement | Alias for find |
| \`exclude(condition)\` | ElementsCollection | Negation |

\`\`\`java
import static com.codeborne.selenide.Condition.*;

// All visible items
$$(".item").filter(visible).shouldHave(size(5));

// All items with class "active"
$$(".item").filterBy(cssClass("active")).shouldHave(size(2));

// First button with text "Submit"
SelenideElement submit = $$("button").findBy(text("Submit"));
submit.click();

// All non-disabled options
$$(".option").exclude(disabled).shouldHave(size(10));
\`\`\`

---

## Indexing

| Method | Returns |
|---|---|
| \`first()\` | First element |
| \`last()\` | Last element |
| \`get(n)\` | Element at index n |
| \`first(n)\` | First n elements (sub-collection) |
| \`last(n)\` | Last n elements |
| \`from(n)\` | Elements from index n onward |

\`\`\`java
$$("tr.row").first().shouldHave(text("Header"));
$$("tr.row").last().shouldHave(cssClass("highlighted"));
$$("tr.row").get(2).click();
$$("tr.row").first(3).shouldHave(exactTexts("a", "b", "c"));
\`\`\`

---

## Snapshot vs Live

Selenide collections are LIVE by default — they re-evaluate when accessed. To freeze a snapshot:

\`\`\`java
ElementsCollection liveItems = $$(".item");
ElementsCollection snapshot = liveItems.snapshot();

// Now snapshot doesn't change even if DOM updates
\`\`\`

Use snapshots when you want to compare before/after states.

---

## Custom Collection Conditions

\`\`\`java
import com.codeborne.selenide.CollectionCondition;
import com.codeborne.selenide.impl.CollectionSource;
import org.openqa.selenium.WebElement;
import java.util.List;

CollectionCondition allHighlighted = new CollectionCondition() {
    @Override
    public CheckResult check(CollectionSource collection) {
        List<WebElement> elements = collection.getElements();
        for (WebElement e : elements) {
            if (!e.getCssValue("background-color").equals("rgb(255, 255, 0)")) {
                return CheckResult.rejected("Not highlighted", elements);
            }
        }
        return CheckResult.accepted();
    }

    @Override
    public String toString() { return "all highlighted"; }
};

$$(".alert").shouldHave(allHighlighted);
\`\`\`

---

## Iteration Patterns

Avoid manual iteration where possible. When you must:

\`\`\`java
$$(".item").asFixedIterable().forEach(item -> {
    item.shouldBe(visible);
    System.out.println(item.getText());
});
\`\`\`

\`asFixedIterable()\` snapshots the collection so iteration is stable.

---

## Table Patterns

Tables are a classic use case. To find a row by cell content:

\`\`\`java
// Find row whose first cell text equals "Alice"
SelenideElement aliceRow = $$("table.users tr")
    .findBy(text("Alice"));

// Click action in that row
aliceRow.$("button.edit").click();
\`\`\`

To assert column data:

\`\`\`java
$$("table.users td.email")
    .shouldHave(exactTexts("alice@example.com", "bob@example.com", "carol@example.com"));
\`\`\`

---

## Infinite Scroll Patterns

\`\`\`java
ElementsCollection items = $$(".feed-item");

while (items.size() < 50) {
    Selenide.executeJavaScript("window.scrollTo(0, document.body.scrollHeight)");
    items = $$(".feed-item");
    Selenide.sleep(500);
}

items.shouldHave(sizeGreaterThanOrEqual(50));
\`\`\`

---

## Chained Selectors

\`\`\`java
// All buttons inside the first row
$$("tr").first().$$("button").shouldHave(size(3));

// All inputs inside visible cards
$$(".card").filter(visible).first().$$("input").shouldHave(size(4));
\`\`\`

---

## Wait Behavior

Collections retry until \`Configuration.timeout\`. Override per call:

\`\`\`java
$$(".item").shouldHave(size(10), Duration.ofSeconds(15));
\`\`\`

---

## Anti-Patterns

**Anti-pattern 1: \`.size()\` for assertion.** \`size()\` returns immediately:

\`\`\`java
// Bad
assertEquals(5, $$(".item").size());

// Good
$$(".item").shouldHave(size(5));
\`\`\`

**Anti-pattern 2: Looping with \`asDynamicIterable()\`.** Dynamic iteration re-fetches on every step and can loop forever:

\`\`\`java
// Bad
for (SelenideElement item : $$(".item").asDynamicIterable()) {
    item.click(); // collection may change after click
}

// Good
List<SelenideElement> snapshot = $$(".item").asFixedIterable().stream().toList();
snapshot.forEach(SelenideElement::click);
\`\`\`

**Anti-pattern 3: Manual filtering.** Use \`filter\` instead of streams:

\`\`\`java
// Bad
List<WebElement> visible = $$(".item").stream()
    .filter(WebElement::isDisplayed)
    .toList();

// Good
ElementsCollection visible = $$(".item").filter(Condition.visible);
\`\`\`

---

## Reference Card

| Goal | Code |
|---|---|
| Count elements | \`$$.shouldHave(size(N))\` |
| Assert no elements | \`$$.shouldHave(empty)\` |
| Match texts in order | \`$$.shouldHave(exactTexts(...))\` |
| Match texts any order | \`$$.shouldHave(textsInAnyOrder(...))\` |
| Filter by predicate | \`$$.filter(condition)\` |
| Find first match | \`$$.findBy(condition)\` |
| Get specific index | \`$$.get(N)\` |
| Iterate stably | \`$$.asFixedIterable()\` |
| Custom condition | \`new CollectionCondition() { ... }\` |

---

## Conclusion

Selenide's collection API is what makes the library so productive for real browser tests. Master \`shouldHave(size(...))\`, \`shouldHave(exactTexts(...))\`, \`filter\`, and \`findBy\` and you'll write half the test code you write today. For deeper coverage, see our [Selenide Condition cheatsheet](/blog/selenide-condition-cheatsheet-2026) and [Page Object best practices](/blog/selenide-page-object-pattern-best-practices).

Explore the [QA skills directory](/skills) for related browser automation patterns.
`,
};
