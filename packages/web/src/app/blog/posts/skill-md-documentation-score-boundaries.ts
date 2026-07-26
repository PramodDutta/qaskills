import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md documentation score boundaries Guide',
  description:
    'SKILL.md documentation score boundaries: test exact 100, 500, and 1,000 character edges. See repository evidence, practical fixtures, and test criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md documentation score boundaries',
  keywords: [
    'SKILL.md documentation score boundaries',
    'quality score off by one',
    '100 character skill content',
    '500 character documentation score',
    '1000 character score threshold',
    'boundary value quality tests',
  ],
  relatedSlugs: [
    'how-to-write-high-quality-qa-skills',
    'validate-skill-md-in-ci-pipeline',
    'seed-skill-catalog-parser-regression-tests',
    'how-to-publish-ai-agent-skill-directory',
  ],
  sources: ['https://agentskills.io/specification', 'https://zod.dev/api'],
  repoEvidence: [
    'packages/shared/src/utils/quality-score.ts',
    'packages/skill-validator/src/index.ts',
  ],
  content: `SKILL.md documentation score boundaries currently award length points only above 100, 500, and 1,000 content characters. Exact boundaries receive the prior tier: 100 gets zero length points, 500 gets five, and 1,000 gets ten. Tests should pin these comparisons separately from headings, code, lists, schema points, and warnings.

The exact results follow strict greater-than checks in the shared scorer. Whether those edges should change is a product decision, not something a test should silently redefine.

## What does SKILL.md documentation score boundaries need to prove?

SKILL.md documentation score boundaries must prove every value immediately below, at, and above each length threshold. The suite also needs to isolate length points from structural documentation points so a heading, list, or code fence cannot hide an edge error.

The scoring implementation lives in \`packages/shared/src/utils/quality-score.ts\`. Its private documentation function adds five points when content length is greater than 100, another five above 500, and another five above 1,000.

The same function can add five points for a Markdown heading, five for a code fence, and three for a list marker. It caps documentation at thirty, so mixed fixtures can obscure which condition produced the final value.

Use plain repeated letters for the primary length matrix. A string such as \`'x'.repeat(500)\` has an exact JavaScript length, contains no structural markers, and leaves the expected documentation points easy to calculate.

The validator boundary in \`packages/skill-validator/src/index.ts\` adds another exact comparison. It warns that content is very short only when parsed content length is less than 100.

That means content of exactly 100 characters gets no short-content warning and still gets no length score. This gap may be intentional, but it needs a named test because two nearby policies use different operators.

Keep this suite separate from general advice in [how to write a high-quality skill](/blog/how-to-write-high-quality-qa-skills). That guide can recommend useful documentation, while boundary tests protect the actual points returned by repository code.

Start with lengths 99, 100, and 101. Expected length points are zero, zero, and five, while warning presence is true, false, and false.

Then test 499, 500, and 501. Those cases should return five, five, and ten length points when no structural markers are present.

Finish with 999, 1,000, and 1,001. They should return ten, ten, and fifteen length points under the current strict greater-than comparisons.

The public result is a full \`QualityBreakdown\`, not only documentation. Tests can assert the documentation field directly and calculate the total from all pillars, but they should avoid brittle snapshots of unrelated fields.

The [Agent Skills specification](https://agentskills.io/specification) defines the portable SKILL.md structure and metadata contract. It does not define QASkills documentation points, so use repository code as the authority for these numeric thresholds.

The [Zod API documentation](https://zod.dev/api) describes schema checks used elsewhere in validation. Schema success does not determine documentation length points, and the scoring tests should keep those concerns independent.

Run the focused matrix before publishing score changes through the [CI validation guide](/blog/validate-skill-md-in-ci-pipeline). A clear table of length, warning, documentation score, and total makes operator changes visible during review.

## quality score off by one: current repository behavior

Quality score off by one reports often come from reading a threshold as inclusive when the code uses a strict comparison. The current scorer says \`content.length > 100\`, not greater than or equal to 100.

At exactly 100 characters, the first five documentation points are absent. At 101 characters, that branch adds five points and leaves later length branches false.

The pattern repeats at 500 and 1,000. Exact values remain in the lower tier, and the next character enters the higher tier.

This behavior is deterministic for JavaScript string length. However, string length counts UTF-16 code units, so a fixture made from some Unicode characters may not match a reader's visual character count.

Use ASCII for numeric boundary tests. Add Unicode length tests only if the scoring rule explicitly addresses code points, grapheme clusters, or bytes.

The scorer receives \`skill.content\`, which is already normalized by \`parseSkillMd\`. That parser calls \`trim\`, so leading and trailing whitespace from a source body may not count toward the score.

Direct scorer tests can construct \`ParsedSkill\` objects with exact content lengths. Validator integration tests should construct source bodies whose trimmed content still has the expected length.

Avoid a final newline inside expected content. The parser removes outer whitespace, and a test that counts source characters instead of parsed content can report the wrong edge.

The short-content warning uses \`parsed.content.length < 100\`. It disappears at 100, creating a one-character rule seam between warning and score.

Do not call that seam a defect without a requirement. Characterization tests should name current results, while a proposed inclusive rule should have its own expected table and review.

The scorer's total is capped at 100 after schema, documentation, completeness, and freshness are added. A high-scoring fixture could hide a five-point documentation change behind that cap.

Use minimal frontmatter and low completeness for total assertions, or assert the uncapped documentation field directly. The latter gives the most focused signal.

Keep [seed parser regression tests](/blog/seed-skill-catalog-parser-regression-tests) as broad integration coverage. Seed bodies vary in many ways, so they cannot replace exact repeated-character boundaries.

Reports should state both source body length and parsed content length. If those numbers differ, the failure belongs to fixture construction or parser normalization before scoring begins.

## Why does 100 character skill content change the contract?

One hundred character skill content changes the contract because the warning and scoring branches meet at that exact value without sharing the same inclusion rule. Authors see no short-content warning, yet the first length award remains zero.

A test suite that checks only 99 and 101 will miss that exact result. Both surrounding cases can pass even if a later refactor accidentally changes the boundary itself.

The edge also demonstrates why requirement wording matters. "At least 100 characters" implies inclusion, while "more than 100 characters" matches the current scorer.

Document current behavior with exact numbers before discussing the rule. Product owners can then choose strict or inclusive thresholds with a visible impact table.

If the rule changes to inclusive comparisons, three rows should change: 100, 500, and 1,000. The rows immediately below and above should remain stable.

Do not update snapshots wholesale after such a change. Assert each boundary directly so review shows which tier moved and why.

The warning rule may stay at less than 100 even if scoring becomes inclusive. That combination would give exactly 100 characters the first five points and no warning, which is internally clear.

Alternatively, the scorer may remain strict and guidance may state that 101 characters are required for points. That choice is also testable, but user-facing wording must match it.

Body structure complicates examples. A 100-character body containing \`## \` can receive five structural points even though it receives no length points.

Therefore, assertions should call the field "length-derived documentation points" in test descriptions. The returned documentation value includes both length and structure, so fixtures must suppress structure for exact totals.

Create separate additive tests for headings, code, and lists. Each should use a base length far from 100, 500, or 1,000 to avoid combining two boundaries.

Use the [publishing directory guide](/blog/how-to-publish-ai-agent-skill-directory) to explain the score to authors. Keep its guidance aligned with the exact operator selected by code.

The acceptance rule is not that every 100-character body has the same score. It is that the length branch contributes zero at 100, while all other branches remain independently testable.

## 500 character documentation score test matrix

The 500 character documentation score matrix should expose all three length tiers and the short warning boundary. Plain ASCII content keeps every row free from heading, code, and list bonuses.

| Case | Parsed content length | Short-content warning | Length-derived documentation points |
|---|---:|---|---:|
| Below first edge | 99 | Present | 0 |
| At first edge | 100 | Absent | 0 |
| Above first edge | 101 | Absent | 5 |
| Below second edge | 499 | Absent | 5 |
| At second edge | 500 | Absent | 5 |
| Above second edge | 501 | Absent | 10 |
| Below third edge | 999 | Absent | 10 |
| At third edge | 1,000 | Absent | 10 |
| Above third edge | 1,001 | Absent | 15 |

Generate each body from \`'x'.repeat(length)\`. Assert its length before passing it to production code, because a helper typo could otherwise look like a scorer defect.

At the direct scorer layer, use the same frontmatter for every row. The schema, completeness, and freshness fields should not change while content length moves.

At the validator layer, wrap the body in valid frontmatter and let \`parseSkillMd\` produce content. Assert parsed length indirectly through the returned warning and score, or expose a shared fixture check before validation.

The warning text can be projected to field and a stable phrase. Full punctuation may change without altering the less-than rule.

For documentation points, assert the numeric field exactly. A greater-than assertion would allow several incorrect tiers and weaken the reason for boundary tests.

Add one structural control after the pure matrix. A 100-character body containing a heading should show five documentation points from structure, while the length branch remains zero.

Add one cap control separately if coverage needs it. Do not put cap behavior in every boundary row, because a total of thirty could hide added points.

If the rule changes, retain the old table in the pull request description rather than in permanent test logic. The final tests should encode only the approved contract, with commit history preserving the migration.

Use [CI validation](/blog/validate-skill-md-in-ci-pipeline) to run the matrix in the shared package and one validator integration test. That combination catches both score operators and parsed-body length changes.

Work one score by hand before code review. A plain 500-char body clears only the first length gate, so its length share is five and not ten.

Move that body to 501 chars and run the same call. The next five points now apply, while all field data and all shape marks stay fixed.

Do the same at 1,000 and 1,001. The first has ten length points, and the next char earns the last five from the three size gates.

Now go back to 100, where the two rules meet. The short-text warn is gone, but the first length award has not begun under the code as it stands.

That result can look odd in a UI if the copy says one hundred is enough. The test should not hide the gap; the team should pick words that match the rule.

Keep score math in the test name or case note. A row called \`500 -> 5\` tells far more than a wide snapshot with four score fields.

Use one field set for all rows and freeze it in the helper. If tags or agents change by case, the total can move even when the length share does not.

Check the \`documentation\` field first, then check total only where it adds value. This order points a fail at the right part of the score.

For a shape test, use a short body with one heading and no list or code mark. It should gain the heading share, not a size share by chance.

For the list test, keep the body far from each size edge. A dash and space can add points, so it should not sit in the core length table.

For the code test, do the same with one fence pair. Its own case can prove the shape rule without making a 500-char row hard to read.

Add one cap case with all shape marks and enough text. The cap should hold at thirty, yet each raw branch should still have a small unit test.

When an edge shifts, list the rows that should move before code is changed. A strict-to-at-least change moves three exact rows, not the rows on each side.

Run a seed scan after the unit set, then show real score shifts. This broad pass finds user impact, while the small table says which code rule caused it.

Do not call a long body good just due to points. The score is one check, while a human still has to judge whether the steps are true and clear.

## How should 1000 character score threshold be verified?

The 1000 character score threshold should be verified with direct score assertions at 999, 1,000, and 1,001. The direct fixture avoids parser whitespace effects and makes the strict comparison the only moving part.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { calculateQualityScore, type ParsedSkill } from '@qaskills/shared';

const parsedSkillWithLength = (length: number): ParsedSkill => ({
  frontmatter: {
    name: 'Boundary Probe',
    description: 'A complete score boundary fixture.',
    version: '1.0.0',
    author: 'qa-team',
    license: 'MIT',
    tags: [],
    testingTypes: ['unit'],
    frameworks: [],
    languages: ['typescript'],
    domains: [],
    agents: [],
  },
  content: 'x'.repeat(length),
  raw: '',
});

describe('documentation length points', () => {
  it.each([
    [99, 0],
    [100, 0],
    [101, 5],
    [500, 5],
    [501, 10],
    [1000, 10],
    [1001, 15],
  ])('scores length %i as %i documentation points', (length, expected) => {
    const skill = parsedSkillWithLength(length);
    expect(skill.content).toHaveLength(length);
    expect(calculateQualityScore(skill).documentation).toBe(expected);
  });
});
\`\`\`

This fixture has no heading token, code fence, or list marker. Its documentation field therefore contains only the three length awards.

The second example crosses the public validator boundary and checks the exact 100-character warning seam. It uses complete frontmatter so schema errors cannot distract from the intended result.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { validateSkillContent } from '../src/index';

const sourceWithBodyLength = (length: number) => \`---
name: Boundary Probe
description: A complete score boundary fixture.
version: 1.0.0
author: qa-team
license: MIT
testingTypes: [unit]
languages: [typescript]
---

\${'x'.repeat(length)}\`;

describe('short-content warning boundary', () => {
  it.each([
    [99, true, 0],
    [100, false, 0],
    [101, false, 5],
  ])('checks length %i', (length, shouldWarn, documentation) => {
    const result = validateSkillContent(sourceWithBodyLength(length));
    const hasShortWarning = result.warnings.some(
      (warning) => warning.field === 'content' && warning.message.includes('very short'),
    );

    expect(hasShortWarning).toBe(shouldWarn);
    expect(result.qualityBreakdown.documentation).toBe(documentation);
  });
});
\`\`\`

Keep the body adjacent to the template ending. Extra indentation or a final explanatory line would alter parsed length and invalidate the edge.

If test formatting inserts a newline, assert the parsed body length in a helper test before trusting score output. The production parser trims outer whitespace, but explicit verification makes fixture intent clear.

Do not import private \`scoreDocumentation\`. Testing through \`calculateQualityScore\` protects the public shared boundary while still exposing the documentation breakdown.

Add the 500 and 1,000 validator rows only if parser integration needs them. The direct table already protects arithmetic, and one exact warning seam is enough to prove outer flow.

Use [how to publish](/how-to-publish) for a final command check after any rule change. The displayed score and warning should agree with the shared result rather than applying another threshold.

## boundary value quality tests acceptance criteria

Boundary value quality tests pass when each below, exact, and above value returns one documented result. Every fixture must prove its parsed content length before asserting score or warning behavior.

The first tier requires 99, 100, and 101. Expected length points are zero, zero, and five under current code.

The second tier requires 499, 500, and 501. Expected length points are five, five, and ten.

The third tier requires 999, 1,000, and 1,001. Expected length points are ten, ten, and fifteen.

The warning matrix needs 99, 100, and 101. Only 99 should include the short-content warning from the current less-than comparison.

Pure length fixtures must contain no heading prefix, triple backtick, dash-space line, or star-space line. Any such marker can add structural documentation points and make the expected result ambiguous.

Use ASCII repeated content for numeric edges. This makes JavaScript length equal the intended test count and keeps Unicode counting outside the core suite.

Assert the documentation breakdown field before the total. Total assertions may still be useful, but schema, completeness, freshness, and the 100-point cap can influence them.

When an operator changes, require a product note that names exact moved rows. Tests should not infer intent from a refactor or automatically approve updated snapshots.

Keep score tests deterministic and free from dates. Freshness is currently a fixed fifteen points in the shared function, but length assertions should not depend on future timestamp logic.

Run broad seed checks after the focused matrix. The [seed regression guide](/blog/seed-skill-catalog-parser-regression-tests) can detect catalog-level score movement while the table identifies the exact cause.

SKILL.md documentation score boundaries are accepted when code, tests, and author-facing wording all agree on strict or inclusive operators. The current repository evidence supports strict greater-than scoring and less-than warning behavior.

## How do you test SKILL.md documentation score boundaries step by step?

Test SKILL.md documentation score boundaries by isolating raw character length before adding parser and warning integration. Direct score tests should fail first when an operator or tier changes.

1. Read \`packages/shared/src/utils/quality-score.ts\` and list each length, shape, cap, and total rule on its own row, then note which public field can prove that branch without a broad snapshot or a score that has already hit its cap, and tag each row by the one score branch its test can prove alone
2. Read \`packages/skill-validator/src/index.ts\` and record the less-than 100 short-content warning rule, including its field and one stable phrase, so the test can show why 99 warns while 100 does not, and keep warning facts apart from score points in each case alone
3. Build one low-completeness \`ParsedSkill\` helper whose body is plain repeated ASCII with no heading, fence, dash-space, or star-space mark, then assert the body length inside the helper before the score call begins so no hidden shape mark can add points to a length row
4. Test 99, 100, 101, 499, 500, 501, 999, 1,000, and 1,001 through \`calculateQualityScore\`, using the same field set for all rows and fixed expected points that come from the approved rule, in low-to-high order with the expected point sum beside each edge
5. Assert fixture length and exact documentation points for every row before checking any total, then add a short case label that prints the edge and result without dumping the whole body when the row fails so a total cap or field change cannot hide the length result
6. Wrap 99, 100, and 101 character bodies in valid source and verify the public warning seam through \`validateSkillContent\`, while checking that the parser returns the planned body length after its outer trim rule and asserting the warning field plus one stable part of its text
7. Add separate heading, code, list, and documentation-cap tests far from every length threshold, with one shape mark per case and a plain control that proves no hidden mark came from shared fixture text so each shape case can earn just the branch named in its test
8. Run focused shared tests, validator integration, and seed score regression checks before merging a rule change, then report exact moved rows and measured catalog shifts rather than a vague claim that scores changed, with a fixed seed revision and the same score setup for both runs on the same source set

Keep the direct matrix table-driven because every row shares one simple oracle. Use named standalone tests for structure and cap behavior, where the setup and reason differ.

When a direct row fails, print expected length, actual length, and documentation result. Those three values usually reveal fixture errors and operator changes immediately.

When an integration row fails, inspect parsed body length before changing expected points. Source delimiters and outer whitespace can move the effective value.

Do not rewrite the table from observed runtime results. Expected values must come from the approved rule, with the current table grounded in verified repository comparisons.

Publish the final rule beside [quality skill guidance](/blog/how-to-write-high-quality-qa-skills). Authors should know whether an exact boundary earns points without reading TypeScript.

## SKILL.md documentation score boundaries rollout and regression checks

SKILL.md documentation score boundaries rollout starts with a decision about strict versus inclusive language. The current implementation is strict, so any inclusive switch changes three exact rows and may move catalog scores.

Shared package owners should review score arithmetic and the documentation cap. Validator owners should review warning wording, while web owners should verify any displayed breakdown or ranking derived from totals.

Before changing operators, calculate score movement for the current seed catalog. Report measured counts and score differences, not assumptions about how many bodies sit on exact lengths.

Keep the focused matrix unchanged during characterization. Add proposed expectations in the change discussion, then update tests only with the approved implementation.

After code changes, run every row plus structure and cap controls. A broad passing seed suite alone cannot prove exact edge behavior.

Check any ranking or cache pipeline that stores quality scores. A five-point change may require recomputation even when validation itself is correct.

Review user-facing copy for "more than" and "at least." Those phrases encode different operators and should match test expectations exactly.

Do not promise that length alone means high quality. The scorer also considers metadata completeness and useful document structures, while editorial review addresses accuracy and clarity.

Use [directory publishing guidance](/blog/how-to-publish-ai-agent-skill-directory) to announce any scoring rule change. Include effective date and recomputation details if existing records move.

The lasting regression suite should remain small and explicit: nine length rows, three warning rows, three structure branches, and one cap case. Each test should identify the contribution it protects.

## Frequently Asked Questions

### What should quality score off by one tests assert?

Assert parsed content length and exact documentation points for values below, at, and above every threshold. Under current code, exact 100, 500, and 1,000 remain in the lower tier. Keep heading, code, and list markers out of length fixtures in every run.

### How does 100 character skill content affect the SKILL.md contract?

At exactly 100 parsed characters, the validator no longer emits its short-content warning, yet the scorer still awards zero length points. Tests should preserve that observed seam unless product owners approve an inclusive scoring rule and align public wording with it.

### Which fixture best exposes 500 character documentation score?

Use plain \`x\` strings of lengths 499, 500, and 501 inside otherwise identical \`ParsedSkill\` objects. They contain no structural bonus markers. The expected documentation values are five, five, and ten, which exposes the strict greater-than comparison in a fixed table.

### When should teams check 1000 character score threshold?

Run the boundary matrix whenever score arithmetic, parser trimming, body storage, validator integration, quality displays, or catalog recomputation changes. Also run it after shared package refactors. Any of those changes can move effective length or hide a five-point difference for each supported build.

### What is the pass criterion for boundary value quality tests?

All nine length rows must return their approved exact documentation values, and warning rows must match the less-than 100 rule. Fixtures must prove their own parsed lengths and exclude structural markers. Any operator change requires a reviewed rule decision rather than a snapshot refresh.

## Conclusion

SKILL.md documentation score boundaries currently use strict greater-than checks at 100, 500, and 1,000 characters, while the short warning uses less than 100. Add the exact matrix first, then decide whether author guidance should preserve or revise those edges.

Open the [skills directory](/skills), inspect a published SKILL.md score, then use [how to publish](/how-to-publish) to apply these boundary tests before publication. Keep the exact edge rows in each score review.`,
};
