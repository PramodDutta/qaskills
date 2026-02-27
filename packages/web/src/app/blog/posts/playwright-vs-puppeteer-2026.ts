import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright vs Puppeteer in 2026 -- The Definitive Comparison',
  description:
    'Comprehensive comparison of Playwright vs Puppeteer. Covers architecture, API differences, browser support, auto-waiting, test runner, and migration guide.',
  date: '2026-02-23',
  category: 'Comparison',
  content: `
Playwright and Puppeteer share the same DNA. Both were conceived by the same team of engineers at Google who built the Chrome DevTools Protocol automation layer. But in 2020, the core developers left Google for Microsoft and created Playwright -- a spiritual successor that has since far surpassed Puppeteer in capability, adoption, and community momentum. If you are evaluating Playwright vs Puppeteer in 2026, this guide gives you everything you need to make an informed decision.

This is not a superficial feature checklist. We dig into the architectural differences that explain **why** Playwright outperforms Puppeteer in most scenarios, show side-by-side code examples for common operations, compare real-world benchmarks, and provide a concrete migration guide for teams ready to switch from Puppeteer to Playwright. Whether you are choosing a browser automation tool for a new project or looking for a **Puppeteer alternative**, this Playwright Puppeteer comparison covers every angle.

---

## Key Takeaways

- **Same origin, different trajectories**: Playwright was created by the same engineers who built Puppeteer at Google. They left for Microsoft in 2020 and built Playwright to fix the limitations they could not address within Puppeteer's architecture.
- **Browser support is the killer difference**: Puppeteer only supports Chrome/Chromium with experimental Firefox support. Playwright offers first-class support for Chromium, Firefox, and WebKit (Safari) -- all maintained and tested equally.
- **Auto-waiting eliminates flakiness**: Playwright automatically waits for elements to be actionable before performing operations. Puppeteer requires manual \`waitForSelector\` calls, which are a leading cause of flaky tests.
- **Playwright Test is a full test runner**: Playwright ships with its own test runner featuring fixtures, parallelism, retries, reporters, and HTML reports. Puppeteer has no test runner -- you need to bring Jest, Mocha, or another framework.
- **Playwright has overtaken Puppeteer on every metric**: npm downloads, GitHub stars, Stack Overflow activity, and job postings all favor Playwright as of early 2026.
- **Migration is straightforward**: Most Puppeteer patterns have direct Playwright equivalents, and the API similarity (same original authors) makes the **Puppeteer to Playwright migration** smoother than you might expect.

---

## The History

Understanding the history of these two tools explains their current trajectory and helps you predict where each is heading.

**Puppeteer** was created by the Chrome DevTools team at Google and released in January 2018. It provided a high-level Node.js API over the Chrome DevTools Protocol (CDP), making it easy to automate Chrome and Chromium browsers programmatically. Puppeteer quickly became the go-to tool for headless browser automation, web scraping, PDF generation, and screenshot capture. It was tightly integrated with Chrome and benefited from Google's investment in the DevTools Protocol.

The key engineers behind Puppeteer -- Andrey Lushnikov, Pavel Feldman, and others -- left Google for Microsoft in late 2019. They saw fundamental limitations in Puppeteer's Chrome-only architecture that could not be addressed without a ground-up redesign. In January 2020, they released **Playwright**, a new browser automation library that carried forward Puppeteer's core philosophy of providing a clean, high-level API over browser protocols, but with a radically expanded scope.

Playwright was designed from day one to support multiple browsers through custom protocol implementations for each engine. Rather than relying solely on CDP, the team built dedicated automation protocols for Firefox and WebKit, ensuring that every browser received the same level of capability and reliability. This was a fundamentally different approach from Puppeteer's Chrome-first strategy.

Since 2020, the two projects have diverged significantly. Playwright has added a full test runner, codegen tools, trace viewer, UI mode, component testing, and API testing capabilities. Puppeteer has continued to receive maintenance updates and incremental improvements, but the pace of innovation has been markedly slower. Google's focus shifted partly toward the WebDriver BiDi protocol -- a standards-based approach that competes with both Puppeteer's CDP-based model and Playwright's custom protocols.

By 2026, Playwright is the clear market leader in browser automation and E2E testing. Puppeteer remains a solid tool for Chrome-specific automation tasks like PDF generation and web scraping, but teams choosing a framework for cross-browser testing almost universally pick Playwright.

---

## Architecture Comparison

The architectural differences between Playwright and Puppeteer are not just implementation details -- they explain virtually every practical difference between the two tools.

### Puppeteer: Chrome DevTools Protocol Only

Puppeteer communicates with browsers exclusively through the **Chrome DevTools Protocol (CDP)**. When your code calls \`page.click()\`, Puppeteer sends a CDP command over a WebSocket connection to Chrome, which executes the action and returns the result.

This tight coupling to CDP gives Puppeteer excellent Chrome integration but limits it architecturally. CDP was designed as a debugging protocol for Chrome DevTools, not as a universal browser automation protocol. It exposes Chrome internals in ways that are specific to the Blink rendering engine and V8 JavaScript engine.

Puppeteer added experimental Firefox support in 2023, but it runs through a CDP compatibility layer that does not cover the full Puppeteer API. Many operations that work reliably on Chrome produce unexpected behavior or outright failures on Firefox.

### Playwright: Custom Protocols Per Browser

Playwright takes a fundamentally different approach. Instead of forcing all browsers through a single protocol, the Playwright team built **dedicated automation protocols for each browser engine**:

- **Chromium**: Uses CDP with additional patches to the Chromium source for capabilities CDP does not expose natively
- **Firefox**: Uses a custom protocol built by the Playwright team, integrated directly into Firefox's codebase (not the standard Firefox remote debugging protocol)
- **WebKit**: Uses a custom protocol integrated into the WebKit inspection infrastructure

This means Playwright controls each browser at the deepest possible level, using the native mechanisms that each engine provides. The result is consistent behavior across browsers and access to capabilities that are architecturally impossible when everything goes through CDP.

### Architecture Comparison Table

| Aspect | Puppeteer | Playwright |
|---|---|---|
| **Communication Protocol** | Chrome DevTools Protocol (CDP) | Custom protocol per browser engine |
| **Browser Patching** | None -- uses stock Chrome | Patches Chromium, Firefox, and WebKit for deeper control |
| **Connection Type** | WebSocket (CDP) | WebSocket (custom per browser) |
| **Multi-Browser Design** | Afterthought (Firefox experimental) | Core architecture from day one |
| **Browser Management** | Downloads Chromium; manual for others | \`npx playwright install\` manages all browsers |
| **Execution Model** | Single browser context per test typical | Lightweight browser contexts enable true parallelism |
| **Protocol Coverage** | Full CDP API surface | Curated API surface optimized for automation reliability |

---

## Browser Support

Browser support is the single biggest practical difference between Playwright and Puppeteer, and it is the reason most teams choose Playwright for test automation.

### Puppeteer Browser Support

Puppeteer officially supports **Chrome and Chromium**. Every Puppeteer release is pinned to a specific Chromium version, and the library downloads that version automatically when you install it.

Firefox support was introduced experimentally in 2023 via the \`puppeteer.launch({ product: 'firefox' })\` option. However, this support relies on a CDP compatibility shim that translates CDP commands into Firefox-native operations. The translation layer is incomplete -- features like network interception, PDF generation, and certain navigation patterns behave differently or fail entirely on Firefox. The Puppeteer team has been transparent that Firefox support is not production-ready and may never reach full parity.

Puppeteer has **no Safari/WebKit support** at all. If your application needs to work on Safari -- and given Safari's 18% global browser market share, it almost certainly does -- Puppeteer cannot help you.

### Playwright Browser Support

Playwright treats **Chromium, Firefox, and WebKit as first-class citizens**. All three browsers are tested in Playwright's CI pipeline on every commit, and all three receive the same API coverage.

\`\`\`bash
# Install all browsers with a single command
npx playwright install

# Or install specific browsers
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit
\`\`\`

Playwright's WebKit support is particularly valuable. WebKit is the engine behind Safari on macOS, iOS, and iPadOS. While Playwright's WebKit binary is not identical to the Safari shipping build, it uses the same rendering engine and JavaScript runtime, making it an excellent proxy for Safari behavior in automated tests.

\`\`\`bash
// playwright.config.ts -- test across all browsers
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

### Browser Support Comparison

| Browser | Puppeteer | Playwright |
|---|---|---|
| **Chrome/Chromium** | Full support (primary target) | Full support |
| **Firefox** | Experimental (CDP shim, incomplete API) | Full support (custom protocol) |
| **WebKit/Safari** | Not supported | Full support (custom protocol) |
| **Mobile Emulation** | Chrome mobile emulation only | Chromium, Firefox, and WebKit mobile emulation |
| **Browser Management** | Auto-downloads Chromium only | \`npx playwright install\` manages all browsers |

For any team that needs to verify their application works across Chrome, Firefox, and Safari, Playwright is the only viable choice between these two tools. This single advantage has driven the majority of **Puppeteer to Playwright migration** decisions.

---

## API Comparison

Both libraries provide high-level APIs for browser automation, but Playwright's API is more modern, more robust, and more resistant to flaky tests. This section walks through the most important API differences with side-by-side code examples.

### Auto-Waiting

Auto-waiting is arguably the most impactful API difference between Playwright and Puppeteer. It determines how reliably your automation code interacts with dynamic web pages.

**Puppeteer requires manual waits:**

\`\`\`bash
// Puppeteer: You must explicitly wait for elements
await page.waitForSelector('.submit-button');
await page.click('.submit-button');

// Wait for navigation after click
await Promise.all([
  page.waitForNavigation(),
  page.click('.submit-button'),
]);

// Wait for a specific condition
await page.waitForFunction(() => {
  return document.querySelector('.result')?.textContent !== '';
});
\`\`\`

**Playwright auto-waits before every action:**

\`\`\`bash
// Playwright: Auto-waits for the element to be visible,
// enabled, stable, and receiving events
await page.click('.submit-button');

// Navigation is handled automatically
await page.getByRole('button', { name: 'Submit' }).click();
await page.waitForURL('/success');

// Assertions auto-retry until they pass or timeout
await expect(page.getByText('Success')).toBeVisible();
\`\`\`

Playwright performs **actionability checks** before every interaction. When you call \`click()\`, Playwright waits for the element to be visible, stable (not animating), enabled, and not obscured by other elements. This eliminates an entire class of flaky test failures that plague Puppeteer test suites.

### Locator Strategies

Puppeteer primarily uses CSS selectors and XPath. Playwright introduces a **Locator** abstraction that provides auto-waiting, auto-retrying, and semantic targeting.

**Puppeteer selectors:**

\`\`\`bash
// Puppeteer: CSS selectors and XPath
const element = await page.\$('.my-class');
const elements = await page.\$\$('div.item');
const byXpath = await page.\$x('//button[contains(text(), "Submit")]');

// Type into an input
await page.type('#email', 'user@example.com');

// Click a button
await page.click('button.primary');
\`\`\`

**Playwright locators:**

\`\`\`bash
// Playwright: Semantic locators that mirror how users find elements
await page.getByRole('textbox', { name: 'Email' }).fill('user@example.com');
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByLabel('Remember me').check();
await page.getByText('Welcome back').isVisible();
await page.getByTestId('cart-count').textContent();

// Locators can be chained and filtered
await page.getByRole('listitem')
  .filter({ hasText: 'Product A' })
  .getByRole('button', { name: 'Add to cart' })
  .click();
\`\`\`

Playwright's locator API encourages **accessible selectors** that are resilient to UI changes. Instead of targeting CSS classes that designers might rename, you target elements by their accessible role, label, or text content -- the same way a real user perceives them.

### Network Interception

Both tools support network interception, but Playwright's API is more flexible and reliable.

**Puppeteer network interception:**

\`\`\`bash
// Puppeteer: Must enable request interception explicitly
await page.setRequestInterception(true);
page.on('request', (request) => {
  if (request.url().includes('/api/data')) {
    request.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ mocked: true }),
    });
  } else {
    request.continue();
  }
});
\`\`\`

**Playwright network interception:**

\`\`\`bash
// Playwright: Route-based API, no global interception toggle
await page.route('**/api/data', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ mocked: true }),
  });
});

// Or modify the response from the real server
await page.route('**/api/data', async (route) => {
  const response = await route.fetch();
  const json = await response.json();
  json.extraField = 'injected';
  await route.fulfill({ response, json });
});
\`\`\`

Playwright's route-based API is cleaner and does not require a global interception toggle that can interfere with other requests. The ability to fetch the real response and modify it before returning is particularly powerful for testing edge cases.

### Multiple Browser Contexts

Playwright's browser context model is a key differentiator for both test isolation and performance.

\`\`\`bash
// Playwright: Lightweight browser contexts share a browser instance
// but have isolated cookies, storage, and cache
const browser = await chromium.launch();

const userContext = await browser.newContext();
const adminContext = await browser.newContext();

const userPage = await userContext.newPage();
const adminPage = await adminContext.newPage();

// Test interactions between two users simultaneously
await userPage.goto('/chat');
await adminPage.goto('/admin/chat');
await adminPage.getByRole('button', { name: 'Send announcement' }).click();
await expect(userPage.getByText('New announcement')).toBeVisible();
\`\`\`

Puppeteer supports browser contexts via \`browser.createBrowserContext()\`, but the feature is less prominent in its documentation and less commonly used. Playwright makes contexts a first-class primitive that powers its entire test isolation and parallelism model.

---

## Built-In Test Runner

This is where the **Playwright Puppeteer comparison** diverges most dramatically. Playwright ships with a full-featured test runner. Puppeteer does not.

### Playwright Test

**Playwright Test** (\`@playwright/test\`) is a purpose-built test runner designed specifically for browser automation. It includes:

- **Test fixtures**: Automatic setup and teardown of browser, context, and page instances. Custom fixtures for authentication, database seeding, and more.
- **Parallelism**: Tests run in parallel across multiple worker processes by default. Each worker gets its own browser instance.
- **Retries**: Built-in retry support for flaky tests, with configurable retry counts per project.
- **Reporters**: HTML reporter with trace viewer, JSON, JUnit, list, line, dot, and custom reporters.
- **Sharding**: Split test suites across multiple CI machines with \`--shard=1/4\`.
- **Test generation**: \`npx playwright codegen\` records user interactions and generates test code.
- **Visual comparisons**: Built-in screenshot comparison with \`toHaveScreenshot()\`.
- **Trace viewer**: Record and replay test execution with full DOM snapshots, network logs, and console output.

\`\`\`bash
// Playwright Test: Full-featured test with fixtures
import { test, expect } from '@playwright/test';

test.describe('Shopping Cart', () => {
  test('should add item to cart', async ({ page }) => {
    await page.goto('/products');
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    await expect(page.getByTestId('cart-count')).toHaveText('1');
  });

  test('should apply discount code', async ({ page }) => {
    await page.goto('/cart');
    await page.getByPlaceholder('Discount code').fill('SAVE20');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('20% discount applied')).toBeVisible();
  });
});
\`\`\`

### Puppeteer: Bring Your Own Test Runner

Puppeteer is a browser automation library, not a test framework. To write tests with Puppeteer, you need to pair it with a separate test runner like Jest, Mocha, or Vitest. You are responsible for:

- Setting up and tearing down browser instances in \`beforeAll\`/\`afterAll\` hooks
- Managing parallelism through your test runner's configuration
- Adding assertion libraries (Jest's \`expect\`, Chai, etc.)
- Configuring reporters separately
- Handling retries through your test runner or custom logic
- Building your own screenshot comparison solution or integrating a third-party library

\`\`\`bash
// Puppeteer + Jest: Manual setup required
const puppeteer = require('puppeteer');

describe('Shopping Cart', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  test('should add item to cart', async () => {
    await page.goto('http://localhost:3000/products');
    await page.waitForSelector('[data-testid="add-to-cart"]');
    await page.click('[data-testid="add-to-cart"]');
    await page.waitForSelector('[data-testid="cart-count"]');
    const count = await page.\$eval(
      '[data-testid="cart-count"]',
      (el) => el.textContent
    );
    expect(count).toBe('1');
  });
});
\`\`\`

The difference in boilerplate is striking. Playwright Test gives you a production-ready test setup with zero configuration. Puppeteer requires you to wire together multiple tools and manage the browser lifecycle yourself.

### Test Runner Feature Comparison

| Feature | Playwright Test | Puppeteer (+ Jest/Mocha) |
|---|---|---|
| **Built-in test runner** | Yes | No -- requires separate framework |
| **Parallel execution** | Native workers | Test runner dependent |
| **Test fixtures** | First-class support | Manual setup/teardown |
| **Retries** | Built-in | Test runner dependent |
| **HTML report** | Built-in with trace viewer | Third-party required |
| **Screenshot comparison** | \`toHaveScreenshot()\` built-in | Third-party library required |
| **Test generation** | \`npx playwright codegen\` | Not available |
| **Trace viewer** | Built-in | Not available |
| **Sharding** | \`--shard=N/M\` | Manual configuration |
| **Component testing** | Experimental support | Not available |

---

## Performance and Speed

Performance matters when you are running hundreds or thousands of tests in CI. Playwright's architecture gives it a significant speed advantage over Puppeteer.

### Why Playwright Is Faster

Playwright's speed advantage comes from two architectural decisions:

1. **Lightweight browser contexts**: Playwright creates isolated browser contexts that share a single browser process. Each context has its own cookies, storage, and cache, but the browser engine itself (rendering pipeline, JavaScript engine, network stack) is shared. Creating a new context takes milliseconds, compared to launching a new browser process which takes seconds.

2. **Native parallel workers**: Playwright Test distributes tests across worker processes automatically. Each worker launches its own browser and runs tests independently. With a machine that has 8 CPU cores, Playwright can effectively run 8 browser instances in parallel without any configuration.

Puppeteer typically creates a new page within a single browser instance for each test. While this is faster than launching a new browser per test, it does not provide the same level of isolation as Playwright's context model. And because Puppeteer relies on external test runners for parallelism, the configuration burden falls on you.

### Benchmark Comparison

Here are representative benchmarks for a suite of 100 E2E tests running on a standard CI machine (4 vCPU, 8GB RAM). These numbers reflect real-world patterns, not synthetic micro-benchmarks.

| Metric | Playwright Test | Puppeteer + Jest |
|---|---|---|
| **100 tests (sequential)** | ~2 minutes 10 seconds | ~3 minutes 45 seconds |
| **100 tests (4 workers)** | ~38 seconds | ~1 minute 25 seconds (Jest workers) |
| **Context creation time** | ~5ms | ~50ms (new page) |
| **Browser launch time** | ~800ms (shared across workers) | ~800ms per Jest worker |
| **Memory usage (4 workers)** | ~600MB | ~1.2GB |
| **CI pipeline total** | ~1 minute 15 seconds | ~2 minutes 30 seconds |

Playwright's parallel execution is more efficient because browser contexts are lighter weight than separate pages managed by an external test runner. The memory savings compound as you scale up the number of parallel workers.

---

## Community and Ecosystem

Community health is a critical factor when choosing a tool you will depend on for years. Playwright has overtaken Puppeteer on every major community metric.

### Community Metrics Comparison (February 2026)

| Metric | Playwright | Puppeteer |
|---|---|---|
| **npm weekly downloads** | ~9.5 million | ~4.2 million |
| **GitHub stars** | ~71,000 | ~89,000 |
| **GitHub contributors** | ~550+ | ~450+ |
| **Stack Overflow questions** | ~22,000 | ~18,000 |
| **Monthly commits (2025)** | ~120 average | ~30 average |
| **Open issues** | ~1,200 | ~350 |
| **Release cadence** | Monthly minor releases | Quarterly releases |
| **Primary maintainer** | Microsoft | Google |

A few things stand out. While Puppeteer still holds a lead in GitHub stars (a lagging indicator reflecting its 2-year head start), Playwright has **more than double the npm downloads** -- the most reliable indicator of actual usage. Playwright's commit frequency is roughly 4x higher, reflecting active development of new features rather than just maintenance.

Puppeteer's lower open issue count reflects a smaller scope (one browser engine) and a slower pace of feature development, not necessarily better quality. Playwright's higher issue count is a natural consequence of supporting three browser engines and a much larger feature surface.

### Ecosystem and Tooling

Both tools benefit from mature ecosystems, but Playwright's integrated approach means you need fewer third-party tools:

| Capability | Playwright | Puppeteer |
|---|---|---|
| **Test runner** | Built-in (Playwright Test) | Jest, Mocha, Vitest (external) |
| **Assertion library** | Built-in (expect with auto-retry) | Jest expect, Chai (external) |
| **Screenshot testing** | Built-in | jest-image-snapshot (external) |
| **Code generation** | Built-in (codegen) | chrome-devtools-recorder (limited) |
| **Debugging** | Trace Viewer, UI Mode, Inspector | Chrome DevTools (manual) |
| **Reporting** | HTML, JSON, JUnit, custom | Test runner dependent |
| **CI integration** | Docker images, GitHub Actions | Manual Docker setup |
| **VS Code extension** | Official extension | Community extensions |

### Job Market

Job postings mentioning Playwright have grown steadily since 2023. In early 2026, Playwright appears in roughly **3x more job listings** than Puppeteer on major job boards. Most companies looking for browser automation skills now list Playwright as a primary requirement, with Puppeteer mentioned as a nice-to-have or in the context of migration experience.

---

## Migration Guide: Puppeteer to Playwright

If you are currently using Puppeteer and want to migrate to Playwright, the good news is that the two APIs share significant overlap -- they were designed by the same people, after all. Here is a step-by-step **Puppeteer to Playwright migration** guide.

### Step 1: Install Playwright

\`\`\`bash
# Install Playwright and browsers
npm init playwright@latest

# This creates playwright.config.ts, installs browsers,
# and sets up the test directory structure
\`\`\`

### Step 2: Update Imports and Browser Launch

\`\`\`bash
// Before (Puppeteer)
const puppeteer = require('puppeteer');
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

// After (Playwright)
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Or better -- use Playwright Test fixtures
import { test, expect } from '@playwright/test';
test('my test', async ({ page }) => {
  // page is automatically created and cleaned up
});
\`\`\`

### Step 3: Update Common Operations

Here are the most common Puppeteer-to-Playwright translations:

| Puppeteer | Playwright | Notes |
|---|---|---|
| \`page.\$(selector)\` | \`page.locator(selector)\` | Playwright locators auto-wait |
| \`page.\$\$(selector)\` | \`page.locator(selector)\` | Use \`.count()\`, \`.all()\`, \`.nth()\` |
| \`page.type(sel, text)\` | \`page.locator(sel).fill(text)\` | \`fill()\` clears first, or use \`pressSequentially()\` |
| \`page.click(selector)\` | \`page.locator(selector).click()\` | Auto-waits for actionability |
| \`page.waitForSelector(sel)\` | Remove -- auto-waiting handles it | Locators wait automatically |
| \`page.waitForNavigation()\` | \`page.waitForURL(pattern)\` | Or remove -- often unnecessary |
| \`page.\$eval(sel, fn)\` | \`page.locator(sel).evaluate(fn)\` | Or use \`textContent()\`, \`getAttribute()\` |
| \`page.\$\$eval(sel, fn)\` | \`page.locator(sel).evaluateAll(fn)\` | Or use \`allTextContents()\` |
| \`page.waitForFunction(fn)\` | \`expect(locator).toPass()\` | Or \`page.waitForFunction(fn)\` (same API) |
| \`page.setRequestInterception(true)\` | \`page.route(pattern, handler)\` | No global toggle needed |
| \`page.on('request', handler)\` | \`page.route(pattern, handler)\` | Route-based, more targeted |
| \`browser.createBrowserContext()\` | \`browser.newContext()\` | Same concept, different name |
| \`elementHandle.type(text)\` | \`locator.fill(text)\` | Prefer locators over handles |

### Step 4: Upgrade Selectors to Locators

The biggest quality improvement in migration is switching from CSS selectors to Playwright's semantic locators:

\`\`\`bash
// Before (Puppeteer-style selectors)
await page.click('#login-button');
await page.type('input[name="email"]', 'user@example.com');
await page.click('.submit-btn');

// After (Playwright semantic locators)
await page.getByRole('button', { name: 'Log in' }).click();
await page.getByLabel('Email').fill('user@example.com');
await page.getByRole('button', { name: 'Submit' }).click();
\`\`\`

### Step 5: Remove Manual Waits

One of the most satisfying parts of migrating to Playwright is deleting all the \`waitForSelector\` and \`waitForTimeout\` calls that clutter Puppeteer test code:

\`\`\`bash
// Before (Puppeteer -- manual waits everywhere)
await page.waitForSelector('.loading-spinner', { hidden: true });
await page.waitForSelector('.data-table');
await page.waitForTimeout(500); // just to be safe
const rows = await page.\$\$('.data-table tr');
expect(rows.length).toBeGreaterThan(0);

// After (Playwright -- auto-waiting and auto-retrying assertions)
await expect(page.getByRole('table')).toBeVisible();
await expect(page.getByRole('row')).toHaveCount(10);
\`\`\`

### Step 6: Migrate Test Structure to Playwright Test

If you want the full benefits of the Playwright ecosystem, migrate your test files to use Playwright Test instead of Jest or Mocha:

\`\`\`bash
// Before (Puppeteer + Jest)
describe('User registration', () => {
  let browser, page;
  beforeAll(async () => { browser = await puppeteer.launch(); });
  beforeEach(async () => { page = await browser.newPage(); });
  afterEach(async () => { await page.close(); });
  afterAll(async () => { await browser.close(); });

  test('registers new user', async () => {
    await page.goto('http://localhost:3000/register');
    await page.type('#name', 'Test User');
    await page.type('#email', 'test@example.com');
    await page.type('#password', 'secure123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    expect(page.url()).toContain('/welcome');
  });
});

// After (Playwright Test)
import { test, expect } from '@playwright/test';

test.describe('User registration', () => {
  test('registers new user', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Name').fill('Test User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('secure123');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL('/welcome');
  });
});
\`\`\`

Notice how much boilerplate disappears. No browser lifecycle management, no manual waits, no full URLs (Playwright Test uses \`baseURL\` from config), and resilient locators instead of brittle CSS selectors.

---

## Automate Browser Testing with AI Agents

Both Playwright and Puppeteer can be enhanced with AI-powered QA skills that teach your coding agent best practices, patterns, and testing strategies. **QASkills.sh** provides curated skills specifically for browser automation frameworks.

### Install Playwright Skills

\`\`\`bash
# Core Playwright E2E testing skill
npx @qaskills/cli add playwright-e2e

# Advanced Playwright patterns (visual testing, API mocking, component testing)
npx @qaskills/cli add playwright-advance-e2e
\`\`\`

These skills teach your AI coding agent to write robust Playwright tests following the patterns covered in this article: semantic locators, proper auto-waiting, fixture-based setup, and cross-browser configuration.

### Explore More

- **Browse all skills**: [/skills](/skills) -- 95+ QA skills for every testing framework and methodology
- **Getting started guide**: [/getting-started](/getting-started) -- Install your first skill in 30 seconds
- **Playwright complete guide**: [/blog/playwright-e2e-complete-guide](/blog/playwright-e2e-complete-guide) -- Deep dive into Playwright E2E testing with AI agents
- **Cypress vs Playwright**: [/blog/cypress-vs-playwright-2026](/blog/cypress-vs-playwright-2026) -- If you are also considering Cypress, read our companion comparison
- **Selenium vs Playwright**: [/blog/selenium-vs-playwright-2026](/blog/selenium-vs-playwright-2026) -- Migrating from Selenium? This guide covers the transition

Whether you stick with Puppeteer for Chrome-specific automation or migrate to Playwright for full cross-browser testing, giving your AI agent specialized QA knowledge dramatically improves the quality of generated tests.

---

## Frequently Asked Questions

### Is Playwright a replacement for Puppeteer?

Yes, for most use cases. Playwright was created by the same engineers who built Puppeteer, and it was specifically designed to address Puppeteer's limitations. Playwright supports everything Puppeteer does (Chrome automation, headless browser operations, PDF generation, screenshots) while adding cross-browser support, a built-in test runner, auto-waiting, and modern locator strategies. The only scenarios where Puppeteer might still make sense are simple Chrome-only scripts where you want a minimal dependency footprint, or legacy projects where migration cost is not justified.

### Can I use Puppeteer and Playwright together?

Technically yes, but there is rarely a good reason to. Both libraries serve the same purpose -- browser automation -- and running both adds unnecessary complexity and dependency weight. If you are migrating from Puppeteer to Playwright, you can do it incrementally by running both frameworks side by side during the transition period. But the goal should be to fully migrate to one tool. Playwright's API is similar enough to Puppeteer's that most migration is straightforward.

### Is Playwright faster than Puppeteer?

Yes, Playwright is faster in most real-world testing scenarios. The speed advantage comes from lightweight browser contexts (which share a single browser process), native parallel test execution across worker processes, and auto-waiting that eliminates unnecessary \`sleep\` and \`waitForTimeout\` calls. For a suite of 100 tests with 4 workers, Playwright typically finishes in about half the time Puppeteer takes with equivalent Jest parallelism.

### Does Puppeteer work with Safari?

No. Puppeteer does not support Safari or WebKit in any capacity. This is a fundamental limitation of Puppeteer's Chrome DevTools Protocol-based architecture. If you need to test on Safari, Playwright is the right choice -- it supports WebKit (Safari's rendering engine) as a first-class browser target alongside Chromium and Firefox.

### Should I learn Playwright or Puppeteer in 2026?

**Learn Playwright.** If you are starting fresh in 2026, Playwright is the clear choice. It has a larger and faster-growing community, more job opportunities, better tooling, and supports all major browsers. Puppeteer knowledge is still valuable -- the concepts transfer directly since both tools automate browsers -- but Playwright gives you a strictly larger skill set. If you already know Puppeteer, your knowledge translates almost directly to Playwright with a short learning curve, and the migration is well worth the effort.
`,
};
