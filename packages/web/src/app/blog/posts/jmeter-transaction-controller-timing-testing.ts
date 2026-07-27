import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 780,
  slug: 'jmeter-transaction-controller-timing-testing',
  campaignCluster: 'system-quality',
  title: 'Jmeter Transaction Controller Timing Testing',
  description:
    'JMeter transaction controller timing testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'JMeter transaction controller timing testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify parent transaction timing includes or excludes nested timers as intended?',
  intentBoundary: 'Owns transaction-controller measurement semantics, not timer execution scope.',
  secondaryKeywords: [
    'generate parent sample',
    'transaction nested timer',
    'controller duration assertion',
    'JMeter transaction controller timing testing checklist',
    'JMeter transaction controller timing testing CI strategy',
    'JMeter transaction controller timing testing failure diagnosis',
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
      title: 'Build the JMeter transaction controller timing testing baseline',
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
