import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Test Agents: Planner, Generator, Healer Guide 2026',
  description: 'Build Playwright test agents with planner, generator, and healer roles. AI-driven test creation, execution, and self-healing patterns with TypeScript examples.',
  date: '2026-05-04',
  category: 'Guide',
  content: `
# Playwright Test Agents: Planner, Generator, Healer Guide 2026

The Playwright Test Agents pattern formalizes what teams have been doing informally with Claude Code and Cursor since 2024: divide AI-driven test work into three specialized roles. A planner reads a feature spec and decides what tests to write. A generator turns those plans into runnable Playwright TypeScript. A healer watches failing tests, diagnoses the cause, and either fixes the test or files a bug. In 2026 these three roles are the dominant mental model for agentic testing because they map cleanly to LLM strengths and to the Playwright tool surface exposed by MCP.

This guide walks through each role in depth: prompt templates, tool surfaces, evaluation criteria, and the orchestration patterns that connect them. Every example uses Playwright 1.49+, the MCP server, and TypeScript. You will end with a working three-agent pipeline that you can wire into your CI or run locally as a Claude Code skill.

For background on agents in QA generally, read [Agentic Testing Complete Guide](/blog/agentic-testing-complete-guide). For MCP server setup, see [Playwright MCP Server Configuration 2026](/blog/playwright-mcp-server-configuration-2026). Install the [playwright-e2e skill](/skills/playwright-e2e) so your assistant has the patterns baked in.

## The three roles

Each agent has a narrow scope and a deterministic output format.

| Agent | Input | Output | Tool surface |
|---|---|---|---|
| Planner | Feature spec, existing test suite | Test plan (list of scenarios) | Read-only: docs, existing tests |
| Generator | Test plan, app under test | Playwright spec files | Read + execute: MCP browser, file system |
| Healer | Failing test, trace, source | Patch (or bug report) | Read trace, edit test, rerun |

Separating roles produces tighter prompts, lower hallucination rates, and easier evals because each agent has a single job. Composing them into a pipeline produces end-to-end automation that scales.

## The planner

The planner reads a feature spec or user story and produces a numbered list of test scenarios. It does not write code. It needs only docs, the existing test suite (to avoid duplication), and a strong understanding of behavior-driven testing.

### Planner prompt template

\`\`\`text
You are a senior QA planner.

Feature: {{feature_description}}
Existing tests: {{existing_tests}}
Risk areas: {{risk_areas}}

Produce a numbered list of test scenarios. Each scenario has:
- A short title (under 60 chars)
- A one-sentence "given/when/then" summary
- The expected severity if it fails (smoke, regression, edge)
- Any preconditions or data setup required

Aim for 5-15 scenarios. Cover happy path, edge cases, error states, and accessibility. Skip scenarios already covered by the existing tests.
Return strict JSON.
\`\`\`

### Planner output

\`\`\`json
[
  {
    "id": 1,
    "title": "User completes checkout with one item",
    "summary": "Given a logged-in user with one item in cart, when they submit the checkout form, then they see the order confirmation page.",
    "severity": "smoke",
    "preconditions": ["user authenticated", "cart has 1 item"]
  },
  {
    "id": 2,
    "title": "Shows validation when shipping address is empty",
    "summary": "Given a logged-in user at the checkout page, when they submit with an empty shipping address, then they see a required-field error.",
    "severity": "regression",
    "preconditions": ["user authenticated"]
  }
]
\`\`\`

### Implementing the planner

\`\`\`typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function plan(featureDescription: string, existingTests: string[]) {
  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    system: 'You are a senior QA planner.',
    messages: [
      {
        role: 'user',
        content: \`Feature: \${featureDescription}\\nExisting tests:\\n\${existingTests.join('\\n')}\\n\\nProduce a JSON list of test scenarios as specified.\`,
      },
    ],
  });
  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return JSON.parse(text);
}
\`\`\`

## The generator

The generator converts a single scenario into a runnable Playwright spec. It calls MCP tools to navigate the actual app, identify accessible elements, and write the assertions that match the rendered DOM.

### Generator prompt template

\`\`\`text
You are a Playwright TypeScript test generator.

Scenario: {{scenario_json}}
Base URL: {{base_url}}
Existing page objects: {{page_objects}}

Procedure:
1. Use browser_navigate to load relevant pages.
2. Use browser_snapshot to read the accessibility tree.
3. Identify elements by role and accessible name.
4. Generate a Playwright spec that:
   - Uses getByRole / getByLabel / getByText (prefer in that order)
   - Avoids waitForTimeout; rely on auto-waiting locators
   - Includes one positive assertion per scenario
   - Captures @smoke / @regression tags as per severity
5. Write the spec to tests/generated/<slug>.spec.ts and return the diff.
\`\`\`

### Example generated spec

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('@smoke Checkout', () => {
  test('user completes checkout with one item', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: 'Review your order' })).toBeVisible();
    await page.getByLabel('Full name').fill('Asha Patel');
    await page.getByLabel('Email').fill('asha@example.com');
    await page.getByLabel('Shipping address').fill('221B Baker Street, London');
    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
  });
});
\`\`\`

### Implementing the generator

\`\`\`typescript
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

export async function generate(scenario: Scenario, baseURL: string) {
  // Connect to MCP, navigate, snapshot, derive spec
  const snapshot = await mcpCall('browser_navigate', { url: baseURL });
  const tree = await mcpCall('browser_snapshot', {});

  const spec = await llmGenerateSpec(scenario, tree);
  const slug = scenario.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  await fs.writeFile(\`tests/generated/\${slug}.spec.ts\`, spec, 'utf8');
  return { path: \`tests/generated/\${slug}.spec.ts\`, content: spec };
}
\`\`\`

## The healer

When a generated test fails, the healer reads the trace, identifies the root cause, and either patches the test or files a bug. It is the role that turns flaky automation into trustworthy automation.

### Healer prompt template

\`\`\`text
You are a Playwright test healer.

Failing test: {{spec_path}}
Test source: {{source}}
Error: {{error_message}}
Trace: {{trace_summary}}

Determine whether the failure is:
A) A bug in the application under test
B) A drift in the test (locator, assertion, or timing issue)
C) An environment issue (flaky network, missing data)

Procedure:
1. If A: emit a bug report with reproduction steps. Do not edit the test.
2. If B: produce a minimal patch to the spec. Include reasoning.
3. If C: add a retry annotation and/or a wait-for-network-idle. Note environment dependency.
\`\`\`

### Healer decision tree

| Symptom | Likely cause | Action |
|---|---|---|
| \`expect(locator).toBeVisible()\` times out, but the element exists in trace | Locator changed | Update locator |
| Assertion runs before network completes | Missing wait | Add \`page.waitForResponse\` or assertion on response |
| Page returns 500 | App bug | File bug report |
| Snapshot shows correct DOM but click missed | Animation in progress | Add \`expect.toBeEnabled()\` before click |
| Test fails only in CI | Environment drift | Add to flaky list, retry once |
| Test fails after dependency upgrade | API contract change | Update fixture or call signature |

### Implementing the healer

\`\`\`typescript
import { promises as fs } from 'fs';

export async function heal(testPath: string, error: string, tracePath: string) {
  const source = await fs.readFile(testPath, 'utf8');
  const trace = await summarizeTrace(tracePath);

  const decision = await llmDiagnose({ source, error, trace });
  switch (decision.classification) {
    case 'bug':
      return fileBugReport(decision);
    case 'drift':
      return applyPatch(testPath, decision.patch);
    case 'env':
      return annotateRetry(testPath, decision.reason);
  }
}
\`\`\`

## The orchestrator

The pipeline runs planner -> generator -> test execution -> healer in a loop until tests pass or the iteration budget is exhausted.

\`\`\`typescript
import { plan } from './planner';
import { generate } from './generator';
import { runTest } from './runner';
import { heal } from './healer';

const MAX_ITERATIONS = 3;

export async function run(feature: string) {
  const existing = await readExistingTests();
  const scenarios = await plan(feature, existing);

  for (const scenario of scenarios) {
    let iteration = 0;
    let success = false;
    while (!success && iteration < MAX_ITERATIONS) {
      const { path } = await generate(scenario, process.env.BASE_URL!);
      const result = await runTest(path);
      if (result.status === 'passed') {
        success = true;
      } else {
        await heal(path, result.error!, result.trace!);
        iteration++;
      }
    }
    if (!success) {
      console.log(\`Scenario "\${scenario.title}" needs human review\`);
    }
  }
}
\`\`\`

## Evals for each agent

Each agent has metrics you can evaluate independently.

| Agent | Metric | Target |
|---|---|---|
| Planner | Coverage vs human spec | 80%+ scenario overlap |
| Planner | Duplicate suppression | < 5% duplicates vs existing tests |
| Generator | First-pass spec pass rate | 60%+ |
| Generator | Locator stability (role-based) | 90%+ getByRole/getByLabel |
| Healer | Correct diagnosis | 80%+ matches human triage |
| Healer | Patches that pass on next run | 70%+ |

Pin these in your CI so model regressions surface as eval failures.

## Tool surface restrictions

Generators and healers need much narrower MCP access than a general-purpose assistant. A typical safe config:

\`\`\`bash
npx @playwright/mcp \\
  --caps core,navigation,interaction,snapshot,screenshot \\
  --isolated \\
  --allowed-origins https://staging.qaskills.sh
\`\`\`

The planner needs no browser access at all; it reads docs and code.

## Human in the loop

Even with retries and healing, some scenarios need a human. Insert checkpoints:

\`\`\`typescript
if (iteration >= 2 && !success) {
  await postSlackMessage({
    channel: '#qa-review',
    text: \`Healer could not auto-fix \${scenario.title}. Trace: \${result.trace}\`,
  });
  break;
}
\`\`\`

Always log the agent's reasoning so the human reviewer understands why a test failed and what the healer attempted.

## Common pitfalls

**Pitfall 1: Letting the generator pick CSS selectors.** Even with prompts demanding role-based locators, generators reach for \`.btn-primary\` when stressed. Add a post-generation validator that rejects specs using \`page.locator('.\`.

**Pitfall 2: Healer rewriting the assertion.** A test failing because the assertion is now wrong is sometimes a bug, not drift. Healers that "fix" the assertion to match the buggy app silently mask regressions. Bias the prompt toward "is the test wrong or the app wrong" and require human review for assertion changes.

**Pitfall 3: Infinite healing loops.** Cap iterations. Without a budget, the healer can patch the same line into oscillating forms forever.

**Pitfall 4: Stale snapshots.** Generators that cache a snapshot across multiple tool calls produce drift. Re-snapshot after every navigation.

**Pitfall 5: No eval pipeline.** Agents drift quietly as models change. Without evals you do not notice until production breaks.

## Anti-patterns

- One agent that plans, generates, and heals all in one prompt. The prompt is too long, the context window fills, and the model becomes worse at each role.
- Skipping the planner and going straight from feature spec to spec file. Planning forces explicit scenario selection and prevents the generator from missing edge cases.
- Letting the healer commit patches directly to main. Always open a PR.
- Treating the generator's output as final. Always run the spec before claiming success.

## Productionizing the pipeline

Wire the orchestrator into CI so every new feature gets a test stub.

\`\`\`yaml
on:
  pull_request:
    paths:
      - 'docs/specs/**'
jobs:
  generate-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec ts-node scripts/agentic-test-pipeline.ts
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
      - uses: peter-evans/create-pull-request@v6
        with:
          title: "Generated tests for \${{ github.event.pull_request.title }}"
          branch: agentic-tests-\${{ github.sha }}
\`\`\`

For CI patterns generally, read [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026).

## Conclusion and next steps

Splitting agentic testing into planner, generator, and healer matches LLM strengths and keeps prompts tractable. The result is a pipeline that scales with your product without scaling with your QA headcount, while keeping humans in the loop where judgment is required.

Install the [playwright-e2e skill](/skills/playwright-e2e) so Claude Code and Cursor follow the same patterns. Pair with [Playwright MCP Accessibility Snapshots Reference](/blog/playwright-mcp-accessibility-snapshots-reference) to understand what each agent sees. For broader AI agent workflows in QA, read [Claude for QA Engineers Complete Guide](/blog/claude-for-qa-engineers-complete-guide).
`,
};
