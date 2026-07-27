import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 695,
  slug: 'llm-judge-rubric-ambiguity-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Judge Rubric Ambiguity Testing',
  description:
    'LLM judge rubric ambiguity testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM judge rubric ambiguity testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm judge rubric ambiguity so controlled examples expose overlapping, contradictory, and undefined rubric criteria?',
  intentBoundary:
    'Ambiguous rubric language only, not mutation testing or score consistency generally.',
  secondaryKeywords: [
    'LLM judge rubric ambiguity test cases',
    'how to test llm judge rubric ambiguity',
    'LLM judge rubric ambiguity regression checks',
    'LLM judge rubric ambiguity CI validation',
    'LLM judge rubric ambiguity failure diagnosis',
    'LLM judge rubric ambiguity QA checklist',
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
      title: 'Build the LLM judge rubric ambiguity testing baseline',
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
