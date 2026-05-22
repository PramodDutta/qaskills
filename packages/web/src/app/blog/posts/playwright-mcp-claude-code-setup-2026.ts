import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright MCP with Claude Code: Setup and Configuration 2026',
  description:
    'Complete 2026 guide to setting up Playwright MCP server with Claude Code CLI. Covers installation, mcp.json, headless mode, authentication, troubleshooting, and CI integration.',
  date: '2026-05-21',
  category: 'Tutorial',
  content: `
Claude Code is the official terminal-native AI coding agent from Anthropic, and in 2026 it has become the default tool for QA engineers who want a deeply scriptable agent that lives next to their codebase. Pair it with Playwright MCP and you get something powerful: an agent that can drive a real browser, verify the behavior, and write the corresponding tests -- all without leaving your shell. This guide walks through the full setup, from installation to a fully working agent that can author end-to-end tests on demand.

## Key Takeaways

- Claude Code uses the same MCP standard as Cursor and other AI clients, but the config path is different: \`~/.claude.json\` or per-project \`.mcp.json\`
- Playwright MCP works in stdio mode by default, which is exactly what Claude Code expects
- The recommended approach is to install \`@playwright/mcp\` per project, pin the version, and check the config into git so the whole team gets identical behavior
- Claude Code can run the MCP server headless in CI, which unlocks automated test generation in pipelines
- Most setup failures trace back to one of three causes: \`npx\` not finding Node 20+, missing browser binaries, or a corporate proxy blocking the Playwright CDN
- Pair Playwright MCP with the \`playwright-e2e\` QA skill to get expert-quality test code instead of just-good-enough completions

---

## Why Playwright MCP and Claude Code

Claude Code has a few traits that make it especially well-suited to browser automation work:

- **Terminal-native.** It runs as a CLI, so you can script it, pipe its output to other tools, and run it from CI. No GUI required.
- **First-class MCP support.** Anthropic invented MCP, and Claude Code's MCP client has been battle-tested longer than any other.
- **Long context.** Claude Opus and Sonnet support up to 1M token contexts in 2026, which means an agent can hold an entire test suite, the corresponding page objects, and the accessibility tree of a complex app all at once.
- **Hooks.** Claude Code supports hooks that fire on every tool call, every prompt, and every session boundary. That lets you build deterministic guardrails on top of an otherwise non-deterministic agent.

Playwright MCP closes the missing capability: actually interacting with a browser. Together they cover the full loop -- read code, drive UI, verify behavior, write tests, run tests, commit.

---

## Prerequisites

Before you start, confirm the basics:

- **Node.js 20 or newer.** Run \`node --version\`. Older Node versions break the Neon database driver Playwright depends on transitively, and they also lack some newer fetch features the MCP server uses.
- **Claude Code 1.0 or newer.** Check with \`claude --version\`. If you do not have it yet, install with \`npm install -g @anthropic-ai/claude-code\`.
- **Disk space.** Playwright browser binaries take roughly 700 MB once installed.
- **A working terminal.** Claude Code runs best in iTerm2 on macOS, Windows Terminal on Windows, and any modern terminal emulator on Linux.

> Screenshot placeholder: Claude Code launching in a terminal with the MCP tools panel visible, showing the Playwright server connected.

---

## Step 1: Install Playwright MCP in Your Project

Open your project root and run:

\`\`\`bash
npm install --save-dev @playwright/mcp @playwright/test
npx playwright install --with-deps
\`\`\`

The first line pulls in the MCP server plus the Playwright test runner so the agent can both drive the browser and write tests against it. The second downloads Chromium, Firefox, and WebKit, plus any Linux system libraries they need.

If you do not want to commit a dependency, you can rely on \`npx\` to fetch the server at runtime:

\`\`\`bash
npx -y @playwright/mcp@latest
\`\`\`

The downside is a slight startup delay every time the MCP server boots. For team repos, install it as a devDependency and pin the version.

---

## Step 2: Locate Your Claude Code MCP Config

Claude Code reads MCP server definitions from two locations:

- **User-level config:** \`~/.claude.json\` -- servers available across every project.
- **Project-level config:** \`.mcp.json\` at the project root -- servers available only for that project. Check this into git so your team gets the same setup.

For QA work, prefer the project-level \`.mcp.json\` file. It makes onboarding new engineers trivial: clone the repo, run \`pnpm install\`, launch Claude Code, and they instantly have browser automation available.

Create the file if it does not exist:

\`\`\`bash
touch .mcp.json
\`\`\`

---

## Step 3: Add the Playwright MCP Server Definition

Open \`.mcp.json\` and add the following block:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
\`\`\`

That is the minimum viable config. Claude Code will spawn the server using stdio framing on session start.

For production-grade configurations, you typically want to pin the version and pass flags:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@0.0.32",
        "--browser=chromium",
        "--viewport-size=1440,900",
        "--ignore-https-errors"
      ],
      "env": {
        "PLAYWRIGHT_BROWSERS_PATH": "0"
      }
    }
  }
}
\`\`\`

\`PLAYWRIGHT_BROWSERS_PATH=0\` keeps the browsers inside the npm package directory, which avoids permission issues when the agent runs under different shells.

---

## Step 4: Confirm the Server Is Detected

Launch Claude Code from your project root:

\`\`\`bash
claude
\`\`\`

At the top of the session, Claude Code prints the list of MCP servers it loaded. You should see \`playwright\` in that list. If you do not, run \`claude --debug\` to see the spawn output. Common issues at this point are wrong Node version or a typo in the JSON.

Once the server is listed, ask Claude Code to verify:

> Open https://example.com using the Playwright MCP server. Take an accessibility snapshot and tell me the page heading.

Claude Code will invoke the \`browser_navigate\` tool, then \`browser_snapshot\`, then summarize the heading. If those tool calls appear in the output, the setup is working.

---

## Step 5: Use the Accessibility Tree, Not Screenshots

When you ask an LLM to look at a screenshot, it has to OCR the visible text, infer the structure of the page, and guess at what is clickable. That is fragile and expensive in tokens.

The accessibility tree gives the agent a structured, stable view of the page. Each element comes with its role, name, value, and a reference ID it can pass back to other tools. The snapshot for a typical login page looks like this:

\`\`\`yaml
- main
  - heading "Sign in to QASkills" [level=1] [ref=e3]
  - textbox "Email" [ref=e4]
  - textbox "Password" [ref=e5]
  - button "Sign in" [ref=e6]
  - link "Create an account" [ref=e7]
\`\`\`

When the agent writes a Playwright test, it can lift those role-and-name pairs straight into \`getByRole\` calls. That is exactly how you get tests that survive UI refactors instead of breaking every time someone changes a class name.

---

## Step 6: Generate a Real Test From a Natural-Language Prompt

Here is a prompt that exercises the full loop:

> Using the Playwright MCP server, sign in to https://staging.qaskills.sh with email test@example.com and password \\\`hunter2\\\`. Verify that the dashboard loads with my display name. Then write a Playwright test in tests/auth/sign-in.spec.ts that captures the same flow.

Claude Code will:

1. Call \`browser_navigate\` to load the staging URL.
2. Snapshot the page, locate the email and password fields by role.
3. Call \`browser_type\` on each, then \`browser_click\` on the Sign in button.
4. Snapshot the dashboard, verify the display name is present.
5. Write a test file like the following:

\`\`\`ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('signs in and lands on dashboard', async ({ page }) => {
    await page.goto('https://staging.qaskills.sh/sign-in');
    await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('hunter2');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\\/dashboard/);
    await expect(page.getByRole('heading', { name: /welcome,/i })).toBeVisible();
  });
});
\`\`\`

That is a high-quality test on the first try -- proper role-based locators, async/await, scoped describe block, and a URL assertion for safety.

---

## Step 7: Run the Server Headless in CI

The same MCP server works in CI. You can build a pipeline that asks Claude Code to extend the test suite based on the latest changes:

\`\`\`yaml
# .github/workflows/agent-tests.yml
name: Agent-generated tests
on: pull_request

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install
      - run: npx playwright install --with-deps
      - run: |
          claude --headless --print "Update the Playwright test suite to cover the new \\\`/onboarding\\\` route. Use the Playwright MCP server to verify before writing each test."
      - run: pnpm exec playwright test
\`\`\`

The \`--headless --print\` flags tell Claude Code to run non-interactively. The MCP server boots in headless mode automatically when no display is available.

---

## Configuration Reference for Claude Code

Beyond the basic server definition, Claude Code supports a few config knobs worth knowing:

| Field | Purpose |
|-------|---------|
| \`mcpServers.<name>.command\` | Executable to spawn |
| \`mcpServers.<name>.args\` | Arguments passed to the command |
| \`mcpServers.<name>.env\` | Environment variables for the spawned process |
| \`mcpServers.<name>.cwd\` | Working directory for the spawned process |
| \`mcpServers.<name>.disabled\` | Boolean to disable a server without removing it |

For Playwright MCP specifically, the most useful args are:

\`\`\`json
[
  "--headless",
  "--browser=chromium",
  "--viewport-size=1280,720",
  "--user-data-dir=/tmp/playwright-mcp",
  "--storage-state=auth.json",
  "--allowed-origins=https://staging.qaskills.sh"
]
\`\`\`

The \`--allowed-origins\` flag is critical for any agent running unattended -- it stops the agent from navigating off your domain even if it gets confused.

---

## Troubleshooting

### "playwright" does not appear in the MCP server list

Run \`claude --debug\` and look for spawn errors. The most common cause is a typo in the JSON. The second most common is \`npx\` resolving to a Node 18 environment because of a stale \`nvm default\`.

### Browser fails to launch with "missing system dependencies"

On Linux, run \`npx playwright install --with-deps\`. On Docker, also install \`fonts-liberation\`, \`libnss3\`, and \`libxshmfence1\`. Without those, the browser process silently dies.

### Agent loops forever calling \`browser_snapshot\`

This is almost always a prompt issue, not a setup issue. Tell the agent explicitly: "Snapshot once, find the element by role, then act." Without that guidance, the agent can over-rely on snapshots between every micro-step.

### Authentication breaks after a reboot

Saved storage states expire when the underlying cookies expire. Regenerate \`auth.json\` periodically with a fresh login flow. For CI, use a service account whose tokens have a long lifetime.

### Corporate proxy blocks browser download

Set \`HTTPS_PROXY\` before running \`npx playwright install\`. Some networks also need \`PLAYWRIGHT_DOWNLOAD_HOST\` pointed at an internal mirror.

---

## Pairing with QA Skills

Playwright MCP gives the agent the means to act. QA skills give it the wisdom to act well. Pair both:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
npx @qaskills/cli add playwright-api
\`\`\`

The \`playwright-e2e\` skill teaches the agent to use the Page Object Model on non-trivial flows, prefer role-based locators, isolate tests with \`beforeEach\` hooks, and structure CI configs that retry on the right kinds of failures. Without it, you get tests that work today. With it, you get tests that work for the next two years.

---

## Production Tips

A few patterns that consistently pay off:

**Pin the MCP server version.** \`@playwright/mcp@latest\` is fine for exploration. In team repos, pin a specific version. You will thank yourself the first time a server release changes a tool name.

**Use \`storage-state\` instead of logging in every run.** Save a logged-in session once with \`page.context().storageState({ path: 'auth.json' })\`, then point the MCP server at it. You will cut every test run by 5-15 seconds.

**Block analytics and chat widgets.** Use \`--blocked-origins\` to stop heavy third-party iframes from polluting snapshots and slowing the agent down.

**Treat snapshots as code.** Scope them with prompts like "snapshot the form inside the dialog only" so the agent does not waste tokens scanning the entire page.

**Review every generated test.** Agents are tireless, not infallible. A quick PR review catches hard-coded waits, missing assertions, and over-specific selectors.

---

## What's Next

With Claude Code and Playwright MCP working, here are the natural next steps:

1. Configure other clients on your team using the [Playwright MCP Cursor IDE setup guide](/blog/playwright-mcp-cursor-ide-setup-2026).
2. Wire the same MCP server into your CI pipeline -- see [Playwright Agents CI/CD Integration](/blog/playwright-agents-ci-integration-2026).
3. Learn about the underlying protocol in our [MCP Testing Complete Guide](/blog/mcp-model-context-protocol-testing-2026).

Browse the full catalog of QA skills at [QASkills.sh/skills](/skills).

---

*Written by [Pramod Dutta](https://thetestingacademy.com), founder of The Testing Academy and QASkills.sh.*
`,
};
