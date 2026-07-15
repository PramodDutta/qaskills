import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Claude Code Plugins and Skill Marketplaces: The Complete Guide',
  description: 'Learn how Claude Code plugin marketplace skills are packaged, evaluated, tested, and distributed so QA teams can adopt reusable automation safely.',
  date: '2026-07-15',
  category: 'Guide',
  content: `
# Claude Code Plugins and Skill Marketplaces: The Complete Guide

The first useful QA skill usually starts as one engineer's shortcut. It reviews a Playwright failure, turns acceptance criteria into boundary cases, or checks an OpenAPI diff for consumer risk. The tenth useful skill creates a distribution problem. Teammates need consistent installation, upgrades, ownership, documentation, and a way to decide which package is trustworthy.

Claude Code plugins and marketplaces address different halves of that problem. A plugin is a self-contained package of capabilities. It can include skills and, when justified, agents, hooks, MCP servers, or language-server configuration. A marketplace is a catalog that tells Claude Code where plugins come from. Adding a marketplace makes its catalog available; it does not install every plugin inside it. Users or teams still choose individual plugins.

For QA organizations, that distinction is foundational. A catalog may list browser-testing, accessibility, contract-testing, and incident-triage plugins, while a mobile team installs only what fits its workflow. This guide explains how Claude Code plugin marketplace skills move from a local experiment to a governed, testable release. It also gives evaluators a concrete acceptance model, because convenience without verification can turn agent extensions into a new supply-chain and maintenance surface.

Official behavior and commands can evolve, so verify operational details against the Claude Code documentation at https://code.claude.com/docs/en/plugins, https://code.claude.com/docs/en/discover-plugins, and https://code.claude.com/docs/en/plugin-marketplaces.

## Draw the Boundary Between a Skill, Plugin, and Marketplace

A standalone skill is often the right starting unit. A project skill under \`.claude/skills/<skill-name>/SKILL.md\` serves one repository. A personal skill under \`~/.claude/skills/<skill-name>/SKILL.md\` follows one user across projects. Both are easy to edit while the workflow is still changing.

A plugin is the packaging boundary. It makes one or more capabilities reusable beyond a single \`.claude/\` directory and gives installed skills a namespace. A plugin named \`qa-release\` with a \`risk-review\` skill is addressed under the plugin namespace, which helps avoid collisions with an unrelated \`risk-review\` elsewhere.

A marketplace is the discovery and distribution boundary. It is not a bundle that automatically activates every catalog entry. Teams register the catalog, inspect choices, and install selected plugins at an appropriate scope.

| Unit | Primary purpose | QA example | Change cadence |
|---|---|---|---|
| Standalone skill | Prove one repeatable workflow | Generate boundary cases for a single checkout repository | Fast, tied to project experiments |
| Plugin | Package reusable capabilities | Contract review plus fixture guidance for many services | Versioned releases |
| Marketplace | Catalog and locate plugins | Internal quality-engineering extension catalog | Catalog updates plus plugin releases |
| Instructions file | Apply repository conventions | Require Vitest style and forbid production credentials | Changes with repository policy |

Do not package every instruction as a skill. Persistent repository conventions belong in the instruction mechanism used by the target agent. Examples include \`AGENTS.md\`, \`.github/copilot-instructions.md\`, scoped \`.github/instructions/*.instructions.md\` files with \`applyTo\` frontmatter, \`.cursor/rules/*.mdc\`, and \`GEMINI.md\` for Gemini CLI. These formats are not interchangeable. A Claude skill is appropriate when the agent should load a specialized procedure for a matching task.

Likewise, do not create a marketplace for one private experiment. First prove that the skill produces useful, repeatable outcomes. Packaging is valuable when multiple people or projects need the same capability and can support a release process.

## Decide Whether the QA Workflow Deserves a Plugin

Pluginization introduces an installation and update lifecycle. Make that trade only when the workflow has enough reuse to justify it. A browser triage procedure used by eight product repositories is a strong candidate. A one-off migration checklist for a branch that closes tomorrow is not.

Score the candidate on reuse, stability, dependencies, and ownership. High reuse increases the payoff. Stable inputs and outputs make regression testing possible. Dependencies must fit inside the package or be clearly documented. An owner must respond when the test framework or Claude Code behavior changes.

| Candidate workflow | Standalone skill | Plugin | Reason |
|---|---:|---:|---|
| Repository-specific test data reset | Strong fit | Weak fit | Coupled to one schema and environment |
| Cross-team flaky-test classifier | Prototype first | Strong fit after validation | Repeated intent and shared output model |
| Temporary release audit | Strong fit | Weak fit | Short lifespan and changing rules |
| Accessibility review standard | Useful prototype | Strong fit | Shared policy, references, and evidence format |
| Vendor-specific defect sync | Maybe | Strong fit if MCP integration is maintained | Reusable external capability with ownership needs |

Use standalone configuration while discovering the procedure. Collect actual QA prompts, note what evidence reviewers need, and learn where the workflow stops. A skill that only says "review test quality" is not ready for distribution. A skill that classifies assertion strength, detects isolation risks, checks fixture ownership, and returns a review matrix has a testable contract.

Before packaging, answer these questions:

1. Which user intents should select the skill automatically?
2. What artifact proves it completed its job?
3. Which files, scripts, binaries, or network services does it require?
4. Can the workflow operate safely in read-only review mode?
5. Who approves breaking changes to its output or permissions?
6. How will a clean machine validate installation?

If the answers vary by repository, keep the universal procedure in the plugin and leave repository policy in local instructions. For example, the plugin can explain how to evaluate test isolation, while the repository says whether fixtures use Vitest, pytest, or Playwright.

## Package a QA Skill as a Self-Contained Plugin

A conventional multi-skill plugin keeps its manifest in \`.claude-plugin/plugin.json\` and its skills under \`skills/\`. Each skill has its own \`SKILL.md\`. References and scripts should remain inside the plugin because marketplace-installed plugins are copied into a local cache and cannot depend on paths outside their plugin directory.

\`\`\`bash
qa-release-plugin/
  .claude-plugin/
    plugin.json
  skills/
    risk-review/
      SKILL.md
      references/
        release-risk-model.md
    regression-plan/
      SKILL.md
      templates/
        plan.md
  README.md
\`\`\`

The manifest establishes plugin identity for the plugin manager. The official quickstart shows fields such as \`name\`, \`description\`, \`version\`, and an author object. Keep the manifest factual. The description should tell an installer what the package contributes, not claim that it guarantees defect-free releases.

\`\`\`json
{
  "name": "qa-release-plugin",
  "description": "Adds risk review and regression planning skills for software releases",
  "version": "1.0.0",
  "author": {
    "name": "Quality Engineering"
  }
}
\`\`\`

Inside each \`SKILL.md\`, frontmatter tells Claude when the procedure is relevant. The documented \`name\` limit is 64 characters and the \`description\` limit is 1024 characters. The body contains the workflow Claude should follow after selection.

\`\`\`markdown
---
name: risk-review
description: Review a proposed software release for test and quality risk. Use when asked for release readiness, regression scope, rollout risk, or evidence gaps before deployment.
---

# Release risk review

1. Identify changed behaviors and affected user journeys.
2. Map each change to existing automated and manual evidence.
3. Rank uncovered risks by impact, likelihood, and detectability.
4. Propose the smallest regression scope that addresses the top risks.
5. Separate verified facts from assumptions and missing evidence.
\`\`\`

Avoid references such as \`../../shared/release-policy.md\`. They may work from the source checkout and fail after installation because the plugin is cached as a self-contained directory. Copy stable material into the plugin when licensing and ownership permit it, or instruct the skill to look for repository-local policy without assuming it exists.

One plugin should represent a coherent job family. Combining mobile accessibility, database migration, security response, and copy editing under a vague \`team-tools\` name makes evaluation and permissions difficult. A focused package lets adopters understand its blast radius and update schedule.

## Design Skills That Survive Multiple Repositories

A marketplace plugin cannot assume every consumer uses the author's test runner, path layout, or CI vendor. Reusability comes from separating invariants from adapters.

For a regression-planning skill, invariants include identifying changed behavior, mapping risk to evidence, and exposing gaps. Repository-specific details include where tests live, which commands run them, and what labels a pull request uses. Let Claude inspect local evidence or ask for it. Do not hardcode \`tests/e2e\` as a universal location.

Use capability detection in instructions:

\`\`\`markdown
Before proposing commands:

1. Inspect the repository's documented test instructions and package scripts.
2. Identify the existing framework from configuration and nearby tests.
3. Reuse established naming, fixture, and assertion patterns.
4. If no executable test setup is visible, provide a framework-neutral plan.
5. Never invent a command, path, environment variable, or CI job name.
\`\`\`

That final rule is especially important for QA automation. A plausible but nonexistent \`test:regression\` script wastes time and can mislead reviewers. The plugin should ground every command in repository evidence.

Keep examples varied but labeled. If the skill demonstrates Playwright, say it is an example and tell Claude to adapt only when Playwright is present. Include Python or API examples only when they teach a decision rule that transfers. A plugin does not become framework-neutral merely by listing five framework names in its description.

Design outputs that teams can compare. A table with risk, evidence, gap, and next action is portable. A requirement to create a Jira issue is not portable unless the plugin also provides or documents the integration and has authorization. Offer a Markdown artifact first, then optional external actions through a separately reviewed capability.

### Keep tool boundaries visible

Skills are instructions. Plugins can also carry more active components. An MCP server can expose tools backed by an external service, while a hook can react to documented events. Those capabilities deserve stronger review than a read-only Markdown skill because they may execute commands, access networks, or change systems.

The Model Context Protocol TypeScript SDK uses \`McpServer\`, \`tool()\`, and \`StdioServerTransport\` to define and serve tools. If your QA plugin includes an MCP integration, test the server independently, describe tool inputs and side effects, and require explicit authorization for actions such as creating defects or changing test-management records. Do not hide state-changing behavior behind an innocent-sounding review skill.

## Build a Marketplace Catalog That Helps Selection

A marketplace repository contains \`.claude-plugin/marketplace.json\` at its root. The catalog has its own name and owner information, plus a \`plugins\` array. Each plugin entry needs at minimum a name and source according to the official marketplace documentation. A local source can point to a plugin directory within the marketplace repository.

\`\`\`json
{
  "name": "quality-engineering",
  "owner": {
    "name": "Quality Engineering"
  },
  "plugins": [
    {
      "name": "qa-release-plugin",
      "source": "./plugins/qa-release-plugin",
      "description": "Risk review and regression planning for software releases"
    },
    {
      "name": "api-contract-plugin",
      "source": "./plugins/api-contract-plugin",
      "description": "Compatibility analysis and contract-test design for API changes"
    }
  ]
}
\`\`\`

Catalog descriptions serve installers, while skill descriptions serve runtime routing. They should agree but need not be identical. The catalog answers, "Should I install this package?" The skill frontmatter answers, "Should Claude use this procedure for the current task?"

Organize the catalog around jobs that a QA engineer recognizes. Names such as \`api-contract-plugin\` or \`browser-failure-triage\` reveal purpose better than \`qa-utils-2\`. State required external software in the plugin README. If a browser skill needs a locally installed browser or an integration needs credentials, say so before installation.

| Catalog information | Installer question answered | Acceptance check |
|---|---|---|
| Plugin name | What will I install and invoke? | Stable, distinct, readable identifier |
| Description | What QA outcome does it support? | Specific job and scope |
| Source | Where is the package fetched from? | Resolvable and access-controlled |
| Owner information | Who is accountable? | Maintained team or author identity |
| README | What does it require and change? | Install, use, permissions, removal, support |
| Release history | What changed since my version? | Traceable behavior and dependency changes |

Avoid a catalog entry that promises "complete QA automation." It gives no adoption signal and cannot be tested. Describe the workflow and boundary: "classifies Playwright failures from test output and trace evidence" is evaluable.

## Install at the Scope That Matches Ownership

Claude Code distinguishes marketplace registration from plugin installation. The official marketplace is available in normal interactive use, and other marketplaces can be added from supported sources. The interactive \`/plugin\` manager provides discovery, installed, marketplace, and error views. Direct commands can also add a marketplace and install a named plugin.

\`\`\`bash
/plugin marketplace add ./quality-engineering-marketplace
/plugin install qa-release-plugin@quality-engineering
/reload-plugins
\`\`\`

Use the current official documentation for the exact source form when adding Git hosting, local directories, or remote catalogs. After installation or enablement changes in a running session, \`/reload-plugins\` loads active plugin components without requiring a full restart.

Installation scope expresses ownership:

| Scope | Appropriate QA use | Main tradeoff |
|---|---|---|
| User | One engineer uses a trusted plugin across projects | Teammates do not automatically share the choice |
| Project | Repository collaborators should use the same plugin | Repository maintainers assume governance responsibility |
| Local | One engineer tests a plugin in one repository | Useful for evaluation, not team standardization |
| Managed | Administrators control required organizational plugins | Central consistency with less individual control |

Select scope deliberately. A personal exploratory tool should not become a project requirement merely because one engineer likes it. Conversely, a release evidence plugin that defines the team's signoff format should not rely on every person remembering a user-level install.

Adding a marketplace is not approval of every plugin it lists. Record the marketplace's owner and source, then review each installed package. A broad public catalog can be useful for discovery without granting blanket trust.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI. Treat any source, including a convenient directory, with the same evaluation discipline: inspect the skill's job, required tools, repository fit, and update path before using it on sensitive code.

## Evaluate a Plugin Like a Test Dependency

A plugin that influences test creation or release decisions belongs in the engineering dependency inventory. Review it before adoption, then re-evaluate meaningful updates. The depth should match capability. A Markdown-only review skill needs semantic and content review. A plugin that bundles executable scripts, hooks, or MCP servers needs code, permissions, and side-effect review.

Start with provenance. Identify the publisher, source repository, license, issue history, release history, and maintenance activity. Confirm that the installed source matches what you reviewed. Popularity is not proof of safety or workflow quality.

Then inventory components. Ask what is always visible to Claude, what loads only when invoked, what commands can execute, what network services are contacted, and which credentials may be read. Installed marketplace plugins are copied to a local cache, so inspect the package as distributed, not only a developer checkout with outside dependencies.

Use this decision matrix:

| Risk question | Low-risk evidence | Escalation signal | QA response |
|---|---|---|---|
| Does it modify files? | Review-only skill with explicit output | Hook or script edits automatically | Test in disposable repository |
| Does it access a network? | No external component | MCP server or download behavior | Review destinations and credentials |
| Are commands grounded? | Reads repository scripts first | Invented or hardcoded commands | Reject or constrain workflow |
| Is scope precise? | Positive and negative trigger cases | Claims all testing tasks | Demand narrower responsibility |
| Is ownership active? | Named maintainer and releases | Abandoned source | Fork, pin, or do not adopt |
| Are updates understandable? | Changelog and version discipline | Silent behavioral changes | Hold rollout and compare package |

Security review is not the only review. A safe plugin can still be operationally poor. Test whether it understands your fixture conventions, produces maintainable automation, distinguishes observations from assumptions, and avoids converting every risk into a new end-to-end test.

Use a disposable repository containing representative but synthetic patterns: a unit test, an API test, a browser test, an intentionally flaky fixture, and repository instructions. Never begin evaluation on production credentials or a live incident workspace.

## Create an Acceptance Harness for Marketplace Skills

Evaluate the installed artifact, not merely the source skill. Packaging, namespacing, cache behavior, missing references, and scope can introduce defects that local development does not reveal.

Build a fixture repository with known inputs and expected properties. For a regression-planning plugin, include a small checkout change, existing tests that cover one path, and a deliberate evidence gap around payment failure. The oracle should check that the plugin identifies the changed journey, credits existing evidence, and exposes the payment gap. Avoid demanding identical prose.

\`\`\`yaml
plugin: qa-release-plugin
skill: risk-review
fixture: checkout-change
expect:
  selects_for:
    - Review release readiness for this checkout change.
    - What regression evidence is missing before deployment?
  does_not_select_for:
    - Rewrite this button label.
    - Diagnose why the TypeScript compiler is slow.
  output_properties:
    - changed behavior inventory
    - evidence mapped to risk
    - assumptions labeled
    - payment failure gap identified
\`\`\`

Run tests across lifecycle boundaries:

1. Load the plugin directory directly during development.
2. Build the marketplace catalog locally.
3. Add the local marketplace and install the plugin.
4. Reload plugins and exercise namespaced skills.
5. Verify reference files and scripts work from the installed cache.
6. Upgrade to a new version and rerun the same suite.
7. Disable or uninstall it and confirm the capability is gone.

The official development flow supports loading a plugin directory for local testing. Use the documented \`--plugin-dir\` approach rather than copying files into unrelated locations:

\`\`\`bash
claude --plugin-dir ./qa-release-plugin
\`\`\`

This is a development test, not the whole acceptance test. Installation through a marketplace exercises catalog resolution and cached packaging. Both paths matter.

Track false activation too. A release-risk skill that appears during every test-writing request adds context and may steer work unnecessarily. The negative suite should include adjacent QA jobs such as performance analysis, defect reproduction, and accessibility scanning.

### Test output utility, not just activation

A skill can trigger perfectly and still create weak work. Score outputs against a rubric grounded in reviewer needs:

| Quality dimension | Strong evidence | Failure example |
|---|---|---|
| Repository grounding | Cites real scripts, tests, and changed files | Invents a test command |
| Risk reasoning | Connects impact, likelihood, and detectability | Lists generic edge cases |
| Automation judgment | Chooses appropriate test layer | Pushes every scenario to browser E2E |
| Evidence honesty | Labels assumptions and missing inputs | States imagined coverage as fact |
| Actionability | Gives prioritized cases with oracles | Says "test thoroughly" |

Use at least two reviewers for a high-impact plugin pilot. Differences in scoring expose ambiguous expectations that the skill or rubric should clarify.

## Version Releases Without Surprising Test Teams

Plugin releases can change routing, output format, tools, and dependencies. Treat those changes as API changes for the humans and automation that consume them.

Semantic version labels are useful only when connected to a release policy. A breaking change might rename a skill, remove an output section that a team copies into release notes, add a state-changing integration, or change required software. A smaller change might clarify instructions or add an optional reference without changing established behavior.

The marketplace documentation explains an important choice: if a plugin version is declared, authors must update it for users to receive the new release. If version is omitted for a Git-hosted marketplace, commits can identify versions. Choose one policy, document it, and prove updates in a clean environment.

\`\`\`markdown
## 1.2.0

- Added API-consumer evidence checks to risk-review.
- Added negative trigger cases for performance-test prompts.
- No new commands, credentials, or network access.

## 2.0.0

- Renamed regression-plan output column from Coverage to Evidence.
- Removed the legacy release-summary skill.
- Migration: update team templates that parse the old column heading.
\`\`\`

Include permission and capability changes prominently. An update that introduces an MCP server is not a routine wording tweak, even if the skill name stays the same. Give pilot users a way to inspect and test it before team-wide enablement.

Roll out in rings. Start with maintainers, then a few representative repositories, then broader project scope. Preserve the previous test results and known-good package identity so you can compare regressions. If the plugin affects release signoff, schedule updates outside critical release windows.

Do not equate marketplace refresh with plugin update success. Test catalog visibility, installed version behavior, and active-session reload separately. Record which layer failed when supporting users.

## Operate an Internal QA Marketplace

An internal marketplace is a product for engineering teams, even if no money changes hands. It needs ownership, intake criteria, support expectations, and retirement procedures.

Define a small governance model:

- Catalog maintainers review metadata, sources, and release quality.
- Plugin owners maintain workflow content and acceptance fixtures.
- Security reviewers examine executable or networked components proportionally.
- QA representatives validate usefulness across test stacks.
- Repository owners decide whether adoption is user, local, project, or managed scope.

Keep the catalog navigable. Categories can reflect jobs such as test design, browser diagnosis, API quality, mobile testing, accessibility, performance, and release evidence. Do not duplicate near-identical plugins because two teams prefer different wording. Extract the stable workflow or make repository policy configurable through local evidence.

Publish an intake checklist:

\`\`\`markdown
- [ ] Plugin has a clear owner and source repository.
- [ ] Skills declare precise QA intents and observable outputs.
- [ ] Positive, adjacent, and negative prompts are tested.
- [ ] All references required after installation are inside the plugin.
- [ ] Commands and external services are documented.
- [ ] Synthetic acceptance fixtures pass from an installed package.
- [ ] Version and rollback policy are documented.
- [ ] README explains install, use, disable, uninstall, and support.
\`\`\`

Measure marketplace health with operational signals rather than vanity totals. Useful measures include successful clean installs, active maintained plugins, update adoption, unresolved plugin defects, false-trigger reports, and time to retire unsafe versions. "Fifty plugins published" can mean fifty maintenance liabilities.

For a public catalog, publishing adds discovery, documentation, and trust work beyond packaging. The [guide to publishing an AI agent skill directory](/blog/how-to-publish-ai-agent-skill-directory) covers directory architecture and contributor operations in more depth. An internal catalog can start smaller, but it should still state who can publish and what evidence is required.

## Keep Skills Distinct From Commands and Integrations

Users often group all agent extensions under "commands," but the design choice affects testing. A skill can be selected automatically from its description or invoked through its exposed name. A direct command-like workflow is useful when the user must choose the exact moment, supply a known argument, or authorize an explicit action.

For example, automatic selection suits "review this change for release risk." A deliberate invocation suits "publish the approved summary" because publishing changes external state and should not happen merely because the user discussed it. Split analysis from action when possible.

The [Claude Code custom slash commands guide](/blog/claude-code-custom-slash-commands-guide) covers explicit interaction patterns. In a plugin portfolio, document whether each capability is model-selected, explicitly invoked, or event-driven. Reviewers should never have to infer that from a surprising side effect.

Use MCP when the agent needs a defined tool interface to another system. A test-management MCP server might expose read operations for plans and a separately named write operation for results. The skill can teach Claude when to call those tools, but the server owns input validation, authentication, and side effects. Test both layers independently.

Use hooks only for behavior that truly belongs on a documented lifecycle event. A hook that automatically runs a large test suite after every small edit may waste time and obscure control. A narrowly scoped validation hook can be useful if teams understand its cost and failure behavior.

| Need | Prefer | QA example |
|---|---|---|
| Reusable reasoning procedure | Skill | Derive risk-based cases from a change |
| Explicit user-controlled workflow | Named invocation | Generate an approved release artifact |
| External system access | MCP server plus skill guidance | Read test cases or create an authorized defect |
| Event reaction | Hook | Run a lightweight policy check at a known event |
| Persistent repository convention | Instruction file | Require fixture cleanup style |

Composing these components is powerful, but composition multiplies test boundaries. Start with the least active component that solves the problem.

## Diagnose Marketplace and Installation Failures by Layer

When a plugin does not appear, identify the broken layer before changing the skill. Marketplace registration, catalog refresh, installation, enablement, loading, and runtime selection are different states.

Use the \`/plugin\` manager's marketplace, installed, and error views to inspect status. Confirm the catalog source is reachable and that the plugin entry has the expected name and source. If the catalog is present but the plugin is absent, refresh the marketplace using the current documented command. If installation succeeds but skills are not active in the session, reload plugins.

| Symptom | Likely layer | First check |
|---|---|---|
| Marketplace absent | Registration | Added source and access credentials |
| Plugin missing from catalog | Catalog content or stale refresh | Marketplace entry and update |
| Install reports path failure | Plugin source or package layout | Source resolves within marketplace |
| Installed plugin has load error | Manifest or component structure | Error view and validation output |
| Skill name absent | Enablement or skill layout | Installed state, reload, \`skills/\` contents |
| Skill runs but misses natural prompts | Skill description | Positive and negative routing suite |
| Reference works locally, fails installed | Cache self-containment | Outside-directory path dependency |

Validate the plugin before publication with the documented validation facility available in the current Claude Code release. Keep validation output with release evidence, but do not mistake schema validation for behavioral testing.

Cache behavior explains a particularly confusing defect. The source checkout may contain a sibling \`shared\` directory, so a local skill reads it successfully. The installed plugin is copied without that sibling, and the reference disappears. Package required files inside the plugin and repeat the installed-artifact test.

When several users report different behavior, compare scope and active version. One may have a user install, another a project install, and a third a local development override. Capture marketplace name, plugin name, version identity, scope, current repository, and minimal prompt in the issue.

## Choose a Sustainable Distribution Path

There is no universal marketplace strategy. A regulated organization may use a private Git host, controlled review, and managed installation. An open-source testing project may publish a public catalog with transparent source and community evaluation. A small QA guild may begin with a repository and local marketplace installation.

Choose using five constraints:

1. Audience: one team, one company, customers, or the public.
2. Source access: public Git, private Git, local development, or approved hosting.
3. Change control: individual maintainers, code owners, or central administrators.
4. Capability risk: instructions only, local code, hooks, or external integrations.
5. Support promise: experimental, maintained, or business-critical.

Document the result in ordinary language. Tell users where source lives, who reviews it, how updates arrive, and where to report problems. A marketplace name alone is not a trust policy.

Before broad release, hand the install instructions to a QA engineer who did not build the plugin. Watch what they have to guess. Missing prerequisites, ambiguous scope, and unexplained invocation names surface quickly. Their clean-room run is more valuable than another successful test by the author.

The finished distribution should make four things boring: finding the right plugin, understanding what it can do, installing the expected artifact, and removing it cleanly. The specialized workflow inside can be sophisticated. Its lifecycle should not be mysterious.

## Frequently Asked Questions

### Does adding a Claude Code marketplace install all its QA plugins?

No. Adding a marketplace registers a catalog so its plugins can be discovered. Installation is a separate choice for each plugin. This separation lets a QA team browse one catalog while installing only the contract-testing, browser-triage, or release-review capabilities it needs. Treat catalog registration as source discovery, not blanket approval. Review each plugin's provenance, components, dependencies, permissions, and update policy, then choose user, local, project, or managed scope according to who owns the workflow.

### When should I convert a project QA skill into a plugin?

Convert it when the workflow is useful across repositories or teams, has stable inputs and outputs, and has an owner prepared to maintain releases. Keep it standalone while prompts, references, and completion criteria are still changing quickly. Before conversion, build positive and negative routing cases, define an observable artifact, remove assumptions about repository paths, and test all helpers independently. After packaging, test the installed cache artifact as well as the development directory, because marketplace installation introduces namespacing and file-resolution boundaries.

### How should a team test an update from a skill marketplace?

Use a synthetic fixture repository and rerun the same acceptance suite against the current and candidate versions. Check installation, activation, namespaced invocation, automatic selection, negative prompts, output quality, packaged references, and any scripts or external tools. Review the release notes for new permissions, network access, hooks, or changed output contracts. Pilot the update with maintainers and a few representative projects before broad enablement. For release-critical skills, preserve the previous package identity and rollback steps until the candidate proves stable.

### Are marketplace skills safe just because their catalog is trusted?

No catalog can replace plugin-level evaluation. A trusted catalog improves provenance and review expectations, but individual plugins can differ greatly in capability and risk. Inspect whether a package contains only Markdown skills or also scripts, hooks, MCP servers, or other active components. Verify source, ownership, dependencies, side effects, credential use, and maintenance. Test it in a disposable repository with synthetic data. Reassess material updates, especially when a formerly read-only workflow gains network or state-changing behavior.
`,
};
