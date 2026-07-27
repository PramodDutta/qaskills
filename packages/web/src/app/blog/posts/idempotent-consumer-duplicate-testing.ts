import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 751,
  slug: 'idempotent-consumer-duplicate-testing',
  campaignCluster: 'system-quality',
  title: 'Idempotent Consumer Duplicate Testing',
  description:
    'idempotent consumer duplicate testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'idempotent consumer duplicate testing',
  intent: 'how-to',
  coreQuestion: 'How can QA teams verify duplicate deliveries produce one durable business effect?',
  intentBoundary: 'Owns consumer deduplication, not API idempotency keys or Kafka transactions.',
  secondaryKeywords: [
    'message dedupe store',
    'duplicate delivery race',
    'consumer side effect idempotency',
    'idempotent consumer duplicate testing checklist',
    'idempotent consumer duplicate testing CI strategy',
    'idempotent consumer duplicate testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/queue-message-testing/SKILL.md',
    'seed-skills/retry-resilience-testing/SKILL.md',
    'packages/web/src/app/blog/posts/event-driven-architecture-testing-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/error-handling-testing-patterns',
    '/blog/chaos-engineering-resilience-testing',
    '/blog/microservices-testing-strategies',
    '/blog/api-testing-best-practices-guide',
  ],
  relatedSlugs: [
    'error-handling-testing-patterns',
    'chaos-engineering-resilience-testing',
    'microservices-testing-strategies',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/best-practices-message-deduplication.html',
    'https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling',
  ],
  codeExamples: [
    {
      title: 'Build the idempotent consumer duplicate testing baseline',
      language: 'python',
      path: 'seed-skills/queue-message-testing/SKILL.md',
      snippet:
        '// Example message-queue pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/retry-resilience-testing/SKILL.md',
      snippet: '',
    },
  ],
});
