import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 793,
  slug: 'chaos-disk-latency-injection-testing',
  campaignCluster: 'system-quality',
  title: 'Chaos Disk Latency Injection Testing',
  description:
    'chaos disk latency injection testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'chaos disk latency injection testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams inject storage delay and verify queues, timeouts, and data durability signals?',
  intentBoundary: 'Owns slow disk behavior, not disk-full or process-memory pressure.',
  secondaryKeywords: [
    'storage latency fault',
    'fsync delay behavior',
    'disk queue timeout',
    'chaos disk latency injection testing checklist',
    'chaos disk latency injection testing CI strategy',
    'chaos disk latency injection testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/chaos-engineering-advanced/SKILL.md',
    'seed-skills/retry-resilience-testing/SKILL.md',
    'packages/web/src/app/blog/posts/chaos-engineering-resilience-testing.ts',
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
  sources: ['https://principlesofchaos.org/', 'https://chaos-mesh.org/docs/'],
  codeExamples: [
    {
      title: 'Build the chaos disk latency injection testing baseline',
      language: 'python',
      path: 'seed-skills/chaos-engineering-advanced/SKILL.md',
      snippet:
        '// Example chaos-engineering pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/retry-resilience-testing/SKILL.md',
      snippet: '',
    },
  ],
});
