import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Windsurf Rules and Memories: Configuration Guide for Test Automation Teams',
  description:
    'Configure Windsurf Cascade rules, memories, and AGENTS.md for QA teams: activation modes, paths, budgets, and test automation patterns that stick.',
  date: '2026-07-15',
  category: 'Guide',
  content: `
# Windsurf Rules and Memories: Configuration Guide for Test Automation Teams

Test automation engineers who open Windsurf for the first time often treat Cascade like a smarter autocomplete. That works for a single locator fix. It fails the moment you ask the agent to scaffold a Playwright Page Object, wire a Cypress custom command, or refactor a Selenium Grid suite without inventing new folder conventions. Cascade only becomes a reliable pair-programmer when you give it durable instructions. In Windsurf, that durable layer is the combination of **Rules** (you write them) and **Memories** (Cascade may generate them), plus related mechanisms such as **AGENTS.md**, **Workflows**, and **Skills**.

This guide is written for QA and test-automation engineers adopting AI coding agents. Every section maps configuration choices to testing workflows: Page Object layout, fixture ownership, flake triage, CI-safe shell commands, and monorepo suite boundaries. Paths, limits, and activation modes below match public Cascade documentation (including the preferred \`.devin/rules/\` layout and the legacy \`.windsurf/rules/\` fallback). Where a detail is product-UI specific and may change, the concept is described without inventing undocumented identifiers.

If you already use Cursor on some projects, keep [Cursor for QA Engineers](/blog/cursor-for-qa-engineers-complete-guide) open as a parallel mental model. Rules, memories, and directory-scoped agent files solve the same class of problem across tools, even when file names differ. For packing multi-step QA procedures into reusable agent packages, see the [SKILL.md format guide](/blog/skill-md-format-guide). Ready-made QA skills can also be installed from [qaskills.sh](https://qaskills.sh) with the qaskills CLI when you want curated Playwright, Cypress, or Selenium playbooks instead of starting from a blank rule file.

## Cascade Customization Layers QA Teams Actually Use

Cascade exposes several customization layers. Mixing them without a plan is the main reason teams report that "the AI forgot our testing standards." Official docs distinguish these clearly:

| Layer | Primary job | How it activates | QA-oriented use |
| --- | --- | --- | --- |
| **Rules** | Tell Cascade how to behave | \`always_on\`, \`glob\`, \`model_decision\`, or \`manual\` | Coding conventions for tests, forbid \`waitForTimeout\`, require data-testid strategy |
| **AGENTS.md** | Location-scoped rules with zero frontmatter | Root = always-on; subdirectory = auto-glob for that tree | \`e2e/\` vs \`unit/\` vs \`mobile/\` conventions without one giant rule file |
| **Workflows** | Prompt templates for multi-step tasks | Manual only via \`/workflow-name\` | Flake triage checklist, release smoke pack, PR test review |
| **Skills** | Multi-step procedures plus supporting files | Model-invoked or \`@mention\` | Complex generator packs with templates and helper scripts |
| **Memories** | Context Cascade auto-generates | Retrieved when Cascade judges them relevant | One-off facts ("this env uses staging cookie X"); promote durable knowledge to Rules |

The durable recommendation from the product docs is direct: for knowledge you want Cascade to reuse reliably, write a Rule or put it in \`AGENTS.md\`. Memories are convenient, local, and non-shareable. They are not a substitute for version-controlled team policy.

### Mental model for a QA workspace

Think of Rules as your **test design system**: naming, structure, assertions, and hard constraints. Think of AGENTS.md as **suite-scoped overlays**: the contract for \`packages/web-e2e\` differs from \`packages/api-contract\`. Think of Workflows as **runbooks** you deliberately invoke. Think of Skills as **toolkits** when Cascade needs files, not only prose. Think of Memories as **scratch notes** the agent took during a session about this workspace only.

A concrete sequence for a mid-size Playwright monorepo:

1. Put org-wide QA defaults in the global rules file (language for responses, "never invent selectors from screenshots alone," "prefer Playwright test runner over ad-hoc scripts").
2. Put project standards in \`.devin/rules/\` (or legacy \`.windsurf/rules/\`) with activation modes that match file types.
3. Put suite-specific constraints in nested \`AGENTS.md\` under \`e2e/\`, \`api/\`, and \`visual/\`.
4. Encode "run flake triage" as a Workflow you call with a slash command when a build fails.
5. Let Cascade create Memories for ephemeral env details, then promote anything that survives two sprints into a Rule.

## Global Rules Path and Character Budget for Cross-Project QA Conventions

Global rules live in a single always-on file:

\`\`\`text
~/.codeium/windsurf/memories/global_rules.md
\`\`\`

That file applies across workspaces. It does **not** use workspace-style frontmatter activation modes; it is always on. Documentation also caps it at **6,000 characters**. That budget is small on purpose. Global rules should hold preferences that truly travel with you, not the entire Playwright handbook.

### What belongs in global rules for QA engineers

Strong candidates:

- Preferred natural language for explanations ("Respond in English unless the user writes in another language").
- Universal agent safety for test work ("Do not delete \`test-results/\` or CI artifacts unless asked").
- Personal tooling defaults that are stable across employers ("Prefer TypeScript for new test helpers").
- High-level anti-patterns you never want ("Do not invent API keys or hard-code production credentials in tests").

Weak candidates (keep these in workspace rules instead):

- Project-specific Page Object paths.
- Framework choice for this repo only (Playwright vs Cypress).
- Selector strategy tied to a particular design system.
- CI job names and report upload commands unique to one pipeline.

### Example global rules content (concise, QA-focused)

Keep the global file short. Bullet lists outperform paragraphs for Cascade adherence:

\`\`\`markdown
# Global QA agent preferences

- Prefer TypeScript for new test helpers and fixtures.
- Never invent production secrets, tokens, or connection strings.
- When generating tests, default to role-based and accessible selectors; use test ids only when the app exposes them.
- Prefer fixing root-cause flake over adding fixed sleeps.
- Ask before changing CI configuration or deleting test reports.
- When unsure about a project convention, open existing tests in the same folder and match their style.
\`\`\`

### Budget math for multi-tool QA leads

Many QA leads juggle Windsurf, Cursor, and Claude-based agents. Resist the urge to paste a 10,000-character mega-prompt into \`global_rules.md\`. You will hit the 6,000-character cap and silently lose the bottom of the file's usefulness. Split by concern:

| Content type | Global rules | Workspace rules | AGENTS.md |
| --- | --- | --- | --- |
| Personal communication style | Yes | No | No |
| Org security baselines | Sometimes (or system rules) | Project specifics | Directory specifics |
| Framework conventions | Rarely | Yes | Yes for suite folders |
| Ephemeral staging notes | No (use Memories temporarily) | Promote if permanent | Rarely |

## Workspace Rule Files: .devin/rules, .windsurf/rules, and .windsurfrules

Workspace rules are the main lever for team-shared QA standards because they can live in git.

### Preferred and fallback directories

Official discovery order treats **\`.devin/rules/\` as preferred**, with **\`.windsurf/rules/\` as a legacy fallback**. Both use one markdown file per rule. Cascade also still reads the legacy single-file **\`.windsurfrules\`** at the workspace root.

When you create a new rule from the Cascade Customizations UI, new files are saved under **\`.devin/rules\`** of the current workspace (not always the git root). For multi-folder workspaces, rules are discovered, deduplicated, and shown with the shortest relative path.

Discovery also walks:

- Current workspace and subdirectories for \`.devin/rules\` and \`.windsurf/rules\`
- Parent directories up to the git root in a git repository
- Multiple open workspace folders with deduplication

### Character limits you must plan around

Documented limits:

- **Workspace rule file:** up to **12,000 characters** per file
- **Global rules file:** up to **6,000 characters** total for that single file

If you paste an entire internal testing wiki into one always-on rule, you will either exceed limits or crowd out more important constraints. Prefer several focused files with selective activation modes.

### Legacy single-file .windsurfrules

The older root file is still read, but it lacks the modern activation modes of directory-based rules. For a greenfield test automation repo in 2026, prefer \`.devin/rules/*.md\`. If you inherit \`.windsurfrules\`, migrate by splitting numbered lists into topical files:

\`\`\`bash
# Illustrative migration sketch for a QA monorepo
mkdir -p .devin/rules
# Split old root file into topical workspace rules, then remove or archive .windsurfrules
# after verifying Cascade loads the new files from Customizations -> Rules
\`\`\`

### Example workspace tree for a Playwright + API contract monorepo

\`\`\`text
my-product/
├── AGENTS.md
├── .devin/
│   └── rules/
│       ├── qa-core-standards.md
│       ├── playwright-e2e.md
│       ├── api-contract-tests.md
│       └── flake-policy.md
├── e2e/
│   ├── AGENTS.md
│   └── tests/
├── api-tests/
│   ├── AGENTS.md
│   └── specs/
└── packages/
    └── web-app/
\`\`\`

If you still maintain legacy \`.windsurf/rules/\` in older repos, Cascade continues to read them as a fallback. Prefer converging new work on \`.devin/rules/\` so your team has one story in onboarding docs.

## Activation Modes Mapped to Test Automation Scenarios

Each workspace rule can declare a \`trigger\` in YAML frontmatter. That field controls **when** the rule enters Cascade's context and **how much** context window it costs.

| Mode | \`trigger\` value | How it reaches Cascade | Context cost | QA scenario fit |
| --- | --- | --- | --- | --- |
| Always On | \`always_on\` | Full content in system prompt every message | Every message | Non-negotiable safety and org test standards |
| Model Decision | \`model_decision\` | Description always shown; full body loaded when Cascade judges relevance | Description always; body on demand | Flake policy, visual testing notes, release gates |
| Glob | \`glob\` | Applied when Cascade reads/edits files matching \`globs\` | Only when matching files are touched | \`*.spec.ts\`, \`**/pages/**\`, Cypress support files |
| Manual | \`manual\` | Not in system prompt until you type \`@rule-name\` | Only when @mentioned | Selenium Grid ops runbooks, rare migration recipes |

Global \`global_rules.md\` and root-level \`AGENTS.md\` are always on and do not use this frontmatter model.

### Always-on QA core rule

Use always-on sparingly. It is the right place for constraints that must hold even when the user says "just make it pass":

\`\`\`markdown
---
trigger: always_on
---

# QA core standards (always on)

- Prefer deterministic waits (web assertions, network idle where justified) over fixed sleeps.
- Do not commit real credentials; use env vars and documented secret names only.
- Match existing test style in the same directory before inventing a new pattern.
- When adding a test, also note how it should run in CI (tag, project, or suite name if the repo already uses one).
- Never "fix" a failing test by deleting assertions without explicit approval.
\`\`\`

### Glob rule for Playwright specs

Glob rules shine when conventions differ by file type. Example frontmatter from the public docs style:

\`\`\`markdown
---
trigger: glob
globs: **/*.spec.ts
---

# Playwright spec conventions

- Use \`test.describe\` / \`test\` structure; name tests as observable behavior, not implementation details.
- Import fixtures from the project's established fixtures module; do not invent a second fixture entrypoint.
- Prefer \`getByRole\`, \`getByLabel\`, then \`getByTestId\` when the app exposes stable test ids.
- Keep network mocking next to the test or in shared helpers already used by sibling specs.
- Page interactions belong in Page Objects or fixture helpers, not duplicated inline across specs.
\`\`\`

Adjust the glob to your real layout (\`e2e/**/*.ts\`, \`tests/**/*.cy.ts\`, and so on). The mechanism is "when Cascade touches matching files, apply the rule."

### Model-decision rule for flake policy

Model decision keeps the full policy out of every chat while still advertising a description Cascade can choose to load:

\`\`\`markdown
---
trigger: model_decision
description: Flake triage and quarantine policy for UI tests. Use when tests are unstable, failing intermittently, or when adding retries/quarantine tags.
---

# Flake policy

- First prove flake with two local or CI reproductions when practical.
- Prefer root-cause fixes: race conditions, shared state, hard-coded timing, polluted test data.
- Do not raise retry counts as the primary fix.
- If quarantine is required, follow the repo's existing quarantine tag or annotation pattern.
- Document the owner and follow-up ticket in the test comment, matching project style.
\`\`\`

Write the \`description\` like a trigger phrase for a human. Vague descriptions ("testing stuff") cause under- or over-activation.

### Manual rule for rare Grid or device-farm work

Manual rules are ideal for heavy operational content you do not want in every prompt:

\`\`\`markdown
---
trigger: manual
---

# Selenium Grid and device farm notes

- Prefer existing Docker Compose or Helm charts in \`infra/selenium/\` when spinning local Grid.
- Do not change Grid versions without checking the team's supported browser matrix doc.
- When generating capabilities, match browser/version pairs already used in CI.
- Capture session ids in failure logs using the project's logging helper.
\`\`\`

Activate it deliberately with \`@\` mention of the rule name in the Cascade input when you are actually doing Grid work.

## AGENTS.md Directory Scoping for Monorepo Test Suites

\`AGENTS.md\` (or \`agents.md\`) is processed by the **same Rules engine** as \`.devin/rules/\`, but activation is inferred from **location**:

- **Workspace root:** treated as always-on
- **Subdirectory:** treated like a glob of \`<directory>/**\`

No frontmatter is required. That makes AGENTS.md excellent for monorepo QA layouts where each suite has different laws.

### Example monorepo placement

\`\`\`text
shop-platform/
├── AGENTS.md                 # always-on project agent notes
├── apps/
│   └── storefront/
│       └── AGENTS.md         # app-specific notes when touching storefront
├── e2e/
│   ├── AGENTS.md             # applies under e2e/**
│   ├── playwright.config.ts
│   └── tests/
├── mobile-e2e/
│   ├── AGENTS.md
│   └── specs/
└── contract-tests/
    ├── AGENTS.md
    └── openapi/
\`\`\`

### Sample e2e/AGENTS.md content

\`\`\`markdown
# e2e suite agent notes

When editing files under e2e/:

- This suite uses Playwright Test, not Jest.
- Shared fixtures live in e2e/fixtures; do not create parallel fixture folders.
- Prefer project tags already defined in playwright.config.ts.
- Visual snapshots live under e2e/__snapshots__; update only with explicit user request.
- Failures should attach trace/video according to existing config; do not disable artifacts to "make CI green."
\`\`\`

### Sample contract-tests/AGENTS.md content

\`\`\`markdown
# API contract suite notes

- Validate against the checked-in OpenAPI document in contract-tests/openapi.
- Prefer schema assertions over brittle full-body equality when fields are volatile.
- Do not point tests at production hosts.
- Reuse authentication helpers from contract-tests/helpers; do not mint ad-hoc token scripts.
\`\`\`

### Decision matrix: AGENTS.md vs workspace Rules vs Memories

| Need | Prefer | Why |
| --- | --- | --- |
| Directory-specific suite law | Nested \`AGENTS.md\` | Zero frontmatter; auto-scoped by path |
| Cross-cutting concern with complex activation | \`.devin/rules/*.md\` | Full control via \`trigger\` and \`globs\` |
| Personal preference across all repos | \`global_rules.md\` | Always on for you only |
| Org-enforced baseline | System-level rules (enterprise) | Read-only for end users |
| One-off workspace fact learned mid-chat | Memory (temporary) | Local, auto-retrieved; promote later if durable |
| Multi-step runbook you invoke | Workflow | Manual slash command |
| Procedure with supporting files | Skill | Model or \`@mention\` with bundled assets |

Use AGENTS.md when the boundary is a folder. Use Rules when the boundary is a concern (flake policy, security) that spans folders or needs manual activation.

## Auto-Generated Memories: Local Storage, Workspace Scope, and Promotion

Memories are the other half of Cascade personalization. During conversation, Cascade can automatically generate and store memories when it believes context will be useful later. You can also ask explicitly: "create a memory of ...".

Documented properties that matter for QA teams:

- Memories are associated with the **workspace** where they were created
- They are stored locally under \`~/.codeium/windsurf/memories/\`
- Memories from one workspace are **not** available in another
- They are **not** committed to the repository
- Creating and using auto-generated memories does **not** consume credits (per public docs)
- You manage them from Cascade **Customizations**, or via product Settings, and can edit existing memories

### What Cascade should remember as Memories

Good Memory candidates:

- "Staging base URL for this workspace is set via \`BASE_URL\` and local defaults to the shared staging hostname documented in README."
- "The login test user for non-prod is provisioned by the seed script in \`scripts/seed-qa-user.ts\`."
- "This repo's flake dashboard is the internal link already referenced in the team runbook (store the fact, not secrets)."

Bad Memory candidates (put these in Rules or AGENTS.md instead):

- "Always use Page Objects" (team standard, needs git)
- "Never use \`waitForTimeout\`" (policy, needs shareability)
- Entire CI YAML instructions that every contributor must follow

### Promotion workflow for QA leads

1. Cascade creates a memory after you explain a staging quirk.
2. Two weeks later, the quirk is still true and bites other engineers.
3. You open Customizations, copy the durable part into \`.devin/rules/\` or \`e2e/AGENTS.md\`.
4. You edit or delete the local memory so Cascade does not double-count conflicting instructions.

That promotion loop is how Memories stay helpful without becoming a private shadow policy that only one laptop knows.

### Asking Cascade to create a memory deliberately

Example prompts that work well in QA sessions:

- "Create a memory that our Playwright projects are \`chromium-smoke\` and \`firefox-full\`, and PR CI only runs smoke."
- "Create a memory that visual tests must not update snapshots unless I explicitly say 'update snapshots'."
- "Create a memory that API contract tests use the OpenAPI file under \`contract-tests/openapi/v1.yaml\`."

Then verify in the Memories UI. If the fact is team-critical, do not stop at the memory; write a Rule the same day.

## Writing QA Rule Content Cascade Actually Follows

Official guidance for rule quality maps cleanly onto test automation:

- Keep rules **simple, concise, and specific**
- Skip generic advice Cascade already knows ("write good tests")
- Prefer **bullets, numbered lists, and markdown structure**
- XML-style grouping tags can help cluster related constraints

### Pattern: encode the suite's definition of done

\`\`\`markdown
---
trigger: always_on
---

# Definition of done for generated tests

- A new UI test must include: clear name, isolation strategy (fresh data or documented shared fixture), and at least one meaningful assertion of user-visible outcome.
- Prefer testing user journeys over implementation details of React/Vue internals.
- If a helper is used three times, extract it using the project's existing helper patterns.
- Do not silence TypeScript or ESLint to land a test.
\`\`\`

### Pattern: forbid common anti-patterns with replacements

Negative-only rules underperform. Pair each ban with the replacement your team wants:

\`\`\`markdown
---
trigger: glob
globs: **/*.{spec,test}.ts
---

# Wait and assertion policy

- Do not use fixed sleeps for synchronization.
- Prefer web-first assertions and locator auto-waiting from the framework in use.
- Prefer retrying assertions already provided by the test runner over manual loops.
- When polling is required, use the project's existing expect.poll or equivalent helper, not ad-hoc setTimeout loops.
\`\`\`

### Pattern: selector strategy as a ranked list

\`\`\`markdown
---
trigger: model_decision
description: Selector strategy for UI automation. Use when writing locators, Page Objects, or debugging brittle selectors.
---

# Selector strategy (ranked)

1. Role + accessible name
2. Label text for form controls
3. Placeholder only if unique and stable
4. test id attributes the app team already supports
5. CSS/XPath as last resort, with a comment explaining why higher ranks failed
\`\`\`

### Pattern: XML-style grouping for multi-framework repos

Some teams keep one always-on file with clear sections:

\`\`\`markdown
---
trigger: always_on
---

<playwright>
- Use Playwright Test runner APIs already present in the repo.
- Prefer fixtures over global mutable state.
</playwright>

<cypress>
- If editing Cypress files, follow commands in cypress/support.
- Prefer cy.session patterns already used for auth.
</cypress>

<selenium>
- Prefer explicit waits from the project's wait utilities.
- Keep browser driver versions aligned with CI images.
</selenium>
\`\`\`

Only include framework sections that exist in the repo. Empty sections add noise.

## Playwright, Cypress, and Selenium Rule Packs (Copy and Adapt)

The following packs are **content patterns**, not official product templates. Adapt names and paths to your repository. Official example rule templates also appear on the Windsurf editor directory at https://windsurf.com/editor/directory.

### Playwright pack (workspace rule + AGENTS.md)

Workspace rule (\`playwright-e2e.md\`):

\`\`\`markdown
---
trigger: glob
globs: e2e/**/*.{ts,tsx}
---

# Playwright e2e conventions

- Config lives in e2e/playwright.config.ts; do not invent a second config at repo root unless one already exists.
- Page Objects live under e2e/pages; export page classes consistently with existing files.
- Use test.step for multi-stage journeys when sibling tests already do.
- For authenticated flows, reuse the established storageState or fixture; do not log in via UI in every test unless testing login itself.
- Attachments: keep trace/video/screenshot settings as configured; do not disable them casually.
\`\`\`

Nested \`e2e/AGENTS.md\` can restate directory laws that should apply only under that tree (artifact paths, project names, snapshot policy).

### Cypress pack

\`\`\`markdown
---
trigger: glob
globs: cypress/**/*.{ts,js}
---

# Cypress conventions

- Custom commands belong in cypress/support; do not redefine commands inside individual specs.
- Prefer data-cy or the project's documented test attribute; match existing usage.
- Keep intercepts co-located or in shared intercept helpers already used by the suite.
- Avoid arbitrary cy.wait(ms) for synchronization; wait on aliases or DOM assertions.
\`\`\`

### Selenium + TestNG/JUnit pack

\`\`\`markdown
---
trigger: glob
globs: **/*{IT,Test}.java
---

# Selenium Java conventions

- Use the project's BaseTest and driver factory; do not construct raw drivers in new tests.
- Locators live in page classes; tests should call page methods.
- Prefer explicit waits from WaitUtils (or the existing utility name in this repo).
- Parallelism settings belong in surefire/failsafe config already checked in; do not hard-code thread counts in tests.
\`\`\`

### Comparison table: framework rule emphasis

| Concern | Playwright emphasis | Cypress emphasis | Selenium emphasis |
| --- | --- | --- | --- |
| Sync model | Web-first assertions, auto-wait | Command queue + assertions | Explicit waits / fluent waits |
| State setup | Fixtures, storageState | cy.session, support commands | BaseTest, drivers, seed data |
| Brittleness | Locator ranked strategy | data attributes + intercepts | Page objects + stable locators |
| CI artifacts | trace/video config | screenshots/videos config | logs, browser console capture |
| Parallelism | projects/shards | machines/specs split | surefire forks / Grid nodes |

## System-Level Rules for Enterprise QA Governance

Enterprise deployments can ship **system-level rules** that apply across workspaces and are **read-only** for end users without admin rights. They merge with global and workspace rules rather than fully replacing them. In the UI they appear with a **System** label.

Documented load locations (preferred Devin paths, with legacy Windsurf fallbacks):

**macOS:**

\`\`\`text
/Library/Application Support/Devin/rules/*.md
/Library/Application Support/Windsurf/rules/*.md
\`\`\`

**Linux/WSL:**

\`\`\`text
/etc/devin/rules/*.md
/etc/windsurf/rules/*.md
\`\`\`

**Windows:**

\`\`\`text
C:\\ProgramData\\Devin\\rules\\*.md
C:\\ProgramData\\Windsurf\\rules\\*.md
\`\`\`

### What enterprise QA / platform teams should put here

- Data handling rules for regulated environments ("Do not copy production customer data into local fixtures").
- Approved package registries and browser image sources.
- Mandatory secret-scanning mindset for generated tests.
- Requirement to keep accessibility checks in critical journey tests when the org standard already exists.

Leave suite structure and framework style to workspace rules so product teams can still move. System rules set the floor; workspace rules set the house style.

### MDM and config management note

Docs explicitly expect IT/security to deploy and update system rules through standard org tooling (MDM, configuration management). QA platform engineers should partner with those teams rather than hand-editing ProgramData on developer laptops.

## Cross-Agent Portability Without Duplicating Policy Twice

Many QA organizations run Windsurf for some engineers and Cursor or Claude-based agents for others. You should not invent a third secret language. Instead, map concepts:

| Concept | Windsurf / Cascade | Cursor-oriented setup | Claude skills style |
| --- | --- | --- | --- |
| Always-on team law | \`always_on\` rules, root \`AGENTS.md\`, global rules | Project rules / AGENTS.md style docs | Skill descriptions that match tasks |
| Path-scoped law | Nested \`AGENTS.md\`, glob rules | Directory rules / globs | Skill with clear path guidance in body |
| Manual runbook | \`manual\` rules, Workflows | Manual rules / prompts | Skill invoked by description match |
| Local learned facts | Memories under \`~/.codeium/windsurf/memories/\` | Product-specific memory features | Prefer files in repo for durability |
| Multi-file procedures | Skills | Skills / multi-file prompts | \`SKILL.md\` packages |

When some engineers stay on Cursor, mirror the same non-negotiables into Cursor rules rather than inventing a second testing doctrine. When packaging multi-step QA procedures with scripts and templates, use SKILL.md-style skill packages (\`name\` and \`description\` frontmatter constraints, skill folder locations) so procedures travel across agents. On Windsurf, invest in Cascade Skills when Cascade needs supporting files, not only prose rules.

### Shared source of truth pattern

A practical multi-agent pattern used by mature QA platform teams:

1. Keep human-facing standards in the repo (\`docs/testing-standards.md\`).
2. Derive short Cascade rules that point to those docs and restate only the non-negotiables.
3. Mirror the non-negotiables into Cursor rules or AGENTS.md for engineers on other IDEs.
4. Publish optional deep playbooks as installable skills from qaskills.sh via the qaskills CLI for teams that want batteries-included Playwright or Cypress procedures.

Do not try to keep five divergent copies of a 3,000-line testing bible inside always-on prompts. Context windows punish that strategy.

## Operating Cascade Day to Day: Customizations UI, Workflows, and Skills

### Customizations entry points

Memories and Rules are available from the **Customizations** control in Cascade's top-right slider menu, and via product Settings in the bottom-right area (wording may show Devin/Windsurf branding depending on build). From the Rules panel you can create **+ Global** or **+ Workspace** rules. Edit memories by opening them and choosing **Edit**.

### Workflows for QA runbooks

Workflows are prompt templates for repeatable multi-step tasks, activated **manually** with a slash command of the form \`/workflow-name\`. They are a better home than always-on rules for:

- PR test review checklists
- Release smoke execution plans
- Flake bisect procedures
- Accessibility spot-check scripts in prose form

Keep Workflows imperative and ordered. Keep Rules declarative.

### Skills for heavier toolkits

Skills are multi-step procedures bundled with supporting files. Cascade can invoke them dynamically or via \`@mention\`. When your QA procedure needs golden templates (Page Object stubs, GitHub Actions snippets, seed data JSON), a Skill is a better container than a 12,000-character rule body. Rules should still state the constraints the Skill must obey.

## Debugging Cascade When Rules Seem Ignored

When Cascade "does not follow the Playwright rules," walk a deliberate checklist before rewriting everything.

### 1. Confirm discovery location

- Is the rule under \`.devin/rules/\` or fallback \`.windsurf/rules/\`?
- Did you create it in a nested workspace folder while Cascade is opened on a different root?
- For git monorepos, is the rule between the current workspace and the git root as documented?

### 2. Confirm activation mode

- Always-on rules should appear every time; if not, the file may be invalid or outside discovery paths.
- Glob rules only apply when matching files are read or edited. If you chat abstractly without touching \`*.spec.ts\`, a glob rule may not engage.
- Model-decision rules need a sharp \`description\`.
- Manual rules need an explicit \`@\` mention.

### 3. Confirm character limits and focus

- Trim files near 12,000 characters.
- Split mega-rules into topical files with selective triggers.
- Delete contradictions (one rule says "use CSS modules," another says "use Tailwind only" for the same paths).

### 4. Confirm Memories are not fighting Rules

Open Customizations -> Memories. An old local memory that says "we use Cypress" will sabotage a repo that migrated to Playwright. Delete or edit stale memories.

### 5. Confirm human prompts are not undoing policy

"Ignore the test guidelines and just hardcode a sleep" will often win over a soft rule. Strengthen critical constraints with always-on wording and team norms: reviewers reject PRs that violate the same standards Cascade is told to follow.

### 6. Validate with a forced probe

Ask Cascade: "Which workspace rules apply when editing \`e2e/checkout.spec.ts\`? Summarize selector policy." If the answer misses your glob rule, fix activation or paths before generating more tests.

## Team Rollout and Ownership for Windsurf QA Configuration

A compact rollout that works for automation teams:

1. **Inventory:** Screenshot Customizations from pilot users; delete secrets from memories; write a short \`global_rules.md\` under the 6,000-character cap.
2. **Flagship repo:** Add \`.devin/rules/\` with core standards, framework globs, and a \`model_decision\` flake policy; add nested \`AGENTS.md\` under the primary e2e folder.
3. **Rituals:** Encode PR review and flake triage as Workflows; convert heavy generators into Skills when supporting files help.
4. **Measure:** Sample sessions for suite-style match; if engineers still paste mega-prompts, rules are incomplete or undiscoverable. Enterprise teams then draft system-level rules with security partners.

| Asset | Owner | Review cadence |
| --- | --- | --- |
| System rules | Platform + security | Quarterly or on policy change |
| Global personal rules | Each engineer | When switching stacks |
| Workspace \`.devin/rules\` | Repo CODEOWNERS (QA platform) | Every major framework upgrade |
| Nested \`AGENTS.md\` | Suite owners | When suite structure changes |
| Memories | Individual engineer | Monthly cleanup |
| Workflows / Skills | QA platform | When runbooks change |

Operational loop on a checkout smoke: open the monorepo so always-on materials load; ask Cascade to add a Playwright test under \`e2e/\` so nested AGENTS.md and glob rules apply; keep flake policy out of context until intermittent failure appears; run a PR-test Workflow before opening a PR; promote any durable staging cookie fact from Memory into \`e2e/AGENTS.md\`. **Rules for law, AGENTS.md for locality, Workflows for rituals, Skills for kits, Memories for scratch context.**

## Configuration Reference Card

Keep this card near your onboarding doc:

\`\`\`yaml
# Conceptual reference (not a single real config file)
global_rules:
  path: ~/.codeium/windsurf/memories/global_rules.md
  activation: always_on
  limit_chars: 6000

workspace_rules_preferred:
  path: .devin/rules/*.md
  per_file_limit_chars: 12000
  triggers: [always_on, model_decision, glob, manual]

workspace_rules_legacy:
  path: .windsurf/rules/*.md
  also_legacy_root_file: .windsurfrules

agents_md:
  root: always_on
  nested: auto_glob for that directory tree
  names: [AGENTS.md, agents.md]

memories:
  storage: ~/.codeium/windsurf/memories/
  scope: per_workspace
  version_control: false
  credits: free_to_create_and_use_per_docs

enterprise_system_rules:
  macos: "/Library/Application Support/Devin/rules/*.md"
  linux: /etc/devin/rules/*.md
  windows: C:\\ProgramData\\Devin\\rules\\*.md
  legacy_windsurf_fallbacks: true
\`\`\`

Official product documentation for memories and rules is maintained with the Cascade desktop docs (Windsurf URLs currently redirect into the Devin Desktop documentation set). Start from the Cascade Memories & Rules page and the AGENTS.md page when verifying limits and paths against your installed version.

## Frequently Asked Questions

### Should QA teams rely on Cascade Memories for shared test standards?

No. Memories are workspace-local, stored under \`~/.codeium/windsurf/memories/\`, and are not committed to git. They are excellent for personal or ephemeral facts Cascade learns during work, and creating them does not consume credits per public docs. Shared standards (selector strategy, fixture ownership, flake policy, CI expectations) belong in workspace Rules under \`.devin/rules/\` or in \`AGENTS.md\` so every engineer and every new clone receives the same law. Use Memories as a temporary capture buffer, then promote durable knowledge into version-controlled files.

### What is the difference between always_on rules and a root AGENTS.md file?

Both are always present for Cascade, but they live in different authoring models. Workspace rules in \`.devin/rules/\` use frontmatter \`trigger\` values and can also be glob, model_decision, or manual. A root \`AGENTS.md\` is plain markdown without frontmatter and is treated as always-on by location. Nested \`AGENTS.md\` files auto-scope to their directory tree. Prefer root AGENTS.md for simple project-wide notes and directory AGENTS.md for suite boundaries; prefer explicit Rules when you need activation control, descriptions for model decision, or manual @invocation.

### How should we migrate from a single .windsurfrules file?

Treat \`.windsurfrules\` as legacy input that Cascade may still read, then split its numbered list into topical markdown files under \`.devin/rules/\` (preferred) with appropriate \`trigger\` values. Put universal constraints in \`always_on\`, file-type conventions in \`glob\`, situational policies in \`model_decision\`, and rare ops runbooks in \`manual\`. Verify discovery in Customizations -> Rules, exercise a probe prompt against a real spec path, and only then archive the root legacy file so you do not maintain two sources of truth.

### How do Windsurf rules relate to Cursor rules and SKILL.md packages?

They solve the same organizational problem (durable agent instructions) with different packaging. Windsurf emphasizes Cascade Rules, Memories, AGENTS.md, Workflows, and Skills, with documented paths such as \`global_rules.md\` and \`.devin/rules/\`. Cursor-oriented teams use their own rules layouts and often AGENTS.md-style files. Claude-style skills package procedures in \`SKILL.md\` with name and description frontmatter for progressive disclosure. Keep human standards in the repo once, project short agent-facing rules per tool, and use installable QA skills from qaskills.sh when you want shared playbooks without reinventing every Page Object scaffold.
`,
};
