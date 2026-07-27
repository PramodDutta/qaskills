import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 719,
  slug: 'vision-llm-crop-sensitivity-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Vision LLM Crop Sensitivity Testing',
  description:
    'vision LLM crop sensitivity testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'vision LLM crop sensitivity testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test vision llm crop sensitivity so removing irrelevant borders preserves answers while cropping decisive evidence triggers uncertainty?',
  intentBoundary: 'Controlled crop metamorphism only, not image-resolution degradation.',
  secondaryKeywords: [
    'vision LLM crop sensitivity test cases',
    'how to test vision llm crop sensitivity',
    'vision LLM crop sensitivity regression checks',
    'vision LLM crop sensitivity CI validation',
    'vision LLM crop sensitivity failure diagnosis',
    'vision LLM crop sensitivity QA checklist',
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
      title: 'Build the vision LLM crop sensitivity testing baseline',
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
