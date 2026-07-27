import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 908,
  slug: 'golden-file-line-ending-portability',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Golden File Line Ending Portability',
  description:
    'Golden file line ending portability: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Golden file line ending portability',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Golden file line ending portability, specifically LF and CRLF normalization without hiding content changes?',
  intentBoundary:
    'Owns LF and CRLF normalization without hiding content changes. It excludes visual browser snapshots, generic snapshot introductions, or AI golden datasets, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Golden file line ending portability example',
    'Golden file line ending portability test cases',
    'Golden file line ending portability failure modes',
    'how to verify golden file line ending portability',
    'snapshot testing LF and CRLF normalization without hiding content changes',
    'Golden file line ending portability best practices',
  ],
  repoEvidence: [
    'seed-skills/snapshot-testing/SKILL.md',
    'seed-skills/golden-file-testing/SKILL.md',
    'packages/web/src/app/blog/posts/snapshot-testing-governance-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/snapshot-testing-governance-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'snapshot-testing-governance-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://jestjs.io/docs/snapshot-testing',
    'https://vitest.dev/guide/snapshot.html',
    'https://approvaltests.com/',
  ],
  codeExamples: [
    {
      title: 'Build the Golden file line ending portability baseline',
      language: 'typescript',
      path: 'seed-skills/snapshot-testing/SKILL.md',
      snippet:
        '// Example snapshot pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'go',
      path: 'seed-skills/golden-file-testing/SKILL.md',
      snippet: '',
    },
  ],
});
