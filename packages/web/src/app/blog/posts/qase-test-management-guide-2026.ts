import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Qase Test Management Guide 2026: Setup, API, Integrations',
  description:
    'A practical Qase tutorial for 2026 — core concepts, the REST API v1 with curl and fetch, Playwright reporter setup, CI integration, AI features, and Qase vs TestRail.',
  date: '2026-06-20',
  category: 'Guide',
  content: `
# Qase Test Management Guide 2026: Setup, API, and Integrations

Test management has quietly become one of the highest-leverage decisions a QA team makes. The tool you choose dictates how test cases are written, how runs are tracked, how automation results flow back to humans, and how easily leadership can see whether a release is safe to ship. For a long time that decision defaulted to whatever legacy tool the company already paid for. Qase is part of a newer generation of platforms built for teams that live in code, ship continuously, and want their manual and automated testing to share one source of truth. It pairs a clean web interface for writing and organizing test cases with a genuinely good REST API and first-class automation reporters, so the results from your Playwright, pytest, or JUnit runs land in the same place your manual testers work. This guide is a hands-on Qase tutorial for 2026. We will cover what Qase is, its core concepts -- projects, suites, test cases, runs, defects, and requirements -- and then get practical with the REST API v1 using both \`curl\` and JavaScript \`fetch\`. We will wire up the Playwright reporter, integrate everything into CI, look at the AI features Qase shipped through 2026, walk the pricing tiers, and finish with a clear-eyed comparison against TestRail and Zephyr so you can decide whether it fits your team.

## Key Takeaways

- **Qase** is a modern test management platform that unifies manual and automated testing in one place, with a strong API-first design.
- Its core entities -- **projects, suites, test cases, test runs, defects, and requirements** -- map cleanly onto how real QA teams already work.
- The **REST API v1** authenticates with a simple \`Token\` header and lets you script case creation, run management, and result reporting end to end.
- Official **automation reporters** (Playwright, pytest, JUnit, and more) push results into Qase automatically, so your CI run becomes a live test run.
- In 2026 Qase added meaningful **AI features** for case generation and triage, and its pricing remains friendlier than TestRail for growing teams.

---

## What Is Qase?

Qase is a cloud-based (with a self-hosted option) test management platform designed to be the home for everything related to testing quality: where test cases are authored and versioned, where test runs are executed and tracked, where defects are linked back to the cases that found them, and where automation results are collected and made human-readable. Unlike a spreadsheet or a generic project tool, Qase understands the domain -- it knows what a test case, a step, an expected result, and a run are, and it gives each a proper data model.

What sets it apart from older incumbents is its API-first philosophy. Every action you can take in the UI you can also take through the REST API, which means automation, custom dashboards, and integrations are first-class rather than afterthoughts. For teams that want their pipeline -- not a human clicking buttons -- to be the system of record for test results, that design choice is the whole ballgame.

Qase serves both manual QA engineers who need a structured place to write and execute cases and automation engineers who need their CI results to flow in without manual data entry. That dual audience is the product's core bet: one platform, both worlds, one source of truth.

## Core Concepts and Entities

Before touching the API, it helps to understand the data model. Qase organizes everything into a small set of entities that nest logically. Here is the core vocabulary:

| Entity | What it represents | Typical use |
|---|---|---|
| Project | A top-level container for one product or team | One project per application or major service |
| Suite | A folder grouping related test cases | Organize by feature, module, or page |
| Test case | A single scenario with steps and expected results | The atomic unit of testing |
| Test run | An execution of a set of cases at a point in time | A regression cycle or a CI run |
| Result | The outcome of one case within a run | Passed, failed, blocked, skipped |
| Defect | A linked bug found during testing | Connect a failure to a tracked issue |
| Requirement | A spec or user story cases trace back to | Map coverage to product requirements |

A **project** holds everything. Inside it, **suites** act like folders that organize **test cases** by feature or area. When you want to test, you create a **test run** that pulls in a selection of cases; executing each case produces a **result** (passed, failed, blocked, and so on). When a case fails, you can raise a **defect** and link it, and you can tie cases to **requirements** so coverage maps directly to product specs. This structure is intuitive precisely because it mirrors how teams already think about testing.

## Getting Started: Projects and Test Cases in the UI

Setting up Qase begins in the web app. Create an account, then create your first project -- give it a name and a short, uppercase project code (for example \`QAS\`) that will prefix every case and run. The code matters because the API uses it everywhere.

Inside the project, build a suite structure that mirrors your application. A common pattern is one top-level suite per major feature (Authentication, Checkout, Search) with sub-suites for finer areas. Then add test cases. Each case has a title, a description, a list of steps with an action and an expected result per step, plus metadata like severity, priority, and tags.

You can author cases by hand, import them from a CSV, or -- as we will see -- create them programmatically through the API. For automation-heavy teams, the API and reporters mean you may rarely create cases by hand at all; your test code becomes the source.

## The Qase REST API v1: Authentication

The Qase API is where the platform earns its "API-first" label. Everything runs over HTTPS against \`https://api.qase.io/v1\`, and authentication is refreshingly simple: you generate an API token in your account settings and pass it in a \`Token\` header on every request.

Here is a basic authenticated request that lists your projects, in \`curl\`:

\`\`\`bash
curl --request GET \\
  --url 'https://api.qase.io/v1/project' \\
  --header 'Token: YOUR_API_TOKEN' \\
  --header 'accept: application/json'
\`\`\`

The same call with JavaScript \`fetch\`:

\`\`\`javascript
const QASE_TOKEN = process.env.QASE_API_TOKEN;

const res = await fetch('https://api.qase.io/v1/project', {
  method: 'GET',
  headers: {
    Token: QASE_TOKEN,
    accept: 'application/json',
  },
});

const data = await res.json();
console.log(\`Found \${data.result.entities.length} projects\`);
\`\`\`

Keep the token in an environment variable, never in source control. Treat it like a password -- it can read and modify every project the account can access.

## Creating Test Cases via the API

Creating a case programmatically is a \`POST\` to the \`/case/{project_code}\` endpoint. You send a JSON body describing the case. Here is a \`curl\` example that creates a login test case in a project coded \`QAS\`:

\`\`\`bash
curl --request POST \\
  --url 'https://api.qase.io/v1/case/QAS' \\
  --header 'Token: YOUR_API_TOKEN' \\
  --header 'content-type: application/json' \\
  --data '{
    "title": "User can log in with valid credentials",
    "description": "Verifies the happy-path login flow",
    "severity": 4,
    "priority": 2,
    "steps": [
      {
        "action": "Navigate to the login page",
        "expected_result": "Login form is visible"
      },
      {
        "action": "Enter valid email and password and submit",
        "expected_result": "User is redirected to the dashboard"
      }
    ]
  }'
\`\`\`

And the equivalent with \`fetch\`, wrapped in a small helper so you can create many cases in a loop:

\`\`\`javascript
const QASE_TOKEN = process.env.QASE_API_TOKEN;
const PROJECT = 'QAS';

async function createCase(testCase) {
  const res = await fetch(\`https://api.qase.io/v1/case/\${PROJECT}\`, {
    method: 'POST',
    headers: {
      Token: QASE_TOKEN,
      'content-type': 'application/json',
    },
    body: JSON.stringify(testCase),
  });

  if (!res.ok) {
    throw new Error(\`Qase API error \${res.status}: \${await res.text()}\`);
  }

  const json = await res.json();
  return json.result.id; // the new case id
}

const id = await createCase({
  title: 'User can log in with valid credentials',
  severity: 4,
  priority: 2,
});
console.log(\`Created case #\${id}\`);
\`\`\`

The response returns the new case id, which you will use when reporting results against it.

## Creating a Test Run and Posting Results

The two API operations you will use most in automation are creating a run and posting results into it. A **run** is a container for a batch of results captured at one point in time -- typically one CI pipeline execution.

Create a run with a \`POST\` to \`/run/{project_code}\`:

\`\`\`bash
curl --request POST \\
  --url 'https://api.qase.io/v1/run/QAS' \\
  --header 'Token: YOUR_API_TOKEN' \\
  --header 'content-type: application/json' \\
  --data '{
    "title": "CI run - build 482",
    "description": "Automated nightly regression",
    "is_autotest": true
  }'
\`\`\`

The response gives you a run id. Now post a result for a specific case into that run with \`POST /result/{project_code}/{run_id}\`:

\`\`\`javascript
const QASE_TOKEN = process.env.QASE_API_TOKEN;
const PROJECT = 'QAS';

async function createRun(title) {
  const res = await fetch(\`https://api.qase.io/v1/run/\${PROJECT}\`, {
    method: 'POST',
    headers: { Token: QASE_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify({ title, is_autotest: true }),
  });
  const json = await res.json();
  return json.result.id;
}

async function postResult(runId, caseId, status, timeMs) {
  await fetch(\`https://api.qase.io/v1/result/\${PROJECT}/\${runId}\`, {
    method: 'POST',
    headers: { Token: QASE_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify({
      case_id: caseId,
      status, // 'passed' | 'failed' | 'blocked' | 'skipped'
      time_ms: timeMs,
    }),
  });
}

const runId = await createRun(\`CI run - \${new Date().toISOString()}\`);
await postResult(runId, 101, 'passed', 1240);
await postResult(runId, 102, 'failed', 3120);

// Close the run when all results are in
await fetch(\`https://api.qase.io/v1/run/\${PROJECT}/\${runId}/complete\`, {
  method: 'POST',
  headers: { Token: QASE_TOKEN },
});
console.log(\`Run \${runId} completed\`);
\`\`\`

That is the entire automation loop: create a run, post a result per test, complete the run. In practice you rarely write this by hand, because the official reporters do it for you -- which is the next section.

## Automation Reporters: Playwright, pytest, and JUnit

Qase ships official reporters for the major frameworks so your CI run becomes a Qase run automatically. The most popular in 2026 is \`playwright-qase-reporter\`. Install it and add it to your Playwright config:

\`\`\`bash
npm install --save-dev playwright-qase-reporter
\`\`\`

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    [
      'playwright-qase-reporter',
      {
        testops: {
          api: { token: process.env.QASE_API_TOKEN },
          project: 'QAS',
          run: {
            title: \`Playwright run \${process.env.GITHUB_RUN_ID ?? 'local'}\`,
            complete: true,
          },
        },
        // Send results to Qase only when the env flag is set
        mode: process.env.QASE_MODE ?? 'off',
      },
    ],
  ],
});
\`\`\`

You link a test to its Qase case with a small annotation in the test itself, so results map to the right case:

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';

test(qase(101, 'User can log in with valid credentials'), async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('correct-horse');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Welcome back')).toBeVisible();
});
\`\`\`

The pytest reporter (\`qase-pytest\`) and the generic JUnit XML importer follow the same idea: run your tests, and the reporter creates a run and posts every result. For pytest you decorate tests with \`@qase.id(101)\`; for any framework that emits JUnit XML, you upload the XML and Qase maps it.

## Integrating with CI

Wiring Qase into CI is mostly a matter of providing the token as a secret and flipping the reporter into "on" mode for the runs you want recorded. Here is a GitHub Actions job that runs Playwright and reports to Qase only on the main branch:

\`\`\`yaml
# .github/workflows/e2e.yml
name: E2E
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      QASE_API_TOKEN: \${{ secrets.QASE_API_TOKEN }}
      QASE_MODE: testops
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
\`\`\`

With \`QASE_MODE\` set to \`testops\`, each pipeline run creates a fresh Qase run, posts a result per test, and completes the run -- giving your team a live, browsable history of every CI execution without anyone touching the UI.

## AI Features in 2026

Through 2026 Qase leaned into AI-assisted testing in a few practical ways. The headline feature is AI test case generation: you paste a requirement, a user story, or a chunk of a spec, and Qase drafts structured test cases -- title, steps, and expected results -- that you review and accept. It turns the blank-page problem into an editing problem, which is far faster for most teams.

Beyond authoring, the AI features extend to triage and maintenance. When automated runs produce failures, AI-assisted grouping clusters similar failures so you triage a category instead of fifty individual results. There is also assistance for keeping cases current as the product changes, flagging cases that look stale relative to recent requirements. None of this replaces human judgment, but it removes the repetitive parts -- drafting boilerplate cases and sorting noisy failures -- so engineers spend time on the cases that actually need a human.

## Pricing Tiers Overview

Qase's pricing follows the familiar SaaS ladder, and the practical takeaway is that it tends to be more affordable than legacy incumbents at comparable team sizes. There is a free tier suitable for small teams and evaluation, a mid tier that unlocks the full API quota, automation reporters at scale, and integrations, and higher tiers that add SSO, audit logs, advanced roles, and the self-hosted/enterprise options larger organizations require.

The important nuance for automation teams is that the API and reporters are available early in the ladder, so you do not have to be on an enterprise contract to push CI results into Qase. Always confirm current numbers on the Qase site before budgeting, since SaaS pricing shifts, but the structural point holds: Qase is positioned as the value choice in this category.

## Qase vs TestRail vs Zephyr

The most common question teams ask is how Qase stacks up against the two biggest incumbents, TestRail and Zephyr. Here is a quick, honest comparison:

| Dimension | Qase | TestRail | Zephyr |
|---|---|---|---|
| API quality | Excellent, API-first | Solid but older | Good, Jira-centric |
| Automation reporters | Official, many frameworks | Available, less polished | Via Jira/plugins |
| Jira integration | Good | Good | Native (lives in Jira) |
| AI features (2026) | Strong, built-in | Growing | Varies by edition |
| Pricing | Friendly, free tier | Higher | Tied to Jira licensing |
| Best fit | Code-first, CI-driven teams | Established QA orgs | Teams all-in on Jira |

The short version: **Qase** is the strongest pick for teams that want their automation and CI to be the source of truth and value a clean API. **TestRail** is the safe, established choice for larger manual QA organizations with existing processes. **Zephyr** makes the most sense if your entire workflow already lives inside Jira and you want test management embedded there rather than alongside it. For a fuller breakdown across the whole category, read our [test management tools comparison for 2026](/blog/test-management-tools-comparison-2026) and our look at the [best test management tools beyond TestRail](/blog/best-test-management-tools-beyond-testrail-2026).

## A Practical Adoption Path

If you are migrating to or adopting Qase, a sane rollout looks like this. First, create one project and model a single feature's suites and cases by hand to learn the data model. Second, generate an API token and script the bulk creation of your existing cases, or import them from CSV. Third, add the reporter for your primary framework and run it locally in \`off\` mode to confirm the case mappings. Fourth, flip the reporter to \`on\` in CI for one pipeline and watch the runs appear. Finally, expand to the rest of your suites and teach the team the run-and-defect workflow. Done in that order, you get value at every step instead of a risky big-bang migration. To equip your AI coding agent with ready-made testing workflows that pair well with Qase, browse the [QA skills directory](/skills).

## Frequently Asked Questions

### What is Qase test management used for?

Qase is a test management platform used to author, organize, and execute test cases, track test runs, link defects, and collect automation results in one place. Manual QA engineers use it to write and run structured cases, while automation engineers use its reporters and API to push CI results in automatically. Its API-first design makes it a strong fit for teams that want their pipeline to be the source of truth.

### How do I authenticate with the Qase API?

Qase API authentication is simple. Generate an API token in your account settings, then send it in a \`Token\` header on every request to \`https://api.qase.io/v1\`. For example, \`curl --header 'Token: YOUR_API_TOKEN'\`. Store the token in an environment variable or CI secret -- never in source control -- because it can read and modify every project the account can access.

### How do I integrate Qase with Playwright in 2026?

Install \`playwright-qase-reporter\`, add it to the \`reporter\` array in \`playwright.config.ts\` with your API token and project code, and annotate each test with \`qase(caseId, title)\` to map it to a Qase case. Set the reporter mode to \`testops\` in CI so each run creates a Qase run and posts results automatically. Keep it \`off\` locally to avoid polluting your run history.

### What is the difference between a test case and a test run in Qase?

A test case is the reusable definition of a single scenario -- its steps and expected results -- that lives permanently in a suite. A test run is a point-in-time execution that pulls in a selection of cases and records their outcomes (passed, failed, blocked, skipped). You write a case once and execute it across many runs, so cases are your library and runs are the history of how that library performed.

### Is Qase better than TestRail?

It depends on your team. Qase is generally stronger for code-first, CI-driven teams because of its API-first design, official automation reporters, built-in AI features, and friendlier pricing including a free tier. TestRail remains a safe, established choice for larger manual QA organizations with mature existing processes. For automation-heavy teams adopting in 2026, Qase usually wins on developer experience and cost.

### Can I create Qase test cases programmatically?

Yes. Send a \`POST\` request to \`https://api.qase.io/v1/case/{project_code}\` with a JSON body containing the title, optional description, severity, priority, and a steps array of action plus expected result. The response returns the new case id, which you use when posting results. This makes it easy to bulk-create cases from a script or generate them from your test code rather than entering each one by hand in the UI.

### Does Qase have a free plan?

Yes, Qase offers a free tier suitable for small teams and evaluation, and the API plus automation reporters are available early in the pricing ladder rather than gated behind an enterprise contract. Paid tiers add larger API quotas, advanced integrations, SSO, audit logs, and self-hosted options. Always confirm the current limits and prices on the Qase website before budgeting, since SaaS pricing changes over time.

## Conclusion

Qase earns its place in the modern QA stack by treating automation as a first-class citizen instead of an afterthought. Its clean data model -- projects, suites, cases, runs, defects, and requirements -- mirrors how teams already think, while its API-first design and official reporters let your Playwright, pytest, or JUnit runs become the live source of truth without anyone copying results by hand. Pair that with 2026's AI-assisted case generation and triage, friendly pricing, and a genuinely good REST API, and you have a platform that scales from a solo tester to a large, CI-driven organization. Start small: create a project, generate a token, wire up the reporter for your main framework, and watch your CI runs flow in. Then explore the [QA skills directory](/skills) to give your AI coding agent the testing skills that make Qase even more powerful.
`,
};
