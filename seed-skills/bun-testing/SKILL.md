---
name: Bun Test Runner
description: Fast test execution with Bun's built-in test runner including snapshot testing, mocking, code coverage, lifecycle hooks, DOM testing with happy-dom, and migration from Jest and Vitest to Bun test.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [bun, bun-test, test-runner, snapshot-testing, mocking, code-coverage, happy-dom, fast-testing, runtime, javascript-runtime]
testingTypes: [unit, integration]
frameworks: [bun]
languages: [typescript, javascript]
domains: [backend, web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Bun Test Runner Skill

You are an expert in Bun's built-in test runner. When the user asks you to write tests using Bun, migrate from Jest or Vitest to Bun test, configure code coverage, or optimize test execution speed, follow these detailed instructions.

## Core Principles

1. **Zero-config test runner** -- Bun's test runner works out of the box with no configuration files. Tests are discovered automatically by filename patterns.
2. **Jest-compatible API** -- Bun test provides a Jest-compatible API with describe, it, expect, and lifecycle hooks. Migration from Jest is straightforward.
3. **Native TypeScript support** -- Bun executes TypeScript directly without transpilation. No ts-jest or tsconfig paths configuration needed.
4. **Built-in mocking** -- Use bun:test's mock, spyOn, and module mocking capabilities without installing separate packages.
5. **Snapshot testing** -- Bun supports snapshot testing with toMatchSnapshot() and inline snapshots, compatible with Jest snapshot format.
6. **Code coverage** -- Generate code coverage reports with --coverage flag. No additional tools like c8 or istanbul needed.
7. **Parallel by default** -- Bun runs test files in parallel by default. Design tests to be independent for correct parallel execution.

## Project Structure

```
src/
  utils/
    math.ts
    math.test.ts
    string.ts
    string.test.ts
  services/
    user-service.ts
    user-service.test.ts
    api-client.ts
    api-client.test.ts
  db/
    queries.ts
    queries.test.ts
  __snapshots__/
    .gitkeep
bunfig.toml
package.json
```

## Bun Configuration

```toml
# bunfig.toml
[test]
# Test file patterns
root = "./src"

# Coverage configuration
coverage = true
coverageReporter = ["text", "lcov"]
coverageThreshold = { line = 80, function = 80, statement = 80 }

# Preload scripts
preload = ["./test-setup.ts"]

# Timeout per test (ms)
timeout = 5000

# Bail after N failures (0 = no bail)
bail = 0
```

## Basic Test Patterns

```typescript
// src/utils/math.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { add, multiply, divide, fibonacci, isPrime } from './math';

describe('Math Utilities', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('should handle negative numbers', () => {
      expect(add(-1, -2)).toBe(-3);
      expect(add(-1, 5)).toBe(4);
    });

    it('should handle zero', () => {
      expect(add(0, 0)).toBe(0);
      expect(add(5, 0)).toBe(5);
    });

    it('should handle floating point', () => {
      expect(add(0.1, 0.2)).toBeCloseTo(0.3);
    });
  });

  describe('divide', () => {
    it('should divide two numbers', () => {
      expect(divide(10, 2)).toBe(5);
    });

    it('should throw on division by zero', () => {
      expect(() => divide(10, 0)).toThrow('Division by zero');
    });

    it('should handle decimal results', () => {
      expect(divide(1, 3)).toBeCloseTo(0.333, 2);
    });
  });

  describe('fibonacci', () => {
    it('should return correct values for small inputs', () => {
      expect(fibonacci(0)).toBe(0);
      expect(fibonacci(1)).toBe(1);
      expect(fibonacci(2)).toBe(1);
      expect(fibonacci(10)).toBe(55);
    });

    it('should throw for negative inputs', () => {
      expect(() => fibonacci(-1)).toThrow();
    });
  });

  describe('isPrime', () => {
    it.each([2, 3, 5, 7, 11, 13])('should identify %d as prime', (n) => {
      expect(isPrime(n)).toBe(true);
    });

    it.each([0, 1, 4, 6, 8, 9, 10])('should identify %d as not prime', (n) => {
      expect(isPrime(n)).toBe(false);
    });
  });
});
```

## Mocking with Bun

```typescript
// src/services/user-service.test.ts
import { describe, it, expect, mock, spyOn, beforeEach } from 'bun:test';
import { UserService } from './user-service';
import { db } from '../db/connection';

// Mock the entire module
mock.module('../db/connection', () => ({
  db: {
    query: mock(() => Promise.resolve([])),
    insert: mock(() => Promise.resolve({ id: '123' })),
    update: mock(() => Promise.resolve({ affected: 1 })),
    delete: mock(() => Promise.resolve({ affected: 1 })),
  },
}));

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    // Reset all mocks
    (db.query as any).mockClear();
    (db.insert as any).mockClear();
  });

  it('should find a user by ID', async () => {
    const mockUser = { id: '123', name: 'Alice', email: 'alice@test.com' };
    (db.query as any).mockResolvedValueOnce([mockUser]);

    const user = await service.findById('123');

    expect(user).toEqual(mockUser);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('should return null for non-existent user', async () => {
    (db.query as any).mockResolvedValueOnce([]);

    const user = await service.findById('nonexistent');

    expect(user).toBeNull();
  });

  it('should create a new user', async () => {
    const newUser = { name: 'Bob', email: 'bob@test.com' };
    (db.insert as any).mockResolvedValueOnce({ id: '456', ...newUser });

    const created = await service.create(newUser);

    expect(created.id).toBe('456');
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('should throw on duplicate email', async () => {
    (db.insert as any).mockRejectedValueOnce(new Error('UNIQUE constraint failed'));

    expect(service.create({ name: 'Bob', email: 'existing@test.com' })).rejects.toThrow(
      'Email already exists'
    );
  });
});
```

## Spy Functions

```typescript
// src/services/api-client.test.ts
import { describe, it, expect, spyOn, mock, beforeEach, afterEach } from 'bun:test';
import { ApiClient } from './api-client';

describe('ApiClient', () => {
  let client: ApiClient;
  let fetchSpy: any;

  beforeEach(() => {
    client = new ApiClient('https://api.example.com');
    fetchSpy = spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should make GET requests', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await client.get('/users');

    expect(result).toEqual({ data: 'test' });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/users',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should handle network errors', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    expect(client.get('/users')).rejects.toThrow('Network error');
  });

  it('should retry on 5xx errors', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'ok' }), { status: 200 })
      );

    const result = await client.get('/users', { retries: 3 });

    expect(result).toEqual({ data: 'ok' });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('should include authorization header', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    );

    client.setToken('test-token');
    await client.get('/protected');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });
});
```

## Snapshot Testing

```typescript
// src/utils/string.test.ts
import { describe, it, expect } from 'bun:test';
import { formatDate, slugify, truncate, parseMarkdown } from './string';

describe('String Utilities', () => {
  describe('slugify', () => {
    it('should create URL-safe slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
      expect(slugify('Special @#$ Characters!')).toBe('special-characters');
      expect(slugify('CamelCaseTitle')).toBe('camelcasetitle');
    });

    it('should match snapshot', () => {
      const testCases = [
        'Hello World',
        'TypeScript Testing',
        'API v2.0 Documentation',
        'user@email.com',
      ].map((input) => ({ input, output: slugify(input) }));

      expect(testCases).toMatchSnapshot();
    });
  });

  describe('parseMarkdown', () => {
    it('should parse headings', () => {
      expect(parseMarkdown('# Title')).toMatchSnapshot();
    });

    it('should parse lists', () => {
      const input = '- Item 1\n- Item 2\n- Item 3';
      expect(parseMarkdown(input)).toMatchSnapshot();
    });

    it('should parse code blocks', () => {
      const input = '```typescript\nconst x = 1;\n```';
      expect(parseMarkdown(input)).toMatchSnapshot();
    });
  });
});
```

## DOM Testing with happy-dom

```typescript
// test-setup.ts
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();
```

```typescript
// src/components/counter.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';

describe('Counter Component (DOM)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render counter with initial value', () => {
    document.body.innerHTML = `
      <div id="counter">
        <span class="count">0</span>
        <button class="increment">+</button>
        <button class="decrement">-</button>
      </div>
    `;

    const count = document.querySelector('.count');
    expect(count?.textContent).toBe('0');
  });

  it('should increment counter on button click', () => {
    document.body.innerHTML = `<button id="btn" onclick="this.dataset.count = (parseInt(this.dataset.count || '0') + 1)">Click</button>`;

    const btn = document.getElementById('btn') as HTMLButtonElement;
    btn.click();

    expect(btn.dataset.count).toBe('1');
  });
});
```

## Running Tests

```bash
# Run all tests
bun test

# Run specific file
bun test src/utils/math.test.ts

# Run tests matching pattern
bun test --grep "should add"

# Run with coverage
bun test --coverage

# Run in watch mode
bun test --watch

# Run with timeout
bun test --timeout 10000

# Bail on first failure
bun test --bail 1

# Run specific directory
bun test src/services/
```

## Integration Testing Patterns

```typescript
// src/services/api-integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createServer } from '../server';

describe('API Integration Tests', () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer({ port: 0 }); // Random port
    const address = server.address();
    baseUrl = \`http://localhost:\${address.port}\`;
  });

  afterAll(() => {
    server.close();
  });

  it('should handle POST /api/users', async () => {
    const response = await fetch(\`\${baseUrl}/api/users\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: 'test@bun.sh' }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.name).toBe('Test User');
  });

  it('should return 400 for invalid input', async () => {
    const response = await fetch(\`\${baseUrl}/api/users\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });

    expect(response.status).toBe(400);
  });

  it('should handle GET /api/users/:id', async () => {
    // Create a user first
    const createResponse = await fetch(\`\${baseUrl}/api/users\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Lookup User', email: 'lookup@bun.sh' }),
    });
    const created = await createResponse.json();

    // Fetch the user
    const response = await fetch(\`\${baseUrl}/api/users/\${created.id}\`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.name).toBe('Lookup User');
  });

  it('should return 404 for non-existent user', async () => {
    const response = await fetch(\`\${baseUrl}/api/users/nonexistent\`);
    expect(response.status).toBe(404);
  });
});
```

## File System Testing with Bun

```typescript
// src/utils/file-processor.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { processFiles, readConfig } from './file-processor';

describe('File Processor', () => {
  const testDir = join(import.meta.dir, '__test_tmp__');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should process markdown files in directory', async () => {
    writeFileSync(join(testDir, 'test1.md'), '# Hello');
    writeFileSync(join(testDir, 'test2.md'), '# World');
    writeFileSync(join(testDir, 'ignore.txt'), 'not markdown');

    const results = await processFiles(testDir, '*.md');
    expect(results).toHaveLength(2);
    expect(results[0].content).toContain('Hello');
  });

  it('should read YAML config files', async () => {
    writeFileSync(join(testDir, 'config.yaml'), 'name: test\\nversion: 1.0.0');

    const config = await readConfig(join(testDir, 'config.yaml'));
    expect(config.name).toBe('test');
    expect(config.version).toBe('1.0.0');
  });

  it('should handle empty directories', async () => {
    const results = await processFiles(testDir, '*.md');
    expect(results).toHaveLength(0);
  });
});
```

## Best Practices

1. **Use Bun's native APIs** -- Prefer bun:test imports over Jest globals. This ensures compatibility with Bun's optimized test runner.
2. **Keep tests colocated** -- Place .test.ts files next to source files for easy discovery and navigation.
3. **Use mock.module for dependency mocking** -- Bun's module mocking is hoisted automatically, similar to Jest's jest.mock.
4. **Leverage Bun's speed for TDD** -- With sub-second test execution, run tests continuously with --watch during development.
5. **Configure coverage thresholds** -- Set minimum coverage in bunfig.toml to prevent regressions.
6. **Use toMatchSnapshot for complex outputs** -- Snapshot testing is ideal for formatted strings, parsed structures, and serialized objects.
7. **Reset mocks in beforeEach** -- Call mockClear() on each mock before every test to ensure test isolation.
8. **Use it.each for data-driven tests** -- Parameterize tests with .each() to avoid duplicating test logic.
9. **Preload setup files** -- Use bunfig.toml's preload option for global test setup like DOM registration.
10. **Profile slow tests** -- Bun reports test duration. Investigate tests taking more than 100ms as they may have unnecessary async operations.

## Anti-Patterns

1. **Importing from jest instead of bun:test** -- Using Jest imports may work for some APIs but misses Bun-specific optimizations and features.
2. **Not resetting mocks between tests** -- Leaked mock state causes flaky tests. Always clear mocks in beforeEach.
3. **Using setTimeout for async testing** -- Bun handles async/await natively. Use expect().resolves or expect().rejects instead of timers.
4. **Over-mocking** -- Mock external dependencies, not the code under test. Over-mocking tests nothing of value.
5. **Ignoring TypeScript errors in tests** -- Bun compiles TypeScript directly. Type errors in tests indicate real problems.
6. **Writing tests that depend on execution order** -- Bun runs tests in parallel by default. Each test must be fully independent.
7. **Not using the built-in coverage** -- Installing separate coverage tools adds overhead. Use bun test --coverage for built-in reporting.
8. **Testing private methods** -- If you need to test a private method, it should probably be a separate utility function. Test through the public API.
9. **Ignoring test timeouts** -- Tests that hang indicate async issues. Configure appropriate timeouts in bunfig.toml.
10. **Not running tests before committing** -- Bun's speed makes pre-commit test execution practical. Add tests to your pre-commit hook.
