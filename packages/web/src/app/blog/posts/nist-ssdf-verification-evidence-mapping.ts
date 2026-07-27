import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 962,
  slug: 'nist-ssdf-verification-evidence-mapping',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Nist Ssdf Verification Evidence Mapping',
  description:
    'NIST SSDF verification evidence mapping: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'NIST SSDF verification evidence mapping',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify NIST SSDF verification evidence mapping, specifically mapping verification artifacts to SSDF practice evidence?',
  intentBoundary:
    'Owns mapping verification artifacts to SSDF practice evidence. It excludes infrastructure configuration, certification claims, or generic security testing, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'NIST SSDF verification evidence mapping example',
    'NIST SSDF verification evidence mapping test cases',
    'NIST SSDF verification evidence mapping failure modes',
    'how to verify nist ssdf verification evidence mapping',
    'NIST SSDF verification mapping verification artifacts to SSDF practice evidence',
    'NIST SSDF verification evidence mapping best practices',
  ],
  repoEvidence: [
    'seed-skills/compliance-as-code/SKILL.md',
    'seed-skills/code-review-excellence/SKILL.md',
    'packages/web/src/app/blog/posts/code-review-qa-testing-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories',
    '/blog/code-review-qa-testing-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'code-review-qa-testing-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://csrc.nist.gov/pubs/sp/800/218/final',
    'https://csrc.nist.gov/pubs/ir/8397/final',
  ],
  codeExamples: [
    {
      title: 'Build the NIST SSDF verification evidence mapping baseline',
      language: 'python',
      path: 'seed-skills/compliance-as-code/SKILL.md',
      snippet:
        '// Example compliance pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'markdown',
      path: 'seed-skills/code-review-excellence/SKILL.md',
      snippet: '',
    },
  ],
});
