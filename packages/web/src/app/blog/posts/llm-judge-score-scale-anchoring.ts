import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 696,
  slug: 'llm-judge-score-scale-anchoring',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Judge Score Scale Anchoring',
  description:
    'LLM judge score scale anchoring: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM judge score scale anchoring',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm judge score scale anchoring so reviewed examples define each score level and prevent all acceptable outputs from clustering at one value?',
  intentBoundary: 'Anchoring rubric scale points only, not pass-threshold calibration.',
  secondaryKeywords: [
    'LLM judge score scale anchoring test cases',
    'how to test llm judge score scale anchoring',
    'LLM judge score scale anchoring regression checks',
    'LLM judge score scale anchoring CI validation',
    'LLM judge score scale anchoring failure diagnosis',
    'LLM judge score scale anchoring QA checklist',
  ],
  repoEvidence: [
    'seed-skills/ai-agent-eval/SKILL.md',
    'seed-skills/openai-evals-trace-grading/SKILL.md',
    'packages/web/src/app/blog/posts/llm-judge-calibration-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/llm-judge-calibration-guide-2026',
    '/blog/pairwise-llm-evaluation-guide-2026',
    '/blog/openai-evals-complete-guide-2026',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'llm-judge-calibration-guide-2026',
    'pairwise-llm-evaluation-guide-2026',
    'openai-evals-complete-guide-2026',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/graders',
    'https://arxiv.org/abs/2306.05685',
    'https://deepeval.com/docs/metrics-llm-evals',
  ],
  codeExamples: [
    {
      title: 'Build the LLM judge score scale anchoring baseline',
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
