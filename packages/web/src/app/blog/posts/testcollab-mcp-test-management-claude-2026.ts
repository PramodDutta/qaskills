import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'TestCollab MCP: AI Test Management in Claude Code (2026)',
  description:
    'A complete guide to the TestCollab MCP server and its 17 tools. Run AI test management in Claude Code with plain language for planning, execution, and reports.',
  date: '2026-06-22',
  category: 'Guide',
  content: `
# TestCollab MCP: AI Test Management in Claude Code (2026)

Test management has lived in web dashboards for two decades. You log in, click into a project, drill into a suite, expand a plan, find a test case, and update its status one row at a time. The work is necessary, but the friction is real: context-switching out of your editor, hunting through nested folders, and copy-pasting failure details from a terminal into a text field. The TestCollab MCP Server collapses that friction. It exposes your test management system as a set of tools that an AI agent like Claude Code can call directly, so you plan, execute, and report on tests by typing a sentence instead of clicking through a UI.

This guide explains what the TestCollab MCP Server does, walks through its 17 tools across 5 categories, shows you how to install and configure it in Claude Code with a real \`.mcp.json\` snippet, and gives you concrete natural-language prompts you can copy today. We also cover security and authentication, CI/CD integration, and how MCP-driven test management compares to a traditional manual TMS workflow and to hand-rolled API scripting. If you are new to the protocol itself, start with our companion guide on [MCP for QA engineers](/blog/mcp-for-qa-engineers-guide) and then come back here for the test-management specifics.

## What Is MCP (the 90-Second Version)

The Model Context Protocol (MCP) is an open standard for connecting AI applications to external tools and data. An MCP **server** exposes a set of tools, each with a name, a description, and a typed input schema. An MCP **client** (Claude Code, Cursor, VS Code with Copilot, or any other compatible host) discovers those tools at connection time and lets the model call them in response to your prompts. The model reads the tool descriptions, decides which tool fits your request, fills in the parameters, and the server executes the real action against the backing system.

MCP went from a niche Anthropic announcement in late 2024 to an industry baseline remarkably fast. By March 2026 the MCP SDKs were seeing roughly 97 million downloads per month, and every major AI provider had adopted it. That matters for QA because it means the same TestCollab MCP server works across the AI clients your team already uses, instead of being locked to one vendor. You are not betting on a proprietary plugin; you are speaking a protocol that the whole ecosystem now supports.

For test management specifically, MCP is a natural fit. A TMS is fundamentally a structured store of suites, cases, plans, runs, and results. Those are exactly the kind of typed, well-bounded operations that map cleanly onto MCP tools. Instead of clicking "New Test Plan," you say "create a test plan for the checkout flow," and the agent calls the right tool with the right arguments.

## What the TestCollab MCP Server Does

The TestCollab MCP Server is a bridge between an MCP client and your TestCollab account. It authenticates with your TestCollab API token, connects to your project, and surfaces the core test management workflow as 17 callable tools grouped into 5 categories: Test Suites, Test Cases, Test Plans, Test Execution, and Project Context.

In practice that means an AI agent can do the full loop without you touching the web UI:

- **Plan.** Create and organize test suites, draft test cases, and assemble them into test plans scoped to a feature or release.
- **Execute.** Start a test run from a plan, walk through cases, and record pass, fail, or blocked results with notes.
- **Track and report.** Pull current execution status, summarize what passed and failed, and surface trends so you can answer "are we ready to ship?" in one prompt.
- **Stay in context.** Query project metadata, members, and configuration so the agent knows which project, suite, and plan you mean without you spelling out internal IDs every time.

The shift is from a point-and-click TMS to a conversational one. You describe intent; the agent translates it into the precise sequence of tool calls.

## The 5 Tool Categories at a Glance

The 17 tools cluster into 5 functional areas. The table below maps each category to its responsibility and the kind of natural-language request that triggers it.

| Category | What it manages | Representative request |
|---|---|---|
| Test Suites | Folders/containers that organize cases by feature, module, or area | "Create a suite called Payments under the Web project" |
| Test Cases | Individual test definitions: title, steps, expected results, priority | "Add a test case for declined-card handling to the Payments suite" |
| Test Plans | Curated sets of cases scoped to a release, sprint, or feature | "Build a regression plan for the 2.4 release from the smoke suite" |
| Test Execution | Runs created from plans; per-case results (pass/fail/blocked) and notes | "Start a run for the regression plan and mark TC-123 as failed" |
| Project Context | Project, member, and configuration metadata for resolving references | "Which project am I connected to and who are the members?" |

Each category contains several tools. Test Cases, for example, typically includes tools to list, create, read, and update cases; Test Execution includes tools to create a run, fetch run status, and record results. The exact count per category can shift across releases, but the five-category contract and the 17-tool surface define the workflow boundary: everything you would normally do in the TestCollab UI for day-to-day management is reachable through one of these tools.

## How to Install and Configure It in Claude Code

Claude Code reads MCP server configuration from an \`.mcp.json\` file. You can scope it to a single project (commit it to the repo so the whole team shares the same servers) or to your user profile (available across all your projects). For test management, a project-scoped config is usually right: the project maps cleanly to a TestCollab project.

Create or edit \`.mcp.json\` at the root of your repository. A realistic configuration that launches the TestCollab MCP server over stdio and passes the API token and project via environment variables looks like this:

\`\`\`json
{
  "mcpServers": {
    "testcollab": {
      "command": "npx",
      "args": ["-y", "@testcollab/mcp-server"],
      "env": {
        "TESTCOLLAB_API_TOKEN": "\${TESTCOLLAB_API_TOKEN}",
        "TESTCOLLAB_PROJECT_ID": "\${TESTCOLLAB_PROJECT_ID}"
      }
    }
  }
}
\`\`\`

Notice the \`\${TESTCOLLAB_API_TOKEN}\` and \`\${TESTCOLLAB_PROJECT_ID}\` references. Claude Code expands environment variables in \`.mcp.json\`, which keeps secrets out of the committed file. Set the real values in your shell or an untracked \`.env\` you source before launching:

\`\`\`bash
export TESTCOLLAB_API_TOKEN="tc_live_xxxxxxxxxxxxxxxx"
export TESTCOLLAB_PROJECT_ID="4821"
\`\`\`

After saving \`.mcp.json\`, restart Claude Code (or reload the MCP servers). On startup the client connects to the server, performs the MCP handshake, and discovers the 17 tools. You can confirm the connection with the built-in command to list configured servers:

\`\`\`bash
claude mcp list
\`\`\`

If the server shows as connected, the tools are live. From here, every prompt that involves test management can flow through the agent. If the server fails to connect, the two most common causes are a missing or invalid \`TESTCOLLAB_API_TOKEN\` and a Node version too old to run \`npx\` reliably — check both before digging deeper.

### Adding It via the CLI Instead

If you prefer not to hand-edit JSON, Claude Code can register the server for you and write the config:

\`\`\`bash
claude mcp add testcollab \\
  --env TESTCOLLAB_API_TOKEN=\$TESTCOLLAB_API_TOKEN \\
  --env TESTCOLLAB_PROJECT_ID=\$TESTCOLLAB_PROJECT_ID \\
  -- npx -y @testcollab/mcp-server
\`\`\`

This produces the same \`.mcp.json\` entry shown above. Use whichever flow fits your team — the CLI is faster for one-offs, the committed JSON is better for shared, reproducible setups.

## Example Natural-Language Prompts

The whole point of MCP-driven test management is that you stop memorizing UI navigation and start describing outcomes. Here are prompts that map onto real tool calls, with the category each one exercises.

**Planning a feature:**

- "Create a test plan for the checkout flow with cases for valid payment, declined card, expired card, and address validation." (Test Plans + Test Cases)
- "Add a high-priority test case to the Auth suite covering password reset with an expired token." (Test Cases)
- "Make a new suite called Mobile Onboarding and move the existing onboarding cases into it." (Test Suites)

**Executing a run:**

- "Start a test run for the Checkout Regression plan." (Test Execution)
- "Mark TC-123 as failed and add the note 'Razorpay webhook returned 502 on retry.'" (Test Execution)
- "Mark all cases in the smoke plan as passed except TC-204, which is blocked on the staging outage." (Test Execution)

**Tracking and reporting:**

- "What is the current status of the 2.4 release run? Give me pass, fail, and blocked counts." (Test Execution + Project Context)
- "Summarize the failures from today's regression run and group them by suite." (Test Execution)
- "Are we green enough to ship? List any failing high-priority cases." (Test Execution + Test Cases)

Because the agent has the tool descriptions and your project context, it resolves references like "the checkout plan" or "TC-123" to the right internal records. You speak in the language of the work, not the schema.

## Generating Test Cases From a Codebase

One of the most useful patterns combines the TestCollab MCP server with Claude Code's native ability to read your repository. Because Claude Code already has filesystem access to the project you launched it in, you can ask it to read your source, infer behavior, and then write the resulting cases straight into TestCollab through the MCP tools.

A representative prompt:

> "Read \`src/checkout/payment.ts\` and the integration tests in \`tests/checkout/\`. Identify edge cases that are not yet covered, then create test cases in TestCollab under the Payments suite for each gap. Use clear steps and expected results, and tag anything security-relevant as high priority."

Here the agent does two jobs at once. It uses its code-reading tools to analyze \`payment.ts\` — branches, error handling, validation, retry logic — and it uses the TestCollab Test Cases tools to persist the new cases. You review the proposed cases, accept or refine them, and they land in your TMS already organized into the right suite. This is the same skills-driven workflow we describe for [Playwright test agents with Claude Code](/blog/playwright-test-agents-claude-code), applied to the planning layer instead of the execution layer.

A word of caution: AI-generated cases are a strong first draft, not a final spec. Treat them as a proposal that a human reviews. The agent is excellent at enumerating branches and edge conditions; it is weaker at knowing which of those branches actually matters to your business. Keep the human in the loop on prioritization.

## Execution Tracking and Reporting

Once a plan exists, the execution loop is where MCP saves the most time. Recording results during exploratory or manual passes traditionally means alt-tabbing to the TMS for every single case. With the MCP server, you keep your hands on the keyboard and narrate results:

\`\`\`text
You: Start a run for the Checkout Regression plan.
Claude: Created run #7714 for "Checkout Regression" (24 cases).

You: TC-101 through TC-110 all passed. TC-111 failed — the
     coupon stacking allowed two single-use codes. TC-112 is
     blocked, staging is down.
Claude: Recorded. 10 passed, 1 failed, 1 blocked. 12 remaining.

You: Give me the run summary.
Claude: Run #7714 — Passed: 10, Failed: 1, Blocked: 1, Not run: 12.
        Failing case: TC-111 (coupon stacking, high priority).
\`\`\`

For reporting, the Test Execution and Project Context tools let the agent assemble exactly the view you ask for: a release readiness summary, a failure breakdown by suite, or a trend across the last several runs. Because the data lives in TestCollab, these summaries are grounded in real records — the agent is querying your TMS, not hallucinating numbers. The reporting you would otherwise build by exporting CSVs and pivoting in a spreadsheet becomes a single prompt.

## Security and Authentication Considerations

The TestCollab MCP server acts on your behalf using an API token, so treat that token like any other production credential.

- **Scope the token.** Use a token tied to a service or bot account with only the project access it needs, not your personal admin credentials. If TestCollab supports project-scoped or read/write-scoped tokens, prefer the narrowest scope that still lets the agent do its job.
- **Never commit the token.** Keep it in environment variables referenced via \`\${...}\` in \`.mcp.json\`, or in an untracked \`.env\`. Add \`.env\` to \`.gitignore\`. A token leaked into git history is compromised even after you delete it.
- **Rotate on a schedule and on exposure.** Rotate tokens periodically and immediately if one is ever printed in logs, pasted in chat, or shared in a screenshot.
- **Understand what the agent can do.** A write-capable token means the agent can change test data — create suites, edit cases, record results. In a shared project, that is real authority. Review what your client allows the model to call automatically versus what requires your confirmation, and keep destructive operations gated behind a human approval.
- **Audit.** Because actions flow through the API, they appear in TestCollab's activity log attributed to the token's account. Use that trail to review what the agent did, especially early in adoption.

The convenience of natural-language test management does not change the underlying access model. The same care you would take with a CI service account applies here.

## The CI/CD Angle

MCP shines in interactive sessions, but the same TestCollab account and API also belong in your pipeline — and the two reinforce each other. A common pattern is to keep automated, deterministic result reporting in CI via the API, while using the MCP server for the human-driven planning, triage, and ad-hoc reporting that does not fit a script.

In CI you typically push automated test outcomes to TestCollab after a run completes. The MCP server then becomes the interface a QA lead uses to interrogate those results conversationally: "What failed in last night's nightly run and which of those are new failures?" The agent reads the records CI wrote and answers in plain language. You get machine-precise reporting from the pipeline and human-friendly analysis from the agent, both pointed at the same source of truth.

For teams pushing further into autonomy, the agent can also bridge the gap: spot a cluster of failures, draft new regression cases to cover the regression, and file them into the right suite — all in one session. That combination of automated execution plus AI-assisted maintenance is where modern QA is heading, and it pairs naturally with the patterns in [self-healing test automation](/blog/self-healing-test-automation-2026-guide).

## MCP-Driven Test Management vs Manual TMS vs API Scripting

There are three ways to drive a test management system today: click through the web UI by hand, write scripts against the REST API, or talk to it through an MCP server. Each has a place. The table below compares them across the dimensions that matter for day-to-day QA.

| Dimension | Manual TMS (web UI) | API scripting | MCP-driven (TestCollab MCP) |
|---|---|---|---|
| Setup cost | None | Moderate (write + maintain scripts) | Low (one \`.mcp.json\` entry) |
| Speed for ad-hoc tasks | Slow (lots of clicking) | Slow (must write a script first) | Fast (one sentence) |
| Repeatability | Low | High | Medium-high |
| Context switching | High (leave the editor) | Medium | Low (stay in the agent) |
| Skill required | Low | High (coding + API knowledge) | Low (natural language) |
| Best for | Occasional, one-off edits | Deterministic, scheduled automation | Interactive planning, triage, reporting |
| Auditability | UI activity log | Your code + logs | API activity log |
| Handles fuzzy intent | No | No | Yes (agent resolves references) |

The honest takeaway: MCP does not replace API scripting for deterministic, scheduled jobs, and it does not replace the web UI for the rare deep-dive into settings. What it replaces is the high-friction middle — the dozens of small, interactive management tasks that are too ad-hoc to script but too tedious to click. That middle is where most QA time quietly leaks, and it is exactly where conversational test management pays off.

## Getting Started in Practice

A pragmatic rollout looks like this. First, generate a scoped TestCollab API token for a bot account and confirm you can list your project via the API. Second, add the \`.mcp.json\` entry shown above and verify the server connects with \`claude mcp list\`. Third, run a low-stakes prompt — "list the suites in this project" — to confirm read access works end to end. Fourth, try a write — "create a suite called Sandbox" — and check that it appears in the UI. Once the round trip works, fold the agent into a real workflow: have it draft cases from a feature spec, then drive the execution loop conversationally during your next manual pass.

Keep humans in the loop on prioritization and on anything destructive. The agent is a force multiplier for the mechanical parts of test management, not a replacement for QA judgment. Used that way, the TestCollab MCP server turns the TMS from a place you visit into a capability your agent simply has.

## Frequently Asked Questions

### What is the TestCollab MCP server?

It is an MCP server that connects an AI client like Claude Code to your TestCollab account. It exposes 17 tools across 5 categories — Test Suites, Test Cases, Test Plans, Test Execution, and Project Context — so an agent can plan, execute, and report on tests through natural-language conversation instead of clicking through the TestCollab web UI.

### How many tools does it expose and what do they cover?

The server exposes 17 tools grouped into 5 categories. Together they cover the core test management workflow: creating and organizing suites, drafting and updating test cases, assembling test plans, running executions and recording pass/fail/blocked results, and querying project context like members and configuration so the agent can resolve your references correctly.

### Do I need to know the MCP protocol to use it?

No. The protocol is plumbing handled by the client and server. You only edit one \`.mcp.json\` entry once, then interact in plain English. If you want the background, read our [MCP for QA engineers](/blog/mcp-for-qa-engineers-guide) guide, but it is not required to be productive with the TestCollab server.

### Is it secure to give an AI agent my TestCollab token?

It is as secure as you make it. Use a scoped bot-account token, never commit it (reference it via \`\${TESTCOLLAB_API_TOKEN}\` and keep the real value in an untracked \`.env\`), rotate it regularly, and gate destructive operations behind human confirmation. All actions are attributed to the token's account in TestCollab's activity log, so you retain an audit trail.

### Can it generate test cases from my code?

Yes. Because Claude Code can read your repository and call the TestCollab tools in the same session, you can ask it to analyze a source file, find uncovered edge cases, and write new cases into the right suite. Treat the output as a strong first draft that a human reviews and reprioritizes before it becomes part of your suite.

### Does this work with AI clients other than Claude Code?

Yes. MCP is an open standard adopted across the industry — by March 2026 the SDKs were seeing roughly 97 million downloads per month — so the same TestCollab MCP server works with any MCP-compatible client, including Cursor and VS Code with Copilot. The configuration format differs slightly per client, but the tool surface is identical.

### How does MCP-driven test management compare to API scripting?

They are complementary. API scripting is best for deterministic, scheduled jobs like pushing CI results. MCP is best for interactive, ad-hoc work — planning, triage, and reporting — where you describe intent and the agent resolves it. Most teams keep CI reporting on the API and use the MCP server for everything a human drives by hand.

### Will it work in my CI pipeline?

The MCP server is designed for interactive agent sessions, not headless CI. In CI you typically push automated results to TestCollab via the API. The MCP server then becomes the conversational interface a QA lead uses to interrogate and report on those CI-written results, giving you machine-precise reporting plus human-friendly analysis from the same data.

## Conclusion

The TestCollab MCP server is a clean example of where AI test management is going: not a flashy autonomous robot, but a quiet removal of friction from the work QA already does. Seventeen tools across five categories — Test Suites, Test Cases, Test Plans, Test Execution, and Project Context — turn the management layer of your TMS into something an agent can drive from a sentence. You plan a checkout flow, mark TC-123 as failed, and pull a release-readiness summary without leaving your editor, and you do it in plain English.

Set it up with a scoped token, a single \`.mcp.json\` entry, and a quick connection check, then fold it into your real planning and triage loops. Keep humans on prioritization and destructive actions, and let the agent absorb the tedium.

Ready to build the AI-driven QA stack this fits into? Browse the curated, agent-ready skills in our directory at [/skills](/skills) to find MCP servers, Playwright agents, and self-healing patterns you can install today — and pair them with the planning workflow above to close the loop from spec to ship.
`,
};
