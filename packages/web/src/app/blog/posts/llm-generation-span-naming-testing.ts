import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 632,
  slug: 'llm-generation-span-naming-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Generation Span Naming Testing',
  description:
    'LLM generation span naming testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM generation span naming testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm generation span naming so operation names and model attributes follow stable semantic conventions without dynamic prompt data?',
  intentBoundary:
    'Generation span names and standard attributes only, not telemetry cardinality budgets.',
  secondaryKeywords: [
    'LLM generation span naming test cases',
    'how to test llm generation span naming',
    'LLM generation span naming regression checks',
    'LLM generation span naming CI validation',
    'LLM generation span naming failure diagnosis',
    'LLM generation span naming QA checklist',
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
      title: 'Build the LLM generation span naming testing baseline',
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
