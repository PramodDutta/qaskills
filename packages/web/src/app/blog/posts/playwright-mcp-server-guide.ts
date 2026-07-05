import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright MCP Server: Browser Testing with AI Agents',
  description:
    'A complete guide to the Playwright MCP server: install it into Claude Code, Cursor, and VS Code, use its browser tools, and generate real Playwright tests with AI.',
  date: '2026-07-05',
  category: 'Guide',
  content: `
# Playwright MCP Server: Browser Testing with AI Agents

The Playwright MCP server is the single most useful tool for giving an AI coding agent real hands on a browser. Built and maintained by Microsoft, it exposes Playwright's browser automation as a set of Model Context Protocol tools, so an agent running in Claude Code, Cursor, or VS Code can navigate to a page, read its structure, click elements, fill forms, and then generate a clean Playwright test that reproduces exactly what it did. The key design decision that sets it apart is that it drives the browser through the accessibility tree rather than screenshots. Instead of asking a vision model to guess where a button is in a JPEG, the agent receives a structured, text description of every interactive element on the page, each with a stable reference it can act on.

That distinction is not cosmetic. Accessibility-tree automation is faster, dramatically cheaper on tokens, and far more deterministic than pixel-based clicking, which is why it has become the default way to wire agents to browsers in 2026. This guide walks through what the server is, how to install it into the three most common agent hosts, the full tool set it exposes, the difference between snapshot and vision mode, how to make an agent explore a page and emit a real test, and the config flags that matter in CI. By the end you will be able to hand an agent a URL and get back a maintainable Playwright spec. If you want ready-made testing skills to pair with it, browse the [QA skills directory](/skills).

## What Is the Playwright MCP Server?

The Playwright MCP server is a program, distributed as the npm package \`@playwright/mcp\`, that speaks the Model Context Protocol on one side and drives a Playwright-controlled browser on the other. When an agent host connects to it, the server advertises a catalog of browser tools. The model can then call those tools, and the server executes the corresponding Playwright command against a real Chromium, Firefox, or WebKit instance and returns the result.

Its defining feature is the accessibility snapshot. Rather than returning a screenshot, the primary observation tool returns a structured representation of the page derived from the browser's accessibility tree: roles, names, and a unique reference for each element. When the agent wants to click something, it passes that reference back. Because references are derived from semantic structure rather than pixel coordinates, actions survive layout shifts and re-renders that would break a coordinate-based approach. This is the same reasoning behind modern resilient locators, applied to how an agent perceives the page.

The server is stateless between your prompts but stateful within a session: the browser stays open across tool calls, so the agent can build up a multi-step flow (navigate, sign in, add to cart, checkout) and observe the page after each action. That closed loop, act then observe then correct, is exactly what makes agentic browser testing work.

## Installing Into Claude Code

Claude Code has first-class MCP support, so adding the server is a one-liner. The simplest form registers it to run on demand via npx:

\`\`\`bash
claude mcp add playwright -- npx @playwright/mcp@latest
\`\`\`

If you prefer to manage servers in a config file, add an entry under \`mcpServers\`. Claude Code reads project-scoped config from a \`.mcp.json\` file at your repo root:

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

Once registered, run \`claude mcp list\` to confirm the server is connected. From there you can prompt the agent with something like "use Playwright to open example.com and tell me what interactive elements are on the page," and it will call the browser tools directly. Scope the server to the project you are testing so its browser and any credentials stay isolated from other work.

## Installing Into Cursor and VS Code

Cursor uses the same MCP config shape. Create or edit \`.cursor/mcp.json\` in your project (or the global config in Cursor's settings) and add the Playwright entry:

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

After saving, Cursor shows the server in its MCP settings panel with a green indicator once it connects. VS Code with the GitHub Copilot agent mode reads MCP servers from a \`.vscode/mcp.json\` file. The structure is nearly identical, though VS Code nests servers under a \`servers\` key:

\`\`\`json
{
  "servers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
\`\`\`

In all three hosts the underlying server is the same package; only the location and top-level key of the config differ. Once connected, the browser tool set becomes available to the agent automatically.

## The Playwright MCP Tool Set

The server exposes a focused set of tools that map cleanly onto how a human tests a page. Understanding them helps you write prompts that steer the agent efficiently and read its actions when it works autonomously.

| Tool | What it does |
|---|---|
| \`browser_navigate\` | Go to a URL and load the page |
| \`browser_snapshot\` | Return the accessibility-tree snapshot with element references |
| \`browser_click\` | Click an element by its snapshot reference |
| \`browser_type\` | Type text into a focused or referenced input |
| \`browser_fill_form\` | Fill multiple form fields in one structured call |
| \`browser_take_screenshot\` | Capture a PNG or JPEG of the page or an element |
| \`browser_evaluate\` | Run arbitrary JavaScript in the page and return the result |
| \`browser_wait_for\` | Wait for text to appear or disappear, or for a timeout |

The one you will see used most is \`browser_snapshot\`. It is the agent's primary sense: before clicking or typing, the agent snapshots the page, reads the available elements and their references, and then acts on a specific reference. \`browser_evaluate\` is the escape hatch for anything the higher-level tools do not cover, such as reading a computed style, extracting a data attribute, or asserting on a value in the DOM. \`browser_fill_form\` is a convenience that fills a whole form in a single call, which is both faster and less error-prone than typing field by field.

## Snapshot Mode vs Vision Mode

The server runs in snapshot mode by default, and for almost all testing you should keep it there. In snapshot mode the agent perceives the page through the accessibility tree: a compact, structured text representation. This is cheap on tokens, deterministic, and resilient to visual changes, which makes generated tests stable.

Vision mode is the alternative. When you start the server with the \`--vision\` flag, the agent works from screenshots and interacts using coordinates, which routes actions through a vision-capable model. You would only reach for this in narrow cases: automating a canvas-heavy app, a WebGL surface, or a component that genuinely has no accessible representation. The tradeoff is real. Vision mode consumes far more tokens per step, is slower, and produces less stable automation because coordinate clicks break when layout shifts.

| Aspect | Snapshot mode (default) | Vision mode (--vision) |
|---|---|---|
| Perception | Accessibility tree (text) | Screenshots (pixels) |
| Action target | Element reference | Screen coordinates |
| Token cost | Low | High |
| Determinism | High | Lower |
| Best for | Standard web apps | Canvas, WebGL, no-a11y surfaces |

The practical guidance: default to snapshot mode, and only enable vision mode for the specific pages that require it. Mixing the two on a per-page basis gives you the stability of snapshots everywhere except where you truly need pixels.

## Exploring a Page and Emitting a Test

The headline workflow is handing the agent a URL and getting back a runnable test. Here is how a session typically unfolds. You prompt: "Open https://example.com/login, sign in with user qa@example.com and password test1234, confirm the dashboard loads, and generate a Playwright test for the flow."

The agent calls \`browser_navigate\` to load the login page, \`browser_snapshot\` to read the form fields, \`browser_fill_form\` to enter the credentials, \`browser_click\` on the submit button, then \`browser_snapshot\` again to confirm the dashboard rendered. Having observed each real step succeed, it emits a spec grounded in what actually worked:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('user can sign in and reach the dashboard', async ({ page }) => {
  await page.goto('https://example.com/login');

  await page.getByLabel('Email').fill('qa@example.com');
  await page.getByLabel('Password').fill('test1234');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page).toHaveURL(/\\/dashboard/);
});
\`\`\`

Notice the generated test uses semantic locators (\`getByLabel\`, \`getByRole\`) rather than brittle CSS selectors. That is a direct benefit of accessibility-tree exploration: because the agent perceived the page semantically, it naturally writes locators that match how users and assistive tech see it. For a deeper look at how agents are scored on this kind of end-to-end task, see our [AI agent eval and testing guide](/blog/ai-agent-eval-testing-guide).

## Headless vs Headed Mode

By default the server runs the browser headless, which is what you want in CI: no visible window, lower resource use, and no display dependency. During interactive development, though, watching the browser is invaluable for understanding what the agent is doing. Start the server in headed mode with a flag:

\`\`\`bash
npx @playwright/mcp@latest --headless=false
\`\`\`

Or express it in JSON config so it applies whenever the host launches the server:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--headless=false", "--browser", "chromium"]
    }
  }
}
\`\`\`

A common pattern is headed while you build and debug a flow locally, then headless everywhere else. Because the mode is a launch flag, you can keep two named server entries (one headed, one headless) and point the agent at whichever fits the moment.

## Useful Configuration Flags

The server accepts a range of flags that control the browser and its environment. These are the ones that matter most for testing workflows.

| Flag | Purpose |
|---|---|
| \`--browser <name>\` | Choose chromium, firefox, or webkit |
| \`--headless=false\` | Run with a visible browser window |
| \`--vision\` | Enable screenshot and coordinate-based mode |
| \`--viewport-size <w,h>\` | Set the browser viewport, e.g. 1280,720 |
| \`--device <name>\` | Emulate a device profile, e.g. "iPhone 15" |
| \`--user-data-dir <path>\` | Persist a profile so logins survive sessions |
| \`--isolated\` | Run with an ephemeral profile, discarded on close |
| \`--save-trace\` | Record a Playwright trace of the session for debugging |

Two of these deserve emphasis. The \`--device\` flag lets an agent test responsive and mobile-emulated layouts without leaving the desktop, which is handy for catching viewport-specific bugs. The \`--save-trace\` flag records a full Playwright trace of the agent's session, so when a generated flow misbehaves you can open the trace viewer and step through exactly what the agent saw and did. Combine \`--user-data-dir\` with a pre-authenticated profile to skip login on every run, or \`--isolated\` when you want a clean slate each time.

## Using It in CI

Running the Playwright MCP server in continuous integration lets an agent verify a deployment or triage a failure without a human at the keyboard. Keep it headless (the default) and make sure the browser binaries are installed in the runner. A minimal GitHub Actions step looks like this:

\`\`\`yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run agent-driven checks
  run: node scripts/run-agent-checks.js
  env:
    BASE_URL: https://staging.example.com
\`\`\`

In CI you generally want the \`--isolated\` flag so each run starts from a clean profile, and \`--save-trace\` so any failure leaves a trace artifact you can download and inspect. Point the agent at your staging URL through an environment variable rather than hardcoding it, so the same job runs against different environments. For teams building full agentic verification into their pipelines, our roundup of the [best AI testing tools for 2026](/blog/best-ai-testing-tools-2026) covers the surrounding ecosystem.

## Playwright MCP vs Raw Playwright vs Selenium MCP

It helps to place the Playwright MCP server against the two most common alternatives. Raw Playwright is the library you write tests against directly. The Playwright MCP server sits on top of it and lets an agent drive the browser and generate those tests for you. Selenium MCP offers a comparable agent interface but over WebDriver, which matters if you have an existing Selenium investment or need browser or grid coverage Playwright does not provide.

| Aspect | Playwright MCP | Raw Playwright | Selenium MCP |
|---|---|---|---|
| Interface | AI agent via MCP tools | Human-written code | AI agent via MCP tools |
| Perception | Accessibility tree | N/A (you write locators) | Screenshots and WebDriver |
| Test generation | Automatic from a session | Manual | Automatic from a session |
| Speed | Fast | Fast | Moderate |
| Token efficiency | High (structured snapshots) | N/A | Lower (more screenshot use) |
| Best for | Agent-driven web testing | Precise hand-written suites | Existing WebDriver teams |

The short version: use raw Playwright when you want full manual control over a hand-crafted suite, use the Playwright MCP server when you want an agent to explore and generate tests for modern web apps, and use Selenium MCP when your constraints (legacy suites, specific browsers or grids) point to WebDriver. For a fuller comparison across mobile and desktop, see [Appium vs Playwright in 2026](/blog/appium-vs-playwright-2026).

## Frequently Asked Questions

### What is the Playwright MCP server?

The Playwright MCP server is a Microsoft-built program (npm package \`@playwright/mcp\`) that exposes Playwright browser automation as Model Context Protocol tools. It lets an AI agent in Claude Code, Cursor, or VS Code navigate pages, read structure through the accessibility tree, click and type, and generate runnable Playwright tests from what it did during the session.

### How does Playwright MCP differ from regular Playwright?

Regular Playwright is a library you write test code against by hand. The Playwright MCP server sits on top of Playwright and gives an AI agent a tool interface to drive the browser and generate those tests automatically. You still get standard Playwright specs as output, but an agent produces them by exploring the live page instead of you writing every locator.

### Does Playwright MCP use screenshots or the accessibility tree?

By default it uses the accessibility tree, returning a structured text snapshot of every interactive element with a stable reference. This is faster, cheaper on tokens, and more deterministic than screenshots. You can switch to screenshot-based interaction with the \`--vision\` flag, but that is only recommended for canvas, WebGL, or other surfaces with no accessible representation.

### How do I install Playwright MCP in Cursor?

Create a \`.cursor/mcp.json\` file in your project and add an entry under \`mcpServers\` with \`"command": "npx"\` and \`"args": ["@playwright/mcp@latest"]\`. Save the file, and Cursor will show the server in its MCP settings panel with a connected indicator. The same config shape works in Claude Code and, with a \`servers\` key, in VS Code.

### Can Playwright MCP generate Playwright test code?

Yes, that is its headline use. You give the agent a URL and a goal, it navigates and acts on the live page through the browser tools, observes each step succeed, and then emits a Playwright spec. Because it perceived the page semantically, the generated test typically uses resilient locators like \`getByRole\` and \`getByLabel\` rather than brittle CSS selectors.

### Should I run Playwright MCP headless or headed?

Run headless in CI and any unattended context: it is the default, uses fewer resources, and needs no display. Run headed (\`--headless=false\`) during local development so you can watch what the agent does and debug flows visually. A common setup keeps two server entries, one headed and one headless, and uses whichever suits the moment.

### Is Playwright MCP better than Selenium MCP?

For most modern web testing, yes, because it uses the accessibility tree (making it faster, cheaper, and more deterministic) and generates clean Playwright tests. Selenium MCP is the better choice when you have a large existing WebDriver suite or need browser or grid coverage that Playwright does not offer. The right pick depends on your existing investment and coverage requirements.

## Conclusion

The Playwright MCP server turns any MCP-capable agent into a browser tester that explores real pages and writes real tests. Its accessibility-tree approach is what makes the whole thing work: fast, deterministic perception that yields stable, semantic locators instead of brittle coordinate clicks. Install it into Claude Code, Cursor, or VS Code with a one-line config, keep it in snapshot mode for standard web apps, run headed while you build and headless in CI, and reach for flags like \`--device\`, \`--save-trace\`, and \`--isolated\` as your workflow matures.

Want testing skills your agent can use alongside the Playwright MCP server? Browse the [QA skills directory](/skills) to find and install skills built for AI coding agents.
`,
};
