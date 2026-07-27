import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 702,
  slug: 'llm-tool-choice-distribution-drift',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Tool Choice Distribution Drift',
  description:
    'LLM tool choice distribution drift: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM tool choice distribution drift',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm tool choice distribution drift so tool selection rates by intent reveal silent routing changes while preserving per-case correctness?',
  intentBoundary:
    'Population-level tool-choice drift only, not individual tool-selection accuracy.',
  secondaryKeywords: [
    'LLM tool choice distribution drift test cases',
    'how to test llm tool choice distribution drift',
    'LLM tool choice distribution drift regression checks',
    'LLM tool choice distribution drift CI validation',
    'LLM tool choice distribution drift failure diagnosis',
    'LLM tool choice distribution drift QA checklist',
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
      title: 'Build the LLM tool choice distribution drift baseline',
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
