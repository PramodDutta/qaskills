import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md unknown field handling Guide',
  description:
    'SKILL.md unknown field handling: choose a clear forward-compatibility policy. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md unknown field handling',
  keywords: [
    'SKILL.md unknown field handling',
    'Zod unknown keys',
    'frontmatter forward compatibility',
    'SKILL.md metadata passthrough',
    'unsupported skill fields',
    'strict schema migration',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'malformed-skill-md-frontmatter-parser-tests',
    'seed-skill-catalog-parser-regression-tests',
  ],
  sources: ['https://zod.dev/api', 'https://agentskills.io/specification'],
  repoEvidence: [
    'packages/shared/src/parsers/skill-parser.ts',
    'packages/shared/src/schemas/skill-schema.ts',
  ],
  content: `SKILL.md unknown field handling currently drops unlisted frontmatter from the typed parser result, while the original raw text still holds it. Teams should test parse, schema, and serialize stages separately, then choose preservation, warning, stripping, or rejection before new specification fields reach production files.

A valid-looking key can disappear during a round trip even when parsing reports no error. Inspect a published file from the [skill directory](/skills), then use focused fixtures to expose each stage.

## What does SKILL.md unknown field handling need to prove?

SKILL.md unknown field handling needs to prove what happens to an extra key during initial YAML parsing, typed mapping, schema validation, and serialization. A single success Boolean cannot show whether data survived.

Repository evidence begins in packages/shared/src/parsers/skill-parser.ts. parseSkillMd asks gray-matter for data and content, then builds a new frontmatter object from a fixed field list.

That list includes name, description, version, author, license, six array groups, agents, minTokens, and maxTokens. Any other property in gray-matter data is not copied into frontmatter.

The function also returns raw unchanged. Thus, an unknown key can remain in parsed.raw while being absent from parsed.frontmatter.

Serialization uses only the typed SkillFrontmatter object. If code parses a file and serializes that object, an unknown field has no slot and does not return.

The schema in packages/shared/src/schemas/skill-schema.ts also defines a fixed object. It uses a standard Zod object rather than an explicit strict object or loose object.

The Zod [object documentation](https://zod.dev/api) states that normal object parsing strips unrecognized keys from parsed output. It also offers strict and loose forms when a project wants rejection or preservation.

Parser mapping occurs before schema validation in the validator flow. Therefore, an unknown source key is already gone from typed frontmatter before the schema can warn or reject it.

This behavior should be described as data handling, not as an attack claim. The main risk is an unclear compatibility contract when producers and consumers support different field sets.

The [SKILL.md format guide](/blog/skill-md-format-guide) lists local fields that authors can rely on. It should also state how keys outside that list are treated during local tools and round trips.

Tests need three observations for each fixture: typed keys, raw source, and serialized text. Save all three on failure so a reviewer can see exactly where the key changed.

SKILL.md unknown field handling should not infer intent from a key's name. A future standard key, a product extension, and a typo all look like unknown input until policy identifies them.

## Zod unknown keys: current repository behavior

Zod unknown keys are not rejected by the current skillFrontmatterSchema because it is built with z.object. Direct safeParse accepts an extra property and returns known fields in parsed data.

That direct behavior is useful to test, but it is not the first loss point for SKILL.md text. parseSkillMd creates its own known-only object before a validator calls safeParse.

Use two controls to keep these paths clear. One should call the schema with a plain object, while the other should call parseSkillMd with YAML.

For direct schema input, assert success and inspect that the extra key is absent from result.data. For file input, inspect frontmatter, raw, and content independently.

Do not assert internal Zod class names or private definitions. The public behavior of safeParse and the returned object is the contract that callers observe.

The first example characterizes packages/shared/src/parsers/skill-parser.ts with a future key and a nested metadata object. Both remain visible only in raw.

\`\`\`typescript
import { expect, it } from 'vitest';
import { parseSkillMd } from '@qaskills/shared';

it('keeps unknown YAML only in raw text today', () => {
  const source = \`---
name: unknown-key-probe
description: A focused fixture for extra frontmatter fields.
version: 1.0.0
author: qa-team
license: MIT
testingTypes: [contract]
languages: [typescript]
compatibility: Requires Node.js 20
metadata:
  owner: qa-platform
---

Run this probe before changing parser field ownership.
\`;

  const parsed = parseSkillMd(source);

  expect(parsed.frontmatter).not.toHaveProperty('compatibility');
  expect(parsed.frontmatter).not.toHaveProperty('metadata');
  expect(parsed.raw).toContain('compatibility: Requires Node.js 20');
  expect(parsed.raw).toContain('owner: qa-platform');
  expect(parsed.content).toContain('Run this probe');
});
\`\`\`

The fixture uses keys defined by the wider Agent Skills format, which makes the drift realistic. The test still characterizes QASkills code rather than claiming current local support.

Add a simple typo such as languagess in a second row. It proves that a misspelled required field can be dropped while the correct required field still fails separately.

The [malformed frontmatter tests](/blog/malformed-skill-md-frontmatter-parser-tests) cover syntax and types. Unknown-key tests should use valid YAML so parser errors do not hide field policy.

Zod unknown keys also need nested cases if known objects gain nested schemas later. Today, most local fields are scalars or arrays, so a top-level extra object is enough to show parser loss.

SKILL.md unknown field handling is correctly characterized when schema and parser results are reported as two distinct facts. Combining them into one claim can put the fix in the wrong layer.

## Why does frontmatter forward compatibility change the contract?

Frontmatter forward compatibility asks whether a newer producer can send data through an older consumer without loss. Silent stripping makes reading possible but can make a later write destructive.

An old tool may parse a new field and continue normal work because known fields remain valid. If it then saves the file from typed data, the new field disappears.

Preservation avoids that loss but can carry values the old tool cannot validate. Rejection avoids silent change but blocks newer files until every consumer upgrades.

A warning can split the difference when the tool reads without writing. Yet a warning alone is weak if a format command still removes the field.

The official [Agent Skills specification](https://agentskills.io/specification) defines compatibility, metadata, and allowed-tools beyond its required name and description fields. It also allows additional product data through the metadata map.

QASkills has its own frontmatter model with testing fields, languages, agents, and token bounds. A policy must account for both local extensions and newer standard fields.

Do not claim every specification field must enter the current typed model at once. The supported set should be an explicit product choice with tests and release notes.

The [publishing workflow](/how-to-publish) should reject or warn before upload if a key will be lost. A late round-trip change is harder for an author to trace.

Forward compatibility also affects command-line upgrades. Two team members using different package versions can alternately preserve and remove the same key.

Tests should record tool version beside round-trip output. That fact helps teams distinguish an intended migration from an old consumer stripping new data.

Choose behavior by operation, not only by parser. Read-only inspection, validation, formatting, publication, and serialization may need different safety rules, but those rules must agree on loss warnings.

## SKILL.md metadata passthrough test matrix

A SKILL.md metadata passthrough matrix should compare known input, one future key, a nested unknown object, and a full round trip. Each row must show both raw and typed states.

Known-only input is the control. Its fields should parse, validate, and serialize without an unrelated diff.

One future scalar key shows top-level behavior with the least noise. compatibility is useful because the wider specification gives it a clear type and meaning.

A metadata object checks nested data as one unknown top-level value. The current typed parser omits the whole object rather than walking or flattening it.

The round-trip row calls parseSkillMd and serializeSkillMd. It proves that raw retention does not imply output retention when callers serialize the typed result.

| Case | Input or boundary | Typed frontmatter today | Raw today | Serialized result today |
|---|---|---|---|---|
| Known keys only | Local field set | Known keys present | Full source present | Known keys written |
| One future scalar | compatibility | Extra key absent | Extra key present | Extra key absent |
| Nested unknown object | metadata.owner | Object absent | Object present | Object absent |
| Typo beside required key | languagess | Typo absent | Typo present | Typo absent |
| Parse and save | Any unknown key | No typed slot | Original raw retains key | Rebuilt text drops key |

Use exact containment checks for the extra key and value. A broad snapshot can hide loss among YAML quote or list-format changes.

Also assert content body equality after trimming rules. Frontmatter policy should not alter the Markdown body in the same test.

The [seed parser regression guide](/blog/seed-skill-catalog-parser-regression-tests) can run this matrix over real files. Keep synthetic keys because a current seed set may not contain any new fields.

If passthrough is proposed, test key order only when order matters to the product. Semantic preservation is usually more useful than exact YAML formatting.

SKILL.md metadata passthrough does not mean every value is trusted. Preserved unknown data may still be excluded from search, score, display, or execution until a known schema owns it.

### Keep a read and write proof bundle

For each extra key, save four small views: the source lines, parsed known keys, raw-key check, and text made by the writer. Those views show the exact loss point in one place, so a reviewer does not mistake raw text retention for safe write support.

Use a plain scalar first because its key and value are easy to spot in both input and output, then add one map and one list as separate rows. If all three vanish from typed data, the test shows the fixed map rule without tying the result to one YAML shape.

Keep the body text the same in every row and check it after each write, since frontmatter work should not change the skill steps by accident. A body hash can help in a large set, but one short exact line is clearer in the small unit test.

Add a known field just above and below the unknown key in source text, then prove both known values survive the new file. This guard catches a bad merge or split that drops a nearby good line while the main test looks only for the planned extra key.

When a writer strips the key by current design, name that fact in the expected record rather than calling the whole run a pass. The test passes because it matches shipped code, while the record still gives the team clear proof for a later no-loss rule.

For a warn plan, pair the warning with a dry-run diff that shows the missing key and no unrelated field change. A warning with no shown effect can be missed, but a short diff tells the author why saving with this tool is not safe yet.

For a preserve plan, parse the new output once more and check the key value again instead of trusting string search alone. This second read proves the writer made valid YAML and did not save the key as dead text outside frontmatter.

For a strict plan, prove the write never starts after the unknown-key issue and that the old file stays byte for byte the same. That check turns rejection into a safe act rather than a late error that follows a partial file change.

## How should unsupported skill fields be verified?

Unsupported skill fields should be verified at every operation that can write or publish a skill. Read-only parse success is not enough to prevent loss.

Start with a known valid file and add one unsupported scalar. Assert the parser's current typed and raw observations before calling any writer.

Then serialize the parsed frontmatter with the same content. Assert that the field is absent today and that all known fields remain stable.

The second example ties packages/shared/src/parsers/skill-parser.ts to packages/shared/src/schemas/skill-schema.ts. It also shows the current round-trip result without presenting passthrough as shipped.

\`\`\`typescript
import { expect, it } from 'vitest';
import {
  parseSkillMd,
  serializeSkillMd,
  skillFrontmatterSchema,
} from '@qaskills/shared';

it('characterizes unknown fields across schema and round trip', () => {
  const source = validSkillSource.replace(
    'license: MIT',
    'license: MIT\\nfutureMode: careful',
  );
  const parsed = parseSkillMd(source);
  const checked = skillFrontmatterSchema.safeParse({
    ...parsed.frontmatter,
    futureMode: 'careful',
  });

  expect(checked.success).toBe(true);
  if (!checked.success) throw checked.error;
  expect(checked.data).not.toHaveProperty('futureMode');

  const written = serializeSkillMd(parsed.frontmatter, parsed.content);
  expect(written).not.toContain('futureMode');
  expect(written).toContain('license: "MIT"');
  expect(written).toContain(parsed.content);
});
\`\`\`

The spread object adds a direct schema extra after the parser has dropped the source key. That arrangement proves the default Zod object behavior separately from parser mapping.

Add strict and passthrough examples only in a proposal branch. Current code uses neither mode explicitly, so article tests must not state otherwise.

The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) can fail when a write would lose data. A dry-run diff is often clearer than a generic unknown-key message.

Unsupported skill fields need stable paths and suggested action. Tell authors to remove the key, upgrade the tool, or move product data into an approved metadata location.

Do not echo secret values from unknown fields into logs. A path and key name are usually enough for a validation report.

If a future key triggers execution behavior, preservation and validation need a security review. This article only proves frontmatter data flow, not whether any unknown value is safe to use.

## strict schema migration acceptance criteria

A strict schema migration should reject unrecognized keys with a stable issue path before any writer removes them. It should also define treatment for existing files and standard fields not yet supported.

Strict rejection gives fast feedback for typos and unsupported extensions. It reduces silent loss but can make older tools unable to read newer files.

Passthrough keeps data across schema parsing but still requires the typed parser and serializer to carry it. Changing Zod mode alone does not repair the earlier fixed mapping.

An explicit catchall can validate unknown values under a broad rule. This may suit a metadata map, but it is not a substitute for known field schemas.

A warn-and-preserve design needs a side channel for unknown entries. The serializer must merge them back without letting them overwrite known canonical fields.

Acceptance tests should include key collision rules. Known fields must win or the operation must reject; silent replacement can change validated data.

The [SKILL.md guide](/blog/skill-md-format-guide) should name the policy and supported extension point. Authors need one place to check before adding custom data.

Migration should scan existing files and stored artifacts before enforcement. Report unknown key names and file counts, but avoid logging private values.

If compatibility, metadata, or allowed-tools gains local support, add each to types, parser, schema, serializer, API, and content output as needed. A partial addition can still lose data downstream.

Strict schema migration passes when read, validation, write, and publish outcomes match the stated policy. Old files should either remain valid or receive a clear, planned upgrade path.

## How do you test SKILL.md unknown field handling step by step?

Test SKILL.md unknown field handling by tracing one key through each public operation. Keep raw evidence beside typed results so data loss remains visible.

1. Read packages/shared/src/parsers/skill-parser.ts and packages/shared/src/schemas/skill-schema.ts, then list every currently owned frontmatter key.
2. Create known-only, future-scalar, nested-object, typo, and standard-field fixtures with identical valid required fields and body text.
3. Parse each source and assert frontmatter keys, unchanged raw text, and trimmed Markdown content as separate observations.
4. Run direct objects through safeParse, then inspect returned data rather than relying on success alone.
5. Serialize each parsed object, diff output against input, and apply the approved preserve, warn, strip, or reject policy.
6. Add read and round-trip cases to CI, then run them against seed files and the packed command before release.

At step one, treat the source list as current code evidence rather than a permanent standard. New fields should require an owned change.

At step two, quote scalar values that YAML might coerce. Type conversion should not distract from unknown-key behavior.

At step three, assert raw with exact key text and frontmatter with object checks. These views intentionally differ today.

At step four, include one direct extra key because parser mapping would otherwise hide Zod behavior. The [malformed parser guide](/blog/malformed-skill-md-frontmatter-parser-tests) can cover type and syntax failures elsewhere.

At step five, save a small semantic diff. Formatting changes may be acceptable, but loss of a key or value must follow policy.

At step six, use the [seed regression guide](/blog/seed-skill-catalog-parser-regression-tests) for real coverage. Synthetic fixtures remain the source of exact policy edges.

Run the procedure with the oldest supported tool and the proposed release. Version-to-version tests reveal whether an older save erases fields introduced by a newer package.

SKILL.md unknown field handling passes this process when each operation has a named result and no write can drop data without an expected warning or rejection. The saved proof bundle should show the source, typed view, warning, and final text for that result.

## SKILL.md unknown field handling rollout and regression checks

Rollout begins with a read-only scan for keys outside the owned list. Group results by key name, producer, and tool version without changing files.

Compare findings with the Agent Skills specification and QASkills product extensions. Some entries may be typos, while others may be valid fields that local code does not yet model.

Choose one policy per operation and publish it before enforcement. Read-only tools may warn, but any writer needs a stronger no-silent-loss rule.

Update parser, type, schema, and serializer tests in one change when adding passthrough. A gap in any one layer can still remove data.

Use the [publishing checklist](/how-to-publish) to place feedback before a database write. API and CLI behavior should give the same key path and action.

Run catalog controls through parse and serialize, then compare semantic frontmatter and body text. The [CI validation article](/blog/validate-skill-md-in-ci-pipeline) can make that diff a required gate.

Keep one test for a newly added supported field after migration. It proves that the field survives and prevents a later refactor from restoring fixed-list loss.

Keep one truly unknown field as well. A supported-field test cannot prove the general warning, strict, or passthrough rule.

Document whether raw remains the original source after typed transforms. Callers may use raw for audit display, but they should not mistake it for the text that serialization will emit.

Finish with a packed artifact test and one published content check. The [skill catalog](/skills) should show only data that the chosen model can preserve and explain.

### Run a mixed-version team trial

Create one test file with a newly supported field, then ask the old tool to read it, check it, and write only in dry-run mode. Record which acts pass, warn, block, or lose the field, since one broad old-tool label cannot describe all four paths.

Next, let the new tool read a known-only file made by the old tool and save it with no user change. The output should keep all known facts and body text, which proves the new field work did not break the common file form.

Give both tools the same file with one true typo and one valid new key, then compare the help each one gives. The new tool should tell those cases apart under the chosen rule, while the old tool should at least avoid a silent write that removes both.

Run the pair from clean folders with their own package and cache state, because a shared built module can make the old command load new code. Print tool versions and a safe fixture ID in each result so the trial can be run again by another team.

If the old tool must stay in use, publish a short block or warn rule that names the first file version it cannot write. This small guard is often safer than trying to make old code keep a field whose map, type, and merge rule it does not know.

Check the public file output after one new-tool publish and feed that text back into both readers. The round trip proves the site emits the same form that local tools see, while any old-reader gap becomes a known support fact rather than a user surprise.

Remove trial rows and files, then repeat with a new key name to prove no state from the first pass shaped the result. A clean second run is useful when temp output, cached parse data, or an old built file could hide the true rule.

Keep the final trial sheet with the release notes and the tests that enforce each claimed path. Future field work can then start from a small known set of read, warn, block, write, publish, and read-back facts without another round of guesswork or a risky first write against live author data for the whole team to review.

## Frequently Asked Questions

### What happens to Zod unknown keys today?

A direct call to the standard Zod object accepts extra keys and strips them from returned parsed data. For SKILL.md text, the fixed parser mapping drops unknown keys even earlier. Tests should inspect both paths because changing only schema mode would not make file round trips preserve extra data.

### Does frontmatter forward compatibility require passthrough?

Not always, because a product may choose strict rejection until it supports a new field. Forward-safe behavior requires that older tools avoid silent destructive writes. Preservation, warning plus preservation, or rejection can meet that goal when read, write, and publish operations state the same policy.

### Why can SKILL.md metadata passthrough fail after parse success?

parseSkillMd returns the original raw text and a separate typed frontmatter object. The raw text still includes unknown metadata, but serializeSkillMd writes only fields present in the typed object. A caller that parses and serializes can therefore remove metadata even though the initial read returned normally.

### How should unsupported skill fields appear in errors?

Report a stable frontmatter path or key name, a short policy reason, and one safe next step. Authors may need to remove the key, upgrade the tool, or use an approved metadata map. Avoid printing unknown values because they may contain private build or environment data.

### What must a strict schema migration test?

Test known keys, one unknown scalar, a nested object, key collisions, existing files, and a newly supported standard field. Verify parser, schema, serializer, CLI, and publish outcomes together. A strict Zod object alone is incomplete if the parser drops data before validation can report it.

## Conclusion

SKILL.md unknown field handling currently preserves extra data only inside raw source while typed parsing and serialization omit it. Choose a clear operation-level policy, then test direct schema input and full file round trips before changing field support.

Browse [published QA skills](/skills), follow [how to publish](/how-to-publish), and add the future-key round-trip test before a newer producer sends fields that older tools cannot keep. Save the four-view proof so each later field has a clear read and write baseline.`,
};
