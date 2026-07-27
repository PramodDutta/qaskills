import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 700,
  slug: 'llm-stop-sequence-drift-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Stop Sequence Drift Testing',
  description:
    'LLM stop sequence drift testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM stop sequence drift testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm stop sequence drift so configured stop markers still terminate at the intended boundary without suffix leakage or early truncation?',
  intentBoundary:
    'Release drift in stop-sequence behavior only, not general response-length or format drift.',
  secondaryKeywords: [
    'LLM stop sequence drift test cases',
    'how to test llm stop sequence drift',
    'LLM stop sequence drift regression checks',
    'LLM stop sequence drift CI validation',
    'LLM stop sequence drift failure diagnosis',
    'LLM stop sequence drift QA checklist',
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
      title: 'Build the LLM stop sequence drift testing baseline',
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
