import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 691,
  slug: 'llm-cached-token-telemetry-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Cached Token Telemetry Testing',
  description:
    'LLM cached token telemetry testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM cached token telemetry testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm cached token telemetry so cached and uncached token fields map consistently without inflating total usage or cost?',
  intentBoundary:
    'Cached-token observability fields only, not full token reconciliation across providers.',
  secondaryKeywords: [
    'LLM cached token telemetry test cases',
    'how to test llm cached token telemetry',
    'LLM cached token telemetry regression checks',
    'LLM cached token telemetry CI validation',
    'LLM cached token telemetry failure diagnosis',
    'LLM cached token telemetry QA checklist',
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
      title: 'Build the LLM cached token telemetry testing baseline',
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
