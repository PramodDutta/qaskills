import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Playwright's Three-Agent System: Planner, Generator, Healer",
  description:
    'How Playwright ships three AI agents - Planner, Generator, Healer - that explore your app via the accessibility tree, write tests, and auto-heal broken selectors.',
  date: '2026-06-29',
  category: 'Guide',
  content: `
# Playwright's Three-Agent System: Planner, Generator, Healer

In 2026, Playwright stopped being just a browser automation library and became an agentic test platform. The headline feature is a coordinated loop of three AI agents - the **Planner**, the **Generator**, and the **Healer** - that work together to explore a web application, propose test cases in plain language, emit real Playwright TypeScript code, and then repair that code when the DOM shifts underneath it. Instead of a human writing every selector by hand, the agents drive a real browser through the accessibility tree, reason about what they observe, and produce tests that a reviewer can read and merge.

The critical architectural decision is that these agents are **accessibility-tree-first**, not screenshot-first. They do not pixel-peep a rendered image and guess at coordinates. They consume the same semantic tree that screen readers use - roles, names, and states - which is compact, deterministic, token-efficient, and far more stable than a bitmap. That single design choice is why the generated selectors lean on \`getByRole\` and \`getByLabel\` instead of brittle CSS paths, and it is why the Healer can reattach a test to a moved button without a human in the loop.

This guide walks through what each agent does, how the explore -> plan -> generate -> heal loop actually runs, how it plugs into GitHub Copilot's "Fix with AI" and Claude Code via MCP, how to set it up, a complete worked example, and where the system still falls short. If you are coming from hand-written suites, also read our [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide) for the fundamentals these agents build on.

## What the Three-Agent System Actually Is

The three-agent system is not a single black-box model. It is three specialized roles, each given a narrow job, a defined set of browser tools, and a strict output contract. Splitting the work this way keeps each agent's context small and its behavior auditable - you can inspect what the Planner proposed before the Generator writes a single line of code.

| Agent | Job | Reads | Produces |
| --- | --- | --- | --- |
| Planner | Explore the app, understand flows | Accessibility tree, page snapshots | A markdown test plan (human-readable scenarios) |
| Generator | Turn the plan into runnable tests | The plan + live page snapshots | Playwright TypeScript spec files |
| Healer | Repair tests after a failure | Failed run output + current DOM | A patched spec with updated locators |

Each agent is backed by a large language model (Claude, GPT, or a local model) connected to the Playwright MCP server. The MCP server is what gives the agent hands - it exposes browser tools like \`browser_navigate\`, \`browser_snapshot\`, and \`browser_click\`. The agents never invent what is on the page; they call \`browser_snapshot\`, receive the accessibility tree, and reason over real state.

## The Planner Agent: Exploring and Proposing Test Cases

The Planner is the cartographer. You point it at a URL (or a running dev server) and a goal, and it autonomously clicks through the application, building a mental map of the flows that matter. It opens the page, takes an accessibility snapshot, identifies interactive landmarks - navigation, forms, buttons - and follows them the way a curious new user would.

Crucially, the Planner does not write code. Its output is a plain-English plan that a QA lead can review and edit:

\`\`\`markdown
# Test Plan: Checkout Flow

## Scenario 1: Guest checkout with valid card
- Navigate to /products
- Add "Wireless Mouse" to cart
- Open cart, click "Checkout"
- Fill shipping form (name, address, postcode)
- Enter test card 4242 4242 4242 4242
- Assert order confirmation shows an order number

## Scenario 2: Checkout blocked on empty cart
- Navigate directly to /checkout with empty cart
- Assert redirect to /cart with "Your cart is empty" message
\`\`\`

You run the Planner from the command line. The seed prompt tells it what to focus on:

\`\`\`bash
npx playwright explore \\
  --url http://localhost:3000 \\
  --goal "Map the checkout and authentication flows" \\
  --out test-plan.md
\`\`\`

Because the Planner reads the accessibility tree, its plan references elements by their accessible name ("Checkout" button, "Email" textbox) rather than by \`#chk-btn-2\`. That makes the plan readable and makes the downstream Generator far more likely to emit stable locators. This explore-and-propose behavior is closely related to the workflows in our [AI agent testing workflows comparison](/blog/ai-agent-testing-workflows-comparison).

## The Generator Agent: From Plan to Playwright Code

The Generator takes an approved plan and turns each scenario into a real spec file. It does not generate blind from the plan text alone - it re-opens the app, snapshots each step, and confirms the locator it is about to write actually resolves on the live page. This "verify-as-you-write" loop is why generated tests usually pass on the first run instead of needing three rounds of selector fixes.

A generated spec for Scenario 1 above looks like idiomatic, reviewable Playwright:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('guest checkout with valid card', async ({ page }) => {
  await page.goto('/products');

  await page
    .getByRole('listitem')
    .filter({ hasText: 'Wireless Mouse' })
    .getByRole('button', { name: 'Add to cart' })
    .click();

  await page.getByRole('link', { name: 'Cart' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();

  await page.getByLabel('Full name').fill('Ada Lovelace');
  await page.getByLabel('Address').fill('12 Analytical Engine Rd');
  await page.getByLabel('Postcode').fill('SW1A 1AA');
  await page.getByLabel('Card number').fill('4242 4242 4242 4242');

  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(page.getByText(/order #\\d+/i)).toBeVisible();
});
\`\`\`

Notice that every locator is role- or label-based. The Generator is instructed to prefer user-facing locators in the exact priority order Playwright recommends: \`getByRole\` > \`getByLabel\` > \`getByPlaceholder\` > \`getByText\` > \`getByTestId\`, with raw CSS or XPath only as a last resort. The table below shows the locator hierarchy the Generator follows.

| Priority | Locator | When the Generator uses it | Stability |
| --- | --- | --- | --- |
| 1 | \`getByRole\` | Buttons, links, headings, inputs with a role | Very high |
| 2 | \`getByLabel\` | Form fields with an associated label | Very high |
| 3 | \`getByPlaceholder\` | Inputs with placeholder but no label | Medium |
| 4 | \`getByText\` | Static content, confirmations | Medium |
| 5 | \`getByTestId\` | Elements with explicit \`data-testid\` | High (if maintained) |
| 6 | CSS / XPath | Nothing else resolves | Low - avoided |

You invoke the Generator against the reviewed plan:

\`\`\`bash
npx playwright generate \\
  --plan test-plan.md \\
  --base-url http://localhost:3000 \\
  --out-dir tests/generated
\`\`\`

## Accessibility-Tree-First Architecture (Not Screenshots)

This is the foundation everything else rests on, so it deserves a dedicated section. When an agent calls \`browser_snapshot\`, it does not get back a PNG. It gets a structured, text serialization of the page's accessibility tree, roughly like this:

\`\`\`yaml
- banner:
  - link "Home"
  - link "Products"
  - button "Cart" [badge: 1]
- main:
  - heading "Checkout" [level=1]
  - textbox "Full name"
  - textbox "Address"
  - textbox "Card number"
  - button "Place order"
\`\`\`

Compare the two approaches honestly:

| Dimension | Accessibility-tree-first | Screenshot-first |
| --- | --- | --- |
| Input to model | Compact text (roles + names) | Large image, many tokens |
| Selector quality | Semantic (\`getByRole\`) | Coordinate or visual guess |
| Stability under restyle | High - CSS changes do not matter | Low - layout shifts break it |
| Token cost | Low | High |
| Handles offscreen elements | Yes | No - must scroll |
| Reflects real a11y state | Yes (also tests accessibility) | No |

The accessibility tree is also why these agents incidentally surface accessibility defects: if a button has no accessible name, the agent cannot target it reliably and flags it. That overlap with a11y testing is why teams pair this system with tooling covered in our [axe-core Playwright accessibility testing guide](/blog/axe-core-playwright-accessibility-testing-2026). Screenshots are still useful for visual regression, but they are a poor primary signal for an agent that needs to act on the page deterministically.

## The Healer Agent: Repairing Broken Selectors

The Healer is what makes the system worth adopting at scale. Tests rot. A developer renames a button from "Place order" to "Confirm purchase," and overnight a passing suite goes red. In a hand-maintained suite, a human triages the failure, opens the spec, finds the new name, and patches it. The Healer does this automatically.

When a test fails, the Healer is triggered with the failure context: the error message, the failing locator, and a fresh accessibility snapshot of the current page. It diffs intent against reality. It sees that the test wanted a button named "Place order," that no such button exists, but that a button named "Confirm purchase" now sits where the old one did, in the same place in the flow. It proposes a minimal patch:

\`\`\`diff
-  await page.getByRole('button', { name: 'Place order' }).click();
+  await page.getByRole('button', { name: 'Confirm purchase' }).click();
\`\`\`

The Healer runs in two modes. In CI it can run in suggest-only mode, posting the diff as a comment or a draft PR for a human to approve. Locally it can apply and re-run automatically:

\`\`\`bash
npx playwright heal \\
  --spec tests/generated/checkout.spec.ts \\
  --trace test-results/checkout/trace.zip \\
  --mode suggest
\`\`\`

The Healer is conservative by design. It will not rewrite assertions or invent new steps - that would let a test "heal" itself into passing while the feature is actually broken. It only re-binds locators when there is a high-confidence match between the original intent and a present element. When confidence is low, it escalates to a human. If you want to understand the failure data it consumes, our [Playwright trace viewer debugging guide](/blog/playwright-trace-viewer-debugging-guide) explains the trace format the Healer reads.

## The Full Loop: Explore -> Plan -> Generate -> Heal

Here is the end-to-end loop the three agents run, with the handoffs between them:

\`\`\`
   ┌──────────┐    test-plan.md    ┌────────────┐   *.spec.ts   ┌────────────┐
   │ PLANNER  │ ─────────────────▶ │ GENERATOR  │ ────────────▶ │  CI / run  │
   │ explores │                    │ writes code│               │  the tests │
   └────┬─────┘                    └────────────┘               └─────┬──────┘
        │ a11y snapshots                                              │ failure
        ▼                                                             ▼
   live browser ◀──────────────────────────────────────────── ┌────────────┐
                            patched spec                        │   HEALER   │
                                                                │ repairs    │
                                                                └────────────┘
\`\`\`

The loop is not strictly linear. The Healer feeds repaired tests back into CI, and a sufficiently large drift (a brand-new page) can trigger the Planner again to map the new surface. The key insight is the separation of concerns: exploration is decoupled from code generation, which is decoupled from maintenance. Each stage produces a human-reviewable artifact - a plan, a spec, a diff - so you are never asked to trust an opaque end-to-end magic step.

## Integration With GitHub Copilot "Fix with AI"

GitHub Copilot's "Fix with AI" is the most common front door to the Healer for teams already on GitHub. When a Playwright test fails in a pull request, the failure annotation includes a "Fix with AI" action. Clicking it hands Copilot the same context the standalone Healer uses - the error, the failing locator, and a snapshot - and Copilot proposes the locator patch inline in the diff view.

To wire this up, you add the Playwright reporter that emits structured failure metadata Copilot can consume:

\`\`\`ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['@playwright/ai-reporter', { healSuggestions: true }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
});
\`\`\`

With \`healSuggestions: true\`, every failure carries a machine-readable description of the intended action so the model has enough context to propose a fix rather than guess. The same metadata powers Copilot in the editor and the Healer in CI.

## Integration With Claude Code via MCP

Claude Code reaches the three-agent system through the Model Context Protocol. You register the Playwright MCP server, and Claude Code gains the same browser tools the agents use - it can navigate, snapshot, click, and then write and heal tests, all in one session. This is the most flexible integration because Claude Code orchestrates the whole loop conversationally.

Register the server in your Claude Code MCP config:

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

Then in a Claude Code session you can simply say: "Explore the checkout flow on localhost:3000, propose test cases, and generate Playwright specs." Claude Code runs the Planner role, surfaces the plan for your approval, then runs the Generator. We cover the full connection process in our dedicated [Playwright MCP server Claude Code setup guide](/blog/playwright-mcp-server-claude-code-setup), and you can find ready-made testing skills in the [QA skills directory](/skills).

## Setup: Getting the Three-Agent System Running

Setup is deliberately incremental - you can adopt one agent at a time. Start by installing Playwright and the agent toolkit:

\`\`\`bash
npm init playwright@latest
npm install -D @playwright/test @playwright/agents
npx playwright install chromium
\`\`\`

Create an agents config that points at your app and chooses a model provider:

\`\`\`json
{
  "agents": {
    "model": "claude-sonnet-4",
    "baseURL": "http://localhost:3000",
    "snapshotMode": "accessibility",
    "planner": { "maxSteps": 40, "out": "test-plan.md" },
    "generator": { "outDir": "tests/generated", "preferRoleLocators": true },
    "healer": { "mode": "suggest", "confidenceThreshold": 0.8 }
  }
}
\`\`\`

Set your model provider key and run the loop end to end:

\`\`\`bash
export ANTHROPIC_API_KEY="sk-ant-..."
npx playwright explore --goal "Map auth and checkout"
npx playwright generate --plan test-plan.md
npx playwright test tests/generated
\`\`\`

The \`confidenceThreshold\` on the Healer is the most important knob: lower it and the Healer fixes more on its own but risks masking real bugs; raise it and it escalates more to humans. Most teams start at 0.8 in suggest mode and tighten from there.

## A Worked Example: Login Flow End to End

Let us run the complete loop on a login flow. First the Planner explores and writes this plan:

\`\`\`markdown
# Test Plan: Authentication
## Scenario 1: Successful login
- Go to /login
- Fill "Email" with valid user
- Fill "Password" with valid password
- Click "Sign in"
- Assert dashboard heading "Welcome back" is visible
## Scenario 2: Wrong password
- Go to /login, submit valid email + wrong password
- Assert error "Invalid credentials" is visible
\`\`\`

The Generator produces the spec, verifying each locator against the live page as it writes:

\`\`\`ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('successful login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Password').fill('correct-horse');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(
      page.getByRole('heading', { name: 'Welcome back' })
    ).toBeVisible();
  });

  test('wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Password').fill('nope');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});
\`\`\`

Two sprints later, a designer renames the "Sign in" button to "Log in" and the heading from "Welcome back" to "Your dashboard." Both tests fail. The Healer receives the failure and the current snapshot and proposes:

\`\`\`diff
-    await page.getByRole('button', { name: 'Sign in' }).click();
+    await page.getByRole('button', { name: 'Log in' }).click();
@@
-      page.getByRole('heading', { name: 'Welcome back' })
+      page.getByRole('heading', { name: 'Your dashboard' })
\`\`\`

You review the diff in the PR, confirm the rename was intentional, approve, and the suite is green again - no manual selector archaeology required. This is the day-to-day payoff. For the broader skill set around reviewing AI-written tests, see our [best Claude Code skills for automated testing](/blog/best-claude-code-skills-for-automated-testing).

## Limitations and When Not to Trust the Agents

The three-agent system is powerful but not omniscient. Know its edges before you wire it into a release gate.

| Limitation | Why it happens | Mitigation |
| --- | --- | --- |
| Weak on visual bugs | Reads semantics, not pixels | Pair with visual regression tests |
| Can heal a test into false-green | Over-eager locator rebind | Keep \`confidenceThreshold\` high, review diffs |
| Struggles with canvas/WebGL | No accessibility tree for canvas | Hand-write tests for canvas apps |
| Needs accessible markup | Unlabeled controls are untargetable | Fix a11y first - it helps users too |
| Non-deterministic plans | LLM sampling varies | Pin model + seed, review plans |
| Cost on huge apps | Many snapshots and tokens | Scope exploration to key flows |

The most important rule: the Healer maintains tests, it does not author intent. A human still decides what a passing test should mean. Treat generated specs and healed diffs as pull requests from a fast but junior engineer - review them. Never let the Healer auto-merge against your main suite without human approval on anything that changes an assertion. For complex data-dependent flows, you will still hand-write fixtures and edge cases the way you always have.

## Frequently Asked Questions

### What are the three agents in Playwright's agentic system?

The three agents are the Planner, the Generator, and the Healer. The Planner explores your app and writes a plain-English test plan. The Generator turns that plan into runnable Playwright TypeScript code. The Healer repairs tests automatically when selectors break after a DOM change. Together they form an explore, generate, and maintain loop.

### Does Playwright's AI use screenshots or the accessibility tree?

Playwright's agents are accessibility-tree-first, not screenshot-first. They consume a compact text serialization of the page's roles, names, and states - the same tree screen readers use. This makes generated selectors semantic and stable, keeps token cost low, and lets the Healer reattach to moved elements without pixel guessing. Screenshots are reserved for visual regression.

### How does the Healer agent fix broken tests?

When a test fails, the Healer gets the error, the failing locator, and a fresh accessibility snapshot. It matches the original intent against the current page - for example, a button renamed from "Submit" to "Send" - and proposes a minimal locator patch as a diff. It only rebinds locators above a confidence threshold and never rewrites assertions to force a pass.

### Can I use the three-agent system with Claude Code?

Yes. Claude Code connects through the Playwright MCP server, which exposes browser tools like navigate, snapshot, and click. Once registered in your MCP config, Claude Code can run the Planner, Generator, and Healer roles conversationally - exploring your app, proposing tests, generating specs, and healing failures in a single session.

### How does GitHub Copilot "Fix with AI" relate to the Healer?

"Fix with AI" is GitHub's front door to the Healer. When a Playwright test fails in a pull request, the annotation includes a "Fix with AI" action that hands Copilot the same failure context the Healer uses and proposes the locator patch inline in the diff. You enable it by adding the AI reporter with heal suggestions in your Playwright config.

### Are the generated Playwright tests safe to merge without review?

No - treat them like a pull request from a fast junior engineer. The Generator verifies locators against the live page so tests usually pass immediately, but you should still review assertions, edge cases, and any healed diff. Never let the Healer auto-merge changes that touch assertions, since an over-eager fix can turn a real bug into a false green.

### What kinds of apps does the three-agent system struggle with?

It struggles with canvas, WebGL, and heavily visual interfaces because they expose no accessibility tree for the agents to read. It also needs accessible markup - unlabeled buttons are untargetable. For these cases, fix the accessibility first or hand-write tests, and always pair the agents with visual regression testing for purely visual defects.

## Conclusion

Playwright's three-agent system reframes test automation from "write every selector by hand" to "review the work of three specialized agents." The Planner maps your app, the Generator writes idiomatic role-based Playwright code, and the Healer keeps the suite green as your UI evolves - all built on an accessibility-tree-first architecture that makes selectors semantic and stable. The payoff is real: less time fixing brittle locators, more time deciding what to test. But the agents author maintenance, not intent. Keep humans on the assertions, keep the Healer's confidence threshold high, and review every diff.

Ready to put agentic testing to work? Explore curated [QA skills for AI coding agents](/skills) to bootstrap your Planner, Generator, and Healer workflows, and pair them with the patterns in our [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide).
`,
};
