import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 832,
  slug: 'openapi-parameter-serialization-testing',
  campaignCluster: 'system-quality',
  title: 'Openapi Parameter Serialization Testing',
  description:
    'OpenAPI parameter serialization testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'OpenAPI parameter serialization testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams exercise style and explode combinations for query, path, header, and cookie parameters?',
  intentBoundary:
    'Owns OpenAPI serialization keywords, not ordinary URL encoding or repeated query parameters.',
  secondaryKeywords: [
    'style explode matrix',
    'deepObject query serialization',
    'path parameter encoding',
    'OpenAPI parameter serialization testing checklist',
    'OpenAPI parameter serialization testing CI strategy',
    'OpenAPI parameter serialization testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/openapi-validation/SKILL.md',
    'seed-skills/api-schema-evolution/SKILL.md',
    'packages/web/src/app/blog/posts/api-contract-testing-microservices.ts',
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
    'https://spec.openapis.org/oas/v3.1.1.html',
    'https://json-schema.org/draft/2020-12/json-schema-validation',
  ],
  codeExamples: [
    {
      title: 'Build the OpenAPI parameter serialization testing baseline',
      language: 'typescript',
      path: 'seed-skills/openapi-validation/SKILL.md',
      snippet:
        '// Example openapi pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/api-schema-evolution/SKILL.md',
      snippet: '',
    },
  ],
});
