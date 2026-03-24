import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'TypeScript Testing Patterns: Type-Safe Testing for Modern Applications',
  description:
    'Master TypeScript testing patterns including type-safe mocking, generic function testing, Zod schema validation, discriminated unions, branded types, and advanced type-level testing strategies for robust modern applications.',
  date: '2026-03-17',
  category: 'Tutorial',
  content: `
Writing tests in **TypeScript** is not just about adding type annotations to your test files. When done right, TypeScript fundamentally changes how you design tests, catch bugs at compile time instead of runtime, and build test utilities that scale across large codebases. This guide covers every major pattern you need to write **type-safe, maintainable, and robust tests** in modern TypeScript applications.

## Key Takeaways

- **Type-safe test factories and builders** eliminate entire classes of test bugs by ensuring your test data always matches your application types
- **Mocking in TypeScript** requires deliberate patterns -- using \`satisfies\`, \`Partial<T>\`, and typed \`vi.fn()\` calls -- to avoid \`as any\` escape hatches that defeat the purpose of TypeScript
- **Zod schema testing** should validate both the happy path and the error structure, ensuring runtime validation matches your static types
- **Generic functions and utility types** need dedicated test strategies that exercise type inference, constraints, and edge cases
- **Discriminated unions and exhaustive checks** are among TypeScript's most powerful features, and your tests should verify that exhaustiveness is maintained
- **AI-assisted testing tools** combined with TypeScript-aware QA skills from [qaskills.sh](https://qaskills.sh) can generate type-safe test scaffolding that compiles correctly on the first pass

---

## 1. Why TypeScript Changes How We Test

In plain JavaScript, your tests are your only safety net. If a function expects an object with a \`name\` property and you pass one with \`nme\` instead, you will not know until the test runs -- or worse, until production.

TypeScript shifts this equation. With a well-typed codebase, the compiler catches misspelled properties, missing fields, incorrect argument types, and impossible states **before your tests even execute**. This means:

1. **Tests focus on behavior, not shape.** You no longer need tests that simply verify an object has the right keys. The compiler handles that.
2. **Test utilities become contracts.** A typed test factory that produces \`User\` objects guarantees every test gets valid data.
3. **Refactoring is safer.** When you rename a field, the compiler flags every test that references the old name -- instantly.
4. **Mocks stay honest.** A typed mock that implements \`UserService\` must satisfy the interface. If the real service adds a method, every mock breaks at compile time.

The cost? TypeScript testing requires more upfront design. You need patterns for mocking, factories, generics, and advanced types. That is exactly what this guide provides.

---

## 2. Type-Safe Test Utilities

### Typed Test Factories

A test factory is a function that produces test data with sensible defaults. In TypeScript, it should be generic and type-safe:

\`\`\`typescript
// test/factories.ts
import type { User, Product, Order } from '../src/types';

function createFactory<T>(defaults: T) {
  return (overrides?: Partial<T>): T => ({
    ...defaults,
    ...overrides,
  });
}

export const createUser = createFactory<User>({
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'member',
  createdAt: new Date('2026-01-01'),
});

export const createProduct = createFactory<Product>({
  id: 'prod-1',
  name: 'Test Product',
  price: 29.99,
  currency: 'USD',
  inStock: true,
});

// Usage in tests
const admin = createUser({ role: 'admin' });
const expensiveProduct = createProduct({ price: 999.99 });
\`\`\`

The key benefit: if you add a required field to \`User\`, the \`createFactory\` call will fail to compile until you add a default. Every test that uses the factory continues to work.

### Builder Pattern for Complex Objects

For objects with many optional fields or nested structures, the builder pattern provides a fluent API:

\`\`\`typescript
class OrderBuilder {
  private order: Order = {
    id: 'order-1',
    userId: 'user-1',
    items: [],
    status: 'pending',
    total: 0,
    createdAt: new Date(),
  };

  withId(id: string): this {
    this.order.id = id;
    return this;
  }

  withItems(items: OrderItem[]): this {
    this.order.items = items;
    this.order.total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    return this;
  }

  withStatus(status: Order['status']): this {
    this.order.status = status;
    return this;
  }

  build(): Order {
    return { ...this.order };
  }
}

// Usage
const completedOrder = new OrderBuilder()
  .withItems([{ productId: 'prod-1', price: 29.99, quantity: 2 }])
  .withStatus('completed')
  .build();
\`\`\`

### Typed Fixtures with \`satisfies\`

The \`satisfies\` operator (TypeScript 4.9+) is perfect for test fixtures because it validates the type without widening it:

\`\`\`typescript
const testUsers = {
  admin: {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin' as const,
    createdAt: new Date('2026-01-01'),
  },
  member: {
    id: 'member-1',
    name: 'Member User',
    email: 'member@example.com',
    role: 'member' as const,
    createdAt: new Date('2026-01-01'),
  },
} satisfies Record<string, User>;

// testUsers.admin.role is typed as 'admin', not string
\`\`\`

---

## 3. Mocking in TypeScript

Mocking is where most TypeScript test suites go wrong. The temptation to use \`as any\` is strong, but it defeats the entire purpose of type-safe testing.

### Type-Safe Mocks with \`vi.fn()\`

Vitest and Jest both support typed mock functions:

\`\`\`typescript
import { vi, describe, it, expect } from 'vitest';
import type { UserService } from '../src/services/user-service';

// Explicitly type the mock function
const mockGetUser = vi.fn<[string], Promise<User | null>>();

// Or create a fully typed mock object
const mockUserService: jest.Mocked<UserService> = {
  getUser: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
};

describe('UserController', () => {
  it('returns 404 when user not found', async () => {
    mockUserService.getUser.mockResolvedValue(null);

    const result = await controller.getUser('nonexistent');

    expect(result.status).toBe(404);
    expect(mockUserService.getUser).toHaveBeenCalledWith('nonexistent');
  });
});
\`\`\`

### The \`Partial<T>\` Pattern for Partial Mocks

When you only need a subset of a large interface, use \`Partial<T>\` with a cast:

\`\`\`typescript
function createMockRequest(overrides?: Partial<Request>): Request {
  const defaults: Partial<Request> = {
    method: 'GET',
    url: 'https://example.com/api/test',
    headers: new Headers({ 'content-type': 'application/json' }),
  };
  return { ...defaults, ...overrides } as Request;
}
\`\`\`

This is one of the few acceptable uses of \`as\` in tests. You are explicitly saying: "I know this does not implement the full \`Request\` interface, but it implements the parts my code actually uses." Document this assumption.

### Using \`satisfies\` for Mock Validation

\`\`\`typescript
const mockConfig = {
  apiUrl: 'https://test.api.com',
  timeout: 5000,
  retries: 3,
} satisfies AppConfig;
// Compiler error if AppConfig adds a required field
\`\`\`

### Avoiding \`as any\` -- The Escape Hatch Hierarchy

When you feel the urge to use \`as any\`, try these alternatives in order:

1. **Fix the type.** Most \`as any\` usage indicates a design problem.
2. **Use \`Partial<T>\`.** If you need a subset of an interface.
3. **Use \`satisfies\`.** If you want validation without widening.
4. **Use \`as unknown as T\`.** More explicit than \`as any\` -- it says "I am deliberately bypassing the type system."
5. **Use \`@ts-expect-error\`.** For negative tests that intentionally pass wrong types.

---

## 4. Testing Zod Schemas and Runtime Validation

Zod bridges the gap between TypeScript's compile-time types and runtime validation. Testing Zod schemas ensures your runtime checks match your static expectations.

### Testing Schema Validation

\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
  role: z.enum(['admin', 'member', 'guest']),
});

type User = z.infer<typeof UserSchema>;

describe('UserSchema', () => {
  it('accepts valid user data', () => {
    const validUser = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      age: 30,
      role: 'admin',
    };

    const result = UserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validUser);
    }
  });

  it('rejects invalid email', () => {
    const result = UserSchema.safeParse({
      name: 'Jane',
      email: 'not-an-email',
      age: 30,
      role: 'admin',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.issues.find(
        (issue) => issue.path[0] === 'email'
      );
      expect(emailError).toBeDefined();
      expect(emailError?.code).toBe('invalid_string');
    }
  });

  it('rejects missing required fields', () => {
    const result = UserSchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('coerces types when using z.coerce', () => {
    const CoercedSchema = z.object({
      age: z.coerce.number(),
      active: z.coerce.boolean(),
    });

    const result = CoercedSchema.safeParse({ age: '25', active: 'true' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.age).toBe(25);
      expect(result.data.active).toBe(true);
    }
  });
});
\`\`\`

### Testing Schema Composition

\`\`\`typescript
const BaseSchema = z.object({ id: z.string().uuid() });
const CreateSchema = BaseSchema.omit({ id: true });
const UpdateSchema = BaseSchema.partial().required({ id: true });

describe('Schema composition', () => {
  it('CreateSchema excludes id', () => {
    const result = CreateSchema.safeParse({ id: 'should-be-ignored' });
    // id is stripped because it is not in the schema
    expect(result.success).toBe(true);
    if (result.success) {
      expect('id' in result.data).toBe(false);
    }
  });

  it('UpdateSchema requires id but allows partial updates', () => {
    const result = UpdateSchema.safeParse({ id: crypto.randomUUID() });
    expect(result.success).toBe(true);
  });
});
\`\`\`

---

## 5. Testing Generic Functions and Utility Types

Generic functions are the backbone of reusable TypeScript code. Testing them requires exercising multiple type instantiations.

### Testing a Generic Collection Utility

\`\`\`typescript
function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<K, T[]>
  );
}

describe('groupBy', () => {
  it('groups objects by string key', () => {
    const users = [
      { name: 'Alice', role: 'admin' },
      { name: 'Bob', role: 'member' },
      { name: 'Carol', role: 'admin' },
    ];

    const grouped = groupBy(users, (u) => u.role);

    expect(grouped.admin).toHaveLength(2);
    expect(grouped.member).toHaveLength(1);
  });

  it('groups by numeric key', () => {
    const items = [
      { value: 1, category: 10 },
      { value: 2, category: 20 },
      { value: 3, category: 10 },
    ];

    const grouped = groupBy(items, (i) => i.category);

    expect(grouped[10]).toHaveLength(2);
    expect(grouped[20]).toHaveLength(1);
  });

  it('returns empty record for empty array', () => {
    const result = groupBy([] as { key: string }[], (i) => i.key);
    expect(result).toEqual({});
  });
});
\`\`\`

### Testing Type Inference with \`expectTypeOf\`

Vitest includes \`expectTypeOf\` for compile-time type assertions:

\`\`\`typescript
import { expectTypeOf } from 'vitest';

it('infers the correct return type', () => {
  const result = groupBy(
    [{ name: 'a', role: 'admin' as const }],
    (u) => u.role
  );

  expectTypeOf(result).toEqualTypeOf<Record<'admin', { name: string; role: 'admin' }[]>>();
});

it('narrows generic constraint', () => {
  function identity<T extends string | number>(value: T): T {
    return value;
  }

  expectTypeOf(identity('hello')).toBeString();
  expectTypeOf(identity(42)).toBeNumber();
});
\`\`\`

---

## 6. Testing Discriminated Unions and Exhaustive Checks

Discriminated unions are one of TypeScript's most powerful modeling tools. Tests should verify that all variants are handled.

\`\`\`typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    case 'triangle':
      return 0.5 * shape.base * shape.height;
    default: {
      const _exhaustive: never = shape;
      throw new Error(\`Unhandled shape: \${JSON.stringify(_exhaustive)}\`);
    }
  }
}

describe('area', () => {
  it('calculates circle area', () => {
    expect(area({ kind: 'circle', radius: 5 })).toBeCloseTo(78.54, 1);
  });

  it('calculates rectangle area', () => {
    expect(area({ kind: 'rectangle', width: 4, height: 6 })).toBe(24);
  });

  it('calculates triangle area', () => {
    expect(area({ kind: 'triangle', base: 10, height: 5 })).toBe(25);
  });
});
\`\`\`

### Testing Result Types

A common pattern in TypeScript is the \`Result\` type for error handling without exceptions:

\`\`\`typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return { ok: false, error: 'Division by zero' };
  return { ok: true, value: a / b };
}

describe('divide', () => {
  it('returns success result for valid division', () => {
    const result = divide(10, 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(5);
    }
  });

  it('returns error result for division by zero', () => {
    const result = divide(10, 0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Division by zero');
    }
  });
});
\`\`\`

The \`if (result.ok)\` narrowing inside tests is intentional. It proves that your discriminated union works correctly with TypeScript's control flow analysis.

---

## 7. Integration Testing with Type-Safe API Clients

### Testing tRPC Routers

tRPC provides end-to-end type safety from your API to your client. Testing tRPC routers directly ensures your type contracts hold:

\`\`\`typescript
import { createCallerFactory } from '@trpc/server';
import { appRouter } from '../src/server/router';
import { createMockContext } from './helpers';

const createCaller = createCallerFactory(appRouter);

describe('user router', () => {
  it('returns typed user data', async () => {
    const ctx = createMockContext({ userId: 'user-1' });
    const caller = createCaller(ctx);

    const user = await caller.user.getById({ id: 'user-1' });

    // user is fully typed -- compiler enforces field access
    expect(user.name).toBeDefined();
    expect(user.email).toContain('@');
  });

  it('throws on unauthorized access', async () => {
    const ctx = createMockContext({ userId: null });
    const caller = createCaller(ctx);

    await expect(caller.user.getById({ id: 'user-1' })).rejects.toThrow(
      'UNAUTHORIZED'
    );
  });
});
\`\`\`

### Testing Typed Axios Clients

\`\`\`typescript
import axios, { type AxiosInstance } from 'axios';
import { vi } from 'vitest';

interface ApiClient {
  getUser(id: string): Promise<User>;
  createUser(data: CreateUserInput): Promise<User>;
}

function createApiClient(baseURL: string): ApiClient {
  const client: AxiosInstance = axios.create({ baseURL, timeout: 10000 });

  return {
    async getUser(id) {
      const { data } = await client.get<User>(\`/users/\${id}\`);
      return data;
    },
    async createUser(input) {
      const { data } = await client.post<User>('/users', input);
      return data;
    },
  };
}

describe('ApiClient', () => {
  it('types are enforced on client methods', () => {
    const client = createApiClient('https://api.test.com');

    // These would cause compile errors:
    // client.getUser(123)          -- number not assignable to string
    // client.createUser('string')  -- string not assignable to CreateUserInput

    expectTypeOf(client.getUser).parameter(0).toBeString();
    expectTypeOf(client.getUser).returns.resolves.toEqualTypeOf<User>();
  });
});
\`\`\`

---

## 8. Testing React Components with TypeScript

### Typed Props Testing

\`\`\`typescript
import { render, screen } from '@testing-library/react';
import { UserCard } from '../src/components/UserCard';
import { createUser } from './factories';

describe('UserCard', () => {
  it('renders user information', () => {
    const user = createUser({ name: 'Alice', role: 'admin' });

    render(<UserCard user={user} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('applies admin styling for admin users', () => {
    const admin = createUser({ role: 'admin' });

    const { container } = render(<UserCard user={admin} />);

    expect(container.firstChild).toHaveClass('admin-badge');
  });
});
\`\`\`

### Testing Custom Hooks with Typed Returns

\`\`\`typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '../src/hooks/useCounter';

describe('useCounter', () => {
  it('returns typed state and actions', () => {
    const { result } = renderHook(() => useCounter({ initial: 10 }));

    expectTypeOf(result.current.count).toBeNumber();
    expectTypeOf(result.current.increment).toBeFunction();
    expectTypeOf(result.current.decrement).toBeFunction();
    expectTypeOf(result.current.reset).toBeFunction();

    expect(result.current.count).toBe(10);

    act(() => result.current.increment());
    expect(result.current.count).toBe(11);
  });
});
\`\`\`

### Testing Context Providers with Types

\`\`\`typescript
import { renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../src/context/theme';
import type { ReactNode } from 'react';

function createWrapper(theme: 'light' | 'dark') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ThemeProvider initial={theme}>{children}</ThemeProvider>;
  };
}

describe('useTheme', () => {
  it('provides typed theme context', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createWrapper('dark'),
    });

    expect(result.current.theme).toBe('dark');
    expectTypeOf(result.current.theme).toEqualTypeOf<'light' | 'dark'>();
  });
});
\`\`\`

---

## 9. Testing with Vitest and TypeScript

### Configuration for Type-Safe Testing

\`\`\`typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.test.json',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts'],
    },
  },
});
\`\`\`

### Running Type Checks as Part of Tests

\`\`\`json
// tsconfig.test.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["vitest/globals"],
    "strict": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src", "test"]
}
\`\`\`

With \`typecheck.enabled: true\`, Vitest runs \`tsc\` alongside your tests. Any type error in your test files fails the suite -- even if the runtime behavior is correct. This catches scenarios where tests pass at runtime but have incorrect types.

### Type-Level Tests with \`expectTypeOf\`

Vitest ships with \`expectTypeOf\` from the \`expect-type\` library:

\`\`\`typescript
import { expectTypeOf, describe, it } from 'vitest';
import type { DeepPartial, Prettify } from '../src/types/utils';

describe('utility types', () => {
  it('DeepPartial makes all nested fields optional', () => {
    type Nested = { a: { b: { c: string } } };
    type Result = DeepPartial<Nested>;

    expectTypeOf<Result>().toEqualTypeOf<{
      a?: { b?: { c?: string } };
    }>();
  });

  it('Prettify flattens intersection types', () => {
    type A = { x: number } & { y: string };
    type Result = Prettify<A>;

    expectTypeOf<Result>().toEqualTypeOf<{ x: number; y: string }>();
  });
});
\`\`\`

---

## 10. Advanced Patterns

### Branded Types

Branded types prevent mixing up semantically different values that share the same structural type:

\`\`\`typescript
type UserId = string & { readonly __brand: unique symbol };
type OrderId = string & { readonly __brand: unique symbol };

function createUserId(id: string): UserId {
  if (!id.startsWith('usr_')) throw new Error('Invalid user ID format');
  return id as UserId;
}

function createOrderId(id: string): OrderId {
  if (!id.startsWith('ord_')) throw new Error('Invalid order ID format');
  return id as OrderId;
}

describe('branded types', () => {
  it('creates valid branded user IDs', () => {
    const userId = createUserId('usr_123');
    expect(userId).toBe('usr_123');
  });

  it('rejects invalid format', () => {
    expect(() => createUserId('ord_123')).toThrow('Invalid user ID format');
  });

  it('prevents mixing ID types at compile time', () => {
    // This test documents the compile-time behavior
    // @ts-expect-error -- UserId is not assignable to OrderId
    const orderId: OrderId = createUserId('usr_123');
  });
});
\`\`\`

### Opaque Types with \`unique symbol\`

\`\`\`typescript
declare const __opaqueTag: unique symbol;

type Opaque<T, Tag> = T & { readonly [__opaqueTag]: Tag };

type Email = Opaque<string, 'Email'>;
type URL = Opaque<string, 'URL'>;

function validateEmail(input: string): Email {
  if (!input.includes('@')) throw new Error('Invalid email');
  return input as Email;
}

describe('opaque Email type', () => {
  it('validates and brands email strings', () => {
    const email = validateEmail('user@example.com');
    // email is typed as Email, not just string
    expect(email).toBe('user@example.com');
  });

  it('rejects invalid emails', () => {
    expect(() => validateEmail('not-an-email')).toThrow();
  });
});
\`\`\`

### Template Literal Types in Tests

\`\`\`typescript
type EventName = \`\${'user' | 'order'}.\${'created' | 'updated' | 'deleted'}\`;

function emitEvent(name: EventName, payload: unknown): void {
  // event emission logic
}

describe('template literal type events', () => {
  it('accepts valid event names', () => {
    // All of these should compile
    expect(() => emitEvent('user.created', {})).not.toThrow();
    expect(() => emitEvent('order.deleted', {})).not.toThrow();
  });

  it('rejects invalid event names at compile time', () => {
    // @ts-expect-error -- 'user.archived' is not a valid EventName
    emitEvent('user.archived', {});
  });
});
\`\`\`

---

## 11. AI-Assisted TypeScript Testing with QASkills

AI coding agents like Claude Code can generate type-safe test scaffolding, but they need context about your testing patterns. QASkills provides specialized skills that teach your AI agent TypeScript-specific testing strategies.

Install TypeScript testing skills:

\`\`\`bash
npx @qaskills/cli add typescript-testing
npx @qaskills/cli add vitest
npx @qaskills/cli add zod-validation-testing
\`\`\`

Search for more TypeScript-related skills:

\`\`\`bash
npx @qaskills/cli search "typescript"
npx @qaskills/cli search "type-safe mocking"
\`\`\`

Once installed, your AI agent will understand patterns like typed factories, branded type testing, and \`expectTypeOf\` assertions. Instead of generating tests with \`as any\` escape hatches, it produces compile-safe tests that catch regressions at the type level.

You can also explore skills by category:

\`\`\`bash
npx @qaskills/cli search --category testing-patterns
npx @qaskills/cli list --agent cursor
\`\`\`

---

## 12. 10 Best Practices for TypeScript Testing

1. **Enable \`strict: true\` in your test tsconfig.** Half-strict TypeScript is worse than no TypeScript because it gives false confidence.

2. **Use test factories for all entity creation.** Never construct test objects inline with object literals -- a factory centralizes changes when types evolve.

3. **Prefer \`satisfies\` over \`as\` for test data.** The \`satisfies\` operator validates without widening, catching errors that \`as\` silently allows.

4. **Run \`tsc --noEmit\` in CI alongside tests.** Type errors in test files should fail the build, not just show squiggly lines in the IDE.

5. **Use \`expectTypeOf\` for type-level assertions.** Runtime behavior can be correct while types are wrong. Test both.

6. **Avoid \`as any\` -- use the escape hatch hierarchy.** Every \`as any\` is a hole in your type safety. Use \`Partial<T>\`, \`satisfies\`, or \`@ts-expect-error\` instead.

7. **Test discriminated unions exhaustively.** Write a test for every variant. If you add a new variant, the \`never\` exhaustive check forces you to handle it.

8. **Type your mock functions explicitly.** Use \`vi.fn<[Args], Return>()\` or \`jest.Mocked<T>\` instead of untyped mocks.

9. **Keep test utilities in a shared \`test/\` directory.** Factories, builders, mock creators, and custom matchers should be importable by any test file.

10. **Use branded types for IDs and domain primitives.** They prevent subtle bugs where a \`userId\` gets passed where an \`orderId\` is expected. Tests verify the branding logic.

---

## 13. 8 Anti-Patterns to Avoid

1. **Casting everything to \`any\`.** This is the most common anti-pattern. If your test needs \`as any\` to compile, your test data does not match your types. Fix the data, not the type.

2. **Not testing error paths of Zod schemas.** Validating that good data passes is only half the job. Test that bad data fails with the right error codes and messages.

3. **Using \`@ts-ignore\` instead of \`@ts-expect-error\`.** The \`@ts-ignore\` directive suppresses errors silently. The \`@ts-expect-error\` directive fails if the error is fixed, keeping your negative tests honest.

4. **Skipping type-level tests.** Runtime tests verify behavior. Type-level tests verify contracts. You need both.

5. **Duplicating types between source and test files.** Test files should import types from source, never redefine them. Duplicated types drift apart silently.

6. **Over-mocking with \`Partial<T>\`.** Using \`Partial<T>\` for everything masks missing required fields. Reserve it for genuinely partial scenarios like PATCH requests.

7. **Not testing generic edge cases.** A generic function that works for \`string\` might break for \`string | number\`. Test multiple type instantiations.

8. **Ignoring \`strictNullChecks\` in tests.** If your source code runs with strict null checks but your tests do not, you miss entire categories of bugs -- null dereferences, undefined access, and optional chaining failures.

---

## Conclusion

TypeScript testing is not about adding types to JavaScript tests. It is about leveraging the type system as a **first-class testing tool** -- catching bugs at compile time, building self-validating test utilities, and creating a safety net that grows stronger as your codebase evolves.

The patterns in this guide -- typed factories, safe mocking, Zod validation testing, branded types, and type-level assertions with \`expectTypeOf\` -- form a foundation that scales from small libraries to large production applications.

To accelerate your TypeScript testing workflow with AI, install the relevant QA skills:

\`\`\`bash
npx @qaskills/cli add typescript-testing
npx @qaskills/cli add vitest
npx @qaskills/cli add zod-validation-testing
\`\`\`

Then let your AI agent generate type-safe tests that compile correctly from the start. The combination of TypeScript's static analysis, modern test runners like Vitest, and AI-assisted test generation makes 2026 the best time to invest in type-safe testing practices.

Browse 450+ QA skills at [qaskills.sh/skills](https://qaskills.sh/skills).
`,
};
