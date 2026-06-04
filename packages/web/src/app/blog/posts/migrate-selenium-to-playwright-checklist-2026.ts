import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium to Playwright Migration: Complete 2026 Checklist',
  description:
    'A step-by-step Selenium to Playwright migration checklist for 2026: locator mapping table, WebDriverWait to auto-wait, Grid to workers, POM port, and real code.',
  date: '2026-06-04',
  category: 'Guide',
  content: `
# Selenium to Playwright Migration: Complete 2026 Checklist

Migrating from Selenium to Playwright is one of the most common test-engineering projects of 2026, and for good reason. Selenium has been the workhorse of browser automation for over a decade and remains a capable, standards-based tool — but teams running large Selenium suites keep hitting the same walls: flakiness from manual waits, the operational burden of Selenium Grid, slow execution without heavy parallelization work, and verbose driver-management boilerplate. Playwright, Microsoft's open-source automation framework, was designed with those pain points as first principles. It ships auto-waiting locators that eliminate most flakiness, built-in parallelism via workers with no Grid to operate, a trace viewer that makes failures debuggable in seconds, network interception out of the box, and one install command that bundles browser binaries. The result is that a well-executed migration typically produces faster, less flaky, more maintainable tests with less code — which is exactly why so many teams are making the move.

This is a complete, practical migration checklist rather than a sales pitch. A real migration is not a find-and-replace; it is a phased project with conceptual shifts you must internalize, the biggest being the move from Selenium's explicit-wait mindset to Playwright's auto-waiting model. We give you a phased rollout plan that lets old and new suites coexist, a detailed locator mapping table from Selenium's \`By\` strategies to Playwright locators, side-by-side before-and-after code for the patterns you will convert most often, guidance on porting your Page Object Model, replacing \`WebDriverWait\`/\`ExpectedConditions\` with auto-waiting and web-first assertions, swapping Selenium Grid for Playwright workers and sharding, and the gotchas that trip teams up — multi-tab handling, file uploads, iframes, and the temptation to port \`Thread.sleep\` calls verbatim. Examples are shown in both the Selenium-Java idiom and the Playwright-TypeScript idiom, since most migrations cross both a framework and often a language boundary, with notes for teams staying in Python or Java via Playwright's official bindings.

## Phase 0: Decide scope, language, and coexistence strategy

Before converting a single test, make three decisions. First, scope: do you migrate everything, or only new tests plus the highest-value flaky existing tests? For most teams a big-bang rewrite is the wrong call — it freezes feature coverage for months. The pragmatic approach is to run Selenium and Playwright side by side, writing all new tests in Playwright and porting existing tests opportunistically, prioritizing the flakiest and most business-critical ones first. Both suites run in CI until the Selenium suite shrinks to nothing.

Second, language. Playwright has first-class bindings for TypeScript/JavaScript, Python, Java, and .NET. If your team is deeply invested in Java with JUnit/TestNG, Playwright for Java lets you migrate concepts without abandoning the language, easing the transition. But the richest ecosystem, tooling (UI mode, codegen, trace viewer), and community examples are in TypeScript, so many teams use the migration as an opportunity to standardize on Playwright-TypeScript. Decide deliberately; do not drift.

Third, coexistence mechanics: keep the two suites in separate directories with separate CI jobs and reporting so a migration-in-progress repo stays green and legible. Tag ported tests so you can track migration progress as a burn-down. This phase-0 discipline is what separates a smooth multi-month migration from a stalled rewrite that nobody trusts.

## Phase 1: Install Playwright and learn the mental model

Installation is dramatically simpler than Selenium's driver dance. There is no \`WebDriverManager\`, no matching a chromedriver version to your Chrome, no Grid hub to stand up. One command scaffolds the project and downloads pinned browser binaries:

\`\`\`bash
npm init playwright@latest
# scaffolds playwright.config.ts, a tests/ folder, GitHub Actions workflow,
# and installs Chromium, Firefox, and WebKit binaries
\`\`\`

The mental model shift matters more than the install. In Selenium you imperatively command a driver and manage timing yourself; in Playwright you declare locators that auto-wait for the element to be actionable, and assertions retry until they pass or time out. This single difference eliminates most of the flakiness that plagues Selenium suites. Internalize three Playwright concepts before porting code: **locators are lazy and auto-waiting** (creating one does no work; using one waits for actionability), **web-first assertions retry** (\`await expect(locator).toBeVisible()\` polls until true), and **browser contexts provide isolation** (each test gets a fresh, cheap context instead of a new browser, replacing Selenium's expensive per-test driver instantiation). Porting code without absorbing these leads to tests that work but reintroduce Selenium-era anti-patterns.

## Phase 2: The locator mapping table

The most mechanical part of the migration is translating Selenium \`By\` strategies into Playwright locators. Playwright supports CSS and XPath for a direct port, but the migration's real payoff comes from adopting user-facing, role-based locators that are far more resilient. Use this table as your conversion reference:

| Selenium (Java) | Playwright (TypeScript) | Notes |
|---|---|---|
| \`By.id("email")\` | \`page.locator('#email')\` | Direct CSS port |
| \`By.cssSelector(".btn")\` | \`page.locator('.btn')\` | Direct CSS port |
| \`By.xpath("//button")\` | \`page.locator('//button')\` or \`page.locator('xpath=//button')\` | XPath supported but discouraged |
| \`By.name("q")\` | \`page.locator('[name="q"]')\` | Attribute selector |
| \`By.className("card")\` | \`page.locator('.card')\` | CSS class |
| \`By.linkText("Sign in")\` | \`page.getByRole('link', { name: 'Sign in' })\` | Prefer role-based |
| \`By.partialLinkText("Sign")\` | \`page.getByRole('link', { name: 'Sign', exact: false })\` | Substring match |
| \`By.tagName("button")\` + text | \`page.getByRole('button', { name: 'Submit' })\` | Role + accessible name |
| label-based lookups | \`page.getByLabel('Email address')\` | Form fields by label |
| placeholder lookups | \`page.getByPlaceholder('Search')\` | Inputs by placeholder |
| \`data-testid\` via CSS | \`page.getByTestId('submit')\` | Configurable test-id attribute |
| visible text via XPath | \`page.getByText('Welcome back')\` | Text content |

The discipline to adopt: do a direct CSS/XPath port first if you must move fast, then refactor the highest-traffic locators toward \`getByRole\`, \`getByLabel\`, and \`getByTestId\`. Role-based locators survive CSS-class churn and styling refactors that would break a brittle Selenium selector, which is where much of your long-term maintenance savings comes from.

## Phase 3: Replace WebDriverWait with auto-waiting

This is the single most important conceptual change, and getting it right is where flakiness disappears. Selenium requires you to explicitly wait for conditions; forget a wait and you get a race condition, add too many and your tests crawl. Playwright auto-waits on every action and provides retrying web-first assertions, so most explicit waits simply vanish. Here is the canonical before-and-after.

Selenium (Java) with explicit waits:

\`\`\`java
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
WebElement button = wait.until(
    ExpectedConditions.elementToBeClickable(By.id("submit")));
button.click();

WebElement banner = wait.until(
    ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".success")));
assertEquals("Saved", banner.getText());
\`\`\`

Playwright (TypeScript) with auto-waiting and web-first assertions:

\`\`\`typescript
// No explicit wait: click() auto-waits for the button to be actionable
await page.locator('#submit').click();

// Assertion retries until the banner is visible and has the text
await expect(page.locator('.success')).toHaveText('Saved');
\`\`\`

The Playwright version is shorter, more readable, and structurally less flaky because the framework owns the timing. The migration anti-pattern to forbid: porting \`ExpectedConditions\` calls into \`page.waitForSelector\` everywhere. You almost never need explicit waits in Playwright — if you reach for one, first ask whether an auto-waiting action or a retrying assertion already covers it. The only legitimate explicit waits are for non-DOM conditions like a specific network response (\`page.waitForResponse\`) or a navigation, and even those are rarer than Selenium habits suggest.

## Phase 4: Kill every Thread.sleep

Closely related and worth its own checklist item: eliminate all fixed sleeps. Selenium suites accumulate \`Thread.sleep(2000)\` (Java) and \`time.sleep(2)\` (Python) as quick fixes for timing problems, and these are pure poison — they make tests slow when the app is fast and flaky when the app is slow. A naive migration ports them to \`page.waitForTimeout(2000)\`, which Playwright explicitly documents as discouraged outside debugging.

The rule: there should be zero \`waitForTimeout\` calls in your migrated suite. Every sleep maps to either an auto-waiting action (the click already waits), a retrying assertion (\`expect(...).toBeVisible()\` waits for appearance), or, for genuine async backend work, a specific condition wait:

\`\`\`typescript
// WRONG (ported sleep): arbitrary, slow, and flaky
await page.waitForTimeout(3000);
await expect(page.locator('.order-status')).toHaveText('Confirmed');

// RIGHT: wait for the actual condition, no arbitrary delay
await expect(page.locator('.order-status')).toHaveText('Confirmed', { timeout: 10000 });
\`\`\`

Grepping the migrated codebase for \`waitForTimeout\` and \`sleep\` and driving the count to zero is one of the most effective quality gates in the entire migration. It is the difference between a suite that merely runs and one that is genuinely fast and reliable.

## Phase 5: Port the Page Object Model

Most mature Selenium suites use the Page Object Model, and the pattern ports cleanly — but you should modernize it rather than transliterate it. In Selenium, page objects typically store \`By\` locators and have methods that find elements and act on them with explicit waits. In Playwright, page objects store \`Locator\` instances (or expose locator-returning getters) and methods that act directly, with auto-waiting handling timing. The constructor takes the \`Page\` instead of the \`WebDriver\`.

Selenium page object (Java):

\`\`\`java
public class LoginPage {
  private final WebDriver driver;
  private final By email = By.id("email");
  private final By password = By.id("password");
  private final By submit = By.cssSelector("[type=submit]");

  public LoginPage(WebDriver driver) { this.driver = driver; }

  public void login(String user, String pass) {
    new WebDriverWait(driver, Duration.ofSeconds(10))
      .until(ExpectedConditions.visibilityOfElementLocated(email));
    driver.findElement(email).sendKeys(user);
    driver.findElement(password).sendKeys(pass);
    driver.findElement(submit).click();
  }
}
\`\`\`

Playwright page object (TypeScript):

\`\`\`typescript
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(private page: Page) {
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password');
    this.submit = page.getByRole('button', { name: 'Sign in' });
  }

  async login(user: string, pass: string) {
    await this.email.fill(user);
    await this.password.fill(pass);
    await this.submit.click();
  }
}
\`\`\`

The Playwright version is shorter, the explicit waits are gone, and the locators are role/label-based for resilience. Port one representative page object first, establish the conventions, then convert the rest against that template so the whole suite stays consistent.

## Phase 6: Replace Selenium Grid with workers and sharding

Operationally, this is the phase teams enjoy most because it deletes infrastructure. Selenium parallelization usually means standing up and maintaining a Selenium Grid — a hub and nodes, container orchestration, version matching, and a perennial source of flakiness and ops toil. Playwright runs tests in parallel by default using worker processes on a single machine, with no Grid to operate. You set parallelism in config:

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined, // auto-detect locally
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
\`\`\`

For scaling across many CI machines, Playwright offers native **sharding** — split the suite into N shards run on N machines and merge the reports — which replaces what you would have used a large Grid for:

\`\`\`bash
# On 4 CI machines, machine index 1..4:
npx playwright test --shard=1/4
npx playwright test --shard=2/4
# then merge: npx playwright merge-reports ./all-blobs
\`\`\`

Cross-browser coverage that Grid provided via remote nodes is handled by Playwright projects targeting Chromium, Firefox, and WebKit locally. The net effect: you delete the Grid infrastructure, get faster parallel runs, and gain WebKit (real Safari engine) coverage that Selenium handles awkwardly.

## Phase 7: Handle the gotchas — tabs, uploads, iframes, downloads

A handful of patterns differ enough to cause migration friction; budget time for them explicitly. **Multi-tab/window handling** changes from Selenium's \`driver.getWindowHandles()\` switching to Playwright's event-based \`context.waitForEvent('page')\`, which returns the new page object directly. **File uploads** become trivial — \`await page.locator('input[type=file]').setInputFiles('path.pdf')\` replaces sending keys to an input or fighting native dialogs. **iframes** use \`page.frameLocator('#frame').getByRole(...)\` rather than \`driver.switchTo().frame()\`, and you do not need to switch back. **Downloads** use \`page.waitForEvent('download')\` to capture and save files cleanly, where Selenium required browser-profile configuration. **Alerts/dialogs** are handled by registering a \`page.on('dialog', ...)\` handler before the action, rather than \`driver.switchTo().alert()\` after.

The cross-cutting gotcha is the temptation to fight Playwright's model with Selenium habits — manually switching frames, polling for windows, sleeping for downloads. Each of these has a cleaner Playwright idiom; resist porting the old approach. Capturing these conversions in your team's migration guide once, with examples, prevents every engineer from rediscovering them painfully.

## Phase 8: Wire up CI, reporting, and the burn-down

Finalize the migration mechanics in CI. Playwright's scaffolding already generated a GitHub Actions workflow; integrate it alongside (not replacing) the Selenium job during coexistence. Adopt the HTML reporter for local debugging and a JUnit or Allure reporter if your dashboards consume those, and turn on trace-on-first-retry so failures come with a full trace you can open in the trace viewer — a debugging capability Selenium has no equivalent for. Configure retries conservatively (one retry in CI) and treat any test that needs more as a flakiness bug to fix, not to paper over.

Track the migration as a burn-down: count of Selenium tests remaining versus ported, visible in every standup. The coexistence model means you are never blocked — features keep getting Playwright coverage while the Selenium backlog shrinks — and the burn-down keeps the project from stalling at 80%. When the Selenium count hits zero, delete the Selenium job, dependencies, and Grid configuration in one satisfying cleanup commit.

## Accelerate the migration with AI and skills

Migration is largely mechanical translation plus pattern application, which is exactly what AI coding agents do well — if you give them the right patterns. An agent with Playwright knowledge can convert a Selenium page object to the Playwright idiom, swap \`WebDriverWait\` for auto-waiting, and flag every \`Thread.sleep\` for you, dramatically compressing the per-file effort. The key is not to trust the model's defaults but to load vetted Playwright patterns so it ports to \`getByRole\` locators and web-first assertions rather than transliterating brittle selectors.

Browse installable Playwright and migration QA skills at [/skills](/skills) and load them into Claude Code, Cursor, or Copilot so the agent applies the conventions in this checklist automatically across your suite. Pair the agent with the migration burn-down: have it draft each port, review the diff against this checklist (zero \`waitForTimeout\`, role-based locators, page-object conventions), and merge. For deeper before-and-after patterns and CI integration details, the related guides on the [/blog](/blog) walk through Playwright fixtures, trace-viewer debugging, and parallel execution that complement this migration plan.

## Converting Selenium fixtures and setup to Playwright

Test setup and teardown is an area where a literal port produces worse code than a thoughtful rewrite, so handle it as a deliberate step. Selenium suites typically manage the driver lifecycle in JUnit/TestNG \`@BeforeEach\`/\`@AfterEach\` (or pytest fixtures), instantiating a fresh \`WebDriver\` per test, quitting it after, and sharing setup like login through base classes or helper methods. This per-test driver instantiation is expensive and is one reason Selenium suites run slowly. Playwright's model is fundamentally cheaper: a single browser is launched once, and each test gets a fresh, lightweight browser **context** for isolation, which is created and discarded in milliseconds.

The right conversion replaces driver-lifecycle boilerplate with Playwright fixtures rather than transliterating it. Playwright's built-in \`page\` fixture already gives each test an isolated page, so most of your \`@BeforeEach\` driver setup simply disappears. Shared setup like authentication becomes a custom fixture or — better — the \`storageState\` pattern, where you log in once, save the authenticated cookies and local storage to a file, and reuse that state across all tests so they skip the login UI entirely:

\`\`\`typescript
// global-setup.ts: authenticate once, persist state
import { chromium } from '@playwright/test';

export default async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://app.example.com/login');
  await page.getByLabel('Email').fill('demo@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.context().storageState({ path: 'auth.json' });
  await browser.close();
}
// then in config: use: { storageState: 'auth.json' }
\`\`\`

This single change often delivers a large speed win on its own, because the typical Selenium suite logs in through the UI in every test's setup. Migrating setup is therefore not just translation — it is an opportunity to eliminate redundant work the Selenium architecture forced on you. Convert your base-class setup into fixtures and \`storageState\` early, since every ported test will depend on the new setup conventions.

## Validating the migration: proving the new suite is better

A migration is not done when the tests pass; it is done when you have evidence the new suite is genuinely faster, less flaky, and more maintainable than what it replaced. Establish baseline metrics from the Selenium suite before you start — total wall-clock runtime in CI, flaky-test rate (failures that pass on retry), and the count of \`Thread.sleep\`/explicit-wait calls — and track the same metrics for the Playwright suite as it grows. If the new suite is not measurably better on these axes, something in the port reintroduced Selenium-era anti-patterns and you should investigate rather than declaring victory.

Three validation gates catch the common regressions. First, a static gate: grep the migrated suite for \`waitForTimeout\` and \`page.waitForSelector\` and require near-zero counts, since their presence signals ported sleeps and unnecessary explicit waits. Second, a flakiness gate: run the Playwright suite multiple times in CI and require a flaky rate well below the old Selenium baseline; auto-waiting should make this dramatic, and if it does not, the port likely used brittle locators or raced on network. Third, a parity gate: confirm the Playwright suite covers the same user journeys as the Selenium tests it replaced, using your burn-down tagging so no coverage silently disappears in the shuffle. Run these gates throughout, not just at the end, and the migration produces what it promised — a faster, more reliable, lower-maintenance suite — rather than a lateral move that merely swapped one framework's problems for another's. When the metrics confirm the win and the Selenium count reaches zero, you have not just migrated tools; you have measurably improved your testing.

## Frequently Asked Questions

### Should I migrate from Selenium to Playwright in 2026?

For most teams hitting flakiness, slow execution, or Selenium Grid operational burden, yes. Playwright's auto-waiting eliminates most flakiness, workers replace Grid with zero infrastructure, and the trace viewer makes debugging far faster, typically producing faster and more maintainable tests with less code. Migrate if those pains apply; Selenium remains fine if you have a stable, satisfactory suite.

### How do I convert Selenium WebDriverWait to Playwright?

In most cases you delete the wait entirely. Playwright actions auto-wait for elements to be actionable, and web-first assertions like expect(locator).toBeVisible() retry until they pass. Replace ExpectedConditions.elementToBeClickable plus click with a plain locator.click(), and replace visibility waits with retrying assertions. Reserve explicit waits only for non-DOM conditions like waitForResponse.

### What is the best way to handle Selenium Grid when migrating to Playwright?

Delete it. Playwright runs tests in parallel using worker processes on a single machine with no Grid to operate, configured via the workers option. For scaling across CI machines, use native sharding with --shard=i/n and merge-reports. Cross-browser coverage that Grid nodes provided is handled by Playwright projects targeting Chromium, Firefox, and WebKit locally.

### Can I keep my Page Object Model when migrating to Playwright?

Yes, the pattern ports cleanly and you should modernize it. Page objects take the Page in the constructor instead of the WebDriver, store Locator instances (ideally getByRole and getByLabel), and have action methods that rely on auto-waiting instead of explicit waits. The result is shorter, more resilient page objects. Port one as a template, then convert the rest consistently.

### How long does a Selenium to Playwright migration take?

It depends on suite size, but a phased coexistence approach avoids a long freeze. Write all new tests in Playwright immediately, port the flakiest and most critical existing tests first, and run both suites in CI until the Selenium count burns down to zero. A medium suite often migrates over a few months of incremental effort rather than one blocking rewrite.

### What are the biggest gotchas when migrating from Selenium to Playwright?

The top traps are porting Thread.sleep to waitForTimeout (forbid both), transliterating brittle CSS or XPath instead of adopting role-based locators, and fighting Playwright's model with Selenium habits for tabs, iframes, and downloads. Multi-tab uses waitForEvent('page'), iframes use frameLocator, uploads use setInputFiles, and downloads use waitForEvent('download') rather than the Selenium equivalents.

### Does Playwright support Java and Python for teams not moving to TypeScript?

Yes. Playwright has official bindings for Java, Python, and .NET in addition to TypeScript and JavaScript, so a Java team can migrate concepts without abandoning the language. TypeScript has the richest tooling and community examples, so some teams standardize on it during migration, but staying in Java or Python via the official bindings is fully supported and eases the transition.

## Conclusion

A Selenium to Playwright migration in 2026 is a high-return project when run as a phased, coexistence-based effort rather than a big-bang rewrite. The mechanical work — translating locators with the mapping table, porting page objects, swapping Grid for workers and sharding — is straightforward. The conceptual work is what delivers the payoff: replacing WebDriverWait with auto-waiting, driving every Thread.sleep and waitForTimeout to zero, and adopting role-based locators that survive UI churn. Do those well and you end up with a suite that is faster, less flaky, and cheaper to maintain.

Compress the per-file effort by putting an AI coding agent to work with vetted Playwright patterns instead of untrained defaults. Install Playwright and migration skills at [/skills](/skills), load them into your agent, and let it draft each port for you to review against this checklist. Explore the complementary Playwright fixtures, trace-viewer, and parallel-execution guides on the [/blog](/blog) to round out the migration. Start with phase 0 today, keep both suites green, and burn the Selenium backlog down to a clean cutover.
`,
};
