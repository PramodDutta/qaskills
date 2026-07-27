import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 552,
  slug: 'playwright-cli-remove-request-headers',
  campaignCluster: 'browser-e2e',
  title: 'Playwright CLI Remove Request Headers',
  description:
    'playwright cli remove request headers: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'playwright cli remove request headers',
  intent: 'how-to',
  coreQuestion:
    'How do you remove cookies, authorization, or custom headers from matching browser requests with Playwright CLI?',
  intentBoundary:
    'Targets the CLI remove-header negative-test workflow, not setting extra headers or general route mocking.',
  secondaryKeywords: [
    'playwright cli remove header',
    'strip authorization header playwright',
    'remove cookie request header',
    'playwright route header testing',
    'browser request header negative test',
    'unroute playwright cli',
  ],
  repoEvidence: [
    'seed-skills/playwright-cli/references/request-mocking.md',
    'seed-skills/playwright-cli/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/skills/Pramod/playwright-cli',
    '/blog/playwright-cli-complete-guide-2026',
    '/blog/playwright-network-mocking-route-handler-guide',
    '/blog/playwright-extra-http-headers-per-test',
    '/blog/playwright-e2e-complete-guide',
  ],
  relatedSlugs: [
    'playwright-cli-complete-guide-2026',
    'playwright-network-mocking-route-handler-guide',
    'playwright-extra-http-headers-per-test',
    'playwright-e2e-complete-guide',
  ],
  sources: [
    'https://playwright.dev/docs/getting-started-cli',
    'https://github.com/microsoft/playwright-cli',
    'https://playwright.dev/docs/network',
  ],
  codeExamples: [
    {
      title: 'Build the playwright cli remove request headers baseline',
      language: 'bash',
      path: 'seed-skills/playwright-cli/references/request-mocking.md',
      snippet:
        '# Mock with custom status\nplaywright-cli route "**/*.jpg" --status=404\n\n# Mock with JSON body\nplaywright-cli route "**/api/users" --body=\'[{"id":1,"name":"Alice"}]\' --content-type=application/json\n\n# Mock with custom headers\nplaywright-cli route "**/api/data" --body=\'{"ok":true}\' --header="X-Custom: value"\n\n# Remove headers from requests\nplaywright-cli route "**/*" --remove-header=cookie,authorization\n\n# List active routes\nplaywright-cli route-list\n\n# Remove a route or all routes\nplaywright-cli unroute "**/*.jpg"\nplaywright-cli unroute',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'bash',
      path: 'seed-skills/playwright-cli/SKILL.md',
      snippet: '# close the browser\nplaywright-cli close',
    },
  ],
});
