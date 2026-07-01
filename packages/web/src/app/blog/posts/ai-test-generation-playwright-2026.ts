import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'AI Test Generation with Playwright: The Complete 2026 Guide',
  description:
    'Generate Playwright tests with AI in 2026. Compare codegen, MCP agents, and LLM prompts with runnable TypeScript and a safe review workflow.',
  date: '2026-07-01',
  category: 'Guide',
  content: `
# AI Test Generation with Playwright: The Complete 2026 Guide

Writing end-to-end tests by hand is slow, repetitive, and easy to skip when a deadline looms. That is exactly why AI test generation has become one of the highest-leverage skills for QA engineers and developers in 2026. Instead of manually authoring every locator, assertion, and wait, you describe intent and let a model or a recorder scaffold the test for you. Done well, this turns a two-hour test-writing session into a fifteen-minute review.

But there is a catch. AI-generated tests can look correct and still be worthless: hard-coded waits, brittle selectors, missing assertions, and false confidence that the app works when the test only checks that a page loaded. The difference between a team that ships AI-generated tests successfully and one that drowns in flaky noise is the review and hardening workflow, not the generator itself.

This guide covers the full landscape of generating Playwright tests with AI. You will learn the three main approaches available in 2026: deterministic recording with Playwright codegen, live browser-driving MCP agents, and pure LLM prompt-to-test generation. For each, you get runnable TypeScript, the tradeoffs, and the failure modes to watch for. Then you will get a concrete review checklist and a Page Object refactor pattern that converts raw generated output into a maintainable suite. If you want the framework fundamentals first, read our [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide); if you want to compare frameworks, see [Cypress vs Playwright in 2026](/blog/cypress-vs-playwright-2026). Otherwise, let us generate some tests.

## The Three Ways to Generate Playwright Tests with AI

Not all AI test generation is the same. Each approach trades control for speed, and picking the wrong one for your situation is the most common early mistake.

| Approach | How it works | Best for | Main risk |
|---|---|---|---|
| Playwright codegen | Records your clicks into code | Fast happy-path scaffolds | Brittle CSS selectors |
| MCP browser agent | Model drives a live browser | Exploratory & dynamic flows | Non-deterministic runs |
| LLM prompt-to-test | Model writes code from a prompt | Bulk generation from specs | Hallucinated selectors |

Most mature teams use all three: codegen for a quick skeleton, an MCP agent for flows too dynamic to script by hand, and LLM prompts to fan out coverage across many pages from a requirements doc. The unifying discipline is that every generated test gets reviewed and refactored before it enters the suite.

## Approach 1: Playwright Codegen (Deterministic Recording)

Playwright codegen is the safest starting point because it records real interactions and prefers user-facing locators. It is technically AI-adjacent rather than a language model, but in 2026 the codegen engine ranks locators intelligently and produces clean role-based output.

\`\`\`bash
# Launch the recorder against your app
npx playwright codegen https://demo.playwright.dev/todomvc
\`\`\`

As you click through the app, codegen emits code like this:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('add a todo item', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');

  await page.getByPlaceholder('What needs to be done?').fill('Write E2E tests');
  await page.getByPlaceholder('What needs to be done?').press('Enter');

  await expect(page.getByTestId('todo-title')).toHaveText('Write E2E tests');
  await expect(page.getByText('1 item left')).toBeVisible();
});
\`\`\`

Codegen gives you a correct, runnable happy path in seconds. Its weakness is that it only captures what you clicked, so it produces no negative cases, no edge cases, and sometimes falls back to CSS when an element lacks a good accessible name. Treat codegen output as a first draft to harden, never as a finished test.

## Approach 2: MCP Browser Agents (Live Driving)

The 2026 leap in AI test generation is the Model Context Protocol browser agent. Instead of recording your clicks, an AI agent drives a real browser using tools like navigate, click, and snapshot, decides what to do next from the page state, and writes a Playwright test that reproduces the flow. This shines for flows that are too dynamic or exploratory to script manually.

You give the agent a goal in natural language:

\`\`\`text
Goal: Log into the demo app with user "qa@qaskills.sh", add the
first product to the cart, proceed to checkout, and verify the
order confirmation page shows an order number. Then emit a
Playwright TypeScript test that reproduces this exact flow using
role-based locators and web-first assertions.
\`\`\`

The agent explores the live page, resolves elements from the accessibility snapshot, and produces a test similar to this:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('purchase flow end to end', async ({ page }) => {
  await page.goto('https://shop.example.com');

  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByLabel('Email').fill('qa@qaskills.sh');
  await page.getByLabel('Password').fill('s3cret!');
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.getByRole('listitem').first().getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('link', { name: /cart/i }).click();
  await page.getByRole('button', { name: /checkout/i }).click();

  await expect(page.getByRole('heading', { name: /order confirmed/i })).toBeVisible();
  await expect(page.getByTestId('order-number')).toContainText(/#\\d+/);
});
\`\`\`

Because the agent reads the live accessibility tree, it tends to pick stable role and label locators rather than CSS. The risk is non-determinism: two runs of the same goal can produce slightly different tests. Always pin the generated test, run it three times to confirm stability, and refactor it into your conventions. Our deep dive on [Playwright test agents for Claude Code](/blog/playwright-test-agents-claude-code) walks through wiring this up end to end.

## Approach 3: LLM Prompt-to-Test Generation

The fastest way to scale coverage is prompting a language model directly with a spec and letting it write the test. This works well for bulk generation, for example turning twenty acceptance-criteria bullets into twenty test cases, but it is also the most dangerous because the model cannot see your DOM and may hallucinate selectors.

A good prompt constrains the output heavily:

\`\`\`text
You are a senior SDET. Write a Playwright TypeScript test for this
acceptance criterion. Rules:
- Use ONLY getByRole, getByLabel, getByTestId (no CSS, no XPath).
- Use web-first assertions (expect(locator).toBeVisible()).
- No hard-coded timeouts or waitForTimeout.
- Mark every locator you are unsure about with a // TODO: verify.

Acceptance criterion:
"A logged-out user who submits the newsletter form with a valid
email sees a success banner reading 'You are subscribed'."
\`\`\`

The model returns something like:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('newsletter signup shows success banner', async ({ page }) => {
  await page.goto('https://example.com');

  // TODO: verify locator against real DOM
  await page.getByLabel('Email address').fill('reader@qaskills.sh');
  await page.getByRole('button', { name: /subscribe/i }).click();

  await expect(page.getByRole('status')).toHaveText('You are subscribed');
});
\`\`\`

The \`// TODO: verify\` markers are the key discipline: they force a human to confirm each guessed locator before the test is trusted. Never merge prompt-generated tests without running them against the real app first. For the security implications of shipping AI-authored code, review our guide on [testing AI-generated code](/blog/security-testing-ai-generated-code).

## The Non-Negotiable Review Checklist

AI generates tests fast; your job is to make them trustworthy. Run every generated test through this checklist before it enters the suite.

| Check | Why it matters |
|---|---|
| Uses role/label/testid, not CSS | Structural selectors break on refactors |
| No \`waitForTimeout\` | Fixed sleeps cause flakiness |
| Assertions verify behavior, not page load | A test that only checks navigation proves nothing |
| Covers a negative or error case | Happy-path-only tests miss real bugs |
| Runs green 3x in a row | Confirms determinism |
| No leaked credentials or PII | Generated code often bakes in secrets |

If a generated test fails any row, fix it or reject it. The generator's speed is only a win if the output meets your bar; otherwise you have just automated the creation of flaky tests. For a systematic approach to stability, see [fix flaky tests](/blog/fix-flaky-tests-guide).

## Refactoring Generated Tests into Page Objects

Raw generated tests inline every locator, which does not scale. The final step in any AI test generation workflow is refactoring the output into a Page Object Model so locators live in one place and tests read as intent.

\`\`\`typescript
import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('https://shop.example.com');
  }

  async login(email: string, password: string) {
    await this.page.getByRole('button', { name: 'Log in' }).click();
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: /sign in/i }).click();
    await expect(this.page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  }
}
\`\`\`

The test then reads cleanly and shares the login logic across every spec:

\`\`\`typescript
import { test } from '@playwright/test';
import { LoginPage } from './pages/login-page';

test('dashboard loads after login', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login('qa@qaskills.sh', 's3cret!');
});
\`\`\`

This is the single highest-value transformation you can apply to generated tests. It converts throwaway scaffolds into a durable suite and centralizes the locators an agent will inevitably need to update later.

## Guarding Against Assertion-Free Tests

The most insidious failure of AI test generation is the test that runs green but asserts nothing meaningful. A model may end a flow with \`await expect(page).toHaveURL(...)\`, which only proves navigation happened, not that the feature worked. Enforce meaningful assertions.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('search returns relevant results', async ({ page }) => {
  await page.goto('https://example.com');
  await page.getByRole('searchbox').fill('playwright');
  await page.getByRole('searchbox').press('Enter');

  // Weak: only proves the page changed
  // await expect(page).toHaveURL(/search/);

  // Strong: proves the feature actually worked
  const results = page.getByRole('link', { name: /playwright/i });
  await expect(results.first()).toBeVisible();
  await expect(results).not.toHaveCount(0);
});
\`\`\`

Make "does this assertion verify real behavior?" a required review question. A suite full of navigation-only checks gives false confidence, which is worse than no tests at all because it hides regressions behind green checkmarks.

## Putting It Together: A Generation Pipeline

Combine the approaches into a repeatable pipeline. Use codegen or an MCP agent to scaffold the happy path, use LLM prompts to fan out edge and negative cases from your acceptance criteria, then run everything through the review checklist and refactor into Page Objects.

\`\`\`text
1. Scaffold happy path      -> codegen or MCP agent
2. Fan out edge/negative    -> LLM prompt per acceptance criterion
3. Run each test 3x         -> confirm determinism
4. Apply review checklist    -> reject weak assertions & CSS
5. Refactor into POM         -> centralize locators
6. Commit + wire into CI     -> gate merges on green
\`\`\`

Standardizing this pipeline as an installable skill means every agent on your team applies the same bar. Browse the [QA skills](/skills) directory to install Playwright generation, review, and hardening standards straight into your coding agent.

## Using Playwright MCP with Claude Code to Generate Tests

The most productive setup in 2026 combines Claude Code with the Playwright MCP server. The MCP server exposes browser tools such as navigate, click, snapshot, and type; Claude Code calls them to drive a real browser, reads the accessibility snapshot at each step, and writes a test that reproduces the flow with stable locators. Because the model sees the actual DOM through the snapshot, it hallucinates far fewer selectors than a pure prompt-to-test approach.

Wire it up by adding the MCP server to your Claude Code configuration:

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

With the server connected, you drive generation from a single instruction. Claude Code explores the live app, then emits a spec file:

\`\`\`text
Using the Playwright MCP, open https://demo.playwright.dev/todomvc,
add two todos, mark the first complete, and filter to "Active".
Then write a Playwright TypeScript test at tests/todo-filter.spec.ts
that reproduces this with role-based locators and web-first assertions.
Do not use waitForTimeout or CSS selectors.
\`\`\`

The agent resolves each element from the snapshot and produces a grounded test:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('active filter shows only incomplete todos', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');

  const input = page.getByPlaceholder('What needs to be done?');
  await input.fill('Write E2E tests');
  await input.press('Enter');
  await input.fill('Review AI output');
  await input.press('Enter');

  await page.getByRole('listitem').filter({ hasText: 'Write E2E tests' })
    .getByRole('checkbox').check();

  await page.getByRole('link', { name: 'Active' }).click();

  await expect(page.getByTestId('todo-title')).toHaveText(['Review AI output']);
});
\`\`\`

Because the locators came from the real accessibility tree rather than a guess, this test is far more likely to pass on the first run. You still review and refactor it, but the starting quality is meaningfully higher than prompt-only generation. See [Playwright test agents for Claude Code](/blog/playwright-test-agents-claude-code) for the full agent configuration.

## Prompt Patterns That Produce Reliable Tests

The quality of prompt-generated tests is almost entirely a function of the prompt. Vague prompts yield vague tests with weak assertions and invented selectors; constrained prompts yield tests that pass review. Adopt a small library of reusable patterns rather than improvising each time.

| Pattern | What it enforces | When to use |
|---|---|---|
| Role-only constraint | Bans CSS/XPath, requires \`getByRole\`/\`getByLabel\`/\`getByTestId\` | Every generation |
| Uncertainty marker | Model tags guessed locators with \`// TODO: verify\` | Prompt-to-test without live DOM |
| One-criterion-per-test | Model writes exactly one test per acceptance bullet | Bulk fan-out from specs |
| Assertion-strength rule | Forbids navigation-only assertions | Preventing false-green tests |
| Fixture reuse | Model imports an existing \`LoginPage\` instead of re-authenticating | Suites with shared setup |

A production-grade prompt stacks several of these constraints and hands the model your existing conventions so its output matches the suite it will join:

\`\`\`text
You are a senior SDET writing Playwright TypeScript. Follow these rules exactly:
1. Import { test, expect } from '@playwright/test'.
2. Reuse the existing fixture: import { LoginPage } from './pages/login-page'.
3. Use ONLY getByRole, getByLabel, getByTestId. No CSS. No XPath. No waitForTimeout.
4. Every assertion must verify feature behavior, not just navigation.
5. Tag any locator you cannot confirm with // TODO: verify.
6. Write exactly one test per acceptance criterion below.

Acceptance criteria:
- A logged-in user can rename a project and see the new name in the header.
- Renaming to an empty string shows an inline error "Name is required".
\`\`\`

The stacked constraints do the heavy lifting. Forbidding CSS at generation time is cheaper than stripping it in review, and demanding one test per criterion keeps the output mapped cleanly to your requirements so coverage gaps are obvious at a glance.

## Guarding Against Hallucinated Selectors in CI

The failure mode unique to AI generation is the hallucinated selector: a plausible-looking \`getByRole('button', { name: 'Continue' })\` for a button that does not exist. These pass code review by eye and only fail at runtime. Catch them automatically by treating any unverified locator as a hard CI failure until a human confirms it.

First, make the model mark uncertainty, then fail the build if any marker survives to the merge:

\`\`\`typescript
// scripts/check-todo-verify.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function scan(dir: string): string[] {
  const offenders: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      offenders.push(...scan(full));
    } else if (entry.name.endsWith('.spec.ts')) {
      const text = readFileSync(full, 'utf8');
      if (/\\/\\/\\s*TODO:\\s*verify/i.test(text)) offenders.push(full);
    }
  }
  return offenders;
}

const unverified = scan('tests');
if (unverified.length > 0) {
  console.error('Unverified AI locators remain:\\n' + unverified.join('\\n'));
  process.exit(1);
}
\`\`\`

Run this in CI before the test job. A generated test cannot merge while it still carries an unconfirmed locator, which forces the human review step that catches hallucinations. Combine it with a first-run gate that quarantines any brand-new spec until it has passed green three times:

\`\`\`yaml
# .github/workflows/ai-tests.yml (excerpt)
- name: Block unverified AI locators
  run: npx tsx scripts/check-todo-verify.ts

- name: Run tests three times to confirm determinism
  run: |
    for i in 1 2 3; do npx playwright test --grep @ai-generated || exit 1; done
\`\`\`

Together these two gates turn "the AI might have made up a selector" from a production incident into a build failure caught before merge. That is the difference between AI generation as an asset and AI generation as a liability.

## Frequently Asked Questions

### How do I generate Playwright tests with AI?

You have three main options in 2026. Use \`npx playwright codegen <url>\` to record clicks into deterministic code, use an MCP browser agent that drives a live browser and writes a test from a natural-language goal, or prompt an LLM directly with an acceptance criterion. In every case, run the generated test three times and refactor it into a Page Object before trusting it.

### Is Playwright codegen the same as AI test generation?

Not exactly. Playwright codegen records your real interactions and emits code with smart, role-based locators, but it does not use a language model to reason about intent. True AI test generation uses an LLM or an agent that reads page state and decides what to test. Codegen is the safest starting point because it is deterministic and captures exactly what you did.

### Can AI-generated Playwright tests be trusted in production?

Only after review. AI generators frequently produce weak assertions, hallucinated selectors, and hard-coded waits that pass locally but flake in CI. Run every generated test against the real app three times, verify each assertion checks real behavior rather than just navigation, remove any \`waitForTimeout\`, and refactor into Page Objects. With that workflow, generated tests are production-safe.

### What is the best AI approach for dynamic web apps?

For highly dynamic apps, an MCP browser agent is best because it reads the live accessibility tree and resolves elements at runtime rather than guessing selectors. It handles flows that are hard to script by hand, like multi-step checkouts with changing state. The tradeoff is non-determinism, so pin the generated test and confirm it runs green consistently before committing.

### How do I stop AI from generating flaky Playwright tests?

Constrain the generator with explicit rules: forbid CSS and XPath, require \`getByRole\`, \`getByLabel\`, or \`getByTestId\`, ban \`waitForTimeout\`, and demand web-first assertions like \`expect(locator).toBeVisible()\`. Then enforce a review checklist and run each test three times. These guardrails cut the most common flakiness sources at the point of generation rather than after they reach CI.

### Do I still need to know Playwright if AI writes the tests?

Yes, more than ever. AI accelerates the writing but cannot judge whether a test is meaningful, whether an assertion is strong, or whether a selector will survive a refactor. Your Playwright knowledge is what turns fast generated drafts into a reliable suite. The skill shifts from typing tests to reviewing, hardening, and architecting them.

### How does Playwright MCP improve test generation over plain prompting?

The Playwright MCP server lets an agent like Claude Code drive a real browser and read the live accessibility snapshot at each step, so the locators it writes come from the actual DOM rather than a guess. That grounding dramatically reduces hallucinated selectors, which are the number-one failure mode of pure prompt-to-test generation. You configure the server once in your Claude Code settings, give a natural-language goal, and the agent explores the app before emitting a grounded spec file. You still review the output, but its first-run pass rate is much higher.

### How do I stop AI from inventing selectors that do not exist?

Require the model to tag every uncertain locator with a \`// TODO: verify\` comment, then add a CI script that fails the build if any such marker survives to merge. Pair that with a determinism gate that runs each new spec three times before it is trusted. The uncertainty marker forces a human to confirm each guessed locator, and the CI gate makes an unverified locator a build failure rather than a runtime surprise. Grounding generation in the live DOM through the Playwright MCP reduces hallucinations at the source.

## Conclusion

AI test generation is the biggest productivity unlock for QA in 2026, but only for teams that pair it with discipline. Codegen gives you fast deterministic scaffolds, MCP agents handle dynamic flows by reading live page state, and LLM prompts fan out coverage from your specs. None of them replace judgment: the review checklist, the three-times-green rule, meaningful assertions, and the Page Object refactor are what convert raw generation into a suite you can actually trust.

Adopt the six-step pipeline, standardize it across your team, and you will spend your time reviewing intent instead of typing boilerplate. Generated tests become drafts you sharpen, not liabilities you inherit.

Want your coding agent to generate Playwright tests that already follow these standards? Explore the [QA skills](/skills) directory on qaskills.sh and install AI test generation, review, and hardening skills directly into Claude Code, Cursor, and 30+ other agents.
`,
};
