import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md invalid UTF-8 validation Tests',
  description:
    'SKILL.md invalid UTF-8 validation: detect malformed bytes before string parsing. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md invalid UTF-8 validation',
  keywords: [
    'SKILL.md invalid UTF-8 validation',
    'malformed UTF-8 skill file',
    'replacement character validation',
    'byte level SKILL.md check',
    'frontmatter encoding failure',
    'strict text decoder tests',
  ],
  relatedSlugs: [
    'validate-skill-md-in-ci-pipeline',
    'malformed-skill-md-frontmatter-parser-tests',
    'seed-skill-catalog-parser-regression-tests',
    'skill-md-format-guide',
  ],
  sources: ['https://nodejs.org/api/fs.html', 'https://www.unicode.org/reports/tr15/'],
  repoEvidence: [
    'packages/skill-validator/src/index.ts',
    'packages/shared/src/parsers/skill-parser.ts',
  ],
  content: `SKILL.md invalid UTF-8 validation should read file bytes first and reject malformed sequences with a fatal byte reader before calling the existing string parser. Tests must distinguish invalid bytes from a valid encoded replacement mark, preserve the accepted ASCII baseline, and report an encoding failure without pretending that frontmatter parsing caused it.

The decisive edge is the file read. Once invalid bytes become replacement characters inside a JavaScript string, the parser cannot reliably reconstruct what the file originally contained.

## What does SKILL.md invalid UTF-8 validation need to prove?

SKILL.md invalid UTF-8 validation needs to prove that malformed bytes stop before YAML parsing, while valid UTF-8 reaches the unchanged check path. It also needs a literal replacement mark control, because that mark can be valid source text rather than evidence of byte read damage.

The current file entry point is \`packages/skill-validator/src/index.ts\`. Its \`validateSkillFile\` function resolves a path, calls \`fs.readFile\` with the \`utf-8\` encoding, and passes the resulting string into \`validateSkillContent\`.

That behavior defines the current characterization. The function does not inspect a \`Buffer\`, does not create a fatal byte reader, and does not return a dedicated encoding error. A test should record those facts before proposing a stricter read path.

The next layer is \`packages/shared/src/parsers/skill-parser.ts\`. Its \`parseSkillMd\` input is already a string, so gray-matter receives decoded text and cannot inspect the source byte sequence.

This distinction keeps the suite split from [malformed frontmatter parser tests](/blog/malformed-skill-md-frontmatter-parser-tests). Those tests begin with text that JavaScript can represent, while malformed encoding fixtures must begin as bytes that have no valid UTF-8 interpretation.

The accepted baseline should be a small ASCII SKILL.md with valid required fields and enough body text to avoid unrelated warnings. Write that file as bytes, run the public file validator, and save its exact validity, errors, warnings, and score.

Next, mutate one byte region at a time. An isolated continuation byte, a truncated multibyte sequence, and an invalid leading byte should each exercise the encoding edge without changing the surrounding YAML structure.

The literal replacement control requires three valid bytes, \`EF BF BD\`, at a known body location. A strict byte reader must accept those bytes because they encode U+FFFD correctly, even if a later content policy chooses to warn about that mark.

The [Node.js file-system documentation](https://nodejs.org/api/fs.html) describes reads with and without an encoding. Use the byte-returning form for the proposed strict check, but label that path as a recommendation until repository code implements it.

Do not assert that every accepted byte stream produces valid frontmatter. Encoding success only permits the normal parser and schema stages to run. YAML syntax, required metadata, body warnings, and safety checks remain independent outcomes.

A useful oracle names the first failed stage. Encoding errors should say encoding, parser exceptions should say frontmatter, and schema issues should retain their field paths. This division gives authors a repair they can act on.

The [CI check guide](/blog/validate-skill-md-in-ci-pipeline) explains where the final regression command belongs. Keep byte fixtures in a binary-safe test directory so editors and formatters do not rewrite them.

## malformed UTF-8 skill file: current repository behavior

A malformed UTF-8 skill file currently enters \`validateSkillFile\` through a read request that asks Node for text. The observable validator input is therefore a JavaScript string rather than the original sequence of bytes.

The repository code makes no byte claim after that read. \`validateSkillContent\` accepts \`raw: string\`, counts string length and lines, parses frontmatter, scans body patterns, and calculates a score from parsed text.

Create a characterization test before changing the implementation. Write a valid control file, copy it to a \`Buffer\`, replace one body byte with \`0x80\`, and record the present result without treating it as the desired policy.

The most important assertion is not a guessed error message. Inspect the string produced by the same encoded read and verify whether it contains U+FFFD, then show that the original invalid byte is no longer observable through that string.

That proof explains why a parser-only patch is insufficient. Searching parsed text for U+FFFD would reject both byte read damage and an author who intentionally stored a valid replacement mark.

Keep malformed bytes in the Markdown body for the first case. This avoids making YAML behavior part of the initial observation, and it demonstrates that file encoding applies to the entire artifact rather than only its frontmatter.

Then repeat one malformed sequence inside a quoted description. The expected strict result stays an encoding rejection, because a fatal byte reader should stop before gray-matter evaluates quote or delimiter rules.

Use the [SKILL.md format guide](/blog/skill-md-format-guide) to build the surrounding valid text. Required metadata should stay constant across cases so every changed outcome traces to the byte mutation.

Do not create binary fixtures through normal string literals. JavaScript strings contain Unicode code points or UTF-16 code units, and encoding them usually produces legal UTF-8. Construct a \`Buffer\` or edit a byte array explicitly.

File names should state the defect, such as \`isolated-continuation.skill.md.bin\`. The extra suffix discourages text tools from opening and rewriting the fixture before the test can read it.

The public validator currently returns structured results for parser and schema problems. A future encoding branch should use the same broad shape if compatibility matters, but its field and message need a documented choice.

One reasonable proposal returns \`valid: false\`, an \`encoding\` field error, no warnings, and zero scores. Another proposal throws a typed read error. Tests should select one contract and avoid accepting both, since callers need predictable control flow.

Inspect existing [published skills](/skills) only as valid samples. Their successful display does not prove that every stored source passed a fatal byte reader, so do not infer historical guarantees from rendered content.

## Why does replacement character validation change the contract?

Replacement mark check changes the contract because U+FFFD can arise from two different inputs with different meanings. Invalid bytes may be substituted during a permissive decode, while \`EF BF BD\` is a valid encoding of the mark itself.

A string-level rule sees the same code point in both cases. It cannot decide whether the author supplied U+FFFD or the byte reader inserted it after finding malformed bytes.

That ambiguity matters for compatibility. Rejecting every replacement mark could block valid instructions, examples, or test data, even though their file encoding is correct.

The byte edge resolves the ambiguity cleanly. A fatal UTF-8 byte reader rejects malformed sequences and accepts every legal sequence, including the three bytes that encode U+FFFD.

Normalization does not replace this check. The [Unicode normalization report](https://www.unicode.org/reports/tr15/) explains canonical and compatibility normalization of valid mark sequences, not recovery of bytes already lost during byte read.

Run normalization only if the product has a split text policy. It should occur after strict byte read and should have tests for its own expected changes, since encoding validity and canonical equivalence answer different questions.

The parser's \`raw\` field also cannot solve the problem after byte read. In \`packages/shared/src/parsers/skill-parser.ts\`, \`raw\` preserves the string argument exactly, but that argument may already contain byte reader substitutions.

Call that value raw text, not raw bytes. The distinction is small in naming but large in the test contract, because exact string equality does not prove original byte equality.

A useful four-way test compares ASCII, a legal multibyte mark, legal U+FFFD, and one malformed sequence. The first three must decode, while only the malformed sequence must stop at the encoding stage.

After successful byte read, send all accepted strings through the same validator. This proves the new edge does not fork ordinary parser, schema, warning, or score behavior.

Do not remove U+FFFD silently. If a product rule disallows it, return a clear content diagnostic after byte read and keep that test split from byte validity.

Keep this policy visible in [seed catalog parser checks](/blog/seed-skill-catalog-parser-regression-tests). Seed files often act as broad valid controls, but the focused binary fixtures remain the source of truth for malformed sequences.

The pass condition is strict yet narrow. No malformed byte sequence may reach \`parseSkillMd\`, and no legal sequence may fail merely because its decoded mark looks unusual.

## byte level SKILL.md check test matrix

A byte level SKILL.md check matrix should record the bytes, byte reader result, next stage, and stable public assertion. This shape separates transport validity from text content and prevents one replacement-mark shortcut from hiding the distinction.

| Case | Input or edge | Layer under test | Expected assertion |
|---|---|---|---|
| Valid ASCII | Small valid SKILL.md bytes | Proposed file decode before \`packages/skill-validator/src/index.ts\` check | Decode succeeds and the existing check result remains unchanged |
| Legal multibyte text | UTF-8 bytes for an accented name | Strict byte reader then parser | Decode succeeds and parsed text contains the expected mark |
| Isolated continuation | One \`0x80\` byte in the body | File byte edge | Decode fails before \`packages/shared/src/parsers/skill-parser.ts\` runs |
| Truncated sequence | Final bytes \`0xE2 0x82\` | File byte edge | Decode fails with the selected stable encoding result |
| Encoded replacement | Bytes \`0xEF 0xBF 0xBD\` | Byte reader then content check | Decode succeeds and text contains one intentional U+FFFD mark |
| Permissive comparison | Encoded read of isolated continuation | Current characterization | Returned text contains substitution, showing why string scanning is ambiguous |

Generate these cases from one baseline \`Buffer\`. Use \`Buffer.concat\` around a known marker rather than searching for a random byte value that may occur elsewhere.

Keep the malformed region away from the final newline in the isolated case. This preserves line counts and makes a changed warning less likely to distract from the intended byte reader result.

For truncation, placing the incomplete sequence at end of file is direct and stable. The strict byte reader should fail because the sequence lacks its required continuation byte, regardless of valid content before it.

The legal multibyte row protects against an ASCII-only mistake. Include a simple two-byte or three-byte mark, decode it, and assert exact text before running the normal validator.

The replacement row is the policy guard. If an implementation merely rejects decoded U+FFFD, this valid row will fail and expose the false positive.

Keep current and proposed expectations in different tests during migration. The current encoded read characterizes behavior, while the fatal byte reader test defines the intended contract.

Reports should avoid embedding raw invalid bytes in terminal output. Print a fixture name, byte offset, and short hexadecimal window so logs remain valid text and failures stay easy to compare.

Add the matrix command to [CI check](/blog/validate-skill-md-in-ci-pipeline). Binary fixtures must be committed without text normalization, and the test should verify their byte hashes if repository tooling might transform them.

Use one sound file as the base for all byte rows. Give the file a short name, keep its text plain, and make sure it can pass the full check before any byte is changed.

Find a mark in the body that occurs just once, then save its byte spot. This makes each splice clear and keeps the YAML block the same for all bad cases.

For the first bad case, place \`0x80\` just after that mark. The strict read must fail, and the spy must show that no text or YAML check ran next.

For the cut-off case, put \`0xE2 0x82\` at the end of a copy. The lead byte starts a form that needs one more byte, so the file read must stop there.

For the sound replacement mark, write \`0xEF 0xBF 0xBD\` in the same spot. The strict read must pass, and the text must have one U+FFFD mark at that point.

These two near cases give the test its worth. Both may yield the same mark after a loose read, yet the byte-first rule can tell which source was sound.

Keep one plain non-ASCII word in the good set as well. Its bytes must pass and its text must match, which guards against a bad fix that lets only ASCII through.

When a bad read fails, check the stage and the public error shape. Do not match the full host error, since that adds noise and can change with the Node build.

When a good read passes, compare the whole result with the old path. The same fields, score, warns, and field errors should come back for the same sound file.

Use a spy only at the handoff from bytes to text. Too many mocks can make the test pass while the real file path uses a quite different chain.

Keep the bad byte files out of tools that treat all files as text. A save from such a tool may swap the bad byte for a sound mark and void the test.

The CI log can show the case name, byte spot, and a short hex span. That is enough to fix the file and does not leak the full skill text.

Reviewers should ask one plain question for each row: did bad bytes stop before text work? They should ask a second one for good rows: did the old result stay the same?

This worked set also makes the shipped line clear. The byte-first read is still a plan in this guide, while the encoded string read is what the cited code does now.

## How should frontmatter encoding failure be verified?

Frontmatter encoding failure should be verified before calling \`validateSkillContent\`, because that function only accepts strings. The first example builds byte cases and proves that a fatal byte reader distinguishes malformed input from legal U+FFFD.

\`\`\`typescript
import { describe, expect, it } from 'vitest';

const decodeSkillBytes = (bytes: Uint8Array): string =>
  new TextDecoder('utf-8', { fatal: true }).decode(bytes);

describe('strict SKILL.md byte read', () => {
  it('accepts valid UTF-8 including an encoded replacement mark', () => {
    const bytes = Buffer.from('body: \\uFFFD', 'utf8');

    expect(decodeSkillBytes(bytes)).toBe('body: \\uFFFD');
  });

  it.each([
    ['isolated continuation', Uint8Array.from([0x61, 0x80, 0x62])],
    ['truncated sequence', Uint8Array.from([0x61, 0xe2, 0x82])],
  ])('rejects %s bytes', (_name, bytes) => {
    expect(() => decodeSkillBytes(bytes)).toThrow();
  });
});
\`\`\`

This helper is proposed code, not a copy of the current validator. Its value is the explicit \`fatal: true\` option and its byte input, both of which should remain visible in review.

The second example characterizes the existing encoded read, then shows the integration shape for a future byte-first entry point. Spy on \`validateSkillContent\` so malformed data cannot pass by accident.

\`\`\`typescript
import fs from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';

const validateDecodedFile = async (filePath: string) => {
  const bytes = await fs.readFile(filePath);
  const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return validateSkillContent(raw);
};

it('stops before content check when bytes are malformed', async () => {
  const validateSpy = vi.spyOn(validatorModule, 'validateSkillContent');
  await fs.writeFile(filePath, Uint8Array.from([0x2d, 0x2d, 0x2d, 0x0a, 0x80]));

  await expect(validateDecodedFile(filePath)).rejects.toThrow();
  expect(validateSpy).not.toHaveBeenCalled();
});

it('records the current permissive string read', async () => {
  const decoded = await fs.readFile(filePath, 'utf-8');

  expect(decoded).toContain('\\uFFFD');
});
\`\`\`

Keep actual temporary paths under the test runner's managed directory. Clean them after each case, and do not let concurrent tests share one binary file.

If the approved public contract returns a \`ValidationResult\` instead of throwing, wrap only the decode error. Do not catch parser, schema, or file-not-found errors in the same branch, because those outcomes already have split meanings.

The public assertion should name the selected field and message, not the engine's full exception text. Byte reader wording can vary by runtime, while the product contract should remain stable.

Run one legal file through both old and proposed paths. Deeply compare the returned result so reviewers can see that strict byte read changes malformed input only.

Use [how to publish](/how-to-publish) for the final command-facing check. A publisher should receive one clear encoding failure and no partial score or generated artifact.

## strict text decoder tests acceptance criteria

Strict text decoder tests pass when every malformed sequence stops before parsing and every legal control reaches normal checks. The suite must preserve the distinction between source bytes, decoded text, and parsed metadata.

The minimum malformed set is an isolated continuation byte, an invalid lead byte, an overlong form if the runtime rejects it, and a truncated sequence. Each fixture should change only one byte region.

The minimum valid set is ASCII, one ordinary multibyte mark, and a correctly encoded U+FFFD. These controls prove the byte reader is strict rather than limited to basic English text.

Choose a stable product response for failure. If \`validateSkillFile\` continues returning \`ValidationResult\`, an \`encoding\` error with zero score is clear and keeps callers on the current return path.

Do not label the error as frontmatter when malformed bytes occur in the body. File encoding covers the whole source, and the strict check should run before YAML boundaries matter.

The parser and schema must not receive a substituted string. Use a spy or a narrow dependency seam to prove no call occurs after decode failure.

For valid controls, compare full check results against the current path. This catches accidental changes to warnings, line counts, token estimates, safety scans, and quality scores.

Keep literal U+FFFD policy split. If the team later disallows that mark, add a content rule with its own field and test, while retaining byte reader acceptance for its legal bytes.

Error logs may include a byte offset and a short hex sample. They should never dump an entire private skill file or attempt to print invalid bytes directly.

Run the suite on supported Node versions and after runtime upgrades. A changed byte reader result should trigger review rather than an automatic snapshot refresh.

Before rollout, sample [published skills](/skills) through the proposed valid path and report only measured results. The sample supports compatibility review, but it does not replace focused malformed fixtures.

SKILL.md invalid UTF-8 validation is complete only when strict byte read owns byte validity and existing code continues to own text validity. That edge makes failures precise and keeps parser behavior understandable.

## How do you test SKILL.md invalid UTF-8 validation step by step?

Test SKILL.md invalid UTF-8 validation by establishing a valid result, mutating bytes, and proving exactly where each malformed case stops. Keep source construction, byte reads, and content checks in their own test helpers.

1. Read \`packages/skill-validator/src/index.ts\` and record the current encoded file read plus returned \`ValidationResult\` shape
2. Read \`packages/shared/src/parsers/skill-parser.ts\` and confirm that its public input is an already decoded string
3. Create one valid ASCII SKILL.md as a \`Buffer\`, then save its exact check result as the control
4. Add legal multibyte text and legal encoded U+FFFD cases, asserting exact decoded characters and unchanged check flow
5. Add isolated continuation, invalid lead, and truncated sequence bytes at fixed offsets in split fixtures
6. Decode each byte array with the proposed fatal byte reader and assert the selected stable encoding response
7. Prove \`validateSkillContent\` and \`parseSkillMd\` are not called for malformed cases, then compare valid results deeply
8. Commit binary-safe fixtures and run the focused suite with the broader publication checks in CI

Start with the control on every run. A broken delimiter, missing language, or short body can create unrelated failures that make the byte rows hard to diagnose.

Build mutations through byte offsets found from an ASCII marker. Assert that the marker occurs once, then splice the malformed sequence after it.

Keep each test name tied to one UTF-8 rule. A table can share setup, but expected outcomes should remain explicit enough for reviewers to identify the broken class.

Do not convert a malformed fixture to a string for snapshots. That conversion is the behavior under examination and can destroy the bytes needed by the test.

At the integration layer, choose either a stable returned error or a typed thrown error. Assert one choice, document it, and ensure the CLI maps it without a stack trace.

Run the final fixture through the workflow described in [CI check](/blog/validate-skill-md-in-ci-pipeline). The command should exit unsuccessfully, identify encoding, and leave later parser assertions untouched.

## SKILL.md invalid UTF-8 validation rollout and regression checks

SKILL.md invalid UTF-8 validation rollout should begin with characterization and a written public error contract. Changing the read edge can affect every local file check call, even though valid UTF-8 should keep the same result.

The validator owner should review byte reading and error mapping. Shared parser owners should confirm no byte reader logic leaks into \`parseSkillMd\`, because its string API remains useful for trusted in-memory content.

CLI owners should verify exit status and concise diagnostics. Web or SDK callers should verify that a new field value does not break exhaustive handling or hide an existing file-system error.

Run all valid validator tests through the new path first. Their errors, warnings, score, and breakdown should match exactly, which proves the change is limited to decode failures.

Then run the focused malformed matrix on each supported Node runtime. Avoid snapshots of native error messages, since stable product fields are easier to maintain.

Review text tooling around fixtures. Git attributes, editors, formatters, and archive steps must leave binary files unchanged, or tests may pass on one checkout and fail on another.

Add one fixture where malformed bytes appear before the closing frontmatter delimiter. Add another in the body, and expect the same encoding result from both.

Do not claim that strict byte read repairs malformed files. It rejects them early and preserves evidence for a clear diagnostic; authors still need to save valid UTF-8.

Pair the release note with [publication guidance](/how-to-publish). State the accepted encoding and error stage, then link authors to normal frontmatter help for files that decode but still fail parsing.

Monitor only aggregate encoding failure counts if telemetry is approved. Never collect raw skill bytes, full file paths, or body excerpts merely to diagnose this edge.

The smallest lasting regression suite has three valid controls and four malformed sequences. Keep the current permissive characterization only as long as it helps explain migration, then test the selected public contract directly.

## Frequently Asked Questions

### What should malformed UTF-8 skill file tests assert?

Assert the original byte sequence, the first failed stage, and the stable public result. Malformed bytes must stop before \`validateSkillContent\`, while valid ASCII and multibyte controls must retain their existing results. Avoid matching a complete native read error because runtime wording may change.

### How does replacement character validation affect the SKILL.md contract?

U+FFFD may be valid source text or a substitution created during permissive byte read. A string search cannot distinguish those origins. Decode bytes with a fatal UTF-8 byte reader first, accept legally encoded U+FFFD, and apply any split mark policy only after byte read succeeds.

### Which fixture best exposes byte level SKILL.md check?

Use two files that decode to text containing U+FFFD under the current path. One should contain valid \`EF BF BD\` bytes, while the other contains an isolated \`0x80\`. A fatal byte reader must accept the first and reject the second before parsing.

### When should teams check frontmatter encoding failure?

Run encoding cases whenever file reading, Node versions, validator error mapping, CLI output, or fixture handling changes. Also run them before publication pipeline updates. These changes can alter the byte edge even when gray-matter and the frontmatter schema remain untouched.

### What is the pass criterion for strict text decoder tests?

Every malformed sequence must produce the chosen encoding failure before parser or schema work begins. Every legal sequence, including encoded U+FFFD, must reach normal check with unchanged results. Logs may identify an offset, but they must not expose whole private files.

## Conclusion

SKILL.md invalid UTF-8 validation belongs at the file byte edge, before the current string parser receives input. Add fatal byte reader tests that split malformed sequences from legal U+FFFD, then preserve every existing result for valid files.

Open the [skills directory](/skills), inspect a published SKILL.md, then use [how to publish](/how-to-publish) to apply this encoding contract before publication. Run the byte cases in CI before the file read changes.`,
};
