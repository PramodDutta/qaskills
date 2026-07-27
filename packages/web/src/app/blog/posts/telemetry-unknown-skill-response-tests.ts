import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Telemetry unknown skill response tests',
  description:
    'telemetry unknown skill response tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'telemetry unknown skill response tests',
  keywords: [
    'telemetry unknown skill response tests',
    'unknown skill telemetry success',
    'telemetry slug name lookup',
    'install event uuid resolution',
    'local github install telemetry',
    'fail silent metrics endpoint',
  ],
  relatedSlugs: [
    'qaskills-cli-disable-telemetry-do-not-track',
    'qaskills-cli-download-fallback-github-content-metadata',
    'api-testing-best-practices-guide',
    'error-handling-testing-patterns',
  ],
  sources: [
    'https://orm.drizzle.team/docs/data-querying',
    'https://www.rfc-editor.org/info/rfc9110',
  ],
  repoEvidence: [
    'packages/web/src/app/api/telemetry/install/route.ts:reference resolution and silent success',
    'packages/web/src/lib/telemetry-normalize.ts:NormalizedInstallEvent',
  ],
  content: `Telemetry unknown skill response tests should submit UUID, slug, display-name, and unknown references, then assert response and insert count together. Known references must insert against the resolved skill ID. An unknown non-UUID reference must return success without insertion, while a valid-looking unknown UUID may attempt insertion and reach silent success through the catch.

That UUID split prevents a false claim about lookup behavior because the route accepts a UUID-shaped ref as the resolved ID without selecting the skills table first or proving that row exists. Slugs and names follow ordered store lookups, and an unmatched non-UUID value returns before the install insert with no row to count.

## Telemetry unknown skill response tests: What Must the Suite Prove?

Telemetry unknown skill response tests must prove ref choice, lookup order, response status, body, insert count, and counter effects, since a success body alone is not enough when both stored and skipped-by-design events return \`{ success: true }\`. The pass rules must pair client output with stored rows from the same call and the same seeded skill.

Create one known UUID, one known slug, and one known display name that all refer to controlled skill rows, then add an unknown slug and a local or GitHub ref with no catalog match in that small test store. Give each event a set action and agent value so the parsed event is visible and no default can hide a bad branch.

For a UUID-shaped ref, expect no slug or name select because the route assigns the ref directly to \`resolvedId\` and attempts the install insert with the raw, trimmed ID. A known UUID succeeds, while an unknown UUID can fail at the store boundary and still return success from the catch with no saved event.

For a non-UUID ref, expect a slug query first, and only an empty slug result allows a name query for that same text. A slug match must prevent the fallback, even if another row has the same text as its display name and would also match.

An unknown non-UUID value follows the early-return branch, so check two lookup attempts, zero install inserts, zero counter updates, status 200, and the success body in one call ledger. This is the clean unknown skill telemetry success contract because no store error is needed to reach it.

Malformed or missing refs are different because the parse step returns null and the route sends status 400 with \`skillId or skillSlug required\` before any skill query can run. Do not include that branch in a broad claim that every telemetry input returns success or that all bad data is ignored.

The [getting started guide](/getting-started) can provide a controlled install flow after route tests pass with a test endpoint and a row that can be removed. Keep the regression fixtures local and independent from live catalog data, user traffic, and changing install counts.

Telemetry unknown skill response tests pass when UUID passthrough, slug-first lookup, name fallback, and unknown early return each show the right store calls and final row counts. They fail when a 200 response is treated as proof of insertion without a read from the test store.

## Which QASkills Code Paths Own This Contract?

The route owner is \`packages/web/src/app/api/telemetry/install/route.ts\`, which parses JSON, calls \`normalizeInstallEvent\`, and returns status 400 when that parse step fails before any write seam is reached. For a valid event, it begins ref lookup with \`resolvedId\` set to null and chooses one path from the event flag.

When \`event.refIsUuid\` is true, the route copies \`event.ref\` into \`resolvedId\` and does not verify that UUID through a skill select before inserting the event row. Store rules therefore decide whether a UUID-shaped unknown ref can be saved, so the test must watch both the insert attempt and final rows.

When the ref is not UUID-shaped, the route selects a skill ID by exact slug, and an empty result triggers a second exact query by skill name with the same trimmed text. The first matching row in either branch supplies the foreign-key ID used by the install event, while later possible matches are not read.

If both queries return empty arrays, the handler returns \`{ success: true }\` immediately with no install record or skill counter update for that event. The source comment identifies unknown, GitHub, or local installs as examples with nothing to record against in the catalog table.

After resolution, the route inserts agent type, install type, and the \`cf-ipcountry\` header value from the same request or an empty string when it is absent. Add events increment both total and weekly install counts on the resolved skill row. Remove and update events record the event without that counter update.

The entire handler sits inside a broad catch that also returns \`{ success: true }\` with the normal status. JSON parse errors, query errors, foreign-key faults, insert errors, and counter errors can therefore share the same client output even though their stored state differs. Side-effect checks are key for each branch.

The normalizer owner is \`packages/web/src/lib/telemetry-normalize.ts\`. Its \`NormalizedInstallEvent\` includes \`ref\`, \`refIsUuid\`, \`installType\`, and \`agentType\` as the full route input. It prefers a nonempty trimmed \`skillSlug\` over \`skillId\`, even when the latter is a valid stored UUID.

The parse step maps install and unknown actions to add by default, while remove and update keep their meanings in the event row. It prefers a set \`agentType\`, then the first string in \`agents\`, then \`unknown\` when neither source gives a value. Tests should build expected events from these exact rules and not from a newer client plan.

Drizzle's [query guide](https://orm.drizzle.team/docs/data-querying) shows its SQL-like select, insert, update, and filter patterns. The [HTTP semantics reference](https://www.rfc-editor.org/info/rfc9110) helps split a successful HTTP reply from the stored result. QASkills source defines the silent telemetry policy.

Use the [API testing guide](/blog/api-testing-best-practices-guide) for route fixtures, while keeping these two repository files as the evidence owners. A short call ledger should name normalize, slug, name, insert, and update in the order each seam ran.

## Unknown skill telemetry success: Baseline Cases

Unknown skill telemetry success requires at least two unmatched refs that cannot share a branch by chance. Use a normal unknown slug such as \`local-contract-check\` and a valid UUID string absent from the skills table in the same clean store. They can produce the same response through different branches, which the insert ledger must make clear.

The unknown slug case should run slug and name selects, receive empty arrays, and return before insertion with no foreign-key work. Assert exact select order because a future display-name-first change could resolve a different row when catalog text overlaps. Also assert zero skill updates and unchanged counts on all seed rows.

The unknown UUID case should run no skill select and attempt an install insert with that UUID as the chosen skill ID. In a real store, a missing foreign key should reject the statement, after which the broad catch returns success and no row remains. A route mock must reproduce the rejection or it may invent a stored event and hide the true path.

Add malformed refs separately in small table rows that state whether JSON parsing itself can finish. An object with neither \`skillSlug\` nor string \`skillId\`, an empty string, null, and a non-object should parse to null. The route response should be 400 rather than silent success, with zero query and write calls.

Whitespace-only references also normalize to null because both candidate strings are trimmed before the event can be built. A string with leading or trailing spaces becomes its trimmed value before UUID detection or lookup against the test rows. Assert the predicate uses the trimmed form and never sends the old spaced text to Drizzle.

If both \`skillSlug\` and \`skillId\` exist, a nonempty slug wins even when the ID has a valid UUID shape. This cross-client rule matters when a mixed client sends stale ID data beside a current slug from a later install step. The test should prove no UUID passthrough occurs in that case and that slug lookup owns the result.

For a known slug, return one skill ID from the first select and assert no name query or second lookup of any kind. For a known display name, return no slug row and one name row with a different stored UUID. Both should insert exactly once against the stored UUID selected by their own branch.

Use [CLI telemetry controls](/blog/qaskills-cli-disable-telemetry-do-not-track) for opt-out behavior. This article starts only after an event reaches the web endpoint.

Telemetry unknown skill response tests should inspect counters only for add events that first store an install row. Unknown references must produce zero inserts and zero counter updates, regardless of normalized action or agent text in the request.

## Telemetry slug name lookup: Test Matrix

Telemetry slug name lookup should compare ref form, UUID check, selected predicate, resolved ID, insert count, status, and body. The matrix below preserves lookup order and the shared-by-design success response. Each row needs a distinct store call ledger.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Known UUID | UUID-shaped stored skill ID | Direct \`resolvedId\` assignment | 200 with \`success: true\` | One install insert; add updates counters | Unexpected skill select or wrong insert ID |
| Known slug | Non-UUID slug with one match | First exact slug query | 200 with \`success: true\` | One select and one install insert | Name fallback runs after slug match |
| Known display name | Slug miss and exact name match | Second lookup branch | 200 with \`success: true\` | Two selects and one insert | Name predicate or resolved ID is wrong |
| Unknown slug | Both lookups return empty | Early success return | 200 with \`success: true\` | No insert and no counter update | Success is mistaken for stored telemetry |
| Local or GitHub install | Reference absent from catalog | Same non-UUID early return | 200 with \`success: true\` | Event is intentionally skipped | Foreign-key insert is attempted |

The known UUID row must use a real stored ID in its positive control. Otherwise, the broad catch could hide a foreign-key error and still produce the expected body. Verify the install row independently.

The known slug row asserts only one select. Returning a match and then querying by name would change precedence and waste work. Include a conflicting display name in another row when testing ambiguity.

The display-name row must first return an empty slug result. A mock that jumps straight to name lookup bypasses live code. Capture the ordered predicates or use controlled records in a test store.

The unknown rows need insert counts. Their response matches known cases by design, so body-only checks cannot tell them apart. This is the main reason the matrix includes stored-row columns.

Local and GitHub install refs are examples from the source comment, not a separate parser mode. They are skipped only when the supplied ref does not match a catalog skill. Review [download fallback behavior](/blog/qaskills-cli-download-fallback-github-content-metadata) for the separate install source path.

## How Should Install event uuid resolution Be Exercised?

Install event uuid resolution should use one UUID that exists and one UUID that does not. Both normalized events set \`refIsUuid: true\`, and both skip skill lookup. Their difference appears at the install insert and database constraint boundary.

Start with \`normalizeInstallEvent\` unit tests. Verify uppercase hexadecimal UUID text passes the case-insensitive pattern, malformed groups do not, surrounding spaces are trimmed, and a preferred \`skillSlug\` changes which reference is examined.

Then drive the POST route with a stored UUID. Assert no skill select, one install insert using the exact ID, status 200, and one counter update for an add action. Read the install row so silent catch behavior cannot create a false positive.

\`\`\`typescript
import { expect, it } from 'vitest';
import { POST } from '@/app/api/telemetry/install/route';

it('records a known UUID without a skill lookup', async () => {
  const skill = await seedSkill({ slug: 'trace-check', name: 'Trace Check' });
  const before = await readSkillCounters(skill.id);
  const request = new Request('http://local/api/telemetry/install', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'cf-ipcountry': 'IN',
    },
    body: JSON.stringify({
      skillId: skill.id,
      agentType: 'codex',
      installType: 'add',
    }),
  });

  const response = await POST(request as never);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true });
  expect(skillSelect).not.toHaveBeenCalled();
  await expect(readInstallsForSkill(skill.id)).resolves.toHaveLength(1);
  await expect(readSkillCounters(skill.id)).resolves.toEqual({
    installCount: before.installCount + 1,
    weeklyInstalls: before.weeklyInstalls + 1,
  });
});
\`\`\`

The helper names in this example represent test fixtures around the repository database. The event uses a real stored UUID, so a successful response is supported by a persisted row. Counter checks confirm the add branch ran.

For the unknown UUID, use another valid string and assert the insert is attempted. In an integration store with the foreign key enabled, verify no install row exists and the response is still success. This case documents fail-silent behavior rather than early no-match behavior.

Do not mock UUID detection inside the route test. Drive the normalizer through request JSON. A separate unit suite can cover the regular expression more fully.

Telemetry unknown skill response tests should also send remove and update actions with a known UUID. They should create install rows without changing counters. This guards the comment and branch in \`NormalizedInstallEvent\`.

Browse [QA skills](/skills) only for realistic names and slugs. UUID fixtures must come from the controlled test database, not the live catalog.

## Step-by-Step Local github install telemetry Procedure

Local github install telemetry should compare all reference forms through one call ledger. The procedure begins at normalization, follows each route predicate, and ends with storage counts. Keep unknown non-UUID and unknown UUID cases separate in the report.

1. Create normalized events for UUID, slug, display name, and unknown references.
2. Capture each database predicate selected by the POST route.
3. Assert matched references insert telemetry and unknown references return the documented silent success without insertion.
4. Add all reference forms to the CLI-to-web compatibility post-flow.

Build a catalog fixture with values that cannot overlap accidentally. Use a slug unlike the display name and a second row whose name equals another possible slug. This makes precedence measurable.

The normalization example below proves reference priority and action mapping without database access. It uses the exported contract from \`packages/web/src/lib/telemetry-normalize.ts\`.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { normalizeInstallEvent } from '@/lib/telemetry-normalize';

describe('normalizeInstallEvent', () => {
  it('prefers a trimmed slug and maps the first agent', () => {
    expect(
      normalizeInstallEvent({
        skillSlug: '  local-trace-check  ',
        skillId: '11111111-1111-4111-8111-111111111111',
        action: 'remove',
        agents: ['claude-code', 'codex'],
      }),
    ).toEqual({
      ref: 'local-trace-check',
      refIsUuid: false,
      installType: 'remove',
      agentType: 'claude-code',
    });
  });

  it('rejects an empty reference', () => {
    expect(normalizeInstallEvent({ skillSlug: '   ' })).toBeNull();
  });
});
\`\`\`

The first assertion protects four facts at once because they form one normalized event. Add smaller table rows for legacy \`installType\`, explicit \`agentType\`, update action, unknown action, and default agent. Keep route tests focused on resulting database behavior.

After each matched route case, read install rows and counters. After each unknown case, assert no new row and unchanged counters. Reset records between cases so one event cannot satisfy a later count.

The CLI-to-web post-flow should use a test endpoint or isolated database. It can send the real current CLI payload and verify normalization, but it should not depend on production metrics. The [getting started flow](/getting-started) can guide a manual install after automated checks.

Telemetry unknown skill response tests should retain safe request shape, normalized event, predicate sequence, response, insert count, and update count. That record explains every branch without storing IP or user data.

## Fail silent metrics endpoint: Assertions and Diagnostics

A fail silent metrics endpoint needs two assertion groups: what the client sees and what storage observes. The client often sees status 200 with success true, while storage may contain one event or none. Report both every time.

For unknown non-UUID references, report slug predicate, name predicate, zero resolved ID, and zero inserts. For unknown UUID references, report direct ID selection, one attempted insert, caught database failure, and zero persisted rows. These paths should not share one vague test name.

For malformed payloads, expect status 400 and the required-reference error. This explicit validation branch sits before the broad silent catch. A non-JSON request may instead throw during parsing and reach success through the catch, so test those inputs separately.

Count skill updates as well as install inserts. A matched add should update counters once after insertion. Remove and update should not touch counters, and unknown references should touch neither table.

Capture lookup order with named predicates rather than raw SQL snapshots when possible. A result such as \`slug(ref), name(ref), return-success\` is easy to read. Full SQL text can vary with a Drizzle update while preserving behavior.

The route stores the country header or an empty string. Use a synthetic two-letter value in the known event control, then assert it on the inserted row. Do not include real network location data in fixtures.

Server logs are limited because the catch has no error parameter. Therefore, do not require a current log for hidden failures. The decisive diagnostic is the database seam and row count.

Use the [error handling guide](/blog/error-handling-testing-patterns) when considering future observability changes. Current tests should preserve the client contract without claiming hidden errors are measurable today.

Telemetry unknown skill response tests should fail if an unknown response inserts a row, a known response inserts none, lookup order changes, or counter effects disagree with action. A shared success body must never be the sole gate.

## What Regressions and Boundaries Prevent False Confidence?

Silent success is an intentional current contract, not evidence that telemetry was stored. Every positive response assertion needs an insert count or independent row read. This rule applies to known and unknown references.

UUID-shaped values do not follow slug or name lookup. A valid format does not prove the skill exists. Preserve one absent UUID fixture so the broad catch cannot hide a mistaken assumption about prevalidation.

Slug lookup has priority over display-name lookup. If catalog values overlap, the slug row wins. Add an ambiguity fixture before changing predicates or query order.

Normalization prefers \`skillSlug\` over \`skillId\`. A mixed payload can therefore avoid UUID passthrough. Test that precedence at the exported normalizer and through one route call.

Unknown actions default to add under current logic. That can affect counters for matched skills. Do not assume unsupported actions are rejected until production code adds validation.

The route returns 400 only when normalization returns null. Other errors inside the try, including JSON parse or database failure, can produce success from the catch. Keep invalid-shape and runtime-failure cases distinct.

This suite does not prove telemetry delivery from every CLI version. It tests accepted payload shapes and route resolution. CLI opt-out, network failure, and asynchronous sending belong to adjacent coverage through the [telemetry controls article](/blog/qaskills-cli-disable-telemetry-do-not-track).

After normalizer, route query, schema, counter, or CLI payload changes, run all matrix rows plus unknown UUID and malformed JSON. The [QASkills blog](/blog) can hold broader compatibility checks.

## Frequently Asked Questions

### How do you test an unknown skill telemetry response?

Send an unmatched non-UUID reference, return empty slug and name results, and assert status 200 with success true. Then assert zero install inserts and zero counter updates. The body proves client silence, while the side-effect counts prove the event was intentionally skipped.

### Why does unknown skill telemetry success need insert counts?

Known events, skipped unknown events, and caught database failures can all return the same success body. Without an insert count or row read, a test cannot tell them apart. Pair every response assertion with lookup history, resolved ID, persisted event count, and counter effects.

### What is the telemetry slug name lookup order?

For a non-UUID reference, the route queries exact slug first. It queries exact display name only when the slug result is empty. A slug match supplies the ID immediately. Tests should include a name fallback and an ambiguous value to preserve that precedence.

### How should install event uuid resolution handle an unknown UUID?

The current route treats UUID-shaped text as the resolved ID without selecting the skill table. It attempts insertion, and a database failure can reach the broad catch that returns success. Assert no persisted row, unchanged counters, and an attempted insert rather than expecting the non-UUID early return.

### What happens to local github install telemetry without a catalog match?

When its non-UUID reference matches neither slug nor display name, the route returns success before inserting. The source groups local and GitHub installs under this no-match example. It does not use a special install-source branch, so resolution still depends on the supplied reference text.

### What should a fail silent metrics endpoint expose in CI?

Report request shape, normalized event, predicate order, response status and body, insert attempts, persisted rows, and counter updates. Keep data synthetic and omit real location values. Those facts distinguish stored, skipped, invalid, and caught-failure outcomes even when several client responses look identical.

## Conclusion

Telemetry unknown skill response tests should bind each reference form to its real branch and pair every success body with persistence evidence. UUIDs pass directly to insertion, slugs win before names, and unknown non-UUID values return early. Malformed references and caught runtime failures remain separate cases.

[Open getting-started](/getting-started), run a controlled skill install, and add UUID, slug, name, and unknown-reference cases to telemetry verification. Then use [QA skills](/skills) to select safe fixture concepts without depending on changing production catalog records.`,
};
