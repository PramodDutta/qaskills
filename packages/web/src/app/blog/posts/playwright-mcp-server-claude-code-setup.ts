import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright MCP Server + Claude Code: 2026 Setup Guide',
  description:
    'Step-by-step guide to connect the Playwright MCP server to Claude Code so an AI agent drives a real browser via the accessibility tree to write and heal tests.',
  date: '2026-06-29',
  category: 'Tutorial',
  content: `
# Playwright MCP Server + Claude Code: 2026 Setup Guide

Connecting the Playwright MCP server to Claude Code turns a chat session into a hands-on browser automation engineer. Instead of describing a test and hoping the model guesses the right selectors, Claude Code drives a real Chromium instance, reads the page through its accessibility tree, clicks and types like a user, and writes Playwright TypeScript that actually matches what it saw. By the end of this tutorial you will have Claude Code opening your app, logging in, exploring the flows, and emitting runnable specs - all without you hand-writing a single locator.

The Model Context Protocol (MCP) is the glue. MCP is an open standard that lets an AI client like Claude Code talk to external tools through a uniform interface. The Playwright MCP server is one such tool provider: it exposes browser actions - navigate, snapshot, click, type, wait - as MCP tools that Claude Code can call. The defining feature is that the server returns the page's **accessibility tree** rather than a screenshot, which is why the agent produces stable, semantic locators instead of fragile coordinate clicks.

This guide covers what MCP is, installing the server, the exact JSON config to register it with Claude Code, every browser tool you get, a complete live workflow (open app, log in, explore, generate a test), why the accessibility-tree approach beats screenshots, and a troubleshooting section for the errors you will actually hit. If you want the bigger picture of how these tools fit into agentic test automation, start with our [Playwright three-agent system guide](/blog/playwright-three-agent-system-planner-generator-healer).

## What Is MCP and Why It Matters for Testing

The Model Context Protocol is a client-server standard. Your AI client (Claude Code) is the MCP client; a tool provider (the Playwright MCP server) is the MCP server. The client asks the server "what tools do you offer?", the server replies with a typed list, and the client can then call any of them and feed the results back into the model's reasoning. It is, in effect, a universal adapter between a language model and real-world capabilities.

For testing this is transformative. Before MCP, an agent writing Playwright tests was working blind - it generated code from its training data and your prompt, never touching the actual application. With the Playwright MCP server connected, the agent observes ground truth. It calls a snapshot tool, gets the real structure of your page, and writes a locator it has verified exists. The difference is the same as the difference between describing a room from memory versus walking into it.

| Concept | Role | In this setup |
| --- | --- | --- |
| MCP client | Consumes tools, runs the model | Claude Code |
| MCP server | Exposes tools | Playwright MCP server |
| Tool | A callable action | \`browser_navigate\`, \`browser_snapshot\` |
| Transport | How client and server talk | stdio (local subprocess) |
| Accessibility tree | The page representation returned | Roles, names, states |

If MCP is new to you, our [MCP for QA engineers guide](/blog/mcp-for-qa-engineers-guide) gives a gentler on-ramp before you dive into the Playwright-specific setup here.

## Prerequisites

You need a small, standard toolchain. Confirm each before continuing:

\`\`\`bash
node --version    # v20 or newer
npx --version     # comes with npm
claude --version  # Claude Code CLI installed
\`\`\`

If Claude Code is not installed yet, install it and sign in:

\`\`\`bash
npm install -g @anthropic-ai/claude-code
claude   # launch once to authenticate
\`\`\`

You do not need to pre-install Playwright browsers; the MCP server downloads Chromium on first use. You also do not need an existing Playwright project to start exploring - though you will want one to save generated tests into.

## Installing the Playwright MCP Server

The server ships as an npm package and runs as a subprocess, so there is nothing to install globally if you let \`npx\` fetch it on demand. To verify it runs at all:

\`\`\`bash
npx @playwright/mcp@latest --help
\`\`\`

This prints the available flags - headless mode, viewport size, which browser channel to use, and storage state path for reusing logins. To pre-cache the package and the Chromium binary so the first real run is fast:

\`\`\`bash
npx @playwright/mcp@latest --version
npx playwright install chromium
\`\`\`

For most teams, letting \`npx\` resolve \`@latest\` at launch is the right call - it keeps the server current with Playwright releases. If you need a pinned version for reproducible CI, install it as a dev dependency:

\`\`\`bash
npm install -D @playwright/mcp@1.59.0
\`\`\`

## Registering the Server With Claude Code

There are two ways to register the server: the CLI helper or editing the config file directly. The CLI is fastest:

\`\`\`bash
claude mcp add playwright -- npx @playwright/mcp@latest
\`\`\`

This appends the server to your Claude Code MCP configuration. If you prefer to edit the JSON yourself, the config lives in your project's \`.mcp.json\` (project scope) or your user-level Claude Code config (global scope). The minimal entry is:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
\`\`\`

For a richer setup - headed browser so you can watch it work, a fixed viewport, and a saved login state - pass flags through \`args\`:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--browser", "chromium",
        "--viewport-size", "1280,720",
        "--storage-state", "./.auth/state.json"
      ],
      "env": {
        "PLAYWRIGHT_HEADLESS": "0"
      }
    }
  }
}
\`\`\`

After saving, restart Claude Code (or run \`/mcp\` inside a session) and confirm the server shows as connected. You should see the Playwright tools listed. Project scope versus global scope matters: a \`.mcp.json\` committed to the repo shares the config with your whole team, while the user config keeps it private to your machine.

| Scope | File | Best for |
| --- | --- | --- |
| Project | \`.mcp.json\` in repo root | Team-shared, committed config |
| User (global) | Claude Code user config | Personal, all projects |
| Local | \`.mcp.json\` (gitignored) | Machine-specific overrides |

## The Available Browser Tools

Once connected, Claude Code gains a set of browser tools. You rarely call them by name - you describe the goal and Claude Code orchestrates them - but knowing the toolbox helps you write better prompts and debug behavior.

| Tool | What it does | Returns |
| --- | --- | --- |
| \`browser_navigate\` | Go to a URL | Page load status |
| \`browser_snapshot\` | Capture the accessibility tree | Structured roles + names |
| \`browser_click\` | Click an element by ref | Action result |
| \`browser_type\` | Type into a field | Action result |
| \`browser_fill_form\` | Fill multiple fields at once | Action result |
| \`browser_select_option\` | Choose from a dropdown | Action result |
| \`browser_wait_for\` | Wait for text or state | Resolved state |
| \`browser_press_key\` | Send a keypress | Action result |
| \`browser_take_screenshot\` | Capture a PNG (visual only) | Image |
| \`browser_console_messages\` | Read console logs | Log lines |
| \`browser_network_requests\` | Inspect network traffic | Request list |

The hero tool is \`browser_snapshot\`. It returns something like this rather than a picture:

\`\`\`yaml
- heading "Sign in" [level=1] [ref=e3]
- textbox "Email" [ref=e5]
- textbox "Password" [ref=e6]
- button "Sign in" [ref=e8]
- link "Forgot password?" [ref=e9]
\`\`\`

Each element carries a stable \`ref\` that Claude Code uses to act on it, plus the accessible role and name it will later turn into a \`getByRole\` locator. This is the same semantic model the [Playwright three-agent system](/blog/playwright-three-agent-system-planner-generator-healer) is built on.

## A Live Workflow: Open, Log In, Explore, Generate

Let us run a real session. Start Claude Code in your project directory and give it a goal in plain language:

\`\`\`text
You: Open http://localhost:3000, log in as test@example.com /
     Passw0rd!, explore the dashboard, and generate a Playwright
     test for the login flow. Save it to tests/login.spec.ts.
\`\`\`

Behind the scenes, Claude Code runs roughly this sequence of tool calls. It navigates, snapshots to see the form, fills it, clicks, waits, and snapshots again to confirm it landed on the dashboard:

\`\`\`text
1. browser_navigate  -> http://localhost:3000/login
2. browser_snapshot  -> sees textbox "Email", textbox "Password", button "Sign in"
3. browser_fill_form -> Email=test@example.com, Password=Passw0rd!
4. browser_click     -> button "Sign in"
5. browser_wait_for  -> text "Dashboard"
6. browser_snapshot  -> confirms heading "Dashboard" is present
\`\`\`

Because every step is grounded in a real snapshot, the test Claude Code writes uses locators it has verified:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('user can log in and reach the dashboard', async ({ page }) => {
  await page.goto('http://localhost:3000/login');

  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('Passw0rd!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(
    page.getByRole('heading', { name: 'Dashboard' })
  ).toBeVisible();
  await expect(page).toHaveURL(/\\/dashboard/);
});
\`\`\`

You then run it the normal way and it passes on the first try, because the agent never guessed:

\`\`\`bash
npx playwright test tests/login.spec.ts
\`\`\`

To make logins reusable across runs, ask Claude Code to save the storage state after a successful login, then reference that \`state.json\` in your config so future sessions start already authenticated. You can build out a full exploration sweep this way - have Claude Code walk the whole app and propose a suite, the way our [exploratory testing with AI agents guide](/blog/exploratory-testing-ai-agents-guide) describes.

## Accessibility Tree vs Screenshot Approach

It is worth being explicit about why this setup is so reliable, because some browser-automation MCP servers take the screenshot route instead. The Playwright MCP server defaults to the accessibility tree, and that choice cascades into every benefit below.

| Aspect | Accessibility tree (default) | Screenshot approach |
| --- | --- | --- |
| Model input size | Small, text-based | Large image, many tokens |
| Element targeting | By stable \`ref\` + role | By guessed coordinates |
| Generated locators | \`getByRole\`, \`getByLabel\` | Brittle CSS / positions |
| Survives a restyle | Yes | Often no |
| Reads offscreen elements | Yes | No, must scroll first |
| Cost per step | Low | High |
| Determinism | High | Lower |

When you fill a form via the accessibility tree, Claude Code knows the field is a textbox named "Email" and writes \`getByLabel('Email')\`. A screenshot-based agent only knows there are some pixels at coordinates it must click, producing tests that shatter the moment the layout shifts. The accessibility-first approach also nudges you toward accessible markup, which is a real product win, not just a testing convenience. You can still ask for \`browser_take_screenshot\` when you genuinely need a visual artifact - it just is not the primary signal.

## Troubleshooting Common Issues

Most problems fall into a handful of buckets. Here is the field guide.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Server shows "disconnected" | \`npx\` could not fetch package | Run \`npx @playwright/mcp@latest --help\` manually |
| "Executable doesn't exist" | Chromium not installed | \`npx playwright install chromium\` |
| Tools not listed in session | Config not picked up | Restart Claude Code, run \`/mcp\` |
| Agent clicks the wrong element | Duplicate accessible names | Add \`data-testid\` or unique labels |
| Login not persisted | No storage state saved | Add \`--storage-state\` flag |
| Hangs on a slow page | Default wait too short | Prompt it to \`browser_wait_for\` text |

If the server will not connect at all, run it standalone to see the real error:

\`\`\`bash
npx @playwright/mcp@latest --browser chromium 2>&1 | head -40
\`\`\`

To inspect what Claude Code sees, ask it inside a session to list connected MCP servers and their tools, or run the slash command:

\`\`\`text
/mcp
\`\`\`

If the agent struggles to target elements because several share the same accessible name (three "Edit" buttons, say), the fix is on your side: give those controls distinct accessible names or \`data-testid\` attributes. That improves both your tests and your app's accessibility. When a generated test is flaky, it is almost always a missing wait - tell Claude Code to wait for a specific piece of text before asserting, and lean on the techniques in our [fix flaky tests guide](/blog/fix-flaky-tests-guide).

## Healing Tests When the UI Changes

The same MCP connection that authored your tests can repair them. When a spec breaks because a developer renamed a button or moved a field, you do not have to hand-edit selectors. Open Claude Code, point it at the failing test and the running app, and ask it to heal the test against the current DOM:

\`\`\`text
You: tests/login.spec.ts is failing - the "Sign in" button was
     renamed. Open the app, find the new control, and update the
     locator. Only change the selector, do not touch assertions.
\`\`\`

Claude Code re-navigates, snapshots the live page, finds the renamed control, and proposes a minimal diff:

\`\`\`diff
-  await page.getByRole('button', { name: 'Sign in' }).click();
+  await page.getByRole('button', { name: 'Log in' }).click();
\`\`\`

Because it is reading the real accessibility tree, it matches intent ("the primary submit button on the login form") to the current element rather than guessing. The instruction to leave assertions alone is important: you never want a heal step to quietly rewrite an expectation and turn a genuine regression green. Keep the agent scoped to locators and review the diff before you commit it.

This is the maintenance half of the loop. A useful habit is to wire a saved Claude Code skill that always heals in suggest-only mode, so the output is a reviewable patch rather than an applied change. Our [best Claude Code skills for automated testing](/blog/best-claude-code-skills-for-automated-testing) collects skills that package exactly this behavior, and the [Playwright trace viewer debugging guide](/blog/playwright-trace-viewer-debugging-guide) shows how to feed trace data into the heal request for higher-confidence fixes.

## Security and Sandboxing Notes

Giving an AI agent a real browser warrants a few guardrails. Run the MCP server against local or staging environments, never production, and never hand it production credentials. Use a dedicated throwaway test account whose blast radius is contained. If you supply a storage state file for persistent logins, keep it out of version control and treat it like any other secret.

| Practice | Why | How |
| --- | --- | --- |
| Target staging, not prod | Agent can submit real forms | Set \`baseURL\` to staging |
| Use a disposable account | Limit blast radius | Seed a dedicated test user |
| Gitignore auth state | It contains session tokens | Add \`.auth/\` to \`.gitignore\` |
| Review generated code | Agent output is not infallible | Treat specs as PRs |
| Pin the server version | Reproducible behavior | Install \`@playwright/mcp@x.y.z\` |

With those in place, the agent is a fast pair-tester rather than a liability. The model only ever acts on tools you registered and pages you point it at - it cannot reach beyond the browser session you started.

## Putting It in CI

Once Claude Code has generated your specs, the tests are ordinary Playwright - they do not need the MCP server to run. Commit them and run them in CI like any suite:

\`\`\`bash
npx playwright test --reporter=html
\`\`\`

The MCP server is an authoring and maintenance tool, not a runtime dependency of your test suite. You use Claude Code plus the server to write and heal tests; CI runs the plain Playwright output. This separation keeps your pipeline simple and your generated tests portable. Browse the [QA skills directory](/skills) for ready-made Claude Code testing skills that package these workflows so your whole team can reuse them.

## Frequently Asked Questions

### How do I connect the Playwright MCP server to Claude Code?

Run \`claude mcp add playwright -- npx @playwright/mcp@latest\`, or add a "playwright" entry under \`mcpServers\` in your \`.mcp.json\` with \`command: "npx"\` and \`args: ["@playwright/mcp@latest"]\`. Restart Claude Code and run \`/mcp\` to confirm it connected. The server downloads Chromium on first use, so no separate browser install is strictly required.

### What is the Playwright MCP server used for?

It exposes browser actions - navigate, snapshot, click, type, wait - as MCP tools so an AI client like Claude Code can drive a real browser. The agent reads each page through its accessibility tree, acts like a user, and writes Playwright tests with verified, semantic locators instead of guessed coordinates. It is an authoring and test-maintenance tool, not a runtime dependency.

### Does the Playwright MCP server use screenshots or the accessibility tree?

By default it returns the accessibility tree - a compact text structure of roles, names, and states - not screenshots. This keeps token cost low, makes element targeting deterministic, and produces stable \`getByRole\` and \`getByLabel\` locators that survive restyles. You can still request a screenshot via \`browser_take_screenshot\` when you specifically need a visual artifact.

### Why are my Playwright MCP tools not showing up in Claude Code?

The config usually was not picked up. Restart Claude Code and run \`/mcp\` to list servers. If it still fails, run \`npx @playwright/mcp@latest --help\` in a terminal to confirm the package fetches, and check that your \`.mcp.json\` has valid JSON with the server under \`mcpServers\`. A trailing comma or wrong path is the most common culprit.

### Do I need an existing Playwright project to use the MCP server?

No. The server can explore any running app and Claude Code will generate tests from scratch. You only need a Playwright project to save and run those generated specs - run \`npm init playwright@latest\` to scaffold one. Once tests are written, they are plain Playwright and run without the MCP server, so CI needs no MCP setup.

### How do I keep a login session between Claude Code runs?

Use Playwright's storage state. Ask Claude Code to log in once and save the authenticated state to a file, then add \`--storage-state ./.auth/state.json\` to the server's \`args\`. Future sessions start already authenticated, so the agent skips the login flow and goes straight to the page under test. Keep that state file out of version control.

### Why does the agent click the wrong element sometimes?

Almost always because several elements share the same accessible name - for example three buttons all named "Edit". The accessibility tree cannot disambiguate them by name alone. Fix it on the app side by giving those controls unique accessible names or \`data-testid\` attributes. That makes targeting deterministic and improves your app's real accessibility at the same time.

## Conclusion

Wiring the Playwright MCP server into Claude Code gives you an AI engineer that actually looks at your application before writing a line of test code. Because the server speaks the accessibility tree rather than screenshots, the locators it produces are semantic, stable, and cheap to generate - and the tests pass on the first run because the agent verified them against the live page. Register the server, point Claude Code at your app, describe the flow you want covered, and let it explore, log in, and emit runnable Playwright specs you can commit and run in plain CI.

From here, level up by combining this setup with the full agentic loop in our [Playwright three-agent system guide](/blog/playwright-three-agent-system-planner-generator-healer), and grab production-ready testing skills from the [QA skills directory](/skills) to standardize the workflow across your team.
`,
};
