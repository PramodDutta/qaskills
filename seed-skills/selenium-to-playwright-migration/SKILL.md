---
name: Selenium to Playwright Migration
description: Port a Java Selenium suite to Playwright TypeScript - locator mapping, WebDriverWait to auto-wait, Grid to workers, Page Object port, with before/after code and a phased checklist.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [selenium, playwright, migration, page-object-model, auto-wait, web-automation, e2e, java, typescript]
testingTypes: [e2e, regression, integration]
frameworks: [selenium, playwright]
languages: [typescript, java]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Selenium to Playwright Migration Skill

You are an expert at migrating Selenium test suites to Playwright. When the user asks you to port Java Selenium code to Playwright TypeScript, you map locators to Playwright's role/text engines, delete every explicit wait in favor of auto-waiting web-first assertions, convert the Page Object Model, and replace Grid parallelism with Playwright workers and projects. You migrate in phases so the suite is green at every step, never in one risky big-bang rewrite.

## Core Principles

1. **Delete waits, do not translate them.** Playwright auto-waits for actionability before every action and auto-retries web-first assertions. A ported `WebDriverWait` is almost always a bug carried forward.
2. **Prefer user-facing locators.** Move from CSS/XPath to `getByRole`, `getByLabel`, `getByText`. These are resilient to DOM churn and mirror how users find elements.
3. **Locators are lazy; WebElements are eager.** A Playwright `Locator` is a query re-evaluated on use. A Selenium `WebElement` is a stale-prone handle. This difference removes most flakiness.
4. **One assertion library: `expect` with web-first matchers.** `await expect(locator).toBeVisible()` polls until true or times out. Never assert on a boolean you fetched manually.
5. **Grid becomes workers + projects.** Cross-browser and parallelism are built in. Delete `RemoteWebDriver`/hub config and configure `projects` and `workers` in `playwright.config.ts`.
6. **Port the POM, keep the structure.** Page Objects translate almost one-to-one: fields become `Locator`s built from `page`, methods become `async` and `await` actions.
7. **Migrate in phases, stay green.** Run Selenium and Playwright side by side. Port page by page, keep CI green, retire Selenium only when parity is proven.
8. **Trust the trace viewer over print debugging.** Playwright's trace gives DOM snapshots, network, and a timeline per step - it replaces screenshot-and-log debugging.

## Locator Mapping Table

| Selenium (Java) | Playwright (TypeScript) | Notes |
|---|---|---|
| `By.id("email")` | `page.locator("#email")` or `getByLabel("Email")` | prefer the label-based locator |
| `By.cssSelector(".btn-primary")` | `page.locator(".btn-primary")` | direct CSS still works |
| `By.xpath("//button[text()='Save']")` | `page.getByRole("button", { name: "Save" })` | role beats XPath |
| `By.name("q")` | `page.locator("[name=q]")` | |
| `By.linkText("Sign in")` | `page.getByRole("link", { name: "Sign in" })` | |
| `By.className("card")` | `page.locator(".card")` | |
| `findElements(...)` (list) | `page.locator(...).all()` or `.nth(i)` / `.first()` | lazy, no staleness |
| `driver.findElement(...).getText()` | `await locator.textContent()` / `innerText()` | |
| input by placeholder | `page.getByPlaceholder("Search")` | |
| `data-testid` attr | `page.getByTestId("submit")` | configure `testIdAttribute` |

## Wait Mapping: Explicit Waits Disappear

| Selenium pattern | Playwright equivalent |
|---|---|
| `new WebDriverWait(d, 10).until(visibilityOf(el))` | `await expect(locator).toBeVisible()` |
| `until(elementToBeClickable(el)); el.click()` | `await locator.click()` (auto-waits for actionable) |
| `until(presenceOfElementLocated(by))` | `await locator.waitFor({ state: "attached" })` |
| `until(textToBe(by, "Done"))` | `await expect(locator).toHaveText("Done")` |
| `Thread.sleep(2000)` | **delete it** - never needed |
| `until(urlContains("/dashboard"))` | `await expect(page).toHaveURL(/\/dashboard/)` |
| implicit wait `manage().timeouts()` | not needed; tune `expect` timeout in config |

### Before (Java Selenium)

```java
// LoginTest.java - typical Selenium with explicit waits
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.*;
import java.time.Duration;
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

public class LoginTest {
    WebDriver driver;
    WebDriverWait wait;

    @BeforeEach
    void setUp() {
        driver = new ChromeDriver();
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    @Test
    void userCanLogIn() {
        driver.get("https://app.example.com/login");
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("email")))
            .sendKeys("user@example.com");
        driver.findElement(By.id("password")).sendKeys("secret");
        driver.findElement(By.cssSelector("button[type=submit]")).click();

        WebElement banner = wait.until(
            ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".welcome")));
        assertTrue(banner.getText().contains("Welcome"));
        assertTrue(driver.getCurrentUrl().contains("/dashboard"));
    }

    @AfterEach
    void tearDown() { driver.quit(); }
}
```

### After (Playwright TypeScript)

```typescript
// login.spec.ts - all explicit waits gone, web-first assertions auto-retry
import { test, expect } from '@playwright/test';

test('user can log in', async ({ page }) => {
  await page.goto('https://app.example.com/login');

  // Auto-waits for the field to be actionable - no visibilityOf wait needed.
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Web-first assertions poll until true or time out.
  await expect(page.getByText(/Welcome/)).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard/);
});
// No setUp/tearDown: the `page` fixture creates an isolated context per test
// and disposes it automatically.
```

## Page Object Model Port

### Before (Java Selenium POM)

```java
// LoginPage.java
import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.*;
import java.time.Duration;

public class LoginPage {
    private final WebDriver driver;
    private final WebDriverWait wait;
    private final By email = By.id("email");
    private final By password = By.id("password");
    private final By submit = By.cssSelector("button[type=submit]");

    public LoginPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void open() { driver.get("https://app.example.com/login"); }

    public DashboardPage loginAs(String user, String pass) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(email)).sendKeys(user);
        driver.findElement(password).sendKeys(pass);
        driver.findElement(submit).click();
        return new DashboardPage(driver);
    }
}
```

### After (Playwright TypeScript POM)

```typescript
// pages/login.page.ts
import { type Page, type Locator } from '@playwright/test';
import { DashboardPage } from './dashboard.page';

export class LoginPage {
  readonly page: Page;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    // Locators are lazy queries, bound to the page, re-evaluated on each use.
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password');
    this.submit = page.getByRole('button', { name: 'Sign in' });
  }

  async open(): Promise<void> {
    await this.page.goto('https://app.example.com/login');
  }

  async loginAs(user: string, pass: string): Promise<DashboardPage> {
    await this.email.fill(user);     // auto-waits for actionability
    await this.password.fill(pass);
    await this.submit.click();
    return new DashboardPage(this.page);
  }
}
```

Wire the POM into a fixture so tests receive a ready page object:

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';

export const test = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
export { expect } from '@playwright/test';
```

## Grid to Workers and Projects

Selenium Grid (a hub plus remote nodes for cross-browser/parallel runs) is replaced entirely by Playwright config. Delete `RemoteWebDriver` and the hub URL.

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,              // run tests in files in parallel
  workers: process.env.CI ? 4 : undefined,  // replaces Grid node count
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'https://app.example.com',
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',        // trace viewer instead of screenshots+logs
    screenshot: 'only-on-failure',
  },
  // Cross-browser matrix - replaces Grid browser capabilities.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
    { name: 'mobile',   use: { ...devices['Pixel 7'] } },
  ],
});
```

```bash
# Selenium: maven + grid hub + nodes. Playwright:
npx playwright test                      # all projects, parallel workers
npx playwright test --project=chromium   # one browser
npx playwright test --workers=8          # tune parallelism
npx playwright show-trace trace.zip      # debug a failure
```

## Phased Migration Checklist

Work top to bottom. Do not start a phase until the previous one is green.

```
Phase 0 - Setup (no test changes)
  [ ] npm init playwright@latest in a new `playwright/` dir
  [ ] Configure projects, baseURL, testIdAttribute, trace
  [ ] Get one trivial smoke test passing in Playwright
  [ ] Both suites run in CI; Selenium remains the gate

Phase 1 - Locator inventory
  [ ] List every By.* locator used across the Selenium suite
  [ ] Map each to a Playwright locator (prefer getByRole/getByLabel)
  [ ] Flag XPath and brittle CSS for redesign, not literal translation

Phase 2 - Port Page Objects
  [ ] Convert one Page Object at a time to a TS class with Locator fields
  [ ] Methods become async; actions become await
  [ ] Delete every WebDriverWait; rely on auto-wait
  [ ] Expose POM via fixtures

Phase 3 - Port tests, page by page
  [ ] Replace assertTrue(...) with await expect(...).toBeVisible()/toHaveText()
  [ ] Delete Thread.sleep and implicit waits entirely
  [ ] Replace setUp/tearDown with the page fixture (isolated context per test)
  [ ] Run the new spec; debug with the trace viewer

Phase 4 - Parallelism + cross-browser
  [ ] Remove Grid/RemoteWebDriver config
  [ ] Set workers and the projects matrix
  [ ] Confirm tests are independent (no shared state) so fullyParallel is safe

Phase 5 - Retire Selenium
  [ ] Verify Playwright covers every migrated scenario at parity
  [ ] Switch the CI gate to Playwright
  [ ] Delete the Selenium suite and its Grid infra
```

## Best Practices

1. **Replace explicit waits with web-first assertions, not with Playwright waits.** `expect(locator).toBeVisible()` is the correct translation of most `WebDriverWait` calls.
2. **Adopt `getByRole`/`getByLabel`/`getByText` during the port.** Migration is the right moment to upgrade brittle XPath/CSS to user-facing locators.
3. **Use one isolated browser context per test via the `page` fixture.** It removes `setUp`/`tearDown` and guarantees clean state - cheaper than Selenium's full driver restart.
4. **Build Page Object locators in the constructor as lazy `Locator`s.** Never store resolved elements; that reintroduces staleness.
5. **Configure `trace: 'on-first-retry'`.** The trace viewer replaces screenshot-and-log debugging and pays for itself on the first flaky failure.
6. **Move parallelism to `workers` and the browser matrix to `projects`.** Delete all Grid/hub infrastructure once parity is reached.
7. **Keep both suites running in CI during migration.** Selenium stays the gate until Playwright proves parity, page by page.
8. **Use `data-testid` via `testIdAttribute` for elements with no good role/label.** A stable test id beats a deep CSS selector.

## Anti-Patterns to Avoid

1. **Literally translating `WebDriverWait` into Playwright waits.** This carries forward the flakiness you are migrating away from. Delete the wait; let auto-wait and `expect` handle it.
2. **Keeping `Thread.sleep` as `page.waitForTimeout`.** Fixed sleeps are flaky in both tools. Wait for a condition, never a duration.
3. **Porting XPath verbatim.** It works but wastes the migration's biggest win. Convert to role/label/text locators.
4. **Storing resolved elements in Page Object fields.** Playwright locators must stay lazy; an eagerly resolved element defeats auto-retry.
5. **Manually fetching a value then asserting on it** (`const t = await loc.textContent(); expect(t).toBe(...)`). This skips polling. Use `await expect(loc).toHaveText(...)`.
6. **A single huge big-bang rewrite.** Porting everything at once leaves no green checkpoint. Migrate page by page with both suites live.
7. **Recreating a Grid mindset with shared global state.** Playwright workers run in isolated contexts; tests that share state break `fullyParallel`.

## When to Trigger This Skill

Trigger when the user asks to:
- Migrate, port, or convert Selenium tests to Playwright
- Map Selenium locators / WebDriverWait to Playwright equivalents
- Move from Selenium Grid to Playwright parallelism / cross-browser
- Convert a Java (or other) Selenium Page Object Model to Playwright TypeScript
- Plan a phased Selenium-to-Playwright migration
- Remove flaky explicit waits inherited from a Selenium suite

For greenfield Playwright authoring (not a migration), use a Playwright E2E patterns skill instead.
