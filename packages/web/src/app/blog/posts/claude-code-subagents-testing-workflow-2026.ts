import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Claude Code Subagents: Build an Automated Testing Workflow (2026)',
  description:
    'Learn how to use Claude Code subagents and MCP to build an automated testing workflow in 2026 -- test generation, browser QA, and flaky-test repair running in parallel.',
  date: '2026-06-08',
  category: 'Guide',
  content: `
# Claude Code Subagents: Build an Automated Testing Workflow (2026)

A single AI agent is a remarkably capable assistant, but it works the way a junior engineer with one notepad works: it does one task at a time, in one context window, with one system prompt. Ask it to read a pull request diff, write tests, run them in a browser, file bugs, and repair the flaky ones, and it will dutifully grind through that list serially. Every step pollutes the same context window. By the time the agent reaches the flaky-test repair step, its attention is split across the diff it read forty messages ago, the test code it wrote, the browser output it parsed, and the bug tickets it drafted. Quality degrades, tokens balloon, and the agent starts forgetting instructions you gave it at the top.

Claude Code subagents fix this. A subagent is a separate Claude instance with its own context window, its own system prompt, and its own restricted set of tools. The main agent -- the orchestrator you talk to -- delegates a self-contained job to a subagent, the subagent does the work in isolation, and only a compact summary comes back. Because each subagent has a clean context, you can run several of them in parallel: a planner subagent maps the change, a test-writer subagent generates specs, a browser-QA subagent drives Playwright through real flows, a flaky-test-fixer subagent stabilizes the suite, and a reviewer subagent checks the output before anything is committed. This is the difference between one engineer juggling five tasks and a five-person QA team each focused on one. In this guide you will build exactly that team: a Claude Code testing workflow where subagents handle planning, test generation, execution via MCP, bug filing, and repair -- defined as plain Markdown files you can check into your repo.

## Key Takeaways

- A Claude Code subagent is a separate Claude instance with its own context window, system prompt, and tool permissions -- defined as a Markdown file in \`.claude/agents/\`.
- Subagents enable parallelism: the main agent delegates planning, test generation, browser QA, and flaky-test repair to specialized workers that run concurrently.
- The Playwright MCP and GitHub MCP servers give subagents real tools -- a live browser and your repo -- so generated tests are validated, not guessed.
- A concrete end-to-end flow turns a PR diff into generated tests, runs them, files bugs in Jira or GitHub, and repairs flaky specs automatically.
- Context isolation is the core tradeoff: subagents prevent context rot but add token and latency cost, so use them for genuinely separable work.
- Curated QA skills from [the QASkills directory](/skills) drop expert testing conventions into your subagents instantly.

---

## What Is a Claude Code Subagent

A Claude Code subagent is a specialized AI assistant that the main Claude Code agent can call to handle a specific kind of task. The defining characteristics are three:

**A separate context window.** When the main agent invokes a subagent, the subagent starts fresh. It does not inherit the entire conversation history -- it receives only the task description the main agent hands it. This is the single most important property. The main agent's context stays clean because the subagent's exploration, file reads, tool output, and intermediate reasoning all happen in a different window. Only the final result returns to the orchestrator.

**A dedicated system prompt.** Each subagent has its own instructions that define its role, expertise, and the standards it follows. A test-writer subagent's system prompt encodes your testing conventions: use semantic locators, never use \`waitForTimeout\`, one assertion per concern, arrange-act-assert structure. The orchestrator does not need to repeat these rules in every message because they live in the subagent's definition.

**Scoped tool permissions.** A subagent only gets the tools you grant it. A reviewer subagent might get read-only file access and nothing that can mutate state. A test-writer gets file edit tools and the Playwright MCP. A bug-filer gets the GitHub or Jira MCP but not the ability to push code. This least-privilege model is both a safety boundary and a focusing mechanism -- a subagent with five relevant tools makes better decisions than one with fifty.

The mental model: the main agent is a tech lead who reads the ticket, decides who should do what, and assigns work. The subagents are specialists who each own a clear deliverable and report back when done.

## Single Agent vs Subagents: The Difference That Matters

Before wiring anything up, it helps to see precisely what subagents change about how work flows through Claude Code.

| Dimension | Single Agent | Subagent Architecture |
| --- | --- | --- |
| Context window | One shared window; fills up and degrades | Each subagent has its own clean window |
| Concurrency | Strictly serial -- one task after another | Multiple subagents run in parallel |
| System prompt | One general prompt for everything | Role-specific prompt per subagent |
| Tool access | All tools available all the time | Least-privilege tools per subagent |
| Failure isolation | One bad step poisons the whole session | A failing subagent is contained |
| Token efficiency on long jobs | Re-reads accumulate; cost grows | Summaries returned; main context stays small |
| Best for | Quick, linear, single-domain tasks | Multi-stage, parallelizable, multi-domain work |

The takeaway is not that subagents are always better -- they are not, and a later section covers when they hurt. The takeaway is that for a testing workflow, which is inherently multi-stage (plan, generate, run, file, repair, review) and inherently parallelizable, the subagent model maps almost perfectly onto the problem.

## Defining a Subagent: The .claude/agents Markdown File

Subagents are configured as Markdown files with YAML frontmatter, stored in \`.claude/agents/\` for project-scoped agents (checked into the repo, shared with your team) or \`~/.claude/agents/\` for personal global agents. Project-scoped agents take precedence when names collide.

The frontmatter defines the metadata; the Markdown body is the system prompt. The key fields are:

- \`name\` -- a lowercase, hyphenated identifier the orchestrator uses to invoke the subagent.
- \`description\` -- a natural-language summary of when this subagent should be used. This is what the main agent reads to decide whether to delegate. Write it like a job posting: be specific about triggers. Phrases like "use proactively after code changes" or "must be used for flaky tests" strongly influence automatic delegation.
- \`tools\` -- a comma-separated allow-list. Omit it to inherit all tools (including MCP tools); specify it to restrict.
- \`model\` -- which model the subagent runs on. Use a fast, cheap model for mechanical work and a stronger model for reasoning-heavy work. \`inherit\` uses whatever the main session uses.

## A Real Test-Writer Subagent

Here is a complete, production-shaped \`.claude/agents/test-writer.md\` you can drop into a repo today. It encodes opinionated Playwright conventions so every test the subagent produces looks like it came from the same senior engineer.

\`\`\`markdown
---
name: test-writer
description: >
  Generates Playwright end-to-end tests from a feature description, a
  user story, or a pull-request diff. Use PROACTIVELY whenever new UI
  behavior is added or changed. Validates locators against a live
  browser via the Playwright MCP before finalizing any test file.
tools: Read, Write, Edit, Glob, Grep, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_click
model: claude-sonnet-4-6
---

You are a senior SDET who writes Playwright tests in TypeScript.

## Conventions you MUST follow
- Prefer semantic locators: getByRole, getByLabel, getByText. Never
  use brittle CSS or XPath unless no semantic locator exists.
- Never use page.waitForTimeout. Use web-first assertions (expect(...).
  toBeVisible()) which auto-wait.
- One behavior per test. Name tests after user-observable outcomes.
- Use the arrange / act / assert structure with blank-line separation.
- Put shared setup in fixtures, not in beforeEach copy-paste.
- Add a data-testid only as a last resort, and flag it for the dev.

## Your workflow
1. Read the feature description or diff you were given.
2. Open the relevant page with the Playwright MCP and snapshot the DOM
   to discover the REAL accessible names and roles. Do not guess
   selectors from memory.
3. Write the test file under tests/e2e/ named <feature>.spec.ts.
4. Re-open the page and dry-run the critical locators to confirm they
   resolve to exactly one element.
5. Return a short summary: files created, scenarios covered, and any
   selectors you had to fall back to data-testid for.

Do NOT run the full suite or modify CI config -- that is another
agent's job. Stay in your lane.
\`\`\`

Notice what the tool list does: this subagent can read and write files and drive a browser for snapshots and clicks, but it has no Git tools, no ability to push, and no Jira access. It cannot accidentally file a bug or commit code. That restriction is the whole point.

## A Flaky-Test-Fixer Subagent

The companion to the test-writer is a repair specialist. Flaky tests are a distinct cognitive task -- it is forensic work, not authorship -- so it deserves its own context and its own prompt. Save this as \`.claude/agents/flaky-test-fixer.md\`.

\`\`\`markdown
---
name: flaky-test-fixer
description: >
  Diagnoses and repairs flaky or intermittently failing Playwright
  tests. MUST BE USED when a test passes locally but fails in CI, or
  fails only some of the time. Reproduces the flake, finds the root
  cause, and applies a minimal stable fix.
tools: Read, Edit, Bash, Glob, Grep, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot
model: claude-sonnet-4-6
---

You are a test-stability specialist. Flaky tests are usually caused by
race conditions, animation timing, network nondeterminism, or shared
state between tests -- almost never by "the test machine being slow".

## Diagnosis protocol
1. Run the failing test 10 times with the repeat-each flag to confirm
   and measure the flake rate.
2. Inspect the trace and DOM snapshot at the failure point.
3. Classify the root cause: (a) missing web-first assertion / manual
   wait, (b) order-dependent shared state, (c) network race, (d) real
   product bug surfacing only under timing pressure.
4. For (d), DO NOT mask it -- report it as a probable product bug and
   stop. For (a)-(c), apply the minimal fix.

## Fix rules
- Replace fixed timeouts with auto-waiting assertions.
- Make tests independent: no reliance on execution order.
- Mock or stub nondeterministic network calls at the route level.
- Never add retries to hide a flake without first finding the cause.

Return: the flake rate before and after, the root-cause category, and
the diff you applied.
\`\`\`

The two subagents never step on each other. The writer authors; the fixer repairs. Each has the minimal toolset for its job, and each can be invoked independently or as a stage in the larger pipeline.

## Wiring the Playwright and GitHub MCP Servers

Subagents become genuinely useful when they have real tools, and the Model Context Protocol (MCP) is how Claude Code gets them. MCP servers expose external systems -- a browser, your repository, an issue tracker -- as callable tools. The Playwright MCP gives subagents a live, controllable browser. The GitHub MCP gives them your repo, PRs, and issues. If you are new to MCP for testing, the [MCP for QA engineers guide](/blog/mcp-for-qa-engineers-guide) covers the protocol from the ground up.

Configure MCP servers in a project-level \`.mcp.json\` at the repo root so the whole team shares the same setup:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--headless"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "\${GITHUB_TOKEN}"
      }
    }
  }
}
\`\`\`

The \`\${GITHUB_TOKEN}\` reference is expanded from your environment so no secret is ever committed. Once these servers are registered, their tools appear with the \`mcp__playwright__\` and \`mcp__github__\` prefixes -- exactly the names you allow-list in each subagent's \`tools\` field. You can also gate which servers a subagent may touch in \`.claude/settings.json\`:

\`\`\`json
{
  "permissions": {
    "allow": [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__github__create_issue"
    ],
    "deny": [
      "mcp__github__delete_repository",
      "Bash(rm -rf*)"
    ]
  }
}
\`\`\`

This is defense in depth: the subagent definition narrows what each worker can reach, and the settings file enforces a hard boundary on top of that. Even if a prompt-injected web page tries to convince a subagent to delete a repo, the \`deny\` rule blocks the call outright.

### Recommended MCP Servers for QA

| MCP Server | What it gives subagents | Use it for |
| --- | --- | --- |
| Playwright MCP | Live browser: navigate, snapshot, click, fill | Validating locators, browser QA, repro of flakes |
| GitHub MCP | Repos, PRs, issues, diffs, comments | Reading PR diffs, filing bugs, posting test results |
| Jira / Atlassian MCP | Issues, transitions, comments | Filing structured bug tickets with steps to reproduce |
| Filesystem MCP | Scoped file read/write | Sharing fixtures and test data across runs |
| Sentry / observability MCP | Error events, stack traces | Turning production errors into reproduction tests |
| Postgres / DB MCP | Read-only queries | Seeding and asserting on test data state |

## How the Main Agent Delegates and Runs Subagents in Parallel

Delegation happens two ways. The first is automatic: when you give the orchestrator a task, it reads the \`description\` field of every available subagent and routes the work to the best match. A well-written description -- "use PROACTIVELY when new UI behavior is added" -- makes this routing reliable. The second is explicit: you simply name the subagent, for example "use the flaky-test-fixer on the checkout spec," and the orchestrator hands it off directly.

Parallelism is where the architecture earns its keep. When the main agent identifies independent units of work, it can dispatch multiple subagents concurrently. A realistic instruction looks like this:

\`\`\`text
Three modules changed in this PR: auth, cart, and search.
Spin up one test-writer subagent per module IN PARALLEL.
Each writes tests only for its module. Report back when all three finish.
\`\`\`

The orchestrator launches three test-writer instances at once. Each has its own context window, so the auth writer is not distracted by the search writer's DOM snapshots. They finish in roughly the time of the slowest single one rather than the sum of all three. The main agent then collects the three summaries and proceeds. The natural ceiling is concurrency limits and your token budget, not the architecture -- and the practical guidance is to parallelize only genuinely independent work, because shared state between concurrent subagents is a recipe for race conditions in your own workflow.

## End-to-End Flow: From PR Diff to Repaired Suite

Here is the complete pipeline the subagents above compose into. Imagine a developer opens a pull request. You point Claude Code at it and say "QA this PR end to end."

**Stage 1 -- Plan.** A planner subagent uses the GitHub MCP to fetch the PR diff, summarizes which user-facing behaviors changed, and produces a short test plan in Markdown. It returns only the plan, not the entire diff, keeping the orchestrator's context lean.

**Stage 2 -- Generate, in parallel.** The orchestrator reads the plan, sees that three modules changed, and dispatches three test-writer subagents concurrently. Each opens the relevant page through the Playwright MCP, discovers real accessible names, writes its spec file, and dry-runs locators. Three summaries come back. This is the same agentic loop described in the [Playwright test agents with Claude Code guide](/blog/playwright-test-agents-claude-code), scaled across modules.

**Stage 3 -- Run.** A runner step executes the new specs via the Playwright MCP in headless mode and captures results, traces, and screenshots for any failures.

**Stage 4 -- File bugs.** For each genuine failure (as opposed to a flake), a bug-filer subagent with Jira or GitHub MCP access creates a ticket. It writes a proper bug report: a clear summary, numbered steps to reproduce drawn from the test, expected versus actual result, and the failure screenshot attached. Because this subagent has issue-tracker tools but no code-edit tools, it cannot "fix" the bug by quietly editing the test -- it can only report.

**Stage 5 -- Repair flakes.** Tests that failed intermittently rather than consistently are handed to the flaky-test-fixer subagent. It runs each suspect ten times, classifies the root cause, and either applies a minimal stabilizing fix or, if the flake reveals a real product bug, escalates it back for a ticket instead of masking it.

**Stage 6 -- Review.** Finally a reviewer subagent with read-only access reads every new and modified test file and checks them against your conventions before anything is committed. It flags missing assertions, brittle selectors, or stray \`waitForTimeout\` calls. Only after this gate does the orchestrator stage the changes for a human to approve.

The human stays in the loop at the start (point at the PR) and the end (approve the diff and the tickets). Everything in between is parallel, context-isolated subagent work. This division of labor is the heart of [vibe testing and AI-first QA](/blog/vibe-testing-ai-first-qa-guide): you describe intent, the agents handle mechanics, and you review outcomes.

## CLAUDE.md Conventions That Make Subagents Reliable

Subagents inherit project context from your \`CLAUDE.md\` file, so it is the cheapest place to raise the quality of every subagent at once. Treat it as the shared rulebook the whole team -- human and agent -- reads first. For a testing workflow, a strong \`CLAUDE.md\` includes:

- **Commands.** How to run the suite, a single test, and the suite in watch or repeat mode. Subagents will use these exact commands instead of guessing.
- **Conventions.** Locator strategy, the ban on fixed timeouts, naming patterns, and where fixtures live. Stating these once globally means each subagent prompt can stay short.
- **Directory map.** Where tests, fixtures, and page objects live, so a test-writer puts files in the right place.
- **Boundaries.** What agents must never do -- never delete tests to make CI green, never commit secrets, never push to main directly.
- **Delegation hints.** A short note that flaky tests go to \`flaky-test-fixer\` and new behavior goes to \`test-writer\` reinforces automatic routing.

Keep it tight. \`CLAUDE.md\` is prepended to context, so every word costs tokens on every turn. Put durable rules here and task-specific detail in the subagent prompts.

## When Subagents Help and When They Hurt

Context isolation is a double-edged sword. The same separation that keeps the orchestrator clean also means a subagent cannot see the conversation that led to its task. That tradeoff defines when to reach for subagents and when to skip them.

| Situation | Use a subagent? | Why |
| --- | --- | --- |
| Multi-module test generation | Yes | Independent, parallelizable, benefits from isolation |
| Forensic flaky-test repair | Yes | Distinct skill, deserves a focused context |
| Read-only review gate | Yes | Least-privilege isolation is a safety feature |
| A one-line selector tweak | No | Delegation overhead exceeds the work |
| Highly interactive back-and-forth | No | The subagent loses the conversational context |
| Tasks that share mutable state | Caution | Concurrent writers can race; serialize them |

The failure mode to avoid is over-delegation: spawning a subagent for trivial work adds a full round trip and a fresh context load for no benefit. The other failure mode is asking a subagent to do something that genuinely needs the prior conversation -- it will start from a blank slate and may redo discovery the main agent already finished. The rule of thumb: delegate work that is self-contained, separable, and large enough to justify the handoff.

## Cost and Token Notes

Subagents are not free. Each one loads its own system prompt, your \`CLAUDE.md\`, and any context it needs to read -- so a five-subagent pipeline can read the same project files five times. The savings come from two places. First, the orchestrator's context stays small because subagents return summaries instead of raw output, which avoids the runaway cost of one ever-growing context window on a long job. Second, you can assign a cheaper, faster model to mechanical subagents (a bug-filer formatting a ticket) and reserve a stronger model for reasoning-heavy ones (a flaky-test-fixer doing root-cause analysis), so you only pay top rates where they matter.

Practical levers: set \`model\` per subagent rather than running everything on the most expensive one; keep \`CLAUDE.md\` lean since it loads into every subagent; and avoid parallelizing work that is not truly independent, because redundant file reads across concurrent subagents multiply token cost. For long QA pipelines the math usually favors subagents -- the alternative is a single context that grows until it both degrades in quality and costs more per turn than several clean ones.

## Security and Permissions

A testing workflow touches real systems -- your repo, your issue tracker, a browser that visits live pages -- so permissions are not optional. The defense rests on three layers. First, scope each subagent's \`tools\` field to the minimum it needs; a reviewer gets read-only access, a bug-filer gets issue tools but no code-push, a test-writer gets file and browser tools but no destructive commands. Second, enforce a hard floor in \`.claude/settings.json\` with explicit \`deny\` rules for dangerous operations like \`rm -rf\`, force-push, or repository deletion, so no prompt can talk a subagent past them. Third, treat any agent that browses live pages as exposed to prompt injection -- a malicious page can embed instructions -- which is exactly why the browser-driving subagent should never also hold credentials or push access. Keep secrets in environment variables referenced from \`.mcp.json\`, never inline, and never commit a personal access token. Least privilege is not bureaucracy here; it is what keeps an autonomous test run from becoming an incident.

## Best Practices

- **One responsibility per subagent.** A subagent that writes, runs, files, and repairs is just a single agent wearing a hat. Split by cognitive task.
- **Write descriptions for routing.** The \`description\` field is how the orchestrator decides. Be specific and include trigger phrases like "use proactively" or "must be used for."
- **Version your agents.** Keep \`.claude/agents/\` in Git so the whole team shares the same QA workers and improvements are reviewed like code.
- **Validate against reality.** Test-writers should snapshot the live DOM via the Playwright MCP, never guess selectors from memory.
- **Never mask flakes.** A repair subagent that adds retries to hide a race condition is creating debt. Find the cause.
- **Keep a human gate.** End the pipeline with a review and an explicit approval step before committing.
- **Start from proven conventions.** Curated [QA skills](/skills) give your subagents battle-tested patterns instead of reinventing them. If you are weighing tools, the [Cursor vs Claude Code for testing comparison](/blog/cursor-vs-claude-code-testing-2026) is a useful reference.

## Frequently Asked Questions

### What is a Claude Code subagent?

A Claude Code subagent is a separate Claude instance with its own context window, system prompt, and restricted tool set, defined as a Markdown file in \`.claude/agents/\`. The main agent delegates a self-contained task to it; the subagent works in isolation and returns a compact summary. This keeps the orchestrator's context clean and lets multiple subagents run in parallel.

### How do subagents improve a testing workflow?

They map onto the natural stages of QA -- plan, generate, run, file bugs, repair, review -- giving each stage a focused worker with the right tools and no context pollution. Independent stages, like generating tests for several modules, run in parallel instead of serially, so a multi-step testing pipeline finishes faster and produces higher-quality output than one agent juggling everything.

### Where do I define a Claude Code subagent?

Define subagents as Markdown files with YAML frontmatter. Project-scoped agents live in \`.claude/agents/\` at the repo root and are shared with your team through Git; personal agents live in \`~/.claude/agents/\`. The frontmatter sets \`name\`, \`description\`, \`tools\`, and \`model\`, while the Markdown body becomes the subagent's system prompt.

### What MCP servers do I need for AI testing?

For a complete QA workflow, the Playwright MCP gives subagents a live browser to validate locators and run tests, and the GitHub or Jira MCP lets them read PR diffs and file bugs. Optional additions include a filesystem MCP for shared test data, an observability MCP to turn production errors into tests, and a read-only database MCP for asserting on data state.

### Can Claude Code subagents run in parallel?

Yes. When the main agent identifies independent units of work, it can dispatch several subagents at once -- for example one test-writer per changed module. Because each has its own context window, they do not interfere with one another, and the batch completes in roughly the time of the slowest single subagent. Parallelize only genuinely independent work to avoid races.

### Do subagents cost more tokens than a single agent?

They can, because each loads its own system prompt and may re-read project files. But they save tokens on long jobs by returning summaries instead of letting one context window grow without bound, and by letting you assign cheaper models to mechanical subagents. For multi-stage QA pipelines the math usually favors subagents over a single degrading context.

### How do I keep subagents secure?

Apply least privilege: scope each subagent's \`tools\` to the minimum it needs, and enforce a hard floor with \`deny\` rules in \`.claude/settings.json\` for dangerous operations. Keep credentials in environment variables referenced from \`.mcp.json\`, never inline. Treat any browser-driving subagent as exposed to prompt injection, so it should never also hold push access or secrets.

### When should I not use a subagent?

Skip subagents for trivial, quick tasks where the delegation overhead exceeds the work, and for highly interactive back-and-forth that depends on the ongoing conversation -- the subagent starts from a blank slate and cannot see that history. Also serialize, rather than parallelize, any subagents that share mutable state to avoid races in your own workflow.

## Conclusion

The shift from a single agent to a team of Claude Code subagents is the same shift a growing company makes when it stops asking one engineer to do everything and starts hiring specialists. A planner maps the change, parallel test-writers generate validated specs, a runner executes them through the Playwright MCP, a bug-filer raises tickets in Jira or GitHub, a flaky-test-fixer stabilizes the suite, and a reviewer gates the result -- each in its own clean context, each with exactly the tools it needs, many of them running at once. The whole pipeline lives as Markdown files and JSON config you check into your repo, so your QA workflow becomes versioned, reviewable, and shared.

Start small: write one \`test-writer.md\`, wire up the Playwright MCP, and let it generate tests for your next PR. Then add the flaky-test-fixer, then the reviewer, and grow the team as you trust it. To skip the blank-page problem entirely, browse the curated [QASkills directory](/skills) for ready-made, battle-tested testing conventions you can drop straight into your subagents -- and turn your Claude Code setup into an automated QA team this week.
`,
};
