import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 627,
  slug: 'agent-tool-argument-injection-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Agent Tool Argument Injection Testing',
  description:
    'agent tool argument injection testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'agent tool argument injection testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test agent tool argument injection so untrusted text cannot escape its argument field or alter command, path, query, or destination structure?',
  intentBoundary:
    'Safe argument boundary validation only, not shell, SQL, or SSRF exploit instruction.',
  secondaryKeywords: [
    'agent tool argument injection test cases',
    'how to test agent tool argument injection',
    'agent tool argument injection regression checks',
    'agent tool argument injection CI validation',
    'agent tool argument injection failure diagnosis',
    'agent tool argument injection QA checklist',
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
      title: 'Build the agent tool argument injection testing baseline',
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
