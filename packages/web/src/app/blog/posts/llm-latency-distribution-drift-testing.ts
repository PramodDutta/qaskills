import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 654,
  slug: 'llm-latency-distribution-drift-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Latency Distribution Drift Testing',
  description:
    'LLM latency distribution drift testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM latency distribution drift testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm latency distribution drift so comparable workload slices expose shifts in first-token and completion latency distributions?',
  intentBoundary: 'Release-over-release latency distributions only, not one-request SLA tests.',
  secondaryKeywords: [
    'LLM latency distribution drift test cases',
    'how to test llm latency distribution drift',
    'LLM latency distribution drift regression checks',
    'LLM latency distribution drift CI validation',
    'LLM latency distribution drift failure diagnosis',
    'LLM latency distribution drift QA checklist',
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
      title: 'Build the LLM latency distribution drift testing baseline',
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
