import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright init-agents: Planner, Generator, and Healer Guide',
  description:
    'A complete guide to Playwright test agents via npx playwright init-agents. Set up the planner, generator, and healer with Claude Code, Copilot, and Cursor.',
  date: '2026-07-06',
  category: 'Guide',
  content: `
# Playwright init-agents: The Planner, Generator, and Healer Guide

Playwright now ships an official set of test agents you install with a single command: \`npx playwright init-agents\`. Instead of hand-authoring every end-to-end test, you delegate three distinct jobs to purpose-built agent definitions. The planner explores your running application, understands its flows, and writes a human-readable Markdown plan describing what should be tested. The generator takes that plan and turns it into real, runnable TypeScript Playwright tests. The healer watches for broken locators and failing assertions and repairs them by re-inspecting the live page, so your suite stops rotting every time the UI shifts. Together these three agents cover the full lifecycle of a test: what to test, how to test it, and how to keep it passing.

What makes this official tooling different from bolt-on AI test writers is that it is built around the Playwright MCP (Model Context Protocol) server and a set of versioned agent definition files that live in your repository. \`init-agents\` writes these definitions tailored to your chosen AI client, whether that is Claude Code, GitHub Copilot, or Cursor, so the agents share Playwright's own knowledge of best practices, role-based locators, web-first assertions, and the trace viewer. Because the definitions are files under version control, they are reviewable, diffable, and regenerated whenever you upgrade Playwright, keeping the agents in step with the framework. In this guide you will learn exactly what each agent does, how to run \`init-agents\` for your editor, how to drive the planner-to-generator-to-healer loop, how the MCP server connects everything, and the practical habits that keep an agent-authored suite trustworthy. The goal is a workflow where you describe intent in English and review generated tests, rather than typing selectors by hand.

## What Playwright Test Agents Are

The Playwright test agents are three coordinated roles, each defined by a Markdown file that instructs your AI client how to behave when it takes on that role. They are not a separate binary or service, they are prompt-and-tool definitions that your existing coding agent loads. The three roles are the planner, the generator, and the healer. Each has a narrow responsibility, which is what makes them reliable: a focused agent with clear tools outperforms a single do-everything prompt.

The agents lean on the Playwright MCP server for live interaction with your app. MCP gives the agent tools to navigate pages, snapshot the accessibility tree, click, type, and read the DOM, so the planner and healer reason about the real running application rather than guessing from source code. This grounding in the live page is why generated locators tend to be robust role-based selectors rather than brittle CSS.

## Running npx playwright init-agents

The setup command detects or accepts your target AI client and writes the agent definition files into your project. You pass a \`--loop\` flag naming the client so the definitions are formatted correctly for it.

\`\`\`bash
# For Claude Code
npx playwright init-agents --loop=claude

# For GitHub Copilot (VS Code)
npx playwright init-agents --loop=vscode

# For Cursor
npx playwright init-agents --loop=cursor
\`\`\`

Running this creates the agent definition files and the MCP configuration your client needs. The exact output paths depend on the client, but the files are committed to your repository so the whole team shares the same agent behavior. After running it, restart or reload your AI client so it picks up the new agent definitions and the Playwright MCP server.

The table below summarizes what each \`--loop\` target produces.

| Client | Flag | What it writes |
|---|---|---|
| Claude Code | \`--loop=claude\` | Agent definitions plus MCP server config for Claude |
| GitHub Copilot | \`--loop=vscode\` | Chat mode definitions and MCP config for VS Code |
| Cursor | \`--loop=cursor\` | Cursor-formatted agent rules plus MCP config |

## The Planner Agent

The planner is where a testing effort begins. You point it at your application, describe the area you want covered, and it explores the live app through the MCP server, clicking around, reading pages, and building an understanding of the available flows. It then writes a Markdown test plan: a structured, human-readable document listing scenarios, steps, and expected outcomes. Crucially the plan is prose and lists, not code, which makes it easy for a human to review and correct before any test is generated.

You invoke the planner by asking your AI client to act as the Playwright planner for a given flow. A typical prompt looks like this.

\`\`\`text
Use the Playwright planner agent to explore the checkout flow at
http://localhost:3000 and produce a test plan covering adding an item
to the cart, applying a discount code, and completing payment.
\`\`\`

The planner navigates the app, discovers the real steps (including ones you may have forgotten, like an address confirmation modal), and emits a plan file such as \`checkout.plan.md\`. Because this artifact is Markdown under version control, you review it like any other document, edit scenarios, remove out-of-scope cases, and add edge cases before moving on. Reviewing the plan first is the single highest-leverage habit in this workflow, it is far cheaper to fix a scenario in prose than to fix a generated test.

## The Generator Agent

The generator consumes an approved plan and writes real TypeScript Playwright tests. It does not hallucinate selectors from imagination, it re-visits the live application through the MCP server to confirm the actual roles, labels, and structure of each element, then emits idiomatic Playwright code using role-based locators and web-first assertions. The result is a \`.spec.ts\` file you can run immediately with \`npx playwright test\`.

\`\`\`text
Use the Playwright generator agent to turn checkout.plan.md into a
Playwright test file at tests/checkout.spec.ts.
\`\`\`

A generated test looks like hand-written Playwright because it is held to the same standards baked into the agent definition.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('completes checkout with a discount code', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Role-based locators come from inspecting the live accessibility tree.
  await page.getByRole('link', { name: 'Shop' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).first().click();
  await page.getByRole('link', { name: 'Cart' }).click();

  await page.getByLabel('Discount code').fill('SAVE10');
  await page.getByRole('button', { name: 'Apply' }).click();

  // Web-first assertion auto-waits for the updated total.
  await expect(page.getByTestId('order-total')).toContainText('$45.00');

  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
});
\`\`\`

Because the generator grounds every locator in the real page, you get resilient tests rather than guesses. You still review the output, but the review is quick because the code follows conventions you can scan.

## The Healer Agent

The healer keeps an existing suite green as the application changes. When a test fails because a locator no longer matches, or an assertion drifts, the healer re-runs the failing test, inspects the live page through MCP, identifies the correct current locator or expected value, and proposes a fix. This directly attacks the biggest ongoing cost of end-to-end testing: maintenance.

\`\`\`text
Use the Playwright healer agent to run tests/checkout.spec.ts, find the
failing step, inspect the live page, and repair the broken locator.
\`\`\`

The healer distinguishes between a genuine regression (the app is broken and the test correctly failed) and a stale test (the app changed intentionally and the test needs updating). For a stale test it updates the locator or assertion and shows you the diff for approval. For a real regression it reports the failure rather than masking it by rewriting the test to pass, which is exactly the behavior you want, a healer that hides real bugs is worse than no healer.

The table below maps each agent to its input, output, and the problem it solves.

| Agent | Input | Output | Problem solved |
|---|---|---|---|
| Planner | Running app plus intent | Markdown plan | Deciding what to test |
| Generator | Approved plan | TypeScript spec files | Writing the tests |
| Healer | Failing tests plus live app | Repaired locators and assertions | Maintaining the suite |

## How the MCP Server Connects Everything

The Playwright MCP server is the bridge between your AI client and a real browser. When \`init-agents\` runs, it registers this MCP server in your client's configuration. The server exposes tools such as navigate, snapshot the accessibility tree, click, type, and read network activity. The planner uses these tools to explore, the generator uses them to confirm locators, and the healer uses them to diagnose failures against the current page.

This is why the agents produce robust output: they observe the actual rendered application instead of inferring from source or screenshots alone. The accessibility snapshot in particular is what lets the generator prefer \`getByRole\` and \`getByLabel\` locators, which are the most stable across refactors. If you want a deeper look at how the MCP server itself works and how to wire it into agents, see our [Playwright MCP browser automation guide](/blog/playwright-mcp-browser-automation-guide). For the broader picture of how these agents fit a modern QA stack, our [Playwright test agents planner, generator, and healer overview](/blog/playwright-test-agents-planner-generator-healer-2026) walks through the same loop with additional examples.

## Connecting Claude Code, Copilot, and Cursor

Each client loads the agent definitions slightly differently, but the flow is the same: run \`init-agents\` with the right \`--loop\`, reload the client, then ask it to act as one of the three agents. In Claude Code the definitions become invokable agents and the MCP server appears in your MCP list. In VS Code with Copilot the definitions register as chat modes and the MCP server is added to your workspace config. In Cursor the definitions become rules the assistant follows and the MCP server is configured in Cursor's settings.

| Step | Claude Code | Copilot (VS Code) | Cursor |
|---|---|---|---|
| Install | \`init-agents --loop=claude\` | \`init-agents --loop=vscode\` | \`init-agents --loop=cursor\` |
| Reload | Restart Claude Code | Reload window | Restart Cursor |
| Invoke | Ask for the planner agent | Select the chat mode | Reference the rule |
| MCP status | Listed in MCP servers | In workspace MCP config | In Cursor settings |

The practical advice regardless of client: keep the three agents as separate invocations rather than asking one prompt to plan, generate, and heal at once. The separation gives you a review checkpoint between planning and generation, which is where most quality comes from.

## Regenerating Agents on Playwright Upgrades

Because the agent definitions encode Playwright's current best practices, they can drift out of date when you upgrade the framework. The fix is simple: re-run \`init-agents\` after upgrading Playwright to regenerate the definitions against the new version. Treat this like regenerating lockfiles, a routine step in your upgrade checklist.

\`\`\`bash
# After bumping @playwright/test
npm install -D @playwright/test@latest
npx playwright install
npx playwright init-agents --loop=claude
\`\`\`

Regenerating keeps the agents aware of any new locator recommendations, assertion APIs, or MCP tools that shipped with the update. Since the definitions are version-controlled files, the regeneration shows up as a reviewable diff, so you can see exactly what changed in the agents' guidance.

## Best Practices for an Agent-Authored Suite

Review the plan before generating and review the generated code before committing, the agents accelerate you but should not bypass human judgment. Keep the planner, generator, and healer as distinct steps so you retain checkpoints. Run generated tests locally before trusting them in CI, since a test that was never executed is not yet a test. Prefer the healer's proposed diffs over blind auto-repair, and always confirm a healed test failed because the app changed intentionally, not because a real regression slipped through. Build accessible markup, because role and label based locators, the ones these agents prefer, depend on it. Finally, commit the agent definitions and regenerate them on every Playwright upgrade so your team shares consistent, current behavior. For foundational patterns like fixtures and the Page Object Model that complement generated tests, our [complete Playwright end-to-end guide](/blog/playwright-e2e-complete-guide) is a useful companion.

## A Complete End-to-End Walkthrough

To see the full loop, imagine adding coverage for a new signup flow. You run the planner, review its plan, run the generator, then let the healer keep it green over time. The command-and-prompt sequence below shows the whole cycle in order.

\`\`\`bash
# 1. Ensure the agents and MCP server are installed for your client
npx playwright init-agents --loop=claude

# 2. Start your app so the planner and generator can explore it live
npm run dev  # serves http://localhost:3000
\`\`\`

Then, inside your AI client, drive the three roles as separate prompts so you keep a review checkpoint between each.

\`\`\`text
# Planner
Act as the Playwright planner. Explore the signup flow at
http://localhost:3000/signup and write signup.plan.md covering happy
path, duplicate email, and weak password validation.

# Generator (after you review and edit signup.plan.md)
Act as the Playwright generator. Convert signup.plan.md into
tests/signup.spec.ts using role-based locators and web-first assertions.

# Healer (when the flow later changes and a test fails)
Act as the Playwright healer. Run tests/signup.spec.ts, inspect the live
page, and repair the broken locator, showing me the diff.
\`\`\`

The discipline of three separate prompts is what produces quality. After the planner you correct scope in prose, after the generator you review real code, and the healer only ever touches tests that already exist and failed. Run the generated spec locally with \`npx playwright test tests/signup.spec.ts\` before committing so you never trust an unexecuted test.

## Comparing Agent-Authored Tests To Manual And Record-Playback

It helps to place these agents against the two older approaches: writing tests by hand, and record-and-playback codegen. Each has a place, but the agent workflow targets the weaknesses of both.

| Approach | Authoring speed | Locator quality | Maintenance | Human review |
|---|---|---|---|---|
| Hand-written | Slow | High (if disciplined) | High cost | Built in |
| Record and playback | Fast | Often brittle CSS | Very high cost | Minimal |
| Planner and generator agents | Fast | Role-based, robust | Low with healer | Plan plus code checkpoints |

Record-and-playback is quick but tends to capture brittle selectors and skips the planning step entirely, so you get tests without a clear idea of coverage. Hand-writing gives control but is slow. The agent workflow keeps the speed of automation while producing the robust role-based locators and explicit plan that manual discipline would give you, and the healer then attacks the maintenance cost that sinks most suites over time.

## Frequently Asked Questions

### What does npx playwright init-agents do?

It installs Playwright's official test agents into your project by writing versioned agent definition files and the Playwright MCP server configuration for your chosen AI client. You pass a \`--loop\` flag such as \`--loop=claude\`, \`--loop=vscode\`, or \`--loop=cursor\` to format the definitions for Claude Code, GitHub Copilot, or Cursor. After running it, reload your client so it loads the planner, generator, and healer agents.

### What is the difference between the planner, generator, and healer?

The planner explores your running app through MCP and writes a human-readable Markdown test plan describing scenarios. The generator turns an approved plan into real TypeScript Playwright spec files, confirming locators against the live page. The healer runs failing tests, inspects the current app, and repairs broken locators or drifted assertions. Together they cover deciding what to test, writing the tests, and maintaining them.

### Which AI clients work with Playwright test agents?

Playwright test agents support Claude Code, GitHub Copilot in VS Code, and Cursor. You select the target with the \`--loop\` flag when running \`init-agents\`, which formats the agent definitions and MCP configuration for that client. All three clients then load the same three agents and connect to the Playwright MCP server, giving consistent planner, generator, and healer behavior across editors.

### Do I need the Playwright MCP server for the agents?

Yes. The agents rely on the Playwright MCP server to interact with a real browser, navigate pages, snapshot the accessibility tree, and read the DOM. \`init-agents\` registers this MCP server automatically in your client configuration. This live grounding is what lets the planner explore accurately, the generator produce robust role-based locators, and the healer diagnose failures against the current running page rather than guessing.

### How do I keep the agents current when I upgrade Playwright?

Re-run \`npx playwright init-agents\` with your \`--loop\` flag after upgrading the \`@playwright/test\` package. The agent definitions encode Playwright's current best practices, so regenerating them keeps the agents aware of new locator recommendations, assertion APIs, and MCP tools. Because the definitions are version-controlled files, the regeneration appears as a reviewable diff, making it easy to see what guidance changed.

### Are the tests generated by the agents reliable?

They are reliable because the generator inspects the live application through MCP and prefers stable role-based and label-based locators plus web-first assertions, rather than guessing brittle CSS from source. That said, you should still review generated code and run it locally before committing. The agents accelerate authoring and cut maintenance, but human review at the plan and code checkpoints is what keeps the suite trustworthy.

### Can the healer hide real bugs by rewriting failing tests?

A well-behaved healer distinguishes a genuine regression from a stale test. When the application changed intentionally, it updates the locator or assertion and shows you a diff to approve. When the app is actually broken, it reports the failure instead of rewriting the test to pass. Always review the healer's proposed diffs and confirm that a healed test failed because of an intentional change, not a real defect.

### Where are the agent definition files stored?

They are written into your repository by \`init-agents\` in a location specific to your chosen client, and they are meant to be committed so the whole team shares identical agent behavior. Keeping them under version control makes the agents reviewable and diffable, and it means upgrading Playwright and regenerating the definitions produces a visible change set you can inspect before merging.

## Conclusion

Playwright's official test agents turn a fragmented, manual testing effort into a reviewable pipeline: the planner decides what to test in plain Markdown, the generator writes grounded TypeScript specs, and the healer keeps them passing as the app evolves. Because everything runs through the Playwright MCP server and lives in version-controlled definition files, the agents stay aligned with the framework's best practices and with your team. The workflow that gets the most value keeps the three roles separate, reviews the plan before generating and the code before committing, and regenerates the agents on every Playwright upgrade. Adopt it incrementally, start with one flow, watch the maintenance cost fall, then expand.

Want ready-made agent skills and testing playbooks for your AI coding assistant? Explore the [QA skills directory](/skills) to install curated Playwright, MCP, and test-agent skills that plug straight into Claude Code, Copilot, and Cursor.
`,
};
