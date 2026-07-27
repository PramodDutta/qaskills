import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 759,
  slug: 'jmeter-connection-pool-saturation-testing',
  campaignCluster: 'system-quality',
  title: 'Jmeter Connection Pool Saturation Testing',
  description:
    'JMeter connection pool saturation testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'JMeter connection pool saturation testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams separate target saturation from JMeter client connection-pool exhaustion?',
  intentBoundary: 'Owns load-generator pool limits, not server database pool capacity.',
  secondaryKeywords: [
    'JMeter socket pool limit',
    'client-side connection queue',
    'load generator bottleneck',
    'JMeter connection pool saturation testing checklist',
    'JMeter connection pool saturation testing CI strategy',
    'JMeter connection pool saturation testing failure diagnosis',
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
      title: 'Build the JMeter connection pool saturation testing baseline',
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
