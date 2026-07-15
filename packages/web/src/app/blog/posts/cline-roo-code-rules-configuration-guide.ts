import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cline and Roo Code Rules: Configuration Guide for Test Automation',
  description: 'Configure Cline rules and Roo Code modes for test automation: .clinerules, conditional paths, .roomodes, fileRegex, and QA-safe agent guardrails.',
  date: '2026-07-15',
  category: 'Guide',
  content: `
# Cline and Roo Code Rules: Configuration Guide for Test Automation

When a flaky checkout suite lands in your inbox at 9 a.m., the last thing you want is an AI coding agent rewriting production handlers while you only asked for a Playwright locator fix. Cline and Roo Code both solve that problem with **rules**: persistent markdown (and YAML mode configs) that shape every task without re-pasting the same QA constraints into chat. This guide is written for QA and test-automation engineers who already open tickets in Jira, own CI flakes, and now need agents that respect test boundaries, fixture patterns, and review gates.

You will leave with a map of where rules live, how Cline conditionals differ from Roo mode groups, copy-paste layouts for Playwright and API suites, and a decision matrix for rules versus skills versus prompts. For day-to-day Cline usage as a tester, see the [Cline QA engineers complete guide](/blog/cline-qa-engineers-complete-guide). For skill catalogs beside these rules, see [QA skills for Cline in 2026](/blog/qa-skills-for-cline-2026). Ready-made QA skills can also be installed from qaskills.sh with the qaskills CLI when you want reusable playbooks instead of reinventing every instruction file.

## How Cline and Roo Code Treat Rules Differently in a Test Repo

Cline treats rules primarily as **always-available or path-conditional markdown** that the agent merges into context. The primary format is a project directory named \`.clinerules/\` filled with \`.md\` or \`.txt\` files. Cline also detects other rule sources (including \`AGENTS.md\`, Cursor-style \`.cursorrules\`, and Windsurf-style \`.windsurfrules\`) and surfaces them in a Rules panel where you can toggle files on or off. Global personal rules live outside the repo (on macOS and Linux, commonly under \`~/Documents/Cline/Rules\`). When workspace and global rules conflict, workspace wins. That model fits QA work well: put team standards in git, keep personal tone or keyboard preferences global, and toggle the "strict coverage" rule off only when you are prototyping.

Roo Code grew out of the same agentic-editor lineage but centers **modes**. Built-in modes such as Code, Architect, Ask, Debug, and Orchestrator each carry a role definition, tool groups, and optional custom instructions. You can override those modes or add custom ones (for example a "Test Engineer" mode) in project \`.roomodes\` or global mode configuration. Instructions can also live in \`.roo/rules/\` (workspace-wide) and \`.roo/rules-{modeSlug}/\` (mode-specific). Older single-file patterns such as \`.roorules-{modeSlug}\` and legacy \`.clinerules-{modeSlug}\` still exist as fallbacks; prefer the directory layout for new QA monorepos.

In practice:

- Use **Cline rules** when you want path-aware, toggleable markdown that follows whoever is editing \`*.spec.ts\` or \`tests/api/**\`.
- Use **Roo modes + rule dirs** when you want hard tool boundaries (read-only review, Markdown-only docs mode, edit restricted by \`fileRegex\`) and sticky model choices per mode.
- Many QA teams run both extensions across a year of tooling churn. Keep the *content* of standards aligned even if the file paths differ, so a "never touch \`src/payments\` from a test task" rule does not silently disappear when someone switches agents.

## Mapping the Configuration Surfaces You Actually Touch

Before writing prose into rule files, inventory the surfaces that can inject instructions into the agent. Mixing them without a plan causes double constraints, token bloat, and mysterious overrides.

| Surface | Typical location | Scope | Best use in a test org |
| --- | --- | --- | --- |
| Cline workspace rules | \`.clinerules/*.md\` | Current repo (versioned) | Shared Playwright/API standards, CI commands, forbidden paths |
| Cline global rules | \`~/Documents/Cline/Rules\` (see Cline docs for OS variants) | All projects for one user | Personal prefs (verbosity, commit style), not team policy |
| Cline conditional frontmatter | YAML \`paths:\` on a rule file | Only when context matches globs | Test-only rules that must not pollute app-code tasks |
| Roo project modes | \`.roomodes\` (YAML or JSON) | Current workspace | Custom "qa-author", "flake-triage", restricted edit groups |
| Roo mode rule dirs | \`.roo/rules-{slug}/\` | Active when that mode is selected | Long mode playbooks without stuffing YAML strings |
| Roo workspace rules | \`.roo/rules/\` | All modes in project | Cross-mode invariants (secrets, data isolation) |
| AGENTS.md | Repo root or nearest folder; global \`~/.agents/AGENTS.md\` | Cross-tool standard | Thin shared contract when multiple agents touch the same tree |
| Skills (separate from rules) | Tool-specific skill directories | On-demand specialized workflows | Multi-step procedures you invoke, not always-on policy |

Official references worth bookmarking:

- Cline rules: https://docs.cline.bot/customization/cline-rules
- Roo custom modes: https://docs.roocode.com/features/custom-modes (redirects to the current hosted docs)
- Agents standard: https://agents.md/

Treat rules as **policy**. Treat skills as **procedures**. Treat chat prompts as **ticket context**. If a sentence starts with "always" or "never" for the whole team, it belongs in rules. If it is a 12-step flake triage ritual, package it as a skill. If it is ticket ABC-441 "fix mobile Safari scroll flakiness", leave it in the prompt.

## Building a Cline Rules Pack for Playwright and API Suites

Start with a small \`.clinerules/\` pack that every test task loads. Prefer several short files over one novel. Cline combines all \`.md\` and \`.txt\` files in the directory; optional numeric prefixes (\`01-\`, \`02-\`) only help humans sort filenames.

Example layout:

\`\`\`text
your-qa-repo/
├── .clinerules/
│   ├── 01-repo-map.md
│   ├── 02-playwright-conventions.md
│   ├── 03-api-contract-tests.md
│   ├── 04-ci-and-secrets.md
│   └── 05-forbidden-surfaces.md
├── tests/
│   ├── e2e/
│   └── api/
└── package.json
\`\`\`

### Repo map file

Agents fail QA tasks when they invent folder names. Point them at real paths and real commands that already exist in your README or package scripts. Do not invent CLI flags that are not in your project.

\`\`\`markdown
# Repo map for automated testing

## Source of truth
- Product code lives under \`src/\`. Prefer not to change it unless the task explicitly requires a production fix.
- Playwright tests live under \`tests/e2e/\`. Shared fixtures live under \`tests/e2e/fixtures/\`.
- API contract tests live under \`tests/api/\`.
- CI workflow definitions live under \`.github/workflows/\`.

## Preferred commands (use package scripts only)
- Unit: \`npm test\`
- E2E smoke: \`npm run test:e2e:smoke\`
- API contracts: \`npm run test:api\`
- Typecheck: \`npm run typecheck\`

## Output expectations
- Prefer small, reviewable diffs.
- After changing tests, run the narrowest package script that covers the change.
- Summarize what you ran and what failed before proposing more edits.
\`\`\`

### Playwright conventions file

Ground rules in patterns your suite already uses: Page Object files, test IDs, network wait strategies, and data factories. Vague advice ("write good tests") burns tokens without changing behavior.

\`\`\`markdown
# Playwright conventions

## Structure
- One user journey per test file when possible.
- Page objects in \`tests/e2e/pages/\`; tests import them instead of raw selectors.
- Prefer \`getByRole\` and \`getByTestId\` over brittle CSS chains.

## Stability
- Wait for network idle only when the product genuinely requires it; prefer waiting on specific responses or UI state.
- Do not add arbitrary \`waitForTimeout\` sleeps.
- Capture traces/screenshots according to existing Playwright config; do not invent new reporter names.

## Data
- Use factories in \`tests/e2e/fixtures/\` for users and carts.
- Never hardcode production credentials. Read from env vars already documented in \`.env.example\`.
- Tear down mutable data in \`afterEach\`/\`afterAll\` when the suite creates it.
\`\`\`

### API contract and secrets files

API rules should name contract formats you actually use (OpenAPI snapshots, Pact, custom schema asserts) without claiming a framework you do not run.

\`\`\`markdown
# API contract tests

- Place new contract tests next to the existing suite under \`tests/api/\`.
- Assert status codes and response schema; avoid logging full response bodies that may contain PII.
- Prefer deterministic fixtures over live third-party sandboxes when both exist.
- If a base URL is required, use the env var already referenced in CI, not a hard-coded host.
\`\`\`

\`\`\`markdown
# CI and secrets

- Never commit \`.env\`, tokens, or cookie jars.
- Do not print secrets in test output or agent summaries.
- When editing workflows under \`.github/workflows/\`, preserve existing secret names; do not invent new GitHub Actions secret keys.
- Prefer reusing existing cache and artifact steps instead of adding parallel, redundant jobs.
\`\`\`

### Forbidden surfaces

QA agents often "helpfully" refactor payment code while fixing a selector. Put explicit denials in a dedicated file so they stay easy to audit in PRs.

\`\`\`markdown
# Forbidden surfaces for default test tasks

Unless the human prompt explicitly authorizes production changes:
- Do not edit \`src/payments/\`, \`src/billing/\`, or infrastructure Terraform.
- Do not change authentication middleware.
- Do not relax security headers or CSP to make a test pass.
- Do not disable failing tests with \`.skip\` without stating the ticket id and a follow-up plan in the PR description.
\`\`\`

Commit this pack. Ask every new hire to open the Cline Rules panel and confirm toggles. If someone needs a temporary exception (for example, a spike that *must* touch billing), they toggle \`05-forbidden-surfaces.md\` off for that task rather than rewriting history.

## Conditional Cline Rules That Only Fire on Test Paths

Always-on rules consume context even when you are renaming a React component. Cline **conditional rules** use YAML frontmatter with a \`paths\` array of globs. When open tabs, @-mentioned paths, or files the agent is editing match, the rule activates; otherwise it stays out of the prompt. Cline documents this under conditional rules on https://docs.cline.bot/customization/cline-rules.

Rules without frontmatter stay always active. An empty \`paths: []\` never activates (useful as a soft disable). Invalid YAML fails open (rule still loads, raw frontmatter visible) so you notice parse errors.

Example: Playwright-only standards.

\`\`\`yaml
---
paths:
  - "tests/e2e/**"
  - "**/*.spec.ts"
  - "playwright.config.ts"
---

# Playwright path-scoped rules

- Prefer Page Objects under tests/e2e/pages/.
- Do not introduce new global hooks without updating the shared fixture module.
- Keep selectors in page objects, not in the test body, when a locator is reused.
- When a test is flaky, capture evidence (trace, screenshot) before rewriting business logic.
\`\`\`

Example: API-only standards.

\`\`\`yaml
---
paths:
  - "tests/api/**"
  - "**/openapi/**"
  - "**/*contract*.ts"
---

# API test path-scoped rules

- Validate JSON schema or type guards already used in this repo.
- Prefer idempotent setup; avoid tests that require manual DB cleanup between runs.
- Document required env vars in the PR if a new variable is introduced.
\`\`\`

Example: production app code stays under different constraints so a test fix does not drag UI rules into API work.

\`\`\`yaml
---
paths:
  - "src/components/**"
  - "src/pages/**"
---

# UI application rules (not for pure test tasks)

- Match existing component library patterns.
- Do not add new design-system primitives in a bugfix unless requested.
\`\`\`

### Operational tips for QA leads

1. **Mention real paths in prompts.** "Update \`tests/e2e/checkout.spec.ts\`" triggers path rules more reliably than "fix checkout flakiness".
2. **Keep universal safety always-on.** Secrets, license headers, and "do not skip tests silently" belong in files without \`paths\`.
3. **Test globs with a dummy rule.** A one-line "TEST: e2e rule active" body plus the activation notification teaches the team which patterns match.
4. **Combine with toggles.** Conditionals and the Rules panel toggles stack: a toggled-off conditional never fires even when paths match.

### Comparison: always-on vs conditional vs mode-scoped (Roo)

| Mechanism | Loads when | Strength for QA | Weakness |
| --- | --- | --- | --- |
| Cline always-on \`.clinerules\` file | Every Cline task in the workspace | Safety rails, repo map, secrets | Token cost if files grow large |
| Cline \`paths\` conditional | Context files match globs | Playwright rules stay out of backend refactors | Depends on paths appearing in context |
| Roo \`.roo/rules/\` | Any mode in that project | Cross-mode invariants | Not path-conditional by itself |
| Roo \`.roo/rules-{slug}/\` | Selected mode only | Different playbooks for Architect vs Code vs custom QA mode | Requires engineers to switch modes deliberately |
| Roo \`groups\` + \`fileRegex\` | Mode config | Hard edit bans (Markdown-only, tests-only) | Regex mistakes block legitimate edits |

## Roo Mode Slugs, Groups, and fileRegex for Safer Test Generation

Roo Code custom modes are defined with properties such as \`slug\`, \`name\`, \`description\`, \`roleDefinition\`, \`groups\`, optional \`whenToUse\`, and optional \`customInstructions\`. Project modes live in \`.roomodes\`; global modes live in the editor's custom modes settings file (YAML preferred). Documented tool group strings include \`read\`, \`edit\`, \`command\`, and \`mcp\`. The edit group can be restricted with a \`fileRegex\` so a "Test Author" mode can change tests but not arbitrary production files.

Here is a project-level custom mode aimed at QA authors. Adjust regexes to your real extensions (\`spec.ts\`, \`test.ts\`, feature files, and so on).

\`\`\`yaml
customModes:
  - slug: qa-author
    name: QA Author
    description: Writes and repairs automated tests with minimal production edits.
    roleDefinition: >-
      You are a senior test automation engineer. You design reliable automated
      tests, prefer deterministic fixtures, and explain flake root causes clearly.
      You change production code only when a defect is proven and the human asked
      for a fix.
    whenToUse: >-
      Use when creating or updating automated tests, diagnosing CI failures in
      test jobs, or improving fixtures and page objects.
    customInstructions: |-
      Prefer the smallest diff that restores green CI.
      Never delete assertions to silence failures.
      When you must change production code, isolate it in a separate commit message suggestion.
    groups:
      - read
      - command
      - mcp
      - - edit
        - fileRegex: (?i)(tests?/|__tests__/|fixtures?/|.*\\.(spec|test)\\.(ts|tsx|js|jsx)$|playwright\\.config\\.(ts|js)$)
          description: Test code, fixtures, and Playwright config only
\`\`\`

Notes that prevent silent misconfiguration:

- **Slug pattern** must match the documented identifier rules (letters, numbers, hyphens). The slug also names \`.roo/rules-qa-author/\`.
- **YAML vs JSON escaping differs.** In JSON, backslashes in \`fileRegex\` are double-escaped. In YAML you often write single backslashes; validate before committing.
- **Project \`.roomodes\` fully overrides** a global mode with the same slug. Properties do not deep-merge. If the project mode omits \`command\`, the agent will not inherit command access from global.
- **Export/import** from the Modes UI packages mode YAML plus associated rules files for sharing across teams.

A stricter **read-only review** mode helps PR review without risking edits:

\`\`\`yaml
customModes:
  - slug: qa-review
    name: QA Review
    description: Read-only review of tests and risk notes for pull requests.
    roleDefinition: >-
      You are a QA reviewer. You identify missing assertions, brittle selectors,
      data leaks, and flaky patterns. You suggest patches as unified diffs in chat
      but do not apply edits yourself.
    whenToUse: Use for pull request test review and risk assessment.
    customInstructions: |-
      Structure feedback as: severity, file, problem, suggested fix.
      Call out missing negative-path coverage for auth and payments.
    groups:
      - read
\`\`\`

Pair sticky models with modes: use a stronger model for Architect-style test design and a cheaper model for mechanical locator renames in \`qa-author\`. Roo remembers the last model per mode so you are not re-picking from a dropdown all day.

## Mode-Specific Rule Directories for Architect, Code, and a Custom QA Mode

Inline \`customInstructions\` strings are fine for a paragraph. Multi-page QA playbooks belong in directories. Roo's preferred layout is:

\`\`\`text
.roo/
├── rules/                      # applies across modes in this project
│   └── 00-security-and-data.md
├── rules-architect/
│   └── test-strategy.md
├── rules-code/
│   └── implementation-guardrails.md
└── rules-qa-author/
    ├── 01-playwright.md
    ├── 02-api-tests.md
    └── 03-ci-triage.md
\`\`\`

Fallback single files (\`.roorules-qa-author\`) load only when the directory is missing or empty. Legacy \`.clinerules-{modeSlug}\` remains a compatibility path; do not invent new workflows around it.

Example content for Architect mode when the task is designing a test plan (not writing code yet):

\`\`\`markdown
# Architect guidance for test strategy

- Start from risk: auth, payments, data deletion, and multi-tenant isolation first.
- Propose a test pyramid with rough counts (unit / API / e2e) before listing cases.
- Prefer API-level coverage for business rules; reserve e2e for critical user journeys.
- Call out environments (dev, staging) and data dependencies explicitly.
- Do not generate full Playwright code in Architect mode; hand off implementation notes for Code or qa-author.
\`\`\`

Example content for Code mode when production fixes are allowed:

\`\`\`markdown
# Code mode guardrails when tests revealed a defect

- Reproduce with a failing test first when feasible.
- Keep production fixes minimal; avoid drive-by refactors.
- Update or add tests in the same change set when behavior changes.
- Do not weaken tests to match buggy behavior.
\`\`\`

### Built-in mode overrides

You can override the built-in \`code\` slug in \`.roomodes\` to restrict edits to TypeScript test files in a pure QA repository, or to Python files in a pytest monorepo. Because overrides replace the entire mode definition at that scope, copy the behaviors you still need (read, command, mcp) into the override rather than assuming defaults remain.

### Sharing modes across the QA org

1. Export the mode from one machine (includes rules files when present).
2. Review the YAML in git (store a \`modes/qa-author.yaml\` artifact if your process requires audit).
3. Import as **project** for repo-specific policy or **global** for personal productivity modes.
4. Document required MCP servers separately; mode \`groups\` may allow \`mcp\`, but servers still need configuration in the tool's MCP settings.

## Global vs Workspace Precedence When Agents Disagree

Misunderstanding precedence is the top cause of "but it works on my machine" agent behavior.

### Cline precedence (rules content)

- Workspace \`.clinerules/\` combines with global Documents/Cline Rules.
- On conflict, **workspace wins**.
- Toggles can disable individual files for a session without deleting them.
- Multi-root workspaces: Cline documents that rules apply from the **primary** workspace folder; put shared rules there or rely on global rules.

### Roo precedence (modes)

Documented order:

1. Project \`.roomodes\`
2. Global custom modes
3. Built-in defaults

Same slug at project level replaces the global definition entirely. For instruction files, \`.roo/rules-{slug}/\` beats \`.roorules-{slug}\` when the directory has files.

### Practical QA policy

| Policy item | Put it here | Why |
| --- | --- | --- |
| "Never commit secrets" | Workspace always-on rules + \`.roo/rules/\` | Must apply to every teammate and every mode |
| "Use our Page Object folder layout" | Workspace Cline rules + \`.roo/rules-qa-author/\` | Team standard, versioned |
| "I prefer terse bullet summaries" | Cline global rules | Personal, not for PRs |
| "Payments tests may edit \`src/payments\`" | Prompt or temporary toggle, not a permanent global | High risk; keep exceptional |
| "Review mode is read-only" | Roo \`qa-review\` groups: \`read\` only | Enforced by tool permissions, not just prose |

When Cline and Roo are both installed, **do not assume they share one rules engine**. Duplicating the same paragraph in both systems is acceptable for critical safety lines. For long style guides, keep a single markdown source in \`docs/qa/agent-standards.md\` and keep agent rule files short with "follow docs/qa/agent-standards.md" plus the non-negotiables inlined (agents sometimes under-follow remote links).

## Decision Matrix: When to Put a Constraint in Rules vs Skills vs Prompts

Rules are not a dumping ground. Overstuffed rules increase cost and reduce compliance as models deprioritize middle content.

| Signal | Use rules | Use a skill | Use the chat prompt |
| --- | --- | --- | --- |
| Applies to most tasks in the repo | Yes | No | No |
| Multi-step procedure (triage flake, generate page object, map OpenAPI to tests) | Light pointer only | Yes | Optional ticket ids |
| One ticket's acceptance criteria | No | No | Yes |
| Hard safety boundary (no secrets, no \`.skip\` without ticket) | Yes | Reinforce | Repeat for emphasis on risky tasks |
| Needs files, templates, or scripts bundled | Rarely | Yes (skills can bundle) | Attach files as needed |
| Path-specific guidance | Cline conditionals or Roo mode switch | Skill with clear trigger description | @ mention files |
| Experiment lasting one afternoon | Toggle or local uncommitted rule | Spike skill | Yes |

A healthy split for a mid-size QA team:

- **~1–3 KB** of always-on rules (safety + repo map + commands).
- **Conditional or mode-specific** files for Playwright vs API vs mobile.
- **Skills** for repeatable jobs: "convert HAR to Playwright", "add accessibility checks", "diagnose flaky beforeAll". Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI, then tuned to your paths.
- **Prompts** that paste the ticket, environment, and failing CI log excerpt.

## Wiring AGENTS.md Alongside Cline and Roo Without Double-Counting Intent

[AGENTS.md](https://agents.md/) is a cross-tool convention for agent instructions, with nearest-file-wins behavior in trees that use nested files. Cline explicitly lists \`AGENTS.md\` and \`~/.agents/AGENTS.md\` among supported rule sources. Roo-oriented workflows often still benefit from a root \`AGENTS.md\` so other tools (and future hires' editors) see the same contract.

Recommended thin root file for a test-heavy monorepo:

\`\`\`markdown
# AGENTS.md

## Project
This repository's primary automation is end-to-end and API testing.

## Commands
- \`npm run test:e2e:smoke\`
- \`npm run test:api\`
- \`npm run typecheck\`

## Non-negotiables
- Do not commit secrets.
- Do not skip failing tests without a ticket reference.
- Prefer editing tests and fixtures unless production code is in scope.

## Detailed standards
See \`.clinerules/\` for Cline and \`.roo/rules-qa-author/\` for Roo QA mode.
\`\`\`

Avoid pasting the entire Playwright style guide into both \`AGENTS.md\` and \`.clinerules/02-playwright-conventions.md\`. Pick one verbose home. Use AGENTS.md as the portable summary; use tool-native rules for depth and conditionals.

If you also maintain \`.github/copilot-instructions.md\` or \`.github/instructions/*.instructions.md\` with \`applyTo\` frontmatter for Copilot, keep the same non-negotiables in sync. Path-filter syntax differs by tool; do not assume Cline \`paths\` globs and Copilot \`applyTo\` patterns are interchangeable without reading each product's docs.

## Failure Patterns QA Teams Hit When Rules Are Too Loose or Too Heavy

### 1. The agent "fixes" flakes by deleting assertions

**Symptom:** CI goes green; product regressions ship.

**Fix:** Always-on rule forbidding assertion removal or \`.skip\` without ticket id; Roo \`qa-review\` read-only pass before merge; require the agent to paste the failing assertion name in the summary.

### 2. Rules mention commands that do not exist

**Symptom:** Agent invents \`npm run e2e:all:strict\` and loops.

**Fix:** Only document scripts present in \`package.json\`. Re-read rules when scripts rename. Prefer "run the package script named X" over free-form CLI essays.

### 3. Conditional rules never fire

**Symptom:** Playwright standards ignored during e2e work.

**Fix:** Check globs against real paths (\`tests/e2e\` vs \`e2e\`). Ensure the rule is toggled on. Put file paths in the human prompt. Confirm frontmatter uses closed \`---\` fences.

### 4. Conditional rules fire too often

**Symptom:** Open \`README.md\` causes docs rules to dominate a backend task (if your globs include \`**/*.md\`).

**Fix:** Narrow globs. Move universal content out of path-scoped files. Close unrelated tabs when starting a focused agent task.

### 5. Roo mode regex blocks legitimate fixture edits

**Symptom:** \`FileRestrictionError\` when editing \`tests/e2e/fixtures/user.json\`.

**Fix:** Extend \`fileRegex\` to include fixtures and config files you truly own. Keep production paths excluded. Test regexes on a list of sample paths before rolling out org-wide.

### 6. Global personal rules override team expectations (Cline)

**Symptom:** One engineer always gets different structure because global verbosity rules fight workspace templates.

**Fix:** Teach precedence (workspace wins on conflict) but still minimize conflicting globals. Code review the \`.clinerules\` pack; treat globals as non-authoritative for team format.

### 7. Multi-root monorepo only loads primary folder rules (Cline)

**Symptom:** Package B tests ignore standards living in package B's folder when package A is primary.

**Fix:** Per Cline multi-root notes, place shared rules in the primary workspace or use global rules; or open the package as a single-root window for agent sessions.

### 8. Token bloat from pasting entire style guides

**Symptom:** Shorter tasks degrade; agent misses a critical "never" buried in paragraph 40.

**Fix:** Split files, prefer bullets, link to long docs, keep absolute bans at the top of always-on files.

## A Reference Layout for a Multi-Package Test Monorepo

The following layout is a concrete target for a monorepo with app code, Playwright, and API tests. Adapt names to your repository; keep the separation of concerns.

\`\`\`text
monorepo/
├── AGENTS.md
├── .clinerules/
│   ├── 00-safety.md                 # always-on
│   ├── 01-repo-map.md               # always-on
│   ├── playwright.md                # conditional paths
│   └── api-tests.md                 # conditional paths
├── .roo/
│   ├── rules/
│   │   └── 00-safety.md
│   ├── rules-architect/
│   │   └── test-strategy.md
│   └── rules-qa-author/
│       ├── playwright.md
│       └── api-tests.md
├── .roomodes                        # qa-author, qa-review definitions
├── apps/
│   └── web/src/
├── packages/
│   └── test-kit/
├── tests/
│   ├── e2e/
│   └── api/
└── .github/
    └── workflows/
\`\`\`

### Sample always-on safety file (shared wording)

Keep this short enough that every engineer reads it once:

\`\`\`markdown
# Safety rails

- Never commit secrets, tokens, or production data dumps.
- Never weaken TLS, auth, or authorization checks to make a test pass.
- Never mark failing tests skipped without a ticket id and owner.
- Prefer additive test coverage over deleting edge-case assertions.
- State commands you ran and their exit status in your final summary.
\`\`\`

### Sample conditional Playwright frontmatter (Cline)

\`\`\`yaml
---
paths:
  - "tests/e2e/**"
  - "packages/test-kit/**"
  - "**/*.spec.ts"
---

# Playwright monorepo notes

- Shared helpers live in packages/test-kit; do not copy-paste helpers into each app.
- App-specific page objects live with that app's e2e tree when present.
- Coordinate fixture changes with API tests if they share user factories.
\`\`\`

### Workflow: flake arrives in Slack

1. Switch Roo to \`qa-author\` (or enable Cline Playwright conditional by opening the failing spec).
2. Paste CI log tail + job URL in the prompt; @ mention the failing file path.
3. Allow the agent to run only the documented smoke or file-level script.
4. Require a root-cause note (timing, isolation, environment) before approving locator spam.
5. Run \`qa-review\` mode (read-only) for a second pass on assertion quality.
6. Merge only when rules-compliant: no secret leakage, no silent skips, minimal diff.

### Workflow: new feature needs tests

1. Architect mode (Roo) or a plan-first Cline session produces risk-ranked cases.
2. \`qa-author\` implements API tests first for business rules, then a thin e2e path.
3. Rules block editing unrelated packages via \`fileRegex\` and forbidden-surface markdown.
4. Human reviews with the same checklist encoded in \`qa-review\` instructions.

### Measuring whether rules work

Track leading indicators for a month: share of agent PRs that touch forbidden paths, average files changed per flake ticket, CI loops that invent non-existent scripts, and review comments about silent test skips. All four should improve if rules are short, accurate, and enforced.

If metrics stall, rules are ignored (too long, wrong tool, toggled off) or unenforceable (prose without Roo group restrictions). Tighten tool groups on high-risk repos, shorten markdown, and point to good page-object examples by path instead of essays.

### Cross-linking with skills and broader Cline practice

Rules encode what *not* to do and which house standards apply. Skills teach multi-step *how*. After \`.clinerules\` stabilizes, add skills for weekly procedures. The [Cline QA engineers complete guide](/blog/cline-qa-engineers-complete-guide) and [QA skills for Cline in 2026](/blog/qa-skills-for-cline-2026) cover day-to-day usage and skill packaging so this guide can stay on rules, modes, globs, and precedence.


## Migrating From Chat-Only Custom Instructions to Versioned Rules

Many QA teams begin with sticky-note prompts: "use our page objects", "run smoke only", "do not touch billing". That works for one engineer for one week. It fails when contractors join a release train and each pastes a different half-remembered version into Cline or Roo.

### Migration steps that keep CI green

1. **Harvest** recent agent chats that produced good PRs. Copy recurring constraints; discard one-off ticket details.
2. **Split** into always-on safety, repo map, and path- or mode-specific files. If a sentence only matters for Playwright, it is not always-on.
3. **Delete lies.** Remove every command, folder, or env var that is not true on the default branch. Agents amplify stale docs faster than humans do.
4. **Land the pack in a dedicated PR** reviewed by the owners of test standards. Rules are production code for your AI workforce.
5. **Pilot one squad** for a sprint. If the agent repeatedly violates a rule, the rule is unclear, missing an example, or unenforceable without Roo groups.
6. **Only then** add Cline conditionals, custom Roo modes, and exportable YAML for other repos.

### What not to migrate

- Personal tone preferences that annoy teammates when applied org-wide.
- Experimental model temperature notes (keep those in user settings).
- Entire copies of your human QA handbook. Agents need executable constraints, not a training course.

### Example before and after for a flake ticket prompt

Before (everything jammed into chat):

\`\`\`text
You are a QA engineer. Never commit secrets. Tests are in tests/e2e.
Use page objects. Run npm run test:e2e:smoke. Fix checkout flakiness
on mobile Safari. Do not edit payments. Here is the log: ...
\`\`\`

After (rules carry policy; prompt carries the ticket):

\`\`\`text
Failing test: tests/e2e/checkout.spec.ts
CI job: e2e-smoke on main @ 2026-07-14
Symptom: intermittent timeout on place-order button after promo apply.
Environment: staging, mobile Safari project in Playwright.
Please find root cause and propose the smallest test-side fix first.
\`\`\`

The second prompt is shorter, easier to reuse as a template, and less likely to drift from team policy because policy lives in git.

## Coordinating MCP Tools With Rules for Test Observability

Both Cline and Roo can expose MCP servers when configured. Mode \`groups\` in Roo may include \`mcp\` so a custom QA mode can call approved tools. Rules should state **how** those tools may be used during test work, without inventing server names your org does not run.

### Policy lines that belong in always-on rules

- Only use MCP servers already configured for this workspace; do not invent endpoints.
- Prefer reading CI logs and traces through approved tools rather than scraping arbitrary internal URLs.
- Never send production customer payloads to third-party MCP services.
- If a tool returns secrets or session tokens, do not echo them into the PR description.

### Policy lines that belong in mode-specific or conditional rules

- During \`qa-review\`, prefer read-only MCP capabilities; do not trigger deployments.
- During flake triage, attach trace or screenshot artifacts already produced by Playwright config rather than re-running the full suite by default.
- When contract tests fail, consult the existing OpenAPI or schema source of truth via the repo filesystem first, then external tools.

### Keeping rules honest about MCP

If your team has not configured MCP, do not write rules that assume it. Empty promises cause agents to stall looking for tools. A single sentence is enough: "MCP is optional in this repo; default to local package scripts and filesystem reads." When you later add a browser or issue tracker MCP server, extend the rules in the same PR that documents the server configuration for humans.

Public MCP SDK docs describe building servers with packages such as \`@modelcontextprotocol/sdk\` (\`McpServer\`, tool registration, stdio transport). Most QA orgs should consume existing servers first; author new ones only when platform teams own that work.

## Frequently Asked Questions

### Where should a new QA team put their first Cline rule file?

Create \`.clinerules/\` at the repository root and add a short always-on safety file plus a repo map that lists real test directories and package scripts. Commit those files so every clone behaves the same. Add conditional Playwright or API files only after the basics stop agents from inventing commands or committing secrets. Use the Cline Rules panel to confirm both files appear and are toggled on before measuring impact on your first agent-assisted PR.

### How do Roo \`fileRegex\` restrictions differ from Cline path conditionals?

Cline path conditionals control **when rule text enters context** based on globs and open or mentioned files. Roo \`fileRegex\` on the edit group controls **whether the mode is allowed to modify matching paths** regardless of how much advisory text is present. Use Cline conditionals to keep Playwright advice out of unrelated tasks. Use Roo \`fileRegex\` when you need a hard stop against editing production code during test-authoring modes. Many teams deploy both for defense in depth.

### Can we share one rule pack between Cline and Roo without duplication?

Share the ideas, not necessarily one file path. Keep non-negotiables identical in wording inside \`.clinerules/\` and \`.roo/rules/\` (or mode rule dirs), and point both at a single longer doc under \`docs/\` for style detail. Cline will not automatically read \`.roo/rules-qa-author/\` as its primary format, and Roo modes will not replace a proper \`.roomodes\` tool group configuration. Treat duplication of a ten-line safety file as cheap insurance; treat duplication of a 500-line guide as a maintenance bug.

### What is the fastest safe setup before a regression week?

In one hour: add always-on safety and repo-map rules for Cline; add a \`qa-author\` mode with edit restricted to test paths and a \`qa-review\` read-only mode for Roo; document two or three real npm scripts only. Defer elaborate conditional matrices and custom Orchestrator flows until after regression week. The goal is preventing secret leaks, skipped tests, and production edits while the team is under time pressure, not perfect taxonomy. Expand conditionals once the fire drill ends and you can review globs carefully.
`,
};
