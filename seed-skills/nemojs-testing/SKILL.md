---
name: "Nemo.js Testing"
description: "Comprehensive Nemo.js test automation skill for PayPal's Selenium-based Node.js testing framework featuring view-driven locators, flexible configuration, Mocha integration, and scalable browser automation patterns."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [nemojs, nemo, paypal, selenium, node, browser-testing, automation, mocha]
testingTypes: [e2e, integration]
frameworks: [nemojs]
languages: [javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Nemo.js Testing

You are an expert QA engineer specializing in Nemo.js test automation. When the user asks you to write, review, debug, or set up Nemo.js-related tests or configurations, follow these detailed instructions.

Nemo.js is PayPal's Selenium-based test automation framework for Node.js. It provides a configuration-driven approach to browser automation with a view-based locator system, lifecycle management, and deep Mocha integration.

## Core Principles

1. **Configuration-Driven Setup** -- Nemo uses JSON/JS configuration files to define browser capabilities, server settings, and plugin configurations. Keep all environment-specific values in config rather than test code.
2. **View-Based Locator System** -- Use Nemo's view system (`nemo.view`) for element location. Define locators in JSON files and reference them through the view API for centralized selector management.
3. **Mocha Integration** -- Nemo integrates tightly with Mocha for test structure, lifecycle hooks, and reporting. Use `describe`/`it` blocks with `before`/`after` hooks for setup and teardown.
4. **Explicit Waits** -- Use `nemo.view._waitVisible()` and custom wait functions rather than implicit waits or static delays. Selenium's timing issues require explicit synchronization.
5. **Plugin Architecture** -- Extend Nemo's capabilities through plugins for screenshot capture, data management, and custom utilities. Keep test logic clean by delegating cross-cutting concerns to plugins.
6. **Test Isolation** -- Each test must be independent. Create fresh browser sessions or clear state in `beforeEach` hooks to prevent test pollution.
7. **Locator Abstraction** -- Never hardcode selectors in test files. Define all locators in view JSON files and access them through the view API for maintainability.

## When to Use This Skill

- When working with an existing Nemo.js test suite
- When setting up Nemo.js for a Node.js-based project
- When writing Selenium-based browser tests with Mocha in the Nemo ecosystem
- When configuring Nemo views and locator files
- When debugging Nemo.js test failures
- When working with `nemo.view._find()`, `nemo.view._waitVisible()`, or Nemo configuration files

## Project Structure

```
project-root/
├── nemo.config.js                  # Main Nemo configuration
├── test/
│   ├── functional/                 # Test spec files
│   │   ├── auth/
│   │   │   ├── login.test.js
│   │   │   └── registration.test.js
│   │   ├── checkout/
│   │   │   └── purchase.test.js
│   │   └── search/
│   │       └── product-search.test.js
│   ├── views/                      # View locator definitions
│   │   ├── login.json
│   │   ├── dashboard.json
│   │   ├── checkout.json
│   │   └── search.json
│   ├── plugins/                    # Custom Nemo plugins
│   │   ├── screenshot-plugin.js
│   │   └── data-helper.js
│   ├── fixtures/                   # Test data
│   │   └── test-users.json
│   └── helpers/                    # Utility functions
│       ├── wait-helpers.js
│       └── api-helpers.js
├── reports/                        # Test reports
├── screenshots/                    # Captured screenshots
└── package.json
```

## Configuration

### nemo.config.js

```javascript
module.exports = {
  plugins: {
    view: {
      module: 'nemo-view',
      arguments: ['test/views'],
    },
  },
  driver: {
    browser: process.env.BROWSER || 'chrome',
    builders: {
      forBrowser: [process.env.BROWSER || 'chrome'],
      withCapabilities: [
        {
          browserName: process.env.BROWSER || 'chrome',
          chromeOptions: {
            args: process.env.CI
              ? ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
              : [],
          },
        },
      ],
    },
    server: process.env.SELENIUM_SERVER || undefined,
  },
  data: {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    defaultTimeout: 10000,
  },
};
```

### View Locator Files

#### login.json

```json
{
  "usernameInput": {
    "locator": "[data-testid='username-input']",
    "type": "css"
  },
  "passwordInput": {
    "locator": "[data-testid='password-input']",
    "type": "css"
  },
  "submitButton": {
    "locator": "[data-testid='login-submit']",
    "type": "css"
  },
  "errorMessage": {
    "locator": "[data-testid='login-error']",
    "type": "css"
  },
  "rememberCheckbox": {
    "locator": "[data-testid='remember-me']",
    "type": "css"
  },
  "forgotPasswordLink": {
    "locator": "a[href='/forgot-password']",
    "type": "css"
  }
}
```

#### dashboard.json

```json
{
  "welcomeMessage": {
    "locator": "[data-testid='welcome-message']",
    "type": "css"
  },
  "widgetContainer": {
    "locator": "[data-testid='dashboard-widgets']",
    "type": "css"
  },
  "userAvatar": {
    "locator": "[data-testid='user-avatar']",
    "type": "css"
  },
  "logoutButton": {
    "locator": "[data-testid='logout-btn']",
    "type": "css"
  },
  "notificationBadge": {
    "locator": "[data-testid='notification-badge']",
    "type": "css"
  }
}
```

## Writing Tests

### Basic Authentication Test

```javascript
const assert = require('assert');

describe('User Authentication', function () {
  this.timeout(30000);
  let nemo;

  before(async function () {
    nemo = this.nemo;
    await nemo.driver.get(`${nemo.data.baseUrl}/login`);
  });

  it('should login with valid credentials', async function () {
    const loginView = nemo.view.login;

    await loginView.usernameInput().waitVisible(nemo.data.defaultTimeout);
    await loginView.usernameInput().clear();
    await loginView.usernameInput().sendKeys('testuser@example.com');
    await loginView.passwordInput().clear();
    await loginView.passwordInput().sendKeys('SecurePass123!');
    await loginView.submitButton().click();

    // Wait for dashboard to load
    const dashView = nemo.view.dashboard;
    await dashView.welcomeMessage().waitVisible(nemo.data.defaultTimeout);

    const welcomeText = await dashView.welcomeMessage().getText();
    assert.ok(welcomeText.includes('Welcome'), `Expected welcome text, got: ${welcomeText}`);
  });

  it('should show error for invalid credentials', async function () {
    await nemo.driver.get(`${nemo.data.baseUrl}/login`);
    const loginView = nemo.view.login;

    await loginView.usernameInput().waitVisible(nemo.data.defaultTimeout);
    await loginView.usernameInput().clear();
    await loginView.usernameInput().sendKeys('invalid@example.com');
    await loginView.passwordInput().clear();
    await loginView.passwordInput().sendKeys('wrongpassword');
    await loginView.submitButton().click();

    await loginView.errorMessage().waitVisible(nemo.data.defaultTimeout);
    const errorText = await loginView.errorMessage().getText();
    assert.ok(
      errorText.includes('Invalid email or password'),
      `Expected error message, got: ${errorText}`
    );
  });

  after(async function () {
    if (nemo && nemo.driver) {
      await nemo.driver.quit();
    }
  });
});
```

### Working with Multiple Elements

```javascript
describe('Product Listing', function () {
  this.timeout(30000);
  let nemo;

  before(async function () {
    nemo = this.nemo;
    await nemo.driver.get(`${nemo.data.baseUrl}/products`);
  });

  it('should display product cards', async function () {
    // Find multiple elements using _finds
    const productCards = await nemo.view._finds('[data-testid="product-card"]');
    assert.ok(productCards.length > 0, 'Expected at least one product card');

    // Verify each card has required elements
    for (const card of productCards) {
      const title = await card.findElement({ css: '[data-testid="product-title"]' });
      const titleText = await title.getText();
      assert.ok(titleText.length > 0, 'Product title should not be empty');

      const price = await card.findElement({ css: '[data-testid="product-price"]' });
      const priceText = await price.getText();
      assert.ok(priceText.match(/\$[\d.]+/), `Expected price format, got: ${priceText}`);
    }
  });

  it('should filter products by search query', async function () {
    const searchInput = await nemo.view._find('[data-testid="search-input"]');
    await searchInput.clear();
    await searchInput.sendKeys('laptop');

    const searchBtn = await nemo.view._find('[data-testid="search-submit"]');
    await searchBtn.click();

    // Wait for results to update
    await nemo.view._waitVisible('[data-testid="search-results"]', nemo.data.defaultTimeout);

    const results = await nemo.view._finds('[data-testid="product-card"]');
    assert.ok(results.length > 0, 'Expected search results');
  });

  after(async function () {
    if (nemo && nemo.driver) {
      await nemo.driver.quit();
    }
  });
});
```

### Custom Wait Patterns

```javascript
describe('Dynamic Content', function () {
  this.timeout(30000);
  let nemo;

  before(async function () {
    nemo = this.nemo;
  });

  it('should wait for loading spinner to disappear', async function () {
    await nemo.driver.get(`${nemo.data.baseUrl}/dashboard`);

    // Wait for spinner to appear first
    try {
      await nemo.view._waitVisible('[data-testid="loading-spinner"]', 2000);
    } catch (e) {
      // Spinner may already be gone on fast loads
    }

    // Wait for spinner to disappear
    const { until, By } = require('selenium-webdriver');
    await nemo.driver.wait(
      until.stalenessOf(
        await nemo.driver.findElement(By.css('[data-testid="loading-spinner"]')).catch(() => null)
      ),
      15000,
      'Loading spinner did not disappear'
    );

    // Verify content loaded
    await nemo.view._waitVisible('[data-testid="dashboard-content"]', 10000);
  });

  it('should wait for specific text in element', async function () {
    await nemo.driver.get(`${nemo.data.baseUrl}/status`);

    const { until } = require('selenium-webdriver');
    const statusElement = await nemo.view._find('[data-testid="status-text"]');

    await nemo.driver.wait(async () => {
      const text = await statusElement.getText();
      return text.includes('Connected');
    }, 15000, 'Expected status to show Connected');
  });

  after(async function () {
    if (nemo && nemo.driver) {
      await nemo.driver.quit();
    }
  });
});
```

### Screenshot Capture

```javascript
const fs = require('fs');
const path = require('path');

async function captureScreenshot(nemo, testName) {
  const screenshot = await nemo.driver.takeScreenshot();
  const filename = `${testName.replace(/\s+/g, '-')}-${Date.now()}.png`;
  const filepath = path.join(__dirname, '../../screenshots', filename);
  fs.writeFileSync(filepath, screenshot, 'base64');
  return filepath;
}

// Usage in tests
afterEach(async function () {
  if (this.currentTest.state === 'failed') {
    const screenshotPath = await captureScreenshot(nemo, this.currentTest.title);
    console.log(`Screenshot saved: ${screenshotPath}`);
  }
});
```

### Reusable Helper Functions

```javascript
// test/helpers/wait-helpers.js

async function waitForUrlContains(nemo, urlFragment, timeout = 10000) {
  const { until } = require('selenium-webdriver');
  await nemo.driver.wait(until.urlContains(urlFragment), timeout, `URL did not contain "${urlFragment}" within ${timeout}ms`);
}

async function waitForElementCount(nemo, selector, expectedCount, timeout = 10000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const elements = await nemo.view._finds(selector);
    if (elements.length === expectedCount) return;
    await nemo.driver.sleep(250);
  }
  throw new Error(`Expected ${expectedCount} elements for "${selector}", timed out after ${timeout}ms`);
}

async function clearAndType(nemo, selector, text) {
  const element = await nemo.view._find(selector);
  await element.clear();
  await element.sendKeys(text);
}

module.exports = { waitForUrlContains, waitForElementCount, clearAndType };
```

## Best Practices

1. **Define all locators in view JSON files** -- Never hardcode CSS selectors or XPath in test files. The view system centralizes locator management and simplifies maintenance.
2. **Use `data-testid` attributes** for all selectors. Coordinate with developers to add these attributes, ensuring tests are decoupled from visual styling.
3. **Set explicit timeouts on all waits** -- Use `nemo.data.defaultTimeout` as a baseline but allow individual waits to override for operations that need more or less time.
4. **Implement proper teardown** -- Always call `nemo.driver.quit()` in `after` hooks to prevent orphaned browser processes from accumulating.
5. **Use environment variables** for base URLs, browser selection, and credentials. This allows the same test suite to run across development, staging, and production.
6. **Capture screenshots on failure** using `afterEach` hooks. Store them with descriptive filenames that include the test name and timestamp.
7. **Keep tests atomic** -- Each `it` block should test one behavior. Long tests that verify multiple features are hard to debug and maintain.
8. **Use Mocha's `this.timeout()`** to set appropriate timeouts per test or suite. The default 2-second timeout is usually too short for browser tests.
9. **Create reusable helper functions** for common patterns like login, navigation, and data verification. Import them across test files to reduce duplication.
10. **Run tests in headless mode in CI** to reduce resource usage. Configure Chrome headless flags in the Nemo configuration based on the `CI` environment variable.

## Anti-Patterns

1. **Using `driver.sleep()` for synchronization** -- Static waits are slow and unreliable. Use `_waitVisible()` or Selenium's `until` conditions instead.
2. **Hardcoding selectors in test files** -- Duplicating selectors across tests means a single UI change requires updates in many files.
3. **Not cleaning up browser instances** -- Forgetting `driver.quit()` in teardown leaves zombie Chrome processes that consume memory and crash CI.
4. **Sharing state between tests** -- Tests that rely on side effects from previous tests break when run in isolation or in different order.
5. **Using overly specific CSS selectors** -- Selectors like `div.app > div.main > ul > li:first-child > a` break on minor DOM changes.
6. **Not setting Mocha timeouts** -- Default 2-second timeouts cause false failures on legitimate browser interactions that take longer.
7. **Ignoring element staleness** -- After page navigation or AJAX updates, previously found elements may become stale. Re-query elements after state changes.
8. **Putting test data in code** -- Hardcoded usernames, passwords, and product IDs make tests environment-dependent. Use fixtures and environment variables.
9. **Not using the view system** -- Bypassing Nemo's view abstraction defeats the framework's key benefit of centralized locator management.
10. **Writing monolithic test functions** -- Long `it` blocks that verify multiple behaviors are hard to debug when they fail midway through.

## CLI Reference

```bash
# Run all tests with Mocha
npx mocha test/functional/**/*.test.js --timeout 30000 --recursive

# Run specific test file
npx mocha test/functional/auth/login.test.js --timeout 30000

# Run tests matching a pattern
npx mocha test/functional/**/*.test.js --grep "login" --timeout 30000

# Run with reporter
npx mocha test/functional/**/*.test.js --timeout 30000 --reporter spec

# Run in watch mode
npx mocha test/functional/**/*.test.js --timeout 30000 --watch
```

## Setup

```bash
# Install Nemo and dependencies
npm install --save-dev nemo nemo-view

# Install Selenium WebDriver
npm install --save-dev selenium-webdriver

# Install Chrome driver
npm install --save-dev chromedriver

# Install Mocha
npm install --save-dev mocha

# Install assertion library
npm install --save-dev chai
```
