import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 673,
  slug: 'voice-agent-interruption-recovery-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Voice Agent Interruption Recovery Testing',
  description:
    'voice agent interruption recovery testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'voice agent interruption recovery testing',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams test voice agent interruption recovery so network loss or cancelled playback closes the current turn and resumes without duplicate speech or actions?',
  intentBoundary: 'Transport and playback interruption recovery only, not user barge-in semantics.',
  secondaryKeywords: [
    'voice agent interruption recovery test cases',
    'how to test voice agent interruption recovery',
    'voice agent interruption recovery regression checks',
    'voice agent interruption recovery CI validation',
    'voice agent interruption recovery failure diagnosis',
    'voice agent interruption recovery QA checklist',
  ],
  repoEvidence: [
    'seed-skills/voice-assistant-testing/SKILL.md',
    'seed-skills/prompt-testing/SKILL.md',
    'packages/web/src/app/blog/posts/testing-llm-time-to-first-token-sla.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/testing-llm-applications-guide',
    '/blog/testing-llm-time-to-first-token-sla',
    '/blog/testing-llm-streaming-chunk-order',
    '/blog/ai-agent-eval-testing-guide',
  ],
  relatedSlugs: [
    'testing-llm-applications-guide',
    'testing-llm-time-to-first-token-sla',
    'testing-llm-streaming-chunk-order',
    'ai-agent-eval-testing-guide',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/audio',
    'https://platform.openai.com/docs/guides/realtime',
    'https://www.w3.org/TR/webrtc/',
  ],
  codeExamples: [
    {
      title: 'Build the voice agent interruption recovery testing baseline',
      language: 'python',
      path: 'seed-skills/voice-assistant-testing/SKILL.md',
      snippet:
        '// Example voice pattern\n// Adapt this pattern to your specific use case and framework',
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
