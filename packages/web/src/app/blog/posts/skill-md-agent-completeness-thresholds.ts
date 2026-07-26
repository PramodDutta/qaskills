import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md agent completeness thresholds Guide',
  description:
    'SKILL.md agent completeness thresholds: test score boundaries using unique agent IDs. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md agent completeness thresholds',
  keywords: [
    'SKILL.md agent completeness thresholds',
    'three agent score boundary',
    'ten agent completeness bonus',
    'duplicate agents quality score',
    'unsupported agent scoring',
    'skill compatibility score test',
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
    'packages/shared/src/schemas/skill-schema.ts',
  ],
  content: `SKILL.md agent completeness thresholds currently award five completeness points at three raw agent entries and five more at ten. Tests should characterize 2, 3, 9, and 10 entries, then add duplicate and unsupported identifiers before any team chooses a unique, recognized-agent policy.

That distinction keeps current behavior separate from a proposed rule. Browse the [skill directory](/skills) to see why compatibility data helps discovery, but treat source code as the scoring contract.

## What does SKILL.md agent completeness thresholds need to prove?

SKILL.md agent completeness thresholds need to prove exactly which array lengths change the completeness result. They also need to show whether identity, support, or uniqueness affects those changes today.

- The production evidence begins in packages/shared/src/utils/quality-score.ts. Its scoreCompleteness function adds points for tags, testing types, frameworks, and two separate agent count checks.

- The first agent check uses fm.agents.length greater than or equal to three. The second uses the same raw length with a boundary of ten.

- No Set, registry lookup, trim operation, or case fold appears inside those checks. Therefore, the current score observes entry count rather than verified compatibility breadth.

- The companion schema in packages/shared/src/schemas/skill-schema.ts defines agents as an array of strings with an empty default. It does not require known identifiers, reject duplicates, or set a maximum.

- That behavior is valid characterization evidence, not proof of the best product policy. A test suite should preserve the observed result until maintainers approve a different meaning for compatibility.

- The [Agent Skills specification](https://agentskills.io/specification) defines standard frontmatter fields and permits extra product data inside metadata. It does not define QASkills agent bonus points, so the repository must own that local scoring rule.

- Start with a minimal valid ParsedSkill whose unrelated score inputs remain fixed. Changing tags, content length, or frameworks beside agents would make a boundary result hard to explain.

- Use the [quality writing guide](/blog/how-to-write-high-quality-qa-skills) to build realistic instructions. Keep the scoring fixture smaller than a full published skill so each failed assertion names one cause.

- The core assertion should report both the agent array and completeness subtotal. A total-only failure can hide the five-point movement among documentation, schema, and freshness points.

- SKILL.md agent completeness thresholds also need a policy test that fails before a planned change. Keep that proposed test separate from characterization so reviewers know which behavior exists and which behavior is desired.

## three agent score boundary: current repository behavior

The three agent score boundary is inclusive because the production condition uses greater than or equal to three. Two entries miss the first bonus, while three entries receive it.

Assume the fixture already earns five points each for tags, testing types, and frameworks. Its completeness subtotal is then 15 with two agents and 20 with three agents.

Nine agents still produce 20 completeness points under that fixture. The second agent bonus does not appear until the raw list reaches ten.

The freshness, documentation, and schema subtotals can change the final score, but they do not change this boundary. Assert completeness directly to isolate the rule.

This characterization test calls the exported scorer and supplies fixed frontmatter. It mirrors the exact conditions in packages/shared/src/utils/quality-score.ts without copying the scoring formula into expected code.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { calculateQualityScore } from '@qaskills/shared';
import type { ParsedSkill } from '@qaskills/shared';

function skillWithAgents(agents: string[]): ParsedSkill {
  return {
    frontmatter: {
      name: 'agent-boundary',
      description: 'A focused fixture for compatibility scoring.',
      version: '1.0.0',
      author: 'qa-team',
      license: 'MIT',
      tags: ['agents', 'scoring', 'contract'],
      testingTypes: ['contract'],
      frameworks: ['vitest'],
      languages: ['typescript'],
      domains: [],
      agents,
    },
    content: 'Use this fixture to check one stable scoring rule.',
    raw: '',
  };
}

describe('agent completeness boundaries', () => {
  it.each([
    { count: 2, expected: 15 },
    { count: 3, expected: 20 },
    { count: 9, expected: 20 },
    { count: 10, expected: 25 },
  ])('scores $count raw agent entries', ({ count, expected }) => {
    const agents = Array.from({ length: count }, (_, index) => \`agent-\${index}\`);

    expect(calculateQualityScore(skillWithAgents(agents)).completeness).toBe(expected);
  });
});
\`\`\`

- The generated identifiers are intentionally distinct in this baseline. Duplicate and unsupported cases belong in separate rows because they ask a different contract question.

- Keep the expected values literal in this test. Calling another helper that computes points from length would duplicate the implementation and let the same mistake pass twice.

- The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) explains where a focused shared-package test should run. Put this case near scorer tests so a boundary edit produces a direct failure.

- Also test zero and an empty default if broader coverage is useful. Those cases protect schema defaults, but they do not replace the 2-to-3 and 9-to-10 transitions.

- The three agent score boundary says nothing about whether three agent IDs are usable. It proves only that three strings satisfy the currently shipped count condition.

### Read the score as five yes or no checks

The score part can be read as five small switches: enough tags, one test type, one tool, three agent names, and ten agent names. A test should show each switch on its own line, which makes the five-point jump plain when one row fails.

Start with all non-agent switches on, then change just the agent list while the rest of the skill stays fixed for the whole run. This base makes 15 the clear start score, so the first and last agent switches can be seen without noise from text or tags.

Name each row with the raw count and a short list kind such as two distinct, three distinct, three same, nine distinct, or ten same. Those names tell the reader what the code saw, while the result tells the reader which switch moved and by how much.

Print the four part scores when a test fails, but put the list count and the score part first in the log. A full total can aid a later check, yet the small part is what shows this rule and keeps the first cause close at hand.

Make a new array for each row and freeze the base skill in the test, since one push in a prior row can turn the next case green by mistake. A clean object per run is cheap here and gives the edge check a firm start each time.

Run the same rows in a new order once, with ten first and two last, to prove no prior score or list is kept in shared state. The pass map should stay the same, and a changed map points to test leak or a stateful helper rather than this count rule.

Keep literal score values in the test and put the source path in the case note, so a reviewer can match 15, 20, and 25 to the live code fast. Do not make a test helper add the same five points, since that copy could share the same wrong rule.

When a new rule is planned, add new rows beside these old ones but keep the old group green until the code change lands. This split lets the pull request show what is true now, what should be true next, and which lines make the change real.

## Why does ten agent completeness bonus change the contract?

The ten agent completeness bonus changes the score by another five points at a much wider declared reach. That makes identity quality more important because ten repeated strings can currently resemble ten distinct integrations.

- At nine entries, the fixture receives only the first agent bonus. At ten entries, both checks pass and the completeness subtotal reaches its 25-point cap.

- The cap does not neutralize duplicate behavior. It simply limits completeness after every listed condition has contributed its points.

- A team may reasonably decide that raw declarations are sufficient because scoring rewards documentation effort rather than verified execution. Another team may require unique, supported identifiers because users read the score as compatibility breadth.

- Tests cannot choose between those meanings without an approved product statement. They can expose the difference with paired fixtures and make the decision visible in review.

- One pair should contain ten unique recognized IDs and ten copies of one recognized ID. A second pair should compare ten recognized IDs with ten arbitrary strings.

- If all three inputs receive the same current subtotal, that is expected characterization. Do not label the result a defect unless the accepted score definition says uniqueness or support is required.

- The [publishing workflow](/how-to-publish) should state any approved normalization rule before contributors submit metadata. A hidden scoring-only rule would leave validation and author feedback inconsistent.

- The Agent Skills specification leaves agent compatibility scoring outside its standard fields. This local freedom also creates local responsibility for stable identifiers, migrations, and diagnostics.

- A future policy could count unique normalized entries, unique known entries, or successful compatibility checks. Each option answers a different question and needs different fixtures.

- SKILL.md agent completeness thresholds should therefore name the counted unit in test titles. Phrases such as raw entries, unique IDs, and recognized IDs prevent a silent semantic change.

## duplicate agents quality score test matrix

A duplicate agents quality score matrix should cross each numerical boundary with identity variants. The important comparison is not merely valid versus invalid, but raw count versus effective compatibility count.

Use two unique agents as the baseline below the first boundary. Then add a third unique agent to prove the inclusive change.

For the upper edge, compare nine and ten unique values. Keep every unrelated field and every content byte identical between those rows.

The duplicate row should place repeated values exactly at a boundary. Three copies of one identifier currently pass the first length test even though their unique count is one.

An unsupported row should use clear fixture names that cannot be confused with registered agents. The schema currently accepts arbitrary strings, so this row documents acceptance rather than predicting a validation error.

| Case | Input or boundary | Layer under test | Current assertion | Policy question |
|---|---|---|---|---|
| Baseline | Two unique agents | Quality scorer | Completeness stays at 15 | Is raw count the intended unit? |
| First edge | Three unique agents | Quality scorer | Completeness becomes 20 | Is the boundary inclusive? |
| Upper baseline | Nine unique agents | Quality scorer | Completeness remains 20 | Does the second bonus wait for ten? |
| Upper edge | Ten unique agents | Quality scorer | Completeness becomes 25 | Must every ID be recognized? |
| Duplicate edge | Three copies of one agent | Schema and scorer | Schema accepts; score becomes 20 | Should duplicates count once? |
| Unknown edge | Ten unsupported strings | Schema and scorer | Schema accepts; score becomes 25 | Should support affect scoring? |

- Record current assertions in one test group and desired policy assertions in another. Mixing them into one table can make a planned failure look like a regression.

- If maintainers choose unique counting, add case-only and whitespace variants. The normalization order must be explicit before uniqueness is measured.

- If maintainers choose recognized counting, define one canonical registry and test aliases separately. A stale test-local list would create a second source of truth.

- The [parser regression article](/blog/seed-skill-catalog-parser-regression-tests) shows how seed fixtures can reveal metadata drift. Use that method to sample real agent values without turning the seed catalog into the scoring specification.

- Keep score expectations numeric and diagnostics textual. A rejected duplicate should have a stable field path, while an accepted duplicate should have a stable subtotal.

- The matrix should run twice with fresh objects. This simple repeat catches accidental mutation when a future normalization step rewrites the supplied agents array.

- SKILL.md agent completeness thresholds are clearer when every row states current and proposed outcomes. That wording prevents a recommendation from being reported as already deployed.

## How should unsupported agent scoring be verified?

Unsupported agent scoring should first prove that the schema accepts arbitrary strings today. It should then show the scorer uses their count without checking a registry.

- The schema test must inspect parsed output, not only success. That catches a future transform that accepts input but removes or rewrites entries.

- Use one known-looking identifier, one duplicate, and one future identifier. Their exact preservation documents the current array contract in packages/shared/src/schemas/skill-schema.ts.

- The Zod [schema API](https://zod.dev/api) explains that array schemas validate each element, while custom refinements can add cross-item rules. The current repository array has string element checks but no uniqueness refinement.

- This second example characterizes the cross-layer result. It does not claim that unknown IDs are supported by any actual agent.

\`\`\`typescript
import { expect, it } from 'vitest';
import { calculateQualityScore, skillFrontmatterSchema } from '@qaskills/shared';

it('keeps duplicate and unsupported agent strings in the current contract', () => {
  const input = {
    name: 'agent-contract',
    description: 'A valid fixture with explicit compatibility entries.',
    version: '1.0.0',
    author: 'qa-team',
    license: 'MIT',
    tags: ['agents', 'schema', 'score'],
    testingTypes: ['contract'],
    frameworks: ['vitest'],
    languages: ['typescript'],
    domains: [],
    agents: ['claude-code', 'claude-code', 'future-agent'],
  };

  const parsed = skillFrontmatterSchema.safeParse(input);

  expect(parsed.success).toBe(true);
  if (!parsed.success) throw parsed.error;
  expect(parsed.data.agents).toEqual(input.agents);

  const score = calculateQualityScore({
    frontmatter: parsed.data,
    content: 'Keep this content fixed while the agent list changes.',
    raw: '',
  });
  expect(score.completeness).toBe(20);
});
\`\`\`

- The expected 20 includes the fixed tag, testing type, and framework points plus the first agent bonus. It does not verify that claude-code or future-agent belongs to a registry.

- If a registry check is proposed, write a new failing test against the chosen boundary. Decide whether unknown entries produce an error, warning, ignored score item, or preserved unscored metadata.

- Avoid network calls in this unit test. Compatibility support should come from a versioned local definition or an injected test adapter, not live service state.

- Use the [agent directory publishing article](/blog/how-to-publish-ai-agent-skill-directory) to align contributor messages with the policy. Authors need a stable list and an upgrade path when identifiers change.

- Unsupported agent scoring also needs mixed-list coverage. Nine known IDs plus one unknown value can expose whether the policy rejects all input or counts only the recognized subset.

- Assert input immutability if normalization is added. A scorer should not silently rewrite frontmatter owned by another caller unless its API explicitly promises that behavior.

## skill compatibility score test acceptance criteria

- A skill compatibility score test needs acceptance criteria for count, identity, diagnostics, and ownership. Without all four, two layers can each pass while describing different metadata.

- For current behavior, acceptance is simple: the schema accepts any string array, and completeness checks raw length at three and ten. The tests above should remain green before a policy change.

- For a unique-ID proposal, normalize each value once and count the resulting distinct set. State whether case and outer whitespace belong to identity or invalid input.

- For a recognized-ID proposal, the schema or validator should return stable feedback for unknown values. The scorer should consume already validated data or apply the same canonical registry.

- Do not let the parser deduplicate while the schema reports original input. Such a split can make local validation show ten agents while the scorer sees nine.

- Do not let publication store unsupported values while a local tool rejects them. Cross-layer parity matters more than which policy maintainers select.

- The [quality guide](/blog/how-to-write-high-quality-qa-skills) can explain why broad compatibility claims need evidence. A score should not imply execution coverage that no test can demonstrate.

- Acceptance should include one backward-compatibility choice for existing skills. Maintain scores, recalculate scores, warn before migration, or reject on republish, but document the selected path.

- Failures should point to agents and identify the offending index or value. A generic frontmatter message gives contributors little help with a ten-item list.

- Finally, test score totals and the completeness subtotal. The subtotal finds boundary causes, while the total protects the value displayed or stored by a downstream consumer.

## How do you test SKILL.md agent completeness thresholds step by step?

Test SKILL.md agent completeness thresholds by moving from observed source behavior to an approved identity policy. Each step should produce evidence that can be reviewed without guessing.

1. Read packages/shared/src/utils/quality-score.ts and packages/shared/src/schemas/skill-schema.ts, then record raw length checks and schema acceptance.
2. Build one minimal ParsedSkill with fixed tags, testing types, frameworks, languages, content, and author metadata.
3. Add isolated arrays for two, three, nine, and ten unique identifiers, then assert the completeness subtotal for each row.
4. Add duplicate, case-only, whitespace, unsupported, and mixed-support variants without changing any other fixture field.
5. Write the approved policy in test names, then assert raw, unique, or recognized counts across schema and scorer layers.
6. Run the focused shared test in CI and require stable field diagnostics for every rejected or warning-only case.

- At step one, quote actual conditions rather than comments or assumptions. The two source paths are short enough for reviewers to inspect in full.

- At step two, freeze the base fixture if mutation is a concern. Reusing a mutable agent array can leak one table row into the next.

- At step three, assert 15, 20, 20, and 25 for the fixed baseline. Those values characterize repository behavior without recommending it.

- At step four, name equality rules in each test. Exact duplicates, case variants, and trimmed variants are not interchangeable inputs.

- At step five, place proposed assertions in a clearly marked change set. The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) can help separate expected failing policy tests from shipped regression tests.

- At step six, run both schema and scorer packages after shared changes. Build order matters because downstream tools consume the shared package contract.

- Repeat the entire matrix after any registry edit. A compatibility list change can alter effective counts even when scorer code remains untouched.

- SKILL.md agent completeness thresholds pass this procedure when every boundary has one cause, one expected subtotal, and one named policy. Total score snapshots may supplement those assertions, but they should not replace them.

## SKILL.md agent completeness thresholds rollout and regression checks

SKILL.md agent completeness thresholds need a staged rollout if maintainers replace raw length. Existing skills may lose points when duplicate or unsupported values stop counting.

- First, measure affected records without rewriting them. Report raw count, normalized unique count, and recognized count so reviewers can see the migration size.

- Second, publish contributor guidance and stable diagnostics. The [publishing workflow](/how-to-publish) should show accepted identifiers before enforcement reaches the API.

- Third, align parser, schema, validator, scorer, and storage behavior. A policy applied only during scoring leaves invalid claims available for search and display.

- Fourth, recalculate scores only under an explicit migration plan. Preserve old values until the chosen release boundary if score changes affect ranking.

- Regression coverage should include the four numeric edges and at least three identity variants. Add one real catalog fixture as a smoke case, but retain synthetic rows for precise failure output.

- The [parser regression guide](/blog/seed-skill-catalog-parser-regression-tests) is useful for catalog-wide checks. It should complement, not replace, the small scorer matrix.

- Track registry additions and removals as contract changes. Removing an identifier can turn a previously recognized ten-agent row into a nine-agent row under the proposed policy.

- Reviewers should reject tests that infer support from a plausible name. Only the selected registry or validation service can define recognition.

- Finish rollout with a clean repeat in CI and a sample published artifact check. The [directory publishing article](/blog/how-to-publish-ai-agent-skill-directory) helps verify that displayed compatibility matches stored metadata.

### Run a no-write score change trial

Make a read-only report with one row per skill and show its ID, raw list count, no-repeat count, known-name count, old score part, and planned score part. This report must not save a new list or score, because its first job is to show the size and shape of the change.

Sort the report by score loss and then by skill ID, which puts rows that cross ten or three near the top while keeping each run in a fixed order. A stable sort also makes two trial files easy to diff when the known-name list or clean rule changes.

Pick one row from each type: no change, same-name repeat, case change, space change, unknown name, and a mix near each edge. Check those rows by hand against the rule, then add any missed shape to the small unit set before the trial is run again.

Run the trial twice on the same data and require the same rows, counts, and score parts byte for byte in both files. A mismatch points to state, time, or map order in the plan, all of which must be fixed before a score write can be safe.

For each row that may change, save the old list and old score part in a test-only backout map tied to its stable ID. Test that map on a copy first, so the team knows it can put the old facts back if a bad name rule is found after review.

Apply the plan to a very small test set, read each row back, and run the same score check on the saved list. The live score part should match the trial file, and no row should show half of the list change with the old points still in place.

Check search and detail views for that small set before more rows move, since a clean name can change filters as well as the score. Use exact skill IDs in this check, which proves the same skills stay present even when one repeat or bad name leaves the list.

Write the full change in small groups and stop when a row no longer matches the input used by the trial. This guard keeps a new author edit from being lost when old plan data reaches the write step after the skill has changed.

Run the no-write report once more at the end and require no unplanned score loss, no half-clean list, and no row left at an old edge. Keep the first and last reports with the release note, which gives rank and score questions a short fact trail.

Close with one new publish that uses a same-name repeat and one name that the rule does not know, then check the planned warn or fail path. That final case proves new input cannot bring back the same score gap as soon as old rows have been fixed.

## Frequently Asked Questions

### What should three agent score boundary tests assert?

Assert the completeness subtotal with every unrelated field fixed. The current fixed fixture should score 15 points with two agents and 20 with three. Also state that these values count raw strings, because uniqueness and support are not checked by the shipped scorer or schema.

### How does ten agent completeness bonus affect the SKILL.md contract?

The tenth raw entry activates a second five-point condition, moving the fixed completeness subtotal from 20 to 25. That result can represent ten distinct agents, repeated values, or unsupported strings today. Tests should distinguish those identities before maintainers change what the bonus means.

### Which fixture best exposes duplicate agents quality score?

Use three copies of one identifier beside three distinct identifiers while holding all other fields constant. Both arrays currently receive the first agent bonus because each length equals three. The paired result clearly exposes raw counting without claiming that duplicate compatibility entries are valid product policy.

### When should teams check unsupported agent scoring?

Check unsupported values whenever the accepted agent registry, aliases, parser, schema, or scoring policy changes. Include an all-unknown list and a mixed list near each boundary. Those cases reveal whether the system rejects input, warns, preserves metadata, or counts only recognized identifiers.

### What is the pass criterion for skill compatibility score test?

The pass criterion is one documented counting unit applied consistently across validation and scoring. Current characterization uses raw array length at three and ten. A future unique or recognized policy passes only when diagnostics, stored metadata, completeness subtotals, and migration behavior all match that choice.

## Conclusion

SKILL.md agent completeness thresholds currently depend on raw list length, with inclusive bonuses at three and ten entries. Protect that fact with focused characterization, then make duplicates, unsupported IDs, normalization, and migration explicit before changing the score.

Open [QA testing skills](/skills), inspect a real compatibility list, and follow [how to publish](/how-to-publish) to add the boundary matrix before your next skill release. Save the no-write score report so each changed point has a clear cause and a safe backout path.`,
};
