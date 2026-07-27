import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 837,
  slug: 'opentelemetry-span-link-causality-testing',
  campaignCluster: 'system-quality',
  title: 'Opentelemetry Span Link Causality Testing',
  description:
    'OpenTelemetry span link causality testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'OpenTelemetry span link causality testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify asynchronous work links to every causal parent without false hierarchy?',
  intentBoundary: 'Owns span links for fan-in and queues, not ordinary parent-child nesting.',
  secondaryKeywords: [
    'consumer span link',
    'batch causal parents',
    'linked trace validation',
    'OpenTelemetry span link causality testing checklist',
    'OpenTelemetry span link causality testing CI strategy',
    'OpenTelemetry span link causality testing failure diagnosis',
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
    'https://opentelemetry.io/docs/specs/otel/trace/',
    'https://www.w3.org/TR/trace-context/',
  ],
  codeExamples: [
    {
      title: 'Build the OpenTelemetry span link causality testing baseline',
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
