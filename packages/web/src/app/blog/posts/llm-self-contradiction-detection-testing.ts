import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 658,
  slug: 'llm-self-contradiction-detection-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Self Contradiction Detection Testing',
  description:
    'LLM self contradiction detection testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'LLM self contradiction detection testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm self contradiction detection so claims within one answer and across follow-up turns cannot assert incompatible facts unnoticed?',
  intentBoundary:
    'Self-contradiction within generated answers only, not contradictory retrieved documents.',
  secondaryKeywords: [
    'LLM self contradiction detection test cases',
    'how to test llm self contradiction detection',
    'LLM self contradiction detection regression checks',
    'LLM self contradiction detection CI validation',
    'LLM self contradiction detection failure diagnosis',
    'LLM self contradiction detection QA checklist',
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
      title: 'Build the LLM self contradiction detection testing baseline',
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
