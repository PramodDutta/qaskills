import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 567,
  slug: 'playwright-expect-timeout-configuration',
  campaignCluster: 'browser-e2e',
  title: 'Playwright Expect Timeout Configuration',
  description:
    'playwright expect timeout configuration: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'playwright expect timeout configuration',
  intent: 'how-to',
  coreQuestion:
    'How do you tune Playwright expect timeout independently from action and test timeouts?',
  intentBoundary:
    'Owns assertion timeout layering, not visibility filtering or soft assertion semantics.',
  secondaryKeywords: [
    'playwright expect timeout config',
    'to be visible timeout',
    'assertion versus test timeout',
    'playwright slow assertion',
    'per assertion timeout override',
    'web first assertion deadline',
  ],
  repoEvidence: [
    'packages/web/e2e/post-flow.e2e.ts',
    'seed-skills/playwright-locator-filter/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/playwright-locator-filter-visible-reference',
    '/blog/playwright-soft-assertions-expect-guide',
    '/blog/playwright-test-config-options-complete-reference',
    '/blog/playwright-e2e-complete-guide',
  ],
  relatedSlugs: [
    'playwright-locator-filter-visible-reference',
    'playwright-soft-assertions-expect-guide',
    'playwright-test-config-options-complete-reference',
    'playwright-e2e-complete-guide',
  ],
  sources: [
    'https://playwright.dev/docs/test-timeouts',
    'https://playwright.dev/docs/test-assertions',
    'https://playwright.dev/docs/api/class-testconfig#test-config-expect',
  ],
  codeExamples: [
    {
      title: 'Build the playwright expect timeout configuration baseline',
      language: 'typescript',
      path: 'packages/web/e2e/post-flow.e2e.ts',
      snippet:
        "import { expect, test } from '@playwright/test';\nimport { articleFactoryBatch20260718Posts } from '../src/app/blog/posts/_article-factory-batch-2026-07';\nimport { seoWaveOneArticles2026 } from '../src/app/blog/posts/seo-wave-one-articles-2026';\n\nconst playwrightLongTailPosts = [\n  {\n    slug: 'playwright-locators-best-practices-2026',\n    title: 'Playwright Locators Best Practices in 2026',\n  },\n  {\n    slug: 'playwright-browser-context-guide-2026',\n    title: 'Playwright BrowserContext Guide for Isolated Sessions and Faster Parallel Tests',\n  },\n  {\n    slug: 'playwright-multiple-tabs-popups-tutorial-2026',\n    title: 'Playwright Multiple Tabs and Popups Tutorial for Real Browser Flows',\n  },\n  {",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/playwright-locator-filter/SKILL.md',
      snippet:
        "// hasText accepts a RegExp for partial / case-insensitive matching.\n  const refunded = page.getByRole('row').filter({ hasText: /refunded/i });\n  await expect(refunded).toHaveCount(1);\n});",
    },
  ],
});
