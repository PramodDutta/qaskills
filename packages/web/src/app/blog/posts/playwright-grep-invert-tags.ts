import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 515,
  slug: 'playwright-grep-invert-tags',
  campaignCluster: 'browser-e2e',
  title: 'Playwright Grep Invert Tags',
  description:
    'playwright grep invert tags: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'playwright grep invert tags',
  intent: 'how-to',
  coreQuestion:
    'How do you exclude tagged Playwright tests with grepInvert or the CLI -G flag while preserving an auditable selection rule?',
  intentBoundary: 'Owns inverted test selection and exclusion proof, not annotations generally.',
  secondaryKeywords: [
    'playwright grepinvert config',
    'playwright minus g flag',
    'exclude tagged playwright tests',
    'skip slow tests by tag',
    'playwright regex tag selection',
    'ci test exclusion audit',
  ],
  repoEvidence: [
    'packages/web/src/app/blog/posts/pillar-playwright-core-2026.ts',
    'packages/web/package.json',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/playwright-test-config-options-complete-reference',
    '/blog/playwright-test-step-annotations-guide',
    '/blog/playwright-ci-github-actions-complete-guide-2026',
    '/blog/playwright-e2e-complete-guide',
  ],
  relatedSlugs: [
    'playwright-test-config-options-complete-reference',
    'playwright-test-step-annotations-guide',
    'playwright-ci-github-actions-complete-guide-2026',
    'playwright-e2e-complete-guide',
  ],
  sources: [
    'https://playwright.dev/docs/test-cli',
    'https://playwright.dev/docs/test-annotations',
    'https://playwright.dev/docs/api/class-testconfig#test-config-grep-invert',
  ],
  codeExamples: [
    {
      title: 'Build the playwright grep invert tags baseline',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/pillar-playwright-core-2026.ts',
      snippet:
        "export const playwrightCorePillar2026: SeoClusterArticle = {\n  slug: 'playwright-e2e-complete-guide',\n  clusterId: 'playwright-core',\n  post: {\n    title: 'Playwright Testing Complete Guide for Reliable E2E Automation in 2026',\n    description:\n      'Build reliable Playwright E2E automation with current setup, locators, fixtures, isolation, auth, API testing, mocking, debugging, CI, and Playwright 1.61 guidance.',\n    date: '2026-02-13',\n    updated: '2026-07-14',\n    category: 'Guide',\n    image: '/blog/pillars/playwright-core.png',\n    imageAlt:\n      'Playwright end-to-end test architecture connecting browser contexts, semantic locators, API setup, traces, and parallel CI shards',\n    primaryKeyword: 'playwright testing guide',\n    keywords: [\n      'playwright testing guide',\n      'playwright e2e testing',\n      'playwright tutorial 2026',",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'json',
      path: 'packages/web/package.json',
      snippet:
        '"finalize:article-factory-1000": "node --import tsx seo-tools/finalize-article-factory-1000.mts",\n    "audit:article-factory-1000": "ARTICLE_FACTORY_INVENTORY=../../docs/seo/article-factory-250-2026-07-25/inventory-baseline.json ARTICLE_FACTORY_SELECTED=../../docs/seo/article-factory-1000-2026-07-26/selected-campaign.json ARTICLE_FACTORY_DATES=2026-07-25,2026-07-26 ARTICLE_FACTORY_SCORECARDS=../../docs/seo/article-factory-1000-2026-07-26/scorecards.json ARTICLE_FACTORY_QUIET=1 node --import tsx seo-tools/audit-article-batch.mts src/app/blog/posts/_article-factory-1000-2026-07-26.ts 1000",\n    "report:article-factory-1000": "node --import tsx seo-tools/report-article-factory-1000.mts",\n    "start:test": "QASKILLS_DISABLE_AUTH=1 next start --hostname 127.0.0.1 --port 3100",\n    "test:e2e": "node $(node -p \\"require.resolve(\'@playwright/test/cli\')\\") test",\n    "test:post-flow": "corepack pnpm audit:article-factory-1000 && QASKILLS_DISABLE_AUTH=1 corepack pnpm --workspace-root build && corepack pnpm test:unit && corepack pnpm test:e2e",\n    "db:push": "drizzle-kit push",\n    "db:migrate": "drizzle-kit migrate",\n    "db:seed": "tsx src/db/seed.ts",\n    "db:seed:playwright-cli": "tsx src/db/seed-playwright-cli.ts",\n    "db:studio": "drizzle-kit studio"\n  },\n  "dependencies": {\n    "@clerk/nextjs": "^6.9.0",\n    "@neondatabase/serverless": "^0.10.0",\n    "@qaskills/shared": "workspace:*",\n    "@radix-ui/react-accordion": "^1.2.0",\n    "@radix-ui/react-avatar": "^1.1.0",',
    },
  ],
});
