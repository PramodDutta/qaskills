import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Tutorial for Beginners -- Your First Test in 10 Minutes',
  description:
    'A step-by-step Playwright tutorial for complete beginners. Learn to install Playwright, write your first E2E test, use locators, debug with UI mode, and set up CI/CD with GitHub Actions.',
  date: '2026-02-17',
  category: 'Tutorial',
  content: `
Playwright is the most popular end-to-end testing framework in 2026. If you have never written an automated test before, this tutorial will take you from zero to a working test suite in 10 minutes.

## What You Will Build

By the end of this tutorial, you will have:

- A Playwright project installed and configured
- Your first passing E2E test
- Knowledge of locator strategies (getByRole, getByText, getByLabel)
- Experience with Playwright's debugging tools
- A GitHub Actions CI pipeline running your tests automatically

## Prerequisites

- **Node.js 18+** installed (check with \`node --version\`)
- A code editor (VS Code recommended)
- Basic knowledge of JavaScript or TypeScript
- A terminal/command line

No prior testing experience needed.

---

## Step 1: Install Playwright

Open your terminal and run:

\`\`\`bash
npm init playwright@latest
\`\`\`

The installer will ask you a few questions:

- **Language**: Choose TypeScript (recommended) or JavaScript
- **Test directory**: Press Enter to accept \`tests/\`
- **GitHub Actions**: Choose Yes to add a CI workflow
- **Install browsers**: Choose Yes

This creates your project structure:

\`\`\`bash
my-project/
  tests/
    example.spec.ts     # Sample test
  playwright.config.ts  # Configuration
  package.json
  .github/
    workflows/
      playwright.yml    # CI pipeline
\`\`\`

---

## Step 2: Write Your First Test

Delete the sample test and create \`tests/homepage.spec.ts\`:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('homepage has correct title', async ({ page }) => {
  // Navigate to a website
  await page.goto('https://playwright.dev');

  // Verify the page title
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link navigates to intro page', async ({ page }) => {
  await page.goto('https://playwright.dev');

  // Click the "Get started" link
  await page.getByRole('link', { name: 'Get started' }).click();

  // Verify we landed on the right page
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
\`\`\`

### What Is Happening Here?

- \`test()\` defines a test case with a name and an async function
- \`{ page }\` is a Playwright **fixture** -- a fresh browser page created for each test
- \`page.goto()\` navigates to a URL
- \`page.getByRole()\` finds elements by their accessibility role
- \`expect()\` makes assertions -- Playwright auto-waits until they pass or timeout

---

## Step 3: Run Your Tests

\`\`\`bash
npx playwright test
\`\`\`

You should see output like:

\`\`\`bash
Running 2 tests using 2 workers
  2 passed (3.2s)
\`\`\`

To see the tests run in a visible browser:

\`\`\`bash
npx playwright test --headed
\`\`\`

To run a specific test file:

\`\`\`bash
npx playwright test tests/homepage.spec.ts
\`\`\`

---

## Step 4: Understand Locators

Locators are how you find elements on the page. Playwright provides several locator strategies, ranked by preference:

### 1. getByRole (Best)

Finds elements by their accessibility role. This is the most resilient strategy:

\`\`\`typescript
// Find a button
page.getByRole('button', { name: 'Submit' });

// Find a link
page.getByRole('link', { name: 'Sign up' });

// Find a heading
page.getByRole('heading', { level: 1 });

// Find a textbox
page.getByRole('textbox', { name: 'Email' });
\`\`\`

### 2. getByLabel

Finds form elements by their associated label:

\`\`\`typescript
page.getByLabel('Email address');
page.getByLabel('Password');
page.getByLabel('Remember me');
\`\`\`

### 3. getByText

Finds elements by their visible text:

\`\`\`typescript
page.getByText('Welcome back');
page.getByText('Sign up', { exact: true });
\`\`\`

### 4. getByPlaceholder

Finds inputs by placeholder text:

\`\`\`typescript
page.getByPlaceholder('Search...');
page.getByPlaceholder('Enter your email');
\`\`\`

### 5. getByTestId (Last Resort)

Finds elements by \`data-testid\` attribute. Use when no semantic locator works:

\`\`\`typescript
page.getByTestId('submit-button');
page.getByTestId('user-avatar');
\`\`\`

**Rule of thumb**: Always try \`getByRole\` first. Only fall back to \`getByTestId\` when the element has no accessible role, label, or text.

---

## Step 5: Write a Real-World Test

Let us write a test for a login form:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://myapp.com/login');
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('securepassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('badpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('shows validation error for empty email', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Email is required')).toBeVisible();
  });
});
\`\`\`

### Key Patterns

- \`test.describe()\` groups related tests
- \`test.beforeEach()\` runs before every test in the group
- \`.fill()\` types text into an input (clears existing content first)
- \`.click()\` clicks an element
- \`expect(...).toBeVisible()\` checks that an element is visible on screen
- \`expect(page).toHaveURL()\` checks the current URL

---

## Step 6: Assertions

Playwright's assertions auto-wait. They keep retrying until the assertion passes or the timeout expires.

| Assertion | What It Checks |
|-----------|---------------|
| \`toBeVisible()\` | Element is visible |
| \`toBeHidden()\` | Element is hidden |
| \`toHaveText('x')\` | Element has exact text |
| \`toContainText('x')\` | Element contains text |
| \`toHaveURL(/pattern/)\` | Page URL matches |
| \`toHaveTitle('x')\` | Page title matches |
| \`toHaveValue('x')\` | Input has value |
| \`toBeEnabled()\` | Element is enabled |
| \`toBeDisabled()\` | Element is disabled |
| \`toBeChecked()\` | Checkbox is checked |
| \`toHaveCount(n)\` | Locator matches n elements |

---

## Step 7: Debug with UI Mode

When a test fails, Playwright's UI Mode is your best friend:

\`\`\`bash
npx playwright test --ui
\`\`\`

This opens an interactive window where you can:

- **Watch tests run** in real-time with a visible browser
- **Step through actions** one at a time
- **Inspect the DOM** at each step
- **See network requests** and console logs
- **Pick locators** by pointing at elements

### Trace Viewer

For debugging CI failures, enable trace recording:

\`\`\`typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'on-first-retry',
  },
});
\`\`\`

After a failure, view the trace:

\`\`\`bash
npx playwright show-trace test-results/trace.zip
\`\`\`

### Code Generator

Not sure how to locate an element? Let Playwright show you:

\`\`\`bash
npx playwright codegen https://myapp.com
\`\`\`

This opens a browser. Click around, and Playwright generates the test code automatically.

---

## Step 8: Page Object Model

As your test suite grows, organize with the Page Object Model pattern:

\`\`\`typescript
// pages/login.page.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(private page: Page) {
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submitButton.click();
  }
}
\`\`\`

Use it in tests:

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

test('login with valid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password');

  await expect(page).toHaveURL(/dashboard/);
});
\`\`\`

---

## Step 9: Configuration

Here is a production-ready \`playwright.config.ts\`:

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
\`\`\`

This config runs tests across Chrome, Firefox, Safari, and mobile, starts your dev server automatically, and enables traces on failure.

---

## Step 10: CI/CD with GitHub Actions

The Playwright installer created \`.github/workflows/playwright.yml\`. Here is an optimized version:

\`\`\`yaml
name: Playwright Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
\`\`\`

Every push and pull request runs your tests automatically. Failed test reports are uploaded as downloadable artifacts.

---

## Common Beginner Mistakes

| Mistake | Fix |
|---------|-----|
| Using \`page.locator('#id')\` for everything | Use \`getByRole\`, \`getByLabel\` first |
| Adding \`await page.waitForTimeout(3000)\` | Remove it. Playwright auto-waits. |
| Not using \`test.beforeEach\` | Group shared setup to reduce duplication |
| Putting selectors directly in tests | Use Page Object Model for maintainability |
| Running all browsers locally | Run Chromium only in dev, all browsers in CI |
| Ignoring the trace viewer | Always check traces for CI failures |

---

## Supercharge with QA Skills

Want your AI coding agent to write Playwright tests using all these best practices automatically? Install the Playwright E2E skill:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

This teaches Claude Code, Cursor, Copilot, and other AI agents to follow Page Object Model patterns, use proper locator strategies, and write resilient tests from the start.

For more advanced patterns, read our [complete Playwright guide](/blog/playwright-e2e-complete-guide) or our [guide to fixing flaky tests](/blog/fix-flaky-tests-guide). Browse all QA skills at [qaskills.sh/skills](/skills) or [get started](/getting-started) now.

---

## What Is Next?

Now that you have your first tests running:

1. **Add more tests** for your application's critical user flows
2. **Set up the Page Object Model** for maintainability
3. **Enable visual comparison** with \`toHaveScreenshot()\`
4. **Add API testing** with Playwright's \`request\` fixture
5. **Install QA skills** to let your AI agent help write tests

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

---

*Written by [Pramod Dutta](https://thetestingacademy.com), founder of The Testing Academy and QASkills.sh.*
`,
};
