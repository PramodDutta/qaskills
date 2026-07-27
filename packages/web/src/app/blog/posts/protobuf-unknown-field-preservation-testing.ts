import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 848,
  slug: 'protobuf-unknown-field-preservation-testing',
  campaignCluster: 'system-quality',
  title: 'Protobuf Unknown Field Preservation Testing',
  description:
    'Protobuf unknown field preservation testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Protobuf unknown field preservation testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams prove old and new services preserve unknown fields through parse and reserialize cycles?',
  intentBoundary:
    'Owns unknown-field round trips, not tag renumbering or broad protobuf evolution.',
  secondaryKeywords: [
    'unknown field round trip',
    'protobuf proxy compatibility',
    'old reader new field',
    'Protobuf unknown field preservation testing checklist',
    'Protobuf unknown field preservation testing CI strategy',
    'Protobuf unknown field preservation testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/grpc-testing/SKILL.md',
    'seed-skills/contract-first-testing/SKILL.md',
    'packages/web/src/app/blog/posts/grpc-protobuf-breaking-change-testing-guide.ts',
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
    'https://protobuf.dev/programming-guides/proto3/',
    'https://protobuf.dev/support/cross-version-runtime-guarantee/',
  ],
  codeExamples: [
    {
      title: 'Build the Protobuf unknown field preservation testing baseline',
      language: 'go',
      path: 'seed-skills/grpc-testing/SKILL.md',
      snippet:
        '// Example grpc pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/contract-first-testing/SKILL.md',
      snippet: '',
    },
  ],
});
