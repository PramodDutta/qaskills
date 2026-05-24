import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide Wait Strategies — Explicit and Implicit Waits 2026',
  description:
    'Master Selenide wait strategies. Configuration.timeout, pollingInterval, should-with-timeout, Selenide.Wait(), and avoiding Thread.sleep.',
  date: '2026-05-13',
  category: 'Reference',
  content: `
# Selenide Wait Strategies Explicit and Implicit Waits

Wait handling is where most Selenium-based test suites collapse into flakiness. Implicit waits silently slow every command, explicit \`WebDriverWait\` calls are verbose, and ad-hoc \`Thread.sleep\` litters the codebase. Selenide takes a fundamentally different approach: every \`should\` call is an implicit wait, every action waits for the element to be interactable, and the timeouts are configurable globally and per-call. Understanding Selenide's wait model is the single biggest factor in writing reliable browser tests.

This reference is a comprehensive walkthrough of Selenide's wait strategies in 2026. We cover the global \`Configuration.timeout\`, polling intervals, per-call timeouts, the \`Selenide.Wait()\` escape hatch for non-element conditions, custom condition timeouts, and the anti-patterns that cause flakiness. Every code sample is working Java with Selenide 7+.

---

## Key Takeaways

- **Selenide \`should\` calls wait automatically** — no \`WebDriverWait\` needed
- **Configuration.timeout** is the default wait duration (4000ms)
- **Configuration.pollingInterval** is how often Selenide re-checks (100ms)
- **Per-call timeouts** via \`should(condition, Duration)\`
- **Selenide.Wait()** is the explicit-wait escape hatch for non-element conditions
- **Thread.sleep is an anti-pattern** — there is almost always a better wait

---

## The Selenide Wait Model

Every Selenide assertion is a polling wait:

\`\`\`java
$("#submit").shouldBe(visible);
\`\`\`

Internally, Selenide loops:
1. Try to find \`#submit\` and check if visible
2. If yes, return
3. If no, sleep \`pollingInterval\` (100ms)
4. If total elapsed > \`timeout\` (4000ms), throw \`ElementNotFound\` or \`ElementShould\` error
5. Otherwise loop

This means you almost never need explicit waits. The condition itself is the wait.

---

## Configuration.timeout

The global default. Set in \`@BeforeAll\`:

\`\`\`java
import com.codeborne.selenide.Configuration;

@BeforeAll
static void setup() {
    Configuration.timeout = 10_000; // 10 seconds
}
\`\`\`

Default is 4000ms. Increase for slow apps; decrease for fast tests where 4 seconds is too patient.

---

## Configuration.pollingInterval

How often Selenide re-checks during a wait. Default 100ms:

\`\`\`java
Configuration.pollingInterval = 200; // check every 200ms
\`\`\`

Lower polling = more CPU but faster response. Higher polling = lower CPU but slower response. 100ms is a good balance.

---

## Per-Call Timeout Override

For specific assertions that take longer:

\`\`\`java
$("#slow-result").shouldBe(visible, Duration.ofSeconds(30));
$("#chart").shouldHave(text("Loaded"), Duration.ofMinutes(1));
\`\`\`

Useful for legitimate slow operations (file uploads, complex computations).

---

## Selenide.Wait()

For non-element conditions:

\`\`\`java
import static com.codeborne.selenide.Selenide.Wait;
import org.openqa.selenium.support.ui.ExpectedConditions;

Wait().until(d -> d.getCurrentUrl().contains("/dashboard"));
Wait().until(ExpectedConditions.titleContains("Dashboard"));
\`\`\`

\`Selenide.Wait()\` returns a configured \`SelenideWait\` (a \`FluentWait\`-subclass) with Selenide's timeout and polling interval. Use it for URL changes, page titles, alert presence, and custom conditions that don't map cleanly to element conditions.

---

## Custom Wait Conditions

\`\`\`java
import java.time.Duration;
import com.codeborne.selenide.SelenideElement;

SelenideElement element = $(".result");
Selenide.Wait()
    .withTimeout(Duration.ofSeconds(30))
    .pollingEvery(Duration.ofMillis(500))
    .until(d -> element.getText().matches("^Order \\\\d+ placed$"));
\`\`\`

For a Selenide-style custom Condition:

\`\`\`java
import com.codeborne.selenide.Condition;
import com.codeborne.selenide.CheckResult;

Condition isLoaded = new Condition("loaded") {
    @Override
    public CheckResult check(Driver driver, WebElement element) {
        boolean loaded = "true".equals(element.getAttribute("data-loaded"));
        return new CheckResult(loaded, element.getAttribute("data-loaded"));
    }
};

$(".chart").shouldBe(isLoaded);
\`\`\`

---

## Avoid Thread.sleep

Every \`Thread.sleep\` in test code is a missed wait condition:

\`\`\`java
// Bad
$("#button").click();
Thread.sleep(2000); // hope page loaded?
$(".result").getText();

// Good
$("#button").click();
$(".result").shouldBe(visible);
String text = $(".result").getText();
\`\`\`

Why this matters: sleep wastes time when the page loads fast, and breaks when the page loads slow. Conditions wait exactly as long as needed.

---

## Selenide.sleep

If you genuinely must pause (rare), use Selenide's:

\`\`\`java
Selenide.sleep(500);
\`\`\`

This is identical to Thread.sleep but signals intent — "I know I'm being lazy here." Better than \`Thread.sleep\` for code review purposes.

---

## Element Action Waits

When you call \`click()\`, \`setValue()\`, etc., Selenide waits for the element to be interactable:

\`\`\`java
$("#submit").click(); // waits for visible+enabled+not-covered first
\`\`\`

You rarely need to add \`shouldBe(clickable)\` before — actions auto-check.

---

## Wait Until Page Loads

\`\`\`java
import com.codeborne.selenide.Selenide;

open("/login");
// Selenide auto-waits for document.readyState === 'complete'
\`\`\`

For SPAs that load content dynamically, wait for a specific element:

\`\`\`java
open("/dashboard");
$("#main-content").shouldBe(visible); // wait for SPA to render
\`\`\`

---

## Wait for Element to Disappear

\`\`\`java
$(".loading-spinner").should(disappear);
// or equivalently:
$(".loading-spinner").shouldNot(exist);
\`\`\`

---

## Wait for AJAX

\`\`\`java
// Wait for jQuery, if used
Selenide.Wait().until(d ->
    (Boolean) ((JavascriptExecutor) d).executeScript("return jQuery.active === 0")
);
\`\`\`

For Fetch / XHR without jQuery:

\`\`\`java
Selenide.Wait().until(d -> {
    Object pending = ((JavascriptExecutor) d).executeScript(
        "return window.performance.getEntriesByType('resource').filter(r => !r.responseEnd).length"
    );
    return ((Long) pending) == 0L;
});
\`\`\`

In practice, you should wait for the visible result of the AJAX call, not for AJAX completion itself.

---

## Timeout Hierarchy

| Level | Method | Use |
|---|---|---|
| Global | \`Configuration.timeout\` | Default for entire test suite |
| Per test | Set in @BeforeEach | Override for specific tests |
| Per call | \`should(cond, Duration)\` | Override one assertion |
| Per Selenide.Wait | \`.withTimeout(Duration)\` | Custom wait conditions |

---

## Reference Card

| Goal | Selenide |
|---|---|
| Wait for visible | \`$.shouldBe(visible)\` |
| Wait for invisible | \`$.shouldNot(exist)\` or \`$.should(disappear)\` |
| Wait for text | \`$.shouldHave(text("..."))\` |
| Wait with longer timeout | \`$.shouldBe(visible, Duration.ofSeconds(30))\` |
| Wait for URL | \`Wait().until(d -> d.getCurrentUrl().contains("/x"))\` |
| Wait for title | \`Wait().until(titleContains("..."))\` |
| Pause (rare) | \`Selenide.sleep(500)\` |
| Set global timeout | \`Configuration.timeout = 10_000\` |

---

## Anti-Patterns

**Anti-pattern 1: Thread.sleep.** Almost always wrong. Use conditions.

**Anti-pattern 2: \`if (element.isDisplayed())\`.** \`isDisplayed()\` returns immediately. Use \`is(visible)\` if you genuinely want a non-waiting check.

**Anti-pattern 3: Implicit wait via WebDriver.** Don't set Selenium implicit waits — they conflict with Selenide's explicit polling.

**Anti-pattern 4: Long global timeouts.** \`Configuration.timeout = 60_000\` hides flakiness. Keep it at 4-10 seconds and let failing tests fail fast.

**Anti-pattern 5: Try/catch around should.** Catching the exception defeats the purpose. If you need conditional logic, use \`is()\`.

---

## Debugging Slow Tests

If a test always hits timeout, investigate:

1. Is the locator correct? Try in browser DevTools.
2. Is the page genuinely slow? Check network panel.
3. Is the element behind another element? Check CSS z-index and \`pointer-events\`.
4. Is the timing dependent on animation? Disable CSS animations in test mode.

---

## Conclusion

Selenide's wait model is one of its most powerful features. Every \`should\` call is an explicit wait disguised as an assertion. Pair with \`Configuration.timeout\`, occasional per-call overrides, and \`Selenide.Wait()\` for non-element conditions, and you'll write tests that are both readable and reliable. Never use \`Thread.sleep\`.

For complementary patterns, see our [Selenide Condition cheatsheet](/blog/selenide-condition-cheatsheet-2026) and [Selenide vs Selenium guide](/blog/selenide-vs-selenium-webdriver-2026).

Browse the [QA skills directory](/skills) for related browser automation patterns.
`,
};
