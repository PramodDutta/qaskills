import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 772,
  slug: 'jmeter-backend-listener-backpressure-testing',
  campaignCluster: 'system-quality',
  title: 'Jmeter Backend Listener Backpressure Testing',
  description:
    'JMeter backend listener backpressure testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'JMeter backend listener backpressure testing',
  intent: 'troubleshooting',
  coreQuestion:
    'How can QA teams detect when metrics export queues distort JMeter timing or lose samples?',
  intentBoundary: 'Owns backend-listener pressure, not dashboard visualization setup.',
  secondaryKeywords: [
    'metrics sender queue',
    'InfluxDB listener lag',
    'sample export loss',
    'JMeter backend listener backpressure testing checklist',
    'JMeter backend listener backpressure testing CI strategy',
    'JMeter backend listener backpressure testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/jmeter-load/SKILL.md',
    'seed-skills/performance-test-scenario-generator/SKILL.md',
    'packages/web/src/app/blog/posts/jmeter-distributed-load-testing-complete-guide.ts',
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
    'https://jmeter.apache.org/usermanual/component_reference.html',
    'https://jmeter.apache.org/usermanual/best-practices.html',
  ],
  codeExamples: [
    {
      title: 'Build the JMeter backend listener backpressure testing baseline',
      language: 'text',
      path: 'seed-skills/jmeter-load/SKILL.md',
      snippet:
        'jmeter/\n  test-plans/\n    smoke-test.jmx\n    load-test.jmx\n    stress-test.jmx\n    api-test.jmx\n  data/\n    users.csv\n    products.csv\n    payloads/\n      create-order.json\n  lib/\n    custom-plugins.jar\n  scripts/\n    run-load-test.sh\n    generate-report.sh\n  results/\n    .gitkeep',
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
