import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 620,
  slug: 'selenium-bidi-redirect-count-testing',
  campaignCluster: 'browser-e2e',
  title: 'Selenium Bidi Redirect Count Testing',
  description:
    'selenium BiDi redirect count testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'selenium BiDi redirect count testing',
  intent: 'how-to',
  coreQuestion:
    'How do QA teams verify redirectCount and navigation identity across beforeRequestSent events with deterministic browser automation and useful failure evidence?',
  intentBoundary:
    'Owns redirectCount and navigation identity across beforeRequestSent events. It excludes generic BiDi event ordering.',
  secondaryKeywords: [
    'selenium BiDi redirect count testing example',
    'debug selenium BiDi redirect count testing',
    'Selenium BiDi redirect count',
    'Selenium BiDi beforeRequestSent',
    'navigation id browser test',
    'selenium BiDi redirect count testing CI checks',
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
    'https://www.selenium.dev/documentation/webdriver/bidi/network/',
    'https://www.selenium.dev/documentation/webdriver/bidi/',
    'https://w3c.github.io/webdriver-bidi/',
  ],
  codeExamples: [
    {
      title: 'Build the selenium BiDi redirect count testing baseline',
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
