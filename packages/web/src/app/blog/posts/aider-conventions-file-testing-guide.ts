import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Aider Conventions Files: Configuring AI Pair Programming for Testing',
  description:
    'Master aider conventions file setup for QA: CONVENTIONS.md, .aider.conf.yml read, test-cmd, and Playwright rules that keep AI-written tests reliable.',
  date: '2026-07-15',
  category: 'Guide',
  content: `
# Aider Conventions Files: Configuring AI Pair Programming for Testing

Most QA engineers meet Aider the same way they meet a new junior automation hire: the first hour looks magical, then a generated Playwright suite starts using the wrong assertion library, hardcoding sleep calls, and inventing page objects that do not match your framework. The fix is not a longer chat prompt. The fix is a durable conventions file that Aider loads as read-only context on every session.

This guide is a complete map of **aider conventions file setup** for test automation work. You will learn how Aider injects convention markdown into the edit loop, how to encode Playwright and API-test standards without inventing fake CLI flags, how to pair conventions with \`test-cmd\` and \`auto-test\`, and how to keep the file short enough that the model still has room for your failing specs. Official docs live at [https://aider.chat/docs/usage/conventions.html](https://aider.chat/docs/usage/conventions.html) and [https://aider.chat/docs/config/aider_conf.html](https://aider.chat/docs/config/aider_conf.html). For a broader QA-oriented tour of the tool itself, see the companion piece [Aider for QA engineers](/blog/aider-qa-engineers-guide). If you already maintain Claude skills, Cursor rules, or Copilot instruction packs, treat this as the Aider-native equivalent with a different loading model; the multi-agent comparison section later covers how these systems differ. Ready-made QA skills for agent workflows can also be installed from qaskills.sh with the qaskills CLI when you want reusable testing recipes beyond a single conventions file.

## What a conventions file actually is inside Aider's chat loop

Aider does not invent a proprietary convention schema. A conventions file is ordinary markdown (or plain text) that you add to the chat as **read-only** context. The docs use the filename \`CONVENTIONS.md\` as the running example, but the important part is the load path, not the exact basename. You can keep \`CONVENTIONS.md\` at the repo root, or maintain several topic files and list them under \`read\` in \`.aider.conf.yml\`.

When you load a file with \`/read CONVENTIONS.md\` or \`aider --read CONVENTIONS.md\`, Aider marks it read-only. That does two things for QA work:

1. The model can consult the rules while editing test files, but it should not rewrite the rules mid-session by accident.
2. If prompt caching is enabled, the conventions payload is a good candidate for caching, because it changes far less often than the failing test under repair.

Without a conventions file, Aider still has the repo map and whatever editable files you add. That is enough for small scripts. It is not enough for a mature suite where "how we write tests here" is tribal knowledge: locator strategy, fixture ownership, when to mock the network, how flakes are triaged, and which assertion helpers are approved.

Think of the conventions file as the **acceptance criteria for generated tests**, written once, applied every session. Your chat message can stay short: "fix the flake in \`checkout.spec.ts\`." The long-lived rules about retries, network idle, and data factories live in the conventions file instead of being retyped into every prompt.

## The three load paths: chat, CLI, and .aider.conf.yml

Aider gives you three practical ways to attach conventions. Use all three deliberately; they solve different workflow moments.

### Path 1: interactive \`/read\` during a debugging session

You already have Aider open against a failing suite. Drop conventions into the active chat:

\`\`\`bash
/read CONVENTIONS.md
/read testing/PLAYWRIGHT_RULES.md
\`\`\`

This path is ideal when you are exploring a new module and only want QA rules for that branch of work. You can also \`/drop\` files later if the context window gets crowded. Interactive load is the fastest way to A/B test whether a rule is too strict before you promote it into config.

### Path 2: \`--read\` on launch for a focused pair session

From the shell, start Aider with the conventions already attached and the target test file editable:

\`\`\`bash
aider --read CONVENTIONS.md tests/e2e/checkout.spec.ts
\`\`\`

Or load multiple read-only files:

\`\`\`bash
aider --read CONVENTIONS.md --read testing/API_CONTRACTS.md \\
  tests/api/orders.test.ts src/orders/service.ts
\`\`\`

This pattern mirrors how you would brief a human pair: "Here is our testing handbook, here is the failing test, here is the production code under test." Keep the editable set tight. Aider performs better when the chat is not flooded with unrelated pages.

### Path 3: always-on \`read\` in \`.aider.conf.yml\`

For team defaults, put the conventions list in Aider's YAML config. Aider looks for \`.aider.conf.yml\` in your home directory, the git repo root, and the current directory (later files override earlier ones). Documented list syntax:

\`\`\`yaml
# always attach QA conventions as read-only context
read:
  - CONVENTIONS.md
  - testing/PLAYWRIGHT_RULES.md
  - testing/API_TEST_RULES.md
\`\`\`

Comma-and-brackets form is also valid:

\`\`\`yaml
read: [CONVENTIONS.md, testing/PLAYWRIGHT_RULES.md, testing/API_TEST_RULES.md]
\`\`\`

That is the canonical **aider conventions file setup** for a team: one repo-root config, shared markdown rules, no one has to remember CLI flags after onboarding.

| Load path | Best for | Stays across restarts | Risk if misused |
| --- | --- | --- | --- |
| \`/read\` in chat | Experimenting with a new rule set | No (chat only) | Forgetting to re-add after \`/clear\` |
| \`aider --read\` | Scripted local sessions, CI-ish one-shots | Only if your shell alias includes it | Drift between teammates' aliases |
| \`.aider.conf.yml\` \`read:\` | Team baseline conventions | Yes | Bloated always-on context if files grow huge |

## Designing CONVENTIONS.md for a real test automation repo

Generic "prefer types" bullets help, but QA teams need conventions that encode **how tests fail in production**. Write the file as if a contractor will only see this document and a failing CI log.

A practical top-level structure for a Node + Playwright monorepo:

\`\`\`markdown
# Test automation conventions (Aider)

## Scope
- These rules apply when editing \`tests/**\`, \`e2e/**\`, and \`**/fixtures/**\`.
- Prefer fixing the test design over silencing the assertion.

## Stack defaults
- E2E: Playwright Test runner and \`@playwright/test\` expect API.
- Unit/integration: Vitest (or Jest if the package already uses it). Do not introduce a second runner in the same package.
- HTTP contract tests: use the shared client in \`tests/helpers/apiClient.ts\`. Do not raw-fetch in specs.

## Locators
- Prefer \`getByRole\`, \`getByLabel\`, \`getByTestId\` in that order.
- Never use CSS selectors that encode layout classes from the design system.
- Do not use \`page.waitForTimeout\`. Prefer locator assertions and \`expect(...).toBeVisible()\`.

## Data and isolation
- Create test data through factories in \`tests/factories\`.
- Each test must clean up or use unique IDs. No shared mutable state across tests.
- Do not depend on seed data that only exists on one engineer's laptop.

## Flakes
- Treat network-dependent assertions as explicit: wait for response or UI signal, never sleep.
- If a test needs a retry, document why in a one-line comment above the test.
- Do not set global retries to hide product bugs.

## Review bar for AI edits
- Diffs should keep existing page objects unless the task is a deliberate refactor.
- New helpers must live next to existing helpers, not as one-off functions inside a single spec.
\`\`\`

Notice what is **not** in that file: model names, API keys, or Aider CLI trivia. Those belong in \`.aider.conf.yml\` or environment config. The conventions file is about **code the model will write**, not about how Aider connects to a provider.

### Rule density: specific enough to constrain, short enough to obey

Models follow dense rules poorly when every paragraph is a novel. Prefer imperative bullets with examples of forbidden patterns. A strong line looks like:

- Bad: "Please try to write good Playwright tests."
- Good: "Never call \`page.waitForTimeout\`. Use \`await expect(locator).toBeVisible()\` or wait for a response event."

Aim for a file that a senior SDET can skim in two minutes. If a topic needs a full design doc, link out from a one-line pointer rather than pasting the entire design doc into always-on context.

## Encoding Playwright generation rules without fighting the model

Playwright is the highest-leverage place for conventions because the default model prior (sleeps, brittle CSS, \`querySelector\` everywhere) is exactly what modern Playwright docs discourage. Your conventions should pull the model toward the documented Playwright Test style.

Useful Playwright-oriented bullets:

\`\`\`markdown
## Playwright Test style
- Import from \`@playwright/test\` only. Do not mix Puppeteer APIs.
- Use \`test.describe\` / \`test\` / \`test.beforeEach\` from Playwright, not ad-hoc wrappers unless already present in the folder.
- Prefer web-first assertions: \`await expect(page.getByRole('button', { name: 'Pay' })).toBeEnabled()\`.
- Capture traces on retry via project config; do not invent custom screenshot helpers per test.
- Prefer \`storageState\` for authenticated flows when the suite already uses it.
- For multi-page flows, keep one responsibility per test. Split "login" from "checkout" unless the task is an end-to-end journey test.
\`\`\`

When you ask Aider to "add a test for applying a coupon," a well-loaded conventions file biases the first draft toward role-based locators and expect assertions. Without it, you often get CSS soup and manual timing.

### Cypress shops: same idea, different verbs

If your suite is Cypress, swap the stack section. Do not leave Playwright rules in a Cypress repo; mixed signals produce hybrid code no runner accepts.

\`\`\`markdown
## Cypress style
- Use \`cy.session\` for login when the project already enables it.
- Prefer \`data-cy\` attributes already present in the app. Do not invent new attributes in tests unless the task includes production markup.
- Avoid \`cy.wait(N)\` fixed sleeps. Prefer route aliases and \`cy.wait('@alias')\` where intercepts exist.
- Keep commands in \`cypress/support/commands\` instead of duplicating login UI steps.
\`\`\`

The pattern is identical: name the runner, name the approved helpers, ban the anti-patterns that create flakes.

## API tests, contract checks, and service-level conventions

UI is not the only surface Aider edits. When you add a conventions section for API tests, ground it in how your team proves backend behavior.

Example section:

\`\`\`markdown
## API and contract tests
- Prefer the shared HTTP client with auth token injection.
- Assert on status code and a small set of critical fields, not the entire payload dump.
- For schema checks, use the existing Zod (or JSON Schema) helpers if present; do not add a new validation library in a single test file.
- Negative tests must document the expected error code in the test name: \`returns 409 when order already captured\`.
- Never hardcode production secrets. Read tokens from env vars already used by CI.
\`\`\`

If your monorepo has both consumer-driven contracts and classic integration tests, say which folder owns which style. Aider cannot infer ownership from folder names alone when those names are historical accidents.

| Test layer | Put in conventions | Keep out of conventions |
| --- | --- | --- |
| Unit | Runner, mocking library, pure-function style | Full algorithm designs for every module |
| API/integration | Client helper path, auth pattern, status+field asserts | Live credentials, environment URLs with secrets |
| E2E UI | Locator priority, no sleeps, fixture strategy | Entire product user manual |
| Visual / a11y | When to run, baseline update policy | Pixel fixtures themselves |

## Fixtures, factories, and test doubles: make ownership explicit

A large share of bad AI-generated tests come from **data confusion**: the model invents a user email, assumes a seed record exists, or stubs the wrong boundary. Put ownership rules in the conventions file.

\`\`\`markdown
## Fixtures and factories
- Build entities with factories under \`tests/factories/*\`. Example: \`createOrder({ status: 'pending' })\`.
- Prefer API setup helpers for E2E data when available; UI-only setup is slower and flakier.
- Mock at the network boundary the suite already uses (Playwright route, MSW, nock). Do not mock internal private functions of production modules from an E2E test.
- If a factory grows optional flags, extend the factory rather than copy-pasting object literals into three specs.
\`\`\`

This is where QA domain knowledge beats generic coding style. Aider is happy to create \`testUser@example.com\` fifty times. Your conventions should demand uniqueness and teardown.

## Assertion style, isolation, and flake prevention as first-class rules

Flakes are a process problem, but conventions can stop Aider from reintroducing the usual offenders.

Write a **flake budget** section:

\`\`\`markdown
## Isolation and flakes
- Tests must not depend on execution order.
- Do not share browser context state between tests unless using documented Playwright fixtures designed for that purpose.
- Time-based UI: assert on visible text/state, not wall-clock delays.
- If you add \`test.describe.configure({ retries: N })\`, N must be justified for environmental noise, not product nondeterminism.
- Prefer fixing selectors and waits over increasing timeouts globally.
\`\`\`

Also ban "assert everything" diffs. AI models sometimes expand a single bugfix into a 200-line assertion wall that fails on harmless payload noise. Tell Aider to assert the behavior under change.

## File layout, naming, and discovery: help the repo map help you

Aider builds a repository map to navigate large codebases. Clear naming helps both humans and the map. Encode the layout your CI already assumes:

\`\`\`markdown
## Layout and naming
- Playwright specs: \`*.spec.ts\` under \`tests/e2e\`.
- Component tests: \`*.test.tsx\` colocated or under \`tests/component\` (follow the nearest package pattern).
- Name tests after observable behavior: \`applies percentage coupon to cart total\`, not \`test1\`.
- Page objects: \`*.page.ts\` next to the feature or under \`tests/pages\`, matching existing packages.
- Do not create a new top-level \`test-utils2/\` directory. Extend the existing helper tree.
\`\`\`

When the model proposes a parallel folder structure, these bullets give you a crisp reject criterion in review: "violates layout conventions."

## Pairing conventions with test-cmd, auto-test, lint-cmd, and auto-lint

Conventions tell Aider **how to write** tests. Aider's config can also tell it **how to verify** them. The sample \`.aider.conf.yml\` documents:

- \`test-cmd\`: command to run tests
- \`auto-test\`: whether to run tests automatically after changes (default false)
- \`lint-cmd\`: language-keyed lint commands
- \`auto-lint\`: automatic linting after changes (default true)

A QA-friendly repo config might look like:

\`\`\`yaml
# .aider.conf.yml (repo root)
read:
  - CONVENTIONS.md
  - testing/PLAYWRIGHT_RULES.md

# run the focused Playwright project after edits when auto-test is enabled
test-cmd: npx playwright test --project=chromium

auto-test: false

lint-cmd:
  - "typescript: npm run lint --"

auto-lint: true
\`\`\`

Why keep \`auto-test\` false by default for many suites? Full E2E runs are slow and noisy inside an interactive edit loop. Enable \`auto-test\` when you are in a tight unit-test red/green cycle with a fast \`test-cmd\`. For Playwright, many teams leave auto-test off and instead ask Aider in chat to run a single file once the diff looks right.

You can still drive testing from the session with Aider's test-related modes (for example running tests and fixing failures when you opt into that workflow). The key design choice is: **conventions shape the code; test-cmd shapes the feedback loop**.

| Feedback lever | What it checks | Good default for unit tests | Good default for heavy E2E |
| --- | --- | --- | --- |
| Conventions file | Style, stack, anti-flake rules | Always on via \`read\` | Always on via \`read\` |
| \`auto-lint\` | Static issues after edits | On | On |
| \`auto-test\` | Behavioral pass/fail after edits | Often on with a fast command | Often off; run targeted tests manually |
| Chat-driven test runs | One-off verification | Use when iterating a single module | Use with file/project filters |

## Multi-file convention packs for monorepos

A single mega-file becomes unmaintainable once frontend, backend, and mobile each have different runners. Split by concern and list multiple \`read\` entries:

\`\`\`yaml
read:
  - CONVENTIONS.md
  - testing/conventions/playwright.md
  - testing/conventions/api.md
  - testing/conventions/performance.md
\`\`\`

Suggested split:

1. \`CONVENTIONS.md\`: universal rules (no secrets in tests, unique data, PR review bar for AI diffs).
2. \`testing/conventions/playwright.md\`: UI runner only.
3. \`testing/conventions/api.md\`: service tests only.
4. Optional specialized files loaded interactively for rare work (performance budgets, accessibility audits).

Use interactive \`/read\` for the specialized files so everyday sessions stay lean. Always-on context should be the rules that apply to almost every Aider edit in the repo.

### Package-local conventions in a polyglot monorepo

If only one package uses Playwright, keep Playwright rules near that package and document the load path in the package README:

\`\`\`bash
cd packages/web
aider --read ../../CONVENTIONS.md --read ./PLAYWRIGHT_RULES.md
\`\`\`

Aider's config resolution still considers home, git root, and cwd. Putting a package-level \`.aider.conf.yml\` can help when developers usually work from that package directory. Avoid contradictory always-on files at home vs repo vs package; last loaded wins, and confusion here wastes hours.

## Token budget: what belongs in conventions vs what belongs in the chat

Every always-on read file spends tokens that could have held the failing test, the page object, and the production module. Treat conventions like production config: measure growth.

Practical budget guidance for QA teams:

- Keep the always-on pack roughly in the low thousands of tokens if you can. Prefer sharp bullets over essays.
- Move long examples into a \`testing/examples/\` folder and only \`/read\` them when teaching Aider a new pattern.
- Do not paste entire Playwright config files into conventions; point to the path and state the policy.
- Rotate obsolete rules. If the team banned an old helper last year and nobody uses it, delete the bullet.

### Decision matrix: put it in conventions, config, or chat?

| Content | Conventions markdown | \`.aider.conf.yml\` | Chat message only |
| --- | --- | --- | --- |
| "No \`waitForTimeout\`" | Yes | No | Only if experimenting |
| \`test-cmd\` value | No | Yes | Override when needed |
| Model selection | No | Yes (or CLI) | Session experiments |
| "Fix this one flake in checkout" | No | No | Yes |
| Locator priority order | Yes | No | No (too easy to forget) |
| API keys | Never | Prefer env/\`.env\` per Aider docs | Never |
| One-off refactor plan | No | No | Yes |

Aider's docs also note that API keys for providers are handled through config and environment mechanisms (including \`.env\`); do not stuff secrets into \`CONVENTIONS.md\`.

## How Aider conventions compare to skills, rules, and instruction files

QA orgs rarely standardize on one agent. You may use Aider for git-native pair edits, Claude Code with skills, Cursor with rules, and GitHub Copilot with instruction files. The loading models differ:

| Mechanism | Typical home | How it attaches | Best mental model for testers |
| --- | --- | --- | --- |
| Aider conventions | \`CONVENTIONS.md\` (+ \`read\` config) | Read-only chat context, optional always-on | Handbook stapled into the pair session |
| Claude skills | \`.claude/skills/\` or \`~/.claude/skills/\` with \`SKILL.md\` (\`name\` max 64 chars, \`description\` max 1024) | Skill discovery from frontmatter name/description | Packaged workflows the agent can select |
| Cursor rules | \`.cursor/rules\` with \`.mdc\` files (\`alwaysApply\`, \`globs\`, \`description\`) | Scoped by apply settings and globs | Path-aware editor guardrails |
| Copilot instructions | \`.github/copilot-instructions.md\`, \`.github/instructions/*.instructions.md\` with \`applyTo\` | Repo/instruction scoping for Copilot | GitHub-centric coding guidance |
| AGENTS.md | \`AGENTS.md\` following the agents.md idea (nearest file wins) | Tooling that respects the standard | Nested agent instructions by directory |
| Gemini CLI | \`GEMINI.md\` | Gemini CLI project context | Gemini-oriented project brief |

None of these replace a solid test design. They only reduce how often the agent forgets your suite's local physics. For the deep multi-tool breakdown, read [Claude skills vs Cursor rules vs Copilot instructions](/blog/claude-skills-vs-cursor-rules-vs-copilot-instructions). For Aider workflow depth beyond conventions (repo map habits, commit flow, day-to-day QA usage), use the companion guide linked in the introduction.

### Translating a Cursor rule into an Aider conventions bullet

If your Cursor rule says "in \`tests/e2e/**/*.ts\`, forbid \`waitForTimeout\`," the Aider version is not a frontmatter block. It is a plain markdown bullet under a Playwright heading, loaded whenever those files are in play. Aider's power is simplicity: there is no \`applyTo\` selector inside \`CONVENTIONS.md\` itself. You simulate scoping by splitting files and choosing what to \`read\`.

### Translating a Claude skill into conventions (and when not to)

A Claude skill with YAML frontmatter \`name\` and \`description\` is a selectable package of procedures. Aider conventions are closer to standing orders. If you have a multi-step "triage flaky Playwright test" skill elsewhere, do not dump the entire procedure into always-on Aider context. Extract only the durable coding constraints (locator rules, logging, artifact expectations). Keep the interactive triage flow for the tool that supports skill selection, or run it as a chat checklist when using Aider.

For packaged QA procedures you want across agents, browse installable skills on qaskills.sh via the qaskills CLI, then mirror only the durable coding constraints into \`CONVENTIONS.md\` for Aider sessions.

## Worked session: stabilizing a flaky checkout spec under conventions

Walk through a realistic loop so the config pieces click together.

### Starting state

- Repo has Playwright E2E tests.
- \`checkout.spec.ts\` fails intermittently on the payment confirmation step.
- Team conventions already ban sleeps and require role-based locators.
- \`.aider.conf.yml\` always reads \`CONVENTIONS.md\`.

### Launch

\`\`\`bash
aider --read CONVENTIONS.md \\
  tests/e2e/checkout.spec.ts \\
  tests/pages/checkout.page.ts \\
  src/payments/PaymentSummary.tsx
\`\`\`

Even with \`read\` in YAML, explicit \`--read\` is harmless and makes the session obvious in shell history.

### Prompt that leans on conventions

Keep the human prompt about the failure, not a restatement of the handbook:

\`\`\`text
checkout.spec.ts fails intermittently after clicking Pay.
CI trace shows the confirmation heading missing.
Adjust the test (and page object if needed) to wait for the real UI signal.
Follow CONVENTIONS.md: no waitForTimeout, prefer getByRole, keep data setup in factories.
\`\`\`

### What good Aider output looks like under conventions

You want a diff that:

- Replaces a fixed sleep with \`await expect(page.getByRole('heading', { name: 'Payment confirmed' })).toBeVisible()\`.
- Keeps factory-based order creation.
- Avoids introducing a new assertion library.
- Leaves unrelated specs untouched.

### Verification loop

Run a focused command (either yourself or via Aider's shell suggestions if enabled):

\`\`\`bash
npx playwright test tests/e2e/checkout.spec.ts --project=chromium --retries=0
\`\`\`

Retries off during diagnosis so you do not paper over the race. Once green locally, enable the normal CI retry policy if your project config defines one.

### Commit hygiene

Aider can auto-commit depending on config (\`auto-commits\` defaults to true in the sample config). For test-only repairs, many QA teams prefer reviewing the diff first. Use your team's git practice: either disable auto-commits in config for suite work, or review each commit message before push. The sample config also documents attribution-related options such as co-authored-by behavior; follow your org's authorship policy rather than inventing trailers by hand in conventions.

## Authoring checklist: ship a conventions pack your team will actually use

Use this checklist when introducing **aider conventions file setup** to a QA org.

1. **Inventory runners** per package (Playwright, Cypress, Vitest, JUnit, pytest). One stack section per runner.
2. **List the top ten flake causes** from the last quarter. Turn each into a forbidden or required bullet.
3. **Name the helper entry points** (factories, API clients, auth storage). Paths only if real.
4. **Write the review bar** for AI-generated tests (size of diff, no drive-by refactors).
5. **Create \`CONVENTIONS.md\`** and a thin specialized file for the dominant E2E tool.
6. **Add \`read:\` to repo \`.aider.conf.yml\`**. Keep home-directory config for personal preferences, not team rules.
7. **Pilot with two engineers** for a week on real tickets. Cut rules that never fired; strengthen rules that were ignored.
8. **Document the launch one-liner** in the QA README.
9. **Revisit quarterly** after framework upgrades (Playwright major versions often change recommended patterns).

### Sample minimal \`.aider.conf.yml\` for a Playwright-first team

\`\`\`yaml
read:
  - CONVENTIONS.md

# Fast default for chat-driven unit work; override in session for E2E
test-cmd: npm test -- --runInBand

auto-test: false
auto-lint: true

# optional: keep aider artifacts out of noise if your team prefers
# (gitignore handling is configurable; see Aider config docs)
\`\`\`

Only include keys you mean to set. The public sample config is long because it lists options; your repo file should stay short.

## Troubleshooting: when Aider seems to ignore the conventions

### Symptom: model still uses sleeps and CSS selectors

Checks:

- Confirm the file was actually added: session startup should report the read-only file.
- Ensure the rule is phrased as a hard ban with a replacement, not a soft preference.
- Reduce conflict: if an old page object exemplifies the bad pattern and is in the editable set, Aider may imitate nearby code. Either refactor the page object in the same task or say "do not copy wait patterns from this page object."

### Symptom: conventions work in your shell but not a teammate's

Checks:

- Teammate may be launching without repo root cwd, missing \`.aider.conf.yml\`.
- Personal home \`~/.aider.conf.yml\` might override list values unexpectedly depending on merge expectations; inspect both files.
- They may be using a different filename and never \`/read\` it.

### Symptom: context feels "full" and edits get worse

Checks:

- Too many always-on read files. Move rare rules to on-demand \`/read\`.
- Too many large editable files in the chat. Drop unrelated specs.
- Conventions file grew into a novel. Split and cut examples.

### Symptom: tests pass lint but violate team policy

Static lint cannot encode every QA policy. Either:

- Add a custom ESLint rule / Playwright lint where possible, or
- Keep the policy in conventions and enforce in human review for a while.

Conventions are persuasive, not a compiler. Pair them with CI checks when a rule is truly mandatory.

### Symptom: Aider edits the conventions file

You likely added it as an editable file instead of read-only. Prefer \`--read\` / \`/read\` / YAML \`read:\` so it is marked read-only. If you need to revise conventions, open a deliberate session with that file editable and no noisy failing tests competing for attention.

## Keeping conventions aligned with CI reality

The fastest way to kill trust in AI pair programming is a conventions file that describes an ideal suite CI does not run. Align:

- Locator guidance with what the app actually exposes (\`getByTestId\` only if test ids exist).
- Factory guidance with APIs that exist in test environments.
- \`test-cmd\` with a command that works offline for local dev (or document required services).
- Browser projects with what CI installs (chromium-only local vs full matrix in CI).

When CI uses sharding and local uses a single project, say so in conventions so Aider does not "fix" failures by deleting project config.

## Security and compliance notes for AI-edited tests

QA suites often touch staging credentials, customer-like PII, and internal admin tools. Put non-negotiables in conventions:

\`\`\`markdown
## Security
- Never commit tokens, cookies, or raw production exports into tests or fixtures.
- Use env vars and secret managers already wired for CI.
- Mask PII in trace attachments and logs when tests run against shared environments.
- Do not point tests at production unless the task explicitly says so and the suite is designed for it.
\`\`\`

Aider will not replace your threat model. It will, however, happily hardcode a bearer token it saw in a debug log if you leave that log in the editable context. Drop sensitive files from the chat; do not only ban them in prose.

## Measuring whether conventions are working

Treat adoption like any other tooling change. Leading indicators: share of AI-assisted PRs that still introduce \`waitForTimeout\` or banned selectors, review comments per AI-assisted test PR, and how often engineers re-paste style instructions into chat (should trend toward zero). Lagging indicators: flake rate on files frequently touched with Aider, time-to-green on "add e2e coverage" tickets, and onboarding time for a new SDET using Aider on day one. If leading indicators do not move after two sprints, the file is too vague, not loaded, or contradicted by nearby code samples.

## Anti-patterns specific to conventions-driven test generation

Avoid these failure modes: the policy novel (thousands of always-on process lines), a secret second stack the rules never mention, frontend style guides pasted in place of flake policy, unowned files that rot after assertion-library upgrades, \`test-cmd\` drift across README/CI/config, and permanent chat overrides that fight the handbook. Assign a maintainer (often the QA platform owner) and review conventions in the same ritual as test framework upgrades.

## Example: end-to-end conventions pack for a SaaS billing suite

Below is a fuller sample you can adapt. It is intentionally concrete. Replace paths with your real ones; do not keep fictional helpers if they do not exist.

\`\`\`markdown
# CONVENTIONS.md: billing SaaS test rules for Aider

## Goals
- Optimize for low-flake E2E and clear failures over clever abstractions.
- Prefer extending existing helpers to inventing new frameworks.

## Runners
- UI: Playwright Test in \`tests/e2e\`.
- API: Vitest in \`tests/api\`.
- Do not add Jest to packages that already use Vitest.

## Playwright
- Locators: role, label, test id (existing \`data-testid\` only).
- Assertions: web-first \`expect\` from \`@playwright/test\`.
- Auth: reuse \`storageState\` from \`tests/auth\`.
- No \`page.waitForTimeout\`.
- No hard-coded production URLs; use config baseURL.

## API tests
- Use \`tests/helpers/apiClient.ts\` for JSON requests.
- Name files after the resource: \`invoices.test.ts\`.
- Assert status + critical fields; avoid full deep equality on volatile timestamps.

## Data
- Factories in \`tests/factories\`.
- Each test creates its own customer and tears down when the API supports delete.
- Unique email pattern: local part includes a timestamp or random suffix.

## AI edit policy
- Touch the smallest set of files that fixes the failing behavior.
- Do not reformat unrelated tests.
- Do not upgrade dependencies unless asked.
\`\`\`

Wire it:

\`\`\`yaml
# .aider.conf.yml
read:
  - CONVENTIONS.md

test-cmd: npx playwright test --project=chromium
auto-test: false
\`\`\`

Daily driver command for a billing bug:

\`\`\`bash
aider tests/e2e/invoices/pay_invoice.spec.ts \\
  tests/pages/invoice.page.ts \\
  src/billing/InvoicePaymentForm.tsx
\`\`\`

Because \`CONVENTIONS.md\` is already in \`read\`, the session inherits QA rules without extra flags.

## From first file to team standard in thirty days

A realistic rollout plan:

**Days 1-3:** Draft \`CONVENTIONS.md\` from the last ten flaky failures and the README's official stack. Invite developers to add domain invariants (for example, "invoices cannot be paid twice; expect 409") while SDETs own flake and locator policy.

**Days 4-7:** Add \`.aider.conf.yml\` \`read\` entries. Pilot on two services.

**Days 8-14:** Split Playwright vs API files if the combined doc is already awkward.

**Days 15-21:** Align \`test-cmd\` with a trustworthy local command. Decide \`auto-test\` policy per suite speed.

**Days 22-30:** Measure banned-pattern rates in AI-assisted PRs. Cut or sharpen bullets. Announce the standard with the one-liner launch command.

At the end of the month you should have a **repeatable aider conventions file setup** that makes test code generation boring in the best way: shared rules, fast feedback, fewer "AI style" surprises in review.

## Frequently Asked Questions

### Does the conventions file have to be named CONVENTIONS.md?

No. Official Aider docs use \`CONVENTIONS.md\` as the example filename, but any markdown or text file you load with \`/read\`, \`--read\`, or the \`read\` list in \`.aider.conf.yml\` can hold your rules. Teams often keep a short root \`CONVENTIONS.md\` plus specialized files under \`testing/\`. Pick names that humans will find in code search, document them in the QA README, and keep the always-on list short enough that everyday sessions stay within a comfortable context budget for your chosen model.

### Should I enable auto-test for Playwright suites when using conventions?

Often not as a global default. Aider's config supports \`test-cmd\` and \`auto-test\`, and auto-test defaults to off in the documented sample. Full Playwright runs are frequently too slow and environment-heavy for an automatic after-every-edit loop. Prefer auto-test for fast unit or API suites, and run targeted Playwright files from the chat or shell while diagnosing E2E failures. Keep conventions always-on either way; they improve the first draft even when tests are run manually.

### How is an Aider conventions file different from Cursor rules or Copilot instructions?

Aider conventions are read-only files stapled into the chat context, typically via \`read\` configuration or \`--read\`. Cursor rules usually live under \`.cursor/rules\` as \`.mdc\` files with fields such as \`alwaysApply\`, \`globs\`, and \`description\`. Copilot uses \`.github/copilot-instructions.md\` and optional \`.github/instructions/*.instructions.md\` files with \`applyTo\` frontmatter. Claude skills use \`SKILL.md\` with \`name\` and \`description\` frontmatter under skill directories. Same goal, different attachment machinery; many orgs keep a shared policy and translate it into each tool's format.

### What should I do if Aider keeps imitating bad patterns from old tests?

Load strong conventions, but also stop feeding the model only legacy specs as exemplars. Include a clean page object or a golden test in the editable or read-only set, and say explicitly not to copy sleeps or CSS selectors from the flaky file under repair. Prefer small diffs that fix waiting and locator strategy rather than large rewrites. Over time, pay down the worst exemplars so the repository map and nearby files reinforce the conventions instead of fighting them every session.
`,
};
