import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md quality score parity Compared',
  description:
    'SKILL.md quality score parity: compare shared and publish scoring contracts. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md quality score parity',
  keywords: [
    'SKILL.md quality score parity',
    'duplicate quality score implementations',
    'validator publish score mismatch',
    'canonical skill scorer',
    'quality ranking contract test',
    'shared scoring function migration',
  ],
  relatedSlugs: [
    'how-to-write-high-quality-qa-skills',
    'validate-skill-md-in-ci-pipeline',
    'seed-skill-catalog-parser-regression-tests',
    'how-to-publish-ai-agent-skill-directory',
  ],
  sources: ['https://zod.dev/api', 'https://agentskills.io/specification'],
  repoEvidence: [
    'packages/shared/src/utils/quality-score.ts',
    'packages/web/src/app/api/skills/route.ts',
  ],
  content: `SKILL.md quality score parity does not exist in the current repo because checks and publish use separate formulas. The shared scorer rates schema, docs, field coverage, and fixed freshness. The publish route instead awards seven independent field bonuses. The same skill can therefore get different numbers at those two paths.

Tests should first characterize both results for the same normalized fixture. A migration can then select one scorer, map publish input into its required shape, and verify stored scores, validator output, and ranking behavior without claiming the change already shipped.

## What does SKILL.md quality score parity need to prove?

SKILL.md quality score parity needs to prove which formula ran, which input shape it received, and which number became observable. A single expected total cannot explain a mismatch unless the component breakdown or condition set is also recorded.

The shared function in \`packages/shared/src/utils/quality-score.ts\` accepts a parsed skill. It calculates schema points from frontmatter presence, docs points from body length and Markdown marks, field points from tags, testing types, frameworks, and agent counts, plus a fixed freshness value of 15.

The local function in \`packages/web/src/app/api/skills/route.ts\` accepts selected publish data. It awards points for a description longer than 100 characters, any full description, nonempty testing types, nonempty frameworks, more than three agents, any GitHub URL, and any version.

Those formulas overlap on some concepts but not their thresholds or weights. Shared scoring checks author, license, languages, domains, tags, headings, code fences, and lists. Publish scoring does not inspect those fields for its score, while it uniquely rewards a GitHub URL and uses different agent and description conditions.

The shared scorer returns a \`QualityBreakdown\` with four parts and a total. The publish helper returns one number. A parity suite should preserve both shapes in the base checks, then define the chosen output shape before replacing either caller.

Input equivalence also needs definition. Parsed content maps naturally to the publish route's \`fullDescription\`, but the two types are not identical. Tests should use one neutral fixture model and explicit adapters, avoiding hidden defaults inside each caller.

The [high-quality skill guide](/blog/how-to-write-high-quality-qa-skills) covers author practices. This article tests numeric implementation parity, so a well-written file can still expose formula disagreement.

The [Agent Skills specification](https://agentskills.io/specification) gives external context for skill metadata and body structure. It does not define the QASkills score, so local code and reviewed product policy remain authoritative for numeric expectations.

A complete proof includes direct unit results, one publish insertion assertion, and one ranking query check after migration. It should not infer stored values from a response if the database write can be inspected.

## duplicate quality score implementations: current repository behavior

Duplicate quality score implementations begin with different function signatures. The shared function receives \`ParsedSkill\`, while the publish function receives a smaller object with description, optional full description, testing types, frameworks, agents, optional GitHub URL, and optional version.

Shared schema scoring can reach 30 points. It checks name, description of at least 20 characters, version, author, license, at least one testing type, at least one framework, at least one language, and at least one domain. Each condition has its own weight.

Shared docs scoring checks body length above 100, 500, and 1,000 characters. It also checks for an H2 or H3 marker, a code fence, and an unordered-list marker. These are simple string rules, and the part is capped at 30.

Shared completeness scoring awards five points for at least three tags, one testing type, one framework, three agents, and ten agents. An item with ten agents receives both agent bonuses. This component is capped at 25.

Freshness is always 15 in this function, with a comment saying real scoring uses timestamps. Tests must assert 15 for current shared behavior and avoid inventing date-based decay that is not implemented there.

Publish scoring has no component object. Each of seven conditions adds between 10 and 20 points, and all conditions sum to 100. The function is called after publish schema parsing and before the inserted skill values are built.

The description thresholds differ sharply. Shared scoring awards five schema points at 20 or more characters, while publish scoring awards 20 only above 100 characters. A 100-character description does not receive the publish bonus because the comparison is strict.

Agent thresholds also differ. Shared completeness awards a first bonus at three agents and a second at ten. Publish scoring awards one bonus only when the count is greater than three, so exactly three and exactly four agents separate the contracts.

Use the [validation CI guide](/blog/validate-skill-md-in-ci-pipeline) to keep both base tests running during the move. Removing one too early can hide a changed number before each caller switches.

SKILL.md quality score parity is not achieved by giving both functions the same name. The formulas, adapters, persisted value, and exposed breakdown must all follow one reviewed contract.

## Why does validator publish score mismatch change the contract?

Validator publish score mismatch changes the contract because users may see one score before publication while the database stores another afterward. Sorting by quality can then use a value that the validator never predicted.

Consider a skill with a valid 60-character description, complete author metadata, language and domain IDs, useful tags, headings, code, lists, and ten agents. The shared scorer recognizes many of those signals. The publish scorer gives no description bonus below 101 characters and ignores several fields entirely.

The reverse can also occur. A nonempty GitHub URL adds publish points, while the shared formula has no repo-link rule. Any full description earns publish body points, even when its body is shorter than the shared length edges.

Do not call either number wrong until one product rule exists. Both forms are present in live code for distinct paths. The base check should state where each number comes from and what it measures.

The first risk is inconsistent feedback. An author may improve headings or tags and see shared points rise, yet publish scoring may remain unchanged. Conversely, adding a GitHub URL can raise the stored score without changing shared validator output.

The second risk is rank meaning. A stored publish score can order catalog entries by seven rules, while docs may describe shared parts. Tests should check the chosen stored value and avoid rank claims that the live route does not score.

The third risk is future drift. A maintainer can change one formula and reasonably believe quality scoring is updated everywhere. A parity test with shared fixtures will fail immediately when only one result moves.

Use the [publishing directory guide](/blog/how-to-publish-ai-agent-skill-directory) to identify user-visible score stages. Keep route status, inserted score, and returned object in the integration assertion so a mapping error cannot hide behind a correct pure function.

The [seed parser regression article](/blog/seed-skill-catalog-parser-regression-tests) can check fixed seed scores on its own. Do not assume hardcoded seed values came from either current formula unless repo proof shows that process.

## canonical skill scorer test matrix

A canonical skill scorer matrix should alter one scoring signal at a time and record both current totals. Start from a neutral fixture whose description, body, arrays, and link values sit below all optional thresholds.

The small base file still needs valid parser and schema fields when it runs shared code. The publish base can use the matching field set. Store both forms in one case object so each map is clear.

Boundary rows should use exact lengths and counts. Test description lengths 20, 100, and 101; body lengths 100, 101, 500, 501, 1,000, and 1,001; and agent counts 2, 3, 4, 9, and 10. These values expose strict versus inclusive comparisons.

| Case | Input or boundary | Shared scorer observation | Publish scorer observation |
|---|---|---|---|
| Minimal valid metadata | Required parser fields, short plain body | Schema, first content, testing, and freshness points apply | Version and testing bonuses can apply |
| Complete metadata | Framework, language, domain, tags, ten agents | Schema and completeness components rise | Framework and agent bonuses rise |
| Short documentation | Body exists but remains at or below 100 characters | No body-length documentation points | Any nonempty full description gets 15 |
| Description length 100 | Exactly 100 characters | Clears shared 20-character condition | Does not clear strict greater-than-100 condition |
| Description length 101 | Exactly 101 characters | Same shared description points as 100 | Adds the 20-point publish bonus |
| Three agents | Exactly three canonical agents | Adds shared three-agent bonus | Does not clear greater-than-three condition |
| Ten agents | Exactly ten agents | Adds both shared agent bonuses | Adds one publish agent bonus |
| GitHub URL only | Nonempty URL with other optionals fixed | No direct shared URL points | Adds ten publish points |

Every row should include a reason list, not just two totals. If both totals happen to match, the underlying criteria may still differ. Equality by coincidence is not formula parity.

Use exact body strings for marker checks. A code fence inside prose raises shared docs points even if it is not complete, because the current check uses \`includes\`. Tests should pin that string rule rather than swap in a Markdown parser.

Keep invalid data out of the scoring matrix. Validation policy is a separate gate, and the publish helper runs after route schema parsing. A malformed fixture can produce an error before either score is observable.

The [skill quality guide](/blog/how-to-write-high-quality-qa-skills) can explain author-facing improvements. Matrix expected values must still come from current source lines or the approved canonical specification.

Give each row a short ID and list the one score input that changes from the base. The report should show old shared points, old web points, and their gap, so a reviewer can trace each step without doing math by hand.

Keep lengths and list counts in the row data, then check them before either score runs. A body meant to hold 100 chars can gain a line mark, and that small drift can put the case on the wrong side of its edge.

For tags, types, tools, and agents, use short fixed IDs and build a fresh list for each row. Shared list state can make a three-agent case hold four names after a prior test, which gives a false web bonus.

Use one row where both totals match for different reasons, then print the reason sets beside that tie. This proves that equal sums do not mean equal rules and keeps the test from treating a chance tie as pass.

## How should quality ranking contract test be verified?

A quality ranking contract test should begin with direct pure-function characterization and finish with persisted ordering. The intermediate publish-route assertion proves the canonical scorer is actually wired into storage.

The first code example calls \`calculateQualityScore\` from \`packages/shared/src/utils/quality-score.ts\`. Its fixed file has 25 schema points, five docs points, five field points, and fixed freshness of 15, for a total of 50.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { calculateQualityScore } from './quality-score';

describe('shared quality score characterization', () => {
  it('scores a minimal valid fixture with a plain 120-character body', () => {
    const skill = {
      frontmatter: {
        name: 'Score fixture',
        description: 'A valid description longer than twenty characters.',
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
      content: 'x'.repeat(120),
      raw: '',
    };

    expect(calculateQualityScore(skill)).toEqual({
      schema: 25,
      documentation: 5,
      completeness: 5,
      freshness: 15,
      total: 50,
    });
  });
});
\`\`\`

Assert the component object because it identifies which condition moved. If only total is checked, one lost category and one gained category could cancel. The fixture should also assert body length before scoring.

The second example captures the seven current conditions from \`packages/web/src/app/api/skills/route.ts\` as a temporary comparison oracle. It is deliberately small and should be deleted after route code imports the canonical scorer.

\`\`\`typescript
interface PublishScoreInput {
  description: string;
  fullDescription?: string;
  testingTypes: string[];
  frameworks: string[];
  agents: string[];
  githubUrl?: string;
  version?: string;
}

function currentPublishScore(data: PublishScoreInput): number {
  return (
    (data.description.length > 100 ? 20 : 0) +
    (data.fullDescription && data.fullDescription.length > 0 ? 15 : 0) +
    (data.testingTypes.length > 0 ? 15 : 0) +
    (data.frameworks.length > 0 ? 15 : 0) +
    (data.agents.length > 3 ? 10 : 0) +
    (data.githubUrl && data.githubUrl.length > 0 ? 10 : 0) +
    (data.version && data.version.length > 0 ? 15 : 0)
  );
}

const publishInput = {
  description: 'x'.repeat(101),
  fullDescription: 'Body',
  testingTypes: ['unit'],
  frameworks: ['vitest'],
  agents: ['a', 'b', 'c', 'd'],
  githubUrl: 'https://example.test/repository',
  version: '1.0.0',
};

expect(currentPublishScore(publishInput)).toBe(100);
\`\`\`

This copied oracle cannot prove route wiring by itself. Pair it with a POST test that captures values passed to the database insert and expects the same score. After migration, that integration test should compare against the canonical function instead.

For ranking, insert two records whose canonical scores differ and one tie. Request highest-quality sorting and assert order plus the tie rule already defined by the route. Do not infer deterministic tie order without inspecting the active query.

The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) can keep pure score tables fast. Database ranking checks may run in the web integration job with isolated records.

Start the route test with a score that is not near any other test score, then read the exact value sent to the insert call. A unique value makes it clear that the row came from this request and not from stale mock state.

Check the score in three places when the route returns the new row: pure result, insert data, and response body. A split among those places can show a sound score that was mapped or sent in the wrong way.

For rank tests, use three rows with known scores and IDs that sort in a clear order, then add one tie row. Check only the tie key that the live query sets, and do not guess a rule from one database run.

Clear all row and auth state after each case, since a past publish can block the next slug or leave the wrong user in scope. A clean route test should fail on score work, not on old data.

Read the [publish guide](/blog/how-to-publish-ai-agent-skill-directory) when the route shape changes. Keep the score claim tied to the same fields that the live request can send and the route can save.

## shared scoring function migration acceptance criteria

Shared scoring function migration passes only when validator output, publish insertion, API response, and quality sorting use the selected canonical total. Keeping an unused shared function while route logic remains local does not satisfy parity.

First define the canonical input. It may accept parsed skills, publish data, or a neutral score model. Every adapter must state how body, description, metadata arrays, URL, and timestamps map into that model.

Next define output. A component breakdown is more useful than a bare number because authors can see why their score changed. If storage keeps only total, route responses and validator results can still expose the same component object.

Pin threshold inclusivity. Conditions at 20, 100, 500, 1,000 characters and at three, four, nine, and ten agents need exact expectations. Replacing strict comparisons with inclusive ones is a policy change, not a harmless refactor.

Choose whether freshness remains fixed or becomes date-based. Current shared code uses 15, while publish scoring has no freshness condition. A time-dependent design needs an injected clock and dated fixtures before adoption.

Backfill existing database rows if the stored formula changes. Test the migration on representative records, count updates, and verify idempotence. Do not state that ranking is canonical while older rows retain unexplained scores.

Version the score contract or record the algorithm revision if historical numbers must be interpreted. The same integer can represent different criteria across releases. At minimum, document the deployment where backfill completed.

Maintain a short compatibility table for old shared, old publish, and new canonical results. Review large deltas manually. A correct migration can still change rankings significantly, so expected movement should be visible.

SKILL.md quality score parity acceptance requires removal or delegation of the duplicate route helper. A source check or import-boundary test can prevent a new local formula from appearing later.

Write one score spec with a name for each part, its max points, its input, and its edge rule. The code and tests should use those names, so a weight change has one clear row in review.

Keep the total as the sum of shown parts and check that sum in tests. Do not let a caller set a total by hand, since that can drift from the parts while a user sees both values.

Map blank lists and blank text in one adapter, then test that map with the same source model used by each caller. If one path fills a version or drops a body, show that fact before score math begins.

Set a score version on the plan for old rows, even if the data store does not keep that field at first. The backfill log should state which old rule made each prior sum and which new rule made its next sum.

## How do you test SKILL.md quality score parity step by step?

Test SKILL.md quality score parity by creating one neutral fixture model and running explicit adapters into both current formulas. Preserve deltas first, then switch every caller to the reviewed canonical function.

1. Read \`packages/shared/src/utils/quality-score.ts\` and list every weight, cap, and strict boundary.
2. Read \`packages/web/src/app/api/skills/route.ts\` and list its seven publish conditions.
3. Build one neutral fixture with frontmatter, body, full description, agents, and an optional repo URL.
4. Add isolated rows for description, body, tags, framework, domain, agents, code, lists, and URL.
5. Record shared component totals and publish totals for every current row.
6. Approve a canonical input, formula, breakdown, maximum, and freshness policy.
7. Replace validator and publish calls with adapters to the same exported function.
8. Capture the inserted score in a route test and compare it with validator output.
9. Backfill stored rows, verify ranking order, and remove temporary duplicate-formula oracles.

Start with pure shared tests because that function is exported and deterministic. Assert all breakdown fields. Add an explicit body-length check to each boundary fixture.

For the route, mock authentication and persistence only at their edges. Let request parsing, score calculation, and insert-value construction run. Capture the inserted \`qualityScore\` rather than trusting a helper invocation spy.

Then compare outputs for identical semantic data. If adapters apply defaults, assert their normalized object. A hidden empty framework or generated version can shift both validation and scoring.

Before backfill, query current score distributions and save aggregate evidence. After backfill, compare row counts, minimum, maximum, and selected fixture IDs. Avoid publishing unsupported claims about production data without that run.

Finally, verify quality sorting with canonical stored values. Use [skills](/skills) for a manual check, while automated assertions operate on isolated database fixtures.

Run the base row through both old paths and save its two sums before any new code is used. This gives the team a firm start point and shows that the test can reach both real score rules.

Run one edge at a time and sort output by case ID, then check the part that should move and all parts that should stay. A full sum check alone can miss two wrong parts that cancel.

Once the new rule is set, run all old and new sums in one table and mark each planned change. Any unmarked gap should block the patch until its cause is found and either fixed or added to the plan.

For web tests, spy on the insert value and read the returned row, but do not mock the score call itself. A mock that hands back the planned sum can pass even when the route still calls its old local code.

For shared tests, call the exported function with a fresh parsed object in each row. Do not share arrays or body text that a test can change, because score inputs must stay fixed across the whole grid.

## SKILL.md quality score parity rollout and regression checks

Rollout begins with a read-only comparison report. For each representative fixture, emit old shared total, old publish total, canonical candidate total, and per-condition reasons. This makes product review concrete.

Choose one package as the owner. A shared scorer is a natural option when CLI, validator, and web all need it, but its input type must avoid web-only dependencies. Keep adapters near each caller and the formula in one module.

Add canonical tests before changing callers. The suite should include every threshold and signal, maximum-score behavior, component caps, and invalid input assumptions. Zod validation should run before scoring when the canonical function requires valid data.

Zod's [API documentation](https://zod.dev/api) can support the input-schema design. Do not merge validation and scoring errors unless the product contract calls for one result type; each has different user actions.

Switch one caller at a time behind comparison logging or test output. Validator migration should preserve valid and warning results. Publish migration should preserve request handling while intentionally changing only the score contract.

Backfill existing records in a bounded, restartable process. Verify a dry-run sample, update rows by stable ID, and make repeated execution safe. Ranking checks should run after the same canonical score reaches old and new records.

Remove the route-local formula once all data and callers are migrated. Leaving it unused invites later reuse. Keep a guard that the publish route imports the canonical scorer.

Regression checks should run on shared scoring, publish route, validator, schema, and quality sorting changes. A content-field rename or adapter edit can create drift even when formula code stays untouched.

The [publishing guide](/blog/how-to-publish-ai-agent-skill-directory) can explain the final visible score. Avoid documenting a new algorithm before the migration and backfill actually complete.

Ship a compare-only phase first and log no more than row ID, old sums, new sum, and changed part names. This gives enough proof for review without sending full skill text or user data to a log.

Pick a small set of real rows by stable ID and save their old plus new sums in the change note. Do not call that set the full data result, but use it to check that planned shifts look sane before a backfill.

Run the backfill in small chunks, save the last ID, and make a second run skip rows that already have the new score. A stopped job can then start again with no double work or mixed rule state.

After each chunk, read a few rows and call the new pure score on the same data, then compare the stored sum. This spot check can catch a bad adapter or write map before the whole table is changed.

When all rows use the new rule, run the top-score sort and check a known set at the head and at one page break. This proves that rank now reads the new sums where users are most apt to see a shift.

Remove the old web helper in the same release that ends compare mode, then keep an import check in route tests. A dead copy left in the file is easy to call again in a later patch.

Use the [high-quality skill guide](/blog/how-to-write-high-quality-qa-skills) to align the final part names with author help. Keep weights and edges in the score spec, so prose need not serve as the test oracle.

## Frequently Asked Questions

### What should duplicate quality score implementations tests assert?

They should run one neutral fixture through both current formulas and record component reasons plus totals. Boundary rows must change one signal at a time. Coincidentally equal totals do not prove parity, so tests should compare criteria, adapters, persisted values, and the active function used by each caller.

### How does validator publish score mismatch affect the SKILL.md contract?

The validator can report a number based on metadata completeness and body structure, while publication can store a number based on seven different bonuses. Authors may then see feedback that does not predict ranking. Characterization should identify both formulas before a canonical policy replaces them.

### Which fixture best exposes canonical skill scorer?

Use a valid skill with a 100-character description, 101-character body, three tags, one framework, three agents, headings, code, and no GitHub URL. Those values cross several shared conditions while missing strict publish thresholds, creating an informative delta without invalid input or unrelated failures.

### When should teams check quality ranking contract test?

Check it whenever scoring weights, thresholds, adapters, publication, backfills, or highest-quality sorting changes. Run pure formula tests on every shared edit and database ordering tests on web changes. Repeat the stored-row audit after any migration that recalculates historical quality values.

### What is the pass criterion for shared scoring function migration?

Validator output, publish insertion, API response, and stored ranking must all derive from one reviewed scorer for equivalent input. Existing rows must be backfilled or explicitly versioned. The old route formula should be removed, and threshold plus adapter tests must prevent a second implementation from returning.

## Conclusion

SKILL.md quality score parity requires more than matching totals. The repo now has two formulas with distinct inputs, edges, signs, and outputs, so tests must preserve each current result before one contract is chosen.

Build the comparison matrix, wire one canonical scorer, and verify inserted plus ranked values after backfill. Review [skills](/skills) for the user-visible outcome, then follow [how to publish](/how-to-publish) with the same score shown before and after publication.`,
};
