---
name: "TestCafe Testing"
description: "Comprehensive TestCafe end-to-end testing skill for writing reliable browser automation tests in JavaScript and TypeScript without WebDriver dependencies, featuring smart assertions, automatic waiting, and parallel execution."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [testcafe, e2e, browser-testing, automation, no-webdriver, parallel-testing]
testingTypes: [e2e, integration, visual]
frameworks: [testcafe]
languages: [javascript, typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# TestCafe Testing

You are an expert QA engineer specializing in TestCafe end-to-end testing. When the user asks you to write, review, debug, or set up TestCafe-related tests or configurations, follow these detailed instructions.

## Core Principles

1. **No WebDriver Dependency** -- TestCafe uses a proxy-based architecture that injects scripts into tested pages. No browser drivers to install or manage. This simplifies setup and improves reliability.
2. **Automatic Waiting** -- TestCafe automatically waits for page loads, XHR requests, and element availability. Avoid adding manual waits unless testing specific timing-sensitive behavior.
3. **Smart Assertions** -- Use TestCafe's built-in assertion library with automatic retries. Assertions like `t.expect(Selector(...).exists).ok()` automatically wait and retry until the timeout expires.
4. **Fixture and Test Organization** -- Group related tests under `fixture` blocks. Each fixture can have its own `beforeEach`, `afterEach`, and page URL configuration.
5. **Selector Best Practices** -- Use `Selector()` with `withText()`, `withAttribute()`, and `nth()` for robust element targeting. Prefer `data-testid` attributes over structural CSS paths.
6. **Page Model Pattern** -- Encapsulate page-specific selectors and actions in Page Model classes for maintainability and reuse across test files.
7. **Concurrent Test Execution** -- TestCafe supports running tests across multiple browsers simultaneously. Design tests to be isolated so they can run concurrently without interference.

## When to Use This Skill

- When setting up TestCafe for a new or existing web project
- When writing end-to-end tests that need to work across Chrome, Firefox, Safari, and Edge
- When you need a test framework without WebDriver dependencies
- When implementing Page Model patterns in TestCafe
- When configuring TestCafe for CI/CD pipelines
- When debugging failing TestCafe tests
- When working with `fixture`, `test`, `Selector`, `ClientFunction`, or `Role` APIs

## Project Structure

```
project-root/
├── .testcaferc.json                # TestCafe configuration file
├── tests/
│   ├── e2e/                        # End-to-end test files
│   │   ├── auth/
│   │   │   ├── login.test.ts
│   │   │   └── registration.test.ts
│   │   ├── checkout/
│   │   │   └── purchase.test.ts
│   │   └── search/
│   │       └── product-search.test.ts
│   ├── page-models/                # Page Model classes
│   │   ├── base.model.ts
│   │   ├── login.model.ts
│   │   ├── dashboard.model.ts
│   │   └── checkout.model.ts
│   ├── roles/                      # Authentication roles
│   │   └── auth-roles.ts
│   ├── helpers/                    # Utility functions
│   │   ├── api-helper.ts
│   │   └── data-factory.ts
│   └── fixtures/                   # Test data
│       └── test-users.json
├── screenshots/                    # Captured screenshots
├── reports/                        # Test reports
└── package.json
```

## Configuration

### .testcaferc.json

```json
{
  "src": "tests/e2e/**/*.test.ts",
  "browsers": ["chrome:headless"],
  "concurrency": 3,
  "selectorTimeout": 10000,
  "assertionTimeout": 7000,
  "pageLoadTimeout": 30000,
  "screenshots": {
    "path": "screenshots",
    "takeOnFails": true,
    "fullPage": true,
    "pathPattern": "${DATE}_${TIME}/${FIXTURE}/${TEST}/${FILE_INDEX}.png"
  },
  "reporter": [
    {
      "name": "spec"
    },
    {
      "name": "xunit",
      "output": "reports/test-results.xml"
    }
  ],
  "quarantineMode": {
    "successThreshold": 1,
    "attemptLimit": 3
  }
}
```

## Page Model Pattern

### Base Model

```typescript
import { Selector, t } from 'testcafe';

export class BaseModel {
  protected baseUrl: string;

  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  }

  async navigateTo(path: string): Promise<void> {
    await t.navigateTo(`${this.baseUrl}${path}`);
  }

  async getPageTitle(): Promise<string> {
    return Selector('title').innerText;
  }

  async waitForElement(selector: string, timeout = 10000): Promise<void> {
    await t.expect(Selector(selector).exists).ok({ timeout });
  }

  async scrollToElement(selector: string): Promise<void> {
    const element = Selector(selector);
    await t.scrollIntoView(element);
  }
}
```

### Login Page Model

```typescript
import { Selector, t } from 'testcafe';
import { BaseModel } from './base.model';

export class LoginModel extends BaseModel {
  usernameInput = Selector('[data-testid="username-input"]');
  passwordInput = Selector('[data-testid="password-input"]');
  submitButton = Selector('[data-testid="login-submit"]');
  errorMessage = Selector('[data-testid="login-error"]');
  rememberCheckbox = Selector('[data-testid="remember-me"]');
  forgotPasswordLink = Selector('[data-testid="forgot-password"]');

  async login(username: string, password: string): Promise<void> {
    await t
      .typeText(this.usernameInput, username, { replace: true })
      .typeText(this.passwordInput, password, { replace: true })
      .click(this.submitButton);
  }

  async getErrorText(): Promise<string> {
    return this.errorMessage.innerText;
  }

  async loginWithRemember(username: string, password: string): Promise<void> {
    await t
      .typeText(this.usernameInput, username, { replace: true })
      .typeText(this.passwordInput, password, { replace: true })
      .click(this.rememberCheckbox)
      .click(this.submitButton);
  }
}

export const loginModel = new LoginModel();
```

## Writing Tests

### Basic Authentication Tests

```typescript
import { loginModel } from '../page-models/login.model';
import { Selector } from 'testcafe';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

fixture('User Authentication')
  .page(`${baseUrl}/login`)
  .beforeEach(async (t) => {
    // Clear cookies before each test
    await t.eval(() => {
      document.cookie.split(';').forEach((c) => {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/');
      });
    });
  });

test('should login with valid credentials', async (t) => {
  await loginModel.login('testuser@example.com', 'SecurePass123!');

  await t
    .expect(Selector('[data-testid="dashboard"]').exists).ok('Dashboard should be visible')
    .expect(Selector('[data-testid="welcome-message"]').innerText).contains('Welcome');
});

test('should show error for invalid credentials', async (t) => {
  await loginModel.login('invalid@example.com', 'wrongpassword');

  const errorText = await loginModel.getErrorText();
  await t.expect(errorText).contains('Invalid email or password');
});

test('should validate required fields', async (t) => {
  await t.click(loginModel.submitButton);

  await t.expect(loginModel.errorMessage.exists).ok('Error should appear for empty fields');
});
```

### Using Roles for Authentication

```typescript
import { Role, Selector } from 'testcafe';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

const adminRole = Role(`${baseUrl}/login`, async (t) => {
  await t
    .typeText('[data-testid="username-input"]', 'admin@example.com')
    .typeText('[data-testid="password-input"]', 'AdminPass123!')
    .click('[data-testid="login-submit"]');
});

const regularUserRole = Role(`${baseUrl}/login`, async (t) => {
  await t
    .typeText('[data-testid="username-input"]', 'user@example.com')
    .typeText('[data-testid="password-input"]', 'UserPass123!')
    .click('[data-testid="login-submit"]');
});

fixture('Admin Panel Access')
  .page(`${baseUrl}/admin`);

test('admin should see admin panel', async (t) => {
  await t
    .useRole(adminRole)
    .navigateTo(`${baseUrl}/admin`)
    .expect(Selector('[data-testid="admin-panel"]').exists).ok();
});

test('regular user should be redirected from admin', async (t) => {
  await t
    .useRole(regularUserRole)
    .navigateTo(`${baseUrl}/admin`)
    .expect(Selector('[data-testid="access-denied"]').exists).ok();
});
```

### ClientFunction for Browser-Side Logic

```typescript
import { ClientFunction, Selector } from 'testcafe';

const getWindowLocation = ClientFunction(() => window.location.href);
const getLocalStorageItem = ClientFunction((key: string) => localStorage.getItem(key));
const scrollToBottom = ClientFunction(() => window.scrollTo(0, document.body.scrollHeight));

fixture('Client-Side Interactions')
  .page(`${process.env.BASE_URL || 'http://localhost:3000'}/`);

test('should update URL after navigation', async (t) => {
  await t.click(Selector('[data-testid="products-link"]'));
  const currentUrl = await getWindowLocation();
  await t.expect(currentUrl).contains('/products');
});

test('should store user preferences in localStorage', async (t) => {
  await t.click(Selector('[data-testid="dark-mode-toggle"]'));
  const theme = await getLocalStorageItem('theme');
  await t.expect(theme).eql('dark');
});

test('should load more items on scroll', async (t) => {
  const initialCount = await Selector('[data-testid="item-card"]').count;
  await scrollToBottom();
  await t.wait(1000); // Wait for lazy load
  const newCount = await Selector('[data-testid="item-card"]').count;
  await t.expect(newCount).gt(initialCount);
});
```

### Request Mocking and Hooks

```typescript
import { RequestMock, Selector } from 'testcafe';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

const mockProductsAPI = RequestMock()
  .onRequestTo(`${baseUrl}/api/products`)
  .respond(
    {
      products: [
        { id: 1, name: 'Mock Product', price: 19.99 },
        { id: 2, name: 'Another Mock', price: 39.99 },
      ],
    },
    200,
    { 'content-type': 'application/json' }
  );

const mockErrorAPI = RequestMock()
  .onRequestTo(`${baseUrl}/api/products`)
  .respond({ error: 'Service Unavailable' }, 503);

fixture('API Mocking')
  .page(`${baseUrl}/products`);

test.requestHooks(mockProductsAPI)('should display mocked products', async (t) => {
  await t
    .expect(Selector('[data-testid="product-card"]').count).eql(2)
    .expect(Selector('[data-testid="product-card"]').nth(0).find('[data-testid="product-name"]').innerText).eql('Mock Product');
});

test.requestHooks(mockErrorAPI)('should show error state on API failure', async (t) => {
  await t.expect(Selector('[data-testid="error-banner"]').exists).ok();
});
```

### File Upload and Download

```typescript
import { Selector } from 'testcafe';
import path from 'path';

fixture('File Operations')
  .page(`${process.env.BASE_URL || 'http://localhost:3000'}/upload`);

test('should upload a file', async (t) => {
  const filePath = path.resolve(__dirname, '../fixtures/test-image.png');
  await t
    .setFilesToUpload('[data-testid="file-input"]', [filePath])
    .expect(Selector('[data-testid="upload-preview"]').exists).ok()
    .click('[data-testid="upload-submit"]')
    .expect(Selector('[data-testid="upload-success"]').exists).ok();
});
```

## Best Practices

1. **Use the Page Model pattern** for all page interactions. Never put raw selectors directly in test files -- encapsulate them in model classes.
2. **Leverage TestCafe's automatic waiting** -- avoid manual `t.wait()` calls. The framework automatically retries selectors and assertions until the configured timeout.
3. **Use `Role` for authentication** to avoid repeating login steps in every test. Roles cache authentication state and restore it efficiently.
4. **Run tests concurrently** with `--concurrency N` to speed up execution. Ensure tests are fully isolated to avoid conflicts.
5. **Enable quarantine mode** for flaky tests during stabilization. This reruns failing tests to distinguish real failures from intermittent issues.
6. **Use `RequestMock`** to isolate frontend tests from backend dependencies. Mock API responses for predictable, fast test execution.
7. **Prefer `withText()` and `withAttribute()`** over complex CSS selectors for filtering elements. These produce more readable and resilient selectors.
8. **Configure `screenshots.takeOnFails`** to automatically capture failure screenshots for debugging in CI environments.
9. **Use `ClientFunction`** for browser-side operations that cannot be expressed through selectors, like checking `localStorage` or `window.location`.
10. **Tag tests with metadata** using `test.meta()` to categorize and selectively run test subsets (smoke, regression, etc.).

## Anti-Patterns

1. **Using `t.wait(N)` for synchronization** -- Static waits slow tests and mask timing issues. TestCafe's smart assertions handle waiting automatically.
2. **Not using Page Models** -- Duplicating selectors across test files leads to high maintenance costs when UI changes.
3. **Creating tests that share state** -- Tests that depend on side effects from other tests break when run in isolation or in parallel.
4. **Using deep CSS paths** like `div.form > div:nth-child(2) > input` -- These break on minor DOM restructuring. Use `data-testid` attributes.
5. **Ignoring quarantine mode results** -- Tests that only pass intermittently have underlying timing or isolation issues that need fixing.
6. **Not configuring timeouts appropriately** -- Default timeouts may be too short for slow environments or too long for fast feedback. Tune per environment.
7. **Overusing `ClientFunction`** -- Running complex logic in the browser context makes debugging harder. Keep client functions minimal and focused.
8. **Not cleaning state between tests** -- Leftover cookies, localStorage, or session data from previous tests cause false positives or failures.
9. **Running all tests in a single browser** -- Missing cross-browser issues. Use `--browsers chrome,firefox` for multi-browser coverage.
10. **Hardcoding base URLs** -- Use environment variables or `.testcaferc.json` to configure URLs per environment.

## CLI Reference

```bash
# Run all tests
npx testcafe chrome tests/

# Run in headless mode
npx testcafe chrome:headless tests/

# Run in multiple browsers
npx testcafe chrome,firefox tests/

# Run with concurrency
npx testcafe chrome tests/ --concurrency 4

# Run specific test file
npx testcafe chrome tests/e2e/auth/login.test.ts

# Run tests matching a pattern
npx testcafe chrome tests/ --test "should login"

# Run with live reload (watch mode)
npx testcafe chrome tests/ --live

# Run with screenshots on failure
npx testcafe chrome tests/ --screenshots path=screenshots,takeOnFails=true

# Run with custom reporter
npx testcafe chrome tests/ --reporter spec,xunit:reports/results.xml

# Debug mode (pause on first action)
npx testcafe chrome tests/ --debug-mode
```

## Setup

```bash
# Install TestCafe
npm install --save-dev testcafe

# For TypeScript support (built-in, no extra config needed)
npm install --save-dev typescript

# Optional: additional reporters
npm install --save-dev testcafe-reporter-html

# Create configuration file
echo '{ "src": "tests/**/*.test.ts", "browsers": ["chrome:headless"] }' > .testcaferc.json
```
