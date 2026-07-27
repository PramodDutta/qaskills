import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 628,
  slug: 'llm-hedged-request-cancellation-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Hedged Request Cancellation Testing',
  description:
    'LLM hedged request cancellation testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM hedged request cancellation testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm hedged request cancellation so the first valid response wins, losing attempts cancel, and output plus cost are counted once?',
  intentBoundary:
    'Parallel hedged provider requests only, not fallback selection or ordinary retries.',
  secondaryKeywords: [
    'LLM hedged request cancellation test cases',
    'how to test llm hedged request cancellation',
    'LLM hedged request cancellation regression checks',
    'LLM hedged request cancellation CI validation',
    'LLM hedged request cancellation failure diagnosis',
    'LLM hedged request cancellation QA checklist',
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
      title: 'Build the LLM hedged request cancellation testing baseline',
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
