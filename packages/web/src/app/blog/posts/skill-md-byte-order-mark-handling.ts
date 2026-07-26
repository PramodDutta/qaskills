import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md byte order mark handling Tests',
  description:
    'SKILL.md byte order mark handling: test a UTF-8 signature before frontmatter. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md byte order mark handling',
  keywords: [
    'SKILL.md byte order mark handling',
    'UTF-8 BOM frontmatter',
    'gray-matter BOM parsing',
    'SKILL.md encoding tests',
    'frontmatter delimiter not detected',
    'validator BOM regression',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'agent-skill-security-review-checklist',
    'how-to-publish-ai-agent-skill-directory',
  ],
  sources: ['https://github.com/jonschlinkert/gray-matter', 'https://nodejs.org/api/fs.html'],
  repoEvidence: [
    'packages/shared/src/parsers/skill-parser.ts',
    'packages/skill-validator/src/index.ts',
  ],
  content: `SKILL.md byte order mark handling should accept one UTF-8 BOM before the first frontmatter mark, return the same fields as a plain file, and keep the raw input for error text. Tests must cover both strings and real bytes while leaving a body \`U+FEFF\` untouched.

Current QASkills code sends the decoded string straight to gray-matter. The installed parser accepts a leading BOM, but repo code has no clear prefix branch, so tests must guard that result.

## What does SKILL.md byte order mark handling need to prove?

SKILL.md byte order mark handling must prove byte decode, first code point, delimiter match, parsed fields, raw-input use, validator result, and body marker result. A parser-only pass does not cover the file boundary.

The parser is \`packages/shared/src/parsers/skill-parser.ts\`. Its \`parseSkillMd\` function passes the complete string to \`matter(raw)\`, copies selected data fields, trims body content, and returns the raw argument in \`ParsedSkill.raw\`.

The file boundary is \`packages/skill-validator/src/index.ts\`. Its \`validateSkillFile\` resolves the path, reads with \`'utf-8'\`, and gives the resulting string to \`validateSkillContent\`, which then calls the shared parser.

Keep byte facts and text facts in separate assertions: the disk case should prove the first three bytes, the decoded case should prove the first code point, and the parser case should prove the first delimiter and copied fields. This chain shows exactly where a marker was kept or removed, and it stops a successful final boolean from hiding a decoder change, a missed header, or a parser default.

Neither QASkills file checks \`raw.charCodeAt(0) === 0xfeff\` or slices the first character. So any leading-BOM support comes from the parser result, not a clear app rule.

A verified current test against the current workspace shows one leading \`\\uFEFF\` produces the same copied frontmatter as the no-marker control. The returned \`raw\` still points to the raw string, so its first code point remains available.

That result should be locked at two levels. A shared-package test supplies an escaped JavaScript string. A file-level test writes the exact bytes \`EF BB BF\` before an otherwise valid UTF-8 document.

Build both levels from one ASCII control string and derive the marked form in test code, then compare every named field and each body code point rather than keeping two hand-written YAML files. The shared base keeps field order, body text, and final newline the same, so the only added data is the marker and any failed check points to the byte boundary under test.

The official [gray-matter repo](https://github.com/jonschlinkert/gray-matter) documents parsing into \`data\` and \`content\`, with YAML as the default language. It does not make the QASkills acceptance rule, so local tests remain the operative evidence for BOM result.

Use the [SKILL.md format guide](/blog/skill-md-format-guide) to keep fields and body valid. This article changes only the byte rule prefix, avoiding confusion with malformed YAML or missing required arrays.

Run both boundaries through the [CI check guide](/blog/validate-skill-md-in-ci-pipeline). A parser package update can change parser result even when neither cited QASkills file changes.

## UTF-8 BOM frontmatter: current repository behavior

UTF-8 BOM header starts with three bytes, \`0xef 0xbb 0xbf\`, before the first ASCII hyphen. Decoding those bytes as UTF-8 yields one \`U+FEFF\` code point followed by the opening \`---\`.

The approved [Node file system docs](https://nodejs.org/api/fs.html) state that \`readFile\` returns a string when an encoding is supplied. QASkills supplies \`utf-8\`; a byte-level test should assert the resulting first code point rather than assume the BOM vanished during reading.

After decoding, \`validateSkillContent\` receives the same JavaScript string a direct caller could provide. It does not alter the prefix before calling \`parseSkillMd\`. This makes direct and file fixtures comparable.

With the current parser package set, gray-matter recognizes the delimiter after one leading \`U+FEFF\`. The parser copies the expected \`name\`, \`description\`, \`version\`, \`author\`, \`license\`, testing types, and languages.

The body result should equal the no-marker control. The raw result should not: its first code point remains \`0xfeff\` because \`parseSkillMd\` returns the raw argument rather than gray-matter's body source.

The validator then applies the normal shared schema. A complete valid fixture remains \`valid: true\` and should have no header errors. This is current baseline, not proof that QASkills explicitly strips a BOM.

Do not compare only \`valid\`. A parser package could skip header, then defaults and schema result might create a different error set. Assert named fields and body text before the final validator result.

An empty or short body can introduce unrelated content warnings. Give the control enough instructions so the BOM test reports only byte rule result. Keep the full file below line and token warning boundaries too.

Read the same marked file once as a \`Buffer\` and once as UTF-8 text, then assert the buffer starts with \`ef bb bf\`, the text starts with code point \`feff\`, and the text after that point matches the plain control. This paired read proves Node did not drop the marker before QASkills ran, while the later parser comparison proves whether frontmatter support came from gray-matter or from a future app rule.

Browse [QASkills skills](/skills) for plain controls, but generate the BOM bytes in test code. Editors can silently remove or add a BOM when fixtures are stored as opaque files.

## Why does gray-matter BOM parsing change the contract?

Gray-matter BOM parsing changes the contract because QASkills delegates delimiter recognition to a parser package. A parser package upgrade can alter accepted prefixes without any direct parser diff in this repo.

The shared parser does not catch errors around \`matter(raw)\`. A thrown parser error becomes the validator's generic header failure inside \`validateSkillContent\`. A non-throwing missed delimiter can instead produce empty copied fields and later schema issues.

Those outcomes need different assertions. One indicates parser failure. The other indicates that the document was treated as body text, so required header fields were absent after parser fallbacks.

A leading \`U+FEFF\` has special byte meaning at the start of a decoded file. The same code point inside instructions is content. A global \`.replace(/\\uFEFF/g, '')\` would erase body data and exceed the intended rule.

If QASkills chooses an explicit prefix rule, strip at most one code point at offset zero before calling gray-matter. Keep the raw string apart, and pass only the normalized parse input to the parser package.

Place one marker between two short body words, one just before the final body word, and one after a line break but never at index zero, then assert each code point remains in the parsed body. These cases prove the rule checks only the first input point, and they catch a broad replace, a per-line strip, or a trim step that removes valid inner text.

That proposed branch would make app rule independent of undocumented parser package handling. However, it changes current implementation and must not be described as shipped until the parser contains it.

Multiple leading markers need a declared outcome. Accepting exactly one and rejecting or characterizing a second marker is easier to explain than repeatedly stripping arbitrary prefixes. Add that case before implementing strip rule.

For the two-marker case, record the first two code points, gray-matter data, body, raw text, schema issues, and final result in the current suite before choosing a target policy. If an explicit rule later strips one marker, the second must still reach the parser or a clear rejection path; silently removing both would make the app rule wider than the stated one-marker contract.

Whitespace before a BOM is another distinct input. A UTF-8 BOM belongs at the beginning of the byte stream, so \`space + U+FEFF + ---\` should not silently receive the same rule unless maintainers choose it.

The [agent skill security checklist](/blog/agent-skill-security-review-checklist) can review canonical input handling. Repo evidence supports a compatibility concern, not a claim of harmful content or exploitation.

SKILL.md byte order mark handling should preserve parser-specific evidence in failure reports. State the escaped prefix, whether the delimiter was found, and which layer returned the first unexpected result.

## SKILL.md encoding tests test matrix

SKILL.md encoding tests need a byte control, an in-memory control, and a body-marker case. Each row should assert parser fields and raw prefix, not only a final boolean.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| No BOM | ASCII \`---\` at byte zero | \`packages/shared/src/parsers/skill-parser.ts\` | Metadata and body match the valid control |
| Escaped leading marker | \`\\uFEFF + raw\` in memory | Shared parser | Current dependency finds frontmatter; returned raw keeps marker |
| Real UTF-8 signature | \`EF BB BF\` before delimiter | \`packages/skill-validator/src/index.ts\` | UTF-8 read yields marker and validation matches control |
| Internal marker | \`before\\uFEFFafter\` in body | Parser and validator | Internal code point remains in parsed body |
| Two markers | \`\\uFEFF\\uFEFF + raw\` | Characterization boundary | Record exact current outcome before selecting policy |
| Ordinary prefix | \`x + raw\` | Delimiter-miss control | Must not be treated as equivalent to a UTF-8 signature |

The no-marker row establishes each expected field and body value. Derive all comparisons from that control instead of repeating literals, then check the raw values differ only by the intended prefix.

The escaped row tests gray-matter integration without disk result. Assert \`parsed.raw.charCodeAt(0) === 0xfeff\`, exact header match, and body match with the control.

The byte row should create a \`Buffer\` from clear hex bytes and the UTF-8 control. Read it back with the same byte rule as \`validateSkillFile\`, assert its first code point, then call the repo function.

Make the file case write into a new temp folder, read the bytes back before validation, and remove the folder in a \`finally\` block, with the byte length and first four bytes shown in any failure label. That setup proves the test runner did not rewrite the file and gives reviewers visible proof of the marker plus the first hyphen without checking in a source file whose hidden prefix an editor may change.

Place the body marker between visible body words. The parser calls \`content.trim()\`, and JavaScript trimming can remove an edge marker. A middle position proves no global removal occurs without conflating edge trimming.

Two markers and a plain prefix are diagnostic controls. Their exact current results can depend on parser result, so run and record them before writing target rule. Do not infer them from the single-marker result.

Use [how to publish](/how-to-publish) for one real byte fixture after local cases pass. Confirm upload, check, and rendered instructions agree on the accepted leading BOM.

SKILL.md byte order mark handling passes the matrix when a single leading marker is equivalent for parsed data, yet remains visible in raw evidence. Body data must not be removed by prefix rule.

## How should frontmatter delimiter not detected be verified?

Frontmatter delimiter not detected should be verified with a known valid control, one supported leading BOM, and one plain leading character. Compare copied fields before checking schema errors.

The direct parser example uses only ASCII source text. JavaScript evaluates \`\\uFEFF\` at runtime, so the fixture contains the real code point without saving non-ASCII bytes in the test file.

\`\`\`typescript
import { expect, it } from 'vitest';
import { parseSkillMd } from '../src/parsers/skill-parser';

const valid = [
  '---',
  'name: bom-checks',
  'description: Checks UTF-8 signature behavior before frontmatter.',
  'version: 1.0.0',
  'author: qa-team',
  'license: MIT',
  'testingTypes: [validation]',
  'languages: [typescript]',
  '---',
  '',
  'Follow each encoding check and report the exact parsed result.',
].join('\\n');

it('characterizes one leading U+FEFF', () => {
  const plain = parseSkillMd(valid);
  const markedInput = '\\uFEFF' + valid;
  const marked = parseSkillMd(markedInput);

  expect(marked.frontmatter).toEqual(plain.frontmatter);
  expect(marked.content).toBe(plain.content);
  expect(marked.raw).toBe(markedInput);
  expect(marked.raw.charCodeAt(0)).toBe(0xfeff);
});
\`\`\`

Add the plain-prefix control beside this test. Prepend \`x\`, call \`parseSkillMd\`, and assert its copied name differs from the valid control. That proves the test is measuring special prefix handling rather than accepting any text before \`---\`.

The file-level example writes an actual UTF-8 BOM. It reads the file once for a fixture control, then calls \`validateSkillFile\` from \`packages/skill-validator/src/index.ts\`.

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

it('validates real EF BB BF bytes before frontmatter', async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-bom-'));
  const file = path.join(directory, 'SKILL.md');
  const signature = Buffer.from([0xef, 0xbb, 0xbf]);
  const bytes = Buffer.concat([signature, Buffer.from(valid, 'utf8')]);
  await fs.writeFile(file, bytes);

  const decoded = await fs.readFile(file, 'utf8');
  expect(decoded.charCodeAt(0)).toBe(0xfeff);

  const result = await validateSkillFile(file);
  expect(result.valid).toBe(true);
  expect(result.errors).toEqual([]);
});
\`\`\`

The file-level test needs a body over one hundred characters if it asserts no warnings. This example asserts only errors and validity, keeping unrelated advice outside the byte-test oracle.

Add a body marker case to the shared parser suite. Use \`Body before\\uFEFFafter body\`, then assert the parsed content includes code point \`0xfeff\` at the expected middle index.

If maintainers add clear prefix removal, test \`ParsedSkill.raw\` and parsed data apart. Raw should retain raw evidence, while the string passed into gray-matter begins with \`---\`.

Run both blocks in the [CI check workflow](/blog/validate-skill-md-in-ci-pipeline). Parser package updates should trigger these tests even when app source remains unchanged.

## validator BOM regression acceptance criteria

File check BOM regression acceptance criteria should define one leading UTF-8 BOM as compatible with an otherwise valid SKILL.md. Parsed header, parsed body, schema result, warnings, and quality output should match the no-marker control.

The raw field is the intentional exception. It should preserve the raw decoded input so error text, hashing, and byte investigations can identify the prefix. Tests must compare parsed and raw representations apart.

A body \`U+FEFF\` must remain content. Prefix strip rules should inspect only index zero and remove no later code point. The body fixture belongs in each regression suite.

The rule must state what happens for two markers, whitespace before the marker, and marker-like bytes under another byte rule. QASkills currently requests UTF-8, so invalid byte handling should be tested at the decoder boundary if supported.

Do not describe each missing field after a delimiter miss as invalid metadata. The more useful diagnostic is that opening header was not recognized. Tests can assert a stable parser or header reason after such a message is implemented.

An explicit strip rule should preserve hash semantics. A content hash over raw file bytes differs between marked and unmarked documents, even when parsed content matches. State whether package identity uses raw bytes, normalized text, or both.

Use two named digests in tests if both views matter: one over the exact file bytes and one over the chosen normalized parse input, with no claim that equal parsed fields make the raw files the same. The marked and plain controls should have different raw hashes, while any normalized hash may match only if the app has defined that view and the test can rebuild it from the stated prefix rule.

The [SKILL.md format guide](/blog/skill-md-format-guide) should show the opening delimiter at the logical start of text and document accepted UTF-8 signatures. Avoid embedding an invisible marker in a copied example.

The current test should remain next to target cases. It proves the parser package accepts one marker today and prevents a proposed app branch from being misreported as existing result.

SKILL.md byte order mark handling is complete when direct strings, real files, raw evidence, and body content follow one written rule. No assertion should depend on an invisible snapshot alone.

## How do you test SKILL.md byte order mark handling step by step?

Test SKILL.md byte order mark handling by controlling bytes first, then comparing parser and validator outputs with a plain document. Escaped error text makes each invisible input reviewable.

1. Read \`packages/shared/src/parsers/skill-parser.ts\` and \`packages/skill-validator/src/index.ts\`, recording the direct gray-matter call, raw return value, UTF-8 read, and validation order.
2. Build one valid ASCII SKILL.md control with complete metadata and enough body text for stable validator behavior.
3. Create isolated inputs for no marker, one escaped leading marker, real \`EF BB BF\` bytes, an internal marker, two markers, and an ordinary leading character.
4. Assert decoded first code points, parsed metadata, body text, raw preservation, schema errors, and final validity against the control.
5. Add target-policy assertions for explicit single-prefix normalization, internal preservation, unsupported prefixes, and a stable delimiter diagnostic.
6. Run parser and file cases in CI, then verify one real package through the author workflow before release.

Step one identifies delegation. QASkills currently has no BOM-specific branch, so parser result is part of the observed contract and deserves a regression test.

Step two keeps YAML and schema failures out of the byte rule result. Use plain ASCII values, required arrays, and a body whose expected text is exact.

Step three should build the byte fixture in code. Do not rely on an editor setting or repo checkout to preserve an invisible BOM correctly.

Step four compares intermediate output. A final \`valid\` boolean cannot tell whether gray-matter recognized the delimiter or defaults happened to mask a field.

Step five remains proposed until production code changes. If clear prefix rule is unnecessary, document parser package support and keep the current test instead of adding redundant transforms.

Finish through [how to publish](/how-to-publish). Confirm the accepted file produces the same visible skill as its unmarked control, while raw download and artifact hashing follow the documented byte rule.

## SKILL.md byte order mark handling rollout and regression checks

Roll out SKILL.md byte order mark handling tests before changing parsing. Land the no-marker, single-marker, byte-level, and body-marker current baseline as one parser package safety net.

Shared-parser owners should decide whether to rely on gray-matter or normalize explicitly. File check owners should own the file-byte fixture. Artifact owners should review whether raw and normalized hashes need separate labels.

The minimum suite includes direct plain and marked strings, a real UTF-8 BOM, a body marker, two leading markers, a plain prefix, and a valid author-flow package. Keep all test source ASCII with escapes or hex bytes.

If an explicit prefix rule ships, retain \`ParsedSkill.raw\` unchanged. Add a \`parseInput\` variable rather than overwriting the evidence string, then test both values through observable results.

Parser package updates need focused review. Read the gray-matter release notes, run the matrix, and compare exact fields and content. Do not approve only because the final validator still reports success.

The [publication overview](/blog/how-to-publish-ai-agent-skill-directory) can explain accepted byte rule without asking authors to insert a BOM. Compatibility support and recommended file output are separate decisions.

Hash and cache tests should include marked and unmarked bytes. Equal parsed instructions can still produce different raw digests, ETags, or storage sizes. Choose those semantics before deduplicating artifacts.

Send both controls through any cache or artifact key path in a test and assert the key follows the chosen raw or normalized rule, then repeat the request to prove the same bytes return the same key. This case keeps parser compatibility apart from file identity, and it prevents a later cache cleanup from merging distinct raw files merely because their shown fields and body text happen to match.

Use the [agent skill security checklist](/blog/agent-skill-security-review-checklist) to review hidden-prefix error text and logs. Keep claims limited to verified parsing and byte result.

After Node, gray-matter, parser, file check, uploader, or artifact changes, rerun each case. SKILL.md byte order mark handling remains stable only when bytes, parsed values, raw evidence, and delivery agree.

## Frequently Asked Questions

### What should UTF-8 BOM frontmatter tests assert?

Assert the exact BOM bytes, decoded first code point, header match with a plain control, body match, preserved raw prefix, and final validator result. Use escapes or hex buffers so reviewers can see the fixture. Do not infer support from a successful boolean alone.

### How does gray-matter BOM parsing affect the SKILL.md contract?

QASkills sends the full decoded string directly to gray-matter, so its delimiter handling affects accepted files. The current parser package accepts one leading marker in current test. Keep that test across upgrades, or add a clear app prefix rule while retaining the untouched raw input.

### Which fixture best exposes SKILL.md encoding tests?

Write \`Buffer.from([0xef, 0xbb, 0xbf])\` before a complete ASCII SKILL.md, then read and validate the real file. Pair it with the same bytes without the BOM and a middle-body \`\\uFEFF\`. Those visible controls separate decoder, parser, byte-boundary, and global-removal mistakes in CI.

### When should teams check frontmatter delimiter not detected?

Check it after parser, gray-matter, Node, file upload, decoding, or strip rule changes. Include a valid plain control, one accepted leading BOM, and a plain leading character. Compare parsed fields before schema error text so a delimiter miss cannot be mislabeled as several unrelated field failures.

### What is the pass criterion for validator BOM regression?

One leading UTF-8 BOM must produce the same parsed fields, body, and check result as the unmarked control. Raw evidence keeps the marker, body markers remain content, and unsupported prefixes receive documented outcomes. Byte-level and direct-string tests must agree in supported environments.

## Conclusion

SKILL.md byte order mark handling currently depends on gray-matter recognizing a leading \`U+FEFF\`, while QASkills preserves the raw string and validates parsed fields as usual. Add direct and real-byte tests before considering a clear prefix branch.

Open the [QASkills skills directory](/skills), inspect a published SKILL.md, then use [how to publish](/how-to-publish) to apply this encoding contract before publication. Run the plain, marked, and inner-marker controls in one release job so parsed equality and raw-byte differences stay visible together.`,
};
