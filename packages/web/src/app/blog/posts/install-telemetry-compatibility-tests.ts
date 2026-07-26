import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Install telemetry compatibility tests',
  description:
    'install telemetry compatibility tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'install telemetry compatibility tests',
  keywords: [
    'install telemetry compatibility tests',
    'legacy cli telemetry payload',
    'skill slug telemetry normalization',
    'install action mapping tests',
    'agent type fallback testing',
    'telemetry schema compatibility',
  ],
  relatedSlugs: [
    'qaskills-cli-disable-telemetry-do-not-track',
    'api-testing-best-practices-guide',
    'api-contract-testing-microservices',
    'error-handling-testing-patterns',
  ],
  sources: [
    'https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware',
    'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html',
  ],
  repoEvidence: [
    'packages/web/src/lib/telemetry-normalize.ts:normalizeInstallEvent,isUuid',
    'packages/web/src/lib/telemetry-normalize.test.ts:payload generations',
    'packages/web/src/app/api/telemetry/install/route.ts:POST',
  ],
  content: `Install telemetry compatibility tests should prove that current, old, and new CLI payloads become one full event before lookup or storage. A passing suite checks the chosen ID, UUID flag, mapped action, agent fallback, lookup branch, insert count, install count change, and HTTP response for each supported input shape.

That scope keeps payload parsing apart from the DB rule while still testing their shared edge. It also gives the team one clear report when a CLI version changes its field names or values.

## Install telemetry compatibility tests: What Must the Suite Prove?

Install telemetry compatibility tests must prove one stable mapped shape from each valid request form. The shape contains \`ref\`, \`refIsUuid\`, \`installType\`, and \`agentType\`, and a bad request returns \`null\` before any lookup begins.

The helper lets a nonblank \`skillSlug\` win over \`skillId\`. It marks a standard UUID through \`isUuid\`, maps remove and update names, and uses add in all other cases. A direct \`agentType\` wins over the first valid agents entry, while no valid agent becomes \`unknown\`.

The endpoint adds one more contract after that map step. A UUID goes straight to the insert, while another ID is sought first as a slug and then as a display name. A lookup miss returns a success body without a write because local and GitHub installs may not match a stored skill.

Install telemetry compatibility tests should split that silent unknown-skill rule from bad input. Missing IDs produce a 400 response, but lookup misses and caught DB errors produce success. A broad response-only check would merge those paths and hide a broken payload.

Only an add event increments \`installCount\` and \`weeklyInstalls\`. Remove and update events are inserted without that counter update, so the suite needs both insert and update call counts. This is the clearest pass condition for action mapping.

The [QASkills telemetry opt-out guide](/blog/qaskills-cli-disable-telemetry-do-not-track) owns whether a client sends an event. This guide starts after a request arrives and focuses on payload support within the route.

## Which QASkills Code Paths Own This Contract?

The parsing contract lives in \`packages/web/src/lib/telemetry-normalize.ts\`. Its \`normalizeInstallEvent\` and \`isUuid\` functions are pure, so their input and complete output can be tested without Next.js, Drizzle, or network setup.

Existing version fixtures live in \`packages/web/src/lib/telemetry-normalize.test.ts\`. They cover a current CLI shape, an old UUID shape, slug order, action names, missing IDs, and the unknown agent default. Those cases are the base set, not a substitute for endpoint checks.

The route sits in \`packages/web/src/app/api/telemetry/install/route.ts\`. Its \`POST\` handler reads JSON, calls the helper, selects a skill when needed, inserts the event, and updates counts only for add. Each check after the map step should point to one of those clear branches.

This split matters because a pure unit test cannot prove that the route uses \`refIsUuid\` the right way. A route test that stubs the helper with a ready event also cannot find payload drift. Install telemetry compatibility tests need both layers, but each failure should stay easy to trace.

Next.js describes route handlers as code built from web request and response APIs in its [route handler guide](https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware). Use that edge for status and JSON checks, but keep field map cases in the small unit suite.

The [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) says untrusted data should be checked before deeper work. Here, repo code sets the exact valid fields and defaults, while the source backs checks at the trust edge.

For broad endpoint design, the [API testing practices guide](/blog/api-testing-best-practices-guide) explains request and response scope. The repo paths above still set the rules for this event contract.

## Legacy cli telemetry payload: Baseline Cases

A legacy cli telemetry payload supplies a UUID in \`skillId\`, a set \`agentType\`, and an \`installType\`. The helper keeps the UUID, sets \`refIsUuid\` to true, and does not need a slug or an agents array.

The current fixture uses \`skillId\` as a name-like ID, \`action\`, and an \`agents\` array. Its first string agent becomes \`agentType\`, and the action value \`install\` falls through to add. This is by design because the output uses add rather than install.

The upcoming shape can provide both \`skillSlug\` and \`skillId\`. A nonblank slug must win, even when \`skillId\` contains a valid UUID. That precedence keeps newer clients on the slug lookup branch instead of binding their request to an older identifier.

Install telemetry compatibility tests should name these fixtures by client age and intent. Names such as current-add, legacy-remove, upcoming-slug-first, and malformed-empty-ref reveal which promise failed. Plain fixture numbers make a test report much harder to use.

Whitespace needs a focused bad case because the code trims each candidate ID. A body with only spaces in \`skillId\` maps to \`null\`, which sends the route to its 400 response. Empty arrays and other version fields do not fix that missing ID.

Action order also needs paired inputs. Either \`action: 'remove'\` or old \`installType: 'remove'\` maps to remove, while update works the same way. Any unknown action stays add under current code, so tests should record that rule rather than invent an error.

A direct agent value wins even when an agents array exists. When only the array exists, non-string entries are dropped and the first string is used. When neither source gives a value, the full event must contain \`agentType: 'unknown'\`.

The [getting started page](/getting-started) shows current CLI flows, while this matrix keeps old route inputs safe. Keep past fixtures in source control after new fields arrive because old input support is the point of this test.

## Skill slug telemetry normalization: Test Matrix

Skill slug telemetry normalization links pure parsing with route lookup. The next matrix records the branch, response, and side effect for each supported ID form.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Current slug and add action | \`skillSlug\`, action, agents | Slug select returns one ID | 200 success JSON | One insert and one counter update | Name lookup runs or counters stay unchanged |
| Legacy display name | \`skillId\`, agentType, installType | Slug misses, name select matches | 200 success JSON | One insert with mapped agent | Insert uses the display name as a UUID |
| UUID reference | Canonical UUID in \`skillId\` | Direct resolved ID branch | 200 success JSON | One insert, no skill select | Any lookup runs before insertion |
| Unknown reference | Slug and name selects miss | Silent unknown-skill branch | 200 success JSON | No insert and no counter update | A missing skill creates an event |
| Optional fields missing | Valid reference only | Default add and unknown agent | 200 success JSON after match | Insert plus add counter update | Agent or action remains undefined |

Each row should check the full mapped object before it calls the route. That shows a failed slug rule as a parse fault rather than a strange DB query. It also proves that the UUID flag picks the path, not just the look of the string.

For the current slug row, control the first select result and save the inserted values. The expected object has the resolved DB ID, first string agent, add type, and country header value. Then check one update call because only add can change counts.

The display-name row needs two set select results. The slug lookup returns an empty list, and the name lookup returns one ID. Install telemetry compatibility tests must prove that the insert uses that ID rather than the first display name.

The UUID row should fail if either select is called. Direct IDs skip lookup under current code, yet the insert still uses the mapped action and agent. This call-count check stops a test double from accepting a stray query.

The unknown row is not the same as bad input. It reaches both text lookups, finds nothing, and returns success without a write. Keep a separate 400 case outside this table for a body with no \`skillId\` or \`skillSlug\`.

Review the [API contract testing guide](/blog/api-contract-testing-microservices) when more clients share this event. Its broad test methods pair well with this repo-specific matrix.

## How Should Install action mapping tests Be Exercised?

Install action mapping tests should start with the pure function because action names have no DB need. A table can vary current \`action\`, old \`installType\`, and unknown values while checking each mapped field.

This Vitest sample uses the real exports and the payload forms already stored in the repo. It checks two paths with the same plain test shape:

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { isUuid, normalizeInstallEvent } from './telemetry-normalize';

describe.each([
  {
    name: 'current remove',
    body: { skillSlug: 'playwright-e2e', action: 'remove', agents: ['cursor'] },
    expected: {
      ref: 'playwright-e2e',
      refIsUuid: false,
      installType: 'remove',
      agentType: 'cursor',
    },
  },
  {
    name: 'legacy update',
    body: {
      skillId: '1fe332e7-d794-48c2-9b02-c607bec4d572',
      installType: 'update',
      agentType: 'claude-code',
    },
    expected: {
      ref: '1fe332e7-d794-48c2-9b02-c607bec4d572',
      refIsUuid: true,
      installType: 'update',
      agentType: 'claude-code',
    },
  },
])('$name', ({ body, expected }) => {
  it('normalizes the full event', () => {
    expect(normalizeInstallEvent(body)).toEqual(expected);
    expect(isUuid(expected.ref)).toBe(expected.refIsUuid);
  });
});
\`\`\`

Full-object equality is key here. A check on \`installType\` alone could pass while slug order, the UUID flag, or agent fallback breaks. Each fixture should make one input change while it keeps the full expected shape.

Add paired route cases after the unit table passes. The remove and update cases should insert once and update skill counters zero times. The add case should insert once and update exactly once with expressions for both counters.

Do not replace the route helper with a mock for each case. One small error test may control it, but payload support cases should send real bodies through the real function. If not, the suite checks a hand-made event that clients never send.

Country handling is not the main goal, but it can still be seen at the write edge. Give one route case a fixed \`cf-ipcountry\` header and omit it in a second case. Then check the saved country value without making that field the main claim.

The [QASkills blog](/blog) groups related API and CLI checks. Keep this small suite close to the helper so a payload edit must change a fixture on purpose.

## Step-by-Step Agent type fallback testing Procedure

Agent type fallback testing should cover which value wins, bad item drops, and the last default. The steps below keep pure parse proof next to route-level write proof.

1. Lift the current and legacy fixtures from \`telemetry-normalize.test.ts\` into a table-driven unit suite.
2. Call \`normalizeInstallEvent\` for each payload and assert the complete normalized object, not selected fields.
3. Pass normalized events through \`POST\` with controlled skill lookup and database insert doubles.
4. Add unknown-skill and malformed-reference cases to the post-change regression command.

Start with a direct \`agentType\` plus a clashing agents array. The expected direct value proves which source wins, not just that some agent exists. Then remove the direct value and check the first string kept from the array.

Include arrays containing non-string entries before a valid string. The implementation filters by type, so the valid string should move into the first usable position. An empty or fully filtered array should lead to \`unknown\`.

The next test should carry each result to the insert call. The helper may be right while route code drops \`agentType\`, so save the full values object. Check that the resolved skill ID and mapped action stay paired with the expected agent.

A useful route test can expose small set query functions rather than a loose chain that accepts each call. This makes the lookup order clear when the test fails:

\`\`\`typescript
import { expect, it, vi } from 'vitest';

it('persists the normalized agent after slug lookup', async () => {
  const selectBySlug = vi.fn().mockResolvedValue([{ id: '1fe332e7-d794-48c2-9b02-c607bec4d572' }]);
  const selectByName = vi.fn();
  const insertEvent = vi.fn().mockResolvedValue(undefined);
  const updateCounters = vi.fn().mockResolvedValue(undefined);

  const result = await runInstallPost(
    { skillSlug: 'playwright-e2e', action: 'install', agents: ['cursor'] },
    { selectBySlug, selectByName, insertEvent, updateCounters },
  );

  expect(result).toEqual({ status: 200, body: { success: true } });
  expect(selectBySlug).toHaveBeenCalledWith('playwright-e2e');
  expect(selectByName).not.toHaveBeenCalled();
  expect(insertEvent).toHaveBeenCalledWith(
    expect.objectContaining({ agentType: 'cursor', installType: 'add' }),
  );
  expect(updateCounters).toHaveBeenCalledTimes(1);
});
\`\`\`

The \`runInstallPost\` adapter in this sample stands for a thin route harness, not app code. A repo test can instead mock the Drizzle client and call \`POST\` with a real \`NextRequest\`. Keep the same branch and call-count checks in either form.

Run the pure table first in local work, then the route group after changes to lookup or writes. The [API testing practices guide](/blog/api-testing-best-practices-guide) offers more harness forms, but this four-step order keeps the cause clear.

## Telemetry schema compatibility: Assertions and Diagnostics

Telemetry schema compatibility needs checks at five levels: mapped state, branch choice, response status, response body, and side effects. A success body alone proves almost nothing because the endpoint hides several faults by design.

For state, compare the whole mapped object or \`null\`. For branch choice, check slug, name, and direct UUID paths through call counts and exact args. For the write, save the inserted skill ID, agent, action, and country.

For count rules, check one update after add and none after remove or update. Do not infer this from the insert type because the update is a new call. A missing check can let install totals grow by mistake without failing the suite.

Failure logs should keep the client version and chosen ID branch. Report the case name, mapped ID kind, planned lookup order, real DB call count, response status, and failed side effect. Do not dump full request headers or all environment data.

The suite should show bad JSON apart from a valid object with no ID. Both are request faults, but the route catches JSON parse errors and returns success, while the valid empty object returns 400. That current split needs a direct test if it stays.

Caught lookup, insert, or update errors also return success. To test that fail-soft rule, force each service to reject in its own case and check that no later calls run. Name those cases as error rule checks rather than good event writes.

The helper has no schema library, so field rules come straight from its type guards and branches. If a schema is added later, keep these black-box fixtures because they stand for public input forms. Replace inner checks only when a rule changes on purpose.

A good failure name should say what went wrong in plain terms. For example, use "legacy remove wrote an add" or "slug miss skipped name lookup" instead of a broad route error. Clear names let the owner rerun one case and see the same fault fast.

Store safe IDs and action names in the log, but do not print full request data. The suite needs enough proof to find the bad path and no more. This keeps CI output short while still showing the failed promise.

Run the same set with one change at a time. That rule keeps failed jobs small and makes the first bad branch easy to see.

Use the [contract testing article](/blog/api-contract-testing-microservices) to coordinate a future client and server version matrix. The immediate suite should remain runnable inside the web package without a deployed service.

## What Regressions and Boundaries Prevent False Confidence?

The largest false pass comes from treating each 200 response as a saved event. Unknown skills and caught faults both return success without proof of an insert. Response checks must be paired with select, insert, and update counts.

Another risk is stubbing \`normalizeInstallEvent\` in route tests and using only ready-made events. That can prove write paths, but it cannot prove real CLI bodies reach those paths. Keep at least one full route case for each payload form.

Do not make the unknown-skill rule part of the pure helper. The helper only checks and maps an ID, while the route sees if that ID matches a stored row. Mixing those jobs would make unit failures depend on DB fixtures.

The test suite should not claim delivery, consent, or user ID rules. The [telemetry opt-out article](/blog/qaskills-cli-disable-telemetry-do-not-track) covers client suppression, while this endpoint gets anonymous events and reads only a country header for storage.

Broad API safety belongs in other checks. The [API testing guide](/blog/api-testing-best-practices-guide) can frame bad requests and service faults, but this matrix owns valid forms, lookup order, action mapping, agent fallback, and fail-soft responses.

Add a post-change case when one of these repo rules moves: ID order, UUID syntax, action names, agent order, lookup order, unknown ID rules, insert fields, or add counts. Each case should fail for one clear reason and leave safe log values.

Keep fixture values stable and descriptive. A random UUID is useful only if the test records it and treats it as the direct branch. A recognizable slug and display name make query order failures easier to understand.

Finally, run both the unit file and route group before changing the CLI payload. The [getting started route](/getting-started) can confirm the documented command flow, while tests confirm the receiver contract independent of documentation.

## Frequently Asked Questions

### How do you test current, legacy, and upcoming CLI install payloads?

Send a named fixture for each client form through the real helper, then compare the full event shape. Pass key results through the route and check lookup order, insert values, count updates, response status, and body. This pair catches both field drift and route misuse.

### What must a legacy cli telemetry payload preserve?

It must keep the UUID or text ID, old install type, and direct agent value when those fields are set. Tests should confirm the UUID flag, action map, and agent order together. A route case should prove the mapped values reach storage without an extra lookup for UUID input.

### Why test skill slug telemetry normalization separately?

A supplied slug wins over \`skillId\`, even when the latter looks like a UUID. A focused case proves the helper picks the slug and marks it as non-UUID. The route check then confirms slug lookup runs first and the inserted event uses the resolved DB ID.

### Which cases belong in install action mapping tests?

Cover add through the install or default path, remove through current and legacy fields, update through both aliases, and an unexpected action. Assert the mapped value plus every other normalized field. At route level, add updates counters once, while remove and update never change those counters.

### What does agent type fallback testing need to assert?

Check that direct \`agentType\` wins, the first string in \`agents\` is the next choice, non-string items are dropped, and no valid value becomes \`unknown\`. Then save the insert object so a right mapped agent cannot be lost between parsing and storage.

### How is telemetry schema compatibility different from silent success?

Compatibility describes how valid payload forms become one event and reach the right route branch. Silent success is an endpoint rule for unknown skills and caught faults. Tests must check side effects with responses so a 200 without an insert cannot look like a saved event.

## Conclusion

Install telemetry compatibility tests make payload change clear across mapping, lookup, storage, and counts. The known contract keeps current, old, and new IDs in one event shape while it keeps distinct results for bad input, unknown skills, and caught faults.

[Browse verified QA skills](/skills), then attach the compatibility matrix to the CLI telemetry post-flow before changing payload fields. Use the [QASkills blog](/blog) to keep related receiver and client checks linked to that review.`,
};
