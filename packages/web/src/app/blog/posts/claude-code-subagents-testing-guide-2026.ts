import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Claude Code Subagents Testing: Build a QA Automation Team (2026)',
  description:
    'A practical guide to Claude Code subagents testing -- design a QA team of test-planner, playwright-writer, and triager agents, run them in parallel, and ship Playwright tests faster.',
  date: '2026-06-28',
  category: 'Guide',
  content: `
Claude Code subagents testing is the fastest way to turn a single AI coding assistant into a coordinated QA team. Instead of asking one agent to read a ticket, plan coverage, write Playwright tests, and triage flaky failures all in the same conversation, you split that work across purpose-built subagents -- each with its own context window, system prompt, and tool allowlist. This guide shows you how to design Claude Code subagents for QA, where to define them, how to dispatch them in parallel, and how to wire them to the Playwright MCP server so an agent can read a ticket, produce a test plan, and hand it to a second agent that generates runnable tests. Every config and code block below is real and runnable.

## Key Takeaways

- Claude Code subagents are separate agents with their own context window, system prompt, and restricted tool list -- defined as Markdown files with YAML frontmatter under \`.claude/agents/\`.
- A good QA subagent team splits work by role: a test-planner, a playwright-writer, a flaky-test-triager, and a code-reviewer, each scoped to one job.
- Subagents keep the main thread's context clean -- a planner can read 40 files and return a 200-line plan without polluting your primary conversation.
- Claude Code can dispatch multiple subagents in parallel, so independent test suites get written concurrently.
- Pairing subagents with the Playwright MCP server lets a writer agent drive a real browser, verify selectors, and confirm tests pass before returning.
- Browse ready-made QA workflows in the [QASkills directory](/skills) to bootstrap your agent prompts.

---

## What Are Claude Code Subagents

Claude Code subagents are independent agents that the main Claude Code session can invoke to handle a focused task. The critical difference from a normal chat turn is isolation: each subagent runs in its own context window, starts from its own system prompt, and is limited to a specific set of tools you allow it to use. When a subagent finishes, it returns only its final summary to the main thread -- not the dozens of tool calls and file reads it made along the way.

That isolation is what makes Claude Code subagents testing so effective for QA. A test-planner subagent might read your routing config, three React components, and an OpenAPI spec to understand a feature. That is a lot of tokens. If it happened in your primary conversation, your context would fill with implementation detail you do not need. As a subagent, all of that exploration happens in a throwaway context, and your main thread receives a clean, structured test plan.

Each subagent is defined by three things in its frontmatter: a \`name\` (how you and the orchestrator refer to it), a \`description\` (when Claude should reach for it -- this drives automatic delegation), and a \`tools\` list (the allowlist that constrains what it can touch). You can also pin a \`model\` so cheap agents run on a smaller, faster model and expensive reasoning agents run on a larger one.

### Subagent vs Main Thread

The table below summarizes why you would push work into a subagent rather than keep it in your main session.

| Dimension | Main thread | Subagent |
|---|---|---|
| Context window | Shared, fills over time | Fresh, isolated per task |
| System prompt | General-purpose | Role-specific, tuned for one job |
| Tool access | Everything enabled | Restricted allowlist |
| Output to you | Every step is visible | Only the final summary returns |
| Best for | Orchestration, decisions | Deep, noisy, parallelizable work |
| Model | Your session model | Pinnable per agent |

The mental model: the main thread is the QA lead who delegates and integrates results, and each subagent is a specialist who goes away, does one thing thoroughly, and reports back.

## Where Claude Code Subagents Are Defined

Subagents live as Markdown files with YAML frontmatter. There are two locations, and the precedence matters:

- **Project subagents** -- \`.claude/agents/\` in your repository. These are checked into version control and shared with your whole team. This is where QA subagents almost always belong, because the whole point is that everyone gets the same test-writing behavior.
- **User subagents** -- \`~/.claude/agents/\` in your home directory. These are personal and available across every project. Good for generic helpers you want everywhere.

When two subagents share a name, the project-level one wins. A typical QA repo layout looks like this:

\`\`\`text
your-repo/
  .claude/
    agents/
      test-planner.md
      playwright-writer.md
      flaky-test-triager.md
      code-reviewer.md
  tests/
    e2e/
  package.json
\`\`\`

Each file is a plain Markdown document. The frontmatter configures the agent; the body is the system prompt. Because they are just files, you review them in pull requests, diff changes over time, and roll them back like any other code. That is a real advantage over storing prompts in a wiki or a Notion page that drifts out of sync with the codebase.

## Designing a QA Subagent Team

The single most important design rule is one responsibility per subagent. A vague "QA agent" that plans, writes, runs, and triages will make muddy decisions and burn context. Sharp, single-purpose agents produce sharp output. Here is a proven four-role team for Claude Code subagents for QA.

| Role | System-prompt focus | Tools allowed |
|---|---|---|
| test-planner | Read the ticket and code, enumerate scenarios, edge cases, and acceptance criteria; output a Markdown plan only | Read, Grep, Glob |
| playwright-writer | Turn a plan into runnable Playwright tests using semantic locators; verify in a real browser | Read, Write, Edit, Bash, Playwright MCP |
| flaky-test-triager | Inspect failures, traces, and timing; classify as flake vs real bug; propose a fix | Read, Bash, Grep |
| code-reviewer | Review generated tests for selector quality, assertions, and anti-patterns; no edits, comments only | Read, Grep |

The planner is deliberately read-only -- it should never write code, only describe what to test. The writer is the only agent with write and browser access. The triager diagnoses but does not silently rewrite tests. The reviewer is comment-only so it cannot quietly "fix" something and hide a regression. These boundaries are enforced by the \`tools\` allowlist, not by hoping the model behaves.

If you want a head start on the prompts behind each of these roles, the [QASkills directory](/skills) catalogs reusable QA skills you can adapt into subagent system prompts. For the writer specifically, see the deeper walkthrough in [Playwright test agents in Claude Code](/blog/playwright-test-agents-claude-code).

## A Real playwright-writer Subagent

Here is a complete, runnable \`.claude/agents/playwright-writer.md\`. The frontmatter sets the name, the delegation trigger, the tool allowlist (note it includes the Playwright MCP tools so the agent can drive a browser), and a pinned model. The body is the system prompt that shapes every test it writes.

\`\`\`markdown
---
name: playwright-writer
description: >
  Use this agent to convert an approved test plan into runnable Playwright
  tests. Invoke it after the test-planner has produced a plan, or whenever
  the user asks to "write Playwright tests" for a described feature.
tools: Read, Write, Edit, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_click
model: sonnet
---

You are a senior SDET who writes Playwright tests in TypeScript.

Rules you must follow:
- Prefer semantic locators: getByRole, getByLabel, getByText. Never use
  brittle CSS or XPath selectors unless no accessible role exists.
- One test = one user-visible behavior. Keep tests independent and
  parallel-safe. No shared mutable state between tests.
- Use web-first assertions (await expect(locator).toBeVisible()) instead
  of manual waits or arbitrary timeouts.
- Before returning, open the page with the Playwright MCP browser tools
  and confirm every locator you reference actually resolves.
- Run the test with "npx playwright test <file>" and only return once it
  passes. If it fails, fix it and re-run.

Output: the test file path and a one-paragraph summary of coverage.
Do not explain Playwright basics. Do not write tests outside the plan.
\`\`\`

Two details make this agent reliable. First, the \`description\` is written as an instruction to the orchestrator about *when* to delegate -- that is what enables automatic dispatch. Second, the prompt forces the agent to verify locators in a real browser and run the test before returning, so it cannot hand back code that does not work. That verification loop is the difference between an agent that generates plausible tests and one that generates passing tests.

## How to Invoke Subagents

You invoke subagents in three ways, from most to least explicit.

**By name.** In your Claude Code session you can ask for a specific agent directly:

\`\`\`text
> Use the test-planner subagent to plan coverage for the password-reset flow in tickets/QA-218.md
\`\`\`

**By description (automatic delegation).** If you just describe the work, Claude reads each subagent's \`description\` and routes the task to the best match. A message like "write Playwright tests for the new checkout plan" will land on \`playwright-writer\` because its description says exactly that.

**Programmatically via the Task tool.** Under the hood, Claude Code dispatches subagents through a Task/Agent tool call, passing the \`subagent_type\` and a self-contained prompt. You see this when an agent spawns another agent. The key constraint: the spawned subagent has no memory of your conversation, so the dispatching prompt must include everything it needs -- file paths, the ticket text, the plan -- to act cold.

A typical end-to-end invocation chains two agents:

\`\`\`text
> Read tickets/QA-218.md. Use the test-planner to produce a plan,
  then pass that plan to the playwright-writer to generate the tests.
\`\`\`

Claude runs the planner first, captures its Markdown plan, then dispatches the writer with that plan as input.

### Running Subagents in Parallel

Independent tasks do not need to run one after another. Claude Code can dispatch multiple subagents in a single turn, and they execute concurrently in their own contexts. This is where Claude Code test automation agents pay off at scale.

Suppose three feature areas each need a test suite and none of them depend on each other. You can fan out:

\`\`\`text
> In parallel, dispatch three playwright-writer subagents:
  one for the login plan in specs/login.md,
  one for the cart plan in specs/cart.md,
  one for the profile plan in specs/profile.md.
\`\`\`

Each writer works on its own suite simultaneously. Because their contexts are isolated, there is no cross-talk -- the cart agent never sees the login agent's exploration. When all three finish, the main thread collects three summaries and you review them together.

The rule for parallelism is simple: fan out only when tasks share no state and have no ordering dependency. Writing three unrelated suites is a perfect fit. Planning then writing the *same* suite is not -- the writer needs the planner's output, so those must run in sequence. Mixing the two -- parallel where independent, sequential where dependent -- is exactly how a human QA lead would schedule the work.

## Combining Subagents With the Playwright MCP Server

The Model Context Protocol lets a subagent control a real browser. The Playwright MCP server exposes tools like \`browser_navigate\`, \`browser_snapshot\`, and \`browser_click\` that an agent calls to drive Chromium directly. Adding those tools to your \`playwright-writer\` allowlist (as shown earlier) gives the agent eyes on the actual running app.

To register the server with Claude Code:

\`\`\`bash
claude mcp add playwright npx '@playwright/mcp@latest'
\`\`\`

Once connected, the writer agent can take an accessibility snapshot of the page, read the real roles and labels of every element, and build locators from ground truth instead of guessing. That is a major reliability gain: most flaky Playwright tests come from selectors that never matched the real DOM, and an MCP-equipped agent eliminates that class of failure by checking before it commits.

A snapshot-driven flow inside the agent looks like this conceptually: navigate to the page, take a snapshot, find the "Sign in" button by its accessible role, then write \`getByRole('button', { name: 'Sign in' })\` knowing it resolves. For a full treatment of MCP in a QA context, see [MCP for QA engineers](/blog/mcp-for-qa-engineers-guide).

## A Concrete End-to-End Example

Let us walk a single ticket through the whole team. The ticket, \`tickets/QA-218.md\`, says: "As a user, I can request a password reset. Submitting a valid email shows a confirmation message; an invalid email shows an inline error."

**Step 1 -- the planner reads the ticket and code.** You invoke the test-planner. It reads the ticket, greps for the reset route, and opens the form component. It returns a plan:

\`\`\`markdown
# Test plan: Password reset (QA-218)

## Scenarios
1. Valid email -> confirmation message visible
2. Unknown email -> still shows generic confirmation (no account enumeration)
3. Malformed email -> inline validation error, no request sent
4. Empty submit -> required-field error
5. Rate limit -> sixth attempt within a minute is blocked

## Notes
- Confirmation copy: "Check your inbox for a reset link."
- Error copy: "Enter a valid email address."
\`\`\`

**Step 2 -- the writer turns the plan into tests.** You hand the plan to the playwright-writer. It uses the Playwright MCP server to open the reset page, snapshots it to confirm the field and button roles, then produces and runs this file:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Password reset', () => {
  test('valid email shows confirmation', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email address').fill('user@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(
      page.getByText('Check your inbox for a reset link.')
    ).toBeVisible();
  });

  test('malformed email shows inline error', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email address').fill('not-an-email');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(
      page.getByText('Enter a valid email address.')
    ).toBeVisible();
    await expect(
      page.getByText('Check your inbox for a reset link.')
    ).toBeHidden();
  });

  test('empty submit shows required error', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText('Email address is required.')).toBeVisible();
  });
});
\`\`\`

The agent runs \`npx playwright test tests/e2e/password-reset.spec.ts\`, confirms green, and returns the path plus a coverage note.

**Step 3 -- the reviewer checks it.** You dispatch the code-reviewer subagent. It reads the file and flags, say, that scenario 5 (rate limiting) from the plan is missing, and that one assertion could use \`toHaveText\` for an exact match. No edits -- just findings.

**Step 4 -- the triager handles a future failure.** Two weeks later the malformed-email test fails in CI. You dispatch the flaky-test-triager. It reads the trace, sees the error copy changed to "Please enter a valid email," classifies it as a real product change rather than a flake, and proposes the one-line assertion update. You approve, and the writer applies it.

That loop -- plan, write, review, triage -- is a complete QA pipeline assembled from four small, auditable Markdown files.

## When Subagents Help vs Hurt

Subagents are not free. Each one spins up a fresh context and pays a startup cost, and the orchestration adds latency. Use this table to decide.

| Situation | Use subagents? | Why |
|---|---|---|
| Writing several independent test suites | Yes | Parallel, isolated, no cross-talk |
| Deep exploration of a large codebase before planning | Yes | Keeps noisy reads out of the main context |
| Recurring role with a stable, specific prompt | Yes | Codify it once, reuse across the team |
| A one-line edit to an existing test | No | Orchestration overhead exceeds the work |
| Tasks that must share evolving state | No | Isolated contexts cannot see each other's progress |
| A quick question you can answer inline | No | A subagent round-trip is slower than just answering |

The heuristic: reach for a subagent when the work is deep, noisy, parallelizable, or repeated. Stay in the main thread when the work is small, tightly coupled, or interactive. Forcing every step through a subagent makes a simple change feel like a committee meeting.

## Versioning and Sharing Your QA Agents

Because subagents are files in \`.claude/agents/\`, treat them like production code. Review prompt changes in pull requests -- a tweak to \`playwright-writer.md\` changes how every test in your repo gets written, so it deserves the same scrutiny as a change to a shared utility. Keep each agent's prompt tight and specific; resist the urge to grow one agent into a god-agent that does everything.

A few practices that hold up well in real teams. Keep the \`description\` field action-oriented so automatic delegation routes correctly. Keep tool allowlists minimal -- a planner that cannot write code cannot accidentally corrupt your suite. Pin cheaper models on read-only agents to control cost. And store example inputs (a sample ticket, a sample plan) next to the agents so new contributors understand the expected handoffs. For broader context on how these agentic workflows compare to commercial tools, see [AI test automation tools](/blog/ai-test-automation-tools-2026).

## Conclusion

Claude Code subagents testing turns one assistant into a coordinated QA team: a read-only test-planner that enumerates coverage, a browser-driving playwright-writer that produces and verifies runnable tests, a flaky-test-triager that separates real bugs from noise, and a comment-only code-reviewer that guards quality. Each lives as a small Markdown file with frontmatter under \`.claude/agents/\`, runs in its own isolated context, and can be dispatched on demand or in parallel. Wire the writer to the Playwright MCP server and your agents work against the real DOM instead of guessing. Start with the four-role team above, keep each agent sharp and single-purpose, and version the prompts like the production assets they are.

Ready to build your own QA agent team? Browse battle-tested QA workflows and prompts in the [QASkills directory](/skills) and adapt them straight into your subagent system prompts.

## Frequently Asked Questions

### What are Claude Code subagents?

Claude Code subagents are independent agents the main session can invoke to handle a focused task. Each runs in its own context window, starts from its own system prompt, and is limited to a tool allowlist you define. When a subagent finishes, only its final summary returns to the main thread, keeping your primary conversation clean. They are ideal for deep, noisy, or repeatable work like test planning and generation.

### How do subagents help with test automation?

Subagents split QA work by role so each agent does one job well. A test-planner enumerates scenarios from a ticket and code, a writer turns that plan into runnable Playwright tests and verifies them in a browser, a triager diagnoses failures, and a reviewer checks quality. Because exploration happens in isolated contexts, your main thread stays focused, and independent suites can be generated in parallel for real speed gains.

### Where are Claude Code subagents defined?

Subagents are Markdown files with YAML frontmatter. Project agents live in the repository under a dot-claude agents folder and are shared with your whole team through version control. Personal agents live in your home directory and are available across every project. When names collide, the project-level definition takes precedence over the user-level one, so team conventions always win inside a repo.

### Can subagents run in parallel?

Yes. Claude Code can dispatch multiple subagents in a single turn, and they execute concurrently in separate contexts with no cross-talk. Parallelism is only safe when the tasks share no state and have no ordering dependency, such as writing several unrelated test suites at once. Work that depends on a previous agent's output, like writing tests from a plan, must still run in sequence after the upstream agent finishes.

### What goes in a subagent's frontmatter?

The frontmatter defines the agent's name, a description that tells the orchestrator when to delegate to it, and a tools list that restricts what the agent can access. You can also pin a model so cheaper agents run on a smaller, faster model while heavier reasoning agents use a larger one. The Markdown body below the frontmatter is the system prompt that shapes the agent's behavior on every task.

### Do subagents remember my conversation?

No. A spawned subagent starts from a fresh context and has no memory of your main conversation. That isolation is the point, but it means the dispatching prompt must be self-contained. Include the ticket text, file paths, and any plan the agent needs to act on, because the subagent cannot ask follow-up questions or read your earlier messages. Treat each dispatch as briefing a specialist who just walked in cold.

### How do subagents work with the Playwright MCP server?

You add the Playwright MCP server to Claude Code, then grant its browser tools to your writer agent's allowlist. The agent can then navigate to a page, take an accessibility snapshot, and read the real roles and labels of elements before building locators. This lets it confirm every selector resolves against the live DOM and run the test to green before returning, which removes the most common source of flaky Playwright tests.

### When should I not use a subagent?

Skip subagents for small, tightly coupled, or interactive work. A one-line edit to an existing test costs more in orchestration overhead than the change itself, and tasks that must share evolving state cannot benefit from isolated contexts. Quick questions you can answer inline are also faster without a round-trip. Reach for subagents when work is deep, noisy, parallelizable, or recurring, and stay in the main thread otherwise.
`,
};
