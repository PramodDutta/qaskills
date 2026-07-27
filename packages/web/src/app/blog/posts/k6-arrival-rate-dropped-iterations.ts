import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 981,
  slug: 'k6-arrival-rate-dropped-iterations',
  campaignCluster: 'frameworks-qa-practice',
  title: 'K6 Arrival Rate Dropped Iterations',
  description:
    'k6 arrival rate dropped iterations: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'k6 arrival rate dropped iterations',
  intent: 'troubleshooting',
  coreQuestion:
    'Why does k6 report dropped iterations, and how can QA separate insufficient VUs from a deliberately saturated system?',
  intentBoundary:
    'The nearest page covers a broader k6 workflow. This candidate owns dropped-iteration diagnosis for open-model executors.',
  secondaryKeywords: [
    'k6 dropped iterations cause',
    'arrival rate insufficient VUs',
    'k6 preAllocatedVUs sizing',
    'load generator capacity test',
    'dropped iteration threshold',
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
      title: 'Build the k6 arrival rate dropped iterations baseline',
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
