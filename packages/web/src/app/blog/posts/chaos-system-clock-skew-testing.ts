import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 777,
  slug: 'chaos-system-clock-skew-testing',
  campaignCluster: 'system-quality',
  title: 'Chaos System Clock Skew Testing',
  description:
    'chaos system clock skew testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'chaos system clock skew testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams shift system time safely and verify leases, tokens, logs, and scheduled work?',
  intentBoundary:
    'Owns host clock faults, not user timezone formatting or distributed load-worker drift.',
  secondaryKeywords: [
    'expired token clock drift',
    'lease timestamp skew',
    'scheduled task time jump',
    'chaos system clock skew testing checklist',
    'chaos system clock skew testing CI strategy',
    'chaos system clock skew testing failure diagnosis',
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
      title: 'Build the chaos system clock skew testing baseline',
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
