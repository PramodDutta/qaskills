import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 510,
  slug: 'playwright-transparent-screenshot-backgrounds',
  campaignCluster: 'browser-e2e',
  title: 'Playwright Transparent Screenshot Backgrounds',
  description:
    'playwright transparent screenshot backgrounds: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'playwright transparent screenshot backgrounds',
  intent: 'how-to',
  coreQuestion:
    'How do QA teams verify omitBackground behavior across PNG and JPEG output with deterministic browser automation and useful failure evidence?',
  intentBoundary:
    'Owns omitBackground behavior across PNG and JPEG output. It excludes full-page and element screenshot basics.',
  secondaryKeywords: [
    'playwright transparent screenshot backgrounds example',
    'debug playwright transparent screenshot backgrounds',
    'Playwright omitBackground option',
    'Playwright alpha channel',
    'image format constraint browser test',
    'playwright transparent screenshot backgrounds CI checks',
  ],
  repoEvidence: [
    'seed-skills/playwright-e2e/SKILL.md',
    'packages/web/src/app/blog/posts/playwright-network-interception-mocking-guide.ts',
    'packages/web/e2e/post-flow.e2e.ts',
    'docs/seo/article-factory-250-2026-07-25/inventory.json',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/e2e-testing',
    '/blog/playwright-e2e-complete-guide',
    '/blog/playwright-testing-best-practices-2026',
    '/blog/cypress-tutorial-beginners-2026',
    '/blog/selenium-tutorial-complete-beginners-2026',
  ],
  relatedSlugs: [
    'playwright-e2e-complete-guide',
    'playwright-testing-best-practices-2026',
    'cypress-tutorial-beginners-2026',
    'selenium-tutorial-complete-beginners-2026',
  ],
  sources: [
    'https://playwright.dev/docs/screenshots',
    'https://playwright.dev/docs/api/class-page#page-screenshot',
    'https://playwright.dev/docs/test-snapshots',
  ],
  codeExamples: [
    {
      title: 'Build the playwright transparent screenshot backgrounds baseline',
      language: 'text',
      path: 'seed-skills/playwright-e2e/SKILL.md',
      snippet:
        'tests/\n  e2e/\n    auth/\n      login.spec.ts\n      signup.spec.ts\n    dashboard/\n      dashboard.spec.ts\n    checkout/\n      cart.spec.ts\n      payment.spec.ts\n  fixtures/\n    auth.fixture.ts\n    db.fixture.ts\n  pages/\n    login.page.ts\n    dashboard.page.ts\n    base.page.ts\n  utils/',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/playwright-network-interception-mocking-guide.ts',
      snippet:
        "This guide covers every interception technique you will use in 2026 with Playwright 1.55+: mocking REST and GraphQL, modifying live responses, aborting analytics and images, recording and replaying HAR archives, and the pitfalls that trip up teams new to routing. Every example is runnable TypeScript. If you are building a full suite, pair this with the [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide) and the [API testing complete guide](/blog/api-testing-complete-guide) for backend-level coverage. The [playwright-e2e skill](/skills/playwright-e2e) bundles these patterns for AI coding agents.\n\n## How request interception works\n\nWhen you register a route, Playwright installs a handler in the browser's network stack. Every matching request is paused before it reaches the server, and your handler decides its fate. A request stays paused until you resolve it with exactly one terminal action. If you forget to call \\`fulfill\\`, \\`continue\\`, or \\`abort\\`, the request hangs forever and your test times out.\n\n\\`\\`\\`typescript\nimport { test, expect } from '@playwright/test';\n\ntest('intercepts a request', async ({ page }) => {\n  await page.route('**/api/user', async (route) => {\n    // You must resolve the route with exactly one terminal call.\n    await route.fulfill({\n      status: 200,\n      contentType: 'application/json',\n      body: JSON.stringify({ id: 1, name: 'Ada Lovelace' }),\n    });\n  });",
    },
  ],
});
