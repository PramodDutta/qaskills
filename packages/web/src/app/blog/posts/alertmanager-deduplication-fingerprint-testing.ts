import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 788,
  slug: 'alertmanager-deduplication-fingerprint-testing',
  campaignCluster: 'system-quality',
  title: 'Alertmanager Deduplication Fingerprint Testing',
  description:
    'Alertmanager deduplication fingerprint testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Alertmanager deduplication fingerprint testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify label changes group, split, and repeat notifications as intended?',
  intentBoundary: 'Owns Alertmanager fingerprint and grouping behavior, not event idempotency.',
  secondaryKeywords: [
    'alert label fingerprint',
    'group_wait notification',
    'repeat_interval dedupe',
    'Alertmanager deduplication fingerprint testing checklist',
    'Alertmanager deduplication fingerprint testing CI strategy',
    'Alertmanager deduplication fingerprint testing failure diagnosis',
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
    'https://prometheus.io/docs/alerting/latest/alertmanager/',
    'https://prometheus.io/docs/alerting/latest/configuration/',
  ],
  codeExamples: [
    {
      title: 'Build the Alertmanager deduplication fingerprint testing baseline',
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
