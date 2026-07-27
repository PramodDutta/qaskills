import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 713,
  slug: 'rag-multi-source-synthesis-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'RAG Multi Source Synthesis Testing',
  description:
    'RAG multi source synthesis testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'RAG multi source synthesis testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test rag multi source synthesis so answers combine complementary sources without merging entities, dates, or incompatible scopes?',
  intentBoundary:
    'Synthesis of compatible multi-source evidence only, not contradictory-evidence resolution.',
  secondaryKeywords: [
    'RAG multi source synthesis test cases',
    'how to test rag multi source synthesis',
    'RAG multi source synthesis regression checks',
    'RAG multi source synthesis CI validation',
    'RAG multi source synthesis failure diagnosis',
    'RAG multi source synthesis QA checklist',
  ],
  repoEvidence: [
    'seed-skills/rag-evaluation-metrics/SKILL.md',
    'seed-skills/prompt-testing/SKILL.md',
    'packages/web/src/app/blog/posts/generated-seo-batch-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/rag-testing-complete-guide-2026',
    '/blog/rag-source-attribution-testing-guide-2026',
    '/blog/hallucination-detection-pipeline-guide',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'rag-testing-complete-guide-2026',
    'rag-source-attribution-testing-guide-2026',
    'hallucination-detection-pipeline-guide',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/retrieval',
    'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/',
    'https://deepeval.com/docs/metrics-faithfulness',
  ],
  codeExamples: [
    {
      title: 'Build the RAG multi source synthesis testing baseline',
      language: 'python',
      path: 'seed-skills/rag-evaluation-metrics/SKILL.md',
      snippet:
        '# golden_dataset.py\nfrom dataclasses import dataclass, field\n\n\n@dataclass\nclass GoldenSample:\n    question: str\n    ground_truth: str                      # the ideal reference answer\n    reference_contexts: list[str] = field(default_factory=list)\n\n\nGOLDEN_SET: list[GoldenSample] = [\n    GoldenSample(\n        question="What is the refund window for digital products?",\n        ground_truth="Digital products can be refunded within 14 days of purchase if unused.",\n        reference_contexts=[\n            "Refund policy: Digital goods are eligible for a refund within 14 days "\n            "of purchase, provided the license key has not been activated."',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/prompt-testing/SKILL.md',
      snippet:
        'guardrails.eval.ts\n      toxicity.eval.ts\n    ab-testing/\n      prompt-variants.eval.ts\n  fixtures/\n    ground-truth/\n      qa-pairs.json\n      summaries.json\n    prompts/\n      system-prompt-v1.txt\n      system-prompt-v2.txt\n  utils/\n    llm-client.ts\n    scoring.ts\n    dataset-loader.ts\n  config/\n    eval-config.ts\n    models.ts',
    },
  ],
});
