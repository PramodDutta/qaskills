import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 563,
  slug: 'testcafe-assertion-selector-timeout-layering',
  campaignCluster: 'browser-e2e',
  title: 'Testcafe Assertion Selector Timeout Layering',
  description:
    'testcafe assertion selector timeout layering: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'testcafe assertion selector timeout layering',
  intent: 'troubleshooting',
  coreQuestion:
    'What causes failures in assertion timeout versus selector timeout precedence, and which browser evidence identifies the real cause?',
  intentBoundary:
    'Owns assertion timeout versus selector timeout precedence. It excludes Smart Assertion basics.',
  secondaryKeywords: [
    'testcafe assertion selector timeout layering example',
    'debug testcafe assertion selector timeout layering',
    'TestCafe assertion timeout',
    'TestCafe selector timeout',
    'retry window browser test',
    'testcafe assertion selector timeout layering CI checks',
  ],
  repoEvidence: [
    'seed-skills/testcafe-testing/SKILL.md',
    'packages/web/src/app/blog/posts/testcafe-e2e-testing-guide.ts',
    'packages/web/src/app/blog/posts/testcafe-smart-assertions-waits-guide.ts',
    'docs/seo/article-factory-250-2026-07-25/inventory.json',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/e2e-testing',
    '/blog/testcafe-e2e-testing-guide',
    '/blog/testcafe-smart-assertions-waits-guide',
    '/blog/playwright-e2e-complete-guide',
    '/blog/cypress-tutorial-beginners-2026',
  ],
  relatedSlugs: [
    'testcafe-e2e-testing-guide',
    'testcafe-smart-assertions-waits-guide',
    'playwright-e2e-complete-guide',
    'cypress-tutorial-beginners-2026',
  ],
  sources: [
    'https://testcafe.io/documentation/402829/guides/basic-guides/select-page-elements',
    'https://testcafe.io/documentation/402832/guides/basic-guides/client-functions',
    'https://testcafe.io/documentation/402827/guides/advanced-guides/built-in-wait-mechanisms',
  ],
  codeExamples: [
    {
      title: 'Build the testcafe assertion selector timeout layering baseline',
      language: 'text',
      path: 'seed-skills/testcafe-testing/SKILL.md',
      snippet:
        'project-root/\n .testcaferc.json                # TestCafe configuration file\n tests/\n    e2e/                        # End-to-end test files\n       auth/\n          login.test.ts\n          registration.test.ts\n       checkout/\n          purchase.test.ts\n       search/\n           product-search.test.ts\n    page-models/                # Page Model classes\n       base.model.ts\n       login.model.ts\n       dashboard.model.ts\n       checkout.model.ts\n    roles/                      # Authentication roles\n       auth-roles.ts',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/testcafe-e2e-testing-guide.ts',
      snippet:
        '- TestCafe requires no WebDriver, browser plugins, or additional binaries\n- Tests run by injecting a proxy script into the browser, giving TestCafe control over page behavior\n- The selector API provides automatic waiting and retry logic for stable element queries\n- Roles enable reusable authentication patterns across tests\n- Request mocking (RequestMock and RequestLogger) lets you intercept and modify HTTP traffic\n- TestCafe supports Chrome, Firefox, Safari, Edge, and remote browsers out of the box\n\n---\n\n## How TestCafe Works\n\nTestCafe acts as a reverse proxy between the browser and the application:\n\n\\`\\`\\`\nBrowser <-> TestCafe Proxy <-> Your Application\n\\`\\`\\`',
    },
  ],
});
