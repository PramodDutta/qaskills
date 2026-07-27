import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 730,
  slug: 'promptfoo-csv-metadata-parsing-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Promptfoo Csv Metadata Parsing Testing',
  description:
    'Promptfoo CSV metadata parsing testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Promptfoo CSV metadata parsing testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test promptfoo csv metadata parsing so special columns, typed values, metadata keys, and malformed rows map to the intended cases?',
  intentBoundary:
    'CSV special-column and metadata parsing only, not dataset schema validation in other tools.',
  secondaryKeywords: [
    'Promptfoo CSV metadata parsing test cases',
    'how to test promptfoo csv metadata parsing',
    'Promptfoo CSV metadata parsing regression checks',
    'Promptfoo CSV metadata parsing CI validation',
    'Promptfoo CSV metadata parsing failure diagnosis',
    'Promptfoo CSV metadata parsing QA checklist',
  ],
  repoEvidence: [
    'seed-skills/promptfoo-llm-red-teaming/SKILL.md',
    'seed-skills/prompt-testing/SKILL.md',
    'packages/web/src/app/blog/posts/promptfoo-complete-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/promptfoo-complete-guide-2026',
    '/blog/promptfoo-custom-javascript-assertion-example',
    '/blog/llm-evaluation-ci-cd-quality-gates',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'promptfoo-complete-guide-2026',
    'promptfoo-custom-javascript-assertion-example',
    'llm-evaluation-ci-cd-quality-gates',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://www.promptfoo.dev/docs/configuration/reference/',
    'https://www.promptfoo.dev/docs/configuration/test-cases/',
    'https://www.promptfoo.dev/docs/configuration/expected-outputs/',
  ],
  codeExamples: [
    {
      title: 'Build the Promptfoo CSV metadata parsing testing baseline',
      language: 'bash',
      path: 'seed-skills/promptfoo-llm-red-teaming/SKILL.md',
      snippet:
        'npm install -g promptfoo\nexport OPENAI_API_KEY=...      # or anthropic, etc.\npromptfoo init                  # scaffolds promptfooconfig.yaml',
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
