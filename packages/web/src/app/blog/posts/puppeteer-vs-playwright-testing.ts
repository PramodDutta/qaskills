import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Puppeteer vs Playwright: Which to Choose in 2026?',
  description:
    'Puppeteer vs Playwright comparison for 2026. Covers architecture, API differences, browser support, performance, auto-waiting, network interception, and a migration guide.',
  date: '2026-03-24',
  category: 'Guide',
  content: `
Puppeteer and Playwright are both Node.js libraries for browser automation. Puppeteer was created by the Chrome DevTools team at Google. Playwright was created by the same engineers after they moved to Microsoft. Playwright is essentially a spiritual successor to Puppeteer, built with the lessons learned from years of maintaining browser automation tools.

In 2026 both tools are actively maintained and widely used. This guide compares them across architecture, API design, browser support, performance, and developer experience to help you decide which one fits your project.

## Key Takeaways

- Playwright supports Chromium, Firefox, and WebKit out of the box. Puppeteer only supports Chromium (and experimentally Firefox)
- Playwright has built-in auto-waiting, test runner, and assertion library. Puppeteer is a lower-level automation library
- Playwright provides better isolation with browser contexts, while Puppeteer uses browser instances or incognito contexts
- Both tools use the Chrome DevTools Protocol for Chromium, but Playwright also has custom protocols for Firefox and WebKit
- Migrating from Puppeteer to Playwright is straightforward due to similar API shapes
- For new projects in 2026, Playwright is the stronger default choice unless you specifically need only Chrome automation

---

## Architecture Comparison

### Puppeteer

Puppeteer communicates with Chromium through the Chrome DevTools Protocol (CDP). It launches a Chromium browser process and sends commands over a WebSocket connection.

\`\`\`
Your Code -> Puppeteer API -> CDP WebSocket -> Chromium
\`\`\`

Puppeteer is tightly coupled to Chromium. While experimental Firefox support exists via the WebDriver BiDi protocol, it is not production-ready.

### Playwright

Playwright uses a client-server architecture. Your test code communicates with a Playwright server process, which in turn communicates with browsers through protocol-specific connections.

\`\`\`
Your Code -> Playwright Client -> Playwright Server -> Browser
                                       |
                                       +-> CDP (Chromium)
                                       +-> Custom Protocol (Firefox)
                                       +-> Custom Protocol (WebKit)
\`\`\`

This architecture means Playwright can support multiple browser engines natively, each with full feature parity.

---

## Browser Support

| Browser | Puppeteer | Playwright |
|---|---|---|
| Chrome/Chromium | Full support | Full support |
| Firefox | Experimental (WebDriver BiDi) | Full support |
| Safari/WebKit | Not supported | Full support |
| Edge | Via Chromium | Via Chromium |

Playwright ships with patched versions of each browser engine. These patches are minimal and focused on automation capabilities rather than changing browser behavior. This means you test against real browser engines, not emulations.

For cross-browser testing requirements, Playwright is the clear winner. If you only need Chrome automation (for scraping, PDF generation, or Chrome-only testing), Puppeteer is sufficient.

---

## API Comparison

### Launching a Browser

**Puppeteer:**
\`\`\`javascript
const puppeteer = require('puppeteer');

const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('https://example.com');
\`\`\`

**Playwright:**
\`\`\`javascript
const { chromium } = require('playwright');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto('https://example.com');
\`\`\`

The key difference is the **browser context** layer in Playwright. A context is like an incognito profile: it has its own cookies, localStorage, and session state. Multiple contexts can run in a single browser instance without interfering with each other.

### Selectors

**Puppeteer** primarily uses CSS selectors and XPath:
\`\`\`javascript
// CSS selector
await page.click('button.submit');

// XPath
const [element] = await page.\$x('//button[text()="Submit"]');

// Wait for selector
await page.waitForSelector('.loaded', { visible: true });
\`\`\`

**Playwright** has a richer selector engine:
\`\`\`javascript
// CSS selector
await page.click('button.submit');

// Text selector
await page.click('text=Submit');

// Role selector (accessibility)
await page.getByRole('button', { name: 'Submit' }).click();

// Test ID selector
await page.getByTestId('submit-button').click();

// Label selector
await page.getByLabel('Email address').fill('jane@example.com');

// Placeholder selector
await page.getByPlaceholder('Enter your email').fill('jane@example.com');
\`\`\`

Playwright's locator API encourages accessible, resilient selectors that are less likely to break when the UI changes.

### Auto-Waiting

**Puppeteer** requires explicit waits:
\`\`\`javascript
await page.waitForSelector('#dynamic-content');
await page.click('#dynamic-content');

await page.waitForNavigation();
await page.waitForTimeout(1000); // not recommended but common
\`\`\`

**Playwright** auto-waits before performing actions:
\`\`\`javascript
// Playwright automatically waits for the element to be:
// - Attached to the DOM
// - Visible
// - Stable (not animating)
// - Enabled
// - Not obscured by other elements
await page.click('#dynamic-content');
\`\`\`

This auto-waiting behavior is one of Playwright's biggest advantages. It eliminates the most common source of flaky tests: race conditions between your test code and the application's rendering.

### Network Interception

**Puppeteer:**
\`\`\`javascript
await page.setRequestInterception(true);

page.on('request', request => {
    if (request.url().includes('/api/users')) {
        request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{ name: 'Jane' }]),
        });
    } else {
        request.continue();
    }
});
\`\`\`

**Playwright:**
\`\`\`javascript
await page.route('**/api/users', route => {
    route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ name: 'Jane' }]),
    });
});

// Or modify a real response
await page.route('**/api/users', async route => {
    const response = await route.fetch();
    const json = await response.json();
    json.push({ name: 'Extra User' });
    route.fulfill({ body: JSON.stringify(json) });
});
\`\`\`

Playwright's routing API is more intuitive and supports response modification natively.

### Screenshots and PDFs

**Puppeteer:**
\`\`\`javascript
await page.screenshot({
    path: 'screenshot.png',
    fullPage: true
});
await page.pdf({ path: 'page.pdf', format: 'A4' });
\`\`\`

**Playwright:**
\`\`\`javascript
await page.screenshot({
    path: 'screenshot.png',
    fullPage: true
});
await page.pdf({ path: 'page.pdf', format: 'A4' });
\`\`\`

These APIs are nearly identical. Both produce high-quality output.

---

## Testing Framework Integration

### Puppeteer

Puppeteer does not include a test runner. You pair it with Jest, Mocha, or another test framework:

\`\`\`javascript
const puppeteer = require('puppeteer');

describe('Login page', () => {
    let browser, page;

    beforeAll(async () => {
        browser = await puppeteer.launch();
        page = await browser.newPage();
    });

    afterAll(async () => {
        await browser.close();
    });

    test('shows error for invalid credentials', async () => {
        await page.goto('https://example.com/login');
        await page.type('#email', 'wrong@example.com');
        await page.type('#password', 'wrongpass');
        await page.click('button[type="submit"]');
        await page.waitForSelector('.error-message');
        const text = await page.\$eval(
            '.error-message', el => el.textContent
        );
        expect(text).toContain('Invalid credentials');
    });
});
\`\`\`

### Playwright

Playwright includes \`@playwright/test\`, a full test runner with fixtures, assertions, and parallel execution:

\`\`\`javascript
import { test, expect } from '@playwright/test';

test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('https://example.com/login');
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpass');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.locator('.error-message'))
        .toContainText('Invalid credentials');
});
\`\`\`

The Playwright test runner provides:
- **Fixtures**: Automatic browser, context, and page management
- **Parallel execution**: Tests run in parallel by default across workers
- **Retries**: Built-in test retry configuration
- **Reporters**: HTML, JSON, JUnit, and custom reporters
- **Trace viewer**: Record and replay test execution with DOM snapshots, network logs, and console output
- **Test generator (codegen)**: Record browser interactions and generate test code

---

## Performance

### Startup Time

Playwright's server process adds a small overhead on first launch (about 200-300ms), but subsequent operations are faster because the server stays running. Puppeteer launches a browser directly, which is slightly faster for single-page scripts.

### Parallel Execution

**Playwright** excels at parallel testing. Browser contexts are lightweight, so you can run dozens of tests in parallel within a single browser instance:

\`\`\`javascript
// playwright.config.ts
export default {
    workers: 4,  // Run 4 test files in parallel
    fullyParallel: true,  // Parallelize within files too
};
\`\`\`

**Puppeteer** requires launching multiple browser instances for parallelism, which consumes more memory and CPU.

### Resource Usage

| Metric | Puppeteer | Playwright |
|---|---|---|
| Memory per test | ~150-200 MB (new browser) | ~30-50 MB (new context) |
| Parallel efficiency | Limited by browser instances | Excellent with contexts |
| Cold start | ~1-2s | ~1.5-2.5s |
| Warm subsequent tests | Similar | Similar |

---

## Migration from Puppeteer to Playwright

If you are considering a move from Puppeteer to Playwright, here is a mapping of common API calls:

| Puppeteer | Playwright |
|---|---|
| \`puppeteer.launch()\` | \`chromium.launch()\` |
| \`browser.newPage()\` | \`browser.newContext()\` then \`context.newPage()\` |
| \`page.\$(selector)\` | \`page.locator(selector)\` |
| \`page.\$\$eval(sel, fn)\` | \`page.locator(sel).evaluateAll(fn)\` |
| \`page.waitForSelector(sel)\` | \`page.locator(sel).waitFor()\` |
| \`page.type(sel, text)\` | \`page.locator(sel).fill(text)\` |
| \`page.click(sel)\` | \`page.locator(sel).click()\` |
| \`page.waitForNavigation()\` | \`page.waitForURL(pattern)\` |
| \`page.setRequestInterception(true)\` | \`page.route(pattern, handler)\` |
| \`page.waitForTimeout(ms)\` | \`page.waitForTimeout(ms)\` (same, but discouraged) |

### Step-by-Step Migration

1. **Install Playwright**: \`npm install -D @playwright/test\` and run \`npx playwright install\`
2. **Convert launch code**: Replace \`puppeteer.launch()\` with Playwright browser launch and add context creation
3. **Update selectors**: Replace \`page.\$()\` chains with \`page.locator()\`. Adopt role-based and text-based selectors where possible
4. **Remove explicit waits**: Delete \`waitForSelector\` calls before actions. Playwright auto-waits
5. **Update assertions**: If using Jest, switch to Playwright's built-in \`expect\` with web-first assertions
6. **Convert network mocking**: Replace \`setRequestInterception\` with \`page.route()\`
7. **Run and fix**: Run your converted tests and fix any remaining issues

---

## When to Use Each

### Choose Puppeteer When

- You only need Chrome/Chromium automation
- You are building a web scraper or PDF generator, not running tests
- You want the smallest dependency footprint
- You need direct CDP access for specialized Chrome debugging tasks
- Your existing codebase is heavily invested in Puppeteer

### Choose Playwright When

- You need cross-browser testing (Chromium, Firefox, WebKit)
- You are writing end-to-end tests and want a complete testing solution
- You want auto-waiting to reduce flaky tests
- You need parallel test execution with good resource efficiency
- You are starting a new project and want the best default choice
- You want the trace viewer for debugging test failures

---

## Real-World Decision Framework

Ask these questions:

1. **Do you need Firefox or Safari testing?** If yes, choose Playwright. Puppeteer cannot help here.

2. **Are you building a test suite or a script?** For test suites, Playwright's built-in runner, fixtures, and reporters provide significant value. For one-off scripts, Puppeteer's simplicity may be preferable.

3. **Is flakiness a problem?** Playwright's auto-waiting eliminates the most common source of flaky tests. If your Puppeteer tests are fragile, switching to Playwright often fixes flakiness without changing test logic.

4. **Do you need to debug test failures in CI?** Playwright's trace viewer lets you step through a test execution with DOM snapshots, network logs, and console output. This is invaluable for debugging CI-only failures.

5. **How large is your test suite?** For large suites (100+ tests), Playwright's parallel execution with browser contexts is significantly more efficient than Puppeteer's approach of launching multiple browsers.

---

## Common Patterns in Both Tools

### Page Object Model

Both tools benefit from the Page Object pattern:

\`\`\`javascript
// Works with both Puppeteer and Playwright
class LoginPage {
    constructor(page) {
        this.page = page;
    }

    async navigate() {
        await this.page.goto('/login');
    }

    async login(email, password) {
        // Playwright version with locators
        await this.page.getByLabel('Email').fill(email);
        await this.page.getByLabel('Password').fill(password);
        await this.page.getByRole('button', { name: 'Sign in' }).click();
    }

    async getErrorMessage() {
        return this.page.locator('.error-message').textContent();
    }
}
\`\`\`

### Handling Authentication

**Playwright** provides a storage state mechanism for authentication:
\`\`\`javascript
// Save auth state after logging in
await page.context().storageState({ path: 'auth.json' });

// Reuse in subsequent tests
const context = await browser.newContext({
    storageState: 'auth.json'
});
\`\`\`

**Puppeteer** requires manual cookie and localStorage management:
\`\`\`javascript
const cookies = await page.cookies();
// Save cookies to file, restore later
await page.setCookie(...savedCookies);
\`\`\`

---

## Summary

Puppeteer and Playwright share a lineage, and many API concepts transfer between them. Puppeteer remains a solid choice for Chrome-specific automation tasks and lightweight scripting. Playwright is the stronger choice for testing, offering cross-browser support, auto-waiting, built-in test infrastructure, and superior parallel execution. For most teams starting a new project in 2026, Playwright is the recommended default. If you are maintaining an existing Puppeteer codebase, migration is straightforward and often pays for itself in reduced flakiness and better debugging tools.
`,
};
