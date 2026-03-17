import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'How to Build a Scalable Test Automation Framework from Scratch in 2026',
  description:
    'Step-by-step guide to building a scalable test automation framework. Covers framework architecture, design patterns, Page Object Model, data-driven testing, reporting, CI/CD integration, and maintaining test suites at scale.',
  date: '2026-03-16',
  category: 'Guide',
  content: `
## Key Takeaways

- A well-architected **test automation framework** separates concerns into distinct layers: test runner, page/API objects, utilities, configuration, reporting, and data management
- **Playwright with TypeScript** is the recommended stack for new frameworks in 2026, offering auto-waiting, native parallelism, and strong typing out of the box
- The **Page Object Model** remains the most practical pattern for UI test frameworks, but the **Screenplay Pattern** offers better scalability for complex workflows
- **Data-driven testing** with external data sources (JSON, CSV, environment configs) dramatically reduces test duplication and improves coverage
- **CI/CD integration** with parallel execution, test sharding, and intelligent retry strategies is essential for scaling beyond 500 tests
- **AI-assisted framework development** using QA skills from [qaskills.sh](/skills) accelerates framework setup and enforces best practices from day one

---

## Introduction: Why Build a Custom Framework?

Off-the-shelf test frameworks like Playwright, Cypress, and Selenium provide excellent test runners and browser automation capabilities. But a **test runner is not a test framework**. The distinction matters enormously as your test suite grows from 10 tests to 1,000.

A **test automation framework** is the scaffolding that sits on top of your test runner. It defines how tests are organized, how data flows through the system, how environments are configured, how failures are reported, and how your team collaborates on test code. Without this scaffolding, test suites become unmaintainable tangles of duplicated code, brittle selectors, and flaky assertions.

You need a custom framework when:

- **Multiple teams** contribute to the test suite and need consistent patterns
- **Multiple applications** share common testing logic (login flows, API clients, data setup)
- Your suite has grown past **200+ tests** and maintenance is consuming more time than writing new tests
- You need **environment-specific configuration** (dev, staging, production) with different data sets and URLs
- **Reporting requirements** go beyond pass/fail -- stakeholders need dashboards, trend analysis, and failure categorization
- You want to leverage **AI coding agents** effectively, which produce better tests when guided by consistent framework patterns

---

## Framework Architecture Layers

A scalable test automation framework is organized into six distinct layers. Each layer has a single responsibility and communicates with adjacent layers through well-defined interfaces.

\`\`\`
+--------------------------------------------------+
|                  Test Layer                        |
|  (test specs, test suites, test scenarios)        |
+--------------------------------------------------+
|               Page / API Object Layer             |
|  (page objects, API clients, component objects)   |
+--------------------------------------------------+
|                Utility Layer                       |
|  (helpers, custom assertions, waiters, parsers)   |
+--------------------------------------------------+
|              Configuration Layer                  |
|  (env config, test data, feature flags)           |
+--------------------------------------------------+
|               Reporting Layer                     |
|  (reporters, screenshots, videos, logs)           |
+--------------------------------------------------+
|             Data Management Layer                 |
|  (fixtures, factories, seeders, cleaners)         |
+--------------------------------------------------+
\`\`\`

### Test Layer

The topmost layer contains your actual test specifications. Tests should read like documentation -- a developer unfamiliar with the codebase should understand what is being tested by reading the test name and its steps. Tests in this layer should contain **zero implementation details**. No selectors, no API URLs, no raw HTTP calls.

### Page / API Object Layer

This layer encapsulates all interactions with the system under test. **Page objects** wrap UI pages, **API clients** wrap REST/GraphQL endpoints, and **component objects** wrap reusable UI components. This is the single source of truth for how your tests interact with the application.

### Utility Layer

Cross-cutting concerns live here: custom assertion helpers, date/time utilities, string generators, file parsers, and retry logic. These utilities are framework-specific (not application-specific) and can be reused across projects.

### Configuration Layer

Environment URLs, credentials, timeouts, browser settings, and feature flags. This layer reads from environment variables, \`.env\` files, and JSON/YAML configuration files. It exposes a typed configuration object that the rest of the framework consumes.

### Reporting Layer

Test reporters, screenshot capture on failure, video recording, trace collection, and log aggregation. This layer transforms raw test results into actionable information for developers and stakeholders.

### Data Management Layer

Test data factories, database seeders, API-based data setup, and cleanup routines. This layer ensures tests have the data they need and clean up after themselves.

---

## Choosing Your Tech Stack

The tech stack decision affects every aspect of your framework. Here is a comparison of the three leading options in 2026.

| Criteria | **Playwright** | **Cypress** | **Selenium** |
|---|---|---|---|
| Language Support | TypeScript, JavaScript, Python, Java, C# | JavaScript, TypeScript only | Java, Python, C#, Ruby, JavaScript |
| Browser Support | Chromium, Firefox, WebKit | Chromium, Firefox, WebKit (experimental) | All major browsers |
| Parallelism | Native, built-in | Requires Cypress Cloud or workarounds | Via Selenium Grid |
| Auto-Waiting | Built-in, robust | Built-in, good | Manual waits required |
| API Testing | Built-in \`request\` context | Via \`cy.request()\` | Requires separate library |
| Mobile Testing | Native mobile browser emulation | Limited viewport resizing | Via Appium integration |
| Speed | Fast (headless by default) | Medium (runs in browser) | Slower (WebDriver protocol) |
| Community Size | Growing rapidly | Large, established | Largest, most mature |
| AI Agent Support | Excellent (most QA skills target Playwright) | Good | Limited |
| Learning Curve | Moderate | Low | High |

### Recommendation

For new frameworks in 2026, **Playwright with TypeScript** is the strongest choice. TypeScript provides compile-time type safety that catches errors before tests run. Playwright's auto-waiting eliminates the single biggest source of test flakiness. Native parallelism means you do not need third-party infrastructure for fast execution. And the ecosystem of **AI coding agent skills** is richest for Playwright.

If your team is already invested in **Python**, Playwright for Python is excellent. For **Java** shops with existing Selenium infrastructure, a gradual migration to Playwright makes sense but is not urgent.

To get your AI agent up to speed with Playwright best practices immediately:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

---

## The Foundation: Project Structure

A well-organized directory structure is the backbone of a maintainable framework. Here is the recommended layout for a Playwright + TypeScript framework.

\`\`\`
project-root/
  playwright.config.ts
  tsconfig.json
  .eslintrc.json
  package.json
  src/
    config/
      env.config.ts
      test.config.ts
    pages/
      base.page.ts
      login.page.ts
      dashboard.page.ts
      components/
        header.component.ts
        sidebar.component.ts
        data-table.component.ts
    api/
      base.client.ts
      users.client.ts
      orders.client.ts
    fixtures/
      auth.fixture.ts
      data.fixture.ts
      index.ts
    factories/
      user.factory.ts
      order.factory.ts
    utils/
      assertions.ts
      date-helpers.ts
      test-data-generator.ts
      retry.ts
    reporters/
      custom-reporter.ts
      slack-notifier.ts
  tests/
    e2e/
      auth/
        login.spec.ts
        logout.spec.ts
        password-reset.spec.ts
      dashboard/
        overview.spec.ts
        widgets.spec.ts
    api/
      users.api.spec.ts
      orders.api.spec.ts
    smoke/
      critical-path.spec.ts
  test-data/
    users.json
    orders.csv
    environments/
      dev.json
      staging.json
      production.json
\`\`\`

### TypeScript Configuration

Your \`tsconfig.json\` should enable strict mode and set up path aliases for clean imports:

\`\`\`typescript
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@pages/*": ["./src/pages/*"],
      "@api/*": ["./src/api/*"],
      "@fixtures/*": ["./src/fixtures/*"],
      "@factories/*": ["./src/factories/*"],
      "@utils/*": ["./src/utils/*"],
      "@config/*": ["./src/config/*"],
      "@test-data/*": ["./test-data/*"]
    }
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "playwright.config.ts"]
}
\`\`\`

### Playwright Configuration

A production-grade \`playwright.config.ts\` with environment awareness:

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';
import { getEnvConfig } from './src/config/env.config';

const env = getEnvConfig();

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
    ...(process.env.CI ? [['github' as const]] : []),
  ],
  use: {
    baseURL: env.baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'setup', testMatch: /.*\\.setup\\.ts/ },
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
      use: { ...devices['Pixel 7'] },
      dependencies: ['setup'],
    },
  ],
});
\`\`\`

---

## Design Patterns for Test Frameworks

Design patterns transform a collection of test scripts into a maintainable **test automation framework**. Here are the five patterns every framework architect should know.

### Page Object Model (POM)

The **Page Object Model** is the most widely adopted pattern for UI test automation. Each page (or significant section) of your application gets a corresponding class that encapsulates its elements and actions.

\`\`\`typescript
// src/pages/base.page.ts
import { type Page, type Locator } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  protected getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }
}
\`\`\`

\`\`\`typescript
// src/pages/login.page.ts
import { type Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  private readonly emailInput = this.page.getByLabel('Email address');
  private readonly passwordInput = this.page.getByLabel('Password');
  private readonly submitButton = this.page.getByRole('button', { name: 'Sign in' });
  private readonly errorMessage = this.page.getByRole('alert');

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigateTo('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectErrorMessage(message: string): Promise<void> {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectSuccessfulLogin(): Promise<void> {
    await expect(this.page).toHaveURL(/\\/dashboard/);
  }
}
\`\`\`

\`\`\`typescript
// tests/e2e/auth/login.spec.ts
import { test } from '@playwright/test';
import { LoginPage } from '@pages/login.page';

test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should login with valid credentials', async () => {
    await loginPage.login('user@example.com', 'securePassword123');
    await loginPage.expectSuccessfulLogin();
  });

  test('should show error for invalid credentials', async () => {
    await loginPage.login('user@example.com', 'wrongPassword');
    await loginPage.expectErrorMessage('Invalid email or password');
  });
});
\`\`\`

### Screenplay Pattern

The **Screenplay Pattern** is an alternative to POM that models tests around actors performing tasks. It scales better for complex workflows that span multiple pages.

\`\`\`typescript
// src/screenplay/actors.ts
import { type Page } from '@playwright/test';

export class Actor {
  constructor(
    public readonly name: string,
    public readonly page: Page,
  ) {}

  async attemptsTo(...tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      await task.performAs(this);
    }
  }
}

export interface Task {
  performAs(actor: Actor): Promise<void>;
}
\`\`\`

\`\`\`typescript
// src/screenplay/tasks/login.task.ts
import { type Actor, type Task } from '../actors';

export class LoginWith implements Task {
  constructor(
    private email: string,
    private password: string,
  ) {}

  async performAs(actor: Actor): Promise<void> {
    await actor.page.getByLabel('Email address').fill(this.email);
    await actor.page.getByLabel('Password').fill(this.password);
    await actor.page.getByRole('button', { name: 'Sign in' }).click();
  }

  static credentials(email: string, password: string): LoginWith {
    return new LoginWith(email, password);
  }
}
\`\`\`

\`\`\`typescript
// Usage in a test
test('user can complete checkout', async ({ page }) => {
  const customer = new Actor('Customer', page);

  await customer.attemptsTo(
    LoginWith.credentials('buyer@example.com', 'password'),
    AddToCart.product('Widget Pro'),
    Checkout.withPayment('4242424242424242'),
  );
});
\`\`\`

### Builder Pattern for Test Data

The **Builder Pattern** creates complex test data objects with a fluent API. This eliminates magic strings scattered through tests and makes data requirements explicit.

\`\`\`typescript
// src/factories/user.factory.ts
interface UserData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'editor' | 'viewer';
  isActive: boolean;
  plan: 'free' | 'pro' | 'enterprise';
}

export class UserBuilder {
  private data: UserData = {
    email: \`test-\${Date.now()}@example.com\`,
    firstName: 'Test',
    lastName: 'User',
    role: 'viewer',
    isActive: true,
    plan: 'free',
  };

  withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  withName(first: string, last: string): this {
    this.data.firstName = first;
    this.data.lastName = last;
    return this;
  }

  asAdmin(): this {
    this.data.role = 'admin';
    return this;
  }

  asEditor(): this {
    this.data.role = 'editor';
    return this;
  }

  withPlan(plan: UserData['plan']): this {
    this.data.plan = plan;
    return this;
  }

  inactive(): this {
    this.data.isActive = false;
    return this;
  }

  build(): UserData {
    return { ...this.data };
  }
}

// Usage
const adminUser = new UserBuilder().asAdmin().withPlan('enterprise').build();
const freeUser = new UserBuilder().withName('Jane', 'Doe').build();
\`\`\`

### Factory Pattern for Fixtures

The **Factory Pattern** combined with Playwright fixtures creates reusable, composable test setup.

\`\`\`typescript
// src/fixtures/index.ts
import { test as base } from '@playwright/test';
import { LoginPage } from '@pages/login.page';
import { DashboardPage } from '@pages/dashboard.page';
import { ApiClient } from '@api/base.client';
import { UserBuilder } from '@factories/user.factory';

type TestFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  apiClient: ApiClient;
  authenticatedPage: DashboardPage;
  testUser: { email: string; password: string };
};

export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  apiClient: async ({}, use) => {
    const client = new ApiClient(process.env.API_URL!);
    await use(client);
  },

  testUser: async ({ apiClient }, use) => {
    const userData = new UserBuilder().build();
    await apiClient.createUser(userData);
    await use({ email: userData.email, password: 'testPassword123' });
    // Cleanup after test
    await apiClient.deleteUser(userData.email);
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    const dashboard = new DashboardPage(page);
    await use(dashboard);
  },
});

export { expect } from '@playwright/test';
\`\`\`

### Strategy Pattern for Different Environments

The **Strategy Pattern** handles environment-specific behavior without littering tests with conditionals.

\`\`\`typescript
// src/config/env.config.ts
interface EnvConfig {
  baseUrl: string;
  apiUrl: string;
  timeout: number;
  retries: number;
  auth: {
    strategy: 'ui' | 'api' | 'token';
    adminEmail: string;
    adminPassword: string;
  };
}

const configs: Record<string, EnvConfig> = {
  dev: {
    baseUrl: 'http://localhost:3000',
    apiUrl: 'http://localhost:3001/api',
    timeout: 30_000,
    retries: 0,
    auth: { strategy: 'ui', adminEmail: 'admin@dev.local', adminPassword: 'devpass' },
  },
  staging: {
    baseUrl: 'https://staging.example.com',
    apiUrl: 'https://staging-api.example.com',
    timeout: 45_000,
    retries: 1,
    auth: { strategy: 'api', adminEmail: 'admin@staging.example.com', adminPassword: '' },
  },
  production: {
    baseUrl: 'https://example.com',
    apiUrl: 'https://api.example.com',
    timeout: 60_000,
    retries: 2,
    auth: { strategy: 'token', adminEmail: '', adminPassword: '' },
  },
};

export function getEnvConfig(): EnvConfig {
  const env = process.env.TEST_ENV || 'dev';
  const config = configs[env];
  if (!config) {
    throw new Error(\`Unknown environment: \${env}. Valid: \${Object.keys(configs).join(', ')}\`);
  }
  return config;
}
\`\`\`

---

## Data-Driven Testing

**Data-driven testing** separates test logic from test data, allowing the same test to run with dozens or hundreds of input combinations without code duplication.

### JSON Data Sources

\`\`\`typescript
// test-data/login-scenarios.json
[
  {
    "scenario": "valid admin login",
    "email": "admin@example.com",
    "password": "adminPass123",
    "expectedResult": "success",
    "expectedUrl": "/admin/dashboard"
  },
  {
    "scenario": "valid editor login",
    "email": "editor@example.com",
    "password": "editorPass123",
    "expectedResult": "success",
    "expectedUrl": "/editor/workspace"
  },
  {
    "scenario": "invalid password",
    "email": "admin@example.com",
    "password": "wrongPassword",
    "expectedResult": "error",
    "expectedMessage": "Invalid email or password"
  },
  {
    "scenario": "locked account",
    "email": "locked@example.com",
    "password": "anyPassword",
    "expectedResult": "error",
    "expectedMessage": "Account is locked"
  }
]
\`\`\`

### Parameterized Tests in Playwright

\`\`\`typescript
import { test, expect } from '@playwright/test';
import loginScenarios from '@test-data/login-scenarios.json';

for (const scenario of loginScenarios) {
  test(\`login: \${scenario.scenario}\`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(scenario.email);
    await page.getByLabel('Password').fill(scenario.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    if (scenario.expectedResult === 'success') {
      await expect(page).toHaveURL(new RegExp(scenario.expectedUrl!));
    } else {
      await expect(page.getByRole('alert')).toContainText(scenario.expectedMessage!);
    }
  });
}
\`\`\`

### CSV Data Sources with a Helper

\`\`\`typescript
// src/utils/csv-reader.ts
import { readFileSync } from 'fs';
import { resolve } from 'path';

export function readCsvData<T extends Record<string, string>>(filePath: string): T[] {
  const fullPath = resolve(process.cwd(), filePath);
  const content = readFileSync(fullPath, 'utf-8');
  const lines = content.trim().split('\\n');
  const headers = lines[0].split(',').map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i]])) as T;
  });
}
\`\`\`

### Environment-Specific Test Data

\`\`\`typescript
// src/config/test.config.ts
import { getEnvConfig } from './env.config';

interface TestUsers {
  admin: { email: string; password: string };
  editor: { email: string; password: string };
  viewer: { email: string; password: string };
}

const usersByEnv: Record<string, TestUsers> = {
  dev: {
    admin: { email: 'admin@dev.local', password: 'devAdmin123' },
    editor: { email: 'editor@dev.local', password: 'devEditor123' },
    viewer: { email: 'viewer@dev.local', password: 'devViewer123' },
  },
  staging: {
    admin: { email: 'admin@staging.example.com', password: process.env.STAGING_ADMIN_PW! },
    editor: { email: 'editor@staging.example.com', password: process.env.STAGING_EDITOR_PW! },
    viewer: { email: 'viewer@staging.example.com', password: process.env.STAGING_VIEWER_PW! },
  },
};

export function getTestUsers(): TestUsers {
  const env = process.env.TEST_ENV || 'dev';
  return usersByEnv[env]!;
}
\`\`\`

---

## Reporting and Observability

Good reporting transforms test results from "32 passed, 3 failed" into actionable intelligence. Here is how to build a comprehensive **reporting and observability** layer.

### Allure Reporting

Allure is the gold standard for **test reporting**. It provides interactive dashboards, trend analysis, failure categorization, and test history.

\`\`\`bash
npm install -D allure-playwright allure-commandline
\`\`\`

\`\`\`typescript
// playwright.config.ts - add Allure reporter
reporter: [
  ['html'],
  ['allure-playwright', {
    detail: true,
    suiteTitle: true,
    outputFolder: 'allure-results',
    environmentInfo: {
      Environment: process.env.TEST_ENV || 'dev',
      Browser: 'Chromium',
      Framework: 'Playwright',
    },
  }],
],
\`\`\`

### Custom Reporter with Slack Notifications

\`\`\`typescript
// src/reporters/slack-notifier.ts
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

export default class SlackReporter implements Reporter {
  private passed = 0;
  private failed = 0;
  private skipped = 0;
  private failures: { title: string; error: string }[] = [];

  onTestEnd(test: TestCase, result: TestResult): void {
    switch (result.status) {
      case 'passed':
        this.passed++;
        break;
      case 'failed':
        this.failed++;
        this.failures.push({
          title: test.title,
          error: result.errors[0]?.message || 'Unknown error',
        });
        break;
      case 'skipped':
        this.skipped++;
        break;
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    if (!process.env.SLACK_WEBHOOK_URL) return;

    const total = this.passed + this.failed + this.skipped;
    const status = this.failed > 0 ? 'FAILED' : 'PASSED';
    const emoji = this.failed > 0 ? ':red_circle:' : ':large_green_circle:';

    const message = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: \`\${emoji} Test Suite \${status}\` },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: \`*Total:* \${total}\` },
            { type: 'mrkdwn', text: \`*Passed:* \${this.passed}\` },
            { type: 'mrkdwn', text: \`*Failed:* \${this.failed}\` },
            { type: 'mrkdwn', text: \`*Duration:* \${Math.round(result.duration / 1000)}s\` },
          ],
        },
      ],
    };

    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  }
}
\`\`\`

### Screenshots and Video on Failure

Configure Playwright to capture **screenshots on failure** and **video on retry** for efficient debugging:

\`\`\`typescript
// In playwright.config.ts use section
use: {
  screenshot: 'only-on-failure',
  video: 'on-first-retry',
  trace: 'on-first-retry',
},
\`\`\`

For custom screenshot annotations in your page objects:

\`\`\`typescript
// In a page object method
async takeStepScreenshot(stepName: string): Promise<void> {
  await this.page.screenshot({
    path: \`test-results/screenshots/\${stepName}-\${Date.now()}.png\`,
    fullPage: true,
  });
}
\`\`\`

---

## CI/CD Integration

A test framework that only runs locally is a hobby project. **CI/CD integration** makes it a quality gate.

### GitHub Actions Pipeline

\`\`\`yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  TEST_ENV: staging

jobs:
  test:
    timeout-minutes: 30
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run tests (shard $\{{ matrix.shard }})
        run: npx playwright test --shard=$\{{ matrix.shard }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-$\{{ strategy.job-index }}
          path: |
            test-results/
            playwright-report/
          retention-days: 14

  merge-reports:
    if: always()
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: all-results
          pattern: test-results-*

      - name: Merge reports
        run: npx playwright merge-reports --reporter html ./all-results

      - name: Upload merged report
        uses: actions/upload-artifact@v4
        with:
          name: full-test-report
          path: playwright-report/
          retention-days: 30
\`\`\`

### Parallel Execution and Test Sharding

**Test sharding** splits your suite across multiple CI machines. With the matrix strategy above, a 1000-test suite running 15 minutes sequentially completes in under 4 minutes across 4 shards.

Key configuration for parallel execution:

\`\`\`typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined, // 4 workers per shard in CI
  retries: process.env.CI ? 2 : 0,
});
\`\`\`

### Retry Strategies

Not all test failures are equal. A **smart retry strategy** distinguishes between genuine bugs and infrastructure flakiness:

\`\`\`typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,

  // Per-project retries
  projects: [
    {
      name: 'smoke',
      testMatch: /smoke\\/.*\\.spec\\.ts/,
      retries: 0, // Smoke tests must pass first time
    },
    {
      name: 'e2e',
      testMatch: /e2e\\/.*\\.spec\\.ts/,
      retries: 2, // E2E tests get retries for infrastructure flakiness
    },
    {
      name: 'api',
      testMatch: /api\\/.*\\.spec\\.ts/,
      retries: 1, // API tests are more stable
    },
  ],
});
\`\`\`

---

## Scaling to 1000+ Tests

When your suite grows past a few hundred tests, execution time and maintenance become critical concerns. Here are the strategies that keep large suites manageable.

### Test Tagging

Use **Playwright tags** to categorize tests and run subsets:

\`\`\`typescript
test('should process payment @critical @smoke', async ({ page }) => {
  // Critical path test
});

test('should display order history @regression', async ({ page }) => {
  // Regression test
});

test('should export CSV @slow @regression', async ({ page }) => {
  // Slow test, skip in quick runs
});
\`\`\`

\`\`\`bash
# Run only smoke tests
npx playwright test --grep @smoke

# Run everything except slow tests
npx playwright test --grep-invert @slow

# Run critical tests on every PR, full suite nightly
npx playwright test --grep @critical  # PR pipeline
npx playwright test                   # Nightly pipeline
\`\`\`

### Selective Execution by Changed Files

\`\`\`bash
# In CI, only run tests related to changed files
CHANGED_FILES=\$(git diff --name-only origin/main...HEAD)

if echo "\$CHANGED_FILES" | grep -q "src/auth/"; then
  npx playwright test tests/e2e/auth/
elif echo "\$CHANGED_FILES" | grep -q "src/checkout/"; then
  npx playwright test tests/e2e/checkout/
else
  npx playwright test --grep @smoke
fi
\`\`\`

### Dependency Management

As your framework grows, managing dependencies between test utilities becomes critical. Use **barrel exports** to keep imports clean:

\`\`\`typescript
// src/fixtures/index.ts - single entry point for all fixtures
export { test, expect } from './base.fixture';
export { authenticatedTest } from './auth.fixture';
export { apiTest } from './api.fixture';
\`\`\`

\`\`\`typescript
// In test files - clean, single import
import { authenticatedTest as test, expect } from '@fixtures';
\`\`\`

---

## AI-Assisted Framework Development

**AI coding agents** dramatically accelerate framework development when properly guided. The key is providing your agent with domain-specific QA knowledge through installable skills.

### Installing Architecture Skills

\`\`\`bash
# Install framework architecture patterns
npx @qaskills/cli add test-architecture-patterns

# Install Playwright-specific best practices
npx @qaskills/cli add playwright-e2e

# Search for more relevant skills
npx @qaskills/cli search "framework design"
\`\`\`

These skills from [qaskills.sh](/skills) teach your AI agent production-grade patterns. Instead of generating naive test scripts, your agent produces properly structured page objects, typed fixtures, and maintainable test data factories.

### How AI Skills Improve Framework Quality

Without QA skills, an AI agent asked to "write a login test" produces a flat script with hardcoded selectors and inline assertions. With the **playwright-e2e** skill installed, the same request generates a proper page object, uses accessible locators (\`getByRole\`, \`getByLabel\`), implements fixture-based setup, and follows the Arrange-Act-Assert pattern.

The **test-architecture-patterns** skill goes further, teaching the agent about framework layers, the Strategy pattern for environments, and the Factory pattern for test data. When you ask it to "set up the test framework," it scaffolds the entire directory structure with proper separation of concerns.

### Practical Workflow

1. Initialize your project and install QA skills:

\`\`\`bash
npm init playwright@latest
npx @qaskills/cli add playwright-e2e
npx @qaskills/cli add test-architecture-patterns
\`\`\`

2. Ask your AI agent to scaffold the framework structure
3. Iteratively build page objects and fixtures with agent assistance
4. Review and refine the generated patterns
5. Use the agent for repetitive tasks (new page objects, data factories, test scenarios)

Browse all available QA skills at [qaskills.sh/skills](/skills) to find the right ones for your stack.

---

## Framework Maintenance and Evolution

A framework is a living system. Without deliberate maintenance, it decays into the same mess you built it to avoid.

### Versioning Your Framework

If your framework is shared across teams or projects, version it:

\`\`\`json
{
  "name": "@company/test-framework",
  "version": "2.4.0",
  "description": "Shared test automation framework",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@playwright/test": "^1.50.0"
  }
}
\`\`\`

Publish it as a private npm package. Teams install it as a dependency and get framework updates through standard package management.

### Deprecation Strategy

When replacing a pattern (e.g., migrating from raw page objects to fixtures), do not break existing tests:

\`\`\`typescript
// src/pages/old-login.page.ts
/**
 * @deprecated Use LoginPage from @pages/login.page.ts instead.
 * This class will be removed in v3.0.0.
 */
export class OldLoginPage {
  // ... existing implementation
}
\`\`\`

### Team Onboarding

Create a framework guide for new team members (in your project wiki, not as a standalone file):

- **Quick start**: Clone, install, run one test in under 5 minutes
- **Architecture overview**: Explain the layer diagram and where code belongs
- **Common tasks**: Adding a new page object, creating a test data factory, adding a new test suite
- **Code review checklist**: What reviewers look for in test PRs
- **Troubleshooting**: Common errors and their fixes

---

## Best Practices

1. **Single Responsibility per Layer** -- Page objects handle UI interaction, not test logic. Factories handle data creation, not assertions. Keep each layer focused.

2. **No Sleeps, Ever** -- Replace \`page.waitForTimeout()\` with explicit waits: \`page.waitForSelector()\`, \`expect(locator).toBeVisible()\`, or \`page.waitForResponse()\`. Hard-coded sleeps are the leading cause of flaky tests.

3. **Atomic Tests** -- Each test should set up its own data, perform its actions, and verify its assertions independently. Tests must not depend on execution order or shared state.

4. **Accessible Locators First** -- Use \`getByRole()\`, \`getByLabel()\`, \`getByText()\`, and \`getByPlaceholder()\` before falling back to \`getByTestId()\`. Accessible locators test your app the way users interact with it.

5. **Type Everything** -- TypeScript interfaces for test data, page object methods, configuration objects, and API responses. The compiler catches errors that tests would otherwise miss at runtime.

6. **Fail Fast with Clear Messages** -- Custom assertion messages should describe the business scenario: \`expect(balance).toBe(100, 'User balance should reflect the refund')\`.

7. **Keep Tests Readable** -- Test code is read 10x more than it is written. Prioritize clarity over cleverness. A test that takes 30 seconds to understand is more valuable than one that saves 3 lines of code.

8. **Review Test Code Like Production Code** -- Test PRs deserve the same rigor as application PRs. Sloppy test code compounds into framework debt faster than application debt.

9. **Monitor Flakiness Metrics** -- Track flaky test rates weekly. A healthy suite has less than 2% flakiness. Above 5%, stop adding tests and fix the root causes.

10. **Document Decisions, Not Code** -- Document why you chose POM over Screenplay, why you use API setup instead of UI setup, why certain tests are tagged \`@slow\`. The code shows what; documentation explains why.

---

## Anti-Patterns to Avoid

1. **The God Page Object** -- A page object with 50+ methods covering every possible interaction on a complex page. Split large pages into component objects: \`HeaderComponent\`, \`SidebarComponent\`, \`DataTableComponent\`.

2. **Test Interdependence** -- Tests that must run in a specific order because test B relies on data created by test A. Each test must be independently executable.

3. **Hardcoded Test Data** -- Email addresses, IDs, and URLs scattered through test files. All test data should flow through factories or configuration files.

4. **Screenshot Comparison as Primary Assertion** -- Visual regression testing is valuable but should supplement, not replace, functional assertions. A page can look correct while being functionally broken.

5. **Ignoring Flaky Tests** -- Marking a test as \`test.skip()\` or \`test.fixme()\` and moving on. Flaky tests erode trust in the entire suite. Fix or delete them within one sprint.

6. **Overusing End-to-End Tests** -- Testing business logic through the browser when a unit test would be faster and more reliable. Follow the **test pyramid**: many unit tests, fewer integration tests, fewest E2E tests.

7. **Copy-Paste Test Creation** -- Duplicating an existing test and modifying it instead of creating proper abstractions. This leads to maintenance nightmares when the underlying flow changes.

8. **Framework Over-Engineering** -- Building a 15-layer abstraction before writing your first test. Start simple with POM and fixtures. Add patterns (Screenplay, Strategy) only when the codebase demands them. Premature abstraction is worse than duplication.

---

## What Comes Next

Building a **scalable test automation framework** is an investment that pays dividends across your entire engineering organization. The patterns and practices covered in this guide -- layered architecture, design patterns, data-driven testing, CI/CD integration, and AI-assisted development -- provide a roadmap from initial setup to a suite of 1000+ tests.

Start by choosing your stack (Playwright + TypeScript is the recommended default), scaffold the project structure, implement the Page Object Model, and set up CI/CD with test sharding. As your suite grows, layer in data-driven testing, the Builder pattern for test data, and the Strategy pattern for multi-environment support.

To accelerate your framework development with AI, install QA skills that encode expert testing knowledge into your coding agent:

\`\`\`bash
npx @qaskills/cli add test-architecture-patterns
npx @qaskills/cli add playwright-e2e
\`\`\`

Browse all available skills at [qaskills.sh/skills](/skills) and explore the [leaderboard](/leaderboard) to find the most popular patterns adopted by QA teams worldwide.
`,
};
