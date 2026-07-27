import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 687,
  slug: 'system-prompt-canary-leak-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'System Prompt Canary Leak Testing',
  description:
    'system prompt canary leak testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'system prompt canary leak testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test system prompt canary leak so synthetic canary values detect direct, encoded, partial, and tool-mediated prompt disclosure?',
  intentBoundary:
    'Leak detection with nonsecret canaries only, not methods for extracting real system prompts.',
  secondaryKeywords: [
    'system prompt canary leak test cases',
    'how to test system prompt canary leak',
    'system prompt canary leak regression checks',
    'system prompt canary leak CI validation',
    'system prompt canary leak failure diagnosis',
    'system prompt canary leak QA checklist',
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
      title: 'Build the system prompt canary leak testing baseline',
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
