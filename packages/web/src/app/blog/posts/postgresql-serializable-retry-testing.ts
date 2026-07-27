import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 835,
  slug: 'postgresql-serializable-retry-testing',
  campaignCluster: 'system-quality',
  title: 'Postgresql Serializable Retry Testing',
  description:
    'PostgreSQL serializable retry testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'PostgreSQL serializable retry testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify serialization failures retry the whole transaction without duplicate effects?',
  intentBoundary: 'Owns SQLSTATE 40001 recovery, not generic API retries or deadlock handling.',
  secondaryKeywords: [
    'serialization_failure retry',
    'transaction replay safety',
    'serializable anomaly test',
    'PostgreSQL serializable retry testing checklist',
    'PostgreSQL serializable retry testing CI strategy',
    'PostgreSQL serializable retry testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/database-migration-testing/SKILL.md',
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
    'https://www.postgresql.org/docs/current/transaction-iso.html',
    'https://www.postgresql.org/docs/current/runtime-config-locks.html',
  ],
  codeExamples: [
    {
      title: 'Build the PostgreSQL serializable retry testing baseline',
      language: 'python',
      path: 'seed-skills/database-migration-testing/SKILL.md',
      snippet:
        '// Example migration pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/data-integrity-testing/SKILL.md',
      snippet: '',
    },
  ],
});
