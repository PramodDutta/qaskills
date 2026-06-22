import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright AI Agents: Planner, Generator, Healer (2026)',
  description:
    'A guide to Playwright AI agents -- Planner, Generator, and Healer. Setup, the plan-generate-run-heal pipeline, Claude Code and MCP integration, and examples.',
  date: '2026-06-22',
  category: 'Guide',
  content: `
# Playwright AI Agents: Planner, Generator, Healer (2026)

Playwright in 2026 is no longer just a browser-automation library -- it is an agentic testing framework. Built into the framework are three native AI agents: the **Planner**, the **Generator**, and the **Healer**. Together they form a pipeline that takes you from a one-line testing goal all the way to a maintained, self-repairing test suite. The Planner explores your app and writes a Markdown test plan. The Generator turns that plan into real TypeScript Playwright tests. The Healer diagnoses and patches failing tests when your UI changes.

The agents are free -- they ship with the framework -- and you pay only for the LLM tokens they consume. They pair naturally with AI coding clients like Claude Code and GitHub Copilot through the **Playwright MCP** (Model Context Protocol) server. And the productivity numbers are real but grounded: a TTC Global study found AI-assisted Playwright authoring saved roughly **24.9% of test-writing time** -- a meaningful boost, not a fantasy of zero-effort testing. This guide walks the whole pipeline end to end with runnable examples, model recommendations, and clear guidance on when to use the agents and when not to.

## The Three-Agent Pipeline

The mental model that makes everything click is that authoring and maintaining a test suite is three different jobs, and each agent owns one:

1. **Planner** -- "What should we test?" It explores the live app and produces a structured Markdown plan of scenarios.
2. **Generator** -- "Turn the plan into code." It converts each scenario into an executable TypeScript test file.
3. **Healer** -- "Keep the tests green." It repairs failing tests when selectors or flows drift.

You can use each agent independently, but the magic is the loop: **plan -> generate -> run -> heal**. Plan once, generate the suite, run it in CI, and let the Healer keep it alive as the app evolves.

| Agent | Role | Input | Output | When to use |
|---|---|---|---|---|
| Planner | Explore the app and design coverage | A high-level goal + the running app | A Markdown test plan | Starting a new area, or refreshing coverage |
| Generator | Translate plans into runnable code | A Markdown test plan | TypeScript Playwright spec files | After a plan exists, to scaffold tests fast |
| Healer | Diagnose and patch failing tests | A failing test + live page state | A corrected role-based locator + re-run | After UI changes break existing tests |

For a deeper dive into how the Healer specifically repairs tests, see our [self-healing test automation](/blog/self-healing-test-automation-2026-guide) guide. For the bigger E2E picture, the [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) covers the fundamentals these agents build on.

## Installing and Setting Up the Agents

The agents reach your app and your AI client through the Playwright MCP server. Setup is the same regardless of which MCP-capable client you drive them from.

### Step 1: Install Playwright

\`\`\`bash
npm init playwright@latest
# Choose TypeScript, a tests/ directory, and install browsers when prompted
\`\`\`

### Step 2: Add the Playwright MCP server

\`\`\`bash
npm install -D @playwright/mcp
\`\`\`

### Step 3: Register MCP with your AI client

For an MCP-capable client such as Claude Code, register the Playwright MCP server so the agents can drive a real browser and read accessibility snapshots:

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

If MCP is unfamiliar, our [MCP for QA engineers](/blog/mcp-for-qa-engineers-guide) guide explains the protocol and why it is the connective tissue for agentic testing. For a client-specific walkthrough, see [Playwright test agents with Claude Code](/blog/playwright-test-agents-claude-code).

### Step 4: Sensible config for agent-friendly runs

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'https://app.example.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  retries: process.env.CI ? 1 : 0,
});
\`\`\`

## Using the Planner Agent

The Planner is where the pipeline begins. You give it a high-level goal and point it at your running application. It navigates the UI, catalogs the interactive elements and user flows, and writes a structured Markdown test plan -- including happy paths, edge cases, and expected results.

The instruction you give the Planner is plain language:

\`\`\`text
Use the Playwright Planner to explore https://app.example.com.
Goal: test the user sign-up and login flows.
Produce a Markdown test plan covering happy path, validation errors,
and account-already-exists, with expected results for each step.
\`\`\`

A typical Planner output looks like this:

\`\`\`md
# Test Plan: Authentication

## Scenario 1: Successful sign-up
- Navigate to /signup
- Fill "Email" with a new unique address
- Fill "Password" with a valid password
- Click "Create account"
- Expect: redirected to /dashboard, heading "Welcome" visible

## Scenario 2: Sign-up with existing email
- Navigate to /signup
- Fill "Email" with an already-registered address
- Fill "Password" with a valid password
- Click "Create account"
- Expect: error text "Account already exists" is visible

## Scenario 3: Login validation
- Navigate to /login
- Click "Sign in" with empty fields
- Expect: "Email is required" and "Password is required" visible
\`\`\`

The Planner's value is that it grounds the plan in the *actual* current UI -- it sees the real labels and flows, so the plan is not hallucinated from assumptions about how your app might be structured.

## Using the Generator Agent

The Generator consumes the Markdown plan and emits real, runnable TypeScript test files. It writes idiomatic Playwright with role-based locators, proper waits, and web-first assertions.

\`\`\`text
Use the Playwright Generator to convert test-plan.md into TypeScript
Playwright tests under tests/. Use role-based locators and
web-first assertions. One file per scenario group.
\`\`\`

From the auth plan above, the Generator produces something like:

\`\`\`ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('successful sign-up redirects to dashboard', async ({ page }) => {
    const email = \\\`user-\\\${Date.now()}@example.com\\\`;
    await page.goto('/signup');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('S3cure-pass!');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  });

  test('sign-up with existing email shows error', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Email').fill('taken@example.com');
    await page.getByLabel('Password').fill('S3cure-pass!');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Account already exists')).toBeVisible();
  });

  test('login validation flags empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });
});
\`\`\`

Notice the Generator leans on \`getByLabel\` and \`getByRole\` rather than CSS selectors. That is deliberate: role-based locators are resilient, and they are exactly what the Healer can repair most reliably later. The Generator is also where the TTC Global ~24.9% time savings shows up -- the boring scaffolding work of translating intent into syntax is what gets compressed.

## Using the Healer Agent

The Healer closes the loop. When a generated test later fails because the UI changed -- a button relabeled, an id removed -- the Healer reads the page's accessibility tree, finds the intended element by role and accessible name, rewrites the locator, and re-runs to confirm.

\`\`\`text
Run tests/auth.spec.ts. If a test fails on a stale locator, use the
Playwright Healer to inspect the current page, relocate the element by
role and accessible name, patch the test, and re-run until it passes.
Show me the diff -- do not commit automatically.
\`\`\`

A heal is a reviewable diff, not a silent rewrite:

\`\`\`diff
-  await page.getByRole('button', { name: 'Create account' }).click();
+  await page.getByRole('button', { name: 'Sign up free' }).click();
\`\`\`

The Healer succeeds on roughly 75%+ of selector-related failures, so it is a maintenance accelerator, not an autopilot -- always review heals before merging.

## The End-to-End Workflow: Plan, Generate, Run, Heal

Here is the full loop a team actually runs.

1. **Plan.** Run the Planner against the live feature to produce \`test-plan.md\`.
2. **Generate.** Run the Generator to turn the plan into spec files.
3. **Review.** A human reads the generated tests -- correctness is still your responsibility.
4. **Run.** Execute the suite locally and in CI.
5. **Heal.** On failure, the Healer proposes corrected locators as PR diffs.
6. **Iterate.** Re-run the Planner when the feature changes substantially to refresh coverage.

\`\`\`bash
# 1-2: plan + generate are driven through your AI client / MCP
# 4: run the suite
npx playwright test

# 5: heal on failure (proposes diffs, does not auto-commit)
npm run heal:propose
\`\`\`

The discipline that makes this trustworthy: the agents accelerate the work, but humans gate the output. The Generator scaffolds; you review. The Healer proposes; you approve. The Planner explores; you confirm coverage is right.

## How the Agents Work with Claude Code and MCP

The agents are not tied to a single client. They expose their capabilities through the Playwright MCP server, and any MCP-capable client can drive them. With **Claude Code**, you get a CLI-first loop: ask Claude to plan, generate, run, and heal, and it orchestrates the Playwright tools over MCP. With **GitHub Copilot** and other MCP clients, the same tools are available in-editor.

MCP matters because it standardizes how the AI client talks to Playwright -- the browser control, the accessibility snapshots, the trace inspection -- so you are not gluing together bespoke integrations. This is the same reason MCP is becoming the default integration layer across QA tooling, covered in [MCP for QA engineers](/blog/mcp-for-qa-engineers-guide). For a hands-on Claude Code setup, [Playwright test agents with Claude Code](/blog/playwright-test-agents-claude-code) is the companion to this guide.

## Running the Agents in CI

Planning and generation are usually interactive, local activities -- you supervise them while authoring a new test area. Healing, by contrast, is the agent step you most want available in CI, because that is where stale selectors surface. The safe CI pattern is **heal-and-propose, never heal-and-commit**: the unhealed test run is the gate, and any heal lands as a reviewable pull request.

\`\`\`yaml
name: e2e-agents
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps

      # The unhealed run is the source of truth -- green means tests pass alone
      - name: Run E2E tests
        run: npx playwright test

      # Only spend tokens when something actually broke
      - name: Propose heals on failure
        if: failure()
        run: npm run heal:propose
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
\`\`\`

Three rules keep this trustworthy and cheap:

1. **Gate on the unhealed run.** A build is green only when tests pass without a heal. The heal step never turns a red build green on its own.
2. **Heals are proposals.** The \`heal:propose\` script collects corrected locators and writes them to a branch or PR comment for human review -- it never pushes to main.
3. **Bound token spend.** Because healing runs only \`if: failure()\`, a healthy pipeline spends nothing; cost appears only when selectors genuinely break, usually right after a redesign.

This mirrors how a careful team treats any AI suggestion in CI: useful by default, but always behind a human gate before it touches the shared branch. If your suite is large, you can shard the test run and scope healing to only the failing shards to keep both wall-clock time and token spend down.

## Recommended Models and Cost

Because the agents are free and you pay only for tokens, model choice is the main cost lever. The right pick depends on the agent's job: planning and generation benefit from stronger reasoning, while healing is cheaper and more frequent.

| Agent task | Suggested model tier | Why | Relative cost |
|---|---|---|---|
| Planning | Frontier reasoning model | Exploration + scenario design needs judgment | Higher per run, run rarely |
| Generation | Strong coding model | Idiomatic, correct test code matters | Moderate, run per feature |
| Healing | Fast, capable model | Narrow task, runs often, must be cheap | Low per heal, frequency varies |

Practical cost guidance:

- Planning and generation are **one-time bursts** per feature -- spend on quality there.
- Healing is **failure-driven** -- it costs nothing when tests pass and scales with how often selectors break.
- Gate token-spending steps behind \`if: failure()\` in CI so you never pay for healing on a green build.

For teams deciding whether to build on these native agents or buy a managed platform, [autonomous testing build vs buy](/blog/autonomous-testing-agents-build-vs-buy) lays out the economics.

## When to Use the Agents -- and When Not To

The agents are a strong default for most UI test work, but they are not universal.

**Use the agents when:**

- You are scaffolding a new test area and want coverage fast.
- Your UI changes often and selector maintenance is eating time.
- You want tests that follow Playwright best practices by default.
- You have an MCP-capable client and an LLM budget.

**Be cautious or avoid when:**

- The flow involves complex, stateful business logic that needs human-designed assertions -- generate the skeleton, but write the critical assertions yourself.
- You are testing for genuine correctness bugs -- the Healer must never paper over a real regression.
- You lack accessibility semantics -- icon-only buttons with no labels give the agents little to anchor on.
- Determinism is paramount and you cannot tolerate any non-deterministic proposal without review.

The honest framing: the agents save real time (the ~24.9% authoring figure is credible), but they shift, not eliminate, the human role. You move from typing boilerplate to reviewing intent and assertions -- higher-leverage work, but still essential. Layering curated [/skills](/skills) on top gives the agents stronger, opinionated conventions to follow.

A useful way to think about adoption is to start narrow and widen with confidence. Pick one well-understood, high-traffic flow -- sign-up, login, or checkout -- and run the full plan-generate-run-heal loop on it. Measure two things over a few weeks: how much faster the initial authoring was, and how many selector failures the Healer absorbed without a human touching code. If those numbers are good, expand to the next flow. This incremental approach avoids the common failure mode of generating hundreds of tests at once, none of which anyone fully understands, and then drowning in non-deterministic heals you cannot confidently review. Quality of coverage beats raw quantity of tests every time, and the agents make it cheap to keep that coverage current once it is established. Pair this with a team convention that every generated spec and every healed diff gets a named reviewer, and you get the speed of agentic testing without surrendering the trust that makes a suite worth running.

## Frequently Asked Questions

### What are the Playwright AI agents?

Playwright ships three native AI agents: the Planner, the Generator, and the Healer. The Planner explores your app and writes a Markdown test plan, the Generator converts that plan into TypeScript Playwright tests, and the Healer diagnoses and patches failing tests. They are built into the framework, free to use, and pay-per-token, and they pair with clients like Claude Code through the Playwright MCP server.

### What is the difference between the Planner, Generator, and Healer?

The Planner answers "what should we test?" by exploring the live app and producing a Markdown plan. The Generator answers "turn the plan into code" by emitting runnable TypeScript test files. The Healer answers "keep tests green" by repairing failing selectors after UI changes. Planner and Generator are authoring tools you run per feature; the Healer is a maintenance tool that runs on failures.

### Are the Playwright AI agents free?

Yes, the agents themselves are free and part of the open-source framework. Your only cost is the LLM tokens they consume while reasoning. Planning and generation are one-time bursts per feature, and healing only spends tokens when a test actually fails, so a passing suite costs nothing to maintain on the agent side.

### How much time do Playwright AI agents actually save?

A TTC Global study found AI-assisted Playwright authoring saved roughly 24.9% of test-writing time. That is a meaningful productivity gain, primarily from compressing the boilerplate work of translating test intent into correct syntax. It is not zero-effort testing -- humans still review generated tests, design critical assertions, and approve healed diffs.

### Do the Playwright agents work with Claude Code?

Yes. The agents expose their capabilities through the Playwright MCP server, and any MCP-capable client can drive them. With Claude Code you get a CLI-first loop where you ask Claude to plan, generate, run, and heal, and it orchestrates the Playwright tools over MCP. GitHub Copilot and other MCP clients work the same way in-editor.

### Can I use the Generator without the Planner?

Yes, the agents can be used independently. If you already have a written test plan or specification, you can feed it directly to the Generator to produce TypeScript tests, skipping the Planner. Likewise, the Healer can repair any existing Playwright test, not only agent-generated ones. The full plan-generate-run-heal loop is the most powerful path, but each stage stands alone.

### Should I review tests generated by the agents?

Always. The Generator produces idiomatic, runnable code quickly, but correctness remains a human responsibility -- especially for assertions tied to business logic. Treat generated tests like a junior engineer's first draft: a strong starting point that needs review for coverage gaps, correct expected results, and any subtle behavior the agent could not infer from the UI alone.

### What do I need to start using the Playwright AI agents?

You need Playwright installed, the Playwright MCP server (\`@playwright/mcp\`) registered with an MCP-capable client such as Claude Code, an LLM API key, and a running application for the Planner to explore. Enabling tracing and screenshots in \`playwright.config.ts\` gives the Healer the page context it needs to repair failures reliably.

## Conclusion

The Playwright AI agents turn a four-step loop -- plan, generate, run, heal -- into the core of a modern testing workflow. The Planner grounds coverage in your real UI, the Generator scaffolds correct TypeScript fast, and the Healer keeps the suite alive as the app changes. They are free, MCP-native, and pair cleanly with Claude Code, with a credible ~24.9% authoring time saving. The catch is the same as always: agents accelerate the work, humans gate the output.

Want to give your agents stronger, opinionated testing conventions to follow? Explore curated Playwright and QA skills at [/skills](/skills) and plug expert patterns into your plan-generate-run-heal pipeline today.
`,
};
