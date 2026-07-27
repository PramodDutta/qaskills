import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 762,
  slug: 'load-test-warmup-exclusion-analysis',
  campaignCluster: 'system-quality',
  title: 'Load Test Warmup Exclusion Analysis',
  description:
    'load test warmup exclusion analysis: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'load test warmup exclusion analysis',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams define and verify warmup windows without hiding early capacity problems?',
  intentBoundary:
    'Owns measurement-window exclusion, not REST Assured request warmup or cold-start budgets.',
  secondaryKeywords: [
    'warmup percentile exclusion',
    'steady state measurement window',
    'cold cache baseline',
    'load test warmup exclusion analysis checklist',
    'load test warmup exclusion analysis CI strategy',
    'load test warmup exclusion analysis failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/performance-budget-testing/SKILL.md',
    'seed-skills/database-performance-testing/SKILL.md',
    'packages/web/src/app/blog/posts/load-testing-beginners-guide.ts',
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
    'https://grafana.com/docs/k6/latest/testing-guides/test-types/',
    'https://opentelemetry.io/docs/specs/otel/metrics/',
  ],
  codeExamples: [
    {
      title: 'Build the load test warmup exclusion analysis baseline',
      language: 'typescript',
      path: 'seed-skills/performance-budget-testing/SKILL.md',
      snippet:
        '// Example performance-budget pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/database-performance-testing/SKILL.md',
      snippet: '',
    },
  ],
});
