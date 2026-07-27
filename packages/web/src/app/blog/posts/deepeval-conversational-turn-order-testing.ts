import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 644,
  slug: 'deepeval-conversational-turn-order-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Deepeval Conversational Turn Order Testing',
  description:
    'DeepEval conversational turn order testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'DeepEval conversational turn order testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test deepeval conversational turn order so missing, duplicated, swapped, and invalid roles fail before conversational metrics run?',
  intentBoundary:
    'ConversationalTestCase turn sequencing only, not broad multi-turn quality metrics.',
  secondaryKeywords: [
    'DeepEval conversational turn order test cases',
    'how to test deepeval conversational turn order',
    'DeepEval conversational turn order regression checks',
    'DeepEval conversational turn order CI validation',
    'DeepEval conversational turn order failure diagnosis',
    'DeepEval conversational turn order QA checklist',
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
      title: 'Build the DeepEval conversational turn order testing baseline',
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
