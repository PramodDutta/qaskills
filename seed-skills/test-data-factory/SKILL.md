---
name: Test Data Factory
description: Build reusable test data factories with realistic fake data generation, relationship handling, and deterministic seeding for reproducible tests.
version: 1.0.0
author: Pramod
license: MIT
tags: [test-data, factory, faker, fixtures, seeding, mock-data, deterministic]
testingTypes: [unit, integration, e2e]
frameworks: [jest, vitest, playwright, pytest]
languages: [typescript, javascript, python, java]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Test Data Factory

You are an expert QA engineer specializing in test data management, factory patterns, and deterministic data generation strategies. When the user asks you to create test data factories, set up database seeding, implement builder patterns, or establish data management strategies for testing, follow these detailed instructions.

## Core Principles

1. **Factories over fixtures** -- Static fixture files become stale and brittle. Factories generate fresh, valid data on demand, adapting to schema changes automatically.
2. **Minimal by default, customizable when needed** -- A factory should produce a valid object with sensible defaults. Individual tests should override only the attributes they care about.
3. **Realistic but synthetic** -- Test data should look realistic (proper email formats, valid phone numbers, plausible names) but never contain actual personal information. Use Faker libraries consistently.
4. **Deterministic when debugging** -- Support seeded randomness so that a failing test can be reproduced with identical data. Log the seed in test output.
5. **Relationships are explicit** -- When creating an order, the factory should explicitly create (or accept) the associated user and products. Implicit relationships lead to orphaned data and hidden dependencies.
6. **Clean up is non-negotiable** -- Every factory-created record in a database must be cleaned up after the test. Leaked data causes flaky tests and obscures real failures.
7. **Type safety throughout** -- Factories should leverage TypeScript's type system to ensure generated data matches application interfaces. A factory that produces invalid types defeats its own purpose.

## Project Structure

```
tests/
  factories/
    base.factory.ts
    user.factory.ts
    product.factory.ts
    order.factory.ts
    review.factory.ts
    address.factory.ts
    index.ts
  builders/
    user.builder.ts
    order.builder.ts
    query.builder.ts
  seeders/
    database-seeder.ts
    api-seeder.ts
    test-environment.ts
  traits/
    user-traits.ts
    order-traits.ts
  fixtures/
    static/
      countries.json
      currencies.json
    snapshots/
      seed-data.sql
  helpers/
    cleanup.ts
    id-generator.ts
    date-generator.ts
  config/
    factory.config.ts
```

## Detailed Guide: The Base Factory Pattern

### Core Factory Class

The base factory provides the foundation for all entity factories. It handles defaults, overrides, sequences, traits, and lifecycle hooks.

```typescript
import { faker } from '@faker-js/faker';

type FactoryCallback<T> = (overrides?: Partial<T>) => T;
type AfterCreateHook<T> = (entity: T) => Promise<void>;
type TraitDefinition<T> = Partial<T> | (() => Partial<T>);

interface FactoryOptions {
  seed?: number;
}

abstract class BaseFactory<T> {
  protected faker = faker;
  private afterCreateHooks: AfterCreateHook<T>[] = [];
  private sequences: Map<string, number> = new Map();
  private registeredTraits: Map<string, TraitDefinition<T>> = new Map();

  constructor(options?: FactoryOptions) {
    if (options?.seed !== undefined) {
      this.faker.seed(options.seed);
    }
  }

  /**
   * Define the default shape of the entity.
   * Subclasses must implement this method.
   */
  abstract definition(overrides?: Partial<T>): T;

  /**
   * Build a single entity without persistence.
   */
  build(overrides?: Partial<T>): T {
    return { ...this.definition(), ...overrides } as T;
  }

  /**
   * Build multiple entities without persistence.
   */
  buildMany(count: number, overrides?: Partial<T>): T[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  /**
   * Build an entity with named traits applied.
   */
  buildWith(...traitNames: string[]): T {
    let merged: Partial<T> = {};
    for (const name of traitNames) {
      const trait = this.registeredTraits.get(name);
      if (!trait) {
        throw new Error(`Unknown trait: "${name}". Register it with registerTrait().`);
      }
      const traitValue = typeof trait === 'function' ? trait() : trait;
      merged = { ...merged, ...traitValue };
    }
    return this.build(merged);
  }

  /**
   * Build and persist an entity using registered hooks.
   */
  async create(overrides?: Partial<T>): Promise<T> {
    const entity = this.build(overrides);
    for (const hook of this.afterCreateHooks) {
      await hook(entity);
    }
    return entity;
  }

  /**
   * Build and persist multiple entities.
   */
  async createMany(count: number, overrides?: Partial<T>): Promise<T[]> {
    const entities: T[] = [];
    for (let i = 0; i < count; i++) {
      entities.push(await this.create(overrides));
    }
    return entities;
  }

  /**
   * Register a lifecycle hook that runs after create().
   */
  afterCreate(hook: AfterCreateHook<T>): this {
    this.afterCreateHooks.push(hook);
    return this;
  }

  /**
   * Register a named trait for reuse across tests.
   */
  registerTrait(name: string, definition: TraitDefinition<T>): this {
    this.registeredTraits.set(name, definition);
    return this;
  }

  /**
   * Get the next value in a named sequence.
   */
  protected sequence(name: string): number {
    const current = this.sequences.get(name) || 0;
    const next = current + 1;
    this.sequences.set(name, next);
    return next;
  }

  /**
   * Reset all sequences. Call between test suites.
   */
  resetSequences(): void {
    this.sequences.clear();
  }
}
```

### User Factory Implementation

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  avatar?: string;
  phone?: string;
  address?: Address;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
  timezone: string;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

class UserFactory extends BaseFactory<User> {
  constructor(options?: FactoryOptions) {
    super(options);
    this.registerDefaultTraits();
  }

  definition(): User {
    const firstName = this.faker.person.firstName();
    const lastName = this.faker.person.lastName();
    const seq = this.sequence('user');
    const now = new Date();

    return {
      id: this.faker.string.uuid(),
      email: `test-user-${seq}@example.com`,
      name: `${firstName} ${lastName}`,
      role: 'viewer',
      status: 'active',
      avatar: this.faker.image.avatar(),
      phone: this.faker.phone.number(),
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: true,
        timezone: 'America/New_York',
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  private registerDefaultTraits(): void {
    this.registerTrait('admin', { role: 'admin' });
    this.registerTrait('editor', { role: 'editor' });
    this.registerTrait('inactive', { status: 'inactive' });
    this.registerTrait('suspended', { status: 'suspended' });
    this.registerTrait('darkMode', {
      preferences: {
        theme: 'dark',
        language: 'en',
        notifications: true,
        timezone: 'America/New_York',
      },
    });
    this.registerTrait('withAddress', () => ({
      address: {
        street: this.faker.location.streetAddress(),
        city: this.faker.location.city(),
        state: this.faker.location.state(),
        zip: this.faker.location.zipCode(),
        country: 'US',
      },
    }));
  }
}

// Usage examples
const userFactory = new UserFactory({ seed: 42 });

// Simple user with defaults
const user = userFactory.build();

// Admin user
const admin = userFactory.build({ role: 'admin' });

// User with traits
const darkModeAdmin = userFactory.buildWith('admin', 'darkMode');

// Multiple users
const users = userFactory.buildMany(10, { status: 'active' });

// User with specific overrides
const specificUser = userFactory.build({
  email: 'specific@test.com',
  name: 'Test User',
  role: 'editor',
});
```

## Detailed Guide: The Builder Pattern for Complex Objects

When objects have many optional fields or complex construction logic, the builder pattern provides a fluent API that is more readable than nested overrides.

```typescript
class UserBuilder {
  private data: Partial<User> = {};
  private readonly factory = new UserFactory();

  constructor() {
    // Start with factory defaults
    this.data = this.factory.build();
  }

  static create(): UserBuilder {
    return new UserBuilder();
  }

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  withRole(role: User['role']): this {
    this.data.role = role;
    return this;
  }

  asAdmin(): this {
    this.data.role = 'admin';
    return this;
  }

  asEditor(): this {
    this.data.role = 'editor';
    return this;
  }

  withStatus(status: User['status']): this {
    this.data.status = status;
    return this;
  }

  active(): this {
    this.data.status = 'active';
    return this;
  }

  inactive(): this {
    this.data.status = 'inactive';
    return this;
  }

  suspended(): this {
    this.data.status = 'suspended';
    return this;
  }

  withAddress(overrides?: Partial<Address>): this {
    this.data.address = {
      street: overrides?.street ?? faker.location.streetAddress(),
      city: overrides?.city ?? faker.location.city(),
      state: overrides?.state ?? faker.location.state(),
      zip: overrides?.zip ?? faker.location.zipCode(),
      country: overrides?.country ?? 'US',
    };
    return this;
  }

  withPreferences(overrides: Partial<UserPreferences>): this {
    this.data.preferences = {
      ...this.data.preferences!,
      ...overrides,
    };
    return this;
  }

  createdDaysAgo(days: number): this {
    const date = new Date();
    date.setDate(date.getDate() - days);
    this.data.createdAt = date;
    return this;
  }

  build(): User {
    return this.data as User;
  }
}

// Usage
const adminUser = UserBuilder.create()
  .asAdmin()
  .active()
  .withName('Admin User')
  .withEmail('admin@company.com')
  .withAddress({ country: 'US', state: 'CA' })
  .build();
```

### Order Builder with Relationship Chaining

```typescript
interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  tags: string[];
  sku: string;
  inventory: number;
  status: 'draft' | 'active' | 'archived';
  createdAt: Date;
}

class OrderBuilder {
  private order: Partial<Order> = {};
  private _items: OrderItem[] = [];
  private userFactory = new UserFactory();

  static create(): OrderBuilder {
    return new OrderBuilder();
  }

  constructor() {
    this.order = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      status: 'pending',
      shippingAddress: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zip: faker.location.zipCode(),
        country: 'US',
      },
      paymentMethod: 'credit_card',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  forUser(userId: string): this {
    this.order.userId = userId;
    return this;
  }

  forNewUser(overrides?: Partial<User>): this {
    const user = this.userFactory.build(overrides);
    this.order.userId = user.id;
    return this;
  }

  addItem(product: Product, quantity: number = 1): this {
    const item: OrderItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      totalPrice: Math.round(product.price * quantity * 100) / 100,
    };
    this._items.push(item);
    return this;
  }

  withStatus(status: Order['status']): this {
    this.order.status = status;
    return this;
  }

  pending(): this { return this.withStatus('pending'); }
  confirmed(): this { return this.withStatus('confirmed'); }
  shipped(): this { return this.withStatus('shipped'); }
  delivered(): this { return this.withStatus('delivered'); }
  cancelled(): this { return this.withStatus('cancelled'); }

  withPayment(method: string): this {
    this.order.paymentMethod = method;
    return this;
  }

  withFreeShipping(): this {
    this.order.shipping = 0;
    return this;
  }

  build(): Order {
    const items = this._items;
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const shipping = this.order.shipping ?? (subtotal > 100 ? 0 : 9.99);
    const total = Math.round((subtotal + tax + shipping) * 100) / 100;

    return {
      ...this.order,
      items,
      subtotal,
      tax,
      shipping,
      total,
    } as Order;
  }
}
```

## Detailed Guide: Product Factory with Sequences

```typescript
class ProductFactory extends BaseFactory<Product> {
  private readonly categories = [
    'electronics', 'clothing', 'books', 'home', 'sports', 'toys',
  ];

  definition(): Product {
    const name = this.faker.commerce.productName();
    const seq = this.sequence('product');

    return {
      id: this.faker.string.uuid(),
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-') + `-${seq}`,
      description: this.faker.commerce.productDescription(),
      price: parseFloat(this.faker.commerce.price({ min: 1, max: 999 })),
      currency: 'USD',
      category: this.faker.helpers.arrayElement(this.categories),
      tags: this.faker.helpers.arrayElements(
        ['new', 'sale', 'popular', 'limited', 'featured'],
        { min: 1, max: 3 }
      ),
      sku: `SKU-${seq.toString().padStart(6, '0')}`,
      inventory: this.faker.number.int({ min: 0, max: 500 }),
      status: 'active',
      createdAt: this.faker.date.past(),
    };
  }
}
```

## Detailed Guide: Faker.js Integration

### Advanced Faker Usage for Domain-Specific Data

```typescript
import { faker } from '@faker-js/faker';

// Seeded Faker for reproducible tests
function createSeededFaker(seed: number) {
  const seededFaker = faker;
  seededFaker.seed(seed);
  return seededFaker;
}

// Domain-specific generators
const testDataGenerators = {
  email: {
    valid: () => faker.internet.email().toLowerCase(),
    corporate: (domain: string) =>
      `${faker.person.firstName().toLowerCase()}.${faker.person.lastName().toLowerCase()}@${domain}`,
    disposable: () =>
      `test+${faker.string.nanoid(8)}@example.com`,
    international: () =>
      faker.internet.email({ provider: 'beispiel.de' }),
  },

  password: {
    strong: () =>
      faker.internet.password({ length: 16, memorable: false, pattern: /[A-Za-z0-9!@#$%]/ }),
    weak: () => '123456',
    tooShort: () => faker.string.alpha(3),
    maxLength: () => faker.string.alpha(128),
  },

  phone: {
    us: () => faker.phone.number({ style: 'national' }),
    international: () => faker.phone.number({ style: 'international' }),
    invalid: () => '000-000-0000',
  },

  date: {
    past: (years: number = 1) => faker.date.past({ years }),
    future: (years: number = 1) => faker.date.future({ years }),
    between: (from: Date, to: Date) => faker.date.between({ from, to }),
    recent: (days: number = 7) => faker.date.recent({ days }),
    birthday: (min: number = 18, max: number = 80) =>
      faker.date.birthdate({ min, max, mode: 'age' }),
  },

  financial: {
    creditCard: () => ({
      number: faker.finance.creditCardNumber(),
      cvv: faker.finance.creditCardCVV(),
      issuer: faker.finance.creditCardIssuer(),
      expiry: `${faker.number.int({ min: 1, max: 12 }).toString().padStart(2, '0')}/${faker.number.int({ min: 26, max: 30 })}`,
    }),
    amount: (min: number = 0.01, max: number = 9999.99) =>
      parseFloat(faker.finance.amount({ min, max, dec: 2 })),
    currency: () => faker.finance.currencyCode(),
  },
};
```

### Locale-Specific Data Generation

```typescript
import { faker as fakerEN } from '@faker-js/faker/locale/en';
import { faker as fakerDE } from '@faker-js/faker/locale/de';
import { faker as fakerJA } from '@faker-js/faker/locale/ja';

type Locale = 'en' | 'de' | 'ja';

const fakerByLocale: Record<Locale, typeof fakerEN> = {
  en: fakerEN,
  de: fakerDE,
  ja: fakerJA,
};

function buildLocalizedUser(locale: Locale): User {
  const f = fakerByLocale[locale];
  const firstName = f.person.firstName();
  const lastName = f.person.lastName();

  return {
    id: f.string.uuid(),
    email: f.internet.email({ firstName, lastName }).toLowerCase(),
    name: `${firstName} ${lastName}`,
    role: 'viewer',
    status: 'active',
    preferences: {
      theme: 'light',
      language: locale,
      notifications: true,
      timezone: locale === 'de' ? 'Europe/Berlin' : locale === 'ja' ? 'Asia/Tokyo' : 'America/New_York',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

## Detailed Guide: Database Seeding

### Transaction-Based Seeder with Cleanup

```typescript
interface SeederConfig {
  clearBefore: boolean;
  seedCounts: {
    users: number;
    products: number;
    orders: number;
    reviews: number;
  };
  seed: number;
}

class DatabaseSeeder {
  private db: any;
  private config: SeederConfig;
  private userFactory: UserFactory;
  private productFactory: ProductFactory;
  private createdIds: { users: string[]; products: string[]; orders: string[] };

  constructor(db: any, config: SeederConfig) {
    this.db = db;
    this.config = config;
    this.userFactory = new UserFactory({ seed: config.seed });
    this.productFactory = new ProductFactory({ seed: config.seed + 1 });
    this.createdIds = { users: [], products: [], orders: [] };
  }

  async seed(): Promise<void> {
    if (this.config.clearBefore) {
      await this.clear();
    }

    console.log('Seeding users...');
    const users = await this.seedUsers();

    console.log('Seeding products...');
    const products = await this.seedProducts();

    console.log('Seeding orders...');
    await this.seedOrders(users, products);

    console.log('Seeding reviews...');
    await this.seedReviews(users, products);

    console.log(`Seed complete. Created ${this.createdIds.users.length} users, ` +
      `${this.createdIds.products.length} products, ` +
      `${this.createdIds.orders.length} orders.`);
  }

  private async seedUsers(): Promise<User[]> {
    const users = this.userFactory.buildMany(this.config.seedCounts.users);

    // Ensure at least one admin for testing admin flows
    users[0] = this.userFactory.build({
      role: 'admin',
      email: 'admin@test.com',
      name: 'Test Admin',
    });

    for (const user of users) {
      await this.db.insert('users', user);
      this.createdIds.users.push(user.id);
    }

    return users;
  }

  private async seedProducts(): Promise<Product[]> {
    const products = this.productFactory.buildMany(this.config.seedCounts.products);

    for (const product of products) {
      await this.db.insert('products', product);
      this.createdIds.products.push(product.id);
    }

    return products;
  }

  private async seedOrders(users: User[], products: Product[]): Promise<void> {
    for (let i = 0; i < this.config.seedCounts.orders; i++) {
      const user = faker.helpers.arrayElement(users);
      const orderProducts = faker.helpers.arrayElements(products, { min: 1, max: 4 });

      const order = OrderBuilder.create()
        .forUser(user.id)
        .build();

      // Add items from selected products
      for (const product of orderProducts) {
        order.items.push({
          productId: product.id,
          productName: product.name,
          quantity: faker.number.int({ min: 1, max: 5 }),
          unitPrice: product.price,
          totalPrice: product.price * faker.number.int({ min: 1, max: 5 }),
        });
      }

      await this.db.insert('orders', order);
      this.createdIds.orders.push(order.id);
    }
  }

  private async seedReviews(users: User[], products: Product[]): Promise<void> {
    for (let i = 0; i < this.config.seedCounts.reviews; i++) {
      const review = {
        id: faker.string.uuid(),
        userId: faker.helpers.arrayElement(users).id,
        productId: faker.helpers.arrayElement(products).id,
        rating: faker.number.int({ min: 1, max: 5 }),
        title: faker.lorem.sentence(),
        body: faker.lorem.paragraph(),
        createdAt: faker.date.recent({ days: 90 }),
      };
      await this.db.insert('reviews', review);
    }
  }

  async clear(): Promise<void> {
    // Delete in reverse dependency order
    await this.db.deleteAll('reviews');
    await this.db.deleteAll('orders');
    await this.db.deleteAll('products');
    await this.db.deleteAll('users');
  }

  async cleanup(): Promise<void> {
    // Clean up only records created by this seeder instance
    for (const orderId of this.createdIds.orders) {
      await this.db.delete('orders', orderId);
    }
    for (const productId of this.createdIds.products) {
      await this.db.delete('products', productId);
    }
    for (const userId of this.createdIds.users) {
      await this.db.delete('users', userId);
    }
  }
}
```

## Detailed Guide: Cleanup Strategies

### Automatic Cleanup with Test Hooks

```typescript
import { beforeEach, afterEach, describe, it, expect } from 'vitest';

class TestDataTracker {
  private created: { table: string; id: string }[] = [];
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  track(table: string, id: string): void {
    this.created.push({ table, id });
  }

  async cleanup(): Promise<void> {
    // Clean up in reverse order to respect foreign keys
    const reversed = [...this.created].reverse();
    for (const record of reversed) {
      try {
        await this.db.delete(record.table, record.id);
      } catch (error) {
        console.warn(`Failed to clean up ${record.table}:${record.id}: ${error}`);
      }
    }
    this.created = [];
  }
}

// Usage in test suite
describe('Order Service', () => {
  let tracker: TestDataTracker;

  beforeEach(() => {
    tracker = new TestDataTracker(db);
  });

  afterEach(async () => {
    await tracker.cleanup();
  });

  it('should create an order', async () => {
    const user = userFactory.build();
    await db.insert('users', user);
    tracker.track('users', user.id);

    const product = productFactory.build();
    await db.insert('products', product);
    tracker.track('products', product.id);

    const order = OrderBuilder.create()
      .forUser(user.id)
      .addItem(product, 2)
      .build();

    const result = await orderService.create(order);
    tracker.track('orders', result.id);

    expect(result.status).toBe('pending');
    expect(result.items).toHaveLength(1);
  });
});
```

### Transaction-Based Cleanup

```typescript
describe('Integration Tests', () => {
  let transaction: any;

  beforeEach(async () => {
    transaction = await db.beginTransaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  it('should process payment', async () => {
    const user = await transaction.insert('users', userFactory.build());
    const order = await transaction.insert('orders',
      new OrderFactory().build({ userId: user.id })
    );

    const result = await paymentService.process(order.id, { db: transaction });
    expect(result.success).toBe(true);

    // No explicit cleanup needed -- transaction rolls back automatically
  });
});
```

## Detailed Guide: Python Factory Implementation

### Factory Boy Pattern in Python

```python
# tests/factories/user_factory.py
import factory
from factory import fuzzy
from datetime import datetime, timedelta
from myapp.models import User, Address

class AddressFactory(factory.Factory):
    class Meta:
        model = Address

    street = factory.Faker('street_address')
    city = factory.Faker('city')
    state = factory.Faker('state_abbr')
    zip_code = factory.Faker('zipcode')
    country = 'US'

class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.Faker('uuid4')
    email = factory.LazyAttributeSequence(lambda obj, n: f'user-{n}@example.com')
    name = factory.LazyAttribute(lambda obj: f'{factory.Faker("first_name").generate()} {factory.Faker("last_name").generate()}')
    role = 'viewer'
    status = 'active'
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)

    class Params:
        admin = factory.Trait(role='admin')
        inactive = factory.Trait(status='inactive')
        with_address = factory.Trait(
            address=factory.SubFactory(AddressFactory)
        )

# Usage
user = UserFactory()
admin = UserFactory(admin=True)
inactive_user = UserFactory(inactive=True)
user_with_address = UserFactory(with_address=True)
ten_users = UserFactory.create_batch(10)
```

### Pytest Fixtures with Factories

```python
# tests/conftest.py
import pytest
from tests.factories import UserFactory, ProductFactory, OrderFactory

@pytest.fixture
def user_factory():
    """Provide a user factory for the test."""
    return UserFactory

@pytest.fixture
def admin_user(user_factory):
    """Create a pre-built admin user."""
    return user_factory(admin=True, email='admin@test.com')

@pytest.fixture
def sample_users(user_factory):
    """Create a batch of sample users."""
    return user_factory.create_batch(5)

@pytest.fixture
def product_factory():
    return ProductFactory

@pytest.fixture(autouse=True)
def cleanup_database(db_session):
    """Roll back all changes after each test."""
    yield
    db_session.rollback()

# Usage in tests
def test_user_creation(user_factory):
    user = user_factory(name='Test User', role='editor')
    assert user.role == 'editor'
    assert user.status == 'active'

def test_admin_access(admin_user):
    assert admin_user.role == 'admin'
    assert admin_user.email == 'admin@test.com'
```

## Detailed Guide: State Machine Factories

### Building Objects at Specific Lifecycle States

```typescript
type OrderState = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

interface StateTransition {
  from: OrderState;
  to: OrderState;
  fields: Partial<Order>;
}

const orderTransitions: StateTransition[] = [
  { from: 'pending', to: 'confirmed', fields: { updatedAt: new Date() } },
  { from: 'confirmed', to: 'shipped', fields: { updatedAt: new Date() } },
  { from: 'shipped', to: 'delivered', fields: { updatedAt: new Date() } },
  { from: 'pending', to: 'cancelled', fields: { updatedAt: new Date() } },
  { from: 'confirmed', to: 'cancelled', fields: { updatedAt: new Date() } },
];

class StatefulOrderFactory {
  private baseFactory = new OrderFactory();

  buildInState(targetState: OrderState): Order {
    const order = this.baseFactory.build({ status: targetState });
    return order;
  }

  buildLifecycle(): Record<OrderState, Order> {
    const base = this.baseFactory.build();
    const states: OrderState[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

    const lifecycle: Record<string, Order> = {};
    for (const state of states) {
      lifecycle[state] = { ...base, status: state, id: faker.string.uuid() };
    }

    return lifecycle as Record<OrderState, Order>;
  }
}

// Usage: get orders at every lifecycle stage for comprehensive testing
const statefulFactory = new StatefulOrderFactory();
const shippedOrder = statefulFactory.buildInState('shipped');
const lifecycle = statefulFactory.buildLifecycle();

describe('Order state transitions', () => {
  const states = Object.entries(lifecycle);
  for (const [state, order] of states) {
    it(`should handle order in ${state} state`, () => {
      expect(order.status).toBe(state);
    });
  }
});
```

## Configuration

### Factory Configuration File

```typescript
// tests/config/factory.config.ts
interface FactoryConfig {
  defaultSeed: number;
  locale: string;
  defaultCounts: {
    small: number;
    medium: number;
    large: number;
  };
  database: {
    cleanupStrategy: 'transaction' | 'tracker' | 'truncate';
    seedOnStart: boolean;
    seedConfig: {
      users: number;
      products: number;
      orders: number;
    };
  };
  faker: {
    seed: number;
    locale: string;
  };
}

export const factoryConfig: FactoryConfig = {
  defaultSeed: 12345,
  locale: 'en',
  defaultCounts: {
    small: 5,
    medium: 25,
    large: 100,
  },
  database: {
    cleanupStrategy: 'transaction',
    seedOnStart: true,
    seedConfig: {
      users: 10,
      products: 50,
      orders: 100,
    },
  },
  faker: {
    seed: 42,
    locale: 'en',
  },
};
```

### Factory Registry

```typescript
// tests/factories/index.ts
import { UserFactory } from './user.factory';
import { ProductFactory } from './product.factory';
import { OrderFactory } from './order.factory';
import { factoryConfig } from '../config/factory.config';

const seed = factoryConfig.defaultSeed;

export const factories = {
  user: new UserFactory({ seed }),
  product: new ProductFactory({ seed: seed + 1 }),
  order: new OrderFactory({ seed: seed + 2 }),
};

// Convenience functions
export const buildUser = (overrides?: Partial<User>) =>
  factories.user.build(overrides);
export const buildUsers = (count: number, overrides?: Partial<User>) =>
  factories.user.buildMany(count, overrides);
export const buildProduct = (overrides?: Partial<Product>) =>
  factories.product.build(overrides);
export const buildOrder = (overrides?: Partial<Order>) =>
  factories.order.build(overrides);

// Reset all factory sequences between test suites
export function resetFactories(): void {
  factories.user.resetSequences();
  factories.product.resetSequences();
  factories.order.resetSequences();
}
```

## Best Practices

1. **Use factories in every test** -- Never hardcode test data inline. Even simple tests benefit from factories because the factory ensures valid objects as the schema evolves.

2. **Override only what matters** -- A test for email validation should only override the email field. Let the factory handle the other 20 fields. This makes the test's intent clear.

3. **Name factories after domain concepts** -- Use `UserFactory`, `OrderFactory`, and `ProductFactory` instead of generic names. Each factory maps to one domain entity.

4. **Use traits for common configurations** -- Instead of building with `{ role: 'admin', status: 'active', permissions: [...] }` everywhere, create an `admin` trait that bundles these attributes.

5. **Seed Faker for reproducibility** -- Always seed the Faker instance in factory constructors. When a test fails, the seed allows exact reproduction of the failing data.

6. **Log generated data on failure** -- Configure test output to include the generated data when a test fails. Without this, debugging randomized test failures is guesswork.

7. **Use sequences for unique fields** -- Email addresses, SKUs, and slugs must be unique. Use the sequence helper to append incrementing numbers rather than relying on random generation.

8. **Build relationships explicitly** -- When a test needs an order with a specific user, pass the user ID to the order factory. Never rely on the factory's default relationship generation for tests that assert on relationships.

9. **Separate unit and integration factories** -- Unit test factories return plain objects. Integration test factories insert into the database and return the inserted record with its database-generated ID.

10. **Clean up in reverse dependency order** -- Delete orders before products, products before categories. Foreign key constraints require reverse-dependency-order cleanup.

11. **Avoid sharing mutable test data** -- Each test should create its own data. Shared "test user" objects that multiple tests modify lead to order-dependent failures.

12. **Version your seed data** -- When the schema changes, update the factories, re-generate seed data, and commit the updated snapshots. Stale seed data causes false failures.

## Anti-Patterns to Avoid

1. **God factory** -- A single factory class that builds every entity type. This becomes unmaintainable. Use one factory per domain entity.

2. **Static fixture files as primary data source** -- JSON fixture files drift from the schema. Use them only for truly static data (country lists, currency codes) and generate everything else dynamically.

3. **Factories with side effects in build()** -- A `build()` method should never insert into a database, call an API, or log to the console. Use `create()` for persistence and keep `build()` pure.

4. **Overly specific defaults** -- If the factory defaults to `email: 'john@test.com'`, every test gets the same email, causing unique constraint violations. Always use sequences or Faker for fields that need uniqueness.

5. **Missing cleanup** -- Factories that create database records without tracking them for cleanup cause test pollution. Always pair creation with a cleanup mechanism.

6. **Deeply nested overrides** -- If overriding a factory requires `{ preferences: { notifications: { email: { frequency: 'daily' } } } }`, the factory is not decomposed enough. Create separate builders for nested objects.

7. **Using real dates** -- Factories that use `new Date()` without seeding produce non-deterministic data. Use Faker's date generators with a seed, or freeze time in tests.

8. **Importing production data** -- Never seed test databases with production data dumps. Besides the privacy risk, production data contains edge cases that make tests fragile and unpredictable.

9. **Not testing your factories** -- Write unit tests for your factories. Verify that `build()` returns valid objects, that traits apply correctly, and that sequences increment.

10. **Hardcoding IDs in tests** -- Use factory-generated IDs. Hardcoded IDs like `'user-1'` collide across test files and make it impossible to run tests in parallel.

## Debugging Tips

1. **Log the seed on every test run** -- Print the Faker seed at the start of the test suite. When a test fails, re-run with the same seed to reproduce identical data.

2. **Inspect factory output** -- When a test fails unexpectedly, log the factory output with `console.log(JSON.stringify(factory.build(), null, 2))` to verify the generated data matches expectations.

3. **Check unique constraint violations** -- If tests fail with "duplicate key" errors, the factory is generating colliding values. Add sequence-based suffixes to unique fields.

4. **Verify relationship integrity** -- When an integration test fails with "foreign key violation", the factory is creating child records before parent records. Check the creation order.

5. **Test factories in isolation** -- Write unit tests for your factories. Verify that `build()` returns valid objects, that traits apply correctly, and that sequences increment.

6. **Profile seeding performance** -- If test setup is slow, measure how long seeding takes. Consider using snapshot restoration instead of re-seeding for large datasets.

7. **Check for leaked test data** -- After running the full test suite, query the database for records that should not exist. Leaked data indicates missing cleanup in one or more test files.

8. **When traits conflict**, the last trait wins. If you apply both `admin` and `editor` traits and both set the `role` field, the result depends on the order of application. Document trait conflicts in the factory.

9. **When Faker produces unexpected values**, check the seed. Faker with seed 42 always produces the same sequence. If results vary between runs, the seed is not being applied correctly.

10. **When parallel tests fail but sequential tests pass**, check for shared database state. Each parallel worker needs its own isolated dataset. Use distinct sequence namespaces or separate databases per worker.
