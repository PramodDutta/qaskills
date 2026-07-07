import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Planner and Generator Agents: A Practical Guide',
  description:
    'Learn how the Playwright Planner explores your app and drafts a test plan, and how the Generator writes runnable TS specs. Workflow, prompts, MCP, and review loop.',
  date: '2026-07-07',
  category: 'Guide',
  content: `
# Playwright Planner and Generator Agents: A Practical Guide

Writing end-to-end tests by hand has always had two expensive phases: figuring out *what* to test, and translating that into *runnable* code. In 2026 the Playwright agent lineup splits those two jobs across two specialized agents. The Planner explores a live application, maps its flows, and drafts a structured test plan. The Generator takes that plan and emits real, runnable Playwright TypeScript specs. Used together, they turn a blank test directory into a reviewed, executing suite in a fraction of the usual time.

This guide walks through both agents end to end: what each one produces, how they hand off to each other, how they tie into the Playwright MCP for live browser exploration, the prompts that steer them, and the review loop that keeps a human firmly in control. If you want the wider context on the whole agent family first, read the [Playwright agents guide for 2026](/blog/playwright-agents-guide-2026); this article zooms into the two that create tests from scratch.

## The Two-Agent Model: Plan Then Generate

The core idea is separation of concerns. Planning is a reasoning task: understand the app, decide what matters, and describe scenarios in plain language. Generation is a translation task: turn each described scenario into idiomatic Playwright code with correct locators, waits, and assertions. Keeping them separate produces better output than asking one agent to do both at once, because a human can review and correct the plan before a single line of code is written.

| Aspect | Planner | Generator |
|---|---|---|
| Input | Live app URL or spec, plus a goal | An approved test plan |
| Primary tool | Playwright MCP (live browser) | Code emission + MCP verification |
| Output | Structured markdown test plan | Runnable \`.spec.ts\` files |
| Human checkpoint | Review the plan | Review the diff and run |
| Failure mode if skipped | Tests cover the wrong things | Flaky or brittle specs |

The rule that makes this work: never let the Generator run on an unreviewed plan. A five-minute plan review saves an hour of untangling generated tests that faithfully implemented the wrong intent.

It is tempting to ask why you cannot simply prompt a single powerful model to "explore this app and write me a test suite" in one shot. You can, and it will produce something, but the result is consistently worse for a structural reason. When planning and generation are fused, the reasoning about coverage is buried inside code you then have to read line by line to audit. You cannot cheaply tell whether the agent decided to skip the empty-cart guard, because that decision never surfaced as a reviewable artifact; it just silently did not appear in the output. Splitting the work forces the coverage decision into a short markdown document a human can scan in a minute, and only after that decision is blessed does anyone spend tokens turning it into code. The separation is not bureaucracy, it is the mechanism that makes the agent's judgment inspectable.

The two-agent model also maps cleanly onto how experienced test engineers already work. A good engineer does not open an editor and start typing \`await page.click\`; they first sketch what scenarios matter, argue about coverage with a colleague, and only then write code. The Planner automates the first half of that habit and the Generator automates the second, while the review gates preserve the argument-about-coverage step that is the part most worth keeping.

## What the Planner Actually Does

The Planner is an exploration agent. Given a URL and a goal such as "test the checkout flow," it drives a real browser through the Playwright MCP, observes the accessibility tree at each step, and builds a mental model of the app's states and transitions. It then writes a test plan: a structured document listing scenarios, each with preconditions, steps, and expected outcomes, plus the edge cases it noticed while exploring.

A Planner run produces something like this:

\`\`\`markdown
# Test Plan: Checkout Flow

## Scenario 1: Guest checkout, single item (happy path)
- Precondition: cart contains one in-stock item
- Steps:
  1. Navigate to /cart
  2. Click "Proceed to checkout"
  3. Fill shipping form with valid data
  4. Select standard shipping
  5. Enter valid test card
  6. Click "Place order"
- Expected: order confirmation page shows an order number

## Scenario 2: Empty cart guard
- Precondition: cart is empty
- Steps:
  1. Navigate directly to /checkout
- Expected: redirected to /cart with an "empty cart" message

## Scenario 3: Invalid card is rejected
- Precondition: cart has one item, checkout reached
- Steps: enter a declined test card, submit
- Expected: inline error, order not created

## Edge cases noticed during exploration
- Promo code field accepts empty submit silently
- Shipping estimate does not update on country change
\`\`\`

The value here is not just the happy path, which any developer could enumerate. It is that the Planner, by actually walking the app, surfaces the empty-cart guard and the promo-field quirk that a spec-only planning session would miss. This is why live exploration beats planning from a requirements doc alone.

The exploration itself follows a recognizable pattern. The Planner starts at the entry point you gave it, snapshots the accessibility tree, and enumerates the interactive affordances it can see: buttons, links, form fields, toggles. It then reasons about which of those advance the goal you specified and follows them, snapshotting again at each new state. Along the way it notices things a static reader of the requirements never would: a field that accepts an empty submission without complaint, a total that fails to recalculate when an input changes, a secondary path to the same screen that a requirements doc collapsed into one line. These observations land in the "edge cases noticed" section not because you asked for them but because the agent physically encountered the behavior while clicking through the app.

A useful mental model is that the requirements document tells the Planner what the app is *supposed* to do, while the live exploration tells it what the app *actually* does. The gap between those two is where most real bugs live, and it is precisely the gap a plan drafted from documents alone can never see. That is also why you should point the Planner at a running staging build rather than a design mockup: it can only report on behavior it can reach and observe.

## What the Generator Actually Does

The Generator consumes the approved plan and produces runnable Playwright specs. It does not invent scenarios; it implements the ones the Planner listed. For each scenario it selects semantic locators (preferring \`getByRole\`, \`getByLabel\`, \`getByText\`), inserts proper web-first assertions with auto-waiting, and structures the file with sensible \`test.describe\` grouping and hooks.

From Scenario 1 above, the Generator emits:

\`\`\`ts
import { test, expect } from '@playwright/test';

test.describe('Checkout flow', () => {
  test('guest checkout, single item, happy path', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();

    await page.getByRole('button', { name: 'Proceed to checkout' }).click();

    await page.getByLabel('Full name').fill('Ada Lovelace');
    await page.getByLabel('Address').fill('1 Analytical Engine Way');
    await page.getByLabel('City').fill('London');
    await page.getByLabel('Postcode').fill('EC1A 1BB');

    await page.getByRole('radio', { name: 'Standard shipping' }).check();

    await page.getByLabel('Card number').fill('4242 4242 4242 4242');
    await page.getByLabel('Expiry').fill('12/30');
    await page.getByLabel('CVC').fill('123');

    await page.getByRole('button', { name: 'Place order' }).click();

    await expect(page.getByText(/order #\\d+/i)).toBeVisible();
  });
});
\`\`\`

Notice what the Generator did automatically: it added a visibility assertion after navigation to anchor the page state, used label-based locators for every form field, and wrote a regex assertion for the order-number confirmation instead of a brittle exact-string match. These are the habits described in [Playwright best practices for 2026](/blog/playwright-best-practices-2026), applied consistently across every generated file.

The consistency is the underrated part. A human writing twenty tests across three sittings will drift: they will use \`getByLabel\` for the first ten fields, get bored and drop to \`page.locator('#email')\` for the next five, and forget the post-navigation visibility check on the tests they wrote late on a Friday. The Generator does not get bored. Every file it emits from the same constraints applies the same locator strategy, the same assertion style, and the same describe-block structure. That uniformity makes the suite dramatically easier to read and maintain, because a reviewer learns one set of conventions and sees them everywhere rather than reverse-engineering each author's personal habits.

The Generator is also disciplined about what it does *not* do. It will not invent an assertion the plan never asked for, and it will not silently expand a scenario's scope. If the plan says "verify the order confirmation shows an order number," the Generator asserts exactly that and nothing more. This fidelity is what makes the plan a trustworthy contract: what you approved in markdown is what you get in code, which is only possible because the creative decision about coverage was already settled upstream in the Planner phase.

## The Playwright MCP Tie-In

Both agents lean on the Playwright MCP (Model Context Protocol) server, which exposes live browser control to the agent. The MCP is what lets the Planner *see* the app rather than guess at it, and it lets the Generator *verify* a spec by running it against the real page before declaring it done.

Set up the MCP once:

\`\`\`bash
npm install -D @playwright/test @playwright/mcp
npx playwright install --with-deps
npx playwright init-agents --loop=planner,generator
\`\`\`

Register the MCP server with your agent driver. A typical config entry looks like this:

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

With the MCP connected, the Planner can call browser navigation and snapshot tools during exploration, and the Generator can execute a freshly written spec and read back the result. For a deeper walkthrough of the MCP's browser-automation surface, see the [Playwright MCP browser automation guide](/blog/playwright-mcp-browser-automation-guide). If you drive these agents from Claude Code specifically, [running Playwright test agents in Claude Code](/blog/playwright-test-agents-claude-code) covers the editor integration.

## The End-to-End Workflow

Here is the full loop from empty directory to committed suite.

1. **Kick off the Planner** with a goal and a target URL.
2. **Review the plan.** Add missing scenarios, delete irrelevant ones, correct expected outcomes. This is the highest-leverage step.
3. **Hand the approved plan to the Generator.**
4. **Let the Generator write and self-verify** each spec against the live app via MCP.
5. **Review the generated diff**, run the suite locally, and commit.

\`\`\`bash
# Step 1: explore and plan
npx playwright agents run planner \\
  --goal "Test the checkout flow" \\
  --url https://staging.example.com \\
  --out plans/checkout.md

# Step 2: (human edits plans/checkout.md)

# Step 3-4: generate specs from the reviewed plan
npx playwright agents run generator \\
  --plan plans/checkout.md \\
  --out tests/checkout.spec.ts

# Step 5: run and review
npx playwright test tests/checkout.spec.ts
\`\`\`

The two explicit \`--out\` files, the plan and the spec, are both artifacts you keep in version control. The plan documents intent, the spec documents implementation, and reviewers can check that the second faithfully implements the first.

## Prompts That Steer the Planner

The goal you give the Planner shapes everything downstream. Vague goals produce shallow plans; specific goals produce thorough ones. Compare these.

| Weak prompt | Strong prompt |
|---|---|
| "Test the app" | "Test the checkout flow including guest and logged-in paths, invalid-card handling, and the empty-cart guard" |
| "Check login" | "Test login: valid credentials, wrong password, locked account after 5 attempts, and the password-reset link" |
| "Look at the dashboard" | "Test the dashboard filters: date range, status, and the empty-state when no records match" |

A strong Planner prompt names the flow, the important variations, and at least one negative case. That framing tells the agent where to spend its exploration budget and which edge cases to hunt for. You can also constrain scope: "do not test payment provider internals, assume the test card always succeeds" keeps the plan focused.

## Prompts and Constraints for the Generator

The Generator needs fewer creative prompts and more *constraints*, because its job is faithful translation. Give it your project's conventions up front.

\`\`\`bash
npx playwright agents run generator \\
  --plan plans/checkout.md \\
  --constraints "Use data-testid when present; group by test.describe; \\
    no hard waits; use baseURL from config; one file per flow" \\
  --out tests/checkout.spec.ts
\`\`\`

Common constraints worth setting: prefer \`data-testid\` locators where they exist, forbid \`page.waitForTimeout\` entirely, reuse a shared login fixture instead of logging in per test, and keep assertions web-first so auto-waiting does the timing work. These map directly to the discipline in [Playwright end-to-end best practices](/blog/playwright-e2e-best-practices), and encoding them as constraints means every generated file follows them without a manual cleanup pass.

## The Review Loop That Keeps You in Control

Neither agent is trustworthy on autopilot, and that is by design. The workflow has two human gates, and skipping either is the fastest way to a suite you do not trust.

**Gate one, after the Planner:** read the plan as a spec, not as code. Ask whether the scenarios cover the real risk in the flow, whether the expected outcomes are correct, and whether any critical negative case is missing. Edits here are cheap and prevent the Generator from perfectly implementing the wrong thing.

**Gate two, after the Generator:** read the diff and run the suite. Check that locators are semantic rather than positional, that assertions are meaningful (not just \`toBeVisible\` everywhere), and that the tests actually pass against a live environment. A spec that passes but asserts nothing useful is worse than no test, so scrutinize the assertions specifically.

| Review gate | What to check | Cheapest fix if wrong |
|---|---|---|
| After Planner | Coverage, expected outcomes, negative cases | Edit the markdown plan |
| After Generator | Locator quality, assertion strength, green run | Re-prompt with a constraint |
| Ongoing | Selector drift over time | Pair with the Healer agent |

That last row matters: the Planner and Generator create tests, and the Healer keeps them alive as the app changes. Together they cover the full lifecycle of a Playwright suite.

## When to Use These Agents (and When Not To)

These agents shine when you are bootstrapping coverage for an existing app, backfilling tests for a legacy flow nobody documented, or spinning up a suite for a new feature that is already built and running. They are weaker when the app does not exist yet (nothing to explore) or when the flow depends on external state the browser cannot reach (a webhook from a third party, a nightly batch job). In those cases, plan by hand and use the Generator only for the browser-reachable portions.

They also do not replace judgment about *what is worth testing*. The Planner will happily plan tests for a rarely-used admin screen if you point it there. Aim it at the flows that carry business risk, and let the review loop prune the rest.

## Frequently Asked Questions

### What is the difference between the Playwright Planner and Generator agents?

The Planner explores a live application through the Playwright MCP and drafts a structured, human-readable test plan describing scenarios, steps, and expected outcomes. The Generator takes an approved plan and translates each scenario into runnable Playwright TypeScript specs with semantic locators and web-first assertions. Planning is a reasoning task; generation is a translation task, and separating them lets a human review intent before any code exists.

### Do I need the Playwright MCP to use these agents?

Yes, effectively. The MCP server exposes live browser control so the Planner can observe the app's real states rather than guess from a spec, and so the Generator can verify a freshly written test against the live page. Install \`@playwright/mcp\`, register it with your agent driver, and both agents can drive and inspect a real browser during their runs.

### Should I review the test plan before generating code?

Always. The plan review is the highest-leverage step in the whole workflow. Correcting a scenario or adding a missing negative case in the markdown plan takes minutes, whereas fixing a suite where the Generator faithfully implemented the wrong intent takes far longer. Never run the Generator on an unreviewed plan.

### How do I make the Planner find edge cases?

Give it a specific goal that names the flow, the important variations, and at least one negative case, for example "test login including wrong password and lockout after five attempts." Because the Planner walks the live app, it also surfaces edge cases you did not name, such as guard redirects or silent form submissions, but a specific prompt tells it where to spend its exploration budget.

### Can the Generator follow my project's coding conventions?

Yes. Pass constraints such as "prefer data-testid locators, forbid hard waits, group by test.describe, reuse the shared login fixture." The Generator applies these across every file it writes, so you get consistent, convention-following specs without a manual cleanup pass. Encoding your standards as constraints is more reliable than fixing style after generation.

### Are the generated tests ready to commit as-is?

Treat them as a strong draft, not a finished product. Read the diff, confirm locators are semantic rather than positional, check that assertions are meaningful rather than blanket visibility checks, and run the suite against a live environment. Most generated specs need only minor tweaks, but the review gate is what makes the output trustworthy.

### How do these agents work with the Healer agent?

The Planner and Generator create tests; the Healer keeps them running as the app evolves. When a selector drifts, the Healer repairs the locator from an accessibility snapshot so the suite the Generator produced does not rot. Using all three together covers the full lifecycle: author with Planner and Generator, maintain with Healer.

### When should I not use the Planner and Generator?

Avoid them when there is no running app to explore (a feature that is only designed, not built) or when the flow depends on external state the browser cannot reach, such as a third-party webhook or a nightly batch job. In those cases, plan by hand and use the Generator only for the browser-reachable portions of the workflow.

## Conclusion

The Playwright Planner and Generator turn test authoring into a reviewable, two-stage pipeline: explore and plan in plain language, then translate the approved plan into idiomatic runnable specs. The Planner's live exploration surfaces edge cases a requirements doc would miss, the Generator writes consistent semantic locators and web-first assertions, and the two human review gates keep you in control of both what gets tested and how.

Start by pointing the Planner at one high-risk flow in your staging environment, review the plan carefully, then let the Generator draft the specs. Explore the full library of QA automation skills at [/skills](/skills) to combine these agents with the rest of your testing workflow.
`,
};
