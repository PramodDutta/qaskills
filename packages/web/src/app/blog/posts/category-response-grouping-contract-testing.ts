import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'category response grouping contract testing',
  description:
    'Use category response grouping contract testing to verify four stable arrays, correct row placement, and explicit empty groups in every response.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'category response grouping contract testing',
  keywords: [
    'category response grouping contract testing',
    'category API group shape test',
    'empty taxonomy group contract',
    'testingType framework language domain',
    'category grouping integration test',
    'stable category response keys',
  ],
  relatedSlugs: [
    'database-testing-automation-guide',
    'api-testing-complete-guide',
    'testing-postgresql-jsonb-multiselect-filters-drizzle',
    'redis-cache-testing-guide',
  ],
  sources: [
    'https://www.rfc-editor.org/info/rfc8259',
    'https://nextjs.org/docs/app/building-your-application/routing/route-handlers',
  ],
  repoEvidence: [
    'packages/web/src/app/api/categories/route.ts',
    'packages/web/src/db/schema/categories.ts',
    'packages/web/src/lib/cache.ts',
  ],
  content: `Category response grouping contract testing proves every recognized database row appears exactly once under testingType, framework, language, or domain, while all four keys remain present as arrays. Seed one unique row per type, clear categories:all, inspect membership by ID, then remove one type and verify its group becomes an explicit empty array.

This contract protects clients from guessing which groups exist. A response that omits an empty key can force different parsing logic than a response with an empty array. A response that places one row under the wrong key can also send users toward an unrelated taxonomy page.

The grouping implementation is in \`packages/web/src/app/api/categories/route.ts\`. It initializes four arrays before looping through database rows and pushes only when \`grouped[row.type]\` exists. The table in \`packages/web/src/db/schema/categories.ts\` stores type as unrestricted text, so unsupported values are possible even though the route recognizes only four.

Cache behavior comes from \`packages/web/src/lib/cache.ts\`, and this route uses \`categories:all\` for 3,600 seconds. Start with the [categories page](/categories), then use the [database testing guide](/blog/database-testing-automation-guide) to keep integration fixtures owned and repeatable.

## What Must Category Response Grouping Contract Testing Prove?

Category response grouping contract testing must prove exact top-level keys, array value types, correct row membership, row preservation, no cross-group duplication, and explicit empty groups. It should also document how unsupported stored types behave. These assertions define the route more clearly than one broad response snapshot.

The expected keys are \`testingType\`, \`framework\`, \`language\`, and \`domain\`. Every successful response should contain all four even when the table is empty. Tests should compare key sets without relying on JSON object key order.

Each recognized row should appear once in the array named by its type. Assert membership by ID and verify that the same ID appears in no other group. Counting across all groups catches accidental duplication from future grouping logic.

The route pushes the original row object, so fields selected by \`db.select().from(categories)\` should be preserved through JSON serialization. Verify ID, name, slug, description, type, icon, and color with a deterministic fixture rather than checking only display names.

Array order is not promised by the database query because it has no \`orderBy\`. Avoid assertions that testing types or frameworks appear alphabetically unless the source adds an ordering contract. Compare members by ID or sort a copy inside the test.

Unsupported type values are ignored by the loop because their key is absent from the initialized object. They do not create a fifth group and do not currently cause an error. Test that fact honestly, while a separate schema decision can reject such rows earlier.

The route returns a JSON error with status 500 when the outer operation throws. Keep failure-path coverage separate from successful grouping because an error object does not contain the four arrays. The [API testing guide](/blog/api-testing-complete-guide) can provide general status and JSON checks.

Start with one row in each group and give each row a short name, fixed ID, plain slug, and type that no peer shares. Read the key set before any row check, since a lost key is a shape fault and needs its own clear message. Next, count each owned ID across all four arrays and require one match in the right place. This order lets the team tell shape, map, copy, and drop faults apart without scanning one large body.

## How Do You Write a Category API Group Shape Test?

A category API group shape test should validate structure before inspecting values. First assert status 200, parse JSON, compare the exact key set, and verify each value is an array. Only then check membership and field preservation.

Use \`Object.keys(body).sort()\` against a sorted expected list. Sorting inside the assertion avoids making property order part of the public contract. Also reject additional keys so a misspelled type cannot silently become a new response group.

For every expected key, call \`Array.isArray\` or validate with a schema. Do not accept null, an object keyed by slug, or an omitted value as equivalent to an empty array. Client rendering often treats those values differently.

The fastest unit case can mock the database rows and make \`cacheGetOrSet\` execute its fetcher. It proves initialization and placement without requiring Redis or PostgreSQL. Keep a real integration case for selection and serialization.

\`\`\`ts
import { expect, test, vi } from 'vitest';

const rows = [
  { id: 'type-id', name: 'API', slug: 'api', type: 'testingType' },
  { id: 'framework-id', name: 'Playwright', slug: 'playwright', type: 'framework' },
  { id: 'language-id', name: 'TypeScript', slug: 'typescript', type: 'language' },
  { id: 'domain-id', name: 'Web', slug: 'web', type: 'domain' },
];
const from = vi.fn().mockResolvedValue(rows);
const select = vi.fn(() => ({ from }));

vi.mock('@/db', () => ({ db: { select } }));
vi.mock('@/lib/cache', () => ({
  cacheGetOrSet: vi.fn(async (_key, fetcher) => fetcher()),
}));

test('returns four initialized category arrays', async () => {
  const { GET } = await import('@/app/api/categories/route');
  const body = await (await GET()).json();

  expect(Object.keys(body).sort()).toEqual([
    'domain',
    'framework',
    'language',
    'testingType',
  ]);
  expect(body.testingType.map(({ id }: { id: string }) => id)).toEqual(['type-id']);
  expect(body.framework.map(({ id }: { id: string }) => id)).toEqual(['framework-id']);
  expect(body.language.map(({ id }: { id: string }) => id)).toEqual(['language-id']);
  expect(body.domain.map(({ id }: { id: string }) => id)).toEqual(['domain-id']);
});
\`\`\`

Add an empty database case to the same unit layer. It should still return the four keys with four empty arrays. This case directly protects the object initialization from being replaced by reduction over existing types.

Do not snapshot generated Response internals. Assert the status and parsed JSON because those values form the route contract. The official [Next.js route handler documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) provides the framework boundary, while repository code defines these keys.

Use [API testing skills](/categories/api-testing) to reuse shape validators. Keep category-specific key names visible in the case table so generic helpers do not weaken exactness.

Keep the first shape check small enough to print in full, with four keys and no more than one owned row in each group. A short body helps a reviewer see null, object, and missing-array faults at once. Add larger seed data only after this base case passes, and compare owned IDs rather than the full shared list. The category API group shape test should make each failed rule clear from its case name alone.

## What Is the Empty Taxonomy Group Contract?

The empty taxonomy group contract requires every recognized key to exist with an array even when no row has that type. An empty array means the group is valid but currently has no members. An absent key means the response shape changed.

Test an entirely empty table first. The route creates the object before reading row membership, so all four arrays should remain empty. This is a stronger check than requesting a populated seed database where every key naturally appears.

Then test one missing group among populated peers. Seed testing type, framework, and language rows but no domain row. Assert domain exists as \`[]\` while the other groups contain their known IDs.

Repeat with each group absent through a parameterized case. A single domain-empty check could miss a future typo affecting only \`testingType\`. Four small cases state that every key is unconditional.

Clear \`categories:all\` before changing fixtures. Otherwise the second request can return the first populated response and make the empty assertion fail for cache reasons. Cache deletion belongs in setup, not after the response.

Avoid treating an empty group as an endpoint error. Status remains 200, and the other groups remain available. A client can render an empty state while preserving its normal response parser.

Category response grouping contract testing should also distinguish empty arrays from null. JSON supports both values, but the route contract uses arrays. The [JSON specification record](https://www.rfc-editor.org/info/rfc8259) is useful for syntax context, while the application test defines the exact shape clients receive.

Use the [categories page](/categories) as a visual empty-state check only after the API assertion passes. The page cannot prove an invisible key remains present in raw JSON.

Run the empty case with no owned rows first, then add three peers and leave just one group bare for the next pass. The first case proves all keys come from code, while the next proves rows in other groups do not fill the gap. Check status, key set, and array type before checking that the target array has no items. This keeps the empty taxonomy group contract focused on a valid blank group, not a failed request.

## TestingType Framework Language Domain Mapping

TestingType framework language domain mapping is exact and case sensitive in the current loop. Stored \`testingType\` maps to the testingType array, framework maps to framework, language maps to language, and domain maps to domain. No normalization occurs before lookup.

Seed one row per recognized value with distinct IDs, names, slugs, descriptions, icons, and colors. Distinct metadata exposes accidental object reuse or cross-placement. Do not use four rows named "test" because response diffs become ambiguous.

Assert each target ID appears exactly once across a flattened list of all groups. Then assert its containing key matches the stored type. This combines positive placement with negative cross-group checks.

Preserve row fields through the route. For example, the framework fixture should return its framework type, original slug, icon, and color. A mapper added later may intentionally narrow fields, but that would be a contract change requiring updated tests.

Case variants such as \`Framework\` are unsupported because object lookup uses the exact stored text. Seed one only in a negative case and assert it appears nowhere. Do not describe that behavior as schema validation, since the schema accepts unrestricted text.

Whitespace variants also fail recognized lookup. A row with \`language \` is not the same key as language. Data validation or migration should prevent such values, but the grouping suite can expose the route's current handling.

The [PostgreSQL JSONB filter article](/blog/testing-postgresql-jsonb-multiselect-filters-drizzle) covers skill taxonomy arrays. Categories use ordinary text columns and response arrays here, so avoid copying JSONB assumptions into this route test.

Category response grouping contract testing should name the stored type and expected key in every case title. That wording makes a failed mapping readable without opening fixture code.

Use a table of stored type, target key, owned ID, and peer keys, then drive the same small set of checks from each row. Do not change case text to a plural form that the route never sends. Keep odd case and white space inputs in a second table, where no target key is expected. This split makes the four good paths easy to trust and the bad data paths easy to trace.

## How Do You Build a Category Grouping Integration Test?

A category grouping integration test uses the real categories table, route handler, cache boundary, and JSON serialization together. It catches selection fields, database values, grouping, and response conversion that a mocked row test cannot. Run it in an isolated database or under owned identifiers.

Generate unique UUIDs and a run-specific slug prefix. Insert one row for each recognized type with all optional metadata set explicitly. Cleanup by those IDs so preexisting categories remain untouched.

The schema gives description, icon, and color defaults, but explicit values make preservation assertions stronger. A default supplied by PostgreSQL could hide a field omitted from the fixture. Use values that identify their source group without relying on non-ASCII symbols.

Delete the exact cache key before invoking GET. If Redis is unavailable, the cache helper returns fresh data, but the same test should remain valid when Redis variables are present. Assert key deletion or namespace the test service to avoid shared state.

The integration response may include categories outside the fixture when the database is shared. Filter returned rows by owned IDs before checking placement, yet still assert each owned ID occurs only once. For exact total counts, use a fully isolated database.

After the populated check, delete all rows for one owned type and clear the key again. Request the route and verify that group's owned subset is empty. In an isolated database, assert the whole destination array is empty.

Test unsupported types in their own transaction or cleanup block. Since the route drops them from all four groups, verify the row exists in the database before the request and appears nowhere afterward. This prevents a failed insert from creating a false pass.

Use the [database testing guide](/blog/database-testing-automation-guide) for transaction and cleanup choices. Then apply the [Redis testing guide](/blog/redis-cache-testing-guide) when validating cache hits separately from grouping.

Before the full route call, query the owned IDs from the same test store and save their type values in a short setup report. After the call, map just those IDs back to response keys and compare the two small maps. If they differ, show the one row and all four key counts rather than dumping unrelated seed data. A category grouping integration test is most useful when the store fact and wire fact can be read side by side.

## Stable Category Response Keys

Stable category response keys are a set contract, not an ordering contract. Clients should be able to access four known properties for every successful response. Tests should reject missing, misspelled, null, or unexpected group values.

Avoid snapshots that hide the distinction between keys and members. A large response snapshot can change whenever seed categories grow, making reviewers approve unrelated data diffs. Assert the exact key set once, then use focused member checks.

Do not assert top-level property order. Although object insertion currently follows the literal definition, JSON object member order should not carry business meaning. Sorting keys in tests retains exact membership without encoding presentation.

Array order also lacks a database guarantee because the route query has no order clause. If clients need alphabetical categories, add an explicit route order and test it. Sorting only in the interface should remain an interface contract.

The response echoes each row's \`type\`, even though placement already implies a group. Assert that stored and returned type still agree. A row under framework with a returned language value would reveal mutation or a malformed fixture.

Unsupported types must not add response keys. An inserted \`tool\` row should produce neither a tool array nor membership under another group. Whether the system should reject that data belongs to a validation test outside this successful grouping contract.

Category response grouping contract testing should compare cached and fresh key sets once. Seed a stable fixture, fetch fresh, fetch cached, and assert equivalent parsed bodies. Keep stale-data timing tests in the dedicated cache suite.

Browse [QA skills](/skills) by category after the route checks pass. That user path confirms navigation consumes the four-group response without turning presentation order into an API promise.

Write client checks with named property access and an exact key-set check, since each style guards a different form of drift. Named access proves a known key holds an array, while the set check rejects a new or misspelled peer. Sort copies only when member order does not matter, and leave the raw body unchanged for the log. Stable category response keys should stay simple to use even when one array has no rows.

## Stored Type and Response Group Matrix

The mapping matrix below lists every recognized value and its required destination. Representative fields describe row preservation, while negative assertions prevent duplication or accidental new groups.

| Stored type | Response key | Array always present | Representative fields | Empty behavior | Negative assertion |
|---|---|---|---|---|---|
| testingType | testingType | Yes | id, name, slug, type | Empty array | ID absent from three peers |
| framework | framework | Yes | description, icon, color | Empty array | ID absent from three peers |
| language | language | Yes | id, name, slug, type | Empty array | ID absent from three peers |
| domain | domain | Yes | description, icon, color | Empty array | ID absent from three peers |

The table intentionally repeats identical key names because singular values form the present contract. Do not pluralize them in test helpers. A client expecting \`frameworks\` would not be testing this route accurately.

Create a data-driven case from these four rows. Each case inserts one type, invokes the route through a fresh cache state, and finds the ID in one destination. Shared assertions can flatten all arrays for the exact-once check.

Keep row preservation checks split across fixtures so every field receives coverage without one oversized expectation. IDs and slugs are strong identity fields. Descriptions, icons, and colors show that metadata survives the route.

The empty behavior applies to the entire group, not an individual missing row. In a shared database, a removed owned row does not make a global group empty. Use isolation when testing whole-array emptiness.

The negative assertion should search all other groups by ID. Checking only the adjacent group can miss a copy under domain. A flattened occurrence count of one provides a compact invariant.

Use [category browsing](/categories) to inspect the resulting labels and [API testing skills](/categories/api-testing) to turn the matrix into reusable checks. Keep the source table beside failures so type spelling remains obvious.

Read one matrix row at a time and ask three plain questions: did the key exist, did the row land there once, and did all peer keys omit it. Keep the full row check for fields such as slug, icon, and color after those three facts pass. A map fault then does not get lost in a long field diff. Category response grouping contract testing gains trust when each row proves one route rule in a fixed order.

## How Do You Run the Grouping Procedure?

Run the grouping procedure twice: once with every recognized type and once with at least one empty group. Both runs need a cleared cache and owned database state. Compare key sets before testing rows.

1. Seed one uniquely identifiable row for every recognized category type.
2. Delete the \`categories:all\` cache key before requesting the route.
3. Call GET and assert the exact four top-level array keys.
4. Assert every seeded ID appears once in its expected group only.
5. Delete all rows for one type and clear the cache again.
6. Assert the corresponding key remains present as an empty array.

The example performs schema-level response checks without depending on array order. It uses an isolated fixture database where deleting domain rows makes the full domain group empty.

\`\`\`ts
import { expect, test } from 'vitest';
import { cacheDel } from '@/lib/cache';

const expectedKeys = ['domain', 'framework', 'language', 'testingType'];

test('groups recognized rows and preserves an empty group', async () => {
  await seedCategoryFixtures();
  await cacheDel('categories:all');

  const first = await (await fetch(\`\${baseUrl}/api/categories\`)).json();
  expect(Object.keys(first).sort()).toEqual(expectedKeys);

  for (const fixture of categoryFixtures) {
    const occurrences = Object.values(first)
      .flat()
      .filter((row: any) => row.id === fixture.id);
    expect(occurrences).toHaveLength(1);
    expect(first[fixture.type].map((row: any) => row.id)).toContain(fixture.id);
  }

  await deleteFixtureType('domain');
  await cacheDel('categories:all');
  const second = await (await fetch(\`\${baseUrl}/api/categories\`)).json();
  expect(second.domain).toEqual([]);
});
\`\`\`

If the test invokes the route function directly, mock or configure the same database module used by the handler. If it sends HTTP, ensure the server and setup process share the intended database. A transaction invisible across connections will produce misleading missing rows.

Capture only owned IDs, destination keys, and cache state in diagnostics. Full category data may contain unrelated shared rows. A compact occurrence map makes duplicate or missing placement obvious.

After the procedure, run an unsupported-type case and the database-error case separately. They test drop behavior and status 500, not the successful four-array invariant. Keeping those outcomes apart makes release failures easier to classify.

Review [category pages](/categories) and [QA skills](/skills) after automation passes. The API suite remains the authority for explicit empty arrays because a rendered page may hide absent and empty values the same way.

Close the run by clearing the key, deleting owned rows, and checking that no owned ID remains in either the store or a fresh response. If the test uses a shared store, keep all slugs under one run tag and never delete rows by type alone. Save the prior cache mode so a local no-cache run and a CI Redis run use the same proof steps. Clean end state keeps one empty-group case from shaping the next case by mistake.

Keep a small map from each owned ID to its stored type, then build a second map from that ID to the key found in the response. Compare those maps before checking row fields, since a wrong key is the main risk and deserves the first clear fault. Category response grouping contract testing should also save the four array counts from the fresh and cached calls. Those plain facts let a peer trace store, group, cache, and wire steps without reading all shared rows.

- four exact top keys in each good response
- four array values even when no rows exist
- one fixed owned row for each known type
- one match for each owned ID across all groups
- no owned ID copied to any peer group
- all row fields kept through JSON output
- no rule based on object or row order
- one clear cache delete before each store change
- one odd type row checked as a dropped value
- all owned rows and keys cleared after the run
- one sorted key set saved before row checks begin
- one array type check for each of the four keys
- one stored type map built from owned fixture rows
- one response key map built from the parsed JSON body
- one map diff shown when a row lands in the wrong group
- one flat owned ID count across all response arrays
- one peer-group scan for each owned row in the test
- one field check for name slug description and type
- one field check for icon and color on chosen rows
- one clean empty-store case before any seed rows exist
- one single-empty-group case with three populated peer groups
- one clear status check before the body is parsed
- one error case kept outside the successful shape table
- one shared-store mode that filters all checks by owned IDs
- one isolated-store mode that checks full array counts
- one cache hit body compared with the prior fresh body
- one unsupported type row proved present before route use
- no claim that database row order is part of the contract
- no full cache flush or broad delete in shared test state
- no absent key treated as equal to an empty array

## Frequently Asked Questions

### Why must empty category groups remain present?

Always-present arrays give clients one stable response shape for populated and empty data. Consumers can iterate each known key without checking whether it exists first. The distinction also makes an empty valid group different from a misspelled key, failed mapper, or incomplete response.

### Should tests compare the order of category keys?

No. Compare the exact key set after sorting key names inside the assertion. JSON object member order should not represent business meaning. The public contract requires testingType, framework, language, and domain properties, but it does not require one serialized property to appear before another.

### Is category row order alphabetical?

The current database query has no explicit order clause, so the route does not promise alphabetical arrays. Tests should compare membership by ID or sort a copy for assertion. If clients require ordering, add a database order expression and define that behavior in a separate contract.

### What happens to an unsupported stored type?

The schema accepts text, but the route initializes only four recognized keys. Its guarded lookup skips a row whose type has no matching key. The response gains no new array, and the row appears nowhere. Test this behavior without calling it validation or an error.

### Why clear categories:all during grouping tests?

The route can cache a grouped response for 3,600 seconds. Database changes made by a fixture will not affect that stored body until expiry or deletion. Clearing the exact key before each state ensures membership and empty-array assertions inspect current rows rather than stale setup.

### Should a shape test use mocks or PostgreSQL?

Use both at different levels. A mocked route test quickly proves four initialized arrays and guarded placement. A PostgreSQL integration test proves real selection, stored values, cache interaction, and JSON serialization. Neither layer alone covers the complete response path with equally clear diagnosis.

## Conclusion

Category response grouping contract testing protects four unconditional array keys, exact type-to-group placement, row preservation, empty-group behavior, and no cross-group duplication. It should avoid invented ordering guarantees and should report unsupported text types as ignored by the current guarded lookup.

Open [categories](/categories), browse [related QA skills](/skills), and automate the populated plus empty procedure against an owned database. Keep cache deletion and exact key checks in every run so stale data cannot hide a grouping regression.`,
};
