import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 867,
  slug: 'graphql-directive-behavior-testing',
  campaignCluster: 'system-quality',
  title: 'Graphql Directive Behavior Testing',
  description:
    'GraphQL directive behavior testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'GraphQL directive behavior testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify built-in and custom directives alter execution only at valid locations?',
  intentBoundary:
    'Owns directive placement and runtime effects, not schema authorization middleware broadly.',
  secondaryKeywords: [
    'skip include directive matrix',
    'custom directive execution',
    'invalid directive location',
    'GraphQL directive behavior testing checklist',
    'GraphQL directive behavior testing CI strategy',
    'GraphQL directive behavior testing failure diagnosis',
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
      title: 'Build the GraphQL directive behavior testing baseline',
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
