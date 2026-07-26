import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md semantic version compatibility Tests',
  description:
    'SKILL.md semantic version compatibility: compare valid SemVer with both schemas. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md semantic version compatibility',
  keywords: [
    'SKILL.md semantic version compatibility',
    'SKILL.md prerelease version',
    'semantic version build metadata',
    'Zod semver regex',
    'version schema compatibility',
    'skill release version tests',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'malformed-skill-md-frontmatter-parser-tests',
    'seed-skill-catalog-parser-regression-tests',
  ],
  sources: ['https://semver.org/', 'https://zod.dev/api'],
  repoEvidence: [
    'packages/shared/src/schemas/skill-schema.ts',
    'packages/web/src/app/api/skills/route.ts',
  ],
  content: `SKILL.md semantic version compatibility currently differs between local frontmatter validation and the publish API. The shared schema accepts only three numeric groups, while publication accepts any version string up to 20 characters, so tests must document both contracts before choosing one SemVer policy.

That split can make a file fail locally yet pass through an API request. Review an existing version in the [skill catalog](/skills), but verify each claim against the two source paths below.

## What does SKILL.md semantic version compatibility need to prove?

SKILL.md semantic version compatibility needs to prove how the same version behaves at local schema and publish request boundaries. The suite should cover plain releases, prereleases, build labels, overlong text, and malformed numeric groups.

The local rule appears in packages/shared/src/schemas/skill-schema.ts. Its version field uses a regular expression with exactly three digit groups separated by literal dots.

That expression accepts 1.2.3 and rejects 1.2.3-alpha.1 because the suffix falls outside the final digit group. It also rejects 1.2.3+build.5 for the same reason.

The expression is not a full Semantic Versioning parser. For example, it accepts leading zero forms such as 01.2.3 even though the SemVer rules limit leading zeros in normal numeric parts.

The publish rule appears in packages/web/src/app/api/skills/route.ts. Its request schema treats version as an optional string with a 20-character maximum and a default of 1.0.0.

No SemVer pattern appears in that request field. Therefore, short prerelease text, build text, and even unrelated short strings pass request-shape validation today.

Other POST branches can still reject or fail a request because authentication, slug checks, database writes, and service state are separate. The narrow claim here concerns only the version validation rule.

The official [Semantic Versioning specification](https://semver.org/) defines MAJOR.MINOR.PATCH, optional prerelease identifiers, and optional build metadata. It also defines rules that a three-group digit regex does not cover.

The [SKILL.md format guide](/blog/skill-md-format-guide) explains the repository field used by authors. It should reflect the actual accepted subset rather than imply full SemVer by name alone.

Tests must label current behavior and proposed behavior in different groups. A compatibility fix should not rewrite history by making a future choice look like the current implementation.

The key output is a two-column acceptance result for each sample. Add a reason and field path so a failed row shows which boundary disagreed.

SKILL.md semantic version compatibility is complete only after maintainers choose one shared policy or clearly document why the two entry points differ. Until then, parity tests should fail only when observed behavior moves without review.

## SKILL.md prerelease version: current repository behavior

A SKILL.md prerelease version adds a hyphen and identifiers after the patch part, such as 1.2.3-alpha.1. This form is valid under SemVer when each identifier follows the stated character and leading-zero rules.

The current shared regex anchors both ends of the string. Since it ends after the third numeric group, any hyphen suffix makes safeParse fail.

That rejection reaches the validator because packages/skill-validator uses the shared frontmatter schema. A local CI run can therefore mark a prerelease skill invalid before publication.

The publish API has a different result for the same value. The string 1.2.3-alpha.1 is shorter than 20 characters, so the request schema accepts its version field.

This statement does not mean the whole POST always returns 201. It means version alone does not cause request validation to return the route's 400 response.

The first example characterizes the shared schema with a table of concrete inputs. It asserts success rather than matching a full Zod error snapshot.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { skillFrontmatterSchema } from '@qaskills/shared';

const base = {
  name: 'version-contract',
  description: 'A focused fixture for version acceptance tests.',
  author: 'qa-team',
  license: 'MIT',
  tags: [],
  testingTypes: ['contract'],
  frameworks: [],
  languages: ['typescript'],
  domains: [],
  agents: [],
};

describe('current shared version rule', () => {
  it.each([
    ['1.2.3', true],
    ['1.2.3-alpha.1', false],
    ['1.2.3+build.5', false],
    ['1.2', false],
    ['v1.2.3', false],
    ['01.2.3', true],
  ])('parses %s with success=%s', (version, expected) => {
    expect(skillFrontmatterSchema.safeParse({ ...base, version }).success).toBe(expected);
  });
});
\`\`\`

The leading-zero row is vital because it proves the regex is both narrower and wider than full SemVer in different places. Calling it a SemVer validator would hide that fact.

Keep prerelease cases focused on syntax. Ordering 1.2.3-alpha.2 against alpha.10 is a precedence concern and belongs in a separate test only if QASkills sorts versions.

The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) can host this exact shared-schema matrix. Run it before API parity tests so local failure remains easy to diagnose.

If maintainers intentionally allow only stable releases, preserve the rejection and update field wording. Full SemVer support is not required merely because the field is named version.

SKILL.md semantic version compatibility should make that product choice visible. A prerelease rejection is acceptable when it is deliberate, clear, and consistent across entry points.

## Why does semantic version build metadata change the contract?

Semantic version build metadata follows a plus sign after the patch or prerelease part. It carries build facts but does not affect version precedence under the SemVer specification.

Examples include 1.2.3+build.5 and 1.2.3-alpha.1+sha.abc. Both contain characters that the current shared regex rejects after the patch digits.

The publish request accepts either sample only when its full length is at most 20 characters. The second example above may exceed that cap depending on the chosen label.

Length is a transport rule, not a grammar rule. It can reject a valid long SemVer value while accepting a short value such as banana.

That difference matters when a build system writes commit or pipeline labels into SKILL.md. Local validation and API publication can disagree before any storage or display code runs.

Build metadata also creates equality questions. SemVer says build labels do not affect precedence, but QASkills may still store and display the exact version string.

Tests should avoid assuming that equal precedence means identical release records. Storage identity, update policy, and display text need their own product rule.

The [publishing checklist](/how-to-publish) should state whether build labels are allowed and whether the API preserves them. Contributors should not learn the rule from a late database response.

If maintainers choose stable releases only, both layers should reject plus and hyphen suffixes with the same field message. If they choose full SemVer, both layers should share one parser or schema.

Do not silently strip build metadata to make input pass. That rewrite loses author data and can make a signed or traced build hard to identify.

Semantic version build metadata changes the contract because acceptance, storage, comparison, and display can each treat it differently. The first parity goal is simply to stop local and publish validation from disagreeing.

## Zod semver regex test matrix

A Zod semver regex matrix should include accepted controls, valid SemVer forms that fail locally, and invalid forms that pass locally. This balance shows the exact shape of the current rule.

Use 1.2.3 as the common accepted control. It should pass both the shared schema and publish request version field.

Use 1.2.3-alpha.1 and 1.2.3+build.5 as valid SemVer variants. They fail the shared regex but remain short enough for the publish schema.

Use 01.2.3 as a leading-zero case. It passes the shared digit pattern even though a full SemVer rule would reject that major part.

Use 1.2 and 1.2.3.4 as missing and extra numeric parts. Both fail locally, while the short publish strings currently pass version shape validation.

Use a 21-character value for the publish length edge. Its meaning is less important than proving the inclusive 20-character cap and the next failing length.

| Version input | SemVer 2.0.0 | Shared schema today | Publish field today | Main assertion |
|---|---|---|---|---|
| 1.2.3 | Valid | Accepts | Accepts | Common baseline |
| 1.2.3-alpha.1 | Valid | Rejects | Accepts | Prerelease split |
| 1.2.3+build.5 | Valid | Rejects | Accepts | Build label split |
| 01.2.3 | Invalid | Accepts | Accepts | Leading-zero gap |
| 1.2 | Invalid | Rejects | Accepts | Numeric-part split |
| v1.2.3 | Invalid | Rejects | Accepts | Prefix split |
| 21-character text | Not judged by length alone | Usually rejects | Rejects | API maximum |

The table's publish column describes schema acceptance, not a guaranteed HTTP outcome. Authentication and database work must be arranged before a route test can reach a 201 response.

Add empty, null, and omitted values in request-specific tests. Omission gets the API default, while the shared parser may also supply a default before schema validation.

The [malformed frontmatter tests](/blog/malformed-skill-md-frontmatter-parser-tests) help separate YAML type issues from version grammar. A numeric YAML value can fail as a type before the regex ever runs.

Store the expected reason beside each row, not only a Boolean. Reasons prevent a future length rule from accidentally replacing a grammar rule while all rejection Booleans stay unchanged.

SKILL.md semantic version compatibility tests should preserve this matrix as characterization. A policy pull request can then update both columns and explain each changed row.

### Record one version run in plain terms

For each row, save the input text, local pass flag, API pass flag, field path, status, and stored text in one short test record that any reviewer can scan. This plain record shows where the two paths split without forcing the reader to trace mocks, parse a large body, or guess which rule caused the result.

Keep the same base file and request for all rows, since a changed slug, name, user, or list can add a new cause that has no link to version text. When an accepted API row writes data, read it back by the new row ID and compare the exact string byte for byte before test cleanup runs.

Add one row with the full 20-character limit and one with 21 characters, but make both strings easy to count in a failed log. The edge check should prove the cap on its own, while the SemVer rows prove form rules and should not fail merely because a sample label grew too long.

Keep an omitted value row apart from an empty string row, because a default applies only when the field is not sent under the current request rule. A clear test should show the default that was stored, then show the empty string result as a different case with its own pass or fail claim.

When a row fails in Zod, save only the public issue path, code if exposed, and short message needed by the client. Do not pin a full error object with stack data, library fields, or key order that the product does not own, since those details can shift during a safe package update.

Run the rows in both source tests and the built package path, then compare the small records rather than raw terminal text. This two-stage check proves the shared rule ships with the same result that local code saw, which guards against stale output after a shared package edit.

If the team picks stable triples, change the API rows and docs in the same review while keeping valid prerelease samples as clear rejection tests. If the team picks full SemVer, keep plain triples, suffix forms, bad zeros, blank parts, bad signs, and length edges so the wider rule does not become a loose string check.

Name the owner and date beside the chosen row set, then require a short note for each later change in expected output. That note turns a red parity test into a useful rule review and keeps an old edge from being removed just to make a build pass.

## How should version schema compatibility be verified?

Version schema compatibility should be verified by sending the same strings through the shared schema and the actual POST route harness. Testing two copied regexes would not prove application parity.

The route harness needs an authenticated user and controlled database calls. It should stop after request validation or use a disposable database row with exact cleanup.

For rejected request data, assert 400 and inspect the route's validation issue list. For accepted data, allow the request to reach the next arranged branch and prove version did not trigger rejection.

The Zod [API reference](https://zod.dev/api) documents regex checks, string limits, and safeParse results. Both repository layers use Zod, so one shared version schema could remove drift if maintainers select that design.

The second example expresses a route-level parity test with a project harness. Its helpers must mock authentication and database calls exactly as existing route tests do.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { skillFrontmatterSchema } from '@qaskills/shared';
import { POST } from '@/app/api/skills/route';

describe('shared and publish version parity', () => {
  it.each(['1.2.3-alpha.1', '1.2.3+build.5'])(
    'records the current split for %s',
    async (version) => {
      const local = skillFrontmatterSchema.safeParse(validFrontmatter({ version }));
      expect(local.success).toBe(false);

      arrangeAuthenticatedPublisher();
      arrangeUnusedSlug();
      arrangeSkillInsert({ version });

      const response = await POST(publishRequest(validPayload({ version })));
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.skill).toEqual(expect.objectContaining({ name: 'Version Probe' }));
    },
  );
});
\`\`\`

The current response body does not include version, so the test should also inspect the arranged insert call. That assertion proves the accepted string reached storage without relying on a field the route omits.

If the route harness cannot expose request validation cleanly, test the exported route as a black box. Avoid exporting private schema only for a test unless maintainers want it as a supported module contract.

Use a fresh slug for every accepted row and remove inserted data afterward. A duplicate slug response would mask version acceptance with an unrelated 409.

The [parser regression guide](/blog/seed-skill-catalog-parser-regression-tests) can add real catalog versions to the matrix. Keep the explicit SemVer edges because a current catalog may contain only plain releases.

Version schema compatibility passes only when the expected difference is named or both layers agree. A test that checks each layer in isolation can miss harmful drift.

## skill release version tests acceptance criteria

Skill release version tests need one written acceptance grammar, one maximum length rule, and one error policy. Those choices should apply before local validation and publication store data.

If the product supports full SemVer 2.0.0, valid prerelease and build forms must pass. Leading zeros, empty identifiers, and invalid characters must fail.

If the product supports stable numeric triples only, hyphen and plus forms should fail in both layers. Documentation should call the rule a stable release format rather than full SemVer.

The maximum length should fit the longest allowed grammar forms that teams need. A 20-character cap may be intentional, but it should not be confused with syntax validation.

Error output should name version and give a brief accepted example. Stable issue paths matter more to CI than a large snapshot of Zod internals.

Default behavior also belongs in the contract. Both omitted local data and omitted request data currently tend toward 1.0.0 through different code paths.

Test explicit empty strings apart from omission. An empty provided value should not silently become the default unless that coercion is approved.

The [SKILL.md format guide](/blog/skill-md-format-guide) and [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) should use the same examples. Conflicting docs can recreate the split even after code converges.

Storage should preserve the accepted text unless a canonical transform is stated. If normalization occurs, return or display the normalized value so authors can see the change.

Skill release version tests pass when a table row yields the same decision, path, and stored form through every supported entry point. Ranking and update ordering need added tests only if those features compare versions.

## How do you test SKILL.md semantic version compatibility step by step?

Test SKILL.md semantic version compatibility by recording both current rules before changing either one. This sequence keeps parity work distinct from a new grammar decision.

1. Read packages/shared/src/schemas/skill-schema.ts and packages/web/src/app/api/skills/route.ts, then copy their observed constraints into test names.
2. Build one valid frontmatter object and one authenticated publish payload whose only changing field is version.
3. Add 1.2.3, prerelease, build, leading-zero, missing-part, extra-part, prefix, empty, omitted, 20-character, and 21-character rows.
4. Run each row through shared safeParse and the real POST route harness, then record decisions and field paths.
5. Approve stable triples or full SemVer, replace split rules with one owned schema, and update expected rows together.
6. Run local validator, route, packed artifact, and catalog regression tests before publishing the new compatibility rule.

At step one, note that current shared syntax and request length answer different questions. Neither rule can stand in for the other.

At step two, keep name and slug stable only for rejected rows. Accepted rows need unique slugs so one insert does not block the next.

At step three, quote YAML versions when fixtures could parse them as another scalar type. That keeps grammar tests focused on strings.

At step four, save the inserted value for accepted API cases. A 201 response without an insert assertion cannot prove exact version preservation.

At step five, use one shared schema import when package boundaries allow it. If duplication is required, add a parity test that consumes the same table.

At step six, follow the [publication checklist](/how-to-publish) and inspect a test artifact. The UI and content endpoint should show the accepted value without silent loss.

Repeat the matrix when upgrading Zod or changing request limits. Library helpers can alter issue text even when the selected product grammar stays fixed.

SKILL.md semantic version compatibility passes this procedure when authors receive one result for one version. Any intentional exception must name its boundary and reason.

## SKILL.md semantic version compatibility rollout and regression checks

Rollout should begin with a count of versions already stored and versions present in seed files. This scan reveals whether a stricter rule would strand existing records.

Classify each value as stable triple, valid prerelease, valid build form, invalid SemVer, or over limit. Do not rewrite records during the first report.

Choose whether old accepted values remain readable after enforcement. Rejecting future writes does not require hiding historical skills from the [catalog](/skills).

Update the shared schema and publish request in the same release when possible. A staggered change can widen the period where local and remote results disagree.

Add route tests for 400 issue shape and successful insert values. Add shared tests for every syntax edge and defaults.

Use the [seed regression article](/blog/seed-skill-catalog-parser-regression-tests) to guard known files, and use [malformed parser tests](/blog/malformed-skill-md-frontmatter-parser-tests) for YAML types. Synthetic version rows still provide the clearest grammar proof.

If scores, sorting, or update checks later depend on version order, add a proper SemVer comparison library and its own suite. String order does not implement prerelease precedence.

Document any 20-character cap beside the grammar. A valid value can still be too long for the product, but the error should name length rather than syntax.

Keep a migration record with old value, new value, reason, and owner if normalization is approved. Silent edits can break release links and audit trails.

Finish by validating one stable release, one prerelease if allowed, and one build form if allowed through the published artifact. The [CI guide](/blog/validate-skill-md-in-ci-pipeline) should run the same matrix on each schema change.

### Check old and new release data

Take a read-only list of old values before the rule changes, then tag each as plain, pre, build, bad form, blank, or too long without writing any row. This pass gives the team a true count of work and lets the new code be tested on real shapes while the old site still reads all saved data.

Pick one test row from each group and run it through the new shared check in report mode, where the tool shows the planned result but does not block or edit. Compare that report with the hand-tagged list, fix any rule gap, and repeat until each old shape has one clear path.

For rows that stay as they are, prove all read pages and file output can still show the old text even when new writes use a stricter rule. A write rule should not make old skills vanish, and a read path should not try to parse text when it only needs to show the saved value.

For rows that must change, make a map from old text to new text and review it before one write runs, since a small sign or dot can carry useful build facts. Save the old value, new value, owner, reason, and time in a test log that can aid a safe backout if users report a bad link.

After the data pass, publish one new skill for each allowed form and fetch its file through the same public path used by tools. Exact text at that last edge proves the request, row, and file builder agree, while the prior unit rows still give fast help when a later rule edit breaks the build.

Run the old local tool against the new allowed samples when that tool remains in support, and state any known block in release notes. This check keeps a site change from surprising a team whose pinned CLI still uses the old digit-only rule for files built by the new page.

Do one clean rerun after all test rows and skills are removed, with new slugs and no old cache or build files in place. The same pass and fail map on that fresh run proves the result comes from the chosen rule rather than data left by the first trial.

Close the rollout only when the rule name, examples, code check, saved text, file text, and help page all use the same words. That plain test of terms is easy to skip, yet it is what lets an author fix a bad value without reading source code.

## Frequently Asked Questions

### Why does a SKILL.md prerelease version fail locally?

The shared frontmatter schema uses an anchored pattern with exactly three numeric groups. Text after the patch digits, including a hyphen and prerelease label, cannot match. This is current repository behavior, even though a well-formed prerelease is valid under the wider Semantic Versioning 2.0.0 specification.

### Is semantic version build metadata valid for publication?

The publish request schema currently accepts any version string up to 20 characters, so a short build form passes that field check. The shared frontmatter schema rejects the plus suffix. Full request success still depends on authentication, slug availability, database work, and other route branches.

### What does the Zod semver regex actually accept?

It accepts strings made from three digit groups separated by dots, with no prefix or suffix. That includes plain 1.2.3 and also leading-zero forms such as 01.2.3. It is therefore a numeric-triple rule, not a complete implementation of every Semantic Versioning grammar requirement.

### Should version schema compatibility use one shared schema?

One shared schema is the clearest way to keep local and publish decisions aligned when package boundaries permit it. If each layer must define its own rule, both should consume one common fixture matrix. The chosen grammar, length, defaults, issue paths, and storage form must still be documented.

### What should skill release version tests do before migration?

First report existing values without changing them, then group each value by the proposed rule. Run shared and API characterization tests, choose treatment for historical records, and update contributor guidance. Only after those checks should a migration normalize, preserve, warn about, or reject any stored version.

## Conclusion

SKILL.md semantic version compatibility currently has a numeric-triple local rule and a broad 20-character publish rule. Use one shared edge matrix to expose that split, then approve stable-only or full SemVer behavior before changing either layer.

Browse published [QA skills](/skills), review [how to publish](/how-to-publish), and run the prerelease and build rows through both entry points before your next release. Save the row report so the next schema edit starts from facts rather than a new guess.`,
};
