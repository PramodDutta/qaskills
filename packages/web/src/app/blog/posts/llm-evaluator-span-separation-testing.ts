import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 684,
  slug: 'llm-evaluator-span-separation-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Evaluator Span Separation Testing',
  description:
    'LLM evaluator span separation testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM evaluator span separation testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm evaluator span separation so judge calls cannot pollute target latency, cost, error, or model-quality aggregates?',
  intentBoundary:
    'Separation of evaluator traffic from application traffic only, not judge calibration.',
  secondaryKeywords: [
    'LLM evaluator span separation test cases',
    'how to test llm evaluator span separation',
    'LLM evaluator span separation regression checks',
    'LLM evaluator span separation CI validation',
    'LLM evaluator span separation failure diagnosis',
    'LLM evaluator span separation QA checklist',
  ],
  repoEvidence: [
    'seed-skills/langfuse-llm-observability/SKILL.md',
    'seed-skills/ai-system-quality-engineer/SKILL.md',
    'packages/web/src/app/blog/posts/langfuse-trace-quality-testing-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/llm-observability-traces-guide-2026',
    '/blog/langfuse-trace-quality-testing-guide',
    '/blog/agent-trajectory-evaluation-guide-2026',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'llm-observability-traces-guide-2026',
    'langfuse-trace-quality-testing-guide',
    'agent-trajectory-evaluation-guide-2026',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/',
    'https://opentelemetry.io/docs/concepts/signals/traces/',
    'https://langfuse.com/docs/observability/overview',
  ],
  codeExamples: [
    {
      title: 'Build the LLM evaluator span separation testing baseline',
      language: 'bash',
      path: 'seed-skills/langfuse-llm-observability/SKILL.md',
      snippet:
        'pip install langfuse            # python\nnpm install langfuse            # typescript\nexport LANGFUSE_PUBLIC_KEY=pk-...\nexport LANGFUSE_SECRET_KEY=sk-...\nexport LANGFUSE_HOST=https://cloud.langfuse.com   # or self-hosted URL',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/ai-system-quality-engineer/SKILL.md',
      snippet: '',
    },
  ],
});
