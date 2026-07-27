import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 688,
  slug: 'guardrail-fail-open-outage-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Guardrail Fail Open Outage Testing',
  description:
    'guardrail fail open outage testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'guardrail fail open outage testing',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams test guardrail fail open outage so guardrail timeout, error, and unavailable states follow an explicit fail-open or fail-closed policy?',
  intentBoundary: 'Guardrail dependency outage behavior only, not model-provider fallback.',
  secondaryKeywords: [
    'guardrail fail open outage test cases',
    'how to test guardrail fail open outage',
    'guardrail fail open outage regression checks',
    'guardrail fail open outage CI validation',
    'guardrail fail open outage failure diagnosis',
    'guardrail fail open outage QA checklist',
  ],
  repoEvidence: [
    'seed-skills/promptfoo-llm-red-teaming/SKILL.md',
    'seed-skills/ai-system-quality-engineer/SKILL.md',
    'packages/web/src/app/blog/posts/llm-guardrails-testing-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/llm-guardrails-testing-guide-2026',
    '/blog/domain-specific-ai-red-team-playbook-guide',
    '/blog/promptfoo-complete-guide-2026',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'llm-guardrails-testing-guide-2026',
    'domain-specific-ai-red-team-playbook-guide',
    'promptfoo-complete-guide-2026',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://www.promptfoo.dev/docs/red-team/configuration/',
    'https://www.promptfoo.dev/docs/red-team/troubleshooting/best-practices/',
    'https://www.nist.gov/itl/ai-risk-management-framework',
  ],
  codeExamples: [
    {
      title: 'Build the guardrail fail open outage testing baseline',
      language: 'bash',
      path: 'seed-skills/promptfoo-llm-red-teaming/SKILL.md',
      snippet:
        'npm install -g promptfoo\nexport OPENAI_API_KEY=...      # or anthropic, etc.\npromptfoo init                  # scaffolds promptfooconfig.yaml',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/ai-system-quality-engineer/SKILL.md',
      snippet: '',
    },
  ],
});
