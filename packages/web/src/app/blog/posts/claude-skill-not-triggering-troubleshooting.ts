import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Claude Skill Not Triggering: The Complete Troubleshooting Guide',
  description: 'Get a Claude skill not triggering fix: diagnose discovery and description issues, repair execution failures, and prove activation with a QA-focused test workflow.',
  date: '2026-07-15',
  category: 'Guide',
  content: `
# Claude Skill Not Triggering: The Complete Troubleshooting Guide

A skill that stays silent is harder to debug than a test that fails loudly. There may be no stack trace, no red status badge, and no single log line that says which phrase missed the trigger. A QA engineer usually sees only the behavioral symptom: Claude answers the prompt, but it does not follow the workflow, read the reference, run the helper, or produce the artifact promised by the skill.

Treat that symptom as a routing defect. Before Claude can follow a skill, the skill must be discoverable, its metadata must describe the current request clearly enough to be selected, and its instructions must remain executable after selection. Those are separate gates. Mixing them together leads to random edits and false conclusions.

This guide gives you a testable process for finding a Claude skill not triggering fix. It focuses on evidence that QA and test-automation engineers can collect: controlled prompts, boundary cases, filesystem checks, instruction probes, and compact regression suites. It also distinguishes non-selection from selected-but-broken behavior, because the same visible result can come from very different failures.

## Classify the Failure Before Editing Anything

Start with the narrowest useful question: did Claude fail to discover the skill, fail to select it, or select it and then fail inside the workflow? Each class needs different evidence.

Suppose a skill named \`api-contract-review\` should inspect an OpenAPI change and propose contract tests. You ask, "Review this API schema for backward compatibility," and receive a generic review. That does not prove the skill was invisible. Claude might have seen it but decided the description did not match. It might also have selected it, read instructions that were too vague, and produced an ordinary answer.

Use an observable marker during diagnosis. Add a temporary, harmless instruction such as "Begin the response with Contract review mode" inside the skill body. The marker is not a permanent design pattern. It is a test probe, similar to temporary instrumentation in a flaky UI test. If the marker appears, discovery and selection probably succeeded, and the fault is later in the workflow.

| Failure class | Typical observation | First evidence to collect | Avoid changing first |
|---|---|---|---|
| Discovery | Skill never appears relevant, even for a direct request | Directory, filename, readable frontmatter, session context | Prompt wording |
| Selection | Directly named skill works, natural request does not | Description coverage and positive or negative prompt set | Helper scripts |
| Instruction execution | Marker appears, but output or tool sequence is wrong | Body instructions, referenced files, permissions | Frontmatter description |
| Environment | Same skill works in one project or machine only | Project root, user directory, current working directory | Content style |
| Expectation mismatch | Claude uses the skill only for some requests | Documented scope versus assumed trigger behavior | Reinstalling everything |

Write down one minimal reproduction before editing. Include the exact prompt, current directory, whether the skill is project-scoped or personal, expected observable behavior, and actual response. This becomes the first regression test later. Without it, an edited prompt that happens to work can look like a repair even when the original case still fails.

\`\`\`markdown
Reproduction ID: CONTRACT-SKILL-01
Project: checkout-service
Prompt: Review this OpenAPI change for backward compatibility and propose contract tests.
Expected: Response begins "Contract review mode" and includes consumer-impact cases.
Actual: Generic schema summary with no contract-test matrix.
Scope: Project skill
Working directory: repository root
\`\`\`

Do not use an enormous real-world prompt as the first reproduction. Attachments, repository context, competing instructions, and several requested outcomes add variables. Reduce the case to one intent and one expected marker. Once the minimal case passes, restore realistic context in layers.

## Verify the Skill Can Be Discovered

Claude Code skills use a \`SKILL.md\` file. Project skills live under \`.claude/skills/\`, while personal skills live under \`~/.claude/skills/\`. A practical layout gives each skill its own directory, with \`SKILL.md\` at that directory's root. Supporting references or scripts can sit beneath it.

\`\`\`bash
.claude/
  skills/
    api-contract-review/
      SKILL.md
      references/
        compatibility-rules.md
      scripts/
        summarize-schema.ts
\`\`\`

Check the real filesystem, not the path you remember creating. Test repositories are often opened from a parent monorepo, a nested package, a worktree, or a temporary checkout. A correctly written project skill in another checkout is effectively absent. Likewise, a file called \`skill.md\`, \`SKILLS.md\`, or \`README.md\` does not satisfy the documented \`SKILL.md\` convention.

From the directory where you launched Claude Code, inspect the expected path:

\`\`\`bash
pwd
find .claude/skills -maxdepth 3 -name SKILL.md -print
find "$HOME/.claude/skills" -maxdepth 3 -name SKILL.md -print
\`\`\`

These commands establish location only. Next, confirm the process can read the file and that the file is not an empty symlink target, a generated placeholder, or an uncommitted artifact missing from the current worktree. In a team failure, ask the affected engineer to run the check locally. A skill present on the author's laptop is not evidence that CI workspaces or colleagues have it.

Scope is another useful isolator. If the same personal skill works across repositories but the project copy fails, compare placement and content. If the project skill works but the personal copy does not, confirm the home directory used by the affected shell. Containers, remote development environments, and separate operating-system accounts may have different homes.

After creating or materially relocating a skill, test it in a new Claude Code session. This removes ambiguity about when available skills were scanned and eliminates conversational state from earlier attempts. Treat a new session as a clean browser profile in UI testing: it is not the fix itself, but it gives the fix a fair test.

### Discovery checklist for repository test fixtures

For a shared automation repository, include skill presence in setup documentation or a bootstrap check. Do not make every test job depend on an agent skill unless the agent actually runs in that job. Instead, validate the repository artifact in a lightweight quality check:

\`\`\`bash
test -f .claude/skills/api-contract-review/SKILL.md
sed -n '1,20p' .claude/skills/api-contract-review/SKILL.md
\`\`\`

This catches renames and accidental deletion. It cannot prove semantic selection, which needs prompt-level tests, but it prevents spending an hour tuning descriptions for a file that is not present.

## Parse the Frontmatter as Test Data

The \`SKILL.md\` file begins with YAML frontmatter. The documented core fields are \`name\` and \`description\`. The name can be at most 64 characters, and the description can be at most 1024 characters. More text is not automatically better. A compact, valid description that states when to use the skill is easier to evaluate than a paragraph filled with product claims.

\`\`\`yaml
---
name: api-contract-review
description: Review OpenAPI and API contract changes for backward compatibility. Use when asked to assess endpoint, schema, request, response, or consumer-impact changes and to design contract tests.
---
\`\`\`

Frontmatter defects often look like trigger defects because the routing information never becomes usable. Check for both opening and closing \`---\` lines, valid YAML, plain scalar values where possible, and no invisible formatting copied from rich text. A tab used for indentation, an unclosed quote, or a colon in an awkward unquoted value can change parsing.

| Metadata check | Passing condition | Failure symptom | QA test |
|---|---|---|---|
| Filename | Exactly \`SKILL.md\` | Skill absent from discovery | Case-sensitive filesystem fixture |
| Delimiters | YAML enclosed by \`---\` lines | Body treated incorrectly or metadata unreadable | Parser or visual inspection |
| Name | Clear and no more than 64 characters | Rejection or confusing identity | Length assertion |
| Description | No more than 1024 characters and states use cases | Weak or absent selection | Length plus prompt suite |
| Encoding | Normal UTF-8 text without copied markup | Inconsistent parsing | Hex or editor inspection if suspected |

You do not need to invent extra frontmatter fields to make triggering work. Unknown metadata is not a substitute for a precise description. If you copied a structure from another agent product, reduce it to the documented fields and retest. This is the configuration equivalent of removing unsupported capabilities from a browser matrix.

A simple repository check can guard the published limits without claiming to reproduce Claude's parser:

\`\`\`typescript
const name = 'api-contract-review';
const description =
  'Review OpenAPI and API contract changes for backward compatibility. ' +
  'Use when asked to assess endpoint, schema, request, response, or ' +
  'consumer-impact changes and to design contract tests.';

if (name.length > 64) throw new Error('Skill name exceeds 64 characters');
if (description.length > 1024) {
  throw new Error('Skill description exceeds 1024 characters');
}
\`\`\`

Keep this check honest: it verifies string length, not trigger quality. Semantic coverage belongs in the selection tests described next.

## Rewrite the Description Around User Intent

When discovery passes, the description is the highest-value place to investigate. Claude must infer relevance from the request. A description that says what the skill contains but not when it should run makes that decision unnecessarily hard.

Compare these two descriptions:

\`\`\`yaml
# Weak: inventory without trigger context
description: API review templates, scripts, and compatibility knowledge.

# Stronger: action, objects, and request language
description: Review OpenAPI and API contract changes for backward compatibility. Use when asked to assess endpoint, schema, request, response, or consumer-impact changes and to design contract tests.
\`\`\`

The stronger version provides three kinds of routing signal:

1. The action: review and assess.
2. The objects: OpenAPI, endpoints, schemas, requests, responses, consumers.
3. The outcome: compatibility analysis and contract tests.

Build those signals from real prompts, not a thesaurus. Look at how test engineers ask for the work in pull requests and chat. One person says "breaking API change," another says "will old clients still pass," and a third asks for "Pact cases." You do not need every synonym, but the description should cover the stable intent shared by them.

Avoid descriptions that claim universal scope: "Use for all API tasks" competes with debugging, documentation, performance testing, and implementation work. Over-broad matching can make the skill fire when it adds no value, which is another defect. A routing description is closer to a test selector than a marketing tagline. It needs discriminating power.

The dedicated [Claude skill description and frontmatter triggering guide](/blog/claude-skill-description-frontmatter-triggering-guide) goes deeper into writing selection metadata. For troubleshooting, use a smaller red-green-refactor loop:

1. Red: preserve a natural prompt that should trigger but does not.
2. Green: change only the description until that prompt selects reliably.
3. Refactor: shorten duplication while keeping the positive and negative suite passing.

### Create positive, adjacent, and negative prompts

A single successful phrase proves very little. Assemble prompts in three buckets. Positive cases clearly need the skill. Adjacent cases might need some API expertise but not this workflow. Negative cases should stay outside its scope.

| Prompt | Expected routing | Reason |
|---|---|---|
| "Find breaking changes in this OpenAPI diff and propose contract tests" | Select | Direct compatibility and testing request |
| "Will removing this response field break existing consumers?" | Select | Natural-language compatibility intent |
| "Write a load test for the checkout endpoint" | Do not select | Performance workflow, not contract compatibility |
| "Explain what this endpoint does" | Usually do not select | Documentation request without change analysis |
| "Fix the handler that returns 500" | Do not select | Implementation debugging request |

Run each prompt in a clean context and record the observable marker. Repeat cases if the behavior seems inconsistent. Model-driven routing is not identical to a deterministic function, so your test goal is useful reliability across representative language, not a fictional guarantee that every prompt maps to a fixed branch.

## Separate Selection From Instruction Failure

Once the marker confirms selection, stop rewriting metadata. Now test the skill body as a procedure. A selected skill can still look inactive if its instructions do not require any visible distinction from Claude's default response.

Good diagnostic instructions name the expected artifacts and checkpoints. For the contract-review example, require an inventory of changed operations, a compatibility classification, evidence from the schema, and executable test ideas. Each item becomes observable.

\`\`\`markdown
# API contract review

When reviewing an API change:

1. Identify changed operations and schema elements.
2. Classify each change as compatible, conditionally compatible, or breaking.
3. Cite the request or response shape that supports the classification.
4. Propose provider and consumer contract tests for risky changes.
5. State assumptions when the repository does not show consumer behavior.
\`\`\`

Vague directions such as "perform a comprehensive review" have no stable oracle. Two responses can both look comprehensive while checking different things. A QA-oriented skill should express completion criteria, inputs, decision rules, and output structure, while leaving room for project evidence.

Check every reference mentioned in the body. Relative paths should resolve from the skill's own directory in the way your instructions expect. Do not tell Claude to read \`references/compatibility-rules.md\` if the actual file is named \`compatibility.md\`. Case mismatches can pass on one filesystem and fail on another.

Scripts need the same treatment. Test the helper independently with a small fixture before blaming skill selection. Confirm its runtime exists, its input assumption matches the repository, and a nonzero exit produces a useful message. The skill should say when to use the script and what to do if it cannot run. "Run all scripts" is not a robust fallback policy.

\`\`\`typescript
type Change = {
  path: string;
  kind: 'added' | 'removed' | 'modified';
  required?: boolean;
};

export function classify(change: Change): string {
  if (change.kind === 'removed') return 'review-as-breaking';
  if (change.kind === 'added' && change.required) {
    return 'review-as-breaking';
  }
  return 'inspect-consumer-context';
}
\`\`\`

This helper deliberately returns review categories rather than pretending a few fields can decide compatibility. The agent still needs repository context. That division of labor makes the script testable without encoding a false universal rule.

## Inspect Instruction Precedence and Competing Context

Agent behavior is shaped by more than one file. A repository may also contain \`AGENTS.md\`, Claude project instructions, user instructions, and the current prompt. The \`AGENTS.md\` standard uses nearest-file-wins scoping: an instruction file closer to the edited file can provide more specific guidance. Other coding agents use their own documented files, such as \`.github/copilot-instructions.md\`, scoped \`.github/instructions/*.instructions.md\` files with \`applyTo\` frontmatter, \`.cursor/rules/*.mdc\`, or \`GEMINI.md\`. Do not assume copying one product's format makes it active in Claude Code.

The important troubleshooting question is whether another applicable instruction conflicts with the skill's requested workflow. Imagine the skill says to create contract fixtures, while a repository instruction says, "Do not modify files during review." Claude may correctly select the skill and still avoid writing fixtures. That is not a trigger miss.

Create a precedence inventory for the failing file or request:

\`\`\`markdown
Prompt requirement: Review only, no implementation
Repository instruction: Tests must use Vitest
Nested package instruction: Contract fixtures belong in test/contracts
Selected skill: Produce compatibility matrix and proposed test cases
Observed conflict: None
\`\`\`

If there is a conflict, resolve it explicitly. Change the skill so it offers a patch only when modification is allowed, or change the prompt to authorize the intended output. Never weaken a safety or repository constraint merely to make a trigger test pass.

Competing skills can also make a request ambiguous. An API debugging skill and an API contract skill may both mention endpoints, responses, and tests. Sharpen their boundaries. The debugger handles incorrect runtime behavior and reproduction; the contract reviewer handles interface evolution and consumer compatibility. Use negative language sparingly in descriptions, but make the positive jobs distinct.

| Request signal | Contract review skill | API debugging skill | Performance skill |
|---|---|---|---|
| Schema field removed | Primary | Secondary only if runtime fails | No |
| Unexpected 500 response | No | Primary | No |
| Latency regression at p95 | No | Possible supporting role | Primary |
| Old mobile client compatibility | Primary | Possible reproduction help | No |

This matrix is useful during skill portfolio reviews. If every column says "Primary" for common prompts, the descriptions overlap too much for predictable routing.

## Control the Prompt Experiment Like a Flaky-Test Investigation

Prompt experiments become noisy when engineers change the skill, prompt, model context, and repository state at once. Use the same discipline you would apply to a nondeterministic end-to-end test.

First, freeze the fixture. Use a tiny OpenAPI diff or a short embedded example rather than a moving branch. Second, start each comparison from a clean session. Third, change one factor: file location, metadata, description, or body. Fourth, capture enough output to tell which checkpoint failed. Fifth, rerun the original natural prompt, not only the direct phrase you used while editing.

A compact experiment log can live beside your QA notes:

\`\`\`markdown
| Run | Change | Prompt ID | Marker | Matrix | Result |
|---|---|---|---|---|---|
| 1 | Baseline | CONTRACT-01 | No | No | Fail |
| 2 | Fixed SKILL.md case | CONTRACT-01 | Yes | Yes | Pass |
| 3 | Same file, natural synonym | CONTRACT-02 | Yes | Yes | Pass |
| 4 | Negative performance prompt | PERF-01 | No | N/A | Pass |
\`\`\`

Do not paste private source, tokens, or production incident data into a bug report. Reproduce with a sanitized fixture that preserves the intent and structural failure. For an authentication skill, replace real issuer URLs and claims with local examples. For a database skill, use synthetic schemas.

When results vary, estimate the boundary rather than declaring the tool random. Does the skill trigger when "OpenAPI" is present but miss "API spec"? Does it select for direct compatibility requests but not when the request contains three unrelated tasks? Those patterns point back to description coverage or prompt decomposition.

### Use direct invocation only as an isolating probe

If your Claude Code surface exposes the skill in a way you can explicitly select or invoke, use that path to check discovery and instruction execution. Do not treat direct invocation as proof that natural-language selection works. It bypasses the very routing decision under test.

The diagnostic interpretation is simple:

- Direct use fails: investigate discovery, parsing, body instructions, and references.
- Direct use passes while natural requests fail: investigate the description and competing intents.
- Both pass in a clean session but fail in a large task: investigate context, conflicts, and prompt decomposition.

This resembles calling a test helper directly versus exercising it through the UI. Both are valuable, but they cover different integration boundaries.

## Repair Common QA Skill Trigger Patterns

Certain defects recur in skills built for testing work. The following patterns are more actionable than a generic "make the description clearer" recommendation.

### The tool-named description

A description such as "Uses Playwright to test pages" names an implementation but not a user goal. Prompts often say "check the checkout flow" or "reproduce this browser bug," not "use Playwright." Include the workflow and artifacts: browser reproduction, interaction checks, screenshots, traces, or end-to-end tests, but only those the skill genuinely covers.

### The phase-only description

"Use during QA" is too broad. QA includes planning, exploratory testing, test data, automation, performance, accessibility, release signoff, and incident reproduction. Name the phase and decision, such as reviewing acceptance criteria to derive risk-based test scenarios before automation starts.

### The file-extension trap

A skill described only around \`.spec.ts\` may miss a request about "failing login tests" before any file is named. File patterns are useful signals, but pair them with intent. Conversely, do not claim every TypeScript file if the workflow is test-specific.

### The invisible output

A skill may ask Claude to "consider risk" without requiring a risk section. Engineers then conclude it did not run. Require a concise visible artifact, such as a risk-ranked scenario table. Remove temporary activation markers after diagnosis, but retain meaningful output contracts.

### The encyclopedic body

An enormous \`SKILL.md\` can obscure the procedure. Keep routing in frontmatter and the primary workflow in the main file. Put deep references in supporting files and instruct Claude when they are relevant. Progressive disclosure reduces irrelevant context while preserving specialist material.

### The copied cross-agent configuration

Copilot, Cursor, Gemini CLI, Claude Code, and agents that follow \`AGENTS.md\` do not share one instruction format. A correct \`.cursor/rules/security.mdc\` file has no reason to become a Claude skill merely because the content is good. Port the knowledge, then package it in the target product's documented structure.

If you want a clean starting point rather than repairing a copied file, the [complete guide to creating a Claude skill with SKILL.md](/blog/how-to-create-a-claude-skill-skill-md-complete-guide) covers structure and authoring from first principles. Ready-made QA skills can also be installed from qaskills.sh with the qaskills CLI, which is useful when you want a known baseline for comparison.

## Build a Trigger Regression Suite

Once fixed, preserve the behavior as a small semantic test suite. It will not be as deterministic as a unit test, but it can still detect gross regressions in scope and wording.

Store prompts as data with a routing expectation and observable output checks. Keep the fixtures free of secrets. A manual suite is acceptable for a small skill library; a larger team can run evaluations through its approved agent-testing harness.

\`\`\`yaml
skill: api-contract-review
cases:
  - id: removed-response-field
    prompt: Assess whether removing customerTier from this response is safe.
    expect_selection: true
    expect_sections:
      - compatibility classification
      - consumer contract tests
  - id: load-test-request
    prompt: Create a load test for 500 checkout requests per second.
    expect_selection: false
  - id: explain-endpoint
    prompt: Summarize what POST /checkout does.
    expect_selection: false
\`\`\`

Include boundary prompts because they protect precision. A skill that triggers for every mention of "API" may pass all positive tests while degrading the rest of the agent experience. Track false positives as seriously as missed selections.

Review the suite whenever the skill's responsibility changes. If you add GraphQL compatibility review, add GraphQL wording, fixtures, and negative cases. Do not silently broaden the description and rely on old OpenAPI tests.

For team reporting, record four practical measures:

| Measure | What it reveals | Suggested evidence |
|---|---|---|
| Positive selection coverage | Whether common intended phrasings route correctly | Representative prompts from QA work |
| Negative selection precision | Whether the skill stays out of unrelated tasks | Adjacent testing requests |
| Workflow completion | Whether selected instructions yield required artifacts | Section or checklist assertions |
| Portability | Whether project and supported environments discover it | Clean checkout exercises |

Do not publish a percentage from three prompts as if it were a universal model benchmark. Use the measures to compare revisions on the same controlled suite.

## Use a Fast Decision Tree During an Incident

When a release engineer says, "The regression-analysis skill stopped working," time matters. Follow a fixed triage sequence:

1. Reproduce with one small, direct prompt in a clean session.
2. Confirm the exact \`SKILL.md\` exists in the expected project or personal directory.
3. Validate the frontmatter delimiters, \`name\`, and \`description\`.
4. Try an explicit selection path, if available, to isolate routing from execution.
5. Insert a temporary observable marker in the body.
6. If the marker is absent, improve description coverage and remove overlaps.
7. If the marker appears, test referenced files, scripts, permissions, and output steps.
8. Restore the original prompt and add positive plus negative regression cases.
9. Remove the temporary marker and confirm the real output remains distinguishable.

| If this is true | Then inspect | Evidence of repair |
|---|---|---|
| File is missing | Installation, checkout, or scope | File present in clean environment |
| Metadata is malformed | YAML and documented limits | Parser-friendly frontmatter |
| Direct selection works | Natural-language description | Positive prompts select |
| Marker appears, artifact does not | Body procedure and dependencies | Required artifact produced |
| Only crowded prompts fail | Task decomposition and instruction conflict | Focused subtask succeeds |
| Unrelated prompts trigger | Scope too broad | Negative suite stays clear |

This order minimizes wasted edits. It moves from binary facts toward semantic judgment and finally integration complexity.

## Know When the Skill Is Not the Defect

Not every disappointing response indicates routing failure. The request may omit the inputs the workflow needs. A visual-regression skill cannot compare screenshots if there is no baseline or accessible application. A log-triage skill cannot identify a failing build from "tests are broken" without output or a repository to inspect.

In those cases, a well-written skill should ask for the missing evidence or state the limitation. That can look less dramatic than immediately running tools, but it is correct behavior. Your oracle should accept a relevant clarification as successful activation.

Permissions can also stop execution after selection. A skill may recommend reading files or running a local helper, while the current environment or user decision prevents those actions. Distinguish "did not trigger" from "could not perform an authorized action." Preserve the refusal or permission boundary in the incident record.

Finally, agent output remains context-sensitive. Skills improve consistency and provide specialist procedures, but they do not convert language understanding into a perfect keyword router. Design for robust intent coverage, observable work, and graceful ambiguity. If a task is safety-critical, use explicit process controls and human review rather than relying solely on automatic skill selection.

## Trace Regressions Through Version Control

If a skill used to select reliably, compare the last known good revision with the first failing revision. Do not limit the diff to \`SKILL.md\`. A directory move, renamed reference, changed repository root, or new overlapping skill can alter the result even when the original file is untouched.

Use version history to answer three separate questions. Did the discovery path change? Did the routing description change? Did the observable workflow change? A large refactor can affect all three, so test revisions or individual changes against the same frozen prompt fixture.

\`\`\`bash
git log -- .claude/skills/api-contract-review
git diff HEAD~1 -- .claude/skills
git status --short
\`\`\`

The status check matters because the repaired skill may exist only as an untracked local file. That explains a classic team symptom: the author reports success, while every colleague still sees failure. Preserve the fix in the repository if it is intended to be project-scoped, and review it like test infrastructure code.

During review, ask for evidence rather than a claim that "Claude now recognizes it." The change should include the failing prompt, the description or structure correction, a successful clean-session result, and at least one negative prompt showing that the skill did not become universal. If helper code changed, include its ordinary automated tests too.

Keep rollback straightforward. A description rewrite should be a focused commit rather than mixed with dozens of unrelated reference edits. When a regression appears after merging several new QA skills, temporarily test the previous descriptions from version control without deleting user work. The goal is to identify interaction, not to erase the library.

| Version-control signal | Likely issue | Verification |
|---|---|---|
| Skill directory renamed | Discovery or stale reference path | Clean checkout and direct prompt |
| Description broadened | New false positives or competition | Negative routing suite |
| Helper renamed | Selected workflow fails mid-run | Independent helper fixture |
| New neighboring skill added | Ambiguous intent boundary | Side-by-side prompt matrix |
| Fix remains untracked | Machine-specific success | Fresh clone inspection |

Once you identify the causal revision, add its reproduction to the regression suite. That turns an otherwise anecdotal failure into a durable guardrail for future maintainers.

## Frequently Asked Questions

### Why does my Claude skill work when named directly but not from a natural prompt?

That pattern usually isolates the problem to selection rather than discovery or execution. The skill is available and its body can run, but the frontmatter description does not cover the language or intent in the natural request. Add the action, testing object, and expected outcome using phrases engineers actually use. Then test several positive, adjacent, and negative prompts in clean sessions. Do not solve it by stuffing every synonym into the description, because an over-broad skill can start stealing unrelated debugging or automation requests.

### Should I put trigger keywords inside the SKILL.md body?

Put routing information in the frontmatter description, where Claude can use it to decide whether the skill is relevant. The body should explain the procedure after selection: inputs, checks, tools, decision rules, and outputs. Repeating a few terms naturally is fine, but a hidden keyword list in the body is not a reliable substitute for a clear description. During troubleshooting, a temporary response marker in the body can prove selection, but remove it after you have isolated the fault and retain only useful workflow artifacts.

### Can a valid skill still fail because a referenced script is broken?

Yes. Selection can succeed while execution stops at a missing file, unsupported runtime, incorrect relative path, or script error. Test helpers independently with sanitized fixtures and make failures readable. In the skill, state when the helper should run, what input it expects, and what Claude should do if it cannot run. A visible activation marker or required first step helps separate this condition from a trigger miss. Avoid making the description more aggressive when the actual defect is downstream code.

### How often should a QA team retest skill triggering?

Retest when the description changes, the skill moves between personal and project scope, supporting files are reorganized, or its responsibility expands. Also run a small smoke suite after onboarding or environment changes that affect repository paths. Keep representative positive and negative prompts under version control with sanitized fixtures. For high-use release or incident skills, include periodic manual evaluation across realistic requests. The goal is not a brittle assertion for every word choice, but early detection of missing discovery, scope drift, and lost workflow outputs.
`,
};
