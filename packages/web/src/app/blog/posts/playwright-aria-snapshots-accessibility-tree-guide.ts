import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright ARIA Snapshots and the Accessibility Tree: A Complete Guide',
  description:
    'Learn Playwright ARIA snapshots end to end — accessibility tree vs CSS selectors, toMatchAriaSnapshot(), YAML format, regex matching, axe-core, and CI workflows.',
  date: '2026-07-03',
  category: 'Reference',
  content: `
# Playwright ARIA Snapshots and the Accessibility Tree: A Complete Guide

Playwright ARIA snapshots let you assert against the **accessibility tree** — the same structure screen readers and assistive technologies consume — instead of brittle CSS selectors. Instead of writing dozens of individual \`expect(locator).toBeVisible()\` assertions, you capture one YAML snapshot that describes the roles, names, and hierarchy of a region and assert it in a single call with \`toMatchAriaSnapshot()\`.

This guide covers what ARIA snapshots are, why the accessibility tree beats CSS selectors for stability, how to generate and update snapshots, the YAML format in detail, regex matching, combining snapshots with \`getByRole\` and axe-core, and a full CI workflow. Every code block is runnable Playwright/TypeScript or valid ARIA YAML.

## What Are ARIA Snapshots?

An ARIA snapshot is a serialized, human-readable representation of the accessibility tree for a given element and its descendants. When you call \`expect(locator).toMatchAriaSnapshot()\`, Playwright walks the accessibility tree rooted at that locator, renders it as YAML, and compares it against an expected snapshot. If the structure — roles, accessible names, checked/expanded states — matches, the assertion passes.

Here is a minimal example. Given this markup:

\`\`\`html
<nav aria-label="Main">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/skills">Skills</a></li>
    <li><a href="/blog">Blog</a></li>
  </ul>
</nav>
\`\`\`

The ARIA snapshot for the \`<nav>\` looks like this:

\`\`\`yaml
- navigation "Main":
  - list:
    - listitem:
      - link "Home"
    - listitem:
      - link "Skills"
    - listitem:
      - link "Blog"
\`\`\`

And the test that asserts it:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('main navigation exposes the correct accessibility tree', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Main' })).toMatchAriaSnapshot(\`
    - navigation "Main":
      - list:
        - listitem:
          - link "Home"
        - listitem:
          - link "Skills"
        - listitem:
          - link "Blog"
  \`);
});
\`\`\`

Notice what the snapshot does *not* contain: no class names, no \`data-testid\`, no DOM nesting that is purely presentational. It records only what is semantically exposed to users of assistive technology. That is the entire point.

## Accessibility Tree vs CSS Selectors

Traditional Playwright tests lean on locators such as \`page.locator('.nav-list > li:nth-child(2) > a')\`. These couple your test to the DOM structure and styling. Rename a class, wrap an element in a new \`<div>\` for layout, or reorder markup, and the selector breaks even though nothing the user perceives has changed.

The accessibility tree is a projection of the DOM that browsers compute for assistive technology. It collapses presentational wrappers, resolves accessible names from \`aria-label\`, \`<label>\`, text content, and \`alt\` attributes, and surfaces roles and states. Asserting against it means your test fails only when the *user-facing semantics* change — which is exactly when a test should fail.

| Aspect | ARIA snapshot | Traditional CSS/XPath locators |
|---|---|---|
| Couples to | Roles, names, states | Class names, DOM nesting, order |
| Breaks when | User-facing semantics change | Markup or styling refactors |
| Readability | Declarative YAML, whole regions | Imperative, one assertion per element |
| Accessibility signal | Fails if a11y regresses | No a11y awareness |
| Maintenance | Regenerate with one flag | Hand-edit each selector |
| Best for | Structural regression of a region | Targeting a single dynamic element |

CSS selectors still have a place — for instance, when you need to click one specific button. But for asserting the *shape* of a page region, ARIA snapshots are dramatically more resilient. If you are still writing chains of \`nth-child\` locators, our [complete Playwright E2E guide](/blog/playwright-e2e-complete-guide) walks through migrating to role-based locators first.

## Using toMatchAriaSnapshot()

\`toMatchAriaSnapshot()\` is an assertion on a Locator. It has two forms: inline (the expected YAML is passed directly, as above) and file-based (the expected YAML lives in a snapshot file next to your test).

The inline form is best for small, stable regions you want to read at a glance in the test file:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('newsletter card renders expected structure', async ({ page }) => {
  await page.goto('/blog');
  const card = page.getByRole('region', { name: 'Newsletter' });
  await expect(card).toMatchAriaSnapshot(\`
    - region "Newsletter":
      - heading "Subscribe for QA updates" [level=2]
      - textbox "Email address"
      - button "Subscribe"
  \`);
});
\`\`\`

The file-based form keeps large snapshots out of your test body and enables automatic updating:

\`\`\`ts
test('full page structure matches baseline', async ({ page }) => {
  await page.goto('/skills');
  // Reads from a companion snapshot file; name is optional.
  await expect(page.locator('body')).toMatchAriaSnapshot({ name: 'skills-page.aria.yml' });
});
\`\`\`

When the named snapshot file does not yet exist, Playwright creates it on the first run (under the test's snapshot directory) and the assertion passes. Subsequent runs compare against it.

## Generating Snapshots Automatically

You rarely write the YAML by hand. There are two ergonomic ways to generate it.

**1. Codegen.** Launch the recorder and Playwright can emit \`toMatchAriaSnapshot\` calls as you interact:

\`\`\`bash
npx playwright codegen https://qaskills.sh/skills
\`\`\`

In the recorder's "Assert snapshot" mode, click a region and Playwright inserts the full ARIA snapshot into the generated test.

**2. Empty inline snapshot + update flag.** Write the assertion with an empty template literal, then let Playwright fill it in:

\`\`\`ts
test('generate the aria snapshot for the filter bar', async ({ page }) => {
  await page.goto('/skills');
  await expect(page.getByRole('toolbar', { name: 'Filters' })).toMatchAriaSnapshot(\`\`);
});
\`\`\`

Run with the update flag and Playwright rewrites the empty literal with the real tree:

\`\`\`bash
npx playwright test --update-snapshots
\`\`\`

After the run, the empty backticks are replaced with the generated YAML in your source file. Review the diff, commit it, and you have a baseline. This generate-then-review loop is the recommended workflow — it guarantees the snapshot reflects the real accessibility tree rather than your mental model of it.

## The YAML ARIA Snapshot Format

The snapshot format is deliberately compact. Each line is \`- role "accessible name" [state]\`. Children are nested by indentation. Understanding the pieces lets you read and hand-tune snapshots confidently.

- **Role** — the ARIA role, e.g. \`button\`, \`link\`, \`heading\`, \`textbox\`, \`checkbox\`, \`list\`, \`listitem\`, \`navigation\`, \`region\`.
- **Accessible name** — quoted string after the role. Derived from \`aria-label\`, associated \`<label>\`, text content, or \`alt\`. Omit it to match any name.
- **States and properties** — in square brackets: \`[checked]\`, \`[expanded]\`, \`[disabled]\`, \`[selected]\`, \`[level=2]\`, \`[pressed]\`.

A richer example with states:

\`\`\`yaml
- form "Sign up":
  - textbox "Email"
  - checkbox "I agree to the terms" [checked]
  - button "Create account" [disabled]
- navigation "Pagination":
  - button "Previous" [disabled]
  - button "Page 1" [pressed]
  - button "Page 2"
  - button "Next"
\`\`\`

For text content that is not itself a named role, use bare quoted strings and the \`text:\` shorthand:

\`\`\`yaml
- alert:
  - text: "Your session will expire in 5 minutes"
\`\`\`

Partial matching is the default for children in file-based snapshots you author: if you list only some children, Playwright checks that those exist in order but tolerates additional siblings. For strict, exact matching, keep the full generated tree.

## Asserting Roles and Names

Because ARIA snapshots key off roles and accessible names, they double as accessibility assertions. A snapshot that expects \`button "Subscribe"\` fails if the button loses its accessible name (for example, if someone replaces the text with an unlabeled icon). That is a genuine accessibility regression the snapshot catches for free.

You can scope a snapshot to any subtree, which keeps snapshots small and intention-revealing:

\`\`\`ts
test('skill card has an accessible name and action', async ({ page }) => {
  await page.goto('/skills');
  const firstCard = page.getByRole('article').first();
  await expect(firstCard).toMatchAriaSnapshot(\`
    - article:
      - heading /.+/ [level=3]
      - link "View skill"
  \`);
});
\`\`\`

Here \`heading /.+/\` uses a regular expression (covered next) to assert *some* non-empty heading exists without pinning its exact text — useful when the card title varies per skill but must always be present and correctly leveled.

## Regex in ARIA Snapshots

Accessible names are frequently dynamic: counts, dates, usernames, prices. Hard-coding them makes snapshots flaky. Playwright supports regular expressions in place of literal name strings by wrapping the pattern in slashes.

\`\`\`yaml
- region "Search results":
  - heading /\\\\d+ skills found/ [level=2]
  - list:
    - listitem:
      - link /.+/
\`\`\`

In a test:

\`\`\`ts
test('results heading shows a count', async ({ page }) => {
  await page.goto('/skills?q=api');
  await expect(page.getByRole('region', { name: 'Search results' })).toMatchAriaSnapshot(\`
    - region "Search results":
      - heading /\\\\d+ skills found/ [level=2]
  \`);
});
\`\`\`

The pattern \`/\\\\d+ skills found/\` matches "3 skills found", "42 skills found", and so on. Regex matching applies only to the accessible-name segment — roles and states are always literal. This is the single most important technique for keeping snapshots stable against dynamic content, and it is a common fix when eliminating flake; see our [guide to fixing flaky tests](/blog/fix-flaky-tests-guide) for the broader playbook.

## Combining ARIA Snapshots with getByRole

ARIA snapshots and \`getByRole\` are complementary. Use \`getByRole\` to *navigate to and act on* a specific element, and \`toMatchAriaSnapshot\` to *assert the structure* around it. The two share the same underlying accessibility model, so a role-based locator and a snapshot describe the world consistently.

A realistic flow test interleaves both:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('adding a skill updates the cart region', async ({ page }) => {
  await page.goto('/skills');

  // Act with getByRole.
  await page.getByRole('button', { name: 'Add Playwright E2E' }).click();

  // Assert structure with a snapshot.
  await expect(page.getByRole('region', { name: 'Selected skills' })).toMatchAriaSnapshot(\`
    - region "Selected skills":
      - heading "Selected skills (1)" [level=2]
      - list:
        - listitem:
          - text: "Playwright E2E"
          - button "Remove Playwright E2E"
  \`);
});
\`\`\`

Because both APIs resolve names the same way, if \`getByRole\` can find the button, the snapshot will describe it with the same name — no impedance mismatch.

## Combining with axe-core for Full Coverage

ARIA snapshots verify that the *structure you expect* is present. They do not check color contrast, ARIA attribute validity, or duplicate IDs. For those, pair snapshots with **axe-core** via \`@axe-core/playwright\`. Snapshots catch structural regressions; axe catches rule violations. Together they give layered accessibility coverage.

\`\`\`ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('skills page: structure snapshot plus axe audit', async ({ page }) => {
  await page.goto('/skills');

  // 1. Structural regression via ARIA snapshot.
  await expect(page.getByRole('main')).toMatchAriaSnapshot({ name: 'skills-main.aria.yml' });

  // 2. Rule-based audit via axe-core.
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
\`\`\`

Install the dependency first:

\`\`\`bash
npm install --save-dev @axe-core/playwright
\`\`\`

For a deeper dive into the tooling landscape, our roundup of [AI accessibility testing tools for 2026](/blog/ai-accessibility-testing-tools-2026) compares axe, Playwright snapshots, and AI-assisted auditors.

## CI Workflow for ARIA Snapshots

Snapshots are files in your repo, so they version like code. The CI rules are simple: **never update snapshots in CI**, fail the build on any mismatch, and upload the HTML report so reviewers can inspect diffs. Here is a GitHub Actions workflow:

\`\`\`yaml
name: e2e-aria
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
      - run: npx playwright install --with-deps chromium
      # No --update-snapshots here: CI must fail on drift, not silently rewrite baselines.
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: \\\${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
\`\`\`

The intentional detail is the absence of \`--update-snapshots\` in the CI run. Updating baselines is a *local, reviewed* action: you run \`npx playwright test --update-snapshots\` on your machine, eyeball the YAML diff, and commit it as part of the PR. CI's job is to catch drift, not to rubber-stamp it. Browse the [QA skills directory](/skills) for reusable Playwright and accessibility skills you can drop straight into this pipeline.

## Best Practices

A short set of rules keeps ARIA snapshots valuable instead of noisy.

| Practice | Why it matters |
|---|---|
| Scope snapshots to a region, not the whole \`body\` | Small snapshots produce readable diffs and fewer false failures |
| Prefer generated snapshots over hand-written ones | The generator reflects the real tree; you avoid transcription bugs |
| Use regex for dynamic names | Prevents flake from counts, dates, and user data |
| Review every snapshot diff in PRs | A changed snapshot is an accessibility change — treat it as such |
| Never run \`--update-snapshots\` in CI | Keeps baselines a deliberate, human-reviewed decision |
| Pair with axe-core | Snapshots miss contrast and attribute rules; axe covers them |

Two more habits pay off. First, name your file-based snapshots meaningfully (\`checkout-summary.aria.yml\`, not \`snapshot-3.aria.yml\`) so failures are self-describing. Second, keep the region under test genuinely accessible — if a snapshot is hard to author because roles and names are missing, that is a signal to fix the app, not the test.

## Migrating from Brittle Selectors

If you have an existing suite full of CSS selectors, migrate incrementally. Pick one flaky, structure-heavy test and replace its cluster of \`toBeVisible\` and \`nth-child\` assertions with a single ARIA snapshot.

Before:

\`\`\`ts
// Brittle: couples to DOM structure and order.
await expect(page.locator('.pagination li:nth-child(1) a')).toHaveText('Previous');
await expect(page.locator('.pagination li:nth-child(2) a')).toHaveText('1');
await expect(page.locator('.pagination li:nth-child(3) a')).toHaveText('2');
await expect(page.locator('.pagination li:last-child a')).toHaveText('Next');
\`\`\`

After:

\`\`\`ts
// Resilient: describes the accessible structure once.
await expect(page.getByRole('navigation', { name: 'Pagination' })).toMatchAriaSnapshot(\`
  - navigation "Pagination":
    - link "Previous"
    - link "1"
    - link "2"
    - link "Next"
\`);
\`\`\`

The migrated test is shorter, reads top-to-bottom like the UI, and survives layout refactors. Do this a test at a time; there is no need for a big-bang rewrite.

A useful heuristic for prioritizing migration: sort your existing tests by how often they have needed selector maintenance. The worst offenders — the tests you keep re-touching every time a designer reorders a flex container — are precisely the ones that benefit most from an ARIA snapshot. Migrate those first and you convert your highest-churn tests into some of your most stable, front-loading the return on the effort.

There is one migration trap worth calling out. If your current markup is *not* accessible — buttons with no accessible name, headings that skip levels, regions that are unnamed \`<div>\`s — the generated snapshot will faithfully record that broken structure. Do not encode the brokenness as your baseline. Fix the underlying accessibility first (add the label, correct the heading level, name the landmark), *then* generate the snapshot. Otherwise you have locked in a regression as your source of truth, and a future accessibility improvement will read as a snapshot failure.

## Handling Dynamic and Conditional Content

Real pages rarely render the same tree every time. Lists grow, banners appear, and states toggle. ARIA snapshots handle this gracefully if you lean on partial matching and regex rather than pinning exact counts. When you author a file-based snapshot and list only some children, Playwright verifies those children exist in order while tolerating extra siblings — so a product list can grow from three to thirty items without touching the snapshot, as long as the first few you asserted remain.

\`\`\`ts
test('results list contains at least the expected leading items', async ({ page }) => {
  await page.goto('/skills');
  // Assert the shape of the first two rows; extra rows are allowed.
  await expect(page.getByRole('list', { name: 'Skills' })).toMatchAriaSnapshot(\`
    - list "Skills":
      - listitem:
        - link /.+/
      - listitem:
        - link /.+/
  \`);
});
\`\`\`

For content that appears conditionally — a cookie banner, a promotional strip — either wait for the deterministic state before capturing, or scope your snapshot below the volatile region so it never sees the noise. The goal is a snapshot that is stable by construction, not one you constantly patch.

## Common ARIA Roles Reference

When authoring or reading snapshots, this quick reference of frequently seen roles and their typical HTML sources helps you predict what the tree will contain.

| Role | Common HTML source | Notes |
|---|---|---|
| \`button\` | \`<button>\`, \`<input type="button">\`, \`role="button"\` | Name from text, \`aria-label\`, or \`value\` |
| \`link\` | \`<a href>\` | Requires \`href\` to be a link |
| \`heading\` | \`<h1>\`–\`<h6>\` | Exposes \`[level=N]\` |
| \`textbox\` | \`<input type="text">\`, \`<textarea>\` | Name from \`<label>\` or \`aria-label\` |
| \`checkbox\` | \`<input type="checkbox">\` | Exposes \`[checked]\` |
| \`navigation\` | \`<nav>\` | Name from \`aria-label\` |
| \`list\` / \`listitem\` | \`<ul>\`/\`<ol>\` and \`<li>\` | Nesting reflects structure |
| \`region\` | \`<section aria-label>\` | Only a landmark when named |
| \`article\` | \`<article>\` | Self-contained content unit |
| \`alert\` | \`role="alert"\`, live regions | For assertive announcements |

Knowing these mappings means you can look at markup and anticipate the snapshot — and, conversely, read a snapshot diff and know exactly which element regressed.

## Frequently Asked Questions

### What is a Playwright ARIA snapshot?

A Playwright ARIA snapshot is a YAML serialization of the accessibility tree for a locator and its descendants. It records roles, accessible names, and states such as checked or expanded. You assert it with \`expect(locator).toMatchAriaSnapshot()\`, which fails only when the user-facing semantics of the region change, making it far more stable than CSS-selector assertions.

### How do I generate an ARIA snapshot automatically?

Write an assertion with an empty inline template — \`toMatchAriaSnapshot(\\\`\\\`)\` — then run \`npx playwright test --update-snapshots\`. Playwright fills the empty literal with the real accessibility tree. Alternatively, launch \`npx playwright codegen\` and use its snapshot-assertion mode to click a region and emit the full snapshot into your generated test.

### How do I update an ARIA snapshot after a UI change?

Run \`npx playwright test --update-snapshots\` locally. Playwright rewrites inline snapshots in your source and regenerates file-based \`.aria.yml\` baselines. Always review the resulting diff before committing, because a changed accessibility snapshot represents a real change in what assistive technology exposes. Never run the update flag inside CI.

### ARIA snapshots vs getByRole — which should I use?

Use both together. \`getByRole\` locates and acts on a single element, while \`toMatchAriaSnapshot\` asserts the structure of a whole region. They share Playwright's accessibility model, so names resolve identically. A typical test clicks with \`getByRole\` then verifies the resulting structure with a snapshot, giving you action and assertion in the same accessibility vocabulary.

### Can I use regular expressions in ARIA snapshots?

Yes. Wrap a pattern in slashes in place of a literal accessible name, for example \`heading /\\\\d+ results/\`. The regex applies only to the name segment; roles and states remain literal. This is the standard technique for tolerating dynamic content such as counts, dates, and usernames without making the snapshot flaky.

### Do ARIA snapshots replace axe-core?

No. Snapshots verify that the structure you expect is present and stable, but they do not check color contrast, invalid ARIA attributes, or duplicate IDs. Pair \`toMatchAriaSnapshot\` with \`@axe-core/playwright\` in the same test: the snapshot catches structural regressions and axe catches rule violations, giving layered accessibility coverage.

### Why do my ARIA snapshots keep failing in CI but pass locally?

The usual cause is running \`--update-snapshots\` locally (which rewrites baselines) but comparing strictly in CI. Commit the updated baselines so CI sees the same expected YAML. Other causes include dynamic names that need regex matching, locale or timezone differences, and animations changing the tree at capture time — wait for a stable state before asserting.

## Conclusion

ARIA snapshots move your assertions off fragile CSS structure and onto the accessibility tree — the layer that actually reflects what users experience. Generate them with \`--update-snapshots\`, keep names stable with regex, scope them to regions, pair them with axe-core, and never let CI rewrite your baselines. The payoff is a suite that fails when semantics regress and stays quiet through cosmetic refactors.

Ready to put this into practice? Explore reusable Playwright and accessibility testing skills for AI coding agents in the [QASkills directory](/skills) and drop them straight into your pipeline.
`,
};
