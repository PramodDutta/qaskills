---
name: SuperTest API Testing
description: Test Node.js HTTP APIs in-process with SuperTest — request(app) without binding a port, chained .expect assertions, auth headers, JSON body validation, and Jest integration with proper async/await patterns.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [supertest, api-testing, express, nodejs, jest, integration-testing, http, rest, assertions]
testingTypes: [api, integration]
frameworks: [jest, supertest, express]
languages: [typescript, javascript]
domains: [api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# SuperTest API Testing

This skill makes an AI agent write integration tests for Express/Koa/Fastify-compatible Node HTTP apps using SuperTest: pass the app object directly to `request()` so no port is bound, chain `.expect()` for status/header checks, and assert response bodies with Jest matchers. Trigger it when a Node project exposes an Express `app`, when the user asks to test REST endpoints without spinning up a server, or when `supertest` is already in `devDependencies`.

## Core Principles

1. **Test the app object, not a running server.** `request(app)` binds to an ephemeral port per request and tears it down — no `app.listen()`, no port conflicts, no orphaned servers in CI.
2. **Export `app` separately from the listener.** The single biggest enabler: `app.ts` exports the Express app, `server.ts` calls `listen()`. Tests import `app.ts` only.
3. **Always `await` (or return) the request chain.** A SuperTest call is a thenable; forgetting `await` means the test passes before the request even fires.
4. **`.expect(status)` for transport, Jest matchers for payload.** Status codes and content-type belong in the chain; body shape belongs in `expect(res.body).toMatchObject(...)` where failure diffs are readable.
5. **Real database or none — never half-mocked.** Either run integration tests against a disposable database (Testcontainers, SQLite in-memory) or mock the data layer entirely. Mocking two of five queries gives you tests that lie.
6. **Each test owns its data.** Create the records a test needs inside the test (or a `beforeEach`), and make cleanup idempotent. Order-dependent suites rot within a sprint.

## Setup

```bash
npm install --save-dev supertest @types/supertest jest ts-jest @types/jest
```

The app/server split that makes everything testable:

```typescript
// src/app.ts
import express from 'express';
import { usersRouter } from './routes/users';

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  return app;
}
```

```typescript
// src/server.ts — the ONLY file that listens; never imported by tests
import { createApp } from './app';

const port = Number(process.env.PORT ?? 3000);
createApp().listen(port, () => console.log(`listening on :${port}`));
```

First test:

```typescript
// src/app.test.ts
import request from 'supertest';
import { createApp } from './app';

const app = createApp();

describe('GET /health', () => {
  it('responds 200 with status ok', async () => {
    const res = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

## Patterns

### CRUD Round-Trip with Body Assertions

```typescript
import request from 'supertest';
import { createApp } from './app';
import { resetDb } from '../test/helpers/db';

const app = createApp();

beforeEach(async () => {
  await resetDb();
});

describe('POST /api/users', () => {
  it('creates a user and returns 201 with the persisted record', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'mira@example.com', name: 'Mira' })
      .expect(201);

    expect(res.body).toMatchObject({
      email: 'mira@example.com',
      name: 'Mira',
    });
    expect(res.body.id).toEqual(expect.any(String));

    // Round-trip: the created resource is retrievable
    const fetched = await request(app).get(`/api/users/${res.body.id}`).expect(200);
    expect(fetched.body.email).toBe('mira@example.com');
  });

  it('rejects an invalid email with 400 and a field-level error', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'not-an-email', name: 'Mira' })
      .expect(400);

    expect(res.body.errors).toContainEqual(
      expect.objectContaining({ field: 'email' }),
    );
  });
});
```

### Authenticated Requests

```typescript
// test/helpers/auth.ts — log in once per suite, reuse the token
import request from 'supertest';
import type { Express } from 'express';

export async function getAuthToken(app: Express): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'test-password-123' })
    .expect(200);
  return res.body.token as string;
}
```

```typescript
import request from 'supertest';
import { createApp } from './app';
import { getAuthToken } from '../test/helpers/auth';

const app = createApp();
let token: string;

beforeAll(async () => {
  token = await getAuthToken(app);
});

describe('DELETE /api/users/:id', () => {
  it('returns 401 without a token', async () => {
    await request(app).delete('/api/users/u_123').expect(401);
  });

  it('deletes with a valid bearer token', async () => {
    await request(app)
      .delete('/api/users/u_123')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });
});
```

### Query Params, File Upload, and Custom Assertions

```typescript
// Query strings via .query() — never hand-concatenate
const res = await request(app)
  .get('/api/users')
  .query({ page: 2, limit: 10, sort: 'createdAt' })
  .expect(200);
expect(res.body.items).toHaveLength(10);
expect(res.body.page).toBe(2);

// multipart upload
await request(app)
  .post('/api/avatars')
  .set('Authorization', `Bearer ${token}`)
  .attach('avatar', 'test/fixtures/avatar.png')
  .field('alt', 'profile picture')
  .expect(201);

// Function form of .expect() for response-wide invariants
await request(app)
  .get('/api/users')
  .expect(200)
  .expect((response) => {
    if (response.body.items.some((u: { password?: string }) => u.password)) {
      throw new Error('password leaked in list endpoint');
    }
  });
```

### Cookies and Sessions

```typescript
// Persist cookies across requests with an agent
const agent = request.agent(app);

await agent
  .post('/api/auth/login')
  .send({ email: 'admin@example.com', password: 'test-password-123' })
  .expect(200);

// agent carries the session cookie automatically
await agent.get('/api/me').expect(200);
```

## Best Practices

- Name tests by behavior and status: `'returns 409 when email already exists'`, not `'test create user 2'`.
- Cover the unhappy paths the framework will not: malformed JSON body, missing auth, wrong content-type, oversized payload, nonexistent IDs (404 vs 400 for invalid format).
- Run integration tests serially against a shared DB (`jest --runInBand`) or give each worker its own schema; parallel workers on one mutable DB produce heisenbugs.
- Keep `Content-Type` assertions as regex (`/json/`) — servers append `; charset=utf-8`.
- Add a `jest.setup.ts` that fails tests on unhandled promise rejections; SuperTest chains silently swallow them otherwise.
- For Fastify, call `await app.ready()` before passing `app.server` to `request()`.

## Anti-Patterns

- **`app.listen()` in test setup.** Port collisions across Jest workers, orphan servers on failure. `request(app)` exists precisely so you never listen.
- **Forgetting `await` on the chain.** The test exits green while the request is in flight. Enable `@typescript-eslint/no-floating-promises` to make this a lint error.
- **Asserting entire bodies with `toEqual` including timestamps and IDs.** Use `toMatchObject` plus `expect.any(String)` for generated fields; full-body equality breaks on every schema addition.
- **One mega-test that exercises login, create, update, and delete.** When it fails at step 14 you debug all 14 steps. Split per behavior, share setup via helpers.
- **Seeding through raw SQL while testing through HTTP.** Your seed bypasses validation and hashing; create test data through the API or through the same repository layer the app uses.
- **Testing third-party middleware** (body-parser limits, cors echo) — pin your config in one test if you must, but do not re-test Express itself.

## When to Trigger This Skill

- `supertest` is in `devDependencies`, or the user asks to test Express/Koa/NestJS HTTP endpoints.
- An API has no integration tests and the user wants coverage without deploying or binding ports.
- Reviewing failing or flaky API tests that use `app.listen`, missing `await`, or shared mutable test data.
- The user asks how to test auth-protected routes, file uploads, or cookie sessions in Node.
- Setting up the app/server split so an existing Express codebase becomes testable.
