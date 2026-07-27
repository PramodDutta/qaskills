import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 871,
  slug: 'graphql-schema-deprecation-usage-testing',
  campaignCluster: 'system-quality',
  title: 'Graphql Schema Deprecation Usage Testing',
  description:
    'GraphQL schema deprecation usage testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'GraphQL schema deprecation usage testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams detect client operations that still depend on fields scheduled for removal?',
  intentBoundary:
    'Owns consumer usage of deprecated schema members, not generic breaking-change diffing.',
  secondaryKeywords: [
    'deprecated field operation scan',
    'deprecation reason quality',
    'safe field removal gate',
    'GraphQL schema deprecation usage testing checklist',
    'GraphQL schema deprecation usage testing CI strategy',
    'GraphQL schema deprecation usage testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/graphql-testing/SKILL.md',
    'seed-skills/contract-testing-graphql/SKILL.md',
    'packages/web/src/app/blog/posts/graphql-testing-complete-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/api-testing',
    '/blog/api-testing-complete-guide',
    '/blog/api-contract-testing-microservices',
    '/blog/api-testing-best-practices-guide',
    '/blog/performance-testing-complete-guide',
  ],
  relatedSlugs: [
    'api-testing-complete-guide',
    'api-contract-testing-microservices',
    'api-testing-best-practices-guide',
    'performance-testing-complete-guide',
  ],
  sources: [
    'https://spec.graphql.org/October2021/',
    'https://graphql.github.io/graphql-over-http/draft/',
  ],
  codeExamples: [
    {
      title: 'Build the GraphQL schema deprecation usage testing baseline',
      language: 'typescript',
      path: 'seed-skills/graphql-testing/SKILL.md',
      snippet:
        '// Example graphql pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/contract-testing-graphql/SKILL.md',
      snippet: '',
    },
  ],
});
