import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 728,
  slug: 'agent-partial-batch-action-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Agent Partial Batch Action Testing',
  description:
    'agent partial batch action testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'agent partial batch action testing',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams test agent partial batch action so mixed success in a batch produces item-level evidence, bounded retries, and no all-success claim?',
  intentBoundary:
    'Partial success within one batch tool call only, not general multi-agent task aggregation.',
  secondaryKeywords: [
    'agent partial batch action test cases',
    'how to test agent partial batch action',
    'agent partial batch action regression checks',
    'agent partial batch action CI validation',
    'agent partial batch action failure diagnosis',
    'agent partial batch action QA checklist',
  ],
  repoEvidence: [
    'seed-skills/ai-agent-eval/SKILL.md',
    'seed-skills/ai-system-quality-engineer/SKILL.md',
    'packages/web/src/app/blog/posts/agent-tool-use-regression-testing-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/agent-tool-use-regression-testing-guide-2026',
    '/blog/agent-trajectory-evaluation-guide-2026',
    '/blog/openai-evals-trace-grading-complete-guide',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'agent-tool-use-regression-testing-guide-2026',
    'agent-trajectory-evaluation-guide-2026',
    'openai-evals-trace-grading-complete-guide',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/function-calling',
    'https://platform.openai.com/docs/guides/evals',
    'https://genai.owasp.org/llmrisk/llm062025-excessive-agency/',
  ],
  codeExamples: [
    {
      title: 'Build the agent partial batch action testing baseline',
      language: 'text',
      path: 'seed-skills/ai-agent-eval/SKILL.md',
      snippet:
        'evals/\n  datasets/\n    golden/\n      coding-tasks.jsonl\n      qa-pairs.jsonl\n      multi-turn-conversations.jsonl\n      adversarial-inputs.jsonl\n      edge-cases.jsonl\n    generated/\n      synthetic-tasks.jsonl\n  judges/\n    correctness-judge.ts\n    helpfulness-judge.ts\n    safety-judge.ts\n    code-quality-judge.ts\n    composite-judge.ts\n  runners/\n    eval-runner.ts',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/ai-system-quality-engineer/SKILL.md',
      snippet: '',
    },
  ],
});
