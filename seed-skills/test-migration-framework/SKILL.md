---
name: Test Migration Framework
description: Test framework migration skill covering strategies for migrating between testing frameworks including Selenium to Playwright, Jest to Vitest, Enzyme to React Testing Library, and Protractor to Cypress with automated codemods and incremental migration patterns.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [migration, framework-migration, codemod, selenium-to-playwright, jest-to-vitest, enzyme-to-rtl, test-migration]
testingTypes: [unit, integration, e2e]
frameworks: [playwright, jest, vitest, cypress]
languages: [typescript, javascript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Test Migration Framework Skill

You are an expert software engineer specializing in test framework migrations. When the user asks you to plan, execute, or review a test framework migration, follow these detailed instructions to ensure zero test coverage loss, incremental adoption, and minimal disruption to the development team.

## Core Principles

1. **Incremental migration over big-bang rewrites** -- Migrate tests file by file or module by module, never all at once.
2. **Preserve coverage at every step** -- Run both old and new test suites in CI until migration is complete.
3. **Automate repetitive transforms** -- Use codemods and scripts for mechanical changes, save manual effort for logic updates.
4. **Validate equivalence** -- Every migrated test must verify the same behavior as the original.
5. **Maintain a migration checklist** -- Track progress per module with status (pending, in-progress, migrated, verified).
6. **Document breaking differences** -- Each framework pair has semantic differences that require manual attention.
7. **Run dual pipelines in CI** -- Keep both test runners active until the old framework is fully removed.

## Project Structure

```
project/
  src/
    components/
      Button.tsx
      Button.test.tsx          # Migrated (Vitest)
      Button.enzyme.test.tsx   # Legacy (Enzyme) -- to be removed
    services/
      api.service.ts
      api.service.test.ts      # Migrated (Vitest)
      api.service.jest.test.ts # Legacy (Jest) -- to be removed
  e2e/
    login.spec.ts              # Migrated (Playwright)
    login.selenium.spec.ts     # Legacy (Selenium) -- to be removed
  codemods/
    jest-to-vitest.ts
    enzyme-to-rtl.ts
    selenium-to-playwright.ts
  migration/
    checklist.md
    dual-runner.config.ts
  vitest.config.ts
  jest.config.ts               # Legacy -- remove after migration
  playwright.config.ts
```

## Migration Assessment Checklist

Before starting any migration, assess the current state of the test suite.

```typescript
// migration/assess.ts
interface MigrationAssessment {
  totalTests: number;
  totalFiles: number;
  frameworkUsage: Record<string, number>;
  customMatchers: string[];
  customPlugins: string[];
  mockPatterns: string[];
  ciIntegrations: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
}

async function assessTestSuite(rootDir: string): Promise<MigrationAssessment> {
  const testFiles = await glob('**/*.{test,spec}.{ts,tsx,js,jsx}', { cwd: rootDir });

  const assessment: MigrationAssessment = {
    totalTests: 0,
    totalFiles: testFiles.length,
    frameworkUsage: {},
    customMatchers: [],
    customPlugins: [],
    mockPatterns: [],
    ciIntegrations: [],
    estimatedEffort: 'low',
  };

  for (const file of testFiles) {
    const content = await fs.readFile(path.join(rootDir, file), 'utf-8');

    // Detect framework usage
    if (content.includes('from \'jest\'') || content.includes('jest.mock')) {
      assessment.frameworkUsage['jest'] = (assessment.frameworkUsage['jest'] || 0) + 1;
    }
    if (content.includes('from \'enzyme\'') || content.includes('shallow(')) {
      assessment.frameworkUsage['enzyme'] = (assessment.frameworkUsage['enzyme'] || 0) + 1;
    }
    if (content.includes('webdriver') || content.includes('selenium-webdriver')) {
      assessment.frameworkUsage['selenium'] = (assessment.frameworkUsage['selenium'] || 0) + 1;
    }

    // Detect custom matchers
    const matcherMatches = content.match(/expect\.extend\(\{([^}]+)\}\)/g);
    if (matcherMatches) {
      assessment.customMatchers.push(...matcherMatches);
    }

    // Detect mock patterns
    if (content.includes('jest.mock(')) assessment.mockPatterns.push('jest.mock');
    if (content.includes('jest.spyOn(')) assessment.mockPatterns.push('jest.spyOn');
    if (content.includes('__mocks__')) assessment.mockPatterns.push('manual-mocks');

    // Count test cases
    const testCount = (content.match(/\b(it|test)\s*\(/g) || []).length;
    assessment.totalTests += testCount;
  }

  // Estimate effort
  if (assessment.totalFiles > 200 || assessment.customMatchers.length > 10) {
    assessment.estimatedEffort = 'high';
  } else if (assessment.totalFiles > 50) {
    assessment.estimatedEffort = 'medium';
  }

  return assessment;
}
```

## Selenium to Playwright Migration

### Locator Mapping

```typescript
// codemods/selenium-to-playwright.ts
// Mapping of Selenium locator strategies to Playwright equivalents

const LOCATOR_MAPPING: Record<string, string> = {
  // Selenium -> Playwright
  'By.id("x")':          'page.locator("#x")',
  'By.className("x")':   'page.locator(".x")',
  'By.css("x")':         'page.locator("x")',
  'By.xpath("x")':       'page.locator("xpath=x")',
  'By.name("x")':        'page.locator("[name=x]")',
  'By.linkText("x")':    'page.getByRole("link", { name: "x" })',
  'By.tagName("x")':     'page.locator("x")',
};

// Before: Selenium WebDriver
async function seleniumTest(driver: WebDriver) {
  await driver.get('https://example.com/login');
  const emailInput = await driver.findElement(By.id('email'));
  await emailInput.sendKeys('user@example.com');
  const passwordInput = await driver.findElement(By.name('password'));
  await passwordInput.sendKeys('secret123');
  const submitButton = await driver.findElement(By.css('button[type="submit"]'));
  await submitButton.click();
  await driver.wait(until.elementLocated(By.css('.dashboard')), 10000);
  const welcomeText = await driver.findElement(By.className('welcome')).getText();
  expect(welcomeText).toContain('Welcome');
}

// After: Playwright
async function playwrightTest(page: Page) {
  await page.goto('https://example.com/login');
  await page.locator('#email').fill('user@example.com');
  await page.locator('[name="password"]').fill('secret123');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('.dashboard')).toBeVisible();
  await expect(page.locator('.welcome')).toContainText('Welcome');
}
```

### Wait Strategy Migration

```typescript
// Selenium explicit waits -> Playwright auto-waiting

// Before: Selenium -- manual waits everywhere
async function seleniumWaits(driver: WebDriver) {
  const wait = new WebDriverWait(driver, 10000);

  // Wait for element to be visible
  await wait.until(EC.visibilityOfElementLocated(By.css('.modal')));

  // Wait for element to be clickable
  await wait.until(EC.elementToBeClickable(By.id('submit')));
  await driver.findElement(By.id('submit')).click();

  // Wait for URL change
  await wait.until(EC.urlContains('/dashboard'));

  // Wait for text to be present
  await wait.until(EC.textToBePresentInElement(
    driver.findElement(By.css('.status')),
    'Complete'
  ));

  // Sleep (anti-pattern but common in Selenium)
  await driver.sleep(2000);
}

// After: Playwright -- auto-waiting built in
async function playwrightWaits(page: Page) {
  // Playwright auto-waits for visibility
  await expect(page.locator('.modal')).toBeVisible();

  // Playwright auto-waits for actionability before clicking
  await page.locator('#submit').click();

  // Wait for URL
  await page.waitForURL('**/dashboard');

  // Assert text content (auto-retries)
  await expect(page.locator('.status')).toHaveText('Complete');

  // No sleeps needed -- use web-first assertions instead
}
```

### Page Object Migration

```typescript
// Before: Selenium Page Object
class SeleniumLoginPage {
  private driver: WebDriver;

  constructor(driver: WebDriver) {
    this.driver = driver;
  }

  async navigate(): Promise<void> {
    await this.driver.get('https://example.com/login');
  }

  async setEmail(email: string): Promise<void> {
    const el = await this.driver.findElement(By.id('email'));
    await el.clear();
    await el.sendKeys(email);
  }

  async setPassword(password: string): Promise<void> {
    const el = await this.driver.findElement(By.id('password'));
    await el.clear();
    await el.sendKeys(password);
  }

  async clickSubmit(): Promise<void> {
    const btn = await this.driver.findElement(By.css('[type="submit"]'));
    await btn.click();
  }

  async getErrorMessage(): Promise<string> {
    const el = await this.driver.findElement(By.css('.error-message'));
    return el.getText();
  }
}

// After: Playwright Page Object
class PlaywrightLoginPage {
  constructor(private page: Page) {}

  async navigate(): Promise<void> {
    await this.page.goto('https://example.com/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.locator('#email').fill(email);
    await this.page.locator('#password').fill(password);
    await this.page.locator('[type="submit"]').click();
  }

  async expectError(message: string): Promise<void> {
    await expect(this.page.locator('.error-message')).toHaveText(message);
  }

  async expectSuccess(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }
}
```

## Jest to Vitest Migration

### Configuration Migration

```typescript
// Before: jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageThresholds: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  setupFilesAfterSetup: ['<rootDir>/jest.setup.ts'],
  clearMocks: true,
};

export default config;

// After: vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    setupFiles: ['./vitest.setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
```

### Mocking Differences

```typescript
// Jest mocking
jest.mock('./database');
jest.mock('axios');
const mockFn = jest.fn();
jest.spyOn(console, 'error').mockImplementation();
jest.useFakeTimers();
jest.advanceTimersByTime(1000);

// Vitest mocking -- vi replaces jest global
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./database');
vi.mock('axios');
const mockFn = vi.fn();
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
```

### Automated Codemod: Jest to Vitest

```typescript
// codemods/jest-to-vitest.ts
import type { API, FileInfo } from 'jscodeshift';

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Add vitest import
  const vitestImports: string[] = [];

  // Replace jest.fn() with vi.fn()
  root.find(j.CallExpression, {
    callee: { object: { name: 'jest' }, property: { name: 'fn' } },
  }).forEach((path) => {
    path.node.callee = j.memberExpression(
      j.identifier('vi'),
      j.identifier('fn')
    );
    if (!vitestImports.includes('vi')) vitestImports.push('vi');
  });

  // Replace jest.mock() with vi.mock()
  root.find(j.CallExpression, {
    callee: { object: { name: 'jest' }, property: { name: 'mock' } },
  }).forEach((path) => {
    path.node.callee = j.memberExpression(
      j.identifier('vi'),
      j.identifier('mock')
    );
    if (!vitestImports.includes('vi')) vitestImports.push('vi');
  });

  // Replace jest.spyOn() with vi.spyOn()
  root.find(j.CallExpression, {
    callee: { object: { name: 'jest' }, property: { name: 'spyOn' } },
  }).forEach((path) => {
    path.node.callee = j.memberExpression(
      j.identifier('vi'),
      j.identifier('spyOn')
    );
    if (!vitestImports.includes('vi')) vitestImports.push('vi');
  });

  // Replace jest.useFakeTimers/useRealTimers
  ['useFakeTimers', 'useRealTimers', 'advanceTimersByTime', 'runAllTimers'].forEach((method) => {
    root.find(j.CallExpression, {
      callee: { object: { name: 'jest' }, property: { name: method } },
    }).forEach((path) => {
      path.node.callee = j.memberExpression(
        j.identifier('vi'),
        j.identifier(method)
      );
      if (!vitestImports.includes('vi')) vitestImports.push('vi');
    });
  });

  // Detect usage of describe, it, expect, beforeEach, afterEach
  const globals = ['describe', 'it', 'test', 'expect', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll'];
  globals.forEach((name) => {
    const usages = root.find(j.Identifier, { name });
    if (usages.length > 0 && !vitestImports.includes(name)) {
      vitestImports.push(name);
    }
  });

  // Add import statement at the top
  if (vitestImports.length > 0) {
    const importStatement = j.importDeclaration(
      vitestImports.map((name) => j.importSpecifier(j.identifier(name))),
      j.literal('vitest')
    );
    const body = root.find(j.Program).get('body');
    body.unshift(importStatement);
  }

  return root.toSource({ quote: 'single' });
}
```

## Enzyme to React Testing Library Migration

### Philosophy Shift

```typescript
// Enzyme: Tests implementation details (component internals)
// RTL: Tests user behavior (what the user sees and does)

// Before: Enzyme -- testing implementation
import { shallow } from 'enzyme';
import { Counter } from './Counter';

describe('Counter (Enzyme)', () => {
  it('should render initial count', () => {
    const wrapper = shallow(<Counter initialCount={5} />);
    expect(wrapper.find('.count-display').text()).toBe('5');
  });

  it('should increment count on button click', () => {
    const wrapper = shallow(<Counter initialCount={0} />);
    wrapper.find('.increment-btn').simulate('click');
    expect(wrapper.state('count')).toBe(1); // Testing internal state!
  });

  it('should call onChange prop', () => {
    const onChange = jest.fn();
    const wrapper = shallow(<Counter initialCount={0} onChange={onChange} />);
    wrapper.find('.increment-btn').simulate('click');
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('should have correct CSS class when count is negative', () => {
    const wrapper = shallow(<Counter initialCount={-1} />);
    expect(wrapper.find('.count-display').hasClass('negative')).toBe(true);
  });
});

// After: React Testing Library -- testing behavior
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './Counter';

describe('Counter (RTL)', () => {
  it('should render initial count', () => {
    render(<Counter initialCount={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should increment count when user clicks increment button', async () => {
    const user = userEvent.setup();
    render(<Counter initialCount={0} />);

    await user.click(screen.getByRole('button', { name: /increment/i }));

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should call onChange when count changes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Counter initialCount={0} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /increment/i }));

    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('should display negative count with visual indicator', () => {
    render(<Counter initialCount={-1} />);
    const countDisplay = screen.getByText('-1');
    expect(countDisplay).toHaveAttribute('aria-label', expect.stringContaining('negative'));
  });
});
```

### Common Enzyme to RTL Mappings

```typescript
// Enzyme shallow() / mount() -> RTL render()
// wrapper.find('.class') -> screen.getByRole() / screen.getByText()
// wrapper.find('ComponentName') -> NO equivalent (test behavior, not components)
// wrapper.state() -> NO equivalent (test visible output instead)
// wrapper.props() -> NO equivalent (test rendered result instead)
// wrapper.simulate('click') -> userEvent.click()
// wrapper.simulate('change', { target: { value: 'x' } }) -> userEvent.type()
// wrapper.instance() -> NO equivalent (test public behavior)
// wrapper.update() -> NOT needed (RTL auto-updates)
// wrapper.setProps() -> rerender() from render() return value

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Enzyme setProps -> RTL rerender
const { rerender } = render(<MyComponent name="Alice" />);
expect(screen.getByText('Hello, Alice')).toBeInTheDocument();
rerender(<MyComponent name="Bob" />);
expect(screen.getByText('Hello, Bob')).toBeInTheDocument();

// Enzyme wrapper.find within scope -> RTL within()
const list = screen.getByRole('list');
const items = within(list).getAllByRole('listitem');
expect(items).toHaveLength(3);
```

## Incremental Migration: Dual-Runner Setup

```typescript
// migration/dual-runner.config.ts
// Run both Jest and Vitest during migration period

import { execSync } from 'child_process';

interface DualRunnerConfig {
  legacyRunner: 'jest' | 'mocha';
  newRunner: 'vitest';
  legacyPattern: string;
  newPattern: string;
  failOnLegacyFailure: boolean;
}

const config: DualRunnerConfig = {
  legacyRunner: 'jest',
  newRunner: 'vitest',
  legacyPattern: '**/*.jest.test.ts',
  newPattern: '**/*.test.ts',
  failOnLegacyFailure: true,
};

function runDualTests(): void {
  console.log('Running migrated tests (Vitest)...');
  try {
    execSync('npx vitest run --reporter=verbose', { stdio: 'inherit' });
    console.log('Vitest tests passed.');
  } catch {
    console.error('Vitest tests FAILED.');
    process.exit(1);
  }

  console.log('Running legacy tests (Jest)...');
  try {
    execSync(`npx jest --testMatch='${config.legacyPattern}' --verbose`, {
      stdio: 'inherit',
    });
    console.log('Jest legacy tests passed.');
  } catch {
    console.error('Jest legacy tests FAILED.');
    if (config.failOnLegacyFailure) {
      process.exit(1);
    }
  }

  console.log('All test suites completed.');
}

runDualTests();
```

### CI/CD Dual Pipeline

```yaml
# .github/workflows/dual-test.yml
name: Dual Test Pipeline
on: [push, pull_request]

jobs:
  migrated-tests:
    name: Vitest (Migrated)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx vitest run --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: vitest-coverage
          path: coverage/

  legacy-tests:
    name: Jest (Legacy)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx jest --testMatch='**/*.jest.test.ts' --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: jest-coverage
          path: coverage/

  coverage-comparison:
    name: Compare Coverage
    needs: [migrated-tests, legacy-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - run: |
          echo "Compare coverage reports to ensure no regression"
          node scripts/compare-coverage.js
```

## Coverage Preservation

```typescript
// scripts/compare-coverage.ts
import fs from 'fs';

interface CoverageSummary {
  lines: { pct: number };
  statements: { pct: number };
  functions: { pct: number };
  branches: { pct: number };
}

function compareCoverage(
  legacyPath: string,
  migratedPath: string,
  tolerancePct: number = 2
): boolean {
  const legacy: CoverageSummary = JSON.parse(
    fs.readFileSync(legacyPath, 'utf-8')
  ).total;
  const migrated: CoverageSummary = JSON.parse(
    fs.readFileSync(migratedPath, 'utf-8')
  ).total;

  const metrics = ['lines', 'statements', 'functions', 'branches'] as const;
  let passed = true;

  for (const metric of metrics) {
    const diff = legacy[metric].pct - migrated[metric].pct;
    if (diff > tolerancePct) {
      console.error(
        `Coverage regression in ${metric}: ` +
        `legacy=${legacy[metric].pct}%, migrated=${migrated[metric].pct}% ` +
        `(diff=${diff.toFixed(1)}%, tolerance=${tolerancePct}%)`
      );
      passed = false;
    } else {
      console.log(
        `${metric}: legacy=${legacy[metric].pct}%, migrated=${migrated[metric].pct}% -- OK`
      );
    }
  }

  return passed;
}

const success = compareCoverage(
  'jest-coverage/coverage-summary.json',
  'vitest-coverage/coverage-summary.json'
);

if (!success) {
  process.exit(1);
}
```

## Protractor to Cypress/Playwright Migration

```typescript
// Before: Protractor
describe('Login Page (Protractor)', () => {
  beforeEach(() => {
    browser.get('/login');
  });

  it('should log in successfully', () => {
    element(by.model('user.email')).sendKeys('admin@example.com');
    element(by.model('user.password')).sendKeys('password');
    element(by.buttonText('Sign In')).click();
    expect(browser.getCurrentUrl()).toContain('/dashboard');
    expect(element(by.css('.user-name')).getText()).toEqual('Admin');
  });

  it('should show error for invalid credentials', () => {
    element(by.model('user.email')).sendKeys('wrong@example.com');
    element(by.model('user.password')).sendKeys('wrong');
    element(by.buttonText('Sign In')).click();
    expect(element(by.css('.error-alert')).isDisplayed()).toBe(true);
    expect(element(by.css('.error-alert')).getText()).toContain('Invalid credentials');
  });
});

// After: Playwright
import { test, expect } from '@playwright/test';

test.describe('Login Page (Playwright)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should log in successfully', async ({ page }) => {
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('.user-name')).toHaveText('Admin');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.locator('.error-alert')).toBeVisible();
    await expect(page.locator('.error-alert')).toContainText('Invalid credentials');
  });
});

// After: Cypress
describe('Login Page (Cypress)', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should log in successfully', () => {
    cy.findByLabelText('Email').type('admin@example.com');
    cy.findByLabelText('Password').type('password');
    cy.findByRole('button', { name: 'Sign In' }).click();
    cy.url().should('include', '/dashboard');
    cy.get('.user-name').should('have.text', 'Admin');
  });

  it('should show error for invalid credentials', () => {
    cy.findByLabelText('Email').type('wrong@example.com');
    cy.findByLabelText('Password').type('wrong');
    cy.findByRole('button', { name: 'Sign In' }).click();
    cy.get('.error-alert').should('be.visible');
    cy.get('.error-alert').should('contain.text', 'Invalid credentials');
  });
});
```

## Best Practices

1. **Start with the assessment** -- Inventory all tests, custom matchers, plugins, and CI integrations before writing any code.
2. **Migrate tests alongside feature work** -- When touching a file for a feature, migrate its tests at the same time.
3. **Use codemods for mechanical changes** -- Automate `jest.fn()` to `vi.fn()`, `shallow()` to `render()`, etc.
4. **Keep both test runners in CI** -- Never remove the old runner until all tests are migrated and verified.
5. **Migrate custom matchers first** -- They block other test migrations, so port them to the new framework early.
6. **Track migration progress visibly** -- Use a checklist or dashboard showing migration status per module.
7. **Pair program on the first few files** -- Establish patterns before the team migrates independently.
8. **Write a migration guide for your team** -- Document the specific patterns, gotchas, and conventions for your codebase.
9. **Preserve test descriptions** -- Keep the same `describe` and `it` labels so test reports remain recognizable.
10. **Delete legacy files promptly** -- Once a migrated file is verified, remove the old version to avoid confusion.

## Anti-Patterns to Avoid

1. **Big-bang migration** -- Rewriting all tests at once leads to regressions, merge conflicts, and team confusion.
2. **Losing coverage silently** -- Failing to compare coverage before and after migration hides regressions.
3. **Manual find-and-replace** -- Using editor search-replace instead of codemods leads to inconsistent results.
4. **Migrating without understanding differences** -- Each framework pair has semantic differences that require manual review.
5. **Keeping both frameworks permanently** -- Dual runners are a transition tool, not a permanent solution.
6. **Ignoring CI pipeline updates** -- Forgetting to update CI config for the new runner means tests never actually run.
7. **Migrating test helpers last** -- Shared utilities and custom matchers should be migrated first since other tests depend on them.
8. **Not updating documentation** -- README files and onboarding guides must reflect the new framework.
9. **Copying anti-patterns forward** -- Migration is an opportunity to fix bad tests, not just translate them.
10. **Skipping flaky test investigation** -- If a test was flaky in the old framework, understand why before migrating it.

## Running Migration Tools

```bash
# Run the assessment tool
npx tsx migration/assess.ts

# Run Jest-to-Vitest codemod on a specific directory
npx jscodeshift -t codemods/jest-to-vitest.ts src/services/ --extensions=ts,tsx --parser=tsx

# Run dual test suites
npx tsx migration/dual-runner.config.ts

# Run only migrated Vitest tests
npx vitest run

# Run only legacy Jest tests
npx jest --testMatch='**/*.jest.test.ts'

# Compare coverage between runners
npx tsx scripts/compare-coverage.ts

# Dry run codemod (no file changes)
npx jscodeshift -t codemods/jest-to-vitest.ts src/ --dry --print

# Verify no Selenium imports remain
grep -r "selenium-webdriver" src/ --include="*.ts" | grep -v ".selenium."
```
