import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright ARIA Snapshots: toMatchAriaSnapshot Guide 2026',
  description:
    'Master Playwright ARIA snapshots with toMatchAriaSnapshot: YAML accessibility-tree assertions, inline vs external snapshots, regex names, partial matching, and a11y regression.',
  date: '2026-06-27',
  category: 'Guide',
  content: `
# Playwright ARIA Snapshots: toMatchAriaSnapshot Guide 2026

ARIA snapshots are one of the most underused features in modern Playwright, and once you start using them they tend to replace a surprising amount of brittle assertion code. Instead of checking individual elements with a pile of \`expect(locator).toHaveText()\` and \`toBeVisible()\` calls, an ARIA snapshot captures the *accessibility tree* of a locator — the roles and accessible names that assistive technology actually sees — and asserts the whole structure at once as a compact YAML document. It is part structural assertion, part accessibility check, and part resilient locator strategy, all in a single API: \`expect(locator).toMatchAriaSnapshot()\`.

The accessibility tree is what a screen reader builds from your DOM. Every meaningful element resolves to a *role* (button, heading, link, checkbox, listitem) and an *accessible name* (the text a user would hear). ARIA snapshots serialise that tree to YAML, so a heading becomes \`- heading "Welcome"\` and a button becomes \`- button "Sign in"\`. Because the snapshot is built from semantics rather than from CSS classes or DOM nesting, it survives the kind of markup refactors that shatter selector-based tests — change a \`<div>\` to a \`<section>\`, reorder utility classes, swap a styling library, and the accessibility tree stays the same as long as the roles and names do.

This guide is a practical, code-first walkthrough. We will cover what ARIA snapshots are, how \`toMatchAriaSnapshot\` works with both inline strings and external \`.aria.yml\` files, how to auto-generate and update them, the full YAML syntax including regex names and attribute matchers, how partial matching keeps tests stable, and how all of this ties into accessibility regression testing. For the bigger accessibility picture — axe-core scans, WCAG coverage, and CI gating — pair this with the [accessibility testing automation guide](/blog/accessibility-testing-automation-guide). For Playwright fundamentals, the [Playwright end-to-end testing guide](/blog/playwright-e2e-complete-guide) is the natural prerequisite.

## What ARIA snapshots are

An ARIA snapshot is a YAML representation of the accessibility tree rooted at a given locator. When you call \`toMatchAriaSnapshot\`, Playwright computes the accessible roles and names of the matched element and its descendants, serialises them to YAML, and compares that string against your expected snapshot.

Consider this markup:

\`\`\`html
<nav aria-label="Main">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/skills">Skills</a></li>
    <li><a href="/blog">Blog</a></li>
  </ul>
</nav>
\`\`\`

Its ARIA snapshot looks like this:

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

Notice what is *not* there: no \`<div>\` wrappers, no class names, no inline styles, no \`href\` attributes (the link's accessible name is what matters, not its target). The snapshot captures the meaning of the UI, which is exactly the contract you usually care about in an end-to-end test.

## Your first toMatchAriaSnapshot test

The simplest form passes an inline YAML string. This is great for small, focused assertions where the expected structure is short enough to read inline.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('primary navigation has the expected structure', async ({ page }) => {
  await page.goto('https://qaskills.sh');

  await expect(page.getByRole('navigation', { name: 'Main' })).toMatchAriaSnapshot(\\\`
    - navigation "Main":
      - list:
        - listitem:
          - link "Home"
        - listitem:
          - link "Skills"
        - listitem:
          - link "Blog"
  \\\`);
});
\`\`\`

If the live accessibility tree matches the YAML, the test passes. If a link is renamed, removed, reordered, or loses its role, the assertion fails with a readable diff that shows exactly which line of the tree changed — far more useful than a generic "element not found".

## Inline snapshots vs external .aria.yml files

You have two storage options for the expected snapshot, and they suit different situations.

| Approach | Where the snapshot lives | Best for |
|---|---|---|
| Inline string | In the test file, passed to \`toMatchAriaSnapshot()\` | Short, focused trees; assertions you want to read at a glance |
| External file | A \`.aria.yml\` file beside the test, referenced by name | Large trees; full-page snapshots; snapshots you regenerate often |

The external form keeps big snapshots out of your test logic:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('landing page matches stored accessibility tree', async ({ page }) => {
  await page.goto('https://qaskills.sh');

  // Compares against landing.aria.yml stored next to the test
  await expect(page.locator('body')).toMatchAriaSnapshot({ name: 'landing.aria.yml' });
});
\`\`\`

Playwright stores the file under a snapshots folder next to the spec. External snapshots shine for full-page or large-component trees because they keep your test body readable and let you review snapshot changes as a self-contained diff in code review.

## Generating and updating snapshots automatically

You rarely write ARIA YAML by hand. Playwright generates it for you. The fastest path is to write the assertion with an empty expectation and let the update flag fill it in:

\`\`\`typescript
test('account menu', async ({ page }) => {
  await page.goto('https://qaskills.sh/dashboard');
  // Leave it empty, then run with --update-snapshots
  await expect(page.getByRole('navigation', { name: 'Account' })).toMatchAriaSnapshot();
});
\`\`\`

Then run:

\`\`\`bash
# Generate or refresh the expected snapshots, then they are written
# back into your test (inline) or into the .aria.yml file (external)
npx playwright test --update-snapshots
\`\`\`

For inline snapshots, Playwright writes the generated YAML directly into your test source. For external snapshots, it creates or overwrites the \`.aria.yml\` file. After the update run, inspect the diff carefully before committing — an \`--update-snapshots\` run accepts whatever the page currently renders, so review it like you would review a screenshot baseline.

You can also explore the tree interactively. The Playwright Inspector and codegen surface the ARIA snapshot of any element, which is handy for discovering the right locator and copying a starting YAML block.

## The ARIA snapshot YAML format

The YAML mini-language is small. Here is the full vocabulary you will use day to day.

A node is \`- role "accessible name"\`. Nesting expresses parent/child relationships in the accessibility tree:

\`\`\`yaml
- list:
  - listitem:
    - link "Documentation"
  - listitem:
    - link "Pricing"
\`\`\`

### Attributes

Roles can carry state and property attributes in square brackets. These assert ARIA state, not just structure:

\`\`\`yaml
- checkbox "Subscribe to newsletter" [checked]
- heading "Welcome back" [level=1]
- button "Show details" [expanded=false]
- option "Dark theme" [selected]
- textbox "Email" [disabled]
\`\`\`

Common attribute matchers:

| Attribute | Meaning |
|---|---|
| \`[checked]\` / \`[checked=false]\` | Checkbox or radio checked state |
| \`[level=N]\` | Heading level (h1 → \`[level=1]\`) |
| \`[expanded]\` | Disclosure / accordion expanded state |
| \`[selected]\` | Selected option or tab |
| \`[disabled]\` | Disabled control |
| \`[pressed]\` | Toggle button pressed state |

### Children containment with /children: contain

By default a snapshot must match the children exactly. When you only care that *some* expected children are present — and want to ignore extra siblings — use \`/children: contain\`:

\`\`\`yaml
- list:
  - /children: contain
  - listitem:
    - link "Skills"
  - listitem:
    - link "Blog"
\`\`\`

This asserts the list contains those two items in order but tolerates additional list items around them. It is the key tool for keeping snapshots stable when a list grows over time.

### Regex matching of accessible names

Accessible names that contain dynamic content — counts, dates, user names — would otherwise break a snapshot on every run. Wrap the name in slashes to match it as a regular expression:

\`\`\`yaml
- heading /Welcome back, .+/
- text /\\\\d+ skills installed/
- link /^View \\\\d+ reviews$/
- listitem:
  - link /Issue #\\\\d+/
\`\`\`

Regex names turn an otherwise flaky snapshot into a robust contract: you assert the *shape* of the text ("some number of skills installed") without pinning the exact value.

## Partial and subtree matching

A crucial design decision in ARIA snapshots is that they are **not** required to capture the entire page. You snapshot a *locator*, so you choose the subtree. Combined with \`/children: contain\`, this lets you assert exactly the slice of UI you care about and ignore everything else.

\`\`\`typescript
test('pricing card shows the right plan structure', async ({ page }) => {
  await page.goto('https://qaskills.sh/pricing');

  // Scope the snapshot to one card — the rest of the page is irrelevant
  await expect(page.getByRole('article', { name: 'Pro plan' })).toMatchAriaSnapshot(\\\`
    - article "Pro plan":
      - heading "Pro" [level=3]
      - text /\\\\$\\\\d+ per month/
      - list:
        - /children: contain
        - listitem: "Unlimited skills"
        - listitem: "Priority support"
      - button "Choose Pro"
  \\\`);
});
\`\`\`

This is why ARIA snapshots tend to be far more stable than DOM or CSS selectors: you assert semantic structure within a scoped subtree, tolerate incidental additions with containment, and shrug off text variation with regex names. The test fails only when the meaningful contract changes — which is precisely when you *want* it to fail.

## ARIA snapshot vs screenshot vs DOM snapshot

It helps to place \`toMatchAriaSnapshot\` next to the two other snapshot styles Playwright supports, because they catch different classes of regression.

| Dimension | ARIA snapshot | Pixel screenshot | DOM / HTML snapshot |
|---|---|---|---|
| What it captures | Roles + accessible names (a11y tree) | Rendered pixels | Raw HTML markup |
| Stability to CSS / layout change | High — ignores styling | Low — any visual shift fails | Medium — class changes can break it |
| Catches visual regressions | No | Yes | No |
| Catches accessibility regressions | Yes | No | Partially |
| Cross-browser / cross-OS noise | Very low | High (font / AA rendering) | Low |
| Readability of diffs | High (semantic YAML) | Low (image diff) | Low (HTML noise) |
| Best at | Structure + a11y + resilient locators | Pixel-perfect visual QA | Exact markup contracts |

The honest summary: use ARIA snapshots for structural and accessibility assertions, and reach for pixel screenshots only when you genuinely need to catch a *visual* change (a broken layout, a wrong colour). The two are complementary, not competing. For more on the visual side, the [accessibility testing automation guide](/blog/accessibility-testing-automation-guide) covers how a11y tooling and visual checks fit together, and the [AI test automation tools roundup](/blog/ai-test-automation-tools-2026) surveys where automated assertion generation is heading.

## A sample generated .aria.yml file

Here is what a stored external snapshot looks like for a small dashboard header, as Playwright would generate it. You commit this file alongside the test.

\`\`\`yaml
# dashboard-header.aria.yml
- banner:
  - link "QASkills home"
  - navigation "Primary":
    - list:
      - listitem:
        - link "Leaderboard"
      - listitem:
        - link "Skills"
      - listitem:
        - link "Blog"
  - button "Open account menu" [expanded=false]
  - heading /Hello, .+/ [level=1]
\`\`\`

Reading it top to bottom tells you the whole accessible structure of the header at a glance — far more useful in a pull request than an opaque image baseline. When a reviewer sees a line change from \`button "Open account menu"\` to \`button "Account"\`, they immediately understand the user-facing impact.

## Common ARIA roles and the elements that produce them

You will read and write roles constantly, so it pays to internalise the mapping between HTML elements and the implicit ARIA roles they expose. This is the same mapping the accessibility tree uses.

| HTML element | Implicit ARIA role |
|---|---|
| \`<button>\` | button |
| \`<a href>\` | link |
| \`<h1>\` – \`<h6>\` | heading (with \`[level=N]\`) |
| \`<input type="checkbox">\` | checkbox |
| \`<input type="radio">\` | radio |
| \`<input type="text">\` | textbox |
| \`<select>\` | combobox |
| \`<nav>\` | navigation |
| \`<main>\` | main |
| \`<header>\` (top level) | banner |
| \`<footer>\` (top level) | contentinfo |
| \`<ul>\` / \`<ol>\` | list |
| \`<li>\` | listitem |
| \`<table>\` | table |
| \`<img alt="...">\` | img |
| \`<dialog>\` | dialog |

If an element shows up with the wrong role in your snapshot — or with no accessible name where you expected one — that is frequently a real accessibility bug surfacing, not a test problem. A button rendered as a \`<div onclick>\` will not appear as \`button\` in the tree, and that is exactly the kind of regression ARIA snapshots are good at catching.

## ARIA snapshots as accessibility regression tests and resilient locators

There are two distinct ways teams use this feature, and the best teams use both.

**As accessibility regression guards.** A committed ARIA snapshot is a contract that says "this part of the UI exposes these roles and names to assistive technology". If a refactor accidentally strips an \`aria-label\`, demotes a heading level, or turns a real button into a clickable \`<div>\`, the snapshot diff shows it immediately. This complements, rather than replaces, a rules-based scanner like axe-core: axe finds *known WCAG violations*, while ARIA snapshots lock in *your specific intended structure*. Run both — see the [accessibility testing automation guide](/blog/accessibility-testing-automation-guide) for how to layer them in CI.

**As resilient locators.** Because the YAML is semantic, you can use a small ARIA snapshot as a stable anchor for a region of the page that would otherwise need fragile CSS selectors. When the design system swaps class names or restructures wrappers, the snapshot keeps passing as long as the roles and names hold — which dramatically reduces locator churn over a project's lifetime.

\`\`\`typescript
test('checkout summary stays semantically stable across redesign', async ({ page }) => {
  await page.goto('https://qaskills.sh/checkout');

  await expect(page.getByRole('region', { name: 'Order summary' })).toMatchAriaSnapshot(\\\`
    - region "Order summary":
      - heading "Order summary" [level=2]
      - list:
        - /children: contain
        - listitem: /Pro plan/
      - text /Total: \\\\$\\\\d+/
      - button "Place order"
  \\\`);
});
\`\`\`

## CI workflow and reviewing snapshot diffs

In CI, ARIA snapshots run like any other Playwright assertion — there is no separate tooling. The one operational rule is the same as for any baseline: **never update snapshots automatically in CI**. The \`--update-snapshots\` flag should only ever run on a developer's machine or in a deliberate, reviewed step, because it blindly accepts whatever the page currently renders.

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
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      # No --update-snapshots in CI: this only verifies against committed baselines
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
\`\`\`

When a snapshot fails, the HTML report shows a line-by-line YAML diff — added, removed, and changed roles/names highlighted. Because the diff is text, code review is straightforward: a reviewer reads the changed lines and decides whether the change is intended (approve and the developer regenerates the baseline locally) or a regression (reject and the developer fixes the code). That readability is the single biggest practical advantage over pixel baselines, where every diff is an image you have to squint at.

A good workflow: develop locally, run \`npx playwright test --update-snapshots\` to refresh baselines, commit the updated \`.aria.yml\` files (or inline changes) *alongside* the code that changed them, and let CI verify that nothing else drifted. The snapshot change and the code change land in the same reviewable diff.

## Frequently Asked Questions

### What is an ARIA snapshot in Playwright?

An ARIA snapshot is a YAML representation of the accessibility tree rooted at a locator — the roles and accessible names that assistive technology sees. Playwright's \`toMatchAriaSnapshot\` assertion serialises that tree and compares it to an expected snapshot. Because it captures semantics rather than CSS or DOM structure, it survives markup refactors that break selector-based tests.

### How does toMatchAriaSnapshot work?

You call \`expect(locator).toMatchAriaSnapshot()\` with either an inline YAML string or a reference to an external \`.aria.yml\` file. Playwright computes the live accessibility tree under that locator, serialises it to YAML, and diffs it against your expected snapshot. If a role, accessible name, or asserted attribute changes, the test fails with a readable line-by-line YAML diff.

### How do I update ARIA snapshots in Playwright?

Run \`npx playwright test --update-snapshots\`. For inline snapshots, Playwright writes the generated YAML back into your test source; for external snapshots, it creates or overwrites the \`.aria.yml\` file. Always review the resulting diff before committing, because an update run accepts whatever the page currently renders — treat it like accepting a visual baseline.

### What is the difference between an ARIA snapshot and a screenshot?

A screenshot captures rendered pixels and catches visual regressions but is noisy across browsers and fonts. An ARIA snapshot captures roles and accessible names, ignores styling entirely, and catches structural and accessibility regressions with readable text diffs. Use ARIA snapshots for structure and a11y, and reserve pixel screenshots for genuine visual checks — they are complementary, not competing.

### Can ARIA snapshots match dynamic text?

Yes. Wrap an accessible name in slashes to match it as a regular expression, for example \`- heading /Welcome back, .+/\` or \`- text /\\\\d+ skills installed/\`. This lets you assert the shape of dynamic content — counts, dates, user names — without pinning the exact value, which keeps snapshots stable across runs that render different data.

### How do I do partial matching with ARIA snapshots?

Two mechanisms. First, you snapshot a *locator*, so you naturally scope the assertion to one subtree and ignore the rest of the page. Second, add \`- /children: contain\` inside a node to assert that listed children are present in order while tolerating extra siblings. Combined with regex names, this lets you assert exactly the contract you care about.

### Are ARIA snapshots good for accessibility testing?

They are excellent as accessibility *regression* guards: a committed snapshot locks in the roles and names your UI exposes, so a refactor that strips an aria-label or demotes a heading fails immediately. They complement rule-based scanners like axe-core, which find known WCAG violations. Run both — the scanner for standards compliance, ARIA snapshots for your specific intended structure.

### Where does Playwright store .aria.yml snapshot files?

External ARIA snapshots are stored in a snapshots directory next to the spec file that references them, named by the \`name\` you pass to \`toMatchAriaSnapshot({ name: 'header.aria.yml' })\`. You commit these files to version control alongside the test, so snapshot changes appear in the same reviewable diff as the code changes that caused them.

## Conclusion

ARIA snapshots give you assertions that read like a description of your UI, survive cosmetic refactors, double as accessibility regression guards, and produce diffs a reviewer can actually read. Start small — snapshot one navigation region or one card, generate the YAML with \`--update-snapshots\`, then expand coverage as you trust it. Lean on \`/children: contain\` and regex names to keep snapshots stable, and never auto-update baselines in CI.

If you want your AI coding agent to scaffold these tests for you with the right roles, names, and matchers from the start, browse the [QASkills directory](/skills) and install a Playwright accessibility skill — then let your agent write resilient, semantic tests on its first try. For the wider accessibility strategy that surrounds these snapshots, continue with the [accessibility testing automation guide](/blog/accessibility-testing-automation-guide).
`,
};
