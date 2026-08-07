import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Malformed SKILL.md Frontmatter Testing',
  description:
    'Malformed SKILL.md frontmatter testing separates YAML parse failures from Zod schema errors, checks diagnostics, invalid scores, and recovery cases.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'malformed SKILL.md frontmatter testing',
  keywords: [
    'malformed SKILL.md frontmatter testing',
    'invalid YAML diagnostic',
    'SKILL.md parser failure',
    'Zod frontmatter error',
    'missing metadata field test',
    'malformed delimiter case',
    'validator error stability',
    'SKILL.md recovery test',
  ],
  relatedSlugs: [
    'testing-markdown-xss-react-markdown-rehype-sanitize',
    'testing-skill-md-yaml-frontmatter-roundtrip',
    'skill-md-csv-yaml-array-normalization-tests',
    'agent-skill-dangerous-command-static-analysis-tests',
  ],
  sources: [
    'https://github.com/jonschlinkert/gray-matter',
    'https://yaml.org/spec/1.2.2/',
    'https://zod.dev/error-formatting',
  ],
  content: `
Malformed SKILL.md frontmatter testing separates YAML syntax failures from valid YAML that violates the skill schema. A strong suite checks stable parser messages, field-level schema issues, zero trust scores for invalid input, delimiter mistakes, and clean recovery after the author repairs the file.

QASkills parses packages before validation, so one broken delimiter or quote can stop every later field check. Read the [SKILL.md format guide](/blog/skill-md-format-guide), then use the [Playwright CLI skill](/skills/Pramod/playwright-cli) as a known valid control while small fixtures isolate each fault.

## What Makes an Invalid YAML Diagnostic Useful?

An invalid YAML diagnostic is useful when it tells the author which stage failed, points to the frontmatter boundary, stays stable across parser upgrades, and avoids claiming that schema validation ran. It should not expose raw secrets or bury the fix under a package stack trace.

The validator currently catches any parse exception and returns one local message: "Failed to parse SKILL.md frontmatter." It marks the result invalid, clears warnings, and sets every quality field to zero. That is a sound trust boundary, though the message could later include a safe line and column.

\`\`\`typescript
try {
  parsed = parseSkillMd(raw);
} catch {
  return {
    valid: false,
    errors: [
      {
        field: 'frontmatter',
        message: 'Failed to parse SKILL.md frontmatter',
      },
    ],
    warnings: [],
    qualityScore: 0,
    qualityBreakdown: {
      schema: 0,
      documentation: 0,
      completeness: 0,
      freshness: 0,
      total: 0,
    },
  };
}
\`\`\`

Test the public result rather than the exact gray-matter exception. The [gray-matter documentation](https://github.com/jonschlinkert/gray-matter) explains parsing behavior, but its lower-level wording can change by version. QASkills owns the stable field, local message, validity flag, and score.

| Failure stage | Example input | Expected public result | Score |
| --- | --- | --- | --- |
| YAML syntax | Unclosed quote | Frontmatter parse error | Zero |
| Delimiter layout | Missing closing marker | Defined parser or body result | Tested policy |
| Schema shape | Missing name | Field-specific issue | Must not imply quality |
| Schema value | Unknown test type | Field-specific issue | Must not imply quality |
| Content warning | Short valid body | Warning, not parse error | Validity follows schema |

Keep the diagnostic short, then place safe parser detail in developer logs if needed. Logs should avoid full files because frontmatter may contain private repository URLs or author data. The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) can show the same local message beside the file path.

Malformed SKILL.md frontmatter testing also needs valid controls near each failure. A parser that rejects all files would otherwise satisfy only negative assertions. The control proves the suite can distinguish legal quoted punctuation from broken syntax.

Give each failed file a short case ID that stays the same when line numbers shift, and print that ID beside the path. A stable ID lets support staff find the same test rule without copying the whole bad file into chat or an issue.

If safe line data is available, show one line before and after the fault with values masked by field policy. Keep the full raw file in a local test artifact only, since normal build logs often remain visible for far longer.

Test the diagnostic through the CLI or API layer that users see, not just through a direct function call. The outer layer should keep the same field and score while it adds a file name, status code, or command exit code.

## How Do You Trigger a SKILL.md Parser Failure?

A SKILL.md parser failure needs text that gray-matter cannot parse as YAML inside a recognized frontmatter block. Use one syntax fault per fixture, then call validateSkillContent and parseSkillMd separately to check the raw exception path and the stable validator result.

The [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/) defines quoted scalars, escapes, mappings, sequences, and indentation. Pick failures based on those rules instead of random corrupt bytes. Good cases include an unclosed quote, an invalid double-quote escape, a broken flow sequence, and a mapping with bad indentation.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { parseSkillMd } from '@qaskills/shared';
import { validateSkillContent } from './index';

const syntaxCases = [
  ['unclosed quote', 'name: "Browser QA'],
  ['invalid escape', 'description: "bad \\q value"'],
  ['broken flow list', 'tags: [e2e, api'],
  ['broken mapping', 'name:\\n value: Browser QA'],
] as const;

describe('SKILL.md parser failure', () => {
  it.each(syntaxCases)('reports %s as a frontmatter parse error', (_name, line) => {
    const raw = \`---\\n\${line}\\n---\\n\\nValid body text for this isolated parser test.\`;

    expect(() => parseSkillMd(raw)).toThrow();
    expect(validateSkillContent(raw)).toMatchObject({
      valid: false,
      errors: [
        {
          field: 'frontmatter',
          message: 'Failed to parse SKILL.md frontmatter',
        },
      ],
      warnings: [],
      qualityScore: 0,
    });
  });
});
\`\`\`

Do not use merely invalid domain data in this table. \`testingTypes: [unknown]\` is valid YAML and should reach Zod. Mixing syntax and schema rows leads to vague tests and wrong fixes.

Assert that later checks do not run after a parser exception. The result should not contain short-content warnings, dangerous-command warnings, or schema field issues because there is no trusted parsed object. This keeps one root cause visible.

The [high-quality QA skill guide](/blog/how-to-write-high-quality-qa-skills) supplies a normal body and metadata shape for controls. Keep the body long enough that unrelated warnings do not distract from the parser assertion.

Run parser failure tests in both shared and validator packages when practical. The shared test protects thrown behavior, while the validator test protects the user-facing conversion to a stable result.

Malformed SKILL.md frontmatter testing should save the smallest failed sample. Small fixtures make package upgrades easier to review and prevent one accidental second fault from masking the first.

## How Do You Preserve a Zod Frontmatter Error?

A Zod frontmatter error should appear only after YAML parsing succeeds and the normalized object violates a schema rule. The validator maps each issue to its field path and message. Tests should assert the field, issue class where exposed, and a helpful message fragment.

Use the [Zod error formatting guide](https://zod.dev/error-formatting) to understand issue paths and readable output. QASkills currently iterates the issues array and joins each path with a dot. A test should protect that local mapping instead of importing a separate formatter.

\`\`\`typescript
const schemaResult = skillFrontmatterSchema.safeParse(parsed.frontmatter);

if (!schemaResult.success) {
  for (const issue of schemaResult.error.issues) {
    errors.push({
      field: issue.path.join('.'),
      message: issue.message,
    });
  }
}
\`\`\`

Create valid YAML with one bad field. Cases should cover missing required text, text that is too short, an invalid semantic version, no required testing type, no required language, and unsupported enum values. Keep all other fields valid.

The current validator continues after schema failure and calculates a quality score. That can yield a nonzero score for invalid metadata. Treat this as a defect target: tests should require zero or a clearly non-publishable score whenever \`valid\` is false.

Do not change the test to accept a high score because current code returns one. A quality number can be displayed or sorted elsewhere, so it must not imply trust in an invalid skill. Fix scoring or gate its use after the test exposes the issue.

The [frontmatter schema guide](/blog/cursor-skill-md-frontmatter-schema-guide) helps map author fields to test rows. Use one public term in each failure message so authors can repair files without reading TypeScript.

Malformed SKILL.md frontmatter testing needs both syntax and schema paths in one matrix report. They may share a final invalid status, but the next action differs: fix YAML structure first, then fix field values.

## Add a Missing Metadata Field Test

A missing metadata field test removes one required field from otherwise valid YAML and checks the exact field path. It must distinguish omission from an empty string, null, wrong type, and an empty required list because each input can normalize differently.

Start with name, description, testingTypes, and languages because the schema requires useful values there. Version, author, and license may receive parser defaults, so test their documented behavior rather than assuming omission fails.

Build one valid fixture and remove lines through a small helper. Avoid free-form string replacements that can delete similar text in the body. A fixture builder or array of frontmatter lines gives precise control.

Useful rows include:

- Omitted name should create a name issue after the parser supplies an empty string.
- Empty name should create the same field issue but preserve source context in logs.
- Omitted description should fail its minimum length rule.
- Empty testingTypes should fail the minimum item rule.
- Missing languages should fail the minimum item rule.
- Null required lists may normalize to empty arrays and need a clear issue.
- A numeric name may expose parser coercion or schema type behavior.

Check \`valid\` and the errors array together. A field error with \`valid: true\` would break the API contract. An invalid result with no field issue would leave the author without a repair path.

Do not demand one exact English message across every Zod patch unless QASkills promises it. Assert stable local field paths and meaningful fragments, or map library issues to owned error codes before exposing them.

The [QA skills directory](/skills) should never list invalid seed metadata as ready to install. Add the missing-field matrix before seed import, API publication, and artifact creation.

Malformed SKILL.md frontmatter testing should verify that no generated quality score outranks valid skills. A zero score or absent score is safer than a number based on partial data.

## Cover a Malformed Delimiter Case

A malformed delimiter case tests the three-dash lines that separate frontmatter from the Markdown body. Missing, repeated, indented, or misplaced markers can make metadata become body text or make body text look like YAML.

Gray-matter recognizes a frontmatter block at the start of the file. The exact behavior for a missing closing marker should be captured as a parser contract. Do not assume it throws until the test proves what the installed version does.

Add cases for:

- No opening delimiter at all.
- An opening delimiter with no closing delimiter.
- A closing delimiter with leading spaces.
- Four dashes instead of three.
- A byte order mark or blank line before the opening delimiter.
- A valid second \`---\` inside the Markdown body.
- A fenced code sample that contains delimiter text.
- An empty frontmatter block with a normal body.

For each row, inspect parsed metadata, body text, validator status, and score. If gray-matter treats text as body rather than throwing, schema validation should still reject missing required metadata. That is a schema path, not a parser exception.

\`\`\`typescript
it.each([
  ['missing open', 'name: Browser QA\\n---\\n\\nBody'],
  ['missing close', '---\\nname: Browser QA\\n\\nBody'],
  ['four dashes', '----\\nname: Browser QA\\n----\\n\\nBody'],
])('captures malformed delimiter case: %s', (_name, raw) => {
  const result = validateSkillContent(raw);

  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
  expect(result.qualityScore).toBe(0);
});
\`\`\`

That last score assertion may fail on a delimiter form that parses as body and then gets schema issues. Keep it as the desired trust rule and repair the validator. The test should not pretend invalid metadata has earned quality.

The [SKILL.md format guide](/blog/skill-md-format-guide) shows the one supported delimiter layout. Error output should point authors there without trying to auto-repair ambiguous files.

Malformed SKILL.md frontmatter testing should include a valid body containing \`---\`. A broad delimiter checker must not reject a horizontal rule or code example after the frontmatter has closed.

## Assert Validator Error Stability

Validator error stability means the same fault keeps a stable public category, field path, validity result, and trust score across dependency upgrades. The low-level parser message may change, but callers should not need to rewrite every integration.

Define owned codes if clients depend on machine-readable errors. Text such as "Failed to parse SKILL.md frontmatter" works for people but is brittle for automation. A code like \`frontmatter_parse_failed\` can remain stable while a safe detail changes.

Test arrays without relying on issue order when several fields fail. Zod may report issues in schema order, yet the public contract can sort by field or compare a set. For one-fault fixtures, exact arrays are easy and useful.

Keep warnings separate from errors. A long valid file, a short body, and a suspicious command pattern produce warnings in the current validator. They should not replace parser or schema errors, and parse failures currently return before warnings.

Snapshot only a small normalized result. Large snapshots tend to hide a field moving from errors to warnings or a score becoming nonzero. Direct assertions show the trust decision.

Create one contract test for every caller that turns the result into JSON, terminal text, or page copy. All callers may add their own frame, but none may drop the invalid flag, field path, zero-score rule, or safe next step.

Sort multi-field errors only at an owned boundary, then test that sort with names that make the order plain. Stable order helps users fix one file, yet it should not depend on the private order in which a library walks its schema.

The [Agent Skills portability guide](/blog/agent-skills-open-standard-portability) helps explain why stable errors matter. Editors, CI tools, and agents need one result even when they use different ways to create a package.

Malformed SKILL.md frontmatter testing should run against the supported Node and package versions. If a parser update changes valid syntax, review YAML rules and compatibility before changing the owned result.

Add one test that passes an Error with unusual text from a mocked parser only if dependency injection exists. Never display arbitrary exception text without a redaction policy.

## Build a SKILL.md Recovery Test

A SKILL.md recovery test begins with one invalid file, applies the smallest author repair, and proves the next validation run is independent and valid. This catches leaked state, cached parser data, and fixes that silence one error while leaving damaged metadata.

Use paired fixtures where the broken version might have an unclosed quote, while the repaired version adds that quote and changes nothing else. Assert the first result is a parse error with zero score, then assert the second reaches schema and content checks.

For a schema repair, start with a missing language and add one supported language. The repaired file should preserve all other fields and the body. Do not rebuild it from a separate template because unrelated changes weaken the comparison.

Recovery cases should include:

- Close an unterminated scalar without changing its text.
- Repair list indentation while preserving item order.
- Add a missing required field with a valid value.
- Replace an unsupported enum value with a supported one.
- Restore the closing delimiter without dropping body content.
- Quote a colon or hash so the parsed value remains exact.

Check that a prior parse failure does not leave warnings or errors in the next result. validateSkillContent creates fresh arrays on each call, so a direct repeated-call test protects that design.

The [guide to writing high-quality QA skills](/blog/how-to-write-high-quality-qa-skills) gives authors a final review list after recovery. The test should still verify code behavior rather than trust a manual edit.

Malformed SKILL.md frontmatter testing gains value from recovery because it proves the diagnostic points to a real path back to valid content. A test that only rejects input can support a validator that no author can satisfy.

Keep recovery local and deterministic, and do not call a remote formatter, registry, or AI model to fix YAML during validation. A formatter can be a separate opt-in tool with its own round-trip tests.

After the repair passes, compare the parsed body and all fields not named in the fix with their values from a safe base fixture. This guards against a broad auto-fix that solves one quote while it drops tags, changes a version, or trims useful body text.

Run the same recovery pair twice in one process and once in a fresh process during the package smoke test. Both paths should yield the same result, which proves no failed parse leaves shared state that can taint the next file.

## Run the Diagnostic Procedure

Run the diagnostic procedure for parser, schema, delimiter, warning, and recovery cases whenever gray-matter, YAML dependencies, shared schemas, quality scoring, or error mapping changes. Keep one clean control beside the fault table so each run proves that valid files still pass through the same package and process.

1. Build one known valid SKILL.md with every required field and a normal body.
2. Introduce one syntax, delimiter, shape, or value fault for each named row.
3. Call parseSkillMd when the raw parser behavior matters and record whether it throws.
4. Call validateSkillContent and assert validity, error fields, warnings, and quality score.
5. Prove parser failures return before schema, content, safety, and score checks.
6. Prove schema failures retain field issues and cannot receive a trusted quality score.
7. Apply the smallest repair and rerun validation with no shared state.
8. Run one valid seed skill as a broad control after every case table.
9. Save any new minimal failure as a permanent fixture with a short reason.

Use fake files only for validateSkillFile coverage. Most cases can call validateSkillContent in memory, which keeps the matrix quick. One file test should prove UTF-8 reading and path resolution.

Run the [Playwright CLI skill](/skills/Pramod/playwright-cli) as the named seed control and discover other seeds dynamically. Do not edit seed files during tests.

Report one stage per case. Labels such as parse, schema, content warning, and safety warning help owners choose the right fix. A single "invalid skill" bucket slows repair and hides score defects.

Keep malformed SKILL.md frontmatter testing in required package checks. Invalid content should fail before database seeding, artifact generation, registry publication, or agent installation.

Save a small machine-readable report with case ID, stage, field, result, and score, then derive the human table from that same data. This avoids a green text report beside a red JSON result and makes the build gate use the facts shown to reviewers.

When a library update changes a result, run the old and new parser on the fixed case set in separate jobs. Review each changed row against the YAML rule, then change the owned message only when the user action or failure stage truly differs.

Keep malformed files under a test-only path that the seed loader and site build will never scan as publishable content. Add a guard test for that path rule so a new glob cannot import a known bad fixture into the live skill list.

## Separate Errors from Warnings Before Release

Errors should block parsing, validation, publication, and trust scoring. Warnings can guide authors about length, content depth, or risky text, but a warning is not proof that the file is invalid or safe.

The current validator has a clear parse-error return, then schema errors, content warnings, safety warnings, and a quality calculation. Repair the schema-invalid score path so any error prevents a trusted score from reaching callers.

Document warning limits too. A dangerous-pattern warning does not prove a command is harmful, and no warning does not prove a skill is safe. Human review and runtime controls remain separate.

Browse [QA skills](/skills), review the [CI validation guide](/blog/validate-skill-md-in-ci-pipeline), and add the parser, schema, delimiter, score, and recovery tables to the validator suite. Make the desired zero-score rule explicit, then fix code rather than lowering the test.

## Frequently Asked Questions

### Is every invalid skill a YAML parse failure?

No. YAML can parse correctly while required fields are missing, too short, the wrong shape, or outside supported values. Parser failures need a frontmatter syntax result. Schema failures need field-level issues. Keeping those stages separate gives authors the right fix and prevents misleading score output.

### Should tests assert the full parser exception text?

Usually no. Lower-level wording can change across parser versions and may expose more input than callers need. Assert the stable QASkills field, local message or code, invalid status, and zero score. Keep safe line and column details only if the product owns and tests their format.

### Why require a zero score for schema-invalid content?

A nonzero quality score can imply that an invalid skill is ready to rank, publish, or install. Scoring partial metadata also creates inconsistent comparisons. Return zero or omit the score until parsing and schema validation pass, then calculate documentation and completeness evidence from trusted fields.

### Can the validator repair malformed frontmatter automatically?

Automatic repair is risky when syntax is ambiguous because it may change author meaning. Prefer a clear diagnostic and an opt-in formatter with semantic round-trip tests. A recovery test should prove the documented manual fix works without allowing validation to silently rewrite the package.

### How should delimiter mistakes be reported?

Report the stage that the installed parser actually reaches. Some forms throw, while others look like body text and later fail required fields. Keep a stable user-facing category, mention the expected opening and closing markers, and link to the supported file format without hiding the original path.

### Do warnings make a skill safe to install?

No. Warnings are clues about length, content, or suspicious patterns. They can produce false positives and miss obfuscated or indirect risk. Pair validation with provenance, permission limits, source review, sandboxing, and human judgment. Never treat an empty warning list as a security certificate.
`,
};
