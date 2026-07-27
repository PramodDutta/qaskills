import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 659,
  slug: 'llm-trace-export-retry-idempotency',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Trace Export Retry Idempotency',
  description:
    'LLM trace export retry idempotency: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM trace export retry idempotency',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams test llm trace export retry idempotency so export retries deliver each span once logically without losing links or multiplying metrics?',
  intentBoundary: 'Telemetry exporter retry idempotency only, not application request retries.',
  secondaryKeywords: [
    'LLM trace export retry idempotency test cases',
    'how to test llm trace export retry idempotency',
    'LLM trace export retry idempotency regression checks',
    'LLM trace export retry idempotency CI validation',
    'LLM trace export retry idempotency failure diagnosis',
    'LLM trace export retry idempotency QA checklist',
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
      title: 'Build the LLM trace export retry idempotency baseline',
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
