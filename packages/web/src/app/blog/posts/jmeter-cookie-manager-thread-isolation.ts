import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 969,
  slug: 'jmeter-cookie-manager-thread-isolation',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Jmeter Cookie Manager Thread Isolation',
  description:
    'JMeter cookie manager thread isolation: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'JMeter cookie manager thread isolation',
  intent: 'how-to',
  coreQuestion:
    'How can JMeter tests prove Cookie Manager state is isolated per virtual user and not shared across thread groups?',
  intentBoundary:
    'The nearest page covers a broader jmeter workflow. This candidate owns per-thread cookie-jar isolation.',
  secondaryKeywords: [
    'JMeter Cookie Manager isolation',
    'cookie state per thread',
    'JMeter session leakage test',
    'virtual user cookie jar',
    'thread group authentication isolation',
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
      title: 'Build the JMeter cookie manager thread isolation baseline',
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
