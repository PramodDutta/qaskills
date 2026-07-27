import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 825,
  slug: 'openapi-webhook-schema-evolution-testing',
  campaignCluster: 'system-quality',
  title: 'Openapi Webhook Schema Evolution Testing',
  description:
    'OpenAPI webhook schema evolution testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'OpenAPI webhook schema evolution testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams prove webhook producers remain compatible as OpenAPI event schemas evolve?',
  intentBoundary:
    'Owns schema evolution for outbound events, not signature replay or delivery retries.',
  secondaryKeywords: [
    'webhook payload compatibility',
    'event schema versioning',
    'consumer-safe webhook change',
    'OpenAPI webhook schema evolution testing checklist',
    'OpenAPI webhook schema evolution testing CI strategy',
    'OpenAPI webhook schema evolution testing failure diagnosis',
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
      title: 'Build the OpenAPI webhook schema evolution testing baseline',
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
