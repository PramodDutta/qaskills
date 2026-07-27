import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 785,
  slug: 'redis-eviction-policy-data-loss-testing',
  campaignCluster: 'system-quality',
  title: 'Redis Eviction Policy Data Loss Testing',
  description:
    'Redis eviction policy data loss testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Redis eviction policy data loss testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify each eviction policy preserves critical keys and exposes pressure signals?',
  intentBoundary: 'Owns maxmemory eviction semantics, not TTL expiry or cached-null ambiguity.',
  secondaryKeywords: [
    'allkeys-lru behavior',
    'noeviction write failure',
    'critical cache key loss',
    'Redis eviction policy data loss testing checklist',
    'Redis eviction policy data loss testing CI strategy',
    'Redis eviction policy data loss testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/redis-testing/SKILL.md',
    'seed-skills/data-integrity-testing/SKILL.md',
    'packages/web/src/app/blog/posts/database-testing-automation-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/database-testing-automation-guide',
    '/blog/data-contract-testing-guide-2026',
    '/blog/event-driven-architecture-testing-guide',
    '/blog/api-testing-best-practices-guide',
  ],
  relatedSlugs: [
    'database-testing-automation-guide',
    'data-contract-testing-guide-2026',
    'event-driven-architecture-testing-guide',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://redis.io/docs/latest/develop/reference/eviction/',
    'https://redis.io/docs/latest/develop/data-types/streams/',
  ],
  codeExamples: [
    {
      title: 'Build the Redis eviction policy data loss testing baseline',
      language: 'typescript',
      path: 'seed-skills/redis-testing/SKILL.md',
      snippet:
        '// Example redis pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/data-integrity-testing/SKILL.md',
      snippet: '',
    },
  ],
});
