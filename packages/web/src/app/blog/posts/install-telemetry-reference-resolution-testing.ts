import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'install telemetry reference resolution testing',
  description:
    'Use install telemetry reference resolution testing to verify UUID, slug, and display-name lookup order, exact matches, and safe unknown references.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'install telemetry reference resolution testing',
  keywords: [
    'install telemetry reference resolution testing',
    'telemetry UUID slug name lookup',
    'skill reference fallback test',
    'install resolution precedence',
    'exact slug telemetry query',
    'display name install lookup',
  ],
  relatedSlugs: [
    'qaskills-cli-disable-telemetry-do-not-track',
    'api-testing-complete-guide',
    'database-testing-automation-guide',
    'testing-leaderboard-cache-filter-isolation-ranking-consistency',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/datatype-uuid.html',
    'https://orm.drizzle.team/docs/operators',
  ],
  repoEvidence: [
    'packages/web/src/lib/telemetry-normalize.ts',
    'packages/web/src/app/api/telemetry/install/route.ts',
    'packages/web/src/db/schema/skills.ts',
  ],
  content: `Install telemetry reference resolution testing proves how one incoming skill reference becomes the UUID stored with an install event. The contract selects nonblank skillSlug before skillId, accepts UUID-shaped text directly, then tries exact slug and exact display name. Unknown values return a safe response without a committed install row.

That order supports several client generations, but it also creates boundaries that a happy slug case will miss. Good tests use distinct fixture values, record which query runs, and assert the final foreign key plus counters. They also separate malformed UUID-like text from a valid but absent UUID.

## What Must Install Telemetry Reference Resolution Testing Prove?

Install telemetry reference resolution testing must prove input choice, UUID classification, ordered lookup, and final write behavior. The input helper decides which field becomes \`ref\`, while the route decides whether that value skips lookup or reaches slug and name predicates.

The pure boundary lives in \`packages/web/src/lib/telemetry-normalize.ts\`; a trimmed, nonempty \`skillSlug\` wins over \`skillId\`, while a trimmed string ID becomes the fallback reference. Empty objects, null values, blank strings, and non-string references produce no normalized event.

UUID recognition uses a case-insensitive hexadecimal pattern with groups of 8, 4, 4, 4, and 12 characters. It checks shape, not database membership and not a specific UUID version. Thus a well-formed unknown UUID takes a different path from ordinary unknown text.

Route behavior is implemented in \`packages/web/src/app/api/telemetry/install/route.ts\`; a UUID-shaped value is assigned to \`resolvedId\` without selecting the skill first. Any other value triggers exact slug selection, followed by exact display-name selection only when the slug result is empty.

The final database model matters because \`installs.skillId\` references the skills table. A valid-looking UUID that is absent can reach insertion and fail the foreign key, after which the route's catch returns success. Ordinary unknown text returns the same visible success earlier, but reaches it through two empty selects.

Use one fixture marker for every lookup form. Assert the inserted \`skillId\`, normalized event type, and agent field, then check the counters for an add. Query-call assertions help explain precedence, yet the stored foreign key remains the strongest result.

The [API testing guide](/blog/api-testing-complete-guide) can help split parser, query, and persistence checks. Do not put all values into one large snapshot. A focused table gives each input one expected branch and one clear failure.

Keep names and slugs far apart in the first set. A slug such as \`trace-skill-a\` and a name such as \`Trace Skill Alpha\` show which predicate won. Add deceptive overlap only after the base order is plain and stable.

## How Does Telemetry UUID Slug Name Lookup Work?

Telemetry UUID slug name lookup begins before the route touches the database. Normalization chooses one reference string, trims it, and sets \`refIsUuid\`, which prevents later code from reconsidering a UUID-shaped value as a slug or display name.

For a UUID branch, the route sets the resolved ID equal to the incoming text; it does not issue a select against \`skills.id\`. The insert and foreign key therefore become the first database proof that the referenced skill exists.

For non-UUID text, the first query uses \`eq(skills.slug, event.ref)\` and \`limit(1)\`. If one row appears, its ID is selected and the name query never runs, so this short circuit must remain visible in query-spy tests.

If no slug row appears, the route runs \`eq(skills.name, event.ref)\`, also with a one-row limit. A matching display name supplies the ID. If that result is empty, the handler returns \`{ success: true }\` without inserting or changing counters.

The order can be represented as a small decision chain:

\`\`\`typescript
const normalized = normalizeInstallEvent(body);
if (!normalized) return { status: 400 };

if (normalized.refIsUuid) {
  return { branch: 'uuid', resolvedId: normalized.ref };
}

const slugRow = await findByExactSlug(normalized.ref);
if (slugRow) return { branch: 'slug', resolvedId: slugRow.id };

const nameRow = await findByExactName(normalized.ref);
if (nameRow) return { branch: 'name', resolvedId: nameRow.id };
return { branch: 'unknown', resolvedId: null };
\`\`\`

This model is for test planning rather than a replacement production helper. Route tests should still call the actual handler. The branch labels make expected query counts and IDs easy to list beside each fixture.

PostgreSQL documents its native [UUID data type](https://www.postgresql.org/docs/current/datatype-uuid.html) and accepted input forms. The application regular expression is narrower than every form PostgreSQL may accept, so tests must follow the application gate first; a database-acceptable alternate form may still enter slug lookup here.

Use the [database testing guide](/blog/database-testing-automation-guide) for the final foreign-key cases. The normalizer can say that text is UUID-shaped, but only a database-backed route case proves an absent value leaves no install row after the insert fails.

Install telemetry reference resolution testing should record query absence as well as query presence. A UUID fixture must make zero slug and name selects. An exact slug fixture must make no display-name select after its first match.

## What Makes a Good Skill Reference Fallback Test?

A skill reference fallback test uses data that can reveal an incorrect branch without relying only on spy counts. Seed at least two skills with unrelated IDs, unique slugs, and distinct names, then create values that match one column while resembling another fixture's value.

Start with a control for each route. Send the first skill's UUID, the second skill's slug, and the first skill's display name. Each request should write the expected ID, which proves all three accepted forms work before collision cases are added.

Next, make the first skill's display name equal to the second skill's slug. Sending that shared text must resolve the second skill by slug because slug selection runs first. The stored ID proves precedence even if a query spy is misconfigured.

Names do not have a unique constraint in \`packages/web/src/db/schema/skills.ts\`, while slugs are declared unique. Add two rows with the same display name only in a focused risk case; since the name query uses \`limit(1)\` without an explicit order, tests should expose ambiguity rather than bless one row as stable.

Do not let seed insertion order become a hidden oracle for duplicate names. Query plans and physical row order are not a product contract. A safer behavior test can assert that duplicate names are ambiguous and motivate a unique or rejected lookup rule.

Use case variants to confirm exact matching. Store \`trace-skill\`, then send \`Trace-Skill\` and expect no match under the current predicate and common database collation behavior; if test database collation changes equality rules, document that environment instead of assuming universal case folding.

Drizzle's [filter operator documentation](https://orm.drizzle.team/docs/operators) describes the \`eq\` predicate used by the route. The implementation does not call a partial-match or case-insensitive helper, so route expectations should not add normalization that the code never performs.

The [telemetry privacy article](/blog/qaskills-cli-disable-telemetry-do-not-track) covers when no event leaves the CLI. A fallback test assumes an event arrived and asks which skill owns it. Keep network opt-out setup away from this lookup fixture so each failure has one cause.

Include blank \`skillSlug\` with a valid \`skillId\`; the helper should fall back to the ID because a trimmed blank slug is false. This case differs from a nonblank unknown slug paired with a valid ID, where the chosen slug blocks the ID.

Finish with an unknown word and an absent UUID. Both should leave state unchanged and return a non-failing telemetry response, but their database traces differ. Preserving that distinction catches a refactor that starts querying UUID text by name.

## Install Resolution Precedence Test Matrix

Install resolution precedence needs fixtures that state both selected input and database path. The table below uses two seeded skills so a wrong choice writes a detectable foreign key.

| Payload fields | Reference value | UUID check | Database lookup | Resolved ID | Expected response |
|---|---|---|---|---|---|
| \`skillId\` only | Existing canonical UUID | True | None before insert | Input UUID | Success and one row |
| \`skillSlug\` only | Exact stored slug | False | Slug | Slug row ID | Success and one row |
| \`skillId\` only | Exact display name | False | Slug, then name | Name row ID | Success and one row |
| Both fields | Nonblank slug plus other ID | Based on slug | Slug path | Slug row ID | Skill slug wins |
| \`skillId\` only | Malformed UUID-like text | False | Slug, then name | None | Success and no row |
| \`skillId\` only | Unknown valid UUID | True | None before insert | Absent ID | Caught success, no row |

Add one row where \`skillSlug\` contains spaces around a real slug. Normalization trims the value, so the query receives the clean slug. Assert the actual predicate value or stored target rather than treating raw spaces as part of the contract.

Also add non-string values for both fields. A number, array, or object should not become text through coercion. When neither field provides a valid string, normalization returns null and the route returns a 400 response naming the required reference.

The table separates unknown valid UUID from malformed UUID-like text. The first attempts a foreign-key insert, while the second performs two selects and exits before insert. Both leave no stored event, but only branch-aware checks can tell whether precedence remains correct.

An add event raises both counters after insertion. A remove or update event writes the resolved ID without raising totals. Use adds for the core matrix because counter changes provide another proof of target selection, then run smaller action controls.

The [rank consistency test](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) is useful after ID resolution passes. If the wrong skill gains an install, its rank input also moves. Keep that read-side symptom secondary to the exact inserted ID and counter pair.

Give each matrix row a short branch code in failure output, such as \`UUID_DIRECT\`, \`SLUG_EXACT\`, or \`NAME_FALLBACK\`. These codes are test labels, not new API values. They let a reviewer find the wrong phase without reading a long mock trace.

Install telemetry reference resolution testing should keep the payload action and agent fixed across this table. Changing several dimensions at once makes an ID failure harder to locate. Action mapping deserves its own table and route set.

## How Do You Assert an Exact Slug Telemetry Query?

An exact slug telemetry query assertion should prove the route passes the trimmed reference to \`eq(skills.slug, value)\`. It should also prove display-name lookup does not execute after a slug match. Stored event ownership then confirms the query returned the intended row.

Create a slug that has a longer neighbor, such as \`trace-api\` beside \`trace-api-plus\`. A request for the short slug must not match the longer row. Add prefix and suffix fragments as unknown controls so future partial matching becomes visible.

Case behavior needs an explicit fixture in the database used by CI. Exact SQL equality can still reflect column collation rules. Assert the repository's configured PostgreSQL result, and avoid broad claims about every database engine.

The following spy shape checks query order without copying the full Drizzle chain:

\`\`\`typescript
import { expect, test, vi } from 'vitest';

test('uses exact slug and skips display-name fallback', async () => {
  const lookup = vi
    .fn()
    .mockResolvedValueOnce([{ id: '11111111-1111-4111-8111-111111111111' }]);
  const findName = vi.fn();

  const result = await resolveTelemetryRefForTest(
    { ref: 'trace-api', refIsUuid: false },
    { findSlug: lookup, findName },
  );

  expect(lookup).toHaveBeenCalledWith('trace-api');
  expect(findName).not.toHaveBeenCalled();
  expect(result).toBe('11111111-1111-4111-8111-111111111111');
});
\`\`\`

A [route integration test](/categories/api-testing) should accompany this small seam example. The production code builds Drizzle calls directly, so a local adapter may be introduced only when it improves test control without changing order. Otherwise, inspect the inserted row and use query logging in the fixture database.

Avoid asserting generated SQL text character for character. Driver quoting, aliases, and parameter markers can change without altering behavior. Assert selected column, exact parameter value, branch order, and final ID instead.

The [API test catalog](/categories/api-testing) offers skills for route and contract checks. Pick a method that can inspect database state after a Next handler call. A network-only status tool cannot prove exact slug selection.

Use one request with the display name equal to the slug text of another row. The slug row must win, and the name lookup must remain skipped. This single case protects both exact matching and branch precedence with a visible ID result.

## Display Name Install Lookup and Collision Risks

Display name install lookup exists for older clients that sent a human-readable skill name as \`skillId\`. It runs only after non-UUID classification and an empty slug result. This makes it a compatibility fallback rather than a peer lookup chosen by client preference.

Display names can contain spaces and mixed case, and normalization trims only outer space. The route does not lowercase, collapse inner space, or apply fuzzy search. Tests should preserve the exact stored name and vary one feature at a time.

The schema path \`packages/web/src/db/schema/skills.ts\` marks \`slug\` unique but leaves \`name\` without uniqueness. That means two rows can share a display name. A one-row limit without order cannot promise which duplicate ID will be selected.

Do not write a test that accepts either duplicate and calls the branch safe. Such a test records uncertainty rather than a product rule. Use the case to demonstrate the risk, then decide whether publishing should reject duplicate names or telemetry should stop using name fallback.

A slug-name collision has a clear current answer because slug runs first. A name-name collision does not. Keep those cases separate in reports, since only the second needs a new determinism rule.

Unknown names should produce no insert and no counter change. Capture both values before the request, then compare after it returns. The handler's success body is intentional for telemetry and cannot serve as the only no-op proof.

Install telemetry reference resolution testing should include a name with leading and trailing spaces in the payload. The trimmed reference should match the clean stored name. A name with doubled inner spaces should remain unknown unless the stored value also contains them.

The [database test guide](/blog/database-testing-automation-guide) can support duplicate-name seed setup and cleanup. Make the duplicate case use a transaction or unique test prefix. It must not pollute other route fixtures that assume a display name identifies one row.

If the team later removes name fallback, preserve a compatibility test at the client version boundary. The expected response may stay successful while no event is written. Migration behavior should be stated before the branch disappears.

## Reference Inputs, Queries, and Expected IDs

Reference input tests need observable query counts as well as final state. A slug hit means one select, a name hit means two selects, and a direct UUID means no resolution select. These counts exclude later writes and any test setup query.

Spy at a narrow database seam when practical. A broad mock that returns rows for every \`select\` may cause a name test to pass through the slug branch. Distinct fixture IDs and explicit call order reveal that mistake.

For direct UUID, test an uppercase hexadecimal form because the pattern is case-insensitive. PostgreSQL UUID storage may return a normalized form after insertion. Compare semantic UUID values at the database boundary rather than preserving letter case as user data.

For a malformed value, use something that resembles a UUID but breaks one exact group. Confirm it reaches slug and name lookup. A plain word already covers the unknown branch, while the near miss protects the classifier boundary.

For field precedence, send a valid \`skillSlug\` with a different valid \`skillId\`. The slug target should receive the event. Then send a blank slug with that ID and expect the ID target, proving truthy selection rather than unconditional field presence.

Use direct row reads for the final oracle. The stored event should point to the resolved skill, and an add should raise only that skill's two counters. The other seeded row must stay unchanged, which catches a query mock that always returns its first fixture.

The [leaderboard](/leaderboard) can show the user effect of choosing the wrong row, but cached totals are too broad for this contract. Keep direct reads in the required suite. Add a rank check later with its cache cleared and its data set fixed.

When a well-formed absent UUID reaches insertion, expect no lasting row due to the foreign key and catch path. If a future transaction or validation select changes the trace, retain the visible no-op contract unless product requirements change. Update branch assertions only with that deliberate refactor.

## How Do You Implement the Resolution Contract Test?

Implement the resolution contract test in two layers. Pure cases call \`normalizeInstallEvent\` and assert selected reference plus UUID status. Route cases seed rows, send POST requests, inspect lookup activity, and verify stored IDs and counter changes.

1. Seed two skills with distinct UUIDs, slugs, display names, and zero counters, then save both full rows for paired before-and-after checks that can reveal a write against the wrong target.
2. Build payload fixtures for UUID, slug, display name, field conflict, blank fallback, malformed UUID-like text, and unknown text, while keeping action and agent data fixed across the full input table.
3. Call \`normalizeInstallEvent\` for each payload and assert the exact trimmed \`ref\`, its \`refIsUuid\` flag, and null behavior before any route mock or database state can affect the result.
4. Invoke the POST handler with a fresh request, record the slug and name query labels in order, and confirm branches that should short circuit do not run a later fallback query.
5. Assert the inserted \`skillId\`, normalized event values, and both counter deltas for every resolved add, while checking that the second seeded skill keeps its original row and totals.
6. Assert unknown words and absent valid UUIDs return safely without a lasting install row or changed skill, then clean all fixture events and restore counters even when an earlier check fails.

Table-driven pure tests can cover blank fields, trimming, non-string values, valid UUID forms, and near misses in little time. Give each row its expected reference before its UUID flag. A null result should be explicit rather than represented by empty fields.

Route tests should use fresh requests because JSON bodies are streams. Give every case its own skill IDs or reset all rows and counters after each run. Shared state can make a name fallback appear to find a row inserted by another test.

Install telemetry reference resolution testing should assert both seeded skills after collision cases. One should gain exactly one event and two counter increments, while the other remains at zero. This paired check provides a stronger signal than inspecting only the expected target.

Use the [telemetry opt-out test](/blog/qaskills-cli-disable-telemetry-do-not-track) as an adjacent client gate, not as setup here. Resolution begins with a received request. Keeping the route case local avoids environment flags and network timing.

Log the normalized reference, classifier flag, query labels, resolved ID, and final deltas on failure. Do not log broad request headers or unrelated skill bodies. This small trace is enough to distinguish input precedence, classifier drift, query order, and foreign-key failure.

Run this suite when client payload fields, normalization, skill schema, Drizzle predicates, or telemetry persistence changes. It also belongs before removing a legacy input form. Those triggers guard both current callers and compatibility branches.

## Frequently Asked Questions

### Does UUID-shaped text prove that a skill exists?

No, the helper checks only a hexadecimal group pattern. The route assigns that text as the resolved ID without a prior select. A missing UUID reaches the foreign-key insert, fails there, and is caught as a successful telemetry no-op with no committed install row.

### Which field wins when skillSlug and skillId are both present?

A nonblank string \`skillSlug\` wins because normalization evaluates it before \`skillId\`. Outer space is trimmed first. If the slug is blank after trimming, a valid string ID becomes the reference instead, so tests need both conflicting and blank-slug cases directly.

### Are slug and display-name matches case-insensitive?

The route uses Drizzle equality predicates and does not apply lowercase or a case-insensitive operator itself. Actual equality also depends on database configuration. Test the project's PostgreSQL setup with case variants, and do not add fuzzy or folded expectations that production code does not express.

### Why is duplicate display-name lookup risky?

Skill names lack a unique constraint, and the fallback query asks for one row without a defined order. Two equal names can therefore make ownership ambiguous. A sound test should expose that uncertainty rather than assert whichever row happened to be returned first.

### What happens for an unknown non-UUID reference?

The route checks exact slug first and exact display name second. When both queries return no row, it sends a success response without inserting an event or changing counters. Assert those state facts directly because the same visible response also follows accepted telemetry.

### Should tests inspect Drizzle SQL strings?

Usually no, since quoting and parameter syntax can change while the predicate remains correct. Assert that the slug field receives the exact trimmed value, that name lookup follows only an empty slug result, and that the resulting event stores the expected skill UUID.

## Conclusion

Install telemetry reference resolution testing fixes one ordered oracle: choose nonblank skillSlug first, classify UUID shape, query exact slug, then query exact display name. Pair branch evidence with inserted IDs and counter deltas, while keeping absent UUID and duplicate-name risks explicit.

Browse [QA automation skills](/skills) and turn this matrix into a local route suite with two distinct seed rows. Then use the [rank consistency guide](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) to confirm the resolved skill, and only that skill, affects visible totals.`,
};
