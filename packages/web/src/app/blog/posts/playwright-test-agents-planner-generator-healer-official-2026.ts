import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Test Agents 2026: Planner, Generator, Healer',
  description:
    'Playwright test agents reference: the planner explores your app, the generator writes spec files, the healer auto-repairs flaky tests on CI via MCP and Claude.',
  date: '2026-06-11',
  category: 'Reference',
  content: `
# Playwright Test Agents 2026: Planner, Generator, Healer

Playwright test agents are the framework's AI-native workflow for going from a running web app to a maintained, green test suite without hand-writing every spec. Instead of one monolithic "generate my tests" button, Playwright splits the job across three cooperating agents that map cleanly to the real lifecycle of a test suite: a **planner** that explores the live site and produces a human-readable test plan, a **generator** that turns each plan step into runnable spec files, and a **healer** that re-runs failing or flaky tests on CI and repairs broken locators automatically. Each agent is a focused role with its own prompt, its own context, and its own output artifact, which makes the whole pipeline auditable instead of a black box.

The agents are driven through the Model Context Protocol (MCP). The \`@playwright/test\` package ships an MCP server that exposes the browser, the test runner, and the project's existing specs as tools, and an AI coding agent — Claude Code, Cursor, or any MCP-capable client — calls those tools to drive a real Chromium instance, read the accessibility tree, run \`npx playwright test\`, and rewrite files on disk. Because the agent acts through the same APIs you use by hand, everything it produces is ordinary Playwright TypeScript you can read, edit, and commit. There is no proprietary recording format and no lock-in.

This reference covers the planner/generator/healer loop end to end: how to install and seed the agents with a \`seed.spec.ts\` fixture, how each agent is invoked, the MCP wiring for Claude and Cursor, real runnable config and spec code, how the healer re-locates broken selectors, how snapshot updates fit in with \`npx playwright test --update-snapshots\`, and how to run the whole thing in CI. If you searched for "playwright test agents planner generator healer," this page is built to be the complete answer. For the locator fundamentals the agents rely on, keep the [Playwright locators and web-first assertions guide](/blog/playwright-locator-best-practices-web-first-assertions-2026) open in another tab.

## What the Three Agents Do

The mental model is a relay. The planner runs first and produces a Markdown plan. The generator consumes that plan and produces \`.spec.ts\` files. The healer runs last — on every CI failure — and produces patched spec files plus a short report of what it changed and why. Each stage hands a concrete artifact to the next, so you can inspect or edit the output between stages instead of trusting one opaque step.

| Agent | Input | Output artifact | When it runs | Primary tool calls |
|---|---|---|---|---|
| Planner | Live URL + goal | \`specs/plan.md\` test plan | Once per feature, on demand | browser navigate, snapshot, read a11y tree |
| Generator | \`plan.md\` + page state | \`tests/*.spec.ts\` files | After planning, on demand | browser interact, run test, write file |
| Healer | Failing test + trace | Patched \`*.spec.ts\` + report | Automatically on CI failure | run test, read trace, re-locate, write file |

The division matters because the failure modes differ. Planning failures are about coverage ("you missed the password-reset flow"). Generation failures are about correctness ("this assertion is too loose"). Healing failures are about drift ("the Submit button moved and the old selector is dead"). Keeping them separate lets you fix the right thing in the right place.

A key design decision: agents never invent locators from imagination. The planner and generator read the **accessibility tree** of the real page through the MCP browser tools, so the selectors they emit are grounded in what is actually rendered — \`getByRole\`, \`getByLabel\`, \`getByText\` — not guessed CSS that breaks on the next deploy.

## Installing and Configuring the Agents

The agents ship with the test runner. Make sure you are on a current \`@playwright/test\` and that the browsers are installed.

\`\`\`bash
# Install the test runner and the browsers it drives
npm init playwright@latest

# Or add to an existing project
npm install -D @playwright/test
npx playwright install --with-deps chromium
\`\`\`

Your \`playwright.config.ts\` does not need anything special for the agents to function, but the agents read it to learn your \`baseURL\`, \`testDir\`, and projects. A clean config makes the generated specs cleaner because the agent inherits sensible defaults.

\`\`\`ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
\`\`\`

The \`trace: 'on-first-retry'\` line is load-bearing for the healer: when a test fails and retries, Playwright records a trace, and the healer reads that trace to understand exactly which action failed and what the DOM looked like at that moment.

## The seed.spec.ts Fixture

The agents work best when they have a starting point that shows your project conventions — how you log in, what fixtures you use, how you name things. That starting point is conventionally a \`seed.spec.ts\` file. It is a tiny, real, passing test that the generator reads as a style template before it writes anything new. Think of it as a few-shot example baked into the repo.

\`\`\`ts
// tests/seed.spec.ts
import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test('home page loads and shows the primary nav', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });
});
\`\`\`

When the generator later writes a checkout test, it mirrors this file's imports, its use of \`test.describe\`, its preference for role-based locators, and its web-first \`expect(...).toBeVisible()\` assertions. If your seed file uses a custom fixture for authentication, every generated spec will reach for that same fixture instead of re-implementing login. The seed file is the cheapest, highest-leverage way to control output quality.

## The Planner Agent

The planner is invoked through your MCP client with a goal and a URL. It opens a real browser, navigates, reads the accessibility snapshot, clicks through the obvious affordances, and writes a structured plan. It does not write any \`.spec.ts\` code — its only job is to decide *what* to test.

A typical planner prompt to Claude Code looks like this:

\`\`\`text
Use the Playwright planner agent. Explore http://localhost:3000, focus on the
checkout flow, and write a test plan to specs/plan.md covering the happy path,
an empty-cart edge case, and an invalid-coupon error case.
\`\`\`

The artifact it produces is plain Markdown, so you can review and edit it before generation:

\`\`\`md
# Test plan: Checkout

## Scenario: Happy path purchase
1. Navigate to /products
2. Add "Wireless Mouse" to cart
3. Open cart, verify line item and subtotal
4. Proceed to checkout, fill shipping + payment
5. Submit and assert order-confirmation heading is visible

## Scenario: Empty cart guard
1. Navigate to /checkout directly with an empty cart
2. Assert a "Your cart is empty" message and a disabled Pay button

## Scenario: Invalid coupon
1. Add any item, open cart
2. Apply coupon "NOPE123"
3. Assert an inline error and that the total is unchanged
\`\`\`

Because the plan is reviewable text, the planner becomes a collaboration point. You can delete a scenario, add an accessibility check, or tighten an assertion description, and the generator will honor your edits. This is the step where humans add the most value.

## The Generator Agent

The generator reads \`plan.md\`, re-opens the live app, and for each scenario interacts with the real page to discover the correct locators before writing a spec. It runs the test it just wrote, and if the test fails it iterates — adjusting selectors and waits — until the spec passes against the running app. The output is ordinary Playwright code.

\`\`\`ts
// tests/checkout.spec.ts  (generated)
import { test, expect } from '@playwright/test';

test.describe('Checkout', () => {
  test('happy path purchase', async ({ page }) => {
    await page.goto('/products');
    await page.getByRole('link', { name: 'Wireless Mouse' }).click();
    await page.getByRole('button', { name: 'Add to cart' }).click();

    await page.getByRole('link', { name: 'Cart' }).click();
    await expect(page.getByRole('row', { name: /Wireless Mouse/ })).toBeVisible();

    await page.getByRole('button', { name: 'Proceed to checkout' }).click();
    await page.getByLabel('Full name').fill('Ada Lovelace');
    await page.getByLabel('Card number').fill('4242 4242 4242 4242');
    await page.getByRole('button', { name: 'Pay now' }).click();

    await expect(
      page.getByRole('heading', { name: 'Order confirmed' })
    ).toBeVisible();
  });

  test('empty cart shows a guard message', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.getByText('Your cart is empty')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pay now' })).toBeDisabled();
  });
});
\`\`\`

Notice that every locator is role- or label-based and every assertion is web-first (\`toBeVisible\`, \`toBeDisabled\`) — the generator inherited these conventions from \`seed.spec.ts\` and grounded the selectors in the real accessibility tree. Generated specs are committed like any hand-written test; from this point the file is yours.

## MCP Wiring for Claude and Cursor

The agents are exposed to AI clients through the Playwright MCP server. You register it once in your client config and the planner, generator, and healer tools become available in the chat. For deeper MCP setup, see the [Playwright MCP server setup and configuration reference](/blog/playwright-mcp-server-setup-configuration-2026-reference).

For **Claude Code**, add the server with the CLI:

\`\`\`bash
claude mcp add playwright -- npx @playwright/mcp@latest
\`\`\`

For **Cursor** (or any client that reads an \`mcp.json\`), the equivalent JSON is:

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

Once registered, the agent in your editor can call browser tools (navigate, snapshot, click, fill), run-test tools (execute \`npx playwright test\`), and file tools (read and write specs). The MCP boundary is what keeps the agent honest: it can only do what the exposed tools allow, and every tool call is visible in the transcript, so you can see exactly which buttons it clicked and which files it changed.

## The Healer Agent and Self-Healing Selectors

The healer is the agent that earns its keep over the life of a suite. UIs drift — a button gets renamed, a label moves, an aria-role changes — and a brittle locator dies. Traditionally a human triages the red build, reads the trace, hunts for the new selector, and patches the spec. The healer automates that loop. On a CI failure, it reads the failing test, opens the recorded trace, re-opens the page at the failing step, reads the current accessibility tree, finds the element that matches the test's *intent*, rewrites the locator, re-runs the test, and only commits the patch if the test goes green.

The mechanical difference is small but decisive:

| Aspect | Before healing | After healing |
|---|---|---|
| Selector | \`page.getByRole('button', { name: 'Submit' })\` | \`page.getByRole('button', { name: 'Place order' })\` |
| Trigger to fix | Human reads red build | Automatic on CI failure |
| Time to green | Hours to days (triage queue) | Minutes (same CI run) |
| Grounding | Engineer guesses new selector | Re-read from live a11y tree |
| Output | Manual commit | Patch + diff + reason in PR |

The healer does not blindly swap strings. It uses the test's surrounding context — the comment, the action, the assertion that follows — to infer what the locator was *supposed* to target, then matches that intent against the live page. If it cannot find a confident match, it leaves the test failing and reports why, rather than papering over a real regression. That guardrail is what makes auto-healing safe to trust: a genuinely broken feature stays red.

Invoke it manually against a failure when you want to heal locally:

\`\`\`text
Use the Playwright healer agent. tests/checkout.spec.ts is failing on the
"Pay now" step. Read the trace, re-locate the broken element from the live page,
patch the spec, re-run it, and summarize the change.
\`\`\`

## Snapshots and --update-snapshots

Visual and ARIA snapshot assertions are part of many generated suites, and they intersect with the agents in one important way: when the healer changes the DOM-facing parts of a test, the *expected* snapshot may legitimately need to change too. The agent never silently overwrites a baseline — that would mask real visual regressions. Instead it surfaces the snapshot diff and lets you regenerate baselines deliberately with the runner flag.

\`\`\`bash
# Re-run only the affected file and refresh its snapshots after review
npx playwright test tests/checkout.spec.ts --update-snapshots

# Update a single named project's baselines
npx playwright test --project=chromium --update-snapshots
\`\`\`

The discipline is: heal locators automatically, but treat snapshot baseline changes as a human decision. If you want a dedicated visual layer alongside the agents, the [Percy visual testing with Playwright guide](/blog/percy-visual-testing-playwright-official-2026) and the [Chromatic Storybook TurboSnap guide](/blog/chromatic-visual-testing-storybook-turbosnap-2026) cover cloud baselines and review workflows that pair well with agent-generated specs.

## Running the Agent Loop in CI

In CI the planner and generator usually run locally (during development), while the **healer runs on the pipeline** so that a flaky or drifted selector gets repaired in the same run that surfaced it. A common pattern: run the suite, and on failure invoke the healer, then re-run only the patched specs. Keep \`trace: 'on-first-retry'\` so the healer always has a trace to read.

\`\`\`yaml
# .github/workflows/playwright.yml
name: Playwright
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Run tests
        run: npx playwright test
      - name: Upload trace + report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            playwright-report/
            test-results/
          retention-days: 7
\`\`\`

When you wire the healer into CI, it consumes the uploaded trace, opens a follow-up commit or PR with the patched locators and a plain-English summary of what moved, and the next run goes green. The trace artifact doubles as the audit trail. Browse the [QA skills directory](/skills) for installable agent and Playwright skills you can drop into this pipeline.

## Best Practices for Agent-Driven Suites

Keep a tidy \`seed.spec.ts\` — it is the single biggest lever on output quality. Prefer role and label locators so the planner and generator have stable, intent-revealing anchors to ground against. Review \`plan.md\` before generation; that edit cycle is where you add coverage the agent missed. Always keep traces on retry so the healer has fuel. Treat auto-healed locator patches like any PR: read the diff, confirm the intent matches, and merge. And never let the healer touch snapshot baselines automatically — regenerate those by hand with \`npx playwright test --update-snapshots\` only after a human confirms the visual change is intended. Done this way, the agents handle the tedious 80% — exploration, boilerplate, and selector drift — while you keep judgment over coverage and correctness.

## Frequently Asked Questions

### What are Playwright test agents?

Playwright test agents are an AI-native workflow built into the test runner that splits test creation and maintenance across three roles: a planner that explores your live app and writes a test plan, a generator that turns the plan into runnable spec files, and a healer that automatically repairs failing or flaky tests on CI. They are driven through MCP by clients like Claude Code or Cursor.

### How does the Playwright healer agent fix broken selectors?

On a CI failure the healer reads the failing test and its recorded trace, re-opens the page at the failing step, reads the current accessibility tree, and matches the element against the test's intent. It rewrites the locator, re-runs the test, and only commits the patch if it passes. If it cannot find a confident match, it leaves the test red so a real regression is not hidden.

### Do I need MCP to use the planner and generator?

Yes. The agents act through the Playwright MCP server, which exposes the browser, the test runner, and your specs as tools. You register the server in Claude Code with \`claude mcp add playwright\` or in an \`mcp.json\` for Cursor. The MCP boundary is also a safety feature: every tool call the agent makes is visible in the transcript so you can audit what it clicked and changed.

### What is seed.spec.ts for?

\`seed.spec.ts\` is a small, real, passing test that demonstrates your project's conventions — how you log in, which fixtures you use, how you name describes, and your preference for role-based locators. The generator reads it as a style template before writing new specs, so every generated test mirrors your patterns instead of inventing its own. It is the cheapest way to control output quality.

### Can agents update visual snapshots automatically?

No, and that is by design. The agents will surface a snapshot diff but never overwrite a baseline silently, because that would mask real visual regressions. You regenerate baselines deliberately after review with \`npx playwright test --update-snapshots\`. The rule of thumb is: heal locators automatically, but treat snapshot baseline changes as an explicit human decision.

### Is the generated code editable Playwright or a proprietary format?

It is ordinary Playwright TypeScript. The generator writes \`.spec.ts\` files using the same \`test\`, \`expect\`, and locator APIs you would type by hand, grounded in your app's real accessibility tree. There is no recording binary and no lock-in — you read, edit, and commit the specs like any other test, and a human can take over a generated file at any time.

### How do the agents fit into a CI pipeline?

Planning and generation typically happen locally during development, while the healer runs in CI so drifted selectors get repaired in the same run that exposed them. Keep \`trace: 'on-first-retry'\` so a trace always exists, upload the report and trace as artifacts on failure, and let the healer open a follow-up patch with a summary of what moved. The trace doubles as the audit trail.

### Do the agents replace QA engineers?

No. The agents automate the tedious parts — exploring the app, writing boilerplate, and chasing selector drift — but humans still own coverage decisions, assertion correctness, and approving healed patches. The planner deliberately produces a reviewable Markdown plan precisely so engineers can add the scenarios the agent missed. Think of the agents as a fast junior pair, not a replacement for judgment.

## Conclusion

Playwright's planner, generator, and healer turn test automation from a one-time write into a maintained loop. The planner decides what to test against your real app, the generator writes grounded, editable TypeScript specs, and the healer keeps the suite green by re-locating drifted selectors on CI from the live accessibility tree. Because everything flows through MCP and lands as ordinary Playwright code, the workflow stays transparent and lock-in-free: you review the plan, you own the specs, and you approve every healed patch. Start by adding the MCP server to Claude Code or Cursor, drop in a clean \`seed.spec.ts\`, and let the planner explore your most fragile flow. Then explore the [QA skills directory](/skills) for installable Playwright and agent skills, and pair the agents with [solid locator habits](/blog/playwright-locator-best-practices-web-first-assertions-2026) so the healer always has stable anchors to work from.
`,
};
