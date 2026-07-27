import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md token estimate calibration Guide',
  description:
    'SKILL.md token estimate calibration: calibrate character estimates across text and code. See repository evidence, practical fixtures, and test criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md token estimate calibration',
  keywords: [
    'SKILL.md token estimate calibration',
    'four characters per token',
    'multilingual token estimate',
    'code token budget test',
    'MAX_SKILL_TOKENS warning',
    'skill context size calibration',
  ],
  relatedSlugs: [
    'validate-skill-md-in-ci-pipeline',
    'malformed-skill-md-frontmatter-parser-tests',
    'seed-skill-catalog-parser-regression-tests',
    'skill-md-format-guide',
  ],
  sources: ['https://agentskills.io/specification', 'https://www.unicode.org/reports/tr15/'],
  repoEvidence: ['packages/shared/src/constants/index.ts', 'packages/skill-validator/src/index.ts'],
  content: `SKILL.md token estimate calibration must compare the fixed character rule with base token counts for real files. The current warning computes \`Math.ceil(raw.length / 4)\` and warns above 5,000. It gives the same result each time, but repo code does not promise a close fit for prose, code, or text in other scripts.

The study should keep two distinct oracles. Edge tests prove when the size note appears, while test files show how far its rough count sits from a named model count tool. Joining them would turn a measured gap into a product rule by chance.

## What does SKILL.md token estimate calibration need to prove?

SKILL.md token estimate calibration needs to prove the size edge, repeat runs, and clear gaps for each kind of text. It should not claim that a plain character ratio can match each model's token count.

The max is set in \`packages/shared/src/constants/index.ts\` as \`MAX_SKILL_TOKENS = 5000\`. The code in \`packages/skill-validator/src/index.ts\` reads the full file as a JavaScript string, computes \`Math.ceil(raw.length / 4)\`, and adds a content note only when that number is greater than the constant.

Because the check is strict, a rough count of exactly 5,000 does not warn, but a count of 5,001 does warn. Under the current math, raw lengths from 19,997 through 20,000 round to 5,000, while 20,001 rounds to 5,001.

That math is a stable repo rule, not proof of real context use. Frontmatter, Markdown marks, white space, and body code all add to \`raw.length\`. The size check does not parse the body first and does not take out fields.

A good file set should include ASCII prose, TypeScript with many names, Markdown tables, escaped strings, and text from more than one script. Keep each file in source control or make it the same way each time. Record exact raw length and a base token count from a named tool build.

The [validation CI guide](/blog/validate-skill-md-in-ci-pipeline) can guard the fixed warning edge. Use the [SKILL.md format guide](/blog/skill-md-format-guide) to keep study files valid, so schema faults do not mask size note checks.

The [Agent Skills specification](https://agentskills.io/specification) describes skill files and how tools load them in stages. It can guide real file shape, while QASkills repo code gives the exact local max and size rule.

A sound report lets a reviewer answer three questions at once. It must show which file was checked, which tool made the base count, and whether the QASkills size note matched its fixed edge.

## four characters per token: current repository behavior

The four characters per token rule uses JavaScript string length, not bytes, Unicode scalar values, words, or parsed syntax nodes. The ceiling operation maps every positive group of up to four additional code units to the next estimate.

For example, a raw file length of 20,000 yields 5,000. Adding one ASCII character changes the result to 5,001 and triggers a warning. Removing one character produces 5,000 again because 19,999 divided by four rounds upward.

Empty and short inputs still get a rough count, though other checks can add schema or content notes. Token tests should find just the note whose field is \`content\` and whose message starts with \`Estimated\`. They should not need the whole note list to hold one item.

The raw string includes line-ending code units. A CRLF pair contributes two to \`raw.length\`, while LF contributes one. Rewriting a large file's line endings can therefore change the heuristic even when rendered text appears equivalent.

JavaScript uses UTF-16 code units for string length. Many common ASCII characters consume one unit, while supplementary characters use surrogate pairs. This makes "four characters" an informal comment, because visible characters do not always map one-to-one to measured units.

Pin the code and its comment as two facts. The code is the rule that runs, while the comment says the count is rough. If either one changes, edge tests should show the exact count and note shift.

The current message includes both the computed estimate and recommended maximum. An exact assertion can protect those values, but avoid matching array order when safety or line warnings are also present. Search by message prefix and field.

Use [malformed frontmatter tests](/blog/malformed-skill-md-frontmatter-parser-tests) for parse faults. Study files should parse, since a parse error returns before the size check and cannot show how the token note works.

SKILL.md token estimate calibration also needs a no-change control that runs the same string twice and gets the same notes and scores. This check finds test file drift or a build that can change before the fit data earns trust.

## Why does multilingual token estimate change the contract?

A multilingual token estimate can change the spread of gaps because raw UTF-16 length and model token splits are not the same measure. The repo applies one ratio to each string and makes no rule for a given script.

Use escaped source literals when article or test files must remain ASCII, then inspect the runtime string. For example, \`\\u0065\\u0301\` contains a base letter plus a combining mark, while \`\\u00e9\` contains one precomposed code point. They can look alike but have different JavaScript lengths.

Unicode text can move among set forms, but the size code does not call \`normalize\`. The [Unicode Normalization report](https://www.unicode.org/reports/tr15/) defines those forms and when text is deemed alike. The study should state the source text form instead of making a guess.

Do not change text form in the test helper unless live code does so. A helper that changes the raw string would check a new input. Make clear rows for each form instead, and show both lengths.

Some symbols give a useful contrast. A literal built from \`\\u{1F600}\` has JavaScript length two, so 10,000 copies reach 20,000 code units. That does not set a model count; it only pins what the QASkills math reads.

Fixtures should cover scripts and compositions relevant to actual skill authors. Avoid claiming a universal error percentage from a tiny sample. Report each class, median, maximum absolute error, and direction only after a sufficient local corpus is measured.

Keep the text useful for the task. One repeated mark helps with an edge test but says little about fit. A study file should use steps, heads, names, and code like those found in a real skill.

The [seed catalog regression guide](/blog/seed-skill-catalog-parser-regression-tests) can supply repo files for a real sample. Pin their source hash when two reports are matched, so text edits do not look like size-rule drift.

When the base count tool changes, mark the new build with the saved counts instead of swapping them with no note. The rough rule may stay still while the base moves, and a clear tool field keeps those events apart.

## code token budget test test matrix

A code token budget test matrix should compare content classes while preserving exact warning arithmetic. The warning column comes from QASkills code, whereas any reference-count column must come from a named tokenizer run outside this heuristic.

Code tends to contain punctuation, short identifiers, indentation, and repeated syntax. Those traits make prose-derived ratios an uncertain proxy. Measure rather than asserting that code always overestimates or underestimates.

Markdown adds fences, table separators, links, and frontmatter syntax. Since the validator uses the raw string, every marker contributes code units. A rendered-word count is not an appropriate expected value for this branch.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| ASCII boundary | Valid source padded to 20,000 units | \`packages/shared/src/constants/index.ts\` | Estimate is 5,000 and no maximum warning appears |
| TypeScript-heavy body | Valid source padded to 20,001 units | \`packages/skill-validator/src/index.ts\` | Estimate is 5,001 and one matching warning appears |
| Multilingual text | Escaped fixtures with recorded runtime strings | Estimator plus reference counter | Report signed error without changing raw content |
| Mixed Markdown and code | Stable real-world fixture revision | Estimator plus reference counter | Store raw length, reference count, estimate, and error |
| CRLF variant | Same logical text with CRLF line endings | Validator estimator | Record the code-unit increase and resulting warning |
| Normalization pair | Composed and decomposed runtime strings | Calibration harness | Keep both rows and identify normalization form |

The first two rows are conformance tests and should run in every pull request. The remaining rows are calibration tests and may update when the corpus or reference tokenizer changes. Labeling them differently prevents routine content edits from redefining the warning threshold.

Use signed error as \`estimate - reference\`. A positive number means the heuristic is higher for that fixture, while a negative number means it is lower. Also store absolute error so opposite directions cannot cancel in an aggregate.

Percentage error needs a nonzero reference count and a documented formula. Do not round before aggregating. Round only display values, and retain integers for raw length, estimate, and reference count.

The [skill publishing guide](/how-to-publish) can tell authors how warning-only results affect their workflow. Calibration data should not convert a warning into rejection unless a separate policy change is approved.

Keep one short prose file and one short code file at the front of the set, then prove both can pass all non-size checks. These base files show that later warning shifts come from size and text shape, not from a bad skill header.

Grow each base file in fixed steps and save the exact raw length with the case name. A step chart can then show where the rough count moves, without a large file hiding the first point of change.

Use real names and code forms in the full set, but keep one plain letter pad for the hard edge near 20,000 units. The plain pad gives a clean math check, while the real files show how useful that math is.

When two files have the same raw length, place their base counts side by side and note the type of text. This pair can show why one fixed ratio needs a measured range, with no claim that one file speaks for all skills.

## How should MAX_SKILL_TOKENS warning be verified?

The MAX_SKILL_TOKENS warning should be verified with exact raw lengths around the arithmetic transition. Build a complete valid source, then pad only its body to the target JavaScript length.

This first example uses \`validateSkillContent\` from \`packages/skill-validator/src/index.ts\` and the constant from \`packages/shared/src/constants/index.ts\`. It asserts the generator before checking output, which prevents an invalid fixture size from producing a misleading failure.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { MAX_SKILL_TOKENS } from '@qaskills/shared';
import { validateSkillContent } from './index';

const base = \`---
name: Token boundary
description: A valid fixture for the token estimate boundary.
version: 1.0.0
author: qa-team
license: MIT
testingTypes: [unit]
languages: [typescript]
---

## Instructions

\`;

function sourceWithLength(length: number): string {
  if (base.length > length) throw new Error('Target is shorter than the fixture header');
  return base + 'x'.repeat(length - base.length);
}

describe('MAX_SKILL_TOKENS warning', () => {
  it.each([
    { length: MAX_SKILL_TOKENS * 4, expected: 5000, warns: false },
    { length: MAX_SKILL_TOKENS * 4 + 1, expected: 5001, warns: true },
  ])('handles $length code units', ({ length, expected, warns }) => {
    const raw = sourceWithLength(length);
    expect(raw.length).toBe(length);

    const result = validateSkillContent(raw);
    const warning = result.warnings.find((item) => item.message.startsWith('Estimated '));

    expect(Boolean(warning)).toBe(warns);
    if (warning) expect(warning.message).toContain(\`Estimated \${expected} tokens\`);
  });
});
\`\`\`

Padding with one repeated ASCII letter is appropriate for arithmetic conformance, not for accuracy. The test proves the implemented ratio and strict greater-than comparison. It says nothing about how a model would segment that repeated text.

The second example creates a reusable calibration record. Reference counts are explicit inputs gathered by a separate, versioned tool. The helper never labels one count as correct for every model.

\`\`\`typescript
interface CalibrationInput {
  id: string;
  raw: string;
  referenceTokens: number;
  tokenizerRevision: string;
}

interface CalibrationResult extends CalibrationInput {
  estimatedTokens: number;
  signedError: number;
  absoluteError: number;
}

export function measureFixture(input: CalibrationInput): CalibrationResult {
  const estimatedTokens = Math.ceil(input.raw.length / 4);
  const signedError = estimatedTokens - input.referenceTokens;

  return {
    ...input,
    estimatedTokens,
    signedError,
    absoluteError: Math.abs(signedError),
  };
}

const measured = measureFixture({
  id: 'typescript-mixed-markdown-v1',
  raw: fixtureSource,
  referenceTokens: fixtureMetadata.referenceTokens,
  tokenizerRevision: fixtureMetadata.tokenizerRevision,
});

expect(measured.estimatedTokens).toBe(Math.ceil(fixtureSource.length / 4));
expect(measured.tokenizerRevision).not.toBe('');
\`\`\`

Store \`fixtureMetadata\` beside the corpus and review its update separately. Do not call the estimator to populate \`referenceTokens\`; doing so would make every error zero by construction.

The [CI validation article](/blog/validate-skill-md-in-ci-pipeline) can keep boundary tests blocking. Calibration reports can begin as artifacts until teams define acceptable error bands for their actual tokenizer and content mix.

Name the hard-edge tests with both raw length and rough count, such as "20001 units gives 5001." A clear name lets a failed run show the rule at once, even when the warning text or list order has changed.

Check that no size note is found at the lower edge, rather than checking that the full note list is blank. The same valid file may have a line note or short-body note that has no link to token size.

For the high edge, find the note by field and by its first word, then check both numbers in the text. This proves the right branch ran and keeps the test free from the place where other notes sit.

Write the base-count data to a small JSON row with the file ID, tool ID, count, and source hash. The test can read that row, while the tool that made it stays out of the code under test.

## skill context size calibration acceptance criteria

Skill context size calibration passes when warning conformance and tokenizer accuracy remain distinct. The fixed suite must prove exact code-unit boundaries, while the corpus report must identify every external comparison assumption.

For conformance, require no estimate warning at 20,000 units and a warning at 20,001. Also verify the message contains the computed estimate and configured maximum. Keep line-count and safety warnings outside that assertion.

For calibration, require fixture ID, repository revision, raw length, line-ending style, normalization note, content class, reference tokenizer revision, and reference count. A missing field should invalidate the report rather than default silently.

Do not set an arbitrary global error limit before gathering data. Different deployment models may segment the same text differently. Choose acceptance bands from the actual consumer contract and preserve per-class results.

Regression criteria should detect both estimator changes and corpus changes. Hash or otherwise identify fixture content, then separate changed-content rows from changed-formula rows. This keeps a documentation edit from looking like an algorithm regression.

The warning remains advisory in current validator output. A result can be valid while warnings contain the estimate message. Tests should assert \`valid\` and warnings independently instead of assuming warning presence makes validation fail.

If the ratio changes, preserve historical fixture reports for comparison. State the reason, measured effect, and consumer tokenizer. Avoid presenting a tuned ratio as exact after optimizing it for one corpus.

If the maximum changes, update the constant and boundary derivation together. Tests should calculate target lengths from \`MAX_SKILL_TOKENS\` where appropriate, while still asserting current human-readable values when message compatibility matters.

SKILL.md token estimate calibration should produce concise artifacts rather than raw content dumps. Fixture identifiers and summary measures are enough for routine CI, while full sources remain in the repository for review.

Set the first gate on the facts the repo owns: raw length, rough count, max value, and note state. These facts should match on each run and do not depend on the model that will read the skill.

Set a second gate only when the team owns a named model and count tool for the task. Write that tool and model in the row, so a new tool cannot change the pass rule with no sign.

Keep the low, mid, and high error rows even when one mean looks good, since a mean can hide misses in both ways. The team needs to see which text set falls short and which text set runs high.

If no error band has been approved, publish the facts and do not fail the build on a guessed range. The fixed max note can still fail its own tests while the team learns from the wider set.

## How do you test SKILL.md token estimate calibration step by step?

Test SKILL.md token estimate calibration in two passes: first lock the local formula, then measure it against a versioned reference. This order keeps a tokenizer update from breaking the repository's deterministic warning contract.

1. Read \`packages/shared/src/constants/index.ts\` and record the current maximum of 5,000.
2. Read \`packages/skill-validator/src/index.ts\` and record the ceiling formula plus strict comparison.
3. Build one valid SKILL.md fixture and assert its exact JavaScript length before validation.
4. Pad copies to 19,999, 20,000, and 20,001 units, then assert estimates and warning presence.
5. Add representative ASCII prose, TypeScript, Markdown, CRLF, and multilingual corpus files.
6. Generate reference counts with a named tokenizer revision and store them outside production calculations.
7. Calculate signed error, absolute error, and class summaries without rounding source integers.
8. Publish a report that separates threshold failures, content changes, and tokenizer changes.
9. Add the conformance suite to CI and review calibration drift on a defined schedule.

Begin with the generated boundary files because their oracle comes entirely from cited code. Check the exact source length in every row. A missing assertion there can move the intended boundary through frontmatter edits.

Next, select real skills without modifying their text. Copying them through a formatter may alter line endings or normalization. Record a revision so later reports can explain differences.

Run the reference tokenizer in a controlled tool outside the QASkills estimator. Capture its name, model or vocabulary identifier, package version, and options. If those details are unavailable, mark the count provisional.

Compare each fixture independently before calculating summaries. One huge file can dominate absolute error, while many tiny files can dominate average percentage error. Report both per-file and grouped views.

Finally, decide whether the warning formula still serves its documented purpose. A decision can preserve it, tune it, or replace it, but the pull request should include measured before-and-after results.

Inspect [available QA skills](/skills) for representative structure, then keep the corpus local and stable. Production pages should never be fetched during a deterministic unit test.

Start each run with one tiny file whose rough count can be checked by hand, then run the two max-edge files. If these three fail, stop before the large set and fix the read path or math first.

Next, run text sets in a fixed order: plain prose, code, mixed Markdown, CRLF, and non-ASCII runtime text. Keep each group small enough that one changed file can be found from the report with no search.

For each row, show raw units, rough count, base count, signed gap, and tool ID on one line. This makes two runs easy to diff and keeps the source body out of logs that may be shared.

When a source file changes, make the review show its old and new hash plus both sets of counts. Do not call that shift a rule drift when the math and tool stay the same.

Use the [format guide](/blog/skill-md-format-guide) to vet each new file before it joins the set. A bad header can stop the size branch and leave a blank report that looks like a count bug.

## SKILL.md token estimate calibration rollout and regression checks

A calibration rollout starts with tests that make no policy change. Add the 20,000 and 20,001 boundary cases, publish a corpus report, and review the observed error by content class.

Assign the constant and formula to one owner. Today they live in separate modules, so a changed maximum can retain the same ratio. A test derived from the imported constant will catch wiring, while an explicit message assertion catches documentation drift.

Keep the report generator deterministic. Sort fixtures by ID, use fixed integer calculations, and omit timestamps from compared output. Metadata may record the run environment in a separate section.

Run the blocking suite on validator and shared-package changes. Run the full calibration corpus when token logic, fixture content, line-ending policy, normalization policy, or the reference tokenizer changes.

Backward compatibility includes warning consumers. CLI output or CI parsers may inspect warning fields and text. Before revising message shape, search those callers and add contract tests rather than assuming warnings are read only by people.

Avoid turning one heuristic into several hidden ratios by script. If content-class adjustments are proposed, represent them explicitly and prove classification behavior. Simplicity can be valuable when the output is clearly labeled as an estimate.

The [seed catalog article](/blog/seed-skill-catalog-parser-regression-tests) can help maintain a repository sample. Add a small fixed subset instead of making every seed edit rewrite the calibration baseline.

Review multilingual rows with normalization notes, not visual inspection alone. Canonically related strings may render similarly while contributing different raw lengths. The report should show escaped diagnostics or code-unit counts.

SKILL.md token estimate calibration is complete only when maintainers can reproduce both the warning and comparison counts. Archive commands, revisions, and options beside the result.

Land the edge tests first, since they need no model key, net call, or large data set. They run fast and pin the one rule that QASkills owns in code today.

Land the file set next with base counts as checked-in data, not as values fetched during each pull request. This keeps a slow or changed remote tool from making the same code pass on one day and fail on the next.

Add one job that can refresh base counts on request, then make its diff a normal code review. The job should name the old and new tool IDs and must not write new pass bands on its own.

Keep CRLF and text-form pairs as two rows, even if the chosen tool gives them the same count. Their raw lengths may still differ, and that fact can move the QASkills size note near its edge.

Once a band is set, test each text group as well as the full set. A broad mean can pass while code or non-ASCII text falls far outside the range that matters for a real task.

Review the [seed catalog checks](/blog/seed-skill-catalog-parser-regression-tests) when the sample set changes. Reuse stable source files by hash, but keep the count report in this suite so broad seed work stays quick.

## Frequently Asked Questions

### What should four characters per token tests assert?

They should assert exact raw string length, \`Math.ceil(length / 4)\`, and warning presence around the configured maximum. These are conformance checks for repository behavior. They should not assert that the estimate equals a model tokenizer unless a named, versioned reference produced that separate count.

### How does multilingual token estimate affect the SKILL.md contract?

The current contract does not branch by language; every file uses raw JavaScript length divided by four. Multilingual fixtures can expose different calibration errors because code units and tokenizer segments measure different things. Record normalization form, runtime length, reference revision, and per-fixture error without generalizing from one script.

### Which fixture best exposes code token budget test?

Use a valid SKILL.md body containing representative TypeScript identifiers, punctuation, strings, comments, and Markdown fences. Keep its revision fixed and store an external reference count. Pair it with an ASCII padding fixture, because only the latter gives a simple oracle for the current warning boundary.

### When should teams check MAX_SKILL_TOKENS warning?

Check it whenever the shared maximum, validator formula, line-ending handling, or warning message changes. Also rerun calibration when the consumer tokenizer or corpus changes. The threshold suite belongs in every relevant pull request, while a larger accuracy report can run on a scheduled or targeted job.

### What is the pass criterion for skill context size calibration?

Boundary cases must match the exact configured arithmetic, and every calibration row must carry reproducible fixture plus tokenizer metadata. No report may derive its reference count from the QASkills estimate. Any accepted error band should be documented per consumer and supported by measured corpus results.

## Conclusion

SKILL.md token estimate calibration should preserve the validator's deterministic warning while testing its accuracy as a separate question. Exact code-unit boundaries prove implementation behavior; versioned corpus counts show whether the heuristic remains useful for a chosen consumer.

Add the boundary suite, then collect reference data before tuning any ratio or maximum. Browse [QA skills](/skills) for representative file shapes, and use [how to publish](/how-to-publish) to keep warnings visible during author review.`,
};
