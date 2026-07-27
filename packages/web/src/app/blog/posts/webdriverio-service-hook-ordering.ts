import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 556,
  slug: 'webdriverio-service-hook-ordering',
  campaignCluster: 'browser-e2e',
  title: 'Webdriverio Service Hook Ordering',
  description:
    'webdriverio service hook ordering: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'webdriverio service hook ordering',
  intent: 'how-to',
  coreQuestion:
    'How do QA teams verify launcher, worker, and framework service hook order with deterministic browser automation and useful failure evidence?',
  intentBoundary:
    'Owns launcher, worker, and framework service hook order. It excludes test beforeEach and afterEach hooks.',
  secondaryKeywords: [
    'webdriverio service hook ordering example',
    'debug webdriverio service hook ordering',
    'WebdriverIO service hooks',
    'WebdriverIO launcher process',
    'worker process browser test',
    'webdriverio service hook ordering CI checks',
  ],
  repoEvidence: [
    'seed-skills/webdriverio-e2e/SKILL.md',
    'packages/web/src/app/blog/posts/webdriverio-testing-complete-guide.ts',
    'packages/web/src/app/blog/posts/webdriverio-parallel-cross-browser-grid-guide.ts',
    'docs/seo/article-factory-250-2026-07-25/inventory.json',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/e2e-testing',
    '/blog/webdriverio-testing-complete-guide',
    '/blog/webdriverio-parallel-cross-browser-grid-guide',
    '/blog/playwright-e2e-complete-guide',
    '/blog/cypress-tutorial-beginners-2026',
  ],
  relatedSlugs: [
    'webdriverio-testing-complete-guide',
    'webdriverio-parallel-cross-browser-grid-guide',
    'playwright-e2e-complete-guide',
    'cypress-tutorial-beginners-2026',
  ],
  sources: [
    'https://webdriver.io/docs/customcommands/',
    'https://webdriver.io/docs/customservices/',
    'https://webdriver.io/docs/customreporter/',
  ],
  codeExamples: [
    {
      title: 'Build the webdriverio service hook ordering baseline',
      language: 'bash',
      path: 'seed-skills/webdriverio-e2e/SKILL.md',
      snippet:
        'npm init wdio@latest .   # interactive scaffold\n# or manual:\nnpm install --save-dev @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter tsx',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/webdriverio-testing-complete-guide.ts',
      snippet:
        '- The Page Object pattern in WebDriverIO uses getter-based element selectors for lazy evaluation and composability\n- Mobile testing with Appium integration enables a single framework for web and native app testing\n- Visual regression testing via \\`@wdio/visual-service\\` catches UI drift automatically across browsers\n- WebDriverIO\'s plugin ecosystem supports parallel execution, custom reporters, and CI/CD integrations out of the box\n- AI-powered QA skills from qaskills.sh can generate WebDriverIO tests with proper patterns and best practices\n\n---\n\n## What is WebDriverIO?\n\nWebDriverIO is a progressive automation framework built on top of the WebDriver and Chrome DevTools protocols. Unlike frameworks that only support browser automation, WebDriverIO works across web browsers, mobile devices, and even desktop applications. It provides a concise, expressive API that reduces boilerplate while giving you full control over the automation stack.\n\nThe framework follows the "batteries included" philosophy with its test runner (\\`@wdio/cli\\`), built-in assertion library, and an extensive plugin system for reporters, services, and custom integrations.\n\n---\n\n## Setting Up WebDriverIO',
    },
  ],
});
