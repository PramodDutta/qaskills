import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md token range invariants Guide',
  description:
    'SKILL.md token range invariants: enforce optional minimum and maximum ordering. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md token range invariants',
  keywords: [
    'SKILL.md token range invariants',
    'minTokens maxTokens validation',
    'Zod cross field refinement',
    'token budget ordering',
    'optional numeric range',
    'SKILL.md token invariant tests',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'malformed-skill-md-frontmatter-parser-tests',
    'seed-skill-catalog-parser-regression-tests',
  ],
  sources: ['https://zod.dev/api', 'https://agentskills.io/specification'],
  repoEvidence: [
    'packages/shared/src/schemas/skill-schema.ts',
    'packages/shared/src/types/skill.ts',
  ],
  content: `SKILL.md token range invariants should allow either bound to be absent, accept both bounds when minTokens is at most maxTokens, and reject reversed pairs. QASkills currently validates each optional value only as a number. Tests must characterize that independent behavior before adding a cross-field rule to the shared schema.

This guide keeps pair order apart from any future positive, whole-number, or real budget limits. The cited code defines two number fields that may be left out, but no link between them. A focused pair test should change only one fact at a time.

## What does SKILL.md token range invariants need to prove?

SKILL.md token range invariants must prove four states: neither bound, min only, max only, and both bounds. The first three are valid under the selected contract. The fourth is valid only when \`minTokens <= maxTokens\`.

The current schema in \`packages/shared/src/schemas/skill-schema.ts\` declares \`minTokens: z.number().optional()\` and the same rule for \`maxTokens\`. Zod checks each field on its own. It has no object rule that compares their values.

The current type in \`packages/shared/src/types/skill.ts\` models both fields as numbers that may be left out. That shape supports omission but cannot express value order in TypeScript alone. A valid typed object can still contain \`minTokens: 8000\` and \`maxTokens: 1000\`.

Tests need to preserve this gap between shape and the value link. Type checks prove which fields callers may supply. Runtime schema tests prove whether a real pair meets the chosen rule.

An equal pair is a key edge. A range with both values at 2000 should pass because the min does not exceed the max. Using a strict less-than check would reject a valid fixed budget without proof from the brief.

One-bound values should not gain made-up defaults during a check. Min-only can mean no stated upper bound, and max-only can mean no stated lower bound. The schema should compare only when both numbers are present.

Zod's [API reference](https://zod.dev/api) documents object refinements and issue paths needed for this rule. The [Agent Skills specification](https://agentskills.io/specification) provides the wider package context, while these token fields remain governed by the QASkills repository evidence cited here.

Use the [SKILL.md format guide](/blog/skill-md-format-guide) for other metadata requirements. This article isolates optionality and ordering so a failed test points to one numeric relationship.

A useful row prints whether each field was present, the two values when set, and the pass or fail bit from the shared schema. It should not print a fake zero for a missing field, since zero and absence are not the same fact. This small shape lets a reviewer see at once whether the test reached the pair rule.

## minTokens maxTokens validation: current repository behavior

Current minTokens maxTokens validation accepts any JavaScript numbers that Zod's number schema accepts by default. Leaving both values out succeeds. Supplying only one succeeds, and supplying a min above a max also succeeds because no field reads the other.

That result should be locked with baseline tests. A table can pass \`{}\`, \`{ minTokens: 1000 }\`, \`{ maxTokens: 4000 }\`, \`{ minTokens: 1000, maxTokens: 4000 }\`, and the reversed pair. All five succeed today when merged with otherwise valid frontmatter.

Non-number strings fail at their own field paths. A YAML parser may make a string for a quoted number, and the schema does not coerce it. Keep a quoted-number row outside the order table so type failure is not confused with a range failure.

The schema also places no clear whole-number, nonnegative, finite, or safe-range rule in the cited lines. Do not add those outcomes to the pair contract without a separate product choice. A focused guide should not claim that every number rule follows from \`min <= max\`.

JavaScript and Zod behavior around special numbers should be tested only where parsed input can produce them or programmatic callers can supply them. Frontmatter JSON-like values usually cover ordinary finite numbers. Direct schema callers can still pass values outside typical YAML output.

The TypeScript interface mirrors fields that may be left out but supplies no runtime guard. A test can assign a reversed pair to \`SkillFrontmatter\` and compile with no error. That fact shows why the shared Zod schema, not the interface, must enforce value order.

Current parsing returns values unchanged. There is no swap, clamp, or default in \`packages/shared/src/schemas/skill-schema.ts\`. A target rule should reject reversed input rather than sort it, because a swap can hide an author's wrong units.

Error text needs a chosen path. Attaching the issue to \`maxTokens\` says the upper bound is below the min. An object path is possible, but a field path is easier for forms and CLI text to mark.

The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) can enforce the final runtime contract. Keep interface compile checks and schema runtime checks distinct so each protects the layer it can actually observe.

Pair the runtime test with a compile-only sample that creates all four field shapes, including the reversed pair, and do not expect the type checker to reject values. The runtime suite should then reject just that last object under the target rule. Side-by-side tests make the limit of the type clear and stop a false claim that TypeScript enforces the pair.

## Why does Zod cross field refinement change the contract?

A Zod cross field refinement changes the check from two type checks to one object rule. It runs after field parsing and can inspect both values at once. That is the first point where runtime code can decide whether the pair is in order.

The code should guard absence with a direct check. If either value is \`undefined\`, no match runs and the object stays valid under this contract. Truthy checks are wrong because zero is a number and may be a valid edge if the rule allows it.

When both exist, compare with \`<=\`. Equal values pass, low-to-high values pass, and high-to-low values fail. The failure should use stable text and the \`maxTokens\` path so users know which side clashes.

Zod offers \`refine\` for a true or false check and \`superRefine\` for custom issues. Either can build this one rule. \`superRefine\` helps when the team wants a set code, path, and later checks without nested black-box tests.

Changing the exported object schema can affect how other schemas build on it. If code calls methods from a plain object schema, check those call sites after adding the rule under the installed Zod version. Tests should cover real exports instead of only a small stand-in.

The inferred TypeScript type remains two numbers that may be left out. Runtime rules do not make the compiler know that one value must not exceed another. State this limit so callers still check untrusted objects at runtime.

Error grouping can also change. A reversed pair with another bad field may produce both issues, based on parse success and rule execution. Keep the pair row valid in all other ways, then add one two-error case only if clients rely on joined output.

Do not swap values as a convenience. An input of minimum 8000 and maximum 1000 may reflect reversed units, copied fields, or a real misunderstanding. A stable failure asks the author to resolve intent rather than persisting a guessed correction.

The [malformed frontmatter guide](/blog/malformed-skill-md-frontmatter-parser-tests) covers syntax and type boundaries before refinement. Range tests should use valid YAML numbers so the cross-field branch actually runs.

Add a zero row even if the product has not yet chosen a positive-only rule, since it catches the common bug where code uses \`if (min && max)\`. Set min to zero and max to one, then expect the pair rule to run and pass. A second row with min one and max zero should run the same branch and fail.

## token budget ordering test matrix

A token budget ordering matrix needs omission, each one-sided range, equality, ascending values, and one reversed pair. The brief's four core cases appear below, with equality added as a named boundary in the executable suite.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| Both omitted | No token properties | Shared schema optional fields | Current and target schemas accept |
| Minimum only | \`minTokens: 1000\` | Optional lower bound | Target schema accepts without inventing maximum |
| Maximum only | \`maxTokens: 4000\` | Optional upper bound | Target schema accepts without inventing minimum |
| Reversed pair | Minimum 8000, maximum 1000 | Object-level ordering | Current schema passes; target refinement rejects |

The omitted row protects a no-default result. Parse output may omit both keys or include them as undefined based on object build, but the check should not create number values. Assert the fields are not assigned by the range rule.

Min-only and max-only rows catch tests that compare against zero or no limit without guarding absence. Such code can cause false failures or make new values. Direct \`undefined\` checks keep missing fields clear.

The reversed row must carry two results while code changes. Current \`skillFrontmatterSchema.safeParse\` succeeds. The proposed schema fails with one issue at \`maxTokens\`, making the rule gap clear.

Add \`{ minTokens: 2000, maxTokens: 2000 }\` as the equal edge. It should pass. Add \`{ minTokens: 1999, maxTokens: 2000 }\` as the nearest low-to-high whole-number case if that later rule is chosen.

A quoted-number control should fail before ordering. For example, \`minTokens: '1000'\` is not a number under the current schema. The result should remain a \`minTokens\` type issue, not a misleading range error.

Keep negative and decimal cases out of the main pass rule unless their use is approved. Record their current result in a separate baseline table if maintainers are choosing those limits. Pair order can be correct even when another number rule stays open.

The [seed catalog guide](/blog/seed-skill-catalog-parser-regression-tests) can discover existing reversed pairs before enforcement. Report package-relative names and both values, then ask owners to repair metadata instead of swapping it automatically.

Name each row by presence and order, such as \`none\`, \`min-only\`, \`max-only\`, \`equal\`, \`low-high\`, and \`high-low\`. That short label makes CI output easy to scan and gives the catalog report the same set of groups. When one row fails, a maintainer can rerun it without reading all token data.

## How should optional numeric range be verified?

An optional numeric range should first be verified against the code's exact schema. This example supplies full valid frontmatter, changes only token fields, and proves that every number order now succeeds. It also shows the interface and schema agree on field presence.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { skillFrontmatterSchema } from '../src/schemas/skill-schema';

const base = {
  name: 'api-contract-checks',
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
  {},
  { minTokens: 1000 },
  { maxTokens: 4000 },
  { minTokens: 1000, maxTokens: 4000 },
  { minTokens: 8000, maxTokens: 1000 },
])('current token fields %#', (tokenFields) => {
  it('characterizes independent number validation', () => {
    expect(
      skillFrontmatterSchema.safeParse({ ...base, ...tokenFields }).success,
    ).toBe(true);
  });
});
\`\`\`

The reversed result is an intentional baseline. It should not be flipped until shipped code uses a pair rule. This keeps docs and tests from claiming a guard that current users do not receive.

The target example extends an object with \`superRefine\`. It uses direct undefined guards, accepts an equal pair, and adds one custom issue to the upper-bound path. Shipped code can apply the same shape to the old object.

\`\`\`typescript
import { z } from 'zod';
import { describe, expect, it } from 'vitest';

const tokenRangeSchema = z
  .object({
    minTokens: z.number().optional(),
    maxTokens: z.number().optional(),
  })
  .superRefine(({ minTokens, maxTokens }, context) => {
    if (
      minTokens !== undefined &&
      maxTokens !== undefined &&
      minTokens > maxTokens
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxTokens'],
        message: 'maxTokens must be greater than or equal to minTokens',
      });
    }
  });

describe.each([
  [{}, true],
  [{ minTokens: 1000 }, true],
  [{ maxTokens: 4000 }, true],
  [{ minTokens: 2000, maxTokens: 2000 }, true],
  [{ minTokens: 8000, maxTokens: 1000 }, false],
])('target token range %#', (value, accepted) => {
  it('enforces ordering only when both bounds exist', () => {
    expect(tokenRangeSchema.safeParse(value).success).toBe(accepted);
  });
});
\`\`\`

Add an issue-detail assertion for the reversed row. Check that the path is \`maxTokens\` and the reason code is stable. Avoid snapshotting the full Zod error, which includes formatting not needed by the contract.

For a cross-layer type check, build min-only, max-only, and both-bound objects as \`SkillFrontmatter\`. The build should pass for all, including the reversed shape, because interfaces cannot encode value order. Runtime tests must then pass each object through the schema.

SKILL.md token range invariants need one parser-level row too. Write number YAML without quotes, parse it through the normal SKILL.md path, and assert number values reach the shared schema. A quoted control should fail as a type mismatch rather than be changed.

Use [how to publish](/how-to-publish) for the final integration. Submit a reversed pair through the package validator and assert publication stops with the selected field diagnostic before any artifact is created.

Place a spy at the next save seam in that joined test and assert zero calls for the reversed pair, since a late error could still leave part of a skill row. The ordered pair should make one call with both values unchanged. This pair proves that the gate runs soon enough and does not sort data as a side effect.

## SKILL.md token invariant tests acceptance criteria

SKILL.md token invariant tests pass when missing fields and pair order produce stable results. Neither bound, min only, max only, equal, and low-to-high pairs succeed. A min above the max fails with one stable upper-bound issue.

The rule must compare only when both values are set. It must not use truthy checks, because zero can vanish from such code. It must not add default bounds, because the current type and brief let both fields be left out.

Current broad acceptance remains on record. Before the change, the reversed pair passes \`skillFrontmatterSchema\`. After the change, update that baseline with a clear contract note and keep the target matrix as the lasting oracle.

The refinement should not coerce strings into numbers. Quoted numeric YAML remains a type error under current repository behavior. If coercion is ever desired, it needs separate tests for whitespace, empty text, decimal forms, and unsafe values.

Pair order should not imply a positive or whole-number rule. Negative and decimal pairs can still meet \`min <= max\`. Add those limits only through a separate approved change with direct edges and move proof.

The result should preserve unrelated field issues. A valid range must not hide a missing language, and an invalid range should not erase a version error if the schema can report both. Test one combined case only after isolated failures are stable.

The inferred \`SkillFrontmatter\` shape should still work with fields left out. No caller should need to supply a fake max when only a min is known. Build and type tests can guard that source-level support.

Catalog acceptance needs a scan for reversed pairs and non-number forms. Fix each package with care. Do not swap bounds during parsing, because that loses proof about which value the author meant.

Review [available QA skills](/skills) for examples of package metadata, while treating repository fixtures as the automated source. A displayed skill cannot prove every optional combination or failure path.

A waiver for an old reversed pair should name the skill, both values, one owner, and an end date, while all new reversed input still fails. Do not place a broad skip in the shared rule because that would hide fresh mistakes. A small allow list at the scan layer keeps old debt in view without weakening the package gate.

## How do you test SKILL.md token range invariants step by step?

Test SKILL.md token range invariants by moving from two field baselines to one object match. Keep all non-token fields valid. These ordered steps make the pair result the only fact that changes.

1. Read \`packages/shared/src/schemas/skill-schema.ts\` and \`packages/shared/src/types/skill.ts\`, then record current optional number behavior.
2. Create one smallest-valid frontmatter object with both token bounds omitted.
3. Add isolated fixtures for minimum only, maximum only, equality, ascending values, and minimum above maximum.
4. Run every object through the current schema, then run parsed numeric YAML through the normal validator boundary.
5. Apply the proposed object refinement and assert ordering only when both bounds are defined.
6. Add the matrix to CI and require one stable \`maxTokens\` issue for each reversed pair.

Begin with the schema baseline. The reversed row should pass today, while a quoted number should fail its field type. These controls prove the new test reaches the planned layer.

Build the pair rule on the exported schema or a reviewed shared part. Check old imports and inferred types after the change. Zod schema build rules can differ by version, so test real call sites rather than only the small example.

Add exact issue checks after boolean outcomes pass. One reversed pair should produce one ordering issue. If other invalid fields are present, confirm aggregation only where the user interface depends on it.

Run a seed catalog scan before blocking. The [seed regression guide](/blog/seed-skill-catalog-parser-regression-tests) can report reversed values, strings, and fields left out. Treat omission as valid rather than a missing-data fault.

Exercise publication through the [CI validation workflow](/blog/validate-skill-md-in-ci-pipeline). Confirm the package fails before storage or distribution and that the diagnostic points to the upper token bound.

Finally, rerun type checks for callers that build \`SkillFrontmatter\`. The interface should still allow each field shape, while runtime checks reject only bad real pairs.

Keep one short log line per row with its label, presence bits, values, issue path, and next-save call count. That data is enough to show both the rule and the gate without a full frontmatter dump. It also makes local and CI output match, which cuts guesswork when a package owner checks a failure.

## SKILL.md token range invariants rollout and regression checks

Roll out SKILL.md token range invariants with a read-only catalog report. Group omitted, one-sided, ordered, equal, reversed, and non-number values. Report package-relative locations and exact number pairs without changing them.

Shared-schema owners should review rule placement, issue path, and schema use. Type owners should confirm fields may still be left out. Release owners should review the point where runtime checks block bad packages.

The minimum regression suite contains both omitted, each single bound, equality, ascending values, reversed values, zero boundaries, and quoted numeric text. Keep negative and fractional expectations as characterization unless policy expands.

Build tests should cover shared exports after the rule lands. A schema wrapped by an effect can expose different methods in some Zod designs. Any build failure should lead to a planned schema shape, not removal of the runtime rule.

Error tests should assert a stable reason and \`maxTokens\` path. Avoid full snapshots of every issue field. This keeps tests focused when Zod changes formatting or adds metadata.

Do not auto-correct reversed values. A swap may appear safe but can hide unit mistakes or copied values. Return an error, show both bounds, and require the package owner to choose the intended range.

After schema changes, rerun [malformed frontmatter coverage](/blog/malformed-skill-md-frontmatter-parser-tests). Quoted numbers and broken YAML should keep their original failure categories rather than becoming generic ordering errors.

After type changes, rerun package builds and release integration. Runtime rules and compile-time shape are separate, so both gates are required. A green type check alone cannot prove pair order.

When the scan finds a reversed pair, add a small safe row with the same value shape before fixing the source file. The row should fail under the new rule and pass only after its numbers are put in the intended order. This turns one catalog fault into a lasting guard without keeping private package text in the test.

### Token range review evidence checklist

- Current shared-schema pass results for no bounds, min only, max only, low-to-high, equal, and high-to-low pairs with every non-token field held fixed
- A compile check that builds all six shapes as \`SkillFrontmatter\`, including the reversed pair, and records that type shape cannot enforce a value rule
- The target schema result for the same rows, with only the high-to-low pair changing from pass to fail after the object rule is added
- Direct \`undefined\` guards in the tested branch, backed by min-only and max-only rows that pass without fake zero, no-limit, or other default values
- A zero-to-one row that passes and a one-to-zero row that fails, proving both zero values reach the pair check instead of vanishing in truthy logic
- An equal pair at a clear token count, with proof that the rule uses less-than-or-equal semantics and does not reject a valid fixed-size range
- One nearest low-to-high whole-number pair and its reversed twin, which keep type and size fixed while order alone changes the final result
- A quoted min row and quoted max row that fail their own type paths before the pair rule, with no number coercion in parser or schema tests
- Parsed YAML number values reaching \`skillFrontmatterSchema\` as numbers, paired with quoted YAML text that keeps its distinct field-type error
- The stable \`maxTokens\` issue path, one short order reason code, and no full Zod error snapshot tied to unrelated format or package-version details
- Exact parsed values for every passing row, with no swap, clamp, sort, default, or write-time fix that could hide what the package author supplied
- Zero next-save calls for each reversed pair and one unchanged save call for each accepted pair, proving the range gate runs before any partial write
- One combined bad-field case only if a real client needs grouped errors, while all core pair rows keep the rest of frontmatter sound and easy to trace
- A build check for every current import of the shared schema after the object rule lands, including any call site that extends, picks, or infers from it
- A catalog group for omitted, one-sided, equal, ordered, reversed, and quoted values, with one owner and due date for each old reversed pair
- The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) gate, row label, presence bits, exact values, issue path, and next-save count in one compact record
- A peer review note that confirms the less-than-or-equal choice, states that zero and missing fields take distinct branches, names any open positive or whole-number rule as out of scope, and proves no parser, schema, or save seam swaps the two supplied bounds

## Frequently Asked Questions

### What should minTokens maxTokens validation tests assert?

They should assert valid omission, each one-sided range, equality, ascending values, and rejection when the minimum exceeds the maximum. Include a quoted-number control for type behavior. Keep positivity and integer constraints outside this suite unless separately approved. Add zero as a truthiness guard.

### How does Zod cross field refinement affect the SKILL.md contract?

It adds a runtime relationship after individual number parsing. The refinement can inspect both optional values and attach one issue to \`maxTokens\`. It does not change TypeScript's optional-number shape, so untrusted objects still require schema validation at runtime. Compile checks are not enough.

### Which fixture best exposes token budget ordering?

Use \`minTokens: 8000\` with \`maxTokens: 1000\`, paired with the ascending inverse and an equal pair. Current QASkills accepts all three. The proposed refinement rejects only the reversed case, isolating ordering from type and presence rules. Assert one max issue and no save call.

### When should teams check optional numeric range?

Check it during shared schema tests, SKILL.md parser integration, publication CI, and catalog imports. Run type checking too, but do not treat compilation as semantic validation. Recheck after Zod upgrades or schema composition changes. Keep a quoted-number control plus both zero-bound rows.

### What is the pass criterion for SKILL.md token invariant tests?

Omitted and one-sided bounds pass unchanged, equal and ascending pairs pass, and reversed pairs produce one stable \`maxTokens\` issue. No defaults or swaps occur. The \`SkillFrontmatter\` interface continues to model both numbers as optional. Failed rows make no save call.

## Conclusion

SKILL.md token range invariants need one object-level comparison while preserving optional fields. Add the reversed-pair characterization test next, then apply a defined-value refinement with equality, one-sided, parser, and publication coverage.

Open the [QASkills directory](/skills), inspect a published \`SKILL.md\`, then follow [how to publish](/how-to-publish) to apply this token contract before publication. Start with one equal pair and one reversed pair.`,
};
