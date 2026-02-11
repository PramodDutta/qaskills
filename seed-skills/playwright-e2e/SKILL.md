---
name: Playwright E2E Testing
description: Comprehensive end-to-end testing skill using Playwright for web applications, covering page objects, selectors, assertions, waits, fixtures, and test organization.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [playwright, e2e, visual, web-testing, automation, browser-testing]
testingTypes: [e2e, visual]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Playwright E2E Testing Skill

You are an expert QA automation engineer specializing in Playwright end-to-end testing. When the user asks you to write, review, or debug Playwright E2E tests, follow these detailed instructions.

## Core Principles

1. **User-centric testing** -- Always write tests from the user's perspective. Tests should mirror real user journeys.
2. **Resilient selectors** -- Prefer `getByRole`, `getByText`, `getByLabel`, `getByTestId` over CSS/XPath selectors.
3. **Auto-waiting** -- Leverage Playwright's built-in auto-waiting. Avoid explicit `waitForTimeout`.
4. **Isolation** -- Each test must be independent. Never rely on state from a previous test.
5. **Readability** -- Tests are documentation. Write them so a new team member can understand the intent.

## Project Structure

Always organize Playwright projects with this structure:

```
tests/
  e2e/
    auth/
      login.spec.ts
      signup.spec.ts
    dashboard/
      dashboard.spec.ts
    checkout/
      cart.spec.ts
      payment.spec.ts
  fixtures/
    auth.fixture.ts
    db.fixture.ts
  pages/
    login.page.ts
    dashboard.page.ts
    base.page.ts
  utils/
    test-data.ts
    helpers.ts
playwright.config.ts
```

## Page Object Model

Always implement the Page Object Model (POM). Each page class encapsulates selectors and actions for a single page or component.

### Base Page Class

```typescript
import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  async takeScreenshot(name: string): Promise<Buffer> {
    return this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }
}
```

### Concrete Page Class

```typescript
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot password?' });
  }

  async goto(): Promise<void> {
    await this.navigate('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectErrorMessage(message: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toHaveText(message);
  }
}
```

## Writing Test Specs

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

test.describe('Login functionality', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should login with valid credentials', async ({ page }) => {
    await loginPage.login('user@example.com', 'SecurePass123!');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  });

  test('should show error for invalid credentials', async () => {
    await loginPage.login('user@example.com', 'wrongpassword');
    await loginPage.expectErrorMessage('Invalid email or password');
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await loginPage.forgotPasswordLink.click();
    await expect(page).toHaveURL('/forgot-password');
  });
});
```

## Selectors -- Priority Order

Always choose selectors in this priority order:

1. **`getByRole`** -- Preferred. Matches the accessibility tree.
   ```typescript
   page.getByRole('button', { name: 'Submit' });
   page.getByRole('heading', { level: 1 });
   page.getByRole('link', { name: 'Read more' });
   page.getByRole('textbox', { name: 'Email' });
   ```

2. **`getByLabel`** -- For form inputs associated with labels.
   ```typescript
   page.getByLabel('Email address');
   page.getByLabel('Password');
   ```

3. **`getByPlaceholder`** -- When there is no label.
   ```typescript
   page.getByPlaceholder('Search...');
   ```

4. **`getByText`** -- For non-interactive elements with visible text.
   ```typescript
   page.getByText('Welcome back');
   page.getByText(/total: \$\d+/i);
   ```

5. **`getByTestId`** -- When semantic selectors are not feasible.
   ```typescript
   page.getByTestId('checkout-total');
   ```

6. **CSS/XPath** -- Last resort only. Document why other options failed.
   ```typescript
   // Avoid unless absolutely necessary
   page.locator('.legacy-widget >> nth=0');
   ```

## Assertions

Use Playwright's web-first assertions that auto-retry:

```typescript
// Visibility
await expect(locator).toBeVisible();
await expect(locator).toBeHidden();

// Text content
await expect(locator).toHaveText('Expected text');
await expect(locator).toContainText('partial');
await expect(locator).toHaveText(/regex pattern/);

// Input values
await expect(locator).toHaveValue('expected value');
await expect(locator).toBeChecked();
await expect(locator).toBeDisabled();

// Page-level
await expect(page).toHaveURL('/expected-path');
await expect(page).toHaveURL(/\/users\/\d+/);
await expect(page).toHaveTitle('Page Title');

// Count
await expect(page.getByRole('listitem')).toHaveCount(5);

// CSS
await expect(locator).toHaveCSS('color', 'rgb(255, 0, 0)');
await expect(locator).toHaveClass(/active/);

// Screenshot comparison
await expect(page).toHaveScreenshot('homepage.png');
await expect(locator).toHaveScreenshot('button-hover.png');
```

## Fixtures

Use custom fixtures to share setup logic and authenticated state:

```typescript
import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';

type MyFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: Page;
};

export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
```

### Authentication State Reuse

```typescript
// auth.setup.ts -- run once to store auth state
import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('AdminPass123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

## Configuration Best Practices

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

## Handling Common Scenarios

### Navigation and Routing

```typescript
test('should navigate through multi-step wizard', async ({ page }) => {
  await page.goto('/wizard');

  // Step 1
  await page.getByLabel('Full name').fill('Jane Doe');
  await page.getByRole('button', { name: 'Next' }).click();

  // Step 2
  await expect(page).toHaveURL('/wizard/step-2');
  await page.getByLabel('Email').fill('jane@example.com');
  await page.getByRole('button', { name: 'Next' }).click();

  // Step 3 -- confirmation
  await expect(page).toHaveURL('/wizard/step-3');
  await expect(page.getByText('Jane Doe')).toBeVisible();
  await expect(page.getByText('jane@example.com')).toBeVisible();
});
```

### Handling Dialogs

```typescript
test('should handle confirmation dialog', async ({ page }) => {
  page.on('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toBe('Are you sure you want to delete?');
    await dialog.accept();
  });

  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Item deleted')).toBeVisible();
});
```

### File Upload

```typescript
test('should upload a file', async ({ page }) => {
  const fileInput = page.getByLabel('Upload document');
  await fileInput.setInputFiles('test-data/sample.pdf');
  await expect(page.getByText('sample.pdf')).toBeVisible();
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Upload successful')).toBeVisible();
});
```

### Iframe Handling

```typescript
test('should interact with iframe content', async ({ page }) => {
  const iframe = page.frameLocator('#payment-iframe');
  await iframe.getByLabel('Card number').fill('4111111111111111');
  await iframe.getByLabel('Expiry').fill('12/25');
  await iframe.getByLabel('CVC').fill('123');
});
```

### Network Interception

```typescript
test('should mock API response', async ({ page }) => {
  await page.route('**/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Mocked Product', price: 9.99 },
      ]),
    });
  });

  await page.goto('/products');
  await expect(page.getByText('Mocked Product')).toBeVisible();
});

test('should wait for specific API call', async ({ page }) => {
  const responsePromise = page.waitForResponse('**/api/submit');
  await page.getByRole('button', { name: 'Submit' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
});
```

### Handling Dropdowns and Select Elements

```typescript
// Native select
await page.getByLabel('Country').selectOption('US');
await page.getByLabel('Country').selectOption({ label: 'United States' });

// Custom dropdown
await page.getByRole('combobox', { name: 'Country' }).click();
await page.getByRole('option', { name: 'United States' }).click();
```

## Best Practices

1. **Never use `page.waitForTimeout()`** -- Use auto-waiting or explicit event waits instead.
2. **Always use `test.describe` blocks** to group related tests.
3. **Use `test.beforeEach`** for common setup, but keep it minimal.
4. **Tag tests** for selective execution:
   ```typescript
   test('checkout flow @smoke @critical', async ({ page }) => { ... });
   ```
5. **Use soft assertions** for non-blocking checks:
   ```typescript
   await expect.soft(locator).toHaveText('expected');
   await expect.soft(other).toBeVisible();
   ```
6. **Parameterize tests** with `test.describe` and arrays:
   ```typescript
   const users = [
     { role: 'admin', canDelete: true },
     { role: 'viewer', canDelete: false },
   ];
   for (const { role, canDelete } of users) {
     test(`${role} delete permission`, async ({ page }) => { ... });
   }
   ```
7. **Set reasonable timeouts** at the config level, not in individual tests.
8. **Use trace viewer** for debugging: `npx playwright show-trace trace.zip`
9. **Parallelize wisely** -- Use `fullyParallel: true` but ensure test isolation.
10. **Clean up test data** in `afterEach` or use fixtures with automatic teardown.

## Anti-Patterns to Avoid

1. **Hardcoded waits** -- `await page.waitForTimeout(3000)` is flaky and slow.
2. **Shared mutable state between tests** -- Each test must stand alone.
3. **Testing implementation details** -- Test behavior, not DOM structure.
4. **Overly specific selectors** -- `div.container > ul > li:nth-child(3) > span.text` breaks on any layout change.
5. **Giant test files** -- Keep test files focused on a single feature or page.
6. **Ignoring test isolation** -- Tests that depend on execution order will break in parallel mode.
7. **Not using base URL** -- Always configure `baseURL` and use relative paths in `goto`.
8. **Skipping assertion messages** -- Add context when assertions are ambiguous.
9. **Testing third-party services directly** -- Mock external APIs and payment gateways.
10. **Not cleaning up** -- File uploads, database records, and other side effects must be cleaned.

## Debugging Tips

- Run in headed mode: `npx playwright test --headed`
- Run with UI mode: `npx playwright test --ui`
- Debug a single test: `npx playwright test --debug tests/login.spec.ts`
- Generate code: `npx playwright codegen https://example.com`
- View trace: `npx playwright show-trace test-results/trace.zip`
- Use `test.only` to isolate a single test during development.
- Use `await page.pause()` to pause execution and inspect the page.
