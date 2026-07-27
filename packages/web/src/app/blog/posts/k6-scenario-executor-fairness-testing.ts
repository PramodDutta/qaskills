import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 761,
  slug: 'k6-scenario-executor-fairness-testing',
  campaignCluster: 'system-quality',
  title: 'K6 Scenario Executor Fairness Testing',
  description:
    'k6 scenario executor fairness testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'k6 scenario executor fairness testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify concurrent k6 scenarios receive intended VU and iteration capacity?',
  intentBoundary:
    'Owns resource fairness between scenarios, not single-scenario executor selection.',
  secondaryKeywords: [
    'shared VU starvation',
    'parallel scenario capacity',
    'executor allocation drift',
    'k6 scenario executor fairness testing checklist',
    'k6 scenario executor fairness testing CI strategy',
    'k6 scenario executor fairness testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/k6-performance/SKILL.md',
    'seed-skills/performance-test-scenario-generator/SKILL.md',
    'packages/web/src/app/blog/posts/load-testing-beginners-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/performance-testing',
    '/blog/load-testing-beginners-guide',
    '/blog/chaos-engineering-resilience-testing',
    '/blog/api-testing-best-practices-guide',
    '/blog/performance-testing-complete-guide',
  ],
  relatedSlugs: [
    'load-testing-beginners-guide',
    'chaos-engineering-resilience-testing',
    'api-testing-best-practices-guide',
    'performance-testing-complete-guide',
  ],
  sources: [
    'https://grafana.com/docs/k6/latest/using-k6/scenarios/',
    'https://grafana.com/docs/k6/latest/using-k6/metrics/',
  ],
  codeExamples: [
    {
      title: 'Build the k6 scenario executor fairness testing baseline',
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
