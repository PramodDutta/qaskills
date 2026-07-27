import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 953,
  slug: 'cypress-test-isolation-cookie-leakage',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Cypress Test Isolation Cookie Leakage',
  description:
    'Cypress test isolation cookie leakage: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Cypress test isolation cookie leakage',
  intent: 'troubleshooting',
  coreQuestion:
    'How can Cypress tests prove cookies and storage do not leak when testIsolation is enabled, disabled, or overridden?',
  intentBoundary:
    'The nearest page covers a broader cypress workflow. This candidate owns a cookie and storage leakage matrix across isolation modes.',
  secondaryKeywords: [
    'Cypress testIsolation cookies',
    'localStorage leakage Cypress',
    'Cypress isolation config test',
    'cross-test session state leak',
    'Cypress storage cleanup assertion',
  ],
  repoEvidence: ['seed-skills/cypress-e2e/SKILL.md', 'seed-skills/screenshot-testing-ci/SKILL.md'],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/e2e-testing',
    '/blog/cypress-best-practices-2026-guide',
    '/blog/cypress-intercept-network-stubbing-reference',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
  ],
  relatedSlugs: [
    'cypress-best-practices-2026-guide',
    'cypress-intercept-network-stubbing-reference',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
  ],
  sources: [
    'https://docs.cypress.io/app/core-concepts/test-isolation',
    'https://docs.cypress.io/app/core-concepts/retry-ability',
    'https://docs.cypress.io/api/commands/screenshot',
  ],
  codeExamples: [
    {
      title: 'Build the Cypress test isolation cookie leakage baseline',
      language: 'text',
      path: 'seed-skills/cypress-e2e/SKILL.md',
      snippet:
        'cypress/\n  e2e/\n    auth/\n      login.cy.ts\n      signup.cy.ts\n    dashboard/\n      dashboard.cy.ts\n    checkout/\n      cart.cy.ts\n  fixtures/\n    users.json\n    products.json\n  support/\n    commands.ts\n    e2e.ts\n    component.ts\n  pages/\n    login.page.ts',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/screenshot-testing-ci/SKILL.md',
      snippet: '',
    },
  ],
});
