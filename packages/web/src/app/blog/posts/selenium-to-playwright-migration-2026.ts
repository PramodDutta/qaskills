import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium to Playwright Migration Guide (2026)',
  description:
    'A practical 2026 guide to migrating a Selenium WebDriver suite to Playwright: API mapping table, locator strategy, waits, Page Objects, and AI-agent codemods.',
  date: '2026-06-29',
  category: 'Guide',
  content: `
# Selenium to Playwright Migration Guide (2026)

If your team is staring down a flaky, slow Selenium WebDriver suite in 2026, you are not alone. Selenium has been the backbone of browser automation for over a decade, but the tooling landscape has shifted hard toward Playwright. Teams are migrating because Playwright executes faster, auto-waits for elements, ships native parallelism, needs no Selenium Grid, and slots cleanly into AI coding agent workflows. The hard part is not deciding to migrate, it is doing it without freezing feature work for a quarter.

This guide is a pragmatic, code-first playbook for migrating a real Selenium suite to Playwright. We will map the Selenium API surface to its Playwright equivalents, rethink your locator strategy, replace explicit waits with auto-waiting and web-first assertions, port your Page Object Model, run both frameworks side by side during the transition, and use AI agents and codemods to accelerate the mechanical parts. Every section shows BEFORE (Selenium in Java or Python) and AFTER (Playwright in TypeScript or Python) so you can copy patterns directly into your codebase.

The goal is not a big-bang rewrite. The goal is a controlled, incremental migration where the new Playwright suite grows test by test while the Selenium suite keeps guarding your release until it is empty. By the end you will have a migration plan you can start on Monday, a reference table you can pin to your wall, and a clear sense of the pitfalls that trip up most teams. If you also want a from-scratch foundation, our [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) pairs well with this migration playbook.

## Why Teams Migrate From Selenium to Playwright

Selenium is a W3C WebDriver client. It speaks to a browser driver over HTTP, and that round-trip architecture is the root of most of its pain. Playwright drives browsers over a persistent bidirectional connection (CDP for Chromium, custom protocols for Firefox and WebKit), which removes a whole class of timing problems and makes the API feel synchronous even though it is async under the hood.

Here is what actually moves the needle for migrating teams:

- **Speed.** Playwright's connection model and parallel workers routinely cut suite runtime by 40 to 70 percent versus an equivalent Selenium Grid run.
- **Auto-waiting.** Every Playwright action waits for the element to be attached, visible, stable, and enabled before acting. Most \`WebDriverWait\` and \`Thread.sleep\` calls simply disappear.
- **No grid to babysit.** Playwright runs browsers locally or in containers without a hub-and-node Grid. Sharding is a CLI flag, not infrastructure.
- **Native parallelism.** The test runner shards files across workers out of the box.
- **AI agent stack.** Playwright's codegen, trace viewer, and the Playwright MCP server make it the default target for Claude Code and other coding agents that write and debug tests for you.

If you are still weighing the two frameworks head to head before committing, read our [Selenium vs Playwright 2026 comparison](/blog/selenium-vs-playwright-2026) first. This guide assumes you have already decided to migrate.

| Concern | Selenium WebDriver | Playwright |
|---|---|---|
| Architecture | HTTP/JSON-wire to a driver | Persistent bidirectional protocol |
| Waiting | Manual explicit/implicit waits | Built-in auto-waiting per action |
| Parallelism | Selenium Grid hub + nodes | Built-in workers, \`--shard\` flag |
| Browsers | Chrome, Firefox, Edge, Safari | Chromium, Firefox, WebKit (bundled) |
| Network mocking | Hard, needs a proxy | First-class \`page.route()\` |
| Auto-screenshots/video | DIY | Built-in on failure |
| Trace debugging | None native | Trace Viewer with DOM snapshots |
| Language support | Java, Python, C#, JS, Ruby | TS/JS, Python, Java, .NET |

## The Selenium to Playwright API Mapping Table

This is the table to keep open while you migrate. It maps the Selenium methods you use every day to their Playwright equivalents. Note that many multi-step Selenium patterns collapse into a single Playwright call because waiting is implicit.

| Task | Selenium (Java/Python) | Playwright (TS/Python) |
|---|---|---|
| Create driver/page | \`new ChromeDriver()\` | \`await browser.newPage()\` |
| Navigate | \`driver.get(url)\` | \`await page.goto(url)\` |
| Find element | \`driver.findElement(By.id("x"))\` | \`page.locator("#x")\` |
| Find by CSS | \`By.cssSelector(".btn")\` | \`page.locator(".btn")\` |
| Find by text | \`By.xpath("//*[text()='Buy']")\` | \`page.getByText("Buy")\` |
| Find by role | not native | \`page.getByRole("button", { name: "Buy" })\` |
| Click | \`element.click()\` | \`await locator.click()\` |
| Type text | \`element.sendKeys("hi")\` | \`await locator.fill("hi")\` |
| Clear input | \`element.clear()\` | \`await locator.fill("")\` |
| Get text | \`element.getText()\` | \`await locator.textContent()\` |
| Get attribute | \`element.getAttribute("href")\` | \`await locator.getAttribute("href")\` |
| Is displayed | \`element.isDisplayed()\` | \`await locator.isVisible()\` |
| Explicit wait | \`new WebDriverWait(driver, 10)\` | implicit (auto-wait) |
| Wait for element | \`wait.until(visibilityOf(...))\` | \`await expect(locator).toBeVisible()\` |
| Select dropdown | \`new Select(el).selectByValue("x")\` | \`await locator.selectOption("x")\` |
| Checkbox check | \`element.click()\` | \`await locator.check()\` |
| Hover | \`Actions.moveToElement(el)\` | \`await locator.hover()\` |
| Drag and drop | \`Actions.dragAndDrop(a, b)\` | \`await a.dragTo(b)\` |
| Execute JS | \`((JavascriptExecutor)driver).executeScript(...)\` | \`await page.evaluate(...)\` |
| Switch frame | \`driver.switchTo().frame("f")\` | \`page.frameLocator("#f").locator(...)\` |
| Switch window/tab | \`driver.switchTo().window(handle)\` | \`context.pages()[1]\` |
| Screenshot | \`driver.getScreenshotAs(...)\` | \`await page.screenshot({ path })\` |
| Quit | \`driver.quit()\` | \`await browser.close()\` |

Print this table. Roughly 80 percent of a typical migration is mechanical substitution against these rows, which is exactly the kind of work an AI agent can do in bulk.

A few rows deserve extra attention because they collapse multi-step Selenium ceremony into a single Playwright call. Selecting a dropdown option in Selenium means importing the \`Select\` helper, wrapping the element, and choosing a strategy (\`selectByValue\`, \`selectByVisibleText\`, or \`selectByIndex\`); in Playwright it is one \`selectOption\` call that auto-waits for the option to exist. Drag and drop in Selenium requires the \`Actions\` builder with explicit \`clickAndHold\`, \`moveToElement\`, and \`release\` steps that are notoriously flaky across browsers; Playwright's \`dragTo\` handles the choreography for you. And executing JavaScript, which in Selenium means casting the driver to \`JavascriptExecutor\`, is just \`page.evaluate\` in Playwright with a clean serialization boundary. As you work through the table, watch for these collapses, because each one is a chance to delete brittle code rather than translate it line for line.

## Locator Strategy: From Brittle Selectors to User-Facing Locators

Selenium locators are CSS or XPath strings resolved once into a \`WebElement\`. The element reference goes stale the moment the DOM re-renders, which is why \`StaleElementReferenceException\` is the most hated exception in Selenium history.

Playwright locators are lazy. \`page.locator("#submit")\` is a description of how to find the element, not the element itself. It re-resolves on every action, so stale references are gone. More importantly, Playwright pushes you toward user-facing locators that mirror how a real user or assistive technology perceives the page.

BEFORE (Selenium, Java):

\`\`\`java
WebElement btn = driver.findElement(By.cssSelector("button.submit-btn"));
btn.click();

// XPath by text, brittle and slow
WebElement link = driver.findElement(
    By.xpath("//a[contains(text(),'Sign in')]"));
link.click();
\`\`\`

AFTER (Playwright, TypeScript):

\`\`\`typescript
// Prefer role-based locators, resilient to markup churn
await page.getByRole('button', { name: 'Submit' }).click();

await page.getByRole('link', { name: 'Sign in' }).click();
\`\`\`

The locator priority order to adopt as you migrate is: \`getByRole\` first, then \`getByLabel\` and \`getByPlaceholder\` for form fields, \`getByText\` for content, \`getByTestId\` for elements with no accessible identity, and only fall back to raw CSS for the awkward cases. This single shift kills a large fraction of your flakiness before you even touch waits.

| Selenium locator | Playwright equivalent | When to use |
|---|---|---|
| \`By.id("email")\` | \`page.getByLabel("Email")\` | Form fields with labels |
| \`By.cssSelector(".btn")\` | \`page.getByRole("button", { name })\` | Buttons and links |
| \`By.xpath("//h1")\` | \`page.getByRole("heading")\` | Headings |
| \`By.name("q")\` | \`page.getByPlaceholder("Search")\` | Search/inputs |
| \`By.cssSelector("[data-test=x]")\` | \`page.getByTestId("x")\` | Test-only hooks |

## Handling Waits and Assertions

Explicit and implicit waits are the heart of every Selenium suite and the first thing you delete during migration. Playwright actions auto-wait for actionability, and Playwright assertions auto-retry until they pass or time out. This is the single biggest reduction in code volume you will see.

BEFORE (Selenium, Python):

\`\`\`python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

wait = WebDriverWait(driver, 10)
element = wait.until(
    EC.visibility_of_element_located((By.ID, "result")))
assert element.text == "Success"
\`\`\`

AFTER (Playwright, Python):

\`\`\`python
from playwright.sync_api import expect

# Auto-retrying, web-first assertion. No explicit wait needed.
expect(page.locator("#result")).to_have_text("Success")
\`\`\`

Never replace a Selenium wait with \`page.wait_for_timeout()\` (a fixed sleep). That is an anti-pattern that reintroduces flakiness. Use web-first assertions like \`toBeVisible\`, \`toHaveText\`, \`toHaveCount\`, and \`toHaveURL\`, which poll the live DOM. If you genuinely need to wait for a network event, use \`page.wait_for_response()\` or \`page.wait_for_load_state()\` instead of a timer. For a deeper look at killing flakiness during and after the migration, see our guide on [fixing flaky tests](/blog/fix-flaky-tests-guide).

| Selenium wait pattern | Playwright replacement |
|---|---|
| \`implicitlyWait(10)\` | Delete it (auto-wait handles it) |
| \`wait.until(visibilityOf(...))\` | \`expect(loc).toBeVisible()\` |
| \`wait.until(textToBe(...))\` | \`expect(loc).toHaveText(...)\` |
| \`wait.until(elementToBeClickable)\` | implicit in \`.click()\` |
| \`Thread.sleep(2000)\` | Delete it, add a real assertion |
| \`wait.until(urlContains("/ok"))\` | \`expect(page).toHaveURL(/ok/)\` |

## Migrating the Page Object Model

Most Selenium suites use a Page Object Model. The good news is the POM concept ports directly to Playwright; the implementation just gets shorter and cleaner because constructors no longer need \`PageFactory\` or \`@FindBy\` annotations, and methods no longer need explicit waits.

BEFORE (Selenium, Java with PageFactory):

\`\`\`java
public class LoginPage {
    private WebDriver driver;

    @FindBy(id = "username") private WebElement username;
    @FindBy(id = "password") private WebElement password;
    @FindBy(css = "button[type=submit]") private WebElement submit;

    public LoginPage(WebDriver driver) {
        this.driver = driver;
        PageFactory.initElements(driver, this);
    }

    public void login(String user, String pass) {
        username.sendKeys(user);
        password.sendKeys(pass);
        submit.click();
    }
}
\`\`\`

AFTER (Playwright, TypeScript):

\`\`\`typescript
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly username: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.username = page.getByLabel('Username');
    this.password = page.getByLabel('Password');
    this.submit = page.getByRole('button', { name: 'Sign in' });
  }

  async login(user: string, pass: string) {
    await this.username.fill(user);
    await this.password.fill(pass);
    await this.submit.click();
  }
}
\`\`\`

Notice the locators are defined as class fields but stay lazy, so there is no stale-element risk and no \`PageFactory.initElements\` boilerplate. Migrate one page object at a time, write a thin Playwright test that exercises it, and delete the Selenium page object only once the Playwright test is green. Our [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) covers fixtures and POM composition in more depth if you want to modernize the structure while you migrate.

## Running Selenium and Playwright Side by Side

A big-bang rewrite is how migrations die. Instead, run both suites in parallel during the transition and migrate test by test. Practically this means:

1. Add Playwright to the repo without removing Selenium. They live in separate directories (\`tests-selenium/\` and \`tests-playwright/\`).
2. In CI, run both suites. Selenium remains the release gate until coverage moves over.
3. Pick the flakiest or highest-value Selenium tests first and port them. Once a Playwright test reliably covers a flow, delete the Selenium test.
4. Track a simple migration burndown: tests remaining in Selenium versus ported to Playwright.

A minimal Playwright config to drop alongside Selenium:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests-playwright',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
\`\`\`

CI runs both during the transition:

\`\`\`bash
# Legacy Selenium suite (the release gate, for now)
mvn -q test -Dtest=SeleniumSuite

# New Playwright suite, growing test by test
npx playwright test --shard=1/2
\`\`\`

This dual-run period typically lasts one to two release cycles. Keep it short and visible so the team feels the burndown and does not let the Selenium suite linger as permanent dead weight.

## Using AI Agents and Codemods to Accelerate Migration

The mechanical 80 percent of a migration, swapping API calls per the mapping table, is exactly what an AI coding agent does well. In 2026 the fastest teams hand the repetitive substitution to Claude Code or a similar agent and reserve human attention for the tricky 20 percent: iframes, file uploads, custom waits, and flaky flows.

A practical agent-assisted workflow:

1. Feed the agent one Selenium test plus the mapping table from this article as context.
2. Ask it to produce the equivalent Playwright test, preferring role-based locators and web-first assertions.
3. Run the generated test, capture a trace on failure, and feed the trace back to the agent to self-correct.
4. Repeat per file, reviewing each diff.

\`\`\`bash
# Example prompt scaffold passed to a coding agent
cat tests-selenium/LoginTest.java MAPPING.md \\
  | your-agent "Convert this Selenium test to Playwright TypeScript. \\
     Use getByRole/getByLabel locators and expect() assertions. \\
     Remove all explicit waits and Thread.sleep calls."
\`\`\`

The Playwright trace viewer is the secret weapon here because it gives the agent (and you) a deterministic record of what happened, which makes failures debuggable instead of mysterious. See our [Playwright trace viewer debugging guide](/blog/playwright-trace-viewer-debugging-guide) for the workflow. For curated agent setups built for this exact kind of work, browse the [best Claude Code skills for automated testing](/blog/best-claude-code-skills-for-automated-testing). You can also pull ready-made migration and Playwright skills from the QASkills directory at [/skills](/skills) and wire them straight into your agent.

## Common Pitfalls and How to Avoid Them

Migrations fail in predictable ways. Watch for these:

- **Porting waits literally.** Resist translating every \`WebDriverWait\` into \`wait_for_timeout\`. Delete waits and lean on auto-waiting plus web-first assertions.
- **Keeping XPath everywhere.** XPath ports work but throw away Playwright's biggest resilience win. Convert to role and label locators as you go.
- **Async mistakes (TypeScript).** Every Playwright action returns a promise. A missing \`await\` produces races that look exactly like the flakiness you are migrating away from. Enable the \`no-floating-promises\` lint rule.
- **Iframe handling.** Selenium's \`switchTo().frame()\` becomes \`page.frameLocator()\`. There is no global frame context, so scope every locator through the frame locator.
- **New tabs and windows.** Selenium tracks window handles; Playwright exposes pages on the context. Use \`context.waitForEvent('page')\` to capture a popup.
- **Letting Selenium linger.** A half-migrated repo with two frameworks forever is worse than either alone. Set a deadline and burn the list down.
- **Skipping traces.** Turn on \`trace: 'on-first-retry'\` from day one so every failure is debuggable.

Avoid these and your migration stays boring, which is exactly what you want from infrastructure work.

One more pitfall is organizational rather than technical: failing to celebrate and measure progress. A migration that drags on silently loses executive support, and the easiest way to keep that support is to surface the burndown chart in every standup and to call out the runtime savings as they land. When the Playwright suite finishes in eight minutes where the Selenium Grid took twenty-five, that number is the strongest argument you have for finishing the job. Pair it with a count of flaky-test reruns avoided, since that is the metric your on-call engineers feel most directly. Treat the migration as a product with a shipping date, not an open-ended cleanup task, and it will actually reach zero.

## Frequently Asked Questions

### Is migrating from Selenium to Playwright worth it in 2026?

For most teams, yes. Playwright's auto-waiting eliminates the dominant source of Selenium flakiness, native parallelism and no-Grid execution cut runtime by 40 to 70 percent, and the trace viewer plus AI-agent integration drastically lower debugging cost. The migration effort is real but largely mechanical, and AI agents now automate most of the repetitive conversion work.

### How long does a Selenium to Playwright migration take?

For a suite of a few hundred tests, plan one to two release cycles running both frameworks in parallel. The mechanical API substitution is fast (especially with an AI agent), so most of the time goes into the awkward 20 percent: iframes, uploads, custom waits, and flaky flows. Migrating incrementally test by test keeps feature work moving the whole time.

### Can I run Selenium and Playwright at the same time?

Yes, and you should during the transition. Keep them in separate directories and run both in CI, with Selenium as the release gate until coverage moves over. Port the flakiest and highest-value tests first, delete each Selenium test once its Playwright replacement is reliably green, and track a simple burndown so the dual-run period stays short.

### Do I have to rewrite my Page Object Model?

No, the Page Object Model concept ports directly. Playwright page objects are usually shorter because there is no \`PageFactory\` or \`@FindBy\` boilerplate and no explicit waits inside methods. Define lazy \`Locator\` fields in the constructor, keep your action methods, and migrate one page object at a time alongside a thin test that exercises it.

### What replaces WebDriverWait in Playwright?

Nothing, in most cases. Playwright actions auto-wait for the element to be visible, stable, and enabled, and web-first assertions like \`expect(locator).toBeVisible()\` auto-retry until they pass or time out. Replace \`WebDriverWait\` and \`Thread.sleep\` with assertions, and only use \`wait_for_response\` or \`wait_for_load_state\` for genuine network or navigation waits.

### Can AI agents automate the migration?

Largely, yes. The bulk of a migration is mechanical substitution against an API mapping table, which AI coding agents like Claude Code handle well. Feed the agent one test plus the mapping, have it generate the Playwright equivalent with role-based locators and web-first assertions, run it, and feed the trace back for self-correction. Humans review diffs and handle the tricky edge cases.

### Should I keep using XPath after migrating to Playwright?

Avoid it where you can. XPath selectors port over and still work, but they throw away Playwright's biggest resilience win. Prefer \`getByRole\`, \`getByLabel\`, \`getByPlaceholder\`, and \`getByTestId\`, which mirror how users and assistive technology perceive the page and survive markup churn far better than brittle XPath expressions.

### Which language should I target when migrating, TypeScript or Python?

Pick the language your team already uses and your app is written in. TypeScript and Python are both first-class Playwright targets with near-identical APIs. TypeScript gives you the tightest editor and type integration and the richest community examples; Python is ideal if your team lives in pytest. The migration patterns in this guide apply to both.

## Conclusion

Migrating from Selenium to Playwright in 2026 is less a rewrite and more a controlled, incremental swap. Lean on the API mapping table for the mechanical 80 percent, shift your locators to user-facing roles and labels, delete your explicit waits in favor of auto-waiting and web-first assertions, port your page objects one at a time, and run both suites side by side until the Selenium list is empty. Hand the repetitive conversion to an AI coding agent and reserve your attention for the genuinely tricky flows.

Start small: pick your three flakiest Selenium tests, port them this week, and feel the difference in speed and stability. Then keep the burndown moving. Ready to accelerate with AI agents built for exactly this work? Browse the QASkills directory at [/skills](/skills) to find Playwright and migration skills you can plug into Claude Code and start converting tests today.
`,
};
