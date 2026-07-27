import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 692,
  slug: 'llm-context-utilization-drift-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Context Utilization Drift Testing',
  description:
    'LLM context utilization drift testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM context utilization drift testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm context utilization drift so the model continues using evidence placed at controlled positions across the supported context?',
  intentBoundary:
    'Release drift in evidence use by context position only, not one-time needle benchmarks.',
  secondaryKeywords: [
    'LLM context utilization drift test cases',
    'how to test llm context utilization drift',
    'LLM context utilization drift regression checks',
    'LLM context utilization drift CI validation',
    'LLM context utilization drift failure diagnosis',
    'LLM context utilization drift QA checklist',
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
      title: 'Build the LLM context utilization drift testing baseline',
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
