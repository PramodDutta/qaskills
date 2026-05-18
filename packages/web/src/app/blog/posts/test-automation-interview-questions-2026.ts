import type { BlogPost } from './index';

export const post: BlogPost = {
  title: '100 Test Automation Interview Questions and Answers for 2026',
  description:
    'Comprehensive list of 100 test automation interview questions and answers for 2026, covering Selenium, Playwright, Cypress, API testing, CI/CD, framework design, coding challenges, and system design for SDET roles.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
Landing a test automation or SDET role in 2026 requires demonstrating deep knowledge across multiple tools, frameworks, and engineering practices. Interviewers no longer ask simple definition questions -- they want to see that you can design test architectures, debug complex failures, write efficient automation code, and reason about trade-offs. This guide covers 100 interview questions organized by difficulty level, with detailed answers and code examples where relevant.

Whether you are preparing for your first automation role or interviewing for a senior SDET position, these questions cover the full spectrum of topics you are likely to encounter: Selenium, Playwright, Cypress, API testing, CI/CD pipelines, framework design patterns, coding challenges, system design for testing, and behavioral questions.

## Key Takeaways

- Modern SDET interviews test practical coding ability, not just theoretical knowledge
- Expect questions spanning multiple tools -- Selenium, Playwright, and Cypress are all fair game
- Framework design and system design questions separate senior candidates from junior ones
- API testing and CI/CD pipeline questions are nearly universal in 2026 interviews
- Behavioral questions focus on debugging methodologies, trade-off decisions, and cross-team collaboration
- AI coding agents with QA skills can help you practice by generating mock interview scenarios

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

---

## Beginner Level Questions (1-35)

### Fundamentals

**1. What is the difference between manual testing and automated testing?**

Manual testing involves a human tester executing test cases step by step without any tooling. Automated testing uses scripts and frameworks to execute tests programmatically. Automated testing is faster, more repeatable, and scales better, but manual testing is still valuable for exploratory testing, usability assessment, and edge cases that are difficult to automate. The ideal strategy combines both -- automate repetitive regression tests and reserve manual effort for exploratory and ad-hoc testing.

**2. What is the test automation pyramid and why does it matter?**

The test automation pyramid is a strategy framework that recommends having many unit tests at the base, fewer integration tests in the middle, and the fewest end-to-end tests at the top. This structure optimizes for speed and reliability -- unit tests are fast and deterministic, integration tests verify component interactions, and E2E tests validate critical user journeys. In 2026, many teams add an API testing layer between integration and E2E, creating a four-tier pyramid.

**3. What are the key factors to consider when selecting a test automation tool?**

Consider the application technology stack, programming language support, community and ecosystem maturity, execution speed, parallel testing support, CI/CD integration, reporting capabilities, and licensing costs. For web testing in 2026, the leading choices are Playwright (best overall), Cypress (strong developer experience), and Selenium (widest language support). For mobile, Appium remains dominant. For API testing, Playwright API context, REST Assured, and Postman are the primary options.

**4. Explain the Page Object Model pattern.**

Page Object Model (POM) is a design pattern that creates a class for each page or component in the application. Each class encapsulates the locators and actions for that page. Tests interact with page objects rather than raw selectors. This separation provides maintainability (change a locator in one place), readability (tests read like business workflows), and reusability (page methods are shared across tests).

\`\`\`typescript
// Page Object example
class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
\`\`\`

**5. What is the difference between \`findElement\` and \`findElements\` in Selenium?**

\`findElement\` returns the first matching WebElement and throws a \`NoSuchElementException\` if no element is found. \`findElements\` returns a list of all matching WebElements and returns an empty list if none are found. Use \`findElement\` when you expect exactly one match and \`findElements\` when you need to iterate over multiple matching elements or check for element existence without exceptions.

**6. What are locator strategies in Selenium and which should you prefer?**

Selenium supports locators by ID, name, class name, tag name, link text, partial link text, CSS selector, and XPath. The preferred order is: ID (fastest, most reliable) > CSS selector (fast, flexible) > XPath (slowest, but handles complex traversal). In Playwright, the preferred strategy is role-based locators (\`getByRole\`, \`getByLabel\`, \`getByText\`) which are more resilient and accessible.

**7. What is an implicit wait vs an explicit wait in Selenium?**

Implicit wait sets a global timeout for all element lookups -- the driver polls the DOM for the specified duration before throwing a not-found exception. Explicit wait (using \`WebDriverWait\` with \`ExpectedConditions\`) waits for a specific condition on a specific element. Explicit waits are preferred because they are more precise and do not cause hidden delays. Never mix implicit and explicit waits -- it leads to unpredictable timeout behavior.

**8. What is a fluent wait?**

A fluent wait is an advanced form of explicit wait that lets you configure the polling interval and which exceptions to ignore during waiting. It is useful when elements appear asynchronously with variable timing.

\`\`\`java
Wait<WebDriver> wait = new FluentWait<>(driver)
    .withTimeout(Duration.ofSeconds(30))
    .pollingEvery(Duration.ofMillis(500))
    .ignoring(NoSuchElementException.class)
    .ignoring(StaleElementReferenceException.class);

WebElement element = wait.until(
    ExpectedConditions.elementToBeClickable(By.id("submit"))
);
\`\`\`

**9. How do you handle dropdowns in Selenium?**

Use the \`Select\` class for standard HTML \`<select>\` elements. For custom dropdowns (div-based), click the dropdown trigger, wait for options to appear, then click the desired option.

\`\`\`java
Select dropdown = new Select(driver.findElement(By.id("country")));
dropdown.selectByVisibleText("United States");
dropdown.selectByValue("US");
dropdown.selectByIndex(0);
\`\`\`

**10. What is the difference between \`close()\` and \`quit()\` in Selenium?**

\`close()\` closes only the current browser window. \`quit()\` closes all windows opened by the WebDriver session and terminates the driver process. Always use \`quit()\` in your teardown method to prevent orphaned browser processes.

**11. How do you handle alerts and pop-ups in Selenium?**

Use the \`Alert\` interface to interact with JavaScript alerts, confirms, and prompts:

\`\`\`java
Alert alert = driver.switchTo().alert();
String text = alert.getText();
alert.accept();    // Click OK
alert.dismiss();   // Click Cancel
alert.sendKeys("input text");  // For prompt dialogs
\`\`\`

**12. What is the Selenium Grid and when would you use it?**

Selenium Grid allows you to run tests in parallel across multiple machines and browsers. It consists of a Hub (central server that receives test requests) and Nodes (machines that execute tests). Use Grid when you need cross-browser testing, parallel execution for faster feedback, or testing across different operating systems. In 2026, Selenium Grid 4 uses a modern architecture with Router, Distributor, Session Map, and Node components.

**13. What is the purpose of \`DesiredCapabilities\` in Selenium?**

DesiredCapabilities (now replaced by \`Options\` classes in Selenium 4) configure the browser session -- specifying browser type, version, platform, headless mode, proxy settings, and custom preferences. In Selenium 4, use \`ChromeOptions\`, \`FirefoxOptions\`, or \`EdgeOptions\` instead of the deprecated \`DesiredCapabilities\`.

**14. How do you take a screenshot in Selenium?**

\`\`\`java
File screenshot = ((TakesScreenshot) driver)
    .getScreenshotAs(OutputType.FILE);
FileUtils.copyFile(screenshot,
    new File("screenshots/failure.png"));
\`\`\`

**15. What is a headless browser and when should you use it?**

A headless browser runs without a visible UI window. It executes faster and uses less memory, making it ideal for CI/CD pipelines. However, some visual bugs and rendering issues may only appear in headed mode, so always run your full regression suite in headed mode periodically. In Playwright, enable headless with \`headless: true\` in the launch options.

### Playwright Questions

**16. How does Playwright differ from Selenium architecturally?**

Selenium communicates with browsers through the WebDriver protocol (HTTP-based), while Playwright uses the Chrome DevTools Protocol (CDP) for Chromium and similar native protocols for Firefox and WebKit. This gives Playwright direct control over the browser, enabling features like network interception, request mocking, multi-tab testing, and automatic waiting that Selenium cannot match natively.

**17. What are Playwright locator strategies and which are preferred?**

Playwright recommends role-based locators as the primary strategy: \`getByRole\`, \`getByText\`, \`getByLabel\`, \`getByPlaceholder\`, \`getByTitle\`, and \`getByTestId\`. These mirror how users and assistive technologies find elements, making tests more resilient and accessible. CSS and XPath locators are available as fallbacks but should be used sparingly.

**18. Explain Playwright auto-waiting.**

Playwright automatically waits for elements to be actionable before performing actions. For clicks, it waits for the element to be visible, stable (not animating), receive events, and be enabled. This eliminates the need for explicit sleep statements or custom wait wrappers that plague Selenium tests.

**19. How do you handle multiple browser contexts in Playwright?**

\`\`\`typescript
const browser = await chromium.launch();
const context1 = await browser.newContext();
const context2 = await browser.newContext();
const page1 = await context1.newPage();
const page2 = await context2.newPage();
// context1 and context2 have separate cookies, storage, etc.
\`\`\`

Each browser context is an isolated session -- separate cookies, local storage, and cache. This is useful for testing multi-user scenarios (admin and regular user simultaneously) without needing separate browser instances.

**20. What are Playwright fixtures and why are they important?**

Fixtures in Playwright Test provide setup and teardown logic for tests. They replace traditional \`beforeEach\`/\`afterEach\` hooks with a more composable approach. Fixtures are lazy (only created when a test requests them), support dependency injection, and can be scoped to test, worker, or global level.

\`\`\`typescript
import { test as base } from '@playwright/test';

type MyFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<MyFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('user@test.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await use(page);
  },
});
\`\`\`

### Cypress Questions

**21. How does Cypress differ from Selenium and Playwright?**

Cypress runs inside the browser alongside your application, giving it direct access to the DOM, network layer, and application state. It uses a command queue with automatic retry and waiting. Unlike Selenium and Playwright, Cypress only supports Chromium-based browsers and Firefox -- no Safari/WebKit support. It also cannot handle multiple browser tabs or windows natively.

**22. What is the Cypress command queue?**

Cypress commands are asynchronous but execute serially in a queue. When you write \`cy.get('.btn').click()\`, Cypress does not execute immediately -- it enqueues the commands and runs them in order. This means you cannot use traditional async/await patterns with Cypress. Commands automatically retry until they pass or timeout.

**23. How do you stub network requests in Cypress?**

\`\`\`typescript
cy.intercept('GET', '/api/users', {
  statusCode: 200,
  body: [{ id: 1, name: 'Test User' }],
}).as('getUsers');

cy.visit('/users');
cy.wait('@getUsers');
cy.get('[data-testid="user-name"]').should('contain', 'Test User');
\`\`\`

**24. What are Cypress custom commands?**

Custom commands extend Cypress with reusable operations. They are defined in \`cypress/support/commands.ts\` and available globally in all tests.

\`\`\`typescript
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-testid="email"]').type(email);
    cy.get('[data-testid="password"]').type(password);
    cy.get('[data-testid="submit"]').click();
    cy.url().should('include', '/dashboard');
  });
});

// Usage in tests
cy.login('user@test.com', 'password');
\`\`\`

**25. Explain the difference between \`cy.get()\` and \`cy.find()\`.**

\`cy.get()\` searches the entire DOM from the root. \`cy.find()\` searches within a previously yielded element, scoping the search to that element's children. Use \`cy.find()\` when you need to locate elements within a specific container.

### API Testing Questions

**26. What are the key HTTP methods and when is each used?**

GET retrieves resources (should be idempotent and safe). POST creates new resources or triggers operations. PUT replaces an entire resource. PATCH partially updates a resource. DELETE removes a resource. HEAD retrieves headers without the body. OPTIONS describes the communication options for a resource. In API testing, you should verify that each method behaves correctly and that unsupported methods return 405 Method Not Allowed.

**27. What is the difference between authentication and authorization?**

Authentication verifies identity (who you are) -- typically via credentials, tokens, or certificates. Authorization determines access (what you can do) -- typically via roles, permissions, or policies. API tests should cover both: verify that unauthenticated requests are rejected (401), and that authenticated users cannot access resources outside their permissions (403).

**28. How do you validate an API response schema?**

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('GET /api/users returns valid schema', async ({ request }) => {
  const response = await request.get('/api/users');
  expect(response.status()).toBe(200);

  const data = await response.json();
  expect(Array.isArray(data)).toBe(true);
  expect(data[0]).toHaveProperty('id');
  expect(data[0]).toHaveProperty('email');
  expect(typeof data[0].id).toBe('number');
  expect(typeof data[0].email).toBe('string');
});
\`\`\`

**29. What is contract testing and why is it important?**

Contract testing verifies that the API provider and consumer agree on the request/response format. Instead of testing the full integration, each side tests against a shared contract. Pact is the leading tool for contract testing. It is critical in microservices architectures where teams deploy independently -- contract tests catch breaking changes before they reach staging.

**30. How do you test rate limiting on an API?**

Send requests in rapid succession and verify that the API returns 429 Too Many Requests after the limit is exceeded. Check the response headers for rate limit information (\`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`Retry-After\`). Verify that the rate limit resets after the window expires.

### General Concepts

**31. What is test data management and why is it challenging?**

Test data management involves creating, maintaining, and cleaning up data used in automated tests. Challenges include data dependencies between tests, environment-specific data, sensitive data masking, and data freshness. Best practices include using factories or builders to generate test data, isolating test data per test or suite, and cleaning up after test execution.

**32. What makes a test flaky?**

A flaky test is one that passes and fails intermittently without code changes. Common causes include timing issues (race conditions, slow network), shared state between tests, non-deterministic data, environment instability, and animation or transition timing. Fix flaky tests by adding proper waits, isolating test state, using deterministic test data, and retrying only as a last resort.

**33. What is continuous testing?**

Continuous testing is the practice of running automated tests at every stage of the delivery pipeline -- from commit to production. It includes unit tests on every push, integration tests on every merge, E2E tests on every deployment, and performance tests on every release candidate. The goal is fast feedback so that defects are caught as early as possible.

**34. What is shift-left testing?**

Shift-left testing moves testing activities earlier in the development lifecycle. Instead of testing after development is complete, tests are written alongside or before the code (TDD/BDD). This includes static analysis, unit testing during development, API contract testing during design, and security scanning in CI pipelines.

**35. What is the difference between regression testing and smoke testing?**

Smoke testing is a quick, shallow pass to verify that the most critical functionality works -- it answers the question "is the build stable enough to test?" Regression testing is a comprehensive pass to verify that existing functionality has not been broken by recent changes. Smoke tests run on every build; regression tests run on release candidates or nightly.

---

## Intermediate Level Questions (36-70)

### Framework Design

**36. How do you design a test automation framework from scratch?**

Start with these architectural decisions: choose a programming language (align with the dev team), select a test runner (Playwright Test, TestNG, pytest), implement the Page Object Model, add a configuration layer (environment-specific settings), implement reporting (Allure, HTML reports), add logging, set up CI/CD integration, and create a data management layer. The framework should be modular so that individual components can be swapped without rewriting tests.

**37. What is the Builder pattern in test automation?**

The Builder pattern creates complex test data or configuration objects step by step. It is cleaner than constructors with many parameters and makes tests more readable.

\`\`\`typescript
class UserBuilder {
  private user: Partial<User> = {};

  withEmail(email: string) { this.user.email = email; return this; }
  withRole(role: string) { this.user.role = role; return this; }
  withName(name: string) { this.user.name = name; return this; }
  isActive(active = true) { this.user.active = active; return this; }

  build(): User {
    return {
      email: this.user.email || 'default@test.com',
      role: this.user.role || 'user',
      name: this.user.name || 'Test User',
      active: this.user.active ?? true,
    } as User;
  }
}

// Usage
const admin = new UserBuilder()
  .withEmail('admin@test.com')
  .withRole('admin')
  .withName('Admin User')
  .build();
\`\`\`

**38. How do you implement data-driven testing?**

Data-driven testing runs the same test with multiple input data sets. Each framework has its own mechanism:

\`\`\`typescript
// Playwright parameterized tests
const testCases = [
  { email: 'valid@test.com', password: 'Pass123!', expected: 'success' },
  { email: 'invalid', password: 'Pass123!', expected: 'invalid email' },
  { email: 'valid@test.com', password: '', expected: 'password required' },
];

for (const tc of testCases) {
  test(\`login with \${tc.email} should \${tc.expected}\`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(tc.email);
    await page.getByLabel('Password').fill(tc.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    // Assert based on tc.expected
  });
}
\`\`\`

**39. What is the Screenplay pattern?**

The Screenplay pattern models tests around actors performing tasks and asking questions about the system state. It is more expressive than Page Objects for complex workflows: \`Actor.attemptsTo(Login.withCredentials('user', 'pass'))\`. Serenity BDD is the most popular implementation. It works well for BDD-driven teams but has a steeper learning curve than POM.

**40. How do you handle test configuration across environments?**

Use a configuration layer that loads settings based on the target environment:

\`\`\`typescript
// config/index.ts
interface TestConfig {
  baseUrl: string;
  apiUrl: string;
  timeout: number;
}

const configs: Record<string, TestConfig> = {
  dev: { baseUrl: 'https://dev.app.com', apiUrl: 'https://api.dev.app.com', timeout: 30000 },
  staging: { baseUrl: 'https://staging.app.com', apiUrl: 'https://api.staging.app.com', timeout: 30000 },
  prod: { baseUrl: 'https://app.com', apiUrl: 'https://api.app.com', timeout: 15000 },
};

export const config = configs[process.env.TEST_ENV || 'dev'];
\`\`\`

**41. What is the Factory pattern in test automation?**

Factories generate test objects with default values, making test data creation concise. Unlike builders, factories create objects in a single call with sensible defaults.

**42. How do you implement custom waits in Playwright?**

\`\`\`typescript
// Wait for a specific network response
await page.waitForResponse(
  (resp) => resp.url().includes('/api/data') && resp.status() === 200
);

// Wait for a specific DOM state
await page.waitForFunction(() => {
  return document.querySelectorAll('.list-item').length >= 10;
});

// Wait for load state
await page.waitForLoadState('networkidle');
\`\`\`

**43. How do you handle file uploads in automated tests?**

\`\`\`typescript
// Playwright
const fileInput = page.locator('input[type="file"]');
await fileInput.setInputFiles('path/to/file.pdf');

// Multiple files
await fileInput.setInputFiles(['file1.pdf', 'file2.pdf']);

// Clear file input
await fileInput.setInputFiles([]);
\`\`\`

**44. How do you test authentication flows (OAuth, SSO)?**

For OAuth and SSO, there are three approaches: (1) Use the application API to generate auth tokens directly, bypassing the UI login. (2) Use \`storageState\` in Playwright to save and reuse authenticated sessions. (3) Mock the OAuth provider in test environments. Approach 1 is fastest and most reliable for regression testing; approach 3 is best for testing the auth flow itself.

\`\`\`typescript
// Save auth state after login
await page.context().storageState({ path: 'auth.json' });

// Reuse auth state in subsequent tests
const context = await browser.newContext({
  storageState: 'auth.json',
});
\`\`\`

**45. What is visual regression testing?**

Visual regression testing captures screenshots of UI components and compares them against baseline images to detect unintended visual changes. Tools include Playwright's built-in screenshot comparison, Percy, Applitools, and BackstopJS. Set a pixel tolerance threshold to handle anti-aliasing differences across platforms.

\`\`\`typescript
await expect(page).toHaveScreenshot('homepage.png', {
  maxDiffPixelRatio: 0.01,
});
\`\`\`

### CI/CD and Infrastructure

**46. How do you set up Playwright tests in GitHub Actions?**

\`\`\`yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
\`\`\`

**47. How do you run tests in parallel in CI/CD?**

Most frameworks support sharding -- splitting the test suite across multiple CI jobs:

\`\`\`yaml
strategy:
  matrix:
    shard: [1/4, 2/4, 3/4, 4/4]
steps:
  - run: npx playwright test --shard=\${{ matrix.shard }}
\`\`\`

**48. How do you handle test reporting in CI/CD?**

Use Allure Report or the framework's built-in reporter. Upload reports as artifacts, publish to a static hosting service, or integrate with reporting dashboards. Include screenshots and videos for failed tests. Send Slack or email notifications for test failures.

**49. What is containerized testing and why does it matter?**

Running tests inside Docker containers ensures consistent environments across local development, CI, and different team members. It eliminates "works on my machine" issues by packaging the browser, drivers, and dependencies into a reproducible image.

**50. How do you handle test retries and what are the risks?**

Test retries automatically re-run failed tests. Use them cautiously -- they mask flaky tests. Configure retries at the CI level (not in test code), limit to 1-2 retries, and track retry rates. If a test frequently needs retries, fix the root cause instead of relying on retry mechanisms.

### Advanced Concepts

**51. How do you test WebSocket connections?**

\`\`\`typescript
test('should receive WebSocket messages', async ({ page }) => {
  const messages: string[] = [];
  page.on('websocket', (ws) => {
    ws.on('framereceived', (frame) => {
      messages.push(frame.payload as string);
    });
  });
  await page.goto('/realtime-dashboard');
  await page.waitForTimeout(3000);
  expect(messages.length).toBeGreaterThan(0);
});
\`\`\`

**52. How do you test responsive layouts?**

\`\`\`typescript
const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

for (const vp of viewports) {
  test(\`homepage renders correctly on \${vp.name}\`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    await expect(page).toHaveScreenshot(\`homepage-\${vp.name}.png\`);
  });
}
\`\`\`

**53. What is mutation testing?**

Mutation testing evaluates the quality of your test suite by introducing small changes (mutations) to the source code and checking whether your tests detect them. If a mutation survives (tests still pass), your tests have a gap. Stryker is the leading mutation testing framework for JavaScript/TypeScript. A high mutation score (above 80%) indicates a thorough test suite.

**54. How do you test accessibility automatically?**

Use axe-core integrated with your testing framework to scan for WCAG violations:

\`\`\`typescript
import AxeBuilder from '@axe-core/playwright';

test('homepage has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
\`\`\`

**55. What is chaos engineering and how does it relate to testing?**

Chaos engineering intentionally introduces failures (network latency, service unavailability, disk full) into production or staging environments to verify system resilience. Testing-related chaos experiments include: injecting network delays to test timeout handling, killing service instances to test failover, and corrupting data to test validation and recovery. Tools include Chaos Monkey, Gremlin, and LitmusChaos.

**56-60. API Testing Intermediate Questions**

**56.** How do you test GraphQL APIs versus REST APIs? GraphQL uses a single endpoint with query/mutation operations. Test by validating query responses against expected schemas, testing nested queries for N+1 performance issues, and verifying authorization at the field level.

**57.** What is contract testing with Pact? Pact is a consumer-driven contract testing tool. The consumer defines expected interactions, generates a contract file, and the provider verifies it. This catches integration issues without running both services simultaneously.

**58.** How do you load test an API? Use tools like k6 or JMeter to simulate concurrent users. Define scenarios with ramp-up periods, steady-state load, and spike patterns. Measure response time percentiles (p50, p95, p99), throughput, and error rates.

**59.** How do you test API versioning? Verify that deprecated endpoints still work during the deprecation period, new endpoints return the correct version format, content negotiation headers work correctly, and breaking changes are properly versioned.

**60.** What is API mocking and when should you use it? API mocking simulates real API responses for testing. Use mocks when the real API is unavailable, slow, expensive to call, or returns non-deterministic data. Tools include MSW (Mock Service Worker), WireMock, and Playwright's route API.

### Coding Questions

**61. Write a function to retry a flaky operation up to N times.**

\`\`\`typescript
async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
  }
  throw lastError;
}
\`\`\`

**62. Write a function to parse and validate an email address.**

\`\`\`typescript
function isValidEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
  return regex.test(email) && email.length <= 254;
}
\`\`\`

**63. Write a function that waits for a condition with timeout.**

\`\`\`typescript
async function waitFor(
  condition: () => Promise<boolean>,
  timeoutMs: number,
  pollIntervalMs = 200
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await condition()) return;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error(\`Condition not met within \${timeoutMs}ms\`);
}
\`\`\`

**64. Write a test data generator for random user objects.**

\`\`\`typescript
function generateUser(overrides: Partial<User> = {}): User {
  const id = Math.floor(Math.random() * 100000);
  return {
    id,
    email: \`user\${id}@test.com\`,
    name: \`Test User \${id}\`,
    role: 'user',
    active: true,
    ...overrides,
  };
}
\`\`\`

**65. Write a function to deep compare two objects for testing.**

\`\`\`typescript
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) =>
    deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key]
    )
  );
}
\`\`\`

**66-70. More Coding Challenges**

**66.** Implement a simple test result aggregator that counts passed, failed, and skipped tests from a results array.

**67.** Write a URL parser that extracts protocol, host, port, path, and query parameters -- useful for API test validation.

**68.** Implement a basic CSV parser that returns an array of objects, suitable for reading test data files.

**69.** Write a function to generate a random string of specified length and character sets -- useful for boundary testing form fields.

**70.** Implement exponential backoff for API request retries with jitter to prevent thundering herd problems in load tests.

---

## Senior Level Questions (71-100)

### System Design for Testing

**71. Design a test automation framework for a microservices application with 20 services.**

Start by identifying testing boundaries: each service needs unit tests (owned by the service team), contract tests between communicating services (Pact), integration tests for critical workflows spanning 2-3 services, and E2E tests for the top 5 business-critical journeys. Use service virtualization to isolate services during testing. Run contract tests in CI on every PR, integration tests on merge to main, and E2E tests nightly or on release candidates. Centralize test reporting in a dashboard.

**72. How would you design a testing strategy for a real-time collaborative editor?**

Test concurrent editing with multiple browser contexts in Playwright. Verify conflict resolution logic with simultaneous edits to the same content. Test presence indicators, cursor positions, and undo/redo across sessions. Use WebSocket interception to simulate network partitions and test offline-to-online sync. Performance test with increasing numbers of concurrent editors.

**73. Design a test data management system for a large test suite.**

Implement a layered approach: (1) Factory functions for creating individual entities with sensible defaults and overrides. (2) Fixtures for common data scenarios (empty state, populated state, edge case state). (3) Database seeders for environment setup. (4) Cleanup hooks that run after each test or suite. Consider using database transactions that roll back after each test for fast, isolated data management.

**74. How would you architect flaky test detection and quarantine?**

Track test results over time in a database. Flag tests with inconsistent results (passed then failed without code changes) as potentially flaky. After N inconsistent results, automatically quarantine the test -- move it to a separate suite that runs but does not block CI. Alert the owning team. Provide a dashboard showing flaky test trends, mean time to quarantine, and mean time to fix.

**75. Design a testing strategy for a mobile banking application.**

Security testing is paramount: penetration testing, certificate pinning verification, biometric auth testing, session management, and data encryption at rest. Functional testing covers account operations, transfers, bill payments, and notifications. Accessibility testing ensures WCAG compliance for all users. Performance testing validates response times under load. Device coverage uses a cloud farm with a priority matrix (top 20 devices by market share, latest 2 OS versions).

### Leadership and Strategy

**76. How do you decide which tests to automate?**

Apply the automation ROI formula: prioritize tests that run frequently, are stable, cover critical functionality, and take significant time manually. Avoid automating tests that change constantly (early development), require visual judgment (complex UI verification), or run rarely (one-off verification). Start with API tests and critical path E2E tests for the highest ROI.

**77. How do you measure the effectiveness of a test automation suite?**

Key metrics include: defect escape rate (bugs found in production that tests should have caught), test execution time, test stability (percentage of runs without flaky failures), code coverage (statement, branch, mutation), mean time to detect regression, and test maintenance cost (hours spent maintaining tests vs writing new ones). Track trends over time rather than absolute numbers.

**78. How do you handle testing in a continuous deployment environment?**

Implement progressive testing: fast unit and contract tests gate every commit, integration tests gate merge to main, canary deployments run synthetic monitoring, and automated rollback triggers on error rate spikes. Use feature flags to decouple deployment from release. Maintain a separate production smoke suite that runs after every deployment.

**79. What is your approach to testing technical debt?**

Treat test debt like product debt -- track it, prioritize it, and allocate time to address it. Common test debt includes: flaky tests that are retried instead of fixed, missing test coverage for critical paths, outdated page objects that no longer match the UI, and slow tests that could be optimized. Dedicate 20% of each sprint to test maintenance and debt reduction.

**80. How do you build a quality engineering culture?**

Quality is not the QA team's responsibility alone. Embed quality practices in the development process: developers write unit tests, code reviews include test coverage checks, CI pipelines enforce quality gates, and production monitoring feeds back into test priorities. Share quality metrics transparently and celebrate improvements.

### Advanced Technical

**81. How do you test a GraphQL subscription (real-time data)?**

Use Playwright to establish a WebSocket connection to the GraphQL subscription endpoint. Send a subscription query, then trigger a mutation in a separate context. Verify that the subscription receives the expected update within a timeout. Test unsubscribe behavior and reconnection logic.

**82. How do you implement cross-browser testing efficiently?**

Run the full suite on the primary browser (Chromium). Run a smaller critical-path suite on Firefox and WebKit. Use Playwright projects to configure this:

\`\`\`typescript
// playwright.config.ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testMatch: '**/*.spec.ts' },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testMatch: '**/critical/**' },
  { name: 'webkit', use: { ...devices['Desktop Safari'] }, testMatch: '**/critical/**' },
],
\`\`\`

**83. How do you test database migrations?**

Test that migrations run forward successfully, rollback cleanly, preserve existing data, handle edge cases (empty tables, null values, large datasets), and are idempotent. Run migration tests as part of the CI pipeline before deploying schema changes.

**84. What is property-based testing?**

Property-based testing generates random inputs and verifies that properties (invariants) hold true for all inputs. Instead of writing specific test cases, you define properties like "sorting any array should produce an array of the same length where each element is less than or equal to the next." Fast-check is the leading property-based testing library for TypeScript.

**85. How do you test error handling and resilience?**

Inject failures at every integration point: network errors (using route mocking), timeout errors (slow responses), invalid data (malformed JSON, wrong types), resource exhaustion (429 responses), and service unavailability (503 responses). Verify that the application handles each gracefully with appropriate error messages, retries, and fallbacks.

### Behavioral Questions

**86. Describe a time you debugged a flaky test.**

Structure your answer: describe the symptom (intermittent failure), your investigation process (checking logs, isolating the test, reproducing locally), the root cause (race condition, shared state, etc.), and the fix. Emphasize systematic debugging methodology over luck.

**87. How do you handle disagreements about test coverage with developers?**

Present data: show the risk areas where bugs have escaped to production, the cost of those bugs, and how specific tests would have caught them. Use concrete examples rather than abstract arguments. Propose a shared coverage target and track progress collaboratively.

**88. Describe a testing strategy you designed from scratch.**

Walk through your decision-making process: how you assessed the application architecture, identified risk areas, chose tools and frameworks, defined the test pyramid distribution, set up CI/CD integration, and measured success. Emphasize the trade-offs you made and why.

**89. How do you prioritize testing when deadlines are tight?**

Focus on risk-based testing: identify the highest-risk areas (new features, critical paths, areas with past bugs) and test those first. Use the "testing quadrants" model -- prioritize tests that prevent the highest-impact defects. Communicate trade-offs clearly to stakeholders.

**90. How do you stay current with testing tools and practices?**

Follow the Playwright, Selenium, and Cypress release blogs. Read the annual State of Testing reports. Participate in testing communities (Ministry of Testing, Test Automation University). Try new tools on side projects before recommending them at work. Attend conferences or watch recorded talks.

### Expert-Level Questions

**91. How do you implement A/B test verification in automated tests?**

Detect the active variant (via feature flag API, cookie, or DOM attribute), branch test assertions based on the variant, and ensure both variants are covered across your test suite. Use a test matrix that runs critical tests against each variant.

**92. How do you test progressive web applications (PWAs)?**

Test service worker registration, offline functionality (use Playwright's \`context.setOffline(true)\`), push notification handling, install prompts, cache behavior, and background sync. Verify Lighthouse PWA audit scores as part of CI.

**93. How do you handle testing for internationalization (i18n)?**

Test with multiple locales: verify text rendering, date/time formatting, currency formatting, RTL layout support, character encoding, string length variations (German text is often 30% longer than English), and locale-specific form validation.

**94. How do you implement security testing in the automation pipeline?**

Integrate SAST (static analysis), DAST (dynamic analysis), dependency scanning, and secret detection into CI. Use OWASP ZAP for dynamic security scanning, Snyk or Dependabot for dependency vulnerabilities, and custom tests for authentication bypass, SQL injection, XSS, and CSRF.

**95. How do you test machine learning model integrations?**

Test input validation (reject malformed inputs), response schema validation, latency SLAs, graceful degradation when the model is unavailable, confidence score thresholds, and output determinism (same input should produce consistent output categories). Use snapshot testing for model response formats.

**96. How do you design tests for event-driven architectures?**

Test event publishing (verify events are emitted with correct payloads), event consumption (verify handlers process events correctly), event ordering (verify idempotency and out-of-order handling), and dead letter queues (verify failed events are captured). Use test containers for message broker integration tests.

**97. What is your approach to testing distributed systems?**

Test individual service correctness, inter-service communication contracts, end-to-end saga workflows, failure modes (network partitions, service crashes), eventual consistency, and data integrity across services. Use chaos engineering techniques to validate resilience assumptions.

**98. How do you balance test coverage with execution speed?**

Tier your test suite: fast tests (unit + contract, under 5 minutes) run on every commit, medium tests (integration, 5-15 minutes) run on PR, slow tests (E2E + performance, 30+ minutes) run nightly or on release candidates. Use parallel execution, test sharding, and selective test running (only tests affected by changed code) to optimize speed.

**99. Describe your ideal test automation architecture for a cloud-native application.**

Infrastructure as code for test environments (Terraform/Pulumi), containerized test execution (Docker), parallel and sharded CI jobs, contract testing between all service boundaries, synthetic monitoring in production, automated rollback triggers, centralized test reporting dashboard, and AI-assisted test generation for regression coverage gaps.

**100. Where do you see test automation heading in the next 3 years?**

AI agents will generate and maintain test suites based on production traffic patterns and user behavior. Self-healing tests will automatically update selectors and assertions when the UI changes. Testing will shift further left with AI-powered code review that identifies untested edge cases before merge. Visual AI will handle visual regression testing without pixel-level comparison. The role of QA engineers will evolve from test writers to test architects and AI trainers who curate the skills and patterns that agents use.

---

## Preparing for Your Interview

### Study Strategy

1. **Hands-on practice**: Build a small test framework from scratch using Playwright or Selenium. Having a portfolio project demonstrates practical ability.
2. **Code fluency**: Practice writing test utilities, page objects, and assertion helpers without an IDE. Many interviews include live coding.
3. **System design**: Practice designing test strategies for common application types (e-commerce, banking, real-time chat). Draw architecture diagrams.
4. **Tool breadth**: Even if you specialize in one tool, understand the trade-offs between Selenium, Playwright, and Cypress.
5. **AI awareness**: Understand how AI coding agents are changing test automation. Be ready to discuss AI-generated tests, their limitations, and how humans add value.

### QA Skills for Interview Preparation

AI coding agents can help you practice by generating mock interview scenarios and sample tests:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
npx @qaskills/cli add api-testing-rest-assured
npx @qaskills/cli add selenium-webdriver
\`\`\`

Browse all available testing skills at [qaskills.sh/skills](/skills).

---

## Conclusion

The test automation interview landscape in 2026 rewards depth over breadth and practical skills over memorized definitions. Interviewers want to see that you can design scalable test architectures, write clean automation code, debug complex failures systematically, and make informed trade-off decisions. The 100 questions in this guide cover the full spectrum from fundamentals to expert-level system design -- use them as a framework for your preparation, not as answers to memorize. The strongest candidates are those who can explain their reasoning and adapt their approach to the specific context of the problem.
`,
};
