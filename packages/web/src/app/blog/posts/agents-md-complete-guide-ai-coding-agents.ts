import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'AGENTS.md: The Complete Guide to the Cross-Tool Standard for AI Coding Agents',
  description: 'Use this agents.md file guide to give AI coding agents precise QA context, safe commands, and directory-specific testing rules across tools.',
  date: '2026-07-15',
  category: 'Reference',
  content: `
# AGENTS.md: The Complete Guide to the Cross-Tool Standard for AI Coding Agents

A QA monorepo may contain a fast unit-test package, a browser suite that takes forty minutes, contract checks with generated artifacts, and mobile tests that require a device farm. To a coding agent, all four can initially look like directories full of code. The dangerous gap is not intelligence. It is missing local context: which commands are safe, which artifacts are generated, where assertions belong, and how far a seemingly small fixture edit can travel.

**AGENTS.md** is a simple, open convention for placing that context inside a repository. The filename is tool-neutral, the content is ordinary Markdown, and nested files can provide instructions closer to the code they govern. That makes it particularly useful for testing organizations whose automation spans tools, languages, packages, and AI assistants.

This reference explains how to design an AGENTS.md hierarchy for QA work, how nearest-file scoping operates, what to write at each directory level, how to migrate from tool-specific files without contradiction, and how to verify that the instructions improve agent behavior. The examples focus on test automation because test repositories expose the standard’s value clearly: they combine executable code with environment safety, costly verification, sensitive artifacts, and domain-specific oracles.

## AGENTS.md in one precise definition

AGENTS.md is a Markdown file that gives coding agents instructions for working within a repository or directory tree. It can describe architecture, commands, conventions, safety constraints, and completion criteria. The convention is documented at https://agents.md and is intentionally independent of a single agent vendor.

Place a root **AGENTS.md** at the repository root for guidance shared across the project. Add nested **AGENTS.md** files where a subtree needs materially different instructions. An agent working on a file should use the instructions in scope for that location. When nested guidance conflicts with broader guidance, the file nearest to the target takes precedence. This nearest-file-wins behavior lets a monorepo state one default while allowing a browser, API, or mobile package to refine it.

| Property | What it means for QA teams | What it does not mean |
|---|---|---|
| Plain Markdown | Humans can review instructions with normal code changes | Markdown alone enforces the rules |
| Repository-local | Guidance evolves with test code and branches | The agent automatically knows unwritten team habits |
| Nested scope | Each automation subtree can define relevant commands | Every directory needs its own file |
| Cross-tool convention | One durable context source can serve multiple agents | Every agent supports every sentence identically |
| Version controlled | Changes have authorship, review, and history | Old guidance remains correct without maintenance |

The standard is best understood as an instruction surface, not a configuration API. Do not invent frontmatter fields for it. Use headings and direct prose. Agent products can differ in discovery details or capabilities, so teams should verify behavior in the tools they actually use while keeping the content portable.

## Map the instruction tree before writing prose

The most important design decision is not wording. It is placement. Instructions should live at the highest directory where they are fully true and no higher. This minimizes duplication while keeping exceptions close to the affected code.

Imagine this repository:

\`\`\`text
repository/
├── AGENTS.md
├── packages/
│   ├── web-app/
│   └── shared-domain/
├── tests/
│   ├── AGENTS.md
│   ├── api/
│   │   ├── AGENTS.md
│   │   └── contracts/
│   ├── browser/
│   │   ├── AGENTS.md
│   │   ├── pages/
│   │   └── specs/
│   └── mobile/
│       ├── AGENTS.md
│       └── journeys/
└── tools/
    └── test-data/
\`\`\`

The root file can state repository-wide safety, contribution, and verification expectations. The file under **tests/** can define shared test-data isolation and reporting rules. The browser file can define locator policy and trace use. The API file can define schema assertions and authenticated client fixtures. Mobile can document simulator or device-farm boundaries.

Use this placement test for every candidate instruction:

| Question | If yes | If no |
|---|---|---|
| Is it true for source and test code? | Root file | Consider the tests subtree |
| Is it true for every automation framework? | Tests-level file | Put it in a framework subtree |
| Does it name a local command or helper? | Place it near that package | Keep the broader file conceptual |
| Is it temporary acceptance criteria? | Keep it in the task or issue | Consider durable instructions |
| Can automation enforce it? | Add enforcement and summarize intent | Write a reviewable decision rule |

Do not create nested files merely to mirror the folder tree. Each file adds a maintenance surface. Add one when a subtree changes commands, architecture, risk boundaries, or definition of done.

## Write the root file as the repository contract

The root file should help an agent orient before it edits anything. It needs enough context to choose a safe path, but it should not drown local guidance in a full contributor manual.

A QA-oriented root example might be:

\`\`\`markdown
# Repository instructions

## Purpose

This monorepo contains the customer application, shared domain packages, and automated tests. Preserve public behavior and keep tests deterministic under parallel CI execution.

## Working method

- Read the nearest AGENTS.md and neighboring code before editing.
- Make the smallest change that satisfies the requested behavior.
- Do not invent scripts, environment variables, endpoints, or fixture APIs.
- Do not edit generated files. Find the documented generator or source definition.

## Safety

- Never use production credentials or production endpoints for testing.
- Do not print tokens, cookies, secrets, or complete personal records.
- Ask before destructive data operations or broad dependency migrations.

## Verification

- Start with the narrowest documented check for the changed package.
- Expand verification when shared code or configuration changes.
- Report commands run and their observed outcomes accurately.
\`\`\`

This root contract does not say how Playwright locators work or which API schema matcher to use. Those are not repository-wide truths. It does establish behavior every coding agent should follow, including an obligation not to fabricate plausible configuration.

State product boundaries that matter for tests. If the repository contains a mock payment provider and a real sandbox adapter, name which is acceptable for automated work. If test data must use a tenant prefix, describe the invariant and point to the existing builder. Keep secrets out of the file itself. Instructions may name the approved secret-loading workflow, but should never contain credentials.

## Let the nearest file refine broad rules

Nearest-file-wins is powerful when refinements are explicit. Suppose the root says to run the smallest relevant unit test before broader checks. The browser suite may define its smallest useful check as one Playwright spec in one configured project. The mobile suite may require a package compilation step before any journey can launch.

The effective instruction set for **tests/browser/specs/cart.spec.ts** is formed from applicable files along its directory path. Broad root statements remain in effect unless a nearer file changes them. The browser instructions should describe only the delta and relevant local details.

\`\`\`markdown
# Browser automation instructions

These instructions apply within tests/browser.

## Design boundaries

- Specs describe user behavior and own business assertions.
- Page objects expose domain actions and stable observable state.
- Shared authentication and data setup go through existing fixtures.
- Prefer accessible role or label locators. Use the established test-id convention when semantics are insufficient.

## Reliability

- Wait for the condition that proves readiness. Do not add fixed sleeps.
- Create isolated data for parallel workers.
- Do not increase retries or timeouts to conceal a reproducible failure.

## Local verification

- Inspect this package's scripts and Playwright configuration before running tests.
- Run the changed spec in the relevant project first.
- Preserve configured traces, screenshots, and videos when diagnosing CI failures.
\`\`\`

Now compare a nested API file:

\`\`\`markdown
# API automation instructions

These instructions apply within tests/api.

- Use the existing authenticated client fixture and test-data builders.
- Assert the relevant status, headers, response shape, and business side effect.
- Do not snapshot whole volatile responses.
- Use unique resource identifiers so tests remain parallel-safe.
- Validate negative cases by checking both the error contract and the absence of a forbidden side effect.
- Run the narrow contract or endpoint test before the package suite.
\`\`\`

There is no contradiction in using different assertion patterns because the files govern different test layers. A conflict becomes problematic when two files make incompatible claims about the same target. Resolve that by editing the hierarchy, not by expecting an agent to guess the team’s intent.

## Design directory rules around test architecture

An effective nested file reflects architecture rather than syntax. Describe where behavior belongs, which abstractions are stable, and which dependencies define the testing boundary.

For each automation subtree, answer these questions:

1. What risk does this suite cover that cheaper layers do not?
2. Which setup capabilities already exist?
3. Where do actions, assertions, and data builders belong?
4. What counts as an observable oracle?
5. Which dependencies may be replaced, and which must remain integrated?
6. How is the smallest useful verification selected?

The answers differ by layer:

| Dimension | Unit package | API contract suite | Browser journey suite | Mobile device suite |
|---|---|---|---|---|
| Primary oracle | Return value and collaboration | Protocol and schema behavior | User-visible state and owned side effects | Device-visible workflow and platform integration |
| Typical isolation | In-process dependencies | Unique server resources | Fixture-created tenant or account | Reset app state and isolated backend data |
| Replacement boundary | Adapters and clock | External provider harness | Uncontrolled third parties only | Device services when approved |
| Diagnostic artifact | Failure and coverage output | Request/response summary with redaction | Trace, screenshot, video | Device logs and captured screen |
| Cost escalation | Package tests | Service environment | Browser projects | Simulator, then device farm |

This table could become prose in the relevant files, but avoid copying it everywhere. A unit package only needs its own row translated into actionable guidance.

Architecture instructions should also prevent accidental abstraction. Tell an agent not to create a new page object, API wrapper, or fixture merely to shorten one test. Extraction is valuable when it represents stable domain behavior or removes meaningful duplication. Thin wrappers around one-line framework calls can make failures harder to understand.

## Document commands without creating fictional interfaces

Agents are good at predicting familiar command names, which is exactly why command guidance needs evidence. A guessed **test:e2e** script may sound reasonable and still not exist. AGENTS.md should either name verified commands or tell the agent where to discover them.

Use a command section like this only after checking the repository:

\`\`\`markdown
## Commands

- Read package.json in the target package before choosing a script.
- Use existing package scripts instead of reconstructing tool commands.
- Start with the narrowest command that covers the changed file.
- Run broader CI-equivalent checks when shared fixtures, configuration, or reporters change.
- Do not claim a check passed unless its output was observed.
\`\`\`

If you include exact commands, explain their scope and prerequisites. A command without context can be dangerous. Does it require a local service? Does it modify snapshots? Does it contact a shared test environment? Does it launch every browser project? Does it require a simulator?

| Command characteristic | Instruction to include | QA risk controlled |
|---|---|---|
| Safe and fast | Name it as the first check | Fast feedback without broad cost |
| Requires local services | Point to the documented startup path | Misleading infrastructure failures |
| Updates artifacts | Require explicit intent before update | Accidental acceptance of regressions |
| Uses shared environment | Describe isolation and allowed operations | Cross-team data corruption |
| Expensive device or browser matrix | Define escalation conditions | Unnecessary time and spend |

Never add a flag because it exists in a similar project. Consult the installed tool’s help, package scripts, and official documentation. This rule is particularly important for snapshot updates, database reset actions, sharding, and environment selection, where a plausible option can alter state.

## Define completion with an evidence ladder

“Done” means more than code generated. For an agent changing tests, completion includes proof proportionate to the change. AGENTS.md can define an evidence ladder that nested files refine.

At the repository level:

- format or lint the changed files using existing automation;
- type-check or compile the affected package where applicable;
- run the narrowest behavior test that exercises the change;
- broaden checks when a public helper, fixture, config, or shared data builder changes;
- inspect generated diffs and artifacts before accepting updates;
- report anything that could not run, including the missing prerequisite.

At the browser level, the evidence may include a focused spec and trace review. At the contract level, it may include consumer and provider compatibility. At the mobile level, a simulator check may be acceptable for layout logic while a platform-integration change requires a real-device pipeline.

Use a decision matrix rather than “always run everything”:

| Changed surface | Minimum evidence | Additional evidence when risk expands |
|---|---|---|
| One test scenario | Focused test and static checks | Feature suite if shared setup changed |
| Shared fixture | Representative consumers and type check | All dependent projects for lifecycle changes |
| Locator in a page object | Affected journey specs | Cross-browser run for rendering-sensitive behavior |
| Contract definition | Target contract validation | Provider and consumer checks |
| Test runner configuration | Smoke test and config validation | CI-equivalent matrix |
| Snapshot baseline | Focused test plus visual diff inspection | Related component or browser coverage |

This prevents two common agent mistakes: stopping after a syntax check, and launching an expensive full suite for a local text change. The file does not need to predict every situation. It needs to make risk-based expansion the default.

## Protect environments, data, and diagnostic artifacts

Testing work carries unusual operational permissions. Fixtures create accounts, reset records, send messages, and store traces. A coding agent must know the boundary before running or changing those operations.

A root or tests-level safety section should cover the actual repository risks:

\`\`\`markdown
## Test environment safety

- Automated tests may use only approved local or non-production environments.
- Do not run reset, delete-all, migration, or bulk cleanup operations without explicit confirmation.
- Create synthetic personal data through existing builders.
- Redact authentication material and personal records from logs, traces, screenshots, and failure messages.
- Preserve tenant and worker isolation in parallel execution.
- Do not bypass environment guards to make a test run locally.
\`\`\`

Avoid vague phrases such as “be careful with data.” Name the operations that require confirmation and the artifacts that can leak information. If a screenshot can capture a real inbox, state that the suite must use synthetic accounts. If traces retain request headers, keep redaction in configuration and tell agents not to disable it while debugging.

Permissions should remain enforced outside Markdown where possible. Environment allowlists, scoped credentials, disposable tenants, secret scanning, and protected CI jobs provide durable controls. AGENTS.md explains intended behavior and helps an agent choose safe actions before enforcement is tested.

## Give failure investigation its own protocol

Agents often receive underspecified requests such as “fix CI” or “stabilize this test.” Without a protocol, they may change the first suspicious line. A tests-level AGENTS.md can require evidence before modification.

Define a QA diagnosis loop:

1. Identify the exact failing test, project, attempt, and environment.
2. Reproduce narrowly when prerequisites are available.
3. Inspect existing output and artifacts before editing.
4. Find the first point where observed behavior diverges from the expected flow.
5. Classify the cause as product, test, data, environment, or still unknown.
6. Change the smallest surface that addresses the supported cause.
7. Re-run the focused test and a relevant regression boundary.

The file can add framework-specific evidence. Browser tests should prioritize traces and rendered states. API tests should inspect a redacted request and response plus server correlation evidence when available. Mobile tests should distinguish application behavior from simulator, device, permission, or network conditions.

The protocol also tells the agent what not to do: do not raise timeouts before locating the delayed condition, loosen an assertion before verifying the requirement, refresh snapshots without reviewing the visual change, or quarantine a failure without recording the unresolved risk.

This sequence turns an agent from a code replacer into a disciplined testing collaborator. It also makes review easier because the pull request can explain cause, evidence, and repair.

## Encode test oracles, not only test mechanics

Repository instructions frequently overfocus on framework style. Correct mechanics can still produce a useless test. The file should teach agents how the team decides that behavior is correct.

For a money transfer rejected by a limit, a weak oracle checks only the error banner. A robust oracle may also verify that no debit occurred, no transfer record was created, and an allowed audit event was recorded. Which outcomes matter depends on the product risk, so the relevant subtree should describe the domain’s source of truth.

Use an oracle checklist:

| Requirement type | Positive evidence | False positive to guard against |
|---|---|---|
| State transition | New state visible through an independent read | UI changed locally but server rejected update |
| Rejected action | Error contract plus unchanged protected state | Error shown after side effect already occurred |
| Notification | Queued or delivered event with intended recipient | UI toast shown without dispatch |
| Access control | Denial and absence of protected content | Hidden button while endpoint remains accessible |
| Idempotency | Same result and one durable side effect | Duplicate records hidden by response handling |

An AGENTS.md file should not prescribe every assertion for every feature. It can state that negative tests verify both the reported error and the absence of forbidden side effects. A current task then names the specific state to inspect.

This is also where manual testing knowledge belongs. Exploratory testers know boundary conditions, recovery paths, accessibility expectations, and operational symptoms that may not appear in code. Convert repeated, stable insights into short oracle rules at the right scope.

## Coordinate generated files, fixtures, and shared utilities

Agents can accidentally edit generated clients, recorded schemas, lockfiles, and snapshots because those files are visible and appear to contain the needed change. The repository contract must distinguish source from output.

Name generated areas only after verifying them. Tell the agent to locate the generator or source definition and use the documented generation workflow. For snapshots, generated change is often expected, but acceptance still requires inspecting the diff rather than treating regeneration as proof.

Shared test utilities need a change-radius rule:

- search for all consumers before changing a public fixture, page object, client, or builder;
- preserve existing behavior unless the task authorizes migration;
- prefer adding a focused capability over exposing raw internals;
- avoid embedding assertions in a shared action helper when callers need scenario context;
- verify representative consumers from different subtrees when lifecycle or authentication changes.

Consider a worker-scoped authenticated fixture. Changing it to test scope may improve isolation but multiply login load and rate-limit pressure. An agent should not make that architectural trade silently. AGENTS.md can require a proposal and impact analysis for fixture scope changes.

Likewise, a data builder that creates default customers may serve unit, API, and browser tests. Adding an edge-state parameter can be safer than duplicating setup in a single spec, but the default must remain compatible. The applicable instruction should make that preservation requirement clear.

## Combine AGENTS.md with tool-specific instruction files

Cross-tool does not mean tool-exclusive. A repository may already use **.github/copilot-instructions.md**, path-specific **.github/instructions/*.instructions.md** files with **applyTo** frontmatter, **.cursor/rules** with **.mdc** files, or **GEMINI.md** for Gemini CLI. Those files can coexist, but uncontrolled duplication creates contradictions.

Assign one source of truth per kind of guidance:

| Guidance type | Preferred durable home | Tool-specific role |
|---|---|---|
| Repository architecture and safety | AGENTS.md hierarchy | Repeat only if required for tool discovery |
| Copilot-only interaction behavior | Copilot instruction file | Describe behavior unique to that tool |
| Cursor rule scoping | .cursor/rules .mdc files | Use documented description, globs, and alwaysApply behavior |
| Gemini CLI context | GEMINI.md | Add Gemini-specific workflow only when needed |
| One task’s acceptance criteria | Prompt, issue, or pull request | No durable duplication |

When duplication is necessary, keep the repeated block short and test for drift. Better still, use the tool-neutral file as the authoritative prose and reserve vendor files for discovery or genuinely product-specific behavior. Do not put unsupported fields into AGENTS.md in an attempt to make it behave like an .mdc or .instructions.md file.

For deeper detail on reusable capability packaging, see the [SKILL.md format guide](/blog/skill-md-format-guide). A skill describes a reusable workflow or specialized capability, while AGENTS.md describes how an agent should work safely and consistently inside a particular repository tree.

## Migrate incrementally from scattered agent notes

Many teams already have instructions spread across READMEs, wiki pages, editor rules, prompt snippets, and tribal knowledge. Migration should consolidate stable truth without deleting useful tool integrations.

Start with an inventory. Label each statement by scope, authority, and freshness. Then resolve contradictions with the engineers who own the affected tests. A locator policy copied into three files may differ because one version reflects a completed migration and another reflects an abandoned plan.

Use this sequence:

1. Create a short root AGENTS.md containing undisputed repository-wide guidance.
2. Add one nested file for the automation subtree with the clearest distinct needs.
3. Remove or rewrite contradictory duplicate prose where ownership permits.
4. Exercise real tasks with each supported agent tool.
5. Add further nested files only when evaluation reveals a scope gap.
6. Establish ownership and a review trigger for future framework migrations.

A migration pull request should show examples of effective instructions for representative paths. Reviewers can inspect a source file, an API spec, and a browser spec and state which rules apply to each. If the answer requires complicated interpretation, the tree is too dense.

Do not attempt to normalize every agent product’s advanced feature. The portable core is plain, factual Markdown. Product-specific matching and interaction features can remain in their native files while sharing the same engineering intent.

## Evaluate instructions with adversarial QA tasks

Good prose is not enough. Test AGENTS.md the way you test a fixture: use representative normal cases and cases that tempt unsafe shortcuts.

Build an evaluation set such as:

- Add a simple API success test using an existing client fixture.
- Add a rejected-operation test where the forbidden side effect must remain absent.
- Repair a browser test that contains a fixed sleep.
- Change a shared login fixture used by parallel workers.
- Diagnose a CI failure with a trace showing a real product 403.
- Update a visual snapshot where the change includes an unexpected missing label.
- Work in a nested mobile directory whose verification differs from the root default.

Score decisions, not verbosity:

\`\`\`yaml
evaluation:
  - criterion: uses_existing_test_data_builder
    result: pass_or_fail
  - criterion: preserves_parallel_isolation
    result: pass_or_fail
  - criterion: proves_negative_side_effect
    result: pass_or_fail
  - criterion: avoids_fixed_sleep
    result: pass_or_fail
  - criterion: reports_observed_verification
    result: pass_or_fail
\`\`\`

The YAML is an illustrative evaluation record, not AGENTS.md configuration. Keep the actual instructions in Markdown.

Run tasks from different working locations so nested scope is exercised. Compare outputs before and after instruction changes across more than one tool if portability is a goal. An agent may interpret natural language differently, but the critical constraints should consistently appear in its plan and code.

Add a path-resolution audit to the evaluation. Select one target from each important subtree and write down the ordered instruction files that should govern it. Then ask the agent to summarize the local constraints before editing. Compare its summary with the expected set, paying special attention to a nested exception that changes a root default. This catches misplaced files and assumptions about scope before they cause code churn.

Test moves as well as edits. A helper relocated from browser tests into a shared package may cross an instruction boundary, changing the appropriate architecture and verification rules. The evaluation should reveal that the agent now follows the shared package contract rather than carrying browser-only conventions with the file. This is a practical way to confirm that guidance is attached to repository responsibility, not remembered accidentally from a previous conversation.

Finally, include a refusal boundary. Present a task that appears to require an undocumented destructive reset or production-like credential. A healthy result identifies the unsafe dependency, searches for an approved alternative, and asks for direction if none exists. Passing this case matters more than generating a complete patch because the instruction hierarchy should improve operational judgment, not just output consistency.

Ready-made QA skills from qaskills.sh can be installed with the qaskills CLI to supply repeatable testing procedures. Evaluate them alongside repository instructions: the skill can explain how to perform a workflow, while the nearest AGENTS.md provides the local commands, boundaries, and architecture it must respect.

## Review the hierarchy when the repository changes

AGENTS.md is code-adjacent infrastructure. It becomes stale when packages move, scripts change, fixtures are replaced, or safety boundaries evolve. Build maintenance into normal engineering events.

Review relevant instruction files when:

- a test package moves or is renamed;
- a runner, framework, or language is upgraded;
- authentication, tenancy, or cleanup fixtures change;
- CI introduces a new project matrix or environment;
- a generated artifact gets a new source or command;
- repeated agent review comments reveal a missing convention;
- a tool-specific instruction file is added or re-scoped.

Each change should remove obsolete language rather than accumulating exceptions. Version control holds history. The current file should remain a clear statement of present behavior.

Use ownership appropriate to scope. The root file may require platform and security review. A browser subtree file may be owned by the test automation maintainers. A domain-specific contract folder may need the service team’s approval for oracle changes.

Measure recurring correction categories. If reviewers still flag positional selectors after a clear browser instruction, check whether the agent saw the right file, whether local examples contradict it, and whether a lint rule could enforce the policy. If the rule no longer reflects product reality, change the rule instead of blaming the output.

## A reference template for a QA monorepo

The following template is deliberately concise. Replace bracketed concepts with verified repository facts and delete sections that do not apply. Do not paste imaginary commands or paths.

\`\`\`markdown
# Agent instructions

## Repository purpose

Describe the product, packages, and testing responsibilities in a few sentences.

## Instruction scope

- Read this file and any nearer AGENTS.md for the target path.
- Nearest instructions refine broader repository guidance.

## Architecture

- Name the major source and test boundaries that affect changes.
- Identify generated areas and their authoritative sources.
- State where shared fixtures, builders, actions, and assertions belong.

## Working rules

- Inspect neighboring code and existing scripts before proposing a pattern.
- Do not invent commands, configuration, helper APIs, or environment names.
- Keep changes focused and preserve public behavior unless migration is requested.

## Test quality

- Keep tests independent under parallel execution.
- Use an observable oracle that would fail for the intended regression.
- Verify rejected actions did not produce forbidden side effects.
- Diagnose readiness failures before changing waits, retries, or timeouts.

## Safety

- Use approved non-production environments and synthetic data.
- Protect secrets and personal information in code and artifacts.
- Ask before destructive or broad state-changing operations.

## Verification

- Name verified discovery locations or exact existing commands.
- Start narrow and expand with the change radius.
- Report observed results and unresolved prerequisites.
\`\`\`

A nested browser file can omit the generic sections and specify only browser architecture, locator policy, fixture boundaries, artifact handling, and local verification. An API subtree can do the same for protocol oracles and client fixtures.

Before merging, walk the hierarchy as if you were an agent. Pick several target files, collect the instructions from root to nearest, and look for conflict, duplication, stale names, and missing safety context. Then perform one realistic change and evaluate the resulting diff.

Teams that use Cursor can compare this tool-neutral foundation with the [complete Cursor guide for QA engineers](/blog/cursor-for-qa-engineers-complete-guide), keeping repository truth portable while using native rule scoping where it adds value.

AGENTS.md succeeds when it makes local engineering judgment visible. It tells an agent not just how to format a test, but which risk the suite owns, what evidence completes the change, and where it must stop for human confirmation. That is the difference between a repository an agent can edit and a repository an agent can work in responsibly.

## Frequently Asked Questions

### Where should AGENTS.md be placed in a test automation monorepo?

Start with one file at the repository root for universal architecture, safety, and verification guidance. Add nested files only where a subtree has materially different commands, test boundaries, or operational risks, such as browser, API, contract, or mobile automation. Place each instruction at the highest directory where it remains completely true. Avoid mirroring every folder, because unnecessary files increase drift. For any target, inspect the applicable hierarchy from the root toward the nearest AGENTS.md.

### What does nearest-file-wins mean for conflicting testing instructions?

It means guidance closer to the target file takes precedence when it conflicts with broader guidance. A root file might recommend the smallest package test, while a nested mobile file defines a simulator compile-and-run sequence as its minimum useful check. Non-conflicting root safety rules still apply. Write nested files as focused refinements, not copies. If engineers cannot explain the effective rules for a representative path, simplify the hierarchy or remove the contradiction rather than relying on an agent to infer intent.

### Is AGENTS.md a replacement for Copilot, Cursor, or Gemini instruction files?

Not necessarily. It is a portable home for repository architecture, testing constraints, commands, and safety. Tool-specific files can still provide native matching, discovery, or interaction behavior: GitHub Copilot uses its documented instruction locations, Cursor supports .mdc rules under .cursor/rules, and Gemini CLI uses GEMINI.md. Keep one authoritative source for each rule and minimize repetition. Where content must be duplicated for discovery, review both copies together so stale test commands or contradictory conventions do not emerge.

### How much detail should an agents.md file guide give an AI testing agent?

Give enough detail to make consequential choices correctly: test-layer purpose, fixture boundaries, data isolation, oracle expectations, safe environments, verified command discovery, and evidence required for completion. Omit generic framework tutorials, long histories, and rules already enforced mechanically unless a short explanation guides behavior. A useful test is whether each paragraph changes an agent’s plan, generated code, or verification. Put specialized details in the nearest relevant file and keep one-off acceptance criteria in the current task rather than permanently expanding the hierarchy.
`,
};
