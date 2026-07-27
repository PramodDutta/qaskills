import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 792,
  slug: 'bulkhead-queue-isolation-testing',
  campaignCluster: 'system-quality',
  title: 'Bulkhead Queue Isolation Testing',
  description:
    'bulkhead queue isolation testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'bulkhead queue isolation testing',
  intent: 'how-to',
  coreQuestion:
    "How can QA teams verify one dependency queue cannot consume another workload's capacity?",
  intentBoundary: 'Owns queue and pool partitioning, not generic rate limits or Kubernetes quotas.',
  secondaryKeywords: [
    'separate executor pool',
    'bulkhead queue saturation',
    'tenant workload isolation',
    'bulkhead queue isolation testing checklist',
    'bulkhead queue isolation testing CI strategy',
    'bulkhead queue isolation testing failure diagnosis',
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
    'https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead',
    'https://sre.google/workbook/overload/',
  ],
  codeExamples: [
    {
      title: 'Build the bulkhead queue isolation testing baseline',
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
