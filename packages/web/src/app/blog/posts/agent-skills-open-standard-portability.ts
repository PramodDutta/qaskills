import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'The Agent Skills Open Standard: Write One Skill, Run It Everywhere',
  description: 'Learn how agent skills open standard portability lets QA teams write one SKILL.md once and run it across Claude, Cursor, Codex, and other agents.',
  date: '2026-07-15',
  category: 'Reference',
  content: `
# The Agent Skills Open Standard: Write One Skill, Run It Everywhere

When a Playwright suite fails at 2 a.m., your team does not want three different instruction packs for three different coding agents. You want one procedure for reproducing the flake, one checklist for classifying root causes, and one report format that matches your defect template. That is exactly the problem the Agent Skills open standard solves: a portable folder format, centered on \`SKILL.md\`, that many agent products can load the same way.

This guide is written for QA and test-automation engineers who already use AI coding agents in day-to-day work. It explains what the open standard actually standardizes, what still differs by product, how progressive disclosure keeps large skill libraries cheap, and how to design QA skills so a single package works in Claude Code, Cursor, Codex, Gemini CLI, GitHub Copilot, and other skills-compatible clients. You will leave with concrete directory layouts, frontmatter rules grounded in the public spec at https://agentskills.io/specification, portability test matrices, and a realistic plan for sharing skills across a multi-agent QA org.

For field-level YAML details and body-writing patterns, pair this article with the [SKILL.md format guide](/blog/skill-md-format-guide). For Cursor-specific install paths and project wiring, use the companion piece on [how to install skills in Cursor](/blog/how-to-install-skills-cursor).

## What the open standard actually standardizes

"Open standard" is an overused phrase in AI tooling. For Agent Skills, the phrase has a concrete meaning. The format was originally developed by Anthropic, then published as an open specification so other products could implement the same package shape. The public home of that work is https://agentskills.io, with the full format rules at https://agentskills.io/specification and open discussion on https://github.com/agentskills/agentskills.

What the standard locks down is the **skill package contract**:

1. A skill is a **directory**.
2. That directory must contain a file named \`SKILL.md\`.
3. \`SKILL.md\` starts with **YAML frontmatter**, then a **Markdown body**.
4. Required frontmatter fields are \`name\` and \`description\`, with hard length and character constraints.
5. Optional directories such as \`scripts/\`, \`references/\`, and \`assets/\` may hold executables, docs, and static resources.
6. Agents are expected to load skills through **progressive disclosure**: metadata first, full instructions on activation, bundled resources only when needed.

What the standard does **not** lock down is equally important for portability planning:

- Exact install paths on disk (\`.claude/skills/\` vs product-specific folders).
- How the user invokes a skill (slash command, auto-match, menu).
- Permission models for shell, network, and browser tools.
- Whether optional fields such as \`allowed-tools\` are honored.
- Whether bundled scripts run sandboxed, unrestricted, or not at all.

So "write once, run everywhere" is true for the **instruction package** and **discovery metadata**. It is not a promise that every runtime quirk is identical. Portable QA skills succeed when authors write for the shared contract and keep platform-specific hooks thin.

## Why portability matters more in QA than in feature coding

Feature work often lives in one primary IDE. QA work does not. A typical automation team in 2026 looks like this:

- Senior SDETs use Claude Code in the terminal for suite refactors and flake hunts.
- Manual-to-automation converters use Cursor for page-object generation.
- CI bots use Codex or another CLI agent in headless jobs.
- Product engineers on the same repo use GitHub Copilot Chat with repo skills.
- Security or accessibility specialists may run Gemini CLI with their own skill sets.

If each of those surfaces needs a different "how we write Playwright tests" document, your standards rot within a quarter. The open standard gives you one folder, version-controlled next to the test code, that every skills-compatible agent can discover from \`name\` + \`description\` and then follow from the Markdown body.

Portability also matters for **auditability**. When a skill encodes your defect severity matrix or your "Definition of Done for a flaky test," reviewers can inspect the Markdown in a pull request. That is far clearer than tribal knowledge buried in chat transcripts that differ by tool.

## Anatomy of a portable skill package

A minimal portable skill looks like this:

\`\`\`text
playwright-flake-triage/
├── SKILL.md
├── scripts/
│   └── summarize-retries.sh
├── references/
│   ├── severity-matrix.md
│   └── common-root-causes.md
└── assets/
    └── bug-report-template.md
\`\`\`

Only \`SKILL.md\` is required by the specification. Everything else is progressive detail.

### The required file: SKILL.md

\`SKILL.md\` has two layers:

1. **Frontmatter** (always loaded as discovery metadata for available skills).
2. **Body** (loaded when the agent activates the skill).

A minimal, valid frontmatter block:

\`\`\`yaml
---
name: playwright-flake-triage
description: Reproduce and classify flaky Playwright tests. Use when a CI job is intermittent, a test fails only on retry, or the user asks to triage flakiness.
---
\`\`\`

According to the public specification:

- \`name\` is required, max **64** characters, lowercase letters, numbers, and hyphens only. It must not start or end with a hyphen, must not contain consecutive hyphens, and should match the parent directory name.
- \`description\` is required, max **1024** characters, non-empty. It should say **what** the skill does and **when** to use it, with keywords an agent can match against the user request.

Optional fields documented by the same specification include:

| Field | Required | Role in portability |
| --- | --- | --- |
| \`name\` | Yes | Stable skill id; keep identical across platforms |
| \`description\` | Yes | Cross-agent discovery signal; write for match quality |
| \`license\` | No | License name or pointer to a bundled license file |
| \`compatibility\` | No | Environment needs (packages, network, intended products); max 500 chars if present |
| \`metadata\` | No | Arbitrary string key-value map for author, version, team tags |
| \`allowed-tools\` | No | Experimental space-separated pre-approved tools; support varies by client |

Because \`allowed-tools\` is experimental and not universally implemented, a portable QA skill should never depend on it for correctness. Put hard safety rules in the Markdown body ("never delete test data without confirmation") and treat tool pre-approval as an optimization where a client supports it.

### Optional directories that travel well

The specification describes three optional folders that map cleanly to QA packaging:

- **\`scripts/\`**: small executables the agent can run (retry summarizers, junit parsers, log greppers). Keep them self-contained and document dependencies in the body.
- **\`references/\`**: on-demand docs (locator conventions, severity tables, API contract notes). Agents load these only when needed, which protects context.
- **\`assets/\`**: templates and static files (bug templates, CSV fixtures, screenshot naming schemes).

Progressive disclosure guidance from the standard is practical for test skills: keep the main body focused, aim for a lean \`SKILL.md\` (the docs recommend keeping it under about 500 lines), and push long matrices into \`references/\`.

## Progressive disclosure: the real portability engine

If every installed skill dumped 3,000 tokens into context at session start, multi-skill QA libraries would be unusable. The open standard designs around three load stages:

1. **Discovery**: load only \`name\` and \`description\` for available skills (roughly metadata-scale cost).
2. **Activation**: when the task matches, load the full \`SKILL.md\` body.
3. **Execution**: run scripts or open reference files only when the procedure calls for them.

For QA authors, that architecture has direct design consequences:

- Put trigger phrases in \`description\` ("flake", "intermittent", "retry", "Playwright", "allure report").
- Put the procedure, not the encyclopedia, in the body.
- Put giant decision trees, historical incident notes, and framework-specific digests in \`references/\`.
- Reference those files with **relative paths one level deep** from \`SKILL.md\`, as the specification recommends.

Example body pattern:

\`\`\`markdown
## When activated

1. Confirm the failing test id and CI job URL from the user.
2. Reproduce once locally with headed mode if the failure is UI-related.
3. Classify the failure using references/common-root-causes.md.
4. Fill assets/bug-report-template.md only after reproduction is stable.
5. If retry history is available, run scripts/summarize-retries.sh on the junit folder.
\`\`\`

This structure is portable because it does not assume a particular product UI. Any client that can read files and run shell commands can follow it. Clients with weaker tool access still get value from the classification steps and template.

## The shared contract in depth: frontmatter that survives product hops

Portable skills fail most often at discovery, not execution. If \`description\` is vague ("helps with testing"), agents under-activate the skill. If \`name\` violates constraints, validators and some clients reject the package.

### Name rules you should enforce in review

Valid:

\`\`\`yaml
name: api-contract-smoke
\`\`\`

\`\`\`yaml
name: visual-diff-triage
\`\`\`

Invalid under the public rules (do not ship these):

\`\`\`yaml
name: API-Contract  # uppercase not allowed
\`\`\`

\`\`\`yaml
name: -smoke-tests  # cannot start with hyphen
\`\`\`

\`\`\`yaml
name: smoke--tests  # consecutive hyphens not allowed
\`\`\`

Also keep \`name\` equal to the directory name. That pairing is part of the specification and makes multi-agent installs less surprising.

### Description rules that improve multi-agent recall

A good portable description does three jobs:

1. States the capability.
2. States the trigger conditions.
3. Includes domain keywords that appear in real user prompts.

Weak:

\`\`\`yaml
description: Helps with Playwright.
\`\`\`

Strong:

\`\`\`yaml
description: Designs and reviews Playwright end-to-end tests using page objects, test.step structure, and stable locators. Use when adding coverage for a user journey, converting manual cases, or reviewing flaky selectors.
\`\`\`

Stay within 1024 characters. For QA skills, spend those characters on product names (Playwright, Cypress, Selenium, Appium, k6), artifact types (junit, allure, trace.zip), and verbs (triage, quarantine, stabilize, assert).

### Optional fields without inventing fake keys

Stick to documented optional fields. Use \`metadata\` for org tags rather than inventing top-level keys:

\`\`\`yaml
---
name: accessibility-smoke
description: Runs keyboard and axe-style accessibility smoke checks on changed routes. Use when the user mentions a11y, WCAG, tab order, or accessibility regressions.
license: Apache-2.0
compatibility: Requires Node.js and a browser binary available to the agent
metadata:
  author: qa-platform
  version: "1.2"
  domain: accessibility
---
\`\`\`

\`compatibility\` is free-form text up to 500 characters when present. Use it for real environment needs, not marketing copy. Most pure-instruction skills can omit it.

## What transfers cleanly vs what stays platform-specific

Think of a skill as two layers: **standard payload** and **runtime adapter**.

### Transfers cleanly (standard payload)

- \`SKILL.md\` frontmatter shape and body instructions
- Relative links to \`references/\` and \`assets/\`
- Domain procedures: how to write a test, how to file a bug, how to read a trace
- Templates, checklists, severity matrices
- Small scripts that only need shell + local files

### Often stays platform-specific (runtime adapter)

- Install location and discovery roots
- Whether personal skills live under a home-directory path such as \`~/.claude/skills/\` for Claude Code
- Project skill roots such as \`.claude/skills/\` for Claude Code
- Cursor rules under \`.cursor/rules\` with \`.mdc\` files (\`alwaysApply\`, \`globs\`, \`description\`) when you need editor-native always-on rules instead of on-demand skills
- GitHub Copilot repo guidance via \`.github/copilot-instructions.md\` and path-scoped \`.github/instructions/*.instructions.md\` with \`applyTo\` frontmatter
- Nearest-file-wins \`AGENTS.md\` guidance (the agents.md convention for repo agent instructions)
- Gemini CLI project notes in \`GEMINI.md\`
- MCP server wiring through the Model Context Protocol SDK (\`McpServer\`, \`tool()\`, \`StdioServerTransport\` from \`@modelcontextprotocol/sdk\`) when a skill depends on external tools

A portable strategy for QA orgs is:

1. Put reusable procedure in a skills-standard folder with \`SKILL.md\`.
2. Keep product-native files thin: a short pointer, not a second full copy of the procedure.
3. Share MCP servers separately when tools must be identical across agents.

## Skills vs AGENTS.md vs Cursor rules vs Copilot instructions

Teams often confuse four related but different instruction surfaces. This comparison is for QA leads deciding where a rule should live.

| Mechanism | Typical shape | Load style | Best for | Portability |
| --- | --- | --- | --- | --- |
| Agent Skills (\`SKILL.md\`) | Folder + frontmatter + body | On-demand by task match | Specialized workflows (flake triage, a11y smoke, contract tests) | Highest across skills-compatible agents |
| \`AGENTS.md\` | Markdown file in repo (nearest-file-wins) | Broad agent orientation for that directory tree | Repo map, commands, coding norms | Wide convention, not the same as Skills spec |
| Cursor rules (\`.cursor/rules/*.mdc\`) | Markdown rules with \`alwaysApply\` / \`globs\` / \`description\` | Always or path-scoped in Cursor | Editor-local coding constraints | Cursor-first |
| Copilot instructions | \`.github/copilot-instructions.md\` and \`.github/instructions/*.instructions.md\` with \`applyTo\` | Repo/path scoped for Copilot | GitHub-centric team defaults | Copilot/VS Code ecosystem |

Decision guide for QA content:

- If the content is a **procedure an agent should activate only sometimes**, write a skill.
- If the content is **always true for this repo** (how to run tests, package manager, branch rules), put a short form in \`AGENTS.md\` and keep details in skills or docs.
- If the content must **force Cursor behavior on \`*.spec.ts\` files**, add a Cursor rule with globs, and still keep the deep procedure in a skill so Claude Code and Codex can share it.
- If the content is **Copilot-only path guidance**, use \`.github/instructions/\` with \`applyTo\`, but do not treat that as a portable skill substitute.

## Building a QA skill intended for multi-agent teams

Walk through a realistic portable skill: **contract-test-authoring** for teams that mix REST and GraphQL service checks.

### Directory

\`\`\`text
contract-test-authoring/
├── SKILL.md
├── references/
│   ├── assertion-style.md
│   └── openapi-checklist.md
├── assets/
│   └── contract-test-stub.ts
└── scripts/
    └── validate-openapi.sh
\`\`\`

### SKILL.md skeleton

\`\`\`markdown
---
name: contract-test-authoring
description: Author API contract tests from OpenAPI or GraphQL schemas. Use when adding service-level tests, validating breaking changes, or converting Postman collections into automated contract checks.
license: MIT
metadata:
  author: qa-platform
  version: "1.0"
  domain: api-testing
---

# Contract test authoring

## Goals

- Prefer schema-driven assertions over hard-coded full payload snapshots.
- Fail on breaking changes, warn on additive changes when configured.
- Keep tests deterministic: fixed clocks, no production data.

## Workflow

1. Identify the schema source (OpenAPI file path or GraphQL SDL).
2. Read references/openapi-checklist.md before generating cases.
3. Scaffold from assets/contract-test-stub.ts.
4. Cover happy path, auth failure, and one boundary value per required field.
5. Run scripts/validate-openapi.sh if the schema path is local.

## Output format

When done, report:

- files created
- endpoints covered
- intentionally skipped cases with reason
\`\`\`

### Why this ports well

- No product-specific slash commands.
- No invented CLI flags for a particular agent.
- Scripts are ordinary shell.
- References are plain Markdown.
- The description is rich enough for discovery in multiple clients.

### What you still test per agent

Even with a portable package, run a short smoke on each target product:

1. Is the skill discovered (appears in skill lists or is auto-matched)?
2. Does activation load the body?
3. Can the agent read \`references/\`?
4. Can the agent execute \`scripts/\` under your permission model?
5. Does the final test code match your repo conventions?

That five-point smoke is your **portability acceptance test**. Treat it like a release checklist for the skill itself.

## Portability decision matrix for common QA workflows

Use this matrix when deciding whether to invest in a pure skill, a product-native rule, or both.

| QA workflow | Prefer pure skill? | Add product-native rule? | Notes |
| --- | --- | --- | --- |
| Flaky test triage | Yes | Rarely | Procedure is tool-agnostic; scripts help |
| Locator style enforcement | Yes | Yes in Cursor for \`*.spec.ts\` globs | Skill for depth; rule for always-on nags |
| Allure report interpretation | Yes | No | Reference-heavy skill ports cleanly |
| "Always run unit tests before commit" | Partial | Yes in AGENTS.md / Copilot instructions | Better as always-on repo guidance |
| Browser MCP exploration | Skill + MCP server | Product MCP config per client | Skill describes process; MCP provides tools |
| Visual baseline approval policy | Yes | Maybe CI policy docs | Keep human approval steps explicit |
| Device lab reservation steps | Yes | No | Human process belongs in skill body |
| Framework migration (Cypress to Playwright) | Yes | Optional migration epic docs | Long references, short activation body |

## Escaping platform lock-in when you write procedures

Authors accidentally lock skills to one product with small wording choices. Avoid these patterns.

### Anti-pattern: product UI verbs

Bad: "Open the Composer panel and attach the failing screenshot."

Better: "If the client supports image attachments, include the failing screenshot; otherwise describe the visual defect in words and link the artifact path."

### Anti-pattern: hard-coded personal paths

Bad: "Read the skill from /Users/alex/.claude/skills/..."

Better: "Load this skill from the project skills directory or the user's personal skills directory, depending on install scope."

### Anti-pattern: assuming one test runner command

Bad: "Run \`npx playwright test\` only."

Better: "Run the repo's documented e2e command. If unclear, check package scripts and AGENTS.md for the canonical command, then run the smallest failing filter."

### Anti-pattern: stuffing always-on policy into a skill

Skills activate on match. Critical always-on safety ("never point tests at production") should also appear in \`AGENTS.md\` or product-native always-apply rules so agents see it even when the skill is idle.

### Anti-pattern: one giant SKILL.md

A 2,000-line body hurts every client. Split into references. Progressive disclosure is part of the standard for a reason.

## MCP, scripts, and the execution boundary

Skills package knowledge. MCP (Model Context Protocol) packages tools. Portable QA systems usually need both, but they should not be confused.

A skill might say:

- "Use the browser tool to open the staging login page."
- "If a browser MCP server is connected, prefer it over raw scripts for UI inspection."

The MCP server itself is configured per product using the shared SDK concepts from \`@modelcontextprotocol/sdk\` (\`McpServer\`, \`tool()\`, \`StdioServerTransport\`). That server process is not defined inside \`SKILL.md\` frontmatter. The portable skill describes **when** and **how** to use tools; each agent host still needs the server registered.

Scripts inside \`scripts/\` sit between pure instructions and full MCP tools:

| Approach | Portability | Strength | Weakness |
| --- | --- | --- | --- |
| Markdown-only skill | Highest | Works even with weak tool access | Agent must improvise commands |
| Bundled scripts | High if scripts are portable | Deterministic helpers | Needs shell permission |
| MCP tools | Medium (config per host) | Rich, structured tools | Install and auth differ by client |

For a QA platform team, a good default is: **skills for procedure**, **scripts for pure functions on local artifacts**, **MCP for interactive systems** (browsers, issue trackers, device clouds).

## Distribution patterns that respect the open standard

### 1. Repo-local skills (team default)

Commit skills under the project so every clone gets them. For Claude Code, project skills commonly live under \`.claude/skills/\`. Other clients document their own project roots; the package content stays the same even when the parent folder name differs.

Benefits:

- Reviewed in PRs
- Versioned with the product
- Same procedure for CI agents and humans

### 2. Personal skills (individual acceleration)

Personal libraries (for example under \`~/.claude/skills/\` for Claude Code) are great for experimental triage methods. Promote winners into the repo skill set once they stabilize.

### 3. Shared internal registry or monorepo of skills

Large QA orgs often keep a \`qa-skills\` repository. Consumers vendor or submodule selected skills into product repos. Keep each skill self-contained so consumers are not forced to take the entire catalog.

### 4. Public catalogs and installers

Community and commercial catalogs distribute skills that already follow \`SKILL.md\`. Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when you want tested packages instead of writing every workflow from scratch. Still review description quality and scripts before production use.

### 5. Thin adapters for non-skill surfaces

When a product needs native files (\`AGENTS.md\`, Cursor \`.mdc\` rules, Copilot instructions), generate thin adapters that point at the skill rather than duplicating paragraphs. Duplication is the enemy of portability.

Example thin \`AGENTS.md\` pointer (conceptually):

\`\`\`markdown
## Testing workflows

For flake triage, contract tests, and a11y smoke flows, use the project Agent Skills under the skills directory.
Do not invent parallel checklists in chat.
\`\`\`

## Reference table: portable authoring checklist

| Check | Pass criteria | Failure symptom |
| --- | --- | --- |
| Frontmatter valid | \`name\` and \`description\` meet length and charset rules | Skill ignored or rejected |
| Directory name match | Folder name equals \`name\` | Confusion across installers |
| Trigger-rich description | Includes verbs + tools + artifacts | Under-activation |
| Body under control | Main file focused; details in references | Context bloat |
| Relative refs only | Links stay inside the skill package | Broken loads on other machines |
| No secret material | No tokens, private URLs with embedded creds | Security incident |
| Scripts documented | Inputs, outputs, dependencies listed | Agent runs wrong command |
| Multi-agent smoke | Discovery + activation + one happy path per target client | "Works on my agent only" |
| Policy separation | Always-on safety also in AGENTS.md / native rules | Safety only when skill matches |
| Version metadata | Optional \`metadata.version\` updated on behavior changes | Silent drift |

## Designing for QA-specific progressive disclosure

QA knowledge is naturally layered. Exploit that.

**Layer 1 (description):** "triage flaky Playwright tests using traces and retry history."

**Layer 2 (body):** ordered steps, stop conditions, output template.

**Layer 3 (references):** long root-cause catalog, historical incident patterns, framework version notes.

**Layer 4 (assets):** bug template, severity labels, sample good/bad locator snippets.

**Layer 5 (scripts):** parse junit, extract trace errors, compute flake rates.

Agents that only need the steps never pay for the catalog. Agents deep in a hard flake load references. That is progressive disclosure used as a QA design tool, not just a spec footnote.

## Example: portable visual regression skill body (excerpt)

\`\`\`markdown
## Activation checklist

1. Confirm baseline source of truth (repo baselines vs external service).
2. Confirm browser/viewport matrix from the test config, not from memory.
3. Reproduce the diff on an unchanged branch first to rule out environment noise.
4. Classify: layout shift, font substitution, data-dependent content, or true regression.
5. If data-dependent, seed fixtures or mask dynamic regions before re-baselining.

## Hard rules

- Never update baselines in the same change that alters application code without explicit user approval.
- Prefer deterministic seeds over broader screenshot masks.
- Record the viewport, browser, and OS in the final report.

## Artifacts to collect

- path to diff image
- path to baseline
- test name
- commit SHA
\`\`\`

Notice the absence of agent-branded UI steps. That is intentional portability.

## Governance for an open-standard skill library in a QA org

Portability without governance becomes a junk drawer. Apply lightweight software engineering practices.

### Ownership

Every skill has a CODEOWNERS-style owner (platform QA, web QA, mobile QA). Owners review description quality and dangerous scripts.

### Versioning

Use \`metadata.version\` and changelog notes in the skill repo. Breaking procedure changes get a major bump and a short migration note in the body.

### Validation

Use the reference validation approach documented by the ecosystem (\`skills-ref validate ./my-skill\` from the agentskills tooling) in CI so invalid names never merge.

### Security review

Scripts are code. Treat them like code. Ban network exfiltration patterns. Disallow skills that embed credentials. Prefer reading secrets from the environment with user-approved tools.

### Compatibility notes

If a skill truly needs a browser MCP server or a private package, say so in \`compatibility\` and in the body. Do not pretend a pure-Markdown client can run a device-lab reservation API without tools.

### Deprecation

Mark deprecated skills in the description ("Deprecated: use api-contract-v2") and keep them for one release cycle so multi-agent teams can migrate.

## How the open standard interacts with the rest of your agent stack

A mature QA agent stack in one monorepo might include:

- Root \`AGENTS.md\` for how to build, test, and navigate the monorepo
- Package-level \`AGENTS.md\` files (nearest-file-wins) for service-specific commands
- \`.claude/skills/\` (or equivalent) portable skills for specialized QA workflows
- \`.cursor/rules\` for editor-enforced patterns on test files
- \`.github/copilot-instructions.md\` plus path-scoped instruction files for Copilot users
- Optional \`GEMINI.md\` for Gemini CLI users
- MCP servers for browser, Jira/bug tracker, or observability tools

The open standard does not replace those files. It gives you a **portable module format** for procedures that should not be rewritten four times. The rest of the stack handles always-on orientation and product-specific enforcement.

## Practical migration path: from scattered notes to portable skills

If your team currently has Notion pages, README fragments, and chat prompts, migrate in this order:

1. **Inventory** the top 10 repeated agent tasks in QA (flake triage, test plan from ticket, page object generation, a11y smoke, release regression selection).
2. **Pick three** with clear triggers and stable steps.
3. **Draft** \`SKILL.md\` files with strong descriptions.
4. **Move** long tables into \`references/\`.
5. **Add** one script only if it removes a frequent agent mistake.
6. **Smoke** on two different agents before rolling out.
7. **Delete** or archive the competing prompt variants so the skill is the single source.
8. **Add** thin pointers from \`AGENTS.md\` and any product-native rule files.
9. **Measure** activation quality for two weeks (are people still pasting old prompts?).
10. **Expand** the catalog once the first three are trusted.

This path prioritizes portability early: you never create Claude-only and Cursor-only twins of the same procedure.

## Writing descriptions that work across models

Different models rank semantic matches differently, but all of them benefit from concrete nouns. For QA skills, include:

- Framework names
- Artifact names (\`trace.zip\`, junit XML, har files)
- Process nouns (quarantine, soak, canary, smoke, regression pack)
- Failure nouns (flake, timeout, strict mode violation, hydration error)

Example description set for a small portable suite:

\`\`\`yaml
# skill: release-regression-picker
description: Selects a minimal regression pack from risk signals (changed packages, priority, recent failures). Use when planning a release test pass or cutting a smoke suite under time pressure.

# skill: quarantine-manager
description: Quarantines mutually agreed flaky tests with tracking metadata and exit criteria. Use when a test must stop blocking CI without being deleted.

# skill: test-data-factory
description: Designs deterministic test data factories and cleanup hooks. Use when tests need users, orders, or tenants without sharing mutable fixtures.
\`\`\`

Keep each description self-contained. Agents often see only the catalog of names and descriptions before activation.

## Case study narrative: one skill, three agents, one outcome

Imagine a checkout flake that fails 20% of the time in CI.

**Engineer A (Claude Code)** activates \`playwright-flake-triage\` from the project skills directory, follows the body, opens the trace from \`references/\` guidance, and finds a race on address autocomplete.

**Engineer B (Cursor)** on the same branch activates the same skill folder after installing it for the Cursor project. The agent loads the same body and proposes the same wait strategy and test patch.

**CI bot (Codex or similar)** uses the skill in a "triage failing job" automation, posts a summary that matches \`assets/bug-report-template.md\`, and links artifacts.

No one rewrote the procedure. That is the business case for agent skills open standard portability: human process becomes machine-readable once, then rides every client that implements the contract.

## Limits of "run it everywhere" (read this before promising the moon)

Be honest with stakeholders:

1. **Install paths differ.** The package is standard; the folder parent may not be.
2. **Tool permission differs.** A script that runs locally may be blocked in a hosted agent.
3. **Model quality differs.** The same skill text yields better follow-through on stronger models.
4. **Experimental fields differ.** \`allowed-tools\` may be ignored.
5. **Native rules still matter.** Skills do not remove the need for \`AGENTS.md\` or product rules for always-on policy.
6. **Secrets and network still need host config.** Skills should not smuggle credentials.

Portability is high leverage, not magic. Design for the shared core, test the edges.

## Authoring standards that keep a multi-year skill catalog coherent

Adopt a short internal standard that references the public spec rather than replacing it:

- Public rules at https://agentskills.io/specification are source of truth for fields and constraints.
- Internal rules cover taxonomy (\`domain\` metadata values), severity language, and required output sections for QA skills.
- Every skill PR includes a portability smoke note: which two agents were tried.
- Descriptions are reviewed as carefully as code, because descriptions are the index.

For deeper formatting patterns, examples of good vs weak frontmatter, and body structure templates, keep a short internal style guide next to the skill monorepo so authors do not re-litigate field rules in every PR.

## Putting it together: a portable QA skills monorepo layout

\`\`\`text
qa-agent-skills/
├── README.md
├── playwright-flake-triage/
│   └── SKILL.md
├── contract-test-authoring/
│   ├── SKILL.md
│   ├── references/
│   └── assets/
├── accessibility-smoke/
│   └── SKILL.md
├── release-regression-picker/
│   └── SKILL.md
└── quarantine-manager/
    └── SKILL.md
\`\`\`

Consuming apps may copy or symlink selected skills into their agent-specific skills directories. Because each skill is self-contained, partial adoption works. You do not need an all-or-nothing rollout.

When you need speed, seed the monorepo with packages from qaskills.sh via the qaskills CLI, then adapt descriptions and references to your stack (locator strategy, CI product, defect tracker). The open standard makes that third-party starting point safe to edit: you are not locked into a proprietary skill binary.

## Final takeaways for QA leads

- The Agent Skills open standard is a **folder + SKILL.md** contract with progressive disclosure, not a single vendor feature.
- Portability is strongest for **procedures, templates, and local scripts**; weakest for **host permissions and experimental fields**.
- Write descriptions for **discovery**, bodies for **action**, references for **depth**.
- Keep always-on safety in \`AGENTS.md\` / native rules; keep specialized workflows in skills.
- Validate frontmatter, smoke on two agents, and delete competing prompt copies.
- Use product-native files as **thin adapters**, not parallel encyclopedias.

If you implement only one change after reading this: pick your most repeated QA agent task, encode it as a valid skill package, and run the same folder from two different coding agents. That single experiment usually converts skeptics faster than any abstract portability slide deck.

## Frequently Asked Questions

### Is the Agent Skills open standard the same thing as AGENTS.md?

No. AGENTS.md is a widespread convention for repository (or directory) agent instructions with nearest-file-wins behavior. Agent Skills are a separate package format: a directory with \`SKILL.md\`, required \`name\` and \`description\` frontmatter, optional scripts and references, and progressive disclosure. Many teams use both. AGENTS.md orients the agent to the repo. Skills activate specialized workflows on demand. Confusing them leads to either always-on bloat or missing procedures when the skill never loads.

### Will one SKILL.md behave identically in Claude Code, Cursor, and Copilot?

The instruction text and metadata contract are shared, so procedure quality transfers well. Behavior is not bit-identical: install locations, permission prompts, script execution policies, and whether experimental fields like \`allowed-tools\` are honored can differ. Treat "identical package" as the goal and "smoke-tested on each client you care about" as the release bar. Cursor, Claude Code, and Copilot may each surface the same skill through a different install path even when the folder contents match.

### What is the safest subset of the specification to rely on for long-lived QA skills?

Rely on the required core: directory with \`SKILL.md\`, valid \`name\` (max 64, lowercase alphanumeric and hyphens, no leading/trailing/consecutive hyphens), valid \`description\` (max 1024, what + when), Markdown body, and relative references to optional \`scripts/\`, \`references/\`, and \`assets/\`. Use optional \`license\`, \`compatibility\`, and \`metadata\` freely. Treat \`allowed-tools\` as a non-critical enhancement. Avoid inventing custom top-level frontmatter keys that are not in the public specification.

### How should we test a skill before declaring it portable across the org?

Run a five-point smoke on at least two skills-compatible agents: discovery (name/description visible or matchable), activation (body loaded on a realistic prompt), reference load (agent opens a linked reference file), script execution if present (under your real permission model), and output quality (artifacts match your templates). Add a CI check with a frontmatter validator such as the ecosystem \`skills-ref validate\` flow. Only then copy the skill into multiple product repos or your shared catalog. Skip the dual-agent smoke and you will rediscover "works on my machine" at org scale.
`,
};
