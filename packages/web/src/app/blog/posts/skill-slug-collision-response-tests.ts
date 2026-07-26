import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Skill slug collision response tests',
  description:
    'skill slug collision response tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'skill slug collision response tests',
  keywords: [
    'skill slug collision response tests',
    'duplicate skill slug 409',
    'skill name slug normalization',
    'empty generated slug test',
    'publish slug uniqueness test',
    'special character slug testing',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'how-to-write-high-quality-qa-skills',
    'malformed-skill-md-frontmatter-parser-tests',
    'testing-skill-md-yaml-frontmatter-roundtrip',
  ],
  sources: [
    'https://www.rfc-editor.org/info/rfc9110',
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
  ],
  repoEvidence: [
    'packages/web/src/app/api/skills/route.ts:generateSlug and uniqueness lookup',
    'packages/web/src/db/schema/skills.ts:slug unique column',
  ],
  content: `Skill slug collision response tests submit generated and explicit identifiers, inspect the exact lookup value, and verify empty or repeated results never reach insertion. Generated names are normalized before lookup, while nonempty supplied slugs currently pass through unchanged. A known duplicate should return 409 with the repository error body.

This plan separates input validation, canonical identity, preflight lookup, and database enforcement. That separation matters because each boundary rejects a different defect and can return a different status. Start with the [publishing guide](/how-to-publish), then lock every observed slug into focused assertions.

## Skill slug collision response tests: What Must the Suite Prove?

Skill slug collision response tests must prove which raw value becomes the stored identity, whether that value is valid, and what happens when it already exists. The suite checks generated names, supplied slugs, empty generated output, lookup calls, status codes, error JSON, and insert counts.

The current route chooses a nonempty supplied \`slug\` directly. Otherwise, it calls \`generateSlug(data.name)\`, which lowercases the name, replaces one or more non-alphanumeric characters with a hyphen, and trims one leading or trailing hyphen. Tests must not claim that an explicit slug receives this normalization.

That passthrough is a significant boundary. An explicit value can contain uppercase letters or spaces because the request schema only makes it optional and limits its length. A publish slug uniqueness test should capture that current behavior, while a desired canonical policy can be asserted separately after code changes.

When generation returns an empty string, the route responds with status 400 and \`Could not generate a valid slug from the skill name.\` It performs this check before the uniqueness query. An empty generated slug test should therefore assert no select and no insert.

When the lookup finds a row, the route returns status 409 with a message naming the slug. The [HTTP semantics reference](https://www.rfc-editor.org/info/rfc9110) defines status behavior, while the repository supplies the exact response contract under test.

The database column is also unique and non-null. That rule protects storage if two requests pass the preflight lookup together, although the current generic catch would turn a constraint exception into status 500. Keep preflight collision behavior and concurrent insert behavior in different cases.

Use the [QA skills catalog](/skills) only as a consumer view after the API contract passes. A visible catalog card cannot prove which raw slug reached the lookup or why another publish failed.

## Which QASkills Code Paths Own This Contract?

The route evidence is \`packages/web/src/app/api/skills/route.ts:generateSlug and uniqueness lookup\`. It contains request parsing, generated-slug logic, the empty check, the existing-row select, the 409 response, and the later insert. This path owns all transport behavior described here.

The persistence evidence is \`packages/web/src/db/schema/skills.ts:slug unique column\`. The column uses text storage, requires a value, and declares uniqueness. The [PostgreSQL constraints guide](https://www.postgresql.org/docs/current/ddl-constraints.html) explains that a unique constraint rejects equal stored values.

Authentication and Zod parsing occur before slug work. A route test needs an authenticated application user and an otherwise valid description. If parsing fails first, a 400 response does not prove the empty generated slug branch ran.

The generated helper is private to the module, so the strongest test drives POST and observes the lookup or created record. Copying the transformation into test code can still support table planning, but it cannot replace a request-level assertion against the route.

The uniqueness select asks for an existing skill ID where the stored slug equals the chosen value, then applies a limit of one. If a record appears, no quality score, insert, publisher count update, or email subscriber work should occur. Those negative side effects make the 409 branch observable.

After a unique slug passes the lookup, the insert stores the same selected value. Capture the select argument and returned skill slug together. A mismatch would create a gap where the preflight checks one identity while persistence stores another.

The [skill format guide](/blog/skill-md-format-guide) covers document fields and frontmatter. Keep malformed content outside collision fixtures so validation errors cannot masquerade as identity failures.

## Duplicate skill slug 409: Baseline Cases

Create one stored skill with a known slug and prepare a valid authenticated publish request that chooses the same value. The response should be 409, the JSON error should name that slug, and the skill insert should have zero calls. This is the direct duplicate skill slug 409 case.

Run that baseline once with a generated value. For example, a name containing mixed case and repeated spaces should produce the same lowercase hyphenated slug as the fixture. This proves normalization occurs before the preflight equality lookup.

Run it again with a nonempty supplied slug that exactly matches the fixture. The route should use that value without calling generation and should return the same 409 contract. Do not alter case in this case because database equality compares the actual chosen text.

Add a near-collision control with a unique suffix. It should pass the lookup, create one row, and return status 201 with the stored slug. A suite containing only duplicates could pass if the insert branch were broken for every request.

Use two case variants as a documented boundary. Since supplied slugs pass through and PostgreSQL text uniqueness compares stored values under database rules, do not assume \`My-Skill\` collides with \`my-skill\`. Record actual values and keep desired canonical policy distinct from current code.

An empty supplied string follows the generated-name branch because the route checks both presence and length. Pair it with a normal name and assert the generated slug is used. Then pair it with a punctuation-only name and assert the 400 empty result.

Skill slug collision response tests should verify the lookup count. Empty output produces no lookup, a known duplicate produces one lookup and no insert, and a unique value produces one lookup plus one insert. These counts expose accidental branch fallthrough.

Read the [quality skill writing guide](/blog/how-to-write-high-quality-qa-skills) for content quality. Collision tests should use one valid minimal body and vary only name, explicit slug, and stored identity.

### Give each raw value a clear case name

Name each row from the change it should cause, such as lower case, joined gaps, trim ends, empty result, or exact clash. Put the raw name and raw slug next to that name in the case map, so the input can be read with no test code in view. Keep the expected chosen slug in the same row and mark whether it came from the name or direct slug field.

Use short ASCII words for the core map because their output is easy to check by sight and easy to show in a failed job. Add one row at a time for each new edge found in real code review, rather than one huge string that blends many rules. A small row tells the team which part of the slug step changed and which links may need a check.

Seed known clash rows before the request set starts, then save their IDs under names that show which case owns them. Query the seed once and fail setup if its slug is not the exact text in the case map. This guards against a cleanup leak or old row that could turn a unique case into a false 409.

## Skill name slug normalization: Test Matrix

Skill name slug normalization needs a matrix that separates raw name, supplied value, selected slug, lookup result, and response. The rows below follow the current route exactly, including explicit-slug passthrough. Any future normalization change should update expectations intentionally.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Plain skill name | name \`API Testing\`, no slug | Generated value \`api-testing\` | 201 when unique | One lookup and one insert | Stored slug differs |
| Mixed case and spaces | name \`  API   Contract  \` | Generated value \`api-contract\` | 201 when unique | Canonical generated insert | Extra or edge hyphens |
| Punctuation-only name | name \`!!!\`, no slug | Generated value is empty | 400 with generation error | No lookup or insert | Empty value reaches database |
| Explicit valid slug | nonempty \`custom-skill\` | Supplied value used directly | 201 when unique | Exact supplied value stored | Route rewrites unexpectedly |
| Existing slug | generated or supplied exact match | Existing-row lookup returns ID | 409 with named error | No insert | 201, 500, or insert call |

The mixed-input row should include separators at both edges and repeated separators inside. Generation replaces each non-alphanumeric run with one hyphen and trims an edge hyphen. Assert the whole value, not merely a lowercase prefix.

The punctuation row proves validation and slug selection are separate. The name passes the schema's nonempty string rule, yet its normalized output becomes empty. This is why an empty generated slug test must drive POST rather than testing request parsing alone.

The supplied row records the present passthrough behavior. If product policy later requires all slugs to use generated normalization, add a failing expectation before modifying the route. Current documentation should not present that future behavior as already implemented.

The duplicate row needs exact response JSON. The message is \`A skill with the slug "<slug>" already exists. Please choose a different name.\` Assert status and message together, while allowing unrelated response headers to remain framework-owned.

Include a database duplicate case outside this table's preflight result. Two concurrent unique-looking requests can both see no row, then one insert loses at the unique column. That race currently reaches the generic 500 catch rather than the explicit 409 branch.

The [frontmatter parser test guide](/blog/malformed-skill-md-frontmatter-parser-tests) helps isolate parsing boundaries. Use it separately because a parser error happens before this API's identity contract.

## How Should Empty generated slug test Be Exercised?

An empty generated slug test should send a valid request whose name contains characters removed by \`generateSlug\`, while omitting the optional slug. Punctuation such as \`!!!\` passes the name length rule but becomes empty after replacement and edge trimming. The route should answer 400 before database access.

Configure authentication first and make every other field valid. Use a description longer than the schema minimum and valid arrays. If authentication or parsing fails, the same status class may appear while the intended branch remains untested.

Spy on the database chain at the highest useful boundary. Assert no uniqueness select and no insert occurred after the empty result. Also assert no publisher counter update or alert work started, because those operations appear later in the handler.

The first code example uses an authenticated request fixture and verifies generated, empty, and duplicate branches through HTTP. Its fixture records persisted rows rather than importing the private helper.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test.describe('skill slug publication contract', () => {
  test('normalizes generated names and rejects collisions', async ({ request }) => {
    const input = {
      name: 'API   Contract!',
      description: 'A valid description for a focused publication contract test.',
      testingTypes: ['api'],
      languages: ['typescript'],
    };

    const created = await request.post('/api/skills', { data: input });
    expect(created.status()).toBe(201);
    expect((await created.json()).skill.slug).toBe('api-contract');

    const duplicate = await request.post('/api/skills', { data: input });
    expect(duplicate.status()).toBe(409);
    expect((await duplicate.json()).error).toBe(
      'A skill with the slug "api-contract" already exists. Please choose a different name.',
    );
  });

  test('rejects a generated empty slug before persistence', async ({ request }) => {
    const response = await request.post('/api/skills', {
      data: {
        name: '!!!',
        description: 'A valid description for an empty generated slug boundary.',
      },
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Could not generate a valid slug from the skill name.',
    });
  });
});
\`\`\`

The browser fixture must already authenticate a publisher and clean up its generated skill. Use a run-specific name when workers run in parallel, then derive the exact expected slug from that known input. Avoid random punctuation that makes failure output hard to repeat.

Add a separate explicit empty-string request. Since \`slug: ''\` falls back to generation, a normal name should still create its generated identity. This boundary prevents a future truthiness refactor from storing an empty supplied value.

Special character slug testing should include only ASCII examples for this contract because the helper accepts lowercase ASCII letters and digits. Broader international naming policy needs a product decision before tests encode an expected transliteration.

Use the [publishing contract page](/how-to-publish) to align fixture fields with the real endpoint. Keep the test body minimal so failures point to slug handling rather than optional metadata.

## Step-by-Step Publish slug uniqueness test Procedure

A publish slug uniqueness test should move from a table of raw values to route results and then database enforcement. This sequence separates expected normalization from lookup and storage. Keep one clean database namespace for every worker.

1. Create table-driven names and supplied slugs around every normalization boundary.
2. Capture the normalized value used by the uniqueness lookup.
3. Assert empty output is rejected and an existing slug returns the documented 409 response.
4. Prove only a unique canonical slug reaches the insert branch.

In step one, include plain words, mixed case, repeated separators, punctuation-only names, empty supplied values, and nonempty supplied values. State whether each row uses generation or passthrough. That label prevents ambiguous expected values.

In step two, observe the value passed to \`eq(skills.slug, slug)\` or inspect a test query log. Compare it with the response or inserted row. This proves selection and persistence share one identity.

In step three, preload the collision fixture and assert the complete error. Also assert no write-side operations occur. An error message without a zero insert count can hide faulty fallthrough.

In step four, create a unique generated value and a unique supplied value. Confirm each response is 201 and each stored slug matches the chosen branch. Then query by slug to verify exactly one record exists.

The schema-level example checks the unique column directly. It intentionally bypasses the preflight lookup so the database rule, not route logic, decides the second insert.

\`\`\`typescript
import { expect, it } from 'vitest';
import { db } from '@/db';
import { skills } from '@/db/schema';

it('rejects two stored skills with the same slug', async () => {
  const author = await seedUser();
  const base = {
    name: 'Collision fixture',
    slug: \`collision-\${author.id}\`,
    description: 'A database fixture for the unique skill slug rule.',
    authorId: author.id,
    authorName: author.username,
  };

  await db.insert(skills).values(base);
  await expect(
    db.insert(skills).values({ ...base, name: 'Second collision fixture' }),
  ).rejects.toThrow();
});
\`\`\`

Do not assert a database vendor's full error text unless the application deliberately maps it. The stable fact is that the second equal slug is rejected. Route-level status belongs in a separate test because the generic catch currently maps this late race to 500.

Review the [skill format reference](/blog/skill-md-format-guide) after identity checks pass. Slug uniqueness protects routing, while frontmatter quality protects the published content itself.

### Keep the preflight check and store rule apart

Run the known clash case with one request first, since that is the clean way to reach the named 409 branch. Save its status, body, select count, and zero write count in one small test result. This case should not need two calls or a forced race, and a store error means the test missed the branch it meant to reach.

Run the late clash case with two calls that both pass the first lookup before either write starts. The first store write may win and the next may fail at the unique rule, which is not the same path as a found row. Keep both call names in the log and show which one got each status, so the broad 500 can be traced to the late write.

Do not change the late clash test to expect the named 409 until the route maps that store fault on purpose. A new map should check the fault kind and the chosen slug before it sends a client-safe reply. This keeps an unrelated store fault from being mislabeled as a slug clash merely because both can occur near an insert.

## Special character slug testing: Assertions and Diagnostics

Special character slug testing should report raw name, supplied slug, selected branch, expected slug, actual lookup value, response status, and insert count. These fields explain a failure without printing the entire publication body. Keep the fixed description out of routine logs.

For generated values, compare exact output after lowercase conversion, separator replacement, and edge trimming. Include repeated spaces and punctuation in one case. A loose regular-expression check can pass while extra hyphens create a different route.

For supplied values, assert exact passthrough under current code. Include a normal explicit slug and one value that generation would change, then label the latter as a current-policy observation. Do not call that value canonical unless production begins normalizing it.

Skill slug collision response tests need status and side-effect assertions together. Empty generation yields 400 with no select, a known collision yields 409 with one select and no insert, and a unique identity yields 201 with one select and one insert.

Keep response diagnostics separate from database constraint diagnostics. A duplicate found during preflight has the explicit 409 body. A duplicate that races at insert currently reaches the catch block and returns a generic internal error.

Report the stored row ID only for test data. Also report the selected slug and branch, since those values locate the defect faster. Avoid authentication headers, cookies, and full user records.

Run the matrix after edits to schema validation, \`generateSlug\`, preflight lookup, the skills column, or publication routing. The [QASkills blog](/blog) can link those changes to parser and database checks without combining them into one job.

### Make slug diffs easy to review

For each failed row, print the raw name, raw slug field, chosen branch, expected slug, actual lookup text, and stored text if a write took place. Keep these fields on two short lines and quote empty strings, since a blank gap can be missed in plain logs. Add the status and error text last, after the value trail has shown where the first wrong step began.

When a change is planned, run the old and new slug maps against the same set and list only rows whose chosen text differs. Review each changed row for old links, known names, and clash risk before any data move is made. This diff is more useful than a wide snapshot because it ties each route change to one raw input.

Save the final case map beside the test and treat it as part of the API rule, not as a loose helper file. New rows should state why they exist in the test name or a short code note. Remove a row only when the product rule has changed and the old link plan has been dealt with.

Before skill slug collision response tests can approve a rule change, read the case map from top to foot and speak each raw value and chosen value as a pair. This quick pass can catch a stray dash, a lost digit, or a direct slug that the new code changed when the patch was meant to touch names only. Mark each changed pair in the pull request and state whether an old link can still reach the same skill.

Run one set with no slug field, one set with an empty slug field, and one set with a nonempty slug field. The first two sets should use the name path, while the last set should show the direct path that the code has now. Keep those three groups apart in the log so a branch switch stands out before a clash or write check starts.

For each group, start with a clean slug, then add one known clash and one near match that must stay clean. The clean row proves a write can pass, the clash row proves the right stop, and the near match guards against a check that is too broad. Use the same base words in all three rows, since a small text gap makes the edge plain to see.

When two calls race for one clean slug, hold both after their first lookup and let both writes start from the same known state. Save the call name, chosen slug, lookup result, write result, status, and final row ID in one short block. The block should show one stored row even if the route still needs work on the reply sent to the call that lost.

After a failed case, query the slug once and show the count and safe row IDs before cleanup starts. A route spy may say no write was made while a late task still has work in flight, so the store check must come after all call tasks end. This last read turns a process claim into a fact about the saved state.

Use fixed short words in the seed names and add the test run key at the end, not in the part whose slug rule is under test. That keeps each expected dash and case shift easy to work out by eye. Strip the run key in log labels when safe, but keep it in the raw and stored values used by checks.

Keep all test links local and do not open a live skill page as proof that a write was safe. The route reply and store row give a tighter check, while a page may add cache, auth, or view faults that hide the slug cause. A small page smoke check can run later once the slug set has passed.

## What Regressions and Boundaries Prevent False Confidence?

The first false signal is testing a copied slug helper instead of POST. A copied function can agree with its own expected table while the route chooses a supplied value or checks a different slug. Observe the actual lookup and inserted row.

The second is treating every 400 as empty generation. Authentication, malformed JSON, and Zod validation can fail earlier. Skill slug collision response tests should use valid setup and assert the exact generation error body.

The third is assuming explicit values are normalized. Current code uses any nonempty supplied slug directly, and the schema only limits length. Preserve that fact in tests until a deliberate canonical policy changes the route.

Do not rely only on the preflight lookup for concurrency. Two requests can both see no existing row before either inserts. The unique database column rejects equal values, but current route error mapping does not convert that late conflict into the documented duplicate skill slug 409.

Keep content validation separate from identity. The [malformed frontmatter article](/blog/malformed-skill-md-frontmatter-parser-tests) covers parse failures, while these fixtures should pass every non-slug rule. This prevents an unrelated 400 from looking like an identity check.

Case sensitivity, Unicode transliteration, reserved route words, and redirect policy are broader naming decisions. Current cited code does not define those behaviors beyond its ASCII transformation for generated values and passthrough for supplied values. Do not invent expectations for them.

After any normalization change, rerun old generated values, explicit values, empty output, exact collisions, near collisions, and concurrent inserts. Verify existing links still resolve before rewriting stored slugs. The [getting started page](/getting-started) should remain unaffected by internal test data.

## Frequently Asked Questions

### What do skill slug collision response tests verify?

They verify branch selection, the exact slug used for lookup, empty-output handling, duplicate status and message, insert counts, and stored identity. Generated names and supplied slugs need separate cases because current code normalizes only generated values and passes nonempty explicit values through unchanged.

### When should duplicate skill slug 409 be returned?

The route returns 409 when its preflight select finds an existing row with the chosen slug. The response names that value and asks for a different name. A unique-column error from two racing inserts currently reaches the generic catch, so test that later conflict separately.

### How does skill name slug normalization work today?

For generated values, the helper lowercases the name, converts each non-alphanumeric run to one hyphen, and removes an edge hyphen. If a nonempty slug is supplied, the route uses it directly instead. Tests should record which branch selected each expected identity.

### What makes an empty generated slug test valid?

Authenticate a publisher, send an otherwise valid body, omit the optional slug, and use a punctuation-only name. Assert status 400, the exact generation error, zero uniqueness lookups, and zero inserts. Those checks prove the request reached the intended branch rather than failing validation earlier.

### Why does publish slug uniqueness test need a database case?

The preflight lookup cannot prevent two requests from both observing no row. A direct duplicate insert proves the schema's unique column rejects equal stored slugs. Keep route response mapping in another case because the database exception and the explicit preflight 409 follow different code paths.

### Which inputs belong in special character slug testing?

Use mixed case, repeated spaces, leading punctuation, internal punctuation, trailing punctuation, digits, punctuation-only names, empty supplied strings, and nonempty supplied strings. State exact expected output for generated cases. Treat broader Unicode or reserved-word policy as undecided unless repository code defines it.

## Conclusion

Skill slug collision response tests prove the exact identity chosen by POST, reject empty generated output before queries, and lock the known duplicate response to 409. They also preserve an important current fact: explicit nonempty slugs bypass generation, while the database unique column handles late equal inserts separately.

[Open how-to-publish](/how-to-publish), review the publishing contract, and add the slug boundary table before changing naming or uniqueness logic. Use the [QA skills catalog](/skills) to confirm unique published routes after the suite passes.`,
};
