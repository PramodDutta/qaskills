import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 594,
  slug: 'selenium-bidi-unsubscribe-cleanup-testing',
  campaignCluster: 'browser-e2e',
  title: 'Selenium Bidi Unsubscribe Cleanup Testing',
  description:
    'selenium BiDi unsubscribe cleanup testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'selenium BiDi unsubscribe cleanup testing',
  intent: 'troubleshooting',
  coreQuestion:
    'What causes failures in event delivery after unsubscribe and listener teardown, and which browser evidence identifies the real cause?',
  intentBoundary:
    'Owns event delivery after unsubscribe and listener teardown. It excludes connection shutdown or subscription setup.',
  secondaryKeywords: [
    'selenium BiDi unsubscribe cleanup testing example',
    'debug selenium BiDi unsubscribe cleanup testing',
    'Selenium BiDi unsubscribe command',
    'Selenium BiDi listener cleanup',
    'late event browser test',
    'selenium BiDi unsubscribe cleanup testing CI checks',
  ],
  repoEvidence: [
    'seed-skills/selenium-java/SKILL.md',
    'packages/web/src/app/blog/posts/selenium-bidirectional-bidi-protocol-guide.ts',
    'packages/web/src/app/blog/posts/selenium-bidi-event-ordering-tests.ts',
    'docs/seo/article-factory-250-2026-07-25/inventory.json',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/end-to-end-testing-best-practices',
    '/blog/selenium-bidirectional-bidi-protocol-guide',
    '/blog/selenium-webdriver-bidi-2026-official-reference',
    '/blog/playwright-e2e-complete-guide',
  ],
  relatedSlugs: [
    'end-to-end-testing-best-practices',
    'selenium-bidirectional-bidi-protocol-guide',
    'selenium-webdriver-bidi-2026-official-reference',
    'playwright-e2e-complete-guide',
  ],
  sources: [
    'https://www.selenium.dev/documentation/webdriver/bidi/w3c/browsing_context/',
    'https://www.selenium.dev/documentation/webdriver/bidi/',
    'https://w3c.github.io/webdriver-bidi/',
  ],
  codeExamples: [
    {
      title: 'Build the selenium BiDi unsubscribe cleanup testing baseline',
      language: 'text',
      path: 'seed-skills/selenium-java/SKILL.md',
      snippet:
        'src/\n  main/java/com/example/\n    pages/\n      BasePage.java\n      LoginPage.java\n      DashboardPage.java\n    utils/\n      DriverFactory.java\n      ConfigReader.java\n      WaitHelper.java\n    models/\n      User.java\n  test/java/com/example/\n    tests/\n      BaseTest.java\n      LoginTest.java\n      DashboardTest.java\n    dataproviders/',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/selenium-bidirectional-bidi-protocol-guide.ts',
      snippet:
        "## Why BiDi\n\nThree reasons. First, cross-browser. CDP is Chromium-only; BiDi is W3C and works in Firefox and Chrome equally (Safari and Edge are aligning). If your test suite spans browsers, BiDi lets you write one event-handling code path. Second, real-time events. Polling the browser via WebDriver every 100ms wastes resources and misses events between polls. BiDi gives you a push stream. Third, standards alignment. Building on a W3C standard means your test code stays compatible across Selenium major versions.\n\nThe trade-off is maturity. As of 2026 BiDi covers about 70% of CDP's surface area. For the most exotic CDP features (heap profiling, performance traces) you still need CDP. For mainstream needs (network interception, console, basic auth handling) BiDi is sufficient.\n\n| Capability | BiDi | CDP |\n|---|---|---|\n| Cross-browser | Yes (Chrome, Firefox) | Chrome/Edge only |\n| Standard | W3C draft (2026 candidate) | Chrome-specific |\n| Console capture | Yes | Yes |\n| Network interception | Yes | Yes |\n| Auth handling | Yes | Yes |\n| Performance metrics | Limited | Full |\n| Heap profiling | No | Yes |\n| Code maturity | Mid | Mature |",
    },
  ],
});
