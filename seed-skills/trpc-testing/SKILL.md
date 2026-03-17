---
name: "tRPC Testing"
description: "End-to-end type-safe API testing with tRPC covering router testing, middleware testing, subscription testing, and client-server integration testing patterns"
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [trpc, type-safe, api, router, middleware, subscriptions, react-query, msw, caller, procedures]
testingTypes: [unit, integration, api]
frameworks: [vitest, jest, playwright]
languages: [typescript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# tRPC Testing Skill

You are an expert QA engineer specializing in testing tRPC applications. When the user asks you to write, review, or debug tests for tRPC routers, procedures, middleware, subscriptions, or React client integration, follow these detailed instructions.

## Core Principles

1. **Type safety is your test harness** -- tRPC infers types across the client-server boundary. Leverage TypeScript to catch contract violations at compile time, and reserve runtime tests for behavior verification.
2. **Test procedures in isolation first** -- Use `createCallerFactory` to invoke router procedures directly without HTTP overhead. This enables fast, reliable unit tests.
3. **Test middleware independently** -- Middleware often contains critical auth and validation logic. Test middleware functions in isolation before testing the full procedure chain.
4. **Integration tests for the full stack** -- After unit testing individual procedures, add integration tests that exercise the HTTP adapter, serialization, and error handling.
5. **Mock context, not procedures** -- When testing a procedure, provide a controlled context object (user session, database connection) rather than mocking the procedure itself.
6. **Subscription testing requires real transports** -- WebSocket subscriptions cannot be tested with simple callers. Use real WebSocket connections or test the subscription logic separately.
7. **React hook testing with providers** -- tRPC React hooks require proper provider setup. Use `createTRPCReact` with a test client and `QueryClientProvider` for hook-level testing.

## Project Structure

Always organize tRPC testing with this structure:

```
src/
  server/
    routers/
      user.router.ts
      product.router.ts
      order.router.ts
      _app.ts
    middleware/
      auth.ts
      rateLimit.ts
      logging.ts
    context.ts
    trpc.ts
  client/
    trpc.ts
    hooks/
      useUser.ts
      useProducts.ts
  __tests__/
    unit/
      routers/
        user.router.test.ts
        product.router.test.ts
        order.router.test.ts
      middleware/
        auth.test.ts
        rateLimit.test.ts
    integration/
      api.test.ts
      subscriptions.test.ts
    e2e/
      user-flow.spec.ts
    helpers/
      test-context.ts
      test-caller.ts
      trpc-test-utils.ts
    fixtures/
      user.fixture.ts
      product.fixture.ts
```

## tRPC Setup for Testing

### Base tRPC Configuration

```typescript
// src/server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});
```

### Context Configuration

```typescript
// src/server/context.ts
import { inferAsyncReturnType } from '@trpc/server';
import { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';
import { db } from '../db';
import { getSession } from '../auth';

export async function createContext(opts: CreateHTTPContextOptions) {
  const session = await getSession(opts.req);
  return {
    db,
    session,
    req: opts.req,
    res: opts.res,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
```

### Test Helpers

```typescript
// __tests__/helpers/test-context.ts
import { type Context } from '../../src/server/context';

interface TestUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

interface CreateTestContextOptions {
  user?: TestUser | null;
  db?: any;
}

export function createTestContext(options: CreateTestContextOptions = {}): Context {
  const { user = null, db = createMockDb() } = options;

  return {
    db,
    session: user ? { user, expires: new Date(Date.now() + 86400000).toISOString() } : null,
    req: {} as any,
    res: {} as any,
  };
}

export function createAuthenticatedContext(
  userOverrides: Partial<TestUser> = {}
): Context {
  const user: TestUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    ...userOverrides,
  };

  return createTestContext({ user });
}

export function createAdminContext(
  userOverrides: Partial<TestUser> = {}
): Context {
  return createAuthenticatedContext({ role: 'admin', ...userOverrides });
}

export function createUnauthenticatedContext(): Context {
  return createTestContext({ user: null });
}

function createMockDb() {
  return {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}
```

```typescript
// __tests__/helpers/test-caller.ts
import { createCallerFactory } from '../../src/server/trpc';
import { appRouter } from '../../src/server/routers/_app';
import { createTestContext, createAuthenticatedContext, createAdminContext } from './test-context';

const createCaller = createCallerFactory(appRouter);

export function createPublicCaller() {
  return createCaller(createTestContext({ user: null }));
}

export function createAuthenticatedCaller(userOverrides = {}) {
  return createCaller(createAuthenticatedContext(userOverrides));
}

export function createAdminCaller(userOverrides = {}) {
  return createCaller(createAdminContext(userOverrides));
}

export function createCallerWithContext(ctx: ReturnType<typeof createTestContext>) {
  return createCaller(ctx);
}
```

## Router Unit Testing

### User Router Tests

```typescript
// src/server/routers/user.router.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: input.id } });
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }
      return { id: user.id, name: user.name, email: user.email };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        bio: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
      });
    }),

  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search } = input;
      const where = search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {};

      const [users, total] = await Promise.all([
        ctx.db.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        ctx.db.user.count({ where }),
      ]);

      return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.session.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete your own account',
        });
      }
      await ctx.db.user.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
```

```typescript
// __tests__/unit/routers/user.router.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import {
  createPublicCaller,
  createAuthenticatedCaller,
  createAdminCaller,
  createCallerWithContext,
} from '../../helpers/test-caller';
import { createTestContext, createAuthenticatedContext } from '../../helpers/test-context';

describe('userRouter', () => {
  describe('getById', () => {
    it('should return user by ID', async () => {
      const ctx = createTestContext();
      ctx.db.user.findUnique.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'john@example.com',
      });

      const caller = createCallerWithContext(ctx);
      const result = await caller.user.getById({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(ctx.db.user.findUnique).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });
    });

    it('should throw NOT_FOUND for non-existent user', async () => {
      const ctx = createTestContext();
      ctx.db.user.findUnique.mockResolvedValue(null);
      const caller = createCallerWithContext(ctx);

      await expect(
        caller.user.getById({ id: '550e8400-e29b-41d4-a716-446655440000' })
      ).rejects.toThrow(TRPCError);

      try {
        await caller.user.getById({ id: '550e8400-e29b-41d4-a716-446655440000' });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('NOT_FOUND');
        expect((error as TRPCError).message).toBe('User not found');
      }
    });

    it('should reject invalid UUID input', async () => {
      const caller = createPublicCaller();

      await expect(
        caller.user.getById({ id: 'not-a-uuid' })
      ).rejects.toThrow();
    });
  });

  describe('me', () => {
    it('should return current user profile', async () => {
      const ctx = createAuthenticatedContext({ id: 'user-123' });
      ctx.db.user.findUnique.mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      });

      const caller = createCallerWithContext(ctx);
      const result = await caller.user.me();

      expect(result.id).toBe('user-123');
      expect(ctx.db.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should throw UNAUTHORIZED for unauthenticated requests', async () => {
      const caller = createPublicCaller();

      await expect(caller.user.me()).rejects.toThrow(TRPCError);

      try {
        await caller.user.me();
      } catch (error) {
        expect((error as TRPCError).code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('updateProfile', () => {
    it('should update the authenticated user profile', async () => {
      const ctx = createAuthenticatedContext({ id: 'user-123' });
      ctx.db.user.update.mockResolvedValue({
        id: 'user-123',
        name: 'Updated Name',
        bio: 'New bio',
      });

      const caller = createCallerWithContext(ctx);
      const result = await caller.user.updateProfile({
        name: 'Updated Name',
        bio: 'New bio',
      });

      expect(result.name).toBe('Updated Name');
      expect(ctx.db.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { name: 'Updated Name', bio: 'New bio' },
      });
    });

    it('should allow partial updates', async () => {
      const ctx = createAuthenticatedContext({ id: 'user-123' });
      ctx.db.user.update.mockResolvedValue({
        id: 'user-123',
        name: 'Only Name Updated',
      });

      const caller = createCallerWithContext(ctx);
      await caller.user.updateProfile({ name: 'Only Name Updated' });

      expect(ctx.db.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { name: 'Only Name Updated' },
      });
    });

    it('should reject name longer than 100 characters', async () => {
      const caller = createAuthenticatedCaller();

      await expect(
        caller.user.updateProfile({ name: 'a'.repeat(101) })
      ).rejects.toThrow();
    });
  });

  describe('list (admin only)', () => {
    it('should return paginated user list for admins', async () => {
      const ctx = createTestContext({
        user: { id: 'admin-1', email: 'admin@test.com', name: 'Admin', role: 'admin' },
      });
      ctx.db.user.findMany.mockResolvedValue([
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
      ]);
      ctx.db.user.count.mockResolvedValue(50);

      const caller = createCallerWithContext(ctx);
      const result = await caller.user.list({ page: 1, limit: 20 });

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(50);
      expect(result.totalPages).toBe(3);
    });

    it('should reject non-admin users', async () => {
      const caller = createAuthenticatedCaller({ role: 'user' });

      await expect(
        caller.user.list({ page: 1, limit: 20 })
      ).rejects.toThrow(TRPCError);

      try {
        await caller.user.list({ page: 1 });
      } catch (error) {
        expect((error as TRPCError).code).toBe('FORBIDDEN');
      }
    });

    it('should support search filtering', async () => {
      const ctx = createTestContext({
        user: { id: 'admin-1', email: 'admin@test.com', name: 'Admin', role: 'admin' },
      });
      ctx.db.user.findMany.mockResolvedValue([]);
      ctx.db.user.count.mockResolvedValue(0);

      const caller = createCallerWithContext(ctx);
      await caller.user.list({ search: 'john' });

      expect(ctx.db.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: { contains: 'john', mode: 'insensitive' } },
        })
      );
    });
  });

  describe('delete (admin only)', () => {
    it('should delete a user', async () => {
      const ctx = createTestContext({
        user: { id: 'admin-1', email: 'admin@test.com', name: 'Admin', role: 'admin' },
      });
      ctx.db.user.delete.mockResolvedValue({});

      const caller = createCallerWithContext(ctx);
      const result = await caller.user.delete({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(true);
    });

    it('should prevent admin from deleting themselves', async () => {
      const adminId = '550e8400-e29b-41d4-a716-446655440000';
      const ctx = createTestContext({
        user: { id: adminId, email: 'admin@test.com', name: 'Admin', role: 'admin' },
      });

      const caller = createCallerWithContext(ctx);

      await expect(
        caller.user.delete({ id: adminId })
      ).rejects.toThrow('Cannot delete your own account');
    });
  });
});
```

## Middleware Testing

```typescript
// src/server/middleware/rateLimit.ts
import { TRPCError } from '@trpc/server';
import { middleware } from '../trpc';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export const rateLimitMiddleware = (limit: number, windowMs: number) =>
  middleware(async ({ ctx, next }) => {
    const key = ctx.session?.user?.id || ctx.req?.socket?.remoteAddress || 'anonymous';
    const now = Date.now();

    const entry = rateLimitStore.get(key);
    if (entry && now < entry.resetAt) {
      if (entry.count >= limit) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
        });
      }
      entry.count++;
    } else {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    }

    return next();
  });
```

```typescript
// __tests__/unit/middleware/rateLimit.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../../../src/server/trpc';
import { rateLimitMiddleware } from '../../../src/server/middleware/rateLimit';
import { createCallerFactory } from '../../../src/server/trpc';
import { createTestContext, createAuthenticatedContext } from '../../helpers/test-context';

describe('rateLimitMiddleware', () => {
  const testRouter = router({
    limited: publicProcedure
      .use(rateLimitMiddleware(3, 60000)) // 3 requests per minute
      .query(() => ({ ok: true })),
  });

  const createCaller = createCallerFactory(testRouter);

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests within rate limit', async () => {
    const caller = createCaller(createAuthenticatedContext({ id: 'rate-test-user' }));

    const result1 = await caller.limited();
    const result2 = await caller.limited();
    const result3 = await caller.limited();

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    expect(result3.ok).toBe(true);
  });

  it('should block requests exceeding rate limit', async () => {
    const ctx = createAuthenticatedContext({ id: 'rate-block-user' });
    const caller = createCaller(ctx);

    // Exhaust the limit
    await caller.limited();
    await caller.limited();
    await caller.limited();

    // Fourth request should fail
    await expect(caller.limited()).rejects.toThrow(TRPCError);

    try {
      await caller.limited();
    } catch (error) {
      expect((error as TRPCError).code).toBe('TOO_MANY_REQUESTS');
      expect((error as TRPCError).message).toContain('Rate limit exceeded');
    }
  });

  it('should reset rate limit after window expires', async () => {
    const ctx = createAuthenticatedContext({ id: 'rate-reset-user' });
    const caller = createCaller(ctx);

    // Exhaust the limit
    await caller.limited();
    await caller.limited();
    await caller.limited();

    // Advance time past the window
    vi.advanceTimersByTime(61000);

    // Should work again
    const result = await caller.limited();
    expect(result.ok).toBe(true);
  });

  it('should track rate limits per user', async () => {
    const caller1 = createCaller(createAuthenticatedContext({ id: 'user-a' }));
    const caller2 = createCaller(createAuthenticatedContext({ id: 'user-b' }));

    // User A exhausts their limit
    await caller1.limited();
    await caller1.limited();
    await caller1.limited();

    // User B should still be able to make requests
    const result = await caller2.limited();
    expect(result.ok).toBe(true);
  });
});
```

## Auth Middleware Testing

```typescript
// __tests__/unit/middleware/auth.test.ts
import { describe, it, expect } from 'vitest';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../../../src/server/trpc';
import { createCallerFactory } from '../../../src/server/trpc';
import {
  createTestContext,
  createAuthenticatedContext,
  createAdminContext,
  createUnauthenticatedContext,
} from '../../helpers/test-context';

describe('Auth Middleware', () => {
  const testRouter = router({
    protectedRoute: protectedProcedure.query(({ ctx }) => ({
      userId: ctx.session.user.id,
    })),
    adminRoute: adminProcedure.query(({ ctx }) => ({
      userId: ctx.session.user.id,
      role: ctx.session.user.role,
    })),
  });

  const createCaller = createCallerFactory(testRouter);

  describe('protectedProcedure', () => {
    it('should allow authenticated users', async () => {
      const caller = createCaller(createAuthenticatedContext({ id: 'user-1' }));
      const result = await caller.protectedRoute();
      expect(result.userId).toBe('user-1');
    });

    it('should reject unauthenticated users with UNAUTHORIZED', async () => {
      const caller = createCaller(createUnauthenticatedContext());

      try {
        await caller.protectedRoute();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('UNAUTHORIZED');
      }
    });

    it('should reject when session exists but user is null', async () => {
      const caller = createCaller(createTestContext({ user: null }));

      await expect(caller.protectedRoute()).rejects.toThrow(TRPCError);
    });
  });

  describe('adminProcedure', () => {
    it('should allow admin users', async () => {
      const caller = createCaller(createAdminContext({ id: 'admin-1' }));
      const result = await caller.adminRoute();
      expect(result.role).toBe('admin');
    });

    it('should reject non-admin authenticated users with FORBIDDEN', async () => {
      const caller = createCaller(createAuthenticatedContext({ role: 'user' }));

      try {
        await caller.adminRoute();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('FORBIDDEN');
        expect((error as TRPCError).message).toBe('Admin access required');
      }
    });

    it('should reject unauthenticated users with UNAUTHORIZED (not FORBIDDEN)', async () => {
      const caller = createCaller(createUnauthenticatedContext());

      try {
        await caller.adminRoute();
        expect.fail('Should have thrown');
      } catch (error) {
        // Auth check runs before admin check
        expect((error as TRPCError).code).toBe('UNAUTHORIZED');
      }
    });
  });
});
```

## Integration Testing with HTTP Server

```typescript
// __tests__/integration/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { appRouter } from '../../src/server/routers/_app';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../../src/server/routers/_app';

describe('tRPC HTTP Integration', () => {
  let server: ReturnType<typeof createHTTPServer>;
  let client: ReturnType<typeof createTRPCClient<AppRouter>>;
  let port: number;

  beforeAll(async () => {
    server = createHTTPServer({
      router: appRouter,
      createContext: () => ({
        db: createTestDb(),
        session: {
          user: { id: 'int-test-user', email: 'test@test.com', name: 'Test', role: 'admin' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        req: {} as any,
        res: {} as any,
      }),
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });

    const address = server.server.address();
    port = typeof address === 'object' ? address!.port : 0;

    client = createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `http://localhost:${port}`,
          transformer: superjson,
        }),
      ],
    });
  });

  afterAll(() => {
    server.server.close();
  });

  it('should handle a query through HTTP', async () => {
    const result = await client.user.me.query();
    expect(result).toBeDefined();
    expect(result.id).toBe('int-test-user');
  });

  it('should handle mutations through HTTP', async () => {
    const result = await client.user.updateProfile.mutate({
      name: 'Integration Test User',
    });
    expect(result).toBeDefined();
  });

  it('should handle batch requests', async () => {
    const [me, users] = await Promise.all([
      client.user.me.query(),
      client.user.list.query({ page: 1, limit: 10 }),
    ]);

    expect(me).toBeDefined();
    expect(users).toBeDefined();
  });

  it('should return proper error shape for validation errors', async () => {
    try {
      await client.user.getById.query({ id: 'not-a-uuid' });
      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.data?.zodError).toBeDefined();
    }
  });

  it('should use superjson transformer for Date objects', async () => {
    const result = await client.user.me.query();
    // superjson should preserve Date types through serialization
    if (result.createdAt) {
      expect(result.createdAt).toBeInstanceOf(Date);
    }
  });
});

function createTestDb() {
  return {
    user: {
      findUnique: async () => ({
        id: 'int-test-user',
        name: 'Test User',
        email: 'test@test.com',
        createdAt: new Date(),
      }),
      findMany: async () => [],
      create: async (data: any) => ({ id: 'new-user', ...data.data }),
      update: async (data: any) => ({ id: data.where.id, ...data.data }),
      delete: async () => ({}),
      count: async () => 0,
    },
    product: {
      findUnique: async () => null,
      findMany: async () => [],
      create: async (data: any) => ({ id: 'new-prod', ...data.data }),
      update: async (data: any) => ({ id: data.where.id, ...data.data }),
      delete: async () => ({}),
      count: async () => 0,
    },
    order: {
      findUnique: async () => null,
      findMany: async () => [],
      create: async (data: any) => ({ id: 'new-order', ...data.data }),
      update: async (data: any) => ({ id: data.where.id, ...data.data }),
    },
  };
}
```

## React Hook Testing with tRPC

```typescript
// __tests__/helpers/trpc-test-utils.tsx
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import superjson from 'superjson';
import type { AppRouter } from '../../src/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function createTestTrpcWrapper(port: number) {
  const queryClient = createTestQueryClient();
  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: `http://localhost:${port}`,
        transformer: superjson,
      }),
    ],
  });

  return function TestWrapper({ children }: { children: ReactNode }) {
    return (
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </trpc.Provider>
    );
  };
}
```

```typescript
// __tests__/unit/hooks/useUser.test.tsx
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestTrpcWrapper, trpc } from '../../helpers/trpc-test-utils';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { appRouter } from '../../../src/server/routers/_app';

describe('useUser hooks', () => {
  let server: ReturnType<typeof createHTTPServer>;
  let wrapper: ReturnType<typeof createTestTrpcWrapper>;

  beforeAll(async () => {
    server = createHTTPServer({
      router: appRouter,
      createContext: () => ({
        db: createTestDb(),
        session: {
          user: { id: 'hook-test-user', email: 'hook@test.com', name: 'Hook User', role: 'user' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        req: {} as any,
        res: {} as any,
      }),
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });

    const address = server.server.address();
    const port = typeof address === 'object' ? address!.port : 0;
    wrapper = createTestTrpcWrapper(port);
  });

  afterAll(() => {
    server.server.close();
  });

  it('should fetch current user with useQuery', async () => {
    const { result } = renderHook(
      () => trpc.user.me.useQuery(),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBe('hook-test-user');
    expect(result.current.data?.name).toBe('Hook User');
  });

  it('should update profile with useMutation', async () => {
    const { result } = renderHook(
      () => {
        const utils = trpc.useUtils();
        const mutation = trpc.user.updateProfile.useMutation({
          onSuccess: () => {
            utils.user.me.invalidate();
          },
        });
        return mutation;
      },
      { wrapper }
    );

    result.current.mutate({ name: 'Updated Hook User' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle query errors', async () => {
    // Create a server that always errors
    const errorServer = createHTTPServer({
      router: appRouter,
      createContext: () => ({
        db: { user: { findUnique: async () => { throw new Error('DB Error'); } } } as any,
        session: null,
        req: {} as any,
        res: {} as any,
      }),
    });

    await new Promise<void>((resolve) => {
      errorServer.listen(0, () => resolve());
    });

    const errorPort = (errorServer.server.address() as any).port;
    const errorWrapper = createTestTrpcWrapper(errorPort);

    const { result } = renderHook(
      () => trpc.user.me.useQuery(),
      { wrapper: errorWrapper }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();

    errorServer.server.close();
  });
});

function createTestDb() {
  return {
    user: {
      findUnique: async () => ({
        id: 'hook-test-user',
        name: 'Hook User',
        email: 'hook@test.com',
      }),
      update: async (args: any) => ({
        id: 'hook-test-user',
        ...args.data,
      }),
      findMany: async () => [],
      count: async () => 0,
    },
  };
}
```

## Error Handling Testing

```typescript
// __tests__/unit/routers/error-handling.test.ts
import { describe, it, expect } from 'vitest';
import { TRPCError } from '@trpc/server';
import { createCallerWithContext } from '../../helpers/test-caller';
import { createAuthenticatedContext } from '../../helpers/test-context';

describe('tRPC Error Handling', () => {
  it('should wrap database errors as INTERNAL_SERVER_ERROR', async () => {
    const ctx = createAuthenticatedContext();
    ctx.db.user.findUnique.mockRejectedValue(new Error('Connection refused'));

    const caller = createCallerWithContext(ctx);

    try {
      await caller.user.me();
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe('INTERNAL_SERVER_ERROR');
    }
  });

  it('should preserve TRPCError codes through the stack', async () => {
    const ctx = createAuthenticatedContext();
    ctx.db.user.findUnique.mockResolvedValue(null);

    const caller = createCallerWithContext(ctx);

    try {
      await caller.user.getById({ id: '550e8400-e29b-41d4-a716-446655440000' });
    } catch (error) {
      expect((error as TRPCError).code).toBe('NOT_FOUND');
      // Original message should be preserved
      expect((error as TRPCError).message).toBe('User not found');
    }
  });

  it('should include Zod errors in the error shape for input validation', async () => {
    const caller = createCallerWithContext(createAuthenticatedContext());

    try {
      await caller.user.updateProfile({ name: '' });
    } catch (error: any) {
      // The error formatter should include zodError
      expect(error.data?.zodError).toBeDefined();
    }
  });
});
```

## MSW Integration for Client-Side Testing

```typescript
// __tests__/mocks/trpc-handlers.ts
import { http, HttpResponse } from 'msw';

export const trpcHandlers = [
  // tRPC batches requests, so handle the batch endpoint
  http.get('/api/trpc/*', ({ request }) => {
    const url = new URL(request.url);
    const paths = url.pathname.replace('/api/trpc/', '').split(',');

    const results = paths.map((path) => {
      switch (path) {
        case 'user.me':
          return {
            result: {
              data: {
                json: {
                  id: 'mock-user',
                  name: 'Mock User',
                  email: 'mock@test.com',
                },
              },
            },
          };
        default:
          return {
            error: {
              json: {
                message: 'Not found',
                code: -32004,
                data: { code: 'NOT_FOUND' },
              },
            },
          };
      }
    });

    return HttpResponse.json(results);
  }),

  http.post('/api/trpc/*', async ({ request }) => {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/trpc/', '');

    if (path === 'user.updateProfile') {
      const body = await request.json();
      return HttpResponse.json([
        {
          result: {
            data: {
              json: { id: 'mock-user', ...(body as any) },
            },
          },
        },
      ]);
    }

    return HttpResponse.json([{ error: { message: 'Unknown procedure' } }]);
  }),
];
```

## Best Practices

1. **Use `createCallerFactory` for all unit tests** -- Direct procedure invocation via callers is faster and more reliable than testing through HTTP. Reserve HTTP tests for integration testing.
2. **Create reusable context factories** -- Build `createAuthenticatedContext`, `createAdminContext`, and `createUnauthenticatedContext` helpers to reduce test boilerplate and ensure consistent context shapes.
3. **Test the auth middleware chain explicitly** -- Verify that unauthenticated requests to protected routes return UNAUTHORIZED, not FORBIDDEN or other codes. The middleware ordering matters.
4. **Verify error codes, not just error types** -- `TRPCError` wraps many error codes. Always assert on the specific `code` property (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, etc.).
5. **Test input validation at the procedure level** -- tRPC automatically validates inputs against the Zod schema. Test that invalid inputs are rejected with appropriate errors.
6. **Use `superjson` in test clients** -- If your server uses superjson for serialization, the test client must also use it. Mismatched transformers cause subtle type deserialization bugs.
7. **Test batch request behavior** -- tRPC batches multiple queries into a single HTTP request. Verify that batched requests work correctly in integration tests.
8. **Invalidate query cache in mutation tests** -- When testing mutations with React Query, verify that related queries are invalidated using `utils.invalidate()`.
9. **Test error formatting** -- If you customize the `errorFormatter` in tRPC init, write tests to verify the error shape matches what the client expects.
10. **Keep test databases isolated** -- Each test suite should use its own database state. Use transactions that roll back or create temporary databases for integration tests.

## Anti-Patterns to Avoid

1. **Mocking the tRPC procedure instead of the context** -- Never mock `caller.user.me`. Instead, mock the database or service layer in the context so the full procedure logic executes.
2. **Testing through HTTP when a caller suffices** -- HTTP integration tests are slower and more fragile. Only use them when testing HTTP-specific behavior like headers, cookies, or CORS.
3. **Sharing mutable context between tests** -- Each test should create its own context. Sharing a context object leads to test pollution and flaky failures.
4. **Ignoring middleware order** -- tRPC middleware runs in order. If you add auth before rate limiting, an unauthenticated request will return UNAUTHORIZED instead of TOO_MANY_REQUESTS. Test the actual order.
5. **Not testing the error formatter** -- Custom error formatters can break client error handling. Always have at least one test that verifies the full error response shape.
6. **Hardcoding ports in test servers** -- Use port `0` to let the OS assign a free port. Hardcoded ports cause conflicts in CI when tests run in parallel.
7. **Forgetting to close test servers** -- Always call `server.close()` in `afterAll`. Unclosed servers cause Jest/Vitest to hang and leak resources.
8. **Testing React hooks without proper providers** -- tRPC hooks require both `trpc.Provider` and `QueryClientProvider`. Missing providers cause cryptic errors.
9. **Not testing superjson serialization round-trips** -- Date objects, Maps, Sets, and other non-JSON types require superjson. Test that these types survive the client-server round trip.
10. **Skipping input validation tests** -- Just because tRPC uses Zod does not mean input validation is automatically correct. Test that your specific schemas reject invalid inputs at the procedure level.

## Running Tests

- Run all tRPC tests: `pnpm vitest run __tests__`
- Run unit tests only: `pnpm vitest run __tests__/unit`
- Run integration tests: `pnpm vitest run __tests__/integration`
- Run E2E tests: `pnpm playwright test e2e/`
- Watch mode: `pnpm vitest __tests__/unit/routers`
- Run with coverage: `pnpm vitest run --coverage`
- Debug a specific test: `pnpm vitest run __tests__/unit/routers/user.router.test.ts`
