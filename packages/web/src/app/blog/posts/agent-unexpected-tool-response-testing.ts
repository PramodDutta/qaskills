import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 732,
  slug: 'agent-unexpected-tool-response-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Agent Unexpected Tool Response Testing',
  description:
    'agent unexpected tool response testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'agent unexpected tool response testing',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams test agent unexpected tool response so null, partial, extra, and incompatible tool results trigger typed recovery rather than confident continuation?',
  intentBoundary:
    'Unexpected result-shape handling only, not truncation, provenance, or prompt injection.',
  secondaryKeywords: [
    'agent unexpected tool response test cases',
    'how to test agent unexpected tool response',
    'agent unexpected tool response regression checks',
    'agent unexpected tool response CI validation',
    'agent unexpected tool response failure diagnosis',
    'agent unexpected tool response QA checklist',
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
      title: 'Build the agent unexpected tool response testing baseline',
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
