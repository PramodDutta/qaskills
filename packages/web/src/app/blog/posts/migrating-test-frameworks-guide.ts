import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Migrating Between Test Frameworks: Complete Strategy Guide',
  description:
    'A practical guide to migrating between test frameworks. Covers Selenium to Playwright, Jest to Vitest, Enzyme to RTL, Protractor to Cypress with dual-runner strategies and coverage preservation.',
  date: '2026-03-24',
  category: 'Guide',
  content: `
## Why Teams Migrate Test Frameworks

Test framework migrations are among the most impactful technical decisions a team can make. They are also among the most disruptive. A migration done well gives your team faster tests, better developer experience, and a more maintainable test suite. A migration done poorly creates months of instability, flaky tests, and lost coverage.

Teams typically migrate for concrete reasons: the current framework is no longer maintained, a newer alternative offers significantly better performance, the developer experience gap is too large to ignore, or the ecosystem has shifted and tooling support is drying up. Whatever the reason, the migration needs a plan.

This guide covers the most common test framework migrations in the JavaScript and web ecosystem, providing practical strategies that minimize risk and preserve the test coverage you have already built.

## The Dual-Runner Strategy

The single most important concept in any test migration is the dual-runner strategy. Instead of a big-bang rewrite where you stop all feature work to convert every test file at once, you run both the old and new frameworks simultaneously.

### How It Works

1. Install the new framework alongside the existing one
2. Configure both to run in your CI pipeline
3. Write all new tests in the new framework
4. Convert existing tests incrementally, starting with the simplest files
5. Track progress with a migration dashboard or simple line count
6. Remove the old framework only after all tests have been converted

### CI Configuration

Your CI pipeline runs both test suites and gates on both:

\`\`\`yaml
# GitHub Actions example
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      # Run legacy tests
      - name: Run Jest tests
        run: npx jest --ci --coverage

      # Run new tests
      - name: Run Vitest tests
        run: npx vitest run --coverage

      # Merge coverage reports
      - name: Merge coverage
        run: npx istanbul-merge --out coverage/merged.json coverage/jest/coverage-final.json coverage/vitest/coverage-final.json
\`\`\`

### Progress Tracking

Track your migration progress by counting test files:

\`\`\`bash
# Simple progress check
echo "Jest tests remaining: \$(find src -name '*.test.js' | wc -l)"
echo "Vitest tests completed: \$(find src -name '*.test.ts' | wc -l)"
\`\`\`

Or build a simple script that reports migration status:

\`\`\`javascript
const glob = require('fast-glob');

async function migrationStatus() {
  const jestTests = await glob('src/**/*.test.{js,jsx}');
  const vitestTests = await glob('src/**/*.test.{ts,tsx}');
  const total = jestTests.length + vitestTests.length;

  console.log('Migration Progress:');
  console.log('  Legacy (Jest):', jestTests.length);
  console.log('  Migrated (Vitest):', vitestTests.length);
  console.log('  Progress:', Math.round((vitestTests.length / total) * 100) + '%');
}

migrationStatus();
\`\`\`

## Migration 1: Selenium to Playwright

This is one of the most common migrations in 2026, driven by Playwright's superior speed, auto-waiting, and modern API.

### Key Differences

Selenium uses explicit waits and a WebDriver protocol that communicates over HTTP. Playwright uses the Chrome DevTools Protocol (CDP) and similar protocols for Firefox and WebKit, which are faster and more reliable. Playwright also auto-waits for elements to be actionable before interacting with them, eliminating most of the explicit wait code that clutters Selenium tests.

### Locator Strategy Migration

Selenium tests often rely on XPath or CSS selectors. Playwright encourages user-facing locators:

\`\`\`javascript
// Selenium
const element = await driver.findElement(By.xpath('//button[@class="submit-btn"]'));
await element.click();

// Playwright
await page.getByRole('button', { name: 'Submit' }).click();
\`\`\`

### Common Patterns

**Page waits:**

\`\`\`javascript
// Selenium - explicit wait
const wait = new WebDriverWait(driver, 10);
await wait.until(EC.visibilityOfElementLocated(By.id('results')));

// Playwright - auto-waits, no explicit wait needed
await page.locator('#results').waitFor();
\`\`\`

**Form interactions:**

\`\`\`javascript
// Selenium
await driver.findElement(By.name('email')).sendKeys('user@test.com');
await driver.findElement(By.name('password')).sendKeys('password123');
await driver.findElement(By.css('button[type="submit"]')).click();

// Playwright
await page.getByLabel('Email').fill('user@test.com');
await page.getByLabel('Password').fill('password123');
await page.getByRole('button', { name: 'Log in' }).click();
\`\`\`

**Assertions:**

\`\`\`javascript
// Selenium
const text = await driver.findElement(By.css('.welcome')).getText();
assert.equal(text, 'Welcome back!');

// Playwright
await expect(page.locator('.welcome')).toHaveText('Welcome back!');
\`\`\`

### Migration Steps

1. Install Playwright: \`npm init playwright@latest\`
2. Keep Selenium tests running in CI
3. Convert page objects first since they encapsulate locator logic
4. Convert test files that use the converted page objects
5. Replace WebDriver setup/teardown with Playwright fixtures
6. Remove Selenium dependencies after all tests pass

### Handling WebDriver-Specific Code

Some Selenium tests use capabilities specific to WebDriver, such as browser profiles, proxy configuration, or extensions. Playwright handles these differently:

\`\`\`javascript
// Selenium - browser profile
const options = new ChromeOptions();
options.addArguments('--user-data-dir=/tmp/profile');

// Playwright - persistent context
const context = await browser.launchPersistentContext('/tmp/profile', {
  headless: true,
});
\`\`\`

## Migration 2: Jest to Vitest

Vitest is designed as a drop-in replacement for Jest in Vite-based projects, but the migration is smooth even for non-Vite projects.

### Why Migrate

Vitest offers significantly faster execution through native ESM support and Vite's transform pipeline. It provides a Jest-compatible API, meaning most test files work with minimal changes. The developer experience is better with instant HMR-powered watch mode and a browser-based UI.

### Configuration Changes

**Jest configuration (jest.config.js):**

\`\`\`javascript
module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\\\.(ts|tsx)\$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)': '<rootDir>/src/\$1',
  },
  setupFilesAfterSetup: ['./src/test-setup.ts'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
\`\`\`

**Vitest configuration (vitest.config.ts):**

\`\`\`typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
\`\`\`

### Import Changes

The main code change is updating imports:

\`\`\`typescript
// Jest - globals are implicit
describe('MyComponent', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});

// Vitest - explicit imports (or use globals: true in config)
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
\`\`\`

With \`globals: true\` in Vitest config, you can skip the import changes entirely.

### Mock Migration

Jest mocking translates directly to Vitest:

\`\`\`typescript
// Jest
jest.mock('./api-client');
jest.spyOn(console, 'error').mockImplementation();
jest.useFakeTimers();

// Vitest
vi.mock('./api-client');
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.useFakeTimers();
\`\`\`

### Automated Codemod

For large codebases, use a codemod to automate the transformation:

\`\`\`bash
npx codemod jest-to-vitest
\`\`\`

This handles the most common transformations: replacing \`jest.\` with \`vi.\`, updating configuration files, and adjusting imports. Review the changes manually since codemods are not perfect.

### Migration Steps

1. Install Vitest: \`npm install -D vitest @vitest/coverage-v8\`
2. Create \`vitest.config.ts\` mirroring your Jest config
3. Set \`globals: true\` to minimize code changes
4. Convert one test directory at a time
5. Run both Jest and Vitest in CI
6. Use the codemod for bulk conversion of remaining files
7. Remove Jest after all tests are migrated

## Migration 3: Enzyme to React Testing Library

Enzyme was deprecated after the React team stopped supporting it beyond React 17. If your codebase still uses Enzyme, migrating to React Testing Library (RTL) is essential.

### Philosophy Shift

This migration requires a mindset change, not just a syntax change. Enzyme tests often test implementation details: internal state, instance methods, and component structure. RTL tests focus on user behavior: what the user sees, clicks, and types.

**Enzyme approach (implementation testing):**

\`\`\`javascript
const wrapper = shallow(<Counter />);
expect(wrapper.state('count')).toBe(0);
wrapper.instance().increment();
expect(wrapper.state('count')).toBe(1);
\`\`\`

**RTL approach (behavior testing):**

\`\`\`javascript
render(<Counter />);
expect(screen.getByText('Count: 0')).toBeInTheDocument();
await userEvent.click(screen.getByRole('button', { name: 'Increment' }));
expect(screen.getByText('Count: 1')).toBeInTheDocument();
\`\`\`

### Common Conversions

**Shallow rendering to full rendering:**

\`\`\`javascript
// Enzyme
const wrapper = shallow(<App />);
expect(wrapper.find('Header')).toHaveLength(1);

// RTL - renders the full tree, query by output
render(<App />);
expect(screen.getByRole('banner')).toBeInTheDocument();
\`\`\`

**Finding elements:**

\`\`\`javascript
// Enzyme
wrapper.find('.submit-button');
wrapper.find('Button');
wrapper.find('[data-testid="submit"]');

// RTL - prefer accessible queries
screen.getByRole('button', { name: 'Submit' });
screen.getByText('Submit');
screen.getByTestId('submit'); // last resort
\`\`\`

**Simulating events:**

\`\`\`javascript
// Enzyme
wrapper.find('button').simulate('click');
wrapper.find('input').simulate('change', { target: { value: 'hello' } });

// RTL with user-event
await userEvent.click(screen.getByRole('button'));
await userEvent.type(screen.getByRole('textbox'), 'hello');
\`\`\`

**Checking rendered output:**

\`\`\`javascript
// Enzyme
expect(wrapper.find('.message').text()).toBe('Hello World');
expect(wrapper.find('.alert').hasClass('alert-danger')).toBe(true);

// RTL
expect(screen.getByText('Hello World')).toBeInTheDocument();
expect(screen.getByRole('alert')).toHaveClass('alert-danger');
\`\`\`

### What to Do With Untestable Patterns

Some Enzyme tests access internal component details that RTL intentionally does not expose. When you encounter these:

- **Testing state directly**: Replace with assertions on the rendered output that state changes produce
- **Testing instance methods**: Call the user action that triggers the method and assert the visible result
- **Testing lifecycle methods**: Verify the effects of lifecycle methods through rendered output or side effects
- **Testing prop callbacks**: Render with mock callbacks and trigger the user action that calls them

### Migration Steps

1. Install RTL: \`npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event\`
2. Add \`@testing-library/jest-dom\` to your test setup
3. Convert tests file by file, starting with leaf components
4. Rewrite tests to focus on behavior, not implementation
5. Remove Enzyme after all tests are converted

## Migration 4: Protractor to Cypress

Protractor was deprecated by the Angular team in 2022. Teams still running Protractor tests need to migrate to a maintained E2E framework, with Cypress being the most common target for Angular projects.

### Key Differences

Protractor was built specifically for Angular and understood Angular's change detection. Cypress is framework-agnostic and uses a different execution model: tests run inside the browser, not outside it.

### Locator Migration

\`\`\`javascript
// Protractor
element(by.css('.submit-btn')).click();
element(by.model('user.name')).sendKeys('Alice');
element(by.binding('user.email')).getText();
element(by.repeater('item in items')).count();

// Cypress
cy.get('.submit-btn').click();
cy.get('[ng-model="user.name"]').type('Alice');
cy.contains(user.email);
cy.get('[ng-repeat="item in items"]').should('have.length.greaterThan', 0);
\`\`\`

### Async Handling

Protractor used explicit promises and async/await. Cypress chains commands automatically:

\`\`\`javascript
// Protractor
const title = await element(by.css('h1')).getText();
expect(title).toBe('Dashboard');
await element(by.css('.new-project')).click();
await browser.wait(EC.urlContains('/projects/new'), 5000);

// Cypress
cy.get('h1').should('have.text', 'Dashboard');
cy.get('.new-project').click();
cy.url().should('include', '/projects/new');
\`\`\`

### Page Object Conversion

\`\`\`javascript
// Protractor page object
class LoginPage {
  get emailInput() { return element(by.css('#email')); }
  get passwordInput() { return element(by.css('#password')); }
  get submitButton() { return element(by.css('button[type="submit"]')); }

  async login(email, password) {
    await this.emailInput.sendKeys(email);
    await this.passwordInput.sendKeys(password);
    await this.submitButton.click();
  }
}

// Cypress page object (or custom commands)
class LoginPage {
  visit() { cy.visit('/login'); return this; }
  typeEmail(email) { cy.get('#email').type(email); return this; }
  typePassword(pwd) { cy.get('#password').type(pwd); return this; }
  submit() { cy.get('button[type="submit"]').click(); return this; }

  login(email, password) {
    return this.visit().typeEmail(email).typePassword(password).submit();
  }
}

// Or as Cypress custom commands (more idiomatic)
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('#email').type(email);
  cy.get('#password').type(password);
  cy.get('button[type="submit"]').click();
});
\`\`\`

### Angular-Specific Considerations

Protractor had built-in Angular synchronization. Cypress does not, but you rarely need it because Cypress automatically waits for DOM updates. For cases where Angular zone.js async operations cause issues:

\`\`\`javascript
// Wait for Angular to stabilize (rarely needed)
cy.window().its('getAllAngularTestabilities').then((testabilities) => {
  // Custom wait logic if needed
});

// Usually, Cypress's built-in retry and wait is sufficient
cy.get('.data-table').should('contain', 'Expected Data');
\`\`\`

### Migration Steps

1. Install Cypress: \`npm install -D cypress\`
2. Run \`npx cypress open\` to scaffold the project
3. Configure the base URL to point to your Angular dev server
4. Convert page objects to Cypress custom commands
5. Convert spec files, replacing Protractor APIs with Cypress equivalents
6. Run both Protractor and Cypress in CI
7. Remove Protractor after all tests pass

## Coverage Preservation

The biggest risk in any migration is losing test coverage. Here is how to prevent it.

### Measure Before You Start

Before converting a single test, record your current coverage numbers:

\`\`\`bash
npx jest --coverage --coverageReporters=json-summary
\`\`\`

Save the summary as your coverage baseline. After each batch of migrations, compare the new coverage against this baseline.

### Track Coverage Per File

Generate a per-file coverage report and use it as a checklist:

\`\`\`bash
npx jest --coverage --coverageReporters=json > coverage-baseline.json
\`\`\`

After migrating tests for a source file, verify that the new tests achieve equal or better coverage for that file.

### Merge Coverage Reports

When running dual frameworks, merge their coverage reports:

\`\`\`bash
# Generate LCOV reports from both frameworks
npx jest --coverage --coverageReporters=lcov --coverageDirectory=coverage/jest
npx vitest run --coverage --reporter=lcov --outputFile=coverage/vitest/lcov.info

# Merge with lcov-result-merger
npx lcov-result-merger 'coverage/**/lcov.info' coverage/merged.info
\`\`\`

### Set Coverage Gates

Add a CI check that fails if merged coverage drops below the baseline:

\`\`\`yaml
- name: Check coverage threshold
  run: |
    COVERAGE=\$(npx coverage-summary merged.json | grep 'Lines' | awk '{print \$NF}')
    if (( \$(echo "\$COVERAGE < 80" | bc -l) )); then
      echo "Coverage dropped below 80%!"
      exit 1
    fi
\`\`\`

## Team Training

A framework migration is as much a people challenge as a technical one.

### Lunch-and-Learn Sessions

Run short sessions showing the new framework's syntax and philosophy. Focus on practical examples from your own codebase, not abstract tutorials.

### Pairing Sessions

Have early adopters pair with team members on their first few conversions. This transfers knowledge faster than documentation.

### Style Guide

Create a testing style guide for the new framework that codifies your team's conventions:

- How to name test files and test cases
- Which query methods to prefer (for RTL migrations)
- How to structure test data and fixtures
- When to use mocks versus real implementations
- How to handle async operations

### Migration Champion

Designate one or two team members as migration champions. They answer questions, review converted tests, and track progress. Having a point person prevents the migration from stalling.

## Common Pitfalls

### Trying to Convert Everything at Once

The big-bang approach almost always fails for large test suites. It takes too long, blocks feature work, and introduces too many changes at once. Use the dual-runner strategy and convert incrementally.

### Literal Translation Without Improvement

Migration is an opportunity to improve your tests, not just translate them syntactically. If a Selenium test has a flaky wait, do not copy the flakiness into Playwright. Fix it during migration.

### Ignoring Flaky Tests

Some teams discover that many of their old tests were flaky and passing by luck. The new framework may expose these issues. Do not blame the new framework. Fix the underlying test problems.

### Forgetting to Update Documentation

Update your contributing guides, onboarding docs, and CI configuration to reference the new framework. Nothing confuses new team members more than outdated testing documentation.

### Not Setting a Deadline

Without a deadline, migrations drag on indefinitely. Set a target date for removing the old framework and hold the team accountable. A reasonable timeline is 1 to 3 months for most migrations.

## Conclusion

Test framework migrations are significant undertakings, but they are manageable with the right strategy. The dual-runner approach lets you migrate incrementally without disrupting feature development. Coverage tracking ensures you do not lose the testing investment you have already made. And team training ensures everyone can contribute to the migration effort.

Whether you are moving from Selenium to Playwright, Jest to Vitest, Enzyme to React Testing Library, or Protractor to Cypress, the principles are the same: plan carefully, execute incrementally, measure coverage, and improve your tests along the way. The result is a faster, more maintainable test suite that your team actually enjoys working with.
`,
};
