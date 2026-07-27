import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 863,
  slug: 'slo-burn-rate-window-testing',
  campaignCluster: 'system-quality',
  title: 'Slo Burn Rate Window Testing',
  description:
    'SLO burn rate window testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'SLO burn rate window testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify fast and slow burn alerts trigger at exact error-budget boundaries?',
  intentBoundary: 'Owns multi-window burn-rate math, not broad SLA monitoring or load thresholds.',
  secondaryKeywords: [
    'multiwindow burn rate',
    'error budget alert',
    'SLO threshold boundary',
    'SLO burn rate window testing checklist',
    'SLO burn rate window testing CI strategy',
    'SLO burn rate window testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/sla-testing/SKILL.md',
    'seed-skills/alerting-testing/SKILL.md',
    'packages/web/src/app/blog/posts/shift-right-testing-observability-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/observability-driven-testing-guide',
    '/blog/trace-based-testing-opentelemetry-2026',
    '/blog/shift-right-testing-observability-guide-2026',
    '/blog/api-testing-best-practices-guide',
  ],
  relatedSlugs: [
    'observability-driven-testing-guide',
    'trace-based-testing-opentelemetry-2026',
    'shift-right-testing-observability-guide-2026',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://sre.google/workbook/alerting-on-slos/',
    'https://sre.google/workbook/implementing-slos/',
  ],
  codeExamples: [
    {
      title: 'Build the SLO burn rate window testing baseline',
      language: 'python',
      path: 'seed-skills/sla-testing/SKILL.md',
      snippet:
        '// Example sla pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/alerting-testing/SKILL.md',
      snippet: '',
    },
  ],
});
