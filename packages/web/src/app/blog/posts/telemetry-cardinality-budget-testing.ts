import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 864,
  slug: 'telemetry-cardinality-budget-testing',
  campaignCluster: 'system-quality',
  title: 'Telemetry Cardinality Budget Testing',
  description:
    'telemetry cardinality budget testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'telemetry cardinality budget testing',
  intent: 'how-to',
  coreQuestion: 'How can QA teams verify dimensions stay bounded before metrics backends overload?',
  intentBoundary:
    'Owns label and attribute cardinality, not traffic volume or storage retention alone.',
  secondaryKeywords: [
    'high cardinality label',
    'attribute allowlist',
    'time series budget',
    'telemetry cardinality budget testing checklist',
    'telemetry cardinality budget testing CI strategy',
    'telemetry cardinality budget testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/alerting-testing/SKILL.md',
    'seed-skills/test-observability/SKILL.md',
    'packages/web/src/app/blog/posts/observability-driven-testing-guide.ts',
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
      title: 'Build the telemetry cardinality budget testing baseline',
      language: 'python',
      path: 'seed-skills/alerting-testing/SKILL.md',
      snippet:
        '// Example alerting pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/test-observability/SKILL.md',
      snippet: '',
    },
  ],
});
