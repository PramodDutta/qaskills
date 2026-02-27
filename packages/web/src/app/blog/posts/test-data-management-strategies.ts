import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Data Management -- Factories, Fixtures, and Synthetic Data',
  description:
    'Complete guide to test data management strategies. Covers factory patterns, fixtures, synthetic data generation, data masking, database seeding, and test isolation.',
  date: '2026-02-22',
  category: 'Guide',
  content: `
Test data is the most underestimated challenge in test automation. Teams invest weeks building sophisticated test frameworks, configuring CI/CD pipelines, and writing elaborate assertions -- only to watch their suites crumble under the weight of poorly managed test data. Bad data causes flaky tests, leaks sensitive information, couples tests to each other, and makes debugging a nightmare. This guide covers every major test data management strategy, from factory patterns and fixtures to synthetic data generation and production data masking, so you can build test suites that are fast, isolated, and reliable.

## Key Takeaways

- **Test data management** is the practice of creating, maintaining, and cleaning up data used in automated tests -- and it directly impacts test reliability, speed, and isolation
- The **factory pattern** lets you programmatically generate test data with sensible defaults and targeted overrides, eliminating brittle hardcoded values
- **Fixtures** are ideal for static reference data and framework-specific setup/teardown, while factories excel at dynamic, composable data creation
- **Synthetic test data** generated with tools like Faker.js produces realistic data at scale without exposing real PII -- seed-based generation ensures reproducibility
- **Data masking and anonymization** let you use production-like datasets for testing while staying compliant with GDPR, CCPA, and other privacy regulations
- **Test isolation patterns** -- transaction rollback, database truncation, containerized databases -- prevent tests from polluting each other's state

---

## Why Test Data Management Matters

Every automated test needs data. A login test needs user credentials. An e-commerce checkout test needs products, a shopping cart, a shipping address, and a payment method. A reporting test needs months of historical transactions. The question is not whether you need test data, but how you create, maintain, and clean it up.

Poor test data management manifests in several ways. **Flaky tests** fail intermittently because one test modified data another test depended on. **False positives** pass because they validate against stale or incorrect expected values. **Test coupling** forces you to run tests in a specific order because test B depends on data created by test A. **Environment drift** causes tests to pass locally but fail in CI because the CI database has different seed data.

Using production data in tests is tempting -- it is realistic, varied, and already exists. But it creates serious **compliance and security risks**. GDPR Article 5 requires that personal data be processed only for its original purpose. CCPA gives consumers the right to know how their data is used. Copying production databases into test environments exposes PII to developers, CI systems, and third-party tools that were never authorized to access it. A single data breach from a test environment can cost millions in fines and reputation damage.

Good test data management enables **parallel execution** because tests do not compete for shared resources. It enables **test isolation** because each test creates and cleans up its own data. And it enables **reproducible results** because the same test input always produces the same output, regardless of when or where the test runs.

---

## The Factory Pattern

A **test data factory** is a function that programmatically creates test objects with sensible defaults, allowing you to override only the fields relevant to your specific test. Instead of constructing a full user object with 15 fields in every test, you call \`createUser({ role: 'admin' })\` and let the factory fill in everything else.

Here is a TypeScript factory pattern implementation:

\`\`\`typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'moderator';
  isActive: boolean;
  createdAt: Date;
}

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: crypto.randomUUID(),
    email: \`user-\${Date.now()}@test.example.com\`,
    name: 'Test User',
    role: 'user',
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

// Usage in tests
const regularUser = createUser();
const admin = createUser({ role: 'admin' });
const inactiveUser = createUser({ isActive: false, name: 'Deactivated' });
\`\`\`

The real power of factories emerges with **composition** -- building complex object graphs by combining factories:

\`\`\`typescript
interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'shipped' | 'delivered';
}

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

function createOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    productId: crypto.randomUUID(),
    name: 'Test Product',
    price: 29.99,
    quantity: 1,
    ...overrides,
  };
}

function createOrder(overrides: Partial<Order> = {}): Order {
  const items = overrides.items ?? [createOrderItem()];
  return {
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    items,
    total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    status: 'pending',
    ...overrides,
  };
}

// Compose: user with multiple orders
const user = createUser();
const orders = [
  createOrder({
    userId: user.id,
    items: [
      createOrderItem({ name: 'Widget', price: 9.99, quantity: 3 }),
      createOrderItem({ name: 'Gadget', price: 49.99 }),
    ],
  }),
  createOrder({ userId: user.id, status: 'delivered' }),
];
\`\`\`

**Libraries** that formalize this pattern include **Fishery** (TypeScript-native, supports traits, sequences, and async builds) and **FactoryBot.js** (inspired by Ruby's factory_bot, with associations and build strategies). Both eliminate the boilerplate of writing factory functions from scratch.

Compared with **hardcoded fixtures**, factories offer several advantages. Factories generate unique IDs automatically, preventing collision between parallel tests. They make tests self-documenting -- \`createUser({ role: 'admin' })\` clearly states the test's intent, while a fixture named \`user_fixture_3.json\` does not. And they adapt easily when the schema changes -- you update the factory once, not every fixture file.

---

## Fixture-Based Approaches

**Test fixtures** are pre-defined, static data sets loaded before tests run. They come in several forms, and each has its place.

**JSON/YAML fixture files** store data in version-controlled files that are loaded into the database before a test suite runs. This approach works well for **reference data** that rarely changes -- countries, currencies, permission definitions, configuration settings:

\`\`\`json
// fixtures/countries.json
[
  { "code": "US", "name": "United States", "currency": "USD" },
  { "code": "GB", "name": "United Kingdom", "currency": "GBP" },
  { "code": "JP", "name": "Japan", "currency": "JPY" }
]
\`\`\`

**Database snapshots** capture an entire database state and restore it before each test run. Tools like \`pg_dump\` and \`pg_restore\` make this straightforward for PostgreSQL. Snapshots are fast to restore but difficult to maintain as schemas evolve.

**Playwright fixtures** use a different meaning of "fixture" -- they are a dependency injection mechanism for test setup and teardown:

\`\`\`typescript
import { test as base, expect } from '@playwright/test';

interface TestFixtures {
  authenticatedPage: Page;
  testUser: { email: string; password: string };
}

const test = base.extend<TestFixtures>({
  testUser: async ({}, use) => {
    // Setup: create a user via API
    const user = await apiClient.createUser({
      email: \`test-\${Date.now()}@example.com\`,
      password: 'SecurePass123!',
    });
    await use(user);
    // Teardown: delete the user
    await apiClient.deleteUser(user.email);
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(testUser.email);
    await page.getByLabel('Password').fill(testUser.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/dashboard');
    await use(page);
  },
});

test('dashboard shows user name', async ({ authenticatedPage }) => {
  await expect(authenticatedPage.getByText('Welcome')).toBeVisible();
});
\`\`\`

**pytest fixtures** follow a similar pattern in Python, using decorators and dependency injection to manage test state. The \`@pytest.fixture\` decorator with \`yield\` provides setup/teardown semantics, and \`scope\` parameters control whether fixtures are per-test, per-class, per-module, or per-session.

**When to use fixtures over factories**: Choose fixtures when the data is **static and shared** (reference tables, configuration), when the data set is **small and stable**, or when you need **exact reproducibility** of specific known values. Choose factories when you need **unique data per test**, when the data is **complex and compositional**, or when you want **self-documenting tests** that show only the relevant fields.

---

## Synthetic Data Generation

**Synthetic test data** is algorithmically generated data that mimics the statistical properties and format of real data without containing any actual personal information. The most popular tool in the JavaScript ecosystem is **@faker-js/faker**, which generates realistic names, addresses, emails, phone numbers, dates, and hundreds of other data types.

Here is a comprehensive example of generating test data with Faker:

\`\`\`typescript
import { faker } from '@faker-js/faker';

// Seed for reproducibility -- same seed always produces same data
faker.seed(12345);

interface GeneratedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  createdAt: Date;
}

function generateUser(): GeneratedUser {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.phone.number(),
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zip: faker.location.zipCode(),
      country: faker.location.country(),
    },
    createdAt: faker.date.past({ years: 2 }),
  };
}

function generateOrder(userId: string): object {
  const itemCount = faker.number.int({ min: 1, max: 5 });
  const items = Array.from({ length: itemCount }, () => ({
    productId: faker.string.uuid(),
    name: faker.commerce.productName(),
    price: parseFloat(faker.commerce.price({ min: 5, max: 200 })),
    quantity: faker.number.int({ min: 1, max: 10 }),
  }));

  return {
    id: faker.string.uuid(),
    userId,
    items,
    total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    status: faker.helpers.arrayElement(['pending', 'shipped', 'delivered']),
    orderedAt: faker.date.recent({ days: 30 }),
  };
}

// Generate a dataset
const users = Array.from({ length: 100 }, () => generateUser());
const orders = users.flatMap((user) =>
  Array.from(
    { length: faker.number.int({ min: 0, max: 5 }) },
    () => generateOrder(user.id)
  )
);
\`\`\`

**Seed-based reproducibility** is critical. When you call \`faker.seed(12345)\`, every subsequent call to Faker produces deterministic output. This means the same seed generates the same dataset every time, across machines and CI runs. You can reproduce a failing test by noting its seed value and replaying the exact same data.

**Structured vs random synthetic data**: Pure random generation can produce unrealistic combinations -- a user in Tokyo with a US zip code and a German phone number. **Domain-specific generators** constrain the randomness to produce coherent records. You can build these by combining Faker's locale support (e.g., \`faker.locale = 'ja'\` for Japanese data) with custom validation logic.

Other **synthetic test data** tools include **Chance.js** (lightweight alternative to Faker), **json-schema-faker** (generates data from JSON Schema definitions), **Synth** (declarative synthetic data in YAML/JSON), and **Mockaroo** (web-based generator with export to JSON, CSV, SQL).

---

## Data Masking and Anonymization

Sometimes you need **production-like data** -- real-world distributions, edge cases, and volumes -- but you cannot use actual PII in test environments. **Data masking** replaces sensitive values with realistic but fictional substitutes, preserving the data's structure and statistical properties while removing identifying information.

Common masking techniques include:

- **Substitution**: Replace real values with fake ones (e.g., real names with Faker-generated names)
- **Shuffling**: Rearrange values within a column so individual records are no longer identifiable
- **Hashing**: Apply a one-way hash to sensitive fields, useful when you need consistent anonymization (same input always produces same output)
- **Tokenization**: Replace sensitive data with opaque tokens, maintaining a secure mapping table that never leaves the production environment
- **Redaction**: Replace values with fixed placeholders (\`***\`, \`REDACTED\`)

Here is a simple masking function for database records:

\`\`\`typescript
import { faker } from '@faker-js/faker';
import crypto from 'node:crypto';

interface CustomerRecord {
  id: number;
  email: string;
  name: string;
  ssn: string;
  phone: string;
  address: string;
  purchaseHistory: object[];
}

function maskCustomer(record: CustomerRecord): CustomerRecord {
  // Use record ID as seed for deterministic masking
  faker.seed(record.id);

  return {
    ...record,
    email: faker.internet.email(),
    name: faker.person.fullName(),
    ssn: '***-**-' + record.ssn.slice(-4), // Keep last 4 digits
    phone: faker.phone.number(),
    address: faker.location.streetAddress({ useFullAddress: true }),
    // purchaseHistory is non-PII, keep it for realistic testing
  };
}

// Deterministic hashing for referential integrity
function hashIdentifier(value: string, salt: string): string {
  return crypto
    .createHmac('sha256', salt)
    .update(value)
    .digest('hex')
    .slice(0, 16);
}
\`\`\`

**Compliance requirements** make data masking non-optional in many industries. **GDPR Article 5** mandates purpose limitation -- personal data collected for one purpose cannot be repurposed for testing without explicit consent or effective anonymization. **CCPA** gives California consumers the right to know what data is collected and how it is used. Using unmasked production data in test environments violates both regulations and can result in fines up to 4% of annual global revenue (GDPR) or \$7,500 per intentional violation (CCPA).

Tools for production-scale **data masking** include **Delphix**, **Informatica**, **IBM InfoSphere Optim**, and open-source options like **PostgreSQL Anonymizer** (pgAnonymizer) and **ARX Data Anonymization Tool**. For smaller datasets, a custom Faker-based masking pipeline often suffices.

---

## Database Seeding Strategies

**Database seeding** is the process of populating a database with initial data before tests run. The strategy you choose affects test speed, isolation, and maintainability.

**Seed scripts** are standalone programs that insert baseline data into the database. They run once before the entire test suite:

\`\`\`typescript
// seed.ts
import { db } from './database';
import { users, products, categories } from './schema';
import { faker } from '@faker-js/faker';

async function seed() {
  faker.seed(42); // Deterministic seeding

  // Clear existing data
  await db.delete(products);
  await db.delete(categories);
  await db.delete(users);

  // Seed categories (reference data)
  const categoryData = [
    { id: 1, name: 'Electronics', slug: 'electronics' },
    { id: 2, name: 'Clothing', slug: 'clothing' },
    { id: 3, name: 'Books', slug: 'books' },
  ];
  await db.insert(categories).values(categoryData);

  // Seed users
  const userData = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: i === 0 ? 'admin' : 'user',
  }));
  await db.insert(users).values(userData);

  // Seed products
  const productData = Array.from({ length: 200 }, (_, i) => ({
    id: i + 1,
    name: faker.commerce.productName(),
    price: parseFloat(faker.commerce.price()),
    categoryId: faker.helpers.arrayElement([1, 2, 3]),
    stock: faker.number.int({ min: 0, max: 500 }),
  }));
  await db.insert(products).values(productData);

  console.log('Seeded: 3 categories, 50 users, 200 products');
}

seed().catch(console.error);
\`\`\`

The key tradeoff is between **shared seed data** and **per-test data creation**:

| Approach | Speed | Isolation | Maintenance |
|---|---|---|---|
| Shared seed (run once) | Fast -- seed once, run all tests | Low -- tests share mutable state | Low -- one seed file to maintain |
| Per-suite seed (reset per file) | Medium -- re-seed between suites | Medium -- isolation within suite | Medium -- multiple seed scenarios |
| Per-test creation (factory) | Slower -- create/delete per test | High -- each test is independent | Higher -- factories for each entity |
| Transaction rollback | Fast -- auto-cleanup, no I/O | High -- each test rolls back | Low -- wrap test in transaction |

The **transaction rollback pattern** is the gold standard for test isolation with speed. Each test runs inside a database transaction that is rolled back when the test finishes, so the database returns to its original state without any explicit cleanup:

\`\`\`typescript
import { beforeEach, afterEach } from 'vitest';

let transaction: Transaction;

beforeEach(async () => {
  transaction = await db.transaction();
});

afterEach(async () => {
  await transaction.rollback();
});

test('creating a user increments count', async () => {
  await transaction.insert(users).values({ name: 'Test', email: 'test@x.com' });
  const count = await transaction.select(users).count();
  expect(count).toBe(initialCount + 1);
  // Rolled back automatically -- no cleanup needed
});
\`\`\`

---

## Test Isolation Patterns

Tests that share mutable state are a recipe for flaky failures. When test A creates a user and test B deletes all users, the outcome depends on execution order and timing. **Test isolation** ensures every test starts with a known state and leaves no side effects for other tests.

Here are the most common patterns:

**Transaction rollback** wraps each test in a database transaction and rolls it back after the test completes. It is the fastest isolation technique because it avoids disk I/O -- changes exist only in memory and are discarded. The limitation is that it does not work when the code under test manages its own transactions or when you need to test transaction behavior itself.

**Database truncation** deletes all rows from all tables between tests (or test suites). It is slower than rollback but works regardless of transaction boundaries. Use \`TRUNCATE ... CASCADE\` in PostgreSQL for speed, as it avoids row-by-row deletion.

**Container per test** uses tools like **Testcontainers** to spin up a fresh database container for each test (or test suite). This provides complete isolation -- each test gets its own PostgreSQL or MySQL instance -- but adds seconds of overhead per container startup.

**Unique prefixes and namespaces** assign a unique identifier (UUID or timestamp) to each test run and prefix all created data with it. Tests query only their own namespaced data. This allows parallel execution against a shared database without conflicts.

| Pattern | Speed | Isolation Level | Complexity | Best For |
|---|---|---|---|---|
| Transaction rollback | Very fast | High | Low | Unit/integration tests |
| Database truncation | Medium | High | Low | Integration test suites |
| Container per test | Slow (startup) | Complete | Medium | E2E tests, CI pipelines |
| Unique namespaces | Fast | Medium | Medium | Parallel test execution |

The best test suites combine multiple patterns. Use **transaction rollback** for fast-running integration tests. Use **Testcontainers** for E2E tests that need a pristine environment. Use **unique namespaces** when you need to run hundreds of tests in parallel against a shared staging database.

---

## Test Data in CI/CD

Test data management becomes more complex in CI/CD pipelines where builds run in parallel, environments are ephemeral, and speed is critical.

**Docker containers with seeded databases** are the most common pattern. Your CI pipeline starts a PostgreSQL container, runs the seed script, and executes tests against it. The container is destroyed when the pipeline completes, ensuring a clean state for the next run:

\`\`\`yaml
# .github/workflows/test.yml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_DB: testdb
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

steps:
  - uses: actions/checkout@v4
  - run: npm ci
  - run: npm run db:migrate
  - run: npm run db:seed
  - run: npm test
\`\`\`

**Caching seed data between runs** can dramatically speed up CI pipelines. If your seed script takes 30 seconds to generate 10,000 records, cache the resulting database dump and restore it instead of re-seeding from scratch. Use a cache key based on your schema version and seed script hash so the cache invalidates when either changes.

**Ephemeral environments** (preview deployments, PR environments) need their own databases with appropriate seed data. Tools like Neon branching, PlanetScale branching, and Vercel preview deployments can provision isolated database instances per pull request.

**Data volume management** matters when your test suite grows. If you seed 100,000 records per CI run, storage costs and seed times add up. Profile your seed data and keep only what your tests actually use. A test that validates pagination needs 50 records, not 100,000.

For a deeper dive into CI/CD pipeline configuration, see our [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions).

---

## Automate Test Data with AI Agents

Managing test data across multiple frameworks, databases, and environments is tedious work. AI coding agents can automate the repetitive parts -- generating factories, writing seed scripts, creating masked datasets -- when they are equipped with the right knowledge.

**QASkills** provides specialized test data skills that teach AI agents best practices for test data management:

\`\`\`bash
npx @qaskills/cli add test-data-factory
\`\`\`

This skill teaches your AI agent to generate factory functions, compose complex test objects, and implement the patterns described in this guide.

\`\`\`bash
npx @qaskills/cli add test-data-generation
\`\`\`

This skill focuses on synthetic data generation with Faker, seed-based reproducibility, and domain-specific generators.

Additional skills that complement your test data strategy:

- **\`boundary-value-generator\`** -- Generates boundary value test cases for numeric ranges, string lengths, dates, and other constrained inputs
- **\`pairwise-test-generator\`** -- Creates pairwise (all-pairs) test combinations to maximize coverage with minimal test cases
- **\`negative-test-generator\`** -- Produces negative test cases, invalid inputs, and error scenarios that are easy to overlook

Install any of them with \`npx @qaskills/cli add <skill-name>\`.

Browse all available QA skills at [qaskills.sh/skills](/skills) or read the [getting started guide](/getting-started) to set up QASkills with your AI agent.

These techniques pair well with other testing strategies covered in our guides:

- [Playwright E2E testing guide](/blog/playwright-e2e-complete-guide) -- factory patterns for Playwright fixtures
- [Fixing flaky tests](/blog/fix-flaky-tests-guide) -- how bad test data causes flakiness and how to fix it
- [TDD with AI agents](/blog/tdd-ai-agents-best-practices) -- test-driven development workflows that rely on good test data

---

## Frequently Asked Questions

### Should I use production data for testing?

You should **not** use raw production data in test environments. Production databases contain PII (names, emails, addresses, payment details) that is protected by regulations like GDPR and CCPA. Copying it into test environments exposes it to developers, CI systems, logs, and third-party tools without user consent. Instead, use **data masking** to create anonymized copies that preserve the statistical properties and edge cases of production data, or use **synthetic test data** generated with tools like Faker.js. If your organization requires production-like volumes, invest in a data masking pipeline that runs automatically when refreshing test environments.

### When should I use factories vs fixtures?

Use **factories** when your tests need unique, dynamically generated data -- user accounts, orders, transactions, or any entity where uniqueness matters for test isolation. Factories are also better when tests only care about specific fields and want defaults for everything else. Use **fixtures** for **static reference data** that does not change between tests -- countries, currencies, configuration settings, permission definitions. Many mature test suites use both: fixtures for reference data loaded once, and factories for per-test dynamic data.

### How do I handle test data for microservices?

Microservices add complexity because each service has its own database and data ownership. The key principles are: each service's test suite manages its own test data independently, use **contract testing** to verify inter-service data contracts without sharing databases, create **test doubles** (mocks, stubs) for data from upstream services, and use **Testcontainers** to spin up service-specific databases in isolation. Avoid creating a shared "test data service" that becomes a bottleneck and coupling point. For API contract testing strategies, see our [API contract testing guide](/blog/api-contract-testing-microservices).

### What are the best alternatives to Faker.js?

**@faker-js/faker** is the most popular choice in the JavaScript ecosystem, but alternatives include **Chance.js** (lighter weight, simpler API), **json-schema-faker** (generates data directly from JSON Schema definitions), **Falso** (tree-shakeable, TypeScript-first), and **Copycat** (deterministic generation based on input values, useful for consistent masking). For non-JavaScript ecosystems, **Bogus** (.NET), **Faker** (Python), and **JavaFaker** (Java) provide similar functionality. When choosing, consider **seed-based reproducibility**, **locale support**, **TypeScript types**, and **bundle size** if the library runs in a browser.

### How do I manage test data at scale?

At scale (thousands of tests, multiple teams, shared environments), test data management requires infrastructure investment. Start with **test isolation** -- transaction rollback or container-per-test ensures tests never interfere with each other. Use **data factories with Faker seeds** so every test generates its own data deterministically. Implement **database branching** (Neon, PlanetScale) so each CI pipeline or developer gets an isolated database instance without duplication overhead. **Cache seed data** in CI to avoid re-seeding on every run. Monitor test data volume -- set quotas and run cleanup jobs to prevent test databases from growing unbounded. Finally, document your test data strategy in a team runbook so every engineer follows the same patterns.
`,
};
