import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'GitHub Copilot Coding Agent: Setup Guide for Testing Repositories',
  description:
    'Complete copilot coding agent setup for testing repositories: custom instructions, setup-steps.yml, MCP, and issue patterns that keep CI green.',
  date: '2026-07-15',
  category: 'Guide',
  content: `
# GitHub Copilot Coding Agent: Setup Guide for Testing Repositories

Most teams "enable Copilot" and then wonder why agent pull requests open with red CI, missing browsers, or Playwright specs that ignore your page-object conventions. The gap is almost never the model. It is repository setup: what the agent can install, which instructions it loads, and how you phrase the work you assign it.

This guide is a full **copilot coding agent setup** walkthrough aimed at **testing repositories** (dedicated automation monorepos, hybrid app-plus-e2e repos, and QA packages inside larger products). You will wire the files GitHub actually documents, pre-install the tools a QA agent needs, and design issues that produce mergeable test changes rather than exploratory noise.

If you need a broader product and workflow overview for QA engineers first, start with the [GitHub Copilot QA engineers deep guide](/blog/github-copilot-qa-engineers-deep-guide). If you are still choosing how to encode rules across tools, compare formats in [Claude skills vs Cursor rules vs Copilot instructions](/blog/claude-skills-vs-cursor-rules-vs-copilot-instructions). Ready-made QA skills you can install with the qaskills CLI are also catalogued at qaskills.sh when you want reusable patterns without inventing every rule from scratch.

Official references used throughout: [About Copilot cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent), [Adding repository custom instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot), [Best practices for tasks](https://docs.github.com/en/copilot/how-tos/agents/copilot-coding-agent/best-practices-for-using-copilot-to-work-on-tasks), and [Configure the development environment](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/customize-the-agent-environment).

## What "setup" means when the agent owns the test run

Inline chat suggests code while you keep the terminal. The coding agent (often called Copilot cloud agent in current docs) is different: you assign an issue or task, it runs in an ephemeral GitHub Actions-powered environment, explores the repo, edits files, can run builds and tests, and opens or updates a pull request.

For a testing repository, that means setup has three layers that must agree:

1. **Policy layer**: the agent is allowed on the org and repo, and the people who assign work have write access when they need \`@copilot\` on PRs.
2. **Environment layer**: browsers, language runtimes, package registries, and secrets exist *before* the agent starts guessing with \`npm install\` and \`npx playwright install\`.
3. **Instruction layer**: the agent knows how *your* suite is structured (fixtures, tags, page objects, seed data, CI entrypoints) without rediscovering the README on every task.

If any layer is weak, symptoms look like "the model is bad": flaky setup, wrong package manager, tests that never run, or PRs that ignore \`data-testid\` conventions. Treat those as setup failures first.

### How a testing repo differs from an app repo

Application repos often succeed with a short "how to build and unit test" note. Testing repositories usually add friction:

- **Heavy tooling**: browser binaries, mobile device farms, containerized API mocks, or desktop drivers.
- **Multiple runners**: unit under Jest or Vitest, API under pytest or RestAssured, UI under Playwright/Cypress, performance under k6.
- **Non-code assets**: fixtures, HAR files, visual baselines, environment matrices.
- **Stricter gatekeeping**: "green local" is not enough; tags, smoke vs full suite, and flake quarantine rules matter.

Your setup should document *which* command the agent should treat as the validation gate for a given change, not every command that exists.

## Prerequisites and org policy gates before the first assign

Before you write a single instructions file, confirm the agent can actually run.

### Plan and policy checklist

Copilot cloud agent is available on paid Copilot plans. On Business and Enterprise, an administrator typically must enable the relevant policy before individuals can use the agent. Repository owners can also opt repositories out. See GitHub's access management docs for the current UI paths under organization Copilot policies.

Practical checks for a QA org:

- Confirm your plan includes the coding agent, not only chat completion.
- Confirm org policy allows coding agent for the target repositories (automation monorepo, sandbox fork, then production app repos).
- Confirm the default branch exists and CI can run Actions (the setup workflow must land on the default branch to take effect).
- Confirm who has write access: only write access comments with \`@copilot\` drive agent follow-ups on PRs.

### Start with a throwaway validation issue

Do not begin with "rewrite our entire regression suite." Open a low-risk issue such as: "Add a failing-then-passing unit test for the retry helper in \`packages/assertions\` and run the package test command." Use it to verify:

- The agent session starts.
- Setup steps complete (watch session logs).
- A PR appears with real commits.
- Your CI workflows run against the PR.

If that pipeline is broken, no amount of clever prompting fixes it.

## Mapping a QA monorepo so the agent can navigate it

Agents search with tools and semantic code search, but search is expensive and error-prone when package boundaries are unclear. Spend thirty minutes producing a map the agent can trust.

### Inventory what you will put in instructions

Walk the repository and note:

- Package manager and lockfile (\`package-lock.json\`, \`pnpm-lock.yaml\`, \`yarn.lock\`, \`poetry.lock\`, etc.).
- Primary languages and test frameworks.
- Root scripts that CI actually runs (not every script in \`package.json\`).
- Where e2e lives vs unit vs contract tests.
- How environments are selected (\`BASE_URL\`, \`.env.example\`, GitHub Environments).
- How secrets are named in Actions (do not put secret *values* in instructions; name the variable keys).
- Flake handling: quarantine folders, \`test.fix\`, known-issue tags.

### Example layout annotation (for your own notes)

Use a short layout block later inside \`.github/copilot-instructions.md\`. Keep it factual:

\`\`\`markdown
## Repository map (automation monorepo)

- \`packages/web-e2e\`: Playwright UI tests, config in \`playwright.config.ts\`
- \`packages/api-contract\`: schema/contract tests (Vitest)
- \`packages/shared-fixtures\`: JSON fixtures and factory helpers
- \`apps/mock-bff\`: local mock used by smoke tests only
- Root validation for web changes: \`pnpm --filter web-e2e test:smoke\`
- Full suite is CI-only overnight; do not run full suite in agent sessions unless asked
\`\`\`

That last line matters. Without it, agents may attempt multi-hour full regressions and time out.

## Writing \`.github/copilot-instructions.md\` for test stacks

Repository-wide custom instructions live at \`.github/copilot-instructions.md\`. GitHub documents that this file guides how Copilot understands the project and how to build, test, and validate changes. For the coding agent, that is the difference between a PR that already ran smoke tests and one that only "looks right."

### What to put in, what to leave out

**Put in:**

- One-paragraph product purpose of the *test* repo.
- Exact bootstrap, install, build, lint, and test commands that work in a clean environment.
- Ordering constraints ("always install browsers after \`pnpm install\`").
- Coding conventions for tests (locator strategy, page object location, naming of \`*.spec.ts\`).
- What not to touch (generated clients, vendor snapshots, golden images without approval).
- Definition of done for agent tasks (tests pass, lint clean, no committed secrets).

**Leave out:**

- Task-specific one-off prompts (those belong in the issue).
- Novel config keys that are not real in your repo.
- Huge paste dumps of entire READMEs (GitHub's onboard prompt even suggests keeping instructions roughly short; long files compete for attention).
- Secrets, tokens, private URLs that should stay in Actions secrets or environment config.

### A testing-oriented template you can adapt

Create the file from the repo root:

\`\`\`bash
mkdir -p .github
touch .github/copilot-instructions.md
\`\`\`

Then adapt content like the following (replace commands with *your* verified ones):

\`\`\`markdown
# Copilot instructions: payments-automation

This repository owns automated checks for the Payments web app and related APIs.
Primary stack: TypeScript, Playwright, Vitest, pnpm workspaces.

## Always do before claiming a task is complete

1. From repo root: \`pnpm install\`
2. For web e2e changes: \`pnpm exec playwright install --with-deps chromium\`
3. Run the narrowest relevant suite:
   - Unit/helpers: \`pnpm --filter shared-fixtures test\`
   - Web smoke: \`pnpm --filter web-e2e test:smoke\`
   - API contract: \`pnpm --filter api-contract test\`
4. Run lint for touched packages when a \`lint\` script exists.

## Conventions

- Prefer Playwright \`getByRole\`, \`getByLabel\`, \`getByTestId\` over CSS/XPath.
- Page objects live under \`packages/web-e2e/src/pages/\`.
- Do not commit \`.auth/\` storage state files or real credentials.
- New UI tests must include a trace-on-retry configuration already present in \`playwright.config.ts\`; do not remove it.
- Prefer extending existing fixtures in \`packages/shared-fixtures\` over duplicating JSON.

## Out of scope unless the issue says otherwise

- Full overnight regression tags (\`@full\`)
- Visual baseline regeneration
- Production environment runs

Trust these instructions. Search the repo only when a command fails or a path is missing.
\`\`\`

### Ask the agent to generate the first draft

GitHub documents an onboard flow: from [github.com/copilot/agents](https://github.com/copilot/agents), select the repository and use their recommended prompt to generate \`.github/copilot-instructions.md\`. For testing repos, after generation, *edit* the draft yourself:

- Delete invented scripts that do not exist.
- Add browser install steps.
- Replace "run tests" with named filters and tags.
- Add "do not run @full" style constraints.

The first-time agent PR for instructions is valuable, but QA leads should treat it as a draft under human ownership.

## Path-specific \`.instructions.md\` for frameworks and folders

Path-specific instructions live under \`.github/instructions/\` as files named \`*.instructions.md\` with YAML frontmatter using the documented \`applyTo\` keyword (glob patterns). GitHub also documents an optional \`excludeAgent\` value of \`"code-review"\` or \`"cloud-agent"\` when you want only one of those features to load the file.

This is where testing repositories shine: Playwright rules should not flood pure API package work, and pytest fixtures should not appear when the agent edits Cypress only.

### Example: Playwright specs only

\`\`\`markdown
---
applyTo: "**/packages/web-e2e/**/*.spec.ts"
---

## Playwright authoring rules

- One user-visible behavior per test; avoid multi-act "journeys" unless the issue requests an e2e path.
- Use fixtures from \`packages/web-e2e/src/fixtures\` for login; do not reimplement login in each file.
- Assertions must use Playwright expect matchers (\`toBeVisible\`, \`toHaveURL\`, \`toHaveText\`).
- Never use hard-coded \`waitForTimeout\` sleeps; use locator auto-wait or \`expect\` polling.
- Tag smoke coverage with \`@smoke\` in the test title when the scenario is CI-blocking.
\`\`\`

### Example: API contract tests only

\`\`\`markdown
---
applyTo: "**/packages/api-contract/**/*.{ts,tsx}"
---

## API contract rules

- Prefer schema assertions against checked-in OpenAPI snapshots under \`packages/api-contract/schemas\`.
- Do not hit production hosts; use the mock base URL from \`.env.example\`.
- When adding a new endpoint test, include both happy path and one documented 4xx case.
\`\`\`

### Example: exclude code review noise

If a long environment matrix is only useful while the agent *implements*, not when reviewing diffs:

\`\`\`markdown
---
applyTo: "**"
excludeAgent: "code-review"
---

## Agent runtime notes

- Default BASE_URL for local mock is http://127.0.0.1:4010
- Start mock with \`pnpm --filter mock-bff start\` only when web-e2e needs it
\`\`\`

Use \`excludeAgent\` sparingly. Most QA conventions *should* apply to code review as well so reviewers and the agent share the same bar.

### Multiple globs

GitHub documents comma-separated patterns in \`applyTo\`, for example \`**/*.ts,**/*.tsx\`. For monorepos, prefer package-scoped globs over repo-wide \`**/*\` so instructions stay relevant.

## \`AGENTS.md\` nearest-file-wins for packages and suites

Alongside Copilot-specific files, the coding agent supports \`AGENTS.md\` anywhere in the repository. When Copilot works, the nearest \`AGENTS.md\` in the directory tree takes precedence (see the [agents.md standard](https://agents.md/) and GitHub's custom instructions docs). Nested files are ideal for monorepos:

- Root \`AGENTS.md\`: global safety rules, secret policy, monorepo commands.
- \`packages/web-e2e/AGENTS.md\`: Playwright-only detail.
- \`packages/mobile/AGENTS.md\`: device lab constraints.

The agent also continues to support \`.github/copilot-instructions.md\`, path-specific \`.github/instructions/**/*.instructions.md\`, plus root \`CLAUDE.md\` and \`GEMINI.md\` where teams already standardized on those names.

### How to split content without contradiction

| File | Best content | Anti-pattern |
| --- | --- | --- |
| \`.github/copilot-instructions.md\` | Repo-wide install/test commands, global conventions | 800 lines of per-framework essays |
| \`.github/instructions/*.instructions.md\` | Glob-scoped framework rules | Rules that apply to files outside \`applyTo\` |
| Root \`AGENTS.md\` | Cross-tool agent norms, safety, definition of done | Duplicating every package script |
| Nested \`AGENTS.md\` | Package entrypoints, local gotchas | Conflicting "always run X" vs root "never run X" |
| \`CLAUDE.md\` / \`GEMINI.md\` | Bridge content if other agents already use them | Three different truths about the same command |

**Rule of thumb:** one source of truth for each command. If root says \`pnpm test:smoke\`, nested files should not invent \`npm run smoke\` unless that package truly differs, and then they must say *only for this package*.

### Minimal nested \`AGENTS.md\` example

\`\`\`markdown
# web-e2e package agent notes

Work only inside packages/web-e2e unless fixtures in packages/shared-fixtures must change.

Validation for this package (from repo root):

    pnpm --filter web-e2e test:smoke

If browsers are missing, install Chromium only. Do not download every Playwright browser unless the issue requires cross-browser coverage.
\`\`\`

Keep package-local notes short. Put durable cross-package rules in the root instructions so nested files do not invent conflicting CLI entrypoints.

## \`copilot-setup-steps.yml\`: preinstalling browsers and runners

This is the highest leverage setup file for testing repositories.

GitHub documents a special workflow at \`.github/workflows/copilot-setup-steps.yml\` with a job that **must** be named \`copilot-setup-steps\`. Steps run in GitHub Actions before the agent starts working. The workflow only takes effect once present on the default branch. You can trigger it on push/PR to that file path and via \`workflow_dispatch\` to validate it like any other Action.

Customizable job fields documented by GitHub include: \`steps\`, \`permissions\`, \`runs-on\`, \`services\`, \`snapshot\`, and \`timeout-minutes\` (max 59). Other job customizations are ignored. If a setup step fails (non-zero exit), remaining setup steps are skipped and the agent continues with the environment as-is.

### Why testing repos cannot skip this

Without setup steps, the agent may:

- Pick the wrong Node version.
- Use \`npm\` in a \`pnpm\` repo.
- Spend half the session installing browsers.
- Fail private package downloads.
- Never start mock services that smoke tests require.

Deterministic setup turns "maybe the agent can run tests" into "the agent starts with browsers and dependencies ready."

### Baseline Node + Playwright example

\`\`\`yaml
name: "Copilot Setup Steps"

on:
  workflow_dispatch:
  push:
    paths:
      - .github/workflows/copilot-setup-steps.yml
  pull_request:
    paths:
      - .github/workflows/copilot-setup-steps.yml

jobs:
  copilot-setup-steps:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Enable corepack
        run: corepack enable

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright Chromium
        run: pnpm exec playwright install --with-deps chromium
\`\`\`

Adjust package manager and browser set to match reality. If your CI uses \`npm ci\`, do not suddenly invent pnpm only for the agent.

### Python API test example

\`\`\`yaml
jobs:
  copilot-setup-steps:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v6

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Sanity check pytest
        run: pytest --collect-only -q
\`\`\`

\`--collect-only\` as a setup sanity check confirms the environment can import the suite without executing long tests during setup.

### Services for local dependencies

If smoke tests need Redis, Postgres, or a wiremock container, GitHub Actions \`services\` can start them for the setup job context. Keep this aligned with how developers run tests locally, or document that agent validation uses service containers while local dev uses Docker Compose.

### Runners: standard, larger, self-hosted, Windows

Defaults use standard GitHub-hosted Ubuntu runners. Documented options:

- **Larger runners**: set \`runs-on\` to your larger runner label for more CPU/memory/disk (helpful for browser suites).
- **Self-hosted**: possible for internal artifact access; GitHub recommends ephemeral single-use runners and notes the integrated firewall is not compatible with self-hosted runners (disable firewall in repo settings if required).
- **Windows**: available when your toolchain needs Windows; firewall compatibility notes in GitHub docs still apply.
- **macOS runners**: not supported for Copilot cloud agent per GitHub's environment docs.

For most pure web automation repos, Ubuntu + Chromium (or the browsers you actually gate on) is enough.

### Merge order that avoids false confidence

1. Land \`copilot-setup-steps.yml\` on the default branch.
2. Manually run it from the Actions tab; fix failures.
3. Land or update instructions that reference the same commands.
4. Only then assign real test-writing issues.

## Scoping issues that produce mergeable test PRs

GitHub's task guidance is blunt: well-scoped issues with acceptance criteria beat vague epics. For testing work, treat the issue body as the prompt.

### Anatomy of a strong testing issue

Include:

- **User-visible behavior** under test (not "improve coverage").
- **Exact area** (package, app route, API resource).
- **Framework** if the repo has more than one.
- **Acceptance criteria**: files expected, tags, commands that must pass.
- **Out of scope**: full regression, visual baselines, production data.
- **Test data notes**: factory names, disposable accounts, feature flags.

Example issue body:

\`\`\`markdown
## Goal
Add Playwright smoke coverage for the "Download invoice PDF" button on the billing history page.

## Context
- App route: /billing/history
- Existing page object: packages/web-e2e/src/pages/BillingHistoryPage.ts
- Related unit helpers already cover PDF filename parsing

## Acceptance criteria
- New or extended spec under packages/web-e2e covering happy path only
- Tag title with @smoke
- Use existing auth fixture; do not create a new login flow
- pnpm --filter web-e2e test:smoke passes in the agent environment
- No snapshots or visual baselines changed

## Out of scope
- Negative cases for corrupted PDFs
- Cross-browser matrix beyond Chromium
\`\`\`

### Task types that fit the agent well in QA repos

Strong early candidates:

- Add missing unit tests around pure helpers (date, retry, URL builders).
- Extend an existing page object and one smoke test for a small UI change.
- Fix a clearly described assertion mismatch after a known product copy change.
- Improve test diagnostics (better error messages) in a single helper module.
- Document or generate fixtures from a checked-in sample payload.

Defer to humans (or much tighter specs):

- Flaky test "just fix CI" without a failing log artifact.
- Broad POM redesigns across dozens of files.
- Security-sensitive auth bypasses or real credential handling.
- Ambiguous "increase coverage to 80%" goals.

### Assigning work

You can assign issues to Copilot on GitHub.com, Mobile, or CLI the same way you assign humans, or start tasks from the agents experience and VS Code flows GitHub documents. Prefer one coherent issue per PR. Bundling "fix login flake + add checkout tests + upgrade Playwright" creates unreviewable diffs.

## MCP for browser and API verification during agent sessions

GitHub documents that Copilot cloud agent can use Model Context Protocol (MCP) tools. The GitHub MCP server and Playwright MCP server are enabled by default in the coding agent context described in best-practices docs; repositories can configure additional MCP servers (see [Configure MCP servers for your repository](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/configure-mcp-servers)).

For QA teams:

- **Playwright MCP** helps the agent interact with pages when exploring behavior, not only when editing static files.
- **GitHub MCP** helps with issues, PR context, and repository metadata inside agent workflows.
- **Custom MCP** (internal test data services, feature flag readers) can reduce hallucinated environment state, but every server expands the trust boundary.

### Setup posture for MCP in testing orgs

1. Inventory which MCP servers are allowed by org policy.
2. Prefer read-oriented tools for production-like systems.
3. Never put long-lived personal access tokens in committed files; use documented secret and variable mechanisms for agent environments.
4. Document in instructions *when* the agent should use browser tools vs when it should only edit code and run headless CI commands.

MCP does not replace \`copilot-setup-steps.yml\`. Browsers still need to be installed for headless test execution even if an MCP server can drive a browser for exploration.

### Custom agents for recurring QA workflows

GitHub also documents **custom agents** (agent profiles as Markdown) for specialized, recurring workflows: for example a testing specialist limited toward test coverage work. Use custom agents when the same QA workflow repeats (coverage gaps, flake triage playbooks, docs-only test plans). Use repository instructions for universal rules that every agent session needs.

## Iteration loop: PR comments, CI feedback, rework

Agent PRs are not fire-and-forget. GitHub documents:

- Review the diff like a human PR.
- Mention \`@copilot\` in comments (write access required) to push follow-up commits.
- Batch review comments when possible so the agent addresses a full review, not one note at a time.
- You can also push your own commits to the branch.
- Copilot can help with merge conflicts in documented flows.

### QA-specific review checklist

| Check | Why it matters for test PRs |
| --- | --- |
| Commands in the PR match instructions | Drift means future agents learn the wrong gate |
| Specs use approved locators | CSS-heavy tests raise flake risk |
| No secrets or \`.env\` committed | Agents sometimes "helpfully" add local files |
| Tags and suite selection correct | \`@full\` on a smoke PR blows CI budgets |
| Fixtures are disposable | Hard-coded prod IDs fail other environments |
| CI logs green for the intended job | Title/body can lag; trust the workflow run |
| POM changes stay cohesive | Random new helper folders fragment the suite |

### Closing the loop into setup

Every time a review comment repeats ("always use getByRole", "never run full suite"), promote it into \`.github/instructions\` or \`AGENTS.md\`. The goal is fewer repeated comments over time. Setup is not a one-week project; it is a feedback flywheel.

## Environment secrets, firewalls, and private packages

Testing repositories often need more than public npm.

### Secrets and variables

Use GitHub's documented mechanisms for Copilot cloud agent secrets and variables rather than hardcoding credentials into instructions. Common QA needs:

- Package registry tokens for private \`@your-org\` packages.
- API keys for non-production test environments.
- Optional cloud browser or device farm credentials (prefer dedicated ephemeral credentials).

Principle: least privilege, non-production scopes, rotation policies identical to CI.

### Private dependencies

If install fails without auth, fix it in \`copilot-setup-steps.yml\` the same way CI authenticates. Instructions should say "dependencies install via setup steps" so the agent does not thrash on registry 401s.

### Firewall and network

Cloud agent environments include firewall controls you can customize or disable per GitHub docs. Self-hosted runners require careful egress allow lists, including hosts GitHub documents for Copilot APIs and uploads. QA teams using internal artifact hosts must allow those hosts explicitly or the agent will write tests it cannot execute.

## Decision matrix: when setup is "done enough"

Use this matrix in a team checklist. Ship incrementally; do not block all agent use until perfection.

| Capability | Minimum viable | Production-ready for QA agents | Overkill (defer) |
| --- | --- | --- | --- |
| Org policy | Agent enabled on one sandbox repo | Enabled on automation + app repos with clear ownership | Agent on every archival repo |
| \`copilot-instructions.md\` | Install + one test command | Multi-package command map + conventions + out-of-scope | Novel essays duplicated from wiki |
| Path instructions | None | Playwright + API packages covered | One file per folder with overlapping globs |
| \`AGENTS.md\` | Optional root file | Root + critical packages | Deep trees that contradict root |
| Setup workflow | Node/Python install | Browsers, caches, private registry auth | Full overnight suite in setup |
| MCP | Defaults | Defaults + approved internal tools | Unreviewed third-party servers |
| Issue templates | Ad hoc quality | Template with acceptance criteria | 20 required fields nobody fills |
| Metrics | Anecdote | Track merge rate, CI fail reasons, rework comments | Vanity "tests generated" counts |

**Ship gate for "we are ready":** three consecutive agent PRs that (1) run the intended suite in session or CI, (2) follow locator/fixture conventions without review nags, and (3) require only minor human edits.

## Validation walkthrough: first week plan for a QA lead

### Day 1: Access and sandbox

- Confirm policy on a non-critical fork or sandbox automation repo.
- Assign the throwaway unit-test issue.
- Record where it fails (policy, Actions, install, tests).

### Day 2: Setup workflow

- Author \`.github/workflows/copilot-setup-steps.yml\`.
- Merge to default branch; run manually.
- Align Node/Python versions with CI.

### Day 3: Instructions

- Write a tight \`.github/copilot-instructions.md\`.
- Add one Playwright path instruction if UI tests exist.
- Delete anything you cannot verify by running it yourself.

### Day 4: Real test task

- Assign a single smoke-spec issue with acceptance criteria.
- Review PR with the QA checklist.
- Promote repeated comments into instructions.

### Day 5: Team rollout

- Document who may assign the agent.
- Share the issue template.
- Decide metrics (merge rate, time-to-green, human edit size).
- Optionally install shared QA skill packs from qaskills.sh via the qaskills CLI for common patterns (locator rules, test plan shapes), then adapt them to your repo paths.

## Comparing instruction surfaces without mixing tools blindly

Teams often run Copilot plus other agents. Keep formats purposeful:

- **Copilot-native**: \`.github/copilot-instructions.md\` and \`.github/instructions/*.instructions.md\` with \`applyTo\`.
- **Cross-tool**: \`AGENTS.md\` nearest-file-wins (agents.md standard).
- **Other ecosystems**: Claude \`SKILL.md\` under skill directories, Cursor \`.cursor/rules\` with \`.mdc\` frontmatter (\`alwaysApply\`, \`globs\`, \`description\`), Gemini \`GEMINI.md\`.

Do not assume a Cursor rule file is automatically honored by Copilot cloud agent. Prefer documented Copilot paths for agent sessions on GitHub, and use \`AGENTS.md\` when you need a shared cross-tool baseline. For a structured comparison of skills, rules, and instructions, see [Claude skills vs Cursor rules vs Copilot instructions](/blog/claude-skills-vs-cursor-rules-vs-copilot-instructions).

## Anti-patterns that keep test agent PRs red

1. **Instructions that lie**: listing \`npm test\` when CI uses \`pnpm test:ci\`. Agents trust you.
2. **Setup that installs everything**: every browser, every package optional extra; slower sessions, more failure modes.
3. **Issues without a validation command**: "add some tests" yields random depth and no gate.
4. **Secret material in markdown**: tokens in instructions will leak into PRs and logs.
5. **Contradictory nested files**: root forbids full suite; package file says always run full suite.
6. **Skipping human review on test code**: generated tests can assert the wrong behavior confidently.
7. **Using the agent for flake archaeology without logs**: attach failure artifacts or accept weak results.
8. **Changing product code "to make tests pass"** when the issue was test-only: state boundaries in the issue.

## Reference: files and roles for a testing repository

| Path | Role in coding agent setup | Owner |
| --- | --- | --- |
| \`.github/copilot-instructions.md\` | Repo-wide build/test/convention guidance | QA lead + platform |
| \`.github/instructions/*.instructions.md\` | Glob-scoped framework rules (\`applyTo\`) | Framework specialists |
| \`AGENTS.md\` (root/nested) | Nearest-wins agent instructions | Monorepo package owners |
| \`CLAUDE.md\` / \`GEMINI.md\` | Optional root agent files also supported | Teams already on those tools |
| \`.github/workflows/copilot-setup-steps.yml\` | Pre-agent environment provisioning | CI/platform |
| Issue templates under \`.github/\` | Prompt quality for assignees | QA lead |
| CI workflows | Source of truth for real gates | CI/platform |
| MCP repository configuration | Extra tools for agent sessions | Security + platform |

## Putting it together: end-to-end story

Imagine a payments automation monorepo. Week zero, engineers assign "write checkout tests" and receive PRs that use CSS selectors, skip auth fixtures, and never run Playwright because browsers are missing. Week two, after this setup guide:

1. Setup steps install pnpm deps and Chromium on every agent session.
2. \`.github/copilot-instructions.md\` names \`pnpm --filter web-e2e test:smoke\` as the gate.
3. Path instructions enforce \`getByRole\` / \`getByTestId\` and existing fixtures.
4. Issues include acceptance criteria and out-of-scope lines.
5. Reviewers \`@copilot\` once with a batched list: rename test, tag \`@smoke\`, remove sleep.
6. Green CI merges; the next issue reuses the same rails.

That is what good **copilot coding agent setup** looks like in a **testing repository**: not a magic model upgrade, but an operable environment plus honest instructions plus disciplined assignment.

For deeper QA workflow patterns beyond repository setup (review habits, coverage strategy with agents, team rollout), continue with the [GitHub Copilot QA engineers deep guide](/blog/github-copilot-qa-engineers-deep-guide).

## Frequently Asked Questions

### Do I need both copilot-instructions.md and AGENTS.md?

Not always. Many testing repositories start with \`.github/copilot-instructions.md\` alone and add \`AGENTS.md\` when multiple coding agents must share one baseline or when monorepo packages need nearest-file overrides. GitHub's coding agent supports both, plus path-specific \`.instructions.md\` files. Prefer one clear home for each rule. If you maintain both, keep commands identical and use nested \`AGENTS.md\` for package-local detail rather than restating the entire root file.

### Why does the agent open PRs that never run browsers?

Usually the ephemeral environment never installed browser binaries or the instructions never named the install command. Add Playwright (or your stack's) install to \`.github/workflows/copilot-setup-steps.yml\`, merge it to the default branch, and verify the workflow manually from the Actions tab. Then state the smoke command in \`.github/copilot-instructions.md\`. Defaults and MCP browser tools do not replace a deterministic setup job for headless CI-style runs.

### Can path-specific instructions replace a solid issue prompt?

No. Path instructions encode durable conventions (locators, folder layout, tags). Issues encode the task: which behavior, which acceptance criteria, which suite must pass. GitHub's guidance emphasizes well-scoped tasks with clear definitions of done. The best results stack all three: environment setup, durable instructions, and a sharp issue body. Vague issues still produce vague tests even with perfect repository configuration.

### How do we stop the agent from editing production code during test tasks?

State the boundary in the issue ("test-only; do not change apps/") and reinforce it in instructions ("when the issue is test-only, limit edits to packages/*-e2e and fixtures"). Review the diff carefully before merge. Custom agents with tighter tool or workflow focus can help for recurring pure-test work, but humans remain the merge gate. If product fixes are required for a failing assertion, split that into a separate issue so ownership and CI risk stay clear.
`,
};
