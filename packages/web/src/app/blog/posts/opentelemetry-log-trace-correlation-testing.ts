import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 763,
  slug: 'opentelemetry-log-trace-correlation-testing',
  campaignCluster: 'system-quality',
  title: 'Opentelemetry Log Trace Correlation Testing',
  description:
    'OpenTelemetry log trace correlation testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'OpenTelemetry log trace correlation testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify logs carry valid trace and span identifiers across async execution?',
  intentBoundary: 'Owns log-record correlation fields, not full trace-context propagation.',
  secondaryKeywords: [
    'trace_id log field',
    'async logger context',
    'orphan log detection',
    'OpenTelemetry log trace correlation testing checklist',
    'OpenTelemetry log trace correlation testing CI strategy',
    'OpenTelemetry log trace correlation testing failure diagnosis',
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
      title: 'Build the OpenTelemetry log trace correlation testing baseline',
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
