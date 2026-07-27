import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 939,
  slug: 'database-deferrable-constraint-testing',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Database Deferrable Constraint Testing',
  description:
    'database deferrable constraint testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'database deferrable constraint testing',
  intent: 'how-to',
  coreQuestion:
    'How can integration tests prove deferred foreign keys and unique constraints fail at the intended transaction boundary?',
  intentBoundary:
    'The nearest page covers a broader database workflow. This candidate owns deferred constraint timing at statement and commit boundaries.',
  secondaryKeywords: [
    'Postgres deferrable constraint test',
    'SET CONSTRAINTS integration test',
    'deferred foreign key commit failure',
    'deferrable unique constraint QA',
    'transaction boundary constraint check',
  ],
  repoEvidence: [
    'seed-skills/database-migration-testing/SKILL.md',
    'seed-skills/end-to-end-database/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/database-testing-automation-guide',
    '/blog/postgres-migration-testing-guide',
    '/blog/testcontainers-go-database-testing-guide',
    '/blog/test-automation-framework-architecture',
  ],
  relatedSlugs: [
    'database-testing-automation-guide',
    'postgres-migration-testing-guide',
    'testcontainers-go-database-testing-guide',
    'test-automation-framework-architecture',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
    'https://www.postgresql.org/docs/current/sql-set-constraints.html',
    'https://www.postgresql.org/docs/current/indexes-partial.html',
  ],
  codeExamples: [
    {
      title: 'Build the database deferrable constraint testing baseline',
      language: 'python',
      path: 'seed-skills/database-migration-testing/SKILL.md',
      snippet:
        '// Example migration pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/end-to-end-database/SKILL.md',
      snippet: '',
    },
  ],
});
