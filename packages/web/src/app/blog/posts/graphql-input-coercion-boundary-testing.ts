import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 868,
  slug: 'graphql-input-coercion-boundary-testing',
  campaignCluster: 'system-quality',
  title: 'Graphql Input Coercion Boundary Testing',
  description:
    'GraphQL input coercion boundary testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'GraphQL input coercion boundary testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams exercise list, enum, scalar, variable, and default coercion boundaries?',
  intentBoundary: 'Owns GraphQL input coercion rules, not JSON Schema type conversion.',
  secondaryKeywords: [
    'single value list coercion',
    'enum input rejection',
    'variable default coercion',
    'GraphQL input coercion boundary testing checklist',
    'GraphQL input coercion boundary testing CI strategy',
    'GraphQL input coercion boundary testing failure diagnosis',
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
      title: 'Build the GraphQL input coercion boundary testing baseline',
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
