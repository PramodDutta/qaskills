import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 641,
  slug: 'agent-dynamic-tool-availability-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Agent Dynamic Tool Availability Testing',
  description:
    'agent dynamic tool availability testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'agent dynamic tool availability testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test agent dynamic tool availability so added, removed, and temporarily unavailable capabilities refresh without stale calls or invented tools?',
  intentBoundary:
    'Runtime changes to the available tool set only, not schema evolution for one stable tool.',
  secondaryKeywords: [
    'agent dynamic tool availability test cases',
    'how to test agent dynamic tool availability',
    'agent dynamic tool availability regression checks',
    'agent dynamic tool availability CI validation',
    'agent dynamic tool availability failure diagnosis',
    'agent dynamic tool availability QA checklist',
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
      title: 'Build the agent dynamic tool availability testing baseline',
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
