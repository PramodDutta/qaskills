import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 514,
  slug: 'playwright-webserver-graceful-shutdown',
  campaignCluster: 'browser-e2e',
  title: 'Playwright Webserver Graceful Shutdown',
  description:
    'playwright webserver graceful shutdown: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'playwright webserver graceful shutdown',
  intent: 'how-to',
  coreQuestion:
    'How do you configure a Playwright webServer graceful shutdown signal and timeout so local processes do not survive the test run?',
  intentBoundary:
    'No existing page owns webServer process signals, shutdown deadlines, and orphan verification.',
  secondaryKeywords: [
    'playwright webserver gracefulshutdown',
    'stop test server after playwright',
    'playwright sigterm timeout',
    'e2e server process cleanup',
    'orphan next server tests',
    'webserver shutdown configuration',
  ],
  repoEvidence: ['packages/web/playwright.config.ts', 'packages/web/package.json'],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/playwright-test-config-options-complete-reference',
    '/blog/playwright-ci-github-actions-complete-guide-2026',
    '/blog/cleanup-orphaned-test-data-after-ci-failure',
    '/blog/playwright-e2e-complete-guide',
  ],
  relatedSlugs: [
    'playwright-test-config-options-complete-reference',
    'playwright-ci-github-actions-complete-guide-2026',
    'cleanup-orphaned-test-data-after-ci-failure',
    'playwright-e2e-complete-guide',
  ],
  sources: [
    'https://playwright.dev/docs/test-webserver',
    'https://playwright.dev/docs/api/class-testconfig#test-config-web-server',
    'https://playwright.dev/docs/ci',
  ],
  codeExamples: [
    {
      title: 'Build the playwright webserver graceful shutdown baseline',
      language: 'typescript',
      path: 'packages/web/playwright.config.ts',
      snippet:
        "import { defineConfig, devices } from '@playwright/test';\n\nexport default defineConfig({\n  testDir: './e2e',\n  testMatch: /.*\\.e2e\\.ts/,\n  fullyParallel: true,\n  forbidOnly: !!process.env.CI,\n  retries: process.env.CI ? 2 : 0,\n  workers: process.env.CI ? 1 : undefined,\n  reporter: process.env.CI ? 'dot' : 'list',\n  use: {\n    baseURL: 'http://127.0.0.1:3100',\n    trace: 'retain-on-failure',\n  },\n  webServer: {\n    command: 'corepack pnpm start:test',\n    url: 'http://127.0.0.1:3100',\n    reuseExistingServer: false,",
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
