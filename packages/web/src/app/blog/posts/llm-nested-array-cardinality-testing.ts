import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 697,
  slug: 'llm-nested-array-cardinality-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Nested Array Cardinality Testing',
  description:
    'LLM nested array cardinality testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM nested array cardinality testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm nested array cardinality so empty, oversized, duplicated, and deeply nested arrays follow explicit minimum and maximum rules?',
  intentBoundary:
    'Nested collection size contracts only, not broad token limits or output truncation.',
  secondaryKeywords: [
    'LLM nested array cardinality test cases',
    'how to test llm nested array cardinality',
    'LLM nested array cardinality regression checks',
    'LLM nested array cardinality CI validation',
    'LLM nested array cardinality failure diagnosis',
    'LLM nested array cardinality QA checklist',
  ],
  repoEvidence: [
    'seed-skills/llm-output-testing/SKILL.md',
    'seed-skills/prompt-testing/SKILL.md',
    'packages/web/src/app/blog/posts/testing-llm-structured-output-json-schema-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/testing-llm-applications-guide',
    '/blog/testing-llm-structured-output-json-schema-guide',
    '/blog/promptfoo-custom-javascript-assertion-example',
    '/blog/ai-agent-eval-testing-guide',
  ],
  relatedSlugs: [
    'testing-llm-applications-guide',
    'testing-llm-structured-output-json-schema-guide',
    'promptfoo-custom-javascript-assertion-example',
    'ai-agent-eval-testing-guide',
  ],
  sources: [
    'https://json-schema.org/draft/2020-12/json-schema-core',
    'https://platform.openai.com/docs/guides/function-calling',
    'https://www.promptfoo.dev/docs/configuration/expected-outputs/',
  ],
  codeExamples: [
    {
      title: 'Build the LLM nested array cardinality testing baseline',
      language: 'python',
      path: 'seed-skills/llm-output-testing/SKILL.md',
      snippet:
        '// Example llm pattern\n// Adapt this pattern to your specific use case and framework',
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
