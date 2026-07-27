import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 663,
  slug: 'openai-eval-data-source-filtering',
  campaignCluster: 'ai-llm-rag',
  title: 'Openai Eval Data Source Filtering',
  description:
    'OpenAI eval data source filtering: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'OpenAI eval data source filtering',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test openai eval data source filtering so metadata filters include the intended cases and cannot silently exclude required quality slices?',
  intentBoundary: 'Eval data-source filter behavior only, not dataset slice balance itself.',
  secondaryKeywords: [
    'OpenAI eval data source filtering test cases',
    'how to test openai eval data source filtering',
    'OpenAI eval data source filtering regression checks',
    'OpenAI eval data source filtering CI validation',
    'OpenAI eval data source filtering failure diagnosis',
    'OpenAI eval data source filtering QA checklist',
  ],
  repoEvidence: [
    'seed-skills/openai-evals-trace-grading/SKILL.md',
    'seed-skills/ai-agent-eval/SKILL.md',
    'packages/web/src/app/blog/posts/openai-evals-trace-grading-complete-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/openai-evals-complete-guide-2026',
    '/blog/openai-evals-trace-grading-complete-guide',
    '/blog/llm-judge-calibration-guide-2026',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'openai-evals-complete-guide-2026',
    'openai-evals-trace-grading-complete-guide',
    'llm-judge-calibration-guide-2026',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/evals',
    'https://platform.openai.com/docs/guides/graders',
    'https://platform.openai.com/docs/guides/trace-grading',
  ],
  codeExamples: [
    {
      title: 'Build the OpenAI eval data source filtering baseline',
      language: 'text',
      path: 'seed-skills/openai-evals-trace-grading/SKILL.md',
      snippet:
        'evals/\n  data/\n    support_agent.jsonl        # versioned dataset, one sample per line\n  graders/\n    exact_match.py\n    json_schema_grader.py\n    rubric_grader.py           # model-graded rubric\n  config/\n    support_agent.eval.json    # eval suite config (datasets + graders + threshold)\n  run_eval.py                  # loads traces, runs graders, writes results.json\n  gate.py                      # pass-rate gate for CI\n.github/workflows/agent-evals.yml',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/ai-agent-eval/SKILL.md',
      snippet:
        'judges/\n    correctness-judge.ts\n    helpfulness-judge.ts\n    safety-judge.ts\n    code-quality-judge.ts\n    composite-judge.ts\n  runners/\n    eval-runner.ts\n    batch-runner.ts\n    parallel-runner.ts\n  metrics/\n    scoring.ts\n    statistical.ts\n    aggregation.ts\n  reports/\n    html-reporter.ts\n    json-reporter.ts\n    regression-detector.ts',
    },
  ],
});
