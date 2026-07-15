import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'GEMINI.md Configuration Guide: Customizing Gemini CLI for Testing Workflows',
  description: 'Configure Gemini CLI with GEMINI.md for QA workflows: hierarchy, imports, settings.json context.fileName, and test-automation rules that stick.',
  date: '2026-07-15',
  category: 'Guide',
  content: `
# GEMINI.md Configuration Guide: Customizing Gemini CLI for Testing Workflows

Open a Playwright monorepo, run Gemini CLI, and glance at the footer. That small number next to the context indicator is not decoration. It is how many instructional files the CLI loaded before your first keystroke. For QA engineers, that number is often the difference between an agent that invents flaky selectors and one that mirrors your page-object conventions, wait strategies, and CI gate rules.

This guide treats \`GEMINI.md\` as infrastructure for test automation teams: where files live, how hierarchical load order works, how to modularize rules with imports, how \`settings.json\` can point Gemini at \`AGENTS.md\`, and how to encode concrete testing workflows without inventing configuration that does not exist in public docs. Official reference material lives at https://geminicli.com/docs/cli/gemini-md/ and https://geminicli.com/docs/reference/configuration/.

## What GEMINI.md Actually Loads Into Every Prompt

Gemini CLI uses context files (default name \`GEMINI.md\`) to inject standing instructions into the model on every turn. Instead of pasting "we use Playwright, never hard wait, always use data-testid" into each chat, you write it once and let the CLI concatenate matching files into hierarchical memory.

Three load layers matter for test repos:

1. **Global context** at \`~/.gemini/GEMINI.md\`. Personal defaults for every project on your machine: preferred assertion style, how you want failure summaries formatted, your default language for commit messages on test-only PRs.
2. **Workspace and parent context**. The CLI searches configured workspace directories and parents for \`GEMINI.md\`. Repo-root files become the shared QA constitution: stack choices, forbidden patterns, reporting expectations.
3. **Just-in-time (JIT) context**. When a tool opens a file or directory, the CLI scans that path and ancestors (up to a trusted root) for additional \`GEMINI.md\` files. Package-level instructions under \`packages/checkout-e2e/\` or \`tests/api/\` can surface only when the agent actually works there.

The footer shows how many context files are active. If you expected three and see one, something in discovery or ignore rules is wrong. Use \`/memory show\` to inspect the concatenated instructional text, and \`/memory reload\` after you edit files so you are not debugging stale memory mid-session.

Discovery is not infinite. Public configuration documents \`context.discoveryMaxDirs\` (default \`200\`) and \`context.memoryBoundaryMarkers\` (default includes \`.git\`). Upward traversal stops at boundary markers. That is usually desirable in nested clones and worktrees, but it means a \`GEMINI.md\` outside the git root will not climb forever into unrelated trees.

## A QA-First Mental Model: Standing Rules vs Session Prompts

Session prompts are good for one-off tasks: "generate a smoke test for the password-reset flow." Standing rules belong in \`GEMINI.md\` when they should apply every time:

- Locator strategy (role + name first, then \`data-testid\`, never CSS coupled to layout classes).
- Test data policy (factories over production dumps; never commit real PII).
- Parallelism assumptions (tests must be isolated; no shared mutable DB rows).
- Artifact expectations (screenshots on failure, trace on retry, JUnit for CI).
- Language of review comments when the agent proposes test changes.

If a rule only applies to one ticket, keep it in the prompt. If a rule would still be true next quarter, put it in versioned context. That split keeps \`GEMINI.md\` short enough for the model to follow and long enough that juniors and agents share one source of truth.

Skills and agent packs complement this file. For Claude-oriented teams, the shape of reusable skill packages is covered in the [SKILL.md format guide](/blog/skill-md-format-guide). For Cursor-heavy shops, rule file patterns differ again; see [Cursor skills and .mdc best practices](/blog/cursor-skills-md-best-practices). Gemini CLI's native standing instructions remain \`GEMINI.md\` (or whatever names you configure under \`context.fileName\`).

## Directory Map for a Test Automation Monorepo

A realistic layout for a multi-package QA surface:

\`\`\`text
repo-root/
  GEMINI.md                          # stack-wide testing constitution
  AGENTS.md                          # optional shared agent standard
  .gemini/
    settings.json                    # project CLI settings
  packages/
    web-app/
      GEMINI.md                      # app-specific UI notes (optional)
    checkout-e2e/
      GEMINI.md                      # Playwright e2e package rules
      tests/
        checkout.spec.ts
    api-contract/
      GEMINI.md                      # contract and schema test rules
  docs/
    testing/
      locator-policy.md
      flake-triage.md
\`\`\`

Global personal preferences stay out of the repo:

\`\`\`text
~/.gemini/GEMINI.md                  # your personal defaults
~/.gemini/settings.json              # user-level CLI settings
\`\`\`

Project settings live in \`.gemini/settings.json\` and override user settings for that workspace. System-wide admin files also exist for enterprise installs, but most QA teams start with user + project layers only. See https://geminicli.com/docs/reference/configuration/ for the full precedence list (defaults, system defaults, user, project, system override, environment, CLI flags).

## Writing a Repo-Root GEMINI.md That Agents Actually Obey

Vague cheerleading fails. "Write good tests" does nothing. Concrete, negative space, and checkable rules work. Here is a root file tailored for a Playwright + TypeScript shop. Adapt names to your stack; keep the specificity.

\`\`\`markdown
# Testing constitution (repo-wide)

## Stack
- Primary e2e: Playwright Test (TypeScript).
- Unit/component: Vitest + Testing Library where present.
- API checks: contract tests against OpenAPI; no ad-hoc curl-only suites as permanent coverage.

## Locators (mandatory)
- Prefer getByRole / getByLabel / getByText with accessible names.
- Use data-testid only when accessibility locators are unstable or unavailable.
- Never target generated CSS modules, nth-child chains, or absolute XPath for durable tests.
- When proposing a new testid, name it domain.object.action (example: checkout.pay.submit).

## Waits and stability
- Prefer Playwright auto-waiting assertions (toBeVisible, toHaveURL).
- Do not insert fixed sleep / waitForTimeout unless documenting a known third-party race and linking an issue.
- Network: wait for specific responses or use route mocking; do not race the UI against arbitrary delays.

## Data and environments
- Build users via fixtures or API helpers under tests/helpers/data.
- Never commit credentials, session cookies, or production dumps.
- Default baseURL comes from playwright.config; do not hardcode staging hosts in specs.

## CI contract
- Tests must run headless in CI.
- On failure: screenshot + trace (retain on first retry).
- Mark known flakes with test.fix and an issue URL; do not silent-skip.

## Agent behavior when editing tests
- Prefer extending existing page objects over duplicating selectors in specs.
- After generating tests, list residual risks: auth state, third-party iframes, clock dependence.
- Do not "fix" a red test by weakening assertions to toBeTruthy() on undefined.
\`\`\`

Notice the file uses headings and bullets. That structure helps both humans reviewing PRs and models scanning for the nearest applicable rule. The official docs show a similar style for TypeScript libraries; QA teams simply swap coding-style bullets for test-engineering bullets.

## Modular Imports: Keep the Root Short, Push Depth to Docs

Large single files rot. Gemini CLI supports modular context via \`@path\` imports inside \`GEMINI.md\`. Relative and absolute paths work. Example from official guidance, adapted for QA:

\`\`\`markdown
# Main GEMINI.md

Follow the repo testing constitution below, then package-local rules when present.

@./docs/testing/locator-policy.md
@./docs/testing/flake-triage.md
@./docs/testing/api-contract-rules.md
\`\`\`

Split so each imported file has one job:

| File | Owns | Should not contain |
| --- | --- | --- |
| \`GEMINI.md\` (root) | Non-negotiable defaults, stack choice, CI contract | Long tutorial prose |
| \`locator-policy.md\` | Locator ranking, forbidden selectors, naming | CI YAML |
| \`flake-triage.md\` | Retry policy, quarantine process, evidence required | Product feature specs |
| \`api-contract-rules.md\` | Schema source of truth, breaking-change checks | UI locator notes |

When you change a leaf file, run \`/memory reload\` and \`/memory show\` to confirm the import expanded. If an import path is wrong, the model may simply lack those rules without a loud failure in every workflow, so verify after restructures.

Imports also help multi-team monorepos: the platform QA team owns root policy; product squads own package-level \`GEMINI.md\` that only fires via workspace or JIT discovery when agents work under that package.

## Configuring context.fileName: GEMINI.md, AGENTS.md, or Both

Default context filename is \`GEMINI.md\`. Teams standardizing on the agents.md ecosystem can point Gemini CLI at other names with project or user settings:

\`\`\`json
{
  "context": {
    "fileName": ["AGENTS.md", "CONTEXT.md", "GEMINI.md"]
  }
}
\`\`\`

Place that under \`.gemini/settings.json\` (project) or \`~/.gemini/settings.json\` (user). Accepts a string or an array of strings. Documented under the \`context\` category at https://geminicli.com/docs/reference/configuration/.

Practical patterns for mixed toolchains:

| Team situation | Recommended context.fileName | Why |
| --- | --- | --- |
| Gemini-only QA pod | \`["GEMINI.md"]\` or default | One file, zero ambiguity |
| Gemini + Codex + other AGENTS.md readers | \`["AGENTS.md", "GEMINI.md"]\` | Shared standard first, Gemini-specific addenda second |
| Migration week | \`["GEMINI.md", "AGENTS.md"]\` | Keep working Gemini content while AGENTS.md is drafted |
| Enterprise mandate for AGENTS.md only | \`["AGENTS.md"]\` | Single file; move Gemini-specific notes into sections inside it |

If you keep both files, avoid contradicting instructions (for example one file says "always mock network" and the other says "always hit staging"). Contradictions in concatenated memory produce random compliance. Prefer one owner file for policy and optional thin addenda for tool-specific notes.

Related context settings worth knowing when large test trees misbehave:

- \`context.includeDirectoryTree\` (default \`true\`): includes a directory tree of the cwd in the initial request. Huge monorepos may want tighter focus via how you launch the CLI, not by stuffing more prose into \`GEMINI.md\`.
- \`context.includeDirectories\`: extra directories to treat as workspace context.
- \`context.loadMemoryFromIncludeDirectories\`: controls whether \`/memory reload\` also scans include directories.
- \`context.fileFiltering.respectGitIgnore\` / \`respectGeminiIgnore\` (defaults \`true\`): keep secrets and giant artifact dirs out of search and memory paths.
- \`context.memoryBoundaryMarkers\` (default \`[".git"]\`): stops upward discovery.

Do not invent undocumented keys. If a knob is not in public docs, encode the behavior as prose in \`GEMINI.md\` instead.

## Encoding Playwright Workflows Without Turning the File Into a Tutorial

\`GEMINI.md\` is not a course. Point to in-repo docs for deep dives; keep executable constraints in the context file. Example package-level file for \`packages/checkout-e2e/GEMINI.md\`:

\`\`\`markdown
# checkout-e2e package rules

## Scope
- Only edit tests and helpers under this package unless asked to change product code.
- Prefer fixtures in tests/fixtures over new global setup unless setup is truly shared.

## Auth
- Use storageState from global setup for signed-in flows.
- Do not log in via UI in every test; that is reserved for auth suite itself.

## Payments sandbox
- Use the test card constants from tests/helpers/payments.ts.
- Never call production payment endpoints from tests.

## Assertions
- Price and currency checks must use shared money formatters.
- After pay, assert both UI confirmation and network status from the captured response.
\`\`\`

Pair that with a short root rule: "when working under packages/*/ tests, obey the nearest package GEMINI.md." The JIT layer helps when tools open files in that tree; still, stating the expectation reduces ambiguity when the agent plans before reading.

For API contract packages, swap locator rules for schema rules: openapi path as source of truth, forbid hand-written response shapes that diverge from generated types, require explicit status code tables in new tests.

## Shell, Approvals, and Safe Test Generation

Standing markdown does not replace tool safety. Project \`.gemini/settings.json\` can tighten how the agent runs commands while writing tests. Public docs describe approval modes under \`general.defaultApprovalMode\`: \`default\` (prompt), \`auto_edit\` (auto-approve edit tools), \`plan\` (read-only planning). YOLO-style full auto-approve is documented as CLI-only, not a quiet settings default.

Example project settings a cautious QA lead might check in (adjust tool names to what your installed CLI version exposes; verify with current docs before mandating):

\`\`\`json
{
  "general": {
    "defaultApprovalMode": "default"
  },
  "context": {
    "fileName": ["GEMINI.md", "AGENTS.md"]
  },
  "tools": {
    "allowed": [
      "run_shell_command(npm test)",
      "run_shell_command(npx playwright test)"
    ]
  }
}
\`\`\`

Use allowlists for trusted, scoped commands after you understand matching rules for shell tools. Prefer confirming destructive git or deploy commands. For pure design sessions ("propose a test plan for SSO"), \`plan\` mode keeps the agent from rewriting your suite while you think.

Sandbox-related settings (\`tools.sandbox\`, network access flags, allowed paths) exist for teams that want stronger isolation. Treat them as environment policy, not as a substitute for writing "never hit production" in \`GEMINI.md\`. Defense in depth: prose rules for the model, tool policy for the runtime.

## Comparing GEMINI.md With Skills and Cursor Rules

QA orgs rarely run one agent. Map the surfaces so you do not duplicate or contradict.

| Mechanism | Typical home | Trigger model | Best for test teams |
| --- | --- | --- | --- |
| \`GEMINI.md\` | \`~/.gemini/\`, repo, packages | Loaded by Gemini CLI hierarchy + JIT | Standing test policy while using Gemini CLI |
| \`AGENTS.md\` | Repo / nested dirs (agents.md standard; nearest guidance often wins per tool) | Configurable via Gemini \`context.fileName\`; native in other CLIs | Cross-tool shared instructions |
| \`SKILL.md\` | \`.claude/skills/\` or \`~/.claude/skills/\` (name + description frontmatter; name max 64 chars, description max 1024) | Skill discovery by description when using Claude-compatible agents | Packaged workflows: "generate a11y tests", "triage flake" |
| Cursor rules (\`.cursor/rules\`, \`.mdc\`) | Project rules with \`alwaysApply\` / \`globs\` / \`description\` | Cursor applies by always-on or path globs | Editor-scoped guidance while coding in Cursor |
| Copilot instructions | \`.github/copilot-instructions.md\`, \`.github/instructions/*.instructions.md\` with \`applyTo\` | GitHub Copilot path filters | PR and IDE assist aligned to paths |

Use the table as a routing guide: put universal test law where every agent can see it (\`AGENTS.md\` plus Gemini \`context.fileName\`), put Gemini-only nuances in \`GEMINI.md\`, put reusable multi-step procedures in skills, put editor path globs in Cursor rules.

Ready-made QA skills for agent workflows can be installed from qaskills.sh with the qaskills CLI when you want packaged procedures instead of growing \`GEMINI.md\` into a novella.

## Decision Matrix: What Goes in GEMINI.md vs Prompt vs Skill vs CI

| Need | Put it in GEMINI.md | Put it in the prompt | Put it in a skill | Put it in CI config |
| --- | --- | --- | --- | --- |
| "Always use Playwright auto-waiting" | Yes | No | Optional reminder | Enforce via lint if available |
| "Add coverage for ticket QA-1842" | No | Yes | No | No |
| Multi-step flake bisect procedure | Thin pointer | Sometimes | Yes | Partial (retry knobs) |
| Node version and cache keys | No | No | No | Yes |
| Forbidden selectors list | Yes | No | Can mirror | ESLint plugin if you have one |
| One-off exploratory test idea | No | Yes | No | No |
| How to open HTML report | Short | Optional | Good skill candidate | Job artifact upload |

If you catch yourself pasting the same paragraph into five prompts, promote it to \`GEMINI.md\`. If the paragraph is a 15-step ritual with branching, promote it to a skill and keep a one-line pointer in context. If it is environment truth (browsers installed, workers count), put it in Playwright or CI config and only describe the human-facing policy in markdown.

## Monorepo and Nested Package Patterns That Scale

### Pattern A: Thin root, rich packages
Root \`GEMINI.md\` states stack and non-negotiables (50-80 lines). Each test package adds 30-60 lines of local law. JIT and parent search assemble the stack when agents dive into a package.

### Pattern B: Root plus imported docs
Root stays a table of contents with \`@\` imports. Docs under \`docs/testing/\` are reviewed like code. Good for platform teams that already document standards in MkDocs or similar.

### Pattern C: AGENTS.md spine
\`AGENTS.md\` holds cross-tool law. \`.gemini/settings.json\` sets \`context.fileName\` to include it. Optional \`GEMINI.md\` holds only Gemini CLI operational notes (how you want \`/memory\` used, link to internal runbooks). Works well when Cursor, Codex, and Gemini share one repo.

### Pattern D: Personal global defaults
Engineers keep tone and personal formatting in \`~/.gemini/GEMINI.md\` ("summarize failures as Given/When/Then", "prefer patch-style diffs"). Never put company secrets or prod URLs in global files on shared laptops without disk encryption and secret hygiene policies.

Anti-pattern: copy-pasting the entire root file into every package. Drift is guaranteed within a month.

## Inspecting and Debugging Instructional Memory

When generated tests ignore your rules, debug memory before blaming the model.

1. Check the footer context count after launching in the package directory versus repo root.
2. Run \`/memory show\` and search for your distinctive phrase (for example \`domain.object.action\`). If missing, the file was not loaded.
3. Run \`/memory reload\` after edits; do not assume autosync in every situation.
4. Confirm you are not outside a \`memoryBoundaryMarkers\` root (default stops at \`.git\`).
5. Confirm \`.geminiignore\` / \`.gitignore\` are not excluding the path you care about if file filtering is involved in discovery workflows.
6. Confirm \`context.fileName\` matches the files you created (\`AGENTS.md\` alone will not load a lonely \`GEMINI.md\`).

A useful drill for new hires: break a rule on purpose in a throwaway branch, ask the agent to "improve this test", and verify it rewrites toward policy. If it does not, your context is not reaching the model.

## Sample End-to-End Setup for a Fresh Playwright Repo

Step through a greenfield configuration:

\`\`\`bash
# from repo root
mkdir -p .gemini docs/testing packages/checkout-e2e

# create project settings that also honor AGENTS.md
cat > .gemini/settings.json << 'EOF'
{
  "context": {
    "fileName": ["GEMINI.md", "AGENTS.md"]
  },
  "general": {
    "defaultApprovalMode": "default"
  }
}
EOF
\`\`\`

Then add root \`GEMINI.md\` (constitution), optional \`AGENTS.md\` (cross-tool subset), package file, and imported policies. Commit them in the same PR as your first agent-assisted test so reviewers see policy and usage together.

When you install shared QA procedures, prefer versioned skills over pasting runbooks into root context. Packaged skills from qaskills.sh (via the qaskills CLI) keep multi-step workflows out of the always-on token budget while remaining easy to invoke.

## Prompt Patterns That Work With Your New Context

Context does not replace clear tasks. It raises the floor. Effective prompts become shorter:

\`\`\`markdown
## Task
Add a checkout happy-path e2e under packages/checkout-e2e for the new express-shipping option.

## Constraints already in GEMINI.md
Obey locator policy, auth storageState, and payment sandbox rules.

## Deliverables
1. Spec file using existing CheckoutPage object.
2. Fixture only if express shipping needs unique cart state.
3. Short residual risk list (tax calculation, inventory edge).
\`\`\`

Bad prompt after good context: restate the entire locator essay. That wastes tokens and can contradict the file if you mistype. Good prompt after good context: name the feature, the package, and acceptance checks unique to the ticket.

## Failure Modes Unique to Hierarchical Context

**Silent override.** A package \`GEMINI.md\` says "mock all network" while root says "use staging." Concatenation can leave both present; the model picks inconsistently. Resolve by making package files refine, not invert, root law unless you explicitly mark an exception section.

**Orphan imports.** Moving \`docs/testing/\` without updating \`@\` paths drops rules with little ceremony. Add a CI check that greps \`GEMINI.md\` for \`@\` imports and asserts targets exist.

**Global pollution.** A personal \`~/.gemini/GEMINI.md\` that forces a private naming scheme will surprise teammates when pair-programming on your laptop. Keep global files truly personal (tone, editor preferences), not team policy.

**Too much tree context.** Giant monorepo trees plus huge markdown can crowd the window. Prefer focused working directories, modular imports, and skills for deep procedures rather than a 2,000-line single file.

**Settings vs markdown confusion.** People put \`defaultApprovalMode\` inside \`GEMINI.md\` as if it were YAML frontmatter. It is not. Behavioral CLI settings belong in \`settings.json\`; instructional prose belongs in context markdown.

## Aligning Reviewers, Linters, and Agents

\`GEMINI.md\` is social infrastructure. Treat it like an ADR:

- Require PR review for policy changes.
- Link the PR to a short rationale ("banned waitForTimeout after flake cluster in Q2").
- Mirror enforceable bits in ESLint, Playwright rules, or custom checks so humans and bots fail the same way.
- Mention the file in onboarding: first hour includes \`/memory show\` on a sample package.

When agents propose tests that violate policy, reviewers should comment "conflicts with GEMINI.md section Locators" the same way they cite style guides. That feedback loop keeps the file honest.

## Migrating From Chat Chaos to Versioned Context

A practical four-week migration for a mid-size QA org:

**Week 1.** Inventory repeated prompt paste. Cluster into policy vs procedure vs one-off.

**Week 2.** Write root \`GEMINI.md\` with only the top 15 policies. Add \`/memory show\` verification. Pilot on one squad.

**Week 3.** Extract long procedures to skills or docs imports. Add package files for the messiest suite. Configure \`context.fileName\` if you also maintain \`AGENTS.md\`.

**Week 4.** Delete obsolete wiki pages that duplicate the file, or mark them as mirrors. Add a CI existence check for root context file. Train reviewers.

Success metric is not "more markdown." Success is fewer review comments about selectors, fewer secret leaks in generated tests, and shorter prompts for ordinary tickets.

## Working With MCP Test Tooling Alongside GEMINI.md

Model Context Protocol servers (built with packages such as \`@modelcontextprotocol/sdk\`, using constructs like \`McpServer\`, \`tool()\`, and \`StdioServerTransport\`) extend what the agent can call: browsers, issue trackers, observability backends. \`GEMINI.md\` should describe *when* to use those tools, not re-implement their schemas.

Example lines that stay accurate without inventing tool APIs:

\`\`\`markdown
## MCP usage (team policy)
- Prefer the browser MCP for exploratory repro only after automated Playwright fails to isolate a flake.
- Never paste raw customer payloads from observability tools into specs.
- If an MCP tool returns production data, redact before writing fixtures.
\`\`\`

Keep server allow/deny lists in settings under the documented \`mcp\` category (\`mcp.allowed\`, \`mcp.excluded\`, \`mcp.serverCommand\` where applicable). Markdown for policy, JSON for runtime.

## Putting Cursor and Claude Rules in Dialogue With Gemini

If your org also uses Cursor and Claude Code, write a one-page "source of truth" note in the repo README:

- Universal test law lives in \`AGENTS.md\` (and is listed in Gemini \`context.fileName\`).
- Gemini operational extras live in \`GEMINI.md\`.
- Packaged workflows live in skills (\`SKILL.md\` with name/description frontmatter limits as documented for Claude skills).
- Path-scoped editor hints live in Cursor \`.mdc\` rules with \`globs\` / \`alwaysApply\` / \`description\`.

That note prevents three teams from each inventing a conflicting "always mock" rule. Deep format details for skills and Cursor rules belong in their dedicated guides linked earlier; this article stays focused on Gemini CLI context files.

## Checklist Before You Merge Your First GEMINI.md PR

- [ ] Root file states stack, locator policy, data policy, CI artifacts, and agent edit norms.
- [ ] No secrets, tokens, or production URLs.
- [ ] Imports resolve; \`/memory show\` includes distinctive phrases.
- [ ] Package files refine rather than invert root law.
- [ ] \`.gemini/settings.json\` \`context.fileName\` matches files on disk.
- [ ] Personal global file does not override team policy with contradictory rules.
- [ ] Reviewers know to cite sections when rejecting noncompliant agent output.
- [ ] Long procedures deferred to skills or docs, not dumped into always-on context.


## Scenario Walkthrough: Flaky Checkout Spec Under Hierarchical Memory

Imagine a red CI job: \`checkout.spec.ts\` fails 30 percent of the time on the express-shipping toggle. A junior engineer opens Gemini CLI from \`packages/checkout-e2e\` and types "make this test stable." Without hierarchical context, the agent often inserts \`waitForTimeout(3000)\`, broadens a locator to \`.btn\`, or deletes the price assertion. With a well-built \`GEMINI.md\` stack, the session should look different.

**What the agent should already know from memory**

- Fixed sleeps are banned unless an issue URL documents a third-party race.
- Locators prefer role and label; layout CSS is forbidden.
- Auth uses \`storageState\`; the agent should not add a full UI login to a shipping test.
- Failures need evidence (trace, screenshot), not quieter assertions.

**What you still put in the prompt**

- Link to the failing CI job or paste the error and stack.
- Note whether staging inventory is empty for express SKUs on weekends.
- Ask for a short residual risk list after the fix.

A strong agent response under good context might: stabilize the toggle with a role-based locator, wait for the shipping-rate network response, keep money assertions on shared formatters, and open a follow-up issue if the backend rate endpoint is genuinely racy. That outcome is not magic. It is the product of explicit rules the model saw before the first tool call.

Run this as a teaching exercise: snapshot \`/memory show\` into a gist for the team (redact secrets), then compare two branches of the same prompt with and without package-level rules. The diff in agent behavior is the ROI pitch for investing in context files.

## Scenario Walkthrough: Contract Test Drift After an OpenAPI Change

API QA faces a different failure mode: product merges a breaking OpenAPI change, generated clients update, and hand-written contract tests still assert the old shape. Encode prevention in \`packages/api-contract/GEMINI.md\`:

\`\`\`markdown
# api-contract package

## Source of truth
- OpenAPI document at openapi/openapi.yaml is canonical.
- Prefer generated types over hand-rolled interfaces for response bodies.

## When editing tests after schema changes
1. Summarize the breaking change in one paragraph before editing assertions.
2. Update positive and negative status-code cases together.
3. Do not reintroduce fields marked removed in the schema.
4. If a field is deprecated but still present, assert deprecation headers when documented.

## Forbidden shortcuts
- Do not cast responses to any to silence type errors.
- Do not skip negative tests because the happy path compiles.
\`\`\`

Prompt the agent with the OpenAPI diff hunk and "update contract tests under packages/api-contract." Hierarchical memory should keep it from inventing fields. If it still casts to \`any\`, your rules are missing or contradicted; fix the markdown, do not only scold the model in chat.

## How Reviewers Should Cite GEMINI.md in Pull Requests

Agent-assisted test PRs need a lightweight review language. Suggested comment templates:

- "Locator uses nth-child; conflicts with GEMINI.md Locators (mandatory)."
- "Added waitForTimeout without issue URL; see Waits and stability."
- "Hardcoded staging host; baseURL must come from playwright.config per Data and environments."
- "Weakened assertion to toBeTruthy(); agent edit norms forbid this as a flake fix."

Store these templates in your team wiki once, but keep the normative text only in \`GEMINI.md\` so comments and policy cannot drift. Some teams add a CODEOWNERS entry so QA platform engineers review changes to root context files the same way they review Playwright shared fixtures.

When an agent proposes a legitimate exception (third-party captcha, uncontrollable animation), require the PR description to quote the exception and link an issue. Optionally add a short "Exceptions" section in the package \`GEMINI.md\` with an expiration date so temporary hacks do not become permanent law.

## Token Budget Hygiene for Always-On Test Instructions

Every loaded context file competes with source code, tool output, and your prompt inside the model window. Bloated constitutions quietly hurt retrieval of the one rule that mattered.

Practical budgets for QA teams:

- Root \`GEMINI.md\`: aim for under roughly 100-150 lines of dense policy.
- Each package file: under roughly 80 lines.
- Imported docs: longer is fine if they are loaded intentionally; still prefer skimmable headings.
- Skills: put multi-page procedures there so they are not always on.

If \`/memory show\` scrolls for pages, schedule a cut. Delete motivational fluff, merge duplicate bullets, move tutorials to docs linked by a single line. Prefer tables for ranked locator strategies over paragraphs. Prefer "never X; do Y" pairs over essays.

Also watch for accidental double loading: the same policy imported at root and pasted into a package. The footer count goes up while useful diversity of instruction goes down.

## Coordinating GEMINI.md With Playwright Config and Lint

Markdown cannot fail CI by itself. Pair it with mechanical enforcement where possible:

| Policy in GEMINI.md | Mechanical twin |
| --- | --- |
| No waitForTimeout | ESLint rule or custom check forbidding that API in tests |
| data-testid naming | Regex lint on testid strings |
| No committed secrets | gitleaks / secret scanning |
| Required trace on retry | assert playwright.config.ts settings in a unit test |
| Forbidden .only in main | lint-staged or CI grep |

The agent reads prose; CI enforces invariants. When both agree, review load drops. When they disagree, engineers learn to ignore one of them. Keep a quarterly sync: open the root \`GEMINI.md\` beside \`playwright.config.ts\` and ESLint config, and reconcile.

Example of a small config assertion test (illustrative TypeScript, adapt to your runner):

\`\`\`typescript
import { expect, test } from 'vitest';
import config from '../playwright.config';

test('ci retains traces on failure retries', () => {
  // Shape depends on your Playwright config export; assert the real fields you set.
  expect(config.retries).toBeGreaterThanOrEqual(1);
  expect(config.use?.trace).toBeTruthy();
});
\`\`\`

Do not invent Playwright option names that your version does not support; read your installed config types. The point is alignment: agent instructions and executable config describe the same world.

## Onboarding Script: First Day With Gemini CLI on a Test Repo

Checklist for new SDETs:

1. Install and authenticate Gemini CLI per current official docs.
2. Clone the monorepo; open a terminal at repo root; launch the CLI.
3. Note the footer context file count; run \`/memory show\`; find the locator policy phrase.
4. \`cd packages/checkout-e2e\`, relaunch or reload memory; confirm package rules appear.
5. Ask the agent to review a deliberately bad patch (provided in \`docs/testing/bad-example.spec.ts\`) and fix it.
6. Submit the fixed patch as a training PR; mentor checks that comments cite \`GEMINI.md\` sections.

This onboarding beats a slide deck because engineers feel the hierarchy. If step 3 fails, fix discovery before you train anyone else.

## Security and Compliance Notes for Regulated QA Orgs

Test agents amplify mistakes. A single overly helpful rule like "log full response bodies for debugging" can push PII into chat logs and specs. Bake compliance into context:

- Redact tokens, session IDs, and personal data before writing fixtures.
- Prefer synthetic data factories.
- Prohibit copying production database dumps into the repo.
- State whether customer tenant data may be used in lower environments at all.

For tool runtime, prefer stricter approval defaults and sandbox settings documented in the configuration reference rather than hoping the model refuses dangerous shell commands. Combine \`GEMINI.md\` policy with human approval for production-adjacent systems.

If your company retains agent transcripts, treat them as potentially sensitive. Do not put API keys into \`GEMINI.md\` "for convenience." Use environment variables and the documented settings interpolation patterns (\`$VAR_NAME\`, \`\${VAR_NAME}\`, \`\${VAR_NAME:-default}\` in settings strings) where appropriate for settings files, not for secrets inside committed markdown.

## Keeping GEMINI.md Alive Across Tooling Churn

CLI defaults, model names, and team stacks change. Schedule a lightweight review:

- After major Gemini CLI releases, skim https://geminicli.com/docs/cli/gemini-md/ and the configuration reference for new context keys or changed defaults.
- After Playwright major upgrades, update locator and config-related bullets.
- After org tool mandates (for example requiring \`AGENTS.md\`), adjust \`context.fileName\` and delete contradictory duplicates.
- After a serious flake or security incident, add one bullet that would have prevented it, not a new essay.

Version the file through normal git history. A useful commit message cites the incident or RFC: "ban page.waitForTimeout without issue link (flake cluster 2026-06)." Future you will thank present you when an agent argues about an old habit.


## Frequently Asked Questions

### Where should a new QA team put their first GEMINI.md?

Start at the repository root so every clone shares the same testing constitution, and keep personal tone preferences in \`~/.gemini/GEMINI.md\`. Add package-level files only after the root rules stabilize and you see repeated exceptions for one suite. Configure \`.gemini/settings.json\` if you also need \`AGENTS.md\` in the load list. Verify with \`/memory show\` from the directories engineers actually work in, not only from the monorepo root.

### How do GEMINI.md imports differ from pasting the same text twice?

The \`@path\` import syntax modularizes memory so one policy file can be shared without copy-paste drift, and the CLI expands those references into hierarchical memory. Pasting duplicates guarantees divergence the first time someone edits only one copy. Imports also keep the root readable for humans reviewing PRs. After moves or renames, reload memory and confirm the distinctive policy phrases still appear, because a broken path silently drops guidance.

### Can Gemini CLI use AGENTS.md instead of GEMINI.md?

Yes. Set \`context.fileName\` in user or project \`settings.json\` to a string or array that includes \`AGENTS.md\`. Many teams list both so Gemini-specific notes and the cross-tool standard coexist. Ensure you do not leave contradictory rules across the two files. Official examples show arrays such as \`["AGENTS.md", "CONTEXT.md", "GEMINI.md"]\` in the Gemini CLI documentation for customizing context file names. After changing settings, restart or reload memory and confirm \`/memory show\` includes the expected headings.

### Why does the agent still ignore our locator rules after we added them?

Most often the file is not in the loaded set: wrong working directory, boundary marker stopping discovery, mismatched \`context.fileName\`, or edits not reloaded. Run \`/memory show\` and search for a unique string from your policy. Second most common cause is contradiction with another loaded file or an overlong context where critical bullets are buried under essays. Shorten, de-conflict, reload, and retest with a deliberate noncompliant example file the agent should fix.
`,
};
