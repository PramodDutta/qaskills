import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 694,
  slug: 'llm-date-time-format-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Date Time Format Testing',
  description:
    'LLM date time format testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'LLM date time format testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm date time format so time zones, offsets, leap-day cases, and invalid calendar values obey the declared format?',
  intentBoundary:
    'Machine-readable date-time fields only, not factual recency or knowledge-cutoff testing.',
  secondaryKeywords: [
    'LLM date time format test cases',
    'how to test llm date time format',
    'LLM date time format regression checks',
    'LLM date time format CI validation',
    'LLM date time format failure diagnosis',
    'LLM date time format QA checklist',
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
      title: 'Build the LLM date time format testing baseline',
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
