import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'ZeroStep Playwright: Natural Language Testing With ai() Calls',
  description:
    'Learn how ZeroStep lets you write Playwright tests in plain English using ai() calls. Covers install, setup, element resolution, cost model, and migration.',
  date: '2026-07-06',
  category: 'Guide',
  content: `
# ZeroStep for Playwright: Natural Language Testing With ai() Calls

ZeroStep is a small but powerful library that plugs an LLM directly into your Playwright test suite so you can describe actions in plain English instead of hand-writing CSS or XPath selectors. Rather than writing \`await page.locator('button[data-testid="submit-login"]').click()\`, you write \`await ai('click the login button', { page, test })\` and let the model figure out which element on the page matches your description. Under the hood ZeroStep captures a snapshot of the accessibility tree and DOM, sends a compact representation to an LLM, and receives back the concrete browser action to execute. This shifts the fragile part of end-to-end testing, the selector, from a brittle string you maintain by hand into an intent you express once in natural language.

This matters because selectors are the single largest source of flaky, high-maintenance Playwright suites. Every time a designer renames a class, restructures a div, or a framework regenerates hashed attributes, a selector-based test breaks even though the user-facing behavior is identical. Natural language steps survive most of these refactors because "the login button" is still the login button regardless of its markup. In this guide you will learn how to install ZeroStep, wire up your \`ZEROSTEP_TOKEN\`, write your first \`ai()\` steps, understand exactly how element resolution works, reason about the per-call cost model, and decide where natural language belongs versus where classic locators still win. We will also cover a pragmatic migration strategy so you can adopt ZeroStep incrementally in an existing suite rather than rewriting everything at once. By the end you should be able to make an informed engineering decision about whether AI-driven steps fit your team.

## What ZeroStep Actually Is

ZeroStep is an npm package, \`@zerostep/playwright\`, that exports a single primary function: \`ai()\`. It is not a replacement for Playwright, it is a companion. You still use \`@playwright/test\` for the runner, fixtures, assertions, reporters, and configuration. ZeroStep only takes over the step where you would normally locate and act on an element. Because it sits on top of Playwright rather than around it, every existing feature (trace viewer, retries, parallelism, projects) keeps working exactly as before.

The \`ai()\` function accepts a natural language instruction and a context object containing the current \`page\` and \`test\` handles. It returns a promise you await like any other Playwright action. Internally it serializes the relevant page state, calls the ZeroStep backend which prompts an LLM, and translates the model response into real Playwright commands such as clicks, fills, or scrolls. The important mental model: ZeroStep is a translation layer between English and Playwright's driver API.

## Installing ZeroStep

Installation is a single dependency added to an existing Playwright project. If you do not yet have Playwright set up, initialize it first, then add ZeroStep.

\`\`\`bash
# 1. If you do not already have Playwright
npm init playwright@latest

# 2. Add the ZeroStep package
npm install --save-dev @zerostep/playwright
\`\`\`

That is the entire install. ZeroStep does not require a browser download of its own because it reuses the browsers Playwright already manages. It also does not add a config plugin you must register, the \`ai()\` function is imported directly in the test files that need it.

## Getting And Setting Your ZEROSTEP_TOKEN

ZeroStep authenticates every \`ai()\` call against its backend using a token. You create a free account, generate a token, and expose it to your test process through the \`ZEROSTEP_TOKEN\` environment variable. Never hard-code the token into a committed file.

\`\`\`bash
# Export for the current shell session
export ZEROSTEP_TOKEN="0step:your-token-value-here"

# Then run your tests normally
npx playwright test
\`\`\`

For local development a \`.env\` file loaded with a tool like \`dotenv\` keeps the token out of your shell history, and in CI you store it as a masked secret. The following table shows the recommended place for the token by environment.

| Environment | Where to store the token | How it is read |
|---|---|---|
| Local dev | \`.env\` (gitignored) | \`dotenv\` or shell export |
| GitHub Actions | Repository secret | \`env:\` block in the workflow |
| GitLab CI | Masked CI/CD variable | Injected into the job shell |
| Docker | Build/run secret, not \`ENV\` | \`--env-file\` at runtime |

If \`ZEROSTEP_TOKEN\` is missing at runtime, \`ai()\` calls will fail fast with an authentication error, which is the correct behavior, you want a loud failure rather than a silent fallback to broken selectors.

## Writing Your First ai() Step

Here is a complete, runnable test that logs into an application using only natural language steps. Notice that the imports mix the standard Playwright \`test\` and \`expect\` with ZeroStep's \`ai\`.

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { ai } from '@zerostep/playwright';

test('user can log in with natural language steps', async ({ page }) => {
  await page.goto('https://example.com/login');

  // Each ai() call takes an instruction and the { page, test } context.
  await ai('type "jane@acme.com" into the email field', { page, test });
  await ai('type "s3cr3t-pass" into the password field', { page, test });
  await ai('click the sign in button', { page, test });

  // Assertions stay pure Playwright - fast, deterministic, no LLM cost.
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText('Welcome back, Jane')).toBeVisible();
});
\`\`\`

The pattern to internalize is that \`ai()\` handles the imperative "do something" steps where locating an element is the hard part, while \`expect()\` assertions stay in plain Playwright. You do not want to pay for an LLM round trip just to check that a URL changed, and you do not want assertion results to be non-deterministic.

You can also ask \`ai()\` to return information rather than perform an action, which is useful for extracting values you then assert on.

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { ai } from '@zerostep/playwright';

test('reads the account balance', async ({ page }) => {
  await page.goto('https://example.com/wallet');

  // When the instruction asks a question, ai() returns a string answer.
  const balance = await ai('what is the current account balance shown?', {
    page,
    test,
  });

  expect(balance).toContain('$');
});
\`\`\`

## How ZeroStep Resolves Elements

Understanding the resolution pipeline helps you write instructions that succeed on the first try. When you call \`ai('click the login button', { page, test })\`, the following happens in order.

1. ZeroStep snapshots the current page, prioritizing the accessibility tree (roles, names, labels) plus a pruned view of the DOM so the payload stays within token limits.
2. It packages your instruction together with that snapshot and sends it to the ZeroStep backend, which prompts an LLM.
3. The model reasons about which element best matches your description and returns a structured action, for example "click the element with role button and accessible name Sign in".
4. ZeroStep maps that structured action back to a concrete Playwright locator and executes the real click through Playwright's driver.

Because the model leans on the accessibility tree, well-labeled applications resolve more reliably. A button with visible text "Sign in" or an \`aria-label\` is trivial to find, whereas an unlabeled icon button forces the model to guess from position and surrounding context. The practical takeaway: the same accessibility hygiene that helps real users helps ZeroStep, so instructions like "click the button next to the search box" work better on accessible apps.

The table below contrasts vague and precise instructions so you can see what the model can and cannot disambiguate.

| Instruction | Reliability | Why |
|---|---|---|
| \`click the button\` | Low | Ambiguous when several buttons exist |
| \`click the sign in button\` | High | Matches accessible name directly |
| \`click the blue Delete button in the top row\` | Medium-High | Extra context resolves duplicates |
| \`type "hi" into the message box at the bottom\` | High | Position plus role narrows it |
| \`click the third item\` | Low | Relies on brittle ordinal counting |

## The Cost Model

Every \`ai()\` call is a paid LLM round trip, so cost scales with how many natural language steps your suite executes, not with wall-clock time. ZeroStep bills per \`ai()\` invocation (with a free tier for evaluation), which makes the economics straightforward to model: count your AI steps, multiply by runs per day. A test with five \`ai()\` steps that runs on every one of two hundred daily CI pushes performs one thousand AI steps a day.

Two design habits keep cost predictable. First, use \`ai()\` only for actions where selector maintenance is genuinely painful, and keep assertions and simple, stable locators in plain Playwright. Second, avoid running the full AI suite on every trivial commit, gate it to pull requests or nightly runs while a fast deterministic smoke suite runs on every push. The following table sketches the trade-off.

| Strategy | AI calls per day | Maintenance | Best for |
|---|---|---|---|
| All steps via \`ai()\` | Highest | Lowest | Small suites, rapid prototyping |
| \`ai()\` for actions, plain \`expect\` | Medium | Low | Most teams |
| \`ai()\` only on nightly, selectors on push | Lowest | Medium | Large, cost-sensitive suites |

## Pros And Cons Versus Hand-Written Selectors

Natural language testing is a genuine trade, not a free win. The honest comparison below helps you decide where it earns its keep.

| Dimension | ZeroStep \`ai()\` | Hand-written selectors |
|---|---|---|
| Resilience to markup change | High | Low |
| First-run speed | Slower (network + LLM) | Fast |
| Determinism | Lower | High |
| Maintenance cost | Low | High |
| Runtime cost | Per-call billing | Free |
| Debuggability | Harder to trace | Easy, explicit locator |
| Offline / air-gapped runs | Not possible | Fully offline |

The strongest case for \`ai()\` is a rapidly changing UI where selectors break constantly and engineering time spent re-anchoring locators outweighs the per-call cost. The strongest case for classic selectors is a stable, high-frequency suite where determinism and zero runtime cost matter most. Many teams land on a hybrid: AI for exploratory and fast-changing flows, selectors for the critical, stable, high-run-count paths.

## A Practical Migration Strategy

You do not need to rewrite an existing suite to adopt ZeroStep. Introduce it incrementally where it pays off most.

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { ai } from '@zerostep/playwright';

test('hybrid: AI for the flaky step, selectors for the rest', async ({
  page,
}) => {
  await page.goto('https://example.com');

  // Stable, cheap: keep the plain Playwright locator.
  await page.getByRole('link', { name: 'Products' }).click();

  // This widget re-renders constantly and kept breaking selectors,
  // so we let ai() handle just this one step.
  await ai('open the filter panel and select the "In stock" toggle', {
    page,
    test,
  });

  // Back to deterministic assertions.
  await expect(page.getByTestId('product-grid')).toBeVisible();
});
\`\`\`

A sensible rollout order: start by wrapping the three or four steps in your suite that break most often, measure the reduction in flaky failures, then expand to full flows that change frequently, and leave your stable smoke tests on plain selectors. Track your \`ai()\` call volume from day one so cost never surprises you. If you use QA skills for AI coding agents, you can pair this with a broader browser automation setup, see our [Playwright MCP browser automation guide](/blog/playwright-mcp-browser-automation-guide) for how MCP servers complement natural language steps.

## Debugging Natural Language Steps

When an \`ai()\` step does the wrong thing, the fix is almost always a more specific instruction. Because the model resolves against what it can see, ambiguity is the enemy. Add discriminating context: name the section, the nearby label, or the visible text. Use Playwright's trace viewer (\`npx playwright test --trace on\`) to inspect exactly what action ZeroStep executed, since the resulting click or fill is a normal Playwright action captured in the trace. If a step is genuinely non-deterministic, that is a strong signal it should become a plain selector instead. Reserve \`ai()\` for steps where the intent is clear even if the markup is not.

## Best Practices For Reliable AI Steps

Keep instructions imperative and singular, one action per \`ai()\` call, so failures are easy to localize. Prefer describing elements by their visible text or role rather than color or position, since text is the most stable anchor. Keep assertions in \`expect()\` to preserve determinism and avoid LLM cost. Invest in application accessibility because the same labels that help screen readers help ZeroStep resolve elements. Finally, monitor your call volume and gate expensive AI runs behind pull requests or nightly schedules. For a broader view of building resilient suites, our [complete Playwright end-to-end guide](/blog/playwright-e2e-complete-guide) covers fixtures, retries, and the Page Object Model that pair well with selective AI steps.

## Handling Dynamic Content And Timing

One area where natural language steps shine is dynamic, asynchronous UIs. Because \`ai()\` resolves against the page state at the moment it runs, a step like "click the newly added row" naturally targets whatever the app rendered, without you computing an index or waiting on a specific selector. That said, ZeroStep does not replace Playwright's auto-waiting, it builds on it, so combine \`ai()\` actions with explicit waits when a network call must complete before the element exists.

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { ai } from '@zerostep/playwright';

test('waits for async data before the AI step', async ({ page }) => {
  await page.goto('https://example.com/orders');

  // Deterministic wait keeps the AI step reliable and cheap to retry.
  await page.waitForResponse((r) => r.url().includes('/api/orders') && r.ok());

  await ai('open the most recent order in the list', { page, test });
  await expect(page.getByRole('heading', { name: /order #/i })).toBeVisible();
});
\`\`\`

The pattern is to gate expensive AI steps behind cheap deterministic waits. This keeps each \`ai()\` call operating on a stable, fully-rendered page, which improves resolution accuracy and avoids paying for a retry when the target simply had not loaded yet.

## Using ZeroStep In CI Pipelines

Running ZeroStep in continuous integration is the same as running any Playwright suite, with one addition: the \`ZEROSTEP_TOKEN\` secret must be present in the job environment. Store it as a masked CI secret and inject it into the shell that runs your tests. Because \`ai()\` calls hit the network, ensure your CI runner has outbound connectivity, air-gapped runners cannot execute natural language steps.

\`\`\`yaml
# .github/workflows/e2e.yml
name: E2E
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
      - run: npx playwright test
        env:
          ZEROSTEP_TOKEN: \${{ secrets.ZEROSTEP_TOKEN }}
\`\`\`

A cost-aware team runs the AI-heavy suite only on pull requests or nightly schedules while a fast deterministic smoke suite runs on every push. This keeps per-call spend predictable while still catching regressions early. If you build QA tooling for AI agents, browse the [QA skills directory](/skills) for install-ready automation skills that pair with this CI setup.

## Frequently Asked Questions

### What is ZeroStep for Playwright?

ZeroStep is an npm package, \`@zerostep/playwright\`, that adds an \`ai()\` function to your Playwright tests so you can describe steps in plain English instead of writing CSS or XPath selectors. It sends a snapshot of the page to an LLM, gets back the intended action, and executes it through Playwright's normal driver, keeping the runner, fixtures, and reporters unchanged.

### How do I install and set up ZeroStep?

Install it into an existing Playwright project with \`npm install --save-dev @zerostep/playwright\`, then create a ZeroStep account and expose your token through the \`ZEROSTEP_TOKEN\` environment variable. Import \`ai\` in your test files, pass \`{ page, test }\` to each call, and run tests with \`npx playwright test\` exactly as before. No config plugin registration is required.

### How does ZeroStep find elements without selectors?

ZeroStep snapshots the accessibility tree and a pruned DOM, sends your instruction plus that context to an LLM, and receives a structured action naming the target element by role and accessible name. It then maps that action to a real Playwright locator and executes it. Well-labeled, accessible applications resolve far more reliably because the model has clear names to match against.

### How much does ZeroStep cost to run?

ZeroStep bills per \`ai()\` call, with a free tier for evaluation, so cost scales with the number of natural language steps executed rather than test duration. Model it by counting \`ai()\` steps times daily runs. Teams control spend by using \`ai()\` only for maintenance-heavy actions, keeping assertions in plain Playwright, and gating full AI runs to pull requests or nightly schedules.

### Is ZeroStep better than writing Playwright selectors?

It depends on your suite. Natural language steps survive markup refactors and cut maintenance, but they add per-call cost, run slower, and are less deterministic than hand-written locators. Stable, high-frequency critical paths usually stay on plain selectors, while fast-changing or exploratory flows benefit most from \`ai()\`. Most teams adopt a hybrid rather than choosing one exclusively.

### Can I mix ai() calls with normal Playwright locators?

Yes, and this hybrid approach is recommended. You can call \`page.getByRole()\` and \`expect()\` in the same test as \`ai()\` steps. A common pattern keeps deterministic assertions and stable locators in plain Playwright while delegating only the frequently breaking steps to \`ai()\`. This limits LLM cost, preserves determinism where it matters, and reduces maintenance where selectors are painful.

### How do I debug a failing ai() step?

Run with \`npx playwright test --trace on\` and open the trace viewer, because the click or fill ZeroStep performs is a normal Playwright action captured in the trace. Most failures come from ambiguous instructions, so add discriminating context such as visible text, role, or a nearby label. If a step stays non-deterministic even with a clear instruction, convert it to a plain selector instead.

### Does ZeroStep work offline or in air-gapped CI?

No. Every \`ai()\` call requires a network round trip to the ZeroStep backend, which prompts an LLM, so fully offline or air-gapped environments cannot use natural language steps. For those pipelines you must fall back to hand-written Playwright locators. Teams with partial connectivity often keep a deterministic selector-based smoke suite that runs anywhere and reserve \`ai()\` steps for connected CI stages.

## Conclusion

ZeroStep brings natural language into Playwright without asking you to abandon anything you already rely on. By replacing brittle selectors with \`ai()\` calls backed by an LLM, you trade a small per-call cost and some determinism for a large reduction in selector maintenance, which is often the best deal available on a fast-changing UI. The winning pattern is hybrid: let \`ai()\` handle the frequently breaking action steps, keep assertions and stable locators in plain Playwright, and gate expensive AI runs behind pull requests or nightly schedules. Start small, wrap your flakiest steps first, measure the drop in maintenance, and expand from there.

Ready to level up your AI-driven QA workflow? Browse the [QA skills directory](/skills) to find ready-to-install skills for Playwright, natural language testing, and AI coding agents that make your test suite faster to build and easier to maintain.
`,
};
