import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'How to Create a Claude Skill (SKILL.md): The Complete Guide',
  description: 'Learn how to create a Claude skill with reliable SKILL.md structure, QA-focused workflows, trigger tests, reusable resources, and team validation.',
  date: '2026-07-15',
  category: 'Guide',
  content: `
# How to Create a Claude Skill (SKILL.md): The Complete Guide

A test automation engineer rarely needs an AI agent to know more syntax. The harder problem is getting the agent to follow the same investigation sequence every time: reproduce the failure, preserve evidence, distinguish product defects from test defects, make the smallest safe change, and run the right verification. A Claude skill turns that sequence into reusable operating instructions.

This guide explains how to create a Claude skill for real QA work, from the first use case through installation and team rollout. The running examples use browser-test failure triage, but the method also fits API contract checks, accessibility audits, mobile test maintenance, performance investigations, and release-readiness reviews.

A useful skill is not a giant prompt saved in a file. It is a compact capability package whose metadata helps Claude select it and whose body tells Claude how to execute a specialized workflow. Optional scripts, references, and assets can carry deterministic logic or project knowledge that should not be rewritten on every run.

By the end, you will have a practical \`SKILL.md\`, a repeatable trigger test, and a review checklist that a QA platform team can apply before sharing the skill.

## Understand the contract Claude is loading

A skill lives in a directory. Its required file is named \`SKILL.md\`. That file starts with YAML frontmatter containing a \`name\` and \`description\`, followed by Markdown instructions. Claude can use the frontmatter to decide whether the skill matches a request. The full body becomes useful after that match, so critical trigger wording belongs in the description, not in a later “when to use” paragraph.

The distinction matters in a test organization. Suppose the body contains an excellent procedure for diagnosing Playwright timeouts, but the description says only “Helps with testing.” A request such as “Find why the checkout spec times out only in CI” may not select it reliably. The workflow is strong, but the routing signal is weak.

Treat the two parts as different testable interfaces:

| Skill surface | Job | QA design question | Common failure |
|---|---|---|---|
| \`name\` | Gives the capability a stable identity | Does it describe one recognizable testing job? | A broad label such as \`qa-helper\` says little |
| \`description\` | Describes capability and matching contexts | Does it include the phrases engineers use when asking for help? | It lists features but omits trigger situations |
| Markdown body | Directs execution after selection | Does it impose evidence, decision, change, and verification gates? | It offers advice without an ordered workflow |
| Optional resources | Supply repeatable logic or deep context | Would a script or reference reduce rediscovery and variance? | Everything is pasted into one oversized file |

The \`name\` must be no more than 64 characters. Use lowercase letters, numbers, and hyphens, and make the folder name match it. The \`description\` must stay within 1024 characters. Those limits are generous enough for a focused skill and restrictive enough to discourage a catalog entry that tries to cover every QA activity.

## Choose one test outcome before creating files

Start with examples, not a directory. Write down three to six requests the skill should handle and two or three adjacent requests it should not claim. This is requirements analysis for an agent capability.

For a browser failure triage skill, positive examples might be:

- “Investigate why the checkout test fails on CI but passes locally.”
- “Triage this Playwright trace and classify the failure.”
- “Fix the flaky locator in the order-history spec and verify the focused suite.”
- “Determine whether this timeout is a product regression, data issue, or test defect.”

Negative examples could include creating an entire end-to-end suite from a product brief, running a general security review, or choosing a load-testing platform. Those jobs deserve different capabilities and different evidence requirements.

Now write a one-sentence outcome: “Given a browser-test failure and available evidence, classify the cause, make a minimal test-side fix only when justified, and report verification plus remaining uncertainty.” This sentence is not necessarily the final description. It is the design boundary.

This boundary prevents the most common form of skill bloat. A “complete QA skill” sounds convenient, yet it must route requests ranging from test planning to network mocking to performance analysis. Its instructions become conditional and shallow. A narrow triage skill can be explicit about artifacts, stop conditions, and the difference between a production bug and an automation bug.

Use a simple scope table before authoring:

| Candidate request | In scope? | Evidence the workflow needs | Expected output |
|---|---:|---|---|
| CI-only browser failure | Yes | CI log, trace, screenshot, test code | Cause class, evidence, fix or escalation |
| Stable locator refactor | Yes, if prompted by a failure | DOM evidence, locator use, focused run | Minimal patch and run result |
| Greenfield test architecture | No | Product risks, stack, environments | Route to a planning skill |
| Production incident diagnosis | No, unless test evidence is central | Service telemetry, incident context | Route to incident workflow |
| Missing test data | Yes | fixture setup, response payload, environment | Data diagnosis and ownership handoff |

The table gives reviewers something falsifiable. They can challenge whether a request belongs, rather than debating vague prose.

## Plan the smallest useful skill package

Once the outcome is clear, decide what belongs in instructions and what deserves a reusable resource. A common first skill needs only \`SKILL.md\`. Add directories only when they reduce repeated work.

\`\`\`markdown
triage-browser-failures/
├── SKILL.md
├── scripts/
│   └── summarize-results.ts
├── references/
│   ├── failure-taxonomy.md
│   └── test-environments.md
└── assets/
    └── triage-report-template.md
\`\`\`

This tree is an example of a mature package, not a required starter layout. The failure taxonomy may explain the team’s approved categories. The environment reference may document test accounts and CI differences. A script may deterministically summarize machine-readable results. An asset may provide the exact report structure expected in a pull request.

Choose a home by how the content is consumed:

| Content | Put it in | QA example | Reason |
|---|---|---|---|
| Ordered judgment workflow | \`SKILL.md\` | Classify before editing | Claude must see it whenever the skill runs |
| Repeated deterministic operation | \`scripts/\` | Parse result files into failure counts | Executable logic is more consistent than regenerated code |
| Detailed project knowledge | \`references/\` | Environment matrix or selector policy | Load it when relevant without bloating core instructions |
| File copied into an output | \`assets/\` | Defect report template | The artifact is used, not treated as general guidance |

Do not create empty folders to look complete. Every resource increases maintenance surface. If a five-line command in \`SKILL.md\` is clear and stable, it may not justify a script. If a policy changes independently and spans many pages, a reference is a better fit than embedding it.

Also avoid duplicating the same rule in the body and a reference. Two copies drift. Keep the operational checkpoint in \`SKILL.md\`, then point to one authoritative reference for detailed categories or project-specific mappings.

## Create the directory in the right Claude scope

Claude Code discovers skills placed in supported skill locations. Use \`.claude/skills/\` inside a project when the capability belongs to that repository and should travel with its QA conventions. Use \`~/.claude/skills/\` when the skill is personal and useful across repositories.

For a project skill, the basic setup is intentionally ordinary:

\`\`\`bash
mkdir -p .claude/skills/triage-browser-failures
touch .claude/skills/triage-browser-failures/SKILL.md
\`\`\`

Repository scope works well for workflows that mention local test commands, environment names, result paths, or team classifications. Personal scope fits a generic accessibility-review method or a private investigation checklist that does not depend on one codebase.

Ask one ownership question: who must update this instruction when the test stack changes? If the answer is the repository’s QA maintainers, commit it with the project. If the answer is the individual engineer, use the user location. A shared skill that exists only in one person’s home directory is hard to audit and impossible for CI-based review to version.

Avoid promising that a skill alone will provide tools, credentials, or environment access. It can tell Claude how to use available capabilities and when to stop. It cannot manufacture a missing CI token, a production account, or a trace that was never retained. State prerequisites in the workflow and make missing evidence an explicit branch.

Ready-made QA skills can also be installed from qaskills.sh with the qaskills CLI. Whether you install or author, review the skill against your repository’s commands and evidence rules before treating its output as release evidence.

## Write frontmatter that routes real testing language

Open \`SKILL.md\` with exactly the required frontmatter fields. The name should be stable and specific. The description should say what the skill does and when it should be used, using vocabulary found in actual QA requests.

\`\`\`yaml
---
name: triage-browser-failures
description: Investigate failing or flaky browser tests, classify the cause from logs, traces, screenshots, application behavior, and test code, then make the smallest justified test-side fix and verify it. Use when asked to triage Playwright or browser E2E failures, CI-only failures, timeouts, flaky locators, missing test data, or suspected product regressions exposed by automated tests.
---
\`\`\`

This description combines capability, inputs, action, and situations. It does not promise to fix every failure. “Smallest justified test-side fix” protects against changing assertions simply to get green. “Suspected product regressions” allows the skill to investigate while preserving the possibility that no test edit is appropriate.

Do not pack the description with every browser or assertion library name. Add technologies that truly affect matching, then rely on task language such as “CI-only failure,” “timeout,” and “flaky locator.” Engineers often ask in terms of symptoms, not tool taxonomy.

For a field-by-field syntax check, use the [SKILL.md format reference](/blog/skill-md-format-guide). Keep all selection guidance in the description because Claude needs it before loading the body. A “Use this skill when” section hidden several screens down cannot repair metadata that failed to match.

## Turn your QA policy into an executable sequence

The body should tell Claude how to work, not merely what good testing looks like. Use imperative steps and decision gates. A reliable triage sequence moves from evidence preservation to classification, then to the smallest justified action and proportional verification.

Start with a short objective and guardrails. Follow with the workflow. Make stopping conditions visible. The following core is compact enough to load but precise enough to constrain risky edits:

\`\`\`markdown
# Triage browser test failures

Determine the most supported cause of a failing browser test. Preserve defect-detection value while minimizing changes.

## Workflow

1. Read the failing test, nearby fixtures, and the exact failure output before editing.
2. Inventory available evidence: retry history, trace, screenshot, video, network output, console errors, and CI environment details.
3. Reproduce with the narrowest documented project command when execution is available.
4. Classify the cause as product behavior, test logic, locator instability, synchronization, test data, environment, or unresolved.
5. Cite the observation supporting the classification and one plausible alternative you ruled out.
6. Change test code only when evidence supports a test defect. Do not weaken assertions to match unexplained behavior.
7. Run the focused test, then the smallest related suite that can detect collateral damage.
8. Report the cause, changed files, commands run, results, and remaining uncertainty.

## Stop conditions

- Stop and report when required credentials, retained artifacts, or a reproducible environment are missing.
- Do not change production code unless the user asks for implementation after diagnosis.
- Do not replace a semantic locator with a brittle positional selector merely to pass the current run.
\`\`\`

Notice that each step produces information needed by the next. Classification happens before modification. Verification is a separate obligation rather than an assumed consequence of editing. Reporting includes uncertainty, which matters when a flaky failure passes once but the cause is not proven.

## Encode evidence gates instead of slogans

“Never create flaky tests” is a slogan. It gives Claude no operational test. An evidence gate states what must be observed before a particular action is allowed.

For locator maintenance, the gate could require confirmation that the target element is correct, the current locator is unstable or ambiguous, and the replacement reflects user-visible semantics or an intentional test contract. For timeout changes, require timing evidence that the expected operation legitimately takes longer. A single slow CI run is not enough to triple every timeout.

Use decision language in the skill:

\`\`\`markdown
Before changing a locator:

- Confirm the assertion targets the intended user action or outcome.
- Inspect the rendered element or retained trace rather than guessing from the selector string.
- Prefer a user-facing role, label, or stable product test contract when available.
- If the application exposes no stable way to identify the target, report the testability gap.

Before increasing a timeout:

- Identify which awaited condition expired.
- Check for application errors, missing data, stalled requests, and incorrect synchronization.
- Increase the limit only when measured valid behavior exceeds the current budget.
\`\`\`

These rules preserve signal. A test that passes after its assertion is weakened may conceal a product defect. A test that passes after an arbitrary wait may remain flaky. The skill should make the agent earn the edit with evidence.

Riskier workflows need lower freedom. A visual inspection checklist can allow judgment. A release data reset needs exact commands, confirmation points, and narrow permissions. Match instruction precision to the cost of a wrong move.

## Make the output reviewable by another engineer

A skill is more useful when its result can be reviewed without replaying the entire agent session. Define a compact handoff that separates fact from inference.

For failure triage, require these fields:

| Report field | What belongs there | Review question |
|---|---|---|
| Failure signature | Exact stage and observed symptom | Is this the same failure the engineer reported? |
| Evidence | Trace events, errors, response status, DOM state, or repeat behavior | Can the classification be independently checked? |
| Cause class | One supported category or unresolved | Is the label stronger than the evidence? |
| Action | Patch, product defect, data fix, environment escalation, or no change | Did the response preserve test intent? |
| Verification | Commands and outcomes | Was the changed behavior actually exercised? |
| Residual risk | Untested paths and uncertainty | What could still invalidate the conclusion? |

Then provide a response template as an asset or directly in the instructions:

\`\`\`markdown
## Triage result

- Failure signature:
- Most supported cause:
- Evidence:
- Alternative considered:
- Change made:
- Verification performed:
- Remaining uncertainty:
- Recommended owner or next action:
\`\`\`

This structure discourages “fixed flaky test” as the entire report. It also exposes an agent that changed code without reproducing, or that inferred a product regression from an assertion message alone.

For test generation skills, the handoff would differ. It might require risks covered, fixtures introduced, assertions by user outcome, commands run, and coverage intentionally deferred. Output contracts should reflect the capability rather than becoming a universal form.

## Use references without hiding the core path

As a test repository grows, the skill may need access to a failure taxonomy, environment matrix, fixture rules, or test command map. Put detailed, independently maintained material in \`references/\`, but keep navigation explicit.

For example, the core procedure can say: “Read \`references/failure-taxonomy.md\` before assigning a cause category. Read \`references/test-environments.md\` only for CI-versus-local or credential-related failures.” The condition tells Claude when the context cost is justified.

A good reference is authoritative and narrowly titled. A bad reference is a dump of every QA document the team owns. If the environment file is long, start it with a contents list and organize by questions an investigator asks: which base URL, what data lifecycle, what browser image, what services are mocked, and who owns access.

Keep volatile project facts out of generic prose. Test commands, supported browsers, and fixture locations may change. Put them in one reference close to the repository, or direct Claude to discover them from package scripts and project documentation before running anything. Do not invent a command just because a framework usually uses it.

The same principle applies to scripts. A result parser should accept documented input and produce a deterministic summary. The skill should explain when to run it, what it reads, and how to treat errors. Test the script separately with representative passing, failing, malformed, and empty result files.

## Build a realistic example around a Playwright failure

Consider a checkout spec that passes locally but fails in CI while waiting for an order confirmation. A weak agent immediately adds a longer timeout. A well-designed skill forces a richer investigation.

First, the agent reads the assertion and fixture setup. The trace shows the submit action fired, the order request returned an error, and the confirmation heading never appeared. The console contains an application error. That evidence points away from synchronization and toward product, data, or environment behavior.

Next, the agent compares CI inputs without exposing secrets. It finds that the seeded product referenced by the test is unavailable in the CI environment. If the fixture owns that data and failed to create it, the likely cause is test setup. If the application incorrectly rejects valid seeded inventory, the likely cause is product behavior. The classification depends on an ownership contract, not the fact that the browser timed out.

The skill can encode this branching model:

\`\`\`typescript
type Cause =
  | 'product-behavior'
  | 'test-logic'
  | 'locator-instability'
  | 'synchronization'
  | 'test-data'
  | 'environment'
  | 'unresolved';

type TriageDecision = {
  cause: Cause;
  observations: string[];
  safeTestEdit: boolean;
  nextVerification: string;
};
\`\`\`

This code is illustrative domain language, not a required Claude schema. Its value is conceptual: observations support a cause; cause determines whether a test edit is safe; the action determines verification.

If the evidence supports a fixture defect, the agent patches only the setup, runs the focused checkout case, and runs the related purchase suite. If evidence supports a product regression, the agent should not “fix” the test. It should preserve the failing assertion and provide a defect-ready report.

## Test skill triggering like a routing system

After writing the first version, evaluate both selection and execution. A skill can fail because it was not chosen, or because its body produced a poor result after selection. Treat those as separate bugs.

Create a trigger matrix with natural prompts from different engineers. Include direct, indirect, abbreviated, and near-miss wording:

| Prompt | Should select? | Why | What to inspect |
|---|---:|---|---|
| “Triage this Playwright CI failure” | Yes | Direct tool and action language | Description includes both concepts |
| “Checkout is green locally and red in pipeline” | Yes | Symptom matches CI-only failure | Description covers context without exact phrase |
| “Write an E2E strategy for subscriptions” | No | Architecture, not failure triage | Skill boundary remains narrow |
| “The API contract suite found a 500” | Usually no | Browser skill lacks primary evidence model | Another capability should handle it |
| “Stop this locator from flaking” | Yes | Named failure class | Workflow preserves assertion intent |
| “Increase every timeout to 90 seconds” | Select, then challenge | Request concerns a failure symptom but proposes unsafe action | Evidence gate should prevent blind edit |

For every positive prompt, inspect whether Claude gathers evidence before editing and reports verification. For negative prompts, inspect whether another capability or ordinary reasoning handles the request without forcing this workflow.

Do not tune only for exact phrases copied from the description. Real requests contain shorthand, stack traces, filenames, or frustrated language. A robust description covers the stable intent and context. Also test collisions with neighboring skills. If both “maintain browser tests” and “triage browser failures” select every locator request, sharpen their descriptions around creation versus diagnosis.

## Forward-test the workflow on raw artifacts

Static review catches missing steps, but realistic trials reveal whether instructions generalize. Give a fresh agent the skill and a representative failure artifact without explaining the intended diagnosis. Useful fixtures include a trace summary, test file, CI excerpt, screenshot, and project command documentation.

Run cases across the taxonomy:

1. A genuine application regression where no test edit is correct.
2. An unstable locator with a clear semantic replacement.
3. A data fixture that silently fails in CI.
4. A timeout caused by waiting on the wrong condition.
5. An inconclusive failure with missing artifacts.

Score behavior, not eloquence. Did the agent cite the relevant observation? Did it distinguish what it saw from what it inferred? Did it avoid modifying assertions for the product-regression case? Did it stop honestly when evidence was unavailable? Did it choose focused verification before a broader suite?

Use a rubric:

| Criterion | Pass signal | Failure signal |
|---|---|---|
| Evidence handling | Names concrete artifacts and observations | Guesses from the test title |
| Classification | Connects a cause to evidence and alternatives | Labels every intermittent run “flaky” |
| Change safety | Edits only the proven test-side fault | Weakens assertion or adds arbitrary delay |
| Verification | Runs or clearly identifies proportional checks | Says “should work” without execution |
| Uncertainty | States missing proof and residual risk | Presents a single passing retry as certainty |

When a trial fails, revise the smallest responsible part. A routing miss suggests description work. A skipped evidence step suggests body ordering or a stronger gate. A project command error suggests the repository reference is stale or the instruction encouraged guessing.

## Validate installation and parsing separately

Before blaming skill logic, check the mechanical layer. Confirm the file is named \`SKILL.md\`, the folder uses the intended hyphenated name, and frontmatter opens and closes with YAML delimiters. Confirm \`name\` and \`description\` are present and within their documented length limits.

Then start a new Claude Code context and try representative prompts. A fresh context matters because earlier conversation can make Claude appear to remember the workflow even when discovery is broken.

Keep a small validation record:

\`\`\`yaml
skill: triage-browser-failures
scope: project
checks:
  - frontmatter parses
  - name matches folder
  - direct triage prompt selects workflow
  - symptom-only prompt selects workflow
  - strategy prompt does not select workflow
  - product regression case preserves failing assertion
  - fixture defect case verifies focused and related tests
\`\`\`

This is a team checklist example, not additional \`SKILL.md\` frontmatter. Keeping it outside the metadata avoids inventing fields Claude does not use for selection.

If discovery works in one repository but not another, compare the installation scope. A project skill under \`.claude/skills/\` belongs to that project. A personal skill under \`~/.claude/skills/\` is the appropriate cross-repository location. Also confirm that a copied folder did not acquire an extra nesting level.

## Diagnose weak behavior without rewriting everything

When the skill disappoints, identify which layer failed. Rewriting the entire file destroys useful signal about the cause.

If it does not trigger, revise the description with the missing testing intent, symptom, artifact, or tool term. Remove generic claims that compete with more meaningful words. Check whether the request actually belongs within scope.

If it triggers but edits too early, move evidence collection and classification ahead of modification. Add a clear gate such as “Change test code only after naming the observation that proves a test-side defect.” If it runs too much, require the narrowest relevant check first and broader regression based on changed surface.

If it repeatedly invents commands, tell it to discover documented commands from repository configuration or references, and to report when none are available. Do not solve this by embedding an assumed framework command that may be false next quarter.

If the file becomes too long, extract domain detail. Keep the main workflow and resource-routing instructions in \`SKILL.md\`; move extensive taxonomies, environment maps, and examples into references. The core body should be a field guide, not the company wiki.

If related capabilities collide, compare their descriptions side by side. Separate by user outcome. “Create browser tests from acceptance criteria” and “triage failing browser tests from execution evidence” are clearer neighbors than two skills that both claim “browser automation support.”

## Share the skill across agent ecosystems deliberately

QA teams often use Claude Code beside GitHub Copilot, Cursor, or repository-wide agent instructions. The underlying testing policy can be shared conceptually, but each host has its own documented instruction surface.

GitHub Copilot supports repository-wide instructions in \`.github/copilot-instructions.md\` and path-specific instruction files in \`.github/instructions/*.instructions.md\` with \`applyTo\` frontmatter. The AGENTS.md standard uses \`AGENTS.md\`, with the nearest applicable file taking precedence. Cursor uses \`.mdc\` rule files under \`.cursor/rules\`, with documented metadata such as \`alwaysApply\`, \`globs\`, and \`description\`. Gemini CLI uses \`GEMINI.md\` for contextual instructions.

Do not copy Claude frontmatter into those formats and assume equivalent behavior. Translate the invariant QA policy, then express scope and selection through each host’s documented mechanism. The browser-triage invariant might be “classify from evidence before editing,” while installation, metadata, and file matching differ.

For a deeper cross-editor comparison, see [Cursor skill authoring practices](/blog/cursor-skills-md-best-practices). The practical goal is consistent test safety, not identical files.

Keep a single owner for shared policy and document how variants are synchronized. Otherwise Claude may prohibit blind timeout increases while an editor rule silently recommends them. Review host-specific copies whenever the failure taxonomy, test commands, or evidence standards change.

## Roll out a QA skill with measurable acceptance criteria

Treat the skill like test infrastructure. Give it an owner, version changes through normal review, and define what successful adoption looks like. Useful measures are behavioral: fewer assertion-weakening patches, more triage reports with trace evidence, and a higher share of changes accompanied by focused verification. Avoid claiming improvement from usage count alone.

Start with a small group and a representative slice of failures. Ask reviewers to tag where the skill helped, where it slowed the investigation, and where it made an unsupported assumption. Update the workflow from observed failure modes.

Before merging a shared skill, require this review:

- The name and folder are focused and within limits.
- The description covers capability plus real trigger language.
- The body uses an ordered, imperative workflow.
- Evidence gates protect assertions and production behavior.
- Commands are documented or discovered, never guessed.
- References have explicit read conditions and no duplicated policy.
- Example trials include product, test, data, environment, and unresolved causes.
- The output makes changes, verification, and uncertainty reviewable.

A skill is ready when another engineer can use it on an unfamiliar failure and still preserve the test’s purpose. It is not finished forever. New frameworks, changed CI evidence, and recurring agent mistakes should feed the next revision.

## Frequently Asked Questions

### How long should a Claude SKILL.md be?

Make it as short as the workflow allows, while retaining the decisions Claude cannot safely infer. A focused QA skill often needs an objective, ordered steps, evidence gates, resource directions, stop conditions, and an output contract. Move lengthy environment maps, taxonomies, and tool-specific examples into \`references/\`. Length is not the quality metric. Test whether a fresh agent follows the procedure on several realistic artifacts. If steps are repeatedly skipped, improve their placement and specificity before adding broad explanation.

### Should a QA skill contain test runner commands?

Include commands only when they are verified for the repository and stable enough to maintain. A project-scoped skill can direct Claude to a documented command map or to repository configuration. A generic personal skill should usually instruct Claude to discover the project’s supported commands instead of assuming a package manager or framework. Require the narrowest focused check first, followed by a related suite when the change warrants it. If no trustworthy command is available, the skill should report that limitation rather than fabricate one.

### Can one Claude skill cover API, browser, mobile, and performance testing?

It can, but broad scope usually weakens triggering and execution. Those domains rely on different artifacts, cause taxonomies, safety constraints, and verification strategies. Prefer separate skills when the work has distinct outcomes, such as API contract failure triage versus mobile UI test repair. Share common policy through concise references only when it genuinely stays identical. A narrow skill is easier to select, forward-test, review, and improve without creating conditional instructions that rarely apply to the current task.

### How do I know whether a failed run is a skill problem or a model limitation?

Repeat the case with a fresh context and inspect the failure layer. If the skill was not selected, examine metadata and scope. If selected but a required step was missed across varied cases, tighten ordering, gates, or resource directions. If the necessary evidence was absent, the correct behavior may be to stop rather than solve. Compare multiple representative artifacts, not one anecdote. A skill cannot guarantee judgment, but it can make good behavior more likely and unsupported actions easier for a reviewer to detect.
`,
};
