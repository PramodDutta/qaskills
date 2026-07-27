import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 507,
  slug: 'playwright-snapshot-path-template',
  campaignCluster: 'browser-e2e',
  title: 'Playwright Snapshot Path Template',
  description:
    'playwright snapshot path template: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'playwright snapshot path template',
  intent: 'how-to',
  coreQuestion:
    'How do you configure Playwright snapshotPathTemplate so baselines remain unique across projects, browsers, and operating systems?',
  intentBoundary:
    'Owns baseline path templating and collision prevention, not screenshot assertions or baseline approval.',
  secondaryKeywords: [
    'playwright snapshotpathtemplate',
    'visual baseline path playwright',
    'snapshot project name token',
    'cross platform screenshot baselines',
    'playwright snapshot suffix',
    'avoid snapshot filename collision',
  ],
  repoEvidence: [
    'seed-skills/playwright-visual-testing/SKILL.md',
    'seed-skills/screenshot-baseline-generator/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/playwright-visual-comparison-snapshots-guide',
    '/blog/playwright-visual-regression-testing-guide',
    '/blog/visual-baseline-governance-guide-2026',
    '/blog/playwright-e2e-complete-guide',
  ],
  relatedSlugs: [
    'playwright-visual-comparison-snapshots-guide',
    'playwright-visual-regression-testing-guide',
    'visual-baseline-governance-guide-2026',
    'playwright-e2e-complete-guide',
  ],
  sources: [
    'https://playwright.dev/docs/api/class-testconfig#test-config-snapshot-path-template',
    'https://playwright.dev/docs/test-snapshots',
    'https://playwright.dev/docs/test-configuration',
  ],
  codeExamples: [
    {
      title: 'Build the playwright snapshot path template baseline',
      language: 'typescript',
      path: 'seed-skills/playwright-visual-testing/SKILL.md',
      snippet:
        '// Example playwright pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/screenshot-baseline-generator/SKILL.md',
      snippet:
        'mobile/\n        homepage.png\n        dashboard.png\n    components/\n      baselines/\n        button-primary.png\n        card-product.png\n        navigation-header.png\n        modal-dialog.png\n    helpers/\n      screenshot-capture.ts\n      baseline-manager.ts\n      mask-builder.ts\n      animation-disabler.ts\n      font-loader.ts\n      viewport-manager.ts\n    tests/\n      homepage.visual.test.ts',
    },
  ],
});
