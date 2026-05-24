import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress + Applitools Visual AI Testing: Complete Guide 2026',
  description:
    'Complete guide to Cypress with Applitools Visual AI in 2026. Eyes setup, match levels, layouts, regions, A11y, cross-browser, Ultrafast Grid, and best practices.',
  date: '2026-05-21',
  category: 'Guide',
  content: `
# Cypress + Applitools Visual AI Testing: Complete Guide 2026

Applitools positions itself as visual testing with AI: rather than pixel-by-pixel comparison, it uses a vision algorithm to compare images at the level of layouts, content, and visual intent. This is meaningfully different from Percy or open-source pixel-diff tools. The practical effect: fewer false positives from anti-aliasing differences, font rendering differences, or platform-specific pixel rendering, and more focus on meaningful changes.

Applitools also ships the Ultrafast Grid, a cloud rendering service that takes a single DOM snapshot from your Cypress run and re-renders it across browsers, devices, and viewports. Instead of running Cypress 24 times for a 4x6 browser matrix, you run once and let the Grid do the parallel rendering. The cost savings are significant for teams that need broad cross-browser coverage.

This guide is the complete 2026 reference for integrating Applitools Eyes with Cypress. We cover installation, your first visual test, match levels, layout testing, region-based assertions, the Ultrafast Grid, batch organization, accessibility scanning, A/B baselining, and best practices distilled from real Applitools Cypress suites.

For broader Cypress references, browse [the blog index](/blog). For visual testing skills, see the [QA Skills directory](/skills).

## When to use Applitools

Applitools shines when:

1. **You need cross-browser, cross-device coverage at scale.** Ultrafast Grid is unmatched for this.
2. **You want fewer false positives.** The Visual AI is more tolerant of trivial pixel differences.
3. **You have a complex design system.** Layout-level checks catch real bugs.
4. **You want a single visual + a11y story.** Applitools' a11y product integrates with Eyes.

Alternatives like Percy or \`cypress-image-snapshot\` may be a better fit if:

1. **You need pixel-exact comparison.** Some teams prefer it.
2. **Budget is tight.** Applitools is enterprise-priced.
3. **Air-gapped.** Both Applitools and Percy require cloud rendering.

## Installation

\`\`\`bash
npm install --save-dev @applitools/eyes-cypress
\`\`\`

\`npx eyes-setup\` configures the plugin:

\`\`\`bash
npx eyes-setup
\`\`\`

This adds plugin entries to \`cypress.config.ts\` and an import to \`cypress/support/e2e.ts\`.

Set the API key:

\`\`\`bash
export APPLITOOLS_API_KEY=your-api-key
\`\`\`

## Your first visual test

\`\`\`typescript
describe('Home page', () => {
  beforeEach(() => {
    cy.eyesOpen({
      appName: 'My App',
      testName: 'Home page visual test',
    });
  });

  it('matches the visual baseline', () => {
    cy.visit('/');
    cy.eyesCheckWindow({ tag: 'Home', fully: true });
  });

  afterEach(() => {
    cy.eyesClose();
  });
});
\`\`\`

\`cy.eyesOpen\` starts an Applitools session, \`cy.eyesCheckWindow\` captures the page and compares against the baseline, \`cy.eyesClose\` ends the session.

## Match levels

Applitools offers several match levels, controlling how strict the comparison is.

| Match level | Description | Use case |
|---|---|---|
| \`Strict\` | Visual AI tolerant; default | General regression |
| \`Layout\` | Compare layout only, ignore content | Dynamic content pages |
| \`Content\` | Compare content only, ignore layout | Stable layouts |
| \`Exact\` | Pixel-exact | Critical exact-match needs |

\`\`\`typescript
cy.eyesCheckWindow({
  tag: 'Home',
  matchLevel: 'Layout',
});
\`\`\`

## Region-based checking

For pages with stable headers and dynamic content, scope the check.

\`\`\`typescript
cy.eyesCheckWindow({
  tag: 'Cart',
  target: 'region',
  selector: { type: 'css', selector: '[data-testid=cart-items]' },
});
\`\`\`

Or ignore specific regions:

\`\`\`typescript
cy.eyesCheckWindow({
  tag: 'Home',
  ignore: [
    { selector: '.timestamp' },
    { selector: '.live-counter' },
  ],
});
\`\`\`

## Floating regions

Floating regions allow elements to move slightly without failing the test.

\`\`\`typescript
cy.eyesCheckWindow({
  tag: 'Home',
  floating: [{
    selector: '.tooltip',
    maxUpOffset: 10,
    maxDownOffset: 10,
    maxLeftOffset: 10,
    maxRightOffset: 10,
  }],
});
\`\`\`

## Strict regions (within a Layout match)

If your global match level is \`Layout\` but a specific region needs strict matching:

\`\`\`typescript
cy.eyesCheckWindow({
  tag: 'Home',
  matchLevel: 'Layout',
  strict: [{ selector: '.logo' }],
});
\`\`\`

## Ultrafast Grid

The Ultrafast Grid is Applitools' killer feature: a single DOM snapshot, rendered across many browsers and viewports in parallel in the cloud.

\`\`\`typescript
cy.eyesOpen({
  appName: 'My App',
  testName: 'Home page',
  browser: [
    { name: 'chrome', width: 1280, height: 720 },
    { name: 'firefox', width: 1280, height: 720 },
    { name: 'safari', width: 1280, height: 720 },
    { name: 'edge', width: 1280, height: 720 },
    { deviceName: 'iPhone 13', screenOrientation: 'portrait' },
    { deviceName: 'iPad Pro', screenOrientation: 'landscape' },
  ],
});
\`\`\`

Your Cypress run produces one DOM capture; Applitools renders it across all six environments. Compare to running Cypress six times.

## Configuration file

\`applitools.config.js\` at the project root:

\`\`\`javascript
module.exports = {
  appName: 'My App',
  batchName: 'Nightly Build',
  browser: [
    { name: 'chrome', width: 1280, height: 720 },
    { deviceName: 'iPhone 13' },
  ],
  matchLevel: 'Strict',
  concurrency: 5,
};
\`\`\`

These defaults apply unless overridden in \`cy.eyesOpen\`.

## Batches

Group related test runs into a batch.

\`\`\`typescript
cy.eyesOpen({
  appName: 'My App',
  testName: 'Home page',
  batch: { name: \`PR-\${process.env.PR_NUMBER}\`, id: process.env.GITHUB_SHA },
});
\`\`\`

All tests with the same batch ID appear together in the Applitools dashboard.

## Accessibility scanning

Applitools includes accessibility checks via Eyes.

\`\`\`typescript
cy.eyesOpen({
  appName: 'My App',
  testName: 'A11y home',
  accessibilitySettings: { level: 'AA', guidelinesVersion: 'WCAG_2_1' },
});
cy.visit('/');
cy.eyesCheckWindow('Home');
cy.eyesClose();
\`\`\`

The dashboard shows accessibility violations alongside visual diffs.

## CI configuration

\`\`\`yaml
- uses: cypress-io/github-action@v6
  with:
    start: npm run dev
    command: npx cypress run
  env:
    APPLITOOLS_API_KEY: \${{ secrets.APPLITOOLS_API_KEY }}
    APPLITOOLS_BATCH_NAME: \${{ github.head_ref }}
    APPLITOOLS_BATCH_ID: \${{ github.sha }}
\`\`\`

## Best practices

1. **Use Layout level for dynamic content.** Reduces false positives.
2. **Floating regions for tooltips and popovers.** They drift between renders.
3. **Strict for logos and key elements.** Within an otherwise Layout match.
4. **Group with batches.** One batch per PR.
5. **Use the Ultrafast Grid for cross-browser.** Cheaper and faster than per-browser Cypress.
6. **Stabilize dynamic content.** Freeze clocks, stub random.
7. **Name tests descriptively.** "Home - logged out" not "Test 1".
8. **Review the dashboard regularly.** Approved diffs become the new baseline.
9. **Integrate a11y scanning.** Free with Eyes.
10. **Document the visual contract.** Which match level, which regions, which browsers.

## Gotchas

1. **API key is per-account.** Use environment variables in CI.
2. **\`eyesOpen\`/\`eyesClose\` must wrap every test.** Pair correctly.
3. **\`eyesCheckWindow\` with \`fully: true\` is slower.** Use selectively.
4. **Layout level may miss real bugs.** Pair with content level when bugs slip.
5. **Ultrafast Grid does not run JavaScript.** It re-renders from the captured DOM only.
6. **Test names must be unique within an app.** Or Eyes overwrites baselines.
7. **Branches inherit baselines from parent branch.** Manage explicitly for feature branches.
8. **First runs always upload everything.** No "only changed" option.
9. **\`accessibilitySettings\` adds a separate API cost.** Plan ahead.
10. **\`@applitools/eyes-cypress\` requires periodic updates.** New Chrome versions sometimes need updates.

## API quick reference

| Use case | Snippet |
|---|---|
| Open test | \`cy.eyesOpen({ appName, testName })\` |
| Snapshot | \`cy.eyesCheckWindow({ tag: 'X' })\` |
| Close test | \`cy.eyesClose()\` |
| Region only | \`{ target: 'region', selector }\` |
| Ignore region | \`{ ignore: [{ selector }] }\` |
| Floating | \`{ floating: [{ selector, maxUpOffset, ... }] }\` |
| Layout level | \`{ matchLevel: 'Layout' }\` |
| Cross-browser | \`{ browser: [{ name, width, height }, ...] }\` |
| A11y | \`{ accessibilitySettings: { level: 'AA' } }\` |

## Conclusion and next steps

Applitools brings Visual AI and Ultrafast Grid cross-browser rendering to Cypress. The benefits are fewer false positives, broader browser coverage at low cost, and accessibility scanning bundled in. The trade-off is enterprise pricing.

Start with one visual test and a few important browsers. Layer in match levels, region scoping, and the Ultrafast Grid as you scale. Pair with functional Cypress tests for full coverage.

Next read: explore the [QA Skills directory](/skills) for visual testing skills, and the [blog index](/blog) for Percy, Chromatic, and accessibility guides.
`,
};
