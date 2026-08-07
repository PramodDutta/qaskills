import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'API Testing Error Envelope Contract: Make Every Failure Parsable',
  description: 'Build an API testing error envelope contract that keeps failures consistent, debuggable, safe for clients, and easier to verify across services.',
  date: '2026-08-07',
  category: 'API Testing',
  content: `
# API Testing Error Envelope Contract: Make Every Failure Parsable

An API testing error envelope contract defines the stable JSON shape every failed API response must follow. It covers the status mapping, machine-readable error code, human-readable message, request correlation data, field-level validation details, and rules for what must never leak. The payoff is practical: clients can parse failures predictably, QA can assert negative paths without brittle string matching, and incidents become easier to diagnose because every error carries the same minimum evidence.

Treat the envelope as a public contract, not a logging convenience. A useful contract says, for example, that a validation failure returns \`400\` with \`error.code = "validation_failed"\`, an array of field issues, a safe message, and a \`requestId\`. It also says that an authorization failure must not reveal whether a hidden resource exists. The test suite should prove those guarantees across controllers, middleware, framework exceptions, upstream timeouts, and schema validation failures.

This article shows a concrete workflow for QA and test-automation engineers. The examples use TypeScript, Supertest-style HTTP tests, JSON Schema, and contract thinking, but the same model works with Playwright APIRequestContext, Cypress API tests, Postman collections, or a custom runner. If your team already tests happy paths with Node HTTP tooling, pair this with [Supertest Node API testing](/blog/supertest-node-api-testing-complete-guide). If consumers rely on provider guarantees across repos, connect the envelope to [Pact contract testing](/blog/contract-testing-pact-complete-guide) so error cases are verified from the client perspective too.

## Choose the Envelope Fields Clients Can Depend On

The envelope should be small enough to remain stable and rich enough to let a client decide what to do next. Many teams start with a message string because it is easy to assert. That is the part most likely to change during copy editing, localization, or security review. The durable contract is the structured data around the message.

Start by separating four jobs: classification, display, diagnosis, and remediation. Classification belongs in a machine-readable code. Display belongs in a safe message that can be shown to a user or support agent. Diagnosis belongs in correlation fields and optional metadata. Remediation belongs in field issues, retry hints, or documentation links when they are appropriate.

| Field | Contract role | Stable for clients? | Example |
|---|---|---|---|
| \`error.code\` | Machine-readable failure class | Yes | \`validation_failed\` |
| \`error.message\` | Safe summary | Usually, but not exact text | \`Request body is invalid.\` |
| \`error.requestId\` | Support and tracing handle | Present, value varies | \`req_01J...\` |
| \`error.details\` | Structured diagnosis | Shape must be stable per code | Field issues array |
| \`error.retryable\` | Client retry decision | Yes when provided | \`false\` |
| \`error.docsUrl\` | Optional remediation | Stable category, URL may move | Plain URL |

Keep top-level success and failure bodies visually distinct. A response that sometimes returns \`{ data: ... }\` and sometimes returns \`{ error: ... }\` is easy to branch on. A response that returns \`{ status, message, result }\` for everything forces clients to infer intent from values. Tests become less precise because the same optional properties appear in every scenario.

A compact TypeScript contract can look like this:

\`\`\`ts
export type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
    requestId: string;
    retryable?: boolean;
    details?: Record<string, unknown>;
  };
};

export type FieldIssue = {
  path: string;
  rule: 'required' | 'format' | 'range' | 'unknown' | 'conflict';
  message: string;
};
\`\`\`

The \`details\` field is intentionally code-specific. A validation error may include \`details.fields\`; a rate limit error may include \`details.limit\` and \`details.resetAt\`; a dependency failure may include only a safe upstream category. Do not turn \`details\` into a dumping ground for internal exception objects. Tests should fail if stack traces, SQL fragments, file paths, secrets, or raw upstream payloads appear in public error bodies.

## Map Error Codes to HTTP Status Without Guesswork

HTTP status and application error code are related but not interchangeable. The status gives intermediaries and generic clients a protocol-level signal. The error code gives product-specific meaning. Testing only one of them leaves gaps.

Build a registry that QA, backend, frontend, and support can read. The registry does not need to be elaborate. It can start as a typed object in the API repository, a JSON file used by tests, or a generated OpenAPI component. The important part is that every code has an expected status range, retry policy, safe display behavior, and details shape.

| Error code | Typical status | Retryable | Details shape | Notes |
|---|---:|---|---|---|
| \`validation_failed\` | 400 | No | \`fields: FieldIssue[]\` | Request body, query, or path parameter failed validation |
| \`unauthenticated\` | 401 | Maybe after refresh | Optional | Token missing, expired, or invalid |
| \`forbidden\` | 403 | No | Optional | Authenticated caller lacks permission |
| \`not_found\` | 404 | No | Optional | Use carefully to avoid enumeration leaks |
| \`conflict\` | 409 | Sometimes | Optional resource conflict data | Duplicate, version mismatch, state transition conflict |
| \`rate_limited\` | 429 | Yes after wait | Optional retry timing | Pair body with documented headers when available |
| \`internal_error\` | 500 | Maybe | Minimal | Never expose raw exception data |

This mapping becomes executable. A helper can assert that a response is both an envelope and the correct envelope for a scenario:

\`\`\`ts
import type { Response } from 'supertest';

type ExpectedError = {
  status: number;
  code: string;
  retryable?: boolean;
};

export function expectApiError(res: Response, expected: ExpectedError) {
  expect(res.status).toBe(expected.status);
  expect(res.headers['content-type']).toContain('application/json');
  expect(res.body).toEqual(
    expect.objectContaining({
      error: expect.objectContaining({
        code: expected.code,
        message: expect.any(String),
        requestId: expect.any(String),
      }),
    }),
  );

  if (expected.retryable !== undefined) {
    expect(res.body.error.retryable).toBe(expected.retryable);
  }
}
\`\`\`

The helper deliberately avoids asserting the exact message. Message copy is still part of user experience, but exact string checks are rarely the right API contract. If you must verify message text for a public API, keep those checks isolated and document that changing text is a breaking change for consumers who show it directly.

## Validate the Envelope Shape With JSON Schema

Unit assertions catch obvious mistakes, but they often miss nested drift. JSON Schema is useful for proving that every error body has the same skeleton and that known code-specific details remain parseable. The schema should be strict about public shape and flexible only where the contract is intentionally open.

\`\`\`ts
export const apiErrorEnvelopeSchema = {
  type: 'object',
  required: ['error'],
  additionalProperties: false,
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message', 'requestId'],
      additionalProperties: false,
      properties: {
        code: { type: 'string', minLength: 1, pattern: '^[a-z][a-z0-9_]*$' },
        message: { type: 'string', minLength: 1 },
        requestId: { type: 'string', minLength: 8 },
        retryable: { type: 'boolean' },
        details: { type: 'object' },
      },
    },
  },
} as const;
\`\`\`

Notice the schema does not accept arbitrary top-level properties. That catches a common framework regression where middleware wraps errors as \`{ statusCode, message, error }\` or adds a debug field only in one route. If you allow extra top-level properties, you are effectively allowing multiple error contracts.

For validation errors, add a second schema that applies when \`error.code\` is \`validation_failed\`:

\`\`\`ts
export const validationErrorDetailsSchema = {
  type: 'object',
  required: ['fields'],
  additionalProperties: false,
  properties: {
    fields: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['path', 'rule', 'message'],
        additionalProperties: false,
        properties: {
          path: { type: 'string', minLength: 1 },
          rule: {
            enum: ['required', 'format', 'range', 'unknown', 'conflict'],
          },
          message: { type: 'string', minLength: 1 },
        },
      },
    },
  },
} as const;
\`\`\`

You can compile these schemas with Ajv or another JSON Schema validator. Use the validator's documented strictness features where available, and avoid response mutation features such as default insertion or type coercion for API contract tests. The test should observe what the server really sent.

## Exercise Every Error Producer, Not Only Controllers

Most APIs have several paths that can create an error. A route handler may throw a domain exception. Request validation middleware may reject a body before the handler runs. Authentication middleware may stop the request before route matching. A database client may throw a timeout. A reverse proxy or framework may emit its own response if the request is too large. A real envelope contract has to survive all of those routes into failure.

Use a coverage matrix that is organized by producer and public code, not by implementation class names. Implementation classes change. The public contract stays.

| Producer | Example trigger | Expected envelope proof |
|---|---|---|
| Body validator | Missing required field | \`400 validation_failed\` with field details |
| Auth middleware | Missing bearer token | \`401 unauthenticated\` without resource data |
| Permission check | Valid user, wrong role | \`403 forbidden\` with safe message |
| Domain service | Duplicate unique value | \`409 conflict\` with stable code |
| Dependency wrapper | Simulated upstream timeout | \`503\` or documented code with retry signal |
| Fallback handler | Unhandled exception | \`500 internal_error\` with no debug leakage |

A representative integration test can drive several of these through the real HTTP stack:

\`\`\`ts
import request from 'supertest';
import { app } from '../src/app';
import { expectApiError } from './assertions/errorEnvelope';

describe('POST /projects error envelope', () => {
  it('returns field issues for invalid input', async () => {
    const res = await request(app)
      .post('/projects')
      .set('authorization', 'Bearer test-editor-token')
      .send({ name: '' });

    expectApiError(res, {
      status: 400,
      code: 'validation_failed',
      retryable: false,
    });
    expect(res.body.error.details.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'name',
          rule: 'required',
        }),
      ]),
    );
  });

  it('hides project existence from unauthorized users', async () => {
    const res = await request(app)
      .get('/projects/private-project-id')
      .set('authorization', 'Bearer test-viewer-token');

    expectApiError(res, {
      status: 404,
      code: 'not_found',
      retryable: false,
    });
  });
});
\`\`\`

The second test is intentionally about security semantics, not just shape. Some APIs return \`403 forbidden\` when the caller lacks access. Others return \`404 not_found\` to avoid confirming that a resource exists. Either can be correct, but the decision must be explicit and tested. If each route chooses independently, attackers get an enumeration signal and clients get inconsistent behavior.

## Use Fixtures That Prove Negative Paths Are Real

An error envelope suite can accidentally become a collection of tests that never hit the intended code path. For example, a test for duplicate email conflict might send an unauthenticated request. It still receives an envelope, but not the one under test. Always prove the preconditions that make the negative path meaningful.

For conflict tests, create the existing record first and authenticate with a role that could otherwise create the resource. For validation tests, use a token that is valid and a route that exists. For permission tests, use a target resource that definitely exists and a caller that definitely lacks access. For dependency failure tests, inject a controlled failure rather than waiting for an external service to misbehave.

\`\`\`ts
async function createProjectFixture(ownerToken: string) {
  const created = await request(app)
    .post('/projects')
    .set('authorization', \`Bearer \${ownerToken}\`)
    .send({ name: 'Envelope Contract Fixture' });

  expect(created.status).toBe(201);
  return created.body.data;
}

it('returns conflict when the project slug already exists', async () => {
  await createProjectFixture('test-admin-token');

  const res = await request(app)
    .post('/projects')
    .set('authorization', 'Bearer test-admin-token')
    .send({ name: 'Envelope Contract Fixture' });

  expectApiError(res, {
    status: 409,
    code: 'conflict',
    retryable: false,
  });
});
\`\`\`

In your real test file, you would write the ordinary JavaScript template string. The test itself demonstrates the more important rule: set up the exact state that makes the error meaningful, then assert the public code.

## Catch Debug Leakage With Deny-List Assertions

Schema validation confirms allowed shape. It does not automatically prove sensitive values are absent inside allowed strings. Add explicit leakage checks for failure bodies. This is especially important for unhandled exceptions, dependency failures, SQL errors, object storage failures, and authentication token parsing.

A simple deny-list helper is not a complete security scanner, but it catches common mistakes early:

\`\`\`ts
const forbiddenErrorFragments = [
  'SELECT ',
  'INSERT INTO',
  'stack',
  'Traceback',
  'ECONNREFUSED',
  'AWS_SECRET_ACCESS_KEY',
  'PRIVATE KEY',
  '/usr/src/app',
];

export function expectNoDebugLeakage(body: unknown) {
  const text = JSON.stringify(body);

  for (const fragment of forbiddenErrorFragments) {
    expect(text).not.toContain(fragment);
  }

  expect(text).not.toMatch(/[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{20,}/);
}
\`\`\`

When this test fails, do not simply add the new fragment to an allow list. Find the error producer and normalize it before serialization. The public response should receive a safe summary, while logs and traces receive the detailed exception under appropriate access controls. Public envelope tests and observability tests should agree on the same \`requestId\` so support can bridge from client report to internal trace without exposing trace content to the client.

## Verify Headers and Body Agree

Error contracts often span both body and headers. Rate limiting may include documented rate-limit headers plus \`error.code = "rate_limited"\`. Authentication failures may include a challenge header depending on the scheme. Request IDs may appear in both \`x-request-id\` and the response body. QA should test cross-field consistency because mismatches create hard-to-debug client behavior.

\`\`\`ts
it('keeps the body requestId aligned with the response header', async () => {
  const res = await request(app)
    .get('/projects')
    .set('authorization', 'Bearer expired-token');

  expectApiError(res, {
    status: 401,
    code: 'unauthenticated',
  });
  expect(res.headers['x-request-id']).toBe(res.body.error.requestId);
});
\`\`\`

For \`429\` responses, avoid inventing a retry policy in tests. Assert the behavior your API documents. If your service documents a body-level \`retryable\` boolean and a standard or custom retry timing header, test that they do not contradict each other. If your service does not document retry timing, test only the envelope and status.

## Diagnose the Most Common Failure Mode

The most realistic failure mode is route-specific error handling that bypasses the shared formatter. It usually appears after a team adds a new framework plugin, a streaming route, a file-upload endpoint, or a quick catch block around an upstream SDK call. The symptoms are inconsistent bodies for the same public failure class. One endpoint returns the envelope. Another returns a framework default. A third returns plain text.

Diagnose it in layers. First, run a contract sweep that hits one known trigger per route group. Second, log the \`content-type\`, status, and raw body for failures that do not parse as JSON. Third, trace the error path through middleware order. In many frameworks, validation and body parsing happen before route handlers, so controller-level try/catch code cannot normalize those failures. The formatter must sit at the boundary where the framework exposes centralized error handling.

A route sweep can stay small:

\`\`\`ts
type Probe = {
  name: string;
  method: 'get' | 'post';
  path: string;
  token?: string;
  body?: unknown;
  expected: { status: number; code: string };
};

const probes: Probe[] = [
  {
    name: 'missing auth on project list',
    method: 'get',
    path: '/projects',
    expected: { status: 401, code: 'unauthenticated' },
  },
  {
    name: 'invalid project body',
    method: 'post',
    path: '/projects',
    token: 'test-editor-token',
    body: { name: '' },
    expected: { status: 400, code: 'validation_failed' },
  },
];

it.each(probes)('$name', async (probe) => {
  const agent = request(app)[probe.method](probe.path);
  if (probe.token) agent.set('authorization', \`Bearer \${probe.token}\`);
  if (probe.body) agent.send(probe.body);

  const res = await agent;
  expectApiError(res, probe.expected);
});
\`\`\`

When a probe fails with HTML, plain text, or a missing \`error\` property, the fix is almost never in the test. The test revealed a boundary that is not using the shared serializer.

## What Teams Get Wrong About Error Messages

The most common mistake is treating \`message\` as the contract and \`code\` as decoration. That reverses the durability of the fields. Messages change because product language changes, translation changes, support guidance changes, and security teams remove detail. Codes should change rarely because clients branch on them. If tests assert exact messages everywhere, harmless copy edits look like API regressions and engineers learn to ignore failures.

The second mistake is using internal exception class names as public codes. \`PrismaClientKnownRequestError\`, \`JsonWebTokenError\`, or \`AxiosError\` might be useful in logs, but they are not product contracts. A database library migration should not force every mobile client to change its error handling. Map internal causes to public codes at the API boundary and test the public code.

The third mistake is adding a universal \`details.anything\` object without code-specific rules. That creates the appearance of structure while preserving chaos. Consumers still cannot trust it. Pick a few high-value details shapes and test them deeply. Leave details absent for errors where extra information would be unstable or risky.

## Put the Contract in CI Without Creating Noise

Run envelope tests in the same tier as route integration tests. They are fast enough to run on pull requests when fixtures are local and dependencies are controlled. Keep broad route sweeps separate from deep scenario tests so a developer can see whether they broke the global formatter or one business rule.

| CI check | Scope | Failure meaning | Good owner |
|---|---|---|---|
| Envelope schema tests | Every negative-path response fixture | Public shape drifted | API platform or service team |
| Code/status mapping tests | Representative route scenarios | Wrong public classification | Feature team |
| Leakage tests | 4xx and 5xx bodies | Sensitive data escaped boundary | Service team with security review |
| Consumer contract verification | Consumer-defined errors | Breaking client expectation | Provider and consumer teams |
| OpenAPI lint or review | Documented examples | Docs and implementation diverged | API owner |

Make failures print the response body, expected code, actual status, and route name. Do not hide the raw body behind a generic matcher failure. The first minute after a failure should answer whether the problem is status mapping, body shape, wrong error producer, or leakage.

## Keep Documentation and Examples Executable

Public API docs often show one error example and let the rest drift. Instead, generate examples from the same fixtures used by tests or at least validate documented examples with the same schema. If OpenAPI is part of your workflow, define an error schema component and reference it from error responses. Then add scenario examples for the most important codes.

\`\`\`yaml
components:
  schemas:
    ApiErrorEnvelope:
      type: object
      required:
        - error
      additionalProperties: false
      properties:
        error:
          type: object
          required:
            - code
            - message
            - requestId
          properties:
            code:
              type: string
            message:
              type: string
            requestId:
              type: string
            retryable:
              type: boolean
            details:
              type: object
\`\`\`

Do not let the OpenAPI file become a separate wish list. A documented schema is valuable only if tests prove the server emits it. Conversely, tests are easier to understand when they reference a documented public shape. The two artifacts should converge, not compete.

## A Practical Adoption Sequence

For an existing API, avoid a big-bang rewrite. First, document the envelope you want for new endpoints. Second, add a matcher and schema validator. Third, cover the highest-traffic and highest-risk errors: authentication, authorization, validation, not found, conflict, rate limit, and internal error. Fourth, add a fallback-handler test that intentionally throws a synthetic exception in a test-only route or controlled stub. Fifth, start tightening route groups as they are touched.

During migration, be explicit about legacy exceptions. If one route still returns \`{ message: string }\`, mark it as legacy in a test list with an owner and deadline. Silent inconsistency is the problem. A known, visible gap can be planned.

The finished state is not complicated: one envelope type, one schema, one assertion helper, one mapping registry, representative route coverage, leakage checks, and documentation examples that follow the same shape. That is enough for QA engineers to turn negative-path testing from brittle string checks into a maintainable API compatibility system.

## Frequently Asked Questions

### Should every API error use the same envelope?

Every JSON API error should use the same outer envelope unless there is a documented protocol reason not to. Streaming endpoints, file downloads, redirects, and gateway-level failures may have different constraints, but ordinary REST and RPC-over-HTTP endpoints should converge. The outer shape gives clients a stable parser. Code-specific \`details\` can vary by error type as long as each variation is documented and tested. If an endpoint cannot use the envelope, track it as an explicit exception with a test that proves the exception is intentional.

### Should tests assert the exact error message?

Usually no. Assert that \`message\` exists, is safe, and is non-empty, then branch client behavior on \`error.code\`. Exact message assertions are appropriate only when the wording is itself a public contract, such as a regulated disclosure or a documented developer-facing API message. Even then, isolate those checks so copy changes produce clear review decisions. For most product APIs, exact message checks create noisy failures and encourage engineers to preserve poor wording just to keep tests green.

### How do we test errors from dependencies without making tests flaky?

Inject the dependency failure through a stub, fake adapter, local test server, or controlled container rather than relying on a real outage. The goal is to prove your boundary mapping, not the third-party service. Simulate timeout, unavailable, malformed response, and rejected credentials as separate cases if they map to different public codes. Keep the public response safe and stable, while internal logs preserve the original cause under the same request ID.

### Is an error envelope contract the same as consumer-driven contract testing?

No. The envelope contract is the provider's public failure shape. Consumer-driven contract testing verifies that a specific consumer can still interact with the provider according to examples it cares about. They complement each other. Envelope tests protect consistency across all provider routes. Consumer contracts protect real client expectations, including which error codes and details a client uses. For important negative paths, use both so provider consistency and consumer compatibility are checked independently.
`,
};
