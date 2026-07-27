import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 783,
  slug: 'openapi-callback-url-contract-testing',
  campaignCluster: 'system-quality',
  title: 'Openapi Callback URL Contract Testing',
  description:
    'OpenAPI callback URL contract testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'OpenAPI callback URL contract testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams validate runtime callback expressions and outbound callback request contracts?',
  intentBoundary: 'Owns OpenAPI callback expressions, not inbound webhook signature verification.',
  secondaryKeywords: [
    'runtime callback expression',
    'callback request schema',
    'callback URL substitution',
    'OpenAPI callback URL contract testing checklist',
    'OpenAPI callback URL contract testing CI strategy',
    'OpenAPI callback URL contract testing failure diagnosis',
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
      title: 'Build the OpenAPI callback URL contract testing baseline',
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
