import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 720,
  slug: 'vision-llm-ocr-fidelity-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Vision LLM Ocr Fidelity Testing',
  description:
    'vision LLM OCR fidelity testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'vision LLM OCR fidelity testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test vision llm ocr fidelity so small text, columns, tables, punctuation, and confusable characters match the image evidence?',
  intentBoundary: 'Transcription fidelity from images only, not OCR-origin prompt injection.',
  secondaryKeywords: [
    'vision LLM OCR fidelity test cases',
    'how to test vision llm ocr fidelity',
    'vision LLM OCR fidelity regression checks',
    'vision LLM OCR fidelity CI validation',
    'vision LLM OCR fidelity failure diagnosis',
    'vision LLM OCR fidelity QA checklist',
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
      title: 'Build the vision LLM OCR fidelity testing baseline',
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
