import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 857,
  slug: 'redis-cluster-slot-migration-testing',
  campaignCluster: 'system-quality',
  title: 'Redis Cluster Slot Migration Testing',
  description:
    'Redis cluster slot migration testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Redis cluster slot migration testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify reads and writes survive MOVED, ASK, and in-flight slot migration?',
  intentBoundary:
    'Owns Redis Cluster resharding transitions, not ordinary failover or cache outages.',
  secondaryKeywords: [
    'MOVED redirect handling',
    'ASKING migration state',
    'hash slot reshard',
    'Redis cluster slot migration testing checklist',
    'Redis cluster slot migration testing CI strategy',
    'Redis cluster slot migration testing failure diagnosis',
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
    'https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/',
    'https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/',
  ],
  codeExamples: [
    {
      title: 'Build the Redis cluster slot migration testing baseline',
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
