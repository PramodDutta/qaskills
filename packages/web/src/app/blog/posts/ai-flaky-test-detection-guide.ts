import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'AI Flaky Test Detection and Quarantine: The Complete Guide',
  description:
    'Detect, quarantine, and fix flaky tests with AI in 2026. Runnable Playwright retry configs, Python detectors, and GitHub Actions to keep CI green.',
  date: '2026-07-02',
  category: 'Guide',
  content: `
# AI Flaky Test Detection and Quarantine: The Complete Guide

A flaky test is one that passes and fails on the same code without any change to the application or the test itself. It is the single most corrosive problem in a modern test suite, because it destroys the one thing a suite is supposed to provide: trust. When a red build might mean a real regression or might just mean the same login test timed out again, engineers stop reading failures. They re-run the job, merge anyway, and the suite quietly becomes decoration. By the time a genuine bug slips through, nobody believes the tests anymore.

Flaky test detection is the discipline of separating real failures from noise, and quarantine is the operational pattern that keeps that noise out of the critical path while you fix it. In 2026, AI has changed both halves of this equation. Instead of a human staring at CI history trying to guess which tests are unreliable, models now classify failures by signature, cluster related flakes, correlate failures with timing and infrastructure signals, and even propose the specific fix, a missing web-first assertion, a hard-coded wait, a shared-state leak between tests. Done well, this turns a multi-day flake investigation into a triage that a model completes before the on-call engineer finishes their coffee.

This guide is a complete, runnable playbook. You will learn what actually causes flakiness, how to measure a flake rate that you can put on a dashboard, and how to build an AI-assisted detection pipeline that labels failures automatically. Then you will get production Playwright retry and quarantine configuration in TypeScript, a Python flake-detector that mines your test history, and GitHub Actions workflows that quarantine offenders without blocking merges. If you are also generating tests with AI, pair this with our [AI test generation with Playwright guide](/blog/ai-test-generation-playwright-2026), and if brittle locators are your root cause, read [Playwright auto-healing locators](/blog/playwright-auto-healing-locators). Let us make CI trustworthy again.

## What Actually Causes Flaky Tests

Flakiness is never magic. Every flaky test has a race condition somewhere between what the test assumes and what the application actually does. Naming the category is the first step, because the fix is almost entirely determined by the cause.

| Flake category | Typical symptom | Root cause | Durable fix |
|---|---|---|---|
| Timing / async | Passes locally, fails in CI | Hard-coded sleeps, no wait | Web-first assertions |
| Order dependence | Fails only when run with others | Shared DB or global state | Isolate + reset per test |
| Network | Random timeouts on API calls | Live third-party dependency | Mock or stub the boundary |
| Animation | Element not clickable | Transition still running | Wait for stable state |
| Resource contention | Fails under parallel load | CPU/memory starvation | Cap workers, add retries |
| Non-determinism | Different data each run | Random seeds, real dates | Freeze clock, seed RNG |

The most common by far is timing. A test does \`await page.click('#submit')\` and immediately asserts on a result that the app renders 40 milliseconds later. On a fast laptop it passes; on a loaded CI runner it fails one time in twenty. The fix is not a longer sleep, it is an assertion that waits. Second most common is order dependence: test A creates a user that test B accidentally relies on, so shuffling the order breaks B. AI detection is especially good at these two because their failure signatures are distinctive and repetitive across runs.

## Measuring Flake Rate: The Metric That Matters

You cannot manage what you do not measure. The core metric is the flake rate: the percentage of test runs that fail without a corresponding code change. A practical proxy is the pass-on-retry rate, the fraction of failures that pass when re-run on identical code. Any test that fails then passes on retry, with no code change in between, is flaky by definition.

\`\`\`typescript
// flake-rate.ts — compute flake rate from a run history
interface TestRun {
  testId: string;
  commitSha: string;
  status: 'passed' | 'failed';
  passedOnRetry: boolean;
  durationMs: number;
}

export function flakeRate(runs: TestRun[]): number {
  const failures = runs.filter((r) => r.status === 'failed');
  if (failures.length === 0) return 0;
  const flakyFailures = failures.filter((r) => r.passedOnRetry).length;
  return Number(((flakyFailures / runs.length) * 100).toFixed(2));
}

export function flakiestTests(runs: TestRun[], topN = 10) {
  const byTest = new Map<string, { total: number; flaky: number }>();
  for (const run of runs) {
    const entry = byTest.get(run.testId) ?? { total: 0, flaky: 0 };
    entry.total += 1;
    if (run.status === 'failed' && run.passedOnRetry) entry.flaky += 1;
    byTest.set(run.testId, entry);
  }
  return [...byTest.entries()]
    .map(([testId, e]) => ({ testId, flakeRate: (e.flaky / e.total) * 100, runs: e.total }))
    .filter((t) => t.runs >= 5) // ignore low-signal tests
    .sort((a, b) => b.flakeRate - a.flakeRate)
    .slice(0, topN);
}
\`\`\`

A healthy suite runs below a one percent flake rate. Above five percent, engineers lose trust and start ignoring red builds. The \`flakiestTests\` function gives you the ranked hit list that feeds every downstream decision: what to quarantine, what to fix first, and what to celebrate when the number drops.

## How AI Detection Works: From Failure Logs to Labels

The manual approach, reading stack traces one at a time, does not scale past a few dozen tests. AI flaky test detection replaces that with a classification pipeline. Each failure produces a feature vector, error message, stack signature, duration delta versus the median, retry outcome, time of day, runner id, and a model assigns a category and a confidence score. The value is not the individual label; it is that clustering thousands of failures reveals that eighty percent of your noise comes from three shared-state leaks.

\`\`\`typescript
// classify-failure.ts — LLM-assisted failure classification
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface FailureContext {
  testId: string;
  errorMessage: string;
  stackTrace: string;
  durationMs: number;
  medianDurationMs: number;
  passedOnRetry: boolean;
}

export async function classifyFailure(ctx: FailureContext) {
  const prompt = \`You are a flaky-test triage assistant. Classify this failure.

Test: \${ctx.testId}
Error: \${ctx.errorMessage}
Stack: \${ctx.stackTrace.slice(0, 1500)}
Duration: \${ctx.durationMs}ms (median \${ctx.medianDurationMs}ms)
Passed on retry: \${ctx.passedOnRetry}

Return strict JSON: {"category": one of
["timing","order-dependence","network","animation","resource","non-determinism","real-regression"],
"confidence": 0-1, "suggestedFix": string}\`;

  const res = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = res.content[0].type === 'text' ? res.content[0].text : '{}';
  return JSON.parse(text) as {
    category: string;
    confidence: number;
    suggestedFix: string;
  };
}
\`\`\`

The critical rule: a failure that did NOT pass on retry and shows a distinctive assertion error should be treated as a probable real regression, not flake. Never let an AutoClassifier silently quarantine a genuine bug. Always require the \`passedOnRetry\` signal plus a confidence threshold before anything is marked flaky, and route \`real-regression\` labels straight to a human.

## Playwright Retry Configuration Done Right

Retries are the first line of defense, but they are a detection tool, not a fix. Playwright's retry mechanism records whether a test passed only after retrying, which is exactly the signal your flake-rate metric needs. Configure retries in CI but keep them at zero locally so developers feel their own flakiness.

\`\`\`typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Zero retries locally (surface flakiness), 2 in CI (measure it).
  retries: process.env.CI ? 2 : 0,
  // Cap workers in CI to avoid resource-contention flakes.
  workers: process.env.CI ? 4 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 }, // web-first assertions get their own budget
  reporter: [
    ['list'],
    ['json', { outputFile: 'results/results.json' }],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry', // capture a trace the moment a test retries
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
\`\`\`

The \`trace: 'on-first-retry'\` setting is the single highest-value line here. It means every retried test, precisely the flaky ones, ships a full trace with DOM snapshots, network logs, and console output. That trace is the raw material your AI classifier feeds on, and it is what turns "this test is flaky sometimes" into "this test raced a 200ms XHR on line 14."

## Fixing Timing Flakes with Web-First Assertions

The most common flaky test in the world is one that uses a fixed wait. The fix is to replace imperative waits with Playwright's web-first assertions, which auto-retry until the condition is true or the timeout elapses. Here is the before and after that eliminates an entire class of flakiness.

\`\`\`typescript
// BAD — the classic flaky pattern
test('checkout shows total (flaky)', async ({ page }) => {
  await page.goto('/cart');
  await page.click('#checkout');
  await page.waitForTimeout(500); // arbitrary sleep — races the render
  const total = await page.locator('#total').textContent();
  expect(total).toBe('$42.00'); // fails when render takes 501ms
});

// GOOD — web-first assertion auto-retries until stable
test('checkout shows total (stable)', async ({ page }) => {
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Checkout' }).click();
  // expect() polls the DOM until it matches or times out — no sleeps
  await expect(page.getByTestId('order-total')).toHaveText('$42.00');
  // wait for the network to settle before asserting on derived state
  await expect(page.getByRole('status')).toContainText('Order confirmed');
});
\`\`\`

Notice three durable choices. First, role- and testid-based locators instead of brittle CSS, which also solves a category of failures covered in our [auto-healing locators guide](/blog/playwright-auto-healing-locators). Second, \`toHaveText\` polls instead of a one-shot read. Third, an explicit wait on the confirmation status so the assertion cannot fire mid-transition. Apply this pattern and timing flakes largely disappear.

## Building a Python Flake Detector Over Test History

If your test results land in a database or JUnit XML, a lightweight Python detector can score every test nightly and emit a quarantine candidate list. This runs independently of any framework and works for pytest, Playwright, or a mixed suite.

\`\`\`python
# flake_detector.py — score tests from JUnit XML history
import glob
import xml.etree.ElementTree as ET
from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class TestStats:
    total: int = 0
    failed: int = 0
    flaky: int = 0  # failed then passed on same commit
    durations: list = field(default_factory=list)


def load_history(pattern: str = "artifacts/**/junit-*.xml") -> dict:
    stats: dict[str, TestStats] = defaultdict(TestStats)
    # Track pass/fail per (test, commit) to detect flip within a commit.
    seen: dict[tuple, list] = defaultdict(list)
    for path in glob.glob(pattern, recursive=True):
        commit = path.split("/")[1]  # artifacts/<sha>/junit-*.xml
        tree = ET.parse(path)
        for case in tree.iter("testcase"):
            name = f"{case.get('classname')}::{case.get('name')}"
            failed = case.find("failure") is not None or case.find("error") is not None
            s = stats[name]
            s.total += 1
            s.durations.append(float(case.get("time", 0)))
            if failed:
                s.failed += 1
            seen[(name, commit)].append(not failed)
    # A test that both passed and failed on the SAME commit is flaky.
    for (name, _commit), outcomes in seen.items():
        if True in outcomes and False in outcomes:
            stats[name].flaky += 1
    return stats


def quarantine_candidates(stats: dict, threshold: float = 5.0) -> list:
    out = []
    for name, s in stats.items():
        if s.total < 5:
            continue
        rate = (s.flaky / s.total) * 100
        if rate >= threshold:
            out.append((name, round(rate, 2), s.total))
    return sorted(out, key=lambda x: -x[1])


if __name__ == "__main__":
    stats = load_history()
    for name, rate, total in quarantine_candidates(stats):
        print(f"QUARANTINE  {rate:>5}%  ({total} runs)  {name}")
\`\`\`

The key idea is the same-commit flip: if a test both passed and failed on the identical SHA, no code changed, so the failure was noise. This is a stronger signal than raw failure count, which can be inflated by genuine regressions. Feed the candidate list into your quarantine label and re-run nightly to watch the list shrink as you fix each root cause.

## The Quarantine Pattern: Isolating Flakes Without Blocking Merges

Quarantine is the operational heart of this discipline. A quarantined test still runs, still reports, but its result no longer blocks the merge or fails the required check. This buys you time to fix the root cause without letting one flaky test hold the whole team hostage. In Playwright, tag quarantined tests and split them into a non-blocking job.

\`\`\`typescript
// tests/checkout.spec.ts — tag a flaky test for quarantine
import { test, expect } from '@playwright/test';

// @quarantine — tracked in FLAKY.md, owner @qa-team, ticket QA-482
test('legacy promo code applies @quarantine', async ({ page }) => {
  await page.goto('/cart');
  await page.getByLabel('Promo code').fill('SAVE10');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('discount')).toHaveText('-$4.20');
});

// A stable test with no tag runs in the blocking suite as normal.
test('cart shows item count', async ({ page }) => {
  await page.goto('/cart');
  await expect(page.getByTestId('cart-count')).toHaveText('2');
});
\`\`\`

\`\`\`bash
# Run the blocking suite (excludes quarantined tests) — this gates merges
npx playwright test --grep-invert "@quarantine"

# Run only the quarantined suite (non-blocking, reports to a dashboard)
npx playwright test --grep "@quarantine"
\`\`\`

The discipline that makes quarantine work rather than become a graveyard: every quarantined test must have an owner and a ticket, and the quarantine list must be reviewed weekly. A test that sits quarantined for a month with no fix should be deleted, not preserved. Quarantine is a hospital, not a hospice.

## GitHub Actions: Automated Detection and Quarantine in CI

Wiring the pieces together in CI makes the whole system self-sustaining. This workflow runs the blocking suite, runs the quarantined suite separately without failing the build, uploads traces for the AI classifier, and posts a flake summary.

\`\`\`yaml
# .github/workflows/e2e.yml
name: E2E with flake quarantine
on:
  pull_request:
  push:
    branches: [main]

jobs:
  blocking:
    name: Blocking suite (gates merge)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Run stable tests (excludes @quarantine)
        run: npx playwright test --grep-invert "@quarantine"
      - name: Upload traces for flaky retries
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: traces-\${{ github.run_id }}
          path: test-results/**/trace.zip
          retention-days: 7

  quarantined:
    name: Quarantined suite (non-blocking)
    runs-on: ubuntu-latest
    continue-on-error: true # never fails the overall build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Run quarantined tests (report only)
        run: npx playwright test --grep "@quarantine" --reporter=json > flaky.json || true
      - name: Comment flake summary on PR
        if: github.event_name == 'pull_request'
        run: node scripts/post-flake-summary.js flaky.json
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
\`\`\`

The two-job split is the whole trick. The \`blocking\` job is a required check and only runs trustworthy tests, so a green check truly means the app works. The \`quarantined\` job uses \`continue-on-error\` so it reports flake status to the team without ever holding up a merge. Traces upload on every run, giving your classification pipeline the DOM snapshots it needs to label failures the next morning.

## Auto-Healing and AI Agents as a Detection Layer

Beyond classification, AI agents can act as an active detection layer by re-running suspected flakes in a controlled loop and observing variance. An agent that runs a candidate test twenty times, records the pass rate, captures traces on the failures, and diffs the DOM between a passing and failing run can pinpoint the exact element or request that races. This is where MCP-driven browser agents shine; see our [Playwright MCP browser automation guide](/blog/playwright-mcp-browser-automation-guide) for the setup.

\`\`\`typescript
// flake-loop.ts — stress a suspect test to measure true flake rate
import { execSync } from 'node:child_process';

function runOnce(testFile: string): boolean {
  try {
    execSync(\`npx playwright test \${testFile} --retries=0 --reporter=dot\`, {
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

export function measureFlakeRate(testFile: string, iterations = 20) {
  let passes = 0;
  for (let i = 0; i < iterations; i++) {
    if (runOnce(testFile)) passes += 1;
  }
  const flakeRate = ((iterations - passes) / iterations) * 100;
  return {
    testFile,
    iterations,
    passes,
    flakeRate: Number(flakeRate.toFixed(1)),
    verdict: flakeRate === 0 ? 'stable' : flakeRate < 100 ? 'flaky' : 'always-fails',
  };
}
\`\`\`

A verdict of \`always-fails\` is not flaky at all, it is a real, deterministic failure that retries were masking, and it should go to a human immediately. A verdict of \`flaky\` with a rate between one and ninety-nine percent is your true target for quarantine and root-cause work. This distinction is exactly what separates AI-assisted triage from blindly re-running everything.

## A Practical Rollout: From Chaos to Trust in Four Weeks

Teams that fix flakiness do it in stages, not all at once. Trying to fix a hundred flaky tests in a sprint fails; a staged rollout succeeds.

| Week | Focus | Outcome |
|---|---|---|
| 1 | Instrument retries + trace on retry | Flake rate becomes visible |
| 2 | Run detector, quarantine top 20 | Blocking suite turns reliably green |
| 3 | Fix top-5 root causes with AI labels | Flake rate drops below 3% |
| 4 | Weekly quarantine review + delete dead tests | Suite is trusted again |

Week one is purely observational: turn on retries and traces so you can see the problem. Week two is where trust returns, because quarantining the worst offenders makes the blocking suite green even before you fix anything. Weeks three and four are the durable work of fixing root causes and pruning tests that will never be reliable. The metric to watch throughout is the flake rate from the earlier section; if it is trending down, the process is working.

## Frequently Asked Questions

### What is a flaky test and why is it dangerous?

A flaky test passes and fails on identical code with no application change, usually due to a timing or state race. It is dangerous because it destroys trust: engineers stop reading failures, re-run jobs blindly, and merge through red builds. Once the team ignores the suite, a real regression eventually slips through unnoticed, defeating the entire purpose of automated testing.

### How does AI detect flaky tests?

AI flaky test detection converts each failure into a feature vector, error message, stack signature, duration delta, retry outcome, and runner id, then a model classifies it into categories like timing, order-dependence, or real-regression with a confidence score. Clustering thousands of failures reveals that most noise traces back to a handful of root causes, which is far faster than reading stack traces one at a time.

### What is the difference between quarantine and deleting a flaky test?

Quarantine keeps the test running and reporting but stops it from blocking merges, buying time to fix the root cause. Deletion removes it entirely. Quarantine is temporary and requires an owner plus a ticket; a test quarantined for weeks with no fix should be deleted. Quarantine is a hospital, not a hospice: the goal is always to heal and return the test to the blocking suite.

### How many retries should I configure in Playwright?

Use zero retries locally so developers feel their own flakiness, and two retries in CI so you can measure the pass-on-retry rate that defines flakiness. More than two retries hides genuine regressions and wastes CI minutes. Pair retries with \`trace: 'on-first-retry'\` so every retried run captures a full trace for later analysis, turning your retry budget into a detection instrument rather than a crutch.

### What flake rate is acceptable for a test suite?

A healthy suite runs below one percent flake rate, measured as the fraction of runs that fail then pass on retry with no code change. Between one and five percent is a warning zone requiring active quarantine and fixing. Above five percent, engineers lose trust and start ignoring red builds, at which point the suite provides negative value and needs an urgent stabilization sprint.

### Can I use AI to fix flaky tests automatically, not just detect them?

AI can propose fixes, replacing a hard-coded wait with a web-first assertion, isolating shared state, or mocking a network boundary, and apply them for human review. Fully automatic fixes are risky because a wrong fix can mask a real bug. The safe pattern is AI-suggested, human-approved: the model labels the flake category and drafts the diff, and an engineer reviews it before it merges.

### How do I tell a flaky test from a real regression?

Use the retry signal. A failure that passes on retry with no code change is flaky; a failure that fails consistently across retries is a real regression that retries were masking. Stress-testing a suspect test twenty times gives a definitive verdict: a rate of exactly one hundred percent failure is deterministic, not flaky, and must go to a human immediately rather than being quarantined.

### Where should quarantined tests be tracked?

Track every quarantined test in a checked-in file such as FLAKY.md with three required fields: the test id, an owner, and a ticket link. Review the list weekly. This visibility prevents quarantine from becoming a dumping ground, ensures each flake has someone accountable for fixing it, and gives management a concrete backlog to prioritize against feature work.

## Conclusion

Flaky tests are not an unavoidable cost of automated testing; they are a solvable engineering problem with a clear playbook. Measure your flake rate so the problem is visible, use AI to classify failures by root cause instead of reading traces by hand, retry and trace in CI to generate the signal, and quarantine the worst offenders so your blocking suite stays green while you fix them. The four-week rollout turns a suite nobody trusts into one the whole team relies on, and the AI layer compresses what used to be days of investigation into a morning of triage. The payoff is enormous: a green build that actually means the application works.

Ready to build a more reliable test suite? Explore battle-tested detection, quarantine, and auto-healing skills for your AI coding agent in the [QASkills directory](/skills) and drop them straight into your workflow.
`,
};
