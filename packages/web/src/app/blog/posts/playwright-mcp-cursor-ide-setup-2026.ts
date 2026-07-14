import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright MCP Server Setup with Cursor IDE: 2026 Guide',
  description:
    'Step-by-step guide to setting up Playwright MCP server with Cursor IDE in 2026. Covers installation, mcp.json configuration, accessibility snapshots, troubleshooting, and real-world examples.',
  date: '2026-05-21',
  category: 'Tutorial',
  content: `
The Model Context Protocol (MCP) has fundamentally changed how AI coding agents interact with browsers. In 2026, Playwright MCP is the de facto standard for giving AI agents like Cursor the ability to drive a real browser, inspect the accessibility tree, fill forms, click buttons, and verify the resulting state -- all from natural language instructions. This guide walks through the complete setup of Playwright MCP inside Cursor IDE, from a clean install to a fully working agent that can write and debug end-to-end tests for you.

## Key Takeaways

- Playwright MCP runs as a stdio or SSE server that Cursor connects to through its built-in MCP client
- The recommended setup uses the official \`@playwright/mcp\` package and an \`mcp.json\` file in your project or user config directory
- Cursor reads two config locations: \`~/.cursor/mcp.json\` for global servers and \`.cursor/mcp.json\` inside a project for per-repo servers
- Playwright MCP exposes accessibility snapshots that are dramatically more reliable than screenshots for AI navigation
- Most setup failures come from three causes: wrong Node version, missing browser binaries, or a stale Cursor cache
- Pair Playwright MCP with the \`playwright-e2e\` QA skill from QASkills for production-grade test generation

---

## Why Playwright MCP and Why Cursor

Cursor is one of the most widely adopted AI IDEs in 2026, with first-class support for MCP servers. Out of the box, Cursor can read files, run shell commands, and call language models -- but it cannot drive a browser. That is exactly what Playwright MCP adds.

Playwright MCP turns a Cursor agent into a fully capable browser automation engineer. The agent can:

- Open a URL and read the accessibility tree
- Click elements by accessible name, role, or text
- Fill forms, submit them, and verify the resulting page
- Take screenshots and snapshots for visual context
- Wait for network activity and DOM mutations to settle
- Generate \`@playwright/test\` test files based on what it observed

The combination is powerful: you describe a user flow in plain English, the agent drives the browser to verify the flow works, then writes a real Playwright test that captures the exact behavior. No more guessing at selectors or debugging brittle locators.

---

## Prerequisites

Before you begin, make sure you have the following installed and working:

- **Node.js 20 or newer.** Playwright MCP requires a modern Node version. Check with \`node --version\`. If you are still on Node 18, upgrade before continuing.
- **Cursor IDE 0.45 or newer.** MCP support has improved dramatically across 2025 and 2026, so use the latest stable build.
- **A modern operating system.** Playwright MCP is tested on macOS 13+, Windows 11, and recent Ubuntu LTS releases.
- **Browser binaries.** Playwright needs Chromium, Firefox, and WebKit installed. The post-install step usually handles this automatically.

If you are on a corporate machine, also confirm that your firewall does not block the Playwright CDN at \`playwright.azureedge.net\`. Without that, browser downloads will fail.

---

## Step 1: Install Playwright MCP

Open a terminal in the project where you want browser automation available. Install Playwright MCP and its peer Playwright dependency:

\`\`\`bash
npm install --save-dev @playwright/mcp @playwright/test
npx playwright install --with-deps
\`\`\`

The first command pulls in the MCP server and the test runner. The second installs the browser binaries plus any system libraries required on Linux.

If you prefer to run the MCP server without installing it locally, you can run it directly with \`npx\`:

\`\`\`bash
npx -y @playwright/mcp@latest
\`\`\`

This is convenient for global installs that you want available across every project. We will reference both styles in the configuration sections below.

---

## Step 2: Locate Your Cursor MCP Config

Cursor reads MCP server definitions from two locations:

- **User-level config:** \`~/.cursor/mcp.json\` -- servers available across every project you open in Cursor.
- **Project-level config:** \`.cursor/mcp.json\` inside the project root -- servers available only for that project.

For team projects, prefer the project-level file so your config is version-controlled. For personal exploration, the user-level config is fine.

Create the file if it does not yet exist:

\`\`\`bash
mkdir -p .cursor
touch .cursor/mcp.json
\`\`\`

> Screenshot placeholder: Cursor settings panel showing the MCP servers section with the Playwright server listed and a green status indicator.

---

## Step 3: Add the Playwright MCP Server Definition

Open \`.cursor/mcp.json\` and add the Playwright MCP server. The simplest working config looks like this:

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

That is the minimum viable configuration. Cursor will spawn \`npx -y @playwright/mcp@latest\` as a stdio process when the editor starts, then talk to it using the JSON-RPC framing defined by the MCP spec.

For more control, you can pin a version and pass server-side flags:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@0.0.32",
        "--headless",
        "--browser=chromium",
        "--viewport-size=1280,720"
      ],
      "env": {
        "PLAYWRIGHT_BROWSERS_PATH": "0"
      }
    }
  }
}
\`\`\`

\`PLAYWRIGHT_BROWSERS_PATH=0\` tells Playwright to use the browser binaries bundled inside the npm package itself, which avoids surprises when a user-level cache gets cleaned.

---

## Step 4: Restart Cursor and Verify

Quit and reopen Cursor so it picks up the new config. Then open the Cursor settings panel, go to the MCP section, and confirm that the \`playwright\` server is listed and shows a green status.

In the agent chat, type a quick verification prompt:

> Open https://example.com using Playwright MCP and tell me what the page heading is.

The agent should call the \`browser_navigate\` tool, then call \`browser_snapshot\` to read the accessibility tree, and finally reply with the page heading. If you see those tool calls happen in the chat, your setup is working.

> Screenshot placeholder: Cursor agent chat showing a Playwright MCP tool call with the accessibility snapshot result inline.

---

## Step 5: Use Accessibility Snapshots Instead of Screenshots

The single most important capability of Playwright MCP is the accessibility snapshot. Unlike a screenshot, which is a flat image the LLM has to interpret visually, an accessibility snapshot is a structured tree of elements that includes:

- Role (button, link, textbox, heading, etc.)
- Accessible name
- Current value
- A stable element reference the agent can use in follow-up calls

Snapshots are dramatically more reliable than screenshots for agent navigation. They are also much cheaper in tokens, since the agent only sees the structure it needs.

A typical accessibility snapshot looks like this:

\`\`\`yaml
- heading "Welcome back" [level=1] [ref=e12]
- textbox "Email" [ref=e13]
- textbox "Password" [ref=e14]
- button "Sign in" [ref=e15]
- link "Forgot password?" [ref=e16]
\`\`\`

The \`[ref=eXX]\` values are stable references that the agent can pass to \`browser_click\`, \`browser_type\`, or \`browser_select_option\`. The agent never has to guess at a CSS selector.

---

## Step 6: Write Your First Agent-Driven Test

With the MCP server running, ask your agent to write a real test for you. Here is an example prompt:

> Using Playwright MCP, navigate to https://playwright.dev, click the "Get started" link, then write a Playwright test in tests/playwright-docs.spec.ts that verifies the landing page heading and clicks through to the docs.

The agent will drive the browser to verify the flow works, then write a test file like this:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('navigates from landing to docs', async ({ page }) => {
  await page.goto('https://playwright.dev');
  await expect(page.getByRole('heading', { name: /Playwright/i })).toBeVisible();
  await page.getByRole('link', { name: 'Get started' }).click();
  await expect(page).toHaveURL(/.*\\/docs\\/intro/);
});
\`\`\`

Notice the agent picked \`getByRole\` locators -- those map directly to the accessibility snapshot it just verified against. That is exactly what makes MCP-generated tests so much more resilient than older approaches.

---

## Configuration Reference

Playwright MCP supports a handful of flags worth knowing. Pass them in the \`args\` array of your \`mcp.json\`:

| Flag | Purpose | Default |
|------|---------|---------|
| \`--headless\` | Run the browser without a visible window | false in dev |
| \`--browser=<name>\` | chromium, firefox, or webkit | chromium |
| \`--viewport-size=<w,h>\` | Window size for snapshots | 1280,720 |
| \`--user-data-dir=<path>\` | Persistent profile directory | ephemeral |
| \`--allowed-origins=<list>\` | Restrict navigation to a list of origins | unrestricted |
| \`--blocked-origins=<list>\` | Block navigation to specific origins | none |
| \`--storage-state=<file>\` | Load saved cookies and localStorage | none |
| \`--ignore-https-errors\` | Accept invalid certificates | false |
| \`--proxy-server=<url>\` | Use an HTTP proxy | none |

The \`--allowed-origins\` flag is especially valuable on shared dev machines: you can scope the MCP server to your staging environment so the agent cannot accidentally browse to anything else.

---

## Troubleshooting

### The server starts but Cursor reports "no tools available"

Cursor occasionally caches tool lists across restarts. Quit Cursor fully, clear the cache (\`~/Library/Application Support/Cursor/Cache\` on macOS, equivalent on Windows and Linux), and relaunch. If the issue persists, run \`npx @playwright/mcp@latest --version\` in a terminal to confirm the server can be spawned outside Cursor.

### "Executable doesn't exist" errors

Playwright failed to download a browser binary. Run \`npx playwright install --with-deps\` again. On Linux, this also installs system libraries like \`libnss3\` and \`libxshmfence1\` that headless browsers need. On Docker images, also install \`fonts-liberation\` and \`ca-certificates\` to avoid silent rendering glitches.

### The agent keeps timing out on navigation

By default Playwright waits up to 30 seconds for a navigation to settle. Slow staging environments can exceed that. Pass \`--navigation-timeout=60000\` in your args, or wrap navigations in retry logic in your prompts.

### Snapshots show stale content after a click

This usually means the page is still rendering when the snapshot fires. Ask the agent to call \`browser_wait_for\` with a specific element or text before snapshotting. The MCP server exposes this as a first-class tool.

### Node version mismatch

Cursor inherits the PATH from your shell. If you use \`nvm\` and your default Node is older than 20, the MCP server will fail to start. Either switch your default Node version, or set the absolute path to a newer node binary in your \`mcp.json\` command field.

### Corporate proxy blocks the install

If \`npx -y @playwright/mcp@latest\` hangs forever, your network may be blocking the registry. Configure npm with your corporate proxy (\`npm config set proxy ...\`) and use a private mirror if you have one. As a last resort, install the package locally and reference \`./node_modules/.bin/playwright-mcp\` in the command field.

---

## Pairing with QA Skills

Playwright MCP gives the agent the ability to act. QA skills give the agent the knowledge of how to act well. Pair both for the best results:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
npx @qaskills/cli add playwright-api
\`\`\`

Once installed, your Cursor agent automatically follows expert patterns: Page Object Model for non-trivial flows, \`getByRole\` over CSS selectors, \`expect.toHaveURL\` over manual assertions, and built-in retry logic for flaky network calls. Without the skill, the agent might write tests that pass once and break next week. With the skill, it writes tests that hold up in CI for years.

---

## Production Tips

A few hard-earned lessons from teams running Playwright MCP in real workflows:

**Keep snapshots small.** Ask the agent to scope its snapshot to a specific section of the page. Massive snapshots burn tokens and degrade reasoning quality.

**Use \`storage-state\` for authenticated flows.** Logging in for every test is slow and noisy. Save a logged-in session once with \`page.context().storageState({ path: 'auth.json' })\` and pass \`--storage-state=auth.json\` to the MCP server.

**Block heavy third-party origins.** Analytics, chat widgets, and ad networks often cause flaky snapshots. Use \`--blocked-origins\` to skip them.

**Version-pin the server.** \`@playwright/mcp@latest\` is fine for solo work, but pin to a specific version in team repos so all engineers see the same tool behavior.

**Treat the agent like an intern.** Review the test code it writes. Look for hard-coded waits, brittle selectors, or missing assertions. AI agents are tireless, not infallible.

---

## What's Next

You now have a working Playwright MCP setup in Cursor. From here, three natural next steps:

1. **Add a CI workflow** that runs the tests the agent generated -- see our [Playwright Agents CI/CD Integration Guide](/blog/playwright-ci-github-actions-complete-guide-2026).
2. **Compare alternatives.** Read the [Chrome DevTools MCP performance testing guide](/blog/chrome-devtools-mcp-performance-testing-guide) before locking in a stack.
3. **Set up other AI clients.** If your team uses Claude Code, our [Playwright MCP with Claude Code](/blog/playwright-mcp-claude-code-setup-2026) guide walks through the equivalent config.

Browse the full catalog of QA skills at [QASkills.sh/skills](/skills).

---

*Written by [Pramod Dutta](https://thetestingacademy.com), founder of The Testing Academy and QASkills.sh.*
`,
};
