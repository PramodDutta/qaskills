import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Skill list database failure tests',
  description:
    'skill list database failure tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'skill list database failure tests',
  keywords: [
    'skill list database failure tests',
    'skills api empty fallback',
    'database outage response test',
    'parallel count query failure',
    'nextjs list endpoint resilience',
    'fail soft api contract',
  ],
  relatedSlugs: [
    'testing-lazy-neon-database-initialization-nextjs-build',
    'testing-typesense-multiselect-facet-filter-queries',
    'testing-postgresql-jsonb-multiselect-filters-drizzle',
    'error-handling-testing-patterns',
  ],
  sources: [
    'https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware',
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all',
  ],
  repoEvidence: [
    'packages/web/src/app/api/skills/route.ts:GET Promise.all and catch response',
    'packages/web/src/app/skills/page.tsx:skill list consumption',
  ],
  content: `Skill list database failure tests should reject the data query and count query independently while invoking the real GET handler. Each failure must produce status 200 with an empty skills array, zero total, the requested page, and zero total pages. A valid empty result is the control because its public body can be identical to an outage fallback.

This behavior is a current fail-soft choice, not universal API advice. The [skills directory](/skills) has a separate server-side database fallback, so its page tests and the API contract must remain clearly labeled.

## Skill list database failure tests: What Must the Suite Prove?

Skill list database failure tests must prove that either rejected participant in the route's parallel query sends execution to one catch. That catch returns an empty list response with default HTTP status 200 instead of exposing a database error.

The relevant GET logic lives in \`packages/web/src/app/api/skills/route.ts\`. It parses search, filter, sort, page, and limit values, builds one list query and one count query, then awaits both with \`Promise.all\`.

When both promises fulfill, the route maps skill rows, reads the count, calculates total pages, and returns the requested page. When either rejects, the catch returns \`skills: []\`, \`total: 0\`, the already parsed page, and \`totalPages: 0\`.

No explicit status is passed to \`NextResponse.json\` in the catch. The response therefore uses 200 under current framework behavior. Tests should assert it directly because changing that status would alter client-visible semantics.

The list and count promises begin before the combined await settles. A rejection does not prove the other database operation never started. Side-effect assertions should expect both query chains to be constructed and avoid a false cancellation claim.

The [MDN Promise.all reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) states that the combined promise rejects when any input rejects and fulfills only after all inputs fulfill. It also explains that a first rejection determines the combined rejection reason, not that sibling work is canceled.

A successful query returning no rows and count zero can produce the same public JSON as the catch for page one. Skill list database failure tests need controlled promise outcomes or an error log seam to prove branch selection. Response body alone cannot distinguish those two causes.

The web page in \`packages/web/src/app/skills/page.tsx\` does not fetch this API. It runs similar database queries directly and catches failures by using \`FALLBACK_SKILLS\`. That related contract deserves a separate page case rather than an invented API-to-page handoff.

Use the [getting started guide](/getting-started) for a manual browse flow. Automated cases should own every query result and avoid a live Neon connection.

## Which QASkills Code Paths Own This Contract?

The API route owns query parameter parsing, filters, list and count concurrency, response mapping, and its empty 200 catch. The skills page owns server rendering, a separate pair of database queries, fallback filtering, and fallback pagination.

In \`packages/web/src/app/api/skills/route.ts\`, page defaults to one and is clamped to at least one. Limit defaults to twenty and is clamped from one through one hundred. The catch preserves parsed page but does not include limit in its JSON.

The data query applies the shared where clause, selected ordering, a unique ID tie-breaker, limit, and offset. The count query applies the same where clause. A strong success control asserts both received equivalent filters.

The API mapping includes IDs, names, slugs, descriptions, author names, quality and install counts, taxonomy arrays, flags, and ISO dates. Failure rows should not assert mapping because no row reaches that code. Keep mapping proof in a separate successful result case.

The catch does not expose an \`error\` property or failure marker. It also does not log within this branch. A caller sees a valid-looking empty result, which is why tests must state that observability limit.

In \`packages/web/src/app/skills/page.tsx\`, \`getSkills\` also awaits list and count queries together. Its catch then filters and sorts \`FALLBACK_SKILLS\`, returning page one and one total page. Search and selected framework or testing-type filters still apply to fallback rows.

That page behavior is not skill list API consumption. The evidence path remains relevant because users reach the directory through this server component, but test reports must call it a separate fallback policy. The [lazy Neon testing article](/blog/testing-lazy-neon-database-initialization-nextjs-build) covers database setup faults around that page.

The [Next.js route handler documentation](https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware) describes GET handlers and response creation. Repository source remains the authority for QASkills fields, status, and fallback choice.

Skill list database failure tests should cite \`packages/web/src/app/api/skills/route.ts\` for API expectations and \`packages/web/src/app/skills/page.tsx\` for page post-flow. Keeping both paths in diagnostics prevents one fallback from being mistaken for the other.

## Skills api empty fallback: Baseline Cases

The skills api empty fallback baseline has three states: populated success, legitimate empty success, and rejected-query fallback. These states prove the harness can map rows, return an empty set normally, and enter the catch on command.

For populated success, return one fixed skill row and a count of one. Assert status 200, mapped fields, ISO timestamp, total one, page one, and total pages one. This row proves both query chains can fulfill.

For legitimate empty success, return an empty row array and count zero. Assert the empty response exactly. Then verify both promises fulfilled so the test name and controlled setup, not response shape, identify this normal branch.

For data-query failure, reject the list promise while the count promise resolves. Expect the same empty 200 fallback. Record that the count query was built and allowed to settle, rather than asserting it was canceled.

For count-query failure, resolve list rows and reject the count promise. The catch discards the successful rows and returns an empty list. This case is essential because a list-only test would miss the all-or-nothing join.

Add a both-reject case with controlled deferred promises. Reject one first, await the response, then settle the other and ensure the runner has no unhandled rejection. Promise combinators attach handlers to inputs, but explicit settlement keeps test cleanup clear.

Skill list database failure tests should repeat one failure with \`page=3\`. Expect page three in the catch response even though total pages is zero. This proves request parsing happened before database work and the catch preserves its local page value.

Do not expect an API error field, retry hint, or fallback skill rows. None exists in this route catch. If product behavior changes, update source and contract tests together rather than adding a test-only interpretation.

The [Typesense facet testing article](/blog/testing-typesense-multiselect-facet-filter-queries) owns another search path. Keep the skills api empty fallback focused on the SQL route and its response contract.

Use one request helper for query parameters, but reset database doubles per row. A shared return queue can let the list chain consume count data and produce a confusing false result.

## Database outage response test: Test Matrix

A database outage response test must control list and count outcomes independently because \`Promise.all\` treats either rejection as a failure of the combined operation. The table includes a normal empty result to expose the identical public body.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Both queries succeed | One fixed row and count one fulfill through fresh query chains with equal filters known page limit and offset values | Normal map path reads both results checks their shared filter and computes page count | 200 with the full mapped skill one total current page one total page and ISO date text | Two database reads finish in the planned flow and no catch data replaces the known row | Valid row vanishes date stays raw filter drifts or page math changes |
| Data query rejects | List promise fails with a local mark while count promise fulfills with one | Combined promise enters the shared catch on the list fault | Empty 200 body with zero total requested page and zero total pages | Both query chains start and the count result does not leak into JSON | Error escapes status changes or any skill field appears |
| Count query rejects | List promise fulfills with a known row while count fails with its own local mark | Same combined catch discards the good list result | Exact empty 200 body with no mapped name ID date or list values | Both reads start and the successful list work is not sent to the caller | Partial rows appear or a count fault yields a new body |
| Both queries reject | Two deferred inputs start before one fails first and the other is then settled in cleanup | One shared catch handles the first combined rejection path | One empty 200 response with no second write or leaked error detail | Both input promises receive handlers and the test closes the last one | Unhandled rejection duplicate response or hanging test task |
| Successful empty database | Empty row array and zero count both fulfill with no thrown or rejected work | Normal success path maps no rows and computes zero total pages | Same public fields and values as the fail soft body for that page | Both reads finish on the success path while the test branch mark stays local | Test infers an outage from JSON that cannot show the cause |

The data-query row should fail at the final thenable for that chain, not during module import. The route must finish parameter parsing and build both operations. Capture builder use if the mocking layer allows it without coupling every method call.

The count-query row should return a nonempty list promise. The expected empty result proves the route does not expose rows when pagination count fails. Assert the response omits all mapped skill data from that fulfilled query.

For both failures, use deferred promises and attach them before rejection. Invoke GET, reject the first, await the fallback response, then reject or resolve the sibling as planned. Restore all doubles after both inputs settle.

The legitimate-empty row should share the exact body assertion used by failure rows. Add a branch marker only inside the harness, such as \`listOutcome: fulfilled\`, not in expected JSON. This documents the API's client-level ambiguity.

Skill list database failure tests should also run with filters and a later page. Reject one query and assert the catch still returns the parsed page. It does not echo filters, so avoid inventing response fields.

The API currently makes no fallback read from seed data. Page fallback behavior belongs to \`packages/web/src/app/skills/page.tsx\`. A test expecting fallback cards from GET would combine two independent implementations.

Use the [PostgreSQL JSONB filter article](/blog/testing-postgresql-jsonb-multiselect-filters-drizzle) for successful filter predicate checks. This matrix only needs enough filtered setup to prove query failure still reaches the same catch.

## How Should Parallel count query failure Be Exercised?

A parallel count query failure case should return valid skill rows from the list query and reject only the count query. The expected empty 200 proves that pagination failure discards otherwise usable data under the current contract.

Create a fixed row with a valid \`Date\`, list fields, flags, and counts. Resolve the list promise with that row. Reject the count promise with a local sentinel error, then call GET and parse its response.

Assert status 200 and exact fallback JSON. Also assert the row name and ID do not appear in the body. This negative observation proves the normal mapping path did not run after the combined rejection.

\`\`\`typescript
import { expect, test } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/skills/route';

test.each([
  ['data query', Promise.reject(new Error('list unavailable')), Promise.resolve([{ count: 1 }])],
  ['count query', Promise.resolve([skillRow]), Promise.reject(new Error('count unavailable'))],
])('returns the fail-soft body when the %s rejects', async (_name, rows, count) => {
  mockSkillQuery.mockReturnValue(rows);
  mockCountQuery.mockReturnValue(count);

  const response = await GET(
    new NextRequest('http://test/api/skills?page=2&limit=20'),
  );

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    skills: [],
    total: 0,
    page: 2,
    totalPages: 0,
  });
});
\`\`\`

In a real test, avoid creating already-rejected promises inside a table at module evaluation. Use row factories that create each rejection after the handler and mocks are ready. This prevents unhandled rejection warnings before the case begins.

The list and count chains have similar builder calls, so identify them by selected shape or a narrow database adapter. Broad call-order stubs can become fragile when a query gains another method. The final promise outcome is the key control.

Add a deferred variant if the runner needs strict concurrency proof. Start GET, wait until both query doubles report entry, reject count, and assert the response. Then resolve list and finish cleanup.

Skill list database failure tests should not expect query cancellation. JavaScript \`Promise.all\` rejects the combined promise but does not stop database work already started. An abort design would require explicit implementation and separate tests.

The [error handling testing guide](/blog/error-handling-testing-patterns) provides broader fault injection advice. This parallel count query failure case should remain small enough to show one successful input being discarded after its sibling fails.

## Step-by-Step Nextjs list endpoint resilience Procedure

Nextjs list endpoint resilience testing should isolate both promises, replay every outcome pair, assert the exact API fallback, and then verify the separate page fallback. These steps keep transport behavior and server-page consumption from being merged.

1. Control the list and count query promises independently with fresh outcomes for every case.
2. Invoke GET for populated success, empty success, data rejection, count rejection, and paired rejection.
3. Assert the exact empty 200 fallback and distinguish it from legitimate emptiness through controlled setup.
4. Render the skills page with its direct database query failing and confirm the seed-data fallback remains stable.

Start with query factories rather than shared promise values. Each factory should record entry, return its planned promise, and provide a cleanup method. This design makes concurrent start and later settlement visible.

The API assertion should compare status and all four response fields. Do not check only \`skills\`, because page and total values are part of the contract. A change from requested page to page one would affect pagination clients.

For the page step, mock its database query to reject and keep \`FALLBACK_SKILLS\` real. Pass a search value that matches one known fallback fixture, then render the async page. Assert a fallback card and fallback pagination state rather than an API empty body.

\`\`\`tsx
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import SkillsPage from '@/app/skills/page';

test('renders filtered seed data when the page database query fails', async () => {
  mockPageSkillQuery.mockRejectedValue(new Error('database offline'));

  const view = await SkillsPage({
    searchParams: Promise.resolve({ q: knownFallbackTerm, sort: 'trending' }),
  });
  render(view);

  expect(screen.getByRole('heading', { name: /QA Skills/i })).toBeVisible();
  expect(screen.getByText(knownFallbackSkill.name)).toBeVisible();
  expect(global.fetch).not.toHaveBeenCalled();
});
\`\`\`

This cross-layer example reflects the current server component: it queries the database directly and uses local fallback data. The exact heading query should match rendered markup in the final test, while the no-fetch assertion protects the architectural boundary.

If the page later switches to the API, replace this case with a true response-consumption test. Until then, claiming it renders the API's empty response would contradict source. Keep that distinction in test names and review notes.

Run the [lazy database initialization article](/blog/testing-lazy-neon-database-initialization-nextjs-build) checks beside this procedure when changing database startup. The current steps assume route import succeeds and failures occur during queries.

## Fail soft api contract: Assertions and Diagnostics

A fail soft api contract needs exact response assertions and explicit notes about hidden outage state. Status 200 can keep callers stable, but it also makes a database failure indistinguishable from legitimate emptiness through this body alone.

For every failure row, report which controlled promise rejected, whether both query chains entered, requested page, response status, and parsed JSON. Keep the sentinel database error inside test logs only. The public response intentionally omits it.

Assert that no row mapping occurs after a rejection. A spy around mapping is usually unnecessary; checking that known row fields are absent is enough. Avoid reaching into private local callbacks simply to count coverage.

Assert both queries were started, but do not require both to finish before the response. \`Promise.all\` can reject as soon as one input rejects. If the sibling uses a deferred promise, settle it during cleanup to avoid hanging resources.

Skill list database failure tests should compare the normal empty body with the fallback body in one case. Their equality documents the ambiguity and prevents a future test writer from inferring outage state from an empty array.

For page diagnostics, use a separate label such as \`page-seed-fallback\`. Report fallback row count, applied query, sort mode, and rendered card names. Do not call that result an API fallback.

The fail-soft contract should not be praised as always preferable. Lock current behavior, then let product and operations teams decide whether a 500, stale cache, or explicit degraded marker would be better. Tests must change only with an approved contract change.

Use the [QASkills blog](/blog) to connect this route check with monitoring and deployment tests. A unit suite cannot reveal a production outage when the response deliberately looks successful.

## What Regressions and Boundaries Prevent False Confidence?

The largest false-confidence risk is checking only the data query. Count failure also enters the catch and discards good rows. Keep independent rejection cases whenever the query structure changes.

Do not assert that \`Promise.all\` cancels the sibling query. Both operations have already started, and the combinator supplies no cancellation here. Explicit abort support would need source changes and new observability.

Do not infer a 500 from the caught database error. Current code passes no status option in the fallback response, so tests should expect 200. If the route later exposes degraded state, treat it as a deliberate API change.

Do not claim a client can tell outage fallback from an empty database. The four response fields can be identical. Controlled mocks prove test branch selection, but production callers need another signal if that distinction becomes required.

Keep API and page policies separate. The API returns an empty list, while the server page filters and sorts seed fallback data. A browser page that still shows cards does not prove the API returned fallback rows.

Add a page value beyond one to catch reset regressions. The API catch preserves requested page, while the page fallback returns page one. This difference is source-backed and should appear in test labels.

Re-run the matrix after changes to query concurrency, pagination parsing, error status, response fields, fallback data, or page architecture. The [Typesense filter article](/blog/testing-typesense-multiselect-facet-filter-queries) should cover search service changes separately.

Finally, include populated and empty success controls. Failure tests can pass for the wrong reason when query mocks never reach normal mapping. Positive cases prove the harness can observe both sides of the catch.

## Frequently Asked Questions

### How do skill list database failure tests cover both queries?

Resolve and reject the list and count promises independently across separate cases. Assert exact status and fallback JSON for each rejection, then include populated and empty success controls. Record that both query chains started, but never claim the combined promise canceled its sibling database work.

### What is the skills api empty fallback response?

The current catch returns status 200 with \`skills: []\`, \`total: 0\`, the parsed request page, and \`totalPages: 0\`. It includes no error marker or seed rows. A legitimate empty database can produce the same public body, so test setup must identify the branch.

### How should a database outage response test handle valid rows?

Use a count-query rejection while the list query resolves with a known row. Expect the catch to discard that row and return the empty fallback. Assert its ID and name are absent, then settle all promises and reset doubles so no rejection leaks into another case.

### What proves a parallel count query failure reached the catch?

Control the count promise with a sentinel rejection and let the list promise fulfill. The response should be the exact empty 200 contract, even with valid rows available. The controlled outcome proves branch selection because the response itself contains no error or degraded-state field.

### Does nextjs list endpoint resilience mean the page uses this API?

No. The current skills page performs its own server-side database queries and uses \`FALLBACK_SKILLS\` when they fail. Test that page policy separately. If architecture later routes the page through GET, replace the page case with a direct API-response consumption test.

### Is a fail soft api contract always the best design?

No universal choice follows from this code. Tests should preserve the current empty 200 behavior while documenting its hidden outage state. Product and operations requirements may later favor an error status, cached data, or a degraded marker, which would require coordinated source and test changes.

## Conclusion

Skill list database failure tests must reject each parallel query independently, preserve the exact empty 200 response, and include a valid empty control that exposes client ambiguity. Keep the server page's seed fallback as a separate post-flow because it does not consume this API today.

[Browse verified QA skills](/skills), then add independent data-query and count-query failures to the route regression suite. Use the [JSONB filter testing guide](/blog/testing-postgresql-jsonb-multiselect-filters-drizzle) for successful query semantics outside this failure contract.`,
};
