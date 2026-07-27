import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 708,
  slug: 'promptfoo-chat-thread-isolation-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Promptfoo Chat Thread Isolation Testing',
  description:
    'Promptfoo chat thread isolation testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Promptfoo chat thread isolation testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test promptfoo chat thread isolation so conversation history stays within its case when threads run concurrently or reuse one provider?',
  intentBoundary:
    'Promptfoo chat-thread state isolation only, not general multi-agent memory leakage.',
  secondaryKeywords: [
    'Promptfoo chat thread isolation test cases',
    'how to test promptfoo chat thread isolation',
    'Promptfoo chat thread isolation regression checks',
    'Promptfoo chat thread isolation CI validation',
    'Promptfoo chat thread isolation failure diagnosis',
    'Promptfoo chat thread isolation QA checklist',
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
      title: 'Build the Promptfoo chat thread isolation testing baseline',
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
