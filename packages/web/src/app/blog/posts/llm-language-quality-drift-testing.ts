import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 653,
  slug: 'llm-language-quality-drift-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Language Quality Drift Testing',
  description:
    'LLM language quality drift testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM language quality drift testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm language quality drift so quality changes are tracked separately for each supported language and task slice?',
  intentBoundary:
    'Cross-release language quality drift only, not multilingual safety or RAG retrieval.',
  secondaryKeywords: [
    'LLM language quality drift test cases',
    'how to test llm language quality drift',
    'LLM language quality drift regression checks',
    'LLM language quality drift CI validation',
    'LLM language quality drift failure diagnosis',
    'LLM language quality drift QA checklist',
  ],
  repoEvidence: [
    'seed-skills/ai-model-testing/SKILL.md',
    'seed-skills/rag-regression-testing/SKILL.md',
    'packages/web/src/app/blog/posts/llm-non-determinism-flaky-eval-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/llm-non-determinism-flaky-eval-guide-2026',
    '/blog/llm-regression-testing-guide-2026',
    '/blog/llm-evaluation-ci-cd-quality-gates',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'llm-non-determinism-flaky-eval-guide-2026',
    'llm-regression-testing-guide-2026',
    'llm-evaluation-ci-cd-quality-gates',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://www.nist.gov/itl/ai-risk-management-framework',
    'https://platform.openai.com/docs/models',
    'https://platform.openai.com/docs/guides/evals',
  ],
  codeExamples: [
    {
      title: 'Build the LLM language quality drift testing baseline',
      language: 'python',
      path: 'seed-skills/ai-model-testing/SKILL.md',
      snippet:
        '// Example ai pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/rag-regression-testing/SKILL.md',
      snippet: '.github/\n  workflows/\n    rag-regression.yml',
    },
  ],
});
