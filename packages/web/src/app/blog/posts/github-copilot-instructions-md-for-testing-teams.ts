import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'copilot-instructions.md for Testing Teams: GitHub Copilot Custom Instructions Guide',
  description: 'Learn GitHub Copilot custom instructions testing patterns that produce safer test code, consistent reviews, and repository-aware automation.',
  date: '2026-07-15',
  category: 'Guide',
  content: `
# copilot-instructions.md for Testing Teams: GitHub Copilot Custom Instructions Guide

GitHub Copilot can generate a plausible Playwright test in seconds. Plausible, however, is not the same as mergeable. It may choose selectors your team has banned, hide assertions inside a page object, invent a login shortcut, or add fixed waits that make CI unreliable. The model is doing what it can with the prompt and visible code. It does not automatically know the agreements that experienced engineers carry in their heads.

A repository-level custom instruction file turns those agreements into durable context. For a testing team, that means Copilot receives the same guidance whether someone asks it to create a test, explain a failure, review a pull request, or refactor fixtures. The goal is not to force every response into one rigid pattern. The goal is to make the safe and maintainable path the obvious path.

This guide shows how to design, write, scope, review, and evolve GitHub Copilot custom instructions for real QA repositories. Examples use Playwright and TypeScript where specificity helps, but the method works for Cypress, Selenium, API suites, mobile automation, and mixed-language test platforms.

## What GitHub Copilot actually reads from your repository

The repository-wide instruction file is **.github/copilot-instructions.md**. It is the right home for concise guidance that should influence Copilot broadly across the repository. GitHub also supports path-specific instruction files under **.github/instructions/**. Those files use the **.instructions.md** suffix and an **applyTo** frontmatter field to associate instructions with matching files.

That gives a test organization two useful layers:

| Layer | Documented location | Testing use | Typical scope |
|---|---|---|---|
| Repository guidance | .github/copilot-instructions.md | Shared quality bar, commands, architecture, safety rules | All relevant Copilot work in the repository |
| Path-specific guidance | .github/instructions/*.instructions.md | Framework or directory conventions | Matching test, fixture, page, or contract files |
| Prompt in the current task | Chat or editor request | Acceptance criteria for one change | The immediate conversation |

Think of these layers as policy, local procedure, and work order. The repository file says that tests must be deterministic. A path-specific file says how Playwright locators and fixtures are structured. The prompt says to cover an expired-session redirect. Each layer adds information without repeating the others.

Instructions are context, not a permission system and not a guaranteed enforcement mechanism. A model can misunderstand ambiguous guidance, and a human can accept poor output. Linters, tests, branch protection, and review still enforce the quality bar. Custom instructions improve the probability that the first draft already fits it.

## Start with the defects Copilot creates in your suite

Do not begin by transcribing an entire engineering handbook. Begin with observed failure modes. Review recent AI-assisted pull requests, rejected suggestions, and flaky-test fixes. Identify mistakes that are frequent, expensive, and preventable with repository context.

For a browser automation repository, the evidence might look like this:

| Observed output | Cost to the team | Instruction candidate | Better enforcement partner |
|---|---|---|---|
| CSS chains tied to layout | Tests break after harmless UI changes | Prefer role, label, text, or stable test-id locators | Locator review and UI test-id policy |
| waitForTimeout used for readiness | Flaky and slow CI | Wait on user-visible state or a specific response | Lint rule or code review |
| Shared account mutated in parallel | Cross-test interference | Create isolated data per test and clean it through fixtures | Test environment design |
| Assertions placed in page objects | Failures lose scenario meaning | Keep business assertions in test files | Architecture review |
| Secrets printed during diagnosis | Credential exposure | Never log tokens, cookies, or environment values | Secret scanning and log controls |
| Commands invented from convention | Wasted execution and confusion | Use scripts defined in package.json | CI and contributor documentation |

This evidence-first approach keeps the file useful. “Write clean code” does not change a suggestion because it has no repository-specific meaning. “Do not use fixed sleeps; wait for the locator or response that represents the expected state” gives Copilot a concrete choice.

Interview manual testers as well as automation engineers. A manual tester may notice that generated scenarios omit audit history, accessibility states, or cancellation behavior. A platform engineer may know that a test namespace is required for parallel isolation. The most valuable instructions often describe system behavior that cannot be inferred from test syntax.

## Build a compact repository instruction file

A strong repository file answers five questions quickly: what this repository tests, where key code belongs, how changes are verified, what patterns are preferred, and what must never happen. It should be easy for a maintainer to scan during review.

Here is a practical starting point:

\`\`\`markdown
# Test repository guidance

This repository contains Playwright end-to-end and API tests for the customer portal.

## Before changing tests

- Read the nearest existing spec, fixture, and page object before proposing a pattern.
- Use scripts that already exist in package.json. Do not invent commands.
- Preserve parallel execution and independent test data.

## Test design

- Express behavior through user-visible outcomes.
- Prefer role, label, text, and stable test-id locators over layout selectors.
- Keep business assertions in spec files. Page objects expose actions and state.
- Cover the requested success path and the most relevant failure boundary.
- Do not use fixed sleeps for readiness.

## Safety

- Never print secrets, tokens, cookies, or complete personal records.
- Do not call production services from automated tests.
- Ask before changing shared fixtures or authentication state.

## Verification

- Run the narrowest relevant test first, then the repository's required checks.
- Report what ran, what passed, and what could not be verified.
\`\`\`

Every bullet above influences an observable decision. There is no motivational prose and no claim that the model can enforce. Notice also that the file tells Copilot to inspect nearby code. Existing examples are often the highest-fidelity source for naming, abstractions, and helper APIs.

Keep commands factual. If the package exposes scripts, name only scripts that exist. If commands differ between packages, place them in path-specific instructions or tell Copilot to consult the local package manifest. A stale command is worse than no command because it sounds authoritative.

## Translate testing principles into executable choices

Testing teams often write principles at the wrong altitude. “Make tests robust” is an aspiration. Copilot needs decision rules it can apply while generating code. The translation pattern is simple: name the situation, state the preferred action, and define a boundary.

| Vague principle | Decision-ready instruction | Evidence in generated code |
|---|---|---|
| Tests should be reliable | Wait for the observable condition that proves readiness; do not add fixed delays | Locator or response wait replaces a sleep |
| Use good selectors | Prefer accessible roles and labels; use test ids when semantics cannot identify one stable element | Locator communicates user intent |
| Tests should be independent | Create or reserve data per test; do not depend on execution order | No shared mutable record or ordered suite |
| Keep code reusable | Extract only behavior repeated across scenarios; do not create wrappers for one-line Playwright calls | Helpers carry domain meaning |
| Validate errors | Assert the user-visible error and the rejected side effect | Negative test checks message and state |

Boundaries matter because preferences can conflict. Role locators are excellent when accessible names are stable, but a dense canvas editor may require test ids. “Always use roles” would cause awkward or impossible code. “Prefer roles and labels, then use an agreed stable test id when semantics are insufficient” preserves judgment.

Include the reason only when it resolves a likely ambiguity. Copilot benefits from knowing that assertions stay in specs because failure output should retain scenario meaning. It does not need an essay on the history of the page-object pattern.

## Give generation requests a test-design contract

Custom instructions become more useful when the team also standardizes what belongs in a one-off request. The repository file holds stable constraints. The prompt supplies the change-specific contract: behavior, test level, state, risks, and acceptance criteria.

For example:

\`\`\`markdown
Add Playwright coverage for an expired checkout session.

Behavior:
- Opening the payment step with an expired session redirects to the cart.
- The cart preserves available items and shows the expiry notice.
- No payment request is sent.

Constraints:
- Reuse the existing checkout fixture and network recorder.
- Keep the test independent of wall-clock timing by creating an already expired session.
- Change only the relevant spec unless a missing fixture capability makes that impossible.

Verification:
- Run the targeted project and type checking available in this package.
\`\`\`

This request does not repeat locator, safety, or reporting rules from the repository file. It describes the behavioral risk. Copilot can combine both sources to propose a focused test.

For teams using AI heavily, create a pull request checklist item asking whether a new prompt revealed missing durable context. If several engineers repeatedly specify “do not mock the service worker in contract tests,” that instruction may belong in a scoped file. If the detail applies only to one ticket, it should remain in the prompt.

For a broader view of role design, review this [GitHub Copilot guide for QA engineers](/blog/github-copilot-qa-engineers-deep-guide) alongside the repository policy. The important distinction is that tool fluency helps an individual conversation, while checked-in instructions improve consistency across contributors.

## Scope Playwright rules without polluting API tests

One global file can become a compromise that serves no framework well. Path-specific instructions let a repository express different conventions for browser specs, API contracts, fixtures, or test data builders.

The documented structure uses files such as **.github/instructions/playwright.instructions.md** with **applyTo** frontmatter. A focused Playwright example could be:

\`\`\`markdown
---
applyTo: "tests/e2e/**/*.ts"
---

# Playwright spec instructions

- Start from an existing spec in the same feature area.
- Prefer web-first locator assertions for eventual UI state.
- Use accessible locators when they identify the intended element uniquely.
- Keep scenario assertions in the spec and expose domain actions through existing page objects.
- Create test data through approved fixtures or API builders, not through unrelated UI setup.
- Preserve trace, screenshot, and video behavior configured by the repository.
- Do not add retries or timeouts to hide a deterministic failure.
\`\`\`

An API-specific file should make different choices:

\`\`\`markdown
---
applyTo: "tests/api/**/*.ts"
---

# API test instructions

- Assert status, relevant headers, and the smallest meaningful response shape.
- Validate side effects through an independent read when the risk justifies it.
- Use the repository's authenticated client fixture.
- Generate unique records for parallel tests.
- Do not snapshot complete volatile payloads.
- Redact credentials and personal data from diagnostics.
\`\`\`

The exact matching pattern must reflect the repository layout. Check that a new file actually falls within the intended scope. During rollout, ask Copilot to explain which conventions it is applying, then inspect whether the proposed code follows the scoped guidance. The answer is diagnostic, not proof, but it exposes mismatched expectations early.

Avoid duplicating every global rule in each scoped file. Repetition creates drift. Keep universal safety, verification, and repository architecture in the main file. Keep framework-specific choices close to the matching paths.

## Teach Copilot your locator hierarchy

Selector policy is one of the highest-return instruction areas because a small generation choice affects years of maintenance. The policy should reflect how users perceive the interface and how the product exposes stable automation surfaces.

A practical hierarchy for many web products is:

1. Use role and accessible name for controls with stable semantics.
2. Use label or placeholder when it accurately represents a form interaction.
3. Use stable visible text for content whose wording is part of the behavior.
4. Use an agreed test id for elements that cannot be identified reliably through semantics.
5. Avoid selectors coupled to CSS structure, generated classes, or element position.

Turn the hierarchy into examples that mirror your stack:

\`\`\`typescript
// Preferred: communicates how a user finds the control.
await page.getByRole('button', { name: 'Submit claim' }).click();
await expect(page.getByRole('status')).toHaveText('Claim submitted');

// Acceptable when the component lacks a unique semantic target.
await page.getByTestId('claim-total').getByText('₹2,450').isVisible();

// Avoid: tied to layout and generated styling.
await page.locator('.panel:nth-child(3) .btn-primary').click();
\`\`\`

Examples should teach intent, not create a fake universal API. Use methods supported by your installed framework version and patterns already present in the repository. If the UI team owns test ids, document the naming agreement in the product repository too. Copilot cannot compensate for an inaccessible or automation-hostile interface.

Add guidance for ambiguity. If two buttons share the same name because they belong to repeated cards, the test should first locate the card by meaningful content, then locate the button within it. Do not solve ambiguity by selecting the second match. Positional selectors encode today’s layout, not the behavior under test.

## Separate fixture policy from scenario logic

AI-generated tests often put setup directly into a scenario because that is the shortest visible path. Over time, copied authentication, tenant creation, and cleanup logic becomes a major source of flakiness. Instructions should explain which capabilities belong in fixtures and which details must remain visible in the test.

Use a division like this:

| Concern | Fixture or builder | Spec file | Reason |
|---|---:|---:|---|
| Authenticated browser context | Yes | Consume it | Centralizes approved login and storage handling |
| Unique customer creation | Yes | Pass scenario-relevant fields | Supports isolation without hiding intent |
| Exact action under test | No | Yes | Keeps behavior readable |
| Business outcome assertion | Usually no | Yes | Preserves diagnostic scenario context |
| Cleanup of created records | Yes | Trigger automatically | Reduces leakage on failure |
| Rare edge-state construction | Builder capability | Describe parameters | Avoids long UI setup while showing the state |

Then state how Copilot should react when the fixture lacks a capability. It should not silently bypass the fixture with a private endpoint or duplicate authentication. Ask it to explain the smallest fixture extension, identify affected consumers, and wait for confirmation if the shared change is broad.

This is especially important in monorepos where a fixture may serve hundreds of specs. A locally convenient signature change can produce widespread churn. Repository instructions can tell Copilot to search for all consumers and preserve backwards compatibility unless the task explicitly authorizes migration.

## Make flakiness prevention specific enough to review

“Avoid flaky tests” is too broad to guide generation or review. Break reliability into recognizable causes: uncontrolled time, shared state, asynchronous readiness, non-deterministic data, external dependencies, and overly broad assertions.

A reliability section can tell Copilot to:

- construct expired or scheduled states through a controllable clock or data builder rather than waiting for real time;
- generate unique records for parallel workers and avoid tests that depend on order;
- wait on the UI state or network event connected to the behavior, not on a fixed duration;
- use deterministic inputs when the test asserts sorted, rounded, or localized output;
- avoid increasing retries, global timeouts, or assertion timeouts as the first repair;
- preserve diagnostic artifacts so a CI-only failure can be investigated.

Show the difference with a compact example:

\`\`\`typescript
// Fragile: assumes the response and rendering finish within two seconds.
await page.getByRole('button', { name: 'Refresh balance' }).click();
await page.waitForTimeout(2000);
await expect(page.getByText('Available: ₹5,000')).toBeVisible();

// Intent-based: the assertion waits for the user-visible result.
await page.getByRole('button', { name: 'Refresh balance' }).click();
await expect(page.getByRole('status')).toHaveText('Balance updated');
await expect(page.getByText('Available: ₹5,000')).toBeVisible();
\`\`\`

Do not prescribe network waiting everywhere. A response can finish before client-side processing, and an intercepted endpoint may not represent what a user sees. Prefer the condition that proves the requirement. For a no-payment-request assertion, a request recorder may be essential. For a successful toast, the rendered status may be sufficient.

## Constrain mocks, stubs, and production boundaries

Generated tests can become deceptively green when Copilot mocks away the component that contains the risk. Your instructions should define which test layers may replace dependencies and what evidence a mock must preserve.

| Test layer | Common replacement boundary | What must remain real | Primary failure signal |
|---|---|---|---|
| Unit | Network, clock, filesystem adapter | Unit logic and public contract | Incorrect return or interaction |
| Component | Backend endpoint or browser API | Rendering and component behavior | Wrong state or accessibility output |
| Contract | Provider or consumer transport harness | Published schema and compatibility rules | Contract mismatch |
| End-to-end | A small set of uncontrollable third parties | Owned user journey and deployed integration | Broken observable workflow |

Tell Copilot not to invent an undocumented endpoint merely to create state. It should reuse an existing builder, fixture, seed mechanism, or supported public interface. If none exists, it can propose the capability as a separate change and label the assumption.

Production separation deserves explicit language. Test code must not point at production by default, and generated diagnostic commands must not include real credentials. Where environments are selected through existing configuration, tell Copilot to preserve that mechanism rather than adding a new variable whose name only sounds plausible.

This is also a good place to state privacy expectations. Test fixtures should use synthetic personal data. Failure messages and attachments should avoid full tokens, cookies, account numbers, and personal records. Custom instructions reinforce the behavior, while secret scanners and artifact retention policies provide enforcement.

## Direct Copilot to diagnose before rewriting

When asked to fix a failing test, an AI agent may rewrite selectors, increase timeouts, or relax an assertion before proving the cause. A diagnosis protocol keeps the repair tied to evidence.

Add a sequence such as:

1. Reproduce with the narrowest existing command.
2. Read the failure output and available trace, screenshot, or log.
3. Classify the failure as product defect, test defect, data issue, environment issue, or unresolved.
4. Identify the first divergence between expected and observed behavior.
5. Propose the smallest repair and explain why it addresses that divergence.
6. Run the focused test, then the relevant surrounding checks.

The corresponding prompt can be terse:

\`\`\`markdown
Investigate the failing invoice-download Playwright test.

Do not change code until you can state the first observed divergence. Use existing artifacts and the focused repository command. Do not increase waits or weaken the download assertion as a workaround. After identifying the cause, propose the smallest test or product change and list the evidence.
\`\`\`

This workflow helps with more than flakiness. It prevents a test change from masking a real regression. If the browser trace shows a 403 response after a permission change, replacing the assertion with “button is visible” would produce a passing test and lose the requirement.

For generation rather than repair, this same discipline appears as a test oracle. Ask what observable outcome proves the requirement and what false positive could still pass. That question often reveals missing negative assertions, such as verifying that a rejected transfer did not alter the balance.

## Use custom instructions during AI-assisted review

Copilot can help review a test diff, but a generic “review this” request produces generic feedback. The checked-in file should define the repository quality bar, while the review prompt prioritizes risk.

Ask for findings tied to changed lines, observable impact, and a proposed correction. Useful review lenses for test automation include:

- Does the new test fail when the requirement is broken, or can its assertions pass for the wrong reason?
- Is setup isolated under parallel execution?
- Are locators coupled to behavior or implementation structure?
- Does the test wait for the correct readiness signal?
- Are failure artifacts likely to expose sensitive data?
- Does a helper hide the business action or assertion needed to understand a failure?
- Is the test placed at the cheapest layer that still covers the risk?

A team can encode the stable part like this:

\`\`\`markdown
## Review behavior

When reviewing test changes, prioritize false positives, non-determinism, unsafe data handling, and violations of repository architecture. Cite the affected code and describe the failure mode. Distinguish a blocking correctness issue from an optional maintainability suggestion. Do not claim a command passed unless you ran it and observed success.
\`\`\`

That final sentence protects review credibility. AI agents should report verification precisely: ran and passed, ran and failed, or not run. “Should pass” is reasoning, not evidence.

## Design a command and verification ladder

Testing repositories accumulate commands for individual specs, projects, linting, type checking, contract validation, and complete CI. Asking Copilot to “run all tests” after every edit wastes time, while running only the changed spec can miss shared breakage.

Document a ladder based on change radius:

| Change radius | First verification | Follow-up verification | Escalation trigger |
|---|---|---|---|
| One scenario | Targeted spec or test | Type check and nearby feature tests | Shared helper changed |
| Page object | Specs that consume the page | Lint and relevant browser project | Public method signature changed |
| Shared fixture | Focused fixture consumer | Representative suites across consumers | Auth, worker scope, or cleanup changed |
| Test configuration | Configuration validation and smoke test | CI-equivalent projects | Reporter, retries, or environment selection changed |
| Contract schema | Target contract test | Consumer and provider checks | Compatibility surface changed |

Use actual repository scripts in the checked-in file. A safe generic instruction is “inspect package scripts and contributor documentation, then use the narrowest documented command.” A more useful repository-specific instruction names the exact existing script once maintainers have verified it.

Ready-made QA skills can also be installed from qaskills.sh with the qaskills CLI when a team wants a reusable workflow for a known testing task. Treat a skill as an additional procedural resource, not as a replacement for repository commands and local architecture.

## Keep the file short through progressive disclosure

An instruction file loses influence when every paragraph competes for attention. Put the highest-frequency, highest-risk constraints in the main file. Let existing repository documents carry deeper explanations, but reference them carefully and only when Copilot can access them in the working context.

Use this decision matrix when deciding whether a rule belongs:

| Frequency | Risk if ignored | Placement |
|---|---|---|
| High | High | Main repository instruction file |
| High | Framework-specific | Matching path instruction file |
| Low | High | Concise main warning plus authoritative project document |
| Low | Low | Existing documentation or current prompt |
| Temporary | Any | Issue, pull request, or task prompt |

Remove explanations that merely restate a rule. Replace catalogs of every folder with a short architecture map covering only surprising boundaries. Link-free path references can point to repository documents without creating another web dependency, but verify the files exist.

Periodically ask new contributors what they could not infer. The file should serve an engineer who understands testing but not your private conventions. It should not attempt to teach the entire framework. Official framework documentation already does that better and stays current.

## Roll out instructions as a measured change

Treat the instruction file like production test infrastructure. Establish a baseline, introduce a focused version, evaluate outputs, and revise based on defects. Do not judge it from one impressive completion.

Build a small evaluation set from real tasks:

1. Generate a straightforward happy-path test.
2. Generate a negative test where no side effect should occur.
3. Repair a flaky readiness problem.
4. Add a fixture capability without breaking consumers.
5. Review a diff containing a subtle false-positive assertion.
6. Diagnose a failure caused by a product authorization regression.

Run these tasks against representative repository snapshots. Score observable properties instead of tone. Did the output use an approved locator? Did it reuse the fixture? Did it avoid fixed waits? Did it state unverified assumptions? Did it preserve the failure-producing assertion?

| Metric | How to measure | Healthy direction |
|---|---|---|
| First-draft acceptance | Suggestions merged without structural rework | Up |
| Convention corrections | Review comments about known repository patterns | Down |
| False-positive defects | Tests that pass without proving the requirement | Down |
| Verification accuracy | Reports matching commands actually run | Up |
| Instruction size | Lines competing for model attention | Stable or down |

Compare tasks, not personalities. Different prompts and visible files can change output. The purpose is to find reliable improvement across a set. If a rule does not change behavior after repeated clear tests, rewrite it with a stronger decision boundary or enforce it with tooling.

Include conflict cases in the evaluation. Give Copilot a nearby example that uses a deprecated selector or an outdated helper while the instruction file states the current convention. A useful instruction system should cause the agent to recognize the mismatch, follow current repository policy, and mention why it did not copy the obsolete pattern. If it copies neighboring code blindly, the repository needs either a clearer migration note or cleanup of examples that keep teaching the wrong behavior.

Also test missing information. Ask for a scenario whose setup mechanism is not visible and whose command is not documented in the current package. The desired behavior is not confident invention. Copilot should search the repository, identify the absent fact, and state what it needs before making a risky change. Score assumption handling separately from code style because fabricated helpers and environment names can be more costly than a formatting mismatch.

Record reviewer effort as well as generated output. Count how many minutes a tester spends correcting architecture, strengthening the oracle, and repairing verification. A suggestion that looks polished but requires a reviewer to reconstruct the entire scenario is not an improvement. Over several tasks, lower correction time and fewer repeated defect categories show whether the instructions are carrying useful team knowledge.

## Govern changes without freezing the document

Assign ownership. In a small team, that may be the test-platform maintainer. In a larger organization, use normal code ownership and require review from both a framework owner and a product-area tester for broad changes.

Every instruction change should answer:

- Which observed failure or repeated correction prompted this rule?
- Is it global, path-specific, or temporary?
- Can a linter, test, type, or CI policy enforce it more reliably?
- Does it conflict with an existing example or scoped instruction?
- How will the team know the wording improved output?

Keep instructions synchronized with migrations. When a suite moves from page-object assertions to component-level helpers, stale guidance can make Copilot reproduce the old architecture. Include instruction files in framework migration search queries and pull request checklists.

Review scoped patterns after directory moves. A perfect rule applied to no files is silent failure. Conversely, an overly broad pattern may impose browser-test rules on support utilities. Test a few representative paths whenever **applyTo** changes.

Do not turn the file into a changelog. Version control already records history. The current document should describe current truth. Remove obsolete commands and superseded rules instead of annotating them forever.

## A production-ready review checklist

Before merging **.github/copilot-instructions.md** or a scoped instruction file, review it as critically as a shared fixture:

- The location and filename follow GitHub’s documented convention.
- Path-specific files use **.instructions.md** and an **applyTo** frontmatter field.
- Every named command, directory, helper, and script exists.
- Global instructions describe repository-wide truth.
- Framework rules are scoped to the files where they apply.
- Testing rules lead to observable code or review decisions.
- Safety statements cover production access, secrets, personal data, and destructive actions relevant to the suite.
- Reliability guidance addresses time, state, readiness, and parallel execution.
- Verification guidance distinguishes focused checks from broader checks.
- The file does not promise enforcement that only CI can provide.
- Examples compile against the repository’s installed tools, or are clearly conceptual.
- Conflicting and obsolete statements have been removed.

Then use the file on a real change. Ask Copilot to generate a test, explain its locator and setup choices, run the allowed checks, and review the diff manually. The quality of that end-to-end workflow matters more than whether the markdown reads elegantly.

For practical prompt patterns focused on browser coverage, the companion guide to [AI test generation with Playwright and Copilot](/blog/ai-test-generation-playwright-copilot) shows how durable instructions and task-specific acceptance criteria work together.

The finished file should feel almost boring: short statements of repository truth, precise boundaries, and commands that actually exist. Its payoff appears in fewer review corrections, safer agent actions, and tests whose intent survives beyond the first generated draft.

## Frequently Asked Questions

### Should testing teams put every coding standard in copilot-instructions.md?

No. Include stable rules that frequently affect Copilot’s decisions across the repository, especially architecture, test isolation, locator policy, safety, and verification. Put framework-specific rules in path-scoped instruction files, and leave rare or temporary acceptance criteria in the current prompt. Formatting rules that a linter can enforce should remain enforced by the linter. A compact instruction file gives each statement more room to influence output and is easier to keep accurate during test-framework migrations.

### How can we tell whether GitHub Copilot custom instructions improved test generation?

Use a repeatable set of real testing tasks and score observable outcomes. Track whether suggestions use approved locators, preserve independent data, avoid fixed waits, choose the correct fixture, assert meaningful outcomes, and report verification honestly. Compare first-draft acceptance and recurring review comments before and after the change. One successful conversation is weak evidence because prompts and visible context vary. A small evaluation suite across generation, diagnosis, refactoring, and review gives a much more credible signal.

### What belongs in a path-specific instructions file for Playwright?

Put conventions that apply specifically to matching Playwright files: locator hierarchy, web-first assertion style, page-object boundaries, fixture usage, test-data construction, artifact preservation, and the team’s policy on retries or timeouts. Use the documented **.github/instructions/*.instructions.md** location and an **applyTo** frontmatter pattern that matches the intended paths. Keep universal safety and repository-wide verification guidance in the main instruction file so the scoped file stays focused and does not drift through duplication.

### Can custom instructions prevent Copilot from producing flaky or unsafe tests?

They reduce the likelihood, but they are not enforcement. Clear instructions can steer Copilot away from fixed delays, shared mutable accounts, production endpoints, secret logging, and weak assertions. Humans must still review the diff, and automated controls should catch what they can: lint forbidden APIs, isolate test data, scan secrets, protect environments, and run deterministic CI checks. Treat custom instructions as a high-value context layer that improves the first draft, while the repository’s engineering controls remain the final guardrails.
`,
};
