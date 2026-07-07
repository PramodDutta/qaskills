import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Healer Agent and Self-Healing Tests in 2026',
  description:
    'How the Playwright Healer agent detects broken selectors, regenerates role-based locators from accessibility snapshots, and re-runs tests. Setup, CI, and limits.',
  date: '2026-07-07',
  category: 'Guide',
  content: `
# Playwright Healer Agent and Self-Healing Tests in 2026

Selector rot is the single most common reason a green Playwright suite turns red overnight. A developer renames a CSS class, ships a new design-system component, or swaps a \`div\` for a \`button\`, and suddenly dozens of tests that were perfectly correct yesterday fail on \`locator.click: Timeout\`. The test logic never changed. Only the DOM did. In 2026 the Playwright Healer agent addresses exactly this class of failure by treating a broken locator as a repairable artifact rather than a hard failure.

This guide explains what the Healer agent actually does under the hood, how to install and configure it, how to wire it into CI without letting it silently rewrite your suite, where it works well, and where it will happily lead you astray. If you are new to the broader agent lineup, start with the [Playwright agents guide for 2026](/blog/playwright-agents-guide-2026) and then come back here for the deep dive on self-healing specifically.

## What the Healer Agent Actually Does

The Healer is a failure-triggered agent. It does nothing while your tests pass. When a test fails on a locator resolution error (element not found, timeout waiting for element, strict-mode violation with zero matches), the Healer intercepts that failure and runs a repair loop instead of letting the run die.

The loop has four stages:

1. **Capture.** It takes an accessibility-tree snapshot of the page at the moment of failure. This is the same aria snapshot that powers \`page.getByRole\` resolution, not a raw HTML dump.
2. **Match.** It compares the original locator's intent (the role, accessible name, and surrounding text the test was looking for) against the live snapshot to find the element the author most likely meant.
3. **Regenerate.** It produces a new role-based or text-based locator that resolves uniquely against the current DOM, preferring \`getByRole\`, \`getByLabel\`, and \`getByText\` over brittle CSS or XPath.
4. **Re-run.** It replays the failing step with the candidate locator. If the step now passes and the rest of the test completes, the healed locator is recorded as a proposed patch.

The key design decision is that healing operates on *intent* recovered from the accessibility tree, not on fuzzy string distance over CSS selectors. That is why a rename from \`.btn-primary\` to \`.button--primary\` heals cleanly: the button still exposes role \`button\` with accessible name "Submit", so the semantic anchor survives the cosmetic change.

It helps to think about what the Healer explicitly refuses to do. It does not retry the same failing locator hoping the page settles, because a locator that resolves to zero elements after the network is idle is not a timing problem. It does not walk the DOM looking for anything vaguely clickable near where the old element used to be, because that produces confident nonsense. And it does not touch anything downstream of the failing step, because the moment it substitutes a locator it re-runs from that point and lets the existing assertions decide whether the substitution was correct. The heal is only accepted if the rest of the test, including every assertion, still passes. That constraint is the difference between a repair and a cover-up: a heal that makes the locator resolve but then fails an assertion is discarded, not reported as a success.

There is also a subtle ordering guarantee worth understanding. The Healer runs its repair loop only after Playwright's own auto-waiting and retry logic have already given up. By the time the Healer sees a failure, the runner has genuinely exhausted its patience for that element under the original locator. This ordering means the Healer never fights the runner's built-in resilience; it starts exactly where the runner stops, so you are not stacking two competing retry mechanisms on top of each other.

## Why Accessibility-Tree Snapshots Beat CSS Heuristics

Older self-healing tools kept a history of every attribute (id, class, name, nth-child position) and, on failure, scored candidate elements by how many attributes still matched. That approach breaks the moment a framework regenerates hashed class names or reorders the DOM, because none of the remembered attributes survive.

The accessibility tree is far more stable because it reflects what the element *means* to a user, not how it is styled. A "Delete account" button is role \`button\` with that accessible name whether it is a \`<button>\`, an \`<a role="button">\`, or a styled \`<div>\`. Anchoring on role plus accessible name gives the Healer a target that survives the churn that CSS-based healing cannot.

| Signal | Stability under refactor | Used by Healer | Notes |
|---|---|---|---|
| CSS class | Low | Avoided | Hashed/atomic classes change constantly |
| Element id | Medium | Fallback only | Often auto-generated in SPAs |
| nth-child / XPath position | Very low | Never | Breaks on any reorder |
| ARIA role | High | Primary | Semantic, survives markup swaps |
| Accessible name | High | Primary | Tied to visible label/text |
| \`data-testid\` | Very high | Preferred if present | The gold standard anchor |

The practical takeaway: the more your app exposes proper roles, labels, and \`data-testid\` attributes, the higher the Healer's success rate. Teams that already follow [Playwright best practices for 2026](/blog/playwright-best-practices-2026) tend to see the best results because their DOM is already semantic.

Consider a concrete before-and-after. Suppose your design system ships a major version that renames every button class from a BEM scheme to Tailwind utility classes and, along the way, swaps the primary call-to-action from an \`<a class="btn-primary">\` styled to look like a button into a real \`<button>\`. Every CSS-anchored test that targeted \`a.btn-primary\` breaks at once, potentially dozens of failures in a single run. To an attribute-scoring healer this looks catastrophic, because the tag changed, the class changed, and the ancestor chain changed. To the accessibility-tree Healer it is almost a non-event: the element is still role \`button\` with accessible name "Checkout", so every failing locator heals to the same \`getByRole('button', { name: 'Checkout' })\` and the run goes green with a stack of proposed patches that all say the same sensible thing. That asymmetry, catastrophic for the old approach and trivial for the new one, is the whole reason semantic anchoring won.

The corollary is a maintenance incentive you may not have expected. Because heal quality tracks accessibility quality, adopting the Healer quietly rewards teams for improving their app's a11y. A page with vague \`<div onclick>\` handlers and no labels heals poorly, and the low heal rate becomes a visible signal that the underlying markup is hostile to both assistive technology and testing. Fixing the roles to raise the heal rate also makes the product more accessible, so the two goals pull in the same direction rather than competing for engineering time.

## Installing and Enabling the Healer

The Healer ships alongside the Playwright test runner. Install the current version and pull the agent definitions.

\`\`\`bash
npm install -D @playwright/test@latest
npx playwright install --with-deps
npx playwright init-agents --loop=healer
\`\`\`

The \`init-agents\` step drops an agent configuration into your project and registers the Healer so the runner can invoke it. Verify it registered:

\`\`\`bash
npx playwright agents list
\`\`\`

You should see \`healer\` in the output with a status of \`enabled\`. If you use Claude Code as your driver, the setup overlaps with what is described in [running Playwright test agents in Claude Code](/blog/playwright-test-agents-claude-code).

## Configuring the Healer in playwright.config

The Healer reads its behavior from a dedicated block in your Playwright config. The most important choice is *mode*: whether healed locators are applied automatically or only proposed for review.

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    trace: 'on-first-retry',
  },
  healer: {
    enabled: true,
    // 'propose' writes a patch file but does NOT edit your spec.
    // 'apply' rewrites the locator in place. Never use 'apply' in CI.
    mode: 'propose',
    // Only heal locator-resolution failures, never assertion failures.
    triggerOn: ['locator-timeout', 'element-not-found', 'strict-mode-zero'],
    // Prefer these locator strategies, in order.
    strategyPreference: ['testId', 'role', 'label', 'text'],
    // Cap repair attempts per failing step to bound run time.
    maxAttemptsPerStep: 3,
    // Refuse a heal whose confidence is below this threshold.
    minConfidence: 0.7,
  },
});
\`\`\`

Three settings deserve emphasis. First, \`triggerOn\` must never include assertion failures. If \`expect(total).toHaveText('42')\` fails, that is a real bug or a real data change, and you do not want an agent papering over it by hunting for some other element that reads "42". Second, \`minConfidence\` is your guardrail against confident-but-wrong heals; start at \`0.7\` and raise it if you see bad patches. Third, keep \`mode: 'propose'\` everywhere except a developer's local machine.

## Running a Heal Locally

With \`mode: 'propose'\`, run your suite normally. When a locator fails, the Healer repairs it in memory, lets the test finish, and writes a patch.

\`\`\`bash
npx playwright test tests/checkout.spec.ts
\`\`\`

A healed run prints a summary like this:

\`\`\`bash
Running 12 tests using 4 workers

  ✓ checkout adds item to cart (2.1s)
  ⚠ checkout applies promo code (3.4s) [HEALED]
      original: page.locator('.promo-input')
      healed:   page.getByRole('textbox', { name: 'Promo code' })
      confidence: 0.88
  ✓ checkout completes payment (4.0s)

1 healed locator proposed -> .playwright-healer/checkout.spec.patch
\`\`\`

Review the patch, and if the new locator is genuinely what the test meant, apply it:

\`\`\`bash
npx playwright agents apply .playwright-healer/checkout.spec.patch
\`\`\`

This is the safe workflow: the agent proposes, a human confirms, the diff lands in version control like any other change. The healed locator is objectively better than the CSS selector it replaced, which is a nice side effect. You are trading brittle selectors for semantic ones over time.

## Wiring the Healer into CI

In CI the rule is absolute: the Healer may *diagnose* but must never *commit*. You want a red build when a selector breaks, plus a machine-readable suggestion attached to the run so the fix is a two-minute review rather than a debugging session.

\`\`\`yaml
name: e2e
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
      - run: npx playwright install --with-deps
      - name: Run e2e with healer in report-only mode
        env:
          PLAYWRIGHT_HEALER_MODE: propose
          PLAYWRIGHT_HEALER_FAIL_ON_HEAL: '1'
        run: npx playwright test
      - name: Upload heal proposals
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: healer-patches
          path: .playwright-healer/
\`\`\`

The critical flag is \`PLAYWRIGHT_HEALER_FAIL_ON_HEAL=1\`. It tells the runner that a test which only passed *because* it was healed should still count as a failure for exit-code purposes. The build goes red, the engineer sees the proposed patch in the artifacts, reviews it, and commits it deliberately. This gives you the diagnosis benefit of self-healing without the nightmare of a suite that quietly rewrites itself and hides real regressions.

It is worth spelling out why the alternative is so dangerous. Imagine you did enable auto-apply in CI. A developer merges a pull request that accidentally removes the "Place order" button and replaces it with a differently-named "Complete purchase" button. The Healer, in apply mode, would happily rebind the checkout test to the new button, the test would pass, the build would stay green, and the pull request would merge with no signal that a user-facing label just changed out from under your test coverage. The change might be intentional or it might be a mistake, but either way you have lost the conversation about it. Propose mode with fail-on-heal forces that conversation to happen in code review, which is exactly where it belongs.

There is also a reporting nicety. Because each proposed heal carries a confidence score and both the original and healed locators, the CI artifact reads almost like a code review comment written by the agent. A reviewer can often approve or reject a heal in seconds without even opening the app, because the diff from a positional CSS selector to a clean \`getByRole\` is self-evidently an improvement. Over a quarter, the accumulated accepted heals measurably raise the semantic quality of the whole suite, which is a pleasant second-order effect of running the gate this way.

## How Reliable Is the Healer, Really?

Across teams reporting numbers publicly and in vendor benchmarks, the Healer resolves roughly 75 percent of pure selector-drift failures on well-structured, accessible applications (an approximate figure that varies heavily by codebase). That success rate is not uniform. It clusters by failure type.

| Failure cause | Approx. heal success | Why |
|---|---|---|
| CSS class / atomic-class rename | ~90% | Semantic anchor untouched |
| Element type swap (div -> button) | ~85% | Role recovered from a11y tree |
| Text/label reworded slightly | ~70% | Fuzzy name match, sometimes ambiguous |
| Element moved to new container | ~65% | Intent survives, context shifts |
| Element genuinely removed | ~0% | Nothing to heal, correct to fail |
| Timing/race condition | Low | Not a selector problem at all |

The honest framing: the Healer is excellent at cosmetic and structural refactors and useless (correctly so) at real regressions. Do not read "75 percent" as "75 percent less test maintenance forever." Read it as "most of your selector-churn noise gets auto-diagnosed with a proposed fix attached."

## Limits and Failure Modes to Respect

Self-healing is a powerful tool and a dangerous crutch. Know its edges.

- **It cannot heal correctness.** An assertion that fails because the app is now wrong is a bug. The Healer never touches assertion failures by design, and you should never configure it to.
- **Ambiguous names cause mis-heals.** If a page has three buttons all named "Save", a heal can bind to the wrong one. This is why \`data-testid\` on interactive elements still matters even with healing available.
- **It masks a11y regressions if you let it apply blindly.** A page that loses its proper roles should fail loudly, not get patched with a CSS fallback that hides the accessibility problem.
- **Repair time adds latency.** Each heal attempt takes a snapshot and a re-run. With \`maxAttemptsPerStep: 3\` on a badly-drifted suite, run times can balloon. Bound it.
- **It is not a substitute for good locators.** The best-performing suites need the least healing. Healing is a safety net, not the foundation.

For deeper locator discipline, the patterns in [Playwright end-to-end best practices](/blog/playwright-e2e-best-practices) pair well with healing: write semantic locators first, and let the Healer catch the drift you could not anticipate.

One more operational limit deserves attention: the Healer works on the page as rendered at failure time, so anything that changes *after* the snapshot is invisible to it. A modal that opens on a delayed timer, a locator that depends on a websocket push that has not arrived, or an element gated behind a feature flag that is off in the test environment will all present to the Healer as simply absent. The agent cannot distinguish "this element does not exist because the app is broken" from "this element does not exist yet because the app is slow" beyond the waiting the runner already did. When you see heals fail with low confidence and no plausible candidate, the honest reading is usually that the failure was never a selector problem at all, and no amount of healing will fix a race condition or a genuinely missing feature.

## Healer vs. Manual Fixing vs. Legacy Self-Healing

\`\`\`ts
// Brittle: healer can recover this, but you should not write it.
await page.locator('div.sidebar > ul > li:nth-child(3) > a').click();

// Semantic: rarely needs healing at all.
await page.getByRole('link', { name: 'Billing' }).click();

// Anchored: the most stable option, effectively heal-proof.
await page.getByTestId('nav-billing').click();
\`\`\`

The comparison below sets expectations across approaches.

| Approach | Fixes drift | Catches real bugs | Human in loop | Risk of silent masking |
|---|---|---|---|---|
| Manual selector fixing | Yes, slowly | Yes | Always | None |
| Legacy attribute-scoring healers | Sometimes | No | Optional | High |
| Playwright Healer (propose mode) | Yes | Yes | Yes | Low |
| Playwright Healer (apply in CI) | Yes | No | No | Very high |

The winning configuration is propose mode with \`FAIL_ON_HEAL\` in CI and human review on every patch. You keep the signal, you keep the audit trail, and you still get most of the maintenance savings.

## Frequently Asked Questions

### What is the Playwright Healer agent?

The Playwright Healer is a failure-triggered agent bundled with the Playwright test runner. When a test fails because a locator no longer resolves, it captures an accessibility-tree snapshot of the page, infers which element the test meant, regenerates a role-based or text-based locator, and re-runs the step. It proposes the healed locator as a patch rather than editing your spec silently.

### Does the Healer fix failing assertions?

No, and it should never be configured to. The Healer only triggers on locator-resolution failures such as timeouts and element-not-found errors. Assertion failures indicate a real bug or a real data change, so the runner leaves them alone. Keeping \`triggerOn\` limited to locator errors is what prevents the agent from masking genuine regressions.

### What is the Healer's success rate?

On well-structured, accessible applications the Healer resolves roughly 75 percent of pure selector-drift failures, an approximate figure that varies widely by codebase. Success is highest for CSS renames and element-type swaps (around 85 to 90 percent) and drops for reworded labels or relocated elements. It correctly heals zero percent of genuinely removed elements.

### Should I enable auto-apply mode in CI?

No. In CI use propose mode with the fail-on-heal flag so the build still goes red and the proposed patch is uploaded as an artifact for human review. Auto-apply belongs only on a developer's local machine, and even there the patch should land in version control through a normal reviewed commit.

### How does the Healer differ from older self-healing tools?

Legacy tools scored candidate elements by how many remembered attributes (id, class, position) still matched, which breaks when frameworks regenerate hashed classes. The Playwright Healer anchors on the accessibility tree, using ARIA role and accessible name, which reflect what an element means rather than how it is styled and therefore survive cosmetic and structural refactors.

### Do I still need data-testid attributes with healing enabled?

Yes. \`data-testid\` gives the Healer an unambiguous anchor and is the most stable signal available. On pages with several elements sharing the same role and name, a test id is what prevents a heal from binding to the wrong element. Healing is a safety net, not a replacement for writing stable locators in the first place.

### Does healing slow down my test runs?

Only failing steps trigger a heal, and each attempt adds a snapshot plus a re-run. On a passing suite there is no overhead. On a badly drifted suite with a high \`maxAttemptsPerStep\`, run times can grow noticeably, so cap attempts and keep triggers narrow to bound the cost.

### Can the Healer improve my existing brittle locators?

Yes, as a side effect. When it heals a CSS or XPath selector it regenerates a semantic role-based locator, so applying accepted patches gradually migrates your suite toward stable locators. Over time a suite that started with fragile selectors becomes markedly more resilient as drift is repaired.

## Conclusion

Self-healing tests in 2026 are not magic and they are not a way to stop caring about locators. The Playwright Healer is a precise tool: it recovers intent from the accessibility tree, regenerates semantic locators, and proposes them for review, which eliminates most of the busywork around selector drift while never touching real bugs. Run it in propose mode, fail your CI build on any heal, review every patch, and treat accepted heals as a free migration toward better locators.

Ready to make your suite resilient? Enable the Healer today, wire the fail-on-heal gate into your pipeline, and browse the full catalog of QA automation skills at [/skills](/skills) to pair self-healing with the rest of your testing stack.
`,
};
