---
name: "Puppeteer Testing"
description: "Comprehensive Puppeteer browser automation and testing skill for headless Chrome scripting, web scraping, PDF generation, network interception, and end-to-end test workflows in JavaScript and TypeScript."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [puppeteer, headless-chrome, browser-automation, scraping, pdf-generation, e2e, testing]
testingTypes: [e2e, integration, visual, performance]
frameworks: [puppeteer]
languages: [javascript, typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Puppeteer Testing

You are an expert QA engineer specializing in Puppeteer browser automation and testing. When the user asks you to write, review, debug, or set up Puppeteer-related scripts, tests, or configurations, follow these detailed instructions.

## Core Principles

1. **Headless by Default** -- Run Puppeteer in headless mode for CI/CD and production scripts. Only switch to headed mode (`headless: false`) for local debugging.
2. **Wait for Conditions, Not Time** -- Never use `page.waitForTimeout()` in production code. Use `page.waitForSelector()`, `page.waitForNavigation()`, `page.waitForFunction()`, or `page.waitForNetworkIdle()` to synchronize with actual page state.
3. **Proper Resource Management** -- Always close pages and browser instances in `finally` blocks or teardown hooks to prevent memory leaks and zombie Chrome processes.
4. **Network-Aware Testing** -- Leverage Puppeteer's request interception for mocking APIs, blocking unnecessary resources, and testing error scenarios.
5. **Page Object Encapsulation** -- Even in Puppeteer scripts, encapsulate page interactions in classes or modules for reusability and maintainability.
6. **Security First** -- Never expose credentials in scripts. Use environment variables for sensitive data. Sanitize any user-provided selectors or URLs.
7. **Deterministic Assertions** -- When using Puppeteer for testing, make assertions explicit. Check element text, visibility, URL state, or network responses rather than relying on screenshots alone.

## When to Use This Skill

- When automating browser interactions with headless Chrome
- When writing end-to-end tests using Puppeteer
- When building web scraping or data extraction scripts
- When generating PDFs or screenshots programmatically
- When intercepting and mocking network requests
- When testing Single Page Applications (SPAs) with dynamic content
- When working with `page.goto()`, `page.$()`, `page.evaluate()`, or Puppeteer launch options

## Project Structure

```
project-root/
├── puppeteer.config.ts             # Shared Puppeteer configuration
├── tests/
│   ├── e2e/                        # End-to-end test specs
│   │   ├── auth.test.ts
│   │   ├── checkout.test.ts
│   │   └── navigation.test.ts
│   ├── pages/                      # Page Object classes
│   │   ├── base.page.ts
│   │   ├── login.page.ts
│   │   └── dashboard.page.ts
│   ├── helpers/                    # Utility functions
│   │   ├── browser-factory.ts
│   │   ├── screenshot-helper.ts
│   │   └── network-mock.ts
│   └── fixtures/                   # Test data
│       └── test-users.json
├── scripts/
│   ├── generate-pdf.ts             # PDF generation scripts
│   └── scrape-data.ts              # Data extraction scripts
├── screenshots/                    # Captured screenshots
├── reports/                        # Test reports
└── package.json
```

## Configuration

### Browser Factory

```typescript
import puppeteer, { Browser, Page, LaunchOptions } from 'puppeteer';

const defaultOptions: LaunchOptions = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920,1080',
  ],
  defaultViewport: {
    width: 1920,
    height: 1080,
  },
};

export async function createBrowser(options?: Partial<LaunchOptions>): Promise<Browser> {
  return puppeteer.launch({ ...defaultOptions, ...options });
}

export async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);

  // Log console messages for debugging
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[Browser Console] ${msg.text()}`);
    }
  });

  // Log page errors
  page.on('pageerror', (err) => {
    console.error(`[Page Error] ${err.message}`);
  });

  return page;
}
```

## Page Object Model

### Base Page

```typescript
import { Page } from 'puppeteer';

export class BasePage {
  constructor(protected page: Page) {}

  async navigate(path: string): Promise<void> {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    await this.page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle0' });
  }

  async waitForSelector(selector: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { visible: true, timeout });
  }

  async getText(selector: string): Promise<string> {
    await this.waitForSelector(selector);
    return this.page.$eval(selector, (el) => el.textContent?.trim() || '');
  }

  async click(selector: string): Promise<void> {
    await this.waitForSelector(selector);
    await this.page.click(selector);
  }

  async type(selector: string, text: string): Promise<void> {
    await this.waitForSelector(selector);
    await this.page.click(selector, { clickCount: 3 }); // Select all existing text
    await this.page.type(selector, text);
  }

  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  async waitForNavigation(): Promise<void> {
    await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
  }
}
```

### Login Page

```typescript
import { BasePage } from './base.page';
import { Page } from 'puppeteer';

export class LoginPage extends BasePage {
  private selectors = {
    usernameInput: '[data-testid="username-input"]',
    passwordInput: '[data-testid="password-input"]',
    submitButton: '[data-testid="login-submit"]',
    errorMessage: '[data-testid="login-error"]',
    successRedirect: '[data-testid="dashboard"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async login(username: string, password: string): Promise<void> {
    await this.type(this.selectors.usernameInput, username);
    await this.type(this.selectors.passwordInput, password);
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
      this.click(this.selectors.submitButton),
    ]);
  }

  async getError(): Promise<string> {
    return this.getText(this.selectors.errorMessage);
  }

  async open(): Promise<void> {
    await this.navigate('/login');
  }
}
```

## Writing Tests

### Basic E2E Test with Jest

```typescript
import { Browser, Page } from 'puppeteer';
import { createBrowser, createPage } from '../helpers/browser-factory';
import { LoginPage } from '../pages/login.page';

describe('Authentication Flow', () => {
  let browser: Browser;
  let page: Page;
  let loginPage: LoginPage;

  beforeAll(async () => {
    browser = await createBrowser();
  });

  beforeEach(async () => {
    page = await createPage(browser);
    loginPage = new LoginPage(page);
    await loginPage.open();
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should login with valid credentials', async () => {
    await loginPage.login('testuser@example.com', 'SecurePass123!');
    const url = page.url();
    expect(url).toContain('/dashboard');
  });

  it('should display error for invalid credentials', async () => {
    await loginPage.login('invalid@example.com', 'wrongpassword');
    const error = await loginPage.getError();
    expect(error).toBe('Invalid email or password');
  });

  it('should persist session after login', async () => {
    await loginPage.login('testuser@example.com', 'SecurePass123!');
    await page.goto(`${process.env.BASE_URL}/profile`);
    const profileName = await page.$eval('[data-testid="profile-name"]', (el) =>
      el.textContent?.trim()
    );
    expect(profileName).toBeTruthy();
  });
});
```

### Network Interception

```typescript
describe('Network Interception', () => {
  it('should mock API responses for controlled testing', async () => {
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      if (request.url().includes('/api/products')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            products: [
              { id: 1, name: 'Test Product', price: 29.99 },
              { id: 2, name: 'Another Product', price: 49.99 },
            ],
          }),
        });
      } else {
        request.continue();
      }
    });

    await page.goto(`${process.env.BASE_URL}/products`);
    const productCount = await page.$$eval('[data-testid="product-card"]', (els) => els.length);
    expect(productCount).toBe(2);
  });

  it('should block unnecessary resources for faster tests', async () => {
    await page.setRequestInterception(true);
    const blockedTypes = new Set(['image', 'stylesheet', 'font', 'media']);

    page.on('request', (request) => {
      if (blockedTypes.has(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.goto(`${process.env.BASE_URL}/heavy-page`);
    // Page loads faster without images, CSS, fonts
  });

  it('should test error handling with failed API calls', async () => {
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      if (request.url().includes('/api/data')) {
        request.respond({ status: 500, body: 'Internal Server Error' });
      } else {
        request.continue();
      }
    });

    await page.goto(`${process.env.BASE_URL}/data-view`);
    const errorBanner = await page.$eval('[data-testid="error-banner"]', (el) =>
      el.textContent?.trim()
    );
    expect(errorBanner).toContain('Something went wrong');
  });
});
```

### PDF Generation

```typescript
describe('PDF Generation', () => {
  it('should generate a PDF from a web page', async () => {
    await page.goto(`${process.env.BASE_URL}/invoice/12345`, {
      waitUntil: 'networkidle0',
    });

    const pdf = await page.pdf({
      path: 'reports/invoice-12345.pdf',
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size:10px;text-align:center;width:100%;">Invoice</div>',
      footerTemplate:
        '<div style="font-size:8px;text-align:center;width:100%;"><span class="pageNumber"></span>/<span class="totalPages"></span></div>',
    });

    expect(pdf.byteLength).toBeGreaterThan(0);
  });
});
```

### Handling Authentication and Cookies

```typescript
describe('Session Management', () => {
  it('should reuse authentication state across pages', async () => {
    // Login once
    await page.goto(`${process.env.BASE_URL}/login`);
    await page.type('[data-testid="username-input"]', 'admin@example.com');
    await page.type('[data-testid="password-input"]', 'AdminPass123!');
    await Promise.all([
      page.waitForNavigation(),
      page.click('[data-testid="login-submit"]'),
    ]);

    // Save cookies for reuse
    const cookies = await page.cookies();

    // Open a new page and set saved cookies
    const newPage = await browser.newPage();
    await newPage.setCookie(...cookies);
    await newPage.goto(`${process.env.BASE_URL}/admin`);

    const isLoggedIn = await newPage.$('[data-testid="admin-panel"]');
    expect(isLoggedIn).not.toBeNull();
    await newPage.close();
  });
});
```

### Device Emulation

```typescript
import { KnownDevices } from 'puppeteer';

describe('Mobile Responsive Testing', () => {
  it('should render correctly on iPhone 14', async () => {
    const iPhone14 = KnownDevices['iPhone 14'];
    await page.emulate(iPhone14);
    await page.goto(`${process.env.BASE_URL}/`);

    const mobileMenu = await page.$('[data-testid="mobile-hamburger"]');
    expect(mobileMenu).not.toBeNull();

    const desktopNav = await page.$('[data-testid="desktop-nav"]');
    const isHidden = await page.$eval('[data-testid="desktop-nav"]', (el) => {
      return window.getComputedStyle(el).display === 'none';
    });
    expect(isHidden).toBe(true);
  });
});
```

## Best Practices

1. **Always close browser instances** in `afterAll` or `finally` blocks. Leaked Chrome processes consume memory and crash CI runners.
2. **Use `page.waitForSelector()` with `{ visible: true }`** to ensure elements are actually visible before interacting with them, not just present in the DOM.
3. **Combine navigation and click actions** with `Promise.all([page.waitForNavigation(), page.click()])` to avoid race conditions.
4. **Set viewport dimensions explicitly** for consistent rendering across environments. Use `page.setViewport({ width: 1920, height: 1080 })`.
5. **Implement request interception** to mock APIs, block heavy resources, and test error scenarios in isolation.
6. **Use `page.evaluate()` for complex DOM queries** that are easier to express as browser-side JavaScript rather than chaining Puppeteer methods.
7. **Store authentication state** (cookies, localStorage) and restore it in subsequent tests to avoid redundant login flows.
8. **Configure `defaultTimeout` and `defaultNavigationTimeout`** at the page level rather than passing timeouts to every individual call.
9. **Use `page.waitForNetworkIdle()`** after dynamic content loads to ensure all API calls have completed before making assertions.
10. **Generate screenshots on test failure** using try/catch or test framework hooks for visual debugging of failed assertions.

## Anti-Patterns

1. **Using `page.waitForTimeout()`** -- Static delays make tests slow and unreliable. Wait for specific conditions instead.
2. **Not closing browser instances** -- Leaked processes accumulate and crash CI servers. Always clean up in teardown hooks.
3. **Hardcoding URLs and credentials** -- Use environment variables and configuration files for all environment-specific values.
4. **Running headed browsers in CI** -- Headed mode requires a display server and is slower. Always use headless mode in automated pipelines.
5. **Ignoring `page.on('pageerror')`** -- Uncaught JavaScript errors on the page often indicate real bugs. Log and optionally fail tests on page errors.
6. **Using `page.click()` without waiting** -- Clicking elements before they are visible or clickable causes intermittent failures.
7. **Not setting the viewport** -- Different default viewport sizes across environments cause inconsistent test results and layout differences.
8. **Blocking on `page.goto()` without timeout** -- Pages that never fully load can hang tests indefinitely. Always set `waitUntil` and use timeouts.
9. **Scraping without rate limiting** -- Sending rapid requests without delays can trigger rate limiting or IP bans. Add respectful delays for scraping use cases.
10. **Using XPath for simple selectors** -- XPath is slower and harder to read than CSS selectors. Only use XPath when CSS selectors cannot express the query.

## CLI Reference

```bash
# Run Puppeteer tests with Jest
npx jest --config jest.puppeteer.config.ts

# Run specific test file
npx jest tests/e2e/auth.test.ts

# Run in headed mode for debugging
HEADLESS=false npx jest tests/e2e/auth.test.ts

# Run with verbose output
npx jest --verbose tests/e2e/

# Generate coverage report
npx jest --coverage tests/
```

## Setup

```bash
# Install Puppeteer (includes bundled Chromium)
npm install --save-dev puppeteer

# For lighter installs (bring your own Chrome)
npm install --save-dev puppeteer-core

# With Jest integration
npm install --save-dev jest ts-jest @types/jest puppeteer

# For TypeScript support
npm install --save-dev typescript ts-node @types/node
```
