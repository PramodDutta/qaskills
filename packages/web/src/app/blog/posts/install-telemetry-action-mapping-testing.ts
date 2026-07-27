import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'install telemetry action mapping testing',
  description:
    'Use install telemetry action mapping testing to cover add, remove, update, unknown, and conflicting fields without inflating install counters.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'install telemetry action mapping testing',
  keywords: [
    'install telemetry action mapping testing',
    'install remove update telemetry test',
    'unknown action defaults add',
    'legacy installType precedence',
    'counter inflation action mapping',
    'telemetry conflicting fields test',
  ],
  relatedSlugs: [
    'qaskills-cli-disable-telemetry-do-not-track',
    'api-testing-complete-guide',
    'database-testing-automation-guide',
    'testing-leaderboard-cache-filter-isolation-ranking-consistency',
  ],
  sources: ['https://www.rfc-editor.org/info/rfc9110', 'https://vitest.dev/guide/'],
  repoEvidence: [
    'packages/web/src/lib/telemetry-normalize.ts',
    'packages/web/src/app/api/telemetry/install/route.ts',
    'packages/web/src/db/schema/relations.ts',
  ],
  content: `Install telemetry action mapping testing proves which stored event type and counter delta follow every current or legacy action field. Build a truth table for install, remove, update, missing, unknown, non-string, mixed-case, and conflicting values. Then verify that only values normalized to add raise either install counter.

The current normalizer starts at add, gives remove the highest branch priority, and gives update the next priority. Any remaining combination stays add, including typos and unsupported text. Tests must capture that real behavior while making its counter risk easy to review.

## What Must Install Telemetry Action Mapping Testing Cover?

Install telemetry action mapping testing must cover the pure mapping result and the route side effects that follow it. A normalizer assertion alone can prove an event type, but it cannot prove which row is stored or whether counters move. Route checks join those layers with one seeded skill.

The mapping code resides in \`packages/web/src/lib/telemetry-normalize.ts\`. It reads \`action\` only when that field is a string, and it does the same for legacy \`installType\`; both missing and non-string fields become empty text for branch checks.

The normalized value begins as \`add\`. If either current action or legacy type equals lowercase \`remove\`, the result becomes \`remove\`; otherwise, either lowercase \`update\` value makes the result \`update\`, while all other input keeps the initial add value.

This order means legacy remove can override current update, and current remove can override legacy update. It also means current install, current add, blanks, uppercase variants, numbers, and unknown words all become add when no recognized legacy value intervenes. Those facts need named rows, not an informal three-case test.

The route in \`packages/web/src/app/api/telemetry/install/route.ts\` writes every resolved normalized event to \`installs\`. It raises \`skills.installCount\` and \`skills.weeklyInstalls\` only inside an exact \`event.installType === 'add'\` branch, so a mapping error can become a visible count error.

HTTP describes request semantics, while this application defines the meaning of its action fields. [RFC 9110](https://www.rfc-editor.org/info/rfc9110) is useful for the POST response and method contract, but it does not define \`installType\`. Keep the mapping oracle tied to source code and accepted client payloads.

Use the [API testing overview](/blog/api-testing-complete-guide) to separate input classes from response and state checks. The key outcome is not merely a successful body. It is the stored type plus exact deltas for both counters.

Begin with one plain control for each recognized result. Keep reference and agent values fixed, so only action input changes across the table and the wrong branch stays easy to see in a short failure report.

## How Do You Build an Install Remove Update Telemetry Test?

An install remove update telemetry test should call the normalizer for every input row, then call the route for a smaller set of branch representatives. The pure table is fast and broad, while the route set proves persistence and add-only counter behavior without copying every parser edge into database setup.

Use \`action: 'install'\` as the current add control because that is the documented CLI shape in the source comment. Use lowercase \`remove\` and \`update\` for the other controls, and require an exact result literal rather than a loose truthy check.

For legacy controls, omit \`action\` and send \`installType: 'add'\`, \`'remove'\`, or \`'update'\`. The explicit legacy add text stays add because only remove and update have branches, while a missing legacy value stays add through the initialized default.

Vitest supports table-driven cases that keep input and expected output side by side. The [Vitest guide](https://vitest.dev/guide/) documents the runner and core assertion workflow. A concise normalizer table can look like this:

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { normalizeInstallEvent } from '@/lib/telemetry-normalize';

describe.each([
  ['current install', { action: 'install' }, 'add'],
  ['current remove', { action: 'remove' }, 'remove'],
  ['current update', { action: 'update' }, 'update'],
  ['legacy remove', { installType: 'remove' }, 'remove'],
  ['legacy update', { installType: 'update' }, 'update'],
  ['unknown current value', { action: 'instal' }, 'add'],
] as const)('%s', (_name, fields, expected) => {
  it('maps to the expected stored type', () => {
    const event = normalizeInstallEvent({
      skillSlug: 'action-fixture',
      agents: ['codex'],
      ...fields,
    });

    expect(event?.installType).toBe(expected);
  });
});
\`\`\`

Keep the reference valid in every mapping row because a missing reference returns null before action results can be inspected. Add separate invalid-body cases for null, arrays, blank references, and non-objects. They test event rejection rather than action priority.

At route level, snapshot the install row count and both skill counters before each request. Add should produce row delta one and two counter deltas of one, while remove and update should each produce one row and leave both counters unchanged.

The [database automation article](/blog/database-testing-automation-guide) provides setup patterns for those state assertions. Use a unique fixture skill and query events by its ID. Global event totals make parallel tests interfere with one another.

Install telemetry action mapping testing should compare the stored \`installType\` as well as count. A zero counter delta for update does not prove the route saved update instead of remove. Read the newest fixture row or clear fixture events before each case.

## How Should Tests Cover Unknown Action Defaults Add Behavior?

Unknown action defaults add behavior needs direct tests because it can turn a spelling mistake into an install count. Send an unrecognized string with no recognized legacy field, then expect normalized add, one event row, and counter deltas of one under the current contract, even if a stricter design may be safer.

Include common near misses such as \`instal\`, \`removed\`, \`upgrade\`, and a blank string. They all avoid the two recognized branches. Do not describe them as rejected because normalization accepts the event when its reference is valid.

Case variants are unknown too. Values such as \`Remove\`, \`UPDATE\`, or text with outer spaces do not equal the lowercase literals. The helper trims the skill reference but does not trim or fold action fields.

Non-string action values follow the same default when legacy input offers no recognized value. Test null, a number, an array, and an object. The normalizer reads each as empty action text, which leaves the initialized add unchanged.

Add a valid legacy remove beside an unknown current action. The remove condition checks both fields, so the result must be remove and counters must stay fixed. This case prevents a future refactor from treating field presence as full precedence.

Install telemetry action mapping testing should label default-add cases as compatibility behavior with risk, not as evidence that unknown values mean installation. Tests document what exists. A product change can later reject unknown text or map it to a non-counting type, but that requires a new contract.

The [telemetry opt-out guide](/blog/qaskills-cli-disable-telemetry-do-not-track) handles a different negative path. An opted-out CLI sends nothing, while an unknown action request reaches normalization and can count as add. Keep both gates, since one cannot detect the other's fault.

Add a response check after state assertions. The route should return success for accepted references, regardless of mapped type. If a write fails, its broad catch also returns success, so the database oracle must remain primary.

Use short misspelled values that make the cause plain in test output. A generated random word adds no branch coverage. The most useful cases sit one character or one capitalization step away from supported client values.

## Legacy installType Precedence Cases

Legacy installType precedence is a branch priority rule across both fields, not a simple current-field-wins rule. Remove wins whenever either string field equals \`remove\`. Update wins only when neither field says remove and at least one says update.

Start with matching pairs: remove plus remove, update plus update, and install plus add. The first two retain their named type. The add pair remains add because neither value enters a special branch.

Then cross remove and update in both directions. Current remove with legacy update must normalize to remove. Current update with legacy remove must also normalize to remove, which proves value priority outranks field age.

Pair current install with legacy update and expect update. Pair current unknown text with legacy remove and expect remove. These rows show that a recognized legacy signal still controls when the current field does not request the highest branch.

Pair current remove with a non-string legacy value. The current remove remains recognized. Reverse the shape with a non-string current value and legacy update, then expect update.

The normalizer does not retain which field caused the outcome. It returns only the final type with reference and agent data. Tests should not invent source metadata in the stored event unless a future schema adds it.

In \`packages/web/src/db/schema/relations.ts\`, \`installs.installType\` is a required text column rather than a database enum. The application is the present gate for add, remove, and update values. Route tests prove it stores the normalized literal instead of raw request text.

The [rank consistency guide](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) can verify that remove and update conflicts do not move a public total. Keep its cache checks after direct counter reads. A delayed rank view is not precise enough to define field precedence.

Install telemetry action mapping testing should keep a full pairwise grid in pure tests and a chosen set in route tests. Mark each route representative in the same data file. Reviewers can then see which branches have state proof and which rely on pure mapping.

## How Does Counter Inflation Action Mapping Occur?

Counter inflation action mapping occurs when malformed or unsupported action data falls through to add. The route cannot distinguish an intentional install from an unknown value after normalization. It sees \`add\`, inserts that type, and runs both SQL increments.

The increment uses each current database value plus one, which is appropriate for a real add. The problem lies earlier when the action oracle maps bad text to add. A route test must trace the same input through mapping, stored row, and final counters.

Use a fixture whose two counters begin at different nonzero values, such as three and seven. After an unknown action, expect four and eight under current behavior. Distinct starting values catch a test helper that reads or writes the same counter twice.

For remove and update, expect the original values exactly. Do not assert only that totals are less than the add result. Exact values detect an update to one counter but not the other.

Inject a database read after event insertion and before counter checks only through a controlled test seam. The production route awaits the insert before it evaluates the type branch. Normal state assertions after the handler returns are enough for most cases.

Use the [leaderboard](/leaderboard) only as a downstream smoke check. The write-layer suite should query \`skills.installCount\` and \`skills.weeklyInstalls\` directly. Caching, sort ties, and filters can hide a one-count error in the rendered list.

If the product changes unknown input to a 400 response or a no-count event, update pure and route expectations in the same change. Keep one migration-era compatibility case for old client values. Do not weaken counter assertions to allow both old and new outcomes.

Install telemetry action mapping testing makes typo cost visible before such a design choice. Report the raw action, legacy value, normalized type, stored type, and both deltas. That five-part trace points to the exact boundary that changed.

## Telemetry Conflicting Fields Test Design

A telemetry conflicting fields test should use a compact pairwise grid rather than every arbitrary string combination. Choose values that represent recognized remove, recognized update, add-like current text, unknown text, missing values, and non-string values. Pair them to exercise each priority edge.

Name each row as \`current value / legacy value -> expected type\`. This format shows direction, which matters when fields swap. It also makes remove-first behavior clear without reading the normalizer source during every failure.

Do not use object key order as a variable. The helper reads named properties, so JSON order has no effect on outcome. Tests that permute property order add noise without reaching another branch.

Use one conflict where current action is \`install\` and legacy type is \`remove\`. Expect remove because the legacy recognized value enters the first condition. Then use current remove and legacy add to prove the same result from the current side.

Use current update with legacy remove as the strongest priority case. If a refactor changes to current-field precedence, this row turns update and may leave counters unchanged in either case. Therefore, stored type must be asserted, not only counter delta.

Use current unknown with legacy update to protect fallback to a recognized old field. This case differs from both unknown, which becomes add and raises totals. Side-by-side route results reveal how one legacy word prevents a false increment.

Install telemetry action mapping testing should also cover \`skillSlug\` plus \`skillId\` conflicts elsewhere, but do not mix them into this grid. Reference precedence can change the target skill and blur an action failure. Keep one valid, fixed slug throughout these rows.

The [API testing category](/categories/api-testing) can help teams choose table and state tools for this suite. Favor clear parameter rows over large snapshots. Each failure should print one input pair and one expected type.

After pure mapping passes, route-test the pair that yields each distinct type and each counter outcome risk. This smaller integration set stays fast while preserving the branch that can inflate counts. Add more route rows only when storage or response behavior differs.

## Action Inputs, Normalized Values, and Counter Deltas

The truth table below records current implementation, not a proposed stricter policy. Its install row column assumes the reference resolves and the database write succeeds.

| action | installType | Normalized type | Install row | Counter delta | Risk note |
|---|---|---|---|---|---|
| \`install\` or missing | Missing | Add | One add row for the resolved skill | Plus one for both totals | Intended install or implicit default |
| \`remove\` | Missing | Remove | One remove row with exact type | Zero for both totals | Supported current removal signal |
| \`update\` | Missing | Update | One update row with exact type | Zero for both totals | Supported current update signal |
| Unknown text | Missing | Add | One add row from fallback mapping | Plus one for both totals | Typo can look like an install |
| Non-string | Non-string | Add | One add row from empty branch text | Plus one for both totals | Invalid types fall through to default |
| \`update\` | \`remove\` | Remove | One remove row despite current update | Zero for both totals | Highest remove branch wins conflict |
| \`remove\` | \`update\` | Remove | One remove row despite legacy update | Zero for both totals | Current remove reaches first condition |
| Unknown text | \`update\` | Update | One update row from legacy signal | Zero for both totals | Recognized old field avoids false add |

Add mixed-case and space-padded strings beside this table in pure tests. They remain unknown because action text is not normalized. Keeping them out of the compact display prevents the same add outcome from obscuring conflict rules.

For every row, assert the normalizer result before invoking the route. If the route result fails later, this split reveals whether mapping or persistence broke. It also lets a schema-only failure keep the pure contract visible.

The [database test guide](/blog/database-testing-automation-guide) supports exact row and counter cleanup. Delete by fixture skill ID, not by broad action type. Other workers may be testing remove or update at the same time.

Install telemetry action mapping testing should run this truth table as source data, not duplicate it by hand in several suites. A shared test constant can feed pure cases and selected route cases. Keep production code independent from the expected table so a defect cannot rewrite its own oracle.

## How Do You Implement the Action Mapping Procedure?

Implement the action mapping procedure with a wide pure table and a narrow database-backed route table. Save raw fields, normalized expectation, stored expectation, and counter deltas in each route row. This shape makes every side effect explicit during review.

1. Define current action and legacy installType combinations for recognized, missing, unknown, mixed-case, non-string, and conflicting values, with one exact expected normalized type for every row and a short case name that states both raw fields plus the result.
2. Call \`normalizeInstallEvent\` for each combination using a fixed valid slug and agent, then assert the returned reference, agent, and type without allowing a set of possible outcomes or hiding a null result behind optional test access.
3. Seed one skill with distinct known install counters, save its full before state, and clear all event rows that point to its ID before each route representative begins, so no prior add can alter the expected deltas.
4. POST representative add, remove, update, unknown, and conflict bodies through fresh request objects while keeping reference, agent, and headers unchanged, then save each response before reading the database state owned by that single fixture.
5. Assert every resolved request stores one row with its exact normalized \`installType\`, selected skill ID, and expected agent, and inspect that row rather than trusting a successful response body that can also hide a caught write fault.
6. Assert only add rows increase \`installCount\` and \`weeklyInstalls\`, compare both totals with their distinct seed values, then restore the fixture in cleanup that runs after passes and failures without deleting rows from another parallel worker.

Route integration can use the same expected delta pair stored in each selected row. A value such as \`[1, 1]\` means add, while \`[0, 0]\` means remove or update. Still retain the expected stored type because both non-counting actions share deltas.

\`\`\`typescript
const routeCases = [
  { action: 'install', legacy: undefined, type: 'add', delta: [1, 1] },
  { action: 'remove', legacy: undefined, type: 'remove', delta: [0, 0] },
  { action: 'update', legacy: 'remove', type: 'remove', delta: [0, 0] },
  { action: 'instal', legacy: undefined, type: 'add', delta: [1, 1] },
] as const;

for (const item of routeCases) {
  const before = await readActionFixture();
  await postTelemetry({
    skillSlug: before.slug,
    action: item.action,
    installType: item.legacy,
  });
  const after = await readActionFixture();

  expect(after.latestEventType).toBe(item.type);
  expect(after.installCount - before.installCount).toBe(item.delta[0]);
  expect(after.weeklyInstalls - before.weeklyInstalls).toBe(item.delta[1]);
}
\`\`\`

Run the pure table on every pull request because it has no network or database cost. Run route cases against the same PostgreSQL behavior used by the web package. A mock can verify call shape, but it may miss column defaults or failed foreign keys.

The [CLI telemetry guide](/blog/qaskills-cli-disable-telemetry-do-not-track) can add accepted client payload examples to fixture review. Do not fetch live client data during tests. Fixed bodies make changes clear and keep private usage data out of CI.

Fail on any raw unsupported value stored as-is, wrong normalized type, extra row, or mismatched counter pair. Print just the case name and before-and-after state. A short report is easier to judge than a dump of all table rows.

## Frequently Asked Questions

### Does a missing action field count as add?

Yes, when the reference is valid and no legacy remove or update is present, normalization keeps its initial add value. The route then stores an add row and raises both counters. Tests should label this as the current default rather than claiming the caller explicitly requested installation.

### Which field wins when action and installType conflict?

No field has blanket priority. Recognized remove wins when either field contains lowercase remove. If neither does, recognized update wins from either field; all remaining combinations become add. Pairwise tests must therefore assert value priority rather than simply preferring the newer action property.

### Are action values trimmed or matched without case?

No, the normalizer checks exact lowercase strings and does not trim these two fields. Space-padded or mixed-case values miss remove and update branches. Without another recognized field, they become add, so route tests should include both forms and verify the resulting counter increase.

### Does an update event raise install counters?

No, a resolved update is inserted as an event row, but the route increments counters only for normalized add. Assert one stored update row and zero changes to both totals. This proves persistence and count behavior instead of treating a missing increment as the whole contract.

### Why assert stored type when counters do not move?

Remove and update both leave counters unchanged, so delta checks cannot distinguish them. A priority defect could store update instead of remove while every counter assertion remains green. Reading the fixture event type preserves the action-mapping rule that analytics and later reports may use.

### Should unknown actions be rejected instead of counted?

That is a product decision, while current source defaults them to add. First write a test that exposes the existing row and increments. If the contract changes, update normalization, response behavior, compatibility notes, and route assertions together rather than allowing either result in one test.

## Conclusion

Install telemetry action mapping testing defines a precise oracle: remove wins first, update wins second, and every other accepted value becomes add. Pair the pure truth table with stored event checks and exact counter deltas, so typos and legacy conflicts cannot change totals unnoticed.

Explore [QA testing skills](/skills), choose a table-driven test pattern, and turn these action rows into a regression gate. Then apply the [rank consistency workflow](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) to confirm only genuine normalized adds affect visible install order.`,
};
