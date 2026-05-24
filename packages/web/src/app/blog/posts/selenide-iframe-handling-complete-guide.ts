import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide iframe Handling — Complete Guide 2026',
  description:
    'Master Selenide iframe testing. switchTo().frame(), inFrame, multiple iframes, nested iframes, parent frame switching, and best practices.',
  date: '2026-05-14',
  category: 'Guide',
  content: `
# Selenide iframe Handling Complete Guide

Despite the modern web's preference for shadow DOM and embedded components, iframes are still everywhere in 2026. Stripe Elements, Recaptcha, Google Maps embeds, YouTube players, CMS rich text editors, and many enterprise SSO flows all use iframes. The challenge: Selenium's switchTo().frame() pattern is verbose and error-prone, and forgetting to switch back leaves your test in an unexpected context. Selenide simplifies iframe testing with a fluent \`switchTo().frame()\` API, automatic timeout-aware waits, and clear parent-frame switching.

This guide is a comprehensive walkthrough of testing iframes with Selenide in 2026. We cover frame switching by index, name, ID, and WebElement, nested iframes, switching back to parent, common patterns for Stripe Elements and Recaptcha, and the pitfalls that catch teams new to iframe testing. Every code sample is working Java with Selenide 7+ and JUnit 5.

---

## Key Takeaways

- **switchTo().frame(...)** changes the WebDriver focus into an iframe
- **switchTo().defaultContent()** returns to the top-level document
- **switchTo().parentFrame()** returns one level up
- **Always switch back** after iframe work to avoid context leakage
- **Selenide waits** for the frame to be available before switching
- **Nested iframes** require multiple switch calls

---

## Switching to an iframe

\`\`\`java
import static com.codeborne.selenide.Selenide.*;

@Test
void interactsWithIframe() {
    open("/page-with-iframe");

    // Switch into iframe by ID
    switchTo().frame("payment-iframe");

    // Now CSS selectors target inside the iframe
    $("#card-number").setValue("4242 4242 4242 4242");
    $("#expiry").setValue("12/30");
    $("#cvc").setValue("123");

    // Switch back to top-level page
    switchTo().defaultContent();

    // Now we're back outside the iframe
    $("#submit").click();
}
\`\`\`

---

## Frame Switching Methods

| Method | Use |
|---|---|
| \`switchTo().frame(index)\` | By index (0-based) |
| \`switchTo().frame("name")\` | By frame name attribute |
| \`switchTo().frame(element)\` | By Selenide/WebElement reference |
| \`switchTo().defaultContent()\` | Return to top-level page |
| \`switchTo().parentFrame()\` | Return one level up |

---

## Switching by Element

For iframes with complex selectors:

\`\`\`java
SelenideElement iframe = $("iframe[title='Stripe payment']");
switchTo().frame(iframe);
$("input.card-number").setValue("4242 4242 4242 4242");
switchTo().defaultContent();
\`\`\`

This is the most reliable approach when iframes don't have stable IDs or names.

---

## Nested iframes

Real-world iframes are often nested. Example: a CMS page with an iframe containing another iframe:

\`\`\`java
@Test
void nestedIframes() {
    open("/cms-editor");

    switchTo().frame("editor-frame");        // outer
    switchTo().frame("toolbar-frame");        // inner

    $("#bold-button").click();

    switchTo().defaultContent(); // back to top
}
\`\`\`

Or step back one level at a time:

\`\`\`java
switchTo().frame("editor-frame");
switchTo().frame("toolbar-frame");
$("#bold").click();
switchTo().parentFrame(); // back to editor-frame
$(".editor-content").click();
switchTo().defaultContent();
\`\`\`

---

## Wait for iframe to Appear

Selenide's frame switching waits for the iframe to be present:

\`\`\`java
switchTo().frame("dynamic-iframe"); // waits up to Configuration.timeout
\`\`\`

For finer control:

\`\`\`java
$("iframe#payment").shouldBe(visible);
switchTo().frame($("iframe#payment"));
\`\`\`

---

## Stripe Elements Pattern

Stripe Elements creates iframes for each field. Sample test:

\`\`\`java
@Test
void completesStripeCheckout() {
    open("/checkout");
    $("#email").setValue("alice@example.com");

    // Card number iframe
    switchTo().frame($("iframe[name^='__privateStripeFrame']"));
    $("input[name='cardnumber']").setValue("4242 4242 4242 4242");
    switchTo().defaultContent();

    // Expiry iframe (same name pattern but next iframe)
    switchTo().frame($$("iframe[name^='__privateStripeFrame']").get(1));
    $("input[name='exp-date']").setValue("12/30");
    switchTo().defaultContent();

    // CVC
    switchTo().frame($$("iframe[name^='__privateStripeFrame']").get(2));
    $("input[name='cvc']").setValue("123");
    switchTo().defaultContent();

    $("#pay").click();
    $(".success").shouldBe(visible);
}
\`\`\`

For Stripe Payment Element (single iframe), the approach is simpler.

---

## Recaptcha v2 Pattern

Recaptcha shows a checkbox in an iframe. To click it in tests, use a test key that bypasses the challenge, or interact via the iframe:

\`\`\`java
switchTo().frame($("iframe[title='reCAPTCHA']"));
$("#recaptcha-anchor").click();
switchTo().defaultContent();
\`\`\`

For production, set Recaptcha's test key (\`6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI\`) in test environments to bypass the challenge.

---

## YouTube Embed Pattern

\`\`\`java
@Test
void videoEmbedLoads() {
    open("/blog/post-with-video");

    SelenideElement video = $("iframe[src*='youtube.com']");
    switchTo().frame(video);

    $(".html5-video-player").shouldBe(visible);

    switchTo().defaultContent();
}
\`\`\`

---

## Helper Method: \`inFrame\`

To avoid forgetting to switch back, wrap iframe work in a helper:

\`\`\`java
public static <T> T inFrame(SelenideElement iframe, java.util.function.Supplier<T> body) {
    switchTo().frame(iframe);
    try {
        return body.get();
    } finally {
        switchTo().defaultContent();
    }
}

public static void inFrame(SelenideElement iframe, Runnable body) {
    switchTo().frame(iframe);
    try {
        body.run();
    } finally {
        switchTo().defaultContent();
    }
}
\`\`\`

Usage:

\`\`\`java
inFrame($("iframe.payment"), () -> {
    $("#card-number").setValue("4242 4242 4242 4242");
    $("#expiry").setValue("12/30");
});
// Automatically back to top
\`\`\`

This pattern prevents the most common iframe bug: forgetting to switch back.

---

## Detecting Current Frame

\`\`\`java
String currentFrame = executeJavaScript("return window.name");
String url = executeJavaScript("return window.location.href");
\`\`\`

Useful for debugging.

---

## CSP and X-Frame-Options

If the iframe URL has \`X-Frame-Options: DENY\` or restrictive CSP, the iframe loads but is empty from your test's perspective. Verify the iframe URL is accessible:

\`\`\`java
switchTo().frame("payment");
String url = executeJavaScript("return window.location.href");
assertNotEquals("about:blank", url);
\`\`\`

---

## Cross-Origin iframes

Cross-origin iframes can be switched into and interacted with — that's the user's perspective. But certain JS commands (executeScript from outside) may be blocked. Stick with normal Selenide selectors inside the frame.

---

## Page Object Pattern with iframes

Encapsulate iframe management:

\`\`\`java
public class StripePaymentForm {
    private final SelenideElement iframe = $("iframe.stripe-payment");

    public StripePaymentForm fillCard(String number) {
        switchTo().frame(iframe);
        try {
            $("#card-number").setValue(number);
        } finally {
            switchTo().defaultContent();
        }
        return this;
    }
}

// Usage:
new StripePaymentForm()
    .fillCard("4242 4242 4242 4242")
    .fillExpiry("12/30")
    .fillCvc("123");
\`\`\`

Tests never see the iframe boilerplate.

---

## Common Pitfalls

**Pitfall 1: Forgetting to switch back.** After interacting with the iframe, subsequent selectors fail because the WebDriver is still inside the iframe. Use \`inFrame\` helper.

**Pitfall 2: Switching before iframe loads.** Use \`shouldBe(visible)\` on the iframe element before switching.

**Pitfall 3: Stale frame reference.** If the page reloads, you need to switch into the iframe again.

**Pitfall 4: Index-based switching.** Iframe order can change. Prefer ID, name, or element-based switching.

**Pitfall 5: Nested iframe confusion.** Keep track of which level you're at; use defaultContent often to reset.

---

## Reference Card

| Action | Code |
|---|---|
| Switch by ID | \`switchTo().frame("id")\` |
| Switch by name | \`switchTo().frame("name")\` |
| Switch by element | \`switchTo().frame(element)\` |
| Switch by index | \`switchTo().frame(0)\` |
| Back to top | \`switchTo().defaultContent()\` |
| Up one level | \`switchTo().parentFrame()\` |

---

## Conclusion

Iframe testing in Selenide is straightforward once you internalize the switch-and-switch-back pattern. Use element-based switching for stability, wrap iframe work in a helper to avoid forgetting to switch back, and encapsulate iframe logic in Page Objects. Stripe, Recaptcha, YouTube, and Google Maps all become testable with these patterns.

For complementary patterns, see our [Shadow DOM guide](/blog/selenide-shadow-dom-elements-guide) and [Page Object best practices](/blog/selenide-page-object-pattern-best-practices).

Browse the [QA skills directory](/skills) for related browser automation patterns.
`,
};
