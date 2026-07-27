import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 523,
  slug: 'cypress-intercept-cache-header-removal',
  campaignCluster: 'browser-e2e',
  title: 'Cypress Intercept Cache Header Removal',
  description:
    'cypress intercept cache header removal: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'cypress intercept cache header removal',
  intent: 'how-to',
  coreQuestion:
    'How do QA teams verify removing cache headers so intercept handlers observe repeat requests with deterministic browser automation and useful failure evidence?',
  intentBoundary:
    'Owns removing cache headers so intercept handlers observe repeat requests. It excludes generic browser cache testing.',
  secondaryKeywords: [
    'cypress intercept cache header removal example',
    'debug cypress intercept cache header removal',
    'Cypress cache-control removal',
    'Cypress 304 response',
    'intercept visibility browser test',
    'cypress intercept cache header removal CI checks',
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
    'https://docs.cypress.io/api/commands/intercept',
    'https://docs.cypress.io/app/guides/network-requests',
    'https://docs.cypress.io/api/cypress-api/catalog-of-events',
  ],
  codeExamples: [
    {
      title: 'Build the cypress intercept cache header removal baseline',
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
