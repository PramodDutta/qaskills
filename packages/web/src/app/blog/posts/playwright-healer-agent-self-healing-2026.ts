import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Healer Agent: Self-Healing Tests Guide (2026)',
  description:
    'How the Playwright Healer agent fixes broken tests using accessibility-tree snapshots and role-based locators. Setup, a worked example, CI, and limits.',
  date: '2026-06-22',
  category: 'Guide',
  content: `
# Playwright Healer Agent: Self-Healing Tests Guide (2026)

For most teams, the single biggest cost of end-to-end testing is not writing tests -- it is keeping them green. A button gets a new class name, a developer renames a \`data-testid\`, a vendor widget swaps its DOM structure, and suddenly a dozen tests fail with \`TimeoutError: locator.click: Timeout 30000ms exceeded\`. The test logic is still correct; only the selector is stale. In 2026, Playwright ships a native answer to this problem: the **Healer agent**, one of three built-in AI agents (Planner, Generator, Healer) that turn Playwright into an agentic testing framework.

This guide explains what the Playwright Healer agent is, how it works under the hood with accessibility-tree snapshots and role-based locators, how to set it up, and -- most importantly -- where its limits are. Self-healing is powerful, but it is not magic. Microsoft's own benchmarks put the Healer at roughly **75%+ success on selector-related failures**, not 100%, and the realistic win is maintenance time saved rather than fully autonomous test writing. We will keep that framing honest throughout.

## What Is the Playwright Healer Agent

The Healer agent is an AI-driven test-repair component built into Playwright's agents toolchain. It is one of three native agents introduced as part of Playwright's shift toward agentic testing:

- **Planner** explores your application and produces a Markdown test plan.
- **Generator** converts that plan into TypeScript test files.
- **Healer** diagnoses failing tests at runtime and patches them automatically.

The Healer's job is narrow and well-defined: when a test fails because an element could not be found or interacted with, the Healer steps in, figures out what the test was *trying* to do, finds the element as it exists *now*, rewrites the interaction using a stable role-based locator, and re-runs the test to confirm the fix. If the re-run passes, the heal is a candidate fix you can review and commit. If it fails, the Healer reports the failure like any normal test run.

Crucially, the agents themselves are **free**. They are part of the open-source framework. You only pay for the **LLM tokens** consumed when the agent reasons about a failure -- and only when a failure actually occurs. There is no per-seat license and no vendor lock-in to a proprietary cloud grid.

> Key mental model: the Healer does not "watch your DOM for drift" continuously. It reacts to a real test failure, reasons about the current page state, and proposes a corrected locator. It is a repair loop, not a background daemon.

## How the Healer Agent Works

Understanding the mechanism is what separates teams that trust self-healing from teams that get burned by it. The Healer's repair loop has four conceptual stages.

### 1. Failure detection in real time

The Healer monitors test runs. When a step fails -- typically a locator timeout, a "strict mode violation: resolved to N elements," or an element-not-actionable error -- the Healer captures the failure context: the failing line, the intended action, and the page at the moment of failure.

### 2. Accessibility-tree analysis

Instead of staring at raw HTML (which is noisy, deeply nested, and full of styling cruft), the Healer analyzes an **accessibility-tree snapshot** of the page. The accessibility tree is the same semantic model screen readers use: it exposes each element's **role** (button, link, textbox, checkbox), its **accessible name** (the visible label or \`aria-label\`), and its state (checked, disabled, expanded).

This is the secret to why the Healer is reasonably robust. A class name like \`.btn-primary-v2-final\` is an implementation detail that changes constantly. But the *role* "button" with the *name* "Add to cart" is the element's contract with the user -- it changes far less often, because if it changed, the feature itself would be broken for humans.

### 3. Root-cause identification and role-based relocation

The Healer compares what the test expected to find against what the accessibility tree actually contains. It identifies the most likely intended element and generates a corrected interaction using a **role-based locator** -- Playwright's recommended, resilient locator style:

\`\`\`ts
// Brittle original (what broke)
await page.locator('#checkout-btn-2024').click();

// Healed replacement (role-based, resilient)
await page.getByRole('button', { name: 'Proceed to checkout' }).click();
\`\`\`

Role-based locators (\`getByRole\`, \`getByLabel\`, \`getByText\`) are preferred precisely because they survive CSS refactors and DOM restructuring. The Healer is, in effect, nudging your suite toward Playwright's own best practices every time it heals.

### 4. Automatic re-run and verification

After generating the corrected locator, the Healer **re-runs the test**. A heal is only considered successful if the re-run passes. This verification step is what keeps the Healer from blindly substituting a wrong element -- if its first guess does not make the test pass, the test still fails and you are notified.

## The Three Playwright AI Agents at a Glance

The Healer is most useful when you understand where it sits in the pipeline. Here is the full reference of the three native agents.

| Agent | What it does | Input | Output | Runs when |
|---|---|---|---|---|
| Planner | Explores the app, catalogs flows, drafts scenarios | A high-level goal ("test checkout") + live app | Markdown test plan | Authoring a new suite |
| Generator | Converts a plan into executable test code | Markdown test plan | TypeScript Playwright test files | After planning |
| Healer | Diagnoses and patches failing tests | A failing test + live page state | Corrected role-based locator + re-run | On test failure |

If you want a deeper walkthrough of the whole pipeline, see our companion guide on [Playwright test agents with Claude Code](/blog/playwright-test-agents-claude-code) and the broader [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide).

## Setting Up the Healer Agent

The Healer is configured through the Playwright agents toolchain, which connects Playwright to an LLM (for example, Claude) via the Model Context Protocol (MCP). The high-level setup is the same regardless of which MCP-capable client you drive it from.

### Step 1: Install Playwright and the MCP server

\`\`\`bash
# Install Playwright if you have not already
npm init playwright@latest

# Add the Playwright MCP server (the bridge the agents speak through)
npm install -D @playwright/mcp
\`\`\`

### Step 2: Register the Playwright MCP server with your AI client

For an MCP-capable agent client such as Claude Code, you register the Playwright MCP server in your client config. A typical \`.mcp.json\` (or equivalent) entry looks like this:

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

This gives the agent the browser-control and accessibility-snapshot tools it needs to inspect the live page during a heal. If MCP is new to you, our [MCP for QA engineers](/blog/mcp-for-qa-engineers-guide) guide explains the protocol from first principles.

### Step 3: Configure the healing behavior in playwright.config.ts

You control where traces and snapshots come from so the Healer has the context it needs. Enabling tracing and the accessibility snapshot is the practical prerequisite for good heals:

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Capture a trace on failure so the agent can inspect what happened
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Give the agent a stable, headed-or-headless target it can re-run against
  retries: process.env.CI ? 1 : 0,
});
\`\`\`

### Step 4: Invoke the Healer on a failing test

With the MCP server connected, you ask your AI client to heal a failing test. In practice you point the agent at the failing spec and let it run its loop. Conceptually the instruction is:

\`\`\`text
Run the failing test tests/checkout.spec.ts.
When it fails, use the Playwright Healer to inspect the current page,
identify the correct element by role and accessible name,
patch the locator, and re-run until it passes.
Show me the diff before committing.
\`\`\`

## A Worked Example: Watching a Test Get Healed

Let's make this concrete. Suppose your team ships a redesign of the checkout page. The "Place order" button used to have \`id="placeOrder"\`; the new design dropped the id and changed the label to "Complete purchase."

Here is the original test:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('user can complete checkout', async ({ page }) => {
  await page.goto('https://shop.example.com/cart');
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByLabel('Card number').fill('4242 4242 4242 4242');
  await page.getByLabel('Expiry').fill('12/29');
  await page.getByLabel('CVC').fill('123');

  // This line breaks after the redesign
  await page.locator('#placeOrder').click();

  await expect(page.getByText('Order confirmed')).toBeVisible();
});
\`\`\`

After the redesign, the run fails:

\`\`\`text
1) checkout.spec.ts:13 -> user can complete checkout
   TimeoutError: locator.click: Timeout 30000ms exceeded.
   Call log:
     - waiting for locator('#placeOrder')
\`\`\`

The Healer engages. It snapshots the accessibility tree of the checkout page and finds a button with role \`button\` and accessible name "Complete purchase" sitting exactly where the old button used to be, with the same surrounding form context. It concludes this is the intended element, rewrites the line, and re-runs:

\`\`\`ts
// Healed line
await page.getByRole('button', { name: 'Complete purchase' }).click();
\`\`\`

The re-run passes, \`Order confirmed\` appears, and the Healer surfaces this as a proposed diff:

\`\`\`diff
-  await page.locator('#placeOrder').click();
+  await page.getByRole('button', { name: 'Complete purchase' }).click();
\`\`\`

You review the diff in a pull request, confirm the new label is intentional, and merge. The maintenance work that would have taken a manual selector hunt -- open the page, dig through DevTools, find the new id, update the test, re-run locally -- collapsed into a one-line diff to approve.

## Limitations You Must Plan Around

This is the section that keeps you out of trouble. Self-healing earns its keep only when you respect its boundaries.

- **It is roughly 75%, not 100%.** Microsoft's benchmarks cite ~75%+ success on selector-related failures. The remaining quarter still needs a human. Treat the Healer as a force multiplier, not an autopilot.
- **It is non-deterministic.** Because the Healer reasons with an LLM, the same failure can occasionally produce different proposals. Always pin the heal as a reviewable diff rather than letting it auto-commit silently.
- **It can heal toward the wrong element.** If two buttons share a similar accessible name, the Healer might pick the wrong one. The re-run check catches many cases, but a heal that passes the wrong assertion is the dangerous failure mode. Review healed diffs in PRs -- this is non-negotiable.
- **It cannot fix genuine bugs.** If the test fails because the *feature* is broken (the order really does not confirm), the Healer should not "fix" the test -- and a good review process must distinguish a stale-selector failure from a real regression. Auto-healing a test that exposes a real bug hides the bug.
- **It depends on good accessibility semantics.** Pages with poor a11y (icon-only buttons with no labels, divs acting as buttons) give the Healer little to anchor on. Improving accessibility improves healability -- a happy side effect.

For teams comparing this native approach against the broader category, our [self-healing test automation](/blog/self-healing-test-automation-guide) overview puts the Healer in context with other strategies.

## Healer vs Manual Fixing vs Vendor Self-Healing

Self-healing existed before Playwright shipped the Healer -- commercial tools have marketed it for years. Here is how the native Healer compares.

| Dimension | Playwright Healer | Manual selector fixing | Vendor self-healing tool |
|---|---|---|---|
| Cost | Free agent, pay LLM tokens per heal | Engineer time | Per-seat / per-run license |
| Locator style | Role-based (Playwright best practice) | Whatever the engineer writes | Often proprietary / opaque |
| Transparency | Open diff you review in PR | Fully visible | Often a black box |
| Lock-in | None (open framework + MCP) | None | High (proprietary runner) |
| Success rate | ~75%+ on selector failures | ~100% but slow | Vendor-claimed, varies |
| Best for | Cutting maintenance time | Edge cases the agent misses | Teams wanting fully managed |

The honest takeaway: the native Healer gives you most of the maintenance savings of a commercial tool, with full transparency and no lock-in, at the price of LLM tokens. If you are weighing this strategically, [autonomous testing build vs buy](/blog/autonomous-testing-agents-build-vs-buy) digs into the trade-offs.

## Integrating the Healer into CI

In CI, you almost never want the Healer to silently rewrite tests on the main branch. The safe pattern is **heal-and-propose, not heal-and-commit**.

A common workflow runs healing as a separate, gated job that opens a pull request with proposed fixes rather than mutating the suite inline:

\`\`\`yaml
name: e2e-with-healing
on: [pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps

      # Normal test run -- this is the source of truth
      - name: Run E2E tests
        run: npx playwright test

      # Optional: on failure, run the heal step that emits proposed diffs
      - name: Propose heals on failure
        if: failure()
        run: npm run heal:propose
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
\`\`\`

The \`heal:propose\` script drives the Healer, collects the corrected locators, and writes them to a branch or PR comment for human review. The golden rules for CI:

1. The unhealed run is the gate. A green build means tests pass *without* a heal.
2. Heals are proposals. They land via PR, reviewed by a human, never auto-merged.
3. Token spend is bounded. Healing runs only \`if: failure()\`, so you pay only when something actually broke.

## The Cost Model: What You Actually Pay For

Because the agents are free, your only cost is LLM tokens, and only on failures. A useful way to reason about it:

| Scenario | Token cost | Why |
|---|---|---|
| All tests pass | Zero | Healer never engages |
| One selector breaks | One small reasoning call | Single accessibility-tree analysis + re-run |
| Major redesign, 30 broken selectors | Moderate, batched | One reasoning pass per failing locator |
| Real feature bug | Wasted if you let it run | Healer cannot fix logic -- gate first |

In practice, healthy suites spend almost nothing on healing month to month; spend spikes briefly after a redesign, exactly when manual maintenance would have spiked too -- except now it is minutes of review instead of hours of selector archaeology. Industry reports put selector-maintenance reduction at **85-95%** when self-healing is used well, which lines up with the experience of teams that gate properly.

## Best Practices for Trustworthy Healing

- **Write role-based locators from day one.** The Healer prefers them and your tests heal better when they already speak the same language.
- **Invest in accessibility.** Labeled buttons and form controls are not just an a11y win; they are what makes the accessibility tree -- and therefore the Healer -- accurate.
- **Always review heals in PRs.** Make "healed diff" a labeled, reviewed change. Never let the bot push to main.
- **Distinguish stale selectors from real bugs.** Train reviewers to ask: did the feature change, or did it break? Only the former should be healed.
- **Keep the unhealed run as the CI gate.** Healing augments your pipeline; it does not replace the assertion that tests pass on their own.
- **Layer expert patterns on top.** Curated [/skills](/skills) for Playwright give your agents stronger conventions to heal toward.

## Frequently Asked Questions

### What is the Playwright Healer agent?

The Healer is one of three native Playwright AI agents (alongside Planner and Generator). It monitors test runs, and when a test fails on a stale or broken locator it analyzes the page via an accessibility-tree snapshot, identifies the intended element, rewrites the interaction using a role-based locator, and re-runs the test to confirm the fix before proposing it for review.

### How does Playwright self-healing actually work in 2026?

When a step fails, the Healer captures the failure context and reads the page's accessibility tree -- the semantic model of roles and accessible names. It matches the test's intent against the current elements, generates a corrected role-based locator such as \`getByRole('button', { name: '...' })\`, and re-runs the test. A heal counts only if the re-run passes, then it is surfaced as a diff.

### Is the Playwright Healer agent free to use?

The agents themselves are free and part of the open-source framework. You pay only for the LLM tokens consumed when the Healer reasons about a failure, and only when a failure occurs. There is no per-seat license or proprietary cloud grid, so passing suites cost nothing and token spend tracks the rate of broken selectors.

### How accurate is the Playwright Healer agent?

Microsoft's benchmarks cite roughly 75%+ success on selector-related failures. That means about one in four failures still needs a human. The Healer is best treated as a maintenance accelerator rather than a fully autonomous system, and you should always review its proposed fixes in a pull request before merging them.

### Can the Healer agent fix real application bugs?

No. The Healer repairs stale or broken locators, not broken features. If a test fails because the application logic is actually wrong, the Healer should not rewrite the test to pass -- doing so would hide a genuine regression. This is why you must gate CI on the unhealed run and distinguish stale selectors from real bugs during review.

### Should I let the Healer auto-commit fixes in CI?

No. The recommended pattern is heal-and-propose, not heal-and-commit. Run healing only on failure, collect the corrected locators, and open a pull request or PR comment for a human to review and merge. Because LLM reasoning is non-deterministic, an unreviewed auto-commit can substitute the wrong element and silently pass an incorrect assertion.

### How much test maintenance does self-healing actually save?

Industry reports put selector-maintenance reduction at roughly 85-95% when self-healing is used well with proper gating. The savings concentrate around redesigns, where a redesign that once meant hours of manual selector hunting becomes minutes of reviewing one-line proposed diffs. Routine months see almost no healing activity at all.

### What do I need to set up the Healer agent?

You need Playwright installed, the Playwright MCP server (\`@playwright/mcp\`) registered with an MCP-capable AI client such as Claude Code, an LLM API key, and tracing or snapshots enabled in \`playwright.config.ts\` so the agent has page context. From there you point the agent at a failing spec and let its inspect-patch-rerun loop run.

## Conclusion

The Playwright Healer agent is the most practical piece of the self-healing story in 2026: a free, transparent, role-based repair loop that cuts selector maintenance dramatically without locking you into a vendor. The catch is discipline -- gate CI on the unhealed run, treat heals as reviewable proposals, and never let the bot paper over a real bug. Do that, and you reclaim hours every redesign while keeping your suite trustworthy.

Ready to give your agents stronger conventions to heal toward? Browse curated Playwright and QA skills at [/skills](/skills) and plug expert testing patterns straight into your agentic workflow.
`,
};
