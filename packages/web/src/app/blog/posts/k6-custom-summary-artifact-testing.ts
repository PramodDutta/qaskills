import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 912,
  slug: 'k6-custom-summary-artifact-testing',
  campaignCluster: 'frameworks-qa-practice',
  title: 'K6 Custom Summary Artifact Testing',
  description:
    'k6 custom summary artifact testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'k6 custom summary artifact testing',
  intent: 'how-to',
  coreQuestion:
    'How can handleSummary generate trustworthy JSON, HTML, and text artifacts while preserving a failing k6 exit status?',
  intentBoundary:
    'The nearest page covers a broader k6 workflow. This candidate owns local custom-summary artifacts and failure preservation.',
  secondaryKeywords: [
    'k6 handleSummary artifact',
    'custom k6 JSON report',
    'k6 summary CI upload',
    'multiple summary outputs k6',
    'k6 report failure status',
  ],
  repoEvidence: [
    'seed-skills/k6-performance/SKILL.md',
    'seed-skills/performance-test-scenario-generator/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/performance-testing',
    '/blog/k6-load-testing-guide-2026',
    '/blog/k6-load-testing-p95-p99-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
  ],
  relatedSlugs: [
    'k6-load-testing-guide-2026',
    'k6-load-testing-p95-p99-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
  ],
  sources: [
    'https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/dropped-iterations/',
    'https://grafana.com/docs/k6/latest/using-k6/thresholds/',
    'https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/',
    'https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/graceful-stop/',
  ],
  codeExamples: [
    {
      title: 'Build the k6 custom summary artifact testing baseline',
      language: 'text',
      path: 'seed-skills/k6-performance/SKILL.md',
      snippet:
        'k6/\n  scripts/\n    smoke-test.js\n    load-test.js\n    stress-test.js\n    spike-test.js\n    soak-test.js\n  scenarios/\n    api-scenarios.js\n    user-flows.js\n  utils/\n    helpers.js\n    auth.js\n    data-generators.js\n  data/\n    users.csv\n    payloads.json\n  thresholds/',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/performance-test-scenario-generator/SKILL.md',
      snippet:
        'stress-test.ts\n       spike-test.ts\n       soak-test.ts\n       breakpoint-test.ts\n    helpers/\n       auth.ts\n       data-generators.ts\n       correlation.ts\n       think-time.ts\n    thresholds/\n       sla-definitions.ts\n    data/\n        users.csv\n        products.json\n        search-terms.csv\n jmeter/\n    test-plans/\n       load-test.jmx',
    },
  ],
});
