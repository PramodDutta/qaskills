import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 682,
  slug: 'llm-schema-version-compatibility-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Schema Version Compatibility Testing',
  description:
    'LLM schema version compatibility testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'LLM schema version compatibility testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test llm schema version compatibility so old and new producers negotiate additive, breaking, and deprecated fields without silent coercion?',
  intentBoundary: 'Application output-schema evolution only, not provider response-envelope drift.',
  secondaryKeywords: [
    'LLM schema version compatibility test cases',
    'how to test llm schema version compatibility',
    'LLM schema version compatibility regression checks',
    'LLM schema version compatibility CI validation',
    'LLM schema version compatibility failure diagnosis',
    'LLM schema version compatibility QA checklist',
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
      title: 'Build the LLM schema version compatibility testing baseline',
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
