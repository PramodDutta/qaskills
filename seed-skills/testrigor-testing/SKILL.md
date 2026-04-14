---
name: testRigor Plain-English Testing
description: End-to-end test automation using testRigor's plain English syntax for writing maintainable tests without coding, covering cross-browser testing, mobile testing, API validation, and integrations with CI/CD pipelines.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [testrigor, plain-english, no-code, codeless-testing, natural-language, cross-browser, mobile-testing, ai-testing, test-automation, low-code]
testingTypes: [e2e, integration, api, mobile, accessibility]
frameworks: [testrigor]
languages: [typescript, javascript]
domains: [web, mobile, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# testRigor Plain-English Testing Skill

You are an expert in testRigor, the AI-powered plain-English test automation platform. When the user asks you to create tests using natural language, build codeless test suites with testRigor, integrate testRigor with CI/CD, or migrate from coded automation to plain-English tests, follow these detailed instructions.

## Core Principles

1. **Plain English as the test language** -- Tests are written in natural language statements that map directly to user actions. No selectors, no code, no XPath.
2. **AI-powered element resolution** -- testRigor uses AI to find elements based on how users describe them (labels, text content, position) rather than DOM structure.
3. **Cross-platform from a single test** -- The same plain-English test can run across web, mobile, and API with minimal modification.
4. **Self-maintaining tests** -- Because tests describe user intent rather than implementation details, they survive UI refactors that break traditional automation.
5. **Data-driven with stored values** -- Use testRigor's variable system and data generators to parameterize tests without external data files.
6. **Conditional logic support** -- testRigor supports if/else conditions, loops, and stored values for complex test scenarios.
7. **Integration-first design** -- Connect testRigor to Jira, Slack, CI/CD pipelines, and monitoring tools for end-to-end quality workflows.

## Project Structure

```
testrigor-tests/
  test-suites/
    smoke/
      login-smoke.md
      navigation-smoke.md
      search-smoke.md
    regression/
      auth/
        login-tests.md
        registration-tests.md
        password-management.md
      checkout/
        cart-operations.md
        payment-flow.md
        order-management.md
      user-profile/
        profile-update.md
        preferences.md
    api/
      user-api-tests.md
      product-api-tests.md
    mobile/
      mobile-login.md
      mobile-checkout.md
  reusable-rules/
    login-as-admin.md
    login-as-user.md
    add-product-to-cart.md
    navigate-to-checkout.md
    cleanup-test-data.md
  data/
    test-users.md
    product-catalog.md
  config/
    environments.md
    integrations.md
  scripts/
    testrigor-api-client.ts
    ci-trigger.ts
    result-parser.ts
```

## testRigor Test Syntax Examples

```markdown
<!-- test-suites/smoke/login-smoke.md -->
# Login Smoke Tests

## Test: Successful login with valid email and password
navigate to "login"
enter "testuser@example.com" into "Email"
enter stored value "userPassword" into "Password"
click "Sign In"
check that page contains "Welcome back"
check that url contains "/dashboard"

## Test: Login fails with incorrect password
navigate to "login"
enter "testuser@example.com" into "Email"
enter "WrongPassword123" into "Password"
click "Sign In"
check that page contains "Invalid credentials"
check that url contains "/login"

## Test: Login form shows validation errors for empty fields
navigate to "login"
click "Sign In"
check that page contains "Email is required"
check that page contains "Password is required"

## Test: Password field masks input
navigate to "login"
enter "TestPassword" into "Password"
check that "Password" has attribute "type" with value "password"

## Test: Forgot password link navigates correctly
navigate to "login"
click "Forgot password?"
check that url contains "/reset-password"
check that page contains "Reset your password"
```

## Complex Test Scenarios

```markdown
<!-- test-suites/regression/checkout/cart-operations.md -->
# Cart Operations Tests

## Test: Add single product to cart and verify
navigate to "products"
click on "Wireless Headphones"
check that page contains "Wireless Headphones"
click "Add to Cart"
check that notification contains "Added to cart"
click on the cart icon
check that page contains "Wireless Headphones"
check that page contains "1" in the quantity field
save the value of "Total" as "cartTotal"

## Test: Update product quantity in cart
navigate to "products"
click on "Wireless Headphones"
click "Add to Cart"
click on the cart icon
clear the "Quantity" field
enter "3" into "Quantity"
click "Update"
check that the value of "Subtotal" is greater than stored value "cartTotal"

## Test: Remove product from cart
navigate to "products"
click on "Wireless Headphones"
click "Add to Cart"
click on the cart icon
click "Remove" for "Wireless Headphones"
check that page contains "Your cart is empty"

## Test: Cart persists after page refresh
navigate to "products"
click on "Wireless Headphones"
click "Add to Cart"
refresh the page
click on the cart icon
check that page contains "Wireless Headphones"

## Test: Apply discount code
navigate to "products"
click on "Wireless Headphones"
click "Add to Cart"
click on the cart icon
enter "SAVE10" into "Discount Code"
click "Apply"
check that page contains "Discount applied"
check that page contains "-10%"
```

## Reusable Rules

```markdown
<!-- reusable-rules/login-as-admin.md -->
# Rule: login as admin
navigate to "login"
enter stored value "adminEmail" into "Email"
enter stored value "adminPassword" into "Password"
click "Sign In"
check that page contains "Admin Dashboard"

<!-- reusable-rules/add-product-to-cart.md -->
# Rule: add product "productName" to cart
navigate to "products"
click on the value of "productName"
click "Add to Cart"
check that notification contains "Added to cart"

<!-- reusable-rules/navigate-to-checkout.md -->
# Rule: navigate to checkout
click on the cart icon
check that the cart is not empty
click "Proceed to Checkout"
check that url contains "/checkout"
```

## API Testing with testRigor

```markdown
<!-- test-suites/api/user-api-tests.md -->
# User API Tests

## Test: Create a new user via API
call api "POST" on "https://api.example.com/users" with headers "Content-Type:application/json" and body:
  {
    "name": "Test User",
    "email": "generated email",
    "role": "user"
  }
check that api response status is "201"
check that api response contains "id"
save api response field "id" as "newUserId"

## Test: Get user details via API
call api "GET" on "https://api.example.com/users/${stored value 'newUserId'}" with headers "Authorization:Bearer ${stored value 'apiToken'}"
check that api response status is "200"
check that api response field "name" equals "Test User"
check that api response field "email" contains "@"

## Test: Update user via API
call api "PUT" on "https://api.example.com/users/${stored value 'newUserId'}" with headers "Content-Type:application/json,Authorization:Bearer ${stored value 'apiToken'}" and body:
  {
    "name": "Updated User"
  }
check that api response status is "200"
check that api response field "name" equals "Updated User"

## Test: Delete user via API
call api "DELETE" on "https://api.example.com/users/${stored value 'newUserId'}" with headers "Authorization:Bearer ${stored value 'apiToken'}"
check that api response status is "204"

## Test: API returns 404 for non-existent user
call api "GET" on "https://api.example.com/users/nonexistent-id" with headers "Authorization:Bearer ${stored value 'apiToken'}"
check that api response status is "404"
```

## testRigor API Client for CI/CD

```typescript
// scripts/testrigor-api-client.ts
interface TestRigorConfig {
  apiToken: string;
  testSuiteId: string;
  baseUrl?: string;
}

interface TestRun {
  id: string;
  status: 'running' | 'passed' | 'failed' | 'cancelled';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  startTime: string;
  endTime?: string;
  url: string;
}

export class TestRigorClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private testSuiteId: string;

  constructor(config: TestRigorConfig) {
    this.baseUrl = config.baseUrl || 'https://api.testrigor.com/api/v1';
    this.testSuiteId = config.testSuiteId;
    this.headers = {
      'Content-Type': 'application/json',
      'auth-token': config.apiToken,
    };
  }

  async triggerTestRun(options?: {
    labels?: string[];
    environment?: string;
    browser?: string;
  }): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/apps/${this.testSuiteId}/retest`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          labels: options?.labels,
          environment: options?.environment,
          browser: options?.browser || 'chrome',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`testRigor API error: ${response.status}`);
    }

    const result = await response.json();
    return result.testRunId;
  }

  async getTestRunStatus(runId: string): Promise<TestRun> {
    const response = await fetch(
      `${this.baseUrl}/apps/${this.testSuiteId}/testRuns/${runId}`,
      { headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`testRigor API error: ${response.status}`);
    }

    return response.json();
  }

  async waitForCompletion(runId: string, timeoutMs = 1800000): Promise<TestRun> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getTestRunStatus(runId);

      if (status.status === 'passed' || status.status === 'failed') {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, 15000));
    }

    throw new Error('Test run timed out');
  }
}
```

## GitHub Actions Integration

```yaml
# .github/workflows/testrigor-tests.yml
name: testRigor Tests
on:
  push:
    branches: [main]
  pull_request:

jobs:
  testrigor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Trigger testRigor Tests
        env:
          TESTRIGOR_TOKEN: ${{ secrets.TESTRIGOR_TOKEN }}
          TESTRIGOR_SUITE_ID: ${{ vars.TESTRIGOR_SUITE_ID }}
        run: npx tsx scripts/ci-trigger.ts

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: testrigor-results
          path: test-results/
```

## Mobile Testing with testRigor

```markdown
<!-- test-suites/mobile/mobile-login.md -->
# Mobile Login Tests

## Test: Mobile login with email
open app "com.example.app"
tap "Sign In"
enter "user@example.com" into "Email"
enter stored value "password" into "Password"
tap "Log In"
check that screen contains "Welcome"

## Test: Biometric login prompt
open app "com.example.app"
tap "Sign In"
check that "Use Face ID" button is visible
tap "Use Face ID"
confirm biometric authentication
check that screen contains "Dashboard"

## Test: Mobile form validation
open app "com.example.app"
tap "Sign In"
tap "Log In" without filling fields
check that screen contains "Email is required"

## Test: Landscape orientation login
rotate device to landscape
open app "com.example.app"
tap "Sign In"
enter "user@example.com" into "Email"
enter "Password123" into "Password"
tap "Log In"
check that screen contains "Welcome"
rotate device to portrait
```

## Data Management and Variables

```markdown
<!-- data/test-users.md -->
# Test Data Configuration

## Stored Values Setup
save value "testuser@example.com" as "userEmail"
save value "SecurePass123!" as "userPassword"
save value "admin@example.com" as "adminEmail"
save value "AdminPass456!" as "adminPassword"

## Generated Data Examples
# In test steps, use these generators:
# generated email -> produces unique email like test_a1b2c3@testrigor.com
# generated name -> produces random full name
# generated phone -> produces random phone number
# generated number between 1 and 100 -> random integer

## Using Variables in Tests
save value "generated email" as "newUserEmail"
enter stored value "newUserEmail" into "Email"
save the value of "Order ID" as "orderId"
check that the value of "Confirmation" contains stored value "orderId"
```

## Conditional Logic and Loops

```markdown
<!-- test-suites/regression/conditional-tests.md -->
# Conditional Test Scenarios

## Test: Handle optional modal
navigate to "home"
if page contains "Cookie Consent" then click "Accept All"
check that page contains "Welcome"

## Test: Different flows based on user type
navigate to "dashboard"
if page contains "Admin Panel" then
  click "Admin Panel"
  check that page contains "User Management"
else
  check that page contains "My Account"
end if

## Test: Retry until element appears
navigate to "processing"
repeat up to 10 times
  if page contains "Processing Complete" then exit loop
  wait 2 seconds
end repeat
check that page contains "Processing Complete"
```

## Integration with Jira

```markdown
<!-- config/integrations.md -->
# testRigor Integrations

## Jira Integration
# testRigor automatically creates Jira tickets for failed tests when configured:
# - Project: QA
# - Issue Type: Bug
# - Priority: Based on test priority label
# - Description: Includes test steps, screenshots, and environment details
# - Assignee: Based on component mapping

## Slack Notifications
# Configure channels per test suite:
# - #qa-critical -> critical test failures
# - #qa-nightly -> nightly regression results
# - #qa-smoke -> smoke test results

## CI/CD Webhooks
# Trigger test runs via webhook:
# POST https://api.testrigor.com/api/v1/apps/{suiteId}/retest
# Headers: auth-token: {API_TOKEN}
# Body: {"labels": ["smoke"], "browser": "chrome"}
```

## Test Organization Patterns

```markdown
<!-- Organizing large test suites -->

# Label Strategy
# Use hierarchical labels for organization:
# Priority: p0-critical, p1-high, p2-medium, p3-low
# Type: smoke, regression, sanity, exploratory
# Feature: auth, checkout, search, profile, admin
# Platform: web, mobile-ios, mobile-android, tablet

# Running specific subsets:
# CI on commit: labels "smoke" AND "p0-critical"
# CI on merge: labels "regression" AND ("p0-critical" OR "p1-high")
# Nightly: labels "regression"
# Weekly: all tests

# Naming Convention
# Test names should be: [Feature] - [Scenario] - [Condition]
# Example: "Auth - Login - Valid credentials"
# Example: "Checkout - Payment - Expired card"
# Example: "Search - Filter - Multiple categories"
```

## Performance and Scalability Considerations

When scaling testRigor test suites beyond 500 tests, consider organizing tests into focused suites of 50-100 tests each. Use labels extensively to enable selective execution. Schedule full regression runs during off-peak hours. Monitor test execution time trends and investigate tests that gradually slow down.

For large teams, establish ownership of test suites by feature area. Each team owns their feature's tests and is responsible for maintenance. Use testRigor's built-in analytics to identify which teams have the most flaky or failing tests.

When integrating with multiple environments, create environment-specific configurations that include the base URL, API endpoints, feature flags, and test user credentials. Use testRigor's environment selector to run the same tests against different environments without duplicating test definitions.

## Best Practices

1. **Write tests from the user's perspective** -- Use the language your users would use: "click Sign In" not "click button#submit". testRigor's AI resolves the elements.
2. **Create reusable rules for common flows** -- Login, navigation, and data setup should be reusable rules invoked from multiple tests.
3. **Use stored values for dynamic data** -- Save API responses, generated data, and intermediate values using testRigor's stored value feature.
4. **Label tests by type and priority** -- Use labels to organize tests into smoke, regression, and critical categories for selective CI execution.
5. **Configure separate environments** -- Set up staging, QA, and production environments with appropriate URLs and credentials.
6. **Use generated data for unique values** -- testRigor can generate emails, names, and phone numbers. Use these instead of hardcoded values for test isolation.
7. **Add explicit waits for dynamic content** -- While testRigor handles most waits automatically, add explicit wait steps for known slow operations.
8. **Combine API and UI steps** -- Use API calls for data setup and cleanup, UI interactions for user journey validation.
9. **Review AI element resolution regularly** -- Check that testRigor is finding the correct elements, especially after major UI changes.
10. **Keep test suites focused** -- Each test suite should cover one feature area. Avoid mixing authentication, checkout, and profile tests in one suite.

## Anti-Patterns

1. **Writing overly technical descriptions** -- "Click the div with aria-label submit" defeats plain-English testing. Write "Click Submit" instead.
2. **Not using reusable rules** -- Duplicating login steps across 50 tests creates a maintenance nightmare when the login flow changes.
3. **Hardcoding test data** -- Using the same email and password in every test causes conflicts in parallel execution. Use generated or parameterized data.
4. **Skipping cleanup steps** -- Tests that create data without cleanup pollute the test environment and cause cascading failures.
5. **Writing tests that depend on execution order** -- Each test should be independent. Do not rely on a previous test creating data for the next test.
6. **Ignoring test run analytics** -- testRigor provides failure trends and flaky test detection. Not reviewing these leads to a growing pile of unreliable tests.
7. **Testing implementation details** -- Checking for specific CSS classes or DOM attributes violates the plain-English philosophy. Test user-visible behavior.
8. **Not labeling tests** -- Without labels, you cannot run subsets of tests in CI. Label everything from the start.
9. **Running all tests on every commit** -- Full regression suites are slow. Run smoke tests on commits, full regression on merges or nightly.
10. **Not combining with API testing** -- UI-only testing is slow. Use testRigor's API capabilities for data validation and backend checks.
