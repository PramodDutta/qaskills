import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Typesense publish index freshness testing',
  description:
    'Use Typesense publish index freshness testing to measure when a new Postgres skill becomes searchable and detect missing synchronization work.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Typesense publish index freshness testing',
  keywords: [
    'Typesense publish index freshness testing',
    'Postgres Typesense sync test',
    'new skill missing from search',
    'search index freshness SLA',
    'publish indexing integration test',
    'database search eventual consistency',
  ],
  relatedSlugs: [
    'testing-typesense-multiselect-facet-filter-queries',
    'mcp-search-filter-schema-drift-contract-tests',
    'mcp-search-response-normalization-contract-tests',
    'database-testing-automation-guide',
  ],
  sources: [
    'https://typesense.org/docs/latest/api/documents.html',
    'https://typesense.org/docs/latest/api/search.html',
    'https://www.postgresql.org/docs/current/mvcc-intro.html',
  ],
  repoEvidence: [
    'packages/web/src/app/api/skills/route.ts',
    'packages/web/src/lib/typesense/search.ts',
    'packages/web/src/lib/typesense/client.ts',
    'packages/web/src/db/schema/skills.ts',
  ],
  content: `Typesense publish index freshness testing should publish one skill with a unique search token, confirm its Postgres row, then poll the real Typesense search path. The test records first-hit time or fails with both store states, without claiming a sync worker that repository evidence does not show.

This method turns a vague search delay into a measured state change. Browse the [skill catalog](/skills) only after the database and index checks can explain whether a missing result is stale, rejected, or never sent.

## What Must Typesense Publish Index Freshness Testing Establish?

Typesense publish index freshness testing must establish four times and states. Record when POST begins, when it returns 201, when a direct database read finds the row, and when search first returns the matching document.

The test also needs a fixed stop time. Without a maximum wait, a broken sync path looks like a slow test and can hold a CI worker until its own broad timeout.

Repository evidence starts with packages/web/src/app/api/skills/route.ts. Its POST handler validates a payload, checks slug uniqueness, inserts a skill, updates a user counter, starts optional email work, and returns the created fields.

That visible handler does not call the Typesense client or write a search document. This fact does not prove that no external job exists, but it does mean the route test alone cannot prove search freshness.

The database shape appears in packages/web/src/db/schema/skills.ts. Name, slug, description, author fields, arrays, scores, flags, and created time provide the data that an index writer would need to map.

The read side appears in packages/web/src/lib/typesense/search.ts. It sends the query through the skills collection and searches name, description, and author fields.

The client and collection schema live in packages/web/src/lib/typesense/client.ts. That file names the skills collection and defines the field types that a written document must satisfy.

A freshness result therefore has three valid labels. It can be found within the observation window, absent while the database row exists, or untestable because Typesense is not configured.

Do not convert the unconfigured result into a false pass. The search helper returns an empty result when its client is absent, which looks like a normal no-hit response unless the test checks configuration first.

The [Typesense filter test](/blog/testing-typesense-multiselect-facet-filter-queries) covers query filters after data exists. This plan asks an earlier question: when does one committed row become any searchable document at all?

Typesense publish index freshness testing should save small diagnostic facts. Keep the slug, unique token, database commit evidence, poll count, final hit count, and elapsed time, while excluding secrets and full API keys.

## How Do You Run a Postgres Typesense Sync Test?

A Postgres Typesense sync test begins with a token that cannot match an old document. Put the token in the skill name or description because the repository search path includes both fields in query_by.

Use a token based on the test run ID, worker ID, and a random suffix. Keep it short enough for logs, and never rely on a common word such as test or skill.

Record a monotonic clock just before POST. Wall-clock time is useful for logs, but elapsed measurements should not change when a host corrects its system clock.

After 201, query PostgreSQL by the exact returned ID or slug. Assert the stored token, author, and created row before any search wait begins.

This direct read separates publication from indexing. If the database assertion fails, the case should stop as a publish failure rather than spend its search window polling for data that never committed.

Poll the same search function used by the application. A raw Typesense call can help with diagnosis, but it should not replace coverage of query fields, collection name, and result mapping in the real path.

Use bounded backoff with a small first delay and a firm deadline. Add slight test-owned jitter only when many workers share one service, since fixed bursts can make provider load look like sync delay.

The first example publishes and verifies a unique token. It records the database state before handing control to the polling helper.

\`\`\`typescript
import { expect, it } from 'vitest';
import { db } from '@/db';
import { skills } from '@/db/schema';
import { eq } from 'drizzle-orm';

it('measures the first search hit after a committed publish', async () => {
  const token = uniqueRunToken('fresh-skill');
  const startedAt = performance.now();
  const response = await publishSkill({
    name: 'Index Probe ' + token,
    slug: 'index-probe-' + token,
    description: 'Search freshness probe ' + token,
    testingTypes: ['api'],
    languages: ['typescript'],
  });

  expect(response.status).toBe(201);
  const body = await response.json();
  const [saved] = await db
    .select()
    .from(skills)
    .where(eq(skills.id, body.skill.id));

  expect(saved.name).toContain(token);
  const observation = await waitForSkillSearch(token, 15_000);

  expect(observation.skillId).toBe(saved.id);
  expect(observation.foundAt - startedAt).toBeGreaterThanOrEqual(0);
});
\`\`\`

The 15-second value is only a sample test input, not a product promise. Replace it with the threshold owned by the service team and store that decision beside the test configuration.

Run this case against a disposable index or a test-only document namespace. A shared production collection can expose real user data, create cleanup risk, and make unrelated writes affect timing.

The [database testing guide](/blog/database-testing-automation-guide) shows how to isolate rows and verify commits. Pair that method with exact index cleanup so the Postgres Typesense sync test leaves neither store dirty.

Typesense publish index freshness testing should run more than once before a release claim. A single fast hit proves one path worked, but it does not describe common delay or slow-tail behavior.

## Why Is a New Skill Missing from Search?

A new skill missing from search can mean the row never reached an index writer, the writer failed, the document was rejected, or the query cannot match it. Each cause leaves different evidence.

First inspect the publish handler. Since the visible route contains no index write, find the named owner for any worker, webhook, scheduled job, database stream, or deploy task outside that handler.

Do not invent that owner in the test report. If no owned sync path can be found, state that the database row exists while the repository route has no visible handoff.

Next inspect collection and field names. packages/web/src/lib/typesense/client.ts uses the collection name skills and requires several typed fields, including integer scores, Boolean flags, arrays, and an int64 createdAt.

A document with a missing required field or wrong value type can fail before search. Capture the writer response or dead-letter record when that system exists, rather than treating every no-hit as delay.

Then inspect the read query. packages/web/src/lib/typesense/search.ts uses name, description, and author as query fields, so a token placed only in slug will not prove text search through this function.

Check client configuration as a separate state. With no TYPESENSE_API_KEY, the helper returns an empty page instead of throwing, and a naive poll will wait until its deadline with no useful cause.

Aliases or alternate collection names may also point readers away from the written document. The current code uses a fixed collection constant, so diagnostics should print the safe collection name and host label.

Use the [search schema drift test](/blog/mcp-search-filter-schema-drift-contract-tests) when fields change across boundaries. Freshness cannot pass reliably if writer and reader schemas no longer describe the same document.

The [search response normalization test](/blog/mcp-search-response-normalization-contract-tests) covers mapped result shape. Here, preserve both the raw hit ID and mapped skill ID when a hit exists but application output drops it.

Typesense publish index freshness testing should report the first failed boundary, not merely the phrase new skill missing from search. The useful labels are publish, handoff, document write, collection, query, mapping, or cleanup.

## Search Index Freshness SLA Measurement

A search index freshness SLA is a product-owned maximum time between a committed publish and a searchable result. The repository does not state a threshold, so the test must receive one from configuration or an approved service rule.

Define the starting event with care. Starting at request send includes API work, while starting at database commit isolates indexing more closely but may require a trace or writer event.

For an end-to-end user promise, request send or 201 completion can be a practical start. Record both values when possible so teams can see whether delay came from publication or index work.

Measure several samples with distinct tokens. Report count, minimum, median, a high percentile supported by the sample size, maximum, timeout count, and environment label.

Do not call five samples a stable percentile study. Small CI runs are good release checks, while longer scheduled runs can support a stronger service trend.

Treat every timeout as censored data, not as the deadline value itself. A document absent after fifteen seconds may appear later, so the report should say greater than fifteen seconds.

Set a pass rule before running the job. Changing the limit after seeing slow data hides drift and makes comparisons across builds hard to trust.

Separate availability from freshness. A Typesense request error means the read service was unavailable, while a valid zero-hit response means the query ran but did not find this token.

The [categories page](/categories) can help review search facets once the document appears. It cannot define the publish-to-search time or prove which sync path supplied the document.

Typesense publish index freshness testing should keep raw timing artifacts for failed jobs. A simple JSON line per poll can show elapsed time, response class, hit count, and safe error code.

## How Do You Build a Publish Indexing Integration Test?

A publish indexing integration test needs real Postgres state and a real disposable Typesense collection or document set. Mock-only tests can prove call shape, but they cannot measure cross-store delay.

Use test credentials with the least needed rights. The publisher needs its normal authenticated path, while cleanup needs rights only for the rows and documents created by the run.

Build the fixture from the production publish schema. Required name and description values should be valid, and all searchable arrays should use known test labels.

Before publishing, search the unique token and require zero hits. This guard catches token collision and stale data from an earlier failed cleanup.

After publication, read PostgreSQL independently and then start bounded search polling. Keep database retries separate because a database read failure must not be mislabeled as index lag.

The second example polls the repository search function. It stops on an exact token and returns evidence rather than only a Boolean.

\`\`\`typescript
import { searchSkills } from '@/lib/typesense/search';

async function waitForSkillSearch(token: string, timeoutMs: number) {
  const deadline = performance.now() + timeoutMs;
  let attempt = 0;

  while (performance.now() < deadline) {
    attempt += 1;
    const result = await searchSkills({
      query: token,
      page: 1,
      pageSize: 10,
      sort: 'newest',
    });
    const match = result.skills.find((skill) => skill.name.includes(token));

    if (match) {
      return {
        skillId: match.id,
        foundAt: performance.now(),
        attempt,
      };
    }
    await delay(Math.min(100 * 2 ** (attempt - 1), 1_000));
  }

  throw new Error('search freshness deadline reached for ' + token);
}
\`\`\`

Search by token, then compare the returned ID or slug with the database row. A loose nonzero hit assertion can pass when another document happens to share part of the query.

Run a direct document lookup only after the user search path times out. If direct lookup finds the document, the issue lies in query fields, filtering, mapping, or collection selection rather than write freshness.

The official [Typesense document API reference](https://typesense.org/docs/latest/api/documents.html) is the approved source for document operations. The [Typesense search API reference](https://typesense.org/docs/latest/api/search.html) is the matching source for read behavior and query options.

Use the [API testing category](/categories/api-testing) to find skills for auth, cleanup, and service faults. Keep this integration test small enough that each run owns one row and one document.

Typesense publish index freshness testing should fail with a clean report even when cleanup also fails. Preserve the original cause, then append cleanup status instead of replacing the first error.

## Database Search Eventual Consistency Cases

Database search eventual consistency means two stores can show different states for a bounded time. The test suite should cover each state change instead of treating create as the whole contract.

Create should move from no row and no document to one row and one searchable document. Update should change chosen searchable fields without leaving both old and new tokens active past the limit.

Delete should remove or hide the document after the database row is deleted according to product policy. The current publish evidence does not define delete sync, so confirm ownership before setting that expectation.

Duplicate delivery should end with one logical document for one skill ID. If a writer uses upsert, repeat events should update the same document instead of creating extra search hits.

Schema rejection should retain a clear failure record. A retry with corrected data should then make the same skill searchable without adding a second database row.

Delayed delivery should pass inside the approved limit and fail outside it. Use a controlled queue delay only when the sync owner exposes a safe test hook.

Out-of-order update events need a version rule if the architecture can deliver them. Without such evidence, note the case as an ownership question rather than claiming a version field that is not shown.

The PostgreSQL [MVCC introduction](https://www.postgresql.org/docs/current/mvcc-intro.html) explains that statements read database snapshots while concurrent work proceeds. That database rule does not make an external search index share the same snapshot.

Use the [search filter article](/blog/testing-typesense-multiselect-facet-filter-queries) after create freshness passes. A missing document cannot satisfy any facet filter, no matter how correct the filter expression is.

Typesense publish index freshness testing should list which cases are active, pending, or outside current scope. That list keeps an unverified delete or update path from being reported as covered.

## Publish State, Search State, and Freshness Timing

The matrix ties each visible state to one next check. Times remain observations until the product team approves a service limit.

| Scenario | Postgres row | Typesense document | First searchable delay | Expected outcome | Diagnostic |
|---|---|---|---|---|---|
| Successful immediate sync | Present | Searchable | Small measured value | Pass under owned limit | IDs and token match |
| Delayed sync | Present | Appears after polls | Measured nonzero value | Pass or fail by limit | Poll trace retained |
| Missing sync | Present | Absent at deadline | Greater than window | Fail | Handoff owner checked |
| Schema rejection | Present | Rejected | No first hit | Fail | Writer error retained |
| Duplicate sync | Present once | One logical document | First hit measured | Pass if one ID | Duplicate count checked |
| Delete propagation | Absent | Removed after policy delay | Measured from delete | Policy-specific | Both stores checked |

The missing-sync row is the key signal for the current evidence. The publish route can return 201 while no visible code in that handler writes Typesense.

The schema-rejection row requires writer evidence that may live outside this repository path. If it is unavailable, report missing handoff evidence rather than guessing an error message.

The duplicate row should use exact document identifiers. Search hit counts alone can change with query behavior, while repeated IDs expose duplicate logical records more directly.

The delete row must start from a known searchable document. Otherwise, a zero-hit result after deletion proves nothing about delete propagation.

### Freshness result card

- Run token placed in a field that the real query reads
- Post status and returned skill ID saved before polling starts
- Direct database row matched by both ID and unique token
- Poll deadline poll count first hit time and final hit count

Use the [MCP response contract article](/blog/mcp-search-response-normalization-contract-tests) when the raw index hit exists but the public response does not. Keep raw and mapped results in separate diagnostic fields.

Typesense publish index freshness testing should compare the same token across all rows. Changing token placement between cases can turn a state test into an accidental query-field test.

## How Do You Run the Freshness Procedure in CI?

Run the CI procedure in a named test environment with Postgres and Typesense configuration checked first. Fail fast if either service points at an unsafe or unknown target.

1. Create a valid publish payload with a unique token inside a field searched by the repository query path.
2. Record a monotonic start time immediately before POST, then assert the response status and returned identity.
3. Query PostgreSQL directly for that identity and verify the token in the committed row.
4. Poll the production search function with bounded backoff until the exact identity appears or the deadline expires.
5. Save first-hit time or timeout evidence with database state, collection name, attempts, and safe errors.
6. Delete the test row and index document, then verify that both stores no longer contain the token.

Step one should also run a preflight zero-hit search. If the token already exists, create a new token rather than deleting data that may belong to another worker.

Step two must retain the returned skill ID. That ID provides a stronger match than name text and helps direct document lookup after a timeout.

Step three should use a fresh database query. Do not infer commit from the response object because the aim is to locate the first cross-store boundary.

Step four needs a deadline shorter than the whole test timeout. Leave enough time to gather diagnostics and clean both stores after search fails.

Step five should classify errors. Store zero hit, request error, invalid response, wrong document, and missing configuration as separate outcomes.

Step six should run in a finally block with exact identifiers. Cleanup errors should make the job visible, since stale tokens weaken later preflight checks.

Run a small sample on each release and a larger sample on a schedule. The first guards the deploy, while the second shows drift in common and slow cases.

Use the [database guide](/blog/database-testing-automation-guide) for row cleanup and the [skill catalog](/skills) for a final user-path check. Neither should replace the measured index poll.

Typesense publish index freshness testing in CI should print one short result line per sample. Include outcome, elapsed time, attempts, row ID, document ID, and cleanup state.

## Frequently Asked Questions

### Does a 201 publish response prove the skill is searchable?

No, the response proves the publish handler created and returned a database-backed skill under its own contract. The visible route contains no Typesense write. Searchability needs a separate observation through the real search path, with a fixed deadline and exact identity match.

### How long should the poll wait?

Use a threshold owned by the product or search service team, not a value invented inside the test. Keep the poll deadline below the whole case timeout so diagnostics and cleanup can still run. Report timeouts as greater than the observation window.

### Who owns synchronization when the route has no index call?

The owner may be an external worker, webhook, stream consumer, job, or deployment task, but repository evidence here does not identify one. The test report should name the confirmed owner when found. Otherwise, state that the database commit has no visible route handoff.

### Should the test write Typesense directly after POST?

No, not when measuring the production publish-to-search path. A direct write would hide the missing or delayed sync behavior under test. Direct document operations are useful for setup, cleanup, and reader controls, but they should not manufacture the expected publish result.

### How do schema errors differ from slow indexing?

A schema error produces a rejected document write or related failure record, while slow indexing has an accepted handoff that appears later. Capture writer evidence when available. If only a database row and zero hits exist, classify the boundary as unknown rather than guessing.

### What cleanup is required after a freshness case?

Delete the exact database row and search document created by the test, then query both stores for the unique token. Run cleanup in a finally block and preserve the first failure. A stale document can pollute future preflight checks and timing results.

## Conclusion

Typesense publish index freshness testing makes one cross-store promise measurable without assuming hidden work. Confirm the committed row, poll the repository search path, enforce an owned deadline, and retain enough evidence to locate a missing handoff or rejected document.

Browse [search testing skills](/skills) and define a measured publish-to-search target before the next release.`,
};
