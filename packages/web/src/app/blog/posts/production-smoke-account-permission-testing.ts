import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 810,
  slug: 'production-smoke-account-permission-testing',
  campaignCluster: 'system-quality',
  title: 'Production Smoke Account Permission Testing',
  description:
    'production smoke account permission testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'production smoke account permission testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify smoke-test identities have enough access to test but cannot harm real data?',
  intentBoundary: 'Owns least-privilege smoke accounts, not authentication flow coverage broadly.',
  secondaryKeywords: [
    'smoke service account',
    'production test permission',
    'restricted synthetic identity',
    'production smoke account permission testing checklist',
    'production smoke account permission testing CI strategy',
    'production smoke account permission testing failure diagnosis',
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
      title: 'Build the production smoke account permission testing baseline',
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
