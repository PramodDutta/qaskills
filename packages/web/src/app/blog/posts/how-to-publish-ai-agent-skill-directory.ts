import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'How to Publish an AI Agent Skill: From SKILL.md to a Public Directory',
  description: 'A practical guide on how to publish AI agent skill packages from SKILL.md to a trusted directory, with QA validation, security checks, and release governance.',
  date: '2026-07-15',
  category: 'Tutorial',
  content: `
# How to Publish an AI Agent Skill: From SKILL.md to a Public Directory

Publishing begins where “it works on my machine” stops being acceptable. A private prompt can rely on your memory, your repository layout, and your willingness to repair it mid-task. A public skill must guide an unfamiliar agent inside an unfamiliar QA project without hidden context, unsafe assumptions, or a maintainer standing nearby.

That makes **how to publish an AI agent skill** a software delivery question, not a file-upload question. The artifact needs a precise trigger, bounded instructions, reproducible resources, realistic evaluation, discoverable metadata, versioned source, installation guidance, and a maintenance promise. For test-automation skills, the standard is higher still: bad guidance can create tests that pass while failing to detect defects.

This tutorial follows a concrete example, a skill that reviews Playwright tests for reliability. It moves from problem definition through \`SKILL.md\`, supporting resources, clean-room trials, public listing, and post-release updates. The same process works for API contract testing, accessibility audits, mobile automation, CI failure triage, performance test design, and other QA capabilities.

The directory is the discovery layer. The skill repository is the inspectable product. Treat both as parts of one release.

## Define the testing job before naming the skill

Start with observable requests the skill should handle. “Playwright expert” is a persona, not a job. “Review a Playwright test for isolation, synchronization, locator resilience, and assertion strength” describes an outcome an evaluator can inspect.

Collect five to ten realistic prompts from pull requests, issue discussions, or team chat. Remove confidential identifiers, but keep the ambiguity users naturally introduce. Examples might include:

- Review this checkout spec before I open a pull request.
- Why does this browser test fail when the suite runs in parallel?
- Find reliability risks in this test without rewriting the application.
- Check whether these assertions would catch a pricing regression.
- Audit this page object and spec for brittle locators.

Now define explicit non-goals. The review skill should not silently rewrite the entire suite, change production behavior, or claim a flake is fixed without repeated evidence. Boundaries make instructions safer and make directory descriptions more credible.

Create a one-page contract before creating files:

| Contract element | Reliability-review example | Publication value |
|---|---|---|
| Primary user | QA engineer reviewing Playwright code | Helps directory visitors self-select |
| Triggering task | Review or diagnose browser-test reliability | Makes activation language concrete |
| Required inputs | Test code, related fixtures, and available failure evidence | Prevents fabricated context |
| Expected output | Prioritized findings with location, evidence, and validation | Enables evaluation |
| Non-goals | Product redesign and unsupported certainty | Limits accidental scope |
| Safety boundary | Do not run destructive cleanup against shared systems | Protects adopters |
| Success signal | Findings are reproducible and proposed checks are supported | Supports release gates |

A public skill should be narrower than a course and more operational than an article. If your contract contains unrelated jobs, split it. “Generate tests, debug CI, audit accessibility, and publish reports” will trigger unpredictably and load instructions most requests do not need.

Choose a lowercase, hyphenated name using letters, digits, and hyphens, with a maximum of 64 characters. Prefer a short verb-led name such as \`review-playwright-reliability\`. The folder name should match the skill name. Names are both interface and identity: changing one after adoption creates avoidable migration work.

## Build the smallest publishable folder

Every skill needs a \`SKILL.md\`. Add only resources that improve repeated execution. A review skill might need a compact severity rubric and a script that validates structured findings. It probably does not need a README, changelog, setup guide, and duplicated quick reference inside the skill folder.

A focused layout looks like this:

\`\`\`text
review-playwright-reliability/
├── SKILL.md
├── references/
│   └── review-rubric.md
└── scripts/
    └── validate-findings.ts
\`\`\`

The body of \`SKILL.md\` should tell the agent when to read the rubric and when to run the validator. Resources that are never referenced are effectively undiscoverable. Resources that repeat the body waste context and create two maintenance surfaces.

Use this placement test:

| Information or artifact | Put it in | Reason |
|---|---|---|
| Trigger and capability summary | Frontmatter description | It must be visible for discovery |
| Core review sequence | \`SKILL.md\` body | It is required whenever the skill runs |
| Detailed severity examples | \`references/review-rubric.md\` | Load only when classifying findings |
| Deterministic schema check | \`scripts/validate-findings.ts\` | Code is more reliable than repeated prose |
| Reusable report skeleton | \`assets/\` if output needs one | Copy as an output resource, do not load as guidance |
| Broad framework documentation | Link to official source or omit | Do not republish a changing manual |

Keep the folder inspectable. An adopter should understand what may execute and what stays as context. A script must not hide network calls, credential access, telemetry, or destructive behavior. Public trust begins with a source tree that can be audited without reverse engineering.

If the skill is instructions-only, publish an instructions-only folder. Adding an empty directory or decorative asset does not make it more complete. The smallest artifact that consistently produces the promised QA outcome is the strongest first release.

## Write frontmatter that earns the correct activation

The frontmatter has two required fields: \`name\` and \`description\`. Keep the name within 64 characters and the description within 1024 characters. The description should say what the skill does and when to use it. Do not bury trigger conditions in a “When to use” section, because the body may not load until after selection.

Here is a publishable starting point:

\`\`\`markdown
---
name: review-playwright-reliability
description: Review Playwright tests and fixtures for isolation, synchronization, locator resilience, assertion strength, and parallel safety. Use when assessing a browser test, investigating a fragile spec, or reviewing test-automation changes before a pull request.
---

# Review Playwright reliability

Inspect the target test, its fixtures, and the production behavior it claims to verify.
Report only findings supported by the provided code or execution evidence.
\`\`\`

The description includes the capability, review dimensions, and recognizable task phrases. It avoids promises such as “guarantees flake-free tests,” which no static review can honestly make.

Test the description with positive and negative prompt sets. Positive prompts should use varied language, not merely repeat the skill name. Negative prompts should include nearby tasks, such as writing a Playwright tutorial, implementing a product feature, or reviewing a unit test that does not use Playwright.

| Prompt | Desired selection | Reason |
|---|---|---|
| “Review this checkout spec for parallel failures” | Select | Isolation and parallel safety are core scope |
| “Are these locators likely to survive a redesign?” | Select | Locator resilience is named scope |
| “Create a marketing page about browser testing” | Do not select | No test review is requested |
| “Fix this React state bug” | Do not select | Production debugging is outside the contract |
| “Explain how Playwright auto-waiting works” | Usually do not select | Education alone is not the review workflow |
| “Audit this fixture and spec before merge” | Select when Playwright context is present | Pre-merge review is an explicit trigger |

Selection errors should drive description edits before body edits. A perfect workflow cannot help if it never loads, while an overbroad description can inject irrelevant instructions into unrelated engineering work.

For exact formatting constraints, naming checks, and examples, consult the [SKILL.md format guide](/blog/skill-md-format-guide) before tagging a release.

## Turn QA judgment into an executable review sequence

The skill body should supply non-obvious procedural knowledge, not explain that testing is important. Use imperative steps, branch conditions, evidence requirements, and stop rules.

For the Playwright review skill, a substantive body could include:

\`\`\`markdown
## Review workflow

1. Read the complete target test and every fixture or helper it invokes.
2. State the user-visible risk the test appears intended to cover.
3. Trace setup, data creation, action, assertion, and cleanup.
4. Check each of these dimensions:
   - independence under repetition, reordering, and parallel execution
   - synchronization based on observable readiness rather than elapsed time
   - locators based on user-facing semantics or deliberate stable contracts
   - assertions capable of detecting the stated business failure
   - cleanup behavior and ownership of mutable data
5. Rank only reproducible issues. Separate confirmed defects from questions.
6. Propose the smallest change that addresses each confirmed issue.
7. Recommend validation from the narrowest affected test outward.

Read references/review-rubric.md before assigning severity.
If required fixture or helper code is missing, request it and limit conclusions.
Do not claim a flake is resolved from a single passing run.
\`\`\`

This sequence forces the agent to establish intent before criticizing syntax. It also treats missing context honestly. A public skill cannot assume every repository uses the same fixture names, package scripts, CI projects, or test-data API.

Include decision points where expert reviewers differ from generic code review. For example, a CSS locator is not automatically a defect. It may be a deliberate contract for a canvas or complex widget. The skill should ask whether the locator represents a stable supported boundary and whether a user-facing alternative exists.

Likewise, do not prescribe a universal retry count, timeout, folder path, or command. Those values belong to the adopter's repository. Tell the agent how to discover local configuration and how to reason about it. Public instructions should travel across projects without inventing project facts.

## Design references and scripts for progressive disclosure

The main body should stay compact enough to load economically. Move detailed classification examples, framework-specific caveats, and schemas into references that the body names at the moment they are needed.

A review rubric might define severity through impact and evidence:

\`\`\`markdown
# Reliability review rubric

## High severity

A finding is high severity when the test can pass while the protected business behavior is broken, corrupts shared state, or creates a repeatable suite-wide failure risk.

Required evidence:
- identify the exact test or fixture behavior
- describe a concrete failure scenario
- explain why existing assertions or cleanup do not prevent it

## Medium severity

A finding is medium severity when the pattern creates credible intermittent failure, weak defect detection, or costly maintenance, but impact is limited to the test or feature area.

## Question

Use a question instead of a finding when required production, fixture, or configuration context is absent.
\`\`\`

References should not become a warehouse. If a file exceeds what an agent can quickly navigate, add a table of contents and tell the agent what search terms or sections matter. Keep references one level away from the main file where possible. Deep chains make selection harder and hide dependencies from maintainers.

Scripts are appropriate when deterministic behavior matters or the same code would otherwise be recreated repeatedly. For example, a validator can check that every finding has a location, impact, evidence, and proposed validation. The skill can request JSON output only when the user needs machine-readable findings, then run the validator.

Do not add a script merely to look sophisticated. Each executable expands the security and compatibility surface. Document its runtime requirements, accept explicit inputs, avoid hidden state, and return useful failure messages. Test it on valid input, invalid input, empty findings, and paths containing spaces.

## Add MCP only when the capability needs live tools

Some skills need more than instructions and local scripts. A test-management skill may need to retrieve an approved case, or a CI triage skill may need to query a controlled build service. Model Context Protocol can expose those operations as explicit tools. Use the official \`@modelcontextprotocol/sdk\` rather than inventing an integration format.

A minimal TypeScript server uses \`McpServer\`, registers a tool with \`tool()\`, and connects through \`StdioServerTransport\`:

\`\`\`typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'qa-evidence-server',
  version: '1.0.0',
});

server.tool(
  'summarize_test_run',
  'Summarize an approved test-run report by its identifier',
  { runId: z.string() },
  async ({ runId }) => ({
    content: [{ type: 'text', text: await loadApprovedSummary(runId) }],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
\`\`\`

The sample focuses on the documented SDK concepts. A real server must define authentication, authorization, input validation, data minimization, error handling, logging, and test coverage for the backing operation. Do not publish credentials, environment-specific endpoints, or a tool that can mutate shared test environments without clear confirmation and safeguards.

Keep skill publication and server deployment conceptually separate. The skill explains when and how to use a capability. The server implements access to a live system. A directory listing should clearly disclose that an external MCP server is required, what data it accesses, and whether the skill remains useful without it.

For many QA workflows, local code and artifacts are enough. Avoid making MCP a dependency when a checked-in report or explicit user-provided file supports the task. Fewer live dependencies make a public skill easier to inspect and reproduce.

## Create a clean-room evaluation suite

Testing a skill by asking the authoring agent “does this look good?” proves almost nothing. Build evaluations from realistic tasks and raw artifacts. The evaluator should not see your intended findings, private design notes, or a prompt that repeats the correct answer.

Create at least four categories:

1. **Happy path:** a complete Playwright spec and fixtures with two genuine reliability problems.
2. **Missing context:** a spec imports a fixture whose implementation is absent, so the correct response limits conclusions.
3. **Near miss:** a unit-test review request should not activate a Playwright-specific skill.
4. **Adversarial ambiguity:** a test uses a fixed delay, but a comment claims it is required. The reviewer must ask for evidence rather than trust the comment or condemn it mechanically.

Represent an evaluation case without embedding the answer in its prompt:

\`\`\`yaml
id: checkout-parallel-data
request: Review this checkout Playwright test for reliability before merge.
artifacts:
  - fixtures.ts
  - checkout.spec.ts
checks:
  - identifies shared mutable cart data with file evidence
  - distinguishes assertion weakness from synchronization risk
  - recommends a supported narrow validation sequence
disallowed:
  - invents repository commands
  - claims repeated success without execution evidence
\`\`\`

Checks should evaluate behavior, not demand exact wording. Review quality can be scored by recall of seeded risks, false-positive rate, evidence quality, prioritization, safety, and usefulness of validation advice.

Run clean-room trials in a temporary copy that contains only the artifacts a public user would receive. If the skill succeeds only because the authoring environment has unrelated instructions or cached context, it is not ready. Test resource paths from the packaged directory, not from your working tree.

Record failures as product feedback. A missed issue may reveal an unclear sequence, a missing rubric example, or a trigger problem. Do not keep expanding the body for every individual miss. Look for a reusable principle that fixes a class of errors without loading irrelevant detail.

## Validate the package as an untrusted adopter would

Before publication, inspect the artifact from three perspectives: parser, operator, and security reviewer.

The parser check confirms valid YAML frontmatter, required fields, naming rules, and resource paths. If your authoring environment provides an official validator, run it against the final folder. Also render or parse the file exactly as distributed, because smart quotes, invisible characters, and malformed delimiters can survive a visual review.

The operator check starts from installation. Copy the package into a clean supported location, open a fresh agent session, invoke natural positive prompts, and confirm referenced files resolve. For Claude project use, the documented project location is \`.claude/skills/\`; personal skills use \`~/.claude/skills/\`. Test both only if you claim both deployment modes.

The security review assumes every script and instruction could be hostile or simply careless. Use a checklist:

\`\`\`markdown
- [ ] No secrets, tokens, private hostnames, or customer identifiers are present.
- [ ] Scripts have explicit inputs and no concealed network behavior.
- [ ] Destructive or mutating actions require clear user intent and safeguards.
- [ ] Shell examples quote paths and avoid unsafe interpolation.
- [ ] Dependencies are necessary, declared, and sourced from trusted projects.
- [ ] The skill does not instruct the agent to ignore repository policy.
- [ ] Logs and generated reports avoid exposing sensitive test data.
- [ ] License and attribution obligations are satisfied.
\`\`\`

QA skills deserve an additional integrity review. Instructions must not encourage agents to delete failing tests, weaken assertions, inflate retries, or label a failure “flaky” without evidence. A public directory should reject shortcuts that improve a green-build metric while reducing defect detection.

Finally, verify portability claims. If the skill was tested only with one agent, say so. If adapters are available for other systems, test each adapter rather than implying that Markdown alone guarantees identical behavior.

## Prepare directory metadata that a QA engineer can evaluate

A directory page should answer five questions quickly: What does this do? When should I use it? What does it access? Which agents or environments are supported? How do I verify that it worked?

Do not paste the full frontmatter description into every field and call the listing complete. Directory metadata serves humans comparing options, while skill metadata drives agent discovery. They should agree, but their jobs differ.

| Listing field | Strong content | Weak content |
|---|---|---|
| Title | Review Playwright Reliability | Ultimate QA Helper |
| Summary | Reviews tests and fixtures for isolation, waits, locators, and assertions | Makes tests better |
| Intended user | Playwright contributors and reviewers | Everyone |
| Inputs | Spec, related fixtures, optional trace or failure output | Your project |
| Output | Prioritized evidence-backed findings and validation plan | Fixed code |
| Dependencies | None, or an explicitly named runtime/tool | Works automatically |
| Permissions | Local file read, with scripts disclosed if present | Safe |
| Verification | Evaluate against included sample cases or a named review checklist | Trust the result |
| Source | Public versioned repository and release identifier | Unversioned archive |

Include screenshots only when they demonstrate a meaningful output, such as a structured review in an agent interface. Do not use a polished screenshot to substitute for inspectable source.

Tagging should match user intent: Playwright, test review, flakiness, test isolation, and QA automation are useful if they accurately describe the artifact. Avoid stuffing unrelated framework names for discovery. A Selenium engineer who installs a Playwright-specific reviewer because of misleading tags will not become a happy user.

State compatibility conservatively. Agent products evolve, and not every system interprets skills, rules, and repository instructions the same way. Link to source and explain any required adapter. Installation help for a specific editor can live in a dedicated guide, such as [how to install skills in Cursor](/blog/how-to-install-skills-cursor), instead of overloading the listing.

## Version source, releases, and integrity together

A public directory entry should resolve to versioned, inspectable source. Use a repository release or another immutable identifier so adopters can tell what they installed. A moving default branch alone is poor release provenance because its content can change after review.

Adopt semantic versioning as a communication discipline if it fits your directory ecosystem, but define what changes mean for a skill. A patch might clarify wording without changing expected behavior. A minor release might add a backward-compatible review dimension or optional reference. A major release might change output shape, activation scope, required tooling, or safety behavior.

Record release notes outside the runtime skill folder if auxiliary documentation is needed. The distributed skill should contain execution essentials, not a historical archive that consumes attention. The source repository and directory page can present history to humans.

Create an integrity manifest during your release process when the directory supports or benefits from it. At minimum, reviewers should be able to compare the listed release with the source tag. Do not claim cryptographic verification unless the distribution path actually checks signatures or hashes.

A release checklist can be automated without inventing agent-specific commands:

\`\`\`bash
# Run the repository's documented skill validator.
# Run script tests in the declared runtime.
# Execute clean-room evaluation cases.
# Scan the packaged folder for secrets and private identifiers.
# Compare packaged files with the intended source release.
# Review the final directory metadata against actual behavior.
\`\`\`

Those comments are intentionally portable. Replace them in your project with commands that exist and are documented. A tutorial should not teach adopters to copy fictional CLI flags.

Keep publication reproducible. Given the same source revision, the packaging process should produce the same meaningful files. Exclude editor caches, local reports, credentials, test traces containing sensitive data, and author-only notes.

## Submit to a directory without overclaiming support

Directory submission interfaces differ, so focus on the information and evidence rather than assuming universal field names. Prepare the artifact URL, immutable release reference, summary, compatibility statement, dependency disclosure, permission statement, license, maintainer contact, and validation evidence.

Before pressing publish, perform a final reader simulation. Search using the problem language from your original prompts. Does the title distinguish review from generation? Does the summary state Playwright scope? Can a user see whether scripts execute? Is the source one click away? Can they identify the release they will install?

If the directory performs automated checks, treat failures as useful. Correct malformed frontmatter, missing source, broken resources, or unsupported claims in the artifact itself. Do not modify only the listing when the package remains ambiguous.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI. When you publish there or in another public catalog, assume users will compare your skill with alternatives in seconds. Evidence wins: narrow scope, visible source, realistic examples, and an honest compatibility statement are more persuasive than a long list of aspirational benefits.

After approval, install the directory version into a clean environment. This catches packaging differences that source-tree testing misses. Run one positive selection case, one non-selection case, one full workflow case, and one resource-path check. Publication is not complete until the public artifact behaves like the reviewed artifact.

## Launch with an adoption test, not an announcement alone

The first users will reveal assumptions your clean-room suite missed. Recruit a small group of QA engineers who did not author the skill. Give them the directory page, not a private walkthrough, and ask them to use it on a real but non-sensitive review.

Observe where they hesitate:

- They cannot tell whether the skill will edit files or only report findings.
- They omit fixture context because the input requirements are unclear.
- The skill classifies every issue as high severity.
- Suggested validation conflicts with their repository commands.
- The agent does not select the skill for vocabulary the team commonly uses.
- The directory's installation steps leave the package in the wrong scope.

Convert observations into either documentation, skill, evaluation, or directory fixes. Do not solve a directory discoverability problem by bloating the runtime body. Do not solve a missing evidence rule with promotional copy. Each layer has a distinct responsibility.

Track a small set of launch signals: successful installation, successful selection for intended prompts, workflow completion, false-positive reports, resource failures, and uninstall reasons. Avoid collecting project code or test data merely to measure adoption. Privacy-preserving aggregate events or voluntary issue reports are safer defaults.

One strong signal is a user-submitted before-and-after case: the original review missed a shared fixture risk, the revised skill identified it with evidence, and the evaluation now preserves that scenario. This is more valuable than download count because it shows the capability is becoming more reliable.

## Maintain trust after the first release

Public skills age. Framework APIs change, recommended test patterns evolve, directory policies tighten, and examples become inconsistent with modern repositories. Assign a maintainer and publish a support expectation before adoption grows.

Review the skill on a predictable cadence and after relevant ecosystem changes. For a Playwright reviewer, that means checking official framework guidance, but not reflexively rewriting the skill for every release. Update when behavior, terminology, or recommended evidence materially changes.

Triage reports into four buckets:

| Report type | Example | Maintainer response |
|---|---|---|
| Trigger defect | Common “audit this spec” prompt does not select | Refine description and add selection regression case |
| Workflow defect | Review ignores worker-scoped shared state | Improve sequence or rubric, then add evaluation |
| Repository assumption | Skill invents a package script | Add discovery and uncertainty guidance |
| Feature request | User wants Selenium review | Consider a separate skill rather than broadening blindly |

Security fixes deserve urgent releases and clear notices. If a script exposes data or performs an unsafe action, remove or disable the affected distribution, explain the impact without leaking exploitation detail, and provide an upgrade path. A public directory should support reporting and, ideally, flagging obsolete releases.

Deprecate responsibly. Mark the listing, explain the replacement, keep source history available where appropriate, and avoid silently redirecting a skill name to a materially different capability. Users may have built team workflows around the old activation and output contract.

Maintenance also means subtraction. Delete redundant prose after an agent platform makes it unnecessary, remove stale framework advice, and split a skill when its description becomes a catalog of unrelated triggers. A focused version 2 is healthier than a version 8 that tries to serve every QA framework and every stage of delivery.

## A publication gate for QA skill maintainers

Use a release gate that someone other than the author can verify. The following sequence is intentionally independent of any one directory UI:

1. **Contract approved:** user, trigger, output, boundaries, and safety are written in testable language.
2. **Package minimal:** every file supports runtime behavior, and every bundled resource is referenced.
3. **Metadata valid:** name and description meet format and length constraints.
4. **Workflow evidence-based:** steps distinguish facts, hypotheses, missing context, and validation.
5. **Resources tested:** scripts pass representative valid and invalid cases; references resolve from the package.
6. **Selection evaluated:** varied positive prompts activate and nearby negative prompts stay out.
7. **QA outcomes evaluated:** findings improve defect sensitivity, reliability, or maintainability without weakening assertions.
8. **Security reviewed:** permissions, dependencies, data access, and executable behavior are disclosed.
9. **Release reproducible:** directory artifact matches an inspectable versioned source revision.
10. **Public install verified:** the exact published package works in a clean supported environment.
11. **Ownership assigned:** users can report defects and a maintainer can ship or deprecate safely.

Do not waive a failed gate because the Markdown looks harmless. Instructions can cause destructive commands, false confidence, or systematic test weakening. Conversely, do not require enterprise ceremony for a tiny instructions-only artifact. Scale the evidence to risk, dependencies, and reach.

The finished skill should make a promise a QA engineer can test: when given a Playwright spec and its supporting context, it produces prioritized, evidence-backed reliability findings and a repository-aware validation plan. The directory should make that promise easy to discover and easy to inspect. The release process should demonstrate that the promise survives outside the author's machine.

Before approving the gate, ask a reviewer to trace one directory claim all the way into behavior. If the listing promises parallel-safety analysis, the description must select that request, the workflow must inspect data ownership and fixture scope, the rubric must distinguish evidence from suspicion, and an evaluation must fail when the analysis is omitted. This vertical trace is a powerful defense against polished listings backed by generic instructions. Repeat it for the highest-risk promise and for every executable dependency. The exercise also gives maintainers a precise map of what must change together when the public contract evolves.

Finally, archive the evidence attached to the release: evaluation results, security review outcome, package inventory, and public-install confirmation. Keep private test artifacts out of the archive, but retain enough sanitized detail to reproduce the decision. When a future report questions a recommendation or script behavior, maintainers can compare it with the conditions under which the release was approved instead of reconstructing intent from memory.

That is the complete route from \`SKILL.md\` to public capability: define narrowly, package deliberately, evaluate in clean context, disclose dependencies, publish immutable source, validate the public copy, and maintain it like code.

## Frequently Asked Questions

### Do I need scripts or references before publishing my first skill?

No. An instructions-only skill is often the best first release when the workflow can be expressed clearly and evaluated without deterministic utilities or large domain references. Add a script when repeated computation, validation, or transformation benefits from code. Add a reference when detailed material should load only for a specific decision. Every extra file expands maintenance and security review, so it should solve an observed execution problem. A minimal skill with strong triggers and clean evaluations is more publishable than a crowded folder of unused resources.

### How many evaluation cases are enough for a public QA skill?

There is no universal count, but cover behavior classes rather than accumulating similar examples. Include complete and incomplete inputs, intended and nearby unintended prompts, at least one ambiguity, and at least one safety boundary. For a review skill, vary framework patterns, fixture scope, assertion quality, and evidence availability. Start with a compact suite you can run on every change, then add regression cases for real failures. Publication risk, executable dependencies, and expected reach should determine whether you need a handful of cases or a larger maintained corpus.

### Can I publish one skill for every test-automation framework?

You can, but broad framework coverage usually weakens selection and fills the body with conditional advice. Publish one cross-framework skill only when the workflow is genuinely shared, such as risk-based test-plan review, and move framework details into clearly selected references. If triggers, artifacts, terminology, or validation differ substantially, separate skills are easier to discover and evaluate. A Playwright reliability reviewer should not claim Selenium, Cypress, Appium, and performance-testing support simply because some principles overlap. Narrow promises build more trust than an impressive but untested compatibility list.

### What should I do if the published package differs from the reviewed source?

Pause promotion and treat the mismatch as a release failure. Identify whether packaging added, removed, transformed, or selected files from the wrong revision. Correct the build or submission process, publish a new immutable artifact, and repeat clean-environment installation plus core evaluations. If users could have installed the mismatched version, disclose the affected release and any security or behavior impact. Do not edit only the directory description to fit an unreviewed package. The public artifact, source reference, and validation evidence must describe the same bytes and behavior.
`,
};
