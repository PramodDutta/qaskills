import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 707,
  slug: 'prompt-injection-html-comment-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Prompt Injection HTML Comment Testing',
  description:
    'prompt injection HTML comment testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'prompt injection HTML comment testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test prompt injection html comment so hidden comments and nonvisible nodes cannot alter the agent instruction hierarchy?',
  intentBoundary: 'HTML comment and hidden-node fixtures only, not broad web prompt injection.',
  secondaryKeywords: [
    'prompt injection HTML comment test cases',
    'how to test prompt injection html comment',
    'prompt injection HTML comment regression checks',
    'prompt injection HTML comment CI validation',
    'prompt injection HTML comment failure diagnosis',
    'prompt injection HTML comment QA checklist',
  ],
  repoEvidence: [
    'seed-skills/llm-security-testing/SKILL.md',
    'seed-skills/promptfoo-llm-red-teaming/SKILL.md',
    'packages/web/src/app/blog/posts/prompt-injection-testing-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/prompt-injection-testing-guide-2026',
    '/blog/llm-guardrails-testing-guide-2026',
    '/blog/domain-specific-ai-red-team-playbook-guide',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'prompt-injection-testing-guide-2026',
    'llm-guardrails-testing-guide-2026',
    'domain-specific-ai-red-team-playbook-guide',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://genai.owasp.org/llmrisk/llm01-prompt-injection/',
    'https://www.nist.gov/publications/adversarial-machine-learning-taxonomy-and-terminology-attacks-and-mitigations',
    'https://www.promptfoo.dev/docs/red-team/configuration/',
  ],
  codeExamples: [
    {
      title: 'Build the prompt injection HTML comment testing baseline',
      language: 'python',
      path: 'seed-skills/llm-security-testing/SKILL.md',
      snippet:
        '// Example llm pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'bash',
      path: 'seed-skills/promptfoo-llm-red-teaming/SKILL.md',
      snippet: '',
    },
  ],
});
