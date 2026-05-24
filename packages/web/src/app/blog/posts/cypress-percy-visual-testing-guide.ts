import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress + Percy Visual Testing: Complete Guide 2026',
  description:
    'Complete guide to visual regression testing with Cypress and Percy in 2026. Setup, snapshots, baselines, responsive viewports, ignores, CI, and best practices.',
  date: '2026-05-20',
  category: 'Guide',
  content: `
# Cypress + Percy Visual Testing: Complete Guide 2026

Visual regression testing catches the bugs that functional tests cannot: a margin shifted by 4 pixels, a font swap that breaks line height, a color contrast change that violates the design system, a tooltip that overflows on a specific viewport. Functional tests assert on text and selectors; visual tests assert on pixels. Together they form a complete safety net.

Percy by BrowserStack is one of the most popular visual testing platforms in 2026. It takes snapshots from your Cypress runs, compares them against a baseline, and highlights pixel-level differences in a web UI. Engineers review the diffs and either approve them as the new baseline or reject them as bugs.

This guide is the complete 2026 reference for integrating Percy with Cypress. We cover installation, your first snapshot, responsive viewports, baseline management, ignored regions, Percy CSS for stable snapshots, CI configuration, cost-control patterns, and best practices distilled from real visual testing suites.

For broader Cypress references, browse [the blog index](/blog). For visual testing skills, see the [QA Skills directory](/skills).

## When to use Percy

Percy shines when:

1. **You ship a design system.** Visual regressions in shared components affect every consumer.
2. **You care about responsive design.** Multi-viewport diffs are first-class.
3. **You have a marketing site.** Layout breaks are catastrophic.
4. **You work across browsers.** Percy renders in Chrome, Firefox, Safari, and Edge.
5. **You have a design-engineering partnership.** Designers can review Percy builds.

When to choose alternatives:

1. **Tiny projects.** \`cypress-image-snapshot\` is free and self-managed.
2. **Air-gapped environments.** Percy requires sending screenshots to BrowserStack's cloud.
3. **Budget constraints.** Percy is a paid service.

## Installation

\`\`\`bash
npm install --save-dev @percy/cli @percy/cypress
\`\`\`

In \`cypress/support/e2e.ts\`:

\`\`\`typescript
import '@percy/cypress';
\`\`\`

Set the Percy token as an environment variable:

\`\`\`bash
export PERCY_TOKEN=your-project-token
\`\`\`

## Your first snapshot

\`\`\`typescript
describe('Home page', () => {
  it('matches the visual baseline', () => {
    cy.visit('/');
    cy.percySnapshot('Home page');
  });
});
\`\`\`

Run with the Percy CLI wrapping Cypress:

\`\`\`bash
npx percy exec -- cypress run
\`\`\`

Percy uploads the snapshot, compares against the baseline, and produces a build URL you can open in the Percy UI.

## Responsive viewports

\`percySnapshot\` accepts a \`widths\` option. Percy renders the page at each width and produces separate diffs.

\`\`\`typescript
cy.percySnapshot('Home page', { widths: [375, 768, 1280, 1920] });
\`\`\`

Set defaults globally in \`.percy.yml\`:

\`\`\`yaml
version: 2
snapshot:
  widths:
    - 375
    - 768
    - 1280
\`\`\`

## DOM transforms

Percy snapshots the rendered DOM and re-renders in Percy's own browser. This means any dynamic content (timestamps, randomized data, animations) produces visual noise unless you stabilize it.

\`\`\`typescript
beforeEach(() => {
  // Freeze the clock
  cy.clock(new Date('2026-01-01T00:00:00Z'));
  // Stub random functions
  cy.window().then((win) => {
    cy.stub(win.Math, 'random').returns(0.5);
  });
});
\`\`\`

## Hiding dynamic regions

Percy supports CSS to hide or modify regions before snapshotting.

\`\`\`yaml
# .percy.yml
version: 2
snapshot:
  percy-css: |
    .timestamp, .live-counter, [data-percy-ignore] { visibility: hidden !important; }
\`\`\`

In your DOM, mark regions to ignore with \`data-percy-ignore\`:

\`\`\`html
<div data-percy-ignore>{currentTime}</div>
\`\`\`

## Per-snapshot CSS

Pass CSS specific to a single snapshot:

\`\`\`typescript
cy.percySnapshot('Pricing page', {
  percyCSS: '.live-stats { display: none !important; }',
});
\`\`\`

## Baseline management

The first time you run Percy, the snapshots become the baseline. Every subsequent run compares against that baseline. If a diff appears, you choose:

| Action | Effect |
|---|---|
| Approve | New snapshot becomes the baseline |
| Reject | Build fails; you fix the regression |
| Approve to specific branch | Per-branch baseline updates |

For PR-based workflows, Percy automatically uses the base branch as the baseline.

## Ignored regions

For regions you cannot control (third-party widgets, ads), use \`percyCSS\` to blank them out.

\`\`\`yaml
percy-css: |
  iframe[src*="ads."] { visibility: hidden !important; }
  .chatbot-bubble { visibility: hidden !important; }
\`\`\`

## CI configuration (GitHub Actions)

\`\`\`yaml
- uses: cypress-io/github-action@v6
  with:
    start: npm run dev
    command: npx percy exec -- cypress run
  env:
    PERCY_TOKEN: \${{ secrets.PERCY_TOKEN }}
\`\`\`

Percy posts a status check to the PR. The check is green when no diffs are found, yellow when diffs require review, red when builds are rejected.

## Parallelization

Percy supports parallel Cypress runs out of the box. Use the same \`PERCY_PARALLEL_NONCE\` across workers:

\`\`\`yaml
strategy:
  matrix:
    containers: [1, 2, 3, 4]
steps:
  - run: npx percy exec --parallel -- cypress run --record --parallel
    env:
      PERCY_TOKEN: \${{ secrets.PERCY_TOKEN }}
      PERCY_PARALLEL_TOTAL: 4
      PERCY_PARALLEL_NONCE: \${{ github.run_id }}-\${{ github.run_attempt }}
\`\`\`

After all workers finish, run \`npx percy finalize --all\` to mark the build complete.

## Cost control

Percy charges per snapshot. To control cost:

1. **Run Percy only on PRs.** Skip on every commit.
2. **Use fewer viewport widths.** Each width is a separate snapshot.
3. **Snapshot only critical pages.** Not every page.
4. **Combine viewports per page.** Percy already does this; do not duplicate.
5. **Use \`only-changed\`.** Percy can skip snapshots when nothing in the page changed.

\`\`\`bash
npx percy exec -- cypress run  # 100 snapshots
npx percy exec --only-changed -- cypress run  # ~20 snapshots
\`\`\`

## Component testing

Percy works with Cypress Component Tests too. Mount the component and snapshot.

\`\`\`typescript
it('matches the visual baseline', () => {
  cy.mount(<Button>Click me</Button>);
  cy.percySnapshot('Button - default');
  cy.get('button').trigger('mouseover');
  cy.percySnapshot('Button - hover');
});
\`\`\`

## Per-state snapshots

For components with state (modals, dropdowns), snapshot each state.

\`\`\`typescript
cy.visit('/');
cy.percySnapshot('Home - default');
cy.contains('Open menu').click();
cy.percySnapshot('Home - menu open');
cy.contains('Settings').click();
cy.percySnapshot('Home - settings panel');
\`\`\`

## Best practices

1. **Stabilize dynamic content.** Freeze clocks, stub random.
2. **Snapshot named states.** "Default", "Hover", "Open" — not generic labels.
3. **Use stable viewports.** A consistent set across the suite.
4. **Group related snapshots.** Same prefix per feature.
5. **Run on every PR.** Catch regressions before merge.
6. **Approve baselines as a team.** Design + engineering review together.
7. **Avoid snapshotting third-party content.** Hide it with \`percyCSS\`.
8. **Use \`only-changed\` for cost control.** Reduces snapshot count dramatically.
9. **Review the diff carefully.** A 4-pixel shift is sometimes intentional, sometimes a bug.
10. **Document the visual contract.** A README explains which states are tested.

## Gotchas

1. **PERCY_TOKEN is project-specific.** One per project; do not share.
2. **Snapshots render in Percy's browser, not Cypress's.** Behavior may differ.
3. **Animations cause noise.** Disable transitions with CSS.
4. **Font loading races.** Wait for fonts to load before snapshot.
5. **CDN-served assets must be public.** Percy needs to fetch them.
6. **Local development snapshots are cached.** Reset by restarting Percy CLI.
7. **Percy CLI is required.** \`cypress run\` alone does not upload snapshots.
8. **PRs from forks may not get PERCY_TOKEN.** Configure secrets handling carefully.
9. **Snapshot limits apply.** Plan ahead for high-volume projects.
10. **\`only-changed\` requires baseline comparison.** First runs always upload everything.

## API quick reference

| Use case | Snippet |
|---|---|
| Take snapshot | \`cy.percySnapshot('Home')\` |
| Multi-viewport | \`cy.percySnapshot('Home', { widths: [375, 1280] })\` |
| Per-snapshot CSS | \`cy.percySnapshot('Home', { percyCSS: '...' })\` |
| Min-height | \`cy.percySnapshot('Home', { minHeight: 1024 })\` |
| Scope | \`cy.percySnapshot('Modal', { scope: '[role=dialog]' })\` |
| Run with Percy | \`npx percy exec -- cypress run\` |
| Parallel | \`PERCY_PARALLEL_TOTAL=N PERCY_PARALLEL_NONCE=xxx npx percy exec --parallel\` |

## Conclusion and next steps

Percy turns visual regression from a manual chore into an automated safety net. Combined with Cypress's reliable browser automation, it catches the bugs functional tests miss. The cost is real (per-snapshot pricing and rendering overhead) but the value is concrete for design-system and marketing-site teams.

Start with three snapshots: home page, a product page, and the checkout flow. Wire into CI on PRs only. Stabilize dynamic content. Review baselines as a design + engineering team. Scale from there.

Next read: explore the [QA Skills directory](/skills) for visual testing skills, and the [blog index](/blog) for Applitools, Chromatic, and component testing guides.
`,
};
