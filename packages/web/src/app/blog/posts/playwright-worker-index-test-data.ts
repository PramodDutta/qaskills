import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 508,
  slug: 'playwright-worker-index-test-data',
  campaignCluster: 'browser-e2e',
  title: 'Playwright Worker Index Test Data',
  description:
    'playwright worker index test data: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'playwright worker index test data',
  intent: 'how-to',
  coreQuestion:
    'How do you use workerIndex and parallelIndex to allocate collision-free Playwright accounts, databases, and artifact paths?',
  intentBoundary:
    'Owns index semantics across accounts, databases, and paths, while the existing database fixture article owns one implementation.',
  secondaryKeywords: [
    'playwright workerindex fixture',
    'playwright parallelindex difference',
    'unique test data per worker',
    'parallel browser account allocation',
    'worker safe artifact path',
    'playwright database per worker',
  ],
  repoEvidence: [
    'seed-skills/playwright-advance-e2e/SKILL.md',
    'seed-skills/test-data-factory/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/playwright-worker-scoped-fixture-database-per-worker',
    '/blog/playwright-parallel-sharding-execution-guide',
    '/blog/playwright-test-data-management-guide-2026',
    '/blog/playwright-e2e-complete-guide',
  ],
  relatedSlugs: [
    'playwright-worker-scoped-fixture-database-per-worker',
    'playwright-parallel-sharding-execution-guide',
    'playwright-test-data-management-guide-2026',
    'playwright-e2e-complete-guide',
  ],
  sources: [
    'https://playwright.dev/docs/test-parallel',
    'https://playwright.dev/docs/api/class-workerinfo',
    'https://playwright.dev/docs/test-fixtures',
  ],
  codeExamples: [
    {
      title: 'Build the playwright worker index test data baseline',
      language: 'text',
      path: 'seed-skills/playwright-advance-e2e/SKILL.md',
      snippet: 'Test Specs -> Fixtures -> Modules -> Pages -> Browser -> Reports',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/test-data-factory/SKILL.md',
      snippet:
        'user.builder.ts\n    order.builder.ts\n    query.builder.ts\n  seeders/\n    database-seeder.ts\n    api-seeder.ts\n    test-environment.ts\n  traits/\n    user-traits.ts\n    order-traits.ts\n  fixtures/\n    static/\n      countries.json\n      currencies.json\n    snapshots/\n      seed-data.sql\n  helpers/\n    cleanup.ts',
    },
  ],
});
