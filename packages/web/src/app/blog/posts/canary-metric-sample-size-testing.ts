import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 756,
  slug: 'canary-metric-sample-size-testing',
  campaignCluster: 'system-quality',
  title: 'Canary Metric Sample Size Testing',
  description:
    'canary metric sample size testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'canary metric sample size testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify canary decisions wait for enough traffic and representative events?',
  intentBoundary:
    'Owns sample sufficiency, not canary metric selection or generic A/B significance.',
  secondaryKeywords: [
    'minimum canary requests',
    'low traffic release gate',
    'representative canary cohort',
    'canary metric sample size testing checklist',
    'canary metric sample size testing CI strategy',
    'canary metric sample size testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/canary-deployment-testing/SKILL.md',
    'seed-skills/synthetic-monitoring/SKILL.md',
    'packages/web/src/app/blog/posts/incident-driven-test-creation-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/testing-in-production-strategies',
    '/blog/incident-driven-test-creation-guide',
    '/blog/microservices-testing-strategies',
    '/blog/api-testing-best-practices-guide',
  ],
  relatedSlugs: [
    'testing-in-production-strategies',
    'incident-driven-test-creation-guide',
    'microservices-testing-strategies',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://sre.google/workbook/canarying-releases/',
    'https://sre.google/workbook/monitoring/',
  ],
  codeExamples: [
    {
      title: 'Build the canary metric sample size testing baseline',
      language: 'python',
      path: 'seed-skills/canary-deployment-testing/SKILL.md',
      snippet:
        '// Example canary pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/synthetic-monitoring/SKILL.md',
      snippet: '',
    },
  ],
});
