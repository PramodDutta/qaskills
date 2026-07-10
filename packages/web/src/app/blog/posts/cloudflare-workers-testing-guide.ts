import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cloudflare Workers Testing Guide',
  description:
    'Test Cloudflare Workers with Vitest, workerd runtime coverage, bindings, fetch handlers, scheduled events, and edge-specific mocks in CI suites.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# Cloudflare Workers Testing Guide

The handler passes in Node because \`Request\` exists, then fails at the edge because the KV binding is undefined and the cache header logic depends on Workers runtime behavior. Cloudflare Workers testing has to exercise the runtime boundary, not just call a function that happens to accept a request.

Cloudflare's Vitest integration runs tests in the Workers runtime through \`@cloudflare/vitest-pool-workers\`. That matters because Workers code uses platform bindings, Web Fetch APIs, Durable Objects, D1, KV, R2, queues, and runtime-specific modules that ordinary Node tests do not faithfully emulate.

This guide covers a practical test stack: direct fetch handler tests, binding usage, environment separation, scheduled handlers, and CI tradeoffs. For broader serverless QA patterns, use [serverless testing complete guide](/blog/serverless-testing-complete-guide). For web-facing regression coverage around Workers-backed apps, pair it with [web testing checklist 2026](/blog/web-testing-checklist-2026).

## Use the Workers Vitest Pool for Runtime Behavior

A Worker can be written as a module exporting \`fetch\`. The test should call it through the Workers test environment, passing an \`env\` object that matches bindings used by the handler.

\`\`\`ts
// src/index.ts
export interface Env {
  RATE_LIMIT_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== '/health') {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }

    const flag = await env.RATE_LIMIT_KV.get('maintenance');

    return Response.json(
      {
        ok: flag !== 'on',
        region: request.headers.get('cf-ipcountry') ?? 'unknown',
      },
      {
        headers: {
          'cache-control': 'no-store',
        },
      },
    );
  },
};
\`\`\`

\`\`\`ts
// test/health.test.ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import worker from '../src/index';

describe('health endpoint', () => {
  it('returns no-store health status from the Worker runtime', async () => {
    await env.RATE_LIMIT_KV.put('maintenance', 'off');

    const response = await worker.fetch(
      new Request('https://example.com/health', {
        headers: { 'cf-ipcountry': 'IN' },
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      ok: true,
      region: 'IN',
    });
  });
});
\`\`\`

The test imports \`env\` from \`cloudflare:test\`, which is provided by the Workers Vitest pool. That is different from manually inventing a plain object for KV. When bindings matter, test with bindings.

## Configuration That Makes Tests Honest

Your Vitest config should identify Worker tests and use the Workers pool. Keep Node unit tests separate if the repository also contains pure TypeScript utilities.

\`\`\`ts
// vitest.config.ts
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.toml',
        },
      },
    },
  },
});
\`\`\`

This config tells Vitest to run Worker tests in the workerd-backed pool with the Wrangler configuration. If you have ordinary Node tests for helper functions, consider a separate Vitest project or file pattern so helper tests do not pay the runtime cost.

| Test layer | Runtime | Best for | Avoid |
|---|---|---|---|
| Pure unit | Node or jsdom | URL parsing, header builders, small pure functions | Pretending KV/D1 bindings exist |
| Worker integration | Workers Vitest pool | Fetch handler, bindings, runtime APIs | Slow exhaustive data matrices |
| Local preview | Wrangler dev or preview | Manual debugging and browser checks | Replacing automated assertions |
| Deployed smoke | Real Cloudflare environment | Routing, secrets, production-like bindings | Large destructive test suites |

The goal is not to run every test in the Workers pool. The goal is to run runtime-sensitive tests there.

## Bindings Need Contract Tests

Bindings are the edge equivalent of dependencies. A Worker that expects \`env.SESSIONS\` as KV and receives nothing will fail in production. Tests should verify binding names, behavior, and failure modes.

\`\`\`ts
// test/session-cache.test.ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import worker from '../src/index';

describe('session cache behavior', () => {
  it('returns 401 when the session key is missing from KV', async () => {
    const response = await worker.fetch(
      new Request('https://example.com/account', {
        headers: { cookie: 'sid=missing-session' },
      }),
      env,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: 'session_expired',
    });
  });

  it('reads the session from KV before returning account data', async () => {
    await env.SESSIONS.put(
      'sid:valid-session',
      JSON.stringify({ userId: 'user_123', email: 'qa@example.com' }),
    );

    const response = await worker.fetch(
      new Request('https://example.com/account', {
        headers: { cookie: 'sid=valid-session' },
      }),
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      userId: 'user_123',
    });
  });
});
\`\`\`

This test assumes \`SESSIONS\` is configured in Wrangler for the test environment. If the binding name changes, the test should fail before deployment.

## Edge-Specific Bugs Worth Testing

Workers use Web-standard APIs, but the edge environment has its own failure patterns. Tests should reflect those patterns rather than only checking happy-path JSON.

| Risk | Worker-specific angle | Test idea |
|---|---|---|
| Missing binding | Runtime env differs from local mock | Call handler with configured \`env\` and assert binding behavior |
| Cache headers | CDN behavior depends on exact headers | Assert \`cache-control\`, \`vary\`, and status together |
| Request body reuse | Streams can be consumed once | Test middleware plus handler reading body |
| Geo headers | Country or colo data may be absent locally | Provide headers explicitly and test fallback |
| Durable Object id routing | Object identity controls state | Test same id vs different id behavior |
| D1 migrations | Schema mismatch appears at runtime | Run query against test D1 binding |
| Queue payload shape | Producers and consumers drift | Validate message body before enqueue |

Good Worker tests are often contract tests around the platform boundary: request in, env binding call, response out.

## Testing Scheduled Handlers

Workers can export scheduled handlers for Cron Triggers. Keep the business work in a function that accepts \`env\`, but still test the scheduled export so wiring does not rot.

\`\`\`ts
// src/cron.ts
export async function rebuildSearchIndex(env: Env): Promise<void> {
  const skills = await env.DB.prepare('select id, title from skills').all();
  await env.SEARCH_QUEUE.send({ type: 'reindex', count: skills.results.length });
}

// src/index.ts
import { rebuildSearchIndex } from './cron';

export default {
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await rebuildSearchIndex(env);
  },
};
\`\`\`

\`\`\`ts
// test/scheduled.test.ts
import { env } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';
import worker from '../src/index';

describe('scheduled worker', () => {
  it('runs the index rebuild job from the scheduled export', async () => {
    const event = {
      scheduledTime: Date.now(),
      cron: '0 * * * *',
    } as ScheduledEvent;

    const waitUntil = vi.fn();
    const context = { waitUntil } as unknown as ExecutionContext;

    await worker.scheduled(event, env, context);

    expect(waitUntil).not.toHaveBeenCalled();
  });
});
\`\`\`

If your scheduled handler uses \`context.waitUntil\`, assert that it is called with a promise and test the underlying function separately. The key is to cover both the exported Worker shape and the domain function.

## Mocks Should Stay at Your Boundary, Not Cloudflare's

Mock your own API clients, not the Workers runtime. If a handler calls a third-party HTTP API, inject a small client or use fetch stubbing carefully. But do not replace \`Request\`, \`Response\`, KV, or D1 with casual hand-written objects unless the test is a pure unit test.

| Mock target | Good idea? | Reason |
|---|---|---|
| Payment API client | Yes | External service behavior is outside Worker contract |
| Email sender wrapper | Yes | Keeps tests deterministic |
| KVNamespace by plain object | Usually no for integration | Binding semantics and async API can differ |
| Request/Response classes | No in Worker tests | Runtime provides real Web APIs |
| Date/time | Sometimes | Use Vitest timers for expiry logic |
| Environment secrets | Yes with test values | Avoid production secrets in tests |

This distinction keeps tests from becoming a fantasy runtime.

## CI Strategy for Workers

Worker tests often need Wrangler config and bindings. Keep CI explicit: install dependencies, run type checks if allowed in your project, run Worker Vitest tests, and run a small deployed smoke check after deployment. Secrets should come from CI secret storage or Cloudflare environment configuration, not committed files.

For pull requests, prefer local test bindings and non-destructive data. For production smoke, hit safe endpoints like \`/health\`, version metadata, or a read-only synthetic account. Do not run destructive writes against production just because Workers make deployment easy.

## Testing Middleware-Style Request Rewrites

Workers often sit in front of an origin and rewrite requests, attach headers, or short-circuit responses. Those tests should assert both the outgoing fetch shape and the client response. Keep the origin call behind an injectable function if the Worker code is complex, but verify the fetch handler path that performs the rewrite.

\`\`\`ts
// src/proxy.ts
export interface ProxyEnv {
  ORIGIN_URL: string;
}

export async function proxyToOrigin(request: Request, env: ProxyEnv): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname, env.ORIGIN_URL);
  target.search = incoming.search;

  const originRequest = new Request(target, request);
  originRequest.headers.set('x-edge-source', 'cloudflare-worker');

  return fetch(originRequest);
}
\`\`\`

\`\`\`ts
// test/proxy.test.ts
import { describe, expect, it, vi } from 'vitest';
import { proxyToOrigin } from '../src/proxy';

describe('origin proxy rewrite', () => {
  it('preserves path and query while adding the edge source header', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ ok: true }));

    const response = await proxyToOrigin(
      new Request('https://edge.example.com/api/search?q=worker'),
      { ORIGIN_URL: 'https://origin.example.com' },
    );

    expect(response.status).toBe(200);

    const originRequest = fetchMock.mock.calls[0][0] as Request;
    expect(originRequest.url).toBe('https://origin.example.com/api/search?q=worker');
    expect(originRequest.headers.get('x-edge-source')).toBe('cloudflare-worker');

    fetchMock.mockRestore();
  });
});
\`\`\`

This is a pure unit-style test because it focuses on rewrite logic, not bindings. Keep this layer fast. Then add one Worker-runtime integration test that proves the exported handler actually calls the proxy path for the relevant route.

## Durable Objects and Stateful Edge Behavior

Durable Objects change the testing question from "what response did one fetch return" to "what state is preserved for this object id." Tests should check same-id continuity and different-id isolation. Even if the detailed object implementation has unit tests, keep an integration test around the Worker binding and stub path.

| Durable Object behavior | Test assertion |
|---|---|
| Same object id receives repeated requests | Counter, session, or lock state persists |
| Different object ids are isolated | State written through one id is absent from another |
| Object validates request shape | Bad request returns controlled status |
| Object handles concurrent requests | Locking or ordering behavior is explicit |
| Worker routes to expected object id | URL or tenant maps to stable id |

Stateful edge bugs are expensive because they may appear only under concurrency or specific routing keys. Add tests for the id mapping function even if full concurrency coverage lives elsewhere.

## D1 and Migration-Aware Tests

When a Worker uses D1, the test environment needs schema setup. Treat migrations as part of the test input. A handler test that only mocks a returned row will not catch a renamed column, missing index, or migration order problem.

\`\`\`ts
// test/users-d1.test.ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('D1 user lookup', () => {
  it('reads a user row using the migrated schema', async () => {
    await env.DB.prepare(
      'insert into users (id, email, status) values (?, ?, ?)',
    )
      .bind('user_1', 'qa@example.com', 'active')
      .run();

    const row = await env.DB.prepare('select email, status from users where id = ?')
      .bind('user_1')
      .first();

    expect(row).toEqual({
      email: 'qa@example.com',
      status: 'active',
    });
  });
});
\`\`\`

This is not a substitute for application tests. It is a cheap warning that the binding and schema expected by the Worker are aligned in the test runtime.

## Queue Producers and Consumers

Workers often enqueue messages for asynchronous processing. Test the producer contract separately from the consumer contract. The producer should send a payload with a stable type, version, and idempotency key. The consumer should reject or park malformed messages instead of throwing an unhelpful runtime error.

| Queue contract | Producer test | Consumer test |
|---|---|---|
| Message type | Enqueued body includes known \`type\` | Unknown type is rejected safely |
| Version | Body includes schema version | Unsupported version is handled |
| Idempotency | Stable key included | Duplicate message does not double-apply |
| Traceability | Correlation id included | Logs or audit use same id |
| Retry behavior | Transient failure is surfaced | Poison message path is controlled |

Do not rely on a broad end-to-end queue test alone. It can pass while the payload has become hard for future consumers to evolve. A small schema assertion at the producer boundary is cheap insurance.

## Secrets and Environment Separation

Workers make it easy to bind secrets and variables per environment. Tests should verify behavior with test values, but they should never require production secrets. Use non-production bindings and explicit environment names. If a feature is disabled in preview because a secret is absent, assert the controlled disabled response rather than letting the Worker crash.

Also test that diagnostic endpoints do not echo secrets. Edge logs and JSON error payloads are easy places to leak environment details. A negative test for known test-secret values in error responses can catch accidental dumps before deployment.

| Environment mistake | Test to add |
|---|---|
| Missing secret crashes handler | Assert 503 or feature-disabled response |
| Preview uses production binding | Check environment metadata endpoint or deployment config |
| Error payload exposes env | Search response body for known test secret |
| Local test depends on prod data | Seed test binding with synthetic records |

The goal is deterministic behavior when configuration is wrong. A clear failure response is easier to operate than an edge exception with no context.

## Testing Cache API Decisions

Workers often make cache decisions close to the user. If the Worker sets cache keys, varies by header, or bypasses cache for authenticated traffic, write tests that assert those decisions directly. A response that is functionally correct but cached under the wrong key can leak data or serve stale content globally.

| Cache decision | Assertion |
|---|---|
| Authenticated request | Response has \`cache-control: no-store\` |
| Public asset | Long-lived cache header is present |
| Locale variation | \`vary\` includes language header |
| Preview mode | Cache bypass flag is honored |
| Error response | 500 response is not cached |

Cache tests should use synthetic requests with the exact headers the edge receives. Treat cache behavior as part of the API contract, not a deployment detail.

Review cache tests whenever routing or authentication changes. A harmless-looking header change can alter which users share a cached object. For Workers that front patient, account, or billing data, conservative no-store assertions are often the safer default until public caching is deliberately designed. Document each public cache exception in code review, with owner approval and expiry for future audits across environments consistently.

## Frequently Asked Questions

### Should I test Cloudflare Workers in Node or the Workers runtime?

Use Node for pure helper functions. Use the Workers Vitest pool for fetch handlers, bindings, runtime APIs, and anything that depends on workerd behavior. Runtime-sensitive tests in Node can pass while production fails.

### What should I assert in a Worker fetch test?

Assert status, headers, body shape, and binding-visible side effects. Workers often break through headers, cache behavior, or missing env bindings, not only through JSON payload mistakes.

### Can I mock KV with a JavaScript Map?

For a pure unit test around your own wrapper, yes. For Worker integration tests, prefer the configured test binding from \`cloudflare:test\` so the handler uses the same async binding shape it uses at runtime.

### How do I test Cron Trigger code?

Export a scheduled handler, keep domain work in a separate function, and test both. Call the scheduled export with a \`ScheduledEvent\`-shaped object and test the domain function against test bindings.

### Do I still need deployed smoke tests?

Yes. Local Worker tests catch code and binding behavior, but deployed smoke tests catch route configuration, environment secrets, production bindings, and edge deployment mistakes.
`,
};
