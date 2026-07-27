import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 701,
  slug: 'llm-streaming-json-assembly-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'LLM Streaming Json Assembly Testing',
  description:
    'LLM streaming JSON assembly testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'LLM streaming JSON assembly testing',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams test llm streaming json assembly so arbitrary chunk boundaries assemble once into the same valid object as a non-streamed response?',
  intentBoundary:
    'Incremental JSON assembly only, not general streaming chunk order or span lifecycle.',
  secondaryKeywords: [
    'LLM streaming JSON assembly test cases',
    'how to test llm streaming json assembly',
    'LLM streaming JSON assembly regression checks',
    'LLM streaming JSON assembly CI validation',
    'LLM streaming JSON assembly failure diagnosis',
    'LLM streaming JSON assembly QA checklist',
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
      title: 'Build the LLM streaming JSON assembly testing baseline',
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
