import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 631,
  slug: 'llm-fallback-model-equivalence-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Fallback Model Equivalence Testing',
  description:
    'LLM fallback model equivalence testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM fallback model equivalence testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm fallback model equivalence so fallback responses preserve required schema, safety, tool, language, and minimum quality contracts?',
  intentBoundary:
    'Contract equivalence of a configured fallback model only, not model comparison rankings.',
  secondaryKeywords: [
    'LLM fallback model equivalence test cases',
    'how to test llm fallback model equivalence',
    'LLM fallback model equivalence regression checks',
    'LLM fallback model equivalence CI validation',
    'LLM fallback model equivalence failure diagnosis',
    'LLM fallback model equivalence QA checklist',
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
      title: 'Build the LLM fallback model equivalence testing baseline',
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
