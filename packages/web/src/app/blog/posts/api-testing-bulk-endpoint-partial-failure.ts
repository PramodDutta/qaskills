import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'API Testing Bulk Endpoint Partial Failure Without Losing Item-Level Truth',
  description: 'Master api testing bulk endpoint partial failure with per-item assertions, idempotency checks, fixtures, and contract-safe response design in CI.',
  date: '2026-08-07',
  category: 'API Testing',
  content: `
# API Testing Bulk Endpoint Partial Failure Without Losing Item-Level Truth

API testing bulk endpoint partial failure means proving that a bulk request can succeed for some items, reject others, report every item accurately, and leave the system in a recoverable state. The key is item-level truth. A bulk endpoint test that only checks the top-level HTTP status is weak because the real contract is inside the result array: which records were created, which failed validation, which were skipped, and which can be retried safely.

The safest pattern is to test three layers together. First, assert the envelope: request ID, aggregate counts, and a stable response shape. Second, assert every item result: client reference, status, resource ID or error code, and retryability. Third, assert persistence: successful items are committed, failed items are not partially written, and a repeated request behaves according to the endpoint's idempotency rules. That is where many bulk APIs break.

This guide uses concrete Node and TypeScript examples that fit Supertest, Vitest, Jest, or similar HTTP integration setups. It also explains what belongs in consumer-driven contracts and when to use Pact-style contract testing instead of only server-side integration tests. For lower-level HTTP test structure, see the [Supertest Node API testing complete guide](/blog/supertest-node-api-testing-complete-guide). For provider-consumer compatibility across response evolution, pair this with the [contract testing Pact complete guide](/blog/contract-testing-pact-complete-guide).

## Define Partial Failure Before Writing Assertions

Teams often say "bulk endpoint" and mean different contracts. One API might be atomic: if any item fails, the whole batch fails and nothing is committed. Another might be best effort: valid items are committed and invalid items return errors. A third might queue all items and return processing status later. You cannot test partial failure correctly until the endpoint's contract is explicit.

For this article, partial failure means the server processes each item independently enough to return item-level outcomes in one response. The top-level request can be accepted even when some items fail. The response must explain each item in the same order or with a stable client reference. The client must be able to decide what to retry without guessing.

| Bulk contract | Top-level status style | Item result required | Testing focus |
| --- | --- | --- | --- |
| Atomic all-or-nothing | Failure when any item is invalid | Optional, but useful for diagnostics | No writes when one item fails |
| Best effort synchronous | Success or multi-status style response | Required | Accurate per-item commit and error reporting |
| Accepted asynchronous | Usually accepted for valid envelope | Required through job status endpoint | Queue state and eventual item outcomes |
| Import with dry run | Success for validation report | Required | No writes, complete validation coverage |
| Upsert bulk endpoint | Success with created, updated, and rejected items | Required | Idempotency and conflict handling |

Avoid debating status codes in isolation. HTTP status should tell the client whether the server understood and handled the batch envelope. Item results tell the client what happened to each requested operation. A top-level 200 with hidden item failures is bad. A top-level 400 for one invalid item in a best-effort endpoint is also bad if it prevents clients from seeing which other items succeeded.

## Use a Response Shape That Tests Can Trust

A testable partial-failure response has a stable envelope and a stable item schema. Every item result needs a client-supplied reference, because array position alone becomes fragile when systems sort, deduplicate, or stream results. Use a business-neutral \`clientRef\`, not an internal database ID that does not exist yet.

\`\`\`json
{
  "requestId": "bulk-2026-08-07-001",
  "summary": {
    "received": 4,
    "succeeded": 2,
    "failed": 1,
    "skipped": 1
  },
  "results": [
    {
      "clientRef": "row-001",
      "status": "created",
      "resourceId": "usr_1001"
    },
    {
      "clientRef": "row-002",
      "status": "failed",
      "error": {
        "code": "EMAIL_INVALID",
        "message": "Email is not valid",
        "retryable": false
      }
    },
    {
      "clientRef": "row-003",
      "status": "created",
      "resourceId": "usr_1002"
    },
    {
      "clientRef": "row-004",
      "status": "skipped",
      "error": {
        "code": "DUPLICATE_IN_BATCH",
        "message": "Duplicate email in request",
        "retryable": false
      }
    }
  ]
}
\`\`\`

The exact names can vary, but the semantics should not. A client needs to know which input item produced each result, what final state it reached, and whether retrying the same item makes sense. The test should fail if any result is missing \`clientRef\`, if counts do not match the result array, or if an error result lacks a stable machine-readable code.

What people get wrong: they assert only \`response.body.summary.failed === 1\`. That proves almost nothing. The failed item could be the wrong row, the successful rows could be missing from the database, the duplicate could be treated as success, or the endpoint could return a human message that no client can classify.

## Build a Fixture with Intentional Mixed Outcomes

Use one fixture that creates a meaningful partial-failure matrix. It should include at least one valid item, one validation failure, one conflict or duplicate, and one item after the failure to prove processing continues. Put the invalid item in the middle, not at the end, so a short-circuit bug is visible.

\`\`\`ts
// test/fixtures/bulk-users.ts
export const mixedBulkUsers = [
  {
    clientRef: 'row-001',
    email: 'riley@example.test',
    displayName: 'Riley Chen',
  },
  {
    clientRef: 'row-002',
    email: 'not-an-email',
    displayName: 'Invalid Email',
  },
  {
    clientRef: 'row-003',
    email: 'asha@example.test',
    displayName: 'Asha Rao',
  },
  {
    clientRef: 'row-004',
    email: 'riley@example.test',
    displayName: 'Duplicate In Batch',
  },
] as const;
\`\`\`

The fixture order is deliberate. Row 002 proves validation error reporting. Row 003 proves the server continues after a failed item. Row 004 proves duplicate detection inside the batch, not only against existing database state. A bulk test with only one invalid row at the end cannot catch accidental early termination.

If the endpoint supports a dry-run mode, use a separate fixture for dry run. Do not reuse the same test and toggle a flag unless the assertions are different. Dry run should assert no writes. Best-effort execution should assert writes for successes.

## Write Supertest Assertions for Envelope and Items

The following example uses Supertest against an app instance. The same assertion structure works with Jest or Vitest because the important part is the response contract, not the runner. It checks top-level counts, every client reference, every status, and the presence or absence of resource IDs.

\`\`\`ts
// test/bulk-users.partial-failure.test.ts
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { mixedBulkUsers } from './fixtures/bulk-users';

describe('POST /v1/users/bulk partial failure', () => {
  it('returns item-level outcomes for a mixed batch', async () => {
    const response = await request(app)
      .post('/v1/users/bulk')
      .send({ items: mixedBulkUsers })
      .expect(200);

    expect(response.body.summary).toEqual({
      received: 4,
      succeeded: 2,
      failed: 1,
      skipped: 1,
    });

    expect(response.body.results).toHaveLength(4);

    expect(response.body.results[0]).toMatchObject({
      clientRef: 'row-001',
      status: 'created',
    });
    expect(response.body.results[0].resourceId).toEqual(expect.any(String));

    expect(response.body.results[1]).toMatchObject({
      clientRef: 'row-002',
      status: 'failed',
      error: {
        code: 'EMAIL_INVALID',
        retryable: false,
      },
    });
    expect(response.body.results[1].resourceId).toBeUndefined();

    expect(response.body.results[2]).toMatchObject({
      clientRef: 'row-003',
      status: 'created',
    });
    expect(response.body.results[2].resourceId).toEqual(expect.any(String));

    expect(response.body.results[3]).toMatchObject({
      clientRef: 'row-004',
      status: 'skipped',
      error: {
        code: 'DUPLICATE_IN_BATCH',
        retryable: false,
      },
    });
  });
});
\`\`\`

This test intentionally avoids a giant snapshot as the only assertion. Snapshots can help document the full response after the contract is stable, but critical fields should be direct assertions. A direct assertion tells you what broke. A broad snapshot often tells you that something changed, then makes the reader inspect a large diff to discover whether it mattered.

If your endpoint returns results unordered, index-based assertions are wrong. Convert the array to a map by \`clientRef\` and assert by key.

\`\`\`ts
function resultsByClientRef(results: Array<{ clientRef: string }>) {
  return new Map(results.map(result => [result.clientRef, result]));
}

const byRef = resultsByClientRef(response.body.results);

expect(byRef.get('row-002')).toMatchObject({
  status: 'failed',
  error: {
    code: 'EMAIL_INVALID',
    retryable: false,
  },
});
\`\`\`

The endpoint contract should specify whether order is preserved. If the contract does not promise order, tests should not require it. If order is part of the client experience, assert it directly and document why.

## Assert Database State After the Response

A partial-failure response is not enough. The server can return a beautiful item-level report and still write the wrong records. After the response, query the repository or test database through a supported test helper. Assert that successful rows exist, failed rows do not, and skipped rows did not create duplicates.

\`\`\`ts
// test/assertions/user-persistence.ts
import { expect } from 'vitest';
import { findUserByEmail } from '../../src/users/user-repository';

export async function expectBulkUserPersistence() {
  await expect(findUserByEmail('riley@example.test')).resolves.toMatchObject({
    email: 'riley@example.test',
    displayName: 'Riley Chen',
  });

  await expect(findUserByEmail('asha@example.test')).resolves.toMatchObject({
    email: 'asha@example.test',
    displayName: 'Asha Rao',
  });

  await expect(findUserByEmail('not-an-email')).resolves.toBeNull();
}
\`\`\`

Add this assertion after the Supertest response checks. Keep it separate so the test reads as contract first, persistence second.

\`\`\`ts
it('commits only successful items from a mixed batch', async () => {
  const response = await request(app)
    .post('/v1/users/bulk')
    .send({ items: mixedBulkUsers })
    .expect(200);

  expect(response.body.summary.succeeded).toBe(2);
  await expectBulkUserPersistence();
});
\`\`\`

This catches a common class of defects: the response is built from validation decisions, but the write transaction behaves differently. For example, the service might validate all items, then attempt a bulk insert that fails on the duplicate and rolls back everything. The response would claim two successes, but the database would contain none. Without persistence assertions, the test would pass while clients lose data.

## Test Atomic and Best-Effort Modes Separately

Some APIs offer a request option such as \`mode: 'atomic'\` or \`mode: 'best_effort'\`. If yours does, test the modes separately. Do not write one test that accepts either behavior. Clients need deterministic semantics.

| Mode | Invalid item behavior | Expected writes | Response expectation |
| --- | --- | --- | --- |
| \`atomic\` | Whole batch rejected | Zero writes | Error envelope or all items failed |
| \`best_effort\` | Invalid item failed | Valid items written | Mixed result array |
| \`dry_run\` | Reported only | Zero writes | Validation report with no resource IDs |
| \`upsert\` | Invalid item failed | Valid creates or updates | Created and updated statuses distinct |

Here is an atomic-mode check:

\`\`\`ts
it('rolls back all items in atomic mode when one item is invalid', async () => {
  const response = await request(app)
    .post('/v1/users/bulk')
    .send({
      mode: 'atomic',
      items: mixedBulkUsers,
    })
    .expect(422);

  expect(response.body.error.code).toBe('BULK_ATOMIC_VALIDATION_FAILED');
  expect(response.body.details).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        clientRef: 'row-002',
        code: 'EMAIL_INVALID',
      }),
    ]),
  );

  await expect(findUserByEmail('riley@example.test')).resolves.toBeNull();
  await expect(findUserByEmail('asha@example.test')).resolves.toBeNull();
});
\`\`\`

The status code here is an example contract choice. Your API may use a different documented status. The important property is not the exact number, it is consistency: the response must make clear that atomic mode wrote nothing and why.

## Verify Idempotency and Retry Safety

Bulk endpoints are often called from import tools, background workers, and retrying clients. A partial-failure test should prove that retrying the same request does not duplicate successful items or turn prior failures into ambiguous states. Use an idempotency key when the API supports it. If the API does not support idempotency, document that clients must perform their own deduplication and test duplicate handling explicitly.

\`\`\`ts
it('does not duplicate successful items when the same idempotent batch is retried', async () => {
  const idempotencyKey = 'bulk-users-2026-08-07-a';

  const first = await request(app)
    .post('/v1/users/bulk')
    .set('Idempotency-Key', idempotencyKey)
    .send({ items: mixedBulkUsers })
    .expect(200);

  const second = await request(app)
    .post('/v1/users/bulk')
    .set('Idempotency-Key', idempotencyKey)
    .send({ items: mixedBulkUsers })
    .expect(200);

  expect(second.body.summary).toEqual(first.body.summary);
  expect(second.body.results.map((item: { clientRef: string }) => item.clientRef)).toEqual([
    'row-001',
    'row-002',
    'row-003',
    'row-004',
  ]);

  await expect(countUsersByEmail('riley@example.test')).resolves.toBe(1);
  await expect(countUsersByEmail('asha@example.test')).resolves.toBe(1);
});
\`\`\`

Do not add an \`Idempotency-Key\` header to tests unless your endpoint actually documents and implements it. Otherwise the test says more than the API can guarantee. For endpoints without idempotency, write a different test: send the same payload twice and assert the second response reports existing resources, duplicates, or conflicts according to the documented behavior.

## Cover Retryable and Non-Retryable Item Errors

A partial failure response should help clients decide what to do next. A malformed email is not retryable. A temporary downstream enrichment failure might be retryable. A duplicate in the same request is not retryable without changing the payload. Tests should assert those distinctions because clients will automate around them.

| Error code | Retryable | Client action | Test assertion |
| --- | --- | --- | --- |
| \`EMAIL_INVALID\` | No | Fix data before resubmission | No resource written |
| \`DUPLICATE_IN_BATCH\` | No | Remove or merge duplicate item | One item succeeds, duplicate skipped |
| \`DEPENDENCY_UNAVAILABLE\` | Yes | Retry same item later | Item not committed, retry flag true |
| \`CONFLICT_EXISTING_RESOURCE\` | Depends on contract | Update, skip, or report to user | Existing record unchanged unless upsert |
| \`PERMISSION_DENIED\` | No | Stop and fix credentials or scope | No item writes beyond authorization boundary |

If retryability is derived only from human-readable messages, clients are forced to parse prose. That is brittle and language-dependent. Stable error codes and boolean retry hints make the contract testable.

You can add a focused test for a retryable downstream failure by replacing the dependency with a test double or containerized fake that returns a documented temporary error.

\`\`\`ts
it('marks enrichment outage as retryable without committing the item', async () => {
  enrichmentFake.failNextRequestWithUnavailable();

  const response = await request(app)
    .post('/v1/users/bulk')
    .send({
      items: [
        {
          clientRef: 'row-enrich-001',
          email: 'sam@example.test',
          displayName: 'Sam Rivera',
          enrichProfile: true,
        },
      ],
    })
    .expect(200);

  expect(response.body.results[0]).toMatchObject({
    clientRef: 'row-enrich-001',
    status: 'failed',
    error: {
      code: 'DEPENDENCY_UNAVAILABLE',
      retryable: true,
    },
  });

  await expect(findUserByEmail('sam@example.test')).resolves.toBeNull();
});
\`\`\`

The persistence assertion matters here. A retryable item that was half-written is a trap for clients. They will retry and may create duplicates, overwrite partial data, or receive conflicts that contradict the retry hint.

## Add Contract Tests for Consumer Expectations

Server-side integration tests prove your implementation behaves today. Contract tests prove consumers and providers agree on the response shape they depend on. For partial failure, the consumer contract should include at least one mixed result because all-success examples do not protect error schema evolution.

You do not need to put every server-side scenario in Pact. Choose representative interactions: one valid bulk response, one mixed partial-failure response, and perhaps one atomic rejection if clients use that mode. The provider can still have a larger integration suite for duplicate rules, database state, and downstream failures.

| Concern | Integration test | Contract test |
| --- | --- | --- |
| Database writes | Strong | Usually out of scope |
| Item result schema | Strong | Strong |
| Consumer parsing assumptions | Indirect | Strong |
| Error code compatibility | Strong | Strong |
| Performance with large batches | Strong | Out of scope |
| Provider state setup | Direct fixtures | Provider states |

When defining the contract, avoid overfitting volatile fields. A consumer usually needs \`clientRef\`, \`status\`, \`resourceId\` for successes, and \`error.code\` plus \`error.retryable\` for failures. It usually does not need the exact \`requestId\` value or the exact prose of \`error.message\`.

\`\`\`json
{
  "summary": {
    "received": 2,
    "succeeded": 1,
    "failed": 1,
    "skipped": 0
  },
  "results": [
    {
      "clientRef": "consumer-row-001",
      "status": "created",
      "resourceId": "usr_123"
    },
    {
      "clientRef": "consumer-row-002",
      "status": "failed",
      "error": {
        "code": "EMAIL_INVALID",
        "retryable": false
      }
    }
  ]
}
\`\`\`

Contract tests should not replace persistence tests. They answer a different question. A provider can satisfy the contract response and still fail to commit records correctly. Keep both layers.

## Diagnose the Short-Circuit Bug

A realistic failure mode is short-circuit processing. The service loops through items, sees the first invalid record, returns an error, and never processes later valid items even though the endpoint is documented as best effort. This often happens when teams reuse single-record validation code that throws exceptions instead of returning item-level errors.

The diagnosis is straightforward. Put the invalid row in the middle of the request, then assert that the following valid row succeeds and exists in the database. If row 003 is missing, inspect the service layer for an exception path that exits the batch loop.

\`\`\`ts
expect(response.body.results.map((item: { clientRef: string; status: string }) => ({
  clientRef: item.clientRef,
  status: item.status,
}))).toEqual([
  { clientRef: 'row-001', status: 'created' },
  { clientRef: 'row-002', status: 'failed' },
  { clientRef: 'row-003', status: 'created' },
  { clientRef: 'row-004', status: 'skipped' },
]);
\`\`\`

If the response contains only row 001 and row 002, the endpoint is not returning a complete item report. If it contains row 003 as failed without an error code, validation state is leaking across items. If the response says row 003 succeeded but persistence shows no row, the write path is inconsistent with the report. Each failure points to a different implementation layer.

## Test Batch Size Boundaries Separately

Partial failure tests should not carry every boundary condition. Keep a separate suite for max batch size, empty items, malformed JSON, missing envelope fields, and authentication. Those are envelope failures, not item failures. Mixing them into a partial-failure test makes the expected contract unclear.

| Scenario | Expected layer | Example assertion |
| --- | --- | --- |
| Empty \`items\` array | Envelope validation | Top-level error code for empty batch |
| More than max items | Envelope validation | No item processing starts |
| One item invalid | Item validation | Mixed results with failed item |
| Malformed JSON | HTTP parsing | Standard parse error response |
| Unauthorized caller | Authorization | No item processing, no writes |
| Downstream outage for one item | Item or dependency handling | Retryable item error if best effort |

This split keeps your tests explainable. An invalid envelope means the server cannot process the batch as a batch. An invalid item means the batch is valid but one operation is not.

## Frequently Asked Questions

### What should a bulk endpoint return when only some items fail?

Return a stable envelope plus item-level results. The envelope should include aggregate counts and a request identifier if your platform uses one. Each item should include a client reference, status, and either a resource identifier or a structured error. Avoid hiding partial failures behind a top-level success message with no per-item detail, because clients cannot safely retry or reconcile ambiguous rows.

### Should partial failures use HTTP 200, 207, or 422?

Use the status code your API contract documents consistently. The more important testing concern is whether the top-level status represents the batch envelope and whether item results represent individual operations. A best-effort endpoint might use a success-style status with failed item results. An atomic endpoint might reject the whole request. Do not let status-code debate replace item-level assertions, persistence checks, and client retry semantics.

### How do I prevent retries from duplicating successful items?

Use documented idempotency behavior when the API supports it, and test it by sending the same batch twice with the same idempotency key. Assert that successful resources are not duplicated and that the second response is predictable. If the API has no idempotency contract, test duplicate handling explicitly and document what clients must do before retrying after network failures or timeouts.

### Do contract tests replace integration tests for bulk APIs?

No. Contract tests are excellent for protecting response shape, required fields, error codes, and consumer parsing assumptions. They usually do not prove database commits, rollback behavior, duplicate prevention, or downstream dependency handling. Keep integration tests for server behavior and persistence, then add representative contract examples for consumer-provider compatibility. The two layers answer different risk questions and should fail for different reasons.
`,
};
