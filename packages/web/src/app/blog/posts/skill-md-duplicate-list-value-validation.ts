import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md duplicate list value validation Guide',
  description:
    'SKILL.md duplicate list value validation: normalize arrays before scoring and storage. See verified code, focused fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md duplicate list value validation',
  keywords: [
    'SKILL.md duplicate list value validation',
    'duplicate SKILL.md tags',
    'unique Zod arrays',
    'agent list deduplication',
    'taxonomy normalization',
    'duplicate metadata scoring',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'malformed-skill-md-frontmatter-parser-tests',
    'seed-skill-catalog-parser-regression-tests',
  ],
  sources: [
    'https://zod.dev/api',
    'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html',
  ],
  repoEvidence: [
    'packages/shared/src/parsers/skill-parser.ts',
    'packages/shared/src/utils/quality-score.ts',
  ],
  content: `SKILL.md duplicate list value validation should define equality before any list affects quality scores or later storage. Current parsing preserves array duplicates, case, and inner spacing, while completeness uses raw tag and agent lengths, so tests must characterize that behavior before adding normalize, warn, or reject rules.

The same visible list can carry several forms of one value. Inspect current metadata in the [QA skills directory](/skills), then test exact, case-only, and space-only pairs with controlled source files.

## What does SKILL.md duplicate list value validation need to prove?

SKILL.md duplicate list value validation needs to prove how list values are read, compared, scored, and reported. It must keep current behavior separate from any planned cleanup rule.

The read path lives in packages/shared/src/parsers/skill-parser.ts. Its toStringArray helper maps every array item through String and returns the resulting array in source order.

That array branch does not trim, fold case, or remove repeated values. Therefore, values such as api, API, and a space-padded api remain three strings.

The helper treats one comma-separated string differently. It splits on commas, trims each piece, removes empty pieces, and still keeps repeated values.

This input-form difference deserves its own test. YAML arrays can keep outer spaces inside quoted values, while comma text loses those outer spaces during parsing.

The score path lives in packages/shared/src/utils/quality-score.ts. Completeness adds five points when tags length reaches three and adds agent points at raw lengths three and ten.

Testing types and frameworks also affect completeness, but their current checks need only one entry. Duplicating those values does not add more points after the nonempty condition passes.

The scorer does not use a Set or a canonical taxonomy list. It measures raw array sizes exactly as supplied in parsed frontmatter.

This evidence describes implementation, not a shipped rejection policy. Duplicate input may be undesirable, yet current source does not reject or normalize it.

The [SKILL.md format guide](/blog/skill-md-format-guide) should name any future equality rule. Authors need to know whether qa and QA represent one term or two supported terms.

Tests should report original item, normalized item, first index, and repeated index when a new rule rejects duplicates. Clear positions are more useful than a generic list error.

SKILL.md duplicate list value validation is complete when the parser, schema, scorer, validator, and publish path share one definition. A cleanup in only one layer can leave displayed, stored, and scored lists out of sync.

## duplicate SKILL.md tags: current repository behavior

Duplicate SKILL.md tags remain in parsed frontmatter because toStringArray performs conversion without a uniqueness step. Three exact copies therefore produce tags.length equal to three.

That raw length meets the completeness tag boundary in packages/shared/src/utils/quality-score.ts. The fixed fixture receives five tag points even though it has one distinct label.

Case-only values also remain separate. The parser does not call toLowerCase, and the scorer does not compare tag text.

Space-only variants in YAML arrays remain separate when quotes preserve those spaces. A comma-separated string trims pieces first, but exact repeats still survive.

The first example calls parseSkillMd with both exact and case variants. It asserts values and order so a future transform creates a focused contract diff.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { parseSkillMd } from '@qaskills/shared';

describe('current list parsing', () => {
  it('preserves duplicates and variants from YAML arrays', () => {
    const parsed = parseSkillMd(\`---
name: duplicate-probe
description: A focused fixture for repeated list values.
version: 1.0.0
author: qa-team
license: MIT
tags: [api, api, API, " api "]
testingTypes: [contract]
languages: [typescript]
agents: [claude-code, claude-code]
---

Check list parsing before score tests.
\`);

    expect(parsed.frontmatter.tags).toEqual(['api', 'api', 'API', ' api ']);
    expect(parsed.frontmatter.agents).toEqual(['claude-code', 'claude-code']);
  });

  it('trims comma text but keeps exact repeats', () => {
    const parsed = parseSkillMd(validSourceWith('tags: "api, api, API"'));

    expect(parsed.frontmatter.tags).toEqual(['api', 'api', 'API']);
  });
});
\`\`\`

The second helper should replace only the tags field in a complete valid fixture. Broad string edits can produce malformed YAML and turn a list test into a parser test.

Keep source order in expected arrays. If a future dedupe rule keeps the first value, order determines which spelling survives.

The [malformed frontmatter guide](/blog/malformed-skill-md-frontmatter-parser-tests) covers wrong YAML types and syntax. Duplicate cases should remain valid text so equality is the only disputed rule.

Add empty pieces for comma text, such as api,,web. The current filter removes blank pieces, which proves normalization already differs by input form.

Duplicate SKILL.md tags tests should assert the completeness subtotal separately from parser output. That split shows whether a parser or scorer change caused a later score movement.

## Why does unique Zod arrays change the contract?

Unique Zod arrays change an accepting field into a cross-item validation rule. Each string may be valid alone while the whole list fails because two normalized identities match.

The current frontmatter schema uses plain string arrays. It sets minimum counts for required testing types and languages, but it adds no uniqueness refinement.

Zod's [refinement documentation](https://zod.dev/api) shows how custom checks can inspect a full array and add issues. A project can use that hook after it defines equality and error paths.

Exact uniqueness is the smallest policy. It rejects api twice but permits API and space-padded api as separate values.

Normalized uniqueness can trim and fold case before comparison. It rejects more variants, yet it may merge terms that a case-sensitive external taxonomy treats as distinct.

Canonical uniqueness maps aliases before comparison. This is the strongest semantic rule, but it needs one owned alias table and migration tests.

A transform that silently removes duplicates is not the same as validation. It can make a file pass while hiding an author mistake or changing which label is stored.

A rejection keeps the source intact and asks the author to fix it. A warning can preserve old files during rollout, but the scorer must decide whether repeats still earn points.

The [CI validation article](/blog/validate-skill-md-in-ci-pipeline) can stage warning and error modes by release. Keep the same field path and equality rule through that change.

Unique Zod arrays also affect minimum lengths. Deduplicate before checking a three-item business threshold if that threshold means three distinct values.

SKILL.md duplicate list value validation should test check order. A list with three raw items but one unique item may need both a duplicate issue and a too-few-unique-values issue, or one chosen primary message.

## agent list deduplication test matrix

An agent list deduplication matrix should cross exact, case, and space variants with the scorer's three and ten boundaries. The matrix must show raw and distinct counts together.

Start with a unique list below each edge. Two distinct agents miss the first bonus, while nine distinct agents miss the second.

Add a unique value to reach three and ten. Those controls prove the current inclusive conditions without any duplicate concern.

Then repeat one agent until raw length reaches the same boundary. Current scores move even though exact distinct count remains one.

Case and whitespace rows force the team to define normalized identity. Avoid using real aliases until a registry states whether two names refer to one agent.

| Case | Source values | Raw count | Normalized distinct count | Current score effect |
|---|---|---|---|---|
| First baseline | agent-a, agent-b | 2 | 2 | No agent bonus |
| First edge | agent-a, agent-b, agent-c | 3 | 3 | First five points |
| Exact repeats | agent-a three times | 3 | 1 | First five points |
| Case variants | Agent-A, agent-a, AGENT-A | 3 | 1 after case fold | First five points |
| Upper baseline | Nine unique IDs | 9 | 9 | Only first bonus |
| Upper repeat edge | One ID repeated ten times | 10 | 1 | Both agent bonuses |
| Space variants | agent-a with outer spaces | 3 | 1 after trim | First five points |

Use normalized distinct count only after defining trim and case rules. The current implementation does not compute that column.

Add one mixed row with eight unique agents and two repeats. It reveals whether a proposed unique policy stays below the ten-agent edge.

The [seed parser regression article](/blog/seed-skill-catalog-parser-regression-tests) can sample actual agent arrays. Synthetic values are still best for exact raw and normalized counts.

Agent list deduplication may keep first spelling, keep canonical spelling, or reject all variants. Tests should state the selected action rather than assume Set insertion behavior is the product rule.

Repeat the matrix with a fresh source object. A transform that mutates the input list can make later rows pass with stale normalized state.

### Build a list evidence ledger

For each row, save the source form, parsed items, raw count, cleaned items, distinct count, score part, and issue path in one short record. This ledger lets a reviewer see which step changed the list without tracing a large test or guessing whether parse, clean, check, or score code owns the new result.

Use stable item IDs in tests and show outer spaces with clear marks in failed output, since normal logs can make a padded value look the same as its clean form. Keep case as typed and show the matched first index beside each repeat, which gives the author a direct place to fix.

Add one row where no value repeats after the chosen clean rule, then prove the output order stays the same as source order. A no-change control guards against a sort hidden inside dedupe code, which could shift search facets or user display even when the set of values remains right.

Add one row where the first spelling is not the approved spelling, such as an alias followed by its main name. The expected action must say whether code keeps the first item, replaces it with the main name, or rejects both until the author chooses, because a bare Set cannot make that choice.

Run one large but safe list near any field limit, with a repeat at the start, middle, and end. This case checks that all repeats are found and that the report stays small, while the focused three-item rows still give the clearest proof for score edges.

Keep tag rules apart from agent and framework rules in the ledger, even if they share a trim helper. Free tags may permit text that a fixed list blocks, and a shared output record should reveal each field's own check rather than hide it behind one generic clean flag.

After any transform, freeze the source array in a test and run the clean function twice on a copy. The first run should make the planned list, the second should make the same list, and neither run should change data held by the caller.

Feed the planned list to the scorer only after its own checks pass, then save both raw and scored counts in the result. This last link proves repeated input cannot earn points through a path that skips the selected clean or reject step.

## How should taxonomy normalization be verified?

Taxonomy normalization should be verified as a pure, ordered function before it changes parser or score behavior. Inputs should map to visible canonical outputs or stable issues.

Define trim behavior first. Outer spaces are often safe to remove, while inner spaces can be part of a real multiword label.

Define case behavior per taxonomy. Languages, frameworks, testing types, domains, tags, and agents may not all share one case rule.

Define aliases only from an owned map. Guessing that two close names are equal can merge distinct tools and corrupt search filters.

The OWASP [input validation guidance](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) recommends allowlists for fixed-choice fields and server-side checks. That principle fits known taxonomies, while free-form tags still need a separate rule.

The second code example characterizes duplicate metadata scoring through packages/shared/src/utils/quality-score.ts. It proves why raw and effective counts need distinct assertions.

\`\`\`typescript
import { expect, it } from 'vitest';
import { calculateQualityScore } from '@qaskills/shared';
import type { ParsedSkill } from '@qaskills/shared';

function scoreLists(tags: string[], agents: string[]) {
  const skill: ParsedSkill = {
    frontmatter: {
      name: 'duplicate-score',
      description: 'A stable fixture for raw list score boundaries.',
      version: '1.0.0',
      author: 'qa-team',
      license: 'MIT',
      tags,
      testingTypes: ['contract'],
      frameworks: ['vitest'],
      languages: ['typescript'],
      domains: [],
      agents,
    },
    content: 'Keep body text fixed while list values change.',
    raw: '',
  };
  return calculateQualityScore(skill).completeness;
}

it('counts duplicate tags and agents through raw lengths today', () => {
  expect(scoreLists(['api', 'api', 'api'], ['agent-a', 'agent-a'])).toBe(15);
  expect(scoreLists(['api', 'api', 'api'], ['agent-a', 'agent-a', 'agent-a'])).toBe(20);
  expect(scoreLists(['api', 'api', 'api'], Array(10).fill('agent-a'))).toBe(25);
});
\`\`\`

The first expected 15 contains tag, testing type, and framework points but no agent bonus. The next two rows add agent points only by increasing raw length.

Add a proposed normalizer in its own unit test, then feed normalized output to the scorer in a policy branch. Do not make characterization depend on helper code that has not shipped.

The [SKILL.md format guide](/blog/skill-md-format-guide) should list canonical values for fixed taxonomies. Free tags need length, case, and duplicate rules without pretending they belong to a closed list.

Taxonomy normalization also needs idempotence: normalizing an already normalized list should produce the same list. It should avoid mutating the caller's source array.

Save original and canonical values in safe test diagnostics. For user-facing errors, show enough text to fix the list without logging private or very large metadata.

## duplicate metadata scoring acceptance criteria

Duplicate metadata scoring acceptance criteria should say whether score inputs are raw, normalized, unique, or recognized values. That counted unit must appear in test names and docs.

For current characterization, tags earn points at raw length three and agents earn points at raw lengths three and ten. Parser output retains duplicate entries.

For a unique-value policy, score only after the approved equality rule runs. A three-item list with one normalized identity should remain below the three-value edge.

For a reject policy, validation should stop duplicate input before scoring or storage. If a score is still returned for diagnostics, label it provisional rather than accepted.

For a warning policy, decide whether repeats count during the warning window. Keeping old scores may aid migration, while unique scoring gives earlier product parity.

Required arrays need checks after normalization. Three whitespace strings should not satisfy a meaningful nonempty language or testing type rule.

Issue paths should name the list and repeated positions. One message can identify the first value and each later index without returning a large copy of the array.

The [publishing workflow](/how-to-publish) should show canonical examples before upload. CI, CLI, and API messages should then use the same terms.

Do not recalculate stored quality scores without a migration plan. Removing duplicate credit can change ranking even when authors did not edit a skill.

Duplicate metadata scoring passes when source list, canonical list, diagnostics, subtotal, and stored form all agree. A total-only snapshot cannot prove that chain.

## How do you test SKILL.md duplicate list value validation step by step?

Test SKILL.md duplicate list value validation from source form through score output. Change one list and one equality feature at a time.

1. Read packages/shared/src/parsers/skill-parser.ts and packages/shared/src/utils/quality-score.ts, then record raw conversion and length boundaries.
2. Build one known-valid SKILL.md control with unique tags, testing types, frameworks, languages, domains, and agents.
3. Add exact, case-only, outer-space, comma-text, empty-piece, alias, and mixed duplicate fixtures for each owned list type.
4. Assert parsed arrays and score subtotals before applying any planned normalization or rejection rule.
5. Approve equality per taxonomy, then test canonical output, stable issue paths, unique counts, and input immutability.
6. Run parser, validator, scorer, publish, and catalog regressions in CI before migrating stored metadata or scores.

At step one, note the parser's array and comma-string branches. They trim values differently and need paired tests.

At step two, keep body, author, version, and every unrelated list fixed. That control gives score changes one clear source.

At step three, use quotes around whitespace variants so YAML preserves them. Unquoted YAML formatting may erase the intended edge before application code runs.

At step four, assert completeness rather than only total. The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) can keep scorer failures close to their cause.

At step five, use separate rules when a closed taxonomy and free tags differ. One broad lowercase transform can damage product names.

At step six, inspect old data without changing it first. The [seed regression guide](/blog/seed-skill-catalog-parser-regression-tests) helps find real duplicate patterns and aliases.

Run the normalized list through the same function twice and compare exact arrays. Idempotence catches transforms that keep adding prefixes or changing case.

SKILL.md duplicate list value validation passes this procedure when each duplicate has one expected action and cannot change a score through an untested path. The evidence ledger should show that action from source text through the final score part.

## SKILL.md duplicate list value validation rollout and regression checks

Begin rollout with a read-only report of exact, case-folded, trimmed, and alias-based duplicate groups. Keep those categories separate because each may need a different fix.

Count affected skills and score edges, but do not print full private metadata. A key, safe value, and record ID are enough for a controlled report.

Approve canonical terms with taxonomy owners. Framework and agent names should not be changed by a generic text rule without owner review.

Add warnings before errors when existing published files contain repeats. Give authors one release window and a clear command or page for repair.

Align parser, schema, validator, scorer, API, and storage changes. The [publication guide](/how-to-publish) should not accept a list that local CI rejects under the same package version.

Recalculate scores only after the canonical data migration is checked. Save old and new subtotals so ranking changes can be explained and rolled back.

Use [malformed parser tests](/blog/malformed-skill-md-frontmatter-parser-tests) for type failures and [seed catalog tests](/blog/seed-skill-catalog-parser-regression-tests) for existing records. Keep the focused duplicate matrix as the policy source.

Add one regression for each score edge: three tags, three agents, and ten agents. Include raw counts above the edge whose unique counts remain below it.

Check search and filter behavior after stored list cleanup. Merging labels may change facet counts even when skill membership stays correct.

Finish with a packed validator run and one test publication. Browse the [skill directory](/skills) and confirm canonical values appear once without an unexplained score increase.

### Dry-run the score and data change

Start with a read-only scan that makes a proposed clean list for each skill but writes nothing, then sort the report by changed score edge. Teams should inspect skills that cross three tags, three agents, or ten agents first, since those rows can change rank while a simple duplicate cleanup elsewhere leaves points unchanged.

For each changed row, show old items, proposed items, old score part, new score part, and the rule that matched each repeat. Keep this report in a test-only store with safe access, because full metadata and author names may not belong in a broad CI log.

Sample at least one exact repeat, one case match, one space match, and one alias match from real data, then compare each result with the focused unit row. A mismatch means the clean rule or fixture missed a live form, and the team should fix that gap before any write or score update.

Run the same report twice against an unchanged copy of the data and require byte-for-byte rows in the same order. This repeat proves the plan is stable and helps catch a rule that reads time, map order, or mutable state while choosing which spelling to keep.

Before the write pass, export a small backout map from record ID to old list and old score part, then test that map on a throwaway copy. A safe backout does not excuse a bad rule, but it makes the planned data change easier to review and limits harm if a missed alias appears.

Apply the change to a bounded test set, read each row back, and run the validator plus scorer on the stored form. The stored list should match the plan exactly, have no repeat under the chosen rule, and yield the same score part shown in the dry-run report.

Check search facets and detail pages with the bounded set before a full pass, since a merged label can change counts and filters outside score code. Use exact skill IDs to prove membership stays right even when one label vanishes or changes to its main spelling.

When the full pass is approved, write in small groups and stop on any row whose current data no longer matches the report input. This compare-before-write rule keeps a new author edit from being replaced by a plan made from an older copy.

After all groups finish, rerun the read-only scan and require no unplanned repeats, no score drift, and no row left half changed. Keep the old and new totals with the release note so a later rank question can be tied to a known data rule for each later score and rank review.

Close the work with one fresh publish that includes a planned repeat and must fail or warn as designed before storage. That end test proves new data cannot recreate the same debt right after the old rows and scores have been cleaned, while the same safe field path and fix note guide the author before any new row can enter search or rank data.

## Frequently Asked Questions

### What happens to duplicate SKILL.md tags today?

The parser keeps duplicate array entries and repeated comma-list values, although comma pieces are trimmed first. The scorer awards the tag completeness points when raw tags length reaches three. Therefore, three copies can meet that edge today, even though no repository rule declares them three distinct labels.

### Do unique Zod arrays remove values automatically?

Not by default, and the current schema uses plain string arrays without a uniqueness refinement. A custom rule can reject duplicate values or a transform can create canonical output, but those are different contracts. Tests should state whether input fails, warns, or changes before any such code ships.

### When should agent list deduplication happen?

Choose a clear boundary before scoring and storage, then apply the same rule across local and publish flows. Normalize first if equality ignores case or outer space, and validate the resulting distinct list. Preserve original input for useful errors without mutating the caller's array.

### Does taxonomy normalization use one rule for every list?

Usually not, because fixed taxonomies and free-form tags have different ownership. Agents and frameworks may use canonical registries, while tags may allow broader text. Define trim, case, aliases, and valid values per field, then test each policy with exact and variant duplicates.

### How should duplicate metadata scoring be migrated?

First report current raw and proposed distinct counts, then identify skills crossing score edges. Warn authors, repair canonical data, and recalculate under an approved release plan. Save old and new subtotals so ranking changes remain traceable rather than appearing as unexplained quality loss.

## Conclusion

SKILL.md duplicate list value validation must define equality before repeats affect parsing, scoring, and storage. Characterize raw array behavior first, then align canonical values, issue paths, distinct counts, and score migration across every entry point.

Review real [QA skill metadata](/skills), follow [how to publish](/how-to-publish), and add exact, case, space, three-item, and ten-item fixtures before enforcing a duplicate policy. Keep the dry-run score ledger so each changed point can be traced to one approved list rule.`,
};
