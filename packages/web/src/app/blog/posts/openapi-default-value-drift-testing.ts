import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 808,
  slug: 'openapi-default-value-drift-testing',
  campaignCluster: 'system-quality',
  title: 'Openapi Default Value Drift Testing',
  description:
    'OpenAPI default value drift testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'OpenAPI default value drift testing',
  intent: 'troubleshooting',
  coreQuestion:
    'How can QA teams compare documented OpenAPI defaults with runtime behavior and generated clients?',
  intentBoundary:
    'Owns default-value agreement, not optional field omission or server configuration defaults.',
  secondaryKeywords: [
    'documented default mismatch',
    'generated client default behavior',
    'runtime default contract',
    'OpenAPI default value drift testing checklist',
    'OpenAPI default value drift testing CI strategy',
    'OpenAPI default value drift testing failure diagnosis',
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
      title: 'Build the OpenAPI default value drift testing baseline',
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
