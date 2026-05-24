import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress + axe Accessibility Testing: Complete Guide 2026',
  description:
    'Complete guide to automated accessibility testing in Cypress with cypress-axe in 2026. WCAG rules, configuration, false positives, reporters, and CI patterns.',
  date: '2026-05-20',
  category: 'Guide',
  content: `
# Cypress + axe Accessibility Testing: Complete Guide 2026

Accessibility is no longer optional. The European Accessibility Act (EAA) came into force in 2025; the ADA's enforcement of WCAG 2.1 AA on private sector websites in the U.S. continues to broaden through litigation; and customer expectations have shifted such that an inaccessible product is increasingly a competitive liability. Automated accessibility testing catches roughly 30 to 40% of WCAG violations; the rest require manual review. The 30 to 40% is still worth automating because it catches the lowest-hanging fruit and prevents regression.

\`cypress-axe\` is the de-facto integration of axe-core (Deque's accessibility testing engine) with Cypress. It runs the same accessibility rules used by the axe browser extensions, AccessibilityInsights, and most automated a11y tools, but inside your Cypress runs. This guide is the complete 2026 reference for using \`cypress-axe\` in real Cypress suites.

For broader Cypress references, browse [the blog index](/blog). For accessibility skills, see the [QA Skills directory](/skills).

## Installation

\`\`\`bash
npm install --save-dev cypress-axe axe-core
\`\`\`

In \`cypress/support/e2e.ts\` (or \`commands.ts\`):

\`\`\`typescript
import 'cypress-axe';
\`\`\`

\`cypress-axe\` extends \`cy.*\` with two commands: \`cy.injectAxe()\` and \`cy.checkA11y()\`.

## Your first accessibility test

\`\`\`typescript
describe('Home page accessibility', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  it('has no accessibility violations', () => {
    cy.checkA11y();
  });
});
\`\`\`

\`cy.injectAxe()\` injects the axe-core library into the page. \`cy.checkA11y()\` runs all enabled rules and fails the test if any violations are found.

## Scoping the check

\`cy.checkA11y(context)\` accepts a context to limit the scan.

\`\`\`typescript
cy.checkA11y('#main-content');                // CSS selector
cy.checkA11y({ include: ['.product-card'] }); // multiple includes
cy.checkA11y({ exclude: ['#ads'] });          // exclude regions
\`\`\`

For modals or single components, scope to the visible region.

## Configuring rules

The second argument is an options object passed through to axe-core.

\`\`\`typescript
cy.checkA11y(null, {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  },
});
\`\`\`

| Tag | Coverage |
|---|---|
| \`wcag2a\` | WCAG 2.0 Level A |
| \`wcag2aa\` | WCAG 2.0 Level AA |
| \`wcag2aaa\` | WCAG 2.0 Level AAA |
| \`wcag21a\` | WCAG 2.1 Level A |
| \`wcag21aa\` | WCAG 2.1 Level AA |
| \`wcag22aa\` | WCAG 2.2 Level AA |
| \`best-practice\` | Non-WCAG best practices |
| \`experimental\` | Rules in development |

WCAG 2.1 AA is the typical target. Some teams add \`best-practice\` for stricter checks.

## Disabling individual rules

\`\`\`typescript
cy.checkA11y(null, {
  rules: {
    'color-contrast': { enabled: false },
    'image-alt': { enabled: true },
  },
});
\`\`\`

Disable rules you cannot fix immediately, but track them as tech debt.

## Custom violation handler

By default, \`checkA11y\` fails on any violation. For more nuanced behavior, provide a custom violation handler.

\`\`\`typescript
cy.checkA11y(null, null, (violations) => {
  violations.forEach((v) => {
    cy.task('log', \`\${v.id}: \${v.help} (\${v.nodes.length} nodes)\`);
  });
});
\`\`\`

This logs violations without failing the test. Useful for incremental adoption: get a baseline, then ratchet the threshold over time.

## Pretty-print violations

A widely-used pattern is to print violations in a readable table.

\`\`\`typescript
const printViolations = (violations) => {
  cy.task('table', violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.length,
  })));
};

cy.checkA11y(null, null, printViolations);
\`\`\`

In \`cypress.config.ts\`:

\`\`\`typescript
setupNodeEvents(on) {
  on('task', {
    table(message) {
      console.table(message);
      return null;
    },
    log(message) {
      console.log(message);
      return null;
    },
  });
}
\`\`\`

## Multi-page sweep

For a comprehensive accessibility report, run \`checkA11y\` on every important page.

\`\`\`typescript
const pages = ['/', '/about', '/products', '/contact'];

pages.forEach((page) => {
  it(\`is accessible: \${page}\`, () => {
    cy.visit(page);
    cy.injectAxe();
    cy.checkA11y();
  });
});
\`\`\`

## Per-component accessibility

For component testing, run \`checkA11y\` after mount.

\`\`\`typescript
it('is accessible', () => {
  cy.mount(<Button>Click me</Button>);
  cy.injectAxe();
  cy.checkA11y();
});
\`\`\`

This is especially valuable for design system components, where accessibility regressions affect every consumer.

## Dynamic content

\`checkA11y\` only sees what is currently in the DOM. For dynamic content, check after the relevant interaction.

\`\`\`typescript
it('modal is accessible', () => {
  cy.visit('/');
  cy.injectAxe();
  cy.contains('Open modal').click();
  cy.get('[role=dialog]').should('be.visible');
  cy.checkA11y('[role=dialog]');
});
\`\`\`

## False positives

axe-core is conservative but not perfect. Some patterns produce false positives:

1. **Decorative SVG without role.** Add \`role="presentation"\` or \`aria-hidden="true"\`.
2. **Color contrast on hover-only states.** axe checks the static state; if your hover state is the only problem, document and disable selectively.
3. **Off-screen elements.** Some carousels have off-screen slides; either hide them with \`aria-hidden\` or scope the check.
4. **Third-party iframes.** Out of your control; exclude with the \`exclude\` option.

When you find a false positive, suppress it precisely rather than disabling the rule globally.

## CI reporting

For CI, generate a JSON report and upload it as an artifact.

\`\`\`typescript
afterEach(() => {
  cy.task('logA11yResults', /* current results */);
});
\`\`\`

Or use a plugin like \`cypress-axe-reporter\` to produce HTML reports.

## Threshold management

A common pattern is to set a violation budget and fail only when exceeded.

\`\`\`typescript
let violationCount = 0;
cy.checkA11y(null, null, (violations) => {
  violationCount += violations.length;
});
cy.then(() => {
  expect(violationCount).to.be.lte(5);
});
\`\`\`

This is useful for legacy apps with many violations: prevent regression while you fix incrementally.

## Custom rules

axe-core lets you define custom checks. \`cypress-axe\` exposes \`configureAxe\` for runtime configuration.

\`\`\`typescript
import { configureAxe } from 'cypress-axe';

beforeEach(() => {
  cy.visit('/');
  cy.injectAxe();
  configureAxe({
    rules: [
      { id: 'color-contrast', enabled: true },
      { id: 'region', enabled: false },
    ],
  });
});
\`\`\`

## Best practices

1. **Run on every PR.** Catch regressions immediately.
2. **Target WCAG 2.1 AA.** It is the de-facto standard.
3. **Cover every important page.** Home, product, account, checkout.
4. **Test in light and dark modes.** Color contrast can differ.
5. **Test responsive viewports.** Mobile and desktop have different a11y profiles.
6. **Distinguish severity.** \`critical\`, \`serious\`, \`moderate\`, \`minor\`.
7. **Track over time.** A baseline + downward trend matters more than zero.
8. **Manual review supplements.** Automated catches 30 to 40%.
9. **Pair with screen reader testing.** NVDA and VoiceOver have nuances axe cannot detect.
10. **Document suppressions.** Each disabled rule has a written justification.

## Gotchas

1. **\`injectAxe\` must be called after every \`visit\`.** Otherwise the library is not in the page.
2. **\`checkA11y\` only sees the current DOM.** Re-check after interactions.
3. **iframes are scanned separately.** \`checkA11y\` does not recurse into them.
4. **\`shadow DOM\` requires axe-core 4.x+.** Verify version.
5. **Performance can be slow on large pages.** Scope when possible.
6. **\`runOnly\` is required for WCAG-only scans.** Otherwise non-WCAG best-practice rules also run.
7. **Color contrast checks assume rendered styles.** Use realistic colors.
8. **Hidden elements are skipped.** Make focus-only elements visible during the test.
9. **Custom violation handler must call \`done\`.** Or use Promises consistently.
10. **\`cypress-axe\` is community-maintained.** Pin the version.

## API quick reference

| Use case | Snippet |
|---|---|
| Inject axe | \`cy.injectAxe()\` |
| Check page | \`cy.checkA11y()\` |
| Check region | \`cy.checkA11y('#main')\` |
| WCAG 2.1 AA | \`cy.checkA11y(null, { runOnly: { type: 'tag', values: ['wcag21aa'] } })\` |
| Disable rule | \`cy.checkA11y(null, { rules: { 'color-contrast': { enabled: false } } })\` |
| Log only | \`cy.checkA11y(null, null, logViolations)\` |
| Configure | \`configureAxe({...})\` |

## Conclusion and next steps

Automated accessibility testing with \`cypress-axe\` catches 30 to 40% of WCAG violations and prevents regression on the rest of your work. It pays for itself within a sprint and integrates cleanly into existing Cypress suites.

Start with one page and the default rule set. Adopt WCAG 2.1 AA as the target. Fix the high-severity violations first. Set a threshold-based budget for legacy code. Pair with manual review and screen-reader testing for full coverage.

Next read: explore the [QA Skills directory](/skills) for accessibility and Cypress skills, and the [blog index](/blog) for component testing and CI guides.
`,
};
