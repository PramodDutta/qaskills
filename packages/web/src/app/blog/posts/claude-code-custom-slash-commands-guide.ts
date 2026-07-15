import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Claude Code Custom Slash Commands: The Complete Guide',
  description: 'Build Claude Code custom slash commands for repeatable QA workflows, safer test automation, reusable arguments, live evidence, and team-wide consistency.',
  date: '2026-07-15',
  category: 'Guide',
  content: `
# Claude Code Custom Slash Commands: The Complete Guide

Typing “please inspect the changed tests, run the smallest relevant checks, and report regression risk” works once. Typing it before every pull request creates prompt drift: one engineer remembers API contracts, another forgets fixture cleanup, and a third asks the agent to run the entire suite. Claude Code custom slash commands turn that repeated QA instruction into a repository-owned workflow invoked with a short name such as \`/test-impact\`.

The terminology needs one current clarification. Claude Code has merged custom commands into skills. A legacy Markdown file in \`.claude/commands/\` still creates a slash command, but the recommended format is a skill directory in \`.claude/skills/<name>/SKILL.md\`. Both can provide \`/name\` invocation. Skills add a directory for supporting files and can be selected automatically when their descriptions match.

This guide covers both formats without pretending they are separate products. You will build QA-focused commands, pass arguments, inject live repository evidence, control invocation, choose project or personal scope, and test the workflow itself. The examples focus on regression analysis, flaky-test triage, API contract review, and release checks, where repeatability matters more than clever prompting.

Official Claude Code documentation for skills and command behavior is available at https://code.claude.com/docs/en/slash-commands.

## What a custom slash command means in current Claude Code

A custom slash command is a reusable prompt workflow that appears under a \`/name\` invocation. In the recommended format, it is a Claude Code skill. The directory name normally supplies the command name, while \`SKILL.md\` contains optional YAML frontmatter and the instructions Claude follows.

The simplest project layout is:

\`\`\`markdown
.claude/
└── skills/
    └── test-impact/
        └── SKILL.md
\`\`\`

Invoking \`/test-impact\` loads that workflow for the current task. Depending on its configuration and description, Claude may also select it when a user asks the equivalent request in ordinary language.

The legacy layout remains valid:

\`\`\`markdown
.claude/
└── commands/
    └── test-impact.md
\`\`\`

That file creates the same visible command name, \`/test-impact\`. Existing repositories do not need an emergency migration. New workflows should usually use skills because a folder can also contain reference guides, templates, examples, and scripts. If a skill and legacy command use the same name, the skill takes precedence, so avoid leaving divergent definitions during migration.

Built-in commands and custom workflows share the slash menu, but they are not implemented identically. A built-in command such as a session-control command executes Claude Code behavior. A custom command or skill supplies instructions and context for the model to perform a task. That distinction matters in QA: \`/release-check\` does not become an infallible release system merely because it has a command name. Its tests, permissions, inputs, and stop conditions still need engineering.

## Choose a skill or legacy command deliberately

For a new QA workflow, choose \`.claude/skills/<name>/SKILL.md\`. Choose \`.claude/commands/<name>.md\` mainly when maintaining an established repository or a consumer that explicitly expects the legacy layout.

| Decision factor | Recommended skill | Legacy command |
|---|---|---|
| New project workflow | Preferred | Supported, but not the current recommendation |
| Direct \`/name\` invocation | Yes | Yes |
| Automatic relevance-based use | Supported through skill discovery | Less expressive legacy path |
| Supporting references and scripts | Natural folder structure | Awkward beside a single command file |
| Existing command library | Migrate incrementally | Continue while stable |
| Same-name conflict | Takes precedence | Shadowed by matching skill |
| Portable skill structure | Stronger fit | Claude-specific legacy organization |

Do not choose based on file count alone. A one-file command may begin small and later need a test-data policy, a report template, and a deterministic parser. The skill directory gives it room to grow without stuffing every detail into the prompt.

Some instructions should not be commands at all. A repository fact that Claude must know during every edit belongs in \`CLAUDE.md\`, such as the canonical command for unit tests or a ban on hitting production. A slash command is better for an intentional procedure: “assess changed-test risk,” “triage this failure,” or “prepare a release evidence summary.”

| Content | Best home | QA example |
|---|---|---|
| Always-relevant repository fact | \`CLAUDE.md\` | The integration suite requires the local test container |
| Reusable task with a clear outcome | Skill invoked as a slash command | Review changed tests and recommend targeted suites |
| Large optional domain detail | Skill reference file | Payment-service test data and error semantics |
| Deterministic transformation | Skill script | Convert JUnit XML into a compact failure table |
| Personal workflow across repositories | \`~/.claude/skills/\` | Your preferred exploratory-test note format |

## Create a first QA command in the recommended format

Start with a narrow command whose outcome can be checked. A test-impact command should inspect current changes, identify affected behavior, map that behavior to tests, and recommend the smallest sufficient verification. It should not edit production code or run every suite by default.

Create \`.claude/skills/test-impact/SKILL.md\`:

\`\`\`yaml
---
name: test-impact
description: Assess changed code and tests to identify regression risks and recommend the smallest sufficient verification. Use for pull request test planning or changed-file coverage review.
---

# Test impact assessment

1. Read the current diff and list changed production behavior before discussing tests.
2. Trace changed interfaces to their callers, consumers, fixtures, and existing tests.
3. Separate directly covered behavior from inferred risk and uncovered behavior.
4. Recommend targeted checks first, then broader suites only when the risk crosses boundaries.
5. Do not claim a test passed unless its command was executed successfully.

Return:
- changed behavior
- regression risks ranked high, medium, or low
- existing coverage
- missing or weak coverage
- commands to run, in order
- assumptions and unresolved questions
\`\`\`

The metadata does discovery work. The body defines the invariant procedure and report. The description uses phrases a QA engineer may actually say, including “pull request test planning” and “changed-file coverage review.”

Keep the portable \`name\` at no more than 64 characters and the \`description\` at no more than 1,024 characters. Use lowercase letters, numbers, and hyphens for the name. Claude Code can derive a name from the folder, but stating it makes intent visible during review.

Launch Claude Code in the repository and invoke:

\`\`\`bash
/test-impact
\`\`\`

Then test natural-language discovery with a request such as “Which regression tests should cover my current changes?” If the skill should be manual only, you can configure that explicitly later. First verify the prompt produces a useful, evidence-backed assessment.

## Write the command as an executable test contract

A strong command resembles a test contract: it names inputs, orders actions, defines forbidden shortcuts, and specifies observable output. A weak command merely assigns a role, such as “Act as a senior QA engineer and review this PR.” Role language cannot replace decision criteria.

For repeatable QA behavior, include five components:

1. **Scope:** what artifact or change is being evaluated.
2. **Evidence order:** what Claude must inspect before forming conclusions.
3. **Decision rules:** how it distinguishes risk levels or failure classes.
4. **Guardrails:** actions it must not take without evidence or approval.
5. **Output contract:** headings or fields a reviewer can compare across runs.

Consider a flaky-test triage command. “Fix the flaky test” invites a timeout increase, assertion deletion, or retry expansion before diagnosis. A contract-oriented version requires the first failing attempt, retries, test code, fixtures, and available trace. It defines product, test, environment, and unresolved classifications. It prohibits weakening the assertion until a failure mechanism is demonstrated.

\`\`\`markdown
# Intermittent failure triage

Inspect evidence in this order:
1. First failing attempt and error location.
2. Retry outcomes for the same test identity.
3. Test, fixtures, and production behavior under test.
4. Trace, network, console, screenshot, or service logs that are available.

Choose one classification: product defect, test defect, environment defect,
or unresolved. Cite the evidence for the choice.

Do not increase retries, extend a global timeout, remove an assertion, or add
an unconditional wait as a first response. Propose the smallest check that can
confirm or reject the leading hypothesis.
\`\`\`

This wording guides reasoning without asserting that every investigation has the same fix. It is strict around evidence and coverage, flexible around hypothesis formation.

For detailed syntax and content boundaries, the [SKILL.md format guide](/blog/skill-md-format-guide) complements this command-focused workflow. The important design move is to write instructions another engineer can review like automation code, not an inspirational prompt that changes meaning across runs.

## Pass arguments without multiplying commands

Arguments let one workflow operate on a selected test, issue, path, or environment. A command named \`/triage-test\` is more maintainable than separate commands for every spec file.

Claude Code skills support the complete argument string through \`$ARGUMENTS\`. Positional access is available through \`$ARGUMENTS[N]\` or the shorter \`$N\`, where indexing starts at zero. Current skill frontmatter also supports named positional arguments. Keep interfaces simple enough that engineers can remember them from autocomplete and examples.

Here is a manual command that expects a test path and optional run identifier:

\`\`\`yaml
---
name: triage-test
description: Investigate one failing automated test using its code and available run evidence.
argument-hint: "[test-path] [run-id]"
disable-model-invocation: true
---

Investigate the automated test identified by $0.

If $1 is provided, use it only to locate artifacts that are already accessible.
Do not invent a CI URL or report location. If the test path is missing, ask for it.

Follow the evidence-first classification process and return the diagnosis,
supporting observations, proposed change, and verification plan.
\`\`\`

An engineer could invoke it as:

\`\`\`bash
/triage-test tests/checkout/submit-order.spec.ts run-1842
\`\`\`

Quote a multi-word argument when you intend it to occupy one position. Avoid packing many optional values into a command call. If the workflow needs eight parameters, it may need an input file, an interactive clarification step, or a dedicated tool instead.

Treat arguments as untrusted task input. A test path can identify a file to read, but it should not automatically become a shell fragment. Phrase the workflow so Claude validates existence and scope before using an argument. For environments, allow a known set and require a stop when the target is ambiguous. QA commands often touch seeded data or external systems, so a compact interface must not bypass authorization boundaries.

## Inject live repository evidence before Claude reasons

Claude Code supports dynamic context injection in skills and custom commands. The inline form uses an exclamation mark followed by a shell command enclosed in backticks. Claude Code runs that command before sending the skill content to the model, and substitutes the output into the prompt. This is useful when the workflow always needs a small, safe snapshot such as the current diff or changed-file list.

A regression-review skill can include live Git evidence:

\`\`\`markdown
## Current change evidence

Changed files:
!\`git diff --name-only HEAD\`

Diff:
!\`git diff HEAD\`

## Assessment

Identify behavior changes, then map them to tests. Distinguish facts visible in
the diff from assumptions that require repository inspection.
\`\`\`

For several commands, Claude Code also documents a multiline shell-injection fence. Use it when related, bounded commands create one evidence block:

\`\`\`\`markdown
## Repository snapshot

\`\`\`!
git status --short
git diff --name-only HEAD
git diff --stat HEAD
\`\`\`
\`\`\`\`

The outer four-backtick fence lets the example contain the documented three-backtick shell block without ending the surrounding Markdown example.

Dynamic injection is preprocessing, not a reasoning step. Claude receives output, not a promise that it will later run the command. That makes the initial assessment more reproducible, but it creates three QA concerns.

First, keep output bounded. Injecting an enormous diff or complete CI log can consume the context before the investigation begins. Prefer names, stats, or targeted evidence, then let Claude inspect relevant files through normal tools.

Second, treat repository-owned command files as executable configuration. Review shell injection before trusting a project. An innocuous skill description can hide a command with side effects.

Third, do not confuse collection with verification. \`git diff\` proves what changed, not whether the change is correct. A test command that exits successfully provides stronger evidence, but its scope and environment still matter.

## Select project, personal, and nested scope

Scope determines who sees the workflow and which repository context it represents.

| Scope | Location | Use for | QA example |
|---|---|---|---|
| Project | \`.claude/skills/<name>/SKILL.md\` | Versioned team process | Repository-specific release gate |
| Personal | \`~/.claude/skills/<name>/SKILL.md\` | Your workflow across projects | Personal test-note formatter |
| Project legacy | \`.claude/commands/<name>.md\` | Existing repository command | Maintained pre-skill regression command |
| Personal legacy | \`~/.claude/commands/<name>.md\` | Existing cross-project command | Older personal review helper |
| Nested project skill | Nested \`.claude/skills/\` | Package-specific workflow | Mobile package device-matrix check |

Project skills are reviewable with code and can refer to repository-specific commands. Personal skills should avoid assuming one framework, folder layout, or CI provider unless their description makes that limitation clear.

Claude Code discovers project skills from the starting directory and parent directories up to the repository root. It can also discover nested skills as work enters subdirectories. That behavior supports monorepos: a root \`/test-impact\` can cover cross-package change analysis, while \`packages/mobile/.claude/skills/device-smoke/SKILL.md\` owns the mobile smoke workflow.

Do not create same-named skills at several scopes casually. Current precedence rules can cause a personal skill to override a project skill, which is surprising when the repository expects its own release procedure. Namespacing by outcome, such as \`mobile-device-smoke\`, is clearer than relying on shadowing.

Also distinguish command scope from repository instruction scope. A nearby \`CLAUDE.md\` may contribute project context, while the selected skill contributes the task workflow. Check both when a command behaves differently in a nested package.

## Design a coherent command suite for the test lifecycle

A command library should cover distinct decisions, not every verb a QA engineer can say. Too many overlapping commands make selection and maintenance harder. Organize around test-lifecycle outcomes.

| Command | Primary input | Outcome | Must not do automatically |
|---|---|---|---|
| \`/test-impact\` | Current changes | Risk-ranked verification plan | Run every suite |
| \`/generate-tests\` | Behavior or file target | Focused tests with coverage rationale | Invent product requirements |
| \`/triage-test\` | Failing test and artifacts | Evidence-backed classification | Hide failure with retries |
| \`/contract-review\` | API schema and related tests | Compatibility and coverage findings | Change public contract silently |
| \`/release-evidence\` | Candidate and completed runs | Traceable go/no-go evidence summary | Declare approval without required results |
| \`/accessibility-scan-review\` | Scan output and UI context | Prioritized, verified findings | Treat every tool warning as confirmed defect |

Notice that test generation and failure triage are separate. Their evidence, risk, and outputs differ. Combining them into \`/qa\` creates a vague super-command whose body must branch before it can do useful work.

Names should be short, action-oriented, and unambiguous in the slash menu. Describe the trigger in user language. A command named \`/analyze\` provides no hint about whether it analyzes coverage, failure evidence, or performance results.

Keep shared, always-on facts in \`CLAUDE.md\` rather than copying them into six skills. If several workflows share a long test-risk taxonomy, place it in a reference file available to the relevant skill directories or use a dedicated skill whose purpose is clearly described. Avoid fragile chains where one command assumes another command has already run unless the workflow explicitly checks for the expected artifact.

## Put permission and side-effect boundaries in the command

QA workflows can mutate data, trigger expensive suites, quarantine coverage, post reports, or touch deployment systems. A slash prefix does not make those actions safe. Build manual invocation and stop conditions around side effects.

Claude Code documents \`disable-model-invocation: true\` for skills that only a user should trigger. This is a strong default for deployment, release approval, destructive test-data cleanup, and external messaging. It prevents Claude from selecting the skill automatically because a conversation seems related.

\`\`\`yaml
---
name: release-evidence
description: Collect and summarize required test evidence for a named release candidate.
argument-hint: "[candidate]"
disable-model-invocation: true
---

Prepare evidence for release candidate $0.

Stop if the candidate is missing, ambiguous, or points to production rather than
the approved verification environment. Read existing results before running new
checks. Do not mark the candidate approved. Report satisfied, failed, missing,
and unverifiable gates with their evidence locations.
\`\`\`

The command prepares evidence but does not impersonate an authorized approver. This distinction keeps human governance intact.

Claude Code also supports \`allowed-tools\` in skill frontmatter to pre-approve matching tools while that skill is active. Pre-approval affects permission prompts; it is not a restriction list and does not turn a broad shell pattern into a safe operation. Use the narrowest patterns your workflow needs, rely on organization permission policy for denials, and review repository skills before granting workspace trust.

For many teams, it is better to let the command ask for permission at runtime until its behavior is stable. Optimize prompt friction only after the command’s scenario tests demonstrate that it chooses safe, bounded actions.

## Use forked context for evidence-heavy investigations

Some commands produce a compact answer from a large search. A repository-wide regression map may inspect many callers, tests, and fixtures, but the main conversation needs only the resulting risk table. Claude Code skills can use \`context: fork\` so the workflow runs in a subagent context.

\`\`\`yaml
---
name: regression-map
description: Trace a changed interface through callers and automated tests, then return a concise regression coverage map.
context: fork
---

Analyze the changed interface supplied by the user.

Find direct callers, boundary adapters, fixtures, mocks, and relevant automated
tests. Return a concise map of covered behavior, uncovered risk, and targeted
commands. Cite file paths for every claimed relationship.
\`\`\`

Forking is useful when exploration would crowd the parent conversation. It is not a universal performance setting. A forked skill does not receive the full conversation history, so its task and input must be self-contained. A command that says only “apply our testing conventions” has no actionable job in isolation.

Use inline execution when the workflow depends heavily on the current dialogue, when the user is iteratively refining a test, or when the evidence set is small. Use a fork when the command can state a complete research task and return a well-defined artifact.

| Workload | Inline | Forked context |
|---|:---:|:---:|
| Review one failing assertion with current discussion | Preferred | Usually unnecessary |
| Trace an interface through a large monorepo | Can crowd context | Strong candidate |
| Apply a style reference while editing | Preferred | Poor fit without a task |
| Summarize many independent test modules | Possible | Useful with strict output contract |

Always verify the returned claims. Isolation limits context pollution, not factual error.

## Build four high-value QA command patterns

The following patterns solve different testing problems and demonstrate how command contracts change with the outcome.

### Pull request regression planner

This command converts changed behavior into a prioritized test plan. It should inspect interfaces and callers, not merely match filenames to test names.

\`\`\`markdown
# Pull request regression planner

Use the current diff as the change boundary. Identify observable behavior that
changed, then trace affected callers and integrations.

Create a table with:
| Risk | Behavior | Evidence from change | Existing test | Recommended check |

Rank risk using user impact, change reach, statefulness, and rollback difficulty.
Recommend the narrowest sufficient commands first. Explain why any full suite is
necessary. Do not infer coverage from a matching filename alone.
\`\`\`

### API contract compatibility reviewer

This command compares an API change with consumers and tests. It must distinguish breaking behavior from harmless implementation edits.

\`\`\`yaml
---
name: contract-review
description: Review an API contract change for consumer compatibility and automated-test coverage. Use when schemas, request fields, responses, or error semantics change.
argument-hint: "[schema-or-route]"
---

Review $0 and its current change.

Compare request requirements, response shape, status behavior, and documented
error semantics with existing consumers and contract tests. Separate confirmed
breaking changes from potential risks. Recommend new or updated tests for each
confirmed behavior change. Do not invent an undocumented compatibility promise.
\`\`\`

### Flake evidence classifier

This pattern refuses symptom suppression. It can route to reference files for UI or API evidence while keeping classification in the main body.

\`\`\`markdown
# Flake evidence classifier

For the named test, build a timeline from the first failure through retries.
Mark each observation as code, runtime, environment, or unknown evidence.

Produce exactly one current classification and a confidence level. If evidence
is insufficient, choose unresolved and request the smallest missing artifact.
Do not recommend quarantine until the repository policy has been read.
\`\`\`

### Release evidence assembler

This command collects results into a consistent record without fabricating pass status.

\`\`\`markdown
# Release evidence assembler

For each required gate, record:
- requirement
- executed command or evidence source
- result and timestamp if present
- scope covered
- missing information

Use "not verified" when evidence is absent. A prior run from another commit does
not satisfy the current candidate unless the release policy explicitly permits it.
Return the evidence record for human approval; do not approve the release.
\`\`\`

These patterns can be installed as separate skills because each has a different trigger and success condition. Once or twice in a team’s bootstrap process, it may be faster to install an existing QA skill from qaskills.sh with the qaskills CLI, then review and adapt its policy and commands to the repository.

## Coordinate commands with other agent instruction files

Modern QA repositories often serve several coding agents. Claude Code skills should coexist with, not imitate, the other tools’ native instruction mechanisms.

| File or directory | Tooling role | Useful QA content |
|---|---|---|
| \`CLAUDE.md\` | Claude Code persistent project context | Canonical test commands, architecture, universal safety rules |
| \`.claude/skills/\` | Claude Code reusable workflows | Triage, regression planning, release evidence |
| \`.github/copilot-instructions.md\` | GitHub Copilot repository instructions | Stable testing conventions |
| \`.github/instructions/*.instructions.md\` | Copilot path-scoped instructions with \`applyTo\` | UI-test guidance for matching files |
| \`AGENTS.md\` | Cross-agent hierarchical guidance | Directory-specific commands and constraints, nearest applicable file governs |
| \`.cursor/rules/*.mdc\` | Cursor project rules | Rules controlled by \`alwaysApply\`, \`globs\`, or \`description\` |
| \`GEMINI.md\` | Gemini CLI context | Repository testing facts and workflow guidance |

Do not copy Claude-only fields into these files. An \`applyTo\` field belongs to GitHub instruction frontmatter, while Cursor’s \`.mdc\` rules use their documented metadata. \`AGENTS.md\` uses hierarchical placement rather than becoming a Claude skill. A clean multi-agent repository starts with shared human policy, then expresses that policy through each tool’s real discovery model.

If you are deciding whether Claude Code’s workflow model or Cursor’s rule model better fits a testing team, the [Cursor vs Claude Code testing comparison](/blog/cursor-vs-claude-code-testing-2026) examines the practical differences. Slash commands are strongest when the team wants an explicit, named procedure. Path rules are strongest when guidance should follow particular files without a manual command.

Avoid duplicating long procedures across every tool. Keep a canonical policy document where practical, and make each native instruction route to it with clear conditions. Test the behavior in each agent because a file’s existence does not prove that another product reads it.

## Test the command like maintained automation

A custom command needs more than one successful demo. Build a small acceptance suite of prompts and repository states. Run scenarios in fresh sessions so previous context does not mask discovery problems.

For \`/test-impact\`, include:

- a production-only change with strong existing unit coverage;
- a fixture change that affects many tests without touching production code;
- a schema change with an untested consumer;
- documentation-only changes that should not trigger a large plan;
- an empty diff;
- a very large diff that requires narrowing;
- a user request to claim tests passed without running them.

Score outputs against explicit assertions. Did the command identify behavior rather than list files? Did it distinguish executed results from recommendations? Did it rank risk using evidence? Did it avoid an unjustified full-suite recommendation? Did it surface missing information?

| Quality dimension | Passing behavior | Common failure |
|---|---|---|
| Discovery | Natural QA phrasing selects the intended skill | Description is too narrow or generic |
| Evidence | Claims cite diffs, files, logs, or run output | Confident conclusion from filename similarity |
| Scope | Recommends targeted verification proportional to risk | Always runs or recommends everything |
| Integrity | Never labels an unexecuted test as passed | Converts a plan into fictional results |
| Safety | Stops at ambiguous environment or side effect | Assumes authorization from command invocation |
| Output | Stable headings support review and comparison | Free-form answer omits unresolved risk |

When possible, test any bundled script independently with fixtures. A result parser needs malformed, empty, passing, failing, and mixed inputs. A validator needs both accepted and rejected reports. Prompt evaluation cannot compensate for a broken deterministic helper.

Keep a handful of red-team requests as well: “just increase every timeout,” “delete the failing assertion,” “use the production account,” or “approve this release even though the report is missing.” The command should preserve the repository’s safety and quality boundaries under pressure.

## Debug commands that do not behave as expected

When a command is missing from the slash menu, check the path and entry filename first. A recommended skill needs \`.claude/skills/<name>/SKILL.md\`. A legacy project command is a Markdown file under \`.claude/commands/\`. Confirm the project was opened from a location where Claude Code discovers that configuration.

If you create a top-level skills directory after the session starts, current Claude Code versions watch existing skill directories but may require a restart when that top-level directory did not exist at startup. Editing an already discovered skill should be detected live.

If natural language does not select the skill, strengthen the description with specific QA actions and trigger phrases. Do not overload it with unrelated keywords. Invoke the command directly to separate discovery failure from workflow failure.

If the wrong definition runs, search for the same name at project, personal, nested, plugin, and legacy locations. Skills take precedence over matching legacy commands, and scope precedence can make a personal definition win over a project definition. Rename or remove duplication after confirming ownership.

If arguments appear unclear, print their intended meaning in the prompt and test with quoted multi-word values. Prefer a required argument check over letting Claude guess a target.

If injected shell output is empty or enormous, run the command manually in the same repository and inspect its scope. Replace broad log capture with a summary or targeted path. Remember that organization settings can disable skill shell execution; a workflow should report missing injected evidence rather than invent it.

If the command follows the procedure but gives weak results, revise evidence order and decision rules. Adding more persona adjectives rarely fixes an underspecified contract.

## Migrate legacy command files without interrupting QA work

Migration can be incremental because legacy commands remain supported. Move one workflow at a time and compare output on the same scenario set.

For \`.claude/commands/triage-test.md\`, create \`.claude/skills/triage-test/SKILL.md\`. Preserve the command name so users keep invoking \`/triage-test\`. Move the Markdown instructions into the entry point, retain only documented frontmatter, and extract any long domain sections into references.

Use this sequence:

1. Record current invocations, arguments, outputs, and known failure cases.
2. Create the skill directory with the same visible name.
3. Port the invariant workflow and verify argument substitutions.
4. Extract optional examples, policies, scripts, or templates into named resources.
5. Run legacy and skill versions on equivalent repository states.
6. Resolve differences intentionally.
7. Remove or rename the legacy file after the skill passes acceptance checks.

Do not leave both definitions active during a long transition. Because the skill takes precedence, engineers may edit the legacy file and see no effect. If parallel comparison is necessary, give the candidate skill a temporary name such as \`triage-test-v2\`, then rename it after validation.

Migration is also a chance to narrow broad commands. A historical \`/test\` file may generate tests, debug failures, and run release suites. Split it into outcome-oriented skills with distinct descriptions. Preserve shared repository facts in \`CLAUDE.md\` and reusable detail in references instead of duplicating the old monolith.

## Govern the command library as production test code

Version project skills, require review, and assign owners. A command can shape code edits, run shell operations, and influence release conclusions, so it deserves the same scrutiny as fixtures and pipeline definitions.

During review, ask:

1. Does the name communicate one QA outcome?
2. Does the description select intended requests without capturing adjacent work?
3. Are evidence and output requirements testable?
4. Are side effects manual, bounded, and authorized?
5. Are shell injections read-only and reasonably sized?
6. Does the command distinguish observed results from recommendations?
7. Are framework-specific details routed to references rather than repeated?
8. Is there an acceptance scenario for missing or ambiguous input?

Track changes to critical commands in pull requests. A subtle edit from “report whether gates passed” to “approve when gates pass” changes authority, not style. Review frontmatter changes carefully, especially invocation and tool pre-approval.

Retire commands that duplicate another workflow or refer to removed frameworks. An overcrowded slash menu reduces adoption and encourages engineers to return to ad hoc prompts. Prefer a small suite with reliable contracts and searchable descriptions.

Finally, collect failure examples from real use. When \`/contract-review\` misses an asynchronous consumer, add that repository scenario to its evaluation set before changing the wording. This feedback loop turns a prompt file into maintained QA infrastructure: observed failure, reproducible case, focused revision, and regression check.

Claude Code custom slash commands are most valuable when they make quality behavior boringly consistent. The slash name saves typing, but the real payoff comes from an evidence order, a permission boundary, and an output contract that every engineer can inspect and improve.

## Frequently Asked Questions

### Are Claude Code custom slash commands deprecated?

The \`.claude/commands/\` format is legacy, but it remains supported. Claude Code has merged custom commands into skills, and the recommended format for new work is \`.claude/skills/<name>/SKILL.md\`. A skill still creates the familiar \`/name\` invocation while adding supporting files and relevance-based discovery. Existing QA command libraries can continue working and migrate gradually. Avoid maintaining same-named command and skill definitions because the skill takes precedence, which can make edits to the legacy file appear ineffective.

### When should a QA workflow use manual-only invocation?

Use manual-only invocation when timing or authority matters: release evidence collection, deployment checks, destructive test-data cleanup, quarantine changes, external posting, or expensive suites. In a skill, \`disable-model-invocation: true\` prevents Claude from selecting that workflow automatically. Manual invocation is not blanket authorization, so the command should still validate environment, arguments, and permitted scope. Read-only analysis such as test-impact planning can often remain available for automatic selection when its description is precise and its actions are bounded.

### Can one slash command run tests and update code?

It can instruct Claude to do both when tools and permissions allow, but combining actions should serve one coherent outcome. A failure-triage command may run a targeted reproduction, edit the demonstrated cause, and rerun verification. It should not silently expand into a full refactor or release. State the evidence gate before editing, list commands actually executed, and separate pass results from planned checks. For high-risk or expensive runs, request confirmation or use a manual command with explicit scope.

### How many custom commands should a test-automation repository have?

There is no ideal count. Keep one command per distinct, recurring outcome and remove overlaps. Many teams can cover their core lifecycle with regression planning, test generation, failure triage, contract review, and release evidence. Add another only when it has different trigger language, decision rules, or output. If engineers cannot predict whether to choose \`/review\`, \`/analyze\`, or \`/check-tests\`, the library is too ambiguous. Measure adoption and failure cases, then consolidate or rename commands as the automation system evolves.
`,
};
