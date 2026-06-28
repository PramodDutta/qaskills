import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright ARIA Snapshots: toMatchAriaSnapshot Guide (2026)',
  description:
    'Learn Playwright ARIA snapshots with toMatchAriaSnapshot. Assert the YAML accessibility tree instead of brittle CSS or screenshots, plus regex matching and CI tips.',
  date: '2026-06-28',
  category: 'Guide',
  content: `
Playwright ARIA snapshots let you assert the structure of a page using its accessibility tree instead of brittle CSS selectors, raw DOM, or pixel screenshots. With \`expect(locator).toMatchAriaSnapshot()\`, you capture a YAML representation of roles and accessible names -- headings, buttons, lists, links -- and compare it against an approved baseline. This guide explains how Playwright ARIA snapshots work, the YAML aria format, inline versus file-based snapshots, updating snapshots with \`--update-snapshots\`, regex and partial matching, and why ARIA snapshot testing is far more resilient than text or screenshot assertions. By the end you will know exactly when to reach for \`toMatchAriaSnapshot\` and how it doubles as a lightweight accessibility check.

## Key Takeaways

- Playwright ARIA snapshots assert a YAML view of the accessibility tree -- roles plus accessible names plus nesting -- so they survive CSS refactors, class renames, and markup churn that break selector-based assertions
- \`expect(locator).toMatchAriaSnapshot()\` supports inline YAML, auto-generated file-based snapshots (\`.aria.yml\`), and partial matching with regular expressions for dynamic text
- Running the suite with \`--update-snapshots\` generates or refreshes baselines, just like screenshot snapshots, but the diffs are human-readable YAML instead of opaque image bytes
- Compared to \`toHaveScreenshot()\`, ARIA snapshots are deterministic across operating systems and fonts, produce reviewable git diffs, and never flake on anti-aliasing
- Because the assertion is built on roles and accessible names, a passing ARIA snapshot also confirms your semantic structure is intact -- a free accessibility regression guard
- AI agents equipped with QA skills from [QASkills.sh](/skills) can generate and maintain ARIA snapshot suites alongside your functional tests

## What Is a Playwright ARIA Snapshot?

A Playwright ARIA snapshot is a YAML serialization of the accessibility tree for a given locator. The accessibility tree is the same structure assistive technologies like screen readers consume: every meaningful element is reduced to an ARIA role (\`heading\`, \`button\`, \`link\`, \`list\`, \`textbox\`) and its accessible name (the text a screen reader announces). Playwright walks that tree and emits indented YAML that mirrors the nesting.

Here is what a snapshot of a simple navigation region looks like:

\`\`\`yaml
- navigation:
  - list:
    - listitem:
      - link "Home"
    - listitem:
      - link "Products"
    - listitem:
      - link "Pricing"
\`\`\`

Notice what is and is not captured. The roles and accessible names are present. The CSS classes, \`data-testid\` attributes, wrapper \`<div>\` elements, inline styles, and DOM order quirks are all gone. That is the entire point: you assert what the page *means* to a user and to assistive technology, not how it happens to be marked up today.

This makes ARIA snapshots a structural assertion. Where a selector test says "an element matching \`.nav__link--primary\` exists and contains the text Home," an ARIA snapshot says "there is a navigation landmark containing a list of three links named Home, Products, and Pricing, in that order." The second statement is closer to a real acceptance criterion and far less coupled to implementation details.

## How toMatchAriaSnapshot Works

The assertion lives on Playwright's \`expect\` and takes a YAML string (inline) or, with no argument, reads from a generated snapshot file. The matcher resolves the accessibility tree for the locator and compares it against the expected YAML.

A minimal inline example:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('header exposes the expected accessibility tree', async ({ page }) => {
  await page.goto('https://example.com');

  await expect(page.locator('header')).toMatchAriaSnapshot(\`
    - banner:
      - heading "Acme Dashboard" [level=1]
      - navigation:
        - link "Home"
        - link "Settings"
      - button "Sign out"
  \`);
});
\`\`\`

If the live accessibility tree matches the YAML, the test passes. If a heading level changes, a link is renamed, or the sign-out button loses its accessible name, the assertion fails with a readable diff showing exactly which node diverged. Because the comparison is on roles and names, swapping a \`<div onclick>\` for a proper \`<button>\` (or vice versa) changes the result -- which is usually exactly the regression you want to catch.

The matcher is also a strict-by-default subtree match: the YAML you provide must describe every child of the targeted locator at the level you specify. To match loosely, you use regex and partial techniques covered below.

## Generating Your First ARIA Snapshot

Writing YAML trees by hand is tedious. Playwright generates them for you. The fastest path is to write an empty assertion and let the test runner fill it in.

Start with an empty inline snapshot:

\`\`\`typescript
test('generate the main content snapshot', async ({ page }) => {
  await page.goto('https://example.com/pricing');
  await expect(page.locator('main')).toMatchAriaSnapshot(\`\`);
});
\`\`\`

Then run with the update flag:

\`\`\`bash
npx playwright test --update-snapshots
\`\`\`

Playwright captures the current accessibility tree and writes the YAML back into your test file, replacing the empty template literal. Review the generated tree, trim anything you do not want to assert on, and commit it. From then on the test compares against that baseline.

You can also generate snapshots interactively. The Playwright Inspector and codegen surface an "Assert snapshot" action that emits a \`toMatchAriaSnapshot\` call for whatever element you point at:

\`\`\`bash
npx playwright codegen https://example.com/pricing
\`\`\`

Codegen is the recommended way to seed snapshots for a page you are testing for the first time, because it shows the exact accessible names Playwright computes -- which occasionally differ from the visible text when \`aria-label\`, \`alt\`, or \`aria-labelledby\` are involved.

## Inline vs File-Based ARIA Snapshots

Playwright supports two storage strategies, and choosing the right one matters for readability and maintenance.

**Inline snapshots** live as a template literal directly in the test, as shown above. They keep the expectation next to the action, which is great for small, stable trees where a reviewer benefits from seeing the structure inline.

**File-based snapshots** store the YAML in an external \`.aria.yml\` file alongside the test, referenced by name. They suit larger trees that would bloat the test file and pages whose structure you snapshot in several tests.

To use a file-based snapshot, pass a \`name\`:

\`\`\`typescript
test('pricing page structure', async ({ page }) => {
  await page.goto('https://example.com/pricing');
  await expect(page.locator('main')).toMatchAriaSnapshot({
    name: 'pricing-main.aria.yml',
  });
});
\`\`\`

The first run with \`--update-snapshots\` creates \`pricing-main.aria.yml\` in the test's snapshot directory:

\`\`\`yaml
- main:
  - heading "Choose your plan" [level=1]
  - list:
    - listitem:
      - heading "Starter" [level=2]
      - text "$0 / month"
      - button "Get started"
    - listitem:
      - heading "Pro" [level=2]
      - text "$29 / month"
      - button "Start free trial"
  - link "Compare all features"
\`\`\`

Subsequent runs compare against that file. The table below summarizes when to pick each approach.

| Snapshot style | Stored in | Best for | Review experience |
|---|---|---|---|
| Inline | The test file, as a template literal | Small, stable trees; assertions a reviewer should see at a glance | Structure visible in the test diff |
| File-based \`.aria.yml\` | Separate snapshot file next to the test | Large trees; structures reused across multiple tests | Cleaner test file; YAML diff in a dedicated file |

A practical rule: if the YAML is more than roughly ten lines, move it to a file. Tests stay focused on behavior, and the YAML diffs land in their own files where they are easy to review.

## The YAML ARIA Node Syntax Reference

The YAML format is small but expressive. Each node is a role, optionally followed by a quoted accessible name, optionally followed by bracketed attributes. Children are indented beneath their parent. Here is a reference of the syntax you will use most.

| Syntax | Meaning | Example |
|---|---|---|
| \`- role\` | A node with a role and no asserted name | \`- list\` |
| \`- role "name"\` | A role with an exact accessible name | \`- button "Submit"\` |
| \`- heading "Title" [level=1]\` | A heading at a specific level | \`- heading "Welcome" [level=2]\` |
| \`- checkbox [checked]\` | A boolean ARIA state | \`- checkbox "Remember me" [checked]\` |
| \`- option "Pro" [selected]\` | A selected option | \`- option "Pro" [selected]\` |
| \`- button "More" [expanded]\` | An expandable control's state | \`- button "Menu" [expanded=false]\` |
| \`- textbox "Email" [disabled]\` | A disabled form control | \`- textbox "Email" [disabled]\` |
| \`- /name "regex"/\` | A regular-expression accessible name | \`- link /Read more about .*/\` |
| Indentation | Parent/child nesting | Children indented two spaces under the parent |

A richer example combining several of these:

\`\`\`yaml
- form "Sign up":
  - textbox "Email"
  - textbox "Password"
  - checkbox "I agree to the terms" [checked]
  - button "Create account" [disabled]
- alert "Password must be at least 8 characters"
\`\`\`

The bracketed states -- \`level\`, \`checked\`, \`selected\`, \`expanded\`, \`disabled\`, \`pressed\` -- map directly to ARIA properties Playwright computes from the live element. Asserting on these is powerful: it lets a single snapshot verify both structure (a checkbox exists in this position) and state (it is currently checked) in one human-readable block.

## Partial and Regex Matching for Dynamic Content

Real pages contain dynamic text: timestamps, usernames, item counts, prices. A strict exact-name match would flake every time that text changes. Playwright solves this with regular-expression names and partial matching.

To match an accessible name by pattern, wrap it in slashes:

\`\`\`typescript
test('dashboard greets the logged-in user', async ({ page }) => {
  await page.goto('https://example.com/dashboard');

  await expect(page.locator('header')).toMatchAriaSnapshot(\`
    - banner:
      - heading /Welcome back, .+/ [level=1]
      - text /\\\\d+ unread notifications/
      - button "Sign out"
  \`);
});
\`\`\`

The \`/Welcome back, .+/\` pattern matches "Welcome back, Pramod" or "Welcome back, Sam" without hardcoding a name. The \`/\\\\d+ unread notifications/\` pattern tolerates any count. This is the single most important technique for keeping ARIA snapshots green on data-driven pages.

Partial structural matching is achieved by targeting a narrower locator. Instead of snapshotting the entire \`main\`, snapshot only the region you care about so unrelated dynamic siblings do not enter the tree:

\`\`\`typescript
await expect(page.getByRole('navigation', { name: 'Primary' })).toMatchAriaSnapshot(\`
  - navigation "Primary":
    - link "Home"
    - link "Reports"
    - link "Settings"
\`);
\`\`\`

By scoping to the primary navigation landmark you assert exactly that subtree and ignore the rest of the page. Combining a tight locator with regex names gives you snapshots that are specific where it matters and forgiving where it should be.

## Combining ARIA Snapshots With getByRole

ARIA snapshots and \`getByRole\` are two sides of the same accessibility-first philosophy, and they compose well. Use \`getByRole\` to scope to a region, then snapshot that region's full tree. This pattern produces tests that read like specifications.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('checkout summary structure and totals', async ({ page }) => {
  await page.goto('https://shop.example.com/checkout');

  const summary = page.getByRole('region', { name: 'Order summary' });

  await expect(summary).toMatchAriaSnapshot(\`
    - region "Order summary":
      - heading "Order summary" [level=2]
      - list:
        - listitem:
          - text "Wireless keyboard"
          - text /\\\\$\\\\d+\\\\.\\\\d{2}/
        - listitem:
          - text "USB-C cable"
          - text /\\\\$\\\\d+\\\\.\\\\d{2}/
      - text /Total: \\\\$\\\\d+\\\\.\\\\d{2}/
      - button "Place order"
  \`);
});
\`\`\`

The \`getByRole\` call gives you a stable, accessibility-driven anchor; the snapshot then verifies everything inside it. If a developer accidentally removes the "Place order" button, drops a line item, or breaks the heading hierarchy, the snapshot fails with a precise diff. If you want to learn the role-based locator patterns this builds on, the [Playwright E2E guide](/blog/playwright-e2e-complete-guide) covers \`getByRole\`, fixtures, and the Page Object Model in depth.

## ARIA Snapshots vs Screenshot vs Text Snapshots

ARIA snapshots occupy a useful middle ground between the two older snapshot styles. Text snapshots (\`toMatchSnapshot\` on serialized content) are too coarse and noisy; screenshot snapshots (\`toHaveScreenshot\`) are pixel-precise but flaky and unreviewable. ARIA snapshots assert semantic structure -- usually the right altitude.

| Dimension | ARIA snapshot | Screenshot snapshot | Text snapshot |
|---|---|---|---|
| What it asserts | Roles + accessible names + nesting | Exact pixels | Raw serialized string |
| Resilience to CSS changes | High -- ignores styling entirely | None -- any visual change fails | Medium -- depends on markup |
| Cross-OS / font stability | Deterministic | Flaky (anti-aliasing, fonts) | Deterministic |
| Diff readability | Human-readable YAML | Opaque image diff | Plain but often noisy |
| Catches accessibility regressions | Yes, by construction | No | No |
| Catches visual / pixel regressions | No | Yes | No |
| Best at | Structure and semantics | Pixel-perfect UI | Small, exact strings |

The headline difference versus \`toHaveScreenshot()\` is determinism. Screenshot snapshots routinely fail when run on a different OS, GPU, or font-rendering stack than the one that produced the baseline, which is why teams pin them to a single Docker image. ARIA snapshots have no such dependency -- the accessibility tree is identical across platforms, so the same baseline passes everywhere.

That said, the two are complementary, not competing. ARIA snapshots cannot see a broken color, a misaligned button, or a z-index bug. For those you still want pixel comparisons. A mature suite uses ARIA snapshots for structure and reserves [visual regression testing](/blog/visual-regression-testing-guide) for the genuinely visual checks where pixels are the point.

## Why ARIA Snapshots Are More Resilient

The resilience advantage comes down to what changes during normal development. Front-end work churns through CSS classes, refactors component wrappers, swaps styling libraries, and reorders DOM nodes for layout reasons -- none of which alters what the page *means*. Selector tests and screenshot tests both break on this churn. ARIA snapshots do not, because the accessibility tree only changes when roles, names, states, or semantic nesting change.

Consider a concrete refactor. A team migrates a hand-rolled dropdown built from \`<div>\` elements to a proper \`<select>\` with real \`<option>\` children. Every \`data-testid\` selector breaks. Every screenshot baseline breaks because the native control renders differently. But if the dropdown was accessible before and after, an ARIA snapshot asserting \`combobox\` with named \`option\` children may pass unchanged -- and where it does change, the diff is meaningful and reviewable.

The flip side is that ARIA snapshots fail loudly on the changes that *should* fail. Removing a heading, dropping an \`aria-label\`, breaking the heading-level hierarchy, or replacing a semantic \`<button>\` with a click-handler \`<div>\` all change the tree and trip the snapshot. These are precisely the regressions that hurt real users and that selector tests tend to miss. In effect, ARIA snapshots are tuned to the right signal: indifferent to cosmetic change, sensitive to semantic change.

## ARIA Snapshots as a Lightweight Accessibility Check

Because the assertion is computed from the accessibility tree, a passing ARIA snapshot is also a statement about your accessibility. It is not a full audit -- it will not catch color-contrast failures, missing focus management, or keyboard traps -- but it does lock in three things automatically: every interactive element has a role, every named element keeps its accessible name, and the heading hierarchy stays intact.

This catches a whole class of regressions cheaply. If a developer ships an icon button without an \`aria-label\`, the snapshot node loses its name and the test fails. If a \`<button>\` is downgraded to a \`<div onclick>\`, the \`button\` role disappears from the tree. If someone renumbers headings and creates an \`h1 -> h3\` jump, the \`[level=...]\` attributes shift. Each of these is a genuine accessibility defect surfaced by a test you were running anyway for structural reasons.

Treat ARIA snapshots as the first layer of an accessibility strategy, not the whole thing. Pair them with a dedicated axe-core scan for contrast, ARIA misuse, and label coverage; pair them with manual keyboard and screen-reader passes for interaction quality. The full layered approach -- automated rule scanning plus structural snapshots plus manual testing -- is laid out in the [accessibility testing automation](/blog/accessibility-testing-automation-guide) guide. ARIA snapshots are the cheapest, most maintainable layer, which is exactly why they belong in your regular E2E suite rather than a separate accessibility pipeline.

## When to Use Each Assertion

Knowing which matcher to reach for is half the battle. The three snapshot-style assertions, plus the everyday \`expect\` matchers, each have a clear lane.

| Goal | Use | Why |
|---|---|---|
| Verify page structure and semantics survive refactors | \`toMatchAriaSnapshot()\` | Asserts roles + names; ignores styling and markup churn |
| Catch pixel-level visual regressions (color, layout, spacing) | \`toHaveScreenshot()\` | Only pixel comparison sees purely visual bugs |
| Assert one specific value (count, label, error text) | \`expect(locator).toHaveText()\` / \`toHaveValue()\` | Targeted assertions are clearer than a whole tree for a single fact |
| Confirm a single element exists with a role and name | \`expect(getByRole(...)).toBeVisible()\` | Lighter than a snapshot when you only care about one node |
| Lock in a large region's full structure | \`toMatchAriaSnapshot()\` with a file-based \`.aria.yml\` | Keeps the test readable while asserting many nodes |

A balanced suite mixes these. Use \`getByRole\` + \`toBeVisible\`/\`toHaveText\` for the precise behavioral assertions in a flow, an ARIA snapshot to lock the overall structure of each key page, and a small number of screenshot snapshots for the components where appearance is the requirement. Avoid the temptation to snapshot everything -- an ARIA snapshot of the entire \`body\` is brittle and unreviewable. Scope tightly and assert intentionally.

## CI and the Update-Snapshots Workflow

In CI, ARIA snapshots follow the same baseline-and-review discipline as screenshots, but with a much better diffing story. The golden rule is identical: never let CI silently regenerate baselines. Production runs must compare against committed YAML and fail on any difference.

A typical GitHub Actions step runs the suite without the update flag:

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
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
\`\`\`

When a legitimate structural change lands, a developer updates the baselines locally and commits them, so the change is reviewed in the pull request:

\`\`\`bash
# Update only the ARIA snapshots that changed, then review the YAML diff
npx playwright test --update-snapshots

# Inspect what moved before committing
git diff -- '*.aria.yml' '**/*.spec.ts'
\`\`\`

This is where ARIA snapshots shine in code review. A screenshot baseline update shows up as a binary blob -- a reviewer has to open both images to understand it. An ARIA snapshot update shows up as a YAML diff: a reviewer reads \`- button "Submit"\` became \`- button "Place order"\` and instantly knows whether the change is intended. Reviewable baselines are a real workflow advantage, especially on teams where snapshot updates would otherwise be rubber-stamped. For the broader CI/CD setup -- sharding, retries, and artifact uploads -- see the [Playwright E2E guide](/blog/playwright-e2e-complete-guide).

To keep CI green and meaningful, run snapshots on a stable, deterministic page state: wait for network idle or for a specific element before snapshotting, mock or freeze dynamic data where you can, and use regex names for anything genuinely variable. Because the accessibility tree is OS-independent, you do not need to pin a specific runner image the way screenshot tests demand -- one fewer source of CI friction.

## Conclusion

Playwright ARIA snapshots give you a structural assertion at exactly the right altitude: resilient to the CSS and markup churn that breaks selector and screenshot tests, sensitive to the semantic regressions that hurt real users, and reviewable as plain YAML in every pull request. With \`toMatchAriaSnapshot()\` you assert roles, accessible names, and nesting; with \`--update-snapshots\` you generate and refresh baselines effortlessly; with regex names and tight \`getByRole\` scopes you stay green on dynamic content. As a bonus, every passing snapshot doubles as a lightweight accessibility guard for free.

Adopt them as a layer, not a replacement: ARIA snapshots for structure, screenshots for genuinely visual checks, and targeted matchers for single values. Start by snapshotting your most important pages, scope each assertion to a meaningful region, and let codegen seed the YAML so you are reviewing rather than authoring trees by hand.

Ready to go further? AI coding agents can scaffold and maintain ARIA snapshot suites alongside the rest of your tests. Browse the QA skills for Playwright, accessibility, and end-to-end testing at [QASkills.sh](/skills) and equip your agent to write resilient, accessibility-aware tests on its own. [Browse QA skills](/skills) and start building a suite that survives your next refactor.

## Frequently Asked Questions

### What is an ARIA snapshot in Playwright?

An ARIA snapshot is a YAML serialization of a page's accessibility tree for a given locator. It captures each element's ARIA role and accessible name along with their nesting, deliberately ignoring CSS classes, attributes, and wrapper elements. You assert it with the toMatchAriaSnapshot matcher, which compares the live tree against an approved baseline and fails with a readable diff when the structure or naming changes.

### How is toMatchAriaSnapshot different from toHaveScreenshot?

toMatchAriaSnapshot asserts semantic structure -- roles, names, and nesting -- while toHaveScreenshot asserts exact pixels. The ARIA matcher is deterministic across operating systems and fonts, ignores styling changes, and produces human-readable YAML diffs. Screenshots catch purely visual bugs like color or alignment but flake on anti-aliasing and font rendering. They are complementary: use ARIA snapshots for structure and screenshots only where appearance itself is the requirement.

### Do ARIA snapshots test accessibility?

Partially. Because the assertion is computed from the accessibility tree, a passing snapshot confirms that interactive elements have roles, named elements keep their accessible names, and the heading hierarchy is intact. It will not catch color-contrast failures, keyboard traps, or focus-management bugs, so it is a lightweight guard rather than a full audit. Pair it with an axe-core scan and manual keyboard and screen-reader testing for complete coverage.

### How do I update an ARIA snapshot?

Run your test suite with the update flag, for example by passing the update-snapshots option to the Playwright test command. Playwright captures the current accessibility tree and writes the YAML back into your inline assertion or the file-based snapshot. Always review the resulting diff before committing so intended structural changes are confirmed in code review, and never let CI regenerate baselines automatically on production runs.

### Should I use inline or file-based ARIA snapshots?

Use inline snapshots for small, stable trees where seeing the structure next to the action helps reviewers, roughly under ten lines of YAML. Use file-based snapshots stored in a separate file for larger trees or structures reused across several tests, which keeps the test file focused on behavior. File-based snapshots also produce dedicated, easy-to-review diffs when the structure changes during normal development work.

### How do I handle dynamic text in ARIA snapshots?

Wrap the accessible name in slashes to match it with a regular expression instead of an exact string. This lets a node like a greeting or an item count match any value that fits the pattern, so the snapshot does not flake when data changes. You can also scope the assertion to a narrower locator so unrelated dynamic siblings never enter the captured tree in the first place.

### Are ARIA snapshots more reliable than selector-based assertions?

For structural verification, yes. Selector tests break whenever CSS classes, test ids, or wrapper elements change, even when the page still means the same thing to users. ARIA snapshots only change when roles, names, states, or semantic nesting change, so they survive routine front-end refactors while still failing loudly on real regressions like a removed heading or a button downgraded to a non-semantic div.

### Can ARIA snapshots run in continuous integration?

Yes, and they fit CI better than screenshots. The accessibility tree is identical across operating systems and fonts, so you do not need to pin a specific runner image to avoid flaky diffs. Run the suite without the update flag in CI so it compares against committed baselines and fails on differences. When structure legitimately changes, update and commit the YAML locally so the change is reviewed in the pull request.
`,
};
