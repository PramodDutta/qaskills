import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Audit Logs: Immutability, Ordering, and Retention Verification',
  description: 'Audit log testing covers immutability, append-only writes, clock-safe ordering, and retention verification so audit trails stay trustworthy under review.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing Audit Logs: Immutability, Ordering, and Retention Verification

Audit log testing is the practice of proving that security and compliance events are append-only, correctly ordered, and retained for the required window. You verify three properties under real load and failure: immutability (UPDATE and DELETE cannot rewrite history), ordering (sequence or clock guarantees survive concurrency), and retention (purge jobs delete only what policy allows, and legal hold blocks deletion). If any of those checks is missing, an audit trail can look complete in a dashboard while still being mutable, reordered, or prematurely deleted.

The rest of this guide turns those three claims into concrete SQL tests, API tests, and job tests you can run in CI. The focus is not policy prose. The focus is assertions that fail when someone can rewrite a row, when concurrent writers scramble timestamps, or when a retention cron eats records that should still exist.

## What You Are Actually Guaranteeing

An audit log is a product claim. Product, security, and legal often phrase it as "we keep an immutable history of who changed what." Test automation has to translate that sentence into observables.

| Claim in plain language | Testable property | Common false positive |
|---|---|---|
| Nobody can alter past events | UPDATE and DELETE on event rows fail or are blocked | App UI hides edit while DB still allows it |
| Events appear in the order they happened | Monotonic sequence or verified causal order | Sorting by wall-clock timestamp under concurrency |
| We keep events for N days or years | Rows older than policy are gone; newer rows remain | Soft-delete flags with hard delete later and no test |
| Legal hold freezes deletion | Held subjects are skipped by purge jobs | Hold stored only in a ticket, not in data |

What people get wrong in practice is treating the audit table like another domain table with CRUD helpers. Once \`updateAuditEvent\` exists in a repository, someone will call it during a "data fix." Immutability has to be enforced below the application if you want the claim to survive an incident, a contractor script, or a well-intentioned support tool.

Ready-made QA skills for database and API checks install from qaskills.sh with the qaskills CLI when you want reusable prompts for agents, but the assertions below stay language-plain so any stack can adopt them.

## Immutability: Prove UPDATE and DELETE Cannot Rewrite History

Start at the database. If the database allows mutation, application tests alone are theater.

Create a narrow table shape for the examples. Keep columns boring: identity, actor, action, subject, payload, and created time. Add a sequence column early if ordering matters in your domain. Numbers below are illustrative.

\`\`\`sql
CREATE SEQUENCE audit_seq;

CREATE TABLE audit_events (
  id            bigserial PRIMARY KEY,
  seq           bigint NOT NULL,
  actor_id      text NOT NULL,
  action        text NOT NULL,
  subject_type  text NOT NULL,
  subject_id    text NOT NULL,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_events_seq_unique UNIQUE (seq)
);

CREATE INDEX audit_events_subject_idx
  ON audit_events (subject_type, subject_id, seq);
\`\`\`

Then revoke write paths that should never exist for normal roles. Prefer least privilege over hoping developers never run UPDATE.

\`\`\`sql
REVOKE UPDATE, DELETE ON audit_events FROM app_runtime;
GRANT INSERT, SELECT ON audit_events TO app_runtime;
GRANT USAGE, SELECT ON SEQUENCE audit_events_id_seq TO app_runtime;
\`\`\`

Privilege checks are not enough by themselves. A migration role, a DBA session, or a broken connection string can still mutate rows. Add a trigger that rejects UPDATE and DELETE for everyone except an explicit break-glass role you never grant in application configs.

\`\`\`sql
CREATE OR REPLACE FUNCTION reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF tg_op = 'UPDATE' OR tg_op = 'DELETE' THEN
    RAISE EXCEPTION 'audit_events is append-only; % is forbidden', tg_op
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_events_immutable
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW
  EXECUTE FUNCTION reject_audit_mutation();
\`\`\`

Your immutability suite should include at least these cases:

1. Insert as the app role succeeds.
2. Update of any column as the app role fails.
3. Delete as the app role fails.
4. Update attempted through a second role that looks like a support user fails.
5. Truncate is blocked or requires a procedure you never call from the app.

A focused Node test using \`pg\` can encode that contract without inventing helpers:

\`\`\`ts
import assert from 'node:assert/strict';
import { Client } from 'pg';

async function expectReject(client: Client, sql: string, params: unknown[] = []) {
  let failed = false;
  try {
    await client.query(sql, params);
  } catch (error) {
    failed = true;
    const message = error instanceof Error ? error.message : String(error);
    assert.match(message, /append-only|forbidden|permission denied/i);
  }
  assert.equal(failed, true, \`expected rejection for: \${sql}\`);
}

async function testImmutability() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE app_runtime');

    const inserted = await client.query(
      \`INSERT INTO audit_events (seq, actor_id, action, subject_type, subject_id, payload)
       VALUES (1, 'user-1', 'invoice.updated', 'invoice', 'inv-9', '{"amount": 10}'::jsonb)
       RETURNING id\`
    );
    const id = inserted.rows[0].id as number;

    await expectReject(
      client,
      'UPDATE audit_events SET payload = \$1::jsonb WHERE id = \$2',
      ['{"amount": 999}', id]
    );

    await expectReject(client, 'DELETE FROM audit_events WHERE id = \$1', [id]);

    const stillThere = await client.query(
      'SELECT payload->>\$1 AS amount FROM audit_events WHERE id = \$2',
      ['amount', id]
    );
    assert.equal(stillThere.rows[0].amount, '10');

    await client.query('ROLLBACK');
  } finally {
    await client.end();
  }
}

testImmutability().catch((error) => {
  console.error(error);
  process.exit(1);
});
\`\`\`

Notice the test checks the row still contains the original payload after failed mutation attempts. A reject without a read-back can miss a path that mutates then raises a confusing error later.

Also test that "correction" workflows create a new compensating event instead of rewriting the old one. If finance needs to reverse an amount, the log should show \`invoice.updated\` then \`invoice.correction\` with references, not a quieter overwrite of the first row.

## Append-Only Triggers and Application-Layer Guards

Database enforcement is the floor. Application guards are the next layer for APIs that might otherwise expose PATCH or DELETE on audit resources.

At the HTTP boundary, audit endpoints should accept create and list (and maybe export). They should not accept update or delete for normal clients. Write API tests that hit those methods explicitly. Do not rely on OpenAPI docs alone.

\`\`\`ts
import assert from 'node:assert/strict';

type HttpResult = { status: number; body: unknown };

async function request(
  method: string,
  path: string,
  body?: unknown
): Promise<HttpResult> {
  const response = await fetch(\`\${process.env.API_BASE}\${path}\`, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: \`Bearer \${process.env.TEST_TOKEN}\`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;
  return { status: response.status, body: parsed };
}

async function testAppendOnlyApi() {
  const created = await request('POST', '/v1/audit-events', {
    actorId: 'user-22',
    action: 'member.role_changed',
    subjectType: 'member',
    subjectId: 'm-7',
    payload: { from: 'viewer', to: 'admin' },
  });
  assert.equal(created.status, 201);
  const id = (created.body as { id: string }).id;

  const patched = await request('PATCH', \`/v1/audit-events/\${id}\`, {
    payload: { from: 'viewer', to: 'owner' },
  });
  assert.ok([404, 405, 501].includes(patched.status));

  const deleted = await request('DELETE', \`/v1/audit-events/\${id}\`);
  assert.ok([404, 405, 501].includes(deleted.status));

  const listed = await request('GET', '/v1/audit-events?subjectId=m-7');
  assert.equal(listed.status, 200);
  const events = (listed.body as { items: Array<{ id: string; payload: unknown }> }).items;
  const match = events.find((item) => item.id === id);
  assert.ok(match);
  assert.deepEqual(match.payload, { from: 'viewer', to: 'admin' });
}

testAppendOnlyApi().catch((error) => {
  console.error(error);
  process.exit(1);
});
\`\`\`

Application-layer guards should also refuse "upsert" helpers and ORM save paths that update by primary key. If your ORM generates \`save(entity)\` that issues UPDATE when an id is present, keep audit writes on an insert-only repository method. A unit test that stubs the database is weaker than an integration test against a real schema with triggers, but a repository unit test can still assert that only insert is called.

For teams that stream audit events to an object store or log pipeline, immutability testing shifts: you verify object-lock or write-once configuration, and you verify that reprocessing does not replace objects silently. The same idea applies. The second write must either fail or create a distinct object key, never overwrite the first byte-for-byte under the same identity if your compliance story forbids it.

## Ordering: Sequence Numbers Beat Wall Clocks Under Concurrency

Timestamps feel natural and fail under concurrency. Two writers can commit in an order that does not match \`created_at\` if clocks differ, if the database assigns defaults at different phases, or if the application stamps time in the client before the transaction commits. For audit log testing, treat wall-clock order as a display hint, not as the source of truth, unless you have already proved a stronger clock model.

Prefer a monotonic sequence allocated inside the database transaction that inserts the event. Database sequences are not a perfect global causal clock across shards, but on a single primary they give a stable total order that concurrent API tests can assert.

| Ordering approach | Strength | Failure mode under load | What to assert in tests |
|---|---|---|---|
| Client \`Date.now()\` | Easy to read | Clock skew, delayed commits, sorted lies | Almost nothing safety-critical |
| DB \`now()\` default | Better than client time | Close commits can still sort ambiguously | Tolerance bands only, not exact order |
| DB sequence \`seq\` | Stable total order on one primary | Gaps after rollbacks; not cross-region causal | Monotonic per insert success |
| Lamport or hybrid logical clock | Causal across services | Easy to implement wrong | Unit proofs plus integration checks |
| Outbox position / WAL LSN mapping | Ties to commit order | Operational complexity | Replay matches commit order |

A concurrency test should create many parallel inserts and assert that the observed \`seq\` values are unique and that listing by \`seq\` is stable across repeated reads. Illustrative target: 50 parallel writers, 20 events each.

\`\`\`ts
import assert from 'node:assert/strict';
import { Client } from 'pg';

async function insertEvent(actor: string, n: number) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      \`INSERT INTO audit_events (seq, actor_id, action, subject_type, subject_id, payload)
       VALUES (nextval('audit_seq'), \$1, 'doc.edited', 'doc', 'doc-1', \$2::jsonb)\`,
      [actor, JSON.stringify({ n })]
    );
  } finally {
    await client.end();
  }
}

async function testConcurrentOrdering() {
  const writers = 50;
  const perWriter = 20;
  const jobs: Promise<void>[] = [];

  for (let w = 0; w < writers; w += 1) {
    for (let n = 0; n < perWriter; n += 1) {
      jobs.push(insertEvent(\`actor-\${w}\`, n));
    }
  }

  await Promise.all(jobs);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(
      \`SELECT seq, created_at
       FROM audit_events
       WHERE subject_id = 'doc-1'
       ORDER BY seq ASC\`
    );

    assert.equal(result.rows.length, writers * perWriter);

    const seqs = result.rows.map((row) => Number(row.seq));
    const unique = new Set(seqs);
    assert.equal(unique.size, seqs.length);

    for (let i = 1; i < seqs.length; i += 1) {
      assert.ok(seqs[i] > seqs[i - 1]);
    }

    // Timestamps may be equal or even appear inverted relative to seq.
    // Record the inversion count for visibility; do not require zero.
    let timestampInversions = 0;
    for (let i = 1; i < result.rows.length; i += 1) {
      const prev = new Date(result.rows[i - 1].created_at).getTime();
      const curr = new Date(result.rows[i].created_at).getTime();
      if (curr < prev) timestampInversions += 1;
    }
    console.log(JSON.stringify({ timestampInversions }));
  } finally {
    await client.end();
  }
}

testConcurrentOrdering().catch((error) => {
  console.error(error);
  process.exit(1);
});
\`\`\`

If your product UI sorts by timestamp today, add a characterization test that documents inversions under concurrency instead of pretending they cannot happen. Then decide whether the UI should sort by \`seq\` instead. Many teams discover during audit log testing that support tools show a misleading timeline because they ORDER BY \`created_at\`.

Cross-service ordering is harder. If service A emits an event and service B emits a follow-up after an async hop, a single database sequence on B cannot prove A happened first unless you carry a causal token. For that case, store parent event ids or a vector/Lamport field and test that consumers reject or flag gaps. Keep claims honest: "ordered within this service's primary" is a different guarantee from "globally ordered across the platform."

## Retention Jobs and Legal Hold Verification

Retention is where audit log testing meets jobs, not only HTTP handlers. A nightly purge that deletes rows older than a threshold can destroy evidence if the threshold, timezone, or hold logic is wrong.

Write the retention policy as data you can query. Example columns (illustrative): \`retain_until\`, \`legal_hold\`, \`purged_at\`. Prefer computing \`retain_until\` at insert time from a typed policy table so tests can freeze clocks and assert exact boundaries.

| Scenario | Expected purge result | Assertion idea |
|---|---|---|
| Event older than retention, no hold | Deleted or tombstoned per policy | Count before/after job |
| Event inside retention window | Remains | Spot-check ids still present |
| Event older than retention, legal hold true | Remains | Hold flag blocks delete |
| Hold removed after retention elapsed | Deleted on next successful run | Two-phase job test |
| Clock skew around midnight UTC | Boundary rows follow documented timezone | Freeze time in job input |

A job test should insert a fixture with known ages relative to a frozen "now", run the purge once, and verify counts. Avoid depending on the real wall clock in CI.

One consequence of the append-only trigger above: the purge job cannot simply issue DELETE, because the trigger rejects it, and that is exactly what you want on the normal path. Retention runs through a break-glass role that disables the trigger for its own session, does its work inside one transaction, and re-enables it. The test does the same, which also proves the break-glass path works before you need it in production.

\`\`\`ts
import assert from 'node:assert/strict';
import { Client } from 'pg';

async function seedRetentionFixture(client: Client) {
  // The append-only trigger rejects DELETE, so the retention role disables it
  // for this session only. This is the documented break-glass path.
  await client.query('ALTER TABLE audit_events DISABLE TRIGGER audit_events_immutable');
  await client.query('DELETE FROM audit_events');
  await client.query(
    \`INSERT INTO audit_events
      (seq, actor_id, action, subject_type, subject_id, payload, created_at)
     VALUES
      (1, 'u1', 'login', 'user', 'keep-fresh', '{}', TIMESTAMPTZ '2026-08-20T12:00:00Z'),
      (2, 'u1', 'login', 'user', 'purge-me', '{}', TIMESTAMPTZ '2025-01-01T12:00:00Z'),
      (3, 'u1', 'login', 'user', 'held-old', '{}', TIMESTAMPTZ '2025-01-01T12:00:00Z')\`
  );
  await client.query(
    \`INSERT INTO audit_legal_holds (subject_type, subject_id, active)
     VALUES ('user', 'held-old', true)
     ON CONFLICT (subject_type, subject_id)
     DO UPDATE SET active = EXCLUDED.active\`
  );
}

async function runPurgeJob(client: Client, nowIso: string, retainDays: number) {
  // Illustrative SQL matching a simple policy: delete old rows without active holds.
  await client.query(
    \`DELETE FROM audit_events e
     WHERE e.created_at < (\$1::timestamptz - make_interval(days => \$2))
       AND NOT EXISTS (
         SELECT 1
         FROM audit_legal_holds h
         WHERE h.subject_type = e.subject_type
           AND h.subject_id = e.subject_id
           AND h.active = true
       )\`,
    [nowIso, retainDays]
  );
}

async function testRetention() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await seedRetentionFixture(client);
    await runPurgeJob(client, '2026-08-27T00:00:00Z', 365);
  await client.query('ALTER TABLE audit_events ENABLE TRIGGER audit_events_immutable');

    const rows = await client.query(
      \`SELECT subject_id
       FROM audit_events
       ORDER BY subject_id\`
    );
    const ids = rows.rows.map((row) => row.subject_id);
    assert.deepEqual(ids, ['held-old', 'keep-fresh']);
  } finally {
    await client.end();
  }
}

testRetention().catch((error) => {
  console.error(error);
  process.exit(1);
});
\`\`\`

Add a negative test where the job is pointed at a dry-run mode or a SELECT of candidates first. Many production incidents start when a purge query joins incorrectly and deletes the held set. Snapshot candidate ids in the job log and assert in tests that held subjects never appear in the delete candidate list.

If you soft-delete audit rows, test both stages: the mark job and the hard-delete job. Compliance reviewers often ask whether "deleted" means hidden from UI or removed from backups. Your tests should state which layer they cover. Backup retention is usually outside the app test suite, but the app suite can still prove that the online store honors holds.

## Cascade Deletes Must Not Erase Audit History

Domain rows come and go. Audit history about those rows must usually remain. This is the twin of immutability: not only can you not edit an event, you also must not lose events because a parent customer, invoice, or document was removed.

If \`audit_events.subject_id\` is a foreign key with \`ON DELETE CASCADE\`, deleting the subject silently erases evidence. That pattern fails audits. Prefer no foreign key, or a foreign key with \`ON DELETE RESTRICT\` / \`NO ACTION\` while subjects are detached through soft delete, or store denormalized subject labels inside the event payload so history remains readable after the live entity is gone.

When you test subject deletion, assert audit rows remain. This pairs directly with [database cascade delete behavior](/blog/database-testing-cascade-delete-behavior): the cascade matrix for operational tables is not the cascade matrix for forensic tables.

\`\`\`sql
-- Expectation: deleting the live subject does not remove audit rows.
BEGIN;

INSERT INTO documents (id, title) VALUES ('doc-77', 'Contract');
INSERT INTO audit_events (seq, actor_id, action, subject_type, subject_id, payload)
VALUES (100, 'user-9', 'document.created', 'document', 'doc-77', '{"title":"Contract"}'::jsonb);

DELETE FROM documents WHERE id = 'doc-77';

SELECT count(*) AS remaining
FROM audit_events
WHERE subject_type = 'document' AND subject_id = 'doc-77';
-- remaining must be 1

ROLLBACK;
\`\`\`

Wire this into automated tests the same way you wire immutability. A deleted customer with zero remaining audit rows is a silent compliance failure, not a cleanup success.

Also verify exports. If a GDPR-style erase request removes personal data from live tables, decide whether audit payloads need redaction, replacement events, or encrypted fields. Whatever the legal path is, encode it as tests: either personal fields become tokens while the event remains, or a redaction event is appended and readers honor it. Do not "fix" history in place unless counsel and policy explicitly require a controlled rewrite, and if they do, that rewrite must itself be audited and exceptional.

## Batch APIs and the Order Events Hit the Log

Batch endpoints are a frequent source of audit confusion. A client sends ten operations. The API applies some, rejects others, retries duplicates, and returns a mixed result. The audit log must show what actually committed, in an order that matches commit semantics, not only the array order in the request body.

Connect this to [batch request ordering](/blog/api-testing-batch-request-ordering): if your batch API claims sequential application, audit \`seq\` values for the batch should increase in the same order as successful operations. If the API applies independent operations concurrently, do not claim request-array order in the audit trail.

Practical API checks:

1. Send a batch of create/update/delete style domain operations that each emit audit events.
2. Capture the batch response per-item statuses.
3. Load audit events for the affected subjects filtered to the batch correlation id.
4. Assert one event per successful item, zero for failed items that never mutated state, and exact counts for partial success.
5. If the API documents sequential semantics, assert audit \`seq\` order matches the successful item order.

Include duplicate item ids and out-of-range payloads so partial success is real. An all-success batch rarely exposes ordering bugs. A mixed batch does.

Correlation ids matter here. Propagate a \`batch_id\` or \`request_id\` into every audit payload so tests can select the cohort without depending on time windows. Time windows flake under parallel CI.

## Failure Story: The Log That Looked Ordered Until Payroll Broke

Symptom: a fintech payroll admin tool showed benefit-change events in a neat chronological list. During a dispute, a customer claimed an eligibility change happened after payroll calculation. The UI timeline supported the customer. The payroll engine claimed it had used the earlier policy. Support trusted the UI because events were "immutable" and sorted by \`created_at\`.

Wrong theory: the team assumed a race in payroll reads. Engineers spent days adding locks around calculation. The audit table was treated as ground truth because UPDATEs were already blocked by a trigger and DELETE tests were green.

Actual cause: the ingestion path stamped \`created_at\` in the API process with \`new Date()\` before publishing to an outbox. Under load, workers inserted outbox rows in commit order, but the stamped times came from app hosts with enough skew and queueing delay that two events for the same employee could land with inverted timestamps relative to the database sequence. Worse, a support "replay" job re-inserted a missing event days later with a fresh \`created_at\` while reusing a business id in the payload. Immutability tests passed because no row was updated in place. Ordering and identity tests did not exist. The UI sorted by the wall clock and told a clean story that never happened.

Fix: stop trusting client or app timestamps for order. Allocate \`seq\` with \`nextval\` in the same transaction as the insert. Sort admin timelines by \`seq\`. Reject replay inserts that collide on an event hash of (actor, action, subject, business_time, payload digest) unless they are explicit compensating events with a new action type. Add the concurrent writer test and a replay test to CI. After the change, the dispute timeline matched payroll, and the "missing" event showed as a late compensating entry instead of a quietly newer past.

The diagnosis pattern is worth keeping: when an audit UI disagrees with a downstream processor, check whether both sides share the same ordering key. Immutability alone does not make a timeline true.

## Clock Edges, Exports, and Reader Contracts

Beyond insert and delete, test the readers. Exports to CSV or JSON for auditors must preserve \`seq\`, stable ids, and enough subject labels to interpret rows after live data is gone. Assert that export order is \`seq\` ascending and that pagination does not reshuffle under concurrent inserts. A common bug is \`ORDER BY created_at LIMIT n\` paired with keyset pagination on id, which can skip or duplicate under inserts.

For multi-tenant systems, verify tenant isolation on audit reads and exports. An append-only table shared across tenants still needs WHERE tenant_id constraints in every reader path. Include a cross-tenant negative test: a token from tenant A must not list events for tenant B even if subject ids are guessable.

Hash chaining is optional. Some systems store \`prev_hash\` and \`row_hash\` so tampering becomes detectable. If you claim hash chains, test that a manual UPDATE performed by a superuser after temporarily disabling a trigger breaks verification. If you cannot disable triggers in production, run that tamper test in a staging clone with deliberate privilege. Do not claim tamper evidence you do not verify.

## Putting the Suite in CI Without Flakes

Keep audit log testing deterministic:

1. Use disposable databases or transactions with rollback where safe.
2. Freeze job clocks with parameters, not \`Date.now()\` inside assertions.
3. Prefer sequence assertions over timestamp equality.
4. Isolate fixtures by unique subject ids per test to allow parallelism.
5. Fail on accidental GRANT widening in schema diffs.

Split suites by risk. Fast PR checks: trigger reject, API method rejects, one concurrent insert smoke test, retention candidate query. Nightly: full parallel writers, multi-batch partial success, long retention matrix, export pagination under insert load.

Document the guarantee string next to the tests. Example guarantee (illustrative): "Audit events for a single primary are append-only, uniquely sequenced by \`seq\`, retained for 365 days unless legal hold is active, and preserved when domain rows delete." If marketing writes a stronger sentence, either weaken the sentence or strengthen the tests. Do not leave them mismatched.

## Frequently Asked Questions

### What is audit log testing in practice?

Audit log testing proves three properties with automated checks: events cannot be updated or deleted through normal paths, ordering keys remain correct under concurrent writers, and retention jobs delete only what policy allows while honoring legal holds. It combines SQL privilege and trigger tests, API method tests for append-only behavior, concurrency tests for sequences, and job tests with frozen clocks. Dashboards and manual spot checks are not a substitute because they rarely exercise races, replays, or cascade deletes.

### Should audit events use foreign keys to domain rows?

Usually avoid \`ON DELETE CASCADE\` from domain rows to audit events. Cascading erases history when subjects are removed. Prefer no foreign key, restrict deletes while events exist, or soft-delete domain rows while keeping forensic copies. Store enough denormalized context in the event payload so readers can interpret the row after the live entity is gone. Whatever you choose, add a deletion test that asserts audit rows remain for removed subjects.

### Why not sort audit timelines by timestamp?

Timestamps are convenient and unreliable as a sole ordering key under concurrency, clock skew, queued writers, and delayed replays. A database sequence allocated in the insert transaction gives a stable total order on one primary and matches commit order more closely than \`Date.now()\` in application hosts. Use timestamps for human context and alerting windows. Use \`seq\` or an explicit causal token for the order you defend in disputes and compliance reviews.

### How do you test retention without waiting months?

Insert fixture rows with fabricated \`created_at\` values around a frozen "now" you pass into the purge job, including one held subject and one expired unheld subject. Run the job once, then assert which ids remain. Add a second run after clearing the hold to prove delayed deletion. Keep the retain window as a parameter in tests so you are not coupled to production constants. Mark any sample ages and day counts as illustrative when they are not your real policy.
`,
};
