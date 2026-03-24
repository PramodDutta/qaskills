---
name: "Protractor Testing"
description: "Comprehensive Protractor end-to-end testing skill for Angular and AngularJS applications with Angular-specific locators, automatic waitForAngular synchronization, Page Object patterns, and migration guidance to modern frameworks."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [protractor, angular, angularjs, e2e, selenium, browser-testing, migration]
testingTypes: [e2e, integration]
frameworks: [protractor]
languages: [javascript, typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Protractor Testing

You are an expert QA engineer specializing in Protractor end-to-end testing for Angular applications. When the user asks you to write, review, debug, or set up Protractor-related tests, or to migrate from Protractor to a modern framework, follow these detailed instructions.

**Important Note:** Protractor reached end-of-life in 2023 and is no longer actively maintained. For new projects, recommend Playwright or Cypress. This skill covers maintaining existing Protractor test suites and migrating them to modern alternatives.

## Core Principles

1. **Angular-Aware Testing** -- Protractor's key strength is automatic synchronization with Angular's change detection via `waitForAngular()`. Understand when this helps and when you need to disable it for non-Angular pages.
2. **Angular-Specific Locators** -- Use `by.model()`, `by.binding()`, `by.repeater()`, and `by.cssContainingText()` for Angular/AngularJS-specific element targeting when they are available.
3. **Page Object Model** -- Encapsulate all page interactions in Page Object classes. Each page or component gets its own class with locators as properties and actions as methods.
4. **Explicit over Implicit Waits** -- While Protractor handles Angular synchronization, use `browser.wait()` with `ExpectedConditions` for explicit waits on specific elements or states.
5. **Migration Awareness** -- When writing new tests or refactoring existing ones, always consider migration to Playwright or Cypress. Write patterns that translate cleanly to modern frameworks.
6. **Test Data Independence** -- Each test must set up its own data. Use API calls or database seeds in `beforeEach` rather than relying on other tests to create state.
7. **Control Flow Management** -- Protractor uses WebDriver's control flow for promise management. Understand the async/await migration path and prefer explicit `async/await` in all new code.

## When to Use This Skill

- When maintaining an existing Protractor test suite for an Angular application
- When debugging failing Protractor tests
- When migrating Protractor tests to Playwright, Cypress, or another modern framework
- When working with `protractor.conf.js`, `element(by.model())`, `browser.get()`, or `browser.wait()`
- When dealing with Angular-specific synchronization issues
- When configuring Protractor for CI/CD pipelines

## Project Structure

```
project-root/
├── protractor.conf.js              # Protractor configuration
├── e2e/
│   ├── specs/                      # Test spec files
│   │   ├── auth/
│   │   │   ├── login.spec.ts
│   │   │   └── registration.spec.ts
│   │   ├── dashboard/
│   │   │   └── widgets.spec.ts
│   │   └── forms/
│   │       └── contact-form.spec.ts
│   ├── page-objects/               # Page Object classes
│   │   ├── base.po.ts
│   │   ├── login.po.ts
│   │   ├── dashboard.po.ts
│   │   └── form.po.ts
│   ├── helpers/                    # Utility functions
│   │   ├── wait-helpers.ts
│   │   └── api-helpers.ts
│   └── fixtures/                   # Test data
│       └── test-users.json
├── reports/                        # Test reports
├── screenshots/                    # Failure screenshots
└── package.json
```

## Configuration

### protractor.conf.js

```javascript
const { SpecReporter } = require('jasmine-spec-reporter');

exports.config = {
  allScriptsTimeout: 30000,
  specs: ['./e2e/specs/**/*.spec.ts'],
  capabilities: {
    browserName: 'chrome',
    chromeOptions: {
      args: process.env.CI
        ? ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
        : [],
    },
  },
  directConnect: true,
  baseUrl: process.env.BASE_URL || 'http://localhost:4200',
  framework: 'jasmine',
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 60000,
    print: function () {},
  },
  onPrepare() {
    require('ts-node').register({
      project: require('path').join(__dirname, './tsconfig.json'),
    });
    jasmine.getEnv().addReporter(
      new SpecReporter({
        spec: { displayStacktrace: 'pretty' },
      })
    );

    // Screenshot on failure
    const originalAddExpectationResult = jasmine.Spec.prototype.addExpectationResult;
    jasmine.Spec.prototype.addExpectationResult = function () {
      if (!arguments[0]) {
        browser.takeScreenshot().then((png) => {
          const fs = require('fs');
          const stream = fs.createWriteStream(`screenshots/failure-${Date.now()}.png`);
          stream.write(Buffer.from(png, 'base64'));
          stream.end();
        });
      }
      return originalAddExpectationResult.apply(this, arguments);
    };
  },
};
```

## Page Object Model

### Base Page Object

```typescript
import { browser, element, by, ExpectedConditions as EC } from 'protractor';

export class BasePage {
  async navigateTo(path: string): Promise<void> {
    await browser.get(path);
  }

  async waitForElement(locator: any, timeout = 10000): Promise<void> {
    await browser.wait(EC.visibilityOf(element(locator)), timeout);
  }

  async waitForElementToDisappear(locator: any, timeout = 10000): Promise<void> {
    await browser.wait(EC.invisibilityOf(element(locator)), timeout);
  }

  async getText(locator: any): Promise<string> {
    await this.waitForElement(locator);
    return element(locator).getText();
  }

  async click(locator: any): Promise<void> {
    await browser.wait(EC.elementToBeClickable(element(locator)), 10000);
    await element(locator).click();
  }

  async type(locator: any, text: string): Promise<void> {
    await this.waitForElement(locator);
    const el = element(locator);
    await el.clear();
    await el.sendKeys(text);
  }

  async getCurrentUrl(): Promise<string> {
    return browser.getCurrentUrl();
  }

  async getTitle(): Promise<string> {
    return browser.getTitle();
  }
}
```

### Login Page Object

```typescript
import { by } from 'protractor';
import { BasePage } from './base.po';

export class LoginPage extends BasePage {
  private locators = {
    usernameInput: by.css('[data-testid="username-input"]'),
    passwordInput: by.css('[data-testid="password-input"]'),
    submitButton: by.css('[data-testid="login-submit"]'),
    errorMessage: by.css('[data-testid="login-error"]'),
    forgotPasswordLink: by.css('[data-testid="forgot-password"]'),
    // Angular-specific locators for AngularJS apps
    emailModel: by.model('user.email'),
    passwordModel: by.model('user.password'),
  };

  async login(username: string, password: string): Promise<void> {
    await this.type(this.locators.usernameInput, username);
    await this.type(this.locators.passwordInput, password);
    await this.click(this.locators.submitButton);
  }

  async getError(): Promise<string> {
    return this.getText(this.locators.errorMessage);
  }

  async open(): Promise<void> {
    await this.navigateTo('/login');
  }
}
```

## Writing Tests

### Authentication Tests

```typescript
import { browser, ExpectedConditions as EC, element, by } from 'protractor';
import { LoginPage } from '../page-objects/login.po';

describe('User Authentication', () => {
  const loginPage = new LoginPage();

  beforeEach(async () => {
    await loginPage.open();
  });

  it('should login with valid credentials', async () => {
    await loginPage.login('testuser@example.com', 'SecurePass123!');
    const url = await browser.getCurrentUrl();
    expect(url).toContain('/dashboard');
  });

  it('should show error for invalid credentials', async () => {
    await loginPage.login('invalid@example.com', 'wrongpassword');
    const error = await loginPage.getError();
    expect(error).toContain('Invalid email or password');
  });

  it('should redirect to requested page after login', async () => {
    await browser.get('/profile');
    // Should redirect to login
    const loginUrl = await browser.getCurrentUrl();
    expect(loginUrl).toContain('/login');

    await loginPage.login('testuser@example.com', 'SecurePass123!');
    const profileUrl = await browser.getCurrentUrl();
    expect(profileUrl).toContain('/profile');
  });
});
```

### Angular-Specific Locators

```typescript
import { element, by } from 'protractor';

describe('Angular Form (AngularJS)', () => {
  it('should bind input to model', async () => {
    await browser.get('/contact');

    // AngularJS-specific locators
    const nameInput = element(by.model('contact.name'));
    await nameInput.sendKeys('John Doe');

    // Check binding
    const displayedName = element(by.binding('contact.name'));
    expect(await displayedName.getText()).toBe('John Doe');
  });

  it('should iterate over repeater elements', async () => {
    await browser.get('/contacts');

    const contacts = element.all(by.repeater('contact in contacts'));
    const count = await contacts.count();
    expect(count).toBeGreaterThan(0);

    // Access specific item in repeater
    const firstName = contacts.get(0).element(by.binding('contact.name'));
    expect(await firstName.getText()).toBeTruthy();
  });

  it('should use cssContainingText for text-based selection', async () => {
    await browser.get('/nav');
    const settingsLink = element(by.cssContainingText('.nav-item', 'Settings'));
    await settingsLink.click();
    expect(await browser.getCurrentUrl()).toContain('/settings');
  });
});
```

### Handling Non-Angular Pages

```typescript
describe('Non-Angular Page Interactions', () => {
  it('should handle non-Angular login page', async () => {
    // Disable Angular synchronization for non-Angular pages
    await browser.waitForAngularEnabled(false);

    await browser.get('https://external-service.example.com/login');
    await element(by.css('#username')).sendKeys('admin');
    await element(by.css('#password')).sendKeys('password123');
    await element(by.css('#login-btn')).click();

    // Wait manually since Angular sync is off
    await browser.wait(
      EC.urlContains('/dashboard'),
      10000,
      'Expected redirect to dashboard'
    );

    // Re-enable for Angular pages
    await browser.waitForAngularEnabled(true);
  });
});
```

### ExpectedConditions Usage

```typescript
import { browser, element, by, ExpectedConditions as EC } from 'protractor';

describe('Advanced Wait Patterns', () => {
  it('should wait for element visibility', async () => {
    await browser.get('/dashboard');
    const widget = element(by.css('[data-testid="analytics-widget"]'));
    await browser.wait(EC.visibilityOf(widget), 15000, 'Widget did not appear');
    expect(await widget.isDisplayed()).toBe(true);
  });

  it('should wait for text in element', async () => {
    await browser.get('/status');
    const statusEl = element(by.css('[data-testid="status-text"]'));
    await browser.wait(EC.textToBePresentInElement(statusEl, 'Connected'), 10000);
    expect(await statusEl.getText()).toContain('Connected');
  });

  it('should combine conditions with AND/OR', async () => {
    const modal = element(by.css('[data-testid="modal"]'));
    const overlay = element(by.css('[data-testid="overlay"]'));

    // Wait for BOTH modal and overlay to be visible
    await browser.wait(
      EC.and(EC.visibilityOf(modal), EC.visibilityOf(overlay)),
      10000,
      'Modal or overlay did not appear'
    );
  });
});
```

## Migration Guide: Protractor to Playwright

```typescript
// PROTRACTOR (old)
import { browser, element, by, ExpectedConditions as EC } from 'protractor';

await browser.get('/login');
await element(by.css('[data-testid="username"]')).sendKeys('user@test.com');
await element(by.css('[data-testid="password"]')).sendKeys('pass123');
await element(by.css('[data-testid="submit"]')).click();
await browser.wait(EC.urlContains('/dashboard'), 10000);

// PLAYWRIGHT (new)
import { test, expect } from '@playwright/test';

await page.goto('/login');
await page.locator('[data-testid="username"]').fill('user@test.com');
await page.locator('[data-testid="password"]').fill('pass123');
await page.locator('[data-testid="submit"]').click();
await expect(page).toHaveURL(/.*dashboard/);
```

```typescript
// PROTRACTOR page object
export class LoginPageProtractor {
  usernameInput = element(by.css('[data-testid="username"]'));
  async login(user: string, pass: string) {
    await this.usernameInput.sendKeys(user);
    await element(by.css('[data-testid="password"]')).sendKeys(pass);
    await element(by.css('[data-testid="submit"]')).click();
  }
}

// PLAYWRIGHT page object
export class LoginPagePlaywright {
  constructor(private page: Page) {}
  async login(user: string, pass: string) {
    await this.page.locator('[data-testid="username"]').fill(user);
    await this.page.locator('[data-testid="password"]').fill(pass);
    await this.page.locator('[data-testid="submit"]').click();
  }
}
```

## Best Practices

1. **Use async/await everywhere** -- Protractor's implicit promise management (control flow) is deprecated. Write all tests with explicit `async/await` for clarity and future migration compatibility.
2. **Prefer `data-testid` selectors** over Angular-specific locators (`by.model`, `by.binding`) for new tests. These translate directly to modern frameworks during migration.
3. **Use `ExpectedConditions`** for explicit waits rather than `browser.sleep()`. Combine conditions with `EC.and()` and `EC.or()` for complex wait scenarios.
4. **Implement the Page Object pattern** for every page and reusable component. This isolates locator changes and makes migration to other frameworks straightforward.
5. **Capture screenshots on failure** using Jasmine reporter hooks. Visual evidence of failures dramatically speeds up debugging.
6. **Run headless in CI** by configuring `chromeOptions.args` with `--headless`. This reduces resource usage and speeds up pipeline execution.
7. **Disable Angular sync for non-Angular pages** with `browser.waitForAngularEnabled(false)`. Forgetting this causes infinite waits on non-Angular content.
8. **Set appropriate timeouts** -- `allScriptsTimeout` for page loads, `defaultTimeoutInterval` for individual tests, and specific timeouts for `browser.wait()` calls.
9. **Plan your migration strategy** -- Map Protractor APIs to their Playwright/Cypress equivalents. Migrate one spec file at a time, running both frameworks in parallel during transition.
10. **Use `directConnect: true`** to bypass Selenium Server and connect directly to ChromeDriver. This is faster and simpler for single-browser local testing.

## Anti-Patterns

1. **Using `browser.sleep()`** -- Static waits slow tests and hide timing issues. Use `browser.wait()` with `ExpectedConditions` for reliable synchronization.
2. **Relying on control flow promises** -- The implicit promise chain is deprecated and behaves unpredictably. Use `async/await` consistently.
3. **Not disabling Angular sync for non-Angular pages** -- Protractor hangs indefinitely waiting for Angular on pages that do not use Angular.
4. **Hardcoding test data** -- Embedding credentials, URLs, and IDs directly in specs makes tests environment-dependent and hard to maintain.
5. **Using `by.xpath()` for simple queries** -- XPath is slower and harder to read than CSS selectors. Only use XPath when CSS cannot express the query.
6. **Writing tests that depend on other tests** -- Tests that require prior tests to run create fragile, non-parallelizable suites.
7. **Ignoring deprecation warnings** -- Protractor is end-of-life. Continuing to build large new test suites on it accumulates technical debt.
8. **Not using Page Objects** -- Putting locators directly in test files leads to duplication and makes selector changes expensive.
9. **Forgetting to handle stale elements** -- After page transitions or dynamic updates, element references may become stale. Re-query elements after state changes.
10. **Running tests sequentially in CI** -- Not configuring parallel execution wastes pipeline time. Use `shardTestFiles: true` with `maxInstances` for parallelism.

## CLI Reference

```bash
# Run all tests
npx protractor protractor.conf.js

# Run specific spec
npx protractor protractor.conf.js --specs=e2e/specs/auth/login.spec.ts

# Run with specific base URL
npx protractor protractor.conf.js --baseUrl=http://staging.example.com

# Update WebDriver binaries
npx webdriver-manager update

# Start Selenium Server (if not using directConnect)
npx webdriver-manager start

# Run with verbose logging
npx protractor protractor.conf.js --troubleshoot
```

## Setup

```bash
# Install Protractor
npm install --save-dev protractor

# Install TypeScript support
npm install --save-dev typescript ts-node @types/jasmine @types/jasminewd2

# Install reporter
npm install --save-dev jasmine-spec-reporter

# Update browser drivers
npx webdriver-manager update
```
