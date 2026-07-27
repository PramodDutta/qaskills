import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 746,
  slug: 'eval-dataset-temporal-split-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Eval Dataset Temporal Split Testing',
  description:
    'eval dataset temporal split testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'eval dataset temporal split testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test eval dataset temporal split so future examples and revisions remain outside baselines intended to simulate earlier production time?',
  intentBoundary:
    'Time-based dataset partition integrity only, not model knowledge-cutoff behavior.',
  secondaryKeywords: [
    'eval dataset temporal split test cases',
    'how to test eval dataset temporal split',
    'eval dataset temporal split regression checks',
    'eval dataset temporal split CI validation',
    'eval dataset temporal split failure diagnosis',
    'eval dataset temporal split QA checklist',
  ],
  repoEvidence: [
    'seed-skills/ai-agent-eval/SKILL.md',
    'seed-skills/openai-evals-trace-grading/SKILL.md',
    'packages/web/src/app/blog/posts/golden-dataset-llm-evaluation-guide.ts',
    'docs/seo/article-factory-250-2026-07-25/inventory.json',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/golden-dataset-llm-evaluation-guide',
    '/blog/eval-dataset-versioning-guide-2026',
    '/blog/llm-evaluation-ci-cd-quality-gates',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'golden-dataset-llm-evaluation-guide',
    'eval-dataset-versioning-guide-2026',
    'llm-evaluation-ci-cd-quality-gates',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/evals',
    'https://deepeval.com/docs/evaluation-datasets',
    'https://huggingface.co/docs/datasets/en/loading',
  ],
  codeExamples: [
    {
      title: 'Build the eval dataset temporal split testing baseline',
      language: 'text',
      path: 'seed-skills/ai-agent-eval/SKILL.md',
      snippet:
        'evals/\n  datasets/\n    golden/\n      coding-tasks.jsonl\n      qa-pairs.jsonl\n      multi-turn-conversations.jsonl\n      adversarial-inputs.jsonl\n      edge-cases.jsonl\n    generated/\n      synthetic-tasks.jsonl\n  judges/\n    correctness-judge.ts\n    helpfulness-judge.ts\n    safety-judge.ts\n    code-quality-judge.ts\n    composite-judge.ts\n  runners/\n    eval-runner.ts',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/openai-evals-trace-grading/SKILL.md',
      snippet:
        'gate.py                      # pass-rate gate for CI\n.github/workflows/agent-evals.yml',
    },
  ],
});
