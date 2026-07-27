import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 852,
  slug: 'chaos-dependency-brownout-testing',
  campaignCluster: 'system-quality',
  title: 'Chaos Dependency Brownout Testing',
  description:
    'chaos dependency brownout testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'chaos dependency brownout testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams degrade only part of a dependency and verify fallback plus error-budget behavior?',
  intentBoundary: 'Owns partial quality degradation, not complete dependency outage.',
  secondaryKeywords: [
    'partial dependency failure',
    'slow error mix',
    'degraded service fallback',
    'chaos dependency brownout testing checklist',
    'chaos dependency brownout testing CI strategy',
    'chaos dependency brownout testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/chaos-engineering-advanced/SKILL.md',
    'seed-skills/retry-resilience-testing/SKILL.md',
    'packages/web/src/app/blog/posts/chaos-engineering-resilience-testing.ts',
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
  sources: ['https://principlesofchaos.org/', 'https://chaos-mesh.org/docs/'],
  codeExamples: [
    {
      title: 'Build the chaos dependency brownout testing baseline',
      language: 'python',
      path: 'seed-skills/chaos-engineering-advanced/SKILL.md',
      snippet:
        '// Example chaos-engineering pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/retry-resilience-testing/SKILL.md',
      snippet: '',
    },
  ],
});
