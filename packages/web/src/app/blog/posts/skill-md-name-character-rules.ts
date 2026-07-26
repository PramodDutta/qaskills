import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md name character rules Tests',
  description:
    'SKILL.md name character rules: test identifier rules before slug generation. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Troubleshooting',
  primaryKeyword: 'SKILL.md name character rules',
  keywords: [
    'SKILL.md name character rules',
    'lowercase skill name regex',
    'consecutive hyphen validation',
    '64 character skill name',
    'invalid SKILL.md identifier',
    'skill slug name parity',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'malformed-skill-md-frontmatter-parser-tests',
    'seed-skill-catalog-parser-regression-tests',
  ],
  sources: ['https://agentskills.io/specification', 'https://zod.dev/api'],
  repoEvidence: [
    'packages/shared/src/schemas/skill-schema.ts',
    'packages/shared/src/utils/slug.ts',
  ],
  content: `SKILL.md name character rules should enforce a lowercase identifier of one to sixty-four characters, using letters, digits, and single internal hyphens. QASkills currently accepts any nonempty string up to one hundred characters, then transforms it during slug creation. Tests must expose that gap before a stricter schema is described as shipped.

This contract treats the frontmatter name as a package key, not a display title. It records the shared schema and slug helper on their own. A proposed regex then makes accepted names and slugs agree without a silent fix.

## What does SKILL.md name character rules need to prove?

SKILL.md name character rules must prove syntax, length, edge placement, and a cross-layer key. A valid name uses lowercase ASCII letters or digits, may place one hyphen between parts, and stays within the stated sixty-four-character limit. It cannot begin, end, or repeat a hyphen.

The current name field in \`packages/shared/src/schemas/skill-schema.ts\` is \`z.string().min(1).max(100)\`. That rule checks presence and JavaScript string length. It does not restrict uppercase letters, spaces, underscores, punctuation, non-ASCII text, or hyphen placement.

The later \`toSlug\` function in \`packages/shared/src/utils/slug.ts\` lowercases text and replaces every non-alphanumeric run with one hyphen. It also trims edge hyphens. As a result, several different accepted names can map to the same slug.

Tests need both facts. The schema baseline proves which raw names pass now. The slug baseline proves how accepted values change next, including case folding, dash collapse, and edge trim.

The target contract should reject bad names instead of relying on slug work to fix them. A silent fix hides author mistakes and makes the stored name differ from package routes. A direct name rule gives the author one stable error before storage.

The [Agent Skills specification](https://agentskills.io/specification) defines the identifier form used by this brief. Zod's [API reference](https://zod.dev/api) documents string length, regex, and refinement tools available for implementation. Tests should assert product outcomes rather than copying source documentation into messages.

This topic differs from folder matching. The [SKILL.md format guide](/blog/skill-md-format-guide) covers the wider document, while name character tests decide whether one string is a valid key before any folder match occurs.

A reviewer should see the raw name, the schema pass bit, the slug text, and the strict-rule pass bit in one row. Those four facts show whether code accepted the name, changed it, or rejected it without any guess about hidden state. Keep the rest of the skill data fixed so a failed row can point only to the name.

## lowercase skill name regex: current repository behavior

There is no lowercase skill name regex in the current shared schema. Names such as \`API Checks\`, \`api__checks\`, \`api--checks\`, and \`-api-checks-\` pass when their lengths fit the one-to-one-hundred range. The schema returns those strings unchanged.

That broad acceptance is a current fact, not a recommendation. A baseline suite should include each form and expect \`safeParse\` success. When the code adds a strict rule, the test names and commit history will show just which contract changed.

\`toSlug\` then transforms those values. \`API Checks\` becomes \`api-checks\`; \`api__checks\` also becomes \`api-checks\`; repeated hyphens collapse to one; and leading or trailing separators disappear. These collisions arise from the regular expression's replacement behavior.

A valid lowercase value such as \`api-contract-checks\` stays unchanged. That fixed point matters because it defines the skill slug match. A strict schema can accept only names for which \`toSlug(name) === name\`, though direct syntax and length checks still give clearer errors.

Length is another mismatch. The schema accepts sixty-five through one hundred characters, while the cited package rule stops at sixty-four. The slug helper imposes no maximum, so a long accepted name remains long after transformation.

Blank space deserves its own rows. A single space now passes \`min(1)\`, then becomes an empty slug after replace and trim. Leading or trailing spaces can also vanish while the middle text stays.

Do not infer validation from a usable slug. A name with uppercase characters can generate a neat lowercase slug, yet it still violates the selected identifier policy. The target test should reject the raw value before slug creation rather than accept the repaired output.

Error text should name the failed part. Length, allowed signs, repeated hyphens, and edge hyphens are easier to fix when they do not share one vague message. Tests can use stable reason codes while public text stays short.

The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) can enforce the final identifier rule. Keep fast schema and slug characterization in the shared package so a future helper change cannot silently alter package identity.

Add one control that sends a known good name through the same helper after each bad row, which proves that no test case left shared state behind. The good row should still pass and return the same slug each time, even when the prior input made an empty slug. This simple guard is useful if the helper later gains a cache or shared map.

## Why does consecutive hyphen validation change the contract?

Consecutive hyphen validation changes the contract from a change to a rejection. Today, \`api--checks\` passes the shared schema and becomes \`api-checks\` later. Under a strict name contract, the raw name should fail and need an author fix.

The gap matters because the slug map is many-to-one. \`api checks\`, \`API_CHECKS\`, \`api--checks\`, and \`api-checks\` can all make the same slug. If raw names differ in one layer but clash in another, store errors appear late and can be hard to explain.

The schema check is the first stable place to enforce the raw key. It has the name value and can report field issues before storage or routing. The slug helper can stay useful for display titles or old input, but valid skill names should already be fixed points.

One regex can express much of the syntax. It can require a lowercase letter or digit part followed by zero or more groups of one hyphen and another part. A separate max-length rule keeps edge errors clearer than one large expression.

Zod check order should be tested. If \`max(64)\` and \`regex\` both fail, issue order follows schema build order. Clients that show the first issue may rely on that order, so choose it with care and avoid full error snapshots.

Names beginning or ending with a hyphen are distinct boundary failures. A broad "contains hyphen" test would miss them because internal hyphens are allowed. Use \`-api\`, \`api-\`, and \`api-contract\` as a focused trio.

Digits also need position coverage. The selected rule allows digits inside identifier segments and, if the specification permits it, at the beginning. Tests should follow the cited rule exactly rather than assume names must begin with a letter.

A sixty-four-character skill name should pass when all signs meet syntax. A sixty-five-character form should fail only length. Build these inputs in code so test review can verify their count without hand-counting repeated text.

Use [malformed frontmatter tests](/blog/malformed-skill-md-frontmatter-parser-tests) for YAML-level failures. Name-rule fixtures should parse cleanly, allowing each result to identify syntax, length, or slug parity alone.

The clash test should seed one row with \`api-checks\`, then try each raw form that the old slug helper maps to that key. The strict rule should stop each bad form before any store call, while the good form should reach the fake store once. Count calls as well as results so a neat error cannot hide a late write attempt.

## 64 character skill name test matrix

The 64 character skill name matrix combines one valid identifier with case, repeated-hyphen, and edge-hyphen failures. Add exact length boundaries around the table. Every row should record current schema output, current slug output, and proposed strict output.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| Valid lowercase hyphens | \`api-contract-checks\` | Shared schema and slug helper | Current schema passes and slug equals name |
| Uppercase characters | \`API-contract-checks\` | Proposed name syntax | Current schema passes; strict rule rejects case |
| Consecutive hyphens | \`api--contract-checks\` | Proposed separator syntax | Strict rule rejects instead of collapsing separators |
| Leading or trailing hyphen | \`-api-contract-checks-\` | Proposed boundary syntax | Strict rule rejects both edge positions |

The valid row protects the accepted baseline. It should produce no name issue and should stay unchanged through \`toSlug\`. That exact match makes the cross-layer rule visible.

The uppercase row detects reliance on slug lowercasing. Assert current \`safeParse\` success and current lowercase slug, then assert proposed rejection. These three outcomes explain why neat slug output is not proof of valid input.

The repeated-hyphen row catches a regex that permits empty parts. A pattern based only on allowed signs can still accept \`--\`. Requiring a nonempty letter or digit part on each side removes that gap.

The edge row can be split into two table-driven cases in code. Keeping one conceptual row makes the policy easy to scan, while tests should report whether the leading or trailing position failed. Both currently trim to the same middle slug.

For length, make \`'a'.repeat(64)\` and \`'a'.repeat(65)\`. The first should pass the proposed rule, and the second should fail its length branch. The current schema accepts both because each stays below one hundred.

Add one all-invalid-symbol value and one whitespace value. Both currently pass if nonempty, and both can produce an empty slug. A publication guard should reject them at name validation and retain an empty-slug assertion as defense in depth.

The [seed catalog guide](/blog/seed-skill-catalog-parser-regression-tests) can reveal old names outside the new rule. Review each mismatch before blocking rather than adding broad gaps that make the key unclear.

Put the case name and its one changed trait in the test title, such as \`upper case\`, \`double dash\`, or \`right edge dash\`. A failed report then tells the author what to fix without a full schema dump. The test body can still assert the stable \`name\` path and reason code for tools that need them.

## How should invalid SKILL.md identifier be verified?

An invalid SKILL.md identifier should be verified against the real current schema before testing the proposed rule. The first example records broad acceptance and exact slug changes. It ties straight to both cited code files.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { skillFrontmatterSchema } from '../src/schemas/skill-schema';
import { toSlug } from '../src/utils/slug';

const base = {
  description: 'Checks API contracts with repeatable fixtures.',
  version: '1.0.0',
  author: 'qa-team',
  license: 'MIT',
  tags: [],
  testingTypes: ['contract'],
  frameworks: [],
  languages: ['typescript'],
  domains: [],
  agents: [],
};

describe.each([
  ['api-contract-checks', 'api-contract-checks'],
  ['API Contract Checks', 'api-contract-checks'],
  ['api--contract-checks', 'api-contract-checks'],
  ['-api-contract-checks-', 'api-contract-checks'],
  [' ', ''],
])('current name %s', (name, expectedSlug) => {
  it('records schema acceptance and slug output', () => {
    expect(skillFrontmatterSchema.safeParse({ ...base, name }).success).toBe(
      true,
    );
    expect(toSlug(name)).toBe(expectedSlug);
  });
});
\`\`\`

The blank row may look odd, but it follows \`z.string().min(1)\` just as written. Keep it as a baseline. The future schema can trim or reject it, while an empty-slug guard stays as a separate check.

The second example defines the target rule with Zod tools. It checks syntax and length without changing the shipped file in this article. The table includes valid edges and one failure for each banned form.

\`\`\`typescript
import { z } from 'zod';
import { describe, expect, it } from 'vitest';

const strictSkillName = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Use lowercase letters, digits, and single internal hyphens',
  );

describe.each([
  ['api-contract-checks', true],
  ['a'.repeat(64), true],
  ['a'.repeat(65), false],
  ['API-contract-checks', false],
  ['api--contract-checks', false],
  ['-api-contract-checks', false],
  ['api-contract-checks-', false],
])('strict identifier %s', (name, accepted) => {
  it('applies the proposed identifier contract', () => {
    expect(strictSkillName.safeParse(name).success).toBe(accepted);
  });
});
\`\`\`

Confirm the regular expression against the current Agent Skills source before it ships. If leading digits have a different rule, adjust that edge and add a clear row. Tests should reflect the approved source, not a guess based on package tools.

Add a cross-layer invariant for every accepted strict value: \`toSlug(name)\` must equal \`name\`. This assertion catches future slug changes that unexpectedly alter valid package identifiers. Rejected values do not need a repaired slug expectation in the final policy suite.

Keep current and proposed tests in separate describe blocks. A reviewer can then see why the stricter suite fails before production changes and which characterization assertions should be updated afterward. Avoid one table with conditional logic based on a feature flag.

SKILL.md name character rules also need stable issue paths. When built into \`skillFrontmatterSchema\`, bad input should report \`name\`. Assert the reason code or short rule text, not the full Zod error object.

Use [how to publish](/how-to-publish) for the package-level integration case. Submit one valid name and one repeated-hyphen name through the real validation command, then assert the latter never reaches persistence.

Run the sample with a spy on the next write seam and check that the bad name makes zero calls, since a rejection after slug creation may still be too late. The good name should make one call with the raw name and slug both set to \`api-contract-checks\`. This pair proves the gate and the match in one small flow.

## skill slug name parity acceptance criteria

Skill slug name parity passes when every accepted frontmatter name is already its own slug. The schema should reject values that need lower case, dash replacement, or edge trim. The slug helper should leave accepted names unchanged.

Length acceptance includes one and sixty-four characters when syntax is valid. Zero and sixty-five fail at named boundaries. Current one-to-one-hundred behavior remains documented as characterization until the shared schema changes.

Allowed characters are lowercase ASCII letters, digits, and one internal hyphen between nonempty segments. Spaces, underscores, uppercase letters, other punctuation, repeated hyphens, and edge hyphens fail the proposed identifier rule.

Each failed class needs a stable issue path and clear reason. One regex message can cover syntax, while a separate length issue handles max size. Tests should avoid a tie to each Zod format detail.

The strict rule should not call \`toSlug\` as its main check. Comparing output with input is useful as a cross-layer guard, but it gives poor reasons and can hide future helper changes. Check raw input first, then assert the match.

An empty generated slug remains a defensive failure even after strict validation. It catches callers that bypass the schema or a future refactor that invokes helpers in a different order. That guard should never repair or persist the invalid name.

Old catalog rows need a move choice. Report raw name, made slug, and failed class. Resolve clashes before changing route keys, since two old names may already reduce to the same value.

Folder identity remains a separate contract. A syntactically valid name can still disagree with its package directory. Run character validation first, then compare the accepted name with the directory so authors receive useful errors in a stable order.

Review the [skills directory](/skills) for representative identifiers, but rely on repository tests for acceptance. Displayed entries can reveal migration needs without defining the rule themselves.

A clear waiver list may be needed while old names move, but it should match full package paths and name text rather than a broad class of bad input. Give each row an owner and end date, then fail the scan when an unknown bad name appears. This keeps old debt from turning into a permanent hole in the new gate.

## How do you test SKILL.md name character rules step by step?

Test SKILL.md name character rules by recording current acceptance, defining exact syntax, and proving the slug match. Keep length and dash changes apart. The ordered steps below preserve a clear cause for each failed check.

1. Read \`packages/shared/src/schemas/skill-schema.ts\` and \`packages/shared/src/utils/slug.ts\`, then record current limits and transformations.
2. Create one smallest-valid frontmatter object with \`api-contract-checks\` as its accepted name.
3. Add isolated fixtures for uppercase text, repeated hyphens, edge hyphens, whitespace, and sixty-four versus sixty-five characters.
4. Run every value through the current schema and \`toSlug\`, recording exact characterization results.
5. Run the same values through the proposed strict rule and assert slug equality for every accepted name.
6. Add the matrix to CI and require stable \`name\` diagnostics for every rejected or warning-only case.

Start with the current table so a policy change has a measured baseline. Confirm that broad values pass and that transformations match the helper's source. If an expectation differs, inspect the regex rather than adjusting the test to a preferred outcome.

Build length and syntax as clear schema steps. Put them in the chosen order and assert edge-specific issue paths. One shared Zod schema is easier to reuse than checks spread across release handlers.

Add the match rule after strict cases pass. Make a set of valid names from lowercase parts and assert \`toSlug(name) === name\`. Keep a fixed example table beside broad checks so failures stay easy to grasp.

Scan seed and published names before enforcement. The [seed regression guide](/blog/seed-skill-catalog-parser-regression-tests) can classify uppercase, separator, length, and empty-slug mismatches. Do not silently rewrite collisions.

Run one package through the [CI validation workflow](/blog/validate-skill-md-in-ci-pipeline). Confirm invalid names stop before storage or route generation. This integration case proves the shared rule is actually used by publication.

Finally, combine the strict name check with folder matching in a separate suite. Syntax should fail before the folder match when the raw name cannot be a package key. This order gives authors the most direct fix.

The run log needs only the row label, raw name, slug, reason code, and next-seam call count in one short line. Do not print the whole file or all frontmatter for a name rule failure. This small shape works in local runs and CI, and it makes side-by-side old and new results easy to read.

## SKILL.md name character rules rollout and regression checks

Roll out SKILL.md name character rules with a catalog class report. Count failures by upper case, spaces, underscore, repeated hyphen, edge hyphen, excess length, and empty slug. Include package-relative paths and avoid forced edits during the scan.

Shared-schema owners should review syntax and issue order. Slug owners should review the match and clashes. Release owners should review move timing because name changes can affect routes, links, and installed package refs.

The smallest regression suite contains valid lowercase segments, digits, one internal hyphen, sixty-four characters, sixty-five characters, uppercase, spaces, repeated hyphens, both edge hyphens, and symbol-only input. Each invalid row has one main cause.

Broad tests can add depth after the table is stable. Make names from the accepted grammar and assert schema success plus slug match. Change one trait at a time for rejected classes so a small failed case stays easy to read.

Do not repair names inside validation. A transformation can create collisions and hide the author's input. Return a stable diagnostic and let an explicit migration or author edit choose the final identifier.

When changing \`toSlug\`, rerun all strict valid names. The helper may serve wider input elsewhere, but it must return accepted skill names as they are. Any gap needs a reviewed package contract change.

When changing the schema, rerun [malformed frontmatter tests](/blog/malformed-skill-md-frontmatter-parser-tests). A new name error should not hide missing languages, testing types, or invalid versions. Assert issue paths rather than one total error count where multiple fields fail.

After migration, keep legacy collision fixtures. They explain why strict input exists and protect compatibility code from accidental removal. Remove redirects or aliases only through an explicit route lifecycle decision.

When the scan finds a new bad shape, add one small row that copies the shape but not any private author text. Make that row fail before the data fix and pass after the owner picks a sound name. This turns a one-time find into a guard and keeps the reason for the strict rule close to the code.

### Name rule review evidence checklist

- Current schema pass results for a sound lowercase name, upper case, spaces, underscores, double hyphens, both edge hyphens, blank space, and a symbol-only value
- Exact current slug output for every baseline row, with all rows tied to \`packages/shared/src/utils/slug.ts\` rather than a copy of its regular expression
- A one-character name that passes both the proposed syntax and length checks, proving that the lower edge did not move while the upper edge became stricter
- The sixty-four and sixty-five character rows made in code, with their exact lengths in the row labels and no hand-counted string hidden in a fixture file
- One lowercase letter-and-digit name, one digit at each allowed position, and one internal single hyphen that prove each positive part of the chosen grammar
- An upper-case row that fails the strict rule before \`toSlug\` can lower it, with zero next-write calls and the old lower-case slug kept as baseline proof
- A space row and underscore row that both map to the same old slug, yet receive distinct row labels and the same stable syntax reason under the new rule
- A double-hyphen row that cannot pass through an empty name part, paired with the single-hyphen form that remains a fixed point through the slug helper
- Separate left-edge and right-edge hyphen rows, because one broad edge test can pass while the other side is still accepted by a weak pattern
- A blank-space row and a symbol-only row that show current schema success, current empty slug output, proposed name failure, and zero store calls
- A fixed-point check for each accepted name where raw name, parsed name, and slug are byte-for-byte equal with no trim, lower case, or dash repair
- A collision set that maps several old raw names to \`api-checks\`, with the strict gate stopping every bad form before the fake unique store runs
- The stable \`name\` issue path and one reason code for syntax or length, without a full Zod snapshot that can change when unrelated fields gain checks
- Name syntax before folder matching in the joined test, so a bad raw key gets the direct repair message and never creates a second folder mismatch error
- A catalog count by upper case, white space, underscore, double dash, edge dash, excess length, and empty slug, with one owner for each old row
- The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) gate, raw name, strict pass bit, exact slug, issue code, and next-write count in one short record
- A peer review note that names the chosen source rule, confirms the regex and sixty-four-character edge against that source, lists any old package waiver by full path, and states that no test or release code repairs a bad name before the author sees the stable field error

## Frequently Asked Questions

### What should lowercase skill name regex tests assert?

They should assert lowercase letters, digits, single internal hyphens, and the one-to-sixty-four length boundary. Include uppercase, spaces, underscores, repeated hyphens, and both edge positions. For every accepted value, also assert that \`toSlug\` returns the input unchanged. Check the name issue path.

### How does consecutive hyphen validation affect the SKILL.md contract?

It changes repeated separators from silently repaired input into a clear validation failure. Current \`toSlug\` collapses \`api--checks\` to \`api-checks\`, which can collide with an existing name. Strict validation makes the author choose the intended identifier before persistence. No write should run.

### Which fixture best exposes 64 character skill name?

Use \`'a'.repeat(64)\` as the accepted boundary and \`'a'.repeat(65)\` as the rejected neighbor. Both satisfy character syntax, so only length changes. Current QASkills accepts both, which cleanly distinguishes characterization from the proposed specification limit. Assert their exact counts and keep all other data fixed.

### When should teams check invalid SKILL.md identifier?

Check it during shared schema validation, publication CI, catalog imports, and any route-generating flow. Run it before folder matching and slug persistence. Early rejection gives authors a direct name error instead of a later collision or empty-route failure. Keep one valid control.

### What is the pass criterion for skill slug name parity?

Every accepted frontmatter name must satisfy the strict identifier grammar and equal its \`toSlug\` result exactly. Invalid names produce a stable \`name\` issue, no empty slug reaches storage, and current broad acceptance remains labeled as historical characterization. Bad rows make no write call.

## Conclusion

SKILL.md name character rules should reject invalid package identifiers before slug generation can alter them. Add the repeated-hyphen characterization test next, then implement the sixty-four-character syntax rule and require parity for every accepted name.

Open the [QASkills directory](/skills), inspect a published \`SKILL.md\`, then use [how to publish](/how-to-publish) to apply this identifier contract before publication. Start with one double-dash name and one exact slug match.`,
};
