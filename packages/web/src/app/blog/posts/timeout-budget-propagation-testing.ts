import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 869,
  slug: 'timeout-budget-propagation-testing',
  campaignCluster: 'system-quality',
  title: 'Timeout Budget Propagation Testing',
  description:
    'timeout budget propagation testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'timeout budget propagation testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify downstream deadlines shrink from one end-to-end request budget?',
  intentBoundary:
    'Owns deadline propagation across calls, not gRPC retry pushback or fixed timeouts.',
  secondaryKeywords: [
    'remaining deadline header',
    'nested timeout allocation',
    'end-to-end latency budget',
    'timeout budget propagation testing checklist',
    'timeout budget propagation testing CI strategy',
    'timeout budget propagation testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/retry-resilience-testing/SKILL.md',
    'seed-skills/error-handling-testing/SKILL.md',
    'packages/web/src/app/blog/posts/error-handling-testing-patterns.ts',
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
    'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/',
    'https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker',
  ],
  codeExamples: [
    {
      title: 'Build the timeout budget propagation testing baseline',
      language: 'typescript',
      path: 'seed-skills/retry-resilience-testing/SKILL.md',
      snippet:
        '// Example retry pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/error-handling-testing/SKILL.md',
      snippet: '',
    },
  ],
});
