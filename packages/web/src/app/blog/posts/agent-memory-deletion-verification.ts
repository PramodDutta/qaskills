import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 676,
  slug: 'agent-memory-deletion-verification',
  campaignCluster: 'ai-llm-rag',
  title: 'Agent Memory Deletion Verification',
  description:
    'agent memory deletion verification: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'agent memory deletion verification',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test agent memory deletion verification so deleted memories disappear from primary storage, indexes, caches, and subsequent context?',
  intentBoundary: 'Deletion propagation for one user memory only, not cross-user leakage.',
  secondaryKeywords: [
    'agent memory deletion verification test cases',
    'how to test agent memory deletion verification',
    'agent memory deletion verification regression checks',
    'agent memory deletion verification CI validation',
    'agent memory deletion verification failure diagnosis',
    'agent memory deletion verification QA checklist',
  ],
  repoEvidence: [
    'seed-skills/ai-agent-eval/SKILL.md',
    'seed-skills/agentic-testing/SKILL.md',
    'packages/web/src/app/blog/posts/multi-agent-system-testing-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/multi-agent-system-testing-guide-2026',
    '/blog/memory-testing-ai-agents-guide-2026',
    '/blog/agent-trajectory-evaluation-guide-2026',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'multi-agent-system-testing-guide-2026',
    'memory-testing-ai-agents-guide-2026',
    'agent-trajectory-evaluation-guide-2026',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/evals',
    'https://platform.openai.com/docs/guides/function-calling',
    'https://genai.owasp.org/llmrisk/llm062025-excessive-agency/',
  ],
  codeExamples: [
    {
      title: 'Build the agent memory deletion verification baseline',
      language: 'text',
      path: 'seed-skills/ai-agent-eval/SKILL.md',
      snippet:
        'evals/\n  datasets/\n    golden/\n      coding-tasks.jsonl\n      qa-pairs.jsonl\n      multi-turn-conversations.jsonl\n      adversarial-inputs.jsonl\n      edge-cases.jsonl\n    generated/\n      synthetic-tasks.jsonl\n  judges/\n    correctness-judge.ts\n    helpfulness-judge.ts\n    safety-judge.ts\n    code-quality-judge.ts\n    composite-judge.ts\n  runners/\n    eval-runner.ts',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/agentic-testing/SKILL.md',
      snippet:
        'generator/\n      test-generator.ts\n      fixture-generator.ts\n      mock-generator.ts\n    executor/\n      test-runner.ts\n      parallel-executor.ts\n      result-collector.ts\n    reporter/\n      insight-generator.ts\n      trend-analyzer.ts\n      alert-system.ts\n  knowledge/\n    failure-patterns.json\n    selector-mappings.json\n    test-templates/\n      unit-template.ts\n      integration-template.ts',
    },
  ],
});
