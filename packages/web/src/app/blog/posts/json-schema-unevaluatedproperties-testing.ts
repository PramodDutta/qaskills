import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 824,
  slug: 'json-schema-unevaluatedproperties-testing',
  campaignCluster: 'system-quality',
  title: 'Json Schema Unevaluatedproperties Testing',
  description:
    'JSON Schema unevaluatedProperties testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'JSON Schema unevaluatedProperties testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify unevaluatedProperties across allOf, anyOf, references, and conditional branches?',
  intentBoundary:
    'Owns annotation-aware unevaluated properties, not basic additionalProperties behavior.',
  secondaryKeywords: [
    'unevaluated property composition',
    'allOf extra field validation',
    'JSON Schema annotation scope',
    'JSON Schema unevaluatedProperties testing checklist',
    'JSON Schema unevaluatedProperties testing CI strategy',
    'JSON Schema unevaluatedProperties testing failure diagnosis',
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
      title: 'Build the JSON Schema unevaluatedProperties testing baseline',
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
