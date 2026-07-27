import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 533,
  slug: 'cypress-request-binary-encoding-integrity',
  campaignCluster: 'browser-e2e',
  title: 'Cypress Request Binary Encoding Integrity',
  description:
    'cypress request binary encoding integrity: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'cypress request binary encoding integrity',
  intent: 'how-to',
  coreQuestion:
    'How do QA teams verify binary and base64 cy.request response integrity with deterministic browser automation and useful failure evidence?',
  intentBoundary:
    'Owns binary and base64 cy.request response integrity. It excludes file downloads through the browser UI.',
  secondaryKeywords: [
    'cypress request binary encoding integrity example',
    'debug cypress request binary encoding integrity',
    'Cypress binary encoding',
    'Cypress base64 response',
    'byte checksum browser test',
    'cypress request binary encoding integrity CI checks',
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
    'https://docs.cypress.io/api/commands/request',
    'https://docs.cypress.io/app/core-concepts/retry-ability',
    'https://docs.cypress.io/app/references/configuration',
  ],
  codeExamples: [
    {
      title: 'Build the cypress request binary encoding integrity baseline',
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
