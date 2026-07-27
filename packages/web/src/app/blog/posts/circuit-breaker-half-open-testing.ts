import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 819,
  slug: 'circuit-breaker-half-open-testing',
  campaignCluster: 'system-quality',
  title: 'Circuit Breaker Half Open Testing',
  description:
    'circuit breaker half open testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'circuit breaker half open testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify concurrent probes close or reopen a circuit without a request surge?',
  intentBoundary: 'Owns half-open probe concurrency, not open-state fallback behavior broadly.',
  secondaryKeywords: [
    'half-open probe limit',
    'circuit close race',
    'failed recovery probe',
    'circuit breaker half open testing checklist',
    'circuit breaker half open testing CI strategy',
    'circuit breaker half open testing failure diagnosis',
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
      title: 'Build the circuit breaker half open testing baseline',
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
