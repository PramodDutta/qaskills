import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright slow Test Annotation and Timeout Budgets Without Hiding Real Slowness',
  description: 'Use playwright slow test annotation timeout budget practices to isolate truly slow flows, avoid flaky retries, and keep CI feedback fast under real suite pressure.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Playwright slow Test Annotation and Timeout Budgets Without Hiding Real Slowness

Playwright \`test.slow\` is a timeout signal, not a performance strategy. It marks a test as slow and increases the test timeout, which is useful for genuinely long workflows such as first-run onboarding, multi-step checkout, report generation, or cross-browser setup. It becomes harmful when teams use it to silence flaky waits, underpowered selectors, slow fixtures, or overloaded CI workers.

A good Playwright slow test annotation timeout budget starts with one question: which part of this scenario deserves time? The whole test, one assertion, one navigation, an external setup call, or a fixture? When you answer that precisely, you can apply the smallest timeout increase that keeps the suite honest. When you do not, every slow annotation becomes a hiding place for product regressions.

This article gives QA and test-automation engineers a concrete workflow for budgeting slow tests. It covers \`test.slow\`, \`test.setTimeout\`, assertion-level timeouts, fixture timing, annotations, CI reporting, and diagnosis when a timeout increase makes failures rarer but not actually fixed. For broader framework tradeoffs, read [JavaScript Testing Frameworks Complete Guide 2026](/blog/javascript-testing-frameworks-complete-guide-2026). If your timeout is caused by unstable element discovery, pair this with [Playwright Best Practices Locators 2026](/blog/playwright-best-practices-locators-2026) before increasing budgets.

## Start with a timeout inventory

Timeouts are not all the same. A Playwright test can fail because the whole test exceeded its budget, because an assertion did not become true, because an action waited for actionability, because navigation took too long, or because a fixture spent too much time in setup. Raising the entire test timeout treats all of those causes as equivalent. They are not equivalent.

Build a quick inventory before changing a timeout:

| Timeout pressure | Better first question | Likely fix | Avoid |
|---|---|---|---|
| Whole test exceeds timeout | Is the scenario too broad for one test? | Split flow or mark a known long path slow | Raising all project timeouts |
| One assertion waits too long | Is the expected state eventually consistent? | Assertion-specific timeout | Adding arbitrary sleep |
| Click waits forever | Is the locator correct and actionable? | Better locator, disabled state check, UI fix | Marking the test slow |
| Navigation is slow | Is the page doing real work or waiting on a dependency? | Mock dependency, measure backend, targeted timeout | Blindly retrying the navigation |
| Fixture setup dominates | Is data creation too expensive? | Worker-scoped setup or API seed optimization | Hiding setup cost inside every test |

The inventory gives reviewers a shared vocabulary. Instead of saying "this test is flaky, increase timeout," a pull request can say "the PDF export is an intentionally long server job, so the export assertion gets a larger expectation timeout while the rest of the test keeps the default budget." That is a much stronger engineering argument.

## Use test.slow for known long scenarios

\`test.slow\` is appropriate when the scenario is intentionally longer than typical tests and still valuable as a single end-to-end workflow. Playwright documents it as a way to mark a test slow and give it a larger timeout. The annotation also communicates intent to future maintainers.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('new organization onboarding provisions the default workspace', async ({ page }) => {
  test.slow();

  await page.goto('/signup');
  await page.getByLabel('Work email').fill('owner@example.test');
  await page.getByRole('button', { name: 'Create organization' }).click();

  await expect(page.getByRole('heading', { name: 'Create your workspace' })).toBeVisible();
  await page.getByLabel('Workspace name').fill('QA Automation Lab');
  await page.getByRole('button', { name: 'Finish setup' }).click();

  await expect(page.getByRole('heading', { name: 'Welcome to QA Automation Lab' })).toBeVisible();
});
\`\`\`

This is a reasonable use because the flow covers a high-value user journey and includes provisioning that may legitimately take longer than a simple CRUD test. It is still not a reason to let the test sprawl forever. If onboarding grows to include billing, team invites, sample data, and product tour completion, split the flow into smaller tests with shared setup.

You can also make the slow marker conditional. That is useful when one browser or project is known to run a path more slowly due to rendering or device constraints.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('dashboard renders the large analytics chart', async ({ page, browserName }) => {
  test.slow(browserName === 'webkit', 'Chart rendering is slower in the WebKit project');

  await page.goto('/analytics/large-account');
  await expect(page.getByRole('img', { name: 'Revenue by region' })).toBeVisible();
  await expect(page.getByText('Last updated')).toBeVisible();
});
\`\`\`

Conditional slow annotations should be rare and documented with a reason. If every WebKit test is slow, the project configuration or application behavior needs attention. If one chart-heavy scenario is slower in one project, a conditional annotation is a practical compromise.

## Prefer the smallest timeout surface

\`test.setTimeout\` changes the timeout for the test where it is called. It is useful when the required budget is specific and easier to understand as an exact number than as a slow marker. The risk is that an exact budget can outlive the reason it was added. When using it, add a comment or annotation that names the external reason.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('audit export completes and becomes downloadable', async ({ page }) => {
  test.setTimeout(90_000);
  test.info().annotations.push({
    type: 'timeout-budget',
    description: 'Audit export waits for the asynchronous report worker',
  });

  await page.goto('/admin/audit-log');
  await page.getByRole('button', { name: 'Export CSV' }).click();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download when ready' }).click();
  const file = await download;

  expect(file.suggestedFilename()).toContain('audit');
});
\`\`\`

This example extends only the test that waits for the asynchronous report worker. It does not raise the timeout for every Playwright test in the repository. That distinction is important because global timeout increases make slow regressions harder to notice.

Use this matrix when deciding where to place a timeout:

| Need | Control to consider | Scope | Review question |
|---|---|---|---|
| One intentionally long scenario | \`test.slow\` | One test | Is the scenario still cohesive? |
| One exact known budget | \`test.setTimeout\` | One test | Why this number and why here? |
| One eventual assertion | \`expect(locator).toBeVisible({ timeout })\` | One assertion | Is the eventual behavior expected? |
| Most tests in a project | Playwright config timeout | Project or suite | Is CI capacity or app speed changing? |
| Slow external setup | Fixture or API optimization | Setup boundary | Can setup move to worker scope safely? |

The best timeout is the one that tells the next reader what is slow. A broad timeout tells them very little.

## Separate assertion patience from test patience

Many Playwright "slow tests" are actually one slow assertion surrounded by fast setup and fast cleanup. If the product uses eventual consistency, a queue, search indexing, or cache invalidation, a targeted assertion timeout is usually cleaner than marking the whole test slow.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('created article appears in search results', async ({ page, request }) => {
  await request.post('/api/test/articles', {
    data: {
      title: 'Timeout Budget Search Article',
      body: 'A test article that should be indexed',
    },
  });

  await page.goto('/search');
  await page.getByRole('searchbox', { name: 'Search' }).fill('Timeout Budget Search Article');

  await expect(page.getByRole('link', { name: 'Timeout Budget Search Article' })).toBeVisible({
    timeout: 20_000,
  });
});
\`\`\`

The larger budget belongs to the indexing expectation, not to the click, not to the navigation, and not to the whole test. If the assertion times out, the failure points at search indexing rather than suggesting that the test was generally too slow.

This pattern works well with AI coding agents. When an agent sees a targeted assertion timeout, it can infer that eventual consistency is part of the product contract. When it sees a large test-level timeout, it has less signal about where to investigate.

## Keep config defaults strict enough to expose drift

Project defaults should be strict enough to catch accidental slowness. They should also be realistic for the CI hardware where tests run. A local laptop and a two-core CI runner do not have the same profile. That does not mean you should inflate every timeout. It means you should measure the suite and set defaults that match routine behavior, then handle exceptional flows explicitly.

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: 'on-first-retry',
  },
  reporter: [['html'], ['list']],
});
\`\`\`

The values above are examples, not universal recommendations. The important part is the separation. The whole test has a budget, assertions have their own default, actions and navigation can be bounded, and traces are available when retries happen. If your suite needs different values, set them deliberately and document the reason.

Avoid copying timeout values from another team without context. A suite that tests a static documentation site has different needs than a suite that provisions accounts, waits for emails, and verifies reports. The budget should fit the application and the risk profile.

## Turn slow annotations into reportable signals

Annotations are useful only if people can see them. \`test.slow\` marks a test, but teams often need a separate audit of which tests have grown special budgets. You can add a custom annotation alongside the timeout change so the report explains the reason.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('scheduled billing invoice is generated overnight', async ({ page }) => {
  test.slow();
  test.info().annotations.push({
    type: 'slow-reason',
    description: 'Covers invoice generation through the scheduled billing path',
  });

  await page.goto('/billing/invoices');
  await page.getByRole('button', { name: 'Generate test invoice' }).click();
  await expect(page.getByText('Invoice ready')).toBeVisible({ timeout: 45_000 });
});
\`\`\`

For larger suites, create a small convention:

| Annotation type | Required description | Owner | Review cadence |
|---|---|---|---|
| \`slow-reason\` | Product behavior that needs extra time | Test owner | Monthly or release cycle |
| \`timeout-budget\` | Exact dependency or boundary | QA platform | When budget changes |
| \`external-dependency\` | Provider or service name | Team owning integration | Before CI environment changes |
| \`known-performance-risk\` | Link-free short summary of risk | Product team | After performance work |

Do not rely on tribal memory. If a timeout has no reason, future maintainers will either delete it recklessly or copy it everywhere.

## Measure before splitting or increasing

When a test starts timing out, collect timing by step before changing the budget. Playwright reports steps, and you can also add simple timing around application-specific boundaries. The goal is to discover whether the time is spent in setup, navigation, user interaction, backend processing, or assertion waiting.

\`\`\`ts
import { test, expect } from '@playwright/test';

async function timed<T>(
  name: string,
  action: () => Promise<T>,
  timings: Record<string, number>,
): Promise<T> {
  const started = Date.now();
  try {
    return await action();
  } finally {
    timings[name] = Date.now() - started;
  }
}

test('account deletion removes the user from admin search', async ({ page }, testInfo) => {
  const timings: Record<string, number> = {};

  await timed('open-settings', () => page.goto('/settings/account'), timings);
  await timed('delete-account', async () => {
    await page.getByRole('button', { name: 'Delete account' }).click();
    await page.getByRole('button', { name: 'Confirm delete' }).click();
  }, timings);
  await timed('check-admin-search', async () => {
    await page.goto('/admin/users');
    await expect(page.getByText('deleted-user@example.test')).toBeHidden({ timeout: 20_000 });
  }, timings);

  await testInfo.attach('timeout-timings.json', {
    body: JSON.stringify(timings, null, 2),
    contentType: 'application/json',
  });
});
\`\`\`

If \`open-settings\` is slow, the issue may be app boot or navigation. If \`delete-account\` is slow, the product operation needs analysis. If \`check-admin-search\` is slow, the search index or cache invalidation path is the likely boundary. Without timing, a larger timeout is guesswork.

## Diagnose the timeout that disappears after test.slow

A realistic failure mode: a test times out in CI, someone adds \`test.slow\`, and the suite turns green for a week. Then the same test fails again, but now it fails after a longer wait. The slow annotation did not fix the underlying problem. It only widened the window.

Diagnose it in this order:

| Symptom | What to inspect | Likely cause | Better response |
|---|---|---|---|
| Fails before first assertion | Fixture setup and authentication | Slow seed path or reused state conflict | Optimize setup, isolate data |
| Fails waiting for locator | Locator, actionability, UI state | Wrong element or hidden overlay | Fix locator or product behavior |
| Fails only under parallelism | Worker data and shared accounts | Tests mutate shared state | Unique data per worker |
| Fails on one browser | Rendering or browser-specific behavior | Product compatibility issue | Conditional slow only after evidence |
| Fails after retries | External dependency variance | Network or provider instability | Mock or contract-test boundary |

The key insight is that timeout changes should follow diagnosis, not replace it. If the root cause is a missing accessible name, \`test.slow\` is the wrong tool. If the root cause is a legitimate asynchronous report worker, a targeted budget makes sense.

## What people get wrong about slow tests

The first misconception is that a slow test is automatically a bad test. Some end-to-end tests are valuable precisely because they cover long, cross-service workflows that unit tests cannot prove. The problem is not slowness by itself. The problem is unexplained slowness that spreads through the suite.

The second misconception is that retries and slow annotations solve the same problem. Retries reduce noise from intermittent failure. Slow annotations increase the time allowed for a test. A test that fails because the wrong element is clicked can fail with or without a larger timeout. A test that fails because an external job takes thirty seconds may pass with a larger assertion budget and no retry.

The third misconception is that local timing is enough. CI has different CPU, network, browser install, and parallelism characteristics. Measure in CI before concluding that a timeout is unreasonable.

## Build a timeout-budget review habit

Timeout budgets should be visible in code review. A small review template can prevent casual increases from becoming permanent suite debt.

\`\`\`md
Timeout budget review:

- What operation needs more time?
- Is the added budget test-level, assertion-level, or configuration-level?
- What evidence shows this is expected behavior rather than flakiness?
- Could the setup be moved, mocked, or split?
- When should this budget be reviewed again?
\`\`\`

This is especially useful when an AI coding agent proposes a fix. Agents often choose the fastest green path: add a wait, increase a timeout, or mark the test slow. Give the agent the review checklist and require evidence from trace, timings, or product behavior before accepting the change.

## A practical policy for large suites

Large Playwright suites need rules that are simple enough to follow. Here is a policy that works for many QA teams:

| Rule | Rationale | Exception path |
|---|---|---|
| Do not raise global timeout to fix one test | Protects feedback speed | Project-level change with timing report |
| Every \`test.slow\` needs a reason | Prevents invisible debt | Short custom annotation |
| Prefer assertion timeout for eventual state | Keeps failure localized | Test-level budget for cohesive long flow |
| Attach timing evidence when changing budgets | Makes review factual | Existing CI report may be enough |
| Revisit slow tests periodically | Product speed changes over time | Keep permanent only for contractual long jobs |

The policy should not create bureaucracy. It should make the intent of slow tests obvious enough that maintainers can keep the suite fast while preserving high-value coverage.

## Separate PR, nightly, and release budgets

One timeout policy rarely fits every workflow. Pull request tests should protect feedback speed. Nightly tests can spend more time on deep flows, broader browser matrices, and slower data states. Release candidate tests may justify the richest coverage because they support a shipping decision. If all three workflows share the same timeout posture, one of them is usually wrong.

The common mistake is increasing PR timeouts because the nightly suite found a long scenario. That makes every developer pay for a workflow that may not belong in the pull request gate. A better approach is to classify slow tests by the decision they support. A slow onboarding test may be valuable in PR if onboarding changes often. A slow historical report export might belong in nightly unless the pull request touches reporting.

| Workflow | Timeout posture | Slow test policy | Main risk |
|---|---|---|---|
| Pull request | Tight defaults, few exceptions | Only high-signal journeys with documented reason | Blocking developers with low-value waiting |
| Main branch | Similar to PR with post-merge stability checks | Keep slow tests that catch integration regressions | Missing a merge-only failure |
| Nightly | Broader budgets and matrix | Run expensive flows and edge states | Treating nightly failures as optional noise |
| Release candidate | Explicit signoff budgets | Include contractual long jobs and critical journeys | Shipping with uninvestigated slow failures |

This classification also helps agents and maintainers decide where a new test belongs. If a generated test needs \`test.slow\` because it drives a ten-step admin report journey, the reviewer should ask whether that journey belongs in the PR suite. The answer may be yes, but it should be based on risk, not on the fact that the test already exists.

Use Playwright projects or CI commands to split these workflows. The exact implementation depends on your repository, but the principle is stable: the fast gate should stay fast, and the expensive gate should produce evidence people actually review.

\`\`\`ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'pr-chromium',
      grepInvert: /@nightly/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'nightly-chromium',
      grep: /@nightly/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
\`\`\`

In your real \`playwright.config.ts\`, the example is just normal TypeScript.

Tags are not a cure for poor suite design. They are a routing tool. If every slow test is tagged nightly because the PR gate is under pressure, the team may stop trusting nightly results. If every test stays in PR, developers wait too long. Keep the split tied to product risk.

## Distinguish CI capacity problems from application slowness

Sometimes a timeout increase is requested because CI is overloaded, not because the product is slow. The symptoms are different. CI capacity problems often affect many unrelated tests at once, appear during busy hours, or correlate with worker count changes. Product slowness usually clusters around a feature, endpoint, page, or browser project.

Before raising Playwright timeouts, compare three measurements: local run time, CI run time with the normal worker count, and CI run time with reduced parallelism. If reducing parallelism makes failures disappear, the issue may be CPU, memory, database contention, or shared service load. If the same feature remains slow under low parallelism, the product path deserves investigation.

| Observation | More likely cause | Timeout response |
|---|---|---|
| Many unrelated tests slow down together | CI worker capacity or shared environment | Fix capacity, reduce workers, or isolate services |
| Only report export tests slow down | Product job or report dependency | Targeted budget and product timing evidence |
| One browser project is consistently slower | Browser-specific rendering or project settings | Conditional annotation after evidence |
| Failures spike after increasing workers | Shared data or environment contention | Improve isolation before changing timeout |
| Local and CI both slow in the same step | Application behavior | Budget only if the behavior is expected |

The difference matters because timeout budgets are a poor solution for resource starvation. A larger timeout may make the suite greener while CI remains unhealthy. The next symptom will be more retries, longer queues, and harder-to-reproduce failures.

Add a temporary timing attachment when diagnosing capacity:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('search results timing probe', async ({ page }, testInfo) => {
  const started = Date.now();

  await page.goto('/search');
  const afterNavigation = Date.now();
  await page.getByRole('searchbox', { name: 'Search' }).fill('billing');
  await expect(page.getByRole('link', { name: 'Billing settings' })).toBeVisible();
  const afterAssertion = Date.now();

  await testInfo.attach('timing-probe.json', {
    body: JSON.stringify({
      navigationMs: afterNavigation - started,
      assertionMs: afterAssertion - afterNavigation,
      workerIndex: testInfo.workerIndex,
      project: testInfo.project.name,
    }, null, 2),
    contentType: 'application/json',
  });
});
\`\`\`

Keep probes temporary unless they are useful diagnostics for a known risky flow. The intent is to gather evidence for a budget decision, not to turn every test into a performance report.

## Review slow annotations as suite debt with owners

A slow annotation is not automatically bad, but it is still a maintenance commitment. Someone should know why it exists and what would allow it to be removed. Without ownership, slow annotations accumulate until the suite's expected runtime no longer matches the team's feedback needs.

Create a lightweight register from code search or report metadata. It can be as simple as a table in the QA platform backlog: test title, reason, owner, current budget, last observed duration, and review date. Review does not mean deleting every slow marker. It means confirming the reason is still true.

| Register field | Example | Why it matters |
|---|---|---|
| Test title | \`audit export completes and becomes downloadable\` | Identifies the scenario |
| Slow reason | Async report worker | Explains the product boundary |
| Owner | Reporting QA lead | Gives follow-up a destination |
| Observed duration | Usually 35 to 50 seconds in CI | Separates normal from regression |
| Review trigger | Reporting worker rewrite | Defines when to revisit |

This habit changes the conversation. Instead of arguing whether a slow test "feels too slow," the team can compare observed duration against the reason and the decision the test supports. If a report worker was optimized and the test now finishes in eight seconds, remove the slow marker. If a new dependency makes it take two minutes, the register exposes that regression rather than normalizing it.

## Frequently Asked Questions

### Does test.slow make a Playwright test flaky?

No. \`test.slow\` does not create flakiness by itself. It gives the test a larger timeout and communicates that the scenario is expected to take longer. The risk is diagnostic: if the test is slow because of a bad locator, shared data, or an overloaded dependency, the annotation can hide the real issue for a while. Use it after identifying why the scenario deserves more time.

### Should I use test.slow or test.setTimeout?

Use \`test.slow\` when the main message is "this scenario is intentionally slow." Use \`test.setTimeout\` when you need an exact budget that differs from the slow multiplier or when the number itself is part of the agreement. In both cases, add a reason through a comment or annotation. If only one assertion needs patience, prefer an assertion timeout instead.

### Is it okay to increase expect timeout globally?

It can be, but only when most assertions in the project need a different default because of real application behavior or CI conditions. A global \`expect.timeout\` increase makes every assertion more patient, including assertions that should fail quickly. For isolated eventual consistency, use a per-assertion timeout. Global defaults should describe the suite norm, not the worst test.

### How do I know when to split a slow Playwright test?

Split it when the scenario verifies multiple independent outcomes, when setup dominates the test body, or when a failure no longer points to a clear product boundary. Keep it together when the user journey has one coherent business meaning and the long duration is part of that journey. Timing by step is the best evidence: if several unrelated steps consume time, split or move setup.
`,
};
