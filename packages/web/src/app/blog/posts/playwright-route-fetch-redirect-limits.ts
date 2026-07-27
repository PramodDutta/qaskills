import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 590,
  slug: 'playwright-route-fetch-redirect-limits',
  campaignCluster: 'browser-e2e',
  title: 'Playwright Route Fetch Redirect Limits',
  description:
    'playwright route fetch redirect limits: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'playwright route fetch redirect limits',
  intent: 'troubleshooting',
  coreQuestion:
    'What causes failures in route.fetch redirect caps and terminal responses, and which browser evidence identifies the real cause?',
  intentBoundary:
    'Owns route.fetch redirect caps and terminal responses. It excludes general network interception or page navigation redirects.',
  secondaryKeywords: [
    'playwright route fetch redirect limits example',
    'debug playwright route fetch redirect limits',
    'Playwright maxRedirects option',
    'Playwright redirect chain cap',
    'route fetch response browser test',
    'playwright route fetch redirect limits CI checks',
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
    'https://playwright.dev/docs/network',
    'https://playwright.dev/docs/api/class-route',
    'https://playwright.dev/docs/api/class-request',
  ],
  codeExamples: [
    {
      title: 'Build the playwright route fetch redirect limits baseline',
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
