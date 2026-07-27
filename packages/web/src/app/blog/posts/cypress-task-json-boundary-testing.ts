import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 539,
  slug: 'cypress-task-json-boundary-testing',
  campaignCluster: 'browser-e2e',
  title: 'Cypress Task Json Boundary Testing',
  description:
    'cypress task JSON boundary testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'cypress task JSON boundary testing',
  intent: 'troubleshooting',
  coreQuestion:
    'What causes failures in JSON-serializable task arguments and return values, and which browser evidence identifies the real cause?',
  intentBoundary:
    'Owns JSON-serializable task arguments and return values. It excludes custom browser commands.',
  secondaryKeywords: [
    'cypress task JSON boundary testing example',
    'debug cypress task JSON boundary testing',
    'Cypress task serialization',
    'Cypress undefined return',
    'JSON value browser test',
    'cypress task JSON boundary testing CI checks',
  ],
  repoEvidence: [
    'seed-skills/cypress-e2e/SKILL.md',
    'packages/web/src/app/blog/posts/cypress-best-practices-2026-guide.ts',
    'packages/web/src/app/blog/posts/cypress-intercept-network-stubbing-reference.ts',
    'docs/seo/article-factory-250-2026-07-25/inventory.json',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/cypress-tutorial-beginners-2026',
    '/blog/cypress-best-practices-2026-guide',
    '/blog/cypress-intercept-network-stubbing-reference',
    '/blog/playwright-e2e-complete-guide',
  ],
  relatedSlugs: [
    'cypress-tutorial-beginners-2026',
    'cypress-best-practices-2026-guide',
    'cypress-intercept-network-stubbing-reference',
    'playwright-e2e-complete-guide',
  ],
  sources: [
    'https://docs.cypress.io/api/commands/task',
    'https://docs.cypress.io/api/node-events/overview',
    'https://docs.cypress.io/api/node-events/browser-launch-api',
  ],
  codeExamples: [
    {
      title: 'Build the cypress task JSON boundary testing baseline',
      language: 'text',
      path: 'seed-skills/cypress-e2e/SKILL.md',
      snippet:
        'cypress/\n  e2e/\n    auth/\n      login.cy.ts\n      signup.cy.ts\n    dashboard/\n      dashboard.cy.ts\n    checkout/\n      cart.cy.ts\n  fixtures/\n    users.json\n    products.json\n  support/\n    commands.ts\n    e2e.ts\n    component.ts\n  pages/\n    login.page.ts',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/cypress-best-practices-2026-guide.ts',
      snippet:
        "- **Selector strategy is non-negotiable.** Always use \\`data-cy\\` attributes; never select by class, ID, or generated text.\n- **Eliminate arbitrary waits.** \\`cy.wait(ms)\\` is the single biggest cause of flake. Use route aliases and assertions instead.\n- **Isolate every test.** Tests must not depend on order, leftover state, or other tests' data.\n- **Stub the network at the boundary.** \\`cy.intercept()\\` lets you control timing, payloads, and edge cases without backend changes.\n- **Custom commands are leverage, not magic.** Use them to encode policy (login, seed, navigate) -- not to hide assertions.\n- **Run in CI like you run locally.** Headless mode, the same Node version, and parallelization should match.\n\n---\n\n## Rule 1 -- Use data-cy Attributes for Selectors\n\nThe official Cypress documentation has recommended \\`data-cy\\` attributes for years, and yet most flaky Cypress suites still select elements by class, ID, or visible text. This is the root cause of more flake than any other single anti-pattern.\n\n**Bad** -- coupled to styling and copy:\n\n\\`\\`\\`javascript\ncy.get('.btn-primary').click();",
    },
  ],
});
