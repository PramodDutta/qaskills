import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Claude Skills vs Cursor Rules vs Copilot Instructions: Which to Use in 2026',
  description: 'Compare Claude Skills vs Cursor Rules vs Copilot Instructions for QA automation, then choose the right format for reliable, maintainable agent guidance.',
  date: '2026-07-15',
  category: 'Comparison',
  content: `
# Claude Skills vs Cursor Rules vs Copilot Instructions: Which to Use in 2026

A test repository can contain flawless Playwright fixtures, a carefully designed page-object layer, and years of hard-won debugging knowledge, yet an AI coding agent can still produce the wrong test. The missing piece is often not model capability. It is delivery: which instructions the agent sees, when it sees them, and how precisely those instructions match the file being changed.

That is the practical question behind **Claude Skills vs Cursor Rules vs Copilot Instructions**. All three can teach an agent that your team prefers role locators, forbids arbitrary sleeps, requires an accessibility assertion, or runs smoke tests before a pull request. They do not, however, package and activate that knowledge in the same way.

Claude Skills are reusable capability folders built around a \`SKILL.md\` file. Cursor Rules are repository guidance files, usually \`.mdc\` files in \`.cursor/rules\`, with metadata that controls whether a rule is always active, selected by file globs, or available by description. GitHub Copilot supports repository-wide instructions in \`.github/copilot-instructions.md\` and path-specific files in \`.github/instructions/*.instructions.md\` using \`applyTo\` frontmatter.

For QA engineers, the winner is rarely one universal format. A team might use a Claude Skill for a repeatable failure-triage workflow, a Cursor Rule for every file under \`tests/api/**\`, and Copilot path instructions for the same API suite. The right choice follows from scope, activation, distribution, and the cost of keeping guidance correct.

This guide compares those dimensions through real test-automation work, then gives you a migration and governance plan that does not trap your testing knowledge inside one editor.

## The three formats solve different QA instruction problems

Before comparing syntax, separate three jobs that teams often mix together.

The first job is **repository policy**. Examples include “never commit focused tests,” “use the shared authenticated fixture,” and “place contract tests under \`tests/contracts\`.” These instructions should appear whenever an agent works in the repository, or whenever it touches a matching part of the tree.

The second is **task procedure**. Failure triage is not merely a style rule. It is a sequence: reproduce the smallest failing shard, inspect the trace, distinguish product failure from test failure, change the narrowest layer, and rerun the affected project. A reusable skill is a natural container for that procedure because it can include instructions plus supporting scripts, references, and assets.

The third is **local context**. A mobile test directory may use Appium conventions that would be actively harmful in a Playwright web directory. A broad instruction file cannot express every local exception cleanly. Path-aware rules or nested repository guidance are better suited to that context.

| QA instruction need | Typical example | Best-shaped mechanism | Main failure if misapplied |
|---|---|---|---|
| Repository policy | No fixed waits in browser tests | Always-on repository instruction | The rule is forgotten in some editor |
| Path-specific convention | API tests use a shared request fixture | Glob or path-scoped instruction | UI conventions leak into API tests |
| Repeatable procedure | Diagnose a flaky CI test | Claude Skill | A long workflow bloats every prompt |
| Agent navigation | Explain test layers and validation commands | \`AGENTS.md\` plus tool-native files | Agents guess commands or ownership |
| Portable team knowledge | Locator and assertion standards | Canonical neutral document, adapted per tool | Three copies drift apart |

This distinction immediately prevents a common mistake: putting a 200-line triage runbook in an always-on instruction file. Every test-generation request then pays the context cost, even when the agent only needs to rename a fixture. Conversely, reducing a delicate database-reset procedure to “clean up test data” leaves too much freedom at the exact point where errors are expensive.

## How Claude Skills package a testing capability

A Claude Skill is a folder whose required entry point is \`SKILL.md\`. The file begins with YAML frontmatter containing \`name\` and \`description\`, followed by Markdown instructions. The name is limited to 64 characters, and the description to 1024 characters. The description matters disproportionately because it tells the agent when the skill should activate. The body can remain focused on execution after activation.

Project skills live under \`.claude/skills/\`; personal skills live under \`~/.claude/skills/\`. A project skill can travel with a test repository, while a personal skill can capture an engineer's private workflow across repositories. A skill folder may also contain scripts, references, and assets, which makes it more than a decorated prompt.

Consider a skill for investigating Playwright flakes:

\`\`\`markdown
---
name: investigate-playwright-flake
description: Diagnose intermittent Playwright test failures using traces, retries, logs, and fixture analysis. Use when a browser test passes locally but fails intermittently in CI.
---

# Investigate a Playwright flake

1. Identify the smallest failing project, file, and test title.
2. Inspect the first-attempt trace before studying retry output.
3. Classify the failure as product, environment, data, timing, or test design.
4. Check fixture scope and test-data ownership before changing timeouts.
5. Make the narrowest justified change.
6. Rerun the affected test repeatedly and run its containing project once.

Read references/classification.md when the failure category is ambiguous.
Run scripts/summarize-results.ts when a Playwright JSON report is available.
\`\`\`

That body describes a workflow rather than a permanent coding preference. A \`references/classification.md\` file can hold the team's failure taxonomy. A script can deterministically summarize repeated failure signatures. The skill loads when relevant instead of occupying context for every edit.

Claude Skills are therefore strongest when a QA task has a recognizable trigger and a reusable execution path. Good candidates include converting manual cases to automated tests, triaging a flaky suite, reviewing a test plan against risk, generating contract tests from an approved schema, or preparing a release-quality report.

They are less natural for a tiny universal rule such as “use two-space indentation.” That belongs in a formatter or always-on repository guidance. A skill should provide capability that earns its context footprint.

For a field-by-field explanation and validation checklist, use the [SKILL.md format guide](/blog/skill-md-format-guide). It is useful when the comparison in this article has already led you toward the skill model.

## How Cursor Rules attach guidance to test files

Cursor Rules are stored in \`.cursor/rules\`, commonly as files with the \`.mdc\` extension. Their metadata can use \`alwaysApply\`, \`globs\`, and \`description\` to control how guidance is surfaced. This model is well suited to repositories where conventions vary by file family.

Imagine a monorepo with browser tests, API tests, and k6 performance scripts. The API rule can match API test files and remain absent when an agent edits the UI suite:

\`\`\`markdown
---
description: Conventions for API integration tests that use the shared request fixture
globs: tests/api/**/*.spec.ts
alwaysApply: false
---

# API integration test rules

- Import the shared request fixture from the API test support layer.
- Create unique test data through supported API helpers.
- Assert status, response contract, and one business outcome.
- Do not depend on browser-created state.
- Delete mutable records when the fixture does not provide automatic cleanup.
\`\`\`

The advantage is proximity between a rule's scope and the files it governs. A developer asking Cursor to add a negative API case does not need to remember to name a special workflow. The matching path supplies relevant guidance.

An always-applied rule can contain the small set of principles that truly govern the whole repository:

\`\`\`markdown
---
description: Non-negotiable automation rules for this repository
alwaysApply: true
---

# Repository test guardrails

- Never add arbitrary delays or disabled assertions.
- Never commit focused or skipped tests without an explanatory issue reference.
- Reuse existing fixtures before creating new global setup.
- Report the exact validation command and its result after changing tests.
\`\`\`

The risk is fragmentation. Ten narrowly scoped rules can be clearer than one enormous file, but only if their globs are accurate, overlaps are intentional, and engineers can discover which rule controls a file. A renamed test directory can silently make a glob irrelevant. QA maintainers should review rule coverage during structural refactors, just as they review CI path filters.

Cursor Rules also remain editor-specific distribution artifacts. Their content may express durable QA knowledge, but the activation system belongs to Cursor. Teams using multiple agents need a canonical policy source or a deliberate synchronization process.

## How Copilot Instructions map repository and path scope

GitHub Copilot offers a straightforward repository-level entry point: \`.github/copilot-instructions.md\`. Instructions there can explain the test stack, commands, architecture, and universal expectations. For narrower scope, files under \`.github/instructions/\` with names ending in \`.instructions.md\` can use \`applyTo\` frontmatter.

A repository-wide file might say:

\`\`\`markdown
# Copilot instructions for test automation

This repository uses Playwright Test for browser coverage and Vitest for isolated units.

When changing a browser test:
- Prefer accessible role, label, and text locators over CSS structure.
- Use fixtures from tests/fixtures rather than adding beforeEach login flows.
- Keep assertions at the user-observable boundary.
- Run the smallest affected test first, then the relevant project.

Do not increase a timeout until evidence identifies a slow supported operation.
\`\`\`

Path-specific instructions can isolate component-test expectations from end-to-end expectations:

\`\`\`markdown
---
applyTo: "tests/components/**/*.spec.tsx"
---

# Component test instructions

- Render through the shared test wrapper so theme and routing are present.
- Prefer user-visible queries.
- Mock only network or platform boundaries, not the component under test.
- Cover loading, success, empty, and failure states when they are supported.
\`\`\`

For QA organizations already centered on GitHub and Copilot, this layout is easy to review in pull requests. Repository instructions give every contributor a common floor, and path instructions handle local conventions without turning the main file into a directory of exceptions.

The limitation resembles Cursor's: the files teach a particular product how to gather context. They are excellent control surfaces but not automatically a cross-agent standard. A Copilot instruction file also should not become an unbounded test handbook. Keep instructions actionable and move stable background knowledge to repository documentation when the agent only needs a pointer.

## Activation and context cost decide more than syntax

The visible syntax differences are small compared with activation behavior. A useful instruction that does not activate is equivalent to a missing instruction. An irrelevant instruction that always activates consumes attention and can conflict with the task.

| Dimension | Claude Skills | Cursor Rules | Copilot Instructions |
|---|---|---|---|
| Primary unit | Capability folder with \`SKILL.md\` | Rule file in \`.cursor/rules\` | Repository or path instruction file |
| Natural activation | Description and task relevance | Always-on, glob matching, or description-led | Repository scope or \`applyTo\` path matching |
| Best QA fit | Multi-step procedures and reusable toolkits | File-family conventions inside Cursor | Repository and path policy inside Copilot |
| Supporting resources | Scripts, references, and assets can live beside the skill | Guidance is usually organized as rule files | Guidance is organized in repository instruction files |
| Main context risk | Description triggers too broadly or narrowly | Too many always-on rules or overlapping globs | Large global file or overly broad path patterns |
| Personal reuse | \`~/.claude/skills/\` | Usually repository or user-managed editor configuration | Repository instructions are the central team surface |

Suppose an engineer asks, “Why does checkout.spec.ts fail only on WebKit in CI?” A flake-investigation skill may activate because the task matches its description. The skill can then guide evidence collection across traces and retries.

If the engineer instead asks, “Add a boundary-value test to tests/api/coupons.spec.ts,” a matching Cursor glob or Copilot \`applyTo\` rule can inject API-test conventions immediately. Loading the entire flake runbook would be wasteful.

This leads to a useful design test: **Could the instruction be selected from the file path alone?** If yes, path-scoped rules are attractive. **Does it describe a procedure that may span many paths and tools?** If yes, a skill is usually the better shape. **Must it govern nearly every change?** Put the smallest possible version in repository-wide instructions, and enforce mechanically where possible.

Context cost is not merely token count. Conflicting advice also creates decision cost. If a global file says “all test setup belongs in beforeEach” while a local rule says “use worker-scoped authentication fixtures,” the agent must reconcile an architectural contradiction. The more instruction surfaces you add, the more intentionally you must define precedence and ownership.

## A QA decision matrix for choosing the primary mechanism

Use the following matrix to choose a primary mechanism for a specific body of knowledge, not for your entire company. Score your actual workflow, not your preferred vendor.

| Testing scenario | Claude Skill | Cursor Rule | Copilot Instruction | Recommended primary choice |
|---|---:|---:|---:|---|
| Intermittent failure investigation | 5 | 2 | 2 | Skill, because the procedure spans artifacts and commands |
| Locator conventions for all UI specs | 2 | 5 | 5 | Tool-native repository or path rule |
| Contract-test generation from an approved schema | 5 | 3 | 3 | Skill, especially with references or scripts |
| Conventions limited to \`tests/mobile/**\` | 2 | 5 | 5 | Path-scoped rule or instruction |
| Release test-summary preparation | 5 | 2 | 2 | Skill, because inputs and output steps repeat |
| Ban on fixed sleeps | 2 | 5 | 5 | Always-on instruction plus linting or review checks |
| Personal exploratory-testing checklist | 5 | 2 | 1 | Personal skill under \`~/.claude/skills/\` |
| Shared repository map and validation commands | 3 | 4 | 4 | Repository instructions, optionally backed by \`AGENTS.md\` |

Scores are directional, from 1 (awkward fit) to 5 (strong fit). They do not say one product is more capable overall. They show how well each packaging mechanism matches the work.

Your editor mix also matters. If every engineer uses Cursor, a well-maintained Cursor rule is more valuable today than a theoretically portable document nobody sees. If half the team uses Copilot and another group uses Claude Code, put durable policy in a neutral source, then maintain thin adapters for activation.

The primary mechanism should own the complete, authoritative version for that context. Secondary files should either point to it or restate only a deliberately small subset. Blindly copying the same 150 lines into three locations creates three claims of authority and no reliable way to resolve drift.

## Worked example: teaching agents to add a resilient Playwright test

Consider a checkout test for a discount code. The test must use an authenticated fixture, create isolated cart data, prefer accessible locators, assert the calculated total, and avoid fixed waits. How should each system express the guidance?

A Claude Skill can frame the whole creation workflow:

\`\`\`markdown
---
name: add-checkout-playwright-test
description: Add or extend Playwright checkout tests using repository fixtures, isolated cart data, accessible locators, and price assertions. Use for checkout browser coverage.
---

# Add a checkout Playwright test

1. Read the existing checkout specs and shared fixtures before designing the case.
2. Identify the business risk and state transition the case proves.
3. Create independent cart data through the supported fixture or API helper.
4. Interact through role, label, or stable test-id locators already used by the suite.
5. Assert both the visible discount and final calculated total.
6. Run the new test in its configured project and report the command and result.

Do not add a fixed delay. Diagnose missing readiness signals instead.
\`\`\`

A Cursor Rule can make the repository conventions follow checkout files:

\`\`\`markdown
---
description: Checkout browser test conventions
globs: tests/e2e/checkout/**/*.spec.ts
alwaysApply: false
---

- Extend the authenticated checkout fixture.
- Create a fresh cart for each test.
- Use accessible locators consistent with neighboring specs.
- Assert line totals, discount amount, and final total where relevant.
- Do not use waitForTimeout.
\`\`\`

A Copilot path instruction can carry essentially the same scoped policy:

\`\`\`markdown
---
applyTo: "tests/e2e/checkout/**/*.spec.ts"
---

# Checkout test policy

Use the authenticated checkout fixture and unique cart data. Follow locator patterns in adjacent specs. For discount scenarios, verify the displayed adjustment and the final total. Never solve synchronization with a fixed delay.
\`\`\`

The skill is richer because it tells the agent how to reason from risk through validation. The rule files are efficient because they attach constraints to the target path. In a mixed environment, a team could keep the full workflow as a skill and reproduce only five stable constraints in both path-specific formats.

When reviewing the generated test, look beyond whether it compiles. Check whether it can run in parallel, whether its data is truly isolated, whether the assertion proves the intended business rule, and whether failure output will identify the broken behavior. Instruction systems should raise the floor on those properties, not merely standardize formatting.

## Portability requires a source-of-truth design

The phrase “write once, use everywhere” is appealing, but activation metadata differs enough that perfect one-file portability is unrealistic. A practical architecture separates **canonical knowledge** from **agent adapters**.

Canonical knowledge is vendor-neutral: the team's locator policy, fixture boundaries, test-data ownership, failure categories, and required validation levels. Agent adapters are small files that put the right subset into the right discovery system.

One repository layout could look like this:

\`\`\`text
docs/testing/
  automation-policy.md
  failure-taxonomy.md
.claude/skills/
  investigate-playwright-flake/
    SKILL.md
    references/
      classification.md
.cursor/rules/
  browser-tests.mdc
  api-tests.mdc
.github/
  copilot-instructions.md
  instructions/
    browser-tests.instructions.md
    api-tests.instructions.md
AGENTS.md
\`\`\`

\`AGENTS.md\` is another useful portability layer. The agents.md standard allows repository guidance to live close to code, and the nearest file wins when more than one applies. A root file can describe the repository and commands, while a nested file in \`tests/mobile\` can override local details. It does not eliminate product-native formats, but it gives agents that support the standard a shared map.

Do not generate every adapter automatically unless your canonical document has a stable structure and the transformation is testable. Natural-language synchronization can preserve words while losing scope. A safer approach is to assign owners, keep adapters short, and review them whenever the canonical policy changes.

| Knowledge type | Canonical home | Adapter strategy | Drift check |
|---|---|---|---|
| Test architecture map | \`AGENTS.md\` or testing docs | Summarize only commands and boundaries | Review after directory changes |
| Browser locator policy | Testing policy document | Small path-scoped rules for UI specs | Compare examples quarterly |
| Flake triage workflow | Skill body and references | Mention skill availability in repository guidance | Run workflow against a real failure |
| Validation commands | Root repository guidance | Repeat exact supported commands where needed | Verify in CI and after script changes |
| Mobile-only exceptions | Nearest local guidance | Matching Cursor and Copilot path files | Audit glob coverage on moves |

This design keeps differences explicit. Portability does not mean pretending activation models are identical. It means the testing principles survive even when a team changes editors.

## Maintenance economics: what your QA team will actually pay

Instruction files are production assets. They have carrying costs: review time, stale examples, broken paths, contradictory rules, and context consumed on every request. The cheapest format to create may be the most expensive to maintain if it duplicates guidance carelessly.

Claude Skills concentrate a workflow and its resources. That is economical for specialized procedures, but a weak description can make the skill invisible. Maintenance includes testing trigger phrases, confirming referenced scripts still work, and removing instructions the agent already handles reliably.

Cursor Rules distribute guidance by scope. That lowers irrelevant context, but repository reorganizations can invalidate globs. Maintenance includes a path coverage audit and an overlap review. If two rules match the same test, their instructions must be compatible.

Copilot Instructions are easy to find in a GitHub-centered repository. Their danger is accumulation: every team adds one more paragraph to the global file until it becomes a compressed wiki. Maintenance means pruning, moving specialist material to path-specific files, and verifying that \`applyTo\` patterns still reflect the tree.

Use a lightweight quarterly audit:

1. Select one recent browser-test change, one API-test change, and one CI failure.
2. Ask the supported agents to explain which guidance they used.
3. Compare their proposed commands and patterns with the repository today.
4. Record missing, stale, conflicting, and redundant instructions.
5. Fix the source of truth first, then update adapters.
6. Delete rules that merely repeat enforced formatter or linter behavior.

Ready-made QA skills from qaskills.sh can reduce authoring time for common workflows. Install them with the qaskills CLI, then review and adapt their assumptions to your actual framework, fixtures, and CI environment. A directory skill should accelerate governance, not bypass it.

## Failure modes that produce confident but fragile tests

The most damaging instruction problems are not syntax errors. They are plausible guidance failures that yield code an agent can defend.

**Overbroad activation** causes cross-layer contamination. A rule written for end-to-end tests tells the agent to use browser fixtures while it edits a unit test. Solve this by narrowing globs or \`applyTo\` patterns and keeping global guidance truly universal.

**Underdescribed skills** never trigger. A description such as “helps with Playwright” does not identify tasks or symptoms. Name the capability, inputs, and situations: intermittent CI failures, trace artifacts, retry divergence, or fixture analysis.

**Procedure disguised as preference** loses ordering. “Handle flaky tests carefully” does not say what evidence comes before a timeout change. Put sequences, branch decisions, and deterministic utilities in a skill.

**Policy disguised as procedure** creates optionality. If “never commit \`test.only\`” lives only inside a release skill, an ordinary test edit can miss it. Keep non-negotiable constraints always visible and enforce them in CI when feasible.

**Copied examples become architecture**. Agents imitate concrete code. If an instruction shows a page object that bypasses current fixtures, that example can outweigh newer prose. Compile or execute representative examples when possible, and remove obsolete ones rather than adding disclaimers around them.

**Validation language is vague**. “Run relevant tests” invites a guess. Give commands that truly exist in the repository, explain the smallest-to-broader order, and tell the agent to report failures rather than conceal them. Do not invent a universal command in a public template.

**Three formats drift silently**. One bans CSS locators, another permits them, and a third recommends them for speed. Assign a policy owner and include instruction-file review in architecture changes. Diffing text helps, but semantic review is still needed because scope metadata changes meaning.

## Migration plan for a mixed-agent testing team

You do not need a wholesale rewrite. Migrate the guidance that creates the most test risk first.

### 1. Inventory instructions by behavior, not file

List every meaningful directive in existing prompts, wikis, rule files, and code-review checklists. Group them into repository policy, path convention, task procedure, reference knowledge, and mechanically enforced rule. This exposes duplicates that file-by-file review hides.

### 2. Choose one owner for each directive

For example, the test platform team may own fixture and CI guidance, while feature teams own domain-specific test-data rules. Ownership should attach to the behavior, not only the file.

### 3. Extract procedures into skills

Move multi-stage tasks such as failure triage, accessibility review, or contract-test generation into focused skill folders. Keep each description concrete enough to trigger and each body narrow enough to load economically.

### 4. Apply path conventions in the editors your team uses

Create \`.mdc\` rules for Cursor and \`.instructions.md\` files for Copilot where directory scope is meaningful. Use the same canonical principle, but adapt metadata deliberately. Confirm a representative file matches each scope.

### 5. Shrink the global layer

Keep only repository facts and non-negotiable constraints that apply broadly. A global file should help an agent orient quickly, not reproduce the whole testing handbook.

### 6. Test with representative QA prompts

Use a small acceptance set: add an API negative case, repair a flaky browser assertion, review a fixture change, and explain validation for a mobile test. Evaluate not only output code but also which instructions activated and whether unrelated guidance stayed out.

### 7. Roll out with review evidence

In the migration pull request, show old and new ownership, representative activations, and validation results. Engineers are more likely to trust instruction infrastructure when they can see the failure modes it prevents.

If your team is comparing the surrounding coding-agent experience as well as instruction formats, the [Cursor vs Claude Code testing comparison](/blog/cursor-vs-claude-code-testing-2026) examines workflow differences beyond these files.

## Measure whether agent guidance improves test quality

Instruction infrastructure should produce observable improvement, not merely cleaner prompt files. Establish a small evaluation set before a major rollout. Use tasks that represent the ways your team actually changes tests: add a boundary case, repair a brittle locator, extend a fixture, diagnose an intermittent failure, and explain the correct validation sequence. Preserve the input repository state so each instruction format sees the same evidence.

Score the resulting work across dimensions that matter in automation. Did the agent reuse the supported fixture? Is test data independent under parallel execution? Does the assertion prove a business outcome rather than an implementation detail? Did the agent avoid arbitrary waiting? Were the reported commands real, appropriately scoped, and honestly summarized? A test that passes once should not receive a high score if it pollutes shared state or hides the risk it claims to cover.

| Evaluation signal | Evidence to collect | Warning sign |
|---|---|---|
| Instruction activation | Agent explanation or observable adherence | Relevant rule was absent or unrelated policy appeared |
| Architectural fit | Fixture, helper, and directory choices | New duplicate abstraction or bypassed support layer |
| Reliability | Repeated run and parallel-safety result | Shared data, order dependence, or a timing workaround |
| Defect sensitivity | Mutation, controlled failure, or assertion review | Test passes when the intended behavior is broken |
| Validation discipline | Exact commands and outcomes | Invented command, hidden failure, or unjustified full-suite run |
| Maintenance cost | Review effort and instruction changes required | One policy update requires risky edits across many files |

Run the evaluation once with existing guidance and once with the proposed design. The sample does not need to become a model benchmark. Its purpose is to reveal whether scope and activation improve engineering outcomes. A path rule may outperform a broad skill for a small API edit, while the skill wins decisively for triage. That result is useful because it validates specialization rather than demanding one mechanism dominate every task.

Revisit the set after framework migrations and major repository restructuring. Old evaluations can reward conventions the team has intentionally abandoned. Keep failed examples as regression cases when they expose a recurring instruction problem, such as selecting a deprecated fixture or running the wrong browser project. This gives instruction changes the same evidence-driven feedback loop that mature QA teams already apply to product code.

## The 2026 recommendation by team shape

For a **Claude-centered QA team**, use project skills for substantial procedures and personal skills for individual workflows. Keep root repository facts concise, and use \`AGENTS.md\` where cross-agent navigation matters. A skill is especially valuable when a workflow includes references or deterministic scripts.

For a **Cursor-centered QA team**, make \`.cursor/rules\` the active delivery layer for file-specific conventions. Reserve \`alwaysApply: true\` for a small core. Store durable testing policy outside the editor-specific files if future portability matters.

For a **GitHub Copilot-centered QA team**, use \`.github/copilot-instructions.md\` for the repository floor and \`.github/instructions/*.instructions.md\` for path-aware guidance. Treat instruction changes like code changes, with owners and representative checks.

For a **mixed-agent enterprise**, do not force every concept into every format. Use a canonical testing policy, \`AGENTS.md\` for a portable repository map, skills for named procedures, and thin product-native adapters for activation. The overlap should be intentional and small.

The durable conclusion is simple: choose by the shape of the knowledge. Procedures belong in capabilities. File-bound conventions belong in path-aware rules. Universal constraints belong in a compact global layer and, whenever possible, in executable enforcement. That division gives agents enough context to create reliable tests without making every request carry the entire QA organization in its prompt.

## Frequently Asked Questions

### Can one QA repository use Claude Skills, Cursor Rules, and Copilot Instructions together?

Yes. A mixed-agent repository can use all three when each has a clear responsibility. Put repeatable procedures such as flake investigation in Claude Skills, attach file-specific conventions through Cursor globs and Copilot \`applyTo\` instructions, and keep universal repository facts compact. The important control is ownership: designate a canonical source for each testing principle and treat product-specific files as activation adapters. Review overlaps whenever directories, fixtures, or supported tools change so agents do not receive contradictory advice.

### Should a locator policy be a skill or an always-on rule?

A short locator policy is usually better as an always-on or path-scoped rule because it should influence ordinary edits without a special task trigger. Scope it to browser and component tests if API or performance files do not need it. A skill becomes useful when locator work turns into a procedure, such as auditing a suite for accessibility, classifying unstable selectors, and migrating them with validation. Mechanical checks should enforce any locator restrictions that can be expressed reliably, leaving the instruction file to explain intent and exceptions.

### How do we know whether an instruction file is too large?

Measure relevance, not only lines. Sample common QA requests and mark which paragraphs materially help each task. If an API test edit loads extensive mobile, visual-regression, and release-report guidance, the global layer is too broad. Split stable path-specific material into scoped files and move multi-step workflows into skills. Also remove prose that repeats formatters, type checking, or CI enforcement. A compact file can still be harmful if its statements conflict, while a longer skill can be efficient when it activates only for the exact procedure it supports.

### What should we validate after converting guidance between formats?

Test activation, meaning, and output. Confirm representative paths match the intended Cursor globs or Copilot \`applyTo\` patterns, and verify unrelated paths do not. For a Claude Skill, try several natural requests that should and should not match its description. Then inspect whether the agent chooses existing fixtures, supported commands, isolated data, and meaningful assertions. Finally, compare all adapters with the canonical testing policy. A textually accurate conversion can still be wrong if metadata changes when or where the guidance appears.
`,
};
