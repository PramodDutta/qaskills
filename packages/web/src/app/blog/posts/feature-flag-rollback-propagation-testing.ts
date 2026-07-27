import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 821,
  slug: 'feature-flag-rollback-propagation-testing',
  campaignCluster: 'system-quality',
  title: 'Feature Flag Rollback Propagation Testing',
  description:
    'feature flag rollback propagation testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'feature flag rollback propagation testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify emergency flag changes reach every service within a measured deadline?',
  intentBoundary:
    'Owns flag propagation during rollback, not general deployment rollback automation.',
  secondaryKeywords: [
    'flag cache invalidation',
    'emergency disable latency',
    'stale flag instance',
    'feature flag rollback propagation testing checklist',
    'feature flag rollback propagation testing CI strategy',
    'feature flag rollback propagation testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/testing-in-production/SKILL.md',
    'seed-skills/production-smoke-suite/SKILL.md',
    'packages/web/src/app/blog/posts/testing-in-production-strategies.ts',
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
    'https://openfeature.dev/specification/',
    'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-back-a-deployment',
  ],
  codeExamples: [
    {
      title: 'Build the feature flag rollback propagation testing baseline',
      language: 'typescript',
      path: 'seed-skills/testing-in-production/SKILL.md',
      snippet:
        '// Example production-testing pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/production-smoke-suite/SKILL.md',
      snippet:
        'smoke-config.ts\n      http-client.ts\n      retry.ts\n      assertions.ts\n      alerting.ts\n    fixtures/\n      smoke-accounts.ts\n  playwright.config.ts\n  package.json\n  tsconfig.json\n  Dockerfile',
    },
  ],
});
