import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 629,
  slug: 'deepeval-skipped-case-accounting-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Deepeval Skipped Case Accounting Testing',
  description:
    'DeepEval skipped case accounting testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'DeepEval skipped case accounting testing',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams test deepeval skipped case accounting so skipped, errored, filtered, and completed cases reconcile to the discovered suite total?',
  intentBoundary: 'Test-run case accounting only, not smoke-versus-nightly partitioning.',
  secondaryKeywords: [
    'DeepEval skipped case accounting test cases',
    'how to test deepeval skipped case accounting',
    'DeepEval skipped case accounting regression checks',
    'DeepEval skipped case accounting CI validation',
    'DeepEval skipped case accounting failure diagnosis',
    'DeepEval skipped case accounting QA checklist',
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
      title: 'Build the DeepEval skipped case accounting testing baseline',
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
