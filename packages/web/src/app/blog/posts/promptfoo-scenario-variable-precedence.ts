import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 665,
  slug: 'promptfoo-scenario-variable-precedence',
  campaignCluster: 'ai-llm-rag',
  title: 'Promptfoo Scenario Variable Precedence',
  description:
    'Promptfoo scenario variable precedence: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Promptfoo scenario variable precedence',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test promptfoo scenario variable precedence so scenario, config, test, and environment variables resolve predictably without stale cross-case values?',
  intentBoundary: 'Scenario variable merge precedence only, not environment credential isolation.',
  secondaryKeywords: [
    'Promptfoo scenario variable precedence test cases',
    'how to test promptfoo scenario variable precedence',
    'Promptfoo scenario variable precedence regression checks',
    'Promptfoo scenario variable precedence CI validation',
    'Promptfoo scenario variable precedence failure diagnosis',
    'Promptfoo scenario variable precedence QA checklist',
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
      title: 'Build the Promptfoo scenario variable precedence baseline',
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
