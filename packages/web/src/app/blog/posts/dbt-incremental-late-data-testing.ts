import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 862,
  slug: 'dbt-incremental-late-data-testing',
  campaignCluster: 'system-quality',
  title: 'Dbt Incremental Late Data Testing',
  description:
    'dbt incremental late data testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'dbt incremental late data testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify lookback windows capture late rows without duplicating transformed data?',
  intentBoundary:
    'Owns dbt incremental late arrivals, not stream watermarks or full-refresh correctness.',
  secondaryKeywords: [
    'incremental lookback window',
    'unique_key merge',
    'late arriving fact',
    'dbt incremental late data testing checklist',
    'dbt incremental late data testing CI strategy',
    'dbt incremental late data testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/data-pipeline-testing/SKILL.md',
    'seed-skills/pipeline-testing/SKILL.md',
    'packages/web/src/app/blog/posts/metamorphic-testing-data-pipelines-guide.ts',
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
    'https://docs.getdbt.com/docs/build/incremental-models',
    'https://docs.getdbt.com/docs/build/data-tests',
  ],
  codeExamples: [
    {
      title: 'Build the dbt incremental late data testing baseline',
      language: 'python',
      path: 'seed-skills/data-pipeline-testing/SKILL.md',
      snippet:
        '// Example data-pipeline pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'yaml',
      path: 'seed-skills/pipeline-testing/SKILL.md',
      snippet: '',
    },
  ],
});
