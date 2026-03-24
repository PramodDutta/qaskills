---
name: "NightwatchJS Testing"
description: "Comprehensive NightwatchJS end-to-end testing skill with integrated Selenium WebDriver, built-in assertions, page objects, and parallel test execution for reliable browser automation in JavaScript and TypeScript."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [nightwatch, nightwatchjs, selenium, e2e, browser-testing, page-objects, automation]
testingTypes: [e2e, integration, visual]
frameworks: [nightwatchjs]
languages: [javascript, typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# NightwatchJS Testing

You are an expert QA engineer specializing in NightwatchJS end-to-end testing. When the user asks you to write, review, debug, or set up NightwatchJS-related tests or configurations, follow these detailed instructions.

## Core Principles

1. **Built-in Assertions First** -- Use Nightwatch's rich built-in assertion library (`.assert.visible()`, `.assert.textContains()`, `.assert.urlContains()`) before reaching for custom assertion logic.
2. **Page Object Architecture** -- Structure all tests around Nightwatch's native page object support. Define selectors using `elements` blocks and actions using `commands`.
3. **Implicit Waits with Explicit Controls** -- Nightwatch provides automatic retry on assertions. Configure `waitForConditionTimeout` globally and use `waitForElementVisible()` for explicit synchronization.
4. **Test Isolation** -- Each test file must be independent. Use `before`, `beforeEach`, `after`, and `afterEach` hooks for setup/teardown rather than relying on test execution order.
5. **Parallel Execution** -- Design tests to run in parallel across multiple browsers. Use `--parallel` flag and ensure tests do not share mutable state.
6. **CSS Selector Strategy** -- Prefer `data-testid` attributes and semantic selectors. Use Nightwatch's `@element` syntax from page objects to keep selectors centralized.
7. **Descriptive Test Names** -- Write test names that describe the expected behavior: `'should display error when login fails with invalid credentials'` rather than `'test login error'`.

## When to Use This Skill

- When setting up NightwatchJS for a new or existing project
- When writing end-to-end browser tests with Nightwatch
- When implementing Nightwatch page objects and commands
- When configuring Nightwatch for cross-browser testing
- When debugging flaky Nightwatch tests
- When integrating Nightwatch into CI/CD pipelines
- When working with `nightwatch.conf.js`, `browser.url()`, `.assert`, or `.verify` commands

## Project Structure

```
project-root/
├── nightwatch.conf.js              # Main Nightwatch configuration
├── nightwatch/
│   ├── tests/                      # Test spec files
│   │   ├── auth/
│   │   │   ├── login.ts
│   │   │   └── registration.ts
│   │   ├── checkout/
│   │   │   └── purchase-flow.ts
│   │   └── search/
│   │       └── product-search.ts
│   ├── page-objects/               # Page Object definitions
│   │   ├── loginPage.ts
│   │   ├── dashboardPage.ts
│   │   └── checkoutPage.ts
│   ├── custom-commands/            # Reusable custom commands
│   │   ├── loginViaApi.ts
│   │   └── clearSession.ts
│   ├── custom-assertions/          # Custom assertion definitions
│   │   └── elementHasCount.ts
│   ├── globals/                    # Global hooks and settings
│   │   └── globals.ts
│   └── fixtures/                   # Test data
│       └── users.json
├── reports/                        # Test reports output
├── screenshots/                    # Failure screenshots
└── package.json
```

## Configuration

### nightwatch.conf.js

```javascript
module.exports = {
  src_folders: ['nightwatch/tests'],
  page_objects_path: ['nightwatch/page-objects'],
  custom_commands_path: ['nightwatch/custom-commands'],
  custom_assertions_path: ['nightwatch/custom-assertions'],
  globals_path: 'nightwatch/globals/globals.js',

  webdriver: {},
  test_workers: {
    enabled: true,
    workers: 'auto',
  },
  test_settings: {
    default: {
      disable_error_log: false,
      launch_url: process.env.BASE_URL || 'http://localhost:3000',
      screenshots: {
        enabled: true,
        path: 'screenshots',
        on_failure: true,
        on_error: true,
      },
      desiredCapabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          w3c: true,
          args: process.env.CI
            ? ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
            : [],
        },
      },
      globals: {
        waitForConditionTimeout: 10000,
        retryAssertionTimeout: 5000,
      },
    },
    firefox: {
      desiredCapabilities: {
        browserName: 'firefox',
        'moz:firefoxOptions': {
          args: process.env.CI ? ['--headless'] : [],
        },
      },
    },
  },
};
```

## Page Objects

### Login Page Object

```javascript
module.exports = {
  url: function () {
    return `${this.api.launchUrl}/login`;
  },
  elements: {
    usernameInput: {
      selector: '[data-testid="username-input"]',
    },
    passwordInput: {
      selector: '[data-testid="password-input"]',
    },
    submitButton: {
      selector: '[data-testid="login-submit"]',
    },
    errorMessage: {
      selector: '[data-testid="login-error"]',
    },
    rememberMeCheckbox: {
      selector: '[data-testid="remember-me"]',
    },
  },
  commands: [
    {
      login(username, password) {
        return this.waitForElementVisible('@usernameInput')
          .clearValue('@usernameInput')
          .setValue('@usernameInput', username)
          .clearValue('@passwordInput')
          .setValue('@passwordInput', password)
          .click('@submitButton');
      },
      getErrorText(callback) {
        return this.waitForElementVisible('@errorMessage').getText('@errorMessage', (result) => {
          callback(result.value);
        });
      },
    },
  ],
};
```

### Dashboard Page Object

```javascript
module.exports = {
  url: function () {
    return `${this.api.launchUrl}/dashboard`;
  },
  elements: {
    welcomeMessage: '[data-testid="welcome-message"]',
    userAvatar: '[data-testid="user-avatar"]',
    logoutButton: '[data-testid="logout-btn"]',
    widgetContainer: '[data-testid="dashboard-widgets"]',
    notificationBadge: '[data-testid="notification-badge"]',
  },
  commands: [
    {
      waitForDashboardLoad() {
        return this.waitForElementVisible('@welcomeMessage').waitForElementVisible(
          '@widgetContainer'
        );
      },
      logout() {
        return this.click('@logoutButton');
      },
    },
  ],
};
```

## Writing Tests

### Basic Authentication Test

```javascript
describe('User Authentication', function () {
  let loginPage;
  let dashboardPage;

  before(function (browser) {
    loginPage = browser.page.loginPage();
    dashboardPage = browser.page.dashboardPage();
  });

  it('should login with valid credentials', function () {
    loginPage
      .navigate()
      .login('testuser@example.com', 'SecurePass123!')
      .assert.urlContains('/dashboard');

    dashboardPage.waitForDashboardLoad().assert.visible('@welcomeMessage');
  });

  it('should show error with invalid credentials', function (browser) {
    loginPage.navigate().login('invalid@example.com', 'wrongpassword');

    loginPage.getErrorText(function (text) {
      browser.assert.ok(text.includes('Invalid email or password'));
    });
  });

  it('should validate required fields', function () {
    loginPage.navigate().click('@submitButton');
    loginPage.assert.visible('@errorMessage');
  });

  after(function (browser) {
    browser.end();
  });
});
```

### Element Assertions

```javascript
describe('Product Listing Page', function () {
  it('should display products with correct structure', function (browser) {
    browser
      .url(`${browser.launchUrl}/products`)
      .waitForElementVisible('[data-testid="product-grid"]')
      .assert.elementPresent('[data-testid="product-card"]')
      .assert.textContains('[data-testid="page-title"]', 'Products')
      .assert.elementsCount('[data-testid="product-card"]', 12)
      .assert.attributeContains('[data-testid="product-image"]', 'src', 'https://');
  });

  it('should filter products by category', function (browser) {
    browser
      .url(`${browser.launchUrl}/products`)
      .waitForElementVisible('[data-testid="category-filter"]')
      .click('[data-testid="category-electronics"]')
      .waitForElementVisible('[data-testid="product-card"]')
      .assert.textContains('[data-testid="active-filter"]', 'Electronics');

    browser.elements('css selector', '[data-testid="product-card"]', function (result) {
      this.assert.ok(result.value.length > 0, 'Should have filtered products');
    });
  });

  it('should sort products by price', function (browser) {
    browser
      .url(`${browser.launchUrl}/products`)
      .waitForElementVisible('[data-testid="sort-dropdown"]')
      .click('[data-testid="sort-dropdown"]')
      .click('[data-testid="sort-price-asc"]')
      .pause(500) // Wait for re-render
      .assert.textContains('[data-testid="sort-dropdown"]', 'Price: Low to High');
  });
});
```

### Custom Commands

```javascript
// nightwatch/custom-commands/loginViaApi.js
module.exports = {
  command: async function (username, password) {
    const baseUrl = this.api.launchUrl;

    await this.execute(
      function (url, user, pass) {
        return fetch(`${url}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user, password: pass }),
        })
          .then((res) => res.json())
          .then((data) => {
            document.cookie = `auth_token=${data.token}; path=/`;
            return data;
          });
      },
      [baseUrl, username, password]
    );

    return this.refresh();
  },
};

// Usage in tests:
// browser.loginViaApi('admin@example.com', 'AdminPass123!')
//   .url(`${browser.launchUrl}/admin`)
//   .assert.visible('[data-testid="admin-panel"]');
```

### Custom Assertions

```javascript
// nightwatch/custom-assertions/elementHasCount.js
exports.assertion = function (selector, expectedCount) {
  this.message = `Testing if element <${selector}> appears ${expectedCount} times`;
  this.expected = expectedCount;

  this.pass = function (value) {
    return value === expectedCount;
  };

  this.value = function (result) {
    return result.value.length;
  };

  this.command = function (callback) {
    return this.api.elements('css selector', selector, callback);
  };
};

// Usage: browser.assert.elementHasCount('[data-testid="cart-item"]', 3)
```

### Multi-Browser Testing

```javascript
describe('Cross-Browser Compatibility', function () {
  it('should render header consistently', function (browser) {
    browser
      .url(browser.launchUrl)
      .waitForElementVisible('[data-testid="site-header"]')
      .assert.visible('[data-testid="logo"]')
      .assert.visible('[data-testid="nav-menu"]')
      .assert.cssProperty('[data-testid="site-header"]', 'display', 'flex');
  });
});
```

## Best Practices

1. **Use Nightwatch's `@element` syntax** from page objects to keep selectors centralized and maintainable. Reference elements as `'@usernameInput'` rather than repeating raw selectors.
2. **Configure `waitForConditionTimeout` globally** in the `globals` section rather than adding explicit waits to every command.
3. **Enable `test_workers`** for parallel execution. Set `workers: 'auto'` to use all available CPU cores for maximum throughput.
4. **Use `assert` for hard assertions** (fail immediately) and `verify` for soft assertions (continue execution and report at the end).
5. **Capture screenshots on failure** via the `screenshots` configuration. Enable both `on_failure` and `on_error` for comprehensive visual debugging.
6. **Implement custom commands** for repetitive multi-step operations like API-based login, clearing sessions, or seeding test data.
7. **Leverage Nightwatch's built-in Selenium manager** -- modern Nightwatch auto-manages browser drivers, eliminating manual driver installation.
8. **Use `--env` flag for multi-browser runs**: `npx nightwatch --env chrome,firefox` to execute tests across browsers in a single command.
9. **Structure tests by feature domain** (auth, checkout, search) rather than by page name. This keeps related behavior tests together.
10. **Set `retryAssertionTimeout`** in globals to automatically retry failing assertions, which handles minor timing issues without explicit waits.

## Anti-Patterns

1. **Using `browser.pause()` for synchronization** -- Arbitrary sleeps make tests slow and unreliable. Use `waitForElementVisible()` or `waitForElementPresent()` instead.
2. **Writing tests that depend on execution order** -- Tests should be fully independent. Use `before`/`beforeEach` hooks for setup, not prior test results.
3. **Hardcoding selectors in test files** -- Duplicating selectors across tests means changing one selector requires updating dozens of files. Use page objects.
4. **Not using page object commands** -- Putting multi-step interactions directly in tests creates duplication. Encapsulate sequences like login flows in page object commands.
5. **Ignoring test worker compatibility** -- Tests that share global variables or browser state fail when run in parallel. Ensure full isolation.
6. **Using `.verify` when `.assert` is needed** -- Soft assertions can mask failures. Use `.assert` for critical checks and `.verify` only when continuing execution is truly desired.
7. **Skipping `browser.end()` in teardown** -- Not closing the browser session causes resource leaks and can make subsequent tests fail.
8. **Nesting describes too deeply** -- More than two levels of nesting makes tests hard to read and maintain. Keep the hierarchy flat.
9. **Using complex XPath expressions** -- XPath is slower and harder to maintain than CSS selectors. Only use XPath when CSS cannot express the query.
10. **Not setting up globals for environment config** -- Hardcoding URLs, timeouts, and credentials in test files prevents running tests across different environments.

## CLI Reference

```bash
# Run all tests
npx nightwatch

# Run specific test file
npx nightwatch nightwatch/tests/auth/login.ts

# Run tests in a specific folder
npx nightwatch --group auth

# Run tests matching a tag
npx nightwatch --tag smoke

# Run against specific browser
npx nightwatch --env firefox

# Run multi-browser
npx nightwatch --env chrome,firefox

# Run in parallel
npx nightwatch --parallel

# Run with verbose output
npx nightwatch --verbose

# Run specific test by name
npx nightwatch --testcase "should login with valid credentials"
```

## Setup

```bash
# Initialize a new Nightwatch project
npm init nightwatch@latest

# Or install manually
npm install --save-dev nightwatch

# For Chrome testing
npm install --save-dev chromedriver

# For TypeScript support
npm install --save-dev typescript ts-node @types/nightwatch

# Create configuration file
npx nightwatch --init
```
