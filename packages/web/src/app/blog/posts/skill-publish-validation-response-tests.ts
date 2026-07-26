import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Skill publish validation response tests',
  description:
    'skill publish validation response tests: build a code-backed QA plan with verified QASkills paths, matrices, assertions, and regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'skill publish validation response tests',
  keywords: [
    'skill publish validation response tests',
    'zod api error response test',
    'skill description length validation',
    'github url validation test',
    'publish request issue array',
    'nextjs post schema testing',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'how-to-write-high-quality-qa-skills',
    'malformed-skill-md-frontmatter-parser-tests',
    'testing-skill-md-yaml-frontmatter-roundtrip',
  ],
  sources: [
    'https://zod.dev/api',
    'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html',
  ],
  repoEvidence: [
    'packages/web/src/app/api/skills/route.ts:publishSkillSchema and POST safeParse',
    'packages/shared/src/schemas/skill-schema.ts:shared skill validation',
  ],
  content: `Skill publish validation response tests should send a valid control, every field boundary, and one payload with several faults. For each rejection, assert status 400, the full joined error string, every ordered Zod issue, and zero database calls. Then compare route fields with the shared schema instead of assuming both contracts match.

This plan tests the publish request before persistence, while the [publishing guide](/how-to-publish) explains the user workflow. It treats source code as the authority for current behavior and keeps broader writing advice outside the route contract.

## Skill publish validation response tests: What Must the Suite Prove?

Skill publish validation response tests must prove that invalid request data stops after parsing and schema checks. The response must contain a readable error formed from all issue messages, plus the original structured issue list returned by Zod.

The owning branch appears in \`packages/web/src/app/api/skills/route.ts\`. After authentication, \`POST\` reads JSON, calls \`publishSkillSchema.safeParse(body)\`, joins issue messages with semicolons, and returns status 400 when parsing fails. No slug query, skill insert, user counter update, or alert lookup should occur after that return.

A strong suite starts with one valid request because negative cases need a working control. That request should reach the slug lookup and insert seam, proving the harness can pass validation. The negative rows then change one field at a time and confirm that those persistence seams remain untouched.

The route schema requires a nonempty name and a description from 10 through 500 characters. It accepts empty arrays for testing types and languages because those fields have empty-array defaults. That detail differs from the shared creation schema, so skill publish validation response tests must not import expectations from another layer.

The [Zod API reference](https://zod.dev/api) shows that \`safeParse\` returns a success result or an error whose \`issues\` retain messages and paths. QASkills adds the combined top-level text itself. Tests therefore need both layers of assertions, not just a generic status check.

Observable pass criteria include status, JSON shape, ordered issue paths, issue codes, joined text, and side-effect counts. A snapshot alone is weak because it can approve unrelated fields while hiding an extra query. Explicit assertions make the failing boundary clear.

### Build a small proof set

Start with one good body that uses short names, plain text, fixed list values, and a known test user. Store it in the test file so each row shows only one field changed from that clear base. That small gap makes the cause plain when a check fails after a route or schema edit.

Give each bad row a short label that names the field, input, and planned stop point for the request. A label like \`description 501 stops before slug read\` tells the team what broke without a large trace. Print the text size in the report, but do not print the full long value.

Use one fresh set of spies for each row, and clear all call counts before the route starts. This step keeps work from a prior case from making the next bad body seem less safe. It also lets the report show which read or write was the first call that should not exist.

Use the [skills directory](/skills) only for realistic field vocabulary, not live test data. Every fixture should remain local and fixed, so registry changes cannot alter a validation result.

## Which QASkills Code Paths Own This Contract?

Two code paths define the relevant contract, and they serve different entry points. The transport schema lives in \`packages/web/src/app/api/skills/route.ts\`, while reusable skill validation lives in \`packages/shared/src/schemas/skill-schema.ts\`.

The route schema includes transport and persistence fields such as \`slug\`, \`fullDescription\`, \`agents\`, \`license\`, and \`tags\`. It also supplies defaults before later route logic computes a slug and quality score. Route tests should assert the parsed request behavior visible through \`POST\`, rather than exporting this private schema just for test access.

The shared file exports \`skillFrontmatterSchema\`, \`skillCreateSchema\`, and \`skillSearchSchema\`. Its \`skillCreateSchema\` requires at least one testing type and language, plus a URL-shaped \`githubUrl\`. The frontmatter schema also requires version, author, and license fields that the route can default.

That split is intentional evidence, not a claim that one schema is incorrect. A web publish request and a complete SKILL.md document do not carry identical fields. The [SKILL.md format guide](/blog/skill-md-format-guide) covers the document shape, while this suite records where the two validation surfaces overlap.

Keep ownership visible in test names. Prefix route cases with \`POST publish\`, and prefix shared cases with the exported schema name. This naming prevents a shared-schema failure from being reported as a route response regression.

The [OWASP input validation guide](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) says to check unsafe input soon and to test both form and meaning. Here, source makes a smaller promise: QASkills checks the body after auth and before a slug read or insert.

Skill publish validation response tests should mock authentication as a successful known user for schema rows. An unauthenticated request returns 401 before body parsing, so mixing that state into boundary tests would exercise the wrong branch.

Repository evidence should stay in the failure report. Include \`packages/web/src/app/api/skills/route.ts\` for response behavior and \`packages/shared/src/schemas/skill-schema.ts\` for cross-layer comparison. Those paths let a reviewer verify each expected limit without guessing.

## Zod api error response test: Baseline Cases

A zod api error response test needs three baseline groups: valid input, one invalid field, and several invalid fields. Together they prove the harness reaches validation, retains issue detail, and joins more than one message in the same issue order.

Build a valid request with a short name, a 10-character description, arrays for every list field, and an empty GitHub URL. The route explicitly accepts an empty URL through a literal alternative. Stub the slug lookup and insert only for this positive control.

For the first negative row, omit \`name\` or send an empty string. Zod should create a name issue, and the route should return \`Validation failed: Name is required\`. Assert the issue path is \`['name']\`, then assert the lookup and insert doubles both have zero calls.

For a type failure, send \`name: 9\` rather than another empty string. The message can depend on the installed Zod version, so derive the exact expected issue from the repository dependency during implementation. Still pin the issue code and path because callers receive both in the structured array.

The combined case should use stable custom messages where possible. An empty name, a nine-character description, and a malformed URL produce issues in object field order under the current schema. Assert the full \`issues\` projection and the semicolon-joined message, not a loose substring.

Skill publish validation response tests also need malformed JSON, but that case belongs beside schema cases rather than inside their table. \`request.json()\` throws before \`safeParse\`, and the outer catch converts it to a 500 response with the route's generic server message. Lock that current behavior without describing it as ideal validation guidance.

Do not use production authentication, a live database, or a real email provider. A controlled user is enough to cross the auth gate, while zero-call assertions prove rejected data never reaches persistence. The [malformed frontmatter parser article](/blog/malformed-skill-md-frontmatter-parser-tests) covers file parsing, which is a separate boundary.

Repeat one invalid request with optional fields omitted. Defaults should never matter because the required description or name still fails. This case catches a refactor that performs database work with partially parsed input.

Finally, compare response headers only where consumers depend on them. JSON decoding and exact status are core observations; framework-owned header formatting is less useful than issue content. Keep the zod api error response test focused on fields the route creates.

## Skill description length validation: Test Matrix

Skill description length validation needs checks at 9, 10, 500, and 501 plain text marks. Values at each set edge should pass the schema, while those just outside should yield a description issue and stop all database work.

The matrix below combines those length edges with name, URL, array, and multi-issue cases. Each expected branch comes from \`publishSkillSchema\` and the early return in \`packages/web/src/app/api/skills/route.ts\`.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Missing and blank name | Omit name, then send an empty string | Name minimum check | 400 with name issue and joined error | No slug query or insert | Either request reaches persistence |
| Description below and above limits | Send 9 and 501 characters | Description min and max checks | 400 with description path | No database calls | Boundary accepted or wrong path |
| Invalid GitHub URL | Send \`not-a-url\` | URL alternative fails | 400 with \`Invalid GitHub URL\` | No slug lookup | Empty and invalid values behave alike |
| Empty testing types or languages | Send both arrays empty | Route arrays accept empty values | Validation passes to slug lookup | Later work may begin | Shared minimum copied into route |
| Multiple invalid fields | Blank name, short description, bad URL | Failed \`safeParse\` joins issues | 400 with complete issue array | No persistence or alerts | Missing issue or reordered text |

### Make each edge easy to inspect

Create the long text with a small helper that takes the exact size and one plain ASCII fill mark. Assert the helper result before the request runs, so a bad fixture cannot look like a route fault. This check is cheap and makes every lower, valid, and upper edge clear in the log.

Project each issue to its code, first path part, and message before the main comparison runs. Keep the full body close by for a failed case, but show the small view first in CI. A short diff helps the team spot a new path or lost message with far less noise.

For a valid edge, make the slug read return an existing row and expect the later 409 branch. That response proves the schema let the body pass, yet it avoids a real insert and any mail work. Use the same known slug for both valid size edges so the only changed fact is text length.

The valid length values require a persistence seam that can stop after validation without causing an unrelated failure. Return a duplicate slug from the lookup and assert status 409, which proves validation passed while avoiding an insert. This keeps the case narrow.

For 9 and 501 characters, assert one description issue and status 400. Generate repeated ASCII characters so hidden whitespace does not change length. Include the measured fixture length in the test name or diagnostic output.

Empty testing type and language arrays are a critical compatibility row. The web route defaults these arrays to empty and does not set a minimum. By contrast, \`skillCreateSchema\` in \`packages/shared/src/schemas/skill-schema.ts\` requires at least one item in each.

That difference means the table must report which schema produced each result. A shared test expecting rejection and a route test expecting validation success can both be correct. The [high-quality skill guide](/blog/how-to-write-high-quality-qa-skills) may recommend richer metadata, but recommendations are not route constraints.

Skill publish validation response tests should include a missing description as well as short text. Missing input creates a type or required issue, while nine characters reaches the minimum-length rule. Those branches should not share an overly broad assertion.

Capture \`issues.map(({ code, path, message }) => ...)\` for readable failures. Full Zod issue objects can contain version-specific fields, but the route returns them all. A focused projection plus an assertion that the array exists balances stable diagnosis with contract coverage.

## How Should Github url validation test Be Exercised?

A github url validation test should check the route's real URL rule, not infer a rule from the field name. The schema accepts a general URL or blank text; it does not check host, scheme, repo state, or reachability.

Use three passing values: omitted, empty, and a well-formed HTTPS URL. Use malformed text as the failing value. A valid URL on a non-GitHub host currently passes, and the test should document that fact rather than inventing a host check.

The route supplies an empty default when the field is absent. It later stores \`data.githubUrl || ''\`, so omitted and empty values converge before insertion. A validation test can stop at the duplicate-slug seam and still prove both values crossed \`safeParse\`.

This is where the Zod documentation matters. Its [URL section](https://zod.dev/api) describes a URL validator based on runtime URL parsing and notes that it can be permissive. The repository adds a custom message, \`Invalid GitHub URL\`, but the label does not make the validator GitHub-specific.

Skill publish validation response tests should therefore avoid DNS calls and repository probes. Such calls would add network variance while testing behavior absent from the route. If product requirements later restrict hosts, that change needs a schema update and new negative cases.

\`\`\`typescript
import { expect, test, vi } from 'vitest';
import { POST } from '@/app/api/skills/route';

test.each([
  ['blank name', { name: '', description: 'valid text' }, ['name']],
  ['short description', { name: 'A', description: '123456789' }, ['description']],
  ['bad url', { name: 'A', description: 'valid text', githubUrl: 'bad' }, ['githubUrl']],
])('rejects %s before database work', async (_name, body, paths) => {
  const response = await POST(makePublishRequest(body));
  const payload = await response.json();

  expect(response.status).toBe(400);
  expect(payload.error).toMatch(/^Validation failed: /);
  expect(payload.issues.map((issue: { path: string[] }) => issue.path[0])).toEqual(paths);
  expect(selectSkillBySlug).not.toHaveBeenCalled();
  expect(insertSkill).not.toHaveBeenCalled();
});
\`\`\`

This example calls the exported route and inspects its public JSON contract. The test harness must mock \`getAuthUser\` before importing the module, then expose narrow database doubles that can report unexpected work.

Add a separate passing case for \`https://example.com/repository\`. Expect it to reach the slug lookup under current behavior. Naming that case "general URL accepted" prevents a reviewer from reading the custom error text as stronger host validation.

Use the [getting started route](/getting-started) for a manual publish setup, but keep github url validation test runs local. A live URL cannot prove schema parsing more clearly than a fixed string.

## Step-by-Step Publish request issue array Procedure

A publish request issue array procedure should build expectations from both schemas, invoke the real route boundary, stop rejected requests before persistence, and record intentional differences. Keep the following steps contiguous so each failed stage points to one missing proof.

1. Derive boundary fixtures from \`publishSkillSchema\` behavior and the exported shared skill schemas.
2. POST each fixture and capture status, top-level error text, and ordered issue details.
3. Assert invalid payloads never query slugs, insert skills, update users, or start alert work.
4. Compare route validation with shared SKILL.md validation and document each intended difference.

Begin by creating one factory that returns a complete valid route body. Override one property per row, and avoid spreading invalid values across unrelated defaults. This pattern keeps fixture review easy and prevents accidental missing fields.

The route schema is private, so derive expected behavior from the source and observe it through \`POST\`. The shared schemas are public exports, making direct \`safeParse\` tests appropriate there. The two styles respect their module boundaries.

\`\`\`typescript
import { describe, expect, test } from 'vitest';
import { skillCreateSchema, skillFrontmatterSchema } from '@qaskills/shared';

describe('shared skill validation boundaries', () => {
  test('requires route-independent creation arrays', () => {
    const result = skillCreateSchema.safeParse({
      name: 'API checks',
      description: 'A complete test skill description',
      githubUrl: 'https://example.com/skill',
      testingTypes: [],
      frameworks: [],
      languages: [],
      domains: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual([
        'testingTypes',
        'languages',
      ]);
    }
  });
});
\`\`\`

This cross-layer example proves the shared minimums without claiming the route has them. Add a frontmatter case for required version, author, and license fields, because those requirements belong to complete document metadata.

Run route rows before shared rows in the report, then print a small difference list. Expected differences should not fail the build, while a new unreviewed difference should. This makes schema drift visible without forcing false equality.

Skill publish validation response tests should retain the response body when a row fails. Include the fixture label, status, joined message, projected issues, and database call counts. Never print auth cookies or unrelated environment values.

Use the [blog article on YAML round trips](/blog/testing-skill-md-yaml-frontmatter-roundtrip) after route checks when validating document serialization. The current procedure ends at schema comparison and does not claim a file was written.

## Nextjs post schema testing: Assertions and Diagnostics

Nextjs post schema testing should assert the response and the absence of later work in the same case. A status-only check can pass when the route returns the wrong error body or performs a query before failing.

For each invalid fixture, assert one call to \`request.json\` through the real \`NextRequest\` body, status 400, JSON content, complete error text, and issue projection. Then assert zero calls for slug selection, insertion, user updates, preference selection, and email sending.

Order is part of the current combined message because the route maps the Zod issue array without sorting. Pin order only for fixtures whose field order is stable in the schema. For individual boundary rows, assert a one-item array and avoid needless ordering assumptions.

Malformed JSON belongs to a distinct expectation because the outer catch returns status 500. Authentication failure also deserves its own row because it returns 401 before parsing. These tests prove branch selection and stop a schema fixture from passing through the wrong guard.

On valid input, assert that defaults become visible at the insert seam. Omitted \`version\`, \`license\`, \`fullDescription\`, and list fields receive route defaults. This positive case checks parsing output while a duplicate-slug case checks validation without insertion.

The diagnostic should name input size rather than dump a 501-character description. Report \`descriptionLength: 501\`, the issue path, and the response text. Small logs are easier to compare and do not bury the first useful fact.

### Keep the failed run easy to read

Write one report row with the case name, status, issue paths, issue codes, and every blocked call count. Put the expected row next to the actual row, then mark only fields that do not match. This view is fast to scan and keeps the route fault close to its source.

When several issues are expected, show their order as a short list of field names before full message text. If order alone changed, the team can judge whether the route contract or just a test rule needs work. If a field vanished, the same list makes that loss plain at once.

Run the good control first, but make no later row depend on data that it wrote or changed. Each bad case should own its body, auth result, and spies from start to end. This keeps the suite safe for a new order, a single-row run, or work split across test jobs.

Skill publish validation response tests should run without \`RESEND_API_KEY\` for rejection rows. Even so, keep a send double and assert no calls if the module can reach it. This protects against future movement of alert logic before validation.

The [QASkills blog](/blog) groups adjacent API and parser checks. Keep this test suite owned by the publish route so a failure points directly to one request contract.

## What Regressions and Boundaries Prevent False Confidence?

False confidence begins when route and shared schemas are treated as aliases. They overlap on name, description, URL, and several arrays, but their defaults and minimums differ. Tests must preserve that distinction in fixtures and labels.

Do not claim empty testing types or languages are rejected by the current route. They pass schema validation today. If product rules require rejection, change the route first and update skill publish validation response tests in the same review.

Do not infer that \`githubUrl\` requires GitHub, HTTPS, or a reachable repository. Current code accepts any value that passes its URL validator, plus an empty string. A test that expects host filtering would fail for a requirement not implemented.

Keep malformed JSON separate from Zod issue assertions. Since body parsing throws before \`safeParse\`, no structured issue array exists for that branch. A future route-level JSON error response would be a deliberate contract change and should update its expected status.

Avoid calling private helpers through source rewrites. The public \`POST\` function gives enough evidence through responses and mock calls. Direct shared-schema tests remain useful because those schemas are intentionally exported.

Add regression rows whenever the route schema changes a limit, default, optional field, or message. Also rerun the multi-issue row when the Zod dependency changes, because issue shape and wording can affect clients. The [publishing guide](/how-to-publish) should stay aligned with accepted request data.

The key safety check is an early stop, not a claim that schema checks block each kind of attack. OWASP keeps input checks apart from other guards. Keep auth, duplicate slug, database faults, and mail faults in their own suites.

Finally, verify the valid control still reaches its planned seam after each change. A collection of negative passes can remain green when every request fails too early. Positive proof closes that gap.

## Frequently Asked Questions

### How do you test every publish field boundary and its issue array?

Create one valid body, then vary each constrained field immediately below, at, and above its boundary. Assert status, joined error text, issue code, issue path, and zero persistence calls for every rejection. Add one multi-field body to verify the complete ordered issue array and semicolon joining.

### What should a zod api error response test assert?

Assert the 400 status, the exact \`Validation failed:\` prefix, the combined issue messages, and a focused projection of every structured issue. Also prove that authentication succeeded and database work did not start. Those checks show the request reached schema validation and stopped at the intended branch.

### Which values cover skill description length validation?

Use 9, 10, 500, and 501 ASCII characters, plus a missing value and a non-string value. Ten and 500 should cross route validation, while 9 and 501 should return description issues. Report fixture length in failures instead of printing the entire long input.

### Does github url validation test require a GitHub host?

No. The current route uses a general URL validator, accepts an empty string, and adds a GitHub-labeled error message. Test omitted, empty, valid general URL, and malformed text cases. Do not expect host, protocol, reachability, or repository checks until source code implements them.

### Why compare the publish request issue array with shared schemas?

The two schemas differ, and the test should not force them to match. The shared create schema needs nonempty testing type and language lists, while the web route allows blank defaults. Naming each owner helps the team judge if a gap is planned, old, or new.

### Where should nextjs post schema testing stop side effects?

It should stop after the failed \`safeParse\` branch and before slug selection, skill insertion, user counter updates, subscriber queries, or email sends. Assert zero calls at those seams. A correct 400 response is incomplete proof if invalid data still triggers later work.

## Conclusion

Skill publish validation response tests should pair every field edge with exact response details and zero-call persistence checks. The suite should also preserve known differences between the route schema and shared document schemas, rather than hiding them behind one generic fixture.

[Open how-to-publish](/how-to-publish) and add every schema boundary to the API validation regression matrix. Then use the [skills catalog](/skills) to choose realistic field labels while keeping all test data local and controlled.`,
};
