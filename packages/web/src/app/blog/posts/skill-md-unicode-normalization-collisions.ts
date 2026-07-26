import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md Unicode normalization collisions',
  description:
    'SKILL.md Unicode normalization collisions: test normalization before identity checks. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md Unicode normalization collisions',
  keywords: [
    'SKILL.md Unicode normalization collisions',
    'Unicode NFC skill names',
    'confusable frontmatter metadata',
    'canonical equivalence slug collision',
    'international author normalization',
    'Unicode input validation',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'malformed-skill-md-frontmatter-parser-tests',
    'seed-skill-catalog-parser-regression-tests',
  ],
  sources: [
    'https://www.unicode.org/reports/tr15/',
    'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html',
  ],
  repoEvidence: [
    'packages/shared/src/schemas/skill-schema.ts',
    'packages/shared/src/utils/slug.ts',
  ],
  content: `SKILL.md Unicode normalization collisions should be tested by comparing canonical forms before validation, slug creation, uniqueness checks, and display. QASkills currently accepts general strings without normalization, then its slug helper drops non-ASCII characters. Characterization tests must expose those distinct outcomes before maintainers choose a normalization and identifier policy.

This guide uses escaped code points so fixtures stay ASCII in source control. The escapes still make real composed and decomposed strings when tests run. The goal is stable proof, not a claim that QASkills already applies an NFC step.

## What does SKILL.md Unicode normalization collisions need to prove?

SKILL.md Unicode normalization collisions must prove how text that is the same under NFC acts at every key boundary. Two strings can look the same to a reader while they hold different code-point runs. Tests should compare raw text, NFC text, schema results, slug output, and duplicate checks.

The first edge is \`packages/shared/src/schemas/skill-schema.ts\`. Its name, description, author, and license fields use plain Zod string rules. No step calls JavaScript \`normalize\`, so composed and decomposed forms stay just as supplied.

The second boundary is \`packages/shared/src/utils/slug.ts\`. The \`toSlug\` helper lowercases input, replaces each run outside ASCII letters and digits with a hyphen, then trims edge hyphens. It neither transliterates letters nor normalizes them first.

That order creates clear gaps. A precomposed accented final letter is dropped as one non-ASCII unit. A decomposed form can keep its ASCII base letter while dropping the mark, so names that match under NFC may make different slugs.

The contract must also split the NFC step from lookalike checks. NFC can make two forms of the same text equal, but it does not make Latin and Cyrillic lookalikes the same. Script rules and visual checks need their own tests if maintainers choose them.

Unicode's [normalization report](https://www.unicode.org/reports/tr15/) defines the canonical forms and stability model. OWASP's [input validation guidance](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) supports normalization before validation when free-form Unicode is accepted. Repository tests should record the exact form selected by product policy.

Use the [SKILL.md format guide](/blog/skill-md-format-guide) for the full field contract. This article stays with NFC, slug keys, and saved display text so results remain narrow and easy to trace.

A useful test shows both strings as escaped code points, then shows one raw match bit and one NFC match bit. It should also show each slug as plain ASCII text, which lets a reviewer see the full path from input to key. The log needs no special font and does not hide a mark that is hard to spot.

## Unicode NFC skill names: current repository behavior

Unicode NFC skill names currently pass the shared name schema if their JavaScript string length falls between one and one hundred. The same is true for decomposed names. \`packages/shared/src/schemas/skill-schema.ts\` does not trim, apply NFC, restrict scripts, or compare the two forms.

The baseline should start with \`'caf\\u00e9-checks'\` and \`'cafe\\u0301-checks'\`. JavaScript treats these strings as unequal before the NFC call. Calling \`normalize('NFC')\` on both makes them equal, which proves the fixture holds two forms of the same text.

Pass both through \`skillFrontmatterSchema.safeParse\` with all other fields valid. Both should succeed under current code. Inspect the returned \`data.name\` values and assert they still differ, showing that Zod did not change either input.

Then call \`toSlug\` on each name. The precomposed form yields \`caf-checks\` because the accented letter is outside the helper's ASCII class. The decomposed form yields \`cafe-checks\` because the base \`e\` remains while the combining mark becomes a separator.

These outputs are a baseline, not a recommended result. They show why checks, slug work, and duplicate rules cannot be tested alone. A schema pass does not ensure a stable package key after the later change.

A name containing only non-ASCII letters is another important baseline. It can pass the shared schema, while \`toSlug\` returns an empty string after replacement and trimming. Tests should assert that exact current output without describing it as accepted publication behavior.

Author fields need their own rule. The schema accepts names from many scripts up to one hundred code units and does not send them through \`toSlug\` in the cited code. Keep display text, but compare an NFC form where a true key match needs it.

Do not lower or map author display values just to align them with skill slugs. Keys and human-facing labels serve different goals. Tests should state which field uses NFC for a match and which raw value stays on screen.

The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) can run the cross-layer matrix. Keep direct schema and slug tests in the shared package, then add one publication fixture once policy is implemented.

The first CI row should use a composed name and the next should use its decomposed twin, while all tags and body text stay byte-for-byte the same. If any other field changes, a failed key check may point at the wrong cause. This twin setup turns a hard text bug into one plain before-and-after fact.

## Why does confusable frontmatter metadata change the contract?

Confusable frontmatter metadata changes the contract because visual similarity is broader than an NFC match. NFC joins two forms of the same abstract text. It does not decide whether signs from different scripts should share one key.

A safe design has three named steps. First, read text and apply the chosen NFC form. Second, check field syntax and length on that value. Third, make or compare keys while keeping the planned display value.

Current shared code has the field and slug steps, but no clear NFC step. The schema checks raw strings. The slug helper later uses lowercase and ASCII replacement, which can erase gaps or make unrelated outputs.

Testing only rendered text can miss this behavior. Two names may look identical in a review yet compare unequal. Conversely, two unrelated non-ASCII names may both reduce to an empty slug or the same short ASCII fragment.

Step order affects length rules. JavaScript string length counts UTF-16 code units, not the signs a user sees. A decomposed run can use more code units than its NFC form, so a length check first can reject one form while accepting the other near the edge.

The product must decide whether \`name\` is a strict ASCII package key or a broad display label. If it is a key, enforce the written key syntax and keep any display label apart. If broad text is allowed, define NFC, slug work, and duplicate checks as one design.

Author fields often need broad script support. Use NFC for a stable store or match if the rule needs it, but keep the author's chosen display text where possible. Add a mixed-script check only if the app uses that field for trust or a unique key.

Error text should not echo unseen marks with no clue. A test reason can include escaped code points, NFC match state, and the final slug. Public output can say that the name maps to an old key without showing hard-to-read raw text.

The [malformed frontmatter tests](/blog/malformed-skill-md-frontmatter-parser-tests) cover decoding and YAML structure. Unicode fixtures should use valid YAML and explicit escapes, so a failure belongs to normalization rather than parser syntax.

Do not fold a lookalike warning into the NFC duplicate error, since the two checks use different facts and call for different fixes. A true NFC twin needs one shared key, while a cross-script lookalike may be valid text that only needs review. Two reason codes keep that choice with the team and make test output clear.

## canonical equivalence slug collision test matrix

A canonical equivalence slug collision matrix should compare raw text, NFC text, current schema acceptance, and current slug output. It also needs a non-ASCII-only name and mixed-script author input. These cases expose different policy choices rather than one generic Unicode failure.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| NFC name | Precomposed \`caf\\u00e9-checks\` | \`packages/shared/src/schemas/skill-schema.ts\` | Schema accepts and preserves the raw value |
| NFD name | Decomposed \`cafe\\u0301-checks\` | \`packages/shared/src/utils/slug.ts\` | Current slug differs from the NFC input slug |
| Non-ASCII-only name | Escaped CJK name | Schema plus slug helper | Schema accepts, while current slug becomes empty |
| Mixed-script author | Latin plus escaped Cyrillic letters | Shared author field | Schema preserves input; policy review remains separate |

The first two rows must assert that both values map to the same NFC string. Without that control, a typo could make the fixture just look alike rather than hold the same text. Raw mismatch plus NFC match is the proof.

Current slug outputs should be exact. A broad check such as "both are strings" misses the key gap under study. Record \`caf-checks\` and \`cafe-checks\`, then update those results only when NFC or the slug rule changes.

The non-ASCII-only row catches empty identity output. It should not demand transliteration unless the product adopts a transliteration library and collision policy. The immediate proposed acceptance rule can simply reject an empty generated slug.

The mixed-script author row is not a slug test. It proves that the shared schema keeps valid world text and that NFC alone does not solve visual lookalikes. Keep any script warning as a separate rule result.

Add a length-edge pair after the core matrix. Build two NFC twin names whose raw code-unit lengths sit on each side of the schema limit, then compare checks before and after NFC. This case shows whether the chosen order runs the same way each time.

Use [seed catalog regression tests](/blog/seed-skill-catalog-parser-regression-tests) to discover actual canonical duplicates. Report escaped representations and package-relative paths so maintainers can review evidence without relying on font rendering.

Store the matrix as escaped source strings and assert the live strings only inside the test, which keeps diffs plain and the run true to real input. Add the raw code-unit count beside each row so a length failure has a clear cause. This data also helps review when a new runtime ships with newer text tables.

## How should international author normalization be verified?

International author normalization should verify saved display text, NFC matching, and a clean split from slug rules. Start with the shared schema baseline. The following test uses escapes, confirms an NFC match, and proves that current parsing leaves both names untouched.

\`\`\`typescript
import { expect, it } from 'vitest';
import { skillFrontmatterSchema } from '../src/schemas/skill-schema';

const base = {
  name: 'api-contract-checks',
  description: 'Checks API contracts with repeatable fixtures.',
  version: '1.0.0',
  license: 'MIT',
  tags: [],
  testingTypes: ['contract'],
  frameworks: [],
  languages: ['typescript'],
  domains: [],
  agents: [],
};

it('preserves canonically equivalent author strings today', () => {
  const nfc = 'Jos\\u00e9';
  const nfd = 'Jose\\u0301';
  const first = skillFrontmatterSchema.parse({ ...base, author: nfc });
  const second = skillFrontmatterSchema.parse({ ...base, author: nfd });

  expect(first.author).not.toBe(second.author);
  expect(first.author.normalize('NFC')).toBe(second.author.normalize('NFC'));
  expect(first.author).toBe(nfc);
  expect(second.author).toBe(nfd);
});
\`\`\`

This is a current-behavior test. It does not assert that keeping two raw forms is the final store rule. It gives the proof needed to review any later step added to the shared schema.

The cross-layer example measures schema and slug results for names. It includes a non-ASCII-only input without placing literal non-ASCII signs in the source. The expected values come straight from the current regular expression in \`packages/shared/src/utils/slug.ts\`.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { skillFrontmatterSchema } from '../src/schemas/skill-schema';
import { toSlug } from '../src/utils/slug';

const valid = {
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
  ['caf\\u00e9-checks', 'caf-checks'],
  ['cafe\\u0301-checks', 'cafe-checks'],
  ['\\u6771\\u4eac', ''],
])('current slug for escaped name', (name, expectedSlug) => {
  it('records schema acceptance and ASCII replacement', () => {
    expect(skillFrontmatterSchema.safeParse({ ...valid, name }).success).toBe(
      true,
    );
    expect(toSlug(name)).toBe(expectedSlug);
  });
});
\`\`\`

Add one target-rule test that calls NFC before any duplicate lookup. The test should compare NFC keys and then apply the chosen name rule. Keep it apart from the baseline until shipped code holds that step.

For author display, assert that the page uses the stored display value chosen by the rule. For an author key, compare NFC forms only if the product truly merges authors. Do not make a hidden author rule only inside a test.

SKILL.md Unicode normalization collisions also need a duplicate-store seam. Arrange two NFC twin names and prove the store checks one shared key. A unit test can use a fake lookup, while a joined test should use the real release path once built.

The [publishing instructions](/how-to-publish) provide that final boundary. Feed escaped fixtures through the same validator used for real packages, and retain escaped diagnostics in CI artifacts.

Add a display check after the key check, because a sound key does not prove that the page kept the text the team chose to show. The test can read the saved value and the page label without taking a full image. This small pair guards both the machine key and the human name without mixing their rules.

## Unicode input validation acceptance criteria

Unicode input validation passes when the NFC order and field rule are clear. Names that are the same under NFC must reach the key match in that same form. Tests should name the chosen form, with NFC as the base backed by the approved source.

Current behavior remains part of the proof. Both forms pass the shared schema unchanged, and current slug output can differ. Tests must label those results as a baseline until code applies NFC.

The name rule must choose strict package keys or broad text names. A strict key rule can reject non-ASCII signs before slug work. A broad text rule needs a stable slug or a separate opaque key, plus clash handling.

No accepted name may generate an empty identity key. If \`toSlug\` remains the publication helper, validate its output before persistence. An empty result should receive a stable name or slug diagnostic rather than a database uniqueness error.

NFC twins must be found before insert. Build the NFC key, query for that key, and return a stable clash result. Do not rely on screen text or raw JavaScript equality.

Length validation should run at the documented stage. If policy measures normalized code units, normalize first and assert both boundary forms together. If it measures user-perceived characters, use a suitable segmenter and document that larger change.

Author fields should keep valid world display text. NFC may make a match or store form, but tests should not apply the ASCII slug helper to author names unless code does so. Script lookalike checks need their own warn rule.

Errors should be safe and useful. Include escaped code points or an NFC-key hash in test logs, not unseen control signs. Public text should tell authors which field clashes and how to choose a distinct name.

The [skills directory](/skills) can supply manual examples, while repository fixtures establish automated truth. Scan existing packages before enforcing a new form so maintainers can distinguish deliberate international names from accidental duplicates.

A pass report should state that the raw strings differ, the NFC strings match, and the chosen key result is one of accept or clash. Those three facts are enough for audit and do not need a dump of each code point. When they stay side by side, a team can change display rules without losing the key rule.

## How do you test SKILL.md Unicode normalization collisions step by step?

Test SKILL.md Unicode normalization collisions by proving the fixture, recording current layers, and then asserting a chosen target rule. Escaped input keeps source files portable. Each step should expose its exact input and output.

1. Read \`packages/shared/src/schemas/skill-schema.ts\` and \`packages/shared/src/utils/slug.ts\`, then record their current order and transforms.
2. Create one composed and one decomposed name, then prove raw inequality and NFC equality.
3. Add isolated fixtures for a non-ASCII-only name, mixed-script author, and a length boundary near the current maximum.
4. Run every name through the shared schema and \`toSlug\`, recording exact current outputs.
5. Assert the proposed normalization key, empty-slug rejection, and canonical duplicate result in separate target-policy tests.
6. Add the matrix to CI and require escaped, package-relative diagnostics for every rejected or warning-only case.

The first assertion belongs to the test fixture itself. If the pair does not normalize equally, stop before testing application code. This control prevents a visually similar but unrelated pair from producing false evidence.

Next, test schema output and slug output on their own. One failed result then names either the field check or slug step. Cross-layer checks can follow after both local results are clear.

Add the duplicate rule through an injected store seam. Arrange no old key for the first NFC name and an old key for the second. Assert one accepted create and one stable clash result without depending on race timing.

Run a catalog report with both raw and NFC hashes. Avoid writing hard-to-read literal text into plain logs. The [seed catalog guide](/blog/seed-skill-catalog-parser-regression-tests) can keep that broad scan apart from focused unit cases.

Review the rule with language and package owners before blocking. Changing display text, strict package names, and mixed-script warnings have different user effects. Tests should not fold them into one true or false bit.

Finish in the [CI validation workflow](/blog/validate-skill-md-in-ci-pipeline). Run one real package through publication and confirm the same normalized identity key reaches uniqueness checks.

Keep the ordered run small enough to repeat on each runtime version used by the project. One composed twin, one decomposed twin, one all-non-ASCII name, and one mixed-script author can reveal the key gaps. A broad fuzz set may run later, but it should not replace these clear rows.

## SKILL.md Unicode normalization collisions rollout and regression checks

Roll out SKILL.md Unicode normalization collisions coverage as a baseline before any change. Capture current schema results, exact slugs, and groups that share an NFC key. This report gives maintainers proof for choosing strict ASCII names or a broad text key design.

Shared-schema owners should review NFC and length order. Slug owners should review empty output and clash behavior. Release owners should review key rules and how old rows move.

The minimum regression set includes composed and decomposed equivalents, non-ASCII-only input, mixed-script metadata, empty generated slug, boundary length, and canonical duplicate storage. Keep display assertions apart from identity assertions.

If NFC is introduced, avoid silently rewriting old keys during reads. Move stored keys with a reviewed script and clash report. Tests should prove old rows remain in reach through the chosen support path.

Slug changes can alter public routes, so do not switch algorithms as an incidental schema refactor. A new transliteration or Unicode slug policy needs redirect, uniqueness, and backfill tests. This article proposes evidence, not that migration.

Runtime upgrades need a fixed NFC test set. JavaScript NFC follows text data in the runtime, while a lookalike library may hold its own tables. Record versions in failed CI output when behavior changes.

Logs and snapshots must remain readable. Prefer escaped code points and expected ASCII slug strings. Reject accidental literal non-ASCII punctuation in test source if repository policy requires ASCII artifacts.

After any schema, slug, runtime, or release change, rerun [malformed frontmatter coverage](/blog/malformed-skill-md-frontmatter-parser-tests) and NFC fixtures. Valid text should not become a parser failure, and parser failures should not be mislabeled as key clashes.

When the broad scan finds a clash, add its shape to the small suite with made-up safe text that has the same code-point form. Do not keep a real author's name in a unit test when an escaped stand-in proves the same rule. This gives the team a lasting guard with less private data and a much clearer diff.

### NFC review evidence checklist

- Escaped source text for the composed and decomposed twin, with raw inequality and NFC equality proved before either value reaches the QASkills schema or slug helper
- The current result from \`packages/shared/src/schemas/skill-schema.ts\` for both twins, including proof that the parsed names stay raw and no hidden transform runs
- The exact \`caf-checks\` and \`cafe-checks\` outputs from \`packages/shared/src/utils/slug.ts\`, tied to the same input rows and the same runtime
- The Node runtime version used for each NFC call, so a text-data change after an upgrade has a clear base for review and repeat runs
- One name made only from escaped non-ASCII code points, with schema success recorded beside the empty slug that the current ASCII helper returns
- One mixed-script author row that stays out of slug checks, keeps its display text, and receives a separate review result from any NFC duplicate rule
- Raw code-unit counts before NFC and after NFC for the length-edge pair, with the chosen check order shown as a simple stage list
- One no-clash lookup for the first NFC key and one clash lookup for its twin, with the same fake store state used in both calls
- One accepted write call for a fresh NFC key and zero write calls for its twin, proving that the duplicate gate runs before a partial skill row can exist
- A saved display value check that is distinct from the key check, so the page can keep planned human text while the store uses one stable key
- A reason code for an empty slug, an NFC clash, and a mixed-script review, with each code tied to one fact and one clear next step
- Escaped test logs with no literal hard-to-see marks, no full user names, and no raw catalog data beyond a package-relative path and safe row label
- A catalog group for each shared NFC key, plus one named owner and move plan when old records would clash under the proposed store rule
- The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) gate, runtime version, raw match bit, NFC match bit, slug output, and next-write count in one compact record

## Frequently Asked Questions

### What should Unicode NFC skill names tests assert?

They should prove raw inequality, NFC equality, current schema preservation, and exact current slug output for composed and decomposed forms. A separate target-policy test should assert the normalized identity key. This sequence prevents a proposed transform from being reported as existing behavior.

### How does confusable frontmatter metadata affect the SKILL.md contract?

Canonical normalization and visual confusables are separate concerns. NFC combines equivalent encodings but does not resolve cross-script lookalikes. Define package identifier syntax, display preservation, and any mixed-script warning independently, then give each rule focused fixtures and reason codes. Keep their errors distinct.

### Which fixture best exposes canonical equivalence slug collision?

Use \`caf\\u00e9-checks\` and \`cafe\\u0301-checks\`. They compare unequal as raw strings, equal after NFC, and currently produce different QASkills slugs. Those three assertions show the exact gap between schema acceptance, canonical identity, and ASCII replacement. Keep all other fields fixed and escaped.

### When should teams check international author normalization?

Check it when parsing, storing, comparing, importing, or rendering author metadata. Preserve the selected display value and normalize only where policy requires comparison. Do not reuse skill slug rules for author names, because the cited repository code does not define that behavior.

### What is the pass criterion for Unicode input validation?

Canonically equivalent names must share the selected identity key, no accepted name may create an empty slug, and duplicate results must be deterministic. International display text remains preserved according to policy. Current schema and slug outputs stay documented as characterization until implementation changes.

## Conclusion

SKILL.md Unicode normalization collisions require cross-layer evidence before any migration. Add the composed-versus-decomposed slug test next, then choose normalization, package identifier, uniqueness, and display rules as separate reviewed decisions.

Open the [QASkills directory](/skills), inspect a published \`SKILL.md\`, then follow [how to publish](/how-to-publish) to apply this Unicode contract before publication. Start with one NFC twin pair and its two current slugs.`,
};
