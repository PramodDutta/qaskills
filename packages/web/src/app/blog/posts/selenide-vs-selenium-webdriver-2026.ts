import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide vs Selenium WebDriver 2026 — Complete Comparison',
  description:
    'Compare Selenide and Selenium WebDriver in 2026. API, waits, performance, ecosystem, migration patterns, and when to choose each.',
  date: '2026-05-15',
  category: 'Reference',
  content: `
# Selenide vs Selenium WebDriver 2026 Complete Comparison

Java has two major browser automation libraries: raw Selenium WebDriver (the W3C standard implementation) and Selenide (a higher-level wrapper that wraps WebDriver with concise syntax and automatic waits). Both work. Both are maintained. Both are used in production by thousands of teams. The question for new projects in 2026 isn't "which one works" but "which one fits my team's velocity, debugging style, and CI/CD pipeline." This guide answers that question definitively.

We compare Selenide and Selenium WebDriver across every dimension that matters: API syntax, wait handling, locator strategies, performance, ecosystem integration, debugging, page objects, file handling, parallel execution, cloud grid support, and team velocity. Includes side-by-side code samples and a migration guide for teams moving from raw Selenium to Selenide. Every example is working Java with Selenium 4.27+ and Selenide 7+.

---

## Key Takeaways

- **Selenium WebDriver** is the W3C standard; Selenide is a wrapper built on top
- **Selenide auto-waits** for elements; Selenium requires explicit \`WebDriverWait\`
- **Selenide syntax is 30-50% shorter** for typical assertions
- **Selenide has built-in screenshots and Allure integration** out of the box
- **Selenium is more flexible** for non-browser tasks (mobile via Appium, native automation)
- **Migration is straightforward** because Selenide is built on WebDriver

---

## Syntax Comparison

Selenium:

\`\`\`java
WebDriver driver = new ChromeDriver();
driver.get("https://example.com/login");
driver.findElement(By.id("email")).sendKeys("alice@example.com");
driver.findElement(By.id("password")).sendKeys("secret");
driver.findElement(By.id("submit")).click();
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("dashboard")));
assertTrue(driver.findElement(By.id("user-name")).getText().contains("alice"));
driver.quit();
\`\`\`

Selenide:

\`\`\`java
import static com.codeborne.selenide.Selenide.*;
import static com.codeborne.selenide.Condition.*;

open("https://example.com/login");
$("#email").setValue("alice@example.com");
$("#password").setValue("secret");
$("#submit").click();
$("#dashboard").shouldBe(visible);
$("#user-name").shouldHave(text("alice"));
\`\`\`

Selenide is shorter, retry-aware, and doesn't need an explicit \`quit()\` (handled in afterEach automatically).

---

## Wait Handling

| Aspect | Selenium | Selenide |
|---|---|---|
| Default wait behavior | None | Auto-retry until timeout |
| Setting timeout | Per-WebDriverWait | \`Configuration.timeout\` |
| Common assertion | \`wait.until(visibilityOf(...))\` | \`$.shouldBe(visible)\` |
| Polling interval | Configurable per-wait | \`Configuration.pollingInterval\` |
| Stale element handling | \`StaleElementReferenceException\` | Auto-rediscover |

Selenide's wait handling is the killer feature. Every \`should\` call is an explicit wait. No more \`StaleElementReferenceException\`.

---

## Locator Comparison

| Goal | Selenium | Selenide |
|---|---|---|
| By ID | \`By.id("x")\` | \`$("#x")\` or \`$(byId("x"))\` |
| By CSS | \`By.cssSelector(".btn")\` | \`$(".btn")\` |
| By XPath | \`By.xpath("//div")\` | \`$x("//div")\` |
| Multiple elements | \`findElements(...)\` | \`$$(".item")\` |
| By text | Custom XPath | \`byText("Click")\` |

---

## Assertions

| Check | Selenium | Selenide |
|---|---|---|
| Element visible | \`assertTrue(el.isDisplayed())\` (no wait) | \`$.shouldBe(visible)\` (waits) |
| Text equals | \`assertEquals("x", el.getText())\` | \`$.shouldHave(exactText("x"))\` |
| Text contains | \`assertTrue(el.getText().contains("x"))\` | \`$.shouldHave(text("x"))\` |
| Attribute | \`assertEquals("v", el.getAttribute("a"))\` | \`$.shouldHave(attribute("a", "v"))\` |
| Element absent | Custom wait | \`$.shouldNot(exist)\` |
| Count | \`assertEquals(3, list.size())\` (no wait) | \`$$.shouldHave(size(3))\` (waits) |

---

## Performance

| Metric | Selenium | Selenide |
|---|---|---|
| Startup overhead | ~1.5s | ~1.5s (uses Selenium underneath) |
| Per-action latency | Lower (no retry) | Slightly higher (retry loop) |
| Test reliability | Lower (manual waits) | Higher (auto-retry) |
| Total suite time | Variable | More predictable |

In practice, Selenide tests are *faster overall* because they don't include defensive Thread.sleep calls.

---

## Configuration

| Concept | Selenium | Selenide |
|---|---|---|
| Set browser | \`new ChromeDriver()\` | \`Configuration.browser = "chrome"\` |
| Headless | ChromeOptions.addArguments | \`Configuration.headless = true\` |
| Remote URL | \`new RemoteWebDriver(url)\` | \`Configuration.remote = "..."\` |
| Window size | \`driver.manage().window().setSize(...)\` | \`Configuration.browserSize = "1920x1080"\` |
| Timeout | \`new WebDriverWait(driver, ...)\` | \`Configuration.timeout = 10_000\` |

Selenide's global Configuration is convenient but global state. If you need per-test config, set in \`@BeforeEach\`.

---

## Page Object Patterns

Selenium PageFactory:

\`\`\`java
public class LoginPage {
    @FindBy(id = "email") WebElement email;
    @FindBy(id = "submit") WebElement submit;

    public LoginPage(WebDriver driver) {
        PageFactory.initElements(driver, this);
    }
}
\`\`\`

Selenide:

\`\`\`java
public class LoginPage {
    SelenideElement email = $("#email");
    SelenideElement submit = $("#submit");
    // No constructor needed
}
\`\`\`

See our [Selenide Page Object best practices](/blog/selenide-page-object-pattern-best-practices) for deeper coverage.

---

## File Handling

| Action | Selenium | Selenide |
|---|---|---|
| Upload file | \`input.sendKeys(filePath)\` | \`$.uploadFile(file)\` or \`uploadFromClasspath\` |
| Download file | Manual JS or proxy setup | \`$.download()\` with mode config |
| Screenshot | \`((TakesScreenshot) driver).getScreenshotAs(...)\` | Auto on failure + \`Selenide.screenshot(...)\` |

Selenide's file handling is dramatically simpler. See our [file download/upload guide](/blog/selenide-file-download-upload-guide).

---

## Ecosystem Integrations

| Tool | Selenium | Selenide |
|---|---|---|
| Allure | Manual @Step | AllureSelenide listener |
| Screenshots on failure | Manual | Automatic |
| Page source on failure | Manual | Automatic |
| Selenium Grid | Native | Configuration.remote |
| Browser DevTools | CDP via Selenium 4 | Same (delegates to Selenium) |
| Mobile (Appium) | Via Appium client | Limited |

---

## When Selenide Wins

- New Java browser testing projects
- Teams new to Selenium
- E2E test suites that need to be fast to write
- Tests that interact with dynamic UIs (auto-retry helps)
- Teams using Allure for reporting
- Teams using Selenium Grid
- Teams testing Shadow DOM or iframes (Selenide has helpers)

---

## When Selenium WebDriver Wins

- Mobile testing via Appium (Selenide's mobile support is limited)
- Headless automation with minimal dependencies
- Library/tool authors building on WebDriver primitives
- Teams already standardized on Selenium with custom infrastructure
- Non-Java languages (Selenide is Java/Kotlin only)
- Heavy use of CDP / WebDriver BiDi features

---

## Migration Guide: Selenium to Selenide

Step 1: Add dependency.

\`\`\`xml
<dependency>
  <groupId>com.codeborne</groupId>
  <artifactId>selenide</artifactId>
  <version>7.5.0</version>
</dependency>
\`\`\`

Step 2: Replace driver creation.

\`\`\`java
// Before
WebDriver driver = new ChromeDriver();

// After
Configuration.browser = "chrome";
Configuration.startMaximized = true;
\`\`\`

Step 3: Replace findElement.

\`\`\`java
// Before
driver.findElement(By.id("email"))

// After
$("#email")
\`\`\`

Step 4: Replace assertions.

\`\`\`java
// Before
assertTrue(driver.findElement(By.id("button")).isDisplayed());

// After
$("#button").shouldBe(visible);
\`\`\`

Step 5: Remove WebDriverWait.

\`\`\`java
// Before
wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("x")));

// After (Selenide auto-waits)
$("#x").shouldBe(visible);
\`\`\`

Step 6: Use SelenideElement in Page Objects.

\`\`\`java
// Before
@FindBy(id = "email") WebElement email;

// After
@FindBy(id = "email") SelenideElement email;
\`\`\`

Step 7: Remove explicit driver.quit() — Selenide handles it.

A migration of a 500-test suite typically takes a senior engineer 1-2 weeks, gaining 20-40% line-count reduction and dramatically fewer flaky tests.

---

## Decision Matrix

| Scenario | Recommendation |
|---|---|
| New Java browser tests | Selenide |
| New project, multi-platform | Selenium (Appium support) |
| Migrating from raw Selenium | Selenide (gradual migration) |
| Need lowest-level access | Selenium |
| Want concise tests fast | Selenide |
| Team prefers explicit waits | Selenium (or Selenide with explicit Duration) |

---

## Conclusion

For new Java browser automation projects in 2026, Selenide is the right default. The concise API, automatic waits, built-in screenshots, and Allure integration save your team weeks of infrastructure work. Choose raw Selenium WebDriver only for mobile testing via Appium, library development, or non-JVM languages. Migration from Selenium to Selenide is straightforward because Selenide is built on WebDriver.

For complementary patterns, see our [Selenide Condition cheatsheet](/blog/selenide-condition-cheatsheet-2026) and [Page Object best practices](/blog/selenide-page-object-pattern-best-practices).

Browse the [QA skills directory](/skills) for related Java testing patterns.
`,
};
