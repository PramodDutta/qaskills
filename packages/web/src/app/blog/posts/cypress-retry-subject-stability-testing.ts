import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 952,
  slug: 'cypress-retry-subject-stability-testing',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Cypress Retry Subject Stability Testing',
  description:
    'Cypress retry subject stability testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Cypress retry subject stability testing',
  intent: 'troubleshooting',
  coreQuestion:
    'Which Cypress chains retry from a stable query, and how do tests expose stale subjects after actions or DOM replacement?',
  intentBoundary:
    'The nearest page covers a broader cypress workflow. This candidate owns retry boundaries for yielded subjects rather than a generic detached-element fix.',
  secondaryKeywords: [
    'Cypress retry subject chain',
    'stale Cypress command subject',
    'query retry boundary Cypress',
    'DOM replacement Cypress test',
    'Cypress action subject stability',
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
      title: 'Build the Cypress retry subject stability testing baseline',
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
