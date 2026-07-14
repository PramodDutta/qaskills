import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Agent Browser (Vercel) Complete Guide 2026',
  description:
    'A complete 2026 guide to Vercel agent-browser: what it is, install, the API, AI-driven browser automation, how it compares to Playwright MCP, and QA use cases.',
  date: '2026-06-01',
  category: 'Guide',
  content: `
# Agent Browser (Vercel) Complete Guide 2026

For two decades browser automation meant writing brittle scripts pinned to CSS selectors and XPath. You told the machine exactly where to click, exactly which input to fill, and the moment a developer renamed a class or restructured the DOM, your script shattered. Agent Browser, the open-source tool from Vercel Labs, takes a fundamentally different approach. It is a browser automation CLI built for AI agents, where you describe the goal in natural language and an agent figures out the steps, reads the page through an accessibility snapshot, and acts. Instead of "click the element with selector .btn-primary," you say "click the checkout button," and the agent finds it.

This guide is a complete 2026 reference to Vercel's agent-browser. We cover what it is and the problem it solves, how to install it, its command and API surface, how AI-driven browser automation actually works under the hood, how it compares to Playwright MCP, and the concrete QA use cases where it shines. Whether you searched for "agent browser," "vercel agent browser," "agent-browser skill," or "vercel-labs agent-browser," this is the reference you want. If you are evaluating browser automation for AI agents more broadly, our [MCP testing skills hub](/skills-for/mcp-testing) collects related skills, and the [skills directory](/skills) has installable agent skills you can drop into Claude Code, Cursor and other agents.

The headline idea is durability through abstraction. Traditional automation couples your test to the implementation details of the page. Agent Browser couples it to user intent, which changes far less often than the DOM. A button labeled "Checkout" stays "Checkout" through a dozen CSS refactors, so an intent-driven instruction survives changes that would break a selector-based script every time.

## What Is Agent Browser

Agent Browser is a command-line browser automation tool from Vercel Labs designed specifically to be driven by AI agents and large language models. It wraps a real browser (Chromium under the hood) and exposes a small set of high-level commands, navigate, snapshot, click, type, extract, screenshot, that an agent can call to accomplish tasks on the web. Crucially, it returns the page to the agent as a structured accessibility snapshot rather than raw HTML, giving the model a clean, token-efficient view of what is interactive on the page.

The tool ships as both a standalone CLI you can script directly and as an agent skill, meaning an AI coding agent can invoke it to interact with websites: navigating pages, filling forms, clicking buttons, taking screenshots, extracting data, testing web apps, logging into sites, or automating any browser workflow. When you ask an agent to "open this site and tell me the price" or "fill out this form and submit it," agent-browser is the mechanism that lets it actually do so in a live browser.

It solves three problems at once. First, it gives agents real browser capability rather than just fetching static HTML, so it works on JavaScript-heavy single-page apps. Second, it presents the page in an agent-friendly accessibility format that is cheap on tokens and easy for a model to reason about. Third, it abstracts away selectors, so automation is described in intent and survives UI churn.

## Installing Agent Browser

Agent Browser is distributed as an npm package and runs anywhere Node.js runs. The fastest way to try it is with npx, which requires no global install.

\`\`\`bash
# Run a one-off command without installing
npx agent-browser --help

# Or install globally for repeated use
npm install -g agent-browser

# Confirm it is available
agent-browser --version
\`\`\`

On first run it downloads the Chromium browser it drives, similar to how Playwright provisions browsers. In CI you typically install it as a dev dependency and let your pipeline cache the browser binary.

\`\`\`bash
# Add to a project for scripted or CI use
npm install --save-dev agent-browser

# In CI, install browser dependencies once
npx agent-browser install
\`\`\`

To use it as an agent skill inside an AI coding agent, point the agent at the agent-browser skill. The skill exposes the same commands as a set of tools the agent can call, so the agent decides when to navigate, snapshot and act based on your natural-language request. Setup mirrors how you would wire any MCP-style browser tool into an agent, which we cover in our [Playwright MCP browser automation guide](/blog/playwright-mcp-browser-automation-guide).

## The Agent Browser API and Commands

Agent Browser exposes a compact, composable command set. Each command does one thing, and an agent chains them to complete a task. The table summarizes the core surface.

| Command | Purpose | Typical input |
|---|---|---|
| navigate | Load a URL in the browser | URL |
| snapshot | Return an accessibility snapshot of the page | (none) |
| click | Click an element by description or ref | text or ref |
| type | Type into a field by description or ref | text, value |
| extract | Pull structured data from the page | description / schema |
| screenshot | Capture a PNG of the page or element | optional ref |
| wait | Wait for a condition or element | condition |

A scripted session that opens a page, inspects it, fills a search box and reads results looks like this:

\`\`\`bash
# Navigate to a page
agent-browser navigate "https://example.com/search"

# Get an accessibility snapshot the agent can reason over
agent-browser snapshot

# Type a query into the search field by its accessible label
agent-browser type "Search products" "wireless headphones"

# Click the submit control by its label
agent-browser click "Search"

# Extract structured results
agent-browser extract "list of product names and prices"
\`\`\`

The snapshot is the heart of the workflow. Rather than dumping the full DOM, agent-browser returns a compact tree of interactive elements with their roles, accessible names and stable references (refs). The agent reads that tree, decides which element matches the intent, and acts either by description or by the ref it saw in the snapshot.

\`\`\`json
{
  "url": "https://example.com/search",
  "snapshot": [
    { "role": "searchbox", "name": "Search products", "ref": "e3" },
    { "role": "button", "name": "Search", "ref": "e4" },
    { "role": "link", "name": "Cart (0)", "ref": "e7" }
  ]
}
\`\`\`

Because refs are stable for the duration of a snapshot, an agent can chain "snapshot then click ref e4" reliably, while a human-authored script can stay on the more durable "click the element named Search." This dual addressing, by intent or by ref, is what makes the tool both agent-friendly and scriptable.

## How AI-Driven Browser Automation Works

The execution loop is what separates AI-driven automation from classic scripting. A traditional Playwright test is a fixed sequence: the developer wrote every step. Agent Browser runs a perceive-decide-act loop driven by a model.

The loop is straightforward. The agent navigates to a page, requests a snapshot, and sends that accessibility tree to the LLM along with the goal. The model reasons about which element satisfies the next step and emits an action (click this, type that). Agent Browser executes the action in the real browser, the page changes, the agent snapshots again, and the loop repeats until the goal is met or a stopping condition fires. Here is that loop expressed as pseudocode an agent harness would run:

\`\`\`typescript
async function runGoal(goal: string, startUrl: string) {
  await browser.navigate(startUrl);

  for (let step = 0; step < MAX_STEPS; step++) {
    const snapshot = await browser.snapshot();

    // The model receives the goal + current page state and decides.
    const action = await llm.decide({ goal, snapshot });

    if (action.type === 'done') {
      return action.result;
    }

    // Execute the model's chosen action against the live browser.
    if (action.type === 'click') {
      await browser.click(action.ref ?? action.description);
    } else if (action.type === 'type') {
      await browser.type(action.target, action.value);
    } else if (action.type === 'extract') {
      return await browser.extract(action.schema);
    }
  }
  throw new Error('Step budget exceeded before goal completion');
}
\`\`\`

Two properties fall out of this design. First, the automation adapts: if the page renders differently than expected, the next snapshot reflects reality and the model adjusts, where a fixed script would have failed. Second, it is non-deterministic, the model might take a slightly different path on each run, which is powerful for exploration but means you cap step budgets and verify outcomes rather than asserting an exact click sequence. This is the same step-budget discipline we recommend for agent evaluation in our [OpenAI Evals trace grading guide](/blog/openai-evals-trace-grading-complete-guide).

## Agent Browser vs Playwright MCP

The most common question in 2026 is how agent-browser compares to Playwright MCP, since both let AI agents drive a browser through accessibility snapshots. They overlap but optimize for different things.

| Dimension | Agent Browser (Vercel) | Playwright MCP |
|---|---|---|
| Primary form | Standalone CLI + agent skill | MCP server for agents |
| Backing engine | Chromium | Full Playwright (Chromium, Firefox, WebKit) |
| Page representation | Accessibility snapshot | Accessibility snapshot |
| Cross-browser | Chromium-focused | Three engines |
| Scriptable outside an agent | Yes, plain CLI | Primarily via MCP client |
| Ecosystem | Vercel Labs tooling | Microsoft Playwright ecosystem |
| Best fit | Lightweight agent automation, quick scripts | Teams already standardized on Playwright |

The practical guidance: choose agent-browser when you want a lightweight, CLI-first tool that an agent can call with minimal setup, or when you want to script quick browser tasks without standing up an MCP server. Choose Playwright MCP when your team already lives in Playwright, needs cross-browser coverage across Firefox and WebKit, or wants to reuse existing Playwright fixtures and reporters. Both share the snapshot-driven philosophy, so skills you learn on one transfer to the other. For a full treatment of the Playwright MCP side, see our [Playwright MCP server configuration guide](/blog/playwright-mcp-json-configuration-reference) and the broader [MCP testing skills hub](/skills-for/mcp-testing).

## QA Use Cases for Agent Browser

Agent Browser is genuinely useful for QA, not just demos. The intent-driven model maps cleanly onto several testing workflows.

The strongest fit is exploratory and smoke testing. Point the agent at a deployed build with a goal like "log in, add any product to the cart, and reach the checkout page," and it walks the happy path the way a human tester would, adapting to whatever the UI actually presents. Because it is not pinned to selectors, the same instruction keeps working across releases, so it doubles as a durable smoke test that flags when a core flow breaks. A QA smoke check might look like this:

\`\`\`bash
agent-browser navigate "https://staging.example.com"
agent-browser type "Email" "qa@example.com"
agent-browser type "Password" "test-password"
agent-browser click "Sign in"
agent-browser snapshot
# Agent verifies the dashboard heading is present in the snapshot
agent-browser extract "the main page heading text"
\`\`\`

The second use case is data extraction and verification. Agents use extract to pull prices, table rows, or status badges and assert they match expectations, which is ideal for content and pricing-page verification. The third is form testing: an agent fills multi-step forms by intent, exercising validation paths a brittle script would struggle to maintain. The fourth is accessibility-adjacent checking: because the tool sees the page as an accessibility tree, missing labels and unreachable controls surface naturally, since an element with no accessible name is hard for the agent to act on, which is itself a signal.

What agent-browser is not, in 2026, is a replacement for a deterministic regression suite. Its non-determinism makes it excellent for exploration and smoke coverage but unsuitable as the sole gate for pixel-exact or step-exact assertions. The mature pattern is to use agent-browser for broad, adaptive coverage and a deterministic framework like Playwright for the precise regression layer, exactly the layered strategy we describe in our [agentic testing complete guide](/blog/agentic-testing-complete-guide).

## Getting the Most From Agent Browser

A few practices make agent-browser reliable in real use. Give the agent clear, bounded goals; "log in and reach checkout" works far better than a vague "test the site," and a tight goal keeps the step budget small and the run cheap. Always cap the number of steps so a confused agent cannot loop indefinitely, and verify the outcome with an explicit extract or snapshot assertion rather than trusting that the agent's self-reported success is real.

Prefer intent over refs in human-authored scripts because intent survives UI changes, but let the agent use refs within a single snapshot for precision. In CI, pin the model and keep temperature low so runs are as repeatable as a probabilistic system allows, and treat agent-browser runs as a smoke and exploration signal feeding a deterministic regression suite rather than as the regression suite itself. Finally, capture screenshots at key steps; when an agent run fails, a visual trail is the fastest way to see what the agent saw and why it diverged.

## Running Agent Browser in CI

Bringing agent-browser into continuous integration follows the same shape as any browser automation, with one twist: because runs are probabilistic, you verify outcomes rather than asserting exact step sequences. A smoke job navigates a goal, extracts a known fact, and asserts it matches expectation. If the agent cannot reach the goal within its step budget, the job fails and flags a broken core flow.

\`\`\`yaml
name: agent-browser-smoke

on:
  deployment_status:

jobs:
  smoke:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install --save-dev agent-browser
      - run: npx agent-browser install
      - name: Smoke test critical flow
        env:
          TARGET_URL: \${{ github.event.deployment_status.target_url }}
        run: node scripts/smoke.mjs
\`\`\`

The smoke script wraps a bounded goal and asserts a stable outcome, so a confused agent cannot pass by accident:

\`\`\`javascript
// scripts/smoke.mjs
import { runGoal } from './agent-runner.mjs';

const result = await runGoal(
  'Log in with the QA test account and confirm the dashboard loads',
  process.env.TARGET_URL,
  { maxSteps: 8 },
);

if (!result.success || !result.text.includes('Dashboard')) {
  console.error('Smoke failed:', result.text);
  process.exit(1);
}
console.log('Critical flow reachable.');
\`\`\`

This pattern gives you fast, resilient post-deploy coverage of the flows that matter most, while your deterministic Playwright suite handles the precise regression assertions. Because the smoke goal is intent-driven, it keeps passing across UI refactors that would force constant maintenance on a selector-based smoke test, which is the core durability advantage agent-browser brings to a pipeline.

## Frequently Asked Questions

### What is agent-browser from Vercel?

Agent Browser is an open-source browser automation CLI from Vercel Labs built for AI agents. It drives a real Chromium browser through high-level commands, navigate, snapshot, click, type, extract, screenshot, and returns the page as an accessibility snapshot instead of raw HTML. This lets an agent reason about and act on web pages by intent ("click the checkout button") rather than by brittle CSS selectors, so automation survives UI changes.

### How do I install agent-browser?

Run it instantly with npx using \`npx agent-browser --help\`, or install it globally with \`npm install -g agent-browser\`. For projects and CI, add it as a dev dependency with \`npm install --save-dev agent-browser\` and run \`npx agent-browser install\` to provision the Chromium binary. To use it as an agent skill, point your AI coding agent at the agent-browser skill, which exposes the commands as callable tools.

### How is agent-browser different from Playwright MCP?

Both let AI agents drive a browser via accessibility snapshots, but agent-browser is a lightweight CLI plus agent skill focused on Chromium, while Playwright MCP is an MCP server backed by full Playwright with Chromium, Firefox and WebKit. Choose agent-browser for quick, CLI-first agent automation with minimal setup; choose Playwright MCP when you need cross-browser coverage or already standardize on the Playwright ecosystem.

### Can agent-browser replace Playwright for QA testing?

Not as a full replacement in 2026. Agent Browser excels at exploratory and smoke testing because its intent-driven, adaptive approach survives UI churn, but it is non-deterministic, so it is unsuitable as the sole gate for step-exact or pixel-exact regression assertions. The recommended pattern is to use agent-browser for broad adaptive coverage and a deterministic framework like Playwright for the precise regression layer.

### What does the agent-browser accessibility snapshot contain?

The snapshot is a compact tree of the page's interactive elements, each with its role (button, searchbox, link), its accessible name, and a stable reference (ref). It deliberately omits most raw HTML, giving the agent a clean, token-efficient view of what can be acted on. The agent reads this tree to decide which element matches the current goal and then acts either by description or by the ref it saw.

### What are the best QA use cases for agent-browser?

The strongest fits are exploratory and smoke testing of deployed builds, data and pricing verification via the extract command, multi-step form testing where intent-driven actions outlast brittle scripts, and accessibility-adjacent checks since unlabeled controls are hard for the agent to act on, surfacing them as a signal. Use it alongside, not instead of, a deterministic regression suite for the best coverage.

## Conclusion

Agent Browser reframes browser automation around intent instead of selectors, giving AI agents a durable, accessibility-driven way to navigate, act on and verify live web pages. Its perceive-decide-act loop adapts to UI changes that shatter traditional scripts, making it a powerful tool for exploratory testing, smoke coverage, data verification and form testing. It is not a deterministic regression engine, and the mature approach pairs it with Playwright for precise assertions, but as the agent-facing layer of a modern QA stack it is hard to beat for speed of setup and resilience.

Explore how it fits a broader agent strategy in our [agentic testing complete guide](/blog/agentic-testing-complete-guide), compare it with the Playwright approach in our [Playwright MCP server configuration guide](/blog/playwright-mcp-json-configuration-reference), and visit the [MCP testing skills hub](/skills-for/mcp-testing) for related tooling. Browse the full [QA skills directory](/skills) to install browser-automation skills into your agent, or [compare automation tools](/compare) to choose the right fit for your team.
`,
};
