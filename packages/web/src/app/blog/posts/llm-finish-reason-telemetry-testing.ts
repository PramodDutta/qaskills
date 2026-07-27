import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 693,
  slug: 'llm-finish-reason-telemetry-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Finish Reason Telemetry Testing',
  description:
    'LLM finish reason telemetry testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM finish reason telemetry testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm finish reason telemetry so raw and normalized finish reasons distinguish stop, length, tool, refusal, and error outcomes?',
  intentBoundary:
    'Recording finish reasons in telemetry only, not provider response-schema compatibility.',
  secondaryKeywords: [
    'LLM finish reason telemetry test cases',
    'how to test llm finish reason telemetry',
    'LLM finish reason telemetry regression checks',
    'LLM finish reason telemetry CI validation',
    'LLM finish reason telemetry failure diagnosis',
    'LLM finish reason telemetry QA checklist',
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
      title: 'Build the LLM finish reason telemetry testing baseline',
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
