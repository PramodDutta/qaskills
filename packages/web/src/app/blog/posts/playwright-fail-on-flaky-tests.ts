import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 502,
  slug: 'playwright-fail-on-flaky-tests',
  campaignCluster: 'browser-e2e',
  title: 'Playwright Fail On Flaky Tests',
  description:
    'playwright fail on flaky tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'playwright fail on flaky tests',
  intent: 'how-to',
  coreQuestion:
    'How do you make Playwright fail a run when a retried test eventually passes but is still classified as flaky?',
  intentBoundary:
    'Owns the failOnFlakyTests release policy, while existing retry guides explain retry mechanics.',
  secondaryKeywords: [
    'playwright failonflakytests',
    'fail ci on flaky test',
    'playwright passed after retry',
    'flaky test release gate',
    'playwright retry classification',
    'report flaky tests ci',
  ],
  repoEvidence: [
    'packages/web/playwright.config.ts',
    'packages/web/src/app/blog/posts/pillar-playwright-core-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/playwright-retries-flaky-test-handling-guide',
    '/blog/playwright-test-config-options-complete-reference',
    '/blog/flaky-test-quarantine-test-impact-analysis-guide-2026',
    '/blog/playwright-e2e-complete-guide',
  ],
  relatedSlugs: [
    'playwright-retries-flaky-test-handling-guide',
    'playwright-test-config-options-complete-reference',
    'flaky-test-quarantine-test-impact-analysis-guide-2026',
    'playwright-e2e-complete-guide',
  ],
  sources: [
    'https://playwright.dev/docs/api/class-testconfig#test-config-fail-on-flaky-tests',
    'https://playwright.dev/docs/test-retries',
    'https://playwright.dev/docs/test-reporters',
  ],
  codeExamples: [
    {
      title: 'Build the playwright fail on flaky tests baseline',
      language: 'typescript',
      path: 'packages/web/playwright.config.ts',
      snippet:
        "import { defineConfig, devices } from '@playwright/test';\n\nexport default defineConfig({\n  testDir: './e2e',\n  testMatch: /.*\\.e2e\\.ts/,\n  fullyParallel: true,\n  forbidOnly: !!process.env.CI,\n  retries: process.env.CI ? 2 : 0,\n  workers: process.env.CI ? 1 : undefined,\n  reporter: process.env.CI ? 'dot' : 'list',\n  use: {\n    baseURL: 'http://127.0.0.1:3100',\n    trace: 'retain-on-failure',\n  },\n  webServer: {\n    command: 'corepack pnpm start:test',\n    url: 'http://127.0.0.1:3100',\n    reuseExistingServer: false,",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/pillar-playwright-core-2026.ts',
      snippet:
        "'Playwright end-to-end test architecture connecting browser contexts, semantic locators, API setup, traces, and parallel CI shards',\n    primaryKeyword: 'playwright testing guide',\n    keywords: [\n      'playwright testing guide',\n      'playwright e2e testing',\n      'playwright tutorial 2026',\n      'playwright test automation',\n      'playwright best practices',\n      'playwright fixtures',\n      'playwright browser context',\n      'playwright ci',\n      'playwright 1.61',\n      'reliable e2e automation',\n    ],\n    contentKind: 'pillar',\n    relatedSlugs: [\n      'playwright-1-61-webauthn-passkeys-guide-2026',\n      'playwright-1-61-web-storage-api-guide-2026',",
    },
  ],
});
