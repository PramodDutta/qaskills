import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 872,
  slug: 'grpc-metadata-propagation-testing',
  campaignCluster: 'system-quality',
  title: 'Grpc Metadata Propagation Testing',
  description:
    'gRPC metadata propagation testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'gRPC metadata propagation testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams prove required metadata crosses unary and streaming interceptor boundaries safely?',
  intentBoundary: 'Owns gRPC metadata and trailers, not distributed trace semantics generally.',
  secondaryKeywords: [
    'binary metadata handling',
    'trailing metadata contract',
    'interceptor header propagation',
    'gRPC metadata propagation testing checklist',
    'gRPC metadata propagation testing CI strategy',
    'gRPC metadata propagation testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/grpc-testing/SKILL.md',
    'seed-skills/microservices-contract-testing/SKILL.md',
    'packages/web/src/app/blog/posts/grpc-api-testing-complete-guide-2026.ts',
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
  sources: ['https://grpc.io/docs/what-is-grpc/core-concepts/', 'https://grpc.io/docs/guides/'],
  codeExamples: [
    {
      title: 'Build the gRPC metadata propagation testing baseline',
      language: 'go',
      path: 'seed-skills/grpc-testing/SKILL.md',
      snippet:
        '// Example grpc pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/microservices-contract-testing/SKILL.md',
      snippet: '',
    },
  ],
});
