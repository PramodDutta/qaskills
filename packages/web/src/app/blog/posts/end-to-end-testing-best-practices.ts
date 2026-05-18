import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'End-to-End Testing Best Practices: 20 Rules for Reliable E2E Tests',
  description:
    'Master 20 essential end-to-end testing best practices covering test isolation, deterministic data, proper waits, retry strategies, parallel execution, flaky test management, and CI/CD optimization.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
## Why E2E Testing Best Practices Matter

End-to-end tests are the most valuable and most fragile tests in your suite. They validate real user journeys across the full stack but are prone to flakiness, slow execution, and high maintenance costs. Teams that ignore best practices end up with test suites nobody trusts, where failures are ignored and tests are skipped.

These 20 rules are distilled from years of maintaining E2E suites across startups and enterprises. Each rule includes a clear explanation, a bad example showing the common mistake, and a good example showing the correct approach. Following these practices consistently transforms E2E testing from a source of pain into a reliable safety net.

## Rule 1: Each Test Must Be Independent

Tests must not depend on other tests running first or on any shared mutable state. Every test should be able to run in any order, in isolation, and produce the same result. Shared state is the root cause of most flaky test suites.

**Bad: Tests depend on execution order**

\`\`\`typescript
// BAD: Second test depends on first test creating the user
test('create a new user', async ({ page }) => {
  await page.goto('/admin/users');
  await page.getByRole('button', { name: 'Add User' }).click();
  await page.getByLabel('Name').fill('John Doe');
  await page.getByRole('button', { name: 'Save' }).click();
});

test('edit the user', async ({ page }) => {
  await page.goto('/admin/users');
  // This fails if the first test did not run or failed
  await page.getByText('John Doe').click();
  await page.getByLabel('Name').fill('Jane Doe');
  await page.getByRole('button', { name: 'Save' }).click();
});
\`\`\`

**Good: Each test creates its own state**

\`\`\`typescript
// GOOD: Each test is self-contained
test('create a new user', async ({ page, request }) => {
  await page.goto('/admin/users');
  await page.getByRole('button', { name: 'Add User' }).click();
  await page.getByLabel('Name').fill('John Doe');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('User created')).toBeVisible();
});

test('edit an existing user', async ({ page, request }) => {
  // Create user via API first
  await request.post('/api/users', {
    data: { name: 'John Doe', email: \`john-\${Date.now()}@test.com\` },
  });
  await page.goto('/admin/users');
  await page.getByText('John Doe').click();
  await page.getByLabel('Name').fill('Jane Doe');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('User updated')).toBeVisible();
});
\`\`\`

## Rule 2: Use Deterministic Test Data

Never rely on production data, randomly generated data without seeds, or data from external services. Create specific test data for each test with known values and predictable outcomes.

**Bad: Using random data without control**

\`\`\`typescript
// BAD: Random data makes failures hard to reproduce
test('search products', async ({ page }) => {
  const randomProduct = products[Math.floor(Math.random() * products.length)];
  await page.getByRole('searchbox').fill(randomProduct.name);
  // If this fails, which product caused the issue?
});
\`\`\`

**Good: Deterministic data with unique identifiers**

\`\`\`typescript
// GOOD: Known test data with timestamps for uniqueness
test('search products', async ({ page, request }) => {
  const testProduct = {
    name: \`Test Widget \${Date.now()}\`,
    price: 29.99,
    category: 'electronics',
  };
  await request.post('/api/products', { data: testProduct });

  await page.goto('/products');
  await page.getByRole('searchbox').fill(testProduct.name);
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText(testProduct.name)).toBeVisible();
});
\`\`\`

## Rule 3: Write Meaningful Assertions

Assert on user-visible outcomes, not implementation details. Tests should verify what the user sees and experiences, not internal state, CSS classes, or DOM structure.

**Bad: Asserting on implementation details**

\`\`\`typescript
// BAD: Checks CSS class instead of visible behavior
test('show error on invalid email', async ({ page }) => {
  await page.getByLabel('Email').fill('invalid');
  await page.getByRole('button', { name: 'Submit' }).click();
  // Fragile: CSS class could change without affecting behavior
  const input = page.getByLabel('Email');
  await expect(input).toHaveClass(/error/);
});
\`\`\`

**Good: Asserting on user-visible outcomes**

\`\`\`typescript
// GOOD: Checks what the user actually sees
test('show error on invalid email', async ({ page }) => {
  await page.getByLabel('Email').fill('invalid');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Please enter a valid email address'))
    .toBeVisible();
});
\`\`\`

## Rule 4: Never Use Hard-Coded Waits

Hard-coded sleeps make tests slow and unreliable. They either wait too long (slow) or not long enough (flaky). Use framework-provided waiting mechanisms that resolve as soon as the condition is met.

**Bad: Hard-coded sleep**

\`\`\`typescript
// BAD: Wastes 3 seconds even if element appears instantly
test('load dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForTimeout(3000); // NEVER do this
  await expect(page.getByText('Welcome')).toBeVisible();
});
\`\`\`

**Good: Wait for specific conditions**

\`\`\`typescript
// GOOD: Resolves as soon as the element appears
test('load dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  // Playwright automatically waits for elements in assertions
  await expect(page.getByText('Welcome')).toBeVisible({ timeout: 10000 });
});

// GOOD: Wait for network request to complete
test('load data from API', async ({ page }) => {
  const responsePromise = page.waitForResponse('**/api/dashboard');
  await page.goto('/dashboard');
  await responsePromise;
  await expect(page.getByRole('table')).toBeVisible();
});
\`\`\`

## Rule 5: Use Resilient Locators

Locators should survive UI refactors. Prefer accessible locators (getByRole, getByLabel, getByText) over CSS selectors or XPath. Use data-testid as a fallback when accessible locators are not feasible.

**Bad: Fragile CSS selectors**

\`\`\`typescript
// BAD: Breaks when class names or DOM structure changes
await page.click('.btn-primary.submit-form');
await page.click('#root > div > div:nth-child(3) > button');
await page.click('div.container > form > input[type="email"]');
\`\`\`

**Good: Accessible, resilient locators**

\`\`\`typescript
// GOOD: Survives refactors, matches user experience
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByLabel('Email address').fill('user@example.com');
await page.getByText('Welcome back, John').isVisible();
await page.getByTestId('checkout-total').textContent();
\`\`\`

## Rule 6: Use API Shortcuts for Test Setup

Setting up test preconditions through the UI is slow and introduces unnecessary failure points. Use API calls to create test data, authenticate users, and configure application state before the UI test begins.

**Bad: Setting up through UI clicks**

\`\`\`typescript
// BAD: 8 steps of UI interaction just to set up the test
test('edit product price', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.goto('/products');
  await page.getByRole('button', { name: 'Add Product' }).click();
  await page.getByLabel('Name').fill('Widget');
  await page.getByLabel('Price').fill('10');
  await page.getByRole('button', { name: 'Save' }).click();
  // NOW the actual test begins...
  await page.getByText('Widget').click();
  await page.getByLabel('Price').fill('15');
  await page.getByRole('button', { name: 'Save' }).click();
});
\`\`\`

**Good: API setup, UI verification**

\`\`\`typescript
// GOOD: Fast API setup, focused UI test
test('edit product price', async ({ page, request }) => {
  // Setup via API
  const response = await request.post('/api/products', {
    data: { name: 'Widget', price: 10.0 },
  });
  const { id } = await response.json();

  // Test the UI behavior
  await page.goto(\`/products/\${id}/edit\`);
  await page.getByLabel('Price').clear();
  await page.getByLabel('Price').fill('15');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Product updated')).toBeVisible();
});
\`\`\`

## Rule 7: Handle Authentication Efficiently

Authentication is needed by most tests but should not be tested by most tests. Save authentication state to a file and reuse it across tests instead of logging in through the UI every time.

\`\`\`typescript
// auth.setup.ts - runs once before all tests
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({
    path: '.auth/user.json',
  });
});
\`\`\`

\`\`\`typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\\.setup\\.ts/ },
    {
      name: 'tests',
      dependencies: ['setup'],
      use: { storageState: '.auth/user.json' },
    },
  ],
});
\`\`\`

## Rule 8: Implement Smart Retry Strategy

Configure retries to handle genuine intermittent failures without masking real bugs. Use retries sparingly, track flaky tests, and fix root causes rather than relying on retries as a permanent solution.

\`\`\`typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
});
\`\`\`

## Rule 9: Run Tests in Parallel

Parallel execution dramatically reduces test suite runtime. Design tests for parallelism from the start by ensuring each test creates its own data and does not share state with other tests.

\`\`\`typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
  // Shard across CI machines for even faster execution
  // Run with: npx playwright test --shard=1/4
});
\`\`\`

## Rule 10: Implement Test Tagging

Tag tests by priority, feature, and type so you can run subsets in different CI stages. Run smoke tests on every commit, full regression on merges to main, and visual tests on demand.

\`\`\`typescript
// Tag tests with annotations
test('critical: user can complete checkout', {
  tag: ['@smoke', '@critical', '@checkout'],
}, async ({ page }) => {
  // Core checkout flow test
});

test('edge case: empty cart shows message', {
  tag: ['@regression', '@checkout'],
}, async ({ page }) => {
  // Non-critical edge case
});
\`\`\`

\`\`\`bash
# Run only smoke tests on every commit
npx playwright test --grep @smoke

# Run full regression on main branch
npx playwright test

# Run specific feature tests
npx playwright test --grep @checkout
\`\`\`

## Rule 11: Clean Up After Tests

Tests that create data should clean it up. Leaked test data accumulates over time, slowing down the application and potentially affecting other tests. Use afterEach hooks or API calls for cleanup.

\`\`\`typescript
test.describe('Product Management', () => {
  const createdIds: string[] = [];

  test.afterEach(async ({ request }) => {
    // Clean up any products created during the test
    for (const id of createdIds) {
      await request.delete(\`/api/products/\${id}\`);
    }
    createdIds.length = 0;
  });

  test('create product', async ({ page, request }) => {
    // ... test logic that creates a product
    const response = await request.post('/api/products', {
      data: { name: 'Test Product' },
    });
    const { id } = await response.json();
    createdIds.push(id);
    // ... assertions
  });
});
\`\`\`

## Rule 12: Use Visual Regression Wisely

Visual regression tests catch unintended UI changes but generate false positives from dynamic content (timestamps, ads, animations). Mask dynamic regions and set appropriate thresholds.

\`\`\`typescript
test('product page visual regression', async ({ page }) => {
  await page.goto('/products/1');

  // Wait for all images to load
  await page.waitForLoadState('networkidle');

  // Mask dynamic content before screenshot
  await expect(page).toHaveScreenshot('product-page.png', {
    mask: [
      page.getByTestId('timestamp'),
      page.getByTestId('ad-banner'),
      page.getByTestId('live-chat-widget'),
    ],
    maxDiffPixelRatio: 0.01,
  });
});
\`\`\`

## Rule 13: Test Error States Explicitly

Happy path tests are not enough. Explicitly test error states: network failures, empty states, unauthorized access, form validation errors, and timeout scenarios.

\`\`\`typescript
test('show error when API fails', async ({ page }) => {
  await page.route('**/api/products', (route) => {
    route.fulfill({ status: 500, body: 'Internal Server Error' });
  });

  await page.goto('/products');
  await expect(page.getByText('Something went wrong')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try Again' }))
    .toBeVisible();
});

test('show empty state when no results', async ({ page }) => {
  await page.route('**/api/products**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ products: [], total: 0 }),
    });
  });

  await page.goto('/products');
  await expect(page.getByText('No products found')).toBeVisible();
});
\`\`\`

## Rule 14: Organize Tests by User Journey

Group tests by user workflows rather than by page or component. This mirrors how users actually use the application and makes test coverage gaps more obvious.

\`\`\`typescript
// GOOD: Organized by user journey
test.describe('New Customer Purchase Journey', () => {
  test('can browse products without account', async ({ page }) => { });
  test('can add items to cart', async ({ page }) => { });
  test('is prompted to create account at checkout', async ({ page }) => { });
  test('can complete purchase after registration', async ({ page }) => { });
  test('receives order confirmation email', async ({ page }) => { });
});

test.describe('Returning Customer Journey', () => {
  test('can log in with existing credentials', async ({ page }) => { });
  test('sees order history', async ({ page }) => { });
  test('can reorder previous purchase', async ({ page }) => { });
});
\`\`\`

## Rule 15: Keep Tests Short and Focused

Each test should verify one specific behavior. Long tests that verify multiple unrelated behaviors are hard to debug when they fail because you cannot tell which part broke.

**Bad: One test verifying everything**

\`\`\`typescript
// BAD: Tests 5 different behaviors in one test
test('user management', async ({ page }) => {
  // Create user, edit user, change password,
  // assign role, delete user... all in one test
});
\`\`\`

**Good: Focused tests**

\`\`\`typescript
// GOOD: Each test verifies one behavior
test('admin can create a new user', async ({ page }) => { });
test('admin can edit user details', async ({ page }) => { });
test('admin can reset user password', async ({ page }) => { });
test('admin can assign roles to user', async ({ page }) => { });
test('admin can deactivate a user', async ({ page }) => { });
\`\`\`

## Rule 16: Monitor and Fix Flaky Tests Immediately

Flaky tests erode trust in the test suite. When a test fails intermittently, investigate immediately rather than adding retries. Track flakiness rate per test and set a team threshold (such as less than 2% flakiness rate).

Common causes of flakiness and their fixes: race conditions (use proper waits), shared state (ensure test isolation), time dependencies (mock or freeze time), animation interference (wait for animations to complete or disable them), and network variability (mock external services).

## Rule 17: Optimize CI Pipeline Execution

Structure your CI pipeline to get fast feedback. Run smoke tests first, then full regression. Use test sharding to split tests across multiple CI machines.

\`\`\`yaml
# Run tests in stages for fast feedback
jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - run: npx playwright test --grep @smoke
  regression:
    needs: smoke
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - run: npx playwright test --shard=\${{ matrix.shard }}/4
\`\`\`

## Rule 18: Use Descriptive Test Names

Test names should describe the expected behavior clearly enough that anyone reading a test report understands what failed without reading the test code.

\`\`\`typescript
// BAD: Vague names
test('login test', async ({ page }) => { });
test('cart test 1', async ({ page }) => { });
test('error', async ({ page }) => { });

// GOOD: Descriptive behavior-focused names
test('should redirect to dashboard after successful login', async ({ page }) => { });
test('should update cart total when item quantity changes', async ({ page }) => { });
test('should show validation error when submitting empty form', async ({ page }) => { });
\`\`\`

## Rule 19: Version Control Test Artifacts

Store baseline screenshots, test data fixtures, and configuration in version control. This ensures the entire team works with the same test expectations and makes it easy to track when visual baselines or test data changed.

\`\`\`
tests/
  e2e/
    fixtures/
      test-data.json
      auth-state.json
    screenshots/
      homepage-chromium.png
      homepage-firefox.png
    specs/
      checkout.spec.ts
      auth.spec.ts
    pages/
      checkout.page.ts
      auth.page.ts
\`\`\`

## Rule 20: Review Tests Like Production Code

E2E tests are software. Apply the same code review standards you use for production code: check for proper naming, avoid duplication, ensure readability, verify error handling, and maintain consistent patterns. Poor test code leads to the same maintenance problems as poor production code.

Establish a test code review checklist: Does the test have a descriptive name? Is it independent of other tests? Does it use resilient locators? Does it assert on user-visible outcomes? Is the setup minimal? Does it clean up after itself? Is it tagged appropriately?

Create a shared PR review template for test code that covers these checkpoints:

\`\`\`markdown
## Test Code Review Checklist
- [ ] Tests have descriptive behavior-focused names
- [ ] Each test is independent and can run in isolation
- [ ] Locators use getByRole/getByText/getByTestId (no raw CSS)
- [ ] Assertions verify user-visible outcomes
- [ ] No hard-coded waits (waitForTimeout)
- [ ] Test data is deterministic with unique identifiers
- [ ] Setup uses API shortcuts where possible
- [ ] Cleanup happens in afterEach/afterAll hooks
- [ ] Tests are tagged for CI pipeline stages
- [ ] Error scenarios are covered alongside happy paths
\`\`\`

## Bonus: Measuring E2E Test Suite Health

Beyond following these 20 rules, establish metrics that track your test suite health over time. The most important metrics to monitor are pass rate (target above 98%), average execution time (target under 30 seconds per test), flaky test rate (target below 2%), and test coverage of critical user journeys (target above 90%).

Build a simple dashboard that tracks these metrics per CI run. When pass rate drops below your threshold, stop writing new tests and fix existing failures. When execution time creeps up, identify the slowest tests and optimize them. When flaky rate increases, quarantine flaky tests and investigate root causes before they erode team trust.

\`\`\`typescript
// Track E2E health metrics over time
interface E2EHealthMetrics {
  runId: string;
  timestamp: string;
  passRate: number;
  avgTestDuration: number;
  totalDuration: number;
  flakyCount: number;
  failedTests: string[];
}

function assessSuiteHealth(metrics: E2EHealthMetrics): {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
} {
  const issues: string[] = [];

  if (metrics.passRate < 95) issues.push('Pass rate below 95%');
  if (metrics.passRate < 90) issues.push('CRITICAL: Pass rate below 90%');
  if (metrics.avgTestDuration > 30000)
    issues.push('Average test duration exceeds 30s');
  if (metrics.flakyCount > 5)
    issues.push(\`\${metrics.flakyCount} flaky tests detected\`);
  if (metrics.totalDuration > 1800000)
    issues.push('Total suite time exceeds 30 minutes');

  const status =
    issues.some((i) => i.includes('CRITICAL'))
      ? 'critical'
      : issues.length > 0
        ? 'warning'
        : 'healthy';

  return { status, issues };
}
\`\`\`

## Common E2E Anti-Patterns to Avoid

Beyond the 20 rules, watch out for these common anti-patterns that plague E2E test suites:

**The God Test:** A single test that verifies an entire user flow from registration to checkout to cancellation. When it fails, you have no idea which step broke. Break long flows into focused tests that each verify one behavior.

**Screenshot-Only Assertions:** Taking a screenshot and visually comparing it is useful for visual regression but terrible as the only assertion. Always include functional assertions that verify actual behavior, not just appearance.

**Testing Third-Party Services:** Your E2E tests should not depend on third-party services being available. Mock external payment providers, email services, and analytics endpoints. External service outages should not break your test suite.

**Copy-Paste Test Proliferation:** When you need a similar test with different data, use parameterized tests instead of copying and modifying existing tests. Duplicated tests diverge over time, creating maintenance nightmares.

\`\`\`typescript
// BAD: Copy-paste tests
test('login with valid admin credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('adminpass');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/dashboard');
});

test('login with valid editor credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('editor@example.com');
  await page.getByLabel('Password').fill('editorpass');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/dashboard');
});

// GOOD: Parameterized test
const users = [
  { role: 'admin', email: 'admin@example.com', password: 'adminpass' },
  { role: 'editor', email: 'editor@example.com', password: 'editorpass' },
  { role: 'viewer', email: 'viewer@example.com', password: 'viewerpass' },
];

for (const user of users) {
  test(\`login with valid \${user.role} credentials\`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/dashboard');
  });
}
\`\`\`

**Ignoring Test Execution Order:** Even though tests should be independent, the order they run can matter for performance. Group tests that share expensive setup (like database seeding) under the same describe block with shared beforeAll hooks to avoid redundant setup.

## Building a Culture of E2E Testing Excellence

Technical best practices alone are not enough. Building a culture where teams value and maintain E2E tests requires organizational commitment. Make test failures block merges to main. Include test quality in code review standards. Celebrate when tests catch real bugs before production. Track and share testing metrics in team retrospectives.

Assign ownership for the E2E test suite. Without clear ownership, test suites decay as everyone assumes someone else will fix the flaky test or update the broken fixture. Whether ownership is a dedicated QA team, a rotating on-call role, or shared among developers, make it explicit.

## Putting It All Together

These 20 rules work together as a system. Test isolation (Rule 1) enables parallel execution (Rule 9). API shortcuts for setup (Rule 6) keep tests short (Rule 15). Resilient locators (Rule 5) reduce maintenance from visual regression tests (Rule 12).

Start by applying the first five rules to your existing test suite. Then gradually adopt the remaining rules as your team's practices mature. The result is an E2E suite that runs fast, fails reliably, and gives your team confidence to ship.

\`\`\`bash
# Get expert E2E testing patterns for your AI agent
npx @qaskills/cli add playwright-e2e
npx @qaskills/cli add e2e-best-practices
\`\`\`

A well-maintained E2E test suite is one of the most valuable assets a development team can have. These 20 rules provide the foundation for building and maintaining that asset. Apply them consistently, and your tests will be a source of confidence rather than frustration.
`,
};
