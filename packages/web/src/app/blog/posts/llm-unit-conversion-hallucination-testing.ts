import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 703,
  slug: 'llm-unit-conversion-hallucination-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Unit Conversion Hallucination Testing',
  description:
    'LLM unit conversion hallucination testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'LLM unit conversion hallucination testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm unit conversion hallucination so converted values preserve dimensions, scale, rounding policy, and source units?',
  intentBoundary:
    'Unit-conversion factuality only, not free-form mathematical reasoning benchmarks.',
  secondaryKeywords: [
    'LLM unit conversion hallucination test cases',
    'how to test llm unit conversion hallucination',
    'LLM unit conversion hallucination regression checks',
    'LLM unit conversion hallucination CI validation',
    'LLM unit conversion hallucination failure diagnosis',
    'LLM unit conversion hallucination QA checklist',
  ],
  repoEvidence: [
    'seed-skills/prompt-testing/SKILL.md',
    'seed-skills/ai-system-quality-engineer/SKILL.md',
    'packages/web/src/app/blog/posts/hallucination-detection-pipeline-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/testing-llm-applications-guide',
    '/blog/hallucination-detection-pipeline-guide',
    '/blog/llm-judge-calibration-guide-2026',
    '/blog/ai-agent-eval-testing-guide',
  ],
  relatedSlugs: [
    'testing-llm-applications-guide',
    'hallucination-detection-pipeline-guide',
    'llm-judge-calibration-guide-2026',
    'ai-agent-eval-testing-guide',
  ],
  sources: [
    'https://deepeval.com/docs/metrics-hallucination',
    'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/',
    'https://platform.openai.com/docs/guides/evals',
  ],
  codeExamples: [
    {
      title: 'Build the LLM unit conversion hallucination testing baseline',
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
