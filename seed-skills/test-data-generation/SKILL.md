---
name: Test Data Generation
description: Test data generation and management skill covering Faker.js, factory patterns, builders, database seeding, and test data strategies for reliable test suites.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [test-data, faker, factory, builder, seeding, data-management]
testingTypes: [unit, integration, e2e]
frameworks: []
languages: [typescript, python, java]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Test Data Generation Skill

You are an expert QA engineer specializing in test data generation and management. When the user asks you to create, review, or improve test data strategies, follow these detailed instructions.

## Core Principles

1. **Deterministic when needed** -- Use seeded randomness for reproducible test runs.
2. **Realistic but safe** -- Data should look real but never contain actual PII.
3. **Minimal and focused** -- Generate only the data attributes each test actually needs.
4. **Independent** -- Each test creates its own data; never share mutable state.
5. **Clean up after** -- Remove generated data in teardown to prevent pollution.

## Project Structure

```
tests/
  data/
    factories/
      user.factory.ts
      product.factory.ts
      order.factory.ts
    builders/
      user.builder.ts
      order.builder.ts
    fixtures/
      static-data.json
    seeders/
      db-seeder.ts
      api-seeder.ts
    generators/
      fake-data.ts
      credit-card.ts
  utils/
    data-cleanup.ts
```

## Faker.js -- TypeScript

### Installation

```bash
npm install --save-dev @faker-js/faker
```

### Basic Usage

```typescript
import { faker } from '@faker-js/faker';

// Generate consistent data with a seed
faker.seed(12345);

// User data
const user = {
  id: faker.string.uuid(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  avatar: faker.image.avatar(),
  address: {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zip: faker.location.zipCode(),
    country: faker.location.country(),
  },
  company: faker.company.name(),
  jobTitle: faker.person.jobTitle(),
  bio: faker.lorem.paragraph(),
  createdAt: faker.date.past().toISOString(),
};

// Product data
const product = {
  id: faker.string.uuid(),
  name: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  price: parseFloat(faker.commerce.price({ min: 1, max: 1000 })),
  category: faker.commerce.department(),
  sku: faker.string.alphanumeric(10).toUpperCase(),
  inStock: faker.datatype.boolean(),
  rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
  imageUrl: faker.image.url(),
};

// Financial data
const transaction = {
  id: faker.string.uuid(),
  amount: parseFloat(faker.finance.amount({ min: 10, max: 5000 })),
  currency: faker.finance.currencyCode(),
  accountNumber: faker.finance.accountNumber(),
  routingNumber: faker.finance.routingNumber(),
  transactionType: faker.helpers.arrayElement(['credit', 'debit', 'transfer']),
  date: faker.date.recent({ days: 30 }).toISOString(),
  status: faker.helpers.arrayElement(['pending', 'completed', 'failed', 'reversed']),
};
```

### Locale-Specific Data

```typescript
import { faker } from '@faker-js/faker';
import { fakerDE } from '@faker-js/faker';
import { fakerJA } from '@faker-js/faker';

// German locale
const germanUser = {
  name: fakerDE.person.fullName(),
  address: fakerDE.location.streetAddress(),
  phone: fakerDE.phone.number(),
};

// Japanese locale
const japaneseUser = {
  name: fakerJA.person.fullName(),
  address: fakerJA.location.streetAddress(),
};
```

## Factory Pattern

### TypeScript Factory

```typescript
// factories/user.factory.ts
import { faker } from '@faker-js/faker';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'viewer';
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: 'admin' | 'user' | 'viewer';
}

export class UserFactory {
  static create(overrides: Partial<User> = {}): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: 'user',
      isActive: true,
      createdAt: faker.date.past().toISOString(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createInput(overrides: Partial<CreateUserInput> = {}): CreateUserInput {
    return {
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      password: faker.internet.password({ length: 12, memorable: false }),
      role: 'user',
      ...overrides,
    };
  }

  static createAdmin(overrides: Partial<User> = {}): User {
    return this.create({ role: 'admin', ...overrides });
  }

  static createInactive(overrides: Partial<User> = {}): User {
    return this.create({ isActive: false, ...overrides });
  }
}
```

### Using Factories in Tests

```typescript
import { test, expect } from '@playwright/test';
import { UserFactory } from '../data/factories/user.factory';

test('should create a new user', async ({ request }) => {
  const userData = UserFactory.createInput();

  const response = await request.post('/api/users', { data: userData });
  expect(response.status()).toBe(201);

  const body = await response.json();
  expect(body.email).toBe(userData.email);
  expect(body.firstName).toBe(userData.firstName);
});

test('should list users with pagination', async ({ request }) => {
  // Create multiple users
  const users = UserFactory.createMany(15);
  for (const user of users) {
    await request.post('/api/users', {
      data: UserFactory.createInput({
        email: user.email,
        firstName: user.firstName,
      }),
    });
  }

  const response = await request.get('/api/users?page=1&pageSize=10');
  const body = await response.json();
  expect(body.data.length).toBe(10);
  expect(body.total).toBeGreaterThanOrEqual(15);
});
```

## Builder Pattern

### TypeScript Builder

```typescript
// builders/order.builder.ts
import { faker } from '@faker-js/faker';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  totalAmount: number;
  createdAt: string;
}

export class OrderBuilder {
  private order: Order;

  constructor() {
    this.order = {
      id: faker.string.uuid(),
      customerId: faker.string.uuid(),
      items: [],
      status: 'pending',
      shippingAddress: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zip: faker.location.zipCode(),
        country: 'US',
      },
      totalAmount: 0,
      createdAt: new Date().toISOString(),
    };
  }

  withCustomer(customerId: string): this {
    this.order.customerId = customerId;
    return this;
  }

  withItem(item?: Partial<OrderItem>): this {
    const newItem: OrderItem = {
      productId: item?.productId ?? faker.string.uuid(),
      name: item?.name ?? faker.commerce.productName(),
      quantity: item?.quantity ?? faker.number.int({ min: 1, max: 5 }),
      price: item?.price ?? parseFloat(faker.commerce.price({ min: 5, max: 200 })),
    };
    this.order.items.push(newItem);
    this.order.totalAmount = this.order.items.reduce(
      (sum, i) => sum + i.price * i.quantity, 0
    );
    return this;
  }

  withItems(count: number): this {
    for (let i = 0; i < count; i++) {
      this.withItem();
    }
    return this;
  }

  withStatus(status: Order['status']): this {
    this.order.status = status;
    return this;
  }

  withShippingTo(country: string): this {
    this.order.shippingAddress.country = country;
    return this;
  }

  cancelled(): this {
    return this.withStatus('cancelled');
  }

  delivered(): this {
    return this.withStatus('delivered');
  }

  build(): Order {
    if (this.order.items.length === 0) {
      this.withItem(); // Add at least one item
    }
    return { ...this.order };
  }
}

// Usage in tests
const order = new OrderBuilder()
  .withCustomer('customer-123')
  .withItem({ name: 'Widget', price: 29.99, quantity: 2 })
  .withItem({ name: 'Gadget', price: 49.99, quantity: 1 })
  .withShippingTo('US')
  .build();
```

## Python -- Faker and Factory Boy

### Faker (Python)

```python
from faker import Faker

fake = Faker()
Faker.seed(42)  # For reproducibility

user = {
    "id": fake.uuid4(),
    "email": fake.email(),
    "first_name": fake.first_name(),
    "last_name": fake.last_name(),
    "phone": fake.phone_number(),
    "address": fake.address(),
    "company": fake.company(),
    "created_at": fake.date_time_this_year().isoformat(),
}
```

### Factory Boy (Python)

```python
import factory
from faker import Faker
from myapp.models import User, Order

fake = Faker()

class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.LazyFunction(fake.uuid4)
    email = factory.LazyFunction(fake.email)
    first_name = factory.LazyFunction(fake.first_name)
    last_name = factory.LazyFunction(fake.last_name)
    role = "user"
    is_active = True

    class Params:
        admin = factory.Trait(role="admin")
        inactive = factory.Trait(is_active=False)

# Usage
user = UserFactory()
admin = UserFactory(admin=True)
inactive_users = UserFactory.create_batch(5, inactive=True)
```

## Java -- Test Data Generation

```java
import com.github.javafaker.Faker;
import java.util.Locale;

public class TestDataGenerator {
    private static final Faker faker = new Faker(new Locale("en-US"));

    public static Map<String, Object> generateUser() {
        Map<String, Object> user = new HashMap<>();
        user.put("email", faker.internet().emailAddress());
        user.put("firstName", faker.name().firstName());
        user.put("lastName", faker.name().lastName());
        user.put("phone", faker.phoneNumber().cellPhone());
        user.put("address", faker.address().fullAddress());
        return user;
    }

    public static Map<String, Object> generateProduct() {
        Map<String, Object> product = new HashMap<>();
        product.put("name", faker.commerce().productName());
        product.put("price", Double.parseDouble(faker.commerce().price()));
        product.put("category", faker.commerce().department());
        product.put("description", faker.lorem().paragraph());
        return product;
    }
}
```

## Database Seeding

```typescript
// seeders/db-seeder.ts
import { UserFactory } from '../factories/user.factory';
import { ProductFactory } from '../factories/product.factory';
import { OrderBuilder } from '../builders/order.builder';
import { db } from '../../src/database';

export class DatabaseSeeder {
  async seedUsers(count: number = 50): Promise<string[]> {
    const users = UserFactory.createMany(count);
    const ids: string[] = [];

    for (const user of users) {
      const result = await db.users.create({ data: user });
      ids.push(result.id);
    }

    return ids;
  }

  async seedProducts(count: number = 100): Promise<string[]> {
    const products = ProductFactory.createMany(count);
    const ids: string[] = [];

    for (const product of products) {
      const result = await db.products.create({ data: product });
      ids.push(result.id);
    }

    return ids;
  }

  async seedOrders(userIds: string[], productIds: string[], count: number = 200): Promise<void> {
    for (let i = 0; i < count; i++) {
      const customerId = userIds[Math.floor(Math.random() * userIds.length)];
      const order = new OrderBuilder()
        .withCustomer(customerId)
        .withItems(Math.floor(Math.random() * 5) + 1)
        .withStatus(['pending', 'confirmed', 'shipped', 'delivered'][Math.floor(Math.random() * 4)] as any)
        .build();

      await db.orders.create({ data: order });
    }
  }

  async seedAll(): Promise<void> {
    const userIds = await this.seedUsers();
    const productIds = await this.seedProducts();
    await this.seedOrders(userIds, productIds);
    console.log('Database seeded successfully');
  }

  async cleanup(): Promise<void> {
    await db.orders.deleteMany({});
    await db.products.deleteMany({});
    await db.users.deleteMany({});
    console.log('Database cleaned up');
  }
}
```

## Test Data Strategies

### 1. Just-in-Time Generation

Generate data within each test. Best for unit and integration tests.

```typescript
test('should validate email format', () => {
  const validEmail = faker.internet.email();
  const result = validateEmail(validEmail);
  expect(result).toBe(true);
});
```

### 2. Fixture-Based Data

Static data loaded from JSON files. Best for snapshot testing and deterministic scenarios.

```json
{
  "validUser": {
    "email": "test@example.com",
    "password": "ValidPass123!",
    "name": "Test User"
  },
  "invalidEmails": ["not-email", "@missing.com", "spaces here@bad.com"]
}
```

### 3. Seeded Random Data

Deterministic random data using a fixed seed. Best for reproducible randomized tests.

```typescript
beforeEach(() => {
  faker.seed(Date.now()); // Different seed each run
  // OR
  faker.seed(42); // Same data every run
});
```

### 4. API-Seeded Data

Create test data via API calls before tests run. Best for E2E tests.

```typescript
test.beforeAll(async ({ request }) => {
  const user = UserFactory.createInput();
  await request.post('/api/users', { data: user });
});
```

## Best Practices

1. **Seed random generators** -- Use fixed seeds when reproducibility matters.
2. **Use factories for complex objects** -- Factories ensure valid default data.
3. **Use builders for varied objects** -- Builders make it easy to create different variations.
4. **Generate unique data per test** -- Include timestamps or UUIDs to avoid collisions.
5. **Separate creation from assertion** -- Factory creates data; test asserts behavior.
6. **Use realistic formats** -- Phone numbers, emails, and addresses should look real.
7. **Handle cleanup** -- Delete generated data in teardown hooks.
8. **Avoid PII** -- Never use real names, emails, or SSNs in test data.
9. **Parameterize edge cases** -- Use data providers for boundary value testing.
10. **Version your fixtures** -- Static fixture files should be version-controlled.

## Anti-Patterns to Avoid

1. **Hardcoded test data** -- `"user1@test.com"` causes conflicts in parallel tests.
2. **Shared mutable data** -- Multiple tests modifying the same record causes flakiness.
3. **Over-generating** -- Creating 1000 users when 5 suffice wastes time.
4. **Ignoring data dependencies** -- Creating an order without a valid customer ID fails.
5. **No cleanup** -- Leftover test data pollutes the environment.
6. **Real PII in fixtures** -- Using actual names or emails violates privacy regulations.
7. **Non-deterministic assertions on random data** -- Do not assert exact values on random data.
8. **Global test data setup** -- `beforeAll` with shared data leads to coupled tests.
9. **Ignoring data format constraints** -- Generated data must pass validation rules.
10. **Not testing with empty/null data** -- Always include edge cases in your data strategy.
