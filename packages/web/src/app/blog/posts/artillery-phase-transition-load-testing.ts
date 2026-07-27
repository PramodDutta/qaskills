import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 816,
  slug: 'artillery-phase-transition-load-testing',
  campaignCluster: 'system-quality',
  title: 'Artillery Phase Transition Load Testing',
  description:
    'Artillery phase transition load testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Artillery phase transition load testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify arrival rates and virtual users change cleanly across adjacent Artillery phases?',
  intentBoundary: 'Owns phase-boundary behavior, not whole-script configuration.',
  secondaryKeywords: [
    'rampTo phase boundary',
    'arrival count handoff',
    'phase duration accuracy',
    'Artillery phase transition load testing checklist',
    'Artillery phase transition load testing CI strategy',
    'Artillery phase transition load testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/artillery-load-testing/SKILL.md',
    'seed-skills/performance-budget-testing/SKILL.md',
    'packages/web/src/app/blog/posts/artillery-load-testing-nodejs-guide.ts',
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
    'https://www.artillery.io/docs/reference/test-script',
    'https://www.artillery.io/docs/reference/engines/http',
  ],
  codeExamples: [
    {
      title: 'Build the Artillery phase transition load testing baseline',
      language: 'yaml',
      path: 'seed-skills/artillery-load-testing/SKILL.md',
      snippet:
        '// Example artillery pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/performance-budget-testing/SKILL.md',
      snippet: '',
    },
  ],
});
