import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 809,
  slug: 'locust-worker-rebalance-load-testing',
  campaignCluster: 'system-quality',
  title: 'Locust Worker Rebalance Load Testing',
  description:
    'Locust worker rebalance load testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Locust worker rebalance load testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify user distribution and throughput recover when Locust workers join or leave?',
  intentBoundary: 'Owns distributed worker membership changes, not static distributed setup.',
  secondaryKeywords: [
    'Locust worker loss',
    'user redistribution',
    'distributed runner recovery',
    'Locust worker rebalance load testing checklist',
    'Locust worker rebalance load testing CI strategy',
    'Locust worker rebalance load testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/locust-load-testing/SKILL.md',
    'seed-skills/stress-testing-patterns/SKILL.md',
    'packages/web/src/app/blog/posts/locust-load-testing-python-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/performance-testing',
    '/blog/load-testing-beginners-guide',
    '/blog/chaos-engineering-resilience-testing',
    '/blog/api-testing-best-practices-guide',
    '/blog/performance-testing-complete-guide',
  ],
  relatedSlugs: [
    'load-testing-beginners-guide',
    'chaos-engineering-resilience-testing',
    'api-testing-best-practices-guide',
    'performance-testing-complete-guide',
  ],
  sources: [
    'https://docs.locust.io/en/stable/running-distributed.html',
    'https://docs.locust.io/en/stable/writing-a-locustfile.html',
  ],
  codeExamples: [
    {
      title: 'Build the Locust worker rebalance load testing baseline',
      language: 'python',
      path: 'seed-skills/locust-load-testing/SKILL.md',
      snippet:
        '// Example locust pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/stress-testing-patterns/SKILL.md',
      snippet: '',
    },
  ],
});
