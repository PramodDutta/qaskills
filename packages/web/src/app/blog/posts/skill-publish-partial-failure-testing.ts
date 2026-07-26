import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'skill publish partial failure testing',
  description:
    'Use skill publish partial failure testing to verify consistency when skill creation succeeds but counters, email, or later side effects fail.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'skill publish partial failure testing',
  keywords: [
    'skill publish partial failure testing',
    'partial database write testing',
    'skill counter consistency test',
    'Drizzle transaction failure test',
    'noncritical side effect failure',
    'publish API consistency recovery',
  ],
  relatedSlugs: [
    'database-testing-automation-guide',
    'api-testing-complete-guide',
    'testing-batch-email-partial-failures-promise-allsettled',
    'testing-typesense-multiselect-facet-filter-queries',
  ],
  sources: [
    'https://orm.drizzle.team/docs/transactions',
    'https://www.postgresql.org/docs/current/tutorial-transactions.html',
    'https://www.postgresql.org/docs/current/transaction-iso.html',
  ],
  repoEvidence: [
    'packages/web/src/app/api/skills/route.ts',
    'packages/web/src/db/schema/skills.ts',
    'packages/web/src/db/schema/users.ts',
    'packages/web/src/lib/email/send.ts',
  ],
  content: `Skill publish partial failure testing should inject a counter update error after the skill insert, then inspect both records independently. The correct current result is a committed skill, an unchanged author counter, a logged error, and a 201 response rather than an invented rollback.

This is a consistency test, not merely a status assertion. Start from the [publishing workflow](/how-to-publish), record every observable effect, and decide which state is authoritative before choosing recovery behavior.

## What Must Skill Publish Partial Failure Testing Prove?

Skill publish partial failure testing must prove where the request crosses its commit boundary and what remains optional afterward. The route inserts and returns the skill before it attempts several effects with different error policies.

The visible sequence in packages/web/src/app/api/skills/route.ts is authentication, validation, slug lookup, skill insertion, counter update, optional email dispatch, and response creation. Those actions do not share one explicit transaction in the current code.

The skill row is the primary published artifact. Its schema in packages/web/src/db/schema/skills.ts gives the slug a unique constraint and stores the author ID, author name, arrays, quality score, and timestamps.

The author statistic is a stored derivative. packages/web/src/db/schema/users.ts defines skillsPublished as a non-null integer with a zero default, while the route increments that value in a nested try block.

When that update throws, the catch logs the fault and execution continues. A good test therefore expects the inserted row to survive and the stored counter to remain at its earlier value.

Email work begins only when RESEND_API_KEY exists. The subscriber query runs through a promise chain, sends batches with Promise.allSettled, and catches a chain failure without changing the already returned response.

The send helper in packages/web/src/lib/email/send.ts also converts provider failures into result objects. A rejected subscriber query and an individual failed send therefore need different spies and different assertions.

Use the [QA skills catalog](/skills) only as a final smoke check. The catalog can show a new skill, but it cannot prove the counter, logs, email attempts, or exact response contract.

Skill publish partial failure testing should record five facts for every case: response status, response slug, persisted skill rows, stored author counter, and emitted diagnostics. That evidence distinguishes a documented partial success from an accidental mixed state.

### A plain oracle for each write

Start with the skill row, since it is the main fact after POST returns. Read it by both ID and slug, then check that each query finds the same row.

Next read the user row with a fresh query from the test store. Check the old count before the call and the same count after the forced fault.

Keep the route reply as a third fact, not as proof of either row. Match its ID and slug to the saved skill, then check the 201 status.

A log spy should show that the count write failed once. It should not show a top-level POST fault, since the outer catch must not run in this case.

Email work starts after the count block and only when its key is set. Test both key states so a skipped mail path cannot hide a bad row state.

Use call order only for facts the source code makes clear. The row insert comes before the count write, while the detached mail chain may end after the reply.

Add one clean run with no fault and the same base rows. That run should add one skill, add one to the count, and make no error log.

Keep each test name short and state the one call that must fail. A name such as count write after row save lets a new reader see the full path.

This small oracle keeps each check close to one fact and one owner. It also makes a failed case easy to read in the [API testing guide](/blog/api-testing-complete-guide) workflow.

## How Do You Run Partial Database Write Testing?

Partial database write testing injects one failure after a confirmed insert and observes storage through a separate query path. It must not reuse the mocked return object as proof that PostgreSQL committed the row.

Create an authenticated author whose skillsPublished value and owned-skill count are both known. Use a unique slug, because a stale fixture can turn the intended counter case into a 409 conflict before insertion.

Mock the ordered database calls narrowly. The slug select should report no match, the insert should return one complete skill, and only the user update should reject with a recognizable error.

Capture console.error during the request. Assert one message identifies the counter failure, but avoid matching a complete stack because runtimes and drivers can format stacks differently.

The first example models the route boundary. It checks the 201 contract and then uses an independent repository query to prove which state persisted.

\`\`\`typescript
import { expect, it, vi } from 'vitest';
import { POST } from '@/app/api/skills/route';
import { db } from '@/db';
import { skills, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

it('keeps the inserted skill when the author counter update fails', async () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const payload = {
    name: 'Counter Fault Probe',
    slug: 'counter-fault-probe',
    description: 'A valid skill used to observe a post-insert counter failure.',
    testingTypes: ['api'],
    languages: ['typescript'],
  };

  failNextUserCounterUpdate(new Error('counter update unavailable'));
  const response = await POST(jsonRequest(payload));
  const body = await response.json();

  expect(response.status).toBe(201);
  expect(body.skill.slug).toBe(payload.slug);

  const [saved] = await db.select().from(skills).where(eq(skills.slug, payload.slug));
  const [author] = await db.select().from(users).where(eq(users.id, saved.authorId!));

  expect(saved.slug).toBe(payload.slug);
  expect(author.skillsPublished).toBe(4);
  expect(errorSpy).toHaveBeenCalledWith(
    'Failed to update skillsPublished count:',
    expect.any(Error),
  );
});
\`\`\`

The helper names are test-harness placeholders, not claims that they exist in production. Implement them in the route test adapter so they affect only the intended update call and restore all spies afterward.

Run a control where insertion itself rejects. That error reaches the outer catch, produces status 500, creates no skill row, and never reaches the counter update or subscriber query.

Run another control where both writes succeed. It should create one row, increment once, and return the same 201 shape, proving the harness does not force every case into partial success.

The [database testing guide](/blog/database-testing-automation-guide) explains fixture isolation and independent reads. Apply those practices here so partial database write testing reports committed facts rather than mock expectations.

Skill publish partial failure testing becomes useful when the test names the exact failed operation. A broad rejection queue can shift after a route refactor and falsely exercise slug lookup, insertion, or email selection instead.

## What Is a Skill Counter Consistency Test?

A skill counter consistency test compares the stored skillsPublished value with a fresh count of skills owned by the same author. The two values agree after ordinary success but can diverge under the current caught-update policy.

Use the skill table as the authoritative source for publication count because each committed skill carries authorId. The counter is convenient for display, yet it is not protected by a constraint that derives it from owned rows.

Measure three starting states. Use a fully consistent author, an author with a deliberately stale low counter, and an author whose counter already exceeds the owned-row count.

For ordinary success, both the owned count and stored counter should increase by one. For the injected counter failure, only the owned count should increase, leaving a difference of one from the consistent baseline.

For client retry after 201, the slug uniqueness check should return 409 before another insert. The owned count and counter must remain unchanged during that retry, even though the earlier mismatch still requires repair.

Do not assert only that skillsPublished stayed at a literal number. Also query the count by authorId, because the central defect is disagreement between a derivative and its source.

The second example expresses that comparison without copying route output. It uses the field definitions from packages/web/src/db/schema/users.ts and the ownership link from the skills schema.

\`\`\`typescript
import { count, eq } from 'drizzle-orm';
import { expect } from 'vitest';
import { db } from '@/db';
import { skills, users } from '@/db/schema';

async function expectPublishedCountState(
  authorId: string,
  expectedStored: number,
  expectedOwned: number,
) {
  const [user] = await db
    .select({ stored: users.skillsPublished })
    .from(users)
    .where(eq(users.id, authorId));
  const [owned] = await db
    .select({ value: count(skills.id) })
    .from(skills)
    .where(eq(skills.authorId, authorId));

  expect(user.stored).toBe(expectedStored);
  expect(Number(owned.value)).toBe(expectedOwned);
  expect(expectedOwned - expectedStored).toBe(1);
}
\`\`\`

Keep the difference assertion specific to the injected case. A repair test should finish with zero difference, while a control author should never acquire a mismatch.

Use the [API testing guide](/blog/api-testing-complete-guide) to keep transport checks separate from database checks. A 201 body can be correct while a skill counter consistency test still detects stale derived state.

Skill publish partial failure testing should include concurrent authors as a boundary. One author's injected failure must not alter another author's counter or owned-row count.

## Drizzle Transaction Failure Test Options

A Drizzle transaction failure test must match the consistency design that the product actually chooses. The current route is nontransactional, so a test that expects both writes to roll back would document behavior that does not exist.

The [Drizzle transaction guide](https://orm.drizzle.team/docs/transactions) describes a callback whose statements commit or roll back as one logical unit. It also documents explicit rollback and transaction configuration, which are relevant only if the route adopts that API.

PostgreSQL explains that each standalone statement receives its own implicit transaction when no transaction block is opened. The [transaction tutorial](https://www.postgresql.org/docs/current/tutorial-transactions.html) therefore supports the observed risk: a successful insert is not undone by a later standalone update failure.

There are two defensible contracts. The current contract treats skill creation as critical and the counter as repairable, while an atomic contract would treat insertion plus counter update as one unit.

For the current contract, inject the update fault and expect a committed skill plus 201. For an atomic contract, inject the same fault inside the transaction and expect rollback, no alert scheduling, and a failure response.

Isolation level is a separate concern from atomic grouping. The [PostgreSQL isolation reference](https://www.postgresql.org/docs/current/transaction-iso.html) explains visibility and concurrency rules, but a stricter isolation level does not group statements that never entered one transaction.

If the implementation changes to db.transaction, update the route test and recovery policy together. Do not retain a reconciliation job for a mismatch that atomic rollback can no longer create through this path.

Also test transaction callback retries only if the chosen driver or application adds them. The present route shows no retry loop, so skill publish partial failure testing should not claim automatic replay.

Use the [publishing guide](/how-to-publish) when documenting the user-facing result. A publisher needs to know whether a returned error means no skill exists or whether retrying could collide with an already committed slug.

## How Should a Noncritical Side Effect Failure Behave?

A noncritical side effect failure should preserve the successful primary operation, emit safe diagnostic evidence, and avoid duplicate work. This route labels the counter update noncritical and makes alert dispatch non-blocking after insertion.

Counter failure is awaited but caught before response creation. Its test should assert the log is produced before the handler resolves, because that sequencing differs from the detached email promise chain.

Subscriber selection starts without an await on the full chain. The route can return 201 before the query, batch loop, or send helper completes, so use deferred promises rather than arbitrary sleeps.

Individual email work runs through Promise.allSettled. Since sendNewSkillAlert already returns failure objects for provider errors, a provider problem may appear as a fulfilled result whose success property is false.

Test both forms. Make one harness send helper return a failure object, and make another truly reject, then verify later recipients and later batches follow the current all-settled behavior.

The [batch email failure article](/blog/testing-batch-email-partial-failures-promise-allsettled) covers those result shapes in detail. This article keeps the assertion tied to whether publication remains successful.

Do not require RESEND_API_KEY behavior in every test. One case should omit it and prove the subscriber query never starts, while another should set a harmless test value and control every downstream call.

Logs must avoid email addresses, tokens, or complete payloads. Assert the operation name, fault class, and correlation marker that the test owns, then leave private subscriber data out of snapshots.

Skill publish partial failure testing should never call a caught effect critical merely because a test double rejected. The expected status follows the route's documented boundary unless the product deliberately changes that boundary.

## Publish API Consistency Recovery

Publish API consistency recovery needs a repair path that is repeatable and based on authoritative rows. Replaying the whole POST is unsafe because the first request already created the unique slug.

The simplest reconciliation computes each author's owned-skill count and updates skillsPublished to that value. Test the repair twice and expect the second run to make no additional logical change.

Scope the repair by author ID or a bounded batch. A global unbounded update can turn one local publication fault into a slow operational action with poor diagnostics.

Record the mismatch before repair, the selected author, the derived count, the prior counter, and the final counter. Avoid inventing a recovery endpoint when no such route appears in repository evidence.

If recovery uses a job, test duplicate delivery. Two job executions should converge on the same count because assignment from a fresh aggregate is safer than incrementing again.

If recovery runs during a later publish, test concurrent insertion around the count query. The chosen transaction and isolation rules must define whether the repair includes the concurrent skill.

The [database testing guide](/blog/database-testing-automation-guide) provides broader reconciliation patterns. Keep this repair focused on one derivative and one ownership relation.

The unique slug is useful for transport retry safety, but it does not fix the stale counter. A 409 response prevents duplicate rows while leaving the earlier partial state intact.

Skill publish partial failure testing should finish by proving recovery, not only detecting mismatch. The final assertions should show one skill row, one unchanged slug, a corrected counter, and no repeated email requirement.

### Race checks that keep repair safe

A repair can race with a new publish, so add gates around both writes. The test should control when the new row commits and when the recount reads it.

Start one repair while the old count is low, then pause its read. Commit one more skill before the repair can set the new count.

The end state must follow the rule picked by the team. If the repair reads after that commit, its saved count should include the new row.

If the team uses a lock or one transaction, test that code as it is built. Do not add a lock to the test when the repair code has none.

A client retry is a much simpler race and should stop at the slug check. Two near-same calls may both pass an early read, so keep the unique key as the final guard.

Run two users at once with one forced fault. The good user's row and count must match, while the fault user owns the one known gap.

Keep each gate local to one test and free it in a finally block. A stuck gate can hold the next case and make a clear write fault look like a slow job.

## Failure Point, Persisted State, and Response Matrix

This matrix separates request-critical work from caught and detached effects. It reflects the current route rather than a proposed transaction design.

| Failure point | Skill row | Author counter | Email work | HTTP response | Recovery assertion |
|---|---|---|---|---|---|
| Skill insert fails | Absent | Unchanged | Not started | 500 | Retry may create one row |
| Counter update fails | Committed | Unchanged | May start | 201 | Recount repairs one mismatch |
| Subscriber query fails | Committed | Incremented | No sends | 201 | Publication needs no replay |
| Individual email fails | Committed | Incremented | Other sends settle | 201 | Failed recipient is diagnosed |
| All effects succeed | Committed | Incremented | Batches settle | 201 | Counts agree |
| Client retries after 201 | One committed row | Prior result retained | No new publish work | 409 | No duplicate slug exists |

The counter-failure row is the main partial state. Verify it with a database connection that does not reuse the route's mocked response object.

The subscriber-query row should settle its deferred chain before log assertions. The HTTP response can be captured earlier, but the test must await the controlled query rejection to avoid leaking work into another case.

The individual-email row needs recipient-level results. Promise.allSettled prevents one rejection from aborting its current batch, while the outer loop can still move to later batches after all current outcomes settle.

The retry row begins with another slug lookup. Assert no second insert, update, or alert selection occurs after the conflict is found.

Use the [Typesense filter article](/blog/testing-typesense-multiselect-facet-filter-queries) only as a neighboring search concern. This matrix does not claim that publication indexes a search document.

Skill publish partial failure testing should include exact failure labels in CI output. Report insert, counter, subscriber query, or send, because a generic publish failure hides the recovery decision.

## How Do You Run the Failure Injection Procedure?

Run the procedure with one injected fault per case and one clean control. Each case must start from fresh author, slug, mock, and environment state.

1. Create an authenticated author fixture with a known stored counter and a verified owned-skill count.
2. Configure a unique valid publish payload, then inject failure only into the post-insert author update.
3. Call POST, capture the response and error log, and let any controlled detached promise reach settlement.
4. Query the skill and user tables independently, then compare the committed row count with skillsPublished.
5. Run the chosen reconciliation or atomic recovery path and assert its documented final state.
6. Retry the original payload and prove the unique slug prevents a second row or counter change.

Before step one, clear prior rows by fixture identifiers rather than broad table deletion. Shared CI databases can otherwise lose unrelated records and produce misleading ownership counts.

At step two, verify the mock consumed exactly one failure. A leftover rejection can affect cleanup or the next test and make the suite order-dependent.

At step three, inspect both status and response payload. The response should expose the created skill for the current nontransactional contract, while logs should identify only the counter operation.

At step four, read skills by slug and by authorId. These two queries catch a wrong owner link that a slug-only assertion would miss.

At step five, choose one recovery expectation before writing assertions. Either reconcile the derivative after partial success or roll back both database writes under a new atomic design.

At step six, assert the 409 branch stops later calls. This ensures network retry does not become another counter increment or another alert wave.

The [API testing category](/categories/api-testing) can supply related transport and fault-injection skills. Keep this procedure in a transaction-capable integration environment when testing actual commit behavior.

Finish with a compact diagnostic record containing request marker, author ID, slug, response status, owned count, stored count, and failed operation. That record is enough to debug the contract without exposing full descriptions or subscriber details.

Skill publish partial failure testing is strongest when CI runs both the current contract and a clean baseline. The fault case proves containment, while the baseline proves the failure adapter did not disable normal updates.

### Evidence that makes a failed run easy to trust

Save one short line for the request and one line for the final store state. The first names the slug and status, while the second names both counts.

Use one safe fault code for each test case. A code such as count-write-fault is clear, while a full driver stack can be noisy and may hold private data.

Print the count from before the call, the count after the call, and the row total. Those three values show the gap without a long dump of user fields.

For mail work, save only batch size, settled kind, and call count. Do not print an address, token, subject body, or full subscriber row.

Keep the response time and mail-settle time as two fields when timing matters. This shows that the reply can end while the detached chain still has work.

The test should fail on the first wrong core fact, then add the rest as notes. A missing row is more useful as the main cause than a later count mismatch.

After repair, save one final row total and one final user count. Both should match, and a second repair run should leave those same values in place.

Once the case passes, retain only the small proof record as a CI artifact. The full test store can then be cleaned by the IDs that the case owns.

## Frequently Asked Questions

### Should the insert and author counter always share a transaction?

They should share one transaction only if product policy requires both values to succeed or fail together. The current route deliberately catches the counter error, so its contract favors a published skill plus later repair. Tests must document the chosen policy instead of assuming atomic behavior.

### Why does a counter failure still return 201?

The skill insert has already completed, and the counter update sits inside its own caught try block. After logging that error, execution continues through optional alert scheduling and response creation. Returning 201 therefore matches the current primary-operation boundary, although the derivative needs reconciliation.

### Is retrying POST a valid recovery action?

No, not after the client received 201 or lost that response. The committed slug is unique, so the retry should reach a 409 conflict rather than repair the counter. Use an idempotent recount or an explicit transaction policy instead of replaying publication.

### How should duplicate slugs be asserted?

Publish once, then submit the same slug again with the same authenticated author. Assert status 409, one persisted skill row, no additional counter update, and no new subscriber selection. This proves the conflict branch stops every later side effect, not merely insertion.

### Do failed alert emails invalidate publication?

They do not invalidate publication under the visible route contract. Alert work begins after the insert and counter attempt, uses settled batch outcomes, and runs through a detached promise chain. Tests should record failed recipients safely while preserving the already successful skill response.

### What proves that reconciliation is safe?

Run reconciliation against a known mismatch, verify the counter equals a fresh owned-skill count, then run it again. The second execution should preserve the same value and create no skill or email work. Add concurrent-author fixtures to prove repair scope never crosses ownership boundaries.

## Conclusion

Skill publish partial failure testing must state one clear consistency contract: the current route commits the skill, tolerates a counter fault, and returns 201. Tests should prove that exact state, prevent duplicate retry work, and verify a repeatable counter repair.

Open the [publishing guide](/how-to-publish), browse [database and API QA skills](/skills), and add controlled post-insert failure injection before the next release. Run the clean control beside the fault case on every release.`,
};
