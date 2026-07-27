import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 859,
  slug: 'shadow-traffic-side-effect-isolation',
  campaignCluster: 'system-quality',
  title: 'Shadow Traffic Side Effect Isolation',
  description:
    'shadow traffic side effect isolation: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'shadow traffic side effect isolation',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify mirrored production requests cannot write, notify, or charge twice?',
  intentBoundary: 'Owns side-effect suppression for shadow traffic, not request replay generation.',
  secondaryKeywords: [
    'mirrored write prevention',
    'shadow payment isolation',
    'duplicate notification guard',
    'shadow traffic side effect isolation checklist',
    'shadow traffic side effect isolation CI strategy',
    'shadow traffic side effect isolation failure diagnosis',
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
    'https://sre.google/workbook/canarying-releases/',
    'https://sre.google/workbook/monitoring/',
  ],
  codeExamples: [
    {
      title: 'Build the shadow traffic side effect isolation baseline',
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
