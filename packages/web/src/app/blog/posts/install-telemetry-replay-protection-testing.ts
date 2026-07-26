import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'install telemetry replay protection testing',
  description:
    'Use install telemetry replay protection testing to expose duplicate events, retry-driven counter inflation, and missing idempotency controls.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'install telemetry replay protection testing',
  keywords: [
    'install telemetry replay protection testing',
    'duplicate install event prevention',
    'telemetry idempotency key test',
    'retry counter inflation QA',
    'replayed POST request testing',
    'install event deduplication',
  ],
  relatedSlugs: [
    'qaskills-cli-disable-telemetry-do-not-track',
    'api-testing-complete-guide',
    'database-testing-automation-guide',
    'testing-leaderboard-cache-filter-isolation-ranking-consistency',
  ],
  sources: [
    'https://www.rfc-editor.org/info/rfc9110',
    'https://owasp.org/www-project-api-security/',
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
  ],
  repoEvidence: [
    'packages/web/src/app/api/telemetry/install/route.ts',
    'packages/web/src/db/schema/relations.ts',
    'packages/web/src/lib/telemetry-normalize.ts',
  ],
  content: `Install telemetry replay protection testing proves whether one logical install can cause more than one stored event or counter increase; send the same valid request again after a timeout, then send matching copies at once. Compare event rows and both skill counters with a one-event oracle instead of trusting successful responses.

The current route records each resolved event and raises both counters for every normalized add; it does not read an event key or enforce event uniqueness, so the target once-only rule is not implemented yet. A useful suite records this failing baseline before any protection design is added.

## What Does Install Telemetry Replay Protection Testing Expose?

Install telemetry replay protection testing exposes repeated side effects that ordinary status checks cannot see; two requests may both return \`{ success: true }\`, while the database gains two install rows and each public counter rises twice. The defect is measured in state changes, not in response shape alone.

The flow in \`packages/web/src/app/api/telemetry/install/route.ts\` parses JSON, normalizes the body, resolves the skill reference, inserts an event, and then updates counters for an add. These writes have no request identity check before them, and they also run as separate database calls rather than one transaction.

The \`installs\` table in \`packages/web/src/db/schema/relations.ts\` gives each row a random UUID. It stores skill, agent, event type, country, and time, but no client event key. A random row ID makes each replay easy to insert because every attempt receives a new primary key.

Normalization does not add replay identity either; the helper at \`packages/web/src/lib/telemetry-normalize.ts\` returns reference, UUID status, action type, and agent type. Two equal bodies become equal normalized values, yet nothing marks them as one logical event.

HTTP method rules explain why a client or gateway cannot assume a repeated POST is harmless. [RFC 9110](https://www.rfc-editor.org/info/rfc9110) defines method semantics and identifies which methods are idempotent. The application must design its own replay rule when a POST creates counted side effects.

Begin with a single add request as the control; it should add one event row and raise \`installCount\` plus \`weeklyInstalls\` by one. A second copy should reveal current behavior, while the future protected contract should leave those totals unchanged.

The [CLI telemetry privacy test](/blog/qaskills-cli-disable-telemetry-do-not-track) covers whether a client sends an event at all. Replay tests begin after one event is allowed to leave the client. The two gates protect different promises and should not share an assertion.

Keep the first fixture plain: one skill, zero counters, one agent, and one stable body. A clear baseline lets a reader count rows without filters or guesswork. Add timeouts and parallel work only after the single request proves that the route can write the event.

## How Should Duplicate Install Event Prevention Be Tested?

Duplicate install event prevention should be tested with sequential and concurrent copies of one normalized add. Sequential replay models a client retry after a lost response, while concurrent replay models two deliveries that check state before either write becomes visible.

Take a state snapshot before sending requests; record the count of install rows for the target skill, \`installCount\`, and \`weeklyInstalls\`. After each scenario, calculate deltas from that snapshot rather than asserting global totals that another fixture could affect.

The sequential case sends one request, waits for completion, and sends the same body again; current code should produce two rows and counter deltas of two. A protected design should return a consistent success response but preserve one row and deltas of one for the shared key.

The concurrent case uses \`Promise.all\` with two fresh request objects. Reusing one request can fail because its body stream has already been read. Fresh objects keep the race at the database boundary instead of the web stream boundary.

This route-level example captures the desired once-only oracle:

\`\`\`typescript
import { expect, test } from 'vitest';
import { POST } from '@/app/api/telemetry/install/route';

test('counts one logical install once during concurrent delivery', async () => {
  const body = {
    skillSlug: 'replay-fixture',
    action: 'install',
    agents: ['codex'],
  };

  const makeRequest = () =>
    new Request('http://test/api/telemetry/install', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': 'install-event-001',
      },
      body: JSON.stringify(body),
    });

  const before = await readSkillTelemetryState('replay-fixture');
  await Promise.all([POST(makeRequest() as never), POST(makeRequest() as never)]);
  const after = await readSkillTelemetryState('replay-fixture');

  expect(after.installRows - before.installRows).toBe(1);
  expect(after.installCount - before.installCount).toBe(1);
  expect(after.weeklyInstalls - before.weeklyInstalls).toBe(1);
});
\`\`\`

This example states a proposed header because current production code does not consume one. Run it first as a documented failing test or place it behind the protection change. Do not claim that the header alone has any effect before persistence and conflict rules exist.

For the current baseline, change the expected deltas to two and label the case as known exposure. That test prevents a team from forgetting the gap during design. Replace it with the once-only oracle when the database and route gain a real replay boundary.

Use the [API testing guide](/blog/api-testing-complete-guide) to keep request setup, response checks, and state checks distinct. The central proof remains the database delta. A green pair of 200 responses says nothing about duplicate install event prevention.

## What Belongs in a Telemetry Idempotency Key Test?

A telemetry idempotency key test needs rules for key source, scope, payload binding, retention, conflict, and response replay. Without those rules, two developers can implement different forms of deduplication that both pass a shallow duplicate case, so write the contract before the storage shape.

Key source decides who creates the stable identity. A CLI can generate one event UUID before its first attempt and reuse that UUID for retries. A gateway-generated request ID is weaker if it changes on each delivery or does not survive a client retry.

Scope decides which records share a namespace. A key might be unique across all telemetry, per client installation, or per skill and action. Global uniqueness is simple to state, while narrower scopes require enough columns in the unique boundary to prevent false conflicts.

Payload binding asks what happens when one key arrives with changed skill, action, or agent data. The safe contract should reject or flag conflicting reuse rather than silently return the first success. A same-key and same-payload replay can return the stored outcome without new writes.

Retention defines how long a key remains protected. A short window may stop transport retries but allow a delayed replay later. A permanent event UUID can support durable deduplication, though storage and privacy rules must still be reviewed.

The database should arbitrate concurrent claims. PostgreSQL [unique constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) can reject a second row with the same protected key even when both requests race. An application-only read before insert leaves a gap between the check and the write.

The test matrix must include a same key with changed payload. Expect a clear conflict policy and no side effects from the second body. Also test two distinct keys with equal payloads, since two real installs may look the same and should remain separate.

Install telemetry replay protection testing should observe response behavior after the first accepted write. The route currently hides database faults by returning success, which is intentional for optional telemetry. A future key contract must decide whether a conflict also stays invisible or returns a distinct status.

The [database automation guide](/blog/database-testing-automation-guide) gives patterns for unique boundaries and state cleanup. Keep this case tied to actual constraints, because a mocked duplicate error cannot prove two real concurrent inserts are serialized correctly.

Use small key values that are easy to read in logs, but never derive them from a live user name or network address. The fixture has no need for personal data. A fixed test event UUID and a unique skill slug give enough trace data for each run.

## Retry Counter Inflation QA Matrix

Retry counter inflation QA compares each delivery pattern with both current risk and the once-only target. The row count matters because counters can be repaired while duplicate history remains. Both forms of state need the same logical event rule.

| Scenario | Requests sent | Distinct event keys | Expected install rows | Expected counter delta | Current risk |
|---|---|---|---|---|---|
| Single add | 1 | 1 | 1 | 1 | Normal write |
| Sequential retry | 2 | 1 | 1 | 1 | Duplicate row and delta |
| Concurrent duplicate | 2 | 1 | 1 | 1 | Race creates two writes |
| Changed payload | 2 | 1 | 1 plus conflict | 1 | No payload binding |
| Remove replay | 2 | 1 | 1 remove row | 0 | Duplicate history |
| Unknown skill replay | 2 | 1 | 0 | 0 | Silent no-op |

The expected columns describe the target design, while the last column names the gap in current code; mark that distinction in test names and reports. Otherwise, a team may update expectations to duplicate behavior and turn a defect into the new oracle.

A client timeout is the most direct sequential fixture. Let the first handler finish its write, discard its response in the harness, and issue the same logical event again. There is no need to delay the database or rely on a real proxy for this branch.

A double click may produce two distinct client event keys, depending on where identity is created. Decide whether that means two logical installs or one user act before asserting state. Replay protection only merges deliveries that the chosen contract identifies as the same event.

Concurrent delivery should begin from one barrier so both requests reach the protected insert near the same time. Run the case several times inside one test if the old race is hard to expose. The protected result must remain one accepted row on every pass.

Remove and update events do not raise counters in the current route. They still create rows, so replay can skew event history even when public totals stay fixed. Tests should count type-specific rows and avoid treating a zero counter delta as full success.

Unknown skills return success before insertion. Replaying that request should still yield zero rows and zero counter movement. This case checks that key storage does not create orphan records before reference resolution.

The [leaderboard consistency article](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) shows why inflated source counters can spread into ranked views. Keep replay assertions at the write layer first, then add one read-side check that a single accepted install changes rank data only once.

## How Do You Run Replayed POST Request Testing?

Replayed POST request testing starts with one captured body and a stable logical event ID; send controlled copies in a known order, and inspect state after each phase. Do not rely on request logs because a received request is not proof of a committed write.

Build fresh JSON requests from one frozen object. Include the same skill reference, action, agent list, country header, and proposed key each time. Freezing the object prevents a test helper from changing a field between the first send and retry.

Record request identity in the test report, not in production fields that the route ignores. The current schema cannot preserve that key. Once storage is added, query the event by its protected key and assert the stored payload fingerprint or bound fields.

The replay harness can send a pair in three modes: wait between calls, launch both at once, and launch the second after an artificial response loss. These modes cover simple retries, race windows, and ambiguous client outcomes. They should share state readers but use separate database setup.

\`\`\`typescript
import { expect } from 'vitest';

async function exerciseReplay(send: () => Promise<Response>, read: () => Promise<State>) {
  const start = await read();
  const first = await send();
  const afterFirst = await read();
  const second = await send();
  const finish = await read();

  expect(first.ok).toBe(true);
  expect(second.ok).toBe(true);
  expect(afterFirst.rows - start.rows).toBe(1);
  expect(finish.rows - start.rows).toBe(1);
  expect(finish.installCount - start.installCount).toBe(1);
  expect(finish.weeklyInstalls - start.weeklyInstalls).toBe(1);
}
\`\`\`

The state type should hold only values used by assertions. Read rows for the seeded skill and key, then read the two counters from that same skill. A broad table count can fail when another test runs in parallel.

Install telemetry replay protection testing also needs one distinct-key control. Send equal bodies with two event keys and expect two rows plus counter deltas of two. Deduplication that hashes only the body would collapse valid repeated installs and fail this control.

Use [API testing resources](/categories/api-testing) to add the route case to the right suite. Keep it close to database setup rather than a browser flow. Browser retries are useful later, but they make a poor first tool for exact write counts.

Clean rows by fixture skill ID after every case, even when an assertion fails. Then reset its counters to the seed values or roll back the test transaction. Reliable cleanup prevents one replay case from making the next case look inflated before it sends anything.

## Install Event Deduplication Design Options

Install event deduplication can use a unique event ID on the row, a separate key ledger, a conditional insert, or a transactional write function. Each option must make row acceptance and counter change one atomic decision. Protecting only one side can leave history and totals out of sync.

Adding \`eventId\` to \`installs\` is the smallest visible model. A unique constraint rejects the same identity twice, and the accepted insert can drive whether counters change. This approach also makes event audit queries direct, though old clients need a policy when no key is sent.

A separate idempotency table can store key, payload fingerprint, state, and response data. It supports richer conflict and replay rules, but it adds cleanup and failure states. Tests must cover a key reserved before an event write that later fails.

A conditional insert with conflict handling can return whether a row was newly created. The route should update counters only when that returned fact is true. Reading for a key first and then inserting is not enough because two workers can pass the read together.

A database function or transaction can bind accepted row insertion to both counter updates. This protects the current split between \`db.insert(installs)\` and \`db.update(skills)\`. Inject a failure between those steps to prove the transaction rolls back all state.

Do not use a short body hash as the sole identity. Two valid installs of the same skill from the same agent may have equal bodies at different times. A caller-created event ID distinguishes those acts while staying stable across transport retries.

The [database testing guide](/blog/database-testing-automation-guide) is useful for conflict and rollback fixtures. Add a real PostgreSQL integration test even if pure route tests mock Drizzle. Constraint behavior and concurrent transactions are the parts most likely to differ from a mock.

OWASP notes that APIs can expose business flows whose repeated automated use may cause harm, including extra resource use. The [OWASP API Security Project](https://owasp.org/www-project-api-security/) gives that risk context. Here, the measured harm is false install history and inflated ranking inputs, not a claim of user compromise.

Choose one design only after the product defines key scope and retention. Then write the migration, route branch, and tests as one change. A schema with no route use and a route with no unique constraint each leave replay gaps.

## Replay Fixtures and Expected Database Deltas

Replay fixtures should own a skill row with known counters and no old install events. Give each test a unique slug and fixed UUID so state queries stay exact. Avoid a shared popular skill because other suites may write to its totals.

For an add case, assert event count by skill and normalized type. Then assert both counters from the skill row. These three numbers form the minimum oracle for install telemetry replay protection testing.

For a remove case, expect one stored remove event and no counter movement. For update, expect one update event and the same zero delta. A duplicate remove or update is still a failed once-only contract even though leaderboard inputs do not change.

For a conflicting reuse case, keep the first event and its counters intact. The second body should neither create a row nor alter the stored payload. Record the chosen conflict response so clients know whether they may retry with a new key.

For unknown reference input, expect no event row because the route cannot satisfy the foreign key target. Do not reserve a permanent key before this result unless the contract explicitly remembers no-op responses. That choice affects whether a skill published later can accept the same event.

Read database values after the handler promises resolve, then read them again after a short task queue turn. The current handler awaits each write, so state should already be final. The second read can catch a future refactor that moves counters into untracked background work.

The [leaderboard page](/leaderboard) is a consumer, not the source of truth for these fixtures. A cached rank may lag and should not define exact write deltas. Use direct database reads for the core case and one focused rank test for end-to-end coverage.

Keep each failure message as a small before-and-after record. Show event rows by type, both counter values, and the event key. This data lets a maintainer spot a double insert, a counter-only repeat, or an incomplete rollback without opening a full database dump.

## How Do You Add Replay Tests to CI?

Add replay tests to CI with an isolated PostgreSQL database, deterministic event keys, and controlled parallel requests. Pure normalizer tests are not enough because replay safety depends on uniqueness and atomic writes. The route and schema must meet under real concurrency.

1. Create a skill fixture with zero install and weekly counters.
2. Record install row count and both counter values for that skill.
3. Send one add payload twice with the same proposed idempotency key.
4. Repeat the pair concurrently from a shared start barrier.
5. Assert one accepted row and a counter delta of one for the protected contract.
6. Repeat for remove, update, changed payload, and unknown references.

Run the sequential set on every pull request. Keep the concurrent pair in the same gate when the test database supports parallel connections. If a local adapter serializes all calls, the case may miss the race and needs a database-backed job.

Add a failure injection between event acceptance and counter updates. The expected transaction should leave no row and no counter change, or complete all three writes according to the chosen design. Never accept a row with only one counter raised.

Use unique fixture keys per worker while keeping replay copies equal inside one case. This balance prevents worker collisions and still exercises the constraint. A run ID prefix plus a fixed case suffix is easy to trace and remove.

The [telemetry opt-out guide](/blog/qaskills-cli-disable-telemetry-do-not-track) can feed one negative CI case where no request is emitted. Keep that client case outside the route replay suite. The server suite should not depend on a CLI process to create two exact requests.

Fail the job on any extra row, counter delta, changed payload, orphan key, or unstable conflict response. Retry the test process only to study a race, not to turn a red state into a pass. One unexpected write is the evidence this gate exists to catch.

After the database checks pass, query the [ranked skill view](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) with cache isolation. Expect the accepted add to affect its source total once. This final check links replay safety to the visible metric without replacing direct state assertions.

## Frequently Asked Questions

### Is POST automatically protected from duplicate delivery?

No, POST does not grant application-level once-only side effects. A client may retry when the response is lost, and two deliveries can reach the server together. The route needs a stable event identity, a database uniqueness rule, and an atomic counter update to enforce one accepted event.

### Who should create the telemetry idempotency key?

The component that knows one logical event should create the key before its first send and reuse it for retries. For CLI telemetry, that is normally the client event producer. Gateways may pass the value through, but a new gateway request ID on each attempt cannot join those attempts.

### Do remove and update replays matter without counter changes?

Yes, duplicate remove and update rows distort event history, rates, and later analysis even when install counters remain fixed. Assert one stored row for each logical key. Counter checks are necessary for adds, but row-level deduplication applies to every normalized event type.

### How long should replay keys be retained?

Retention follows the product's retry and audit contract rather than a universal duration. A brief window stops quick transport retries but not late delivery. Tests should freeze time at the boundary, then prove a key remains blocked or becomes reusable exactly when the documented policy says.

### Can an application read before insert to stop duplicates?

Not safely under concurrency by itself. Two requests can both see no row before either inserts. Put the decision behind a unique database boundary or another atomic primitive, then update counters only when the insert reports that this request created the accepted event.

### What should happen when a replay names an unknown skill?

Current behavior returns success and writes nothing because no skill ID can be resolved. A protection design must decide whether that no-op consumes the key. Test the choice directly, including a later skill creation, so delayed retries do not gain surprising new side effects.

## Conclusion

Install telemetry replay protection testing turns retry risk into three exact deltas: one logical add creates one event row, one install count, and one weekly count. Keep the known failing baseline until a stable key, unique boundary, and atomic write path enforce that rule under concurrent delivery.

Review [telemetry-aware QA skills](/skills) before defining the key contract, then apply the matrix to the route and database gate. Use the [API testing guide](/blog/api-testing-complete-guide) to extend the same once-only proof through client retries and ranked views.`,
};
