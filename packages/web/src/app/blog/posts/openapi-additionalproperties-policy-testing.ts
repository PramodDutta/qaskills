import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 817,
  slug: 'openapi-additionalproperties-policy-testing',
  campaignCluster: 'system-quality',
  title: 'Openapi Additionalproperties Policy Testing',
  description:
    'OpenAPI additionalProperties policy testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'OpenAPI additionalProperties policy testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify unknown object fields are accepted or rejected exactly as documented?',
  intentBoundary: 'Owns additionalProperties behavior, not top-level version compatibility.',
  secondaryKeywords: [
    'reject unknown JSON fields',
    'free form object contract',
    'additional property schema',
    'OpenAPI additionalProperties policy testing checklist',
    'OpenAPI additionalProperties policy testing CI strategy',
    'OpenAPI additionalProperties policy testing failure diagnosis',
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
      title: 'Build the OpenAPI additionalProperties policy testing baseline',
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
