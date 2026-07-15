import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cursor Rules for Test Automation: The .cursor/rules Complete Guide',
  description: 'Master the cursor rules file test automation workflow with scoped MDC rules that help agents write reliable UI, API, and contract tests faster.',
  date: '2026-07-15',
  category: 'Guide',
  content: `
# Cursor Rules for Test Automation: The .cursor/rules Complete Guide

A coding agent can generate a Playwright test in seconds and still cost a QA team an afternoon. The test may use the wrong fixture, invent a selector convention, bypass the repository's API client, or add a fixed wait that passes only on one laptop. The missing ingredient is usually not model intelligence. It is durable, repository-specific direction.

Cursor project rules turn that direction into versioned files under \`.cursor/rules\`. For test automation teams, those files can describe how to select elements, where fixtures belong, which commands prove a change, how test data is isolated, and when an agent must stop instead of guessing. The rules travel with the codebase, so a new engineer and an AI agent can discover the same constraints.

This guide builds a complete cursor rules file test automation system for UI, API, contract, and shared test infrastructure. It focuses on rules that affect observable quality. Every recommendation is tied to a task an agent actually performs: investigating a failure, creating a test, modifying a page object, or validating a patch.

Cursor's current rules documentation is at https://docs.cursor.com/context/rules. The examples below use the documented MDC fields \`description\`, \`globs\`, and \`alwaysApply\`. They do not depend on undocumented frontmatter or magic prompts.

## Turn the test repository into an executable operating manual

Most automation repositories already contain conventions, but those conventions are scattered. A fixture reveals one authentication pattern. A CI workflow reveals the supported commands. Three page objects imply a locator style. A comment in a flaky test warns against parallel execution. An agent sees fragments and fills the gaps probabilistically.

A useful rule closes a specific decision gap. It does not try to explain the entire repository. When an agent edits a Playwright spec, for example, the relevant rules should answer a small set of questions:

- Which fixture should the test import?
- What locator priority should it follow?
- How should it create and clean up data?
- Which assertions are preferred for asynchronous UI state?
- What is the smallest verification command for the changed area?
- Which files must not be edited as a shortcut?

That makes a rule closer to an executable review checklist than a style guide. A reviewer can point to a violated instruction, and the team can determine whether the rule is accurate by inspecting code and test results.

Rules should encode stable repository truths, not temporary sprint context. “Use the authenticated fixture from tests/fixtures/auth.ts” belongs in a rule if that path and abstraction are maintained. “The checkout bug should be fixed by Friday” belongs in an issue. Durable rules reduce repeated prompting; transient facts create stale context.

The goal is not to make an agent autonomous at any cost. The goal is to make its next action predictable, reviewable, and compatible with the test system.

## Choose the Cursor rule type from the testing trigger

Cursor supports project rules stored as MDC files in \`.cursor/rules\`. A rule's metadata determines how it enters context. The correct choice depends on when the test instruction is needed, not on how important the author thinks it is.

| Rule behavior | MDC setup | Test automation use | Main risk |
|---|---|---|---|
| Always | \`alwaysApply: true\` | Repository-wide safety, required validation, prohibited shortcuts | Context bloat if it contains framework detail |
| Auto Attached | \`alwaysApply: false\` plus \`globs\` | Playwright, API, mobile, performance, or contract conventions by file | A weak glob silently misses relevant files |
| Agent Requested | \`alwaysApply: false\`, no glob, useful \`description\` | Specialized workflows the agent can select by relevance | Vague description makes discovery unreliable |
| Manual | Explicitly selected by the user | Rare migrations, release certification, destructive test-data operations | Easy to forget during routine work |

Always rules should be short because they accompany every relevant interaction. A QA baseline might require reading nearby helpers before adding abstractions, prohibit weakening assertions to make a test pass, and require reporting what was actually executed. Those instructions apply whether the agent touches a spec, CI file, or test utility.

Auto-attached rules carry most framework-specific guidance. A glob such as \`tests/e2e/**/*.spec.ts\` can attach browser-test practices when an end-to-end spec is referenced. Another rule can cover \`tests/api/**/*.test.ts\`. This keeps API response validation out of a locator-editing task.

Agent-requested rules need a concrete description because the model uses it to judge relevance. “Testing information” is poor. “Use when diagnosing CI-only Playwright failures, retries, traces, or parallel worker isolation” gives the agent a recognizable trigger.

Manual rules fit consequential procedures that need deliberate invocation. A production smoke-test checklist or a test-user reset procedure should not arrive merely because a similarly named file was opened.

## Inventory the decisions agents currently guess

Do not begin by creating twenty rules from an idealized template. Begin with evidence from the repository and recent reviews. The fastest inventory is a table of repeated agent mistakes, the correct repository behavior, and the narrowest scope where that correction applies.

| Repeated mistake | Repository truth to encode | Candidate scope | Evidence to cite in the rule |
|---|---|---|---|
| Uses CSS classes generated by the UI library | Prefer role, label, placeholder, then approved test ID | Playwright specs and page objects | Existing stable locators and accessibility policy |
| Creates users through the UI in every test | Use the API-backed worker fixture | Browser setup and specs | Fixture implementation and parallel test design |
| Adds broad snapshots for changing payloads | Assert required fields and business invariants | API and contract tests | Schema, typed client, and review history |
| Runs the full suite after a one-file change | Run the closest project or file first, then broader checks | All test changes | Package scripts and CI workflow |
| Removes an assertion to stop a failure | Diagnose state, synchronization, data, and product behavior first | All tests | Defect and flake triage policy |

Inspect the commands that CI actually runs, not just scripts that happen to exist. Read fixture entry points, shared request clients, test configuration, representative stable tests, and recent fixes for flakes. If instructions conflict with current code, resolve the conflict before publishing a rule. An agent should not be forced to choose between prose and repository reality.

Phrase the resulting instruction as an observable action. “Write robust tests” cannot be checked. “Use web-first Playwright assertions for asynchronously rendered state; do not replace them with fixed delays” can be checked in a diff.

Include exceptions only when they are real and bounded. For example, visual regression tests may intentionally use screenshots, while workflow specs should prefer semantic assertions. Stating the boundary prevents an agent from turning one exception into the default.

## Build a compact always-on QA baseline

The always-applied rule is the constitution of the automation repository. It should protect correctness without teaching every framework. A focused baseline often fits in 25 to 50 lines.


\`\`\`markdown
---
description: Repository-wide quality and verification rules for test automation changes
globs:
alwaysApply: true
---

# QA automation baseline

- Inspect the nearest existing test, fixture, helper, and configuration before editing.
- Preserve the behavior under test. Never weaken, skip, or delete an assertion only to obtain a passing run.
- Reuse established fixtures and clients before creating a new abstraction.
- Keep test data independent so parallel workers do not share mutable records.
- Use deterministic condition-based waiting, never fixed sleeps.
- Do not log passwords, tokens, session state, or complete sensitive payloads.
- Run the narrowest relevant check first, then the repository's required broader check.
- Report the commands run, their outcomes, and any validation that was not possible.
\`\`\`

Each line governs a decision that appears in many testing tasks. None prescribes Playwright syntax or a particular contract-testing library. That distinction matters. If the baseline grows into a framework handbook, it will consume context even during unrelated API or CI work.

“Run the narrowest relevant check first” is intentionally paired with “required broader check.” A fast local loop gives the agent useful feedback; the broader command catches configuration and integration failures. The rule should not invent command names. Put verified commands in a scoped rule or reference the package scripts that define them.

Security guidance should also remain behavioral. Requiring secrets to come from the repository's established environment mechanism is safer than asserting a made-up variable or vault path. If the codebase has a documented secret name, it can be stated. Otherwise, tell the agent to inspect existing configuration and stop when required credentials are unavailable.

## Scope browser testing rules to specs, fixtures, and page models

UI automation needs more context than the baseline, especially around locators, synchronization, and state setup. Attach those instructions only to browser-test paths. The exact glob must reflect your repository; copying a pattern without checking the tree defeats the purpose.


\`\`\`markdown
---
description: Playwright conventions for browser specs, fixtures, and page models
globs: tests/e2e/**/*.spec.ts,tests/e2e/pages/**/*.ts,tests/e2e/fixtures/**/*.ts
alwaysApply: false
---

# Browser test rules

- Import the repository's extended test fixture, not the base package, when a test needs authenticated state or seeded data.
- Prefer locators by role with an accessible name, then label or placeholder. Use a test ID only when semantic locators are not stable or meaningful.
- Keep assertions in specs unless the existing page-model convention deliberately exposes business assertions.
- Use Playwright's waiting assertions for eventual UI state. Do not add timeout-only waits.
- Create prerequisite records through approved fixtures or APIs when the behavior under test does not include UI creation.
- Give every parallel test its own record identifiers and clean up through the established fixture lifecycle.
- On a failure, inspect the first meaningful error and available trace before increasing a timeout or retry count.
\`\`\`

This rule separates user-visible intent from implementation convenience. A role-based locator documents how a user or assistive technology finds a control. A generated class documents how the CSS happened to be built. The former is usually more stable and produces more meaningful failures.

The fixture line protects parallelism. If the repository provides worker-scoped accounts or unique data factories, an agent should use them rather than serializing the suite. Serial execution may conceal collisions but makes feedback slower and leaves the underlying isolation defect intact.

For a deeper skill-oriented setup that complements project rules, see [how to configure a Cursor Playwright skill](/blog/cursor-playwright-skill-setup-guide). A skill can package a repeatable workflow, while project rules remain the repository's persistent constraints.

## Give API tests their own contract language

API automation fails differently from browser automation. Locator rules add noise; payload boundaries, authentication, cleanup, and diagnostic output matter more. A separate auto-attached rule keeps those concerns precise.


\`\`\`markdown
---
description: Conventions for API integration tests and shared request helpers
globs: tests/api/**/*.test.ts,tests/api/clients/**/*.ts,tests/api/fixtures/**/*.ts
alwaysApply: false
---

# API test rules

- Use the existing typed request client and authentication fixture before constructing raw requests.
- Assert the status and the business fields relevant to the scenario. Avoid snapshots of volatile identifiers, timestamps, or complete error payloads.
- Generate unique test records and remove them through the approved cleanup path.
- Distinguish an expected product error from transport failure, invalid test setup, and unavailable dependencies.
- Keep request and response diagnostics redacted. Include correlation identifiers when the service exposes them safely.
- For negative tests, assert both the response classification and the client-visible error contract.
\`\`\`

The phrase “business fields relevant to the scenario” prevents two opposite problems. Under-asserted tests check only a 200 status and miss broken behavior. Over-asserted tests freeze every incidental field and fail on harmless changes. A create-order test might verify the order state, customer association, and calculated total without asserting a generated timestamp's exact string.

Negative tests deserve explicit treatment. A 400 response alone does not prove that the API rejected the correct field for the correct reason. The rule should steer the agent toward stable error codes or documented field errors when those exist. It should not demand a field the service does not actually guarantee.

If API clients are generated from a schema, tell the agent where the generated boundary ends and handwritten helpers begin. Do not encode a fake regeneration command. Reference the repository's checked-in script or official contributor documentation.

## Separate contract tests from broad integration checks

Contract tests need a rule that emphasizes compatibility, deterministic fixtures, and meaningful provider or consumer boundaries. They should not inherit assumptions from end-to-end tests simply because both send HTTP requests.

| Concern | API integration test | Contract test | Cursor instruction |
|---|---|---|---|
| Primary question | Does this deployed or local service behave correctly? | Can two independently changing components communicate? | Name the boundary before adding a case |
| Assertion breadth | Scenario-specific status and fields | Agreed request and response shape plus semantics | Avoid unrelated provider implementation details |
| Test data | Realistic isolated records | Minimal deterministic examples | Keep examples stable and intentional |
| Failure response | Diagnose service, environment, data, transport | Identify consumer expectation or provider verification break | Report which side owns the mismatch |
| Change review | Product behavior and integration risk | Compatibility and versioning risk | Do not update expectations automatically |

A contract rule might state that an agent must identify the consumer, provider, interaction, and compatibility expectation before changing an existing contract. It should prohibit blindly accepting new snapshots or fixtures merely to clear CI. When a provider response changes, the right action may be a product decision, a coordinated migration, or a corrected test. The agent cannot know which from a red diff alone.

Keep these instructions near the contract files with a nested \`.cursor/rules\` directory if the repository is large. That makes the relationship between the rule and boundary visible during review.

## Use descriptions that an agent can route correctly

For agent-requested rules, the description is a routing hint. It should say when the rule is useful, mention recognizable artifacts, and distinguish it from neighboring rules. Treat the description as retrieval metadata, not a slogan.


\`\`\`markdown
---
description: Use when diagnosing Playwright failures that reproduce only in CI, including trace analysis, retries, worker isolation, environment differences, and artifact collection
globs:
alwaysApply: false
---

# CI-only browser failure investigation

1. Capture the failing project, worker context, retry number, and first error.
2. Compare CI and local configuration without exposing secret values.
3. Inspect the trace, screenshot, video, and application logs that actually exist.
4. Check data collisions, clock assumptions, service readiness, and resource pressure.
5. Reproduce with the smallest supported command and matching project configuration.
6. Change retries or timeouts only when evidence shows the current policy is incorrect.
7. Record the suspected cause separately from confirmed observations.
\`\`\`

This description contains terms likely to appear in a prompt or failure report: CI, Playwright, traces, retries, and worker isolation. A description such as “helpful debugging rule” supplies no selection signal.

Keep the rule body ordered. Failure investigation is a sequence, and an agent benefits from knowing that evidence collection precedes code changes. The last instruction separates observations from hypotheses, which reduces confident but unsupported diagnoses.

Manual invocation can still be appropriate for a high-impact workflow. If a rule describes production smoke testing, its description and filename should make the environment obvious, and the body should require confirmation before any mutating action. Cursor rules guide agent behavior; they do not replace access controls or human release authority.

## Organize nested rules around repository ownership

Large repositories rarely have one testing architecture. A web application may use Playwright, a service may use API integration tests, and a shared package may own contract fixtures. Cursor supports \`.cursor/rules\` directories in subdirectories, allowing guidance to live closer to the code it governs.


\`\`\`markdown
repository/
  .cursor/rules/
    qa-baseline.mdc
    ci-investigation.mdc
  apps/web/
    .cursor/rules/
      playwright.mdc
    tests/e2e/
  services/billing/
    .cursor/rules/
      api-tests.mdc
    tests/api/
  packages/contracts/
    .cursor/rules/
      consumer-contracts.mdc
    test/
\`\`\`

The directory layout should follow ownership and execution boundaries. A billing API rule can name its established fixture and validation command without burdening web-test tasks. A shared root baseline can still protect universal behavior.

Nearest scope is not permission to contradict safety. Nested rules should refine the baseline: they may specify the correct test command or data factory, but they should not authorize secret logging or assertion deletion. During review, look for conflicts as carefully as duplication.

Monorepos also need vocabulary discipline. “Integration test” may mean an in-process database test in one package and a deployed-service check in another. A local rule should define the term through paths, dependencies, and expected boundaries. Agents act more consistently when labels are tied to observable architecture.

When a test touches multiple packages, the agent may receive multiple applicable rules. Keep each file composable. Avoid restating the entire baseline in every nested rule, because repeated text consumes context and makes future corrections inconsistent.

## Reference repository examples without freezing accidents

Cursor rules can refer to files using \`@filename\` syntax. A reference can be valuable when a concise instruction needs a canonical example, such as an approved fixture or page-model pattern. Use references carefully: an old “example” can institutionalize a bug.


\`\`\`markdown
---
description: Checkout end-to-end test conventions
globs: apps/web/tests/e2e/checkout/**/*.spec.ts
alwaysApply: false
---

# Checkout E2E conventions

- Follow the authenticated buyer setup demonstrated in @apps/web/tests/e2e/fixtures/buyer.ts.
- Use the checkout page model in @apps/web/tests/e2e/pages/checkout-page.ts.
- Create catalog data through the existing API fixture unless the scenario tests catalog creation.
- Assert the displayed order result and the persisted order status for payment-success scenarios.
- Never use a live payment credential or production endpoint.
\`\`\`

Choose an example that is maintained, representative, and small enough to understand. A giant legacy spec may demonstrate five patterns, two of which the team wants to remove. Prefer a fixture entry point or a recently reviewed reference test.

Do not reference every dependency. The agent can navigate imports. References earn their context cost when they disambiguate a decision: which of three fixtures is approved, where a domain factory lives, or what a complete accessibility assertion looks like.

Review referenced files during rule maintenance. A moved or renamed file turns a clear instruction into friction. A changed abstraction can make the prose false even if the reference still resolves. Ownership for a rule therefore includes ownership for its examples.

## Encode validation as a risk ladder, not one giant command

Agents need a verification strategy that produces fast evidence and matches CI. Telling them to “run all tests” is expensive and sometimes impossible. Telling them to run only the edited file misses shared-fixture and configuration risk. A risk ladder gives an order.

| Change type | First feedback | Broader confidence | Escalation signal |
|---|---|---|---|
| One spec assertion | Targeted spec or test title using an existing script | Relevant project or shard-equivalent command | Shared data, fixture, or config was also changed |
| Page model locator | Specs that exercise the affected method | Browser project containing that feature | Locator is reused across features or browsers |
| Shared fixture | One representative consumer | All suites that import the fixture | Worker lifecycle, auth, or cleanup changed |
| API client helper | Focused client or endpoint tests | API integration suite and type check | Serialization or error mapping changed |
| Test runner config | Configuration listing or dry discovery where supported | Representative suites, then CI-equivalent checks | Projects, reporters, retries, or parallelism changed |

A scoped rule can map these stages to commands that already exist in \`package.json\`, CI workflows, or contributor docs. Avoid adding fictional flags. If the repository exposes only a broad script, instruct the agent to use that script and report the limitation.

Validation also includes reading the result correctly. A zero exit status with zero discovered tests is not a successful test run. A rerun that passes only after a retry is evidence of instability, not proof of health. A snapshot update is a change requiring review, not a routine side effect.

Ask the agent to report skipped checks and why. This makes environmental limitations visible. It also prevents “tests pass” from meaning “I did not run them but the code looks plausible.”

## Make test generation follow a reviewable sequence

A good rule can shape the workflow before code appears. For new tests, the most reliable sequence begins with coverage intent, then repository pattern discovery, then implementation, then focused validation.


\`\`\`markdown
## Workflow for adding a scenario

1. State the user behavior, precondition, observable outcome, and failure value.
2. Search for overlapping coverage and the nearest maintained example.
3. Identify the approved fixture, data factory, client, and cleanup path.
4. Add the smallest test that distinguishes correct from incorrect behavior.
5. Exercise behavior through the appropriate boundary, not an unrelated implementation detail.
6. Run the focused check and inspect discovery, result, artifacts, and cleanup.
7. Run the broader repository check required for the files changed.
8. Summarize coverage added, evidence produced, and residual risk.
\`\`\`

This sequence discourages duplicate tests. Two files with different names may exercise the same product path and fail for the same reason. Searching first reveals whether the better change is another assertion in an existing scenario, a parameterized case, or no new test at all.

“Failure value” asks what defect the scenario would catch. That question filters out tests that merely repeat implementation. A useful checkout test might detect that a declined payment still creates a confirmed order. A low-value test may assert an internal CSS class after clicking a button.

The sequence also makes the agent explain residual risk. A targeted Chromium run may validate logic but leave cross-browser behavior unchecked. An API stub may validate UI error handling but not production integration. Clear boundaries improve review without pretending every patch can prove everything.

## Diagnose rule failures as routing, content, or repository problems

When Cursor appears to ignore a rule, rewriting it more forcefully is rarely the first step. Determine which layer failed.

Routing failures occur when metadata does not match the task. Check that the file is an MDC file under the intended \`.cursor/rules\` directory, the glob matches the actual referenced path, and an agent-requested rule has a discriminating description. Cursor's official rule settings can show configured project rules and their status.

Content failures occur when the rule was available but its instruction was vague, contradictory, or buried. Replace adjectives with actions. Split competing workflows. Put critical boundaries near the beginning. Remove historical explanation that does not affect a decision.

Repository failures occur when the stated convention is not real. Perhaps two fixtures compete, CI uses a different command, or stable tests routinely violate the proposed locator hierarchy. Rules cannot create architecture by declaration. Align the codebase or narrow the rule to what is actually supported.

| Symptom | Likely layer | Investigation | Durable correction |
|---|---|---|---|
| API guidance appears during UI work | Routing | Inspect globs and nested placement | Narrow file patterns or move the rule |
| Agent still adds fixed waits | Content or conflict | Review all applicable instructions and examples | State the prohibited action and approved alternative |
| Agent invents a fixture | Repository | Search for a discoverable canonical entry point | Consolidate or clearly reference the supported fixture |
| Rule works only when manually named | Routing | Improve description and path trigger | Add specific retrieval language or a verified glob |
| Different contributors get different outcomes | Scope or drift | Compare referenced files, branches, and local settings | Version the project rule and remove personal-only dependencies |

Treat these failures as tests of the instruction system. The rule, repository, and task prompt form one interface. Debug that interface with the same discipline used for product code.

## Migrate a legacy .cursorrules file without copying its sprawl

Cursor still recognizes a root \`.cursorrules\` file but documents it as legacy. Migration is an opportunity to separate concerns, not simply rename the file.

First, classify every instruction in the legacy file. Repository-wide safety belongs in one short always rule. Framework-specific directions belong in auto-attached files. Rare operational procedures may become agent-requested or manual rules. Temporary project history should be deleted or moved to appropriate documentation.

Second, test each glob against real paths. A plausible-looking pattern is not enough. List representative files and verify which rule should attach to each. Pay special attention to monorepo prefixes, renamed folders, and page-model files that sit outside spec directories.

Third, remove duplicates and contradictions. Legacy files often accumulate “always use X” beside a later exception that quietly switched the team to Y. Inspect maintained code and CI to determine current truth.

Fourth, stage the rollout. Introduce the baseline and one high-value scoped rule, use them in real tasks, and inspect agent output. Add more only after the routing and wording prove useful. A migration that creates dozens of untested files makes diagnosis harder.

If your team is deciding between persistent rules and reusable skill packages, [this guide to Cursor SKILL.md practices](/blog/cursor-skills-md-best-practices) explains the complementary role of skills. In short, rules constrain repository behavior; skills package a discoverable procedure and supporting resources.

## Test the rules with representative QA prompts

Rules deserve acceptance tests even though they are natural language. Create a small prompt suite based on high-frequency, high-risk work. Run each prompt in a clean conversation, inspect which context applies, and score the proposed plan or patch against observable criteria.


\`\`\`yaml
cases:
  - name: stable checkout locator
    prompt: "Add coverage for the disabled Place order button during payment submission."
    expect:
      - reads the existing checkout page model
      - prefers a semantic locator
      - uses a waiting assertion
      - avoids a fixed timeout

  - name: isolated API customer
    prompt: "Add a negative API test for an invalid customer email."
    expect:
      - uses the typed request client
      - creates unique test data
      - asserts the documented error behavior
      - redacts sensitive diagnostics

  - name: CI-only flake
    prompt: "This browser test passes locally and fails on retry in CI. Diagnose it."
    expect:
      - requests or inspects available artifacts
      - separates observations from hypotheses
      - checks worker and environment differences
      - does not immediately increase retries
\`\`\`

The YAML is a team-owned evaluation artifact, not a Cursor configuration file. Its value is repeatability. Run the same cases before and after a meaningful rule change. You are not expecting identical prose; you are looking for stable decisions.

Include a negative case that should not load specialized guidance. A documentation-only task should not be flooded with Playwright internals. Precision matters as much as recall because excess context can distract an agent from the current change.

For patch-producing cases, inspect the diff and the validation plan. A polished explanation can hide a wrong import or nonexistent command. The acceptance criteria should reward repository-compatible actions, not confidence or verbosity.

## Review rules like production test infrastructure

Project rules belong in version control because they influence code generation across the team. Give them owners, review criteria, and a removal path. A rule without maintenance becomes an authoritative source of stale advice.

Review a changed rule against four questions. Is the instruction true in the current repository? Is its trigger narrower than or equal to the behavior it governs? Can a reviewer observe compliance in a plan, diff, or test result? Does it conflict with another applicable instruction?

Changes to commands, fixtures, folder structure, or CI topology should trigger a rule review. The reverse is also useful: a rule change that names a new canonical fixture should be accompanied by code or documentation that makes that fixture real.

Use pull request discussion to capture rationale, but keep the rule concise. The file needs the decision and enough context to apply it. Long historical debates can live in an architecture record or issue.

Remove instructions that no longer change behavior. Context has a cost, and obsolete constraints can be worse than missing constraints. If every maintained test already uses a single enforced formatter, restating formatting details in agent rules may add little. Reserve precious always-on space for choices the agent can still get wrong.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when a reusable workflow already fits your stack. Review any installed skill against the same repository truths before depending on it; a skill can accelerate setup, while project rules should express local decisions.

## Roll out from one risky workflow to a composable rule set

A successful rollout starts where agent mistakes are expensive and easy to recognize. Browser synchronization, shared test data, and contract updates are good candidates. Choose one workflow, create a baseline plus one scoped rule, and evaluate it against real tasks.

During the first week, collect evidence: prompts that selected the wrong rule, generated code that violated a correct instruction, commands the agent could not discover, and reviewer comments that still repeat. Update routing and wording based on those observations.

Then expand by boundary, not by ambition. Add API guidance when API work has distinct conventions. Add a CI investigation rule when failures need an ordered procedure. Add nested ownership only when repository scale makes root rules noisy.

Avoid measuring success by the number of MDC files. Better signals include fewer invented commands, fewer fixed waits, lower review churn around fixtures, more accurate validation reports, and faster diagnosis of failing tests. These measures connect instruction quality to engineering outcomes.

The mature system remains small enough to understand. A new QA engineer should be able to open \`.cursor/rules\`, identify the baseline, see which test areas have local guidance, and trace important instructions to maintained examples. If the rule tree requires its own search engine, it has probably reproduced the documentation sprawl it was meant to solve.

## Frequently Asked Questions

### Should every test automation convention be an always-applied Cursor rule?

No. Always-applied rules should cover compact, repository-wide constraints such as preserving assertions, protecting secrets, using deterministic waits, and reporting validation honestly. Playwright locator conventions, API payload assertions, contract ownership, and specialized CI investigation steps should be scoped with globs, descriptions, nested rule directories, or deliberate manual use. This reduces irrelevant context and makes routing easier to debug. If a convention applies only to one package or framework, place it near that boundary and verify its pattern against real file paths.

### How can a QA team tell whether an MDC glob is correct?

List representative files that should and should not receive the rule, then compare them with the exact pattern in the MDC frontmatter. Include edge cases such as nested specs, page objects outside the spec folder, monorepo prefixes, and differently named test suffixes. Open those files in clean Cursor tasks and inspect the applicable project rules. A glob is successful only when it attaches to the intended work without leaking into unrelated tasks. Recheck it whenever directories or naming conventions change.

### What belongs in a Cursor rule versus a test framework helper?

A rule tells the agent which behavior and repository convention to follow. A helper enforces or implements that behavior in code. “Use the authenticated worker fixture for isolated accounts” is suitable guidance; the fixture itself, account allocation, and cleanup belong in TypeScript. Prefer enforcement when the framework, type system, linter, or CI can guarantee a constraint. Use rules for decisions that require context, sequencing, or judgment, and reference the maintained helper that makes the desired path easy.

### How often should test automation rules be reviewed?

Review them whenever a named command, fixture, folder, test boundary, or CI behavior changes, plus a periodic review aligned with normal test-infrastructure maintenance. High-churn repositories may check quarterly; stable projects can review less often. Do not rely on a calendar alone. Repeated agent mistakes, irrelevant rule attachment, and reviewer corrections are immediate signals. Remove stale guidance rather than endlessly appending exceptions, and rerun representative prompt cases after changes to confirm that routing and resulting decisions improved.
`,
};

