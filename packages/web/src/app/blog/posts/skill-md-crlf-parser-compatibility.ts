import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md CRLF parser compatibility Tests',
  description:
    'SKILL.md CRLF parser compatibility: compare line-ending behavior across parser paths. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md CRLF parser compatibility',
  keywords: [
    'SKILL.md CRLF parser compatibility',
    'Windows SKILL.md line endings',
    'CRLF frontmatter delimiter',
    'seed parser newline mismatch',
    'cross-platform skill validation',
    'LF CRLF regression matrix',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'testing-skill-md-yaml-frontmatter-roundtrip',
    'malformed-skill-md-frontmatter-parser-tests',
    'validate-skill-md-in-ci-pipeline',
  ],
  sources: ['https://yaml.org/spec/1.2.2/', 'https://nodejs.org/api/fs.html'],
  repoEvidence: ['packages/web/src/db/seed.ts', 'packages/web/src/lib/fallback-skill-detail.ts'],
  content: `SKILL.md CRLF parser compatibility currently differs across two web ingestion paths. Seed regexes require literal LF boundaries, so CRLF can prevent frontmatter discovery or body stripping. Fallback detail extraction uses \`\\r?\\n\`, so it accepts either style. Tests should expose each result before choosing one shared policy.

This disagreement is about exact runtime strings, not the operating system label alone, since a file made on any system can hold LF, CRLF, mixed separators, or no final newline. Fixtures must build those bytes deliberately and assert the decoded string before invoking a parser.

## What does SKILL.md CRLF parser compatibility need to prove?

SKILL.md CRLF parser compatibility needs to prove how each repository path recognizes opening delimiters, closing delimiters, and the first body line. The result should name the path because current implementations do not share one helper.

In \`packages/web/src/db/seed.ts\`, \`readSkillBody\` matches \`^---\\n\`, then requires another \`\\n---\\n\`. When the pattern fails, that function returns the complete content rather than an empty body or parse error, so a CRLF file can retain frontmatter in the value treated as body.

The same module's additional-skill discovery uses \`^---\\n([\\s\\S]*?)\\n---\`. When no match exists, the loop continues and skips that candidate, which differs from \`readSkillBody\` even though both expressions sit in the same file.

In \`packages/web/src/lib/fallback-skill-detail.ts\`, \`extractMarkdownBody\` uses carriage-return-optional line breaks around both delimiters and the body boundary. A full CRLF file matches, while a failed expression makes this helper return the original markdown after trimming.

Tests must assert more than "accepted." For seed discovery, acceptance means a skill entry is produced. For body extraction, acceptance means frontmatter is removed and only body content remains. A truthy returned string cannot distinguish those outcomes.

The first control should use LF around every frontmatter line and delimiter, while the second should replace every LF with CRLF. Mixed cases should vary opening, internal, closing, and body boundaries independently because each literal position can fail for a different reason.

Use the [SKILL.md format guide](/blog/skill-md-format-guide) for a minimal valid source. Compare with [frontmatter parser tests](/blog/malformed-skill-md-frontmatter-parser-tests), but do not classify a valid CRLF document as malformed before the selected parser policy says so.

The [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/) defines line-break handling within YAML processing. These repository expressions are custom Markdown-frontmatter recognizers, so their exact regular expressions remain the immediate oracle.

A passing suite reports the decoded line-break sequence, parser path, match status, and extracted body. That evidence makes a later shared-helper migration reviewable without pretending the behavior is already unified.

## Windows SKILL.md line endings: current repository behavior

Windows SKILL.md line endings usually use carriage return followed by line feed, represented as \`\\r\\n\`. The seed expressions contain only \`\\n\` immediately after fixed text, so the preceding \`\\r\` prevents those positions from matching.

Node reads each seed file with \`readFileSync(path, 'utf-8')\`. The cited code performs no \`replace\`, \`split\`, or normalization before applying its expressions, so tests should inspect the returned string rather than assume line endings changed during reading.

The official [Node file-system documentation](https://nodejs.org/api/fs.html) describes encoded file reads and synchronous APIs, but it does not replace tests for local helper behavior. Use a temporary file integration case only after direct string cases define the expected contract.

The LF body pattern is anchored at the start and end. It expects an opening delimiter, frontmatter, a closing delimiter, at least one following LF, and then captures any body content. A missing newline after the closing delimiter prevents that complete expression from matching.

The discovery expression is anchored only at the start. It requires LF after the opening marker and before the closing marker, but it does not require a newline after the closing marker. This means terminal-boundary behavior can differ between discovery and body extraction.

Fallback extraction is also anchored to the end. Its \`\\r?\\n\` tokens allow LF or CRLF at required boundaries, but they do not describe a lone carriage return. A CR-only fixture should remain a separate unsupported variant unless policy expands.

Mixed separators deserve explicit names. A source may use CRLF for frontmatter lines but LF before the body, or the reverse. A global replacement fixture cannot locate which required boundary caused failure, so derive cases from arrays of line segments.

The [YAML round-trip guide](/blog/testing-skill-md-yaml-frontmatter-roundtrip) can cover writing behavior after parsing is consistent. This suite should first pin reading, because a formatter may erase the original line-ending evidence.

SKILL.md CRLF parser compatibility is not proven by gray-matter behavior elsewhere. These web paths use their own regular expressions for seed and fallback handling. Test the code that production calls rather than substituting a general YAML parser result.

## Why does CRLF frontmatter delimiter change the contract?

A CRLF frontmatter delimiter changes the contract when one path strips metadata and another preserves or skips it. Callers may then store delimiter text as documentation, omit a catalog item, or show a correct fallback body for the same source.

For \`readSkillBody\`, failed matching does not signal failure. It returns \`content\`, so a test that only expects a nonempty result passes for both proper extraction and fallback. Assert that the returned body excludes \`name:\`, \`---\`, and other frontmatter lines.

For additional discovery, a failed frontmatter match executes \`continue\`. The candidate is absent from the returned array, and no local diagnostic records a line-ending cause. Test the output slug set, not merely that the seed task completes.

For fallback detail, a matching CRLF source should produce trimmed body text. The public \`getFallbackSkillDetail\` then assigns that value to \`fullDescription\`. A focused helper test is preferable if the private function is made testable, while one public integration case can verify wiring.

The contract question is whether QASkills accepts both conventional LF and CRLF files at every ingestion boundary. If yes, use a shared parser or an explicit line-break expression consistently. If no, reject unsupported input with a stable diagnostic rather than taking different silent fallbacks.

Do not fix only the opening marker. Every literal line-feed boundary in the expression must follow the same policy. A partial change can accept the header start but fail at the closing marker or body separator.

Retain raw source for diagnostics when possible. Showing escaped first-line endings such as \`"---\\r\\n"\` is clearer than saying the file looks normal. Avoid printing entire skill bodies in CI.

The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) can run matrix tests on Linux without hiding CRLF. Construct strings with escapes or write buffers explicitly, and prevent formatters from rewriting fixture files.

Use [published skill examples](/skills) only for manual rendering checks. Repository-owned synthetic fixtures are better for line-ending tests because their exact bytes and expected body are controlled.

## seed parser newline mismatch test matrix

The seed parser newline mismatch matrix must compare both seed expressions with fallback extraction. One outcome column should say "frontmatter found," another should say "body stripped," and a third should identify fallback behavior.

Start from a source with two frontmatter fields and a short Markdown body. Build it from line arrays so every separator is selected explicitly. Assert the resulting escaped prefix before evaluating any expression.

Terminal newline cases matter because \`readSkillBody\` expects a newline after the closing marker. A document ending at the closing marker has no body and fails that exact pattern. A body that exists without a final file newline can still match because the capture allows arbitrary final content.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| LF frontmatter | LF at all required boundaries | \`packages/web/src/db/seed.ts\` | Discovery matches and body extraction removes metadata |
| CRLF frontmatter | CRLF throughout the source | \`packages/web/src/lib/fallback-skill-detail.ts\` | Fallback expression strips metadata and returns body |
| CRLF in seed discovery | CRLF after opening delimiter | \`packages/web/src/db/seed.ts\` | Current discovery expression does not match the candidate |
| Mixed line endings | CRLF opening, LF closing boundary | Both modules | Record each expression's exact match and extracted value |
| Closing delimiter at EOF | No body separator after closing marker | Body extractors | Characterize fallback to complete source after trimming |
| Body without final newline | Valid delimiter boundary and body text | Both modules | Body remains available without requiring terminal newline |
| CR-only lines | Lone carriage returns | Both modules | Current optional-CR-plus-LF pattern does not claim support |

Do not reduce expected results to booleans when a helper has a fallback return. For extraction rows, compare the entire short expected body. For discovery rows, compare the exact parsed data or candidate presence.

Use one malformed delimiter control such as four hyphens. It should not match either custom expression. This proves a broad line-ending change did not weaken delimiter recognition.

Add frontmatter text containing three hyphens inside a quoted value. The lazy capture and required surrounding line breaks should prevent that text from acting as the closing boundary unless it occupies the expected line form. Keep this row only after basic newline cases pass.

The [seed parser regression article](/blog/seed-skill-catalog-parser-regression-tests) can extend the table to directory scanning. This article's matrix remains focused on line breaks and body boundaries.

Build the source from a short list of lines and a named join mark, then save both in the row. This makes the line break plain in the test and stops the host from picking it for you.

Give the body a rare word that does not occur in the head, then check for that word in the result. Also check that the name key is gone, since a full-source fall back can still hold the right body word.

For a mixed row, change one join mark at a time and keep all other joins the same as the LF base. The first failed row will then point to the one spot that the path could not read.

Use a short escaped view in the fail text, such as \`---\\r\\nname\`, and cap that view after a few lines. The team can see the bad mark at once without a long skill body in the log.

## How should cross-platform skill validation be verified?

Cross-platform skill validation should use explicit strings first and real temporary files second. The direct layer gives exact control, while the file layer proves encoding and path wiring without relying on the host's default newline style.

The first example mirrors the two verified expressions from \`packages/web/src/db/seed.ts\`. It characterizes the current difference and makes fallback-to-full-source visible. If the expressions move into exported helpers, point the same cases at production functions.

\`\`\`typescript
import { describe, expect, it } from 'vitest';

const seedBodyPattern = /^---\n[\s\S]*?\n---\n([\s\S]*)$/;
const seedFrontmatterPattern = /^---\n([\s\S]*?)\n---/;

const lf = ['---', 'name: Fixture', 'description: Valid fixture text', '---', '# Body'].join(
  '\n',
);
const crlf = ['---', 'name: Fixture', 'description: Valid fixture text', '---', '# Body'].join(
  '\r\n',
);

describe('seed newline expressions', () => {
  it('matches LF and exposes the current CRLF mismatch', () => {
    expect(lf.match(seedFrontmatterPattern)?.[1]).toContain('name: Fixture');
    expect(lf.match(seedBodyPattern)?.[1]).toBe('# Body');

    expect(crlf.match(seedFrontmatterPattern)).toBeNull();
    expect(crlf.match(seedBodyPattern)).toBeNull();
  });
});
\`\`\`

A copied regex can drift, so use this only as the initial characterization or export a production helper. The lasting test should import the same implementation used by seeding. That small refactor can preserve behavior before any compatibility change.

The second example covers the carriage-return-optional pattern in \`packages/web/src/lib/fallback-skill-detail.ts\`. It compares exact bodies for LF and CRLF, then keeps a mixed row visible.

\`\`\`typescript
import { describe, expect, it } from 'vitest';

const fallbackBodyPattern = /^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/;

function extractFallbackBody(markdown: string): string {
  const match = markdown.match(fallbackBodyPattern);
  return (match?.[1] ?? markdown).trim();
}

const lines = ['---', 'name: Fixture', 'description: Valid fixture text', '---', '## Body', 'Run it.'];

describe('fallback body line endings', () => {
  it.each([
    { name: 'LF', source: lines.join('\n') },
    { name: 'CRLF', source: lines.join('\r\n') },
  ])('strips $name frontmatter', ({ source }) => {
    expect(extractFallbackBody(source)).toBe('## Body\nRun it.'.replace('\n', source.includes('\r\n') ? '\r\n' : '\n'));
  });
});
\`\`\`

The body retains its internal separator because the helper trims only outside whitespace. If a canonical LF body is desired, that is another transformation and needs its own named assertion.

For file integration, write a \`Buffer.from(source, 'utf8')\` into a temporary directory. Read it with the same encoding and assert equality with the original runtime string before parsing. Clean up the directory after every row.

The [frontmatter round-trip guide](/blog/testing-skill-md-yaml-frontmatter-roundtrip) can help add writer cases. Keep byte preservation separate from semantic acceptance, since a parser may accept CRLF while a serializer intentionally emits LF.

Keep string tests close to the read helper and file tests close to the code that opens the path. The first group proves the match rule, while the next group proves that the same text reaches that rule from disk.

Write temp files from a byte buffer and name the row with its join style, not with the host OS. Read the file back and compare it with the source string before any body check can run.

Do not use one shared result for a strip test and a find test, since those calls answer two different needs. One must yield body text, while the other must yield a skill row with the right name.

If a private helper blocks a direct test, first move that helper to a small file with no change in its rule. Pin the old LF and CRLF results, then make the line break change in a second patch.

## LF CRLF regression matrix acceptance criteria

The LF CRLF regression matrix passes when every ingestion path has an explicit result for LF, CRLF, mixed, CR-only, and terminal-newline variants. Silent fallback must be asserted as content, not treated as successful extraction.

For the current branch, seed discovery should match the all-LF control and fail to match all-CRLF. Seed body extraction should strip the LF control and fall back to complete CRLF source. Fallback detail extraction should strip both all-LF and all-CRLF sources.

Those current results are characterization, not the preferred final policy. A compatibility patch can intentionally change them, but the review must update expected outcomes and explain whether old files gain support or become explicit errors.

Each case must record its separator construction. Names such as "Windows file" are too vague because editors can write LF on Windows and CRLF elsewhere. Use "all CRLF" or "CRLF opening with LF closing."

Acceptance requires exact extracted body comparisons. Check that frontmatter lines and delimiters are absent after a match. For fallback cases, check that they remain, proving the expression did not recognize the source.

Discovery tests need a stable diagnostic if the final policy rejects input. A skipped directory with no reason is hard to debug. If support is added instead, require the candidate's name, description, and arrays to match the LF control.

Do not use snapshots for temporary paths or complete seed output. Small strings, candidate slugs, and escaped line-break summaries provide clearer failures. Sort any directory-derived results before comparison.

Keep file encoding fixed at UTF-8. Byte-order marks and invalid byte sequences belong to different contracts. Combining them with newline rows would obscure which source transformation mattered.

SKILL.md CRLF parser compatibility should be verified on one host because fixtures carry their own separators. A small multi-OS CI sample can still detect toolchain rewriting, but operating-system coverage must not replace literal assertions.

The pass sheet should show one row for each path and line style, with a green mark only when the full result fits. A nonblank body is not enough when the head still sits at its top.

For the find path, list the slug and name that should be found, then check the full set after the scan. This catches a skipped file and an extra false match with the same small claim.

For the body path, check the first and last body lines plus the lack of all head keys. These checks stay clear when the body grows and do not tie the test to all prose in the file.

Keep a row with no last file break and a row with one last file break, since both are common on disk. The body should match the chosen rule in each case, and no tool should add a hidden line first.

## How do you test SKILL.md CRLF parser compatibility step by step?

Test SKILL.md CRLF parser compatibility by constructing exact strings, then walking each string through every relevant web path. Preserve current differences first, and only then switch the expected policy.

1. Read the two literal-LF expressions in \`packages/web/src/db/seed.ts\` and list every required boundary.
2. Read the carriage-return-optional expression in \`packages/web/src/lib/fallback-skill-detail.ts\`.
3. Build one line array containing valid frontmatter, a closing delimiter, and a distinctive body.
4. Join the array with LF, CRLF, and CR-only separators, then assert escaped prefixes and lengths.
5. Create mixed cases that alter opening, closing, and body boundaries independently.
6. Compare exact seed discovery, seed body, and fallback body outcomes for every row.
7. Add temporary UTF-8 file cases and prove decoded strings equal the generated sources.
8. Choose a shared acceptance or rejection policy, then update all path expectations together.
9. Run catalog ingestion and visible fallback rendering as narrow integration checks.

Begin without editing line endings on disk. String fixtures are immune to checkout settings and editor conversions. They also make a failed boundary easy to print as escaped text.

After direct tests pass, introduce temporary files to validate read behavior. Never call a platform newline helper when writing them. Such a helper would make expected separators depend on the CI host.

Then refactor duplicated expressions behind a shared function while preserving current results. This intermediate step separates code movement from behavior change. Reviewers can see whether later compatibility edits affect every caller.

If the chosen policy accepts both styles, update each required boundary consistently and keep CR-only rejected unless intentionally supported. If the policy requires LF, return a precise error or warning instead of full-source fallback or skipped discovery.

Run [CI validation patterns](/blog/validate-skill-md-in-ci-pipeline) after unit tests. A single seed directory and the fallback fixture are enough to prove wiring without reseeding a production database.

Run the LF base through all paths first and stop if one path cannot read it. This base proves the head keys, body text, temp path, and scan set are sound before CRLF adds one more cause.

Run the all-CRLF row next, then run mixed rows from the first join down to the body join. Keep that order in the report so the first red row maps to a clear spot in the source.

After each strip call, check body text and the lack of head keys in the same test. After each find call, check the full slug set, since a scan can both miss one file and add one bad row.

Save no temp file once its row ends, and use a fresh path for the next row. A stale LF file can make a CRLF scan pass when the code never read the file named by the case.

Use the [format guide](/blog/skill-md-format-guide) when a new head field joins the base file. Keep the body tag and line join checks the same, so the new field does not erase the old edge test.

## SKILL.md CRLF parser compatibility rollout and regression checks

Rollout should start by exporting or centralizing the current extraction logic without altering expected results. Direct tests can then import production code, eliminating duplicated regex oracles.

Next, choose one semantic result for supported files. Body extraction should return body only, discovery should return parsed metadata, and unsupported input should produce a clear diagnostic. A shared match does not require every caller to return the same data shape.

Review checkout and formatter settings for fixture directories. Text fixtures can be rewritten before tests run, which makes CRLF rows disappear. Escaped TypeScript strings or binary fixture generation avoid that risk.

Add one integration case for \`readFileSync(..., 'utf-8')\` and one for the fallback public function. Keep most combinations at the shared helper layer. This balances production wiring with fast, precise edge coverage.

Backward compatibility should inspect existing seed files at the current revision. Report observed separators instead of estimating usage. Do not claim a certain number of affected skills without a command result captured during the change.

Failure output should identify path, case, separator sequence, match status, and first unexpected line. Avoid printing credentials or complete external files. Synthetic fixtures contain enough information for diagnosis.

Rerun the matrix after parser replacement, frontmatter delimiter changes, seed discovery edits, serializer changes, or repository newline configuration updates. Each can alter the string presented to these expressions.

The [seed catalog parser guide](/blog/seed-skill-catalog-parser-regression-tests) can own broad directory assertions. Keep the line-ending matrix as its focused dependency so a catalog failure links back to one precise cause.

Once paths agree, retain the old mismatch rows as regression cases with new expected outcomes. They prove the defect class stays covered and explain why optional carriage returns or normalization exist.

Land the shared read helper with the old results first, then run all rows and save that green base. A later patch can change the CRLF rows on purpose while the LF rows show that code move did no harm.

If both join styles will pass, make the result text the same apart from line marks kept inside the body. Head keys, slug, name, and body trim should not depend on which join style the file used.

If LF alone will pass, make CRLF fail with one clear note at the first bad join. Do not skip the file or send the full source on as body, since both acts hide the cause from the user.

Scan the checked-in seed files and save their join style by path before the new rule is made strict. This is a fact from the current tree, and it gives the team a real list to fix with no guessed count.

Ask one review to focus on text results and one review to focus on file and scan paths. The split helps catch a sound match helper that was not wired into one of the live calls.

Add a small smoke check to [published skill tests](/skills) only after the local rows pass. The smoke check should read one known body, while the full line grid stays in fast repo tests.

At the close of the run, sort all case rows by path, join style, and first changed spot, then read the grid from top to foot. A gap in that grid means a path or text form was missed, so the suite should fail before it gives a pass claim.

Keep the old bad result in the case note beside the new good result for the first release that changes the rule. This lets the team see that seed scan, body strip, and fall back now agree for the same file, with no need to read the patch.

## Frequently Asked Questions

### What should Windows SKILL.md line endings tests assert?

They should assert literal CRLF sequences, decoded source equality, and each parser's exact output. Avoid relying on the host operating system or editor setting. A useful failure shows whether frontmatter matched, whether body text was stripped, and which required boundary contained an unexpected carriage return.

### How does CRLF frontmatter delimiter affect the SKILL.md contract?

The current seed regexes expect LF immediately after fixed delimiter text, so an intervening carriage return blocks matching. Fallback extraction explicitly allows that carriage return. As a result, the same source can be skipped, preserved whole, or stripped correctly depending on the path.

### Which fixture best exposes seed parser newline mismatch?

Use five short lines joined entirely with CRLF: opening delimiter, name, description, closing delimiter, and unique body text. Assert the raw escaped prefix first. The seed discovery match should currently be absent, while the fallback body expression should return only the unique body.

### When should teams check cross-platform skill validation?

Check it whenever file reading, frontmatter regexes, parser libraries, serializers, checkout settings, or formatters change. Also run it before accepting contributed skills from varied editors. Literal fixture construction keeps this check useful even when CI runs on only one operating system.

### What is the pass criterion for LF CRLF regression matrix?

Every supported separator pattern must produce identical semantic metadata and body across intended ingestion paths. Unsupported patterns must fail with a documented result rather than silent skipping. The matrix must also prove exact source separators, terminal-newline behavior, and no accidental conversion by fixture setup.

## Conclusion

SKILL.md CRLF parser compatibility requires path-specific assertions because current seed and fallback expressions do not agree. Literal LF regexes can skip discovery or preserve complete source, while the fallback helper accepts conventional LF and CRLF boundaries.

Build the escaped matrix, centralize parsing, and adopt one reviewed policy across callers. Inspect [skills](/skills) for the visible result, then use [how to publish](/how-to-publish) to verify line endings before a skill enters the catalog.`,
};
