import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 943,
  slug: 'locale-dependent-snapshot-stabilization',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Locale Dependent Snapshot Stabilization',
  description:
    'Locale dependent snapshot stabilization: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Locale dependent snapshot stabilization',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Locale dependent snapshot stabilization, specifically locale, collation, number, and date formatting controls?',
  intentBoundary:
    'Owns locale, collation, number, and date formatting controls. It excludes visual browser snapshots, generic snapshot introductions, or AI golden datasets, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Locale dependent snapshot stabilization example',
    'Locale dependent snapshot stabilization test cases',
    'Locale dependent snapshot stabilization failure modes',
    'how to verify locale dependent snapshot stabilization',
    'snapshot testing locale, collation, number, and date formatting controls',
    'Locale dependent snapshot stabilization best practices',
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
      title: 'Build the Locale dependent snapshot stabilization baseline',
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
