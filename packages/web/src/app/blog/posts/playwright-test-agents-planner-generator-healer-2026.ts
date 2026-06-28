import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Test Agents 2026: Planner, Generator, Healer',
  description:
    'How Playwright test agents work in 2026 — the planner explores your app, the generator writes test code, the healer repairs broken locators. Full setup and config guide.',
  date: '2026-06-28',
  category: 'Guide',
  content: `
# Playwright Test Agents 2026: Planner, Generator, Healer

Playwright test agents are the 2026 evolution of automated end-to-end testing: instead of recording clicks or hand-writing every selector, you hand the work to three cooperating AI agents — a **planner**, a **generator**, and a **healer** — that drive a real browser through the Playwright MCP server. The planner explores your running app and writes a Markdown test plan. The generator turns that plan into real Playwright TypeScript. The healer re-runs failing tests and repairs broken locators and steps. Together they form a closed loop that takes you from "here is a feature" to "here is a green, maintained test suite" with you reviewing rather than typing.

This guide explains the Playwright planner generator healer loop in depth, shows the exact CLI setup (\`npx playwright init-agents\`), the seed spec and AGENTS.md configuration files, the MCP server JSON, and real runnable examples of every artifact. It also draws a sharp line between Playwright AI test agents in 2026 and the older record-and-replay codegen most teams still associate with Playwright. By the end you will understand not just what the three agents do, but how to wire them into Claude Code, Cursor, or GitHub Copilot and keep humans in the review seat.

If you are new to the broader space, our [AI test automation tools](/blog/ai-test-automation-tools-2026) roundup gives the landscape; this article zooms into Playwright's own first-party agentic workflow.

## What Are Playwright Test Agents?

Playwright test agents are not a new test runner. They are **configuration packages** that teach an existing AI coding agent — Claude Code, Cursor, Copilot, or VS Code's agent mode — how to do testing work the Playwright way. Each agent is a prompt-plus-tooling definition that ships as a Markdown instruction file (an \`AGENTS.md\`-style file, or \`.mdc\` rules for Cursor) together with access to the **Playwright MCP server**, which exposes the browser as structured tools the model can call.

The crucial idea is that the agents drive a **live browser**, not a static DOM dump. When the planner needs to know what is on a page, it does not guess from your source code; it navigates to the page through MCP, reads the accessibility tree, and bases its plan on what a user actually sees. When the generator writes a locator, it can verify that the locator resolves to exactly one element before committing it. When the healer fixes a test, it re-runs the test against the real app and confirms the fix actually passes.

Because the agents are configuration rather than a binary, you install them once per project and any compatible AI loop can use them. This is the same philosophy behind reusable QA skills — you can [browse QA skills](/skills) that encode team conventions the same way these agent files encode Playwright conventions.

## The Three Agents at a Glance

The whole system is three roles, each with a narrow job, a defined input, and a defined output. Keeping the roles separate is what makes the loop debuggable: if a test is wrong, you can tell whether the *plan* was wrong, the *generation* was wrong, or the *fix* was wrong.

| Agent | Input | Output | When it runs |
|---|---|---|---|
| **Planner** | A running app URL + a feature/area to cover | A Markdown test plan (\`specs/*.md\`) of scenarios and steps | First — when you want coverage for a new feature |
| **Generator** | A Markdown test plan + the seed/auth spec | Real Playwright \`*.spec.ts\` test files | After the plan is reviewed and approved |
| **Healer** | A failing test + the live app | A repaired test (fixed locators/steps) or a flagged real bug | After a test run fails, in CI or locally |

The planner is exploratory and produces human-readable prose. The generator is deterministic-ish and produces code. The healer is reactive and produces diffs. None of them silently overwrites the others' work without a checkpoint you can review.

## How the Planner Works

The planner is given a target — typically a URL of your running app plus a short instruction like "cover the checkout flow" — and it explores. Through the Playwright MCP server it navigates pages, opens menus, inspects forms, and reads the accessibility tree to understand what roles and labels exist. It then writes a structured Markdown plan describing each scenario as a sequence of human-level steps and expected outcomes.

A planner-produced plan is intentionally implementation-light. It talks about "the Sign in button" and "the cart total", not about CSS selectors. That keeps the plan reviewable by a QA lead or a PM who does not read TypeScript, and it keeps the plan stable even when the underlying markup changes.

Here is the kind of Markdown test plan the planner writes to \`specs/checkout.md\`:

\`\`\`markdown
# Test plan: Checkout flow

## Scenario: Guest can complete a purchase
1. Navigate to the home page.
2. Open the first product from the featured grid.
3. Click "Add to cart".
4. Open the cart drawer.
5. Click "Checkout".
6. Fill the shipping form with valid details.
7. Choose "Standard shipping".
8. Click "Place order".
- Expect: an order confirmation heading is visible.
- Expect: the confirmation shows an order number.

## Scenario: Empty cart blocks checkout
1. Navigate to the cart page with no items.
2. Expect: the "Checkout" button is disabled.
3. Expect: an "Your cart is empty" message is visible.

## Scenario: Invalid coupon shows an error
1. Add any product to the cart.
2. Open the cart drawer and expand "Apply coupon".
3. Enter "INVALID123" and click "Apply".
- Expect: an inline error "Coupon not found" is visible.
- Expect: the cart total is unchanged.
\`\`\`

Notice there is no code here. The plan is the contract between human intent and machine implementation. You review and edit this file before any test code exists — which is far cheaper than reviewing generated TypeScript you then have to mentally reverse-engineer.

## How the Generator Works

The generator reads an approved plan and writes real Playwright tests. It uses the live browser to discover the *actual* accessible roles and names so it can prefer resilient, user-facing locators — \`getByRole\`, \`getByLabel\`, \`getByText\` — over brittle CSS or XPath. Before it finalizes a locator, it can verify through MCP that the locator matches exactly one element, which eliminates a whole class of "selector resolved to 3 elements" flakiness.

The generator also wires in your project's setup: it imports your seed/auth fixtures, respects your \`baseURL\`, and follows whatever conventions your \`AGENTS.md\` declares (file naming, use of \`test.step\`, tag annotations). Here is a representative generated file, \`tests/checkout.spec.ts\`:

\`\`\`typescript
import { test, expect } from './fixtures';

test.describe('Checkout flow', () => {
  test('guest can complete a purchase', async ({ page }) => {
    await page.goto('/');

    await test.step('open first product', async () => {
      await page.getByRole('link', { name: /featured/i }).first().click();
      await page.getByRole('button', { name: 'Add to cart' }).click();
    });

    await test.step('go to checkout', async () => {
      await page.getByRole('button', { name: 'Cart' }).click();
      await page.getByRole('link', { name: 'Checkout' }).click();
    });

    await test.step('fill shipping details', async () => {
      await page.getByLabel('Full name').fill('Ada Lovelace');
      await page.getByLabel('Address').fill('12 Analytical Way');
      await page.getByLabel('City').fill('London');
      await page.getByLabel('Postcode').fill('EC1A 1BB');
      await page.getByRole('radio', { name: 'Standard shipping' }).check();
    });

    await page.getByRole('button', { name: 'Place order' }).click();

    const confirmation = page.getByRole('heading', { name: /order confirmed/i });
    await expect(confirmation).toBeVisible();
    await expect(page.getByText(/order #\\d+/i)).toBeVisible();
  });

  test('empty cart blocks checkout', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.getByRole('button', { name: 'Checkout' })).toBeDisabled();
    await expect(page.getByText('Your cart is empty')).toBeVisible();
  });
});
\`\`\`

The generator wrote \`getByRole\` and \`getByLabel\` calls grounded in what it observed, used \`test.step\` blocks that map one-to-one onto the plan's numbered steps, and added \`expect\` assertions for every "Expect" line in the plan. For deeper patterns on structuring these suites, our [Playwright E2E guide](/blog/playwright-e2e-complete-guide) covers page objects, fixtures, and parallelization.

## How the Healer Works

The healer is the agent that makes the loop sustainable. Tests rot: a button gets renamed, a label changes, a flow gains an extra confirmation step, and yesterday's green suite goes red. Traditionally a human triages each failure, figures out whether it is a real bug or a stale locator, and patches the test. The healer automates the triage-and-patch part.

When a test fails, the healer re-runs it against the live app, inspects the error (a timeout on a locator, a failed assertion, an unexpected navigation), and reasons about the current state of the page through MCP. If the page now exposes "Proceed to payment" where the test looked for "Checkout", the healer updates the locator and re-runs to confirm green. If the assertion fails because the app genuinely changed behavior, the healer does **not** silently rewrite the assertion — it flags the failure as a likely real regression for a human to judge.

A typical healer run looks like this:

\`\`\`bash
# A scheduled or post-deploy run fails:
npx playwright test tests/checkout.spec.ts
#   1) checkout.spec.ts:6 › guest can complete a purchase
#      TimeoutError: getByRole('link', { name: 'Checkout' }) not found

# Invoke the healer loop on the failing file:
npx playwright heal tests/checkout.spec.ts

# The healer:
#   - re-runs the test under MCP control
#   - sees the link is now labelled "Proceed to checkout"
#   - rewrites the locator, re-runs, confirms green
#   - emits a diff for review
\`\`\`

The healer's output is a reviewable diff, not a force-push. You keep the discipline that a human approves every change to the suite, while offloading the tedious detective work. This is the same self-healing philosophy covered in our [AI test maintenance strategies](/blog/ai-test-automation-tools-2026) discussion, applied as a first-party Playwright capability. If you want the distinction between healing genuine flakiness and masking real bugs, that nuance is the single most important review skill once healing is in your pipeline.

## The Closed Loop: How the Three Agents Fit Together

The agents are powerful individually but transformative together because they form a loop with human checkpoints at each handoff:

1. **Plan** — the planner explores the app and proposes \`specs/feature.md\`. *You review the plan.*
2. **Generate** — the generator converts the approved plan into \`tests/feature.spec.ts\`. *You review the code and run it once.*
3. **Heal** — on any future failure (CI, nightly, post-deploy), the healer repairs the test or flags a real bug. *You review the diff.*

The loop is restartable at any point. If requirements change, you re-run the planner for just that feature, regenerate, and let the healer keep the rest of the suite alive. Because every step produces a reviewable artifact — a Markdown plan, a code diff, a heal diff — the workflow stays auditable. That auditability is exactly what makes agentic testing acceptable in regulated and high-stakes codebases, where "the AI changed the tests and I do not know why" is a non-starter.

## Setting Up Playwright Test Agents

Setup is a single CLI command plus a couple of configuration files. You need Playwright 1.59 or newer (the era these agents shipped in) and a compatible AI coding agent installed.

First, initialize the agents for your chosen loop. The \`--loop\` flag tells Playwright which AI agent's file format to emit:

\`\`\`bash
# Install/upgrade Playwright first
npm install -D @playwright/test@latest
npx playwright install chromium

# Generate the agent definition files for Claude Code
npx playwright init-agents --loop=claude

# Or for Cursor / Copilot / VS Code:
# npx playwright init-agents --loop=cursor
# npx playwright init-agents --loop=copilot
# npx playwright init-agents --loop=vscode
\`\`\`

This scaffolds the agent instruction files (an \`AGENTS.md\` or the loop's equivalent), wires up the Playwright MCP server, and drops in a seed spec you will customize next. For a Claude-Code-specific walkthrough including its slash-command ergonomics, see [Playwright test agents in Claude Code](/blog/playwright-test-agents-claude-code).

## The Seed Spec and Authentication

The agents need a known starting state. The **seed spec** — conventionally \`tests/seed.spec.ts\` — is where you give the planner and generator a logged-in, primed context so they do not waste exploration on sign-in flows or re-derive your auth dance every run. It also stores authenticated state to a file the other tests reuse.

\`\`\`typescript
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for a post-login signal, then persist storage state.
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
\`\`\`

You then reference this in \`playwright.config.ts\` as a setup project so authenticated tests depend on it:

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://localhost:3000' },
  projects: [
    { name: 'setup', testMatch: /seed\\.spec\\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});
\`\`\`

With this in place, the planner explores as a logged-in user and the generator writes tests that start from an authenticated state — no brittle login steps repeated in every spec.

## The AGENTS.md Configuration File

The \`AGENTS.md\` file (or \`.cursor/rules/*.mdc\` for Cursor) is where you encode your team's conventions so every generated test looks like a human on your team wrote it. This is the highest-leverage file in the whole setup — small edits here change the style of hundreds of future tests.

\`\`\`markdown
# Playwright test agents — project conventions

## Project facts
- App runs at http://localhost:3000 (set via baseURL in playwright.config.ts).
- Auth is handled by the \`setup\` project; assume a logged-in user.
- Tests live in \`tests/\`, plans live in \`specs/\`.

## Locator rules
- Prefer getByRole, getByLabel, getByText. Never use CSS or XPath
  unless no accessible name exists.
- Every locator must resolve to exactly one element. Verify before committing.

## Test structure
- One \`test.describe\` per feature, named after the plan file.
- Wrap each numbered plan step in a \`test.step\`.
- Every "Expect:" line in the plan becomes an \`expect\` assertion.
- No hard waits (\`waitForTimeout\`). Rely on web-first assertions.

## Healing rules
- When healing, re-run against the live app to confirm green before emitting a diff.
- If an assertion's intent changed (not just a locator), flag it as a possible
  real bug instead of rewriting the assertion.
\`\`\`

The MCP server itself is registered so the agent can drive the browser. For Claude Code, the \`.mcp.json\` (or equivalent) entry looks like this:

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

If you are wiring MCP across a whole QA team, our [MCP for QA engineers](/blog/mcp-for-qa-engineers-guide) guide covers server configuration, security, and the tool surface in depth.

## Test Agents vs Traditional Codegen vs Manual

It is easy to confuse the new agents with Playwright's long-standing \`codegen\` recorder. They solve overlapping problems very differently. Codegen records your clicks into a script — it is record-and-replay. The agents reason about intent, explore autonomously, and maintain tests over time.

| Approach | How tests are created | Maintenance | Locator quality | Handles new features |
|---|---|---|---|---|
| **Test agents** | Planner explores, generator writes, healer maintains | Healer auto-repairs, human approves | Role/label-first, verified live | Re-run planner for the feature |
| **Traditional codegen** | You click through; recorder emits a script | Manual — you re-record or hand-edit | Whatever the recorder guessed | Re-record the whole flow |
| **Fully manual** | Engineer hand-writes every spec | Manual, slowest | As good as the author | Engineer writes from scratch |

Codegen still has a place for one-off captures and learning the API. But it produces a snapshot frozen at record time, with no notion of intent and no maintenance story. The agents produce a living plan, grounded code, and a healing loop. The difference compounds: a 200-test codegen suite is a maintenance liability, while a 200-test agent suite is a self-repairing asset with a human approving diffs.

## Supported AI Loops

The same Playwright agent definitions work across the major AI coding tools, because \`init-agents\` emits the right file format for each. You choose your loop with the \`--loop\` flag and the rest of the workflow is identical.

| AI loop | \`--loop\` value | Config file emitted | Notes |
|---|---|---|---|
| **Claude Code** | \`claude\` | \`AGENTS.md\` + \`.mcp.json\` | First-class slash-command and subagent ergonomics |
| **Cursor** | \`cursor\` | \`.cursor/rules/*.mdc\` | Rules drive the in-editor agent; MCP via Cursor settings |
| **GitHub Copilot** | \`copilot\` | \`.github/\` instructions | Works in Copilot agent mode in VS Code |
| **VS Code agent** | \`vscode\` | \`.vscode/\` config | Native VS Code agent mode with MCP |

Because the artifacts the agents produce — plans, specs, heal diffs — are plain files in your repo, you are not locked to one tool. A team can run the planner in Claude Code, review the plan, and let a teammate using Cursor run the generator. The portability is a direct consequence of the configuration-not-binary design.

## CI Integration and Guardrails

In CI you typically run the generated suite normally and reserve the healer for a controlled job. A common pattern: tests run on every PR; on failure in a nightly or post-deploy job, a healer step proposes fixes as a separate PR that a human reviews. You never let the healer push directly to main.

\`\`\`bash
# PR pipeline — just run the suite, no healing.
npx playwright test --reporter=html

# Nightly self-heal job — propose repairs, never auto-merge.
npx playwright test || npx playwright heal --report=heal-report.json
# Then open a PR from the heal diffs for human review.
\`\`\`

The guardrails matter. The whole value proposition of agentic testing rests on humans approving every change, so configure your branch protection to require review on any agent-authored PR. Treat the healer's flagged "possible real bug" outputs as the highest-signal alerts in your pipeline — those are the moments the loop caught a genuine regression instead of papering over it.

## Conclusion

Playwright test agents turn end-to-end testing from a typing job into a reviewing job. The planner explores your live app and proposes a readable Markdown test plan; the generator converts the approved plan into grounded, role-based Playwright code; the healer keeps that code green by repairing stale locators and flagging real regressions. Wired through the Playwright MCP server into Claude Code, Cursor, or Copilot, the three agents form an auditable loop where humans approve every artifact and the machine does the tedious exploration and maintenance.

Start small: run \`npx playwright init-agents\`, point the planner at one feature, review the plan, generate, and let the healer prove itself on a single flaky spec before you scale. Once you trust the loop, it becomes the cheapest way to grow and maintain coverage you have ever had.

Ready to encode your own team's testing conventions the same way these agent files do? [Browse QA skills](/skills) to find reusable, version-controlled skill definitions for Playwright, MCP, and AI-driven testing that drop straight into Claude Code, Cursor, and Copilot.

## Frequently Asked Questions

### What are Playwright test agents?

Playwright test agents are configuration packages that teach an AI coding agent such as Claude Code, Cursor, or Copilot to do testing the Playwright way. They ship as instruction files plus access to the Playwright MCP server, which exposes a live browser as callable tools. There are three roles: a planner that explores your app, a generator that writes test code, and a healer that maintains it.

### What is the Playwright healer agent?

The healer agent re-runs failing tests against your live application, diagnoses why they failed, and repairs broken locators or steps. If a button was renamed, it updates the locator and confirms the test passes again. Crucially, when an assertion fails because the app genuinely changed behavior, the healer flags it as a likely real bug for a human to judge rather than silently rewriting the test.

### How does the planner differ from codegen?

Codegen records your clicks into a frozen script with no notion of intent or maintenance. The planner instead explores your running app through the MCP browser, reasons about what a user sees, and writes a readable Markdown test plan describing scenarios and expected outcomes. The plan is implementation-light and reviewable by non-coders, and it stays stable even when the underlying markup changes.

### Do Playwright test agents replace QA engineers?

No. The agents shift QA engineers from typing tests to reviewing them. Every step produces an artifact a human approves: the planner's Markdown plan, the generator's code, and the healer's diff. Engineers still decide what to cover, judge whether a healer flag is a real regression, and own the conventions encoded in the configuration files. The work moves up the value chain rather than disappearing.

### How do I set up Playwright agents with Claude Code?

Install the latest Playwright, then run the init command with the Claude loop selected. This scaffolds an AGENTS.md conventions file, registers the Playwright MCP server, and adds a seed spec for authentication. You then customize the seed spec with your login flow and edit AGENTS.md with your locator and structure rules. From there you invoke the planner on a feature, review, and generate.

### What Playwright version do I need for test agents?

You need a recent Playwright release from the 1.59 era or newer, since the agentic workflow and the init-agents command shipped in that generation. Keep both the @playwright/test package and the @playwright/mcp server on their latest versions, because the agents rely on current MCP tooling to read the accessibility tree and verify locators against the live browser.

### Can I use test agents with Cursor or Copilot instead of Claude?

Yes. The init command emits the correct configuration format for each loop using the loop flag, so Cursor gets mdc rules, Copilot gets instruction files, and VS Code gets its native agent config. Because the plans, specs, and heal diffs are plain files committed to your repository, the workflow is portable and a team can mix tools without lock-in.

### How do test agents keep tests from being flaky?

The generator grounds every locator in the live accessibility tree and verifies it resolves to exactly one element before committing it, which eliminates ambiguous-selector flakiness. The conventions file forbids hard waits in favor of web-first assertions that auto-retry. When tests still drift due to app changes, the healer re-runs against the real app and repairs the locator, confirming green before proposing a reviewable diff.
`,
};
