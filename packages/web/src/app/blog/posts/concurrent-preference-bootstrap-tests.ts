import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Concurrent preference bootstrap tests',
  description:
    'concurrent preference bootstrap tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'concurrent preference bootstrap tests',
  keywords: [
    'concurrent preference bootstrap tests',
    'preference creation race condition',
    'concurrent api bootstrap test',
    'duplicate user preference rows',
    'drizzle insert race testing',
    'first request concurrency',
  ],
  relatedSlugs: [
    'testing-idempotency-key-concurrent-requests',
    'testing-clerk-user-created-webhook-idempotency',
    'testing-missed-clerk-webhook-user-recovery',
    'database-testing-automation-guide',
  ],
  sources: [
    'https://orm.drizzle.team/docs/insert',
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
  ],
  repoEvidence: [
    'packages/web/src/app/api/user/preferences/route.ts:GET missing-row insert',
    'packages/web/src/db/schema/users.ts:userPreferences userId definition',
  ],
  content: `Concurrent preference bootstrap tests release two first-time GET requests after both observe no settings row, then inspect both responses and final records. The desired result is one default row and consistent JSON. Current schema evidence lacks a unique userId rule, so this test can expose duplicate creation instead of assuming safety.

This guide treats a failing race as useful evidence, not as a flaky test to mute. The endpoint performs a read followed by an insert, and the database definition controls whether competing inserts can coexist. Review the [QA skills catalog](/skills) after protecting this bootstrap boundary.

## Concurrent preference bootstrap tests: What Must the Suite Prove?

Concurrent preference bootstrap tests must prove that two first-time reads for one authenticated user cannot leave contradictory settings or more than one preference row. Both requests should return an intentional status and compatible defaults. The final database query must establish the single-row invariant directly.

The suite must also reveal the current implementation honestly. The GET handler selects preferences with a limit, inserts defaults when none exist, and catches thrown errors as a 500 response. The schema gives \`userId\` a foreign key and \`notNull\`, but no unique declaration appears in that table definition.

That distinction matters because a foreign key validates the referenced user, not one-to-one cardinality. The [PostgreSQL constraints documentation](https://www.postgresql.org/docs/current/ddl-constraints.html) describes foreign keys and unique constraints as separate rules. A test should therefore inspect actual row count rather than infer uniqueness from the reference.

The expected product contract remains one preference record per user. If two records survive, concurrent preference bootstrap tests should fail with both record IDs, response bodies, and query timing. This result identifies a missing database invariant or an unsafe bootstrap write.

A single sequential request only proves the ordinary branch. It selects an empty result, inserts default values, and returns the inserted row. A later sequential request sees a row and returns it without writing, leaving the race window completely untouched.

Use the [dashboard preference route](/dashboard/preferences) as the consumer context, but keep the race at the API and database layers. Browser clicks rarely align two reads precisely enough to provide repeatable concurrency evidence.

## Which QASkills Code Paths Own This Contract?

The request behavior lives at \`packages/web/src/app/api/user/preferences/route.ts:GET missing-row insert\`. The schema evidence lives at \`packages/web/src/db/schema/users.ts:userPreferences userId definition\`. Together, those paths show a check-then-insert sequence and the database rules applied to its target column.

GET first resolves the Clerk user, then looks up the matching application user by Clerk ID. It returns 401 when authentication is absent and 404 when the database user is missing. Race fixtures must satisfy both gates before they can exercise preference creation.

The handler then selects from \`userPreferences\` by application user ID and applies \`limit(1)\`. When that result is empty, it inserts four true defaults and returns the first inserted record. When a row exists, it returns the first selected record without an insert.

The schema creates a random primary key for each preference record. Its \`userId\` references the users table with cascading deletion and cannot be null. Since the definition does not mark \`userId\` unique, two records can have different primary keys while referencing the same user.

This means the route layer and database layer answer different questions. The route intends to create a missing record, while the schema currently permits repeated ownership. A complete preference creation race condition test must observe both the route response and the persistent cardinality.

Drizzle's [insert guide](https://orm.drizzle.team/docs/insert) documents insert, returning, and conflict-handling APIs. Use that source to choose an eventual repair pattern, but base current expectations on the code that is actually present.

The [missed webhook recovery article](/blog/testing-missed-clerk-webhook-user-recovery) owns user-row recovery before preferences run. This article assumes the application user exists and isolates only first-time preference creation.

## Preference creation race condition: Baseline Cases

Start with a user who already has one preference row. Two concurrent GET requests should both read that row, produce no inserts, and return the same persistent ID. This control proves the harness can execute overlapping requests without always forcing the missing branch.

Next, create a user with no preference row and make one GET request. It should return 200 with the four true defaults currently written by the handler. A final query should find one row linked to that user.

The key preference creation race condition places both missing-row reads behind a barrier. Each request must report that it observed an empty preference result before either insert continues. Releasing both requests together converts a timing hope into a deterministic overlap.

Run another case where the first insert completes before the second preference select. The second request should then return the existing row and avoid a write. This interleaving provides a healthy comparison with the dangerous double-missing sequence.

The current schema allows the two inserts from the dangerous sequence to succeed independently. If that happens, both responses may be 200 while the final count is two. Concurrent preference bootstrap tests must mark that state as a contract failure even though neither HTTP request failed.

If a future unique rule rejects the losing insert, the current catch block may return 500 for one request. That outcome prevents duplicate rows but still may not satisfy consistent first-read behavior. Tests should retain response status and body so a schema fix does not hide a route-level error contract.

Include authentication and missing-user controls outside the barrier. They should return 401 and 404 without querying or inserting preferences. These cases ensure the concurrency fixture does not bypass normal ownership checks.

Read the [idempotency concurrency guide](/blog/testing-idempotency-key-concurrent-requests) for request-key contracts. Preference GET has no idempotency key in the cited handler, so this suite must test its database behavior directly.

### Prove the race before judging the result

Give the two calls short names such as left and right, then log each read, pause, write, and reply under that name. The log must show both empty reads before it shows the first write, or the run did not test the hard case. Fail the setup check at once when that order is wrong, since the row count from a safe run says very little.

Use a gate with a known count of two, not a sleep that may end before the slow call has reached its read. Each call should mark the gate, wait for its peer, and move on only when the test gives one clear release. Add a short time cap and name the call that did not reach the gate, so a code shift does not cause a vague hang.

Keep one user for one race and give each test worker a new user, since shared rows can add a third write to the trace. Seed the user before the gate is armed, and check that no settings row exists just before both calls start. This clean start makes each final row and ID part of the two-call case rather than old test waste.

## Concurrent api bootstrap test: Test Matrix

A concurrent api bootstrap test should identify each interleaving by observed state, not by wall-clock delay. The matrix below compares request overlap, insert timing, expected responses, and final records. Current-code findings are stated separately from the desired single-row invariant.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Single first request | No row, one GET | Missing-row insert | 200 with true defaults | One inserted row | Missing or repeated record |
| Both reads before either insert | No row, barrier after two reads | Two missing-row inserts | Record both actual responses | Desired count one; current schema may store two | Final count exceeds one |
| First insert wins before second read | No row, ordered release | Insert then existing-row read | Two compatible 200 bodies | One insert total | Different IDs or extra write |
| Losing insert meets future unique rule | Barrier plus unique userId | Insert conflict path | Intentional handled result required | One row survives | Generic 500 or duplicate row |
| Later read after bootstrap | One stored row | Existing-row return | 200 with stored ID | No new insert | Defaults reset or count grows |

The first row validates ordinary setup. The second is the actual concurrency probe and should fail today if two rows survive. The third proves the endpoint behaves correctly when timing closes the window before the second select.

The fourth row is forward-looking but concrete. If a unique constraint is added, keep the race and determine whether the losing request reselects the winner or returns an intentional conflict. Do not silently accept a generic 500 merely because row count became one.

The fifth row checks stability after bootstrap. Because the query uses \`limit(1)\` without an ordering clause, duplicate user preference rows can make the selected record unspecified. A later read may appear stable on one database plan while hiding contradictory records.

Capture insert count through a database query log or test adapter, then confirm it with final rows. Spy counts alone can be misleading when an insert throws or a transaction rolls back. Persistent state is the deciding evidence.

Concurrent preference bootstrap tests should use distinct request labels such as \`left\` and \`right\`. Report which request crossed each barrier and which record ID it returned. This makes a failed interleaving reproducible from CI output.

Use the [database testing guide](/blog/database-testing-automation-guide) for transaction and cleanup patterns. The matrix needs a real PostgreSQL constraint check because an in-memory mock cannot establish database cardinality.

## How Should Duplicate user preference rows Be Exercised?

Duplicate user preference rows should be exercised with one real application user and no initial settings. Start two authenticated requests, pause each immediately after its empty preference select, and verify both reached the pause. Only then release their inserts together.

The barrier belongs in a test adapter around database calls, not in production code. A deferred promise can count empty selects and release both continuations when the count reaches two. Add a fixed timeout so a changed query order fails clearly instead of hanging.

The first code example shows the route-level shape after the adapter confirms both reads are waiting. It uses the real GET handler, then checks response compatibility and persistent row count.

\`\`\`typescript
import { afterEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/user/preferences/route';
import { db } from '@/db';
import { userPreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('first preference bootstrap race', () => {
  afterEach(async () => {
    await releasePreferenceReadBarrier();
  });

  it('leaves one settings row for two first reads', async () => {
    const user = await seedAuthenticatedUser();
    await armPreferenceReadBarrier({ userId: user.id, parties: 2 });

    const left = GET();
    const right = GET();
    await waitForPreferenceReadBarrier();
    await releasePreferenceReadBarrier();

    const responses = await Promise.all([left, right]);
    const bodies = await Promise.all(responses.map((response) => response.json()));
    const rows = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, user.id));

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(new Set(bodies.map((body) => body.id))).toHaveSize(1);
    expect(rows).toHaveLength(1);
  });
});
\`\`\`

The barrier helpers are test infrastructure that pauses the actual preference select boundary. They should not return fake preference data or implement conflict policy. Their only job is to hold both continuations after recording the same missing state.

On the current repository definition, this test can return two different IDs and two rows. Keep that failure because it demonstrates the unprotected race. Do not change the assertion to two merely to match accidental current behavior.

Add a diagnostic query that groups records by \`userId\` and prints only test user IDs with counts above one. Avoid dumping full user rows. The count, returned IDs, and request labels are enough to identify the defect.

The [Clerk webhook idempotency guide](/blog/testing-clerk-user-created-webhook-idempotency) covers concurrent user creation. Here, seed the user first so a webhook race cannot obscure the preference result.

### Read the final rows without a blind spot

Query all rows for the test user after both reply promises have come to rest, and do not add the route's limit to this check. Sort the row IDs in the test before they are shown, so a new plan does not change the log order. Compare the full set with both reply IDs, which shows whether a reply points at a row that the store no longer holds.

When two rows exist, print the fields that can affect later mail and page state, but leave out the user's auth data. Two rows with the same defaults are still a failed one-row rule, even if they look harmless in that first run. The risk grows once a later write can change both rows or a read can pick just one.

When one write fails, keep the kind of store error and the HTTP result from that same call on one line. A unique rule may keep the final count safe while the route still sends one caller a broad server fault. The test should make that split clear, since store safety and a clean API reply are two distinct goals.

## Step-by-Step Drizzle insert race testing Procedure

Drizzle insert race testing needs controlled overlap and a final database assertion. Delays alone are not a control because local and CI schedulers differ. A barrier provides proof that both reads observed the missing state.

1. Create a user with no preference row and place a barrier before the insert.
2. Release two GET requests together and record query and insert ordering.
3. Assert both responses, duplicate-key handling, defaults, and the final row count.
4. Repeat the case under the real userId constraint in an integration database.

During step one, clear every preference row for the fixture user and verify the count is zero. Reusing an existing account without cleanup can move both requests onto the ordinary read branch. Use a unique Clerk identity for each test run.

During step two, start both promises before awaiting either response. The barrier should emit events for \`left-read-empty\`, \`right-read-empty\`, and each insert result. These events explain whether the intended interleaving actually occurred.

During step three, compare complete defaults and IDs from both JSON bodies. Then query without a limit and count every record for the user. This final query prevents the route's own \`limit(1)\` from hiding duplicates.

During step four, run the test against the migration-backed PostgreSQL schema used by the application. The current definition has no unique \`userId\`, so document the observed failure. After a constraint change, retain the same case and update only the intentionally handled losing response.

The second example isolates database cardinality without the route. It will fail under the current schema if both inserts fulfill, which gives direct evidence for the missing invariant.

\`\`\`typescript
import { expect, it } from 'vitest';
import { db } from '@/db';
import { userPreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';

it('permits only one preference owner row per user', async () => {
  const user = await seedUser();
  const defaults = {
    userId: user.id,
    emailNotifications: true,
    weeklyDigest: true,
    newSkillAlerts: true,
    packAlerts: true,
  };

  const results = await Promise.allSettled([
    db.insert(userPreferences).values(defaults).returning(),
    db.insert(userPreferences).values(defaults).returning(),
  ]);
  const rows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id));

  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(rows).toHaveLength(1);
});
\`\`\`

Run this case in an isolated transaction or remove the fixture rows afterward. If parallel workers share one user ID, they create noise beyond the intended two inserts. Give each worker its own user.

Review [dashboard preferences](/dashboard/preferences) after database behavior passes. A user should never receive an arbitrary record simply because the route limits a duplicate set to one row.

## First request concurrency: Assertions and Diagnostics

First request concurrency requires five assertion groups. Check authentication and user lookup, verify both empty reads crossed the barrier, record insert outcomes, compare response contracts, and count final rows. Omitting any group leaves a plausible false pass.

The state assertion should include every default written by GET. Current code writes email notifications, weekly digest, new-skill alerts, and pack alerts as true. Both successful responses should describe the same persistent record if the desired contract is met.

The side-effect assertion counts insert attempts and committed rows separately. Two attempts may be acceptable after a uniqueness repair, but two committed records are not. If one attempt loses, record whether the handler reselects, returns a conflict, or falls into its generic catch.

Response checks should not assume success before policy is implemented. During gap discovery, retain actual statuses and bodies beside the desired assertion. Once behavior is fixed, lock the chosen contract so future changes cannot turn a handled race back into an unexplained 500.

Concurrent preference bootstrap tests need an overlap proof in the report. Print the barrier events and request labels, but not Clerk tokens or headers. Without those events, a green run might only reflect requests that executed one after another.

Keep final queries outside the route's \`limit(1)\`. Select all records by user ID and compare unique IDs. Also query after both requests settle, since an early read can miss an insert still in flight.

Use a deterministic timeout around the barrier and both responses. Report which party failed to arrive. A timeout message such as "right request never observed missing preferences" is more useful than a generic test expiration.

The [QASkills blog](/blog) groups concurrency, webhook, and persistence checks. Keep this job focused on preference bootstrap so its failure output stays small and actionable.

### Run the same race after each fix

Keep the old two-read gate when a unique rule or conflict path is added, because the hard order must stay part of the suite. Change only the expected losing reply once the team has picked its API rule. If the gate is removed after the first fix, a later edit can bring back a read and write gap with no test to catch it.

Run the race many times in one local stress job, but keep the gate in each round so each run still has known proof. Use a fresh user per round and stop on the first bad count, then save that small trace for review. A large pass count is not a fact about all loads, yet it can catch leaks in test setup and cleanup.

Pair that stress job with one short case in the main [pull request concurrency suite](/blog/testing-idempotency-key-concurrent-requests), since the fixed gate does not need chance to find the key order. The short case should check two replies, one row, one owner ID, and the chosen lost-write rule. This gives fast day-to-day proof while the longer run checks that the test gear itself stays sound.

Before a fix is merged, ask one reviewer to read the race trace from top to foot and mark the point where both calls first saw no row. That same review should mark the first write, the next write or fault, both reply IDs, and the final row set, which gives the team one plain chain of proof.

After the fix, run the same trace with the left call held once and the right call held once, so no pass rests on which call wins. Both runs must end with one row and the same safe rule for the call that lost, while the name of the winning call may change.

Keep a small text map of the allowed event orders next to the test, and use short terms such as read-none, write-ok, write-lost, and read-winner. The map makes a new event easy to spot in code review, and it keeps the test from passing a new order just because its final count still looks safe.

Clean each race in a final block that runs after both call tasks have been stopped or joined, not when the first test check fails. This rule keeps one timed-out call from writing a late row into the next case, which can make the next clean start fail for the wrong cause.

## What Regressions and Boundaries Prevent False Confidence?

The most common false signal is \`Promise.all\` without a barrier. Starting two promises together does not prove their database reads overlap. One request may insert before the other selects, exercising only the safe interleaving.

Another false signal is checking two 200 statuses. With the current schema, both inserts can succeed and both handlers can return 200 while two rows remain. Persistent cardinality is therefore more important than transport success.

Do not infer a unique constraint from the \`userId\` reference. The schema path shows a foreign key and non-null rule, while uniqueness is absent. Concurrent preference bootstrap tests should make this gap visible until a migration establishes the invariant.

Mocks can prove route branching but cannot prove PostgreSQL enforcement. Keep one fast adapter test for deterministic response logic and one migration-backed test for final records. The [PostgreSQL constraint source](https://www.postgresql.org/docs/current/ddl-constraints.html) supports this separation of rules.

The PATCH handler has its own update-then-insert window when no row exists. That is a nearby concern, but this brief owns two first-time GET requests. Add a separate matrix before making claims about mixed GET and PATCH races.

User creation races also belong elsewhere. Seed a valid application user before each case, then use the [webhook idempotency article](/blog/testing-clerk-user-created-webhook-idempotency) for duplicate user events. Otherwise, a 404 can mask the preference branch.

After any schema repair, rerun sequential GET, double-missing GET, ordered insert-then-read, and later reads. Confirm cascade deletion still works for the single preference row. Do not remove the failing-case history from test names, since it explains why the invariant exists.

## Frequently Asked Questions

### How do concurrent preference bootstrap tests force the race?

They pause both GET requests after each preference query returns no rows, verify that both reached the same boundary, and release their inserts together. The suite then records responses and selects every preference row for the user. This proves overlap instead of relying on scheduler luck.

### What causes a preference creation race condition here?

The handler reads for an existing row and performs a separate insert when none appears. Two requests can both complete that read before either write becomes visible. Without a unique ownership rule or conflict policy, both inserts may create different records for the same user.

### What should a concurrent api bootstrap test assert?

Assert authentication gates, barrier arrival, insert attempts, response statuses, response defaults, returned IDs, and final row count. Include a sequential control and an ordered interleaving. A single status assertion cannot detect two successful responses that leave duplicate persistent state behind.

### Why are duplicate user preference rows harmful to later reads?

The GET query filters by user ID and applies a limit of one without ordering. When duplicates exist, the route can return one record while another contradictory record remains hidden. Updates may affect both matching rows, making later state harder to reason about and test.

### What does drizzle insert race testing add beyond mocks?

It executes competing inserts against the migration-backed PostgreSQL schema and observes actual constraint behavior. Mocks can coordinate route timing, but they cannot prove whether the database accepts duplicate ownership. Keep both layers because they answer different questions about the same first-read contract.

### Which first request concurrency result should CI retain?

Retain request labels, barrier events, actual statuses, returned record IDs, insert outcomes, and the final count for the test user. Exclude authentication secrets and unrelated rows. This compact record shows whether overlap occurred and whether the database or route mishandled the losing request.

## Conclusion

Concurrent preference bootstrap tests turn a narrow timing window into repeatable evidence. They prove both reads saw no row, compare each response, and inspect every final record. The current schema lacks a unique user ownership rule, so a failing single-row assertion accurately identifies unfinished concurrency protection.

[Open dashboard preferences](/dashboard/preferences) and add a barrier-controlled bootstrap race to the integration suite. Continue through the [QA skills catalog](/skills) after the API and database agree on one record.`,
};
