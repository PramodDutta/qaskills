import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'What Is the QASkills MCP Server? Install QA Skills From Any AI Agent',
  description:
    'The QASkills MCP server lets Claude Code, Cursor, and any MCP client search, inspect, and install 400+ QA testing skills. Setup, the 6 tools, and usage.',
  date: '2026-07-09',
  category: 'AI Testing',
  content: `
# What Is the QASkills MCP Server? Install QA Skills From Any AI Agent

If you already use AI coding agents for test work, you have probably hit the same friction: the agent can write a Playwright test or a contract check, but it does not know which QA skill patterns your team has standardized, and you leave the editor to hunt the registry by hand. The **QASkills MCP server** (\`@qaskills/mcp\` on npm) closes that gap. It is a stdio [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the [QASkills.sh](https://qaskills.sh) catalog as tools your agent can call mid-conversation: search, inspect, read full \`SKILL.md\` content, and install skills into the project.

This guide covers what the server is, how to install it in Claude Code and generic MCP clients, the six tools, a realistic usage walkthrough, env and telemetry knobs, and when to prefer MCP over the CLI.

## MCP in one paragraph

MCP (Model Context Protocol) is an open standard for connecting AI clients to external tools and data over a simple client-server interface. A host (Claude Code, Cursor, Windsurf, Codex CLI, Gemini CLI, and others) starts an MCP server process and advertises its tools to the model. The model then calls those tools by name with structured arguments, instead of you pasting API docs or running shell one-liners by hand. For local work that needs filesystem access, **stdio** servers are the usual shape: the client spawns \`npx\` (or a binary), talks over stdin/stdout, and the server can read and write files on your machine.

## Why a QA skills MCP server matters

QASkills.sh is an open registry of 400+ QA testing skills for AI coding agents: Playwright E2E patterns, API testing checklists, accessibility audits, performance budgets, and more. Each skill is a \`SKILL.md\` file with YAML frontmatter and a markdown body the agent is meant to follow.

Discovery on a website is fine for humans. Agents need discovery **inside the conversation**. When you say "add visual regression coverage for the checkout flow," the useful next step is not "open a browser tab." It is: search the registry for a matching skill, read the full instructions, then land that file in \`.claude/skills\` or \`.agents/skills\` so the next turns (and future sessions) actually use it.

That last step is the product difference. A read-only search API is helpful; **\`install_skill\` closes the loop**. Search -> inspect -> install becomes one agent turn chain with no alt-tab. The server is published as \`@qaskills/mcp\` on npm and listed in the official MCP registry ([registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io)) as \`io.github.PramodDutta/qaskills\`, so any MCP-capable client can find and run it the same way.

If you are still ramping on MCP itself for test tooling, the companion post [MCP for QA Engineers](/blog/mcp-for-qa-engineers-guide) is a useful primer. For agent-side skill install paths outside MCP, see [How to Install Skills in Claude Code](/blog/how-to-install-skills-claude-code).

## Install: Claude Code

One command registers the server with Claude Code and keeps the package current via \`npx -y\`:

\`\`\`bash
claude mcp add qaskills -- npx -y @qaskills/mcp
\`\`\`

Restart or re-open the session if tools do not appear immediately. After that, Claude can call \`search_skills\`, \`get_skill\`, \`get_skill_content\`, \`install_skill\`, \`list_categories\`, and \`get_leaderboard\` without extra setup. No API key is required for the public catalog; the server talks to \`https://qaskills.sh\` by default.

## Install: generic MCP clients (Cursor, Windsurf, Codex CLI, Gemini CLI)

Any client that supports the standard \`mcpServers\` config can load the same package. Drop this block into the client's MCP configuration (path names differ by product; the JSON shape is what matters):

\`\`\`json
{
  "mcpServers": {
    "qaskills": {
      "command": "npx",
      "args": ["-y", "@qaskills/mcp"]
    }
  }
}
\`\`\`

That is the full config. The process is stdio-based, so \`install_skill\` can write into the project tree the client has open. Works with Claude Code, Cursor, Windsurf, Codex CLI, and Gemini CLI under the same package name.

## The six tools

| Tool | What it does | Example |
| --- | --- | --- |
| \`search_skills\` | Find skills by text query plus optional filters: testing type, framework, language, agent, sort, limit | \`query: "playwright visual"\`, \`framework: "playwright"\`, \`sort: "quality"\` |
| \`get_skill\` | Return skill metadata JSON by slug (no full markdown body) | \`slug: "playwright-e2e"\` |
| \`get_skill_content\` | Return the full raw \`SKILL.md\` markdown for a slug | \`slug: "playwright-e2e"\` |
| \`install_skill\` | Write that \`SKILL.md\` into the project under \`.claude/skills\` or \`.agents/skills\` (optional target dir / agent) | \`slug: "playwright-e2e"\`, \`agent: "claude-code"\` |
| \`list_categories\` | List registry categories grouped by testing type, framework, language, and domain | (no required args) |
| \`get_leaderboard\` | Return top skills from the QASkills.sh leaderboard | \`limit: 10\` |

\`search_skills\` is the usual entry point. \`get_skill\` is cheap metadata for comparison. \`get_skill_content\` is what you want before you trust an install. \`install_skill\` is the write path that makes the registry operational inside the repo. \`list_categories\` and \`get_leaderboard\` help when you are browsing rather than chasing one keyword.

## Realistic walkthrough: search, read, install

You are in Cursor (or Claude Code) on a TypeScript monorepo. You ask the agent:

> We need a solid Playwright E2E skill for this project. Search QASkills for Playwright E2E, show me the best match, then install it for Claude Code.

A competent agent flow looks like this (tool names and intent; exact argument JSON varies by host UI):

1. **\`search_skills\`** with something like \`query: "playwright e2e"\`, \`framework: "playwright"\`, \`language: "typescript"\`, \`sort: "quality"\`, \`limit: 5\`. The server hits the public API and returns summaries (name, slug, description, tags, scores).
2. **\`get_skill\`** on the chosen slug (for example \`playwright-e2e\`) if the agent only needs metadata: version, agents, testing types, without pulling the whole body.
3. **\`get_skill_content\`** on that slug when the agent (or you) should actually follow the skill: page object patterns, fixture setup, flake-resistant locators, CI notes. This is the full \`SKILL.md\` as markdown.
4. **\`install_skill\`** with the same slug and \`agent: "claude-code"\` (or leave defaults). The server writes \`SKILL.md\` under the project's skill directory (\`.claude/skills\` or \`.agents/skills\` depending on agent), so later turns load project-local instructions instead of re-fetching from memory.

You can stop after step 3 if you only want to review content. You can skip step 2 if search already gave you enough to pick a slug. The important property is that discovery, inspection, and install never leave the agent session.

For browser automation MCP servers that drive pages (separate from skills catalog access), see [Playwright MCP for Claude Code setup](/blog/playwright-mcp-claude-code-setup-2026). QASkills MCP is complementary: it installs *how* your agent should test; browser MCP servers *execute* browser actions.

## Environment and telemetry

| Variable / signal | Effect |
| --- | --- |
| \`QASKILLS_API_URL\` | Override the API base URL (default \`https://qaskills.sh\`). Useful for staging or local API work. |
| \`QASKILLS_TELEMETRY=0\` | Disable install telemetry from the MCP server. |
| \`DO_NOT_TRACK\` | Also disables install telemetry when set (standard opt-out convention). |

You do not need auth env vars for catalog search or install against the public site. If your security policy bans network telemetry from tooling, set either telemetry kill switch before the client starts the server process.

## MCP server vs CLI

QASkills also ships a CLI (\`qaskills\` commands such as search/add). Both talk to the same registry; the interface is what differs.

| Dimension | QASkills MCP server | QASkills CLI |
| --- | --- | --- |
| Primary user | The AI agent (tool calls) | You (or scripts) in a terminal |
| Discovery | In-conversation via \`search_skills\` | Shell: search command / scripts |
| Install | \`install_skill\` into project skill dirs | CLI add/install into agent paths |
| Best when | You are already in Claude Code / Cursor / Windsurf and want zero context switch | CI, bulk ops, or non-MCP environments |
| Config | \`mcpServers\` + \`npx -y @qaskills/mcp\` | Global or project CLI install |
| Clients | Any MCP host (Claude Code, Cursor, Windsurf, Codex CLI, Gemini CLI) | Anywhere Node can run |

Use MCP when the agent is the operator. Use the CLI when you are the operator or automation outside an MCP host. Many teams will keep both: MCP for day-to-day agent work, CLI for bootstrap scripts and CI.

## What to expect day to day

After install, treat the QA MCP server as catalog plumbing, not a test runner. It does not execute Playwright; it supplies structured QA skills so the agent stops improvising every suite from scratch. Patterns that work well in practice:

- **Start narrow.** Prefer \`search_skills\` with framework + language filters over a vague one-word query.
- **Read before install.** Call \`get_skill_content\` when the skill will change how the agent writes tests for the rest of the session.
- **Install once per project.** \`install_skill\` is for making the skill durable in the repo; do not reinstall on every message unless you are updating.
- **Combine with domain MCP servers.** Pair QASkills with browser, API, or DB MCP servers so "how to test" and "how to act" stay separate tool surfaces.

## Frequently Asked Questions

### What is the package name and registry ID for the QASkills MCP server?

On npm the package is \`@qaskills/mcp\`. On the official MCP registry it is published as \`io.github.PramodDutta/qaskills\`. Clients typically run it with \`npx -y @qaskills/mcp\`.

### Does the QASkills MCP server work only with Claude Code?

No. It is a standard stdio MCP server. It works with any MCP client that can launch a command-based server, including Claude Code, Cursor, Windsurf, Codex CLI, and Gemini CLI, using the same \`npx\` config.

### Do I need an API key to use \`@qaskills/mcp\`?

No key is required for the public catalog. The server defaults to \`https://qaskills.sh\`. Set \`QASKILLS_API_URL\` only if you need a different API base.

### How do I turn off telemetry for the QASkills MCP server?

Set \`QASKILLS_TELEMETRY=0\` or set \`DO_NOT_TRACK\` (commonly \`DO_NOT_TRACK=1\`) in the environment of the process that starts the server. Install telemetry is disabled when either is respected by the server.
`,
};
