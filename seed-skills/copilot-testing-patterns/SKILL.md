---
name: GitHub Copilot Testing Patterns
description: Effective patterns for using GitHub Copilot to generate, refactor, and maintain test code including prompt engineering for test generation, Copilot Chat for debugging, inline suggestions for assertions, and workspace context optimization.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [github-copilot, copilot-chat, ai-pair-programming, test-generation, code-completion, prompt-engineering, inline-suggestions, debugging, vscode]
testingTypes: [unit, integration, e2e, api]
frameworks: [vitest, jest, playwright, cypress, pytest]
languages: [typescript, javascript, python, java]
domains: [web, backend, api, mobile]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# GitHub Copilot Testing Patterns Skill

You are an expert in leveraging GitHub Copilot for test automation. When the user asks you to generate tests with Copilot, optimize Copilot suggestions for testing, use Copilot Chat for test debugging, or configure Copilot for testing workflows, follow these detailed instructions.

## Core Principles

1. **Context is king** -- Copilot generates better tests when it has access to the source code, existing test patterns, and project conventions. Keep relevant files open and organized.
2. **Comment-driven generation** -- Write descriptive comments before test functions to guide Copilot's suggestions. The comment becomes the specification.
3. **Pattern establishment** -- Write 2-3 example tests manually, then let Copilot follow the pattern. It excels at pattern continuation.
4. **Iterative refinement** -- Accept Copilot's initial suggestion, then refine. It is faster to edit a 80% correct suggestion than to write from scratch.
5. **Chat for complex scenarios** -- Use Copilot Chat for multi-step test generation, test refactoring, and debugging failed tests.
6. **Workspace awareness** -- Copilot uses open files as context. Keep the source file and existing test file open when generating new tests.
7. **Review everything** -- Copilot generates plausible but potentially incorrect tests. Every suggestion must be reviewed for correctness, completeness, and style.

## Project Structure

```
src/
  services/
    user-service.ts
    user-service.test.ts    # Keep test next to source
  utils/
    validators.ts
    validators.test.ts
  components/
    Button/
      Button.tsx
      Button.test.tsx
.github/
  copilot/
    instructions.md         # Custom instructions for Copilot
    test-patterns.md        # Test pattern examples
.vscode/
  settings.json             # Copilot configuration
```

## Copilot Custom Instructions for Testing

```markdown
<!-- .github/copilot/instructions.md -->
# Test Generation Instructions

When generating tests, follow these conventions:
- Use vitest with TypeScript
- Follow Arrange-Act-Assert (AAA) pattern
- Name tests: "should [expected behavior] when [condition]"
- Group tests in describe blocks by function name
- Mock external dependencies using vi.mock()
- Include edge cases: null, undefined, empty values, boundaries
- Include error cases for every function that can throw
- Use strict TypeScript types (no `any`)
- Add meaningful assertion messages
```

## Comment-Driven Test Generation Patterns

```typescript
// Pattern 1: Descriptive comment before test
// Copilot will generate the test body based on the comment

// Test that validateEmail returns true for valid emails
// and false for invalid emails including empty strings,
// missing @ symbol, and missing domain
import { describe, it, expect } from 'vitest';
import { validateEmail } from './validators';

describe('validateEmail', () => {
  // should return true for standard email format
  it('should return true for standard email format', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  // should return true for email with subdomain
  it('should return true for email with subdomain', () => {
    expect(validateEmail('user@mail.example.com')).toBe(true);
  });

  // should return false for empty string
  it('should return false for empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  // should return false for email without @ symbol
  it('should return false for email without @ symbol', () => {
    expect(validateEmail('userexample.com')).toBe(false);
  });

  // should return false for email without domain
  it('should return false for email without domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  // Copilot will continue the pattern with more edge cases...
});
```

## Pattern 2: Type-Driven Generation

```typescript
// When the source code has strong types, Copilot infers test cases from types

// Source: user-service.ts
interface CreateUserInput {
  name: string;       // 1-100 characters
  email: string;      // valid email format
  age: number;        // 18-150
  role: 'admin' | 'user' | 'editor';
}

interface UserService {
  createUser(input: CreateUserInput): Promise<User>;
  findById(id: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<CreateUserInput>): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

// Test file: user-service.test.ts
// Copilot uses the types to generate comprehensive tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './user-service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService(/* mocked deps */);
  });

  describe('createUser', () => {
    // Valid creation with all required fields
    it('should create user with valid input', async () => {
      const input = { name: 'John Doe', email: 'john@test.com', age: 25, role: 'user' as const };
      const user = await service.createUser(input);
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@test.com');
    });

    // Copilot generates boundary tests based on type comments
    // Name boundary: empty name
    it('should reject empty name', async () => {
      const input = { name: '', email: 'john@test.com', age: 25, role: 'user' as const };
      await expect(service.createUser(input)).rejects.toThrow();
    });

    // Name boundary: name exceeding 100 characters
    it('should reject name over 100 characters', async () => {
      const input = { name: 'a'.repeat(101), email: 'john@test.com', age: 25, role: 'user' as const };
      await expect(service.createUser(input)).rejects.toThrow();
    });

    // Age boundary: below minimum (18)
    it('should reject age below 18', async () => {
      const input = { name: 'John', email: 'john@test.com', age: 17, role: 'user' as const };
      await expect(service.createUser(input)).rejects.toThrow();
    });

    // Age boundary: at minimum (18)
    it('should accept age at minimum 18', async () => {
      const input = { name: 'John', email: 'john@test.com', age: 18, role: 'user' as const };
      const user = await service.createUser(input);
      expect(user.age).toBe(18);
    });

    // Age boundary: above maximum (150)
    it('should reject age above 150', async () => {
      const input = { name: 'John', email: 'john@test.com', age: 151, role: 'user' as const };
      await expect(service.createUser(input)).rejects.toThrow();
    });
  });
});
```

## Copilot Chat Prompts for Testing

```typescript
// Use these Copilot Chat slash commands and prompts:

// /tests - Generate tests for the selected code
// @workspace /tests - Generate tests considering workspace context

// Effective prompts for Copilot Chat:

// 1. "Generate unit tests for UserService.createUser covering:
//     - valid input scenarios
//     - boundary values for name length
//     - invalid email formats
//     - age range validation
//     Use vitest with TypeScript"

// 2. "This test is failing with error: 'Expected 200, received 401'.
//     The API endpoint requires authentication.
//     Help me fix the test by adding proper auth headers."

// 3. "Refactor these tests to use a test factory pattern:
//     - Extract user creation to a factory function
//     - Parameterize the test data
//     - Add beforeEach setup"

// 4. "Generate integration tests for the checkout flow:
//     1. Add item to cart
//     2. Apply discount code
//     3. Enter shipping info
//     4. Complete payment
//     Use Playwright with page object model"

// 5. "Convert this Jest test to Vitest:
//     - Replace jest.fn() with vi.fn()
//     - Replace jest.mock() with vi.mock()
//     - Update imports"
```

## VS Code Settings for Copilot Testing

```json
{
  "github.copilot.enable": {
    "*": true,
    "yaml": true,
    "markdown": true
  },
  "github.copilot.chat.testGeneration.instructions": [
    {
      "text": "Use vitest for all test files. Follow AAA pattern. Include edge cases."
    }
  ],
  "editor.inlineSuggest.enabled": true,
  "github.copilot.chat.localeOverride": "en"
}
```

## Pattern 3: Mock-First Test Generation

```typescript
// Start with mock setup - Copilot will generate tests that use these mocks

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from './order-service';
import { PaymentGateway } from './payment-gateway';
import { InventoryService } from './inventory-service';
import { EmailService } from './email-service';

// Mock all dependencies
vi.mock('./payment-gateway');
vi.mock('./inventory-service');
vi.mock('./email-service');

describe('OrderService', () => {
  let orderService: OrderService;
  let mockPayment: vi.Mocked<PaymentGateway>;
  let mockInventory: vi.Mocked<InventoryService>;
  let mockEmail: vi.Mocked<EmailService>;

  beforeEach(() => {
    mockPayment = new PaymentGateway() as vi.Mocked<PaymentGateway>;
    mockInventory = new InventoryService() as vi.Mocked<InventoryService>;
    mockEmail = new EmailService() as vi.Mocked<EmailService>;

    orderService = new OrderService(mockPayment, mockInventory, mockEmail);

    // Default mock returns
    mockPayment.charge.mockResolvedValue({ success: true, transactionId: 'tx-123' });
    mockInventory.checkStock.mockResolvedValue({ available: true, quantity: 10 });
    mockEmail.send.mockResolvedValue(undefined);
  });

  // Copilot will now generate tests using the established mocks:

  it('should create order when payment and inventory are available', async () => {
    const order = await orderService.createOrder({
      items: [{ productId: 'p1', quantity: 2 }],
      userId: 'u1',
    });

    expect(order.status).toBe('confirmed');
    expect(mockPayment.charge).toHaveBeenCalledOnce();
    expect(mockInventory.checkStock).toHaveBeenCalledWith('p1', 2);
    expect(mockEmail.send).toHaveBeenCalledOnce();
  });

  it('should fail when payment is declined', async () => {
    mockPayment.charge.mockResolvedValue({ success: false, error: 'Declined' });

    await expect(
      orderService.createOrder({ items: [{ productId: 'p1', quantity: 1 }], userId: 'u1' })
    ).rejects.toThrow('Payment declined');
  });

  it('should fail when item is out of stock', async () => {
    mockInventory.checkStock.mockResolvedValue({ available: false, quantity: 0 });

    await expect(
      orderService.createOrder({ items: [{ productId: 'p1', quantity: 1 }], userId: 'u1' })
    ).rejects.toThrow('Out of stock');
  });
});
```

## Pattern 4: Copilot for Test Refactoring

```typescript
// Refactoring workflow: select existing tests and ask Copilot to improve them

// Before: Repetitive test setup
describe('UserAPI', () => {
  it('should get user', async () => {
    const response = await fetch('http://localhost:3000/api/users/1');
    const data = await response.json();
    expect(data.name).toBe('Alice');
  });

  it('should update user', async () => {
    const response = await fetch('http://localhost:3000/api/users/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bob' }),
    });
    const data = await response.json();
    expect(data.name).toBe('Bob');
  });
});

// After: Ask Copilot "Refactor to use a shared API client and beforeEach setup"
describe('UserAPI', () => {
  let apiClient: TestApiClient;

  beforeEach(() => {
    apiClient = new TestApiClient('http://localhost:3000/api');
  });

  it('should get user by ID', async () => {
    const user = await apiClient.get('/users/1');
    expect(user.name).toBe('Alice');
    expect(user.id).toBe('1');
  });

  it('should update user name', async () => {
    const user = await apiClient.put('/users/1', { name: 'Bob' });
    expect(user.name).toBe('Bob');
  });
});
```

## Pattern 5: Copilot for E2E Test Generation

```typescript
// Prompt pattern: Write a descriptive comment block, then let Copilot generate

// Checkout flow E2E test using Playwright
// Steps:
// 1. Navigate to product page
// 2. Add item to cart
// 3. Go to cart page
// 4. Proceed to checkout
// 5. Fill shipping information
// 6. Select payment method
// 7. Confirm order
// 8. Verify order confirmation page
import { test, expect } from '@playwright/test';

test('complete checkout flow', async ({ page }) => {
  // Navigate to product page
  await page.goto('/products/wireless-headphones');
  await expect(page.getByRole('heading', { name: /wireless headphones/i })).toBeVisible();

  // Add item to cart
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await expect(page.getByText('Added to cart')).toBeVisible();

  // Go to cart page
  await page.getByRole('link', { name: 'Cart' }).click();
  await expect(page).toHaveURL(/\/cart/);
  await expect(page.getByText('Wireless Headphones')).toBeVisible();

  // Proceed to checkout
  await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
  await expect(page).toHaveURL(/\/checkout/);

  // Fill shipping information
  await page.getByLabel('Full Name').fill('John Doe');
  await page.getByLabel('Address').fill('123 Test Street');
  await page.getByLabel('City').fill('San Francisco');
  await page.getByLabel('State').selectOption('CA');
  await page.getByLabel('ZIP Code').fill('94105');

  // Select payment method
  await page.getByLabel('Credit Card').check();
  await page.getByLabel('Card Number').fill('4111111111111111');
  await page.getByLabel('Expiry').fill('12/28');
  await page.getByLabel('CVC').fill('123');

  // Confirm order
  await page.getByRole('button', { name: 'Place Order' }).click();

  // Verify order confirmation
  await expect(page).toHaveURL(/\/order-confirmation/);
  await expect(page.getByText('Thank you for your order')).toBeVisible();
  await expect(page.getByText('Order #')).toBeVisible();
});
```

## Copilot Keyboard Shortcuts for Testing

Use these shortcuts to accelerate test development with Copilot:

- **Tab**: Accept the current inline suggestion
- **Esc**: Dismiss the current suggestion
- **Alt+]** / **Option+]**: View next suggestion when multiple are available
- **Alt+[** / **Option+[**: View previous suggestion
- **Ctrl+Enter**: Open Copilot completions panel with multiple suggestions
- **Ctrl+I** / **Cmd+I**: Open Copilot Chat inline
- **Ctrl+Shift+I**: Open Copilot Chat panel

For testing workflows, the most productive pattern is to type a descriptive comment, wait for Copilot to suggest the test implementation, use Alt+] to cycle through alternatives, and Tab to accept the best suggestion. Then immediately run the test with the test runner to validate.

## Pattern 6: Copilot for Error Handling Tests

```typescript
// Comment-driven: generate error handling tests for a service
// Test that UserService handles all error cases:
// - Database connection errors
// - Validation errors for invalid email format
// - Duplicate email conflicts
// - Not found errors for missing users
// - Rate limit exceeded errors
// - Network timeout errors
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './user-service';

vi.mock('./database');
import { db } from './database';

describe('UserService Error Handling', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    vi.clearAllMocks();
  });

  it('should throw DatabaseConnectionError when DB is unavailable', async () => {
    vi.mocked(db.query).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(service.findById('1')).rejects.toThrow('Database connection failed');
  });

  it('should throw ValidationError for invalid email format', async () => {
    await expect(
      service.create({ name: 'Test', email: 'not-an-email', age: 25 })
    ).rejects.toThrow('Invalid email format');
  });

  it('should throw ConflictError for duplicate email', async () => {
    vi.mocked(db.insert).mockRejectedValueOnce(new Error('UNIQUE constraint'));
    await expect(
      service.create({ name: 'Test', email: 'exists@test.com', age: 25 })
    ).rejects.toThrow('Email already exists');
  });

  it('should throw NotFoundError for missing user', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);
    await expect(service.findById('missing')).rejects.toThrow('User not found');
  });
});
```

## Configuring Copilot for Testing Projects

```json
{
  "github.copilot.chat.testGeneration.instructions": [
    {
      "text": "Always use vitest. Follow AAA pattern. Include edge cases for null, undefined, empty values. Use vi.mock for module mocking. Use vi.fn for function mocking. Reset mocks in beforeEach."
    }
  ],
  "github.copilot.chat.codeGeneration.instructions": [
    {
      "text": "When generating test files, include all necessary imports at the top. Group tests in describe blocks. Use it() for individual tests. Include both positive and negative test cases."
    }
  ]
}
```

## Best Practices

1. **Write the first test manually, let Copilot continue** -- Establishing a pattern with one manually-written test gives Copilot the context to generate consistent follow-up tests.
2. **Keep source and test files open side by side** -- Copilot uses open editor tabs as context. The source file being visible dramatically improves suggestion quality.
3. **Use descriptive comments as specifications** -- A comment like "should reject passwords shorter than 8 characters" produces better suggestions than "test short password".
4. **Accept and then refine** -- Copilot's first suggestion is rarely perfect but usually 70-80% correct. Accept it and fix the details manually.
5. **Use Copilot Chat for complex test scenarios** -- Multi-step tests, integration tests, and test refactoring benefit from Chat's conversational context.
6. **Configure custom instructions for your project** -- Create .github/copilot/instructions.md with your testing conventions so Copilot follows project standards.
7. **Review all generated assertions** -- Copilot may generate assertions that are technically valid but test the wrong behavior. Verify every expect statement.
8. **Use type annotations to improve suggestions** -- Strong TypeScript types give Copilot better context for generating boundary tests and error cases.
9. **Leverage slash commands** -- Use /tests, /fix, and /explain in Copilot Chat for specific testing tasks.
10. **Create a test patterns reference file** -- Keep a file with exemplary test patterns open when generating tests. Copilot will reference it for style consistency.

## Anti-Patterns

1. **Blindly accepting all suggestions** -- Copilot generates plausible but potentially incorrect tests. Every suggestion must be reviewed by a human.
2. **Not providing context** -- Generating tests with only the test file open (no source code) produces generic, potentially incorrect tests.
3. **Over-relying on Copilot for complex logic** -- Copilot excels at pattern continuation but struggles with complex business logic verification. Write critical assertions manually.
4. **Ignoring test quality** -- Generated tests may use weak assertions (toBeDefined instead of specific values), skip error cases, or test implementation details.
5. **Not establishing patterns first** -- Without a pattern to follow, Copilot generates inconsistent test styles across the codebase.
6. **Using Copilot for security tests** -- Security testing requires domain expertise. Copilot may miss critical attack vectors or generate false security checks.
7. **Generating all tests at once** -- Generate tests incrementally, validate each batch, then continue. Bulk generation without validation produces unreliable suites.
8. **Not using custom instructions** -- Without project-specific instructions, Copilot uses generic patterns that may not match your codebase conventions.
9. **Trusting generated mock implementations** -- Copilot creates mocks that look correct but may not accurately represent real dependency behavior. Verify mock contracts.
10. **Not testing the generated tests** -- Always run generated tests immediately. A test that does not compile or always passes provides zero value.

## Copilot Workspace for Test Planning

GitHub Copilot Workspace extends Copilot beyond code generation into test planning. When reviewing an issue or feature request, Copilot Workspace can analyze the proposed changes, suggest test scenarios that should be covered, generate test skeletons for each scenario, and create a plan for the testing approach.

This is particularly useful during sprint planning when the team needs to estimate testing effort. Copilot Workspace can analyze the proposed feature, suggest the types of tests needed (unit, integration, E2E), estimate the number of test cases, and provide skeleton implementations that developers can complete.

## Copilot CLI for Test Execution

GitHub Copilot CLI assists with test-related command-line tasks. Instead of remembering exact command syntax, describe what you want to do in natural language. For example, ask Copilot to explain how to run tests matching a specific pattern, run tests with coverage and generate a report, watch tests for a specific file, or debug a failing test by running it in isolation.

Copilot CLI translates your natural language request into the correct command for your test runner, whether it is vitest, jest, playwright, or another tool.

## Integration with GitHub Actions

Copilot can generate GitHub Actions workflows for testing. Describe your CI requirements and Copilot produces a complete workflow file with dependency caching, parallel test execution, coverage reporting, and artifact upload.

For testing-specific workflows, Copilot generates appropriate job configurations including browser installation for E2E tests, database setup for integration tests, and environment variable configuration for different deployment targets.
