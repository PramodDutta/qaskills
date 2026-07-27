import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 741,
  slug: 'deepeval-multimodal-test-case-validation',
  campaignCluster: 'ai-llm-rag',
  title: 'Deepeval Multimodal Test Case Validation',
  description:
    'DeepEval multimodal test case validation: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'DeepEval multimodal test case validation',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test deepeval multimodal test case validation so local, remote, and encoded images map to the correct turn and invalid media fails clearly?',
  intentBoundary: 'MLLMImage test-case construction only, not multimodal metric scoring.',
  secondaryKeywords: [
    'DeepEval multimodal test case validation test cases',
    'how to test deepeval multimodal test case validation',
    'DeepEval multimodal test case validation regression checks',
    'DeepEval multimodal test case validation CI validation',
    'DeepEval multimodal test case validation failure diagnosis',
    'DeepEval multimodal test case validation QA checklist',
  ],
  repoEvidence: [
    'seed-skills/deepeval-llm-evaluation/SKILL.md',
    'seed-skills/ai-system-quality-engineer/SKILL.md',
    'packages/web/src/app/blog/posts/deepeval-pytest-llm-testing-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/deepeval-pytest-llm-testing-guide',
    '/blog/deepeval-conversational-multiturn-metrics-guide',
    '/blog/llm-evaluation-ci-cd-quality-gates',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'deepeval-pytest-llm-testing-guide',
    'deepeval-conversational-multiturn-metrics-guide',
    'llm-evaluation-ci-cd-quality-gates',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://deepeval.com/docs/evaluation-test-cases',
    'https://deepeval.com/docs/evaluation-datasets',
    'https://deepeval.com/docs/evaluation-flags-and-configs',
  ],
  codeExamples: [
    {
      title: 'Build the DeepEval multimodal test case validation baseline',
      language: 'bash',
      path: 'seed-skills/deepeval-llm-evaluation/SKILL.md',
      snippet:
        'pip install deepeval\n# judge model key (defaults to OpenAI; other providers configurable)\nexport OPENAI_API_KEY=sk-...\ndeepeval login   # optional: Confident AI dashboard for run history',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/ai-system-quality-engineer/SKILL.md',
      snippet: '',
    },
  ],
});
