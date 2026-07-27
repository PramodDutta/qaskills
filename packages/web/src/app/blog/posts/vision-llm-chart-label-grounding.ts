import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 672,
  slug: 'vision-llm-chart-label-grounding',
  campaignCluster: 'ai-llm-rag',
  title: 'Vision LLM Chart Label Grounding',
  description:
    'vision LLM chart label grounding: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'vision LLM chart label grounding',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test vision llm chart label grounding so series, axes, units, legends, and data labels support every extracted chart claim?',
  intentBoundary: 'Grounding claims to chart labels only, not broad chart question answering.',
  secondaryKeywords: [
    'vision LLM chart label grounding test cases',
    'how to test vision llm chart label grounding',
    'vision LLM chart label grounding regression checks',
    'vision LLM chart label grounding CI validation',
    'vision LLM chart label grounding failure diagnosis',
    'vision LLM chart label grounding QA checklist',
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
      title: 'Build the vision LLM chart label grounding baseline',
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
