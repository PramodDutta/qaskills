import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'install counter concurrency testing',
  description:
    'Use install counter concurrency testing to prove simultaneous add events increment installCount and weeklyInstalls without lost updates under load.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'install counter concurrency testing',
  keywords: [
    'install counter concurrency testing',
    'Postgres atomic increment test',
    'lost update install counter',
    'Drizzle concurrent update testing',
    'weekly installs race condition',
    'telemetry counter load test',
  ],
  relatedSlugs: [
    'qaskills-cli-disable-telemetry-do-not-track',
    'api-testing-complete-guide',
    'database-testing-automation-guide',
    'testing-leaderboard-cache-filter-isolation-ranking-consistency',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/mvcc.html',
    'https://www.postgresql.org/docs/current/transaction-iso.html',
    'https://orm.drizzle.team/docs/update',
  ],
  repoEvidence: [
    'packages/web/src/app/api/telemetry/install/route.ts',
    'packages/web/src/db/schema/skills.ts',
    'packages/web/src/db/schema/relations.ts',
  ],
  content: `Install counter concurrency testing proves that each valid add event creates one install row and raises both counters once. Start all requests from one barrier, await each response, then compare row and counter deltas with the accepted event count. Any smaller delta exposes lost work or an incomplete request path.

This contract is specific to the telemetry route in \`packages/web/src/app/api/telemetry/install/route.ts\`. The route inserts an event before issuing one SQL update for add events. A useful test therefore observes HTTP results, inserted rows, and both stored counters instead of trusting one response body.

## What Must Install Counter Concurrency Testing Prove?

Install counter concurrency testing must connect each resolved add request with three durable effects. The install table gains one row, \`installCount\` gains one, and \`weeklyInstalls\` gains one. The expected delta is the number of requests that reached the known-skill add branch successfully.

The invariant needs a precise starting point. Seed one skill with unequal counter values, such as 17 total installs and 4 weekly installs. Unequal values catch assertions that accidentally read one column twice or compare both outcomes with one baseline.

The schema in \`packages/web/src/db/schema/skills.ts\` defines both fields as non-null integer columns with zero defaults. Those defaults help normal creation paths, but an isolated race test should set clear values. A clear baseline makes each planned final value visible in the test report.

The event relationship also matters. The \`installs\` table in \`packages/web/src/db/schema/relations.ts\` stores the resolved skill identifier, install type, agent type, country, and timestamp. Count only rows for the current fixture, because parallel suites may insert unrelated telemetry.

Remove events belong in a control case. The route records those events but does not increment either counter. A mixed burst can prove that the check uses valid add rows, not each event row.

Unknown skills need another control. The route returns a successful JSON result without inserting data when resolution fails. Exclude those requests from the increment expectation, and assert their absence from the fixture rows directly.

The [API testing guide](/blog/api-testing-complete-guide) provides broader response and fixture patterns. This test remains narrower because its main risk sits between simultaneous accepted requests and shared database state.

## How Do You Build a Postgres Atomic Increment Test?

A Postgres atomic increment test sends several requests that target one row at nearly the same time. Each request must execute the live update expression, not a mocked counter service. The final delta then shows whether all commits kept each add.

The route uses \`sql\` expressions that add one to each existing column. Drizzle documents this style through its [update API](https://orm.drizzle.team/docs/update), while PostgreSQL explains concurrent row visibility through [multiversion concurrency control](https://www.postgresql.org/docs/current/mvcc.html). The test should verify repository behavior without claiming that every update pattern is safe.

A start gate cuts the risk that the test client runs calls one by one. Create all request promises first, hold them behind one unresolved promise, and release the gate once each worker is ready. This method cannot force the same store step time, but it creates repeatable load pressure.

\`\`\`typescript
import { expect, test } from 'vitest';

test('keeps every concurrent add increment', async () => {
  const concurrency = 20;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const requests = Array.from({ length: concurrency }, async (_, index) => {
    await gate;
    return POST(
      makeInstallRequest({
        skillSlug: fixture.slug,
        agentType: \`worker-\${index}\`,
        installType: 'add',
      }),
    );
  });

  release();
  const responses = await Promise.all(requests);
  expect(responses.every((response) => response.status === 200)).toBe(true);
});
\`\`\`

This example exercises the exported handler represented by \`packages/web/src/app/api/telemetry/install/route.ts\`. A live HTTP test can use the same gate around \`fetch\` calls. Choose one level per suite so request construction does not obscure database assertions.

Do not infer acceptance from status alone. Telemetry deliberately hides many failures behind a success response, so a request can return 200 without an insert. The row delta identifies requests that actually reached persistent event storage.

After the burst, read the skill and event rows through a separate database connection when possible. This prevents an uncommitted test transaction from hiding behavior observed by route connections. It also resembles the state another request would see.

Repeat the case with one, ten, and fifty workers. One request validates the fixture, ten catches obvious read-modify-write loss, and fifty adds contention. These are test shapes, not universal capacity targets.

## What Exposes a Lost Update Install Counter?

A lost update install counter appears when accepted add rows outnumber one or both counter deltas. The clearest oracle compares all three values in one failure message. For example, twenty new add rows with a counter delta of seventeen means three increments disappeared.

Create a deliberately unsafe control only inside test support. Read a counter into application memory, pause at a gate, then write the old value plus one from several workers. That fixture demonstrates whether the harness can detect loss instead of merely producing passing green output.

The unsafe control should never replace the production handler. Its purpose is to calibrate timing and assertions in a disposable table or rolled-back fixture. If the control never fails under overlap, the test may still be serializing requests before the database.

Count row effects before interpreting counters. A failed insert prevents the later update in the current route because both operations occur in one try block, yet telemetry still returns success. When rows are missing, report request completion and insert failure evidence before labeling the result a counter race.

Install counter concurrency testing also checks divergence between the two columns. If \`installCount\` rises by twenty while \`weeklyInstalls\` rises by nineteen, the combined update contract failed. One equality assertion per column makes that mismatch plain.

Avoid checking only the final absolute number. A reset job, seeded fixture collision, or prior test can change totals independently. Deltas scoped around a fresh skill provide a stronger and more portable signal.

The [database automation guide](/blog/database-testing-automation-guide) covers isolation and cleanup patterns for shared stores. Use a unique skill identifier here, and remove related install rows through the existing cascade after each run.

### Read a failed burst in the right order

Install counter concurrency testing is much easier to judge when one log starts with three plain gaps. Show the add row rise, full count rise, and week count rise on one line. Use the same start read and end read for both count fields in that run. If one gap is small, mark that field before the test clears its rows.

Next, check how many calls reached a known skill and used the add type in the saved body. Keep calls for unknown skills and remove rows in a split part of the report. Do not let a green status stand in for a row that was not stored. The row set tells you which calls can take part in the count rule.

If the row rise is small, start with the insert path and the skill lookup facts. If rows are right but both counts are small, focus on the shared update path. If just one count is small, check the two field expressions and the final read. This order keeps one fault from being blamed on a race it did not cause.

Run the same case once with one call and once with calls made one by one. Those two runs show that the seed, lookup, insert, and count checks work with no clash. Then start all calls from the gate and keep the rest of the test the same. A change seen only in that last run is much stronger proof of a race.

## Drizzle Concurrent Update Testing

Drizzle concurrent update testing should preserve the same query builder call used by production. Replacing the update with a JavaScript mock verifies request branching but says nothing about PostgreSQL row contention. Keep one small route-level test connected to a real test database.

The check query can select both counters and count only fixture events. Read them after each response has settled, then assert all planned deltas together. A grouped check keeps a single race from causing several stray failures.

\`\`\`typescript
const before = await db.query.skills.findFirst({
  where: eq(skills.id, fixture.id),
  columns: { installCount: true, weeklyInstalls: true },
});

const addRows = await db
  .select({ total: count() })
  .from(installs)
  .where(and(eq(installs.skillId, fixture.id), eq(installs.installType, 'add')));

const after = await db.query.skills.findFirst({
  where: eq(skills.id, fixture.id),
  columns: { installCount: true, weeklyInstalls: true },
});

expect({
  rows: Number(addRows[0].total),
  installDelta: after!.installCount - before!.installCount,
  weeklyDelta: after!.weeklyInstalls - before!.weeklyInstalls,
}).toEqual({
  rows: concurrency,
  installDelta: concurrency,
  weeklyDelta: concurrency,
});
\`\`\`

The column definitions come from \`packages/web/src/db/schema/skills.ts\`, while event ownership comes from \`packages/web/src/db/schema/relations.ts\`. Use those exported schema objects rather than hard-coded table names. That choice lets refactors fail at compile time before producing misleading SQL.

Connection pool size changes overlap but should not change correctness. Record the pool configuration with results, because two available connections create different pressure from twenty. Never treat a small pool as proof that high-contention behavior was exercised.

Run each concurrency level several times with a new skill. Race defects can depend on scheduler order, network delay, and lock timing. More runs help find faults, though they cannot prove all race paths are safe.

Keep this correctness suite separate from a long benchmark. Ten focused rounds can run during integration testing, while sustained traffic belongs in a controlled performance environment. Mixing both goals creates slow failures with unclear causes.

The [leaderboard consistency article](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) explains why counters later affect ranking and caches. This route test should stop at stored state, leaving leaderboard refresh behavior to that separate contract.

## How Do You Reproduce a Weekly Installs Race Condition?

A weekly installs race condition requires both counters to start at known, different values. Release add requests together, then require the same positive delta for each column. Different final deltas reveal a partial change even when the larger lifetime total looks plausible.

Do not run a weekly reset during the burst. If production reset logic can overlap telemetry, write a separate test that coordinates reset and add operations under an explicit product rule. The basic increment test needs a stable baseline to isolate one behavior.

Choose values far from zero when checking reset assumptions. A starting pair such as 41 and 7 makes swapped fields or accidental default values obvious. Assert the seeded values before releasing requests so fixture setup cannot create a false race report.

Install counter concurrency testing should also include a sequential reference run. Send the same number of requests one after another and record row plus counter deltas. If sequential traffic fails, fix routing, fixtures, or database access before analyzing concurrent behavior.

Compare the parallel result with the reference by invariant, not by elapsed time. Concurrent requests may be faster or slower depending on locks and pool limits. Correctness means equal accepted effects, while performance is a different measurement.

PostgreSQL describes transaction visibility and isolation behavior in its [transaction isolation documentation](https://www.postgresql.org/docs/current/transaction-iso.html). Record the actual database isolation setting used by the test. Do not make broad claims from a local default that production might override.

After verification, delete the skill and rely on the declared cascade for its install rows. Then query by the fixture identifier and require zero rows. Complete cleanup keeps the next repetition independent and catches a broken relation assumption.

## Telemetry Counter Load Test Scope

A telemetry counter load test first splits the right count check from speed. The count run asks whether each stored add has both matching rises at a fair load. A later speed test asks how wait time and faults change as sent traffic grows.

Start reports with completed, rejected, and timed-out request counts. A counter delta cannot equal requests that never reached the route, and telemetry may mask internal exceptions. Pair client observations with database row totals before calculating any rate.

Use fixed stages rather than an unbounded flood. A useful local sequence might exercise one, ten, and fifty simultaneous calls with fresh fixtures. Those levels expose behavior changes without pretending to establish a production service limit.

Collect response duration only after correctness passes. Report a distribution or raw sample set, not one average, because lock waits can create a long tail. Keep timing assertions out of shared CI unless the environment offers stable resources.

The [telemetry privacy article](/blog/qaskills-cli-disable-telemetry-do-not-track) explains when clients may suppress events. This server-side load fixture should send explicit add payloads and should not depend on a user's command-line privacy setting.

Install counter concurrency testing must not fabricate replay guarantees. The current route does not show an idempotency key or a unique event constraint. Sending the same valid payload twice should therefore be modeled as two events unless the product contract changes.

If replay protection is added later, update the oracle to count accepted unique events. Keep duplicate delivery cases in their own section so concurrency loss and intentional deduplication remain distinguishable.

Use the [API testing category](/categories/api-testing) to find request-generation patterns that match the chosen test level. The database remains the final oracle for this article because the response body contains only a success signal.

### Keep proof clear from one run to the next

Install counter concurrency testing needs a fresh skill key for each run, even when the worker count stays the same. A new key makes the start values clear and keeps old rows out of the sum. Read the seed back before the gate is opened and fail at once if it is wrong. This small check saves far more time than a race report built on bad test data.

Use short worker names that map one call to one stored row without any guess. Save each body before the call starts, then save its status when the call ends. When a row is lost, the worker name can show which call has no stored fact. Do not add random fields that make the same test hard to run twice.

Keep time facts in the report, but do not use them as the pass rule for counts. A slow call can still write the right row and both count changes. A fast call can get a green status while the route masks a fault. The stored gaps are the pass rule, while time helps show how much load was in flight.

The [API test guide](/blog/api-testing-complete-guide) can help shape the call log, and the [skills catalog](/skills) can supply a shared load tool. Keep the final row and count reads close to this case. A broad tool report should not hide the three values that decide whether the run passed. Small proof also makes two runs much easier to compare.

## Concurrency Level, Rows, and Counter Delta Matrix

The matrix below defines facts to save rather than made-up results. Fill each saved cell from one clean run and attach the fixture ID. A lost update exists only when accepted add rows exceed a counter delta under the stated rule.

| Scenario | Successful adds | Install row delta | installCount delta | weeklyInstalls delta | Lost updates |
|---|---:|---:|---:|---:|---|
| One sequential request | Record | Record | Record | Record | Compare deltas |
| Ten sequential requests | Record | Record | Record | Record | Compare deltas |
| Ten concurrent requests | Record | Record | Record | Record | Compare deltas |
| Fifty concurrent requests | Record | Record | Record | Record | Compare deltas |
| Mixed add and remove | Count adds only | Record all types | Record | Record | Compare with adds |

The sequential rows validate basic event resolution and fixture setup. Their three add-related deltas should agree before the parallel rows carry meaning. A failure there is functional, not evidence of contention.

The mixed row requires two counts. Record all inserted events for storage coverage, then count add rows for both counter expectations. Remove rows should not increase either field under the current route.

Add a column for failed or masked requests in the actual test report. It can sit beside this compact article table without changing the core invariant. A hidden route exception may otherwise look exactly like database increment loss.

Keep one result file per database configuration. Pool size, isolation setting, PostgreSQL version, and worker count are relevant context. These facts make a later regression comparable without claiming identical hardware performance.

The public [leaderboard](/leaderboard) displays values derived from these fields, but it is not a precise test oracle. Read the database row directly for counter correctness, then test cached ranking behavior through its own endpoint.

## How Do You Run the Concurrent Increment Procedure?

Run the procedure against a disposable database or a uniquely scoped fixture. Each step preserves evidence needed to distinguish request failure, insert failure, and update loss. Stop immediately when the sequential control fails.

1. Seed one skill with known, unequal values in both counter columns.
2. Prepare a fixed number of valid add events that resolve to that skill.
3. Hold every POST operation behind one shared synchronization promise.
4. Release the barrier, await all responses, and record client failures.
5. Query scoped install rows and both counters after each call settles.
6. Assert each counter delta equals the successful add row delta.
7. Delete the fixture, confirm cleanup, and repeat with a fresh identifier.

### Choose the next check from the first gap

Start with the first value that does not match, since later gaps may just be its effect. A missing row points back to skill lookup, body shape, insert work, or a caught fault. Good rows with bad counts point to the update and final read. Good counts with bad rows point to the event check or test scope.

When all three gaps are right, run the same worker count with a new skill key. Two clean runs do not prove all race paths, but they do show that one pass was not tied to old data. Raise the worker count in one clear step and save that new level in the report. Change no pool or store setting in the same step.

If a run fails only at a high load, cut the worker count in half and try again. Keep the smallest load that still fails, then run it a few more times with new keys. This short path gives the code owner a small case to trace. A huge flood with no row map gives far less help.

Install counter concurrency testing should end with a check that no scoped row remains after cleanup. A clean end proves that the next run will start from its own facts. Keep the failed report even when cleanup works, since its start and end reads still hold the key proof. Use the [leaderboard check](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) later for rank effects, not as a count oracle here.

### Save one compact race report

- The test name, code commit, run time, Node version, PostgreSQL version, and host type used for the full call burst
- The new skill key and slug, both count start values, and the read-back check made before any worker leaves the gate
- The worker count, pool size, store isolation level, route test level, and number of repeat runs planned for this stage
- Each request body with its short worker name, skill form, add type, and all fields needed for the route to resolve it
- The gate ready count and one release mark, proving calls were made first and were not built one by one after release
- Each client result with status, short body, start time, end time, and any thrown fault kept outside the green status count
- The count of all new event rows and the count of add rows, both scoped to the one skill key for this run
- The full count value before and after the burst, with its gap shown next to the saved add row gap
- The week count value before and after the burst, with its gap shown next to the same saved add row gap
- The unknown-skill and remove controls shown in their own rows so they cannot raise the planned add count
- The first mismatch class marked as lookup, insert, full count, week count, final read, or test scope
- The one-call and one-by-one control results from the same build, with the same seed rule and the same row checks
- The smallest worker count that can show the fault more than once, kept with fresh skill keys for each new try
- The SQL trace or store log for that small failed case, cut to the scoped key and kept free of user or secret data
- The cleanup delete count and final zero-row check, run even when an earlier count rule fails for the test
- The next owner and next check chosen from the first bad gap, without a broad claim that all load paths are unsafe in the live service

First, verify the seed by reading it back. This catches default substitution, stale test data, or accidental use of another skill. Store that returned baseline beside the run result.

Second, construct payloads before releasing the barrier. Use distinct agent labels when they help trace rows, while keeping the skill reference identical. Avoid random malformed fields because validation noise weakens the concurrency signal.

Third, retain every promise result. \`Promise.allSettled\` is useful when a rejected client promise must not cancel collection from its peers. If the route is invoked directly and always resolves, inspect every response status and body.

Fourth, query events and counters after all operations finish. Never sleep for a guessed duration instead of awaiting requests. A fixed delay can pass on one machine and read unfinished work on another.

Fifth, compare deltas with the accepted add row count. Also compare that row count with prepared requests, then explain any gap using captured failures. This sequence prevents a masked insert exception from receiving the wrong diagnosis.

Finally, repeat using a clean skill and unchanged worker count. Install counter concurrency testing gains value from stable reproduction, not from one lucky green burst. Store the smallest failing case when a race appears.

The [database testing guide](/blog/database-testing-automation-guide) can support fixture lifecycle design. Browse [QA skills](/skills) when the suite needs a reusable concurrency or database-checking workflow.

## Frequently Asked Questions

### Why is an atomic SQL expression safer than read then write?

The expression keeps the addition inside the database update instead of carrying an old value through application memory. PostgreSQL still controls row visibility and locking for concurrent statements. The test remains necessary because surrounding inserts, error handling, connection use, or later refactors can break the observed route contract.

### Does one database transaction remove every race?

No. A transaction groups work, but the right result still depends on statement shape, isolation, constraints, and retry rules. Test the exact transaction and update design under load. Also check event rows and both counters, because a transaction can commit a rule that does not match the planned count.

### Why compare counters with rows instead of request count?

The route can return success when a skill is unknown or an internal telemetry operation fails. Inserted add rows show which events reached persistent storage under the current design. Comparing their delta with both counters separates counter loss from requests that never produced a durable event.

### Can a small connection pool hide a defect?

Yes. A pool with one connection can serialize database work even when clients start together. Record pool size and use enough connections to create meaningful overlap. Keep a one-connection run as a control, but do not use it alone to claim concurrent correctness.

### Should remove events lower the install counters?

Not under the current repository route. Remove telemetry creates an event row, while only the add branch updates \`installCount\` and \`weeklyInstalls\`. A mixed test should count add rows for counter expectations and should treat any decrement rule as a separate future product change.

### How should weekly resets be tested?

Test ordinary increments with resets disabled, then design a separate coordinated reset case. That second case needs an explicit rule for events arriving before, during, and after reset. Without that rule, a mismatched weekly value is ambiguous rather than a useful regression signal.

### When does a timing failure count as flaky?

A timing-dependent test is weak when it relies on sleeps or assumes a scheduler order. A barrier, awaited requests, fresh fixtures, and database deltas remove much of that uncertainty. If failure still varies, save worker count, pool settings, query evidence, and the smallest reproducible overlap.

## Conclusion

Install counter concurrency testing is complete when persistent add rows, \`installCount\`, and \`weeklyInstalls\` share one verified delta. A barrier creates overlap, while explicit baselines and scoped queries reveal whether missing work came from routing, inserts, or updates.

Run the sequential control first, then repeat moderate concurrent bursts with fresh skills and recorded pool settings. Preserve failing deltas and request outcomes so a database change can be judged against the same invariant.

Browse [database and telemetry testing skills](/skills) before running the synchronized counter test. Use the [leaderboard](/leaderboard) afterward only for its separate ranking and cache contract.`,
};
