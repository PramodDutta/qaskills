import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 649,
  slug: 'llm-batch-partial-failure-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Batch Partial Failure Testing',
  description:
    'LLM batch partial failure testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM batch partial failure testing',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams test llm batch partial failure so successful, failed, expired, and cancelled batch items retain identity and independent retry eligibility?',
  intentBoundary: 'Batch API item accounting only, not agent batch actions.',
  secondaryKeywords: [
    'LLM batch partial failure test cases',
    'how to test llm batch partial failure',
    'LLM batch partial failure regression checks',
    'LLM batch partial failure CI validation',
    'LLM batch partial failure failure diagnosis',
    'LLM batch partial failure QA checklist',
  ],
  repoEvidence: [
    'seed-skills/prompt-testing/SKILL.md',
    'seed-skills/ai-system-quality-engineer/SKILL.md',
    'packages/web/src/app/blog/posts/testing-llm-applications-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/testing-llm-applications-guide',
    '/blog/testing-llm-time-to-first-token-sla',
    '/blog/llm-non-determinism-flaky-eval-guide-2026',
    '/blog/ai-agent-eval-testing-guide',
  ],
  relatedSlugs: [
    'testing-llm-applications-guide',
    'testing-llm-time-to-first-token-sla',
    'llm-non-determinism-flaky-eval-guide-2026',
    'ai-agent-eval-testing-guide',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/rate-limits',
    'https://www.rfc-editor.org/info/rfc9110',
    'https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/',
  ],
  codeExamples: [
    {
      title: 'Build the LLM batch partial failure testing baseline',
      language: 'text',
      path: 'seed-skills/prompt-testing/SKILL.md',
      snippet:
        'tests/\n  prompts/\n    evaluation/\n      relevance.eval.ts\n      faithfulness.eval.ts\n      hallucination.eval.ts\n    regression/\n      prompt-v1.regression.ts\n      prompt-v2.regression.ts\n    safety/\n      guardrails.eval.ts\n      toxicity.eval.ts\n    ab-testing/\n      prompt-variants.eval.ts\n  fixtures/\n    ground-truth/\n      qa-pairs.json\n      summaries.json',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/ai-system-quality-engineer/SKILL.md',
      snippet: '',
    },
  ],
});
