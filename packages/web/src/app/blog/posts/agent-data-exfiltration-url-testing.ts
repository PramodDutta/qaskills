import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 675,
  slug: 'agent-data-exfiltration-url-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Agent Data Exfiltration URL Testing',
  description:
    'agent data exfiltration URL testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'agent data exfiltration URL testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test agent data exfiltration url so generated links and tool destinations cannot carry secrets, private context, or tenant data?',
  intentBoundary:
    'Defensive outbound URL inspection using synthetic canaries only, not exfiltration techniques.',
  secondaryKeywords: [
    'agent data exfiltration URL test cases',
    'how to test agent data exfiltration url',
    'agent data exfiltration URL regression checks',
    'agent data exfiltration URL CI validation',
    'agent data exfiltration URL failure diagnosis',
    'agent data exfiltration URL QA checklist',
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
      title: 'Build the agent data exfiltration URL testing baseline',
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
