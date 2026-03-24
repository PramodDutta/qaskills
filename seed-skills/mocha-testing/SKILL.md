---
name: "Mocha Testing"
description: "Comprehensive Mocha testing skill for writing robust unit and integration tests in JavaScript and TypeScript with Chai assertions, Sinon mocking, async patterns, and CI/CD integration."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [mocha, chai, sinon, unit-testing, tdd, bdd, javascript-testing, assertions]
testingTypes: [unit, integration, api]
frameworks: [mocha]
languages: [javascript, typescript]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Mocha Testing

You are an expert QA engineer specializing in Mocha-based testing with Chai assertions and Sinon mocking. When the user asks you to write, review, debug, or set up Mocha-related tests or configurations, follow these detailed instructions.

## Core Principles

1. **BDD-Style Structure** -- Use Mocha's `describe`/`it` blocks to organize tests in a behavior-driven style. Each `describe` groups related tests; each `it` asserts a single behavior.
2. **Chai Assertion Clarity** -- Use Chai's `expect` style for readable assertions. Prefer specific matchers (`to.equal`, `to.deep.equal`, `to.include`) over generic ones (`to.be.ok`).
3. **Sinon Isolation** -- Use Sinon stubs, spies, and mocks to isolate units under test. Always restore stubs in `afterEach` using sandboxes to prevent test pollution.
4. **Async Test Patterns** -- Handle asynchronous code with `async/await`, returning promises, or Mocha's `done` callback. Never mix approaches within a single test.
5. **Lifecycle Hook Discipline** -- Use `before` for one-time setup, `beforeEach` for per-test setup, `afterEach` for cleanup, and `after` for teardown. Keep hooks focused and minimal.
6. **Test Independence** -- Every test must pass when run alone or in any order. Never rely on shared mutable state or side effects from other tests.
7. **Descriptive Naming** -- Write test names that describe the expected behavior: `'should return 404 when user is not found'` rather than `'test not found'`.

## When to Use This Skill

- When writing unit tests for JavaScript/TypeScript modules, functions, or classes
- When testing Express.js or Node.js API endpoints
- When setting up Mocha with Chai and Sinon for a project
- When debugging failing or flaky Mocha tests
- When configuring Mocha for CI/CD pipelines
- When testing async operations (promises, callbacks, event emitters)
- When working with `describe`, `it`, `expect`, `sinon.stub`, or `.mocharc.yml`

## Project Structure

```
project-root/
├── .mocharc.yml                    # Mocha configuration
├── src/
│   ├── services/
│   │   ├── user.service.ts
│   │   ├── auth.service.ts
│   │   └── payment.service.ts
│   ├── models/
│   │   └── user.model.ts
│   ├── utils/
│   │   └── validators.ts
│   └── app.ts
├── test/
│   ├── unit/                       # Unit tests
│   │   ├── services/
│   │   │   ├── user.service.test.ts
│   │   │   ├── auth.service.test.ts
│   │   │   └── payment.service.test.ts
│   │   └── utils/
│   │       └── validators.test.ts
│   ├── integration/                # Integration tests
│   │   ├── api/
│   │   │   ├── users.api.test.ts
│   │   │   └── auth.api.test.ts
│   │   └── database/
│   │       └── user.repo.test.ts
│   ├── fixtures/                   # Test data
│   │   ├── users.fixture.ts
│   │   └── products.fixture.ts
│   ├── helpers/                    # Shared test utilities
│   │   ├── setup.ts
│   │   └── factories.ts
│   └── mocha.setup.ts              # Global test setup
├── coverage/                       # Coverage reports
└── package.json
```

## Configuration

### .mocharc.yml

```yaml
require:
  - ts-node/register
  - test/mocha.setup.ts
spec: 'test/**/*.test.ts'
recursive: true
timeout: 10000
reporter: spec
exit: true
```

### mocha.setup.ts

```typescript
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);

// Global hooks
before(function () {
  console.log('Test suite starting...');
});

after(function () {
  console.log('Test suite complete.');
});
```

## Chai Assertion Patterns

### Equality and Type Checks

```typescript
import { expect } from 'chai';

describe('Chai Assertions', () => {
  it('should check equality', () => {
    expect(42).to.equal(42);
    expect('hello').to.equal('hello');
    expect({ a: 1 }).to.deep.equal({ a: 1 }); // Deep comparison
    expect([1, 2, 3]).to.deep.equal([1, 2, 3]);
  });

  it('should check types', () => {
    expect('hello').to.be.a('string');
    expect(42).to.be.a('number');
    expect(true).to.be.a('boolean');
    expect([]).to.be.an('array');
    expect({}).to.be.an('object');
    expect(null).to.be.null;
    expect(undefined).to.be.undefined;
  });

  it('should check inclusion', () => {
    expect('hello world').to.include('world');
    expect([1, 2, 3]).to.include(2);
    expect({ a: 1, b: 2 }).to.include({ a: 1 });
    expect([{ id: 1 }, { id: 2 }]).to.deep.include({ id: 1 });
  });

  it('should check numeric ranges', () => {
    expect(10).to.be.above(5);
    expect(10).to.be.below(20);
    expect(10).to.be.at.least(10);
    expect(10).to.be.at.most(10);
    expect(10).to.be.within(5, 15);
  });

  it('should check object properties', () => {
    const user = { name: 'Alice', age: 30, role: 'admin' };
    expect(user).to.have.property('name');
    expect(user).to.have.property('name', 'Alice');
    expect(user).to.have.all.keys('name', 'age', 'role');
    expect(user).to.have.any.keys('name', 'email');
  });

  it('should check exceptions', () => {
    const throwError = () => {
      throw new Error('Something broke');
    };
    expect(throwError).to.throw(Error);
    expect(throwError).to.throw('Something broke');
    expect(throwError).to.throw(/broke/);
  });
});
```

## Sinon Mocking Patterns

### Stubs and Spies

```typescript
import { expect } from 'chai';
import sinon, { SinonSandbox } from 'sinon';
import { UserService } from '../../src/services/user.service';
import { UserRepository } from '../../src/repositories/user.repository';

describe('UserService', () => {
  let sandbox: SinonSandbox;
  let userService: UserService;
  let userRepoStub: sinon.SinonStubbedInstance<UserRepository>;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    userRepoStub = sandbox.createStubInstance(UserRepository);
    userService = new UserService(userRepoStub as any);
  });

  afterEach(() => {
    sandbox.restore(); // Critical: always restore stubs
  });

  describe('getUser', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', name: 'Alice', email: 'alice@example.com' };
      userRepoStub.findById.resolves(mockUser);

      const result = await userService.getUser('1');

      expect(result).to.deep.equal(mockUser);
      expect(userRepoStub.findById).to.have.been.calledOnceWith('1');
    });

    it('should throw when user not found', async () => {
      userRepoStub.findById.resolves(null);

      await expect(userService.getUser('999')).to.be.rejectedWith('User not found');
    });

    it('should propagate repository errors', async () => {
      userRepoStub.findById.rejects(new Error('Database connection failed'));

      await expect(userService.getUser('1')).to.be.rejectedWith('Database connection failed');
    });
  });

  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      const userData = { name: 'Bob', email: 'bob@example.com', password: 'plaintext123' };
      const createdUser = { id: '2', name: 'Bob', email: 'bob@example.com' };

      userRepoStub.findByEmail.resolves(null);
      userRepoStub.create.resolves(createdUser);

      const result = await userService.createUser(userData);

      expect(result).to.deep.equal(createdUser);
      expect(userRepoStub.create).to.have.been.calledOnce;

      // Verify password was not stored in plain text
      const createCall = userRepoStub.create.firstCall;
      expect(createCall.args[0].password).to.not.equal('plaintext123');
    });

    it('should reject duplicate emails', async () => {
      userRepoStub.findByEmail.resolves({ id: '1', email: 'bob@example.com' });

      await expect(
        userService.createUser({ name: 'Bob', email: 'bob@example.com', password: 'pass' })
      ).to.be.rejectedWith('Email already exists');
    });
  });
});
```

### Spying on Callbacks and Events

```typescript
import { expect } from 'chai';
import sinon from 'sinon';
import { EventEmitter } from 'events';

describe('Event Handling', () => {
  it('should emit events in correct order', () => {
    const emitter = new EventEmitter();
    const spy = sinon.spy();

    emitter.on('data', spy);
    emitter.emit('data', { id: 1 });
    emitter.emit('data', { id: 2 });

    expect(spy).to.have.been.calledTwice;
    expect(spy.firstCall).to.have.been.calledWith({ id: 1 });
    expect(spy.secondCall).to.have.been.calledWith({ id: 2 });
  });

  it('should spy on method calls', () => {
    const calculator = {
      add: (a: number, b: number) => a + b,
    };
    const spy = sinon.spy(calculator, 'add');

    const result = calculator.add(2, 3);

    expect(result).to.equal(5);
    expect(spy).to.have.been.calledOnceWith(2, 3);
    expect(spy).to.have.returned(5);
    spy.restore();
  });
});
```

### Fake Timers

```typescript
import { expect } from 'chai';
import sinon from 'sinon';

describe('Timer-Based Functions', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('should debounce function calls', () => {
    const callback = sinon.spy();

    function debounce(fn: Function, delay: number) {
      let timer: NodeJS.Timeout;
      return (...args: any[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
      };
    }

    const debounced = debounce(callback, 300);

    debounced('a');
    debounced('b');
    debounced('c');

    expect(callback).to.not.have.been.called;
    clock.tick(300);
    expect(callback).to.have.been.calledOnceWith('c');
  });

  it('should handle retry with exponential backoff', async () => {
    const apiCall = sinon.stub();
    apiCall.onFirstCall().rejects(new Error('Timeout'));
    apiCall.onSecondCall().rejects(new Error('Timeout'));
    apiCall.onThirdCall().resolves({ data: 'success' });

    // Assume retryWithBackoff calls setTimeout between retries
    // Test verifies the timing and eventual success
  });
});
```

## Testing Express.js APIs

```typescript
import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import sinon from 'sinon';

describe('Users API', () => {
  let app: express.Application;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    app = createApp(); // Factory function that creates fresh Express app
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('GET /api/users', () => {
    it('should return all users', async () => {
      const res = await request(app).get('/api/users').expect(200);

      expect(res.body).to.be.an('array');
      expect(res.body.length).to.be.greaterThan(0);
      expect(res.body[0]).to.have.property('id');
      expect(res.body[0]).to.have.property('name');
      expect(res.body[0]).to.have.property('email');
    });

    it('should paginate results', async () => {
      const res = await request(app).get('/api/users?page=1&limit=5').expect(200);

      expect(res.body).to.be.an('array');
      expect(res.body.length).to.be.at.most(5);
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const newUser = { name: 'Alice', email: 'alice@example.com', password: 'Secure123!' };

      const res = await request(app).post('/api/users').send(newUser).expect(201);

      expect(res.body).to.have.property('id');
      expect(res.body.name).to.equal('Alice');
      expect(res.body.email).to.equal('alice@example.com');
      expect(res.body).to.not.have.property('password');
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ name: 'Bob', email: 'not-an-email', password: 'pass' })
        .expect(400);

      expect(res.body).to.have.property('error');
      expect(res.body.error).to.include('email');
    });

    it('should return 409 for duplicate email', async () => {
      const user = { name: 'Alice', email: 'existing@example.com', password: 'Secure123!' };
      await request(app).post('/api/users').send(user);

      const res = await request(app).post('/api/users').send(user).expect(409);

      expect(res.body.error).to.include('already exists');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return 404 for non-existent user', async () => {
      const res = await request(app).get('/api/users/nonexistent-id').expect(404);

      expect(res.body).to.have.property('error');
    });
  });
});
```

## Async Test Patterns

```typescript
import { expect } from 'chai';

describe('Async Patterns', () => {
  // Pattern 1: async/await (preferred)
  it('should handle async with await', async () => {
    const result = await fetchData();
    expect(result).to.deep.equal({ status: 'ok' });
  });

  // Pattern 2: returning a promise
  it('should handle returned promise', () => {
    return fetchData().then((result) => {
      expect(result).to.deep.equal({ status: 'ok' });
    });
  });

  // Pattern 3: done callback (for legacy code)
  it('should handle done callback', (done) => {
    fetchDataCallback((err, result) => {
      try {
        expect(err).to.be.null;
        expect(result).to.deep.equal({ status: 'ok' });
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  // Pattern 4: chai-as-promised
  it('should assert on rejected promises', async () => {
    await expect(failingOperation()).to.be.rejectedWith(Error, 'Something failed');
  });
});
```

## Best Practices

1. **Use Sinon sandboxes** -- Always create a sandbox in `beforeEach` and restore it in `afterEach`. This prevents stub leakage between tests.
2. **Prefer `expect` style** over `assert` or `should` for consistency. Chai's `expect` provides the best TypeScript support and readability.
3. **Use `async/await` for async tests** -- This is the most readable pattern and provides clear stack traces on failure. Avoid mixing with `done` callbacks.
4. **Keep tests focused** -- Each `it` block should test one specific behavior. If a test name contains "and", split it into separate tests.
5. **Use descriptive `describe` nesting** -- Nest `describe` blocks to organize by method/feature and scenario: `describe('createUser') > describe('with valid data')`.
6. **Use `chai-as-promised`** for asserting on promise rejections. `expect(promise).to.be.rejectedWith()` is cleaner than try/catch patterns.
7. **Create test fixtures** as factory functions that return fresh data for each test, avoiding shared mutable objects.
8. **Run tests in watch mode** during development with `mocha --watch` for instant feedback on code changes.
9. **Configure timeouts appropriately** -- Set global timeout in `.mocharc.yml` and override per-test with `this.timeout()` for slow operations.
10. **Use `--exit` flag** in CI to force Mocha to exit after tests complete, preventing hanging processes from open handles.

## Anti-Patterns

1. **Not restoring Sinon stubs** -- Leaked stubs affect subsequent tests and cause cryptic failures. Always use sandboxes or explicit `.restore()`.
2. **Using arrow functions in `describe`/`it`** -- Arrow functions bind `this` lexically, breaking Mocha's context features like `this.timeout()` and `this.retries()`.
3. **Mixing async patterns** -- Using both `done` callback and returning a promise in the same test causes unpredictable behavior.
4. **Forgetting `done(error)` in callbacks** -- Not calling `done()` with the error in catch blocks makes tests time out instead of failing immediately.
5. **Sharing mutable state between tests** -- Modifying objects defined in outer scopes causes ordering-dependent test failures.
6. **Testing implementation details** -- Asserting on internal method calls rather than observable behavior makes tests brittle to refactoring.
7. **Not using `deep.equal` for objects** -- Using `equal` for object comparison checks reference equality, not value equality. Use `deep.equal` for structural comparison.
8. **Skipping error path testing** -- Only testing happy paths leaves error handling untested. Always test invalid inputs, missing data, and failure scenarios.
9. **Using `this.timeout(0)` to disable timeouts** -- This masks tests that hang indefinitely. Set a generous but finite timeout instead.
10. **Not using `--recursive` flag** -- Forgetting to recurse into subdirectories means tests in nested folders are silently skipped.

## CLI Reference

```bash
# Run all tests
npx mocha

# Run specific file
npx mocha test/unit/services/user.service.test.ts

# Run tests matching pattern
npx mocha --grep "should create user"

# Run in watch mode
npx mocha --watch

# Run with timeout
npx mocha --timeout 15000

# Run with specific reporter
npx mocha --reporter dot
npx mocha --reporter json > results.json

# Run recursive
npx mocha --recursive test/

# Run with coverage (nyc/istanbul)
npx nyc mocha

# Run with bail (stop on first failure)
npx mocha --bail
```

## Setup

```bash
# Install Mocha with Chai and Sinon
npm install --save-dev mocha chai sinon

# TypeScript support
npm install --save-dev ts-node typescript @types/mocha @types/chai @types/sinon

# Chai plugins
npm install --save-dev chai-as-promised sinon-chai
npm install --save-dev @types/chai-as-promised @types/sinon-chai

# Coverage
npm install --save-dev nyc

# API testing
npm install --save-dev supertest @types/supertest

# Create config
echo 'require: ts-node/register\nspec: "test/**/*.test.ts"\nrecursive: true\ntimeout: 10000' > .mocharc.yml
```
