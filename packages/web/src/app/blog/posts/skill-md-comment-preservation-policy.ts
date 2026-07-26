import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md comment preservation policy Guide',
  description:
    'SKILL.md comment preservation policy: define what serialization keeps and discards. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md comment preservation policy',
  keywords: [
    'SKILL.md comment preservation policy',
    'frontmatter comment loss',
    'YAML comment round trip',
    'SKILL.md source fidelity',
    'serializer comment policy',
    'raw metadata preservation',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'testing-skill-md-yaml-frontmatter-roundtrip',
    'malformed-skill-md-frontmatter-parser-tests',
    'validate-skill-md-in-ci-pipeline',
  ],
  sources: ['https://yaml.org/spec/1.2.2/', 'https://github.com/jonschlinkert/gray-matter'],
  repoEvidence: [
    'packages/shared/src/parsers/skill-parser.ts',
    'packages/shared/src/types/skill.ts',
  ],
  content: `SKILL.md comment preservation policy should state that successful parsing keeps YAML comments only inside the returned raw source string. Parsed fields have no comment slots, and \`serializeSkillMd\` rebuilds supported YAML without comments. Therefore, parse-and-serialize preserves selected meaning but does not preserve YAML comments or original formatting.

The recoverable source remains available only while callers retain \`ParsedSkill.raw\`. Tests should compare field values, serialized output, and raw text as separate contracts.

## What does SKILL.md comment preservation policy need to prove?

SKILL.md comment preservation policy must prove which output still contains each source comment after parsing and a write. It should cover top-level comments, inline scalar comments, list-item comments, comment-like text inside quotes, and exact recovery from the raw field.

The parser implementation is \`packages/shared/src/parsers/skill-parser.ts\`. It calls gray-matter, selects known field values into \`SkillFrontmatter\`, trims body content, and returns the untouched input string as \`raw\`.

The same file defines \`serializeSkillMd\`. That function builds a new array of YAML lines from supported YAML fields, filters empty entries, joins them with LF, and appends the supplied content.

No serializer input represents a comment, quote style, indentation choice, key order, or blank YAML line. Tests should therefore expect those presentation details to be absent from regenerated text.

The type evidence in \`packages/shared/src/types/skill.ts\` supports the split. \`ParsedSkill\` contains parsed fields, normalized content, and raw source, but it contains no syntax tree or comment collection.

Keep this suite narrower than [YAML round-trip tests](/blog/testing-skill-md-yaml-frontmatter-roundtrip). General round trips can prove supported values survive, while comment policy tests prove presentation text survives only through the raw view.

Start with a no-comment control. Parse it, assert expected fields, serialize the parsed values, and confirm the new text can parse to equivalent supported fields.

Then add one comment placement per fixture. Multiple comments in a single file make it harder to identify whether a parser rule, quote rule, or write branch caused a failure.

A top-level YAML comment occupies its own line between delimiters. It should remain in \`parsed.raw\` and should not appear in output from the current serializer.

An inline scalar comment follows an unquoted value. Parsed fields should contain only the scalar value, while raw text should retain the full source line.

A list-item comment can appear after one array member. QASkills should expose the resolved list values, and the writer should emit its own list without the source comment.

Quoted text containing a hash is not a comment. Include that control so a scanner or weak string assertion does not remove meaningful text merely because it contains \`#\`.

The [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/) distinguishes comments from scalar content. Use valid placements from that source, then rely on repository behavior for the QASkills output contract.

The [gray-matter project](https://github.com/jonschlinkert/gray-matter) provides the parsed data and content split used by the wrapper. QASkills still owns the selected object, raw return, and manual serializer behavior tested here.

Use the [SKILL.md format guide](/blog/skill-md-format-guide) to keep surrounding fields valid. Comments should be the only meaningful variation across fixtures.

## frontmatter comment loss: current repository behavior

YAML comment loss occurs when callers parse known fields and then create a new document with \`serializeSkillMd\`. The serializer has no parameter through which an original YAML comment could return.

This loss does not happen to \`ParsedSkill.raw\` on a successful parse. That field receives the original input string directly, so comments and formatting remain observable there.

The two outcomes are compatible because they serve different needs. The write step emits a stable supported form, while raw source retention supports exact inspection or archival use.

Do not compare serialized output with raw source and call every difference a parser defect. The serializer intentionally chooses its own quotes, list layout, field order, line endings, and final newline.

Instead, compare parsed supported values before and after write. That field test should pass even though a direct source equality test fails when comments exist.

For each comment fixture, make three assertions. First, \`parsed.raw\` equals input; second, the intended field value is correct; third, serialized text does not contain the comment marker or comment phrase.

Use distinctive comment phrases that cannot appear in another field. A broad assertion such as \`not.toContain('#')\` would fail valid quoted hashes and Markdown headings in the body.

Keep comments in YAML for this matrix. Markdown body comments have different syntax and are passed through the content argument rather than rebuilt as YAML.

If supplied body content contains ordinary Markdown text with a hash, the serializer appends that content. That behavior should not be mistaken for YAML comment preservation.

Raw retention depends on successful parsing. If invalid YAML throws before \`ParsedSkill\` exists, higher-level error handling must keep the original source separately.

Cover parse failures in [malformed YAML tests](/blog/malformed-skill-md-frontmatter-parser-tests). This policy should not promise a raw result from a function call that throws.

Unknown YAML keys also illustrate source-only information. They can remain in raw text but are not included in the selected \`SkillFrontmatter\` object or current serialized output.

Use exact source strings in tests rather than snapshots generated after parsing. A generated snapshot could already omit comments and make the expected data depend on the behavior under test.

Run a focused comment matrix beside [CI validation](/blog/validate-skill-md-in-ci-pipeline). Its report should name placement, field value, raw retention, and serialized retention as separate columns.

## Why does YAML comment round trip change the contract?

YAML comment round trip changes the contract because comments often carry author context without affecting parsed data. A field round trip can pass while review notes, ownership hints, and maintenance explanations disappear from regenerated source.

The current API can protect either goal if callers choose the correct representation. Keep \`raw\` for exact source, or serialize supported values for a normalized document.

It cannot edit one field and automatically preserve surrounding source presentation. That operation needs a comment-aware concrete syntax representation or a carefully scoped source edit.

Do not promise comment-preserving edits through \`serializeSkillMd\`. The cited function accepts only \`SkillFrontmatter\` and body content, so no original comment locations reach it.

A tool that merely needs to validate should avoid the write step. It can parse, inspect the result, and leave the original file unchanged.

A formatter should disclose that it rewrites YAML. Before saving, it can show a diff that includes removed comments, changed quotes, reordered keys, and normalized lists.

An editor that must preserve comments needs another design. It may retain a syntax tree with comment tokens or patch only a known scalar span in the raw source.

Either approach needs failure tests for duplicate keys, anchors, quoted hashes, multiline scalars, and comments near delimiters. A regular expression over lines is not enough for general YAML editing.

The current raw field is useful input to such future tooling, but it is not itself an editable syntax tree. Callers must still locate and update nodes without damaging valid source.

Keep raw and parsed versions together if an approval workflow requires a diff. Record the original source, requested field change, generated candidate, and author decision.

Avoid logging comments automatically. They may contain internal context that was never intended for analytics or public error reports.

Use [published skills](/skills) only for measured compatibility scans. Do not state how commonly authors use comments without inspecting the selected source revision.

The contract should prefer precise verbs. Parsing retains raw comment text, field parsing omits comment nodes, and the current writer emits no original YAML comments.

That wording avoids implying that gray-matter destroys the caller's string. The original input remains available in \`ParsedSkill.raw\` when parsing succeeds.

## SKILL.md source fidelity test matrix

The SKILL.md source fidelity matrix should compare comment placement against raw text, field values, and regenerated YAML. It should also include a quoted hash control so comment detection does not overreach.

| Case | Input or boundary | Raw source assertion | Serialized assertion |
|---|---|---|---|
| No comments | Plain valid YAML | Raw equals input exactly. | Supported fields round trip in normalized form |
| Top-level comment | Own line after opening delimiter | Raw retains the full comment line. | Original comment phrase is absent |
| Inline scalar comment | Comment after author value | Raw retains spacing and comment text. | Author value remains, while comment text is absent |
| List-item comment | Comment after one language item | Raw retains the item line. | List values remain, while comment text is absent |
| Quoted hash | Hash inside a quoted description | Raw retains exact quotes and hash. | Scalar value still contains the hash as data |
| Raw source recovery | Multiple valid presentation details | \`raw\` reproduces the input string. | Serializer output is not used as recovery |

Keep each expected comment phrase unique. Assertions can then search for the phrase rather than treating every hash as a comment marker.

The no-comment control proves the fixture and field oracle work. It should parse before any comment row and should serialize into another parseable skill.

For the top-level comment, assert no field value changes. This shows the comment is presentation context rather than a hidden field.

For an inline scalar, choose an unquoted value that remains clear before the comment. Then assert the exact parsed scalar and the full raw line.

For a list item, use two values and comment only one. Both values should survive field parsing and normalized write.

For the quoted hash, assert the hash remains in the parsed description. A policy that strips text after every hash would fail this control and damage valid fields.

The raw recovery row should compare the whole source string, including line endings and trailing spaces. Do not rebuild expected text from parsed fields.

Serialized output should be parsed again and compared by supported fields. Direct string equality is not an expected property of the current manual serializer.

Keep body content simple and stable. YAML comments are the target, while Markdown source preservation has a separate path through the content argument.

Add the matrix to [round-trip guidance](/blog/testing-skill-md-yaml-frontmatter-roundtrip) as a presentation-policy companion. Field and lexical expectations should be visible beside each other.

Use one small file to walk through a read-only check; put a note above the name, one note by the author, and one note by a list item. Add a quoted hash in the field text as well; this sign looks like a note mark, but the quotes make it part of the field value.

Save the source as a fixed string and call the parser once; the first check should match all source text with \`raw\`, down to each space and line break. Next, check the name, author, field text, and list; the note words should not be part of those values, while the quoted hash must stay in its field.

At this point, a read-only tool can stop; it has the facts it needs and can report pass or fail without writing a new file. That stop point is the best way to keep notes; the source is never rebuilt, so the raw match need not guard a later save.

Run the write path in a second test; pass the field map and body to the current writer, then store the new text in a new variable. The new YAML should have the known keys in the writer's set order; it should use the writer's quote and list form, not the source style.

Look for each note by its own short phrase; none of those phrases should be in the new YAML, since no note data reached the write call. Look for the quoted hash text on its own; that field value should still hold the hash, even though its old quote style may not be kept.

Parse the new text and check the known fields once more; they should match the first field map, which proves value keep despite source style loss. Check the body too, but keep its aim clear; the writer gets parsed body text, so outer trim may have taken place before the body is put back.

Do not compare the new text with the old raw text and call the diff a fail; a source match is not part of the current writer's stated inputs. Show the diff to a user if a real tool plans to save it; lost notes, new quotes, key order, and list shape are facts the user may care about.

If the user says no, keep the old file with no change; the tool should not use a parse pass as leave to swap in its own YAML form. If the user says yes, write the new file and make the loss plain in the change view; the saved file is a new form with the same known field values.

For an edit that must keep notes, the current writer is not enough. The tool needs a YAML tree that tracks notes or a safe patch at the right source span.

A line scan is not a safe broad fix. A hash can sit in quotes, a value can span lines, and the same key text can show up in the body.

Test any new patch tool with a note near each key it can edit. Also test quotes, blank lines, list notes, and a hash that is plain field data.

Keep a case with an extra key that QASkills does not map. A broad rewrite will drop that key too, while raw source will still show it after the first parse.

This extra-key case helps a move tool test for data loss. The tool can warn before write, even though the main field map has no slot for the key.

Do not print note text in a shared log when a check fails. The case name and first diff spot are enough to guide a local review.

The same care applies on parse fail. The caller may keep the source for a local error view, but it should not send all raw text to a wide log.

Review the two modes as distinct tools. Read mode can keep source by not writing, while rewrite mode must tell users that notes and style will change.

This worked case turns a vague keep claim into three checks. Raw text keeps source, parsed fields keep known values, and current write output drops source notes.

## How should serializer comment policy be verified?

Serializer comment policy should be verified by retaining one source string, parsing it, and comparing raw, field, and serialized views. The first example demonstrates a top-level comment, inline comment, list comment, and quoted hash.

\`\`\`typescript
import { expect, it } from 'vitest';
import { parseSkillMd, serializeSkillMd } from '@qaskills/shared';

const source = \`---
# review-owner: qa-platform
name: Comment Probe
description: "Checks # as scalar data"
version: 1.0.0
author: qa-team # source owner
license: MIT
testingTypes: [unit]
languages:
  - typescript # primary implementation
---

## Instructions

Run the focused checks.
\`;

it('keeps comments only through raw source', () => {
  const parsed = parseSkillMd(source);
  const serialized = serializeSkillMd(parsed.frontmatter, parsed.content);

  expect(parsed.raw).toBe(source);
  expect(parsed.frontmatter.author).toBe('qa-team');
  expect(parsed.frontmatter.description).toBe('Checks # as scalar data');
  expect(parsed.frontmatter.languages).toEqual(['typescript']);

  expect(serialized).not.toContain('review-owner');
  expect(serialized).not.toContain('source owner');
  expect(serialized).not.toContain('primary implementation');
  expect(serialized).toContain('Checks # as scalar data');
});
\`\`\`

The quoted hash assertion protects scalar data. Each comment assertion uses a unique phrase, so body headings or hashes cannot create false failures.

The second example makes the field round trip explicit. It compares supported fields and normalized content rather than original source spelling.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { parseSkillMd, serializeSkillMd } from '@qaskills/shared';

describe('comment presentation versus supported semantics', () => {
  it.each([
    ['top-level', '# catalog note\\nname: Comment Probe'],
    ['inline scalar', 'name: Comment Probe # visible note'],
    ['list item', 'languages:\\n  - typescript # selected language'],
  ])('normalizes the %s case', (_name, changedFragment) => {
    const sourceWithComment = baselineSource.replace(sourceFragment, changedFragment);
    const first = parseSkillMd(sourceWithComment);
    const serialized = serializeSkillMd(first.frontmatter, first.content);
    const second = parseSkillMd(serialized);

    expect(first.raw).toBe(sourceWithComment);
    expect(second.frontmatter).toEqual(first.frontmatter);
    expect(second.content).toBe(first.content);
    expect(serialized).not.toContain('# visible note');
    expect(serialized).not.toContain('# selected language');
    expect(serialized).not.toContain('# catalog note');
  });
});
\`\`\`

Define \`baselineSource\` and \`sourceFragment\` in a local fixture module with one valid document. Assert each replacement occurs once so a test cannot pass with an unchanged source.

The top-level replacement must remain inside YAML. A comment inserted before the opening delimiter may be interpreted as body content or prevent YAML detection, which tests another rule.

Do not inspect gray-matter's internal object for undocumented comment tokens. The QASkills public result and serializer inputs are enough to prove the current contract.

If comment-preserving write is proposed later, keep these characterization tests until the new behavior ships. Then change expected serialized assertions with a reviewed migration note.

Run one command-level check through [how to publish](/how-to-publish). Validation should not rewrite the source file merely to inspect its fields, so comments remain untouched in a normal read-only workflow.

## raw metadata preservation acceptance criteria

Raw source preservation passes when successful parsing returns exact input text and no field operation is mistaken for source recovery. The raw field is the only cited QASkills representation that contains original YAML comments.

Every comment placement must remain present in \`parsed.raw\`. Whole-string equality is stronger and simpler than one assertion per phrase.

Every supported field value must parse correctly around comments. A retained raw string is not enough if inline syntax changes the resolved author, language, or description.

Every writer case must emit a parseable supported document. The absence of original comments should be an expected presentation result, not a parse failure.

The second parse should match supported fields and normalized body content from the first parse. It should not match raw source text when the first source used comments or custom formatting.

Quoted hashes must remain scalar data. Tests that identify comments by deleting text after any hash should fail this control.

Unknown YAML keys should remain recoverable through raw text even though the selected field object omits them. Add a separate row if future migrations depend on that property.

Malformed YAML does not produce a successful \`ParsedSkill\`. A caller that needs source recovery after failure must retain its input outside the parser and apply appropriate privacy controls.

The writer must not be used as a hidden save step during validation. Read-only validation can parse and report results without replacing author source.

Any formatter or editor that uses the writer should preview a diff. Removed comments and normalized formatting are user-visible changes even when field validation still passes.

Keep comment text out of telemetry and broad logs. Stable fixture names and boolean retention results are enough for CI diagnostics.

Use the [format guide](/blog/skill-md-format-guide) to state the current presentation policy. Authors can then decide whether comments are suitable for files that downstream tools may normalize.

SKILL.md comment preservation policy is accepted when tests prove exact raw recovery, correct field values, and expected comment-free output independently. A passing field round trip alone is not sufficient.

## How do you test SKILL.md comment preservation policy step by step?

Test SKILL.md comment preservation policy by varying one valid comment location at a time and observing three outputs. Raw text, resolved fields, and regenerated source each need a direct oracle.

1. Read \`packages/shared/src/parsers/skill-parser.ts\` and list how parsing returns raw text and how the writer constructs new YAML lines, with raw keep and new output named as two distinct claims, and mark the first point where source and new text can part
2. Read \`packages/shared/src/types/skill.ts\` and confirm that \`ParsedSkill\` has no comment or concrete-syntax field, then note which raw and parsed views each test can check so no reviewer expects comments in the typed field map
3. Build one no-comment SKILL.md control with valid required fields and a short stable body, keeping the whole source in one fixed string that no helper can rewrite, and run the control first to prove all base fields parse cleanly
4. Add separate top-level, inline scalar, list-item, quoted-hash, and raw-recovery fixtures, with one clear note phrase in each case and all other source text held fixed so one parse error cannot hide results for the other note sites
5. Parse each source and assert whole-string raw equality before checking resolved field values, then print only the first escaped mismatch and both source lengths on a raw failure, and stop later checks at once if the raw match fails
6. Serialize parsed frontmatter and content, then assert unique comment phrases are absent and quoted hash data remains, while checking that no comment test rejects a hash stored in quotes and each phrase cannot match a body or field by chance
7. Parse serialized output again and compare supported fields plus normalized content with the first parse, using field checks rather than an exact source match for the new YAML, then confirm that source mismatch does not fail the value test
8. Run the focused matrix and a read-only publication validation check before changing parser or serializer behavior, then review any source-writing command with a clear diff and user choice, with the same case names used in unit and command logs

Keep every fixture valid according to YAML rules. An invalid comment placement produces a parser test, not evidence about successful preservation.

Use phrase assertions in regenerated output and whole-string equality in raw output. This combination catches both broad loss and each intended presentation case.

Do not assert exact serialized source unless the serializer's formatting itself is the target. Field equality is the stable contract for comment-bearing round trips.

If a new serializer library claims comment support, add concrete placement tests before replacing current expectations. Library capability alone does not prove the QASkills wrapper passes comment tokens through.

Connect the final suite to [CI validation](/blog/validate-skill-md-in-ci-pipeline). A failure should identify placement and view, such as raw, field, or serialized, without dumping private source.

## SKILL.md comment preservation policy rollout and regression checks

SKILL.md comment preservation policy rollout should begin as documentation of current behavior. No code change is required to state that raw source retains comments and current writer output does not.

Shared parser owners should review the raw return, gray-matter configuration, selected fields mapping, content trim, and manual serializer. Each area affects a different view.

CLI and web owners should identify workflows that call the writer after validation. A read-only command should not rewrite comments merely because a skill passed.

Before introducing a formatter, scan representative skills for comment use and unsupported keys. Report measured files and placements without publishing private comment text.

If source rewriting is expected, show diffs and require confirmation. Batch automation should offer a dry run and preserve backups according to repository policy.

Retain the quoted-hash control through every implementation. Comment-aware parsers can still mishandle plain string searches added around them.

Run line-ending and trailing-space raw checks beside comment cases. A source-preserving claim includes those presentation details even when this article focuses on comments.

After gray-matter upgrades, rerun field and raw assertions. Dependency parsing may change, while QASkills should still return its input string on each successful call.

After serializer changes, rerun the second parse and compare supported values. Comment preservation improvements must not damage arrays, defaults, quotes, or body content.

Pair rollout notes with [malformed parser tests](/blog/malformed-skill-md-frontmatter-parser-tests). Authors should understand both what survives a valid parse and what callers retain when parsing fails.

The lasting suite needs a no-comment control, three comment placements, one quoted hash, one unsupported key if relevant, and exact raw equality throughout. Add edit-preservation cases only when an editing API exists.

## Frequently Asked Questions

### What should frontmatter comment loss tests assert?

Assert exact equality between source and \`ParsedSkill.raw\`, correct resolved fields, and absence of each unique comment phrase from serialized YAML. Parse the serialized result again and compare supported semantics. Do not reject hashes inside quoted scalar data or Markdown headings.

### How does YAML comment round trip affect the SKILL.md contract?

A field round trip can preserve supported values while removing comments, quotes, spacing, and key order. The current QASkills writer emits a normalized supported document, not lexical identity. Exact comment recovery depends on retaining the successful parser's raw input string after the second parse.

### Which fixture best exposes SKILL.md source fidelity?

Use valid YAML with one top-level comment, one inline author comment, one list-item comment, and a quoted description containing a hash. It distinguishes actual comments from scalar data while whole-string raw equality protects every original presentation detail in one small file.

### When should teams check serializer comment policy?

Run the matrix when gray-matter, parser mapping, frontmatter types, serializer formatting, validation workflows, or file-writing commands change. Also run it before adding a formatter. Any of these changes can preserve semantics while unexpectedly rewriting author comments or write path rules.

### What is the pass criterion for raw metadata preservation?

Successful parsing must return the exact input string in \`raw\`, and fields must resolve correctly around comments. Current serialized output should remain parseable and semantically equal without claiming comment retention. Failed parses require caller-held source because no \`ParsedSkill\` exists after such a failure.

## Conclusion

SKILL.md comment preservation policy should distinguish exact source from parsed output. Keep \`ParsedSkill.raw\` when comments must remain recoverable, and treat \`serializeSkillMd\` as a normalized writer that currently omits original YAML comments and formatting.

Open the [skills directory](/skills), inspect a published SKILL.md, then use [how to publish](/how-to-publish) to apply this comment contract before publication. Choose read or rewrite mode before source can change.`,
};
