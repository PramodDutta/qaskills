import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 722,
  slug: 'voice-agent-barge-in-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Voice Agent Barge In Testing',
  description:
    'voice agent barge in testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'voice agent barge in testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test voice agent barge in so user speech interrupts playback at the intended boundary and the agent resumes with correct context?',
  intentBoundary: 'User barge-in during synthesized speech only, not generic turn detection.',
  secondaryKeywords: [
    'voice agent barge in test cases',
    'how to test voice agent barge in',
    'voice agent barge in regression checks',
    'voice agent barge in CI validation',
    'voice agent barge in failure diagnosis',
    'voice agent barge in QA checklist',
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
      title: 'Build the voice agent barge in testing baseline',
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
