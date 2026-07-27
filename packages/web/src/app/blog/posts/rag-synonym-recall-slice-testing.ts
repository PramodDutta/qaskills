import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 711,
  slug: 'rag-synonym-recall-slice-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'RAG Synonym Recall Slice Testing',
  description:
    'RAG synonym recall slice testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'RAG synonym recall slice testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test rag synonym recall slice so approved aliases, acronyms, and domain terms retrieve the same relevant source family?',
  intentBoundary:
    'Synonym and terminology recall slices only, not multilingual retrieval or query expansion generally.',
  secondaryKeywords: [
    'RAG synonym recall slice test cases',
    'how to test rag synonym recall slice',
    'RAG synonym recall slice regression checks',
    'RAG synonym recall slice CI validation',
    'RAG synonym recall slice failure diagnosis',
    'RAG synonym recall slice QA checklist',
  ],
  repoEvidence: [
    'seed-skills/rag-regression-testing/SKILL.md',
    'seed-skills/rag-evaluation-metrics/SKILL.md',
    'packages/web/src/app/blog/posts/generated-seo-batch-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/rag-testing-complete-guide-2026',
    '/blog/rag-retrieval-testing-best-practices-2026',
    '/blog/ragas-context-precision-recall-faithfulness-guide',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'rag-testing-complete-guide-2026',
    'rag-retrieval-testing-best-practices-2026',
    'ragas-context-precision-recall-faithfulness-guide',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/retrieval',
    'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/',
    'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-rank-eval.html',
  ],
  codeExamples: [
    {
      title: 'Build the RAG synonym recall slice testing baseline',
      language: 'text',
      path: 'seed-skills/rag-regression-testing/SKILL.md',
      snippet:
        'rag-evals/\n  golden/\n    dataset.v3.json            # versioned golden set; bump filename on change\n  baseline/\n    baseline_metrics.json      # committed known-good scores\n  config/\n    eval_config.py             # pinned models, thresholds, drift budget\n  run_eval.py                  # produces scores, writes report.json\n  gate.py                      # compares scores vs baseline + floors -> exit code\n  update_baseline.py           # regenerates baseline (run intentionally)\n.github/\n  workflows/\n    rag-regression.yml',
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
