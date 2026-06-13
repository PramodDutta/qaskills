import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium 4 Relative Locators -- The Complete 2026 Guide',
  description:
    'Master Selenium 4 relative locators with real Java and Python code: above, below, toLeftOf, toRightOf, near, chaining, limitations, and friendly locators.',
  date: '2026-06-13',
  category: 'Guide',
  content: `
# Selenium 4 Relative Locators: The Complete Guide for Java and Python

Selenium 4 introduced one of the most talked-about features in the WebDriver ecosystem: **relative locators**, originally announced as "friendly locators." Instead of writing a brittle XPath or a deeply nested CSS selector to find an element, you describe where the element sits **relative to another element you already know** -- above it, below it, to the left of it, to the right of it, or simply near it. This mirrors how a human reads a page. You do not think "the input is the third div under the fourth section"; you think "the password field is below the username field."

Relative locators are built on top of the W3C WebDriver standard and rely on the browser's own \`getBoundingClientRect()\` geometry to figure out spatial relationships. That makes them powerful for forms, grids, toolbars, and any layout where elements have an obvious visual arrangement but messy, auto-generated DOM attributes. They are not a silver bullet -- they break in predictable ways when layouts shift, when elements overlap, or when the rendered position does not match what you expect -- but used correctly they dramatically reduce locator maintenance.

This guide is a complete, practical reference. We cover every relative locator method (\`above\`, \`below\`, \`toLeftOf\`, \`toRightOf\`, and \`near\`) with **runnable code in both Java and Python** for Selenium 4.x, show how to chain multiple relative locators together, explain the geometry that determines which element wins, document the real-world limitations and failure modes, and finish with a decision framework for when to reach for a relative locator versus a classic CSS or XPath selector. If you are evaluating modern automation approaches, you may also want to compare options on our [QA skills directory](/skills).

## What Are Relative Locators in Selenium 4?

A relative locator is created with the static factory \`RelativeLocator.with(By...)\` in Java (\`locate_with(By, value)\` in Python). You start from a known \`By\` strategy -- a tag name, a CSS selector, an ID -- and then chain a spatial modifier that anchors the search to a reference element. The reference can be passed either as a \`By\` or as an already-located \`WebElement\`.

Under the hood, Selenium injects a JavaScript helper into the page. It collects all candidate elements matching the base locator, reads each candidate's bounding rectangle, reads the anchor's bounding rectangle, and filters and sorts candidates by their geometric relationship. The first matching element (the closest one in the requested direction) is returned. This is why relative locators are sometimes slower than a direct CSS selector: there is a DOM scan plus a geometry computation on every call.

The five spatial relationships map to intuitive directions on screen. \`above\` and \`below\` compare vertical position; \`toLeftOf\` and \`toRightOf\` compare horizontal position; \`near\` returns elements within a pixel radius (default 50px) regardless of direction.

## The Five Relative Locator Methods

Here is the canonical reference table for every relative locator method, what geometry it uses, and the typical use case.

| Method | Direction | Geometry rule | Typical use case |
|---|---|---|---|
| \`above(anchor)\` | Element sitting above the anchor | Candidate's bottom edge is higher than anchor's top edge | Label above an input, header above a row |
| \`below(anchor)\` | Element sitting below the anchor | Candidate's top edge is lower than anchor's bottom edge | Input below a label, row below a header |
| \`toLeftOf(anchor)\` | Element to the left of the anchor | Candidate's right edge is left of anchor's left edge | Cancel button left of Submit |
| \`toRightOf(anchor)\` | Element to the right of the anchor | Candidate's left edge is right of anchor's right edge | Delete icon right of a list item |
| \`near(anchor)\` | Element within ~50px of the anchor | Candidate is within the radius in any direction | Tooltip near a field, error near an input |
| \`near(anchor, atMostDistanceInPixels)\` | Within a custom radius | Candidate within the supplied pixel distance | Tighter or looser proximity matching |

A key subtlety: when multiple candidates satisfy the direction, Selenium returns the **nearest** one. "Above" does not mean "anywhere above on the page" in practice -- the algorithm picks the closest element in that direction, which is almost always what you want.

## Setting Up Selenium 4 for Relative Locators

Relative locators require Selenium 4.0 or later. Selenium Manager (bundled since 4.6) handles driver downloads automatically, so you no longer need to manually manage ChromeDriver. For a deeper look at automatic driver management, see our [Selenium Manager driver management guide](/blog/selenium-manager-4-6-driver-management-2026-guide).

For **Java** with Maven, add the dependency:

\`\`\`xml
<dependency>
  <groupId>org.seleniumhq.selenium</groupId>
  <artifactId>selenium-java</artifactId>
  <version>4.27.0</version>
</dependency>
\`\`\`

For **Python**, install with pip:

\`\`\`python
pip install "selenium>=4.27.0"
\`\`\`

The static import you need in Java is \`org.openqa.selenium.support.locators.RelativeLocator\`, and in Python the helper is \`selenium.webdriver.support.relative_locator.locate_with\`.

## Relative Locators in Java -- Full Working Example

Consider a registration form with three stacked inputs: Email, Password, and Confirm Password. The DOM has unhelpful auto-generated IDs, but the visual layout is obvious. We anchor on the Password input (which has a stable label) and locate the inputs above and below it.

\`\`\`java
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;

import static org.openqa.selenium.support.locators.RelativeLocator.with;

public class RelativeLocatorJavaDemo {

    public static void main(String[] args) {
        WebDriver driver = new ChromeDriver();
        try {
            driver.get("https://example.com/register");

            // The Password field is our stable anchor.
            By passwordField = By.cssSelector("input[type='password'][name='password']");

            // Email input sits ABOVE the password field.
            WebElement emailInput = driver.findElement(
                with(By.tagName("input")).above(passwordField));
            emailInput.sendKeys("qa@qaskills.sh");

            // Confirm-password input sits BELOW the password field.
            WebElement confirmInput = driver.findElement(
                with(By.tagName("input")).below(passwordField));
            confirmInput.sendKeys("S3cretPass!");

            // The Submit button is BELOW the confirm input and to the RIGHT of Cancel.
            WebElement submit = driver.findElement(
                with(By.tagName("button"))
                    .below(confirmInput)
                    .toRightOf(By.cssSelector("button.cancel")));
            submit.click();

        } finally {
            driver.quit();
        }
    }
}
\`\`\`

Notice how \`with(By.tagName("input"))\` narrows the candidate pool to inputs only, then \`.above()\` and \`.below()\` apply the geometric filter. Passing a \`By\` as the anchor lets Selenium resolve the anchor lazily, which is convenient, but passing a \`WebElement\` (as we did with \`confirmInput\`) is faster because the anchor is already in memory.

## Relative Locators in Python -- Full Working Example

The same scenario in Python uses \`locate_with\`. The fluent chain reads almost identically.

\`\`\`python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.relative_locator import locate_with

driver = webdriver.Chrome()
try:
    driver.get("https://example.com/register")

    # The Password field is our stable anchor.
    password_field = (By.CSS_SELECTOR, "input[type='password'][name='password']")

    # Email input sits ABOVE the password field.
    email_input = driver.find_element(
        locate_with(By.TAG_NAME, "input").above(
            {By.CSS_SELECTOR: "input[type='password'][name='password']"}))
    email_input.send_keys("qa@qaskills.sh")

    # Confirm-password input sits BELOW the password field.
    confirm_input = driver.find_element(
        locate_with(By.TAG_NAME, "input").below(
            {By.CSS_SELECTOR: "input[type='password'][name='password']"}))
    confirm_input.send_keys("S3cretPass!")

    # Submit button: BELOW the confirm input AND to the RIGHT of Cancel.
    submit = driver.find_element(
        locate_with(By.TAG_NAME, "button")
        .below(confirm_input)
        .to_right_of({By.CSS_SELECTOR: "button.cancel"}))
    submit.click()
finally:
    driver.quit()
\`\`\`

There are two anchor styles in Python. You can pass a dictionary like \`{By.CSS_SELECTOR: "..."}\` to let Selenium resolve the anchor, or you can pass a previously located \`WebElement\` (as with \`confirm_input\`). Both work; the dictionary form is unique to the Python binding and is the closest equivalent to passing a \`By\` in Java.

## Chaining Multiple Relative Locators

The real power emerges when you chain modifiers. Each additional method **narrows** the candidate set further -- the relationships combine with AND logic. An element must satisfy every condition to be returned.

Consider a data grid where you want the "Edit" icon that is on the same row as a specific username. The username cell is your anchor; the Edit icon is to the right of it and roughly at the same vertical position.

\`\`\`java
WebElement usernameCell = driver.findElement(By.xpath("//td[text()='jdoe']"));

WebElement editIcon = driver.findElement(
    with(By.cssSelector("button[aria-label='Edit']"))
        .toRightOf(usernameCell)
        .near(usernameCell, 200));
editIcon.click();
\`\`\`

\`\`\`python
username_cell = driver.find_element(By.XPATH, "//td[text()='jdoe']")

edit_icon = driver.find_element(
    locate_with(By.CSS_SELECTOR, "button[aria-label='Edit']")
    .to_right_of(username_cell)
    .near(username_cell, 200))
edit_icon.click()
\`\`\`

Combining \`toRightOf\` with a constrained \`near\` is a common pattern for grids: \`toRightOf\` ensures you stay on the correct side, and \`near\` with a pixel cap ensures you stay on the same row rather than jumping to a row above or below. Without the \`near\` constraint, \`toRightOf\` alone could match an Edit icon several rows away if no closer candidate exists.

## How the Geometry Algorithm Picks a Winner

Understanding the underlying algorithm prevents surprises. Here is the comparison of how each direction is computed relative to the anchor's bounding box.

| Relationship | Compared edges | "Closest" tiebreaker |
|---|---|---|
| above | candidate.bottom vs anchor.top | smallest vertical gap above |
| below | candidate.top vs anchor.bottom | smallest vertical gap below |
| toLeftOf | candidate.right vs anchor.left | smallest horizontal gap to the left |
| toRightOf | candidate.left vs anchor.right | smallest horizontal gap to the right |
| near | distance between bounding boxes | smallest Euclidean distance within radius |

The algorithm uses \`Math.hypot\` style distance for \`near\` and simple axis comparisons for the directional methods. Crucially, the comparison is done in the **viewport coordinate space** at the moment the locator runs. If the element is off-screen, or if the page has not finished laying out (fonts loading, images shifting content), the rectangles can be wrong and you will match the wrong element. This is the root cause of most relative-locator flakiness.

## Limitations: When Relative Locators Break

Relative locators are convenient but fragile in specific situations. Knowing these failure modes is the difference between a maintainable suite and a flaky one.

- **Layout shift (CLS):** If content loads asynchronously and pushes elements around after the locator resolves, the geometry no longer matches. Always wait for the page to be stable before using relative locators.
- **Overlapping or zero-size elements:** Elements with \`display:none\`, zero width/height, or that are visually behind others have unreliable bounding boxes. Selenium may match a hidden element that happens to satisfy the geometry.
- **Responsive breakpoints:** A locator that says "Cancel is to the left of Submit" works on desktop but fails on mobile where the buttons stack vertically. Relative locators encode visual assumptions that change with viewport size.
- **Scrolling and virtualization:** In virtualized lists (only rendered rows exist in the DOM), the anchor and target may not both be rendered, so the relationship cannot be evaluated.
- **Diagonal layouts:** \`near\` is direction-agnostic and can grab an element you did not intend if several candidates fall within the radius.

When relative locators repeatedly break, that is a signal to fall back to a stable attribute selector.

## Combining Relative Locators with CSS and XPath

The best practice is to **anchor on something stable** (a \`data-testid\`, an ARIA label, visible text) and use the relative locator only for the hard-to-target element. You are mixing strategies on purpose: a robust CSS or XPath anchor plus a geometric hop.

\`\`\`java
// Stable anchor via data-testid, then geometric hop to the unlabeled input.
By anchor = By.cssSelector("[data-testid='shipping-label']");

WebElement zipInput = driver.findElement(
    with(By.cssSelector("input.form-control")).below(anchor));
zipInput.sendKeys("560001");
\`\`\`

\`\`\`python
# Stable anchor via data-testid, then geometric hop to the unlabeled input.
anchor = {By.CSS_SELECTOR: "[data-testid='shipping-label']"}

zip_input = driver.find_element(
    locate_with(By.CSS_SELECTOR, "input.form-control").below(anchor))
zip_input.send_keys("560001")
\`\`\`

This pattern keeps the brittle part (geometry) as small as possible. If the form is later refactored, only the single relative hop needs revisiting, and the stable anchor stays put.

## Relative Locators vs Classic Locators: Decision Table

| Scenario | Recommended approach | Why |
|---|---|---|
| Element has a stable ID or data-testid | CSS / By.id | Fastest, most robust, no geometry needed |
| Unlabeled input next to a stable label | Relative locator (below/toRightOf) | Anchor on the label, hop to the input |
| Icon button in a data grid row | Relative locator (toRightOf + near) | Spatial relationship is the only reliable cue |
| Deeply nested element with stable text | XPath with text() | Text matching is more precise than geometry |
| Responsive layout that reflows | CSS with media-aware testids | Geometry assumptions break across breakpoints |
| Tooltip or popover near a trigger | Relative locator (near) | Proximity is the natural relationship |

A good rule of thumb: prefer a stable attribute selector first, reach for a relative locator when no stable attribute exists but a clear visual relationship does, and use XPath text matching when the element's visible text is its most reliable identifier.

## Performance Considerations

Because relative locators run a DOM scan plus a geometry pass in injected JavaScript, they are measurably slower than a direct CSS selector for large pages. On a page with thousands of candidate elements, narrowing the base locator (\`with(By.cssSelector("input.form-control"))\` instead of \`with(By.tagName("input"))\`) significantly reduces the candidate pool and speeds up resolution. Always make the base locator as specific as the geometry allows.

If you are running large suites in parallel, the per-call overhead adds up. Profile your slowest tests and replace any relative locators on hot paths with stable selectors where possible. For teams comparing modern engines, our [Selenium vs Playwright comparison](/blog/selenium-vs-playwright-2026) covers how each tool approaches element location and auto-waiting.

## Debugging Relative Locators

When a relative locator matches the wrong element, the fastest debugging technique is to dump the bounding boxes of your anchor and candidate elements. In Java you can execute JavaScript to read \`getBoundingClientRect()\`:

\`\`\`java
import org.openqa.selenium.JavascriptExecutor;

JavascriptExecutor js = (JavascriptExecutor) driver;
Object rect = js.executeScript(
    "return arguments[0].getBoundingClientRect();", someElement);
System.out.println("Anchor rect: " + rect);
\`\`\`

\`\`\`python
rect = driver.execute_script(
    "return arguments[0].getBoundingClientRect();", some_element)
print("Anchor rect:", rect)
\`\`\`

Comparing the actual rectangles against your mental model of the layout almost always reveals the problem: the anchor was off-screen, the target had not rendered yet, or two candidates were closer together than you assumed. For lower-level inspection of the browser, the new BiDi protocol is worth knowing -- see our [Selenium WebDriver BiDi reference](/blog/selenium-webdriver-bidi-2026-official-reference).

## Real-World Pattern: Validating a Pricing Table

A pricing table is a textbook case where relative locators earn their keep. The plan names are headers in a row, and each feature row has a checkmark or value in the column under each plan. The columns rarely have stable per-cell identifiers, but the relationship "the cell under the Pro header and in the Storage row" is visually unambiguous. We anchor on the column header and the row label, then intersect them.

\`\`\`java
// Anchor 1: the column header for the "Pro" plan.
By proHeader = By.xpath("//th[normalize-space()='Pro']");
// Anchor 2: the row label cell for "Storage".
WebElement storageRow = driver.findElement(
    By.xpath("//td[normalize-space()='Storage']"));

// The target cell is BELOW the Pro header AND to the RIGHT of the Storage label.
WebElement proStorageCell = driver.findElement(
    with(By.tagName("td"))
        .below(proHeader)
        .toRightOf(storageRow));

String value = proStorageCell.getText();
System.out.println("Pro plan storage: " + value);
\`\`\`

\`\`\`python
# Anchor 1: the column header for the "Pro" plan.
pro_header = {By.XPATH: "//th[normalize-space()='Pro']"}
# Anchor 2: the row label cell for "Storage".
storage_row = driver.find_element(By.XPATH, "//td[normalize-space()='Storage']")

# Target cell: BELOW the Pro header AND to the RIGHT of the Storage label.
pro_storage_cell = driver.find_element(
    locate_with(By.TAG_NAME, "td")
    .below(pro_header)
    .to_right_of(storage_row))

print("Pro plan storage:", pro_storage_cell.text)
\`\`\`

This "intersection" technique -- below a column header and to the right of a row label -- is one of the most valuable applications of chained relative locators. It expresses table-cell selection the way a person points at a spreadsheet, and it survives changes to the cells' internal attributes because it only depends on the header and row-label text staying stable.

## Migrating Existing XPath Locators to Relative Locators

When you inherit a suite full of fragile positional XPath like \`(//input)[3]\` or \`//div[2]/form/div[4]/input\`, relative locators are an excellent refactoring target. The migration recipe is: identify the nearest stable element (a visible label, a heading, a button with text), make that your anchor, and replace the positional path with a single directional hop.

\`\`\`java
// BEFORE: brittle positional XPath that breaks when a field is added.
// WebElement phone = driver.findElement(By.xpath("(//input)[5]"));

// AFTER: anchored on the visible "Phone" label, robust to field reordering.
By phoneLabel = By.xpath("//label[normalize-space()='Phone']");
WebElement phone = driver.findElement(
    with(By.tagName("input")).below(phoneLabel));
phone.sendKeys("+91-9000000000");
\`\`\`

\`\`\`python
# BEFORE: brittle positional XPath.
# phone = driver.find_element(By.XPATH, "(//input)[5]")

# AFTER: anchored on the visible "Phone" label.
phone_label = {By.XPATH: "//label[normalize-space()='Phone']"}
phone = driver.find_element(
    locate_with(By.TAG_NAME, "input").below(phone_label))
phone.send_keys("+91-9000000000")
\`\`\`

The refactored locator no longer cares whether a field is inserted before Phone -- as long as the label stays put and the input stays directly below it, the locator holds. This is exactly the kind of resilience that reduces locator churn in long-lived suites.

## Best Practices Checklist

Follow these rules to keep relative-locator-based tests stable:

- Wait for the page to be visually stable (network idle, fonts loaded) before resolving relative locators.
- Anchor on the most stable element available -- prefer \`data-testid\`, ARIA labels, or visible text.
- Make the base locator specific (a class or attribute selector, not just a tag name).
- Add a \`near\` radius cap when using \`toLeftOf\`/\`toRightOf\` in grids to avoid jumping rows.
- Avoid relative locators across responsive breakpoints; use viewport-specific selectors instead.
- Fall back to CSS/XPath when a relative locator becomes flaky -- do not fight the geometry.

## Frequently Asked Questions

### What are relative locators in Selenium 4?

Relative locators (originally called friendly locators) let you find a web element based on its visual position relative to another known element. Instead of writing a fragile XPath, you describe the target as being above, below, to the left of, to the right of, or near an anchor element. Selenium uses the browser's bounding-box geometry to resolve the relationship at runtime.

### What is the difference between above and below in Selenium relative locators?

The \`above(anchor)\` method finds the nearest matching element whose bottom edge is higher than the anchor's top edge, while \`below(anchor)\` finds the nearest matching element whose top edge is lower than the anchor's bottom edge. Both pick the closest candidate in that vertical direction. They are most useful for stacked form fields where a label sits above its input.

### Do relative locators work in Selenium Python?

Yes. The Python binding provides \`locate_with(By, value)\` from \`selenium.webdriver.support.relative_locator\`, with fluent methods \`above\`, \`below\`, \`to_left_of\`, \`to_right_of\`, and \`near\`. Anchors can be passed as a dictionary like \`{By.ID: "anchor"}\` or as an already-located WebElement. The behaviour matches the Java \`RelativeLocator.with(...)\` API exactly.

### Why do relative locators sometimes match the wrong element?

Relative locators use bounding-box geometry computed at the moment the locator runs. If the page has not finished laying out -- images loading, fonts swapping, async content shifting elements -- the rectangles are wrong and the algorithm matches an unintended element. Hidden or zero-size elements can also satisfy the geometry. Waiting for layout stability and narrowing the base locator fix most cases.

### Can you chain multiple relative locators together?

Yes. You can chain methods like \`.toRightOf(anchor).near(anchor, 200)\` and the conditions combine with AND logic -- the element must satisfy every relationship to be returned. Chaining is essential for grids where you need both a horizontal direction and a proximity cap to stay on the correct row. Each added method narrows the candidate pool further.

### Are relative locators slower than CSS selectors?

Generally yes. A relative locator runs a DOM scan plus a geometry computation in injected JavaScript on every call, so it is slower than a direct CSS or ID selector. The overhead grows with the number of candidate elements. You can reduce it by making the base locator specific (a class selector instead of a tag name) so fewer candidates are evaluated.

### When should I avoid using relative locators?

Avoid relative locators when a stable ID, data-testid, or unique CSS selector exists -- those are faster and more robust. Also avoid them across responsive breakpoints where layouts reflow, in virtualized lists where elements are not all rendered, and on pages with heavy layout shift. In these cases the visual assumptions that relative locators encode become unreliable.

## Conclusion

Selenium 4 relative locators are a genuinely useful addition to the WebDriver toolbox. They let you express element location the way a human perceives a page -- above, below, left, right, near -- and they shine in exactly the situations where attribute-based selectors fail: unlabeled inputs, icon buttons in grids, tooltips, and auto-generated DOM. The five methods (\`above\`, \`below\`, \`toLeftOf\`, \`toRightOf\`, \`near\`) work identically in Java and Python, chain together with AND logic, and rely on the browser's own bounding-box geometry.

The trade-off is fragility. Because relative locators depend on rendered position, they break when layouts shift, when elements overlap, and when responsive breakpoints rearrange the page. The winning strategy is to anchor on a stable element and use the smallest possible geometric hop, falling back to CSS or XPath the moment a relative locator turns flaky. Used with that discipline, relative locators reduce locator maintenance without sacrificing reliability. Explore more automation patterns and ready-made skills in our [QA skills directory](/skills).
`,
};
