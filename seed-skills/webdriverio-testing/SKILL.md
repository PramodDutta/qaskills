---
name: "WebDriverIO Testing"
description: "Comprehensive WebDriverIO (WDIO) test automation skill for generating reliable end-to-end browser tests in JavaScript and TypeScript with Page Object Model, custom commands, and advanced synchronization strategies."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [webdriverio, wdio, selenium, browser-testing, e2e, page-object-model, automation]
testingTypes: [e2e, integration, visual]
frameworks: [webdriverio]
languages: [javascript, typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# WebDriverIO Testing

You are an expert QA engineer specializing in WebDriverIO (WDIO) test automation. When the user asks you to write, review, debug, or set up WebDriverIO-related tests or configurations, follow these detailed instructions.

## Core Principles

1. **Selector Resilience** -- Always prefer `data-testid` attributes, ARIA roles, and semantic selectors over brittle CSS paths or XPath. Use `$('[data-testid="login-btn"]')` instead of `$('div > div:nth-child(3) > button')`.
2. **Synchronization Over Sleep** -- Never use `browser.pause()` in production tests. Rely on WDIO's built-in `waitForDisplayed()`, `waitForClickable()`, `waitForExist()`, and `waitUntil()` for robust synchronization.
3. **Page Object Model** -- Encapsulate page interactions in Page Object classes. Each page gets its own class with selectors as getters and actions as methods.
4. **Test Isolation** -- Every test must be independent and capable of running in any order. Use `beforeEach` hooks for setup and `afterEach` for teardown. Never share mutable state between tests.
5. **Explicit Assertions** -- Use clear, descriptive assertions. Prefer `expect(element).toBeDisplayed()` over generic truthy checks. Always assert the expected outcome, not just the absence of errors.
6. **Configuration as Code** -- Keep `wdio.conf.js` or `wdio.conf.ts` well-organized with environment-specific overrides. Avoid hardcoded values; use environment variables for URLs, credentials, and feature flags.
7. **Meaningful Reporting** -- Configure reporters (spec, allure, junit) to produce actionable output. Include screenshots on failure and step-by-step logs for debugging.

## When to Use This Skill

- When setting up WebDriverIO for a new project or migrating from another framework
- When writing end-to-end browser tests with WDIO
- When implementing Page Object Model patterns in WDIO
- When debugging flaky or slow WebDriverIO tests
- When configuring WDIO for CI/CD pipelines
- When adding visual regression testing with WDIO
- When working with `wdio.conf.js`, `browser.$()`, `$$()`, or WDIO service plugins

## Project Structure

```
project-root/
├── wdio.conf.ts                    # Main WDIO configuration
├── wdio.ci.conf.ts                 # CI-specific overrides
├── test/
│   ├── specs/                      # Test spec files
│   │   ├── auth/
│   │   │   ├── login.spec.ts
│   │   │   └── registration.spec.ts
│   │   ├── checkout/
│   │   │   └── purchase-flow.spec.ts
│   │   └── search/
│   │       └── product-search.spec.ts
│   ├── pageobjects/                # Page Object classes
│   │   ├── base.page.ts
│   │   ├── login.page.ts
│   │   ├── dashboard.page.ts
│   │   └── checkout.page.ts
│   ├── components/                 # Reusable component objects
│   │   ├── header.component.ts
│   │   ├── footer.component.ts
│   │   └── modal.component.ts
│   ├── fixtures/                   # Test data
│   │   ├── users.json
│   │   └── products.json
│   └── helpers/                    # Utility functions
│       ├── api-helper.ts
│       └── data-factory.ts
├── reports/                        # Generated test reports
├── screenshots/                    # Failure screenshots
└── package.json
```

## Configuration

### Basic wdio.conf.ts

```typescript
import type { Options } from '@wdio/types';

export const config: Options.Testrunner = {
  runner: 'local',
  autoCompileOpts: {
    tsNodeOpts: {
      project: './tsconfig.json',
    },
  },
  specs: ['./test/specs/**/*.spec.ts'],
  exclude: [],
  maxInstances: 5,
  capabilities: [
    {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: process.env.CI
          ? ['--headless', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage']
          : [],
      },
    },
  ],
  logLevel: 'warn',
  bail: 0,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  framework: 'mocha',
  reporters: [
    'spec',
    [
      'allure',
      {
        outputDir: 'reports/allure-results',
        disableWebdriverStepsReporting: false,
        disableWebdriverScreenshotsReporting: false,
      },
    ],
  ],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
  afterTest: async function (test, context, { error }) {
    if (error) {
      await browser.takeScreenshot();
    }
  },
};
```

## Page Object Model

### Base Page

```typescript
export class BasePage {
  open(path: string): Promise<string> {
    return browser.url(`/${path}`);
  }

  async waitForPageLoad(): Promise<void> {
    await browser.waitUntil(
      async () => {
        const state = await browser.execute(() => document.readyState);
        return state === 'complete';
      },
      { timeout: 30000, timeoutMsg: 'Page did not finish loading within 30s' }
    );
  }

  async getTitle(): Promise<string> {
    return browser.getTitle();
  }

  async scrollToElement(selector: string): Promise<void> {
    const element = await $(selector);
    await element.scrollIntoView();
  }
}
```

### Login Page Object

```typescript
import { BasePage } from './base.page';

class LoginPage extends BasePage {
  // --- Selectors ---
  get inputUsername() {
    return $('[data-testid="username-input"]');
  }
  get inputPassword() {
    return $('[data-testid="password-input"]');
  }
  get btnSubmit() {
    return $('[data-testid="login-submit"]');
  }
  get errorMessage() {
    return $('[data-testid="login-error"]');
  }
  get successBanner() {
    return $('[data-testid="login-success"]');
  }

  // --- Actions ---
  async login(username: string, password: string): Promise<void> {
    await this.inputUsername.waitForDisplayed({ timeout: 5000 });
    await this.inputUsername.setValue(username);
    await this.inputPassword.setValue(password);
    await this.btnSubmit.click();
  }

  async getErrorText(): Promise<string> {
    await this.errorMessage.waitForDisplayed({ timeout: 5000 });
    return this.errorMessage.getText();
  }

  open(): Promise<string> {
    return super.open('login');
  }
}

export default new LoginPage();
```

## Writing Tests

### Basic Test Spec

```typescript
import LoginPage from '../pageobjects/login.page';
import DashboardPage from '../pageobjects/dashboard.page';

describe('User Authentication', () => {
  beforeEach(async () => {
    await LoginPage.open();
  });

  it('should login with valid credentials', async () => {
    await LoginPage.login('testuser@example.com', 'SecurePass123!');
    await DashboardPage.waitForPageLoad();
    await expect(browser).toHaveUrl(expect.stringContaining('/dashboard'));
    await expect(DashboardPage.welcomeMessage).toBeDisplayed();
  });

  it('should show error for invalid credentials', async () => {
    await LoginPage.login('invalid@example.com', 'wrongpassword');
    const errorText = await LoginPage.getErrorText();
    expect(errorText).toContain('Invalid email or password');
  });

  it('should disable submit button when fields are empty', async () => {
    await expect(LoginPage.btnSubmit).toBeDisabled();
  });
});
```

### Working with Multiple Elements

```typescript
describe('Product Listing', () => {
  it('should display all product cards', async () => {
    await browser.url('/products');
    const productCards = await $$('[data-testid="product-card"]');
    expect(productCards.length).toBeGreaterThan(0);

    for (const card of productCards) {
      await expect(card.$('[data-testid="product-title"]')).toBeDisplayed();
      await expect(card.$('[data-testid="product-price"]')).toBeDisplayed();
    }
  });

  it('should filter products by category', async () => {
    await $('[data-testid="category-filter"]').selectByVisibleText('Electronics');
    await browser.waitUntil(
      async () => {
        const cards = await $$('[data-testid="product-card"]');
        return cards.length > 0;
      },
      { timeout: 10000, timeoutMsg: 'Products did not load after filtering' }
    );
    const categories = await $$('[data-testid="product-category"]');
    for (const cat of categories) {
      await expect(cat).toHaveText('Electronics');
    }
  });
});
```

### Custom Wait Strategies

```typescript
describe('Advanced Synchronization', () => {
  it('should wait for dynamic content to load', async () => {
    await browser.url('/dashboard');

    // Wait for loading spinner to disappear
    const spinner = await $('[data-testid="loading-spinner"]');
    await spinner.waitForDisplayed({ reverse: true, timeout: 15000 });

    // Wait for specific API-driven content
    await browser.waitUntil(
      async () => {
        const items = await $$('[data-testid="dashboard-widget"]');
        return items.length >= 3;
      },
      {
        timeout: 20000,
        timeoutMsg: 'Expected at least 3 dashboard widgets',
        interval: 500,
      }
    );
  });

  it('should handle network-dependent operations', async () => {
    await $('[data-testid="refresh-btn"]').click();

    // Wait for network idle (no pending XHR requests)
    await browser.waitUntil(
      async () => {
        const pending = await browser.execute(() => {
          return (window as any).__pendingRequests === 0;
        });
        return pending;
      },
      { timeout: 15000, timeoutMsg: 'Network did not settle' }
    );
  });
});
```

### Custom Commands

```typescript
// In wdio.conf.ts or a setup file
browser.addCommand('loginViaApi', async function (username: string, password: string) {
  const response = await browser.execute(
    async (user, pass) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user, password: pass }),
      });
      return res.json();
    },
    username,
    password
  );

  // Set auth cookie from API response
  await browser.setCookies({
    name: 'auth_token',
    value: response.token,
    domain: 'localhost',
  });
  await browser.refresh();
});

// Usage in tests
it('should access protected page via API login', async () => {
  await browser.loginViaApi('admin@example.com', 'AdminPass123!');
  await browser.url('/admin/settings');
  await expect($('[data-testid="admin-panel"]')).toBeDisplayed();
});
```

### Handling Iframes and Shadow DOM

```typescript
describe('Iframe and Shadow DOM', () => {
  it('should interact with elements inside an iframe', async () => {
    const iframe = await $('iframe#payment-frame');
    await browser.switchToFrame(iframe);
    await $('[data-testid="card-number"]').setValue('4111111111111111');
    await $('[data-testid="card-expiry"]').setValue('12/28');
    await browser.switchToParentFrame();
  });

  it('should access shadow DOM elements', async () => {
    const shadowHost = await $('my-custom-element');
    const shadowRoot = await shadowHost.shadow$('[data-testid="inner-button"]');
    await shadowRoot.click();
    await expect(shadowRoot).toHaveAttribute('aria-pressed', 'true');
  });
});
```

### Visual Regression Testing

```typescript
describe('Visual Regression', () => {
  it('should match the homepage layout', async () => {
    await browser.url('/');
    await browser.waitUntil(
      async () => (await browser.execute(() => document.readyState)) === 'complete'
    );
    await expect(browser).toMatchFullPageSnapshot('homepage-layout', {
      hideElements: [await $('[data-testid="dynamic-banner"]')],
      removeElements: [await $('[data-testid="timestamp"]')],
    });
  });

  it('should match individual component appearance', async () => {
    const header = await $('[data-testid="site-header"]');
    await expect(header).toMatchElementSnapshot('site-header');
  });
});
```

## Best Practices

1. **Use `data-testid` attributes** for all selectors to decouple tests from CSS/markup changes. Coordinate with developers to add these attributes during implementation.
2. **Implement the Page Object Model** for every page and reusable component. Never put raw selectors directly in test specs.
3. **Prefer WDIO's built-in waits** (`waitForDisplayed`, `waitForClickable`, `waitForExist`, `waitUntil`) over arbitrary pauses. Set reasonable default timeouts in configuration.
4. **Run tests in parallel** using `maxInstances` in capabilities. Design tests to be isolated so they can run concurrently without conflicts.
5. **Capture screenshots and logs on failure** using `afterTest` hooks. Configure Allure or similar reporters for rich failure diagnostics.
6. **Use environment variables** for all configurable values (base URL, credentials, feature flags). Never hardcode sensitive data in test files.
7. **Keep tests focused and atomic** -- each test should verify one behavior. Use descriptive `describe` and `it` blocks that read like specifications.
8. **Implement API-based test setup** for preconditions (creating users, seeding data) instead of navigating through the UI. Reserve UI interactions for the behavior being tested.
9. **Configure retry logic** with `specFileRetries` for flaky network-dependent tests, but investigate and fix the root cause of flakiness rather than relying on retries.
10. **Organize specs by feature domain** (auth, checkout, search) rather than by page. This keeps related tests together and makes maintenance easier.

## Anti-Patterns

1. **Using `browser.pause()`** -- Static waits cause slow, flaky tests. Always use explicit waits tied to DOM conditions.
2. **Hardcoding test data** -- Embedding usernames, URLs, or product IDs directly in test files makes tests brittle and environment-dependent.
3. **Writing tests that depend on execution order** -- Tests that require other tests to run first are fragile and impossible to run in parallel.
4. **Using deep CSS selectors** like `div.container > ul > li:nth-child(2) > a` -- These break whenever markup changes. Use `data-testid` or ARIA roles.
5. **Skipping Page Objects** -- Putting selectors and interactions directly in specs leads to massive duplication and maintenance nightmares.
6. **Ignoring test isolation** -- Sharing state (cookies, local storage, database records) between tests causes cascading failures.
7. **Testing implementation details** -- Asserting on internal class names, inline styles, or DOM structure rather than visible behavior makes tests fragile.
8. **Catching and swallowing errors** -- Wrapping test actions in try/catch blocks hides real failures and produces false positives.
9. **Running all tests in a single browser instance** -- Not cleaning browser state between tests leads to session contamination and unreliable results.
10. **Not configuring headless mode for CI** -- Running headed browsers in CI is slow and resource-intensive. Always configure headless mode for pipeline execution.

## CLI Reference

```bash
# Run all tests
npx wdio run wdio.conf.ts

# Run specific spec file
npx wdio run wdio.conf.ts --spec ./test/specs/auth/login.spec.ts

# Run tests matching a grep pattern
npx wdio run wdio.conf.ts --mochaOpts.grep "login"

# Run with specific capabilities
npx wdio run wdio.conf.ts --capabilities.browserName=firefox

# Run in watch mode (rerun on file changes)
npx wdio run wdio.conf.ts --watch

# Generate Allure report
npx allure generate reports/allure-results --clean -o reports/allure-report
npx allure open reports/allure-report
```

## Setup

```bash
# Initialize a new WDIO project
npm init wdio@latest .

# Or install manually
npm install --save-dev @wdio/cli @wdio/local-runner @wdio/mocha-framework
npm install --save-dev @wdio/spec-reporter @wdio/allure-reporter
npm install --save-dev chromedriver wdio-chromedriver-service

# For TypeScript support
npm install --save-dev typescript ts-node @types/mocha
```
