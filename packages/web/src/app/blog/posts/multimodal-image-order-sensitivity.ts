import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 635,
  slug: 'multimodal-image-order-sensitivity',
  campaignCluster: 'ai-llm-rag',
  title: 'Multimodal Image Order Sensitivity',
  description:
    'multimodal image order sensitivity: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'multimodal image order sensitivity',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test multimodal image order sensitivity so reordering equivalent image sets preserves conclusions while sequence-dependent tasks remain ordered?',
  intentBoundary: 'Ordering of multiple image inputs only, not RAG context order.',
  secondaryKeywords: [
    'multimodal image order sensitivity test cases',
    'how to test multimodal image order sensitivity',
    'multimodal image order sensitivity regression checks',
    'multimodal image order sensitivity CI validation',
    'multimodal image order sensitivity failure diagnosis',
    'multimodal image order sensitivity QA checklist',
  ],
  repoEvidence: [
    'seed-skills/ai-model-testing/SKILL.md',
    'seed-skills/promptfoo-llm-red-teaming/SKILL.md',
    'packages/web/src/app/blog/posts/promptfoo-red-teaming-llm-applications.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/testing-llm-applications-guide',
    '/blog/promptfoo-complete-guide-2026',
    '/blog/deepeval-conversational-multiturn-metrics-guide',
    '/blog/ai-agent-eval-testing-guide',
  ],
  relatedSlugs: [
    'testing-llm-applications-guide',
    'promptfoo-complete-guide-2026',
    'deepeval-conversational-multiturn-metrics-guide',
    'ai-agent-eval-testing-guide',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/images-vision',
    'https://deepeval.com/docs/evaluation-multiturn-test-cases',
    'https://www.promptfoo.dev/docs/guides/multimodal-red-team/',
  ],
  codeExamples: [
    {
      title: 'Build the multimodal image order sensitivity baseline',
      language: 'python',
      path: 'seed-skills/ai-model-testing/SKILL.md',
      snippet:
        '// Example ai pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'bash',
      path: 'seed-skills/promptfoo-llm-red-teaming/SKILL.md',
      snippet: '',
    },
  ],
});
