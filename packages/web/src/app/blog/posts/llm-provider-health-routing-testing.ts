import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 733,
  slug: 'llm-provider-health-routing-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Provider Health Routing Testing',
  description:
    'LLM provider health routing testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM provider health routing testing',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams test llm provider health routing so health signals, probes, and cooldowns control routing without flapping or false success?',
  intentBoundary:
    'Health-based LLM provider routing only, not generic circuit breakers or fallback quality.',
  secondaryKeywords: [
    'LLM provider health routing test cases',
    'how to test llm provider health routing',
    'LLM provider health routing regression checks',
    'LLM provider health routing CI validation',
    'LLM provider health routing failure diagnosis',
    'LLM provider health routing QA checklist',
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
      title: 'Build the LLM provider health routing testing baseline',
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
