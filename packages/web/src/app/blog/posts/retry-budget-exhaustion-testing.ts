import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 786,
  slug: 'retry-budget-exhaustion-testing',
  campaignCluster: 'system-quality',
  title: 'Retry Budget Exhaustion Testing',
  description:
    'retry budget exhaustion testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'retry budget exhaustion testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify retries stop before they consume shared latency and capacity budgets?',
  intentBoundary:
    'Owns aggregate retry budget depletion, not per-request exponential backoff basics.',
  secondaryKeywords: [
    'retry token budget',
    'retry storm prevention',
    'budget replenishment',
    'retry budget exhaustion testing checklist',
    'retry budget exhaustion testing CI strategy',
    'retry budget exhaustion testing failure diagnosis',
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
      title: 'Build the retry budget exhaustion testing baseline',
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
