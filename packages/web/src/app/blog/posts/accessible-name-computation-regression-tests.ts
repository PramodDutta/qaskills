import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'accessible name computation regression tests',
  description:
    'accessible name computation regression tests: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Accessibility Testing',
  primaryKeyword: 'accessible name computation regression tests',
  keywords: [
    'accessible name computation regression tests',
    'accessible name computation test',
    'aria-labelledby order regression',
    'hidden label accessibility test',
    'button name fallback test',
    'accessible description versus name',
  ],
  relatedSlugs: [
    'accessibility-testing-automation-guide',
    'mobile-accessibility-testing-guide',
    'axe-core-playwright-accessibility-testing-2026',
    'wcag-2-2-testing-checklist-qa-engineers',
  ],
  sources: [
    'https://www.w3.org/TR/accname-1.2/',
    'https://www.w3.org/WAI/WCAG21/Techniques/general/G1',
  ],
  repoEvidence: [
    'seed-skills/accessibility-a11y-enhanced/SKILL.md',
    'seed-skills/wcag-accessibility-testing/SKILL.md',
  ],
  content: `Accessible name computation regression tests compare the name exposed through browser accessibility APIs with a fixed precedence fixture. They vary referenced ID order, hidden references, empty author labels, native labels, visible text, and descriptions separately. Automated role queries catch exact changes, while a short keyboard and screen reader check confirms the user-facing result.

## What does accessible name computation regression tests verify?

Accessible name computation regression tests verify that one element keeps the expected flat name after markup, component, browser, or styling changes. A useful pass records the element role, exact computed name, description, source markup, browser build, and the single condition varied by the case.

The contract is about the exposed name, not the text that happens to be visible beside a control. A button can display words yet receive its name from an author reference, while descriptive help can remain separate from the short label.

The W3C [Accessible Name and Description Computation 1.2 draft](https://www.w3.org/TR/accname-1.2/) defines a recursive text-equivalent process. It processes valid \`aria-labelledby\` references in listed order, then considers a nonempty \`aria-label\`, host-language labels, and permitted content when earlier sources do not return a name.

That source also distinguishes a name from a description. The name identifies an object, while \`aria-describedby\` can contribute a longer explanation through the description calculation. A test that concatenates both properties into one expected string hides a real semantic fault.

Repository guidance supplies a practical test frame rather than this exact algorithm suite. The file \`seed-skills/accessibility-a11y-enhanced/SKILL.md\` demonstrates Playwright role checks, label inspection, axe scans, keyboard actions, and screen reader review.

The companion \`seed-skills/wcag-accessibility-testing/SKILL.md\` calls for focused, independent checks with controlled async work and cleanup. This article combines those repository practices with the external algorithm to recommend a narrow component-boundary gate.

A broad accessibility scan remains useful, but it cannot replace exact expected names for every precedence branch. The [accessibility automation guide](/blog/accessibility-testing-automation-guide) covers wider scanning, while this suite owns the string computed for one named control.

## How do you build an accessible name computation test?

An accessible name computation test starts with a tiny document whose expected strings are obvious before any framework renders it. Give every source a unique word, reverse the ID list in a second control, and avoid repeated labels until the dedicated duplicate-text case.

Use one page or component story with buttons named by two visible spans, two hidden spans, one empty \`aria-label\`, one native \`label\`, and one description. Keep IDs stable and reset the document between cases so a detached node cannot remain in shared state.

The first positive case should prove the harness itself. Render \`aria-labelledby="action object"\` where those nodes contain "Archive" and "report", then locate a button by the exact name "Archive report". Reverse only the references and require "report Archive".

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('follows aria-labelledby token order', async ({ page }) => {
  await page.setContent(\`
    <span id="action">Archive</span>
    <span id="object">report</span>
    <button id="first" aria-labelledby="action object">Ignored text</button>
    <button id="second" aria-labelledby="object action">Ignored text</button>
  \`);

  await expect(page.getByRole('button', { name: 'Archive report', exact: true })).toHaveId(
    'first',
  );
  await expect(page.getByRole('button', { name: 'report Archive', exact: true })).toHaveId(
    'second',
  );
});
\`\`\`

This assertion observes the same role-and-name pair that a browser exposes to accessibility tooling. Checking only the attribute value would prove source text, not the computed result after reference resolution and whitespace flattening.

Add an accessibility snapshot beside the role query when the runner supports one. Store only the small fixture subtree, because a full-page snapshot creates unrelated churn and can bury the first changed name.

Use an axe scan as a separate signal, following the repository example. An empty scan does not prove order or fallback, but a violation can reveal malformed ARIA that makes the name result untrustworthy.

Finish the baseline with keyboard focus. Tab to the button, assert its stable role and exact name, then activate it once. The [WCAG skip-link technique](https://www.w3.org/WAI/WCAG21/Techniques/general/G1) illustrates why keyboard procedures should state focus visibility, activation, and destination instead of reporting only that a key was pressed.

For broader browser setup, consult the [axe and Playwright guide](/blog/axe-core-playwright-accessibility-testing-2026). Keep this fixture independent so browser differences can be compared without application data, network calls, or user sessions.

## What breaks aria-labelledby order regression?

An aria-labelledby order regression breaks when a refactor changes token order, resolves the wrong node, drops referenced hidden text, or lets a lower-priority source replace a valid author name. The strongest diagnosis identifies the first input and output pair that differs, not merely a failed visual snapshot.

Token order is easy to lose when a component builds IDs from an object or sorted array. The DOM may contain the same nodes and visible words, yet the flat name changes because the algorithm processes each valid reference in the order written.

Hidden-node behavior needs a precise fixture. A node directly referenced by \`aria-labelledby\` can contribute text even when that referenced node is hidden, while unrelated hidden descendants follow different traversal conditions. Do not summarize all hidden markup with one expected rule.

An empty or whitespace-only \`aria-label\` should not become a meaningful author string in this fixture. The case should show whether the browser proceeds to a native label or allowed text content, and the report should retain the original attribute bytes.

Descriptions create another common false result. If a button has visible text "Delete" and \`aria-describedby="warning"\`, its name can remain "Delete" while its description carries the warning. A matcher that searches a combined accessibility dump may pass despite swapping those fields.

Framework behavior can imitate an application defect. Hydration may replace IDs, a test utility may query before the second label mounts, and a browser channel may expose a draft algorithm change. Record rendered markup, query time, browser build, and snapshot before assigning ownership.

Runner setup can also create false confidence. A direct DOM helper that reads \`innerText\` skips author-label precedence, while a selector based on CSS visibility can omit a referenced hidden node that remains relevant to name computation.

Repeat the failing case in a plain static document. If the name remains wrong there, compare browsers and the cited algorithm; if it becomes correct, inspect component rendering, ID stability, and query timing before changing the oracle.

The [mobile accessibility guide](/blog/mobile-accessibility-testing-guide) covers device and assistive-technology variation. For this web component gate, treat platform speech wording as supporting evidence and keep the browser-computed flat string as the deterministic assertion.

## Which fixtures expose a hidden label accessibility test?

A hidden label accessibility test needs good, bad, edge, repeat, and cleanup cases that change one markup fact. Pair each hidden link with a shown twin that has other text, or a weak query may get the right words from the wrong node.

The good case links straight to a hidden span and expects its text in the final name. A hidden span with no link is the bad control and must not change that string.

The edge case puts a hidden child under a shown linked parent. Its result should differ from the case that links to the hidden node itself, in line with the full walk rule.

The blank-source case clears text from the linked node but keeps its ID. Check if the links left can form the name, then test a page where all ID links are bad and fallback text must win.

Same shown text tests node ID rather than looks. Give two spans the word "Save", link only one, then change the span with no link. The final name should stay fixed even though a text query could find either span.

The repeat case swaps hidden and shown pages several times in one worker. Names and role counts must match each time, with no extra nodes, old IDs, or tree dumps left after reset.

Cleanup should close or replace the whole test page, not just clear one control. Remove event hooks and made-up IDs too, since those old values can make later runs depend on case order.

Keep a small fact set with case ID, markup hash, control ID, right name, seen name, seen help text, role, browser, and cleanup state. Do not save full app HTML when a short part shows the bug.

The [WCAG test list](/blog/wcag-2-2-testing-checklist-qa-engineers) can guide the wider release pass. Keep this hidden-label grid small enough to run on a laptop and explain a mismatch with one saved part.

## How should button name fallback test be asserted?

A button name fallback test should match the exact role and name for each source, then prove that the first valid source wins. It should check help text on its own and use the button once by key, since a named but dead button still fails users.

Start with shown text alone and use that text as the name. Add a native label where HTML allows one, then add a filled \`aria-label\` and require its words instead of page text.

Next add valid \`aria-labelledby\` links and require their words in order rather than the \`aria-label\`. Remove the linked nodes, keep the author label, and check that the next valid source can now win.

Use an exact match instead of a part match. "Save", "Save draft", and "Autosave settings" can all pass a loose search, but they point users to quite different tasks.

Use loose time order for events, not for the final string. The role query comes after the page is ready and before use, while a click or key event comes after focus. Times may shift, but this order must stay fixed.

Put the time bound around page readiness, not a set of guesses for many names. Wait for a mark that says all source nodes are ready, then run one exact query and save its fault.

The next table check keeps the name and help text apart. It builds on repo role and ARIA samples with cases drawn from the W3C name rule.

\`\`\`typescript
import { test, expect } from '@playwright/test';

const cases = [
  {
    id: 'text',
    html: '<button>Publish</button>',
    name: 'Publish',
    description: '',
  },
  {
    id: 'empty-author',
    html: '<button aria-label="   ">Publish</button>',
    name: 'Publish',
    description: '',
  },
  {
    id: 'described',
    html: '<p id="help">Sends now</p><button aria-describedby="help">Publish</button>',
    name: 'Publish',
    description: 'Sends now',
  },
];

for (const item of cases) {
  test(item.id, async ({ page }) => {
    await page.setContent(item.html);
    const button = page.getByRole('button', { name: item.name, exact: true });
    await expect(button).toHaveAccessibleName(item.name);
    await expect(button).toHaveAccessibleDescription(item.description);
  });
}
\`\`\`

Do not replace this grid with a check that some name exists. Each bad case still has text, so only the right source and exact string show an order change.

A hands-on pass should use the same small cases and right labels. Save the browser, screen reader, spoken name, spoken help, and use result, but do not make shifts in speech marks block CI.

## How do you separate accessible description versus name in CI?

Accessible description versus name should appear as two fields for one role and control ID. CI fails if either exact field changes, the role query finds more than one match, or the page never becomes ready.

Put the cases in a small job with one browser build for pull requests. Run more builds on a set plan, so browser rule changes are seen without making each code change wait for a full support grid.

Save the shortest markup part and tree dump only after a fault. Put right and seen strings in plain JSON fields so a reviewer need not guess the mismatch from a screen shot.

Group faults by phase: draw, query, name, help, key, scan, or cleanup. A missing control is not a name-order bug, and an axe fault does not prove that the right name changed.

The report should cite \`seed-skills/accessibility-a11y-enhanced/SKILL.md\` for role checks, ARIA checks, axe use, and screen reader review. It should cite \`seed-skills/wcag-accessibility-testing/SKILL.md\` for small cases, safe waits, cleanup, reports, and CI runs.

Those repo files do not state the ID link order or hidden-link result used here. Keep the W3C source next to the right result grid so a future rule change gets a clear code review.

Do not upload user data, a whole app DOM, or screen reader logs with private text. A made-up page with unique plain words gives enough facts for this test and keeps the file safe to read.

When a planned browser run differs, run the same static page on a laptop before filing an app bug. Add the build check and first bad case, then choose whether the app, browser, source rule, or test owns it.

Use the [access test group](/categories/accessibility-testing) for more checks and the [FAQ](/faq) for site questions. Neither page replaces the source, right value, and seen value in each CI case.

## accessible name computation regression tests comparison matrix

The test grid keeps source order, hidden-node walks, fallback, and help text in one review. Each row changes one fact and names what should fail first.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Two referenced IDs in each order | Same spans and button, reversed IDREF tokens | Exact name follows token order | Both buttons expose one order | AccName 1.2 |
| Visible and hidden referenced labels | One directly referenced span changes visibility | Direct reference contributes expected text | Hidden reference disappears unexpectedly | AccName 1.2 |
| Empty aria-label with button text | Whitespace author label and stable content | Visible text supplies the button name | Empty string or stale author name wins | AccName 1.2 |
| Description without explicit author name | Visible button text plus aria-describedby | Name and description stay separate | Description replaces or joins the name | AccName 1.2 |
| Native label plus author label | Stable host label and nonempty aria-label | Valid author name has expected priority | Native and author strings are merged | AccName 1.2 |

Run the first row both ways to prove the check can spot order. If just one order is seen, a fixed right string or reused query may be hiding the fault.

The hidden row needs two forms because a direct hidden link and a hidden child do not mean the same thing. Name each markup shape in the case ID and save the source part after a fault.

The fallback row should test blank, space-only, missing, and filled author values. Keep page text fixed, or a change at the same time makes the source that won hard to see.

The help row should call \`toHaveAccessibleName\` and \`toHaveAccessibleDescription\` on their own. A joined tree dump can still help, but plain fields must hold both results too.

The last row guards code that adds ARIA props after native props. Key order in a JavaScript object is not the browser name rule, so check final markup and the final name instead of guessing from source code.

Treat the grid as a bug contract, not proof for all browsers. A planned support run may find a browser gap that needs review before the main CI build or right result changes.

For more page work, read the [web access test guide](/blog/accessibility-testing-automation-guide). Keep these cases near one control so a fault points to one source-order rule instead of many other page bugs.

## How do you implement accessible name computation regression tests?

Implement accessible name computation regression tests with a clean ordered-link case first, then add one source fault per case. Save the exact page part and split the name from help text before adding more browsers or screen readers.

1. Read \`seed-skills/accessibility-a11y-enhanced/SKILL.md\` and \`seed-skills/wcag-accessibility-testing/SKILL.md\`, then record their supported role, label, keyboard, scan, independence, report, and cleanup practices.
2. Create a fresh static fixture with reversed \`aria-labelledby\` IDs, directly hidden references, empty labels, duplicate text, fallback content, and a separate \`aria-describedby\` node.
3. Run the positive ordered-ID case and capture the role query, exact accessible name, exact description, small accessibility snapshot, focus result, and browser metadata.
4. Change ID order, hidden traversal, author-label value, fallback source, and description wiring one at a time while every unrelated node remains fixed.
5. Compare each result with the five-row matrix, then report the first phase and exact property that diverges instead of one generic accessibility error.
6. Run the focused project in CI, retain synthetic failure evidence, close the page, clear generated IDs and listeners, and link the failure to the matching repository practice.

Start with local static HTML because it keeps app start-up and user data out of the first proof. Once each branch fails for its planned fault, mount the real control with the same inputs and use the same result grid.

Add a fault that sorts the two ID tokens. The order case must fail while hidden, fallback, and help cases stay green, which proves the suite points to one rule.

Add a second fault that reads \`innerText\` as the right name. Hidden and author-order cases must fail, which proves the test does not copy the same bad short cut as app code.

Run each case on a fresh page and count role matches. One match is part of the pass rule, since two controls can make a query choose the wrong one with the right name.

Pin the main browser in test config and save its build. A moving browser can change between runs, which turns a sound support clue into a vague pull-request fault.

After the fixed suite passes, do the short key and screen reader pass on the same page. Save a small human check list with the release log, while exact browser fields stay the repeatable gate.

The [mobile access guide](/blog/mobile-accessibility-testing-guide) can take this idea to native apps. Do not bring a web name-order rule to a native control without a matching rule for that platform.

At last, rerun the grid after control kit, browser, ARIA, and page draw changes. A source update should change right strings only in a reviewed commit that cites the rule and case.

## Frequently Asked Questions

### How can automated and manual checks catch accessible-name changes caused by aria-labelledby order, hidden nodes, and fallback text?

Use exact role and name queries on pages that change one fact, then check a small tree dump and help field. Flip ID order, change linked hidden text, and remove author labels in their own cases. A key and screen reader pass backs the result, while CI saves the first bad string and markup part.

### What should an accessible name computation test fixture record?

Record case ID, full test markup, control ID, role, right and seen names, right and seen help text, browser build, query time, and cleanup state. Add a small tree dump only after a fault. These fields split bad source, early queries, browser gaps, and wrong test rules without saving live user data.

### Which failure proves aria-labelledby order regression is broken?

The clearest fault is two controls with the same linked nodes and flipped ID tokens that expose one name order. Check that their final fields differ and each linked node exists. If a plain static page shows the same fault, compare the browser with the W3C rule before changing app code.

### How do teams isolate hidden label accessibility test?

Use hidden text linked at once, a hidden control with no link, and a shown linked parent with a hidden child as three cases. Give each node unique text and rebuild the page each time. This splits link walks from shown-state queries, old nodes, same words, app start-up, and shared browser state.

### Which assertion is strongest for button name fallback test?

Assert one exact button role, one exact name, and exact help text after a known ready mark. Then prove source order by adding or taking away one valid source. Part matches, filled-field checks, shown-text checks, and axe alone cannot tell which name branch made the string.

### How should CI report accessible description versus name failures?

Report name and help as separate right and seen fields, with role, case ID, page part, browser build, and first bad phase. Add a small tree dump after a fault and name the owner as draw, query, source rule, browser, or cleanup. Never turn both fields into one vague access error.

## Conclusion

Accessible name computation regression tests pass when linked ID order, hidden-node walks, author labels, native fallback, page text, and help text yield the reviewed fields. The best suite starts with one small good page, changes one source at a time, and saves enough facts to find the first broken rule.

Review the [web access test guide](/blog/accessibility-testing-automation-guide), then open the [QA skills list](/skills) and implement the accessible name computation regression tests matrix in the next test run. Keep the browser check exact and the hands-on pass short, repeatable, and tied to the same test controls.`,
};
