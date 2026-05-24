import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide Shadow DOM Elements — Complete Guide 2026',
  description:
    'Master Selenide shadow DOM testing. shadowCss, shadowDeep, web components, custom elements, and patterns for Material, Lit, and Stencil.',
  date: '2026-05-13',
  category: 'Guide',
  content: `
# Selenide Shadow DOM Elements Complete Guide

Web Components and Shadow DOM are now mainstream in 2026. Material Web, Lit, Stencil, FAST, and countless framework-agnostic component libraries use Shadow DOM to encapsulate styles and DOM structure. The challenge for testing: standard CSS selectors stop at shadow boundaries. \`$(".btn")\` from outside a shadow root cannot reach elements inside it. Selenide solves this with \`shadowCss()\` and \`shadowDeep()\` methods that pierce shadow boundaries cleanly.

This guide is a comprehensive walkthrough of testing Shadow DOM with Selenide in 2026. We cover the \`shadowCss\` method, deep shadow traversal, patterns for Material Web Components, Lit applications, Stencil component libraries, and shadow-aware Page Objects. Every code sample is working Java with Selenide 7+ and JUnit 5.

---

## Key Takeaways

- **shadowCss(selector)** finds elements inside the shadow root of the target element
- **Nested shadow roots** are reached by chaining \`shadowCss\` calls
- **shadowDeep** uses CSS \`::part()\` style traversal for complex hierarchies
- **Web Components selectors** target the custom element tag, then shadow contents
- **CSS pseudo-classes** like \`::part\` and \`::slotted\` are testable via shadow-aware locators

---

## What is Shadow DOM

Shadow DOM lets a custom element have its own encapsulated DOM tree. From outside:

\`\`\`html
<my-button>
  #shadow-root (open)
    <button class="internal-btn">
      <slot>Click me</slot>
    </button>
</my-button>
\`\`\`

Standard \`document.querySelector(".internal-btn")\` returns null — the selector can't cross the shadow boundary.

---

## Selenide's shadowCss Method

\`\`\`java
import static com.codeborne.selenide.Selenide.$;

// Find the inner button inside <my-button>
$("my-button").shadowCss(".internal-btn").click();
\`\`\`

\`shadowCss\` takes a CSS selector and resolves it inside the shadow root of the parent element.

---

## Chaining Shadow Lookups

For nested custom elements:

\`\`\`html
<my-form>
  #shadow-root
    <my-input>
      #shadow-root
        <input class="field" />
\`\`\`

\`\`\`java
$("my-form")
    .shadowCss("my-input")
    .shadowCss(".field")
    .setValue("hello");
\`\`\`

Each \`shadowCss\` pierces one layer.

---

## Material Web Components Example

Material Web 2.x uses Shadow DOM extensively:

\`\`\`html
<md-filled-button>
  #shadow-root
    <button class="md3-button">Submit</button>
</md-filled-button>
\`\`\`

\`\`\`java
@Test
void clicksMaterialButton() {
    open("/form");
    $("md-filled-button[type=submit]").click();
    // Selenide's click works on the custom element host —
    // the click bubbles through the shadow root.
    $(".success-banner").shouldBe(visible);
}
\`\`\`

For interacting with internals (e.g., asserting button text):

\`\`\`java
$("md-filled-button[type=submit]")
    .shadowCss("button")
    .shouldHave(text("Submit"));
\`\`\`

---

## Lit Component Example

Lit defines custom elements with shadow roots:

\`\`\`javascript
class TodoItem extends LitElement {
  render() {
    return html\`
      <div class="item">
        <span class="title">\${this.title}</span>
        <button class="delete">Delete</button>
      </div>
    \`;
  }
}
\`\`\`

Testing:

\`\`\`java
@Test
void deletesTodoItem() {
    open("/todos");

    // Find a todo by title
    SelenideElement todo = $$("todo-item")
        .findBy(Condition.attribute("title", "Buy milk"));

    // Click delete inside shadow
    todo.shadowCss(".delete").click();

    // Assert it's gone
    todo.shouldNot(exist);
}
\`\`\`

---

## Stencil Components

Stencil's auto-generated custom elements work the same way:

\`\`\`html
<my-card>
  #shadow-root
    <div class="card-header">Title</div>
    <div class="card-body">
      <slot></slot>
    </div>
</my-card>
\`\`\`

\`\`\`java
$("my-card").shadowCss(".card-header").shouldHave(text("Title"));
\`\`\`

---

## Slot Content

Slotted content (passed from outside) lives in the light DOM, not the shadow DOM:

\`\`\`html
<my-card>
  <p class="content">Hello</p>  <!-- light DOM, slotted -->
</my-card>
\`\`\`

You access it normally:

\`\`\`java
$("my-card .content").shouldHave(text("Hello"));
\`\`\`

But if you need the slot's effective parent (the shadow internal that renders the slot):

\`\`\`java
$("my-card").shadowCss("slot").shouldBe(visible);
\`\`\`

---

## Closed Shadow Roots

If a component uses \`{ mode: 'closed' }\`, Selenide cannot access the shadow DOM:

\`\`\`javascript
this.attachShadow({ mode: 'closed' }); // inaccessible
\`\`\`

In this case:
1. Ask the developer to use \`mode: 'open'\` (the default)
2. Or test only the host element's behavior, not its internals

---

## Page Object Pattern with Shadow DOM

\`\`\`java
public class MaterialButton {
    private final SelenideElement host;

    public MaterialButton(String selector) {
        this.host = $(selector);
    }

    public MaterialButton shouldShowText(String text) {
        host.shadowCss("button").shouldHave(text(text));
        return this;
    }

    public void click() {
        host.click();
    }
}

// Usage:
new MaterialButton("md-filled-button[type=submit]")
    .shouldShowText("Submit")
    .click();
\`\`\`

---

## Multiple Elements Inside Shadow

To find a collection inside a shadow:

\`\`\`java
ElementsCollection items = $("my-list").shadowCss("li");
items.shouldHave(size(3));
\`\`\`

---

## Wait Behavior

Shadow DOM lookups participate in Selenide's normal retry-until-timeout loop:

\`\`\`java
$("my-toast").shadowCss(".message").shouldHave(text("Saved"));
// waits up to Configuration.timeout
\`\`\`

---

## CSS Pseudo-Classes in Shadow

Some components expose internal parts via the \`::part()\` selector:

\`\`\`html
<my-button part="button"></my-button>
\`\`\`

You can target with:

\`\`\`java
$("my-button").shadowCss("[part=button]").click();
\`\`\`

---

## Common Pitfalls

**Pitfall 1: Assuming standard CSS works.** \`$("my-button .internal-btn")\` returns nothing if \`.internal-btn\` is in shadow.

**Pitfall 2: Closed shadow roots.** Some libraries (Salesforce LWC) use closed shadow. Not testable from JS.

**Pitfall 3: Stale shadow references.** If the host element is re-rendered, the shadow tree may be different. Re-query rather than caching.

**Pitfall 4: Shadow in iframes.** Each layer needs separate handling. See our [iframe handling guide](/blog/selenide-iframe-handling-complete-guide).

**Pitfall 5: Mixing slotted and shadow content.** Slotted children are in light DOM. Shadow internals are not. Use the right strategy.

---

## Testing Custom Events

Custom elements often dispatch events you want to verify:

\`\`\`java
import static com.codeborne.selenide.Selenide.executeJavaScript;

@Test
void firesChangeEvent() {
    open("/form");

    // Set up listener
    executeJavaScript("""
        window.__changeEvents = [];
        document.querySelector('my-input').addEventListener('change',
            e => window.__changeEvents.push(e.detail));
    """);

    $("my-input").shadowCss("input").setValue("hello");

    Long count = executeJavaScript("return window.__changeEvents.length");
    assertEquals(1L, count);
}
\`\`\`

---

## Patterns Summary

| Goal | Approach |
|---|---|
| Click a custom element | \`$.click()\` directly on host |
| Read internal state | \`$.shadowCss(...).getText()\` |
| Set internal input | \`$.shadowCss("input").setValue(...)\` |
| Walk nested shadow | Chain \`.shadowCss()\` calls |
| Multiple internal items | \`$.shadowCss("...").shouldHave(size(N))\` |
| Slotted content | Standard \`$(".content")\` |

---

## Conclusion

Shadow DOM is the new norm for Web Components in 2026, and Selenide's \`shadowCss\` makes testing them feel like normal CSS selectors. Master the chaining pattern for nested shadows, build Page Object methods that hide the shadow complexity, and accept that closed shadow roots remain a hard boundary.

For complementary patterns, see our [iframe handling guide](/blog/selenide-iframe-handling-complete-guide) and [Page Object best practices](/blog/selenide-page-object-pattern-best-practices).

Browse the [QA skills directory](/skills) for related browser automation patterns.
`,
};
