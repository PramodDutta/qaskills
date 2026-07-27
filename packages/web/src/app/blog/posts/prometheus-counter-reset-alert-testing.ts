import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 836,
  slug: 'prometheus-counter-reset-alert-testing',
  campaignCluster: 'system-quality',
  title: 'Prometheus Counter Reset Alert Testing',
  description:
    'Prometheus counter reset alert testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Prometheus counter reset alert testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify restart resets do not create false rates or hide real failures?',
  intentBoundary:
    'Owns counter reset behavior in alert expressions, not application restart testing.',
  secondaryKeywords: [
    'rate after counter reset',
    'false alert spike',
    'process restart metric',
    'Prometheus counter reset alert testing checklist',
    'Prometheus counter reset alert testing CI strategy',
    'Prometheus counter reset alert testing failure diagnosis',
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
    'https://prometheus.io/docs/practices/instrumentation/',
    'https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/',
  ],
  codeExamples: [
    {
      title: 'Build the Prometheus counter reset alert testing baseline',
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
