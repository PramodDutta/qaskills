import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md custom YAML tag rejection Guide',
  description:
    'SKILL.md custom YAML tag rejection: define fail-closed tests for explicit YAML tags. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md custom YAML tag rejection',
  keywords: [
    'SKILL.md custom YAML tag rejection',
    'explicit YAML tag security',
    'untrusted frontmatter tags',
    'SKILL.md deserialization policy',
    'gray-matter custom types',
    'fail closed YAML parsing',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'testing-skill-md-yaml-frontmatter-roundtrip',
    'malformed-skill-md-frontmatter-parser-tests',
    'validate-skill-md-in-ci-pipeline',
  ],
  sources: [
    'https://yaml.org/spec/1.2.2/',
    'https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html',
  ],
  repoEvidence: [
    'packages/shared/src/parsers/skill-parser.ts',
    'packages/shared/src/schemas/skill-schema.ts',
  ],
  content: `SKILL.md custom YAML tag rejection should stop unknown application tags before schema validation and permit only a reviewed set of standard forms. Current gray-matter behavior accepts several core tags but throws on an unknown \`!qa\` tag. Tests must pin both branches, check resolved JavaScript types, and keep any stricter allowlist clearly marked as a proposed policy.

The key rule is simple: source tags and parsed value types are different facts. A safe suite checks each fact at the first layer that can still observe it.

## What does SKILL.md custom YAML tag rejection need to prove?

SKILL.md custom YAML tag rejection must prove what happens to each tag class before QASkills trusts the returned frontmatter. The suite needs a plain control, accepted core tags, rejected unknown tags, and core tags that resolve to the wrong runtime type.

The production entry point is \`packages/shared/src/parsers/skill-parser.ts\`. Its \`parseSkillMd\` function calls gray-matter, then copies selected values into a \`SkillFrontmatter\` object. There is no source-tag check or parser-error wrapper in that function.

The installed engine accepts \`!!str 123\` and returns the string \`123\`. It also accepts \`!!int 12\` and returns a number, while \`!!bool true\` returns a boolean. An explicit sequence tag can return an array that \`toStringArray\` later maps into strings.

Unknown application tags behave in another way. A value such as \`!qa value\` throws an unknown-tag YAML exception during the gray-matter call. The same happens for an unsupported JavaScript function tag in the installed configuration.

These observations do not mean every standard tag is valid QASkills metadata. A numeric \`name\` can pass through the parser's typed object at runtime because TypeScript does not coerce values. The later Zod schema can still reject that number as a non-string.

The schema in \`packages/shared/src/schemas/skill-schema.ts\` sees resolved JavaScript values, not source tag tokens. It can reject a number, boolean, date, or binary value for a string field. It cannot state whether the same value came from an explicit tag or ordinary YAML resolution.

A clear policy can reject unknown or custom tags at parse time, then apply ordinary schema rules to accepted core results. A stricter policy may reject all explicit tags, but that would be a new source rule and needs a scan plus migration plan.

Keep this article distinct from [malformed frontmatter parser tests](/blog/malformed-skill-md-frontmatter-parser-tests). Those tests cover broad syntax faults, while this suite compares known tag classes and their resolved types.

Give each tag row a short name that says plain, core, wrong type, or unknown, then place the raw tag text next to that name. A reviewer should know what the engine saw and what the test hopes to learn without opening a helper or a stack trace. Keep the same valid fields and body in all rows, since one changed source line is enough to move from plain text to a tagged value. This shape also makes the [round-trip guide](/blog/testing-skill-md-yaml-frontmatter-roundtrip) easy to use later for the rows that return a value.

The [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/) defines explicit tag syntax and standard tag handles. Use it to name fixture classes, then use repository behavior as the source for QASkills acceptance.

Use a short file for each case. One tag, one field, and one expected stage make test failures easy to read. Do not place several rare tags in one source, since the first throw would hide all later outcomes.

## explicit YAML tag security: current repository behavior

Explicit YAML tag security begins with the fact that gray-matter resolves tags before \`parseSkillMd\` builds its result. QASkills currently relies on the configured YAML engine to accept or reject those source forms.

A plain \`name: Probe\` value is the first control. An explicit \`name: !!str 123\` is a second accepted case because the engine returns a string. Both can reach the parser result, though their source text differs.

The numeric case exposes the runtime type seam. \`name: !!int 12\` returns a number from gray-matter, and \`data.name || ''\` preserves that truthy number. The static \`SkillFrontmatter\` annotation does not change the value into text.

Call \`skillFrontmatterSchema.safeParse\` after that result and expect a failed string check on \`name\`. This paired assertion shows the parser returned a value while the schema rejected its type. It avoids the false claim that the parser enforces every frontmatter field type.

Boolean, timestamp, and binary forms deserve separate rows only where they add a new resolved type. Do not infer their result from tag spelling. Execute literal fixtures against the pinned dependency and record the type with \`Object.prototype.toString\` when normal \`typeof\` is too broad.

For list fields, an explicit sequence can be valid after resolution. The private \`toStringArray\` helper maps array members with \`String\`, so numeric sequence members become text. A direct string field and a list field therefore need different oracles.

When a row returns, print the field name, plain type, and a short view of its value before the schema call starts. When a row throws, print the tag text and a small cause but leave the whole file and stack out of the normal test log. This split makes a parser stop look quite different from a later field error, even when both rows end as failed input for the user. It also guards against a test helper that catches all faults and turns them into the same vague false result.

Unknown custom tags throw before the schema can run. Assert the error category at \`parseSkillMd\`, then stop that row. Passing a made-up fallback object to Zod would test a path that production never created.

The [OWASP deserialization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html) supports narrow type choices and distrust of unplanned object forms. It does not prove a QASkills exploit, so use it for policy design rather than impact claims.

Keep test words calm and exact. Say that a tag is accepted, rejected, or resolved to a type. Avoid saying code ran unless the test truly observes that effect.

The [format guide](/blog/skill-md-format-guide) shows the normal frontmatter shape. Start from that plain form, then alter only the tag on the field under test.

## Why does untrusted frontmatter tags change the contract?

Untrusted frontmatter tags change the contract because one source token can ask the YAML engine to construct a value beyond plain text or lists. The returned type then controls which QASkills branch runs next.

For supported scalar fields, QASkills uses truthy fallback expressions. A truthy number or object can survive the parser even though the TypeScript field says string. Runtime validation, not the annotation, catches the mismatch.

For supported array fields, the parser has an explicit conversion rule. Arrays are mapped through \`String\`, comma text is split, and all other types become empty arrays. Thus, a tagged sequence and a tagged scalar can lead to very different results.

The schema owns value validity after parsing. It checks string fields and array minimums, but it has no raw token stream. If policy says explicit syntax itself is forbidden, that check must run before tag information is lost.

There are two sound policy levels. A basic rule can reject unknown application tags and let the schema judge standard resolved values. A strict rule can allowlist exact standard tags by field, but it needs source-aware parsing and proof that common skills still pass.

Do not add a regular expression that scans every exclamation mark in the whole document. Markdown bodies may contain punctuation or code that is not YAML. Any source check must be limited to the frontmatter block and understand quoted text well enough to avoid false matches.

Test the scan with an exclamation mark in body prose, one in a code block, and one inside a quoted frontmatter string, since none is a tag by itself. Then place a true tag at the start of a value and prove the same check can spot that form without reading past the closing fence. Keep these source-only cases near the scanner unit test, while the public parser test still proves the full path. This set keeps a strict rule from blocking normal skill text merely because a common mark appears in the wrong part of the file.

The safer test shape observes the public parser first. If a dedicated source scanner is later added, give it its own unit tests and then retain integration cases through \`parseSkillMd\`. This split shows whether scanning or value validation changed.

Round trips also matter. Once an accepted tag becomes a normal JavaScript value, \`serializeSkillMd\` writes QASkills' own plain YAML form. It does not preserve explicit source tag spelling, so lexical tag identity is not round-trip data.

Use [YAML round-trip tests](/blog/testing-skill-md-yaml-frontmatter-roundtrip) for that normalization branch. Keep rejection fixtures in this suite because no serialized output should exist after an unknown tag throws.

No repository line here proves remote execution or another high-impact result. The verified claim is smaller: tag resolution happens in gray-matter, unknown tags throw, and Zod checks the returned values.

## SKILL.md deserialization policy test matrix

The SKILL.md deserialization policy matrix should pair source form with resolved type and first rejecting layer. That layout stops reviewers from treating every explicit tag as the same case.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| Plain scalar | \`name: Probe\` | \`packages/shared/src/parsers/skill-parser.ts\` | Parser returns a string and the valid control can pass Zod |
| Explicit string tag | \`name: !!str 123\` | Parser then schema | Parser returns \`"123"\` and the string rule can pass |
| Explicit integer tag | \`name: !!int 12\` | \`packages/shared/src/schemas/skill-schema.ts\` | Parser exposes a number and Zod rejects the name type |
| Custom application tag | \`name: !qa value\` | gray-matter through parser | Parsing throws unknown-tag context before object creation |
| Unknown function tag | Unsupported JavaScript tag | Parser configuration | Parsing throws; no function value reaches QASkills |
| Explicit sequence tag | Tagged list on \`tags\` | Parser array conversion | Resolved array members become strings |

Build each row from one shared valid document. The helper may replace one literal line, but it should return raw text and never call the parser. Expected values must stay independent from production conversion.

For accepted rows, assert both the parsed value and its runtime type. A deep equality check may show \`12\`, but the extra type assertion makes the contract clear when a string \`"12"\` looks similar in logs.

For rejected rows, capture only stable error facts. The full YAML exception can include line marks and library frames. Match unknown-tag context and confirm that no schema spy was called.

The sequence row needs members that reveal conversion, such as \`[one, 2]\`. Expect \`['one', '2']\` from \`toStringArray\`. That row is a parser normalization test, not proof that all tagged collections should be allowed.

Run the clean row first, the two core rows next, the wrong-type rows after them, and unknown tags last in each report. This order proves the base works before a stop is treated as good news and lets each later stage build on a known parse path. Do not stop the whole table after one tagged row fails, because the full type map is more useful than the first cause alone. Still, stop work within that row at its first failed stage so no made-up value reaches a later check.

If a strict source allowlist is proposed, add an expected-policy column rather than rewriting current results. During review, current behavior and desired behavior should be visible side by side. After code ships, the selected rule can become the sole expected result.

Do not use network-loaded schemas or custom constructors in unit tests. The repository config does not show those features, and such setup would test a different engine. Literal local strings are enough to prove the current boundary.

Run the matrix in the shared package first, then add one public validator case. The lower test gives precise type facts, while the outer test gives the user-facing error shape.

The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) can host the final command. Reports should list case, tag class, resolved type when any, and the first failed stage.

## How should gray-matter custom types be verified?

Gray-matter custom types should be verified through the QASkills parser, since that call includes the exact installed engine and later field reconstruction. The first example compares an explicit string, an explicit integer, and an unknown tag.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { parseSkillMd } from '@qaskills/shared';

const sourceWithName = (nameLine: string) => \`---
\${nameLine}
description: A complete description for a YAML tag boundary check.
version: 1.0.0
author: qa-team
license: MIT
testingTypes: [unit]
languages: [typescript]
---

## Instructions

Run the tag boundary check.
\`;

describe('gray-matter tag results through parseSkillMd', () => {
  it('resolves an explicit string as text', () => {
    const parsed = parseSkillMd(sourceWithName('name: !!str 123'));

    expect(parsed.frontmatter.name).toBe('123');
    expect(typeof parsed.frontmatter.name).toBe('string');
  });

  it('exposes a numeric result before schema validation', () => {
    const parsed = parseSkillMd(sourceWithName('name: !!int 12'));

    expect(parsed.frontmatter.name).toBe(12);
    expect(typeof parsed.frontmatter.name).toBe('number');
  });

  it('rejects an unknown application tag', () => {
    expect(() => parseSkillMd(sourceWithName('name: !qa value'))).toThrow(/unknown tag/i);
  });
});
\`\`\`

The numeric expectation reveals a deliberate type mismatch in the test. TypeScript may require a narrow cast around that assertion because the interface declares a string. The runtime check is the evidence being characterized.

The second example sends the returned object to \`packages/shared/src/schemas/skill-schema.ts\`. It proves accepted parse syntax does not imply accepted metadata.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { parseSkillMd, skillFrontmatterSchema } from '@qaskills/shared';

describe('resolved tag values at the schema boundary', () => {
  it.each([
    ['string', 'name: !!str 123', true],
    ['integer', 'name: !!int 12', false],
    ['boolean', 'name: !!bool true', false],
  ])('%s name has the expected schema result', (_label, nameLine, accepted) => {
    const parsed = parseSkillMd(sourceWithName(nameLine));
    const result = skillFrontmatterSchema.safeParse(parsed.frontmatter);

    expect(result.success).toBe(accepted);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'name')).toBe(true);
    }
  });
});
\`\`\`

Keep \`sourceWithName\` in a shared test helper that returns only text. The helper must not cast parsed values or insert a default name, since either act could hide the type under test.

Add array cases in a separate table because their conversion contract differs. Expect exact strings after \`toStringArray\`, then let the schema check array minimums. A mixed table would need too many conditional assertions.

Keep source builders small enough to read in the same file as these tests, and make each builder return raw text with no parse or cast step. Add a source check for the exact tag line before each call, which catches a bad replace that left the plain control in place. For returned data, use strict value and type checks rather than a large object snapshot that can hide the field under test. For thrown data, use a short reason match and a spy that proves the schema did not run for that same source.

For dates and binary values, use tests only if the selected policy needs them. Record actual constructor names from the pinned runtime and avoid JSON snapshots that may transform those values before assertion.

Finally, pass one unknown-tag fixture through the user-facing validator used in [publication checks](/how-to-publish). Assert a stable parse failure if such a wrapper exists, but do not invent a code that the current implementation does not return.

## fail closed YAML parsing acceptance criteria

Fail closed YAML parsing means unknown or unapproved tags do not yield usable frontmatter, while clean controls keep working. The phrase should describe an observed stop, not imply that every possible deserialization risk has been tested.

At minimum, an unknown \`!qa\` tag must throw before \`ParsedSkill\` exists. A plain scalar and explicit string control must show the harness can parse nearby valid source. An integer-tag row must show later schema rejection for the wrong runtime type.

The policy document should list allowed tag classes or state that only ordinary YAML forms are supported. "Safe tags" is too vague for a stable test. Name plain scalars, standard strings, sequences, or any narrower set the team approves.

If the team bans all explicit tags, add a source-aware frontmatter check and migration scan before enforcing it. Current gray-matter behavior accepts standard explicit tags, so such a ban is not shipped behavior in the cited parser.

Every rejected case should stop at its first failing layer. Unknown tags end in parsing, while wrong types end in Zod. Reports that call both "schema errors" erase the stage needed for a quick fix.

Tests must not instantiate custom constructors just to prove they could exist. That changes configuration and leaves the repository path. Instead, verify the installed engine rejects unknown examples and guard any future config change with the same matrix.

Save one small result record per row with its name, source form, parse state, returned type, and schema state when one exists. A new type should fail against the approved list rather than slide into a broad object snapshot that few reviewers can read. If only error text shifts, the short reason field shows that the stop rule stayed the same and keeps the review narrow. If a tag starts to return, the blank type field becomes a real value and makes the policy change hard to miss.

Use plain output fields: fixture name, tag text, parse result type, schema success, and stable issue path. Do not print whole binary values, large bodies, or stack traces. Small facts make CI review fast.

Run the suite on each gray-matter or YAML dependency update. A package change can expand, narrow, or rename supported tags. Treat new acceptance as a policy review, not an automatic snapshot refresh.

Use [published skills](/skills) for a sample scan before a stricter source rule. The scan should report actual explicit tags from the selected revision and should not guess how common they are.

SKILL.md custom YAML tag rejection passes when each approved tag class has a type oracle and each denied class fails at a named stage. The suite should also prove no custom tag result reaches serialization.

## How do you test SKILL.md custom YAML tag rejection step by step?

Test SKILL.md custom YAML tag rejection with one plain control and a small tag matrix that moves from source parsing to value validation. Keep each expected result fixed by policy, not by whatever the runtime returns during setup.

1. Read \`packages/shared/src/parsers/skill-parser.ts\` and record the gray-matter call plus field conversion branches.
2. Read \`packages/shared/src/schemas/skill-schema.ts\` and list the expected runtime type for each supported field.
3. Create one smallest valid SKILL.md source with ordinary scalars and arrays.
4. Replace one field with explicit string, integer, boolean, sequence, custom, and unknown tag forms.
5. Call \`parseSkillMd\`, recording returned type or stable thrown reason at the first boundary.
6. Send only returned objects to \`skillFrontmatterSchema.safeParse\` and assert stable issue paths.
7. Write the approved tag allowlist, then add a source check only if current parser behavior is too broad.
8. Run the matrix in CI and review each dependency-driven acceptance change before publication.

The control must run before tagged rows. If it fails, stop the suite and fix delimiters or required metadata. This prevents many false tag failures from one broken fixture.

Ask a peer to read the raw control and one tagged case before the first merge, then compare that view with the row names in the test log. The check should confirm that just one source line changed and that no helper adds a tag, field, or default out of sight. Run the narrow shared test on its own, then run the full package test once its type map is clean. This two-pass flow keeps feedback quick while still proving no nearby parser rule was harmed by the new cases.

Do not catch every error and return \`undefined\` inside the helper. Tests need the actual boundary and reason. Catch only where the assertion projects a stable error shape.

For accepted values, compare exact type and value. For rejected values, compare issue path or parser reason. These small checks survive message wording changes while still guarding the contract.

Store the chosen allowlist near the parser tests. A policy hidden only in an article can drift from code. The article should explain the choice, while tests and code enforce it.

After shared tests pass, run one end-to-end check through the command described in [CI validation](/blog/validate-skill-md-in-ci-pipeline). The command should fail a custom tag once and leave no output artifact.

## SKILL.md custom YAML tag rejection rollout and regression checks

SKILL.md custom YAML tag rejection rollout should start with the current matrix, not a new scanner. Characterization tells reviewers which standard tags already work, which values fail Zod, and which unknown tags throw.

Parser owners should review engine configuration and raw errors. Schema owners should review resolved type rules. CLI and web owners should review any user-facing error mapping, since a raw unknown-tag exception may need a clear file-level message.

Choose the rule in writing before changing code. A narrow rule may keep standard string and sequence tags, reject unknown tags, and rely on Zod for wrong types. A strict rule may reject all explicit forms at a source-aware boundary.

For a strict change, scan repository skills and report exact files that use explicit tags. Add a warning phase if valid existing content would fail. Do not state a migration count without running that scan on the target revision.

The scan should read only frontmatter, list each true tag once, and keep quoted text or Markdown body marks out of its count. Review each hit against the proposed list, then fix or warn on real files before a block is switched on. Add the chosen rule to [how to publish](/how-to-publish) only when code and tests enforce the same set, not while a draft scanner is still under review. Store the scan command and code hash with the result so the next run can be compared on fair terms.

Regression tests should cover one plain scalar, one standard string, one standard wrong type, one sequence, and two unknown tags. This set checks both acceptance and rejection without listing every YAML tag.

Keep lower and upper tests. The lower suite records gray-matter behavior through \`parseSkillMd\`, while the upper suite records stable validator output. A wrapper refactor should not erase the engine characterization.

Review body handling as a false-positive guard if a scanner is added. Exclamation marks inside Markdown, code fences, and quoted YAML text must not trigger a tag error. Use literal cases for each location.

Dependency bumps must run the full matrix. If a new engine starts accepting an old unknown tag, CI should fail and ask for review. If wording alone changes, update only the narrow reason projection.

Pair this work with the [frontmatter format guide](/blog/skill-md-format-guide) so authors know the supported syntax. Documentation and tests should use the same tag terms and examples.

## Frequently Asked Questions

### What should explicit YAML tag security tests assert?

Assert source form, resolved runtime type, and first rejecting layer as separate facts. Plain and explicit string controls should parse, wrong-type core tags should reach Zod, and unknown tags should throw during parsing. Avoid impact claims that the repository evidence and fixtures do not demonstrate.

### How does untrusted frontmatter tags affect the SKILL.md contract?

Tags can make the YAML engine return strings, numbers, booleans, arrays, dates, or other values before QASkills rebuilds metadata. The schema checks those values but cannot see tag spelling. Any rule about source syntax must therefore run before that spelling is lost.

### Which fixture best exposes SKILL.md deserialization policy?

Use one valid document and replace only its \`name\` line across \`Probe\`, \`!!str 123\`, \`!!int 12\`, and \`!qa value\`. The four rows show plain success, tagged string success, schema type failure, and parser rejection without unrelated changes in one compact table.

### When should teams check gray-matter custom types?

Run the matrix when gray-matter, its YAML engine, parser options, field conversions, or schema types change. Also run it before adding any custom engine. Those changes can alter which tags resolve, which values return, and where a user sees failure.

### What is the pass criterion for fail closed YAML parsing?

Every denied tag must stop before usable metadata or an artifact exists, and each approved form must resolve to a tested type. Wrong-type standard values must fail Zod at a stable field path. Any new tag acceptance requires a reviewed policy decision.

## Conclusion

SKILL.md custom YAML tag rejection currently relies on gray-matter to reject unknown tags, while standard tags can produce values that Zod later accepts or rejects. Add the source-to-type matrix first, then choose and enforce an exact allowlist at the layer that can observe tags.

Keep claims tied to returned types and thrown errors. Open the [skills directory](/skills), inspect a published SKILL.md, then use [how to publish](/how-to-publish) to apply this contract before publication.`,
};
