import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 686,
  slug: 'eval-dataset-label-leakage-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Eval Dataset Label Leakage Testing',
  description:
    'eval dataset label leakage testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'eval dataset label leakage testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test eval dataset label leakage so inputs and metadata cannot reveal expected labels, grader hints, or reference answers to the model?',
  intentBoundary:
    'Label and reference leakage into model-visible fields only, not train-test overlap.',
  secondaryKeywords: [
    'eval dataset label leakage test cases',
    'how to test eval dataset label leakage',
    'eval dataset label leakage regression checks',
    'eval dataset label leakage CI validation',
    'eval dataset label leakage failure diagnosis',
    'eval dataset label leakage QA checklist',
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
      title: 'Build the eval dataset label leakage testing baseline',
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
