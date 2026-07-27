import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 853,
  slug: 'chaos-packet-corruption-recovery-testing',
  campaignCluster: 'system-quality',
  title: 'Chaos Packet Corruption Recovery Testing',
  description:
    'chaos packet corruption recovery testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'chaos packet corruption recovery testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams inject bounded packet corruption and verify protocol detection plus recovery?',
  intentBoundary: 'Owns corrupted network payload recovery, not delay, loss, or partition testing.',
  secondaryKeywords: [
    'checksum failure recovery',
    'corrupted response retry',
    'packet integrity fault',
    'chaos packet corruption recovery testing checklist',
    'chaos packet corruption recovery testing CI strategy',
    'chaos packet corruption recovery testing failure diagnosis',
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
      title: 'Build the chaos packet corruption recovery testing baseline',
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
