import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Prove Negative API Tests Leave No Writes',
  description:
    'Build a negative API test no partial write proof with scoped row counts, transaction checks, error contracts, retry coverage, and CI-ready evidence.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Tutorial',
  primaryKeyword: 'negative API test no partial write',
  keywords: [
    'negative API test no partial write',
    'API partial write testing',
    'database row count assertion',
    'transaction atomicity test',
    'negative API testing',
    'OpenAPI error contract',
    'integration test data isolation',
    'database side effect assertion',
  ],
  relatedSlugs: [
    'foreign-key-graph-relational-test-data-builder',
    'test-data-cleanup-residue-assertion-run-tag',
    'reserved-namespaces-pii-safe-synthetic-test-data',
    'aggregate-driven-synthetic-test-data-without-production-rows',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/tutorial-transactions.html',
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
    'https://spec.openapis.org/oas/v3.2.0.html',
  ],
  content: `A negative API test no partial write check proves three things together: the request is rejected for the intended contract violation, the response matches the documented error shape, and every database table within the operation remains unchanged. Scoped before-and-after counts turn an assumed rollback into direct, repeatable evidence.

This procedure implements the negative-case rule from the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer). The broader [QASkills directory](/skills) can supply framework-specific API and database workflows after the invariant is defined.

## Define the No-Write Invariant Before Testing

A rejected status code is not enough. A handler can insert an order, fail while inserting line items, return \`400\`, and leave the order behind. The HTTP assertion passes while tomorrow's test inherits corrupt state.

Write the invariant in business terms before choosing queries. For an order-creation endpoint, rejection means no new order, line item, payment attempt, outbox event, audit event, or idempotency success record belongs to that request. Some systems intentionally record a failed security audit, so classify that row as an allowed side effect rather than ignoring it.

| Observation | What it proves | What it does not prove |
|---|---|---|
| status is \`422\` | request reached a rejection path | no storage mutation occurred |
| error body matches schema | client receives the declared contract | internal writes rolled back |
| target table count is unchanged | no net row added in that scope | another table was unchanged |
| all owned table counts are unchanged | no durable relational residue in scope | no external message was emitted |
| retry returns the same rejection | failure remains stable for repeated input | first attempt emitted no side effect |

Define the observation window too. The database check should run after the API response and after any application work contractually completed before that response. If the endpoint queues asynchronous processing, the test needs a separate assertion boundary for the queue and consumer.

A negative API test no partial write contract should name every owned persistence surface. Build that list from the service code, migrations, triggers, and outbox wiring. Do not rely on the endpoint name, because one command may touch tables outside its obvious aggregate.

Record expected exceptions explicitly. A rate-limit rejection may increment a metrics counter by design, while an invalid order should create no order records. Allowed diagnostic writes need constrained assertions covering type, count, and absence of request payload secrets.

The [database testing automation guide](/blog/database-testing-automation-guide) explains how storage checks complement API assertions. Here the database is evidence for one precise property: rejection leaves no unauthorized durable business state.

## Derive Rejections from OpenAPI and DDL

Negative cases should come from declared boundaries rather than a brainstorming list. OpenAPI defines required fields, types, formats, ranges, enum members, and composed schema branches at the request boundary. SQL migrations define stored nullability, uniqueness, checks, and foreign-key relationships.

The [OpenAPI Specification](https://spec.openapis.org/oas/v3.2.0.html) is the authoritative specification for OpenAPI documents. Use the version declared by the service, and trace each generated case to a Schema Object keyword or documented response. Do not invent undocumented validation behavior and then label a different response a defect.

The assigned schema mapping reference makes generation mechanical:

| Declared rule | Negative request | Required rejection evidence | Storage evidence |
|---|---|---|---|
| required property | omit the key | documented validation code | all owned counts unchanged |
| integer minimum zero | send \`-1\` | range error at field path | no aggregate rows |
| enum member set | send non-member | enum error | no defaulted row |
| unique database key | repeat an existing key | conflict response | existing row unchanged, no duplicate |
| foreign key | send missing parent id | relationship rejection | no orphan child |
| decimal scale two | send three decimals | precision error | no rounded value unless specified |

The API contract and database contract can disagree. An OpenAPI schema might accept a string whose database column is shorter, or omit a uniqueness rule enforced in SQL. Treat each disagreement as a finding, then test the actual request path and stored outcome without weakening either layer.

This minimal OpenAPI fragment provides traceable negative inputs and a declared error response:

\`\`\`yaml
paths:
  /orders:
    post:
      operationId: createOrder
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [customerId, currency, items]
              properties:
                customerId:
                  type: string
                  format: uuid
                currency:
                  type: string
                  enum: [USD, EUR]
                items:
                  type: array
                  minItems: 1
      responses:
        '201':
          description: Order created
        '422':
          description: Request validation failed
\`\`\`

From this fragment, omit \`customerId\`, pass a malformed UUID, provide an unknown currency, and send an empty item list. Then inspect migrations for additional uniqueness, checks, and foreign keys not represented at the boundary.

Use the [OpenAPI-to-test-suite generation guide](/blog/openapi-spec-to-test-suite-generation) for broader case extraction. Keep each generated case linked to one primary violated rule so the expected error remains unambiguous.

Production records are never valid fixture inputs. Create deterministic parents and conflicts from schema shapes inside the test environment. Existing production rows never leave their system for prompts, fixtures, logs, or local databases.

## Measure Scoped State Before the Request

A global \`COUNT(*)\` is unstable when parallel tests insert legitimate rows. Scope counts to a unique test run, deterministic business key, tenant, or request correlation id. The selector must identify only resources the tested request could create.

Prefer an explicit \`test_run_id\` stored on every test-owned row. When the product schema cannot carry one, use deterministic unique keys such as an order reference and join through the aggregate. Avoid selecting by creation timestamp alone because unrelated writes can share the interval.

The baseline should include row counts and, where updates are possible, selected values or hashes of non-sensitive fields. An unchanged count cannot detect an existing row changed from \`pending\` to \`failed\`. Match evidence to every mutation type available to the operation.

Interpret the baseline as a state snapshot, not an expectation that every count begins at zero. Valid prerequisites or earlier allowed diagnostics may already exist under the selector. A negative API test no partial write comparison proves equality across the command boundary, while final cleanup separately proves the full run returns to zero.

For an upsert path, snapshot the candidate row even when the negative request should never reach persistence. That catches a handler which normalizes and updates an existing record before validating a later field. Select only fields relevant to the operation, and never print sensitive column values in assertion output.

| Possible mutation | Before evidence | After assertion |
|---|---|---|
| insert | scoped count per table | same count |
| update | selected version and relevant fields | same version and values |
| delete | existence and selected key | row still exists unchanged |
| upsert | count plus existing record values | neither count nor values changed |
| outbox enqueue | scoped event count | same count |
| idempotency record | key lookup and status | no success record or undocumented state |

Create one helper that returns a named snapshot. A named object produces readable diffs, while separate assertions scattered through the test can hide the first missing table.

\`\`\`typescript
type WriteSnapshot = {
  orders: number;
  lineItems: number;
  paymentAttempts: number;
  outboxEvents: number;
};

export async function snapshotWrites(db: Db, runId: string): Promise<WriteSnapshot> {
  const rows = await db.query<{
    orders: number;
    line_items: number;
    payment_attempts: number;
    outbox_events: number;
  }>(
    'SELECT ' +
      '(SELECT count(*)::int FROM orders WHERE test_run_id = $1) AS orders, ' +
      '(SELECT count(*)::int FROM line_items WHERE test_run_id = $1) AS line_items, ' +
      '(SELECT count(*)::int FROM payment_attempts WHERE test_run_id = $1) AS payment_attempts, ' +
      '(SELECT count(*)::int FROM outbox_events WHERE test_run_id = $1) AS outbox_events',
    [runId],
  );

  return {
    orders: rows[0].orders,
    lineItems: rows[0].line_items,
    paymentAttempts: rows[0].payment_attempts,
    outboxEvents: rows[0].outbox_events,
  };
}
\`\`\`

The helper uses one database statement so its subqueries share a statement snapshot under PostgreSQL's usual read behavior. More importantly, both before and after calls use the same selector and table inventory. Keep test and application databases aligned so the observation does not query a replica that lags writes.

Foreign-key graph setup should finish before the baseline. Otherwise the test's own valid parent creation appears as a mutation. The sibling [foreign-key graph test data guide](/blog/foreign-key-graph-relational-test-data-builder) shows how to return every created parent identifier before measuring the command under test.

## Assert the Response and Database Together

The test procedure should read like a proof, not a collection of unrelated expectations. Arrange deterministic prerequisites, capture baseline state, send one invalid request, assert the exact response contract, capture final state, and compare the complete snapshots.

Keep response checks specific enough to identify the intended rejection branch. Assert the documented media type, application code, field path, and rule where those fields belong to the contract. Avoid full-body snapshots that fail on harmless wording changes or accidentally preserve sensitive rejected values in repository artifacts.

Validate that the error response does not echo secrets or unrestricted payload fragments. A malformed request can contain credentials, tokens, or personal information even though validation rejects it. Test safe field-level diagnostics with synthetic values and inspect logs through a controlled sink when logging behavior is within scope.

One violation per case usually produces clearer evidence. When a request violates several rules, validation order may determine which error appears first. Keep multi-error cases only when the API contract explicitly promises aggregation or ordering, and trace every expected error to its declared rule.

Use an ordered workflow:

1. Allocate a unique run id and create only valid prerequisite rows.
2. Capture scoped counts and any existing values the command could update.
3. Send one request containing one primary contract violation.
4. Assert status, media type, stable application error code, and field path.
5. Wait only for work that the endpoint contract says precedes completion.
6. Capture the same database snapshot and compare every named field.
7. Repeat the request when retries or idempotency are part of the contract.
8. Run cleanup and separately assert that prerequisite residue reaches zero.

The test below implements a negative API test no partial write proof with Vitest-style assertions. The response body uses a stable code instead of matching human-readable wording.

\`\`\`typescript
import { expect, test } from 'vitest';

test('rejects an empty order without durable writes', async () => {
  const runId = 'run-negative-order-worker-3';
  const customer = await createCustomer(db, {
    email: 'customer-worker-3@example.test',
    testRunId: runId,
  });
  const before = await snapshotWrites(db, runId);

  const response = await api.post('/orders', {
    headers: { 'x-test-run-id': runId },
    json: { customerId: customer.id, currency: 'USD', items: [] },
  });

  expect(response.status).toBe(422);
  expect(response.headers.get('content-type')).toContain('application/json');
  await expect(response.json()).resolves.toMatchObject({
    code: 'VALIDATION_FAILED',
    errors: [{ path: 'items', rule: 'minItems' }],
  });

  const after = await snapshotWrites(db, runId);
  expect(after).toEqual(before);
});
\`\`\`

Do not let the run-id header influence production behavior unless a safe test-only boundary already exists. Prefer generating the tag inside an isolated test deployment or propagating an authenticated correlation field designed for non-production use. Never expose arbitrary database tagging through a public endpoint.

If the application intentionally stores failed attempts, split the snapshot into forbidden and allowed writes. Assert forbidden counts remain equal, then assert exactly one allowed record with a safe error category. This preserves accountability without weakening the business-state invariant.

The [test data management strategies guide](/blog/test-data-management-strategies) helps choose an environment where direct evidence is safe. Database credentials used by tests should be read-only for assertions unless setup and cleanup require narrowly scoped writes.

## Verify Atomicity Across Every Write Path

PostgreSQL transactions provide an all-or-nothing grouping for statements enclosed by \`BEGIN\` and \`COMMIT\`. The [official transaction tutorial](https://www.postgresql.org/docs/current/tutorial-transactions.html) states that other transactions observe the grouped operation completely or not at all. That property applies only to statements actually executed within the transaction.

A service can accidentally escape its transaction by using a second pooled connection, committing inside a helper, or invoking a worker that writes independently. The test should therefore observe durable state through another normal connection after the response. Inspecting only the request's transaction object can miss committed side writes.

The transaction owner should wrap every relational write that belongs to the command:

\`\`\`typescript
export async function createOrder(db: DbPool, input: CreateOrderInput) {
  return db.transaction(async (tx) => {
    const order = await tx.orders.insert({
      customerId: input.customerId,
      currency: input.currency,
    });

    for (const item of input.items) {
      await tx.lineItems.insert({ orderId: order.id, ...item });
    }

    await tx.outbox.insert({
      aggregateId: order.id,
      eventType: 'order.created',
    });
    return order;
  });
}
\`\`\`

This shape is illustrative; the repository's actual transaction API remains authoritative. The important boundary is that order, items, and transactional outbox share one database transaction. An HTTP call, message broker publish, or external payment request is not rolled back by PostgreSQL.

Foreign keys catch some partial states, but not all. An order without line items may satisfy every foreign key, and an outbox event can be missing while the order remains valid. The [PostgreSQL constraint documentation](https://www.postgresql.org/docs/current/ddl-constraints.html) explains enforced checks and references; business completeness still requires service logic and tests.

Inject a failure after each meaningful write in a dedicated integration test when the architecture permits controlled fault points. For example, fail after the order insert, after the first item, and before the outbox insert. Each failure should produce the declared error and the same before-and-after snapshot.

Record each fault point as a separate case because one passing rollback does not prove every repository uses the shared transaction. A negative API test no partial write matrix should cover boundaries where code changes connection, invokes a helper, or hands work to an adapter. Those transitions are where transaction ownership can silently split.

When a controlled failure yields a \`500\` rather than a client error, keep response expectations aligned with the service's documented internal-error contract. The storage invariant does not depend on whether rejection is caused by invalid input or an injected dependency failure. Both paths must avoid durable partial business state.

Do not add production switches that let public callers trigger internal failures. Fault injection belongs in dependency adapters or test builds with strict environment guards. Review those guards as security-sensitive code.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) can place these database integration tests after migrations and before broad end-to-end work. A failed no-write assertion should block release because it exposes persistent corruption, not a cosmetic mismatch.

## Include Queues, Retries, and Idempotency

A row-count proof is incomplete when the endpoint sends messages directly or schedules work outside the database transaction. A broker can receive an event even if the later database transaction rolls back. A consumer may then create state after the HTTP test has already passed.

Inventory non-database side effects beside the table list. Include broker topics, job tables, object storage keys, search documents, emails, and external sandbox calls. For each surface, decide whether rejection permits zero interactions, a failed-attempt record, or a compensating action.

| Side-effect design | Negative request expectation | Test observation |
|---|---|---|
| transactional outbox | no committed outbox row | scoped outbox count unchanged |
| direct broker publish after commit | no publish because commit never occurs | broker spy or isolated topic has zero event |
| job table in same transaction | no committed job row | scoped job count unchanged |
| external call before validation | architecture defect candidate | fake server records zero calls |
| idempotency key registry | no success entry | key absent or documented failure state |

Retries matter because clients and gateways can repeat failed calls. Send the identical invalid request twice with the same idempotency key, then prove both responses remain rejected and every forbidden count remains unchanged. A second request must not convert a stale intermediate record into success.

A negative API test no partial write check should observe delayed consumers for a bounded, event-driven condition. Poll the isolated queue or job table until the system reaches its documented idle state, then assert zero matching output. Avoid a fixed sleep that can pass before a slow worker acts.

Idempotency storage may legitimately retain the rejection response. If so, document that behavior in the contract and assert its exact state. Never classify every idempotency row as harmless, because a success marker could suppress a corrected retry or expose an incorrect cached response.

Use correlation identifiers containing no personal data. Logs and event probes should record the run id, operation, and safe error category, not the entire rejected payload. Invalid payloads can still contain secrets or personal information.

The sibling [PII-safe reserved namespace guide](/blog/reserved-namespaces-pii-safe-synthetic-test-data) provides deterministic email and network values for these requests. Reserved values reduce accidental contact with real systems, but environment egress controls remain necessary.

## Control Parallelism and Cleanup Evidence

Parallel workers make global counts unreliable and can cause unrelated writes between snapshots. Each test needs a unique selector that reaches every owned table and side-effect sink. Worker id plus a deterministic sequence is preferable to an untraceable random label.

At PostgreSQL's common \`READ COMMITTED\` behavior, separate statements can observe newly committed rows from other transactions. Scoped selectors prevent those rows from affecting the proof. Raising isolation does not repair an overbroad \`COUNT(*)\` or missing table inventory.

Do not run the API request inside a test-owned transaction unless the server truly shares that same connection. Most external HTTP servers use their own pools. The test should create prerequisites, call the endpoint normally, and query durable results through a separate assertion connection.

After the no-write comparison passes, cleanup still has work to do because valid prerequisites remain. Delete them by run tag, then assert no tagged rows remain anywhere. No-write evidence for the rejected command and zero-residue evidence for the complete test are related but distinct checks.

The sibling [test data cleanup residue assertion guide](/blog/test-data-cleanup-residue-assertion-run-tag) defines that teardown contract. A negative API test no partial write result must not hide residue created during arrangement.

| Failure timing | Command snapshot | Cleanup requirement |
|---|---|---|
| request validation fails before writes | before equals after | remove valid prerequisites |
| database constraint rejects statement | before equals after | remove valid prerequisites |
| service throws after first write | before must equal after | remove prerequisites and report violation |
| test process crashes | comparison may be missing | independent run-tag sweeper recovers |

Run-tag deletion must be restricted to an approved non-production environment and owned rows. Credentials should not allow tests to query or delete production data. The source skill requires refusing fixtures pointed at production connection strings.

The [aggregate-driven data guide](/blog/aggregate-driven-synthetic-test-data-without-production-rows) helps reproduce useful frequencies without importing production records. Distribution realism never justifies weakening test isolation or query scope.

## Gate Releases on Concrete No-Write Evidence

Turn this proof into a named quality gate for endpoints that create multi-table aggregates, money records, authorization state, or external work. The gate should report the exact case, schema rule, request correlation id, before snapshot, after snapshot, and test run artifact.

Map changed files to cases before running the gate. OpenAPI edits select affected boundary cases, migrations select constraint and snapshot coverage, and transaction or repository edits select injected-failure cases. This focused set accelerates diagnosis, but it never replaces the complete required integration suite.

Store snapshots as small machine-readable objects containing counts, versions, and safe categorical states. Do not attach row dumps to make the proof look detailed. A concise artifact can establish equality while respecting the rule that production records and sensitive test payloads stay out of CI logs.

When evidence collection itself fails, report which source was unavailable. A timeout reading the outbox table is not equivalent to an unchanged outbox count. The gate must remain failed or indeterminate until every required persistence surface provides current evidence from the judged commit.

Use an ordered release check:

1. Select negative cases affected by changed OpenAPI, migrations, validators, and persistence code.
2. Run focused integration tests against the exact release commit and current migrations.
3. Require every response-contract assertion and no-write snapshot comparison to pass.
4. Run the complete required API and database suites after focused feedback.
5. Publish machine-readable evidence without payload secrets or database credentials.
6. Treat missing counts, skipped suites, and stale artifacts as failed evidence.

The [AI release readiness scorecard](/blog/ai-release-readiness-scorecard-2026) shows how evidence supports a release recommendation. The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) also requires missing evidence to produce a no-go recommendation rather than an assumed pass.

Keep failures actionable. A diff such as \`outboxEvents: expected 0, received 1\` points directly to an escaped side effect. A generic message saying cleanup failed sends engineers searching across unrelated tables.

For one high-risk command, add a negative API test no partial write gate now. Start with the smallest invalid input that can reach persistence, snapshot every owned table, and force one controlled mid-operation failure before expanding the matrix.

Apply the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) to derive that case from actual schemas and migrations. The resulting proof should block CI whenever a rejected request leaves any forbidden write.

## Frequently Asked Questions

### Is an unchanged target-table count sufficient?

No. The command may write related rows, update an existing record, enqueue an outbox event, or call an external service while leaving the target count unchanged. Inventory every mutation surface, then capture counts and selected values appropriate to inserts, updates, deletes, and permitted diagnostic writes.

### Should the test wrap the HTTP request in a transaction?

Usually not, because an external application server uses its own pooled connections. A transaction opened by the test cannot control those writes. Exercise the normal request path, then query durable state through an assertion connection. Use transaction injection only when the architecture explicitly guarantees shared connection ownership.

### How can row counts remain stable under parallel tests?

Scope every count to a unique run id, tenant, deterministic business key, or aggregate relationship. Never compare global table counts in a shared database. Propagate the same selector across every owned table, and include worker identity plus sequence when unique constraints require collision-free generated values.

### What if failed requests are intentionally audited?

Classify the audit row as an allowed side effect and assert it separately. Require exactly the documented count, safe error category, correlation id, and absence of sensitive payload fields. Forbidden business tables must remain unchanged. An allowed audit record should never become a blanket exception for unrelated writes.

### Does transaction atomicity cover messages and HTTP calls?

No. PostgreSQL can make participating database statements atomic, but it cannot roll back a message already published or an external request already accepted. Use a transactional outbox, post-commit dispatch, fakes, or compensating behavior according to the architecture, and observe each non-database surface directly.

### When should a no-write test run in CI?

Run focused cases whenever validators, OpenAPI documents, migrations, transaction code, repositories, or side-effect adapters change. Also keep them in the required integration suite. Evidence must come from the exact release commit and current schema; stale snapshots or skipped database checks cannot support a release decision.
`,
};
