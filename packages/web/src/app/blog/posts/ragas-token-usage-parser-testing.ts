import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 717,
  slug: 'ragas-token-usage-parser-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Ragas Token Usage Parser Testing',
  description:
    'Ragas token usage parser testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Ragas token usage parser testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test ragas token usage parser so provider-specific usage records normalize into complete, nonnegative, attributable token totals?',
  intentBoundary: 'Ragas token-usage parsing only, not LLM trace reconciliation or cost budgets.',
  secondaryKeywords: [
    'Ragas token usage parser test cases',
    'how to test ragas token usage parser',
    'Ragas token usage parser regression checks',
    'Ragas token usage parser CI validation',
    'Ragas token usage parser failure diagnosis',
    'Ragas token usage parser QA checklist',
  ],
  repoEvidence: [
    'seed-skills/ragas-rag-evaluation/SKILL.md',
    'seed-skills/rag-evaluation-metrics/SKILL.md',
    'packages/web/src/app/blog/posts/ragas-rag-evaluation-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/ragas-rag-evaluation-guide',
    '/blog/ragas-context-precision-recall-faithfulness-guide',
    '/blog/rag-testing-complete-guide-2026',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'ragas-rag-evaluation-guide',
    'ragas-context-precision-recall-faithfulness-guide',
    'rag-testing-complete-guide-2026',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://docs.ragas.io/en/stable/getstarted/evals/',
    'https://docs.ragas.io/en/latest/references/evaluate/',
    'https://docs.ragas.io/en/stable/concepts/test_data_generation/',
  ],
  codeExamples: [
    {
      title: 'Build the Ragas token usage parser testing baseline',
      language: 'bash',
      path: 'seed-skills/ragas-rag-evaluation/SKILL.md',
      snippet:
        'pip install ragas datasets\nexport OPENAI_API_KEY=sk-...   # judge + embeddings (other providers configurable)',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/rag-evaluation-metrics/SKILL.md',
      snippet:
        'GOLDEN_SET: list[GoldenSample] = [\n    GoldenSample(\n        question="What is the refund window for digital products?",\n        ground_truth="Digital products can be refunded within 14 days of purchase if unused.",\n        reference_contexts=[\n            "Refund policy: Digital goods are eligible for a refund within 14 days "\n            "of purchase, provided the license key has not been activated."\n        ],\n    ),\n    GoldenSample(\n        question="Does the Pro plan include priority support?",\n        ground_truth="Yes, the Pro plan includes 24/7 priority email and chat support.",\n        reference_contexts=[\n            "Pro plan benefits: unlimited projects, advanced analytics, and 24/7 "\n            "priority support over email and chat."\n        ],\n    ),',
    },
  ],
});
