import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md publish schema drift Guide',
  description:
    'SKILL.md publish schema drift: compare local validation with publish input rules. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md publish schema drift',
  keywords: [
    'SKILL.md publish schema drift',
    'frontmatter API contract parity',
    'local publish validation mismatch',
    'shared Zod schema reuse',
    'skill creator server drift',
    'publish contract regression test',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'malformed-skill-md-frontmatter-parser-tests',
    'seed-skill-catalog-parser-regression-tests',
  ],
  sources: ['https://zod.dev/api', 'https://agentskills.io/specification'],
  repoEvidence: [
    'packages/shared/src/schemas/skill-schema.ts',
    'packages/web/src/app/api/skills/route.ts',
  ],
  content: `SKILL.md publish schema drift exists when local frontmatter checks and the web publish route give different results for equivalent metadata. Contract tests should run one fixture matrix through both boundaries and record expected differences. In this revision, required arrays and version syntax are stricter in the shared schema than in the route schema.

The goal is not to guess which side is correct. First show the gap with exact inputs, then choose one product rule and move both callers toward it.

## What does SKILL.md publish schema drift need to prove?

SKILL.md publish schema drift must prove whether the same skill facts are accepted, defaulted, or rejected at each public entry point. A useful report names the field, shared result, route result, and first error or success seam.

The local value rules live in \`packages/shared/src/schemas/skill-schema.ts\`. The \`skillFrontmatterSchema\` requires nonempty \`testingTypes\` and \`languages\`, plus name, description, version, author, and license. Its version rule accepts only three numeric parts.

The web rules live inside \`packages/web/src/app/api/skills/route.ts\`. Its private \`publishSkillSchema\` defaults most arrays to empty, accepts those empty arrays, and lets version be any string no longer than twenty characters. Version, license, and other fields also have route defaults.

These schemas describe related but unequal payloads. Full frontmatter contains author and license facts that the authenticated web route can source or default elsewhere. The route also accepts fields such as slug and full description that are not part of the shared frontmatter schema.

Tests should compare only fields with the same intended meaning. Name, description, testing types, languages, version, license, tags, frameworks, domains, and agents form a useful overlap. Keep route-only transport data in its own assertions.

Put that overlap in a small map with one row per field, then mark where each side gets its value and which rule it applies. A file field may come from raw source, while a route field may come from JSON, a default, or the signed-in user. Keep those source facts next to the pass rule so a default does not look like proof that the user sent a value. This map gives both code owners the same terms and stops a route-only need from being forced into the file contract.

The first control should pass both boundaries. Use nonempty required arrays and version \`1.0.0\`, then provide any extra fields each schema needs. This proves the adapters build valid inputs before differences are introduced.

Next remove \`testingTypes\` or set it to an empty list. Shared validation should fail with that path, while the route schema should accept and continue past validation. The same split applies to \`languages\`.

A prerelease string such as \`1.0.0-beta.1\` exposes version drift. It fails the shared numeric regular expression but stays below the route's length cap. This is characterization, not a claim that either format is the final standard.

Use [validate SKILL.md in CI](/blog/validate-skill-md-in-ci-pipeline) for local workflow placement. Keep the parity suite closer to both schemas so a change on either side runs it.

Zod's [API documentation](https://zod.dev/api) explains defaults, array limits, and string refinements used by these modules. Repository code remains the source for the exact QASkills rules.

Make each case small and clear. One changed field per row lets a reviewer see why results split without reading a large payload diff.

## frontmatter API contract parity: current repository behavior

Frontmatter API contract parity is incomplete in the current revision, and the difference is visible from source alone. Runtime tests should still prove it because private route rules can move without a shared type error.

The shared schema applies \`.min(1)\` to both required arrays. Missing values also fail because the fields have no default at that level. Empty frameworks, domains, agents, and tags remain valid due to defaults.

The route schema uses \`.default([])\` for every metadata array and adds no minimum to testing types or languages. Missing and empty values therefore parse to empty arrays. Later quality scoring can read those arrays without another required-item check.

Version rules differ in kind, not just wording. Shared validation matches \`digits.digits.digits\` for the full string. Route validation checks only maximum length and supplies \`1.0.0\` when the property is absent.

License rules also vary. Shared frontmatter requires a nonempty string, while the route allows any string up to fifty characters and defaults omission to \`MIT\`. An explicit empty route license satisfies the maximum rule because there is no minimum.

Author is required by shared frontmatter but absent from route input. The route authenticates a user before reading and validating JSON, then derives author data for storage. That is a valid transport difference, so a naive equality test would report noise.

Build a field map before writing cases. Mark each overlapping field as equal, intentionally different, or unresolved. An unresolved row should fail review until owners choose a rule; an intentional difference should be documented and tested.

The route schema is private. Observe it through the exported \`POST\` function, with auth and database calls controlled by a narrow test harness. Reaching the slug lookup proves validation passed without requiring a successful insert.

Name each mock for the route step it controls, and fail the test if any later write, score, or mail call starts after the chosen seam. The auth mock should return one fixed user, while the first slug query should return the row that turns a valid request into a known conflict. For bad input, assert that even the slug query stayed idle, which proves the 400 came before all database work in this path. Keep this harness beside the route test and do not use it to restate the private schema.

The shared schema is public, so call \`safeParse\` directly. Project its issue paths and codes rather than snapshotting all Zod data. This gives a stable result that still shows the failed field.

Use the [format guide](/blog/skill-md-format-guide) to build the full frontmatter side. Use [how to publish](/how-to-publish) to explain route-only data and auth, while keeping the automated matrix independent from manual steps.

## Why does local publish validation mismatch change the contract?

A local publish validation mismatch changes the contract because users can receive a pass before upload and a different pass or failure at the server. The reverse split can block valid local work even when the route would store it.

Consider empty languages. A local validator rejects the document, so a CLI may stop before making a request. The route would default a missing property to an empty list and continue, which means direct API clients can reach a state the local path denies.

The prerelease version case points the other way only if product policy supports that syntax. The route currently accepts it by length, while local frontmatter rejects it. Tests should not call this a server feature until the team approves the format.

Defaults can hide absence. A route response or stored row may contain \`1.0.0\` even when the client sent no version. A local frontmatter object cannot omit version and pass this schema. Reports should show source presence as well as parsed value.

Shared type reuse could reduce drift, but the input shapes are not identical. The web route needs auth-derived author data, route defaults, slug control, and full description. Reusing one whole schema without adapters may force transport details into file validation.

A better design can extract common field fragments or a shared normalized metadata schema. Each boundary can then add its own transport fields and source-presence policy. The parity matrix still remains useful because composition can drift through refinements and defaults.

Do not change both schemas and the fixture oracle in one opaque patch. Commit characterization first, write the chosen rule second, then update code and expected rows. This order makes product decisions visible.

Ask shared and web owners to review the current table before either rule moves, then record each gap as keep, close, or study with one named owner. A keep row needs a reason tied to its input path, while a close row needs the target rule and the side that will change. A study row must stay visible and should not pass through a broad wildcard in the test result. This short review makes the next code patch prove an agreed contract instead of letting its new output define the rule after the fact.

The [Agent Skills specification](https://agentskills.io/specification) offers a portable reference for skill metadata. It can inform the decision, but local code and product needs determine the shipped QASkills contract.

Use [seed catalog parser tests](/blog/seed-skill-catalog-parser-regression-tests) after the shared rule changes. Those files reveal compatibility with real local input, while route tests prove transport behavior.

The current gap is a contract issue, not evidence of an exploit. Keep claims limited to accepted values, defaults, issue paths, and route progress.

## shared Zod schema reuse test matrix

The shared Zod schema reuse matrix should begin with one dual-pass control and then vary required arrays, version, and omission. It should not force author parity because the route obtains author identity through authentication.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| Valid shared and API input | Nonempty arrays and version \`1.0.0\` | Both schemas | Shared succeeds and route reaches post-validation work |
| Missing testingTypes | Property absent | Shared schema and route | Shared rejects; route defaults an empty array and continues |
| Missing languages | Property absent | Both boundaries | Shared rejects; route defaults an empty array and continues |
| Prerelease version | \`1.0.0-beta.1\` | Both boundaries | Shared rejects numeric pattern; route accepts by length |
| Empty arrays | Both required arrays are \`[]\` | Both boundaries | Shared reports two paths; route continues |
| Missing version | Property absent | Both boundaries | Shared rejects; route supplies \`1.0.0\` |
| Long version | More than twenty characters | Both boundaries | Route rejects length; shared also rejects numeric format |
| Shared rule edit | One overlap rule changes after approval | Both public boundaries | SKILL.md publish schema drift stays closed when both outcomes move in the same reviewed row and no new gap appears |

The valid row proves adapters add required shared fields and valid route transport data. If that row fails, stop the matrix before reading differences. A broken control can make every later result look like drift.

For route-accepted rows, stop at a stable seam such as duplicate slug lookup. Configure the mock to return an existing row and expect status 409. That response proves validation passed while avoiding insert, email, or score assertions.

Use a slug that is unique to the test file and reset every mock before each row, since old calls can make a later gap look as if it reached the seam. Assert the 409 body as well as its status so an unrelated conflict or auth fault cannot count as schema success. Then check one slug lookup and no insert, which pins the exact point reached by the request under the current route flow. For a rejected row, expect 400, a field path, zero slug reads, and zero writes in the same compact report.

For route-rejected rows, expect status 400 and an issue path. Also assert the slug lookup was not called. This separates schema rejection from downstream route behavior.

For shared rows, store \`success\` and projected issue paths. Do not compare complete messages with route messages because each schema may use different text while enforcing the same rule.

The result report can classify each row as match or expected gap. A new gap should fail CI, while a listed gap remains visible until owners close or approve it. Do not hide all differences behind a generic snapshot.

If common fragments are extracted later, keep this black-box matrix. Reuse at the source level does not prove both boundaries call the same fragment with the same preprocessors and defaults.

Name the common fixture fields near the test. A large factory with hidden defaults can add missing arrays and erase the exact omission case being tested. Each row should make its source presence clear.

Link the finished rule from [CI validation](/blog/validate-skill-md-in-ci-pipeline), then keep test output concise enough for routine runs. That output should show the case, both results, the route seam, and the approved gap state without a full request or error dump.

## How should skill creator server drift be verified?

Skill creator server drift should be verified through the exported route, while local frontmatter uses its exported Zod schema. This pair respects current module access without copying the private route schema into tests.

The first example records shared behavior for empty arrays, missing version, and prerelease version. It asserts paths rather than full error strings.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { skillFrontmatterSchema } from '@qaskills/shared';

const validFrontmatter = {
  name: 'Parity probe',
  description: 'A complete description for a publish parity probe.',
  version: '1.0.0',
  author: 'qa-team',
  license: 'MIT',
  tags: [],
  testingTypes: ['unit'],
  frameworks: [],
  languages: ['typescript'],
  domains: [],
  agents: [],
};

describe('shared frontmatter edges', () => {
  it('rejects empty required arrays', () => {
    const result = skillFrontmatterSchema.safeParse({
      ...validFrontmatter,
      testingTypes: [],
      languages: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual([
        'testingTypes',
        'languages',
      ]);
    }
  });

  it('rejects a prerelease version', () => {
    const result = skillFrontmatterSchema.safeParse({
      ...validFrontmatter,
      version: '1.0.0-beta.1',
    });

    expect(result.success).toBe(false);
  });
});
\`\`\`

This code runs against \`packages/shared/src/schemas/skill-schema.ts\`. Add a separate omission row that removes version before parsing, because setting it to undefined and deleting it should both fail the required field rule.

The route example uses a duplicate-slug seam. Its harness must mock \`getAuthUser\` before importing the route and make the first database select return an existing skill.

\`\`\`typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/skills/route';

const routeBody = {
  name: 'Parity probe',
  slug: 'parity-probe',
  description: 'A complete description for a publish parity probe.',
};

describe('publish route validation edges', () => {
  beforeEach(() => {
    authenticateTestAuthor();
    returnExistingSkillForSlug('parity-probe');
  });

  it.each([
    ['missing arrays', routeBody],
    ['empty arrays', { ...routeBody, testingTypes: [], languages: [] }],
    ['prerelease version', { ...routeBody, version: '1.0.0-beta.1' }],
  ])('passes validation for %s', async (_label, body) => {
    const response = await POST(makeJsonRequest(body));

    expect(response.status).toBe(409);
    expect(skillSlugLookup).toHaveBeenCalledWith('parity-probe');
    expect(skillInsert).not.toHaveBeenCalled();
  });
});
\`\`\`

\`authenticateTestAuthor\`, \`returnExistingSkillForSlug\`, and the spies are test-harness helpers, not production exports. Their job is to control auth and the route's Drizzle chain without restating validation logic.

Add one long-version row that expects 400 and no slug lookup. This negative route control proves the harness can observe validation failure and does not turn every request into 409.

Choose a long value that fails only the route length cap, then keep name, description, and all other request data well within their rules. On the shared side, label the same row as a format failure because its cause differs even though both outcomes are false. Store each cause with the field path and first failed check instead of merging both into one red cell. This detail proves matched results can still come from unlike rules and may split when only one cap or pattern changes.

Join both result sets by case name in a small report. Expected gaps should list the selected owner and decision status. Any result outside that list should fail with shared paths, route status, and reached seam.

Use [malformed frontmatter tests](/blog/malformed-skill-md-frontmatter-parser-tests) for YAML parse faults before this schema pair. The examples here begin with JavaScript values or valid request JSON.

## publish contract regression test acceptance criteria

A publish contract regression test passes when every overlap row either matches or appears in a reviewed difference list. The suite must fail for any new split, even if each boundary still passes its own unit tests.

The baseline must pass both sides with one clear set of facts. Name, description, nonempty testing types, nonempty languages, version, and license should have explicit values. Do not let defaults create the control.

Each gap row changes one field. Missing and empty are separate states because defaults can merge them at one boundary. Keep both when source presence matters to the chosen policy.

The route side must prove it passed validation without requiring a successful publish. A controlled 409 at slug lookup is enough. Rejected route rows must prove database work did not start.

Save the parity report as plain data with case, source state, shared result, route result, route seam, and gap status, then sort rows by the brief matrix order. Do not save full request bodies or all Zod fields when the changed field and stable path tell the whole story. A reviewer should be able to see missing, empty, defaulted, and explicit states as four clear values rather than infer them from a helper. Link the approved report from [CI validation guidance](/blog/validate-skill-md-in-ci-pipeline) once the expected gaps and owners are set.

The shared side must report stable paths and success. Avoid comparing full Zod messages or issue objects. Paths show which rule failed and survive many harmless library text changes.

Write down intentional differences such as auth-derived author input. Those rows should not fail parity because the boundary design explains them. Unexplained differences in overlapping values remain work items.

If the team chooses the shared array minimums, add them to the route or a shared normalized schema. If it chooses empty arrays as valid, update local rules and downstream quality assumptions. Tests should follow a written choice, not make it silently.

For version, select syntax before code changes. Numeric triples, prerelease forms, and arbitrary short labels imply different compatibility rules. Include accepted and rejected examples for the chosen grammar.

Run representative seed files and route payloads before enforcement. Report actual failures by case and path, then plan migration from those facts. Do not invent user counts or stored data impact.

Use the [skills directory](/skills) for a final manual sample. Automated matrix results remain the release gate because a few visible skills cannot cover absent fields and rejected payloads.

## How do you test SKILL.md publish schema drift step by step?

Test SKILL.md publish schema drift by mapping common fields, building one dual-pass control, and observing each boundary through its public access. Keep route transport details outside the common oracle.

1. Read \`packages/shared/src/schemas/skill-schema.ts\` and list required fields, defaults, minimums, and version syntax.
2. Read \`packages/web/src/app/api/skills/route.ts\` and list the private publish defaults plus post-validation seams.
3. Build adapters from one common valid metadata fixture to complete shared and route inputs.
4. Add rows for missing arrays, empty arrays, missing version, prerelease version, and long version.
5. Call shared \`safeParse\` and project success plus issue paths for each row.
6. Call route \`POST\`, using auth and duplicate-slug mocks to prove validation passed or failed.
7. Classify each result pair as match, intentional transport difference, or unresolved drift.
8. Add the matrix to CI and fail whenever a new unreviewed difference appears.

Keep fixture adapters plain. They may add author to shared input and slug to route input, but they must not fill the field under test. Add source-presence assertions if a builder could hide omission.

Build a fresh object for each side and freeze the common source in test code, which helps catch a route adapter that edits the same object later used by shared validation. For an omitted row, assert the key is not in either common source or derived input before the calls begin. For an empty row, assert that the key is present and holds an empty list, since absence and empty text may meet different defaults. These guards keep adapter work from erasing the main fact that the parity row was made to test.

Run all shared rows and route rows even when one gap fails. A full table helps reviewers see whether a change closes one mismatch while opening another. Keep errors grouped by case name.

When route tests use 409 as the success seam, state that rule in the helper name. A reader should know conflict means validation passed in this harness, not that publication was expected to succeed.

After choosing common rules, add focused unit tests at the extracted schema or both old sites. Retain black-box parity coverage because composition, preprocessors, and defaults can still diverge.

Document the final command in [how to publish](/how-to-publish) so local and server expectations are visible before release. The page should name each required common field, any route-only source, and the one command that proves both sides still follow the chosen rule.

## SKILL.md publish schema drift rollout and regression checks

SKILL.md publish schema drift rollout starts with a report of current matches and gaps. That report should land before schema consolidation, allowing reviewers to approve behavior rather than only code shape.

Shared package owners should decide portable file rules with web route owners. Authentication, slug generation, and full description can stay route-specific, while common metadata should have one chosen normalized meaning.

A shared fragment is often safer than one giant schema. Compose common name, description, arrays, version, and license rules, then extend for frontmatter or transport needs. Test each composed result through public boundaries.

Start with one field group, such as the two required arrays, and rerun the black-box table before moving version or license into the same shared code. This small step shows whether both callers used the fragment with the same defaults, not just whether they import one symbol. Keep auth-derived author and route-only slug outside the fragment, then explain that line in [the format guide](/blog/skill-md-format-guide) and route docs. Once a group is shared and all rows match the chosen rule, remove its gap entry but retain its parity cases as a guard.

If existing files fail a stricter rule, add clear diagnostics and a migration window. If stored route data contains values the shared schema rejects, report actual rows before blocking reads or edits.

Regression coverage should include the matrix, direct common-fragment tests, one local parser path, and one route request path. This set detects drift in both definitions and adapters.

Keep a small expected-gap list with owner and reason. Remove a gap when code and tests converge. Never let the list become a wildcard that permits any result for a field.

Run the suite when shared schemas, route schemas, parser defaults, publish adapters, or version rules change. Those sites can shift acceptance even when TypeScript remains green.

Pair the check with [seed parser regression tests](/blog/seed-skill-catalog-parser-regression-tests) for real file coverage. Keep route payload rows synthetic so each missing or empty state is guaranteed.

Report results in plain terms: accepted, defaulted, rejected, and first issue path. That format is useful to code owners and does not claim that a proposed common rule already shipped.

Before the release gate runs, have one shared owner and one route owner read the same five rows and mark each source state without looking at the expected result first. They should then run the shared calls and route calls, compare the plain report with their marks, and check that no adapter filled a key meant to stay absent. If one side changes, keep the old and new report next to the code diff, name the exact rule that moved, and state whether the gap list should close or gain a reviewed entry. This peer check does not replace the test, but it catches a vague case name or hidden default before that weak setup becomes the long-term proof for both input paths.

## Frequently Asked Questions

### What should frontmatter API contract parity tests assert?

They should assert one shared success flag, stable shared issue paths, route status, and the first route seam reached. Each row should be marked as a match or reviewed gap. A new unlisted difference must fail even when both isolated schema suites pass.

### How does local publish validation mismatch affect the SKILL.md contract?

It lets equivalent metadata receive different outcomes based on entry path. Empty required arrays and prerelease versions show that split in this revision. Users may be blocked locally or accepted by the server under rules that were not meant to differ.

### Which fixture best exposes shared Zod schema reuse?

Use one valid common metadata object, then derive shared and route inputs with thin adapters. Remove \`languages\` in one row and set it to an empty list in another. Those cases show whether defaults, minimums, and composition stay aligned in both paths.

### When should teams check skill creator server drift?

Run parity checks whenever either schema, parser defaults, route adapters, version rules, or auth-derived metadata changes. Also run them before extracting shared fragments. The matrix proves behavior stayed aligned after code moved, not just that imports now share a file.

### What is the pass criterion for publish contract regression test?

Every common-field row must match the chosen rule or appear in a narrow reviewed gap list with an owner. Route rejects must stop before database work, and route accepts must reach a known seam. Shared failures must report stable field paths.

## Conclusion

SKILL.md publish schema drift is visible today in required arrays, version syntax, and defaults across the shared and web schemas. Add the black-box parity matrix first, then choose common rules and extract only the metadata fragments both boundaries truly share.

Keep transport differences explicit and new gaps blocking. Open the [skills directory](/skills), inspect a published SKILL.md, then use [how to publish](/how-to-publish) to apply this contract before publication.`,
};
