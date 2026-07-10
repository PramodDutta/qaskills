import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vercel Functions Testing Guide',
  description:
    'Test Vercel Functions with unit, integration, local runtime, edge, and deployed URL checks so serverless behavior is verified before production.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# Vercel Functions Testing Guide

The function works on a laptop because the handler is just TypeScript. Then production adds a different region, a request body limit, a cold start, a missing environment variable, or an Edge runtime API difference. Vercel Functions testing has to cover the handler logic and the platform boundary. A green unit test is useful, but it does not prove the deployed function can parse the real request, read the right secret, return the right headers, and survive the route configuration that ships.

This guide covers Node.js serverless functions, Edge runtime functions, and Next.js route handlers deployed on Vercel. The examples stay close to real APIs: \`@vercel/node\` types for classic functions, standard \`Request\` and \`Response\` for Edge-style handlers, Vitest for local checks, and deployed URL smoke tests for release confidence.

For broader serverless QA strategy, read [serverless testing](/blog/serverless-testing-complete-guide). For pipeline checks that run against preview or production URLs, connect this with [GitHub Actions deployed URL testing](/blog/github-actions-e2e-deployed-url-testing-guide).

## Split the Function Into a Small Core and a Thin Handler

The fastest Vercel Function test is not an HTTP test. It is a pure function test around the business rule. Keep parsing, validation, and response creation at the edge of the handler. Put the decision logic in a module that can run without Vercel.

| Layer | Example | Test style | What it catches |
| --- | --- | --- | --- |
| Pure logic | Price calculation, signature verification, payload mapping | Unit tests | Business mistakes and edge cases |
| Handler | \`api/*.ts\` or route handler | Request and response tests | Status codes, headers, body parsing |
| Local runtime | \`vercel dev\` or framework dev server | HTTP integration | Routing, env loading, middleware interaction |
| Preview deployment | Vercel preview URL | Smoke and contract checks | Platform config, build output, deployed env |
| Production | Production URL | Synthetic monitoring | Real routing, regions, auth, third-party reachability |

Do not force every test through HTTP. Also do not stop at pure functions. Serverless defects often live in the boundary between the code and platform.

## Testing a Node.js Vercel Function

A classic Vercel function under \`api/\` exports a default handler with \`VercelRequest\` and \`VercelResponse\`. The example below verifies a webhook signature in a pure function and uses the handler only for request concerns.

\`\`\`ts
// api/lib/verify-signature.ts
import crypto from 'node:crypto';

export function isValidSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
\`\`\`

\`\`\`ts
// api/webhook.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isValidSignature } from './lib/verify-signature';

export default function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return response.status(500).json({ error: 'Webhook secret is not configured' });
  }

  const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
  const signature = String(request.headers['x-webhook-signature'] ?? '');

  if (!signature || !isValidSignature(rawBody, signature, secret)) {
    return response.status(401).json({ error: 'Invalid signature' });
  }

  return response.status(202).json({ accepted: true });
}
\`\`\`

The handler is intentionally short. It owns HTTP method handling, environment lookup, header extraction, and response status codes. The cryptographic rule remains testable by itself.

## Unit Testing the Core Rule

\`\`\`ts
// api/lib/verify-signature.test.ts
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { isValidSignature } from './verify-signature';

describe('isValidSignature', () => {
  it('accepts a matching HMAC SHA-256 signature', () => {
    const payload = JSON.stringify({ orderId: 'ord_123', status: 'paid' });
    const secret = 'test-secret';
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    expect(isValidSignature(payload, signature, secret)).toBe(true);
  });

  it('rejects a signature generated with a different secret', () => {
    const payload = JSON.stringify({ orderId: 'ord_123', status: 'paid' });
    const signature = crypto.createHmac('sha256', 'wrong-secret').update(payload).digest('hex');

    expect(isValidSignature(payload, signature, 'test-secret')).toBe(false);
  });
});
\`\`\`

This test does not know about Vercel. That is good. It gives fast feedback on the rule that matters most.

## Handler Tests Without Starting a Server

You can test a Vercel handler by passing small request and response doubles. Keep the double minimal so it reflects only behavior the handler uses.

\`\`\`ts
// api/webhook.test.ts
import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from './webhook';

function createResponse() {
  const response = {
    statusCode: 200,
    headers: new Map<string, string>(),
    body: undefined as unknown,
    setHeader: vi.fn((name: string, value: string) => {
      response.headers.set(name.toLowerCase(), value);
    }),
    status: vi.fn((code: number) => {
      response.statusCode = code;
      return response;
    }),
    json: vi.fn((body: unknown) => {
      response.body = body;
      return response;
    }),
  };

  return response;
}

describe('webhook function', () => {
  afterEach(() => {
    delete process.env.WEBHOOK_SECRET;
  });

  it('returns 202 for a valid signed webhook', () => {
    process.env.WEBHOOK_SECRET = 'test-secret';
    const body = { orderId: 'ord_123', status: 'paid' };
    const rawBody = JSON.stringify(body);
    const signature = crypto.createHmac('sha256', 'test-secret').update(rawBody).digest('hex');
    const response = createResponse();

    handler(
      {
        method: 'POST',
        body,
        headers: { 'x-webhook-signature': signature },
      } as any,
      response as any,
    );

    expect(response.statusCode).toBe(202);
    expect(response.body).toEqual({ accepted: true });
  });

  it('returns 405 for non-POST requests', () => {
    const response = createResponse();

    handler({ method: 'GET', headers: {} } as any, response as any);

    expect(response.statusCode).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });
});
\`\`\`

This is not a substitute for deployed tests. It catches handler branching without waiting for a server.

## Edge Runtime Tests Need Standard Web APIs

Edge functions use the standard \`Request\` and \`Response\` model. That makes local tests cleaner, but it also means Node-only APIs are unavailable in the Edge runtime. If your handler imports \`node:crypto\`, it is not an Edge-safe handler.

\`\`\`ts
// api/geo.ts
export const config = {
  runtime: 'edge',
};

export default function handler(request: Request): Response {
  const country = request.headers.get('x-vercel-ip-country') ?? 'unknown';

  return Response.json({
    country,
    message: country === 'IN' ? 'Namaste' : 'Hello',
  });
}
\`\`\`

\`\`\`ts
// api/geo.test.ts
import { describe, expect, it } from 'vitest';
import handler from './geo';

describe('geo edge function', () => {
  it('uses Vercel country header when present', async () => {
    const response = handler(
      new Request('https://example.test/api/geo', {
        headers: { 'x-vercel-ip-country': 'IN' },
      }),
    );

    await expect(response.json()).resolves.toEqual({
      country: 'IN',
      message: 'Namaste',
    });
  });

  it('falls back when country is unknown', async () => {
    const response = handler(new Request('https://example.test/api/geo'));

    await expect(response.json()).resolves.toEqual({
      country: 'unknown',
      message: 'Hello',
    });
  });
});
\`\`\`

This test uses the same \`Request\` object the handler expects. For Edge code, that is usually better than inventing Node-shaped mocks.

## Environment Variables Are Test Inputs

Vercel Functions often fail because an environment variable exists locally but not in preview, or exists in production but not in development. Treat env as part of the contract.

| Variable type | Example | Test approach | Common failure |
| --- | --- | --- | --- |
| Required secret | \`WEBHOOK_SECRET\` | Handler returns 500 or startup check fails when missing | Silent undefined produces weak auth |
| Public config | \`NEXT_PUBLIC_APP_URL\` | Build-time and runtime assertions | Preview points to production |
| Region-specific endpoint | \`PAYMENTS_BASE_URL\` | Deployed smoke per environment | Wrong sandbox or live endpoint |
| Feature toggle | \`ENABLE_EDGE_CACHE\` | Matrix tests for on and off | Untested disabled path breaks |

For critical functions, add a startup or first-request validation layer. A clear 500 with "not configured" is better than a successful response that skipped verification.

## Local Runtime Checks

Run local HTTP checks against the same routing layer developers use. For a Vercel project, that may be \`vercel dev\`, \`next dev\`, or a framework-specific adapter. The purpose is not deep testing. It is to prove that files are in the right place, routes match, middleware does not block the function, and request parsing behaves as expected.

Good local HTTP cases:

- Correct method returns expected status.
- Wrong method returns \`405\` or your chosen policy.
- Missing auth returns \`401\`.
- Invalid JSON returns \`400\`.
- CORS preflight returns expected headers.
- Large body behavior is understood.

Do not use local runtime checks to simulate every cloud condition. Use preview deployments for that.

## Deployed URL Smoke Tests

A function is not finished until the deployed URL has been checked. Preview deployments are ideal because they include Vercel build output, route configuration, environment variable scoping, and platform headers.

\`\`\`ts
// tests/deployed-webhook-smoke.test.ts
import { describe, expect, it } from 'vitest';

const baseUrl = process.env.DEPLOYED_BASE_URL;

describe.skipIf(!baseUrl)('deployed webhook smoke', () => {
  it('rejects unsigned webhook calls at the deployed URL', async () => {
    const response = await fetch(\`\${baseUrl}/api/webhook\`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId: 'ord_123' }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid signature' });
  });
});
\`\`\`

This smoke test intentionally avoids sending a real signed business event. It proves the deployed function exists and refuses unsafe input.

## Observability Checks Belong in the Test Plan

Serverless debugging depends on logs, request ids, and structured errors. Test that failures emit enough information without leaking secrets. A webhook rejection should include a correlation id, not the secret or full payment payload. An Edge personalization function should log country and decision, not the user's full IP address unless your policy allows it.

For critical flows, add synthetic monitoring after release:

- Ping health-check functions.
- Exercise unauthenticated rejection paths.
- Validate CORS headers from production.
- Alert on latency and error rate.
- Track cold-start-sensitive endpoints separately.

Testing before deployment and monitoring after deployment are not substitutes. They catch different failures.

## Next.js Route Handlers on Vercel

Many Vercel projects use Next.js App Router route handlers instead of files under \`api/\`. The testing idea is the same: keep business logic separate, then call the exported \`GET\`, \`POST\`, or other route function with a real \`Request\`.

\`\`\`ts
// app/api/health/route.ts
export async function GET() {
  return Response.json({
    ok: true,
    region: process.env.VERCEL_REGION ?? 'local',
  });
}
\`\`\`

\`\`\`ts
// app/api/health/route.test.ts
import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('health route', () => {
  it('returns ok and a region value', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
  });
});
\`\`\`

For route handlers that read request bodies, construct a real \`Request\` with JSON. That avoids test doubles that accept shapes the runtime would reject.

## CORS and Preflight Tests

Serverless APIs often work from same-origin pages and fail when a partner site or browser extension calls them. If a function is meant to be cross-origin, test \`OPTIONS\` and the actual method. If it is not meant to be cross-origin, test that it does not accidentally grant broad access.

| CORS case | Expected assertion | Why it matters |
| --- | --- | --- |
| Allowed origin | \`access-control-allow-origin\` matches known origin | Prevents browser clients from failing |
| Unknown origin | No permissive wildcard for credentialed routes | Protects private APIs |
| Preflight method | \`access-control-allow-methods\` includes required method | Catches integration failures before frontend debugging |
| Preflight headers | Required custom headers are allowed | Needed for auth and idempotency headers |

Do not copy a wildcard CORS snippet into every function. A public image transform endpoint and an authenticated billing endpoint should not share the same policy.

## Runtime Differences Worth Testing

Node.js functions and Edge functions differ in available APIs, execution model, and dependency compatibility. A test plan should mark which runtime each route uses and what assumptions go with it.

Edge-sensitive checks:

- No imports from \`node:fs\`, \`node:net\`, or other unavailable Node modules.
- Crypto uses Web Crypto APIs where needed.
- Request and response bodies are handled as streams or standard web objects.
- Cookies and headers are read through runtime-supported APIs.
- Region or geolocation headers are treated as hints, not authorization.

Node-sensitive checks:

- Native dependencies build correctly in the deployment environment.
- Body parsing matches provider and framework behavior.
- Connection reuse is safe for database or HTTP clients.
- Long-running work respects function duration limits.

The test suite should fail close to the mistake. A unit test can catch a Node import in an Edge route before Vercel build output becomes the first signal.

## Background Work and Webhooks

Many serverless functions receive events from payment, email, auth, or CMS providers. The test strategy should cover idempotency, signature verification, and retry-safe side effects. A webhook handler that sends two welcome emails or credits an account twice is a production incident, even if every individual request returned \`200\`.

For each webhook function, define:

- Which header proves authenticity.
- Which event id provides idempotency.
- Which side effects are allowed.
- What happens when downstream storage fails.
- What status code asks the provider to retry.
- How replayed events are logged.

Test the replay path directly. It is one of the most common serverless defects because retries are normal behavior, not an exception.

## Database Connections and Resource Limits

Vercel Functions often interact with databases, queues, object storage, and third-party APIs. Tests should verify the behavior you expect under serverless execution. A connection strategy that works in one long-running local process may fail when many function instances start concurrently.

For database-backed functions, test:

- Missing or invalid connection string fails clearly.
- The function reuses clients when the runtime allows it.
- Transactions roll back on downstream failure.
- Timeouts return controlled errors.
- Empty result sets produce correct status codes.
- Authorization filters are applied before returning data.

Do not put real production databases behind preview smoke tests. Use isolated preview resources, seeded test tenants, or read-only health checks. The goal is platform confidence, not accidental data mutation.

## File Uploads and Body Parsing

Functions that handle uploads need specific tests. Body parsing, content type, size limits, and streaming behavior differ from simple JSON routes. Test small valid files, unsupported content types, empty bodies, oversized bodies where your local runtime can simulate them, and filenames with spaces or non-ASCII characters if your product supports them.

For JSON APIs, test malformed JSON and missing \`content-type\`. Many handlers assume \`await request.json()\` succeeds. A malformed body should produce a controlled \`400\`, not an unhandled exception or HTML error page.

## Caching Headers and Revalidation

Serverless functions often set cache headers for performance. A wrong header can expose private data or make stale content persist after a release. Test headers as part of the response contract.

High-risk cache checks:

- Authenticated responses use \`private\` or \`no-store\` as appropriate.
- Public immutable assets include expected long-lived cache headers.
- Error responses are not cached accidentally.
- Personalized Edge responses vary by the right request properties.
- Revalidation endpoints require a secret or signed request.

Caching bugs are difficult to spot from functional assertions because the first response looks correct. Header tests are cheap and prevent expensive incidents.

## Regional Behavior and Preview Parity

If a function uses region, geolocation, or latency-sensitive routing, preview tests should assert what can be known and avoid pretending every region is covered from one CI runner. Validate that the function reads the expected Vercel headers or environment values, but keep business authorization independent from geolocation headers. Country headers are useful for personalization, not proof of identity.

For products with regional compliance requirements, run scheduled synthetic checks from the regions you claim to support. A single deployed smoke from one CI location cannot prove global behavior.

## Test Naming and Ownership

Name Vercel function tests by route and risk. \`webhook rejects unsigned payment event\` is better than \`webhook test\`. Add owners for critical routes such as billing, auth, checkout, and user deletion. When a deployed smoke fails, the owner should know whether to inspect code, Vercel environment variables, provider status, or recent routing changes.

Serverless failures often sit between teams. Clear test names and ownership reduce the handoff cost.

## Authentication and Authorization on Preview URLs

Preview deployments are excellent test targets, but they can create misleading results when authentication differs from production. A preview URL might be protected by deployment authentication, use preview Clerk or OAuth credentials, or point to a sandbox identity provider. The smoke test should know which identity path it is validating.

For protected functions, test:

- No token returns \`401\`.
- Valid token for the wrong tenant returns \`403\`.
- Expired token is rejected.
- Preview deployment protection does not hide application auth failures.
- Service-to-service credentials are scoped to preview resources.

Do not reuse production tokens in CI. Create dedicated test identities and rotate them like other secrets.

## Contract Tests for Function Responses

Functions that serve frontend clients need response contracts just like larger APIs. A route returning \`{ ok: true }\` today and \`{ success: true }\` tomorrow can break a deployed frontend if versions move independently. Add lightweight schema checks or typed client tests for functions consumed by browser code, mobile apps, or external partners.

Contract tests are especially useful for error responses. A UI that expects \`code: "invalid_coupon"\` should not suddenly receive \`message: "Bad Request"\` with no code. Keep these tests close to the function or in a shared API test package, but make ownership clear.

## Deployment Configuration as Test Input

Some Vercel behavior lives outside the function file: rewrites, redirects, headers, cron schedules, and route matching. Include configuration review in the test plan. A function can pass local tests and still be unreachable because a rewrite captures the path first. A cron endpoint can work manually and fail in production because the schedule or secret header is wrong.

For critical functions, create a deployed smoke that verifies the public path, not just the handler import. That is the only way to catch routing and deployment configuration together.

## Scheduled Functions and Cron Routes

Cron-triggered functions need their own tests because the caller is not a browser or normal API client. The route may require a shared secret header, run with production-only environment variables, and perform batch work that is hard to observe from the response body. Test the handler logic with a fake clock and controlled data, then test the deployed endpoint rejects calls without the cron secret.

For scheduled jobs, assert idempotency and partial failure behavior. If a weekly digest job sends email to ten thousand users, a retry after the fifth thousand should not send duplicates to the first half. If a cleanup job deletes expired records, it should report how many records were touched and leave an audit trail. A \`200\` response from the cron route is not enough evidence.

## Function Tests During Incident Response

When production is failing, a small function-specific test can become a diagnostic tool. Keep smoke tests easy to run against a selected deployment URL and environment. A test that proves "signed webhook accepted, unsigned webhook rejected, replay ignored" is more useful during an incident than a broad suite that takes twenty minutes and fails for unrelated reasons. Incident-ready tests are narrow, named, and safe to run repeatedly.

## Frequently Asked Questions

### Can I test a Vercel Function without deploying it?

Yes. Test pure logic directly, test handlers with request and response doubles, and run local HTTP checks. Still add deployed URL smoke tests because platform config and environment scoping only appear after deployment.

### Should Edge Functions use the same mocks as Node.js functions?

No. Edge handlers use standard \`Request\` and \`Response\` APIs. Prefer constructing real \`Request\` objects in tests instead of Node-style response mocks.

### What is the highest-value deployed smoke test?

For most functions, test the unsafe path first: missing auth, invalid signature, wrong method, or malformed body. A function that fails open is more dangerous than one that fails closed.

### How do I test Vercel environment variable mistakes?

Add explicit missing-env tests around the handler and run preview smoke tests against the deployed URL. Keep required env names documented and fail clearly when they are absent.

### Are unit tests enough for serverless functions?

No. Unit tests catch logic errors. Serverless behavior also depends on routing, runtime, headers, body parsing, environment variables, and deployment configuration.
`,
};
