import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'install telemetry country header testing',
  description:
    'Use install telemetry country header testing to verify cf-ipcountry extraction, missing defaults, unusual values, and persisted install data.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'install telemetry country header testing',
  keywords: [
    'install telemetry country header testing',
    'cf-ipcountry header test',
    'install country default value',
    'edge geolocation header persistence',
    'telemetry country validation',
    'missing country header QA',
  ],
  relatedSlugs: [
    'qaskills-cli-disable-telemetry-do-not-track',
    'api-testing-complete-guide',
    'database-testing-automation-guide',
    'testing-leaderboard-cache-filter-isolation-ranking-consistency',
  ],
  repoEvidence: [
    'packages/web/src/app/api/telemetry/install/route.ts',
    'packages/web/src/db/schema/relations.ts',
    'packages/web/src/lib/telemetry-normalize.ts',
  ],
  sources: [
    'https://developers.cloudflare.com/fundamentals/reference/http-request-headers/',
    'https://www.rfc-editor.org/info/rfc9110',
  ],
  content: `Install telemetry country header testing proves that a resolved install event stores the exact \`cf-ipcountry\` request value, or an empty string when that header is absent or empty. It also checks the success response, add counters, unusual text, and database row so a swallowed write failure cannot look like valid persistence.

The request path is defined in \`packages/web/src/app/api/telemetry/install/route.ts\`. Storage comes from the installs table in \`packages/web/src/db/schema/relations.ts\`, and \`packages/web/src/lib/telemetry-normalize.ts\` must first turn the posted body into a resolvable event.

## What Must Install Telemetry Country Header Testing Prove?

Install telemetry country header testing must prove four linked facts: the event resolves to a real skill, the route reads one request header, the insert receives the expected country text, and the matching row actually exists. It must also verify the route returns its documented success body.

The current handler reads \`request.headers.get('cf-ipcountry') || ''\` only when it reaches the insert. A present nonempty value passes through unchanged. A missing header produces null, and an explicitly empty value produces an empty string, so both cases store the same fallback.

No trim, uppercase conversion, length check, or country allowlist appears in the route. Tests should preserve lower case, surrounding spaces, special codes, and long text exactly when the request implementation accepts them. This is a pass-through storage contract, not proof that the value names a real country.

The database column is PostgreSQL text with \`default('')\`. However, this route always supplies a country value, even for the missing case. A route test must prove the explicit fallback, while a separate schema test can omit the column and prove its database default.

Event resolution is a precondition. A slug is looked up first by slug and then by display name, while a UUID is used directly. If no non-UUID match exists, the handler returns \`{ success: true }\` without an install row, so response status alone cannot prove country storage.

Telemetry errors are intentionally hidden by the outer catch. An insert or counter failure also returns success. Direct row and counter assertions are therefore required. The [telemetry opt-out article](/blog/qaskills-cli-disable-telemetry-do-not-track) covers client consent behavior, while this guide owns the server header field.

The [API testing guide](/blog/api-testing-complete-guide) provides general request checks. This suite should remain narrow enough to state which header value, install row, event type, and counter change were observed.

## How Do You Write a cf-ipcountry Header Test?

A cf-ipcountry header test should build a \`NextRequest\` with a valid add event, a resolvable skill slug, and one explicit header value. After calling POST, query the newest matching install row by skill and a unique agent marker, then compare its country text exactly.

Use a different agent marker for each table row. The installs schema has no request ID, so this marker provides a practical test key when one skill receives several events. A unique fixture skill gives even stronger isolation.

Header field names are case-insensitive at the HTTP layer, so include construction cases using \`CF-IPCountry\` and \`cf-ipcountry\`. The route always asks for lower case through the standard Headers interface. The [HTTP semantics specification](https://www.rfc-editor.org/info/rfc9110) is the approved reference for field handling.

\`\`\`typescript
import { expect, test } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/telemetry/install/route';

test.each([
  ['upper name', 'CF-IPCountry', 'US'],
  ['lower name', 'cf-ipcountry', 'de'],
  ['special value', 'cf-ipcountry', 'XX'],
])('stores country for %s', async (_name, headerName, country) => {
  const agentType = 'country-test-' + country;
  const request = new NextRequest('http://local.test/api/telemetry/install', {
    method: 'POST',
    headers: { 'content-type': 'application/json', [headerName]: country },
    body: JSON.stringify({
      skillSlug: seededSkill.slug,
      action: 'install',
      agents: [agentType],
    }),
  });

  const response = await POST(request);
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ success: true });
  await expect(findInstall(seededSkill.id, agentType)).resolves.toMatchObject({
    installType: 'add',
    country,
  });
});
\`\`\`

The current normalizer maps action \`install\` to the default internal type \`add\`. It selects the first string in \`agents\` when no legacy \`agentType\` is supplied. These facts come from \`packages/web/src/lib/telemetry-normalize.ts\` and make the row query deterministic.

Do not assert only the last insert mock arguments. A real database case proves the text survives binding and storage. Keep one route unit test for exact values and one PostgreSQL integration test for present and absent headers.

Use the [API testing category](/categories/api-testing) to choose a runner that can create Next requests and inspect PostgreSQL. Avoid live edge requests, since they add network location and proxy setup to a simple application contract.

## What Is the Install Country Default Value?

The install country default value is the empty string in both relevant layers. The route supplies \`''\` when the header lookup yields null or an empty value, and the installs schema declares the same default when an insert omits the country column.

Test these layers independently. For the route case, send no \`cf-ipcountry\` field and spy on or query the inserted row. For the schema case, insert a valid install without a country property and read the stored default directly.

The route's explicit value means its test does not exercise the database default. Even though both results are equal today, a future route change could omit the field or use another marker. Separate tests reveal which layer changed.

An empty header value and a missing header both resolve to \`''\` because the expression uses logical OR. Whitespace such as one space is truthy and remains one space. This difference should appear in the table so a trim added later becomes an intentional contract change.

The success response does not include the stored country. Querying the row is the only direct route-level persistence proof. A mocked insert can give a quicker failure, but it cannot show database defaults, column width, or transaction behavior.

Install telemetry country header testing should never replace missing data with a guessed country. Local development commonly lacks edge-added fields, and the verified current behavior is blank text. The [database testing guide](/blog/database-testing-automation-guide) helps keep this default case isolated.

Use a known slug rather than a random UUID. A non-UUID slug forces an existence lookup and guarantees the row points to the seeded skill. A random UUID goes straight to insert, then a foreign key error can be swallowed as success.

## Edge Geolocation Header Persistence Cases

Edge geolocation header persistence cases should cover common codes, lower case, documented special codes, whitespace, empty text, absence, and a long accepted string. Every case should compare the exact request value with the country column rather than judging geographic truth.

Cloudflare documents \`CF-IPCountry\` as a two-character country code and also lists \`XX\` for missing country data and \`T1\` for Tor traffic. The [Cloudflare header reference](https://developers.cloudflare.com/fundamentals/reference/http-request-headers/) supports those source-controlled fixtures.

Use \`US\` as an ordinary two-letter example, then \`de\` to prove the route does not uppercase. Use \`XX\` and \`T1\` as edge-provider values. These tests state only what the route stores, not whether a request truly came from that location or network.

Add \`' US '\` to reveal the lack of trimming. If the request Headers implementation keeps the value as given, storage should include those spaces. Record the actual header value read by the request object before calling the route so the fixture itself is proven.

An unusually long text value demonstrates that the application has no two-character validation and the database column is text. Keep the sample modest, such as thirty plain characters, to avoid testing server header-size limits that sit outside this route.

Repeated requests each create an install row when the skill resolves. The handler has no country-based deduplication. Use unique agent markers and query the exact row, or run each case in a fresh transaction to avoid selecting an earlier event.

For action \`install\`, each successful route call also increments \`installCount\` and \`weeklyInstalls\`. Confirm a delta of one for each case. A stored row with unchanged counters would expose a partial operation, while a success response alone would hide it.

The [leaderboard cache testing article](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) addresses later use of install counts. This persistence suite should stop at the skill counters and install row because no leaderboard cache call appears in the telemetry route.

## How Should Telemetry Country Validation Be Scoped?

Telemetry country validation should match the implementation that exists today: nonempty header text passes through without syntax or membership checks. Tests must not require uppercase ISO codes, reject Cloudflare special values, or trim data unless product code first adopts those rules.

The edge provider is a source, not an application validator. Local clients and direct HTTP callers can supply the same header unless an upstream proxy strips or overwrites it. The route does not verify that Cloudflare added the value.

Describe the field as request metadata rather than confirmed location. A stored \`US\` proves only that the handler received and saved those two characters. It does not prove the user's residence, legal location, or physical position.

If the product later adds an allowlist, define it in one shared function and test ordinary codes, \`XX\`, \`T1\`, blank input, case, and invalid text. Decide whether invalid input becomes blank, remains raw, or skips telemetry before writing assertions.

Length policy also needs a written outcome. The current PostgreSQL text field can hold longer values, and the route has no cap. A future limit should return or swallow errors according to the telemetry policy, then keep response and storage tests aligned.

Install telemetry country header testing should keep normalization tests separate from event normalization. \`normalizeInstallEvent\` handles skill reference, action, and agent, but it never receives request headers. Country extraction belongs to the route after event and skill resolution.

The [error handling guide](/blog/error-handling-testing-patterns) is useful because telemetry catches every thrown operation and returns success. Any stricter validation must account for that policy, or the API may report success while quietly discarding a country or whole event.

## Missing Country Header QA

Missing country header QA proves that no edge-specific setup is required for a valid install event. A request without \`cf-ipcountry\` should return success, create one install row with empty country text, and increment both add counters by one.

Construct the request without adding the field at all. Before calling POST, assert \`request.headers.get('cf-ipcountry')\` is null so the fixture is clear. Then call the route and compare the row's country to \`''\`, not to null or an omitted property.

Add a separate request whose header map explicitly contains an empty string. Standard request handling may preserve or normalize it, so inspect the resulting Headers value. If it reaches the route as empty text, the stored result should match the missing fallback.

\`\`\`typescript
const before = await readSkillCounters(seededSkill.id);
const agentType = 'country-test-missing';
const request = makeInstallRequest({
  skillSlug: seededSkill.slug,
  action: 'install',
  agents: [agentType],
});

expect(request.headers.get('cf-ipcountry')).toBeNull();

const response = await POST(request);
const row = await findInstall(seededSkill.id, agentType);
const after = await readSkillCounters(seededSkill.id);

expect(response.status).toBe(200);
await expect(response.json()).resolves.toEqual({ success: true });
expect(row?.country).toBe('');
expect(row?.installType).toBe('add');
expect(after.installCount - before.installCount).toBe(1);
expect(after.weeklyInstalls - before.weeklyInstalls).toBe(1);
\`\`\`

This example proves more than a response. Because the handler hides thrown errors, the row and counters are essential. If either is absent, the route may have caught a database fault and still answered with the expected JSON.

Also test an unknown slug with no header. The response remains successful, but there should be no install row and no counter delta because resolution ends early. Keep that result outside the valid missing-header row so absence is not mistaken for persistence.

Use the [telemetry privacy article](/blog/qaskills-cli-disable-telemetry-do-not-track) to cover client disabling and Do Not Track behavior. Missing country header QA only proves the server fallback once a telemetry request is accepted.

## Header Input and Stored Country Matrix

The matrix below records the current pass-through rule and its counter effect for valid add events. Every row assumes the same skill resolves and each request has a unique agent marker.

| cf-ipcountry input | Header present | Stored country | Expected status | Counter delta | Validation note |
|---|---|---|---:|---:|---|
| US | Yes | US | 200 | +1 | Stored as received |
| de | Yes | de | 200 | +1 | No uppercase conversion |
| XX or T1 | Yes | Same code | 200 | +1 | Provider special value |
| Empty text | Yes | Empty string | 200 | +1 | Logical OR fallback |
| Missing | No | Empty string | 200 | +1 | Route default |
| One space | Yes | One space | 200 | +1 | No trim in route |
| Thirty plain characters | Yes | Same text | 200 | +1 | No route length check |

Status 200 does not prove the remaining columns because the catch path also returns success. Query the exact row and skill counters for each case. This is the main reason the matrix includes both response and storage outcomes.

The counter delta applies only to normalized \`add\` events. Remove and update actions create rows but do not change install counters. Keep action fixed to install here, then test those other branches in the general telemetry suite.

The row has a database timestamp default. Select it through skill ID and unique agent marker rather than timing alone. Parallel tests can create nearby timestamps, and timestamp ordering does not prove which header belonged to which request.

The [API testing catalog](/categories/api-testing) can supply table-driven tools for this matrix. Keep all values ASCII and visible in case names so whitespace and empty strings are not lost in test output.

Install telemetry country header testing should update the matrix if code gains trim, case normalization, an allowlist, or a length limit. Do not let the prose say pass-through while tests silently transform expected values.

## How Do You Run the Country Persistence Procedure?

Run the country persistence procedure with a new skill, fixed starting counters, and one unique agent marker per header case. Query storage after every call, then use transaction rollback or explicit counter restoration because deleting install rows alone does not reverse skill counters.

1. Seed one skill whose slug resolves through the telemetry route.
2. Record its install and weekly install counters before any request.
3. Prepare present, absent, empty, special, spaced, and long header values.
4. POST one add event per case with a unique agent marker.
5. Query each matching install row and assert its exact country text.
6. Assert success responses and a counter delta for every accepted add event.
7. Roll back the transaction or remove rows and restore both counters.

Prefer transaction rollback when the route and test can share database visibility. If the handler uses another connection, create a unique fixture, commit setup, and perform narrow cleanup. Never decrement global counters by an assumed case count without first reading the stored fixture.

Verify event normalization once before the table. The slug should resolve to the seeded UUID, action \`install\` should become \`add\`, and the first agent should become \`agentType\`. Header cases should not vary those inputs.

Run one failure-control case by forcing the insert to reject. The handler should still return \`{ success: true }\`, but no row or counter change should appear. This proves why persistence assertions are part of every positive row.

Run one unknown-skill case as another control. A non-UUID slug that matches neither slug nor name returns success before header extraction and insert. The header can be present, but nothing should persist.

Install telemetry country header testing should not call a public endpoint or rely on the runner's network country. A local \`NextRequest\` gives exact field control and keeps the suite fast. A small deployed smoke test may follow after the application contract passes.

Use the [database testing guide](/blog/database-testing-automation-guide) for fixture rollback and the [leaderboard testing guide](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) for downstream count checks. The country suite ends once row text and direct skill counters are correct.

Browse [API and telemetry skills](/skills) when selecting test utilities. Keep the final procedure in CI near the telemetry route so changes to header access, event resolution, or counter updates receive one focused review.

### Read a failed country persistence case

If the response is successful but no row exists, start with skill resolution, then print the safe test slug and resolved ID. A missing match exits with success before the route reads or stores any country value.

If the skill resolves, check whether the insert threw and reached the quiet catch; keep the error class in test logs but omit private request data. The positive case still needs a row before its response can count as proof.

If the row has blank text for a present code, inspect the request Headers object before POST runs, since the test helper may have dropped the field or used a bad value. Compare that seen field with the expected code in one line.

If lower case becomes upper case, search for a new transform in the route or request layer; the current app does not change case. Record the new rule before changing all expected rows, since it may affect old stored data.

If spaces vanish, check whether the request object or route trimmed them, then prove the value at both sides of the handler seam. This shows whether the change belongs to HTTP setup or app code.

If a long value yields no row, do not assume the app rejected its length; check server header limits and the database error first. Keep this case modest so it tests route pass-through rather than a host limit.

If the row exists but counts do not rise, confirm the normalized event type is \`add\`, since remove and update rows do not raise those counters. Also check whether the counter update threw after the insert and was then caught.

If counts rise but no row remains, inspect cleanup timing and transaction scope, since a teardown hook may have removed the row before the assertion. Read row and counters in one test phase, then clean both forms of state.

If more than one row matches, the agent marker or fixture skill was reused, so give each case a new marker and query both keys. Do not select the latest timestamp and hope it belongs to the failed request.

If the missing-header case stores null, inspect the actual insert values; the route should pass an empty string, and the schema has the same default. A null result means another write path or schema change reached the test.

If the special codes fail, compare exact text without a country lookup, since \`XX\` and \`T1\` are edge values rather than errors in this route. The persistence test should not turn a source example into an app allowlist.

If an unknown slug creates a row, inspect the slug and name lookup mocks. They may be returning the seeded skill for every input. A strict lookup mock keeps the early-success control from hiding a bad resolver.

If cleanup changes a shared skill, stop using a catalog fixture. Seed a new skill with known counts and a unique slug. Narrow cleanup can then remove its rows and restore only the values owned by this run.

Install telemetry country header testing should log the case, header form, stored text, response, and two counter deltas. Those facts are enough to find most faults. They also avoid printing IP addresses, user names, or full request bodies.

## Frequently Asked Questions

### What values can Cloudflare put in CF-IPCountry?

Cloudflare documents two-character country codes plus \`XX\` when country data is unavailable and \`T1\` for Tor traffic. The current route stores any nonempty header text without checking that set. Tests should include these provider examples while avoiding claims about a request's true origin.

### Does local development need a country header?

No, a request without the field follows the route's empty-string fallback. A valid resolved install should still create its row and update add counters. The test must inspect storage because telemetry errors return success, which can otherwise make a failed local insert look acceptable.

### Are lower-case country values converted to upper case?

No conversion appears in the current route. A lower-case value such as \`de\` is passed into the insert as received. Keep an exact case assertion so a future normalization rule becomes a reviewed behavior change rather than an unnoticed storage difference.

### Is CF-IPCountry trusted proof of user location?

No, this application code reads request metadata and does not verify who supplied it. A stored code proves what the handler received, not a person's residence or exact position. Apply the project's privacy, retention, and access rules without treating this field as geographic proof.

### Why query the install row after a success response?

The telemetry handler catches unexpected errors and still returns \`{ success: true }\`. An insert failure, foreign key failure, or counter error can therefore share the positive response. Reading the row and counters separates actual persistence from intentionally quiet failure handling.

### Does removing a test install row restore counters?

No, deleting the row alone does not reverse the increments already applied to the skill. Roll back the full test transaction when possible. Otherwise, record both starting counters, delete only fixture rows, and restore the exact prior values during cleanup.

## Conclusion

Install telemetry country header testing proves the complete write contract, not just header lookup. Cover exact pass-through values, empty and missing fallbacks, provider special codes, stored rows, add counters, swallowed failures, and cleanup that restores the fixture.

Browse [API and telemetry testing skills](/skills) before expanding this country-header matrix. Then use the [API testing guide](/blog/api-testing-complete-guide) to connect persistence checks with the route's other normalization and failure branches.`,
};
