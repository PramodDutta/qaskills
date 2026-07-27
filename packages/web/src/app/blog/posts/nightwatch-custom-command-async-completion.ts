import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 543,
  slug: 'nightwatch-custom-command-async-completion',
  campaignCluster: 'browser-e2e',
  title: 'Nightwatch Custom Command Async Completion',
  description:
    'nightwatch custom command async completion: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'nightwatch custom command async completion',
  intent: 'troubleshooting',
  coreQuestion:
    'What causes failures in callback, promise, and async custom-command completion contracts, and which browser evidence identifies the real cause?',
  intentBoundary:
    'Owns callback, promise, and async custom-command completion contracts. It excludes writing synchronous custom commands.',
  secondaryKeywords: [
    'nightwatch custom command async completion example',
    'debug nightwatch custom command async completion',
    'Nightwatch custom command promise',
    'Nightwatch callback completion',
    'command queue browser test',
    'nightwatch custom command async completion CI checks',
  ],
  repoEvidence: [
    'seed-skills/nightwatchjs-testing/SKILL.md',
    'packages/web/src/app/blog/posts/nightwatchjs-testing-guide.ts',
    'packages/web/src/app/blog/posts/nightwatch-page-objects-custom-commands-guide.ts',
    'docs/seo/article-factory-250-2026-07-25/inventory.json',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/e2e-testing',
    '/blog/nightwatchjs-testing-guide',
    '/blog/nightwatch-page-objects-custom-commands-guide',
    '/blog/playwright-e2e-complete-guide',
    '/blog/cypress-tutorial-beginners-2026',
  ],
  relatedSlugs: [
    'nightwatchjs-testing-guide',
    'nightwatch-page-objects-custom-commands-guide',
    'playwright-e2e-complete-guide',
    'cypress-tutorial-beginners-2026',
  ],
  sources: [
    'https://nightwatchjs.org/guide/extending-nightwatch/adding-custom-commands.html',
    'https://nightwatchjs.org/guide/concepts/page-object-model.html',
    'https://nightwatchjs.org/guide/configuration/nightwatch-configuration-file.html',
  ],
  codeExamples: [
    {
      title: 'Build the nightwatch custom command async completion baseline',
      language: 'text',
      path: 'seed-skills/nightwatchjs-testing/SKILL.md',
      snippet:
        'project-root/\n nightwatch.conf.js              # Main Nightwatch configuration\n nightwatch/\n    tests/                      # Test spec files\n       auth/\n          login.ts\n          registration.ts\n       checkout/\n          purchase-flow.ts\n       search/\n           product-search.ts\n    page-objects/               # Page Object definitions\n       loginPage.ts\n       dashboardPage.ts\n       checkoutPage.ts\n    custom-commands/            # Reusable custom commands\n       loginViaApi.ts\n       clearSession.ts',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/nightwatchjs-testing-guide.ts',
      snippet:
        '- Nightwatch.js 3.x supports Selenium WebDriver, Chrome DevTools Protocol, and direct browser drivers\n- The built-in test runner handles parallel execution, retries, and multiple environments\n- Page objects encapsulate page-specific selectors and methods for maintainable tests\n- Custom commands and assertions extend the framework with reusable testing utilities\n- Nightwatch integrates with Selenium Grid for distributed cross-browser testing\n- Configuration supports multiple environments (dev, staging, production) in a single file\n\n---\n\n## Setting Up Nightwatch\n\n### Installation\n\n\\`\\`\\`bash\n# Initialize a new project with Nightwatch\nnpm init nightwatch@latest',
    },
  ],
});
