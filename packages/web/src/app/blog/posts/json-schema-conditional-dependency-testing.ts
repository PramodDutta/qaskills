import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 760,
  slug: 'json-schema-conditional-dependency-testing',
  campaignCluster: 'system-quality',
  title: 'Json Schema Conditional Dependency Testing',
  description:
    'JSON Schema conditional dependency testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'JSON Schema conditional dependency testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams exercise dependentRequired and if then else combinations without missing branch cases?',
  intentBoundary: 'Owns conditional and dependent keywords, not generic required field matrices.',
  secondaryKeywords: [
    'dependentRequired test matrix',
    'if then else schema',
    'conditional payload validation',
    'JSON Schema conditional dependency testing checklist',
    'JSON Schema conditional dependency testing CI strategy',
    'JSON Schema conditional dependency testing failure diagnosis',
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
      title: 'Build the JSON Schema conditional dependency testing baseline',
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
