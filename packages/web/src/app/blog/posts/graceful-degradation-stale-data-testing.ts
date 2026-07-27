import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 752,
  slug: 'graceful-degradation-stale-data-testing',
  campaignCluster: 'system-quality',
  title: 'Graceful Degradation Stale Data Testing',
  description:
    'graceful degradation stale data testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'graceful degradation stale data testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify stale responses remain bounded, labeled, and safer than total failure?',
  intentBoundary: 'Owns intentional stale-data service, not ordinary cache-control correctness.',
  secondaryKeywords: [
    'stale-if-error response',
    'data age disclosure',
    'degraded cache fallback',
    'graceful degradation stale data testing checklist',
    'graceful degradation stale data testing CI strategy',
    'graceful degradation stale data testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/retry-resilience-testing/SKILL.md',
    'seed-skills/error-handling-testing/SKILL.md',
    'packages/web/src/app/blog/posts/error-handling-testing-patterns.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/error-handling-testing-patterns',
    '/blog/chaos-engineering-resilience-testing',
    '/blog/microservices-testing-strategies',
    '/blog/api-testing-best-practices-guide',
  ],
  relatedSlugs: [
    'error-handling-testing-patterns',
    'chaos-engineering-resilience-testing',
    'microservices-testing-strategies',
    'api-testing-best-practices-guide',
  ],
  sources: ['https://www.rfc-editor.org/rfc/rfc9111.html', 'https://sre.google/workbook/overload/'],
  codeExamples: [
    {
      title: 'Build the graceful degradation stale data testing baseline',
      language: 'typescript',
      path: 'seed-skills/retry-resilience-testing/SKILL.md',
      snippet:
        '// Example retry pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/error-handling-testing/SKILL.md',
      snippet: '',
    },
  ],
});
