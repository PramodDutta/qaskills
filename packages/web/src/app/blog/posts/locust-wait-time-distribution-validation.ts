import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 805,
  slug: 'locust-wait-time-distribution-validation',
  campaignCluster: 'system-quality',
  title: 'Locust Wait Time Distribution Validation',
  description:
    'Locust wait time distribution validation: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Locust wait time distribution validation',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams prove simulated user wait times match the intended statistical distribution?',
  intentBoundary: 'Owns think-time distribution quality, not request latency thresholds.',
  secondaryKeywords: [
    'between wait_time sampling',
    'constant pacing drift',
    'user think time histogram',
    'Locust wait time distribution validation checklist',
    'Locust wait time distribution validation CI strategy',
    'Locust wait time distribution validation failure diagnosis',
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
      title: 'Build the Locust wait time distribution validation baseline',
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
