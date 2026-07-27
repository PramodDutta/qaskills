import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 795,
  slug: 'data-pipeline-watermark-boundary-testing',
  campaignCluster: 'system-quality',
  title: 'Data Pipeline Watermark Boundary Testing',
  description:
    'data pipeline watermark boundary testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'data pipeline watermark boundary testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify events exactly before, at, and after watermarks follow lateness policy?',
  intentBoundary: 'Owns event-time watermark edges, not batch lookback windows or clock display.',
  secondaryKeywords: [
    'allowed lateness boundary',
    'event time window close',
    'late data side output',
    'data pipeline watermark boundary testing checklist',
    'data pipeline watermark boundary testing CI strategy',
    'data pipeline watermark boundary testing failure diagnosis',
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
    'https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/',
    'https://beam.apache.org/documentation/programming-guide/#watermarks-and-late-data',
  ],
  codeExamples: [
    {
      title: 'Build the data pipeline watermark boundary testing baseline',
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
