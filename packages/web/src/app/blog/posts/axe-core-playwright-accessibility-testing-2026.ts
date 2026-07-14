import type { BlogPost } from './index';

export const post: BlogPost = {
  title: '@axe-core/playwright Accessibility Testing Reference 2026',
  description:
    'Complete @axe-core/playwright accessibility testing reference: AxeBuilder, analyze, WCAG tags, include/exclude scoping, disabling rules, CI gating, fixtures.',
  date: '2026-06-11',
  category: 'Reference',
  content: `
# @axe-core/playwright Accessibility Testing Reference 2026

\`@axe-core/playwright\` is the official integration that brings Deque's axe-core accessibility engine into Playwright tests. It lets you run a real, standards-based accessibility scan against any page or component your test has already navigated to, and it returns a structured list of violations you can assert on, attach to reports, and gate CI against. Because the scan runs inside a live browser context that Playwright controls, it sees the page exactly as a user would — after JavaScript has hydrated, modals have opened, and dynamic content has rendered — which is precisely where most accessibility bugs hide and where static analyzers fail.

The value of automated accessibility testing is realistic, not magical. Axe-core reliably catches roughly the subset of WCAG issues that are machine-detectable: missing form labels, insufficient color contrast, images without alternative text, invalid ARIA usage, missing document language, and broken heading or landmark structure. It cannot judge whether your alt text is *meaningful* or whether a keyboard flow is *sensible* — those need human review. But the machine-detectable slice is large, regression-prone, and tedious to check by hand, which makes it the perfect thing to automate and gate on every pull request.

This reference is a practical, runnable map of \`@axe-core/playwright\` in 2026. We cover installation, the \`AxeBuilder\` API and its \`analyze()\` method, scoping a scan with \`include\` and \`exclude\`, selecting rule sets with \`withTags\` (wcag2a, wcag2aa, wcag21aa, best-practice), turning specific rules off, the canonical \`expect(violations).toEqual([])\` assertion, attaching violation reports to Playwright's HTML reporter, per-component scans, gating CI, and a reusable fixture pattern so every test gets an axe scanner for free. Every code block is real TypeScript you can paste into a Playwright project. If you searched for "axe-core playwright accessibility testing," this page is built to be the answer. For the locator and assertion fundamentals these tests build on, keep the [Playwright locators and web-first assertions guide](/blog/playwright-locators-best-practices-2026) handy.

## Installing @axe-core/playwright

The package is a thin wrapper that injects the axe-core engine into the page Playwright is driving. Install it as a dev dependency alongside the test runner.

\`\`\`bash
# Test runner + the axe integration
npm install -D @playwright/test @axe-core/playwright

# Make sure browsers are present
npx playwright install --with-deps chromium
\`\`\`

\`@axe-core/playwright\` brings its own pinned copy of \`axe-core\`, so you do not install the engine separately. The wrapper's job is to evaluate the axe-core script inside the page context, run the analysis, and serialize the results back to your Node test process as a typed object.

## The AxeBuilder API and analyze()

Everything starts with the \`AxeBuilder\` class. You construct it with the current \`page\`, optionally chain configuration methods, and finish with \`analyze()\`, which returns a results object whose most important field is \`violations\`.

\`\`\`ts
// tests/a11y-basic.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home page has no automatically detectable a11y violations', async ({ page }) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});
\`\`\`

The results object also exposes \`passes\`, \`incomplete\`, and \`inapplicable\` arrays, but \`violations\` is what you assert on. Each violation contains a rule \`id\`, an \`impact\` ("minor" to "critical"), a \`help\` string, a \`helpUrl\` to Deque's documentation, and a \`nodes\` array pinpointing each offending element with its CSS selector and a human-readable failure summary. Here is the method surface you will actually use:

| Method | Purpose | Example |
|---|---|---|
| \`new AxeBuilder({ page })\` | Create a scanner bound to a page | \`new AxeBuilder({ page })\` |
| \`.analyze()\` | Run the scan, return results | \`await builder.analyze()\` |
| \`.include(selector)\` | Limit the scan to a region | \`.include('#main')\` |
| \`.exclude(selector)\` | Skip a region | \`.exclude('.third-party-widget')\` |
| \`.withTags(tags)\` | Run only rules in these tag sets | \`.withTags(['wcag2aa'])\` |
| \`.withRules(ids)\` | Run only these specific rules | \`.withRules(['color-contrast'])\` |
| \`.disableRules(ids)\` | Run all rules except these | \`.disableRules(['region'])\` |
| \`.options(obj)\` | Pass raw axe-core run options | \`.options({ ... })\` |

The builder is chainable and immutable in spirit — you compose a configuration and then call \`analyze()\` once. Most real tests use \`include\`/\`exclude\` plus \`withTags\` together.

## Scoping a Scan with include and exclude

Scanning an entire page is the right default, but two situations call for scoping: you want to test one component in isolation, or a third-party widget you do not control is polluting results with violations you cannot fix. \`include\` narrows the scan to a subtree; \`exclude\` carves regions out of it.

\`\`\`ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('checkout form is accessible, ignoring the embedded chat widget', async ({ page }) => {
  await page.goto('/checkout');

  const results = await new AxeBuilder({ page })
    .include('#checkout-form')
    .exclude('#intercom-frame')
    .analyze();

  expect(results.violations).toEqual([]);
});
\`\`\`

Use \`exclude\` sparingly and deliberately. Excluding a third-party iframe you genuinely cannot fix is legitimate; excluding your own broken navigation to make the build green is technical debt that hides a real problem from real users. Document every exclusion with a comment explaining why it is out of your control.

## Selecting Rule Sets with withTags

Axe-core groups its rules into tags that map to WCAG conformance levels and to Deque's own best-practice set. \`withTags\` restricts the run to the rules carrying those tags, which is how you choose how strict the gate is. A common, pragmatic baseline is \`wcag2a\` plus \`wcag2aa\` plus \`wcag21aa\`, which covers Level A and AA across WCAG 2.0 and 2.1.

\`\`\`ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('dashboard meets WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/dashboard');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
\`\`\`

Here are the tags you will use most often and what each one means:

| Tag | Covers | Typical use |
|---|---|---|
| \`wcag2a\` | WCAG 2.0 Level A rules | Minimum legal baseline |
| \`wcag2aa\` | WCAG 2.0 Level AA rules | Standard compliance target |
| \`wcag21a\` | WCAG 2.1 Level A additions | Mobile + cognitive criteria |
| \`wcag21aa\` | WCAG 2.1 Level AA additions | Modern AA target (recommended) |
| \`wcag22aa\` | WCAG 2.2 Level AA additions | Newest criteria (focus, target size) |
| \`best-practice\` | Deque heuristics beyond WCAG | Stricter internal quality bar |
| \`section508\` | US Section 508 mapped rules | US federal procurement |

If you omit \`withTags\` entirely, axe runs its default rule set (WCAG A/AA plus best-practice). Specifying tags makes the intent explicit and the gate stable across axe-core upgrades, so prefer being explicit in a shared suite.

## Disabling Specific Rules

Sometimes a single rule produces noise that does not apply to your context — for example, the \`region\` rule flagging content outside a landmark on a deliberately minimal embed. You can switch off individual rules with \`disableRules\` while keeping everything else on.

\`\`\`ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('embed view, region rule intentionally disabled', async ({ page }) => {
  await page.goto('/embed/widget');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules(['region', 'landmark-one-main'])
    .analyze();

  expect(results.violations).toEqual([]);
});
\`\`\`

Treat \`disableRules\` like \`exclude\`: every disabled rule is a small promise to your users that you have judged that rule irrelevant *here*. Keep the list short, keep it commented, and revisit it during accessibility audits. The opposite tool, \`withRules\`, narrows to a single rule and is handy when you are actively fixing one issue, such as iterating on \`color-contrast\` until it passes.

## Asserting violations === 0

The canonical assertion is \`expect(results.violations).toEqual([])\`. It is preferable to checking \`.length\` because when it fails, Playwright prints the full violations array in the test output — rule ids, impact, help URLs, and offending selectors — so you get an actionable failure instead of "expected 0, received 3." For long-lived suites you can soften the failure during a remediation push by filtering to a severity floor.

\`\`\`ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('no critical or serious a11y violations', async ({ page }) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page }).analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );

  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
\`\`\`

Passing the serialized violations as the assertion message gives reviewers the exact failing elements right in the CI log. Filtering by impact is a reasonable *interim* gate while you burn down a backlog, but the end state should be \`violations\` equal to an empty array at your chosen WCAG level.

## Attaching Violation Reports to the HTML Reporter

A failing assertion tells you *that* something broke; attaching the full report tells you *what* and *where* without re-running. Playwright's \`testInfo.attach\` lets you bolt the raw axe results onto the HTML report so anyone reviewing the run can drill into every violation.

\`\`\`ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('pricing page a11y with attached report', async ({ page }, testInfo) => {
  await page.goto('/pricing');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  await testInfo.attach('axe-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  expect(results.violations).toEqual([]);
});
\`\`\`

The attachment rides along in the HTML report (\`npx playwright show-report\`) and in CI artifacts, so accessibility findings become a durable, browsable record rather than a transient log line. This pairs naturally with visual review workflows like [Percy with Playwright](/blog/percy-playwright-visual-testing-guide), giving you both pixel and a11y evidence on every run.

## Per-Component Accessibility Scans

You do not have to wait for a full page to test accessibility. By combining \`include\` with a navigation that renders just one component — a Storybook story, a component sandbox route, or a modal you have opened — you can scan units in isolation and catch issues before they compose into a page. This is the fastest feedback loop and the easiest place to fix a violation, because the blast radius is one component.

\`\`\`ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('opened date-picker dialog is accessible', async ({ page }) => {
  await page.goto('/components/date-picker');
  await page.getByRole('button', { name: 'Open calendar' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
\`\`\`

Scanning the dialog only after it is visible matters: axe checks the live DOM, so the component must be in its real, interactive state. If you run Storybook, point Playwright at each story URL and scan \`#storybook-root\` for a complete component-level a11y matrix that complements your [Chromatic visual testing setup](/blog/chromatic-turbosnap-storybook-guide).

## A Reusable Axe Fixture

Repeating \`new AxeBuilder({ page })\` in every test invites drift in which tags each test uses. A Playwright fixture centralizes the configuration so every test gets a consistently-configured scanner and your WCAG baseline lives in exactly one place.

\`\`\`ts
// tests/fixtures.ts
import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type AxeFixture = {
  makeAxeBuilder: () => AxeBuilder;
};

export const test = base.extend<AxeFixture>({
  makeAxeBuilder: async ({ page }, use) => {
    const builder = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .exclude('#third-party-ads');
    await use(builder);
  },
});

export { expect };
\`\`\`

Tests then import from the fixture file and stay focused on the page, not the axe boilerplate:

\`\`\`ts
// tests/settings.spec.ts
import { test, expect } from './fixtures';

test('settings page is accessible', async ({ page, makeAxeBuilder }) => {
  await page.goto('/settings');
  const results = await makeAxeBuilder().analyze();
  expect(results.violations).toEqual([]);
});
\`\`\`

Now upgrading your conformance target from AA to AAA, or adding a new global exclusion, is a one-line change in the fixture that every test inherits. This is the recommended pattern for any suite with more than a handful of accessibility tests.

## Gating CI on Accessibility

The point of automated a11y tests is to stop regressions from shipping. Run the accessibility specs in the same CI job as the rest of your Playwright suite so a new violation turns the build red on the pull request that introduced it, while the offending code is still fresh in the author's mind. Catching an issue at review time costs minutes; catching it after release means a user with a screen reader hit a wall first, an audit flagged it, and someone now has to reproduce, fix, and re-deploy. A red build on the offending PR is by far the cheapest place to pay that cost, and it keeps your conformance level from quietly eroding deploy after deploy as new components land.

\`\`\`yaml
# .github/workflows/a11y.yml
name: Accessibility
on: [push, pull_request]
jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --grep @a11y
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: a11y-report
          path: playwright-report/
          retention-days: 14
\`\`\`

Tag accessibility tests with \`@a11y\` in their titles so you can run just that slice with \`--grep @a11y\`, and use \`if: always()\` on the upload step so the report — including the attached axe results from earlier — is available even when the job fails. For installable accessibility and Playwright skills you can drop straight into this pipeline, browse the [QA skills directory](/skills).

## Best Practices

Run a full-page scan by default and only scope down with \`include\` when you genuinely need component isolation. Pick an explicit WCAG target with \`withTags\` and centralize it in a fixture so the whole suite moves together. Assert \`toEqual([])\` rather than counting, so failures print actionable detail. Attach raw results to the HTML reporter for a durable audit trail. Use \`exclude\` and \`disableRules\` only for things truly outside your control, and comment every one. Remember the tool's limits: axe catches the machine-detectable subset, so pair it with keyboard testing and manual review of alt-text quality and focus order. Done consistently, \`@axe-core/playwright\` turns accessibility from an end-of-cycle audit into a continuous, enforced quality gate.

## Frequently Asked Questions

### What does @axe-core/playwright actually test?

It runs Deque's axe-core engine inside the live browser page Playwright is driving and returns machine-detectable WCAG issues: missing form labels, low color contrast, images without alt text, invalid ARIA, missing document language, and broken heading or landmark structure. It scans the real, post-JavaScript DOM, so it catches issues in modals and dynamic content that static analyzers miss. It cannot judge whether alt text is meaningful or whether keyboard flows make sense.

### How do I assert there are no accessibility violations?

Run \`const results = await new AxeBuilder({ page }).analyze();\` then \`expect(results.violations).toEqual([]);\`. Asserting against an empty array is better than checking \`.length\` because Playwright prints the full violations array on failure — rule ids, impact, help URLs, and the exact offending selectors — giving you an actionable failure instead of a bare count mismatch.

### What is the difference between include and exclude?

\`include\` narrows the scan to a CSS-selected subtree, which is how you test a single component in isolation. \`exclude\` carves regions out of the scan, typically to skip a third-party widget or iframe you cannot fix. Use \`include\` freely for component-level tests, but use \`exclude\` sparingly and always with a comment explaining why the region is genuinely outside your control.

### Which WCAG tags should I use with withTags?

A solid, widely used baseline is \`['wcag2a', 'wcag2aa', 'wcag21aa']\`, which covers Level A and AA across WCAG 2.0 and 2.1. Add \`wcag22aa\` for the newest criteria like target size and focus appearance, and add \`best-practice\` for Deque heuristics beyond strict WCAG if you want a higher internal bar. Being explicit keeps the gate stable across axe-core upgrades.

### How do I disable a single axe rule?

Chain \`.disableRules(['rule-id'])\` before \`analyze()\`, for example \`.disableRules(['region'])\` to silence the landmark-region rule on a minimal embed. To do the inverse and run only one rule while you fix it, use \`.withRules(['color-contrast'])\`. Keep any disabled-rule list short and commented, since each disabled rule is an accessibility promise you are choosing to skip.

### Can I scan a single component instead of the whole page?

Yes. Navigate to a route or Storybook story that renders just that component, ensure it is in its real interactive state — for example open a modal and wait for the dialog to be visible — then scope the scan with \`.include('[role="dialog"]')\` or \`.include('#storybook-root')\`. Component-level scans give the fastest feedback and the smallest blast radius for fixes.

### How do I attach the violation report to the Playwright HTML report?

Use \`testInfo.attach\` after running the scan: \`await testInfo.attach('axe-results', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });\`. The attachment shows up in the HTML report viewed with \`npx playwright show-report\` and in CI artifacts, so reviewers can drill into every violation without re-running the test.

### Does passing axe-core mean my site is fully accessible?

No. Axe-core reliably catches the machine-detectable subset of WCAG, which is large and regression-prone but not the whole story. It cannot evaluate whether alt text is meaningful, whether the keyboard tab order is logical, or whether a screen-reader experience makes sense. Treat a green axe run as a strong automated floor, then add manual keyboard testing and assistive-technology review on top.

## Conclusion

\`@axe-core/playwright\` makes accessibility a first-class, automated part of your test suite. With \`AxeBuilder\` and \`analyze()\` you run real WCAG checks against the live DOM, scope them with \`include\` and \`exclude\`, choose strictness with \`withTags\`, silence genuine noise with \`disableRules\`, and assert \`violations\` equal to an empty array so failures are actionable. Centralize the configuration in a fixture, attach raw results to the HTML reporter for an audit trail, and gate CI so regressions never reach production. Remember its honest limits and pair it with manual review for the things only a human can judge. Start by adding the package, writing one full-page scan, and turning it into a fixture, then explore the [QA skills directory](/skills) for installable accessibility and Playwright skills, and pair these checks with [strong locator habits](/blog/playwright-locators-best-practices-2026) for a suite that is both reliable and inclusive.
`,
};
