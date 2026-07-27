import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 818,
  slug: 'openapi-discriminator-mapping-validation',
  campaignCluster: 'system-quality',
  title: 'Openapi Discriminator Mapping Validation',
  description:
    'OpenAPI discriminator mapping validation: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'OpenAPI discriminator mapping validation',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams prove discriminator values resolve to the intended component schemas?',
  intentBoundary:
    'Owns explicit discriminator mappings and missing targets, not generic oneOf testing.',
  secondaryKeywords: [
    'discriminator target resolution',
    'unknown discriminator values',
    'mapping reference drift',
    'OpenAPI discriminator mapping validation checklist',
    'OpenAPI discriminator mapping validation CI strategy',
    'OpenAPI discriminator mapping validation failure diagnosis',
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
      title: 'Build the OpenAPI discriminator mapping validation baseline',
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
