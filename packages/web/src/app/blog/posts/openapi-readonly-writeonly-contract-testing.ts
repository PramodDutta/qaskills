import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 820,
  slug: 'openapi-readonly-writeonly-contract-testing',
  campaignCluster: 'system-quality',
  title: 'Openapi Readonly Writeonly Contract Testing',
  description:
    'OpenAPI readOnly writeOnly contract testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'OpenAPI readOnly writeOnly contract testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify readOnly and writeOnly fields appear only in their permitted directions?',
  intentBoundary: 'Owns request and response visibility semantics, not field authorization policy.',
  secondaryKeywords: [
    'request writeOnly property',
    'response readOnly property',
    'directional schema validation',
    'OpenAPI readOnly writeOnly contract testing checklist',
    'OpenAPI readOnly writeOnly contract testing CI strategy',
    'OpenAPI readOnly writeOnly contract testing failure diagnosis',
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
      title: 'Build the OpenAPI readOnly writeOnly contract testing baseline',
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
