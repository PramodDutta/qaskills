import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Accessibility Testing with Axe: Complete 2026 Guide',
  description: 'Automate accessibility testing in Playwright with @axe-core/playwright. WCAG 2.2 audits, custom rules, snapshot diffs, and CI gating with TypeScript examples.',
  date: '2026-05-03',
  category: 'Guide',
  content: `
# Playwright Accessibility Testing with Axe: Complete 2026 Guide

Accessibility is a feature. The legal stakes (ADA, EAA, ACA), the audience (15 percent of users have a disability), and the engineering economics (issues caught earlier cost less) all argue for shipping accessibility checks alongside functional tests. Playwright plus \`@axe-core/playwright\` is the lowest-friction stack for running automated accessibility audits in 2026: it inspects the rendered DOM in a real browser, applies WCAG 2.2 rules, and surfaces violations with selectors you can act on immediately.

Automated checks cannot replace manual testing. Roughly thirty percent of WCAG criteria are testable by software; the rest require human judgment. But automated checks catch the regressions that human testers find tedious, and they run on every pull request, which is exactly when defects are cheapest to fix. This guide shows how to wire \`@axe-core/playwright\` into a Playwright suite, scope audits sensibly, fail builds on violations, and write the kind of test that holds up under WCAG 2.2.

For broader testing fundamentals, see the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide). For AI-assisted patterns, install the [playwright-e2e skill](/skills/playwright-e2e).

## Installing axe for Playwright

\`@axe-core/playwright\` is the official Deque integration. It bundles axe-core and exposes an \`AxeBuilder\` class that runs against a Playwright page.

\`\`\`bash
pnpm add -D @axe-core/playwright
\`\`\`

No browser extensions, no CDN scripts, no extra configuration. The package injects axe-core directly into the page at audit time.

## Your first accessibility test

\`\`\`typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home page has no detectable accessibility violations', async ({ page }) => {
  await page.goto('https://qaskills.sh');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
\`\`\`

That single test runs every WCAG 2.0 and 2.1 rule that axe knows about against the current page. If violations exist, the failure message includes the rule ID, the help URL, and the offending selectors. The fix is usually a one-line markup change.

## Scoping audits

Auditing the whole page on every test is slow and produces noise from third-party widgets. Scope to the part of the page you actually own with \`include\` and \`exclude\`.

\`\`\`typescript
test('checkout form has no violations', async ({ page }) => {
  await page.goto('https://qaskills.sh/checkout');
  const results = await new AxeBuilder({ page })
    .include('#checkout-form')
    .exclude('.third-party-widget')
    .analyze();
  expect(results.violations).toEqual([]);
});
\`\`\`

The selectors accept any CSS string axe understands. Use \`exclude\` to filter out elements outside your control, like embedded Stripe iframes or Intercom widgets.

## Selecting WCAG levels

By default axe runs the union of all tag groups it knows about. Restrict by tag to match the level your product targets.

| Tag | Meaning |
|---|---|
| \`wcag2a\` | WCAG 2.0 Level A |
| \`wcag2aa\` | WCAG 2.0 Level AA |
| \`wcag21a\` | WCAG 2.1 Level A additions |
| \`wcag21aa\` | WCAG 2.1 Level AA additions |
| \`wcag22aa\` | WCAG 2.2 Level AA additions |
| \`best-practice\` | Axe best practices beyond WCAG |
| \`section508\` | US federal Section 508 |
| \`EN-301-549\` | European Standard EN 301 549 |
| \`ACT\` | W3C Accessibility Conformance Testing rules |

\`\`\`typescript
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
  .analyze();
\`\`\`

Most US-based products in 2026 target WCAG 2.2 Level AA, which is the union of the five tags above plus \`best-practice\` if you want axe's extra recommendations.

## Disabling and tuning individual rules

Some rules produce false positives in legitimate situations. Disable per-test or globally with \`.disableRules\`.

\`\`\`typescript
const results = await new AxeBuilder({ page })
  .disableRules(['color-contrast', 'landmark-one-main'])
  .analyze();
\`\`\`

Reach for this when the rule is genuinely wrong for your context, not when you want to suppress legitimate violations. Better to fix the issue than mute the alarm.

## Custom rules

For org-specific accessibility patterns, register custom rules with axe.

\`\`\`typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('custom rule: every dialog has aria-modal', async ({ page }) => {
  await page.goto('https://qaskills.sh/dashboard');
  await page.getByRole('button', { name: 'Open settings' }).click();
  const builder = new AxeBuilder({ page }).options({
    rules: {
      'aria-modal-required': { enabled: true },
    },
    checks: [
      {
        id: 'has-aria-modal',
        evaluate: 'function(node) { return node.getAttribute("aria-modal") === "true"; }',
      },
    ],
    rulesData: [
      {
        id: 'aria-modal-required',
        selector: '[role="dialog"]',
        any: ['has-aria-modal'],
        tags: ['custom'],
        metadata: {
          description: 'Every dialog must declare aria-modal="true".',
          help: 'Internal accessibility standard. See go/a11y.',
          helpUrl: 'https://wiki.example.com/a11y',
        },
      },
    ],
  });
  const results = await builder.analyze();
  expect(results.violations).toEqual([]);
});
\`\`\`

Custom rules let your test suite enforce design system contracts that go beyond WCAG.

## Asserting incremental progress

Failing on any violation is the goal, but legacy products often start with hundreds of issues. Adopt a "no new violations" gate by snapshotting the current count and asserting it does not grow.

\`\`\`typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { promises as fs } from 'fs';
import { resolve } from 'path';

test('home page violations do not regress', async ({ page }) => {
  await page.goto('https://qaskills.sh');
  const results = await new AxeBuilder({ page }).analyze();
  const baselinePath = resolve(__dirname, 'baselines/home-a11y.json');
  const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'));
  const violationIds = results.violations.map((v) => v.id).sort();
  const baselineIds = baseline.violationIds.sort();
  const newViolations = violationIds.filter((id) => !baselineIds.includes(id));
  expect(newViolations).toEqual([]);
});
\`\`\`

Update the baseline only when you intentionally accept new violations, never to make a failing test pass. Audit the baseline file in code review.

## Combining accessibility with functional tests

Run an axe pass inside an existing functional test for almost no extra cost. The test already navigated to the page; running axe afterward is roughly a hundred milliseconds.

\`\`\`typescript
test('user can complete signup', async ({ page }) => {
  await page.goto('https://qaskills.sh/signup');
  await page.getByLabel('Email').fill('asha@example.com');
  await page.getByLabel('Password').fill('correct-horse-battery-staple');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
\`\`\`

The pattern catches accessibility regressions that only appear after specific state transitions (focus traps in modals, error message ordering, etc.).

## Common WCAG 2.2 violations and fixes

| Violation | Fix |
|---|---|
| \`color-contrast\` | Increase foreground/background contrast to 4.5:1 for normal text |
| \`label\` | Add \`<label for="">\` or \`aria-label\` to every input |
| \`button-name\` | Ensure every \`<button>\` has visible text or \`aria-label\` |
| \`link-name\` | Same for anchors |
| \`image-alt\` | Add meaningful \`alt\` text or \`alt=""\` for decorative images |
| \`document-title\` | Set a unique \`<title>\` per route |
| \`html-has-lang\` | Add \`lang="en"\` (or appropriate locale) to \`<html>\` |
| \`landmark-one-main\` | Wrap primary content in \`<main>\` |
| \`region\` | Wrap navigable groups in \`<nav>\`, \`<section>\`, or use \`role="region"\` |
| \`target-size\` (WCAG 2.2) | Interactive targets at least 24x24 CSS pixels |

The \`help\` and \`helpUrl\` fields in each violation give you a direct link to Deque's remediation guidance.

## Auditing pages that require auth

Most product surface area sits behind login. Use a storage state fixture so the auditing test starts from an authenticated session.

\`\`\`typescript
import { test as base } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

const test = base.extend({
  storageState: authFile,
});

test('dashboard a11y after login', async ({ page }) => {
  await page.goto('https://qaskills.sh/dashboard');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
\`\`\`

Use a separate setup project to write the auth state once and reuse across the audit suite. See [Playwright Browser Contexts Isolation Guide](/blog/playwright-browser-contexts-isolation-guide) for context patterns.

## CI integration

Add the audit suite as a separate project so failures are easy to attribute.

\`\`\`typescript
projects: [
  { name: 'e2e', testDir: './tests/e2e' },
  { name: 'a11y', testDir: './tests/a11y' },
],
\`\`\`

\`\`\`yaml
- name: Accessibility tests
  run: pnpm exec playwright test --project=a11y
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: a11y-report
    path: playwright-report
\`\`\`

Gate deploys on green status. For full CI scaffolding, see the [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026).

## Generating human-readable reports

The default JSON output is great for machines. For humans, generate an HTML summary using \`axe-html-reporter\`.

\`\`\`typescript
import { createHtmlReport } from 'axe-html-reporter';

const results = await new AxeBuilder({ page }).analyze();
const html = createHtmlReport({
  results,
  options: {
    projectKey: 'QASkills',
    outputDir: 'axe-reports',
  },
});
\`\`\`

The HTML report groups violations, includes selectors, and renders the offending node screenshot. Embed it in CI artifacts so PR reviewers can read findings without running the suite.

## Keyboard-only navigation tests

Axe checks markup, not behavior. Pair every audit with a keyboard navigation test for at least one critical flow.

\`\`\`typescript
test('checkout is keyboard-accessible', async ({ page }) => {
  await page.goto('https://qaskills.sh/checkout');
  await page.keyboard.press('Tab'); // skip link
  await page.keyboard.press('Tab'); // first form field
  await page.keyboard.type('Asha Patel');
  await page.keyboard.press('Tab');
  await page.keyboard.type('asha@example.com');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
});
\`\`\`

This catches focus order bugs and missing focus indicators that axe cannot see.

## Common pitfalls

**Pitfall 1: Auditing too early.** Calling \`.analyze()\` before the page finishes loading misses dynamic content. Always await an assertion that confirms the page is in the expected state first.

**Pitfall 2: Suppressing instead of fixing.** \`disableRules\` is a debt instrument. Track every disabled rule in code review and revisit quarterly.

**Pitfall 3: Forgetting modals.** Modal dialogs render outside the main DOM tree and are easy to forget. Open them in the test, then audit.

**Pitfall 4: Ignoring iframes.** Axe by default inspects only the main frame. Use \`.disableFrame()\` or \`.includeChildFrames()\` depending on whether you control the iframe.

**Pitfall 5: Stale baselines.** Snapshot-based gating only works if the baseline is reviewed. Treat baseline updates as security exceptions, not noise.

## Anti-patterns

- Running axe only on the home page. Audit critical flows: signup, checkout, dashboard, settings.
- Treating "no violations" as "fully accessible". Manual testing covers focus management, screen reader narration, and cognitive load that axe cannot.
- Adding ARIA attributes to fix violations without verifying real assistive technology behavior. Native HTML elements are almost always better.
- Splitting accessibility into a separate quarter-end project. Build it into every PR.

## What axe cannot catch

Axe covers approximately thirty percent of WCAG. The rest requires humans. Plan for:

- Keyboard navigation order matching visual order.
- Screen reader testing with NVDA, JAWS, and VoiceOver.
- Cognitive load assessment for forms and dashboards.
- Caption accuracy for video content.
- Sign language interpretation availability for live streams.

Pair axe with a quarterly manual audit by users with disabilities, or with an automated narration test framework like \`@guidepup/playwright\`.

## Multi-language audits

Sites that serve multiple locales must verify accessibility per locale. Loop across language switches.

\`\`\`typescript
const locales = ['en', 'es', 'fr', 'de', 'hi'];
for (const locale of locales) {
  test(\`a11y baseline for \${locale}\`, async ({ page }) => {
    await page.goto(\`https://qaskills.sh/\${locale}\`);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}
\`\`\`

Pair with the [Playwright Mobile Emulation Devices Reference](/blog/playwright-mobile-emulation-devices-reference) so each locale is audited at mobile and desktop viewports.

## Conclusion and next steps

Wiring \`@axe-core/playwright\` into your Playwright suite is the highest-leverage accessibility investment you can make today. The setup is two commands; the dividend is a permanent regression net that catches WCAG drift on every PR.

For programmatic remediation patterns, install the [playwright-e2e skill](/skills/playwright-e2e). For accessibility testing strategy more broadly, read [Accessibility Testing Automation Guide](/blog/accessibility-testing-automation-guide). For visual regression, pair with [Playwright Visual Comparison Snapshots Guide](/blog/playwright-visual-comparison-snapshots-guide).
`,
};
