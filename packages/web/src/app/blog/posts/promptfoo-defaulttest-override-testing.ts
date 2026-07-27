import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 709,
  slug: 'promptfoo-defaulttest-override-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Promptfoo Defaulttest Override Testing',
  description:
    'Promptfoo defaultTest override testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Promptfoo defaultTest override testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test promptfoo defaulttest override so global assertions merge with case assertions using the intended precedence and no mandatory check disappears?',
  intentBoundary:
    'defaultTest merge and override behavior only, not general assertion aggregation.',
  secondaryKeywords: [
    'Promptfoo defaultTest override test cases',
    'how to test promptfoo defaulttest override',
    'Promptfoo defaultTest override regression checks',
    'Promptfoo defaultTest override CI validation',
    'Promptfoo defaultTest override failure diagnosis',
    'Promptfoo defaultTest override QA checklist',
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
      title: 'Build the Promptfoo defaultTest override testing baseline',
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
