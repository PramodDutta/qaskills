import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Best Practices: 25 Rules for Reliable Test Automation in 2026',
  description: 'Master 25 Playwright best practices for 2026 including auto-waiting, web-first assertions, POM pattern, fixtures, parallelism, retries, trace viewer, network mocking, and CI optimization with code examples.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
Playwright is the leading E2E testing framework in 2026, but using it well requires more than reading the documentation. The difference between a Playwright test suite that is fast, reliable, and maintainable versus one that is slow, flaky, and painful to work with comes down to following proven best practices.

This guide presents 25 rules for reliable Playwright test automation. Each rule includes a brief explanation of why it matters, a "bad" code example showing the common mistake, and a "good" code example showing the recommended approach.

---

## Table of Contents

1. [Locator Best Practices (Rules 1-6)](#locator-best-practices)
2. [Assertion Best Practices (Rules 7-10)](#assertion-best-practices)
3. [Test Structure Best Practices (Rules 11-15)](#test-structure-best-practices)
4. [Test Data and State (Rules 16-19)](#test-data-and-state)
5. [Performance and CI (Rules 20-23)](#performance-and-ci)
6. [Debugging and Maintenance (Rules 24-25)](#debugging-and-maintenance)
7. [Frequently Asked Questions](#frequently-asked-questions)

---

## Locator Best Practices {#locator-best-practices}

How you find elements on the page determines how resilient your tests are to UI changes. These six rules ensure your locators survive refactors, redesigns, and framework upgrades.

### Rule 1: Use Role-Based Locators as Your Default

Role-based locators (\`getByRole\`) target elements by their accessibility role, which reflects how users and assistive technologies perceive the element. They are the most resilient locator strategy because roles change less frequently than CSS classes, IDs, or DOM structure.

**Bad:**

\`\`\`typescript
// Fragile: CSS class names change during refactors
await page.click('.btn-primary.submit-form');

// Fragile: IDs are often auto-generated or removed
await page.click('#submit-btn-42');

// Fragile: XPath breaks when DOM structure changes
await page.click('//div[@class="form"]/button[2]');
\`\`\`

**Good:**

\`\`\`typescript
// Resilient: targets the semantic role and accessible name
await page.getByRole('button', { name: 'Submit' })
  .click();

// For navigation links
await page.getByRole('link', { name: 'Dashboard' })
  .click();

// For form fields
await page.getByRole('textbox', { name: 'Email' })
  .fill('user@example.com');

// For headings
await expect(
  page.getByRole('heading', { name: 'Welcome' })
).toBeVisible();
\`\`\`

**Why it matters:** When a developer changes \`<button class="btn-primary">\` to \`<button class="btn-submit">\`, CSS-based locators break. But the element is still a button named "Submit," so \`getByRole('button', { name: 'Submit' })\` continues to work.

---

### Rule 2: Use getByLabel for Form Inputs

Form inputs should be located by their associated label text, which is how users identify form fields. This also validates that your labels are properly associated with their inputs (an accessibility requirement).

**Bad:**

\`\`\`typescript
// Targets input by name attribute - not user-visible
await page.locator('input[name="email"]')
  .fill('user@example.com');

// Targets by placeholder - not a reliable identifier
await page.locator('[placeholder="Enter your email"]')
  .fill('user@example.com');
\`\`\`

**Good:**

\`\`\`typescript
// Targets by the visible label text
await page.getByLabel('Email address')
  .fill('user@example.com');

await page.getByLabel('Password')
  .fill('secret123');

// Works with labels using "for" attribute or wrapping
await page.getByLabel('I agree to the terms')
  .check();
\`\`\`

**Why it matters:** If the label text changes, you want your test to break because the user experience changed. If only the \`name\` attribute or CSS class changes, you do not want your test to break because the user experience is identical.

---

### Rule 3: Use getByTestId Only as a Last Resort

Test IDs (\`data-testid\`) are a fallback for elements that lack accessible roles or visible text. They are better than CSS selectors but worse than role-based locators because they do not validate accessibility and they require developers to add attributes specifically for testing.

**Bad:**

\`\`\`typescript
// Using test IDs for everything, even when
// accessible locators exist
await page.getByTestId('login-email-input')
  .fill('user@test.com');
await page.getByTestId('login-password-input')
  .fill('password');
await page.getByTestId('login-submit-button')
  .click();
\`\`\`

**Good:**

\`\`\`typescript
// Prefer accessible locators; use testid only when
// there is no accessible alternative
await page.getByLabel('Email').fill('user@test.com');
await page.getByLabel('Password').fill('password');
await page.getByRole('button', { name: 'Sign in' })
  .click();

// Test ID is appropriate for elements without
// visible text or accessible role
await page.getByTestId('chart-container')
  .screenshot();
\`\`\`

---

### Rule 4: Scope Locators to Reduce Ambiguity

When multiple elements match the same locator, scope your locator to a specific section of the page. Use \`locator()\` chaining or \`getByRole()\` within a parent element.

**Bad:**

\`\`\`typescript
// Ambiguous: might match "Delete" buttons in
// multiple sections
await page.getByRole('button', { name: 'Delete' })
  .click();
\`\`\`

**Good:**

\`\`\`typescript
// Scoped: targets "Delete" within a specific section
const userCard = page.getByTestId('user-card-123');
await userCard.getByRole('button', { name: 'Delete' })
  .click();

// Or scope using role-based parent
const sidebar = page.getByRole('navigation');
await sidebar.getByRole('link', { name: 'Settings' })
  .click();

// Or use .filter() for list items
await page.getByRole('listitem')
  .filter({ hasText: 'Premium Plan' })
  .getByRole('button', { name: 'Select' })
  .click();
\`\`\`

---

### Rule 5: Never Use Hard-Coded Waits

Playwright has built-in auto-waiting on all actions. Adding \`waitForTimeout\` (or \`page.waitForTimeout\`) introduces unnecessary delays and creates flaky tests that fail when the application is slower than expected.

**Bad:**

\`\`\`typescript
await page.click('#submit');
// Hard-coded wait - too slow on fast systems,
// too short on slow systems
await page.waitForTimeout(3000);
await expect(page.locator('.success-message'))
  .toBeVisible();
\`\`\`

**Good:**

\`\`\`typescript
await page.getByRole('button', { name: 'Submit' })
  .click();

// Auto-waits up to the configured timeout (default 30s)
await expect(
  page.getByText('Submission successful')
).toBeVisible();

// For specific conditions, use waitFor with a
// meaningful condition
await page.waitForResponse(
  (resp) => resp.url().includes('/api/submit')
    && resp.status() === 200
);
\`\`\`

**Why it matters:** Hard-coded waits of 3 seconds waste 3 seconds on every run even when the element appears in 100ms. On slow CI environments, 3 seconds might not be enough, causing flaky failures. Auto-waiting adapts to the actual response time.

---

### Rule 6: Prefer User-Visible Locators Over CSS/XPath

Think about how a human user identifies elements on the page: by their visible text, their role (button, link, input), or their label. Your locators should mirror this human approach.

**Bad:**

\`\`\`typescript
// Developer-centric: requires inspecting the DOM
await page.locator(
  'div.container > section:nth-child(2) > ul > li:first-child > a'
).click();
\`\`\`

**Good:**

\`\`\`typescript
// User-centric: describes what the user sees
await page.getByRole('link', { name: 'Getting Started' })
  .click();
\`\`\`

---

## Assertion Best Practices {#assertion-best-practices}

Assertions determine whether a test passes or fails. Web-first assertions are auto-retrying, which eliminates flakiness caused by timing issues.

### Rule 7: Always Use Web-First Assertions

Web-first assertions (from \`expect(locator)\`) automatically retry until the condition is met or the timeout expires. Generic assertions (\`expect(value)\`) do not retry.

**Bad:**

\`\`\`typescript
// Non-retrying: checks once and fails immediately
// if the element has not appeared yet
const text = await page.locator('.message').textContent();
expect(text).toBe('Success');

// Non-retrying: isVisible() returns a boolean snapshot
const visible = await page.locator('.toast').isVisible();
expect(visible).toBe(true);
\`\`\`

**Good:**

\`\`\`typescript
// Web-first: retries until the text matches or timeout
await expect(page.getByText('Success'))
  .toBeVisible();

// Web-first: retries until the element has the text
await expect(page.locator('.message'))
  .toHaveText('Success');

// Web-first: retries until the element has the value
await expect(page.getByLabel('Email'))
  .toHaveValue('user@test.com');
\`\`\`

**Why it matters:** SPAs update the DOM asynchronously. An element might not have its final text content when your assertion runs. Web-first assertions handle this automatically, eliminating an entire category of flaky test failures.

---

### Rule 8: Assert on User-Visible Outcomes

Tests should assert on what the user sees, not on internal implementation details. This makes tests more meaningful and less fragile.

**Bad:**

\`\`\`typescript
// Asserts on internal state (CSS class, attribute)
await expect(page.locator('.form'))
  .toHaveClass(/submitted/);

await expect(page.locator('#status'))
  .toHaveAttribute('data-state', 'complete');
\`\`\`

**Good:**

\`\`\`typescript
// Asserts on user-visible outcomes
await expect(
  page.getByText('Your order has been placed')
).toBeVisible();

await expect(page.getByRole('alert'))
  .toContainText('Payment successful');

// URL assertion for navigation
await expect(page).toHaveURL('/dashboard');

// Title assertion
await expect(page).toHaveTitle('Dashboard - MyApp');
\`\`\`

---

### Rule 9: Use Soft Assertions for Non-Critical Checks

Soft assertions record failures but do not stop test execution. Use them when you want to check multiple conditions and see all failures at once instead of stopping at the first one.

**Bad:**

\`\`\`typescript
// Stops at first failure; you miss other potential issues
await expect(page.getByText('Name: John')).toBeVisible();
await expect(page.getByText('Email: john@test.com'))
  .toBeVisible();
await expect(page.getByText('Role: Admin')).toBeVisible();
await expect(page.getByText('Status: Active'))
  .toBeVisible();
\`\`\`

**Good:**

\`\`\`typescript
// Soft assertions: reports ALL failures, not just first
await expect.soft(page.getByText('Name: John'))
  .toBeVisible();
await expect.soft(
  page.getByText('Email: john@test.com')
).toBeVisible();
await expect.soft(page.getByText('Role: Admin'))
  .toBeVisible();
await expect.soft(page.getByText('Status: Active'))
  .toBeVisible();
\`\`\`

---

### Rule 10: Set Meaningful Assertion Messages

When assertions fail, descriptive messages help identify the issue without reading the full test code.

**Bad:**

\`\`\`typescript
await expect(page.getByTestId('count'))
  .toHaveText('5');
// Failure: Expected "5", received "3"
// (what count? why 5?)
\`\`\`

**Good:**

\`\`\`typescript
await expect(
  page.getByTestId('cart-item-count'),
  'Cart should show 5 items after adding 3 items'
  + ' to the 2 already in cart'
).toHaveText('5');
\`\`\`

---

## Test Structure Best Practices {#test-structure-best-practices}

How you organize and structure tests determines long-term maintainability and debugging efficiency.

### Rule 11: Use Page Object Model for Reusable Pages

The Page Object Model (POM) encapsulates page-specific selectors and actions in dedicated classes. This creates a single place to update when the UI changes.

**Bad:**

\`\`\`typescript
// Selectors duplicated across multiple test files
test('login test 1', async ({ page }) => {
  await page.getByLabel('Email')
    .fill('admin@test.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' })
    .click();
  await expect(page).toHaveURL('/dashboard');
});

// Same selectors repeated in another file
test('login test 2', async ({ page }) => {
  await page.getByLabel('Email')
    .fill('user@test.com');
  await page.getByLabel('Password').fill('pass123');
  await page.getByRole('button', { name: 'Sign in' })
    .click();
});
\`\`\`

**Good:**

\`\`\`typescript
// pages/login.page.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password')
      .fill(password);
    await this.page.getByRole('button',
      { name: 'Sign in' }).click();
  }

  async expectLoggedIn() {
    await expect(this.page).toHaveURL('/dashboard');
  }

  async expectError(message: string) {
    await expect(
      this.page.getByRole('alert')
    ).toContainText(message);
  }
}

// tests/login.spec.ts
test('admin can login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('admin@test.com', 'secret');
  await loginPage.expectLoggedIn();
});
\`\`\`

---

### Rule 12: Use Fixtures for Test Setup and Shared State

Playwright fixtures provide a clean way to set up and tear down test dependencies. They ensure test isolation and reduce boilerplate.

**Bad:**

\`\`\`typescript
// Setup logic duplicated in every test
test('create project', async ({ page }) => {
  // Login (duplicated everywhere)
  await page.goto('/login');
  await page.getByLabel('Email')
    .fill('admin@test.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' })
    .click();
  await page.waitForURL('/dashboard');

  // Actual test logic
  await page.getByRole('button',
    { name: 'New Project' }).click();
  // ...
});
\`\`\`

**Good:**

\`\`\`typescript
// fixtures.ts
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';

type Fixtures = {
  loginPage: LoginPage;
  authenticatedPage: Page;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@test.com', 'secret');
    await loginPage.expectLoggedIn();
    await use(page);
  },
});

// tests/project.spec.ts
import { test } from './fixtures';

test('create project',
  async ({ authenticatedPage: page }) => {
  // Already logged in via fixture
  await page.getByRole('button',
    { name: 'New Project' }).click();
  // ...
});
\`\`\`

---

### Rule 13: Keep Tests Independent and Isolated

Each test should be able to run independently, in any order, without depending on the outcome of other tests. Test interdependence is the leading cause of flaky test suites.

**Bad:**

\`\`\`typescript
let createdProjectId: string;

test('create a project', async ({ page }) => {
  // Creates project and stores ID
  createdProjectId = await createProject(page);
});

test('edit the project', async ({ page }) => {
  // DEPENDS on previous test running first
  await page.goto(\\\`/projects/\\\${createdProjectId}\\\`);
  // This test fails if run independently
});
\`\`\`

**Good:**

\`\`\`typescript
test('edit a project', async ({ page, request }) => {
  // Each test creates its own data via API
  const response = await request.post('/api/projects', {
    data: { name: 'Test Project' },
  });
  const { id } = await response.json();

  await page.goto(\\\`/projects/\\\${id}\\\`);
  await page.getByRole('button', { name: 'Edit' })
    .click();
  // Test is fully self-contained
});
\`\`\`

**Why it matters:** Isolated tests can run in parallel (faster CI), can be debugged individually, and do not create cascading failures where one broken test causes 20 others to fail.

---

### Rule 14: Use API Calls for Test Setup, UI for Test Actions

Setting up test data through the UI is slow and fragile. Use API calls or direct database operations for setup, and reserve UI interactions for the behavior you are actually testing.

**Bad:**

\`\`\`typescript
// Creating test data through the UI is slow and fragile
test('delete a user', async ({ page }) => {
  // Navigate to admin panel
  await page.goto('/admin');
  // Create a user through the UI (slow, fragile)
  await page.getByRole('button',
    { name: 'Add User' }).click();
  await page.getByLabel('Name').fill('Test User');
  await page.getByLabel('Email')
    .fill('test@example.com');
  await page.getByRole('button', { name: 'Save' })
    .click();
  await expect(page.getByText('User created'))
    .toBeVisible();

  // NOW test the actual delete functionality
  await page.getByRole('button', { name: 'Delete' })
    .click();
});
\`\`\`

**Good:**

\`\`\`typescript
test('delete a user', async ({ page, request }) => {
  // Create test data via API (fast, reliable)
  await request.post('/api/admin/users', {
    data: {
      name: 'Test User',
      email: 'test@example.com',
    },
  });

  // Test ONLY the delete functionality via UI
  await page.goto('/admin/users');
  await page.getByRole('row',
    { name: /Test User/ })
    .getByRole('button', { name: 'Delete' })
    .click();

  await expect(
    page.getByText('User deleted successfully')
  ).toBeVisible();
});
\`\`\`

---

### Rule 15: Use describe Blocks for Logical Grouping

Group related tests with \`test.describe\` to share setup logic, improve test organization, and make test reports easier to navigate.

**Good:**

\`\`\`typescript
test.describe('Shopping Cart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shop');
  });

  test.describe('Adding Items', () => {
    test('adds single item to cart',
      async ({ page }) => {
      // ...
    });

    test('adds multiple items to cart',
      async ({ page }) => {
      // ...
    });

    test('shows updated cart count',
      async ({ page }) => {
      // ...
    });
  });

  test.describe('Removing Items', () => {
    test('removes item from cart',
      async ({ page }) => {
      // ...
    });

    test('shows empty cart message',
      async ({ page }) => {
      // ...
    });
  });
});
\`\`\`

---

## Test Data and State {#test-data-and-state}

### Rule 16: Use Authentication State Reuse

Logging in through the UI for every test wastes time. Playwright's \`storageState\` feature lets you authenticate once and reuse the session across tests.

**Good:**

\`\`\`typescript
// global-setup.ts
import { chromium } from '@playwright/test';

async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('/login');
  await page.getByLabel('Email')
    .fill('admin@test.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' })
    .click();
  await page.waitForURL('/dashboard');

  await page.context().storageState({
    path: 'playwright/.auth/admin.json',
  });
  await browser.close();
}

export default globalSetup;

// playwright.config.ts
export default defineConfig({
  globalSetup: require.resolve('./global-setup'),
  projects: [
    {
      name: 'authenticated',
      use: {
        storageState: 'playwright/.auth/admin.json',
      },
    },
  ],
});
\`\`\`

---

### Rule 17: Use Unique Test Data to Avoid Collisions

When tests run in parallel, they must not share mutable data. Use unique identifiers for test data to prevent conflicts.

**Bad:**

\`\`\`typescript
// All parallel tests create a user with the same email
test('register user', async ({ page }) => {
  await page.getByLabel('Email')
    .fill('test@example.com');
  // Fails when another test already created this user
});
\`\`\`

**Good:**

\`\`\`typescript
test('register user', async ({ page }) => {
  const uniqueEmail =
    \\\`test-\\\${Date.now()}-\\\${Math.random()
      .toString(36).slice(2)}@example.com\\\`;
  await page.getByLabel('Email').fill(uniqueEmail);
  // No conflicts with parallel tests
});
\`\`\`

---

### Rule 18: Mock Network Requests for Deterministic Tests

Use Playwright's route interception to mock API responses for tests that should not depend on backend state or third-party services.

**Good:**

\`\`\`typescript
test('displays products from API', async ({ page }) => {
  // Mock the API response
  await page.route('/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Widget', price: 9.99 },
        { id: 2, name: 'Gadget', price: 19.99 },
      ]),
    });
  });

  await page.goto('/products');

  await expect(page.getByText('Widget')).toBeVisible();
  await expect(page.getByText('Gadget')).toBeVisible();
  await expect(page.getByText('\$9.99')).toBeVisible();
});

test('handles API error gracefully', async ({ page }) => {
  await page.route('/api/products', async (route) => {
    await route.fulfill({
      status: 500,
      body: 'Internal Server Error',
    });
  });

  await page.goto('/products');

  await expect(
    page.getByText('Failed to load products')
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Retry' })
  ).toBeVisible();
});
\`\`\`

---

### Rule 19: Clean Up Test Data After Tests

Tests should clean up the data they create, especially when running against shared environments.

**Good:**

\`\`\`typescript
test('create and verify project', async ({
  page,
  request,
}) => {
  let projectId: string;

  // Create test data
  const response = await request.post('/api/projects', {
    data: { name: 'Temp Project' },
  });
  projectId = (await response.json()).id;

  try {
    // Test logic
    await page.goto(\\\`/projects/\\\${projectId}\\\`);
    await expect(page.getByText('Temp Project'))
      .toBeVisible();
  } finally {
    // Cleanup regardless of test outcome
    await request.delete(
      \\\`/api/projects/\\\${projectId}\\\`
    );
  }
});
\`\`\`

---

## Performance and CI {#performance-and-ci}

### Rule 20: Run Tests in Parallel

Playwright runs tests in parallel by default using worker processes. Take advantage of this by keeping tests independent.

**Good (playwright.config.ts):**

\`\`\`typescript
export default defineConfig({
  // Use 50% of available CPU cores
  workers: process.env.CI ? '50%' : undefined,

  // Or specify exact count
  // workers: 4,

  // Fully parallel mode: tests within a file
  // also run in parallel
  fullyParallel: true,
});
\`\`\`

---

### Rule 21: Configure Smart Retries

Retries help with genuinely flaky infrastructure issues but should not mask real bugs. Configure retries differently for CI and local development.

**Good (playwright.config.ts):**

\`\`\`typescript
export default defineConfig({
  // Retry only in CI to handle infra flakiness
  retries: process.env.CI ? 2 : 0,

  // Configure retry behavior per project
  projects: [
    {
      name: 'smoke',
      retries: 0,  // Smoke tests must be rock-solid
    },
    {
      name: 'e2e',
      retries: process.env.CI ? 2 : 0,
    },
  ],
});
\`\`\`

**Important:** Investigate and fix tests that consistently need retries to pass. Retries are a safety net, not a crutch.

---

### Rule 22: Use Sharding for Large Test Suites

Playwright supports test sharding across multiple CI machines, dramatically reducing total execution time.

**Good (CI configuration - GitHub Actions):**

\`\`\`yaml
strategy:
  matrix:
    shardIndex: [1, 2, 3, 4]
    shardTotal: [4]

steps:
  - name: Run Tests
    run: |
      npx playwright test \\
        --shard=\${{ matrix.shardIndex }}/\${{ matrix.shardTotal }}
\`\`\`

This splits your test suite across 4 parallel CI machines. A 20-minute test suite runs in approximately 5 minutes.

---

### Rule 23: Use Projects for Multi-Browser and Multi-Config Testing

Playwright projects allow you to run the same tests across different browsers, viewports, and configurations.

**Good (playwright.config.ts):**

\`\`\`typescript
export default defineConfig({
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 15'] },
    },

    // API tests (no browser needed)
    {
      name: 'api',
      testMatch: '**/*.api.spec.ts',
      use: { baseURL: 'http://localhost:3000' },
    },
  ],
});
\`\`\`

---

## Debugging and Maintenance {#debugging-and-maintenance}

### Rule 24: Use Trace Viewer for Debugging Failures

Playwright's trace viewer captures a complete record of test execution including screenshots, DOM snapshots, network requests, and console logs at every step. Enable traces on failure for efficient debugging.

**Good (playwright.config.ts):**

\`\`\`typescript
export default defineConfig({
  use: {
    // Record trace only when a test fails
    // (or on first retry)
    trace: 'on-first-retry',

    // Record screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'on-first-retry',
  },
});
\`\`\`

**View traces:**

\`\`\`bash
npx playwright show-trace trace.zip
\`\`\`

The trace viewer shows a timeline of every action, network request, and console message. You can step through the test, see the DOM state at each point, and identify exactly where and why the test failed.

---

### Rule 25: Use Tags and Annotations for Test Organization

Tags and annotations help you run specific test subsets, skip tests conditionally, and add metadata for reporting.

**Good:**

\`\`\`typescript
// Tag tests for selective execution
test('critical checkout flow',
  { tag: ['@smoke', '@critical'] },
  async ({ page }) => {
  // ...
});

test('edge case: expired coupon',
  { tag: ['@regression'] },
  async ({ page }) => {
  // ...
});

// Skip tests conditionally
test('webkit-specific behavior', async ({ page }) => {
  test.skip(
    !test.info().project.name.includes('webkit'),
    'WebKit-only test'
  );
  // ...
});

// Annotate with bug references
test('form validation regression',
  {
    annotation: {
      type: 'issue',
      description: 'https://github.com/org/repo/issues/42',
    },
  },
  async ({ page }) => {
  // ...
});
\`\`\`

**Run specific tags:**

\`\`\`bash
# Run only smoke tests
npx playwright test --grep @smoke

# Run everything except slow tests
npx playwright test --grep-invert @slow
\`\`\`

---

## Frequently Asked Questions {#frequently-asked-questions}

### How many E2E tests should I have?

There is no universal number. Focus on critical user journeys: registration, login, the core feature workflow, payment, and key error handling paths. Most applications need 50-200 E2E tests. Prefer more unit and integration tests and fewer E2E tests (follow the test pyramid).

### Should I test across all three browsers (Chromium, Firefox, WebKit)?

Test across all three in CI. In local development, use Chromium for speed and run multi-browser tests before pushing. If you must prioritize, Chromium is the most popular browser engine, but WebKit (Safari) often has the most unique rendering quirks.

### How do I handle tests that need a running backend?

Use \`webServer\` in \`playwright.config.ts\` to automatically start your development server before tests:

\`\`\`typescript
export default defineConfig({
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
\`\`\`

### What is the recommended test file naming convention?

Use \`.spec.ts\` for E2E tests and \`.api.spec.ts\` for API-only tests. Group related tests by feature: \`login.spec.ts\`, \`checkout.spec.ts\`, \`admin-users.spec.ts\`.

### How do I integrate Playwright with AI coding agents?

Install the Playwright QA skill to give your AI agent expert Playwright knowledge:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

The skill teaches your AI agent all 25 of these best practices, plus framework-specific patterns, fixture usage, and debugging workflows. Every test generated by the AI will follow these proven conventions.

---

## Summary

These 25 rules distill years of Playwright testing experience into actionable practices. The most impactful rules to adopt first:

1. **Rules 1-3 (Locators):** Switch to role-based locators. This single change eliminates more flaky tests than any other improvement.
2. **Rule 7 (Web-first assertions):** Stop using snapshot-based assertions. Web-first assertions handle async UI updates automatically.
3. **Rule 13 (Test isolation):** Make every test independent. This enables parallel execution and eliminates cascading failures.
4. **Rule 16 (Auth state reuse):** Authenticate once and reuse across tests. This typically saves 30-60 seconds per test.
5. **Rule 24 (Trace viewer):** Enable traces on failure. This cuts debugging time from hours to minutes.

Adopt these five rules and you will see immediate improvements in test reliability, speed, and maintainability. Then gradually adopt the remaining rules to build a world-class Playwright test suite.

Get expert Playwright patterns in your AI agent:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

Browse all Playwright-related skills at [qaskills.sh/skills](/skills).
`,
};
