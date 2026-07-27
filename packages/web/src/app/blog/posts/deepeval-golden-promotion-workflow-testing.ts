import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 740,
  slug: 'deepeval-golden-promotion-workflow-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Deepeval Golden Promotion Workflow Testing',
  description:
    'DeepEval golden promotion workflow testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'DeepEval golden promotion workflow testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test deepeval golden promotion workflow so reviewed goldens move into the regression dataset with immutable IDs and auditable approval?',
  intentBoundary:
    'Golden-to-regression promotion only, not dataset key mapping or broad versioning.',
  secondaryKeywords: [
    'DeepEval golden promotion workflow test cases',
    'how to test deepeval golden promotion workflow',
    'DeepEval golden promotion workflow regression checks',
    'DeepEval golden promotion workflow CI validation',
    'DeepEval golden promotion workflow failure diagnosis',
    'DeepEval golden promotion workflow QA checklist',
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
      title: 'Build the DeepEval golden promotion workflow testing baseline',
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
