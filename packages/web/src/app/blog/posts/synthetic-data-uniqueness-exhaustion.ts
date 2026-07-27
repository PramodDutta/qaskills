import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 887,
  slug: 'synthetic-data-uniqueness-exhaustion',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Synthetic Data Uniqueness Exhaustion',
  description:
    'Synthetic data uniqueness exhaustion: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Synthetic data uniqueness exhaustion',
  intent: 'troubleshooting',
  coreQuestion:
    'How can QA teams diagnose Synthetic data uniqueness exhaustion, specifically bounded unique pools and deterministic exhaustion failures?',
  intentBoundary:
    'Owns bounded unique pools and deterministic exhaustion failures. It excludes production-data copying, database infrastructure, or generic data-generation guides, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Synthetic data uniqueness exhaustion example',
    'Synthetic data uniqueness exhaustion test cases',
    'Synthetic data uniqueness exhaustion failure modes',
    'how to verify synthetic data uniqueness exhaustion',
    'test data bounded unique pools and deterministic exhaustion failures',
    'Synthetic data uniqueness exhaustion best practices',
  ],
  repoEvidence: [
    'seed-skills/test-data-factory/SKILL.md',
    'seed-skills/faker-test-data/SKILL.md',
    'packages/web/src/app/blog/posts/test-data-builder-vs-object-mother.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/test-data-management-strategies',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'test-data-management-strategies',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://fakerjs.dev/guide/',
    'https://docs.pytest.org/en/stable/how-to/fixtures.html',
    'https://thoughtbot.github.io/factory_bot/',
  ],
  codeExamples: [
    {
      title: 'Build the Synthetic data uniqueness exhaustion baseline',
      language: 'text',
      path: 'seed-skills/test-data-factory/SKILL.md',
      snippet:
        'tests/\n  factories/\n    base.factory.ts\n    user.factory.ts\n    product.factory.ts\n    order.factory.ts\n    review.factory.ts\n    address.factory.ts\n    index.ts\n  builders/\n    user.builder.ts\n    order.builder.ts\n    query.builder.ts\n  seeders/\n    database-seeder.ts\n    api-seeder.ts\n    test-environment.ts\n  traits/',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/faker-test-data/SKILL.md',
      snippet: '',
    },
  ],
});
