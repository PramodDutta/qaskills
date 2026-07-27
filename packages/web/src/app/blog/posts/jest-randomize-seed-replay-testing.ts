import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 968,
  slug: 'jest-randomize-seed-replay-testing',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Jest Randomize Seed Replay Testing',
  description:
    'Jest randomize seed replay testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Jest randomize seed replay testing',
  intent: 'troubleshooting',
  coreQuestion:
    'How can a team randomize Jest execution, capture the seed, and replay the exact failing order in CI?',
  intentBoundary:
    'The nearest page covers a broader jest workflow. This candidate owns seeded order reproduction rather than general Jest setup.',
  secondaryKeywords: [
    'Jest randomize CLI seed',
    'replay Jest test order',
    'showSeed CI artifact',
    'order dependent Jest tests',
    'Jest seed failure reproduction',
  ],
  repoEvidence: [
    'seed-skills/jest-unit/SKILL.md',
    'seed-skills/test-isolation-strategies/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/jest-async-await-testing-promises-guide',
    '/blog/jest-module-isolation-resetmodules-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
  ],
  relatedSlugs: [
    'jest-async-await-testing-promises-guide',
    'jest-module-isolation-resetmodules-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
  ],
  sources: ['https://jestjs.io/docs/cli', 'https://jestjs.io/docs/configuration'],
  codeExamples: [
    {
      title: 'Build the Jest randomize seed replay testing baseline',
      language: 'text',
      path: 'seed-skills/jest-unit/SKILL.md',
      snippet:
        'src/\n  services/\n    user.service.ts\n    user.service.test.ts\n    order.service.ts\n    order.service.test.ts\n  utils/\n    validators.ts\n    validators.test.ts\n    formatters.ts\n    formatters.test.ts\n  models/\n    user.model.ts\n  __mocks__/\n    axios.ts\n    database.ts\n  __tests__/\n    integration/',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/test-isolation-strategies/SKILL.md',
      snippet: '',
    },
  ],
});
