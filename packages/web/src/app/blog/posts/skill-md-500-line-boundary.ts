import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md 500 line boundary Guide',
  description:
    'SKILL.md 500 line boundary: test exact LF, CRLF, and final-newline edges. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md 500 line boundary',
  keywords: [
    'SKILL.md 500 line boundary',
    'MAX_SKILL_LINES test',
    'trailing newline line count',
    'CRLF line boundary',
    '500 versus 501 lines',
    'skill validator off by one',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'agent-skill-security-review-checklist',
    'how-to-publish-ai-agent-skill-directory',
  ],
  sources: ['https://agentskills.io/specification', 'https://nodejs.org/api/fs.html'],
  repoEvidence: ['packages/shared/src/constants/index.ts', 'packages/skill-validator/src/index.ts'],
  content: `SKILL.md 500 line boundary tests should assert the validator's actual oracle: \`raw.split('\\n').length\`, followed by a warning only when that segment count exceeds 500. A final newline adds an empty segment, while CRLF still contributes one \`\\n\` line break per record. Define those semantics before changing code.

This guide uses "segment count" for the repo count and "text record" for an intended file line. Keeping those terms separate prevents a passing check from hiding an off-by-one disagreement.

## What does SKILL.md 500 line boundary need to prove?

SKILL.md 500 line boundary coverage must prove the configured limit, exact counting expression, strict comparison, line-ending behavior, and effect on the final result. It should also identify whether a fixture ends with a final line break.

The constant is exported from \`packages/shared/src/constants/index.ts\` as \`MAX_SKILL_LINES = 500\`. The tool in \`packages/skill-validator/src/index.ts\` computes \`raw.split('\\n').length\` before comparing that number with the constant.

The check is greater-than, not greater-than-or-equal. A split count of 500 creates no line warning. A split count of 501 adds one warning whose field is \`content\`, yet warnings alone do not make \`valid\` false.

JavaScript splitting counts string segments around line breaks. An empty string has one segment, and a string ending in \`\\n\` has a final empty segment. Therefore, five hundred records joined by 499 line breaks calculate as 500, while those same records with a final line break calculate as 501.

A small byte sketch should sit beside each edge fixture: record count, break count, final-break flag, and split count should be shown before the validator is called, with the first and last few units escaped for review. That proof keeps the test honest when a helper, editor, or formatter adds one last LF, and it makes the warning result traceable to the built string instead of to a label such as "five hundred lines."

CRLF does not require a different split branch. Each \`\\r\\n\` sequence contains one \`\\n\`, so the segment count follows the same separator rule. The resulting segments retain a trailing \`\\r\`, but that character does not affect this count.

The [Agent Skills specification](https://agentskills.io/specification) recommends keeping the main SKILL.md under 500 lines and moving detail into other files. The QASkills constant and warning are repo rule; tests should not silently reinterpret the external wording.

Use the [SKILL.md format guide](/blog/skill-md-format-guide) to keep edge documents otherwise valid. A malformed header can add schema errors and distract from the warning check, even though line counting still runs after parsing.

Each fixture should record intended records, line break type, final-break flag, split segments, warning count, and overall result. Those six facts make later rule review possible without reverse engineering test strings.

The [CI check guide](/blog/validate-skill-md-in-ci-pipeline) should run the compact matrix. Avoid committing five hundred handwritten lines because built fixtures expose their count math and are easier to review.

## MAX_SKILL_LINES test: current repository behavior

A MAX_SKILL_LINES test begins with the shared constant rather than duplicating the number in each expectation. Importing the constant proves that a configuration change and its edge cases move together.

Current code evaluates the complete raw string. Frontmatter delimiters, metadata rows, blank rows, comments, and body text all contribute segments. The parser's trimmed body is not used for this limit.

That placement matters for test design. Building only a body with five hundred lines and then adding ten header rows creates more than five hundred split segments. Generate the complete file to the target count instead.

The warning message interpolates both the split count and \`MAX_SKILL_LINES\`. A focused test can check the warning field and full message at 501. It should also prove no line warning exists at 500.

Do not assert \`warnings.length === 0\` unless each other warning condition is controlled. A short body or large token estimate can create unrelated entries. Filter warnings by field and message prefix before comparing line result.

SKILL.md 500 line boundary cases should keep body content above one hundred characters. Use many small, safe instruction rows so neither the short-content check nor dangerous-pattern scan changes the result.

The warning does not reject the file. \`valid\` depends on whether schema errors exist, while line excess is appended to \`warnings\`. An integration test should assert both the warning and \`valid === true\` for an otherwise valid 501-segment file.

Current code has no operating-system branch for line count. Once Node has decoded the file into a string, the tool performs the same split on each platform. File-reading failures belong to a different contract.

The [Node file system docs](https://nodejs.org/api/fs.html) states that specifying an encoding returns file contents as a string. QASkills requests \`utf-8\`, then counts that returned string. The docs do not define QASkills line rule; repo code does.

Inspect representative files through the [QASkills directory](/skills), but generate exact boundaries in tests. Real files are useful samples, not stable count math fixtures.

## Why does trailing newline line count change the contract?

Trailing newline line count changes the contract because editors, POSIX conventions, and string APIs can describe the same bytes differently. The repo currently chooses the number of split segments, including an empty final segment.

Consider a file made from five hundred nonempty records. Joining them with \`\\n\` uses 499 separators and produces a split length of 500. Appending one final \`\\n\` uses 500 line breaks and produces a split length of 501.

Many authors still call the second file a five-hundred-line file because it contains five hundred terminated records. The tool calls its split count 501 in the warning. Tests must capture this difference without declaring either vocabulary universally correct.

The effect is visible only at the edge. A 499-record file with a final newline calculates as 500 and does not warn. A 500-record file with the same final style calculates as 501 and does warn.

Store both files as values made by the test rather than as large checked-in samples, then assert that they differ by exactly one final LF byte before any parser or validator call. This guard proves the edge is not caused by a changed header, a blank body row, or a line-ending rewrite, and it gives a failed run a short byte fact that a reviewer can check at once.

Serializers and formatters often ensure a final newline. If a built SKILL.md sits exactly at the intended limit before formatting, that convention can add the warning. A regression fixture should include both final states.

Do not solve this by trimming the complete file before splitting without a rule review. \`trim()\` removes more than one final line feed and can erase meaningful outside whitespace. It also changes empty-file and whitespace-only-file result.

A more explicit proposed counter could count line breaks, records, or nonempty logical rows. Each choice handles empty documents and repeated trailing newlines differently. Write a truth table before replacing the current expression.

The [agent skill risk checklist](/blog/agent-skill-security-review-checklist) can review built file handling, but this edge is a usability and consistency issue. Repo evidence does not show a risk event or failed release.

SKILL.md 500 line boundary docs should say whether the limit applies before or after newline cleanup. If the tool continues counting raw decoded text, tests should preserve that exact statement.

## CRLF line boundary test matrix

A CRLF line edge matrix needs both line-ending style and final-break state. Labeling a case only "500 lines" is insufficient because two byte sequences can produce different split counts under the current expression.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| Below edge | 499 LF segments, no final LF | \`packages/skill-validator/src/index.ts\` | Calculated value is 499 and no line warning exists |
| Exact edge | 500 LF segments, no final LF | Validator plus shared constant | Calculated value is 500 and no line warning exists |
| Terminal LF | 500 text records with final LF | Validator split expression | Calculated value is 501 and a content warning exists |
| Above edge | 501 LF segments, no final LF | Validator plus shared constant | Warning names 501 and recommended max 500 |
| CRLF edge | 500 CRLF segments, no final CRLF | Validator split expression | Calculated value is 500 and no line warning exists |
| Terminal CRLF | 500 text records with final CRLF | Validator split expression | Calculated value is 501 and a content warning exists |

The first two rows use segment counts directly. The final rows use text-record language and state the final break, which explains why their split result is one higher. This naming keeps expectations honest.

Give the fixture helper two named inputs, \`records\` and \`finalBreak\`, plus a named break string, and make it return both the raw text and the count facts used to build it. The test should reject an empty record list, assert every inner join uses the selected break, and expose the final few bytes, so an off-by-one bug in the helper cannot produce a false pass in the tool.

CRLF fixtures should be built with \`'\\r\\n'\`, not by replacing every \`\\n\` in an already escaped source snapshot. A direct test helper avoids accidental mixed endings and gives the test an explicit line break parameter.

Add a mixed-ending case only if QASkills plans to support or normalize it explicitly. The current split still counts each \`\\n\`, whether preceded by \`\\r\` or not. A mixed fixture mainly tests diagnostic rule.

Assert no stray \`\\r\` changes frontmatter parsing in the baseline. Gray-matter normally receives the complete string before line counting, so a parser failure would invalidate the edge fixture even if the segment count math is correct.

The [publishing guide](/how-to-publish) can exercise one exact-limit file produced by the real author workflow. Unit cases should remain the source of truth for all six count math rows.

SKILL.md 500 line boundary passes the matrix when each result states its final flag and split segments. An unexplained "line count" check should fail review even if its number happens to match.

## How should 500 versus 501 lines be verified?

Five hundred versus 501 lines should be verified by generating the complete raw file to an exact split length, then filtering for the line warning. The test helper itself needs assertions so fixture mistakes cannot mimic application result.

This first example characterizes \`validateSkillContent\` from \`packages/skill-validator/src/index.ts\`. Each row states the requested segment count, line break, final flag, expected count, and warning result.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { MAX_SKILL_LINES } from '@qaskills/shared';
import { validateSkillContent } from '../src/index';

const header = [
  '---',
  'name: boundary-checks',
  'description: Checks exact line boundaries with generated fixtures.',
  'version: 1.0.0',
  'author: qa-team',
  'license: MIT',
  'testingTypes: [validation]',
  'languages: [typescript]',
  '---',
  '',
];

function makeSkill(segments: number, eol: string, finalEol: boolean): string {
  const body = Array.from(
    { length: segments - header.length },
    (_, index) => \`Instruction row \${index + 1}.\`,
  );
  return [...header, ...body].join(eol) + (finalEol ? eol : '');
}

describe.each([
  [499, '\\n', false, 499, false],
  [500, '\\n', false, 500, false],
  [500, '\\n', true, 501, true],
  [501, '\\n', false, 501, true],
  [500, '\\r\\n', false, 500, false],
  [500, '\\r\\n', true, 501, true],
] as const)('line boundary case', (segments, eol, finalEol, count, warns) => {
  it('matches the current split and strict comparison', () => {
    const raw = makeSkill(segments, eol, finalEol);
    expect(raw.split('\\n')).toHaveLength(count);

    const result = validateSkillContent(raw);
    const lineWarnings = result.warnings.filter((warning) =>
      warning.message.includes(\`recommended max: \${MAX_SKILL_LINES}\`),
    );

    expect(lineWarnings).toHaveLength(warns ? 1 : 0);
    expect(result.valid).toBe(true);
  });
});
\`\`\`

The interpolation sequences belong to executable test code, not article claims. The critical controls are \`raw.split('\\n')\` and the filtered warning list. If either fixture expectation fails, inspect generation before production logic.

The second example crosses the real file edge with \`validateSkillFile\`. It writes UTF-8 CRLF content, reads it through the repo function, and confirms the same final rule. Cleanup runs even when an check fails.

\`\`\`typescript
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { validateSkillFile } from '../src/index';

let directory = '';
afterEach(async () => {
  if (directory) await fs.rm(directory, { recursive: true, force: true });
});

it('counts a final CRLF as one extra split segment', async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-lines-'));
  const file = path.join(directory, 'SKILL.md');
  const raw = makeSkill(500, '\\r\\n', true);
  await fs.writeFile(file, raw, 'utf8');

  const result = await validateSkillFile(file);
  expect(raw.split('\\n')).toHaveLength(501);
  expect(result.warnings).toContainEqual({
    field: 'content',
    message: 'Skill has 501 lines (recommended max: 500)',
  });
});
\`\`\`

This integration test assumes the test helper from the first block is shared in the test file. It proves file decoding does not alter CRLF line breaks before check. A second case without final CRLF should assert no matching line warning.

Avoid a snapshot of the whole result. Quality scores and unrelated warnings can change for valid reasons. The line contract needs exact assertions only for count, field, message, and pass state.

Run the focused suite through the [CI check workflow](/blog/validate-skill-md-in-ci-pipeline). Add one built CLI check only if command output wording is also part of the release contract.

## skill validator off by one acceptance criteria

Skill tool off by one acceptance criteria begin with a named counting model. The current model is decoded-string segment count after splitting on LF. Any replacement must define empty input, final line breaks, repeated blank rows, CRLF, and mixed endings.

The current baseline passes when 500 split segments do not warn and 501 split segments do. Both outcomes must preserve schema result for a valid fixture. The 501 result should contain one matching content warning.

The product rule must decide whether "500 lines" means split segments or text records. That decision belongs in docs and tests before implementation. Changing only the warning check can move the edge without resolving final-newline semantics.

If maintainers choose text records, define an exact algorithm rather than subtracting one unconditionally. A file without a final newline must not lose its final record. Empty input and multiple ending line breaks also need deliberate outcomes.

If maintainers keep split segments, change user wording to make the model clear. Built diagnostics can say the file produced 501 LF-separated segments, reducing confusion when an editor reports five hundred visible rows.

Before code changes, write a six-row truth table in the same terms used by the warning and have product, tool, and docs owners approve the final-break result for each row. The table should include one empty input and one input with two final breaks as well, because a quick rule that subtracts one can look right at 500 while giving false counts at those smaller edges.

Line-ending line cleanup is another independent choice. Converting CRLF to LF preserves line break count, while removing \`\\r\` can affect raw length and token estimates. Tests should verify each downstream metric that consumes the same string.

Warnings remain advisory under current code. A rule change from warning to error would alter CLI exit result and release gates, so it requires separate acceptance cases. Do not hide that change inside a counter refactor.

The [SKILL.md format guide](/blog/skill-md-format-guide) should state the selected rule with one final-newline example. Short prose plus exact bytes is clearer than an unexplained numeric limit.

SKILL.md 500 line boundary acceptance is complete when the fixture helper, current oracle, target model, and diagnostic words agree. Each edge case should be reproducible from parameters rather than a large opaque file.

## How do you test SKILL.md 500 line boundary step by step?

Test SKILL.md 500 line boundary by proving the test helper before exercising the tool. The sequence below keeps raw bytes, decoded text, split segments, and warning rule visible.

1. Read \`packages/shared/src/constants/index.ts\` and \`packages/skill-validator/src/index.ts\`, then record the constant, split expression, comparison, warning field, and validity rule.
2. Build one valid control document whose complete raw string has far fewer than five hundred segments.
3. Generate 499, 500, and 501 segment variants with LF, then add terminal-LF, CRLF, and terminal-CRLF variants.
4. Assert each fixture's separator count, terminal flag, byte round trip, and \`raw.split('\\n').length\` before calling validation.
5. Filter content warnings, then assert the exact strict boundary, message, and unchanged validity for otherwise valid documents.
6. Run direct-content and file-reading cases in CI, with one author-flow check before release.

Step one ties the test to both source files. Import the shared constant in test code, but still assert expected edge result so an accidental limit change receives a deliberate review.

Step two prevents schema errors from masking line results. Its body should exceed the short-content threshold, avoid dangerous patterns, and keep the token estimate below its separate warning limit.

Step three should use a parameterized test helper. Record whether its numeric argument means requested segments or intended records. Never switch that meaning between rows.

Step four tests the fixture oracle. For file cases, compare text read back with UTF-8 to the original built string. That check catches test-environment newline conversion before QASkills runs.

Step five isolates the warning by its message and field. Also assert \`valid\` so a future warning-to-error rule change cannot pass unnoticed.

Finish with the [publishing workflow](/how-to-publish). Upload one exact-limit fixture using the same formatter authors use, then confirm final newline handling matches the documented model.

## SKILL.md 500 line boundary rollout and regression checks

Roll out SKILL.md 500 line boundary changes by committing current baseline before selecting a new model. This baseline makes any changed 500 or 501 result visible during review.

Shared-package owners control \`MAX_SKILL_LINES\`. Check tool owners control counting and diagnostics. Docs owners must use the same term for segments or records, while CLI owners review any warning-to-error effect.

The minimum suite contains 499, 500, and 501 LF segments; 500 records with final LF; 500 CRLF segments; and 500 records with final CRLF. Add empty and repeated-ending cases if the algorithm changes.

Formatter compatibility deserves a dedicated check. If repo formatting always appends a final newline, test built files after formatting rather than assuming pre-format counts remain valid.

Run the same generated text through the real author formatter in a temp folder, read it back as UTF-8, and compare its final-break flag and split count with the pre-format values before checking the warning. This end-to-end row does not replace the fast helper cases; it proves that the release path applies the written model to the bytes authors will send, even when their editor starts with a different final style.

Do not rewrite existing skills automatically merely to remove one final line break. First scan the catalog, report files near the edge, and decide whether detail should move into references as the specification suggests.

The [release overview](/blog/how-to-publish-ai-agent-skill-directory) can explain the author response to a warning. The automated suite should keep exact raw calculations close to source code.

Review related metrics after line cleanup changes. Removing carriage returns changes raw character count, which can alter token estimation near its own edge even when segment count stays fixed.

Use the [agent skill risk checklist](/blog/agent-skill-security-review-checklist) when new file transformations are proposed. The review should ensure counting does not mutate instructions or conceal content, without overstating the current advisory warning.

After updates to Node, gray-matter, formatters, shared constants, or tool code, rerun each generated row. SKILL.md 500 line boundary result is stable only when exact bytes and diagnostics remain linked.

## Frequently Asked Questions

### What should MAX_SKILL_LINES test tests assert?

They should import the shared constant, prove each built string's split length, and filter the matching content warning. Assert no warning at 500 split segments, one warning at 501, the exact message, and unchanged valid state for a file whose metadata and body are otherwise valid.

### How does trailing newline line count affect the SKILL.md contract?

A final LF creates an empty final segment under \`raw.split('\\n')\`. Five hundred nonempty records without that final break calculate as 500, while the same records with it calculate as 501. Tests and docs must state the final flag instead of using an ambiguous "lines" label.

### Which fixture best exposes CRLF line boundary?

Generate five hundred complete-file segments joined by \`\\r\\n\`, first without and then with a final \`\\r\\n\`. The first calculates as 500 and the second as 501 because both line breaks contain LF. Assert parser result too, so retained carriage returns cannot hide a malformed fixture.

### When should teams check 500 versus 501 lines?

Check both values whenever the shared limit, split algorithm, newline cleanup, formatter, file decoder, or warning severity changes. Also test them when release starts transforming uploaded text. Keep the compact generated suite in CI and reserve large real-file checks for the author workflow.

### What is the pass criterion for skill validator off by one?

The pass criterion is one documented counting model with reproducible LF, CRLF, and final-newline results. Current result must warn only above 500 split segments. Any new model must define empty and trailing cases, retain valid content, and produce a stable field, count, limit, and severity.

## Conclusion

SKILL.md 500 line boundary result currently counts LF-separated string segments and warns only above the shared value of 500. A final newline creates one extra segment, while CRLF follows the same LF line break rule.

Add the six-row helper suite next, then decide whether product language should describe segments or text records. Open the [QASkills directory](/skills) for representative files, and follow [how to publish](/how-to-publish) to verify the chosen edge before release.`,
};
