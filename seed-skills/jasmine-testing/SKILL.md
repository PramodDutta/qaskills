---
name: Jasmine Testing
description: BDD-style JavaScript testing with Jasmine covering spies, async patterns, custom matchers, clock manipulation, and comprehensive test organization for frontend and Node.js applications.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [jasmine, bdd, javascript, spies, async-testing, matchers, unit-testing, typescript]
testingTypes: [unit, integration]
frameworks: [jasmine]
languages: [javascript, typescript]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Jasmine Testing Skill

You are an expert software engineer specializing in BDD-style testing with Jasmine. When the user asks you to write, review, or debug Jasmine tests, follow these detailed instructions to produce production-grade test suites that are readable, maintainable, and comprehensive.

## Core Principles

1. **Behavior-Driven Development** -- Write specs that describe behavior from the user's perspective using `describe`, `it`, and `expect` in natural language.
2. **One expectation focus per spec** -- Each `it` block should verify a single logical behavior to make failures easy to diagnose.
3. **Arrange-Act-Assert** -- Structure every spec into setup, execution, and verification phases even when using `beforeEach`.
4. **Isolate with spies** -- Use `jasmine.createSpy()` and `jasmine.createSpyObj()` to eliminate external dependencies and side effects.
5. **Descriptive spec names** -- Spec names should read as complete sentences: `it('should return the sum of two positive numbers')`.
6. **Clean up after yourself** -- Always uninstall clocks, restore spies, and tear down DOM modifications in `afterEach` blocks.
7. **Prefer async/await** -- Use modern async patterns over `done()` callbacks for cleaner, more readable async specs.

## Project Structure

```
src/
  services/
    user.service.js
    user.service.spec.js
    payment.service.js
    payment.service.spec.js
  utils/
    validators.js
    validators.spec.js
    formatters.js
    formatters.spec.js
  models/
    user.model.js
    user.model.spec.js
  helpers/
    jasmine-helpers.js
spec/
  support/
    jasmine.json
  integration/
    user-payment.spec.js
```

## Configuration

### jasmine.json
```json
{
  "spec_dir": "spec",
  "spec_files": [
    "**/*[sS]pec.?(m)js"
  ],
  "helpers": [
    "helpers/**/*.?(m)js"
  ],
  "env": {
    "stopSpecOnExpectationFailure": false,
    "random": true,
    "forbidDuplicateNames": true
  }
}
```

### package.json Setup
```json
{
  "devDependencies": {
    "jasmine": "^5.1.0",
    "@types/jasmine": "^5.1.0"
  },
  "scripts": {
    "test": "jasmine",
    "test:watch": "nodemon --exec jasmine",
    "test:coverage": "c8 jasmine"
  }
}
```

## Basic Test Structure

```javascript
describe('Calculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  afterEach(() => {
    calculator = null;
  });

  describe('add', () => {
    it('should return the sum of two positive numbers', () => {
      const result = calculator.add(2, 3);

      expect(result).toBe(5);
    });

    it('should handle negative numbers', () => {
      const result = calculator.add(-1, -3);

      expect(result).toBe(-4);
    });

    it('should handle zero', () => {
      const result = calculator.add(0, 5);

      expect(result).toBe(5);
    });
  });

  describe('divide', () => {
    it('should return the quotient of two numbers', () => {
      const result = calculator.divide(10, 2);

      expect(result).toBe(5);
    });

    it('should throw an error when dividing by zero', () => {
      expect(() => calculator.divide(10, 0)).toThrowError('Division by zero');
    });
  });
});
```

## Spy Patterns

### Creating Spies
```javascript
describe('UserService', () => {
  let userService;
  let apiClient;

  beforeEach(() => {
    apiClient = jasmine.createSpyObj('ApiClient', ['get', 'post', 'put', 'delete']);
    userService = new UserService(apiClient);
  });

  it('should fetch user by ID', async () => {
    const mockUser = { id: 1, name: 'Alice' };
    apiClient.get.and.returnValue(Promise.resolve(mockUser));

    const user = await userService.getUser(1);

    expect(apiClient.get).toHaveBeenCalledWith('/users/1');
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(user).toEqual(mockUser);
  });

  it('should create a new user', async () => {
    const newUser = { name: 'Bob', email: 'bob@example.com' };
    const savedUser = { id: 2, ...newUser };
    apiClient.post.and.returnValue(Promise.resolve(savedUser));

    const result = await userService.createUser(newUser);

    expect(apiClient.post).toHaveBeenCalledWith('/users', newUser);
    expect(result.id).toBe(2);
  });
});
```

### Spying on Existing Methods
```javascript
describe('EventLogger', () => {
  let logger;

  beforeEach(() => {
    logger = new EventLogger();
    spyOn(logger, 'sendToServer').and.callFake(() => Promise.resolve());
    spyOn(console, 'error');
  });

  it('should log events and send to server', async () => {
    await logger.logEvent('click', { button: 'submit' });

    expect(logger.sendToServer).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: 'click',
        data: { button: 'submit' },
        timestamp: jasmine.any(Number)
      })
    );
  });

  it('should handle server failure gracefully', async () => {
    logger.sendToServer.and.returnValue(Promise.reject(new Error('Network error')));

    await logger.logEvent('click', { button: 'submit' });

    expect(console.error).toHaveBeenCalledWith(
      'Failed to send event:',
      jasmine.any(Error)
    );
  });
});
```

## Async Testing Patterns

### Using async/await
```javascript
describe('DataFetcher', () => {
  let fetcher;

  beforeEach(() => {
    fetcher = new DataFetcher();
  });

  it('should fetch and transform data', async () => {
    spyOn(fetcher, 'fetchRaw').and.returnValue(
      Promise.resolve({ items: [{ id: 1 }, { id: 2 }] })
    );

    const result = await fetcher.getTransformedData();

    expect(result).toEqual([
      jasmine.objectContaining({ id: 1 }),
      jasmine.objectContaining({ id: 2 })
    ]);
  });

  it('should retry on failure', async () => {
    let callCount = 0;
    spyOn(fetcher, 'fetchRaw').and.callFake(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error('Temporary failure'));
      }
      return Promise.resolve({ items: [] });
    });

    const result = await fetcher.getTransformedData();

    expect(fetcher.fetchRaw).toHaveBeenCalledTimes(3);
    expect(result).toEqual([]);
  });
});
```

### Clock Manipulation
```javascript
describe('SessionManager', () => {
  beforeEach(() => {
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should expire session after 30 minutes', () => {
    const session = new SessionManager();
    session.start();

    expect(session.isActive()).toBe(true);

    jasmine.clock().tick(30 * 60 * 1000);

    expect(session.isActive()).toBe(false);
  });

  it('should refresh session on activity', () => {
    const session = new SessionManager();
    session.start();

    jasmine.clock().tick(20 * 60 * 1000);
    session.recordActivity();

    jasmine.clock().tick(20 * 60 * 1000);

    expect(session.isActive()).toBe(true);
  });
});
```

## Matcher Reference

### Built-in Matchers
```javascript
describe('Matcher examples', () => {
  it('demonstrates equality matchers', () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect(undefined).toBeUndefined();
    expect(null).toBeNull();
    expect('hello').toBeDefined();
    expect(true).toBeTruthy();
    expect(0).toBeFalsy();
  });

  it('demonstrates comparison matchers', () => {
    expect(10).toBeGreaterThan(5);
    expect(5).toBeLessThan(10);
    expect(10).toBeGreaterThanOrEqual(10);
    expect(0.1 + 0.2).toBeCloseTo(0.3, 5);
  });

  it('demonstrates string matchers', () => {
    expect('hello world').toContain('world');
    expect('hello world').toMatch(/^hello/);
  });

  it('demonstrates array matchers', () => {
    expect([1, 2, 3]).toContain(2);
    expect([1, 2, 3]).toHaveSize(3);
  });

  it('demonstrates object matchers', () => {
    const user = { name: 'Alice', age: 30, role: 'admin' };
    expect(user).toEqual(jasmine.objectContaining({ name: 'Alice' }));
    expect(user.name).toEqual(jasmine.stringContaining('Ali'));
  });

  it('demonstrates exception matchers', () => {
    const badFn = () => { throw new TypeError('invalid type'); };
    expect(badFn).toThrow();
    expect(badFn).toThrowError(TypeError);
    expect(badFn).toThrowError('invalid type');
  });
});
```

### Custom Matchers
```javascript
beforeEach(() => {
  jasmine.addMatchers({
    toBeValidEmail: () => ({
      compare: (actual) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const pass = emailRegex.test(actual);
        return {
          pass,
          message: pass
            ? `Expected ${actual} not to be a valid email`
            : `Expected ${actual} to be a valid email`
        };
      }
    }),
    toBeWithinRange: () => ({
      compare: (actual, floor, ceiling) => {
        const pass = actual >= floor && actual <= ceiling;
        return {
          pass,
          message: `Expected ${actual} to be within range [${floor}, ${ceiling}]`
        };
      }
    })
  });
});

describe('Custom matcher usage', () => {
  it('should validate email format', () => {
    expect('user@example.com').toBeValidEmail();
    expect('invalid-email').not.toBeValidEmail();
  });

  it('should check value ranges', () => {
    expect(5).toBeWithinRange(1, 10);
    expect(15).not.toBeWithinRange(1, 10);
  });
});
```

## Nested Describe Blocks for Organization

```javascript
describe('ShoppingCart', () => {
  let cart;

  beforeEach(() => {
    cart = new ShoppingCart();
  });

  describe('when empty', () => {
    it('should have zero items', () => {
      expect(cart.itemCount()).toBe(0);
    });

    it('should have zero total', () => {
      expect(cart.total()).toBe(0);
    });
  });

  describe('when adding items', () => {
    beforeEach(() => {
      cart.addItem({ name: 'Widget', price: 9.99, quantity: 2 });
    });

    it('should update item count', () => {
      expect(cart.itemCount()).toBe(2);
    });

    it('should calculate total correctly', () => {
      expect(cart.total()).toBeCloseTo(19.98, 2);
    });

    describe('and applying a discount', () => {
      it('should reduce total by discount percentage', () => {
        cart.applyDiscount(0.1);
        expect(cart.total()).toBeCloseTo(17.98, 2);
      });
    });
  });

  describe('when removing items', () => {
    beforeEach(() => {
      cart.addItem({ name: 'Widget', price: 9.99, quantity: 2 });
      cart.addItem({ name: 'Gadget', price: 14.99, quantity: 1 });
    });

    it('should remove the specified item', () => {
      cart.removeItem('Widget');
      expect(cart.itemCount()).toBe(1);
    });

    it('should throw if item not found', () => {
      expect(() => cart.removeItem('NonExistent')).toThrowError('Item not found');
    });
  });
});
```

## Best Practices

1. **Use `beforeEach` for shared setup** -- Avoid duplicating setup code across specs; put common initialization in `beforeEach` blocks for consistency and DRY code.
2. **Always uninstall Jasmine clock** -- If you call `jasmine.clock().install()`, always pair it with `jasmine.clock().uninstall()` in `afterEach` to prevent cross-spec contamination.
3. **Use `jasmine.objectContaining` for partial matches** -- When testing objects with dynamic fields like timestamps or IDs, match only the fields you care about.
4. **Prefer `createSpyObj` over manual mocks** -- It creates a clean mock with typed spy methods and avoids accidentally calling real implementations.
5. **Test error paths explicitly** -- Every function that can throw or reject should have specs for each error scenario.
6. **Randomize spec execution order** -- Set `random: true` in jasmine.json to catch specs that accidentally depend on execution order.
7. **Use `fdescribe` and `fit` only during debugging** -- Never commit focused specs to version control; they skip other tests silently.
8. **Write descriptive failure messages** -- Use custom matcher messages or add context to expectations so failures are self-documenting.
9. **Keep specs fast** -- Unit specs should complete in under 50ms each. Move slow tests to a separate integration suite.
10. **Group related specs with nested `describe` blocks** -- Create a hierarchy that mirrors the conditions and behaviors being tested.

## Anti-Patterns

1. **Testing implementation details** -- Spying on private methods or asserting internal state creates brittle tests that break during refactoring without catching real bugs.
2. **Multiple unrelated assertions in one spec** -- Combining unrelated checks in a single `it` block makes it impossible to identify which behavior failed.
3. **Shared mutable state between specs** -- Storing test state in variables outside `beforeEach` causes order-dependent failures that are difficult to debug.
4. **Using `done()` callback with async/await** -- Mixing callback and promise patterns leads to confusing control flow and potential false positives.
5. **Catching exceptions in specs** -- Wrapping code in try/catch inside a spec swallows failures; use `toThrow()` or `toThrowError()` matchers instead.
6. **Not restoring spies** -- Forgetting to restore spied-on methods pollutes the global state for subsequent specs.
7. **Hardcoding test data inline** -- Duplicating magic numbers and strings across specs makes maintenance painful; extract shared fixtures.
8. **Ignoring async rejection handling** -- Not testing promise rejections means error paths go uncovered and may fail silently in production.
9. **Over-mocking** -- Mocking every dependency including simple utility functions reduces test confidence; only mock I/O and non-deterministic code.
10. **Writing tests after the fact** -- Retroactive tests tend to mirror implementation rather than specify behavior; practice TDD where possible.
