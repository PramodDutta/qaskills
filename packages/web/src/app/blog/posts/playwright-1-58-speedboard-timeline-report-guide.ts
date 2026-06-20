import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright 1.58 Speedboard: HTML Report Timeline Guide 2026',
  description:
    'Master the Playwright 1.58 Speedboard tab and timeline in the HTML report. Find slow tests, spot long waits, and fix performance bottlenecks step by step.',
  date: '2026-06-20',
  category: 'Guide',
  content: `
# Playwright 1.58 Speedboard: The HTML Report Timeline Guide

For years, the most frustrating part of running a large Playwright suite was not writing the tests -- it was answering one deceptively simple question: "Why is this suite so slow?" You knew the wall-clock number from CI, and you knew which spec files existed, but connecting the two meant scrolling through raw trace files, eyeballing durations, and guessing where the time actually went. Playwright 1.58 changes that with the new **Speedboard** tab and an interactive **timeline** baked directly into the HTML report. Instead of a flat list of green and red checkmarks, you now get a per-test breakdown of duration, a visual map of where each millisecond is spent, and a clear picture of waits, network stalls, fixture setup, and parallelism gaps. This guide walks through enabling the HTML reporter, opening the report, reading the Speedboard and timeline like a profiler, and -- most importantly -- turning what you see into concrete fixes. By the end you will be able to find the slowest tests in a thousand-test suite in under a minute, explain exactly why they are slow, and shave real time off every CI run. Whether you are a solo engineer babysitting a flaky pipeline or a platform team owning hundreds of specs, the Speedboard is the fastest path from "the suite feels slow" to "here is the specific waiting call costing us eight seconds per run."

## Key Takeaways

- **Speedboard** is a new tab in the Playwright 1.58 HTML report that ranks every test by duration and surfaces the biggest time sinks at a glance.
- The **timeline** view shows where time goes inside a single test -- setup, actions, auto-waiting, network, and teardown -- so you can profile instead of guess.
- You enable it simply by using the **HTML reporter** (\`reporter: [['html']]\`); no extra plugin is required in 1.58.
- Most slowness comes from a handful of fixable patterns: \`networkidle\` waits, hard-coded \`waitForTimeout\`, heavy per-test fixtures, and missing parallelism.
- Comparing Speedboard data across runs turns performance from a one-time cleanup into a tracked metric you can defend in CI.

---

## What the Speedboard Actually Is

The Speedboard is a dedicated tab that appears in the Playwright HTML report starting in version 1.58. Where the default report answers "did my tests pass?", the Speedboard answers "where did my time go?" It aggregates the duration of every test in the run, sorts them from slowest to fastest, and renders a compact visual ranking so the worst offenders float to the top instantly.

This matters because human attention does not scale. In a suite of 40 tests you can scan durations by hand. In a suite of 800 spread across 30 shards, you cannot. The Speedboard does the sorting and the visual weighting for you, so a single test that quietly consumes 22 seconds while everything else finishes in under two stops hiding in the noise.

Crucially, the Speedboard is not a separate tool you install. It is part of the same self-contained HTML report Playwright already generates. If you are using the HTML reporter, you already have it. The data comes from the same per-step timing Playwright records during execution, now presented as a performance-first view rather than a pass/fail-first view.

## Enabling the HTML Reporter

The Speedboard rides on top of the standard HTML reporter, so the only requirement is that the HTML reporter is active. In most projects this is already the case, but here is the explicit configuration in \`playwright.config.ts\`:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Run tests in parallel across files
  fullyParallel: true,
  // The HTML reporter powers the Speedboard + timeline in 1.58
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'https://staging.example.com',
    // Capturing a trace gives the timeline its richest detail
    trace: 'on-first-retry',
  },
});
\`\`\`

If you run multiple reporters in CI -- which is common -- just include \`html\` alongside the others. The Speedboard appears as long as the HTML report is produced:

\`\`\`typescript
reporter: [
  ['list'],
  ['junit', { outputFile: 'results.xml' }],
  ['html', { open: 'never', outputFolder: 'playwright-report' }],
],
\`\`\`

The \`open: 'never'\` option keeps CI from trying to launch a browser on a headless machine. You will open the report yourself, which is the next step.

## Opening and Navigating the Report

After a run completes, generate and serve the report locally with a single command:

\`\`\`bash
npx playwright show-report
\`\`\`

This starts a small local server and opens the report in your default browser. If you saved the report to a custom folder, point the command at it:

\`\`\`bash
npx playwright show-report playwright-report
\`\`\`

When CI uploads the report as an artifact, download it, unzip it, and run the same command against the extracted folder. The report is fully static, so you can also drop the folder onto any static host and share a link with your team.

Once the report loads, you will see the familiar list of tests. In 1.58 the navigation gains the **Speedboard** entry. Click it to switch from the pass/fail list to the performance ranking. From there, clicking any individual test opens its detail view, where the **timeline** lives.

## Reading the Speedboard Ranking

The Speedboard presents your tests as a ranked, weighted view -- the longer a test runs, the more visual real estate it occupies, so duration becomes something you feel rather than something you have to read off a column. Start at the top. The first few entries are almost always responsible for a disproportionate share of total wall-clock time.

A practical reading workflow looks like this:

1. **Scan the top five.** These are your biggest wins. Fixing the slowest test usually saves more than optimizing the next twenty combined.
2. **Look for clustering.** If ten tests in the same spec file are all slow, the cause is probably shared -- a heavy \`beforeEach\`, a slow login fixture, or a flaky environment.
3. **Spot the outliers.** A single test that is 10x slower than its neighbors almost always hides a bad wait or a real bug.
4. **Note the long tail.** Hundreds of fast tests are fine; hundreds of medium-slow tests can quietly add up to minutes.

The Speedboard turns "the suite is slow" into "these specific five tests are slow," which is the only framing that leads to action.

## Reading the Timeline Inside a Test

Click into a slow test and the timeline shows you the anatomy of that single run, laid out left to right in execution order. Each segment represents a phase or action -- fixture setup, navigations, locator actions, assertions, auto-waiting, network activity, and teardown -- with its width proportional to time spent.

This is where the real diagnosis happens. A test that takes 12 seconds might break down as:

| Segment | Time | What it means |
|---|---|---|
| Fixture setup (login) | 4.2s | Per-test auth is re-running a full UI login |
| Navigation to dashboard | 1.1s | Page load, reasonable |
| \`waitForLoadState('networkidle')\` | 5.0s | Waiting for analytics beacons that never settle |
| Click + assertion | 0.4s | The actual thing under test |
| Teardown | 1.3s | Context close, trace flush |

The lesson is immediate: only 0.4 seconds of that test is the behavior you care about. The other 11.6 seconds are setup and waiting. The timeline makes that ratio impossible to ignore, and it points you straight at the two villains -- a UI-based login fixture and a \`networkidle\` wait.

When you have a trace attached (\`trace: 'on-first-retry'\` or \`'on'\`), the timeline links into the full Playwright trace viewer, where you can step through each action, inspect the DOM snapshot, and see the exact network request that stalled.

## Common Slowness Causes and How to Fix Them

Once you can see where time goes, the fixes follow a small, repeatable catalog. Here are the patterns the timeline surfaces most often, with the fix for each.

| Symptom in timeline | Root cause | Fix |
|---|---|---|
| Long flat \`networkidle\` segment | Waiting for analytics/third-party requests that never go idle | Wait for a specific element or response instead of \`networkidle\` |
| Fixed-width gap with no activity | Hard-coded \`page.waitForTimeout()\` | Replace with web-first assertions that auto-wait |
| Large setup block on every test | Heavy per-test fixture (UI login, DB seed) | Use \`storageState\` and worker-scoped fixtures |
| Many short tests, long total | No parallelism, one worker | Enable \`fullyParallel\` and increase workers |
| Slow first action after navigation | Page not actually ready, manual sleeps added | Trust auto-waiting; assert on visible state |

### Fix 1: Stop waiting for networkidle

\`networkidle\` resolves only when there have been no network connections for 500ms. Modern apps with analytics, polling, or websockets may never reach that state, so the wait runs until it times out. Replace it with an assertion on the thing you actually need:

\`\`\`typescript
// Slow and fragile: may wait until timeout
await page.goto('/dashboard');
await page.waitForLoadState('networkidle');

// Fast and precise: wait for the real signal
await page.goto('/dashboard');
await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
\`\`\`

### Fix 2: Delete hard-coded timeouts

A \`waitForTimeout\` is a guess. It is either too short (flaky) or too long (slow), and the timeline shows it as a dead gap. Playwright's auto-waiting already retries actions and assertions until they pass:

\`\`\`typescript
// Anti-pattern: a fixed sleep that wastes time on every run
await page.click('#submit');
await page.waitForTimeout(3000);
expect(await page.locator('.toast').count()).toBe(1);

// Better: web-first assertion auto-retries until the toast appears
await page.getByRole('button', { name: 'Submit' }).click();
await expect(page.getByText('Saved successfully')).toBeVisible();
\`\`\`

### Fix 3: Cache authentication with storageState

If every test logs in through the UI, the timeline will show a fat setup segment on every single row. Authenticate once in a setup project, save the session, and reuse it. This is the single highest-leverage fix for most suites:

\`\`\`typescript
// auth.setup.ts -- runs once, saves the session
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Welcome back')).toBeVisible();
  await page.context().storageState({ path: authFile });
});
\`\`\`

\`\`\`typescript
// playwright.config.ts -- reuse the saved state everywhere
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /auth\\.setup\\.ts/ },
    {
      name: 'chromium',
      use: { storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});
\`\`\`

For a deeper treatment of this exact pattern, see our [Playwright storageState authentication reference](/blog/playwright-storagestate-authentication-reference).

### Fix 4: Turn on parallelism

If the Speedboard shows hundreds of tests but the total run time looks like the sum of all of them, you are running serially. Enable full parallelism and let Playwright spread work across workers:

\`\`\`typescript
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 4 : '50%',
});
\`\`\`

The timeline cannot show cross-test parallelism directly, but the Speedboard's total versus per-test math will reveal the gap.

## Spotting Parallelism Gaps

A subtle category of slowness is not slow tests but *idle workers*. If one spec file is marked \`test.describe.serial\` and contains your ten longest tests, those ten run back to back on a single worker while other workers sit idle. The Speedboard makes the imbalance visible: a cluster of long tests that share a file and never overlap in time is a parallelism gap.

The fix is to make tests independent so they can be parallelized:

\`\`\`typescript
// Avoid serial chains unless tests truly depend on each other
test.describe.configure({ mode: 'parallel' });

test('creates an order', async ({ page }) => {
  // each test sets up its own data, no shared state
});

test('cancels an order', async ({ page }) => {
  // independent -- can run on a different worker concurrently
});
\`\`\`

Independent tests are also less flaky, so this fix pays off twice.

## The System Theme and Report Ergonomics

Small ergonomics matter when you stare at a report every day. The 1.58 report respects your **system theme**, so it follows your OS light/dark preference automatically instead of forcing one look. Dark-mode users finally get a report that does not blind them at 2 a.m. during an incident. The theme choice is cosmetic, but a readable Speedboard is a Speedboard people actually use, and adoption is what turns a feature into a habit.

## Using the Speedboard in CI

The Speedboard is most valuable when it is not a one-off. Wire the HTML report into CI so every run produces a shareable artifact:

\`\`\`yaml
# .github/workflows/e2e.yml
name: E2E
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
\`\`\`

Now any teammate can download the artifact, run \`npx playwright show-report playwright-report\`, and open the Speedboard for that exact run. When someone asks "why was CI slow on Tuesday?", you have an answer instead of a shrug.

## Comparing Runs Over Time

A single Speedboard snapshot tells you today's slow tests. The real power comes from comparison. Keep a few baseline numbers -- total run time, and the duration of your top five tests -- and check them on a cadence. If a previously fast test suddenly climbs the Speedboard, something regressed: a new fixture, a heavier page, a flaky third-party call.

You can automate a lightweight guardrail by parsing the JSON results the reporter can emit:

\`\`\`bash
# Emit machine-readable results alongside the HTML report
npx playwright test --reporter=json,html > results.json
\`\`\`

\`\`\`typescript
// check-slowest.ts -- fail CI if any test exceeds a budget
import results from './results.json';

const BUDGET_MS = 15000;
const offenders = results.suites
  .flatMap((s: any) => s.specs)
  .filter((spec: any) => spec.tests[0].results[0].duration > BUDGET_MS);

if (offenders.length) {
  console.error('Tests over budget:', offenders.map((o: any) => o.title));
  process.exit(1);
}
\`\`\`

This turns performance from an occasional cleanup into a tracked, enforced metric -- the Speedboard tells you *where* to look, and the budget check keeps regressions from sneaking back in.

## Putting It All Together: A Profiling Workflow

Here is the end-to-end loop to make a slow suite fast:

1. Run the suite and open the report with \`npx playwright show-report\`.
2. Click **Speedboard** and read the top five slowest tests.
3. Open the slowest one and study its **timeline** to see where time goes.
4. Match what you see to the slowness table and apply the matching fix.
5. Re-run, confirm the test dropped down the ranking, and move to the next.
6. Add a budget check in CI so the wins stick.

Repeat until the top of the Speedboard is dominated by tests that are doing real, irreducible work -- at which point you have genuinely fast tests, not just hidden slow ones. To go further on the broader 1.x feature set, see [what's new in Playwright 2026](/blog/whats-new-in-playwright-2026) and the [Playwright 1.59 agentic release features](/blog/playwright-1-59-agentic-release-features-guide). And if you want ready-made Playwright testing skills for your AI coding agent, browse the [QA skills directory](/skills).

## Frequently Asked Questions

### What is the Speedboard tab in Playwright 1.58?

The Speedboard is a new tab in the Playwright HTML report introduced in version 1.58. It ranks every test in a run by duration, from slowest to fastest, with a visual weighting so the biggest time sinks stand out instantly. It exists to answer "where did my time go?" rather than just "did my tests pass?", making it easy to find slow tests in large suites.

### How do I enable the Playwright timeline HTML report?

The timeline and Speedboard ride on the standard HTML reporter, so you only need to enable that. Add \`reporter: [['html']]\` to your \`playwright.config.ts\`, run your tests, then open the report with \`npx playwright show-report\`. No extra plugin or flag is required in Playwright 1.58. Attaching a trace with \`trace: 'on'\` gives the timeline its richest, action-level detail.

### How do I find slow tests in Playwright in 2026?

Run your suite, open the HTML report with \`npx playwright show-report\`, and click the Speedboard tab. It lists tests sorted by duration, so the slowest appear at the top. Click any test to open its timeline and see exactly which phase -- fixture setup, navigation, waiting, or network -- consumed the time, then apply the matching fix from the slowness catalog.

### Why is networkidle making my Playwright tests slow?

\`waitForLoadState('networkidle')\` only resolves after 500ms of zero network activity. Apps with analytics, polling, or websockets may never go fully idle, so the wait runs until it times out -- often five seconds or more per call. The timeline shows this as a long flat segment. Replace it with a precise assertion like \`await expect(locator).toBeVisible()\` on the element you actually need.

### Can I compare Playwright performance across CI runs?

Yes. Upload the HTML report as a CI artifact on every run so each is independently openable with \`npx playwright show-report\`. For automated guardrails, emit JSON results with \`--reporter=json,html\` and add a script that fails the build when any test exceeds a duration budget. The Speedboard tells you where to look, and the budget check prevents regressions from creeping back in.

### Does the Playwright report support dark mode?

Yes. The Playwright 1.58 HTML report follows your operating system's light or dark theme preference automatically, so the Speedboard and timeline match the rest of your environment without manual configuration. It is a cosmetic change, but a readable report is one your team will actually open during a late-night incident, which is when performance data matters most.

### Do I need a trace to use the Speedboard?

No. The Speedboard ranking and the basic timeline come from the per-step timing Playwright records on every run, so they work without a trace. However, attaching a trace (\`trace: 'on'\` or \`'on-first-retry'\`) makes the timeline far more useful, because each segment links into the full trace viewer where you can step through actions, inspect DOM snapshots, and see the exact stalled network request.

## Conclusion

The Speedboard and timeline turn the Playwright HTML report from a pass/fail scoreboard into a genuine performance profiler. Instead of guessing why a suite drags, you open the report, read the ranking, click the slowest test, and watch the timeline tell you the answer -- a UI login fixture here, a \`networkidle\` wait there, a parallelism gap in a serial describe block. The fixes are a small, well-known catalog, and each one you apply visibly moves a test down the ranking. Wire the report into CI, add a duration budget, and you convert a one-time cleanup into a metric you defend forever. Start now: run \`npx playwright test\`, open the Speedboard, and find your slowest test. Then explore the [QA skills directory](/skills) to add battle-tested Playwright skills to your AI coding agent and keep your suite fast as it grows.
`,
};
