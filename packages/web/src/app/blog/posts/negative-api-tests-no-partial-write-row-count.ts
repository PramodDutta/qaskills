import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Negative API Test No Partial Write Guide',
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
  content: `A negative API test no partial write check proves the API rejects the bad input, returns the stated error shape, and leaves each owned DB table unchanged. Count only rows tied to that request before and after the call. The matching snapshots turn an assumed rollback into clear proof.

This guide applies the rejected-case rule from the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer). The [QASkills directory](/skills) adds API and DB tools once the no-write rule is clear.

## What Does Negative API Testing Need to Prove?

Negative API testing must prove the expected rejection and the lack of forbidden side effects. A handler can insert an order, fail on its line items, return \`400\`, and leave that order behind. The HTTP check passes while the next test inherits bad state.

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

The [database testing automation guide](/blog/database-testing-automation-guide) shows how DB checks support API tests. Here they prove one narrow fact: a rejected call leaves no forbidden stored business state.

## How Does an OpenAPI Error Contract Define Rejections?

Negative cases should come from stated rules, not a brainstormed list. OpenAPI names required fields, types, formats, ranges, enum values, and schema branches at the request edge. SQL files define null rules, unique keys, checks, and foreign keys for stored rows.

The [OpenAPI Specification](https://spec.openapis.org/oas/v3.2.0.html) defines the official rules for OpenAPI files. Use the same spec version as the service. Link each test to one Schema Object rule and one stated response, so the expected result has a clear source.

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

## How Does a Database Row Count Assertion Measure State?

A database row count assertion measures only rows tied to the tested request. Global \`COUNT(*)\` checks fail when parallel tests add valid rows. Use one run id, fixed business key, tenant, or request id that selects only what this call could create.

Prefer an explicit \`test_run_id\` stored on every test-owned row. When the product schema cannot carry one, use deterministic unique keys such as an order reference and join through the aggregate. Avoid selecting by creation timestamp alone because unrelated writes can share the interval.

The baseline should include row counts and, where updates are possible, selected values or hashes of non-sensitive fields. An unchanged count cannot detect an existing row changed from \`pending\` to \`failed\`. Match evidence to every mutation type available to the operation.

A baseline is a before snapshot; it need not contain only zeros. Valid parent rows or allowed logs may already match the run key. A negative API test no partial write check proves both snapshots match, while final cleanup proves the full test run ends at zero.

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

## How Should API Partial Write Testing Check Response and Data?

A good API partial write testing flow reads like one proof. Create fixed parent rows, take a before snapshot, send one bad request, check the reply, then take the same snapshot again. The two results cover one call from start to finish.

Response checks must name the intended reject path. Check the stated media type, app code, field path, and rule when the contract defines them. Avoid full-body snapshots, since harmless text edits cause noise and rejected values may expose private data in test files.

Validate that the error response does not echo secrets or unrestricted payload fragments. A malformed request can contain credentials, tokens, or personal information even though validation rejects it. Test safe field-level diagnostics with synthetic values and inspect logs through a controlled sink when logging behavior is within scope.

One broken rule per case gives the clearest proof. If one request breaks several rules, check order may decide which error appears first. Use multi-error cases only when the API promises a grouped or ordered reply, and link each error to its stated rule.

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

Do not let public callers set DB run tags in live code. Make the tag inside an isolated test build, or pass a trusted request id that already exists for non-live use. Never add a public endpoint that accepts any tag and writes it to stored rows.

If the app stores failed attempts by design, split the snapshot into banned and allowed writes. Keep all banned counts equal, then check one allowed row with a safe error class. This keeps the audit trail without weakening the rule for business rows.

The [test data management strategies guide](/blog/test-data-management-strategies) helps choose an environment where direct evidence is safe. Database credentials used by tests should be read-only for assertions unless setup and cleanup require narrowly scoped writes.

## How Does a Transaction Atomicity Test Cover Every Write Path?

PostgreSQL can group statements between \`BEGIN\` and \`COMMIT\` as one unit. The [official transaction tutorial](https://www.postgresql.org/docs/current/tutorial-transactions.html) explains that the group commits as a whole or rolls back. This rule covers only SQL run in that same transaction.

Code can escape its transaction through a second pool session, an early commit, or a worker that writes alone. Query stored state through another normal DB session after the reply. A check on only the request's transaction object can miss side writes that already committed.

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

This code is an example; the project's real transaction API still controls the call. The key rule is that orders, items, and the outbox share one DB transaction. PostgreSQL cannot roll back an HTTP call, broker send, or payment request outside that unit.

Foreign keys catch some partial states, but not all. An order without line items may satisfy every foreign key, and an outbox event can be missing while the order remains valid. The [PostgreSQL constraint documentation](https://www.postgresql.org/docs/current/ddl-constraints.html) explains enforced checks and references; business completeness still requires service logic and tests.

Inject a failure after each meaningful write in a dedicated integration test when the architecture permits controlled fault points. For example, fail after the order insert, after the first item, and before the outbox insert. Each failure should produce the declared error and the same before-and-after snapshot.

Record each fault point as a separate case because one passing rollback does not prove every repository uses the shared transaction. A negative API test no partial write matrix should cover boundaries where code changes connection, invokes a helper, or hands work to an adapter. Those transitions are where transaction ownership can silently split.

When a controlled failure yields a \`500\` rather than a client error, keep response expectations aligned with the service's documented internal-error contract. The storage invariant does not depend on whether rejection is caused by invalid input or an injected dependency failure. Both paths must avoid durable partial business state.

Do not add production switches that let public callers trigger internal failures. Fault injection belongs in dependency adapters or test builds with strict environment guards. Review those guards as security-sensitive code.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) can place these database integration tests after migrations and before broad end-to-end work. A failed no-write assertion should block release because it exposes persistent corruption, not a cosmetic mismatch.

## Which Database Side Effect Assertion Covers Queues and Retries?

A row-count proof is incomplete when the endpoint sends messages directly or schedules work outside the database transaction. A broker can receive an event even if the later database transaction rolls back. A consumer may then create state after the HTTP test has already passed.

List outside side effects beside the DB tables. Include broker topics, jobs, stored files, search docs, emails, and sandbox calls. For each one, state whether a rejected call allows no contact, one failed-attempt row, or a repair action.

| Side-effect design | Negative request expectation | Test observation |
|---|---|---|
| transactional outbox | no committed outbox row | scoped outbox count unchanged |
| direct broker publish after commit | no publish because commit never occurs | broker spy or isolated topic has zero event |
| job table in same transaction | no committed job row | scoped job count unchanged |
| external call before validation | architecture defect candidate | fake server records zero calls |
| idempotency key registry | no success entry | key absent or documented failure state |

Retries matter because clients and gateways can repeat failed calls. Send the identical invalid request twice with the same idempotency key, then prove both responses remain rejected and every forbidden count remains unchanged. A second request must not convert a stale intermediate record into success.

A negative API test no partial write check should observe delayed consumers for a bounded, event-driven condition. Poll the isolated queue or job table until the system reaches its documented idle state, then assert zero matching output. Avoid a fixed sleep that can pass before a slow worker acts.

An idempotency store may keep a rejected reply by design. If so, state the rule and check that exact state. Do not treat each such row as safe, since a false success mark could block a fixed retry or serve the wrong cached reply.

Use request ids that contain no personal data. Logs and event probes should keep the run id, command, and safe error class, not the full rejected body. Bad input can still hold secrets or private details.

The sibling [PII-safe reserved namespace guide](/blog/reserved-namespaces-pii-safe-synthetic-test-data) gives fixed email and network values for these calls. Reserved values lower the risk of real contact, but network blocks are still required.

## How Does Integration Test Data Isolation Control Parallel Runs?

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

The [aggregate-driven data guide](/blog/aggregate-driven-synthetic-test-data-without-production-rows) can copy useful value mixes without live rows. A lifelike mix never justifies weak test isolation or broad queries.

## Put Negative API Test No Partial Write Evidence in CI

Turn this proof into a named quality gate for endpoints that create multi-table aggregates, money records, authorization state, or external work. The gate should report the exact case, schema rule, request correlation id, before snapshot, after snapshot, and test run artifact.

Use changed files to pick early cases. OpenAPI changes select request-rule tests, schema changes select DB checks, and write-path changes select forced faults. This small set gives fast feedback, but the full required test suite must still run.

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

No. The command may add child rows, change an old row, queue an outbox event, or call another service while the main count stays fixed. List each write path, then save the counts and safe field values needed to detect inserts, updates, deletes, and allowed audit rows.

### Should the test wrap the HTTP request in a transaction?

Usually not, because the app server uses its own pool sessions. A transaction opened by the test cannot control those writes. Call the normal HTTP path, then query stored state through a check-only session. Share a transaction only when the system clearly gives both sides the same connection.

### How can row counts remain stable under parallel tests?

Tie each count to one run id, tenant, fixed business key, or parent link. Never compare whole-table counts in a shared DB. Use the same key on each owned table, and add worker id plus sequence when unique rules demand distinct test values.

### What if failed requests are intentionally audited?

Classify the audit row as an allowed side effect and assert it separately. Require exactly the documented count, safe error category, correlation id, and absence of sensitive payload fields. Forbidden business tables must remain unchanged. An allowed audit record should never become a blanket exception for unrelated writes.

### Does transaction atomicity cover messages and HTTP calls?

No. PostgreSQL can make the SQL inside one transaction all or nothing, but it cannot recall a sent message or accepted web call. Use an outbox, after-commit send, fake, or repair step that fits the design. Check each non-DB side effect on its own.

### When should a no-write test run in CI?

Run focused cases when request checks, OpenAPI files, schema files, transaction code, data access, or side-effect clients change. Keep them in the required full suite too. Proof must come from the exact release commit and current schema, since old snapshots or skipped DB checks cannot support release.
`,
};
