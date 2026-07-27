import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 942,
  slug: 'api-multipart-duplicate-field-testing',
  campaignCluster: 'frameworks-qa-practice',
  title: 'API Multipart Duplicate Field Testing',
  description:
    'API multipart duplicate field testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'API multipart duplicate field testing',
  intent: 'how-to',
  coreQuestion:
    'How should an API define and test duplicate multipart field names when parsers expose first, last, or all values?',
  intentBoundary:
    'The nearest page covers a broader api workflow. This candidate owns duplicate-field parser semantics inside multipart requests.',
  secondaryKeywords: [
    'API duplicate multipart fields',
    'multipart repeated name test',
    'server parser field collision',
    'duplicate form data semantics',
    'multipart array field validation',
  ],
  repoEvidence: [
    'seed-skills/api-testing-rest/SKILL.md',
    'seed-skills/api-test-suite-generator/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/api-testing',
    '/blog/api-testing-complete-guide',
    '/blog/api-testing-best-practices-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
  ],
  relatedSlugs: [
    'api-testing-complete-guide',
    'api-testing-best-practices-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
  ],
  sources: [
    'https://www.rfc-editor.org/info/rfc9110',
    'https://www.rfc-editor.org/info/rfc9111',
    'https://www.rfc-editor.org/info/rfc7578',
  ],
  codeExamples: [
    {
      title: 'Build the API multipart duplicate field testing baseline',
      language: 'text',
      path: 'seed-skills/api-testing-rest/SKILL.md',
      snippet:
        'GET     - Retrieve resource(s), safe and idempotent\nPOST    - Create new resource, not idempotent\nPUT     - Replace entire resource, idempotent\nPATCH   - Partial update, idempotent\nDELETE  - Remove resource, idempotent\nHEAD    - Same as GET but no response body\nOPTIONS - Get supported methods for resource',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/api-test-suite-generator/SKILL.md',
      snippet:
        'helpers/\n      api-client.ts\n      schema-validator.ts\n      auth-helper.ts\n      pagination-helper.ts\n      test-data-factory.ts\n    fixtures/\n      users.fixture.ts\n      products.fixture.ts\n    config/\n      environments.ts\n      api.config.ts\n  postman/\n    collection.json\n    environment.json\n  rest-assured/\n    src/test/java/api/\n      UsersApiTest.java',
    },
  ],
});
