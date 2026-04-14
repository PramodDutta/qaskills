---
name: Cursor AI Testing Patterns
description: Effective test automation patterns with Cursor AI IDE including Composer for test suite generation, Cmd+K for inline test edits, Chat for test debugging, codebase-aware test generation, and rules configuration for testing conventions.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [cursor, cursor-ai, ai-ide, composer, test-generation, inline-editing, chat-debugging, codebase-aware, rules-for-ai, testing-patterns]
testingTypes: [unit, integration, e2e, api]
frameworks: [vitest, jest, playwright, cypress, pytest]
languages: [typescript, javascript, python]
domains: [web, backend, api, frontend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Cursor AI Testing Patterns Skill

You are an expert in using Cursor AI IDE for test automation. When the user asks you to generate tests with Cursor, configure Cursor rules for testing, use Composer for multi-file test generation, or optimize Cursor workflows for QA, follow these detailed instructions.

## Core Principles

1. **Codebase-aware generation** -- Cursor indexes your entire codebase. Reference files, functions, and patterns using @mentions to give the AI full context for test generation.
2. **Rules for consistent quality** -- Configure .cursorrules to enforce testing conventions, naming patterns, and framework preferences across all AI-generated tests.
3. **Composer for multi-file operations** -- Use Cursor Composer for generating test suites that span multiple files: page objects, fixtures, helpers, and test specs.
4. **Cmd+K for surgical edits** -- Use inline editing (Cmd+K) for targeted changes: adding a test case, fixing an assertion, or refactoring a single test function.
5. **Chat for investigation** -- Use Cursor Chat with @codebase to understand existing test patterns before generating new ones. Ask it to explain failures.
6. **Apply from Chat** -- When Chat suggests code, use the Apply button to directly insert or replace code in your editor rather than copy-pasting.
7. **Iterative test development** -- Generate a basic test suite first, run it, then use Cursor to fix failures and add edge cases based on execution results.

## Project Structure

```
project/
  .cursorrules                 # Testing conventions
  .cursor/
    rules/
      testing.mdc              # Testing-specific rules
  src/
    services/
      user-service.ts
      user-service.test.ts
    components/
      LoginForm.tsx
      LoginForm.test.tsx
  tests/
    e2e/
      login.spec.ts
      checkout.spec.ts
    fixtures/
      test-data.ts
    helpers/
      test-utils.ts
```

## Cursor Rules for Testing

```markdown
<!-- .cursorrules -->
# Testing Rules

## Test Framework
- Use vitest for all unit and integration tests
- Use Playwright for E2E tests
- TypeScript strict mode in all test files

## Test Conventions
- Follow Arrange-Act-Assert (AAA) pattern
- Name tests: "should [expected behavior] when [condition]"
- Group related tests in describe blocks
- One assertion focus per test (multiple asserts allowed if testing same behavior)
- Always include edge cases: null, undefined, empty values, boundary conditions
- Always include error/failure test cases

## Mocking
- Use vi.mock() for module mocking
- Use vi.fn() for function mocking
- Use vi.spyOn() for spying on existing methods
- Reset mocks in beforeEach with vi.clearAllMocks()
- Never mock the module under test

## Assertions
- Prefer specific assertions: toBe, toEqual, toContain over toBeTruthy
- Use toThrow for error testing
- Use resolves/rejects for async assertions
- Include meaningful error messages in assertions

## File Organization
- Colocate tests with source files: foo.ts -> foo.test.ts
- E2E tests in tests/e2e/
- Shared test utilities in tests/helpers/
- Test fixtures in tests/fixtures/

## Do Not
- Use any type in test files
- Use setTimeout for async waiting
- Write tests that depend on execution order
- Hard-code API URLs or credentials
- Skip tests without a TODO comment explaining why
```

## Composer Workflows for Test Generation

```typescript
// Workflow 1: Generate comprehensive test suite with Composer
// Prompt: "Generate a complete test suite for @user-service.ts with vitest.
// Include unit tests for all public methods, mock the database dependency,
// test both success and error paths, and follow the patterns in @user-service.test.ts"

// Result: Cursor generates the full test file considering both files

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserService } from './user-service';

// Cursor reads the actual implementation to create accurate mocks
vi.mock('../db/connection', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from '../db/connection';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    vi.clearAllMocks();
  });

  // Cursor generates tests for each public method found in the source

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', name: 'Alice', email: 'alice@test.com' };
      vi.mocked(db.select).mockResolvedValueOnce([mockUser]);

      const result = await service.findById('1');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      vi.mocked(db.select).mockResolvedValueOnce([]);

      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw when database error occurs', async () => {
      vi.mocked(db.select).mockRejectedValueOnce(new Error('DB connection failed'));

      await expect(service.findById('1')).rejects.toThrow('DB connection failed');
    });
  });

  // ... Cursor continues for all public methods
});
```

## Cmd+K Inline Editing Patterns

```typescript
// Pattern 1: Add a test case inline
// Select empty space inside describe block, press Cmd+K
// Prompt: "Add a test case that verifies createUser rejects duplicate emails"

// Cursor generates and inserts:
it('should reject duplicate emails', async () => {
  vi.mocked(db.insert).mockRejectedValueOnce(
    new Error('UNIQUE constraint failed: users.email')
  );

  await expect(
    service.createUser({ name: 'Bob', email: 'existing@test.com' })
  ).rejects.toThrow('Email already exists');
});

// Pattern 2: Strengthen an assertion
// Select a weak assertion, press Cmd+K
// Prompt: "Make this assertion more specific"

// Before:
expect(result).toBeTruthy();

// After:
expect(result).toEqual({
  id: expect.any(String),
  name: 'Alice',
  email: 'alice@test.com',
  createdAt: expect.any(Date),
});

// Pattern 3: Convert test to parameterized
// Select a test, press Cmd+K
// Prompt: "Convert to parameterized test using it.each"

// Before:
it('should validate email format', () => {
  expect(validateEmail('bad')).toBe(false);
});

// After:
it.each([
  ['bad', false],
  ['also-bad', false],
  ['missing@domain', false],
  ['valid@test.com', true],
  ['user+tag@test.com', true],
])('should validate "%s" as %s', (email, expected) => {
  expect(validateEmail(email)).toBe(expected);
});
```

## Chat Debugging Patterns

```typescript
// Use Cursor Chat to debug test failures

// Prompt: "This test is failing with 'TypeError: Cannot read properties of undefined'.
// @user-service.ts @user-service.test.ts
// The findById method works in the app but the mock is not being applied.
// Help me fix the mock setup."

// Cursor analyzes both files and identifies the issue:
// "The mock is not being hoisted correctly. vi.mock() calls are hoisted
// to the top of the file, but the mock factory is using variables that
// aren't defined yet. Move the mock return values to inside the factory
// function or use vi.mocked() in beforeEach."

// Prompt: "Generate missing test cases for @user-service.ts
// by analyzing code coverage gaps. Focus on untested branches."

// Cursor reads the source and identifies untested code paths:
// "I found these untested branches:
// 1. Line 45: else branch when user.role is 'admin'
// 2. Line 67: catch block for validation errors
// 3. Line 89: early return when input.email is empty
// Here are tests for each..."
```

## Multi-File Generation with Composer

```typescript
// Prompt for Composer:
// "Create a complete E2E test setup for the checkout flow:
// 1. Page objects for CartPage, CheckoutPage, ConfirmationPage
// 2. Test fixtures for test products and users
// 3. E2E test spec covering add-to-cart, checkout, and confirmation
// Follow patterns in @tests/e2e/ and @tests/fixtures/
// Use Playwright with TypeScript"

// Cursor generates multiple files:

// tests/e2e/pages/cart.page.ts
import { Page, Locator } from '@playwright/test';

export class CartPage {
  private readonly cartItems: Locator;
  private readonly checkoutButton: Locator;
  private readonly totalPrice: Locator;

  constructor(private page: Page) {
    this.cartItems = page.getByTestId('cart-item');
    this.checkoutButton = page.getByRole('button', { name: 'Checkout' });
    this.totalPrice = page.getByTestId('total-price');
  }

  async getItemCount(): Promise<number> {
    return this.cartItems.count();
  }

  async getTotalPrice(): Promise<string> {
    return this.totalPrice.textContent() || '';
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
  }
}

// tests/e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';
import { CartPage } from './pages/cart.page';

test.describe('Checkout Flow', () => {
  test('complete purchase flow', async ({ page }) => {
    // Navigate to product
    await page.goto('/products/wireless-headphones');

    // Add to cart
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await expect(page.getByText('Added to cart')).toBeVisible();

    // Go to cart
    const cartPage = new CartPage(page);
    await page.goto('/cart');
    expect(await cartPage.getItemCount()).toBe(1);

    // Proceed to checkout
    await cartPage.proceedToCheckout();
    await expect(page).toHaveURL(/\/checkout/);
  });
});
```

## Cursor Rules File for Testing (.cursor/rules/testing.mdc)

```markdown
---
description: Testing rules for AI-generated test code
globs: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"]
---

# Test Generation Rules

## Framework
- Use vitest for unit/integration tests
- Use Playwright for E2E tests
- TypeScript strict mode required

## Structure
- Colocate test files with source: foo.ts -> foo.test.ts
- E2E tests go in tests/e2e/
- Use describe blocks grouped by function/method name
- Use nested describes for sub-scenarios

## Naming
- Test names: "should [expected behavior] when [condition]"
- Describe blocks: function or class name being tested
- Test file names: match source file with .test.ts suffix

## Assertions
- Use toBe for primitives
- Use toEqual for objects/arrays
- Use toContain for array membership
- Use toThrow for error testing
- Use toHaveBeenCalledWith for mock verification
- Never use toBeTruthy for non-boolean values

## Mocking
- vi.mock() at top of file for module mocks
- vi.fn() for individual function mocks
- vi.spyOn() for partial mocking
- Always verify mocks were called correctly
- Clear mocks in beforeEach: vi.clearAllMocks()

## Coverage Requirements
- Functions: 80% minimum
- Branches: 75% minimum
- Lines: 80% minimum

## Anti-Patterns to Avoid
- No any types
- No setTimeout/sleep for waiting
- No console.log in tests (use debug mode)
- No shared mutable state between tests
- No tests that depend on execution order
```

## Advanced Composer Patterns

### Pattern: Generate Test Suite from OpenAPI Spec

```typescript
// Prompt for Composer:
// "I have an OpenAPI spec at @openapi.yaml. Generate a complete API test suite
// that tests every endpoint defined in the spec. Include:
// 1. Success path tests for each endpoint
// 2. Validation error tests for required fields
// 3. Authentication tests (missing token, expired token)
// 4. Not found tests for invalid IDs
// Follow patterns in @tests/api/existing-api.test.ts"

// Cursor reads the OpenAPI spec and generates targeted tests for each endpoint
import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
let authToken: string;

beforeAll(async () => {
  const response = await fetch(\`\${BASE_URL}/auth/login\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: 'test123' }),
  });
  const data = await response.json();
  authToken = data.token;
});

describe('GET /api/users', () => {
  it('should return paginated user list', async () => {
    const response = await fetch(\`\${BASE_URL}/api/users?page=1&limit=10\`, {
      headers: { Authorization: \`Bearer \${authToken}\` },
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.users).toBeInstanceOf(Array);
    expect(data.total).toBeGreaterThanOrEqual(0);
  });

  it('should return 401 without auth token', async () => {
    const response = await fetch(\`\${BASE_URL}/api/users\`);
    expect(response.status).toBe(401);
  });
});

describe('POST /api/users', () => {
  it('should create user with valid data', async () => {
    const response = await fetch(\`\${BASE_URL}/api/users\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: \`Bearer \${authToken}\`,
      },
      body: JSON.stringify({
        name: 'Test User',
        email: \`test-\${Date.now()}@test.com\`,
        role: 'user',
      }),
    });
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id).toBeDefined();
  });

  it('should return 400 for missing required fields', async () => {
    const response = await fetch(\`\${BASE_URL}/api/users\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: \`Bearer \${authToken}\`,
      },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
  });
});
```

### Pattern: Migrate Tests Between Frameworks

```typescript
// Prompt for Composer:
// "@tests/jest/ contains Jest tests. Migrate them to vitest:
// 1. Replace jest.fn() with vi.fn()
// 2. Replace jest.mock() with vi.mock()
// 3. Replace jest.spyOn() with vi.spyOn()
// 4. Update imports from @jest/globals to vitest
// 5. Keep all test logic identical
// 6. Generate a migration report"

// Cursor processes each file and generates the migrated version
// maintaining exact test logic while updating framework-specific APIs
```

## Cursor Agent Mode for Test Debugging

When a test fails, use Cursor's Agent mode to debug systematically. Provide the error output and ask the agent to analyze the failure, identify the root cause, and suggest a fix.

Effective debugging prompts include:

"This test is failing with the following error. Read the test file and the source file it tests. Identify why the mock is not being applied correctly."

"The E2E test passes locally but fails in CI. The error is a timeout on the login button click. What could cause this difference and how should I fix it?"

"I have 5 flaky tests that fail intermittently. Here are the test names and their recent pass/fail history. Analyze the tests and suggest what is causing the flakiness."

"This API test returns 500 instead of the expected 200. Read the API route handler and the test to identify the mismatch."

## Best Practices

1. **Use @mentions for precise context** -- Reference specific files with @filename.ts to give Cursor exact context for test generation.
2. **Configure .cursorrules for your testing conventions** -- Set framework preferences, naming patterns, and quality standards in rules files.
3. **Use Composer for multi-file test generation** -- When tests span page objects, fixtures, and specs, Composer generates them as a coherent set.
4. **Use Cmd+K for targeted edits** -- Adding one test case, fixing one assertion, or refactoring one function is faster with inline editing.
5. **Ask Chat to explain before generating** -- Before generating tests, ask Cursor Chat to explain the existing test patterns in your codebase.
6. **Iterate: generate, run, fix, expand** -- Generate a basic suite, run it, use Cursor to fix failures, then ask for more edge cases.
7. **Reference existing test patterns** -- Include @existing-test.test.ts in prompts so Cursor follows your established patterns.
8. **Use Apply for code insertion** -- When Chat suggests code, use the Apply button instead of copy-pasting to maintain proper formatting.
9. **Review all generated mocks** -- Cursor generates mocks based on the source code, but verify they accurately represent real behavior.
10. **Keep rules files updated** -- When your testing conventions change, update .cursorrules so all future AI generations follow the new standards.

## Anti-Patterns

1. **Generating tests without providing source context** -- Tests generated without @mentioning the source file are generic and often incorrect.
2. **Accepting all generated code without review** -- AI-generated tests can have incorrect assertions, missing edge cases, and logical errors. Always review.
3. **Not using rules files** -- Without .cursorrules, every developer gets different test styles from Cursor, creating inconsistency.
4. **Using Chat for simple edits** -- Single-line changes are faster with Cmd+K. Do not start a Chat conversation for simple assertion fixes.
5. **Not running tests after generation** -- Generated tests that compile do not necessarily test the right behavior. Run them immediately.
6. **Over-specifying in prompts** -- Extremely detailed prompts often confuse the AI. Start with a clear, concise request and refine iteratively.
7. **Generating the entire test suite at once** -- Large generation requests produce lower quality. Generate in focused batches per function or module.
8. **Ignoring Cursor's codebase indexing** -- Cursor indexes your project. Use @codebase to leverage this index for finding patterns and conventions.
9. **Not providing negative examples** -- If you want Cursor to avoid certain patterns (like using any), specify what NOT to do in your rules.
10. **Treating Cursor output as final** -- Cursor is a coding assistant, not a QA engineer. Generated tests are a starting point, not a finished product.

## Cursor Tab Completion for Test Writing

Cursor Tab provides predictive completions while you type. For test writing, this is powerful because test code follows predictable patterns. When you type the beginning of a test case, Cursor Tab predicts the entire test body based on the function name and the describe block context.

To maximize Tab completions for testing, keep the source file open in a split pane, use descriptive it() names that convey the test intent, follow consistent patterns within each describe block, and accept Tab completions with a single keystroke then refine.

Tab is especially effective for parameterized tests. After writing the first test case in a describe block, Tab often suggests the next logical test case with appropriate boundary values or error conditions.

## Cursor Notepad for Test Planning

Cursor Notepad is a persistent scratchpad that provides context to the AI across all conversations and code generation. Use Notepad to store your testing conventions, test plan notes, and reference patterns.

Create a note titled "Testing Standards" that includes your preferred assertion patterns, mock setup conventions, and fixture organization. This note stays active across all Cursor sessions and influences all test generation.

Create a note titled "Current Sprint Tests" listing the features that need testing this sprint. When you ask Cursor to generate tests, it can reference this note to understand the broader testing context.

## Cursor with MCP for Test Execution

Cursor supports MCP servers, enabling it to execute tests directly from the IDE. Configure a test runner MCP server so Cursor can run tests, check coverage, and validate generated code without leaving the editor.

The workflow becomes: ask Cursor to generate a test, Cursor generates the code and automatically runs it through the MCP server, reviews the result, and fixes any failures. This tight feedback loop produces higher-quality tests because Cursor can verify its work immediately.
