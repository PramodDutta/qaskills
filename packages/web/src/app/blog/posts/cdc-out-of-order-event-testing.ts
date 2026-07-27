import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 851,
  slug: 'cdc-out-of-order-event-testing',
  campaignCluster: 'system-quality',
  title: 'Cdc Out Of Order Event Testing',
  description:
    'CDC out of order event testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'CDC out of order event testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify consumers resolve late change events using source positions safely?',
  intentBoundary: 'Owns source-order reconciliation, not message queue delivery order generally.',
  secondaryKeywords: [
    'LSN event ordering',
    'late CDC update',
    'source position conflict',
    'CDC out of order event testing checklist',
    'CDC out of order event testing CI strategy',
    'CDC out of order event testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/data-pipeline-testing/SKILL.md',
    'seed-skills/event-sourcing-testing/SKILL.md',
    'packages/web/src/app/blog/posts/data-contract-testing-guide-2026.ts',
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
    'https://debezium.io/documentation/reference/stable/connectors/postgresql.html',
    'https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html',
  ],
  codeExamples: [
    {
      title: 'Build the CDC out of order event testing baseline',
      language: 'python',
      path: 'seed-skills/data-pipeline-testing/SKILL.md',
      snippet:
        '// Example data-pipeline pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/event-sourcing-testing/SKILL.md',
      snippet: '',
    },
  ],
});
