import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'AWS Lambda API Testing Guide',
  description:
    'AWS Lambda API testing guide for handlers, API Gateway events, local emulation, integration checks, and serverless CI confidence before release.',
  date: '2026-07-10',
  category: 'API Testing',
  content: `# AWS Lambda API Testing Guide

The event object is the contract most Lambda API tests ignore until production sends a path parameter as undefined or a base64 flag flips the body path. Serverless APIs are still APIs, but the boundary is not a socket inside your handler. It is the API Gateway or Function URL event, the Lambda context, permissions, environment variables, serialization rules, and whatever managed service the handler calls next.

Good Lambda API testing separates those layers. Unit tests call the handler with realistic events. Integration tests prove AWS wiring, IAM, and deployed routes. Local emulation helps developer feedback, but it should not be mistaken for the cloud. For broader serverless coverage, use [serverless testing complete guide](/blog/serverless-testing-complete-guide). For API design and assertion strategy, pair this with [API testing best practices guide](/blog/api-testing-best-practices-guide).

## Know which Lambda boundary you are testing

A Lambda function behind HTTP API, REST API, ALB, or Function URL receives different event shapes. A test that invents a generic object can pass while the deployed route fails. Start by naming the trigger and using the matching event type from \`aws-lambda\` in TypeScript or the equivalent event fixture in your runtime.

| Trigger | Event family | Test focus | Common failure |
|---|---|---|---|
| API Gateway HTTP API v2 | \`APIGatewayProxyEventV2\` | routeKey, rawPath, cookies, requestContext | Tests use REST API v1 fields |
| API Gateway REST API v1 | \`APIGatewayProxyEvent\` | multiValueHeaders, pathParameters | Missing body parsing branch |
| Lambda Function URL | HTTP-like event v2 | IAM or none auth, raw query | Assuming API Gateway authorizer data |
| EventBridge scheduled call | \`ScheduledEvent\` | idempotent job behavior | Testing it like an HTTP request |

This guide focuses on HTTP-style Lambda APIs, where handlers return statusCode, headers, and body.

## Keep handler logic thin enough to test directly

The handler should adapt the cloud event into application logic. If all business behavior lives inside the handler, every test must construct large AWS events and mock every dependency. Extract the domain function, then keep handler tests for parsing, status mapping, and integration with AWS-shaped inputs.

\`\`\`ts
// src/create-order.ts
export type CreateOrderInput = {
  sku: string;
  quantity: number;
};

export function createOrder(input: CreateOrderInput) {
  if (input.quantity < 1) {
    return { ok: false as const, status: 400, message: 'quantity must be positive' };
  }

  return {
    ok: true as const,
    status: 201,
    orderId: 'ord_' + input.sku + '_' + input.quantity,
  };
}
\`\`\`

\`\`\`ts
// src/handler.ts
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { createOrder } from './create-order';

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  if (!event.body) {
    return { statusCode: 400, body: JSON.stringify({ error: 'missing body' }) };
  }

  const parsed = JSON.parse(event.body);
  const result = createOrder({
    sku: String(parsed.sku),
    quantity: Number(parsed.quantity),
  });

  if (!result.ok) {
    return { statusCode: result.status, body: JSON.stringify({ error: result.message }) };
  }

  return {
    statusCode: result.status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orderId: result.orderId }),
  };
}
\`\`\`

The handler still matters, but it no longer owns the entire product rule.

## Unit testing API Gateway events

Use real event shapes in handler tests. You do not need every property for every test, but required nested fields should look like the trigger. A small factory keeps tests readable.

\`\`\`ts
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { handler } from '../src/handler';

function httpEvent(body: unknown): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: 'POST /orders',
    rawPath: '/orders',
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
    requestContext: {
      accountId: '123456789012',
      apiId: 'api-id',
      domainName: 'example.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'example',
      http: {
        method: 'POST',
        path: '/orders',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'vitest',
      },
      requestId: 'request-id',
      routeKey: 'POST /orders',
      stage: '$default',
      time: '10/Jul/2026:10:00:00 +0000',
      timeEpoch: 1783677600000,
    },
    isBase64Encoded: false,
    body: JSON.stringify(body),
  };
}

describe('order Lambda API handler', () => {
  it('returns 201 for a valid order request', async () => {
    const response = await handler(httpEvent({ sku: 'book', quantity: 2 }));

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(String(response.body))).toEqual({ orderId: 'ord_book_2' });
  });

  it('maps domain validation to HTTP 400', async () => {
    const response = await handler(httpEvent({ sku: 'book', quantity: 0 }));

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(String(response.body))).toEqual({ error: 'quantity must be positive' });
  });
});
\`\`\`

This test uses the real AWS event type and exercises the handler without deploying anything.

## Body parsing, base64, and content type branches

API Gateway can pass bodies as strings, and binary payloads may arrive base64 encoded. If the API accepts JSON only, reject unsupported content types and invalid JSON deliberately. Do not let a thrown \`SyntaxError\` become a 502 through an unhandled exception.

Tests should cover missing body, invalid JSON, wrong content type, and base64 behavior if binary is supported. Those cases are cheap locally and expensive when discovered through customer traffic.

| Case | Expected handler behavior | Test fixture detail |
|---|---|---|
| Missing body | 400 with clear message | \`body: undefined\` |
| Invalid JSON | 400, not unhandled exception | \`body: '{bad json'\` |
| Unsupported media type | 415 or documented 400 | header set to text/plain |
| Base64 upload | Decode before validation | \`isBase64Encoded: true\` |

## Local emulation without false confidence

SAM CLI, Serverless Framework, LocalStack, and SST-style development servers can all shorten feedback. They are useful, but each emulates a subset of AWS. Local success does not prove IAM policies, deployed authorizers, API Gateway mapping, throttling, or regional configuration.

Use local emulation for fast request-response development. Use deployed integration tests for cloud wiring. Keep those categories separate in naming and CI. A command called \`test:local-api\` should not be the only gate before production.

\`\`\`bash
sam local start-api --template template.yaml
curl -s -X POST http://127.0.0.1:3000/orders \\
  -H 'content-type: application/json' \\
  -d '{"sku":"book","quantity":2}'
\`\`\`

The curl smoke is useful, especially for serialization and route mapping. It is not a substitute for invoking the deployed endpoint with the real authorizer and IAM permissions.

## Deployed integration tests

At least one CI environment should deploy the Lambda API and call it over HTTPS. That catches route configuration, IAM role permissions, environment variables, bundling mistakes, and missing layers. Keep the data disposable and namespaced by build ID.

Integration tests should avoid asserting implementation details. Assert status codes, response schema, headers that clients rely on, and side effects in managed services. If the handler writes DynamoDB, verify through the same table or an API read path, then clean up.

Do not run broad destructive tests against shared production resources. For pull requests, use ephemeral stacks or a stable test stage with strict isolation.

## Observability assertions for Lambda APIs

Testing serverless APIs should include failure visibility. A handler that returns a clean 400 should not produce an error log. A dependency failure should include correlation IDs and enough context to debug without leaking secrets. If the function uses structured logging, tests can assert log fields at the unit level and dashboards at the integration level.

Cold starts, timeouts, and throttles need monitoring rather than pure functional assertions. A release gate can query metrics after an integration test run, but keep thresholds realistic. One cold start in a test stage is not a product defect. A function timing out under normal payloads is.

## Environment variables and configuration contracts

Lambda functions often depend on environment variables for table names, queue URLs, feature flags, and downstream endpoints. Unit tests should verify missing configuration fails early with a clear message. Integration tests should verify deployed configuration points to the intended test resources, not production by accident.

Do not read environment variables deep inside business logic if you can avoid it. Load configuration once, validate it, and pass it into the service layer. That makes tests easier and failures clearer. A handler that throws "TABLE_NAME is required" during cold start is easier to diagnose than a DynamoDB call to an undefined table name.

Configuration tests are especially important for aliases and stages. A staging alias can point to the right function version while using the wrong environment variable. The route works, but writes to the wrong resource. A small integration smoke that creates a record with a build-specific prefix and verifies it in the expected resource can catch that class of error.

## IAM and permission testing

IAM failures do not show up in pure handler unit tests. The code may be correct while the role lacks \`dynamodb:PutItem\`, \`sqs:SendMessage\`, or permission to read a secret. Deployed integration tests should exercise at least one permission-sensitive path for each managed service the function uses.

Keep the assertion product-facing. If a permission is missing, the function should return a controlled error or fail the smoke clearly. Do not write tests that require broad permissions just to make setup convenient. The test role should resemble the production role's least-privilege shape.

For high-risk functions, add policy review in infrastructure code. Tests can parse the generated template and assert that wildcard permissions are not introduced for sensitive resources. That is not a runtime API test, but it protects the same release.

## Contract fixtures from real API Gateway events

The best event factories are based on captured, sanitized events from the real trigger. API Gateway event shapes include details that hand-written fixtures often omit, such as cookies, authorizer claims, raw path, and request context. Capture a sample from a non-production stage, remove sensitive values, and store it as a fixture.

Version those fixtures. When the API Gateway payload format changes, the fixture diff should be reviewed. If the team migrates from REST API v1 to HTTP API v2, tests should fail loudly until handler parsing is updated.

Avoid enormous fixtures in every test. Use one full contract fixture to prove shape compatibility, then build smaller factory events for focused cases. That keeps tests readable while preserving one realistic sample.

## Testing authorizers and identity propagation

Many Lambda APIs depend on identity claims inserted by a JWT authorizer, Lambda authorizer, or IAM context. Handler tests should cover missing claims, malformed claims, and insufficient permissions. Deployed tests should prove the authorizer is actually attached to the route.

If the handler expects \`requestContext.authorizer.jwt.claims.sub\`, write a test with that shape. Also write a test without it. A missing identity should not become an internal server error. It should return the product's documented unauthorized or forbidden response.

Identity propagation also matters for audit logs. If a user approves a transfer, the audit entry should contain the authenticated subject from the event, not a user ID passed in the body. Tests should make that distinction explicit.

## Versioning and alias traffic shifting

Lambda aliases and traffic shifting let teams release gradually, but they complicate testing. A smoke test against an alias may hit either old or new code during a canary. That is fine if the test is designed for compatibility, and confusing if it expects only the new behavior.

Before enabling traffic shifting, run direct tests against the published version or deployment stage that represents the candidate. After shifting begins, smoke tests should assert stable public behavior that both versions support. New behavior tests can wait until the alias points fully to the new version or can call a candidate-only endpoint.

Record the function version or deployment identifier in test output. When an API smoke fails during a canary, knowing which version handled the request cuts investigation time dramatically.

## Async failure paths and partial side effects

Many Lambda APIs call more than one dependency. An order endpoint may validate input, write a record, send a queue message, and publish a metric. Tests should cover what happens when the second or third step fails. The right behavior depends on the architecture, but it must be deliberate.

If the function writes to DynamoDB and then fails to enqueue a fulfillment message, does it mark the order pending, roll back through a compensating update, or rely on a repair job? Write a test for that decision. Serverless functions make it easy to hide partial failure because each dependency call looks small in code.

Use dependency injection or thin adapters so unit tests can force failures without real AWS outages. Then use integration tests for one happy path through the real services. That combination gives speed and cloud confidence.

## Schema validation at the Lambda edge

Validate request payloads before business logic. A Lambda handler should reject missing fields, wrong types, unsupported enum values, and unknown content types consistently. Schema validation also protects downstream services from malformed data that would be harder to clean up later.

For TypeScript handlers, teams often use Zod, Valibot, TypeBox, or JSON Schema validators. The specific library matters less than the testing rule: invalid payloads should produce documented client errors, not unhandled exceptions. Add tests for extra fields if the API has strict schemas, and for coercion if the product intentionally accepts stringified numbers.

Contract tests should include the serialized response body too. Clients depend on error shapes. Changing \`error\` to \`message\` can break SDKs even when the status code remains 400.

## Testing Lambda concurrency assumptions

Lambda may run many instances of the same function at the same time. Tests should avoid designs that assume in-memory state is shared or durable. A cached configuration value can be fine. A cached idempotency key list inside the function process is not a reliable control.

For APIs that process payments, orders, or account changes, write concurrency tests at the service layer. Fire two requests with the same idempotency key and assert one durable result. If the function uses DynamoDB conditional writes, SQS FIFO deduplication, or database uniqueness, integration tests should prove that the managed service enforces the rule.

Also test reserved concurrency and throttling behavior at the environment level if the API depends on it. A throttled Lambda should produce a controlled client experience through API Gateway, not an unexplained intermittent failure.

## Keeping test stages disposable

Lambda API integration tests are easier to trust when the stage can be recreated. Use stack names, table prefixes, queue names, and test records tied to the build or branch. Cleanup should run even when assertions fail. A long-lived test stage is acceptable for smoke coverage, but data created by automated tests still needs ownership and expiry.

Disposable stages also make destructive cases safer. Invalid payloads, duplicate callbacks, and permission checks should not pollute shared manual testing accounts.

## Frequently Asked Questions

### Should Lambda handler tests mock AWS services?

Mock services in unit tests when the handler only needs to verify request parsing and response mapping. Use deployed integration tests or a realistic local emulator for IAM, SDK configuration, and managed-service behavior.

### Which API Gateway event type should TypeScript tests use?

Use \`APIGatewayProxyEventV2\` for HTTP API payload format 2.0 and \`APIGatewayProxyEvent\` for REST API payload format 1.0. Mixing them hides real route-shape bugs.

### Is LocalStack enough for Lambda API confidence?

It is useful for local integration feedback, but it cannot prove every AWS edge. Keep at least one test path that deploys and calls the real cloud endpoint.

### How do I test Lambda timeouts?

Unit-test timeout handling around your dependency wrapper, then use integration or load tests to confirm configured Lambda timeout and client timeout behave together. Do not make normal unit tests sleep for the full timeout.

### What belongs in a Lambda API smoke test?

Call a deployed route with a valid request, assert the status and schema, verify one meaningful side effect if applicable, and clean up the created data.
`,
};
