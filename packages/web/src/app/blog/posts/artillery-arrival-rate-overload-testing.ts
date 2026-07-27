import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 850,
  slug: 'artillery-arrival-rate-overload-testing',
  campaignCluster: 'system-quality',
  title: 'Artillery Arrival Rate Overload Testing',
  description:
    'Artillery arrival rate overload testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Artillery arrival rate overload testing',
  intent: 'troubleshooting',
  coreQuestion:
    'How can QA teams detect when requested arrivals exceed generator capacity and distort the workload?',
  intentBoundary: 'Owns Artillery generator overload, not target-system saturation alone.',
  secondaryKeywords: [
    'arrival rate lag',
    'virtual user creation backlog',
    'generator CPU saturation',
    'Artillery arrival rate overload testing checklist',
    'Artillery arrival rate overload testing CI strategy',
    'Artillery arrival rate overload testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/artillery-load-testing/SKILL.md',
    'seed-skills/performance-budget-testing/SKILL.md',
    'packages/web/src/app/blog/posts/artillery-load-testing-nodejs-guide.ts',
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
    'https://www.artillery.io/docs/reference/test-script',
    'https://www.artillery.io/docs/reference/engines/http',
  ],
  codeExamples: [
    {
      title: 'Build the Artillery arrival rate overload testing baseline',
      language: 'yaml',
      path: 'seed-skills/artillery-load-testing/SKILL.md',
      snippet:
        '// Example artillery pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/performance-budget-testing/SKILL.md',
      snippet: '',
    },
  ],
});
