import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 874,
  slug: 'grpc-server-reflection-access-testing',
  campaignCluster: 'system-quality',
  title: 'Grpc Server Reflection Access Testing',
  description:
    'gRPC server reflection access testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'gRPC server reflection access testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify reflection exposes intended descriptors and rejects unauthorized discovery?',
  intentBoundary:
    'Owns reflection service exposure, not protobuf compatibility or business authorization.',
  secondaryKeywords: [
    'grpcurl reflection access',
    'descriptor discovery policy',
    'reflection service disabled',
    'gRPC server reflection access testing checklist',
    'gRPC server reflection access testing CI strategy',
    'gRPC server reflection access testing failure diagnosis',
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
      title: 'Build the gRPC server reflection access testing baseline',
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
