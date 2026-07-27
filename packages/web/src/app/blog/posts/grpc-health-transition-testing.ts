import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 799,
  slug: 'grpc-health-transition-testing',
  campaignCluster: 'system-quality',
  title: 'Grpc Health Transition Testing',
  description:
    'gRPC health transition testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'gRPC health transition testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify serving status changes propagate per service during startup and drain?',
  intentBoundary: 'Owns gRPC health service transitions, not Kubernetes probe configuration.',
  secondaryKeywords: [
    'SERVING status change',
    'Watch health stream',
    'service drain health state',
    'gRPC health transition testing checklist',
    'gRPC health transition testing CI strategy',
    'gRPC health transition testing failure diagnosis',
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
      title: 'Build the gRPC health transition testing baseline',
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
