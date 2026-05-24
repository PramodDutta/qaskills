import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium to Playwright Migration Guide for 2026',
  description:
    'Migrate a Selenium WebDriver suite to Playwright in 2026. WebDriver to Playwright API mapping, grid migration, language ports, and proven rollout plan.',
  date: '2026-05-02',
  category: 'Migration',
  content: `
# Selenium to Playwright Migration Guide for 2026

Selenium WebDriver shaped two decades of browser automation. It standardized cross-browser scripting through the W3C WebDriver protocol, gave us a Selenium Grid for parallel runs, and produced an ecosystem of bindings in Java, Python, C#, Ruby, JavaScript, and Kotlin. In 2026, however, a large fraction of teams that maintain Selenium suites are evaluating, or actively executing, a migration to Playwright. The drivers are familiar: slower test execution, brittle locators, complex Grid setup, and a steep learning curve for engineers joining mid-career. Playwright eliminates much of that operational burden while keeping the WebDriver-style ergonomics most QA engineers expect.

This guide is for teams that already maintain a Selenium suite in Java, Python, C#, or JavaScript and want a credible migration path to Playwright. We will walk through architectural differences, the WebDriver-to-Playwright API mapping table, before-and-after code in multiple languages, Selenium Grid replacement, parallel and distributed execution, page object model migration, authentication caching, CI changes, and the gotchas that bite teams in week three. By the end, you will know how to plan, scope, and execute a six- to twelve-week migration without freezing feature development.

For broader QA workflow guidance, see [the blog index](/blog). For Playwright skills you can install into Claude Code, the [QA Skills directory](/skills) is the starting point.

## Why migrate from Selenium to Playwright

Selenium's strength was always its standardization. Every modern browser ships a WebDriver implementation, and the protocol is stable. The cost of that standardization is latency. Each command is an HTTP round trip from the test process to the browser driver to the browser itself. A test that performs 200 actions can spend three to four seconds purely on driver overhead. Playwright bypasses the W3C protocol entirely and communicates with the browser using the Chrome DevTools Protocol (Chromium), WebKit's remote inspector, or Firefox's CDP-over-Juggler bridge. Commands execute in tens of milliseconds.

The second driver is auto-waiting. Selenium expects you to wire up \`WebDriverWait\` and \`ExpectedConditions\` explicitly; missing a wait causes intermittent flake. Playwright's \`Locator\` auto-waits for actionability, visibility, attachment, and stability before performing an action, dramatically reducing flake without configuration. The third driver is tracing. Playwright produces a single trace.zip containing screenshots, DOM snapshots, network logs, console messages, and source frames, all viewable in an interactive HTML viewer. Selenium teams typically reach for third-party reporters or video recording, neither of which approach Playwright's experience.

## Conceptual model: the architectural shift

A Selenium test is a sequential script that issues HTTP commands to a WebDriver endpoint. A Playwright test is an async function that drives a browser instance via a persistent connection. The biggest cognitive shift is that Playwright is async-first. Java and C# Selenium tests typically read top-to-bottom in a synchronous style. Playwright in TypeScript uses async/await; Playwright in Python uses \`async\` functions or the synchronous API for compatibility. Plan to introduce async patterns into your codebase, or use Playwright's sync Python wrapper if rewriting to async is too invasive.

The second shift is locators. Selenium uses \`By.id\`, \`By.cssSelector\`, \`By.xpath\`, and \`By.name\`. Playwright introduces high-level role-, label-, and test-id-based locators that mirror how real users find elements. Most teams find their suites are cleaner and less brittle after the locator refactor than they were under Selenium.

## API mapping table: Selenium to Playwright

The table below covers the WebDriver commands you use daily. Languages differ slightly but the conceptual mapping holds.

| Selenium (Java) | Playwright (TypeScript) | Notes |
|---|---|---|
| \`driver.get(url)\` | \`await page.goto(url)\` | Auto-waits for load |
| \`driver.findElement(By.id("x"))\` | \`page.locator('#x')\` | Lazy; resolves on action |
| \`driver.findElements(By.css("li"))\` | \`page.locator('li')\` | Use \`.all()\`, \`.count()\`, \`.nth(i)\` |
| \`element.click()\` | \`await locator.click()\` | Auto-waits for actionability |
| \`element.sendKeys("x")\` | \`await locator.fill('x')\` | \`pressSequentially\` for key-by-key |
| \`new Select(el).selectByValue(v)\` | \`await locator.selectOption({ value: v })\` | One call |
| \`driver.switchTo().frame("f")\` | \`page.frameLocator('iframe[name=f]')\` | First-class iframe support |
| \`driver.switchTo().window(h)\` | Use multiple pages from context | Native multi-tab |
| \`driver.manage().window().setSize(...)\` | \`await page.setViewportSize(...)\` | Or set in config |
| \`((JavascriptExecutor)driver).executeScript(s)\` | \`await page.evaluate(() => ...)\` | Direct JS execution |
| \`new WebDriverWait(driver,10).until(...)\` | \`await expect(locator).toBeVisible()\` | Web-first assertions |
| \`driver.manage().getCookies()\` | \`await context.cookies()\` | Per-context |
| \`driver.quit()\` | \`await browser.close()\` | Implicit if using test runner |

## Step-by-step migration plan

A realistic Selenium-to-Playwright migration for a medium suite (200 to 1,000 tests) is an eight- to twelve-week effort. Below is the plan we use with clients.

1. **Week 0 (audit)** - Inventory tests, page objects, helpers, custom waits, Grid configuration, and CI integration. Identify language: if you are in Java or C#, decide whether to port to TypeScript or use Playwright's Java/C# clients.
2. **Week 1 (foundation)** - Install Playwright in a sibling directory. Build the equivalent of your page-object base class. Wire up a single smoke test end-to-end.
3. **Weeks 2 to 3 (smoke)** - Port the smoke suite. Resolve every shared utility (auth, fixtures, data factories).
4. **Weeks 4 to 8 (bulk)** - Port domain by domain. Use \`page.pause()\` and \`codegen\` to accelerate the locator refactor.
5. **Week 9 (parallelization)** - Replace Selenium Grid with Playwright's built-in worker model or, if needed, a hosted execution platform.
6. **Week 10 (cutover)** - Switch CI to Playwright; keep Selenium in a manual-trigger workflow for one sprint.
7. **Week 11 (cleanup)** - Remove Selenium dependencies, delete Grid infrastructure, update docs.
8. **Week 12 (training)** - Onboard the team to the trace viewer, fixtures, and Playwright-specific patterns.

## Before and after: a Java to TypeScript port

The example below is a real Selenium Java test ported to Playwright TypeScript.

**Selenium (before, Java)**

\`\`\`java
@Test
public void loginAsAdmin() {
  driver.get("https://app.example.com/login");

  WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
  wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("email")))
      .sendKeys("admin@example.com");
  driver.findElement(By.id("password")).sendKeys("secret");
  driver.findElement(By.cssSelector("button[type=submit]")).click();

  wait.until(ExpectedConditions.urlContains("/dashboard"));
  String userMenu = driver.findElement(By.cssSelector(".user-menu")).getText();
  assertThat(userMenu).contains("admin@example.com");
}
\`\`\`

**Playwright (after, TypeScript)**

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('login as admin', async ({ page }) => {
  await page.goto('https://app.example.com/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\\/dashboard/);
  await expect(page.locator('.user-menu')).toContainText('admin@example.com');
});
\`\`\`

The Java original is 13 lines plus the wait setup. The Playwright version is 8 lines, zero explicit waits, and uses accessibility-anchored locators that survive UI refactors.

## Python: a side-by-side port

If your team writes Selenium in Python, the migration is even smoother because Playwright Python ships with both async and sync APIs.

**Selenium Python (before)**

\`\`\`python
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

def test_search():
    driver = webdriver.Chrome()
    driver.get('https://example.com')
    box = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.NAME, 'q'))
    )
    box.send_keys('playwright')
    box.submit()
    assert 'playwright' in driver.title.lower()
    driver.quit()
\`\`\`

**Playwright Python (after)**

\`\`\`python
from playwright.sync_api import sync_playwright

def test_search():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto('https://example.com')
        page.get_by_role('searchbox').fill('playwright')
        page.keyboard.press('Enter')
        assert 'playwright' in page.title().lower()
        browser.close()
\`\`\`

If you prefer pytest with a fixture, install \`pytest-playwright\` and request the \`page\` fixture as a parameter.

## Page Object Model migration

The Page Object Model survives the migration intact; only the implementation changes. A Selenium Java PageObject typically holds \`@FindBy\` locators and \`WebElement\` fields; the Playwright equivalent holds \`Locator\` properties initialized from a \`Page\` parameter.

\`\`\`typescript
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password');
    this.submit = page.getByRole('button', { name: 'Sign in' });
  }

  async goto() { await this.page.goto('/login'); }
  async loginAs(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
\`\`\`

The locators are evaluated lazily, so creating the page object does not perform DOM queries. This is the same lazy semantic Selenium gave you with PageFactory, but without the reflection overhead.

## Replacing Selenium Grid

Selenium Grid is the operational backbone of many enterprise QA setups. Migrating away requires a replacement story.

| Use case | Selenium Grid | Playwright replacement |
|---|---|---|
| Parallel execution on one machine | \`--workers\` in TestNG | Playwright workers (default) |
| Cross-browser matrix | Multiple browser nodes | Playwright \`projects\` in config |
| Distributed execution across machines | Selenium Grid hub + nodes | Sharding across CI runners |
| Mobile emulation | Appium with Grid | Playwright \`devices\` config |
| Real device cloud | Saucelabs/BrowserStack via Grid | Saucelabs/BrowserStack Playwright support |

Sharding looks like this in GitHub Actions:

\`\`\`yaml
strategy:
  fail-fast: false
  matrix:
    shard: [1/4, 2/4, 3/4, 4/4]
steps:
  - run: npx playwright test --shard=\${{ matrix.shard }}
\`\`\`

Four CI runners each take a quarter of the suite. No Grid hub to maintain.

## Authentication caching across tests

Selenium teams typically hand-roll session caching by saving cookies to a JSON file and reloading them. Playwright formalizes this as \`storageState\`.

\`\`\`typescript
// global-setup.ts
import { chromium } from '@playwright/test';
export default async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.E2E_EMAIL!);
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\\/dashboard/);
  await page.context().storageState({ path: 'auth.json' });
  await browser.close();
};
\`\`\`

Then every test inherits the logged-in state from \`use.storageState\` in config. Compared to Selenium's manual cookie save-and-load, this is far simpler.

## CI changes

Selenium pipelines typically include a Grid bootstrap step. Playwright pipelines do not.

| Stage | Selenium (typical) | Playwright |
|---|---|---|
| Browser install | Pre-baked Docker image with browsers + drivers | \`npx playwright install --with-deps\` |
| Grid setup | \`docker-compose up\` hub + N nodes | None |
| Run | \`mvn test\` or \`pytest\` | \`npx playwright test\` |
| Report | TestNG XML + Allure | HTML report or Allure |
| Artifacts | Screenshots on failure | Trace.zip on retry |

A standard GitHub Actions workflow for Playwright fits in 30 lines.

## Gotchas and breaking changes

After porting four large Selenium suites, the following list captures every surprise we hit.

1. **No driver downloads.** Playwright manages browsers itself. Do not point Playwright at a system Chrome; use the bundled binaries.
2. **No explicit waits.** Replace \`WebDriverWait\` with web-first assertions. Resist the urge to add \`page.waitForTimeout\`.
3. **No PageFactory reflection.** Initialize locators directly in the constructor.
4. **Async everywhere.** Java and C# Selenium tests are synchronous. Plan for the cognitive shift to async/await if you port to TypeScript or async Python.
5. **iFrames are easy.** \`page.frameLocator(selector)\` returns a locator scoped to the frame. No more \`switchTo().frame\`.
6. **Multiple tabs.** \`context.on('page', ...)\` fires when a new tab opens. No more window handle tracking.
7. **CDP-only features.** Network mocking, geolocation override, request interception are first-class. They were either painful or impossible in Selenium.
8. **The trace viewer is the new debugger.** Train your team on it before retiring Selenium IDE workflows.
9. **\`@Test\` annotations vanish.** Playwright tests are plain async functions registered with \`test(name, fn)\`.
10. **Data providers become \`test.describe.parallel\`.** Use \`for (const data of cases) test('case ' + data.id, async ({page}) => {...})\` for parameterization.

## Migration checklist

- [ ] Inventory Selenium tests, page objects, helpers, custom waits.
- [ ] Decide on target language for Playwright (TypeScript recommended).
- [ ] Install Playwright in a sibling directory.
- [ ] Port the smoke suite (10 to 30 tests).
- [ ] Replicate authentication caching via \`storageState\`.
- [ ] Recreate page objects with Locator properties.
- [ ] Replace Grid with Playwright projects and sharding.
- [ ] Run both suites in CI; promote Playwright once parity reaches 80%.
- [ ] Delete Selenium dependencies and Grid infrastructure.
- [ ] Train team on trace viewer, fixtures, and codegen.
- [ ] Update onboarding docs and the [QA Skills directory](/skills).

## When not to migrate

Skip the migration if your suite is small (under 50 tests), runs reliably, and your team is productive. Skip it if you depend on a non-WebDriver tool that integrates only with Selenium (rare in 2026). Skip it if your test cloud provider charges per-runner and Playwright support is not yet first-class on that provider; check Sauce Labs and BrowserStack docs before committing.

## Deep dive: WebDriver protocol vs CDP

Selenium speaks the W3C WebDriver protocol exclusively. Every command is an HTTP POST or GET from your test process to the WebDriver server (chromedriver, geckodriver) and then to the browser. Each round trip adds latency, typically 50 to 200 milliseconds depending on network and browser. A test with 200 actions can spend 30 to 40 seconds purely on protocol overhead.

Playwright speaks the Chrome DevTools Protocol (CDP) directly for Chromium. CDP runs over a single WebSocket connection, with events flowing in both directions. Commands typically execute in tens of milliseconds. For Firefox, Playwright uses a custom protocol called Juggler that is CDP-equivalent. For WebKit, Playwright uses Apple's WebKit remote inspector protocol.

The practical effect: a smoke suite that takes Selenium 8 minutes typically takes Playwright 2 to 3 minutes on the same hardware. The savings compound across CI runs; many teams report total CI minutes dropping 60% in the first month.

## Deep dive: explicit waits no longer needed

In Selenium you write:

\`\`\`java
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
WebElement element = wait.until(ExpectedConditions.elementToBeClickable(By.id("submit")));
element.click();
\`\`\`

The explicit wait is necessary because Selenium's \`findElement\` does not wait for actionability. If you call \`click\` on an element that exists but is hidden, disabled, or covered by an overlay, the click fails or worse, silently misses.

In Playwright you write:

\`\`\`typescript
await page.locator('#submit').click();
\`\`\`

The \`click\` action implicitly waits for the element to be:

1. Attached to the DOM.
2. Visible (non-zero box, no \`display: none\`, no \`visibility: hidden\`).
3. Stable (not animating).
4. Enabled (no \`disabled\` attribute, no \`aria-disabled\`).
5. Receiving pointer events (not covered by an overlay).

If any of these conditions fail, Playwright retries until the action timeout (default 5 seconds) is exceeded. This eliminates 90% of the flake that explicit waits in Selenium are meant to address.

## Deep dive: trace viewer for Selenium teams

Selenium's debugging story is: screenshots on failure, optional video via third-party libraries, and Selenium logs. The Playwright trace viewer is a generational leap.

A trace is a single zip file containing:

1. Screenshots before and after every action.
2. DOM snapshots scrubbable in the UI.
3. Network requests with full headers and bodies.
4. Console messages with stack traces.
5. Source frames tied to each action.

Open with \`npx playwright show-trace trace.zip\`. Click any action in the timeline; the DOM snapshot, source line, and network panel update together. For teams that have spent years debugging Selenium failures by squinting at screenshots, the trace viewer is transformative.

Enable in config:

\`\`\`typescript
use: {
  trace: 'retain-on-failure',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
\`\`\`

Save \`test-results/\` as a CI artifact and engineers can download traces from any failed run.

## Deep dive: cross-browser parity

Selenium's cross-browser story is "install drivers for each browser, write capability sets, hope they all behave the same." Playwright unifies this: one API, three browsers (Chromium, Firefox, WebKit), automatic driver management.

\`\`\`typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
});
\`\`\`

\`npx playwright test\` runs all five projects in parallel. \`npx playwright test --project=firefox\` runs only Firefox. For teams that previously maintained one Selenium suite per browser, this is a major reduction in maintenance burden.

## Deep dive: from page-factory to constructor-initialized locators

The Selenium Java PageFactory pattern:

\`\`\`java
public class LoginPage {
  @FindBy(id = "email") WebElement email;
  @FindBy(id = "password") WebElement password;
  @FindBy(css = "button[type=submit]") WebElement submit;

  public LoginPage(WebDriver driver) {
    PageFactory.initElements(driver, this);
  }

  public void loginAs(String email, String password) {
    this.email.sendKeys(email);
    this.password.sendKeys(password);
    submit.click();
  }
}
\`\`\`

PageFactory uses reflection to wire fields lazily. The Playwright equivalent is plain TypeScript constructor initialization:

\`\`\`typescript
export class LoginPage {
  constructor(readonly page: Page) {}

  email = this.page.getByLabel('Email');
  password = this.page.getByLabel('Password');
  submit = this.page.getByRole('button', { name: 'Sign in' });

  async loginAs(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
\`\`\`

No reflection, no annotation magic, full TypeScript type safety. Locators are lazy by virtue of how Playwright's Locator class works; the underlying DOM query happens at action time.

## Deep dive: replacing Selenium Grid in Kubernetes

If you run Selenium Grid on Kubernetes, the migration to Playwright eliminates an entire infrastructure layer. Playwright tests run in CI runner containers, and sharding distributes the load.

For 1,000 tests across 10 GitHub Actions runners, sharding produces 10 parallel workers each handling ~100 tests. Total wall-clock time matches what a 10-node Selenium Grid produced, but without the grid hub, the event bus, the session map, or the node lifecycle management. Kubernetes resource usage drops by 80% in many cases.

## Conclusion and next steps

Selenium served the QA community well for two decades. In 2026 it is no longer the right default for new web automation projects, and many established teams find the migration to Playwright produces faster, more reliable, more debuggable suites. The migration is mechanical for the bulk of tests; the page object pattern, fixture model, and trace viewer are pleasant upgrades.

Start with an audit, then port the smoke suite end-to-end before scaling. Keep Selenium running in CI until Playwright is green for ten consecutive working days. Train the team on the trace viewer last; it sells the migration on its own.

Next read: explore the [QA Skills directory](/skills) for Playwright-aware skills, and the [blog index](/blog) for sharding, codegen, and trace-viewer deep dives.
`,
};
