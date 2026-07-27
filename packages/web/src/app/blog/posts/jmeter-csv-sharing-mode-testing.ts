import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 971,
  slug: 'jmeter-csv-sharing-mode-testing',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Jmeter Csv Sharing Mode Testing',
  description:
    'JMeter CSV sharing mode testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'JMeter CSV sharing mode testing',
  intent: 'how-to',
  coreQuestion:
    'How do JMeter CSV sharing modes distribute rows across threads, thread groups, and remote engines?',
  intentBoundary:
    'The nearest page covers a broader jmeter workflow. This candidate owns row-allocation assertions for every CSV sharing mode.',
  secondaryKeywords: [
    'JMeter CSV sharing mode',
    'CSV Data Set Config threads',
    'JMeter unique data rows',
    'shareMode identifier JMeter',
    'distributed CSV row allocation',
  ],
  repoEvidence: [
    'seed-skills/jmeter-load/SKILL.md',
    'seed-skills/performance-test-scenario-generator/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/performance-testing',
    '/blog/jmeter-distributed-load-testing-complete-guide',
    '/blog/jmeter-response-assertion-jmx-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
  ],
  relatedSlugs: [
    'jmeter-distributed-load-testing-complete-guide',
    'jmeter-response-assertion-jmx-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
  ],
  sources: [
    'https://jmeter.apache.org/usermanual/component_reference.html',
    'https://jmeter.apache.org/usermanual/remote-test.html',
    'https://jmeter.apache.org/usermanual/best-practices.html',
  ],
  codeExamples: [
    {
      title: 'Build the JMeter CSV sharing mode testing baseline',
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
