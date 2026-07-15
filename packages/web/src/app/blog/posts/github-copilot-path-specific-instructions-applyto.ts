import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'GitHub Copilot Path-Specific Instructions: instructions.md Files and applyTo Explained',
  description:
    'Master GitHub Copilot path-specific instructions: .instructions.md files, applyTo globs, and QA-focused rules for tests, fixtures, and reviews.',
  date: '2026-07-15',
  category: 'Reference',
  content: `
# GitHub Copilot Path-Specific Instructions: instructions.md Files and applyTo Explained

Most QA teams discover GitHub Copilot custom instructions the wrong way: one giant \`.github/copilot-instructions.md\` that tries to teach the model about Playwright locators, pytest fixtures, API contract tests, and React components in a single wall of text. That file is still useful for repository-wide build and validation guidance. It is a poor fit when the rule you care about only applies when Copilot is editing \`*.spec.ts\`, reviewing a page object, or opening a PR that touches \`tests/e2e/**\`.

Path-specific custom instructions solve that routing problem. You place one or more \`NAME.instructions.md\` files under \`.github/instructions/\`, declare which paths they target with an \`applyTo\` frontmatter field (glob syntax), and optionally limit which agent surface may consume them with \`excludeAgent\`. When Copilot works on a matching file, those instructions are available alongside any repository-wide file. For QA engineers adopting AI coding agents, this is the difference between "please write a test" and "write a Playwright test the way this monorepo already does."

This reference is written for test automation engineers who want deterministic, file-scoped guidance for Copilot cloud agent and Copilot code review. It explains the documented layout, the \`applyTo\` frontmatter contract, realistic glob patterns for QA trees, how path-specific files combine with \`.github/copilot-instructions.md\` and \`AGENTS.md\`, and how to migrate bloated repo-wide instructions into targeted files without inventing undocumented keys. Official details live on [GitHub Docs: Adding repository custom instructions for GitHub Copilot](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions). For a broader Copilot-for-QA orientation, start with the [GitHub Copilot guide for QA engineers](/blog/github-copilot-qa-engineers-deep-guide). For generating Playwright suites with Copilot once path rules are in place, see [AI test generation with Playwright and Copilot](/blog/ai-test-generation-playwright-copilot).

## The three instruction layers Copilot can load in one repository

GitHub documents three repository custom instruction shapes that matter when you design a testing-aware setup:

1. **Repository-wide instructions** in \`.github/copilot-instructions.md\`. These apply to requests made in the context of the repository. Use them for project purpose, bootstrap/build/test commands, architecture maps, and rules that should always be true.
2. **Path-specific instructions** in one or more \`NAME.instructions.md\` files under \`.github/instructions/\` (subdirectories allowed). These apply when the path Copilot is working on matches the file's \`applyTo\` globs. Use them for framework-specific test rules, locator policy, fixture conventions, and review checklists that only matter for certain trees.
3. **Agent instructions** such as \`AGENTS.md\` anywhere in the tree (nearest file wins), or a root \`CLAUDE.md\` / \`GEMINI.md\` as alternatives for agent-oriented guidance.

Path-specific files do not replace repository-wide instructions. GitHub states that if a path matches and a repository-wide file also exists, instructions from both are used. That is the intended composition model: keep shared validation steps in \`copilot-instructions.md\`, and keep "how we write *this kind of file*" next to the path patterns that define those files.

For QA workflows that composition maps cleanly onto day-to-day work:

| Layer | Canonical location | Typical QA content | When it fires |
| --- | --- | --- | --- |
| Repo-wide | \`.github/copilot-instructions.md\` | Install, lint, unit, e2e, and CI commands; monorepo map; "always run X before PR" | Broad repository context |
| Path-specific | \`.github/instructions/**/*.instructions.md\` | Locator rules, fixture factories, page object shape, API test headers, flake policy | Matched file paths only |
| Agent files | \`AGENTS.md\` (nearest wins), optional root \`CLAUDE.md\` / \`GEMINI.md\` | Agent operating notes for a package or app | Agent work near that tree |

If you only maintain the first layer, Copilot will treat a Cypress component test, a Playwright e2e spec, and a pure unit test as if they shared one voice. Path-specific instructions are how you split that voice without forking the repository.

## Creating the path-specific file layout (exact documented steps)

GitHub's path-specific flow is mechanical. Follow it as documented rather than inventing alternate folder names.

1. Create \`.github/instructions\` if it does not exist.
2. Optionally create subdirectories under \`.github/instructions\` to organize files (for example by framework or package).
3. Create one or more files whose names end with \`.instructions.md\`. The prefix is free-form and should describe purpose: \`playwright-tests.instructions.md\`, \`api-contract.instructions.md\`, \`pytest-unit.instructions.md\`.
4. Start each file with a YAML frontmatter block that includes \`applyTo\` and a glob (or comma-separated globs).
5. Optionally add \`excludeAgent\` with either \`"code-review"\` or \`"cloud-agent"\` if only one surface should read the file.
6. Write the instruction body in Markdown natural language. Whitespace between instructions is ignored; structure is for humans.

A minimal, documented skeleton looks like this:

\`\`\`markdown
---
applyTo: "**/tests/*.spec.ts"
---

## Playwright test requirements

When writing Playwright tests, follow these repository rules:

1. Prefer getByRole, getByText, and getByTestId over CSS or XPath selectors.
2. Keep each test independent; do not rely on order or shared mutable state.
3. Use expect with specific matchers (toHaveText, toBeVisible) instead of generic truthiness checks.
4. Rely on Playwright auto-wait; do not insert setTimeout sleeps.
5. Put reusable selectors and flows in page objects or fixtures, not in every spec.
\`\`\`

That example is adapted from GitHub's own Playwright-oriented sample for path-specific instructions. The important mechanical parts are the filename suffix, the directory under \`.github/instructions\`, and the \`applyTo\` frontmatter key. Do not rename the key to \`appliesTo\`, \`paths\`, or \`globs\`. Do not put path-specific files at the repository root and expect them to behave as path-specific instructions; the documented home is \`.github/instructions\` (including nested folders under that directory).

### What "NAME.instructions.md" actually requires

Only the suffix is fixed. These are all valid names:

- \`.github/instructions/playwright-tests.instructions.md\`
- \`.github/instructions/e2e/checkout.instructions.md\`
- \`.github/instructions/qa/api-contracts.instructions.md\`

These are not path-specific instruction files in the documented sense:

- \`.github/playwright.md\` (wrong directory and wrong suffix)
- \`.github/instructions/playwright.md\` (missing \`.instructions.md\` suffix)
- \`tests/INSTRUCTIONS.md\` (wrong location for path-specific custom instructions)

Treat the naming rule as a filter, not a suggestion. Copilot's discovery is built around \`.github/instructions/**/*.instructions.md\`.

## applyTo frontmatter: the contract that routes QA rules

\`applyTo\` is a frontmatter field at the top of a path-specific file. Its value is one or more glob patterns. GitHub documents comma separation for multiple patterns:

\`\`\`markdown
---
applyTo: "**/*.ts,**/*.tsx"
---
\`\`\`

And a single-pattern form:

\`\`\`markdown
---
applyTo: "app/models/**/*.rb"
---
\`\`\`

### Documented glob semantics (use these, not inventing new ones)

GitHub publishes concrete examples. Memorize them before designing a QA tree:

| Pattern | Matches | Does not match (per docs examples) |
| --- | --- | --- |
| \`*\` | All files in the current directory | Nested paths (as with ordinary glob "current dir only") |
| \`**\` or \`**/*\` | All files in all directories | (broad match; use carefully) |
| \`*.py\` | All \`.py\` files in the current directory | Nested \`.py\` files |
| \`**/*.py\` | All \`.py\` files recursively | Non-\`.py\` files |
| \`src/*.py\` | \`src/foo.py\`, \`src/bar.py\` | \`src/foo/bar.py\` |
| \`src/**/*.py\` | \`src/foo.py\`, \`src/foo/bar.py\`, \`src/foo/bar/baz.py\` | Files outside \`src\` |
| \`**/subdir/**/*.py\` | Any depth under a \`subdir\` directory | A top-level \`foo.py\` with no \`subdir\` segment |

Those examples are enough to design most testing layouts. Prefer explicit recursive globs over vague stars. For monorepos, anchor on package roots:

\`\`\`markdown
---
applyTo: "packages/web/e2e/**/*.spec.ts,packages/web/e2e/**/*.test.ts"
---
\`\`\`

### Multiple patterns and overlapping instruction files

You can put several patterns in one file, or several files with overlapping globs. Overlap is legal. When multiple path-specific files match, treat that as a design smell if their rules conflict (for example one file says "always use data-testid" and another says "never use data-testid"). Prefer composition by concern:

- One file for locator and assertion policy on e2e specs.
- One file for fixture and factory conventions under \`tests/support/**\`.
- One file for API contract tests under \`tests/api/**\`.

If two files must both apply, make them additive: one owns structure, the other owns anti-flake rules. Do not restate the entire Playwright handbook in every overlapping file; context windows are finite even when multiple instruction sources are allowed.

### excludeAgent: routing between cloud agent and code review

GitHub documents an optional frontmatter key \`excludeAgent\` with two string values: \`"code-review"\` or \`"cloud-agent"\`. If omitted, both Copilot code review and Copilot cloud agent use the instructions. If set, the named surface is excluded.

Example from the docs (cloud agent only):

\`\`\`markdown
---
applyTo: "**"
excludeAgent: "code-review"
---
\`\`\`

For QA teams this is more useful than it first looks:

| Goal | Suggested frontmatter idea | Rationale |
| --- | --- | --- |
| Teach the agent how to *write* new Playwright specs | \`applyTo\` on \`**/*.spec.ts\`, no exclude (or exclude code-review if generation-only) | Generation needs constructive style rules |
| Teach reviewers how to *flag* missing waits and hard-coded sleeps | Separate file with review-oriented checklist; exclude cloud-agent if the checklist is review-only noise during generation | Review checklists can be long and negative |
| Keep flaky-test recovery steps out of PR review comments | \`excludeAgent: "code-review"\` | Recovery runbooks help agents, not always reviewers |

Do not invent additional \`excludeAgent\` values. Stick to the two documented strings.

## Feature support: what path-specific instructions actually power today

Documentation is explicit that path-specific custom instructions on GitHub.com are currently supported for **Copilot cloud agent** and **Copilot code review**. Repository-wide \`.github/copilot-instructions.md\` has broader day-to-day use across Copilot surfaces, but path-specific files are not a universal "every Copilot panel everywhere" guarantee. Design your investment accordingly:

- Put rules that must apply when an agent opens a PR or when code review runs into \`.instructions.md\` files with careful \`applyTo\` patterns.
- Keep universal build/test command truth in \`.github/copilot-instructions.md\`.
- For IDE chat sessions, verify in your environment which instruction types are attached; expand the references list on a response when available and look for the instruction files you expect.

GitHub also notes priority across personal, repository, and organization instructions: personal instructions take the highest priority, then repository, then organization, while all relevant sets may still be provided. Path-specific files are a repository mechanism; they do not cancel personal instructions. Avoid conflicts between a personal "always use CSS selectors" habit and a repository "prefer role locators" rule if your team wants consistent PRs.

When code review uses custom instructions, GitHub documents that the base branch's instructions apply. If your PR merges into \`main\`, review uses the instruction files as they exist on \`main\`, not only as they exist on the feature branch. That has a practical QA implication: instruction changes that should affect review need to land on the base branch (or whatever your default merge target is) before you expect every PR review to honor them.

## A QA-first applyTo map for real test trees

Abstract globs are useless until they map to the folders your pipelines already know. The table below is a practical decision matrix for common automation layouts. Adjust paths to match your monorepo; keep the idea of one concern per file.

| Test concern | Example applyTo patterns | Instruction body should emphasize | Agent surface focus |
| --- | --- | --- | --- |
| Playwright e2e specs | \`"**/e2e/**/*.spec.ts"\`, \`"**/tests/*.spec.ts"\` | Role locators, isolation, expect matchers, no sleeps | Cloud agent + code review |
| Playwright fixtures / helpers | \`"**/fixtures/**/*.ts"\`, \`"**/test-support/**/*.ts"\` | Factory purity, cleanup, shared auth setup | Cloud agent primary |
| Page objects | \`"**/pages/**/*.ts"\`, \`"**/page-objects/**/*.ts"\` | One page class per surface, public methods as user actions, locators private | Both |
| API / contract tests | \`"**/api/**/*.test.ts"\`, \`"**/contract/**/*.spec.ts"\` | Status + schema assertions, auth headers from fixtures, no UI coupling | Both |
| Unit tests (Jest/Vitest) | \`"**/*.{test,spec}.{ts,tsx}"\` with careful exclusion of e2e dirs if needed | Arrange-act-assert, mock boundaries, no real network | Both |
| pytest | \`"**/tests/**/*.py"\`, \`"**/test_*.py"\` | Fixture scope, parametrize, marker usage | Both |
| CI workflow files | \`".github/workflows/**/*.yml"\` | Caching, artifact upload on failure, matrix strategy | Cloud agent primary |

Notice the last row: path-specific instructions are not limited to "source code that is a test." If Copilot edits a workflow that runs your suite, you can apply instructions that say "upload Playwright traces on failure" or "do not drop the browser install step." That is still path-specific guidance, just aimed at the automation that *runs* tests.

### Example: monorepo with web e2e and API contract suites

\`\`\`markdown
---
applyTo: "apps/storefront/e2e/**/*.spec.ts,apps/storefront/e2e/**/*.ts"
---

# Storefront Playwright conventions

- Specs live under apps/storefront/e2e and import fixtures from apps/storefront/e2e/fixtures.
- Prefer getByRole and getByTestId; ban page.locator with brittle CSS chains for primary assertions.
- Every failure-prone step that waits for navigation must use Playwright navigation helpers, not arbitrary delays.
- Tag smoke tests with @smoke so CI can run a subset on pull requests.
- Never commit credentials; pull secrets from the documented fixture that reads environment variables.

# Validation after changes

- From apps/storefront, run the documented Playwright project command for chromium smoke first.
- If you change a shared fixture, run at least one smoke and one non-smoke spec that imports it.
\`\`\`

Pair that with a second file for API contracts so the agent does not import Playwright when editing pure HTTP tests:

\`\`\`markdown
---
applyTo: "packages/api/tests/contract/**/*.test.ts"
---

# API contract test conventions

- Use the shared HTTP client factory; do not construct raw fetch clients in each test.
- Assert status codes and response schema, not HTML content.
- Seed data through the documented test API helpers; do not drive the UI to create prerequisites.
- Name tests after the OpenAPI operation id when one exists.
\`\`\`

## Writing instruction bodies that change test output (not just style)

An \`applyTo\` match is wasted if the body is vague ("write good tests"). Path-specific files for QA should encode decisions your team already made in code review, usually in four buckets:

1. **Locator and selector policy** for UI automation.
2. **Isolation and data setup** for fixtures and factories.
3. **Assertion style** (what "done" looks like for a scenario).
4. **Validation commands** the agent should run after edits (when those commands differ by package).

### Locator policy that survives code review

Bad path-specific body:

\`\`\`markdown
Use good selectors and avoid flaky tests.
\`\`\`

Better path-specific body:

\`\`\`markdown
Locator priority for this tree:

1. getByRole with accessible name
2. getByLabel for form fields
3. getByTestId only when the product team owns a stable data-testid
4. CSS/XPath only as a last resort, and only inside page objects, never in raw specs

Forbidden patterns in specs:

- page.waitForTimeout
- hardcoded sleeps
- selectors that depend on CSS framework class names
- tests that click by nth-child indexes
\`\`\`

The second version gives Copilot cloud agent something to obey when generating a new checkout flow, and gives Copilot code review something concrete to flag when a human (or the agent) violates the list.

### Fixture and factory rules that prevent shared state bugs

\`\`\`markdown
---
applyTo: "**/e2e/fixtures/**/*.ts"
---

# Fixture rules

- Prefer Playwright fixture composition over global beforeAll mutable state.
- Each test receives its own authenticated context when the scenario requires login.
- Cleanup must reverse created records when the product API supports deletion; otherwise mark data with a unique prefix and document the scrub job.
- Do not store secrets in fixture source; read from environment variables documented in the package README.
\`\`\`

### Assertion and flake policy for review

Review-oriented instruction files can be more checklist-like. If the checklist is noisy during generation, exclude the cloud agent:

\`\`\`markdown
---
applyTo: "**/*.spec.ts"
excludeAgent: "cloud-agent"
---

# Code review checklist for e2e specs

Flag these as problems:

1. Missing assertion after a navigation or form submit
2. Reliance on networkidle as the primary wait strategy when a UI signal exists
3. Tests that depend on another test file having run first
4. Screenshots without a failure condition (noise) or missing traces on failure configuration notes when CI is edited
5. Hard-coded environment URLs instead of baseURL configuration
\`\`\`

## Composing path-specific files with copilot-instructions.md

Think of \`.github/copilot-instructions.md\` as the **operating system** of the repository and path-specific files as **drivers** for particular file types.

Put in the repo-wide file:

- What the product is and which packages exist.
- Bootstrap and install steps that always apply.
- Canonical commands for unit, integration, and e2e suites at a high level.
- CI expectations and any "always run before claiming done" validation.
- Links or paths to deeper docs without dumping every framework rule.

Put in path-specific files:

- Framework idioms (Playwright vs Cypress vs pytest).
- File naming and folder placement for new tests.
- Locator / mock / fixture policies.
- Review checklists that only make sense for matching paths.

### Migration pattern: carve the monolith

Teams often start with a single \`copilot-instructions.md\` that has grown past two pages. GitHub even encourages keeping generated repo-wide instructions relatively short when onboarding cloud agent. A practical migration for QA content:

1. Inventory headings in the existing file that only apply to one language or one test runner.
2. Create \`.github/instructions/<concern>.instructions.md\` with a tight \`applyTo\`.
3. Move those headings into the new file.
4. Leave a one-line pointer in the repo-wide file ("Playwright rules live in path-specific instructions under .github/instructions/") if humans still read the main file.
5. Open a PR that only migrates instructions, then assign a small test-generation task to Copilot cloud agent and inspect whether the new rules show up in behavior and references.

During migration, avoid contradictory leftovers. If the old file said "prefer CSS selectors" and the new Playwright file says "prefer roles," delete the old sentence. Composition means both files can be used together; it does not mean conflicts magically resolve in your favor.

## How path-specific instructions interact with AGENTS.md and other agent files

GitHub documents that Copilot cloud agent can also use \`AGENTS.md\` files stored anywhere in the repository, with the nearest file in the directory tree taking precedence, and that root \`CLAUDE.md\` or \`GEMINI.md\` are alternatives. Path-specific \`.instructions.md\` files are a different mechanism: they are glob-routed via \`applyTo\` under \`.github/instructions\`, not nearest-directory routing.

For a QA monorepo, a coherent strategy looks like this:

| Mechanism | Strength | Weakness for testing work | Use together? |
| --- | --- | --- | --- |
| \`.github/copilot-instructions.md\` | Always-on project truth | Gets bloated with per-framework rules | Yes: keep it short |
| \`.github/instructions/*.instructions.md\` | Precise file-type routing with applyTo | Support surfaces are focused on cloud agent and code review | Yes: primary home for framework rules |
| \`AGENTS.md\` (nearest wins) | Package-local agent operating notes | Not a substitute for applyTo globs | Yes: package boot notes |
| Skills / reusable prompts outside GitHub | Portable across agents | Not automatic Copilot path routing | Yes: install QA skills where your agents load them |

If you standardize skills for Playwright generation, API mocking, or flake triage, you can still keep Copilot path-specific files as the GitHub-native enforcement layer for this repository. Ready-made QA skills can be installed from [qaskills.sh](https://qaskills.sh) with the qaskills CLI when you want the same playbooks available to other coding agents that read skill packages, while \`applyTo\` files remain the repo-local Copilot routing layer.

## Debugging: when path-specific instructions seem ignored

When an agent still writes \`waitForTimeout\` after you banned it, work through this checklist before assuming the feature is broken.

### 1. Confirm filename and directory

The file must live under \`.github/instructions/\` (optionally nested) and end with \`.instructions.md\`. A typo like \`.instruction.md\` (singular) or a file under \`docs/instructions/\` will not participate in the documented path-specific mechanism.

### 2. Confirm frontmatter parsing

Frontmatter must be at the start of the file, delimited by \`---\` lines, and must include \`applyTo\`. Invalid YAML or a missing closing fence can prevent the block from being interpreted as intended. Keep the frontmatter small: only documented keys (\`applyTo\`, and optionally \`excludeAgent\`).

### 3. Confirm the glob actually matches the file being edited

A pattern of \`tests/*.spec.ts\` does not match \`tests/e2e/checkout.spec.ts\`. Prefer recursive forms when your tree is nested: \`tests/**/*.spec.ts\`. Test globs mentally against real paths from your repository.

### 4. Confirm the surface supports path-specific files

If you are only looking at a chat panel that does not attach path-specific repository instructions the way cloud agent or code review does, you may be evaluating the wrong surface. GitHub documents path-specific support for Copilot cloud agent and Copilot code review on GitHub.com. Validate on those surfaces first.

### 5. Confirm base branch for code review

For PR review, instructions come from the base branch. A feature branch that adds a new \`.instructions.md\` file will not change review behavior for that same PR's base until the instructions exist on the base branch.

### 6. Confirm excludeAgent is not filtering you out

If you set \`excludeAgent: "cloud-agent"\` while testing generation tasks, the agent will not see the file. The reverse is true for review-only experiments.

### 7. Confirm repository settings for code review

Custom instructions for Copilot code review can be toggled in repository settings under Copilot code review ("Use custom instructions when reviewing pull requests"). If that is disabled, review will not use your custom instructions regardless of how perfect the globs are.

### 8. Confirm you are not drowning the model in contradictions

If repo-wide, path-specific, organization, and personal instructions disagree, quality drops. Temporarily simplify: one path-specific file with three crisp rules often outperforms five overlapping essays.

A practical validation loop for QA leads:

\`\`\`bash
# From a clean checkout of the base branch you care about
ls -la .github/instructions
# Confirm every file ends with .instructions.md
find .github/instructions -type f -name '*.instructions.md' -print

# Spot-check frontmatter (human review)
# Ensure applyTo globs match real paths in the repo, for example:
find apps -type f -name '*.spec.ts' | head
find packages -type f -name 'test_*.py' | head
\`\`\`

Then assign a narrowly scoped cloud agent task that *must* touch a matching path ("Add a Playwright smoke test for the forgot-password form under apps/storefront/e2e") and inspect the resulting diff for the rules you encoded.

## Sample catalog: five path-specific files a QA org can adopt

Use this catalog as a starting kit. Rename paths to match your repository. Keep each body short enough that a human can review it in a pull request.

### 1) Playwright specs

\`\`\`markdown
---
applyTo: "**/e2e/**/*.spec.ts,**/e2e/**/*.test.ts"
---

# Playwright specs

- One user journey per test; avoid multi-act epics unless tagged @journey.
- Prefer getByRole / getByLabel / getByTestId in that order.
- Use expect auto-waiting matchers; do not assert on page.content string dumps.
- Import shared fixtures; do not reimplement login in every file.
- Name files after the product area: checkout.spec.ts, not test1.spec.ts.
\`\`\`

### 2) Page objects

\`\`\`markdown
---
applyTo: "**/e2e/pages/**/*.ts,**/page-objects/**/*.ts"
---

# Page object rules

- Export a class or factory per page or major component.
- Keep locators private; expose user-level methods (submitOrder, openProfile).
- Do not include assertions inside navigation helpers unless the helper is explicitly a "wait for page ready" method.
- Avoid dumping entire pages into a single god object; split by product surface.
\`\`\`

### 3) Unit tests for React components

\`\`\`markdown
---
applyTo: "**/src/**/*.test.tsx,**/src/**/*.spec.tsx"
---

# Component unit tests

- Test behavior through the public UI (roles and labels), not internal state variables.
- Mock network boundaries; do not hit real backends from unit tests.
- Prefer user-event style interactions when the project already uses that library.
- Co-locate tests next to components unless the package standard says otherwise.
\`\`\`

### 4) pytest service tests

\`\`\`markdown
---
applyTo: "**/tests/**/test_*.py,**/tests/**/*_test.py"
---

# pytest conventions

- Use fixtures for setup; prefer function scope unless a documented session-scoped resource is required.
- Parametrize edge cases instead of copying test functions.
- Mark slow integration tests so unit jobs can exclude them.
- Assert on meaningful fields; avoid full blob equality unless schema tests require it.
\`\`\`

### 5) GitHub Actions that run tests

\`\`\`markdown
---
applyTo: ".github/workflows/**/*test*.yml,.github/workflows/**/*e2e*.yml"
---

# CI workflow rules for test jobs

- Install browser dependencies when Playwright is involved; do not drop the install step to "speed up" CI without measuring flakes.
- Upload traces, screenshots, or junit reports on failure using the project's existing artifact patterns.
- Keep secrets in GitHub Actions secrets; never echo them.
- Prefer reusable workflows or composite actions already in the repo over pasting new brittle scripts.
\`\`\`

## Decision matrix: one file, many files, or stay repo-wide only

| Situation | Prefer | Why |
| --- | --- | --- |
| Single package, one runner, thin rules | Repo-wide only, or one path-specific file | Less machinery to maintain |
| Multiple runners (Playwright + pytest + contract tests) | Multiple path-specific files | Different idioms, different globs |
| Rules needed only during PR review | Path-specific + \`excludeAgent: "cloud-agent"\` | Keeps generation prompts lean |
| Rules needed only when the agent writes code | Path-specific + \`excludeAgent: "code-review"\` | Keeps review comments focused |
| Package-specific boot steps and gotchas | \`AGENTS.md\` near the package | Nearest-file wins for agent notes |
| Org-wide compliance language | Organization instructions (separate from path-specific) | Applies beyond one repo |

If you are unsure, start with **one** path-specific Playwright file and a slim repo-wide file. Expand only when a second framework or a second concern creates real conflicts.

## Worked scenario: agent task vs code review on the same PR

Imagine a storefront PR that adds a "save payment method" checkbox.

**Cloud agent task prompt (issue body):** "Add a Playwright smoke test covering save payment method on checkout. Follow repository test conventions."

With a matching \`.instructions.md\`, the agent should:

- Create or update a file under the e2e tree that matches \`applyTo\`.
- Reuse login fixtures instead of inventing a new auth hack.
- Prefer role-based locators for the checkbox and save button.
- Run the smoke project if the repo-wide instructions document the command.

**Code review** on that PR, if review uses custom instructions from the base branch, can additionally load a review-oriented path-specific file that flags missing assertions after submit or the reintroduction of \`waitForTimeout\`.

That split is the operational win: generation rules and review rules can share \`applyTo\` patterns while using \`excludeAgent\` to avoid forcing one surface to read the other's tone.

## Anti-patterns that burn QA teams

1. **One mega applyTo: "\`**/*\`"** with a novel-length body.** You recreated \`copilot-instructions.md\` under a new name. Split by concern.
2. **Globs that only match yesterday's folder layout.** After a monorepo move, update \`applyTo\` in the same PR that moves tests.
3. **Instruction files that invent secret CLI flags or fake config keys.** Stick to commands your README and CI already run.
4. **Copy-pasting the same essay into five files.** Overlap should be intentional and small.
5. **Putting path-specific content only on a long-lived feature branch.** Review reads the base branch; merge instruction infrastructure early.
6. **Assuming path-specific files replace personal or organization instructions.** They compose; they do not erase higher-priority personal guidance.
7. **Writing rules as slogans.** "Be careful with flakes" is not a rule. "Do not use page.waitForTimeout" is a rule.

## Measuring whether applyTo work is paying off

You do not need a data science project. Track a few signals for two sprints after introducing path-specific files:

- Percentage of agent-generated test PRs that pass CI on the first or second push.
- Number of review comments that repeat the same locator or wait rule (should fall if review instructions and human reviewers align).
- Time spent rewriting agent tests for style rather than product coverage (should fall).
- Count of conflicting instructions found during a quarterly cleanup (should stay low if owners are assigned).

Assign an owner per instruction file the same way you own a pipeline. Untouched instruction files rot as folders rename and runners upgrade.

## Connecting path-specific instructions to a broader Copilot QA practice

Path-specific files are one sharp tool inside a larger practice: issue quality, environment setup for cloud agent, MCP tools for browsers, and human review standards. If your team is still building that practice, start from the end-to-end Copilot-for-QA workflow (linked in the introduction), then move into Playwright-focused generation once path rules exist. Path-specific \`applyTo\` rules are what keep those generation sessions from inventing a second test style beside the one your pipeline already enforces.

For multi-agent shops, keep GitHub-native files for Copilot surfaces, and keep portable QA skills in a skill directory when other agents need the same playbooks. Installing curated skills from qaskills.sh via the qaskills CLI is a practical way to share non-Copilot-specific procedures (flake triage templates, API contract checklists) without stuffing every agent format into \`.github/instructions\`.

## Reference: minimal frontmatter cheatsheet

| Field | Required? | Documented values / shape | Notes |
| --- | --- | --- | --- |
| \`applyTo\` | Yes for path-specific use | Glob string; multiple globs comma-separated | Primary routing mechanism |
| \`excludeAgent\` | No | \`"code-review"\` or \`"cloud-agent"\` | Omitting means both surfaces may use the file |

Body: Markdown natural language. No proprietary schema beyond frontmatter is required for basic use. Prefer short, imperative rules over narrative essays.

## Putting it all together in a pull request checklist

When a QA engineer opens a PR that only adds or updates path-specific instructions, reviewers can use a short checklist:

1. Files live under \`.github/instructions/\` and end with \`.instructions.md\`.
2. Frontmatter includes \`applyTo\` with globs tested against real paths.
3. \`excludeAgent\` is present only when intentionally scoping a surface.
4. Body rules are concrete and match existing lint/CI reality.
5. No contradictions with \`.github/copilot-instructions.md\`.
6. If review behavior should change immediately for future PRs, plan the merge order so the base branch receives instructions before relying on them in review.
7. A smoke agent task or a sample review on a draft PR validates the change.

That checklist keeps instruction PRs as rigorous as test code PRs. Treat prompt infrastructure as product code: reviewed, owned, and versioned.

## Frequently Asked Questions

### Where do I put path-specific GitHub Copilot instruction files and what must they be named?

Place them under \`.github/instructions/\` in the repository, including optional subdirectories for organization. Each file name must end with \`.instructions.md\`. The prefix can describe the concern, such as \`playwright-tests.instructions.md\`. Start the file with YAML frontmatter that includes \`applyTo\` and a glob pattern for the files those instructions should cover. This layout is separate from the single repository-wide \`.github/copilot-instructions.md\` file, which remains the place for always-on project guidance.

### How does applyTo decide when my QA rules are included?

\`applyTo\` accepts glob patterns in the frontmatter of a path-specific file. When Copilot works on a file path that matches those patterns, the instructions in that file are available for supported surfaces. You can list multiple patterns by separating them with commas. Use recursive globs like \`**/*.spec.ts\` when tests nest in subfolders. If a repository-wide \`copilot-instructions.md\` also exists, GitHub documents that both the matching path-specific instructions and the repository-wide instructions are used together, so keep them complementary rather than contradictory.

### Can I limit a file to Copilot cloud agent or only to code review?

Yes. GitHub documents an optional \`excludeAgent\` frontmatter field. Set it to \`"code-review"\` to prevent code review from using the file, or to \`"cloud-agent"\` to prevent the cloud agent from using it. If you omit \`excludeAgent\`, both Copilot code review and Copilot cloud agent may use the instructions. This is useful when generation guidance and review checklists should not share the same tone or length for the same \`applyTo\` paths.

### Do path-specific instructions work for every Copilot feature in the IDE?

On GitHub.com, documentation currently calls out path-specific custom instructions support for Copilot cloud agent and Copilot code review. Repository-wide instructions in \`.github/copilot-instructions.md\` are still the primary always-on file for broader repository guidance. For code review, remember that Copilot uses custom instructions from the pull request's base branch, and repository settings can enable or disable custom instructions for reviews. Validate behavior on the surfaces you care about, and keep universal build and test commands in the repository-wide file so every agent workflow still has a reliable baseline.
`,
};
