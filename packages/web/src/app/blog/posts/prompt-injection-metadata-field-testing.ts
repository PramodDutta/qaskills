import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 664,
  slug: 'prompt-injection-metadata-field-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Prompt Injection Metadata Field Testing',
  description:
    'prompt injection metadata field testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'prompt injection metadata field testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test prompt injection metadata field so document titles, authors, tags, and retrieval metadata cannot become privileged instructions?',
  intentBoundary: 'Metadata-field trust boundaries only, not retrieved body-content injection.',
  secondaryKeywords: [
    'prompt injection metadata field test cases',
    'how to test prompt injection metadata field',
    'prompt injection metadata field regression checks',
    'prompt injection metadata field CI validation',
    'prompt injection metadata field failure diagnosis',
    'prompt injection metadata field QA checklist',
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
      title: 'Build the prompt injection metadata field testing baseline',
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
