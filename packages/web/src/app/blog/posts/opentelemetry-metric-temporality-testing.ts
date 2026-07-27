import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 834,
  slug: 'opentelemetry-metric-temporality-testing',
  campaignCluster: 'system-quality',
  title: 'Opentelemetry Metric Temporality Testing',
  description:
    'OpenTelemetry metric temporality testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'OpenTelemetry metric temporality testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify delta and cumulative exporters preserve correct reset semantics?',
  intentBoundary: 'Owns metric temporality conversion, not Prometheus counter alert logic.',
  secondaryKeywords: [
    'delta cumulative conversion',
    'start time reset',
    'metric exporter temporality',
    'OpenTelemetry metric temporality testing checklist',
    'OpenTelemetry metric temporality testing CI strategy',
    'OpenTelemetry metric temporality testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/opentelemetry-testing/SKILL.md',
    'seed-skills/distributed-tracing-testing/SKILL.md',
    'packages/web/src/app/blog/posts/trace-based-testing-opentelemetry-2026.ts',
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
    'https://opentelemetry.io/docs/specs/otel/metrics/',
    'https://opentelemetry.io/docs/specs/otel/logs/',
  ],
  codeExamples: [
    {
      title: 'Build the OpenTelemetry metric temporality testing baseline',
      language: 'python',
      path: 'seed-skills/opentelemetry-testing/SKILL.md',
      snippet:
        '// Example opentelemetry pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/distributed-tracing-testing/SKILL.md',
      snippet: '',
    },
  ],
});
