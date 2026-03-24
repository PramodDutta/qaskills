import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mocha and Chai Testing: Complete JavaScript Guide',
  description:
    'Master Mocha and Chai for JavaScript testing. Covers setup, describe/it blocks, Chai assertions, async testing, hooks, reporters, and Sinon mocking in this complete guide.',
  date: '2026-03-24',
  category: 'Tutorial',
  content: `
Mocha and Chai remain one of the most flexible testing combinations in the JavaScript ecosystem. While newer frameworks like Vitest and Jest offer batteries-included experiences, the Mocha-Chai pairing gives you complete control over your testing stack. This guide covers everything you need to build a production-grade test suite with Mocha, Chai, and Sinon in 2026.

## Key Takeaways

- Mocha provides the test runner and structure (describe/it/hooks) while Chai provides the assertion library, giving you maximum flexibility
- Chai supports three assertion styles: \`expect\` (BDD), \`should\` (BDD), and \`assert\` (TDD), so you can match your team's preference
- Async testing in Mocha supports callbacks, Promises, and async/await natively without any additional configuration
- Sinon.js integrates seamlessly with Mocha for stubs, spies, mocks, and fake timers
- Mocha's reporter ecosystem and plugin architecture make it adaptable to any CI/CD pipeline or workflow
- AI coding agents with QA skills from qaskills.sh generate Mocha/Chai tests with proper patterns and clean structure

---

## Setting Up Mocha and Chai

### Installation

\`\`\`bash
# Core packages
npm install --save-dev mocha chai

# TypeScript support
npm install --save-dev @types/mocha @types/chai ts-node typescript

# Sinon for mocking
npm install --save-dev sinon @types/sinon

# NYC for code coverage
npm install --save-dev nyc
\`\`\`

### Project Configuration

\`\`\`json
// .mocharc.json
{
  "require": ["ts-node/register"],
  "spec": "test/**/*.spec.ts",
  "timeout": 5000,
  "recursive": true,
  "reporter": "spec",
  "exit": true
}
\`\`\`

\`\`\`json
// package.json scripts
{
  "scripts": {
    "test": "mocha",
    "test:watch": "mocha --watch",
    "test:coverage": "nyc mocha",
    "test:ci": "mocha --reporter mocha-junit-reporter"
  }
}
\`\`\`

\`\`\`json
// tsconfig.json (for TypeScript projects)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*", "test/**/*"]
}
\`\`\`

---

## Describe, It, and Context Blocks

Mocha uses \`describe\` and \`it\` blocks to create a hierarchical test structure that reads like documentation.

\`\`\`typescript
import { expect } from 'chai';
import { UserService } from '../src/user-service';
import { InMemoryUserRepo } from '../src/repos/in-memory-user-repo';

describe('UserService', () => {
  let service: UserService;
  let repo: InMemoryUserRepo;

  beforeEach(() => {
    repo = new InMemoryUserRepo();
    service = new UserService(repo);
  });

  describe('#createUser()', () => {
    it('should create a user with valid data', () => {
      const user = service.createUser('alice', 'alice@test.com');

      expect(user).to.have.property('id');
      expect(user.username).to.equal('alice');
      expect(user.email).to.equal('alice@test.com');
    });

    it('should throw for duplicate email', () => {
      service.createUser('alice', 'alice@test.com');

      expect(() => {
        service.createUser('bob', 'alice@test.com');
      }).to.throw('Email already exists');
    });

    context('when username is invalid', () => {
      it('should reject empty username', () => {
        expect(() => {
          service.createUser('', 'valid@email.com');
        }).to.throw('Username is required');
      });

      it('should reject username shorter than 3 characters', () => {
        expect(() => {
          service.createUser('ab', 'valid@email.com');
        }).to.throw('Username must be at least 3 characters');
      });

      it('should reject username with special characters', () => {
        expect(() => {
          service.createUser('user@name', 'valid@email.com');
        }).to.throw('Username contains invalid characters');
      });
    });
  });

  describe('#findByEmail()', () => {
    it('should return the user when found', () => {
      service.createUser('alice', 'alice@test.com');

      const found = service.findByEmail('alice@test.com');

      expect(found).to.not.be.null;
      expect(found!.username).to.equal('alice');
    });

    it('should return null when not found', () => {
      const found = service.findByEmail('nonexistent@test.com');

      expect(found).to.be.null;
    });
  });
});
\`\`\`

---

## Chai Assertion Styles

Chai provides three distinct assertion styles. Choose one and use it consistently across your project.

### Expect Style (BDD - Recommended)

\`\`\`typescript
import { expect } from 'chai';

// Equality
expect(result).to.equal(42);
expect(result).to.deep.equal({ name: 'alice', age: 30 });
expect(result).to.not.equal(0);

// Type checking
expect(name).to.be.a('string');
expect(items).to.be.an('array');
expect(config).to.be.an('object');
expect(count).to.be.a('number');

// Truthiness
expect(isValid).to.be.true;
expect(isEmpty).to.be.false;
expect(nullValue).to.be.null;
expect(undefinedValue).to.be.undefined;

// Numbers
expect(score).to.be.above(90);
expect(score).to.be.below(100);
expect(score).to.be.within(0, 100);
expect(price).to.be.closeTo(9.99, 0.01);

// Strings
expect(message).to.include('success');
expect(email).to.match(/^[^@]+@[^@]+\\.[^@]+\$/);
expect(name).to.have.lengthOf(5);

// Arrays
expect(items).to.have.lengthOf(3);
expect(items).to.include('apple');
expect(items).to.deep.include({ id: 1, name: 'Widget' });
expect(items).to.be.empty;

// Objects
expect(user).to.have.property('name');
expect(user).to.have.property('age', 30);
expect(user).to.have.all.keys('name', 'email', 'age');
expect(user).to.have.any.keys('name', 'username');
expect(response).to.have.nested.property('data.users[0].name');

// Exceptions
expect(() => riskyOperation()).to.throw(Error);
expect(() => riskyOperation()).to.throw('specific message');
expect(() => riskyOperation()).to.throw(ValidationError, /invalid/);
\`\`\`

### Should Style (BDD)

\`\`\`typescript
import chai from 'chai';
chai.should();

// Same assertions with .should syntax
result.should.equal(42);
name.should.be.a('string');
items.should.have.lengthOf(3);
user.should.have.property('name');
isValid.should.be.true;

// Note: .should doesn't work on null/undefined
// Use expect for those cases
\`\`\`

### Assert Style (TDD)

\`\`\`typescript
import { assert } from 'chai';

assert.equal(result, 42);
assert.deepEqual(obj, { name: 'alice' });
assert.isString(name);
assert.isArray(items);
assert.isTrue(isValid);
assert.isNull(nullValue);
assert.lengthOf(items, 3);
assert.include(items, 'apple');
assert.property(user, 'name');
assert.throws(() => riskyOperation(), Error);
\`\`\`

---

## Async Testing

Mocha handles asynchronous tests through three patterns: callbacks, Promises, and async/await.

### Async/Await (Recommended)

\`\`\`typescript
describe('OrderService', () => {
  let orderService: OrderService;

  beforeEach(async () => {
    orderService = new OrderService();
    await orderService.initialize();
  });

  it('should create an order', async () => {
    const order = await orderService.create({
      items: [{ productId: 'p1', quantity: 2 }],
      customerId: 'c1',
    });

    expect(order.id).to.be.a('string');
    expect(order.status).to.equal('pending');
    expect(order.items).to.have.lengthOf(1);
  });

  it('should reject empty orders', async () => {
    try {
      await orderService.create({
        items: [],
        customerId: 'c1',
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).to.equal('Order must have at least one item');
    }
  });

  // Cleaner error testing with chai-as-promised
  it('should reject empty orders (chai-as-promised)', async () => {
    const promise = orderService.create({
      items: [],
      customerId: 'c1',
    });

    await expect(promise).to.be.rejectedWith(
      'Order must have at least one item'
    );
  });
});
\`\`\`

### Promise-Based

\`\`\`typescript
it('should fetch user data', () => {
  return userService.fetchUser('alice')
    .then((user) => {
      expect(user.name).to.equal('alice');
      expect(user.active).to.be.true;
    });
});
\`\`\`

### Callback-Based (Legacy)

\`\`\`typescript
it('should read configuration file', (done) => {
  configService.load('/path/to/config', (err, config) => {
    if (err) return done(err);

    expect(config).to.have.property('database');
    expect(config.database.host).to.equal('localhost');
    done();
  });
});
\`\`\`

---

## Hooks: before, after, beforeEach, afterEach

Hooks provide setup and teardown logic at different levels of the test hierarchy.

\`\`\`typescript
describe('Database Integration Tests', () => {
  let db: Database;

  before(async () => {
    // Runs once before all tests in this describe block
    db = await Database.connect('test-db');
    await db.migrate();
  });

  beforeEach(async () => {
    // Runs before each test - seed clean data
    await db.seed();
  });

  afterEach(async () => {
    // Runs after each test - clear data
    await db.truncateAll();
  });

  after(async () => {
    // Runs once after all tests
    await db.disconnect();
  });

  describe('User queries', () => {
    beforeEach(async () => {
      // Additional setup for this nested block
      await db.insert('users', [
        { name: 'alice', email: 'alice@test.com' },
        { name: 'bob', email: 'bob@test.com' },
      ]);
    });

    it('should find user by email', async () => {
      const user = await db.query(
        'SELECT * FROM users WHERE email = ?',
        ['alice@test.com']
      );
      expect(user).to.not.be.null;
      expect(user.name).to.equal('alice');
    });

    it('should count all users', async () => {
      const count = await db.query('SELECT COUNT(*) as count FROM users');
      expect(count.count).to.equal(2);
    });
  });
});
\`\`\`

---

## Sinon.js Mocking Integration

Sinon provides spies, stubs, mocks, and fake timers for isolating dependencies in Mocha tests.

### Spies

\`\`\`typescript
import sinon from 'sinon';
import { expect } from 'chai';

describe('EventEmitter', () => {
  it('should call handler when event is emitted', () => {
    const handler = sinon.spy();
    const emitter = new EventEmitter();

    emitter.on('data', handler);
    emitter.emit('data', { value: 42 });

    expect(handler.calledOnce).to.be.true;
    expect(handler.calledWith({ value: 42 })).to.be.true;
  });

  it('should call handler with correct arguments', () => {
    const handler = sinon.spy();
    const emitter = new EventEmitter();

    emitter.on('data', handler);
    emitter.emit('data', 'first');
    emitter.emit('data', 'second');

    expect(handler.callCount).to.equal(2);
    expect(handler.firstCall.args[0]).to.equal('first');
    expect(handler.secondCall.args[0]).to.equal('second');
  });
});
\`\`\`

### Stubs

\`\`\`typescript
describe('PaymentProcessor', () => {
  let processor: PaymentProcessor;
  let gatewayStub: sinon.SinonStubbedInstance<PaymentGateway>;

  beforeEach(() => {
    gatewayStub = sinon.createStubInstance(PaymentGateway);
    processor = new PaymentProcessor(gatewayStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should process successful payment', async () => {
    gatewayStub.charge.resolves({
      success: true,
      transactionId: 'txn-123',
    });

    const result = await processor.processPayment(100.00, 'card-token');

    expect(result.success).to.be.true;
    expect(gatewayStub.charge.calledOnce).to.be.true;
    expect(gatewayStub.charge.calledWith(100.00, 'card-token')).to.be.true;
  });

  it('should handle gateway failure', async () => {
    gatewayStub.charge.rejects(new Error('Gateway unavailable'));

    const result = await processor.processPayment(50.00, 'card-token');

    expect(result.success).to.be.false;
    expect(result.error).to.equal('Gateway unavailable');
  });

  it('should retry on timeout', async () => {
    gatewayStub.charge
      .onFirstCall().rejects(new Error('Timeout'))
      .onSecondCall().resolves({ success: true, transactionId: 'txn-456' });

    const result = await processor.processPayment(75.00, 'card-token');

    expect(result.success).to.be.true;
    expect(gatewayStub.charge.calledTwice).to.be.true;
  });
});
\`\`\`

### Fake Timers

\`\`\`typescript
describe('CacheService', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('should expire cached items after TTL', () => {
    const cache = new CacheService({ ttl: 60000 }); // 60 seconds

    cache.set('key', 'value');
    expect(cache.get('key')).to.equal('value');

    clock.tick(59000); // 59 seconds later
    expect(cache.get('key')).to.equal('value');

    clock.tick(2000); // 61 seconds total
    expect(cache.get('key')).to.be.undefined;
  });

  it('should call refresh callback before expiry', () => {
    const onRefresh = sinon.spy();
    const cache = new CacheService({
      ttl: 60000,
      refreshBefore: 10000,
      onRefresh,
    });

    cache.set('key', 'value');

    clock.tick(50000); // 50 seconds - triggers refresh
    expect(onRefresh.calledWith('key')).to.be.true;
  });
});
\`\`\`

---

## HTTP Request Testing

\`\`\`typescript
import sinon from 'sinon';
import { expect } from 'chai';

describe('ApiClient', () => {
  let fetchStub: sinon.SinonStub;
  let client: ApiClient;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
    client = new ApiClient('https://api.example.com');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should fetch users successfully', async () => {
    const mockResponse = {
      ok: true,
      json: sinon.stub().resolves([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]),
    };
    fetchStub.resolves(mockResponse as any);

    const users = await client.getUsers();

    expect(users).to.have.lengthOf(2);
    expect(users[0].name).to.equal('Alice');
    expect(fetchStub.calledWith(
      'https://api.example.com/users'
    )).to.be.true;
  });

  it('should throw on HTTP error', async () => {
    fetchStub.resolves({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as any);

    try {
      await client.getUsers();
      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.message).to.include('500');
    }
  });
});
\`\`\`

---

## Reporters

Mocha supports multiple reporters for different environments.

\`\`\`bash
# Spec reporter (default, verbose)
mocha --reporter spec

# Dot reporter (minimal)
mocha --reporter dot

# Nyan reporter (fun)
mocha --reporter nyan

# JUnit XML for CI
npm install --save-dev mocha-junit-reporter
mocha --reporter mocha-junit-reporter --reporter-options output=results.xml

# Multiple reporters simultaneously
npm install --save-dev mocha-multi-reporters
mocha --reporter mocha-multi-reporters --reporter-options configFile=reporter-config.json
\`\`\`

\`\`\`json
// reporter-config.json
{
  "reporterEnabled": "spec, mocha-junit-reporter",
  "mochaJunitReporterReporterOptions": {
    "mochaFile": "./test-results/results.xml"
  }
}
\`\`\`

---

## Code Coverage with NYC

\`\`\`json
// .nycrc.json
{
  "extends": "@istanbuljs/nyc-config-typescript",
  "all": true,
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts", "src/**/*.test.ts"],
  "reporter": ["text", "html", "lcov"],
  "check-coverage": true,
  "branches": 80,
  "functions": 80,
  "lines": 80,
  "statements": 80
}
\`\`\`

\`\`\`bash
# Run with coverage
nyc mocha

# Check coverage thresholds
nyc check-coverage
\`\`\`

---

## Integrating QA Skills for Mocha/Chai

Accelerate your test suite with AI-powered QA skills:

\`\`\`bash
npx @qaskills/cli add mocha-chai-testing
\`\`\`

This skill configures your AI coding agent to generate Mocha tests with proper describe/it structure, Chai assertions using the expect style, Sinon mocking patterns, and async/await handling.

---

## 10 Best Practices for Mocha/Chai Testing

1. **Choose one Chai assertion style and stick with it.** Mixing expect, should, and assert in the same project creates confusion. Expect is the most widely used.

2. **Always call \`sinon.restore()\` in afterEach.** Failing to restore stubs leaks mocked behavior into subsequent tests and causes mysterious failures.

3. **Use context blocks to group related scenarios.** Nest \`context('when ...')\` inside \`describe\` to clearly communicate the conditions under which tests run.

4. **Set appropriate timeouts.** The default 2-second timeout is too short for integration tests. Set per-test timeouts with \`this.timeout(10000)\` or configure in \`.mocharc.json\`.

5. **Use \`--exit\` flag for CI.** Mocha hangs if there are open handles (database connections, timers). The \`--exit\` flag forces cleanup, but fix the root cause in development.

6. **Prefer async/await over callbacks.** Callback-based tests are harder to read and more error-prone. Convert legacy callback tests to async/await incrementally.

7. **Structure files to mirror source.** If source is \`src/services/user-service.ts\`, the test should be \`test/services/user-service.spec.ts\`.

8. **Use chai-as-promised for async assertions.** It provides cleaner syntax for testing rejected promises: \`expect(promise).to.be.rejectedWith('error')\`.

9. **Keep hooks minimal.** Hooks should only set up the minimum state needed. Complex setup logic should be extracted into helper functions.

10. **Watch mode during development.** Run \`mocha --watch\` to get instant feedback as you write tests. It re-runs only affected tests.

---

## 8 Anti-Patterns to Avoid

1. **Forgetting to return promises in tests.** If an async test does not use async/await and does not return the promise, Mocha treats it as synchronous and it always passes.

2. **Using arrow functions with Mocha's \`this\`.** Arrow functions bind \`this\` lexically, which breaks \`this.timeout()\`, \`this.retries()\`, and \`this.slow()\`. Use regular functions when you need Mocha's context.

3. **Mocking too many things.** If your test requires ten stubs to work, the code under test has too many dependencies. Refactor the code, not the test.

4. **Testing Mocha/Chai behavior.** Do not write tests that verify Chai assertions work correctly. Trust the framework. Test your code.

5. **Sharing state across describe blocks.** Variables defined in one describe block and mutated in another create coupling. Each describe should be self-contained.

6. **Using \`only\` and \`skip\` in committed code.** \`describe.only\` and \`it.skip\` are useful locally but should never be committed. Use a lint rule to prevent this.

7. **Deep nesting beyond three levels.** More than three levels of nesting (describe > context > context) makes tests hard to navigate. Extract deeply nested groups into separate files.

8. **Ignoring test output.** If the spec reporter shows unexpected test names or ordering, it indicates structural problems. Read the output as documentation.

---

## Conclusion

Mocha and Chai offer a flexible, modular approach to JavaScript testing that gives you complete control over every aspect of your test stack. Combined with Sinon for mocking and NYC for coverage, this combination handles everything from unit tests to complex integration scenarios. While frameworks like Jest and Vitest offer more batteries-included experiences, the Mocha/Chai approach remains relevant for teams that value explicit configuration and composability. Use QA skills from qaskills.sh to help your AI coding agents generate well-structured Mocha/Chai tests from the start.
`,
};
